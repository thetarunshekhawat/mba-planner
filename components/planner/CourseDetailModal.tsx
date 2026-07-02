'use client';

import { useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, PlusCircle, Star, BookOpen, Users } from 'lucide-react';
import type { Course } from '@/types';
import { SPECS, normalizeWorkload } from '@/data/courses';
import { fileHref } from '@/lib/storageLinks';

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
          fill={i < value ? '#f59e0b' : 'none'}
          stroke={i < value ? '#f59e0b' : '#94a3b8'}
        />
      ))}
    </span>
  );
}

export function CourseDetailModal({ course: courseProp, isSelected: isSelectedProp, onToggle, onClose }: Props) {
  // Snapshot the course + its selected state so the content stays rendered while the
  // sheet slides out (the parent zeroes these props the instant `course` goes null).
  const lastRef = useRef<{ course: Course; isSelected: boolean } | null>(null);
  if (courseProp) lastRef.current = { course: courseProp, isSelected: isSelectedProp };
  const snap = courseProp ? { course: courseProp, isSelected: isSelectedProp } : lastRef.current;
  const course = snap?.course ?? null;
  const isSelected = snap?.isSelected ?? false;

  const specObjects = course ? SPECS.filter(s => course.specs.includes(s.id)) : [];
  const isWaw = course?.type === 'waw';
  const isMandatory = course?.type === 'mandatory';
  const isExamOrFree = course?.type === 'exam' || course?.type === 'free';

  return (
    <Sheet open={!!courseProp} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto bg-slate-900 border-white/10 text-white"
      >
        {course && (
        <>
        <SheetHeader className="mb-6">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {isWaw && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                Ways of Working
              </Badge>
            )}
            {isMandatory && (
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                Mandatory
              </Badge>
            )}
            {specObjects.map(s => (
              <Badge
                key={s.id}
                style={{ backgroundColor: s.color + '33', color: s.color, borderColor: s.color + '55' }}
                className="text-xs border"
              >
                {s.label}
              </Badge>
            ))}
          </div>
          <SheetTitle className="text-white text-xl leading-tight">{course.name}</SheetTitle>
          {course.faculty && (
            <p className="text-slate-400 text-sm mt-1">{course.faculty}</p>
          )}
          <p className="text-slate-500 text-xs mt-1">{course.dates}</p>

          {course.outlineUrl && (
            <a
              href={fileHref(course.outlineUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 transition-colors text-sm font-medium border border-orange-500/20 w-full justify-center"
            >
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              Open Course Outline
            </a>
          )}

          {course.seatingCharts && course.seatingCharts.length > 0 && (
            <div className="mt-3">
              <p className="text-slate-400 text-xs font-medium mb-1.5">Seating Chart</p>
              <div className="flex gap-2">
                {course.seatingCharts.map(chart => (
                  <a
                    key={chart.section}
                    href={fileHref(chart.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:text-sky-200 transition-colors text-sm font-medium border border-sky-500/20"
                  >
                    <Users className="w-4 h-4 flex-shrink-0" />
                    Section {chart.section}
                  </a>
                ))}
              </div>
            </div>
          )}
        </SheetHeader>

        {course.review ? (
          <div className="space-y-6">
            {/* Ratings block */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Learning Depth</span>
                <Stars value={course.review.learningDepth} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Career Relevance</span>
                <Stars value={course.review.careerRelevance} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Workload</span>
                {(() => {
                  const w = normalizeWorkload(course.review!.workload);
                  return (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: w.color, backgroundColor: w.bg }}
                    >
                      {w.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* What you'll learn */}
            {course.review.whatYouLearn.length > 0 && (
              <div>
                <h3 className="text-slate-300 font-semibold text-sm mb-2">What you&apos;ll learn</h3>
                <div className="flex flex-wrap gap-1.5">
                  {course.review.whatYouLearn.map(tag => (
                    <span
                      key={tag}
                      className="text-xs bg-white/10 text-slate-300 px-2 py-1 rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            {course.review.highlights.length > 0 && (
              <div>
                <h3 className="text-slate-300 font-semibold text-sm mb-2">Highlights</h3>
                <ul className="space-y-2">
                  {course.review.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-300">
                      <span className="w-1 flex-shrink-0 bg-green-500 rounded-full mt-1.5" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lowlights */}
            {course.review.lowlights.length > 0 && (
              <div>
                <h3 className="text-slate-300 font-semibold text-sm mb-2">Watch out for</h3>
                <ul className="space-y-2">
                  {course.review.lowlights.map((l, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-300">
                      <span className="w-1 flex-shrink-0 bg-orange-400 rounded-full mt-1.5" />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary quote */}
            {course.review.summary && (
              <blockquote className="border-l-2 border-orange-500 pl-3 text-slate-400 italic text-sm">
                {course.review.summary}
              </blockquote>
            )}
          </div>
        ) : !isExamOrFree && !isWaw && !isMandatory ? (
          <p className="text-slate-500 text-sm">
            Review not yet available for this course.
          </p>
        ) : null}

        {/* CTA */}
        {!isWaw && !isMandatory && !isExamOrFree && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <Button
              onClick={() => onToggle(course.id)}
              className={`w-full font-semibold ${
                isSelected
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {isSelected ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Remove from plan</>
              ) : (
                <><PlusCircle className="w-4 h-4 mr-2" /> Add to plan</>
              )}
            </Button>
          </div>
        )}
        </>
        )}
      </SheetContent>
    </Sheet>
  );
}
