-- ============================================================
-- MBA Planner — Friends & Schedule Overlay
-- Adds shareable friend codes + a directed friendship graph.
-- Run via `supabase db push` or paste into the SQL Editor.
--
-- Semantics:
--   • Add is two-way   — entering B's code creates BOTH (A→B) and (B→A) edges.
--   • Remove is one-way — A removing B deletes only the (A→B) edge.
-- A row (viewer_id, friend_id) means "viewer can see friend's schedule".
-- ============================================================

-- ── Friend codes on profiles ────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friend_code text UNIQUE;

-- Random 6-char code from an unambiguous alphabet (no 0/O/1/I/L).
CREATE OR REPLACE FUNCTION gen_friend_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result   text := '';
  i        int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Assign a unique code to a profile if it doesn't already have one.
-- Retries on the (rare) unique collision. Idempotent.
CREATE OR REPLACE FUNCTION assign_friend_code(p_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_code     text;
  v_existing text;
BEGIN
  SELECT friend_code INTO v_existing FROM public.profiles WHERE id = p_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;
  LOOP
    v_code := public.gen_friend_code();
    BEGIN
      UPDATE public.profiles SET friend_code = v_code WHERE id = p_id;
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      -- collision, try another code
    END;
  END LOOP;
END;
$$;

-- Let the signed-in user mint a fresh unique code for themselves.
CREATE OR REPLACE FUNCTION regenerate_friend_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me   uuid := auth.uid();
  v_code text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  LOOP
    v_code := gen_friend_code();
    BEGIN
      UPDATE profiles SET friend_code = v_code WHERE id = v_me;
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      -- collision, try another code
    END;
  END LOOP;
END;
$$;

-- Backfill codes for everyone who already has a profile.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE friend_code IS NULL LOOP
    PERFORM public.assign_friend_code(r.id);
  END LOOP;
END $$;

-- New signups get a friend code automatically.
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
  PERFORM public.assign_friend_code(NEW.id);
  RETURN NEW;
END;
$$;

-- ── Friendship graph ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS friendships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- can see friend's schedule
  friend_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- whose schedule is visible
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,          -- who initiated the add
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (viewer_id, friend_id),
  CHECK (viewer_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_viewer ON friendships(viewer_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Read all: consistent with profiles/course_selections (admin reads whole graph,
-- no service role). Privacy is enforced socially + client-side, like the rest of the app.
CREATE POLICY "friendships_read_all" ON friendships
  FOR SELECT USING (auth.role() = 'authenticated');

-- One-way remove: you may only delete edges where you are the viewer.
CREATE POLICY "friendships_delete_own" ON friendships
  FOR DELETE USING (viewer_id = auth.uid());

-- No INSERT policy on purpose — adds go through add_friend_by_code() (SECURITY
-- DEFINER), which must insert the reciprocal (B→A) row whose viewer_id <> auth.uid().

-- ── Add a friend by code (creates BOTH directed edges) ──────

CREATE OR REPLACE FUNCTION add_friend_by_code(p_code text)
RETURNS TABLE(friend_id uuid, friend_name text, friend_email text, specializations text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_me     uuid := auth.uid();
  v_friend uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id INTO v_friend FROM profiles
    WHERE upper(friend_code) = upper(btrim(p_code));

  IF v_friend IS NULL THEN
    RAISE EXCEPTION 'code_not_found';
  END IF;
  IF v_friend = v_me THEN
    RAISE EXCEPTION 'self_add';
  END IF;

  INSERT INTO friendships (viewer_id, friend_id, created_by)
    VALUES (v_me, v_friend, v_me)
    ON CONFLICT (viewer_id, friend_id) DO NOTHING;
  INSERT INTO friendships (viewer_id, friend_id, created_by)
    VALUES (v_friend, v_me, v_me)
    ON CONFLICT (viewer_id, friend_id) DO NOTHING;

  RETURN QUERY
    SELECT p.id, p.name, p.email, p.specializations
    FROM profiles p WHERE p.id = v_friend;
END;
$$;

-- ── Grants (raw SQL migrations don't inherit dashboard defaults) ──

GRANT SELECT, DELETE ON friendships TO authenticated;
GRANT EXECUTE ON FUNCTION add_friend_by_code(text)   TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_friend_code()   TO authenticated;
