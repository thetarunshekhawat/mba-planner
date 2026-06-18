// Friend-comparison context for the chatbot. The current user's confirmed friends are
// the `friendships` (viewer→friend) edges; their course selections are already readable
// under the existing `selections_read_all` RLS policy — the friendship is the social
// gate. Everything here is computed deterministically so the model never counts friends
// or invents who is taking what: it only narrates the numbers in the block it's given.

import { ALL_COURSES } from '@/data/courses';
import type { SupabaseClient } from '@supabase/supabase-js';

const COURSE_BY_ID = new Map(ALL_COURSES.map((c) => [c.id, c]));

export interface FriendLite {
  id: string;
  name: string;
}

export interface FriendComparisonRow {
  name: string;
  total: number; // # recognized courses they've selected
  sharedCount: number;
  shared: string[]; // course names you both selected
  theirOnly: string[]; // courses they selected that you didn't
}

/** The current user's confirmed friends (viewer→friend edges), names only. Cheap —
 *  used for intent routing (does the message mention a friend?) on every message. */
export async function fetchFriends(
  supabase: SupabaseClient,
  userId: string,
): Promise<FriendLite[]> {
  const { data: edges } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('viewer_id', userId);
  const ids = (edges ?? []).map((e) => e.friend_id as string);
  if (ids.length === 0) return [];

  const { data: profs } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', ids);
  return (profs ?? []).map((p) => ({
    id: p.id as string,
    name: (p.name as string) ?? '',
  }));
}

/** Build a compact comparison block + structured rows for the prompt. This runs the
 *  heavier query (friends' selections), so only call it on friend_compare intent. */
export async function buildFriendComparison(
  supabase: SupabaseClient,
  friends: FriendLite[],
  mySelectedIds: Set<number>,
): Promise<{ block: string; rows: FriendComparisonRow[] }> {
  if (friends.length === 0) {
    return {
      block:
        'FRIENDS CONTEXT: The student has not added any friends yet. They can add a friend by entering that person\'s friend code in the Friends tab. Tell them this plainly — do not invent friends or comparisons.',
      rows: [],
    };
  }

  const friendIds = friends.map((f) => f.id);
  const { data } = await supabase
    .from('course_selections')
    .select('user_id, course_id')
    .in('user_id', friendIds);

  const byFriend = new Map<string, Set<number>>();
  friendIds.forEach((id) => byFriend.set(id, new Set()));
  (data ?? []).forEach((r) => {
    const set = byFriend.get(r.user_id as string);
    if (set) set.add(r.course_id as number);
  });

  const nameOf = (id: number) => COURSE_BY_ID.get(id)?.name ?? null;
  const myNames = new Set(
    [...mySelectedIds].map(nameOf).filter((n): n is string => !!n),
  );

  const rows: FriendComparisonRow[] = friends.map((f) => {
    const ids = byFriend.get(f.id) ?? new Set<number>();
    const names = [...ids].map(nameOf).filter((n): n is string => !!n);
    const shared = names.filter((n) => myNames.has(n));
    const theirOnly = names.filter((n) => !myNames.has(n));
    return {
      name: f.name || 'A friend',
      total: names.length,
      sharedCount: shared.length,
      shared,
      theirOnly,
    };
  });

  const lines: string[] = [
    "FRIENDS CONTEXT (the student's confirmed friends and their course picks — use ONLY these names and numbers; never invent friends, counts, or courses):",
    `The student has selected ${myNames.size} course(s).`,
  ];
  for (const r of rows) {
    const sharedNote = r.shared.length ? ` (shared: ${r.shared.join(', ')})` : '';
    const theirNote = r.theirOnly.length
      ? ` They are also taking: ${r.theirOnly.join(', ')}.`
      : '';
    lines.push(
      `- ${r.name}: ${r.total} course(s) selected; ${r.sharedCount} in common with the student${sharedNote}.${theirNote}`,
    );
  }
  return { block: lines.join('\n'), rows };
}
