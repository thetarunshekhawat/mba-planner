'use client';

import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, LogOut, BookOpen } from 'lucide-react';
import { SPECS, ALL_COURSES, WAW_IDS, MANDATORY_IDS } from '@/data/courses';
import type { SpecId, WorkloadLevel } from '@/types';

const WORKLOAD_OPTIONS: WorkloadLevel[] = ['Low', 'Low-Moderate', 'Moderate', 'Moderate-High', 'High'];
const TOTAL_ELECTIVE_CREDITS = 16;
const SPEC_REQUIRED_CREDITS = 6;
const TOTAL_WAW = ALL_COURSES.filter(c => c.type === 'waw').length;

export interface Filters {
  specs: SpecId[];          // active specialization filter (empty = show all)
  minDepth: number;         // 0 = no filter
  minRelevance: number;
  workloads: WorkloadLevel[];// empty = all
  selectedOnly: boolean;
  showWaw: boolean;
}

interface Props {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  selected: Set<number>;
  userSpecs: SpecId[];
  onSpecToggle: (spec: SpecId) => void;
  userName: string;
  userEmail: string;
  onSignOut: () => void;
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
  onSignOut,
}: Props) {
  const electives = ALL_COURSES.filter(c => c.type === 'elective');
  const selectedElectives = electives.filter(c => selected.has(c.id));
  const selectedElectiveCount = selectedElectives.length;
  const wawCount = ALL_COURSES.filter(c => c.type === 'waw' && selected.has(c.id)).length;

  const specProgress = SPECS.map(spec => {
    const specCourses = electives.filter(c => c.specs.includes(spec.id));
    const selectedSpec = specCourses.filter(c => selected.has(c.id)).length;
    return { spec, selected: selectedSpec, total: specCourses.length };
  });

  function set(partial: Partial<Filters>) {
    onFiltersChange({ ...filters, ...partial });
  }

  function toggleWorkload(w: WorkloadLevel) {
    const next = filters.workloads.includes(w)
      ? filters.workloads.filter(x => x !== w)
      : [...filters.workloads, w];
    set({ workloads: next });
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900/80 border-r border-white/10 flex flex-col h-full overflow-y-auto">
      {/* User header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
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
            {userSpecs.length === 1 ? 'Pick 1 more for dual spec' : 'Dual specialization selected'}
          </p>
        )}
      </div>

      {/* Credit Progress */}
      <div className="p-4 border-b border-white/10">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Progress</p>

        <div className="space-y-3">
          {/* Total electives */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Electives
              </span>
              <span className="text-white text-xs font-semibold">
                {selectedElectiveCount}/{TOTAL_ELECTIVE_CREDITS}
              </span>
            </div>
            <Progress
              value={(selectedElectiveCount / TOTAL_ELECTIVE_CREDITS) * 100}
              className="h-1.5 bg-white/10"
            />
          </div>

          {/* WaW */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> WaW
              </span>
              <span className="text-white text-xs font-semibold">
                {TOTAL_WAW}/{TOTAL_WAW}
              </span>
            </div>
            <Progress value={100} className="h-1.5 bg-white/10" />
          </div>

          {/* Per-spec progress (for active specs) */}
          {userSpecs.map(specId => {
            const entry = specProgress.find(sp => sp.spec.id === specId);
            if (!entry) return null;
            return (
              <div key={specId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: entry.spec.color }}>
                    {entry.spec.label}
                  </span>
                  <span className="text-white text-xs font-semibold">
                    {entry.selected}/{SPEC_REQUIRED_CREDITS}
                    <span className="text-slate-500 font-normal"> req</span>
                  </span>
                </div>
                <Progress
                  value={Math.min((entry.selected / SPEC_REQUIRED_CREDITS) * 100, 100)}
                  className="h-1.5 bg-white/10"
                />
              </div>
            );
          })}
        </div>
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
    </aside>
  );
}
