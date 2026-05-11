'use client';

import { AlertTriangle } from 'lucide-react';
import type { Course } from '@/types';
import { ALL_COURSES, SPECS } from '@/data/courses';

interface Props {
  selected: Set<number>;
  visibleIds: Set<number>;
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
  return spec?.color ?? '#64748b';
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

function CoursePill({ course, room, hasConflict, onClick }: {
  course: Course;
  room: string;
  hasConflict: boolean;
  onClick: () => void;
}) {
  const accent = hasConflict ? '#ef4444' : getCourseAccent(course);
  const isWaw = course.type === 'waw';
  const bg = hasConflict ? '#fee2e2' : getCourseBg(course);
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-md hover:brightness-95 transition-all px-2 py-1.5"
      style={{
        background: isWaw ? WAW_GRADIENT : bg,
        borderLeft: `4px solid ${accent}`,
        boxShadow: isWaw ? '0 1px 4px rgba(251,191,36,0.3)' : undefined,
      }}
    >
      <div className="flex items-center gap-1">
        {hasConflict && <AlertTriangle className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />}
        <span className="font-bold text-[12px] leading-tight" style={{ color: accent }}>
          {course.code ?? course.name.slice(0, 4).toUpperCase()}
        </span>
      </div>
      {room && (
        <div className="text-[10px] font-mono font-semibold mt-0.5" style={{ color: accent + 'bb' }}>
          {room}
        </div>
      )}
    </button>
  );
}

function BlockTable({ blockInfo, courses, visibleIds, conflictIds, onCourseClick }: {
  blockInfo: typeof TERM4_BLOCKS[0];
  courses: Course[];
  visibleIds: Set<number>;
  conflictIds: Set<number>;
  onCourseClick: (c: Course) => void;
}) {
  const blockCourses = courses
    .filter(c => c.timings && courseInBlock(c, blockInfo.start, blockInfo.end))
    .filter(c => visibleIds.has(c.id));

  const slots = getUniqueSlots(blockCourses);
  if (slots.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3 px-1">
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 14px', borderRadius: 9999,
          backgroundColor: '#fff7ed', border: '1px solid #fdba74',
        }}>
          <span style={{ color: '#c2410c', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Block {blockInfo.block}
          </span>
          <span style={{ color: '#ea580c', fontSize: 11 }}>{blockInfo.dates}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white print:overflow-visible print:border-none print:shadow-none">
        <table className="w-full border-collapse" style={{ minWidth: 560 }}>
          <thead>
            <tr className="bg-slate-700 border-b border-slate-600">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wider border-r border-slate-600 w-32">
                Time Slot
              </th>
              {DAYS.map((day, i) => {
                const d = new Date(blockInfo.start);
                d.setUTCDate(d.getUTCDate() + i);
                const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                
                return (
                  <th key={day}
                    className={`px-2 py-2 text-center border-r last:border-r-0 border-slate-600 ${
                      i >= 5 ? 'bg-slate-800' : ''
                    }`}
                  >
                    <div className={`text-[11px] font-bold uppercase tracking-wider ${i >= 5 ? 'text-slate-400' : 'text-slate-200'}`}>
                      {day}
                    </div>
                    <div className={`text-[9px] font-medium mt-0.5 ${i >= 5 ? 'text-slate-500' : 'text-slate-400'}`}>
                      {dateStr}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, si) => (
              <tr key={slot}
                className={`border-b border-gray-100 last:border-b-0 ${si % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
              >
                <td className="px-4 py-2 text-[11px] font-semibold text-gray-600 border-r border-gray-200 whitespace-nowrap align-middle bg-gray-50">
                  {slot}
                </td>
                {DAYS.map((day, di) => {
                  const dayCourses = blockCourses.filter(c =>
                    c.timings?.some(t => t.slot === slot && t.days.includes(day))
                  );
                  return (
                    <td key={day}
                      className={`px-1.5 py-1.5 border-r last:border-r-0 border-gray-100 align-top ${
                        di >= 5 ? 'bg-gray-50/60' : ''
                      }`}
                      style={{ minWidth: 90 }}
                    >
                      {dayCourses.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {dayCourses.map(c => {
                            const timing = c.timings!.find(
                              t => t.slot === slot && t.days.includes(day)
                            );
                            return (
                              <CoursePill
                                key={c.id}
                                course={c}
                                room={timing?.room ?? ''}
                                hasConflict={conflictIds.has(c.id)}
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
    <div className="flex items-center gap-4 mb-5 mt-2">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-orange-300/60" />
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30">
        <span className="text-orange-600 font-bold text-sm">{label}</span>
        <span className="text-orange-400/60 text-xs">·</span>
        <span className="text-orange-500/70 text-xs">{dateRange}</span>
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-orange-300/60" />
    </div>
  );
}

function SpecLegend() {
  const items = [
    ...SPECS.map(s => ({ label: s.label, color: s.color })),
    { label: 'WaW', color: '#d97706' },
    { label: 'Required', color: '#2563eb' },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 20px', padding: '6px 4px 12px', fontSize: 11, color: '#6b7280' }}>
      <span style={{ fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>Legend:</span>
      {items.map(item => (
        <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, backgroundColor: item.color }} />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

// Simple week-based list for terms without timing data
function CourseWeekList({ courses, visibleIds, onCourseClick }: {
  courses: Course[];
  visibleIds: Set<number>;
  onCourseClick: (c: Course) => void;
}) {
  const visible = courses.filter(c => visibleIds.has(c.id));
  if (visible.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic px-1 mb-6">
        No courses selected for this term yet.
      </p>
    );
  }

  const weekNums = [...new Set(visible.map(c => c.week))].sort((a, b) => a - b);

  return (
    <div className="mb-8 space-y-3">
      {weekNums.map(wk => {
        const wkCourses = visible.filter(c => c.week === wk);
        return (
          <div key={wk} className="flex gap-3">
            <div className="flex flex-col items-start min-w-[72px] pt-1 flex-shrink-0">
              <span className="text-xs font-bold text-gray-600">Wk {wk}</span>
              <span className="text-[10px] text-gray-400 leading-tight mt-0.5">
                {wkCourses[0]?.dates}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
              {wkCourses.map(c => {
                const accent = getCourseAccent(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => onCourseClick(c)}
                    className="rounded-xl border-2 px-3 py-2 text-left hover:shadow-md transition-all"
                    style={{
                      borderColor: c.type === 'waw' ? '#fbbf24' : accent + '44',
                      background: c.type === 'waw' ? WAW_GRADIENT : accent + '0d',
                      minWidth: 160,
                      boxShadow: c.type === 'waw' ? '0 1px 4px rgba(251,191,36,0.3)' : undefined,
                    }}
                  >
                    <div className="text-xs font-bold mb-0.5" style={{ color: accent }}>
                      {c.type === 'waw' ? 'WaW' : c.type === 'mandatory' ? 'Required' : c.code ?? ''}
                    </div>
                    <div className="text-sm font-semibold text-gray-800 leading-snug">{c.name}</div>
                    {c.faculty && (
                      <div className="text-[10px] text-gray-400 mt-0.5">
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

export function TimetableView({ selected, visibleIds, onCourseClick }: Props) {
  const term4 = ALL_COURSES.filter(c => c.term === 4 && c.type !== 'exam' && c.type !== 'free');
  const term5 = ALL_COURSES.filter(c => c.term === 5 && c.type !== 'exam' && c.type !== 'free');
  const term6 = ALL_COURSES.filter(c => c.term === 6 && c.type !== 'exam' && c.type !== 'free');

  const allVisible = ALL_COURSES.filter(c => visibleIds.has(c.id));
  const conflictIds = getConflictIds(allVisible, visibleIds);

  const hasTerm4Content = TERM4_BLOCKS.some(b =>
    term4.some(c => c.timings && courseInBlock(c, b.start, b.end) && visibleIds.has(c.id))
  );

  const conflictCourses = allVisible.filter(c => conflictIds.has(c.id));

  return (
    <div className="p-4 lg:p-6 min-h-screen print:min-h-0 print:p-0 print:bg-white" style={{ backgroundColor: '#f8fafc' }}>
      <SpecLegend />

      {/* Conflict warning banner */}
      {conflictCourses.length > 0 && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-500" />
          <div>
            <span className="font-semibold">Schedule conflict: </span>
            {conflictCourses.map(c => c.code ?? c.name).join(' & ')} are in the same conflict group — pick only one.
          </div>
        </div>
      )}

      <TermDivider label="Term 4" dateRange="Jun 29 – Sep 27, 2026" />

      {!hasTerm4Content ? (
        <p className="text-sm text-gray-400 italic px-1 mb-8">No Term 4 courses selected.</p>
      ) : (
        <>
          {TERM4_BLOCKS.map((b, i) => (
            <div key={b.block}>
              {i === 4 && (
                <div style={{ marginBottom: 16, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 500, border: '1px dashed #fca5a5', backgroundColor: '#fff5f5', color: '#ef4444' }}>
                  📝 Exam Week — Aug 24–28
                </div>
              )}
              {i === 5 && (
                <div style={{ marginBottom: 16, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 500, border: '1px dashed #86efac', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  🟢 Free Week — Sep 7–11
                </div>
              )}
              <BlockTable
                blockInfo={b}
                courses={term4}
                visibleIds={visibleIds}
                conflictIds={conflictIds}
                onCourseClick={onCourseClick}
              />
            </div>
          ))}
        </>
      )}

      <TermDivider label="Term 5" dateRange="Sep 28 – Dec 27, 2026" />
      <CourseWeekList courses={term5} visibleIds={visibleIds} onCourseClick={onCourseClick} />

      <TermDivider label="Term 6" dateRange="Jan – Apr 2027" />
      <CourseWeekList courses={term6} visibleIds={visibleIds} onCourseClick={onCourseClick} />
    </div>
  );
}
