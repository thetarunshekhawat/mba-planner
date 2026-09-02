import type { TourStep } from './types';

/**
 * Bump when adding steps. A student whose `profiles.tour_seen_version` is below
 * this gets a run containing only the steps newer than their stored version —
 * so shipping one feature does not force the whole cohort through the tour again.
 */
export const TOUR_VERSION = 1;

/** Fail-open ceiling: an anchor that has not appeared in this long is skipped,
 *  logged, and the tour moves on. The tour has no Skip button, so it must never
 *  be able to hang on a missing element. */
export const ANCHOR_TIMEOUT_MS = 1200;

/** If more than this share of a run's steps fail to anchor, the tour is broken —
 *  abort it and mark the version seen rather than trapping the student in it on
 *  every visit. */
export const ABORT_MISSING_RATIO = 0.5;

/**
 * The tour, in order.
 *
 * Deliberately NOT covered: the filters block, the course list and its select
 * control, header search, and the Export/Calendar dialog. Each is self-evident
 * on contact, and with no Skip button every step cut is a step a student cannot
 * escape.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    addedInVersion: 1,
    anchor: null,
    placement: 'auto',
    title: 'Welcome to MBA Planner',
    body: 'Ninety seconds and you will know the whole thing. We will walk the portal together — pick your electives, build a timetable, compare with friends, and never miss a competition deadline.',
  },
  {
    id: 'tabs',
    addedInVersion: 1,
    anchor: 'tabs',
    placement: 'bottom',
    title: 'Four tabs, one plan',
    body: 'Plan is the course catalogue. My Schedule turns your picks into a timetable. Friends overlays their schedules onto yours. Alerts tracks case-competition deadlines. The orange badges count what is in each.',
  },
  {
    id: 'sidebar-profile',
    slot: 'profile',
    only: 'desktop',
    addedInVersion: 1,
    anchor: 'sidebar-profile',
    placement: 'right',
    title: 'This is you',
    body: 'Your name, your BITSoM address, and the sign-out button. The circular arrow beside it replays this tour any time you want it again.',
  },
  {
    id: 'mobile-drawer',
    slot: 'profile',
    only: 'mobile',
    addedInVersion: 1,
    anchor: 'mobile-drawer',
    placement: 'top',
    title: 'Swipe up for your controls',
    body: 'On a phone your profile, specializations, progress and filters live in this drawer. Drag the handle up any time — we have opened it for the next couple of steps.',
    before: (ctx) => ctx.setDrawerExpanded(true),
  },
  {
    id: 'specializations',
    addedInVersion: 1,
    anchor: 'specializations',
    placement: 'right',
    title: 'Declare your specializations',
    body: 'Tap the ones you are chasing. Everything downstream keys off this — progress bars, course relevance, and what the assistant recommends. You can change them whenever.',
    before: (ctx) => { if (ctx.isMobile) ctx.setDrawerExpanded(true); },
  },
  {
    id: 'progress',
    addedInVersion: 1,
    anchor: 'progress',
    placement: 'right',
    title: 'Progress, live',
    body: 'Elective credits, Work-and-Wellness credits, and a bar per declared specialization — recalculated the moment you pick a course. The toggle at the top switches between the full year and only what has happened so far.',
    before: (ctx) => { if (ctx.isMobile) ctx.setDrawerExpanded(true); },
    after: (ctx) => { if (ctx.isMobile) ctx.setDrawerExpanded(false); },
  },
  {
    id: 'course-detail',
    addedInVersion: 1,
    anchor: 'course-detail',
    placement: 'auto',
    title: 'Open a course before you commit',
    body: 'Every course card opens like this: the outline, who teaches it, which sections run when, learning depth and career relevance. The button at the bottom adds it to your plan — that is how you pick courses.',
    before: (ctx) => {
      ctx.setViewMode('plan');
      if (ctx.sampleCourse) ctx.setActiveModal(ctx.sampleCourse);
    },
    after: (ctx) => ctx.setActiveModal(null),
  },
  {
    id: 'timetable',
    addedInVersion: 1,
    anchor: 'timetable',
    // One block-week grid; the empty state when nothing is selected yet. Never
    // the whole tab — a cutout the size of the viewport dims nothing.
    fallbackAnchor: 'timetable-empty',
    placement: 'auto',
    title: 'Your week, block by block',
    body: 'One block-week at a time. Courses you pick land here in your actual section slots, clashes flagged in red, and tracked competition deadlines on the Deadlines row underneath. Export pushes the whole term to Google or Apple Calendar.',
    before: (ctx) => ctx.setViewMode('schedule'),
  },
  {
    id: 'friends',
    addedInVersion: 1,
    anchor: 'friends',
    placement: 'auto',
    title: 'Compare with your batch',
    body: 'This is your code. Share it, add your friends\u2019 codes back, then toggle anyone on to see their schedule laid over yours — so you can find the sections you actually share before add-drop closes.',
    before: (ctx) => ctx.setViewMode('friends'),
  },
  {
    id: 'alerts',
    addedInVersion: 1,
    anchor: 'alerts',
    fallbackAnchor: 'alerts-empty',
    placement: 'auto',
    title: 'Never miss a deadline',
    body: 'Every competition looks like this — each round and its deadline in one chain. Hit Track and you get browser reminders before each one; say you didn\u2019t clear a round and the rest stop chasing you. You can add your own deadlines too.',
    before: (ctx) => ctx.setViewMode('alerts'),
  },
  {
    id: 'assistant',
    addedInVersion: 1,
    anchor: 'assistant',
    placement: 'left',
    title: 'Ask instead of hunting',
    body: 'The assistant knows every course outline, your picks and your specializations. "Which finance elective is lightest?" or "what clashes with Marketing Analytics?" — it answers, and can jump you straight to the course.',
  },
  {
    id: 'finish',
    addedInVersion: 1,
    anchor: null,
    placement: 'auto',
    title: 'That is the whole portal',
    body: 'Start on the Plan tab and pick a few courses — everything else fills itself in. Want this again? The circular arrow next to your name replays it.',
    before: (ctx) => ctx.setViewMode('plan'),
  },
];

/**
 * The steps a given student should see.
 *
 * A first-timer (`seenVersion === 0`) gets everything. A returning student gets
 * only what is newer than their stored version — the "what's new" run. In both
 * cases the desktop/mobile variants of a slot are filtered to the one that
 * actually exists on this viewport, so the step counter reads the same on both.
 */
export function stepsForVersion(seenVersion: number, isMobile: boolean): TourStep[] {
  return TOUR_STEPS.filter((s) => {
    if (s.addedInVersion <= seenVersion) return false;
    if (s.only === 'mobile' && !isMobile) return false;
    if (s.only === 'desktop' && isMobile) return false;
    return true;
  });
}

/**
 * The step list collapsed to SLOTS — the unit the analytics counts in.
 *
 * `TOUR_STEPS` holds 12 entries because the profile step has a desktop and a
 * mobile variant, but any given run sees exactly one of them, so a run's
 * `furthest_step_index` indexes an 11-long list. Reading those indices against
 * `TOUR_STEPS` is off by one for every step after the profile slot: the funnel
 * showed a phantom 12th step nobody reached, and every completed student's
 * "furthest step" read as the second-to-last one.
 *
 * Slot indices ARE run indices. Always aggregate on these, never on TOUR_STEPS.
 */
export interface TourSlot {
  index: number;
  /** Every step id that maps here — both variants for the profile slot. */
  ids: string[];
  title: string;
}

export const TOUR_SLOTS: TourSlot[] = (() => {
  const out: TourSlot[] = [];
  const bySlot = new Map<string, TourSlot>();
  for (const step of TOUR_STEPS) {
    const key = step.slot ?? step.id;
    const existing = bySlot.get(key);
    if (existing) { existing.ids.push(step.id); continue; }
    const slot: TourSlot = { index: out.length, ids: [step.id], title: step.title };
    bySlot.set(key, slot);
    out.push(slot);
  }
  return out;
})();

/** Slot index for a step id, or -1. */
export function slotIndexOf(stepId: string): number {
  return TOUR_SLOTS.findIndex((s) => s.ids.includes(stepId));
}
