import type { Course } from '@/types';

function slotMinutes(timeStr: string): [number, number] {
  const [start, end] = timeStr.split('–').map(t => {
    const [h, m] = t.trim().split(':').map(Number);
    return h * 60 + m;
  });
  return [start, end];
}

function slotsOverlap(a: string, b: string): boolean {
  const [startA, endA] = slotMinutes(a);
  const [startB, endB] = slotMinutes(b);
  return startA < endB && startB < endA;
}

function datesOverlap(a: Course, b: Course): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export interface SectionAdvisory {
  message: string;
  sectionBSlot: string;
}

/**
 * Returns a map of courseId → advisory for courses where Section A overlaps
 * with another selected course but Section B does not.
 * These are NOT real conflicts — the school resolves them via section assignment.
 */
export function getSectionAdvisories(
  courses: Course[],
  visibleIds: Set<number>,
): Map<number, SectionAdvisory> {
  const visible = courses.filter(c => visibleIds.has(c.id) && c.timings?.length);
  const advisories = new Map<number, SectionAdvisory>();

  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i];
      const b = visible[j];

      if (!datesOverlap(a, b) || !a.timings || !b.timings) continue;

      for (const ta of a.timings) {
        for (const tb of b.timings) {
          if (!slotsOverlap(ta.slot, tb.slot)) continue;

          // Course A has a conflicting part-A slot — check if its part-B resolves it
          if (ta.part === 'A') {
            const altSlot = a.timings.find(t => t.part === 'B');
            if (altSlot && !b.timings.some(t => slotsOverlap(altSlot.slot, t.slot))) {
              const other = b.code ?? b.name;
              advisories.set(a.id, {
                sectionBSlot: altSlot.slot,
                message: `${a.code ?? a.name} Section A (${ta.slot}) overlaps with ${other} — you'll likely be placed in Section B (${altSlot.slot}).`,
              });
            }
          }

          // Course B has a conflicting part-A slot — check if its part-B resolves it
          if (tb.part === 'A') {
            const altSlot = b.timings.find(t => t.part === 'B');
            if (altSlot && !a.timings.some(t => slotsOverlap(altSlot.slot, t.slot))) {
              const other = a.code ?? a.name;
              advisories.set(b.id, {
                sectionBSlot: altSlot.slot,
                message: `${b.code ?? b.name} Section A (${tb.slot}) overlaps with ${other} — you'll likely be placed in Section B (${altSlot.slot}).`,
              });
            }
          }
        }
      }
    }
  }

  return advisories;
}
