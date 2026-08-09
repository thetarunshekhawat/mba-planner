'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Check, Lock, Layers, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  formatCampusDay, SPEC_REQUIRED_CREDITS,
  type ProgressBasis, type ProgressSummary, type SpecProgress,
} from '@/lib/progress';
import { BasisToggle } from './BasisToggle';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: ProgressSummary;
  basis: ProgressBasis;
  onBasisChange: (basis: ProgressBasis) => void;
}

/** Course label — Term 6 rows have no code, so fall back to the name. */
function courseLabel(course: { code?: string; name: string }) {
  return course.code ?? course.name;
}

function SpecRow({ entry, basis }: { entry: SpecProgress; basis: ProgressBasis }) {
  const { spec } = entry;
  const pct = Math.min((entry.earned / entry.required) * 100, 100);
  const surplus = entry.earned - entry.required;
  const shortfall = Math.max(entry.required - entry.earned, 0);
  // Credits alone are not the whole answer: a spec can be at 6/6 and still be
  // blocked on a course the school marks mandatory for it.
  const blocked = entry.earned >= entry.required && !entry.complete;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: spec.color }} />
          <span className="text-sm font-medium truncate" style={{ color: spec.color }}>
            {spec.label}
          </span>
          {entry.declared && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/10 text-slate-300 flex-shrink-0">
              Declared
            </span>
          )}
          {entry.complete && !entry.declared && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex-shrink-0">
              Bonus
            </span>
          )}
        </span>
        <span className="text-white text-sm font-semibold tabular-nums flex-shrink-0">
          {entry.earned}/{entry.required}
          {surplus > 0 && <span className="ml-1 text-amber-400 text-xs">+{surplus}</span>}
        </span>
      </div>

      <Progress
        value={pct}
        className="h-1.5 bg-white/10"
        indicatorStyle={{ backgroundColor: entry.complete ? '#10b981' : blocked ? '#f59e0b' : spec.color }}
      />

      <div className="mt-2 flex items-start gap-1.5 text-xs">
        {entry.complete ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-px" />
            <span className="text-emerald-300">
              Complete{entry.declared ? '' : ' — earned without declaring it'}
            </span>
          </>
        ) : entry.missingMandatory.length > 0 ? (
          <>
            <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-px" />
            <span className="text-slate-400">
              {shortfall > 0 && `${shortfall} more to go. `}
              Needs{' '}
              <span className="text-amber-300">
                {entry.missingMandatory.map(courseLabel).join(', ')}
              </span>
              {' — mandatory for '}
              {spec.label}
            </span>
          </>
        ) : entry.pendingMandatory.length > 0 ? (
          <>
            <Clock className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-px" />
            <span className="text-slate-400">
              {shortfall > 0 ? `${shortfall} more to go. ` : ''}
              <span className="text-sky-300">{entry.pendingMandatory.map(courseLabel).join(', ')}</span>
              {entry.pendingMandatory.length > 1
                ? ' are selected but have not been taught yet'
                : ' is selected but has not been taught yet'}
            </span>
          </>
        ) : (
          <span className="text-slate-500">
            {entry.required - entry.earned} more to go
            {basis === 'to-date' && ' as of today'}
          </span>
        )}
      </div>

      {entry.courses.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.courses.map((c) => (
            <span
              key={c.id}
              title={`${c.name}${c.specs.length > 1 ? ` — also counts toward ${c.specs.filter((s) => s !== spec.id).join(', ')}` : ''}`}
              className="text-[10px] px-1.5 py-0.5 rounded border"
              style={{
                borderColor: c.specs.length > 1 ? '#38bdf855' : 'rgba(255,255,255,0.12)',
                color: c.specs.length > 1 ? '#7dd3fc' : '#94a3b8',
              }}
            >
              {courseLabel(c)}
              {c.specs.length > 1 && <span className="ml-1 opacity-70">×{c.specs.length}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Every specialization, not just the declared ones. Courses carry more than one
 * spec tag, so a student picking three specs is quietly accumulating credit
 * toward the other three — this is the only place that shows it.
 */
export function SpecializationsDialog({ open, onOpenChange, summary, basis, onBasisChange }: Props) {
  const declared = summary.specs.filter((s) => s.declared);
  const others = summary.specs
    .filter((s) => !s.declared)
    .sort((a, b) => Number(b.complete) - Number(a.complete) || b.earned - a.earned);

  const bonusComplete = others.filter((s) => s.complete);
  const closest = others.find((s) => !s.complete && s.earned > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 text-white ring-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Layers className="w-4 h-4 text-sky-400" />
            All specializations
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {basis === 'to-date'
              ? `Counting only what has been taught by ${formatCampusDay(summary.today)} — an ongoing block counts.`
              : 'Counting everything you have selected across Terms 4–6.'}{' '}
            {summary.doubleCounted > 0 && (
              <span className="text-sky-300">
                {summary.doubleCounted} of your courses count toward more than one specialization.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <BasisToggle basis={basis} onChange={onBasisChange} today={summary.today} />

        {/* Headline: the answer to "have I accidentally finished another spec?" */}
        <div
          className="rounded-lg border p-3 text-sm"
          style={
            bonusComplete.length > 0
              ? { borderColor: '#10b98155', backgroundColor: '#10b98115', color: '#6ee7b7' }
              : { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#94a3b8' }
          }
        >
          {bonusComplete.length > 0 ? (
            <>
              You have also completed{' '}
              <strong className="font-semibold">
                {bonusComplete.map((s) => s.spec.label).join(' and ')}
              </strong>{' '}
              without declaring {bonusComplete.length > 1 ? 'them' : 'it'}.
            </>
          ) : closest ? (
            <>
              No undeclared specialization is complete yet. Closest is{' '}
              <strong className="font-semibold" style={{ color: closest.spec.color }}>
                {closest.spec.label}
              </strong>{' '}
              at {closest.earned}/{closest.required}.
            </>
          ) : (
            <>No credit toward any specialization outside the ones you declared.</>
          )}
        </div>

        {declared.length > 0 && (
          <section className="space-y-2">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
              Your specializations
            </p>
            {declared.map((entry) => (
              <SpecRow key={entry.spec.id} entry={entry} basis={basis} />
            ))}
          </section>
        )}

        <section className="space-y-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
            {declared.length > 0 ? 'Everything else' : 'All specializations'}
          </p>
          {others.map((entry) => (
            <SpecRow key={entry.spec.id} entry={entry} basis={basis} />
          ))}
        </section>

        <p className="text-slate-600 text-[11px] leading-relaxed">
          A specialization needs {SPEC_REQUIRED_CREDITS} courses carrying its tag plus every course
          the school marks mandatory for it. Staggered courses (CIVB) count once, not once per
          block.
        </p>
      </DialogContent>
    </Dialog>
  );
}
