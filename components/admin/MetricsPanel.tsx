'use client';

// The "Metrics" view under Insights: the numbers you'd be asked for in a diligence
// conversation — reach, engagement, retention, concentration, funnel and quality — plus
// full distribution summaries (mean / median / IQR / p90) rather than averages alone,
// because every one of these distributions is skewed by a handful of power users.
//
// Everything is computed client-side from data the dashboard has already fetched. Course-
// scoped figures honour the dashboard's term filter; session and login figures are term-less
// and deliberately do not, so the funnel stays intact when a term is selected.

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Profile } from '@/types';

export interface Dist {
  n: number; mean: number; median: number; q1: number; q3: number;
  iqr: number; p90: number; min: number; max: number;
}

interface SessionRow {
  user_id: string;
  session_start: string;
  session_end: string | null;
  duration_seconds: number | null;
}

interface EventRow {
  user_id: string;
  event_type: string;
  occurred_at: string;
}

interface LandingRow {
  user_id: string | null;
  landed_at: string;
  first_ring_interaction_at: string | null;
  login_attempted: boolean;
  login_succeeded: boolean;
}

export interface MetricsPanelProps {
  profiles: Profile[];
  whitelistCount: number;
  sessions: SessionRow[];
  events: EventRow[];
  landingSessions: LandingRow[];
  chatbotMessageCount: number;
  /** Selections already narrowed to the dashboard's term filter. */
  filteredSelections: { user_id: string; course_id: number }[];
  termFilter: number | 'all';
  describe: (values: number[]) => Dist;
}

const DAY_MS = 86_400_000;

function fmt(n: number, dp = 1): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString();
  return n.toFixed(dp).replace(/\.0$/, '');
}

function pct(num: number, den: number): string {
  if (!den) return '—';
  return `${((num / den) * 100).toFixed(1)}%`;
}

function mmss(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m}m ${s}s` : `${s}s`;
}

// ── Presentational bits ──────────────────────────────────────────────────────

function Stat({ label, value, sub, color = 'text-blue-400', hint }: {
  label: string; value: string | number; sub?: string; color?: string; hint?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-white/5" title={hint}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({ title, blurb, children }: {
  title: string; blurb?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-200 mb-1">{title}</h3>
      {blurb && <p className="text-[11px] text-slate-500 mb-3 max-w-3xl">{blurb}</p>}
      {children}
    </div>
  );
}

/** A distribution rendered as a compact box-plot-ish row: min ─ Q1 ▮ median ▮ Q3 ─ max. */
function DistRow({ label, d, unit }: { label: string; d: Dist; unit: (v: number) => string }) {
  const span = d.max - d.min || 1;
  const left = ((d.q1 - d.min) / span) * 100;
  const width = Math.max(((d.q3 - d.q1) / span) * 100, 1.5);
  const med = ((d.median - d.min) / span) * 100;

  return (
    <div className="py-2.5 border-b border-white/5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-xs font-medium text-slate-200">{label}</span>
        <span className="text-[10px] text-slate-500">n = {d.n}</span>
      </div>
      <div className="relative h-2 rounded bg-slate-700/60 mb-1.5">
        <div className="absolute h-2 rounded bg-blue-500/40" style={{ left: `${left}%`, width: `${width}%` }} />
        <div className="absolute h-2 w-[2px] bg-blue-300" style={{ left: `${med}%` }} />
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-x-3 gap-y-1 text-[10px]">
        {([
          ['min', d.min], ['Q1', d.q1], ['median', d.median], ['mean', d.mean],
          ['Q3', d.q3], ['IQR', d.iqr], ['p90', d.p90],
        ] as [string, number][]).map(([k, v]) => (
          <div key={k}>
            <span className="text-slate-500">{k} </span>
            <span className={k === 'median' || k === 'IQR' ? 'text-slate-100 font-semibold' : 'text-slate-300'}>
              {unit(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelBar({ label, value, base, note }: {
  label: string; value: number; base: number; note?: string;
}) {
  const w = base ? Math.max((value / base) * 100, 0.5) : 0;
  return (
    <div className="mb-2.5">
      <div className="flex items-baseline justify-between text-xs mb-1">
        <span className="text-slate-200">{label}</span>
        <span className="text-slate-400">
          {value.toLocaleString()} <span className="text-slate-600">·</span> {pct(value, base)}
        </span>
      </div>
      <div className="h-2 rounded bg-slate-700/60">
        <div className="h-2 rounded bg-emerald-500/60" style={{ width: `${w}%` }} />
      </div>
      {note && <div className="text-[10px] text-slate-500 mt-0.5">{note}</div>}
    </div>
  );
}

// ── The panel ────────────────────────────────────────────────────────────────

export function MetricsPanel({
  profiles, whitelistCount, sessions, events, landingSessions,
  chatbotMessageCount, filteredSelections, termFilter, describe,
}: MetricsPanelProps) {
  const [showDefs, setShowDefs] = useState(false);

  const now = Date.now();
  const registered = profiles.length;

  // ── Reach ──────────────────────────────────────────────────────────────────
  const activityAt = new Map<string, number>();
  const bump = (uid: string, iso: string) => {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return;
    if (t > (activityAt.get(uid) ?? 0)) activityAt.set(uid, t);
  };
  for (const s of sessions) bump(s.user_id, s.session_start);
  for (const e of events) bump(e.user_id, e.occurred_at);

  const activeWithin = (days: number) =>
    [...activityAt.values()].filter(t => now - t <= days * DAY_MS).length;

  const dau = activeWithin(1);
  const wau = activeWithin(7);
  const mau = activeWithin(30);
  const stickiness = mau ? (dau / mau) * 100 : 0;

  // ── Engagement distributions ───────────────────────────────────────────────
  const sessionsPerUser = new Map<string, number>();
  for (const s of sessions) sessionsPerUser.set(s.user_id, (sessionsPerUser.get(s.user_id) ?? 0) + 1);

  const eventsPerUser = new Map<string, number>();
  for (const e of events) eventsPerUser.set(e.user_id, (eventsPerUser.get(e.user_id) ?? 0) + 1);

  const selectionsPerUser = new Map<string, number>();
  for (const s of filteredSelections) {
    selectionsPerUser.set(s.user_id, (selectionsPerUser.get(s.user_id) ?? 0) + 1);
  }

  // Durations: only closed sessions with a sane length (drop nulls and >6h outliers, which
  // are tabs left open rather than real sessions).
  const durations = sessions
    .map(s => s.duration_seconds)
    .filter((d): d is number => typeof d === 'number' && d > 0 && d <= 6 * 3600);

  const dSelections = describe([...selectionsPerUser.values()]);
  const dDuration = describe(durations);
  const dSessions = describe([...sessionsPerUser.values()]);
  const dEvents = describe([...eventsPerUser.values()]);

  // ── Retention ──────────────────────────────────────────────────────────────
  // Cohort a user by the week of their first observed session, then check whether they were
  // seen again in week +1, +2 and +4. Only cohorts old enough to have had the chance count.
  const firstSeen = new Map<string, number>();
  const seenTimes = new Map<string, number[]>();
  for (const s of sessions) {
    const t = new Date(s.session_start).getTime();
    if (!Number.isFinite(t)) continue;
    if (t < (firstSeen.get(s.user_id) ?? Infinity)) firstSeen.set(s.user_id, t);
    if (!seenTimes.has(s.user_id)) seenTimes.set(s.user_id, []);
    seenTimes.get(s.user_id)!.push(t);
  }

  function retention(weekOffset: number): { rate: number; eligible: number } {
    let eligible = 0;
    let retained = 0;
    for (const [uid, first] of firstSeen) {
      const windowStart = first + weekOffset * 7 * DAY_MS;
      const windowEnd = windowStart + 7 * DAY_MS;
      if (windowEnd > now) continue; // cohort hasn't had the chance yet
      eligible++;
      if ((seenTimes.get(uid) ?? []).some(t => t >= windowStart && t < windowEnd)) retained++;
    }
    return { rate: eligible ? (retained / eligible) * 100 : 0, eligible };
  }

  const w1 = retention(1);
  const w2 = retention(2);
  const w4 = retention(4);

  const repeatVisitors = [...sessionsPerUser.values()].filter(n => n >= 2).length;
  const lapsed = [...activityAt.values()].filter(t => now - t > 7 * DAY_MS && now - t <= 60 * DAY_MS).length;

  // ── Concentration (Pareto) ─────────────────────────────────────────────────
  const eventCounts = [...eventsPerUser.values()].sort((a, b) => b - a);
  const totalEvents = eventCounts.reduce((a, b) => a + b, 0);
  const topDecileCount = Math.max(1, Math.ceil(eventCounts.length * 0.1));
  const topDecileShare = totalEvents
    ? (eventCounts.slice(0, topDecileCount).reduce((a, b) => a + b, 0) / totalEvents) * 100
    : 0;
  const powerUsers = dEvents.p90 ? [...eventsPerUser.values()].filter(n => n >= dEvents.p90).length : 0;

  // ── Funnel ─────────────────────────────────────────────────────────────────
  const landed = landingSessions.length;
  const ringTouched = landingSessions.filter(l => l.first_ring_interaction_at).length;
  const attempted = landingSessions.filter(l => l.login_attempted).length;
  const succeeded = landingSessions.filter(l => l.login_succeeded).length;
  const planners = selectionsPerUser.size;
  const exporters = new Set(events.filter(e => e.event_type === 'export_triggered').map(e => e.user_id)).size;

  // Time-to-value: first login → first course_selected event, per user.
  const firstSelect = new Map<string, number>();
  for (const e of events) {
    if (e.event_type !== 'course_selected') continue;
    const t = new Date(e.occurred_at).getTime();
    if (t < (firstSelect.get(e.user_id) ?? Infinity)) firstSelect.set(e.user_id, t);
  }
  const ttv: number[] = [];
  for (const [uid, sel] of firstSelect) {
    const first = firstSeen.get(uid);
    if (first && sel >= first) ttv.push((sel - first) / 60000);
  }
  const dTtv = describe(ttv);

  // ── Feature attach rates ───────────────────────────────────────────────────
  const activeUsers = new Set([...sessionsPerUser.keys(), ...eventsPerUser.keys()]).size || 1;
  const usersWith = (predicate: (t: string) => boolean) =>
    new Set(events.filter(e => predicate(e.event_type)).map(e => e.user_id)).size;

  const features = ([
    ['Friends', usersWith(t => t.startsWith('friend_'))],
    ['AI Chatbot', usersWith(t => t.startsWith('chatbot_'))],
    ['Export', usersWith(t => t === 'export_triggered' || t === 'export_dialog_opened')],
    ['Search', usersWith(t => t.startsWith('search_'))],
    ['Calendar', usersWith(t => t === 'calendar_accessed' || t === 'calendar_panel_opened')],
    ['Mobile drawer', usersWith(t => t.startsWith('mobile_drawer'))],
    ['Term 1 panel', usersWith(t => t === 'term1_panel_toggled')],
  ] as [string, number][]).sort((a, b) => b[1] - a[1]);

  const nudgesShown = events.filter(e => e.event_type === 'chatbot_nudge_shown').length;
  const nudgesClicked = events.filter(e => e.event_type === 'chatbot_nudge_clicked').length;

  // ── Quality ────────────────────────────────────────────────────────────────
  const jsErrors = events.filter(e => e.event_type === 'js_error').length;
  const rageClicks = events.filter(e => e.event_type === 'rage_click').length;
  const sessionCount = sessions.length || 1;

  const scopeNote = termFilter === 'all'
    ? 'All terms'
    : `Term ${termFilter} only — course figures are filtered; session, login and funnel figures are term-less and unaffected.`;

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">📈 Metrics</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-3xl">{scopeNote}</p>
        </div>
        <button
          onClick={() => setShowDefs(v => !v)}
          className="text-[11px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
        >
          {showDefs ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          How these are computed
        </button>
      </div>

      {showDefs && (
        <div className="bg-slate-900 border border-white/10 rounded-xl p-4 text-[11px] text-slate-400 space-y-1.5">
          <p><strong className="text-slate-200">Activation</strong> = registered profiles ÷ whitelisted cohort emails.</p>
          <p><strong className="text-slate-200">DAU / WAU / MAU</strong> = distinct users with a session or event in the last 1 / 7 / 30 days. <strong className="text-slate-200">Stickiness</strong> = DAU ÷ MAU.</p>
          <p><strong className="text-slate-200">Retention Wn</strong> = of users whose first session was at least n+1 weeks ago, the share seen again during week n. Cohorts too young to qualify are excluded, so the denominator differs per column.</p>
          <p><strong className="text-slate-200">Top-decile share</strong> = share of all tracked events generated by the busiest 10% of users. High values mean usage rests on a few people.</p>
          <p><strong className="text-slate-200">Time to value</strong> = minutes from a user&apos;s first session to their first <code className="text-slate-300">course_selected</code> event.</p>
          <p><strong className="text-slate-200">Session length</strong> excludes open-ended sessions and anything over 6 hours (abandoned tabs, not real use).</p>
          <p><strong className="text-slate-200">Attach rate</strong> = distinct users who fired at least one event for a feature ÷ users with any recorded activity.</p>
        </div>
      )}

      {/* ── Reach ── */}
      <Section
        title="Reach"
        blurb="How much of the invited cohort has actually shown up, and how many are here on a given day."
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Cohort invited" value={whitelistCount} color="text-slate-300" />
          <Stat label="Registered" value={registered} color="text-blue-400"
            sub={`${pct(registered, whitelistCount)} activation`} />
          <Stat label="MAU (30d)" value={mau} color="text-green-400"
            sub={`${pct(mau, registered)} of registered`} />
          <Stat label="Stickiness (DAU/MAU)" value={`${fmt(stickiness)}%`} color="text-purple-400"
            sub={`DAU ${dau} · WAU ${wau}`} />
        </div>
      </Section>

      {/* ── Distributions ── */}
      <Section
        title="Distributions"
        blurb="Averages hide the shape of these. The bar shows the interquartile range with the median marked — the gap between mean and median is how skewed each one is."
      >
        <div className="bg-slate-800 rounded-xl px-4 py-1 border border-white/5">
          <DistRow label="Courses selected per planning user" d={dSelections} unit={v => fmt(v)} />
          <DistRow label="Session length" d={dDuration} unit={mmss} />
          <DistRow label="Sessions per user" d={dSessions} unit={v => fmt(v)} />
          <DistRow label="Events per user" d={dEvents} unit={v => fmt(v, 0)} />
          {dTtv.n > 0 && (
            <DistRow label="Time to first course selected" d={dTtv} unit={v => `${fmt(v)}m`} />
          )}
        </div>
      </Section>

      {/* ── Retention ── */}
      <Section
        title="Retention"
        blurb="Whether people come back. Weekly cohorts by first session; only cohorts old enough to have had the opportunity are counted."
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Week 1 retention" value={`${fmt(w1.rate)}%`} color="text-emerald-400"
            sub={`n = ${w1.eligible} eligible`} />
          <Stat label="Week 2 retention" value={`${fmt(w2.rate)}%`} color="text-emerald-400"
            sub={`n = ${w2.eligible} eligible`} />
          <Stat label="Week 4 retention" value={`${fmt(w4.rate)}%`} color="text-emerald-400"
            sub={`n = ${w4.eligible} eligible`} />
          <Stat label="Repeat visitors" value={repeatVisitors} color="text-teal-400"
            sub={`${pct(repeatVisitors, sessionsPerUser.size)} had ≥2 sessions`} />
        </div>
        <div className="mt-3">
          <Stat label="Lapsed (silent 7–60 days)" value={lapsed} color="text-amber-400"
            sub="Were active once, haven't been back in over a week" />
        </div>
      </Section>

      {/* ── Concentration ── */}
      <Section
        title="Concentration"
        blurb="Is usage broad, or carried by a handful of people? The first question anyone asks about an engagement number."
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Top-decile share of activity" value={`${fmt(topDecileShare)}%`} color="text-orange-400"
            sub={`Busiest ${topDecileCount} of ${eventCounts.length} users`} />
          <Stat label="Power users (≥ p90 events)" value={powerUsers} color="text-orange-400"
            sub={`p90 = ${fmt(dEvents.p90, 0)} events`} />
          <Stat label="Total events tracked" value={events.length.toLocaleString()} color="text-slate-300" />
          <Stat label="Events per session" value={fmt(events.length / sessionCount)} color="text-slate-300" />
        </div>
      </Section>

      {/* ── Funnel ── */}
      <Section
        title="Acquisition funnel"
        blurb="Landing page through to a student who has actually planned something. Percentages are against the top of the funnel."
      >
        <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
          <FunnelBar label="Landed on the login page" value={landed} base={landed} />
          <FunnelBar label="Interacted with the professor ring" value={ringTouched} base={landed} />
          <FunnelBar label="Attempted a login" value={attempted} base={landed} />
          <FunnelBar label="Logged in successfully" value={succeeded} base={landed}
            note={landed ? `${pct(succeeded, attempted)} of attempts succeeded` : undefined} />
          <FunnelBar label="Selected at least one course" value={planners} base={landed}
            note={`${pct(planners, registered)} of registered users have a plan`} />
          <FunnelBar label="Exported a schedule" value={exporters} base={landed}
            note={`${pct(exporters, planners)} of planners exported`} />
          {dTtv.n > 0 && (
            <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-white/5">
              Median time to value: <strong className="text-slate-100">{fmt(dTtv.median)} min</strong> from
              first session to first course selected (IQR {fmt(dTtv.q1)}–{fmt(dTtv.q3)} min, n = {dTtv.n}).
            </p>
          )}
        </div>
      </Section>

      {/* ── Feature attach ── */}
      <Section
        title="Feature adoption"
        blurb="Share of active users who have touched each feature at least once."
      >
        <div className="bg-slate-800 rounded-xl p-4 border border-white/5 space-y-2">
          {features.map(([name, count]) => (
            <div key={name}>
              <div className="flex items-baseline justify-between text-xs mb-1">
                <span className="text-slate-200">{name}</span>
                <span className="text-slate-400">{count} <span className="text-slate-600">·</span> {pct(count, activeUsers)}</span>
              </div>
              <div className="h-1.5 rounded bg-slate-700/60">
                <div className="h-1.5 rounded bg-indigo-500/60" style={{ width: `${(count / activeUsers) * 100}%` }} />
              </div>
            </div>
          ))}
          <div className="pt-3 mt-1 border-t border-white/5 grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <span className="text-slate-500">Chatbot messages / active user </span>
              <span className="text-slate-100 font-semibold">{fmt(chatbotMessageCount / activeUsers)}</span>
            </div>
            <div>
              <span className="text-slate-500">Nudge click-through </span>
              <span className="text-slate-100 font-semibold">{pct(nudgesClicked, nudgesShown)}</span>
              <span className="text-slate-600"> ({nudgesClicked}/{nudgesShown})</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Quality ── */}
      <Section
        title="Quality"
        blurb="Friction signals. Both are tracked automatically by the client — a rising rate here usually precedes a drop in retention."
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="JS errors" value={jsErrors} color={jsErrors ? 'text-red-400' : 'text-green-400'}
            sub={`${fmt(jsErrors / sessionCount, 2)} per session`} />
          <Stat label="Rage clicks" value={rageClicks} color={rageClicks ? 'text-amber-400' : 'text-green-400'}
            sub={`${fmt(rageClicks / sessionCount, 2)} per session`} />
          <Stat label="Sessions recorded" value={sessions.length.toLocaleString()} color="text-slate-300" />
          <Stat label="Selections (filtered)" value={filteredSelections.length.toLocaleString()} color="text-slate-300"
            sub={termFilter === 'all' ? 'All terms' : `Term ${termFilter}`} />
        </div>
      </Section>
    </div>
  );
}
