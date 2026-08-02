// Validates the Metrics panel's distribution maths against known inputs, and cross-checks a
// few headline figures against the live database.
// Run: npx tsx scripts/verify-metrics.mts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// ── describe() — same implementation as components/admin/AdminDashboard.tsx ──
function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function describe(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) return { n: 0, mean: 0, median: 0, q1: 0, q3: 0, iqr: 0, p90: 0, min: 0, max: 0 };
  const q1 = quantile(s, 0.25);
  const q3 = quantile(s, 0.75);
  return {
    n: s.length, mean: s.reduce((a, b) => a + b, 0) / s.length, median: quantile(s, 0.5),
    q1, q3, iqr: q3 - q1, p90: quantile(s, 0.9), min: s[0], max: s[s.length - 1],
  };
}

let failures = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
}

// ── 1. Known-answer tests for the distribution maths ──
console.log('— distribution maths —');
const d = describe([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
check('median of 1..10 = 5.5', d.median, 5.5);
check('Q1 of 1..10 = 3.25', d.q1, 3.25);
check('Q3 of 1..10 = 7.75', d.q3, 7.75);
check('IQR of 1..10 = 4.5', d.iqr, 4.5);
check('mean of 1..10 = 5.5', d.mean, 5.5);
check('p90 of 1..10 = 9.1', Math.round(d.p90 * 10) / 10, 9.1);
check('empty input is safe', describe([]).n, 0);
check('single value', describe([42]).median, 42);

// A skewed set: mean should exceed median, which is the whole point of showing both.
const skew = describe([1, 1, 1, 1, 1, 1, 1, 1, 1, 100]);
check('skewed: median stays 1', skew.median, 1);
check('skewed: mean is pulled to 10.9', Math.round(skew.mean * 10) / 10, 10.9);

// ── 2. Cross-check headline figures against the live database ──
const env: Record<string, string> = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#')) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function countOf(table: string): Promise<number> {
  const { count } = await db.from(table).select('*', { count: 'exact', head: true });
  return count ?? 0;
}

// The same paging the dashboard now does.
async function fetchAll<T>(table: string, select: string, order: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from(table).select(select).order(order).range(from, from + 999);
    if (!data?.length) break;
    out.push(...(data as T[]));
    if (data.length < 1000) break;
  }
  return out;
}

console.log('\n— live data —');
const [profiles, whitelist, selections, events] = await Promise.all([
  countOf('profiles'), countOf('cohort_whitelist'), countOf('course_selections'), countOf('user_events'),
]);
console.log(`  profiles=${profiles}  whitelist=${whitelist}  selections=${selections}  events=${events}`);
console.log(`  activation = ${((profiles / whitelist) * 100).toFixed(1)}%`);

const pagedEvents = await fetchAll<{ user_id: string }>('user_events', 'user_id', 'occurred_at');
check(`paged fetch returns all ${events} events (not 1000)`, pagedEvents.length, events);

const perUser = new Map<string, number>();
for (const e of pagedEvents) perUser.set(e.user_id, (perUser.get(e.user_id) ?? 0) + 1);
const de = describe([...perUser.values()]);
console.log(`  events/user: n=${de.n} mean=${de.mean.toFixed(1)} median=${de.median} IQR=${de.iqr} p90=${de.p90} max=${de.max}`);

const counts = [...perUser.values()].sort((a, b) => b - a);
const topDecile = Math.max(1, Math.ceil(counts.length * 0.1));
const share = (counts.slice(0, topDecile).reduce((a, b) => a + b, 0) / events) * 100;
console.log(`  top-decile share of activity = ${share.toFixed(1)}% (busiest ${topDecile} of ${counts.length} users)`);

// Term split of selections, resolved through the catalogue like the dashboard does.
const { ALL_COURSES } = await import('../data/courses');
const termOf = new Map(ALL_COURSES.map(c => [c.id, c.term]));
const sel = await fetchAll<{ course_id: number }>('course_selections', 'course_id', 'id');
const byTerm = new Map<string, number>();
for (const s of sel) {
  const k = String(termOf.get(s.course_id) ?? 'orphaned');
  byTerm.set(k, (byTerm.get(k) ?? 0) + 1);
}
console.log(`  selections by term: ${[...byTerm].sort().map(([k, v]) => `T${k}=${v}`).join('  ')}`);
check('term split sums to total selections', [...byTerm.values()].reduce((a, b) => a + b, 0), selections);

console.log(failures === 0 ? '\nAll metrics checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
