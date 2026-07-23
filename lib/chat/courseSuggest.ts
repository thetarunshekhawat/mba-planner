import type { Course } from '@/types';
import { normalize, searchCourses } from '@/lib/courseSearch';

const MIN_QUERY = 2;

/**
 * Rank catalog courses against the text the user is typing.
 * - Ranking lives in `lib/courseSearch.ts`, shared with the planner's search control;
 *   the student's own term courses (ids in `myIds`) are floated to the top.
 * - Returns [] for very short/empty queries, and skips any course whose full name
 *   is already present in the input — so the bubble disappears after a pick and the
 *   user can keep typing.
 */
export function suggestCourses(rawQuery: string, myIds: Set<number>, limit = 5): Course[] {
  if (normalize(rawQuery).length < MIN_QUERY) return [];

  return searchCourses(rawQuery, {
    boostIds: myIds,
    limit,
    // Full name already typed/picked — don't re-suggest it.
    exclude: (c, q) => {
      const n = normalize(c.name);
      return !n || q.includes(n);
    },
  });
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
