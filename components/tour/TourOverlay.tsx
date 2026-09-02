'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TourCard } from './TourCard';
import { useAnchorRect, scrollAnchorIntoView } from './useAnchorRect';
import type { TourStep } from '@/lib/tour/types';

const PAD = 6;      // breathing room around the spotlit element
const RADIUS = 10;

interface Props {
  step: TourStep;
  index: number;   // 1-based
  total: number;
  canGoBack: boolean;
  onBack: () => void;
  onNext: () => void;
  /** Called once per step when the anchor resolves — or fails to. The hook uses
   *  this to record dwell timing and to auto-advance past a missing anchor. */
  onAnchorSettled: (found: boolean, retryMs: number) => void;
}

export function TourOverlay({
  step, index, total, canGoBack, onBack, onNext, onAnchorSettled,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const anchor = useAnchorRect(step.id, step.anchor, step.fallbackAnchor, true);

  useEffect(() => setMounted(true), []);

  // Scroll the target into view once per step, before the rAF loop starts
  // chasing it — see the note in useAnchorRect on why these are separate.
  useEffect(() => { scrollAnchorIntoView(step.anchor); }, [step.id, step.anchor]);

  useEffect(() => {
    // `anchor.for` guards against reporting the PREVIOUS step's verdict as this
    // one's — the hook is not remounted between steps.
    if (anchor.settled && anchor.for === step.id) onAnchorSettled(anchor.found, anchor.retryMs);
    // onAnchorSettled is recreated per step by useTour; re-running on its
    // identity would double-report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor.settled, anchor.found, anchor.for, step.id]);

  // Enter / ArrowRight advance; ArrowLeft goes back. Everything else is
  // swallowed — the app underneath is not interactive during a mandatory tour,
  // and a stray Tab that moved focus into it would be a trap with no way out.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
      else if (e.key === 'ArrowLeft' && canGoBack) { e.preventDefault(); onBack(); }
      else if (e.key === 'Tab') e.preventDefault();
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onNext, onBack, canGoBack]);

  // Lock background scroll for the duration of the tour.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!mounted) return null;

  const r = anchor.rect;
  const hole = r
    ? { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 }
    : null;

  return createPortal(
    <>
      {/*
        Click shield. The SVG below is pointer-events:none so it never eats the
        card's own clicks; this transparent sibling is what actually stops the
        student interacting with the app mid-tour.
      */}
      <div className="fixed inset-0 z-[999]" aria-hidden />

      <svg
        className="fixed inset-0 z-[1000] pointer-events-none"
        width="100%"
        height="100%"
        aria-hidden
      >
        <defs>
          <mask id="tour-spotlight">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hole && (
              <rect
                x={hole.x}
                y={hole.y}
                width={hole.w}
                height={hole.h}
                rx={RADIUS}
                fill="black"
                style={{ transition: 'all 300ms cubic-bezier(0.32,0.72,0,1)' }}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgb(2 6 23 / 0.72)"
          mask="url(#tour-spotlight)"
        />
        {hole && (
          <rect
            x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={RADIUS}
            fill="none"
            stroke="rgb(249 115 22 / 0.6)"
            strokeWidth="2"
            style={{ transition: 'all 300ms cubic-bezier(0.32,0.72,0,1)' }}
          />
        )}
      </svg>

      <TourCard
        step={step}
        index={index}
        total={total}
        rect={anchor.rect}
        canGoBack={canGoBack}
        onBack={onBack}
        onNext={onNext}
      />
    </>,
    document.body,
  );
}
