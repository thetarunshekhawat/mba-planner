'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetches the registrar section assignments for a set of friends into
 * Map<friendId, Map<courseId, 'A' | 'B'>>. Reads are allowed by the existing
 * `course_sections_read_all` RLS policy — the same one the grid already relies
 * on to filter your own timings.
 *
 * Without this the overlay draws every part of a friend's course, so a friend
 * in the other section shows up in your slot instead of theirs.
 */
export function useFriendSections(friendIds: string[]): Map<string, Map<number, string>> {
  const supabase = createClient();
  const [byFriend, setByFriend] = useState<Map<string, Map<number, string>>>(new Map());

  // Stable dependency: re-fetch only when the set of ids actually changes.
  const key = friendIds.slice().sort().join(',');

  useEffect(() => {
    if (friendIds.length === 0) { setByFriend(new Map()); return; }
    let cancelled = false;

    supabase
      .from('course_sections')
      .select('user_id, course_id, section')
      .in('user_id', friendIds)
      .then(({ data }) => {
        if (cancelled) return;
        const m = new Map<string, Map<number, string>>();
        friendIds.forEach(id => m.set(id, new Map()));
        (data ?? []).forEach(r => {
          const uid = r.user_id as string;
          if (!m.has(uid)) m.set(uid, new Map());
          m.get(uid)!.set(r.course_id as number, r.section as string);
        });
        setByFriend(m);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return byFriend;
}
