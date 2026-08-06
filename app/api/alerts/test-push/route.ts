// POST /api/alerts/test-push — send one notification to the caller's devices.
//
// The push chain has five links: a registered service worker, granted
// permission, a stored subscription, correct VAPID keys, and a reachable push
// service. A break in any of them looks exactly like "no reminders are due yet",
// which is why this button exists — it is the only way a student can tell the
// difference.
//
// Sends only to the caller's own subscriptions. There is deliberately no
// user_id parameter.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isPushConfigured, sendToUser } from '@/lib/alerts/push';
import type { PushSubscriptionRow } from '@/types';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: 'Push is not configured on this deployment.', sent: 0 },
      { status: 503 },
    );
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .is('disabled_at', null);

  const rows = (subs as PushSubscriptionRow[]) ?? [];
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "This device isn't subscribed yet. Turn notifications on first.", sent: 0 },
      { status: 400 },
    );
  }

  // The send itself needs the service role: lib/alerts/push writes back
  // failure_count and disabled_at, and the student's own session is blocked
  // from doing that by the demo RESTRICTIVE policies for some accounts.
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const result = await sendToUser(service, rows, {
    title: 'MBA Planner',
    body: 'Notifications are working. This is what a deadline reminder will look like.',
    url: '/planner',
    tag: 'test-push',
  });

  return NextResponse.json({ ...result, sent: result.sent });
}
