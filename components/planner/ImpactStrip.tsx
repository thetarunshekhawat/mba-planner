'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Clock, Users, Sparkles, BellRing, MessageSquareText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ALL_COURSES } from '@/data/courses';
import type { EventType } from '@/hooks/useAnalytics';
import {
  HP_BOOKS, WORDS_PER_MINUTE, readingProgress, formatDuration, formatCount,
} from '@/lib/impact';

/**
 * What the demo account sees before it sees anything else.
 *
 * This sits at the top of the Plan tab for the demo login only, so a reviewer
 * lands on the numbers and the real product is one scroll below them. No tab
 * to find, no dashboard to navigate to.
 *
 * Every figure is read from ONE pre-computed row (`get_impact_snapshot`).
 * Nothing is aggregated here: the browser never sees a student row, and the
 * PostgREST 1000-row cap — which silently truncated the admin dashboard's
 * numbers before the Metrics work — cannot reach these.
 *
 * The strip scrolls away deliberately. It is a welcome, not a header; once a
 * reviewer starts reading the catalogue, the catalogue should own the screen.
 */

type WindowKey = 'all' | 'term4' | 'term5' | 'last30';

const WINDOWS: { key: WindowKey; label: string }[] = [
  { key: 'all',    label: 'All time' },
  { key: 'term4',  label: 'Term 4' },
  { key: 'term5',  label: 'Term 5' },
  { key: 'last30', label: 'Last 30 days' },
];

interface Snapshot {
  window: WindowKey;
  computed_at: string;
  students: number;
  cohort_size: number | null;
  registered: number | null;
  term4_planners: number | null;
  term5_planners: number | null;
  returners: number | null;
  total_seconds: number;
  median_seconds: number;
  courses_planned: number;
  reminders_sent: number;
  assistant_answers: number;
  top_course_id: number | null;
  session_cap_secs: number;
}

interface Props {
  trackEvent: (eventType: EventType, payload?: Record<string, unknown>) => void;
}

function courseName(id: number | null): string | null {
  if (id == null) return null;
  const c = ALL_COURSES.find(x => x.id === id);
  return c ? (c.code || c.name) : null;
}

function pct(part: number, whole: number | null | undefined): string | null {
  if (!whole) return null;
  return `${Math.round((part / whole) * 100)}%`;
}

/** The four headline figures, which differ by chip. */
function tilesFor(w: WindowKey, s: Snapshot): { label: string; value: string; sub?: string }[] {
  const share = pct(s.students, s.cohort_size);
  const top = courseName(s.top_course_id);

  if (w === 'all') {
    const returnRate = s.term4_planners ? pct(s.returners ?? 0, s.term4_planners) : null;
    return [
      { label: 'Students who planned', value: formatCount(s.students), sub: share ? `${share} of the class` : undefined },
      { label: 'Planned Term 4',       value: formatCount(s.term4_planners) },
      { label: 'Planned Term 5',       value: formatCount(s.term5_planners) },
      { label: 'Came back for both',   value: formatCount(s.returners), sub: returnRate ? `${returnRate} of Term 4 planners` : undefined },
    ];
  }

  const termLabel = w === 'term4' ? 'Term 4' : w === 'term5' ? 'Term 5' : null;

  return [
    {
      label: termLabel ? `Students who planned ${termLabel}` : 'Students active',
      value: formatCount(s.students),
      sub: share ? `${share} of the class` : undefined,
    },
    { label: 'Electives chosen',   value: formatCount(s.courses_planned) },
    { label: 'Most-planned course', value: top ?? '—' },
    { label: 'Registered on the planner', value: formatCount(s.registered) },
  ];
}

/**
 * Seven spines, filling left to right. The picture is the point.
 *
 * The shelf shows position within the CURRENT pass, not a filled-in block, so
 * a cohort three passes deep still gets a moving picture rather than seven
 * solid bars. Completed passes are counted in the ×N badge beside it.
 */
function Spines({ booksDone, fraction, loops }: { booksDone: number; fraction: number; loops: number }) {
  return (
    <div className="flex items-end gap-1" aria-hidden="true">
      {HP_BOOKS.map((b, i) => {
        const filled = i < booksDone;
        const partial = !filled && i === booksDone ? fraction : 0;
        // Taller spines for the longer books, so the row reads as a shelf.
        const height = 26 + Math.round((b.words / 257_045) * 22);
        return (
          <div
            key={b.short}
            title={`${b.short} — ${b.words.toLocaleString('en-IN')} words`}
            className="relative w-3 rounded-sm border border-amber-300/70 overflow-hidden bg-amber-50"
            style={{ height }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 bg-amber-400"
              style={{ height: filled ? '100%' : `${Math.round(partial * 100)}%` }}
            />
          </div>
        );
      })}
      {loops > 0 && (
        <span className="ml-1 self-center text-[11px] font-bold text-amber-700 tabular-nums">
          ×{loops + 1}
        </span>
      )}
    </div>
  );
}

export function ImpactStrip({ trackEvent }: Props) {
  const supabase = createClient();
  const [windowKey, setWindowKey] = useState<WindowKey>('all');
  // Cache per chip so switching back and forth is instant and costs one fetch each.
  const [cache, setCache] = useState<Partial<Record<WindowKey, Snapshot>>>({});
  const [failed, setFailed] = useState(false);

  const snapshot = cache[windowKey];

  useEffect(() => {
    if (cache[windowKey]) return;
    let cancelled = false;

    supabase
      .rpc('get_impact_snapshot', { p_window: windowKey })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) { setFailed(true); return; }
        setCache(prev => ({ ...prev, [windowKey]: data as Snapshot }));
      });

    return () => { cancelled = true; };
  }, [windowKey, cache, supabase]);

  useEffect(() => { trackEvent('impact_strip_shown'); }, [trackEvent]);

  // A snapshot that has never run should not leave a broken box on the page.
  // Say nothing rather than show zeros that read as "nobody uses this".
  if (failed) return null;

  const reading = snapshot ? readingProgress(snapshot.total_seconds) : null;
  const time = snapshot ? formatDuration(snapshot.total_seconds) : null;
  const median = snapshot ? formatDuration(snapshot.median_seconds) : null;

  return (
    <section
      aria-label="Cohort impact"
      className="mx-4 lg:mx-6 mt-4 mb-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      {/* Header + chips. Chips scroll sideways on a phone rather than wrapping
          into a second row and pushing the catalogue further down. */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-gray-800">What the cohort did with this planner</h2>
        </div>
        <div className="sm:ml-auto -mx-1 px-1 overflow-x-auto">
          <div role="group" aria-label="Time window" className="flex gap-1 w-max">
            {WINDOWS.map(w => {
              const active = w.key === windowKey;
              return (
                <button
                  key={w.key}
                  onClick={() => {
                    setWindowKey(w.key);
                    trackEvent('impact_window_changed', { window: w.key });
                  }}
                  aria-pressed={active}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'
                  }`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!snapshot ? (
        <div className="px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-4" aria-busy="true">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-7 w-16 rounded bg-gray-100 animate-pulse" />
              <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Four headline numbers. 2x2 on a phone so the catalogue stays
              roughly one thumb-length below the fold, not two screens down. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 px-4 py-4">
            {tilesFor(windowKey, snapshot).map(t => (
              <div key={t.label}>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none tabular-nums">
                  {t.value}
                </div>
                <div className="text-[11px] font-semibold text-gray-600 mt-1.5 leading-tight">{t.label}</div>
                {t.sub && <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{t.sub}</div>}
              </div>
            ))}
          </div>

          {/* Time on the planner, and what that time looks like in books. */}
          <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/60">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div className="flex items-baseline gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400 self-center" />
                <span className="text-2xl font-bold text-gray-900 tabular-nums">{time!.value}</span>
                <span className="text-xs font-semibold text-gray-500">{time!.unit} on the planner</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-gray-700 tabular-nums">{median!.value}</span>
                <span className="text-[11px] text-gray-500">{median!.unit} per student, typical</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <Spines booksDone={reading!.booksDone} fraction={reading!.fractionOfCurrent} loops={reading!.loops} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-amber-600 flex-shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    Same time, spent reading
                  </span>
                </div>
                <p className="text-xs text-gray-700 font-medium mt-0.5 leading-snug">{reading!.sentence}</p>
              </div>
            </div>
          </div>

          {/* What the planner absorbed. Load that did not land on the
              programme office, in units they recognise. */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
            <Tile icon={<BellRing className="w-3.5 h-3.5" />} value={formatCount(snapshot.reminders_sent)} label="Deadline reminders delivered" />
            <Tile icon={<MessageSquareText className="w-3.5 h-3.5" />} value={formatCount(snapshot.assistant_answers)} label="Questions answered by the assistant" />
            <Tile icon={<Users className="w-3.5 h-3.5" />} value={formatCount(snapshot.courses_planned)} label="Elective choices mapped out" />
          </div>

          {/* Say how it was measured, unprompted. A dean who has to ask has
              already started doubting the number. */}
          <p className="px-4 py-2 text-[10px] leading-relaxed text-gray-400 border-t border-gray-100">
            Updated daily{snapshot.computed_at ? ` · last ${new Date(snapshot.computed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}.
            Sessions are capped at {Math.round(snapshot.session_cap_secs / 60)} minutes each, so an
            idle tab cannot inflate the total. Reading time assumes {WORDS_PER_MINUTE} words per
            minute across the {HP_BOOKS.length} published books. Demo activity is excluded.
          </p>
        </>
      )}
    </section>
  );
}

function Tile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="flex items-center justify-center gap-1 text-gray-400">{icon}</div>
      <div className="text-lg font-bold text-gray-900 mt-1 tabular-nums">{value}</div>
      <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{label}</div>
    </div>
  );
}
