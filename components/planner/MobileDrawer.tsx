'use client';

import { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { SPECS, ALL_COURSES } from '@/data/courses';
import type { SpecId } from '@/types';
import { FilterSidebar, type Filters } from './FilterSidebar';
import type { EventType } from '@/hooks/useAnalytics';

interface Props {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  selected: Set<number>;
  userSpecs: SpecId[];
  onSpecToggle: (spec: SpecId) => void;
  userName: string;
  userEmail: string;
  onSignOut: () => void;
  trackEvent: (type: EventType, payload?: Record<string, unknown>) => void;
}

const TOTAL_ELECTIVE_CREDITS = 16;
const SPEC_REQUIRED_CREDITS = 6;

export function MobileDrawer({
  filters,
  onFiltersChange,
  selected,
  userSpecs,
  onSpecToggle,
  userName,
  userEmail,
  onSignOut,
  trackEvent,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const electives = ALL_COURSES.filter(c => c.type === 'elective');
  const selectedElectiveCount = electives.filter(c => selected.has(c.id)).length;
  const activeSpecs = SPECS.filter(s => userSpecs.includes(s.id));
  const hasSpecs = activeSpecs.length > 0;

  const specProgress = activeSpecs.map(spec => {
    const specCourses = electives.filter(c => c.specs.includes(spec.id));
    return { spec, selected: specCourses.filter(c => selected.has(c.id)).length };
  });

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    trackEvent('mobile_drawer_toggled', { open: next, has_specs: hasSpecs });
  }

  function handleSpecChipTap(specId: SpecId) {
    trackEvent('mobile_drawer_spec_tapped', { spec: specId });
    onSpecToggle(specId);
  }

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={toggle}
        />
      )}

      <div
        className={`
          fixed bottom-0 left-0 right-0 z-30 lg:hidden print:hidden
          bg-slate-900 border-t border-white/10
          flex flex-col overflow-hidden
          transition-[height] duration-300 ease-out
          ${expanded ? 'h-[65vh]' : 'h-20'}
        `}
      >
        {/* Always-visible tappable bar */}
        <div
          className="flex-shrink-0 cursor-pointer select-none"
          onClick={toggle}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-8 h-1 rounded-full bg-white/20" />
          </div>

          <div className="px-4 pb-3 flex items-center gap-2 min-w-0">
            {hasSpecs ? (
              <>
                <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar">
                  {activeSpecs.map(spec => {
                    const prog = specProgress.find(p => p.spec.id === spec.id)!;
                    return (
                      <span
                        key={spec.id}
                        className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-lg border"
                        style={{
                          borderColor: spec.color,
                          backgroundColor: spec.color + '22',
                          color: spec.color,
                        }}
                      >
                        {spec.label} {prog.selected}/{SPEC_REQUIRED_CREDITS}
                      </span>
                    );
                  })}
                </div>
                <span className="flex-shrink-0 text-xs text-slate-400">
                  {selectedElectiveCount}/{TOTAL_ELECTIVE_CREDITS} cr
                </span>
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 text-sm flex-1">
                <span>🎯</span>
                <span>Pick your specialization tracks</span>
                <ChevronUp className="w-4 h-4 ml-auto" />
              </div>
            )}
          </div>
        </div>

        {/* Expanded: full sidebar content */}
        <div className="flex-1 overflow-y-auto">
          <FilterSidebar
            filters={filters}
            onFiltersChange={onFiltersChange}
            selected={selected}
            userSpecs={userSpecs}
            onSpecToggle={handleSpecChipTap}
            userName={userName}
            userEmail={userEmail}
            onSignOut={onSignOut}
            mobile
          />
        </div>
      </div>
    </>
  );
}
