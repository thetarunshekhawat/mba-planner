'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSelections } from '@/hooks/useSelections';
import { useCourseSections } from '@/hooks/useCourseSections';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useFriends } from '@/hooks/useFriends';
import { useFriendSelections } from '@/hooks/useFriendSelections';
import { useFriendSections } from '@/hooks/useFriendSections';
import { TimetableView } from '@/components/planner/TimetableView';
import { PlannerListView } from '@/components/planner/PlannerListView';
import { FriendsView } from '@/components/planner/FriendsView';
import { FriendDetailModal } from '@/components/planner/FriendDetailModal';
import { FilterSidebar, type Filters } from '@/components/planner/FilterSidebar';
import { MobileDrawer } from '@/components/planner/MobileDrawer';
import { CourseDetailModal } from '@/components/planner/CourseDetailModal';
import { CourseSearch, EMPTY_SEARCH, type SearchState } from '@/components/planner/CourseSearch';
import { matchesQuery } from '@/lib/courseSearch';
import { isDemoEmail } from '@/lib/demo';
import { ChatWidget } from '@/components/chatbot/ChatWidget';
import { generateScheduleICS } from '@/lib/calendar';
import { buildCommitments } from '@/lib/alerts/commitments';
import { LayoutList, CalendarDays, CalendarPlus, CalendarHeart, Download, ShieldCheck, Users, Search, Eye, Bell } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ALL_COURSES } from '@/data/courses';
import { TERM_DATES, getCurrentTerm, getTermCourses } from '@/lib/terms';
import { isAdminEmail } from '@/lib/admin';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertsView } from '@/components/planner/AlertsView';
import type { Course, SpecId, Profile, Friend, FriendOverlay } from '@/types';
import { colorForFriend } from '@/types';
import type { ChatAction } from '@/lib/chat/actions';
import { useRouter } from 'next/navigation';

type ViewMode = 'plan' | 'schedule' | 'friends' | 'alerts';

const DEFAULT_FILTERS: Filters = {
  specs: [],
  minDepth: 0,
  minRelevance: 0,
  workloads: [],
  selectedOnly: false,
  showWaw: true,
  showMandatoryOnly: false,
};

export default function PlannerPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [activeModal, setActiveModal] = useState<Course | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('plan');
  const [selectedTerms, setSelectedTerms] = useState<Set<4 | 5 | 6>>(() => new Set([getCurrentTerm()]));
  // Controlled Export dialog so the chatbot's "Open Export" action can open it.
  const [exportOpen, setExportOpen] = useState(false);
  // Set when a chat-triggered PDF export needs the schedule view to render first
  // (window.print only captures the schedule layout, which is rendered in that view).
  const [pendingPdf, setPendingPdf] = useState(false);
  // Course/friend search — one control in the header, shared across all three views.
  const [search, setSearch] = useState<SearchState>(EMPTY_SEARCH);

  const { trackEvent } = useAnalytics(userId);
  const filtersDirtyRef = useRef(false);
  const modalOpenTimeRef = useRef<number | null>(null);
  const modalCourseRef = useRef<Course | null>(null);
  const planVisibleCountRef = useRef(0);
  // The shared demo login used by faculty reviewing the project. Everything
  // renders and responds as usual, but no change is persisted.
  const isDemo = isDemoEmail(profile?.email);
  const { selected, loading, toggle, selectBatch, deselectBatch } = useSelections(
    userId,
    (type, courseId) => trackEvent(type, { course_id: courseId }),
    isDemo,
  );
  const { sections: courseSections } = useCourseSections(userId);

  // Courses the search is pointing at: every picked chip, plus anything the
  // free text matches while the user is still typing (so results update live).
  const searchMatchIds = new Set<number>(search.courseIds);
  if (search.text.trim()) {
    for (const c of ALL_COURSES) {
      if (matchesQuery(c, search.text)) searchMatchIds.add(c.id);
    }
  }
  // Only narrow the course views when the search actually points at courses — a
  // friend-name search on the Friends tab must not blank out the course lists.
  const courseSearchActive = searchMatchIds.size > 0;

  // ── Friends ──────────────────────────────────────────────
  const { friends, loading: friendsLoading, addByCode, removeFriend, regenerateCode } = useFriends(userId, isDemo);
  const [overlayIds, setOverlayIds] = useState<Set<string>>(new Set());
  const [friendDetail, setFriendDetail] = useState<Friend | null>(null);

  // ── Alerts ───────────────────────────────────────────────
  const alerts = useAlerts(userId, isDemo, trackEvent);

  // The Alerts tab's dates, shaped for the schedule grid. Derived here rather
  // than inside TimetableView so the export path and the grid draw the same list.
  const commitments = useMemo(
    () => buildCommitments(alerts.tracked, alerts.deadlines),
    [alerts.tracked, alerts.deadlines],
  );

  // ── Sliding tab pill (Plan / My Schedule / Friends / Alerts) ─
  const tabRowRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<ViewMode, HTMLButtonElement | null>>({
    plan: null, schedule: null, friends: null, alerts: null,
  });
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  const friendIds = friends.map(f => f.id);
  const friendSelections = useFriendSelections(friendIds);
  const friendSections = useFriendSections(friendIds);

  // Drop overlays for friends that are no longer in the list (e.g. removed).
  useEffect(() => {
    setOverlayIds(prev => {
      const next = new Set([...prev].filter(id => friendIds.includes(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendIds.join(',')]);

  // Mandatory and WaW courses are never in anyone's `course_selections` — the
  // whole cohort sits them, so your own schedule adds them unconditionally
  // (see `scheduleVisibleIds`). A friend overlay built from selections alone
  // therefore drew nothing in a block made entirely of them, which read as
  // "the overlay is broken" rather than "they didn't pick anything here".
  // Mirror the same rule so a friend is overlaid on the courses you share by
  // default — the section-aware overlay then puts them in *their* half of the
  // day, which is the whole point of turning it on.
  const cohortCourseIds = useMemo(
    () => ALL_COURSES
      .filter(c => c.type === 'mandatory' || (c.type === 'waw' && filters.showWaw))
      .map(c => c.id),
    [filters.showWaw],
  );

  // Only the toggled-on friends, with a stable color + their courses.
  const friendOverlays: FriendOverlay[] = friends
    .filter(f => overlayIds.has(f.id))
    .map(f => ({
      id: f.id,
      name: f.name,
      color: colorForFriend(f.id),
      selected: new Set<number>([
        ...(friendSelections.get(f.id) ?? new Set<number>()),
        ...cohortCourseIds,
      ]),
      sections: friendSections.get(f.id) ?? new Map<number, string>(),
    }));

  function handleToggleOverlay(friend: Friend, source: 'friends' | 'schedule' = 'friends') {
    setOverlayIds(prev => {
      const next = new Set(prev);
      const turningOn = !next.has(friend.id);
      if (turningOn) next.add(friend.id); else next.delete(friend.id);
      trackEvent('friend_overlay_toggled', { friend_id: friend.id, on: turningOn, view: source });
      return next;
    });
  }

  async function handleRegenerateCode() {
    const code = await regenerateCode();
    if (code) setProfile(p => (p ? { ...p, friend_code: code } : p));
    return code;
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/'); return; }
      setUserId(user.id);

      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data as Profile);
        });

    });
  }, []);

  // Debounced filter tracking — also detects dead-end (zero results) filter combos
  useEffect(() => {
    if (!userId || !filtersDirtyRef.current) return;
    const timer = setTimeout(() => {
      trackEvent('filters_applied', { ...filters });
      // An empty list caused by a search isn't a filter dead end.
      if (planVisibleCountRef.current === 0 && !courseSearchActive) {
        trackEvent('filter_dead_end', { ...filters });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [filters, userId]);

  // Track how long a course detail modal stays open
  useEffect(() => {
    if (activeModal) {
      modalOpenTimeRef.current = Date.now();
      modalCourseRef.current = activeModal;
    } else if (modalOpenTimeRef.current && modalCourseRef.current) {
      trackEvent('modal_view_duration', {
        course_id: modalCourseRef.current.id,
        course_name: modalCourseRef.current.name,
        duration_ms: Date.now() - modalOpenTimeRef.current,
      });
      modalOpenTimeRef.current = null;
      modalCourseRef.current = null;
    }
  }, [activeModal]);

  // Keep the sliding pill aligned with the active tab. Re-measures when the view
  // changes and when badge counts shift the button widths, plus on container resize.
  useLayoutEffect(() => {
    const el = tabRefs.current[viewMode];
    const row = tabRowRef.current;
    if (!el || !row) return;
    const measure = () => setPill({ left: el.offsetLeft, width: el.offsetWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
    // Counts are dependencies because each badge changes its button's width —
    // without them the sliding pill measures the old width and lands wrong.
  }, [viewMode, selected.size, friends.length, alerts.trackedCount]);

  function handleFiltersChange(newFilters: Filters) {
    filtersDirtyRef.current = true;
    setFilters(newFilters);
  }

  function toggleTerm(term: 4 | 5 | 6) {
    setSelectedTerms(prev => {
      const next = new Set(prev);
      if (next.has(term)) { next.delete(term); } else { next.add(term); }
      return next;
    });
  }

  async function handleSignOut() {
    trackEvent('user_signed_out');
    await supabase.auth.signOut();
    router.replace('/');
  }

  async function handleSpecToggle(spec: SpecId) {
    if (!profile) return;
    const current = profile.specializations;
    let next: SpecId[];
    if (current.includes(spec)) {
      next = current.filter(s => s !== spec);
    } else if (current.length >= 3) {
      next = [current[1], current[2], spec];
    } else {
      next = [...current, spec];
    }
    trackEvent('spec_toggled', { spec, action: current.includes(spec) ? 'removed' : 'added' });
    setProfile({ ...profile, specializations: next });
    if (!isDemo) {
      await supabase.from('profiles').update({ specializations: next }).eq('id', profile.id);
    }

    // Auto-select/deselect mandatory courses for the toggled spec
    const mandatoryCourses = ALL_COURSES.filter(c => c.mandatoryFor?.includes(spec));
    if (next.includes(spec)) {
      // Spec was added — select its mandatory courses
      selectBatch(mandatoryCourses.map(c => c.id));
    } else {
      // Spec was removed — deselect courses only if not mandatory for any remaining spec
      const toDeselect = mandatoryCourses
        .filter(c => !c.mandatoryFor!.some(s => next.includes(s)))
        .map(c => c.id);
      deselectBatch(toDeselect);
    }
  }

  // For "Plan" tab: show all courses that pass filters
  const planVisibleIds = new Set(
    ALL_COURSES
      .filter(c => {
        if (c.type === 'exam' || c.type === 'free') return false;
        if (courseSearchActive && !searchMatchIds.has(c.id)) return false;
        if (filters.showMandatoryOnly) {
          return c.type === 'mandatory' || (c.mandatoryFor && c.mandatoryFor.length > 0);
        }
        if (c.type === 'mandatory') return true;
        if (c.type === 'waw') return filters.showWaw;
        if (filters.selectedOnly && !selected.has(c.id)) return false;
        if (c.review) {
          if (filters.minDepth > 0 && c.review.learningDepth < filters.minDepth) return false;
          if (filters.minRelevance > 0 && c.review.careerRelevance < filters.minRelevance) return false;
          if (filters.workloads.length > 0 && !filters.workloads.includes(c.review.workload)) return false;
        }
        return true;
      })
      .map(c => c.id),
  );

  planVisibleCountRef.current = planVisibleIds.size;

  // For "My Schedule" tab: only show selected + WaW + mandatory
  const scheduleVisibleIds = new Set(
    ALL_COURSES
      .filter(c => {
        if (c.type === 'exam' || c.type === 'free') return false;
        if (c.type === 'mandatory') return true;
        if (c.type === 'waw') return filters.showWaw;
        return selected.has(c.id);
      })
      .map(c => c.id),
  );

  const handleExportCalendar = () => {
    const coursesToExport = ALL_COURSES.filter(c => scheduleVisibleIds.has(c.id) && selectedTerms.has(c.term));
    // Deadlines are dated, not termed: a commitment ships if it falls inside any
    // term the student ticked. Past ones are left out — an export is forward-looking.
    const commitmentsToExport = commitments.filter(c => !c.done && TERM_DATES.some(
      t => selectedTerms.has(t.term) && c.date >= t.start.toISOString().slice(0, 10)
        && c.date <= t.end.toISOString().slice(0, 10),
    ));
    if (coursesToExport.length === 0 && commitmentsToExport.length === 0) return;
    trackEvent('export_triggered', { type: 'ics', commitments: commitmentsToExport.length });

    const icsContent = generateScheduleICS(coursesToExport, commitmentsToExport);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mba-schedule.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSubscriptionUrl = () => {
    const courseIds = ALL_COURSES
      .filter(c => selected.has(c.id) && selectedTerms.has(c.term))
      .map(c => c.id).join(',');
    if (!courseIds) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/api/calendar?courses=${courseIds}`;
  };

  const getGoogleCalendarUrl = () => {
    const url = getSubscriptionUrl();
    if (!url) return '#';
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url)}`;
  };

  const getAppleCalendarUrl = () => {
    const url = getSubscriptionUrl();
    if (!url) return '#';
    return url.replace(/^https?:\/\//, 'webcal://');
  };

  const handleExportPDF = () => {
    trackEvent('export_triggered', { type: 'pdf' });
    window.print();
  };

  // A chat-triggered PDF export needs the schedule view mounted before window.print can
  // capture it. Once we've switched to that view, print on the next frame (layout settled).
  useEffect(() => {
    if (!pendingPdf || viewMode !== 'schedule') return;
    const id = requestAnimationFrame(() => {
      handleExportPDF();
      setPendingPdf(false);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPdf, viewMode]);

  // Runs an action the chatbot proposed. Reuses the same export handlers as the UI, so
  // chat-triggered exports honor the current term selection. (open_link actions open via
  // their own anchor in the chat — they don't reach here.)
  const handleChatAction = (action: ChatAction) => {
    if (action.type === 'export_pdf') {
      // Ensure the schedule view is rendered first; the effect above does the print.
      setViewMode('schedule');
      setPendingPdf(true);
    } else if (action.type === 'export_ics') {
      handleExportCalendar();
    } else if (action.type === 'export_subscription') {
      const url = action.provider === 'google' ? getGoogleCalendarUrl() : getAppleCalendarUrl();
      if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
    } else if (action.type === 'navigate') {
      trackEvent('chatbot_navigate', { target: action.target });
      if (action.target === 'export') {
        setViewMode('schedule');
        setExportOpen(true);
      } else {
        setViewMode(action.target);
      }
    }
  };

  if (loading || !profile) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading your plan...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between gap-1.5 sm:gap-3 px-2 sm:px-4 py-3 bg-slate-900/95 backdrop-blur border-b border-white/10 sticky top-0 z-30 print:hidden">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Logo size={28} className="rounded-lg flex-shrink-0" />
            <span className="text-white font-semibold text-sm hidden sm:inline">MBA Planner</span>
            <span className="text-slate-500 text-xs hidden sm:inline">· BITSoM Co&apos;27</span>
          </div>
        </div>

        {/* View toggle — centered */}
        <div className="flex-none flex justify-center">
          <div ref={tabRowRef} className="relative flex bg-slate-800 rounded-lg p-0.5 border border-white/10">
            {pill && (
              <span
                aria-hidden
                className="absolute top-0.5 bottom-0.5 left-0 rounded-md bg-white shadow-sm transition-[transform,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
              />
            )}
            <button
              ref={(el) => { tabRefs.current.plan = el; }}
              aria-label="Plan"
              onClick={() => { setViewMode('plan'); trackEvent('view_changed', { to: 'plan' }); }}
              className={`relative z-10 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'plan'
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className={viewMode === 'plan' ? 'inline' : 'hidden sm:inline'}>Plan</span>
            </button>
            <button
              ref={(el) => { tabRefs.current.schedule = el; }}
              aria-label="My Schedule"
              onClick={() => { setViewMode('schedule'); trackEvent('view_changed', { to: 'schedule' }); }}
              className={`relative z-10 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'schedule'
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className={viewMode === 'schedule' ? 'inline' : 'hidden sm:inline'}>My Schedule</span>
              {selected.size > 0 && (
                <span className="ml-0.5 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {selected.size}
                </span>
              )}
            </button>
            <button
              ref={(el) => { tabRefs.current.friends = el; }}
              aria-label="Friends"
              onClick={() => { setViewMode('friends'); trackEvent('view_changed', { to: 'friends' }); trackEvent('friend_tab_opened'); }}
              className={`relative z-10 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'friends'
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className={viewMode === 'friends' ? 'inline' : 'hidden sm:inline'}>Friends</span>
              {friends.length > 0 && (
                <span className="ml-0.5 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {friends.length}
                </span>
              )}
            </button>
            <button
              ref={(el) => { tabRefs.current.alerts = el; }}
              aria-label="Alerts"
              onClick={() => { setViewMode('alerts'); trackEvent('view_changed', { to: 'alerts' }); trackEvent('alerts_tab_opened'); }}
              className={`relative z-10 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'alerts'
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span className={viewMode === 'alerts' ? 'inline' : 'hidden sm:inline'}>Alerts</span>
              {alerts.trackedCount > 0 && (
                <span className="ml-0.5 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {alerts.trackedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5 sm:gap-2">
          {/* Honest label for the shared review login: everything works, but a
              reviewer's clicks are not saved, and without this the plan
              silently resetting on the next visit would read as a bug. */}
          {isDemo && (
            <span
              title="Read-only demo. Selections are not saved."
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30"
            >
              <Eye className="w-3 h-3" />
              Demo
            </span>
          )}
          {isAdminEmail(profile?.email) && (
            <button
              onClick={() => { trackEvent('admin_dashboard_accessed'); router.push('/admin'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 text-orange-400 hover:bg-slate-700 hover:text-orange-300 transition-all border border-orange-500/30"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
          <CourseSearch
            viewMode={viewMode}
            friends={friends}
            boostIds={selected}
            scheduleVisibleIds={scheduleVisibleIds}
            value={search}
            onChange={setSearch}
            onGoToPlan={() => { setViewMode('plan'); trackEvent('view_changed', { to: 'plan', from: 'search' }); }}
            trackEvent={trackEvent}
          />
          {viewMode === 'schedule' && (
            <>
              <Dialog open={exportOpen} onOpenChange={(open) => { setExportOpen(open); if (open) trackEvent('export_dialog_opened'); }}>
                <DialogTrigger render={
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all border border-white/10"
                    title="Export Schedule"
                  />
                }>
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Export Options</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Choose how you want to export your schedule.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-6 mt-4">
                    {/* Term selector */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-3 px-1">Terms to Include</h4>
                      <div className="flex gap-2">
                        {TERM_DATES.map(({ term, label, dates }) => (
                          <button
                            key={term}
                            onClick={() => toggleTerm(term)}
                            className={`flex-1 flex flex-col items-center gap-0.5 p-3 rounded-lg border text-center transition-colors ${
                              selectedTerms.has(term)
                                ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                                : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                            }`}
                          >
                            <span className="font-semibold text-sm">{label}</span>
                            <span className="text-[10px] opacity-70 leading-tight">{dates}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <hr className="border-slate-800" />
                    {/* PDF Section */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-3 px-1">Document</h4>
                      <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-white/5 w-full"
                      >
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <Download className="w-4 h-4 text-orange-400" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-sm text-slate-200">Save as PDF</div>
                          <div className="text-xs text-slate-400">Print or save as a PDF document</div>
                        </div>
                      </button>
                    </div>

                    {/* Calendar Section */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-3 px-1">Calendar Sync</h4>
                      <div className="flex flex-col gap-2">
                        {/* Google Calendar */}
                        <a
                          href={selectedTerms.size === 0 ? undefined : getGoogleCalendarUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => { if (selectedTerms.size > 0) trackEvent('export_triggered', { type: 'google' }); }}
                          aria-disabled={selectedTerms.size === 0}
                          className={`flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-white/5 transition-colors ${selectedTerms.size === 0 ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:bg-slate-700'}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/>
                            </svg>
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-sm text-slate-200">Subscribe in Google Calendar</div>
                            <div className="text-xs text-slate-400">Updates automatically</div>
                          </div>
                        </a>

                        {/* Apple Calendar */}
                        <a
                          href={selectedTerms.size === 0 ? undefined : getAppleCalendarUrl()}
                          onClick={() => { if (selectedTerms.size > 0) trackEvent('export_triggered', { type: 'apple' }); }}
                          aria-disabled={selectedTerms.size === 0}
                          className={`flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-white/5 transition-colors ${selectedTerms.size === 0 ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:bg-slate-700'}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.89 4 3 4.9 3 6v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-sm text-slate-200">Subscribe in Apple Calendar</div>
                            <div className="text-xs text-slate-400">Updates automatically</div>
                          </div>
                        </a>

                        {/* Download ICS */}
                        <button
                          onClick={handleExportCalendar}
                          disabled={selectedTerms.size === 0}
                          className={`flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-white/5 transition-colors w-full ${selectedTerms.size === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-700'}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                            <CalendarHeart className="w-4 h-4 text-slate-300" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-sm text-slate-200">Download .ics File</div>
                            <div className="text-xs text-slate-400">Static file, manually import</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Sheet onOpenChange={(open) => { if (open) trackEvent('calendar_panel_opened'); }}>
                <SheetTrigger render={
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all border border-white/10" />
                }>
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Calendar</span>
                </SheetTrigger>
                <SheetContent side="right" className="w-[340px] sm:w-[400px] bg-slate-900 border-slate-800 p-6">
                  <SheetHeader className="px-0">
                    <SheetTitle className="text-white">Monthly Calendar</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Terms to Include</h4>
                    <div className="flex gap-2">
                      {TERM_DATES.map(({ term, label, dates }) => (
                        <button
                          key={term}
                          onClick={() => toggleTerm(term)}
                          className={`flex-1 flex flex-col items-center gap-0.5 p-3 rounded-lg border text-center transition-colors ${
                            selectedTerms.has(term)
                              ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                              : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                          }`}
                        >
                          <span className="font-semibold text-sm">{label}</span>
                          <span className="text-[10px] opacity-70 leading-tight">{dates}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 flex justify-center">
                    <Calendar
                      mode="single"
                      className="rounded-md border border-slate-800 bg-slate-900/50 text-white"
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0 print:overflow-visible print:h-auto">
        {/*
          Sidebar: on desktop (≥lg) it stays in the flex flow (flex-shrink-0).
          On mobile (<lg) it becomes a fixed overlay that slides in/out.
          Avoids hidden/lg:block toggling which has CSS-order issues in Tailwind v4.
        */}
        {/* Desktop sidebar — hidden on mobile, always visible on lg+ */}
        <div className="hidden lg:block flex-shrink-0 h-full print:hidden">
          <FilterSidebar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            selected={selected}
            userSpecs={profile.specializations}
            onSpecToggle={handleSpecToggle}
            userName={profile.name}
            userEmail={profile.email}
            userAvatarUrl={profile.avatar_url ?? undefined}
            onSignOut={handleSignOut}
            trackEvent={trackEvent}
          />
        </div>

        {/* Main content area — bottom padding on mobile so content clears the drawer */}
        {/*
          The bottom padding clears the collapsed MobileDrawer (HANDLE_H = 80px),
          plus the iOS home indicator, plus breathing room. It is measured in
          those terms rather than a round number because the drawer is what it
          has to clear.

          `min-h-full`, not `h-full`, on the wrapper below. With a definite
          `height: 100%` the wrapper stays viewport-tall and its content
          *overflows* it, and a scroll container does not extend its bottom
          padding past overflowing content — only past in-flow content. So the
          padding existed, sat at the 785px mark inside a 1474px scroll range,
          and cleared nothing: the last card's action row (Track this / Notifying
          / Stop tracking) rendered 63px underneath the drawer, unreachable at
          any scroll position.
        */}
        <main className="flex-1 overflow-y-auto min-h-0 max-lg:pb-[calc(80px+env(safe-area-inset-bottom)+1.5rem)] print:overflow-visible print:h-auto">
          <div key={viewMode} className="min-h-full animate-view-fade-in">
          {viewMode === 'plan' ? (
            <>
              {courseSearchActive && (
                <div className="sticky top-0 z-20 flex items-center gap-2 px-4 lg:px-6 py-2 bg-orange-50 border-b border-orange-200 text-xs text-orange-800 print:hidden">
                  <Search className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-semibold">
                    {planVisibleIds.size === 0
                      ? 'No courses match your search'
                      : `${planVisibleIds.size} course${planVisibleIds.size === 1 ? '' : 's'} matching your search`}
                  </span>
                  <button
                    onClick={() => { setSearch(EMPTY_SEARCH); trackEvent('search_cleared', { view: 'plan', source: 'banner' }); }}
                    className="ml-auto font-semibold text-orange-600 hover:text-orange-800 underline underline-offset-2"
                  >
                    Clear search
                  </button>
                </div>
              )}
              <PlannerListView
                selected={selected}
                userSpecs={profile.specializations}
                visibleIds={planVisibleIds}
                onToggle={toggle}
                onCourseClick={course => { setActiveModal(course); trackEvent('course_viewed', { course_id: course.id, course_name: course.name }); }}
                trackEvent={trackEvent}
              />
            </>
          ) : viewMode === 'friends' ? (
            <FriendsView
              myCode={profile.friend_code}
              friends={friends}
              loading={friendsLoading}
              friendSelections={friendSelections}
              overlayIds={overlayIds}
              onToggleOverlay={(friend) => handleToggleOverlay(friend, 'friends')}
              onAddByCode={addByCode}
              onRemove={(friend) => { removeFriend(friend.id); trackEvent('friend_removed', { friend_id: friend.id, friend_name: friend.name || friend.email }); }}
              onRegenerate={handleRegenerateCode}
              onOpenDetail={setFriendDetail}
              trackEvent={trackEvent}
              searchFriendIds={search.friendIds}
              searchCourseIds={search.courseIds}
              searchText={search.text}
              onClearSearch={() => { setSearch(EMPTY_SEARCH); trackEvent('search_cleared', { view: 'friends', source: 'banner' }); }}
            />
          ) : viewMode === 'alerts' ? (
            <AlertsView
              alerts={alerts}
              trackEvent={trackEvent}
              canPublish={isAdminEmail(profile?.email)}
              readOnly={isDemo}
              userId={userId}
            />
          ) : (
            <>
              {scheduleVisibleIds.size === 0 && friendOverlays.length === 0 && commitments.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center p-8">
                  <CalendarDays className="w-12 h-12 text-slate-600" />
                  <p className="text-slate-400 font-medium">No courses selected yet</p>
                  <p className="text-slate-600 text-sm max-w-sm">
                    Go to the <strong className="text-slate-400">Plan</strong> tab to select your courses — they&apos;ll appear here on your schedule.
                  </p>
                  <button
                    onClick={() => { setViewMode('plan'); trackEvent('view_changed', { to: 'plan', from: 'empty_schedule' }); }}
                    className="mt-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
                  >
                    Go to Plan →
                  </button>
                </div>
              ) : (
                <TimetableView
                  selected={selected}
                  visibleIds={scheduleVisibleIds}
                  userSpecs={profile.specializations}
                  selectedTerms={selectedTerms}
                  onCourseClick={course => { setActiveModal(course); trackEvent('course_viewed', { course_id: course.id, course_name: course.name }); }}
                  friendOverlays={friendOverlays}
                  friends={friends}
                  overlayIds={overlayIds}
                  onToggleOverlay={(friend) => handleToggleOverlay(friend, 'schedule')}
                  trackEvent={trackEvent}
                  courseSections={courseSections}
                  highlightIds={courseSearchActive ? searchMatchIds : undefined}
                  commitments={commitments}
                  onCommitmentClick={(c) => {
                    trackEvent('schedule_commitment_clicked', { kind: c.kind, competition_id: c.competitionId });
                    setViewMode('alerts');
                    trackEvent('view_changed', { to: 'alerts', from: 'schedule_deadline' });
                  }}
                />
              )}
            </>
          )}
          </div>
        </main>

        {/* Mobile bottom drawer — only renders on <lg */}
        <MobileDrawer
          filters={filters}
          onFiltersChange={handleFiltersChange}
          selected={selected}
          userSpecs={profile.specializations}
          onSpecToggle={handleSpecToggle}
          userName={profile.name}
          userEmail={profile.email}
          userAvatarUrl={profile.avatar_url ?? undefined}
          onSignOut={handleSignOut}
          trackEvent={trackEvent}
        />
      </div>

      <CourseDetailModal
        course={activeModal}
        isSelected={activeModal ? selected.has(activeModal.id) : false}
        onToggle={toggle}
        onClose={() => setActiveModal(null)}
      />

      <FriendDetailModal
        friend={friendDetail}
        selectedIds={friendDetail ? (friendSelections.get(friendDetail.id) ?? new Set<number>()) : new Set<number>()}
        color={friendDetail ? colorForFriend(friendDetail.id) : '#64748b'}
        onClose={() => setFriendDetail(null)}
      />

      <ChatWidget
        userId={userId}
        courses={getTermCourses(selected, getCurrentTerm())}
        plannedCourses={ALL_COURSES.filter(c => selected.has(c.id))}
        specializations={profile?.specializations ?? []}
        trackEvent={trackEvent}
        onAction={handleChatAction}
      />
    </div>
  );
}
