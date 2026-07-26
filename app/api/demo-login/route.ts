// Passwordless, OTP-free sign-in for the single read-only demo account.
//
// POST /api/demo-login  { email }  →  { token_hash }
//
// Why this exists: faculty need to open the live app without waiting on a
// code sent to a mailbox nobody owns. Rather than weakening auth for
// everyone, this route mints a session for exactly one hardcoded address.
//
// How: the Supabase admin API generates a magic link *without sending an
// email* and hands back its hashed token. The browser exchanges that token
// via verifyOtp(), which produces an ordinary session. No shared password
// exists, and the token is single-use and short-lived.
//
// The email is compared against the constant, never taken on trust from the
// request body, so this route cannot be used to log in as anyone else. The
// service-role key is read server-side only and is never returned.
//
// This grants a session, nothing more. The demo account's inability to
// write is enforced by RLS (migration 015), not by this route.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEMO_EMAIL, isDemoEmail } from '@/lib/demo';

export async function POST(request: Request) {
  try {
    const { email } = await request.json().catch(() => ({ email: null }));

    // The only address this route will ever mint a session for.
    if (!isDemoEmail(email)) {
      return NextResponse.json({ error: 'not_the_demo_account' }, { status: 403 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'demo_not_configured' }, { status: 503 });
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // generateLink does not send mail; it returns the token for us to use.
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: DEMO_EMAIL,
    });

    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) {
      return NextResponse.json({ error: 'link_failed' }, { status: 500 });
    }

    return NextResponse.json({ token_hash: tokenHash });
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
