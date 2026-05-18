'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ALL_COURSES, SPECS } from '@/data/courses';
import type { Profile, SpecId, Course } from '@/types';
import { GraduationCap, Search, Users, BookOpen, TrendingUp, ChevronRight, ChevronDown, ArrowLeft, X, Clock, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MemberSelection {
  user_id: string;
  course_id: number;
}

interface SessionRow {
  id?: string;
  user_id: string;
  session_start: string;
  session_end: string | null;
  duration_seconds: number | null;
  metadata?: Record<string, unknown> | null;
}

interface EventRow {
  id?: string;
  user_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  occurred_at: string;
}

interface LastSignInRow {
  user_id: string;
  last_sign_in_at: string;
}

interface GroupedSession {
  session: SessionRow;
  events: EventRow[];
}

type Tab = 'overview' | 'member' | 'activity' | 'insights';
type MemberSubTab = 'courses' | 'activity' | 'security' | 'insights';


const EVENT_LABELS: Record<string, string> = {
  course_viewed: 'Course Detail Views',
  course_selected: 'Course Added',
  course_removed: 'Course Removed',
  spec_toggled: 'Specialisation Changed',
  export_triggered: 'Schedule Exported',
  view_changed: 'View Switched',
  filters_applied: 'Filters Applied',
  filter_dead_end: 'Dead-end Filter',
  modal_view_duration: 'Modal Viewed',
  login_complete: 'Login',
  user_signed_out: 'Sign Out',
  rage_click: 'Rage Click',
  js_error: 'JS Error',
  calendar_accessed: 'Calendar Access',
  export_dialog_opened: 'Export Dialog Opened',
  calendar_panel_opened: 'Calendar Panel Opened',
  sidebar_toggled: 'Filter Sidebar Toggled',
};

function courseNameById(id: number): string {
  return ALL_COURSES.find(c => c.id === id)?.name ?? `Course #${id}`;
}

function describeEvent(e: EventRow): { icon: string; text: string } {
  const p = e.payload as Record<string, unknown>;
  switch (e.event_type) {
    case 'course_viewed':       return { icon: '👁', text: `Viewed "${(p?.course_name as string) ?? courseNameById(p?.course_id as number)}"` };
    case 'course_selected':     return { icon: '✔', text: `Added "${courseNameById(p?.course_id as number)}"` };
    case 'course_removed':      return { icon: '✖', text: `Removed "${courseNameById(p?.course_id as number)}"` };
    case 'spec_toggled':        return { icon: '🎓', text: `${p?.action === 'added' ? 'Added' : 'Removed'} spec: ${p?.spec}` };
    case 'export_triggered':    return { icon: '📤', text: `Exported schedule (${p?.type})` };
    case 'view_changed':        return { icon: '🔀', text: `Switched to ${p?.to} view` };
    case 'filters_applied': {
      const parts: string[] = [];
      if (Array.isArray(p?.specs) && (p.specs as string[]).length > 0) parts.push((p.specs as string[]).join(', '));
      if (Array.isArray(p?.workloads) && (p.workloads as string[]).length > 0) parts.push((p.workloads as string[]).join(', '));
      if (typeof p?.minDepth === 'number' && p.minDepth > 0) parts.push(`Depth ≥ ${p.minDepth}`);
      if (typeof p?.minRelevance === 'number' && p.minRelevance > 0) parts.push(`Relevance ≥ ${p.minRelevance}`);
      if (p?.selectedOnly) parts.push('Selected only');
      const detail = parts.length > 0 ? ` · ${parts.join(' · ')}` : '';
      return { icon: '🔧', text: `Applied filters${detail}` };
    }
    case 'filter_dead_end':     return { icon: '⚠', text: 'Filter returned zero results' };
    case 'modal_view_duration': return { icon: '⏱', text: `Spent ${Math.round((p?.duration_ms as number) / 1000)}s on "${p?.course_name}"` };
    case 'login_complete':      return { icon: '🔓', text: 'Logged in' };
    case 'user_signed_out':     return { icon: '🔒', text: 'Signed out' };
    case 'rage_click':          return { icon: '😤', text: `Rage-clicked "${String(p?.element_text ?? '').slice(0, 30)}"` };
    case 'js_error':            return { icon: '🔴', text: `JS error: ${String(p?.message ?? '').slice(0, 60)}` };
    case 'calendar_accessed':      return { icon: '📅', text: 'Accessed calendar subscription' };
    case 'export_dialog_opened':   return { icon: '📂', text: 'Opened export options' };
    case 'calendar_panel_opened':  return { icon: '🗓', text: 'Opened calendar panel' };
    case 'sidebar_toggled':        return { icon: '☰', text: `${p?.open ? 'Opened' : 'Closed'} filter sidebar (mobile)` };
    default:                       return { icon: '•', text: e.event_type };
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '?';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
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

function fmtExactTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function BarRow({
  label,
  value,
  max,
  color = '#f97316',
  suffix = '',
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-slate-300 w-12 text-right shrink-0">
        {value}{suffix}
      </span>
    </div>
  );
}

export function AdminDashboard({
  adminUserId,
  isSuperAdmin,
}: {
  adminUserId: string;
  isSuperAdmin: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selections, setSelections] = useState<MemberSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [overviewExpandedCourse, setOverviewExpandedCourse] = useState<number | null>(null);
  const [overviewExpandedSpec, setOverviewExpandedSpec] = useState<SpecId | null>(null);

  // Shared analytics data (Activity + Insights tabs)
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [lastSignIns, setLastSignIns] = useState<LastSignInRow[]>([]);
  const analyticsLoadedRef = useRef(false);

  // Landing page funnel data
  interface LandingSession {
    id: string;
    user_id: string | null;
    landed_at: string;
    first_ring_interaction_at: string | null;
    ring_interaction_ms: number;
    login_attempted: boolean;
    login_succeeded: boolean;
    abandoned: boolean;
    device_type: string | null;
    browser: string | null;
  }
  const [landingSessions, setLandingSessions] = useState<LandingSession[]>([]);
  const [expandedFunnelCard, setExpandedFunnelCard] = useState<'total' | 'ring' | 'email' | 'converted' | null>(null);

  // Per-member detail data
  const [memberSubTab, setMemberSubTab] = useState<MemberSubTab>('courses');
  const [memberSessions, setMemberSessions] = useState<SessionRow[]>([]);
  const [memberEvents, setMemberEvents] = useState<EventRow[]>([]);
  const [memberDataLoading, setMemberDataLoading] = useState(false);
  const [adminViewLogs, setAdminViewLogs] = useState<{ actor_name: string; occurred_at: string }[]>([]);
  const adminViewLogsLoadedRef = useRef(false);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  type EngagementSortCol = 'member' | 'lastVisit' | 'lastActivity' | 'sessions' | 'avgDuration';
  const [engagementSort, setEngagementSort] = useState<{ col: EngagementSortCol; dir: 'asc' | 'desc' }>({ col: 'lastVisit', dir: 'desc' });

  // Dwell time tracking — records when the current member profile was opened
  const memberOpenTimeRef = useRef<{ userId: string; name: string; openedAt: number } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('course_selections').select('user_id, course_id').limit(10000),
    ]).then(([{ data: p }, { data: s }]) => {
      setProfiles((p ?? []) as Profile[]);
      setSelections((s ?? []) as MemberSelection[]);
      setLoading(false);
    });
  }, []);

  // Reload landing funnel data every time Insights tab opens
  useEffect(() => {
    if (tab !== 'insights') return;
    supabase
      .from('landing_sessions')
      .select('id, user_id, landed_at, first_ring_interaction_at, ring_interaction_ms, login_attempted, login_succeeded, abandoned, device_type, browser')
      .order('landed_at', { ascending: false })
      .then(({ data }) => setLandingSessions((data ?? []) as LandingSession[]));
  }, [tab]);

  // Lazy-load analytics data when Activity or Insights tab first opens
  useEffect(() => {
    if ((tab !== 'activity' && tab !== 'insights') || analyticsLoadedRef.current) return;
    analyticsLoadedRef.current = true;
    Promise.all([
      supabase
        .from('user_sessions')
        .select('user_id, session_start, session_end, duration_seconds, metadata'),
      supabase.from('user_events').select('user_id, event_type, payload, occurred_at'),
      supabase.rpc('get_user_last_sign_in'),
    ]).then(([{ data: s }, { data: e }, { data: l }]) => {
      setSessions((s ?? []) as SessionRow[]);
      setEvents((e ?? []) as EventRow[]);
      setLastSignIns((l ?? []) as LastSignInRow[]);
    });
  }, [tab]);

  // Fetch per-member sessions + events when selected member changes
  useEffect(() => {
    if (!selectedMember) return;
    setMemberDataLoading(true);
    adminViewLogsLoadedRef.current = false;
    setAdminViewLogs([]);
    Promise.all([
      supabase
        .from('user_sessions')
        .select('id, user_id, session_start, session_end, duration_seconds, metadata')
        .eq('user_id', selectedMember.id)
        .order('session_start', { ascending: false }),
      supabase
        .from('user_events')
        .select('id, user_id, event_type, payload, occurred_at')
        .eq('user_id', selectedMember.id)
        .order('occurred_at', { ascending: false }),
    ]).then(([{ data: s }, { data: e }]) => {
      setMemberSessions((s ?? []) as SessionRow[]);
      setMemberEvents((e ?? []) as EventRow[]);
      setMemberDataLoading(false);
    });
  }, [selectedMember?.id]);

  // Lazy-load admin view audit when Security sub-tab opens (super-admin only)
  useEffect(() => {
    if (
      memberSubTab !== 'security' ||
      !isSuperAdmin ||
      !selectedMember ||
      adminViewLogsLoadedRef.current
    ) return;
    adminViewLogsLoadedRef.current = true;
    supabase
      .from('security_events')
      .select('actor_id, occurred_at')
      .eq('event_type', 'admin_member_viewed')
      .filter('payload->>viewed_user_id', 'eq', selectedMember.id)
      .order('occurred_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const logs = data.map(row => {
          const actorId = row.actor_id as string | null;
          const actor = actorId ? profiles.find(p => p.id === actorId) : null;
          return {
            actor_name: actor?.name || actor?.email?.split('@')[0] || 'Unknown admin',
            occurred_at: row.occurred_at as string,
          };
        });
        setAdminViewLogs(logs);
      });
  }, [memberSubTab, isSuperAdmin, selectedMember?.id]);

  function fireMemberLeft() {
    if (!memberOpenTimeRef.current) return;
    const { userId, name, openedAt } = memberOpenTimeRef.current;
    const dwell_seconds = Math.round((Date.now() - openedAt) / 1000);
    supabase.from('security_events').insert({
      actor_id: adminUserId,
      event_type: 'admin_member_left',
      payload: { viewed_user_id: userId, viewed_name: name, dwell_seconds },
    });
    memberOpenTimeRef.current = null;
  }

  const filteredProfiles = profiles
    .filter(
      p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const nameA = (a.name || a.email.split('@')[0]).toLowerCase();
      const nameB = (b.name || b.email.split('@')[0]).toLowerCase();
      return nameA.localeCompare(nameB);
    });

  // ── Derived cohort stats ──────────────────────────────────────────────────

  const selectionsByUser = new Map<string, Set<number>>();
  for (const s of selections) {
    if (!selectionsByUser.has(s.user_id)) selectionsByUser.set(s.user_id, new Set());
    selectionsByUser.get(s.user_id)!.add(s.course_id);
  }

  const membersWithSelections = profiles.filter(p => (selectionsByUser.get(p.id)?.size ?? 0) > 0).length;
  const avgSelections = profiles.length ? (selections.length / profiles.length).toFixed(1) : '0';

  const specCounts: Record<SpecId, number> = { FIN: 0, OPS: 0, ENT: 0, ECOM: 0, MKT: 0, LSTR: 0 };
  for (const p of profiles) {
    for (const s of p.specializations) specCounts[s as SpecId]++;
  }
  const maxSpecCount = Math.max(...Object.values(specCounts), 1);

  const courseCounts = new Map<number, number>();
  for (const s of selections) {
    courseCounts.set(s.course_id, (courseCounts.get(s.course_id) ?? 0) + 1);
  }
  const courseRanking = ALL_COURSES
    .filter(c => c.type === 'elective')
    .map(c => ({ course: c, count: courseCounts.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const top10 = courseRanking.slice(0, 10);
  const unpopular = courseRanking.filter(r => r.count === 0);

  // ── Member detail helpers ─────────────────────────────────────────────────

  const memberCourseIds = selectedMember
    ? (selectionsByUser.get(selectedMember.id) ?? new Set<number>())
    : new Set<number>();

  const memberCourses = ALL_COURSES
    .filter(c => memberCourseIds.has(c.id))
    .sort((a, b) => a.term - b.term || (a.block ?? 0) - (b.block ?? 0));

  const groupedByBlock = memberCourses.reduce<Map<string, Course[]>>((acc, c) => {
    const key = `Term ${c.term} · Block ${c.block ?? '?'} (${c.dates})`;
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push(c);
    return acc;
  }, new Map());

  function whoElseTaking(courseId: number): Profile[] {
    return profiles.filter(
      p => p.id !== selectedMember?.id && (selectionsByUser.get(p.id)?.has(courseId) ?? false),
    );
  }

  // ── Activity tab derived stats ────────────────────────────────────────────

  const lastSignInMap = new Map<string, string>(lastSignIns.map(r => [r.user_id, r.last_sign_in_at]));

  const lastActivityMap = new Map<string, string>();
  for (const e of events) {
    const cur = lastActivityMap.get(e.user_id);
    if (!cur || e.occurred_at > cur) lastActivityMap.set(e.user_id, e.occurred_at);
  }

  const userSessionStats = new Map<string, { lastVisit: string; lastActivity: string; totalSessions: number; avgMinutes: number }>();
  for (const p of profiles) {
    const userSessions = sessions.filter(s => s.user_id === p.id);
    const completed = userSessions.filter(s => s.duration_seconds != null);
    const avgSecs = completed.length
      ? completed.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / completed.length
      : 0;
    const lastVisit =
      lastSignInMap.get(p.id) ?? userSessions.map(s => s.session_start).sort().at(-1) ?? '';
    const lastActivity = lastActivityMap.get(p.id) ?? '';
    userSessionStats.set(p.id, {
      lastVisit,
      lastActivity,
      totalSessions: userSessions.length,
      avgMinutes: Math.round(avgSecs / 60),
    });
  }

  const today = new Date();
  const dauData = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - i));
    const dateStr = day.toISOString().slice(0, 10);
    const count = new Set(
      sessions.filter(s => s.session_start.slice(0, 10) === dateStr).map(s => s.user_id),
    ).size;
    return { date: dateStr, count };
  });
  const maxDau = Math.max(...dauData.map(d => d.count), 1);

  const eventTypeCounts = new Map<string, number>();
  for (const e of events) {
    eventTypeCounts.set(e.event_type, (eventTypeCounts.get(e.event_type) ?? 0) + 1);
  }
  const sortedEventTypes = Array.from(eventTypeCounts.entries()).sort((a, b) => b[1] - a[1]);
  const maxEventCount = Math.max(...sortedEventTypes.map(([, c]) => c), 1);

  const courseViewCounts = new Map<number, number>();
  for (const e of events.filter(ev => ev.event_type === 'course_viewed')) {
    const cid = (e.payload as { course_id?: number })?.course_id;
    if (cid) courseViewCounts.set(cid, (courseViewCounts.get(cid) ?? 0) + 1);
  }
  const topViewedCourses = ALL_COURSES
    .map(c => ({ course: c, views: courseViewCounts.get(c.id) ?? 0 }))
    .filter(x => x.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  const maxViews = Math.max(...topViewedCourses.map(x => x.views), 1);

  // ── Per-member timeline ───────────────────────────────────────────────────

  // Group events into their parent session by timestamp range
  const groupedSessions: GroupedSession[] = memberSessions.map(session => {
    const start = new Date(session.session_start).getTime();
    const end = session.session_end ? new Date(session.session_end).getTime() : Date.now();
    const sessionEvents = memberEvents
      .filter(e => {
        const t = new Date(e.occurred_at).getTime();
        return t >= start && t <= end;
      })
      .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
    return { session, events: sessionEvents };
  });
  // memberSessions is already ordered DESC by session_start from the query

  // ── Security sub-tab ──────────────────────────────────────────────────────

  const jsErrors = memberEvents.filter(e => e.event_type === 'js_error');
  const rageClicks = memberEvents.filter(e => e.event_type === 'rage_click');

  const sessionAnomalies = memberSessions.flatMap(s => {
    const result: { label: string; session: SessionRow }[] = [];
    if (s.duration_seconds !== null && s.duration_seconds < 30) {
      result.push({ label: 'Bounce (<30s)', session: s });
    } else if (s.duration_seconds !== null && s.duration_seconds > 180 * 60) {
      result.push({ label: 'Very long session (>3h)', session: s });
    } else if (
      !s.session_end &&
      Date.now() - new Date(s.session_start).getTime() > 2 * 60 * 60 * 1000
    ) {
      result.push({ label: 'Unclosed session', session: s });
    }
    return result;
  });

  // ── Per-member insights (member Insights sub-tab) ────────────────────────

  const mDeviceCounts: Record<string, number> = {};
  const mBrowserCounts: Record<string, number> = {};
  const mOsCounts: Record<string, number> = {};
  let mTotalPageLoadMs = 0;
  let mPageLoadCount = 0;
  for (const s of memberSessions) {
    const meta = s.metadata as Record<string, unknown> | null;
    if (!meta) continue;
    const dt = String(meta.device_type ?? 'unknown');
    mDeviceCounts[dt] = (mDeviceCounts[dt] ?? 0) + 1;
    const br = String(meta.browser ?? 'Unknown');
    mBrowserCounts[br] = (mBrowserCounts[br] ?? 0) + 1;
    const os = String(meta.os ?? 'Unknown');
    mOsCounts[os] = (mOsCounts[os] ?? 0) + 1;
    if (typeof meta.page_load_ms === 'number' && meta.page_load_ms > 0) {
      mTotalPageLoadMs += meta.page_load_ms;
      mPageLoadCount++;
    }
  }
  const mAvgPageLoadMs = mPageLoadCount > 0 ? Math.round(mTotalPageLoadMs / mPageLoadCount) : null;
  const mMaxDevice = Math.max(...Object.values(mDeviceCounts), 1);
  const mMaxBrowser = Math.max(...Object.values(mBrowserCounts), 1);
  const mMaxOs = Math.max(...Object.values(mOsCounts), 1);

  const mCompletedSessions = memberSessions.filter(s => s.duration_seconds !== null);
  const mBounceSessions = mCompletedSessions.filter(s => (s.duration_seconds ?? 0) < 30);
  const mAvgSessionSecs = mCompletedSessions.length
    ? Math.round(
        mCompletedSessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) /
          mCompletedSessions.length,
      )
    : 0;
  const mBounceRate =
    mCompletedSessions.length > 0
      ? Math.round((mBounceSessions.length / mCompletedSessions.length) * 100)
      : 0;

  const mModalMap = new Map<number, { name: string; opens: number; totalMs: number }>();
  for (const e of memberEvents.filter(ev => ev.event_type === 'modal_view_duration')) {
    const p = e.payload as Record<string, unknown>;
    const cid = p?.course_id as number;
    if (!cid) continue;
    const name = (p?.course_name as string) ?? courseNameById(cid);
    const dur = (p?.duration_ms as number) ?? 0;
    const entry = mModalMap.get(cid) ?? { name, opens: 0, totalMs: 0 };
    entry.opens++;
    entry.totalMs += dur;
    mModalMap.set(cid, entry);
  }
  const mModalList = Array.from(mModalMap.entries())
    .map(([, d]) => ({ ...d, avgSec: Math.round(d.totalMs / d.opens / 1000) }))
    .sort((a, b) => b.avgSec - a.avgSec)
    .slice(0, 8);
  const mMaxModalSec = Math.max(...mModalList.map(m => m.avgSec), 1);

  const mDeadEndMap = new Map<string, number>();
  for (const e of memberEvents.filter(ev => ev.event_type === 'filter_dead_end')) {
    const p = e.payload as Record<string, unknown>;
    const parts: string[] = [];
    if (Array.isArray(p?.specs) && p.specs.length > 0) parts.push(`Specs: ${(p.specs as string[]).join(', ')}`);
    if (Array.isArray(p?.workloads) && p.workloads.length > 0) parts.push(`Workload: ${(p.workloads as string[]).join(', ')}`);
    if (typeof p?.minDepth === 'number' && p.minDepth > 0) parts.push(`Depth ≥ ${p.minDepth}`);
    if (typeof p?.minRelevance === 'number' && p.minRelevance > 0) parts.push(`Relevance ≥ ${p.minRelevance}`);
    if (p?.selectedOnly) parts.push('Selected only');
    const key = parts.length > 0 ? parts.join(' + ') : 'Unknown combo';
    mDeadEndMap.set(key, (mDeadEndMap.get(key) ?? 0) + 1);
  }
  const mDeadEndList = Array.from(mDeadEndMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const mMaxDeadEnd = Math.max(...mDeadEndList.map(([, c]) => c), 1);

  const mCalendarAccesses = memberEvents.filter(e => e.event_type === 'calendar_accessed').length;
  const mExportCounts: Record<string, number> = {};
  for (const e of memberEvents.filter(ev => ev.event_type === 'export_triggered')) {
    const type = String((e.payload as Record<string, unknown>)?.type ?? 'other');
    mExportCounts[type] = (mExportCounts[type] ?? 0) + 1;
  }
  const mMaxExport = Math.max(...Object.values(mExportCounts), 1);

  const mLoginByHour = new Array(24).fill(0) as number[];
  for (const e of memberEvents.filter(ev => ev.event_type === 'login_complete')) {
    mLoginByHour[new Date(e.occurred_at).getHours()]++;
  }
  const mMaxLoginHour = Math.max(...mLoginByHour, 1);

  // ── Insights tab derived data (cohort-wide) ───────────────────────────────

  // Device/browser breakdown from session metadata
  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  const osCounts: Record<string, number> = {};
  let totalPageLoadMs = 0;
  let pageLoadCount = 0;
  for (const s of sessions) {
    const meta = s.metadata as Record<string, unknown> | null;
    if (!meta) continue;
    const dt = String(meta.device_type ?? 'unknown');
    deviceCounts[dt] = (deviceCounts[dt] ?? 0) + 1;
    const br = String(meta.browser ?? 'Unknown');
    browserCounts[br] = (browserCounts[br] ?? 0) + 1;
    const os = String(meta.os ?? 'Unknown');
    osCounts[os] = (osCounts[os] ?? 0) + 1;
    if (typeof meta.page_load_ms === 'number' && meta.page_load_ms > 0) {
      totalPageLoadMs += meta.page_load_ms;
      pageLoadCount++;
    }
  }
  const avgPageLoadMs = pageLoadCount > 0 ? Math.round(totalPageLoadMs / pageLoadCount) : null;
  const maxDevice = Math.max(...Object.values(deviceCounts), 1);
  const maxBrowser = Math.max(...Object.values(browserCounts), 1);
  const maxOs = Math.max(...Object.values(osCounts), 1);

  // Session quality
  const completedSessions = sessions.filter(s => s.duration_seconds !== null);
  const bounceSessions = completedSessions.filter(s => (s.duration_seconds ?? 0) < 30);
  const avgSessionSecs = completedSessions.length
    ? Math.round(
        completedSessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) /
          completedSessions.length,
      )
    : 0;
  const bounceRate =
    completedSessions.length > 0
      ? Math.round((bounceSessions.length / completedSessions.length) * 100)
      : 0;

  // Modal read depth — which courses people actually spend time reading about
  const modalMap = new Map<number, { name: string; opens: number; totalMs: number }>();
  for (const e of events.filter(ev => ev.event_type === 'modal_view_duration')) {
    const p = e.payload as Record<string, unknown>;
    const cid = p?.course_id as number;
    if (!cid) continue;
    const name = (p?.course_name as string) ?? courseNameById(cid);
    const dur = (p?.duration_ms as number) ?? 0;
    const entry = modalMap.get(cid) ?? { name, opens: 0, totalMs: 0 };
    entry.opens++;
    entry.totalMs += dur;
    modalMap.set(cid, entry);
  }
  const modalList = Array.from(modalMap.entries())
    .map(([, d]) => ({ ...d, avgSec: Math.round(d.totalMs / d.opens / 1000) }))
    .sort((a, b) => b.avgSec - a.avgSec)
    .slice(0, 10);
  const maxModalSec = Math.max(...modalList.map(m => m.avgSec), 1);

  // Dead-end filter combos — UX pain points
  const deadEndMap = new Map<string, number>();
  for (const e of events.filter(ev => ev.event_type === 'filter_dead_end')) {
    const p = e.payload as Record<string, unknown>;
    const parts: string[] = [];
    if (Array.isArray(p?.specs) && p.specs.length > 0) parts.push(`Specs: ${p.specs.join(', ')}`);
    if (Array.isArray(p?.workloads) && p.workloads.length > 0) parts.push(`Workload: ${p.workloads.join(', ')}`);
    if (typeof p?.minDepth === 'number' && p.minDepth > 0) parts.push(`Depth ≥ ${p.minDepth}`);
    if (typeof p?.minRelevance === 'number' && p.minRelevance > 0) parts.push(`Relevance ≥ ${p.minRelevance}`);
    if (p?.selectedOnly) parts.push('Selected only');
    const key = parts.length > 0 ? parts.join(' + ') : 'Unknown combo';
    deadEndMap.set(key, (deadEndMap.get(key) ?? 0) + 1);
  }
  const deadEndList = Array.from(deadEndMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxDeadEnd = Math.max(...deadEndList.map(([, c]) => c), 1);

  // Calendar & export usage
  const calendarAccessorIds = new Set(
    events.filter(e => e.event_type === 'calendar_accessed').map(e => e.user_id),
  );
  const calendarTotalAccesses = events.filter(e => e.event_type === 'calendar_accessed').length;
  const exportCounts: Record<string, number> = {};
  for (const e of events.filter(ev => ev.event_type === 'export_triggered')) {
    const type = String((e.payload as Record<string, unknown>)?.type ?? 'other');
    exportCounts[type] = (exportCounts[type] ?? 0) + 1;
  }
  const maxExport = Math.max(...Object.values(exportCounts), 1);

  // Rage click hotspots across all users
  const rageClickMap = new Map<string, number>();
  for (const e of events.filter(ev => ev.event_type === 'rage_click')) {
    const p = e.payload as Record<string, unknown>;
    const key = String(p?.element_text ?? '').slice(0, 40) || String(p?.element_tag ?? 'element');
    rageClickMap.set(key, (rageClickMap.get(key) ?? 0) + 1);
  }
  const rageClickList = Array.from(rageClickMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxRageClick = Math.max(...rageClickList.map(([, c]) => c), 1);

  // JS errors across all users (de-duplicated by message)
  const jsErrorMap = new Map<string, { count: number; users: Set<string>; lastSeen: string }>();
  for (const e of events.filter(ev => ev.event_type === 'js_error')) {
    const p = e.payload as Record<string, unknown>;
    const key = String(p?.message ?? '').slice(0, 100) || 'Unknown error';
    const entry = jsErrorMap.get(key) ?? { count: 0, users: new Set(), lastSeen: e.occurred_at };
    entry.count++;
    entry.users.add(e.user_id);
    if (e.occurred_at > entry.lastSeen) entry.lastSeen = e.occurred_at;
    jsErrorMap.set(key, entry);
  }
  const jsErrorList = Array.from(jsErrorMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  // Login timing — by hour of day (0–23)
  const loginByHour = new Array(24).fill(0) as number[];
  for (const e of events.filter(ev => ev.event_type === 'login_complete')) {
    loginByHour[new Date(e.occurred_at).getHours()]++;
  }
  const maxLoginHour = Math.max(...loginByHour, 1);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading cohort data...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-slate-900/95 border-b border-white/10 sticky top-0 z-30">
        <button
          onClick={() => router.push('/planner')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Planner
        </button>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">Admin Dashboard</span>
          <span className="text-slate-500 text-xs">· BITSoM Co&apos;27</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left — member list */}
        <div className="w-64 flex-shrink-0 border-r border-white/10 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <p className="text-slate-500 text-[10px] mt-2">{profiles.length} cohort members</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredProfiles.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  fireMemberLeft();
                  setSelectedMember(p);
                  setTab('member');
                  setExpandedCourse(null);
                  setMemberSubTab('courses');
                  supabase.from('security_events').insert({
                    actor_id: adminUserId,
                    event_type: 'admin_member_viewed',
                    payload: { viewed_user_id: p.id, viewed_email: p.email, viewed_name: p.name },
                  });
                  memberOpenTimeRef.current = { userId: p.id, name: p.name, openedAt: Date.now() };
                }}
                className={`w-full text-left px-3 py-2.5 border-b border-white/5 hover:bg-slate-800 transition-colors ${
                  selectedMember?.id === p.id ? 'bg-slate-800 border-l-2 border-l-orange-500' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-200 text-xs font-medium truncate">
                    {p.name || p.email.split('@')[0]}
                  </span>
                  <span className="text-slate-500 text-[10px] shrink-0">
                    {selectionsByUser.get(p.id)?.size ?? 0}
                  </span>
                </div>
                {p.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.specializations.map(s => {
                      const spec = SPECS.find(sp => sp.id === s);
                      return spec ? (
                        <span
                          key={s}
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: spec.color + '33', color: spec.color }}
                        >
                          {spec.id}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right — content panel */}
        <div className="flex-1 overflow-y-auto">
          {/* Top-level tabs */}
          <div className="sticky top-0 z-10 flex gap-1 px-4 pt-4 pb-2 bg-slate-900 border-b border-white/5">
            <button
              onClick={() => { if (tab === 'member') fireMemberLeft(); setTab('overview'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === 'overview' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cohort Overview
            </button>
            <button
              onClick={() => setTab('member')}
              disabled={!selectedMember}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === 'member' && selectedMember
                  ? 'bg-white text-slate-900'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {selectedMember
                ? selectedMember.name || selectedMember.email.split('@')[0]
                : 'Member Detail'}
            </button>
            <button
              onClick={() => { if (tab === 'member') fireMemberLeft(); setTab('activity'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === 'activity' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => { if (tab === 'member') fireMemberLeft(); setTab('insights'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === 'insights' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Insights
            </button>
          </div>

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && (
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: Users, label: 'Total Members', value: profiles.length, color: 'text-blue-400' },
                  { icon: BookOpen, label: 'Have a Plan', value: membersWithSelections, color: 'text-green-400' },
                  { icon: TrendingUp, label: 'Avg Courses', value: avgSelections, color: 'text-orange-400' },
                  { icon: ChevronRight, label: 'Total Selections', value: selections.length, color: 'text-purple-400' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <Icon className={`w-5 h-5 ${color} mb-2`} />
                    <div className="text-2xl font-bold text-white">{value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-semibold text-slate-200 mb-4">Specialization Popularity</h3>
                <div className="space-y-2.5">
                  {SPECS.map(spec => {
                    const count = specCounts[spec.id];
                    const pct = (count / maxSpecCount) * 100;
                    const isExpanded = overviewExpandedSpec === spec.id;
                    const specMembers = profiles.filter(p => p.specializations.includes(spec.id));
                    return (
                      <div key={spec.id}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setOverviewExpandedSpec(isExpanded ? null : spec.id)}
                            className="text-xs w-28 shrink-0 text-left hover:text-orange-300 transition-colors text-slate-400"
                            style={{ color: isExpanded ? spec.color : undefined }}
                          >
                            {spec.label}
                          </button>
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: spec.color }}
                            />
                          </div>
                          <span className="text-xs text-slate-300 w-6 text-right">{count}</span>
                        </div>
                        {isExpanded && (
                          <div className="mt-1.5 mb-1 bg-slate-700/40 rounded-lg p-3">
                            <p className="text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wide">
                              {spec.label} members ({specMembers.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {specMembers.map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    setSelectedMember(p);
                                    setTab('member');
                                    setOverviewExpandedSpec(null);
                                    setExpandedCourse(null);
                                    setMemberSubTab('courses');
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-600 text-slate-200 hover:bg-orange-500/20 hover:text-orange-300 transition-colors"
                                >
                                  {p.name || p.email.split('@')[0]}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">Most Selected Courses</h3>
                  <div className="space-y-2">
                    {top10.map(({ course, count }, i) => {
                      const pct = profiles.length ? Math.round((count / profiles.length) * 100) : 0;
                      const spec = SPECS.find(s => course.specs.includes(s.id));
                      const isExpanded = overviewExpandedCourse === course.id;
                      const takers = profiles.filter(p => selectionsByUser.get(p.id)?.has(course.id) ?? false);
                      return (
                        <div key={course.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => setOverviewExpandedCourse(isExpanded ? null : course.id)}
                                className="text-xs text-slate-200 truncate hover:text-orange-300 transition-colors text-left w-full"
                              >
                                {course.name}
                              </button>
                              <div className="h-1 rounded-full flex-1 bg-slate-700 mt-0.5">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pct}%`, backgroundColor: spec?.color ?? '#64748b' }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-slate-300 shrink-0">
                              {count} ({pct}%)
                            </span>
                          </div>
                          {isExpanded && (
                            <div className="mt-1.5 mb-1 ml-6 bg-slate-700/40 rounded-lg p-3">
                              <p className="text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wide">
                                Enrolled ({takers.length})
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {takers.map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => {
                                      setSelectedMember(p);
                                      setTab('member');
                                      setOverviewExpandedCourse(null);
                                      setExpandedCourse(null);
                                      setMemberSubTab('courses');
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-600 text-slate-200 hover:bg-orange-500/20 hover:text-orange-300 transition-colors"
                                  >
                                    {p.name || p.email.split('@')[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">
                    No Takers Yet
                    <span className="ml-2 text-[10px] text-slate-500 font-normal">
                      ({unpopular.length} courses)
                    </span>
                  </h3>
                  {unpopular.length === 0 ? (
                    <p className="text-xs text-slate-500">Every elective has at least one person interested.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {unpopular.map(({ course }) => (
                        <div key={course.id} className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                          <span className="truncate">{course.name}</span>
                          <span className="shrink-0 text-slate-600">{course.code}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── MEMBER DETAIL TAB ── */}
          {tab === 'member' && selectedMember && (
            <div className="p-4 space-y-4">
              <div className="bg-slate-800 rounded-xl p-4 border border-white/5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-white font-semibold text-base">{selectedMember.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{selectedMember.email}</div>
                  {selectedMember.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedMember.specializations.map(s => {
                        const spec = SPECS.find(sp => sp.id === s);
                        return spec ? (
                          <span
                            key={s}
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: spec.color + '33', color: spec.color }}
                          >
                            {spec.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-4 shrink-0 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{memberCourseIds.size}</div>
                    <div className="text-[10px] text-slate-400">courses</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {selectedMember.specializations.length}
                    </div>
                    <div className="text-[10px] text-slate-400">specs</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-1">
                {(['courses', 'activity', 'insights', 'security'] as MemberSubTab[]).map(sub => (
                  <button
                    key={sub}
                    onClick={() => setMemberSubTab(sub)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                      memberSubTab === sub
                        ? 'bg-white text-slate-900'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {memberSubTab === 'courses' && (
                <>
                  {memberCourses.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-10">
                      {selectedMember.name} hasn&apos;t selected any courses yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Array.from(groupedByBlock.entries()).map(([blockLabel, courses]) => (
                        <div
                          key={blockLabel}
                          className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden"
                        >
                          <div className="px-4 py-2 bg-slate-700/50 border-b border-white/5">
                            <span className="text-xs font-semibold text-slate-300">{blockLabel}</span>
                          </div>
                          <div className="divide-y divide-white/5">
                            {courses.map(course => {
                              const spec = SPECS.find(s => course.specs.includes(s.id));
                              const accentColor =
                                course.type === 'waw'
                                  ? '#d97706'
                                  : course.type === 'mandatory'
                                  ? '#2563eb'
                                  : spec?.color ?? '#64748b';
                              const others = whoElseTaking(course.id);
                              const isExpanded = expandedCourse === course.id;
                              return (
                                <div key={course.id}>
                                  <div className="flex items-center gap-3 px-4 py-2.5">
                                    <div
                                      className="w-1 h-8 rounded-full shrink-0"
                                      style={{ backgroundColor: accentColor }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-slate-200">
                                        {course.name}
                                      </div>
                                      <div className="text-[10px] text-slate-500 mt-0.5">
                                        {course.faculty} · {course.type}
                                        {course.code ? ` · ${course.code}` : ''}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors shrink-0 ml-2"
                                    >
                                      <Users className="w-3 h-3" />
                                      <span>{others.length} others</span>
                                      {isExpanded ? (
                                        <X className="w-3 h-3" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                  {isExpanded && (
                                    <div className="px-4 pb-3 pt-0">
                                      <div className="bg-slate-700/40 rounded-lg p-3">
                                        <p className="text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wide">
                                          Also enrolled ({others.length})
                                        </p>
                                        {others.length === 0 ? (
                                          <p className="text-[10px] text-slate-500">
                                            Nobody else selected this course.
                                          </p>
                                        ) : (
                                          <div className="flex flex-wrap gap-1.5">
                                            {others.map(o => (
                                              <button
                                                key={o.id}
                                                onClick={() => {
                                                  fireMemberLeft();
                                                  setSelectedMember(o);
                                                  setExpandedCourse(null);
                                                  setMemberSubTab('courses');
                                                  supabase.from('security_events').insert({
                                                    actor_id: adminUserId,
                                                    event_type: 'admin_member_viewed',
                                                    payload: { viewed_user_id: o.id, viewed_email: o.email, viewed_name: o.name },
                                                  });
                                                  memberOpenTimeRef.current = { userId: o.id, name: o.name, openedAt: Date.now() };
                                                }}
                                                className="text-[10px] px-2 py-0.5 rounded-full bg-slate-600 text-slate-200 hover:bg-orange-500/20 hover:text-orange-300 transition-colors"
                                              >
                                                {o.name || o.email.split('@')[0]}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {memberSubTab === 'activity' && (
                <div className="space-y-2">
                  {memberDataLoading ? (
                    <div className="py-8 text-center text-slate-500 text-xs animate-pulse">
                      Loading activity...
                    </div>
                  ) : groupedSessions.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No activity recorded yet.
                    </div>
                  ) : (
                    groupedSessions.map((group, i) => {
                      const { session, events: sessionEvents } = group;
                      const sessionId = session.id ?? `session-${i}`;
                      const isExpanded = !!expandedSessions[sessionId];
                      const meta = session.metadata as Record<string, unknown> | null;
                      const isActive = !session.session_end;

                      return (
                        <div
                          key={sessionId}
                          className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden"
                        >
                          {/* Session header — clickable to expand */}
                          <button
                            onClick={() =>
                              setExpandedSessions(prev => ({
                                ...prev,
                                [sessionId]: !prev[sessionId],
                              }))
                            }
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                            />
                            <span className="text-xs font-semibold text-green-400">
                              SESSION — {fmtTs(session.session_start)}
                            </span>
                            {isActive ? (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">
                                {formatDuration(session.duration_seconds)}
                              </span>
                            )}
                            {meta && (
                              <span className="text-[10px] text-slate-500 font-normal ml-auto">
                                {String(meta.browser ?? '')} · {String(meta.device_type ?? '')} · {String(meta.os ?? '')}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-600 shrink-0">
                              {sessionEvents.length} event{sessionEvents.length !== 1 ? 's' : ''}
                            </span>
                          </button>

                          {/* Expanded event list */}
                          {isExpanded && (
                            <div className="border-t border-white/5 divide-y divide-white/5">
                              {sessionEvents.length === 0 ? (
                                <div className="px-3 py-3 text-[11px] text-slate-500 italic">
                                  No events recorded in this session.
                                </div>
                              ) : (
                                sessionEvents.map((event, j) => {
                                  const { icon, text } = describeEvent(event);
                                  return (
                                    <div
                                      key={event.id ?? `ev-${i}-${j}`}
                                      className="flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300"
                                    >
                                      <span className="shrink-0 w-5 text-center text-base leading-none">
                                        {icon}
                                      </span>
                                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                                        {fmtExactTime(event.occurred_at)}
                                      </span>
                                      <span className="flex-1">{text}</span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {memberSubTab === 'insights' && (
                <div className="space-y-4">
                  {memberDataLoading ? (
                    <div className="py-8 text-center text-slate-500 text-xs animate-pulse">
                      Loading insights...
                    </div>
                  ) : memberSessions.length === 0 && memberEvents.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No tracking data yet for this member.
                    </div>
                  ) : (
                    <>
                      {/* Session quality */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                          { label: 'Sessions', value: memberSessions.length, color: 'text-blue-400' },
                          {
                            label: 'Avg Duration',
                            value: mAvgSessionSecs < 60 ? `${mAvgSessionSecs}s` : `${Math.round(mAvgSessionSecs / 60)}m`,
                            color: 'text-green-400',
                          },
                          {
                            label: 'Bounce Rate',
                            value: `${mBounceRate}%`,
                            color: mBounceRate > 30 ? 'text-red-400' : 'text-orange-400',
                          },
                          {
                            label: 'Avg Page Load',
                            value: mAvgPageLoadMs ? `${mAvgPageLoadMs}ms` : '—',
                            color: mAvgPageLoadMs && mAvgPageLoadMs > 3000 ? 'text-red-400' : 'text-purple-400',
                          },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-slate-700/50 rounded-xl p-3 border border-white/5">
                            <div className={`text-xl font-bold ${color}`}>{value}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Device / Browser / OS */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {[
                          { title: 'Device', counts: mDeviceCounts, max: mMaxDevice, color: '#3b82f6' },
                          { title: 'Browser', counts: mBrowserCounts, max: mMaxBrowser, color: '#8b5cf6' },
                          { title: 'OS', counts: mOsCounts, max: mMaxOs, color: '#10b981' },
                        ].map(({ title, counts, max, color }) => (
                          <div key={title} className="bg-slate-800 rounded-xl p-3 border border-white/5">
                            <h4 className="text-xs font-semibold text-slate-300 mb-2.5">{title}</h4>
                            {Object.keys(counts).length === 0 ? (
                              <p className="text-xs text-slate-500">No data.</p>
                            ) : (
                              <div className="space-y-2">
                                {Object.entries(counts)
                                  .sort((a, b) => b[1] - a[1])
                                  .map(([k, v]) => (
                                    <BarRow
                                      key={k}
                                      label={k.charAt(0).toUpperCase() + k.slice(1)}
                                      value={v}
                                      max={max}
                                      color={color}
                                    />
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Login timing */}
                      <div className="bg-slate-800 rounded-xl p-3 border border-white/5">
                        <h4 className="text-xs font-semibold text-slate-300 mb-3">Login Timing — by Hour of Day</h4>
                        {mLoginByHour.every(c => c === 0) ? (
                          <p className="text-xs text-slate-500">No login events yet.</p>
                        ) : (
                          <div className="flex items-end gap-0.5 h-12">
                            {mLoginByHour.map((count, h) => (
                              <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
                                <div
                                  className="w-full bg-orange-500/70 rounded-sm transition-all"
                                  style={{ height: `${(count / mMaxLoginHour) * 36}px` }}
                                  title={`${h}:00 — ${count} logins`}
                                />
                                {h % 6 === 0 && (
                                  <span className="text-[8px] text-slate-600">{h}h</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Course read depth */}
                      <div className="bg-slate-800 rounded-xl p-3 border border-white/5">
                        <h4 className="text-xs font-semibold text-slate-300 mb-1">Course Read Depth</h4>
                        <p className="text-[10px] text-slate-500 mb-3">
                          Avg time spent reading each course detail modal.
                        </p>
                        {mModalList.length === 0 ? (
                          <p className="text-xs text-slate-500">No modal duration data yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {mModalList.map((m, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 w-4">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-slate-200 truncate">{m.name}</div>
                                  <div className="h-1 rounded-full bg-slate-700 mt-0.5">
                                    <div
                                      className="h-full rounded-full bg-cyan-500"
                                      style={{ width: `${(m.avgSec / mMaxModalSec) * 100}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-xs text-slate-300">{m.avgSec}s avg</div>
                                  <div className="text-[10px] text-slate-500">{m.opens} opens</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Dead-end filters + Calendar/Export */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="bg-slate-800 rounded-xl p-3 border border-white/5">
                          <h4 className="text-xs font-semibold text-slate-300 mb-1">Dead-end Filters</h4>
                          <p className="text-[10px] text-slate-500 mb-3">Filter combos that returned zero courses.</p>
                          {mDeadEndList.length === 0 ? (
                            <p className="text-xs text-slate-500">None hit.</p>
                          ) : (
                            <div className="space-y-2">
                              {mDeadEndList.map(([combo, count]) => (
                                <BarRow key={combo} label={combo} value={count} max={mMaxDeadEnd} color="#ef4444" />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="bg-slate-800 rounded-xl p-3 border border-white/5">
                          <h4 className="text-xs font-semibold text-slate-300 mb-3">Calendar & Exports</h4>
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Calendar fetches</span>
                              <span className="text-slate-200 font-semibold">{mCalendarAccesses}</span>
                            </div>
                            {Object.keys(mExportCounts).length > 0 && (
                              <div className="pt-2 border-t border-white/5 space-y-2">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
                                  Export type
                                </p>
                                {Object.entries(mExportCounts)
                                  .sort((a, b) => b[1] - a[1])
                                  .map(([type, count]) => (
                                    <BarRow key={type} label={type} value={count} max={mMaxExport} color="#f97316" />
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {memberSubTab === 'security' && (
                <div className="space-y-4">
                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-semibold text-slate-300 mb-3">JS Errors</h4>
                    {jsErrors.length === 0 ? (
                      <p className="text-xs text-slate-500">None detected.</p>
                    ) : (
                      <div className="space-y-2">
                        {jsErrors.map((e, i) => {
                          const p = e.payload as Record<string, unknown>;
                          return (
                            <div key={i} className="bg-slate-700/40 rounded-lg px-3 py-2 text-xs">
                              <div className="text-red-400 font-medium truncate">
                                {String(p?.message ?? '').slice(0, 120)}
                              </div>
                              <div className="text-slate-500 mt-0.5 text-[10px]">
                                {String(p?.filename ?? '')} · {fmtTs(e.occurred_at)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-semibold text-slate-300 mb-3">Rage Clicks</h4>
                    {rageClicks.length === 0 ? (
                      <p className="text-xs text-slate-500">None detected.</p>
                    ) : (
                      <div className="space-y-2">
                        {rageClicks.map((e, i) => {
                          const p = e.payload as Record<string, unknown>;
                          return (
                            <div key={i} className="flex items-center gap-3 text-xs text-slate-300">
                              <span className="text-orange-400 font-medium">
                                {String(p?.element_text ?? '').slice(0, 40)}
                              </span>
                              <span className="text-slate-500">{String(p?.click_count ?? '')}x clicks</span>
                              <span className="ml-auto text-[10px] text-slate-500">
                                {fmtTs(e.occurred_at)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-semibold text-slate-300 mb-3">Session Anomalies</h4>
                    {sessionAnomalies.length === 0 ? (
                      <p className="text-xs text-slate-500">None detected.</p>
                    ) : (
                      <div className="space-y-2">
                        {sessionAnomalies.map(({ label, session }, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs">
                            <span className="text-yellow-400 font-medium">{label}</span>
                            <span className="text-slate-500">{fmtTs(session.session_start)}</span>
                            {session.duration_seconds !== null && (
                              <span className="text-slate-500">
                                {formatDuration(session.duration_seconds)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isSuperAdmin && (
                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <h4 className="text-xs font-semibold text-slate-300 mb-3">Viewed by Admins</h4>
                      {adminViewLogs.length === 0 ? (
                        <p className="text-xs text-slate-500">No admin views recorded.</p>
                      ) : (
                        <div className="space-y-2">
                          {adminViewLogs.map((log, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs text-slate-300">
                              <span className="font-medium">{log.actor_name}</span>
                              <span className="ml-auto text-[10px] text-slate-500">
                                {fmtTs(log.occurred_at)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ACTIVITY TAB ── */}
          {tab === 'activity' && (
            <div className="p-4 space-y-6">
              <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Daily Active Users — Last 7 Days
                </h3>
                {sessions.length === 0 ? (
                  <p className="text-xs text-slate-500">No session data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {dauData.map(({ date, count }) => (
                      <div key={date} className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 w-20 shrink-0">
                          {new Date(date + 'T12:00:00').toLocaleDateString('en', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all"
                            style={{ width: `${(count / maxDau) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-300 w-4 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                  <h3 className="text-sm font-semibold text-slate-200 mb-4">Feature Usage</h3>
                  {sortedEventTypes.length === 0 ? (
                    <p className="text-xs text-slate-500">No events tracked yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {sortedEventTypes.map(([type, count]) => (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-36 shrink-0 truncate">
                            {EVENT_LABELS[type] ?? type}
                          </span>
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-orange-500 transition-all"
                              style={{ width: `${(count / maxEventCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-300 w-8 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">Most Viewed Courses</h3>
                  {topViewedCourses.length === 0 ? (
                    <p className="text-xs text-slate-500">No course views tracked yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {topViewedCourses.map(({ course, views }, i) => {
                        const spec = SPECS.find(s => course.specs.includes(s.id));
                        return (
                          <div key={course.id} className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-slate-200 truncate">{course.name}</div>
                              <div className="h-1 rounded-full bg-slate-700 mt-0.5">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(views / maxViews) * 100}%`,
                                    backgroundColor: spec?.color ?? '#64748b',
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-slate-300 shrink-0">{views}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {(() => {
                function handleEngagementSort(col: EngagementSortCol) {
                  setEngagementSort(prev =>
                    prev.col === col
                      ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                      : { col, dir: col === 'member' ? 'asc' : 'desc' },
                  );
                }
                function SortIcon({ col }: { col: EngagementSortCol }) {
                  if (engagementSort.col !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-40" />;
                  return engagementSort.dir === 'asc'
                    ? <ArrowUp className="w-3 h-3 ml-1 text-orange-400" />
                    : <ArrowDown className="w-3 h-3 ml-1 text-orange-400" />;
                }
                function fmtVisitDate(ts: string) {
                  return new Date(ts).toLocaleDateString('en', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                }
                const sorted = profiles
                  .map(p => ({ p, stats: userSessionStats.get(p.id) }))
                  .sort((a, b) => {
                    const { col, dir } = engagementSort;
                    let cmp = 0;
                    if (col === 'member') {
                      const na = (a.p.name || a.p.email.split('@')[0]).toLowerCase();
                      const nb = (b.p.name || b.p.email.split('@')[0]).toLowerCase();
                      cmp = na.localeCompare(nb);
                    } else if (col === 'lastVisit') {
                      cmp = (a.stats?.lastVisit ?? '').localeCompare(b.stats?.lastVisit ?? '');
                    } else if (col === 'lastActivity') {
                      cmp = (a.stats?.lastActivity ?? '').localeCompare(b.stats?.lastActivity ?? '');
                    } else if (col === 'sessions') {
                      cmp = (a.stats?.totalSessions ?? 0) - (b.stats?.totalSessions ?? 0);
                    } else if (col === 'avgDuration') {
                      cmp = (a.stats?.avgMinutes ?? 0) - (b.stats?.avgMinutes ?? 0);
                    }
                    return dir === 'asc' ? cmp : -cmp;
                  });
                return (
                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <h3 className="text-sm font-semibold text-slate-200 mb-4">Member Engagement</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500 border-b border-white/5">
                            <th className="text-left py-2 pr-4 font-medium">
                              <button onClick={() => handleEngagementSort('member')} className="flex items-center hover:text-slate-300 transition-colors">
                                Member<SortIcon col="member" />
                              </button>
                            </th>
                            <th className="text-left py-2 pr-4 font-medium">
                              <button onClick={() => handleEngagementSort('lastVisit')} className="flex items-center hover:text-slate-300 transition-colors">
                                Last Visit<SortIcon col="lastVisit" />
                              </button>
                            </th>
                            <th className="text-left py-2 pr-4 font-medium">
                              <button onClick={() => handleEngagementSort('lastActivity')} className="flex items-center hover:text-slate-300 transition-colors">
                                Last Activity<SortIcon col="lastActivity" />
                              </button>
                            </th>
                            <th className="text-right py-2 pr-4 font-medium">
                              <button onClick={() => handleEngagementSort('sessions')} className="flex items-center justify-end w-full hover:text-slate-300 transition-colors">
                                Sessions<SortIcon col="sessions" />
                              </button>
                            </th>
                            <th className="text-right py-2 font-medium">
                              <button onClick={() => handleEngagementSort('avgDuration')} className="flex items-center justify-end w-full hover:text-slate-300 transition-colors">
                                Avg Duration<SortIcon col="avgDuration" />
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {sorted.map(({ p, stats }) => (
                            <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                              <td className="py-2 pr-4">
                                <button
                                  onClick={() => {
                                    setSelectedMember(p);
                                    setTab('member');
                                    setExpandedCourse(null);
                                    setMemberSubTab('courses');
                                  }}
                                  className="text-slate-200 hover:text-orange-300 transition-colors text-left"
                                >
                                  {p.name || p.email.split('@')[0]}
                                </button>
                              </td>
                              <td className="py-2 pr-4 text-slate-400">
                                {stats?.lastVisit ? fmtVisitDate(stats.lastVisit) : '—'}
                              </td>
                              <td className="py-2 pr-4 text-slate-400">
                                {stats?.lastActivity ? fmtVisitDate(stats.lastActivity) : '—'}
                              </td>
                              <td className="py-2 pr-4 text-right text-slate-300">
                                {stats?.totalSessions ?? 0}
                              </td>
                              <td className="py-2 text-right text-slate-300">
                                {stats?.avgMinutes ? `${stats.avgMinutes}m` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── INSIGHTS TAB ── */}
          {tab === 'insights' && (
            <div className="p-4 space-y-6">
              {/* Landing page funnel */}
              {(() => {
                const total = landingSessions.length;
                const ringSessions = landingSessions.filter(s => s.first_ring_interaction_at);
                const emailSessions = landingSessions.filter(s => s.login_attempted);
                const convertedSessions = landingSessions.filter(s => s.login_succeeded);
                const ringRate = total > 0 ? Math.round((ringSessions.length / total) * 100) : 0;
                const attemptRate = total > 0 ? Math.round((emailSessions.length / total) * 100) : 0;
                const conversionRate = total > 0 ? Math.round((convertedSessions.length / total) * 100) : 0;

                const converterMs = convertedSessions.filter(s => s.ring_interaction_ms > 0);
                const abandonderMs = landingSessions.filter(s => !s.login_succeeded && s.ring_interaction_ms > 0);
                const avgConverterSec = converterMs.length
                  ? Math.round(converterMs.reduce((a, s) => a + s.ring_interaction_ms, 0) / converterMs.length / 1000)
                  : null;
                const avgAbandonerSec = abandonderMs.length
                  ? Math.round(abandonderMs.reduce((a, s) => a + s.ring_interaction_ms, 0) / abandonderMs.length / 1000)
                  : null;

                // Build profile lookup from already-loaded profiles state
                const profileMap = new Map(profiles.map(p => [p.id, p]));

                const funnelCards: { key: 'total' | 'ring' | 'email' | 'converted'; label: string; value: string | number; color: string; sessions: LandingSession[] }[] = [
                  { key: 'total', label: 'Total Visits', value: total, color: 'text-blue-400', sessions: landingSessions },
                  { key: 'ring', label: 'Touched Ring', value: total > 0 ? `${ringSessions.length} (${ringRate}%)` : '—', color: 'text-orange-400', sessions: ringSessions },
                  { key: 'email', label: 'Entered Email', value: total > 0 ? `${emailSessions.length} (${attemptRate}%)` : '—', color: 'text-yellow-400', sessions: emailSessions },
                  { key: 'converted', label: 'Logged In', value: total > 0 ? `${convertedSessions.length} (${conversionRate}%)` : '—', color: total > 0 && convertedSessions.length / total > 0.5 ? 'text-green-400' : 'text-red-400', sessions: convertedSessions },
                ];

                const expandedSessions = funnelCards.find(c => c.key === expandedFunnelCard)?.sessions ?? [];

                function fmtAgo(ts: string) {
                  const diff = Date.now() - new Date(ts).getTime();
                  const m = Math.floor(diff / 60000);
                  if (m < 60) return `${m}m ago`;
                  const h = Math.floor(m / 60);
                  if (h < 24) return `${h}h ago`;
                  return `${Math.floor(h / 24)}d ago`;
                }

                return (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-3">Landing Page Funnel</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      {funnelCards.map(({ key, label, value, color }) => {
                        const isExpanded = expandedFunnelCard === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setExpandedFunnelCard(isExpanded ? null : key)}
                            className={`bg-slate-800 rounded-xl p-4 border text-left transition-all ${isExpanded ? 'border-white/20 ring-1 ring-white/10' : 'border-white/5 hover:border-white/10'}`}
                          >
                            <div className={`text-2xl font-bold ${color}`}>{value}</div>
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                              {label}
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Expanded session list */}
                    {expandedFunnelCard && (
                      <div className="bg-slate-800/60 rounded-xl border border-white/5 overflow-hidden mb-3">
                        <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                            {funnelCards.find(c => c.key === expandedFunnelCard)?.label} — {expandedSessions.length} {expandedSessions.length === 1 ? 'session' : 'sessions'}
                          </span>
                          <button onClick={() => setExpandedFunnelCard(null)} className="text-slate-500 hover:text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {expandedSessions.length === 0 ? (
                          <p className="text-slate-500 text-xs p-4">No sessions in this stage yet.</p>
                        ) : (
                          <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                            {expandedSessions.map(s => {
                              const profile = s.user_id ? profileMap.get(s.user_id) : null;
                              const ringSec = s.ring_interaction_ms > 0 ? Math.round(s.ring_interaction_ms / 1000) : null;
                              const statusBadge = s.login_succeeded
                                ? { label: 'Converted', cls: 'bg-green-500/15 text-green-400' }
                                : s.login_attempted
                                ? { label: 'Entered email', cls: 'bg-yellow-500/15 text-yellow-400' }
                                : s.first_ring_interaction_at
                                ? { label: 'Played ring', cls: 'bg-orange-500/15 text-orange-400' }
                                : { label: 'Browsed', cls: 'bg-slate-700 text-slate-400' };

                              return (
                                <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                                  {/* Avatar */}
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${profile ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-500'}`}>
                                    {profile ? profile.name.charAt(0).toUpperCase() : '?'}
                                  </div>

                                  {/* Main info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[13px] font-medium text-slate-200 truncate">
                                        {profile ? profile.name : 'Anonymous visitor'}
                                      </span>
                                      {profile && (
                                        <span className="text-[11px] text-slate-500 truncate">{profile.email}</span>
                                      )}
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusBadge.cls}`}>
                                        {statusBadge.label}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      {ringSec !== null && (
                                        <span className="text-[11px] text-slate-500">Ring {ringSec}s</span>
                                      )}
                                      {s.device_type && (
                                        <span className="text-[11px] text-slate-600">{s.browser} · {s.device_type}</span>
                                      )}
                                      <span className="text-[11px] text-slate-600">{fmtAgo(s.landed_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {(avgConverterSec !== null || avgAbandonerSec !== null) && (
                      <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                        <p className="text-[11px] text-slate-400 mb-3 font-medium">Avg ring play time</p>
                        <div className="flex gap-6">
                          {avgConverterSec !== null && (
                            <div>
                              <span className="text-green-400 font-bold text-lg">{avgConverterSec}s</span>
                              <span className="text-slate-500 text-[11px] ml-1.5">converters</span>
                            </div>
                          )}
                          {avgAbandonerSec !== null && (
                            <div>
                              <span className="text-red-400 font-bold text-lg">{avgAbandonerSec}s</span>
                              <span className="text-slate-500 text-[11px] ml-1.5">abandoners</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {sessions.length === 0 && events.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">
                  No tracking data collected yet — come back once students have used the planner.
                </div>
              ) : (
                <>
                  {/* Session quality stats */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-3">Session Quality</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'Total Sessions', value: sessions.length, color: 'text-blue-400' },
                        {
                          label: 'Avg Duration',
                          value: avgSessionSecs < 60
                            ? `${avgSessionSecs}s`
                            : `${Math.round(avgSessionSecs / 60)}m`,
                          color: 'text-green-400',
                        },
                        { label: 'Bounce Rate', value: `${bounceRate}%`, color: bounceRate > 30 ? 'text-red-400' : 'text-orange-400' },
                        {
                          label: 'Avg Page Load',
                          value: avgPageLoadMs ? `${avgPageLoadMs}ms` : '—',
                          color: avgPageLoadMs && avgPageLoadMs > 3000 ? 'text-red-400' : 'text-purple-400',
                        },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-slate-800 rounded-xl p-4 border border-white/5">
                          <div className={`text-2xl font-bold ${color}`}>{value}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Device, Browser, OS breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <h4 className="text-xs font-semibold text-slate-300 mb-3">Device Type</h4>
                      {Object.keys(deviceCounts).length === 0 ? (
                        <p className="text-xs text-slate-500">No data yet.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {Object.entries(deviceCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([type, count]) => (
                              <BarRow
                                key={type}
                                label={type.charAt(0).toUpperCase() + type.slice(1)}
                                value={count}
                                max={maxDevice}
                                color="#3b82f6"
                              />
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <h4 className="text-xs font-semibold text-slate-300 mb-3">Browser</h4>
                      {Object.keys(browserCounts).length === 0 ? (
                        <p className="text-xs text-slate-500">No data yet.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {Object.entries(browserCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([browser, count]) => (
                              <BarRow key={browser} label={browser} value={count} max={maxBrowser} color="#8b5cf6" />
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <h4 className="text-xs font-semibold text-slate-300 mb-3">Operating System</h4>
                      {Object.keys(osCounts).length === 0 ? (
                        <p className="text-xs text-slate-500">No data yet.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {Object.entries(osCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([os, count]) => (
                              <BarRow key={os} label={os} value={count} max={maxOs} color="#10b981" />
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Login timing by hour */}
                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <h3 className="text-sm font-semibold text-slate-200 mb-4">
                      Login Timing — by Hour of Day
                    </h3>
                    {loginByHour.every(c => c === 0) ? (
                      <p className="text-xs text-slate-500">No login events yet.</p>
                    ) : (
                      <div className="flex items-end gap-0.5 h-16">
                        {loginByHour.map((count, h) => (
                          <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
                            <div
                              className="w-full bg-orange-500/70 rounded-sm transition-all"
                              style={{ height: `${(count / maxLoginHour) * 48}px` }}
                              title={`${h}:00 — ${count} logins`}
                            />
                            {h % 6 === 0 && (
                              <span className="text-[8px] text-slate-600">{h}h</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Course read depth vs quick glance */}
                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <h3 className="text-sm font-semibold text-slate-200 mb-1">
                      Course Read Depth
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-4">
                      Average time spent reading each course detail modal — shows genuine interest beyond just opening it.
                    </p>
                    {modalList.length === 0 ? (
                      <p className="text-xs text-slate-500">No modal duration data yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {modalList.map((m, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-slate-200 truncate">{m.name}</div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <div className="h-1 rounded-full flex-1 bg-slate-700">
                                  <div
                                    className="h-full rounded-full bg-cyan-500"
                                    style={{ width: `${(m.avgSec / maxModalSec) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs text-slate-300">{m.avgSec}s avg</div>
                              <div className="text-[10px] text-slate-500">{m.opens} opens</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dead-end filter combos + Calendar/Export */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <h3 className="text-sm font-semibold text-slate-200 mb-1">
                        Dead-end Filter Combos
                      </h3>
                      <p className="text-[10px] text-slate-500 mb-4">
                        Filter combinations that returned zero courses — potential UX issues.
                      </p>
                      {deadEndList.length === 0 ? (
                        <p className="text-xs text-slate-500">No dead-end filters hit yet.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {deadEndList.map(([combo, count]) => (
                            <BarRow
                              key={combo}
                              label={combo}
                              value={count}
                              max={maxDeadEnd}
                              color="#ef4444"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <h3 className="text-sm font-semibold text-slate-200 mb-4">
                        Calendar & Export Usage
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Calendar subscribers</span>
                          <span className="text-slate-200 font-semibold">
                            {calendarAccessorIds.size} / {profiles.length} members
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Total calendar fetches</span>
                          <span className="text-slate-200 font-semibold">{calendarTotalAccesses}</span>
                        </div>
                        {Object.keys(exportCounts).length > 0 && (
                          <div className="pt-2 border-t border-white/5 space-y-2.5">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
                              Export type breakdown
                            </p>
                            {Object.entries(exportCounts)
                              .sort((a, b) => b[1] - a[1])
                              .map(([type, count]) => (
                                <BarRow
                                  key={type}
                                  label={type}
                                  value={count}
                                  max={maxExport}
                                  color="#f97316"
                                />
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rage click hotspots + JS errors across cohort */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <h3 className="text-sm font-semibold text-slate-200 mb-1">
                        Rage Click Hotspots
                      </h3>
                      <p className="text-[10px] text-slate-500 mb-4">
                        UI elements that frustrate users across the whole cohort.
                      </p>
                      {rageClickList.length === 0 ? (
                        <p className="text-xs text-slate-500">No rage clicks detected — good UX!</p>
                      ) : (
                        <div className="space-y-2.5">
                          {rageClickList.map(([element, count]) => (
                            <BarRow
                              key={element}
                              label={element || '(empty)'}
                              value={count}
                              max={maxRageClick}
                              color="#f59e0b"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <h3 className="text-sm font-semibold text-slate-200 mb-1">
                        JS Error Log
                      </h3>
                      <p className="text-[10px] text-slate-500 mb-4">
                        Errors across all users, de-duplicated by message.
                      </p>
                      {jsErrorList.length === 0 ? (
                        <p className="text-xs text-slate-500">No JS errors recorded — great!</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {jsErrorList.map(([msg, { count, users, lastSeen }]) => (
                            <div key={msg} className="bg-slate-700/40 rounded-lg px-3 py-2 text-xs">
                              <div className="text-red-400 font-medium truncate">{msg}</div>
                              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-500">
                                <span>{count}× total</span>
                                <span>{users.size} user{users.size !== 1 ? 's' : ''}</span>
                                <span>last: {fmtRelative(lastSeen)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'member' && !selectedMember && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500 text-sm gap-2">
              <Users className="w-10 h-10 text-slate-700" />
              <p>Select a member from the list to view their plan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
