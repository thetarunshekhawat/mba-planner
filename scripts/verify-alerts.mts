// Checks for the Alerts feature: round state, chain progress, dedupe keys,
// dispatcher staleness, IST conversion, and the Unstop mapper against a
// committed live capture.
//
//   npx tsx scripts/verify-alerts.mts          pure logic only — no DB, no network
//   npx tsx scripts/verify-alerts.mts --live   also exercises the real database
//
// The default is offline so it can run anywhere and in CI. `--live` additionally
// asserts the schema landed as designed and that a re-import is idempotent —
// the property that protects every student's configured reminders.

import { readFileSync } from 'node:fs';
import {
  mapUnstopCompetition,
  parseUnstopId,
  stripNamespace,
  absoluteUrl,
  summarisePrizes,
  type UnstopResponse,
} from '../lib/alerts/unstop';
import {
  computeOccurrences,
  dedupeKey,
  offsetCode,
  previewSchedule,
  DEFAULT_OFFSETS,
  ROUND_END_OFFSETS,
  ROUND_START_OFFSETS,
  STALE_GRACE_MS,
  type DispatchInput,
} from '../lib/alerts/schedule';
import { roundState, chainProgress, pendingEliminationRounds, nextMilestone } from '../lib/alerts/progress';
import { istToInstant } from '../lib/alerts/time';
import type {
  AlertReminderRule,
  AlertRoundOutcome,
  AlertTrack,
  Competition,
  CompetitionRound,
} from '../types';

let failures = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} ${label}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`,
  );
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const T0 = new Date('2026-08-20T12:00:00+05:30');

function round(over: Partial<CompetitionRound> = {}): CompetitionRound {
  return {
    id: 'r1', competition_id: 'c1', round_key: 'k1', round_order: 1,
    title: 'Round', description_html: null, starts_at: null, ends_at: null,
    is_eliminator: false, entity_type: null, public_url: null,
    retired_at: null, updated_at: T0.toISOString(), ...over,
  };
}

function competition(over: Partial<Competition> = {}): Competition {
  return {
    id: 'c1', source: 'unstop', source_id: '1726557', visibility: 'global',
    created_by: null, title: 'TGC 2026', organiser: 'Samagra', logo_url: null,
    banner_url: null, public_url: 'https://unstop.com/x', region: 'online',
    registration_opens_at: null, registration_deadline: null,
    starts_at: null, ends_at: null, min_team_size: 3, max_team_size: 3,
    prize_summary: null, skills: null, register_count: null,
    created_at: T0.toISOString(), updated_at: T0.toISOString(), ...over,
  };
}

function track(over: Partial<AlertTrack> = {}): AlertTrack {
  return {
    id: 't1', user_id: 'u1', competition_id: 'c1', status: 'active',
    notifications_enabled: true, eliminated_round_id: null,
    eliminated_at: null, tracked_at: T0.toISOString(), ...over,
  };
}

function input(over: Partial<DispatchInput> = {}): DispatchInput {
  return { userId: 'u1', tracks: [], customDeadlines: [], courseItems: [], ...over };
}

// ── 1. roundState boundaries ─────────────────────────────────────────────────
console.log('— roundState —');
const past = '2026-08-01T00:00:00+05:30';
const future = '2026-09-01T00:00:00+05:30';

check('both dates null → unknown, never done', roundState(round(), T0), 'unknown');
check('ended → done', roundState(round({ starts_at: past, ends_at: past }), T0), 'done');
check('not started → upcoming', roundState(round({ starts_at: future, ends_at: future }), T0), 'upcoming');
check('straddling now → live', roundState(round({ starts_at: past, ends_at: future }), T0), 'live');
check('end-only, still ahead → upcoming', roundState(round({ ends_at: future }), T0), 'upcoming');
check('start-only, already begun → live', roundState(round({ starts_at: past }), T0), 'live');
check('unparseable dates → unknown', roundState(round({ starts_at: 'nonsense', ends_at: 'nonsense' }), T0), 'unknown');

// Exact boundaries: the instant a round ends it is done; the instant it starts it is live.
const exact = T0.toISOString();
check('at its end instant → done', roundState(round({ starts_at: past, ends_at: exact }), T0), 'done');
check('at its start instant → live', roundState(round({ starts_at: exact, ends_at: future }), T0), 'live');

// ── 2. Overlapping chain (the real TGC shape) ────────────────────────────────
console.log('— chain progress with overlapping rounds —');
// Rounds 3 and 4 are open simultaneously — the actual TGC 2026 layout, where
// three of ten rounds start before their predecessor ends. This is why progress
// counts finished rounds rather than the position of the "current" one.
const overlapping: CompetitionRound[] = [
  round({ id: 'a', round_order: 1, starts_at: past, ends_at: past }),
  round({ id: 'b', round_order: 2, starts_at: past, ends_at: past }),
  round({ id: 'c', round_order: 3, starts_at: past, ends_at: future }),
  round({ id: 'd', round_order: 4, starts_at: past, ends_at: future }),
];
const prog = chainProgress(overlapping, T0);
check('two rounds live at once is legal', prog.live, 2);
check('progress counts done, not index', prog.done, 2);
check('percent = done/total, not index/total', prog.percent, 50);
check('retired rounds are excluded', chainProgress([...overlapping, round({ id: 'e', retired_at: exact })], T0).total, 4);

check(
  'nextMilestone picks the earliest future instant',
  nextMilestone(overlapping, T0)?.at,
  future,
);

// ── 3. Elimination gate ──────────────────────────────────────────────────────
console.log('— elimination gate —');
const elimRounds = [
  round({ id: 'e1', round_order: 1, is_eliminator: true, starts_at: past, ends_at: past }),
  round({ id: 'e2', round_order: 2, is_eliminator: true, starts_at: past, ends_at: future }),
  round({ id: 'e3', round_order: 3, is_eliminator: false, starts_at: past, ends_at: past }),
];
check('gate asks only about ended eliminators', pendingEliminationRounds(elimRounds, [], T0).map(r => r.id), ['e1']);
const answered: AlertRoundOutcome[] = [{ id: 'o1', user_id: 'u1', round_id: 'e1', cleared: true, decided_at: exact }];
check('an answered round stops asking', pendingEliminationRounds(elimRounds, answered, T0).length, 0);

// ── 4. dedupeKey ─────────────────────────────────────────────────────────────
console.log('— dedupe keys —');
check('shape', dedupeKey('round_end', '9f3a', 'T-1d'), 'v1:round_end:9f3a:T-1d');
check('distinct across offsets', dedupeKey('round_end', 'x', 'T-1d') === dedupeKey('round_end', 'x', 'T-2d'), false);
check('distinct across kinds', dedupeKey('round_end', 'x', 'T-0') === dedupeKey('round_start', 'x', 'T-0'), false);
check('offsetCode: 2 days', offsetCode(2880), 'T-2d');
check('offsetCode: 3 hours', offsetCode(180), 'T-3h');
check('offsetCode: odd value stays stable', offsetCode(45), 'T-45m');

// The key must survive a date change — that is what stops a re-import re-firing
// a reminder the student already received.
const beforeMove = round({ id: 'rr', ends_at: '2026-08-25T18:00:00+05:30' });
const afterMove = round({ id: 'rr', ends_at: '2026-08-28T18:00:00+05:30' });
check(
  'key is stable when Unstop moves the round',
  dedupeKey('round_end', beforeMove.id, 'T-1d') === dedupeKey('round_end', afterMove.id, 'T-1d'),
  true,
);

// ── 5. Dispatcher timing ─────────────────────────────────────────────────────
console.log('— dispatcher timing —');
const anchorSoon = new Date(T0.getTime() + 60 * 60_000).toISOString(); // 1h away

// T-3h is already due (anchor is 1h out), anchor still in the future → send.
const late = computeOccurrences(
  input({ tracks: [{ track: track(), competition: competition({ registration_deadline: anchorSoon }), rounds: [], rules: [], outcomes: [] }] }),
  T0,
);
check('a late reminder about a future deadline still sends', late.some(o => o.dedupeKey.endsWith('T-3h') && o.status === 'sent'), true);
check('a not-yet-due offset is not emitted at all', late.some(o => o.dedupeKey.endsWith('T-0')), false);

// Anchor well past the grace window → tombstone, send nothing.
const anchorStale = new Date(T0.getTime() - STALE_GRACE_MS - 60 * 60_000).toISOString();
const stale = computeOccurrences(
  input({ tracks: [{ track: track(), competition: competition({ registration_deadline: anchorStale }), rounds: [], rules: [], outcomes: [] }] }),
  T0,
);
check('past the grace window → skipped_stale', stale.every(o => o.status === 'skipped_stale'), true);
check('...and it still burns a key rather than emitting nothing', stale.length > 0, true);

// T-0 fires only inside [anchor, anchor + grace).
const anchorJustPassed = new Date(T0.getTime() - 60 * 60_000).toISOString();
const justPassed = computeOccurrences(
  input({ tracks: [{ track: track(), competition: competition({ registration_deadline: anchorJustPassed }), rounds: [], rules: [], outcomes: [] }] }),
  T0,
);
check('T-0 inside the grace window sends', justPassed.find(o => o.dedupeKey.endsWith('T-0'))?.status, 'sent');

// ── 6. Muted, eliminated and offset sets ─────────────────────────────────────
console.log('— suppression —');
const dueComp = competition({ registration_deadline: anchorSoon });

check(
  'a muted track produces zero occurrences',
  computeOccurrences(input({ tracks: [{ track: track({ notifications_enabled: false }), competition: dueComp, rounds: [], rules: [], outcomes: [] }] }), T0).length,
  0,
);
check(
  'an eliminated track produces zero occurrences',
  computeOccurrences(input({ tracks: [{ track: track({ status: 'eliminated' }), competition: dueComp, rounds: [], rules: [], outcomes: [] }] }), T0).length,
  0,
);
check(
  'a self-declared loss stops round reminders',
  computeOccurrences(input({
    tracks: [{
      track: track(),
      competition: competition(),
      rounds: [round({ id: 'z', ends_at: anchorSoon })],
      rules: [],
      outcomes: [{ id: 'o', user_id: 'u1', round_id: 'z', cleared: false, decided_at: exact }],
    }],
  }), T0).length,
  0,
);

// A disabled override removes exactly one default and leaves the rest.
const suppressT3h: AlertReminderRule = {
  id: 'rule1', track_id: 't1', anchor: 'registration_deadline', round_id: null,
  mode: 'offset', offset_minutes: 180, absolute_at: null, enabled: false,
};
const withOverride = computeOccurrences(
  input({ tracks: [{ track: track(), competition: dueComp, rounds: [], rules: [suppressT3h], outcomes: [] }] }),
  T0,
);
check('a disabled rule suppresses exactly one default', late.length - withOverride.length, 1);
check('...and it is the right one', withOverride.some(o => o.dedupeKey.endsWith('T-3h')), false);

// Offset sets differ per anchor, on purpose.
check('registration gets all five offsets', DEFAULT_OFFSETS.length, 5);
check('round_end drops the 7-day warning', ROUND_END_OFFSETS.some(o => o.minutes === 10080), false);
check('round_start is a single same-day notice', ROUND_START_OFFSETS.length, 1);

// previewSchedule and computeOccurrences must resolve the same offsets — this is
// what stops the card promising a reminder that never fires.
const previewCodes = previewSchedule(future, DEFAULT_OFFSETS, [suppressT3h], T0).map(r => r.code);
check('preview honours the same override', previewCodes.includes('T-3h'), false);
check('preview lists remaining offsets in order', previewCodes, ['T-7d', 'T-2d', 'T-1d', 'T-0']);

// ── 7. IST conversion ────────────────────────────────────────────────────────
console.log('— IST —');
check("istToInstant('2026-08-10','09:00')", istToInstant('2026-08-10', '09:00'), '2026-08-10T03:30:00.000Z');
check('midnight IST', istToInstant('2026-08-10', '00:00'), '2026-08-09T18:30:00.000Z');
check('late evening crosses the UTC date line', istToInstant('2026-08-10', '23:59'), '2026-08-10T18:29:00.000Z');

// ── 8. Unstop mapper against the live capture ────────────────────────────────
console.log('— Unstop mapper —');
const raw = JSON.parse(readFileSync('scripts/fixtures/unstop-tgc-2026.json', 'utf8')) as UnstopResponse;
const m = mapUnstopCompetition(raw);

check('title', m.competition.title, 'The Governance Challenge 2026 (TGC 2026)');
check('organiser comes from organisation.name', m.competition.organiser, 'Samagra');
check('registration deadline keeps its +05:30 offset', m.competition.registrationDeadline, '2026-08-21T23:59:24+05:30');
check('team size', [m.competition.minTeamSize, m.competition.maxTeamSize], [3, 3]);
check('sourceId', m.sourceId, '1726557');
check('round count', m.rounds.length, 10);
check('eliminators at the right orders', m.rounds.filter(r => r.isEliminator).map(r => r.roundOrder), [1, 2, 3, 6, 10]);
check('every round has a title (details[0].title, not round.title)', m.rounds.every(r => !!r.title), true);
check('first round title', m.rounds[0].title, 'Stage 1: Campus Round');
check('every round has a round key', m.rounds.every(r => !!r.roundKey), true);
check('round keys are distinct', new Set(m.rounds.map(r => r.roundKey)).size, 10);
check('entity_type namespace stripped', m.rounds[0].entityType, 'OfflineRound');
// Submission rounds (App\Model\Rounds) carry no public_url on real payloads —
// only the offline ones do. A null here is data, not a mapping bug; consumers
// fall back to the competition URL.
check('rounds 3/6/8 legitimately have no URL', m.rounds.filter(r => r.publicUrl === null).map(r => r.roundOrder), [3, 6, 8]);
check('where a round URL exists it is absolute', m.rounds.every(r => r.publicUrl === null || r.publicUrl.startsWith('https://unstop.com/')), true);
check('competition URL uses seo_url', m.competition.publicUrl, 'https://unstop.com/competitions/crp-the-governance-challenge-2026-tgc-2026-samagra-1726557');
check('skills are strings, not objects', m.competition.skills.slice(0, 2), ['Business Planning', 'Public Speaking and Presentation Skills']);
check('prizeSummary derived from prizes[] (overall_prizes is null)', m.competition.prizeSummary?.startsWith('Winner ₹5,00,000'), true);
check('descriptionHtml comes from display_text', m.rounds[0].descriptionHtml?.startsWith('<p>'), true);

// The dates the plan's fixture spec calls out.
check('round 1 window', [m.rounds[0].startsAt, m.rounds[0].endsAt], ['2026-08-10T12:00:49+05:30', '2026-08-21T23:59:49+05:30']);

// Round *windows overlap* on real data: round 4 begins on 2026-08-27, inside
// round 3's 2026-08-26 → 2026-09-06 window. Start instants do happen to ascend
// with round_order here, so the trap is not "the sort is wrong" — it is that
// consecutive order does not mean consecutive time, and two rounds can be live
// at once. Anything deriving "which round am I on" from position is broken.
const overlaps = m.rounds.filter((r, i) => {
  const prev = m.rounds[i - 1];
  return prev?.endsAt && r.startsAt && r.startsAt < prev.endsAt;
});
// Three of ten rounds start before their predecessor ends. Round 2 (a one-day
// AMA) sits entirely inside round 1's 11-day registration window.
check('round windows overlap on real data', overlaps.map(r => r.roundOrder), [2, 4, 6]);
check('round 4 starts before round 3 ends', m.rounds[3].startsAt! < m.rounds[2].endsAt!, true);

// ── 9. Mapper robustness ─────────────────────────────────────────────────────
console.log('— mapper robustness —');
const clone = () => JSON.parse(readFileSync('scripts/fixtures/unstop-tgc-2026.json', 'utf8')) as UnstopResponse;

const emptyDetails = clone();
emptyDetails.data!.competition!.rounds![0].details = [];
check('details: [] maps without throwing', (() => { try { mapUnstopCompetition(emptyDetails); return true; } catch { return false; } })(), true);
check('...and the detail-less round keeps a key from round.id', mapUnstopCompetition(emptyDetails).rounds.some(r => r.title === null), true);

const missingDetails = clone();
delete (missingDetails.data!.competition!.rounds![0] as Record<string, unknown>).details;
check('missing details maps without throwing', (() => { try { mapUnstopCompetition(missingDetails); return true; } catch { return false; } })(), true);

const noRounds = clone();
noRounds.data!.competition!.rounds = null;
check('a competition with no rounds is still importable', mapUnstopCompetition(noRounds).rounds.length, 0);

const hidden = clone();
hidden.data!.competition!.rounds![0].is_hidden = 1;
check('hidden rounds are filtered out', mapUnstopCompetition(hidden).rounds.length, 9);

check('no competition → throws', (() => { try { mapUnstopCompetition({} as UnstopResponse); return false; } catch { return true; } })(), true);

// ── 10. URL / id parsing ─────────────────────────────────────────────────────
console.log('— id + url helpers —');
check('id off a full URL', parseUnstopId('https://unstop.com/competitions/crp-the-governance-challenge-2026-tgc-2026-samagra-1726557'), '1726557');
check('id off a URL with a trailing slash', parseUnstopId('https://unstop.com/competitions/foo-bar-1726557/'), '1726557');
check('bare numeric id', parseUnstopId('1726557'), '1726557');
check('a slug with no numeric id is rejected', parseUnstopId('https://unstop.com/competitions/some-slug'), null);
check('stripNamespace', stripNamespace('App\\Model\\OfflineRound'), 'OfflineRound');
check('stripNamespace on a bare name', stripNamespace('Rounds'), 'Rounds');
check('absoluteUrl leaves absolutes alone', absoluteUrl('https://x.test/a'), 'https://x.test/a');
check('absoluteUrl fixes a root-relative path', absoluteUrl('/competitions/x'), 'https://unstop.com/competitions/x');
check('absoluteUrl fixes a bare-relative path', absoluteUrl('competitions/x'), 'https://unstop.com/competitions/x');
check('summarisePrizes on empty input', summarisePrizes([]), null);
check('summarisePrizes keeps cashless ranks', summarisePrizes([{ rank: 'Hiring', cash: null }]), 'Hiring');

// ── 11. Tier A course dates ──────────────────────────────────────────────────
console.log('— course deadlines (Tier A) —');
const { courseDeadlineItems } = await import('../lib/alerts/courseDeadlines');
const { ALL_COURSES } = await import('../data/courses');
const { campusToday, isCourseCompleted } = await import('../lib/terms');

// Every elective in the catalogue, so the checks below see the widest surface.
const allIds = new Set(ALL_COURSES.map((c) => c.id));
const tierA = courseDeadlineItems(allIds, T0);

check('Tier A produces items', tierA.length > 0, true);
check(
  'every item maps to a real ALL_COURSES row',
  tierA.every((i) => allIds.has(Number(i.id.split('-').pop()))),
  true,
);
check('every item is a valid instant', tierA.every((i) => !Number.isNaN(new Date(i.dueAt).getTime())), true);
check('items are chronological', tierA.map((i) => i.dueAt).join() === [...tierA.map((i) => i.dueAt)].sort().join(), true);

// The standing course time-awareness rule: nothing forward-looking about a
// course that has already finished.
const todayAtT0 = campusToday(T0);
const finishedIds = new Set(
  ALL_COURSES.filter((c) => isCourseCompleted(c, todayAtT0)).map((c) => c.id),
);
check(
  'no item is emitted for a completed course',
  tierA.some((i) => finishedIds.has(Number(i.id.split('-').pop()))),
  false,
);
check(
  'no item is dated in the past',
  tierA.every((i) => new Date(i.dueAt).getTime() > T0.getTime()),
  true,
);
check('an empty selection still yields the mandatory courses', courseDeadlineItems(new Set(), T0).length > 0, true);

// ── 12. Push assets and env ──────────────────────────────────────────────────
console.log('— push assets —');
const { existsSync } = await import('node:fs');

const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
check('manifest parses with display: standalone', manifest.display, 'standalone');
check('manifest start_url is the planner', manifest.start_url, '/planner');
check('manifest declares a maskable icon', manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable'), true);
check(
  'every manifest icon exists on disk',
  manifest.icons.every((i: { src: string }) => existsSync(`public${i.src}`)),
  true,
);

const sw = readFileSync('public/sw.js', 'utf8');
check("sw.js handles 'push'", sw.includes("addEventListener('push'"), true);
check("sw.js handles 'notificationclick'", sw.includes("addEventListener('notificationclick'"), true);
// A caching service worker on a Next.js app serves stale builds; assert we have none.
check('sw.js does not cache', sw.includes('caches.open'), false);

if (existsSync('.env.local')) {
  console.log('— env —');
  const envText = readFileSync('.env.local', 'utf8');
  const envMap: Record<string, string> = {};
  for (const line of envText.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && !line.trim().startsWith('#')) envMap[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const key of [
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT',
    'CRON_SECRET', 'ALERTS_IMPORT_SECRET',
  ]) {
    check(`${key} is set`, !!envMap[key], true);
  }
  // An uncompressed P-256 public key is exactly 65 bytes. A truncated or
  // re-encoded key fails here rather than at subscribe() time in a browser.
  const pub = envMap.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
  const decoded = Buffer.from(pub.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  check('VAPID public key decodes to 65 bytes', decoded.length, 65);
  check('VAPID subject is a mailto:', (envMap.VAPID_SUBJECT ?? '').startsWith('mailto:'), true);
  check('CRON_SECRET is long enough to matter', (envMap.CRON_SECRET ?? '').length >= 32, true);
}

// ── 13. Live database (--live only) ──────────────────────────────────────────
if (process.argv.includes('--live')) {
  const { createClient } = await import('@supabase/supabase-js');
  const { importCompetition } = await import('../lib/alerts/import');

  const env: Record<string, string> = {};
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && !line.trim().startsWith('#')) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log('\n— live schema —');
  const TABLES = [
    'competitions', 'competition_rounds', 'alert_tracks', 'alert_reminder_rules',
    'alert_round_outcomes', 'custom_deadlines', 'push_subscriptions', 'alert_deliveries',
  ];
  for (const t of TABLES) {
    const { error } = await db.from(t).select('*', { count: 'exact', head: true });
    check(`${t} exists and is readable`, error === null, true);
  }

  console.log('\n— import idempotency —');
  // The invariant: a re-import must never renumber a round. alert_reminder_rules
  // and alert_round_outcomes cascade off competition_rounds.id, so a
  // delete-and-recreate would wipe every student's configured reminders silently.
  const first = await importCompetition(db, m, { visibility: 'global', createdBy: null });
  const second = await importCompetition(db, m, { visibility: 'global', createdBy: null });

  check('re-import keeps the same competition id', first.competitionId, second.competitionId);
  check('re-import inserts no new rounds', second.roundsInserted, 0);
  check('re-import updates all 10 in place', second.roundsUpdated, 10);
  check('re-import retires nothing', second.roundsRetired, 0);

  // A round disappearing upstream must retire, never delete.
  const trimmed = { ...m, rounds: m.rounds.slice(0, 9) };
  const third = await importCompetition(db, trimmed, { visibility: 'global', createdBy: null });
  check('a round missing upstream is retired', third.roundsRetired, 1);

  const { count: stillThere } = await db
    .from('competition_rounds').select('*', { count: 'exact', head: true })
    .eq('competition_id', first.competitionId);
  check('the retired round row still exists', stillThere, 10);

  // And it comes back cleanly if Unstop re-lists it.
  await importCompetition(db, m, { visibility: 'global', createdBy: null });
  const { count: retiredNow } = await db
    .from('competition_rounds').select('*', { count: 'exact', head: true })
    .eq('competition_id', first.competitionId).not('retired_at', 'is', null);
  check('a restored round un-retires', retiredNow, 0);

  console.log('\n— stored shape —');
  const { data: stored } = await db
    .from('competitions')
    .select('title, visibility, owner_key, skills, prize_summary, registration_deadline')
    .eq('id', first.competitionId).single();
  check('title round-trips', stored?.title, 'The Governance Challenge 2026 (TGC 2026)');
  check('global rows get the sentinel owner_key',
    stored?.owner_key, '00000000-0000-0000-0000-000000000000');
  check('skills stored as a text[]', Array.isArray(stored?.skills) && stored!.skills.length, 5);
  check('prize summary stored', typeof stored?.prize_summary === 'string', true);

  console.log('\n— anon isolation —');
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: anonRows } = await anon.from('competitions').select('id');
  check('an anonymous client reads no competitions', anonRows?.length ?? 0, 0);
  const { data: anonTracks } = await anon.from('alert_tracks').select('id');
  check('an anonymous client reads no tracks', anonTracks?.length ?? 0, 0);
  const { error: anonInsert } = await anon
    .from('competitions').insert({ source: 'manual', visibility: 'global', title: 'nope' });
  check('an anonymous client cannot publish', anonInsert !== null, true);
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
process.exit(failures ? 1 : 0);
