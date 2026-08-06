'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (url: string, publishToCohort: boolean) => Promise<{ ok: boolean; error?: string }>;
  /** Admins get the cohort-wide option; nobody else sees it exists. */
  canPublish?: boolean;
}

export function AddCompetitionDialog({ open, onOpenChange, onSubmit, canPublish }: Props) {
  const [url, setUrl] = useState('');
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    const result = await onSubmit(url.trim(), publish);
    setBusy(false);
    if (result.ok) {
      setUrl('');
      setPublish(false);
      onOpenChange(false);
    } else {
      setError(result.error ?? 'Could not add that competition.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a competition</DialogTitle>
          <DialogDescription>
            Paste an Unstop link. We&apos;ll pull in the rounds and deadlines automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            placeholder="https://unstop.com/competitions/..."
            autoComplete="off"
            spellCheck={false}
            className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />

          {canPublish && (
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

          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {busy ? 'Fetching from Unstop…' : 'Add competition'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
