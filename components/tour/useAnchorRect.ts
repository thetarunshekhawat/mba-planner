'use client';

import { useEffect, useRef, useState } from 'react';
import { ANCHOR_TIMEOUT_MS } from '@/lib/tour/steps';

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface AnchorState {
  /**
   * Which step this result describes.
   *
   * Load-bearing. The hook is not remounted between steps, so without this the
   * previous step's `settled: true, found: true` is still in state on the first
   * render of the next one — and the consumer reads it as THIS step's verdict,
   * latches, and then ignores the real `found: false` that arrives 1.2s later.
   * That silently disabled the fail-open auto-advance: a step with a missing
   * anchor sat there forever, with no Skip button to escape it.
   */
  for: string | null;
  rect: AnchorRect | null;
  /** false once the timeout has elapsed with nothing found — the caller
   *  auto-advances rather than hanging, because there is no Skip button. */
  found: boolean;
  /** How long the anchor took to appear. A step consistently near the ceiling
   *  is one slow render away from being skipped for everyone. */
  retryMs: number;
  /** Resolution finished, one way or the other. */
  settled: boolean;
}

const pending = (stepId: string): AnchorState =>
  ({ for: stepId, rect: null, found: false, retryMs: 0, settled: false });

/**
 * The first anchor match that is actually laid out.
 *
 * `FilterSidebar` renders TWICE — the desktop `<aside>` and again inside
 * `MobileDrawer` — so `sidebar-profile`, `specializations` and `progress` each
 * match two elements, and exactly one of them has a box. `querySelector` returns
 * the desktop copy, which is `hidden` below `lg`: on a phone the tour measured a
 * 0x0 rect and drew no spotlight at all, just a flat dim over the whole screen.
 *
 * Zero-size also covers the legitimately-not-ready cases — a drawer mid-spring,
 * a list that has not laid out — which is why "invisible" and "not there yet"
 * are deliberately the same answer here.
 */
function query(anchor: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * Resolves a `data-tour` anchor to viewport coordinates and keeps them current.
 *
 * Measured every frame while the step is active rather than once on mount: the
 * tab pill animates a sliding indicator, the mobile drawer springs open over
 * ~420ms, and tab switches fade content in. A single getBoundingClientRect()
 * fired mid-animation and the spotlight sat in the wrong place for the rest of
 * the step. A rAF loop over a handful of elements is cheap next to that.
 *
 * `anchor: null` means a centered card with no spotlight — it settles
 * immediately with a null rect.
 */
export function useAnchorRect(
  stepId: string,
  anchor: string | null,
  fallbackAnchor: string | undefined,
  active: boolean,
): AnchorState {
  const [state, setState] = useState<AnchorState>(() => pending(stepId));
  const startedAt = useRef(0);

  useEffect(() => {
    // Clear the previous step's verdict before measuring this one — see the
    // note on AnchorState.for.
    setState(pending(stepId));
    if (!active) return;

    if (anchor === null) {
      setState({ for: stepId, rect: null, found: true, retryMs: 0, settled: true });
      return;
    }

    startedAt.current = performance.now();
    let raf = 0;
    let resolvedIn = -1;
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const el = query(anchor!) ?? (fallbackAnchor ? query(fallbackAnchor) : null);
      const elapsed = performance.now() - startedAt.current;

      // `query` only ever returns a laid-out element, so the timeout below is
      // reachable whenever nothing is visible. It used to sit in this `else`,
      // which made it unreachable while a zero-size element matched — the loop
      // span forever, drew no spotlight, and never fired the fail-open advance.
      if (el) {
        if (resolvedIn < 0) resolvedIn = elapsed;
        const r = el.getBoundingClientRect();
        setState({
          for: stepId,
          rect: { top: r.top, left: r.left, width: r.width, height: r.height },
          found: true,
          retryMs: Math.round(resolvedIn),
          settled: true,
        });
      } else if (elapsed >= ANCHOR_TIMEOUT_MS) {
        setState({ for: stepId, rect: null, found: false, retryMs: Math.round(elapsed), settled: true });
        return; // stop polling; the caller advances
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [stepId, anchor, fallbackAnchor, active]);

  return state;
}

/**
 * Scrolls an anchor into view once, when a step opens.
 *
 * Separate from the tracking loop above on purpose: calling scrollIntoView every
 * frame fights the user and never settles, because each scroll changes the rect
 * that triggered it.
 */
export function scrollAnchorIntoView(anchor: string | null): void {
  if (!anchor) return;
  const el = query(anchor);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const fullyVisible = r.top >= 0 && r.bottom <= window.innerHeight;
  if (fullyVisible) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
