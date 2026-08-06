@AGENTS.md

# MBA Planner — orientation

Course planner for the BITSoM Co'27 cohort. Students browse the Year-2 elective catalogue,
build a schedule, compare it with friends, export it, and ask an AI assistant about it.
Admins get a cohort analytics dashboard.

Read this file first. It is the map; the sections below are the standing rules.

---

## Rule 0 — keep this file true

**Any change to the course catalogue, term structure, database schema, analytics events, or
the insight engine must update the matching section of this file in the same change.** Add a
`CHANGELOG.md` entry too.

This is not bookkeeping for its own sake. `README.md` was allowed to drift and ended up
documenting tables that never existed (`friends_list`, `friend_selections`) and a migration
workflow nobody used — which is worse than having no documentation, because it was believed.
If you change something described here and don't update the description, you have created
that problem again.

When a section here disagrees with the code, the code is right and the section is a bug.

---

## Architecture map

```
data/courses.ts        THE CATALOGUE — single source of truth for every course in every term
data/professors.ts     Login-screen faculty carousel (term-tagged)
data/term1courses.ts   Term 1 retake timeline (reference-only side panel on Term 4)
data/term4Insights.json / term5Insights.json
                       Generated nudge catalogues (see "Insight engine")
lib/terms.ts           Term dates, current term, "has this course finished?"
lib/conflicts.ts       Section-clash advisories (A/B section resolution)
lib/calendar.ts        ICS export
lib/admin.ts           THE admin allowlist — imported everywhere, declared nowhere else
lib/chat/*             AI assistant: routing, prompt, nudges, insight selection
lib/alerts/*           Competition/deadline alerts: Unstop mapping, reminder scheduling,
                       round progress, IST helpers, shared PostgREST paging
components/planner/*   The main planner UI (Plan / My Schedule / Friends / Alerts)
.claude/skills/unstop-import/
                       The only sanctioned path to a cohort-wide competition
components/planner-kyoto/*   Alternate visual skin at /kyoto — a parallel design, not admin
components/admin/*     Admin dashboard + Metrics panel + Ask-AI
supabase/migrations/*  Schema, applied via the CLI (see "Supabase")
```

### `data/courses.ts` ids are load-bearing

The database stores **only integer `course_id`** — `course_selections` and `course_sections`
have no course name, no code, no term. The id → course mapping exists nowhere but
`data/courses.ts`.

**Never repoint an existing id at a different course.** Every student who picked that id
silently becomes enrolled in something they never chose.

Worked example: Term 5 originally listed "First Principles of Consulting" as id 22. That
course was dropped from the Term 5 structure and replaced by FDE Management. Repointing id 22
would have converted 10 students' picks into a different course. Instead id 22 was retired and
FDE Management got a fresh id (48). Those 10 selection rows are now orphaned — they resolve to
no course and are ignored by the UI. Retiring and orphaning is the correct trade.

Id bands, so new courses don't collide:

| Band | Meaning |
|---|---|
| 1–15 | Term 4 electives + exam/free sentinels |
| 16–32 | Term 5 electives + sentinels (22 retired) |
| 33–47 | Term 6 electives + sentinels |
| 48+ | Later additions (48 = FDEM, 49 = AI Incubation Project) |
| 101–108 | WaW courses (110 = DGTK) |
| 109 | One-off makeup row (SADT, Aug 5) |

---

## Term model

`lib/terms.ts` owns term dates and completion; **never hardcode a date or re-derive "is this
over?" by hand.**

- `TERM_DATES` — the three Year-2 terms with start/end dates.
- `getCurrentTerm()` — which term today falls in. Everything term-sensitive derives from this,
  so the app rolls over on its own with nobody editing anything.
- `campusToday()` — today on the IST calendar. Used on both server (UTC on Vercel) and client
  so the two never disagree about when a course ended.
- `isCourseCompleted(course)` / `completedCourseCodes()` — see "Course time-awareness" below.

### Block calendars are duplicated in four places

A term's block structure (which fortnights exist, and their dates) is written out in:

1. `data/courses.ts` — each course's `block`, `startDate`, `endDate`
2. `components/planner/TimetableView.tsx` — `SCHEDULE_BY_TERM` (one row per block-week)
3. `components/planner-kyoto/TimetableView.tsx` — `BLOCKS_BY_TERM` (one row per whole block)
4. The insight engines' `course_meta[*].blocks`

**These must stay in sync.** There is no runtime check. `scripts/verify-timings.mts` catches
drift between (1) and the real timetable, but nothing catches drift between (1) and (2)/(3).

### Course time-awareness (applies to every student-facing surface)

A course whose last class has passed is **finished**, and the app must never talk about it as
if it were still ahead of the student. This is a standing rule — it applies to anything built
later, not just the surfaces listed below.

The helpers in `lib/terms.ts` are the only source of truth:
- `isCourseCompleted(course)` — last class day has passed.
- `completedCourseCodes()` — codes whose teaching is fully over (accounts for makeup sessions:
  a code counts as finished only when every row carrying it has ended).

Rules:
- **No prep advice for a finished course.** "Install JMP Pro before day one", "front-load your
  prep", "attendance is strict", "40% is group work" — all noise once the course is over. Same
  for "you skipped X": a course that can no longer be taken isn't a choice any more.
- **Retrospective and forward-looking content is fine and should survive.** "Liked FSA? here's
  the Term 5 sequel" only gets more relevant after the last class. Nudges declare this with
  `staysAfterEnd: true` (`lib/chat/nudgeFallback.ts`); the insight engine sets it for
  forward-facet insights.
- **Everything must be derived from today's date, never a manual flag.**
- Where a finished course still needs to be reachable (the greeting's course list, the input
  typeahead), keep it available but demote it — sink it below active courses and mark it
  "Done". Don't remove the ability to ask about it.
- Any new nudge source goes through `prepare()` in `hooks/useChatNudges.ts` — that gate is the
  backstop that drops nudges tied to finished courses.
- **Alerts is a governed surface too.** `lib/alerts/courseDeadlines.ts` emits nothing for a
  finished course, dates everything from `campusToday()`, and never reads a stored flag.
- The chat model is told the date and each course's status via the `[COMPLETED …]` /
  `[RUNNING NOW]` / `[not started yet]` tags in `lib/chat/prompt.ts`. Any new place that lists
  courses for the model must carry the same tag.

---

## Adding a new term

Distilled from building out Term 5. Term 6 should be a mechanical repeat.

1. **Catalogue** (`data/courses.ts`) — one row per course with `code`, real block `startDate`/
   `endDate`, `timings`, `seats`, `specs`, `mandatoryFor`, `outlineUrl`. Give new courses new
   ids (see the id bands above); never reuse a retired one. `mandatoryFor` comes from the
   **red font** in the structure spreadsheet.
   - Two-section courses use `part: 'A' | 'B'`; `lib/conflicts.ts` then resolves clashes
     automatically. Do **not** invent `conflictGroup` values for courses that merely share a
     slot — that produces a false red "cannot be taken together" banner.
   - Courses spanning two blocks use `block2Days` / `block2Week2Days` (see FSAT).
2. **Verify the transcription** — `npx tsx scripts/verify-timings.mts` cross-checks every
   generated class date against a hand-transcribed expectation. Add the new term's expected
   dates to `EXPECTED` there. This is the step that catches timetable typos.
3. **Schedule grid** — add the term to `SCHEDULE_BY_TERM` in
   `components/planner/TimetableView.tsx` (and `BLOCKS_BY_TERM` in the kyoto skin). Non-teaching
   notices (exam break, placements week, term break) are `banners` / `trailing` data on those
   rows, not hardcoded JSX.
4. **Outlines** — drop the files in `<repo>/Term N course outlines/` named `<code>.<ext>`, add
   the term to `TERMS` in `scripts/upload-outlines.js`, run
   `node scripts/upload-outlines.js --term N`, then write a migration seeding
   `course_outlines` with the extracted text. **Prefix each body with the authoritative header**
   from `scripts/build-outline-headers.mts` — the school circulates the previous cohort's
   outlines with stale term/block/date headers, and the chatbot answers from this text.
5. **Insight engine** — copy `Term5 Insight Engine/` and rewrite `course_master.py` plus the
   four `insights_*.py` modules. Register the generated JSON in `ENGINES` in
   `lib/chat/insightEngine.ts`.
6. **Professors** — add faculty to `data/professors.ts` tagged with the new term. The login
   ring shows only the current term's faculty, so it doesn't overcrowd.
7. **Docs** — update this file and `CHANGELOG.md` (Rule 0).

`lib/calendar.ts`, `lib/conflicts.ts`, `lib/courseSearch.ts`, the Plan tab, exports, friend
overlays and all four Supabase hooks need **no changes** — they are driven by the catalogue and
start working for a new term the moment step 1 lands.

---

## Insight engine

The chat launcher shows proactive "nudges". These are **not** model-generated — they are
selected from a pre-built, source-anchored catalogue, so they cost zero API budget and cannot
hallucinate.

```
Term4 Insight Engine/  +  Term4 Deterministic Engine/  →  Term4 Combined Engine/merge_engines.py
                                                       →  data/term4Insights.json   (335)
Term5 Insight Engine/build.py                          →  data/term5Insights.json   (267)
```

Authoring lives in Python. Each insight is scored on **7 weighted rubric dimensions**
(`rubric.py`: decision impact, non-obviousness, logistics/conflict, quality of life,
effort/risk, forward/career, source confidence) into P1/P2/P3, which the build maps onto the
runtime's Critical/High/Medium/Low/Flavor tiers. Every row carries **three voices** —
`insight_text` (primary), `variant_dry`, `variant_quirky` — and `pickVoice()` rotates between
them by day so a repeated insight reappears in a fresh register.

Every factual claim cites a `source_doc` and `source_section` and carries a confidence level.
Nothing about grading, schedule or policy is invented.

**Runtime** (`lib/chat/insightEngine.ts`): one engine per term in `ENGINES`. Portfolio
variables (`selected_count`, `max_block_load`, `exam_count`, …) are computed **per term** —
they describe one term's load, so pooling terms would produce numbers true of neither. Each
term's insights are evaluated against its own context, then the eligible sets are merged and
ordered by a tier-weighted, diversity-aware greedy schedule.

Rebuild: `cd "Term5 Insight Engine" && python3 build.py` (writes the runtime JSON directly).
Smoke-test: `npx tsx scripts/verify-insights.mts`.

---

## Alerts

The fourth planner tab: case-competition and deadline reminders, delivered in-app and by web
push. Competitions come from Unstop's public JSON API — no scraping.

### Two-level visibility, and why students can't publish

| Added by | Result |
|---|---|
| Admin via the `unstop-import` skill | **Global** — the whole cohort sees it |
| Anyone via the website | **Private** to them |
| Admin via the website, "publish to everyone" ticked | Global |

The RLS INSERT policy on `competitions` pins `visibility = 'private' AND created_by =
auth.uid()`, so a student with a hand-crafted REST call and a valid JWT still cannot publish
cohort-wide. Global rows are reachable **only** through the service-role client, which means
only `/api/alerts/import` (bearer `ALERTS_IMPORT_SECRET`) and the admin branch of
`/api/alerts/unstop`. The admin check lives in the route, not a policy, because a policy can't
see the caller's email without another SECURITY DEFINER function — see migration 012.

`competitions.owner_key` is a generated column: global rows share a sentinel uuid so that
`UNIQUE (source, source_id, owner_key)` actually conflicts. With `created_by` NULL it wouldn't
— NULLs never conflict in a Postgres unique index — and the same competition could be
published twice.

### When the link isn't an Unstop link

Students paste links from Dare2Compete, a company careers page, a Google Form. The importer
cannot read those, and until migration 020 the interaction ended at an error message — the
student's actual intent ("I want to track this") was discarded, and the only people who could
act on it never learned the ask existed.

`/api/alerts/unstop` now marks its two *recoverable* refusals with `canRequest: true` (not an
Unstop link; Unstop refused to serve it). A blank box is a typo, not an ask, and carries no
flag. The dialog turns that into "Do you want an admin to add this competition?", and a yes
writes a row to `competition_requests`.

**A request is not a competition.** Nothing on it is verified — no title, no rounds, no dates,
and no guarantee the link is a competition at all. Putting it in `competitions` behind a
pending flag would oblige every reader (the dispatcher, the cards, `chainProgress`) to learn to
skip it, and one missed filter puts a fictional deadline on a hundred phones. A separate table
cannot reach those paths.

The admin queue lives in the admin **Alerts** tab, grouped by url so "four people want this
one" is visible — that is the number that decides whether importing is worth it. Marking a
request *Added* only answers it; the import itself is still the `unstop-import` skill or a
migration.

`competition_requests` reads through `/api/alerts/requests` with the **service-role client
behind an `isAdminEmail()` gate**, not the browser's session. Its RLS SELECT policy is
`user_id = auth.uid()` with no admin policy, so a direct client read would return only the
admin's own asks — the feature failing silently. An RLS policy that recognised admins would
need a SECURITY DEFINER function reading `auth.users.email`, forking the admin list into a
second source of truth alongside `lib/admin.ts`. Same reasoning as the admin branch of
`/api/alerts/unstop`.

⚠️ **The rest of the admin Alerts panel does not do this**, and is wrong because of it: it reads
`alert_tracks`, `custom_deadlines`, `push_subscriptions` and `alert_deliveries` straight from
the browser client, and every one of those tables is `user_id = auth.uid()`-scoped with no
admin policy. Those figures therefore describe the admin's own account, not the cohort.
Pre-existing; fix it by moving those reads behind the same service-role route.

### The reminder model

**Rules are stored sparsely; occurrences are computed at dispatch; idempotency lives in the
ledger.** `lib/alerts/schedule.ts` is the single implementation, imported by both the
dispatcher and the card, so the "you'll be reminded on…" preview cannot disagree with what
fires.

Defaults are never materialised. `alert_reminder_rules` holds a row only where a student
deviated. Materialising them would mean reconciling every tracker × round × offset each time
Unstop edits a date, fanning out writes when a round is added, and cascading deletes on
elimination — all of which are free when computed.

`dedupe_key` is `v1:<kind>:<entityId>:<offsetCode>` and **contains no timestamp**, so moving a
round cannot re-fire a reminder already sent. The dispatcher upserts with `ignoreDuplicates`
and pushes only the rows that come back as newly created, so two dispatchers racing send
exactly one notification. A reminder more than six hours past its anchor is written as
`skipped_stale` and sends nothing — that burns the key, so an overnight outage can't cause a
3am burst about deadlines that already passed.

### Two drivers, one guard

Vercel Hobby caps cron at daily, so `vercel.json`'s run is a safety net. The real driver is
`.github/workflows/alerts-dispatch.yml` every 15 minutes. Both present
`Authorization: Bearer $CRON_SECRET`, which Vercel sends automatically once that env var
exists, so one `timingSafeEqual` guard covers both. It **fails closed** when the var is unset.
(`/api/keepalive` stays deliberately open — don't change it.)

⚠️ GitHub disables scheduled workflows after 60 days without repo activity. If reminders stop,
check that first; a rising `skipped_stale` count in the admin Alerts tab is the in-app signal.

### The pass/fail gate defaults to PASSED

After an eliminator round ends, the card asks whether the student cleared it. Ignoring the
question changes nothing — the chain keeps advancing and reminders keep arriving. Only an
explicit "No" writes `cleared = false`, demotes the track to `eliminated`, and stops the
dispatcher. It is undoable.

The asymmetry is the point: assuming a silent student passed costs one irrelevant
notification, while assuming they lost costs them the deadline for a competition they are
still in.

### Round order is not a timeline

Sort rounds by `round_order` for display, but **never** derive "which round am I on" from
position. Round windows overlap — on TGC 2026 three of ten rounds start before their
predecessor ends, and round 2 sits entirely inside round 1. Two rounds being live at once is
normal. `chainProgress()` counts *finished* rounds for exactly this reason.

Related trap: a round with no dates is `unknown`, **never** `done`. A green tick on an
undated round tells a student they've finished something they haven't.

### Course deadlines: neither tier ships

**Alerts is competitions and hand-entered deadlines only.** Nothing course-derived reaches a
student — not the "Due soon" list, not a push notification.

**Tier A** (`lib/alerts/courseDeadlines.ts`) derives first-class / last-class / exam-week dates
purely from `data/courses.ts` + `course_selections`. It shipped, then was withdrawn: those dates
are not things that are *due*, and a countdown against "first class today" taught students to
discount a list whose only job is to be believed — and, worse, to swipe away the notification
channel that also carries real competition deadlines.

The module and its half of `computeOccurrences` are deliberately **kept and still tested**
(`scripts/verify-alerts.mts`). Two call sites feed them nothing:
`components/planner/AlertsView.tsx` no longer imports the module at all, and
`app/api/alerts/dispatch/route.ts` passes `courseItems: []`. Restoring the feature is one line
in each; do not delete the module to "clean up", and do not re-wire it without deciding what
makes a course date worth a phone buzz.

**Tier B** — real assignment dates from `course_outlines.content` — never ran at runtime.
`course_outlines.content` is free-form prose and a hallucinated due date would go to a hundred
phones, which is strictly worse than no feature. It follows the insight-engine pattern:
`scripts/extract-course-deadlines.mts` proposes candidates offline, the **script** (not the
model) discards any whose verbatim quote isn't in the outline or whose date falls outside the
course window ±14 days, `data/courseDeadlineCandidates.json` is reviewed in a diff by a human,
and only then does a migration seed `course_deadlines`. **Zero runtime model calls, ever.**

The quote guard is necessary but not sufficient: for table-formatted outlines a valid quote can
prove the assignment exists without proving its date. That is why review is a human step and
why migration 020 is not written automatically.

### Env vars

`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (web push);
`CRON_SECRET` (guards `/api/alerts/dispatch`); `ALERTS_IMPORT_SECRET` (guards
`/api/alerts/import`). All five must exist in Vercel Production **and** Preview.

iOS note: Safari grants push only to a PWA added to the home screen. `usePushSubscription`
detects this and shows install instructions rather than a button that would silently fail.
Nothing ever auto-prompts for permission — a denied permission cannot be re-requested from JS.

---

## Supabase

Project ref **`rtchhbkrzdmfryxxuyih`**. The CLI is authenticated and linked — apply SQL with:

```bash
supabase db query --linked -f supabase/migrations/016_term5_outlines.sql
supabase db query --linked "select ..." -o table     # read-only queries
```

(There is no dashboard copy-paste step. Ignore any doc that says otherwise.)

### Tables

| Table | Notes |
|---|---|
| `profiles` | One per auth user; `specializations`, `friend_code`, `avatar_url` |
| `cohort_whitelist` | Invited emails; readable by anon for the pre-login check |
| `course_selections` | `(user_id, course_id)` — **term-agnostic**, term resolved via `data/courses.ts` |
| `course_sections` | Registrar A/B section assignments; written only by a service-role script |
| `course_outlines` | Keyed by `code`, with a `term` column. Read by the chatbot |
| `friendships` | Directed edges; inserts go through `add_friend_by_code` |
| `user_sessions`, `user_events` | Analytics (see below) |
| `landing_sessions` | Pre-login funnel; anon-writable by design |
| `chatbot_messages` | Chat transcripts |
| `admin_users`, `admin_ai_queries` | Admin gate + Ask-AI audit log |
| `competitions` | Unstop/manual competitions; `global` (cohort) or `private` (one student) |
| `competition_rounds` | Round chain; `round_key` is Unstop's id and is **never** renumbered |
| `alert_tracks` | `(user_id, competition_id)` — who follows what, and whether it's muted |
| `alert_reminder_rules` | **Sparse overrides only** — defaults are never materialised |
| `alert_round_outcomes` | Self-declared pass/fail. Absence means *passed* |
| `custom_deadlines` | Manual deadlines. Always private |
| `push_subscriptions` | One row per browser; `endpoint` is unique |
| `alert_deliveries` | The idempotency ledger. `UNIQUE (user_id, dedupe_key)` |
| `course_deadlines` | Extracted assignment dates. Seeded by migration only; ships empty |
| `competition_requests` | "This link isn't on Unstop, please add it." Admin-read via service role |

**No table stores a term.** That is deliberate and it works, because `course_id` is globally
unique across terms. `course_outlines.term` exists for analytics only — its primary key is
still `code`, which is safe *only while no course code is reused across terms*. Check that
before adding a term.

Still true after Alerts. `course_deadlines.term` is analytics-only exactly like
`course_outlines.term` — the real term resolves through `course_code` → `data/courses.ts`. The
alerts tables have no term at all: competitions aren't course-scoped, and Tier A course dates
resolved their term through the catalogue like everything else (that path is dormant — see
"Course deadlines: neither tier ships").

### Storage

Buckets `course-outlines` and `seating-charts` are **private** (migration 014). Files are
served through `app/api/files/route.ts`, which authenticates the user, checks a bucket
allowlist, guards against traversal, and mints a 10-minute signed URL. `lib/storageLinks.ts`
rewrites the legacy public URLs still stored in `data/courses.ts` into that route.

Keys are flat `<lowercase-code>.<ext>` with no term prefix — safe only because codes don't
collide across terms. `avatars` is public.

### Safety boundary

`admin_run_readonly_sql` is the real guard behind the admin Ask-AI feature: admin email gate,
single statement, SELECT/WITH only, schema fence, `transaction_read_only`, 8s timeout,
LIMIT 5000. Never route model-generated SQL around it.

---

## Analytics

`hooks/useAnalytics.ts` writes to `user_sessions` (one row per session, with a device
fingerprint) and `user_events` (`event_type` + JSON `payload`). Course events carry
`course_id`, so **term is resolved through the catalogue, not stored** — which is why Term 5
tracking worked the moment the Term 5 rows existed.

Adding an event: extend the `EventType` union in `hooks/useAnalytics.ts`, then give it a label
in `describeEvent` in `components/admin/AdminDashboard.tsx` or it renders as a raw string.
The Alerts feature added ~30 `alert_*` types via that same path.

### PostgREST row cap — read this before adding a dashboard query

**PostgREST returns at most 1000 rows per request, silently.** `user_events` has ~16k rows.
Every admin fetch therefore goes through `fetchAllRows()`, which pages with `.range()` until
exhausted. A plain `.select()` will quietly give you an arbitrary 1000-row slice and every
number derived from it will be wrong — this is exactly how the dashboard behaved before the
Metrics work, and the queries had no `ORDER BY`, so *which* 1000 was undefined.

### Admin dashboard

Tabs: Cohort Overview · Member Detail · Activity · Insights (Overview / **Metrics**) · In-Depth ·
AI Chatbot · Ask AI · **Alerts**.

A **dashboard-wide term filter** in the tab bar narrows every course-scoped figure (selections,
popularity, member course lists, distributions). Session, login and funnel figures are term-less
and deliberately ignore it — filtering them would break the funnel. The **Alerts** tab opts out
for the same reason: competitions have no `course_id` and therefore no term, so filtering would
return nothing rather than a smaller answer.

The **Metrics** sub-tab (`components/admin/MetricsPanel.tsx`) computes reach, engagement
distributions (mean / median / Q1 / Q3 / IQR / p90), retention cohorts, Pareto concentration,
the acquisition funnel, time-to-value, feature attach rates and quality signals — all from data
already in memory, no new tables.

---

## Admin access

Admins are hardcoded in `ADMIN_EMAILS` (a `Set<string>`) in **`lib/admin.ts`**, which also
exports `isAdminEmail()` / `isSuperAdminEmail()`. All emails must be lowercase.

This list used to be copy-pasted into four files while this section said "all three" — so
adding an admin had a real chance of leaving one surface still refusing them, invisibly (a
missed admin just sees the ordinary student UI). Import from `lib/admin.ts`; never re-declare
the set.

Current admins:
- `tarun.shekhawat2027@bitsom.edu.in` (super-admin — sees the Ask-AI audit log)
- `varad.dharap2027@bitsom.edu.in`
- `yash.kolhe2027@bitsom.edu.in`
- `apoorv.sharma2027@bitsom.edu.in`

Rules:
- Only these emails should ever see admin-related UI (button, page, links).
- Non-admin users must see the planner exactly as before — no trace of admin features.
- Always go through `isAdminEmail()` — it lowercases and is null-safe. Don't call `.has()` directly.
- When adding a new admin, update `ADMIN_EMAILS` in `lib/admin.ts` and this list. That's it.

---

## Verification scripts

| Command | What it checks |
|---|---|
| `npx tsc --noEmit` | Types |
| `npm run build` | Full production build |
| `npx tsx scripts/verify-timings.mts` | Every course's generated class dates vs the timetable |
| `npx tsx scripts/verify-conflicts.mts` | Overlapping pairs resolve as advisories; no stray `conflictGroup` |
| `npx tsx scripts/verify-insights.mts` | Insight engines fire correctly; no dangling course codes |
| `npx tsx scripts/verify-metrics.mts` | Distribution maths, and that paged fetches return all rows |
| `npx tsx scripts/verify-alerts.mts` | Reminder scheduling, round state, dedupe keys, IST, and the Unstop mapper against a committed live fixture |
| `npx tsx scripts/build-outline-headers.mts` | Regenerates authoritative outline headers |

Run `verify-timings` after any catalogue edit — transcribing a timetable by hand is the step
most likely to introduce a silent error, and it's the only check that would catch it.
