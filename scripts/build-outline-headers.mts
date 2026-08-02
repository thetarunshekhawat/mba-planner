// Emits the authoritative Term 5 header for each course outline as JSON.
//
// The outline PDFs the school circulates are last year's documents — their own headers say
// things like "Term 4, Block 19, 2025-26" and quote dates from the previous cohort. The
// chatbot answers from this text, so each stored outline is prefixed with a header built
// from data/courses.ts (which is authoritative for Term 5 scheduling).
//
// Run: npx tsx scripts/build-outline-headers.mts
import { ALL_COURSES } from '../data/courses';

const out: Record<string, string> = {};

for (const c of ALL_COURSES.filter((c) => c.term === 5 && c.code && c.outlineUrl)) {
  const slots = (c.timings ?? [])
    .map((t) => `${t.part ? `Section ${t.part}: ` : ''}${t.slot} in ${t.room}`)
    .join('; ');

  const lines = [
    `BITSoM — Term 5, AY 2026-27`,
    `Course: ${c.name} (${c.code})`,
    `Faculty: ${c.faculty}`,
    c.block ? `Block ${c.block} — ${c.dates}, 2026 (${c.startDate} to ${c.endDate})` : `Runs ${c.dates}, 2026`,
    slots ? `Class timings: ${slots}` : null,
    c.seats ? `Seats: ${c.seats}` : null,
    c.specs.length ? `Counts towards: ${c.specs.join(', ')}` : null,
    c.mandatoryFor?.length ? `Mandatory for the ${c.mandatoryFor.join('/')} specialization.` : null,
    ``,
    `NOTE: the course outline below is the document circulated by the school. Its own header,`,
    `dates and session numbering may be carried over from a previous cohort — the Term 5`,
    `schedule stated above is authoritative. Use the outline for content, syllabus, grading`,
    `and policy; use the header above for when and where the course actually runs.`,
    ``,
    `--- COURSE OUTLINE AS CIRCULATED ---`,
    ``,
  ].filter((l) => l !== null);

  out[c.code!.toLowerCase()] = lines.join('\n');
}

console.log(JSON.stringify(out, null, 2));
