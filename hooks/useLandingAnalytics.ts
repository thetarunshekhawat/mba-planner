'use client';

import { useCallback, useEffect, useRef } from 'react';

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/landing_sessions';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function dbFetch(filter: string, method: 'POST' | 'PATCH', body: object) {
  return fetch(`${BASE}${filter}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: 'Bearer ' + ANON,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
}

export function useLandingAnalytics() {
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

    const existingRowId = sessionStorage.getItem('landing_row_id');
    const rowId = existingRowId ?? crypto.randomUUID();
    if (!existingRowId) sessionStorage.setItem('landing_row_id', rowId);
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

    // Only INSERT if this is a genuinely new session — existing row ID means
    // the row already landed in the DB (same tab reload, React StrictMode 2nd run).
    if (!existingRowId) {
      dbFetch('', 'POST', { id: rowId, anon_id: anonId, device_type: deviceType, browser });
    }

    function handlePageHide() {
      if (loginSucceededRef.current) return;
      const id = rowIdRef.current;
      if (!id) return;
      fetch(`${BASE}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: ANON,
          Authorization: 'Bearer ' + ANON,
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

  const trackRingTouch = useCallback(() => {
    if (hasTrackedFirstTouchRef.current) return;
    hasTrackedFirstTouchRef.current = true;
    const id = rowIdRef.current;
    if (!id) return;
    dbFetch(`?id=eq.${id}`, 'PATCH', { first_ring_interaction_at: new Date().toISOString() });
  }, []);

  const trackDragState = useCallback((dragging: boolean) => {
    if (dragging) {
      dragStartTimeRef.current = Date.now();
    } else if (dragStartTimeRef.current !== null) {
      ringInteractionMsRef.current += Date.now() - dragStartTimeRef.current;
      dragStartTimeRef.current = null;
      const id = rowIdRef.current;
      if (id) {
        dbFetch(`?id=eq.${id}`, 'PATCH', { ring_interaction_ms: ringInteractionMsRef.current });
      }
    }
  }, []);

  const trackLoginAttempted = useCallback(() => {
    const id = rowIdRef.current;
    if (!id) return;
    dbFetch(`?id=eq.${id}`, 'PATCH', { login_attempted: true });
  }, []);

  const linkToUser = useCallback((userId: string) => {
    loginSucceededRef.current = true;
    const id = rowIdRef.current;
    if (!id) return;
    dbFetch(`?id=eq.${id}`, 'PATCH', {
      user_id: userId,
      login_succeeded: true,
      ring_interaction_ms: ringInteractionMsRef.current,
    });
  }, []);

  return { trackRingTouch, trackDragState, trackLoginAttempted, linkToUser };
}
