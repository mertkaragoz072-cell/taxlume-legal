/* NEXORA service worker — çevrimdışı oynama.
 * Strateji: kabuk (index, css, js, json) AĞ ÖNCELİKLİ (güncelleme hemen gelir, ağ yoksa önbellek); görseller/yazı tipi/ses ÖNBELLEK ÖNCELİKLİ (bir kez indirilir).
 * Sürüm: VERSION değişince eski önbellek silinir (tools/build_sw.py her yayın öncesi günceller). */
const VERSION = 'nexora-4b8287bfe1';
const CORE = ['./', './index.html', './manifest.webmanifest', './src/main.js', './src/styles/main.css', './data/asset_manifest.json'];
const isAsset = (u) => /\.(png|jpg|jpeg|webp|gif|svg|woff2?|ttf|mp3|ogg|wav)$/i.test(u.pathname);

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (isAsset(url)) {                                        // önbellek öncelikli
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); } return res; })));
  } else {                                                   // ağ öncelikli, çevrimdışıysa önbellek
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); } return res; }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
  }
});
