@AGENTS.md

## Course time-awareness (applies to every student-facing surface)

A course whose last class has passed is **finished**, and the app must never talk about it as
if it were still ahead of the student. This is a standing rule — it applies to anything built
later, not just the surfaces listed below.

The helpers in `lib/terms.ts` are the only source of truth. Never re-derive "is this over?"
by hand, and never hardcode a date:
- `campusToday()` — today's date as `YYYY-MM-DD` on the IST calendar. Used on both the server
  (UTC on Vercel) and the client so the two never disagree.
- `isCourseCompleted(course)` — last class day has passed.
- `completedCourseCodes()` — codes whose teaching is fully over (accounts for makeup sessions:
  a code counts as finished only when every row carrying it has ended).

Rules for anything that surfaces course content:
- **No prep advice for a finished course.** "Install JMP Pro before day one", "front-load your
  prep", "attendance is strict", "40% is group work" — all noise once the course is over. Same
  for "you skipped X": a course that can no longer be taken isn't a choice any more.
- **Retrospective and forward-looking content is fine and should survive.** "Liked FSA? here's
  the Term 5 sequel" only gets more relevant after the last class. Nudges declare this with
  `staysAfterEnd: true` (`lib/chat/nudgeFallback.ts`); the insight engine sets it for
  forward-facet insights.
- **Everything must be derived from today's date, never a manual flag**, so it keeps working
  as the term rolls on with no one editing anything.
- Where a finished course still needs to be reachable (the greeting's course list, the input
  typeahead), keep it available but demote it — sink it below active courses and mark it
  "Done". Don't remove the ability to ask about it.
- Any new nudge source goes through `prepare()` in `hooks/useChatNudges.ts` — that gate is the
  backstop that drops nudges tied to finished courses.
- The chat model is told the date and each course's status via the `[COMPLETED …]` /
  `[RUNNING NOW]` / `[not started yet]` tags in `lib/chat/prompt.ts`. Any new place that lists
  courses for the model must carry the same tag.

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
