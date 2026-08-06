'use client';

import { useMemo, useState } from 'react';
import { Bell, CalendarPlus, Trash2 } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import type { AlertReminderRule, CompetitionRound, TrackedCompetition } from '@/types';
import {
  DEFAULT_OFFSETS, REGISTRATION_OFFSETS, ROUND_END_OFFSETS,
  previewSchedule, type Offset,
} from '@/lib/alerts/schedule';
import { orderedRounds, roundState } from '@/lib/alerts/progress';
import { formatIst, istToInstant } from '@/lib/alerts/time';
import { campusToday } from '@/lib/terms';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TrackedCompetition;
  onToggleOffset: (
    anchor: AlertReminderRule['anchor'], roundId: string | null,
    offsetMinutes: number, enabled: boolean, isDefault: boolean,
  ) => void;
  onAddAbsolute: (anchor: AlertReminderRule['anchor'], roundId: string | null, at: string) => void;
  onRemoveRule: (ruleId: string) => void;
  readOnly?: boolean;
}

const LABELS: Record<string, string> = {
  'T-7d': '7 days before',
  'T-2d': '2 days before',
  'T-1d': '1 day before',
  'T-3h': '3 hours before',
  'T-0': 'When it happens',
};

function label(o: Offset): string {
  return LABELS[o.code] ?? `${o.minutes} min before`;
}

/**
 * Per-competition reminder settings.
 *
 * Everything here reads its offsets from lib/alerts/schedule.ts — the same
 * module the dispatcher runs — so the "you'll be reminded on…" preview below
 * cannot promise something that never fires. If you are tempted to hardcode an
 * offset list in this file, that is precisely the bug it is avoiding.
 */
export function ReminderSheet({
  open, onOpenChange, item, onToggleOffset, onAddAbsolute, onRemoveRule, readOnly,
}: Props) {
  const [absDate, setAbsDate] = useState(campusToday());
  const [absTime, setAbsTime] = useState('09:00');
  const [absTarget, setAbsTarget] = useState<string>('registration_deadline');

  const { competition, rounds, rules } = item;
  const now = new Date();
  const liveRounds = useMemo(
    () => orderedRounds(rounds).filter((r) => roundState(r, now) !== 'done'),
    [rounds],
  );

  function rulesFor(anchor: AlertReminderRule['anchor'], roundId: string | null) {
    return rules.filter((r) => r.anchor === anchor && (r.round_id ?? null) === roundId);
  }

  function isOn(anchor: AlertReminderRule['anchor'], roundId: string | null, o: Offset): boolean {
    const rule = rulesFor(anchor, roundId).find(
      (r) => r.mode === 'offset' && r.offset_minutes === o.minutes,
    );
    // No row means "on the default" — rules are sparse overrides, so absence is
    // the common case, not an error.
    return rule ? rule.enabled : true;
  }

  function OffsetRow({
    anchor, roundId, offsets, anchorAt,
  }: {
    anchor: AlertReminderRule['anchor'];
    roundId: string | null;
    offsets: readonly Offset[];
    anchorAt: string | null;
  }) {
    const applicable = rulesFor(anchor, roundId);
    const preview = anchorAt ? previewSchedule(anchorAt, offsets, applicable, now) : [];
    const absolutes = applicable.filter((r) => r.mode === 'absolute');

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {offsets.map((o) => {
            const on = isOn(anchor, roundId, o);
            return (
              <button
                key={o.code}
                type="button"
                disabled={readOnly}
                onClick={() => onToggleOffset(anchor, roundId, o.minutes, !on, true)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                  on
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {label(o)}
              </button>
            );
          })}
        </div>

        {absolutes.length > 0 && (
          <ul className="space-y-1">
            {absolutes.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-[11px] text-slate-600">
                <CalendarPlus className="w-3 h-3 text-orange-500 shrink-0" />
                <span className="flex-1">{r.absolute_at && formatIst(r.absolute_at)}</span>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => onRemoveRule(r.id)}
                  className="text-slate-400 hover:text-rose-500 disabled:opacity-50"
                  aria-label="Remove reminder"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {preview.length > 0 ? (
          <p className="text-[11px] text-slate-400">
            Next: {formatIst(preview[0].at)}
            {preview.length > 1 && ` (+${preview.length - 1} more)`}
          </p>
        ) : (
          <p className="text-[11px] text-slate-400 italic">No reminders left for this date.</p>
        )}
      </div>
    );
  }

  function handleAddAbsolute() {
    const roundId = absTarget.startsWith('round:') ? absTarget.slice(6) : null;
    const anchor: AlertReminderRule['anchor'] = roundId ? 'round_end' : 'registration_deadline';
    // Converted from IST to an absolute instant once, here at write time —
    // the student means 09:00 in Kolkata, not 09:00 wherever the server is.
    onAddAbsolute(anchor, roundId, istToInstant(absDate, absTime));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" />
            Reminders
          </SheetTitle>
          <SheetDescription>{competition.title}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-5">
          {competition.registration_deadline && (
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                Registration deadline
              </h3>
              <p className="text-[11px] text-slate-400 mb-2">
                {formatIst(competition.registration_deadline)}
              </p>
              <OffsetRow
                anchor="registration_deadline"
                roundId={null}
                offsets={REGISTRATION_OFFSETS}
                anchorAt={competition.registration_deadline}
              />
            </section>
          )}

          {liveRounds.map((r: CompetitionRound) => (
            <section key={r.id}>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                {r.title ?? `Round ${r.round_order}`}
              </h3>
              {r.ends_at ? (
                <>
                  <p className="text-[11px] text-slate-400 mb-2">Closes {formatIst(r.ends_at)}</p>
                  <OffsetRow
                    anchor="round_end"
                    roundId={r.id}
                    offsets={ROUND_END_OFFSETS}
                    anchorAt={r.ends_at}
                  />
                </>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  No closing date published, so there is nothing to count down to yet.
                </p>
              )}
            </section>
          ))}

          {/* ── A specific date and time ─────────────────── */}
          <section className="pt-4 border-t border-slate-100">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
              Remind me on a specific date
            </h3>
            <div className="space-y-2">
              <select
                value={absTarget}
                onChange={(e) => setAbsTarget(e.target.value)}
                className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="registration_deadline">About registration</option>
                {liveRounds.map((r) => (
                  <option key={r.id} value={`round:${r.id}`}>
                    About {r.title ?? `Round ${r.round_order}`}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={absDate}
                  onChange={(e) => setAbsDate(e.target.value)}
                  className="flex-1 text-[13px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <input
                  type="time"
                  value={absTime}
                  onChange={(e) => setAbsTime(e.target.value)}
                  className="w-28 text-[13px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <button
                type="button"
                disabled={readOnly}
                onClick={handleAddAbsolute}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                Add reminder
              </button>
              <p className="text-[10px] text-slate-400">All times are IST.</p>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { DEFAULT_OFFSETS };
