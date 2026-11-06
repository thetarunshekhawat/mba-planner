// Take-once programs: one program offered in more than one window, where a student
// takes exactly one run. Today that is Vertex (Term 5 Oct–Dec, id 49; Term 6 Jan–Mar,
// id 115). Both rows share a `conflictGroup`, so the Schedule tab's conflict banner
// already flags them if both are somehow selected; the groups listed here go further
// and refuse the second selection outright (useSelections) and tell the student why
// (Plan cards + course detail).
import { ALL_COURSES } from '@/data/courses';
import type { Course } from '@/types';

export const TAKE_ONCE_GROUPS: ReadonlySet<string> = new Set(['VERTEX']);

export function isTakeOnce(course: Course): boolean {
  return !!course.conflictGroup && TAKE_ONCE_GROUPS.has(course.conflictGroup);
}

/** The already-selected run that stops `course` from being added, if any. */
export function takeOnceBlocker(course: Course, selected: Set<number>): Course | undefined {
  if (!isTakeOnce(course) || selected.has(course.id)) return undefined;
  return ALL_COURSES.find(
    (c) => c.id !== course.id && c.conflictGroup === course.conflictGroup && selected.has(c.id),
  );
}

export function takeOnceBlockerById(courseId: number, selected: Set<number>): Course | undefined {
  const course = ALL_COURSES.find((c) => c.id === courseId);
  return course ? takeOnceBlocker(course, selected) : undefined;
}

/** "Term 5". Not the row's dates: the Term 6 row is listed under its Block 32 week. */
export function runLabel(course: Course): string {
  return `Term ${course.term}`;
}

/** The always-on note for a take-once card, or null for every other course. */
export function takeOnceNote(course: Course): string | null {
  if (!isTakeOnce(course)) return null;
  const others = ALL_COURSES.filter(
    (c) => c.id !== course.id && c.conflictGroup === course.conflictGroup,
  );
  const credits = course.credits ?? 1;
  const creditText = credits === 1 ? '1 elective' : `${credits} electives`;
  if (others.length === 0) return `Counts as ${creditText}.`;
  return `Take once: this run or the ${others.map(runLabel).join(' / ')} run, not both. Counts as ${creditText}.`;
}

export function blockedMessage(blocker: Course): string {
  return `${blocker.name} is already picked in ${runLabel(blocker)}. Untick it to choose this run instead.`;
}
