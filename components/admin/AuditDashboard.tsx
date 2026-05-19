'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminEvent {
  id: string;
  actor_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

interface SessionTimeline {
  sessionId: string;
  events: AdminEvent[];
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  membersViewed: number;
  isLegacy: boolean;
}

interface AdminRecord {
  profile: Profile;
  sessions: SessionTimeline[];
  totalSessions: number;
  totalSeconds: number;
  totalMembersViewed: number;
  lastActive: string | null;
}

// For behavioral metrics (kept at bottom)
interface Visit {
  memberId: string;
  memberName: string;
  openedAt: string;
  dwellSeconds: number | null;
}

interface AdminSummary {
  profile: Profile;
  totalViews: number;
  uniqueMembers: number;
  avgDwellSeconds: number | null;
  lastActive: string | null;
  visits: Visit[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SUPER_ADMIN_EMAIL = 'tarun.shekhawat2027@bitsom.edu.in';

const ALL_ADMIN_EVENT_TYPES = [
  'admin_session_start',
  'admin_session_end',
  'admin_tab_changed',
  'admin_member_viewed',
  'admin_member_left',
  'admin_member_subtab_changed',
];

const TAB_LABELS: Record<string, string> = {
  overview: 'Cohort Overview',
  member: 'Member Detail',
  activity: 'Activity',
  insights: 'Insights',
  'in-depth': 'In-Depth',
};

const SUBTAB_LABELS: Record<string, string> = {
  courses: 'Courses',
  activity: 'Activity',
  insights: 'Insights',
  security: 'Security',
};

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtDwell(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function fmtTs(ts: string): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString('en', { day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
  );
}

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

function fmtRelative(ts: string): string {
  const diffMin = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

// ── Data builders ──────────────────────────────────────────────────────────────

function buildAdminRecords(
  events: AdminEvent[],
  profiles: Profile[],
  superAdminId: string,
): AdminRecord[] {
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  const byActor = new Map<string, AdminEvent[]>();
  for (const e of events) {
    if (!e.actor_id || e.actor_id === superAdminId) continue;
    if (!byActor.has(e.actor_id)) byActor.set(e.actor_id, []);
    byActor.get(e.actor_id)!.push(e);
  }

  const records: AdminRecord[] = [];

  for (const [actorId, actorEvents] of byActor.entries()) {
    const profile = profileMap.get(actorId);
    if (!profile) continue;

    const bySession = new Map<string, AdminEvent[]>();
    for (const e of actorEvents) {
      const sid = String(e.payload?.session_id ?? 'legacy');
      if (!bySession.has(sid)) bySession.set(sid, []);
      bySession.get(sid)!.push(e);
    }

    const sessions: SessionTimeline[] = [];
    for (const [sid, sEvents] of bySession.entries()) {
      const sorted = [...sEvents].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

      const startEvent = sorted.find(e => e.event_type === 'admin_session_start');
      const endEvent = sorted.findLast(e => e.event_type === 'admin_session_end');

      const startedAt = startEvent?.occurred_at ?? sorted[0]?.occurred_at ?? '';
      const endedAt = endEvent?.occurred_at ?? null;

      let durationSeconds: number | null = null;
      if (typeof endEvent?.payload?.duration_seconds === 'number') {
        durationSeconds = endEvent.payload.duration_seconds as number;
      } else if (startedAt && sorted.length > 0) {
        const lastTs = sorted[sorted.length - 1].occurred_at;
        durationSeconds = Math.round((new Date(lastTs).getTime() - new Date(startedAt).getTime()) / 1000);
      }

      sessions.push({
        sessionId: sid,
        events: sorted,
        startedAt,
        endedAt,
        durationSeconds,
        membersViewed: sorted.filter(e => e.event_type === 'admin_member_viewed').length,
        isLegacy: sid === 'legacy',
      });
    }

    sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));

    const lastActive = actorEvents.map(e => e.occurred_at).sort().at(-1) ?? null;

    records.push({
      profile,
      sessions,
      totalSessions: sessions.length,
      totalSeconds: sessions.reduce((s, sess) => s + (sess.durationSeconds ?? 0), 0),
      totalMembersViewed: sessions.reduce((s, sess) => s + sess.membersViewed, 0),
      lastActive,
    });
  }

  records.sort((a, b) => (b.lastActive ?? '').localeCompare(a.lastActive ?? ''));
  return records;
}

// Extract visits per admin for behavioral metrics (same shape as before)
function extractVisits(record: AdminRecord): Visit[] {
  const visits: Visit[] = [];
  for (const session of record.sessions) {
    const viewed = session.events.filter(e => e.event_type === 'admin_member_viewed');
    const left = session.events.filter(e => e.event_type === 'admin_member_left');
    for (const v of viewed) {
      const uid = String(v.payload?.viewed_user_id ?? '');
      const name = String(v.payload?.viewed_name ?? v.payload?.viewed_email ?? uid);
      const matchLeft = left.find(
        l => String(l.payload?.viewed_user_id ?? '') === uid && l.occurred_at > v.occurred_at,
      );
      visits.push({
        memberId: uid,
        memberName: name,
        openedAt: v.occurred_at,
        dwellSeconds: matchLeft ? (matchLeft.payload?.dwell_seconds as number) ?? null : null,
      });
    }
  }
  visits.sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  return visits;
}

function buildBehavioralSummaries(records: AdminRecord[]): AdminSummary[] {
  return records.map(r => {
    const visits = extractVisits(r);
    const uniqueMembers = new Set(visits.map(v => v.memberId)).size;
    const dwells = visits.map(v => v.dwellSeconds).filter((d): d is number => d !== null);
    const avgDwellSeconds = dwells.length > 0
      ? Math.round(dwells.reduce((s, d) => s + d, 0) / dwells.length)
      : null;
    return {
      profile: r.profile,
      totalViews: visits.length,
      uniqueMembers,
      avgDwellSeconds,
      lastActive: r.lastActive,
      visits,
    };
  });
}

// ── Timeline event renderer ────────────────────────────────────────────────────

function TimelineEvent({ event }: { event: AdminEvent }) {
  const p = event.payload;
  const ts = fmtTime(event.occurred_at);

  switch (event.event_type) {
    case 'admin_session_start':
      return (
        <div className="flex items-center gap-2 py-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-slate-300 text-xs">Entered Admin Portal</span>
          <span className="text-slate-500 text-[10px] ml-auto shrink-0">{ts}</span>
        </div>
      );

    case 'admin_session_end':
      return (
        <div className="flex items-center gap-2 py-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
          <span className="text-slate-400 text-xs">Left Admin Portal</span>
          {typeof p.duration_seconds === 'number' && (
            <span className="text-slate-500 text-[10px]">· {fmtDwell(p.duration_seconds as number)} total</span>
          )}
          <span className="text-slate-500 text-[10px] ml-auto shrink-0">{ts}</span>
        </div>
      );

    case 'admin_tab_changed': {
      const toLabel = TAB_LABELS[String(p.to)] ?? String(p.to);
      const fromLabel = TAB_LABELS[String(p.from)] ?? String(p.from);
      const dwell = p.dwell_seconds as number | null;
      return (
        <div className="flex items-center gap-2 py-1">
          <div className="w-1.5 h-1.5 rounded-sm bg-blue-500/70 shrink-0 ml-0.5" />
          <span className="text-[10px] text-slate-400">
            → <span className="text-slate-300">{toLabel}</span>
            {dwell != null && dwell > 0 && (
              <span className="text-slate-500"> · {fmtDwell(dwell)} on {fromLabel}</span>
            )}
          </span>
          <span className="text-slate-600 text-[10px] ml-auto shrink-0">{ts}</span>
        </div>
      );
    }

    case 'admin_member_viewed': {
      const name = String(p.viewed_name ?? p.viewed_email ?? p.viewed_user_id ?? '');
      return (
        <div className="flex items-center gap-2 py-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
          <span className="text-slate-200 text-xs font-medium truncate">{name}</span>
          <span className="text-slate-500 text-[10px] ml-auto shrink-0">{ts}</span>
        </div>
      );
    }

    case 'admin_member_left': {
      const name = String(p.viewed_name ?? '');
      const dwell = p.dwell_seconds as number | null;
      return (
        <div className="flex items-center gap-2 py-1 pl-4">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
          <span className="text-[10px] text-slate-500">
            left{name ? ` ${name}` : ''}
            {dwell != null && ` · ${fmtDwell(dwell)}`}
          </span>
          <span className="text-slate-700 text-[10px] ml-auto shrink-0">{ts}</span>
        </div>
      );
    }

    case 'admin_member_subtab_changed': {
      const toLabel = SUBTAB_LABELS[String(p.to)] ?? String(p.to);
      const fromLabel = SUBTAB_LABELS[String(p.from)] ?? String(p.from);
      const dwell = p.dwell_seconds as number | null;
      return (
        <div className="flex items-center gap-2 py-1 pl-6">
          <span className="text-slate-600 text-[10px] shrink-0">↳</span>
          <span className="text-[10px] text-slate-500">
            <span className="text-slate-400">{toLabel}</span>
            {dwell != null && dwell > 0 && Boolean(p.from) && (
              <span> ({fmtDwell(dwell)} on {fromLabel})</span>
            )}
          </span>
          <span className="text-slate-700 text-[10px] ml-auto shrink-0">{ts}</span>
        </div>
      );
    }

    default:
      return null;
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AuditDashboard({ adminUserId }: { adminUserId: string }) {
  const supabase = createClient();
  const router = useRouter();

  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: eventsData }, { data: profilesData }] = await Promise.all([
      supabase
        .from('security_events')
        .select('id, actor_id, event_type, payload, occurred_at')
        .in('event_type', ALL_ADMIN_EVENT_TYPES)
        .order('occurred_at', { ascending: true }),
      supabase.from('profiles').select('id, name, email'),
    ]);

    const events = (eventsData ?? []) as AdminEvent[];
    const profiles = (profilesData ?? []) as Profile[];

    setRecords(buildAdminRecords(events, profiles, adminUserId));
    setLastRefreshed(new Date());
    setLoading(false);
  }, [adminUserId]);

  useEffect(() => { load(); }, [load]);

  function toggleSession(key: string) {
    setExpandedSessions(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Behavioral metrics ──────────────────────────────────────────────────────
  const summaries = buildBehavioralSummaries(records);

  const repeatVisitRows = summaries.map(s => {
    const memberCounts = new Map<string, number>();
    for (const v of s.visits) memberCounts.set(v.memberId, (memberCounts.get(v.memberId) ?? 0) + 1);
    const repeats = Array.from(memberCounts.values()).filter(c => c > 1).length;
    return { name: s.profile.name || s.profile.email.split('@')[0], repeats };
  });

  const sessionDepthRows = records.map(r => {
    const byDay = new Map<string, Set<string>>();
    for (const session of r.sessions) {
      for (const e of session.events) {
        if (e.event_type !== 'admin_member_viewed') continue;
        const day = e.occurred_at.slice(0, 10);
        if (!byDay.has(day)) byDay.set(day, new Set());
        byDay.get(day)!.add(String(e.payload?.viewed_user_id ?? ''));
      }
    }
    const depths = Array.from(byDay.values()).map(s => s.size);
    const avg = depths.length > 0 ? (depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1) : '—';
    const max = depths.length > 0 ? Math.max(...depths) : 0;
    return { name: r.profile.name || r.profile.email.split('@')[0], avg, max };
  });

  const timeOfDayRows = summaries.map(s => {
    const hourCounts = new Array(24).fill(0) as number[];
    for (const v of s.visits) hourCounts[new Date(v.openedAt).getHours()]++;
    const maxCount = Math.max(...hourCounts);
    if (maxCount === 0) return { name: s.profile.name || s.profile.email.split('@')[0], peak: 'no data yet' };
    const peakHours = hourCounts
      .map((c, h) => ({ c, h }))
      .filter(x => x.c === maxCount)
      .map(x => `${x.h}:00`);
    return { name: s.profile.name || s.profile.email.split('@')[0], peak: peakHours.slice(0, 3).join(', ') };
  });

  const memberViewerMap = new Map<string, { name: string; admins: Set<string> }>();
  for (const s of summaries) {
    for (const v of s.visits) {
      if (!memberViewerMap.has(v.memberId)) {
        memberViewerMap.set(v.memberId, { name: v.memberName, admins: new Set() });
      }
      memberViewerMap.get(v.memberId)!.admins.add(s.profile.name || s.profile.email.split('@')[0]);
    }
  }
  const overlapList = Array.from(memberViewerMap.values())
    .filter(m => m.admins.size > 1)
    .sort((a, b) => b.admins.size - a.admins.size);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-slate-900/95 border-b border-white/10 sticky top-0 z-30">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </button>
        <div className="w-px h-4 bg-white/10" />
        <span className="text-white font-semibold text-sm">Admin Audit</span>
        {lastRefreshed && (
          <span className="text-slate-500 text-xs">
            · Last refreshed: {lastRefreshed.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          onClick={load}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-slate-400 text-sm animate-pulse">Loading audit data…</div>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <div className="text-slate-500 text-sm">No admin activity recorded yet.</div>
            <div className="text-slate-600 text-xs">Activity will appear here after admins use the portal.</div>
          </div>
        ) : (
          <>
            {/* ── Session timeline section ─────────────────────────────────── */}
            <div className="space-y-4">
              {records.map(record => {
                const adminName = record.profile.name || record.profile.email.split('@')[0];
                return (
                  <div key={record.profile.id} className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
                    {/* Admin header */}
                    <div className="px-4 py-3 border-b border-white/5 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{adminName}</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {record.totalSessions} {record.totalSessions === 1 ? 'session' : 'sessions'}
                          {record.totalSeconds > 0 && ` · ${fmtDwell(record.totalSeconds)} total`}
                          {record.totalMembersViewed > 0 && ` · ${record.totalMembersViewed} member ${record.totalMembersViewed === 1 ? 'view' : 'views'}`}
                        </p>
                      </div>
                      {record.lastActive && (
                        <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">
                          Last active: {fmtRelative(record.lastActive)}
                        </span>
                      )}
                    </div>

                    {/* Session rows */}
                    <div className="divide-y divide-white/5">
                      {record.sessions.map((session, idx) => {
                        const key = `${record.profile.id}-${session.sessionId}-${idx}`;
                        const isExpanded = expandedSessions[key] ?? false;
                        const sessionDate = session.startedAt ? fmtTs(session.startedAt) : 'Unknown';
                        const hasDuration = session.durationSeconds != null && session.durationSeconds > 0;
                        const isApprox = !session.endedAt && session.durationSeconds != null;

                        return (
                          <div key={key}>
                            {/* Session header row */}
                            <button
                              onClick={() => toggleSession(key)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/30 transition-colors text-left"
                            >
                              {isExpanded
                                ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                : <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              }
                              <span className="text-slate-300 text-xs">
                                {session.isLegacy ? 'Legacy events' : `Session · ${sessionDate}`}
                              </span>
                              <span className="flex items-center gap-2 ml-auto text-[10px] text-slate-500 shrink-0">
                                {hasDuration && (
                                  <span className={isApprox ? 'text-slate-600' : ''}>
                                    {isApprox ? '~' : ''}{fmtDwell(session.durationSeconds)}
                                  </span>
                                )}
                                {session.membersViewed > 0 && (
                                  <span className="text-orange-400/70">
                                    {session.membersViewed} {session.membersViewed === 1 ? 'member' : 'members'}
                                  </span>
                                )}
                              </span>
                            </button>

                            {/* Expanded timeline */}
                            {isExpanded && (
                              <div className="px-4 pb-3 bg-slate-800/50">
                                <div className="border-l border-white/5 pl-3 ml-1.5 space-y-0">
                                  {session.events.map(event => (
                                    <TimelineEvent key={event.id} event={event} />
                                  ))}
                                  {session.events.length === 0 && (
                                    <p className="text-[10px] text-slate-600 py-2">No events recorded.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Behavioural metric cards (supplementary) ─────────────────── */}
            {summaries.some(s => s.totalViews > 0) && (
              <>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest">Behavioural Metrics</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Repeat Visit Rate */}
                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-semibold text-slate-300 mb-1">Repeat Visit Rate</h4>
                    <p className="text-[10px] text-slate-500 mb-3">
                      Members viewed more than once per admin.
                    </p>
                    {repeatVisitRows.every(r => r.repeats === 0) ? (
                      <p className="text-xs text-slate-500">No repeat visits yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {repeatVisitRows.map(r => (
                          <div key={r.name} className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">{r.name}</span>
                            <span className={r.repeats > 0 ? 'text-orange-400 font-semibold' : 'text-slate-500'}>
                              {r.repeats} {r.repeats === 1 ? 'repeat' : 'repeats'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Session Depth */}
                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-semibold text-slate-300 mb-1">Session Depth</h4>
                    <p className="text-[10px] text-slate-500 mb-3">
                      Avg and max members viewed per active day.
                    </p>
                    {sessionDepthRows.length === 0 ? (
                      <p className="text-xs text-slate-500">No data yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {sessionDepthRows.map(r => (
                          <div key={r.name} className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">{r.name}</span>
                            <span className="text-slate-300">avg {r.avg} · max {r.max}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Time-of-day pattern */}
                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-semibold text-slate-300 mb-1">Time-of-Day Pattern</h4>
                    <p className="text-[10px] text-slate-500 mb-3">Peak hours each admin is most active.</p>
                    {timeOfDayRows.length === 0 ? (
                      <p className="text-xs text-slate-500">No data yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {timeOfDayRows.map(r => (
                          <div key={r.name} className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">{r.name}</span>
                            <span className="text-slate-300">peak at {r.peak}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cross-admin overlap */}
                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-semibold text-slate-300 mb-1">Cross-Admin Overlap</h4>
                    <p className="text-[10px] text-slate-500 mb-3">
                      Members viewed by 2 or more admins.
                    </p>
                    {overlapList.length === 0 ? (
                      <p className="text-xs text-slate-500">No overlap yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {overlapList.map(m => (
                          <div key={m.name} className="flex items-start gap-3 text-xs">
                            <span className="text-slate-200 shrink-0">{m.name}</span>
                            <span className="text-slate-500 text-right flex-1">
                              viewed by: {Array.from(m.admins).join(', ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
