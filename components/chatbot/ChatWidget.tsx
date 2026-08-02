'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Sparkles, SquarePen, Copy, Check } from 'lucide-react';
import type { Course, SpecId } from '@/types';
import type { EventType } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import { useChatNudges, type ActiveNudge } from '@/hooks/useChatNudges';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';
import { DisambiguationChips, type Chip } from './DisambiguationChips';
import { ActionChips } from './ActionChips';
import { NudgeBubble } from './NudgeBubble';
import { ACTIONS_SENTINEL, type ChatAction } from '@/lib/chat/actions';
import { isCourseCompleted } from '@/lib/terms';

type TrackEvent = (eventType: EventType, payload?: Record<string, unknown>) => void;

// Proactive-nudge cadence (Gentle): first tug shortly after landing, then occasional,
// capped per session, and only while the chat has never been opened.
const NUDGE_FIRST_DELAY  = 2500;   // ms after mount
const NUDGE_INTERVAL     = 35_000; // ms between subsequent nudges (deterministic engine → free, so show more often)
const NUDGE_MAX_PER_SESSION = 8;
const NUDGE_REVEAL_MS    = 360;    // bubble appears on animation's rebound
const NUDGE_FADE_OUT_MS  = 260;    // bubble exit animation duration
const NUDGE_GAP_MS       = 2000;   // pause after old bubble exits before new one appears
const PERSONALITY_MIN_MS = 5000;   // random idle animation min interval
const PERSONALITY_MAX_MS = 7000;   // random idle animation max interval

const LAUNCHER_ANIMS = [
  { cls: 'animate-launcher-bounce-lr',      weight: 28 },
  { cls: 'animate-launcher-bounce-lr-hard', weight: 10 },
  { cls: 'animate-launcher-bounce-tb',      weight: 22 },
  { cls: 'animate-launcher-bounce-tb-hard', weight: 8  },
  { cls: 'animate-launcher-shake',          weight: 18 },
  { cls: 'animate-launcher-shake-hard',     weight: 7  },
  { cls: 'animate-launcher-jiggle',         weight: 7  },
] as const;

function pickAnim(): string {
  const total = LAUNCHER_ANIMS.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  for (const a of LAUNCHER_ANIMS) { r -= a.weight; if (r <= 0) return a.cls; }
  return LAUNCHER_ANIMS[0].cls;
}

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  chips?: Chip[];
  pendingQuestion?: string;
  actions?: ChatAction[];
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
  plannedCourses,
  specializations,
  trackEvent,
  onAction,
}: {
  userId: string | null;
  /** The student's locked courses for the current term, ordered by occurrence. */
  courses: Course[];
  /**
   * Every course the student has selected, across all terms. The nudge pool is built
   * server-side from the full selection, so the cache signature has to track the full
   * selection too — otherwise picking a Term 5 course during bidding leaves a stale pool
   * in place for the rest of the session.
   */
  plannedCourses?: Course[];
  /** The student's specialization(s) — used for analytics on open. */
  specializations: SpecId[];
  trackEvent: TrackEvent;
  /** Runs a chat action the bot proposed (export, etc.). Links open on their own. */
  onAction: (action: ChatAction) => void;
}) {
  const [open, setOpen] = useState(false);
  // Keeps the panel mounted through its "genie" retract animation after open flips false.
  const [closing, setClosing] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
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
  }, [messages, open, busy]);

  // Greeting course list: the courses still ahead of the student come first, finished ones sink
  // to the bottom marked "Done". They stay tappable — asking about a course you just finished is
  // fair — but they no longer sit at the top of the list as if they were the thing to prep for.
  const greetingCourses = useMemo(
    () =>
      courses
        .map((course) => ({ course, done: isCourseCompleted(course) }))
        .sort((a, b) => Number(a.done) - Number(b.done)),
    [courses],
  );

  // ── Proactive "mood" nudges ─────────────────────────────────────────────────
  const { loadPool, nextNudge } = useChatNudges(userId, courses, specializations, plannedCourses ?? courses);
  const [activeNudge, setActiveNudge] = useState<ActiveNudge | null>(null);
  const [launcherAnim, setLauncherAnim] = useState<string | null>(null);
  const [nudgeFadingOut, setNudgeFadingOut] = useState(false);
  // Pre-fills the chat input when a nudge is tapped (key forces re-trigger on repeats).
  const [prefill, setPrefill] = useState<{ text: string; key: number } | null>(null);
  // Session timing for engagement analytics
  const openTimeRef = useRef<number | null>(null);
  const firstMsgTrackedRef = useRef(false);
  // Once the user opens the chat, we stop nudging entirely (they're engaged).
  const openedOnceRef = useRef(false);
  const nudgeCountRef = useRef(0);
  const activeNudgeRef = useRef<ActiveNudge | null>(null);
  const ttlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fireNudgeRef = useRef<() => void>(() => {});
  // Stale-closure guard: personality timer reads this ref so it always sees current open state.
  const openRef = useRef(false);
  openRef.current = open;

  const clearNudge = useCallback(() => {
    if (ttlTimerRef.current) {
      clearTimeout(ttlTimerRef.current);
      ttlTimerRef.current = null;
    }
    setNudgeFadingOut(false);
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
    setClosing(false);
    setOpen(true);
    openedOnceRef.current = true; // engaged — no more proactive nudges this session
    openTimeRef.current = Date.now();
    firstMsgTrackedRef.current = false;
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
    const n = nextNudge();
    if (!n) return;

    const showNudge = () => {
      if (openedOnceRef.current) return;
      setLauncherAnim(pickAnim());
      // Reveal bubble on the animation's rebound.
      setTimeout(() => {
        if (openedOnceRef.current || activeNudgeRef.current) return;
        setActiveNudge(n);
        activeNudgeRef.current = n;
        nudgeCountRef.current += 1;
        trackEvent('chatbot_nudge_shown', { type: n.type, course: n.courseCode ?? undefined });
      }, NUDGE_REVEAL_MS);
    };

    if (activeNudgeRef.current) {
      // Fade existing bubble out, gap, then show new one.
      setNudgeFadingOut(true);
      if (ttlTimerRef.current) clearTimeout(ttlTimerRef.current);
      ttlTimerRef.current = setTimeout(() => {
        setNudgeFadingOut(false);
        setActiveNudge(null);
        activeNudgeRef.current = null;
        ttlTimerRef.current = setTimeout(showNudge, NUDGE_GAP_MS);
      }, NUDGE_FADE_OUT_MS);
    } else {
      showNudge();
    }
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

  // Personality timer: makes the icon animate randomly every 5–7 s while chat is closed,
  // giving it a sense of life regardless of the nudge scheduler.
  useEffect(() => {
    if (!userId) return;
    let id: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = PERSONALITY_MIN_MS + Math.random() * (PERSONALITY_MAX_MS - PERSONALITY_MIN_MS);
      id = setTimeout(() => {
        if (!openRef.current) {
          setLauncherAnim((prev) => prev ?? pickAnim());
        }
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(id);
  }, [userId]);

  const startNewChat = useCallback(() => {
    convoRef.current = newId();
    setMessages([]);
    trackEvent('chatbot_new_chat');
    void loadGreeting();
  }, [trackEvent, loadGreeting]);

  const closeWidget = useCallback(() => {
    setOpen(false);
    // Play the retract animation unless the user prefers reduced motion (where the
    // exit keyframes are disabled and onAnimationEnd would never fire to unmount).
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setClosing(!reduce);
    trackEvent('chatbot_closed');
    if (openTimeRef.current !== null) {
      const duration_ms = Date.now() - openTimeRef.current;
      const message_count = messagesRef.current.filter(m => m.role === 'user').length;
      trackEvent('chatbot_session_ended', { duration_ms, message_count, had_interaction: message_count > 0 });
      openTimeRef.current = null;
    }
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
          if (data?.type === 'action') {
            setMessages((prev) => [
              ...prev,
              {
                id: newId(),
                role: 'assistant',
                content: data.message ?? '',
                actions: (data.actions ?? []) as ChatAction[],
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

        // Streaming plain-text answer. The server may append a trailing actions frame
        // (ACTIONS_SENTINEL + JSON) after the prose — split it off so it's never shown.
        const asstId = newId();
        setMessages((prev) => [...prev, { id: asstId, role: 'assistant', content: '', streaming: true }]);
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let sawSentinel = false;
        let actionBuf = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          if (sawSentinel) {
            actionBuf += chunk;
            continue;
          }
          const idx = chunk.indexOf(ACTIONS_SENTINEL);
          if (idx === -1) {
            setMessages((prev) =>
              prev.map((m) => (m.id === asstId ? { ...m, content: m.content + chunk } : m)),
            );
          } else {
            sawSentinel = true;
            const textPart = chunk.slice(0, idx);
            actionBuf += chunk.slice(idx + ACTIONS_SENTINEL.length);
            if (textPart) {
              setMessages((prev) =>
                prev.map((m) => (m.id === asstId ? { ...m, content: m.content + textPart } : m)),
              );
            }
          }
        }
        let parsedActions: ChatAction[] | undefined;
        if (actionBuf.trim()) {
          try {
            parsedActions = JSON.parse(actionBuf).actions as ChatAction[];
          } catch {
            /* malformed frame — drop it, the prose still stands */
          }
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === asstId ? { ...m, streaming: false, actions: parsedActions } : m)),
        );
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
      if (!firstMsgTrackedRef.current && openTimeRef.current !== null) {
        firstMsgTrackedRef.current = true;
        trackEvent('chatbot_first_message_delay', { delay_ms: Date.now() - openTimeRef.current });
      }
      const prior = messagesRef.current;
      setMessages((prev) => [...prev, { id: newId(), role: 'user', content: text }]);
      void request(text, null, prior);
    },
    [request, trackEvent],
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

  const handleAction = useCallback(
    (action: ChatAction) => {
      trackEvent('chatbot_action_clicked', {
        action: action.type,
        ...(action.type === 'open_link' ? { course: action.courseCode } : {}),
        ...(action.type === 'export_subscription' ? { provider: action.provider } : {}),
        ...(action.type === 'navigate' ? { target: action.target } : {}),
        ...(action.type === 'ask' ? { label: action.label } : {}),
      });
      // A drill-down chip just sends its question as the next message.
      if (action.type === 'ask') {
        onSend(action.question);
        return;
      }
      onAction(action);
    },
    [trackEvent, onAction, onSend],
  );

  if (!userId) return null;

  // Show the "typing" dots while a request is in flight and no answer text has
  // streamed back yet — covers both the pre-response wait and the empty streaming
  // placeholder. Flips off the moment the first chunk lands or a reply is appended.
  const lastMsg = messages[messages.length - 1];
  const showTyping =
    busy &&
    (!lastMsg ||
      lastMsg.role === 'user' ||
      (lastMsg.role === 'assistant' && !!lastMsg.streaming && !lastMsg.content));

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end print:hidden">
      {(open || closing) && (
        <div
          className={`mb-3 flex h-[min(72vh,40rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl ${closing ? 'animate-genie-out' : 'animate-genie-in'}`}
          onAnimationEnd={(e) => {
            if (e.animationName === 'genie-out') setClosing(false);
          }}
        >
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
                      {greetingCourses.map(({ course: c, done }) => (
                        <button
                          key={c.id}
                          disabled={busy}
                          onClick={() => setPrefill({ text: `${c.name} `, key: Date.now() })}
                          className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-muted/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed${
                            done ? ' opacity-55' : ''
                          }`}
                        >
                          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground bg-muted rounded px-1 py-0.5 tabular-nums">
                            {done ? 'Done' : `Wk ${c.week}`}
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

            {messages.map((m) => {
              // Empty streaming placeholder is represented by the typing indicator below.
              if (m.role === 'assistant' && m.streaming && !m.content) return null;
              return (
              <div key={m.id} className="space-y-1">
                <div className="group relative">
                  <ChatMessage role={m.role} content={m.content} streaming={m.streaming} />
                  {m.role === 'assistant' && !m.streaming && m.content && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(m.content);
                        trackEvent('chatbot_message_copied');
                        setCopiedMsgId(m.id);
                        setTimeout(() => setCopiedMsgId(prev => prev === m.id ? null : prev), 1500);
                      }}
                      className="absolute -bottom-1 right-1 hidden group-hover:flex items-center justify-center rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      aria-label="Copy message"
                      title="Copy"
                    >
                      {copiedMsgId === m.id
                        ? <Check className="size-3 text-green-400" />
                        : <Copy className="size-3" />}
                    </button>
                  )}
                </div>
                {m.chips && m.chips.length > 0 && (
                  <DisambiguationChips
                    courses={m.chips}
                    disabled={busy}
                    onPick={(chip) => onPickChip(m.id, chip, m.pendingQuestion ?? '')}
                  />
                )}
                {m.actions && m.actions.length > 0 && (
                  <ActionChips actions={m.actions} onAction={handleAction} disabled={busy} />
                )}
              </div>
              );
            })}

            {showTyping && <TypingIndicator />}
          </div>

          <ChatInput disabled={busy} onSend={onSend} prefill={prefill ?? undefined} myCourses={courses} />
        </div>
      )}

      {/* Proactive nudge bubble — only while the chat is closed */}
      {activeNudge && !open && (
        <NudgeBubble
          nudge={activeNudge}
          onActivate={onNudgeActivate}
          onDismiss={onNudgeDismiss}
          fadingOut={nudgeFadingOut}
        />
      )}

      {/* Launcher */}
      <Button
        size="icon-lg"
        onClick={open ? closeWidget : openWidget}
        aria-label={open ? 'Close course assistant' : 'Open course assistant'}
        className={`size-12 rounded-full shadow-lg${launcherAnim ? ` ${launcherAnim}` : ''}`}
        onAnimationEnd={() => setLauncherAnim(null)}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </div>
  );
}
