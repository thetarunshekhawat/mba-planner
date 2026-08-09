'use client';

import { useState } from 'react';
import { Bell, BellRing, Check, Loader2, Share, Smartphone, TriangleAlert } from 'lucide-react';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import type { EventType } from '@/hooks/useAnalytics';

interface Props {
  userId: string | null;
  trackEvent: (type: EventType, payload?: Record<string, unknown>) => void;
  readOnly?: boolean;
}

/**
 * The notification permission card.
 *
 * Nothing here prompts on its own — the browser dialog opens only from the
 * button below. See usePushSubscription for why that matters.
 */
export function NotificationSettings({ userId, trackEvent, readOnly }: Props) {
  const { state, busy, error, enable, sendTest } = usePushSubscription(userId, trackEvent, readOnly);
  const [tested, setTested] = useState<'idle' | 'sending' | 'ok' | 'fail'>('idle');

  async function handleTest() {
    setTested('sending');
    const ok = await sendTest();
    setTested(ok ? 'ok' : 'fail');
    setTimeout(() => setTested('idle'), 4000);
  }

  // The demo account can't hold a push subscription (migration 018 blocks the
  // write), so offering the button would be a lie.
  if (readOnly) return null;

  // Once notifications are on there is nothing left to decide, so the card stops
  // being a card. A five-line panel earning its space while it is asking for a
  // decision does not keep earning it afterwards — it collapses to one row that
  // confirms the state and still offers the test.
  if (state === 'granted') {
    return (
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2 flex items-center gap-2">
        <BellRing className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <p className="text-[11px] text-slate-500 min-w-0 flex-1 truncate">
          <span className="font-semibold text-slate-700">Phone notifications on</span>
          {tested === 'ok' && <span className="text-emerald-600"> · sent, check your lock screen</span>}
        </p>
        <button
          onClick={handleTest}
          disabled={tested === 'sending'}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {tested === 'sending' ? <Loader2 className="w-3 h-3 animate-spin" />
            : tested === 'ok' ? <Check className="w-3 h-3 text-emerald-600" />
            : <Bell className="w-3 h-3" />}
          Test
        </button>
        {(error || tested === 'fail') && (
          <span className="shrink-0" title={error ?? 'The test notification did not arrive.'}>
            <TriangleAlert className="w-3.5 h-3.5 text-rose-500" />
          </span>
        )}
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <BellRing className="w-4 h-4 text-orange-500" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Phone notifications
        </h2>
      </div>

      {state === 'ios-needs-pwa' ? (
        <>
          <p className="text-xs text-slate-500 mb-3">
            iPhones only allow notifications once the app is on your home screen. It takes ten seconds:
          </p>
          <ol className="text-xs text-slate-600 space-y-1.5 mb-1">
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-slate-100 text-[10px] font-bold grid place-items-center mt-0.5">1</span>
              <span>Tap <Share className="w-3 h-3 inline -mt-0.5" /> Share in Safari&apos;s toolbar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-slate-100 text-[10px] font-bold grid place-items-center mt-0.5">2</span>
              <span>Choose <strong>Add to Home Screen</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-4 h-4 rounded-full bg-slate-100 text-[10px] font-bold grid place-items-center mt-0.5">3</span>
              <span>Open MBA Planner from your home screen and come back here</span>
            </li>
          </ol>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <Smartphone className="w-3 h-3" />
            This is a Safari restriction, not something we can work around.
          </p>
        </>
      ) : state === 'denied' ? (
        <p className="text-xs text-slate-500">
          Notifications are blocked for this site. You&apos;ll need to re-allow them in your
          browser&apos;s site settings — a page can&apos;t ask again once it&apos;s been refused.
        </p>
      ) : state === 'unsupported' ? (
        <p className="text-xs text-slate-500">
          This browser doesn&apos;t support web push. In-app alerts still work.
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-3">
            Get a reminder on your phone before a round closes — even when the site is closed.
          </p>
          <button
            onClick={enable}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Turn on notifications
          </button>
        </>
      )}

      {(error || tested === 'fail') && (
        <p className="mt-3 text-[11px] text-rose-600 bg-rose-50 rounded-lg px-3 py-2 flex items-start gap-1.5">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
          {error ?? 'The test notification did not arrive.'}
        </p>
      )}
    </section>
  );
}
