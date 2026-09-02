-- ============================================================
-- Onboarding tour — gate, run-level facts, and step-level events
-- ============================================================
-- The portal ships a MANDATORY spotlight tour on first open. Three pieces:
--
--   1. profiles.tour_seen_version — the gate. An int, not a bool, so a future
--      release can bump TOUR_VERSION and replay only the newly-added steps
--      ("what's new") instead of the whole tour.
--   2. tour_runs — one row per run. Run-level metrics (funnel position, time to
--      complete, drop-off) are reconstructible from the step stream in principle,
--      but doing that in client-side JS inside the admin dashboard is slow and
--      fragile. This is the fact table the admin analytics page scans.
--   3. tour_step_events — one row per step view. ~200 students x 11 steps is
--      ~2 200 rows per version and grows with replays, so it is kept OUT of
--      user_events: at 11x the volume of every other event it would drown the
--      Activity feed. Only the run-level milestones (tour_started /
--      tour_completed / tour_abandoned / ...) go into user_events.
--
-- READS ARE ADMIN-ONLY on both new tables. This is deliberately stricter than
-- the house precedent (user_events uses `auth.role() = 'authenticated'`, i.e.
-- cohort-readable): per-student timing and drop-off data has no reason to be
-- visible to other students, and AdminDashboard queries as a logged-in admin
-- with the browser client, so an admin-scoped policy is sufficient.
-- ============================================================

-- ── 1. The gate ─────────────────────────────────────────────
-- Picked up for free by the existing profiles.select('*') in app/planner/page.tsx.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tour_seen_version int NOT NULL DEFAULT 0;

-- ── 2. Run-level facts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_runs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tour_version          int  NOT NULL,

  -- first_login | version_upgrade | manual_replay. Replays behave nothing like
  -- first runs (faster, targeted) and must be separable in every metric.
  trigger               text NOT NULL,
  -- in_progress | completed | abandoned | aborted_error
  status                text NOT NULL DEFAULT 'in_progress',

  started_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  -- Heartbeat, not an unload event: mobile Safari frequently never fires
  -- beforeunload/pagehide, so abandonment is detected by a stale heartbeat.
  last_heartbeat_at     timestamptz NOT NULL DEFAULT now(),

  total_ms              int,   -- wall clock start -> finish
  -- Sum of per-step dwell while document.visibilityState === 'visible'. The
  -- honest number: total_ms includes the student answering a phone call, which
  -- makes a p90 of wall-clock meaningless on its own.
  active_ms             int,

  steps_total           int NOT NULL,
  steps_seen            int NOT NULL DEFAULT 0,
  furthest_step_index   int NOT NULL DEFAULT 0,
  last_step_id          text,

  -- Back-navigation is the cheapest available proxy for "that copy confused me".
  back_count            int NOT NULL DEFAULT 0,
  -- How many separate visits it took to finish. A mandatory tour needing three
  -- sessions is a bad tour.
  resume_count          int NOT NULL DEFAULT 0,

  -- Which steps failed to resolve their anchor. The health signal that a
  -- refactor renamed a data-tour attribute and quietly broke the tour.
  missing_anchor_steps  text[] NOT NULL DEFAULT '{}',

  device_type           text,
  browser               text,
  os                    text,
  -- Viewport pixels as well as a coarse device_type: the narrow-phone case
  -- (hidden tab labels, collapsed drawer) is where this tour breaks.
  viewport_w            int,
  viewport_h            int,

  -- Joins tour runs to the rest of the analytics stack.
  session_id            uuid REFERENCES user_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tour_runs_user     ON tour_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_runs_status   ON tour_runs(status);
CREATE INDEX IF NOT EXISTS idx_tour_runs_version  ON tour_runs(tour_version);
CREATE INDEX IF NOT EXISTS idx_tour_runs_started  ON tour_runs(started_at DESC);

-- ── 3. Step-level events ────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_step_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           uuid NOT NULL REFERENCES tour_runs(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  step_id          text NOT NULL,
  step_index       int  NOT NULL,
  entered_at       timestamptz NOT NULL DEFAULT now(),
  dwell_ms         int,
  active_dwell_ms  int,
  -- next | back | abandon
  exit_direction   text,
  anchor_found     boolean NOT NULL DEFAULT true,
  -- How long the anchor took to appear. A step consistently near the 1200ms
  -- fail-open ceiling is one render away from being skipped for everyone.
  anchor_retry_ms  int
);

CREATE INDEX IF NOT EXISTS idx_tour_steps_run     ON tour_step_events(run_id);
CREATE INDEX IF NOT EXISTS idx_tour_steps_step    ON tour_step_events(step_id);
CREATE INDEX IF NOT EXISTS idx_tour_steps_user    ON tour_step_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tour_steps_entered ON tour_step_events(entered_at DESC);

-- ── Row Level Security ──────────────────────────────────────

ALTER TABLE tour_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_step_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tour_runs_insert_own  ON tour_runs;
DROP POLICY IF EXISTS tour_runs_update_own  ON tour_runs;
DROP POLICY IF EXISTS tour_runs_read_admin  ON tour_runs;

CREATE POLICY tour_runs_insert_own ON tour_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY tour_runs_update_own ON tour_runs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY tour_runs_read_admin ON tour_runs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users a WHERE a.email = auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS tour_steps_insert_own ON tour_step_events;
DROP POLICY IF EXISTS tour_steps_update_own ON tour_step_events;
DROP POLICY IF EXISTS tour_steps_read_admin ON tour_step_events;

CREATE POLICY tour_steps_insert_own ON tour_step_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY tour_steps_update_own ON tour_step_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY tour_steps_read_admin ON tour_step_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users a WHERE a.email = auth.jwt() ->> 'email')
  );

-- ── Demo account: no tour telemetry ─────────────────────────
-- profiles already carries demo_no_update (migration 015), so the demo user's
-- tour_seen_version can never be written and the client falls back to
-- localStorage for the gate. These mirror that for the two new tables: a
-- reviewer clicking through the tour is not a student, and their runs must not
-- land in the cohort's funnel numbers. The client skips these writes too — this
-- is the guarantee that survives a hand-crafted REST call.
DROP POLICY IF EXISTS "demo_no_insert" ON tour_runs;
CREATE POLICY "demo_no_insert" ON tour_runs
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_update" ON tour_runs;
CREATE POLICY "demo_no_update" ON tour_runs
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_insert" ON tour_step_events;
CREATE POLICY "demo_no_insert" ON tour_step_events
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_update" ON tour_step_events;
CREATE POLICY "demo_no_update" ON tour_step_events
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_user());
