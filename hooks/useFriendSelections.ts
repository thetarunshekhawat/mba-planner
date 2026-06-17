'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetches the course selections for a set of friends into
 * Map<friendId, Set<courseId>>. Reads are allowed by the existing
 * `selections_read_all` RLS policy — the friendship is the social gate.
 */
export function useFriendSelections(friendIds: string[]): Map<string, Set<number>> {
  const supabase = createClient();
  const [byFriend, setByFriend] = useState<Map<string, Set<number>>>(new Map());

  // Stable dependency: re-fetch only when the set of ids actually changes.
  const key = friendIds.slice().sort().join(',');

  useEffect(() => {
    if (friendIds.length === 0) { setByFriend(new Map()); return; }
    let cancelled = false;

    supabase
      .from('course_selections')
      .select('user_id, course_id')
      .in('user_id', friendIds)
      .then(({ data }) => {
        if (cancelled) return;
        const m = new Map<string, Set<number>>();
        friendIds.forEach(id => m.set(id, new Set()));
        (data ?? []).forEach(r => {
          const uid = r.user_id as string;
          if (!m.has(uid)) m.set(uid, new Set());
          m.get(uid)!.add(r.course_id as number);
        });
        setByFriend(m);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return byFriend;
}
