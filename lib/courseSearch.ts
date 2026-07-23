import { ALL_COURSES } from '@/data/courses';
import type { Course } from '@/types';

/** Lowercase, strip punctuation, collapse whitespace. Mirrors lib/chat/router.ts. */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Every query token is a prefix of the name's word at the same position (anchored at start). */
export function consecutiveWordPrefix(nameWords: string[], qTokens: string[]): boolean {
  if (qTokens.length < 2 || qTokens.length > nameWords.length) return false;
  return qTokens.every((tok, i) => nameWords[i].startsWith(tok));
}

/** Boost applied to the student's own courses so they rank above the rest of the catalog. */
export const OWN_BOOST = 1000;

// Words that carry no signal in an acronym. "AI in Business: From Models to Agents"
// is spoken as AIBM(A), not AIIBFMTA.
const STOPWORDS = new Set([
  'for', 'and', 'of', 'in', 'the', 'to', 'a', 'an', 'from', 'with', 'on', 'at', 'by',
]);

/**
 * Acronym forms of a course name, for matching queries like "AIBM" or "MLM".
 *
 * A word that is already all-caps in the source (e.g. "AI") contributes its whole self,
 * since that's how people say it. Everything else contributes its first letter.
 * Returns two variants — stopwords dropped and stopwords kept — because students
 * abbreviate both ways ("MLM" = Machine Learning for Managers, "FSA" = Financial
 * Statement Analysis).
 */
export function acronymsOf(name: string): string[] {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length === 0) return [];

  const piece = (w: string) => (w.length > 1 && w === w.toUpperCase() ? w : w[0]);

  const withStops = words.map(piece).join('').toLowerCase();
  const significant = words.filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const noStops = significant.map(piece).join('').toLowerCase();

  return noStops && noStops !== withStops ? [noStops, withStops] : [withStops];
}

// The catalog is a static import, so acronyms only ever need computing once per course.
const acronymCache = new Map<number, string[]>();
function acronymsFor(c: Course): string[] {
  let a = acronymCache.get(c.id);
  if (!a) {
    a = acronymsOf(c.name);
    acronymCache.set(c.id, a);
  }
  return a;
}

/**
 * How well a course answers `q` (an already-normalized query). 0 means no match.
 * Higher tiers are more specific: an exact name prefix beats a loose word-prefix hit.
 */
function scoreCourse(c: Course, q: string, qTokens: string[]): number {
  const n = normalize(c.name);
  if (!n) return 0;

  const nameWords = n.split(' ');
  const code = c.code ? c.code.toLowerCase() : '';
  const lastToken = qTokens[qTokens.length - 1] ?? '';

  if (n.startsWith(q)) return 100;
  if (code && code.startsWith(q)) return 95;
  if (acronymsFor(c).some((a) => a.startsWith(q))) return 90;
  if (consecutiveWordPrefix(nameWords, qTokens)) return 80;
  if (n.includes(q)) return 60;
  if (c.faculty && normalize(c.faculty).includes(q)) return 50;
  if (lastToken.length >= 3 && nameWords.some((w) => w.startsWith(lastToken))) return 40;
  return 0;
}

/** True if the course matches the raw query at all. */
export function matchesQuery(c: Course, rawQuery: string): boolean {
  const q = normalize(rawQuery);
  if (!q) return false;
  return scoreCourse(c, q, q.split(' ').filter(Boolean)) > 0;
}

export interface SearchOptions {
  /** Courses to float to the top (typically the student's own selections). */
  boostIds?: Set<number>;
  limit?: number;
  /** Drop a course from the results — used by the chatbot to hide already-typed names. */
  exclude?: (c: Course, normalizedQuery: string) => boolean;
}

/**
 * Rank the catalog against a free-text query. Matches on course name (prefix,
 * word-prefix, substring), the official `code`, a derived acronym, and faculty name.
 */
export function searchCourses(rawQuery: string, opts: SearchOptions = {}): Course[] {
  const { boostIds, limit = 8, exclude } = opts;
  const q = normalize(rawQuery);
  if (!q) return [];

  const qTokens = q.split(' ').filter(Boolean);
  const scored: { course: Course; score: number }[] = [];

  for (const c of ALL_COURSES) {
    if (c.type === 'exam' || c.type === 'free') continue;
    if (exclude?.(c, q)) continue;
    let score = scoreCourse(c, q, qTokens);
    if (score === 0) continue;
    if (boostIds?.has(c.id)) score += OWN_BOOST;
    scored.push({ course: c, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.course.week !== b.course.week) return a.course.week - b.course.week;
    return a.course.name.localeCompare(b.course.name);
  });

  return scored.slice(0, limit).map((s) => s.course);
}
