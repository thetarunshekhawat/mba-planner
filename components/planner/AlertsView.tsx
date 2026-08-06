'use client';

import { useMemo, useState } from 'react';
import {
  Bell, CalendarClock, CalendarPlus, Check, Plus, Trash2, Trophy, ExternalLink,
} from 'lucide-react';
import type { CompetitionRound, CustomDeadline, TrackedCompetition } from '@/types';
import type { EventType } from '@/hooks/useAnalytics';
import type { useAlerts } from '@/hooks/useAlerts';
import { CompetitionCard } from './CompetitionCard';
import { ReminderSheet } from './ReminderSheet';
import { AddCompetitionDialog } from './AddCompetitionDialog';
import { CustomDeadlineDialog } from './CustomDeadlineDialog';
import { NotificationSettings } from './NotificationSettings';
import { formatIst, relativeIst } from '@/lib/alerts/time';
import { nextMilestone } from '@/lib/alerts/progress';
import { courseDeadlineItems } from '@/lib/alerts/courseDeadlines';

interface Props {
  alerts: ReturnType<typeof useAlerts>;
  trackEvent: (type: EventType, payload?: Record<string, unknown>) => void;
  canPublish?: boolean;
  readOnly?: boolean;
  /** The student's selected course ids — Tier A dates are derived from these. */
  selectedCourseIds?: Set<number>;
  userId: string | null;
}

export function AlertsView({
  alerts, trackEvent, canPublish, readOnly, selectedCourseIds, userId,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [reminderFor, setReminderFor] = useState<TrackedCompetition | null>(null);
  const now = useMemo(() => new Date(), []);

  const { tracked, untracked, deadlines, loading } = alerts;
  const openDeadlines = deadlines.filter((d) => !d.completed_at);

  // "Due soon" merges competition milestones and manual deadlines into one
  // chronological list — the student cares about the next thing, not which
  // system it came from.
  const dueSoon = useMemo(() => {
    const rows: { key: string; at: string; label: string; sub: string; url: string | null }[] = [];
    for (const t of tracked) {
      if (t.track?.status === 'eliminated') continue;
      if (t.competition.registration_deadline &&
          new Date(t.competition.registration_deadline).getTime() > now.getTime()) {
        rows.push({
          key: `regn-${t.competition.id}`,
          at: t.competition.registration_deadline,
          label: 'Registration closes',
          sub: t.competition.title,
          url: t.competition.public_url,
        });
      }
      const next = nextMilestone(t.rounds, now);
      if (next) {
        rows.push({
          key: `round-${next.round.id}`,
          at: next.at,
          label: `${next.round.title ?? `Round ${next.round.round_order}`} ${next.kind}`,
          sub: t.competition.title,
          url: next.round.public_url ?? t.competition.public_url,
        });
      }
    }
    for (const d of openDeadlines) {
      if (new Date(d.due_at).getTime() < now.getTime()) continue;
      rows.push({ key: `dl-${d.id}`, at: d.due_at, label: d.title, sub: 'Your deadline', url: d.url });
    }
    // Tier A course dates — derived from the catalogue, so they roll over on
    // their own when a new term lands and never mention a finished course.
    for (const c of courseDeadlineItems(selectedCourseIds ?? new Set(), now)) {
      rows.push({ key: c.id, at: c.dueAt, label: `${c.title} — ${c.body}`, sub: 'Your courses', url: c.url });
    }
    return rows.sort((a, b) => a.at.localeCompare(b.at)).slice(0, 6);
  }, [tracked, openDeadlines, selectedCourseIds, now]);

  function handleOutcome(item: TrackedCompetition, round: CompetitionRound, cleared: boolean) {
    if (!item.track) return;
    alerts.recordOutcome(round.id, cleared, item.track.id);
  }

  return (
    <div className="p-4 lg:p-6 min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      <div className="mx-auto max-w-2xl space-y-6">

        {/* ── Header actions ───────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Alerts</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Track case competitions and deadlines. Rounds tick over on their own as dates pass.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setAddOpen(true); trackEvent('alert_competition_add_opened'); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add competition
            </button>
            <button
              onClick={() => { setDeadlineOpen(true); trackEvent('alert_custom_deadline_opened'); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              <CalendarPlus className="w-4 h-4" />
              Add deadline
            </button>
          </div>
          {readOnly && (
            <p className="mt-3 text-[11px] text-slate-400">
              This is a read-only demo — changes here won&apos;t be saved.
            </p>
          )}
        </section>

        <NotificationSettings userId={userId} trackEvent={trackEvent} readOnly={readOnly} />

        {/* ── Due soon ─────────────────────────────────── */}
        {dueSoon.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Due soon</h2>
            </div>
            <ul className="space-y-2">
              {dueSoon.map((row) => (
                <li key={row.key} className="flex items-baseline gap-2 text-[13px]">
                  <span className="w-20 shrink-0 text-[11px] font-semibold text-orange-600 tabular-nums">
                    {relativeIst(row.at, now)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-800">{row.label}</span>
                    <span className="block text-[11px] text-slate-400 truncate">
                      {row.sub} · {formatIst(row.at)}
                    </span>
                  </span>
                  {row.url && (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-slate-300 hover:text-orange-500"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Tracked competitions ─────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide px-1">
            Tracking {tracked.length > 0 && <span className="text-slate-400">({tracked.length})</span>}
          </h2>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-slate-400">
              Loading…
            </div>
          ) : tracked.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
              <Trophy className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nothing tracked yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Add an Unstop competition and we&apos;ll follow every round for you.
              </p>
            </div>
          ) : (
            tracked.map((item) => (
              <CompetitionCard
                key={item.competition.id}
                item={item}
                now={now}
                onTrack={() => alerts.trackCompetition(item.competition.id)}
                onUntrack={() => item.track && alerts.untrackCompetition(item.track.id)}
                onToggleNotifications={(enabled) =>
                  item.track && alerts.setNotifications(item.track.id, enabled)}
                onOpenReminders={() => {
                  setReminderFor(item);
                  trackEvent('alert_reminder_sheet_opened', { competition_id: item.competition.id });
                }}
                onOutcome={(round, cleared) => handleOutcome(item, round, cleared)}
                onUndoOutcome={(round) => item.track && alerts.undoOutcome(round.id, item.track.id)}
                onEliminationShown={() =>
                  trackEvent('alert_elimination_prompt_shown', { competition_id: item.competition.id })}
                onRoundLinkClick={(round) =>
                  trackEvent('alert_round_expanded', { round_id: round.id })}
              />
            ))
          )}
        </section>

        {/* ── Available to track ───────────────────────── */}
        {untracked.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide px-1">
              Also happening
            </h2>
            {untracked.map((item) => (
              <CompetitionCard
                key={item.competition.id}
                item={item}
                now={now}
                onTrack={() => alerts.trackCompetition(item.competition.id)}
                onUntrack={() => {}}
                onToggleNotifications={() => {}}
                onOpenReminders={() => setReminderFor(item)}
                onOutcome={() => {}}
                onUndoOutcome={() => {}}
              />
            ))}
          </section>
        )}

        {/* ── Manual deadlines ─────────────────────────── */}
        {openDeadlines.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarPlus className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Your deadlines</h2>
            </div>
            <ul className="space-y-2">
              {openDeadlines.map((d: CustomDeadline) => (
                <li key={d.id} className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => alerts.completeDeadline(d.id)}
                    className="mt-0.5 w-4 h-4 rounded border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 grid place-items-center shrink-0 transition-colors"
                    aria-label="Mark done"
                  >
                    <Check className="w-2.5 h-2.5 text-transparent hover:text-emerald-500" />
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className="text-[13px] font-semibold text-slate-800 block">{d.title}</span>
                    <span className="text-[11px] text-slate-400">
                      {formatIst(d.due_at)} · {relativeIst(d.due_at, now)}
                    </span>
                    {d.notes && <span className="block text-[11px] text-slate-500 mt-0.5">{d.notes}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => alerts.deleteDeadline(d.id)}
                    className="text-slate-300 hover:text-rose-500 shrink-0"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <AddCompetitionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        canPublish={canPublish}
        onSubmit={(url, publish) => alerts.importUnstop(url, publish)}
      />
      <CustomDeadlineDialog
        open={deadlineOpen}
        onOpenChange={setDeadlineOpen}
        onSubmit={(input) => alerts.addDeadline(input)}
      />
      {reminderFor && reminderFor.track && (
        <ReminderSheet
          open={!!reminderFor}
          onOpenChange={(o) => !o && setReminderFor(null)}
          item={reminderFor}
          readOnly={readOnly}
          onToggleOffset={(anchor, roundId, minutes, enabled, isDefault) =>
            alerts.setOffsetEnabled(reminderFor.track!.id, anchor, roundId, minutes, enabled, isDefault)}
          onAddAbsolute={(anchor, roundId, at) =>
            alerts.addAbsoluteReminder(reminderFor.track!.id, anchor, roundId, at)}
          onRemoveRule={(ruleId) => alerts.removeRule(ruleId)}
        />
      )}
    </div>
  );
}
