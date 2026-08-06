-- ============================================================
-- MBA Planner — Alerts, part 3: extracted course deadlines
--
-- Assignment due dates lifted out of the course outlines: "Group project due
-- 12 September, 30% of grade".
--
-- ── This migration ships EMPTY, on purpose ──────────────────
-- `course_outlines.content` is free-form prose. A runtime model call over it
-- would eventually hallucinate a due date and push it to a hundred phones —
-- strictly worse than not having the feature, because a confidently wrong
-- deadline is acted upon.
--
-- So this follows the insight-engine pattern instead:
--
--   scripts/extract-course-deadlines.mts   proposes candidates offline, each
--                                          carrying a VERBATIM source quote
--        ↓                                 the script (not the model) verifies
--   data/courseDeadlineCandidates.json     committed, reviewed in a diff
--        ↓
--   migration 020                          seeds the survivors
--
-- **Zero runtime model calls, ever.** By the time a row reaches this table a
-- human has read the quote it came from.
--
-- Shape mirrors course_sections: global read, no write policy at all, because
-- rows arrive only by migration.
--
-- Note on `term`: like course_outlines.term this is analytics-only. The real
-- term still resolves through course_code → data/courses.ts, so the standing
-- "no table stores a term" rule is intact.
--
-- Apply with:
--   supabase db query --linked -f supabase/migrations/019_course_deadlines.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS course_deadlines (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code    text NOT NULL,
  term           integer,
  title          text NOT NULL,
  kind           text NOT NULL DEFAULT 'assignment'
                   CHECK (kind IN ('assignment', 'submission', 'presentation',
                                   'quiz', 'exam', 'project', 'other')),
  due_date       date NOT NULL,
  due_time       time,
  weight_pct     numeric(5,2),

  -- Provenance. `source_section` must appear verbatim in the outline text —
  -- the extraction script drops any proposal whose quote it cannot find, which
  -- is the check that makes a hallucinated date impossible to commit.
  source_doc     text,
  source_section text,
  confidence     text CHECK (confidence IN ('high', 'medium', 'low')),

  reviewed_by    text,
  reviewed_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),

  UNIQUE (course_code, title, due_date)
);

CREATE INDEX IF NOT EXISTS course_deadlines_code_idx ON course_deadlines (course_code);
CREATE INDEX IF NOT EXISTS course_deadlines_due_idx  ON course_deadlines (due_date);

ALTER TABLE course_deadlines ENABLE ROW LEVEL SECURITY;

-- Readable by any authenticated cohort member (matches course_sections).
DROP POLICY IF EXISTS "course_deadlines_read_all" ON course_deadlines;
CREATE POLICY "course_deadlines_read_all" ON course_deadlines
  FOR SELECT TO authenticated
  USING (true);

-- No insert/update/delete policy, deliberately: only a migration writes here.

-- Raw-SQL migrations do not inherit dashboard defaults (migration 006). Grant
-- SELECT only, and revoke the writes default privileges may have handed out —
-- so "seeded by migration only" is enforced by privilege, not just by the
-- absence of a policy someone could add later.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON course_deadlines FROM authenticated;
GRANT SELECT ON course_deadlines TO authenticated;
