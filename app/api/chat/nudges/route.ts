// Generates a small POOL of proactive "nudge" notifications in one shot. The client
// fetches this once per session (cached by selection signature) and rotates through the
// pool with no further model calls — so nudges never touch the /api/chat rate limit.
// Grounded strictly in the student's selected-course facts; on any failure we return an
// empty pool and the client falls back to deterministic templates (lib/chat/nudgeFallback).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ALL_COURSES } from '@/data/courses';
import { getCurrentTerm, getTermCourses } from '@/lib/terms';
import { buildNudgeMessages } from '@/lib/chat/prompt';
import { complete, isConfigured } from '@/lib/chat/nemotron';
import type { Nudge } from '@/lib/chat/nudgeFallback';
import type { SpecId } from '@/types';

const MAX_NUDGES = 6;
const MAX_TEXT_LEN = 160;

/** Strip markdown fences and pull the first JSON array out of the model's reply. */
function parseNudges(raw: string): Nudge[] {
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];

  const out: Nudge[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const text = typeof o.text === 'string' ? o.text.trim() : '';
    const seedQuestion = typeof o.seedQuestion === 'string' ? o.seedQuestion.trim() : '';
    if (!text || text.length > MAX_TEXT_LEN || !seedQuestion) continue;
    out.push({
      type: o.type === 'fact' ? 'fact' : 'question',
      text,
      courseCode: typeof o.courseCode === 'string' && o.courseCode ? o.courseCode : null,
      seedQuestion: seedQuestion.slice(0, 200),
    });
    if (out.length >= MAX_NUDGES) break;
  }
  return out;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // No model configured → let the client use its deterministic fallback.
  if (!isConfigured()) {
    return NextResponse.json({ nudges: [] });
  }

  // Resolve the student's selections + specialization (same shape as the chat route).
  const { data: selRows } = await supabase
    .from('course_selections')
    .select('course_id')
    .eq('user_id', user.id);
  const selectedIds = new Set((selRows ?? []).map((r) => r.course_id as number));
  const selectedCourses = ALL_COURSES.filter((c) => selectedIds.has(c.id));

  // Nothing personalized to say yet.
  if (selectedCourses.length === 0) {
    return NextResponse.json({ nudges: [] });
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('specializations')
    .eq('id', user.id)
    .maybeSingle();
  const specializations = (profileRow?.specializations as SpecId[] | undefined) ?? [];
  const currentTerm = getCurrentTerm();

  const messages = buildNudgeMessages({
    specializations,
    currentTerm,
    termCourses: getTermCourses(selectedIds, currentTerm),
    allSelected: selectedCourses,
  });

  try {
    const raw = await complete(messages, { maxTokens: 400, temperature: 0.8, timeoutMs: 15_000 });
    return NextResponse.json({ nudges: parseNudges(raw) });
  } catch {
    return NextResponse.json({ nudges: [] });
  }
}
