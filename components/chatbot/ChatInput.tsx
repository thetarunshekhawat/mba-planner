'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ChatInput({
  disabled,
  onSend,
  prefill,
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
  /** Drops text into the box (ready to send, NOT auto-sent) and focuses it.
   *  `key` must change on each new prefill so repeats re-trigger. */
  prefill?: { text: string; key: number };
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When a new prefill arrives, fill the box and focus — the user hits Enter themselves.
  useEffect(() => {
    if (!prefill?.text) return;
    setValue(prefill.text);
    const el = textareaRef.current;
    if (el) {
      el.focus();
      // Caret to end so they can immediately send or edit.
      const len = prefill.text.length;
      requestAnimationFrame(() => el.setSelectionRange(len, len));
    }
  }, [prefill?.key, prefill?.text]);

  function submit() {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue('');
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t border-border p-2"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder="Ask about your courses…"
        className="max-h-28 min-h-[2.25rem] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button type="submit" size="icon" disabled={disabled || !value.trim()} aria-label="Send message">
        <Send />
      </Button>
    </form>
  );
}
