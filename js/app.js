/* Genogram - app shell: router, menu, search, theme, text size, language, backup, What's new.
   Plain ES5 in one IIFE, no build step. To add a screen: add one entry to VIEWS and one to NAV
   (see "APP VIEWS" below). Patterns come from the isaymotion Companion apps (Stahl / DSMVapp),
   MSEtrainer and sheatrainer. */
(function () {
  'use strict';

  /* ===== Storage (try/catch so the app works with storage blocked) ===== */
  var PREFIX = 'g:v1:';
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ }
    },
    del: function (k) { try { localStorage.removeItem(PREFIX + k); } catch (e) {} }
  };

  /* ===== Key migration (for restyled apps whose storage PREFIX changed, so saved progress survives).
     map = { 'old:prefix:': 'sub-prefix' | function (rest, oldKey) { return 'new-suffix'; } }.
     Every localStorage key starting with an old prefix is copied under PREFIX, then the old key is removed.
     A string value is put in front of the rest of the key ('' just swaps the prefix); a function returns the new
     suffix (a falsy result skips that key). An existing key under PREFIX is never overwritten. ===== */
  function migrateKeys(map) {
    try {
      if (!map || typeof map !== 'object') return;
      var keys = [], i;
      for (i = 0; i < localStorage.length; i++) { var k0 = localStorage.key(i); if (k0) keys.push(k0); }
      Object.keys(map).forEach(function (oldP) {
        if (!oldP) return;
        var to = map[oldP], growing = PREFIX.indexOf(oldP) === 0;   // new prefix extends the old one: do not re-migrate
        keys.forEach(function (k) {
          if (k.indexOf(oldP) !== 0) return;
          if (growing && k.indexOf(PREFIX) === 0) return;
          var rest = k.slice(oldP.length), suffix = typeof to === 'function' ? to(rest, k) : (typeof to === 'string' ? to + rest : null);
          if (typeof suffix !== 'string' || !suffix) return;
          var nk = PREFIX + suffix;
          if (nk === k) return;
          try {
            if (localStorage.getItem(nk) == null) localStorage.setItem(nk, localStorage.getItem(k));
            localStorage.removeItem(k);
          } catch (e) { /* leave the old key in place */ }
        });
      });
    } catch (e) { /* storage unavailable */ }
  }
  if (window.MIGRATE_KEYS) migrateKeys(window.MIGRATE_KEYS);

  var META = window.APP_META || {};
  var CHANGELOG = window.APP_CHANGELOG || [];
  var ATTRIBUTION = META.attribution || '';
  var APP_NAME = META.name || document.title;
  var APP_LINKS = window.APP_LINKS || [];

  /* ===== Language: 'en' (default) or 'tl' (Tagalog). Shell UI strings live in data/strings.js. ===== */
  var STRINGS = window.STRINGS || {};
  var lang = store.get('lang', 'en') === 'tl' ? 'tl' : 'en';
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function t(key) {
    var s = STRINGS[lang] && has(STRINGS[lang], key) ? STRINGS[lang][key] : null;
    if (typeof s !== 'string' || !s) s = STRINGS.en && has(STRINGS.en, key) ? STRINGS.en[key] : null;
    return typeof s === 'string' && s ? s : key;
  }
  function tf(key, vars) { return t(key).replace(/\{(\w+)\}/g, function (m, k) { return vars && has(vars, k) ? String(vars[k]) : m; }); }
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[\[(.+?)\]\]/g, '<kbd>$1</kbd>'); }   // **bold** and [[key]] in strings
  function locale() { return lang === 'tl' ? 'fil' : undefined; }

  /* ===== Helpers ===== */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
    if (!m) return String(iso);
    return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(locale(), { month: 'long', day: 'numeric', year: 'numeric' });
  }

  var main = document.getElementById('main');
  var sidenav = document.getElementById('sidenav');
  var backdrop = document.getElementById('nav-backdrop');
  var menuBtn = document.getElementById('menu-btn');
  var tabMenu = document.getElementById('tab-menu');
  var qInput = document.getElementById('q');
  var suggestBox = document.getElementById('suggest');

  /* ===== Icons (inline SVG, 24x24, stroke = currentColor). NAV items refer to these by key. ===== */
  var ICONS = {
    home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    shapes: '<rect x="3.5" y="3.5" width="7.5" height="7.5"/><circle cx="17" cy="7.2" r="3.8"/><path d="M7.2 11v3.5h9.8V11M12 14.5V17M12 17l3.2 3.2L12 23.4 8.8 20.2z" transform="translate(0 -1.6)"/>',
    news: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || 'nav-ico') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS.star) + '</svg>';
  }

  /* ===== NAV: one entry per screen. Builds the sidenav (grouped by `group`) and the home tiles.
     {label, href, icon, group}  Optional: tile:false (keep off the home grid), badge:'news' (unseen What's new count),
     tkey:'nav.x' (label comes from data/strings.js). The "Other apps" group is added after these from window.APP_LINKS. ===== */
  var NAV = [
    { label: 'Your genograms', href: '#/', icon: 'home', group: 'Start', tile: false },
    { label: 'Symbols and lines', href: '#/symbols', icon: 'shapes', group: 'Screens' },
    { label: 'How to use', href: '#/guide', icon: 'book', group: 'Screens' },
    { label: 'What’s new', tkey: 'nav.whatsNew', href: '#/whats-new', icon: 'news', group: 'App', tile: false, badge: 'news' },
    { label: 'About', tkey: 'nav.about', href: '#/about', icon: 'info', group: 'App', tile: false }
  ];
  var NAV_GROUPS = { Start: 'nav.start', Screens: 'nav.screens', App: 'nav.app' };   // group name -> strings key
  function navLabel(n) { return n.tkey ? t(n.tkey) : n.label; }

  /* ===== Search index: fill with {title, text, href, kind}. Rebuild it from your own data if you like.
     The shell's own entries (What's new, About) are added by shellIndex() so they follow the language. ===== */
  var SEARCH_INDEX = [
    /* { title: 'Example', text: 'Words people might search for.', href: '#/example', kind: 'Screen' } */
  ];
  function shellIndex() {
    return [
      { title: t('nav.whatsNew'), text: t('search.newsText'), href: '#/whats-new', kind: t('nav.app') },
      { title: t('nav.about'), text: t('search.aboutText'), href: '#/about', kind: t('nav.app') }
    ];
  }

  /* ===== Theme: auto (match device) / light / dark. No data-theme attribute = match device. ===== */
  var THEME_ICONS = {
    auto: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
    dark: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    light: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  var darkMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function getTheme() {
    var cur = store.get('theme', 'auto');
    return cur === 'light' || cur === 'dark' ? cur : 'auto';
  }
  function applyTheme(mode) {
    var root = document.documentElement;
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode); else root.removeAttribute('data-theme');
    var dark = mode === 'dark' || (mode !== 'light' && darkMQ && darkMQ.matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0E1F20' : '#1C676E');
    var btn = document.getElementById('theme-btn');
    if (btn) {
      var label = tf('theme.label', { name: t('theme.' + mode) });
      btn.innerHTML = THEME_ICONS[mode];
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }
    var opts = document.querySelectorAll('[data-theme-opt]');
    for (var i = 0; i < opts.length; i++) opts[i].setAttribute('aria-pressed', opts[i].getAttribute('data-theme-opt') === mode ? 'true' : 'false');
    var radios = document.querySelectorAll('input[name="theme"]');   // the Theme segment on the About page
    for (var j = 0; j < radios.length; j++) radios[j].checked = radios[j].value === mode;
  }
  function setTheme(mode) {
    if (mode !== 'light' && mode !== 'dark') mode = 'auto';
    if (mode === 'auto') store.del('theme'); else store.set('theme', mode);
    applyTheme(mode);
  }
  applyTheme(getTheme());
  (function () {
    var btn = document.getElementById('theme-btn');
    if (btn) btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'auto';
      setTheme({ auto: 'light', light: 'dark', dark: 'auto' }[cur]);
    });
    function onDeviceChange() { applyTheme(document.documentElement.getAttribute('data-theme') || 'auto'); }
    if (darkMQ) { if (darkMQ.addEventListener) darkMQ.addEventListener('change', onDeviceChange); else if (darkMQ.addListener) darkMQ.addListener(onDeviceChange); }
  })();

  /* ===== Header height -> --top ===== */
  function headerH() { var t = document.querySelector('.topbar'); return t ? t.offsetHeight : 64; }
  function setTopVar() { document.documentElement.style.setProperty('--top', headerH() + 'px'); }
  window.addEventListener('resize', setTopVar);
  setTopVar();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setTopVar);

  /* ===== Text size (Aa panel) ===== */
  var TEXT_SIZES = [['90', 'textsize.smaller'], ['100', 'textsize.default'], ['112.5', 'textsize.larger'], ['125', 'textsize.largest']];   // [value, strings key]
  function syncSizeRadios(v) {   // the text-size segment on the About page
    var radios = document.querySelectorAll('input[name="aboutTextSize"]');
    for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === v;
  }
  function applyTextSize(v) {
    var ok = TEXT_SIZES.some(function (z) { return z[0] === v; });
    document.documentElement.style.fontSize = ok && v !== '100' ? v + '%' : '';
    setTopVar();
  }
  (function () {
    var btn = document.getElementById('textSizeBtn');
    if (!btn) return;
    var panel = document.createElement('div');
    panel.className = 'text-size-panel'; panel.id = 'textSizePanel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', t('textsize.title'));
    document.body.appendChild(panel);
    function build() {
      var cur = String(store.get('textSize', '100'));
      panel.setAttribute('aria-label', t('textsize.title'));
      panel.innerHTML = '<p class="text-size-panel__title">' + esc(t('textsize.title')) + '</p><div class="seg">' + TEXT_SIZES.map(function (z, i) {
        return '<label><input type="radio" name="textSize" value="' + z[0] + '"' + (cur === z[0] ? ' checked' : '') + '><span style="font-size:' + (0.82 + i * 0.1).toFixed(2) + 'rem">' + esc(t(z[1])) + '</span></label>';
      }).join('') + '</div>';
    }
    function open() { build(); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); var f = panel.querySelector('input:checked'); if (f) f.focus(); }
    function close() { if (panel.hidden) return; panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); if (panel.hidden) open(); else close(); });
    panel.addEventListener('change', function (e) {
      if (e.target.name === 'textSize') { store.set('textSize', e.target.value); applyTextSize(e.target.value); syncSizeRadios(e.target.value); }
    });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
    window.addEventListener('hashchange', close);
  })();

  /* ===== In-app back/forward buttons (index-stamped history) ===== */
  var HIST_KEY = PREFIX + 'hist';
  var hist = (function () { try { return JSON.parse(sessionStorage.getItem(HIST_KEY)) || { cur: 0, max: 0 }; } catch (e) { return { cur: 0, max: 0 }; } })();
  function saveHist() { try { sessionStorage.setItem(HIST_KEY, JSON.stringify(hist)); } catch (e) {} }
  function stamp(i) { try { history.replaceState({ spIdx: i }, ''); } catch (e) {} }
  function syncHist() {
    var st = history.state;
    if (st && typeof st.spIdx === 'number') {
      hist.cur = st.spIdx;
      if (hist.cur > hist.max) hist.max = hist.cur;
    } else {
      hist.cur = hist.cur + 1;     // a new page: anything that was ahead is discarded
      hist.max = hist.cur;
      stamp(hist.cur);
    }
    saveHist(); paintHist();
  }
  function paintHist() {
    var b = document.getElementById('nav-back'), f = document.getElementById('nav-fwd');
    if (b) b.disabled = hist.cur <= 0;
    if (f) f.disabled = hist.cur >= hist.max;
  }
  (function initHist() {
    var st = history.state;
    if (st && typeof st.spIdx === 'number') { hist.cur = st.spIdx; if (hist.max < hist.cur) hist.max = hist.cur; }
    else { hist = { cur: 0, max: 0 }; stamp(0); }
    saveHist(); paintHist();
    var b = document.getElementById('nav-back'), f = document.getElementById('nav-fwd');
    if (b) b.addEventListener('click', function () { if (!b.disabled) history.back(); });
    if (f) f.addEventListener('click', function () { if (!f.disabled) history.forward(); });
  })();

  /* Alt+Left / Alt+Right (ignores typing in fields and other modifiers) */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if (e.altKey && !typing && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      if (e.key === 'ArrowLeft') history.back(); else history.forward();
    }
  });

  /* ===== Scroll restoration (only on back/forward, not on ordinary link clicks) ===== */
  var scrollMemo = {}, scrollKey = location.hash || '#/', fromHistory = false, scrollPending = false;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('scroll', function () {
    if (scrollPending) return;
    scrollPending = true;
    setTimeout(function () { scrollPending = false; scrollMemo[scrollKey] = window.scrollY; }, 120);
  }, { passive: true });
  window.addEventListener('popstate', function (e) { fromHistory = !!(e.state && typeof e.state.spIdx === 'number'); });

  /* ===== Menu: docked sidebar on desktop, drawer on phones/tablets ===== */
  function isDrawerMode() { return window.matchMedia('(max-width: 1099px)').matches; }
  function setMenuExpanded(v) { [menuBtn, tabMenu].forEach(function (b) { if (b) b.setAttribute('aria-expanded', v ? 'true' : 'false'); }); }
  function openDrawer() {
    if (!isDrawerMode()) return;
    document.body.classList.add('drawer-open');
    backdrop.hidden = false;
    setMenuExpanded(true);
    var target = sidenav.querySelector('.sidenav__close');
    setTimeout(function () { if (target) target.focus(); }, 60);
  }
  function closeDrawer() {
    if (!document.body.classList.contains('drawer-open')) return;
    document.body.classList.remove('drawer-open');
    backdrop.hidden = true;
    setMenuExpanded(false);
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { openDrawer(); });
  if (tabMenu) tabMenu.addEventListener('click', function () { if (document.body.classList.contains('drawer-open')) closeDrawer(); else openDrawer(); });
  document.getElementById('nav-close').addEventListener('click', function () { closeDrawer(); if (menuBtn) menuBtn.focus(); });
  backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) { closeDrawer(); if (menuBtn) menuBtn.focus(); } });
  sidenav.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a && a.getAttribute('href') === location.hash) closeDrawer(); });
  var collapseBtn = document.getElementById('collapse-btn');   // desktop: hide/show the docked sidebar
  function labelCollapse() {
    var c = document.documentElement.classList.contains('nav-collapsed');
    collapseBtn.setAttribute('aria-label', t(c ? 'sidebar.show' : 'sidebar.hide'));
    collapseBtn.setAttribute('title', t(c ? 'sidebar.show' : 'sidebar.hide'));
  }
  collapseBtn.addEventListener('click', function () {
    var c = !document.documentElement.classList.contains('nav-collapsed');
    document.documentElement.classList.toggle('nav-collapsed', c);
    store.set('navCollapsed', c); labelCollapse(); setTopVar();
  });
  labelCollapse();

  /* APP_LINKS minus this app's own entry (matched on the repo slug at the end of the URL). Menu only: never tiles, search or tabs. */
  function otherApps() {
    if (!window.SHOW_OTHER_APPS) return [];   // off until she is ready to interlink the apps (data/app-meta.js)
    var me = String(META.repo || '').toLowerCase();
    return APP_LINKS.filter(function (a) {
      if (!a || !a.name || !/^https?:\/\//i.test(String(a.href || ''))) return false;
      var slug = String(a.href).replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop().toLowerCase();
      return !me || slug !== me;
    });
  }
  function currentKey() { var p = parts(); return p.length ? p[0] : 'home'; }
  function buildNav() {
    var cur = location.hash || '#/';
    if (cur === '#') cur = '#/';
    var groups = [], byName = {};
    NAV.forEach(function (n) {
      var g = n.group || 'Menu';
      if (!byName[g]) { byName[g] = { label: g, items: [] }; groups.push(byName[g]); }
      byName[g].items.push(n);
    });
    var html = groups.map(function (g) {
      return '<div class="nav-group"><div class="nav-label">' + esc(NAV_GROUPS[g.label] ? t(NAV_GROUPS[g.label]) : g.label) + '</div><ul>' + g.items.map(function (n) {
        var active = n.href === cur;
        return '<li><a class="nav-item' + (active ? ' is-active' : '') + '" href="' + esc(n.href) + '"' + (active ? ' aria-current="page"' : '') + '>' + icon(n.icon) + '<span>' + esc(navLabel(n)) + '</span>' +
          (n.badge ? '<span class="badge" data-badge="' + esc(n.badge) + '" hidden></span>' : '') + '</a></li>';
      }).join('') + '</ul></div>';
    }).join('');
    var others = otherApps();
    if (others.length) {
      html += '<div class="nav-group"><div class="nav-label">' + esc(t('nav.otherApps')) + '</div><ul>' + others.map(function (a) {
        return '<li><a class="nav-item" href="' + esc(a.href) + '" target="_blank" rel="noopener">' + icon('external') + '<span>' + esc(a.name) + '</span><span class="sr-only"> ' + esc(t('nav.newTab')) + '</span></a></li>';
      }).join('') + '</ul></div>';
    }
    document.getElementById('sidenav-body').innerHTML = html;
    var tabs = document.querySelectorAll('.tabbar [data-tab]');
    var key = currentKey();
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-tab') === key;
      if (tabs[i].tagName === 'A') { tabs[i].classList.toggle('is-active', on); if (on) tabs[i].setAttribute('aria-current', 'page'); else tabs[i].removeAttribute('aria-current'); }
    }
  }

  /* ===== What's new: unseen badge keyed on the version string ===== */
  function latestNewsVersion() { return CHANGELOG.length ? String(CHANGELOG[0].version) : ''; }
  function seenNewsVersion() {
    var s = store.get('seenNews', null);
    if (s == null) { s = latestNewsVersion(); store.set('seenNews', s); }   // brand-new visitors start up to date
    return s;
  }
  function unseenNews() {
    var seen = seenNewsVersion(), out = [];
    for (var i = 0; i < CHANGELOG.length; i++) {
      if (String(CHANGELOG[i].version) === seen) return out;
      out.push(CHANGELOG[i]);
    }
    return out;
  }
  function updateNavBadges() {
    var n = unseenNews().length;
    var els = document.querySelectorAll('[data-badge="news"]');
    for (var i = 0; i < els.length; i++) { els[i].textContent = n; els[i].hidden = !n; }
  }

  /* ===== Search ===== */
  var sugIndex = -1, sugTimer = null, searchKind = '';
  function terms(q) { return String(q).toLowerCase().replace(/[^\p{L}\p{N}\-\s.]/gu, ' ').split(/\s+/).filter(function (t) { return t.length > 0; }); }
  function runSearch(q) {
    var ts = terms(q);
    if (!ts.length) return [];
    var out = [];
    shellIndex().concat(SEARCH_INDEX).forEach(function (e) {
      var t = String(e.title || '').toLowerCase(), x = String(e.text || '').toLowerCase(), score = 0, ok = true;
      ts.forEach(function (w) {
        var iT = t.indexOf(w), iX = x.indexOf(w);
        if (iT < 0 && iX < 0) { ok = false; return; }
        if (iT >= 0) score += iT === 0 ? 6 : 4;
        if (iX >= 0) score += 1;
      });
      if (ok) out.push({ e: e, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.map(function (r) { return r.e; });
  }
  function highlight(text, ts) {
    text = String(text == null ? '' : text);
    if (!ts.length) return esc(text);
    var re = new RegExp('(' + ts.map(escRe).join('|') + ')', 'gi');
    return text.split(re).map(function (seg, i) { return i % 2 ? '<mark>' + esc(seg) + '</mark>' : esc(seg); }).join('');
  }
  function snippet(text, ts, len) {
    text = String(text || '');
    if (text.length <= len) return text;
    var low = text.toLowerCase(), at = -1;
    for (var i = 0; i < ts.length && at < 0; i++) at = low.indexOf(ts[i]);
    var start = Math.max(0, (at < 0 ? 0 : at) - 40);
    return (start > 0 ? '…' : '') + text.slice(start, start + len) + (start + len < text.length ? '…' : '');
  }
  function openSuggest(q) {
    q = String(q || '').trim();
    if (!q) { closeSuggest(); return; }
    var ts = terms(q), res = runSearch(q), shown = res.slice(0, 6);
    sugIndex = -1;
    qInput.removeAttribute('aria-activedescendant');
    if (!shown.length) {
      suggestBox.innerHTML = '<div class="suggest__empty">' + esc(tf('search.noMatches', { q: q })) + '</div>';
    } else {
      suggestBox.innerHTML = shown.map(function (e, i) {
        return '<a class="suggest__item" role="option" id="sug-' + i + '" href="' + esc(e.href) + '" aria-selected="false"><span class="suggest__meta"><span class="kind">' + esc(e.kind || '') + '</span><span>' + highlight(e.title, ts) + '</span></span><span class="suggest__text">' + highlight(snippet(e.text, ts, 140), ts) + '</span></a>';
      }).join('') + '<a class="suggest__item suggest__all" role="option" id="sug-all" href="#/search/' + encodeURIComponent(q) + '" aria-selected="false">' + esc(tf(res.length === 1 ? 'search.seeAll1' : 'search.seeAllN', { n: res.length })) + '</a>';
    }
    suggestBox.hidden = false;
    qInput.setAttribute('aria-expanded', 'true');
  }
  function closeSuggest() {
    if (!suggestBox) return;
    suggestBox.hidden = true; sugIndex = -1;
    qInput.setAttribute('aria-expanded', 'false');
    qInput.removeAttribute('aria-activedescendant');
  }
  function moveSug(d) {
    var items = suggestBox.querySelectorAll('.suggest__item');
    if (!items.length) return;
    sugIndex = (sugIndex + d + items.length) % items.length;
    items.forEach(function (it, i) { it.setAttribute('aria-selected', String(i === sugIndex)); });
    qInput.setAttribute('aria-activedescendant', items[sugIndex].id);
    items[sugIndex].scrollIntoView({ block: 'nearest' });
  }
  qInput.addEventListener('input', function () {
    clearTimeout(sugTimer);
    sugTimer = setTimeout(function () { openSuggest(qInput.value); }, 110);
  });
  qInput.addEventListener('focus', function () { if (qInput.value.trim()) openSuggest(qInput.value); });
  qInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (suggestBox.hidden) openSuggest(qInput.value); moveSug(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSug(-1); }
    else if (e.key === 'Escape') { closeSuggest(); qInput.blur(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      var items = suggestBox.querySelectorAll('.suggest__item');
      var target = sugIndex > -1 && items[sugIndex] ? items[sugIndex].getAttribute('href') : (qInput.value.trim() ? '#/search/' + encodeURIComponent(qInput.value.trim()) : null);
      closeSuggest();
      if (target) { if (location.hash === target) route(); else location.hash = target; qInput.blur(); }
    }
  });
  suggestBox.addEventListener('mousedown', function (e) { e.preventDefault(); });
  qInput.addEventListener('blur', function () { setTimeout(closeSuggest, 120); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target.matches && e.target.matches('input, textarea, select'))) { e.preventDefault(); qInput.focus(); qInput.select(); }
  });

  /* ===== Views ===== */
  var VIEWS = {};
  var AFTER = {};      // optional: AFTER.myScreen = function (arg) { ...wire events after render... }
  var TITLES = { home: '' };   // key -> page title (the shell's own titles come from SHELL_TITLES)
  var SHELL_TITLES = { 'whats-new': 'nav.whatsNew', about: 'nav.about', search: 'search.title' };

  VIEWS['whats-new'] = function () {
    var unseen = {};
    unseenNews().forEach(function (e) { unseen[String(e.version)] = true; });
    var html = '<div class="wrap page news"><header class="page__head"><h1>' + esc(t('nav.whatsNew')) + '</h1><p>' + esc(t('news.intro1')) + '<span class="news__new">' + esc(t('news.new')) + '</span>' + esc(t('news.intro2')) + '</p></header>' +
      CHANGELOG.map(function (e) {
        var isNew = !!unseen[String(e.version)];
        return '<article class="news__entry' + (isNew ? ' is-new' : '') + '"><div class="news__date"><time datetime="' + esc(e.date) + '">' + esc(fmtDate(e.date)) + '</time><span class="news__ver">' + esc(tf('news.version', { v: e.version })) + '</span>' + (isNew ? '<span class="news__new">' + esc(t('news.new')) + '</span>' : '') + '</div>' +
          '<div class="news__body"><h2>' + esc(e.title) + '</h2>' + (e.summary ? '<p>' + esc(e.summary) + '</p>' : '') + '<ul>' +
          (e.items || []).map(function (it) {
            var ty = String(it.type || 'feature'), tyLabel = t('news.type.' + ty);
            if (tyLabel === 'news.type.' + ty) tyLabel = ty.charAt(0).toUpperCase() + ty.slice(1);
            return '<li><span class="news__type news__type--' + esc(ty) + '">' + esc(tyLabel) + '</span><span class="news__text">' + esc(it.text) + (it.href ? ' <a href="' + esc(it.href) + '">' + esc(t('news.open')) + '</a>' : '') + '</span></li>';
          }).join('') + '</ul></div></article>';
      }).join('') +
      '<p class="news__note">' + esc(t('news.note')) + '<a href="mailto:isaymotion@gmail.com">isaymotion@gmail.com</a>.</p></div>';
    store.set('seenNews', latestNewsVersion());   // opening the page marks everything as seen
    return html;
  };

  function segGroup(name, label, opts, cur) {   // opts: [[value, label], ...]; radios inside the shared .seg control
    return '<fieldset class="setting"><legend>' + esc(label) + '</legend><div class="seg">' + opts.map(function (o) {
      return '<label><input type="radio" name="' + esc(name) + '" value="' + esc(o[0]) + '"' + (cur === o[0] ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>';
    }).join('') + '</div></fieldset>';
  }
  VIEWS.about = function () {
    var sizes = TEXT_SIZES.map(function (z) { return [z[0], t(z[1])]; });
    return '<div class="wrap page"><header class="page__head"><h1>' + esc(t('nav.about')) + '</h1><p>' + esc(META.tagline || '') + '</p></header>' +
      '<div class="prose"><p><strong>' + esc(APP_NAME) + '</strong> · ' + esc(t('about.version')) + ' ' + esc(META.version || '') + '</p><p>' + esc(ATTRIBUTION) + '</p></div>' +
      '<h2>' + esc(t('about.settings')) + '</h2><div class="card">' +
        segGroup('lang', t('about.language'), [['en', t('about.langEn')], ['tl', t('about.langTl')]], lang) +
        segGroup('theme', t('theme.title'), [['auto', t('theme.auto')], ['light', t('theme.light')], ['dark', t('theme.dark')]], getTheme()) +
        segGroup('aboutTextSize', t('textsize.title'), sizes, String(store.get('textSize', '100'))) +
      '</div>' +
      '<h2>' + esc(t('about.tips')) + '</h2><div class="card"><ul class="prose" style="margin:0;padding-left:1.2em">' +
        [1, 2, 3, 4, 5].map(function (i) { return '<li>' + rich(t('about.tip' + i)) + '</li>'; }).join('') +
      '</ul></div></div>';
  };

  VIEWS.search = function (q) {
    q = String(q || '');
    var ts = terms(q), res = runSearch(q);
    var kinds = [];
    res.forEach(function (e) { var k = e.kind || ''; if (k && kinds.indexOf(k) < 0) kinds.push(k); });
    if (searchKind && kinds.indexOf(searchKind) < 0) searchKind = '';
    var shown = searchKind ? res.filter(function (e) { return e.kind === searchKind; }) : res;
    return '<div class="wrap page search-page"><header class="page__head"><h1>' + esc(t('search.title')) + '</h1><p>' +
        esc(q ? tf(shown.length === 1 ? 'search.count1' : 'search.countN', { n: shown.length, q: q }) : t('search.prompt')) + '</p></header>' +
      (kinds.length > 1 ? '<div class="filters" role="group" aria-label="' + esc(t('search.filterBy')) + '"><button type="button" class="filter" data-kind="" aria-pressed="' + (!searchKind) + '">' + esc(t('search.all')) + '</button>' +
        kinds.map(function (k) { return '<button type="button" class="filter" data-kind="' + esc(k) + '" aria-pressed="' + (searchKind === k) + '">' + esc(k) + '</button>'; }).join('') + '</div>' : '') +
      (shown.length
        ? '<div class="results">' + shown.map(function (e) {
            return '<div class="result"><a href="' + esc(e.href) + '"><span class="result__meta"><span class="kind">' + esc(e.kind || '') + '</span></span><span class="result__title">' + highlight(e.title, ts) + '</span><span class="result__text">' + highlight(snippet(e.text, ts, 220), ts) + '</span></a></div>';
          }).join('') + '</div>'
        : (q ? '<div class="empty"><h2>' + esc(t('search.noneTitle')) + '</h2><p>' + esc(t('search.noneText')) + '</p></div>' : ''))
      + '</div>';
  };
  AFTER.search = function (q) { if (qInput && document.activeElement !== qInput) qInput.value = q || ''; };

  function missingView() {
    return '<div class="wrap page"><div class="empty"><h2>' + esc(t('notfound.title')) + '</h2><p>' + esc(t('notfound.text')) + '</p><p><a class="btn btn--solid" href="#/">' + esc(t('notfound.home')) + '</a></p></div></div>';
  }

  /* ===== APP VIEWS: genogram maker =====
     Home (saved genograms), the three-step editor (#/chart/<id>/family | lines | view), Symbols, How to.
     The drawing itself comes from js/genogram-engine.js (window.Geno). */
  var G = window.Geno;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* ---------- saved genograms: one object under the key "charts" ---------- */
  var DB = store.get('charts', null);
  if (!DB || typeof DB !== 'object' || !DB.byId) DB = { order: [], byId: {} };
  var saveTimer = null;
  function saveNow() { clearTimeout(saveTimer); saveTimer = null; store.set('charts', DB); }
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 350); }
  window.addEventListener('pagehide', function () { if (saveTimer) saveNow(); });
  function uid(p) { return p + Math.random().toString(36).slice(2, 8); }
  function getChart(id) { return has(DB.byId, id) ? DB.byId[id] : null; }
  function touch(c) { c.updated = new Date().toISOString(); saveSoon(); }
  function blankChart(title) {
    return { id: uid('c'), title: title || 'Family genogram', created: new Date().toISOString(), updated: new Date().toISOString(),
      ptName: '', ptAge: '', ptSex: '', ptOcc: '', ptCond: '', ptFill: true, ptDead: false, parentsRel: '', ptRel: '', byAge: true, showTitle: true, family: [], links: [] };
  }
  function addChart(c) { DB.byId[c.id] = c; DB.order.unshift(c.id); saveNow(); rebuildIndex(); return c; }
  function removeChart(id) { delete DB.byId[id]; DB.order = DB.order.filter(function (x) { return x !== id; }); saveNow(); rebuildIndex(); }
  function charts() { return DB.order.map(getChart).filter(Boolean); }
  /* A made-up family that shows most of what the app can draw */
  function sampleChart() {
    var c = blankChart('Sample: the Reyes family');
    c.ptName = 'Lia'; c.ptAge = '34'; c.ptSex = 'Female'; c.ptOcc = 'teacher'; c.ptCond = 'Major depressive disorder'; c.parentsRel = 'Separated'; c.ptRel = 'Married';
    c.family = [
      { id: 'pgf', name: 'Pedro', rel: 'Paternal grandfather', age: '70', status: 'Deceased', cond: 'Stroke' },
      { id: 'pgm', name: 'Rosa', rel: 'Paternal grandmother', age: '85' },
      { id: 'fa', name: 'Ramon', rel: 'Father', age: '62', occ: 'tricycle driver', psych: true, cond: 'Alcohol use disorder' },
      { id: 'mo', name: 'Lourdes', rel: 'Mother', age: '58', occ: 'vendor', cond: 'Hypertension', withPt: true },
      { id: 'un', name: 'Ben', rel: 'Paternal uncle', age: '60' },
      { id: 'b1', name: 'Jun', rel: 'Brother', age: '38', occ: 'seafarer' },
      { id: 'b1w', name: 'Tess', rel: "Sibling's spouse / partner", sex: 'Female', age: '36', of: 'b1' },
      { id: 'n1', name: 'Kiko', rel: 'Nephew', age: '9', of: 'b1' },
      { id: 's1', name: 'Ana', rel: 'Sister', age: '30', occ: 'nurse' },
      { id: 'h', name: 'Marco', rel: 'Husband', age: '36', occ: 'engineer', withPt: true },
      { id: 'k1', name: 'Bea', rel: 'Daughter', age: '8', twin: true, withPt: true },
      { id: 'k2', name: 'Migo', rel: 'Son', age: '8', twin: true, withPt: true },
      { id: 'k3', name: 'Baby', rel: 'Son', age: '8 mo', withPt: true }
    ];
    c.links = [{ a: 'pt', type: 'Conflictual', b: 'fa' }, { a: 'pt', type: 'Very close / enmeshed', b: 'mo' }, { a: 'pt', type: 'Close', b: 's1' }, { a: 'b1', type: 'Distant', b: 'fa' }];
    return c;
  }
  /* What the drawing engine expects */
  function toEngine(c) {
    return { agesex: (c.ptAge || '') + ' / ' + (c.ptSex || ''), parentsRel: c.parentsRel, ptRel: c.ptRel, genoPtName: c.ptName, genoPtOcc: c.ptOcc, genoPtCond: c.ptCond,
      genoPtFill: c.ptFill !== false, genoPtDead: !!c.ptDead, genoByAge: c.byAge !== false, family: c.family, famLinks: c.links };
  }
  function chartTitleLine(c) { var d = new Date(); return (c.title || 'Family genogram') + ' (' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ')'; }
  function layoutOf(c, withTitle) { G.famIds(c); return G.layout(toEngine(c), withTitle && c.showTitle !== false ? { title: chartTitleLine(c) } : {}); }
  function peopleCount(c) { return 1 + c.family.reduce(function (a, m) { return a + (m && (m.name || m.rel) ? (G.famCount(m) || 1) : 0); }, 0); }

  /* ---------- groups: where each relationship sits, and its colour ---------- */
  var GROUPS = [
    { key: 'gp', label: 'Grandparents', c: '#C77700', roles: ['pgf', 'pgm', 'mgf', 'mgm'] },
    { key: 'par', label: 'Parents, aunts and uncles', c: '#D4502A', roles: ['father', 'mother', 'stepfa', 'stepmo', 'pside', 'mside'] },
    { key: 'sib', label: 'Brothers and sisters', c: '#0E8A8A', roles: ['sib', 'phalf', 'mhalf'] },
    { key: 'part', label: 'Spouse and partners', c: '#C2337A', roles: ['spouse', 'exsp'] },
    { key: 'kid', label: 'Children', c: '#2E8B4F', roles: ['child'] },
    { key: 'sibfam', label: 'Siblings’ families', c: '#2F6FD0', roles: ['sibsp', 'nib'] },
    { key: 'gk', label: 'Grandchildren', c: '#7A8F12', roles: ['chsp', 'gchild'] },
    { key: 'other', label: 'Others and not yet set', c: '#6A5E78', roles: ['other'] }
  ];
  function groupOf(m) { var r = G.relInfo(m.rel).role; for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].roles.indexOf(r) >= 0) return GROUPS[i]; return GROUPS[GROUPS.length - 1]; }
  var QUICK = ['Father', 'Mother', 'Brother', 'Sister', 'Husband', 'Wife', 'Partner', 'Son', 'Daughter'];

  /* ---------- small symbol pictures (rows, library) ---------- */
  function miniSVG(prims, w, h, px) { return G.svg({ w: w, h: h, prims: prims }, px || 34); }
  function symPrims(o) {   // o: {sex, fill, dead, pt, text, ghost}
    var g = o.sex === 'F' ? 'ellipse' : o.sex === 'U' ? 'diamond' : 'rect', x = 0.15, y = 0.15, s = 0.9, out = [];
    out.push({ t: 'shape', g: g, x: x, y: y, w: s, h: s, fill: o.fill ? G.FILL : 'FFFFFF', c: o.ghost ? G.SLATE : G.INK, sw: 0.055, dash: !!o.ghost,
      text: o.text ? { t: String(o.text), fs: String(o.text).length > 2 ? 0.28 : 0.38, b: true, c: o.fill ? 'FFFFFF' : G.INK } : null });
    if (o.pt) out.push({ t: 'shape', g: g, x: x + 0.11, y: y + 0.11, w: s - 0.22, h: s - 0.22, fill: '', c: o.fill ? 'FFFFFF' : G.INK, sw: 0.045 });
    if (o.dead) { out.push({ t: 'line', x1: 0.05, y1: 0.05, x2: 1.15, y2: 1.15, c: G.INK, w: 0.05 }); out.push({ t: 'line', x1: 1.15, y1: 0.05, x2: 0.05, y2: 1.15, c: G.INK, w: 0.05 }); }
    return out;
  }
  function memberIcon(m) {
    var age = String(m.age || '').replace(/[^0-9]/g, '').slice(0, 3), n = G.famCount(m);
    return miniSVG(symPrims({ sex: G.memberSex(m), fill: !!m.psych, dead: m.status === 'Deceased', text: n ? '×' + n : age }), 1.2, 1.2, 36);
  }
  function who(m) { return m.name ? m.name + (m.rel ? ' (' + m.rel + ')' : '') : (G.famCount(m) ? G.famCount(m) + ' × ' : '') + (m.rel || 'No name yet'); }

  /* ---------- Home ---------- */
  TITLES.home = '';
  VIEWS.home = function () {
    var list = charts(), latest = CHANGELOG[0];
    var steps = [['1', 'Add the family', 'Start with the index person, then tap to add parents, siblings, partners and children.', '#D4502A'],
      ['2', 'Mark how they relate', 'Close, distant, in conflict, cut off: pick two people and the kind of line.', '#0E8A8A'],
      ['3', 'Save the genogram', 'The chart draws itself, oldest to youngest. Save it as a picture or a PDF.', '#C2337A']];
    return '<section class="hero"><div class="wrap hero__inner">' +
        '<p class="hero__kicker">Genogram maker</p><h1>Draw the family, <em>see the pattern.</em></h1>' +
        '<p class="hero__lead">Add the family, mark how people relate, and the genogram draws itself with standard symbols and a key that matches what is on the chart.</p>' +
        '<p class="hero__actions"><button type="button" class="btn btn--solid" data-act="new">New genogram</button> <button type="button" class="btn" data-act="sample">Open a sample family</button></p>' +
      '</div></section>' +
      '<div class="wrap home">' +
        '<h2 class="home__h">Your genograms</h2>' +
        (list.length
          ? '<div class="charts">' + list.map(function (c) {
              var L = null; try { L = layoutOf(c, false); } catch (e) { L = null; }
              return '<article class="card chartcard"><a class="chartcard__open" href="#/chart/' + esc(c.id) + (c.family.length ? '/view' : '') + '" aria-label="Open ' + esc(c.title) + '">' +
                '<div class="chartcard__thumb">' + (L ? G.svg(L, 26) : '<span class="muted">No family members yet</span>') + '</div>' +
                '<h3>' + esc(c.title || 'Family genogram') + '</h3><p class="muted">' + peopleCount(c) + (peopleCount(c) === 1 ? ' person' : ' people') + ' · ' + esc(fmtDate(String(c.updated).slice(0, 10))) + '</p></a>' +
                '<p class="chartcard__acts"><a class="link-btn" href="#/chart/' + esc(c.id) + '">Edit</a><button type="button" class="link-btn" data-act="dup" data-id="' + esc(c.id) + '">Duplicate</button><button type="button" class="link-btn danger" data-act="del" data-id="' + esc(c.id) + '">Delete</button></p></article>';
            }).join('') + '</div>'
          : '<div class="empty"><h2>No genograms yet</h2><p>Start a new one, or open the sample family to see how it works.</p><p><button type="button" class="btn btn--solid" data-act="new">New genogram</button></p></div>') +
        '<h2 class="home__h home__h--gap">How it works</h2><div class="steps">' + steps.map(function (s) {
          return '<div class="stepcard" style="--c:' + s[3] + '"><span class="stepcard__n">' + s[0] + '</span><h3>' + s[1] + '</h3><p>' + s[2] + '</p></div>'; }).join('') + '</div>' +
        '<div class="cards cards--two"><a class="card tile" href="#/symbols">' + icon('shapes', 'tile__ico') + '<h3>Symbols and lines</h3><p class="muted">What every shape and line means.</p></a>' +
          '<a class="card tile" href="#/guide">' + icon('book', 'tile__ico') + '<h3>How to use</h3><p class="muted">Step-parents, half-siblings, twins, grouped symbols.</p></a></div>' +
        '<a class="card news-strip" href="#/whats-new"><span class="badge" data-badge="news" hidden></span><strong>' + esc(t('nav.whatsNew')) + '</strong>' +
          (latest ? '<span class="muted">' + esc(tf('home.latest', { title: latest.title, version: latest.version })) + '</span>' : '') + '</a>' +
      '</div>';
  };

  /* ---------- Editor ---------- */
  var openMember = null;      // id of the member whose editor is open
  var zoom = 'fit';
  var STEPS = [['family', 'Family', '#D4502A'], ['lines', 'Relationships', '#0E8A8A'], ['view', 'Genogram', '#C2337A']];
  TITLES.chart = 'Genogram';
  function opt(val, lab, cur) { return '<option value="' + esc(val) + '"' + (String(val) === String(cur || '') ? ' selected' : '') + '>' + esc(lab) + '</option>'; }
  function field(label, inner, cls) { return '<label class="fld ' + (cls || '') + '"><span>' + esc(label) + '</span>' + inner + '</label>'; }
  function textIn(scope, key, val, ph, extra) { return '<input type="text" ' + scope + ' data-k="' + key + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '" autocomplete="off"' + (extra || '') + '>'; }
  function chip(scope, key, on, label) { return '<button type="button" class="filter" ' + scope + ' data-tog="' + key + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(label) + '</button>'; }
  function segBtns(scope, key, opts, cur) { return '<div class="segb" role="group">' + opts.map(function (o) { return '<button type="button" ' + scope + ' data-set="' + key + '" data-v="' + esc(o[0]) + '" aria-pressed="' + (String(cur || '') === String(o[0]) ? 'true' : 'false') + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; }
  function relOptions(cur) {
    var groups = [], out = opt('', 'Choose…', cur);
    G.FAMILY_RELS.forEach(function (r) { if (groups.indexOf(r.g) < 0) groups.push(r.g); });
    groups.forEach(function (g) { out += '<optgroup label="' + esc(g) + '">' + G.FAMILY_RELS.filter(function (r) { return r.g === g; }).map(function (r) { return opt(r.rel, r.rel, cur); }).join('') + '</optgroup>'; });
    return out;
  }
  function ofOptions(c, m) {
    var r = G.relInfo(m.rel).role, role = function (x) { return G.relInfo(x.rel).role; };
    if (r === 'child') return opt('', 'Current spouse / partner (or the first one listed)', m.of) + c.family.filter(function (x) { return ['spouse', 'exsp'].indexOf(role(x)) >= 0; }).map(function (p) { return opt(p.id, who(p), m.of); }).join('') + opt('none', 'Not listed (index person only)', m.of);
    var hosts = c.family.filter(function (x) { return (r === 'sibsp' || r === 'nib') ? ['sib', 'phalf', 'mhalf'].indexOf(role(x)) >= 0 : role(x) === 'child'; });
    return hosts.length === 1 ? opt('', who(hosts[0]), m.of) : opt('', 'Choose…', m.of) + hosts.map(function (p) { return opt(p.id, who(p), m.of); }).join('');
  }
  function memberEditor(c, m, i) {
    var ri = G.relInfo(m.rel), r = ri.role, sc = 'data-m="' + esc(m.id) + '"', ofLab = G.FAM_OF[r], partner = G.FAM_PARTNER_ROLES.indexOf(r) >= 0;
    return '<div class="member__edit">' +
      '<div class="flds">' + field('Name', textIn(sc, 'name', m.name, 'Name or initials'), 'w2') +
        field('Relationship to the index person', '<select ' + sc + ' data-k="rel">' + relOptions(m.rel) + '</select>', 'w2') +
        field('Age', textIn(sc, 'age', m.age, '33, 8 mo'), 'w1') +
        (!ri.sex ? field('Sex', '<select ' + sc + ' data-k="sex">' + opt('', 'Not stated', m.sex) + opt('Male', 'Male', m.sex) + opt('Female', 'Female', m.sex) + '</select>', 'w1') : '') + '</div>' +
      (ofLab || partner ? '<div class="flds">' + (ofLab ? field(ofLab, '<select ' + sc + ' data-k="of">' + ofOptions(c, m) + '</select>', 'w2') : '') +
        (partner ? field('Couple’s relationship', '<select ' + sc + ' data-k="relStatus">' + opt('', r === 'exsp' ? 'Separated' : r === 'spouse' ? 'As set for the index person' : 'Married / partners', m.relStatus) + G.FAM_COUPLE.map(function (o) { return opt(o, o, m.relStatus); }).join('') + '</select>', 'w2') : '') + '</div>' : '') +
      '<div class="chips">' + segBtns(sc, 'status', [['Living', 'Living'], ['Deceased', 'Deceased']], m.status || 'Living') +
        chip(sc, 'psych', m.psych, 'Psychiatric or substance use disorder') + chip(sc, 'withPt', m.withPt, 'Lives with the index person') +
        (G.FAM_TWIN_ROLES.indexOf(r) >= 0 ? chip(sc, 'twin', m.twin, 'Twin') : '') + '</div>' +
      '<div class="flds">' + field('Occupation / role', textIn(sc, 'occ', m.occ, 'welder, sole earner'), 'w2') + field('Condition / illness', textIn(sc, 'cond', m.cond, 'MDD, hypertension'), 'w2') +
        field('Number of people (if a group)', textIn(sc, 'count', m.count, 'Leave empty for one person', ' inputmode="numeric"'), 'w2') + '</div>' +
      '<p class="member__acts"><button type="button" class="link-btn" data-act="up" data-id="' + esc(m.id) + '">Move up</button><button type="button" class="link-btn" data-act="down" data-id="' + esc(m.id) + '">Move down</button><button type="button" class="link-btn danger" data-act="rm" data-id="' + esc(m.id) + '">Remove</button></p></div>';
  }
  function memberRow(c, m, i) {
    var open = openMember === m.id, sub = [m.name ? m.rel : '', m.age, m.occ, m.cond].filter(Boolean).join(' · ');
    return '<div class="member' + (open ? ' is-open' : '') + '" id="m-' + esc(m.id) + '">' +
      '<button type="button" class="member__head" data-act="toggle" data-id="' + esc(m.id) + '" aria-expanded="' + open + '"><span class="member__ico">' + memberIcon(m) + '</span>' +
      '<span class="member__txt"><strong>' + esc(m.name || m.rel || 'New family member') + '</strong><small>' + esc(sub || (m.rel ? '' : 'Choose a relationship')) + '</small></span>' +
      '<svg class="member__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      (open ? memberEditor(c, m, i) : '') + '</div>';
  }
  function stepFamily(c) {
    G.famIds(c);
    var role = function (x) { return G.relInfo(x.rel).role; }, hasBoth = c.family.some(function (m) { return role(m) === 'father'; }) && c.family.some(function (m) { return role(m) === 'mother'; }), hasSp = c.family.some(function (m) { return role(m) === 'spouse'; });
    var coupleOpts = [['', 'Married']].concat(G.FAM_COUPLE.slice(1).map(function (o) { return [o, o]; }));
    var html = '<section class="card idx" style="--c:#1C7A86"><h2 class="grp__h"><span class="grp__dot"></span>Index person <small>the patient or client; drawn with a double outline</small></h2>' +
      '<div class="flds">' + field('Name shown on the genogram', textIn('data-c="1"', 'ptName', c.ptName, 'Patient, initials or an alias'), 'w2') + field('Age', textIn('data-c="1"', 'ptAge', c.ptAge, '33'), 'w1') +
        '<div class="fld w2"><span>Sex</span>' + segBtns('data-c="1"', 'ptSex', [['Male', 'Male'], ['Female', 'Female'], ['', 'Not stated']], c.ptSex) + '</div></div>' +
      '<div class="flds">' + field('Occupation / role', textIn('data-c="1"', 'ptOcc', c.ptOcc, 'BS ME graduate, unemployed'), 'w2') + field('Condition / illness', textIn('data-c="1"', 'ptCond', c.ptCond, 'schizophrenia; CKD 3b'), 'w2') + '</div>' +
      '<div class="chips">' + chip('data-c="1"', 'ptFill', c.ptFill !== false, 'Psychiatric or substance use disorder') + chip('data-c="1"', 'ptDead', c.ptDead, 'Deceased') + '</div></section>';
    html += '<section class="quick"><h2 class="quick__h">Add a family member</h2><div class="quick__chips">' + QUICK.map(function (r) { var g = groupOf({ rel: r });
        return '<button type="button" class="qchip" style="--c:' + g.c + '" data-act="add" data-rel="' + esc(r) + '">+ ' + esc(r) + '</button>'; }).join('') +
      '<button type="button" class="qchip qchip--more" data-act="add" data-rel="">+ Someone else…</button></div>' +
      '<p class="hint">Initials are enough. “Number of people” is only for a group: type 5 and one symbol stands for 5 former partners. Leave it empty for one person.</p></section>';
    if (hasBoth || hasSp) html += '<section class="card couple">' +
      (hasBoth ? '<div class="fld"><span>Parents’ relationship</span>' + segBtns('data-c="1"', 'parentsRel', coupleOpts, c.parentsRel === 'Married' ? '' : c.parentsRel) + '</div>' : '') +
      (hasSp ? '<div class="fld"><span>Index person and current spouse / partner</span>' + segBtns('data-c="1"', 'ptRel', coupleOpts, c.ptRel === 'Married' ? '' : c.ptRel) + '</div>' : '') + '</section>';
    GROUPS.forEach(function (g) {
      var ms = c.family.filter(function (m) { return groupOf(m) === g; });
      if (!ms.length) return;
      html += '<section class="grp" style="--c:' + g.c + '"><h2 class="grp__h"><span class="grp__dot"></span>' + esc(g.label) + ' <small>' + ms.length + '</small></h2>' + ms.map(function (m) { return memberRow(c, m, c.family.indexOf(m)); }).join('') + '</section>';
    });
    if (c.family.length > 1) html += '<div class="chips chips--foot">' + chip('data-c="1"', 'byAge', c.byAge !== false, 'Oldest to youngest automatically') + '<button type="button" class="link-btn" data-act="sort">Sort this list by generation and age</button></div>';
    return html;
  }
  function linkIcon(type) { return miniSVG(G.linkPrims([[0.15, 0.5], [1.85, 0.5]], type, 0.95), 2, 1, 30); }
  function stepLines(c) {
    G.famIds(c);
    var people = [['pt', (c.ptName || 'Index person') + ' (index person)']].concat(c.family.filter(function (m) { return m.name || m.rel; }).map(function (m) { return [m.id, who(m)]; }));
    var sel = function (i, k, cur, opts) { return '<select data-l="' + i + '" data-k="' + k + '">' + opt('', 'Choose…', cur) + opts.map(function (o) { return opt(o[0], o[1], cur); }).join('') + '</select>'; };
    return '<section class="card"><h2 class="grp__h" style="--c:#0E8A8A"><span class="grp__dot"></span>Relationship lines <small>how two people get along</small></h2>' +
      (c.family.length ? '' : '<p class="hint">Add family members first, then come back to connect them.</p>') +
      c.links.map(function (l, i) {
        return '<div class="linkrow"><span class="linkrow__ico">' + (l.type ? linkIcon(l.type) : '') + '</span>' + field('Person', sel(i, 'a', l.a, people), 'w2') +
          field('Relationship', sel(i, 'type', l.type, G.FAM_LINKS.map(function (t) { return [t.type, t.dir ? t.type + ' →' : t.type]; })), 'w2') + field('Other person', sel(i, 'b', l.b, people), 'w2') +
          '<button type="button" class="link-btn danger" data-act="rml" data-i="' + i + '" aria-label="Remove this line">Remove</button></div>'; }).join('') +
      '<p><button type="button" class="btn" data-act="addl"' + (c.family.length ? '' : ' disabled') + '>+ Add a relationship line</button></p></section>' +
      '<section class="card"><h2 class="grp__h" style="--c:#6A5E78"><span class="grp__dot"></span>The kinds of line</h2><div class="lib lib--tight">' + G.FAM_LINKS.map(function (t) {
        return '<div class="lib__row"><span class="lib__ico lib__ico--wide">' + linkIcon(t.type) + '</span><span><strong>' + esc(t.type) + '</strong></span></div>'; }).join('') + '</div></section>';
  }
  function stepView(c) {
    var L = null; try { L = layoutOf(c, true); } catch (e) { L = null; }
    if (!L) return '<div class="empty"><h2>Nothing to draw yet</h2><p>Add at least one family member and the genogram appears here.</p><p><a class="btn btn--solid" href="#/chart/' + esc(c.id) + '">Add the family</a></p></div>';
    return '<div class="viewbar"><div class="segb" role="group" aria-label="Size">' + [['fit', 'Fit to screen'], ['big', 'Larger']].map(function (o) { return '<button type="button" data-act="zoom" data-v="' + o[0] + '" aria-pressed="' + (zoom === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>' +
        chip('data-c="1"', 'showTitle', c.showTitle !== false, 'Show the title and date') + '</div>' +
      '<div class="canvas' + (zoom === 'big' ? ' canvas--big' : '') + '" id="canvas">' + G.svg(L, zoom === 'big' ? 78 : 56) + '</div>' +
      (L.left.length ? '<div class="callout callout--caution"><p class="callout__title">Not drawn</p>' + esc(L.left.join(', ')) + '. A relative is drawn when the person who links them to the index person is on the chart (for example the father for paternal relatives) and chosen in their card. Each person has room for two partners: put several former partners in one symbol with “Number of people”.</div>' : '') +
      (L.linksLeft.length ? '<div class="callout callout--caution"><p class="callout__title">Lines not drawn</p>' + esc(L.linksLeft.join('; ')) + '. One of the two people is not on the chart.</div>' : '') +
      '<p class="hint">The key lists only what this genogram uses. See <a href="#/symbols">Symbols and lines</a> for everything the app can draw.</p>';
  }
  VIEWS.chart = function (id, step) {
    var c = getChart(id);
    if (!c) return '<div class="wrap page"><div class="empty"><h2>This genogram is not on this device</h2><p>It may have been deleted, or made on another phone or computer.</p><p><a class="btn btn--solid" href="#/">Back to your genograms</a></p></div></div>';
    step = step === 'lines' || step === 'view' ? step : 'family';
    var n = peopleCount(c), base = '#/chart/' + esc(c.id);
    return '<div class="wrap page editor" data-chart="' + esc(c.id) + '" data-step="' + step + '"><p class="crumb"><a href="#/">Your genograms</a> / ' + esc(c.title || 'Family genogram') + '</p>' +
      '<label class="titlefld"><span class="sr-only">Title of this genogram</span><input type="text" data-c="1" data-k="title" value="' + esc(c.title) + '" placeholder="Family genogram" autocomplete="off"></label>' +
      '<nav class="stepnav" aria-label="Steps">' + STEPS.map(function (s, i) { return '<a href="' + base + (s[0] === 'family' ? '' : '/' + s[0]) + '" style="--c:' + s[2] + '"' + (s[0] === step ? ' aria-current="step"' : '') + '><span>' + (i + 1) + '</span>' + s[1] + '</a>'; }).join('') + '</nav>' +
      '<div class="editor__body">' + (step === 'family' ? stepFamily(c) : step === 'lines' ? stepLines(c) : stepView(c)) + '</div>' +
      '<div class="actionbar"><span class="actionbar__n" id="pcount">' + n + (n === 1 ? ' person' : ' people') + ' on the chart</span><span class="actionbar__btns">' +
        (step === 'family' ? '<a class="btn" href="' + base + '/lines">Relationships</a><a class="btn btn--solid" href="' + base + '/view">See the genogram</a>'
          : step === 'lines' ? '<a class="btn" href="' + base + '">Family</a><a class="btn btn--solid" href="' + base + '/view">See the genogram</a>'
          : '<a class="btn" href="' + base + '">Edit</a><button type="button" class="btn" data-act="png"' + (c.family.length ? '' : ' disabled') + '>Save picture</button><button type="button" class="btn btn--solid" data-act="pdf"' + (c.family.length ? '' : ' disabled') + '>Save PDF</button>') +
      '</span></div><p class="status" id="ed-status" role="status" aria-live="polite"></p></div>';
  };
  function curChart() { var el = main.querySelector('.editor'); return el ? getChart(el.getAttribute('data-chart')) : null; }
  function rerender() { route({ keepScroll: true }); }
  function say(msg) { var el = document.getElementById('ed-status'); if (el) el.textContent = msg || ''; }
  function memberById(c, id) { for (var i = 0; i < c.family.length; i++) if (c.family[i].id === id) return c.family[i]; return null; }

  /* typing: save, and refresh only the small things that depend on it */
  main.addEventListener('input', function (e) {
    var el = e.target, c = curChart(); if (!c || !el.getAttribute) return;
    var k = el.getAttribute('data-k'); if (!k) return;
    if (el.getAttribute('data-c')) { c[k] = el.value; touch(c); if (k === 'title') rebuildIndex(); return; }
    if (el.getAttribute('data-m')) {
      var m = memberById(c, el.getAttribute('data-m')); if (!m) return;
      m[k] = el.value; touch(c);
      if (el.tagName === 'SELECT') { if (k === 'rel') delete m.of; rerender(); return; }
      var row = el.closest('.member');
      if (row) { var st = row.querySelector('.member__txt strong'), sm = row.querySelector('.member__txt small'), ic = row.querySelector('.member__ico');
        if (st) st.textContent = m.name || m.rel || 'New family member';
        if (sm) sm.textContent = [m.name ? m.rel : '', m.age, m.occ, m.cond].filter(Boolean).join(' · ');
        if (ic) ic.innerHTML = memberIcon(m); }
      var pc = document.getElementById('pcount'), n = peopleCount(c); if (pc) pc.textContent = n + (n === 1 ? ' person' : ' people') + ' on the chart';
      return;
    }
    if (el.getAttribute('data-l') != null) { var l = c.links[+el.getAttribute('data-l')]; if (l) { l[k] = el.value; touch(c); rerender(); } }
  });
  main.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
    var act = b.getAttribute('data-act'), c = curChart(), id = b.getAttribute('data-id');
    /* home */
    if (act === 'new') { var nc = addChart(blankChart('Family genogram')); openMember = null; location.hash = '#/chart/' + nc.id; return; }
    if (act === 'sample') { var sc = addChart(sampleChart()); location.hash = '#/chart/' + sc.id + '/view'; return; }
    if (act === 'dup') { var src = getChart(id); if (!src) return; var cp = JSON.parse(JSON.stringify(src)); cp.id = uid('c'); cp.title = (src.title || 'Family genogram') + ' (copy)'; cp.created = cp.updated = new Date().toISOString(); addChart(cp); rerender(); return; }
    if (act === 'del') { var dc = getChart(id); if (dc && window.confirm('Delete “' + (dc.title || 'Family genogram') + '”? This cannot be undone.')) { removeChart(id); rerender(); } return; }
    if (!c) return;
    /* editor: switches */
    if (b.getAttribute('data-tog')) { var tk = b.getAttribute('data-tog'), tgt = b.getAttribute('data-m') ? memberById(c, b.getAttribute('data-m')) : c; if (!tgt) return;
      tgt[tk] = !(tk === 'ptFill' || tk === 'byAge' || tk === 'showTitle' ? tgt[tk] !== false : tgt[tk]); touch(c); rerender(); return; }
    if (b.getAttribute('data-set')) { var sk = b.getAttribute('data-set'), st2 = b.getAttribute('data-m') ? memberById(c, b.getAttribute('data-m')) : c; if (!st2) return; st2[sk] = b.getAttribute('data-v'); touch(c); rerender(); return; }
    if (act === 'toggle') { openMember = openMember === id ? null : id; rerender(); return; }
    if (act === 'add') { var m = { id: uid('f'), name: '', rel: b.getAttribute('data-rel') || '', age: '', status: 'Living' }; c.family.push(m); openMember = m.id; touch(c); rerender();
      var row = document.getElementById('m-' + m.id); if (row) { row.scrollIntoView({ block: 'center' }); var first = row.querySelector(m.rel ? 'input[data-k="name"]' : 'select[data-k="rel"]'); if (first) first.focus({ preventScroll: true }); } return; }
    if (act === 'rm') { var rmm = memberById(c, id); if (!rmm) return; if ((rmm.name || rmm.cond) && !window.confirm('Remove ' + (rmm.name || 'this family member') + '?')) return;
      c.family = c.family.filter(function (x) { return x !== rmm; }); c.family.forEach(function (x) { if (x.of === id) delete x.of; }); c.links = c.links.filter(function (l) { return l.a !== id && l.b !== id; }); openMember = null; touch(c); rerender(); return; }
    if (act === 'up' || act === 'down') { var mm = memberById(c, id), g = groupOf(mm), same = c.family.filter(function (x) { return groupOf(x) === g; }), at = same.indexOf(mm), other = same[at + (act === 'up' ? -1 : 1)];
      if (other) { var i1 = c.family.indexOf(mm), i2 = c.family.indexOf(other); c.family[i1] = other; c.family[i2] = mm; touch(c); rerender(); } return; }
    if (act === 'sort') { c.family = G.famSorted({ family: c.family }); touch(c); rerender(); say('Sorted by generation and age.'); return; }
    if (act === 'addl') { c.links.push({ a: 'pt', type: '', b: '' }); touch(c); rerender(); return; }
    if (act === 'rml') { c.links.splice(+b.getAttribute('data-i'), 1); touch(c); rerender(); return; }
    if (act === 'zoom') { zoom = b.getAttribute('data-v'); rerender(); return; }
    if (act === 'png' || act === 'pdf') { exportChart(c, act); return; }
  });

  /* ---------- Saving the genogram as a picture or a PDF (made on the device) ---------- */
  function fileBase(c) { return (String(c.title || 'Genogram').replace(/[^\w\- ]+/g, ' ').trim().replace(/\s+/g, '_').slice(0, 50) || 'Genogram') + '_' + new Date().toISOString().slice(0, 10); }
  function renderCanvas(c) {
    var L = layoutOf(c, true); if (!L) return Promise.reject(new Error('empty'));
    var unit = Math.min(110, Math.floor(Math.sqrt(15000000 / (L.w * L.h))));   // iPhone canvases have a size limit
    var svg = G.svg(L, unit), img = new Image();
    return new Promise(function (res, rej) { img.onload = res; img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }).then(function () {
      var cv = document.createElement('canvas'); cv.width = Math.round(L.w * unit); cv.height = Math.round(L.h * unit);
      var g = cv.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
      return cv; });
  }
  function canvasBytes(cv, type, q) { return new Promise(function (res, rej) { cv.toBlob(function (bl) { if (!bl) { rej(new Error('blob')); return; } bl.arrayBuffer().then(function (ab) { res(new Uint8Array(ab)); }, rej); }, type, q); }); }
  /* A one-page PDF holding the picture: A4, turned to suit the genogram's shape */
  function pdfFromJpeg(jpg, w, h, title) {
    var land = w > h * 1.1, PW = land ? 842 : 595, PH = land ? 595 : 842, M = 34, k = Math.min((PW - 2 * M) / w, (PH - 2 * M) / h), iw = w * k, ih = h * k, x = (PW - iw) / 2, y = PH - M - ih;
    var enc = function (s) { var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; };
    var safe = String(title || 'Genogram').replace(/[^\x20-\x7E]/g, ' ').replace(/[\\()]/g, ' ');
    var content = 'q ' + iw.toFixed(2) + ' 0 0 ' + ih.toFixed(2) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' cm /Im0 Do Q';
    var objs = [enc('<< /Type /Catalog /Pages 2 0 R >>'), enc('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
      enc('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'),
      [enc('<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n'), jpg, enc('\nendstream')],
      enc('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'), enc('<< /Title (' + safe + ') /Creator (Genogram, isaymotion) >>')];
    var parts = [enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')], offs = [], pos = parts[0].length;
    var push = function (a) { parts.push(a); pos += a.length; };
    objs.forEach(function (o, i) { offs.push(pos); push(enc((i + 1) + ' 0 obj\n')); (Array.isArray(o) ? o : [o]).forEach(push); push(enc('\nendobj\n')); });
    var xref = pos, tbl = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(function (o) { return ('0000000000' + o).slice(-10) + ' 00000 n \n'; }).join('');
    push(enc(tbl + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xref + '\n%%EOF\n'));
    var out = new Uint8Array(pos), at = 0; parts.forEach(function (a) { out.set(a, at); at += a.length; }); return out;
  }
  function deliver(bytes, name, type, done) {
    var file = null; try { file = new File([bytes], name, { type: type }); } catch (e) {}
    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (standalone && file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).then(function () { say(done); }, function () { say('Not saved.'); }); return; }
    var url = URL.createObjectURL(new Blob([bytes], { type: type })), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000); say(done);
  }
  function exportChart(c, kind) {
    say('Preparing…');
    renderCanvas(c).then(function (cv) {
      if (kind === 'png') return canvasBytes(cv, 'image/png').then(function (b) { deliver(b, fileBase(c) + '.png', 'image/png', 'Picture saved: ' + fileBase(c) + '.png'); });
      return canvasBytes(cv, 'image/jpeg', 0.93).then(function (b) { deliver(pdfFromJpeg(b, cv.width, cv.height, c.title), fileBase(c) + '.pdf', 'application/pdf', 'PDF saved: ' + fileBase(c) + '.pdf'); });
    }).catch(function () { say('The genogram could not be saved. Try “Save picture”, or a smaller family.'); });
  }
  window.__genoTest = { pdfFromJpeg: pdfFromJpeg, renderCanvas: renderCanvas, canvasBytes: canvasBytes, getChart: getChart };   // used by the checks in tools/

  /* ---------- Symbols library ---------- */
  var LIB = [
    { h: 'Who the person is', c: '#1C7A86', rows: [
      ['Male', 'Square.', symPrims({ sex: 'M' })], ['Female', 'Circle.', symPrims({ sex: 'F' })], ['Sex not stated', 'Diamond. Also used for a group of children of both sexes.', symPrims({ sex: 'U' })],
      ['Index person', 'Double outline with an arrow pointing at it: the patient or client the genogram is about.', symPrims({ sex: 'F', pt: true })],
      ['Age', 'Written inside the symbol. Months are shortened, for example 8m.', symPrims({ sex: 'M', text: '33' })]] },
    { h: 'Status and marks', c: '#D4502A', rows: [
      ['Living', 'Empty symbol.', symPrims({ sex: 'M' })], ['Deceased', 'An X through the symbol.', symPrims({ sex: 'F', dead: true })],
      ['Psychiatric or substance use disorder', 'Shaded symbol. Write the condition in “Condition / illness” so it shows under the name.', symPrims({ sex: 'M', fill: true })],
      ['Several people in one symbol', '×n inside the symbol, from “Number of people”: 5 former partners, 7 children.', symPrims({ sex: 'U', text: '×7' })],
      ['Parent not listed', 'Dashed symbol with a question mark, drawn for half-siblings when the other parent was not added.', symPrims({ sex: 'U', ghost: true, text: '?' })],
      ['Lives with the index person', 'A small house beside the symbol.', [{ t: 'poly', pts: [[0.25, 0.62], [0.6, 0.3], [0.95, 0.62], [0.95, 0.98], [0.25, 0.98]], c: G.SLATE, w: 0.03, fill: G.SLATE, close: true }]]] },
    { h: 'Couples and children', c: '#C2337A', rows: [
      ['Married / partners', 'A solid line between two people.', [{ t: 'line', x1: 0.15, y1: 0.5, x2: 1.85, y2: 0.5, c: G.INK, w: 0.055 }], 2],
      ['Living together', 'A dashed line.', [{ t: 'line', x1: 0.15, y1: 0.5, x2: 1.85, y2: 0.5, c: G.INK, w: 0.055, dash: true }], 2],
      ['Separated', 'One slash across the line.', [{ t: 'line', x1: 0.15, y1: 0.5, x2: 1.85, y2: 0.5, c: G.INK, w: 0.055 }, { t: 'line', x1: 0.9, y1: 0.78, x2: 1.1, y2: 0.22, c: G.INK, w: 0.055 }], 2],
      ['Annulled / divorced', 'Two slashes across the line.', [{ t: 'line', x1: 0.15, y1: 0.5, x2: 1.85, y2: 0.5, c: G.INK, w: 0.055 }, { t: 'line', x1: 0.8, y1: 0.78, x2: 1.0, y2: 0.22, c: G.INK, w: 0.055 }, { t: 'line', x1: 1.0, y1: 0.78, x2: 1.2, y2: 0.22, c: G.INK, w: 0.055 }], 2],
      ['Children', 'Hang from the line between their parents, oldest on the left.', [{ t: 'line', x1: 1, y1: 0.1, x2: 1, y2: 0.45, c: G.INK, w: 0.055 }, { t: 'line', x1: 0.4, y1: 0.45, x2: 1.6, y2: 0.45, c: G.INK, w: 0.055 }, { t: 'line', x1: 0.4, y1: 0.45, x2: 0.4, y2: 0.9, c: G.INK, w: 0.055 }, { t: 'line', x1: 1.6, y1: 0.45, x2: 1.6, y2: 0.9, c: G.INK, w: 0.055 }], 2],
      ['Twins', 'Two lines that start from the same point.', [{ t: 'line', x1: 1, y1: 0.15, x2: 0.45, y2: 0.9, c: G.INK, w: 0.055 }, { t: 'line', x1: 1, y1: 0.15, x2: 1.55, y2: 0.9, c: G.INK, w: 0.055 }], 2]] },
    { h: 'Relationship lines', c: '#0E8A8A', rows: [
      ['Close', 'Two green lines.'], ['Very close / enmeshed', 'Three green lines.'], ['Distant', 'A dotted line.'], ['Conflictual', 'A red zigzag.'],
      ['Close but conflictual', 'A red zigzag between two green lines.'], ['Cut off / estranged', 'A line broken in the middle.'], ['Abusive toward', 'A red zigzag with an arrow pointing at the person harmed.']] }
  ];
  TITLES.symbols = 'Symbols and lines';
  VIEWS.symbols = function () {
    return '<div class="wrap page"><header class="page__head"><h1>Symbols and lines</h1><p>The standard genogram notation this app draws. The key on each genogram lists only what that chart uses.</p></header>' +
      LIB.map(function (sec) {
        return '<section class="grp" style="--c:' + sec.c + '"><h2 class="grp__h"><span class="grp__dot"></span>' + esc(sec.h) + '</h2><div class="card lib">' + sec.rows.map(function (r) {
          var pic = r[2] ? miniSVG(r[2], r[3] || 1.2, r[3] ? 1 : 1.2, 34) : linkIcon(r[0]);
          return '<div class="lib__row"><span class="lib__ico' + (r[3] || !r[2] ? ' lib__ico--wide' : '') + '">' + pic + '</span><span><strong>' + esc(r[0]) + '</strong><small>' + esc(r[1]) + '</small></span></div>'; }).join('') + '</div></section>';
      }).join('') + '</div>';
  };

  /* ---------- How to use ---------- */
  var GUIDE = [
    ['Start with the index person', 'Open a new genogram and fill in the index person: the name to show (initials or an alias are fine), age and sex. The shading for a psychiatric or substance use disorder is on to begin with; tap it to turn it off.'],
    ['Add the family with one tap', 'Tap + Father, + Mother, + Sister and so on. Each person appears as a row; tap a row to open it and add the age, occupation and conditions. “Someone else…” has every other relationship: step-parents, half-siblings, former partners, nephews and nieces, grandchildren, grandparents, aunts and uncles.'],
    ['Oldest to youngest', 'Brothers, sisters and children are placed by age, oldest on the left, whatever order you typed them in. Ages such as “8 mo” or “1 y 6 mo” are understood. For people of the same age, use Move up and Move down; for twins, turn on Twin for each of them.'],
    ['Children with different partners', 'Add each partner first (Husband, Wife, Partner, Former partner). Then open the child and choose the other parent. Leave it on the first choice and the child goes with the current spouse or partner.'],
    ['Step-parents and half-siblings', 'A stepfather is drawn beside the mother, a stepmother beside the father. A paternal half-sibling hangs between the father and the stepmother; if no stepmother was added, a dashed “?” parent is drawn.'],
    ['Many people in one symbol', 'Type a number in “Number of people” to let one symbol stand for several people, such as 5 former partners or 7 children. Each person has room for two partners on the chart, so this is the way to show more.'],
    ['Relationship lines', 'In step 2, pick two people and how they relate. Lines between generations start under the older person’s label so they do not run through the words.'],
    ['Save and share', 'In step 3, Save picture makes a PNG and Save PDF makes a one-page A4 PDF. On an installed iPhone or iPad app the share sheet opens so you can save to Files or send it.'],
    ['Privacy', 'Everything stays on this device. Nothing is sent to a server. Use initials or an alias, and use Export backup in the footer to move your genograms to another device.']
  ];
  TITLES.guide = 'How to use';
  VIEWS.guide = function () {
    return '<div class="wrap page"><header class="page__head"><h1>How to use</h1><p>Nine short notes. The <a href="#/symbols">symbols page</a> shows what everything on the chart means.</p></header>' +
      GUIDE.map(function (g, i) { return '<div class="row row--static"><span class="row__num">' + (i + 1) + '</span><span><h3>' + esc(g[0]) + '</h3><p>' + esc(g[1]) + '</p></span><span></span></div>'; }).join('') + '</div>';
  };

  /* ---------- search: symbols, guide notes and saved genograms ---------- */
  function rebuildIndex() {
    SEARCH_INDEX.length = 0;
    LIB.forEach(function (sec) { sec.rows.forEach(function (r) { SEARCH_INDEX.push({ title: r[0], text: r[1] + ' ' + sec.h, href: '#/symbols', kind: 'Symbol' }); }); });
    GUIDE.forEach(function (g) { SEARCH_INDEX.push({ title: g[0], text: g[1], href: '#/guide', kind: 'How to' }); });
    charts().forEach(function (c) { SEARCH_INDEX.push({ title: c.title || 'Family genogram', text: [c.ptName].concat(c.family.map(function (m) { return [m.name, m.rel, m.cond].filter(Boolean).join(' '); })).filter(Boolean).join(', '), href: '#/chart/' + c.id + '/view', kind: 'Genogram' }); });
  }
  rebuildIndex();

  /* ===== Router ===== */
  function parts() {
    var h = location.hash.replace(/^#\/?/, '');
    return h.split('/').filter(Boolean).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
  }
  function titleFor(key) {
    if (has(TITLES, key)) return TITLES[key];
    if (has(SHELL_TITLES, key)) return t(SHELL_TITLES[key]);
    for (var i = 0; i < NAV.length; i++) if (NAV[i].href === '#/' + key) return navLabel(NAV[i]);
    return key;
  }
  function setView(key, html, title) {
    main.innerHTML = html;
    document.title = title ? title + ' — ' + APP_NAME : APP_NAME;
    buildNav();
    updateNavBadges();
  }
  function route(opts) {
    opts = opts || {};
    closeSuggest(); closeDrawer();
    var p = parts(), key = p.length ? p[0] : 'home', restoreY = null;
    if (!opts.keepScroll) {
      scrollMemo[scrollKey] = window.scrollY;                 // the page we are leaving
      scrollKey = location.hash || '#/';
      restoreY = fromHistory && scrollMemo.hasOwnProperty(scrollKey) ? scrollMemo[scrollKey] : null;
      fromHistory = false;
    }
    var html, title, args = p.slice(1);
    if (key !== 'missing' && Object.prototype.hasOwnProperty.call(VIEWS, key) && typeof VIEWS[key] === 'function') {
      html = VIEWS[key].apply(null, args); title = titleFor(key);
    } else {
      key = 'missing'; html = missingView(); title = t('notfound.title');
    }
    setView(key, html, title);
    if (AFTER[key]) AFTER[key].apply(null, args);
    if (opts.focus) main.focus({ preventScroll: true });
    if (opts.keepScroll) return;
    if (restoreY !== null) { window.requestAnimationFrame(function () { window.scrollTo(0, restoreY); }); return; }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', function () { syncHist(); route({ focus: true }); });
  main.addEventListener('change', function (e) {   // About > Settings
    var n = e.target && e.target.name, v = e.target && e.target.value;
    if (n === 'lang') { setLang(v); var again = main.querySelector('input[name="lang"]:checked'); if (again) again.focus(); }
    else if (n === 'theme') setTheme(v);
    else if (n === 'aboutTextSize') { store.set('textSize', v); applyTextSize(v); }
  });
  main.addEventListener('click', function (e) {
    var f = e.target.closest ? e.target.closest('.search-page .filter[data-kind]') : null;
    if (f) { searchKind = f.getAttribute('data-kind'); route({ keepScroll: true }); }
  });

  /* ===== Mobile tab bar: hides on scroll down, shows on scroll up ===== */
  (function initTabbar() {
    var lastY = window.scrollY, hold = 0, ticking = false;
    // Guard both: classList.add/remove rewrite the attribute even when nothing changes,
    // which would re-fire the MutationObserver below forever.
    function show() { if (document.body.classList.contains('tabbar-hidden')) document.body.classList.remove('tabbar-hidden'); }
    function hide() { if (!document.body.classList.contains('tabbar-hidden')) document.body.classList.add('tabbar-hidden'); }
    function update() {
      ticking = false;
      var y = window.scrollY, dy = y - lastY, max = document.documentElement.scrollHeight - window.innerHeight;
      var a = document.activeElement;
      var typing = !!(a && a.matches && a.matches('input, textarea, select'));
      if (Date.now() < hold || document.body.classList.contains('drawer-open') || typing || y < 80 || y > max - 80) { show(); lastY = y; }
      else if (dy > 10) { hide(); lastY = y; }
      else if (dy < -6) { show(); lastY = y; }
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('hashchange', function () { hold = Date.now() + 700; show(); });
    document.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches('input, textarea, select')) show(); });
    new MutationObserver(function () { if (document.body.classList.contains('drawer-open')) show(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  })();

  /* ===== Backup: export / import / undo (everything stored under PREFIX) ===== */
  var BK_APP = 'genogram', BK_UNDO = BK_APP + ':undo-import';
  function bkCollect() {
    var data = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) data[k.slice(PREFIX.length)] = localStorage.getItem(k);
      }
    } catch (e) {}
    return data;
  }
  function bkReplace(data) {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(PREFIX) === 0) keys.push(k); }
    keys.forEach(function (k) { localStorage.removeItem(k); });
    Object.keys(data).forEach(function (k) { localStorage.setItem(PREFIX + k, data[k]); });
  }
  function bkSummary(data) {
    var n = Object.keys(data || {}).filter(function (k) { return k !== 'lastBackup'; }).length;
    return n ? tf(n === 1 ? 'backup.item1' : 'backup.itemN', { n: n }) : t('backup.nothing');
  }
  function bkDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale(), { year: 'numeric', month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
  }
  function bkStatus(msg, isErr) {
    var el = document.getElementById('bk-status');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-error', !!isErr);
  }
  function bkPaint() {
    var meta = document.getElementById('bk-meta'), un = document.getElementById('bk-undo');
    var last = store.get('lastBackup', null);
    if (meta) meta.textContent = tf('backup.onDevice', { summary: bkSummary(bkCollect()) }) + ' ' + (last && bkDate(last) ? tf('backup.lastExported', { date: bkDate(last) }) : t('backup.notExported'));
    var has = false;
    try { has = !!localStorage.getItem(BK_UNDO); } catch (e) {}
    if (un) un.hidden = !has;
  }
  function bkExport() {
    var now = new Date();
    store.set('lastBackup', now.toISOString());
    var data = bkCollect();
    var payload = { app: BK_APP, format: 1, exported: now.toISOString(), attribution: ATTRIBUTION, summary: bkSummary(data), data: data };
    var name = BK_APP + '-backup-' + now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate()) + '.json';
    var json = JSON.stringify(payload, null, 1);
    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    var file = null;
    try { file = new File([json], name, { type: 'application/json' }); } catch (e) {}
    if (standalone && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      // Installed apps on phones cannot always download files; the share sheet can save to Files or send it on.
      navigator.share({ files: [file], title: tf('backup.shareTitle', { app: APP_NAME }) }).then(function () {
        bkStatus(t('backup.shared')); bkPaint();
      }).catch(function () { bkStatus(t('backup.exportCancelled')); });
      return;
    }
    var url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    bkStatus(tf('backup.saved', { name: name }));
    bkPaint();
  }
  function bkImport(file) {
    if (!file) return;
    var reader = new FileReader();
    var bad = tf('backup.notBackup', { app: APP_NAME });
    reader.onerror = function () { bkStatus(t('backup.unreadable'), true); };
    reader.onload = function () {
      var p;
      try { p = JSON.parse(reader.result); } catch (e) { bkStatus(bad, true); return; }
      var ok = p && p.app === BK_APP && p.data && typeof p.data === 'object' &&
        Object.keys(p.data).every(function (k) { return typeof p.data[k] === 'string' && k.length < 80; });
      if (ok) Object.keys(p.data).forEach(function (k) { try { JSON.parse(p.data[k]); } catch (e) { ok = false; } });
      if (!ok) { bkStatus(bad, true); return; }
      var msg = tf('backup.confirmImport', { date: bkDate(p.exported) || t('backup.unknownDate'), backup: bkSummary(p.data), device: bkSummary(bkCollect()) });
      if (!window.confirm(msg)) { bkStatus(t('backup.importCancelled')); return; }
      try {
        localStorage.setItem(BK_UNDO, JSON.stringify({ saved: new Date().toISOString(), data: bkCollect() }));
        bkReplace(p.data);
      } catch (e) { bkStatus(t('backup.importFailed'), true); return; }
      bkStatus(t('backup.imported'));
      setTimeout(function () { location.reload(); }, 700);
    };
    reader.readAsText(file);
  }
  function bkUndo() {
    var snap; try { snap = JSON.parse(localStorage.getItem(BK_UNDO)); } catch (e) {}
    if (!snap || !snap.data) { bkPaint(); return; }
    if (!window.confirm(tf('backup.confirmUndo', { summary: bkSummary(snap.data) }))) return;
    try { bkReplace(snap.data); localStorage.removeItem(BK_UNDO); } catch (e) { bkStatus(t('backup.undoFailed'), true); return; }
    bkStatus(t('backup.restored'));
    setTimeout(function () { location.reload(); }, 700);
  }
  (function initBackup() {
    var ex = document.getElementById('bk-export'), fi = document.getElementById('bk-file'), un = document.getElementById('bk-undo');
    if (!ex || !fi) return;
    ex.addEventListener('click', bkExport);
    fi.addEventListener('change', function () { bkImport(fi.files && fi.files[0]); fi.value = ''; });
    if (un) un.addEventListener('click', bkUndo);
    bkPaint();
  })();

  /* ===== Language switching: static markup (data-i18n / data-i18n-attr in index.html), then re-render ===== */
  function applyStatic() {
    document.documentElement.setAttribute('lang', lang);
    var els = document.querySelectorAll('[data-i18n]'), i, v;
    for (i = 0; i < els.length; i++) { v = t(els[i].getAttribute('data-i18n')); if (v !== els[i].getAttribute('data-i18n')) els[i].textContent = v; }
    els = document.querySelectorAll('[data-i18n-attr]');
    for (i = 0; i < els.length; i++) {
      var pairs = els[i].getAttribute('data-i18n-attr').split(';');
      for (var j = 0; j < pairs.length; j++) {
        var at = pairs[j].indexOf(':'), key = pairs[j].slice(at + 1);
        if (at > 0 && t(key) !== key) els[i].setAttribute(pairs[j].slice(0, at), t(key));
      }
    }
    var brand = document.querySelector('.brand');
    if (brand) brand.setAttribute('aria-label', tf('brand.home', { name: APP_NAME }));
    var panel = document.getElementById('textSizePanel');
    if (panel) panel.setAttribute('aria-label', t('textsize.title'));
    labelCollapse();
    applyTheme(getTheme());
  }
  function setLang(l) {
    lang = l === 'tl' ? 'tl' : 'en';
    store.set('lang', lang);
    applyStatic();
    bkPaint();
    var panel = document.getElementById('textSizePanel');
    if (panel && !panel.hidden) { panel.hidden = true; var tb = document.getElementById('textSizeBtn'); if (tb) tb.setAttribute('aria-expanded', 'false'); }
    route({ keepScroll: true });   // re-render the current view and the menu in the new language
  }

  /* ===== Start ===== */
  applyStatic();
  route();

  /* ===== Service worker (https or localhost only) ===== */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
