-- ============================================================
-- MBA Planner — competition requests
--
-- What happens when a student pastes a link that isn't an Unstop competition.
--
-- Before this, the Add-competition dialog answered "that doesn't look like an
-- Unstop competition link" and the interaction ended there. The student's real
-- intent — "I want to track this thing" — was thrown away, and the one person
-- who could act on it (an admin, who can import by hand) never learned the ask
-- existed. This table is where that intent goes instead.
--
-- ── Deliberately not a competition ──────────────────────────
-- A request is NOT a row in `competitions` with a pending flag. Nothing here is
-- trusted: the url is whatever the student typed, there is no title, no rounds,
-- no dates, and no guarantee the link is even a competition. Letting an
-- unverified row sit in `competitions` would mean every reader — the dispatcher,
-- the cards, chainProgress — has to learn to skip it, and one missed filter puts
-- a fictional deadline on a hundred phones. A separate table cannot leak into
-- those paths at all.
--
-- ── Who reads it ────────────────────────────────────────────
-- Students read their own rows. Admins read all of them **through
-- /api/alerts/requests using the service-role client**, gated by
-- isAdminEmail() — the same reason /api/alerts/unstop puts its admin check in
-- the route: a policy cannot see the caller's email without another
-- SECURITY DEFINER function, and it would fork the admin list into a second
-- source of truth that has to be kept in step with lib/admin.ts. There is
-- therefore no admin SELECT policy here, on purpose.
--
-- Apply with:
--   supabase db query --linked -f supabase/migrations/020_competition_requests.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS competition_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Exactly what the student pasted. Kept verbatim rather than normalised: the
  -- admin has to open it by hand, and a "helpfully" rewritten url is a url that
  -- might not resolve.
  url            text NOT NULL CHECK (length(trim(url)) BETWEEN 4 AND 2048),

  -- Optional free text — "it's on the D2C site", "team of 4, closes Friday".
  note           text CHECK (note IS NULL OR length(note) <= 500),

  -- Why the automatic import refused. Stored so the admin can tell "not an
  -- Unstop link at all" from "Unstop link, but Unstop wouldn't serve it".
  reason         text NOT NULL DEFAULT 'not_unstop'
                   CHECK (reason IN ('not_unstop', 'unstop_unreachable')),

  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'added', 'declined')),

  -- Set when an admin imports it for real, so the request stops being a loose
  -- end and starts pointing at the thing it produced.
  competition_id uuid REFERENCES competitions(id) ON DELETE SET NULL,
  admin_note     text CHECK (admin_note IS NULL OR length(admin_note) <= 500),

  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz,
  resolved_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- One live ask per student per link. Re-submitting the same url updates the
  -- existing row instead of stacking duplicates in the admin's queue; two
  -- different students asking for the same link stay two rows, because "how
  -- many people want this" is the number that decides whether it is worth
  -- importing.
  UNIQUE (user_id, url)
);

CREATE INDEX IF NOT EXISTS competition_requests_pending_idx
  ON competition_requests (created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS competition_requests_user_idx
  ON competition_requests (user_id);

ALTER TABLE competition_requests ENABLE ROW LEVEL SECURITY;

-- Students see and withdraw their own asks, and nothing else. No UPDATE policy:
-- status, competition_id and resolved_* are the admin's answer to the request,
-- and a student who could write them could mark their own link "added".
DROP POLICY IF EXISTS "competition_requests_select_own" ON competition_requests;
CREATE POLICY "competition_requests_select_own" ON competition_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "competition_requests_insert_own" ON competition_requests;
CREATE POLICY "competition_requests_insert_own" ON competition_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "competition_requests_delete_own" ON competition_requests;
CREATE POLICY "competition_requests_delete_own" ON competition_requests
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

-- ── Demo account: reads yes, writes no ──────────────────────
-- Migration 015's pattern. RESTRICTIVE, so it ANDs with the policies above and
-- cannot be satisfied by any of them. The client mirrors this in
-- useAlerts(readOnly) so the UI still responds — but THIS is the guarantee.

DROP POLICY IF EXISTS "demo_no_insert" ON competition_requests;
CREATE POLICY "demo_no_insert" ON competition_requests
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_delete" ON competition_requests;
CREATE POLICY "demo_no_delete" ON competition_requests
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_user());
