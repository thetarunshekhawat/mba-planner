'use client';

import { useState } from 'react';
import {
  Bell, BellOff, ExternalLink, Globe, Lock, Trophy, Users, X, Undo2, CalendarClock,
} from 'lucide-react';
import type { CompetitionRound, TrackedCompetition } from '@/types';
import { RoundChain } from './RoundChain';
import { EliminationGate } from './EliminationGate';
import { pendingEliminationRounds, eliminatedAtRound, nextMilestone } from '@/lib/alerts/progress';
import { formatIst, relativeIst } from '@/lib/alerts/time';

interface Props {
  item: TrackedCompetition;
  now?: Date;
  onTrack: () => void;
  onUntrack: () => void;
  onToggleNotifications: (enabled: boolean) => void;
  onOpenReminders: () => void;
  onOutcome: (round: CompetitionRound, cleared: boolean) => void;
  onUndoOutcome: (round: CompetitionRound) => void;
  onEliminationShown?: () => void;
  onRoundLinkClick?: (round: CompetitionRound) => void;
}

export function CompetitionCard({
  item, now = new Date(), onTrack, onUntrack, onToggleNotifications,
  onOpenReminders, onOutcome, onUndoOutcome, onEliminationShown, onRoundLinkClick,
}: Props) {
  const [logoBroken, setLogoBroken] = useState(false);
  const { competition: c, rounds, track, outcomes } = item;

  const pending = pendingEliminationRounds(rounds, outcomes, now);
  const eliminated = eliminatedAtRound(rounds, outcomes);
  const next = nextMilestone(rounds, now);
  const muted = track ? !track.notifications_enabled : false;

  const regnPassed = c.registration_deadline
    ? new Date(c.registration_deadline).getTime() < now.getTime()
    : false;

  return (
    <article
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${
        eliminated ? 'border-slate-200 opacity-60' : 'border-gray-200'
      }`}
    >
      {/* ── Header ────────────────────────────────────── */}
      <div className="p-4 flex items-start gap-3">
        {c.logo_url && !logoBroken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.logo_url}
            alt=""
            onError={() => setLogoBroken(true)}
            className="w-11 h-11 rounded-lg object-cover bg-slate-100 shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-slate-100 grid place-items-center shrink-0">
            <Trophy className="w-5 h-5 text-slate-400" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="text-sm font-bold text-slate-900 leading-snug flex-1 min-w-0">
              {c.public_url ? (
                <a
                  href={c.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-600 transition-colors inline-flex items-start gap-1"
                >
                  <span className="min-w-0">{c.title}</span>
                  <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                </a>
              ) : (
                c.title
              )}
            </h3>
            <span
              title={c.visibility === 'global' ? 'Shared with the whole cohort' : 'Only you can see this'}
              className="shrink-0 mt-0.5"
            >
              {c.visibility === 'global'
                ? <Globe className="w-3.5 h-3.5 text-slate-300" />
                : <Lock className="w-3.5 h-3.5 text-slate-300" />}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            {c.organiser && <span className="font-medium">{c.organiser}</span>}
            {c.min_team_size && c.max_team_size && (
              <span className="inline-flex items-center gap-0.5">
                <Users className="w-3 h-3" />
                {c.min_team_size === c.max_team_size
                  ? `Team of ${c.min_team_size}`
                  : `${c.min_team_size}–${c.max_team_size} per team`}
              </span>
            )}
          </p>

          {c.registration_deadline && (
            <p className={`text-[11px] mt-1 font-semibold ${regnPassed ? 'text-slate-400' : 'text-rose-600'}`}>
              {regnPassed ? 'Registration closed' : 'Register by'} {formatIst(c.registration_deadline)}
              {!regnPassed && (
                <span className="text-slate-400 font-normal"> · {relativeIst(c.registration_deadline, now)}</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ── Rounds ────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <RoundChain rounds={rounds} now={now} onRoundClick={onRoundLinkClick} />

        {/* Default is PASSED: this never blocks the chain above. */}
        {track && !eliminated && pending.map((r) => (
          <EliminationGate
            key={r.id}
            round={r}
            onShown={onEliminationShown}
            onAnswer={(cleared) => onOutcome(r, cleared)}
          />
        ))}

        {eliminated && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 p-2.5">
            <p className="text-[11px] text-slate-500 flex-1">
              You marked yourself out at{' '}
              <span className="font-semibold">{eliminated.title ?? `Round ${eliminated.round_order}`}</span>.
              Reminders are off for this one.
            </p>
            <button
              type="button"
              onClick={() => onUndoOutcome(eliminated)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 shrink-0"
            >
              <Undo2 className="w-3 h-3" />
              Undo
            </button>
          </div>
        )}

        {next && !eliminated && (
          <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
            <CalendarClock className="w-3 h-3 text-orange-500" />
            Next: {next.round.title ?? `Round ${next.round.round_order}`} {next.kind}{' '}
            {relativeIst(next.at, now)}
          </p>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────── */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap">
        {track ? (
          <>
            <button
              type="button"
              onClick={() => onToggleNotifications(muted)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                muted
                  ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              {muted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              {muted ? 'Muted' : 'Notifying'}
            </button>
            <button
              type="button"
              onClick={onOpenReminders}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold hover:bg-slate-100 transition-colors"
            >
              Reminders
            </button>
            <button
              type="button"
              onClick={onUntrack}
              className="ml-auto inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-400 text-[11px] font-semibold hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Stop tracking
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onTrack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-[11px] font-semibold hover:bg-orange-600 transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            Track this
          </button>
        )}
      </div>
    </article>
  );
}
