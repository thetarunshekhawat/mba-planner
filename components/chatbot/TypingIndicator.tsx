'use client';

/**
 * Assistant-style "thinking" bubble shown while a chat request is in flight and no
 * answer text has streamed back yet. Mirrors the assistant bubble styling in
 * ChatMessage.tsx so it lines up with real messages, and is replaced by the
 * streaming answer the moment the first chunk arrives.
 *
 * The loader is Gemini's signature glyph: a four-point "spark" filled with a
 * sweeping blue→purple→pink gradient (breathing + rotating) next to a shimmering
 * "Thinking…" label. The spark uses two nested spans so the breathe/rotate
 * transform (outer) and the gradient sweep (inner) don't fight over `animation`.
 */
export function TypingIndicator() {
  return (
    <div className="flex w-full justify-start" role="status" aria-label="Assistant is thinking">
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-3">
        <span aria-hidden className="size-4 shrink-0 animate-gemini-spark">
          <span className="gemini-spark-fill block size-full" />
        </span>
        <span className="gemini-thinking-text text-sm font-medium">Thinking…</span>
        <span className="sr-only">Assistant is thinking…</span>
      </div>
    </div>
  );
}
