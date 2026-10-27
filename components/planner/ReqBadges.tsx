import type { CSSProperties, ReactNode } from 'react';
import type { Course, SpecId } from '@/types';
import { SPECS } from '@/data/courses';
import { mandatoryReq } from '@/lib/mandatory';

/**
 * 'Req. <SPEC>' badges for a course's `mandatoryFor`. Always renders every spec:
 *  - declared specs → red badge (unchanged look),
 *  - specs the user has not declared → muted dashed-outline badge in the spec's own colour,
 *    with a tooltip saying it is not one of the user's specializations.
 * Renders nothing when `mandatoryFor` is empty.
 */
export type ReqBadgeVariant =
  /** Uppercase tracked chip (list cards, CourseBar, modal). */
  | 'chip'
  /** Chip without uppercase (plan-style week list). */
  | 'chip-plain'
  /** Bare red text line for compact timetable cells. */
  | 'text';

interface Props {
  course: Pick<Course, 'mandatoryFor'>;
  userSpecs: readonly string[];
  variant?: ReqBadgeVariant;
  /** One badge per spec ('each') or one 'Req. A/B' per group ('joined'). */
  grouping?: 'each' | 'joined';
  /** Kyoto planner look: inline styles + its body font instead of Tailwind classes. */
  kyoto?: boolean;
  /** Extra classes on every badge (e.g. flex-shrink-0). */
  className?: string;
}

const RED = '#dc2626';
const MUTED_BORDER = '#94a3b8';
const MUTED_FALLBACK = '#475569';

const TW_CLASS: Record<ReqBadgeVariant, string> = {
  chip: 'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
  'chip-plain': 'text-[9px] font-bold px-1.5 py-0.5 rounded',
  text: 'text-[9px] font-bold',
};

const KYOTO_STYLE: Record<ReqBadgeVariant, CSSProperties> = {
  chip: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 2 },
  'chip-plain': { fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 2, fontFamily: 'var(--font-body)' },
  text: { fontSize: 9, fontWeight: 700 },
};

function specLabel(id: SpecId): string {
  return SPECS.find(s => s.id === id)?.label ?? id;
}

function specColor(id: SpecId): string | undefined {
  return SPECS.find(s => s.id === id)?.color;
}

export function ReqBadges({ course, userSpecs, variant = 'chip', grouping = 'each', kyoto = false, className = '' }: Props) {
  const { declaredReq, otherReq } = mandatoryReq(course, userSpecs);
  if (declaredReq.length === 0 && otherReq.length === 0) return null;

  const groups = (ids: SpecId[]): SpecId[][] =>
    ids.length === 0 ? [] : grouping === 'joined' ? [ids] : ids.map(id => [id]);

  const base = (extra: CSSProperties): { className?: string; style: CSSProperties } =>
    kyoto
      ? { className: className || undefined, style: { ...KYOTO_STYLE[variant], ...extra } }
      : { className: `${TW_CLASS[variant]}${className ? ` ${className}` : ''}`, style: extra };

  const declared = groups(declaredReq).map(ids => {
    const { className: cls, style } = base(
      variant === 'text' ? { color: RED } : { backgroundColor: '#dc262615', color: RED },
    );
    return (
      <span key={`req-${ids.join('/')}`} className={cls} style={style} data-req="declared">
        Req. {ids.join('/')}
      </span>
    );
  });

  const muted = groups(otherReq).map(ids => {
    const { className: cls, style } = base({
      backgroundColor: 'transparent',
      border: `1px dashed ${MUTED_BORDER}`,
      color: ids.length === 1 ? specColor(ids[0]) ?? MUTED_FALLBACK : MUTED_FALLBACK,
      ...(variant === 'text' ? { padding: '0 4px', borderRadius: 3 } : null),
    });
    return (
      <span
        key={`req-other-${ids.join('/')}`}
        className={cls}
        style={style}
        data-req="other"
        title={`Required for ${ids.map(specLabel).join(' / ')} (not one of your specializations)`}
      >
        Req.{' '}
        {ids.map((id, i): ReactNode => (
          <span key={id} style={{ color: specColor(id) ?? MUTED_FALLBACK }}>
            {i > 0 ? '/' : ''}{id}
          </span>
        ))}
      </span>
    );
  });

  const badges = [...declared, ...muted];
  if (variant === 'text') {
    return kyoto ? (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>{badges}</div>
    ) : (
      <div className="flex flex-wrap gap-1 mt-0.5">{badges}</div>
    );
  }
  return <>{badges}</>;
}
