'use client';

import { ExternalLink, Download, CalendarPlus, User } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import type { ChatAction } from '@/lib/chat/actions';

function iconFor(a: ChatAction) {
  if (a.type === 'open_link') return <ExternalLink className="size-3.5" />;
  if (a.type === 'export_ics') return <Download className="size-3.5" />;
  if (a.type === 'ask') return <User className="size-3.5" />;
  return <CalendarPlus className="size-3.5" />;
}

/** Tappable actions rendered beneath an assistant message. Links open directly (plain
 *  anchor); export actions call back to the planner page, which owns the handlers and
 *  the live schedule state. */
export function ActionChips({
  actions,
  onAction,
  disabled,
}: {
  actions: ChatAction[];
  onAction: (action: ChatAction) => void;
  disabled?: boolean;
}) {
  if (!actions.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1.5 pl-1">
      {actions.map((a, i) =>
        a.type === 'open_link' ? (
          <a
            key={`${a.type}-${i}`}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onAction(a)}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {iconFor(a)}
            {a.label}
          </a>
        ) : (
          <Button
            key={`${a.type}-${i}`}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onAction(a)}
          >
            {iconFor(a)}
            {a.label}
          </Button>
        ),
      )}
    </div>
  );
}
