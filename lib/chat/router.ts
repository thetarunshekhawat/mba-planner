// Deterministic intent router. Decides — without an LLM call — whether a message is:
//  - course_specific: it names a course, or a course chip was clicked, or only one
//    course is in scope.
//  - disambiguation: it's clearly about "a course" but didn't say which, and the
//    student has several selected → the widget shows tappable course buttons.
//  - general: a non-course question (answered with the model's world knowledge).
//
// Chips are always a manual fallback, so a mis-route still lets the user pick a course.

import { ALL_COURSES } from '@/data/courses';
import type { Course } from '@/types';

export type Intent =
  | { type: 'course_specific'; course: Course }
  | { type: 'general' }
  | { type: 'disambiguation'; courses: Course[] };

// Words that signal the student is asking about a course's logistics/content.
const COURSE_KEYWORDS = [
  'day', 'days', 'week', 'weeks', 'credit', 'credits', 'grade', 'grading', 'graded',
  'assessment', 'evaluation', 'exam', 'exams', 'session', 'sessions', 'syllabus',
  'outline', 'professor', 'faculty', 'instructor', 'teacher', 'workload', 'work load',
  'prerequisite', 'prereq', 'schedule', 'timing', 'timings', 'room', 'attendance',
  'project', 'quiz', 'quizzes', 'class', 'classes', 'duration', 'how long', 'cover',
  'covers', 'topic', 'topics', 'module', 'modules', 'learn', 'difficult', 'difficulty',
  'easy', 'hard', 'this course', 'my course', 'the course', 'about it', 'about this',
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Find courses explicitly named in the message, by code or by full name. */
function coursesNamedIn(message: string): Course[] {
  const norm = ` ${normalize(message)} `;
  const hits: Course[] = [];
  for (const c of ALL_COURSES) {
    const byCode = c.code ? norm.includes(` ${c.code.toLowerCase()} `) : false;
    const byName = norm.includes(normalize(c.name));
    if (byCode || byName) hits.push(c);
  }
  // De-dupe by id (a course can match on both code and name).
  return Array.from(new Map(hits.map((c) => [c.id, c])).values());
}

function looksCourseShaped(message: string): boolean {
  const norm = normalize(message);
  return COURSE_KEYWORDS.some((kw) => norm.includes(kw));
}

export function classifyIntent(
  message: string,
  selectedCourses: Course[],
  explicitCourseCode?: string | null,
): Intent {
  // 1. A chip was clicked (or caller pinned a course) → answer about it.
  if (explicitCourseCode) {
    const course = ALL_COURSES.find((c) => c.code === explicitCourseCode);
    if (course) return { type: 'course_specific', course };
  }

  // 2. The message names a course directly. Exactly one → answer it.
  const named = coursesNamedIn(message);
  if (named.length === 1) return { type: 'course_specific', course: named[0] };
  // (2+ named, e.g. "compare ML and PM" → fall through to general so the model
  //  can use the brief context of all selected courses.)

  // 3. Course-shaped question with no course named.
  if (named.length === 0 && looksCourseShaped(message)) {
    if (selectedCourses.length === 1) {
      return { type: 'course_specific', course: selectedCourses[0] };
    }
    if (selectedCourses.length > 1) {
      return { type: 'disambiguation', courses: selectedCourses };
    }
    // 0 selected → still disambiguation; the route returns a "pick/name a course"
    // message with an empty course list.
    return { type: 'disambiguation', courses: [] };
  }

  // 4. Everything else → general world-knowledge question.
  return { type: 'general' };
}
