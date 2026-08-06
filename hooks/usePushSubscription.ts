'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EventType } from '@/hooks/useAnalytics';

type Track = (type: EventType, payload?: Record<string, unknown>) => void;

export type PushState =
  | 'unsupported'      // no service worker / no Push API
  | 'ios-needs-pwa'    // iOS Safari, not installed to the home screen
  | 'default'          // supported, not yet asked
  | 'granted'          // permission granted and subscribed
  | 'denied'           // permission refused — cannot be re-asked from JS
  | 'error';

/** base64url → Uint8Array, the shape `pushManager.subscribe` demands. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalised);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as a Mac; the touch points give it away.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Web push permission and subscription.
 *
 * **Never auto-prompts.** `enable()` runs only from an explicit button press.
 * A permission prompt fired on page load is the fastest way to get permanently
 * denied — and `denied` cannot be undone from JavaScript, so one bad prompt
 * costs that student notifications forever.
 *
 * The iOS case is real and worth detecting rather than letting fail: Safari
 * grants push only to an installed PWA, so on an un-installed iPhone the
 * subscribe call rejects with something unhelpful. `ios-needs-pwa` lets the UI
 * show Add-to-Home-Screen instructions instead of a button that cannot work.
 */
export function usePushSubscription(userId: string | null, trackEvent?: Track) {
  const [state, setState] = useState<PushState>('default');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState(isIos() && !isStandalone() ? 'ios-needs-pwa' : 'unsupported');
      return;
    }
    if (isIos() && !isStandalone()) {
      setState('ios-needs-pwa');
      return;
    }
    if (Notification.permission === 'granted') setState('granted');
    else if (Notification.permission === 'denied') setState('denied');
    else setState('default');
  }, []);

  const enable = useCallback(async () => {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    trackEvent?.('alert_push_prompt_shown');

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'default');
        trackEvent?.('alert_push_denied', { permission });
        setBusy(false);
        return;
      }

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error('Push is not configured on this deployment.');

      // Reuse an existing subscription if the browser already has one —
      // subscribing twice with the same key returns the same endpoint anyway,
      // but asking first avoids a needless round trip.
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
        }));

      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) throw new Error('Could not save the subscription.');

      setState('granted');
      trackEvent?.('alert_push_enabled');
    } catch (e) {
      setError((e as Error).message);
      setState('error');
    } finally {
      setBusy(false);
    }
  }, [userId, busy, trackEvent]);

  /**
   * Sends one notification to this user's devices.
   *
   * Worth its own button: the push chain has five links (service worker,
   * permission, subscription, VAPID keys, the push service) and a silent
   * failure in any of them is indistinguishable from "no reminders due yet".
   */
  const sendTest = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/alerts/test-push', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || json.sent === 0) {
        setError(json.error ?? 'Nothing was delivered — try turning notifications on again.');
        return false;
      }
      trackEvent?.('alert_push_test_sent', { sent: json.sent });
      return true;
    } catch {
      setError('Network error.');
      return false;
    }
  }, [trackEvent]);

  return { state, busy, error, enable, sendTest, isIos: isIos() };
}
