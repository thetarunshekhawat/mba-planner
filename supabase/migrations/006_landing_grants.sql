-- Grant anon role write access to landing_sessions.
-- Tables created via raw SQL migrations do not inherit Supabase's
-- default dashboard grants, so anon INSERT/UPDATE must be explicit.
GRANT INSERT, UPDATE ON landing_sessions TO anon;
