'use client';

import { useState, useRef } from 'react';
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
  userAvatarUrl?: string;
  onSignOut: () => void;
  trackEvent: (type: EventType, payload?: Record<string, unknown>) => void;
}

const TOTAL_ELECTIVE_CREDITS = 16;
const SPEC_REQUIRED_CREDITS = 6;
// Must match h-20 (5rem at 16px base = 80px)
const HANDLE_H = 80;
const DRAWER_VH = 0.65;
const SNAP_SPRING = 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)';

export function MobileDrawer({
  filters,
  onFiltersChange,
  selected,
  userSpecs,
  onSpecToggle,
  userName,
  userEmail,
  userAvatarUrl,
  onSignOut,
  trackEvent,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  // Tracks current translateY in px; null = using CSS initial value
  const currentTY = useRef<number | null>(null);
  const drag = useRef({
    active: false,
    startY: 0,
    startTY: 0,
    lastY: 0,
    lastT: 0,
    vel: 0,   // px/ms, positive = downward
  });

  const electives = ALL_COURSES.filter(c => c.type === 'elective');
  const selectedElectiveCount = electives.filter(c => selected.has(c.id)).length;
  const activeSpecs = SPECS.filter(s => userSpecs.includes(s.id));
  const hasSpecs = activeSpecs.length > 0;

  const specProgress = activeSpecs.map(spec => {
    const specCourses = electives.filter(c => c.specs.includes(spec.id));
    return { spec, selected: specCourses.filter(c => selected.has(c.id)).length };
  });

  function collapsedY() {
    return window.innerHeight * DRAWER_VH - HANDLE_H;
  }

  function applyTY(y: number, animate: boolean) {
    currentTY.current = y;
    const el = drawerRef.current;
    if (!el) return;
    el.style.transition = animate ? SNAP_SPRING : 'none';
    el.style.transform = `translateY(${y}px)`;
  }

  function snapToState(shouldExpand: boolean, fromTouch: boolean) {
    applyTY(shouldExpand ? 0 : collapsedY(), true);
    if (shouldExpand !== expanded) {
      setExpanded(shouldExpand);
      trackEvent('mobile_drawer_toggled', { open: shouldExpand, has_specs: hasSpecs, gesture: fromTouch });
    }
  }

  // Click toggle used only by the backdrop overlay
  function toggle() {
    snapToState(!expanded, false);
  }

  function handleTouchStart(e: React.TouchEvent) {
    const y = e.touches[0].clientY;
    drag.current = {
      active: true,
      startY: y,
      startTY: currentTY.current ?? (expanded ? 0 : collapsedY()),
      lastY: y,
      lastT: Date.now(),
      vel: 0,
    };
    if (drawerRef.current) drawerRef.current.style.transition = 'none';
  }

  function handleTouchMove(e: React.TouchEvent) {
    const d = drag.current;
    if (!d.active) return;
    const y = e.touches[0].clientY;
    const now = Date.now();
    const dt = now - d.lastT;
    if (dt > 0) d.vel = (y - d.lastY) / dt;
    d.lastY = y;
    d.lastT = now;
    const collapsed = collapsedY();
    const ty = Math.max(0, Math.min(collapsed, d.startTY + (y - d.startY)));
    applyTY(ty, false);
  }

  function handleTouchEnd() {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;

    const collapsed = collapsedY();
    const ty = currentTY.current ?? (expanded ? 0 : collapsed);
    const displacement = ty - d.startTY;

    let shouldExpand: boolean;
    if (Math.abs(displacement) < 8) {
      // Tap with no real movement — toggle
      shouldExpand = !expanded;
    } else if (d.vel < -0.3) {
      shouldExpand = true;   // fast swipe up
    } else if (d.vel > 0.3) {
      shouldExpand = false;  // fast swipe down
    } else {
      shouldExpand = ty < collapsed / 2;
    }

    snapToState(shouldExpand, true);
  }

  function handleTouchCancel() {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    const collapsed = collapsedY();
    const ty = currentTY.current ?? (expanded ? 0 : collapsed);
    snapToState(ty < collapsed / 2, true);
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
        ref={drawerRef}
        // Initial CSS position: collapsed (only handle visible)
        style={{ transform: `translateY(calc(${DRAWER_VH * 100}vh - ${HANDLE_H}px))` }}
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden print:hidden
          bg-slate-900 border-t border-white/10
          flex flex-col overflow-hidden
          h-[65vh]"
      >
        {/* Drag handle — h-20 matches HANDLE_H so content never peeks through when collapsed */}
        <div
          className="flex-shrink-0 h-20 cursor-pointer select-none"
          style={{ touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-8 h-1 rounded-full bg-white/20" />
          </div>

          <div className="px-4 pb-3 flex items-center gap-2 min-w-0">
            {hasSpecs ? (
              <>
                <div
                  className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar"
                  style={{ touchAction: 'pan-x' }}
                >
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <FilterSidebar
            filters={filters}
            onFiltersChange={onFiltersChange}
            selected={selected}
            userSpecs={userSpecs}
            onSpecToggle={handleSpecChipTap}
            userName={userName}
            userEmail={userEmail}
            userAvatarUrl={userAvatarUrl}
            onSignOut={onSignOut}
            mobile
            trackEvent={trackEvent}
          />
        </div>
      </div>
    </>
  );
}
