/**
 * The read-only demo account.
 *
 * One address, shared with faculty reviewing the project. It skips OTP
 * (see app/api/demo-login/route.ts) and cannot write anything: the client
 * short-circuits its writes so the UI still responds, and migration
 * 015_demo_account.sql denies them at the database so the UI is not the
 * thing being trusted.
 *
 * The demo plan is a copy of a real student's Term 4 selections, seeded by
 * scripts/seed-demo-account.mjs, so the schedule looks lived-in.
 */
export const DEMO_EMAIL = 'demo@mbaplanner.app';

export function isDemoEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase().trim() === DEMO_EMAIL;
}
