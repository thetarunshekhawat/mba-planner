-- ============================================================
-- Admin users table
-- Manage admins directly in Supabase dashboard — no code change needed.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  email text PRIMARY KEY
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (app needs this to show/hide the Admin button)
CREATE POLICY "admin_users_read" ON admin_users
  FOR SELECT USING (auth.role() = 'authenticated');

-- No app-level insert/update/delete — manage exclusively via Supabase dashboard.

-- Seed current admins
INSERT INTO admin_users (email) VALUES
  ('tarun.shekhawat2027@bitsom.edu.in'),
  ('varad.dharap2027@bitsom.edu.in'),
  ('yash.kolhe2027@bitsom.edu.in'),
  ('apoorv.sharma2027@bitsom.edu.in')
ON CONFLICT DO NOTHING;
