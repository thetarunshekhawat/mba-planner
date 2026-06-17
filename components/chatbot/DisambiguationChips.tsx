'use client';

import { Button } from '@/components/ui/button';

export interface Chip {
  code?: string;
  name: string;
}

export function DisambiguationChips({
  courses,
  onPick,
  disabled,
}: {
  courses: Chip[];
  onPick: (c: Chip) => void;
  disabled?: boolean;
}) {
  if (!courses.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1.5 pl-1">
      {courses.map((c) => (
        <Button
          key={c.code ?? c.name}
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onPick(c)}
        >
          {c.name}
        </Button>
      ))}
    </div>
  );
}
