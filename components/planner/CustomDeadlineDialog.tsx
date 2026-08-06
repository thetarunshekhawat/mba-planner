'use client';

import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { istToInstant } from '@/lib/alerts/time';
import { campusToday } from '@/lib/terms';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { title: string; dueAt: string; notes?: string; url?: string }) => void;
}

/** Anything with a due date that isn't a competition — an assignment, a form. */
export function CustomDeadlineDialog({ open, onOpenChange, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(campusToday());
  const [time, setTime] = useState('23:59');
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      // Converted once, here, from what the student typed in IST.
      dueAt: istToInstant(date, time),
      notes: notes.trim() || undefined,
      url: url.trim() || undefined,
    });
    setTitle(''); setNotes(''); setUrl(''); setTime('23:59');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a deadline</DialogTitle>
          <DialogDescription>
            Assignment submissions, form deadlines — anything you want chasing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's due?"
            className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 text-[13px] px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-28 text-[13px] px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Link (optional)"
            className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
          <p className="text-[10px] text-slate-400">All times are IST.</p>
          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-40"
          >
            <CalendarPlus className="w-4 h-4" />
            Add deadline
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
