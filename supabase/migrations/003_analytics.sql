-- user_sessions: one row per browser session
CREATE TABLE IF NOT EXISTS user_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_start    timestamptz NOT NULL DEFAULT now(),
  session_end      timestamptz,
  duration_seconds integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_insert_own" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update_own" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sessions_read_all" ON user_sessions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_start   ON user_sessions(session_start DESC);

-- user_events: one row per tracked user action
CREATE TABLE IF NOT EXISTS user_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  payload     jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_insert_own" ON user_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "events_read_all" ON user_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX idx_events_user_id  ON user_events(user_id);
CREATE INDEX idx_events_type     ON user_events(event_type);
CREATE INDEX idx_events_occurred ON user_events(occurred_at DESC);

-- Expose auth.users.last_sign_in_at to authenticated clients without service role key
CREATE OR REPLACE FUNCTION get_user_last_sign_in()
RETURNS TABLE(user_id uuid, last_sign_in_at timestamptz)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, last_sign_in_at FROM auth.users;
$$;

GRANT EXECUTE ON FUNCTION get_user_last_sign_in() TO authenticated;
