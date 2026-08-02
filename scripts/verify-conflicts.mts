// Checks that Term 5's overlapping course pairs resolve as section advisories rather than
// hard conflicts. Run: npx tsx scripts/verify-conflicts.mts
import { ALL_COURSES } from '../data/courses';
import { getSectionAdvisories } from '../lib/conflicts';

function idsFor(codes: string[]) {
  return new Set(ALL_COURSES.filter(c => c.code && codes.includes(c.code)).map(c => c.id));
}

const CASES: { label: string; codes: string[]; expectAdvisoryOn: string[] }[] = [
  { label: 'OPST + VALU (Block 22 mornings)', codes: ['OPST', 'VALU'], expectAdvisoryOn: ['OPST'] },
  { label: 'ENFF + SBRM (Block 25 mornings)', codes: ['ENFF', 'SBRM'], expectAdvisoryOn: ['SBRM'] },
  // INMK and SVOP have identical A and B slots, so switching either to Section B still
  // collides. The advisory only fires when moving to B actually resolves the overlap, so
  // silence is correct here — the pair only works if the registrar assigns opposite
  // sections, which the app cannot promise. The Term 5 insight for this pair says exactly that.
  { label: 'INMK + SVOP (mirrored, unresolvable)', codes: ['INMK', 'SVOP'], expectAdvisoryOn: [] },
  { label: 'TOPS + CLAW (should be clean)', codes: ['TOPS', 'CLAW'], expectAdvisoryOn: [] },
  { label: 'MGAQ + SVOP (evening vs day)', codes: ['MGAQ', 'SVOP'], expectAdvisoryOn: [] },
];

let failures = 0;

for (const { label, codes, expectAdvisoryOn } of CASES) {
  const ids = idsFor(codes);
  const advisories = getSectionAdvisories(ALL_COURSES, ids);
  const got = [...advisories.keys()]
    .map(id => ALL_COURSES.find(c => c.id === id)?.code ?? String(id))
    .sort();
  const want = [...expectAdvisoryOn].sort();
  const ok = got.join(',') === want.join(',');
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(36)} advisories on [${got.join(', ') || '—'}]`);
  for (const a of advisories.values()) console.log(`       ${a.message}`);
}

// No Term 5 row may carry a conflictGroup — real overlaps are handled by advisories, and a
// stray group would raise a false "cannot be taken together" banner.
const stray = ALL_COURSES.filter(c => c.term === 5 && c.conflictGroup);
if (stray.length) {
  failures++;
  console.log(`\nFAIL stray conflictGroup on: ${stray.map(c => `${c.code}=${c.conflictGroup}`).join(', ')}`);
} else {
  console.log('\nOK   no Term 5 conflictGroup values (overlaps resolve via section advisories)');
}

console.log(failures === 0 ? '\nAll conflict cases behave as expected.' : `\n${failures} case(s) failed.`);
