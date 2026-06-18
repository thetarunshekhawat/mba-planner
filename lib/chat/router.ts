// Deterministic intent router. Decides — without an LLM call — whether a message is:
//  - course_specific: it names a course, or a course chip was clicked, or only one
//    course is in scope.
//  - disambiguation: it's clearly about "a course" but didn't say which, and the
//    student has several selected → the widget shows tappable course buttons.
//  - friend_compare: it's about the student's friends / overlap with them.
//  - export: it asks to export/download/subscribe to the schedule.
//  - recommend: it asks what to take / for suggestions (no specific course named).
//  - general: a non-course question (answered with the model's world knowledge).
//
// Chips are always a manual fallback, so a mis-route still lets the user pick a course.

import { ALL_COURSES } from '@/data/courses';
import type { Course } from '@/types';

export type Intent =
  | { type: 'course_specific'; course: Course }
  | { type: 'general' }
  | { type: 'disambiguation'; courses: Course[] }
  | { type: 'friend_compare' }
  | { type: 'export' }
  | { type: 'recommend' };

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

// Action verbs that mean "export my schedule" (not just any mention of "calendar").
const EXPORT_KEYWORDS = [
  'export', 'download', 'ics', 'subscribe', 'subscription', 'sync',
  'add to my calendar', 'add to calendar', 'to google calendar', 'to apple calendar',
  'save as pdf', 'save my schedule', 'get my schedule',
];

// Signals the student is asking about their friends / overlap (generic — a specific
// friend's name is matched separately against the live friend list).
const FRIEND_KEYWORDS = [
  'friend', 'friends', 'compare with', 'overlap', 'in common', 'common course',
  'same course', 'same courses', 'who else', 'mutual', 'classmate', 'classmates',
];

// "What should I take?" style prompts (only used when no course is named).
const RECOMMEND_KEYWORDS = [
  'recommend', 'recommendation', 'suggest', 'what should i take', 'what to take',
  'which elective', 'which course should', 'what else should', 'help me pick',
  'help me choose', 'good elective', 'best elective', 'fill my', 'options for my spec',
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** True if any friend's first name appears as a standalone word in the message. */
function mentionsFriendName(norm: string, friendNames: string[]): boolean {
  const padded = ` ${norm} `;
  for (const full of friendNames) {
    const first = normalize(full).split(' ')[0];
    if (first && first.length >= 3 && padded.includes(` ${first} `)) return true;
  }
  return false;
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
  friendNames: string[] = [],
): Intent {
  // 1. A chip was clicked (or caller pinned a course) → answer about it.
  if (explicitCourseCode) {
    const course = ALL_COURSES.find((c) => c.code === explicitCourseCode);
    if (course) return { type: 'course_specific', course };
  }

  const norm = normalize(message);
  const named = coursesNamedIn(message);

  // 2. A specific friend is named ("is Varad taking FSA?") → friend comparison wins,
  //    even over a course mention, because the question is fundamentally about them.
  if (mentionsFriendName(norm, friendNames)) return { type: 'friend_compare' };

  // 3. Export the schedule (explicit export/download/subscribe verbs). A single named
  //    course means a course question, not an export ("what's the schedule for FSA").
  if (EXPORT_KEYWORDS.some((kw) => norm.includes(kw)) && named.length !== 1) {
    return { type: 'export' };
  }

  // 4. The message names a course directly. Exactly one → answer it.
  if (named.length === 1) return { type: 'course_specific', course: named[0] };
  // (2+ named, e.g. "compare ML and PM" → a course-vs-course comparison; fall through.)

  // 5. Generic friend talk ("how do I compare with my friends?"). Skip when 2+ courses
  //    are named so "compare ML and PM" stays a course comparison, not a friend one.
  if (FRIEND_KEYWORDS.some((kw) => norm.includes(kw)) && named.length < 2) {
    return { type: 'friend_compare' };
  }

  // 6. "What should I take?" with no specific course in view → spec-fit suggestions.
  if (named.length === 0 && RECOMMEND_KEYWORDS.some((kw) => norm.includes(kw))) {
    return { type: 'recommend' };
  }

  // 7. Course-shaped question with no course named.
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
