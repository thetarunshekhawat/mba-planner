'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Course } from '@/types';
import type { EventType } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { DisambiguationChips, type Chip } from './DisambiguationChips';

type TrackEvent = (eventType: EventType, payload?: Record<string, unknown>) => void;

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  chips?: Chip[];
  pendingQuestion?: string;
}

const SUGGESTIONS = [
  'How many days is my course?',
  'What will I learn?',
  'How is it graded?',
];

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function ChatWidget({
  userId,
  courses,
  trackEvent,
}: {
  userId: string | null;
  /** The student's currently selected courses (used for suggestion hints). */
  courses: Course[];
  trackEvent: TrackEvent;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const convoRef = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  // Mirror of messages for synchronous reads (history) without effect re-runs.
  const messagesRef = useRef<Msg[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const openWidget = useCallback(() => {
    convoRef.current = newId();
    setMessages([]);
    setOpen(true);
    trackEvent('chatbot_opened');
  }, [trackEvent]);

  const closeWidget = useCallback(() => {
    setOpen(false);
    trackEvent('chatbot_closed');
  }, [trackEvent]);

  function buildHistory(msgs: Msg[]) {
    return msgs
      .filter((m) => m.content && !m.streaming && !m.chips)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));
  }

  const request = useCallback(
    async (text: string, courseCode: string | null, priorMsgs: Msg[]) => {
      if (!userId) return;
      setBusy(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversationId: convoRef.current,
            courseCode,
            history: buildHistory(priorMsgs),
          }),
        });

        if (!res.ok) {
          let err = 'Something went wrong. Please try again.';
          try {
            const j = await res.json();
            if (j?.error) err = j.error;
          } catch {
            /* ignore */
          }
          setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: err }]);
          return;
        }

        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (data?.type === 'disambiguation') {
            setMessages((prev) => [
              ...prev,
              {
                id: newId(),
                role: 'assistant',
                content: data.message ?? 'Which course do you mean?',
                chips: (data.courses ?? []) as Chip[],
                pendingQuestion: text,
              },
            ]);
            return;
          }
          setMessages((prev) => [
            ...prev,
            { id: newId(), role: 'assistant', content: 'Hmm, I got an unexpected response.' },
          ]);
          return;
        }

        // Streaming plain-text answer.
        const asstId = newId();
        setMessages((prev) => [...prev, { id: asstId, role: 'assistant', content: '', streaming: true }]);
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) {
            setMessages((prev) =>
              prev.map((m) => (m.id === asstId ? { ...m, content: m.content + chunk } : m)),
            );
          }
        }
        setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, streaming: false } : m)));
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'assistant',
            content: "I couldn't reach the assistant. Check your connection and try again.",
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [userId],
  );

  const onSend = useCallback(
    (text: string) => {
      const prior = messagesRef.current;
      setMessages((prev) => [...prev, { id: newId(), role: 'user', content: text }]);
      void request(text, null, prior);
    },
    [request],
  );

  const onPickChip = useCallback(
    (disambigId: string, chip: Chip, question: string) => {
      trackEvent('chatbot_chip_clicked', { code: chip.code, name: chip.name });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === disambigId
            ? { ...m, chips: undefined, content: `Showing details for ${chip.name}.` }
            : m,
        ),
      );
      void request(question, chip.code ?? null, messagesRef.current);
    },
    [request, trackEvent],
  );

  if (!userId) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[min(72vh,40rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="size-4" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold">Course Assistant</p>
                <p className="text-xs text-muted-foreground">Ask about your courses</p>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={closeWidget} aria-label="Close chat">
              <X />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <ChatMessage
                  role="assistant"
                  content="Hi! I can help you understand your courses — schedule, what you'll learn, grading, and more. What would you like to know?"
                />
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {SUGGESTIONS.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => onSend(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className="space-y-1">
                <ChatMessage role={m.role} content={m.content} streaming={m.streaming} />
                {m.chips && m.chips.length > 0 && (
                  <DisambiguationChips
                    courses={m.chips}
                    disabled={busy}
                    onPick={(chip) => onPickChip(m.id, chip, m.pendingQuestion ?? '')}
                  />
                )}
              </div>
            ))}
          </div>

          <ChatInput disabled={busy} onSend={onSend} />
        </div>
      )}

      {/* Launcher */}
      <Button
        size="icon-lg"
        onClick={open ? closeWidget : openWidget}
        aria-label={open ? 'Close course assistant' : 'Open course assistant'}
        className="size-12 rounded-full shadow-lg"
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </div>
  );
}
