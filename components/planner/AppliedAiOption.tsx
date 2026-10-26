'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { CREDIT_COUNTING_MANDATORY_CODE } from '@/lib/progress';

/**
 * Profile option shared by both planner sidebars (and, through the standard
 * FilterSidebar, the mobile drawer). Default off: ABMA counts toward the 16.
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
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          id={`${idPrefix}-exempt`}
          checked={checked}
          onCheckedChange={v => onChange(!!v)}
        />
        <span style={{ color, fontSize: 12 }}>I took the Applied AI course last year</span>
      </label>
      <p style={{ color: hintColor, fontSize: 11, marginTop: 4 }}>
        {checked
          ? `${CREDIT_COUNTING_MANDATORY_CODE} is not counted toward your 16 electives.`
          : `${CREDIT_COUNTING_MANDATORY_CODE} (Ringel) counts as 1 of your 16 electives.`}
      </p>
    </div>
  );
}
