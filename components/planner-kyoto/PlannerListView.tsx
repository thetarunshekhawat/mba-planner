'use client';

import { Star, AlertTriangle, CheckCircle2, PlusCircle, Zap } from 'lucide-react';
import type { Course, SpecId } from '@/types';
import { ALL_COURSES, SPECS, normalizeWorkload } from '@/data/courses';

interface Props {
  selected: Set<number>;
  userSpecs: SpecId[];
  visibleIds: Set<number>;
  onToggle: (id: number) => void;
  onCourseClick: (course: Course) => void;
}

function MiniStars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex gap-px items-center">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className="w-2.5 h-2.5"
          fill={i < value ? 'var(--accent)' : 'none'}
          stroke={i < value ? 'var(--accent)' : 'var(--dim)'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

function CourseCard({
  course,
  isSelected,
  isDimmed,
  hasConflict,
  animDelay,
  userSpecs,
  onToggle,
  onClick,
}: {
  course: Course;
  isSelected: boolean;
  isDimmed: boolean;
  hasConflict: boolean;
  animDelay: number;
  userSpecs: SpecId[];
  onToggle: () => void;
  onClick: () => void;
}) {
  const isWaw = course.type === 'waw';
  const isMandatory = course.type === 'mandatory';
  const isFixed = isWaw || isMandatory;

  const primarySpec = SPECS.find(s => course.specs.includes(s.id));
  let accentColor = '#9a8a78';
  if (isWaw) accentColor = '#d97706';
  else if (isMandatory) accentColor = '#2563eb';
  else if (primarySpec) accentColor = primarySpec.color;

  const relevantMandatorySpecs = (course.mandatoryFor ?? []).filter(
    s => userSpecs.length === 0 || userSpecs.includes(s),
  );
  const isMandatoryForUserSpec = relevantMandatorySpecs.length > 0;

  const borderColor = hasConflict
    ? '#f87171'
    : isMandatoryForUserSpec
    ? '#dc2626'
    : isSelected && !isFixed
    ? accentColor
    : isFixed
    ? accentColor + '55'
    : 'var(--dim)';

  const boxShadow = isMandatoryForUserSpec
    ? '0 2px 8px #dc262618'
    : isSelected && !isFixed
    ? `0 2px 10px ${accentColor}22`
    : isWaw
    ? '0 2px 8px rgba(251,191,36,0.20)'
    : '0 1px 3px rgba(26,16,8,0.06)';

  const background = hasConflict
    ? '#fff0f0'
    : isMandatoryForUserSpec
    ? `linear-gradient(135deg, #fee2e2 0%, #fff8f8 60%, ${accentColor}10 100%)`
    : isWaw
    ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 55%, #fed7aa 100%)'
    : isMandatory
    ? '#dbeafe'
    : isSelected
    ? 'var(--card)'
    : 'var(--card)';

  return (
    <div
      className="animate-planner-card-in"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 'var(--radius)',
          border: `1.5px solid ${borderColor}`,
          padding: 14,
          minWidth: 220,
          maxWidth: 310,
          background,
          boxShadow,
          opacity: isDimmed ? 0.4 : 1,
          cursor: isFixed ? 'pointer' : 'default',
          transition: 'box-shadow 150ms, transform 150ms',
          fontFamily: 'var(--font-body)',
        }}
        onClick={isFixed ? onClick : undefined}
        onMouseEnter={e => {
          if (!isFixed && !isSelected) {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 12px rgba(26,16,8,0.10)`;
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = '';
          (e.currentTarget as HTMLDivElement).style.boxShadow = boxShadow;
        }}
      >
        {hasConflict && (
          <div className="flex items-center gap-1 text-xs font-semibold mb-2" style={{ color: '#ef4444' }}>
            <AlertTriangle className="w-3 h-3" /> Conflict
          </div>
        )}

        {/* Top row: badges + select button */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-1">
            {isWaw && (
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 2, backgroundColor: '#d9770622', color: '#d97706' }}>
                WaW
              </span>
            )}
            {isMandatory && (
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 2, backgroundColor: '#2563eb22', color: '#2563eb' }}>
                Required
              </span>
            )}
            {relevantMandatorySpecs.map(specId => (
              <span key={`mand-${specId}`} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 2, backgroundColor: '#dc262615', color: '#dc2626' }}>
                Req. {specId}
              </span>
            ))}
            {course.specs.map(specId => {
              const s = SPECS.find(sp => sp.id === specId);
              if (!s) return null;
              return (
                <span key={specId} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 2, backgroundColor: s.color + '20', color: s.color }}>
                  {specId}
                </span>
              );
            })}
          </div>

          {!isFixed && (
            <button
              onClick={e => { e.stopPropagation(); onToggle(); }}
              style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: isSelected ? accentColor : 'var(--mid)', transition: 'color 150ms' }}
            >
              {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Course name */}
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--cream)',
            lineHeight: 1.3,
            marginBottom: 3,
            cursor: 'pointer',
          }}
          onClick={e => { e.stopPropagation(); onClick(); }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
        >
          {course.name}
        </p>

        {course.faculty && (
          <p style={{ fontSize: 11, color: 'var(--ash)', marginBottom: 8 }}>{course.faculty}</p>
        )}

        {course.review && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--ash)', width: 36, flexShrink: 0 }}>Depth</span>
              <MiniStars value={course.review.learningDepth} />
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--ash)', width: 36, flexShrink: 0 }}>Career</span>
              <MiniStars value={course.review.careerRelevance} />
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--ash)', width: 36, flexShrink: 0 }}>Load</span>
              {(() => {
                const w = normalizeWorkload(course.review!.workload);
                return (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 9999, color: w.color, backgroundColor: w.bg }}>
                    {w.label}
                  </span>
                );
              })()}
            </div>
          </div>
        )}

        {course.seats && (
          <p style={{ fontSize: 10, color: 'var(--ash)', marginTop: 5 }}>{course.seats} seats</p>
        )}
      </div>
    </div>
  );
}

function WeekGroup({
  week,
  courses,
  selected,
  userSpecs,
  visibleIds,
  onToggle,
  onClick,
}: {
  term: 4 | 5 | 6;
  week: number;
  courses: Course[];
  selected: Set<number>;
  userSpecs: SpecId[];
  visibleIds: Set<number>;
  onToggle: (id: number) => void;
  onClick: (c: Course) => void;
}) {
  const special = courses.find(c => c.type === 'exam' || c.type === 'free');
  if (special) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex items-center gap-2 text-xs min-w-[80px]" style={{ color: 'var(--ash)' }}>
          <span style={{ fontWeight: 600 }}>Wk {week}</span>
          <span>{courses[0].dates}</span>
        </div>
        <div style={{
          flex: 1, borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, fontWeight: 500,
          border: '1px dashed',
          ...(special.type === 'exam'
            ? { backgroundColor: '#fff5f5', color: '#ef4444', borderColor: '#fca5a5' }
            : { backgroundColor: '#f0fdf4', color: '#16a34a', borderColor: '#86efac' }),
        }}>
          {special.type === 'exam' ? '📝 Exam Week — No electives' : '🟢 Free Week'}
        </div>
      </div>
    );
  }

  const weekElectives = courses.filter(c => c.type === 'elective' || c.type === 'mandatory');
  const wawCourses = courses.filter(c => c.type === 'waw');

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

  const blockLabel = courses.find(c => c.block)?.block;
  const selectedElectivesCount = weekElectives.filter(
    c => c.type === 'elective' && selected.has(c.id),
  ).length;

  const visible = [...weekElectives, ...wawCourses].filter(c => visibleIds.has(c.id));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 16, padding: '28px 0', borderBottom: '1px solid var(--dim)' }} className="last:border-b-0">
      {/* Week meta column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 88, paddingTop: 2, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>Wk {week}</span>
        <span style={{ fontSize: 10, color: 'var(--ash)', lineHeight: 1.3, marginTop: 2 }}>{courses[0].dates}</span>
        {blockLabel && (
          <span style={{
            marginTop: 6, fontSize: 9, fontWeight: 600, textTransform: 'uppercase' as const,
            letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 9999,
            backgroundColor: 'var(--raised)', color: 'var(--ash)',
          }}>
            Block {blockLabel}
          </span>
        )}
      </div>

      {/* Cards column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {visible.map((c, i) => {
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
                animDelay={Math.min(i, 7) * 40}
                userSpecs={userSpecs}
                onToggle={() => onToggle(c.id)}
                onClick={() => onClick(c)}
              />
            );
          })}
        </div>

        {selectedElectivesCount >= 3 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-sm" style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 600, fontSize: 13 }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div>
              <span style={{ fontWeight: 700 }}>Warning: Triple Block</span>
              <span style={{ fontWeight: 400, color: '#ef4444' }}> — 3 electives in one week is extremely demanding</span>
            </div>
          </div>
        )}
        {selectedElectivesCount === 2 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-sm" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fbbf24', fontWeight: 600, fontSize: 13 }}>
            <Zap className="w-4 h-4 flex-shrink-0" />
            Double Block — you&apos;re doing 2 electives this week
          </div>
        )}
      </div>
    </div>
  );
}

export function PlannerListView({ selected, userSpecs, visibleIds, onToggle, onCourseClick }: Props) {
  const terms: (4 | 5 | 6)[] = [4, 5, 6];
  const termLabels = { 4: 'Term 4', 5: 'Term 5', 6: 'Term 6' };
  const termDates = {
    4: 'Jun 29 – Sep 27, 2026',
    5: 'Sep 28 – Dec 27, 2026',
    6: 'Jan – Apr, 2027',
  };

  return (
    <div
      style={{ padding: '24px 20px', minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: 'var(--font-body)' }}
      className="lg:px-6"
    >
      {terms.map((term, ti) => {
        const termCourses = ALL_COURSES.filter(c => c.term === term);
        const weeks = [...new Set(termCourses.map(c => c.week))].sort((a, b) => a - b);

        return (
          <div key={term} style={{ marginBottom: 36 }}>
            {/* Term divider */}
            <div
              className="animate-planner-term-in flex items-center gap-4 mb-5"
              style={{ animationDelay: `${ti * 80}ms` }}
            >
              <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, transparent, var(--accent)44)` }} />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 16px', borderRadius: 9999,
                backgroundColor: 'var(--accent-dim)',
                border: '1px solid var(--accent)44',
              }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                  {termLabels[term]}
                </span>
                <span style={{ color: 'var(--accent)', opacity: 0.4, fontSize: 11 }}>·</span>
                <span style={{ color: 'var(--accent)', opacity: 0.7, fontSize: 11 }}>
                  {termDates[term]}
                </span>
              </div>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(to left, transparent, var(--accent)44)` }} />
            </div>

            {/* Week groups container */}
            <div style={{
              backgroundColor: 'var(--card)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--dim)',
              boxShadow: '0 1px 4px rgba(26,16,8,0.06)',
              padding: '0 20px',
            }}>
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
