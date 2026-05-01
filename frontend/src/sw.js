import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

cleanupOutdatedCaches();

// Precaching (App Shell)
precacheAndRoute(self.__WB_MANIFEST);

// Cache Images (Stale While Revalidate)
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'offlinepay-images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Cache Fonts (Cache First)
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'offlinepay-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// API Calls (Network First with Fallback)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'offlinepay-api',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100 }),
      new BackgroundSyncPlugin('sync-payments', {
        maxRetentionTime: 24 * 60 // 24 hours
      })
    ],
  })
);

// Offline Fallback for Navigations
const offlineFallbackPage = '/offline.html';
const handler = async (options) => {
  try {
    return await new NetworkFirst().handle(options);
  } catch (error) {
    return caches.match(offlineFallbackPage);
  }
};
registerRoute(new NavigationRoute(handler));

// Manual Background Sync Listener (if needed)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-payments') {
    event.waitUntil(syncPendingTransactions());
  }
});

async function syncPendingTransactions() {
  console.log('[SW] Background Sync Triggered: sync-payments');
  // Logic to call internal sync engine if possible, 
  // though usually SW just retries the failed requests caught by BackgroundSyncPlugin.
}

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
    console.log('[SW] OfflinePay Production Protocol Active');
});
