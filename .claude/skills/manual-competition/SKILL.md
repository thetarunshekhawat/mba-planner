---
name: manual-competition
description: Publish a case competition that has NO Unstop page to the whole BITSoM cohort's Alerts tab. Use when given a competition URL that is not unstop.com — a company microsite, Dare2Compete, a Google Form, a PDF — and asked to add, publish, import or share it with the cohort. Reads the page, maps phases to rounds by hand, and POSTs to the admin import route.
---

# Publish a non-Unstop competition to the cohort

The companion to `unstop-import`. Same destination, same route, same cohort-wide
result — but the source page has no API, so **you** are the mapper.

Use `unstop-import` whenever the link is an unstop.com competition with a
trailing numeric id. It is strictly better: the API is authoritative and the
field mapping is already solved. Come here only when that path is unavailable.

## Before you start

- `ALERTS_IMPORT_URL` — e.g. `https://mba-planner.vercel.app/api/alerts/import`
- `ALERTS_IMPORT_SECRET` — the bearer token for that route (in `.env.local`)

If either is missing, stop and say so. Do not write to Supabase directly: the
import route is what keeps round ids stable across re-imports, and a direct
write bypasses it.

## The one rule that matters

**Never invent a date, a time, or a fact.** Everything you send must be on the
page. If a phase has a date but no time of day, say so in the description rather
than inventing 9am. If the prize structure is ambiguous, omit it. This payload
becomes push notifications on a hundred phones, and unlike the Unstop path
nothing upstream will correct you.

Where the page is genuinely silent, send `null`. A null renders as "Dates to be
announced", which is honest. A guess renders as a countdown, which is not.

## Step 1 — read the page

Use `/browse`:

```bash
$B goto "<url>"
$B text                       # phases, deadlines, eligibility, prizes
$B media --images | grep -i logo
```

Marketing sites bury the timeline in three places that disagree — a "Process"
section, a "Key Timelines" strip, and the FAQ. Read all of them and prefer the
most specific (a date *with* a time beats a date alone). Note any conflict in
your report rather than silently picking one.

## Step 2 — decide what is a round

A round is **a thing with a deadline a student must act on.** Nothing else.

| Page says | Model as |
|---|---|
| "Submit X by <date>" | a round |
| "Finale on <dates>" | a round (`isEliminator: false`) |
| "Registration closes <date>" | the competition's `registrationDeadline`, **not** a round |
| "Shortlist announced <date>" | a sentence in the previous round's `descriptionHtml` |

Announcements must not become rounds. `ROUND_START_OFFSETS` and
`ROUND_END_OFFSETS` in `lib/alerts/schedule.ts` would fire up to four
notifications for a single "results are out" date.

`isEliminator: true` only where the page says people are cut. That flag drives
the pass/fail gate on the card, so a false positive asks students whether they
cleared a round that never eliminated anyone.

## Step 3 — pick keys that survive a re-import

`sourceId` is a slug you invent: `<organiser>-<competition>-<year>`, lowercase,
hyphenated. `roundKey` is `<sourceId>-p<n>-<short-name>`.

**These are permanent.** `importCompetition` matches existing rows on
`(source, source_id)` and rounds on `roundKey`. Change a `roundKey` on a
re-import and the old round is retired and a new one created — taking every
reminder rule and elimination record that pointed at it. Write them down in the
report so the next run reuses them.

## Step 4 — POST it

Dates are ISO 8601 with the `+05:30` offset, verbatim. `source` must be
`"manual"`; that is what distinguishes these rows from Unstop-backed ones, and
the schema `CHECK` only allows `unstop` or `manual`.

```bash
curl -sS -X POST "$ALERTS_IMPORT_URL" \
  -H "Authorization: Bearer $ALERTS_IMPORT_SECRET" \
  -H 'Content-Type: application/json' \
  --data-binary @payload.json
```

```json
{
  "source": "manual",
  "sourceId": "vguard-big-idea-2026",
  "visibility": "global",
  "competition": {
    "title": "V-Guard Big Idea 2026 (16th Edition)",
    "organiser": "V-Guard Industries",
    "logoUrl": "https://.../vguard-big-idea-2.png",
    "bannerUrl": null,
    "publicUrl": "https://www.vguard.in/contest/index.php/index",
    "region": "India · Finale in Kochi",
    "registrationOpensAt": null,
    "registrationDeadline": "2026-08-06T14:00:00+05:30",
    "startsAt": null,
    "endsAt": "2026-09-26T23:59:00+05:30",
    "minTeamSize": 1,
    "maxTeamSize": 3,
    "prizeSummary": "Winner ₹3,00,000 · 1st Runner-Up ₹2,00,000",
    "skills": ["Business Plan", "Strategy"],
    "registerCount": null
  },
  "rounds": [
    {
      "roundKey": "vg-bi-2026-p2-exec-summary",
      "roundOrder": 1,
      "title": "Phase 2: Executive Summary",
      "descriptionHtml": "<p>Max 2000 words…</p><p><strong>Shortlists announced 21 Aug 2026.</strong></p>",
      "startsAt": null,
      "endsAt": "2026-08-12T14:00:00+05:30",
      "isEliminator": true,
      "entityType": "Submission",
      "publicUrl": "https://www.vguard.in/contest/index.php/index"
    }
  ]
}
```

`entityType` is free text here (Unstop's `App\Model\OfflineRound` convention
does not apply). `Submission` and `OfflineRound` are the two in use.

Re-running on the same `sourceId` is safe and is how you pick up a date the
organiser moved. Rounds match on `roundKey` and update in place; rounds that
disappear are retired, never deleted.

## Step 5 — report back, and check the clock

Give the user: title, organiser, registration deadline, round count and how many
are eliminators, `created: true|false`, and the round keys you assigned.

**Then say whether the thing is still enterable.** Compare
`registrationDeadline` to now in IST. Publishing a competition whose
registration has already closed is sometimes right — later phases still have
deadlines worth tracking for teams already in — but the user must be told, not
left to notice. Offer to delete it:

```bash
supabase db query --linked "delete from competitions where source_id='<slug>'"
```

Rounds, tracks and reminder rules cascade off that row, so one delete is enough.
