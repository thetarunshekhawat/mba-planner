// GET|POST /api/impact/refresh — recompute the institution impact snapshots.
//
// The primary driver is pg_cron inside Supabase (migration 023), because a
// snapshot that only depends on the database cannot be broken by a bad deploy.
// This route is the safety net for projects where pg_cron is not enabled, and
// it is what vercel.json calls once a day.
//
// Same bearer guard as /api/alerts/dispatch: Vercel sends
// `Authorization: Bearer $CRON_SECRET` automatically once that env var exists,
// and an unset secret fails closed. It matters less here than it does for the
// dispatcher — this writes no notifications and leaks nothing — but a public
// endpoint that runs a full-table recompute is a free denial-of-service lever.
//
// Idempotent by construction: refresh_impact_snapshots() overwrites the four
// rows, it never accumulates. Running it twice is the same as running it once.

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { error } = await db.rpc('refresh_impact_snapshots');
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, ms: Date.now() - startedAt },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, ms: Date.now() - startedAt });
}

export async function GET(request: Request) {
  if (!authorised(request)) return new NextResponse('Unauthorized', { status: 401 });
  return run();
}

export async function POST(request: Request) {
  if (!authorised(request)) return new NextResponse('Unauthorized', { status: 401 });
  return run();
}
