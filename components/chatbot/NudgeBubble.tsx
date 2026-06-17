'use client';

import { Sparkles, X } from 'lucide-react';
import type { ActiveNudge } from '@/hooks/useChatNudges';

/**
 * The proactive "mood" bubble shown next to the chat launcher. Tapping the card opens
 * the assistant and pre-fills the related question (the user still hits Enter). For
 * self-sufficient "fact" nudges the cue reads "Know more"; for "question" nudges it
 * invites a tap. The × dismisses without opening.
 */
export function NudgeBubble({
  nudge,
  onActivate,
  onDismiss,
  fadingOut = false,
}: {
  nudge: ActiveNudge;
  onActivate: () => void;
  onDismiss: () => void;
  fadingOut?: boolean;
}) {
  return (
    <div className={`${fadingOut ? 'animate-nudge-bubble-out' : 'animate-nudge-bubble-in'} relative mb-3 max-w-[16rem]`}>
      <button
        type="button"
        onClick={onActivate}
        className="flex w-full items-start gap-2 rounded-2xl rounded-br-sm bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-600 py-2.5 pr-3 pl-2.5 text-left shadow-xl shadow-violet-600/30 transition-opacity hover:opacity-90"
      >
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
          <Sparkles className="size-3" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm leading-snug text-white">{nudge.text}</span>
          <span className="mt-0.5 block text-xs font-semibold text-white/75">
            {nudge.type === 'fact' ? 'Know more →' : 'Tap to ask →'}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss"
        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-violet-700 text-white/80 shadow-sm transition-colors hover:bg-violet-900 hover:text-white"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
