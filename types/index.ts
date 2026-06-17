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
}

// A friend the current user can see (their viewer→friend edge exists).
export interface Friend {
  id: string;
  name: string;
  email: string;
  specializations: SpecId[];
  friendCode?: string;
  addedAt: string;
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
