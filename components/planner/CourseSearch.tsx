'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, CornerDownLeft } from 'lucide-react';
import { ALL_COURSES, SPECS } from '@/data/courses';
import { searchCourses, normalize } from '@/lib/courseSearch';
import type { Course, Friend } from '@/types';
import { colorForFriend } from '@/types';
import type { EventType } from '@/hooks/useAnalytics';

// Mirrors ViewMode in app/planner/page.tsx, which passes it straight in. The
// internal branches below only special-case 'friends', so 'alerts' falls
// through to the default course-search behaviour.
export type SearchViewMode = 'plan' | 'schedule' | 'friends' | 'alerts';

/** Chips + free text, owned by the planner page and shared with every view. */
export interface SearchState {
  courseIds: Set<number>;
  friendIds: Set<string>;
  text: string;
}

export const EMPTY_SEARCH: SearchState = {
  courseIds: new Set<number>(),
  friendIds: new Set<string>(),
  text: '',
};

export function isSearchActive(s: SearchState): boolean {
  return s.courseIds.size > 0 || s.friendIds.size > 0 || normalize(s.text).length > 0;
}

/** Short label for a chip — the official code where there is one, else a trimmed name. */
export function chipLabel(c: Course): string {
  if (c.code) return c.code;
  return c.name.length > 22 ? `${c.name.slice(0, 21)}…` : c.name;
}

type Suggestion =
  | { kind: 'course'; course: Course }
  | { kind: 'friend'; friend: Friend };

const BTN_CLASS =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all border border-white/10';

export function CourseSearch({
  viewMode,
  friends,
  boostIds,
  scheduleVisibleIds,
  value,
  onChange,
  onGoToPlan,
  trackEvent,
}: {
  viewMode: SearchViewMode;
  friends: Friend[];
  /** The student's own selections — floated to the top of suggestions. */
  boostIds: Set<number>;
  /** What the schedule grid can actually show, so we can warn about unselected hits. */
  scheduleVisibleIds: Set<number>;
  value: SearchState;
  onChange: (next: SearchState) => void;
  onGoToPlan: () => void;
  trackEvent: (type: EventType, payload?: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chips = useMemo(
    () => ALL_COURSES.filter((c) => value.courseIds.has(c.id)),
    [value.courseIds],
  );
  const friendChips = useMemo(
    () => friends.filter((f) => value.friendIds.has(f.id)),
    [friends, value.friendIds],
  );

  const courseHits = useMemo(
    () => searchCourses(value.text, { boostIds, limit: 8 })
      .filter((c) => !value.courseIds.has(c.id)),
    [value.text, boostIds, value.courseIds],
  );

  // Friends are only searchable on their own tab — elsewhere the box is purely courses.
  const friendHits = useMemo(() => {
    if (viewMode !== 'friends') return [];
    const q = normalize(value.text);
    if (!q) return [];
    return friends
      .filter((f) => {
        if (value.friendIds.has(f.id)) return false;
        if (normalize(f.name).includes(q)) return true;
        return SPECS.some(
          (s) => f.specializations.includes(s.id) &&
            (normalize(s.label).includes(q) || s.id.toLowerCase().startsWith(q)),
        );
      })
      .slice(0, 5);
  }, [viewMode, friends, value.text, value.friendIds]);

  const suggestions: Suggestion[] = useMemo(
    () => [
      ...friendHits.map((friend) => ({ kind: 'friend' as const, friend })),
      ...courseHits.map((course) => ({ kind: 'course' as const, course })),
    ],
    [friendHits, courseHits],
  );

  // Chipped courses the schedule grid can't render, because they aren't selected.
  const offScheduleChips = useMemo(
    () => (viewMode === 'schedule' ? chips.filter((c) => !scheduleVisibleIds.has(c.id)) : []),
    [viewMode, chips, scheduleVisibleIds],
  );

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // "/" opens search from anywhere, as long as the user isn't already typing somewhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      openPanel('hotkey');
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  function openPanel(source: 'button' | 'hotkey') {
    setOpen(true);
    trackEvent('search_opened', { view: viewMode, source });
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function setText(text: string) {
    onChange({ ...value, text });
    setActiveIndex(-1);
    if (normalize(text).length >= 2) trackEvent('search_query', { view: viewMode, length: text.length });
  }

  function pickCourse(course: Course) {
    const courseIds = new Set(value.courseIds);
    courseIds.add(course.id);
    onChange({ ...value, courseIds, text: '' });
    setActiveIndex(-1);
    trackEvent('search_chip_picked', { view: viewMode, kind: 'course', course_id: course.id, course_name: course.name });
    inputRef.current?.focus();
  }

  function pickFriend(friend: Friend) {
    const friendIds = new Set(value.friendIds);
    friendIds.add(friend.id);
    onChange({ ...value, friendIds, text: '' });
    setActiveIndex(-1);
    trackEvent('search_chip_picked', { view: viewMode, kind: 'friend', friend_id: friend.id });
    inputRef.current?.focus();
  }

  function accept(s: Suggestion) {
    if (s.kind === 'course') pickCourse(s.course);
    else pickFriend(s.friend);
  }

  function removeCourse(id: number) {
    const courseIds = new Set(value.courseIds);
    courseIds.delete(id);
    onChange({ ...value, courseIds });
    trackEvent('search_chip_removed', { view: viewMode, kind: 'course', course_id: id });
  }

  function removeFriend(id: string) {
    const friendIds = new Set(value.friendIds);
    friendIds.delete(id);
    onChange({ ...value, friendIds });
    trackEvent('search_chip_removed', { view: viewMode, kind: 'friend', friend_id: id });
  }

  function clearAll() {
    onChange({ courseIds: new Set(), friendIds: new Set(), text: '' });
    setActiveIndex(-1);
    trackEvent('search_cleared', { view: viewMode });
    inputRef.current?.focus();
  }

  /** Backspace on an empty box eats the last chip, newest first. */
  function popLastChip() {
    if (friendChips.length > 0) {
      removeFriend(friendChips[friendChips.length - 1].id);
      return;
    }
    if (chips.length > 0) removeCourse(chips[chips.length - 1].id);
  }

  const active = isSearchActive(value);
  const showEmpty = normalize(value.text).length >= 2 && suggestions.length === 0;

  // Report dead-end queries once they settle, so we can see what students expect to find.
  useEffect(() => {
    if (!showEmpty) return;
    const t = setTimeout(() => trackEvent('search_no_results', { view: viewMode, query: value.text }), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEmpty, value.text, viewMode]);

  const chipCount = chips.length + friendChips.length;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => (open ? setOpen(false) : openPanel('button'))}
        title="Search courses (press /)"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={active ? `${BTN_CLASS} !border-orange-500/50 !text-orange-300` : BTN_CLASS}
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Search</span>
        {chipCount > 0 && (
          <span className="ml-0.5 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {chipCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Search courses"
          className="absolute right-0 top-full mt-2 z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
        >
          {/* Chip row + input */}
          <div className="flex flex-wrap items-center gap-1.5 p-2.5">
            {friendChips.map((f) => (
              <span
                key={`f-${f.id}`}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-white"
                style={{ backgroundColor: colorForFriend(f.id) }}
              >
                {f.name.split(' ')[0]}
                <button onClick={() => removeFriend(f.id)} aria-label={`Remove ${f.name}`} className="opacity-70 hover:opacity-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {chips.map((c) => (
              <span
                key={c.id}
                title={c.name}
                className="inline-flex items-center gap-1 rounded-md bg-orange-500/20 border border-orange-500/40 px-1.5 py-1 text-[11px] font-semibold text-orange-200"
              >
                {chipLabel(c)}
                <button onClick={() => removeCourse(c.id)} aria-label={`Remove ${c.name}`} className="opacity-70 hover:opacity-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              value={value.text}
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls="planner-search-suggestions"
              aria-autocomplete="list"
              placeholder={
                chipCount > 0
                  ? 'Add another…'
                  : viewMode === 'friends'
                  ? 'Course or friend…'
                  : 'Course name or code…'
              }
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && value.text === '') {
                  popLastChip();
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setOpen(false);
                  return;
                }
                if (suggestions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIndex((i) => (i + 1) % suggestions.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
                } else if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  accept(suggestions[activeIndex >= 0 ? activeIndex : 0]);
                }
              }}
              className="min-w-[7rem] flex-1 bg-transparent px-1 py-1 text-sm text-white placeholder:text-slate-500 outline-none"
            />
            {active && (
              <button
                onClick={clearAll}
                className="text-[11px] font-semibold text-slate-400 hover:text-white px-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <ul
              id="planner-search-suggestions"
              role="listbox"
              aria-label="Search suggestions"
              className="max-h-64 overflow-y-auto border-t border-slate-800 py-1"
            >
              {friendHits.length > 0 && (
                <li className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Friends
                </li>
              )}
              {suggestions.map((s, i) => {
                const isCourse = s.kind === 'course';
                const firstCourse = isCourse && i === friendHits.length;
                return (
                  <li key={isCourse ? `c-${s.course.id}` : `f-${s.friend.id}`} role="option" aria-selected={i === activeIndex}>
                    {firstCourse && friendHits.length > 0 && (
                      <div className="px-3 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Courses
                      </div>
                    )}
                    <button
                      type="button"
                      // Keep the input focused so the click lands before blur closes anything.
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => accept(s)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                        i === activeIndex ? 'bg-slate-800' : 'hover:bg-slate-800/60'
                      }`}
                    >
                      {isCourse ? (
                        <>
                          <span className="shrink-0 rounded bg-slate-800 px-1 py-0.5 text-[10px] font-semibold tabular-nums text-slate-400">
                            {boostIds.has(s.course.id) ? `Wk ${s.course.week}` : `T${s.course.term}`}
                          </span>
                          <span className="flex-1 truncate font-medium text-slate-100">{s.course.name}</span>
                          {s.course.code && (
                            <span className="shrink-0 text-[10px] font-mono text-slate-500">{s.course.code}</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span
                            className="w-5 h-5 shrink-0 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                            style={{ backgroundColor: colorForFriend(s.friend.id) }}
                          >
                            {s.friend.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?'}
                          </span>
                          <span className="flex-1 truncate font-medium text-slate-100">{s.friend.name}</span>
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {showEmpty && (
            <div className="border-t border-slate-800 px-3 py-3 text-xs text-slate-500">
              No course matches “{value.text.trim()}”.
            </div>
          )}

          {/* On the schedule tab, a chip you haven't selected has nothing to highlight. */}
          {offScheduleChips.length > 0 && (
            <div className="border-t border-slate-800 px-3 py-2.5 text-xs text-slate-400">
              <span className="text-slate-300 font-semibold">{chipLabel(offScheduleChips[0])}</span>
              {offScheduleChips.length > 1 && ` +${offScheduleChips.length - 1} more`} isn&apos;t on your schedule.
              <button
                onClick={() => { onGoToPlan(); setOpen(false); }}
                className="ml-1.5 font-semibold text-orange-400 hover:text-orange-300"
              >
                Find it in Plan →
              </button>
            </div>
          )}

          {!active && !showEmpty && suggestions.length === 0 && (
            <div className="border-t border-slate-800 px-3 py-2.5 text-[11px] text-slate-500 flex items-center gap-1.5">
              Try a code like <span className="font-mono text-slate-400">AIBM</span> or a course name.
              <CornerDownLeft className="w-3 h-3 ml-auto" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
