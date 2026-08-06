'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  AlertReminderRule,
  AlertRoundOutcome,
  AlertTrack,
  Competition,
  CompetitionRound,
  CustomDeadline,
  TrackedCompetition,
} from '@/types';
import type { EventType } from '@/hooks/useAnalytics';

type Track = (type: EventType, payload?: Record<string, unknown>) => void;

/**
 * Everything the Alerts tab reads and writes.
 *
 * `readOnly` is the demo account (lib/demo.ts), mirroring useSelections: local
 * state still moves so the tab feels live, but nothing is written and no
 * analytics event fires. Migration 018 refuses these writes at the database
 * anyway — skipping them here just avoids a toggle that visibly snaps back.
 *
 * Visibility is enforced by RLS, not here: the select below returns global
 * competitions plus the student's own private ones because that is what the
 * policy allows, so there is no client-side filter to get wrong.
 */
export function useAlerts(userId: string | null, readOnly = false, trackEvent?: Track) {
  const supabase = createClient();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [rounds, setRounds] = useState<CompetitionRound[]>([]);
  const [tracks, setTracks] = useState<AlertTrack[]>([]);
  const [rules, setRules] = useState<AlertReminderRule[]>([]);
  const [outcomes, setOutcomes] = useState<AlertRoundOutcome[]>([]);
  const [deadlines, setDeadlines] = useState<CustomDeadline[]>([]);
  const [loading, setLoading] = useState(true);

  const trackRef = useRef<Track | undefined>(trackEvent);
  useEffect(() => { trackRef.current = trackEvent; }, [trackEvent]);

  const refetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    const [comps, rnds, trks, rls, outs, dls] = await Promise.all([
      supabase.from('competitions').select('*').order('registration_deadline', { nullsFirst: false }),
      supabase.from('competition_rounds').select('*').order('round_order'),
      supabase.from('alert_tracks').select('*').eq('user_id', userId),
      supabase.from('alert_reminder_rules').select('*'),
      supabase.from('alert_round_outcomes').select('*').eq('user_id', userId),
      supabase.from('custom_deadlines').select('*').eq('user_id', userId).order('due_at'),
    ]);

    setCompetitions((comps.data as Competition[]) ?? []);
    setRounds((rnds.data as CompetitionRound[]) ?? []);
    setTracks((trks.data as AlertTrack[]) ?? []);
    setRules((rls.data as AlertReminderRule[]) ?? []);
    setOutcomes((outs.data as AlertRoundOutcome[]) ?? []);
    setDeadlines((dls.data as CustomDeadline[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { refetch(); }, [refetch]);

  // ── Assembled view model ───────────────────────────────────────────────────
  const byCompetition: TrackedCompetition[] = competitions.map((competition) => {
    const compRounds = rounds.filter((r) => r.competition_id === competition.id);
    const track = tracks.find((t) => t.competition_id === competition.id) ?? null;
    const roundIds = new Set(compRounds.map((r) => r.id));
    return {
      competition,
      rounds: compRounds,
      track,
      outcomes: outcomes.filter((o) => roundIds.has(o.round_id)),
      rules: track ? rules.filter((r) => r.track_id === track.id) : [],
    };
  });

  const tracked = byCompetition.filter((c) => c.track && c.track.status !== 'archived');
  const untracked = byCompetition.filter((c) => !c.track);

  // ── Writes ─────────────────────────────────────────────────────────────────

  const trackCompetition = useCallback(async (competitionId: string) => {
    if (!userId) return;
    const optimistic: AlertTrack = {
      id: `local-${competitionId}`, user_id: userId, competition_id: competitionId,
      status: 'active', notifications_enabled: true, eliminated_round_id: null,
      eliminated_at: null, tracked_at: new Date().toISOString(),
    };
    setTracks((prev) => [...prev, optimistic]);
    if (readOnly) return;

    const { data, error } = await supabase
      .from('alert_tracks')
      .insert({ user_id: userId, competition_id: competitionId })
      .select()
      .single();
    if (error || !data) {
      setTracks((prev) => prev.filter((t) => t.id !== optimistic.id));
      return;
    }
    setTracks((prev) => prev.map((t) => (t.id === optimistic.id ? (data as AlertTrack) : t)));
    trackRef.current?.('alert_competition_tracked', { competition_id: competitionId });
  }, [userId, readOnly]);

  const untrackCompetition = useCallback(async (trackId: string) => {
    const previous = tracks;
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    if (readOnly) return;
    const { error } = await supabase.from('alert_tracks').delete().eq('id', trackId);
    if (error) setTracks(previous);
    else trackRef.current?.('alert_competition_untracked', { track_id: trackId });
  }, [tracks, readOnly]);

  const setNotifications = useCallback(async (trackId: string, enabled: boolean) => {
    const previous = tracks;
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, notifications_enabled: enabled } : t)));
    if (readOnly) return;
    const { error } = await supabase
      .from('alert_tracks').update({ notifications_enabled: enabled }).eq('id', trackId);
    if (error) setTracks(previous);
    else trackRef.current?.('alert_notifications_toggled', { track_id: trackId, enabled });
  }, [tracks, readOnly]);

  /**
   * The pass/fail gate.
   *
   * Default is PASSED, so answering "yes" records the outcome and changes
   * nothing else — the chain was already advancing. Answering "no" also demotes
   * the track to `eliminated`, which is what actually stops the dispatcher.
   * Both are undoable.
   */
  const recordOutcome = useCallback(async (
    roundId: string, cleared: boolean, trackId: string,
  ) => {
    if (!userId) return;
    const optimistic: AlertRoundOutcome = {
      id: `local-${roundId}`, user_id: userId, round_id: roundId,
      cleared, decided_at: new Date().toISOString(),
    };
    setOutcomes((prev) => [...prev.filter((o) => o.round_id !== roundId), optimistic]);
    if (!cleared) {
      setTracks((prev) => prev.map((t) => (
        t.id === trackId
          ? { ...t, status: 'eliminated', eliminated_round_id: roundId, eliminated_at: optimistic.decided_at }
          : t
      )));
    }
    if (readOnly) return;

    const { data } = await supabase
      .from('alert_round_outcomes')
      .upsert({ user_id: userId, round_id: roundId, cleared }, { onConflict: 'user_id,round_id' })
      .select().single();
    if (data) {
      setOutcomes((prev) => prev.map((o) => (o.round_id === roundId ? (data as AlertRoundOutcome) : o)));
    }
    if (!cleared) {
      await supabase.from('alert_tracks').update({
        status: 'eliminated', eliminated_round_id: roundId, eliminated_at: new Date().toISOString(),
      }).eq('id', trackId);
    }
    trackRef.current?.(cleared ? 'alert_elimination_passed' : 'alert_elimination_failed', {
      round_id: roundId,
    });
  }, [userId, readOnly]);

  const undoOutcome = useCallback(async (roundId: string, trackId: string) => {
    setOutcomes((prev) => prev.filter((o) => o.round_id !== roundId));
    setTracks((prev) => prev.map((t) => (
      t.id === trackId
        ? { ...t, status: 'active', eliminated_round_id: null, eliminated_at: null }
        : t
    )));
    if (readOnly) return;
    await supabase.from('alert_round_outcomes').delete().eq('round_id', roundId).eq('user_id', userId!);
    await supabase.from('alert_tracks').update({
      status: 'active', eliminated_round_id: null, eliminated_at: null,
    }).eq('id', trackId);
    trackRef.current?.('alert_elimination_undone', { round_id: roundId });
  }, [userId, readOnly]);

  // ── Reminder overrides ─────────────────────────────────────────────────────
  // Rules are sparse: a row exists only where the student deviated from the
  // defaults in lib/alerts/schedule.ts. Re-enabling a default therefore DELETES
  // the row rather than writing enabled = true — otherwise the table slowly
  // fills with rows that say "do the default thing".

  const setOffsetEnabled = useCallback(async (
    trackId: string, anchor: AlertReminderRule['anchor'], roundId: string | null,
    offsetMinutes: number, enabled: boolean, isDefault: boolean,
  ) => {
    const existing = rules.find((r) => (
      r.track_id === trackId && r.anchor === anchor &&
      (r.round_id ?? null) === roundId && r.offset_minutes === offsetMinutes
    ));

    // Back to the default: drop the override entirely.
    if (enabled === isDefault) {
      if (!existing) return;
      setRules((prev) => prev.filter((r) => r.id !== existing.id));
      if (readOnly) return;
      await supabase.from('alert_reminder_rules').delete().eq('id', existing.id);
      trackRef.current?.('alert_reminder_offset_toggled', { anchor, offsetMinutes, enabled });
      return;
    }

    if (existing) {
      setRules((prev) => prev.map((r) => (r.id === existing.id ? { ...r, enabled } : r)));
      if (readOnly) return;
      await supabase.from('alert_reminder_rules').update({ enabled }).eq('id', existing.id);
      trackRef.current?.('alert_reminder_offset_toggled', { anchor, offsetMinutes, enabled });
      return;
    }

    const row = {
      track_id: trackId, anchor, round_id: roundId,
      mode: 'offset' as const, offset_minutes: offsetMinutes, absolute_at: null, enabled,
    };
    const optimistic = { ...row, id: `local-${anchor}-${offsetMinutes}`, created_at: new Date().toISOString() } as AlertReminderRule;
    setRules((prev) => [...prev, optimistic]);
    if (readOnly) return;
    const { data } = await supabase.from('alert_reminder_rules').insert(row).select().single();
    if (data) setRules((prev) => prev.map((r) => (r.id === optimistic.id ? (data as AlertReminderRule) : r)));
    trackRef.current?.('alert_reminder_offset_toggled', { anchor, offsetMinutes, enabled });
  }, [rules, readOnly]);

  const addAbsoluteReminder = useCallback(async (
    trackId: string, anchor: AlertReminderRule['anchor'], roundId: string | null, absoluteAt: string,
  ) => {
    const row = {
      track_id: trackId, anchor, round_id: roundId,
      mode: 'absolute' as const, offset_minutes: null, absolute_at: absoluteAt, enabled: true,
    };
    const optimistic = { ...row, id: `local-abs-${absoluteAt}`, created_at: new Date().toISOString() } as AlertReminderRule;
    setRules((prev) => [...prev, optimistic]);
    if (readOnly) return;
    const { data } = await supabase.from('alert_reminder_rules').insert(row).select().single();
    if (data) setRules((prev) => prev.map((r) => (r.id === optimistic.id ? (data as AlertReminderRule) : r)));
    trackRef.current?.('alert_reminder_absolute_set', { anchor, absolute_at: absoluteAt });
  }, [readOnly]);

  const removeRule = useCallback(async (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    if (readOnly) return;
    await supabase.from('alert_reminder_rules').delete().eq('id', ruleId);
    trackRef.current?.('alert_reminder_absolute_cleared', { rule_id: ruleId });
  }, [readOnly]);

  // ── Custom deadlines ───────────────────────────────────────────────────────

  const addDeadline = useCallback(async (input: {
    title: string; dueAt: string; notes?: string; url?: string;
  }) => {
    if (!userId) return;
    const optimistic: CustomDeadline = {
      id: `local-${Date.now()}`, user_id: userId, title: input.title,
      notes: input.notes ?? null, url: input.url ?? null, due_at: input.dueAt,
      completed_at: null, created_at: new Date().toISOString(),
    };
    setDeadlines((prev) => [...prev, optimistic].sort((a, b) => a.due_at.localeCompare(b.due_at)));
    if (readOnly) return;
    const { data } = await supabase.from('custom_deadlines').insert({
      user_id: userId, title: input.title, due_at: input.dueAt,
      notes: input.notes ?? null, url: input.url ?? null,
    }).select().single();
    if (data) setDeadlines((prev) => prev.map((d) => (d.id === optimistic.id ? (data as CustomDeadline) : d)));
    trackRef.current?.('alert_custom_deadline_added', {});
  }, [userId, readOnly]);

  const completeDeadline = useCallback(async (id: string) => {
    const at = new Date().toISOString();
    setDeadlines((prev) => prev.map((d) => (d.id === id ? { ...d, completed_at: at } : d)));
    if (readOnly) return;
    await supabase.from('custom_deadlines').update({ completed_at: at }).eq('id', id);
    trackRef.current?.('alert_custom_deadline_completed', { deadline_id: id });
  }, [readOnly]);

  const deleteDeadline = useCallback(async (id: string) => {
    const previous = deadlines;
    setDeadlines((prev) => prev.filter((d) => d.id !== id));
    if (readOnly) return;
    const { error } = await supabase.from('custom_deadlines').delete().eq('id', id);
    if (error) setDeadlines(previous);
    else trackRef.current?.('alert_custom_deadline_deleted', { deadline_id: id });
  }, [deadlines, readOnly]);

  /**
   * Imports an Unstop URL. The route does the fetching and mapping server-side —
   * Unstop does not send CORS headers, so the browser cannot call it directly,
   * and doing it server-side also means one mapper instead of two.
   */
  const importUnstop = useCallback(async (
    url: string, publishToCohort = false,
  ): Promise<{ ok: boolean; error?: string; competitionId?: string }> => {
    trackRef.current?.('alert_competition_url_submitted', { publish: publishToCohort });
    if (readOnly) return { ok: false, error: 'This is a read-only demo, so competitions cannot be added.' };

    try {
      const res = await fetch('/api/alerts/unstop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, publishToCohort }),
      });
      const json = await res.json();
      if (!res.ok) {
        trackRef.current?.('alert_competition_import_failed', { status: res.status, error: json?.error });
        return { ok: false, error: json?.error ?? 'Could not import that competition.' };
      }
      await refetch();
      trackRef.current?.(
        publishToCohort ? 'alert_competition_published' : 'alert_competition_imported',
        { competition_id: json.competitionId, rounds: json.rounds },
      );
      return { ok: true, competitionId: json.competitionId };
    } catch {
      trackRef.current?.('alert_competition_import_failed', { error: 'network' });
      return { ok: false, error: 'Network error. Check your connection and try again.' };
    }
  }, [readOnly, refetch]);

  return {
    loading,
    tracked,
    untracked,
    deadlines,
    trackedCount: tracked.length,
    refetch,
    trackCompetition,
    untrackCompetition,
    setNotifications,
    recordOutcome,
    undoOutcome,
    setOffsetEnabled,
    addAbsoluteReminder,
    removeRule,
    addDeadline,
    completeDeadline,
    deleteDeadline,
    importUnstop,
  };
}
