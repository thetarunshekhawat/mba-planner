'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ALL_COURSES, SPECS } from '@/data/courses';
import type { Profile, SpecId, Course } from '@/types';
import { Search, Users, BookOpen, TrendingUp, ChevronRight, ChevronDown, ArrowLeft, X, Clock, ArrowUp, ArrowDown, ChevronsUpDown, MessageSquare, Sparkles, AlertTriangle, MousePointerClick, Copy, Zap, BarChart2, User2, Bell } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useRouter } from 'next/navigation';
import { AskAiPanel } from './AskAiPanel';
import { MetricsPanel } from './MetricsPanel';
import { fetchAllRows } from '@/lib/alerts/paging';
import { AlertsAdminPanel } from './AlertsAdminPanel';

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

interface ChatbotMsgRow {
  user_id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  course_code: string | null;
  intent: string | null;
  model: string | null;
  latency_ms: number | null;
  created_at: string;
}

interface FriendshipRow {
  viewer_id: string;
  friend_id: string;
  created_by: string | null;
  created_at: string;
}

interface AdminAiQueryRow {
  id: string;
  actor_id: string | null;
  question: string;
  generated_sql: string | null;
  row_count: number | null;
  error: string | null;
  created_at: string;
}

interface GroupedSession {
  session: SessionRow;
  events: EventRow[];
}

type Tab = 'overview' | 'member' | 'activity' | 'insights' | 'in-depth' | 'chatbot' | 'ask-ai' | 'alerts';
type MemberSubTab = 'courses' | 'activity' | 'security' | 'insights';
type InsightsSubTab = 'overview' | 'metrics';


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
  mobile_drawer_toggled: 'Mobile Drawer Toggled',
  mobile_drawer_spec_tapped: 'Mobile Drawer Spec Tapped',
  term1_panel_toggled: 'Term 1 Panel Toggled',
  admin_dashboard_accessed: 'Admin Dashboard Accessed',
  friend_tab_opened: 'Friends Tab Opened',
  friend_code_copied: 'Friend Code Copied',
  friend_code_regenerated: 'Friend Code Regenerated',
  friend_add_attempted: 'Friend Add Attempted',
  friend_added: 'Friend Added',
  friend_add_failed: 'Friend Add Failed',
  friend_removed: 'Friend Removed',
  friend_detail_viewed: 'Friend Detail Viewed',
  friend_overlay_toggled: 'Friend Overlay Toggled',
  friend_overlay_cleared: 'Friend Overlay Cleared',
  friend_overlay_conflict_detected: 'Friend Schedule Clash',
  chatbot_opened: 'AI Chat Opened',
  chatbot_closed: 'AI Chat Closed',
  chatbot_new_chat: 'AI Chat New Thread',
  chatbot_message_sent: 'AI Chat Message Sent',
  chatbot_disambiguation_shown: 'AI Chat Course Prompt',
  chatbot_chip_clicked: 'AI Chat Course Picked',
  chatbot_answer_received: 'AI Chat Answer',
  chatbot_error: 'AI Chat Error',
  chatbot_rate_limited: 'AI Chat Rate-limited',
  // Alerts — competition & deadline reminders
  alerts_tab_opened: 'Alerts Tab Opened',
  alert_competition_add_opened: 'Add Competition Opened',
  alert_competition_url_submitted: 'Unstop Link Submitted',
  alert_competition_import_failed: 'Competition Import Failed',
  alert_competition_imported: 'Competition Added (private)',
  alert_competition_published: 'Competition Published (cohort)',
  alert_competition_tracked: 'Competition Tracked',
  alert_track_failed: 'Track Failed',
  alert_competition_untracked: 'Competition Untracked',
  alert_notifications_toggled: 'Competition Notifications Toggled',
  alert_round_expanded: 'Round Expanded',
  alert_card_expanded: 'Competition Card Expanded',
  alert_competition_requested: 'Non-Unstop Competition Requested',
  alert_competition_request_failed: 'Competition Request Failed',
  alert_round_link_clicked: 'Round Link Clicked',
  alert_reminder_sheet_opened: 'Reminder Settings Opened',
  alert_reminder_offset_toggled: 'Reminder Offset Toggled',
  alert_reminder_absolute_set: 'Absolute Reminder Set',
  alert_reminder_absolute_cleared: 'Absolute Reminder Removed',
  alert_elimination_prompt_shown: 'Elimination Prompt Shown',
  alert_elimination_passed: 'Declared Cleared Round',
  alert_elimination_failed: 'Declared Eliminated',
  alert_elimination_undone: 'Elimination Undone',
  alert_custom_deadline_opened: 'Add Deadline Opened',
  alert_custom_deadline_added: 'Deadline Added',
  alert_custom_deadline_completed: 'Deadline Completed',
  alert_custom_deadline_deleted: 'Deadline Deleted',
  alert_inbox_opened: 'Alert Inbox Opened',
  alert_inbox_item_clicked: 'Alert Opened',
  alert_push_prompt_shown: 'Push Permission Requested',
  alert_push_enabled: 'Push Enabled',
  alert_push_denied: 'Push Denied',
  alert_push_test_sent: 'Test Notification Sent',
  alert_push_repaired: 'Push Subscription Repaired',
  alert_push_ios_instructions_shown: 'iOS Install Instructions Shown',
  schedule_commitment_clicked: 'Deadline Opened From Schedule',
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
    case 'sidebar_toggled':           return { icon: '☰', text: `${p?.open ? 'Opened' : 'Closed'} filter sidebar (mobile)` };
    case 'mobile_drawer_toggled':     return { icon: '📱', text: `${p?.open ? 'Opened' : 'Closed'} mobile drawer${!p?.has_specs ? ' (no specs yet)' : ''}` };
    case 'mobile_drawer_spec_tapped': return { icon: '🎯', text: `Tapped ${p?.spec} spec in mobile drawer` };
    case 'term1_panel_toggled':       return { icon: '📚', text: `${p?.show ? 'Opened' : 'Closed'} Term 1 courses panel` };
    case 'admin_dashboard_accessed':  return { icon: '🛡', text: 'Navigated to admin dashboard' };
    case 'friend_tab_opened':         return { icon: '👥', text: 'Opened Friends tab' };
    case 'friend_code_copied':        return { icon: '📋', text: 'Copied their friend code' };
    case 'friend_code_regenerated':   return { icon: '🔄', text: 'Regenerated friend code' };
    case 'friend_add_attempted':      return { icon: '➕', text: `Tried friend code ${String(p?.code ?? '')}` };
    case 'friend_added':              return { icon: '🤝', text: `Added friend ${String(p?.friend_name ?? '')}`.trim() };
    case 'friend_add_failed':         return { icon: '⚠', text: `Friend add failed (${String(p?.reason ?? '')})` };
    case 'friend_removed':            return { icon: '➖', text: 'Removed a friend' };
    case 'friend_detail_viewed':      return { icon: '🔎', text: "Viewed a friend's detail" };
    case 'friend_overlay_toggled':    return { icon: '👁', text: `${p?.on ? 'Showed' : 'Hid'} a friend on schedule` };
    case 'friend_overlay_cleared':    return { icon: '🧹', text: 'Cleared friend overlays' };
    case 'friend_overlay_conflict_detected': return { icon: '⏰', text: `Clash: ${String(p?.friend_course ?? '')} vs ${String(p?.my_course ?? '')} (${String(p?.day ?? '')} ${String(p?.slot ?? '')})` };
    case 'chatbot_opened':            return { icon: '💬', text: 'Opened the AI course assistant' };
    case 'chatbot_closed':            return { icon: '💬', text: 'Closed the AI course assistant' };
    case 'chatbot_new_chat':          return { icon: '🆕', text: 'Started a new AI chat thread' };
    case 'chatbot_message_sent':      return { icon: '✨', text: 'Asked the AI assistant a question' };
    case 'chatbot_disambiguation_shown': return { icon: '❓', text: `AI asked which course (${Number(p?.options ?? 0)} options)` };
    case 'chatbot_chip_clicked':      return { icon: '👉', text: `Picked course ${String(p?.name ?? p?.code ?? '')}` };
    case 'chatbot_answer_received':   return { icon: '🤖', text: `AI answered (${String(p?.intent ?? '')})` };
    case 'chatbot_error':             return { icon: '🔴', text: `AI chat error${p?.status ? ` (${p.status})` : ''}` };
    case 'chatbot_rate_limited':      return { icon: '🚦', text: 'AI chat rate-limited' };
    case 'progress_basis_changed':    return { icon: '📊', text: `Progress basis → ${p?.basis === 'to-date' ? 'as of today' : 'full year'}` };
    case 'spec_overview_opened':      return { icon: '🧭', text: `Opened all-specializations view${Number(p?.bonus_complete ?? 0) > 0 ? ` (${p?.bonus_complete} bonus complete)` : ''}` };
    default:                          return { icon: '•', text: e.event_type };
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

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    fontSize: '12px',
  },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
};

function LoginTimingChart({ byHour }: { byHour: number[] }) {
  const data = byHour.map((logins, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    logins,
  }));
  const total = byHour.reduce((a, b) => a + b, 0);
  const peakHour = byHour.indexOf(Math.max(...byHour));
  const blocks = [
    { label: 'Night (0–6)', range: [0, 6], color: '#6366f1' },
    { label: 'Morning (6–12)', range: [6, 12], color: '#f97316' },
    { label: 'Afternoon (12–18)', range: [12, 18], color: '#eab308' },
    { label: 'Evening (18–24)', range: [18, 24], color: '#8b5cf6' },
  ];
  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="hour"
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            interval={5}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={24}
          />
          <Tooltip
            {...CHART_TOOLTIP_STYLE}
            formatter={(v: unknown) => [`${v} login${Number(v) !== 1 ? 's' : ''}`, '']}
          />
          <Line
            type="monotone"
            dataKey="logins"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ fill: '#f97316', r: 3, strokeWidth: 0 }}
            activeDot={{ fill: '#fb923c', r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {total > 0 && (
        <div className="flex flex-wrap gap-4 text-[10px] text-slate-500">
          <span>
            Peak:{' '}
            <span className="text-orange-400 font-semibold">
              {String(peakHour).padStart(2, '0')}:00–{String(peakHour + 1).padStart(2, '0')}:00
            </span>{' '}
            ({byHour[peakHour]} logins)
          </span>
          <span>Total: <span className="text-slate-300 font-semibold">{total}</span></span>
        </div>
      )}

      {total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {blocks.map(({ label, range, color }) => {
            const cnt = byHour.slice(range[0], range[1]).reduce((a, b) => a + b, 0);
            const pct = Math.round((cnt / total) * 100);
            return (
              <div key={label} className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-[9px] text-slate-400 mb-1">{label}</div>
                <div className="text-sm font-bold" style={{ color }}>{pct}%</div>
                <div className="text-[9px] text-slate-500">{cnt} logins</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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

// `fetchAllRows` now lives in lib/alerts/paging.ts — the alerts dispatcher hits
// the same silent 1000-row PostgREST cap, and one copy of the fix is better than
// two. See that file for why a plain .select() is a bug here.

// ── Distribution helpers for the Metrics tab ────────────────────────────────
export interface Dist {
  n: number; mean: number; median: number; q1: number; q3: number;
  iqr: number; p90: number; min: number; max: number;
}

/** Quantile by linear interpolation on a pre-sorted ascending array. */
function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function describe(values: number[]): Dist {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) {
    return { n: 0, mean: 0, median: 0, q1: 0, q3: 0, iqr: 0, p90: 0, min: 0, max: 0 };
  }
  const q1 = quantile(s, 0.25);
  const q3 = quantile(s, 0.75);
  return {
    n: s.length,
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    median: quantile(s, 0.5),
    q1,
    q3,
    iqr: q3 - q1,
    p90: quantile(s, 0.9),
    min: s[0],
    max: s[s.length - 1],
  };
}

const DAY_MS = 86_400_000;

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
  const [chatbotMessages, setChatbotMessages] = useState<ChatbotMsgRow[]>([]);
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
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
  const [expandedFunnelCard, setExpandedFunnelCard] = useState<'total' | 'ring' | 'email' | 'converted' | null>(null);

  // Per-member detail data
  const [memberSubTab, setMemberSubTab] = useState<MemberSubTab>('courses');
  const [insightsSubTab, setInsightsSubTab] = useState<InsightsSubTab>('overview');
  const [memberSessions, setMemberSessions] = useState<SessionRow[]>([]);
  const [memberEvents, setMemberEvents] = useState<EventRow[]>([]);
  const [memberDataLoading, setMemberDataLoading] = useState(false);
  const [adminViewLogs, setAdminViewLogs] = useState<{ actor_name: string; occurred_at: string }[]>([]);
  const adminViewLogsLoadedRef = useRef(false);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  type EngagementSortCol = 'member' | 'lastVisit' | 'lastActivity' | 'sessions' | 'avgDuration';
  const [engagementSort, setEngagementSort] = useState<{ col: EngagementSortCol; dir: 'asc' | 'desc' }>({ col: 'lastVisit', dir: 'desc' });

  const [specSort, setSpecSort] = useState<'count' | 'alpha'>('count');
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [courseListSort, setCourseListSort] = useState<'popular' | 'alpha'>('popular');
  // Dashboard-wide term filter. Course-scoped numbers (selections, popularity, member course
  // lists, the metrics distributions) all narrow to the chosen term; term-less facts such as
  // logins and sessions stay visible under every filter, otherwise the funnel would break.
  const [termFilter, setTermFilter] = useState<number | 'all'>('all');

  type InDepthSection = 'dau' | 'login-timing' | 'member-engagement' | 'user-status' | 'mobile-drawer' | 'term1-panel' | 'friends-social' | 'ai-chatbot' | 'admin-ai-activity';
  const [inDepthSection, setInDepthSection] = useState<InDepthSection | null>(null);
  const [adminAiQueries, setAdminAiQueries] = useState<AdminAiQueryRow[]>([]);
  const [adminAiExpanded, setAdminAiExpanded] = useState<string | null>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
  const [chatbotUserDrillOpen, setChatbotUserDrillOpen] = useState(false);
  const [expandedConvos, setExpandedConvos] = useState<Set<string>>(new Set());
  const [friendStatDrill, setFriendStatDrill] = useState<'connections' | 'mutual' | 'oneway' | 'members' | null>(null);
  const [friendInDepthDrill, setFriendInDepthDrill] = useState<'copy' | 'reset' | 'overlay' | 'clashes' | 'detail' | 'connections' | 'mutual' | 'oneway' | 'members' | null>(null);
  const [friendGraphExpanded, setFriendGraphExpanded] = useState(false);
  const [friendGraphHover, setFriendGraphHover] = useState<string | null>(null);
  const [friendGraphScale, setFriendGraphScale] = useState(1);
  const [friendGraphOffset, setFriendGraphOffset] = useState({ x: 0, y: 0 });
  const [friendGraphDragging, setFriendGraphDragging] = useState(false);
  const friendGraphDragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const [friendHistoryFilter, setFriendHistoryFilter] = useState<'all' | 'added' | 'removed'>('all');
  const [whitelistEmails, setWhitelistEmails] = useState<{ email: string; display_name: string }[]>([]);
  const [memberEngagementFilter, setMemberEngagementFilter] = useState<'all' | '7d' | '30d' | 'never'>('all');
  const [drawerSpecFilter, setDrawerSpecFilter] = useState<string>('all');
  const [drawerDateFilter, setDrawerDateFilter] = useState<'all' | '7d' | '30d'>('all');
  const [term1UsersExpanded, setTerm1UsersExpanded] = useState(false);

  type DauDrillType = 'today' | 'total' | 'avg7' | 'avg30' | 'peak';
  const [dauDrill, setDauDrill] = useState<DauDrillType | null>(null);
  const [loginTimingDate, setLoginTimingDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Audit tracking refs
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const sessionStartRef = useRef<number>(Date.now());
  const auditPrevTabRef = useRef<Tab>('overview');
  const auditTabOpenedAtRef = useRef<number>(Date.now());
  const auditPrevSubTabRef = useRef<MemberSubTab>('courses');
  const auditSubTabOpenedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    Promise.all([
      fetchAllRows<Profile>(() => supabase.from('profiles').select('*').order('id')),
      fetchAllRows<MemberSelection>(() =>
        supabase.from('course_selections').select('user_id, course_id').order('id')),
      supabase.from('cohort_whitelist').select('email, display_name'),
      supabase.rpc('get_user_last_sign_in'),
    ]).then(([p, s, { data: w }, { data: l }]) => {
      setProfiles(p);
      setSelections(s);
      setWhitelistEmails((w ?? []) as { email: string; display_name: string }[]);
      setLastSignIns((l ?? []) as LastSignInRow[]);
      setLoading(false);
    });
  }, []);

  // Reload landing funnel data every time Insights tab opens
  useEffect(() => {
    if (tab !== 'insights') return;
    fetchAllRows<LandingSession>(() => supabase
      .from('landing_sessions')
      .select('id, user_id, landed_at, first_ring_interaction_at, ring_interaction_ms, login_attempted, login_succeeded, abandoned, device_type, browser')
      .order('landed_at', { ascending: false })).then(setLandingSessions);
    fetchAllRows<FriendshipRow>(() => supabase
      .from('friendships')
      .select('viewer_id, friend_id, created_by, created_at')
      .order('created_at', { ascending: false })).then(setFriendships);
  }, [tab]);

  // Lazy-load analytics data when Activity, Insights, or In-Depth tab first opens
  useEffect(() => {
    if ((tab !== 'activity' && tab !== 'insights' && tab !== 'in-depth' && tab !== 'chatbot') || analyticsLoadedRef.current) return;
    analyticsLoadedRef.current = true;
    Promise.all([
      fetchAllRows<SessionRow>(() => supabase
        .from('user_sessions')
        .select('user_id, session_start, session_end, duration_seconds, metadata')
        .order('session_start', { ascending: false })),
      fetchAllRows<EventRow>(() => supabase
        .from('user_events')
        .select('user_id, event_type, payload, occurred_at')
        .order('occurred_at', { ascending: false })),
      fetchAllRows<ChatbotMsgRow>(() => supabase
        .from('chatbot_messages')
        .select('user_id, conversation_id, role, content, course_code, intent, model, latency_ms, created_at')
        .order('created_at', { ascending: false })),
    ]).then(([s, e, cm]) => {
      setSessions(s);
      setEvents(e);
      setChatbotMessages(cm);
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
      supabase
        .from('course_selections')
        .select('user_id, course_id')
        .eq('user_id', selectedMember.id),
    ]).then(([{ data: s }, { data: e }, { data: cs }]) => {
      setMemberSessions((s ?? []) as SessionRow[]);
      setMemberEvents((e ?? []) as EventRow[]);
      setSelections(prev => [
        ...prev.filter(r => r.user_id !== selectedMember.id),
        ...((cs ?? []) as MemberSelection[]),
      ]);
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

  // Load the Admin AI activity log when that In-Depth section opens (super-admin only).
  const loadAdminAiQueries = () => {
    supabase
      .from('admin_ai_queries')
      .select('id, actor_id, question, generated_sql, row_count, error, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => setAdminAiQueries((data ?? []) as AdminAiQueryRow[]));
  };

  useEffect(() => {
    if (tab === 'in-depth' && inDepthSection === 'admin-ai-activity' && isSuperAdmin) {
      loadAdminAiQueries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, inDepthSection, isSuperAdmin]);

  // ── Audit tracking useEffects ──────────────────────────────────────────────

  // Session lifecycle: start on mount, end on unmount + pagehide
  useEffect(() => {
    supabase.from('security_events').insert({
      actor_id: adminUserId,
      event_type: 'admin_session_start',
      payload: { session_id: sessionIdRef.current },
    }).then(() => {});

    const sid = sessionIdRef.current;
    const start = sessionStartRef.current;

    const handlePageHide = () => {
      navigator.sendBeacon(
        '/api/admin-sessions/end',
        new Blob(
          [JSON.stringify({ session_id: sid, actor_id: adminUserId, duration_seconds: Math.round((Date.now() - start) / 1000) })],
          { type: 'application/json' },
        ),
      );
    };
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      supabase.from('security_events').insert({
        actor_id: adminUserId,
        event_type: 'admin_session_end',
        payload: { session_id: sid, duration_seconds: Math.round((Date.now() - start) / 1000) },
      }).then(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tab change tracking
  useEffect(() => {
    const prev = auditPrevTabRef.current;
    if (prev === tab) return;
    const dwell = Math.round((Date.now() - auditTabOpenedAtRef.current) / 1000);
    supabase.from('security_events').insert({
      actor_id: adminUserId,
      event_type: 'admin_tab_changed',
      payload: { session_id: sessionIdRef.current, from: prev, to: tab, dwell_seconds: dwell },
    }).then(() => {});
    auditPrevTabRef.current = tab;
    auditTabOpenedAtRef.current = Date.now();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Member view tracking — fires when member or tab changes, cleanup fires member_left
  useEffect(() => {
    if (tab !== 'member' || !selectedMember) return;

    // Reset sub-tab refs for this fresh member view
    auditPrevSubTabRef.current = memberSubTab;
    auditSubTabOpenedAtRef.current = Date.now();

    supabase.from('security_events').insert({
      actor_id: adminUserId,
      event_type: 'admin_member_viewed',
      payload: { session_id: sessionIdRef.current, viewed_user_id: selectedMember.id, viewed_email: selectedMember.email, viewed_name: selectedMember.name },
    }).then(() => {});

    const openedAt = Date.now();
    const capturedId = selectedMember.id;
    const capturedName = selectedMember.name;

    return () => {
      supabase.from('security_events').insert({
        actor_id: adminUserId,
        event_type: 'admin_member_left',
        payload: { session_id: sessionIdRef.current, viewed_user_id: capturedId, viewed_name: capturedName, dwell_seconds: Math.round((Date.now() - openedAt) / 1000) },
      }).then(() => {});
    };
  }, [selectedMember?.id, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Member sub-tab tracking — must be after member tracking useEffect so the subtab reset fires first
  useEffect(() => {
    if (tab !== 'member' || !selectedMember) return;
    const prev = auditPrevSubTabRef.current;
    if (prev === memberSubTab) return;
    const dwell = Math.round((Date.now() - auditSubTabOpenedAtRef.current) / 1000);
    supabase.from('security_events').insert({
      actor_id: adminUserId,
      event_type: 'admin_member_subtab_changed',
      payload: { session_id: sessionIdRef.current, member_id: selectedMember.id, member_name: selectedMember.name, from: prev, to: memberSubTab, dwell_seconds: dwell },
    }).then(() => {});
    auditPrevSubTabRef.current = memberSubTab;
    auditSubTabOpenedAtRef.current = Date.now();
  }, [memberSubTab, tab, selectedMember?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // course_id -> term. The database stores only integer course ids, so term always has to be
  // resolved through the catalogue in data/courses.ts.
  const termOfCourse = new Map<number, number>(ALL_COURSES.map(c => [c.id, c.term]));
  const inTerm = (courseId: number) =>
    termFilter === 'all' || termOfCourse.get(courseId) === termFilter;

  const filteredSelections = termFilter === 'all'
    ? selections
    : selections.filter(s => inTerm(s.course_id));

  const selectionsByUser = new Map<string, Set<number>>();
  for (const s of filteredSelections) {
    if (!selectionsByUser.has(s.user_id)) selectionsByUser.set(s.user_id, new Set());
    selectionsByUser.get(s.user_id)!.add(s.course_id);
  }

  const membersWithSelections = profiles.filter(p => (selectionsByUser.get(p.id)?.size ?? 0) > 0).length;
  const avgSelections = profiles.length ? (filteredSelections.length / profiles.length).toFixed(1) : '0';

  const specCounts: Record<SpecId, number> = { FIN: 0, OPS: 0, ENT: 0, ECOM: 0, MKT: 0, LSTR: 0 };
  for (const p of profiles) {
    for (const s of p.specializations) specCounts[s as SpecId]++;
  }
  const maxSpecCount = Math.max(...Object.values(specCounts), 1);

  const courseCounts = new Map<number, number>();
  for (const s of filteredSelections) {
    courseCounts.set(s.course_id, (courseCounts.get(s.course_id) ?? 0) + 1);
  }
  const courseRanking = ALL_COURSES
    .filter(c => c.type === 'elective')
    .map(c => ({ course: c, count: courseCounts.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const termFilteredRanking = termFilter === 'all'
    ? courseRanking
    : courseRanking.filter(r => r.course.term === termFilter);
  const top10 = termFilteredRanking.slice(0, 10);
  const unpopular = termFilteredRanking.filter(r => r.count === 0);

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
    return profiles
      .filter(p => p.id !== selectedMember?.id && (selectionsByUser.get(p.id)?.has(courseId) ?? false))
      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
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

  // ── Never-logged-in + recently active ────────────────────────────────────────
  const profileEmails = new Set(profiles.map(p => p.email.toLowerCase()));
  const neverLoggedIn = whitelistEmails.filter(w => !profileEmails.has(w.email.toLowerCase()));
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const firstTimeLogins = profiles.filter(p => {
    const signIn = lastSignInMap.get(p.id);
    if (!signIn || signIn < sevenDaysAgo) return false;
    const userSessions = sessions.filter(s => s.user_id === p.id);
    if (userSessions.length === 0) return true; // has sign-in but no sessions yet
    const firstSession = userSessions.map(s => s.session_start).sort()[0];
    return firstSession > sevenDaysAgo;
  });

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
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

  // ── In-Depth: 30-day DAU + day-of-week pattern ────────────────────────────
  const dauData30 = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (29 - i));
    const dateStr = day.toISOString().slice(0, 10);
    const count = new Set(
      sessions.filter(s => s.session_start.slice(0, 10) === dateStr).map(s => s.user_id),
    ).size;
    return { date: dateStr, count };
  });
  const maxDau30 = Math.max(...dauData30.map(d => d.count), 1);

  const dowLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowBuckets: Record<number, { total: number; days: number }> = {};
  {
    const dateDowUsers = new Map<string, Set<string>>();
    for (const s of sessions) {
      const dateStr = s.session_start.slice(0, 10);
      if (!dateDowUsers.has(dateStr)) dateDowUsers.set(dateStr, new Set());
      dateDowUsers.get(dateStr)!.add(s.user_id);
    }
    for (const [dateStr, users] of dateDowUsers) {
      const dow = new Date(dateStr + 'T12:00').getDay();
      if (!dowBuckets[dow]) dowBuckets[dow] = { total: 0, days: 0 };
      dowBuckets[dow].total += users.size;
      dowBuckets[dow].days++;
    }
  }
  const dowAvgData = [1, 2, 3, 4, 5, 6, 0].map(dow => ({
    label: dowLabels[dow],
    avg: dowBuckets[dow] ? Math.round(dowBuckets[dow].total / dowBuckets[dow].days) : 0,
  }));
  const maxDowAvg = Math.max(...dowAvgData.map(d => d.avg), 1);

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
          <Logo size={28} className="rounded-lg flex-shrink-0" />
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
                  setSelectedMember(p);
                  setTab('member');
                  setExpandedCourse(null);
                  setMemberSubTab('courses');
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
              onClick={() => setTab('overview')}
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
              onClick={() => setTab('activity')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === 'activity' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setTab('insights')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === 'insights' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Insights
            </button>
            <button
              onClick={() => setTab('in-depth')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === 'in-depth' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              In-Depth
            </button>
            <button
              onClick={() => setTab('chatbot')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                tab === 'chatbot' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              AI Chatbot
            </button>
            <button
              onClick={() => setTab('ask-ai')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                tab === 'ask-ai' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Ask AI
            </button>
            <button
              onClick={() => setTab('alerts')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                tab === 'alerts' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell className="w-3 h-3" />
              Alerts
            </button>

            {/* Dashboard-wide term filter. Narrows every course-scoped number; session and
                login counts are term-less and stay as they are. */}
            <div className="ml-auto flex items-center gap-1.5 pl-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Term</span>
              {(['all', 4, 5, 6] as const).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setTermFilter(t);
                    setOverviewExpandedCourse(null);
                    setExpandedCourse(null);
                  }}
                  title={t === 'all'
                    ? 'Show course data from every term'
                    : `Show only Term ${t} course data (logins and sessions are unaffected)`}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    termFilter === t
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-800'
                  }`}
                >
                  {t === 'all' ? 'All' : t}
                </button>
              ))}
            </div>
          </div>

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && (
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: Users, label: 'Total Members', value: profiles.length, color: 'text-blue-400' },
                  { icon: BookOpen, label: 'Have a Plan', value: membersWithSelections, color: 'text-green-400' },
                  { icon: TrendingUp, label: 'Avg Courses', value: avgSelections, color: 'text-orange-400' },
                  { icon: ChevronRight, label: 'Total Selections', value: filteredSelections.length, color: 'text-purple-400' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <Icon className={`w-5 h-5 ${color} mb-2`} />
                    <div className="text-2xl font-bold text-white">{value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-200">Specialization Popularity</h3>
                  <div className="flex gap-1">
                    {(['count', 'alpha'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setSpecSort(s)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          specSort === s ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-slate-200 bg-slate-700'
                        }`}
                      >
                        {s === 'count' ? 'Most Popular' : 'A–Z'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[...SPECS]
                    .sort((a, b) =>
                      specSort === 'count'
                        ? specCounts[b.id] - specCounts[a.id]
                        : a.label.localeCompare(b.label),
                    )
                    .map(spec => {
                    const count = specCounts[spec.id];
                    const pct = (count / maxSpecCount) * 100;
                    const isExpanded = overviewExpandedSpec === spec.id;
                    const specMembers = profiles
                      .filter(p => p.specializations.includes(spec.id))
                      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
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
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-200">
                        {showAllCourses ? 'All Elective Courses' : 'Most Selected Courses'}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {showAllCourses && (
                          <>
                            <button
                              onClick={() => setCourseListSort('popular')}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                courseListSort === 'popular' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-slate-200 bg-slate-700'
                              }`}
                            >
                              Most Popular
                            </button>
                            <button
                              onClick={() => setCourseListSort('alpha')}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                courseListSort === 'alpha' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-slate-200 bg-slate-700'
                              }`}
                            >
                              A–Z
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => { setShowAllCourses(v => !v); setOverviewExpandedCourse(null); }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300 hover:text-white transition-all"
                        >
                          {showAllCourses ? 'Top 10' : 'View All'}
                        </button>
                      </div>
                    </div>
                    {/* Term filter row */}
                    <div className="flex items-center gap-1.5">
                      {(['all', 4, 5, 6] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => { setTermFilter(t); setOverviewExpandedCourse(null); }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                            termFilter === t
                              ? 'bg-blue-500 text-white'
                              : 'text-slate-400 hover:text-slate-200 bg-slate-700'
                          }`}
                        >
                          {t === 'all' ? 'All Terms' : `Term ${t}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(showAllCourses
                      ? courseListSort === 'alpha'
                        ? [...termFilteredRanking].sort((a, b) => a.course.name.localeCompare(b.course.name))
                        : termFilteredRanking
                      : top10
                    ).map(({ course, count }, i) => {
                      const pct = profiles.length ? Math.round((count / profiles.length) * 100) : 0;
                      const spec = SPECS.find(s => course.specs.includes(s.id));
                      const isExpanded = overviewExpandedCourse === course.id;
                      const takers = profiles
                        .filter(p => selectionsByUser.get(p.id)?.has(course.id) ?? false)
                        .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
                      return (
                        <div key={course.id}>
                          <div className="flex items-center gap-2">
                            {!showAllCourses && <span className="text-[10px] text-slate-500 w-4">{i + 1}</span>}
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => setOverviewExpandedCourse(isExpanded ? null : course.id)}
                                className="text-xs text-slate-200 truncate hover:text-orange-300 transition-colors text-left w-full"
                              >
                                {course.name}
                                <span className="text-slate-500 ml-1 font-normal">· T{course.term}</span>
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
                                                  setSelectedMember(o);
                                                  setExpandedCourse(null);
                                                  setMemberSubTab('courses');
                                                  setTab('member');
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
                          <LoginTimingChart byHour={mLoginByHour} />
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Daily Active Users — Last 7 Days
                  </h3>
                  <button
                    onClick={() => { setInDepthSection('dau'); setTab('in-depth'); }}
                    className="text-[10px] text-slate-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
                  >
                    In-Depth <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {sessions.length === 0 ? (
                  <p className="text-xs text-slate-500">No session data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart
                      data={dauData.map(d => ({
                        date: new Date(d.date + 'T12:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                        users: d.count,
                      }))}
                      margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="dauGrad7" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#334155' }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                      <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: unknown) => [`${v} users`, 'Active Users']} />
                      <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fill="url(#dauGrad7)" dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} activeDot={{ fill: '#60a5fa', r: 5, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
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
                              <div className="text-xs text-slate-200 truncate">
                                {course.name}
                                <span className="text-slate-500 ml-1 font-normal">· T{course.term}</span>
                              </div>
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
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-200">Member Engagement</h3>
                      <button
                        onClick={() => { setInDepthSection('member-engagement'); setTab('in-depth'); }}
                        className="text-[10px] text-slate-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
                      >
                        In-Depth <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
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
              {/* Insights sub-tabs */}
              <div className="flex gap-1">
                {([['overview', 'Overview'], ['metrics', 'Metrics']] as [InsightsSubTab, string][]).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setInsightsSubTab(k)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      insightsSubTab === k ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {insightsSubTab === 'metrics' && (
                <MetricsPanel
                  profiles={profiles}
                  whitelistCount={whitelistEmails.length}
                  sessions={sessions}
                  events={events}
                  landingSessions={landingSessions}
                  chatbotMessageCount={chatbotMessages.length}
                  filteredSelections={filteredSelections}
                  termFilter={termFilter}
                  describe={describe}
                />
              )}

              {insightsSubTab === 'overview' && <>
              {/* ── Friends & Social ── */}
              {(() => {
                const nameMap = new Map(profiles.map(p => [p.id, p.name || p.email]));
                const nameOf = (id: string) => nameMap.get(id) ?? id.slice(0, 8);

                const edges = friendships;
                const edgeSet = new Set(edges.map(e => `${e.viewer_id}|${e.friend_id}`));

                // Initiations: the initiator's own edge (created_by === viewer_id)
                const initiations = edges
                  .filter(e => e.created_by && e.created_by === e.viewer_id)
                  .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

                // Mutual pairs (both directions present), counted once
                let mutual = 0;
                const seen = new Set<string>();
                edges.forEach(e => {
                  const key = [e.viewer_id, e.friend_id].sort().join('|');
                  if (seen.has(key)) return;
                  seen.add(key);
                  if (edgeSet.has(`${e.friend_id}|${e.viewer_id}`)) mutual++;
                });
                const oneWay = seen.size - mutual;

                // In-degree: how many people can see each member's schedule
                const inDeg = new Map<string, number>();
                edges.forEach(e => inDeg.set(e.friend_id, (inDeg.get(e.friend_id) ?? 0) + 1));
                const topConnected = [...inDeg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
                const maxDeg = topConnected[0]?.[1] ?? 1;

                const membersWithFriends = new Set(edges.map(e => e.viewer_id)).size;

                // Overlay / social activity from user_events
                const friendEvents = events.filter(e => e.event_type.startsWith('friend_'));
                const overlayOn = friendEvents.filter(
                  e => e.event_type === 'friend_overlay_toggled' && Boolean((e.payload as Record<string, unknown> | null)?.on),
                ).length;
                const detailViews = friendEvents.filter(e => e.event_type === 'friend_detail_viewed').length;
                const clashEvents = friendEvents.filter(e => e.event_type === 'friend_overlay_conflict_detected').length;
                const recentSocial = friendEvents
                  .slice()
                  .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))
                  .slice(0, 12);

                // Compute connection lists for drill-down
                const allPairs: [string, string][] = [];
                const mutualPairs: [string, string][] = [];
                const oneWayPairs: [string, string][] = [];
                const seenPairs = new Set<string>();
                edges.forEach(e => {
                  const key = [e.viewer_id, e.friend_id].sort().join('|');
                  if (seenPairs.has(key)) return;
                  seenPairs.add(key);
                  allPairs.push([e.viewer_id, e.friend_id]);
                  if (edgeSet.has(`${e.friend_id}|${e.viewer_id}`)) {
                    mutualPairs.push([e.viewer_id, e.friend_id]);
                  } else {
                    // figure out which direction
                    if (edgeSet.has(`${e.viewer_id}|${e.friend_id}`)) {
                      oneWayPairs.push([e.viewer_id, e.friend_id]);
                    } else {
                      oneWayPairs.push([e.friend_id, e.viewer_id]);
                    }
                  }
                });
                const memberList = [...new Set(edges.map(e => e.viewer_id))];

                const clickableStat = (label: string, value: number | string, color: string, drillKey: typeof friendStatDrill) => (
                  <button
                    className={`bg-slate-800 rounded-xl p-4 border text-left transition-all w-full ${friendStatDrill === drillKey ? 'border-white/20 ring-1 ring-white/20' : 'border-white/5 hover:border-white/15'}`}
                    onClick={() => setFriendStatDrill(friendStatDrill === drillKey ? null : drillKey)}
                  >
                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                      <span>{label}</span>
                      {friendStatDrill === drillKey ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-600" />}
                    </div>
                  </button>
                );

                const stat = (label: string, value: number | string, color: string) => (
                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-slate-400 mt-1">{label}</div>
                  </div>
                );

                return (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-3">👥 Friends &amp; Social</h3>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
                      {clickableStat('Connections', seen.size, 'text-blue-400', 'connections')}
                      {clickableStat('Mutual pairs', mutual, 'text-green-400', 'mutual')}
                      {clickableStat('One-way (after removal)', oneWay, 'text-orange-400', 'oneway')}
                      {clickableStat('Members with friends', membersWithFriends, 'text-purple-400', 'members')}
                    </div>

                    {/* Stat drill-down panel */}
                    {friendStatDrill && (
                      <div className="bg-slate-900 border border-white/10 rounded-xl p-4 mb-4 text-sm text-slate-200">
                        {friendStatDrill === 'connections' && (
                          <>
                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">All connections ({allPairs.length})</p>
                            <ul className="space-y-1">
                              {allPairs.map(([a, b], i) => (
                                <li key={i}><span className="font-semibold">{nameOf(a)}</span> <span className="text-slate-500">&amp;</span> <span className="font-semibold">{nameOf(b)}</span></li>
                              ))}
                            </ul>
                          </>
                        )}
                        {friendStatDrill === 'mutual' && (
                          <>
                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Mutual pairs ({mutualPairs.length})</p>
                            <ul className="space-y-1">
                              {mutualPairs.map(([a, b], i) => (
                                <li key={i}><span className="font-semibold">{nameOf(a)}</span> <span className="text-green-400">↔</span> <span className="font-semibold">{nameOf(b)}</span></li>
                              ))}
                            </ul>
                          </>
                        )}
                        {friendStatDrill === 'oneway' && (
                          <>
                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">One-way connections ({oneWayPairs.length})</p>
                            <ul className="space-y-1">
                              {oneWayPairs.map(([from, to], i) => (
                                <li key={i}><span className="font-semibold">{nameOf(from)}</span> <span className="text-orange-400">→</span> <span className="font-semibold">{nameOf(to)}</span> <span className="text-slate-600 text-xs">(hasn&apos;t added back)</span></li>
                              ))}
                            </ul>
                          </>
                        )}
                        {friendStatDrill === 'members' && (
                          <>
                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Members with at least one friend ({memberList.length})</p>
                            <ul className="space-y-1">
                              {memberList.map((id, i) => (
                                <li key={i} className="font-semibold">{nameOf(id)}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      {/* Who added whom */}
                      <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Who added whom</h4>
                        {initiations.length === 0 ? (
                          <p className="text-slate-500 text-sm">No friend connections yet.</p>
                        ) : (
                          <>
                            <ul className="space-y-1.5">
                              {initiations.slice(0, 4).map((e, i) => (
                                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                                  <span className="text-slate-200 truncate">
                                    <strong>{nameOf(e.viewer_id)}</strong> <span className="text-slate-500">added</span> <strong>{nameOf(e.friend_id)}</strong>
                                  </span>
                                  <span className="text-[11px] text-slate-500 flex-shrink-0">{fmtTs(e.created_at)}</span>
                                </li>
                              ))}
                            </ul>
                            {initiations.length > 4 && (
                              <button
                                onClick={() => { setTab('in-depth'); setInDepthSection('friends-social'); }}
                                className="text-xs text-blue-400 hover:text-blue-300 mt-3 underline"
                              >
                                View all {initiations.length} in In-Depth →
                              </button>
                            )}
                            {initiations.length <= 4 && (
                              <button
                                onClick={() => { setTab('in-depth'); setInDepthSection('friends-social'); }}
                                className="text-xs text-blue-400 hover:text-blue-300 mt-3 underline block"
                              >
                                View full analytics in In-Depth →
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Most-watched schedules */}
                      <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Most-watched schedules</h4>
                        {topConnected.length === 0 ? (
                          <p className="text-slate-500 text-sm">No data yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {topConnected.map(([id, deg]) => (
                              <li key={id} className="flex items-center gap-2">
                                <span className="text-xs text-slate-300 w-28 truncate flex-shrink-0">{nameOf(id)}</span>
                                <div className="flex-1 bg-slate-700/50 rounded h-4 overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded" style={{ width: `${(deg / maxDeg) * 100}%` }} />
                                </div>
                                <span className="text-xs text-slate-400 w-6 text-right flex-shrink-0">{deg}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {stat('Overlay toggles (on)', overlayOn, 'text-sky-400')}
                      {stat('Friend detail views', detailViews, 'text-indigo-400')}
                      {stat('Schedule clashes seen', clashEvents, 'text-amber-400')}
                    </div>

                    {/* Recent social activity */}
                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Recent social activity</h4>
                      {recentSocial.length === 0 ? (
                        <p className="text-slate-500 text-sm">No friend activity yet.</p>
                      ) : (
                        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                          {recentSocial.map((e, i) => {
                            const d = describeEvent(e);
                            return (
                              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                                <span className="text-slate-200 truncate">
                                  <span className="mr-1">{d.icon}</span>
                                  <strong>{nameOf(e.user_id)}</strong> <span className="text-slate-400">{d.text}</span>
                                </span>
                                <span className="text-[11px] text-slate-500 flex-shrink-0">{fmtTs(e.occurred_at)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="border-t border-white/5 my-6" />
                  </div>
                );
              })()}

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
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-200">Login Timing — by Hour of Day</h3>
                      <button
                        onClick={() => { setInDepthSection('login-timing'); setTab('in-depth' as Tab); }}
                        className="text-[10px] text-slate-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
                      >
                        In-Depth <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    {loginByHour.every(c => c === 0) ? (
                      <p className="text-xs text-slate-500">No login events yet.</p>
                    ) : (
                      <LoginTimingChart byHour={loginByHour} />
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

              {/* ── Mobile Drawer Insights ── */}
              {(() => {
                const drawerEvents = events.filter(e => e.event_type === 'mobile_drawer_toggled' || e.event_type === 'mobile_drawer_spec_tapped');
                const openEvents = events.filter(e => e.event_type === 'mobile_drawer_toggled' && (e.payload as Record<string, unknown>)?.open === true);
                const specTapEvents = events.filter(e => e.event_type === 'mobile_drawer_spec_tapped');
                const uniqueDrawerUsers = new Set(drawerEvents.map(e => e.user_id));
                const mobileSessions = sessions.filter(s => (s.metadata as Record<string, unknown>)?.device_type === 'mobile');
                const mobileUserIds = new Set(mobileSessions.map(s => s.user_id));
                const drawerAdoptionPct = mobileUserIds.size > 0
                  ? Math.round((uniqueDrawerUsers.size / mobileUserIds.size) * 100)
                  : 0;

                const specTapCounts: Record<string, number> = {};
                specTapEvents.forEach(e => {
                  const spec = String((e.payload as Record<string, unknown>)?.spec ?? 'unknown');
                  specTapCounts[spec] = (specTapCounts[spec] ?? 0) + 1;
                });
                const topSpec = Object.entries(specTapCounts).sort((a, b) => b[1] - a[1])[0];

                return (
                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">📱 Mobile Drawer</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Interactions with the mobile bottom drawer</p>
                      </div>
                      <button
                        onClick={() => { setInDepthSection('mobile-drawer'); setTab('in-depth'); }}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                      >
                        In-Depth <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {drawerEvents.length === 0 ? (
                      <p className="text-xs text-slate-500">No mobile drawer interactions recorded yet.</p>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-slate-700/40 rounded-lg p-3">
                          <div className="text-xl font-bold text-cyan-400">{uniqueDrawerUsers.size}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Unique users</div>
                        </div>
                        <div className="bg-slate-700/40 rounded-lg p-3">
                          <div className="text-xl font-bold text-orange-400">{openEvents.length}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Total opens</div>
                        </div>
                        <div className="bg-slate-700/40 rounded-lg p-3">
                          <div className="text-xl font-bold text-purple-400">{drawerAdoptionPct}%</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Mobile adoption</div>
                        </div>
                        <div className="bg-slate-700/40 rounded-lg p-3">
                          <div className="text-xl font-bold text-green-400">{topSpec ? topSpec[0] : '—'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Most tapped spec{topSpec ? ` (${topSpec[1]}×)` : ''}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              </>}
            </div>
          )}

          {/* ── IN-DEPTH TAB ── */}
          {tab === 'in-depth' && (
            <div className="p-4 space-y-6">
              {/* Section picker if nothing is selected */}
              {!inDepthSection && (
                <div>
                  <p className="text-slate-400 text-sm mb-4">Select a section to explore in depth:</p>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {[
                      { key: 'dau' as InDepthSection, label: 'Daily Active Users', desc: '30-day trend, weekly patterns, peak days', color: 'text-blue-400', border: 'border-blue-500/30 hover:border-blue-500/60' },
                      { key: 'login-timing' as InDepthSection, label: 'Login Timing', desc: 'Peak hours, time-of-day breakdown, patterns', color: 'text-orange-400', border: 'border-orange-500/30 hover:border-orange-500/60' },
                      { key: 'member-engagement' as InDepthSection, label: 'Member Engagement', desc: 'Full table with filters, recently active, never active', color: 'text-purple-400', border: 'border-purple-500/30 hover:border-purple-500/60' },
                      { key: 'user-status' as InDepthSection, label: 'User Status', desc: 'New this week, yet to log in from cohort whitelist', color: 'text-green-400', border: 'border-green-500/30 hover:border-green-500/60' },
                      { key: 'mobile-drawer' as InDepthSection, label: 'Mobile Drawer', desc: 'All members who used the drawer, sessions, specs tapped, filters', color: 'text-cyan-400', border: 'border-cyan-500/30 hover:border-cyan-500/60' },
                      { key: 'term1-panel' as InDepthSection, label: 'Term 1 Panel', desc: 'Who toggled Term 1 courses, how long they kept it on, engagement intent', color: 'text-indigo-400', border: 'border-indigo-500/30 hover:border-indigo-500/60' },
                      { key: 'friends-social' as InDepthSection, label: 'Friends & Social', desc: 'Network graph, who visited, copy/reset/overlay usage, full connection list', color: 'text-rose-400', border: 'border-rose-500/30 hover:border-rose-500/60' },
                      { key: 'ai-chatbot' as InDepthSection, label: 'AI Course Assistant', desc: 'Per-user chat history, intent patterns, engagement depth, power users', color: 'text-indigo-400', border: 'border-indigo-500/30 hover:border-indigo-500/60' },
                      ...(isSuperAdmin ? [{ key: 'admin-ai-activity' as InDepthSection, label: 'Admin AI Activity', desc: 'Every Ask-AI query across admins — question, results, and the SQL it ran', color: 'text-amber-400', border: 'border-amber-500/30 hover:border-amber-500/60' }] : []),
                    ].map(({ key, label, desc, color, border }) => (
                      <button
                        key={key}
                        onClick={() => setInDepthSection(key)}
                        className={`bg-slate-800 rounded-xl p-4 border text-left transition-all ${border}`}
                      >
                        <div className={`text-sm font-semibold mb-1 ${color}`}>{label}</div>
                        <div className="text-[11px] text-slate-400">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Breadcrumb */}
              {inDepthSection && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setInDepthSection(null)}
                    className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" /> In-Depth
                  </button>
                  <span className="text-slate-600">/</span>
                  <span className="text-white font-semibold">
                    {inDepthSection === 'dau' && 'Daily Active Users'}
                    {inDepthSection === 'login-timing' && 'Login Timing'}
                    {inDepthSection === 'member-engagement' && 'Member Engagement'}
                    {inDepthSection === 'user-status' && 'User Status'}
                    {inDepthSection === 'mobile-drawer' && 'Mobile Drawer'}
                    {inDepthSection === 'term1-panel' && 'Term 1 Panel'}
                    {inDepthSection === 'friends-social' && 'Friends & Social'}
                    {inDepthSection === 'ai-chatbot' && 'AI Course Assistant'}
                    {inDepthSection === 'admin-ai-activity' && 'Admin AI Activity'}
                  </span>
                </div>
              )}

              {/* ── Admin AI Activity In-Depth (super-admin only) ── */}
              {inDepthSection === 'admin-ai-activity' && isSuperAdmin && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">Every Ask-AI query across admins. Click a row to see the SQL it ran.</p>
                    <button
                      onClick={loadAdminAiQueries}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                  {adminAiQueries.length === 0 ? (
                    <div className="bg-slate-800 rounded-xl p-6 border border-white/5 text-center">
                      <p className="text-slate-400 text-sm">No AI queries yet.</p>
                    </div>
                  ) : (
                    <div className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/5 text-left text-slate-400">
                              <th className="px-3 py-2 font-semibold">Admin</th>
                              <th className="px-3 py-2 font-semibold">Question</th>
                              <th className="px-3 py-2 font-semibold whitespace-nowrap">Result</th>
                              <th className="px-3 py-2 font-semibold whitespace-nowrap">When</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adminAiQueries.map(r => {
                              const actor = r.actor_id ? profiles.find(p => p.id === r.actor_id) : null;
                              const who = actor?.name || actor?.email?.split('@')[0] || 'Unknown';
                              const open = adminAiExpanded === r.id;
                              return (
                                <tr
                                  key={r.id}
                                  onClick={() => setAdminAiExpanded(open ? null : r.id)}
                                  className="border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.02] align-top"
                                >
                                  <td className="px-3 py-2 text-slate-200 whitespace-nowrap">{who}</td>
                                  <td className="px-3 py-2 text-slate-300">
                                    <span className="line-clamp-2">{r.question}</span>
                                    {open && r.generated_sql && (
                                      <pre className="mt-1 overflow-x-auto rounded bg-slate-900/70 p-2 text-[10px] leading-relaxed text-emerald-300/90 whitespace-pre-wrap">
                                        {r.generated_sql}
                                      </pre>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    {r.error ? (
                                      <span className="text-red-400">error</span>
                                    ) : (
                                      <span className="text-slate-400">{r.row_count ?? 0} rows</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmtRelative(r.created_at)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── DAU In-Depth ── */}
              {inDepthSection === 'dau' && (
                <div className="space-y-6">
                  {sessions.length === 0 ? (
                    <div className="bg-slate-800 rounded-xl p-6 border border-white/5 text-center">
                      <p className="text-slate-400 text-sm">No session data loaded yet.</p>
                      <p className="text-slate-500 text-xs mt-1">Visit the Activity tab first to load analytics data.</p>
                    </div>
                  ) : (
                    <>
                      {/* Summary stats + drill-down */}
                      {(() => {
                        const peakDay = dauData30.reduce((a, b) => b.count > a.count ? b : a, dauData30[0]);
                        const avg7 = Math.round(dauData.reduce((s, d) => s + d.count, 0) / 7);
                        const avg30 = Math.round(dauData30.reduce((s, d) => s + d.count, 0) / 30);
                        const sevenDaysAgoStr = dauData[0]?.date ?? '';
                        const thirtyDaysAgoStr = dauData30[0]?.date ?? '';
                        const todayActiveIds = new Set(sessions.filter(s => s.session_start.slice(0, 10) === todayStr).map(s => s.user_id));
                        const totalUniqueIds = new Set(sessions.map(s => s.user_id));
                        const avg7ActiveIds = new Set(sessions.filter(s => s.session_start.slice(0, 10) >= sevenDaysAgoStr).map(s => s.user_id));
                        const avg30ActiveIds = new Set(sessions.filter(s => s.session_start.slice(0, 10) >= thirtyDaysAgoStr).map(s => s.user_id));
                        const peakDayActiveIds = peakDay ? new Set(sessions.filter(s => s.session_start.slice(0, 10) === peakDay.date).map(s => s.user_id)) : new Set<string>();

                        const cards: { type: DauDrillType; label: string; value: string | number; sub?: string; color: string; ids: Set<string> }[] = [
                          { type: 'today', label: "Today's Active", value: todayActiveIds.size, color: 'text-cyan-400', ids: todayActiveIds },
                          { type: 'total', label: 'Total Unique Users', value: totalUniqueIds.size, color: 'text-blue-400', ids: totalUniqueIds },
                          { type: 'avg7', label: 'Active (7d)', value: avg7ActiveIds.size, sub: `avg ${avg7}/day`, color: 'text-green-400', ids: avg7ActiveIds },
                          { type: 'avg30', label: 'Active (30d)', value: avg30ActiveIds.size, sub: `avg ${avg30}/day`, color: 'text-orange-400', ids: avg30ActiveIds },
                          { type: 'peak', label: 'Peak Day', value: peakDay?.count ?? 0, sub: peakDay ? new Date(peakDay.date + 'T12:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—', color: 'text-purple-400', ids: peakDayActiveIds },
                        ];

                        const drillCard = dauDrill ? cards.find(c => c.type === dauDrill) : null;
                        const drillProfiles = drillCard
                          ? profiles.filter(p => drillCard.ids.has(p.id)).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
                          : [];

                        return (
                          <>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                              {cards.map(({ type, label, value, sub, color }) => {
                                const isActive = dauDrill === type;
                                return (
                                  <button
                                    key={type}
                                    onClick={() => setDauDrill(isActive ? null : type)}
                                    className={`bg-slate-800 rounded-xl p-4 border text-left transition-all ${isActive ? 'border-white/30 ring-1 ring-white/10' : 'border-white/5 hover:border-white/15'}`}
                                  >
                                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                                    {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
                                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                      {label}
                                      <ChevronDown className={`w-3 h-3 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {dauDrill && drillCard && (
                              <div className="bg-slate-800/60 rounded-xl border border-white/10 overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                                    {drillCard.label} — {drillProfiles.length} member{drillProfiles.length !== 1 ? 's' : ''}
                                  </span>
                                  <button onClick={() => setDauDrill(null)} className="text-slate-500 hover:text-slate-300">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {drillProfiles.length === 0 ? (
                                  <p className="text-slate-500 text-xs p-4">No members for this metric{dauDrill === 'today' ? ' — no one has visited today yet' : ''}.</p>
                                ) : (
                                  <div className="p-3 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                                    {drillProfiles.map(p => (
                                      <button
                                        key={p.id}
                                        onClick={() => { setSelectedMember(p); setTab('member'); setExpandedCourse(null); setMemberSubTab('courses'); }}
                                        className="text-[11px] px-2.5 py-1 rounded-full bg-slate-700 text-slate-200 hover:bg-orange-500/20 hover:text-orange-300 transition-colors"
                                      >
                                        {p.name || p.email.split('@')[0]}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* 30-day chart */}
                      <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                        <h3 className="text-sm font-semibold text-slate-200 mb-4">30-Day Active Users</h3>
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart
                            data={dauData30.map(d => ({
                              date: new Date(d.date + 'T12:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                              users: d.count,
                            }))}
                            margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="dauGrad30" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#334155' }} interval={4} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                            <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: unknown) => [`${v} users`, 'Active Users']} />
                            <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fill="url(#dauGrad30)" dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} activeDot={{ fill: '#60a5fa', r: 5, strokeWidth: 0 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Day-of-week pattern */}
                      <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                        <h3 className="text-sm font-semibold text-slate-200 mb-1">Day-of-Week Pattern</h3>
                        <p className="text-[10px] text-slate-500 mb-4">Average unique active users per day of week (all-time)</p>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={dowAvgData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#334155' }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                            <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: unknown) => [`${v} users`, 'Avg DAU']} cursor={{ fill: '#1e293b' }} />
                            <Bar dataKey="avg" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={52} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Peak days chart */}
                      <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                        <h3 className="text-sm font-semibold text-slate-200 mb-4">Top 10 Peak Days</h3>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart
                            layout="vertical"
                            data={[...dauData30]
                              .sort((a, b) => b.count - a.count)
                              .slice(0, 10)
                              .map(d => ({
                                date: new Date(d.date + 'T12:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
                                users: d.count,
                              }))}
                            margin={{ top: 0, right: 48, left: 96, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} width={96} />
                            <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: unknown) => [`${v} users`, 'Active Users']} cursor={{ fill: '#1e293b' }} />
                            <Bar dataKey="users" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Login Timing In-Depth ── */}
              {inDepthSection === 'login-timing' && (() => {
                const isToday = loginTimingDate === todayStr;
                const loginByHourForDate = new Array(24).fill(0) as number[];
                const isAllTime = loginTimingDate === '__all__';
                const sourceEvents = isAllTime
                  ? events.filter(ev => ev.event_type === 'login_complete')
                  : events.filter(ev => ev.event_type === 'login_complete' && ev.occurred_at.slice(0, 10) === loginTimingDate);
                for (const e of sourceEvents) {
                  loginByHourForDate[new Date(e.occurred_at).getHours()]++;
                }
                const maxLoginHourForDate = Math.max(...loginByHourForDate, 1);

                function shiftDay(delta: number) {
                  if (isAllTime) return;
                  const d = new Date(loginTimingDate + 'T12:00');
                  d.setDate(d.getDate() + delta);
                  const next = d.toISOString().slice(0, 10);
                  if (next <= todayStr) setLoginTimingDate(next);
                }

                const displayLabel = isAllTime
                  ? 'All Time'
                  : isToday
                  ? 'Today'
                  : new Date(loginTimingDate + 'T12:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });

                return (
                  <div className="space-y-6">
                    {events.length === 0 ? (
                      <div className="bg-slate-800 rounded-xl p-6 border border-white/5 text-center">
                        <p className="text-slate-400 text-sm">No event data loaded yet.</p>
                        <p className="text-slate-500 text-xs mt-1">Visit the Activity tab first to load analytics data.</p>
                      </div>
                    ) : (
                      <>
                        {/* Day navigation */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => shiftDay(-1)}
                            disabled={isAllTime}
                            className="p-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                          </button>
                          <span className="text-sm font-semibold text-white min-w-[120px] text-center">{displayLabel}</span>
                          <button
                            onClick={() => shiftDay(1)}
                            disabled={isAllTime || isToday}
                            className="p-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <div className="w-px h-4 bg-white/10 mx-1" />
                          <button
                            onClick={() => setLoginTimingDate(todayStr)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${isToday ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}
                          >
                            Today
                          </button>
                          <button
                            onClick={() => setLoginTimingDate('__all__')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${isAllTime ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}
                          >
                            All Time
                          </button>
                        </div>

                        <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                          <h3 className="text-sm font-semibold text-slate-200 mb-4">
                            Login Timing — {displayLabel}
                          </h3>
                          {loginByHourForDate.every(c => c === 0) ? (
                            <p className="text-xs text-slate-500">No logins on this day.</p>
                          ) : (
                            <LoginTimingChart byHour={loginByHourForDate} />
                          )}
                        </div>

                        {/* Top hours table */}
                        <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                          <h3 className="text-sm font-semibold text-slate-200 mb-3">Busiest Hours</h3>
                          {loginByHourForDate.every(c => c === 0) ? (
                            <p className="text-xs text-slate-500">No data for this day.</p>
                          ) : (
                            <div className="space-y-2">
                              {loginByHourForDate
                                .map((count, h) => ({ h, count }))
                                .filter(x => x.count > 0)
                                .sort((a, b) => b.count - a.count)
                                .slice(0, 8)
                                .map(({ h, count }, i) => (
                                  <div key={h} className="flex items-center gap-3 text-xs">
                                    <span className="text-slate-500 w-4">{i + 1}</span>
                                    <span className="text-slate-300 w-24 font-mono">
                                      {String(h).padStart(2,'0')}:00 – {String(h+1).padStart(2,'0')}:00
                                    </span>
                                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-orange-500"
                                        style={{ width: `${(count / maxLoginHourForDate) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-slate-300 w-16 text-right shrink-0">{count} logins</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* ── Member Engagement In-Depth ── */}
              {inDepthSection === 'member-engagement' && (() => {
                function handleEngagementSort2(col: EngagementSortCol) {
                  setEngagementSort(prev =>
                    prev.col === col
                      ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                      : { col, dir: col === 'member' ? 'asc' : 'desc' },
                  );
                }
                function SortIcon2({ col }: { col: EngagementSortCol }) {
                  if (engagementSort.col !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-40" />;
                  return engagementSort.dir === 'asc'
                    ? <ArrowUp className="w-3 h-3 ml-1 text-orange-400" />
                    : <ArrowDown className="w-3 h-3 ml-1 text-orange-400" />;
                }
                function fmtVisitDate2(ts: string) {
                  return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                }

                const now = Date.now();
                const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

                const filteredForEngagement = profiles.filter(p => {
                  const stats = userSessionStats.get(p.id);
                  if (memberEngagementFilter === '7d') return stats?.lastVisit ? stats.lastVisit > sevenDaysAgo : false;
                  if (memberEngagementFilter === '30d') return stats?.lastVisit ? stats.lastVisit > thirtyDaysAgo : false;
                  if (memberEngagementFilter === 'never') return !stats?.lastVisit && !stats?.lastActivity;
                  return true;
                });

                const sorted2 = filteredForEngagement
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
                  <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-400">Filter:</span>
                      {([
                        { key: 'all', label: `All (${profiles.length})` },
                        { key: '7d', label: 'Active last 7 days' },
                        { key: '30d', label: 'Active last 30 days' },
                        { key: 'never', label: 'Never active' },
                      ] as const).map(f => (
                        <button
                          key={f.key}
                          onClick={() => setMemberEngagementFilter(f.key)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                            memberEngagementFilter === f.key
                              ? 'bg-orange-500 text-white'
                              : 'bg-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {sessions.length === 0 && (
                      <p className="text-[11px] text-slate-500 italic">
                        Visit the Activity tab first to load session data for accurate filtering.
                      </p>
                    )}

                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <h3 className="text-sm font-semibold text-slate-200 mb-4">
                        Member Engagement
                        <span className="ml-2 text-[10px] font-normal text-slate-500">
                          ({sorted2.length} member{sorted2.length !== 1 ? 's' : ''})
                        </span>
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500 border-b border-white/5">
                              <th className="text-left py-2 pr-4 font-medium">
                                <button onClick={() => handleEngagementSort2('member')} className="flex items-center hover:text-slate-300 transition-colors">
                                  Member<SortIcon2 col="member" />
                                </button>
                              </th>
                              <th className="text-left py-2 pr-4 font-medium">
                                <button onClick={() => handleEngagementSort2('lastVisit')} className="flex items-center hover:text-slate-300 transition-colors">
                                  Last Visit<SortIcon2 col="lastVisit" />
                                </button>
                              </th>
                              <th className="text-left py-2 pr-4 font-medium">
                                <button onClick={() => handleEngagementSort2('lastActivity')} className="flex items-center hover:text-slate-300 transition-colors">
                                  Last Activity<SortIcon2 col="lastActivity" />
                                </button>
                              </th>
                              <th className="text-right py-2 pr-4 font-medium">
                                <button onClick={() => handleEngagementSort2('sessions')} className="flex items-center justify-end w-full hover:text-slate-300 transition-colors">
                                  Sessions<SortIcon2 col="sessions" />
                                </button>
                              </th>
                              <th className="text-right py-2 font-medium">
                                <button onClick={() => handleEngagementSort2('avgDuration')} className="flex items-center justify-end w-full hover:text-slate-300 transition-colors">
                                  Avg Duration<SortIcon2 col="avgDuration" />
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {sorted2.map(({ p, stats }) => (
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
                                  {stats?.lastVisit ? fmtVisitDate2(stats.lastVisit) : '—'}
                                </td>
                                <td className="py-2 pr-4 text-slate-400">
                                  {stats?.lastActivity ? fmtVisitDate2(stats.lastActivity) : '—'}
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
                  </div>
                );
              })()}

              {/* ── User Status In-Depth ── */}
              {inDepthSection === 'user-status' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* New this week */}
                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-200">
                          New This Week
                          <span className="ml-2 text-[10px] font-normal text-slate-500">first login in last 7 days</span>
                        </h3>
                        <span className="text-xl font-bold text-green-400">{firstTimeLogins.length}</span>
                      </div>
                      {sessions.length === 0 && lastSignIns.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">Open Activity tab first to load login data.</p>
                      ) : firstTimeLogins.length === 0 ? (
                        <p className="text-[11px] text-slate-500">No new logins in the last 7 days.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {firstTimeLogins.map(p => (
                            <button
                              key={p.id}
                              onClick={() => { setSelectedMember(p); setTab('member'); setMemberSubTab('courses'); setExpandedCourse(null); }}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                            >
                              {p.name || p.email.split('@')[0]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Yet to log in */}
                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-200">
                          Yet to Log In
                          <span className="ml-2 text-[10px] font-normal text-slate-500">in cohort, no account yet</span>
                        </h3>
                        <span className="text-xl font-bold text-amber-400">{neverLoggedIn.length}</span>
                      </div>
                      {neverLoggedIn.length === 0 ? (
                        <p className="text-[11px] text-slate-500">Everyone in the whitelist has logged in.</p>
                      ) : (
                        <div className="max-h-64 overflow-y-auto space-y-1">
                          {neverLoggedIn
                            .sort((a, b) => (a.display_name || a.email).localeCompare(b.display_name || b.email))
                            .map(w => (
                              <div key={w.email} className="flex items-center gap-2 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 shrink-0" />
                                <span className="text-slate-300 font-medium">{w.display_name || w.email.split('@')[0]}</span>
                                <span className="text-slate-600 truncate">{w.email}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* All profiles with last sign-in */}
                  <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <h3 className="text-sm font-semibold text-slate-200 mb-3">All Members — Login Status</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500 border-b border-white/5">
                            <th className="text-left py-2 pr-4 font-medium">Member</th>
                            <th className="text-left py-2 pr-4 font-medium">Email</th>
                            <th className="text-left py-2 font-medium">Last Sign In</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {[...profiles]
                            .sort((a, b) => {
                              const la = lastSignInMap.get(a.id) ?? '';
                              const lb = lastSignInMap.get(b.id) ?? '';
                              return lb.localeCompare(la);
                            })
                            .map(p => {
                              const signIn = lastSignInMap.get(p.id);
                              const isNew = signIn && signIn > sevenDaysAgo;
                              return (
                                <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                                  <td className="py-2 pr-4">
                                    <button
                                      onClick={() => { setSelectedMember(p); setTab('member'); setExpandedCourse(null); setMemberSubTab('courses'); }}
                                      className="text-slate-200 hover:text-orange-300 transition-colors"
                                    >
                                      {p.name || p.email.split('@')[0]}
                                    </button>
                                  </td>
                                  <td className="py-2 pr-4 text-slate-500">{p.email}</td>
                                  <td className="py-2">
                                    {signIn ? (
                                      <span className={isNew ? 'text-green-400 font-semibold' : 'text-slate-400'}>
                                        {new Date(signIn).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        {isNew && <span className="ml-1.5 text-[9px] bg-green-500/15 px-1.5 py-0.5 rounded-full">new</span>}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">Never</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Term 1 Panel In-Depth ── */}
              {inDepthSection === 'term1-panel' && (() => {
                const allTerm1Events = events.filter(e => e.event_type === 'term1_panel_toggled');
                const openEvents = allTerm1Events.filter(e => (e.payload as Record<string, unknown>)?.show === true);
                const closeEvents = allTerm1Events.filter(e => (e.payload as Record<string, unknown>)?.show === false);

                const uniqueUserIds = [...new Set(allTerm1Events.map(e => e.user_id))];

                // Per-user stats
                const memberRows = uniqueUserIds.map(uid => {
                  const userEvents = allTerm1Events.filter(e => e.user_id === uid);
                  const userCloseEvents = userEvents.filter(e => (e.payload as Record<string, unknown>)?.show === false);
                  const durations = userCloseEvents
                    .map(e => (e.payload as Record<string, unknown>)?.duration_ms as number | null)
                    .filter((d): d is number => typeof d === 'number' && d > 0);
                  const totalDurationMs = durations.reduce((a, b) => a + b, 0);
                  const avgDurationMs = durations.length > 0 ? totalDurationMs / durations.length : null;
                  const opens = userEvents.filter(e => (e.payload as Record<string, unknown>)?.show === true).length;
                  const timestamps = userEvents.map(e => e.occurred_at).sort();
                  const profile = profiles.find(p => p.id === uid);
                  return { uid, profile, opens, totalDurationMs, avgDurationMs, firstUsed: timestamps[0], lastUsed: timestamps[timestamps.length - 1] };
                }).filter(r => r.profile).sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));

                // Cohort-wide duration stats from close events only
                const allDurations = closeEvents
                  .map(e => (e.payload as Record<string, unknown>)?.duration_ms as number | null)
                  .filter((d): d is number => typeof d === 'number' && d > 0);
                const cohortAvgMs = allDurations.length > 0
                  ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length
                  : null;
                const cohortMedianMs = (() => {
                  if (allDurations.length === 0) return null;
                  const sorted = [...allDurations].sort((a, b) => a - b);
                  const mid = Math.floor(sorted.length / 2);
                  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
                })();

                const fmtDur = (ms: number | null) => {
                  if (!ms) return '—';
                  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
                  const m = Math.floor(ms / 60000);
                  const s = Math.round((ms % 60000) / 1000);
                  return s > 0 ? `${m}m ${s}s` : `${m}m`;
                };

                return (
                  <div className="space-y-5">
                    {/* Summary stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Unique users — clickable */}
                      <button
                        onClick={() => setTerm1UsersExpanded(v => !v)}
                        className="bg-slate-800 rounded-xl p-3 border border-indigo-500/20 hover:border-indigo-500/50 transition-all text-left group"
                      >
                        <div className="text-2xl font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                          {uniqueUserIds.length}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Unique users{term1UsersExpanded ? ' ▲' : ' ▼'}
                        </div>
                      </button>
                      <div className="bg-slate-800 rounded-xl p-3 border border-white/5">
                        <div className="text-2xl font-bold text-orange-400">{openEvents.length}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Total toggles on</div>
                      </div>
                      <div className="bg-slate-800 rounded-xl p-3 border border-white/5">
                        <div className="text-2xl font-bold text-emerald-400">{fmtDur(cohortAvgMs)}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Avg session duration</div>
                      </div>
                      <div className="bg-slate-800 rounded-xl p-3 border border-white/5">
                        <div className="text-2xl font-bold text-purple-400">{fmtDur(cohortMedianMs)}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Median duration</div>
                      </div>
                    </div>

                    {/* Expanded user list on click */}
                    {term1UsersExpanded && (
                      <div className="bg-slate-800/60 rounded-xl border border-indigo-500/20 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-300">Users who used Term 1 panel</span>
                          <span className="text-[10px] text-slate-500">{uniqueUserIds.length} total</span>
                        </div>
                        <div className="divide-y divide-white/5">
                          {memberRows.map(r => (
                            <div key={r.uid} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/30 transition-colors">
                              <button
                                onClick={() => { setSelectedMember(r.profile!); setTab('member'); setMemberSubTab('activity'); }}
                                className="text-sm text-slate-200 hover:text-indigo-300 transition-colors text-left"
                              >
                                {r.profile!.name || r.profile!.email.split('@')[0]}
                              </button>
                              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                                <span>{r.opens} toggle{r.opens !== 1 ? 's' : ''}</span>
                                <span className="text-slate-400">{fmtRelative(r.lastUsed)}</span>
                              </div>
                            </div>
                          ))}
                          {memberRows.length === 0 && (
                            <div className="px-4 py-4 text-xs text-slate-600 text-center">No data yet</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Per-member table */}
                    {memberRows.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4">No Term 1 panel interactions recorded yet.</p>
                    ) : (
                      <div className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-white/5">
                          <span className="text-xs font-semibold text-slate-300">Per-member breakdown</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Duration = time between toggling on and off. Longer = intentional use, not just a curious click.</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-500 text-left">
                                <th className="py-2.5 px-4 font-medium">Member</th>
                                <th className="py-2.5 px-4 font-medium">Toggles on</th>
                                <th className="py-2.5 px-4 font-medium">Total time on</th>
                                <th className="py-2.5 px-4 font-medium">Avg per session</th>
                                <th className="py-2.5 px-4 font-medium">First used</th>
                                <th className="py-2.5 px-4 font-medium">Last used</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {memberRows.map(r => (
                                <tr key={r.uid} className="hover:bg-slate-700/30 transition-colors">
                                  <td className="py-2.5 px-4">
                                    <button
                                      onClick={() => { setSelectedMember(r.profile!); setTab('member'); setMemberSubTab('activity'); }}
                                      className="text-slate-200 hover:text-indigo-300 transition-colors text-left"
                                    >
                                      {r.profile!.name || r.profile!.email.split('@')[0]}
                                    </button>
                                  </td>
                                  <td className="py-2.5 px-4 text-orange-400 font-semibold">{r.opens}</td>
                                  <td className="py-2.5 px-4 text-emerald-400 font-semibold">{fmtDur(r.totalDurationMs || null)}</td>
                                  <td className="py-2.5 px-4 text-slate-300">{fmtDur(r.avgDurationMs)}</td>
                                  <td className="py-2.5 px-4 text-slate-400">{fmtTs(r.firstUsed)}</td>
                                  <td className="py-2.5 px-4 text-slate-400">{fmtRelative(r.lastUsed)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Intent signal callout */}
                    {cohortAvgMs !== null && (
                      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl px-4 py-3">
                        <p className="text-xs text-indigo-300 font-semibold mb-0.5">Reading intent from duration</p>
                        <p className="text-[11px] text-slate-400">
                          {cohortAvgMs < 5000
                            ? 'Most users close the panel within 5 seconds — likely curiosity clicks, not deep engagement.'
                            : cohortAvgMs < 30000
                            ? 'Average use is under 30 seconds — users are glancing at the Gantt but not studying it closely.'
                            : 'Users are keeping the panel open for meaningful durations — they\'re actively cross-referencing Term 1 while planning Term 4.'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Mobile Drawer In-Depth ── */}
              {inDepthSection === 'mobile-drawer' && (() => {
                const drawerOpenEvents = events.filter(e =>
                  e.event_type === 'mobile_drawer_toggled' &&
                  (e.payload as Record<string, unknown>)?.open === true
                );
                const specTapEvents = events.filter(e => e.event_type === 'mobile_drawer_spec_tapped');

                // Per-member stats
                const memberMap = new Map<string, {
                  firstInteraction: string;
                  lastInteraction: string;
                  totalOpens: number;
                  specsTapped: Record<string, number>;
                  sessionIds: Set<string>;
                }>();

                [...drawerOpenEvents, ...specTapEvents].forEach(e => {
                  const existing = memberMap.get(e.user_id);
                  if (!existing) {
                    memberMap.set(e.user_id, {
                      firstInteraction: e.occurred_at,
                      lastInteraction: e.occurred_at,
                      totalOpens: e.event_type === 'mobile_drawer_toggled' ? 1 : 0,
                      specsTapped: {},
                      sessionIds: new Set(),
                    });
                  } else {
                    if (e.occurred_at < existing.firstInteraction) existing.firstInteraction = e.occurred_at;
                    if (e.occurred_at > existing.lastInteraction) existing.lastInteraction = e.occurred_at;
                    if (e.event_type === 'mobile_drawer_toggled') existing.totalOpens++;
                  }
                  const entry = memberMap.get(e.user_id)!;
                  if (e.event_type === 'mobile_drawer_spec_tapped') {
                    const spec = String((e.payload as Record<string, unknown>)?.spec ?? 'unknown');
                    entry.specsTapped[spec] = (entry.specsTapped[spec] ?? 0) + 1;
                  }
                });

                // Attach session counts from user_sessions
                sessions.forEach(s => {
                  const entry = memberMap.get(s.user_id);
                  if (entry) entry.sessionIds.add(s.id ?? s.session_start);
                });

                const rows = [...memberMap.entries()]
                  .map(([userId, stats]) => ({
                    profile: profiles.find(p => p.id === userId),
                    userId,
                    ...stats,
                    sessionCount: stats.sessionIds.size,
                  }))
                  .filter(r => r.profile)
                  .sort((a, b) => b.lastInteraction.localeCompare(a.lastInteraction));

                const cutoff = drawerDateFilter === '7d'
                  ? new Date(Date.now() - 7 * 86400000).toISOString()
                  : drawerDateFilter === '30d'
                  ? new Date(Date.now() - 30 * 86400000).toISOString()
                  : null;

                const filtered = rows.filter(r => {
                  if (cutoff && r.lastInteraction < cutoff) return false;
                  if (drawerSpecFilter !== 'all' && !r.specsTapped[drawerSpecFilter]) return false;
                  return true;
                });

                const allSpecs = [...new Set(specTapEvents.map(e => String((e.payload as Record<string, unknown>)?.spec ?? '')).filter(Boolean))];

                return (
                  <div className="space-y-4">
                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-800 rounded-xl p-3 border border-white/5">
                        <div className="text-xl font-bold text-cyan-400">{rows.length}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Unique users</div>
                      </div>
                      <div className="bg-slate-800 rounded-xl p-3 border border-white/5">
                        <div className="text-xl font-bold text-orange-400">{drawerOpenEvents.length}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Total opens</div>
                      </div>
                      <div className="bg-slate-800 rounded-xl p-3 border border-white/5">
                        <div className="text-xl font-bold text-purple-400">{specTapEvents.length}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Spec taps</div>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-slate-500">Filter:</span>
                      {(['all', '7d', '30d'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setDrawerDateFilter(f)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${drawerDateFilter === f ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
                        >
                          {f === 'all' ? 'All time' : `Last ${f}`}
                        </button>
                      ))}
                      <span className="text-slate-600">·</span>
                      <button
                        onClick={() => setDrawerSpecFilter('all')}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${drawerSpecFilter === 'all' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
                      >
                        All specs
                      </button>
                      {allSpecs.map(spec => (
                        <button
                          key={spec}
                          onClick={() => setDrawerSpecFilter(spec)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${drawerSpecFilter === spec ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
                        >
                          {spec}
                        </button>
                      ))}
                    </div>

                    {/* Table */}
                    {filtered.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4">No interactions match the selected filters.</p>
                    ) : (
                      <div className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-500 text-left">
                                <th className="py-2.5 px-4 font-medium">Member</th>
                                <th className="py-2.5 px-4 font-medium">Sessions</th>
                                <th className="py-2.5 px-4 font-medium">Drawer opens</th>
                                <th className="py-2.5 px-4 font-medium">Specs tapped</th>
                                <th className="py-2.5 px-4 font-medium">First used</th>
                                <th className="py-2.5 px-4 font-medium">Last used</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {filtered.map(r => (
                                <tr key={r.userId} className="hover:bg-slate-700/30 transition-colors">
                                  <td className="py-2.5 px-4">
                                    <button
                                      onClick={() => { setSelectedMember(r.profile!); setTab('member'); setMemberSubTab('activity'); }}
                                      className="text-slate-200 hover:text-cyan-300 transition-colors text-left"
                                    >
                                      {r.profile!.name || r.profile!.email.split('@')[0]}
                                    </button>
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-400">{r.sessionCount}</td>
                                  <td className="py-2.5 px-4 text-orange-400 font-semibold">{r.totalOpens}</td>
                                  <td className="py-2.5 px-4">
                                    {Object.entries(r.specsTapped).length === 0 ? (
                                      <span className="text-slate-600">—</span>
                                    ) : (
                                      <span className="text-slate-300">
                                        {Object.entries(r.specsTapped)
                                          .sort((a, b) => b[1] - a[1])
                                          .map(([spec, count]) => `${spec} (${count}×)`)
                                          .join(', ')}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-400">{fmtTs(r.firstInteraction)}</td>
                                  <td className="py-2.5 px-4 text-slate-400">{fmtRelative(r.lastInteraction)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── FRIENDS & SOCIAL In-Depth ── */}
              {/* ── AI Course Assistant In-Depth ── */}
              {inDepthSection === 'ai-chatbot' && (() => {
                const cName2 = (code: string) => ALL_COURSES.find(c => c.code === code)?.name ?? code;
                const pName2 = (uid: string) => {
                  const p = profiles.find(pr => pr.id === uid);
                  return p?.name || p?.email?.split('@')[0] || 'Unknown';
                };

                const allMsgs = chatbotMessages;
                const allUserMsgs = allMsgs.filter(m => m.role === 'user');
                const allInteractedIds = new Set(allUserMsgs.map(m => m.user_id));
                const adoptionPct = profiles.length > 0 ? Math.round((allInteractedIds.size / profiles.length) * 100) : 0;
                const totalConvs = new Set(allMsgs.map(m => m.conversation_id)).size;

                const chatEvts = events.filter(e => e.event_type.startsWith('chatbot_'));
                const sessEndedEvts = chatEvts.filter(e => e.event_type === 'chatbot_session_ended');
                const avgSessMs = sessEndedEvts.length
                  ? Math.round(sessEndedEvts.reduce((s, e) => s + ((e.payload?.duration_ms as number) ?? 0), 0) / sessEndedEvts.length) : null;
                const firstDelayEvts = chatEvts.filter(e => e.event_type === 'chatbot_first_message_delay');
                const avgFirstMs = firstDelayEvts.length
                  ? Math.round(firstDelayEvts.reduce((s, e) => s + ((e.payload?.delay_ms as number) ?? 0), 0) / firstDelayEvts.length) : null;

                // Build per-user rows
                const perUser2 = [...allInteractedIds].map(uid => {
                  const uMsgs = allMsgs.filter(m => m.user_id === uid);
                  const uUserMsgs = uMsgs.filter(m => m.role === 'user');
                  const uConvIds = new Set(uMsgs.map(m => m.conversation_id));
                  const courseCounts2 = new Map<string, number>();
                  for (const m of uUserMsgs) if (m.course_code) courseCounts2.set(m.course_code, (courseCounts2.get(m.course_code) ?? 0) + 1);
                  const topCourse2 = [...courseCounts2.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
                  const lastActive2 = uMsgs.reduce((mx, m) => m.created_at > mx ? m.created_at : mx, '');
                  const firstActive = uMsgs.reduce((mn, m) => !mn || m.created_at < mn ? m.created_at : mn, '');
                  const intentCnts2 = { general: 0, course_specific: 0 };
                  for (const m of uUserMsgs) {
                    if ((m.intent ?? 'general') === 'course_specific') intentCnts2.course_specific++;
                    else intentCnts2.general++;
                  }
                  const isPower = uUserMsgs.length >= 10;
                  return { uid, name: pName2(uid), questions: uUserMsgs.length, conversations: uConvIds.size, topCourse: topCourse2, lastActive: lastActive2, firstActive, intentCnts: intentCnts2, isPower };
                }).sort((a, b) => b.questions - a.questions);

                const selUser = selectedChatUser ? perUser2.find(u => u.uid === selectedChatUser) : null;

                // Build full chat history for selected user
                const selMsgs = selectedChatUser ? allMsgs.filter(m => m.user_id === selectedChatUser) : [];
                const convsByDate = new Map<string, typeof selMsgs>();
                for (const m of selMsgs) {
                  const existing = convsByDate.get(m.conversation_id) ?? [];
                  existing.push(m);
                  convsByDate.set(m.conversation_id, existing);
                }
                const sortedConvs = [...convsByDate.entries()]
                  .map(([cid, msgs2]) => ({ cid, msgs: msgs2.sort((a, b) => a.created_at < b.created_at ? -1 : 1), date: msgs2[0]?.created_at ?? '' }))
                  .sort((a, b) => b.date < a.date ? -1 : 1);

                return (
                  <div className="space-y-5">
                    {/* Adoption stats header */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'Adopters', value: `${allInteractedIds.size} / ${profiles.length}`, sub: `${adoptionPct}% of cohort`, color: 'text-indigo-400' },
                        { label: 'Conversations', value: totalConvs, sub: `${allUserMsgs.length} total questions`, color: 'text-blue-400' },
                        { label: 'Avg session', value: avgSessMs != null ? `${Math.round(avgSessMs / 1000)}s` : '—', sub: 'open → close', color: 'text-green-400' },
                        { label: 'Avg to 1st msg', value: avgFirstMs != null ? `${(avgFirstMs / 1000).toFixed(1)}s` : '—', sub: 'open → first send', color: 'text-purple-400' },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-800 rounded-xl p-3 border border-white/5">
                          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                          {s.sub && <p className="text-[10px] text-slate-600 mt-0.5">{s.sub}</p>}
                          <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Per-user table or history view */}
                    {!selectedChatUser ? (
                      <div className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-white/5">
                          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                            Members who used the chatbot
                          </span>
                        </div>
                        {perUser2.length === 0 ? (
                          <p className="text-slate-500 text-sm p-4">No chatbot interactions yet.</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-500 text-left">
                                <th className="py-2.5 px-4 font-medium">Member</th>
                                <th className="py-2.5 px-4 font-medium text-right">Questions</th>
                                <th className="py-2.5 px-4 font-medium text-right">Convos</th>
                                <th className="py-2.5 px-4 font-medium hidden lg:table-cell">Top Course</th>
                                <th className="py-2.5 px-4 font-medium hidden lg:table-cell">Intent split</th>
                                <th className="py-2.5 px-4 font-medium">Last active</th>
                                <th className="py-2.5 px-4 font-medium"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {perUser2.map(u => (
                                <tr
                                  key={u.uid}
                                  className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                                  onClick={() => setSelectedChatUser(u.uid)}
                                >
                                  <td className="py-2.5 px-4">
                                    <span className="text-slate-200 font-medium flex items-center gap-1.5">
                                      {u.name}
                                      {u.isPower && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 rounded px-1 py-0.5 font-bold">POWER</span>}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-indigo-400 font-semibold text-right">{u.questions}</td>
                                  <td className="py-2.5 px-4 text-slate-300 text-right">{u.conversations}</td>
                                  <td className="py-2.5 px-4 text-slate-400 hidden lg:table-cell truncate max-w-[140px]" title={u.topCourse ? cName2(u.topCourse) : undefined}>
                                    {u.topCourse ? cName2(u.topCourse) : <span className="text-slate-600">General</span>}
                                  </td>
                                  <td className="py-2.5 px-4 hidden lg:table-cell">
                                    <div className="flex items-center gap-1">
                                      <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${u.questions > 0 ? Math.round((u.intentCnts.general / u.questions) * 40) : 0}px` }} />
                                      <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${u.questions > 0 ? Math.round((u.intentCnts.course_specific / u.questions) * 40) : 0}px` }} />
                                      <span className="text-slate-600 text-[10px]">
                                        {u.questions > 0 ? `${Math.round((u.intentCnts.course_specific / u.questions) * 100)}% course` : '—'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-500">{fmtRelative(u.lastActive)}</td>
                                  <td className="py-2.5 px-4">
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ) : (
                      /* Per-user full chat history */
                      <div className="space-y-4">
                        {/* Back + user header */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedChatUser(null)}
                            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs"
                          >
                            <ArrowLeft className="w-3 h-3" /> All users
                          </button>
                          <span className="text-slate-600">/</span>
                          <span className="text-white font-semibold text-sm">{selUser?.name ?? pName2(selectedChatUser)}</span>
                        </div>

                        {/* User stats bar */}
                        {selUser && (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                              { label: 'Questions asked', value: selUser.questions, color: 'text-indigo-400' },
                              { label: 'Conversations', value: selUser.conversations, color: 'text-blue-400' },
                              { label: 'Top course', value: selUser.topCourse ? cName2(selUser.topCourse) : 'General', color: 'text-slate-200' },
                              { label: 'Last active', value: fmtRelative(selUser.lastActive), color: 'text-slate-400' },
                            ].map(s => (
                              <div key={s.label} className="bg-slate-800 rounded-xl p-3 border border-white/5">
                                <p className={`text-base font-bold ${s.color} truncate`}>{s.value}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Conversations */}
                        {sortedConvs.length === 0 ? (
                          <p className="text-slate-500 text-sm">No messages found.</p>
                        ) : (
                          <div className="space-y-3">
                            {sortedConvs.map(({ cid, msgs: cMsgs, date }) => {
                              const isExpanded = expandedConvos.has(cid) || sortedConvs.length === 1;
                              const toggle = () => setExpandedConvos(prev => {
                                const next = new Set(prev);
                                if (next.has(cid)) next.delete(cid); else next.add(cid);
                                return next;
                              });
                              const uCount = cMsgs.filter(m => m.role === 'user').length;
                              return (
                                <div key={cid} className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
                                  <button
                                    onClick={toggle}
                                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                                  >
                                    <span className="text-xs text-slate-300 font-medium">
                                      {new Date(date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                      <span className="ml-2 text-slate-500">{uCount} question{uCount !== 1 ? 's' : ''}</span>
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                  {isExpanded && (
                                    <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
                                      {cMsgs.map((m, mi) => (
                                        <div key={mi} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                                            m.role === 'user'
                                              ? 'rounded-br-sm bg-indigo-600/30 text-slate-200'
                                              : 'rounded-bl-sm bg-slate-700/60 text-slate-300'
                                          }`}>
                                            <p>{m.content}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] opacity-70">
                                              {m.course_code && (
                                                <span className="bg-indigo-500/20 text-indigo-300 rounded px-1 py-0.5">{cName2(m.course_code)}</span>
                                              )}
                                              {m.intent && m.intent !== 'general' && (
                                                <span className="bg-slate-600/50 text-slate-400 rounded px-1 py-0.5">{m.intent}</span>
                                              )}
                                              {m.role === 'assistant' && m.latency_ms != null && (
                                                <span className="text-slate-600">{(m.latency_ms / 1000).toFixed(1)}s</span>
                                              )}
                                              <span className="text-slate-600 ml-auto">{fmtRelative(m.created_at)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {inDepthSection === 'friends-social' && (() => {
                const nameMap = new Map(profiles.map(p => [p.id, p.name || p.email]));
                const nameOf = (id: string) => nameMap.get(id) ?? id.slice(0, 8);

                const fEdges = friendships;
                const fEdgeSet = new Set(fEdges.map(e => `${e.viewer_id}|${e.friend_id}`));

                // Compute relationship sets
                const fAllPairs: [string, string][] = [];
                const fMutualPairs: [string, string][] = [];
                const fOneWayPairs: [string, string][] = [];
                const fSeen = new Set<string>();
                fEdges.forEach(e => {
                  const key = [e.viewer_id, e.friend_id].sort().join('|');
                  if (fSeen.has(key)) return;
                  fSeen.add(key);
                  fAllPairs.push([e.viewer_id, e.friend_id]);
                  if (fEdgeSet.has(`${e.friend_id}|${e.viewer_id}`)) {
                    fMutualPairs.push([e.viewer_id, e.friend_id]);
                  } else if (fEdgeSet.has(`${e.viewer_id}|${e.friend_id}`)) {
                    fOneWayPairs.push([e.viewer_id, e.friend_id]);
                  } else {
                    fOneWayPairs.push([e.friend_id, e.viewer_id]);
                  }
                });
                const fMemberList = [...new Set(fEdges.map(e => e.viewer_id))];
                const fInitiations = fEdges
                  .filter(e => e.created_by && e.created_by === e.viewer_id)
                  .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

                // Friend events
                const fEvents = events.filter(e => e.event_type.startsWith('friend_'));

                // Tab visitors
                const tabVisits = fEvents.filter(e => e.event_type === 'friend_tab_opened');
                const tabByUser = new Map<string, { count: number; first: string; last: string }>();
                tabVisits.forEach(e => {
                  const cur = tabByUser.get(e.user_id);
                  if (!cur) {
                    tabByUser.set(e.user_id, { count: 1, first: e.occurred_at, last: e.occurred_at });
                  } else {
                    tabByUser.set(e.user_id, {
                      count: cur.count + 1,
                      first: e.occurred_at < cur.first ? e.occurred_at : cur.first,
                      last: e.occurred_at > cur.last ? e.occurred_at : cur.last,
                    });
                  }
                });
                const tabVisitors = [...tabByUser.entries()].sort((a, b) => b[1].count - a[1].count);

                // Code interactions
                const copyEvents = fEvents.filter(e => e.event_type === 'friend_code_copied');
                const resetEvents = fEvents.filter(e => e.event_type === 'friend_code_regenerated');
                const addAttempts = fEvents.filter(e => e.event_type === 'friend_add_attempted');
                const addSuccess = fEvents.filter(e => e.event_type === 'friend_added');
                const addFailed = fEvents.filter(e => e.event_type === 'friend_add_failed');

                const copyByUser = new Map<string, number>();
                copyEvents.forEach(e => copyByUser.set(e.user_id, (copyByUser.get(e.user_id) ?? 0) + 1));
                const resetByUser = new Map<string, number>();
                resetEvents.forEach(e => resetByUser.set(e.user_id, (resetByUser.get(e.user_id) ?? 0) + 1));

                const failReasons = new Map<string, number>();
                addFailed.forEach(e => {
                  const r = (e.payload as Record<string, unknown> | null)?.reason as string ?? 'unknown';
                  failReasons.set(r, (failReasons.get(r) ?? 0) + 1);
                });

                // Overlay interactions
                const overlayOnEvents = fEvents.filter(
                  e => e.event_type === 'friend_overlay_toggled' && Boolean((e.payload as Record<string, unknown> | null)?.on),
                );
                const overlayByUser = new Map<string, { count: number; friends: Set<string> }>();
                overlayOnEvents.forEach(e => {
                  const fid = (e.payload as Record<string, unknown> | null)?.friend_id as string | undefined;
                  const cur = overlayByUser.get(e.user_id) ?? { count: 0, friends: new Set<string>() };
                  cur.count++;
                  if (fid) cur.friends.add(fid);
                  overlayByUser.set(e.user_id, cur);
                });

                const clashEvents = fEvents.filter(e => e.event_type === 'friend_overlay_conflict_detected');

                // Friend detail views
                const detailEvents = fEvents
                  .filter(e => e.event_type === 'friend_detail_viewed')
                  .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));

                // Social graph SVG
                const graphNodes = [...new Set([...fEdges.map(e => e.viewer_id), ...fEdges.map(e => e.friend_id)])];
                const nodeCount = graphNodes.length;
                const svgSize = Math.max(320, Math.min(480, nodeCount * 80));
                const cx = svgSize / 2;
                const cy = svgSize / 2;
                const radius = svgSize * 0.35;
                const nodePos = new Map<string, { x: number; y: number }>();
                graphNodes.forEach((id, i) => {
                  const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
                  nodePos.set(id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
                });

                const isMutual = (a: string, b: string) =>
                  fEdgeSet.has(`${a}|${b}`) && fEdgeSet.has(`${b}|${a}`);

                const drillSection = (key: typeof friendInDepthDrill, label: string, count: number, color: string, children: React.ReactNode) => (
                  <div className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/30 transition-colors"
                      onClick={() => setFriendInDepthDrill(friendInDepthDrill === key ? null : key)}
                    >
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{label}</span>
                      <span className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${color}`}>{count}</span>
                        {friendInDepthDrill === key ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                      </span>
                    </button>
                    {friendInDepthDrill === key && (
                      <div className="px-4 pb-4 border-t border-white/5 pt-3 text-slate-200">
                        {children}
                      </div>
                    )}
                  </div>
                );

                return (
                  <div className="space-y-6">
                    {/* Relationship overview */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Relationship Overview</h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                          { key: 'connections' as const, label: 'Total connections', value: fAllPairs.length, color: 'text-blue-400' },
                          { key: 'mutual' as const, label: 'Mutual pairs', value: fMutualPairs.length, color: 'text-green-400' },
                          { key: 'oneway' as const, label: 'One-way', value: fOneWayPairs.length, color: 'text-orange-400' },
                          { key: 'members' as const, label: 'Members with friends', value: fMemberList.length, color: 'text-purple-400' },
                        ].map(({ key, label, value, color }) => (
                          <button
                            key={key}
                            className={`bg-slate-800 rounded-xl p-4 border text-left transition-all w-full ${friendInDepthDrill === key ? 'border-white/20 ring-1 ring-white/20' : 'border-white/5 hover:border-white/15'}`}
                            onClick={() => setFriendInDepthDrill(friendInDepthDrill === key ? null : key)}
                          >
                            <div className={`text-2xl font-bold ${color}`}>{value}</div>
                            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                              <span>{label}</span>
                              {friendInDepthDrill === key ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-600" />}
                            </div>
                          </button>
                        ))}
                      </div>
                      {friendInDepthDrill === 'connections' && (
                        <div className="mt-3 bg-slate-900 rounded-xl p-4 border border-white/10 text-sm text-slate-200 space-y-1">
                          {fAllPairs.map(([a, b], i) => (
                            <div key={i}><span className="font-semibold">{nameOf(a)}</span> <span className="text-slate-500">&amp;</span> <span className="font-semibold">{nameOf(b)}</span></div>
                          ))}
                        </div>
                      )}
                      {friendInDepthDrill === 'mutual' && (
                        <div className="mt-3 bg-slate-900 rounded-xl p-4 border border-white/10 text-sm text-slate-200 space-y-1">
                          {fMutualPairs.length === 0 ? <p className="text-slate-500">No mutual pairs yet.</p> : fMutualPairs.map(([a, b], i) => (
                            <div key={i}><span className="font-semibold">{nameOf(a)}</span> <span className="text-green-400">↔</span> <span className="font-semibold">{nameOf(b)}</span></div>
                          ))}
                        </div>
                      )}
                      {friendInDepthDrill === 'oneway' && (
                        <div className="mt-3 bg-slate-900 rounded-xl p-4 border border-white/10 text-sm text-slate-200 space-y-1">
                          {fOneWayPairs.length === 0 ? <p className="text-slate-500">No one-way connections.</p> : fOneWayPairs.map(([from, to], i) => (
                            <div key={i}><span className="font-semibold">{nameOf(from)}</span> <span className="text-orange-400">→</span> <span className="font-semibold">{nameOf(to)}</span> <span className="text-slate-600 text-xs">(hasn&apos;t added back)</span></div>
                          ))}
                        </div>
                      )}
                      {friendInDepthDrill === 'members' && (
                        <div className="mt-3 bg-slate-900 rounded-xl p-4 border border-white/10 text-sm text-slate-200 space-y-1">
                          {fMemberList.map((id, i) => <div key={i} className="font-semibold">{nameOf(id)}</div>)}
                        </div>
                      )}
                    </div>

                    {/* Social network graph */}
                    {graphNodes.length > 0 && (() => {
                      const renderGraph = (interactive: boolean) => (
                        <svg
                          width={svgSize} height={svgSize}
                          viewBox={`0 0 ${svgSize} ${svgSize}`}
                          style={interactive ? { transform: `scale(${friendGraphScale}) translate(${friendGraphOffset.x}px, ${friendGraphOffset.y}px)`, transformOrigin: 'center', cursor: friendGraphDragging ? 'grabbing' : 'grab' } : { maxWidth: '100%' }}
                          onMouseDown={interactive ? (ev) => { setFriendGraphDragging(true); friendGraphDragStart.current = { mx: ev.clientX, my: ev.clientY, ox: friendGraphOffset.x, oy: friendGraphOffset.y }; } : undefined}
                          onMouseMove={interactive ? (ev) => { if (!friendGraphDragging || !friendGraphDragStart.current) return; const s = friendGraphDragStart.current; setFriendGraphOffset({ x: s.ox + (ev.clientX - s.mx) / friendGraphScale, y: s.oy + (ev.clientY - s.my) / friendGraphScale }); } : undefined}
                          onMouseUp={interactive ? () => { setFriendGraphDragging(false); friendGraphDragStart.current = null; } : undefined}
                          onMouseLeave={interactive ? () => { setFriendGraphDragging(false); friendGraphDragStart.current = null; } : undefined}
                        >
                          <defs>
                            <marker id={`arrow-gray${interactive ? '-m' : ''}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                              <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
                            </marker>
                            <marker id={`arrow-green${interactive ? '-m' : ''}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                              <path d="M0,0 L0,6 L8,3 z" fill="#4ade80" />
                            </marker>
                          </defs>
                          {fEdges.map((e, i) => {
                            const from = nodePos.get(e.viewer_id);
                            const to = nodePos.get(e.friend_id);
                            if (!from || !to) return null;
                            const mutual = isMutual(e.viewer_id, e.friend_id);
                            if (mutual && e.viewer_id > e.friend_id) return null;
                            const nodeR = 20;
                            const dx = to.x - from.x; const dy = to.y - from.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const ux = dx / dist; const uy = dy / dist;
                            return (
                              <line key={i}
                                x1={from.x + ux * nodeR} y1={from.y + uy * nodeR}
                                x2={to.x - ux * (nodeR + 8)} y2={to.y - uy * (nodeR + 8)}
                                stroke={mutual ? '#4ade80' : '#64748b'}
                                strokeWidth={mutual ? 2.5 : 1.5}
                                markerEnd={mutual ? `url(#arrow-green${interactive ? '-m' : ''})` : `url(#arrow-gray${interactive ? '-m' : ''})`}
                                strokeDasharray={mutual ? undefined : '4 2'}
                              />
                            );
                          })}
                          {graphNodes.map((id) => {
                            const pos = nodePos.get(id);
                            if (!pos) return null;
                            const hasMutual = fMutualPairs.some(([a, b]) => a === id || b === id);
                            const sends = fEdges.some(e => e.viewer_id === id);
                            const receives = fEdges.some(e => e.friend_id === id);
                            const fill = hasMutual ? '#3b82f6' : sends && !receives ? '#f97316' : '#a855f7';
                            const firstName = nameOf(id).split(' ')[0];
                            return (
                              <g key={id}
                                onMouseEnter={() => setFriendGraphHover(id)}
                                onMouseLeave={() => setFriendGraphHover(null)}
                                style={{ cursor: 'default' }}
                              >
                                <circle cx={pos.x} cy={pos.y} r={friendGraphHover === id ? 24 : 20} fill={fill} fillOpacity={0.9} stroke={friendGraphHover === id ? 'white' : '#1e293b'} strokeWidth={friendGraphHover === id ? 2.5 : 2} style={{ transition: 'r 0.15s, stroke 0.15s' }} />
                                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold" style={{ pointerEvents: 'none' }}>
                                  {firstName.slice(0, 6)}
                                </text>
                                {friendGraphHover === id && (
                                  <foreignObject x={pos.x - 60} y={pos.y - 44} width={120} height={28} style={{ pointerEvents: 'none' }}>
                                    <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: 'white', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {nameOf(id)}
                                    </div>
                                  </foreignObject>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      );

                      const legend = (
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Mutual friends</span>
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Only sends</span>
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block" /> Only receives</span>
                          <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-green-400 inline-block" /> Mutual edge</span>
                          <span className="flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-slate-500 inline-block" /> One-way</span>
                        </div>
                      );

                      return (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Social Network Graph</h4>
                            <button
                              onClick={() => { setFriendGraphExpanded(true); setFriendGraphScale(1); setFriendGraphOffset({ x: 0, y: 0 }); }}
                              className="text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/30 rounded-lg px-3 py-1 transition-all"
                            >
                              Expand ↗
                            </button>
                          </div>
                          <div className="bg-slate-800 rounded-xl border border-white/5 p-4 flex flex-col items-center overflow-hidden">
                            {renderGraph(false)}
                            {legend}
                          </div>

                          {/* Full-screen expanded modal */}
                          {friendGraphExpanded && (
                            <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" style={{ backdropFilter: 'blur(4px)' }}>
                              {/* Toolbar */}
                              <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-white/10 flex-shrink-0">
                                <span className="text-sm font-semibold text-slate-200">Social Network Graph</span>
                                <div className="flex items-center gap-2 ml-auto">
                                  <button onClick={() => setFriendGraphScale(s => Math.min(s + 0.25, 4))} className="text-xs border border-white/20 text-slate-300 hover:text-white rounded px-2.5 py-1 transition-colors">+ Zoom In</button>
                                  <button onClick={() => setFriendGraphScale(s => Math.max(s - 0.25, 0.25))} className="text-xs border border-white/20 text-slate-300 hover:text-white rounded px-2.5 py-1 transition-colors">− Zoom Out</button>
                                  <button onClick={() => { setFriendGraphScale(1); setFriendGraphOffset({ x: 0, y: 0 }); }} className="text-xs border border-white/20 text-slate-400 hover:text-white rounded px-2.5 py-1 transition-colors">Reset</button>
                                  <button onClick={() => setFriendGraphExpanded(false)} className="text-xs border border-red-500/40 text-red-400 hover:text-red-300 rounded px-2.5 py-1 transition-colors ml-2">✕ Close</button>
                                </div>
                              </div>
                              {/* Graph area */}
                              <div className="flex-1 overflow-hidden flex items-center justify-center bg-slate-950 select-none">
                                {renderGraph(true)}
                              </div>
                              {/* Legend */}
                              <div className="px-4 py-3 bg-slate-900 border-t border-white/10 flex-shrink-0 flex justify-center">
                                {legend}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Friend tab visitors */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                        Friends Tab Visitors <span className="text-slate-600 font-normal ml-1">{tabVisitors.length} unique</span>
                      </h4>
                      <div className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
                        {tabVisitors.length === 0 ? (
                          <p className="text-slate-500 text-sm p-4">No visits recorded yet.</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-500 text-left">
                                <th className="py-2.5 px-4 font-medium">Member</th>
                                <th className="py-2.5 px-4 font-medium">Times opened</th>
                                <th className="py-2.5 px-4 font-medium">First visit</th>
                                <th className="py-2.5 px-4 font-medium">Last visit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {tabVisitors.map(([uid, d]) => (
                                <tr key={uid} className="hover:bg-slate-700/30 transition-colors">
                                  <td className="py-2.5 px-4 text-slate-200 font-medium">{nameOf(uid)}</td>
                                  <td className="py-2.5 px-4 text-rose-400 font-semibold">{d.count}</td>
                                  <td className="py-2.5 px-4 text-slate-400">{fmtTs(d.first)}</td>
                                  <td className="py-2.5 px-4 text-slate-400">{fmtTs(d.last)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* Code interactions */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Code Interactions</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
                        {drillSection('copy', 'Code Copied', copyEvents.length, 'text-sky-400',
                          <div className="space-y-1 text-sm">
                            {[...copyByUser.entries()].sort((a, b) => b[1] - a[1]).map(([uid, cnt]) => (
                              <div key={uid} className="flex justify-between"><strong>{nameOf(uid)}</strong><span className="text-sky-400">{cnt}×</span></div>
                            ))}
                          </div>
                        )}
                        {drillSection('reset', 'Code Reset', resetEvents.length, 'text-amber-400',
                          <div className="space-y-1 text-sm">
                            {[...resetByUser.entries()].sort((a, b) => b[1] - a[1]).map(([uid, cnt]) => (
                              <div key={uid} className="flex justify-between"><strong>{nameOf(uid)}</strong><span className="text-amber-400">{cnt}×</span></div>
                            ))}
                          </div>
                        )}
                        <div className="bg-slate-800 rounded-xl border border-white/5 p-4">
                          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Add funnel</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-slate-400">Attempted</span><span className="text-slate-200 font-semibold">{addAttempts.length}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Succeeded</span><span className="text-green-400 font-semibold">{addSuccess.length}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Failed</span><span className="text-red-400 font-semibold">{addFailed.length}</span></div>
                            {[...failReasons.entries()].map(([reason, cnt]) => (
                              <div key={reason} className="flex justify-between pl-3 text-xs text-slate-500">
                                <span>{reason}</span><span>{cnt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Overlay / Watch Schedule */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Watch Schedule Overlay</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {drillSection('overlay', 'Overlay Activations', overlayOnEvents.length, 'text-indigo-400',
                          <div className="space-y-2 text-sm">
                            {[...overlayByUser.entries()].sort((a, b) => b[1].count - a[1].count).map(([uid, d]) => (
                              <div key={uid}>
                                <div className="flex justify-between mb-0.5">
                                  <strong>{nameOf(uid)}</strong>
                                  <span className="text-indigo-400">{d.count}×</span>
                                </div>
                                {d.friends.size > 0 && (
                                  <div className="text-[11px] text-slate-500 pl-2">
                                    Watched: {[...d.friends].map(fid => nameOf(fid)).join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {drillSection('clashes', 'Schedule Clashes Seen', clashEvents.length, 'text-red-400',
                          <div className="space-y-2 text-sm">
                            {clashEvents.slice(0, 20).map((e, i) => {
                              const p = e.payload as Record<string, unknown> | null;
                              return (
                                <div key={i} className="border-b border-white/5 pb-2 last:border-0">
                                  <div className="text-slate-200"><strong>{nameOf(e.user_id)}</strong></div>
                                  {p && (
                                    <div className="text-[11px] text-slate-500">
                                      {p.day as string} · {p.slot as string} · their course: <em>{p.friend_course as string}</em> vs yours: <em>{p.my_course as string}</em>
                                    </div>
                                  )}
                                  <div className="text-[11px] text-slate-600">{fmtTs(e.occurred_at)}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Friend detail views */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                        Friend Detail Views <span className="text-slate-600 font-normal ml-1">{detailEvents.length} total</span>
                      </h4>
                      {drillSection('detail', 'Friend Detail Views', detailEvents.length, 'text-violet-400',
                        <div className="space-y-1.5 text-sm max-h-48 overflow-y-auto">
                          {detailEvents.map((e, i) => {
                            const fid = (e.payload as Record<string, unknown> | null)?.friend_id as string | undefined;
                            return (
                              <div key={i} className="flex justify-between text-xs">
                                <span><strong>{nameOf(e.user_id)}</strong>{fid ? <> <span className="text-slate-500">viewed</span> <strong>{nameOf(fid)}</strong></> : ' viewed a friend'}</span>
                                <span className="text-slate-500 flex-shrink-0">{fmtTs(e.occurred_at)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Full add + remove history */}
                    {(() => {
                      const removeEvts = fEvents.filter(e => e.event_type === 'friend_removed');
                      type HistItem = { type: 'added' | 'removed'; actor: string; target: string; ts: string };
                      const addItems: HistItem[] = fInitiations.map(e => ({ type: 'added', actor: e.viewer_id, target: e.friend_id, ts: e.created_at }));
                      const removeItems: HistItem[] = removeEvts.map(e => ({
                        type: 'removed',
                        actor: e.user_id,
                        target: (e.payload as Record<string, unknown> | null)?.friend_id as string ?? '?',
                        ts: e.occurred_at,
                      }));
                      const allItems = [...addItems, ...removeItems].sort((a, b) => (a.ts < b.ts ? 1 : -1));
                      const displayed = friendHistoryFilter === 'added' ? addItems : friendHistoryFilter === 'removed' ? removeItems : allItems;
                      const totalAll = allItems.length;

                      return (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                              Connection History <span className="text-slate-600 font-normal ml-1">{totalAll} events</span>
                            </h4>
                            <div className="flex gap-1">
                              {(['all', 'added', 'removed'] as const).map(f => (
                                <button
                                  key={f}
                                  onClick={() => setFriendHistoryFilter(f)}
                                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${friendHistoryFilter === f ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
                                >
                                  {f === 'all' ? 'All' : f === 'added' ? 'Added' : 'Removed'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="bg-slate-800 rounded-xl border border-white/5 p-4">
                            {displayed.length === 0 ? (
                              <p className="text-slate-500 text-sm">No {friendHistoryFilter === 'all' ? '' : friendHistoryFilter + ' '}events yet.
                                {friendHistoryFilter === 'removed' && removeEvts.length === 0 && <span className="text-slate-600 text-xs block mt-1">Removal tracking was just added — future removals will appear here.</span>}
                              </p>
                            ) : (
                              <ul className="space-y-1.5 max-h-80 overflow-y-auto">
                                {displayed.map((item, i) => (
                                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                                    <span className="text-slate-200 truncate flex items-center gap-1.5">
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.type === 'added' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {item.type === 'added' ? '+ added' : '− removed'}
                                      </span>
                                      <span className="font-semibold">{nameOf(item.actor)}</span>
                                      <span className="text-slate-500">{item.type === 'added' ? '→' : '✕'}</span>
                                      <span className="font-semibold">{nameOf(item.target)}</span>
                                    </span>
                                    <span className="text-[11px] text-slate-500 flex-shrink-0">{fmtTs(item.ts)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── AI CHATBOT TAB ── */}
          {tab === 'chatbot' && (
            <div className="p-4 space-y-6">
              {(() => {
                const cName = (code: string) => ALL_COURSES.find(c => c.code === code)?.name ?? code;
                const pName = (uid: string) => {
                  const p = profiles.find(pr => pr.id === uid);
                  return p?.name || p?.email?.split('@')[0] || 'Unknown';
                };

                const msgs = chatbotMessages;
                const userMsgs = msgs.filter(m => m.role === 'user');
                const asstMsgs = msgs.filter(m => m.role === 'assistant');
                const convCount = new Set(msgs.map(m => m.conversation_id)).size;
                const interactedUserIds = new Set(userMsgs.map(m => m.user_id));
                const userCount = interactedUserIds.size;

                const chatbotEvents = events.filter(e => e.event_type.startsWith('chatbot_'));
                const openEvents = chatbotEvents.filter(e => e.event_type === 'chatbot_opened');
                const opens = openEvents.length;
                const openedUserIds = new Set(openEvents.map(e => e.user_id));
                const bouncedCount = [...openedUserIds].filter(uid => !interactedUserIds.has(uid)).length;
                const engagementRate = openedUserIds.size > 0
                  ? Math.round((interactedUserIds.size / openedUserIds.size) * 100) : 0;

                const disambig = chatbotEvents.filter(e => e.event_type === 'chatbot_disambiguation_shown').length;
                const errors = chatbotEvents.filter(e => e.event_type === 'chatbot_error').length;
                const copies = chatbotEvents.filter(e => e.event_type === 'chatbot_message_copied').length;

                const sessionEndedEvents = chatbotEvents.filter(e => e.event_type === 'chatbot_session_ended');
                const idleSessions = sessionEndedEvents.filter(e => !e.payload?.had_interaction).length;
                const avgSessionMs = sessionEndedEvents.length
                  ? Math.round(sessionEndedEvents.reduce((s, e) => s + ((e.payload?.duration_ms as number) ?? 0), 0) / sessionEndedEvents.length) : null;

                const firstMsgDelayEvents = chatbotEvents.filter(e => e.event_type === 'chatbot_first_message_delay');
                const avgFirstMsgDelayMs = firstMsgDelayEvents.length
                  ? Math.round(firstMsgDelayEvents.reduce((s, e) => s + ((e.payload?.delay_ms as number) ?? 0), 0) / firstMsgDelayEvents.length) : null;

                const nudgesShown = chatbotEvents.filter(e => e.event_type === 'chatbot_nudge_shown').length;
                const nudgesClicked = chatbotEvents.filter(e => e.event_type === 'chatbot_nudge_clicked').length;
                const nudgesDismissed = chatbotEvents.filter(e => e.event_type === 'chatbot_nudge_dismissed').length;

                const latencies = asstMsgs
                  .map(m => m.latency_ms)
                  .filter((n): n is number => typeof n === 'number' && n > 0);
                const avgLatency = latencies.length
                  ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
                  : null;

                const byCourse = new Map<string, number>();
                for (const m of userMsgs) {
                  if (m.course_code) byCourse.set(m.course_code, (byCourse.get(m.course_code) ?? 0) + 1);
                }
                const courseRows = [...byCourse.entries()]
                  .map(([code, count]) => ({ code, name: cName(code), count }))
                  .sort((a, b) => b.count - a.count);
                const maxCourse = Math.max(1, ...courseRows.map(r => r.count));

                // Intent breakdown
                const intentCounts = { general: 0, course_specific: 0, disambiguation: 0 };
                for (const m of userMsgs) {
                  const k = (m.intent ?? 'general') as keyof typeof intentCounts;
                  if (k in intentCounts) intentCounts[k]++;
                }
                const totalIntents = Math.max(1, userMsgs.length);

                const byQ = new Map<string, { text: string; count: number }>();
                for (const m of userMsgs) {
                  const key = m.content.trim().toLowerCase().replace(/\s+/g, ' ');
                  if (!key) continue;
                  const e = byQ.get(key);
                  if (e) e.count++;
                  else byQ.set(key, { text: m.content.trim(), count: 1 });
                }
                const topQuestions = [...byQ.values()].sort((a, b) => b.count - a.count).slice(0, 8);
                const recent = userMsgs.slice(0, 10);

                // Per-user data for the drill-down panel
                const perUserData = [...interactedUserIds].map(uid => {
                  const uMsgs = msgs.filter(m => m.user_id === uid);
                  const uUserMsgs = uMsgs.filter(m => m.role === 'user');
                  const uConvIds = new Set(uMsgs.map(m => m.conversation_id));
                  const courseCounts = new Map<string, number>();
                  for (const m of uUserMsgs) if (m.course_code) courseCounts.set(m.course_code, (courseCounts.get(m.course_code) ?? 0) + 1);
                  const topCourse = [...courseCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
                  const lastActive = uMsgs.reduce((max, m) => m.created_at > max ? m.created_at : max, '');
                  return { uid, name: pName(uid), questions: uUserMsgs.length, conversations: uConvIds.size, topCourse, lastActive };
                }).sort((a, b) => b.questions - a.questions);

                const kpis: { label: string; value: string | number; clickable?: boolean }[] = [
                  { label: 'Conversations', value: convCount },
                  { label: 'Messages', value: msgs.length },
                  { label: 'Questions asked', value: userMsgs.length },
                  { label: 'Unique users', value: userCount, clickable: true },
                  { label: 'Chat opens', value: opens },
                  { label: 'Course prompts', value: disambig },
                  { label: 'Errors', value: errors },
                  { label: 'Avg reply', value: avgLatency != null ? `${(avgLatency / 1000).toFixed(1)}s` : '—' },
                ];
                const funnel: { label: string; value: string | number; color: string }[] = [
                  { label: 'Engagement rate', value: openedUserIds.size > 0 ? `${engagementRate}%` : '—', color: 'text-green-400' },
                  { label: 'Bounce sessions', value: bouncedCount, color: 'text-amber-400' },
                  { label: 'Idle opens', value: idleSessions, color: 'text-orange-400' },
                  { label: 'Avg session', value: avgSessionMs != null ? `${Math.round(avgSessionMs / 1000)}s` : '—', color: 'text-blue-400' },
                  { label: 'Avg to 1st msg', value: avgFirstMsgDelayMs != null ? `${(avgFirstMsgDelayMs / 1000).toFixed(1)}s` : '—', color: 'text-purple-400' },
                  { label: 'Copies', value: copies, color: 'text-indigo-400' },
                ];

                if (msgs.length === 0 && opens === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500 text-sm gap-2">
                      <Sparkles className="w-10 h-10 text-slate-700" />
                      No AI chatbot activity yet.
                      <span className="text-xs text-slate-600">Opens, questions and answers will appear here as students use the assistant.</span>
                    </div>
                  );
                }

                return (
                  <>
                    <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      AI Course Assistant — Usage
                    </h2>

                    {/* Primary KPI cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {kpis.map(k => {
                        const isUnique = k.label === 'Unique users';
                        if (isUnique) {
                          return (
                            <button
                              key={k.label}
                              onClick={() => setChatbotUserDrillOpen(v => !v)}
                              className={`bg-slate-800 rounded-xl p-3 border text-left transition-all ${chatbotUserDrillOpen ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-white/5 hover:border-white/15'}`}
                            >
                              <p className="text-2xl font-bold text-indigo-400 flex items-center gap-1.5">
                                {k.value}
                                <ChevronDown className={`w-4 h-4 transition-transform ${chatbotUserDrillOpen ? 'rotate-180' : ''}`} />
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{k.label} — click to expand</p>
                            </button>
                          );
                        }
                        return (
                          <div key={k.label} className="bg-slate-800 rounded-xl p-3 border border-white/5">
                            <p className="text-2xl font-bold text-white">{k.value}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{k.label}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Unique users drill-down panel */}
                    {chatbotUserDrillOpen && (
                      <div className="bg-slate-800/60 rounded-xl border border-indigo-500/20 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <User2 className="w-3.5 h-3.5 text-indigo-400" />
                            Chatbot Users — {perUserData.length} member{perUserData.length !== 1 ? 's' : ''}
                          </span>
                          <button onClick={() => setChatbotUserDrillOpen(false)} className="text-slate-500 hover:text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="divide-y divide-white/5">
                          {perUserData.map(u => (
                            <div key={u.uid} className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/3 transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-200 font-medium truncate">{u.name}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {u.topCourse ? cName(u.topCourse) : 'General questions'}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                                <span>{u.questions} Q</span>
                                <span>{u.conversations} conv</span>
                                <span className="text-slate-600">{fmtRelative(u.lastActive)}</span>
                                <button
                                  onClick={() => { setSelectedChatUser(u.uid); setInDepthSection('ai-chatbot'); setTab('in-depth'); setChatbotUserDrillOpen(false); }}
                                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                  title="View full history"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {perUserData.length === 0 && (
                            <p className="px-4 py-3 text-xs text-slate-500">No interactions yet.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Engagement funnel row */}
                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                      {funnel.map(f => (
                        <div key={f.label} className="bg-slate-800/60 rounded-xl p-3 border border-white/5">
                          <p className={`text-xl font-bold ${f.color}`}>{f.value}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{f.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Questions by course */}
                      <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-400" />
                          Questions by Course
                        </h3>
                        {courseRows.length === 0 ? (
                          <p className="text-xs text-slate-500">No course-specific questions yet.</p>
                        ) : (
                          <div className="space-y-2.5">
                            {courseRows.map(r => (
                              <div key={r.code} className="flex items-center gap-3">
                                <span className="text-xs text-slate-400 w-36 shrink-0 truncate" title={r.name}>{r.name}</span>
                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${(r.count / maxCourse) * 100}%` }} />
                                </div>
                                <span className="text-xs text-slate-300 w-8 text-right">{r.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Intent breakdown */}
                      <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-indigo-400" />
                          Intent Breakdown
                        </h3>
                        <div className="space-y-2.5">
                          {([
                            { key: 'general', label: 'General', color: 'bg-blue-500' },
                            { key: 'course_specific', label: 'Course-specific', color: 'bg-indigo-500' },
                            { key: 'disambiguation', label: 'Disambiguation', color: 'bg-purple-500' },
                          ] as const).map(row => {
                            const cnt = intentCounts[row.key];
                            const pct = Math.round((cnt / totalIntents) * 100);
                            return (
                              <div key={row.key} className="flex items-center gap-3">
                                <span className="text-xs text-slate-400 w-28 shrink-0">{row.label}</span>
                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${row.color} transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-slate-300 w-14 text-right">{cnt} ({pct}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Top questions */}
                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        Most-asked Questions
                      </h3>
                      {topQuestions.length === 0 ? (
                        <p className="text-xs text-slate-500">No questions yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                          {topQuestions.map((q, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-indigo-300 w-6 shrink-0">{q.count}×</span>
                              <span className="text-xs text-slate-300 leading-snug">{q.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Nudge performance — only shown if there's nudge activity */}
                    {nudgesShown > 0 && (
                      <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          Nudge Performance
                        </h3>
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-xl font-bold text-slate-200">{nudgesShown}</p>
                            <p className="text-[11px] text-slate-500">Shown</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-green-400">{nudgesClicked}</p>
                            <p className="text-[11px] text-slate-500">Clicked</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-red-400">{nudgesDismissed}</p>
                            <p className="text-[11px] text-slate-500">Dismissed</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-yellow-400">
                              {nudgesShown > 0 ? `${Math.round((nudgesClicked / nudgesShown) * 100)}%` : '—'}
                            </p>
                            <p className="text-[11px] text-slate-500">Click rate</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recent questions feed (capped to 10) */}
                    <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                      <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-400" />
                        Recent Questions
                        <span className="text-[10px] text-slate-600 ml-1">last 10</span>
                        {errors > 0 && (
                          <span className="ml-auto text-[11px] text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {errors} error{errors > 1 ? 's' : ''}
                          </span>
                        )}
                      </h3>
                      {recent.length === 0 ? (
                        <p className="text-xs text-slate-500">No questions yet.</p>
                      ) : (
                        <div className="space-y-2 max-h-[420px] overflow-y-auto">
                          {recent.map((m, i) => (
                            <div key={i} className="rounded-lg bg-slate-900/60 border border-white/5 px-3 py-2">
                              <p className="text-sm text-slate-200">{m.content}</p>
                              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                                <button
                                  onClick={() => { setSelectedChatUser(m.user_id); setInDepthSection('ai-chatbot'); setTab('in-depth'); }}
                                  className="text-slate-400 hover:text-indigo-300 transition-colors font-medium"
                                >
                                  {pName(m.user_id)}
                                </button>
                                {m.course_code && (
                                  <span className="rounded bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5">{cName(m.course_code)}</span>
                                )}
                                {m.intent && m.intent !== 'general' && (
                                  <span className="rounded bg-slate-700 text-slate-400 px-1.5 py-0.5">{m.intent}</span>
                                )}
                                <span className="ml-auto">{fmtRelative(m.created_at)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {tab === 'ask-ai' && <AskAiPanel />}

          {/* Lazy: mounts on first open, then keeps its own state. Mirrors the
              analyticsLoadedRef pattern — the panel does eight paged fetches. */}
          {tab === 'alerts' && (
            <AlertsAdminPanel
              profiles={profiles}
              onViewMember={(userId) => {
                const p = profiles.find(x => x.id === userId);
                if (p) { setSelectedMember(p); setTab('member'); }
              }}
            />
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
