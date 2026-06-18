import { ALL_COURSES } from '@/data/courses';
import type { Course } from '@/types';

/** Lowercase, strip punctuation, collapse whitespace. Mirrors lib/chat/router.ts. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

const MIN_QUERY = 2;
const OWN_BOOST = 1000;

/** Every query token is a prefix of the name's word at the same position (anchored at start). */
function consecutiveWordPrefix(nameWords: string[], qTokens: string[]): boolean {
  if (qTokens.length < 2 || qTokens.length > nameWords.length) return false;
  return qTokens.every((tok, i) => nameWords[i].startsWith(tok));
}

/**
 * Rank catalog courses against the text the user is typing.
 * - Drawn from the full catalog (ALL_COURSES); the student's own term courses
 *   (ids in `myIds`) are floated to the top.
 * - Returns [] for very short/empty queries, and skips any course whose full name
 *   is already present in the input — so the bubble disappears after a pick and the
 *   user can keep typing.
 */
export function suggestCourses(rawQuery: string, myIds: Set<number>, limit = 5): Course[] {
  const q = normalize(rawQuery);
  if (q.length < MIN_QUERY) return [];

  const qTokens = q.split(' ').filter(Boolean);
  const lastToken = qTokens[qTokens.length - 1] ?? '';

  const scored: { course: Course; score: number }[] = [];

  for (const c of ALL_COURSES) {
    const n = normalize(c.name);
    if (!n) continue;
    // Full name already typed/picked — don't re-suggest it.
    if (q.includes(n)) continue;

    const nameWords = n.split(' ');
    const code = c.code ? c.code.toLowerCase() : '';

    let score = 0;
    if (n.startsWith(q)) score = 100;
    else if (code && code.startsWith(q)) score = 90;
    else if (consecutiveWordPrefix(nameWords, qTokens)) score = 80;
    else if (n.includes(q)) score = 60;
    else if (lastToken.length >= 3 && nameWords.some((w) => w.startsWith(lastToken))) score = 40;

    if (score > 0) {
      if (myIds.has(c.id)) score += OWN_BOOST;
      scored.push({ course: c, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.course.week !== b.course.week) return a.course.week - b.course.week;
    return a.course.name.localeCompare(b.course.name);
  });

  return scored.slice(0, limit).map((s) => s.course);
}

/**
 * Insert a picked course name like an autocomplete: replace ONLY the trailing
 * partial-name fragment the user was typing and keep everything before it.
 * e.g. applyCourseCompletion('when will prod', 'Product Management')
 *        → 'when will Product Management '
 * Picks the largest run of trailing input words that prefix the start of the
 * course name; falls back to replacing just the last word.
 */
export function applyCourseCompletion(value: string, courseName: string): string {
  // Finished a word (trailing space) or empty box → append, don't replace.
  if (value === '' || /\s$/.test(value)) return `${value}${courseName} `;

  const vWords = value.split(/\s+/).filter(Boolean);
  if (vWords.length === 0) return `${courseName} `;
  const nWords = courseName.split(/\s+/);

  let k = 0;
  const maxK = Math.min(vWords.length, nWords.length);
  for (let cand = 1; cand <= maxK; cand++) {
    let ok = true;
    for (let j = 0; j < cand; j++) {
      const vw = vWords[vWords.length - cand + j].toLowerCase();
      if (!nWords[j].toLowerCase().startsWith(vw)) {
        ok = false;
        break;
      }
    }
    if (ok) k = cand;
  }
  if (k === 0) k = 1; // fragment didn't align to the name start → swap the last word

  const keep = vWords.slice(0, vWords.length - k).join(' ');
  return keep ? `${keep} ${courseName} ` : `${courseName} `;
}
