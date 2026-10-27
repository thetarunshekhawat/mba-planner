import type { Course, SpecId } from '@/types';

export interface MandatoryReq {
  /** mandatoryFor specs that count for this user (all of them while nobody has declared). */
  declaredReq: SpecId[];
  /** mandatoryFor specs the user has not declared (only non-empty once userSpecs is non-empty). */
  otherReq: SpecId[];
  /** True when the course is required for one of the user's declared specs — drives the red card styling. */
  isMandatoryForUserSpec: boolean;
}

/**
 * Splits a course's `mandatoryFor` by the user's declared specializations.
 * With no declared specs every `mandatoryFor` spec is treated as declared (red), as before.
 */
export function mandatoryReq(
  course: Pick<Course, 'mandatoryFor'>,
  userSpecs: readonly string[],
): MandatoryReq {
  const all = course.mandatoryFor ?? [];
  const declaredReq = all.filter(s => userSpecs.length === 0 || userSpecs.includes(s));
  const otherReq = all.filter(s => !declaredReq.includes(s));
  return { declaredReq, otherReq, isMandatoryForUserSpec: declaredReq.length > 0 };
}
