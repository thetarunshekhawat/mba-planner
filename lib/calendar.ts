import { Course } from '@/types';
import { parseISO, addDays, getDay } from 'date-fns';
import type { Commitment } from '@/lib/alerts/commitments';

const DAY_MAP: Record<string, number> = {
  'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
};

function formatICSDate(date: Date, timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const d = new Date(date);
  d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * RFC 5545 text escaping. A competition title with a comma in it ("Round 2, Finals")
 * ends the property value early otherwise, and the import silently drops the rest.
 */
function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/[;,]/g, (m) => `\\${m}`).replace(/\r?\n/g, '\\n');
}

function stampICS(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** How long a deadline occupies in a calendar. It's an instant, but a zero-length
 *  event renders as an invisible hairline in most clients. */
const COMMITMENT_MINUTES = 30;

/**
 * The student's classes, plus the competition deadlines they're tracking.
 *
 * Both in one file on purpose: exporting a schedule that omits the submission
 * deadline you're planning around is how the deadline gets missed.
 */
export function generateScheduleICS(courses: Course[], commitments: Commitment[] = []): string {
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
      
      // Week 1 / week 2 of a block are calendar weeks, so the elapsed-day count has to be
      // anchored to the Monday of the course's first week rather than to its own start date.
      // A course that begins mid-week (ESGV starts on a Thursday) would otherwise shift its
      // week-2 boundary by the same offset and silently drop the start of its second week.
      const weekAnchor = addDays(start, -((getDay(start) + 6) % 7));

      let currentDay = start;
      while (currentDay <= end) {
        const dayName = Object.keys(DAY_MAP).find(key => DAY_MAP[key] === getDay(currentDay));

        // Pick the day pattern for this week: week 1/2 of the block, and the
        // second-block overrides for courses spanning two blocks
        const daysElapsed = Math.round((currentDay.getTime() - weekAnchor.getTime()) / 86400000);
        const inSecondBlock = daysElapsed >= 14;
        const isWeek2 = Math.floor(daysElapsed / 7) % 2 === 1;
        let effectiveDays = timing.days;
        if (inSecondBlock && (isWeek2 ? timing.block2Week2Days : timing.block2Days)) {
          effectiveDays = (isWeek2 ? timing.block2Week2Days : timing.block2Days)!;
        } else if (isWeek2 && timing.week2Days) {
          effectiveDays = timing.week2Days;
        }

        if (dayName && effectiveDays.includes(dayName)) {
           const dtStart = formatICSDate(currentDay, startTime);
           const dtEnd = formatICSDate(currentDay, endTime);
           
           ics.push(
             'BEGIN:VEVENT',
             `UID:${course.id}-${currentDay.getTime()}-${timing.part || '0'}@mbaplanner`,
             `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
             `DTSTART:${dtStart}`,
             `DTEND:${dtEnd}`,
             `SUMMARY:${escapeICS(course.name)}`,
             `LOCATION:${escapeICS(timing.room)}`,
             'END:VEVENT'
           );
        }
        currentDay = addDays(currentDay, 1);
      }
    }
  }

  for (const item of commitments) {
    const at = new Date(item.at);
    if (Number.isNaN(at.getTime())) continue;
    const end = new Date(at.getTime() + COMMITMENT_MINUTES * 60_000);
    ics.push(
      'BEGIN:VEVENT',
      `UID:commitment-${item.key}@mbaplanner`,
      `DTSTAMP:${stampICS(new Date())}`,
      `DTSTART:${stampICS(at)}`,
      `DTEND:${stampICS(end)}`,
      `SUMMARY:${escapeICS(`${item.subtitle} — ${item.title}`)}`,
      ...(item.url ? [`DESCRIPTION:${escapeICS(item.url)}`, `URL:${escapeICS(item.url)}`] : []),
      // A deadline you find out about when it starts is not a reminder.
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`${item.subtitle} — ${item.title}`)}`,
      'TRIGGER:-PT1440M',
      'END:VALARM',
      'END:VEVENT',
    );
  }

  ics.push('END:VCALENDAR');
  // RFC 5545 requires real CRLF line breaks. This was previously joined with the escaped
  // literal "\r\n", which collapsed the whole calendar onto a single unparseable line.
  return ics.join('\r\n');
}
