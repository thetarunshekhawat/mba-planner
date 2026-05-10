'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useSelections(userId: string | null) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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
      await supabase
        .from('course_selections')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId);
    } else {
      next.add(courseId);
      setSelected(next);
      await supabase
        .from('course_selections')
        .insert({ user_id: userId, course_id: courseId });
    }
  }, [userId, selected]);

  return { selected, loading, toggle };
}
