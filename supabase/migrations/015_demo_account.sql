-- ============================================================
-- MBA Planner — Read-only demo account
--
-- Purpose: give an external reviewer (faculty evaluating the project)
-- a working login that needs no OTP and cannot mutate cohort data.
--
-- The demo account is a normal auth user. What makes it a demo:
--   1. /api/demo-login mints its session server-side, so no OTP is typed.
--   2. The RESTRICTIVE policies below make every write fail at the
--      database, for every table that holds real cohort state.
--
-- The client also skips the writes (lib/demo.ts + useSelections), so the
-- UI still responds to clicks. That is a UX convenience. THIS FILE is the
-- actual guarantee: even a hand-crafted REST call carrying the demo user's
-- JWT cannot change another student's plan, or its own.
--
-- Apply with:  supabase db query --linked -f supabase/migrations/015_demo_account.sql
-- ============================================================

-- ── 1. Whitelist the demo address ───────────────────────────
-- The login form checks cohort_whitelist before sending a code, and the
-- handle_new_user() trigger reads display_name from here, so seeding this
-- row also names the profile.

INSERT INTO cohort_whitelist (email, display_name)
VALUES ('demo@mbaplanner.app', 'Demo Reviewer')
ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name;

-- ── 2. Am I the demo user? ──────────────────────────────────
-- SECURITY DEFINER so it can read auth.users, but it only ever reports on
-- the *caller's own* row and returns a bare boolean. It leaks nothing:
-- callers already know their own email. This is deliberately narrower than
-- the view that migration 012 had to revoke.

CREATE OR REPLACE FUNCTION public.is_demo_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT lower(u.email) = 'demo@mbaplanner.app'
       FROM auth.users u
      WHERE u.id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_demo_user() FROM public;
GRANT EXECUTE ON FUNCTION public.is_demo_user() TO authenticated;

-- ── 3. Deny every write on cohort state ─────────────────────
-- RESTRICTIVE policies AND with the existing permissive ones, so these
-- cannot be satisfied by any other policy. Read paths are untouched: the
-- demo account sees the whole planner exactly as a student does.

-- course_selections — the student's plan
DROP POLICY IF EXISTS "demo_no_insert" ON course_selections;
CREATE POLICY "demo_no_insert" ON course_selections
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_update" ON course_selections;
CREATE POLICY "demo_no_update" ON course_selections
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_delete" ON course_selections;
CREATE POLICY "demo_no_delete" ON course_selections
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_user());

-- profiles — name, specializations, friend code
DROP POLICY IF EXISTS "demo_no_insert" ON profiles;
CREATE POLICY "demo_no_insert" ON profiles
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_update" ON profiles;
CREATE POLICY "demo_no_update" ON profiles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_user());

-- friendships — the social graph
DROP POLICY IF EXISTS "demo_no_insert" ON friendships;
CREATE POLICY "demo_no_insert" ON friendships
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_delete" ON friendships;
CREATE POLICY "demo_no_delete" ON friendships
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_user());

-- course_sections — registrar section assignments
DROP POLICY IF EXISTS "demo_no_insert" ON course_sections;
CREATE POLICY "demo_no_insert" ON course_sections
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_update" ON course_sections;
CREATE POLICY "demo_no_update" ON course_sections
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_user());

DROP POLICY IF EXISTS "demo_no_delete" ON course_sections;
CREATE POLICY "demo_no_delete" ON course_sections
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_user());

-- ── 4. Close the SECURITY DEFINER side doors ────────────────
-- The two friend RPCs run as owner, so RLS does not apply to them. They
-- need the guard inline. Bodies are otherwise unchanged from 007.

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
  IF public.is_demo_user() THEN
    RAISE EXCEPTION 'demo_read_only';
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

CREATE OR REPLACE FUNCTION public.regenerate_friend_code()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_me   uuid := auth.uid();
  v_code text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF public.is_demo_user() THEN
    RAISE EXCEPTION 'demo_read_only';
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
$function$;

GRANT EXECUTE ON FUNCTION add_friend_by_code(text)   TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_friend_code()   TO authenticated;

-- Analytics tables (user_events, user_sessions, landing_sessions,
-- chatbot_messages) are intentionally NOT restricted. They are append-only
-- telemetry about the demo session itself and change nobody's plan, and
-- blocking them would make the chatbot and session tracking throw.
