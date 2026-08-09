'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, LogOut, BookOpen, ShieldAlert, Layers } from 'lucide-react';
import { SPECS } from '@/data/courses';
import {
  computeProgress, formatCampusDay, SPEC_REQUIRED_CREDITS,
  type ProgressBasis,
} from '@/lib/progress';
import { campusToday } from '@/lib/terms';
import { BasisToggle } from './BasisToggle';
import { SpecializationsDialog } from './SpecializationsDialog';
import type { EventType } from '@/hooks/useAnalytics';
import type { SpecId, WorkloadLevel } from '@/types';

const WORKLOAD_OPTIONS: WorkloadLevel[] = ['Low', 'Low-Moderate', 'Moderate', 'Moderate-High', 'High'];

export interface Filters {
  specs: SpecId[];          // active specialization filter (empty = show all)
  minDepth: number;         // 0 = no filter
  minRelevance: number;
  workloads: WorkloadLevel[];// empty = all
  selectedOnly: boolean;
  showWaw: boolean;
  showMandatoryOnly: boolean;
}

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
  mobile?: boolean;
  trackEvent?: (eventType: EventType, payload?: Record<string, unknown>) => void;
}

function SpecButton({
  spec,
  active,
  onToggle,
}: {
  spec: typeof SPECS[number];
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex-1 min-w-[calc(50%-4px)] text-xs font-medium px-2 py-1.5 rounded-lg border transition-all"
      style={{
        borderColor: active ? spec.color : 'rgba(255,255,255,0.1)',
        backgroundColor: active ? spec.color + '22' : 'transparent',
        color: active ? spec.color : '#94a3b8',
      }}
    >
      {spec.label}
    </button>
  );
}

export function FilterSidebar({
  filters,
  onFiltersChange,
  selected,
  userSpecs,
  onSpecToggle,
  userName,
  userEmail,
  userAvatarUrl,
  onSignOut,
  mobile = false,
  trackEvent,
}: Props) {
  // Which question the numbers answer. Defaults to the full-year reading the
  // planner has always shown, so nobody's sidebar changes meaning unasked.
  const [basis, setBasis] = useState<ProgressBasis>('full-year');
  const [specsOpen, setSpecsOpen] = useState(false);

  const today = campusToday();
  const summary = useMemo(
    () => computeProgress(selected, userSpecs, { basis, today }),
    [selected, userSpecs, basis, today],
  );

  // Specializations completed purely as a side effect of the declared ones —
  // the number the "All specializations" button exists to surface.
  const bonusCount = summary.specs.filter(s => !s.declared && s.complete).length;

  function changeBasis(next: ProgressBasis) {
    setBasis(next);
    trackEvent?.('progress_basis_changed', { basis: next, surface: mobile ? 'drawer' : 'sidebar' });
  }

  function set(partial: Partial<Filters>) {
    onFiltersChange({ ...filters, ...partial });
  }

  function toggleWorkload(w: WorkloadLevel) {
    const next = filters.workloads.includes(w)
      ? filters.workloads.filter(x => x !== w)
      : [...filters.workloads, w];
    set({ workloads: next });
  }

  const Wrapper = mobile ? 'div' : 'aside';
  const wrapperClass = mobile
    ? 'w-full flex flex-col bg-slate-900'
    : 'w-64 flex-shrink-0 bg-slate-900/80 border-r border-white/10 flex flex-col h-full overflow-y-auto';

  return (
    <Wrapper className={wrapperClass}>
      {/* User header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{userName}</p>
            <p className="text-slate-500 text-xs truncate">{userEmail}</p>
          </div>
          <button
            onClick={onSignOut}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Specialization selector */}
      <div className="p-4 border-b border-white/10">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">My Specializations</p>
        <div className="flex flex-wrap gap-1.5">
          {SPECS.map(s => (
            <SpecButton
              key={s.id}
              spec={s}
              active={userSpecs.includes(s.id)}
              onToggle={() => onSpecToggle(s.id)}
            />
          ))}
        </div>
        {userSpecs.length > 0 && (
          <p className="text-slate-600 text-xs mt-2">
            {userSpecs.length === 1
              ? 'Pick 1–2 more for dual/triple spec'
              : userSpecs.length === 2
              ? 'Dual specialization — or pick 1 more'
              : 'Triple specialization selected'}
          </p>
        )}
      </div>

      {/* Credit Progress */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Progress</p>
          {basis === 'to-date' && (
            <span className="text-sky-300/80 text-[10px] font-medium">
              banked by {formatCampusDay(today)}
            </span>
          )}
        </div>

        <BasisToggle basis={basis} onChange={changeBasis} today={today} className="mb-3" />

        <div className="space-y-3">
          {/* Total electives */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Electives
              </span>
              <span className="text-white text-xs font-semibold">
                {summary.electives.earned}/{summary.electives.total}
              </span>
            </div>
            <Progress
              value={(summary.electives.earned / summary.electives.total) * 100}
              className="h-1.5 bg-white/10"
              indicatorStyle={{ backgroundColor: '#38bdf8' }}
            />
          </div>

          {/* WaW */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> WaW
              </span>
              <span className="text-white text-xs font-semibold">
                {summary.waw.earned}/{summary.waw.total}
              </span>
            </div>
            <Progress
              value={(summary.waw.earned / summary.waw.total) * 100}
              className="h-1.5 bg-white/10"
              indicatorStyle={{ backgroundColor: '#fbbf24' }}
            />
          </div>

          {/* Per-spec progress (for declared specs — the rest live in the dialog) */}
          {summary.specs.filter(s => s.declared).map(entry => {
            const isExceeded = entry.earned > SPEC_REQUIRED_CREDITS;
            const indicatorColor = isExceeded ? '#f59e0b' : entry.spec.color;
            return (
              <div key={entry.spec.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: entry.spec.color }}>
                    {entry.spec.label}
                  </span>
                  <span className="text-white text-xs font-semibold">
                    {entry.earned}/{SPEC_REQUIRED_CREDITS}
                    <span className="text-slate-500 font-normal"> req</span>
                    {isExceeded && (
                      <span className="ml-1 text-amber-400 font-semibold">
                        +{entry.earned - SPEC_REQUIRED_CREDITS}
                      </span>
                    )}
                  </span>
                </div>
                <Progress
                  value={Math.min((entry.earned / SPEC_REQUIRED_CREDITS) * 100, 100)}
                  className="h-1.5 bg-white/10"
                  indicatorStyle={{ backgroundColor: indicatorColor }}
                />
              </div>
            );
          })}
        </div>

        {/* Every spec, including the ones earned without declaring them */}
        <button
          onClick={() => {
            setSpecsOpen(true);
            trackEvent?.('spec_overview_opened', {
              basis,
              surface: mobile ? 'drawer' : 'sidebar',
              bonus_complete: summary.specs.filter(s => !s.declared && s.complete).length,
            });
          }}
          className="mt-3 w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white/10 text-slate-400 hover:text-sky-300 hover:border-sky-400/40 transition-all font-semibold text-xs"
        >
          <Layers className="w-3.5 h-3.5 flex-shrink-0" />
          All specializations
          {bonusCount > 0 && (
            <span
              className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#10b98122', color: '#6ee7b7' }}
            >
              +{bonusCount}
            </span>
          )}
        </button>
      </div>

      <SpecializationsDialog
        open={specsOpen}
        onOpenChange={setSpecsOpen}
        summary={summary}
        basis={basis}
        onBasisChange={changeBasis}
      />

      {/* Mandatory courses quick-filter tab */}
      <div className="p-4 border-b border-white/10">
        <button
          onClick={() => set({ showMandatoryOnly: !filters.showMandatoryOnly })}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all font-semibold text-xs"
          style={{
            backgroundColor: filters.showMandatoryOnly ? '#dc262618' : 'transparent',
            borderColor: filters.showMandatoryOnly ? '#dc2626aa' : 'rgba(255,255,255,0.1)',
            color: filters.showMandatoryOnly ? '#ef4444' : '#94a3b8',
          }}
        >
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
          Mandatory Courses Only
          {filters.showMandatoryOnly && (
            <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#dc262622', color: '#ef4444' }}>ON</span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 space-y-5 flex-1">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Filters</p>

        {/* Min Learning Depth */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-400 text-xs">Min Learning Depth</label>
            <span className="text-slate-300 text-xs font-semibold">
              {filters.minDepth === 0 ? 'Any' : `${filters.minDepth}★+`}
            </span>
          </div>
          <Slider
            min={0} max={5} step={1}
            value={[filters.minDepth]}
            onValueChange={(v) => set({ minDepth: Array.isArray(v) ? (v as number[])[0] : (v as number) })}
            className="w-full"
          />
        </div>

        {/* Min Career Relevance */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-400 text-xs">Min Career Relevance</label>
            <span className="text-slate-300 text-xs font-semibold">
              {filters.minRelevance === 0 ? 'Any' : `${filters.minRelevance}★+`}
            </span>
          </div>
          <Slider
            min={0} max={5} step={1}
            value={[filters.minRelevance]}
            onValueChange={(v) => set({ minRelevance: Array.isArray(v) ? (v as number[])[0] : (v as number) })}
            className="w-full"
          />
        </div>

        {/* Workload filter */}
        <div>
          <p className="text-slate-400 text-xs mb-2">Workload</p>
          <div className="space-y-1.5">
            {WORKLOAD_OPTIONS.map(w => (
              <label key={w} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  id={`wl-${w}`}
                  checked={filters.workloads.length === 0 || filters.workloads.includes(w)}
                  onCheckedChange={() => toggleWorkload(w)}
                />
                <span className="text-slate-400 text-xs">{w}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              id="selected-only"
              checked={filters.selectedOnly}
              onCheckedChange={v => set({ selectedOnly: !!v })}
            />
            <span className="text-slate-400 text-xs">Selected courses only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              id="show-waw"
              checked={filters.showWaw}
              onCheckedChange={v => set({ showWaw: !!v })}
            />
            <span className="text-slate-400 text-xs">Show WaW courses</span>
          </label>
        </div>
      </div>
    </Wrapper>
  );
}
