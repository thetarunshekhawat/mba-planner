'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSelections } from '@/hooks/useSelections';
import { useAnalytics } from '@/hooks/useAnalytics';
import { TimetableView } from '@/components/planner-kyoto/TimetableView';
import { PlannerListView } from '@/components/planner-kyoto/PlannerListView';
import { FilterSidebar, type Filters } from '@/components/planner-kyoto/FilterSidebar';
import { CourseDetailModal } from '@/components/planner-kyoto/CourseDetailModal';
import { generateScheduleICS } from '@/lib/calendar';
import {
  LayoutList, CalendarDays, Menu, X,
  CalendarPlus, CalendarHeart, Download, ShieldCheck,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ALL_COURSES } from '@/data/courses';
import type { Course, SpecId, Profile } from '@/types';
import { useRouter } from 'next/navigation';
import { isAdminEmail } from '@/lib/admin';

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

const BTN_BASE: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '5px 12px', borderRadius: 3, fontSize: 12, fontWeight: 600,
  border: '1px solid var(--dim)', cursor: 'pointer',
  transition: 'background-color 150ms, color 150ms',
  background: 'var(--raised)', color: 'var(--sand)',
  fontFamily: 'var(--font-body)',
};

export default function KyotoPage() {
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
  const modalOpenTimeRef = useRef<number | null>(null);
  const modalCourseRef = useRef<Course | null>(null);
  const planVisibleCountRef = useRef(0);
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

  useEffect(() => {
    if (!userId || !filtersDirtyRef.current) return;
    const timer = setTimeout(() => {
      trackEvent('filters_applied', { ...filters });
      if (planVisibleCountRef.current === 0) {
        trackEvent('filter_dead_end', { ...filters });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [filters, userId]);

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

  function handleFiltersChange(newFilters: Filters) {
    filtersDirtyRef.current = true;
    setFilters(newFilters);
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
    await supabase.from('profiles').update({ specializations: next }).eq('id', profile.id);

    const mandatoryCourses = ALL_COURSES.filter(c => c.mandatoryFor?.includes(spec));
    if (next.includes(spec)) {
      selectBatch(mandatoryCourses.map(c => c.id));
    } else {
      const toDeselect = mandatoryCourses
        .filter(c => !c.mandatoryFor!.some(s => next.includes(s)))
        .map(c => c.id);
      deselectBatch(toDeselect);
    }
  }

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

  planVisibleCountRef.current = planVisibleIds.size;

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
      <div style={{ height: '100vh', backgroundColor: '#f6f2ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9a8a78', fontFamily: '"Mulish", system-ui, sans-serif', fontSize: 14 }} className="animate-pulse">
          Loading your plan…
        </p>
      </div>
    );
  }

  return (
    <div
      className="kyoto-root h-screen flex flex-col overflow-hidden print:h-auto print:overflow-visible"
      style={{ backgroundColor: 'var(--bg)', fontFamily: 'var(--font-body)', color: 'var(--cream)' }}
    >
      {/* Top bar */}
      <header
        className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 sticky top-0 z-30 print:hidden"
        style={{ backgroundColor: 'var(--card)', borderBottom: '1px solid var(--dim)' }}
      >
        {/* Left: hamburger + logo */}
        <div className="flex-1 flex items-center gap-3">
          <button
            className="lg:hidden"
            style={{ color: 'var(--ash)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              const next = !sidebarOpen;
              trackEvent('sidebar_toggled', { open: next });
              setSidebarOpen(next);
            }}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center flex-shrink-0"
              style={
                {
                  // Kyoto runs a warm paper palette, so the mark takes the
                  // route's vermilion for the tile and paper for the glyph
                  // rather than the default slate/amber.
                  '--logo-tile': 'var(--accent)',
                  '--logo-mark-from': 'var(--bg)',
                  '--logo-mark-to': 'var(--surface)',
                } as React.CSSProperties
              }
            >
              <Logo size={28} radius={7} />
            </div>
            <span
              className="font-bold text-sm hidden sm:inline"
              style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--cream)' }}
            >
              MBA Planner
            </span>
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--ash)' }}>· BITSoM Co&apos;27</span>
          </div>
        </div>

        {/* Center: sliding pill view toggle */}
        <div className="flex-none flex justify-center">
          {/*
            Grid (not flex) forces exactly equal column widths regardless of content.
            Pill uses translateX(100%) = its own width = one column → always aligns correctly.
          */}
          <div
            className="relative"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'var(--raised)',
              borderRadius: 'var(--radius)',
              padding: 2,
              border: '1px solid var(--dim)',
            }}
          >
            {/* Sliding pill — width matches one column; translateX snaps it left or right */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 2, bottom: 2, left: 2,
                width: 'calc(50% - 2px)',
                backgroundColor: 'var(--card)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 1px 3px rgba(26,16,8,0.12)',
                transform: viewMode === 'plan' ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 380ms cubic-bezier(0.34,1.56,0.64,1)',
                pointerEvents: 'none',
              }}
            />
            <button
              onClick={() => { setViewMode('plan'); trackEvent('view_changed', { to: 'plan' }); }}
              style={{
                position: 'relative', zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                color: viewMode === 'plan' ? 'var(--cream)' : 'var(--ash)',
                transition: 'color 200ms',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-body)',
              }}
            >
              <LayoutList style={{ width: 13, height: 13 }} />
              Plan
            </button>
            <button
              onClick={() => { setViewMode('schedule'); trackEvent('view_changed', { to: 'schedule' }); }}
              style={{
                position: 'relative', zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                color: viewMode === 'schedule' ? 'var(--cream)' : 'var(--ash)',
                transition: 'color 200ms',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-body)',
              }}
            >
              <CalendarDays style={{ width: 13, height: 13 }} />
              My Schedule
              {selected.size > 0 && (
                <span style={{
                  marginLeft: 2,
                  backgroundColor: 'var(--accent)', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  width: 16, height: 16, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {selected.size}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right: admin + export buttons */}
        <div className="flex-1 flex items-center justify-end gap-2">
          {isAdminEmail(profile?.email) && (
            <button
              onClick={() => router.push('/admin')}
              style={{
                ...BTN_BASE,
                backgroundColor: 'var(--accent-dim)',
                color: 'var(--accent)',
                borderColor: 'var(--accent)',
              }}
            >
              <ShieldCheck style={{ width: 13, height: 13 }} />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {viewMode === 'schedule' && (
            <>
              <Dialog onOpenChange={(open) => { if (open) trackEvent('export_dialog_opened'); }}>
                <DialogTrigger render={
                  <button style={BTN_BASE} title="Export Schedule" />
                }>
                  <CalendarPlus style={{ width: 13, height: 13 }} />
                  <span className="hidden sm:inline">Export</span>
                </DialogTrigger>
                <DialogContent
                  className="sm:max-w-md"
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--dim)', color: 'var(--cream)', fontFamily: 'var(--font-body)' }}
                >
                  <DialogHeader>
                    <DialogTitle style={{ color: 'var(--cream)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                      Export Options
                    </DialogTitle>
                    <DialogDescription style={{ color: 'var(--ash)' }}>
                      Choose how you want to export your schedule.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-6 mt-4">
                    <div>
                      <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--sand)', marginBottom: 10, paddingLeft: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document</h4>
                      <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-3 p-3 w-full rounded-sm transition-colors"
                        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--dim)', color: 'var(--cream)' }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-dim)' }}>
                          <Download className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                        </div>
                        <div className="text-left">
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--cream)' }}>Save as PDF</div>
                          <div style={{ fontSize: 12, color: 'var(--ash)' }}>Print or save as a PDF document</div>
                        </div>
                      </button>
                    </div>

                    <div>
                      <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--sand)', marginBottom: 10, paddingLeft: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Calendar Sync</h4>
                      <div className="flex flex-col gap-2">
                        <a
                          href={getGoogleCalendarUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent('export_triggered', { type: 'google' })}
                          className="flex items-center gap-3 p-3 rounded-sm transition-colors"
                          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--dim)', color: 'var(--cream)', textDecoration: 'none' }}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dbeafe' }}>
                            <svg className="w-4 h-4" style={{ color: '#2563eb' }} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/>
                            </svg>
                          </div>
                          <div className="text-left">
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--cream)' }}>Subscribe in Google Calendar</div>
                            <div style={{ fontSize: 12, color: 'var(--ash)' }}>Updates automatically</div>
                          </div>
                        </a>

                        <a
                          href={getAppleCalendarUrl()}
                          onClick={() => trackEvent('export_triggered', { type: 'apple' })}
                          className="flex items-center gap-3 p-3 rounded-sm transition-colors"
                          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--dim)', color: 'var(--cream)', textDecoration: 'none' }}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fee2e2' }}>
                            <svg className="w-4 h-4" style={{ color: '#dc2626' }} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.89 4 3 4.9 3 6v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--cream)' }}>Subscribe in Apple Calendar</div>
                            <div style={{ fontSize: 12, color: 'var(--ash)' }}>Updates automatically</div>
                          </div>
                        </a>

                        <button
                          onClick={handleExportCalendar}
                          className="flex items-center gap-3 p-3 rounded-sm transition-colors w-full"
                          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--dim)', color: 'var(--cream)' }}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--raised)' }}>
                            <CalendarHeart className="w-4 h-4" style={{ color: 'var(--sand)' }} />
                          </div>
                          <div className="text-left">
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--cream)' }}>Download .ics File</div>
                            <div style={{ fontSize: 12, color: 'var(--ash)' }}>Static file, manually import</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Sheet onOpenChange={(open) => { if (open) trackEvent('calendar_panel_opened'); }}>
                <SheetTrigger render={<button style={BTN_BASE} />}>
                  <CalendarDays style={{ width: 13, height: 13 }} />
                  <span className="hidden sm:inline">Calendar</span>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[340px] sm:w-[400px] p-6"
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--dim)', fontFamily: 'var(--font-body)', color: 'var(--cream)' }}
                >
                  <SheetHeader className="px-0">
                    <SheetTitle style={{ color: 'var(--cream)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                      Monthly Calendar
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 flex justify-center">
                    <Calendar
                      mode="single"
                      className="rounded-sm"
                      style={{ border: '1px solid var(--dim)', backgroundColor: 'var(--surface)', color: 'var(--cream)' }}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0 print:overflow-visible print:h-auto">
        {/* Sidebar */}
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
          <div
            className="fixed inset-0 z-10 lg:hidden print:hidden"
            style={{ backgroundColor: 'rgba(26,16,8,0.4)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-h-0 print:overflow-visible print:h-auto">
          <div key={viewMode} className="animate-view-fade-in">
            {viewMode === 'plan' ? (
              <PlannerListView
                selected={selected}
                userSpecs={profile.specializations}
                visibleIds={planVisibleIds}
                onToggle={toggle}
                onCourseClick={course => {
                  setActiveModal(course);
                  trackEvent('course_viewed', { course_id: course.id, course_name: course.name });
                }}
              />
            ) : (
              <>
                {selected.size === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-center p-8">
                    <CalendarDays className="w-12 h-12" style={{ color: 'var(--mid)' }} />
                    <p style={{ color: 'var(--sand)', fontWeight: 600 }}>No courses selected yet</p>
                    <p style={{ color: 'var(--ash)', fontSize: 14, maxWidth: 320 }}>
                      Go to the <strong style={{ color: 'var(--sand)' }}>Plan</strong> tab to select your courses — they&apos;ll appear here on your schedule.
                    </p>
                    <button
                      onClick={() => { setViewMode('plan'); trackEvent('view_changed', { to: 'plan', from: 'empty_schedule' }); }}
                      style={{
                        marginTop: 8,
                        padding: '8px 20px',
                        borderRadius: 'var(--radius)',
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      Go to Plan →
                    </button>
                  </div>
                ) : (
                  <TimetableView
                    selected={selected}
                    visibleIds={scheduleVisibleIds}
                    userSpecs={profile.specializations}
                    onCourseClick={course => {
                      setActiveModal(course);
                      trackEvent('course_viewed', { course_id: course.id, course_name: course.name });
                    }}
                  />
                )}
              </>
            )}
          </div>
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
