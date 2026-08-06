// POST /api/alerts/subscribe — store this browser's push subscription.
//
// Body: { subscription: PushSubscriptionJSON, userAgent?: string }
//
// The endpoint is globally unique (migration 018), because it IS the identity
// of a push target. The same browser re-subscribing must update the existing
// row rather than insert a second one, or every notification arrives twice.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface Body {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  userAgent?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Incomplete subscription' }, { status: 400 });
  }

  // Re-subscribing clears disabled_at and the failure count: the browser has
  // just told us this endpoint is live, which is better evidence than whatever
  // made us give up on it before.
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: body.userAgent?.slice(0, 500) ?? null,
        failure_count: 0,
        disabled_at: null,
      },
      { onConflict: 'endpoint' },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
