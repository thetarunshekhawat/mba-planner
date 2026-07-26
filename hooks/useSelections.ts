'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type OnEvent = (type: 'course_selected' | 'course_removed', courseId: number) => void;

/**
 * `readOnly` is the demo account (lib/demo.ts). Toggles still move local
 * state so the planner feels live, but nothing is written and no analytics
 * event fires. The database refuses these writes anyway (migration 015);
 * skipping them here just avoids a click that visibly snaps back.
 */
export function useSelections(userId: string | null, onEvent?: OnEvent, readOnly = false) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  // Stable ref so toggle doesn't need onEvent in its dependency array
  const onEventRef = useRef<OnEvent | undefined>(onEvent);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    supabase
      .from('course_selections')
      .select('course_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) setSelected(new Set(data.map(r => r.course_id as number)));
        setLoading(false);
      });
  }, [userId]);

  const toggle = useCallback(async (courseId: number) => {
    if (!userId) return;

    if (readOnly) {
      const next = new Set(selected);
      if (next.has(courseId)) next.delete(courseId); else next.add(courseId);
      setSelected(next);
      return;
    }

    const next = new Set(selected);
    if (next.has(courseId)) {
      next.delete(courseId);
      setSelected(next);
      const { error } = await supabase
        .from('course_selections')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId);
      if (error) {
        setSelected(new Set(selected));
      } else {
        onEventRef.current?.('course_removed', courseId);
      }
    } else {
      next.add(courseId);
      setSelected(next);
      const { error } = await supabase
        .from('course_selections')
        .insert({ user_id: userId, course_id: courseId });
      if (error) {
        setSelected(new Set(selected));
      } else {
        onEventRef.current?.('course_selected', courseId);
      }
    }
  }, [userId, selected, readOnly]);

  const selectBatch = useCallback(async (courseIds: number[]) => {
    if (!userId || courseIds.length === 0) return;
    const toAdd = courseIds.filter(id => !selected.has(id));
    if (toAdd.length === 0) return;
    const next = new Set(selected);
    toAdd.forEach(id => next.add(id));
    setSelected(next);
    if (readOnly) return;
    await supabase
      .from('course_selections')
      .upsert(toAdd.map(course_id => ({ user_id: userId, course_id })));
  }, [userId, selected, readOnly]);

  const deselectBatch = useCallback(async (courseIds: number[]) => {
    if (!userId || courseIds.length === 0) return;
    const toRemove = courseIds.filter(id => selected.has(id));
    if (toRemove.length === 0) return;
    const next = new Set(selected);
    toRemove.forEach(id => next.delete(id));
    setSelected(next);
    if (readOnly) return;
    await supabase
      .from('course_selections')
      .delete()
      .eq('user_id', userId)
      .in('course_id', toRemove);
  }, [userId, selected, readOnly]);

  return { selected, loading, toggle, selectBatch, deselectBatch };
}
