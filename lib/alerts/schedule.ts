// When reminders fire. The single implementation, imported by both the
// dispatcher and the client — so the card's "you'll be reminded on…" preview
// cannot disagree with what actually gets sent.
//
// ── The model ────────────────────────────────────────────────────────────────
// Rules are stored sparsely; occurrences are computed at dispatch; idempotency
// lives in the delivery ledger.
//
// Reminder rows are deliberately NOT materialised, because:
//   • Unstop edits round dates after publishing. Materialised rows go stale the
//     moment the skill re-runs, and reconciling them means walking every
//     tracker × round × offset. Computed at dispatch, the new date is
//     authoritative instantly and there is no reconciliation code to get wrong.
//   • A student who tracked in August must get reminders for a round Unstop adds
//     in September. That's a fan-out write on import if materialised; free here.
//   • Elimination would need cascading deletes of pending rows. Computed, the
//     dispatcher simply doesn't join eliminated tracks.
//   • Volume is trivial: ~100 students × ~10 comps × ~10 rounds × ~4 offsets is
//     well under 50k, computed in memory in milliseconds.
//
// What stops a reminder being sent twice is not this file — it's the
// `UNIQUE (user_id, dedupe_key)` index on `alert_deliveries`. The keys here
// contain no timestamp, so a re-import with new dates cannot re-fire something
// already sent.

import type {
  AlertReminderRule,
  AlertRoundOutcome,
  AlertTrack,
  Competition,
  CompetitionRound,
  CustomDeadline,
} from '@/types';

export interface Offset {
  code: string;
  minutes: number;
}

export const DEFAULT_OFFSETS: readonly Offset[] = [
  { code: 'T-7d', minutes: 10080 },
  { code: 'T-2d', minutes: 2880 },
  { code: 'T-1d', minutes: 1440 },
  { code: 'T-3h', minutes: 180 },
  { code: 'T-0', minutes: 0 },
] as const;

/** A registration deadline is the one date worth a week's warning. */
export const REGISTRATION_OFFSETS: readonly Offset[] = DEFAULT_OFFSETS;

/** Rounds are often shorter than a week, so a 7-day warning would fire before
 *  the round even exists in the student's mind. */
export const ROUND_END_OFFSETS: readonly Offset[] = DEFAULT_OFFSETS.filter((o) => o.minutes <= 1440);

/** A round *starting* is information, not a deadline — one notification, on the day. */
export const ROUND_START_OFFSETS: readonly Offset[] = [{ code: 'T-0', minutes: 0 }];

/**
 * How long after the anchor a reminder is still worth sending.
 *
 * A dispatcher that missed its window by an hour should still warn you. One
 * that has been down overnight should not wake you at 3am about deadlines that
 * already passed — those get written to the ledger as `skipped_stale`, which
 * burns the dedupe key so they can never fire later.
 */
export const STALE_GRACE_MS = 6 * 60 * 60 * 1000;

/**
 * Anything anchored further in the past than this is ignored outright rather
 * than written as `skipped_stale`. The dispatcher already windows its query to
 * roughly ±14 days; this is the belt-and-braces so a first run against a long
 * history can't write a pile of dead ledger rows.
 */
export const ANCIENT_CUTOFF_MS = 14 * 24 * 60 * 60 * 1000;

export type OccurrenceKind =
  | 'registration_deadline'
  | 'round_start'
  | 'round_end'
  | 'deadline'
  | 'course_deadline';

export type OccurrenceStatus = 'sent' | 'skipped_stale';

export interface Occurrence {
  userId: string;
  dedupeKey: string;
  kind: OccurrenceKind;
  title: string;
  body: string;
  url: string | null;
  /** When this reminder was supposed to fire. */
  dueAt: string;
  /** The thing being reminded about. */
  anchorAt: string;
  status: OccurrenceStatus;
}

/** One student's world, as the dispatcher assembles it. */
export interface DispatchTrack {
  track: AlertTrack;
  competition: Competition;
  rounds: CompetitionRound[];
  rules: AlertReminderRule[];
  outcomes: AlertRoundOutcome[];
}

export interface CourseDeadlineItem {
  id: string;
  title: string;
  body: string;
  dueAt: string;
  url: string | null;
}

export interface DispatchInput {
  userId: string;
  tracks: DispatchTrack[];
  customDeadlines: CustomDeadline[];
  courseItems: CourseDeadlineItem[];
}

/**
 * `v1:<kind>:<entityId>:<offsetCode>`, e.g. `v1:round_end:9f3a…:T-1d`.
 *
 * **Contains no timestamp.** That is the whole point: when Unstop moves a round
 * two days later, the key for its T-1d reminder is unchanged, so a reminder
 * already sent cannot be sent again. Bump the `v1` prefix only if you
 * deliberately want every student to receive a fresh round of notifications.
 */
export function dedupeKey(kind: string, entityId: string, offsetCode: string): string {
  return `v1:${kind}:${entityId}:${offsetCode}`;
}

function ms(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Classify a candidate against the clock.
 *
 * Returns null when the reminder isn't due yet, or is so far past that writing
 * a tombstone for it would be noise.
 */
function classify(dueMs: number, anchorMs: number, nowMs: number): OccurrenceStatus | null {
  if (dueMs > nowMs) return null; // not due yet
  if (anchorMs + ANCIENT_CUTOFF_MS < nowMs) return null; // ancient; don't even tombstone
  // Past the anchor by more than the grace period: burn the key, send nothing.
  if (anchorMs + STALE_GRACE_MS < nowMs) return 'skipped_stale';
  return 'sent';
}

/**
 * The offsets that apply to one anchor after the student's overrides.
 *
 * Rules are sparse — a row exists only where the student deviated from the
 * defaults — so this starts from the defaults and applies rows on top:
 *   • `enabled: false` on an offset rule removes exactly that default
 *   • an offset rule with a non-default value adds it
 *   • an absolute rule contributes a fixed instant instead of an offset
 */
function offsetsFor(
  defaults: readonly Offset[],
  rules: AlertReminderRule[],
): { offsets: Offset[]; absolutes: { code: string; at: string }[] } {
  const suppressed = new Set<number>();
  const extra: Offset[] = [];
  const absolutes: { code: string; at: string }[] = [];

  for (const r of rules) {
    if (r.mode === 'absolute') {
      if (r.enabled && r.absolute_at) {
        // Keyed by rule id, not by the instant — editing the time before it
        // fires reuses the key (nothing was sent yet), and editing it after
        // can't re-fire something the student already saw.
        absolutes.push({ code: `abs-${r.id}`, at: r.absolute_at });
      }
      continue;
    }
    if (typeof r.offset_minutes !== 'number') continue;
    if (r.enabled) extra.push({ code: offsetCode(r.offset_minutes), minutes: r.offset_minutes });
    else suppressed.add(r.offset_minutes);
  }

  const merged = new Map<number, Offset>();
  for (const o of defaults) if (!suppressed.has(o.minutes)) merged.set(o.minutes, o);
  for (const o of extra) merged.set(o.minutes, o);

  return { offsets: [...merged.values()], absolutes };
}

/** A stable code for an arbitrary offset, so custom offsets get stable keys. */
export function offsetCode(minutes: number): string {
  const known = DEFAULT_OFFSETS.find((o) => o.minutes === minutes);
  if (known) return known.code;
  if (minutes === 0) return 'T-0';
  if (minutes % 1440 === 0) return `T-${minutes / 1440}d`;
  if (minutes % 60 === 0) return `T-${minutes / 60}h`;
  return `T-${minutes}m`;
}

/** The rules attached to one anchor (and one round, where relevant). */
function rulesFor(
  rules: AlertReminderRule[],
  anchor: AlertReminderRule['anchor'],
  roundId: string | null,
): AlertReminderRule[] {
  return rules.filter((r) => r.anchor === anchor && (r.round_id ?? null) === roundId);
}

/**
 * Every reminder that is due for one student, right now.
 *
 * Expects a pre-windowed input (the dispatcher loads rounds anchored within
 * ~±14 days). Callers filter on `status` — `sent` occurrences get pushed,
 * `skipped_stale` ones are recorded and nothing is sent.
 */
export function computeOccurrences(input: DispatchInput, now: Date = new Date()): Occurrence[] {
  const nowMs = now.getTime();
  const out: Occurrence[] = [];

  const push = (
    kind: OccurrenceKind,
    entityId: string,
    code: string,
    anchorMs: number,
    dueMs: number,
    title: string,
    body: string,
    url: string | null,
  ) => {
    const status = classify(dueMs, anchorMs, nowMs);
    if (!status) return;
    out.push({
      userId: input.userId,
      dedupeKey: dedupeKey(kind, entityId, code),
      kind,
      title,
      body,
      url,
      dueAt: new Date(dueMs).toISOString(),
      anchorAt: new Date(anchorMs).toISOString(),
      status,
    });
  };

  const emit = (
    kind: OccurrenceKind,
    entityId: string,
    anchorMs: number,
    defaults: readonly Offset[],
    rules: AlertReminderRule[],
    title: string,
    body: (offset: Offset | null) => string,
    url: string | null,
  ) => {
    const { offsets, absolutes } = offsetsFor(defaults, rules);
    for (const o of offsets) {
      push(kind, entityId, o.code, anchorMs, anchorMs - o.minutes * 60_000, title, body(o), url);
    }
    for (const a of absolutes) {
      const at = ms(a.at);
      if (at === null) continue;
      // An absolute reminder is its own due time, but it is still *about* the
      // anchor — so staleness is judged against the anchor, exactly like an
      // offset reminder. Otherwise "remind me on the 10th" about a deadline on
      // the 8th would fire two days after the fact.
      push(kind, entityId, a.code, anchorMs, at, title, body(null), url);
    }
  };

  // ── Tracked competitions ───────────────────────────────────────────────────
  for (const t of input.tracks) {
    // Muted or eliminated tracks produce nothing at all. The dispatcher's query
    // already filters these out; doing it here too keeps the pure function
    // honest and makes the behaviour testable without a database.
    if (t.track.status !== 'active') continue;
    if (!t.track.notifications_enabled) continue;

    const comp = t.competition;
    const compUrl = comp.public_url;

    // Registration deadline.
    const regn = ms(comp.registration_deadline);
    if (regn !== null) {
      emit(
        'registration_deadline',
        comp.id,
        regn,
        REGISTRATION_OFFSETS,
        rulesFor(t.rules, 'registration_deadline', null),
        comp.title,
        (o) =>
          o && o.minutes > 0
            ? `Registration closes ${humanOffset(o.minutes)}.`
            : 'Registration closes today.',
        compUrl,
      );
    }

    // A round the student declared they did not clear ends the competition for
    // them; nothing after it is theirs to worry about.
    const failed = t.outcomes.find((o) => !o.cleared);
    if (failed) continue;

    for (const r of t.rounds) {
      if (r.retired_at) continue;
      const label = r.title ?? `Round ${r.round_order}`;
      const roundUrl = r.public_url ?? compUrl;

      const startMs = ms(r.starts_at);
      if (startMs !== null) {
        emit(
          'round_start',
          r.id,
          startMs,
          ROUND_START_OFFSETS,
          rulesFor(t.rules, 'round_start', r.id),
          comp.title,
          () => `${label} starts today.`,
          roundUrl,
        );
      }

      const endMs = ms(r.ends_at);
      if (endMs !== null) {
        emit(
          'round_end',
          r.id,
          endMs,
          ROUND_END_OFFSETS,
          rulesFor(t.rules, 'round_end', r.id),
          comp.title,
          (o) =>
            o && o.minutes > 0
              ? `${label} closes ${humanOffset(o.minutes)}.`
              : `${label} closes today.`,
          roundUrl,
        );
      }
    }
  }

  // ── Manual deadlines ───────────────────────────────────────────────────────
  for (const d of input.customDeadlines) {
    if (d.completed_at) continue;
    const at = ms(d.due_at);
    if (at === null) continue;
    emit(
      'deadline',
      d.id,
      at,
      DEFAULT_OFFSETS,
      [],
      d.title,
      (o) => (o && o.minutes > 0 ? `Due ${humanOffset(o.minutes)}.` : 'Due today.'),
      d.url,
    );
  }

  // ── Course-derived dates (Tier A) ──────────────────────────────────────────
  for (const c of input.courseItems) {
    const at = ms(c.dueAt);
    if (at === null) continue;
    emit('course_deadline', c.id, at, ROUND_END_OFFSETS, [], c.title, () => c.body, c.url);
  }

  return out.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

/** "in 2 days" / "in 3 hours" — the tail of a reminder sentence. */
export function humanOffset(minutes: number): string {
  if (minutes >= 1440) {
    const d = Math.round(minutes / 1440);
    return `in ${d} ${d === 1 ? 'day' : 'days'}`;
  }
  if (minutes >= 60) {
    const h = Math.round(minutes / 60);
    return `in ${h} ${h === 1 ? 'hour' : 'hours'}`;
  }
  return `in ${minutes} min`;
}

/**
 * The upcoming reminders for one anchor, for the card's preview text.
 *
 * Same offset resolution the dispatcher uses, so what the card promises is what
 * fires. Unlike `computeOccurrences` this returns *future* times — the student
 * wants to see what's coming, not what's due.
 */
export function previewSchedule(
  anchorAt: string,
  defaults: readonly Offset[],
  rules: AlertReminderRule[],
  now: Date = new Date(),
): { code: string; at: string }[] {
  const anchorMs = ms(anchorAt);
  if (anchorMs === null) return [];
  const { offsets, absolutes } = offsetsFor(defaults, rules);
  const rows = [
    ...offsets.map((o) => ({ code: o.code, at: new Date(anchorMs - o.minutes * 60_000).toISOString() })),
    ...absolutes.map((a) => ({ code: a.code, at: a.at })),
  ];
  return rows
    .filter((r) => new Date(r.at).getTime() > now.getTime())
    .sort((a, b) => a.at.localeCompare(b.at));
}
