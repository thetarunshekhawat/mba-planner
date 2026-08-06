// Where a competition currently stands: per-round state, chain progress, and
// whether a pass/fail question is owed.
//
// Pure functions over rounds + outcomes. Shared by the card, the round chain and
// the dispatcher, so what a student sees and what fires cannot drift apart.

import type { AlertRoundOutcome, CompetitionRound, RoundState } from '@/types';

/**
 * Where a round sits relative to `now`.
 *
 * A round with no usable dates is `unknown`, never `done`. That distinction is
 * the point of this function: rendering an undated round as complete puts a
 * checkmark against something the student has not finished, and they would have
 * no reason to doubt it.
 */
export function roundState(round: CompetitionRound, now: Date = new Date()): RoundState {
  const start = parse(round.starts_at);
  const end = parse(round.ends_at);
  const t = now.getTime();

  if (start === null && end === null) return 'unknown';

  if (end !== null && t >= end) return 'done';
  if (start !== null && t < start) return 'upcoming';

  // Started and not yet ended. Also covers a round with only one of the two
  // dates: past its start with no end, or before its end with no start.
  if (start !== null && t >= start) return 'live';
  if (end !== null && t < end) return 'upcoming';

  return 'unknown';
}

function parse(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Rounds that still count — retired ones are kept in the DB but never shown. */
export function activeRounds(rounds: CompetitionRound[]): CompetitionRound[] {
  return rounds.filter((r) => !r.retired_at);
}

export interface ChainProgress {
  done: number;
  live: number;
  upcoming: number;
  unknown: number;
  total: number;
  /** 0–100, for the progress bar. */
  percent: number;
}

/**
 * Progress across the chain.
 *
 * Counts rounds that are actually finished — **not** the index of the current
 * round. Round windows overlap on Unstop (TGC 2026 runs order 4 entirely inside
 * order 3's window), so consecutive order does not mean consecutive time.
 * Position-based progress would report a student as further along than they are.
 * Two rounds being `live` at once is normal and correct.
 */
export function chainProgress(rounds: CompetitionRound[], now: Date = new Date()): ChainProgress {
  const live = activeRounds(rounds);
  const counts = { done: 0, live: 0, upcoming: 0, unknown: 0 };
  for (const r of live) counts[roundState(r, now)]++;
  const total = live.length;
  return {
    ...counts,
    total,
    percent: total === 0 ? 0 : Math.round((counts.done / total) * 100),
  };
}

/** Rounds in the order the chain renders them (by `round_order`, for display). */
export function orderedRounds(rounds: CompetitionRound[]): CompetitionRound[] {
  return [...activeRounds(rounds)].sort((a, b) => a.round_order - b.round_order);
}

/**
 * The rounds where an elimination question is owed: an eliminator that has ended
 * and that the student has not answered.
 *
 * Default is PASSED — the absence of an answer never blocks the chain, and the
 * card keeps advancing whether or not the student replies. Only an explicit
 * `cleared: false` stops anything.
 */
export function pendingEliminationRounds(
  rounds: CompetitionRound[],
  outcomes: AlertRoundOutcome[],
  now: Date = new Date(),
): CompetitionRound[] {
  const decided = new Set(outcomes.map((o) => o.round_id));
  return activeRounds(rounds).filter(
    (r) => r.is_eliminator && roundState(r, now) === 'done' && !decided.has(r.id),
  );
}

/** The round the student declared they did not clear, if any. */
export function eliminatedAtRound(
  rounds: CompetitionRound[],
  outcomes: AlertRoundOutcome[],
): CompetitionRound | null {
  const failed = outcomes.find((o) => !o.cleared);
  if (!failed) return null;
  return rounds.find((r) => r.id === failed.round_id) ?? null;
}

/**
 * The next thing happening — the earliest future round start or end, whichever
 * comes first. This is what the card's one-line status reads from.
 */
export function nextMilestone(
  rounds: CompetitionRound[],
  now: Date = new Date(),
): { round: CompetitionRound; at: string; kind: 'starts' | 'ends' } | null {
  const t = now.getTime();
  let best: { round: CompetitionRound; at: string; kind: 'starts' | 'ends' } | null = null;

  for (const r of activeRounds(rounds)) {
    for (const [kind, iso] of [
      ['starts', r.starts_at],
      ['ends', r.ends_at],
    ] as const) {
      const ms = parse(iso);
      if (ms === null || ms <= t) continue;
      if (!best || ms < new Date(best.at).getTime()) {
        best = { round: r, at: iso as string, kind };
      }
    }
  }
  return best;
}
