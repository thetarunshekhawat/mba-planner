// Unstop's public opportunity API → our competition/round shape.
//
// Endpoint: GET https://unstop.com/api/public/competition/{numericId}
// The numeric id is the trailing segment of the slug, and `competition` is the
// endpoint for *every* opportunity type (hackathons, quizzes, case comps), so
// there is nothing to branch on. It is unauthenticated JSON — no scraping.
//
// Everything below was written against a live capture of TGC 2026 (id 1726557),
// committed at scripts/fixtures/unstop-tgc-2026.json. The field names are not
// guessable, and several are actively misleading, so read this before changing
// the mapper:
//
//   • A round has NO `title`. The title, description, dates and public URL all
//     live in `details[0]` — an ARRAY, which can be empty or absent.
//   • Elimination is `round.eliminator_round`, an int 0/1, on the round itself
//     — not `is_elimination_round`, and not on the detail.
//   • `entity_type` is a PHP class name (`App\Model\OfflineRound`), so it needs
//     the namespace stripped.
//   • Round `public_url` is relative; competition `public_url` is relative AND
//     has no leading slash. `seo_url` is the absolute one — use that.
//   • `skills` is an array of objects, not strings.
//   • `overall_prizes` is null even when prizes exist; the real data is in
//     `prizes[]`.
//
// **Consecutive round_order does not mean consecutive time.** On TGC 2026 the
// start instants happen to ascend with round_order, but the *windows overlap* —
// order 4 runs 2026-08-27 → 08-29, entirely inside order 3's 2026-08-26 →
// 09-06 window. So two rounds can be open at once, and anything that walks
// rounds to decide "where am I now" must compare dates, never positions.
// Some rounds also carry no `public_url` at all (the submission-type ones,
// `App\Model\Rounds`), so callers fall back to the competition URL.

const UNSTOP_ORIGIN = 'https://unstop.com';

// ── The response, typed only as far as we actually read it ───────────────────
// Everything is optional: this is a third-party payload we do not control, and
// a missing field must degrade to null rather than throw mid-import.

export interface UnstopRoundDetail {
  id?: number | string;
  title?: string | null;
  display_text?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  public_url?: string | null;
}

export interface UnstopRound {
  id?: number | string;
  entity_type?: string | null;
  round_order?: number | null;
  eliminator_round?: number | boolean | null;
  is_hidden?: number | boolean | null;
  is_inactive?: number | boolean | null;
  details?: UnstopRoundDetail[] | null;
}

export interface UnstopCompetition {
  id?: number | string;
  title?: string | null;
  seo_url?: string | null;
  public_url?: string | null;
  region?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  logoUrl?: string | null;
  banner?: { image_url?: string | null; path?: string | null } | null;
  registerCount?: number | null;
  organisation?: { name?: string | null } | null;
  regnRequirements?: {
    start_regn_dt?: string | null;
    end_regn_dt?: string | null;
    min_team_size?: number | null;
    max_team_size?: number | null;
  } | null;
  prizes?: { rank?: string | null; cash?: number | null; currencyCode?: string | null }[] | null;
  skills?: { skill_name?: string | null; skill?: string | null }[] | null;
  rounds?: UnstopRound[] | null;
}

export interface UnstopResponse {
  data?: { competition?: UnstopCompetition | null } | null;
}

// ── Our shape (the /api/alerts/import payload) ───────────────────────────────

export interface MappedRound {
  roundKey: string;
  roundOrder: number;
  title: string | null;
  descriptionHtml: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isEliminator: boolean;
  entityType: string | null;
  publicUrl: string | null;
}

export interface MappedCompetition {
  /** `manual` covers competitions with no Unstop page, mapped by hand. */
  source: 'unstop' | 'manual';
  sourceId: string;
  competition: {
    title: string;
    organiser: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    publicUrl: string | null;
    region: string | null;
    registrationOpensAt: string | null;
    registrationDeadline: string | null;
    startsAt: string | null;
    endsAt: string | null;
    minTeamSize: number | null;
    maxTeamSize: number | null;
    prizeSummary: string | null;
    skills: string[];
    registerCount: number | null;
  };
  rounds: MappedRound[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Unstop sends 0/1 ints where a boolean belongs (and occasionally "1"). */
function toBool(v: number | boolean | string | null | undefined): boolean {
  return v === true || v === 1 || v === '1';
}

function nonEmpty(v: string | null | undefined): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length ? s : null;
}

/** `App\Model\OfflineRound` → `OfflineRound`. */
export function stripNamespace(entityType: string | null | undefined): string | null {
  const s = nonEmpty(entityType);
  if (!s) return null;
  const parts = s.split(/[\\/]/);
  return parts[parts.length - 1] || null;
}

/** Unstop mixes absolute, root-relative and bare-relative URLs in one payload. */
export function absoluteUrl(url: string | null | undefined): string | null {
  const s = nonEmpty(url);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `${UNSTOP_ORIGIN}/${s.replace(/^\/+/, '')}`;
}

/**
 * `prizes[]` → one readable line. `overall_prizes` is null on real payloads, so
 * this is the only place prize information exists. Entries with no cash (e.g.
 * "Hiring Opportunity") keep their rank — dropping them would misrepresent the
 * prize pool.
 */
export function summarisePrizes(prizes: UnstopCompetition['prizes']): string | null {
  if (!Array.isArray(prizes) || prizes.length === 0) return null;
  const parts: string[] = [];
  for (const p of prizes) {
    const rank = nonEmpty(p?.rank);
    if (!rank) continue;
    const cash = typeof p?.cash === 'number' && p.cash > 0 ? p.cash : null;
    if (cash === null) {
      parts.push(rank);
      continue;
    }
    const code = nonEmpty(p?.currencyCode) ?? 'INR';
    const amount =
      code === 'INR'
        ? `₹${new Intl.NumberFormat('en-IN').format(cash)}`
        : `${new Intl.NumberFormat('en-US').format(cash)} ${code}`;
    parts.push(`${rank} ${amount}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

/**
 * The numeric id off an Unstop URL or slug. Returns null for a slug without
 * one — the API answers a slug-shaped request with a 404 body inside a 200, so
 * failing here is much better than importing an empty competition.
 */
export function parseUnstopId(input: string): string | null {
  const trimmed = (input ?? '').trim().replace(/[/?#].*$/, '').replace(/\/+$/, '');
  if (/^\d+$/.test(trimmed)) return trimmed;
  const m = (input ?? '').match(/-(\d+)(?:[/?#]|$)/);
  return m ? m[1] : null;
}

export function unstopApiUrl(numericId: string): string {
  return `${UNSTOP_ORIGIN}/api/public/competition/${numericId}`;
}

// ── The mapper ───────────────────────────────────────────────────────────────

/**
 * Maps a raw Unstop response. Throws only when there is no competition or no
 * title — anything else degrades to null, because a partially-mapped
 * competition is still useful and a thrown import is not.
 */
export function mapUnstopCompetition(raw: UnstopResponse): MappedCompetition {
  const c = raw?.data?.competition;
  if (!c) throw new Error('Unstop response has no data.competition — check the numeric id');

  const title = nonEmpty(c.title);
  if (!title) throw new Error('Unstop competition has no title — refusing to import');

  const sourceId = nonEmpty(String(c.id ?? ''));
  if (!sourceId) throw new Error('Unstop competition has no id — refusing to import');

  const regn = c.regnRequirements ?? {};

  const rounds: MappedRound[] = (Array.isArray(c.rounds) ? c.rounds : [])
    .filter((r) => !toBool(r?.is_hidden) && !toBool(r?.is_inactive))
    .map((r): MappedRound | null => {
      // `details` is an array and may be empty or missing entirely.
      const d: UnstopRoundDetail = (Array.isArray(r?.details) && r.details[0]) || {};
      // The round key must be stable across re-imports — reminder rules and
      // elimination records point at the row it identifies. Fall back to the
      // round's own id so a detail-less round still gets a durable key.
      const roundKey = nonEmpty(String(d.id ?? '')) ?? nonEmpty(String(r?.id ?? ''));
      if (!roundKey) return null;
      return {
        roundKey,
        roundOrder: typeof r?.round_order === 'number' ? r.round_order : 0,
        title: nonEmpty(d.title),
        descriptionHtml: nonEmpty(d.display_text),
        startsAt: nonEmpty(d.start_date),
        endsAt: nonEmpty(d.end_date),
        isEliminator: toBool(r?.eliminator_round),
        entityType: stripNamespace(r?.entity_type),
        publicUrl: absoluteUrl(d.public_url),
      };
    })
    .filter((r): r is MappedRound => r !== null)
    // Sorted by round_order for display only. Overlapping windows mean this is
    // not a timeline — see the note at the top of this file.
    .sort((a, b) => a.roundOrder - b.roundOrder);

  const skills = (Array.isArray(c.skills) ? c.skills : [])
    .map((s) => nonEmpty(s?.skill_name) ?? nonEmpty(s?.skill))
    .filter((s): s is string => s !== null);

  return {
    source: 'unstop',
    sourceId,
    competition: {
      title,
      organiser: nonEmpty(c.organisation?.name),
      logoUrl: absoluteUrl(c.logoUrl),
      bannerUrl: absoluteUrl(c.banner?.image_url ?? c.banner?.path),
      // `seo_url` is the absolute one; `public_url` is relative with no leading slash.
      publicUrl: absoluteUrl(c.seo_url ?? c.public_url),
      region: nonEmpty(c.region),
      registrationOpensAt: nonEmpty(regn.start_regn_dt),
      registrationDeadline: nonEmpty(regn.end_regn_dt),
      startsAt: nonEmpty(c.start_date),
      endsAt: nonEmpty(c.end_date),
      minTeamSize: typeof regn.min_team_size === 'number' ? regn.min_team_size : null,
      maxTeamSize: typeof regn.max_team_size === 'number' ? regn.max_team_size : null,
      prizeSummary: summarisePrizes(c.prizes),
      skills,
      registerCount: typeof c.registerCount === 'number' ? c.registerCount : null,
    },
    rounds,
  };
}
