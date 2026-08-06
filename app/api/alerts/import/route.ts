// POST /api/alerts/import — the machine door for publishing a competition
// cohort-wide. Used by the `unstop-import` Claude Code skill.
//
// This is the ONLY path that can write visibility: 'global'. The RLS INSERT
// policy in migration 017 pins every authenticated write to private/own, so a
// global row is reachable only by the service-role client below — which is
// reachable only by whoever holds ALERTS_IMPORT_SECRET.
//
// The skill sends an already-mapped payload rather than a URL, so the mapping
// is reviewable in the conversation before anything is written. `sourceId` and
// the round shape are still validated here: the secret authenticates the
// caller, it does not make the payload trustworthy.
//
// Auth: `Authorization: Bearer ${ALERTS_IMPORT_SECRET}`, compared with
// timingSafeEqual, **failing closed if the env var is unset** — an unset secret
// must never mean "no auth required".

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { importCompetition } from '@/lib/alerts/import';
import type { MappedCompetition, MappedRound } from '@/lib/alerts/unstop';

export const runtime = 'nodejs';

/** Constant-time bearer check. Returns false if the secret is not configured. */
function authorised(request: Request): boolean {
  const expected = process.env.ALERTS_IMPORT_SECRET;
  if (!expected) return false; // fail closed

  const header = request.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // length, so compare lengths separately and always run the comparison.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface ImportBody {
  source?: string;
  sourceId?: string;
  visibility?: string;
  competition?: MappedCompetition['competition'];
  rounds?: MappedRound[];
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ImportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const source = body.source === 'manual' ? 'manual' : 'unstop';
  const sourceId = (body.sourceId ?? '').trim();
  const visibility = body.visibility === 'private' ? 'private' : 'global';

  if (!sourceId) {
    return NextResponse.json({ error: 'sourceId is required' }, { status: 400 });
  }
  if (!body.competition?.title) {
    return NextResponse.json({ error: 'competition.title is required' }, { status: 400 });
  }
  if (visibility === 'private') {
    // A private row needs an owner, and this route has no authenticated user to
    // attribute it to. Private imports go through /api/alerts/unstop instead.
    return NextResponse.json(
      { error: 'This route only publishes global competitions; use /api/alerts/unstop for private ones.' },
      { status: 400 },
    );
  }

  const rounds = Array.isArray(body.rounds) ? body.rounds : [];
  // A round without a key cannot be matched on re-import, so it would be
  // recreated every run — taking every reminder rule pointing at it with it.
  if (rounds.some((r) => !r?.roundKey)) {
    return NextResponse.json({ error: 'every round needs a roundKey' }, { status: 400 });
  }

  const mapped: MappedCompetition = {
    // Must be the resolved `source`, not a literal. `importCompetition` matches
    // existing rows on (source, source_id), so hardcoding 'unstop' here filed
    // manual competitions under a source they did not come from — and the
    // response said 'manual' while the row said 'unstop', so the lie was
    // invisible from the caller's side.
    source,
    sourceId,
    competition: body.competition,
    rounds,
  };

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  try {
    const result = await importCompetition(db, mapped, { visibility: 'global', createdBy: null });
    return NextResponse.json({
      ...result,
      source,
      sourceId,
      visibility: 'global',
      roundsTotal: rounds.length,
      eliminators: rounds.filter((r) => r.isEliminator).length,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
