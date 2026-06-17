'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, BookOpen } from 'lucide-react';
import type { Friend } from '@/types';
import { ALL_COURSES, SPECS } from '@/data/courses';

interface Props {
  friend: Friend | null;
  selectedIds: Set<number>;
  color: string;
  onClose: () => void;
}

const TERM_LABELS: Record<number, string> = { 4: 'Term 4', 5: 'Term 5', 6: 'Term 6' };

export function FriendDetailModal({ friend, selectedIds, color, onClose }: Props) {
  if (!friend) return null;

  const specObjects = SPECS.filter(s => friend.specializations.includes(s.id));
  const courses = ALL_COURSES
    .filter(c => selectedIds.has(c.id) && c.type !== 'exam' && c.type !== 'free')
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));

  const byTerm = [4, 5, 6].map(term => ({
    term,
    list: courses.filter(c => c.term === term),
  })).filter(g => g.list.length > 0);

  const initials = friend.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Sheet open={!!friend} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto bg-slate-900 border-white/10 text-white"
      >
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {initials || '?'}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-white text-lg leading-tight truncate">{friend.name}</SheetTitle>
              <p className="text-slate-400 text-xs truncate">{friend.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {specObjects.length > 0 ? specObjects.map(s => (
              <Badge
                key={s.id}
                style={{ backgroundColor: s.color + '33', color: s.color, borderColor: s.color + '55' }}
                className="text-xs border"
              >
                {s.label}
              </Badge>
            )) : (
              <span className="text-slate-500 text-xs italic">No specialization chosen yet</span>
            )}
          </div>
        </SheetHeader>

        <div className="flex items-center gap-2 text-slate-400 text-xs mb-4">
          <BookOpen className="w-3.5 h-3.5" />
          {courses.length} {courses.length === 1 ? 'course' : 'courses'} selected
        </div>

        {byTerm.length === 0 ? (
          <p className="text-slate-500 text-sm">This friend hasn&apos;t selected any courses yet.</p>
        ) : (
          <div className="space-y-6">
            {byTerm.map(({ term, list }) => (
              <div key={term}>
                <h3 className="text-slate-300 font-semibold text-sm mb-2">{TERM_LABELS[term]}</h3>
                <div className="space-y-2">
                  {list.map(c => {
                    const spec = SPECS.find(s => c.specs.includes(s.id));
                    const accent = c.type === 'waw' ? '#d97706'
                      : c.type === 'mandatory' ? '#2563eb'
                      : spec?.color ?? '#64748b';
                    return (
                      <div
                        key={c.id}
                        className="rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                        style={{ borderLeft: `3px solid ${accent}` }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-100 leading-snug">{c.name}</span>
                          {c.code && (
                            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: accent }}>{c.code}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <CalendarClock className="w-3 h-3" />
                          <span>{c.dates}</span>
                          {c.timings && c.timings[0] && (
                            <span className="font-mono">· {c.timings[0].slot}</span>
                          )}
                        </div>
                        {c.faculty && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {c.faculty.replace(/^(Prof\.|Dr\.) /, '')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
