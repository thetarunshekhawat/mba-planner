'use client';

import { AlertTriangle } from 'lucide-react';
import type { Course, SpecId } from '@/types';
import { ALL_COURSES, SPECS } from '@/data/courses';

interface Props {
  selected: Set<number>;
  visibleIds: Set<number>;
  userSpecs: SpecId[];
  onCourseClick: (course: Course) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TERM4_BLOCKS: { block: number; dates: string; start: string; end: string }[] = [
  { block: 16, dates: 'Jun 29 – Jul 12', start: '2026-06-29', end: '2026-07-12' },
  { block: 17, dates: 'Jul 13 – 26',     start: '2026-07-13', end: '2026-07-26' },
  { block: 18, dates: 'Jul 27 – Aug 9',  start: '2026-07-27', end: '2026-08-09' },
  { block: 19, dates: 'Aug 10 – 23',     start: '2026-08-10', end: '2026-08-23' },
  { block: 20, dates: 'Aug 31 – Sep 13', start: '2026-08-31', end: '2026-09-13' },
  { block: 21, dates: 'Sep 14 – 27',     start: '2026-09-14', end: '2026-09-27' },
];

function parseTs(iso: string) { return new Date(iso).getTime(); }

function courseInBlock(c: Course, start: string, end: string) {
  return parseTs(c.startDate) <= parseTs(end) && parseTs(c.endDate) >= parseTs(start);
}

function getUniqueSlots(courses: Course[]): string[] {
  const set = new Set<string>();
  courses.forEach(c => c.timings?.forEach(t => set.add(t.slot)));
  return [...set].sort((a, b) => {
    const ta = parseInt(a.split('–')[0].replace(':', ''), 10);
    const tb = parseInt(b.split('–')[0].replace(':', ''), 10);
    return ta - tb;
  });
}

function getCourseAccent(course: Course): string {
  if (course.type === 'waw') return '#d97706';
  if (course.type === 'mandatory') return '#2563eb';
  const spec = SPECS.find(s => course.specs.includes(s.id));
  return spec?.color ?? '#9a8a78';
}

function getCourseBg(course: Course): string {
  if (course.type === 'mandatory') return '#dbeafe';
  const spec = SPECS.find(s => course.specs.includes(s.id));
  return spec?.bg ?? '#f1f5f9';
}

const WAW_GRADIENT = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fed7aa 100%)';

function getConflictIds(courses: Course[], visibleIds: Set<number>): Set<number> {
  const groupMap: Record<string, number[]> = {};
  courses.forEach(c => {
    if (c.conflictGroup && visibleIds.has(c.id)) {
      groupMap[c.conflictGroup] = groupMap[c.conflictGroup] ?? [];
      groupMap[c.conflictGroup].push(c.id);
    }
  });
  const conflicting = new Set<number>();
  Object.values(groupMap).forEach(ids => {
    if (ids.length > 1) ids.forEach(id => conflicting.add(id));
  });
  return conflicting;
}

function CoursePill({ course, room, hasConflict, userSpecs, onClick }: {
  course: Course;
  room: string;
  hasConflict: boolean;
  userSpecs: SpecId[];
  onClick: () => void;
}) {
  const relevantMandatorySpecs = (course.mandatoryFor ?? []).filter(
    s => userSpecs.length === 0 || userSpecs.includes(s),
  );
  const isMandatoryForUserSpec = relevantMandatorySpecs.length > 0;

  const accent = hasConflict ? '#ef4444' : isMandatoryForUserSpec ? '#dc2626' : getCourseAccent(course);
  const isWaw = course.type === 'waw';
  const bg = hasConflict
    ? '#fee2e2'
    : isMandatoryForUserSpec
    ? `linear-gradient(135deg, #fee2e2 0%, #fff5f5 100%)`
    : getCourseBg(course);

  return (
    <button
      onClick={onClick}
      className="animate-planner-card-in w-full text-left rounded-sm hover:brightness-95 transition-all px-2 py-1.5"
      style={{
        background: isWaw ? WAW_GRADIENT : bg,
        borderLeft: `3px solid ${accent}`,
        boxShadow: isWaw ? '0 1px 4px rgba(251,191,36,0.25)' : undefined,
      }}
    >
      <div className="flex items-center gap-1">
        {hasConflict && <AlertTriangle className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />}
        <span style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3, color: accent, fontFamily: 'var(--font-mono)' }}>
          {course.code ?? course.name.slice(0, 4).toUpperCase()}
        </span>
      </div>
      {isMandatoryForUserSpec && (
        <div style={{ fontSize: 9, fontWeight: 700, marginTop: 2, color: '#dc2626' }}>
          Req. {relevantMandatorySpecs.join('/')}
        </div>
      )}
      {room && (
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: 2, color: accent + 'bb' }}>
          {room}
        </div>
      )}
    </button>
  );
}

function BlockTable({ blockInfo, courses, visibleIds, conflictIds, userSpecs, onCourseClick }: {
  blockInfo: typeof TERM4_BLOCKS[0];
  courses: Course[];
  visibleIds: Set<number>;
  conflictIds: Set<number>;
  userSpecs: SpecId[];
  onCourseClick: (c: Course) => void;
}) {
  const blockCourses = courses
    .filter(c => c.timings && courseInBlock(c, blockInfo.start, blockInfo.end))
    .filter(c => visibleIds.has(c.id));

  const slots = getUniqueSlots(blockCourses);
  if (slots.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Block header badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingLeft: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '4px 14px', borderRadius: 9999,
          backgroundColor: 'var(--card)',
          border: '1px solid var(--accent)44',
        }}>
          <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-body)' }}>
            Block {blockInfo.block}
          </span>
          <span style={{ color: 'var(--accent)', opacity: 0.65, fontSize: 11 }}>{blockInfo.dates}</span>
        </div>
      </div>

      <div
        className="overflow-x-auto rounded-sm print:overflow-visible print:border-none print:shadow-none"
        style={{ border: '1px solid var(--dim)', boxShadow: '0 1px 4px rgba(26,16,8,0.06)', backgroundColor: 'var(--card)' }}
      >
        <table className="w-full border-collapse" style={{ minWidth: 560 }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--raised)', borderBottom: '1px solid var(--dim)' }}>
              <th style={{
                padding: '8px 14px',
                textAlign: 'left',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--ash)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                borderRight: '1px solid var(--dim)',
                width: 120,
                fontFamily: 'var(--font-body)',
              }}>
                Time Slot
              </th>
              {DAYS.map((day, i) => {
                const d = new Date(blockInfo.start);
                d.setUTCDate(d.getUTCDate() + i);
                const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                const isWeekend = i >= 5;

                return (
                  <th
                    key={day}
                    style={{
                      padding: '6px 8px',
                      textAlign: 'center',
                      borderRight: i < 5 ? '1px solid var(--dim)' : undefined,
                      backgroundColor: isWeekend ? 'var(--surface)' : undefined,
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: isWeekend ? 'var(--mid)' : 'var(--sand)', fontFamily: 'var(--font-body)' }}>
                      {day}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 500, marginTop: 2, color: isWeekend ? 'var(--mid)' : 'var(--ash)', fontFamily: 'var(--font-body)' }}>
                      {dateStr}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, si) => (
              <tr
                key={slot}
                style={{
                  borderBottom: '1px solid var(--dim)',
                  backgroundColor: si % 2 === 1 ? 'var(--surface)' : 'var(--card)',
                }}
                className="last:border-b-0"
              >
                <td style={{
                  padding: '6px 14px',
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--ash)',
                  borderRight: '1px solid var(--dim)',
                  whiteSpace: 'nowrap',
                  verticalAlign: 'middle',
                  backgroundColor: 'var(--surface)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {slot}
                </td>
                {DAYS.map((day, di) => {
                  const dayCourses = blockCourses.filter(c =>
                    c.timings?.some(t => t.slot === slot && t.days.includes(day)),
                  );
                  const isWeekend = di >= 5;

                  return (
                    <td
                      key={day}
                      style={{
                        padding: '5px 5px',
                        borderRight: di < 5 ? '1px solid var(--dim)' : undefined,
                        verticalAlign: 'top',
                        minWidth: 90,
                        backgroundColor: isWeekend
                          ? (si % 2 === 1 ? 'var(--raised)' : 'var(--surface)')
                          : undefined,
                      }}
                    >
                      {dayCourses.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {dayCourses.map(c => {
                            const timing = c.timings!.find(
                              t => t.slot === slot && t.days.includes(day),
                            );
                            return (
                              <CoursePill
                                key={c.id}
                                course={c}
                                room={timing?.room ?? ''}
                                hasConflict={conflictIds.has(c.id)}
                                userSpecs={userSpecs}
                                onClick={() => onCourseClick(c)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TermDivider({ label, dateRange }: { label: string; dateRange: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, marginTop: 8 }}>
      <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, transparent, var(--accent)44)` }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 16px', borderRadius: 9999,
        backgroundColor: 'var(--accent-dim)',
        border: '1px solid var(--accent)44',
      }}>
        <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          {label}
        </span>
        <span style={{ color: 'var(--accent)', opacity: 0.4, fontSize: 11 }}>·</span>
        <span style={{ color: 'var(--accent)', opacity: 0.7, fontSize: 11, fontFamily: 'var(--font-body)' }}>
          {dateRange}
        </span>
      </div>
      <div style={{ height: 1, flex: 1, background: `linear-gradient(to left, transparent, var(--accent)44)` }} />
    </div>
  );
}

function SpecLegend() {
  const items = [
    ...SPECS.map(s => ({ label: s.label, color: s.color })),
    { label: 'WaW', color: '#d97706' },
    { label: 'Required', color: '#2563eb' },
    { label: 'Req. for Spec', color: '#dc2626' },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 18px', padding: '4px 2px 10px', fontSize: 11, color: 'var(--ash)', fontFamily: 'var(--font-body)' }}>
      <span style={{ fontWeight: 700, color: 'var(--sand)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 9 }}>Legend:</span>
      {items.map(item => (
        <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: 1, flexShrink: 0, backgroundColor: item.color }} />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

function CourseWeekList({ courses, visibleIds, userSpecs, onCourseClick }: {
  courses: Course[];
  visibleIds: Set<number>;
  userSpecs: SpecId[];
  onCourseClick: (c: Course) => void;
}) {
  const visible = courses.filter(c => visibleIds.has(c.id));
  if (visible.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--ash)', fontStyle: 'italic', paddingLeft: 2, marginBottom: 20, fontFamily: 'var(--font-body)' }}>
        No courses selected for this term yet.
      </p>
    );
  }

  const weekNums = [...new Set(visible.map(c => c.week))].sort((a, b) => a - b);

  return (
    <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {weekNums.map(wk => {
        const wkCourses = visible.filter(c => c.week === wk);
        return (
          <div key={wk} style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 68, paddingTop: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sand)', fontFamily: 'var(--font-body)' }}>Wk {wk}</span>
              <span style={{ fontSize: 10, color: 'var(--ash)', lineHeight: 1.3, marginTop: 2, fontFamily: 'var(--font-body)' }}>
                {wkCourses[0]?.dates}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
              {wkCourses.map(c => {
                const relevantMandatorySpecs = (c.mandatoryFor ?? []).filter(
                  s => userSpecs.length === 0 || userSpecs.includes(s),
                );
                const isMandatoryForUserSpec = relevantMandatorySpecs.length > 0;
                const accent = isMandatoryForUserSpec ? '#dc2626' : getCourseAccent(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => onCourseClick(c)}
                    className="rounded-sm text-left hover:shadow-md transition-all"
                    style={{
                      border: `1.5px solid ${isMandatoryForUserSpec ? '#dc2626aa' : c.type === 'waw' ? '#fbbf24' : accent + '44'}`,
                      background: isMandatoryForUserSpec
                        ? `linear-gradient(135deg, #fee2e2 0%, #fff5f5 60%, ${getCourseAccent(c)}10 100%)`
                        : c.type === 'waw' ? WAW_GRADIENT : accent + '0d',
                      minWidth: 150,
                      padding: '8px 12px',
                      boxShadow: isMandatoryForUserSpec
                        ? '0 2px 8px #dc262618'
                        : c.type === 'waw' ? '0 1px 4px rgba(251,191,36,0.25)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 2 }}>
                      {c.type === 'waw' && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', fontFamily: 'var(--font-body)' }}>WaW</span>
                      )}
                      {c.type === 'mandatory' && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', fontFamily: 'var(--font-body)' }}>Required</span>
                      )}
                      {isMandatoryForUserSpec && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 2, backgroundColor: '#dc262615', color: '#dc2626', fontFamily: 'var(--font-body)' }}>
                          Req. {relevantMandatorySpecs.join('/')}
                        </span>
                      )}
                      {!isMandatoryForUserSpec && c.type === 'elective' && c.code && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: accent, fontFamily: 'var(--font-mono)' }}>{c.code}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', lineHeight: 1.3, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                      {c.name}
                    </div>
                    {c.faculty && (
                      <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 2, fontFamily: 'var(--font-body)' }}>
                        {c.faculty.replace(/^(Prof\.|Dr\.) /, '')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TimetableView({ selected, visibleIds, userSpecs, onCourseClick }: Props) {
  const term4 = ALL_COURSES.filter(c => c.term === 4 && c.type !== 'exam' && c.type !== 'free');
  const term5 = ALL_COURSES.filter(c => c.term === 5 && c.type !== 'exam' && c.type !== 'free');
  const term6 = ALL_COURSES.filter(c => c.term === 6 && c.type !== 'exam' && c.type !== 'free');

  const allVisible = ALL_COURSES.filter(c => visibleIds.has(c.id));
  const conflictIds = getConflictIds(allVisible, visibleIds);

  const hasTerm4Content = TERM4_BLOCKS.some(b =>
    term4.some(c => c.timings && courseInBlock(c, b.start, b.end) && visibleIds.has(c.id)),
  );

  const conflictCourses = allVisible.filter(c => conflictIds.has(c.id));

  return (
    <div
      style={{ padding: '16px 20px', minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: 'var(--font-body)' }}
      className="lg:px-6 print:min-h-0 print:p-0"
    >
      <SpecLegend />

      {conflictCourses.length > 0 && (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius)', backgroundColor: '#fff5f5', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 12 }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ marginTop: 1 }} />
          <div>
            <span style={{ fontWeight: 700 }}>Schedule conflict: </span>
            {conflictCourses.map(c => c.code ?? c.name).join(' & ')} are in the same conflict group — pick only one.
          </div>
        </div>
      )}

      <TermDivider label="Term 4" dateRange="Jun 29 – Sep 27, 2026" />

      {!hasTerm4Content ? (
        <p style={{ fontSize: 13, color: 'var(--ash)', fontStyle: 'italic', paddingLeft: 2, marginBottom: 24 }}>No Term 4 courses selected.</p>
      ) : (
        <>
          {TERM4_BLOCKS.map((b, i) => (
            <div key={b.block}>
              {i === 4 && (
                <div style={{ marginBottom: 14, borderRadius: 'var(--radius)', padding: '7px 12px', fontSize: 12, fontWeight: 500, border: '1px dashed #fca5a5', backgroundColor: '#fff5f5', color: '#ef4444' }}>
                  📝 Exam Week — Aug 24–28
                </div>
              )}
              {i === 5 && (
                <div style={{ marginBottom: 14, borderRadius: 'var(--radius)', padding: '7px 12px', fontSize: 12, fontWeight: 500, border: '1px dashed #86efac', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  🟢 Free Week — Sep 7–11
                </div>
              )}
              <BlockTable
                blockInfo={b}
                courses={term4}
                visibleIds={visibleIds}
                conflictIds={conflictIds}
                userSpecs={userSpecs}
                onCourseClick={onCourseClick}
              />
            </div>
          ))}
        </>
      )}

      <TermDivider label="Term 5" dateRange="Sep 28 – Dec 27, 2026" />
      <CourseWeekList courses={term5} visibleIds={visibleIds} userSpecs={userSpecs} onCourseClick={onCourseClick} />

      <TermDivider label="Term 6" dateRange="Jan – Apr 2027" />
      <CourseWeekList courses={term6} visibleIds={visibleIds} userSpecs={userSpecs} onCourseClick={onCourseClick} />
    </div>
  );
}
