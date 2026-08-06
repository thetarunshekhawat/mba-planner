---
name: unstop-import
description: Publish an Unstop competition to the whole BITSoM cohort's Alerts tab. Use when given an Unstop competition/hackathon URL and asked to add, publish, import, or share it with the cohort. Fetches the public Unstop API, maps rounds and deadlines, and POSTs to the deployed site's admin import route.
---

# Publish an Unstop competition to the cohort

Turns an Unstop URL into a cohort-wide competition card in the MBA Planner
Alerts tab — logo, organiser, registration deadline, and the full round chain
with eliminators marked.

This is the **only sanctioned path to a cohort-wide competition**. Everything
else (the website's "Add competition" button) creates a private one visible
only to the person who added it.

## Before you start

Two environment variables must be set:

- `ALERTS_IMPORT_URL` — e.g. `https://<the-deployed-site>/api/alerts/import`
- `ALERTS_IMPORT_SECRET` — the bearer token for that route

If either is missing, stop and say so. Do not fall back to writing to Supabase
directly: the import route is what keeps round ids stable, and a direct write
would bypass it.

## Rules

1. **Never invent a date.** If Unstop doesn't publish a round's dates, send
   nulls. A guessed deadline becomes a push notification on a hundred phones.
2. **Never write to Supabase directly.** Only POST to `$ALERTS_IMPORT_URL`.
3. **Never publish without being asked to.** Publishing is cohort-wide and
   immediately visible to everyone. If the user only said "look at this
   competition", show them the mapping and ask before posting.
4. **Report what changed**, including whether this created a new competition or
   updated an existing one.

## Step 1 — get the numeric id

The id is the trailing number of the slug:

```
https://unstop.com/competitions/crp-the-governance-challenge-2026-tgc-2026-samagra-1726557
                                                                              ^^^^^^^
```

If the URL has no trailing number, **stop**. The slug-only form returns a 404
body inside a `200 OK`, so continuing produces an empty competition rather than
an error.

## Step 2 — fetch the public API

```bash
curl -s "https://unstop.com/api/public/competition/<ID>" \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' \
  -H 'Accept: application/json'
```

`competition` is the endpoint for **all** opportunity types — hackathons,
quizzes, case competitions — so there is nothing to branch on. It is public and
unauthenticated; no login, no scraping.

The response is `{ data: { competition: {...} } }`.

## Step 3 — map it

The field names are not guessable and several are actively misleading. Read
`lib/alerts/unstop.ts` in the repo — `mapUnstopCompetition()` is the reference
implementation and this mapping must match it exactly. The traps:

| Target | Source | Watch out |
|---|---|---|
| round `title` | `rounds[i].details[0].title` | a round has **no** `title` of its own |
| round `descriptionHtml` | `rounds[i].details[0].display_text` | |
| round `roundKey` | `rounds[i].details[0].id` | **stable across re-imports — this is the join key** |
| round `startsAt` / `endsAt` | `rounds[i].details[0].start_date` / `end_date` | `details` is an ARRAY and may be empty or absent |
| round `isEliminator` | `rounds[i].eliminator_round` | int `0`/`1`, on the round, not the detail |
| round `entityType` | `rounds[i].entity_type` | `App\Model\OfflineRound` → strip to `OfflineRound` |
| round `publicUrl` | `rounds[i].details[0].public_url` | relative; prefix `https://unstop.com`. Often absent on submission rounds — null is fine |
| skip a round when | `is_hidden` or `is_inactive` is `1` | |
| `registrationDeadline` | `regnRequirements.end_regn_dt` | |
| `registrationOpensAt` | `regnRequirements.start_regn_dt` | |
| `minTeamSize` / `maxTeamSize` | `regnRequirements.min_team_size` / `max_team_size` | |
| `publicUrl` | `seo_url` | `public_url` is relative **without** a leading slash |
| `logoUrl` | `logoUrl` | already absolute |
| `bannerUrl` | `banner.image_url` | `banner` is an object, not a string |
| `skills` | `skills[].skill_name` | array of objects, not strings |
| `prizeSummary` | derive from `prizes[]` | `overall_prizes` is `null` even when prizes exist |
| `organiser` | `organisation.name` | |

Sort rounds by `round_order`, but **do not treat that as a timeline**. Round
windows overlap — on TGC 2026 three of ten rounds start before their
predecessor ends, and round 2 sits entirely inside round 1. Consecutive order
does not mean consecutive time.

Dates are ISO 8601 with a `+05:30` offset. Pass them through **verbatim**. Do
not reformat, do not convert to UTC, do not strip the offset.

## Step 4 — POST it

```bash
curl -s -X POST "$ALERTS_IMPORT_URL" \
  -H "Authorization: Bearer $ALERTS_IMPORT_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "unstop",
    "sourceId": "1726557",
    "visibility": "global",
    "competition": {
      "title": "The Governance Challenge 2026 (TGC 2026)",
      "organiser": "Samagra",
      "logoUrl": "https://...",
      "bannerUrl": "https://...",
      "publicUrl": "https://unstop.com/competitions/...",
      "region": "online",
      "registrationOpensAt": "2026-07-27T09:33:24+05:30",
      "registrationDeadline": "2026-08-21T23:59:24+05:30",
      "startsAt": "2026-07-27T09:33:24+05:30",
      "endsAt": "2026-09-30T21:00:50+05:30",
      "minTeamSize": 3,
      "maxTeamSize": 3,
      "prizeSummary": "Winner ₹5,00,000 · First Runners-Up ₹3,00,000",
      "skills": ["Business Planning", "Policy Analysis"],
      "registerCount": 4127
    },
    "rounds": [
      {
        "roundKey": "1343676",
        "roundOrder": 1,
        "title": "Stage 1: Campus Round",
        "descriptionHtml": "<p>…</p>",
        "startsAt": "2026-08-10T12:00:49+05:30",
        "endsAt": "2026-08-21T23:59:49+05:30",
        "isEliminator": true,
        "entityType": "OfflineRound",
        "publicUrl": "https://unstop.com/competitions/.../offline-round/1343676/details"
      }
    ]
  }'
```

Re-running this on the same competition is safe and expected — it is how you
pick up dates Unstop has edited. Rounds are matched on `roundKey` and updated in
place; rounds that vanish upstream are retired, never deleted, because students'
reminder settings and elimination records point at those rows.

## Step 5 — report back

Tell the user:

- title and organiser
- registration deadline
- round count and how many are eliminators
- `created: true` (new) or `false` (updated an existing one)
- `roundsInserted` / `roundsUpdated` / `roundsRetired`

If `roundsRetired` is non-zero, say which rounds disappeared — that usually means
the organiser restructured the competition, and it is worth a human knowing.
