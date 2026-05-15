import { NextResponse } from 'next/server';
import { generateScheduleICS } from '@/lib/calendar';
import { ALL_COURSES } from '@/data/courses';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coursesParam = searchParams.get('courses');

  if (!coursesParam) {
    return new NextResponse('No courses specified', { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Log calendar access (fire-and-forget)
    supabase.from('user_events').insert({
      user_id: user.id,
      event_type: 'calendar_accessed',
      payload: { courses_count: coursesParam.split(',').length },
    });

    // Soft rate limit: >10 requests in 60s is suspicious
    const { count } = await supabase
      .from('user_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('event_type', 'calendar_accessed')
      .gte('occurred_at', new Date(Date.now() - 60_000).toISOString());

    if (count && count > 10) {
      supabase.from('security_events').insert({
        actor_id: user.id,
        event_type: 'calendar_rate_limit',
        payload: { count_in_60s: count },
      });
      return new NextResponse('Rate limit exceeded', { status: 429 });
    }
  }

  const courseIds = new Set(coursesParam.split(',').map(Number));
  const coursesToExport = ALL_COURSES.filter(c => courseIds.has(c.id) || c.type === 'mandatory');

  if (coursesToExport.length === 0) {
    return new NextResponse('No valid courses found', { status: 404 });
  }

  const icsContent = generateScheduleICS(coursesToExport);

  return new NextResponse(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="mba-schedule.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
