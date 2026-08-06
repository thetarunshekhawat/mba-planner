// The two places the Alerts feature needs an explicit timezone, and nowhere else.
//
// Almost nothing here does zone maths, deliberately. Unstop hands us ISO strings
// with a `+05:30` offset, the columns are `timestamptz`, and reminder offsets are
// integer-minute arithmetic on absolute instants — so the timezone is already
// baked in and staying out of the way is the whole strategy.
//
// Two things genuinely need IST:
//   1. `istToInstant` — a student typing "10 August, 09:00" means 09:00 *in
//      Kolkata*. Converted once, at write time, and stored as an instant.
//   2. Display and day-grouping — which calendar day an instant falls on for a
//      student in India. That reuses `campusToday()` from lib/terms.ts rather
//      than making a fresh Intl call, so the alerts surface and the course
//      surfaces can never disagree about what "today" is.

import { campusToday } from '@/lib/terms';

export const IST_OFFSET_MINUTES = 330; // +05:30, and India has no DST

/**
 * A calendar date + wall-clock time *in IST* → the absolute instant.
 *
 * `istToInstant('2026-08-10', '09:00')` → `2026-08-10T03:30:00.000Z`.
 *
 * Done by arithmetic on a UTC instant rather than by constructing a local Date,
 * so the answer does not depend on the timezone of the machine running it —
 * which matters because this runs on both a Vercel box in UTC and a phone in IST.
 */
export function istToInstant(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
    throw new Error(`istToInstant: bad input ${date} ${time}`);
  }
  const asUtc = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  return new Date(asUtc - IST_OFFSET_MINUTES * 60_000).toISOString();
}

/** The IST calendar date (`YYYY-MM-DD`) an instant falls on. */
export function istDateOf(instant: string | Date): string {
  return campusToday(new Date(instant));
}

/** True if the instant falls on today's IST date. */
export function isToday(instant: string | Date, now: Date = new Date()): boolean {
  return istDateOf(instant) === campusToday(now);
}

const IST_FORMAT = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const IST_DAY_FORMAT = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** "10 Aug, 9:00 am" — an instant rendered in IST, for a student in India. */
export function formatIst(instant: string | Date): string {
  return IST_FORMAT.format(new Date(instant));
}

/** "Mon, 10 Aug" — day-level, for grouping headers. */
export function formatIstDay(instant: string | Date): string {
  return IST_DAY_FORMAT.format(new Date(instant));
}

/**
 * "in 3 days" / "2 hours ago" / "today". Deliberately coarse — a countdown
 * accurate to the second on a card that re-renders on focus is a lie with extra
 * steps.
 */
export function relativeIst(instant: string | Date, now: Date = new Date()): string {
  const then = new Date(instant).getTime();
  const diffMs = then - now.getTime();
  const future = diffMs >= 0;
  const mins = Math.round(Math.abs(diffMs) / 60_000);

  if (mins < 1) return 'now';
  if (mins < 60) return future ? `in ${mins} min` : `${mins} min ago`;

  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return future
      ? `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
      : `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  // Past 24h, count calendar days in IST — "in 1 day" should mean tomorrow,
  // not 24 hours from a timestamp.
  const days = Math.round(hours / 24);
  return future
    ? `in ${days} ${days === 1 ? 'day' : 'days'}`
    : `${days} ${days === 1 ? 'day' : 'days'} ago`;
}
