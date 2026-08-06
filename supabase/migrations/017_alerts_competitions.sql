-- ============================================================
-- MBA Planner — Alerts, part 1: the content half
--
-- Case competitions live on Unstop, where deadlines are easy to miss: TGC 2026
-- alone has 10 rounds over seven weeks, five of them eliminators. These two
-- tables hold *what a competition is* — shared, user-agnostic content. Nothing
-- here has a user_id; per-student state lives in migration 018.
--
-- ── The two-level visibility model ──────────────────────────
-- A competition is either 'global' (published to the whole cohort by an admin,
-- through the unstop-import skill) or 'private' (added by one student, visible
-- only to them). The rules that make that real:
--
--   • SELECT: global OR mine.
--   • INSERT via RLS: pinned to private AND created_by = auth.uid(). A student
--     with a hand-crafted REST call and a valid JWT still cannot publish to the
--     cohort — the policy makes it impossible, not merely un-offered.
--   • Global rows are writable ONLY by the service role, through
--     /api/alerts/import. The admin check lives in that route rather than in a
--     policy, because a policy cannot see the caller's email without another
--     SECURITY DEFINER function (see migration 012 for why we stopped adding
--     those casually).
--
-- ── Why owner_key exists ────────────────────────────────────
-- NULLs never conflict in a Postgres unique index. Global rows have
-- created_by = NULL, so UNIQUE (source, source_id, created_by) would happily
-- accept the same Unstop competition published twice — and the cohort would see
-- duplicate cards. owner_key collapses that: global rows all share one sentinel
-- uuid, so a second publish of the same id is a real conflict and upserts.
--
-- Apply with:
--   supabase db query --linked -f supabase/migrations/017_alerts_competitions.sql
-- ============================================================

-- ── 0. Shared updated_at trigger ────────────────────────────
-- Several existing tables carry an updated_at column that nothing maintains.
-- The alerts import route reports "what changed" from this, and the dispatcher
-- uses it to decide whether a round moved recently, so here it is actually kept
-- true. Defined once, attached per table below.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ── 1. competitions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS competitions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source                 text NOT NULL CHECK (source IN ('unstop', 'manual')),
  source_id              text,
  visibility             text NOT NULL DEFAULT 'private'
                           CHECK (visibility IN ('global', 'private')),
  created_by             uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- Generated, not written: the sentinel makes duplicate global publishes
  -- conflict instead of silently inserting. Must stay IMMUTABLE.
  owner_key              uuid GENERATED ALWAYS AS (
                           CASE WHEN visibility = 'global'
                                THEN '00000000-0000-0000-0000-000000000000'::uuid
                                ELSE created_by
                           END
                         ) STORED,

  title                  text NOT NULL,
  organiser              text,
  logo_url               text,
  banner_url             text,
  public_url             text,
  region                 text,

  registration_opens_at  timestamptz,
  registration_deadline  timestamptz,
  starts_at              timestamptz,
  ends_at                timestamptz,

  min_team_size          integer,
  max_team_size          integer,
  prize_summary          text,
  skills                 text[],
  register_count         integer,

  -- The mapped subset of the Unstop payload, kept verbatim so a mis-mapped
  -- field can be diagnosed without re-fetching a page that may have changed.
  raw                    jsonb,

  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  -- A global row has no owner; a private row must have one.
  CONSTRAINT competitions_owner_matches_visibility CHECK (
    (visibility = 'global') OR (visibility = 'private' AND created_by IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS competitions_source_owner_uniq
  ON competitions (source, source_id, owner_key)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS competitions_visibility_idx ON competitions (visibility);
CREATE INDEX IF NOT EXISTS competitions_created_by_idx ON competitions (created_by);

DROP TRIGGER IF EXISTS competitions_set_updated_at ON competitions;
CREATE TRIGGER competitions_set_updated_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitions_select" ON competitions;
CREATE POLICY "competitions_select" ON competitions
  FOR SELECT TO authenticated
  USING (visibility = 'global' OR created_by = auth.uid());

-- Pins both columns. This is what stops a student publishing cohort-wide.
DROP POLICY IF EXISTS "competitions_insert_own_private" ON competitions;
CREATE POLICY "competitions_insert_own_private" ON competitions
  FOR INSERT TO authenticated
  WITH CHECK (visibility = 'private' AND created_by = auth.uid());

DROP POLICY IF EXISTS "competitions_update_own_private" ON competitions;
CREATE POLICY "competitions_update_own_private" ON competitions
  FOR UPDATE TO authenticated
  USING (visibility = 'private' AND created_by = auth.uid())
  WITH CHECK (visibility = 'private' AND created_by = auth.uid());

DROP POLICY IF EXISTS "competitions_delete_own_private" ON competitions;
CREATE POLICY "competitions_delete_own_private" ON competitions
  FOR DELETE TO authenticated
  USING (visibility = 'private' AND created_by = auth.uid());

-- ── 2. competition_rounds ───────────────────────────────────
-- A re-import must UPDATE in place, never delete-and-recreate: reminder rules
-- and elimination records in migration 018 reference these ids, and recreating
-- a row would silently discard every one of them. Rounds that disappear from
-- Unstop get retired_at set. Nothing ever deletes a round.

CREATE TABLE IF NOT EXISTS competition_rounds (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id   uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,

  -- Unstop's details[0].id. Stable across re-imports; the join key for upserts.
  round_key        text NOT NULL,
  round_order      integer NOT NULL DEFAULT 0,

  title            text,
  description_html text,
  starts_at        timestamptz,
  ends_at          timestamptz,
  is_eliminator    boolean NOT NULL DEFAULT false,
  entity_type      text,
  public_url       text,

  retired_at       timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (competition_id, round_key)
);

CREATE INDEX IF NOT EXISTS competition_rounds_competition_idx
  ON competition_rounds (competition_id);
-- The dispatcher windows on these two columns every run.
CREATE INDEX IF NOT EXISTS competition_rounds_ends_at_idx
  ON competition_rounds (ends_at) WHERE retired_at IS NULL;
CREATE INDEX IF NOT EXISTS competition_rounds_starts_at_idx
  ON competition_rounds (starts_at) WHERE retired_at IS NULL;

DROP TRIGGER IF EXISTS competition_rounds_set_updated_at ON competition_rounds;
CREATE TRIGGER competition_rounds_set_updated_at
  BEFORE UPDATE ON competition_rounds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE competition_rounds ENABLE ROW LEVEL SECURITY;

-- Rounds inherit their competition's visibility, so the policies mirror it via
-- an EXISTS against the parent rather than duplicating the rule.
DROP POLICY IF EXISTS "competition_rounds_select" ON competition_rounds;
CREATE POLICY "competition_rounds_select" ON competition_rounds
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM competitions c
     WHERE c.id = competition_rounds.competition_id
       AND (c.visibility = 'global' OR c.created_by = auth.uid())
  ));

DROP POLICY IF EXISTS "competition_rounds_write_own_private" ON competition_rounds;
CREATE POLICY "competition_rounds_write_own_private" ON competition_rounds
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM competitions c
     WHERE c.id = competition_rounds.competition_id
       AND c.visibility = 'private' AND c.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "competition_rounds_update_own_private" ON competition_rounds;
CREATE POLICY "competition_rounds_update_own_private" ON competition_rounds
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM competitions c
     WHERE c.id = competition_rounds.competition_id
       AND c.visibility = 'private' AND c.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "competition_rounds_delete_own_private" ON competition_rounds;
CREATE POLICY "competition_rounds_delete_own_private" ON competition_rounds
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM competitions c
     WHERE c.id = competition_rounds.competition_id
       AND c.visibility = 'private' AND c.created_by = auth.uid()
  ));

-- ── 3. Demo account: reads yes, writes no ───────────────────
-- Migration 015's pattern. RESTRICTIVE policies AND with the permissive ones
-- above, so no other policy can satisfy them. The demo login must still see a
-- fully-populated Alerts tab, so SELECT is untouched throughout.

DROP POLICY IF EXISTS "demo_no_insert" ON competitions;
CREATE POLICY "demo_no_insert" ON competitions
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_update" ON competitions;
CREATE POLICY "demo_no_update" ON competitions
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_delete" ON competitions;
CREATE POLICY "demo_no_delete" ON competitions
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_insert" ON competition_rounds;
CREATE POLICY "demo_no_insert" ON competition_rounds
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_update" ON competition_rounds;
CREATE POLICY "demo_no_update" ON competition_rounds
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_delete" ON competition_rounds;
CREATE POLICY "demo_no_delete" ON competition_rounds
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_user());

-- ── 4. Grants ───────────────────────────────────────────────
-- Tables created via raw SQL migrations do NOT inherit Supabase's default
-- dashboard grants (the lesson of migration 006). Without these, every policy
-- above is irrelevant because the role cannot reach the table at all.

GRANT SELECT, INSERT, UPDATE, DELETE ON competitions        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON competition_rounds  TO authenticated;
