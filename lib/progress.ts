// Degree progress: how many electives, WaW courses and specialization credits a
// student has, on either of two bases —
//
//   'full-year'  everything they have selected, whenever it runs (the planner's
//                original reading: what the year will add up to)
//   'to-date'    only what has actually been taught by today, where a block that
//                is underway counts as banked (you are sitting in it now)
//
// One implementation, imported by every surface that shows a number, so the
// sidebar bars and the specialization dialog cannot disagree.

import { ALL_COURSES, SPECS } from '@/data/courses';
import { campusToday } from '@/lib/terms';
import type { Course, Spec, SpecId } from '@/types';

export const TOTAL_ELECTIVE_CREDITS = 16;
export const SPEC_REQUIRED_CREDITS = 6;

export type ProgressBasis = 'to-date' | 'full-year';

/**
 * Catalogue rows that are one course taught in pieces. `data/courses.ts` has one
 * row per teaching window, so a staggered course appears more than once and would
 * otherwise be counted more than once toward the same specialization — picking
 * Entrepreneurship auto-selects both CIVB rows and used to read as 2 of 6.
 *
 * `code` catches most of this on its own (SADT's Aug 5 makeup row carries the same
 * code as the main row). Term 6 rows have no codes at all, so the Term 6
 * continuation of CIVB can only be grouped by id.
 */
const SAME_COURSE_IDS: number[][] = [
  [20, 27, 33], // CIVB — Block 23 (Oct), Block 25 (Nov), Term 6 sessions 7–10
];

const GROUP_KEY_BY_ID = new Map<number, string>(
  SAME_COURSE_IDS.flatMap((ids, i) => ids.map((id) => [id, `group:${i}`] as const)),
);

/** One key per real course, however many catalogue rows it spans. */
export function courseKey(course: Course): string {
  return (
    GROUP_KEY_BY_ID.get(course.id) ??
    (course.code ? `code:${course.code}` : `id:${course.id}`)
  );
}

/**
 * A course counts as *banked* on the to-date basis once its first class has
 * happened — an ongoing block is credit you are in the middle of earning, not
 * credit you are still waiting on. Dates are plain YYYY-MM-DD, so a lexical
 * compare is an exact calendar-date compare (same convention as `lib/terms.ts`).
 */
export function hasStarted(course: Course, today: string): boolean {
  return course.startDate <= today;
}

/**
 * Collapse rows to one entry per real course. The representative row is the
 * earliest-starting one, so `hasStarted` on it answers "has this course begun".
 */
function distinct(courses: Course[]): Course[] {
  const byKey = new Map<string, Course>();
  for (const c of courses) {
    const key = courseKey(c);
    const prev = byKey.get(key);
    if (!prev || c.startDate < prev.startDate) byKey.set(key, c);
  }
  return [...byKey.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export interface SpecProgress {
  spec: Spec;
  /** Distinct courses counting toward this spec on the active basis. */
  earned: number;
  required: number;
  /** The student declared this spec on their profile. */
  declared: boolean;
  /** Enough credits, and nothing mandatory outstanding. */
  complete: boolean;
  /** Mandatory-for-this-spec courses the student has not selected at all. */
  missingMandatory: Course[];
  /** Selected, but not taught yet — only ever non-empty on the to-date basis. */
  pendingMandatory: Course[];
  /** The counted courses, earliest first. */
  courses: Course[];
  /** How many of `courses` also carry another spec's tag. */
  sharedCount: number;
}

export interface ProgressSummary {
  basis: ProgressBasis;
  /** The day the to-date figures are measured against (YYYY-MM-DD). */
  today: string;
  electives: { earned: number; total: number };
  waw: { earned: number; total: number };
  specs: SpecProgress[];
  /** Distinct selected electives counting toward two or more specs. */
  doubleCounted: number;
}

/**
 * Every progress figure the planner shows, on one basis.
 *
 * `selected` is the raw set of selected course ids (term-agnostic, exactly as
 * stored in `course_selections`); `userSpecs` only marks which specs the student
 * has declared — every spec is computed either way, because the point of the
 * specialization view is to surface the ones they have earned without asking for.
 */
export function computeProgress(
  selected: Set<number>,
  userSpecs: SpecId[],
  opts: { basis?: ProgressBasis; today?: string } = {},
): ProgressSummary {
  const basis = opts.basis ?? 'full-year';
  const today = opts.today ?? campusToday();
  const counts = (c: Course) => basis === 'full-year' || hasStarted(c, today);

  const electives = distinct(
    ALL_COURSES.filter((c) => c.type === 'elective' && selected.has(c.id)),
  );
  const banked = electives.filter(counts);

  const waw = distinct(ALL_COURSES.filter((c) => c.type === 'waw'));

  const selectedKeys = new Set(
    ALL_COURSES.filter((c) => selected.has(c.id)).map(courseKey),
  );

  const specs: SpecProgress[] = SPECS.map((spec) => {
    const courses = banked.filter((c) => c.specs.includes(spec.id));

    // Mandatory rows are grouped too: CIVB is mandatory for ENT and spans three
    // rows, so "have you taken it" is one question, not three.
    const mandatory = distinct(
      ALL_COURSES.filter((c) => c.mandatoryFor?.includes(spec.id)),
    );
    const missingMandatory = mandatory.filter((m) => !selectedKeys.has(courseKey(m)));
    const pendingMandatory = mandatory.filter(
      (m) => selectedKeys.has(courseKey(m)) && !counts(m),
    );

    return {
      spec,
      earned: courses.length,
      required: SPEC_REQUIRED_CREDITS,
      declared: userSpecs.includes(spec.id),
      complete:
        courses.length >= SPEC_REQUIRED_CREDITS &&
        missingMandatory.length === 0 &&
        pendingMandatory.length === 0,
      missingMandatory,
      pendingMandatory,
      courses,
      sharedCount: courses.filter((c) => c.specs.length > 1).length,
    };
  });

  return {
    basis,
    today,
    electives: { earned: banked.length, total: TOTAL_ELECTIVE_CREDITS },
    waw: { earned: waw.filter(counts).length, total: waw.length },
    specs,
    doubleCounted: banked.filter((c) => c.specs.length > 1).length,
  };
}

/** "9 Aug" — the to-date basis is always labelled with the day it means. */
export function formatCampusDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
