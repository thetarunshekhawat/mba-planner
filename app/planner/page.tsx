'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSelections } from '@/hooks/useSelections';
import { TimetableView } from '@/components/planner/TimetableView';
import { PlannerListView } from '@/components/planner/PlannerListView';
import { FilterSidebar, type Filters } from '@/components/planner/FilterSidebar';
import { CourseDetailModal } from '@/components/planner/CourseDetailModal';
import { GraduationCap, LayoutList, CalendarDays, Menu, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ALL_COURSES } from '@/data/courses';
import type { Course, SpecId, Profile } from '@/types';
import { useRouter } from 'next/navigation';

type ViewMode = 'plan' | 'schedule';

const DEFAULT_FILTERS: Filters = {
  specs: [],
  minDepth: 0,
  minRelevance: 0,
  workloads: [],
  selectedOnly: false,
  showWaw: true,
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

  const { selected, loading, toggle } = useSelections(userId);

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  function handleSpecToggle(spec: SpecId) {
    if (!profile) return;
    const current = profile.specializations;
    let next: SpecId[];
    if (current.includes(spec)) {
      next = current.filter(s => s !== spec);
    } else if (current.length >= 2) {
      next = [current[1], spec];
    } else {
      next = [...current, spec];
    }
    setProfile({ ...profile, specializations: next });
    supabase.from('profiles').update({ specializations: next }).eq('id', profile.id);
  }

  // For "Plan" tab: show all courses that pass filters
  const planVisibleIds = new Set(
    ALL_COURSES
      .filter(c => {
        if (c.type === 'exam' || c.type === 'free') return false;
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

  if (loading || !profile) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading your plan...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-slate-900/95 backdrop-blur border-b border-white/10 sticky top-0 z-30">
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
              onClick={() => setViewMode('plan')}
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
              onClick={() => setViewMode('schedule')}
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
        <div className="flex-1 flex items-center justify-end">
          {viewMode === 'schedule' && (
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
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
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
        `}>
          <FilterSidebar
            filters={filters}
            onFiltersChange={setFilters}
            selected={selected}
            userSpecs={profile.specializations}
            onSpecToggle={handleSpecToggle}
            userName={profile.name}
            userEmail={profile.email}
            onSignOut={handleSignOut}
          />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-10 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto min-h-0">
          {viewMode === 'plan' ? (
            <PlannerListView
              selected={selected}
              userSpecs={profile.specializations}
              visibleIds={planVisibleIds}
              onToggle={toggle}
              onCourseClick={course => setActiveModal(course)}
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
                  onCourseClick={course => setActiveModal(course)}
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
