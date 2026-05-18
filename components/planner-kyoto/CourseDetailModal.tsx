'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CheckCircle2, PlusCircle, Star } from 'lucide-react';
import type { Course } from '@/types';
import { SPECS, normalizeWorkload } from '@/data/courses';

interface Props {
  course: Course | null;
  isSelected: boolean;
  onToggle: (id: number) => void;
  onClose: () => void;
}

function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4"
          fill={i < value ? 'var(--accent)' : 'none'}
          stroke={i < value ? 'var(--accent)' : 'var(--dim)'}
        />
      ))}
    </span>
  );
}

function RippleBtn({ onClick, isSelected }: { onClick: () => void; isSelected: boolean }) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(r => [...r, { id, x, y }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 600);
    onClick();
  }

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 20px',
        borderRadius: 'var(--radius)',
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
        border: isSelected ? '1.5px solid var(--dim)' : 'none',
        backgroundColor: isSelected ? 'var(--raised)' : 'var(--accent)',
        color: isSelected ? 'var(--sand)' : '#fff',
        fontFamily: 'var(--font-body)',
        transition: 'background-color 150ms',
      }}
    >
      {isSelected ? (
        <><CheckCircle2 className="w-4 h-4" /> Remove from plan</>
      ) : (
        <><PlusCircle className="w-4 h-4" /> Add to plan</>
      )}
      {ripples.map(rp => (
        <span
          key={rp.id}
          className="animate-ripple"
          style={{
            position: 'absolute',
            left: rp.x - 20,
            top: rp.y - 20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.4)',
            pointerEvents: 'none',
          }}
        />
      ))}
    </button>
  );
}

export function CourseDetailModal({ course, isSelected, onToggle, onClose }: Props) {
  if (!course) return null;

  const specObjects = SPECS.filter(s => course.specs.includes(s.id));
  const isWaw = course.type === 'waw';
  const isMandatory = course.type === 'mandatory';
  const isExamOrFree = course.type === 'exam' || course.type === 'free';

  const badgeBase: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    padding: '3px 8px',
    borderRadius: 2,
    border: '1px solid',
    fontFamily: 'var(--font-body)',
  };

  return (
    <Sheet open={!!course} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--dim)',
          fontFamily: 'var(--font-body)',
          color: 'var(--cream)',
        }}
      >
        <SheetHeader style={{ marginBottom: 14 }}>
          {/* Type badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {isWaw && (
              <span style={{ ...badgeBase, backgroundColor: '#fffbeb', borderColor: '#fbbf24', color: '#b45309' }}>
                Ways of Working
              </span>
            )}
            {isMandatory && (
              <span style={{ ...badgeBase, backgroundColor: '#dbeafe', borderColor: '#93c5fd', color: '#1d4ed8' }}>
                Mandatory
              </span>
            )}
            {specObjects.map(s => (
              <span
                key={s.id}
                style={{ ...badgeBase, backgroundColor: s.color + '18', borderColor: s.color + '55', color: s.color }}
              >
                {s.label}
              </span>
            ))}
          </div>

          <SheetTitle
            style={{ color: 'var(--cream)', fontSize: 20, lineHeight: 1.3, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700 }}
          >
            {course.name}
          </SheetTitle>
          {course.faculty && (
            <p style={{ color: 'var(--ash)', fontSize: 13, marginTop: 4, fontFamily: 'var(--font-body)' }}>
              {course.faculty}
            </p>
          )}
          <p style={{ color: 'var(--mid)', fontSize: 11, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            {course.dates}
          </p>
        </SheetHeader>

        {/* Content with stagger animation — key resets on course change */}
        <div key={course.id}>
          {course.review ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {/* Ratings block */}
              <div
                className="animate-modal-block-in"
                style={{ animationDelay: '150ms', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--sand)', fontSize: 13 }}>Learning Depth</span>
                  <Stars value={course.review.learningDepth} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--sand)', fontSize: 13 }}>Career Relevance</span>
                  <Stars value={course.review.careerRelevance} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--sand)', fontSize: 13 }}>Workload</span>
                  {(() => {
                    const w = normalizeWorkload(course.review!.workload);
                    return (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 9999, color: w.color, backgroundColor: w.bg }}>
                        {w.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* What you'll learn */}
              {course.review.whatYouLearn.length > 0 && (
                <div className="animate-modal-block-in" style={{ animationDelay: '210ms' }}>
                  <h3 style={{ color: 'var(--sand)', fontWeight: 600, fontSize: 13, marginBottom: 8, fontFamily: 'var(--font-body)' }}>
                    What you&apos;ll learn
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {course.review.whatYouLearn.map(tag => (
                      <span
                        key={tag}
                        style={{ fontSize: 11, backgroundColor: 'var(--surface)', color: 'var(--sand)', padding: '4px 9px', borderRadius: 'var(--radius)', border: '1px solid var(--dim)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlights */}
              {course.review.highlights.length > 0 && (
                <div className="animate-modal-block-in" style={{ animationDelay: '270ms' }}>
                  <h3 style={{ color: 'var(--sand)', fontWeight: 600, fontSize: 13, marginBottom: 8, fontFamily: 'var(--font-body)' }}>
                    Highlights
                  </h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {course.review.highlights.map((h, i) => (
                      <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--cream)' }}>
                        <span style={{ width: 3, flexShrink: 0, backgroundColor: '#16a34a', borderRadius: 9999, marginTop: 5 }} />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Lowlights */}
              {course.review.lowlights.length > 0 && (
                <div className="animate-modal-block-in" style={{ animationDelay: '330ms' }}>
                  <h3 style={{ color: 'var(--sand)', fontWeight: 600, fontSize: 13, marginBottom: 8, fontFamily: 'var(--font-body)' }}>
                    Watch out for
                  </h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {course.review.lowlights.map((l, i) => (
                      <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--cream)' }}>
                        <span style={{ width: 3, flexShrink: 0, backgroundColor: '#d97706', borderRadius: 9999, marginTop: 5 }} />
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary quote */}
              {course.review.summary && (
                <blockquote
                  className="animate-modal-block-in"
                  style={{ animationDelay: '390ms', borderLeft: '2px solid var(--accent)', paddingLeft: 12, color: 'var(--ash)', fontStyle: 'italic', fontSize: 13, fontFamily: 'var(--font-display)' }}
                >
                  {course.review.summary}
                </blockquote>
              )}
            </div>
          ) : !isExamOrFree && !isWaw && !isMandatory ? (
            <p style={{ color: 'var(--ash)', fontSize: 13 }}>
              Review not yet available for this course.
            </p>
          ) : null}

          {/* CTA */}
          {!isWaw && !isMandatory && !isExamOrFree && (
            <div
              className="animate-modal-block-in"
              style={{ animationDelay: '200ms', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--dim)' }}
            >
              <RippleBtn onClick={() => onToggle(course.id)} isSelected={isSelected} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
