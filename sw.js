/* Offline support: network first, cached copy when offline. Bump VERSION on every publish.
   Cache names MUST start with this app's PREFIX: all isaymotion apps share one origin and one cache storage. */
const PREFIX = 'genogram-';
const VERSION = PREFIX + '1.7.0';
const CORE = ['./', './index.html', './css/app.css', './js/app.js', './js/genogram-engine.js', './data/app-meta.js', './data/changelog.js', './data/hospital.js', './data/strings.js', './data/content-tl.js', './manifest.webmanifest', './fonts/figtree-latin-wght-normal.woff2', './fonts/fraunces-latin-wght-normal.woff2', './fonts/fraunces-latin-wght-italic.woff2', './fonts/source-serif-4-latin-wght-normal.woff2', './fonts/source-serif-4-latin-wght-italic.woff2', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
self.addEventListener('install', (event) => {
  // add() one by one so a not-yet-uploaded icon cannot make the whole install fail
  event.waitUntil(caches.open(VERSION).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      // Only delete this app's own old caches: other study apps on isaymotion.github.io share this cache storage.
      .then((keys) => Promise.all(keys.filter((k) => k.indexOf(PREFIX) === 0 && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
