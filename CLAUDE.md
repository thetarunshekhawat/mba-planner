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
lib/chat/*             AI assistant: routing, prompt, nudges, insight selection
components/planner/*   The main planner UI (Plan / My Schedule / Friends)
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

**No table stores a term.** That is deliberate and it works, because `course_id` is globally
unique across terms. `course_outlines.term` exists for analytics only — its primary key is
still `code`, which is safe *only while no course code is reused across terms*. Check that
before adding a term.

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

### PostgREST row cap — read this before adding a dashboard query

**PostgREST returns at most 1000 rows per request, silently.** `user_events` has ~16k rows.
Every admin fetch therefore goes through `fetchAllRows()`, which pages with `.range()` until
exhausted. A plain `.select()` will quietly give you an arbitrary 1000-row slice and every
number derived from it will be wrong — this is exactly how the dashboard behaved before the
Metrics work, and the queries had no `ORDER BY`, so *which* 1000 was undefined.

### Admin dashboard

Tabs: Cohort Overview · Member Detail · Activity · Insights (Overview / **Metrics**) · In-Depth ·
AI Chatbot · Ask AI.

A **dashboard-wide term filter** in the tab bar narrows every course-scoped figure (selections,
popularity, member course lists, distributions). Session, login and funnel figures are term-less
and deliberately ignore it — filtering them would break the funnel.

The **Metrics** sub-tab (`components/admin/MetricsPanel.tsx`) computes reach, engagement
distributions (mean / median / Q1 / Q3 / IQR / p90), retention cohorts, Pareto concentration,
the acquisition funnel, time-to-value, feature attach rates and quality signals — all from data
already in memory, no new tables.

---

## Admin access

Admins are hardcoded in `ADMIN_EMAILS` (a `Set<string>`) at the top of `app/admin/page.tsx`,
`app/planner/page.tsx`, and `app/kyoto/page.tsx`. All emails must be lowercase.

Current admins:
- `tarun.shekhawat2027@bitsom.edu.in` (super-admin — sees the Ask-AI audit log)
- `varad.dharap2027@bitsom.edu.in`
- `yash.kolhe2027@bitsom.edu.in`
- `apoorv.sharma2027@bitsom.edu.in`

Rules:
- Only these emails should ever see admin-related UI (button, page, links).
- Non-admin users must see the planner exactly as before — no trace of admin features.
- The check always uses `.toLowerCase()` on the email before calling `.has()`.
- When adding a new admin, update `ADMIN_EMAILS` in **all three** files and this list.

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
| `npx tsx scripts/build-outline-headers.mts` | Regenerates authoritative outline headers |

Run `verify-timings` after any catalogue edit — transcribing a timetable by hand is the step
most likely to introduce a silent error, and it's the only check that would catch it.
