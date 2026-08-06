// The admin allowlist — the single source of truth.
//
// This set used to be copy-pasted into four files (app/admin/page.tsx,
// app/planner/page.tsx, app/kyoto/page.tsx, app/api/admin/query/route.ts) while
// CLAUDE.md told you to update "all three". Adding an admin therefore had a
// one-in-four chance of leaving a surface that still refused them — silently,
// since a missing admin just sees the normal student UI. One list, imported
// everywhere, removes the whole failure mode.
//
// Emails must be lowercase; every caller lowercases the candidate before
// checking, which is what `isAdminEmail` does for you.
//
// This is *not* the security boundary. Anything that matters server-side is
// re-checked in the database — see `admin_run_readonly_sql` in
// supabase/migrations/011_admin_ai.sql. These checks gate UI and give routes a
// fast first rejection.

export const ADMIN_EMAILS = new Set<string>([
  'tarun.shekhawat2027@bitsom.edu.in',
  'varad.dharap2027@bitsom.edu.in',
  'yash.kolhe2027@bitsom.edu.in',
  'apoorv.sharma2027@bitsom.edu.in',
]);

/** The one admin who also sees the Ask-AI audit log. */
export const SUPER_ADMIN_EMAIL = 'tarun.shekhawat2027@bitsom.edu.in';

/** True if `email` is an admin. Null/undefined-safe, and lowercases for you. */
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase());
}

/** True if `email` is the super-admin. */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === SUPER_ADMIN_EMAIL;
}
