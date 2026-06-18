'use client';

/**
 * Assistant-style "typing" bubble shown while a chat request is in flight and no
 * answer text has streamed back yet. Mirrors the assistant bubble styling in
 * ChatMessage.tsx so it lines up with real messages, and is replaced by the
 * streaming answer the moment the first chunk arrives.
 */
export function TypingIndicator() {
  return (
    <div className="flex w-full justify-start" role="status" aria-label="Assistant is typing">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-3 text-muted-foreground">
        {[0, 160, 320].map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full bg-current animate-chat-typing-dot"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
        <span className="sr-only">Assistant is typing…</span>
      </div>
    </div>
  );
}
