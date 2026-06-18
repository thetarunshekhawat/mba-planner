'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Course } from '@/types';
import { suggestCourses, applyCourseCompletion } from '@/lib/chat/courseSuggest';

export function ChatInput({
  disabled,
  onSend,
  prefill,
  myCourses,
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
  /** Drops text into the box (ready to send, NOT auto-sent) and focuses it.
   *  `key` must change on each new prefill so repeats re-trigger. */
  prefill?: { text: string; key: number };
  /** The student's current-term courses — surfaced first in autocomplete suggestions. */
  myCourses?: Course[];
}) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const myIds = useMemo(() => new Set((myCourses ?? []).map((c) => c.id)), [myCourses]);
  const suggestions = useMemo(() => suggestCourses(value, myIds), [value, myIds]);
  const showSuggestions = open && suggestions.length > 0;

  // When a new prefill arrives, fill the box and focus — the user hits Enter themselves.
  useEffect(() => {
    if (!prefill?.text) return;
    setValue(prefill.text);
    setOpen(false);
    setActiveIndex(-1);
    const el = textareaRef.current;
    if (el) {
      el.focus();
      // Caret to end so they can immediately send or edit.
      const len = prefill.text.length;
      requestAnimationFrame(() => el.setSelectionRange(len, len));
    }
  }, [prefill?.key, prefill?.text]);

  function focusEnd(text: string) {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      requestAnimationFrame(() => el.setSelectionRange(text.length, text.length));
    }
  }

  function submit() {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue('');
    setOpen(false);
    setActiveIndex(-1);
  }

  // Complete the partial course name in place (keeping the rest of what's typed),
  // then leave the caret after it so the user keeps typing their question.
  function acceptSuggestion(course: Course) {
    const next = applyCourseCompletion(value, course.name);
    setValue(next);
    setOpen(false);
    setActiveIndex(-1);
    focusEnd(next);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative flex items-end gap-2 border-t border-border p-2"
    >
      {showSuggestions && (
        <ul
          id="chat-course-suggestions"
          role="listbox"
          aria-label="Course suggestions"
          className="absolute bottom-full left-2 right-2 z-10 mb-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-lg"
        >
          {suggestions.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                // Prevent the textarea blur from closing the list before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => acceptSuggestion(c)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                  i === activeIndex ? 'bg-muted' : 'hover:bg-muted/60',
                )}
              >
                <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {myIds.has(c.id) ? `Wk ${c.week}` : `T${c.term}`}
                </span>
                <span className="flex-1 truncate font-medium">{c.name}</span>
                {c.code && <span className="shrink-0 text-[10px] text-muted-foreground">{c.code}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        role="combobox"
        aria-expanded={showSuggestions}
        aria-controls="chat-course-suggestions"
        aria-autocomplete="list"
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (showSuggestions) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((i) => (i + 1) % suggestions.length);
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
              setActiveIndex(-1);
              return;
            }
            if (e.key === 'Tab') {
              e.preventDefault();
              acceptSuggestion(suggestions[activeIndex >= 0 ? activeIndex : 0]);
              return;
            }
            if (e.key === 'Enter' && !e.shiftKey && activeIndex >= 0) {
              e.preventDefault();
              acceptSuggestion(suggestions[activeIndex]);
              return;
            }
          }
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
