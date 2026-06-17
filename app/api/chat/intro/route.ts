// Generates the chatbot's opening greeting. The line is produced fresh by the model
// each time the widget opens (so it never repeats), themed around "which course would
// you like help with?" and aware of the student's specialization + locked term courses.
// Falls back to a small static rotation when the model is unavailable.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ALL_COURSES } from '@/data/courses';
import { getCurrentTerm, getTermCourses } from '@/lib/terms';
import { buildSystemPrompt, buildStudentContext } from '@/lib/chat/prompt';
import { complete, isConfigured } from '@/lib/chat/nemotron';
import type { SpecId } from '@/types';

const FALLBACK_GREETINGS = [
  'Hey! Which of your courses would you like my help with?',
  'Hi there — pick a course below and I’ll tell you whatever you need to know.',
  'Hello! Which course can I help you get a handle on today?',
  'Hey! Tap a course below, or just ask me anything about this term.',
];

function randomFallback(): string {
  return FALLBACK_GREETINGS[Math.floor(Math.random() * FALLBACK_GREETINGS.length)];
}

/** Trim the model's reply down to a single clean greeting line. */
function cleanGreeting(raw: string): string {
  const firstLine = raw.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  // Strip wrapping quotes the model sometimes adds.
  return firstLine.replace(/^["'“”]+|["'“”]+$/g, '').trim();
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ greeting: randomFallback() });
  }

  // Resolve who we're greeting.
  const { data: selRows } = await supabase
    .from('course_selections')
    .select('course_id')
    .eq('user_id', user.id);
  const selectedIds = new Set((selRows ?? []).map((r) => r.course_id as number));
  const selectedCourses = ALL_COURSES.filter((c) => selectedIds.has(c.id));

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('specializations')
    .eq('id', user.id)
    .maybeSingle();
  const specializations = ((profileRow?.specializations as SpecId[] | undefined) ?? []);
  const currentTerm = getCurrentTerm();

  const studentContext = {
    specializations,
    currentTerm,
    termCourses: getTermCourses(selectedIds, currentTerm),
    allSelected: selectedCourses,
  };

  const instruction =
    'Write ONE short, warm opening line (max ~18 words) to greet this student as they open the course assistant. ' +
    'Invite them to pick one of their courses to learn more about — vary the phrasing so it feels fresh, e.g. ' +
    '"Which course would you like my help with?" or "Which subject can I walk you through?". ' +
    'Do not list the courses (they are shown as buttons below your message). ' +
    'Do not give advice or ask them to introduce themselves. Output only the greeting line, no quotes, no preamble.';

  try {
    const raw = await complete(
      [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'system', content: buildStudentContext(studentContext) },
        { role: 'user', content: instruction },
      ],
      { maxTokens: 80, temperature: 0.9, timeoutMs: 12_000 },
    );
    const greeting = cleanGreeting(raw);
    return NextResponse.json({ greeting: greeting || randomFallback() });
  } catch {
    return NextResponse.json({ greeting: randomFallback() });
  }
}
