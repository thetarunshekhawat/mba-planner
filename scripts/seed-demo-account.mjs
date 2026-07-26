// Creates (or refreshes) the read-only demo account used by faculty
// reviewing the project.
//
//   node scripts/seed-demo-account.mjs            # dry run, prints the plan
//   node scripts/seed-demo-account.mjs --apply    # write it
//
// What it does:
//   1. Creates the auth user demo@mbaplanner.app with its email pre-confirmed,
//      so /api/demo-login can mint a session with no OTP round-trip.
//   2. Copies one real student's Term 4 selections and section assignments onto
//      it, so the schedule a reviewer opens is a plausible full plan rather
//      than an empty grid. Only the *choices* are copied. The demo profile
//      keeps its own name and no photo, so it does not present as that person.
//
// Run 015_demo_account.sql first: it whitelists the address, which the
// handle_new_user() trigger reads to name the profile. This script uses the
// service-role key, so the demo-deny policies from that migration do not
// block the seeding.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const DEMO_EMAIL = 'demo@mbaplanner.app';
const DEMO_NAME = 'Demo Reviewer';
// Whose plan to copy. Chosen because it is a full, realistic Term 4 selection.
const SOURCE_EMAIL = 'shivani.maheshwari2027@bitsom.edu.in';

const apply = process.argv.includes('--apply');

// .env.local is not loaded automatically outside Next.
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

// ── Read the source plan ────────────────────────────────────
const { data: source, error: srcErr } = await db
  .from('profiles')
  .select('id, name, specializations')
  .eq('email', SOURCE_EMAIL)
  .single();

if (srcErr || !source) {
  console.error(`Could not read source profile ${SOURCE_EMAIL}:`, srcErr?.message);
  process.exit(1);
}

const { data: srcSelections } = await db
  .from('course_selections')
  .select('course_id')
  .eq('user_id', source.id);

const { data: srcSections } = await db
  .from('course_sections')
  .select('course_id, section')
  .eq('user_id', source.id);

const courseIds = (srcSelections ?? []).map(r => r.course_id).sort((a, b) => a - b);
const sections = srcSections ?? [];

console.log(`Source plan: ${courseIds.length} courses, ${sections.length} section assignments`);
console.log(`  specializations: ${JSON.stringify(source.specializations)}`);
console.log(`  courses: ${courseIds.join(', ')}`);

if (!apply) {
  console.log('\nDry run. Re-run with --apply to create the demo account.');
  process.exit(0);
}

// ── Find or create the demo auth user ───────────────────────
let demoId = null;
const { data: existing } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
const found = existing?.users?.find(u => u.email?.toLowerCase() === DEMO_EMAIL);

if (found) {
  demoId = found.id;
  console.log(`Demo auth user already exists: ${demoId}`);
} else {
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email: DEMO_EMAIL,
    email_confirm: true, // no verification step for this account
  });
  if (createErr || !created?.user) {
    console.error('Could not create demo auth user:', createErr?.message);
    process.exit(1);
  }
  demoId = created.user.id;
  console.log(`Created demo auth user: ${demoId}`);
}

// ── Profile (the trigger may already have made it) ──────────
const { error: profErr } = await db
  .from('profiles')
  .upsert({
    id: demoId,
    email: DEMO_EMAIL,
    name: DEMO_NAME,
    specializations: source.specializations ?? [],
    avatar_url: null, // deliberately no photo of a real person
  }, { onConflict: 'id' });

if (profErr) {
  console.error('Profile upsert failed:', profErr.message);
  process.exit(1);
}
// Postgrest builders are thenables, not promises, so this needs await + a
// destructured error rather than .catch(). A missing code is not fatal.
const { error: codeErr } = await db.rpc('assign_friend_code', { p_id: demoId });
if (codeErr) console.warn(`  (friend code not assigned: ${codeErr.message})`);
console.log('Profile written.');

// ── Selections: replace wholesale so re-runs are idempotent ─
await db.from('course_selections').delete().eq('user_id', demoId);
if (courseIds.length) {
  const { error } = await db
    .from('course_selections')
    .insert(courseIds.map(course_id => ({ user_id: demoId, course_id })));
  if (error) { console.error('Selections insert failed:', error.message); process.exit(1); }
}
console.log(`Seeded ${courseIds.length} course selections.`);

// ── Section assignments ─────────────────────────────────────
await db.from('course_sections').delete().eq('user_id', demoId);
if (sections.length) {
  const { error } = await db
    .from('course_sections')
    .insert(sections.map(s => ({ user_id: demoId, course_id: s.course_id, section: s.section })));
  if (error) { console.error('Sections insert failed:', error.message); process.exit(1); }
}
console.log(`Seeded ${sections.length} section assignments.`);

console.log(`\nDone. Sign in at the login page with ${DEMO_EMAIL} — no code needed.`);
