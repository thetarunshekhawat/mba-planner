// Follow-on courses: a Term 6 row the school registers automatically for everyone who
// took its Term 5 lead. Today that is FDE Management: FEDM-I (id 48, Term 5) brings
// FEDM-II (id 111, Term 6) with it, and FEDM-II is not in the bidding (Term 6 bidding
// brief, 2026-27). So id 111 is never picked on its own: it is added and removed with
// id 48 (useSelections), and its select control stays disabled with a short hint.
// Credit needs nothing extra here: 48 and 111 are separate catalogue courses, so
// computeProgress already counts them as 1 + 1 = 2.
import { ALL_COURSES } from '@/data/courses';
import type { Course } from '@/types';
import { takeOnceBlocker, blockedMessage } from '@/lib/takeOnce';

/** follower id → lead id */
const FOLLOWS: ReadonlyMap<number, number> = new Map([[111, 48]]);

export function leadOf(courseId: number): number | undefined {
  return FOLLOWS.get(courseId);
}

/** Follower ids that come with `leadId` (empty for every other course). */
export function followersOf(leadId: number): number[] {
  return [...FOLLOWS].filter(([, lead]) => lead === leadId).map(([f]) => f);
}

function leadCourse(courseId: number): Course | undefined {
  const lead = leadOf(courseId);
  return lead === undefined ? undefined : ALL_COURSES.find((c) => c.id === lead);
}

/** Why a follower can't be toggled by hand, or undefined for every other course. */
export function followerMessage(course: Course, selected: Set<number>): string | undefined {
  const lead = leadCourse(course.id);
  if (!lead) return undefined;
  // An old pick with no lead behind it can still be unticked.
  if (!selected.has(lead.id) && selected.has(course.id)) return undefined;
  return selected.has(lead.id)
    ? `Comes with Term ${lead.term} FEDM. Untick FEDM in Term ${lead.term} to drop both.`
    : `FEDM-II follows Term ${lead.term} FEDM: pick it in Term ${lead.term}.`;
}

/**
 * Why `course`'s select control is disabled right now, or undefined when it isn't.
 * One answer for every card and course detail: a take-once program already picked in
 * its other run (Vertex), or a follow-on course that moves with its lead (FEDM-II).
 */
export function selectionBlock(course: Course, selected: Set<number>): string | undefined {
  const blocker = takeOnceBlocker(course, selected);
  if (blocker) return blockedMessage(blocker);
  return followerMessage(course, selected);
}
