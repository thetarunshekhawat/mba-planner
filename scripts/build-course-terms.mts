/**
 * Regenerate the course_terms seed in supabase/migrations/023_impact_snapshots.sql.
 *
 * course_selections stores only course_id. Term lives in data/courses.ts and is
 * resolved at runtime, which is right for the app and useless to a database
 * function — so the impact snapshot needs the mapping mirrored into SQL.
 *
 * Run this after adding a term to the catalogue, then re-apply the migration.
 * Without it, every "students who planned Term N" figure silently omits the new
 * courses: no error, just a number that is quietly too low.
 *
 *   bun scripts/build-course-terms.mts          # print the INSERT block
 *   bun scripts/build-course-terms.mts --check  # exit 1 if the migration is stale
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_COURSES } from '../data/courses';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATION = join(HERE, '..', 'supabase', 'migrations', '023_impact_snapshots.sql');

function seedBlock(): string {
  const pairs = ALL_COURSES.map(c => `(${c.id},${c.term})`);
  const lines: string[] = [];
  for (let i = 0; i < pairs.length; i += 10) {
    lines.push('  ' + pairs.slice(i, i + 10).join(','));
  }
  return 'INSERT INTO course_terms (course_id, term) VALUES\n' + lines.join(',\n') + ';';
}

const block = seedBlock();

if (process.argv.includes('--check')) {
  const sql = readFileSync(MIGRATION, 'utf8');
  const inMigration = sql.match(/INSERT INTO course_terms \(course_id, term\) VALUES[\s\S]*?;/)?.[0];
  const normalise = (s: string) => s.replace(/\s+/g, '');
  if (!inMigration || normalise(inMigration) !== normalise(block)) {
    console.error('STALE: 023_impact_snapshots.sql does not match data/courses.ts.');
    console.error('Replace the INSERT INTO course_terms block with:\n');
    console.error(block);
    process.exit(1);
  }
  console.log(`OK: course_terms covers all ${ALL_COURSES.length} courses.`);
} else {
  console.log(block);
}
