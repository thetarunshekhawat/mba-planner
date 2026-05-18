'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type OnEvent = (type: 'course_selected' | 'course_removed', courseId: number) => void;

export function useSelections(userId: string | null, onEvent?: OnEvent) {
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
  }, [userId, selected]);

  const selectBatch = useCallback(async (courseIds: number[]) => {
    if (!userId || courseIds.length === 0) return;
    const toAdd = courseIds.filter(id => !selected.has(id));
    if (toAdd.length === 0) return;
    const next = new Set(selected);
    toAdd.forEach(id => next.add(id));
    setSelected(next);
    await supabase
      .from('course_selections')
      .upsert(toAdd.map(course_id => ({ user_id: userId, course_id })));
  }, [userId, selected]);

  const deselectBatch = useCallback(async (courseIds: number[]) => {
    if (!userId || courseIds.length === 0) return;
    const toRemove = courseIds.filter(id => selected.has(id));
    if (toRemove.length === 0) return;
    const next = new Set(selected);
    toRemove.forEach(id => next.delete(id));
    setSelected(next);
    await supabase
      .from('course_selections')
      .delete()
      .eq('user_id', userId)
      .in('course_id', toRemove);
  }, [userId, selected]);

  return { selected, loading, toggle, selectBatch, deselectBatch };
}
