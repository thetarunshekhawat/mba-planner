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
}: {
  nudge: ActiveNudge;
  onActivate: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="animate-nudge-bubble-in relative mb-3 max-w-[16rem]">
      <button
        type="button"
        onClick={onActivate}
        className="flex w-full items-start gap-2 rounded-2xl rounded-br-sm border border-border bg-background py-2.5 pr-3 pl-2.5 text-left shadow-xl transition-colors hover:bg-muted/50"
      >
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-3" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm leading-snug text-foreground">{nudge.text}</span>
          <span className="mt-0.5 block text-xs font-medium text-primary">
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
        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
