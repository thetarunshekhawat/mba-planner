'use client';

import { cn } from '@/lib/utils';

export function ChatMessage({
  role,
  content,
  streaming,
}: {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted text-foreground',
        )}
      >
        {content}
        {streaming && (
          <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-current align-text-bottom" />
        )}
      </div>
    </div>
  );
}
