/* Phone (App Store / Google Play) version only. Copied into www/ by build-web.js; never on the website.
   1. Keeps a copy of every saved item (keys starting "g:v1:") in the phone's own app storage (Capacitor Preferences),
      because the phone may clear a web view's storage when space runs low. If the web view's copy is gone, it is restored.
   2. window.GenoNative.save(): writes a picture, PDF, genogram file or backup to the cache and opens the native share sheet.
   3. window.GenoNative.bio / bioCheck(): Face ID, Touch ID or fingerprint for the passcode lock.
   Then it loads the app's own scripts (window.GENO_SCRIPTS) in order. */
(function () {
  'use strict';
  var PFX = 'g:v1:', C = window.Capacitor;
  function loadApp() {
    var list = (window.GENO_SCRIPTS || []).slice();
    (function next() {
      var src = list.shift(); if (!src) return;
      var s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = next; s.onerror = next; document.body.appendChild(s);
    })();
  }
  if (!C || !C.isNativePlatform || !C.isNativePlatform() || !C.registerPlugin) { loadApp(); return; }
  var Prefs = C.registerPlugin('Preferences'), Files = C.registerPlugin('Filesystem'), Share = C.registerPlugin('Share'), Bio = C.registerPlugin('NativeBiometric');
  var SP = Storage.prototype, rawSet = SP.setItem, rawDel = SP.removeItem;
  function mine(st, k) { return st === window.localStorage && typeof k === 'string' && k.indexOf(PFX) === 0; }
  SP.setItem = function (k, v) { rawSet.call(this, k, v); if (mine(this, k)) Prefs.set({ key: k, value: String(v) }).catch(function () {}); };
  SP.removeItem = function (k) { rawDel.call(this, k); if (mine(this, k)) Prefs.remove({ key: k }).catch(function () {}); };

  function localKeys() { var a = [], i, k; for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (k && k.indexOf(PFX) === 0) a.push(k); } return a; }
  function restore() {
    var have = localKeys();
    if (have.length) {   // the web view still has everything: make sure the phone's copy matches
      return Promise.all(have.map(function (k) { return Prefs.set({ key: k, value: localStorage.getItem(k) }); }));
    }
    return Prefs.keys().then(function (r) {
      var keys = (r && r.keys || []).filter(function (k) { return k.indexOf(PFX) === 0; });
      return Promise.all(keys.map(function (k) { return Prefs.get({ key: k }).then(function (g) { if (g && g.value != null) rawSet.call(localStorage, k, g.value); }); }));
    });
  }
  function toB64(data) {
    var bytes = typeof data === 'string' ? new TextEncoder().encode(data) : (data instanceof Uint8Array ? data : new Uint8Array(data));
    var out = '', i, step = 0x8000;
    for (i = 0; i < bytes.length; i += step) out += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    return btoa(out);
  }
  window.GenoNative = {
    bio: false,
    save: function (data, name) {
      var safe = String(name || 'genogram').replace(/[\/\\:*?"<>|]+/g, '-');
      return Files.writeFile({ path: safe, data: toB64(data), directory: 'CACHE' })
        .then(function (r) { return Share.share({ title: safe, files: [r.uri] }); });
    },
    bioCheck: function (reason) {
      return Bio.verifyIdentity({ reason: reason, title: 'Genogram', useFallback: false }).then(function () { return true; }, function () { return false; });
    }
  };
  var bioReady = Bio.isAvailable({ useFallback: false }).then(function (r) { window.GenoNative.bio = !!(r && r.isAvailable); }, function () {});
  Promise.all([restore().catch(function () {}), bioReady]).then(loadApp, loadApp);
})();
