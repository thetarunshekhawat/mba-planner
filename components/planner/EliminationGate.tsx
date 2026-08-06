'use client';

import { useEffect, useRef } from 'react';
import { Trophy, X } from 'lucide-react';
import type { CompetitionRound } from '@/types';

interface Props {
  round: CompetitionRound;
  onAnswer: (cleared: boolean) => void;
  onShown?: () => void;
}

/**
 * "Did you clear this round?", shown under an eliminator that has ended and
 * that the student has not answered.
 *
 * **The default is PASSED.** Ignoring this question changes nothing — the chain
 * keeps advancing and reminders keep arriving. Only tapping "No" stops
 * anything, and that is undoable.
 *
 * The asymmetry is deliberate. A student who is still in the competition and
 * never answers must keep getting their reminders; the cost of assuming they
 * passed is one irrelevant notification, while the cost of assuming they lost
 * is missing the deadline for a competition they are actually still in.
 */
export function EliminationGate({ round, onAnswer, onShown }: Props) {
  const shownRef = useRef(false);
  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    onShown?.();
  }, [onShown]);

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-[13px] font-semibold text-amber-900">
        {round.title ?? `Round ${round.round_order}`} has ended.
      </p>
      <p className="text-[11px] text-amber-700 mt-0.5 mb-2.5">
        Did you make it through? We&apos;ll keep reminding you unless you tell us otherwise.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAnswer(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
        >
          <Trophy className="w-3.5 h-3.5" />
          Yes, I cleared it
        </button>
        <button
          type="button"
          onClick={() => onAnswer(false)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          No, I&apos;m out
        </button>
      </div>
    </div>
  );
}
