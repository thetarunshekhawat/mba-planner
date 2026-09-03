'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/alerts/paging';
import { TOUR_SLOTS, TOUR_VERSION, slotIndexOf } from '@/lib/tour/steps';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  AlertTriangle, ArrowDownRight, CheckCircle2, Clock, Monitor, RotateCcw, Smartphone, Users,
} from 'lucide-react';
import { CHART_TOOLTIP_STYLE, CHART_TOOLTIP_CURSOR } from './chartTooltip';
import type { Profile } from '@/types';

/** Dwell below this means the copy was not read — the step is decoration. */
const SKIM_MS = 1500;
/** Dwell above this means the step is confusing, or carrying too much text. */
const SLOG_MS = 20_000;
/** Back-navigation above this share means the PREVIOUS step did not land. */
const BACK_IN_RATE_FLAG = 0.15;
/** A run whose heartbeat is older than this and still 'in_progress' is gone. */
const STALE_MS = 10 * 60 * 1000;
type RosterFilter = 'all' | 'completed' | 'incomplete';

/** Roster sort order: whoever engaged first, "never opened it" last. */
const STATUS_RANK: Record<string, number> = {
  completed: 0, in_progress: 1, abandoned: 2, aborted_error: 3, 'not started': 4,
};

/** Window for the adoption comparison. */
const ADOPTION_DAYS = 7;

interface TourRunRow {
  id: string;
  user_id: string;
  tour_version: number;
  trigger: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  last_heartbeat_at: string;
  total_ms: number | null;
  active_ms: number | null;
  steps_total: number;
  steps_seen: number;
  furthest_step_index: number;
  last_step_id: string | null;
  back_count: number;
  resume_count: number;
  missing_anchor_steps: string[] | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  viewport_w: number | null;
  viewport_h: number | null;
}

interface StepEventRow {
  id: string;
  run_id: string;
  user_id: string;
  step_id: string;
  step_index: number;
  entered_at: string;
  dwell_ms: number | null;
  active_dwell_ms: number | null;
  exit_direction: string | null;
  anchor_found: boolean;
}

interface AdoptionEventRow {
  user_id: string;
  event_type: string;
  occurred_at: string;
}

/** Actions the tour exists to cause. Everything else is noise for this question. */
const ADOPTION_ACTIONS: Array<{ type: string; label: string }> = [
  { type: 'course_selected', label: 'Picked a course' },
  { type: 'friend_added', label: 'Added a friend' },
  { type: 'alert_competition_tracked', label: 'Tracked a competition' },
  { type: 'chatbot_opened', label: 'Opened the assistant' },
  { type: 'export_triggered', label: 'Exported a schedule' },
];

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 100);
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))];
}

function secs(ms: number): string {
  if (ms <= 0) return '—';
  return ms < 60_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

/** Runs still marked in_progress but silent for a while are gone, not running. */
function isStale(r: TourRunRow): boolean {
  return r.status === 'in_progress'
    && Date.now() - new Date(r.last_heartbeat_at).getTime() > STALE_MS;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-white/5 p-4">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5 mb-3 leading-relaxed">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, color = 'text-orange-400' }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ className?: string }>; color?: string;
}) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-white/5 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export function TourAnalytics({ profiles }: { profiles: Profile[] }) {
  const supabase = createClient();
  const [runs, setRuns] = useState<TourRunRow[]>([]);
  const [stepEvents, setStepEvents] = useState<StepEventRow[]>([]);
  const [adoption, setAdoption] = useState<AdoptionEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [r, se, ad] = await Promise.all([
        fetchAllRows<TourRunRow>(() =>
          supabase.from('tour_runs').select('*').order('started_at', { ascending: false })),
        fetchAllRows<StepEventRow>(() =>
          supabase.from('tour_step_events').select('*').order('entered_at')),
        fetchAllRows<AdoptionEventRow>(() =>
          supabase.from('user_events')
            .select('user_id, event_type, occurred_at')
            .in('event_type', ADOPTION_ACTIONS.map(a => a.type))
            .order('occurred_at')),
      ]);
      if (cancelled) return;
      setRuns(r); setStepEvents(se); setAdoption(ad); setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameById = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach(p => m.set(p.id, p));
    return m;
  }, [profiles]);

  // ── Derived: per-user latest state ────────────────────────
  const perUser = useMemo(() => {
    const m = new Map<string, TourRunRow[]>();
    runs.forEach(r => {
      const list = m.get(r.user_id) ?? [];
      list.push(r);
      m.set(r.user_id, list);
    });
    return m;
  }, [runs]);

  const completedUserIds = useMemo(() => {
    const s = new Set<string>();
    runs.forEach(r => { if (r.status === 'completed') s.add(r.user_id); });
    return s;
  }, [runs]);

  // First runs only for the funnel: replays are a different animal (faster,
  // targeted at one feature) and mixing them flatters every drop-off number.
  const firstRuns = useMemo(
    () => runs.filter(r => r.trigger !== 'manual_replay'),
    [runs],
  );

  const kpis = useMemo(() => {
    const started = new Set(firstRuns.map(r => r.user_id)).size;
    const completed = completedUserIds.size;
    const inProgress = runs.filter(r => r.status === 'in_progress' && !isStale(r)).length;
    const completedRuns = firstRuns.filter(r => r.status === 'completed');
    return {
      cohort: profiles.length,
      started,
      completed,
      rate: pct(completed, started),
      inProgress,
      neverStarted: profiles.length - started,
      medianActive: median(completedRuns.map(r => r.active_ms ?? 0).filter(Boolean)),
      medianWall: median(completedRuns.map(r => r.total_ms ?? 0).filter(Boolean)),
    };
  }, [firstRuns, runs, completedUserIds, profiles.length]);

  // ── Funnel ────────────────────────────────────────────────
  // Reach is measured off furthest_step_index rather than counting step rows: a
  // student who backtracks writes several rows for the same step, and counting
  // those would show more people reaching step 4 than step 3.
  const funnel = useMemo(() => {
    const total = firstRuns.length;
    return TOUR_SLOTS.map((s) => {
      const i = s.index;
      const reached = firstRuns.filter(r => r.furthest_step_index >= i).length;
      const passed = firstRuns.filter(r => r.furthest_step_index > i).length;
      return {
        id: s.ids[0],
        label: s.title,
        index: i,
        reached,
        dropped: reached - passed,
        dropRate: pct(reached - passed, reached),
        share: pct(reached, total),
      };
    });
  }, [firstRuns]);

  const worstDrop = useMemo(
    () => funnel.filter(f => f.reached >= 5).sort((a, b) => b.dropRate - a.dropRate)[0] ?? null,
    [funnel],
  );

  // ── Per-step table ────────────────────────────────────────
  const stepStats = useMemo(() => {
    return TOUR_SLOTS.map((s) => {
      const i = s.index;
      const rows = stepEvents.filter(e => s.ids.includes(e.step_id));
      const dwells = rows.map(e => e.active_dwell_ms ?? e.dwell_ms ?? 0).filter(d => d > 0);
      const backIn = rows.filter(e => e.exit_direction === 'back').length;
      const missing = rows.filter(e => !e.anchor_found).length;
      const med = median(dwells);
      const flags: string[] = [];
      if (dwells.length >= 5 && med < SKIM_MS) flags.push('skimmed');
      if (dwells.length >= 5 && med > SLOG_MS) flags.push('slow');
      if (rows.length >= 5 && backIn / rows.length > BACK_IN_RATE_FLAG) flags.push('confusing');
      if (missing > 0) flags.push('anchor');
      return {
        id: s.ids[0], label: s.title, index: i,
        views: rows.length,
        median: med,
        p90: quantile(dwells, 0.9),
        skimRate: pct(dwells.filter(d => d < SKIM_MS).length, dwells.length),
        backInRate: pct(backIn, rows.length),
        missingRate: pct(missing, rows.length),
        flags,
      };
    });
  }, [stepEvents]);

  // ── Device split ──────────────────────────────────────────
  const devices = useMemo(() => {
    const kinds = ['desktop', 'tablet', 'mobile'];
    return kinds.map(kind => {
      const rs = firstRuns.filter(r => (r.device_type ?? 'desktop') === kind);
      const done = rs.filter(r => r.status === 'completed');
      const drops = rs.filter(r => r.status !== 'completed');
      const byStep = new Map<string, number>();
      drops.forEach(r => {
        const id = TOUR_SLOTS[r.furthest_step_index]?.ids[0] ?? r.last_step_id ?? '—';
        byStep.set(id, (byStep.get(id) ?? 0) + 1);
      });
      const topDrop = [...byStep.entries()].sort((a, b) => b[1] - a[1])[0];
      return {
        kind, runs: rs.length,
        rate: pct(done.length, rs.length),
        median: median(done.map(r => r.active_ms ?? 0).filter(Boolean)),
        topDrop: topDrop ? `${topDrop[0]} (${topDrop[1]})` : '—',
      };
    }).filter(d => d.runs > 0);
  }, [firstRuns]);

  // ── Version cohorts ───────────────────────────────────────
  const versions = useMemo(() => {
    const set = [...new Set(firstRuns.map(r => r.tour_version))].sort((a, b) => b - a);
    return set.map(v => {
      const rs = firstRuns.filter(r => r.tour_version === v);
      const done = rs.filter(r => r.status === 'completed');
      return {
        version: v, runs: rs.length,
        rate: pct(done.length, rs.length),
        median: median(done.map(r => r.active_ms ?? 0).filter(Boolean)),
      };
    });
  }, [firstRuns]);

  // ── Adoption lift ─────────────────────────────────────────
  // Observational, NOT a randomized test — see the caveat rendered below.
  const lift = useMemo(() => {
    const completedAt = new Map<string, number>();
    runs.forEach(r => {
      if (r.status !== 'completed' || !r.completed_at) return;
      const t = new Date(r.completed_at).getTime();
      const prev = completedAt.get(r.user_id);
      if (prev === undefined || t < prev) completedAt.set(r.user_id, t);
    });

    const window = ADOPTION_DAYS * 86_400_000;
    // "Not reached" = logged in at least once but has no completed tour. Comparing
    // against the whole cohort would mostly be comparing against people who never
    // opened the portal at all.
    const activeUsers = new Set(adoption.map(a => a.user_id));
    const notReached = [...activeUsers].filter(u => !completedAt.has(u));

    return ADOPTION_ACTIONS.map(({ type, label }) => {
      const did = new Set(adoption.filter(a => a.event_type === type).map(a => a.user_id));
      const didAfterTour = [...completedAt.entries()].filter(([u, t]) =>
        adoption.some(a => a.user_id === u && a.event_type === type
          && new Date(a.occurred_at).getTime() >= t
          && new Date(a.occurred_at).getTime() <= t + window),
      ).length;
      return {
        label,
        tourRate: pct(didAfterTour, completedAt.size),
        tourN: completedAt.size,
        controlRate: pct(notReached.filter(u => did.has(u)).length, notReached.length),
        controlN: notReached.length,
      };
    });
  }, [adoption, runs]);

  // ── Health ────────────────────────────────────────────────
  const health = useMemo(() => {
    const m = new Map<string, { step: string; device: string; count: number }>();
    runs.forEach(r => {
      (r.missing_anchor_steps ?? []).forEach(step => {
        const key = `${step}|${r.device_type ?? 'desktop'}`;
        const label = TOUR_SLOTS[slotIndexOf(step)]
          ? `${step} (step ${slotIndexOf(step) + 1})`
          : step;
        const e = m.get(key) ?? { step: label, device: r.device_type ?? 'desktop', count: 0 };
        e.count += 1;
        m.set(key, e);
      });
    });
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [runs]);

  // ── Roster ────────────────────────────────────────────────
  const roster = useMemo(() => {
    const rows = profiles.map(p => {
      const rs = (perUser.get(p.id) ?? []).sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
      );
      const done = rs.find(r => r.status === 'completed');
      const latest = rs[0];
      const status = done ? 'completed'
        : latest ? (isStale(latest) ? 'abandoned' : latest.status)
        : 'not started';
      return {
        id: p.id,
        name: p.name || p.email,
        email: p.email,
        status,
        version: done?.tour_version ?? latest?.tour_version ?? 0,
        runCount: rs.length,
        replays: rs.filter(r => r.trigger === 'manual_replay').length,
        furthest: latest ? (TOUR_SLOTS[latest.furthest_step_index]?.title ?? '—') : '—',
        activeMs: done?.active_ms ?? latest?.active_ms ?? 0,
        lastSeen: latest?.last_heartbeat_at ?? null,
      };
    });
    // Whoever actually engaged goes to the top. Left in profile order, the one
    // student who finished sits somewhere inside 140-odd "not started" rows and
    // the panel reads as if nobody has completed the tour at all.
    rows.sort((a, b) =>
      (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9)
      || b.activeMs - a.activeMs
      || a.name.localeCompare(b.name));

    if (rosterFilter === 'completed') return rows.filter(r => r.status === 'completed');
    if (rosterFilter === 'incomplete') return rows.filter(r => r.status !== 'completed');
    return rows;
  }, [profiles, perUser, rosterFilter]);

  const replayers = useMemo(
    () => runs.filter(r => r.trigger === 'manual_replay')
      .reduce((acc, r) => {
        const e = acc.get(r.user_id) ?? { count: 0, name: nameById.get(r.user_id)?.name ?? r.user_id };
        e.count += 1;
        acc.set(r.user_id, e);
        return acc;
      }, new Map<string, { count: number; name: string }>()),
    [runs, nameById],
  );

  if (loading) {
    return <div className="text-slate-400 text-sm animate-pulse p-6">Loading tour analytics…</div>;
  }

  if (runs.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-white/5 p-8 text-center">
        <p className="text-slate-300 text-sm font-medium">No tour runs recorded yet.</p>
        <p className="text-slate-500 text-xs mt-1">
          Runs appear here once students open the portal after the tour ships. Current tour version: v{TOUR_VERSION}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── 1. KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Kpi icon={Users} label="Cohort" value={String(kpis.cohort)}
             sub={`${kpis.neverStarted} never started`} color="text-slate-300" />
        <Kpi icon={CheckCircle2} label="Completed" value={`${kpis.rate}%`}
             sub={`${kpis.completed} of ${kpis.started} who started`} color="text-green-400" />
        <Kpi icon={Clock} label="Median time" value={secs(kpis.medianActive)}
             sub={`${secs(kpis.medianWall)} wall clock`} />
        <Kpi icon={RotateCcw} label="In progress" value={String(kpis.inProgress)}
             sub={`${replayers.size} students replayed`} color="text-sky-400" />
      </div>

      {/* ── 2. Funnel ── */}
      <Section
        title="Completion funnel"
        hint={`How many students reached each step, and what share of them stopped there. First runs only — replays are excluded, since a targeted replay would flatter every number here.${
          worstDrop && worstDrop.dropRate > 0 ? ` Biggest cliff: "${worstDrop.label}" loses ${worstDrop.dropRate}%.` : ''
        }`}
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={10} allowDecimals={false} />
              <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={10} width={110} />
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                cursor={CHART_TOOLTIP_CURSOR}
                formatter={(v) => [`${v} students`, 'Reached']}
              />
              <Bar dataKey="reached" radius={[0, 4, 4, 0]}>
                {funnel.map(f => (
                  <Cell key={f.id} fill={f.dropRate > 20 ? '#ef4444' : f.dropRate > 8 ? '#f59e0b' : '#f97316'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid gap-1">
          {funnel.filter(f => f.dropped > 0).map(f => (
            <div key={f.id} className="flex items-center gap-2 text-[11px]">
              <ArrowDownRight className="w-3 h-3 text-red-400 shrink-0" />
              <span className="text-slate-300">{f.label}</span>
              <span className="text-slate-500">— {f.dropped} stopped here ({f.dropRate}%)</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 3. Per-step table ── */}
      <Section
        title="Per-step behaviour"
        hint="Median dwell is measured while the tab was actually visible. Under 1.5s means the copy went unread; over 20s means it is confusing or too long; a high back-in rate means the PREVIOUS step did not land."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-slate-500 border-b border-white/5">
                <th className="text-left py-1.5 pr-3 font-medium">Step</th>
                <th className="text-right px-2 font-medium">Views</th>
                <th className="text-right px-2 font-medium">Median</th>
                <th className="text-right px-2 font-medium">p90</th>
                <th className="text-right px-2 font-medium">Skimmed</th>
                <th className="text-right px-2 font-medium">Back-in</th>
                <th className="text-right px-2 font-medium">No anchor</th>
                <th className="text-left pl-3 font-medium">Read</th>
              </tr>
            </thead>
            <tbody>
              {stepStats.map(s => (
                <tr key={s.id} className="border-b border-white/5 last:border-0">
                  <td className="py-1.5 pr-3 text-slate-300">{s.index + 1}. {s.label}</td>
                  <td className="text-right px-2 text-slate-400">{s.views}</td>
                  <td className="text-right px-2 text-slate-200 font-medium">{secs(s.median)}</td>
                  <td className="text-right px-2 text-slate-500">{secs(s.p90)}</td>
                  <td className="text-right px-2 text-slate-400">{s.skimRate}%</td>
                  <td className="text-right px-2 text-slate-400">{s.backInRate}%</td>
                  <td className={`text-right px-2 ${s.missingRate > 0 ? 'text-red-400 font-semibold' : 'text-slate-600'}`}>
                    {s.missingRate}%
                  </td>
                  <td className="pl-3">
                    {s.flags.length === 0 ? <span className="text-slate-600">ok</span> : (
                      <span className="flex flex-wrap gap-1">
                        {s.flags.includes('skimmed')   && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">copy ignored</span>}
                        {s.flags.includes('slow')      && <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300">too long</span>}
                        {s.flags.includes('confusing') && <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300">prior step unclear</span>}
                        {s.flags.includes('anchor')    && <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-300">broken anchor</span>}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 4 + 5. Time and device ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Section
          title="Time to complete"
          hint="Active time excludes periods where the tab was hidden. The gap between the two columns is how long students leave the tour sitting open."
        >
          <div className="grid grid-cols-3 gap-2">
            {([['p50', 0.5], ['p90', 0.9], ['max', 1]] as const).map(([label, q]) => {
              const done = firstRuns.filter(r => r.status === 'completed');
              const a = quantile(done.map(r => r.active_ms ?? 0).filter(Boolean), q);
              const w = quantile(done.map(r => r.total_ms ?? 0).filter(Boolean), q);
              return (
                <div key={label} className="bg-slate-700/40 rounded-lg p-2.5">
                  <div className="text-[9px] uppercase tracking-wide text-slate-500 mb-1">{label}</div>
                  <div className="text-sm font-bold text-orange-400">{secs(a)}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{secs(w)} wall</div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section
          title="By device"
          hint="Mobile is the risk surface: the sidebar becomes a collapsed drawer and tab labels are hidden, so it gets its own row rather than a filter."
        >
          <div className="space-y-2">
            {devices.map(d => (
              <div key={d.kind} className="flex items-center gap-2 text-[11px]">
                {d.kind === 'desktop'
                  ? <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  : <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                <span className="text-slate-300 capitalize w-16">{d.kind}</span>
                <span className="text-slate-500 w-14">{d.runs} runs</span>
                <span className={`font-semibold w-12 ${d.rate >= 80 ? 'text-green-400' : d.rate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                  {d.rate}%
                </span>
                <span className="text-slate-500 w-16">{secs(d.median)}</span>
                <span className="text-slate-600 truncate">drops at {d.topDrop}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── 6. Version cohorts ── */}
      <Section
        title="By tour version"
        hint={`Whether a newer cut of the tour made completion better or worse. Current version: v${TOUR_VERSION}.`}
      >
        <div className="space-y-1.5">
          {versions.map(v => (
            <div key={v.version} className="flex items-center gap-3 text-[11px]">
              <span className="text-slate-300 font-medium w-10">v{v.version}</span>
              <span className="text-slate-500 w-16">{v.runs} runs</span>
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${v.rate}%` }} />
              </div>
              <span className="text-slate-200 w-10 text-right">{v.rate}%</span>
              <span className="text-slate-500 w-16 text-right">{secs(v.median)}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 7. Adoption lift ── */}
      <Section
        title="Feature adoption after the tour"
        hint={`Share of students doing each action within ${ADOPTION_DAYS} days of finishing the tour, against students who have used the portal but not completed it. This is an observational comparison, not a randomized test: the two groups differ in more ways than the tour. Read it as direction, not proof.`}
      >
        <div className="space-y-2">
          {lift.map(l => (
            <div key={l.label} className="text-[11px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">{l.label}</span>
                <span className="text-slate-500">
                  {l.tourRate}% <span className="text-slate-600">of {l.tourN} completers</span>
                  {' · '}
                  {l.controlRate}% <span className="text-slate-600">of {l.controlN} not reached</span>
                </span>
              </div>
              <div className="flex gap-1">
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${l.tourRate}%` }} />
                </div>
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-500 rounded-full" style={{ width: `${l.controlRate}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 8. Health ── */}
      <Section
        title="Health — steps that could not find their target"
        hint="A step with nothing to point at is auto-skipped so nobody gets stuck. Entries appearing here mean a refactor renamed a data-tour attribute, or the element does not render on that viewport."
      >
        {health.length === 0 ? (
          <p className="text-[11px] text-green-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Every step found its anchor on every run.
          </p>
        ) : (
          <div className="space-y-1">
            {health.map(h => (
              <div key={`${h.step}-${h.device}`} className="flex items-center gap-2 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-slate-200 font-medium">{h.step}</span>
                <span className="text-slate-500">on {h.device}</span>
                <span className="text-red-400 ml-auto font-semibold">{h.count} runs</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── 9. Roster ── */}
      <Section
        title="Who has seen it"
        hint="The tour is mandatory and runs on any visit to the portal, not just a fresh login, so anyone not completed either has not opened the portal since it shipped or dropped out mid-way. Completed students sort to the top."
      >
        <div className="flex gap-1.5 mb-3">
          {([
            ['all', `All (${profiles.length})`],
            ['completed', `Completed (${completedUserIds.size})`],
            ['incomplete', `Not completed (${profiles.length - completedUserIds.size})`],
          ] as const).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setRosterFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                rosterFilter === f ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="text-slate-500 border-b border-white/5">
                <th className="text-left py-1.5 pr-3 font-medium">Student</th>
                <th className="text-left px-2 font-medium">Status</th>
                <th className="text-right px-2 font-medium">v</th>
                <th className="text-right px-2 font-medium">Runs</th>
                <th className="text-left px-2 font-medium">Furthest step</th>
                <th className="text-right pl-2 font-medium">Active time</th>
              </tr>
            </thead>
            <tbody>
              {roster.map(r => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="py-1.5 pr-3 text-slate-300 truncate max-w-[180px]" title={r.email}>{r.name}</td>
                  <td className="px-2">
                    <span className={
                      r.status === 'completed' ? 'text-green-400'
                      : r.status === 'not started' ? 'text-slate-600'
                      : r.status === 'aborted_error' ? 'text-red-400' : 'text-amber-400'
                    }>
                      {r.status === 'aborted_error' ? 'broke' : r.status}
                    </span>
                  </td>
                  <td className="text-right px-2 text-slate-500">{r.version || '—'}</td>
                  <td className="text-right px-2 text-slate-400">
                    {r.runCount || '—'}{r.replays > 0 && <span className="text-sky-400"> (+{r.replays})</span>}
                  </td>
                  <td className="px-2 text-slate-500 truncate max-w-[150px]">{r.furthest}</td>
                  <td className="text-right pl-2 text-slate-400">{r.activeMs ? secs(r.activeMs) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 10. Replays ── */}
      {replayers.size > 0 && (
        <Section
          title="Replays"
          hint="A student coming back to the tour is telling you the real UI for that feature is not self-explanatory."
        >
          <div className="space-y-1">
            {[...replayers.values()].sort((a, b) => b.count - a.count).map(r => (
              <div key={r.name} className="flex items-center gap-2 text-[11px]">
                <RotateCcw className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="text-slate-300">{r.name}</span>
                <span className="text-slate-500 ml-auto">{r.count}x</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
