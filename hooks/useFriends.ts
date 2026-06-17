'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Friend, SpecId } from '@/types';

export type AddFriendReason = 'code_not_found' | 'self_add' | 'already_friends' | 'error';
export type AddFriendResult =
  | { ok: true; friend: Friend }
  | { ok: false; reason: AddFriendReason };

/**
 * Loads the people the current user can see (their viewer→friend edges) and
 * exposes add/remove/regenerate actions. Mirrors the shape of useSelections.
 *
 * Add is two-way (the SECURITY DEFINER rpc inserts both directed rows);
 * remove is one-way (a plain RLS delete of only the viewer's own edge).
 */
export function useFriends(userId: string | null) {
  const supabase = createClient();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setFriends([]); setLoading(false); return; }

    const { data: edges } = await supabase
      .from('friendships')
      .select('friend_id, created_at')
      .eq('viewer_id', userId);

    if (!edges || edges.length === 0) { setFriends([]); setLoading(false); return; }

    const ids = edges.map(e => e.friend_id as string);
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, name, email, specializations, friend_code, avatar_url')
      .in('id', ids);

    const addedAtById = new Map(edges.map(e => [e.friend_id as string, e.created_at as string]));
    const list: Friend[] = (profs ?? []).map(p => ({
      id: p.id as string,
      name: (p.name as string) ?? '',
      email: (p.email as string) ?? '',
      specializations: (p.specializations as SpecId[]) ?? [],
      friendCode: (p.friend_code as string) ?? undefined,
      addedAt: addedAtById.get(p.id as string) ?? '',
      avatarUrl: (p.avatar_url as string) ?? undefined,
    }));
    // Newest first
    list.sort((a, b) => (a.addedAt < b.addedAt ? 1 : a.addedAt > b.addedAt ? -1 : 0));
    setFriends(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => { setLoading(true); refresh(); }, [refresh]);

  const addByCode = useCallback(async (code: string): Promise<AddFriendResult> => {
    if (!userId) return { ok: false, reason: 'error' };
    const trimmed = code.trim();
    if (!trimmed) return { ok: false, reason: 'code_not_found' };

    if (friends.some(f => f.friendCode && f.friendCode.toUpperCase() === trimmed.toUpperCase())) {
      return { ok: false, reason: 'already_friends' };
    }

    const { data, error } = await supabase.rpc('add_friend_by_code', { p_code: trimmed });
    if (error) {
      const msg = error.message || '';
      if (msg.includes('code_not_found')) return { ok: false, reason: 'code_not_found' };
      if (msg.includes('self_add')) return { ok: false, reason: 'self_add' };
      return { ok: false, reason: 'error' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    await refresh();
    return {
      ok: true,
      friend: {
        id: row?.friend_id,
        name: row?.friend_name ?? '',
        email: row?.friend_email ?? '',
        specializations: (row?.specializations as SpecId[]) ?? [],
        addedAt: new Date().toISOString(),
      },
    };
  }, [userId, friends, refresh]);

  const removeFriend = useCallback(async (friendId: string) => {
    if (!userId) return;
    setFriends(prev => prev.filter(f => f.id !== friendId)); // optimistic
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('viewer_id', userId)
      .eq('friend_id', friendId);
    if (error) refresh(); // revert by reloading truth
  }, [userId, refresh]);

  const regenerateCode = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.rpc('regenerate_friend_code');
    if (error) return null;
    return (data as string) ?? null;
  }, []);

  return { friends, loading, addByCode, removeFriend, regenerateCode, refresh };
}
