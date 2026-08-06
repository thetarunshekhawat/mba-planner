'use client';

import { Check, Circle, Dot, HelpCircle, Zap } from 'lucide-react';
import type { CompetitionRound, RoundState } from '@/types';
import { roundState, chainProgress, orderedRounds } from '@/lib/alerts/progress';
import { formatIstDay, relativeIst } from '@/lib/alerts/time';

interface Props {
  rounds: CompetitionRound[];
  now?: Date;
  onRoundClick?: (round: CompetitionRound) => void;
}

const PIP: Record<RoundState, { cls: string; ring: string; label: string }> = {
  done:     { cls: 'bg-emerald-500 text-white', ring: 'ring-emerald-100', label: 'Done' },
  live:     { cls: 'bg-orange-500 text-white',  ring: 'ring-orange-100',  label: 'Live now' },
  upcoming: { cls: 'bg-slate-200 text-slate-500', ring: 'ring-slate-100', label: 'Upcoming' },
  // Deliberately its own state. A round with no dates must never render as a
  // green tick — that tells the student they have finished something they have
  // not, and they have no reason to doubt it.
  unknown:  { cls: 'bg-slate-100 text-slate-400', ring: 'ring-slate-100', label: 'Dates TBA' },
};

function StateIcon({ state }: { state: RoundState }) {
  if (state === 'done') return <Check className="w-3 h-3" strokeWidth={3} />;
  if (state === 'live') return <Zap className="w-3 h-3" fill="currentColor" />;
  if (state === 'unknown') return <HelpCircle className="w-3 h-3" />;
  return <Circle className="w-2 h-2" fill="currentColor" />;
}

/**
 * The round-by-round chain. It advances on its own as dates pass — nothing is
 * stored, every pip is derived from the round's dates against the clock.
 *
 * Two rounds can legitimately be `live` at the same time (Unstop competitions
 * overlap their windows — TGC 2026 runs three rounds that start before their
 * predecessor ends), so this renders a list of independent states rather than a
 * single moving cursor.
 */
export function RoundChain({ rounds, now = new Date(), onRoundClick }: Props) {
  const ordered = orderedRounds(rounds);
  if (ordered.length === 0) {
    return <p className="text-xs text-slate-400 italic">No rounds published yet.</p>;
  }

  const progress = chainProgress(rounds, now);

  return (
    <div className="space-y-3">
      {/* Progress reads done/total. Not index/total — with overlapping rounds
          an index would over-report and could even go backwards. */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <span className="text-[11px] font-semibold text-slate-500 tabular-nums shrink-0">
          {progress.done}/{progress.total} done
        </span>
      </div>

      <ol className="space-y-1.5">
        {ordered.map((r) => {
          const state = roundState(r, now);
          const style = PIP[state];
          const clickable = !!onRoundClick;
          return (
            <li key={r.id}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onRoundClick?.(r)}
                className={`w-full flex items-start gap-2.5 text-left rounded-lg px-2 py-1.5 -mx-2 transition-colors ${
                  clickable ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 w-5 h-5 rounded-full grid place-items-center ring-4 ${style.cls} ${style.ring}`}
                  title={style.label}
                >
                  <StateIcon state={state} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[13px] font-semibold ${state === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {r.title ?? `Round ${r.round_order}`}
                    </span>
                    {r.is_eliminator && (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-rose-50 text-rose-600">
                        Eliminator
                      </span>
                    )}
                    {state === 'live' && (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                        Live
                      </span>
                    )}
                  </span>

                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {r.starts_at || r.ends_at ? (
                      <>
                        {r.starts_at && formatIstDay(r.starts_at)}
                        {r.starts_at && r.ends_at && <Dot className="w-3 h-3 inline -mx-0.5" />}
                        {r.ends_at && `closes ${formatIstDay(r.ends_at)}`}
                        {state !== 'done' && r.ends_at && (
                          <span className="text-slate-400"> · {relativeIst(r.ends_at, now)}</span>
                        )}
                      </>
                    ) : (
                      <span className="italic text-slate-400">Dates to be announced</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
