// Smoke-tests the per-term insight engines against realistic selections.
// Run: npx tsx scripts/verify-insights.mts
import { ALL_COURSES } from '../data/courses';
import { selectInsightNudges } from '../lib/chat/insightEngine';

function pick(codes: string[]) {
  return ALL_COURSES.filter((c) => c.code && codes.includes(c.code));
}

const CASES: { label: string; codes: string[] }[] = [
  { label: 'Term 5 — OPS track (block clash + heavy pairing)', codes: ['OPST', 'TOPS', 'SVOP', 'MGAQ'] },
  { label: 'Term 5 — FIN track (valuation → M&A sequence)', codes: ['VALU', 'MGAQ', 'ENFF'] },
  { label: 'Term 5 — both staggered courses', codes: ['CIVB', 'FDEM', 'AIIP'] },
  { label: 'Term 5 — morning clash pair', codes: ['ENFF', 'SBRM'] },
  { label: 'Term 5 — Block 26 mirror-section clash', codes: ['INMK', 'SVOP'] },
  { label: 'Cross-term — Term 4 + Term 5 together', codes: ['FSAT', 'BECB', 'OPST', 'VALU'] },
];

for (const { label, codes } of CASES) {
  const courses = pick(codes);
  const nudges = selectInsightNudges(courses);
  console.log(`\n=== ${label}`);
  console.log(`    picked ${courses.length} rows (${codes.join(', ')}) → ${nudges.length} nudges`);
  for (const n of nudges.slice(0, 4)) {
    console.log(`    • [${n.courseCode ?? '—'}] ${n.text.slice(0, 118)}${n.text.length > 118 ? '…' : ''}`);
  }
}

// Every insight must be reachable: no condition may reference a code the catalogue lacks.
const engine = JSON.parse(
  await import('node:fs').then((fs) => fs.promises.readFile('data/term5Insights.json', 'utf8')),
) as { insights: { id: string; cond: unknown }[]; course_meta: Record<string, unknown> };

const known = new Set(Object.keys(engine.course_meta));
const bad: string[] = [];
function walk(node: Record<string, unknown>, id: string) {
  if (node.op === 'selected' && !known.has(node.code as string)) bad.push(`${id}: ${node.code}`);
  if (Array.isArray(node.args)) for (const a of node.args) walk(a as Record<string, unknown>, id);
  if (node.arg) walk(node.arg as Record<string, unknown>, id);
}
for (const r of engine.insights) walk(r.cond as Record<string, unknown>, r.id);
console.log(`\nUnknown course codes in conditions: ${bad.length ? bad.join(', ') : 'none'}`);
console.log(`Total Term 5 insights: ${engine.insights.length}`);
