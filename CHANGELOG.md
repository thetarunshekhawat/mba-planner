# Changelog

All notable changes to the MBA Planner project will be documented in this file.

## [Unreleased]

### Added - Mandatory onboarding tour, and the analytics to tell whether it works

The portal had grown to four tabs, a sidebar, global search, friend overlays, competition
alerts with push, and an AI assistant, with **zero onboarding**. Students found features by
accident; most never found Friends overlays, elimination gates, or the assistant at all. The
only thing doing onboarding's job was one empty-state card on My Schedule.

An 11-step spotlight tour now runs on the live UI the first time a student opens `/planner`.
It drives the app — switches tabs, springs the mobile drawer open, opens a real course modal —
while a dimmed SVG mask cuts out whatever is being explained. It is **mandatory: there is no
Skip button**, replayable from the circular arrow beside your name, and versioned, so shipping
a feature later can trigger a short "what's new" run of only the new steps instead of making
the whole cohort sit through it again.

**Because there is no Skip, it fails open in three layers.** A blocking overlay is the one UI
element that can lock a student out of the portal, and an anchor can go missing for reasons
that have nothing to do with the tour — a restyle, a viewport where the element does not
render, a list that has not laid out yet. So: a step whose anchor has not resolved in 1200ms
is logged and auto-advanced; a run that loses more than half its anchors aborts and marks the
version seen rather than repeating a broken tour forever; and `?tour=off` gets support past it
without marking it complete.

Anchors are `data-tour` attributes, never CSS selectors — a class-based selector would break
on the next restyle silently, and every student would eat a 1.2s pause per step.

**The tour deliberately does not touch the existing analytics.** Its steps call the raw state
setters, never the tracked handlers. Routing them through `trackEvent` would have injected a
fake engagement funnel into the admin dashboard from every student's first session on the day
this shipped, shifting the Activity, Insights and In-Depth numbers with nothing to explain it.
Chat nudges are suppressed while it runs for the same reason, plus the obvious one: a nudge
bubble would pop over the overlay 2.5 seconds in.

### Fixed - Three defects caught in first-run QA

**The spotlight covered the whole screen on three steps.** Schedule, Friends and Alerts anchored
their tab's root container — which is the entire scroll area, so the cutout was the viewport,
nothing was dimmed, and the "spotlight" pointed at nothing. They now anchor one block-week grid,
the friend-code card, and the first competition card, with the matching empty state as the
fallback so a student with no data still gets a real spotlight instead of a full-screen wash.

**The analytics were off by one for every step after the profile step.** `TOUR_STEPS` has 12
entries because the profile step ships a desktop and a mobile variant, but any run sees exactly
one of them, so `furthest_step_index` indexes an 11-long list. The dashboard read those indices
against the 12-entry array: a phantom 12th funnel bar nobody could reach, the real last step
showing a 100% drop-off, and every completed student's "furthest step" reading as the
second-to-last one. Aggregation now happens on `TOUR_SLOTS`, where a slot index *is* a run index
and the two profile variants collapse into one row.

**No step-level telemetry was being written at all.** PostgREST query builders are lazy
thenables — they issue no request until something calls `.then()` — so
`void supabase.from('tour_step_events').insert(...)` type-checked, linted clean, and sent
nothing. `tour_runs` was fine because it awaits, which is what made this invisible: runs
appeared, and the entire per-step half of the dashboard was quietly empty. Both fire-and-forget
writes now go through a helper that calls `.then()` and logs failures.

### Added - Admin → In-Depth → Onboarding Tour

Ten sections: completion funnel (first runs only — replays would flatter every drop-off
number), per-step dwell with automatic *copy ignored* / *too long* / *prior step unclear*
flags, time-to-complete, device split, version cohorts, feature-adoption lift, anchor health,
the full roster with a "not completed" filter, and replays.

Two calls worth knowing about. `active_ms` counts only dwell while the tab was visible and is
the number to read; `total_ms` is wall clock and folds in the student answering a phone call.
And the adoption-lift panel is labelled in the UI as observational rather than a randomized
test — the comparison group is largely people who have not logged in, so it is direction, not
proof.

Schema: `profiles.tour_seen_version` (an int, not a bool, so versions can advance), plus
`tour_runs` and `tour_step_events` (migration 022). Step-level rows are kept out of
`user_events` because at 11 per user they would outnumber every other event and drown the
Activity feed. **Reads on both new tables are admin-only** — stricter than the house
precedent, since per-student timing and drop-off data has no reason to be cohort-readable.

The demo account writes nothing anywhere: its gate falls back to `localStorage`, and its runs,
step events and milestone events are all skipped. `user_events` has no demo-restrictive
policy, so without that skip a faculty reviewer clicking through the tour would have landed in
the cohort's adoption numbers.

### Fixed - Friend overlays now cover the courses the whole cohort sits

Turning a friend on in My Schedule drew nothing in Block 20, which read as the overlay being
broken by the A/B section split. It wasn't the section filter. Mandatory and WaW courses are
never rows in anyone's `course_selections` — the cohort sits them all, so your own schedule
adds them unconditionally (`scheduleVisibleIds` in `app/planner/page.tsx`). The friend overlay
was built from `course_selections` alone, so those courses were invisible for friends, and a
block made entirely of them (Block 20 is ABMA + PWMC) overlaid nothing at all.

`friendOverlays` now applies the same rule your own schedule does: their selections plus every
mandatory course, plus WaW when the WaW filter is on. The section-aware overlay then places
them in *their* half of the day — a friend in ABMA Section A appears in the 09:00–12:00 row
even though you sit the 13:30–16:30 one — which is what the toggle is for. The Friends tab's
comparison counts still read raw `course_selections` and are unchanged.


### Fixed - Blocks 20 and 21 rebuilt from the revised timetables

The tentative Term 4 timetable was still driving My Schedule for the last two blocks, and the
registrar has since published both. Three things were wrong on the student's own schedule:

- **Persuasive Writing had its sections inverted.** The revised Block 20 sheet puts Section B
  in the 09:00–10:30 slot and Section A in 13:30–15:00 — the tentative one had it the other
  way. Anyone with a recorded section was being shown the wrong half of the day, every
  teaching day of the block.
- **Mon Sep 14 is Ganesh Chaturthi**, not a teaching day. Product Management and Managing High
  Performance Teams both carried a class on it. Their week-1 patterns now start on Tue Sep 15.
- **Two courses were renamed** by the published sheets: `PSWT` → `PWMC` (Persuasive Writing
  for Managers) and `PDMT` → `PMMC` (Product Management). The code is what the insight engine
  matches on and what the chatbot looks outlines up by, so the rename runs through
  `data/courses.ts`, `data/term4Insights.json`, `data/courseOutlines.json`,
  `data/courseDeadlineCandidates.json` and a `course_outlines` migration (021). The numeric
  `course_id` is untouched, so no saved selection or section assignment moved.

AI in Business already matched the published sheet and is unchanged.

`scripts/verify-timings.mts` now guards all four Block 20/21 courses, so the next hand
transcription of these blocks fails loudly instead of silently. `build_class_sessions.py`
gained a `CODE_ALIASES` map: the tentative and published sheets disagreed on two codes, which
left `classSessions.json` carrying both a stale and a current copy of the same course.

The supersede rule is per code, so a rename is invisible to it — the two histories never meet.
The build now reports **two different codes claiming one room at one date and time**, which is
that fingerprint, and prints it as a `!!` block naming the pair and the block. With the aliases
removed it flags both renames (`PSWT/PWMC`, 16 slots; `PDMT/PMMC`, 20 slots), so the next one
cannot repeat this silently. Section is deliberately not part of that key — Block 20's revision
swapped PWMC's A and B, and keying on it would have let exactly this case through.

The tempting fix — "a published block sheet wins for every course in that block" — is wrong and
was tried first: a block's published grid does not list every course that runs in it, so it
deletes real classes (FSAT lost its whole block 18, 10 sessions down to 4; MHLG disappeared).
The guard reports and never guesses. It currently also flags a pre-existing overlap in Block 19,
where `MHLG` holds S02 13:30–16:30 every weekday while `FSAT` and `FSAN` claim the same room and
time on five days between Aug 12 and Aug 20. That is a disagreement in the source sheets, not a
regression, and it predates this change.

### Added - End-block exam dates for Blocks 20 and 21

The revised sheets carry assessment dates the planner had nowhere to put: Persuasive Writing's
mid block (Sat Sep 5) and end block exam (Sat Sep 12), and the Term 4 closers on **Sunday**
Sep 27 — Product Management at 09:00–12:00, Managing High Performance Teams at 13:30–16:30.

These render as dated notice strips rather than grid cells. The grid runs Mon–Sat, so Sep 27
has no column at all, and modelling an exam as a `timings` entry would put it into conflict
detection and the section filter as though it were a class. The Term 1 gantt panel used to be
triggered by *any* exam-tone banner in Term 4; it now opts in explicitly (`withTerm1Gantt`),
so these three banners don't each drag a duplicate panel onto the page.

### Added - Friend overlays show the friend's own section

Overlaying a friend drew them in *your* section's slots. If they were in the other section the
overlay put them beside you in a class you don't share, and the slot they actually attend had
no row in your grid to render them in — so a genuine "we're both busy Tuesday morning, in
different rooms" read as sitting together.

`useFriendSections` fetches overlaid friends' registrar assignments (the existing
`course_sections_read_all` policy already permitted this), and the overlay filters their
timings by their own section, adds any slot rows they need, and badges the section on the pill
— filled when it differs from yours. Clash detection follows the same narrowing, so a friend
in the other section no longer counts as a clash in a slot they were never in. With no section
on file the previous behaviour stands: every part shows, because guessing would be worse.

### Added - Tracked competition deadlines now appear on My Schedule

The Alerts tab knew the student had a submission due on a Thursday afternoon and My Schedule
showed that Thursday as an ordinary teaching day. Two surfaces, one set of dates, no connection
between them — so the planning surface was silent about the thing most likely to collide with
a class.

`lib/alerts/commitments.ts` derives every dated milestone the student has signed up for
(registration close, each round opening and closing, each hand-entered deadline) from the rows
`useAlerts` already fetched. No new query, nothing stored. The schedule grid renders them as a
**Deadlines** row under each week's classes, in the day column they fall on; clicking one opens
the Alerts tab. The `.ics` download carries them too, with a 24-hour alarm on each.

What is deliberately excluded, and why each would be a lie on a calendar: an eliminated or
archived track (those dates are no longer yours), a retired round (Unstop removed it), and an
undated round (there is no day to draw it on). A week with no classes but a deadline in it no
longer reads "Free week for you".

Day placement is IST, via `istDateOf` — a 23:30 IST deadline belongs to that evening, not to the
next UTC day. New analytics event: `schedule_commitment_clicked`.

### Added - Per-date class sessions extracted from the block timetables

`scripts/build_class_sessions.py` parses the Term 4 (blocks 16-21) and Term 5 (blocks 22-26)
timetables into `data/classSessions.json` — for every course code, each dated class with its
day, start/end time, venue, section, and an exam flag. A published block timetable overrides the
term-wide tentative one for the same block, because they disagree on times. Nothing reads it at
runtime yet; the catalogue's `timings` is still what the UI draws.

### Fixed - AITM was carrying the WaW programme's name, not its own

Block 17's WaW course was listed as "Winning at Workplace" with `faculty: 'TBD'`. "Winning at
Workplace" is what **WaW** stands for — the programme — so the category label had been
transcribed into the course-name field. Both sources agree on the real name: the Term 4
structure sheet (`O7`) and the timetable's own legend read `AITM — AI Tools for Managers`, and
the structure sheet names the faculty as Prof. Srinivas Atreya (`P7`).

The phrase survives correctly elsewhere — `Term5 Insight Engine/course_master.py` uses
"WaW (Winning at Workplace) faculty" as a programme reference, which is right. `data/courses.ts`
was the only place it had become a course name.

Audited every `mandatoryFor` in the catalogue against the red-font markers in both structure
spreadsheets while here. All seven are correct, including FWKJ → LSTR: SCAT→OPS, FWKJ→LSTR
(Term 4); OPST→OPS, CIVB→ENT (both rows), AMST→MKT (Term 5). No source exists in the repo for
Term 6, so its specs and `mandatoryFor` remain unverified.

### Added - Progress you can read two ways, and every specialization

The sidebar answered one question: what will the year add up to. A student in August wants the
other one — what have I banked so far — and the panel could not express it. "Electives 12/16"
counted courses that start in March.

`lib/progress.ts` is now the only place credit is counted, on either basis. `full-year` is
unchanged and still the default. `to-date` counts a course once its first class has happened,
so **an ongoing block counts** — a student sitting in week one of a block has not banked nothing.
The `BasisToggle` under PROGRESS switches both the sidebar bars and the new dialog from one
piece of state, so they cannot disagree.

The second half is the "All specializations" dialog. The sidebar only ever showed the specs a
student declared, but courses carry several spec tags, so declaring three quietly accumulates
credit toward the other three. The dialog shows all six, groups them into declared and
everything else, and leads with the answer: *"You have also completed Marketing without
declaring it."*

### Fixed - a staggered course counted as two credits

CIVB is one course taught in three windows, and the catalogue is one row per window. Selecting
Entrepreneurship auto-selects two of those rows, so the ENT bar read 4/6 off three courses and
the Electives bar over-counted by one. `courseKey()` collapses rows to one key per real course:
by `code` where there is one (SADT's Aug 5 makeup row), and by an explicit id list where there
is not — Term 6 rows have no codes, so the Term 6 continuation of CIVB is unreachable any other
way.

### Fixed - 6/6 did not mean a specialization was earned

Credits alone never were the rule: OPS also requires SCAT and OPST, MKT requires AMST, ECOM and
ENT require Crafting & Delivering Services. Six tagged courses without them is not a spec the
school will award, and telling a student otherwise is worse than telling them nothing. A spec is
complete only when its `mandatoryFor` courses are selected as well; blocked specs render amber
with the missing course named.

New events: `progress_basis_changed`, `spec_overview_opened`.

### Fixed - "Track this" failed silently

`trackCompetition` adds the track optimistically, then rolls back on error with `return` and
nothing else — no message, no analytics. The card flips to tracking, flips back, and the button
reads as broken rather than failed. Because the analytics event only fires on the success path,
the failure was invisible from the admin side too: a student reporting "tracking doesn't work"
left no trace anywhere to diagnose from. A null `userId` took the same silent path one line up.

- `useAlerts` exposes `writeError` / `dismissWriteError`; `AlertsView` renders it as a
  dismissible `role="alert"` banner above the competition columns.
- New `alert_track_failed` event carrying the Postgres error code, so the next report can be
  diagnosed without reproducing it.

### Fixed - "Phone notifications on" could be true of the browser and false of the server

The card read `Notification.permission` and nothing else, so granted permission was taken as
proof of a working subscription. It isn't. Dismissing the Chrome prompt resolves `'default'`,
not `'denied'`, and `enable()` returns at that check — before `pushManager.subscribe()`, before
anything is POSTed to `/api/alerts/subscribe`. Allow the site later from the address bar and
permission flips to granted with no subscription ever stored.

The collapsed granted-state card then claims notifications are on, offers no button to try
again, and the only symptom is the red triangle after pressing Test — whose tooltip says "This
device isn't subscribed yet. Turn notifications on first." about a card that says they are on.
Observed on a real account: `alert_push_prompt_shown` then `alert_push_denied {permission:
"default"}` three seconds later, zero rows in `push_subscriptions`, card showing "on".

- `subscribeAndSave()` is now a standalone function — register, subscribe, POST — used by both
  `enable()` and a new effect that runs whenever permission is granted.
- That effect cannot prompt (permission is already granted), so the never-auto-prompt rule in
  `usePushSubscription` still holds. It also repairs the other ways the row goes missing:
  cleared site data, a rotated endpoint, a subscription disabled after five failures.
  `/api/alerts/subscribe` upserts on `endpoint` and clears `disabled_at`, so re-running is safe.
- A failed repair sets `error`, so the triangle carries a true message instead of the card
  promising reminders it can't deliver.
- New `alert_push_repaired` event, fired only when the browser genuinely had no subscription —
  firing on every healthy mount would add a `user_events` row per page load.
- Skipped for the demo account: migration 018 denies it `push_subscriptions` writes, so the
  repair could only ever be a failing round trip.

### Fixed - the card action row was unreachable on mobile

Notifying / Reminders / Stop tracking on a tracked card, and Track this on an untracked one, sat
**63px underneath the collapsed MobileDrawer** at every scroll position. Nothing on a phone could
mute a competition or stop tracking it.

`<main>` had `max-lg:pb-20`, exactly matching the drawer's 80px `HANDLE_H`, so the padding looked
correct. It was being swallowed. The view wrapper inside carried `h-full` — a definite
`height: 100%` — so it stayed viewport-tall while its content *overflowed* it, and a scroll
container does not extend its bottom padding past overflowing content, only past in-flow content.
The 80px existed at the 785px mark of a 1474px scroll range, below the fold and clearing nothing.

- Wrapper is `min-h-full`, so content stays in flow and the container's padding lands after it.
- Padding is now `calc(80px + env(safe-area-inset-bottom) + 1.5rem)` — the drawer's height, the
  iOS home indicator, and breathing room — written in those terms because the drawer is what it
  has to clear.
- The empty-schedule state's `h-full min-h-[400px]` becomes `min-h-[60vh]`; `h-full` resolves to
  auto under a min-height parent, so the fallback was doing the work anyway.

Measured at 390×844: gap from the last card's action row to the drawer went from **−63px to
+41px**. Plan, My Schedule and Friends re-checked for scroll and horizontal overflow.

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

- **Competition logos use `object-contain`, not `object-cover`.** Unstop serves square 150×150
  logos, so cropping was invisible there. A manually-added competition's logo is whatever the
  organiser's site uses, and those are usually wide wordmarks — "Saregama TalentWood" rendered
  as an unreadable middle slice reading "ntw eason".

- **Published cohort-wide**: V-Guard Big Idea 2026 (`vguard-big-idea-2026`, 4 rounds),
  Saregama TalentWood Season 5 (`saregama-talentwood-s5-2026`, 4 rounds, all dates still TBA),
  EPOCH 2026 (`iimjobs-epoch-2026`, 2 rounds), and GRAD 3.0 by Galderma via `unstop-import`
  (`1698634`, 5 rounds).

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
