import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ALL_COURSES } from '@/data/courses';
import { getCurrentTerm, getTermCourses } from '@/lib/terms';
import { classifyIntent } from '@/lib/chat/router';
import { buildMessages, type PriorTurn } from '@/lib/chat/prompt';
import { streamCompletion, ProviderError, isConfigured, CHAT_MODEL } from '@/lib/chat/nemotron';
import { fetchFriends, buildFriendComparison, type FriendComparisonRow } from '@/lib/chat/friends';
import { buildSpecProgress } from '@/lib/chat/progress';
import {
  type ChatAction,
  outlineLinkAction,
  exportActions,
  friendAskActions,
  encodeActionsFrame,
} from '@/lib/chat/actions';
import type { SpecId } from '@/types';

const MAX_MESSAGE_LEN = 2000;
const MAX_HISTORY_TURNS = 6;
const RATE_LIMIT_PER_MIN = 8; // messages per user per 60s

const FALLBACK_BUSY =
  "Sorry — I couldn't reach the model just now (the free tier may be busy). Please try again in a moment.";

interface ChatBody {
  message?: string;
  conversationId?: string;
  courseCode?: string | null;
  history?: PriorTurn[];
}

function sanitizeHistory(history: unknown): PriorTurn[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (h): h is PriorTurn =>
        !!h &&
        typeof h === 'object' &&
        (h as PriorTurn).role !== undefined &&
        ((h as PriorTurn).role === 'user' || (h as PriorTurn).role === 'assistant') &&
        typeof (h as PriorTurn).content === 'string',
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((h) => ({ role: h.role, content: h.content.slice(0, MAX_MESSAGE_LEN) }));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const message = (body.message ?? '').trim();
  if (!message) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  const conversationId = body.conversationId || crypto.randomUUID();
  const courseCode = body.courseCode ?? null;
  const history = sanitizeHistory(body.history);

  // ── Rate limit (mirrors app/api/calendar/route.ts) ─────────────────────────
  await supabase.from('user_events').insert({
    user_id: user.id,
    event_type: 'chatbot_message_sent',
    payload: { conversation_id: conversationId },
  });

  const { count } = await supabase
    .from('user_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'chatbot_message_sent')
    .gte('occurred_at', new Date(Date.now() - 60_000).toISOString());

  if (count && count > RATE_LIMIT_PER_MIN) {
    await supabase.from('security_events').insert({
      actor_id: user.id,
      event_type: 'chatbot_rate_limit',
      payload: { count_in_60s: count },
    });
    await supabase.from('user_events').insert({
      user_id: user.id,
      event_type: 'chatbot_rate_limited',
      payload: { count_in_60s: count },
    });
    return NextResponse.json(
      { error: "You're sending messages very fast — please slow down for a minute." },
      { status: 429 },
    );
  }

  // ── Resolve the student's selected courses + profile context ───────────────
  const { data: selRows } = await supabase
    .from('course_selections')
    .select('course_id')
    .eq('user_id', user.id);
  const selectedIds = new Set((selRows ?? []).map((r) => r.course_id as number));
  const selectedCourses = ALL_COURSES.filter((c) => selectedIds.has(c.id));

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('specializations')
    .eq('id', user.id)
    .maybeSingle();
  const specializations = ((profileRow?.specializations as SpecId[] | undefined) ?? []);
  const currentTerm = getCurrentTerm();
  const studentContext = {
    specializations,
    currentTerm,
    termCourses: getTermCourses(selectedIds, currentTerm),
    allSelected: selectedCourses,
  };

  // Confirmed friends (names only) — cheap, used to route messages that mention a
  // friend by name. The heavier "what are they taking" query is deferred to the
  // friend_compare branch below so non-social messages stay lean.
  const friends = await fetchFriends(supabase, user.id);

  // ── Route intent ───────────────────────────────────────────────────────────
  const intent = classifyIntent(
    message,
    selectedCourses,
    courseCode,
    friends.map((f) => f.name),
  );

  // Persist the user's message (so admins see what was asked, even on errors).
  const userIntentLabel = intent.type;
  const userCourseCode = intent.type === 'course_specific' ? (intent.course.code ?? null) : null;
  await supabase.from('chatbot_messages').insert({
    user_id: user.id,
    conversation_id: conversationId,
    role: 'user',
    content: message,
    course_code: userCourseCode,
    intent: userIntentLabel,
  });

  // ── Disambiguation: return tappable course chips, no LLM call ───────────────
  if (intent.type === 'disambiguation') {
    await supabase.from('user_events').insert({
      user_id: user.id,
      event_type: 'chatbot_disambiguation_shown',
      payload: { conversation_id: conversationId, options: intent.courses.length },
    });
    return NextResponse.json({
      type: 'disambiguation',
      conversationId,
      courses: intent.courses.map((c) => ({ code: c.code, name: c.name })),
      message:
        intent.courses.length > 0
          ? 'Which course do you mean?'
          : "You haven't selected any courses yet. Tell me a course by name, or select some in the planner first.",
    });
  }

  // ── Export: deterministic action chips, no LLM call ────────────────────────
  if (intent.type === 'export') {
    await supabase.from('user_events').insert({
      user_id: user.id,
      event_type: 'chatbot_export_offered',
      payload: { conversation_id: conversationId },
    });
    await supabase.from('chatbot_messages').insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: 'assistant',
      content:
        'You can export your schedule with the buttons below. Tip: choose which terms to include first in the Export dialog (My Schedule tab).',
      intent: userIntentLabel,
    });
    return NextResponse.json({
      type: 'action',
      conversationId,
      message:
        'You can export your schedule with the buttons below. Tip: choose which terms to include first in the Export dialog (My Schedule tab).',
      actions: exportActions(),
    });
  }

  // ── Build the prompt (fetch outline text from Supabase for course questions) ─
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'The assistant is not configured yet (missing model API key).' },
      { status: 503 },
    );
  }

  // Friend comparison + spec-fit options are computed deterministically and injected
  // as context; the model narrates them but never invents the numbers.
  let friendBlock: string | null = null;
  let friendRows: FriendComparisonRow[] = [];
  if (intent.type === 'friend_compare') {
    const cmp = await buildFriendComparison(supabase, friends, selectedIds);
    friendBlock = cmp.block;
    friendRows = cmp.rows;
  }
  const progressBlock =
    intent.type === 'recommend' ? buildSpecProgress(specializations, selectedIds) : null;

  let outlineText: string | null = null;
  const answerCourse = intent.type === 'course_specific' ? intent.course : null;
  if (answerCourse?.code) {
    const { data: outlineRow } = await supabase
      .from('course_outlines')
      .select('content')
      .eq('code', answerCourse.code)
      .maybeSingle();
    outlineText = (outlineRow?.content as string | undefined) ?? null;
  }

  // Actions surfaced beneath the streamed reply: outline link for course answers, and a
  // tappable chip per friend (drill into their full list) for comparison answers.
  const actions: ChatAction[] = [];
  if (answerCourse) {
    const link = outlineLinkAction(answerCourse);
    if (link) actions.push(link);
  }
  if (friendRows.length) {
    actions.push(...friendAskActions(friendRows.map((r) => r.name)));
  }

  const messages = buildMessages({
    message,
    course: answerCourse,
    outlineText,
    selectedCourses,
    studentContext,
    history,
    friendBlock,
    progressBlock,
  });

  // ── Stream the answer; persist assistant message + events on completion ─────
  const startedAt = Date.now();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = '';
      let errored = false;
      try {
        for await (const delta of streamCompletion(messages, { maxTokens: 1024 })) {
          full += delta;
          controller.enqueue(encoder.encode(delta));
        }
        // After the prose, append any action chips as a trailing sentinel frame the
        // client splits off (it never renders the frame as text).
        if (actions.length) {
          controller.enqueue(encoder.encode(encodeActionsFrame(actions)));
        }
      } catch (err) {
        errored = true;
        const is429 = err instanceof ProviderError && err.status === 429;
        const note = is429
          ? "I'm being rate-limited by the model right now. Please try again shortly."
          : FALLBACK_BUSY;
        // If nothing streamed yet, send the note so the user sees something.
        if (!full) controller.enqueue(encoder.encode(note));
        full = full || note;
        await supabase.from('user_events').insert({
          user_id: user.id,
          event_type: 'chatbot_error',
          payload: {
            conversation_id: conversationId,
            status: err instanceof ProviderError ? err.status : null,
            message: err instanceof Error ? err.message.slice(0, 300) : String(err),
          },
        });
      } finally {
        controller.close();
      }

      // Persist assistant reply + completion event (fire-and-forget).
      await supabase.from('chatbot_messages').insert({
        user_id: user.id,
        conversation_id: conversationId,
        role: 'assistant',
        content: full,
        course_code: userCourseCode,
        intent: userIntentLabel,
        model: CHAT_MODEL,
        latency_ms: Date.now() - startedAt,
      });
      if (!errored) {
        await supabase.from('user_events').insert({
          user_id: user.id,
          event_type: 'chatbot_answer_received',
          payload: {
            conversation_id: conversationId,
            intent: userIntentLabel,
            course_code: userCourseCode,
            latency_ms: Date.now() - startedAt,
            chars: full.length,
          },
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Accel-Buffering': 'no',
      'X-Chat-Intent': userIntentLabel,
      'X-Chat-Course': userCourseCode ?? '',
      'X-Conversation-Id': conversationId,
    },
  });
}
