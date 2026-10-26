'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isDemoEmail } from '@/lib/demo';
import type { Profile } from '@/types';

/**
 * "I took the Applied AI course last year" — when true, that course is added as
 * one more credit on the Electives bar, on top of ABMA, which always counts
 * (see `appliedAiCredit` in lib/progress.ts).
 *
 * Stored as `profiles.took_applied_ai` (migration 024) AND in localStorage:
 *
 *  - Until 024 is applied the column does not exist: `select('*')` simply omits
 *    it (`profile.took_applied_ai` is undefined) and the update below errors,
 *    which is swallowed — so the choice lives in localStorage alone and nothing
 *    else on the profile breaks. The write is its own request, never bundled
 *    with the `specializations` update, so a missing column cannot fail that one.
 *  - Once the column exists the DB value is the source of truth across devices;
 *    a choice made before the migration (localStorage true, DB still false) is
 *    pushed up the first time the profile loads.
 *  - The demo account cannot write profiles (migration 015), so it is local-only.
 */
const LS_KEY = 'mbap.profile.tookAppliedAi';

function readLocal(): boolean {
  try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
}
function writeLocal(v: boolean): void {
  try { localStorage.setItem(LS_KEY, v ? '1' : '0'); } catch { /* private mode — falls back to session state */ }
}

export function useAppliedAiCredit(profile: Profile | null) {
  const [credit, setCredit] = useState(false);
  const profileId = profile?.id;
  const dbValue = profile?.took_applied_ai;
  const email = profile?.email;

  const persist = useCallback(async (id: string, value: boolean) => {
    if (isDemoEmail(email)) return;
    // Awaited on purpose: a PostgREST builder sends nothing until it is awaited.
    // An error here (column not migrated yet) is expected and non-fatal.
    await createClient().from('profiles').update({ took_applied_ai: value }).eq('id', id);
  }, [email]);

  useEffect(() => {
    if (!profileId) return;
    const local = readLocal();
    setCredit(dbValue === true || local);
    if (dbValue === false && local) void persist(profileId, true);
  }, [profileId, dbValue, persist]);

  const change = useCallback((next: boolean) => {
    setCredit(next);
    writeLocal(next);
    if (profileId) void persist(profileId, next);
  }, [profileId, persist]);

  return [credit, change] as const;
}
