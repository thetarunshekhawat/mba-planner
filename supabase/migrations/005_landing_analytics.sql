-- Landing page anonymous session tracking
-- Captures pre-auth visits, ring engagement, and conversion funnel
CREATE TABLE IF NOT EXISTS landing_sessions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id                     text NOT NULL UNIQUE,      -- sessionStorage UUID, one per browser tab session
  user_id                     uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- linked after successful login
  landed_at                   timestamptz NOT NULL DEFAULT now(),
  first_ring_interaction_at   timestamptz,               -- first pointer-down on the ring
  ring_interaction_ms         integer NOT NULL DEFAULT 0, -- total accumulated time dragging/interacting
  login_attempted             boolean NOT NULL DEFAULT false,
  login_succeeded             boolean NOT NULL DEFAULT false,
  abandoned                   boolean NOT NULL DEFAULT false,
  device_type                 text,
  browser                     text
);

ALTER TABLE landing_sessions ENABLE ROW LEVEL SECURITY;

-- Anonymous users (pre-auth) can insert their own row
CREATE POLICY "landing_insert_anon" ON landing_sessions
  FOR INSERT WITH CHECK (true);

-- Anyone can update (anon_id/UUID unguessable — safe for this closed cohort)
CREATE POLICY "landing_update_anon" ON landing_sessions
  FOR UPDATE USING (true);

-- Authenticated users can read all (for admin dashboard)
CREATE POLICY "landing_read_auth" ON landing_sessions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX idx_landing_anon_id  ON landing_sessions(anon_id);
CREATE INDEX idx_landing_user_id  ON landing_sessions(user_id);
CREATE INDEX idx_landing_landed   ON landing_sessions(landed_at DESC);
