// GET|POST /api/alerts/dispatch — work out what is due and send it.
//
// One handler for two drivers:
//   • Vercel cron (GET) — daily only on Hobby, so it is the safety net, not
//     the plan. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically
//     once that env var exists.
//   • GitHub Actions (POST) — every 15 minutes, the real driver.
//
// Both present the same bearer token, so one guard covers both. `/api/keepalive`
// stays deliberately open; this one must not, because it sends notifications to
// real phones.
//
// ── The run ────────────────────────────────────────────────────────────────
// load state (paged) → computeOccurrences → filter due → cap → upsert into the
// ledger with ignoreDuplicates → push ONLY the rows that came back as newly
// inserted → report counts.
//
// That last step is the whole idempotency story. `alert_deliveries` has
// UNIQUE (user_id, dedupe_key); the upsert returns only rows it actually
// created, so two dispatchers racing each other send exactly one notification
// between them, and a retry after a timeout sends nothing.

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/lib/alerts/paging';
import { computeOccurrences, type DispatchInput, type DispatchTrack, type Occurrence } from '@/lib/alerts/schedule';
import { courseDeadlineItems } from '@/lib/alerts/courseDeadlines';
import { isPushConfigured, sendToUser } from '@/lib/alerts/push';
import type {
  AlertReminderRule, AlertRoundOutcome, AlertTrack, Competition,
  CompetitionRound, CustomDeadline, PushSubscriptionRow,
} from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Oldest-first, so a backlog drains rather than timing out on the same head. */
const MAX_PER_RUN = 300;
const LEDGER_CHUNK = 100;
/** Rounds outside this window can't have a reminder due now. */
const WINDOW_DAYS = 14;

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // fail closed — unset must never mean "open"

  const header = request.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function run() {
  const startedAt = Date.now();
  const now = new Date();

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 864e5).toISOString();
  const windowEnd = new Date(now.getTime() + WINDOW_DAYS * 864e5).toISOString();

  // Every read is paged: PostgREST silently caps at 1000 rows, and a dispatcher
  // that quietly skipped the 1001st student would be invisible.
  const [tracks, competitions, rounds, rules, outcomes, deadlines, selections] = await Promise.all([
    fetchAllRows<AlertTrack>(() => db.from('alert_tracks').select('*')
      .eq('status', 'active').eq('notifications_enabled', true).order('id')),
    fetchAllRows<Competition>(() => db.from('competitions').select('*').order('id')),
    fetchAllRows<CompetitionRound>(() => db.from('competition_rounds').select('*')
      .is('retired_at', null).order('id')),
    fetchAllRows<AlertReminderRule>(() => db.from('alert_reminder_rules').select('*').order('id')),
    fetchAllRows<AlertRoundOutcome>(() => db.from('alert_round_outcomes').select('*').order('id')),
    fetchAllRows<CustomDeadline>(() => db.from('custom_deadlines').select('*')
      .is('completed_at', null).gte('due_at', windowStart).lte('due_at', windowEnd).order('id')),
    fetchAllRows<{ user_id: string; course_id: number }>(() =>
      db.from('course_selections').select('user_id, course_id').order('user_id')),
  ]);

  const compById = new Map(competitions.map((c) => [c.id, c]));
  const roundsByComp = new Map<string, CompetitionRound[]>();
  for (const r of rounds) {
    const list = roundsByComp.get(r.competition_id) ?? [];
    list.push(r);
    roundsByComp.set(r.competition_id, list);
  }
  const rulesByTrack = new Map<string, AlertReminderRule[]>();
  for (const r of rules) {
    const list = rulesByTrack.get(r.track_id) ?? [];
    list.push(r);
    rulesByTrack.set(r.track_id, list);
  }

  // Group everything by user, then evaluate one student at a time.
  const userIds = new Set<string>([
    ...tracks.map((t) => t.user_id),
    ...deadlines.map((d) => d.user_id),
    ...selections.map((s) => s.user_id),
  ]);

  const occurrences: Occurrence[] = [];
  for (const userId of userIds) {
    const myTracks: DispatchTrack[] = tracks
      .filter((t) => t.user_id === userId)
      .map((track) => {
        const competition = compById.get(track.competition_id);
        if (!competition) return null;
        const compRounds = roundsByComp.get(track.competition_id) ?? [];
        const roundIds = new Set(compRounds.map((r) => r.id));
        return {
          track,
          competition,
          rounds: compRounds,
          rules: rulesByTrack.get(track.id) ?? [],
          outcomes: outcomes.filter((o) => o.user_id === userId && roundIds.has(o.round_id)),
        };
      })
      .filter((t): t is DispatchTrack => t !== null);

    const mySelections = new Set(
      selections.filter((s) => s.user_id === userId).map((s) => s.course_id),
    );

    const input: DispatchInput = {
      userId,
      tracks: myTracks,
      customDeadlines: deadlines.filter((d) => d.user_id === userId),
      courseItems: courseDeadlineItems(mySelections, now),
    };
    occurrences.push(...computeOccurrences(input, now));
  }

  // computeOccurrences already only emits what is due; sort oldest-first and cap
  // so one run can't blow maxDuration on a backlog.
  const due = occurrences.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const batch = due.slice(0, MAX_PER_RUN);

  let inserted: Occurrence[] = [];
  for (let i = 0; i < batch.length; i += LEDGER_CHUNK) {
    const chunk = batch.slice(i, i + LEDGER_CHUNK);
    const { data, error } = await db
      .from('alert_deliveries')
      .upsert(
        chunk.map((o) => ({
          user_id: o.userId,
          dedupe_key: o.dedupeKey,
          kind: o.kind,
          title: o.title,
          body: o.body,
          url: o.url,
          due_at: o.dueAt,
          anchor_at: o.anchorAt,
          status: o.status,
        })),
        { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true },
      )
      .select('user_id, dedupe_key');

    if (error) continue;
    // Only rows this call actually created come back. Anything already in the
    // ledger was handled by a previous run (or a racing one) and must not be
    // sent again.
    const createdKeys = new Set((data ?? []).map((r) => `${r.user_id}|${r.dedupe_key}`));
    inserted.push(...chunk.filter((o) => createdKeys.has(`${o.userId}|${o.dedupeKey}`)));
  }

  // `skipped_stale` rows exist purely to burn their key — they send nothing.
  // This is what stops an overnight outage producing a 3am burst about
  // deadlines that have already passed.
  const toSend = inserted.filter((o) => o.status === 'sent');
  const stale = inserted.filter((o) => o.status === 'skipped_stale').length;

  let pushed = 0;
  let failed = 0;

  if (isPushConfigured() && toSend.length > 0) {
    const subs = await fetchAllRows<PushSubscriptionRow>(() =>
      db.from('push_subscriptions').select('*').is('disabled_at', null).order('id'));

    const subsByUser = new Map<string, PushSubscriptionRow[]>();
    for (const s of subs) {
      const list = subsByUser.get(s.user_id) ?? [];
      list.push(s);
      subsByUser.set(s.user_id, list);
    }

    for (const o of toSend) {
      const mine = subsByUser.get(o.userId) ?? [];
      if (mine.length === 0) continue;
      const result = await sendToUser(db, mine, {
        title: o.title,
        body: o.body,
        url: o.url,
        tag: o.dedupeKey,
      });
      pushed += result.sent;
      failed += result.failed + result.expired;
    }
  }

  return {
    ok: true,
    ran_at: now.toISOString(),
    scanned: userIds.size,
    due: due.length,
    inserted: inserted.length,
    sent: toSend.length,
    pushed,
    stale,
    failed,
    capped: due.length > MAX_PER_RUN,
    ms: Date.now() - startedAt,
  };
}

async function handle(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await run();
    // The only observability this feature gets — a rising `stale` means the
    // 15-minute driver has stopped running.
    console.log('[alerts/dispatch]', JSON.stringify(result));
    return NextResponse.json(result);
  } catch (e) {
    console.error('[alerts/dispatch] failed', e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
