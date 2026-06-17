'use client';

import { useRef, useState } from 'react';
import { Star, AlertTriangle, CheckCircle2, PlusCircle, Zap, Info, BookOpen } from 'lucide-react';
import type { Course, SpecId } from '@/types';
import type { EventType } from '@/hooks/useAnalytics';
import { ALL_COURSES, SPECS, normalizeWorkload } from '@/data/courses';
import { getSectionAdvisories, type SectionAdvisory } from '@/lib/conflicts';
import { Term1GanttPanel } from './Term1GanttPanel';

// Maps Plan-tab Term 4 week numbers → TERM1_WEEKS array indices
const TERM4_PLAN_WEEK_TO_TERM1: Record<number, number[]> = {
  1:  [0, 1],   // Jun 29–Jul 12  → T1 Wk 1–2
  3:  [2, 3],   // Jul 13–Jul 26  → T1 Wk 3–4
  5:  [4, 5],   // Jul 27–Aug 9   → T1 Wk 5–6
  7:  [6, 7],   // Aug 10–Aug 23  → T1 Wk 7–8
  9:  [8],      // Aug 24–28 Exam → T1 Wk 9
  10: [9, 10],  // Aug 31–Sep 13  → T1 Wk 10–11
  11: [10],     // Sep 7–11 Free  → T1 Wk 11
  12: [11, 12], // Sep 14–Sep 27  → T1 Wk 12–13
};


interface Props {
  selected: Set<number>;
  userSpecs: SpecId[];
  visibleIds: Set<number>;
  onToggle: (id: number) => void;
  onCourseClick: (course: Course) => void;
  trackEvent: (eventType: EventType, payload?: Record<string, unknown>) => void;
}

function MiniStars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex gap-px items-center">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className="w-2.5 h-2.5"
          fill={i < value ? '#f59e0b' : 'none'}
          stroke={i < value ? '#f59e0b' : '#d1d5db'} strokeWidth={1.5} />
      ))}
    </span>
  );
}

function CourseCard({
  course,
  isSelected,
  isDimmed,
  hasConflict,
  sectionAdvisory,
  userSpecs,
  onToggle,
  onClick,
}: {
  course: Course;
  isSelected: boolean;
  isDimmed: boolean;
  hasConflict: boolean;
  sectionAdvisory: SectionAdvisory | undefined;
  userSpecs: SpecId[];
  onToggle: () => void;
  onClick: () => void;
}) {
  const isWaw = course.type === 'waw';
  const isMandatory = course.type === 'mandatory';
  const isFixed = isWaw || isMandatory;

  const primarySpec = SPECS.find(s => course.specs.includes(s.id));
  let accentColor = '#64748b';
  if (isWaw) accentColor = '#d97706';
  else if (isMandatory) accentColor = '#2563eb';
  else if (primarySpec) accentColor = primarySpec.color;

  // Mandatory-for-spec: show crimson treatment when course is required for user's selected spec
  const relevantMandatorySpecs = (course.mandatoryFor ?? []).filter(
    s => userSpecs.length === 0 || userSpecs.includes(s)
  );
  const isMandatoryForUserSpec = relevantMandatorySpecs.length > 0;

  const resolvedBorderColor = hasConflict
    ? '#f87171'
    : sectionAdvisory
    ? '#fbbf24'
    : isMandatoryForUserSpec
    ? '#dc2626'
    : isSelected && !isFixed
    ? accentColor
    : isFixed
    ? accentColor + '55'
    : '#cbd5e1';

  const resolvedBoxShadow = isMandatoryForUserSpec
    ? '0 2px 8px #dc262628'
    : isSelected && !isFixed
    ? `0 2px 8px ${accentColor}30`
    : isWaw
    ? '0 2px 8px rgba(251,191,36,0.25)'
    : '0 1px 3px rgba(0,0,0,0.08)';

  const resolvedBackground = hasConflict
    ? undefined
    : sectionAdvisory
    ? '#fffbeb'
    : isMandatoryForUserSpec
    ? `linear-gradient(135deg, #fee2e2 0%, #fff5f5 60%, ${accentColor}10 100%)`
    : isWaw
    ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 55%, #fed7aa 100%)'
    : undefined;

  return (
    <div
      className={`
        relative rounded-xl border-2 p-4 transition-all cursor-pointer
        ${isSelected && !isFixed ? 'shadow-md' : 'shadow-sm hover:shadow-md hover:-translate-y-px'}
        ${isDimmed ? 'opacity-40' : ''}
        ${hasConflict ? 'border-red-400 bg-red-50' : isMandatoryForUserSpec ? '' : isSelected && !isFixed
          ? 'bg-white'
          : isWaw ? '' : isMandatory ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}
      `}
      style={{
        borderColor: resolvedBorderColor,
        minWidth: '230px',
        maxWidth: '320px',
        boxShadow: resolvedBoxShadow,
        background: resolvedBackground,
      }}
      onClick={isFixed ? onClick : undefined}
    >
      {/* Conflict / section advisory indicator */}
      {hasConflict && (
        <div className="flex items-center gap-1 text-red-500 text-xs font-semibold mb-2">
          <AlertTriangle className="w-3 h-3" /> Conflict
        </div>
      )}
      {sectionAdvisory && !hasConflict && (
        <div className="flex items-start gap-1 text-amber-600 text-xs font-semibold mb-2" title={sectionAdvisory.message}>
          <Info className="w-3 h-3 mt-px flex-shrink-0" />
          <span>Section B likely ({sectionAdvisory.sectionBSlot})</span>
        </div>
      )}

      {/* Top row: type badge + select button */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-1">
          {isWaw && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#d9770622', color: '#d97706' }}>WaW</span>
          )}
          {isMandatory && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#2563eb22', color: '#2563eb' }}>Required</span>
          )}
          {/* Mandatory-for-spec badges */}
          {relevantMandatorySpecs.map(specId => (
            <span key={`mand-${specId}`} className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#dc262615', color: '#dc2626' }}>
              Req. {specId}
            </span>
          ))}
          {course.specs.map(specId => {
            const s = SPECS.find(sp => sp.id === specId);
            if (!s) return null;
            return (
              <span key={specId} className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ backgroundColor: s.color + '20', color: s.color }}>
                {specId}
              </span>
            );
          })}
        </div>

        {!isFixed && (
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            className="flex-shrink-0 transition-colors"
            style={{ color: isSelected ? accentColor : '#9ca3af' }}
          >
            {isSelected
              ? <CheckCircle2 className="w-5 h-5" />
              : <PlusCircle className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Course name */}
      <p
        className="font-semibold text-[15px] text-gray-800 leading-snug mb-1 cursor-pointer hover:underline"
        onClick={e => { e.stopPropagation(); onClick(); }}
      >
        {course.name}
      </p>

      {/* Faculty */}
      {course.faculty && (
        <p className="text-xs text-gray-500 mb-2.5">{course.faculty}</p>
      )}

      {/* Review row */}
      {course.review && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-semibold text-gray-400 w-9 flex-shrink-0">Depth</span>
            <MiniStars value={course.review.learningDepth} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-semibold text-gray-400 w-9 flex-shrink-0">Career</span>
            <MiniStars value={course.review.careerRelevance} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-semibold text-gray-400 w-9 flex-shrink-0">Load</span>
            {(() => {
              const w = normalizeWorkload(course.review!.workload);
              return (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ color: w.color, backgroundColor: w.bg }}>
                  {w.label}
                </span>
              );
            })()}
          </div>
        </div>
      )}

      {/* Bottom row: seats + outline button */}
      {(course.seats || course.outlineUrl) && (
        <div className="flex items-center justify-between mt-1.5">
          {course.seats
            ? <p className="text-[10px] text-gray-400">{course.seats} seats</p>
            : <span />}
          {course.outlineUrl && (
            <a
              href={
                course.outlineUrl.endsWith('.pdf')
                  ? course.outlineUrl
                  : `https://docs.google.com/viewer?url=${encodeURIComponent(course.outlineUrl)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title="Open Course Outline"
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
              style={{ backgroundColor: accentColor + '18', color: accentColor }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = accentColor + '30')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = accentColor + '18')}
            >
              <BookOpen className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}


function WeekGroup({
  term,
  week,
  courses,
  selected,
  userSpecs,
  visibleIds,
  showTerm1,
  onToggle,
  onClick,
}: {
  term: 4 | 5 | 6;
  week: number;
  courses: Course[];
  selected: Set<number>;
  userSpecs: SpecId[];
  visibleIds: Set<number>;
  showTerm1: boolean;
  onToggle: (id: number) => void;
  onClick: (c: Course) => void;
}) {
  const special = courses.find(c => c.type === 'exam' || c.type === 'free');
  if (special) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex items-center gap-2 text-xs text-gray-400 min-w-[80px]">
          <span className="font-semibold">Wk {week}</span>
          <span>{courses[0].dates}</span>
        </div>
        <div className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium border border-dashed ${special.type === 'exam'
            ? 'bg-red-50 text-red-400 border-red-200'
            : 'bg-green-50 text-green-500 border-green-200'
          }`}>
          {special.type === 'exam' ? '📝 Exam Week — No electives' : '🟢 Free Week'}
        </div>
      </div>
    );
  }

  const weekElectives = courses.filter(c => c.type === 'elective' || c.type === 'mandatory');
  const wawCourses = courses.filter(c => c.type === 'waw');

  // Genuine conflict detection (conflictGroup-based)
  const conflictGroups = new Set<string>();
  const groupMap: Record<string, number[]> = {};
  weekElectives.forEach(c => {
    if (c.conflictGroup) {
      groupMap[c.conflictGroup] = groupMap[c.conflictGroup] || [];
      groupMap[c.conflictGroup].push(c.id);
    }
  });
  Object.entries(groupMap).forEach(([grp, ids]) => {
    if (ids.filter(id => selected.has(id)).length > 1) conflictGroups.add(grp);
  });

  // Section advisory detection (section-resolvable overlaps)
  const advisories = getSectionAdvisories(ALL_COURSES, visibleIds);

  const blockLabel = courses.find(c => c.block)?.block;

  const selectedElectivesCount = weekElectives.filter(
    c => c.type === 'elective' && selected.has(c.id)
  ).length;

  const visible = [...weekElectives, ...wawCourses].filter(c => visibleIds.has(c.id));
  if (visible.length === 0) return null;

  const cardsAndWarnings = (
    <>
      <div className="flex flex-wrap gap-3">
        {visible.map(c => {
          const specMatch = c.specs.some(s => userSpecs.includes(s));
          const isDimmed = userSpecs.length > 0 && !specMatch && c.type === 'elective';
          const hasConflict = !!(c.conflictGroup && conflictGroups.has(c.conflictGroup) && selected.has(c.id));
          return (
            <CourseCard
              key={c.id}
              course={c}
              isSelected={selected.has(c.id)}
              isDimmed={isDimmed}
              hasConflict={hasConflict}
              sectionAdvisory={selected.has(c.id) ? advisories.get(c.id) : undefined}
              userSpecs={userSpecs}
              onToggle={() => onToggle(c.id)}
              onClick={() => onClick(c)}
            />
          );
        })}
      </div>
      {selectedElectivesCount >= 3 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border font-semibold text-sm"
          style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <span className="font-bold">Warning: Triple Block</span>
            <span className="font-normal text-red-500"> — 3 electives in one week is extremely demanding</span>
          </div>
        </div>
      )}
      {selectedElectivesCount === 2 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border font-semibold text-sm"
          style={{ backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#fbbf24' }}>
          <Zap className="w-5 h-5 flex-shrink-0" />
          Double Block — you&apos;re doing 2 electives this week
        </div>
      )}
    </>
  );

  return (
    <div className="flex gap-4 py-10 border-b border-gray-400 last:border-0">
      {/* Week meta column */}
      <div className="flex flex-col items-start min-w-[92px] pt-0.5 flex-shrink-0">
        <span className="text-sm font-bold text-gray-700">Wk {week}</span>
        <span className="text-[11px] text-gray-400 leading-tight mt-0.5">{courses[0].dates}</span>
        {blockLabel && (
          <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            Block {blockLabel}
          </span>
        )}
      </div>

      {term === 4 && showTerm1 && TERM4_PLAN_WEEK_TO_TERM1[week] ? (
        /* Split layout: Term 4 cards left | divider | Term 1 Gantt right (stacks on mobile) */
        <div className="flex flex-col lg:flex-row flex-1 min-w-0 rounded-lg overflow-hidden border border-gray-200">
          <div style={{ flex: '1 1 auto', minWidth: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cardsAndWarnings}
          </div>
          <div className="lg:hidden h-px flex-shrink-0" style={{ backgroundColor: '#c7d2fe' }} />
          <div className="hidden lg:block flex-shrink-0" style={{ width: 2, backgroundColor: '#c7d2fe' }} />
          <div className="w-full lg:w-[300px] lg:flex-shrink-0">
            <Term1GanttPanel activeWeekIndices={TERM4_PLAN_WEEK_TO_TERM1[week]} compact />
          </div>
        </div>
      ) : (
        /* Normal cards column */
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {cardsAndWarnings}
        </div>
      )}
    </div>
  );
}

export function PlannerListView({ selected, userSpecs, visibleIds, onToggle, onCourseClick, trackEvent }: Props) {
  const [showTerm1, setShowTerm1] = useState(false);
  const term1OpenTimeRef = useRef<number | null>(null);

  const terms: (4 | 5 | 6)[] = [4, 5, 6];
  const termLabels = { 4: 'Term 4', 5: 'Term 5', 6: 'Term 6' };
  const termDates = {
    4: 'Jun 29 – Sep 27, 2026',
    5: 'Sep 28 – Dec 27, 2026',
    6: 'Jan – Apr, 2027',
  };

  return (
    <div className="p-4 lg:p-6 min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      {terms.map(term => {
        const termCourses = ALL_COURSES.filter(c => c.term === term);
        const weeks = [...new Set(termCourses.map(c => c.week))].sort((a, b) => a - b);

        return (
          <div key={term} className="mb-10">
            {/* Term header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-orange-300/60" />
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30">
                <span className="text-orange-600 font-bold text-sm">{termLabels[term]}</span>
                <span className="text-orange-400/60 text-xs">·</span>
                <span className="text-orange-500/70 text-xs">{termDates[term]}</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-orange-300/60" />
            </div>

            {/* Term 1 toggle — only for Term 4 */}
            {term === 4 && (
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    const next = !showTerm1;
                    setShowTerm1(next);
                    if (next) {
                      term1OpenTimeRef.current = Date.now();
                      trackEvent('term1_panel_toggled', { show: true });
                    } else {
                      const duration_ms = term1OpenTimeRef.current ? Date.now() - term1OpenTimeRef.current : null;
                      term1OpenTimeRef.current = null;
                      trackEvent('term1_panel_toggled', { show: false, duration_ms });
                    }
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                    border: showTerm1 ? '1.5px solid #6366f1' : '1.5px solid #d1d5db',
                    backgroundColor: showTerm1 ? '#eef2ff' : '#ffffff',
                    color: showTerm1 ? '#4338ca' : '#6b7280',
                    fontSize: 12, fontWeight: 600,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <BookOpen size={13} />
                  {showTerm1 ? '✓ Term 1 Courses' : 'Show Term 1 Courses'}
                </button>
                {showTerm1 && (
                  <span style={{ fontSize: 11, color: '#6b7280' }}>
                    Showing which Term 1 subjects run alongside each Term 4 block
                  </span>
                )}
              </div>
            )}

            {/* Week groups */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6">
              {weeks.map(week => {
                const weekCourses = termCourses.filter(c => c.week === week);
                return (
                  <WeekGroup
                    key={week}
                    term={term}
                    week={week}
                    courses={weekCourses}
                    selected={selected}
                    userSpecs={userSpecs}
                    visibleIds={visibleIds}
                    showTerm1={showTerm1}
                    onToggle={onToggle}
                    onClick={onCourseClick}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
