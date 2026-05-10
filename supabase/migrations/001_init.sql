-- ============================================================
-- MBA Planner — Initial Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Pre-seeded cohort email whitelist
-- Admin pastes student emails here before sharing the app
CREATE TABLE IF NOT EXISTS cohort_whitelist (
  email       text PRIMARY KEY,
  display_name text NOT NULL DEFAULT ''
);

-- User profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text UNIQUE NOT NULL,
  name            text NOT NULL DEFAULT '',
  specializations text[] NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Per-user course selections
CREATE TABLE IF NOT EXISTS course_selections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id   integer NOT NULL,
  selected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- ── Row Level Security ──────────────────────────────────────

ALTER TABLE cohort_whitelist   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_selections  ENABLE ROW LEVEL SECURITY;

-- Whitelist: readable by anyone (anon) — needed for pre-login email check
CREATE POLICY "whitelist_read" ON cohort_whitelist
  FOR SELECT USING (true);

-- Profiles: everyone in the cohort can read all profiles (for stats)
CREATE POLICY "profiles_read_all" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Profiles: users can insert/update only their own
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Selections: everyone can read all (for cohort stats)
CREATE POLICY "selections_read_all" ON course_selections
  FOR SELECT USING (auth.role() = 'authenticated');

-- Selections: users can only insert/delete their own
CREATE POLICY "selections_insert_own" ON course_selections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "selections_delete_own" ON course_selections
  FOR DELETE USING (auth.uid() = user_id);

-- ── Auto-create profile on first login ─────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (SELECT display_name FROM public.cohort_whitelist WHERE email = NEW.email),
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Updated_at trigger ──────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
