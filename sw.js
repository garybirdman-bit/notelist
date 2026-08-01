// Sendlist Service Worker
// Стратегия: network-first. Всегда пытаемся взять свежую версию с сервера,
// и только если сети совсем нет — отдаём то, что успели закешировать раньше.
// Это исключает ситуацию, когда старая версия приложения "залипает" навсегда
// после обновления файлов на GitHub.

const CACHE_NAME = 'sendlist-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // не ждать закрытия старых вкладок — сразу активировать новую версию
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Удаляем все старые кеши от предыдущих версий SW
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
      await self.clients.claim(); // сразу начать управлять уже открытыми вкладками
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // Работаем только с обычными GET-запросами нашего же origin
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      try {
        // 1) Всегда сначала пробуем сеть — если есть интернет, отдаём самую свежую версию
        const networkResponse = await fetch(event.request);
        // Заодно обновляем кеш свежей копией, на случай если сеть пропадёт позже
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (err) {
        // 2) Сети нет — отдаём то, что было закешировано раньше (офлайн-режим)
        const cached = await caches.match(event.request);
        if (cached) return cached;
        throw err;
      }
    })()
  );
});
