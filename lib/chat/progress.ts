// Specialization-fit options for the chatbot's "what should I take?" answers.
//
// Honest scope: the planner has NO per-spec completion requirement encoded (no "you
// need N electives for Finance"). So this deliberately produces "electives that count
// toward your specialization which you haven't picked yet" — options to consider, not a
// requirement count. The block text says so, and the system prompt reinforces it, so the
// model never claims a student "needs" a certain number of courses.

import { ALL_COURSES, SPECS } from '@/data/courses';
import type { SpecId } from '@/types';

const MAX_PER_SPEC = 6;

/** Returns null when there's nothing useful to suggest (no specs, or all eligible
 *  electives already selected). */
export function buildSpecProgress(
  specs: SpecId[],
  selectedIds: Set<number>,
): string | null {
  if (specs.length === 0) return null;

  const lines: string[] = [
    "SPECIALIZATION OPTIONS (electives that count toward the student's specialization(s) and are NOT yet selected — present these as options to consider, NOT as a number they still \"need\"; the planner does not track completion requirements):",
  ];

  let any = false;
  for (const spec of specs) {
    const label = SPECS.find((s) => s.id === spec)?.label ?? spec;
    const options = ALL_COURSES.filter(
      (c) => c.type === 'elective' && c.specs.includes(spec) && !selectedIds.has(c.id),
    ).sort(
      (a, b) => (b.review?.careerRelevance ?? 0) - (a.review?.careerRelevance ?? 0),
    );
    if (options.length === 0) continue;
    any = true;

    lines.push(`${label}:`);
    for (const c of options.slice(0, MAX_PER_SPEC)) {
      const r = c.review;
      const facts = [
        `Term ${c.term}`,
        r ? `workload ${r.workload}` : null,
        r ? `career relevance ${r.careerRelevance}/5` : null,
      ]
        .filter(Boolean)
        .join(', ');
      lines.push(`  - ${c.name}${c.code ? ` (${c.code})` : ''} — ${facts}`);
    }
  }

  return any ? lines.join('\n') : null;
}
