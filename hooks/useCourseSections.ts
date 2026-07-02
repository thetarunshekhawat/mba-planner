'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useCourseSections(userId: string | null) {
  const [sections, setSections] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    supabase
      .from('course_sections')
      .select('course_id, section')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) {
          setSections(new Map(data.map(r => [r.course_id as number, r.section as string])));
        }
        setLoading(false);
      });
  }, [userId]);

  return { sections, loading };
}
