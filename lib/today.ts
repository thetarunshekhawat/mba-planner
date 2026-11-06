// "Where is today?" for the Plan and Schedule views. Both planners use these so the
// Plan tab's Today button, the Plan tab's default scroll position, and every Schedule
// Today button land on the same block.

import { campusToday } from './terms';

export interface DateSpan {
  /** ISO YYYY-MM-DD, inclusive. */
  start: string;
  end: string;
}

/**
 * Index of the span that is "now": the one containing `today`, else the next upcoming
 * one (today is in an exam break, placements week or between terms), else the last
 * one (everything is over). -1 only for an empty list. Spans need not be sorted.
 * Dates are plain YYYY-MM-DD strings, so lexical compare is calendar compare.
 */
export function currentSpanIndex(spans: DateSpan[], today: string = campusToday()): number {
  if (spans.length === 0) return -1;
  const order = spans.map((s, i) => i).sort((a, b) => spans[a].start.localeCompare(spans[b].start));
  const inside = order.find(i => spans[i].start <= today && today <= spans[i].end);
  if (inside !== undefined) return inside;
  const next = order.find(i => spans[i].start > today);
  return next ?? order[order.length - 1];
}

/**
 * The one place that decides where "today" sits on screen: the ongoing block lands in the
 * middle of the viewport, both when a tab opens (`'auto'`, instant) and on Today (`'smooth'`).
 */
function scrollTodayIntoView(el: Element | null, behavior: ScrollBehavior): boolean {
  el?.scrollIntoView({ behavior, block: 'center' });
  return !!el;
}

/** Plan tab: the zero-height anchor placed before today's block row. */
export const PLAN_TODAY_SELECTOR = '[data-plan-today="true"]';

/** Centres today's block row itself; falls back to its anchor when filters hide the row. */
export function scrollToPlanToday(behavior: ScrollBehavior = 'smooth'): boolean {
  const anchor = document.querySelector<HTMLElement>(PLAN_TODAY_SELECTOR);
  const key = anchor?.dataset.rowKey;
  const row = key ? document.querySelector(`[data-plan-row="${key}"]`) : null;
  return scrollTodayIntoView(row ?? anchor, behavior);
}

/**
 * Schedule tab: scroll to today wherever it is on the page, whichever term's Today
 * button was pressed. All terms render on the Schedule tab, so a Term 4 button can
 * still reach a Term 5 block. Tries, in order: the week row containing today
 * (`data-current-block`), today's column (`data-today`), the current term's upcoming
 * block (`data-schedule-anchor="<term>"`), then the current term's section itself
 * (`data-schedule-term="<term>"`, e.g. when it has nothing selected).
 */
export function scrollToScheduleToday(currentTerm: number, behavior: ScrollBehavior = 'smooth'): boolean {
  const el = document.querySelector('[data-current-block]')
    ?? document.querySelector('[data-today="true"]')
    ?? document.querySelector(`[data-schedule-anchor="${currentTerm}"]`)
    ?? document.querySelector(`[data-schedule-term="${currentTerm}"]`);
  return scrollTodayIntoView(el, behavior);
}
