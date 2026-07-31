// Deterministic, zero-LLM nudge generator. Used as a graceful fallback when the
// /api/chat/nudges endpoint returns nothing (model down, not configured, parse fail),
// so the proactive bubble always has something personalized to say. Pure functions
// over the student's own course data — safe to run on the client.

import type { Course, SpecId } from '@/types';
import { SPECS } from '@/data/courses';
import { isCourseCompleted, type TermId } from '@/lib/terms';

export interface Nudge {
  /** "fact" = self-sufficient insight; "question" = curiosity hook to open the chat. */
  type: 'fact' | 'question';
  /** The bubble text (<= ~16 words). */
  text: string;
  /** Course code this nudge is about, if any. */
  courseCode: string | null;
  /** What to drop into the chat input when the student taps through. */
  seedQuestion: string;
  /** Set when the nudge is about what comes AFTER its course ends (e.g. the Term 5 sequel), so
   *  it stays relevant past the last class. Everything else is suppressed once the course is
   *  over — see the gate in hooks/useChatNudges. */
  staysAfterEnd?: boolean;
}

const HEAVY: ReadonlySet<string> = new Set(['Moderate-High', 'Moderate - High', 'High', 'Heavy']);

function specLabel(id: SpecId): string {
  return SPECS.find((s) => s.id === id)?.label ?? id;
}

/** Pulls a grading-weight phrase out of the free-text review notes when one exists,
 *  e.g. "...Peer Review (10%)" → "10% is peer review". Returns null if none found. */
function gradingNudge(c: Course): Nudge | null {
  const notes = c.review?.highlights ?? [];
  for (const note of notes) {
    // Match "<label> (NN%)" pairs inside grading-style strings.
    const m = note.match(/([A-Za-z][A-Za-z &/-]*?)\s*\((\d{1,3})%\)/);
    if (m) {
      const label = m[1].trim().replace(/\bCP\b/i, 'class participation');
      const pct = m[2];
      return {
        type: 'fact',
        text: `Heads up — ${c.name} grades ${pct}% on ${label.toLowerCase()}.`,
        courseCode: c.code ?? null,
        seedQuestion: `How is ${c.code ?? c.name} graded?`,
      };
    }
  }
  return null;
}

/**
 * Build a small, varied pool of personalized nudges from the student's selected courses.
 * Ordering roughly reflects usefulness; the scheduler shuffles/de-dupes from here.
 */
export function fallbackNudges(allCourses: Course[], specs: SpecId[], currentTerm: TermId): Nudge[] {
  const out: Nudge[] = [];
  // Courses whose last class has passed are dropped up front: grading, workload and
  // "want the inside scoop" nudges are all prep advice, useless once the course is over.
  const courses = allCourses.filter((c) => !isCourseCompleted(c));
  if (courses.length === 0) return out;

  // 1. Grading heads-up (only where the data actually carries a weight).
  for (const c of courses) {
    const g = gradingNudge(c);
    if (g) out.push(g);
  }

  // 2. Workload watch — flag a heavy course so they can plan around it.
  const heavy = courses.find((c) => c.review && HEAVY.has(c.review.workload));
  if (heavy) {
    out.push({
      type: 'fact',
      text: `${heavy.name} is a heavy one — worth front-loading your prep.`,
      courseCode: heavy.code ?? null,
      seedQuestion: `What's the workload like for ${heavy.code ?? heavy.name}?`,
    });
  }

  // 3. Spec progress — how their picks ladder up to a specialization.
  if (specs.length) {
    const spec = specs[0];
    // Counts every pick, finished ones included — it's a tally of their choices, not prep advice.
    const count = allCourses.filter((c) => c.specs.includes(spec)).length;
    if (count > 0) {
      out.push({
        type: 'fact',
        text: `${count} of your picks count toward ${specLabel(spec)}.`,
        courseCode: null,
        seedQuestion: `Which of my courses count toward ${specLabel(spec)}?`,
      });
    }
  }

  // 4. Pairing — two courses sharing a specialization make a natural combo.
  for (let i = 0; i < courses.length && out.length < 8; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const shared = courses[i].specs.find((s) => courses[j].specs.includes(s));
      if (shared) {
        out.push({
          type: 'question',
          text: `${courses[i].name} and ${courses[j].name} pair well — want to know why?`,
          courseCode: null,
          seedQuestion: `How do ${courses[i].name} and ${courses[j].name} complement each other?`,
        });
        i = courses.length; // break outer too
        break;
      }
    }
  }

  // 5. Curiosity hooks — one per remaining course, so there's always variety.
  for (const c of courses) {
    out.push({
      type: 'question',
      text: `Want the inside scoop on ${c.name}?`,
      courseCode: c.code ?? null,
      seedQuestion: `Tell me about ${c.code ?? c.name}`,
    });
  }

  return out;
}
