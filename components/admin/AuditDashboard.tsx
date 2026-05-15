'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

interface SecurityEvent {
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

const SUPER_ADMIN_EMAIL = 'tarun.shekhawat2027@bitsom.edu.in';

function fmtDwell(seconds: number | null): string {
  if (seconds === null) return '(no leave recorded)';
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

function fmtRelative(ts: string): string {
  const diffMin = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function buildAdminSummaries(
  events: SecurityEvent[],
  profiles: Profile[],
  superAdminId: string,
): AdminSummary[] {
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const byAdmin = new Map<string, { viewed: SecurityEvent[]; left: SecurityEvent[] }>();

  for (const e of events) {
    if (!e.actor_id || e.actor_id === superAdminId) continue;
    if (!byAdmin.has(e.actor_id)) byAdmin.set(e.actor_id, { viewed: [], left: [] });
    const bucket = byAdmin.get(e.actor_id)!;
    if (e.event_type === 'admin_member_viewed') bucket.viewed.push(e);
    else if (e.event_type === 'admin_member_left') bucket.left.push(e);
  }

  const summaries: AdminSummary[] = [];

  for (const [adminId, { viewed, left }] of byAdmin.entries()) {
    const profile = profileMap.get(adminId);
    if (!profile) continue;

    const visits: Visit[] = [];
    for (const viewEvt of viewed) {
      const viewedUserId = String(viewEvt.payload?.viewed_user_id ?? '');
      const memberName = String(viewEvt.payload?.viewed_name ?? viewedUserId);

      // Find the next leave event for same admin + same member after this view
      const matchingLeft = left.find(
        l =>
          String(l.payload?.viewed_user_id ?? '') === viewedUserId &&
          l.occurred_at > viewEvt.occurred_at,
      );

      visits.push({
        memberId: viewedUserId,
        memberName,
        openedAt: viewEvt.occurred_at,
        dwellSeconds: matchingLeft ? (matchingLeft.payload?.dwell_seconds as number) ?? null : null,
      });
    }

    // Sort visits newest-first
    visits.sort((a, b) => b.openedAt.localeCompare(a.openedAt));

    const uniqueMembers = new Set(visits.map(v => v.memberId)).size;
    const dwells = visits.map(v => v.dwellSeconds).filter((d): d is number => d !== null);
    const avgDwellSeconds =
      dwells.length > 0 ? Math.round(dwells.reduce((s, d) => s + d, 0) / dwells.length) : null;
    const lastActive = viewed.length > 0
      ? viewed.map(e => e.occurred_at).sort().at(-1) ?? null
      : null;

    summaries.push({
      profile,
      totalViews: viewed.length,
      uniqueMembers,
      avgDwellSeconds,
      lastActive,
      visits,
    });
  }

  // Sort by last active desc
  summaries.sort((a, b) => (b.lastActive ?? '').localeCompare(a.lastActive ?? ''));
  return summaries;
}

export function AuditDashboard({ adminUserId }: { adminUserId: string }) {
  const supabase = createClient();
  const router = useRouter();

  const [summaries, setSummaries] = useState<AdminSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [expandedAdmin, setExpandedAdmin] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: eventsData }, { data: profilesData }] = await Promise.all([
      supabase
        .from('security_events')
        .select('id, actor_id, event_type, payload, occurred_at')
        .in('event_type', ['admin_member_viewed', 'admin_member_left'])
        .order('occurred_at', { ascending: true }),
      supabase.from('profiles').select('id, name, email'),
    ]);

    const events = (eventsData ?? []) as SecurityEvent[];
    const profiles = (profilesData ?? []) as Profile[];

    setSummaries(buildAdminSummaries(events, profiles, adminUserId));
    setLastRefreshed(new Date());
    setLoading(false);
  }, [adminUserId]);

  useEffect(() => { load(); }, [load]);

  // ── Behavioral metrics ────────────────────────────────────────────────────

  // Repeat visits: same admin viewed same member more than once
  const repeatVisitRows = summaries.map(s => {
    const memberCounts = new Map<string, number>();
    for (const v of s.visits) {
      memberCounts.set(v.memberId, (memberCounts.get(v.memberId) ?? 0) + 1);
    }
    const repeats = Array.from(memberCounts.values()).filter(c => c > 1).length;
    return { name: s.profile.name || s.profile.email.split('@')[0], repeats };
  });

  // Session depth: number of members viewed per calendar day, per admin
  const sessionDepthRows = summaries.map(s => {
    const byDay = new Map<string, Set<string>>();
    for (const v of s.visits) {
      const day = v.openedAt.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, new Set());
      byDay.get(day)!.add(v.memberId);
    }
    const depths = Array.from(byDay.values()).map(set => set.size);
    const avg = depths.length > 0 ? (depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1) : '—';
    const max = depths.length > 0 ? Math.max(...depths) : 0;
    return { name: s.profile.name || s.profile.email.split('@')[0], avg, max };
  });

  // Time-of-day peaks
  const timeOfDayRows = summaries.map(s => {
    const hourCounts = new Array(24).fill(0) as number[];
    for (const v of s.visits) {
      hourCounts[new Date(v.openedAt).getHours()]++;
    }
    const maxCount = Math.max(...hourCounts);
    if (maxCount === 0) return { name: s.profile.name || s.profile.email.split('@')[0], peak: 'no data yet' };
    const peakHours = hourCounts
      .map((c, h) => ({ c, h }))
      .filter(x => x.c === maxCount)
      .map(x => `${x.h}:00`);
    return {
      name: s.profile.name || s.profile.email.split('@')[0],
      peak: peakHours.slice(0, 3).join(', '),
    };
  });

  // Cross-admin overlap: members viewed by 2+ admins
  const memberViewerMap = new Map<string, { name: string; admins: Set<string> }>();
  for (const s of summaries) {
    for (const v of s.visits) {
      if (!memberViewerMap.has(v.memberId)) {
        memberViewerMap.set(v.memberId, { name: v.memberName, admins: new Set() });
      }
      memberViewerMap.get(v.memberId)!.admins.add(
        s.profile.name || s.profile.email.split('@')[0],
      );
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
            <div className="text-slate-400 text-sm animate-pulse">Loading audit data...</div>
          </div>
        ) : summaries.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-slate-500 text-sm">No admin activity recorded yet.</div>
          </div>
        ) : (
          <>
            {/* ── Summary table ── */}
            <div className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white">Admin Activity Summary</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Click a view count to expand the full member list.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-white/5">
                      <th className="text-left py-2.5 px-4 font-medium">Admin</th>
                      <th className="text-center py-2.5 px-4 font-medium">Total Views</th>
                      <th className="text-center py-2.5 px-4 font-medium">Unique Members</th>
                      <th className="text-center py-2.5 px-4 font-medium">Avg Dwell</th>
                      <th className="text-right py-2.5 px-4 font-medium">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map(s => {
                      const isExpanded = expandedAdmin === s.profile.id;
                      const adminName = s.profile.name || s.profile.email.split('@')[0];
                      return (
                        <>
                          <tr
                            key={s.profile.id}
                            className="border-b border-white/5 hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="py-3 px-4 text-slate-200 font-medium">{adminName}</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => setExpandedAdmin(isExpanded ? null : s.profile.id)}
                                className="text-orange-400 font-bold hover:text-orange-300 transition-colors flex items-center gap-0.5 mx-auto"
                              >
                                {s.totalViews}
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-300">{s.uniqueMembers}</td>
                            <td className="py-3 px-4 text-center text-slate-300">
                              {fmtDwell(s.avgDwellSeconds)}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-400">
                              {s.lastActive ? fmtRelative(s.lastActive) : '—'}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${s.profile.id}-detail`} className="border-b border-white/5">
                              <td colSpan={5} className="px-4 py-3 bg-slate-700/20">
                                <div className="mb-2">
                                  <p className="text-xs font-semibold text-slate-300">
                                    {adminName}&apos;s Member Views
                                  </p>
                                </div>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-slate-500">
                                      <th className="text-left py-1 pr-4 font-medium">Member</th>
                                      <th className="text-left py-1 pr-4 font-medium">Opened At</th>
                                      <th className="text-right py-1 font-medium">Dwell Time</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {s.visits.map((v, i) => (
                                      <tr key={i}>
                                        <td className="py-1.5 pr-4 text-slate-200">{v.memberName}</td>
                                        <td className="py-1.5 pr-4 text-slate-400">{fmtTs(v.openedAt)}</td>
                                        <td className="py-1.5 text-right text-slate-300">
                                          {fmtDwell(v.dwellSeconds)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Behavioral metric cards ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Repeat Visit Rate */}
              <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                <h4 className="text-xs font-semibold text-slate-300 mb-1">Repeat Visit Rate</h4>
                <p className="text-[10px] text-slate-500 mb-3">
                  Number of members viewed more than once by each admin.
                </p>
                {repeatVisitRows.every(r => r.repeats === 0) ? (
                  <p className="text-xs text-slate-500">No repeat visits yet.</p>
                ) : (
                  <div className="space-y-2">
                    {repeatVisitRows.map(r => (
                      <div key={r.name} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{r.name}</span>
                        <span
                          className={
                            r.repeats > 0 ? 'text-orange-400 font-semibold' : 'text-slate-500'
                          }
                        >
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
                <div className="space-y-2">
                  {sessionDepthRows.map(r => (
                    <div key={r.name} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{r.name}</span>
                      <span className="text-slate-300">
                        avg {r.avg} · max {r.max}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time-of-day pattern */}
              <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                <h4 className="text-xs font-semibold text-slate-300 mb-1">Time-of-Day Pattern</h4>
                <p className="text-[10px] text-slate-500 mb-3">Peak hours each admin is most active.</p>
                <div className="space-y-2">
                  {timeOfDayRows.map(r => (
                    <div key={r.name} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{r.name}</span>
                      <span className="text-slate-300">peak at {r.peak}</span>
                    </div>
                  ))}
                </div>
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
      </div>
    </div>
  );
}
