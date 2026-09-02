'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, CheckCircle2, BookOpen, Users, Eye, EyeOff, CalendarDays, CalendarCheck, Trophy, Flag, Bell } from 'lucide-react';
import type { Course, SpecId, Friend, FriendOverlay } from '@/types';
import type { Commitment, CommitmentKind } from '@/lib/alerts/commitments';
import { commitmentsByDate } from '@/lib/alerts/commitments';
import { formatIst } from '@/lib/alerts/time';
import { colorForFriend } from '@/types';
import { ALL_COURSES, SPECS } from '@/data/courses';
import type { EventType } from '@/hooks/useAnalytics';
import { Term1GanttPanel } from './Term1GanttPanel';
import { getSectionAdvisories, isTimingVisible, type SectionAdvisory } from '@/lib/conflicts';

interface Props {
  selected: Set<number>;
  visibleIds: Set<number>;
  userSpecs: SpecId[];
  onCourseClick: (course: Course) => void;
  selectedTerms: Set<4 | 5 | 6>;
  friendOverlays?: FriendOverlay[];
  friends?: Friend[];
  overlayIds?: Set<string>;
  onToggleOverlay?: (friend: Friend) => void;
  trackEvent?: (type: EventType, payload?: Record<string, unknown>) => void;
  courseSections?: Map<number, string>;
  /** Search hits. When set, matching pills are ringed and everything else dims. */
  highlightIds?: Set<number>;
  /**
   * Tracked-competition milestones and custom deadlines, from the Alerts tab.
   * They land in a Deadlines row under each week's classes, so a submission due
   * on a teaching day is visible in the same place as the class it clashes with.
   */
  commitments?: Commitment[];
  onCommitmentClick?: (c: Commitment) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Orange ring drawn around courses matching the header search. */
const SEARCH_RING = '#f97316';

type SearchState = 'hit' | 'miss';

/** 'hit' / 'miss' when a search is running, undefined otherwise. */
function searchStateFor(highlightIds: Set<number> | undefined, id: number): SearchState | undefined {
  if (!highlightIds || highlightIds.size === 0) return undefined;
  return highlightIds.has(id) ? 'hit' : 'miss';
}

/** A non-teaching notice strip: an exam window, a break, or a one-off assessment. */
interface Notice {
  label: string;
  tone: 'exam' | 'break';
  /** Pairs this banner with the Term 1 gantt panel when the Term 1 overlay is on.
   *  Only the term-wide exam week does this — a one-off exam date must not, or
   *  every added exam banner would draw its own duplicate panel. */
  withTerm1Gantt?: boolean;
}

/** A single teaching week of a block — one grid table on the schedule. */
interface BlockRow {
  block: number;
  weekNum: 1 | 2;
  dates: string;
  start: string;
  end: string;
  /** Non-teaching notices to render above this row (exam break, placements week, …). */
  banners?: Notice[];
}

/** Everything the schedule needs to lay out one term. */
interface TermSchedule {
  label: string;
  dateRange: string;
  blocks: BlockRow[];
  /** Notices that fall after the last teaching block of the term. */
  trailing?: Notice[];
}

// Block calendars per term. These must stay in sync with the `block` / `startDate` /
// `endDate` fields in data/courses.ts — see CLAUDE.md.
const SCHEDULE_BY_TERM: Record<number, TermSchedule> = {
  4: {
    label: 'Term 4',
    dateRange: 'Jun 29 – Sep 27, 2026',
    blocks: [
      { block: 16, weekNum: 1, dates: 'Jun 29 – Jul 5',  start: '2026-06-29', end: '2026-07-05' },
      { block: 16, weekNum: 2, dates: 'Jul 6 – Jul 12',  start: '2026-07-06', end: '2026-07-12' },
      { block: 17, weekNum: 1, dates: 'Jul 13 – Jul 19', start: '2026-07-13', end: '2026-07-19' },
      { block: 17, weekNum: 2, dates: 'Jul 20 – Jul 26', start: '2026-07-20', end: '2026-07-26' },
      { block: 18, weekNum: 1, dates: 'Jul 27 – Aug 2',  start: '2026-07-27', end: '2026-08-02' },
      { block: 18, weekNum: 2, dates: 'Aug 3 – Aug 9',   start: '2026-08-03', end: '2026-08-09' },
      { block: 19, weekNum: 1, dates: 'Aug 10 – Aug 16', start: '2026-08-10', end: '2026-08-16' },
      { block: 19, weekNum: 2, dates: 'Aug 17 – Aug 23', start: '2026-08-17', end: '2026-08-23' },
      { block: 20, weekNum: 1, dates: 'Aug 31 – Sep 6',  start: '2026-08-31', end: '2026-09-06',
        banners: [{ label: 'Exam Week — Aug 24–28', tone: 'exam', withTerm1Gantt: true }] },
      { block: 20, weekNum: 2, dates: 'Sep 7 – Sep 13',  start: '2026-09-07', end: '2026-09-13',
        banners: [{ label: 'Mid Block — Persuasive Writing · Sat Sep 5, 09:00–12:00', tone: 'exam' }] },
      { block: 21, weekNum: 1, dates: 'Sep 14 – Sep 20', start: '2026-09-14', end: '2026-09-20',
        banners: [{ label: 'End Block Exam — Persuasive Writing · Sat Sep 12, 09:00–12:00', tone: 'exam' }] },
      { block: 21, weekNum: 2, dates: 'Sep 21 – Sep 27', start: '2026-09-21', end: '2026-09-27' },
    ],
    // Sun Sep 27 closes Term 4. The grid runs Mon–Sat, so these land here rather
    // than in a cell.
    trailing: [
      { label: 'End Block Exam — Product Management · Sun Sep 27, 09:00–12:00', tone: 'exam' },
      { label: 'End Block Exam — Managing High Performance Teams · Sun Sep 27, 13:30–16:30', tone: 'exam' },
    ],
  },
  5: {
    label: 'Term 5',
    dateRange: 'Sep 28 – Dec 27, 2026',
    blocks: [
      { block: 22, weekNum: 1, dates: 'Sep 28 – Oct 4',  start: '2026-09-28', end: '2026-10-04' },
      { block: 22, weekNum: 2, dates: 'Oct 5 – Oct 11',  start: '2026-10-05', end: '2026-10-11' },
      { block: 23, weekNum: 1, dates: 'Oct 12 – Oct 18', start: '2026-10-12', end: '2026-10-18' },
      { block: 23, weekNum: 2, dates: 'Oct 19 – Oct 25', start: '2026-10-19', end: '2026-10-25' },
      { block: 24, weekNum: 1, dates: 'Oct 26 – Nov 1',  start: '2026-10-26', end: '2026-11-01' },
      { block: 24, weekNum: 2, dates: 'Nov 2 – Nov 8',   start: '2026-11-02', end: '2026-11-08' },
      { block: 25, weekNum: 1, dates: 'Nov 23 – Nov 29', start: '2026-11-23', end: '2026-11-29',
        banners: [
          { label: 'Exam Break — Nov 9–15', tone: 'exam' },
          { label: 'Placements Week — Nov 16–22', tone: 'break' },
        ] },
      { block: 25, weekNum: 2, dates: 'Nov 30 – Dec 6',  start: '2026-11-30', end: '2026-12-06' },
      { block: 26, weekNum: 1, dates: 'Dec 7 – Dec 13',  start: '2026-12-07', end: '2026-12-13' },
      { block: 26, weekNum: 2, dates: 'Dec 14 – Dec 20', start: '2026-12-14', end: '2026-12-20' },
    ],
    trailing: [
      { label: 'Exam Week — Dec 21–27', tone: 'exam' },
      { label: 'Term Break — Dec 28–Jan 3', tone: 'break' },
    ],
  },
};

/** Terms that have a full block grid. Anything else falls back to the week list. */
const GRID_TERMS = [4, 5] as const;

function blocksFor(term: number): BlockRow[] {
  return SCHEDULE_BY_TERM[term]?.blocks ?? [];
}

// Maps each Term 4 block-row index to the corresponding TERM1_WEEKS index
// (Week 9 / index 8 is paired with the Term 4 exam week banner separately)
const TERM4_TO_TERM1_WEEK_IDX: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12];

function parseTs(iso: string) { return new Date(iso).getTime(); }

// Index of the first row in `blocks` to show by default. Snaps to Week 1 of the block
// whose date range contains today (so "all of Block 17" is visible on Jul 25, not just W2).
// If today falls between blocks (e.g. the Aug 24–30 exam gap), snap to the next upcoming
// block. If today is past the last block, fall back to 0 (show everything).
function currentBlockStartIndex(blocks: BlockRow[], now: Date = new Date()): number {
  const t = now.getTime();
  const inside = blocks.findIndex(b => parseTs(b.start) <= t && t <= parseTs(b.end));
  if (inside !== -1) {
    const blockNum = blocks[inside].block;
    return blocks.findIndex(b => b.block === blockNum);
  }
  const next = blocks.findIndex(b => parseTs(b.start) > t);
  if (next !== -1) {
    const blockNum = blocks[next].block;
    return blocks.findIndex(b => b.block === blockNum);
  }
  return 0;
}

function todayUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate();
}

function courseInBlock(c: Course, start: string, end: string) {
  return parseTs(c.startDate) <= parseTs(end) && parseTs(c.endDate) >= parseTs(start);
}

// Days a timing runs on for a given block/week. Courses spanning two blocks can
// override their second block's pattern via block2Days / block2Week2Days.
function effectiveDaysFor(c: Course, t: NonNullable<Course['timings']>[number], blockStart: string, weekNum: 1 | 2): string[] {
  const inSecondBlock = parseTs(blockStart) - parseTs(c.startDate) >= 14 * 86400000;
  if (inSecondBlock) {
    if (weekNum === 2 && t.block2Week2Days) return t.block2Week2Days;
    if (t.block2Days) return t.block2Days;
  }
  return weekNum === 2 && t.week2Days ? t.week2Days : t.days;
}

function getUniqueSlots(
  courses: Course[],
  advisories?: Map<number, SectionAdvisory>,
  assignedSections?: Map<number, string>,
  friendBlocks?: { overlay: FriendOverlay; courses: Course[] }[],
): string[] {
  const set = new Set<string>();
  courses.forEach(c => c.timings?.forEach(t => {
    if (!isTimingVisible(c.id, t, assignedSections ?? new Map(), advisories ?? new Map())) return;
    set.add(t.slot);
  }));
  // A friend in the other section meets in a slot the viewer may not have a row
  // for. Without this their pill has nowhere to render and the overlay drops them.
  friendBlocks?.forEach(({ overlay, courses: fcs }) => fcs.forEach(c => c.timings?.forEach(t => {
    if (!friendTimingVisible(overlay, c.id, t)) return;
    set.add(t.slot);
  })));
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

// ── Friend overlay helpers ──────────────────────────────────

function initialsOf(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

// Does a course have a timing in this slot on this day, for this week of the block?
function matchesSlotDay(c: Course, slot: string, day: string, weekNum: 1 | 2, blockStart: string): boolean {
  return !!c.timings?.some(t => {
    const eff = effectiveDaysFor(c, t, blockStart, weekNum);
    return t.slot === slot && eff.includes(day);
  });
}

// A friend's overlaid courses that fall inside a given block.
function friendBlockCourses(overlay: FriendOverlay, start: string, end: string): Course[] {
  return ALL_COURSES.filter(
    c => overlay.selected.has(c.id) && c.timings && courseInBlock(c, start, end),
  );
}

// Which part of a two-section course a friend actually sits in. Their recorded
// section wins; with no record on file we can't narrow it, so every part stays
// visible rather than guessing them into your slot.
function friendTimingVisible(
  overlay: FriendOverlay,
  courseId: number,
  timing: NonNullable<Course['timings']>[number],
): boolean {
  const assigned = overlay.sections?.get(courseId);
  if (!assigned) return true;
  return !timing.part || timing.part === assigned;
}

// matchesSlotDay, narrowed to the section the friend is actually in.
function friendMatchesSlotDay(
  overlay: FriendOverlay,
  c: Course,
  slot: string,
  day: string,
  weekNum: 1 | 2,
  blockStart: string,
): boolean {
  return !!c.timings?.some(t => {
    if (!friendTimingVisible(overlay, c.id, t)) return false;
    return t.slot === slot && effectiveDaysFor(c, t, blockStart, weekNum).includes(day);
  });
}

type FriendCellState = 'together' | 'clash' | 'solo';

interface Clash {
  friendId: string;
  friendName: string;
  block: number;
  week: 1 | 2;
  slot: string;
  day: string;
  myCourse: string;
  friendCourse: string;
}

// Time overlaps where, in the same block/slot/day, the user has a course and an
// overlaid friend has a *different* course (same course = sitting together, not a clash).
function computeClashes(visibleIds: Set<number>, overlays: FriendOverlay[]): Clash[] {
  if (overlays.length === 0) return [];
  const myCourses = ALL_COURSES.filter(c => visibleIds.has(c.id) && c.timings);
  const out: Clash[] = [];

  for (const block of GRID_TERMS.flatMap(t => blocksFor(t))) {
    const mine = myCourses.filter(c => courseInBlock(c, block.start, block.end));
    if (mine.length === 0) continue;
    for (const overlay of overlays) {
      const theirs = friendBlockCourses(overlay, block.start, block.end);
      if (theirs.length === 0) continue;
      const slots = getUniqueSlots(mine, undefined, undefined, [{ overlay, courses: theirs }]);
      for (const slot of slots) {
        for (const day of DAYS) {
          const myHere = mine.filter(c => matchesSlotDay(c, slot, day, block.weekNum, block.start));
          if (myHere.length === 0) continue;
          for (const tc of theirs) {
            if (!friendMatchesSlotDay(overlay, tc, slot, day, block.weekNum, block.start)) continue;
            if (myHere.some(mc => mc.id === tc.id)) continue; // same class — together
            out.push({
              friendId: overlay.id,
              friendName: overlay.name,
              block: block.block,
              week: block.weekNum,
              slot,
              day,
              myCourse: myHere[0].code ?? myHere[0].name,
              friendCourse: tc.code ?? tc.name,
            });
          }
        }
      }
    }
  }
  return out;
}

function FriendCoursePill({ course, overlay, state, mySection, onClick }: {
  course: Course;
  overlay: FriendOverlay;
  state: FriendCellState;
  /** The viewer's own section for this course, when they're taking it too. */
  mySection: string | undefined;
  onClick: () => void;
}) {
  const color = overlay.color;
  const section = overlay.sections?.get(course.id);
  // Worth calling out only when it differs from yours — otherwise it's noise.
  const splitSection = !!section && !!mySection && section !== mySection;
  const note = state === 'clash' ? ' — clashes with your class'
    : state === 'together' ? ' — same class as you' : '';
  const sectionNote = section
    ? ` · Section ${section}${splitSection ? ` (you're in ${mySection})` : ''}`
    : '';
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-md hover:brightness-95 transition-all px-2 py-1"
      title={`${overlay.name}: ${course.name}${sectionNote}${note}`}
      style={{
        background: color + '14',
        borderLeft: `3px dashed ${color}`,
        outline: state === 'clash' ? `1.5px solid ${color}` : 'none',
        outlineOffset: state === 'clash' ? '-1px' : undefined,
      }}
    >
      <div className="flex items-center gap-1">
        <span
          className="inline-flex items-center justify-center text-[8px] font-bold text-white rounded-sm px-1 flex-shrink-0"
          style={{ backgroundColor: color, minWidth: 14, height: 12 }}
        >
          {initialsOf(overlay.name)}
        </span>
        {state === 'clash' && <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" style={{ color }} />}
        {state === 'together' && <Users className="w-2.5 h-2.5 flex-shrink-0" style={{ color }} />}
        <span className="font-semibold text-[11px] leading-tight" style={{ color }}>
          {course.code ?? course.name.slice(0, 4).toUpperCase()}
        </span>
        {section && (
          <span
            className="text-[9px] font-semibold leading-tight flex-shrink-0 rounded-sm px-1"
            style={
              splitSection
                ? { color: '#fff', backgroundColor: color }
                : { color, opacity: 0.75 }
            }
          >
            {section}
          </span>
        )}
      </div>
    </button>
  );
}

function CoursePill({ course, room, hasConflict, sectionAdvisory, confirmedSection, userSpecs, searchState, printHidden, onClick }: {
  course: Course;
  room: string;
  hasConflict: boolean;
  sectionAdvisory: SectionAdvisory | undefined;
  confirmedSection: string | undefined;
  userSpecs: SpecId[];
  /** 'hit'/'miss' while a search is running; undefined when no search is active. */
  searchState?: SearchState;
  /** Hide from PDF export (print media) only; still visible on screen. */
  printHidden?: boolean;
  onClick: () => void;
}) {
  const relevantMandatorySpecs = (course.mandatoryFor ?? []).filter(
    s => userSpecs.length === 0 || userSpecs.includes(s)
  );
  const isMandatoryForUserSpec = relevantMandatorySpecs.length > 0;

  const accent = hasConflict
    ? '#ef4444'
    : sectionAdvisory
    ? '#d97706'
    : isMandatoryForUserSpec
    ? '#dc2626'
    : getCourseAccent(course);
  const isWaw = course.type === 'waw';
  const bg = hasConflict
    ? '#fee2e2'
    : sectionAdvisory
    ? '#fffbeb'
    : isMandatoryForUserSpec
    ? `linear-gradient(135deg, #fee2e2 0%, #fff5f5 100%)`
    : getCourseBg(course);

  return (
    <button
      onClick={onClick}
      data-course-id={course.id}
      data-search-hit={searchState === 'hit' ? 'true' : undefined}
      className={`w-full text-left rounded-md hover:brightness-95 transition-all px-2 py-1.5${printHidden ? ' print:hidden' : ''}`}
      title={confirmedSection ? `Confirmed: Section ${confirmedSection}` : sectionAdvisory?.message}
      style={{
        background: isWaw ? WAW_GRADIENT : bg,
        borderLeft: `4px solid ${accent}`,
        boxShadow: searchState === 'hit'
          ? `0 0 0 4px ${SEARCH_RING}33`
          : isWaw ? '0 1px 4px rgba(251,191,36,0.3)' : undefined,
        outline: searchState === 'hit' ? `2px solid ${SEARCH_RING}` : undefined,
        opacity: searchState === 'miss' ? 0.25 : undefined,
      }}
    >
      <div className="flex items-center gap-1">
        {hasConflict && <AlertTriangle className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />}
        {confirmedSection && !hasConflict && <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#059669' }} />}
        {!confirmedSection && sectionAdvisory && !hasConflict && <Info className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />}
        <span className="font-bold text-[12px] leading-tight" style={{ color: accent }}>
          {course.code ?? course.name.slice(0, 4).toUpperCase()}
        </span>
      </div>
      {confirmedSection && !hasConflict && (
        <div className="text-[9px] font-semibold mt-0.5" style={{ color: '#059669' }}>
          Section {confirmedSection}
        </div>
      )}
      {!confirmedSection && sectionAdvisory && !hasConflict && (
        <div className="text-[9px] font-semibold mt-0.5" style={{ color: '#d97706' }}>
          Sec B likely
        </div>
      )}
      {isMandatoryForUserSpec && (
        <div className="text-[9px] font-bold mt-0.5" style={{ color: '#dc2626' }}>
          Req. {relevantMandatorySpecs.join('/')}
        </div>
      )}
      {room && (
        <div className="text-[10px] font-mono font-semibold mt-0.5" style={{ color: accent + 'bb' }}>
          {room}
        </div>
      )}
    </button>
  );
}

// ── Alerts on the schedule ──────────────────────────────
// A week row in the grid is seven consecutive days from `blockInfo.start`, so a
// commitment lands in a column by plain date equality. Block starts are
// `YYYY-MM-DD` parsed as UTC midnight and commitment dates are already IST
// calendar days (lib/alerts/commitments.ts), so both sides are calendar dates —
// no instant ever gets compared against a wall-clock day here.
function isoDayFrom(start: string, offsetDays: number): string {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Commitments falling inside a week row, indexed by day column. */
function weekCommitments(
  byDate: Map<string, Commitment[]>,
  blockInfo: BlockRow,
): { total: number; perDay: (Commitment[] | undefined)[] } {
  const perDay = DAYS.map((_, i) => byDate.get(isoDayFrom(blockInfo.start, i)));
  return { total: perDay.reduce((n, d) => n + (d?.length ?? 0), 0), perDay };
}

const COMMITMENT_STYLE: Record<CommitmentKind, { bg: string; border: string; fg: string; Icon: typeof Trophy }> = {
  // Registration and round closes are the ones you can *miss*, so they carry
  // the same alarm colour the Alerts tab uses for a due date. A round opening
  // is information, so it stays quiet.
  registration: { bg: '#fef2f2', border: '#fecaca', fg: '#b91c1c', Icon: Flag },
  round_end:    { bg: '#fef2f2', border: '#fecaca', fg: '#b91c1c', Icon: Trophy },
  deadline:     { bg: '#fff7ed', border: '#fed7aa', fg: '#c2410c', Icon: Bell },
  round_start:  { bg: '#f1f5f9', border: '#e2e8f0', fg: '#475569', Icon: Trophy },
};

function CommitmentPill({ item, onClick }: { item: Commitment; onClick?: () => void }) {
  const style = COMMITMENT_STYLE[item.kind];
  const { Icon } = style;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      title={`${item.title} — ${item.subtitle} · ${formatIst(item.at)}`}
      className={`w-full text-left rounded-md px-1.5 py-1 transition-all ${onClick ? 'hover:brightness-95 cursor-pointer' : 'cursor-default'}`}
      style={{
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        // Done means past (or ticked off): still drawn, because a week with a
        // deadline in it reads differently from an empty one even afterwards.
        opacity: item.done ? 0.45 : 1,
        textDecoration: item.done ? 'line-through' : undefined,
      }}
    >
      <div className="flex items-center gap-1">
        <Icon size={9} style={{ color: style.fg, flexShrink: 0 }} />
        {/* Wrapped to two lines rather than truncated: at this column width a
            single line cuts "The Governance Challenge 2026" down to "The
            Governanc…", which identifies nothing. */}
        <span className="text-[9px] font-bold leading-tight line-clamp-2" style={{ color: style.fg }}>
          {item.subtitle}
        </span>
      </div>
      <div className="text-[9px] leading-tight line-clamp-2" style={{ color: style.fg, opacity: 0.85 }}>
        {item.title}
      </div>
    </button>
  );
}

/** The "Deadlines" strip under a week's classes. Renders nothing when empty. */
function DeadlineRow({ perDay, onCommitmentClick }: {
  perDay: (Commitment[] | undefined)[];
  onCommitmentClick?: (c: Commitment) => void;
}) {
  return (
    <tr className="border-t-2 border-red-100 bg-red-50/40">
      <td className="px-4 py-2 text-[11px] font-semibold text-red-700 border-r border-gray-200 whitespace-nowrap align-middle bg-red-50">
        <span className="inline-flex items-center gap-1.5">
          <Trophy size={11} />
          Deadlines
        </span>
      </td>
      {DAYS.map((day, di) => (
        <td key={day} className="px-1.5 py-1.5 border-r last:border-r-0 border-gray-100 align-top" style={{ minWidth: 90 }}>
          {/* A fixed width is what makes `truncate` do anything: without one the
              cell grows to fit the longest competition title and drags the whole
              day column wider than its classes. */}
          <div className="flex flex-col gap-1" style={{ width: 104 }}>
            {perDay[di]?.map(item => (
              <CommitmentPill
                key={item.key}
                item={item}
                onClick={onCommitmentClick ? () => onCommitmentClick(item) : undefined}
              />
            ))}
          </div>
        </td>
      ))}
    </tr>
  );
}

function BlockTable({ blockInfo, courses, visibleIds, conflictIds, advisories, assignedSections, userSpecs, friendOverlays, highlightIds, commitmentsByDay, onCommitmentClick, onCourseClick }: {
  blockInfo: BlockRow;
  courses: Course[];
  visibleIds: Set<number>;
  conflictIds: Set<number>;
  advisories: Map<number, SectionAdvisory>;
  assignedSections: Map<number, string>;
  userSpecs: SpecId[];
  friendOverlays: FriendOverlay[];
  highlightIds?: Set<number>;
  commitmentsByDay: Map<string, Commitment[]>;
  onCommitmentClick?: (c: Commitment) => void;
  onCourseClick: (c: Course) => void;
}) {
  const blockCourses = courses
    .filter(c => c.timings && courseInBlock(c, blockInfo.start, blockInfo.end))
    .filter(c => visibleIds.has(c.id));

  const friendBlock = friendOverlays.map(o => ({
    overlay: o,
    courses: friendBlockCourses(o, blockInfo.start, blockInfo.end),
  }));

  const slots = getUniqueSlots(blockCourses, advisories, assignedSections, friendBlock);

  const week = weekCommitments(commitmentsByDay, blockInfo);

  const blockHeader = (
    <div className="flex items-center gap-3 mb-3 px-1">
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '4px 14px', borderRadius: 9999,
        backgroundColor: '#fff7ed', border: '1px solid #fdba74',
      }}>
        <span style={{ color: '#c2410c', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Block {blockInfo.block} · Week {blockInfo.weekNum}
        </span>
        <span style={{ color: '#ea580c', fontSize: 11 }}>{blockInfo.dates}</span>
      </div>
    </div>
  );

  if (slots.length === 0) {
    return (
      <div className="mb-6">
        {blockHeader}
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-green-200 bg-green-50 text-green-600 text-sm font-medium">
          {week.total === 0
            ? '🟢 Free week for you — no courses this week'
            : `🟢 No classes this week — but ${week.total} deadline${week.total === 1 ? '' : 's'} below`}
        </div>
        {week.total > 0 && (
          <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white print:overflow-visible">
            <table className="w-full border-collapse" style={{ minWidth: 560 }}>
              <tbody>
                <DeadlineRow perDay={week.perDay} onCommitmentClick={onCommitmentClick} />
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-8">
      {blockHeader}

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
                const isTodayCol = isSameUtcDay(d, todayUtc());

                return (
                  <th key={day}
                    data-today={isTodayCol ? 'true' : undefined}
                    className={`px-2 py-2 text-center border-r last:border-r-0 border-slate-600 ${
                      isTodayCol ? 'bg-orange-500 print:bg-slate-700' : i >= 5 ? 'bg-slate-800' : ''
                    }`}
                  >
                    {isTodayCol && (
                      <div className="text-[8px] font-black uppercase tracking-widest text-white bg-orange-700/60 rounded-sm px-1 mb-0.5 inline-block print:hidden">
                        Today
                      </div>
                    )}
                    <div className={`text-[11px] font-bold uppercase tracking-wider ${
                      isTodayCol ? 'text-white print:text-slate-200' : i >= 5 ? 'text-slate-400' : 'text-slate-200'
                    }`}>
                      {day}
                    </div>
                    <div className={`text-[9px] font-medium mt-0.5 ${
                      isTodayCol ? 'text-orange-100 print:text-slate-400' : i >= 5 ? 'text-slate-500' : 'text-slate-400'
                    }`}>
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
                  const dCol = new Date(blockInfo.start);
                  dCol.setUTCDate(dCol.getUTCDate() + di);
                  const isTodayCell = isSameUtcDay(dCol, todayUtc());
                  const dayCourses = blockCourses.filter(c =>
                    c.timings?.some(t => {
                      const effectiveDays = effectiveDaysFor(c, t, blockInfo.start, blockInfo.weekNum);
                      return t.slot === slot && effectiveDays.includes(day) && isTimingVisible(c.id, t, assignedSections, advisories);
                    })
                  );
                  return (
                    <td key={day}
                      className={`px-1.5 py-1.5 border-r last:border-r-0 border-gray-100 align-top ${
                        isTodayCell ? 'bg-orange-50 print:bg-transparent' : di >= 5 ? 'bg-gray-50/60' : ''
                      }`}
                      style={{ minWidth: 90 }}
                    >
                      {(() => {
                        const friendPills = friendBlock.flatMap(({ overlay, courses: fcs }) =>
                          fcs
                            .filter(c => friendMatchesSlotDay(overlay, c, slot, day, blockInfo.weekNum, blockInfo.start))
                            .map(c => {
                              const together = dayCourses.some(mc => mc.id === c.id);
                              const state: FriendCellState = together
                                ? 'together'
                                : dayCourses.length > 0 ? 'clash' : 'solo';
                              return (
                                <FriendCoursePill
                                  key={`${overlay.id}-${c.id}`}
                                  course={c}
                                  overlay={overlay}
                                  state={state}
                                  mySection={assignedSections.get(c.id)}
                                  onClick={() => onCourseClick(c)}
                                />
                              );
                            }),
                        );
                        if (dayCourses.length === 0 && friendPills.length === 0) return null;
                        return (
                          <div className="flex flex-col gap-1">
                            {dayCourses.map(c => {
                              const timing = c.timings!.find(t => {
                                const effectiveDays = effectiveDaysFor(c, t, blockInfo.start, blockInfo.weekNum);
                                return t.slot === slot && effectiveDays.includes(day) && isTimingVisible(c.id, t, assignedSections, advisories);
                              });
                              return (
                                <CoursePill
                                  key={c.id}
                                  course={c}
                                  room={timing?.room ?? ''}
                                  hasConflict={conflictIds.has(c.id)}
                                  sectionAdvisory={assignedSections.has(c.id) ? undefined : advisories.get(c.id)}
                                  confirmedSection={assignedSections.get(c.id)}
                                  userSpecs={userSpecs}
                                  searchState={searchStateFor(highlightIds, c.id)}
                                  printHidden={!!highlightIds && highlightIds.size > 0 && !highlightIds.has(c.id)}
                                  onClick={() => onCourseClick(c)}
                                />
                              );
                            })}
                            {friendPills}
                          </div>
                        );
                      })()}
                    </td>
                  );
                })}
              </tr>
            ))}
            {week.total > 0 && (
              <DeadlineRow perDay={week.perDay} onCommitmentClick={onCommitmentClick} />
            )}
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
    { label: 'Req. for Spec', color: '#dc2626' },
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
function CourseWeekList({ courses, visibleIds, userSpecs, friendOverlays, term, highlightIds, onCourseClick }: {
  courses: Course[];
  visibleIds: Set<number>;
  userSpecs: SpecId[];
  friendOverlays: FriendOverlay[];
  term: 4 | 5 | 6;
  highlightIds?: Set<number>;
  onCourseClick: (c: Course) => void;
}) {
  const visible = courses.filter(c => visibleIds.has(c.id));

  const friendTermCourses = friendOverlays.flatMap(o =>
    ALL_COURSES
      .filter(c => c.term === term && c.type !== 'exam' && c.type !== 'free' && o.selected.has(c.id))
      .map(c => ({ overlay: o, course: c })),
  );

  if (visible.length === 0 && friendTermCourses.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic px-1 mb-6">
        No courses selected for this term yet.
      </p>
    );
  }

  const weekNums = [...new Set([
    ...visible.map(c => c.week),
    ...friendTermCourses.map(fc => fc.course.week),
  ])].sort((a, b) => a - b);

  return (
    <div className="mb-8 space-y-3">
      {weekNums.map(wk => {
        const wkCourses = visible.filter(c => c.week === wk);
        const wkFriends = friendTermCourses.filter(fc => fc.course.week === wk);
        return (
          <div key={wk} className="flex gap-3">
            <div className="flex flex-col items-start min-w-[72px] pt-1 flex-shrink-0">
              <span className="text-xs font-bold text-gray-600">Wk {wk}</span>
              <span className="text-[10px] text-gray-400 leading-tight mt-0.5">
                {wkCourses[0]?.dates ?? wkFriends[0]?.course.dates}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
              {wkCourses.map(c => {
                const relevantMandatorySpecs = (c.mandatoryFor ?? []).filter(
                  s => userSpecs.length === 0 || userSpecs.includes(s)
                );
                const isMandatoryForUserSpec = relevantMandatorySpecs.length > 0;
                const accent = isMandatoryForUserSpec ? '#dc2626' : getCourseAccent(c);
                const searchState = searchStateFor(highlightIds, c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => onCourseClick(c)}
                    data-course-id={c.id}
                    data-search-hit={searchState === 'hit' ? 'true' : undefined}
                    className="rounded-xl border-2 px-3 py-2 text-left hover:shadow-md transition-all"
                    style={{
                      borderColor: isMandatoryForUserSpec ? '#dc2626aa' : c.type === 'waw' ? '#fbbf24' : accent + '44',
                      background: isMandatoryForUserSpec
                        ? `linear-gradient(135deg, #fee2e2 0%, #fff5f5 60%, ${getCourseAccent(c)}10 100%)`
                        : c.type === 'waw' ? WAW_GRADIENT : accent + '0d',
                      minWidth: 160,
                      boxShadow: searchState === 'hit'
                        ? `0 0 0 4px ${SEARCH_RING}33`
                        : isMandatoryForUserSpec
                        ? '0 2px 8px #dc262628'
                        : c.type === 'waw' ? '0 1px 4px rgba(251,191,36,0.3)' : undefined,
                      outline: searchState === 'hit' ? `2px solid ${SEARCH_RING}` : undefined,
                      opacity: searchState === 'miss' ? 0.25 : undefined,
                    }}
                  >
                    <div className="flex flex-wrap gap-1 mb-0.5">
                      {c.type === 'waw' && (
                        <span className="text-xs font-bold" style={{ color: '#d97706' }}>WaW</span>
                      )}
                      {c.type === 'mandatory' && (
                        <span className="text-xs font-bold" style={{ color: '#2563eb' }}>Required</span>
                      )}
                      {isMandatoryForUserSpec && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: '#dc262615', color: '#dc2626' }}>
                          Req. {relevantMandatorySpecs.join('/')}
                        </span>
                      )}
                      {!isMandatoryForUserSpec && c.type === 'elective' && c.code && (
                        <span className="text-xs font-bold" style={{ color: accent }}>{c.code}</span>
                      )}
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
              {wkFriends.map(({ overlay, course: c }) => (
                <button
                  key={`${overlay.id}-${c.id}`}
                  onClick={() => onCourseClick(c)}
                  className="rounded-xl border-2 border-dashed px-3 py-2 text-left hover:shadow-md transition-all"
                  style={{ borderColor: overlay.color, background: overlay.color + '10', minWidth: 160 }}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span
                      className="inline-flex items-center justify-center text-[8px] font-bold text-white rounded-sm px-1"
                      style={{ backgroundColor: overlay.color, minWidth: 14, height: 12 }}
                    >
                      {initialsOf(overlay.name)}
                    </span>
                    {c.code && (
                      <span className="text-xs font-bold" style={{ color: overlay.color }}>{c.code}</span>
                    )}
                    {overlay.sections?.get(c.id) && (
                      <span
                        className="text-[9px] font-semibold rounded-sm px-1 text-white"
                        style={{ backgroundColor: overlay.color }}
                      >
                        {overlay.sections.get(c.id)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-gray-800 leading-snug">{c.name}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: overlay.color }}>{overlay.name}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Non-teaching notice strip (exam week, placements week, term break). */
function NoticeBanner({ label, tone }: { label: string; tone: 'exam' | 'break' }) {
  const style = tone === 'exam'
    ? { border: '1px dashed #fca5a5', backgroundColor: '#fff5f5', color: '#ef4444', icon: '📝' }
    : { border: '1px dashed #93c5fd', backgroundColor: '#eff6ff', color: '#3b82f6', icon: '🗓' };
  return (
    <div style={{
      marginBottom: 16, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 500,
      border: style.border, backgroundColor: style.backgroundColor, color: style.color,
    }}>
      {style.icon} {label}
    </div>
  );
}

/**
 * One term's block-by-block schedule grid. Term 4 additionally offers the Term 1 retake
 * overlay; every other term renders the same tables, banners and controls.
 */
function TermBlockGrid({
  term, courses, visibleIds, conflictIds, advisories, assignedSections, userSpecs,
  friendOverlays, highlightIds, searchActive, commitmentsByDay, onCommitmentClick, onCourseClick,
}: {
  term: number;
  courses: Course[];
  visibleIds: Set<number>;
  conflictIds: Set<number>;
  advisories: Map<number, SectionAdvisory>;
  assignedSections: Map<number, string>;
  userSpecs: SpecId[];
  friendOverlays: FriendOverlay[];
  highlightIds?: Set<number>;
  searchActive: boolean;
  commitmentsByDay: Map<string, Commitment[]>;
  onCommitmentClick?: (c: Commitment) => void;
  onCourseClick: (c: Course) => void;
}) {
  const schedule = SCHEDULE_BY_TERM[term];
  const blocks = schedule.blocks;
  const supportsTerm1 = term === 4;

  const [showTerm1, setShowTerm1] = useState(false);
  const [showAllBlocks, setShowAllBlocks] = useState(false);
  const startIdx = showAllBlocks ? 0 : currentBlockStartIndex(blocks);

  // A term with no selected courses but a tracked deadline in it still has
  // something to show — dropping to "No courses selected" would hide the very
  // date the student came to check.
  const hasContent =
    blocks.some(b => courses.some(c => c.timings && courseInBlock(c, b.start, b.end) && visibleIds.has(c.id)))
    || friendOverlays.some(o => blocks.some(b => friendBlockCourses(o, b.start, b.end).length > 0))
    || blocks.some(b => weekCommitments(commitmentsByDay, b).total > 0);

  const todayTs = todayUtc().getTime();
  const todayInTerm = blocks.some(b => parseTs(b.start) <= todayTs && todayTs <= parseTs(b.end));

  const table = (b: BlockRow) => (
    <BlockTable
      blockInfo={b}
      courses={courses}
      visibleIds={visibleIds}
      conflictIds={conflictIds}
      advisories={advisories}
      assignedSections={assignedSections}
      userSpecs={userSpecs}
      friendOverlays={friendOverlays}
      highlightIds={highlightIds}
      commitmentsByDay={commitmentsByDay}
      onCommitmentClick={onCommitmentClick}
      onCourseClick={onCourseClick}
    />
  );

  return (
    <>
      <TermDivider label={schedule.label} dateRange={schedule.dateRange} />

      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {supportsTerm1 && (
          <>
            <button
              onClick={() => setShowTerm1(v => !v)}
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
                Reference only — for students retaking Term 1 subjects alongside Term 4
              </span>
            )}
          </>
        )}
        <button
          onClick={() => setShowAllBlocks(v => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
            border: showAllBlocks ? '1.5px solid #6366f1' : '1.5px solid #d1d5db',
            backgroundColor: showAllBlocks ? '#eef2ff' : '#ffffff',
            color: showAllBlocks ? '#4338ca' : '#6b7280',
            fontSize: 12, fontWeight: 600,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <CalendarDays size={13} />
          {showAllBlocks ? '✓ Show all blocks' : 'Show all blocks'}
        </button>
        {showAllBlocks && (
          <span style={{ fontSize: 11, color: '#6b7280' }}>
            Including past blocks
          </span>
        )}
        <button
          onClick={() => {
            const el = document.querySelector(`[data-current-block="${term}"]`)
              ?? document.querySelector('[data-today="true"]');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          disabled={!todayInTerm}
          title={todayInTerm ? 'Scroll to today' : `Today isn't inside ${schedule.label}`}
          className="print:hidden"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 20,
            cursor: todayInTerm ? 'pointer' : 'not-allowed',
            border: '1.5px solid #f97316',
            backgroundColor: todayInTerm ? '#fff7ed' : '#f9fafb',
            color: todayInTerm ? '#c2410c' : '#9ca3af',
            fontSize: 12, fontWeight: 600,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            opacity: todayInTerm ? 1 : 0.6,
          }}
        >
          <CalendarCheck size={13} />
          Today
        </button>
      </div>

      {!hasContent ? (
        <p className="text-sm text-gray-400 italic px-1 mb-8">No {schedule.label} courses selected.</p>
      ) : (
        <>
          {blocks.map((b, i) => {
            if (i < startIdx) return null;
            const blockHasSearchHit = searchActive
              ? courses.some(c => highlightIds!.has(c.id) && c.timings && courseInBlock(c, b.start, b.end) && visibleIds.has(c.id))
              : true;
            const blockPrintHiddenClass = searchActive && !blockHasSearchHit ? 'print:hidden' : '';
            const isCurrentBlockWeek = parseTs(b.start) <= todayTs && todayTs <= parseTs(b.end);
            return (
              <div
                key={`${b.block}-${b.weekNum}`}
                className={blockPrintHiddenClass}
                data-current-block={isCurrentBlockWeek ? String(term) : undefined}
                // The tour spotlights ONE block-week, not the whole tab: a cutout
                // the size of the viewport dims nothing and points at nothing.
                data-tour={i === startIdx ? 'timetable' : undefined}
              >
                {b.banners?.map((n, ni) => (
                  supportsTerm1 && showTerm1 && n.withTerm1Gantt ? (
                    <div key={ni} className="flex flex-col lg:flex-row mb-3 rounded-lg overflow-hidden" style={{ border: '1px dashed #fca5a5' }}>
                      <div style={{ flex: '1 1 auto', minWidth: 0, padding: '8px 14px', backgroundColor: '#fff5f5', color: '#ef4444', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                        📝 Term 4 {n.label}
                      </div>
                      <div className="lg:hidden h-px flex-shrink-0" style={{ backgroundColor: '#c7d2fe' }} />
                      <div className="hidden lg:block flex-shrink-0" style={{ width: 2, backgroundColor: '#c7d2fe' }} />
                      <div className="w-full lg:w-[300px] lg:flex-shrink-0">
                        <Term1GanttPanel activeWeekIndices={[8]} />
                      </div>
                    </div>
                  ) : (
                    <NoticeBanner key={ni} label={n.label} tone={n.tone} />
                  )
                ))}
                {supportsTerm1 && showTerm1 ? (
                  <div className="flex flex-col lg:flex-row mb-6 lg:mb-8 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>{table(b)}</div>
                    <div className={`lg:hidden h-px flex-shrink-0${searchActive ? ' print:hidden' : ''}`} style={{ backgroundColor: '#c7d2fe' }} />
                    <div className={`hidden lg:block flex-shrink-0${searchActive ? ' print:hidden' : ''}`} style={{ width: 2, backgroundColor: '#c7d2fe' }} />
                    <div className={`w-full lg:w-[300px] lg:flex-shrink-0${searchActive ? ' print:hidden' : ''}`}>
                      <Term1GanttPanel activeWeekIndices={[TERM4_TO_TERM1_WEEK_IDX[i]]} />
                    </div>
                  </div>
                ) : (
                  table(b)
                )}
              </div>
            );
          })}

          {schedule.trailing?.map((n, i) => (
            <NoticeBanner key={i} label={n.label} tone={n.tone} />
          ))}

          {/* Term 1 Week 14 — runs one week after Term 4 ends */}
          {supportsTerm1 && showTerm1 && (
            <div className="flex flex-col lg:flex-row mb-2 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <div style={{ flex: '1 1 auto', minWidth: 0, padding: '16px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>Term 4 has ended — Term 1 continues</span>
              </div>
              <div className="lg:hidden h-px flex-shrink-0" style={{ backgroundColor: '#c7d2fe' }} />
              <div className="hidden lg:block flex-shrink-0" style={{ width: 2, backgroundColor: '#c7d2fe' }} />
              <div className="w-full lg:w-[300px] lg:flex-shrink-0">
                <Term1GanttPanel activeWeekIndices={[13]} />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

export function TimetableView({
  selected, visibleIds, userSpecs, onCourseClick, selectedTerms,
  friendOverlays = [], friends = [], overlayIds, onToggleOverlay, trackEvent,
  courseSections, highlightIds, commitments = [], onCommitmentClick,
}: Props) {
  const searchActive = !!highlightIds && highlightIds.size > 0;

  // Bring the first search hit into view once the grid has rendered with it.
  const highlightSig = highlightIds ? [...highlightIds].sort((a, b) => a - b).join(',') : '';
  useEffect(() => {
    if (!highlightSig) return;
    const id = requestAnimationFrame(() => {
      document
        .querySelector('[data-search-hit="true"]')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [highlightSig]);

  const term4 = ALL_COURSES.filter(c => c.term === 4 && c.type !== 'exam' && c.type !== 'free');
  const term5 = ALL_COURSES.filter(c => c.term === 5 && c.type !== 'exam' && c.type !== 'free');
  const term6 = ALL_COURSES.filter(c => c.term === 6 && c.type !== 'exam' && c.type !== 'free');

  const allVisible = ALL_COURSES.filter(c => visibleIds.has(c.id));
  const conflictIds = getConflictIds(allVisible, visibleIds);
  const advisories = getSectionAdvisories(ALL_COURSES, visibleIds);
  const assignedSections = courseSections ?? new Map<number, string>();
  const commitmentsByDay = commitmentsByDate(commitments);

  const conflictCourses = allVisible.filter(c => conflictIds.has(c.id));

  // ── Friend overlay: time clashes ──────────────────────────
  const clashes = computeClashes(visibleIds, friendOverlays);
  const clashSig = clashes
    .map(c => `${c.friendId}|${c.block}|${c.week}|${c.slot}|${c.day}|${c.friendCourse}`)
    .join(';');
  const firedClashRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!trackEvent) return;
    for (const c of clashes) {
      const key = `${c.friendId}|${c.block}|${c.week}|${c.slot}|${c.day}|${c.friendCourse}`;
      if (firedClashRef.current.has(key)) continue;
      firedClashRef.current.add(key);
      trackEvent('friend_overlay_conflict_detected', {
        friend_id: c.friendId, block: c.block, week: c.week,
        slot: c.slot, day: c.day, my_course: c.myCourse, friend_course: c.friendCourse,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clashSig]);

  return (
    <div className="p-4 lg:p-6 min-h-screen print:min-h-0 print:p-0 print:bg-white" style={{ backgroundColor: '#f8fafc' }}>
      <SpecLegend />

      {/* Friend overlay toggles */}
      {friends.length > 0 && (
        <div className="mb-3 flex items-center gap-2 flex-wrap print:hidden">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Overlay friends:</span>
          {friends.map(f => {
            const on = overlayIds?.has(f.id) ?? false;
            const color = colorForFriend(f.id);
            return (
              <button
                key={f.id}
                onClick={() => onToggleOverlay?.(f)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
                style={on
                  ? { backgroundColor: color, borderColor: color, color: '#fff' }
                  : { backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#64748b' }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: on ? '#fff' : color }} />
                {f.name.split(' ')[0] || f.name}
                {on ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Friend legend (only when something is overlaid) */}
      {friendOverlays.length > 0 && (
        <div className="mb-3 flex items-center gap-x-4 gap-y-1 flex-wrap text-[11px] text-slate-500">
          <span className="font-semibold uppercase tracking-wide text-slate-400">Showing:</span>
          {friendOverlays.map(o => (
            <span key={o.id} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-0 border-t-2 border-dashed" style={{ borderColor: o.color }} />
              {o.name}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 text-amber-600">
            <AlertTriangle className="w-3 h-3" /> = same time as your class
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Users className="w-3 h-3" /> = same class as you
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <span className="text-[9px] font-semibold rounded-sm px-1 text-white bg-slate-500">A</span>
            = their section (filled when it differs from yours)
          </span>
        </div>
      )}

      {/* Friend time-clash banner */}
      {clashes.length > 0 && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs print:hidden">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">
              {clashes.length} time {clashes.length === 1 ? 'overlap' : 'overlaps'} with overlaid {clashes.length === 1 ? 'friend' : 'friends'}
            </span>
            {clashes.slice(0, 4).map((c, i) => (
              <span key={i}>
                {c.friendName}: <strong>{c.friendCourse}</strong> clashes with your <strong>{c.myCourse}</strong> ({c.day} {c.slot}, Block {c.block})
              </span>
            ))}
            {clashes.length > 4 && <span>…and {clashes.length - 4} more</span>}
          </div>
        </div>
      )}

      {/* Genuine conflict banner */}
      {conflictCourses.length > 0 && (
        <div className="mb-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-500" />
          <div>
            <span className="font-semibold">Schedule conflict: </span>
            {conflictCourses.map(c => c.code ?? c.name).join(' & ')} cannot be taken together — pick only one.
          </div>
        </div>
      )}

      {/* Section advisory banner */}
      {advisories.size > 0 && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Section assignment likely</span>
            {[...advisories.values()].map((a, i) => (
              <span key={i}>{a.message}</span>
            ))}
          </div>
        </div>
      )}

      <div className={selectedTerms.has(4) ? '' : 'print:hidden'}>
        <TermBlockGrid
          term={4}
          courses={term4}
          visibleIds={visibleIds}
          conflictIds={conflictIds}
          advisories={advisories}
          assignedSections={assignedSections}
          userSpecs={userSpecs}
          friendOverlays={friendOverlays}
          highlightIds={highlightIds}
          searchActive={searchActive}
          commitmentsByDay={commitmentsByDay}
          onCommitmentClick={onCommitmentClick}
          onCourseClick={onCourseClick}
        />
      </div>

      <div className={selectedTerms.has(5) ? '' : 'print:hidden'}>
        <TermBlockGrid
          term={5}
          courses={term5}
          visibleIds={visibleIds}
          conflictIds={conflictIds}
          advisories={advisories}
          assignedSections={assignedSections}
          userSpecs={userSpecs}
          friendOverlays={friendOverlays}
          highlightIds={highlightIds}
          searchActive={searchActive}
          commitmentsByDay={commitmentsByDay}
          onCommitmentClick={onCommitmentClick}
          onCourseClick={onCourseClick}
        />
      </div>

      <div className={selectedTerms.has(6) ? '' : 'print:hidden'}>
        <TermDivider label="Term 6" dateRange="Jan – Apr 2027" />
        <CourseWeekList courses={term6} visibleIds={visibleIds} userSpecs={userSpecs} friendOverlays={friendOverlays} term={6} highlightIds={highlightIds} onCourseClick={onCourseClick} />
      </div>
    </div>
  );
}
