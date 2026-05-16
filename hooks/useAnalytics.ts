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
  | 'filters_applied'
  | 'js_error'
  | 'rage_click'
  | 'login_complete'
  | 'user_signed_out'
  | 'modal_view_duration'
  | 'filter_dead_end'
  | 'admin_member_viewed'
  | 'calendar_accessed'
  | 'export_dialog_opened'
  | 'calendar_panel_opened'
  | 'sidebar_toggled';

export function useAnalytics(userId: string | null) {
  const supabase = createClient();
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  // Stable ref so error/rage-click handlers always call the latest trackEvent
  const trackEventRef = useRef<(eventType: EventType, payload?: Record<string, unknown>) => void>(() => {});

  // Insert session row; attach device fingerprint and fire login_complete
  useEffect(() => {
    if (!userId) return;

    supabase
      .from('user_sessions')
      .insert({ user_id: userId })
      .select('id')
      .single()
      .then(({ data }) => {
        if (!data?.id) return;
        const sid = data.id as string;
        sessionIdRef.current = sid;
        sessionStartRef.current = Date.now();

        const metadata = {
          device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile'
                     : /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome'
                 : navigator.userAgent.includes('Firefox') ? 'Firefox'
                 : navigator.userAgent.includes('Safari') ? 'Safari'
                 : navigator.userAgent.includes('Edge') ? 'Edge' : 'Other',
          os: navigator.userAgent.includes('Mac') ? 'macOS'
            : navigator.userAgent.includes('Windows') ? 'Windows'
            : navigator.userAgent.includes('Android') ? 'Android'
            : navigator.userAgent.includes('iPhone') ? 'iOS' : 'Other',
          screen_width: window.screen.width,
          screen_height: window.screen.height,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          connection_type: (navigator as any).connection?.effectiveType ?? null,
          page_load_ms: performance.timing
            ? performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
            : null,
        };
        supabase.from('user_sessions').update({ metadata }).eq('id', sid).then();
        trackEventRef.current('login_complete');
      });
  }, [userId]);

  // Session-end beacon + global JS error + rage-click listeners
  useEffect(() => {
    if (!userId) return;

    function endSession() {
      const sid = sessionIdRef.current;
      if (!sid) return;
      sessionIdRef.current = null;
      const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
      const payload = JSON.stringify({ session_id: sid, duration_seconds: duration });
      navigator.sendBeacon('/api/sessions/end', new Blob([payload], { type: 'application/json' }));
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') endSession();
    };

    function handleWindowError(event: ErrorEvent) {
      trackEventRef.current('js_error', {
        message: event.message?.slice(0, 200),
        filename: event.filename,
        lineno: event.lineno,
        stack: event.error?.stack?.slice(0, 600),
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      trackEventRef.current('js_error', {
        message: String(event.reason)?.slice(0, 200),
        type: 'unhandled_rejection',
        stack: event.reason?.stack?.slice(0, 600),
      });
    }

    const clickTracker = new Map<string, { count: number; lastTime: number }>();
    function handleRageClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const key = `${target.tagName}:${target.textContent?.slice(0, 30) ?? ''}`;
      const now = Date.now();
      const entry = clickTracker.get(key);
      if (entry && now - entry.lastTime < 500) {
        entry.count++;
        entry.lastTime = now;
        if (entry.count >= 3) {
          trackEventRef.current('rage_click', {
            element_tag: target.tagName,
            element_text: target.textContent?.slice(0, 50),
            click_count: entry.count,
          });
          clickTracker.delete(key);
        }
      } else {
        clickTracker.set(key, { count: 1, lastTime: now });
      }
    }

    window.addEventListener('pagehide', endSession);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    document.addEventListener('click', handleRageClick);

    return () => {
      window.removeEventListener('pagehide', endSession);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('click', handleRageClick);
    };
  }, [userId]);

  const trackEvent = useCallback(
    (eventType: EventType, payload?: Record<string, unknown>) => {
      if (!userId) return;
      supabase.from('user_events').insert({
        user_id: userId,
        event_type: eventType,
        payload: payload ?? null,
        occurred_at: new Date().toISOString(),
      }).then();
    },
    [userId],
  );

  // Keep ref in sync so listeners always call the latest closure
  trackEventRef.current = trackEvent;

  return { trackEvent };
}
