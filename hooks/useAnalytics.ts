'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export type EventType =
  | 'course_viewed'
  | 'course_selected'
  | 'course_removed'
  | 'spec_toggled'
  | 'export_triggered'
  | 'view_changed'
  | 'filters_applied';

export function useAnalytics(userId: string | null) {
  const supabase = createClient();
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number>(Date.now());

  // Insert a session row on mount; store its id for session-end reporting
  useEffect(() => {
    if (!userId) return;

    supabase
      .from('user_sessions')
      .insert({ user_id: userId })
      .select('id')
      .single()
      .then(({ data }) => {
        if (data?.id) {
          sessionIdRef.current = data.id as string;
          sessionStartRef.current = Date.now();
        }
      });
  }, [userId]);

  // End the session reliably on tab close / switch / phone lock
  useEffect(() => {
    if (!userId) return;

    function endSession() {
      const sid = sessionIdRef.current;
      if (!sid) return;
      sessionIdRef.current = null; // prevent double-send
      const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
      const payload = JSON.stringify({ session_id: sid, duration_seconds: duration });
      // sendBeacon survives tab close and sends cookies (required for auth)
      navigator.sendBeacon('/api/sessions/end', new Blob([payload], { type: 'application/json' }));
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') endSession();
    };

    // pagehide fires on mobile Safari where beforeunload doesn't
    window.addEventListener('pagehide', endSession);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pagehide', endSession);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userId]);

  const trackEvent = useCallback(
    (eventType: EventType, payload?: Record<string, unknown>) => {
      if (!userId) return;
      // Fire-and-forget — never blocks the UI
      supabase.from('user_events').insert({
        user_id: userId,
        event_type: eventType,
        payload: payload ?? null,
        occurred_at: new Date().toISOString(),
      });
    },
    [userId],
  );

  return { trackEvent };
}
