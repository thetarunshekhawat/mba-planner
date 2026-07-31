// Shared term logic: which MBA term is "current", which of a student's courses fall
// in a given term, and the bidding scenario that current vs. later terms implies.
// One source of truth for the planner UI and the chat routes.

import { ALL_COURSES } from '@/data/courses';
import type { Course } from '@/types';

export type TermId = 4 | 5 | 6;

export const TERM_DATES: { term: TermId; label: string; dates: string; start: Date; end: Date }[] = [
  { term: 4, label: 'Term 4', dates: 'Jun 29 – Sep 27, 2026', start: new Date('2026-06-29'), end: new Date('2026-09-27') },
  { term: 5, label: 'Term 5', dates: 'Sep 28 – Dec 27, 2026', start: new Date('2026-09-28'), end: new Date('2026-12-27') },
  { term: 6, label: 'Term 6', dates: 'Jan 4 – Apr 4, 2027',   start: new Date('2027-01-04'), end: new Date('2027-04-04') },
];

/** The term the student is living in right now (defaults to the nearest edge). */
export function getCurrentTerm(now: Date = new Date()): TermId {
  for (const t of TERM_DATES) {
    if (now >= t.start && now <= t.end) return t.term;
  }
  if (now < TERM_DATES[0].start) return 4;
  return 6;
}

/**
 * Today's date on the campus calendar as YYYY-MM-DD. Pinned to IST so the server
 * (UTC on Vercel) and the student's browser agree on when a course has finished —
 * both sides decide which nudges are still relevant, so they must not disagree.
 */
export function campusToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

/** A course is "completed" once its last class day has passed. Course dates are plain
 *  YYYY-MM-DD strings, so a lexical compare is an exact calendar-date compare. */
export function isCourseCompleted(course: Course, today: string = campusToday()): boolean {
  return course.endDate < today;
}

/**
 * Course codes whose teaching is fully over. A code can appear on more than one row
 * (e.g. SADT has an Aug 5 makeup session), so a course counts as finished only once
 * every row carrying that code has ended.
 */
export function completedCourseCodes(today: string = campusToday()): Set<string> {
  const lastDay = new Map<string, string>();
  for (const c of ALL_COURSES) {
    if (!c.code) continue;
    const prev = lastDay.get(c.code);
    if (!prev || c.endDate > prev) lastDay.set(c.code, c.endDate);
  }
  return new Set([...lastDay].filter(([, end]) => end < today).map(([code]) => code));
}

/**
 * The courses a student is taking in `term`, ordered by occurrence (earliest first).
 * Includes every globally-mandatory course for the term (e.g. "AI in Business") even
 * if the student hasn't explicitly selected it, plus their selected electives.
 */
export function getTermCourses(selectedIds: Set<number>, term: TermId): Course[] {
  return ALL_COURSES.filter(
    (c) =>
      c.term === term &&
      (c.type === 'mandatory' || (c.type === 'elective' && selectedIds.has(c.id))),
  ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

/**
 * One sentence describing the bidding state for the model. Bidding for the current
 * term is over (those courses are locked — never suggest swapping them); later terms
 * are still open, so weighing/comparing courses there is fair game.
 */
export function biddingNote(currentTerm: TermId): string {
  const laterTerms = TERM_DATES.filter((t) => t.term > currentTerm).map((t) => `Term ${t.term}`);
  const later = laterTerms.length
    ? `Bidding for ${laterTerms.join(' and ')} has not happened yet, so for those terms it is appropriate to weigh whether a course is worth taking, compare options, and discuss fit with the student's specialization.`
    : 'There are no later terms left to bid for.';
  return (
    `BIDDING STATE: Course bidding for the current term (Term ${currentTerm}) is already complete. ` +
    `The student's Term ${currentTerm} courses are locked in and cannot be changed, so do NOT suggest dropping, ` +
    `swapping, or reconsidering them — instead help the student get the most out of what they are already enrolled in. ` +
    later
  );
}
