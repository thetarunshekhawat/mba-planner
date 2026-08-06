// /api/alerts/requests — "this link isn't on Unstop, please add it for me".
//
//   POST   student asks for a link to be added (own session, RLS decides)
//   GET    admin lists every ask, with who made it     (service-role, gated)
//   PATCH  admin marks one added or declined            (service-role, gated)
//
// ── Why the admin verbs use the service-role client ─────────────────────────
// `competition_requests` has a `user_id = auth.uid()` SELECT policy and no
// admin policy, so an admin reading it through their own session would see only
// their own asks — which is the entire feature failing silently rather than
// loudly. The alternative, an RLS policy that recognises admins, needs a
// SECURITY DEFINER function that can read `auth.users.email`, and that forks the
// admin list into a second source of truth to keep in step with lib/admin.ts.
//
// So the admin check lives here, in the route, exactly as it does in
// /api/alerts/unstop. The database guarantee stays "students see their own
// rows"; this route is the one deliberate widening of it, and `isAdminEmail()`
// is what it turns on.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/admin';
import type { CompetitionRequest, CompetitionRequestStatus } from '@/types';

export const runtime = 'nodejs';

const MAX_URL = 2048;
const MAX_NOTE = 500;

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/** The signed-in user, plus whether they are allowed the admin verbs. */
async function caller() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user, isAdmin: isAdminEmail(user?.email) };
}

// ── POST: a student asks ─────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: { url?: string; note?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const url = (body.url ?? '').trim();
  const note = (body.note ?? '').trim();

  if (url.length < 4 || url.length > MAX_URL) {
    return NextResponse.json({ error: 'Paste the link you want added.' }, { status: 400 });
  }
  if (note.length > MAX_NOTE) {
    return NextResponse.json({ error: 'That note is too long.' }, { status: 400 });
  }
  // Anything outside the two known refusal paths is a caller bug, not a new
  // category — fall back rather than widen the CHECK constraint by accident.
  const reason = body.reason === 'unstop_unreachable' ? 'unstop_unreachable' : 'not_unstop';

  const { supabase, user } = await caller();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // The student's own session, so RLS is what permits this — including the
  // RESTRICTIVE demo block. Re-asking for the same link updates the existing
  // row rather than stacking duplicates in the admin's queue.
  const { data, error } = await supabase
    .from('competition_requests')
    .upsert(
      {
        user_id: user.id,
        url,
        note: note || null,
        reason,
        status: 'pending',
        competition_id: null,
        admin_note: null,
        resolved_at: null,
        resolved_by: null,
      },
      { onConflict: 'user_id,url' },
    )
    .select('*')
    .single();

  if (error) {
    // The demo account trips the RESTRICTIVE policy here, which is the intended
    // outcome, not an incident.
    return NextResponse.json(
      { error: 'Could not save that request. If you are on the demo account, it is read-only.' },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true, request: data as CompetitionRequest });
}

// ── GET: the admin queue ─────────────────────────────────────────────────────

export async function GET() {
  const { user, isAdmin } = await caller();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Bounded by construction: one row per student per link, and the queue is
  // meant to be worked down. 1000 is PostgREST's silent cap, so an explicit
  // limit under it keeps "did I see everything?" answerable.
  const { data, error } = await service()
    .from('competition_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: 'Could not load requests.' }, { status: 500 });
  }
  return NextResponse.json({ requests: (data ?? []) as CompetitionRequest[] });
}

// ── PATCH: the admin answers ─────────────────────────────────────────────────

export async function PATCH(request: Request) {
  let body: { id?: string; status?: string; competitionId?: string | null; adminNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { user, isAdmin } = await caller();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = (body.id ?? '').trim();
  if (!id) return NextResponse.json({ error: 'Missing request id.' }, { status: 400 });

  const allowed: CompetitionRequestStatus[] = ['pending', 'added', 'declined'];
  const status = body.status as CompetitionRequestStatus;
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });
  }

  const adminNote = (body.adminNote ?? '').trim().slice(0, MAX_NOTE);
  const resolving = status !== 'pending';

  const { data, error } = await service()
    .from('competition_requests')
    .update({
      status,
      competition_id: body.competitionId ?? null,
      admin_note: adminNote || null,
      // Reopening clears the answer, so a mis-click doesn't leave a row that
      // reads "pending" and "resolved by Tarun on the 6th" at the same time.
      resolved_at: resolving ? new Date().toISOString() : null,
      resolved_by: resolving ? user.id : null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Could not update that request.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, request: data as CompetitionRequest });
}
