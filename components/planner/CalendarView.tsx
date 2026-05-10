'use client';

import type { Course } from '@/types';
import { ALL_COURSES } from '@/data/courses';
import { CourseBar } from './CourseBar';

interface Props {
  selected: Set<number>;
  showReviews: boolean;
  visibleIds: Set<number>;
  onCourseClick: (course: Course) => void;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  return copy;
}

function getWeekRows(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks: Date[][] = [];
  let monday = getMonday(firstDay);

  while (monday <= lastDay) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)));
    monday = addDays(monday, 7);
  }
  return weeks;
}

// Only show a course in the month where its startDate actually falls
function getCoursesForWeek(courses: Course[], monday: Date, displayedMonth: number): Course[] {
  const sunday = addDays(monday, 6);
  return courses.filter(c => {
    const start = parseIso(c.startDate);
    return start >= monday && start <= sunday && start.getMonth() === displayedMonth;
  });
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function WeekRow({
  days,
  month,
  courses,
  selected,
  showReviews,
  visibleIds,
  onCourseClick,
}: {
  days: Date[];
  month: number;
  courses: Course[];
  selected: Set<number>;
  showReviews: boolean;
  visibleIds: Set<number>;
  onCourseClick: (c: Course) => void;
}) {
  const monday = days[0];
  const rowCourses = getCoursesForWeek(courses, monday, month).filter(c => visibleIds.has(c.id));
  const hasContent = rowCourses.length > 0;

  return (
    <div className={`border-b border-gray-100 last:border-b-0 ${!hasContent ? 'opacity-60' : ''}`}>
      {/* Day number cells */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === month;
          const isWeekend = i >= 5;
          return (
            <div
              key={i}
              className={`
                py-1.5 px-2 text-right text-xs font-medium border-r last:border-r-0 border-gray-100
                ${isWeekend ? 'bg-gray-50' : 'bg-white'}
                ${inMonth ? 'text-gray-500' : 'text-gray-300'}
              `}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>

      {/* Course bars — span the full row */}
      {hasContent && (
        <div className="px-3 pt-1 pb-2.5 space-y-1.5 bg-white border-t border-gray-50">
          {rowCourses.map(c => (
            <CourseBar
              key={c.id}
              course={c}
              isSelected={selected.has(c.id)}
              showReviews={showReviews}
              onClick={() => onCourseClick(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MonthGrid({
  year,
  month,
  courses,
  selected,
  showReviews,
  visibleIds,
  onCourseClick,
}: {
  year: number;
  month: number;
  courses: Course[];
  selected: Set<number>;
  showReviews: boolean;
  visibleIds: Set<number>;
  onCourseClick: (c: Course) => void;
}) {
  const weekRows = getWeekRows(year, month);
  const label = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  // Only render months that have at least one visible course
  const hasAnyCourse = weekRows.some(days =>
    getCoursesForWeek(courses, days[0], month).some(c => visibleIds.has(c.id)),
  );

  return (
    <div className="mb-8">
      <h3 className="text-slate-600 font-semibold text-sm mb-2 px-1">{label}</h3>
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        {/* Day name headers */}
        <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-200">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-[11px] font-semibold py-2 uppercase tracking-wide border-r last:border-r-0 border-gray-200 ${
                i >= 5 ? 'text-gray-400 bg-gray-100' : 'text-gray-500'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {weekRows.map((days, wi) => (
          <WeekRow
            key={wi}
            days={days}
            month={month}
            courses={courses}
            selected={selected}
            showReviews={showReviews}
            visibleIds={visibleIds}
            onCourseClick={onCourseClick}
          />
        ))}
      </div>
    </div>
  );
}

function TermSection({
  label,
  dateRange,
  courses,
  selected,
  showReviews,
  visibleIds,
  onCourseClick,
}: {
  label: string;
  dateRange: string;
  courses: Course[];
  selected: Set<number>;
  showReviews: boolean;
  visibleIds: Set<number>;
  onCourseClick: (c: Course) => void;
}) {
  const allDates = courses.flatMap(c => [parseIso(c.startDate), parseIso(c.endDate)]);
  if (allDates.length === 0) return null;

  const minDate = allDates.reduce((a, b) => (a < b ? a : b));
  const maxDate = allDates.reduce((a, b) => (a > b ? a : b));

  const months: { year: number; month: number }[] = [];
  let d = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  while (d <= endMonth) {
    months.push({ year: d.getFullYear(), month: d.getMonth() });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }

  return (
    <div className="mb-12">
      {/* Term divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-orange-500/40" />
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30">
          <span className="text-orange-400 font-bold text-sm tracking-wide">{label}</span>
          <span className="text-orange-400/60 text-xs">·</span>
          <span className="text-orange-400/70 text-xs">{dateRange}</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-orange-500/40" />
      </div>

      {months.map(({ year, month }) => (
        <MonthGrid
          key={`${year}-${month}`}
          year={year}
          month={month}
          courses={courses}
          selected={selected}
          showReviews={showReviews}
          visibleIds={visibleIds}
          onCourseClick={onCourseClick}
        />
      ))}
    </div>
  );
}

export function CalendarView({ selected, showReviews, visibleIds, onCourseClick }: Props) {
  const term4 = ALL_COURSES.filter(c => c.term === 4 && c.type !== 'exam' && c.type !== 'free');
  const term5 = ALL_COURSES.filter(c => c.term === 5 && c.type !== 'exam' && c.type !== 'free');
  const term6 = ALL_COURSES.filter(c => c.term === 6 && c.type !== 'exam' && c.type !== 'free');

  return (
    <div className="p-4 lg:p-6 bg-slate-100 min-h-full">
      <TermSection
        label="Term 4" dateRange="Jun 29 – Sep 27, 2026"
        courses={term4} selected={selected} showReviews={showReviews}
        visibleIds={visibleIds} onCourseClick={onCourseClick}
      />
      <TermSection
        label="Term 5" dateRange="Sep 28 – Dec 27, 2026"
        courses={term5} selected={selected} showReviews={showReviews}
        visibleIds={visibleIds} onCourseClick={onCourseClick}
      />
      <TermSection
        label="Term 6" dateRange="Jan – Apr, 2027"
        courses={term6} selected={selected} showReviews={showReviews}
        visibleIds={visibleIds} onCourseClick={onCourseClick}
      />
    </div>
  );
}
