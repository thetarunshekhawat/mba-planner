'use client';

import type { CompetitionRound } from '@/types';
import { orderedRounds, roundState } from '@/lib/alerts/progress';
import { formatIstDay } from '@/lib/alerts/time';

interface Props {
  rounds: CompetitionRound[];
  now?: Date;
  /** Dims the whole strip — used when the student has marked themselves out. */
  muted?: boolean;
}

const SEGMENT: Record<string, string> = {
  done: 'bg-emerald-500',
  live: 'bg-orange-500',
  upcoming: 'bg-slate-200',
  // An undated round is not "not yet" — it is unknown. Hatching it keeps it
  // visually distinct from a round that is simply still ahead.
  unknown: 'bg-slate-100',
};

/**
 * One segment per round, filled green as rounds finish — the whole chain at a
 * glance, without the vertical cost of listing it.
 *
 * This is what a collapsed card shows in place of the round list. It is derived
 * from dates on every render exactly like `RoundChain`, so a collapsed card and
 * an expanded one can never disagree about where a competition stands.
 */
export function StageBar({ rounds, now = new Date(), muted }: Props) {
  const ordered = orderedRounds(rounds);
  if (ordered.length === 0) return null;

  return (
    <div className={`flex items-center gap-1 ${muted ? 'opacity-50' : ''}`}>
      {ordered.map((r) => {
        const state = roundState(r, now);
        const when = r.starts_at ? formatIstDay(r.starts_at) : 'dates TBA';
        return (
          <span
            key={r.id}
            title={`${r.title ?? `Round ${r.round_order}`} — ${when}`}
            className={`h-1.5 flex-1 rounded-full transition-colors ${SEGMENT[state]} ${
              state === 'live' ? 'ring-2 ring-orange-200' : ''
            }`}
          />
        );
      })}
    </div>
  );
}
