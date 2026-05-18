@AGENTS.md

## Admin access
Admins are hardcoded in `ADMIN_EMAILS` (a `Set<string>`) at the top of `app/admin/page.tsx`, `app/planner/page.tsx`, and `app/kyoto/page.tsx`. All emails must be lowercase.

Current admins:
- `tarun.shekhawat2027@bitsom.edu.in`
- `varad.dharap2027@bitsom.edu.in`
- `yash.kolhe2027@bitsom.edu.in`
- `apoorv.sharma2027@bitsom.edu.in`

Rules:
- Only these emails should ever see admin-related UI (button, page, links).
- Non-admin users must see the planner exactly as before — no trace of admin features.
- The check always uses `.toLowerCase()` on the email before calling `.has()`.
- When adding a new admin, update `ADMIN_EMAILS` in **all three** files and this list.
