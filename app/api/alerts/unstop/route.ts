// POST /api/alerts/unstop — the website path for adding a competition.
//
// Body: { url: string, publishToCohort?: boolean }
//
// Flow: normal Supabase auth → parse the numeric id off the Unstop slug →
// fetch Unstop server-side → map with lib/alerts/unstop.ts → write.
//
// ── Who can publish to the whole cohort ─────────────────────────────────────
// Anyone can add a competition for themselves; the write goes through the
// caller's own session, so RLS pins it to visibility 'private' and
// created_by = auth.uid(). A student cannot publish cohort-wide even by sending
// publishToCohort: true — the flag is only honoured for an admin email, and
// only then does this route escalate to the service-role client that RLS lets
// write a global row.
//
// The admin check lives here rather than in a policy because a policy cannot
// see the caller's email without another SECURITY DEFINER function, and
// migration 012 is the reason we stopped adding those casually. The *database*
// guarantee is the RLS INSERT policy pinning private/own — this route can only
// widen that by deliberately using a different client.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/admin';
import { mapUnstopCompetition, parseUnstopId, type UnstopResponse } from '@/lib/alerts/unstop';
import { importCompetition, fetchUnstop } from '@/lib/alerts/import';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { url?: string; publishToCohort?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const rawUrl = (body.url ?? '').trim();
  if (!rawUrl) {
    return NextResponse.json({ error: 'Paste an Unstop competition link.' }, { status: 400 });
  }

  // The slug form (no trailing numeric id) returns a 404 body inside a 200, so
  // rejecting here gives a real message instead of an empty competition.
  // `canRequest` tells the dialog this is a refusal a human could still fix, so
  // it can offer "ask an admin to add it" instead of ending the interaction.
  // Only these two paths carry it: a blank box is a typo, not an ask.
  const numericId = parseUnstopId(rawUrl);
  if (!numericId) {
    return NextResponse.json(
      {
        error: "That doesn't look like an Unstop competition link — it should end in a number.",
        canRequest: true,
        reason: 'not_unstop',
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let mapped;
  try {
    const raw = (await fetchUnstop(numericId)) as UnstopResponse;
    mapped = mapUnstopCompetition(raw);
  } catch (e) {
    return NextResponse.json(
      {
        error: `Could not read that competition from Unstop. ${(e as Error).message}`,
        canRequest: true,
        reason: 'unstop_unreachable',
      },
      { status: 502 },
    );
  }

  const wantsCohort = body.publishToCohort === true;
  const canPublish = isAdminEmail(user.email);

  if (wantsCohort && !canPublish) {
    return NextResponse.json(
      { error: 'Only admins can publish a competition to the whole cohort.' },
      { status: 403 },
    );
  }

  try {
    if (wantsCohort && canPublish) {
      const service = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      );
      const result = await importCompetition(service, mapped, {
        visibility: 'global',
        createdBy: null,
      });
      return NextResponse.json({ ...result, visibility: 'global', rounds: mapped.rounds.length });
    }

    // The ordinary path: the student's own session, so RLS is what decides.
    const result = await importCompetition(supabase, mapped, {
      visibility: 'private',
      createdBy: user.id,
    });
    return NextResponse.json({ ...result, visibility: 'private', rounds: mapped.rounds.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
