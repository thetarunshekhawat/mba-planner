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
  slot: string;     // e.g. "09:00–12:00"
  room: string;     // e.g. "S04"
  days: string[];   // e.g. ['Mon','Tue','Wed','Thu','Fri']
  part?: string;    // 'A' | 'B' for two-session courses
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
}
