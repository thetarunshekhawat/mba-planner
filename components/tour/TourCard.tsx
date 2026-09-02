'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnchorRect } from './useAnchorRect';
import type { TourStep } from '@/lib/tour/types';

const CARD_W = 340;
const GAP = 14;      // space between the spotlight edge and the card
const MARGIN = 12;   // minimum distance from any viewport edge

interface Props {
  step: TourStep;
  /** 1-based, for display. */
  index: number;
  total: number;
  rect: AnchorRect | null;
  canGoBack: boolean;
  onBack: () => void;
  onNext: () => void;
}

/**
 * Picks a side for the card and clamps it inside the viewport.
 *
 * The step's declared `placement` is a preference, not a guarantee: on a narrow
 * phone a `right` placement has nowhere to go, so this falls through to whatever
 * side actually has room. A centered card (no rect) ignores placement entirely.
 */
function position(
  rect: AnchorRect | null,
  placement: TourStep['placement'],
  cardH: number,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect) {
    return {
      top: Math.max(MARGIN, (vh - cardH) / 2),
      left: Math.max(MARGIN, (vw - CARD_W) / 2),
    };
  }

  const room = {
    top: rect.top,
    bottom: vh - (rect.top + rect.height),
    left: rect.left,
    right: vw - (rect.left + rect.width),
  };

  // Preference first, then whichever side genuinely fits, then the roomiest.
  const order: Array<'top' | 'bottom' | 'left' | 'right'> =
    placement === 'auto'
      ? (['bottom', 'top', 'right', 'left'] as const).slice() as Array<'top' | 'bottom' | 'left' | 'right'>
      : [placement, 'bottom', 'top', 'right', 'left'].filter(
          (v, i, a) => a.indexOf(v) === i,
        ) as Array<'top' | 'bottom' | 'left' | 'right'>;

  const needed = (side: string) => (side === 'top' || side === 'bottom' ? cardH : CARD_W) + GAP;
  const side = order.find((s) => room[s] >= needed(s))
    ?? (Object.entries(room).sort((a, b) => b[1] - a[1])[0][0] as 'top' | 'bottom' | 'left' | 'right');

  let top: number;
  let left: number;
  if (side === 'bottom') {
    top = rect.top + rect.height + GAP;
    left = rect.left + rect.width / 2 - CARD_W / 2;
  } else if (side === 'top') {
    top = rect.top - cardH - GAP;
    left = rect.left + rect.width / 2 - CARD_W / 2;
  } else if (side === 'right') {
    top = rect.top + rect.height / 2 - cardH / 2;
    left = rect.left + rect.width + GAP;
  } else {
    top = rect.top + rect.height / 2 - cardH / 2;
    left = rect.left - CARD_W - GAP;
  }

  return {
    top: Math.min(Math.max(MARGIN, top), Math.max(MARGIN, vh - cardH - MARGIN)),
    left: Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - CARD_W - MARGIN)),
  };
}

export function TourCard({ step, index, total, rect, canGoBack, onBack, onNext }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const isLast = index === total;

  // Measure the card, then place it. Height is content-dependent (body copy
  // varies from two to four lines), so a fixed guess would leave the card
  // overlapping the very element it is describing on the tallest steps.
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight ?? 180;
    setPos(position(rect, step.placement, h));
  }, [rect, step.placement, step.id]);

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-card-title"
      className={cn(
        'fixed z-[1001] rounded-xl border border-white/10 bg-slate-900 p-4 shadow-2xl shadow-black/50',
        'transition-[top,left] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        pos ? 'opacity-100' : 'opacity-0',
      )}
      style={{ width: CARD_W, top: pos?.top ?? 0, left: pos?.left ?? 0 }}
    >
      {/* Counter + progress. With no Skip button the student cannot leave, so
          showing exactly how much is left is not decoration — it is the only
          thing making a mandatory overlay tolerable. */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
          {index} / {total}
        </span>
        <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500 transition-[width] duration-300 ease-out"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
      </div>

      <h3 id="tour-card-title" className="text-white font-semibold text-sm mb-1.5">
        {step.title}
      </h3>
      <p className="text-slate-400 text-xs leading-relaxed">{step.body}</p>

      <div className="mt-4 flex items-center justify-end gap-2">
        {canGoBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        )}
        <button
          onClick={onNext}
          autoFocus
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          {isLast ? 'Start planning' : 'Next'}
          {isLast ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
