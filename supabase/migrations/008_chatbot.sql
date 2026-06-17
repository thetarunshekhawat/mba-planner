-- chatbot_messages: one row per chat message (a user prompt or an assistant reply).
-- Chat is ephemeral for users (the widget resets each visit); rows are retained so
-- admins can see what the cohort is asking. Mirrors the RLS shape of 003_analytics.sql:
-- users insert their own rows, any authenticated user can read (admin UI is gated by
-- email, same as the existing analytics dashboard, which reads via the anon client).
CREATE TABLE IF NOT EXISTS chatbot_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  role            text NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text NOT NULL,
  course_code     text,                                          -- set when course-specific
  intent          text,                                          -- general | course_specific | disambiguation
  model           text,                                          -- which LLM produced an assistant reply
  latency_ms      integer,                                       -- assistant reply latency
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chatbot_messages_insert_own" ON chatbot_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chatbot_messages_read_all" ON chatbot_messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX idx_chatbot_messages_user_id ON chatbot_messages(user_id);
CREATE INDEX idx_chatbot_messages_created ON chatbot_messages(created_at DESC);
CREATE INDEX idx_chatbot_messages_course  ON chatbot_messages(course_code);
CREATE INDEX idx_chatbot_messages_conv    ON chatbot_messages(conversation_id);
