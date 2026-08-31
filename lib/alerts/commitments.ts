// The bridge between the Alerts tab and My Schedule.
//
// A tracked competition is a set of dates a student has to plan *around* — the
// registration close, each round opening, each round closing. Until now those
// dates lived only on the Alerts tab, so the schedule showed a free Thursday
// afternoon on the day a submission was due. Same data, one derivation, two
// surfaces: whatever the card says is due is what the grid draws.
//
// Pure functions over the rows `useAlerts` already fetched — no new queries,
// nothing persisted. `AlertsView` keeps its own "due soon" list because that one
// is a *shortlist* (next milestone only, capped at 8); this returns every dated
// milestone, because a calendar that hides some of your deadlines is worse than
// no calendar.

import type { CustomDeadline, TrackedCompetition } from '@/types';
import { activeRounds } from '@/lib/alerts/progress';
import { istDateOf } from '@/lib/alerts/time';

export type CommitmentKind =
  | 'registration'
  | 'round_start'
  | 'round_end'
  | 'deadline';

export interface Commitment {
  /** Stable across renders — used as the React key and for analytics. */
  key: string;
  kind: CommitmentKind;
  /** The absolute instant, as stored (`timestamptz`, always with an offset). */
  at: string;
  /** The IST calendar day it falls on — what the schedule grid keys off. */
  date: string;
  /** "Round 2 closes", "Registration closes", or the deadline's own title. */
  title: string;
  /** The competition it belongs to, or "Your deadline" for a custom one. */
  subtitle: string;
  url: string | null;
  competitionId: string | null;
  /** Past, or an explicitly completed custom deadline: drawn muted, not bold. */
  done: boolean;
}

/** A round closing is a deadline; a round opening is information. */
const KIND_WEIGHT: Record<CommitmentKind, number> = {
  registration: 0,
  round_end: 1,
  deadline: 2,
  round_start: 3,
};

function roundLabel(title: string | null, order: number): string {
  return title?.trim() || `Round ${order}`;
}

/**
 * Every dated milestone the student has signed up for, sorted by instant.
 *
 * Excluded on purpose:
 *   • archived and eliminated tracks — you are out, the dates are no longer yours
 *   • retired rounds — Unstop removed them, so they never happened
 *   • undated rounds — there is no day to draw them on, and guessing one would
 *     put a deadline on the schedule that does not exist
 */
export function buildCommitments(
  tracked: TrackedCompetition[],
  deadlines: CustomDeadline[],
  now: Date = new Date(),
): Commitment[] {
  const t = now.getTime();
  const out: Commitment[] = [];

  const push = (c: Omit<Commitment, 'date' | 'done'> & { done?: boolean }) => {
    const ms = new Date(c.at).getTime();
    if (Number.isNaN(ms)) return;
    out.push({ ...c, date: istDateOf(c.at), done: c.done ?? ms < t });
  };

  for (const item of tracked) {
    const { competition, track } = item;
    if (!track || track.status !== 'active') continue;

    if (competition.registration_deadline) {
      push({
        key: `regn-${competition.id}`,
        kind: 'registration',
        at: competition.registration_deadline,
        title: 'Registration closes',
        subtitle: competition.title,
        url: competition.public_url,
        competitionId: competition.id,
      });
    }

    for (const round of activeRounds(item.rounds)) {
      const name = roundLabel(round.title, round.round_order);
      if (round.starts_at) {
        push({
          key: `start-${round.id}`,
          kind: 'round_start',
          at: round.starts_at,
          title: `${name} opens`,
          subtitle: competition.title,
          url: round.public_url ?? competition.public_url,
          competitionId: competition.id,
        });
      }
      if (round.ends_at) {
        push({
          key: `end-${round.id}`,
          kind: 'round_end',
          at: round.ends_at,
          title: `${name} closes`,
          subtitle: competition.title,
          url: round.public_url ?? competition.public_url,
          competitionId: competition.id,
        });
      }
    }
  }

  for (const d of deadlines) {
    push({
      key: `dl-${d.id}`,
      kind: 'deadline',
      at: d.due_at,
      title: d.title,
      subtitle: 'Your deadline',
      url: d.url,
      competitionId: null,
      done: d.completed_at ? true : undefined,
    });
  }

  return out.sort(
    (a, b) => a.at.localeCompare(b.at) || KIND_WEIGHT[a.kind] - KIND_WEIGHT[b.kind],
  );
}

/** Grouped by IST day, which is how the schedule grid looks them up. */
export function commitmentsByDate(commitments: Commitment[]): Map<string, Commitment[]> {
  const map = new Map<string, Commitment[]>();
  for (const c of commitments) {
    const day = map.get(c.date);
    if (day) day.push(c);
    else map.set(c.date, [c]);
  }
  return map;
}
