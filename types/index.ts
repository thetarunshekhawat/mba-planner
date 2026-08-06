export type SpecId = 'FIN' | 'OPS' | 'ENT' | 'ECOM' | 'MKT' | 'LSTR';
export type CourseType = 'elective' | 'mandatory' | 'waw' | 'exam' | 'free';
export type WorkloadLevel =
  | 'Low'
  | 'Low-Moderate'
  | 'Moderate'
  | 'Moderate-Low'
  | 'Moderate-High'
  | 'Moderate - High'
  | 'High'
  | 'Heavy';

export interface CourseReview {
  learningDepth: number; // 1–5
  workload: WorkloadLevel;
  careerRelevance: number; // 1–5
  whatYouLearn: string[];
  highlights: string[];
  lowlights: string[];
  summary: string;
}

export interface SessionSlot {
  slot: string;       // e.g. "09:00–12:00"
  room: string;       // e.g. "S04"
  days: string[];     // Week 1 days (or all weeks if identical)
  part?: string;      // 'A' | 'B' for two-section courses
  week2Days?: string[]; // Week 2 days if different from week 1
  block2Days?: string[];      // For a course spanning two blocks: week 1 days in its second block
  block2Week2Days?: string[]; // For a course spanning two blocks: week 2 days in its second block
}

export interface Course {
  id: number;
  term: 4 | 5 | 6;
  week: number;
  startDate: string;
  endDate: string;
  dates: string;
  block: number | null;
  name: string;
  code?: string;          // e.g. "SCAT", "ABMK"
  faculty: string;
  seats: number | null;
  specs: SpecId[];
  mandatoryFor?: SpecId[];   // specializations this course is required for
  type: CourseType;
  conflictGroup: string | null;
  timings?: SessionSlot[]; // time slot + room data from timetable (Term 4 has this)
  outlineUrl?: string;
  seatingCharts?: { section: string; url: string }[]; // registrar seating chart PDFs per section
  review: CourseReview | null;
}

export interface Spec {
  id: SpecId;
  label: string;
  color: string;
  bg: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  specializations: SpecId[];
  friend_code?: string;
  avatar_url?: string;
}

// A friend the current user can see (their viewer→friend edge exists).
export interface Friend {
  id: string;
  name: string;
  email: string;
  specializations: SpecId[];
  friendCode?: string;
  addedAt: string;
  avatarUrl?: string;
}

// A friend currently overlaid on the schedule, with an assigned color.
export interface FriendOverlay {
  id: string;
  name: string;
  color: string;
  selected: Set<number>;
}

// Distinct hues for overlaid friends (cycled by friend ordering).
// Chosen to read clearly against the light schedule grid and to stay
// distinguishable from the spec palette / mandatory-blue / conflict-red.
export const FRIEND_COLORS: string[] = [
  '#0ea5e9', // sky
  '#a855f7', // purple
  '#10b981', // emerald
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#eab308', // amber
  '#6366f1', // indigo
];

// Stable color per friend id (so a friend keeps the same hue across views,
// independent of list order or how many friends are added/removed).
export function colorForFriend(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FRIEND_COLORS[h % FRIEND_COLORS.length];
}

// ── Alerts ───────────────────────────────────────────────────────────────────
// Row shapes mirror supabase/migrations/017 + 018 and therefore use snake_case,
// like `Profile` above. Derived view models (things the UI computes) use
// camelCase, like `Friend`.
//
// Every instant is an ISO 8601 string with an offset — Unstop hands us
// `+05:30` and the columns are `timestamptz`, so these are absolute moments,
// never floating local times. Plain calendar dates stay `YYYY-MM-DD` to match
// `Course.startDate` and `campusToday()`.

export type CompetitionSource = 'unstop' | 'manual';
export type CompetitionVisibility = 'global' | 'private';
export type AlertTrackStatus = 'active' | 'eliminated' | 'archived';
export type ReminderAnchor =
  | 'round_end'
  | 'round_start'
  | 'registration_deadline'
  | 'deadline';
export type ReminderMode = 'offset' | 'absolute';
export type AlertDeliveryStatus = 'sent' | 'skipped_stale' | 'failed';

/**
 * Where a round sits relative to now.
 * `unknown` exists because a round with no dates must never render as `done` —
 * a fake checkmark tells a student they've finished something they haven't.
 */
export type RoundState = 'done' | 'live' | 'upcoming' | 'unknown';

export interface Competition {
  id: string;
  source: CompetitionSource;
  source_id: string | null;
  visibility: CompetitionVisibility;
  created_by: string | null;
  title: string;
  organiser: string | null;
  logo_url: string | null;
  banner_url: string | null;
  public_url: string | null;
  region: string | null;
  registration_opens_at: string | null;
  registration_deadline: string | null;
  starts_at: string | null;
  ends_at: string | null;
  min_team_size: number | null;
  max_team_size: number | null;
  prize_summary: string | null;
  skills: string[] | null;
  register_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitionRound {
  id: string;
  competition_id: string;
  round_key: string;
  round_order: number;
  title: string | null;
  description_html: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_eliminator: boolean;
  entity_type: string | null;
  public_url: string | null;
  /** Set when the round disappears from Unstop. Rounds are never deleted —
   *  reminder rules and elimination records point at these ids. */
  retired_at: string | null;
  updated_at: string;
}

export interface AlertTrack {
  id: string;
  user_id: string;
  competition_id: string;
  status: AlertTrackStatus;
  notifications_enabled: boolean;
  eliminated_round_id: string | null;
  eliminated_at: string | null;
  tracked_at: string;
}

/**
 * A *sparse override*. Defaults (see `lib/alerts/schedule.ts`) are never
 * materialised, so a row exists here only where the student deviated from them.
 */
export interface AlertReminderRule {
  id: string;
  track_id: string;
  anchor: ReminderAnchor;
  round_id: string | null;
  mode: ReminderMode;
  offset_minutes: number | null;
  absolute_at: string | null;
  enabled: boolean;
}

/** Absence means "assumed passed". Only an explicit `cleared: false` stops alerts. */
export interface AlertRoundOutcome {
  id: string;
  user_id: string;
  round_id: string;
  cleared: boolean;
  decided_at: string;
}

export interface CustomDeadline {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  url: string | null;
  due_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  failure_count: number;
  disabled_at: string | null;
  created_at: string;
}

/**
 * The idempotency ledger. `UNIQUE (user_id, dedupe_key)` is what makes
 * double-sending impossible; a `skipped_stale` row still burns the key, so an
 * outage can't cause a 3am burst about deadlines that already passed.
 */
export interface AlertDelivery {
  id: string;
  user_id: string;
  dedupe_key: string;
  kind: string;
  title: string;
  body: string | null;
  url: string | null;
  due_at: string | null;
  anchor_at: string | null;
  status: AlertDeliveryStatus;
  channel_results: unknown;
  read_at: string | null;
  created_at: string;
}

export type CompetitionRequestReason = 'not_unstop' | 'unstop_unreachable';
export type CompetitionRequestStatus = 'pending' | 'added' | 'declined';

/**
 * "This link isn't on Unstop — please add it for me."
 *
 * Deliberately not a `Competition` with a pending flag: nothing on it is
 * verified, so it must not be reachable from any path that schedules a
 * reminder. See migration 020.
 */
export interface CompetitionRequest {
  id: string;
  user_id: string;
  url: string;
  note: string | null;
  reason: CompetitionRequestReason;
  status: CompetitionRequestStatus;
  competition_id: string | null;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

/** A competition plus everything the card needs, assembled client-side. */
export interface TrackedCompetition {
  competition: Competition;
  rounds: CompetitionRound[];
  track: AlertTrack | null;
  outcomes: AlertRoundOutcome[];
  rules: AlertReminderRule[];
}
