// Writing a mapped Unstop competition into the database.
//
// Shared by both write paths — /api/alerts/import (service role, cohort-wide)
// and /api/alerts/unstop (a student's own session, private) — so the rules
// below hold identically whichever door the data came through. Duplicating this
// was the obvious way to end up with one path that retires rounds and one that
// deletes them.
//
// ── The invariant that matters ──────────────────────────────────────────────
// A re-import UPDATES rounds in place and NEVER deletes one. `alert_reminder_rules`
// and `alert_round_outcomes` hold foreign keys to `competition_rounds.id`, both
// with ON DELETE CASCADE — so deleting and recreating a round on every import
// would silently wipe every reminder a student had configured and every "I did
// not clear this round" they had recorded, and nothing would report it. Rounds
// that vanish from Unstop get `retired_at` set instead.
//
// ── Why there is no ON CONFLICT here ────────────────────────────────────────
// The competitions unique index is partial (`WHERE source_id IS NOT NULL`), and
// PostgREST cannot express a partial index's predicate for conflict inference,
// so an upsert would fail to match it. A read-then-write is used instead. The
// unique index is still what prevents a genuine race from producing duplicates.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MappedCompetition } from '@/lib/alerts/unstop';

export interface ImportResult {
  competitionId: string;
  created: boolean;
  roundsInserted: number;
  roundsUpdated: number;
  roundsRetired: number;
}

export interface ImportOptions {
  visibility: 'global' | 'private';
  /** Required for private rows; must be null for global ones. */
  createdBy: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function importCompetition(
  db: SupabaseClient<any, any, any>,
  mapped: MappedCompetition,
  { visibility, createdBy }: ImportOptions,
): Promise<ImportResult> {
  const c = mapped.competition;

  const fields = {
    source: mapped.source,
    source_id: mapped.sourceId,
    visibility,
    created_by: visibility === 'global' ? null : createdBy,
    title: c.title,
    organiser: c.organiser,
    logo_url: c.logoUrl,
    banner_url: c.bannerUrl,
    public_url: c.publicUrl,
    region: c.region,
    registration_opens_at: c.registrationOpensAt,
    registration_deadline: c.registrationDeadline,
    starts_at: c.startsAt,
    ends_at: c.endsAt,
    min_team_size: c.minTeamSize,
    max_team_size: c.maxTeamSize,
    prize_summary: c.prizeSummary,
    skills: c.skills,
    register_count: c.registerCount,
    raw: mapped as unknown as Record<string, unknown>,
  };

  // Find the existing row for this (source, source_id) in this ownership scope.
  let lookup = db
    .from('competitions')
    .select('id')
    .eq('source', mapped.source)
    .eq('source_id', mapped.sourceId)
    .eq('visibility', visibility);
  if (visibility === 'private') lookup = lookup.eq('created_by', createdBy);

  const { data: existing } = await lookup.maybeSingle();

  let competitionId: string;
  let created: boolean;

  if (existing?.id) {
    competitionId = existing.id as string;
    created = false;
    const { error } = await db.from('competitions').update(fields).eq('id', competitionId);
    if (error) throw new Error(`competition update failed: ${error.message}`);
  } else {
    const { data, error } = await db.from('competitions').insert(fields).select('id').single();
    if (error || !data) throw new Error(`competition insert failed: ${error?.message ?? 'no row'}`);
    competitionId = data.id as string;
    created = true;
  }

  // ── Rounds: update in place, insert what's new, retire what's gone ─────────

  const { data: existingRounds } = await db
    .from('competition_rounds')
    .select('id, round_key, retired_at')
    .eq('competition_id', competitionId);

  const byKey = new Map<string, { id: string; retired_at: string | null }>(
    ((existingRounds as { id: string; round_key: string; retired_at: string | null }[]) ?? [])
      .map((r) => [r.round_key, { id: r.id, retired_at: r.retired_at }]),
  );

  const incomingKeys = new Set(mapped.rounds.map((r) => r.roundKey));
  let roundsInserted = 0;
  let roundsUpdated = 0;

  for (const r of mapped.rounds) {
    const row = {
      competition_id: competitionId,
      round_key: r.roundKey,
      round_order: r.roundOrder,
      title: r.title,
      description_html: r.descriptionHtml,
      starts_at: r.startsAt,
      ends_at: r.endsAt,
      is_eliminator: r.isEliminator,
      entity_type: r.entityType,
      public_url: r.publicUrl,
      // A round that came back after being retired is live again.
      retired_at: null,
    };
    const found = byKey.get(r.roundKey);
    if (found) {
      const { error } = await db.from('competition_rounds').update(row).eq('id', found.id);
      if (error) throw new Error(`round update failed: ${error.message}`);
      roundsUpdated++;
    } else {
      const { error } = await db.from('competition_rounds').insert(row);
      if (error) throw new Error(`round insert failed: ${error.message}`);
      roundsInserted++;
    }
  }

  // Anything we hold that Unstop no longer lists gets retired, not deleted.
  const toRetire = [...byKey.entries()]
    .filter(([key, v]) => !incomingKeys.has(key) && v.retired_at === null)
    .map(([, v]) => v.id);

  if (toRetire.length > 0) {
    await db
      .from('competition_rounds')
      .update({ retired_at: new Date().toISOString() })
      .in('id', toRetire);
  }

  return {
    competitionId,
    created,
    roundsInserted,
    roundsUpdated,
    roundsRetired: toRetire.length,
  };
}

/**
 * Fetches an Unstop competition server-side.
 *
 * Server-side because Unstop sends no CORS headers, so a browser cannot call it
 * — and because keeping one copy of the mapper is worth more than saving a hop.
 * The browser User-Agent is not evasion; a default fetch UA gets a bot page.
 */
export async function fetchUnstop(numericId: string): Promise<unknown> {
  const res = await fetch(`https://unstop.com/api/public/competition/${numericId}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Unstop returned ${res.status}`);
  return res.json();
}
