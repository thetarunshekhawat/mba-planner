import { NextResponse } from 'next/server';
import { generateScheduleICS } from '@/lib/calendar';
import { ALL_COURSES } from '@/data/courses';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coursesParam = searchParams.get('courses');

  if (!coursesParam) {
    return new NextResponse('No courses specified', { status: 400 });
  }

  const courseIds = new Set(coursesParam.split(',').map(Number));
  
  // Also include mandatory courses automatically just like the frontend
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
