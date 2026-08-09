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
  | 'sidebar_toggled'
  | 'mobile_drawer_toggled'
  | 'mobile_drawer_spec_tapped'
  | 'term1_panel_toggled'
  | 'admin_dashboard_accessed'
  // Friends & schedule overlay
  | 'friend_tab_opened'
  | 'friend_code_copied'
  | 'friend_code_regenerated'
  | 'friend_add_attempted'
  | 'friend_added'
  | 'friend_add_failed'
  | 'friend_removed'
  | 'friend_detail_viewed'
  | 'friend_overlay_toggled'
  | 'friend_overlay_cleared'
  | 'friend_overlay_conflict_detected'
  // AI course chatbot
  | 'chatbot_opened'
  | 'chatbot_closed'
  | 'chatbot_new_chat'
  | 'chatbot_message_sent'
  | 'chatbot_disambiguation_shown'
  | 'chatbot_chip_clicked'
  | 'chatbot_answer_received'
  | 'chatbot_error'
  | 'chatbot_rate_limited'
  | 'chatbot_nudge_shown'
  | 'chatbot_nudge_clicked'
  | 'chatbot_nudge_dismissed'
  | 'chatbot_session_ended'
  | 'chatbot_first_message_delay'
  | 'chatbot_message_copied'
  | 'chatbot_action_clicked'
  | 'chatbot_navigate'
  // Course search
  | 'search_opened'
  | 'search_query'
  | 'search_chip_picked'
  | 'search_chip_removed'
  | 'search_no_results'
  | 'search_cleared'
  // Degree progress
  | 'progress_basis_changed'
  | 'spec_overview_opened'
  // Alerts — competition & deadline reminders
  | 'alerts_tab_opened'
  | 'alert_competition_add_opened'
  | 'alert_competition_url_submitted'
  | 'alert_competition_import_failed'
  | 'alert_competition_imported'
  | 'alert_competition_published'
  | 'alert_competition_tracked'
  | 'alert_track_failed'
  | 'alert_competition_untracked'
  | 'alert_notifications_toggled'
  | 'alert_round_expanded'
  | 'alert_card_expanded'
  | 'alert_competition_requested'
  | 'alert_competition_request_failed'
  | 'alert_round_link_clicked'
  | 'alert_reminder_sheet_opened'
  | 'alert_reminder_offset_toggled'
  | 'alert_reminder_absolute_set'
  | 'alert_reminder_absolute_cleared'
  | 'alert_elimination_prompt_shown'
  | 'alert_elimination_passed'
  | 'alert_elimination_failed'
  | 'alert_elimination_undone'
  | 'alert_custom_deadline_opened'
  | 'alert_custom_deadline_added'
  | 'alert_custom_deadline_completed'
  | 'alert_custom_deadline_deleted'
  | 'alert_inbox_opened'
  | 'alert_inbox_item_clicked'
  | 'alert_push_prompt_shown'
  | 'alert_push_enabled'
  | 'alert_push_denied'
  | 'alert_push_test_sent'
  | 'alert_push_repaired'
  | 'alert_push_ios_instructions_shown';

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
