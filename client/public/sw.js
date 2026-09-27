// SW Self-Cleanup v3 (2026-09-27)
// Bu Service Worker sadece kendini ve eski cache'leri temizlemek icin var.
// Eski browser cache'inde kalan SW registration'larini siler, sonra
// kendini de unregister eder. Boylece saloncebinde.com PWA offline'siz
// yeni bundle'a gecmis olur.

const CLEANUP_CACHE_NAME = 'saloon-sw-cleanup-v3';

self.addEventListener('install', (event) => {
  // Yeni SW'yi hemen aktif et (eski SW'yi bekletme)
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // 1. Tum Cache Storage entry'lerini sil (eski bundle'lar dahil)
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        console.log('[SW cleanup v3] Cleared', keys.length, 'cache entries:', keys);
      } catch (e) {
        console.warn('[SW cleanup v3] caches.delete failed:', e);
      }

      try {
        // 2. Kendimi (bu SW'yi) unregister et
        await self.registration.unregister();
        console.log('[SW cleanup v3] Self-unregistered.');
      } catch (e) {
        console.warn('[SW cleanup v3] self unregister failed:', e);
      }

      try {
        // 3. Tum acik client'lara "cache temizlendi" mesaji gonder
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_CLEANUP_DONE', cachesCleared: true });
        });
      } catch (e) {}
    })()
  );
});

// Aggressive: kendi fetch event'lerini de passthrough yap (hicbir seyi cache'leme)
self.addEventListener('fetch', (event) => {
  // Default: hicbir sey yapma, browser normal sekilde network'e gitsin
  return;
});
