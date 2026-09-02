import type { Course } from '@/types';

export type ViewMode = 'plan' | 'schedule' | 'friends' | 'alerts';

/** How a run got started. Replays behave nothing like first runs — faster,
 *  targeted — so every metric keeps them separable. */
export type TourTrigger = 'first_login' | 'version_upgrade' | 'manual_replay';

export type TourRunStatus = 'in_progress' | 'completed' | 'abandoned' | 'aborted_error';

export type ExitDirection = 'next' | 'back' | 'abandon';

/**
 * The slice of app state the tour is allowed to drive.
 *
 * These are the RAW setters, deliberately not the tracked handlers: a step that
 * switches to the Friends tab must not fire `view_changed`, or every student's
 * first session injects a fake engagement funnel into the admin dashboard.
 */
export interface TourContext {
  setViewMode: (v: ViewMode) => void;
  setActiveModal: (c: Course | null) => void;
  /** Forces the mobile bottom drawer open past its own internal state. */
  setDrawerExpanded: (open: boolean) => void;
  /** A real course to open in the detail modal — null if none is loaded yet. */
  sampleCourse: Course | null;
  isMobile: boolean;
}

export interface TourStep {
  /** Stable forever: it is the `data-tour` value AND the analytics key. Renaming
   *  one silently orphans every historical row for that step. */
  id: string;
  /** Steps with `addedInVersion > profile.tour_seen_version` form a returning
   *  student's short "what's new" run. */
  addedInVersion: number;
  /** `data-tour` value to spotlight. null = centered card, no spotlight. */
  anchor: string | null;
  /** Fallback anchor when the primary is absent — e.g. an empty Friends tab has
   *  no friend card, so the step points at the main region instead. */
  fallbackAnchor?: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  title: string;
  body: string;
  /** Desktop sidebar and mobile drawer are separate DOM trees, so some steps
   *  exist only on one. Variants of the same slot share a `slot`. */
  only?: 'desktop' | 'mobile';
  /** Groups desktop/mobile variants so the step counter reads the same on both. */
  slot?: string;
  /** Drives the app into the state this step needs. Must be idempotent. */
  before?: (ctx: TourContext) => void;
  /** Undoes anything `before` opened, on navigating away. */
  after?: (ctx: TourContext) => void;
}
