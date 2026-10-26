-- ============================================================
-- Applied AI credit — "I took the Applied AI course last year"
-- ============================================================
-- Ringel's ABMA (AI in Business) is mandatory and always counts as 1 of the 16
-- elective credits (lib/progress.ts). Students who took the Applied AI course last
-- year get that course added as 1 more elective credit on top. This is the
-- per-student flag; it never subtracts anything.
--
-- Picked up for free by the existing profiles.select('*') in app/planner/page.tsx
-- and app/kyoto/page.tsx. No RLS change: the existing profiles policies already
-- let a user update their own row (same as `specializations`), and the demo
-- account's restrictive demo_no_update policy (migration 015) still blocks the
-- demo user — the client keeps the demo choice in localStorage only.
--
-- Safe to apply any time: until it is applied the app keeps the choice in
-- localStorage (mbap.profile.tookAppliedAi) and ignores the failed update.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS took_applied_ai boolean NOT NULL DEFAULT false;
