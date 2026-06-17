'use client';

import { useState } from 'react';
import {
  Users, Copy, Check, RefreshCw, UserPlus, Eye, EyeOff, Trash2, BookOpen,
} from 'lucide-react';
import type { Friend } from '@/types';
import type { EventType } from '@/hooks/useAnalytics';
import type { AddFriendResult } from '@/hooks/useFriends';
import { SPECS } from '@/data/courses';
import { colorForFriend } from '@/types';

interface Props {
  myCode?: string;
  friends: Friend[];
  loading: boolean;
  friendSelections: Map<string, Set<number>>;
  overlayIds: Set<string>;
  onToggleOverlay: (friend: Friend) => void;
  onAddByCode: (code: string) => Promise<AddFriendResult>;
  onRemove: (friend: Friend) => void;
  onRegenerate: () => Promise<string | null>;
  onOpenDetail: (friend: Friend) => void;
  trackEvent: (type: EventType, payload?: Record<string, unknown>) => void;
}

const ADD_ERRORS: Record<string, string> = {
  code_not_found: "No one found with that code. Double-check and try again.",
  self_add: "That's your own code 🙂",
  already_friends: "You're already friends.",
  error: 'Something went wrong. Try again.',
};

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function FriendsView({
  myCode, friends, loading, friendSelections, overlayIds,
  onToggleOverlay, onAddByCode, onRemove, onRegenerate, onOpenDetail, trackEvent,
}: Props) {
  const [codeInput, setCodeInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [displayCode, setDisplayCode] = useState<string | undefined>(myCode);

  const code = displayCode ?? myCode;

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      trackEvent('friend_code_copied');
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    const next = await onRegenerate();
    if (next) {
      setDisplayCode(next);
      trackEvent('friend_code_regenerated');
    }
    setRegenerating(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const entered = codeInput.trim().toUpperCase();
    if (!entered || adding) return;
    setAdding(true);
    setStatus(null);
    trackEvent('friend_add_attempted', { code: entered });
    const result = await onAddByCode(entered);
    if (result.ok) {
      trackEvent('friend_added', { friend_id: result.friend.id, friend_name: result.friend.name });
      setStatus({ kind: 'ok', msg: `Added ${result.friend.name || 'friend'}! You can now see each other.` });
      setCodeInput('');
    } else {
      trackEvent('friend_add_failed', { code: entered, reason: result.reason });
      setStatus({ kind: 'err', msg: ADD_ERRORS[result.reason] ?? ADD_ERRORS.error });
    }
    setAdding(false);
  }

  function handleRemove(friend: Friend) {
    trackEvent('friend_removed', { friend_id: friend.id });
    onRemove(friend);
  }

  function handleOpenDetail(friend: Friend) {
    trackEvent('friend_detail_viewed', { friend_id: friend.id });
    onOpenDetail(friend);
  }

  return (
    <div className="p-4 lg:p-6 min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      <div className="mx-auto max-w-2xl space-y-6">

        {/* ── Your code ────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Your friend code</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Share this code so classmates can add you. Adding is mutual — you&apos;ll both see each other.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.3em] text-slate-900 bg-slate-100 rounded-xl px-5 py-3 select-all">
              {code ?? '······'}
            </div>
            <button
              onClick={handleCopy}
              disabled={!code}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-40"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              title="Generate a new code (your old code stops working)"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
              New code
            </button>
          </div>
        </section>

        {/* ── Add a friend ─────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Add a friend</h2>
          </div>
          <form onSubmit={handleAdd} className="flex items-center gap-2 flex-wrap">
            <input
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value.toUpperCase()); setStatus(null); }}
              placeholder="Enter code"
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono tracking-[0.2em] uppercase text-lg px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400 w-44"
            />
            <button
              type="submit"
              disabled={adding || !codeInput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-40"
            >
              {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add
            </button>
          </form>
          {status && (
            <p className={`mt-3 text-sm ${status.kind === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              {status.msg}
            </p>
          )}
        </section>

        {/* ── Friends list ─────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Your friends {friends.length > 0 && <span className="text-slate-400">({friends.length})</span>}
            </h2>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400 px-1 animate-pulse">Loading friends…</p>
          ) : friends.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No friends yet</p>
              <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                Ask a classmate for their code and add it above — once added, you can overlay their schedule on yours.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {friends.map(friend => {
                const specObjs = SPECS.filter(s => friend.specializations.includes(s.id));
                const count = friendSelections.get(friend.id)?.size ?? 0;
                const color = colorForFriend(friend.id);
                const isOn = overlayIds.has(friend.id);
                const initials = friend.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <li
                    key={friend.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex items-center gap-3"
                  >
                    <button
                      onClick={() => handleOpenDetail(friend)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {initials || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">{friend.name}</span>
                          {friend.addedAt && (
                            <span className="text-[10px] text-slate-400 flex-shrink-0">· added {formatDate(friend.addedAt)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {specObjs.map(s => (
                            <span
                              key={s.id}
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: s.color + '20', color: s.color }}
                            >
                              {s.label}
                            </span>
                          ))}
                          <span className="text-[10px] text-slate-400 inline-flex items-center gap-0.5">
                            <BookOpen className="w-3 h-3" /> {count}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Overlay toggle */}
                    <button
                      onClick={() => onToggleOverlay(friend)}
                      title={isOn ? 'Hide from my schedule' : 'Show on my schedule'}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 border"
                      style={isOn
                        ? { backgroundColor: color, borderColor: color, color: '#fff' }
                        : { backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#64748b' }}
                    >
                      {isOn ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isOn ? 'On schedule' : 'Overlay'}</span>
                    </button>

                    <button
                      onClick={() => handleRemove(friend)}
                      title="Remove friend"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
