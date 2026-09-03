'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deviceInfo } from '@/lib/analytics/device';
import { isDemoEmail } from '@/lib/demo';
import { ABORT_MISSING_RATIO, TOUR_VERSION, stepsForVersion } from '@/lib/tour/steps';
import type { TourContext, TourStep, TourTrigger } from '@/lib/tour/types';
import type { EventType } from '@/hooks/useAnalytics';
import type { Profile } from '@/types';

/** Mobile breakpoint. Matches Tailwind's `lg`, which is where app/planner/page.tsx
 *  swaps the desktop sidebar for the bottom drawer — the two are separate DOM
 *  trees, so the tour's step list has to agree with that exact number. */
const MOBILE_MAX = 1023;

/** The demo account cannot write (migration 015), so its gate lives here instead.
 *  Without it a reviewer gets an unskippable tour on every single visit. */
const DEMO_KEY = 'mbap.tour.demoSeenVersion';

const HEARTBEAT_MS = 15_000;

/**
 * Fire-and-forget a Supabase write.
 *
 * PostgREST query builders are LAZY thenables: they issue no request until
 * something calls `.then()`. `void supabase.from(x).insert(y)` therefore
 * type-checks, lints clean, and silently sends nothing — which is exactly how
 * every tour_step_events row went missing while tour_runs (which awaits) wrote
 * fine. Awaiting is not an option in the navigation path, so the `.then()` is
 * the point of this helper, and the error branch is why it is not just `.then()`
 * bare like the older call sites in useAnalytics.
 */
function fireAndForget(
  query: PromiseLike<{ error: unknown }>,
  what: string,
): void {
  query.then(({ error }) => {
    if (error) console.warn(`[tour] ${what} failed`, error);
  });
}

interface Args {
  profile: Profile | null;
  userId: string | null;
  ctx: TourContext;
  trackEvent: (type: EventType, payload?: Record<string, unknown>) => void;
}

export interface TourState {
  active: boolean;
  step: TourStep | null;
  index: number;      // 1-based, for display
  total: number;
  canGoBack: boolean;
  next: () => void;
  back: () => void;
  /** Replay from the sidebar button. */
  restart: () => void;
  onAnchorSettled: (found: boolean, retryMs: number) => void;
}

function readDemoSeen(): number {
  try { return Number(localStorage.getItem(DEMO_KEY) ?? 0) || 0; } catch { return 0; }
}
function writeDemoSeen(v: number): void {
  try { localStorage.setItem(DEMO_KEY, String(v)); } catch { /* private mode — tour repeats, acceptable */ }
}

export function useTour({ profile, userId, ctx, trackEvent }: Args): TourState {
  const supabase = createClient();
  const isDemo = isDemoEmail(profile?.email);

  /**
   * Milestone events, suppressed for the demo account.
   *
   * `user_events` carries no demo-restrictive policy (migration 015 covers only
   * course_selections and profiles), so a reviewer's writes there DO land. A
   * reviewer is not a student: their milestones would show up in the admin
   * Activity feed and, worse, put the demo user in the adoption-lift cohorts.
   * The tour_runs / tour_step_events writes are already skipped below and denied
   * at the database by migration 022.
   */
  const track = useCallback(
    (type: EventType, payload?: Record<string, unknown>) => {
      if (isDemo) return;
      trackEvent(type, payload);
    },
    [isDemo, trackEvent],
  );

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);           // 0-based internally
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [trigger, setTrigger] = useState<TourTrigger>('first_login');

  const runIdRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const stepEnteredAtRef = useRef(0);
  const stepActiveMsRef = useRef(0);        // dwell accumulated while visible
  const visibleSinceRef = useRef(0);
  const runActiveMsRef = useRef(0);
  const backCountRef = useRef(0);
  const furthestRef = useRef(0);
  const missingRef = useRef<string[]>([]);
  const settledForRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  const step = steps[index] ?? null;
  const total = steps.length;

  // ── Eligibility ───────────────────────────────────────────
  // Deliberately NOT tied to the login event. The gate is
  // profiles.tour_seen_version, so the tour runs on any arrival at /planner —
  // a student who was already signed in and lands straight on the portal from a
  // bookmark, a push notification, or a restored session gets it exactly like
  // someone who just typed an OTP. `startedRef` only stops it running twice
  // within one mount.
  const maybeStart = useCallback(() => {
    if (!profile || !userId || startedRef.current) return;
    if (typeof window === 'undefined') return;

    // Support escape hatch. Bypasses the tour for this load WITHOUT marking the
    // version seen, so it is a way past a broken tour, not a way to skip it.
    if (new URLSearchParams(window.location.search).get('tour') === 'off') return;

    const seen = isDemo ? readDemoSeen() : (profile.tour_seen_version ?? 0);
    if (seen >= TOUR_VERSION) return;

    const isMobile = window.innerWidth <= MOBILE_MAX;
    const list = stepsForVersion(seen, isMobile);
    if (list.length === 0) { void markSeen(); return; }

    startedRef.current = true;
    const t: TourTrigger = seen === 0 ? 'first_login' : 'version_upgrade';
    setTrigger(t);
    setSteps(list);
    setIndex(0);
    setActive(true);
    void beginRun(list, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, userId, isDemo]);

  useEffect(() => { maybeStart(); }, [maybeStart]);

  // A tab that has been sitting open since before the tour shipped never
  // remounts this component, so the mount-time check above would miss it
  // entirely. Re-check when the student comes back to the tab.
  useEffect(() => {
    if (active || startedRef.current) return;
    function onVis() {
      if (document.visibilityState === 'visible') maybeStart();
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [active, maybeStart]);

  // ── Visibility accounting ─────────────────────────────────
  // active_ms is dwell while the tab is actually visible. Wall-clock alone would
  // fold in the student answering a phone call mid-tour, which makes a p90 of
  // "time to complete" meaningless.
  useEffect(() => {
    if (!active) return;
    visibleSinceRef.current = document.visibilityState === 'visible' ? Date.now() : 0;

    function onVis() {
      if (document.visibilityState === 'visible') {
        visibleSinceRef.current = Date.now();
      } else if (visibleSinceRef.current) {
        const d = Date.now() - visibleSinceRef.current;
        stepActiveMsRef.current += d;
        runActiveMsRef.current += d;
        visibleSinceRef.current = 0;
      }
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [active]);

  function flushVisible(): void {
    if (!visibleSinceRef.current) return;
    const d = Date.now() - visibleSinceRef.current;
    stepActiveMsRef.current += d;
    runActiveMsRef.current += d;
    visibleSinceRef.current = Date.now();
  }

  // ── Heartbeat ─────────────────────────────────────────────
  // Abandonment is detected by a stale heartbeat, not by an unload event: mobile
  // Safari routinely never fires pagehide, so a run that ends by the student
  // closing the tab would otherwise sit at 'in_progress' forever.
  useEffect(() => {
    if (!active || isDemo) return;
    const id = setInterval(() => {
      const runId = runIdRef.current;
      if (!runId) return;
      fireAndForget(
        supabase
          .from('tour_runs')
          .update({ last_heartbeat_at: new Date().toISOString() })
          .eq('id', runId),
        'heartbeat',
      );
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [active, isDemo]);

  // ── Persistence ───────────────────────────────────────────
  const markSeen = useCallback(async () => {
    if (isDemo) { writeDemoSeen(TOUR_VERSION); return; }
    if (!userId) return;
    await supabase.from('profiles').update({ tour_seen_version: TOUR_VERSION }).eq('id', userId);
  }, [isDemo, userId, supabase]);

  const beginRun = useCallback(async (list: TourStep[], t: TourTrigger) => {
    startedAtRef.current = Date.now();
    stepEnteredAtRef.current = Date.now();
    stepActiveMsRef.current = 0;
    runActiveMsRef.current = 0;
    backCountRef.current = 0;
    furthestRef.current = 0;
    missingRef.current = [];

    track(t === 'manual_replay' ? 'tour_replayed' : 'tour_started', {
      tour_version: TOUR_VERSION,
      trigger: t,
      steps_total: list.length,
    });

    // A reviewer clicking through the tour is not a student; their run must not
    // land in the cohort's funnel numbers. Migration 022 denies it at the
    // database too — this just avoids the pointless round trip.
    if (isDemo || !userId) return;

    const d = deviceInfo();
    const { data } = await supabase
      .from('tour_runs')
      .insert({
        user_id: userId,
        tour_version: TOUR_VERSION,
        trigger: t,
        steps_total: list.length,
        device_type: d.device_type,
        browser: d.browser,
        os: d.os,
        viewport_w: d.viewport_width,
        viewport_h: d.viewport_height,
      })
      .select('id')
      .single();
    if (data?.id) runIdRef.current = data.id as string;
  }, [isDemo, userId, supabase, track]);

  const recordStep = useCallback((s: TourStep, i: number, direction: 'next' | 'back') => {
    flushVisible();
    const dwell = Date.now() - stepEnteredAtRef.current;
    const activeDwell = stepActiveMsRef.current;
    const found = !missingRef.current.includes(s.id);

    if (!isDemo && userId && runIdRef.current) {
      fireAndForget(
        supabase.from('tour_step_events').insert({
          run_id: runIdRef.current,
          user_id: userId,
          step_id: s.id,
          step_index: i,
          dwell_ms: dwell,
          active_dwell_ms: activeDwell,
          exit_direction: direction,
          anchor_found: found,
        }),
        `step_event ${s.id}`,
      );
    }
    stepEnteredAtRef.current = Date.now();
    stepActiveMsRef.current = 0;
  }, [isDemo, userId, supabase]);

  const finishRun = useCallback(async (status: 'completed' | 'aborted_error') => {
    flushVisible();
    const totalMs = Date.now() - startedAtRef.current;
    track(status === 'completed' ? 'tour_completed' : 'tour_aborted_error', {
      tour_version: TOUR_VERSION,
      trigger,
      total_ms: totalMs,
      active_ms: runActiveMsRef.current,
      back_count: backCountRef.current,
      missing_anchor_steps: missingRef.current,
    });

    if (!isDemo && userId && runIdRef.current) {
      await supabase.from('tour_runs').update({
        status,
        completed_at: new Date().toISOString(),
        total_ms: totalMs,
        active_ms: runActiveMsRef.current,
        steps_seen: furthestRef.current + 1,
        furthest_step_index: furthestRef.current,
        last_step_id: steps[furthestRef.current]?.id ?? null,
        back_count: backCountRef.current,
        missing_anchor_steps: missingRef.current,
        last_heartbeat_at: new Date().toISOString(),
      }).eq('id', runIdRef.current);
    }
    await markSeen();
    runIdRef.current = null;
  }, [isDemo, userId, supabase, track, trigger, steps, markSeen]);

  // ── Navigation ────────────────────────────────────────────
  const goTo = useCallback((nextIndex: number, direction: 'next' | 'back') => {
    const current = steps[index];
    if (current) {
      recordStep(current, index, direction);
      current.after?.(ctx);
    }
    const target = steps[nextIndex];
    target?.before?.(ctx);
    settledForRef.current = null;
    furthestRef.current = Math.max(furthestRef.current, nextIndex);
    setIndex(nextIndex);
  }, [steps, index, ctx, recordStep]);

  const next = useCallback(() => {
    if (index >= steps.length - 1) {
      const current = steps[index];
      if (current) { recordStep(current, index, 'next'); current.after?.(ctx); }
      setActive(false);
      void finishRun('completed');
      return;
    }
    goTo(index + 1, 'next');
  }, [index, steps, ctx, goTo, recordStep, finishRun]);

  const back = useCallback(() => {
    if (index === 0) return;
    backCountRef.current += 1;
    goTo(index - 1, 'back');
  }, [index, goTo]);

  // ── Fail-open ─────────────────────────────────────────────
  // The tour has no Skip button, so a missing anchor must never be able to trap
  // a student. One miss auto-advances; more than half the run missing means the
  // tour itself is broken (a refactor renamed a data-tour attribute), and
  // repeating a broken tour on every visit is worse than not running it.
  const onAnchorSettled = useCallback((found: boolean, retryMs: number) => {
    const s = steps[index];
    if (!s || settledForRef.current === s.id) return;
    settledForRef.current = s.id;
    if (found) return;

    if (!missingRef.current.includes(s.id)) missingRef.current.push(s.id);
    track('tour_anchor_missing', {
      step_id: s.id,
      step_index: index,
      retry_ms: retryMs,
      tour_version: TOUR_VERSION,
    });

    if (missingRef.current.length > steps.length * ABORT_MISSING_RATIO) {
      setActive(false);
      void finishRun('aborted_error');
      return;
    }
    next();
  }, [steps, index, track, next, finishRun]);

  // ── Replay ────────────────────────────────────────────────
  const restart = useCallback(() => {
    const isMobile = window.innerWidth <= MOBILE_MAX;
    const list = stepsForVersion(0, isMobile);
    setTrigger('manual_replay');
    setSteps(list);
    setIndex(0);
    setActive(true);
    void beginRun(list, 'manual_replay');
  }, [beginRun]);

  return useMemo(() => ({
    active: active && step !== null,
    step,
    index: index + 1,
    total,
    canGoBack: index > 0,
    next,
    back,
    restart,
    onAnchorSettled,
  }), [active, step, index, total, next, back, restart, onAnchorSettled]);
}
