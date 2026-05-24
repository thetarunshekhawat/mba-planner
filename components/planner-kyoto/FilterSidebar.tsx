'use client';

import { useEffect, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { GraduationCap, LogOut, BookOpen, ShieldAlert } from 'lucide-react';
import { SPECS, ALL_COURSES } from '@/data/courses';
import type { SpecId, WorkloadLevel } from '@/types';

const WORKLOAD_OPTIONS: WorkloadLevel[] = ['Low', 'Low-Moderate', 'Moderate', 'Moderate-High', 'High'];
const TOTAL_ELECTIVE_CREDITS = 16;
const SPEC_REQUIRED_CREDITS = 6;
const TOTAL_WAW = ALL_COURSES.filter(c => c.type === 'waw').length;

export interface Filters {
  specs: SpecId[];
  minDepth: number;
  minRelevance: number;
  workloads: WorkloadLevel[];
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
  onSignOut: () => void;
}

function KyotoProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const pct = Math.min((value / max) * 100, 100);

  return (
    <div style={{ height: 5, backgroundColor: 'var(--raised)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${mounted ? pct : 0}%`,
        backgroundColor: color,
        borderRadius: 3,
        transition: 'width 700ms cubic-bezier(0.22, 1, 0.36, 1)',
      }} />
    </div>
  );
}

function SpecButton({
  spec,
  active,
  isPopping,
  onToggle,
}: {
  spec: typeof SPECS[number];
  active: boolean;
  isPopping: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={isPopping ? 'animate-spec-pop' : ''}
      style={{
        flex: '1 1 calc(50% - 4px)',
        minWidth: 'calc(50% - 4px)',
        fontSize: 11,
        fontWeight: 600,
        padding: '5px 8px',
        borderRadius: 'var(--radius)',
        border: `1px solid ${active ? spec.color : 'var(--dim)'}`,
        backgroundColor: active ? spec.color + '22' : 'transparent',
        color: active ? spec.color : 'var(--ash)',
        cursor: 'pointer',
        transition: 'background-color 150ms, border-color 150ms, color 150ms',
        fontFamily: 'var(--font-body)',
        textAlign: 'center' as const,
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

  // Track newly activated specs for pop animation
  const prevUserSpecs = useRef<SpecId[]>([]);
  const [poppingSpecs, setPoppingSpecs] = useState<Set<SpecId>>(new Set());

  useEffect(() => {
    const prev = prevUserSpecs.current;
    const newlyActive = userSpecs.filter(s => !prev.includes(s));
    if (newlyActive.length > 0) {
      setPoppingSpecs(new Set(newlyActive));
      const timer = setTimeout(() => setPoppingSpecs(new Set()), 400);
      prevUserSpecs.current = [...userSpecs];
      return () => clearTimeout(timer);
    }
    prevUserSpecs.current = [...userSpecs];
  }, [userSpecs]);

  function set(partial: Partial<Filters>) {
    onFiltersChange({ ...filters, ...partial });
  }

  function toggleWorkload(w: WorkloadLevel) {
    const next = filters.workloads.includes(w)
      ? filters.workloads.filter(x => x !== w)
      : [...filters.workloads, w];
    set({ workloads: next });
  }

  const sectionStyle: React.CSSProperties = {
    padding: '14px 16px',
    borderBottom: '1px solid var(--dim)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color: 'var(--ash)',
    marginBottom: 10,
    fontFamily: 'var(--font-body)',
  };

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-full overflow-y-auto"
      style={{ backgroundColor: 'var(--surface)', borderRight: '1px solid var(--dim)' }}
    >
      {/* 1 — User header */}
      <div className="animate-sidebar-section-in" style={{ ...sectionStyle, animationDelay: '0ms' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--cream)', fontFamily: 'var(--font-body)' }}>
              {userName}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--ash)' }}>{userEmail}</p>
          </div>
          <button
            onClick={onSignOut}
            style={{ color: 'var(--ash)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 150ms', flexShrink: 0 }}
            title="Sign out"
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--sand)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ash)')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2 — Specialization selector */}
      <div className="animate-sidebar-section-in" style={{ ...sectionStyle, animationDelay: '60ms' }}>
        <p style={labelStyle}>My Specializations</p>
        <div className="flex flex-wrap gap-1.5">
          {SPECS.map(s => (
            <SpecButton
              key={s.id}
              spec={s}
              active={userSpecs.includes(s.id)}
              isPopping={poppingSpecs.has(s.id)}
              onToggle={() => onSpecToggle(s.id)}
            />
          ))}
        </div>
        {userSpecs.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 8 }}>
            {userSpecs.length === 1
              ? 'Pick 1–2 more for dual/triple spec'
              : userSpecs.length === 2
              ? 'Dual specialization — or pick 1 more'
              : 'Triple specialization selected'}
          </p>
        )}
      </div>

      {/* 3 — Credit progress */}
      <div className="animate-sidebar-section-in" style={{ ...sectionStyle, animationDelay: '120ms' }}>
        <p style={labelStyle}>Progress</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Total electives */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--ash)' }}>
                <BookOpen className="w-3 h-3" /> Electives
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--cream)' }}>
                {selectedElectiveCount}/{TOTAL_ELECTIVE_CREDITS}
              </span>
            </div>
            <KyotoProgressBar value={selectedElectiveCount} max={TOTAL_ELECTIVE_CREDITS} color="var(--accent)" />
          </div>

          {/* WaW */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--ash)' }}>
                <GraduationCap className="w-3 h-3" /> WaW
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--cream)' }}>
                {TOTAL_WAW}/{TOTAL_WAW}
              </span>
            </div>
            <KyotoProgressBar value={TOTAL_WAW} max={TOTAL_WAW} color="#d97706" />
          </div>

          {/* Per-spec progress */}
          {userSpecs.map(specId => {
            const entry = specProgress.find(sp => sp.spec.id === specId);
            if (!entry) return null;
            const isExceeded = entry.selected > SPEC_REQUIRED_CREDITS;
            const barColor = isExceeded ? '#f59e0b' : entry.spec.color;
            return (
              <div key={specId}>
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <span className="text-xs" style={{ color: entry.spec.color }}>
                    {entry.spec.label}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--cream)' }}>
                    {entry.selected}/{SPEC_REQUIRED_CREDITS}
                    <span style={{ color: 'var(--ash)', fontWeight: 400 }}> req</span>
                    {isExceeded && (
                      <span style={{ color: '#f59e0b', fontWeight: 600, marginLeft: 4 }}>
                        +{entry.selected - SPEC_REQUIRED_CREDITS}
                      </span>
                    )}
                  </span>
                </div>
                <KyotoProgressBar value={entry.selected} max={SPEC_REQUIRED_CREDITS} color={barColor} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 4 — Mandatory courses quick-filter */}
      <div className="animate-sidebar-section-in" style={{ ...sectionStyle, animationDelay: '180ms' }}>
        <button
          onClick={() => set({ showMandatoryOnly: !filters.showMandatoryOnly })}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-sm transition-all font-semibold text-xs"
          style={{
            backgroundColor: filters.showMandatoryOnly ? 'var(--accent-dim)' : 'transparent',
            border: `1px solid ${filters.showMandatoryOnly ? 'var(--accent)' : 'var(--dim)'}`,
            color: filters.showMandatoryOnly ? 'var(--accent)' : 'var(--ash)',
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
          }}
        >
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
          Mandatory Courses Only
          {filters.showMandatoryOnly && (
            <span
              className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
              style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)' }}
            >
              ON
            </span>
          )}
        </button>
      </div>

      {/* 5 — Filters */}
      <div className="animate-sidebar-section-in flex-1 p-4 space-y-5" style={{ animationDelay: '240ms' }}>
        <p style={labelStyle}>Filters</p>

        {/* Min Learning Depth */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label style={{ color: 'var(--ash)', fontSize: 12 }}>Min Learning Depth</label>
            <span style={{ color: 'var(--sand)', fontSize: 12, fontWeight: 600 }}>
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
            <label style={{ color: 'var(--ash)', fontSize: 12 }}>Min Career Relevance</label>
            <span style={{ color: 'var(--sand)', fontSize: 12, fontWeight: 600 }}>
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
          <p style={{ color: 'var(--ash)', fontSize: 12, marginBottom: 6 }}>Workload</p>
          <div className="space-y-1.5">
            {WORKLOAD_OPTIONS.map(w => (
              <label key={w} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  id={`kyoto-wl-${w}`}
                  checked={filters.workloads.length === 0 || filters.workloads.includes(w)}
                  onCheckedChange={() => toggleWorkload(w)}
                />
                <span style={{ color: 'var(--ash)', fontSize: 12 }}>{w}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              id="kyoto-selected-only"
              checked={filters.selectedOnly}
              onCheckedChange={v => set({ selectedOnly: !!v })}
            />
            <span style={{ color: 'var(--ash)', fontSize: 12 }}>Selected courses only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              id="kyoto-show-waw"
              checked={filters.showWaw}
              onCheckedChange={v => set({ showWaw: !!v })}
            />
            <span style={{ color: 'var(--ash)', fontSize: 12 }}>Show WaW courses</span>
          </label>
        </div>
      </div>
    </aside>
  );
}
