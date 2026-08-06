'use client';

import { useState } from 'react';
import { Check, Loader2, Plus, Send } from 'lucide-react';
import type { CompetitionRequestReason } from '@/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (url: string, publishToCohort: boolean) => Promise<{
    ok: boolean; error?: string; canRequest?: boolean; reason?: CompetitionRequestReason;
  }>;
  /** Sends the link to an admin when the importer can't handle it. */
  onRequest: (url: string, note: string, reason: CompetitionRequestReason) => Promise<{
    ok: boolean; error?: string;
  }>;
  /** Admins get the cohort-wide option; nobody else sees it exists. */
  canPublish?: boolean;
}

type Stage =
  | { kind: 'form' }
  /** The importer refused, but a human could still add it. */
  | { kind: 'offer'; reason: CompetitionRequestReason }
  | { kind: 'sent' };

export function AddCompetitionDialog({
  open, onOpenChange, onSubmit, onRequest, canPublish,
}: Props) {
  const [url, setUrl] = useState('');
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: 'form' });
  const [note, setNote] = useState('');

  function reset() {
    setUrl('');
    setNote('');
    setPublish(false);
    setError(null);
    setStage({ kind: 'form' });
  }

  function close() {
    reset();
    onOpenChange(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    const result = await onSubmit(url.trim(), publish);
    setBusy(false);
    if (result.ok) {
      close();
      return;
    }
    setError(result.error ?? 'Could not add that competition.');
    // A refusal the importer can't fix but a person can. Offering here is the
    // whole feature: the student wants to track something, and until now that
    // intent died at the error message.
    if (result.canRequest) {
      setStage({ kind: 'offer', reason: result.reason ?? 'not_unstop' });
    }
  }

  async function handleRequest() {
    if (stage.kind !== 'offer' || busy) return;
    setBusy(true);
    setError(null);
    const result = await onRequest(url.trim(), note.trim(), stage.reason);
    setBusy(false);
    if (result.ok) setStage({ kind: 'sent' });
    else setError(result.error ?? 'Could not send that request.');
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {stage.kind === 'sent' ? 'Sent to the admins' : 'Add a competition'}
          </DialogTitle>
          <DialogDescription>
            {stage.kind === 'sent'
              ? 'They’ll add it for the cohort if it checks out.'
              : 'Paste an Unstop link. We’ll pull in the rounds and deadlines automatically.'}
          </DialogDescription>
        </DialogHeader>

        {stage.kind === 'sent' ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-emerald-800">
                Your request is in the admin queue. Nothing is tracked yet — you&apos;ll see the
                competition in Alerts once an admin adds it.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
                // Editing the link invalidates the refusal it was based on.
                if (stage.kind === 'offer') setStage({ kind: 'form' });
              }}
              placeholder="https://unstop.com/competitions/..."
              autoComplete="off"
              spellCheck={false}
              className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />

            {canPublish && stage.kind === 'form' && (
              <label className="flex items-start gap-2 text-[12px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publish}
                  onChange={(e) => setPublish(e.target.checked)}
                  className="mt-0.5 accent-orange-500"
                />
                <span>
                  <span className="font-semibold text-slate-700">Publish to the whole cohort</span>
                  <span className="block text-slate-400 text-[11px]">
                    Everyone will see this competition in their Alerts tab. Leave off to keep it to yourself.
                  </span>
                </span>
              </label>
            )}

            {error && (
              <p className="text-[12px] text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {stage.kind === 'offer' && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2.5">
                <p className="text-[12px] text-orange-900">
                  <span className="font-semibold">
                    {stage.reason === 'unstop_unreachable'
                      ? 'Unstop wouldn’t serve that competition.'
                      : 'That isn’t an Unstop link.'}
                  </span>{' '}
                  Only Unstop links import on their own. Do you want an admin to add this
                  competition by hand?
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Anything useful? Deadline, team size, where you found it (optional)"
                  className="w-full text-[12px] px-2.5 py-2 rounded-lg border border-orange-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRequest}
                    disabled={busy}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 text-white text-[13px] font-semibold hover:bg-orange-600 transition-colors disabled:opacity-40"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Yes, ask an admin
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="px-3 py-2 rounded-lg bg-white border border-orange-200 text-slate-500 text-[13px] font-semibold hover:bg-orange-100 transition-colors"
                  >
                    No thanks
                  </button>
                </div>
              </div>
            )}

            {stage.kind === 'form' && (
              <button
                type="submit"
                disabled={busy || !url.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-40"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {busy ? 'Fetching from Unstop…' : 'Add competition'}
              </button>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
