/* Retires the old offline copy of the Genogram web app (the app is now on the App Store and Google Play).
   Browsers that still have the old service worker fetch this file, which deletes Genogram's own caches,
   unregisters itself and reloads open pages so they show the new page. Other isaymotion apps share
   this origin's cache storage, so only caches starting with "genogram-" are deleted. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.indexOf('genogram-') === 0).map((k) => caches.delete(k)));
    await self.registration.unregister();
    const open = await self.clients.matchAll({ type: 'window' });
    open.forEach((c) => c.navigate(c.url).catch(() => {}));
  })());
});
