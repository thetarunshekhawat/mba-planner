// MBA Planner service worker — push notifications only.
//
// Deliberately does NOT cache anything. A caching service worker on a
// Next.js app is a good way to serve a student a stale build for a week, and
// the planner has no offline story to justify the risk. This file exists so
// that (a) the browser will grant a push subscription at all, and (b) a
// notification tap lands somewhere useful.

self.addEventListener('install', () => {
  // Take over immediately rather than waiting for every tab to close —
  // otherwise a student who just enabled notifications has to close the app
  // before the worker that receives them is active.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'MBA Planner', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'MBA Planner';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // Tagging by dedupe key means a re-sent reminder replaces the old one on
    // the lock screen instead of stacking a second copy.
    tag: payload.tag || undefined,
    data: { url: payload.url || '/planner' },
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/planner';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an already-open planner rather than opening a second copy.
      for (const client of clientList) {
        if (client.url.includes('/planner') && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
