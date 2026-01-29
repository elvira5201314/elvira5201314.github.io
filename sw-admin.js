// 版本號：每次修改 sw-admin.js 時，這裡稍微改一下 (例如 v2, v3) 確保瀏覽器知道有更新
const CACHE_NAME = 'soosi-admin-v1';

// 要快取的靜態資源 (不包含 admin.html，因為我們要讓它優先走網路)
const ASSETS_TO_CACHE = [
  './logo.png',
  // 如果有引用 css 或 js 也可以加在這裡，例如：
  // './style.css',
];

// 1. 安裝階段 (Install)
self.addEventListener('install', (event) => {
  // 🌟 關鍵：強制立刻接管，跳過等待期 (解決無限重整的元兇)
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: 快取靜態資源...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. 激活階段 (Activate)
self.addEventListener('activate', (event) => {
  // 🌟 關鍵：立刻控制所有頁面
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // 清理舊版本的快取
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('SW: 刪除舊快取', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// 3. 攔截請求 (Fetch)
self.addEventListener('fetch', (event) => {
  // 策略 A：如果是 HTML 頁面 (導航請求)，優先走網路 (Network First)
  // 這樣您改了 admin.html，使用者重整就能立刻看到，不用等 SW 更新
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // 如果沒網路，才回傳快取裡的 (如果之前有存的話) 或是回傳自定義離線頁
          return caches.match(event.request);
        })
    );
    return;
  }

  // 策略 B：其他的圖片、JS、CSS，優先走快取 (Cache First)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});