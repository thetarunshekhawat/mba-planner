'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useLandingAnalytics() {
  const supabase = createClient();
  const rowIdRef = useRef<string | null>(null);
  const loginSucceededRef = useRef(false);
  const ringInteractionMsRef = useRef(0);
  const hasTrackedFirstTouchRef = useRef(false);
  const dragStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let anonId = sessionStorage.getItem('landing_anon_id');
    if (!anonId) {
      anonId = crypto.randomUUID();
      sessionStorage.setItem('landing_anon_id', anonId);
    }

    // Generate the row ID client-side so rowIdRef is set synchronously —
    // avoids a race where ring interactions fire before the async upsert returns.
    let rowId = sessionStorage.getItem('landing_row_id');
    if (!rowId) {
      rowId = crypto.randomUUID();
      sessionStorage.setItem('landing_row_id', rowId);
    }
    rowIdRef.current = rowId;

    const deviceType = /Mobi|Android/i.test(navigator.userAgent)
      ? 'mobile'
      : /Tablet|iPad/i.test(navigator.userAgent)
      ? 'tablet'
      : 'desktop';
    const browser = navigator.userAgent.includes('Chrome')
      ? 'Chrome'
      : navigator.userAgent.includes('Firefox')
      ? 'Firefox'
      : navigator.userAgent.includes('Safari')
      ? 'Safari'
      : navigator.userAgent.includes('Edge')
      ? 'Edge'
      : 'Other';

    // Fire-and-forget: anon role only needs INSERT/UPDATE, not SELECT.
    supabase
      .from('landing_sessions')
      .upsert({ id: rowId, anon_id: anonId, device_type: deviceType, browser }, { onConflict: 'anon_id' })
      .then();

    // Mark abandoned on tab close / navigation (keepalive fetch works without custom headers issues)
    function handlePageHide() {
      if (loginSucceededRef.current) return;
      const rowId = rowIdRef.current;
      if (!rowId) return;
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/landing_sessions?id=eq.${rowId}`;
      fetch(url, {
        method: 'PATCH',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ abandoned: true, ring_interaction_ms: ringInteractionMsRef.current }),
        keepalive: true,
      });
    }

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  // Call on first pointer-down on the ring (once only)
  const trackRingTouch = useCallback(() => {
    if (hasTrackedFirstTouchRef.current) return;
    hasTrackedFirstTouchRef.current = true;
    const rowId = rowIdRef.current;
    if (!rowId) return;
    supabase
      .from('landing_sessions')
      .update({ first_ring_interaction_at: new Date().toISOString() })
      .eq('id', rowId)
      .then();
  }, []);

  // Call with true when drag starts, false when drag ends — accumulates time
  const trackDragState = useCallback((dragging: boolean) => {
    if (dragging) {
      dragStartTimeRef.current = Date.now();
    } else if (dragStartTimeRef.current !== null) {
      ringInteractionMsRef.current += Date.now() - dragStartTimeRef.current;
      dragStartTimeRef.current = null;
      // Persist accumulated time periodically (on each drag-end)
      const rowId = rowIdRef.current;
      if (rowId) {
        supabase
          .from('landing_sessions')
          .update({ ring_interaction_ms: ringInteractionMsRef.current })
          .eq('id', rowId)
          .then();
      }
    }
  }, []);

  // Call when user submits their email (step 1 of login)
  const trackLoginAttempted = useCallback(() => {
    const rowId = rowIdRef.current;
    if (!rowId) return;
    supabase
      .from('landing_sessions')
      .update({ login_attempted: true })
      .eq('id', rowId)
      .then();
  }, []);

  // Call after verifyOtp succeeds — links this anonymous session to the real user
  const linkToUser = useCallback((userId: string) => {
    loginSucceededRef.current = true;
    const rowId = rowIdRef.current;
    if (!rowId) return;
    supabase
      .from('landing_sessions')
      .update({
        user_id: userId,
        login_succeeded: true,
        ring_interaction_ms: ringInteractionMsRef.current,
      })
      .eq('id', rowId)
      .then();
  }, []);

  return { trackRingTouch, trackDragState, trackLoginAttempted, linkToUser };
}
