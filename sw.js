// バージョンを更新（例: v2 -> v3）
const CACHE_NAME = 'ai-task-app-v3';

const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// インストール時に即座に新しいService Workerを有効化
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// 古いキャッシュを即座に削除して制御権を得る
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('古いキャッシュを削除:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// 【重要】ネットワーク優先 (Network First) 戦略に修正
// オンライン時は常に最新のコードを取得し、オフライン時のみキャッシュを使う
self.addEventListener('fetch', (event) => {
  // APIリクエスト（Google API等）はキャッシュ処理から除外する
  if (event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 取得成功したらキャッシュも最新に更新
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // ネット接続がない（オフライン）時だけキャッシュから返す
        return caches.match(event.request);
      })
  );
});