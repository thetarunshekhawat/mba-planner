'use client';

// Admin "Ask the database" panel. The admin types a plain-English question;
// POST /api/admin/query turns it into a read-only SQL query (MiniMax-M3), runs
// it through the locked-down admin_run_readonly_sql() RPC, and returns a
// plain-English summary + the matching rows.
//
// The conversation accumulates (each question appends a new entry) and is
// persisted to sessionStorage, so it survives switching tabs and even leaving
// the admin area and coming back — it only clears on "New chat" or when the
// browser tab/session ends.

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, Database, AlertTriangle, ChevronDown, ChevronRight, Plus } from 'lucide-react';

interface QueryResult {
  summary?: string;
  sql?: string | null;
  columns?: string[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  error?: string;
}

interface ThreadEntry extends QueryResult {
  id: string;
  question: string;
  status: 'loading' | 'done' | 'error';
}

const EXAMPLE_PROMPTS = [
  'Who was active today between 7 and 8 pm?',
  "Members who haven't signed in in the last 7 days",
  'Most popular Term 4 courses',
  'How many people have built a plan?',
];

const MAX_VISIBLE_ROWS = 200;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const STORAGE_KEY = 'mba-ask-ai-thread';

function renderCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    if (ISO_RE.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toLocaleString();
    }
    return value;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

export function AskAiPanel() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const [expandedSql, setExpandedSql] = useState<Set<string>>(new Set());
  const hydrated = useRef(false);

  // Hydrate once on mount (survives tab switches + planner round-trips within the session).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setThread(JSON.parse(raw) as ThreadEntry[]);
    } catch {
      /* ignore malformed/absent storage */
    }
    hydrated.current = true;
  }, []);

  // Persist whenever the thread changes (after hydration, so we never clobber stored state with []).
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      // Trim stored rows to what we actually display, to stay under the storage quota.
      const slim = thread.map((e) => (e.rows ? { ...e, rows: e.rows.slice(0, MAX_VISIBLE_ROWS) } : e));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {
      /* quota exceeded — keep working in-memory for this session */
    }
  }, [thread]);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    const id = newId();
    setQuestion('');
    setLoading(true);
    setThread((prev) => [{ id, question: trimmed, status: 'loading' }, ...prev]);

    const patch = (next: Partial<ThreadEntry>) =>
      setThread((prev) => prev.map((e) => (e.id === id ? { ...e, ...next } : e)));

    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = (await res.json()) as QueryResult;
      if (!res.ok) {
        patch({ status: 'error', error: data.error || `Request failed (${res.status})` });
      } else if (data.error) {
        patch({ status: 'error', error: data.error, sql: data.sql });
      } else {
        patch({ status: 'done', ...data });
      }
    } catch {
      patch({ status: 'error', error: 'Network error — please try again.' });
    } finally {
      setLoading(false);
    }
  }

  function newChat() {
    setThread([]);
    setExpandedSql(new Set());
    setQuestion('');
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  function toggleSql(id: string) {
    setExpandedSql((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(question);
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-indigo-500/15 p-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Ask the database</h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-prose">
              Ask anything about the cohort in plain English. The assistant writes a
              read-only query and shows you the matching people or rows. It can never
              change or delete data.
            </p>
          </div>
        </div>
        {thread.length > 0 && (
          <button
            onClick={newChat}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-indigo-400/40 hover:text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            New chat
          </button>
        )}
      </div>

      {/* Input */}
      <div className="bg-slate-800 rounded-xl p-3 border border-white/5">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="e.g. Who was active today between 7 and 8 pm?"
          className="w-full resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-500">Enter to ask · Shift+Enter for a new line</span>
          <button
            onClick={() => ask(question)}
            disabled={loading || !question.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {loading ? 'Thinking…' : 'Ask'}
          </button>
        </div>
      </div>

      {/* Example chips (only before the first question) */}
      {thread.length === 0 && !loading && (
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => ask(p)}
              className="rounded-full border border-white/10 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 transition-all hover:border-indigo-400/40 hover:text-white"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Conversation thread (newest first) */}
      <div className="space-y-4">
        {thread.map((entry) => {
          const rows = entry.rows ?? [];
          const columns = entry.columns ?? (rows.length ? Object.keys(rows[0]) : []);
          const visibleRows = rows.slice(0, MAX_VISIBLE_ROWS);
          const sqlOpen = expandedSql.has(entry.id);
          return (
            <div key={entry.id} className="space-y-2 border-t border-white/5 pt-4 first:border-t-0 first:pt-0">
              {/* The question */}
              <div className="flex items-start gap-2">
                <div className="rounded-md bg-slate-700/60 px-2 py-1 text-[11px] font-medium text-slate-300">You</div>
                <p className="text-sm text-slate-100 pt-0.5">{entry.question}</p>
              </div>

              {entry.status === 'loading' && (
                <div className="flex items-center gap-2 text-xs text-slate-400 pl-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
                </div>
              )}

              {entry.status === 'error' && (
                <>
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{entry.error}</span>
                  </div>
                  {entry.sql && (
                    <pre className="overflow-x-auto rounded-lg border border-white/5 bg-slate-800/60 p-3 text-[11px] leading-relaxed text-emerald-300/90 whitespace-pre-wrap">
                      {entry.sql}
                    </pre>
                  )}
                </>
              )}

              {entry.status === 'done' && (
                <div className="space-y-2">
                  {entry.summary && (
                    <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3 text-sm text-slate-200">
                      {entry.summary}
                    </div>
                  )}

                  {rows.length > 0 && (
                    <div className="rounded-xl border border-white/5 bg-slate-800 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                        <span className="text-xs font-semibold text-slate-300">
                          {entry.rowCount} {entry.rowCount === 1 ? 'result' : 'results'}
                          {rows.length > MAX_VISIBLE_ROWS && ` (showing first ${MAX_VISIBLE_ROWS})`}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/5 text-left">
                              {columns.map((c) => (
                                <th key={c} className="px-3 py-2 font-semibold text-slate-400 whitespace-nowrap">
                                  {c}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {visibleRows.map((row, i) => (
                              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                {columns.map((c) => (
                                  <td key={c} className="px-3 py-2 text-slate-200 max-w-xs truncate" title={renderCell(row[c])}>
                                    {renderCell(row[c])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {entry.sql && (
                    <div className="rounded-xl border border-white/5 bg-slate-800/60">
                      <button
                        onClick={() => toggleSql(entry.id)}
                        className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                      >
                        {sqlOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <Database className="w-3.5 h-3.5" />
                        View the SQL that ran
                      </button>
                      {sqlOpen && (
                        <pre className="overflow-x-auto px-3 pb-3 text-[11px] leading-relaxed text-emerald-300/90 whitespace-pre-wrap">
                          {entry.sql}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
