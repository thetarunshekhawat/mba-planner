// Paged Supabase reads.
//
// PostgREST returns at most 1000 rows per request, silently. `user_events` is
// already ~16k rows, and a plain `.select()` hands back an arbitrary 1000 of
// them — arbitrary because without an ORDER BY, *which* 1000 is undefined. Every
// number derived from that slice is then wrong, in a way nothing surfaces.
//
// This was the bug behind the admin dashboard's pre-Metrics figures. The helper
// lived inside AdminDashboard.tsx; the alerts dispatcher needs exactly the same
// paging over `alert_tracks` and `push_subscriptions`, so it lives here now and
// the dashboard imports it.

export const PAGE = 1000;

/**
 * Runs `build()` repeatedly with a moving `.range()` until the table is
 * exhausted.
 *
 * `build` must return a *fresh* PostgREST query each call — Supabase query
 * builders are single-use, so reusing one silently returns the first page over
 * and over.
 *
 *   const rows = await fetchAllRows<EventRow>(() =>
 *     supabase.from('user_events').select('*').order('id'));
 *
 * Always give the query an `.order()`. Paging an unordered table can repeat and
 * skip rows, which is the same class of wrongness this helper exists to fix.
 */
export async function fetchAllRows<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build: () => any,
  hardCap = 100_000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < hardCap; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error || !data) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}
