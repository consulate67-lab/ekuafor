// v2 — Network-only, eski CORS 500 cache temizle
const CACHE_NAME = 'saloon-v2-no-cache';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// fetch event handler YOK — her zaman network'e gider, cache kullanmaz
// (eski CORS 500 response cache temizlendi)