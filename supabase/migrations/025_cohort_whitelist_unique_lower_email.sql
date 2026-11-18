-- ============================================================
-- Cohort whitelist: one row per email, ignoring case
-- ============================================================
-- The login check (components/auth/LoginForm.tsx) matches emails
-- case-insensitively. Two rows differing only by case used to make that check
-- reject a whitelisted user. This index stops such duplicates being inserted.
--
-- Fails if case-variant duplicates already exist; remove them first.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS cohort_whitelist_email_lower_key
  ON public.cohort_whitelist (lower(email));
