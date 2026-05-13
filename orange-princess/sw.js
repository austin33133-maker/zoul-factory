// 橙子公主 Service Worker
// 简单 cache-first 策略：首次加载缓存核心文件，后续离线可用
const CACHE = 'orange-princess-v1';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './assets/icon.svg',
  './src/main.js',
  './src/config.js',
  './src/storage.js',
  './src/audio.js',
  './src/utils.js',
  './src/game/board.js',
  './src/game/engine.js',
  './src/game/levels.js',
  './src/game/tasks.js',
  './src/scenes/map.js',
  './src/scenes/game.js',
  './src/scenes/shop.js',
  './src/scenes/decoration.js',
  './src/scenes/wheel.js',
  './src/scenes/battlepass.js',
  './src/ui/princess.js',
  './src/ui/modal.js',
  './src/ui/fruits.js',
  './src/ui/items.js',
  './src/assets/loader.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 单文件失败不阻塞整体安装
    await Promise.allSettled(CORE.map(url => cache.add(url)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 只缓存同源 GET 请求
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) {
      // 后台更新
      fetch(e.request).then(r => {
        if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
      }).catch(() => {});
      return cached;
    }
    try {
      const r = await fetch(e.request);
      if (r.ok) {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return r;
    } catch (err) {
      return new Response('offline', { status: 503 });
    }
  })());
});
