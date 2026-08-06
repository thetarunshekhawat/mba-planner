// Server-only wrapper around `web-push`.
//
// Never import this from a client component — it pulls in Node crypto and holds
// the VAPID private key. Every route that calls it declares
// `export const runtime = 'nodejs'`.
//
// ── Failure handling is the interesting part ────────────────────────────────
// A push endpoint is not a durable address. Browsers rotate them, users clear
// site data, devices get wiped. The push service reports this as 404 or 410,
// and those are *permanent*: retrying forever means every dispatcher run wastes
// requests on subscriptions that will never work again. So 404/410 disables
// immediately.
//
// Everything else (500s, timeouts, rate limits) is treated as transient and
// only increments a counter, because discarding a working subscription over one
// bad night would silently stop a student's reminders with nothing to show for
// it. Five consecutive failures is the point where "transient" stops being a
// reasonable explanation.

import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PushSubscriptionRow } from '@/types';

const MAX_FAILURES = 5;

let configured = false;

/** True when the VAPID keys are present. Routes check this before sending. */
export function isPushConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

function configure() {
  if (configured) return;
  if (!isPushConfigured()) throw new Error('VAPID keys are not configured');
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string | null;
  tag?: string;
}

export type PushOutcome = 'sent' | 'expired' | 'failed';

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Sends to one subscription and records the consequence.
 *
 * Returns the outcome rather than throwing, because one dead subscription must
 * not abort a fan-out to ninety-nine live ones.
 */
export async function sendToSubscription(
  db: SupabaseClient<any, any, any>,
  sub: PushSubscriptionRow,
  payload: PushPayload,
): Promise<PushOutcome> {
  configure();

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 24 * 60 * 60 },
    );
    // A success clears the failure history — the counter is meant to measure a
    // *run* of failures, not a lifetime total.
    if (sub.failure_count > 0) {
      await db.from('push_subscriptions').update({ failure_count: 0 }).eq('id', sub.id);
    }
    return 'sent';
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;

    if (status === 404 || status === 410) {
      await db
        .from('push_subscriptions')
        .update({ disabled_at: new Date().toISOString() })
        .eq('id', sub.id);
      return 'expired';
    }

    const next = (sub.failure_count ?? 0) + 1;
    await db
      .from('push_subscriptions')
      .update({
        failure_count: next,
        disabled_at: next >= MAX_FAILURES ? new Date().toISOString() : null,
      })
      .eq('id', sub.id);
    return 'failed';
  }
}

/**
 * Fans out to every live subscription a student has, at most `limit` at a time.
 *
 * The concurrency cap exists because a student with several devices multiplied
 * by a backlog of reminders can otherwise open hundreds of sockets in one
 * serverless invocation.
 */
export async function sendToUser(
  db: SupabaseClient<any, any, any>,
  subs: PushSubscriptionRow[],
  payload: PushPayload,
  limit = 10,
): Promise<{ sent: number; expired: number; failed: number }> {
  const totals = { sent: 0, expired: 0, failed: 0 };
  for (let i = 0; i < subs.length; i += limit) {
    const batch = subs.slice(i, i + limit);
    const results = await Promise.all(
      batch.map((s) => sendToSubscription(db, s, payload)),
    );
    for (const r of results) totals[r]++;
  }
  return totals;
}
