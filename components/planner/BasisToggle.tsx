'use client';

import { formatCampusDay, type ProgressBasis } from '@/lib/progress';

interface Props {
  basis: ProgressBasis;
  onChange: (basis: ProgressBasis) => void;
  today: string;
  className?: string;
}

/**
 * Which question the progress numbers answer: what the year adds up to, or what
 * has actually been taught so far. Rendered in both the sidebar and the
 * specialization dialog, bound to one piece of state, so they can't disagree.
 */
export function BasisToggle({ basis, onChange, today, className = '' }: Props) {
  const options: { value: ProgressBasis; label: string }[] = [
    { value: 'to-date', label: `As of ${formatCampusDay(today)}` },
    { value: 'full-year', label: 'Full year' },
  ];

  return (
    <div
      role="group"
      aria-label="Progress basis"
      className={`flex gap-1 p-0.5 rounded-lg bg-white/[0.06] border border-white/10 ${className}`}
    >
      {options.map((o) => {
        const active = basis === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className="flex-1 text-[11px] font-semibold px-2 py-1.5 rounded-md transition-colors"
            style={{
              backgroundColor: active ? 'rgba(56,189,248,0.18)' : 'transparent',
              color: active ? '#7dd3fc' : '#94a3b8',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
