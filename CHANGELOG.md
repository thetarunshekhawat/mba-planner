# Changelog

All notable changes to the MBA Planner project will be documented in this file.

## [Unreleased]

### Added - `manual-competition` skill, and a fix to the route it needs

Competitions with no Unstop page had no path to the cohort. `unstop-import` needs a numeric id
and a public API; a company microsite has neither.

- **`.claude/skills/manual-competition/SKILL.md`** — the companion skill. Read the page with
  `/browse`, map phases to rounds by hand, POST to the same admin import route. Its rules exist
  because nothing upstream will correct a mistake here: never invent a date or a time (send
  `null`, which renders as "Dates to be announced"); a round is a thing with a deadline a
  student must act on, so "shortlist announced" goes in the previous round's description rather
  than becoming a round that fires four notifications; `isEliminator` only where the page says
  people are cut, because that flag drives the pass/fail gate. It also requires reporting
  whether registration has already closed.

- **Fixed `/api/alerts/import` filing every manual import as `unstop`.** The route resolved
  `source` from the body and then hardcoded `source: 'unstop'` into the payload it imported,
  while the response echoed the resolved value — so the row said one thing and the caller was
  told another. `importCompetition` matches existing rows on `(source, source_id)`, so this
  would also have split re-imports of the same competition into duplicate rows.
  `MappedCompetition.source` widens from the `'unstop'` literal to `'unstop' | 'manual'`, which
  is what the route and the schema `CHECK` already allowed.

- **First manual import**: V-Guard Big Idea 2026, published cohort-wide — 4 rounds, 2
  eliminators, `sourceId` `vguard-big-idea-2026`.

### Fixed - Alerts dispatch: the 15-minute schedule was fiction

The `Alerts dispatch` workflow failed twice on 6 Aug with `The job was not acquired by Runner
of type hosted`. That part is a GitHub capacity incident — the job never started, `runner_name`
came back empty, and `timeout-minutes` didn't bound it because it only counts from acquisition.
Nothing in the repo caused it and nothing needed re-running: the next tick redoes whatever was
due, because `lib/alerts/schedule.ts` fires on what *is* due, not on what a run was meant to
cover.

Investigating it surfaced the real problem. The workflow asks for `*/15` and does not get it:
over an 8-hour window, **33 ticks were requested and 5 delivered**, with gaps of 104–154
minutes. GitHub's scheduler is best-effort and drops most high-frequency ticks on free/public
repos.

- Cron minutes moved off `:00/:15/:30/:45` to `3,18,33,48` — those are the most contended slots
  and the first to be dropped. A marginal improvement, not a fix.
- The workflow header and CLAUDE.md now state the measured cadence instead of the requested
  one, and say what it costs: `T-7d`/`T-2d`/`T-1d` are unaffected, `T-3h` can land at T-1h, and
  `T-0` can land up to two hours *after* the deadline — inside `STALE_GRACE_MS` so it still
  sends, but announcing something already missed.
- No delivery was actually affected: `alert_deliveries` is empty, because nothing is tracked
  yet.

The documented fix for sub-hour accuracy is a second driver hitting the same guarded endpoint,
which needs no code — `UNIQUE (user_id, dedupe_key)` already guarantees any number of racing
dispatchers send exactly one notification between them.

### Added - "That isn't an Unstop link. Ask an admin to add it?"

Pasting a Dare2Compete link, a company page or a Google Form used to end at an error message.
The student's actual intent — "I want to track this" — was thrown away, and the only people who
could act on it (admins, who can import by hand) never learned the ask existed.

- **The offer** — `/api/alerts/unstop` marks its two *recoverable* refusals with
  `canRequest: true`: the link isn't an Unstop competition, or Unstop refused to serve it. A
  blank box is a typo, not an ask, and carries no flag. `AddCompetitionDialog` turns the flag
  into a yes/no with an optional note ("closes Friday, team of 4"). Editing the link clears the
  offer, because the refusal it was based on no longer applies.

- **Schema** — migration `020_competition_requests.sql`. A request is deliberately **not** a
  `competitions` row with a pending flag: nothing on it is verified, and putting it there would
  oblige every reader (dispatcher, cards, `chainProgress`) to learn to skip it, where one missed
  filter puts a fictional deadline on a hundred phones. `UNIQUE (user_id, url)` so re-asking
  updates rather than stacking, while two students asking for the same link stay two rows —
  "four people want this" is the number that decides whether importing is worth it.

- **The admin queue** — a "Non-Unstop requests" section at the top of the admin Alerts tab,
  grouped by url, showing who asked, their email, when, their note, and whether Unstop refused
  it. Added / Decline / reopen per asker. "Added" only answers the request; the import itself is
  still the `unstop-import` skill or a migration, and the panel says so.

- **Admins read it through the service role, not their session.** The table's RLS SELECT policy
  is `user_id = auth.uid()` with no admin policy, so a direct client read would have returned
  only the admin's own asks — the feature failing silently rather than loudly.
  `/api/alerts/requests` uses the service-role client behind an `isAdminEmail()` gate, the same
  shape as the admin branch of `/api/alerts/unstop`, so the admin list stays in `lib/admin.ts`
  alone.

- **Verified end to end**: with the client-side demo guard deliberately bypassed, the
  RESTRICTIVE RLS policy still refused the demo account's insert — the database guarantee, not
  just the UI. Offer → note → send → admin queue → mark Added → `status`/`resolved_at`/
  `resolved_by` persisted, confirmed by SQL.

- **Known, pre-existing, not fixed here**: the rest of the admin Alerts panel reads
  `alert_tracks`, `custom_deadlines`, `push_subscriptions` and `alert_deliveries` straight from
  the browser client. Those tables are all `user_id = auth.uid()`-scoped with no admin policy,
  so those figures describe the admin's own account rather than the cohort. Documented in
  CLAUDE.md; the fix is to move them behind the same service-role route.

- **Analytics** — `alert_competition_requested`, `alert_competition_request_failed`.

### Changed - Alerts: reachable on a phone, readable with five competitions open

- **The Alerts tab was unreachable on a phone.** Four tab buttons ran ~400px wide inside a
  header sitting in an `overflow-hidden` column, so "Alerts" was pushed past the right edge
  with no scrollbar to reveal it — the tab existed and could not be opened. Labels now collapse
  to icons below `sm` for every tab except the active one, with tighter gutters and per-tab
  padding. Verified at 320px and 360px with an admin button present: zero header overflow on
  every active tab.

- **Competition cards collapse by default.** A closed card is the title, the current stage, the
  round count, the registration countdown, and a segmented bar (`components/planner/StageBar.tsx`)
  that fills green as rounds finish — one card is now ~110px instead of ~700px, so five tracked
  competitions fit on a screen. Clicking anywhere on the header expands the full round chain.
  A pending pass/fail question renders whether or not the card is open; burying it behind a
  click is how it goes unanswered. `currentStage()` in `lib/alerts/progress.ts` picks what to
  name: earliest live round, else next to open, else last finished, never an undated one.

- **Desktop uses the width it was wasting.** The tab was a single 672px column beside a 300px
  filter sidebar. It is now a two-column grid from `xl`: competitions on the left, a rail of
  Due soon / notifications / your deadlines on the right. The rail is only reserved when it has
  content, so a read-only demo session (which renders none of the three) doesn't trade one kind
  of empty space for another.

- **The phone-notifications panel shrinks once it's on.** A five-line card earns its space while
  it's asking for a decision and stops earning it afterwards, so the `granted` state is a single
  row with a Test button.

- **Course dates no longer reach students.** "Due soon" is competition milestones and
  hand-entered deadlines only, and `/api/alerts/dispatch` passes `courseItems: []`. First class /
  last class / exam week are not things that are *due*; counting down to them taught students to
  discount a list whose only job is to be believed, and to swipe away the channel that also
  carries real competition deadlines. `lib/alerts/courseDeadlines.ts` and its half of
  `computeOccurrences` are kept and still covered by `scripts/verify-alerts.mts` — restoring the
  feature is one line at each of the two call sites.

- **Analytics** — new `alert_card_expanded` event, labelled in the admin dashboard.

### Added - Alerts tab (competition & deadline reminders)

A fourth planner tab. Track case competitions from Unstop, watch the round chain advance on
its own as dates pass, set per-round reminders, and get a push notification on your phone
before a deadline — even with the site closed.

- **Schema** — migrations `017` (competitions + rounds), `018` (per-user state), `019`
  (extracted course deadlines, ships empty). Nine tables, RLS on all of them, demo-account
  RESTRICTIVE write blocks on all seven that hold real state.
  - `competitions` is `global` (cohort-wide) or `private` (one student). The RLS INSERT policy
    pins authenticated writes to private/own, so a student with a hand-crafted REST call still
    cannot publish to the cohort. `owner_key` is a generated column carrying a sentinel uuid
    for global rows — without it, `created_by IS NULL` would make the unique index accept the
    same competition twice, because NULLs never conflict in Postgres.
  - `competition_rounds` are matched on Unstop's `round_key` and **updated in place**. Rounds
    that vanish upstream are retired, never deleted: `alert_reminder_rules` and
    `alert_round_outcomes` cascade off `competition_rounds.id`, so recreating a row would
    silently wipe every reminder a student configured.

- **The reminder model** (`lib/alerts/schedule.ts`) — rules stored sparsely, occurrences
  computed at dispatch, idempotency in the ledger. No pending-reminder rows exist, so an Unstop
  date edit is authoritative instantly with no reconciliation pass, a round added in September
  reaches an August tracker for free, and elimination needs no cascading delete.
  - `UNIQUE (user_id, dedupe_key)` on `alert_deliveries` is what makes double-sending
    impossible. Keys carry no timestamp, so a moved round cannot re-fire a sent reminder.
  - A reminder more than six hours past its anchor is recorded as `skipped_stale` and sends
    nothing — burning the key, so an overnight outage can't produce a 3am burst about deadlines
    that already passed.

- **The pass/fail gate** — after an eliminator ends, the card asks whether you cleared it.
  **Default is PASSED**: ignoring the question changes nothing. Only "No" stops alerts, and
  it's undoable. Assuming a silent student passed costs one stray notification; assuming they
  lost costs them a deadline they were still racing.

- **Web push** — VAPID + a deliberately cache-free service worker, a PWA manifest, and
  192/512/maskable icons generated from the existing brand geometry. Never auto-prompts: a
  denied permission cannot be re-requested from JavaScript. iOS is detected explicitly and
  shown Add-to-Home-Screen instructions, because Safari grants push only to installed PWAs.

- **Dispatcher** (`/api/alerts/dispatch`) — one handler, two drivers. Vercel Hobby caps cron at
  daily so that run is a safety net; GitHub Actions every 15 minutes is the real driver. Both
  present `Bearer $CRON_SECRET`, compared with `timingSafeEqual` and **failing closed** when
  the var is unset. Every read pages through `fetchAllRows`.

- **`unstop-import` skill** (`.claude/skills/unstop-import/`) — the only sanctioned path to a
  cohort-wide competition. Takes an Unstop URL, maps it, POSTs to `/api/alerts/import`.

- **Course dates** — Tier A derives first/last class and exam-week dates from `data/courses.ts`
  alone, gated on `isCourseCompleted()`. Tier B (assignment dates from outline prose) never
  runs at runtime: `scripts/extract-course-deadlines.mts` proposes offline, the script discards
  anything whose verbatim quote isn't in the outline or whose date falls outside the course
  window, and a human reviews the diff before any migration seeds it. On the first run those
  guards rejected 36 of 55 proposals, 8 of them for quotes the model had invented.

- **Admin Alerts tab** — reach, per-competition and per-member tables, push health (including
  the count of students tracking competitions with no working subscription), and the delivery
  log. Deliberately ignores the dashboard term filter, since competitions aren't course-scoped.

### Added - Alerts (Phase 0: foundations)

- **`lib/alerts/unstop.ts`** — types and `mapUnstopCompetition()` for Unstop's public,
  unauthenticated API (`GET /api/public/competition/{numericId}`). Written against a live
  capture of TGC 2026 committed at `scripts/fixtures/unstop-tgc-2026.json`, because several
  fields are not guessable from the payload's shape: a round carries **no `title`** (it lives
  in `details[0]`, an array that can be empty), elimination is `round.eliminator_round` as an
  int 0/1, `entity_type` is a PHP class name needing its namespace stripped, round and
  competition `public_url`s are relative (`seo_url` is the absolute one), `skills` is an array
  of objects, and `overall_prizes` is null even when `prizes[]` is populated.
  - Verified on real data: round *windows overlap* — three of TGC's ten rounds start before
    their predecessor ends, and round 2 sits entirely inside round 1. Consecutive
    `round_order` therefore does not mean consecutive time, and two rounds can be live at
    once. Submission-type rounds also carry no URL at all.

- **`lib/alerts/schedule.ts`** — the reminder model. Rules are stored sparsely, occurrences
  are computed at dispatch, and idempotency lives in the delivery ledger. Reminder rows are
  deliberately not materialised: Unstop edits round dates after publishing, so materialised
  rows would need a reconciliation pass over every tracker × round × offset, while computed
  ones make a new date authoritative instantly. Dedupe keys (`v1:<kind>:<entity>:<offset>`)
  contain no timestamp, so a re-import cannot re-fire a reminder already sent.

- **`lib/alerts/progress.ts`** — `roundState()`, `chainProgress()`, elimination-gate
  detection. A round with no dates is `unknown`, never `done`; progress counts finished
  rounds rather than the current index, since position-based progress would over-report given
  overlapping windows.

- **`lib/alerts/time.ts`** — `istToInstant()` for absolute reminders, plus IST display
  helpers that reuse `campusToday()` rather than making a fresh `Intl` call.

- **`scripts/verify-alerts.mts`** — 79 pure-logic checks: round-state boundaries, overlapping
  chains, dedupe-key stability across a date change, late-dispatcher and staleness
  classification, muted/eliminated tracks producing zero occurrences, sparse-override
  resolution matching between the dispatcher and the card preview, IST conversion, and the
  mapper against the live fixture plus mutated `details: []` / missing-`details` variants.

### Changed

- **`ADMIN_EMAILS` extracted to `lib/admin.ts`** with `isAdminEmail()` / `isSuperAdminEmail()`.
  The set had been copy-pasted into **four** files (`app/planner/page.tsx`, `app/admin/page.tsx`,
  `app/kyoto/page.tsx`, `app/api/admin/query/route.ts`) while `CLAUDE.md` said to update "all
  three" — so adding an admin could leave a surface still refusing them, invisibly, since a
  missed admin just sees the ordinary student UI. One source of truth now; docs corrected.

- **`fetchAllRows()` moved to `lib/alerts/paging.ts`** from `AdminDashboard.tsx` and shared
  with the alerts dispatcher, which hits the same silent 1000-row PostgREST cap.

### Added - Term 5

- **Full Term 5 catalogue** (`data/courses.ts`) — 21 rows across Blocks 22–26 with course
  codes, real two-week block dates, per-section timings and rooms, seat counts,
  specialization mappings and outline links. Sourced from the Term 5 structure sheet,
  tentative timetable, bidding guidelines and 12 course outlines.
  - New courses: Forward Deployed Expert (FDE) Management I (id 48), AI Incubation Project
    (id 49), Design Thinking WaW (id 110).
  - Retired id 22 ("First Principles of Consulting"), which is no longer offered. The id was
    **not** repointed at FDE Management — 10 existing student selections reference it, and
    repointing would have silently changed what those students had chosen.
  - `mandatoryFor` corrected from the structure sheet: Advanced Marketing Strategy is now the
    Marketing mandatory (it took that flag from International Marketing); Operations Strategy
    is mandatory for OPS and CIVB for ENT.
  - Removed the placeholder `conflictGroup` values (`T5W17`, `T5W22`, `T5W24`). With real
    timings the section-advisory logic resolves those pairs correctly instead of showing a
    false "cannot be taken together" banner.
  - Professor changes flagged in-review: Technology in Operations (now Deepanshi Bhardwaj) and
    Mergers & Acquisitions (now Mark Finn) are taught by different faculty than the cohort
    reviews describe.

- **Term 5 schedule grid** (`components/planner/TimetableView.tsx`) — the block-by-block
  timetable, section advisories, friend overlays, "Show all blocks", "Today" and search
  ringing now work for Term 5 exactly as for Term 4. `TERM4_BLOCKS` was generalized into
  `SCHEDULE_BY_TERM`, with non-teaching notices (exam break, placements week, term break)
  as data rather than hardcoded JSX. Mirrored in the Kyoto skin.

- **Term 5 outlines in Supabase** — 12 outlines uploaded to the private `course-outlines`
  bucket and seeded into `course_outlines` (migration `016`), which gains a `term` column.
  Each body is prefixed with an authoritative Term 5 header generated by
  `scripts/build-outline-headers.mts`, because the circulated outlines are the previous
  cohort's documents and carry stale term/block/date headers the chatbot would otherwise quote.

- **Term 5 insight engine** (`Term5 Insight Engine/`) — 267 source-anchored insights (141
  single-course, 84 pairwise covering all 78 elective combinations, 18 portfolio rules, 24
  forward-looking/FOMO), each scored on the same 7-dimension rubric as Term 4 and written in
  three voices. `lib/chat/insightEngine.ts` now holds one engine per term and computes
  portfolio variables per term rather than pooling terms.

- **Admin term filter** — a dashboard-wide Term filter narrows every course-scoped figure.
  Session, login and funnel figures are term-less and deliberately unaffected.

- **Admin Metrics view** (`components/admin/MetricsPanel.tsx`) — activation, DAU/WAU/MAU and
  stickiness, distribution summaries (mean/median/Q1/Q3/IQR/p90) for selections, session
  length, sessions and events per user, weekly retention cohorts, Pareto concentration, the
  acquisition funnel with time-to-value, feature attach rates and quality signals.

### Fixed

- **ICS export produced an unparseable file.** `lib/calendar.ts` joined the calendar with the
  escaped literal `"\r\n"` instead of a real CRLF, collapsing the whole `.ics` onto one line.
  No calendar client could read it. Affected Term 4 exports too.
- **ICS export dropped sessions for courses starting mid-week.** The week-1/week-2 boundary was
  measured from the course's own start date rather than the Monday of its first week, so a
  Thursday-starting course (ESG) lost the first three days of its second week.
- **The admin dashboard was reading an arbitrary 1000 rows.** PostgREST caps every response at
  1000 rows silently; `user_events` has ~16k. The queries also had no `ORDER BY`, so *which*
  1000 was undefined, and every derived number rested on that slice. All admin fetches now page
  through `fetchAllRows()`.
- **Login screen crashed on every ring rotation.** `FactTicker` called `text.slice()` on
  `undefined` whenever the professor carousel landed on Somak Ghoshal, who has 4 facts where
  everyone else has 10 — the fact index still belonged to the previous professor for 560ms.
  Each crash was recorded as a tracked `js_error`, inflating the error rate. Pre-existing.
- Exam and free-week rows in the Plan tab rendered hardcoded "Exam Week" / "Free Week" labels
  instead of their own names, which erased Term 5's distinction between Exam Break and Exam
  Week, and between Placements Week and Term Break.
- Removed a spurious "Free Week — Sep 7–11" banner in the Kyoto skin that sat inside a teaching
  block; block notices are now data-driven.
- Upload scripts no longer create Storage buckets with `public: true`, which contradicted
  migration 014 and would have re-exposed course files if a bucket were ever recreated.

### Changed

- The login-screen professor ring now shows only the current term's faculty, derived from
  today's date. Adding Term 5's faculty to a single combined ring would have overcrowded it.
- `README.md` rewritten — it documented tables that never existed (`friends_list`,
  `friend_selections`) and a dashboard-based migration workflow that was never used.
- `CLAUDE.md` expanded into a full orientation document with a standing rule that it must be
  updated alongside any change to the catalogue, term structure, schema, analytics or insight
  engine.

### Added - Friends & Collaboration Feature
- **FriendsView Component** (`components/planner/FriendsView.tsx`)
  - Displays list of friends in the cohort with their course selections
  - Allows quick filtering and selection of friends to compare schedules
  - Responsive layout optimized for mobile and desktop views
  - Real-time updates with Supabase integration

- **FriendDetailModal Component** (`components/planner/FriendDetailModal.tsx`)
  - Modal view for detailed friend schedule and course comparison
  - Shows friend's selected courses, timing, and conflicts
  - Highlights common courses and scheduling overlaps
  - Easy-to-understand visual representation of friend's academic plan

- **useFriends Hook** (`hooks/useFriends.ts`)
  - Manages friend list fetching and caching
  - Real-time friend data synchronization with Supabase
  - Handles friend selection state
  - Error handling and loading states

- **useFriendSelections Hook** (`hooks/useFriendSelections.ts`)
  - Manages friend course selections and preferences
  - Tracks which courses are selected by which friends
  - Comparison logic for schedule overlaps
  - Efficient data structure for friend-course relationships

- **Friends Database Migration** (`supabase/migrations/007_friends.sql`)
  - New `friends_list` table for friend relationships
  - New `friend_selections` table for tracking friend courses
  - Proper foreign key constraints and indexes
  - Row-level security policies for data privacy

### Enhanced - Timetable Improvements
- **TimetableView Component** (`components/planner/TimetableView.tsx`)
  - Complete redesign with improved layout and visual hierarchy
  - Better responsive design for mobile devices
  - Enhanced course block visualization with improved spacing
  - Friend schedule comparison overlay option
  - Timeline visualization improvements for multi-term view
  - Better handling of course conflicts and overlaps
  - Improved accessibility with better keyboard navigation
  - ~344 lines of enhancements and refactoring

### Enhanced - Admin Features
- **AdminDashboard Component** (`components/admin/AdminDashboard.tsx`)
  - Advanced user journey analytics tracking
  - Session timeline audit dashboard
  - Funnel analysis with drill-down capabilities
  - Physics drawer for detailed metrics
  - Term-based filtering and segmentation
  - ~172 lines of new admin analytics features

### Enhanced - Type Definitions
- **types/index.ts**
  - Added Friend interface for friend relationships
  - Added FriendSelection interface for course tracking
  - Added updated CourseSelection with friend comparison fields
  - Enhanced UserProfile with friend-related metadata
  - ~41 lines of new type definitions

### Enhanced - Analytics
- **useAnalytics Hook** (`hooks/useAnalytics.ts`)
  - Extended tracking for friend interactions
  - Better session timeline tracking
  - Improved event categorization
  - Enhanced funnel analysis

- **useLandingAnalytics Hook** (`hooks/useLandingAnalytics.ts`)
  - Updated tracking for new user flows
  - Better performance metrics

### Enhanced - Planner Page
- **app/planner/page.tsx**
  - Integrated friends feature into main planner UI
  - Added friend comparison toggle
  - Better tab navigation between plan and friends view
  - Enhanced state management for friend selections
  - ~98 lines of new features

### Removed
- **app/sandbox/page.tsx** (Deprecated)
  - Removed experimental sandbox page
  - Cleaned up ~745 lines of unused code
  - Simplified app routing structure

## [Previous Releases]

### v1.3.0 - Term 1 Timeline & Mobile Improvements
- Stack Term 1 timeline below content on mobile
- Vibrant progress bar fill colors
- Exceeded state indicator for completed terms
- Sync Term 4 schedule with timetable
- Show ABMA (Account Based Marketing) for all users

### v1.2.0 - Advanced Admin Features
- Full admin journey tracking with session timelines
- Physics drawer for analytics deep-dives
- Admin term filtering
- Mobile bottom drawer with analytics tracking

### v1.1.0 - Core Planner Features
- Interactive course selection
- Visual timetable with conflict detection
- Monthly calendar integration
- Supabase authentication and data persistence
- Real-time course saving

## Migration Guide

### For Users
No action required for end users. New features will be available automatically upon deployment.

### For Developers
To apply the latest database migrations:

1. Access your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and execute the migration from `supabase/migrations/007_friends.sql`
4. Verify the new tables are created:
   - `friends_list` - Friend relationships
   - `friend_selections` - Friend course selections

### Breaking Changes
None in this release.

## Future Roadmap

- [ ] Group planning with multiple friends
- [ ] Course recommendation engine based on friend schedules
- [ ] Shared notes and comments on courses
- [ ] Calendar export functionality
- [ ] Mobile app (React Native)
- [ ] Course prerequisites checker
- [ ] Academic performance tracking
- [ ] Integration with course syllabus PDFs

## Known Issues

None currently reported.

## Contributors

- Tarun Shekhawat (Maintainer)
- Varad Dharap (Admin)
- Yash Kolhe (Admin)
- Apoorv Sharma (Admin)

## Support

For issues, feature requests, or contributions, please reach out to the admin team.
