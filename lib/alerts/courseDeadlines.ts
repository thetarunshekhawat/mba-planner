// Tier A course dates — derived, never extracted.
//
// Everything here comes from `data/courses.ts` and the student's
// `course_selections`: a course's first class, its last class, and the exam and
// placement sentinel rows. All of it is already in the catalogue, so there is
// no new table, no extraction step and nothing that can be wrong in a way the
// catalogue isn't already wrong.
//
// ── Why this is the half that ships ─────────────────────────────────────────
// Tier B — real assignment due dates pulled out of `course_outlines.content` —
// is deliberately NOT here. That content is free-form prose, and a runtime
// model call that hallucinated a due date would push it to a hundred phones.
// That is strictly worse than not having the feature. Tier B follows the
// insight-engine pattern instead: an offline script proposes candidates with a
// verbatim source quote, a human reviews the diff, and a migration seeds the
// survivors. **Zero runtime model calls, ever.**
//
// ── The standing course time-awareness rule ─────────────────────────────────
// A course whose last class has passed is finished, and the app must never talk
// about it as if it were still ahead of the student. Every item below is gated
// on `isCourseCompleted()` and dated from `campusToday()` — never a stored flag.
// See CLAUDE.md, "Course time-awareness".

import { ALL_COURSES } from '@/data/courses';
import { campusToday, isCourseCompleted } from '@/lib/terms';
import { istToInstant } from '@/lib/alerts/time';
import type { Course } from '@/types';
import type { CourseDeadlineItem } from '@/lib/alerts/schedule';

/** Default class start when a course has no timetable rows to read from. */
const DEFAULT_CLASS_TIME = '09:00';

/** "09:00–12:00" → "09:00". Timetable slots use an en dash. */
function slotStart(course: Course): string {
  const slot = course.timings?.[0]?.slot;
  if (!slot) return DEFAULT_CLASS_TIME;
  const start = slot.split(/[–-]/)[0]?.trim();
  return /^\d{1,2}:\d{2}$/.test(start ?? '') ? start! : DEFAULT_CLASS_TIME;
}

/**
 * The forward-looking dates for one student's selected courses.
 *
 * Only future items are returned: a course that has already started does not
 * need a "starts soon" reminder, and a finished course produces nothing at all.
 */
export function courseDeadlineItems(
  selectedIds: Set<number>,
  now: Date = new Date(),
): CourseDeadlineItem[] {
  const today = campusToday(now);
  const items: CourseDeadlineItem[] = [];

  for (const course of ALL_COURSES) {
    // Mandatory courses apply to everyone; electives only if chosen.
    const mine = course.type === 'mandatory' || selectedIds.has(course.id);
    if (!mine) continue;

    // The standing rule: nothing forward-looking about a finished course.
    if (isCourseCompleted(course, today)) continue;

    const label = course.code ? `${course.code} — ${course.name}` : course.name;

    if (course.type === 'exam') {
      if (course.startDate > today) {
        items.push({
          id: `course-exam-${course.id}`,
          title: 'Exam week',
          body: `${label} begins today.`,
          dueAt: istToInstant(course.startDate, DEFAULT_CLASS_TIME),
          url: null,
        });
      }
      continue;
    }

    // Placement and free weeks are informational — worth a card, not a warning.
    if (course.type === 'free') {
      if (course.startDate > today) {
        items.push({
          id: `course-free-${course.id}`,
          title: course.name,
          body: 'Starts today.',
          dueAt: istToInstant(course.startDate, DEFAULT_CLASS_TIME),
          url: null,
        });
      }
      continue;
    }

    if (course.startDate > today) {
      items.push({
        id: `course-start-${course.id}`,
        title: label,
        body: 'First class today.',
        dueAt: istToInstant(course.startDate, slotStart(course)),
        url: course.outlineUrl ?? null,
      });
    }

    if (course.endDate > today) {
      items.push({
        id: `course-end-${course.id}`,
        title: label,
        body: 'Last class today.',
        dueAt: istToInstant(course.endDate, slotStart(course)),
        url: course.outlineUrl ?? null,
      });
    }
  }

  return items.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
