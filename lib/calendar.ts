import { Course } from '@/types';
import { parseISO, addDays, getDay } from 'date-fns';

const DAY_MAP: Record<string, number> = {
  'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
};

function formatICSDate(date: Date, timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const d = new Date(date);
  d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateScheduleICS(courses: Course[]): string {
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MBA Planner//EN',
    'CALSCALE:GREGORIAN'
  ];

  for (const course of courses) {
    if (!course.timings || !course.startDate || !course.endDate) continue;

    const start = parseISO(course.startDate);
    const end = parseISO(course.endDate);

    for (const timing of course.timings) {
      // Handle both en-dash and hyphen
      const parts = timing.slot.split(/[-–]/);
      if (parts.length !== 2) continue;
      
      const startTime = parts[0].trim();
      const endTime = parts[1].trim();
      
      let currentDay = start;
      while (currentDay <= end) {
        const dayName = Object.keys(DAY_MAP).find(key => DAY_MAP[key] === getDay(currentDay));
        
        if (dayName && timing.days.includes(dayName)) {
           const dtStart = formatICSDate(currentDay, startTime);
           const dtEnd = formatICSDate(currentDay, endTime);
           
           ics.push(
             'BEGIN:VEVENT',
             `UID:${course.id}-${currentDay.getTime()}-${timing.part || '0'}@mbaplanner`,
             `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
             `DTSTART:${dtStart}`,
             `DTEND:${dtEnd}`,
             `SUMMARY:${course.name}`,
             `LOCATION:${timing.room}`,
             'END:VEVENT'
           );
        }
        currentDay = addDays(currentDay, 1);
      }
    }
  }

  ics.push('END:VCALENDAR');
  return ics.join('\\r\\n');
}
