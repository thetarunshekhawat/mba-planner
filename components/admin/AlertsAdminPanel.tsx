'use client';

// The admin "Alerts" tab: who tracks what, whether push actually reaches them,
// and whether the dispatcher is running.
//
// ── Term filter: deliberately not honoured ─────────────────────────────────
// The dashboard-wide term filter narrows every course-scoped figure. This panel
// opts out, the same way the acquisition funnel does, because competitions are
// not course-scoped — they have no course_id and therefore no term. Applying
// the filter here would silently return nothing whenever a term is selected,
// which reads as "no one uses Alerts" rather than "this question doesn't apply".
// The one exception is the course-deadline reach figure, which does resolve to
// courses and so is labelled as such.
//
// Every fetch pages through fetchAllRows. user_events is ~16k rows and PostgREST
// silently caps at 1000 — see lib/alerts/paging.ts.

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/alerts/paging';
import { roundState, nextMilestone } from '@/lib/alerts/progress';
import { formatIst } from '@/lib/alerts/time';
import type {
  AlertDelivery, AlertReminderRule, AlertRoundOutcome, AlertTrack,
  Competition, CompetitionRequest, CompetitionRequestStatus, CompetitionRound,
  CustomDeadline, Profile, PushSubscriptionRow,
} from '@/types';
import {
  Bell, BellOff, Check, ExternalLink, Globe, Inbox, Loader2, Lock, Smartphone,
  TriangleAlert, Undo2, Users, X,
} from 'lucide-react';

interface Props {
  profiles: Profile[];
  onViewMember?: (userId: string) => void;
}

/** Rough browser/OS from a UA string — enough to spot "iPhones aren't subscribing". */
function describeAgent(ua: string | null): string {
  if (!ua) return 'Unknown';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'macOS';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Other';
}

export function AlertsAdminPanel({ profiles, onViewMember }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [rounds, setRounds] = useState<CompetitionRound[]>([]);
  const [tracks, setTracks] = useState<AlertTrack[]>([]);
  const [rules, setRules] = useState<AlertReminderRule[]>([]);
  const [outcomes, setOutcomes] = useState<AlertRoundOutcome[]>([]);
  const [deadlines, setDeadlines] = useState<CustomDeadline[]>([]);
  const [subs, setSubs] = useState<PushSubscriptionRow[]>([]);
  const [deliveries, setDeliveries] = useState<AlertDelivery[]>([]);
  // Requests do NOT come from `supabase` like everything else: the table's RLS
  // SELECT policy is `user_id = auth.uid()` with no admin policy, so a direct
  // read here would silently return only this admin's own asks. The route uses
  // the service-role client behind an isAdminEmail() gate. See migration 020.
  const [requests, setRequests] = useState<CompetitionRequest[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [c, r, t, rl, o, d, s, dl] = await Promise.all([
        fetchAllRows<Competition>(() => supabase.from('competitions').select('*').order('id')),
        fetchAllRows<CompetitionRound>(() => supabase.from('competition_rounds').select('*').order('id')),
        fetchAllRows<AlertTrack>(() => supabase.from('alert_tracks').select('*').order('id')),
        fetchAllRows<AlertReminderRule>(() => supabase.from('alert_reminder_rules').select('*').order('id')),
        fetchAllRows<AlertRoundOutcome>(() => supabase.from('alert_round_outcomes').select('*').order('id')),
        fetchAllRows<CustomDeadline>(() => supabase.from('custom_deadlines').select('*').order('id')),
        fetchAllRows<PushSubscriptionRow>(() => supabase.from('push_subscriptions').select('*').order('id')),
        fetchAllRows<AlertDelivery>(() => supabase.from('alert_deliveries').select('*').order('created_at', { ascending: false })),
      ]);
      setCompetitions(c); setRounds(r); setTracks(t); setRules(rl);
      setOutcomes(o); setDeadlines(d); setSubs(s); setDeliveries(dl);

      try {
        const res = await fetch('/api/alerts/requests');
        if (res.ok) setRequests((await res.json()).requests ?? []);
      } catch {
        // A failed queue fetch must not blank the rest of the tab.
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading alerts data…</div>;
  }

  const nameOf = (id: string) =>
    profiles.find((p) => p.id === id)?.name || profiles.find((p) => p.id === id)?.email || id.slice(0, 8);
  const emailOf = (id: string) => profiles.find((p) => p.id === id)?.email ?? '';

  async function resolveRequest(id: string, status: CompetitionRequestStatus) {
    setResolving(id);
    try {
      const res = await fetch('/api/alerts/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        const { request } = await res.json();
        setRequests((prev) => prev.map((r) => (r.id === id ? request : r)));
      }
    } finally {
      setResolving(null);
    }
  }

  const trackersByUser = new Map<string, AlertTrack[]>();
  for (const t of tracks) {
    const list = trackersByUser.get(t.user_id) ?? [];
    list.push(t);
    trackersByUser.set(t.user_id, list);
  }

  const liveSubs = subs.filter((s) => !s.disabled_at);
  const subUserIds = new Set(liveSubs.map((s) => s.user_id));
  // The most actionable number on the page: people who asked to be reminded but
  // whose phone cannot receive one.
  const trackingWithoutPush = [...trackersByUser.keys()].filter((u) => !subUserIds.has(u));

  const now = new Date();
  const counts = {
    sent: deliveries.filter((d) => d.status === 'sent').length,
    stale: deliveries.filter((d) => d.status === 'skipped_stale').length,
    failed: deliveries.filter((d) => d.status === 'failed').length,
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  // Pending groups first, then newest — the queue is meant to be worked down.
  const groupedRequests = [...requests
    .reduce((acc, r) => {
      const list = acc.get(r.url) ?? [];
      list.push(r);
      return acc.set(r.url, list);
    }, new Map<string, CompetitionRequest[]>())]
    .sort((a, b) => {
      const aPending = a[1].some((r) => r.status === 'pending') ? 0 : 1;
      const bPending = b[1].some((r) => r.status === 'pending') ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return b[1][0].created_at.localeCompare(a[1][0].created_at);
    });

  const tracksPerUser = [...trackersByUser.values()].map((v) => v.length).sort((a, b) => a - b);
  const median = tracksPerUser.length
    ? tracksPerUser[Math.floor(tracksPerUser.length / 2)]
    : 0;
  const mean = tracksPerUser.length
    ? (tracksPerUser.reduce((a, b) => a + b, 0) / tracksPerUser.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <p className="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
        Competitions aren&apos;t course-scoped, so this tab deliberately ignores the term filter —
        narrowing by term would return nothing rather than a smaller answer.
      </p>

      {/* ── Reach ─────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Students tracking', value: trackersByUser.size, sub: `of ${profiles.length}`, icon: Users },
          { label: 'Competitions', value: competitions.length, sub: `${competitions.filter((c) => c.visibility === 'global').length} cohort-wide`, icon: Globe },
          { label: 'Push-enabled', value: subUserIds.size, sub: `${liveSubs.length} devices`, icon: Smartphone },
          { label: 'Tracking, no push', value: trackingWithoutPush.length, sub: 'cannot be reached', icon: TriangleAlert },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <card.icon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wide">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{card.value}</p>
            <p className="text-[11px] text-slate-400">{card.sub}</p>
          </div>
        ))}
      </section>

      <p className="text-xs text-slate-500">
        Mean {mean} competitions tracked per active student, median {median}.
      </p>

      {/* ── Competition requests ──────────────────────── */}
      {/*
        Links the importer refused, and the students who asked for them. This is
        the only place these surface: the student's ask is otherwise invisible to
        everyone who could act on it. Grouped by url, because "four people want
        this one" is the number that decides whether it is worth importing.
      */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5" />
            Non-Unstop requests
          </span>
          <span className="font-normal normal-case text-[11px] text-slate-400">
            {pendingRequests.length} pending · {requests.length} all time
          </span>
        </h3>

        {groupedRequests.length === 0 ? (
          <p className="px-4 py-6 text-center text-slate-400 text-xs">
            Nobody has asked for a non-Unstop competition yet. When a student pastes a link that
            isn&apos;t on Unstop, they&apos;re offered this and it lands here.
          </p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {groupedRequests.map(([url, rows]) => {
              const pending = rows.filter((r) => r.status === 'pending');
              return (
                <li key={url} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 text-xs font-semibold text-slate-800 hover:text-orange-600 break-all inline-flex items-start gap-1"
                    >
                      <span className="min-w-0">{url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                    </a>
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      pending.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {rows.length} {rows.length === 1 ? 'asker' : 'askers'}
                    </span>
                  </div>

                  <ul className="mt-2 space-y-1.5">
                    {rows.map((r) => (
                      <li key={r.id} className="flex items-start gap-2 text-[11px]">
                        <span className="min-w-0 flex-1">
                          <span
                            onClick={() => onViewMember?.(r.user_id)}
                            className="font-semibold text-slate-700 hover:text-orange-600 cursor-pointer"
                          >
                            {nameOf(r.user_id)}
                          </span>
                          <span className="text-slate-400"> · {emailOf(r.user_id)} · {formatIst(r.created_at)}</span>
                          {r.reason === 'unstop_unreachable' && (
                            <span className="ml-1 text-rose-500">· Unstop refused it</span>
                          )}
                          {r.note && (
                            <span className="block text-slate-500 italic mt-0.5">&ldquo;{r.note}&rdquo;</span>
                          )}
                        </span>

                        {r.status === 'pending' ? (
                          <span className="shrink-0 flex items-center gap-1">
                            <button
                              type="button"
                              disabled={resolving === r.id}
                              onClick={() => resolveRequest(r.id, 'added')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-40"
                            >
                              {resolving === r.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Check className="w-3 h-3" />}
                              Added
                            </button>
                            <button
                              type="button"
                              disabled={resolving === r.id}
                              onClick={() => resolveRequest(r.id, 'declined')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-500 font-semibold hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-40"
                            >
                              <X className="w-3 h-3" />
                              Decline
                            </button>
                          </span>
                        ) : (
                          <span className="shrink-0 flex items-center gap-1.5">
                            <span className={`font-semibold ${r.status === 'added' ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {r.status === 'added' ? 'Added' : 'Declined'}
                            </span>
                            <button
                              type="button"
                              disabled={resolving === r.id}
                              onClick={() => resolveRequest(r.id, 'pending')}
                              title="Reopen"
                              className="text-slate-300 hover:text-orange-500 disabled:opacity-40"
                            >
                              <Undo2 className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}

        {pendingRequests.length > 0 && (
          <p className="text-[11px] text-slate-500 bg-slate-50 px-4 py-2 border-t border-gray-100">
            &ldquo;Added&rdquo; only marks the request answered — it imports nothing. Add the
            competition itself with the <code className="text-slate-700">unstop-import</code> skill
            (if it has an Unstop page) or a migration, then mark it here.
          </p>
        )}
      </section>

      {/* ── Per competition ───────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 px-4 py-3 border-b border-gray-100">
          Per competition
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Competition</th>
                <th className="text-left px-3 py-2 font-semibold">Visibility</th>
                <th className="text-right px-3 py-2 font-semibold">Tracking</th>
                <th className="text-right px-3 py-2 font-semibold">Muted</th>
                <th className="text-right px-3 py-2 font-semibold">Out</th>
                <th className="text-left px-3 py-2 font-semibold">Next</th>
              </tr>
            </thead>
            <tbody>
              {competitions.map((c) => {
                const mine = tracks.filter((t) => t.competition_id === c.id);
                const compRounds = rounds.filter((r) => r.competition_id === c.id);
                const next = nextMilestone(compRounds, now);
                return (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <span className="font-semibold text-slate-800">{c.title}</span>
                      <span className="block text-[10px] text-slate-400">
                        {c.organiser} · {compRounds.length} rounds
                        {compRounds.filter((r) => r.retired_at).length > 0 &&
                          ` · ${compRounds.filter((r) => r.retired_at).length} retired`}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {c.visibility === 'global'
                        ? <span className="inline-flex items-center gap-1 text-emerald-600"><Globe className="w-3 h-3" />Cohort</span>
                        : <span className="inline-flex items-center gap-1 text-slate-400"><Lock className="w-3 h-3" />Private</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{mine.length}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {mine.filter((t) => !t.notifications_enabled).length}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {mine.filter((t) => t.status === 'eliminated').length}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {next
                        ? `${next.round.title ?? `R${next.round.round_order}`} ${next.kind} ${formatIst(next.at)}`
                        : compRounds.some((r) => roundState(r, now) === 'live') ? 'in progress' : '—'}
                    </td>
                  </tr>
                );
              })}
              {competitions.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No competitions published yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Per member ────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 px-4 py-3 border-b border-gray-100">
          Per member
        </h3>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Student</th>
                <th className="text-right px-3 py-2 font-semibold">Tracked</th>
                <th className="text-right px-3 py-2 font-semibold">Muted</th>
                <th className="text-right px-3 py-2 font-semibold">Reminders</th>
                <th className="text-right px-3 py-2 font-semibold">Deadlines</th>
                <th className="text-right px-3 py-2 font-semibold">Devices</th>
              </tr>
            </thead>
            <tbody>
              {[...trackersByUser.entries()]
                .sort((a, b) => b[1].length - a[1].length)
                .map(([userId, list]) => {
                  const myTrackIds = new Set(list.map((t) => t.id));
                  const devices = liveSubs.filter((s) => s.user_id === userId).length;
                  return (
                    <tr
                      key={userId}
                      onClick={() => onViewMember?.(userId)}
                      className="border-t border-gray-50 hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="px-4 py-2 font-semibold text-slate-800">{nameOf(userId)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{list.length}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                        {list.filter((t) => !t.notifications_enabled).length}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                        {rules.filter((r) => myTrackIds.has(r.track_id)).length}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                        {deadlines.filter((d) => d.user_id === userId && !d.completed_at).length}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${devices === 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                        {devices === 0 ? '0 ⚠' : devices}
                      </td>
                    </tr>
                  );
                })}
              {trackersByUser.size === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nobody is tracking anything yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Push health ───────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-3">Push health</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          {Object.entries(
            liveSubs.reduce<Record<string, number>>((acc, s) => {
              const k = describeAgent(s.user_agent);
              acc[k] = (acc[k] ?? 0) + 1;
              return acc;
            }, {}),
          ).map(([platform, n]) => (
            <span key={platform} className="text-slate-600">
              <strong className="text-slate-900">{n}</strong> {platform}
            </span>
          ))}
          <span className="text-slate-400">
            {subs.filter((s) => s.disabled_at).length} disabled
          </span>
          <span className="text-slate-400">
            {subs.filter((s) => s.failure_count > 0 && !s.disabled_at).length} failing
          </span>
        </div>
        {trackingWithoutPush.length > 0 && (
          <p className="mt-3 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            <strong>{trackingWithoutPush.length}</strong> student
            {trackingWithoutPush.length === 1 ? '' : 's'} track competitions but have no working
            push subscription — they only see alerts if they open the site. Most likely iPhones that
            haven&apos;t been added to the home screen.
          </p>
        )}
      </section>

      {/* ── Delivery log ──────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span>Delivery log</span>
          <span className="font-normal normal-case text-[11px] text-slate-400">
            {counts.sent} sent · {counts.stale} stale · {counts.failed} failed
          </span>
        </h3>
        {counts.stale > counts.sent && counts.stale > 5 && (
          <p className="text-[11px] text-rose-700 bg-rose-50 px-4 py-2">
            More reminders are being skipped as stale than sent. That usually means the 15-minute
            GitHub Actions dispatcher has stopped running — GitHub disables scheduled workflows
            after 60 days of repository inactivity.
          </p>
        )}
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">When</th>
                <th className="text-left px-3 py-2 font-semibold">Student</th>
                <th className="text-left px-3 py-2 font-semibold">Reminder</th>
                <th className="text-left px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.slice(0, 200).map((d) => (
                <tr key={d.id} className="border-t border-gray-50">
                  <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{formatIst(d.created_at)}</td>
                  <td className="px-3 py-2 text-slate-700">{nameOf(d.user_id)}</td>
                  <td className="px-3 py-2 text-slate-600">
                    <span className="font-semibold">{d.title}</span>
                    <span className="block text-[10px] text-slate-400">{d.body}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={
                      d.status === 'sent' ? 'text-emerald-600'
                      : d.status === 'skipped_stale' ? 'text-amber-600'
                      : 'text-rose-600'
                    }>
                      {d.status === 'sent' ? <Bell className="w-3 h-3 inline mr-1" /> : <BellOff className="w-3 h-3 inline mr-1" />}
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
              {deliveries.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Nothing dispatched yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Self-declared eliminations ────────────────── */}
      {outcomes.some((o) => !o.cleared) && (
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
            Self-declared eliminations
          </h3>
          <ul className="text-xs text-slate-600 space-y-1">
            {outcomes.filter((o) => !o.cleared).map((o) => {
              const round = rounds.find((r) => r.id === o.round_id);
              const comp = competitions.find((c) => c.id === round?.competition_id);
              return (
                <li key={o.id}>
                  <span className="font-semibold">{nameOf(o.user_id)}</span> — out at{' '}
                  {round?.title ?? 'a round'} of {comp?.title ?? 'a competition'}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
