-- Add device/browser/performance metadata to session rows
ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Security events: admin audit trail, calendar rate limits, anomalies
CREATE TABLE IF NOT EXISTS security_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  payload     jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_insert_own" ON security_events
  FOR INSERT WITH CHECK (auth.uid() = actor_id OR actor_id IS NULL);

CREATE POLICY "security_read_authenticated" ON security_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX idx_security_actor   ON security_events(actor_id);
CREATE INDEX idx_security_type    ON security_events(event_type);
CREATE INDEX idx_security_occurred ON security_events(occurred_at DESC);
