// Deterministic, zero-LLM nudge selector backed by the combined Term-4 insight engine
// (data/term4Insights.json — built by "Term4 Combined Engine/merge_engines.py", which merges
// both hand-built engines, normalizes course codes, and dedupes). Server-only: the catalogue
// JSON is bundled into the route's server function, never shipped to the client.
//
// Given a student's selected courses it: computes portfolio variables (mirroring the reference
// selector.py exactly), evaluates each insight's compiled condition AST, then orders the eligible
// set by a tier-weighted, diversity-aware greedy schedule so high-priority insights lead while
// lower-priority ones still surface and same-course / same-topic insights are spread apart.

import type { Course, SpecId } from '@/types';
import type { Nudge } from './nudgeFallback';
import { completedCourseCodes } from '@/lib/terms';
import engine from '@/data/term4Insights.json';

// --- Condition AST (produced offline; we only evaluate it here) ---------------
type Ast =
  | { op: 'true' }
  | { op: 'selected'; code: string }
  | { op: 'spec'; spec: string }
  | { op: 'cmp'; var: string; cmp: Cmp; val: number }
  | { op: 'count'; codes: string[]; cmp: Cmp; val: number }
  | { op: 'and'; args: Ast[] }
  | { op: 'or'; args: Ast[] }
  | { op: 'not'; arg: Ast };
type Cmp = '>=' | '<=' | '=' | '>' | '<';

interface InsightRecord {
  id: string;
  source: string;
  scope: string;
  courseCodes: string[];
  primaryCourse: string | null;
  type: 'fact' | 'question';
  text: string;
  variants: string[];
  seedQuestion: string;
  tier: Tier;
  score: number;
  tags: string[];
  facet: string;
  cond: Ast;
  cond_src: string;
}
type Tier = 'Critical' | 'High' | 'Medium' | 'Low' | 'Flavor';

interface CourseMeta {
  name: string;
  specs: string[];
  group_pct: number;
  peer_eval_pct: number;
  quant_heavy: boolean;
  exam: boolean;
  strict_attendance: boolean;
  ai_friendly: boolean;
  group_heavy: boolean;
  blocks: string[];
}

const INSIGHTS = engine.insights as unknown as InsightRecord[];
const COURSE_META = engine.course_meta as unknown as Record<string, CourseMeta>;

// --- Portfolio variables (1:1 with Term4 Insight Engine/selector.py::portfolio_vars) ----------
function portfolioVars(engineCodes: string[]): Record<string, number> {
  const S = engineCodes.filter((c) => COURSE_META[c]); // only the 12 catalogued electives
  const n = S.length;
  const gpcts = S.map((c) => COURSE_META[c].group_pct);

  // busiest two-week block: max courses the selection puts in any single block
  const blockLoad = new Map<string, number>();
  for (const c of S) for (const b of COURSE_META[c].blocks) blockLoad.set(b, (blockLoad.get(b) ?? 0) + 1);

  return {
    selected_count: n,
    group_work_pct: n ? gpcts.reduce((a, b) => a + b, 0) / n : 0,
    peer_eval_count: S.filter((c) => COURSE_META[c].peer_eval_pct > 0).length,
    quant_heavy_count: S.filter((c) => COURSE_META[c].quant_heavy).length,
    exam_count: S.filter((c) => COURSE_META[c].exam).length,
    strict_attendance_count: S.filter((c) => COURSE_META[c].strict_attendance).length,
    group_heavy_count: S.filter((c) => COURSE_META[c].group_heavy).length,
    ai_friendly_count: S.filter((c) => COURSE_META[c].ai_friendly).length,
    max_block_load: blockLoad.size ? Math.max(...blockLoad.values()) : 0,
  };
}

function cmp(a: number, op: Cmp, b: number): boolean {
  switch (op) {
    case '>=': return a >= b;
    case '<=': return a <= b;
    case '=':  return a === b;
    case '>':  return a > b;
    case '<':  return a < b;
  }
}

interface EvalCtx { selected: Set<string>; specs: Set<SpecId>; vars: Record<string, number> }

function evalAst(node: Ast, ctx: EvalCtx): boolean {
  switch (node.op) {
    case 'true':     return true;
    case 'selected': return ctx.selected.has(node.code);
    case 'spec':     return ctx.specs.has(node.spec as SpecId);
    case 'cmp':      return cmp(ctx.vars[node.var] ?? 0, node.cmp, node.val);
    case 'count':    return cmp(node.codes.filter((c) => ctx.selected.has(c)).length, node.cmp, node.val);
    case 'and':      return node.args.every((a) => evalAst(a, ctx));
    case 'or':       return node.args.some((a) => evalAst(a, ctx));
    case 'not':      return !evalAst(node.arg, ctx);
  }
}

// --- Staleness: drop insights about courses the student has already finished -------------------
// Prep advice ("front-load this one", "attendance is strict", "40% is group work") is noise once
// the last class is over, and "you skipped X" is moot for a course that can no longer be taken.
// The one exception is forward-looking insights about a course the student actually took ("liked
// FSA? here's the Term 5 sequel") — those only get MORE relevant after the course ends, so they
// survive as long as every course they name is one of the student's own picks.
function isStale(rec: InsightRecord, completed: Set<string>, selected: Set<string>): boolean {
  if (!rec.courseCodes.some((c) => completed.has(c))) return false;
  return !(rec.facet === 'forward' && rec.courseCodes.every((c) => selected.has(c)));
}

// --- Ordering: tier-weighted + diversity-aware greedy schedule ---------------------------------
const TIER_WEIGHT: Record<Tier, number> = { Critical: 5, High: 4, Medium: 3, Low: 2, Flavor: 1 };
const COURSE_GAP = 3;     // try not to repeat a course within this many slots
const FACET_GAP = 8;      // and keep same course+topic even further apart
const COURSE_PENALTY = 8;
const FACET_PENALTY = 12;

function orderForDisplay(eligible: InsightRecord[]): InsightRecord[] {
  const remaining = [...eligible];
  const out: InsightRecord[] = [];
  const lastCourse = new Map<string, number>();
  const lastFacet = new Map<string, number>();

  for (let idx = 0; remaining.length; idx++) {
    let bestI = 0;
    let best = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const r = remaining[i];
      let s = TIER_WEIGHT[r.tier] * 10 + r.score * 0.1;
      if (r.primaryCourse && lastCourse.has(r.primaryCourse)) {
        const d = idx - lastCourse.get(r.primaryCourse)!;
        if (d < COURSE_GAP) s -= (COURSE_GAP - d) * COURSE_PENALTY;
      }
      const cf = `${r.primaryCourse ?? ''}|${r.facet}`;
      if (lastFacet.has(cf)) {
        const d = idx - lastFacet.get(cf)!;
        if (d < FACET_GAP) s -= (FACET_GAP - d) * FACET_PENALTY;
      }
      if (s > best) { best = s; bestI = i; }
    }
    const chosen = remaining.splice(bestI, 1)[0];
    out.push(chosen);
    if (chosen.primaryCourse) lastCourse.set(chosen.primaryCourse, idx);
    lastFacet.set(`${chosen.primaryCourse ?? ''}|${chosen.facet}`, idx);
  }
  return out;
}

// Pick which voice (primary text vs a dry/quirky variant) to show. Rotates by day so a revisited
// insight can reappear in a fresh voice once the client's seen-set cycles.
function pickVoice(rec: InsightRecord, daySeed: number): string {
  if (rec.variants.length === 0) return rec.text;
  let h = daySeed;
  for (let i = 0; i < rec.id.length; i++) h = (h * 31 + rec.id.charCodeAt(i)) >>> 0;
  const choice = h % (rec.variants.length + 1);
  return choice === 0 ? rec.text : rec.variants[choice - 1];
}

/**
 * Build the personalized, deterministic nudge pool for a student's selected courses.
 * Pure and model-free — safe to call on every request with no API cost.
 */
export function selectInsightNudges(selectedCourses: Course[]): Nudge[] {
  const selected = new Set<string>();
  const specs = new Set<SpecId>();
  for (const c of selectedCourses) {
    if (c.code) selected.add(c.code);
    for (const s of c.specs) specs.add(s);
  }
  if (selected.size === 0) return [];

  // Conditions still see the full selection (portfolio facts like exam_count describe the whole
  // term); only the resulting insights are filtered for staleness.
  const ctx: EvalCtx = { selected, specs, vars: portfolioVars([...selected]) };
  const completed = completedCourseCodes();
  const eligible = INSIGHTS.filter((r) => evalAst(r.cond, ctx) && !isStale(r, completed, selected));
  const ordered = orderForDisplay(eligible);

  const daySeed = Math.floor(Date.now() / 86_400_000);
  return ordered.map((r) => ({
    type: r.type,
    text: pickVoice(r, daySeed),
    courseCode: r.primaryCourse,
    seedQuestion: r.seedQuestion,
    // Forward-looking insights point at later terms, so they outlive their own course; the
    // client gate needs to know that before it suppresses anything tied to a finished course.
    ...(r.facet === 'forward' ? { staysAfterEnd: true } : {}),
  }));
}
