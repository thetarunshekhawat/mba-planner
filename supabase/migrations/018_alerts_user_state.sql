-- ============================================================
-- MBA Planner — Alerts, part 2: the per-user half
--
-- Everything here is one student's state: what they track, how they want to be
-- reminded, whether they cleared a round, and what has already been sent to
-- them. Every table is strictly private — the read policies are `user_id =
-- auth.uid()`, not the read-all pattern the course tables use, because a
-- student's competition list is not cohort information.
--
-- ── What is NOT here ────────────────────────────────────────
-- There is no table of pending reminders, deliberately. Reminder *rules* are
-- stored sparsely (a row exists only where a student overrode a default) and
-- the actual occurrences are computed at dispatch by lib/alerts/schedule.ts.
--
-- Materialising them would mean: reconciling every tracker × round × offset
-- each time Unstop edits a round date, fanning out writes to every existing
-- tracker whenever a new round appears, and cascading deletes on elimination.
-- Computed, all three are free. Volume is trivial — ~100 students × ~10 comps ×
-- ~10 rounds × ~4 offsets is well under 50k rows evaluated in memory.
--
-- What prevents a reminder being sent twice is alert_deliveries'
-- UNIQUE (user_id, dedupe_key), at the bottom of this file. That index is the
-- only thing standing between a retrying dispatcher and a student's lock screen.
--
-- Apply with:
--   supabase db query --linked -f supabase/migrations/018_alerts_user_state.sql
-- ============================================================

-- ── 1. alert_tracks ─────────────────────────────────────────
-- "I am following this competition." status and notifications_enabled are what
-- the dispatcher filters on, so muting or being eliminated produces zero
-- occurrences with no per-round logic anywhere.

CREATE TABLE IF NOT EXISTS alert_tracks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  competition_id        uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'eliminated', 'archived')),
  notifications_enabled boolean NOT NULL DEFAULT true,
  eliminated_round_id   uuid REFERENCES competition_rounds(id) ON DELETE SET NULL,
  eliminated_at         timestamptz,
  tracked_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, competition_id)
);

CREATE INDEX IF NOT EXISTS alert_tracks_user_idx ON alert_tracks (user_id);
CREATE INDEX IF NOT EXISTS alert_tracks_dispatch_idx
  ON alert_tracks (competition_id) WHERE status = 'active' AND notifications_enabled;

ALTER TABLE alert_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_tracks_own" ON alert_tracks;
CREATE POLICY "alert_tracks_own" ON alert_tracks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 2. alert_reminder_rules ─────────────────────────────────
-- Sparse OVERRIDES ONLY. Defaults live in lib/alerts/schedule.ts and are never
-- written here, so an empty table means "everyone is on the defaults".
--   • enabled = false on an offset rule removes exactly that default
--   • an offset rule with a new value adds one
--   • an absolute rule pins a fixed instant ("remind me on 10 August, 09:00"),
--     converted from IST once at write time

CREATE TABLE IF NOT EXISTS alert_reminder_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id       uuid NOT NULL REFERENCES alert_tracks(id) ON DELETE CASCADE,
  anchor         text NOT NULL CHECK (anchor IN
                   ('round_end', 'round_start', 'registration_deadline', 'deadline')),
  round_id       uuid REFERENCES competition_rounds(id) ON DELETE CASCADE,
  mode           text NOT NULL CHECK (mode IN ('offset', 'absolute')),
  offset_minutes integer,
  absolute_at    timestamptz,
  enabled        boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),

  -- Each mode needs exactly its own column populated; a rule with neither is
  -- unschedulable and a rule with both is ambiguous.
  CONSTRAINT alert_reminder_rules_mode_shape CHECK (
    (mode = 'offset'   AND offset_minutes IS NOT NULL AND absolute_at IS NULL) OR
    (mode = 'absolute' AND absolute_at    IS NOT NULL AND offset_minutes IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS alert_reminder_rules_track_idx ON alert_reminder_rules (track_id);

ALTER TABLE alert_reminder_rules ENABLE ROW LEVEL SECURITY;

-- Ownership is inherited through the track.
DROP POLICY IF EXISTS "alert_reminder_rules_own" ON alert_reminder_rules;
CREATE POLICY "alert_reminder_rules_own" ON alert_reminder_rules
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM alert_tracks t
     WHERE t.id = alert_reminder_rules.track_id AND t.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM alert_tracks t
     WHERE t.id = alert_reminder_rules.track_id AND t.user_id = auth.uid()
  ));

-- ── 3. alert_round_outcomes ─────────────────────────────────
-- The pass/fail gate. **Absence means "assumed passed"** — the card keeps
-- advancing whether or not the student ever answers, and only an explicit
-- cleared = false stops alerts for that competition. Defaulting to PASSED is
-- the whole point: a student who ignores the question must not silently stop
-- receiving reminders for a competition they are still in.

CREATE TABLE IF NOT EXISTS alert_round_outcomes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  round_id   uuid NOT NULL REFERENCES competition_rounds(id) ON DELETE CASCADE,
  cleared    boolean NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, round_id)
);

CREATE INDEX IF NOT EXISTS alert_round_outcomes_user_idx ON alert_round_outcomes (user_id);

ALTER TABLE alert_round_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_round_outcomes_own" ON alert_round_outcomes;
CREATE POLICY "alert_round_outcomes_own" ON alert_round_outcomes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 4. custom_deadlines ─────────────────────────────────────
-- Assignment submissions and anything else the student wants chasing. Always
-- private; there is no global variant.

CREATE TABLE IF NOT EXISTS custom_deadlines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  notes        text,
  url          text,
  due_at       timestamptz NOT NULL,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_deadlines_user_due_idx
  ON custom_deadlines (user_id, due_at) WHERE completed_at IS NULL;

ALTER TABLE custom_deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_deadlines_own" ON custom_deadlines;
CREATE POLICY "custom_deadlines_own" ON custom_deadlines
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 5. push_subscriptions ───────────────────────────────────
-- One row per browser/device. endpoint is globally unique — it IS the identity
-- of a push target, and the same endpoint re-registering must update rather
-- than duplicate, or the student gets N copies of every notification.
--
-- A 404/410 from the push service means the subscription is permanently gone:
-- disabled_at is set immediately. Anything else increments failure_count and
-- disables at 5, so a transient outage doesn't discard a working subscription.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint      text NOT NULL UNIQUE,
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  user_agent    text,
  failure_count integer NOT NULL DEFAULT 0,
  disabled_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON push_subscriptions (user_id) WHERE disabled_at IS NULL;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_own" ON push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 6. alert_deliveries — the idempotency ledger ────────────
-- Every reminder that has been decided upon, sent or not.
--
-- UNIQUE (user_id, dedupe_key) is the load-bearing constraint of the whole
-- feature. The dispatcher upserts with ignoreDuplicates and pushes only the
-- rows that come back as newly created, so two dispatchers racing send exactly
-- one notification between them.
--
-- Dedupe keys (v1:<kind>:<entity>:<offset>) contain no timestamp, so when
-- Unstop moves a round the key for its T-1d reminder is unchanged and an
-- already-sent reminder cannot fire again.
--
-- A 'skipped_stale' row sends nothing but still burns the key — that is how an
-- overnight outage fails to produce a 3am burst about deadlines already passed.

CREATE TABLE IF NOT EXISTS alert_deliveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dedupe_key      text NOT NULL,
  kind            text NOT NULL,
  title           text NOT NULL,
  body            text,
  url             text,
  due_at          timestamptz,
  anchor_at       timestamptz,
  status          text NOT NULL CHECK (status IN ('sent', 'skipped_stale', 'failed')),
  channel_results jsonb,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS alert_deliveries_user_created_idx
  ON alert_deliveries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS alert_deliveries_unread_idx
  ON alert_deliveries (user_id) WHERE read_at IS NULL AND status = 'sent';

ALTER TABLE alert_deliveries ENABLE ROW LEVEL SECURITY;

-- Read and mark-as-read only. There is deliberately NO permissive insert
-- policy: rows are written exclusively by the service-role dispatcher. A client
-- that could insert here could suppress its own reminders by pre-burning keys.
DROP POLICY IF EXISTS "alert_deliveries_select_own" ON alert_deliveries;
CREATE POLICY "alert_deliveries_select_own" ON alert_deliveries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "alert_deliveries_mark_read" ON alert_deliveries;
CREATE POLICY "alert_deliveries_mark_read" ON alert_deliveries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 7. Demo account: reads yes, writes no ───────────────────
-- Migration 015's pattern, on every table above that holds real state.
-- alert_deliveries needs no block: it has no permissive insert policy at all,
-- and the demo account's only write there would be marking something read.
-- The client mirrors this in useAlerts(readOnly) so the UI still responds to
-- clicks — but THIS is the guarantee.

DROP POLICY IF EXISTS "demo_no_insert" ON alert_tracks;
CREATE POLICY "demo_no_insert" ON alert_tracks
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());
DROP POLICY IF EXISTS "demo_no_update" ON alert_tracks;
CREATE POLICY "demo_no_update" ON alert_tracks
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_user());
DROP POLICY IF EXISTS "demo_no_delete" ON alert_tracks;
CREATE POLICY "demo_no_delete" ON alert_tracks
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_insert" ON alert_reminder_rules;
CREATE POLICY "demo_no_insert" ON alert_reminder_rules
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());
DROP POLICY IF EXISTS "demo_no_update" ON alert_reminder_rules;
CREATE POLICY "demo_no_update" ON alert_reminder_rules
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_user());
DROP POLICY IF EXISTS "demo_no_delete" ON alert_reminder_rules;
CREATE POLICY "demo_no_delete" ON alert_reminder_rules
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_insert" ON alert_round_outcomes;
CREATE POLICY "demo_no_insert" ON alert_round_outcomes
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());
DROP POLICY IF EXISTS "demo_no_update" ON alert_round_outcomes;
CREATE POLICY "demo_no_update" ON alert_round_outcomes
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_user());
DROP POLICY IF EXISTS "demo_no_delete" ON alert_round_outcomes;
CREATE POLICY "demo_no_delete" ON alert_round_outcomes
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_insert" ON custom_deadlines;
CREATE POLICY "demo_no_insert" ON custom_deadlines
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());
DROP POLICY IF EXISTS "demo_no_update" ON custom_deadlines;
CREATE POLICY "demo_no_update" ON custom_deadlines
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_user());
DROP POLICY IF EXISTS "demo_no_delete" ON custom_deadlines;
CREATE POLICY "demo_no_delete" ON custom_deadlines
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_insert" ON push_subscriptions;
CREATE POLICY "demo_no_insert" ON push_subscriptions
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());
DROP POLICY IF EXISTS "demo_no_update" ON push_subscriptions;
CREATE POLICY "demo_no_update" ON push_subscriptions
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_user());
DROP POLICY IF EXISTS "demo_no_delete" ON push_subscriptions;
CREATE POLICY "demo_no_delete" ON push_subscriptions
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_user());

-- ── 8. Grants ───────────────────────────────────────────────
-- Raw-SQL migrations do not inherit dashboard defaults (migration 006).

GRANT SELECT, INSERT, UPDATE, DELETE ON alert_tracks          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_reminder_rules  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_round_outcomes  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_deadlines      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions    TO authenticated;
-- Deliveries are service-role writes only; students read and mark read.
--
-- The REVOKE is not redundant. This project has ALTER DEFAULT PRIVILEGES
-- granting the full set to `authenticated`, so a newly created table arrives
-- with INSERT and DELETE already granted. RLS would still deny both (there is
-- no permissive policy for either), but "no policy exists" is a guarantee that
-- evaporates the moment someone adds a broad FOR ALL policy later. Removing the
-- privilege makes it structural instead.
--
-- It matters because a client that could INSERT here could pre-burn its own
-- dedupe keys and silently switch off its own reminders.
REVOKE INSERT, DELETE, TRUNCATE ON alert_deliveries FROM authenticated;
GRANT SELECT, UPDATE ON alert_deliveries TO authenticated;
