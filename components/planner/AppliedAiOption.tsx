'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { CREDIT_COUNTING_MANDATORY_CODE } from '@/lib/progress';

/**
 * Profile option shared by both planner sidebars (and, through the standard
 * FilterSidebar, the mobile drawer). Default off. When on, last year's Applied AI course is added as 1 more credit
 * (ABMA always counts either way).
 * `color` / `hintColor` let the Kyoto theme restyle it without a second component.
 */
export function AppliedAiOption({
  checked,
  onChange,
  idPrefix = 'applied-ai',
  color = '#94a3b8',
  hintColor = '#64748b',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  idPrefix?: string;
  color?: string;
  hintColor?: string;
}) {
  return (
    <div className="mt-3">
      <p
        style={{
          color,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 6,
        }}
      >
        Took this?
      </p>
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          id={`${idPrefix}-credit`}
          checked={checked}
          onCheckedChange={v => onChange(!!v)}
        />
        <span style={{ color, fontSize: 12 }}>Applied AI course (last year)</span>
      </label>
      <p style={{ color: hintColor, fontSize: 11, marginTop: 4 }}>
        {checked
          ? "Last year's Applied AI course is added as 1 more credit."
          : `${CREDIT_COUNTING_MANDATORY_CODE} (Ringel) already counts as 1 of your 16 electives.`}
      </p>
    </div>
  );
}
