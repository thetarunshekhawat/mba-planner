-- ============================================================
-- MBA Planner — Institution impact snapshots
--
-- Purpose: the demo account lands on the Plan tab and is met by a strip of
-- cohort numbers. Those numbers must appear instantly, must be correct, and
-- must not put a single row of student data on the wire.
--
-- How it works:
--   1. refresh_impact_snapshots() recomputes four rows — one per chip
--      (all / term4 / term5 / last30) — entirely inside the database.
--   2. It runs once a day, on pg_cron where available and on Vercel cron
--      (/api/impact/refresh) as the safety net, mirroring how the alerts
--      dispatcher is driven.
--   3. get_impact_snapshot(window) hands back ONE pre-computed jsonb row.
--      Nothing is aggregated in the browser, so the PostgREST 1000-row cap
--      cannot silently truncate any of these figures the way it did to the
--      admin dashboard before the Metrics work.
--
-- Why a full recompute, not an incremental add: the interesting numbers are
-- set operations, not sums. "Came back" is the intersection of the Term 4 and
-- Term 5 planner sets; "students who planned" is a distinct count, so a
-- student active on two days is one student, not two; the median cannot be
-- added at all. Incrementing those drifts wrong slowly and silently. A full
-- pass over ~16k events and a few hundred students costs milliseconds, and
-- nobody is waiting on it anyway — readers get yesterday's stored row.
--
-- Apply with:  supabase db query --linked -f supabase/migrations/023_impact_snapshots.sql
-- ============================================================

-- ── 1. course_terms — the catalogue's term column, in SQL ───
-- course_selections stores only course_id; term is resolved through
-- data/courses.ts at runtime and is deliberately not stored on the row.
-- A database function has no catalogue, so it needs this lookup.
--
-- REGENERATE with `bun scripts/build-course-terms.mts` whenever a term is
-- added to data/courses.ts, or every Term N figure below silently omits it.

CREATE TABLE IF NOT EXISTS course_terms (
  course_id integer PRIMARY KEY,
  term      integer NOT NULL
);

TRUNCATE course_terms;
INSERT INTO course_terms (course_id, term) VALUES
  (1,4),(2,4),(3,4),(4,4),(101,4),(5,4),(6,4),(105,4),(7,4),(109,4),
  (8,4),(9,4),(11,4),(10,4),(102,4),(14,4),(15,4),
  (16,5),(17,5),(104,5),(18,5),(19,5),(20,5),(21,5),(110,5),(48,5),(23,5),
  (24,5),(25,5),(26,5),(27,5),(106,5),(28,5),(29,5),(30,5),(49,5),(31,5),(32,5),
  (33,6),(107,6),(34,6),(35,6),(36,6),(37,6),(38,6),(39,6),(108,6),(40,6),
  (41,6),(42,6),(43,6),(44,6),(45,6),(46,6),(47,6);

ALTER TABLE course_terms ENABLE ROW LEVEL SECURITY;
-- Read-only reference data. Nothing identifiable, and the client already
-- ships the same mapping inside data/courses.ts.
DROP POLICY IF EXISTS "course_terms_read" ON course_terms;
CREATE POLICY "course_terms_read" ON course_terms
  FOR SELECT USING (true);

-- ── 2. impact_snapshots — four rows, overwritten daily ──────

CREATE TABLE IF NOT EXISTS impact_snapshots (
  window_key  text PRIMARY KEY CHECK (window_key IN ('all', 'term4', 'term5', 'last30')),
  stats       jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE impact_snapshots ENABLE ROW LEVEL SECURITY;
-- No permissive policy on purpose. The table is reached only through
-- get_impact_snapshot(), which is SECURITY DEFINER. Direct PostgREST reads
-- of this table return nothing, so the read path stays one function wide.

-- ── 3. The recompute ────────────────────────────────────────
--
-- Session time is clamped at SESSION_CAP seconds per session. A session ends
-- on visibilitychange (hooks/useAnalytics.ts), so a tab left open and focused
-- while a student walks away still bills wall clock. 90 minutes is a generous
-- ceiling for planning a schedule; anything above it is idle, not use. This
-- undercounts, deliberately — the number has to survive a dean asking how it
-- was measured.
--
-- The demo account is excluded everywhere. Reviewers clicking around the demo
-- must not appear in the cohort's own figures.

CREATE OR REPLACE FUNCTION public.refresh_impact_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_cap constant integer := 5400;  -- 90 minutes
  window_30   constant interval := interval '30 days';
  demo        constant text := 'demo@mbaplanner.app';
  cohort_size integer;
  registered  integer;
BEGIN
  SELECT count(*) INTO cohort_size FROM cohort_whitelist WHERE lower(email) <> demo;
  SELECT count(*) INTO registered  FROM profiles         WHERE lower(email) <> demo;

  -- Real students only: every CTE below joins through this.
  WITH students AS (
    SELECT id FROM profiles WHERE lower(email) <> demo
  ),

  -- ── per-window user sets ──
  -- 'all'    : anyone who has ever saved a course
  -- 'term4'  : anyone who saved a Term 4 course, whenever they did it
  -- 'term5'  : same for Term 5
  -- 'last30' : anyone with a session in the last 30 days
  --
  -- The term windows deliberately do NOT filter by date. Term 5 is planned
  -- during Term 4, so a date filter would report zero Term 5 planners for
  -- most of the year — the exact cliff that makes a dean think the page is
  -- broken. Term chips scope by COURSE; the 30-day chip scopes by TIME.
  sel AS (
    SELECT cs.user_id, cs.course_id, cs.selected_at, ct.term
    FROM course_selections cs
    JOIN students s ON s.id = cs.user_id
    LEFT JOIN course_terms ct ON ct.course_id = cs.course_id
  ),
  users_all    AS (SELECT DISTINCT user_id FROM sel),
  users_term4  AS (SELECT DISTINCT user_id FROM sel WHERE term = 4),
  users_term5  AS (SELECT DISTINCT user_id FROM sel WHERE term = 5),
  users_last30 AS (
    SELECT DISTINCT us.user_id
    FROM user_sessions us
    JOIN students s ON s.id = us.user_id
    WHERE us.session_start >= now() - window_30
  ),

  -- ── session time, clamped ──
  sess AS (
    SELECT us.user_id,
           us.session_start,
           LEAST(us.duration_seconds, session_cap) AS secs
    FROM user_sessions us
    JOIN students s ON s.id = us.user_id
    WHERE us.duration_seconds IS NOT NULL
      AND us.duration_seconds > 0
  ),

  -- ── one row per window, assembled ──
  windows AS (
    SELECT 'all'::text AS k, (SELECT array_agg(user_id) FROM users_all)    AS uids, false AS time_scoped
    UNION ALL SELECT 'term4',  (SELECT array_agg(user_id) FROM users_term4),  false
    UNION ALL SELECT 'term5',  (SELECT array_agg(user_id) FROM users_term5),  false
    UNION ALL SELECT 'last30', (SELECT array_agg(user_id) FROM users_last30), true
  ),

  per_window AS (
    SELECT
      w.k,
      COALESCE(array_length(w.uids, 1), 0) AS students,

      -- Time on the planner. For the term chips this is the total time spent
      -- by the students who planned that term (all of their time, not just
      -- time during the term). For last30 it is time inside the window.
      COALESCE((
        SELECT sum(secs) FROM sess
        WHERE user_id = ANY(w.uids)
          AND (NOT w.time_scoped OR session_start >= now() - window_30)
      ), 0)::bigint AS total_seconds,

      COALESCE((
        SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY per_user.total)
        FROM (
          SELECT sum(secs) AS total FROM sess
          WHERE user_id = ANY(w.uids)
            AND (NOT w.time_scoped OR session_start >= now() - window_30)
          GROUP BY user_id
        ) per_user
      ), 0)::bigint AS median_seconds,

      -- Courses planned. Term chips count that term's rows; last30 counts
      -- rows saved inside the window; all counts everything.
      COALESCE((
        SELECT count(*) FROM sel
        WHERE (w.k <> 'term4' OR term = 4)
          AND (w.k <> 'term5' OR term = 5)
          AND (NOT w.time_scoped OR selected_at >= now() - window_30)
          AND (NOT w.time_scoped OR user_id = ANY(w.uids))
      ), 0) AS courses_planned,

      COALESCE((
        SELECT count(*) FROM alert_deliveries ad
        JOIN students s ON s.id = ad.user_id
        WHERE ad.status = 'sent'
          AND ad.user_id = ANY(w.uids)
          AND (NOT w.time_scoped OR ad.created_at >= now() - window_30)
      ), 0) AS reminders_sent,

      COALESCE((
        SELECT count(*) FROM chatbot_messages cm
        JOIN students s ON s.id = cm.user_id
        WHERE cm.role = 'assistant'
          AND cm.user_id = ANY(w.uids)
          AND (NOT w.time_scoped OR cm.created_at >= now() - window_30)
      ), 0) AS assistant_answers,

      -- Most-planned course in this window, for a bit of texture.
      (
        SELECT course_id FROM sel
        WHERE (w.k <> 'term4' OR term = 4)
          AND (w.k <> 'term5' OR term = 5)
          AND (NOT w.time_scoped OR selected_at >= now() - window_30)
        GROUP BY course_id ORDER BY count(*) DESC, course_id ASC LIMIT 1
      ) AS top_course_id
    FROM windows w
  )

  INSERT INTO impact_snapshots (window_key, stats, computed_at)
  SELECT
    p.k,
    jsonb_build_object(
      'students',          p.students,
      -- Denominator on every window: each chip states its number as a share
      -- of the class, so "94 students" is never left floating without the
      -- "out of how many" that a reader will ask for anyway.
      'cohort_size',       cohort_size,
      'registered',        registered,
      'term4_planners',    CASE WHEN p.k = 'all' THEN (SELECT count(*) FROM users_term4) ELSE NULL END,
      'term5_planners',    CASE WHEN p.k = 'all' THEN (SELECT count(*) FROM users_term5) ELSE NULL END,
      'returners',         CASE WHEN p.k = 'all' THEN (
                             SELECT count(*) FROM users_term4 t4
                             WHERE EXISTS (SELECT 1 FROM users_term5 t5 WHERE t5.user_id = t4.user_id)
                           ) ELSE NULL END,
      'total_seconds',     p.total_seconds,
      'median_seconds',    p.median_seconds,
      'courses_planned',   p.courses_planned,
      'reminders_sent',    p.reminders_sent,
      'assistant_answers', p.assistant_answers,
      'top_course_id',     p.top_course_id,
      'session_cap_secs',  session_cap
    ),
    now()
  FROM per_window p
  ON CONFLICT (window_key) DO UPDATE
    SET stats = EXCLUDED.stats, computed_at = EXCLUDED.computed_at;
END;
$$;

-- Callable only by the two cron drivers: pg_cron (runs as the owner) and
-- /api/impact/refresh (service role). Never by a logged-in student — this is
-- a full-table recompute, and an endpoint anyone can trigger is a free lever.
REVOKE ALL ON FUNCTION public.refresh_impact_snapshots() FROM public;
GRANT EXECUTE ON FUNCTION public.refresh_impact_snapshots() TO service_role;

-- ── 4. The read path ────────────────────────────────────────
-- One row, already computed. Aggregates only: no user id, no email, no
-- course selection belonging to anyone in particular.

CREATE OR REPLACE FUNCTION public.get_impact_snapshot(p_window text DEFAULT 'all')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
           'window',      s.window_key,
           'computed_at', s.computed_at
         ) || s.stats
  FROM impact_snapshots s
  WHERE s.window_key = COALESCE(p_window, 'all');
$$;

REVOKE ALL ON FUNCTION public.get_impact_snapshot(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_impact_snapshot(text) TO authenticated;

-- ── 5. Daily driver ─────────────────────────────────────────
-- pg_cron where it is enabled. Guarded, because a project without the
-- extension must still get the rest of this migration.
--
-- /api/impact/refresh is registered in vercel.json as the safety net, the
-- same two-driver arrangement the alerts dispatcher uses. Both are
-- idempotent: the recompute overwrites, it never accumulates.

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.unschedule('refresh-impact-snapshots')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-impact-snapshots');
  PERFORM cron.schedule('refresh-impact-snapshots', '17 1 * * *',
                        'SELECT public.refresh_impact_snapshots()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable (%), relying on the Vercel cron driver', SQLERRM;
END;
$$;

-- Seed the four rows now so the strip has something to show before the first
-- scheduled run.
SELECT public.refresh_impact_snapshots();
