// One plan-view row per teaching block. A block (e.g. Block 29, Feb 1–12) can have its
// courses spread over several `week` values — Economics of Strategy sits in week 32 and
// Private Markets in week 33 — and rendering one row per week makes each subject look
// like it runs for one week only. This groups a term's courses into block rows instead.
//
// Rules:
//  - Courses merge only when they share `term` AND `block`, and their weeks are adjacent
//    (a gap of more than one week starts a new row, so a block number reused later in the
//    term never glues two separate stretches together).
//  - Courses with `block: null` (exam week, free week, term break, term-long projects)
//    are never merged with anything; they stay one row per week.
//  - A course keeps the row of its own `block` field, so a course spanning two blocks
//    (e.g. FSA, Jul 27–Aug 21, block 18) shows once, in its own block's row.

import type { Course } from '@/types';

export interface BlockRow {
  /** Stable React key: term, block (or "x" for null) and first week. */
  key: string;
  term: Course['term'];
  block: number | null;
  weekStart: number;
  weekEnd: number;
  /** ISO dates: earliest start / latest end of the block (see endDate capping below). */
  startDate: string;
  endDate: string;
  /** Display span, e.g. "Feb 1–12" or "Aug 31–Sep 11". */
  dates: string;
  /** Courses of the row, in the order they were passed in. */
  courses: Course[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(iso: string): { m: string; d: number } {
  const [, mm, dd] = iso.split('-').map(Number);
  return { m: MONTHS[mm - 1], d: dd };
}

/** "Feb 1–12", "Aug 31–Sep 11", or a single "Aug 5". */
export function formatDateSpan(startIso: string, endIso: string): string {
  const a = parts(startIso);
  const b = parts(endIso);
  if (startIso === endIso) return `${a.m} ${a.d}`;
  return a.m === b.m ? `${a.m} ${a.d}–${b.d}` : `${a.m} ${a.d}–${b.m} ${b.d}`;
}

/** "Wk 32–33" for a multi-week row, "Wk 10" for a single-week one. */
export function weekLabel(row: Pick<BlockRow, 'weekStart' | 'weekEnd'>): string {
  return row.weekStart === row.weekEnd ? `Wk ${row.weekStart}` : `Wk ${row.weekStart}–${row.weekEnd}`;
}

function dayBefore(iso: string): string {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - 1);
  return t.toISOString().slice(0, 10);
}

/**
 * Groups courses (of any mix of terms) into block rows, ordered by term then first week.
 * Pass the term's full course list, not a filtered one, so a row's week range and date
 * span describe the whole block even when only some of its courses are visible.
 */
export function groupBlockRows(courses: Course[]): BlockRow[] {
  const buckets = new Map<string, Course[]>();
  for (const c of courses) {
    // Null blocks never merge: bucket them by week so each exam/free/break week is its own row.
    const k = c.block === null ? `${c.term}|x|${c.week}` : `${c.term}|${c.block}`;
    const list = buckets.get(k);
    if (list) list.push(c); else buckets.set(k, [c]);
  }

  const rows: BlockRow[] = [];
  for (const list of buckets.values()) {
    const { term, block } = list[0];
    // Split a block bucket wherever its weeks stop being adjacent.
    const byWeek = [...list].sort((a, b) => a.week - b.week);
    const runs: Course[][] = [];
    for (const c of byWeek) {
      const run = runs[runs.length - 1];
      if (run && block !== null && c.week - run[run.length - 1].week <= 1) run.push(c);
      else runs.push([c]);
    }
    for (const run of runs) {
      const members = list.filter(c => run.includes(c));
      const startDate = members.reduce((m, c) => (c.startDate < m ? c.startDate : m), members[0].startDate);
      const endDate = members.reduce((m, c) => (c.endDate > m ? c.endDate : m), members[0].endDate);
      rows.push({
        key: `${term}-${block ?? 'x'}-${run[0].week}`,
        term,
        block,
        weekStart: run[0].week,
        weekEnd: run[run.length - 1].week,
        startDate,
        endDate,
        dates: block === null ? members[0].dates : formatDateSpan(startDate, endDate),
        courses: members,
      });
    }
  }

  rows.sort((a, b) =>
    a.term - b.term
    || a.weekStart - b.weekStart
    // At the same week a real block comes before a null-block row (e.g. term-long project).
    || Number(a.block === null) - Number(b.block === null)
    || a.startDate.localeCompare(b.startDate));

  // A course that runs past its block (FSA: Jul 27–Aug 21 but block 18 ends Aug 9) must not
  // stretch the row's label into the next block. Cap each block row's end at the day before
  // the next block row of the same term begins. Null-block rows are ignored here.
  for (const row of rows) {
    if (row.block === null) continue;
    const next = rows.find(r => r.term === row.term && r.block !== null && r.startDate > row.startDate);
    if (next && next.startDate <= row.endDate) {
      row.endDate = dayBefore(next.startDate);
      row.dates = formatDateSpan(row.startDate, row.endDate);
    }
  }
  return rows;
}

/**
 * The most courses matching `pred` that fall in any single week of the row. Double/triple
 * block warnings are about electives running at the same time, so a merged row counts per
 * week — Economics of Strategy (wk 32) + Private Markets (wk 33) are back to back, not a double.
 */
export function maxPerWeek(row: Pick<BlockRow, 'courses'>, pred: (c: Course) => boolean): number {
  const perWeek = new Map<number, number>();
  for (const c of row.courses) {
    if (pred(c)) perWeek.set(c.week, (perWeek.get(c.week) ?? 0) + 1);
  }
  return Math.max(0, ...perWeek.values());
}
