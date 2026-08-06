// Propose assignment deadlines from the course outlines — offline, for review.
//
//   npx tsx scripts/extract-course-deadlines.mts              every course
//   npx tsx scripts/extract-course-deadlines.mts --code SCAT  one course
//   npx tsx scripts/extract-course-deadlines.mts --limit 3    first N courses
//
// Writes data/courseDeadlineCandidates.json. That file is committed and
// reviewed **in a diff by a human**, and only then does migration 020 seed the
// survivors into `course_deadlines`.
//
// ── Why this is a script and not a feature ─────────────────────────────────
// The runtime never calls a model for this. `course_outlines.content` is prose;
// a model asked to read a due date out of it will eventually invent one, and
// the output of this pipeline goes to a hundred lock screens. An invented
// deadline is worse than a missing one, because a student will act on it.
//
// So the model only ever *proposes*. Everything that decides what survives is
// deterministic code below:
//
//   1. The quote must appear VERBATIM in the outline. Not fuzzy-matched — an
//      exact substring after whitespace normalisation. This is the check that
//      makes a fabricated date impossible to commit, because a model that
//      invents a deadline has to invent the sentence it came from too, and that
//      sentence will not be in the document.
//   2. The date must fall inside the course's own window ±14 days. A date
//      outside it is either a misread year or a different course's deadline.
//   3. The course code must exist in data/courses.ts.
//
// A proposal failing any of these is dropped and counted, not repaired.

import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { complete } from '../lib/chat/nemotron';
import { ALL_COURSES } from '../data/courses';

const OUT = 'data/courseDeadlineCandidates.json';
const WINDOW_DAYS = 14;

interface Candidate {
  course_code: string;
  term: number | null;
  title: string;
  kind: string;
  due_date: string;
  due_time: string | null;
  weight_pct: number | null;
  source_doc: string | null;
  source_section: string;
  confidence: 'high' | 'medium' | 'low';
}

const env: Record<string, string> = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#')) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
for (const [k, v] of Object.entries(env)) process.env[k] ??= v;

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Collapse whitespace so a quote that differs only in wrapping still matches. */
const normalise = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

const PROMPT = `You extract assessment deadlines from a university course outline.

Return ONLY a JSON array. No prose, no markdown fence. Each element:
{
  "title": "what is due, in the outline's own words",
  "kind": "assignment|submission|presentation|quiz|exam|project|other",
  "due_date": "YYYY-MM-DD",
  "due_time": "HH:MM" or null,
  "weight_pct": number or null,
  "source_section": "the EXACT sentence from the outline stating this deadline, copied verbatim",
  "confidence": "high|medium|low"
}

Rules:
- source_section MUST be copied character-for-character from the outline. It is
  checked automatically against the document; a paraphrase is discarded.
- Only include items with an EXPLICIT calendar date in the outline. If the
  outline says "week 3" or "TBA" with no date, omit it entirely.
- Never infer, calculate, or guess a date. Omitting is always correct when unsure.
- Return [] if the outline states no dated deadlines.`;

function stripFence(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

async function main() {
  const args = process.argv.slice(2);
  const onlyCode = args.includes('--code') ? args[args.indexOf('--code') + 1] : null;
  const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;

  const { data: outlines } = await db.from('course_outlines').select('code, term, content');
  if (!outlines?.length) {
    console.error('No course_outlines rows found.');
    process.exit(1);
  }

  let targets = outlines.filter((o) => typeof o.content === 'string' && o.content.length > 200);
  if (onlyCode) targets = targets.filter((o) => o.code.toUpperCase() === onlyCode.toUpperCase());
  targets = targets.slice(0, limit);

  const accepted: Candidate[] = [];
  const rejected: { code: string; reason: string; detail: string }[] = [];

  for (const outline of targets) {
    const course = ALL_COURSES.find((c) => c.code === outline.code);
    if (!course) {
      rejected.push({ code: outline.code, reason: 'unknown_course_code', detail: 'not in data/courses.ts' });
      continue;
    }

    process.stdout.write(`${outline.code}… `);

    let raw: string;
    try {
      raw = await complete(
        [
          { role: 'system', content: PROMPT },
          { role: 'user', content: `Course: ${course.name} (${outline.code})\nTerm ${outline.term}\nRuns ${course.startDate} to ${course.endDate}\n\nOUTLINE:\n${outline.content.slice(0, 24000)}` },
        ],
        { temperature: 0 },
      );
    } catch (e) {
      rejected.push({ code: outline.code, reason: 'model_error', detail: (e as Error).message });
      console.log('model error');
      continue;
    }

    let proposals: Partial<Candidate>[];
    try {
      proposals = JSON.parse(stripFence(raw));
      if (!Array.isArray(proposals)) throw new Error('not an array');
    } catch {
      rejected.push({ code: outline.code, reason: 'unparseable', detail: raw.slice(0, 200) });
      console.log('unparseable');
      continue;
    }

    const haystack = normalise(outline.content);
    const lo = new Date(new Date(course.startDate).getTime() - WINDOW_DAYS * 864e5);
    const hi = new Date(new Date(course.endDate).getTime() + WINDOW_DAYS * 864e5);
    let kept = 0;

    for (const p of proposals) {
      if (!p.title || !p.due_date || !p.source_section) {
        rejected.push({ code: outline.code, reason: 'incomplete', detail: JSON.stringify(p).slice(0, 160) });
        continue;
      }

      // (1) The quote must actually be in the document.
      if (!haystack.includes(normalise(p.source_section))) {
        rejected.push({ code: outline.code, reason: 'quote_not_in_outline', detail: p.source_section.slice(0, 160) });
        continue;
      }

      // (2) The date must be inside the course's own window.
      const due = new Date(p.due_date);
      if (Number.isNaN(due.getTime()) || due < lo || due > hi) {
        rejected.push({ code: outline.code, reason: 'date_outside_course_window', detail: `${p.due_date} vs ${course.startDate}..${course.endDate}` });
        continue;
      }

      accepted.push({
        course_code: outline.code,
        term: outline.term ?? course.term,
        title: p.title,
        kind: p.kind ?? 'assignment',
        due_date: p.due_date,
        due_time: p.due_time ?? null,
        weight_pct: typeof p.weight_pct === 'number' ? p.weight_pct : null,
        source_doc: `course_outlines/${outline.code}`,
        source_section: p.source_section,
        confidence: (p.confidence as Candidate['confidence']) ?? 'low',
      });
      kept++;
    }
    console.log(`${kept}/${proposals.length} kept`);
  }

  accepted.sort((a, b) => a.due_date.localeCompare(b.due_date) || a.course_code.localeCompare(b.course_code));
  writeFileSync(OUT, JSON.stringify({ generated_at: new Date().toISOString(), accepted, rejected }, null, 2));

  console.log(`\n${accepted.length} candidates accepted, ${rejected.length} rejected → ${OUT}`);
  const byReason = rejected.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {});
  for (const [reason, n] of Object.entries(byReason)) console.log(`  ${reason}: ${n}`);
  console.log('\nNext: read the diff. Every accepted row must have a source_section you can');
  console.log('find in the real outline. Then write migration 020 to seed the survivors.');
}

await main();
