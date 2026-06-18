// Returns the personalized POOL of proactive "nudge" notifications for the chat launcher.
// Fully deterministic: selected entirely from the combined Term-4 insight engine
// (lib/chat/insightEngine + data/term4Insights.json) — NO model call, so nudges cost zero API
// budget and never touch any rate limit. The client fetches this once per session (cached by
// selection signature) and rotates through it. On empty selection we return an empty pool and the
// client falls back to deterministic templates (lib/chat/nudgeFallback).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ALL_COURSES } from '@/data/courses';
import { selectInsightNudges } from '@/lib/chat/insightEngine';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Resolve the student's selected courses (drives all personalization).
  const { data: selRows } = await supabase
    .from('course_selections')
    .select('course_id')
    .eq('user_id', user.id);
  const selectedIds = new Set((selRows ?? []).map((r) => r.course_id as number));
  const selectedCourses = ALL_COURSES.filter((c) => selectedIds.has(c.id));

  return NextResponse.json({ nudges: selectInsightNudges(selectedCourses) });
}
