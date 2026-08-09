'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
 * Registers the service worker, subscribes this browser, and stores the
 * subscription server-side.
 *
 * Assumes permission is already granted — it never asks. Safe to call again on
 * a browser that is already subscribed: `getSubscription()` reuses the existing
 * endpoint and `/api/alerts/subscribe` upserts on it, clearing `disabled_at` and
 * the failure count on the way through.
 *
 * Returns whether a *new* browser subscription had to be created — the signal
 * that this browser genuinely had none, as opposed to the call being a harmless
 * re-save of one it already had.
 */
async function subscribeAndSave(): Promise<{ created: boolean }> {
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

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

  return { created: !existing };
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
export function usePushSubscription(
  userId: string | null,
  trackEvent?: Track,
  /** Demo account: `push_subscriptions` writes are denied (migration 018), so the
   *  repair below would only ever produce a failing round trip. */
  readOnly = false,
) {
  const [state, setState] = useState<PushState>('default');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const repaired = useRef(false);

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

  /**
   * Granted permission is not the same thing as a working subscription, and the
   * UI above reads only the permission — so it can say "notifications on" about
   * a browser the server has no address for. That happens easily: dismiss the
   * Chrome prompt (which resolves `default`, so `enable()` returns before ever
   * subscribing), then allow the site later from the address bar. Permission is
   * now granted, no subscription was ever stored, and the collapsed card offers
   * no button to try again — a dead end that only the Test button reveals.
   *
   * So whenever permission is granted, make sure the subscription actually
   * exists. This cannot show a prompt — permission is already granted — so it
   * does not break the never-auto-prompt rule. It also repairs the other ways a
   * row goes missing: cleared site data, a rotated endpoint, a subscription
   * disabled after a run of failures.
   *
   * Needs `userId` because /api/alerts/subscribe authenticates the session.
   */
  useEffect(() => {
    if (state !== 'granted' || !userId || readOnly || repaired.current) return;
    repaired.current = true;

    let cancelled = false;
    (async () => {
      try {
        const { created } = await subscribeAndSave();
        // Only report the cases that were actually broken. Firing on every
        // healthy mount would add an event per page load to a table that is
        // already paged around (see the PostgREST cap in CLAUDE.md).
        if (created && !cancelled) trackEvent?.('alert_push_repaired');
      } catch (e) {
        if (cancelled) return;
        // Worth surfacing: if this failed, the reminders this card promises
        // will not arrive either. The triangle's tooltip carries the message.
        setError(
          `${(e as Error).message} Reminders won't reach this device until that succeeds.`,
        );
      }
    })();

    return () => { cancelled = true; };
  }, [state, userId, readOnly, trackEvent]);

  const enable = useCallback(async () => {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    trackEvent?.('alert_push_prompt_shown');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'default');
        trackEvent?.('alert_push_denied', { permission });
        setBusy(false);
        return;
      }

      await subscribeAndSave();

      // The repair effect has nothing left to do — this just stored the
      // subscription itself, and re-running would be a pointless second upsert.
      repaired.current = true;
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
