'use client';

import { CheckCircle2, Star } from 'lucide-react';
import type { Course } from '@/types';
import { SPECS, normalizeWorkload } from '@/data/courses';

interface Props {
  course: Course;
  isSelected: boolean;
  showReviews: boolean;
  userSpecs?: string[];
  onClick: () => void;
}

function MiniStars({ value }: { value: number }) {
  return (
    <span className="flex gap-px items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-2.5 h-2.5"
          fill={i < value ? '#f59e0b' : 'none'}
          stroke={i < value ? '#f59e0b' : '#d1d5db'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

export function CourseBar({ course, isSelected, showReviews, userSpecs = [], onClick }: Props) {
  const isWaw = course.type === 'waw';
  const isMandatory = course.type === 'mandatory';
  const isRequired = isWaw || isMandatory;

  const primarySpec = SPECS.find(s => course.specs.includes(s.id));

  // Color palette for light background
  let accentColor = '#64748b'; // slate-500 default
  if (isWaw)        accentColor = '#d97706'; // amber
  else if (isMandatory) accentColor = '#2563eb'; // blue
  else if (primarySpec) accentColor = primarySpec.color;

  // Mandatory-for-spec treatment
  const relevantMandatorySpecs = (course.mandatoryFor ?? []).filter(
    s => userSpecs.length === 0 || userSpecs.includes(s)
  );
  const isMandatoryForUserSpec = relevantMandatorySpecs.length > 0;

  const borderColor = isMandatoryForUserSpec ? '#dc2626' : accentColor;

  const bgSelected = accentColor + '18';
  const bgDefault  = accentColor + '0d';
  const bgMandatorySpec = 'linear-gradient(135deg, #fee2e280 0%, #fff5f5 100%)';

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg transition-all hover:shadow-sm active:scale-[0.995] cursor-pointer group"
      style={{
        background: isMandatoryForUserSpec
          ? bgMandatorySpec
          : isSelected && !isRequired
          ? bgSelected
          : bgDefault,
        borderLeft: `4px solid ${borderColor}`,
        outline: isSelected && !isRequired ? `2px solid ${accentColor}55` : 'none',
        outlineOffset: '1px',
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2 min-w-0">
        {/* Type badge */}
        {isWaw && (
          <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ backgroundColor: accentColor + '22', color: accentColor }}>
            WaW
          </span>
        )}
        {isMandatory && (
          <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ backgroundColor: accentColor + '22', color: accentColor }}>
            Req
          </span>
        )}
        {/* Mandatory-for-spec badge */}
        {isMandatoryForUserSpec && (
          <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ backgroundColor: '#dc262615', color: '#dc2626' }}>
            Req. {relevantMandatorySpecs.join('/')}
          </span>
        )}

        {/* Selected checkmark */}
        {isSelected && !isRequired && (
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accentColor }} />
        )}

        {/* Course name */}
        <span className="text-sm font-semibold text-gray-800 truncate flex-1 min-w-0 group-hover:text-gray-900">
          {course.name}
        </span>

        {/* Right side: reviews OR faculty */}
        {showReviews && course.review ? (
          <span className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-1">
              <MiniStars value={course.review.learningDepth} />
            </span>
            {(() => {
              const w = normalizeWorkload(course.review!.workload);
              return (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ color: w.color, backgroundColor: w.bg }}>
                  {w.label}
                </span>
              );
            })()}
          </span>
        ) : course.faculty ? (
          <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline max-w-[140px] truncate">
            {course.faculty.replace(/^(Prof\.|Dr\.) /, '')}
          </span>
        ) : null}

        {/* Spec dots */}
        {!isWaw && !isMandatory && course.specs.length > 0 && (
          <span className="flex gap-0.5 flex-shrink-0">
            {course.specs.slice(0, 2).map(specId => {
              const s = SPECS.find(sp => sp.id === specId);
              if (!s) return null;
              return (
                <span key={specId} className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.color }} title={s.label} />
              );
            })}
          </span>
        )}
      </div>
    </button>
  );
}
