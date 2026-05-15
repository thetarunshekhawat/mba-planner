'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSelections } from '@/hooks/useSelections';
import { useAnalytics } from '@/hooks/useAnalytics';
import { TimetableView } from '@/components/planner/TimetableView';
import { PlannerListView } from '@/components/planner/PlannerListView';
import { FilterSidebar, type Filters } from '@/components/planner/FilterSidebar';
import { CourseDetailModal } from '@/components/planner/CourseDetailModal';
import { generateScheduleICS } from '@/lib/calendar';
import { GraduationCap, LayoutList, CalendarDays, Menu, X, CalendarPlus, CalendarHeart, Download, ShieldCheck } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ALL_COURSES } from '@/data/courses';
import type { Course, SpecId, Profile } from '@/types';
import { useRouter } from 'next/navigation';

const ADMIN_EMAILS = new Set([
  'tarun.shekhawat2027@bitsom.edu.in',
  'varad.dharap2027@bitsom.edu.in',
  'yash.kolhe2027@bitsom.edu.in',
  'apoorv.sharma2027@bitsom.edu.in',
]);

type ViewMode = 'plan' | 'schedule';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('plan');

  const { trackEvent } = useAnalytics(userId);
  const filtersDirtyRef = useRef(false);
  const { selected, loading, toggle, selectBatch, deselectBatch } = useSelections(
    userId,
    (type, courseId) => trackEvent(type, { course_id: courseId }),
  );

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

  // Debounced filter tracking — only fires after user actively changes filters
  useEffect(() => {
    if (!userId || !filtersDirtyRef.current) return;
    const timer = setTimeout(() => {
      trackEvent('filters_applied', { ...filters });
    }, 800);
    return () => clearTimeout(timer);
  }, [filters, userId]);

  function handleFiltersChange(newFilters: Filters) {
    filtersDirtyRef.current = true;
    setFilters(newFilters);
  }

  async function handleSignOut() {
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
    await supabase.from('profiles').update({ specializations: next }).eq('id', profile.id);

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
    const coursesToExport = ALL_COURSES.filter(c => scheduleVisibleIds.has(c.id));
    if (coursesToExport.length === 0) return;
    trackEvent('export_triggered', { type: 'ics' });
    
    const icsContent = generateScheduleICS(coursesToExport);
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
    const courseIds = Array.from(selected).join(',');
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
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-slate-900/95 backdrop-blur border-b border-white/10 sticky top-0 z-30 print:hidden">
        <div className="flex-1 flex items-center gap-3">
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(s => !s)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-sm hidden sm:inline">MBA Planner</span>
            <span className="text-slate-500 text-xs hidden sm:inline">· BITSoM Co&apos;27</span>
          </div>
        </div>

        {/* View toggle — centered */}
        <div className="flex-none flex justify-center">
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-white/10">
            <button
              onClick={() => { setViewMode('plan'); trackEvent('view_changed', { to: 'plan' }); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'plan'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Plan
            </button>
            <button
              onClick={() => { setViewMode('schedule'); trackEvent('view_changed', { to: 'schedule' }); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'schedule'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              My Schedule
              {selected.size > 0 && (
                <span className="ml-0.5 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {selected.size}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex-1 flex items-center justify-end gap-2">
          {profile?.email && ADMIN_EMAILS.has(profile.email.toLowerCase()) && (
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 text-orange-400 hover:bg-slate-700 hover:text-orange-300 transition-all border border-orange-500/30"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
          {viewMode === 'schedule' && (
            <>
              <Dialog>
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
                          href={getGoogleCalendarUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent('export_triggered', { type: 'google' })}
                          className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-white/5"
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
                          href={getAppleCalendarUrl()}
                          onClick={() => trackEvent('export_triggered', { type: 'apple' })}
                          className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-white/5"
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
                          className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-white/5 w-full"
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
              <Sheet>
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
        <div className={`
          max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-20 max-lg:pt-[53px]
          flex-shrink-0 h-full
          transition-transform duration-200
          ${sidebarOpen ? '' : 'max-lg:-translate-x-full'}
          print:hidden
        `}>
          <FilterSidebar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            selected={selected}
            userSpecs={profile.specializations}
            onSpecToggle={handleSpecToggle}
            userName={profile.name}
            userEmail={profile.email}
            onSignOut={handleSignOut}
          />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-10 bg-black/50 lg:hidden print:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto min-h-0 print:overflow-visible print:h-auto">
          {viewMode === 'plan' ? (
            <PlannerListView
              selected={selected}
              userSpecs={profile.specializations}
              visibleIds={planVisibleIds}
              onToggle={toggle}
              onCourseClick={course => { setActiveModal(course); trackEvent('course_viewed', { course_id: course.id, course_name: course.name }); }}
            />
          ) : (
            <>
              {selected.size === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-center p-8">
                  <CalendarDays className="w-12 h-12 text-slate-600" />
                  <p className="text-slate-400 font-medium">No courses selected yet</p>
                  <p className="text-slate-600 text-sm max-w-sm">
                    Go to the <strong className="text-slate-400">Plan</strong> tab to select your courses — they&apos;ll appear here on your schedule.
                  </p>
                  <button
                    onClick={() => setViewMode('plan')}
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
                  onCourseClick={course => { setActiveModal(course); trackEvent('course_viewed', { course_id: course.id, course_name: course.name }); }}
                />
              )}
            </>
          )}
        </main>
      </div>

      <CourseDetailModal
        course={activeModal}
        isSelected={activeModal ? selected.has(activeModal.id) : false}
        onToggle={toggle}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
