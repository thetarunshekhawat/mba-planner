-- ============================================================
-- Per-user course section assignments (Section A / B)
-- Backfilled from registrar seating charts via
-- scripts/assign-course-sections.js (service-role, bypasses RLS).
-- ============================================================

CREATE TABLE IF NOT EXISTS course_sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id   integer NOT NULL,
  section     text NOT NULL CHECK (section IN ('A', 'B')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;

-- Readable by any authenticated cohort member (matches course_selections'
-- read-all pattern — needed for the timetable to filter timings per user).
CREATE POLICY "course_sections_read_all" ON course_sections
  FOR SELECT USING (auth.role() = 'authenticated');

-- No insert/update/delete policy: only the service-role backfill script
-- writes to this table (bypasses RLS entirely, like avatars/outlines).
