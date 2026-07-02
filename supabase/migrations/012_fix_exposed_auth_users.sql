-- ============================================================
-- MBA Planner — Fix lint "Exposed Auth Users" (0002_auth_users_exposed)
--
-- 011_admin_ai.sql granted SELECT on public.user_last_sign_in to the
-- `authenticated` role. Because the view is owned by postgres (which can read
-- auth.users) and lives in the PostgREST-exposed public schema, ANY logged-in
-- user could read every user's email + last_sign_in_at via the REST API.
--
-- The view's only legitimate consumer is the admin "Ask AI" flow, where the
-- generated SQL runs inside admin_run_readonly_sql() — a SECURITY DEFINER
-- function owned by postgres and gated to admin emails. That function executes
-- as its definer, so it reads the view WITHOUT needing any grant to
-- `authenticated`. Revoking the grant therefore closes the leak while keeping
-- the admin AI fully functional.
-- ============================================================

REVOKE SELECT ON public.user_last_sign_in FROM authenticated;

-- Belt-and-suspenders: ensure no broad role retains access either.
REVOKE ALL ON public.user_last_sign_in FROM anon, authenticated, PUBLIC;
