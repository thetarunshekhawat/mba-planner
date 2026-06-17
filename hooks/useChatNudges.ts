'use client';

import { useCallback, useRef } from 'react';
import type { Course, SpecId } from '@/types';
import { getCurrentTerm } from '@/lib/terms';
import { fallbackNudges, type Nudge } from '@/lib/chat/nudgeFallback';

export interface ActiveNudge extends Nudge {
  /** Stable id (derived from text) used to de-dupe within a session. */
  id: string;
}

const POOL_KEY = 'mbap.nudges.pool';
const SIG_KEY = 'mbap.nudges.sig';
const SEEN_KEY = 'mbap.nudges.seen';

/** Stable short id from a nudge's text, so the same nudge isn't shown twice. */
function nudgeId(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function withIds(nudges: Nudge[]): ActiveNudge[] {
  return nudges.map((n) => ({ ...n, id: nudgeId(n.text) }));
}

function readSeen(): Set<string> {
  if (typeof sessionStorage === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>): void {
  try {
    sessionStorage?.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* storage full / unavailable — de-dupe degrades to in-memory only */
  }
}

/**
 * Owns the proactive-nudge pool for the chat launcher.
 *
 * `loadPool` fetches the personalized pool once per session (cached in sessionStorage,
 * keyed by a signature of the selected courses), falling back to deterministic templates
 * if the endpoint is empty. `nextNudge` hands back the next not-yet-seen nudge and marks
 * it seen so reloads within the session don't repeat it.
 */
export function useChatNudges(userId: string | null, courses: Course[], specs: SpecId[]) {
  const poolRef = useRef<ActiveNudge[] | null>(null);
  const loadingRef = useRef(false);
  const seenRef = useRef<Set<string>>(readSeen());

  // `courses`/`specs` are fresh arrays each parent render — keep the latest in refs so
  // the callbacks below depend only on stable signature strings (no identity churn,
  // so the consumer's scheduler effect doesn't restart on every render).
  const coursesRef = useRef(courses);
  const specsRef = useRef(specs);
  coursesRef.current = courses;
  specsRef.current = specs;

  const sig = courses.map((c) => c.id).sort((a, b) => a - b).join(',');

  const localPool = useCallback(
    (): ActiveNudge[] => withIds(fallbackNudges(coursesRef.current, specsRef.current, getCurrentTerm())),
    [],
  );

  const loadPool = useCallback(async () => {
    if (!userId || poolRef.current || loadingRef.current) return;
    loadingRef.current = true;

    // Reuse a pool already fetched this session for the same selection.
    try {
      if (sessionStorage?.getItem(SIG_KEY) === sig) {
        const cached = JSON.parse(sessionStorage.getItem(POOL_KEY) ?? 'null') as Nudge[] | null;
        if (cached && cached.length) {
          poolRef.current = withIds(cached);
          loadingRef.current = false;
          return;
        }
      }
    } catch {
      /* ignore cache read errors */
    }

    let pool: Nudge[] = [];
    try {
      const res = await fetch('/api/chat/nudges', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (Array.isArray(data?.nudges)) pool = data.nudges as Nudge[];
    } catch {
      /* network error — fall through to template fallback */
    }
    if (pool.length === 0) pool = fallbackNudges(coursesRef.current, specsRef.current, getCurrentTerm());

    poolRef.current = withIds(pool);
    try {
      sessionStorage?.setItem(POOL_KEY, JSON.stringify(pool));
      sessionStorage?.setItem(SIG_KEY, sig);
    } catch {
      /* ignore cache write errors */
    }
    loadingRef.current = false;
  }, [userId, sig]);

  /** The next unseen nudge (marks it seen), or null if the pool is exhausted/unloaded. */
  const nextNudge = useCallback((): ActiveNudge | null => {
    const pool = poolRef.current ?? localPool();
    const next = pool.find((n) => !seenRef.current.has(n.id));
    if (!next) return null;
    seenRef.current.add(next.id);
    writeSeen(seenRef.current);
    return next;
  }, [localPool]);

  return { loadPool, nextNudge };
}
