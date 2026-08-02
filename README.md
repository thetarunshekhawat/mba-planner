# MBA Planner (BITSoM Co'27)

A course planner for the BITSoM Year-2 cohort. Students browse the elective catalogue, build a
conflict-aware schedule across Terms 4–6, compare plans with friends, export to their calendar,
and ask an AI assistant about their courses. Admins get a cohort analytics dashboard.

> **Working on this codebase?** Read [`CLAUDE.md`](./CLAUDE.md) first — it's the architecture
> map and the standing rules (course-id safety, term model, insight engine, Supabase, the
> PostgREST row cap). This README is the short tour.

## Features

### Planning
- **Plan tab** — the full catalogue grouped by week, with cohort reviews (learning depth,
  workload, career relevance), seat counts, faculty, specialization tags and outline links.
  Filter by specialization, workload, depth or relevance.
- **My Schedule** — a block-by-block day × time-slot grid for Terms 4 and 5, showing rooms,
  section A/B assignments, today's column, and non-teaching weeks (exam break, placements,
  term break). Terms without timetable data fall back to a week list.
- **Conflict handling** — genuine clashes raise a red banner. Where a course has two sections
  and only one collides, the app instead shows a *section advisory* ("you'll likely be placed
  in Section B"), which is how the registrar actually resolves it.
- **Friends** — add peers by friend code, overlay their schedule on yours, and see where you
  share a class versus where you clash.
- **Export** — download a PDF or `.ics`, or subscribe from Google/Apple Calendar. Scoped to
  whichever terms you tick.

### AI course assistant
- Answers questions about your selected courses using the real course outlines, stored in
  Supabase and served at query time.
- Proactive **nudges** drawn from a pre-built, source-anchored insight catalogue — no live
  generation, so they cost nothing and can't hallucinate. Each insight rotates between a
  professional, a dry and a quirky phrasing.

### Admin
- Cohort overview, per-member drill-down, activity timelines, funnel insights and in-depth
  sections, all behind a hardcoded admin allowlist.
- **Term filter** across the dashboard, so Term 4 and Term 5 numbers can be read separately.
- **Metrics** view: activation, DAU/WAU/MAU and stickiness, distribution summaries with median
  and IQR (not just averages), weekly retention cohorts, Pareto concentration, the acquisition
  funnel, time-to-value, feature attach rates and error/rage-click rates.
- **Ask AI** — natural-language questions answered by generated SQL, executed through a
  read-only, admin-gated, schema-fenced RPC.

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Styling:** Tailwind CSS v4, Lucide icons, Recharts
- **Components:** shadcn/ui (Dialog, Sheet, Calendar, …)
- **Backend:** Supabase — Postgres, Auth (magic link), Storage, RLS
- **Hosting:** Vercel

## Project structure

```
mba-planner/
├── app/
│   ├── planner/          Main planner (Plan / My Schedule / Friends)
│   ├── admin/            Admin dashboard + audit log
│   ├── kyoto/            Alternate visual skin of the planner
│   └── api/              Chat, nudges, calendar, private file serving, analytics
├── components/
│   ├── planner/          Timetable, plan list, filters, friends, course modal
│   ├── planner-kyoto/    The Kyoto skin's own components
│   ├── admin/            AdminDashboard, MetricsPanel, AskAiPanel, AuditDashboard
│   ├── chatbot/          Chat widget, nudges, input, chips
│   └── auth/             Login form, professor ring, fact ticker
├── data/
│   ├── courses.ts        THE CATALOGUE — single source of truth
│   ├── professors.ts     Login-screen faculty (term-tagged)
│   ├── term1courses.ts   Term 1 retake timeline
│   └── term{4,5}Insights.json   Generated nudge catalogues
├── lib/
│   ├── terms.ts          Term dates, current term, completion
│   ├── conflicts.ts      Section advisories
│   ├── calendar.ts       ICS generation
│   └── chat/             Assistant routing, prompt, insight selection
├── scripts/              Uploads, seeding, and the verification scripts
└── supabase/migrations/  Schema
```

Course content lives one level up from the app, alongside the source spreadsheets:
`../Term 4 course outlines/`, `../Term 5 course outlines/`, `../Term5 Insight Engine/`.

## Setup

```bash
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # only needed for the upload scripts
NVIDIA_API_KEY=<key>                            # only needed for the AI assistant
```

```bash
npm run dev     # http://localhost:3000
```

## Database migrations

The Supabase CLI is linked to the project, so migrations apply directly from the shell — there
is no dashboard copy-paste step:

```bash
supabase db query --linked -f supabase/migrations/016_term5_outlines.sql

# read-only inspection
supabase db query --linked "select code, term from course_outlines order by term, code;" -o table
```

Key tables: `profiles`, `course_selections`, `course_sections`, `course_outlines`,
`friendships`, `user_sessions`, `user_events`, `landing_sessions`, `chatbot_messages`.
Note that **no table stores a term** — `course_selections` holds an integer `course_id` and the
term is resolved through `data/courses.ts`. See `CLAUDE.md` for why that matters.

## Content scripts

```bash
node scripts/upload-outlines.js --term 5     # push course outlines to private Storage
node scripts/assign-course-sections.js       # backfill registrar A/B section assignments (dry-run by default)
node scripts/seed-demo-account.mjs           # refresh the read-only demo login
```

## Verification

```bash
npx tsc --noEmit
npm run build
npx tsx scripts/verify-timings.mts     # class dates vs the published timetable
npx tsx scripts/verify-insights.mts    # insight engines fire; no dangling course codes
```

`verify-timings.mts` is the important one after any catalogue edit — it cross-checks every
generated class date against an independently transcribed expectation, which is what catches a
mistyped day or slot.

## Deployment

Deployed on Vercel; the repo is already linked (`.vercel/`). Set `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NVIDIA_API_KEY` in the Vercel project, apply any pending
migrations first, then push.

## Admin access

Admin features are gated by a hardcoded allowlist in `app/admin/page.tsx`,
`app/planner/page.tsx` and `app/kyoto/page.tsx` — all three must be updated together. The
current list is in `CLAUDE.md`.

## License

Private — for use by BITSoM MBA students and administrators.
