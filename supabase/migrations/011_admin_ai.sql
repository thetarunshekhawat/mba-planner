-- ============================================================
-- MBA Planner — Admin AI (Ask-the-Database assistant)
--
-- Lets an admin ask the database questions in plain English. An LLM
-- (MiniMax-M3) writes a SELECT; the SERVER never trusts that SQL — it is
-- executed through admin_run_readonly_sql(), which is the real safety
-- boundary: admin-gated, read-only, SELECT-only, public-schema-only, with a
-- statement timeout and a hard row cap.
--
-- Run via `supabase db push` or paste into the SQL Editor.
-- ============================================================

-- ── Safe last-sign-in view ──────────────────────────────────
-- Exposes auth.users.last_sign_in_at to the public schema so the AI can answer
-- "who hasn't logged in" WITHOUT the generated SQL ever touching the auth schema
-- (which admin_run_readonly_sql blocks). Mirrors the existing exposure in
-- 003_analytics.sql's get_user_last_sign_in(). The view runs with definer
-- (owner = postgres) privileges, so it can read auth.users; only non-sensitive
-- columns are projected.
CREATE OR REPLACE VIEW public.user_last_sign_in AS
  SELECT id AS user_id, email, last_sign_in_at, created_at
  FROM auth.users;

GRANT SELECT ON public.user_last_sign_in TO authenticated;

-- ── Audit log of every AI query ─────────────────────────────
-- Every question + the SQL it produced is logged here, so admins can review
-- usage — and the AI itself can query this table.
CREATE TABLE IF NOT EXISTS admin_ai_queries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  question      text NOT NULL,
  generated_sql text,
  row_count     integer,
  model         text,
  latency_ms    integer,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_ai_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_ai_queries_insert_own" ON admin_ai_queries
  FOR INSERT WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "admin_ai_queries_read_auth" ON admin_ai_queries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_admin_ai_queries_created ON admin_ai_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_ai_queries_actor   ON admin_ai_queries(actor_id);

GRANT SELECT, INSERT ON admin_ai_queries TO authenticated;

-- ── The read-only SQL executor (THE safety boundary) ────────
-- SECURITY DEFINER so it can read every public table regardless of RLS (admins
-- see everything). Because students are also 'authenticated', the in-function
-- admin check — not the API route — is the real gate.
CREATE OR REPLACE FUNCTION admin_run_readonly_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email  text;
  v_q      text;
  v_result jsonb;
BEGIN
  -- 1. Admin gate (mirrors the hardcoded ADMIN_EMAILS set in the app).
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email NOT IN (
    'tarun.shekhawat2027@bitsom.edu.in',
    'varad.dharap2027@bitsom.edu.in',
    'yash.kolhe2027@bitsom.edu.in',
    'apoorv.sharma2027@bitsom.edu.in'
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- 2. Normalize: trim, drop a single trailing semicolon.
  v_q := regexp_replace(btrim(query), ';\s*$', '');

  IF v_q IS NULL OR v_q = '' THEN
    RAISE EXCEPTION 'empty query';
  END IF;

  -- 3. Single statement only (no stacked queries).
  IF v_q ~ ';' THEN
    RAISE EXCEPTION 'only a single statement is allowed';
  END IF;

  -- 4. SELECT / WITH only.
  IF v_q !~* '^\s*(select|with)\y' THEN
    RAISE EXCEPTION 'only SELECT queries are allowed';
  END IF;

  -- 5. Schema fence — keep the AI inside the public schema.
  IF v_q ~* '\y(auth|information_schema|storage|vault|extensions|graphql|graphql_public|realtime|supabase_functions|net|cron)\.' THEN
    RAISE EXCEPTION 'querying that schema is not allowed';
  END IF;
  IF v_q ~* '\ypg_[a-z]' THEN
    RAISE EXCEPTION 'querying system catalogs is not allowed';
  END IF;

  -- 6. Read-only + bounded. The read-only transaction is what truly prevents
  --    writes even if the checks above are somehow bypassed.
  SET LOCAL transaction_read_only = on;
  SET LOCAL statement_timeout = '8s';

  -- 7. Execute, capping rows and aggregating into JSON.
  EXECUTE format(
    'SELECT coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM (SELECT * FROM (%s) _sub LIMIT 5000) t',
    v_q
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Lock down who can call it: authenticated only (the body re-checks for admin).
REVOKE ALL ON FUNCTION admin_run_readonly_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_run_readonly_sql(text) TO authenticated;

-- ── Public-schema overview (so the AI knows what it can query) ──
-- PostgREST does not expose information_schema, so the route fetches the table/
-- column catalog through this admin-gated function and feeds it to the model.
-- Returns: { "table_name": ["col data_type", ...], ... }
CREATE OR REPLACE FUNCTION admin_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email  text;
  v_result jsonb;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email NOT IN (
    'tarun.shekhawat2027@bitsom.edu.in',
    'varad.dharap2027@bitsom.edu.in',
    'yash.kolhe2027@bitsom.edu.in',
    'apoorv.sharma2027@bitsom.edu.in'
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT jsonb_object_agg(table_name, cols) INTO v_result FROM (
    SELECT table_name,
           jsonb_agg((column_name || ' ' || data_type) ORDER BY ordinal_position) AS cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
  ) t;

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION admin_schema() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_schema() TO authenticated;
