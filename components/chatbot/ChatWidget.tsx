'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Sparkles, SquarePen } from 'lucide-react';
import type { Course, SpecId } from '@/types';
import type { EventType } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import { useChatNudges, type ActiveNudge } from '@/hooks/useChatNudges';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { DisambiguationChips, type Chip } from './DisambiguationChips';
import { NudgeBubble } from './NudgeBubble';

type TrackEvent = (eventType: EventType, payload?: Record<string, unknown>) => void;

// Proactive-nudge cadence (Gentle): first tug shortly after landing, then occasional,
// capped per session, and only while the chat has never been opened.
const NUDGE_FIRST_DELAY = 2500; // ms after mount
const NUDGE_INTERVAL = 75_000; // ms between subsequent nudges
const NUDGE_MAX_PER_SESSION = 3;
const NUDGE_TUG_MS = 600; // launcher tug duration (matches CSS keyframe)
const NUDGE_REVEAL_MS = 360; // bubble appears on the tug's rebound
const NUDGE_TTL = 8000; // bubble auto-hides after this

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  chips?: Chip[];
  pendingQuestion?: string;
}

const FALLBACK_GREETING = 'Hey! Which of your courses would you like my help with?';

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function ChatWidget({
  userId,
  courses,
  specializations,
  trackEvent,
}: {
  userId: string | null;
  /** The student's locked courses for the current term, ordered by occurrence. */
  courses: Course[];
  /** The student's specialization(s) — used for analytics on open. */
  specializations: SpecId[];
  trackEvent: TrackEvent;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  // AI-generated opening line — regenerated each time a fresh conversation opens.
  const [greeting, setGreeting] = useState<string | null>(null);
  const [greetingLoading, setGreetingLoading] = useState(false);
  // Stable conversation ID — persists across open/close; only reset on explicit "New Chat".
  const convoRef = useRef<string>(newId());
  const scrollRef = useRef<HTMLDivElement>(null);
  // Mirror of messages for synchronous reads (history) without effect re-runs.
  const messagesRef = useRef<Msg[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  // ── Proactive "mood" nudges ─────────────────────────────────────────────────
  const { loadPool, nextNudge } = useChatNudges(userId, courses, specializations);
  const [activeNudge, setActiveNudge] = useState<ActiveNudge | null>(null);
  const [tugging, setTugging] = useState(false);
  // Pre-fills the chat input when a nudge is tapped (key forces re-trigger on repeats).
  const [prefill, setPrefill] = useState<{ text: string; key: number } | null>(null);
  // Once the user opens the chat, we stop nudging entirely (they're engaged).
  const openedOnceRef = useRef(false);
  const nudgeCountRef = useRef(0);
  const activeNudgeRef = useRef<ActiveNudge | null>(null);
  const ttlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fireNudgeRef = useRef<() => void>(() => {});

  const clearNudge = useCallback(() => {
    if (ttlTimerRef.current) {
      clearTimeout(ttlTimerRef.current);
      ttlTimerRef.current = null;
    }
    setActiveNudge(null);
    activeNudgeRef.current = null;
  }, []);

  // Fetch a freshly-generated opening line. Cheap, non-critical: any failure falls
  // back to a static greeting so the widget always has something to show.
  const loadGreeting = useCallback(async () => {
    setGreetingLoading(true);
    setGreeting(null);
    try {
      const res = await fetch('/api/chat/intro', { method: 'POST' });
      const data = await res.json().catch(() => null);
      setGreeting((data?.greeting as string | undefined)?.trim() || FALLBACK_GREETING);
    } catch {
      setGreeting(FALLBACK_GREETING);
    } finally {
      setGreetingLoading(false);
    }
  }, []);

  const openWidget = useCallback(() => {
    setOpen(true);
    openedOnceRef.current = true; // engaged — no more proactive nudges this session
    clearNudge();
    trackEvent('chatbot_opened', { specializations });
    // Only (re)generate the greeting when opening onto a fresh conversation.
    if (messagesRef.current.length === 0) void loadGreeting();
  }, [trackEvent, specializations, loadGreeting, clearNudge]);

  // Tapping the bubble opens the chat and pre-fills the seeded question (not sent).
  const onNudgeActivate = useCallback(() => {
    const n = activeNudgeRef.current;
    clearNudge();
    openWidget();
    if (n) {
      trackEvent('chatbot_nudge_clicked', { type: n.type, course: n.courseCode ?? undefined });
      setPrefill({ text: n.seedQuestion, key: Date.now() });
    }
  }, [openWidget, trackEvent, clearNudge]);

  const onNudgeDismiss = useCallback(() => {
    const n = activeNudgeRef.current;
    if (n) trackEvent('chatbot_nudge_dismissed', { type: n.type, course: n.courseCode ?? undefined });
    clearNudge();
  }, [trackEvent, clearNudge]);

  // Keep a live closure of the firing logic so the scheduler (set up once) always sees
  // current state without restarting its timers.
  fireNudgeRef.current = () => {
    if (open || openedOnceRef.current) return; // chat open/engaged → stay quiet
    if (nudgeCountRef.current >= NUDGE_MAX_PER_SESSION) return;
    if (activeNudgeRef.current) return; // a bubble is already showing
    const n = nextNudge();
    if (!n) return;
    setTugging(true);
    setTimeout(() => setTugging(false), NUDGE_TUG_MS);
    // Reveal the bubble on the tug's rebound.
    setTimeout(() => {
      if (openedOnceRef.current || activeNudgeRef.current) return;
      setActiveNudge(n);
      activeNudgeRef.current = n;
      nudgeCountRef.current += 1;
      trackEvent('chatbot_nudge_shown', { type: n.type, course: n.courseCode ?? undefined });
      ttlTimerRef.current = setTimeout(clearNudge, NUDGE_TTL);
    }, NUDGE_REVEAL_MS);
  };

  // Scheduler: fetch the pool, fire the first nudge after a short idle, then on a gentle
  // cadence. Torn down on unmount or when the student's selection signature changes.
  useEffect(() => {
    if (!userId) return;
    void loadPool();
    const first = setTimeout(() => {
      fireNudgeRef.current();
      intervalRef.current = setInterval(() => fireNudgeRef.current(), NUDGE_INTERVAL);
    }, NUDGE_FIRST_DELAY);
    return () => {
      clearTimeout(first);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (ttlTimerRef.current) clearTimeout(ttlTimerRef.current);
    };
  }, [userId, loadPool]);

  const startNewChat = useCallback(() => {
    convoRef.current = newId();
    setMessages([]);
    trackEvent('chatbot_new_chat');
    void loadGreeting();
  }, [trackEvent, loadGreeting]);

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
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={startNewChat}
                  aria-label="New chat"
                  title="New chat"
                >
                  <SquarePen className="size-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" onClick={closeWidget} aria-label="Close chat">
                <X />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                {greetingLoading ? (
                  <div className="flex w-fit max-w-[85%] flex-col gap-1.5 rounded-2xl bg-muted px-3.5 py-2.5">
                    <span className="h-3 w-44 animate-pulse rounded bg-muted-foreground/20" />
                    <span className="h-3 w-32 animate-pulse rounded bg-muted-foreground/20" />
                  </div>
                ) : (
                  <ChatMessage role="assistant" content={greeting ?? FALLBACK_GREETING} />
                )}

                {courses.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-2.5 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground px-0.5">Your courses this term</p>
                    <div className="space-y-1">
                      {courses.map((c) => (
                        <button
                          key={c.id}
                          disabled={busy}
                          onClick={() => onSend(`Tell me about ${c.code ?? c.name}`)}
                          className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-muted/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground bg-muted rounded px-1 py-0.5 tabular-nums">
                            Wk {c.week}
                          </span>
                          <span className="flex-1 font-medium truncate">{c.name}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatShortDate(c.startDate)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

          <ChatInput disabled={busy} onSend={onSend} prefill={prefill ?? undefined} />
        </div>
      )}

      {/* Proactive nudge bubble — only while the chat is closed */}
      {activeNudge && !open && (
        <NudgeBubble nudge={activeNudge} onActivate={onNudgeActivate} onDismiss={onNudgeDismiss} />
      )}

      {/* Launcher */}
      <Button
        size="icon-lg"
        onClick={open ? closeWidget : openWidget}
        aria-label={open ? 'Close course assistant' : 'Open course assistant'}
        className={`size-12 rounded-full shadow-lg${tugging ? ' animate-launcher-nudge' : ''}`}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </div>
  );
}
