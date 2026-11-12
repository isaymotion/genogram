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
  /* The app's own content (editor, Symbols, How to use) is written in English here; data/content-tl.js maps each
     English string to its Tagalog. tx(s): the text in the current language. txf(s, map): fills {name} placeholders
     after translating, so word order can differ (the caller escapes the result as before). txh(s, html): for text
     that holds markup; the translated sentence is escaped first, then the ready-made (already escaped) HTML pieces
     are put in its {name} placeholders. Stored values (relationship names, couple status, line types) stay English. */
  var CONTENT_TL = window.CONTENT_TL || {};
  function tx(s) { if (lang !== 'tl' || typeof s !== 'string' || !has(CONTENT_TL, s)) return s; var v = CONTENT_TL[s]; return typeof v === 'string' && v ? v : s; }
  function fillIn(s, map) { return s.replace(/\{(\w+)\}/g, function (m, k) { return map && has(map, k) ? String(map[k]) : m; }); }
  function txf(s, map) { return fillIn(tx(s), map); }
  function txh(s, html) { return fillIn(esc(tx(s)), html); }

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
    { label: 'Privacy', href: '#/privacy', icon: 'info', group: 'App', tile: false },
    { label: 'About', tkey: 'nav.about', href: '#/about', icon: 'info', group: 'App', tile: false }
  ];
  var NAV_GROUPS = { Start: 'nav.start', Screens: 'nav.screens', App: 'nav.app' };   // group name -> strings key
  function navLabel(n) { return n.tkey ? t(n.tkey) : tx(n.label); }

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
  /* ===== Passcode lock. It closes the app to someone who picks up the phone; it does not encrypt what is saved. =====
     Only a salted PBKDF2 hash of the passcode is kept, under the key "lock" (left out of backups). */
  var LOCK = store.get('lock', null), lockOK = !!(window.crypto && window.crypto.subtle && window.TextEncoder), lockFails = 0, lockUntil = 0, hiddenAt = 0;
  var LOCK_AFTER = 2 * 60 * 1000;   // lock again after this long in the background
  if (LOCK && (!LOCK.salt || !LOCK.hash)) LOCK = null;
  function b64(buf) { var b = new Uint8Array(buf), o = '', i; for (i = 0; i < b.length; i++) o += String.fromCharCode(b[i]); return btoa(o); }
  function unb64(str) { var bin = atob(str), a = new Uint8Array(bin.length), i; for (i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function lockHash(pass, salt, iter) {
    return window.crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return window.crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(salt), iterations: iter, hash: 'SHA-256' }, k, 256); }).then(b64);
  }
  function lockCheck(pass) { return LOCK ? lockHash(pass, LOCK.salt, LOCK.iter || 150000).then(function (h) { return h === LOCK.hash; }) : Promise.resolve(true); }
  function lockSet(pass) {
    var salt = b64(window.crypto.getRandomValues(new Uint8Array(16)));
    return lockHash(pass, salt, 150000).then(function (h) { LOCK = { salt: salt, hash: h, iter: 150000 }; store.set('lock', LOCK); });
  }
  function lockCard() {
    var note = '<p class="hint">' + esc(tx('The lock keeps the app closed to someone who picks up this phone or computer. It does not encrypt what is saved, and a forgotten passcode cannot be recovered: export a backup first.')) + '</p>';
    if (!lockOK) return '<p>' + esc(tx('The passcode lock needs a newer browser and a secure (https) page.')) + '</p>';
    if (LOCK) return '<p><strong>' + esc(tx('Passcode lock is on.')) + '</strong> ' + esc(tx('The app asks for the passcode when it opens, and after two minutes in the background.')) + '</p>' +
      '<div class="flds">' + field(tx('Current passcode'), '<input type="password" id="lk-cur" inputmode="numeric" autocomplete="off" maxlength="12">', 'w2') + '</div>' +
      '<p class="lockcard__acts"><button type="button" class="btn" data-lock="now">' + esc(tx('Lock now')) + '</button><button type="button" class="btn" data-lock="off">' + esc(tx('Turn off the lock')) + '</button></p><p class="status" id="lk-status" role="status" aria-live="polite"></p>' + note;
    return '<p><strong>' + esc(tx('Passcode lock is off.')) + '</strong> ' + esc(tx('Choose 4 to 12 digits.')) + '</p>' +
      '<div class="flds">' + field(tx('New passcode'), '<input type="password" id="lk-new" inputmode="numeric" autocomplete="off" maxlength="12">', 'w2') + field(tx('Type it again'), '<input type="password" id="lk-new2" inputmode="numeric" autocomplete="off" maxlength="12">', 'w2') + '</div>' +
      '<p class="lockcard__acts"><button type="button" class="btn btn--solid" data-lock="on">' + esc(tx('Turn on the lock')) + '</button></p><p class="status" id="lk-status" role="status" aria-live="polite"></p>' + note;
  }
  function lockShow() {
    if (!LOCK || document.getElementById('lockscreen')) return;
    if (saveTimer) saveNow();
    document.documentElement.classList.add('locked');
    var el = document.createElement('div'); el.id = 'lockscreen'; el.className = 'lockscreen'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'lock-h');
    el.innerHTML = '<form class="lockscreen__box" autocomplete="off"><img src="icons/icon-192.png" alt="" width="64" height="64"><h1 id="lock-h">' + esc(txf('{app} is locked', { app: APP_NAME })) + '</h1>' +
      '<label class="fld"><span>' + esc(tx('Passcode')) + '</span><input type="password" id="lock-in" inputmode="numeric" autocomplete="off" maxlength="12"></label>' +
      '<button type="submit" class="btn btn--solid">' + esc(tx('Unlock')) + '</button><p class="status" id="lock-status" role="status" aria-live="polite"></p>' +
      '<details class="lockscreen__forgot"><summary>' + esc(tx('Forgot the passcode?')) + '</summary><p>' + esc(tx('The passcode cannot be recovered. You can erase the genograms saved in this app on this device and start again. If you exported a backup, you can import it afterwards.')) + '</p>' +
      '<button type="button" class="btn" id="lock-erase">' + esc(tx('Erase the genograms and remove the lock')) + '</button></details></form>';
    document.body.appendChild(el);
    var input = el.querySelector('#lock-in'), status = el.querySelector('#lock-status');
    setTimeout(function () { input.focus(); }, 30);
    el.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var wait = Math.ceil((lockUntil - Date.now()) / 1000);
      if (wait > 0) { status.textContent = txf('Too many tries. Wait {n} seconds.', { n: wait }); return; }
      lockCheck(input.value).then(function (ok) {
        if (ok) { lockFails = 0; el.remove(); document.documentElement.classList.remove('locked'); route({ keepScroll: true }); return; }
        lockFails++; input.value = ''; input.focus();
        if (lockFails >= 5) { lockUntil = Date.now() + 30000; lockFails = 0; status.textContent = txf('Too many tries. Wait {n} seconds.', { n: 30 }); } else status.textContent = tx('That passcode is not right.');
      }, function () { status.textContent = tx('The passcode could not be checked on this browser.'); });
    });
    el.querySelector('#lock-erase').addEventListener('click', function () {
      if (!window.confirm(tx('Erase every genogram saved in this app on this device, and remove the lock? This cannot be undone.'))) return;
      try { var keys = [], i; for (i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(PREFIX) === 0) keys.push(k); } keys.forEach(function (k) { localStorage.removeItem(k); }); } catch (e2) {}
      location.reload();
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hiddenAt = Date.now(); if (saveTimer) saveNow(); }
    else if (LOCK && hiddenAt && Date.now() - hiddenAt > LOCK_AFTER) lockShow();
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-lock]') : null; if (!b) return;
    var act = b.getAttribute('data-lock'), st = document.getElementById('lk-status'), tell = function (m) { if (st) st.textContent = m; };
    if (act === 'now') { lockShow(); return; }
    if (act === 'on') {
      var a = (document.getElementById('lk-new') || {}).value || '', a2 = (document.getElementById('lk-new2') || {}).value || '';
      if (!/^\d{4,12}$/.test(a)) { tell(tx('Use 4 to 12 digits.')); return; }
      if (a !== a2) { tell(tx('The two passcodes are not the same.')); return; }
      lockSet(a).then(function () { route({ keepScroll: true }); var s2 = document.getElementById('lk-status'); if (s2) s2.textContent = tx('The lock is on.'); }, function () { tell(tx('The lock could not be turned on in this browser.')); });
      return;
    }
    if (act === 'off') {
      lockCheck((document.getElementById('lk-cur') || {}).value || '').then(function (ok) {
        if (!ok) { tell(tx('That passcode is not right.')); return; }
        LOCK = null; store.del('lock'); route({ keepScroll: true }); var s2 = document.getElementById('lk-status'); if (s2) s2.textContent = tx('The lock is off.');
      }, function () { tell(tx('The passcode could not be checked on this browser.')); });
    }
  });

  VIEWS.about = function () {
    var sizes = TEXT_SIZES.map(function (z) { return [z[0], t(z[1])]; });
    return '<div class="wrap page"><header class="page__head"><h1>' + esc(t('nav.about')) + '</h1><p>' + esc(META.tagline || '') + '</p></header>' +
      '<div class="prose"><p><strong>' + esc(APP_NAME) + '</strong> · ' + esc(t('about.version')) + ' ' + esc(META.version || '') + '</p><p>' + esc(ATTRIBUTION) + '</p></div>' +
      '<h2>' + esc(t('about.settings')) + '</h2><div class="card">' +
        segGroup('lang', t('about.language'), [['en', t('about.langEn')], ['tl', t('about.langTl')]], lang) +
        segGroup('theme', t('theme.title'), [['auto', t('theme.auto')], ['light', t('theme.light')], ['dark', t('theme.dark')]], getTheme()) +
        segGroup('aboutTextSize', t('textsize.title'), sizes, String(store.get('textSize', '100'))) +
      '</div>' +
      '<h2>' + esc(tx('Privacy')) + '</h2><div class="card lockcard">' + lockCard() + '</div>' +
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
      ptName: '', ptAge: '', ptSex: '', ptOcc: '', ptCond: '', ptFill: true, ptSubst: false, ptBond: '', ptDead: false, parentsRel: '', ptRel: '', byAge: true, showTitle: true, initials: false, household: false, ptBorn: '', ptDied: '', ptMed: false, ptGid: '', notes: '', family: [], links: [] };
  }
  function addChart(c) { DB.byId[c.id] = c; DB.order.unshift(c.id); saveNow(); rebuildIndex(); return c; }
  function removeChart(id) { delete DB.byId[id]; DB.order = DB.order.filter(function (x) { return x !== id; }); saveNow(); rebuildIndex(); }
  function charts() { return DB.order.map(getChart).filter(Boolean); }
  /* First visit: a short welcome in place of the empty list. Four screens; it is not shown again once finished or skipped. */
  var introAt = 0;
  function welcomeCard() {
    var W = [[tx('Welcome to Genogram'), tx('Draw a family genogram in a few minutes. Everything stays on this device: there is no account and nothing is sent anywhere.')],
      [tx('1. Add the family'), tx('Start with the index person, then tap + Father, + Mother, + Sister and so on. Initials are enough.')],
      [tx('2. Mark how they relate'), tx('Choose each couple’s relationship, then add lines for close, distant, conflict, abuse or caregiving.')],
      [tx('3. Save and share'), tx('The chart draws itself with a key. Save it as a picture or a PDF, share one genogram as a file, or back up everything.')]];
    var i = Math.max(0, Math.min(W.length - 1, introAt)), last = i === W.length - 1;
    return '<div class="empty welcome" id="welcome"><p class="welcome__dots" aria-hidden="true">' + W.map(function (_, j) { return '<span' + (j === i ? ' class="is-on"' : '') + '></span>'; }).join('') + '</p>' +
      '<h2>' + esc(W[i][0]) + '</h2><p>' + esc(W[i][1]) + '</p><p class="welcome__acts">' +
      (last ? '<button type="button" class="btn btn--solid" data-act="intro-new">' + esc(tx('New genogram')) + '</button> <button type="button" class="btn" data-act="intro-sample">' + esc(tx('Open a sample family')) + '</button>'
            : '<button type="button" class="btn btn--solid" data-act="intro-next">' + esc(tx('Next')) + '</button> <button type="button" class="link-btn" data-act="intro-skip">' + esc(tx('Skip')) + '</button>') + '</p></div>';
  }
  /* Genograms live only on this device: after a few have been made, suggest a backup file now and then */
  function backupNudge(n) {
    if (n < 3) return '';
    var day = 86400000, last = Date.parse(store.get('lastBackup', '') || '') || 0, snooze = Date.parse(store.get('bkSnooze', '') || '') || 0, now = Date.now();
    if (now - last < 30 * day || now - snooze < 14 * day) return '';
    return '<div class="callout nudge" id="bk-nudge"><p class="callout__title">' + esc(tx('Save a backup file')) + '</p><p>' + esc(txf('Your {n} genograms are saved only on this device. A backup file keeps them safe if the phone is lost or the browser data is cleared.', { n: n })) + '</p>' +
      '<p class="nudge__acts"><button type="button" class="btn btn--solid" data-act="bk-now">' + esc(tx('Save a backup now')) + '</button> <button type="button" class="link-btn" data-act="bk-later">' + esc(tx('Remind me later')) + '</button></p></div>';
  }
  /* Made-up families that show what the app can draw. Every name and detail is invented. sampleChart(n): n = 0 (Reyes) to 4 */
  function sampleChart(n) {
    if (n && SAMPLES[n - 1]) return SAMPLES[n - 1]();
    var c = blankChart('Sample: the Reyes family');
    c.ptName = 'Lia'; c.ptAge = '34'; c.ptSex = 'Female'; c.ptOcc = 'teacher'; c.ptCond = 'Major depressive disorder'; c.parentsRel = 'Separated'; c.ptRel = 'Married';
    c.family = [
      { id: 'pgf', name: 'Pedro', rel: 'Paternal grandfather', age: '70', status: 'Deceased', cond: 'Stroke' },
      { id: 'pgm', name: 'Rosa', rel: 'Paternal grandmother', age: '85' },
      { id: 'fa', name: 'Ramon', rel: 'Father', age: '62', occ: 'tricycle driver', subst: true, cond: 'Alcohol use disorder' },
      { id: 'mo', name: 'Lourdes', rel: 'Mother', age: '58', occ: 'vendor', cond: 'Hypertension', withPt: true },
      { id: 'un', name: 'Ben', rel: 'Paternal uncle', age: '60' },
      { id: 'co', name: 'Nico', rel: 'Male cousin', age: '31', of: 'un', bond: 'Adopted' },
      { id: 'b1', name: 'Jun', rel: 'Brother', age: '38', occ: 'seafarer' },
      { id: 'b1w', name: 'Tess', rel: "Sibling's spouse / partner", sex: 'Female', age: '36', of: 'b1' },
      { id: 'n1', name: 'Kiko', rel: 'Nephew', age: '9', of: 'b1' },
      { id: 's1', name: 'Ana', rel: 'Sister', age: '30', occ: 'nurse' },
      { id: 'h', name: 'Marco', rel: 'Husband', age: '36', occ: 'engineer', withPt: true },
      { id: 'k1', name: 'Bea', rel: 'Daughter', age: '8', twin: true, withPt: true },
      { id: 'k2', name: 'Migo', rel: 'Son', age: '8', twin: true, withPt: true },
      { id: 'k0', name: '', rel: 'Child (sex not stated)', age: '', preg: 'Miscarriage' },
      { id: 'k3', name: 'Baby', rel: 'Son', age: '8 mo', withPt: true }
    ];
    c.links = [{ a: 'pt', type: 'Conflictual', b: 'fa' }, { a: 'pt', type: 'Very close / enmeshed', b: 'mo' }, { a: 'pt', type: 'Close', b: 's1' }, { a: 'b1', type: 'Distant', b: 'fa' }];
    return c;
  }
  var SAMPLES = [
    function () {   // a blended family: annulled marriage, step-parents on both sides, half-siblings
      var c = blankChart('Sample: the Santos family');
      c.ptName = 'Paolo'; c.ptAge = '16'; c.ptSex = 'Male'; c.ptOcc = 'Grade 10 student'; c.ptCond = 'ADHD'; c.parentsRel = 'Nullity';
      c.family = [
        { id: 'mgf', name: 'Tomas', rel: 'Maternal grandfather', age: '70', status: 'Deceased', cond: 'Heart attack' },
        { id: 'mgm', name: 'Nena', rel: 'Maternal grandmother', age: '68', cond: 'Diabetes', withPt: true },
        { id: 'fa', name: 'Dennis', rel: 'Father', age: '45', occ: 'seafarer' },
        { id: 'smo', name: 'Joy', rel: 'Stepmother', age: '38', relStatus: 'Married' },
        { id: 'phb', name: 'Enzo', rel: 'Paternal half-brother', age: '3' },
        { id: 'mo', name: 'Carla', rel: 'Mother', age: '42', occ: 'call center agent', psych: true, cond: 'Generalized anxiety disorder', withPt: true },
        { id: 'sfa', name: 'Rico', rel: 'Stepfather', age: '47', occ: 'driver', relStatus: 'Cohabitation', withPt: true },
        { id: 'mhs', name: 'Mika', rel: 'Maternal half-sister', age: '5', withPt: true },
        { id: 's1', name: 'Trina', rel: 'Sister', age: '19', occ: 'college student' }
      ];
      c.links = [{ a: 'pt', type: 'Conflictual', b: 'sfa' }, { a: 'pt', type: 'Close', b: 's1' }, { a: 'pt', type: 'Distant', b: 'fa' }, { a: 'pt', type: 'Very close / enmeshed', b: 'mgm' }];
      return c;
    },
    function () {   // an older index person: children, their partners and the grandchildren
      var c = blankChart('Sample: the Dela Cruz family');
      c.ptName = 'Corazon'; c.ptAge = '72'; c.ptSex = 'Female'; c.ptOcc = 'retired teacher'; c.ptCond = 'Major neurocognitive disorder'; c.ptRel = 'Married';
      c.family = [
        { id: 'b1', name: 'Andres', rel: 'Brother', age: '77', status: 'Deceased', cond: 'Stroke' },
        { id: 'z1', name: 'Pilar', rel: 'Sister', age: '75', psych: true, cond: 'Dementia' },
        { id: 'h', name: 'Ernesto', rel: 'Husband', age: '74', status: 'Deceased', cond: 'Lung cancer' },
        { id: 'd1', name: 'Marites', rel: 'Daughter', age: '48', occ: 'nurse; main carer', withPt: true },
        { id: 'd1h', name: 'Rolly', rel: "Child's spouse / partner", sex: 'Male', age: '50', of: 'd1', withPt: true },
        { id: 'g1', name: 'Carlo', rel: 'Grandson', age: '21', of: 'd1' },
        { id: 'g2', name: 'Jana', rel: 'Granddaughter', age: '17', of: 'd1', withPt: true },
        { id: 's1', name: 'Noel', rel: 'Son', age: '45', occ: 'works in Dubai' },
        { id: 's1w', name: 'Liza', rel: "Child's spouse / partner", sex: 'Female', age: '43', of: 's1', relStatus: 'Separated' },
        { id: 'g3', name: 'Ella', rel: 'Granddaughter', age: '12', of: 's1', twin: true },
        { id: 'g4', name: 'Emma', rel: 'Granddaughter', age: '12', of: 's1', twin: true },
        { id: 'd2', name: 'Grace', rel: 'Daughter', age: '40', occ: 'accountant', psych: true, cond: 'Major depressive disorder' },
        { id: 'g5', name: 'Sam', rel: 'Grandson', age: '6', of: 'd2', bond: 'Adopted' }
      ];
      c.links = [{ a: 'pt', type: 'Very close / enmeshed', b: 'd1' }, { a: 'pt', type: 'Distant', b: 's1' }, { a: 'd1', type: 'Conflictual', b: 's1' }, { a: 'pt', type: 'Close', b: 'd2' }];
      return c;
    },
    function () {   // substance use across generations; a current partner, two former partners and their children
      var c = blankChart('Sample: the Villanueva family');
      c.ptName = 'Marco'; c.ptAge = '29'; c.ptSex = 'Male'; c.ptOcc = 'construction worker'; c.ptCond = 'Methamphetamine use disorder'; c.ptFill = false; c.ptSubst = true; c.parentsRel = 'Married';
      c.family = [
        { id: 'pgf', name: 'Isko', rel: 'Paternal grandfather', age: '66', status: 'Deceased', subst: true, cond: 'Alcohol use disorder' },
        { id: 'pgm', name: 'Sela', rel: 'Paternal grandmother', age: '82' },
        { id: 'pun', name: 'Dado', rel: 'Paternal uncle', age: '60', psych: true, cond: 'Schizophrenia' },
        { id: 'fa', name: 'Ruben', rel: 'Father', age: '58', status: 'Deceased', subst: true, cond: 'Alcohol use disorder; liver cirrhosis' },
        { id: 'mo', name: 'Elena', rel: 'Mother', age: '55', occ: 'market vendor' },
        { id: 'b1', name: 'Jomar', rel: 'Brother', age: '33', subst: true, cond: 'Cannabis use disorder' },
        { id: 's1', name: 'Liezl', rel: 'Sister', age: '25', occ: 'caregiver abroad' },
        { id: 'p1', name: 'Kaye', rel: 'Partner', sex: 'Female', age: '26', relStatus: 'Cohabitation', withPt: true },
        { id: 'x1', name: 'Jen', rel: 'Former partner', sex: 'Female', age: '28', relStatus: 'Committed relationship and separation' },
        { id: 'x2', name: 'Mae', rel: 'Former partner', sex: 'Female', age: '24', relStatus: 'Casual relationship and separation' },
        { id: 'k1', name: 'Jace', rel: 'Son', age: '7', of: 'x1' },
        { id: 'k2', name: 'Lia', rel: 'Daughter', age: '3', of: 'x2' },
        { id: 'k3', name: '', rel: 'Child (sex not stated)', age: '24 weeks', preg: 'Pregnancy' }
      ];
      c.links = [{ a: 'fa', type: 'Abusive toward', b: 'pt' }, { a: 'pt', type: 'Close but conflictual', b: 'mo' }, { a: 'pt', type: 'Cut off / estranged', b: 'b1' }, { a: 'pt', type: 'Close', b: 's1' }];
      return c;
    },
    function () {   // a family history of psychosis: great-grandparents, an aunt and cousins, a twin, a fiancé
      var c = blankChart('Sample: the Lim family');
      c.ptName = 'Angela'; c.ptAge = '22'; c.ptSex = 'Female'; c.ptOcc = 'nursing student'; c.ptCond = 'Schizophrenia'; c.parentsRel = 'Married';
      c.family = [
        { id: 'gg1', name: 'Jose', rel: 'Great-grandfather', of: 'mgm', status: 'Deceased' },
        { id: 'gg2', name: 'Ines', rel: 'Great-grandmother', of: 'mgm', status: 'Deceased', psych: true, cond: 'Psychosis, never treated' },
        { id: 'mgf', name: 'Felipe', rel: 'Maternal grandfather', age: '78' },
        { id: 'mgm', name: 'Aurora', rel: 'Maternal grandmother', age: '71', status: 'Deceased', psych: true, cond: 'Bipolar disorder' },
        { id: 'fa', name: 'Henry', rel: 'Father', age: '52', occ: 'shop owner', withPt: true },
        { id: 'mo', name: 'Susan', rel: 'Mother', age: '50', occ: 'bookkeeper', withPt: true },
        { id: 'mau', name: 'Cecilia', rel: 'Maternal aunt', age: '47', psych: true, cond: 'Schizophrenia' },
        { id: 'co1', name: 'Ben', rel: 'Male cousin', age: '20', of: 'mau' },
        { id: 'co2', name: 'Joy', rel: 'Female cousin', age: '14', of: 'mau', bond: 'Foster' },
        { id: 'z1', name: 'Andrea', rel: 'Sister', age: '22', twin: true, withPt: true },
        { id: 'b1', name: 'Kevin', rel: 'Brother', age: '17', withPt: true },
        { id: 'fi', name: 'Miguel', rel: 'Partner', sex: 'Male', age: '24', relStatus: 'Engagement' }
      ];
      c.links = [{ a: 'pt', type: 'Very close / enmeshed', b: 'z1' }, { a: 'pt', type: 'Close', b: 'mo' }, { a: 'pt', type: 'Distant', b: 'fa' }, { a: 'pt', type: 'Close', b: 'fi' }];
      return c;
    }
  ];
  /* What the drawing engine expects */
  /* "Maria Clara Santos" -> "M.C.S."; text that is already initials (AA, J.R.) is left alone */
  function initialsOf(s) {
    s = String(s || '').trim();
    if (!s || /^([A-Z]\.?){1,4}$/.test(s)) return s;
    return s.split(/[\s\-]+/).map(function (w) { var ch = w.replace(/^[^A-Za-z\u00C0-\u024F0-9]+/, '').charAt(0); return ch ? ch.toUpperCase() + '.' : ''; }).join('');
  }
  function toEngine(c) {
    var ini = !!c.initials, fam = !ini ? c.family : c.family.map(function (m) { if (!m || !m.name) return m; var o = {}; for (var k in m) if (has(m, k)) o[k] = m[k]; o.name = initialsOf(m.name); return o; });
    return { agesex: (c.ptAge || '') + ' / ' + (c.ptSex || ''), parentsRel: c.parentsRel, ptRel: c.ptRel, genoPtName: ini ? initialsOf(c.ptName) : c.ptName, genoPtOcc: c.ptOcc, genoPtCond: c.ptCond,
      genoPtFill: c.ptFill !== false, genoPtSubst: !!c.ptSubst, genoPtBond: c.ptBond || '', genoPtDead: !!c.ptDead, genoByAge: c.byAge !== false, genoHousehold: !!c.household, genoPtBorn: c.ptBorn || '', genoPtDied: c.ptDead ? c.ptDied || '' : '', genoPtMed: !!c.ptMed, genoPtGid: c.ptGid || '', genoNotes: c.notes || '', genoPos: c.pos || null, family: fam, famLinks: c.links };
  }
  function chartTitleLine(c) { var d = new Date(); return (c.title || 'Family genogram') + ' (' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ')'; }
  function layoutOf(c, withTitle) { G.famIds(c); return G.layout(toEngine(c), withTitle && c.showTitle !== false ? { title: chartTitleLine(c) } : {}); }
  function peopleCount(c) { return 1 + c.family.reduce(function (a, m) { return a + (m && (m.name || m.rel) ? (G.famCount(m) || 1) : 0); }, 0); }

  /* ---------- groups: where each relationship sits, and its colour ---------- */
  var GROUPS = [   // label is translated when drawn (stepFamily)
    { key: 'gp', label: 'Grandparents and great-grandparents', c: '#C77700', roles: ['ggp', 'pgf', 'pgm', 'mgf', 'mgm'] },
    { key: 'par', label: 'Parents, aunts and uncles', c: '#D4502A', roles: ['father', 'mother', 'stepfa', 'stepmo', 'pside', 'mside'] },
    { key: 'sib', label: 'Brothers and sisters', c: '#0E8A8A', roles: ['sib', 'phalf', 'mhalf'] },
    { key: 'cous', label: 'Cousins', c: '#8A5A2B', roles: ['cousin'] },
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
  function halfArc(x, y, s) { var a = [], i; for (i = 0; i <= 16; i++) a.push([x + s / 2 - Math.cos(Math.PI * i / 16) * s / 2, y + s / 2 + Math.sin(Math.PI * i / 16) * s / 2]); return a; }
  function symPrims(o) {   // o: {sex, fill, subst, dead, pt, text, ghost}
    var g = o.sex === 'F' ? 'ellipse' : o.sex === 'U' ? 'diamond' : 'rect', x = 0.15, y = 0.15, s = 0.9, out = [];
    out.push({ t: 'shape', g: g, x: x, y: y, w: s, h: s, fill: o.fill ? G.FILL : 'FFFFFF', c: o.ghost ? G.SLATE : G.INK, sw: 0.055, dash: !!o.ghost,
      text: o.text ? { t: String(o.text), fs: String(o.text).length > 2 ? 0.28 : 0.38, b: true, c: o.fill ? 'FFFFFF' : G.INK } : null });
    if (o.subst) { out.push({ t: 'poly', pts: g === 'ellipse' ? halfArc(x, y, s) : g === 'diamond' ? [[x, y + s / 2], [x + s / 2, y + s], [x + s, y + s / 2]] : [[x, y + s / 2], [x, y + s], [x + s, y + s], [x + s, y + s / 2]], c: G.INK, w: 0.03, fill: G.INK, close: true }); out[0].text = null; }
    if (o.pt) out.push({ t: 'shape', g: g, x: x + 0.11, y: y + 0.11, w: s - 0.22, h: s - 0.22, fill: '', c: o.fill ? 'FFFFFF' : G.INK, sw: 0.045 });
    if (o.dead) { out.push({ t: 'line', x1: 0.05, y1: 0.05, x2: 1.15, y2: 1.15, c: G.INK, w: 0.05 }); out.push({ t: 'line', x1: 1.15, y1: 0.05, x2: 0.05, y2: 1.15, c: G.INK, w: 0.05 }); }
    return out;
  }
  function memberIcon(m) {
    var age = String(m.age || '').replace(/[^0-9]/g, '').slice(0, 3), n = G.famCount(m);
    var pg = G.famPreg(m);
    if (pg === 'Pregnancy') return miniSVG([{ t: 'poly', pts: [[0.6, 0.2], [1.05, 1.0], [0.15, 1.0]], c: G.INK, w: 0.055, fill: 'FFFFFF', close: true }], 1.2, 1.2, 36);
    if (pg === 'Miscarriage') return miniSVG([{ t: 'shape', g: 'ellipse', x: 0.4, y: 0.4, w: 0.4, h: 0.4, fill: G.INK, c: G.INK, sw: 0.03 }], 1.2, 1.2, 36);
    if (pg === 'Abortion') return miniSVG([{ t: 'line', x1: 0.38, y1: 0.38, x2: 0.82, y2: 0.82, c: G.INK, w: 0.07 }, { t: 'line', x1: 0.82, y1: 0.38, x2: 0.38, y2: 0.82, c: G.INK, w: 0.07 }], 1.2, 1.2, 36);
    return miniSVG(symPrims({ sex: G.memberSex(m), fill: !!m.psych, subst: !!m.subst, dead: m.status === 'Deceased' || pg === 'Stillbirth', text: pg ? '' : n ? '×' + n : age }), 1.2, 1.2, 36);
  }
  function who(m) { return m.name ? m.name + (m.rel ? ' (' + tx(m.rel) + ')' : '') : (G.famCount(m) ? G.famCount(m) + ' × ' : '') + (m.rel ? tx(m.rel) : tx('No name yet')); }
  function peopleText(n, onChart) { return onChart ? txf(n === 1 ? '{n} person on the chart' : '{n} people on the chart', { n: n }) : txf(n === 1 ? '{n} person' : '{n} people', { n: n }); }

  /* ---------- Home ---------- */
  TITLES.home = '';
  VIEWS.home = function () {
    var list = charts(), latest = CHANGELOG[0];
    var steps = [['1', 'Add the family', 'Start with the index person, then tap to add parents, siblings, partners and children.', '#D4502A'],   // translated when drawn below
      ['2', 'Mark how they relate', 'Close, distant, in conflict, cut off: pick two people and the kind of line.', '#0E8A8A'],
      ['3', 'Save the genogram', 'The chart draws itself, oldest to youngest. Save it as a picture or a PDF.', '#C2337A']];
    return '<section class="hero"><div class="wrap hero__inner">' +
        '<p class="hero__kicker">' + esc(tx('Genogram maker')) + '</p><h1>' + txh('Draw the family, {em}', { em: '<em>' + esc(tx('see the pattern.')) + '</em>' }) + '</h1>' +
        '<p class="hero__lead">' + esc(tx('Add the family, mark how people relate, and the genogram draws itself with standard symbols and a key that matches what is on the chart.')) + '</p>' +
        '<p class="hero__actions"><button type="button" class="btn btn--solid" data-act="new">' + esc(tx('New genogram')) + '</button> <button type="button" class="btn" data-act="sample">' + esc(tx('Open a sample family')) + '</button> <label class="btn" for="open-file">' + esc(tx('Open a genogram file')) + '</label><input type="file" id="open-file" class="sr-only" accept=".json,application/json"></p>' +
      '</div></section>' +
      '<div class="wrap home">' +
        '<h2 class="home__h">' + esc(tx('Your genograms')) + '</h2><p class="status" id="ed-status" role="status" aria-live="polite"></p>' + backupNudge(list.length) +
        (list.length
          ? '<div class="charts">' + list.map(function (c) {
              var L = null; try { L = layoutOf(c, false); } catch (e) { L = null; }
              return '<article class="card chartcard"><a class="chartcard__open" href="#/chart/' + esc(c.id) + (c.family.length ? '/view' : '') + '" aria-label="' + esc(txf('Open {title}', { title: c.title })) + '">' +
                '<div class="chartcard__thumb">' + (L ? G.svg(L, 26) : '<span class="muted">' + esc(tx('No family members yet')) + '</span>') + '</div>' +
                '<h3>' + esc(c.title || tx('Family genogram')) + '</h3><p class="muted">' + esc(peopleText(peopleCount(c))) + ' · ' + esc(fmtDate(String(c.updated).slice(0, 10))) + '</p></a>' +
                '<p class="chartcard__acts"><a class="link-btn" href="#/chart/' + esc(c.id) + '">' + esc(tx('Edit')) + '</a><button type="button" class="link-btn" data-act="dup" data-id="' + esc(c.id) + '">' + esc(tx('Duplicate')) + '</button><button type="button" class="link-btn danger" data-act="del" data-id="' + esc(c.id) + '">' + esc(tx('Delete')) + '</button></p></article>';
            }).join('') + '</div>'
          : !store.get('introSeen', false) ? welcomeCard()
          : '<div class="empty"><h2>' + esc(tx('No genograms yet')) + '</h2><p>' + esc(tx('Start a new one, or open the sample family to see how it works.')) + '</p><p><button type="button" class="btn btn--solid" data-act="new">' + esc(tx('New genogram')) + '</button></p></div>') +
        '<h2 class="home__h home__h--gap">' + esc(tx('Sample families')) + '</h2><p class="muted samples__lead">' + esc(tx('Made-up families that show what the app can draw. Opening one adds a copy to your genograms, which you can edit or delete.')) + '</p>' +
        '<div class="card lib samples">' + [['the Reyes family', tx('Three generations: separated parents, twins, a miscarriage, an adopted cousin and a brother’s family.')],
          ['the Santos family', tx('A blended family: an annulled marriage, step-parents, half-siblings and a live-in partner.')],
          ['the Dela Cruz family', tx('An older index person: children and their partners, grandchildren, twins and an adopted grandchild.')],
          ['the Villanueva family', tx('Substance use across generations: a current partner, former partners, children with different mothers and a pregnancy.')],
          ['the Lim family', tx('A family history of psychosis: great-grandparents, an aunt and cousins, a twin sister and a fiancé.')]].map(function (r, i) {
            return '<button type="button" class="lib__row samplerow" data-act="sample-n" data-n="' + i + '"><span><strong>' + esc(r[0].charAt(0).toUpperCase() + r[0].slice(1)) + '</strong><small>' + esc(r[1]) + '</small></span><span class="samplerow__go" aria-hidden="true">›</span></button>'; }).join('') + '</div>' +
        '<h2 class="home__h home__h--gap">' + esc(tx('How it works')) + '</h2><div class="steps">' + steps.map(function (s) {
          return '<div class="stepcard" style="--c:' + s[3] + '"><span class="stepcard__n">' + s[0] + '</span><h3>' + esc(tx(s[1])) + '</h3><p>' + esc(tx(s[2])) + '</p></div>'; }).join('') + '</div>' +
        '<div class="cards cards--two"><a class="card tile" href="#/symbols">' + icon('shapes', 'tile__ico') + '<h3>' + esc(tx('Symbols and lines')) + '</h3><p class="muted">' + esc(tx('What every shape and line means.')) + '</p></a>' +
          '<a class="card tile" href="#/guide">' + icon('book', 'tile__ico') + '<h3>' + esc(tx('How to use')) + '</h3><p class="muted">' + esc(tx('Step-parents, half-siblings, twins, grouped symbols.')) + '</p></a></div>' +
        '<a class="card news-strip" href="#/whats-new"><span class="badge" data-badge="news" hidden></span><strong>' + esc(t('nav.whatsNew')) + '</strong>' +
          (latest ? '<span class="muted">' + esc(tf('home.latest', { title: latest.title, version: latest.version })) + '</span>' : '') + '</a>' +
      '</div>';
  };

  /* ---------- Editor ---------- */
  var openMember = null;      // id of the member whose editor is open
  var focusMember = null;     // set when a symbol on the chart was tapped: the Family step opens and scrolls to that person
  var STEPS = [['family', 'Family', '#D4502A'], ['lines', 'Relationships', '#0E8A8A'], ['view', 'Genogram', '#C2337A']];
  TITLES.chart = 'Genogram';
  function opt(val, lab, cur) { return '<option value="' + esc(val) + '"' + (String(val) === String(cur || '') ? ' selected' : '') + '>' + esc(lab) + '</option>'; }
  function field(label, inner, cls) { return '<label class="fld ' + (cls || '') + '"><span>' + esc(label) + '</span>' + inner + '</label>'; }
  function textIn(scope, key, val, ph, extra) { return '<input type="text" ' + scope + ' data-k="' + key + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '" autocomplete="off"' + (extra || '') + '>'; }
  function chip(scope, key, on, label) { return '<button type="button" class="filter" ' + scope + ' data-tog="' + key + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(label) + '</button>'; }
  function segBtns(scope, key, opts, cur) { return '<div class="segb" role="group">' + opts.map(function (o) { return '<button type="button" ' + scope + ' data-set="' + key + '" data-v="' + esc(o[0]) + '" aria-pressed="' + (String(cur || '') === String(o[0]) ? 'true' : 'false') + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; }
  function relOptions(cur) {
    var groups = [], out = opt('', tx('Choose…'), cur);
    G.FAMILY_RELS.forEach(function (r) { if (groups.indexOf(r.g) < 0) groups.push(r.g); });
    groups.forEach(function (g) { out += '<optgroup label="' + esc(tx(g)) + '">' + G.FAMILY_RELS.filter(function (r) { return r.g === g; }).map(function (r) { return opt(r.rel, tx(r.rel), cur); }).join('') + '</optgroup>'; });
    return out;
  }
  function bondOptions(cur) { return opt('', tx('By birth'), cur) + G.FAM_BOND.map(function (o) { return opt(o, o === 'Foster' ? tx('Foster child') : tx(o), cur); }).join(''); }
  function ofOptions(c, m) {
    var r = G.relInfo(m.rel).role, role = function (x) { return G.relInfo(x.rel).role; };
    if (r === 'child') return opt('', tx('Current spouse / partner (or the first one listed)'), m.of) + c.family.filter(function (x) { return ['spouse', 'exsp'].indexOf(role(x)) >= 0; }).map(function (p) { return opt(p.id, who(p), m.of); }).join('') + opt('none', tx('Not listed (index person only)'), m.of);
    var hosts = c.family.filter(function (x) { return (r === 'sibsp' || r === 'nib') ? ['sib', 'phalf', 'mhalf'].indexOf(role(x)) >= 0 : r === 'cousin' ? ['pside', 'mside'].indexOf(role(x)) >= 0 : r === 'ggp' ? ['pgf', 'pgm', 'mgf', 'mgm'].indexOf(role(x)) >= 0 : role(x) === 'child'; });
    return hosts.length === 1 ? opt('', who(hosts[0]), m.of) : opt('', tx('Choose…'), m.of) + hosts.map(function (p) { return opt(p.id, who(p), m.of); }).join('');
  }
  function memberEditor(c, m, i) {
    var ri = G.relInfo(m.rel), r = ri.role, sc = 'data-m="' + esc(m.id) + '"', ofLab = G.FAM_OF[r], partner = G.FAM_PARTNER_ROLES.indexOf(r) >= 0, kid = G.FAM_TWIN_ROLES.indexOf(r) >= 0;
    return '<div class="member__edit">' +
      '<div class="flds">' + field(tx('Name'), textIn(sc, 'name', m.name, tx('Name or initials')), 'w2') +
        field(tx('Relationship to the index person'), '<select ' + sc + ' data-k="rel">' + relOptions(m.rel) + '</select>', 'w2') +
        field(tx('Age'), textIn(sc, 'age', m.age, '33, 8 mo'), 'w1') +
        (!ri.sex ? field(tx('Sex'), '<select ' + sc + ' data-k="sex">' + opt('', tx('Not stated'), m.sex) + opt('Male', tx('Male'), m.sex) + opt('Female', tx('Female'), m.sex) + '</select>', 'w1') : '') + '</div>' +
      (ofLab || partner ? '<div class="flds">' + (ofLab ? field(tx(ofLab), '<select ' + sc + ' data-k="of">' + ofOptions(c, m) + '</select>', 'w2') : '') +
        (partner ? field(tx('Couple’s relationship'), '<select ' + sc + ' data-k="relStatus">' + G.famCoupleOptions(m.relStatus, tx(r === 'exsp' ? 'Separated' : r === 'spouse' ? 'As set for the index person' : 'Married / partners'), tx) + '</select>', 'w2') : '') + '</div>' : '') +
      '<div class="chips">' + segBtns(sc, 'status', [['Living', tx('Living')], ['Deceased', tx('Deceased')]], m.status || 'Living') +
        chip(sc, 'psych', m.psych, tx('Psychiatric disorder')) + chip(sc, 'subst', m.subst, tx('Substance use disorder')) + chip(sc, 'med', m.med, tx('Medical illness')) + chip(sc, 'withPt', m.withPt, tx('Lives with the index person')) +
        (kid ? chip(sc, 'twin', m.twin, tx('Twin')) : '') + '</div>' +
      (kid ? '<div class="flds">' + field(tx('Joined the family'), '<select ' + sc + ' data-k="bond">' + bondOptions(m.bond) + '</select>', 'w2') +
        field(tx('Pregnancy or loss'), '<select ' + sc + ' data-k="preg">' + opt('', tx('No (a living or deceased person)'), m.preg) + opt('Pregnancy', tx('Current pregnancy'), m.preg) + G.FAM_PREG.slice(1).map(function (o) { return opt(o, tx(o), m.preg); }).join('') + '</select>', 'w2') + '</div>' : '') +
      '<div class="flds">' + field(tx('Occupation / role'), textIn(sc, 'occ', m.occ, tx('welder, sole earner')), 'w2') + field(tx('Condition / illness'), textIn(sc, 'cond', m.cond, 'MDD, hypertension'), 'w2') +
        field(tx('Number of people (if a group)'), textIn(sc, 'count', m.count, tx('Leave empty for one person'), ' inputmode="numeric"'), 'w2') +
        field(tx('Gender identity'), '<select ' + sc + ' data-k="gid">' + opt('', tx('Same as the symbol'), m.gid) + G.FAM_GID.map(function (o) { return opt(o, tx(o), m.gid); }).join('') + '</select>', 'w2') +
        field(tx('Year of birth'), textIn(sc, 'born', m.born, '1958', ' inputmode="numeric" maxlength="10"'), 'w1') + field(tx('Year of death'), textIn(sc, 'died', m.died, '2020', ' inputmode="numeric" maxlength="10"'), 'w1') + '</div>' +
      '<p class="member__acts"><button type="button" class="link-btn" data-act="up" data-id="' + esc(m.id) + '">' + esc(tx('Move up')) + '</button><button type="button" class="link-btn" data-act="down" data-id="' + esc(m.id) + '">' + esc(tx('Move down')) + '</button><button type="button" class="link-btn danger" data-act="rm" data-id="' + esc(m.id) + '">' + esc(tx('Remove')) + '</button></p></div>';
  }
  function memberTitle(m) { return m.name || (m.rel ? tx(m.rel) : tx('New family member')); }
  function memberSub(m) { return [m.name && m.rel ? tx(m.rel) : '', m.age, m.occ, m.cond].filter(Boolean).join(' · '); }
  function memberRow(c, m, i) {
    var open = openMember === m.id, sub = memberSub(m);
    return '<div class="member' + (open ? ' is-open' : '') + '" id="m-' + esc(m.id) + '">' +
      '<button type="button" class="member__head" data-act="toggle" data-id="' + esc(m.id) + '" aria-expanded="' + open + '"><span class="member__ico">' + memberIcon(m) + '</span>' +
      '<span class="member__txt"><strong>' + esc(memberTitle(m)) + '</strong><small>' + esc(sub || (m.rel ? '' : tx('Choose a relationship'))) + '</small></span>' +
      '<svg class="member__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      (open ? memberEditor(c, m, i) : '') + '</div>';
  }
  function stepFamily(c) {
    G.famIds(c);
    var role = function (x) { return G.relInfo(x.rel).role; }, hasBoth = c.family.some(function (m) { return role(m) === 'father'; }) && c.family.some(function (m) { return role(m) === 'mother'; }), hasSp = c.family.some(function (m) { return role(m) === 'spouse'; });
    var coupleSel = function (k, cur) { return '<select data-c="1" data-k="' + k + '">' + G.famCoupleOptions(cur, tx('Married / partners'), tx) + '</select>'; };
    var html = '<section class="card idx" style="--c:#1C7A86"><h2 class="grp__h"><span class="grp__dot"></span>' + esc(tx('Index person')) + ' <small>' + esc(tx('the patient or client; drawn with a double outline')) + '</small></h2>' +
      '<div class="flds">' + field(tx('Name shown on the genogram'), textIn('data-c="1"', 'ptName', c.ptName, tx('Patient, initials or an alias')), 'w2') + field(tx('Age'), textIn('data-c="1"', 'ptAge', c.ptAge, '33'), 'w1') +
        '<div class="fld w2"><span>' + esc(tx('Sex')) + '</span>' + segBtns('data-c="1"', 'ptSex', [['Male', tx('Male')], ['Female', tx('Female')], ['', tx('Not stated')]], c.ptSex) + '</div></div>' +
      '<div class="flds">' + field(tx('Occupation / role'), textIn('data-c="1"', 'ptOcc', c.ptOcc, tx('BS ME graduate, unemployed')), 'w2') + field(tx('Condition / illness'), textIn('data-c="1"', 'ptCond', c.ptCond, 'schizophrenia; CKD 3b'), 'w2') +
        field(tx('Joined the family'), '<select data-c="1" data-k="ptBond">' + bondOptions(c.ptBond) + '</select>', 'w1') +
        field(tx('Gender identity'), '<select data-c="1" data-k="ptGid">' + opt('', tx('Same as the symbol'), c.ptGid) + G.FAM_GID.map(function (o) { return opt(o, tx(o), c.ptGid); }).join('') + '</select>', 'w1') +
        field(tx('Year of birth'), textIn('data-c="1"', 'ptBorn', c.ptBorn, '1992', ' inputmode="numeric" maxlength="10"'), 'w1') + (c.ptDead ? field(tx('Year of death'), textIn('data-c="1"', 'ptDied', c.ptDied, '2020', ' inputmode="numeric" maxlength="10"'), 'w1') : '') + '</div>' +
      '<div class="chips">' + chip('data-c="1"', 'ptFill', c.ptFill !== false, tx('Psychiatric disorder')) + chip('data-c="1"', 'ptSubst', c.ptSubst, tx('Substance use disorder')) + chip('data-c="1"', 'ptMed', c.ptMed, tx('Medical illness')) + chip('data-c="1"', 'ptDead', c.ptDead, tx('Deceased')) + '</div></section>';
    html += '<section class="quick"><h2 class="quick__h">' + esc(tx('Add a family member')) + '</h2><div class="quick__chips">' + QUICK.map(function (r) { var g = groupOf({ rel: r });
        return '<button type="button" class="qchip" style="--c:' + g.c + '" data-act="add" data-rel="' + esc(r) + '">+ ' + esc(tx(r)) + '</button>'; }).join('') +
      '<button type="button" class="qchip qchip--more" data-act="add" data-rel="">+ ' + esc(tx('Someone else…')) + '</button></div>' +
      '<p class="hint">' + esc(tx('Initials are enough. “Number of people” is only for a group: type 5 and one symbol stands for 5 former partners. Leave it empty for one person.')) + '</p></section>';
    if (hasBoth || hasSp) html += '<section class="card couple">' +
      (hasBoth ? field(tx('Parents’ relationship'), coupleSel('parentsRel', c.parentsRel)) : '') +
      (hasSp ? field(tx('Index person and current spouse / partner'), coupleSel('ptRel', c.ptRel)) : '') + '</section>';
    GROUPS.forEach(function (g) {
      var ms = c.family.filter(function (m) { return groupOf(m) === g; });
      if (!ms.length) return;
      html += '<section class="grp" style="--c:' + g.c + '"><h2 class="grp__h"><span class="grp__dot"></span>' + esc(tx(g.label)) + ' <small>' + ms.length + '</small></h2>' + ms.map(function (m) { return memberRow(c, m, c.family.indexOf(m)); }).join('') + '</section>';
    });
    if (c.family.length > 1) html += '<div class="chips chips--foot">' + chip('data-c="1"', 'byAge', c.byAge !== false, tx('Oldest to youngest automatically')) + '<button type="button" class="link-btn" data-act="sort">' + esc(tx('Sort this list by generation and age')) + '</button></div>';
    return html;
  }
  function linkIcon(type) { return miniSVG(G.linkPrims([[0.15, 0.5], [1.85, 0.5]], type, 0.95), 2, 1, 30); }
  function stepLines(c) {
    G.famIds(c);
    var people = [['pt', txf('{name} (index person)', { name: c.ptName || tx('Index person') })]].concat(c.family.filter(function (m) { return m.name || m.rel; }).map(function (m) { return [m.id, who(m)]; }));
    var sel = function (i, k, cur, opts) { return '<select data-l="' + i + '" data-k="' + k + '">' + opt('', tx('Choose…'), cur) + opts.map(function (o) { return opt(o[0], o[1], cur); }).join('') + '</select>'; };
    return '<section class="card"><h2 class="grp__h" style="--c:#0E8A8A"><span class="grp__dot"></span>' + esc(tx('Relationship lines')) + ' <small>' + esc(tx('how two people get along')) + '</small></h2>' +
      (c.family.length ? '' : '<p class="hint">' + esc(tx('Add family members first, then come back to connect them.')) + '</p>') +
      c.links.map(function (l, i) {
        return '<div class="linkrow"><span class="linkrow__ico">' + (l.type ? linkIcon(l.type) : '') + '</span>' + field(tx('Person'), sel(i, 'a', l.a, people), 'w2') +
          field(tx('Relationship'), sel(i, 'type', l.type, G.FAM_LINKS.map(function (t) { return [t.type, t.dir ? tx(t.type) + ' →' : tx(t.type)]; })), 'w2') + field(tx('Other person'), sel(i, 'b', l.b, people), 'w2') +
          '<button type="button" class="link-btn danger" data-act="rml" data-i="' + i + '" aria-label="' + esc(tx('Remove this line')) + '">' + esc(tx('Remove')) + '</button></div>'; }).join('') +
      '<p><button type="button" class="btn" data-act="addl"' + (c.family.length ? '' : ' disabled') + '>+ ' + esc(tx('Add a relationship line')) + '</button></p></section>' +
      '<section class="card"><h2 class="grp__h" style="--c:#6A5E78"><span class="grp__dot"></span>' + esc(tx('The kinds of line')) + '</h2><div class="lib lib--tight">' + G.FAM_LINKS.map(function (t) {
        return '<div class="lib__row"><span class="lib__ico lib__ico--wide">' + linkIcon(t.type) + '</span><span><strong>' + esc(tx(t.type)) + '</strong></span></div>'; }).join('') + '</div></section>';
  }
  function stepView(c) {
    var L = null; try { L = layoutOf(c, true); } catch (e) { L = null; }
    viewNodes = L ? L.nodes : null;
    if (!L) return '<div class="empty"><h2>' + esc(tx('Nothing to draw yet')) + '</h2><p>' + esc(tx('Add at least one family member and the genogram appears here.')) + '</p><p><a class="btn btn--solid" href="#/chart/' + esc(c.id) + '">' + esc(tx('Add the family')) + '</a></p></div>';
    return '<div class="viewbar"><div class="segb" role="group" aria-label="' + esc(tx('Zoom')) + '"><button type="button" data-act="zoomout" aria-label="' + esc(tx('Zoom out')) + '">−</button><button type="button" data-act="zoomfit">' + esc(tx('Fit')) + '</button><button type="button" data-act="zoomin" aria-label="' + esc(tx('Zoom in')) + '">+</button></div>' +
        chip('data-c="1"', 'showTitle', c.showTitle !== false, tx('Show the title and date')) + chip('data-c="1"', 'initials', c.initials, tx('Initials only')) + chip('data-c="1"', 'household', c.household, tx('Outline the household')) +
        '<button type="button" class="filter" data-act="movemode" aria-pressed="' + (moveMode ? 'true' : 'false') + '">' + esc(tx('Move people')) + '</button>' +
        (c.pos && Object.keys(c.pos).length ? '<button type="button" class="link-btn" data-act="resetpos">' + esc(tx('Reset positions')) + '</button>' : '') + '</div>' +
      (moveMode ? '<p class="hint" id="move-hint">' + esc(tx('Drag a person left or right. The lines follow. Turn “Move people” off when you are done.')) + '</p>' : '') +
      '<div class="canvas canvas--pz" id="canvas"><div class="canvas__in" id="canvas-in">' + G.svg(L, VIEW_UNIT) + '</div></div>' +
      '<p class="hint">' + esc(tx('Tap a person to edit them. Pinch, or use + and −, to zoom, then drag to move around.')) + '</p>' +
      '<label class="fld notesfld"><span>' + esc(tx('Notes under the genogram')) + '</span><textarea data-c="1" data-k="notes" rows="3" maxlength="600" placeholder="' + esc(tx('Informant, who drew it, a short summary of the family')) + '">' + esc(c.notes || '') + '</textarea></label>' +
      (L.left.length ? '<div class="callout callout--caution"><p class="callout__title">' + esc(tx('Not drawn')) + '</p>' + esc(L.left.join(', ')) + '. ' + esc(tx('A relative is drawn when the person who links them to the index person is on the chart (for example the father for paternal relatives) and chosen in their card. Each person has room for four partners: put more in one symbol with “Number of people”.')) + '</div>' : '') +
      (L.linksLeft.length ? '<div class="callout callout--caution"><p class="callout__title">' + esc(tx('Lines not drawn')) + '</p>' + esc(L.linksLeft.join('; ')) + '. ' + esc(tx('One of the two people is not on the chart.')) + '</div>' : '') +
      '<p class="hint">' + txh('The key lists only what this genogram uses. See {link} for everything the app can draw.', { link: '<a href="#/symbols">' + esc(tx('Symbols and lines')) + '</a>' }) + '</p>';
  }
  VIEWS.chart = function (id, step) {
    var c = getChart(id);
    if (!c) return '<div class="wrap page"><div class="empty"><h2>' + esc(tx('This genogram is not on this device')) + '</h2><p>' + esc(tx('It may have been deleted, or made on another phone or computer.')) + '</p><p><a class="btn btn--solid" href="#/">' + esc(tx('Back to your genograms')) + '</a></p></div></div>';
    step = step === 'lines' || step === 'view' ? step : 'family';
    var n = peopleCount(c), base = '#/chart/' + esc(c.id);
    return '<div class="wrap page editor" data-chart="' + esc(c.id) + '" data-step="' + step + '"><p class="crumb"><a href="#/">' + esc(tx('Your genograms')) + '</a> / ' + esc(c.title || tx('Family genogram')) + '</p>' +
      '<label class="titlefld"><span class="sr-only">' + esc(tx('Title of this genogram')) + '</span><input type="text" data-c="1" data-k="title" value="' + esc(c.title) + '" placeholder="' + esc(tx('Family genogram')) + '" autocomplete="off"></label>' +
      '<nav class="stepnav" aria-label="' + esc(tx('Steps')) + '">' + STEPS.map(function (s, i) { return '<a href="' + base + (s[0] === 'family' ? '' : '/' + s[0]) + '" style="--c:' + s[2] + '"' + (s[0] === step ? ' aria-current="step"' : '') + '><span>' + (i + 1) + '</span>' + esc(tx(s[1])) + '</a>'; }).join('') + '</nav>' +
      '<div class="editor__body">' + (step === 'family' ? stepFamily(c) : step === 'lines' ? stepLines(c) : stepView(c)) + '</div>' +
      '<div class="actionbar"><span class="actionbar__n" id="pcount">' + esc(peopleText(n, true)) + '</span><span class="actionbar__btns">' +
        (step !== 'view' ? '<button type="button" class="btn" data-act="undo" id="undo-btn"' + (canUndo(c) ? '' : ' disabled') + '>' + esc(tx('Undo')) + '</button>' : '') +
        (step === 'family' ? '<a class="btn" href="' + base + '/lines">' + esc(tx('Relationships')) + '</a><a class="btn btn--solid" href="' + base + '/view">' + esc(tx('See the genogram')) + '</a>'
          : step === 'lines' ? '<a class="btn" href="' + base + '">' + esc(tx('Family')) + '</a><a class="btn btn--solid" href="' + base + '/view">' + esc(tx('See the genogram')) + '</a>'
          : '<a class="btn" href="' + base + '">' + esc(tx('Edit')) + '</a><button type="button" class="btn" data-act="sharefile">' + esc(tx('Share file')) + '</button><button type="button" class="btn" data-act="png"' + (c.family.length ? '' : ' disabled') + '>' + esc(tx('Save picture')) + '</button><button type="button" class="btn btn--solid" data-act="pdf"' + (c.family.length ? '' : ' disabled') + '>' + esc(tx('Save PDF')) + '</button>') +
      '</span></div><p class="status" id="ed-status" role="status" aria-live="polite"></p></div>';
  };
  function curChart() { var el = main.querySelector('.editor'); return el ? getChart(el.getAttribute('data-chart')) : null; }
  /* Undo: a copy of the genogram is kept before every change (this visit only; up to 60 steps per genogram) */
  var undoStacks = {}, typingEl = null;
  function canUndo(c) { return !!(c && undoStacks[c.id] && undoStacks[c.id].length); }
  function snap(c) {
    var st = undoStacks[c.id] || (undoStacks[c.id] = []), j = JSON.stringify(c);
    if (st[st.length - 1] !== j) { st.push(j); if (st.length > 60) st.shift(); }
    var ub = document.getElementById('undo-btn'); if (ub) ub.disabled = false;
  }
  function undoChart(c) {
    if (!canUndo(c)) return false;
    var prev = JSON.parse(undoStacks[c.id].pop());
    DB.byId[c.id] = prev; typingEl = null; if (openMember && !memberByIdSafe(prev, openMember)) openMember = null;
    saveNow(); rebuildIndex(); rerender(); say(tx('Undone.')); return true;
  }
  function memberByIdSafe(c, id) { return (c.family || []).some(function (m) { return m && m.id === id; }); }
  main.addEventListener('focusout', function () { typingEl = null; });
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || String(e.key).toLowerCase() !== 'z') return;
    var tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea') return;   // the field's own undo
    var c = curChart(); if (c && canUndo(c)) { e.preventDefault(); undoChart(c); }
  });
  /* A short message at the bottom of the screen with one action (used for "Deleted. Undo") */
  var snackTimer = null;
  function snack(msg, label, fn) {
    var el = document.getElementById('snack');
    if (!el) { el = document.createElement('div'); el.id = 'snack'; el.className = 'snack'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.innerHTML = '<span>' + esc(msg) + '</span>' + (label ? '<button type="button" class="snack__btn">' + esc(label) + '</button>' : '');
    el.hidden = false; clearTimeout(snackTimer); snackTimer = setTimeout(function () { el.hidden = true; }, 9000);
    var b = el.querySelector('button'); if (b) b.addEventListener('click', function () { el.hidden = true; fn(); });
  }
  function rerender() { route({ keepScroll: true }); }
  function say(msg) { var el = document.getElementById('ed-status'); if (el) el.textContent = msg || ''; }
  function memberById(c, id) { for (var i = 0; i < c.family.length; i++) if (c.family[i].id === id) return c.family[i]; return null; }

  /* typing: save, and refresh only the small things that depend on it */
  main.addEventListener('input', function (e) {
    var el = e.target, c = curChart(); if (!c || !el.getAttribute) return;
    var k = el.getAttribute('data-k'); if (!k) return;
    if (el !== typingEl || el.tagName === 'SELECT') { snap(c); typingEl = el; }   // one undo step per field visit
    if (el.getAttribute('data-c')) { c[k] = el.value; touch(c); if (k === 'title') rebuildIndex(); return; }
    if (el.getAttribute('data-m')) {
      var m = memberById(c, el.getAttribute('data-m')); if (!m) return;
      m[k] = el.value; touch(c);
      if (el.tagName === 'SELECT') { if (k === 'rel') delete m.of; rerender(); return; }
      var row = el.closest('.member');
      if (row) { var st = row.querySelector('.member__txt strong'), sm = row.querySelector('.member__txt small'), ic = row.querySelector('.member__ico');
        if (st) st.textContent = memberTitle(m);
        if (sm) sm.textContent = memberSub(m);
        if (ic) ic.innerHTML = memberIcon(m); }
      var pc = document.getElementById('pcount'), n = peopleCount(c); if (pc) pc.textContent = peopleText(n, true);
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
    if (act === 'intro-next') { introAt++; rerender(); return; }
    if (act === 'intro-skip') { store.set('introSeen', true); rerender(); return; }
    if (act === 'intro-new' || act === 'intro-sample') { store.set('introSeen', true); var ic = addChart(act === 'intro-new' ? blankChart(tx('Family genogram')) : sampleChart()); location.hash = '#/chart/' + ic.id + (act === 'intro-new' ? '' : '/view'); return; }
    if (act === 'bk-later') { store.set('bkSnooze', new Date().toISOString()); rerender(); return; }
    if (act === 'bk-now') { var be = document.getElementById('bk-export'); if (be) { be.scrollIntoView({ block: 'center' }); be.click(); } rerender(); return; }
    if (act === 'sample-n') { var sn = addChart(sampleChart(+b.getAttribute('data-n') || 0)); location.hash = '#/chart/' + sn.id + '/view'; return; }
    if (act === 'dup') { var src = getChart(id); if (!src) return; var cp = JSON.parse(JSON.stringify(src)); cp.id = uid('c'); cp.title = (src.title || 'Family genogram') + ' (copy)'; cp.created = cp.updated = new Date().toISOString(); addChart(cp); rerender(); return; }
    if (act === 'del') { var dc = getChart(id); if (!dc) return; var at0 = DB.order.indexOf(id); removeChart(id); rerender();
      snack(txf('Deleted “{title}”.', { title: dc.title || tx('Family genogram') }), tx('Undo'), function () { if (getChart(dc.id)) return; DB.byId[dc.id] = dc; DB.order.splice(Math.max(0, at0), 0, dc.id); saveNow(); rebuildIndex(); if (currentKey() === 'home') rerender(); });
      return; }
    if (!c) return;
    if (act === 'undo') { undoChart(c); return; }
    /* editor: switches */
    if (b.getAttribute('data-tog')) { var tk = b.getAttribute('data-tog'), tgt = b.getAttribute('data-m') ? memberById(c, b.getAttribute('data-m')) : c; if (!tgt) return;
      snap(c); tgt[tk] = !(tk === 'ptFill' || tk === 'byAge' || tk === 'showTitle' ? tgt[tk] !== false : tgt[tk]); touch(c); rerender(); return; }
    if (b.getAttribute('data-set')) { var sk = b.getAttribute('data-set'), st2 = b.getAttribute('data-m') ? memberById(c, b.getAttribute('data-m')) : c; if (!st2) return; snap(c); st2[sk] = b.getAttribute('data-v'); touch(c); rerender(); return; }
    if (act === 'toggle') { openMember = openMember === id ? null : id; rerender(); return; }
    if (act === 'add') { snap(c); var m = { id: uid('f'), name: '', rel: b.getAttribute('data-rel') || '', age: '', status: 'Living' }; c.family.push(m); openMember = m.id; touch(c); rerender();
      var row = document.getElementById('m-' + m.id); if (row) { row.scrollIntoView({ block: 'center' }); var first = row.querySelector(m.rel ? 'input[data-k="name"]' : 'select[data-k="rel"]'); if (first) first.focus({ preventScroll: true }); } return; }
    if (act === 'rm') { var rmm = memberById(c, id); if (!rmm) return; snap(c);
      c.family = c.family.filter(function (x) { return x !== rmm; }); c.family.forEach(function (x) { if (x.of === id) delete x.of; }); c.links = c.links.filter(function (l) { return l.a !== id && l.b !== id; }); openMember = null; touch(c); rerender(); say(txf('Removed {who}. Tap Undo to bring them back.', { who: rmm.name || (rmm.rel ? tx(rmm.rel) : tx('the family member')) })); return; }
    if (act === 'up' || act === 'down') { var mm = memberById(c, id), g = groupOf(mm), same = c.family.filter(function (x) { return groupOf(x) === g; }), at = same.indexOf(mm), other = same[at + (act === 'up' ? -1 : 1)];
      if (other) { snap(c); var i1 = c.family.indexOf(mm), i2 = c.family.indexOf(other); c.family[i1] = other; c.family[i2] = mm; touch(c); rerender(); } return; }
    if (act === 'sort') { snap(c); c.family = G.famSorted({ family: c.family }); touch(c); rerender(); say(tx('Sorted by generation and age.')); return; }
    if (act === 'addl') { snap(c); c.links.push({ a: 'pt', type: '', b: '' }); touch(c); rerender(); return; }
    if (act === 'rml') { snap(c); c.links.splice(+b.getAttribute('data-i'), 1); touch(c); rerender(); return; }
    if (act === 'zoomin' || act === 'zoomout' || act === 'zoomfit') { pzButton(act); return; }
    if (act === 'movemode') { moveMode = !moveMode; rerender(); return; }
    if (act === 'resetpos' && c) { snap(c); c.pos = {}; touch(c); rerender(); return; }
    if (act === 'png' || act === 'pdf') { exportChart(c, act); return; }
    if (act === 'sharefile') { shareChart(c); return; }
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
    if (standalone && file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).then(function () { say(done); }, function () { say(tx('Not saved.')); }); return; }
    var url = URL.createObjectURL(new Blob([bytes], { type: type })), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000); say(done);
  }
  function exportChart(c, kind) {
    say(tx('Preparing…'));
    renderCanvas(c).then(function (cv) {
      if (kind === 'png') return canvasBytes(cv, 'image/png').then(function (b) { deliver(b, fileBase(c) + '.png', 'image/png', txf('Picture saved: {file}', { file: fileBase(c) + '.png' })); });
      return canvasBytes(cv, 'image/jpeg', 0.93).then(function (b) { deliver(pdfFromJpeg(b, cv.width, cv.height, c.title), fileBase(c) + '.pdf', 'application/pdf', txf('PDF saved: {file}', { file: fileBase(c) + '.pdf' })); });
    }).catch(function () { say(tx('The genogram could not be saved. Try “Save picture”, or a smaller family.')); });
  }
  /* One genogram as a file, to send to a colleague or open in PsychInterview (Family > Open a Genogram file) */
  function shareChart(c) {
    var payload = { app: 'genogram', kind: 'chart', format: 1, exported: new Date().toISOString(), attribution: ATTRIBUTION, chart: c };
    deliver(JSON.stringify(payload, null, 1), fileBase(c) + '.genogram.json', 'application/json', txf('File saved: {file}', { file: fileBase(c) + '.genogram.json' }));
  }
  var TEXT_KEYS = ['name', 'rel', 'age', 'sex', 'status', 'occ', 'cond', 'count', 'of', 'relStatus', 'bond', 'preg', 'desc', 'born', 'died', 'gid'], FLAG_KEYS = ['psych', 'subst', 'withPt', 'twin', 'med'];
  function cleanChart(src) {   // only the fields this app knows, as plain text and yes/no values
    var c = blankChart('Family genogram'), txt = function (v) { return String(v == null ? '' : v).slice(0, 300); };
    ['title', 'ptName', 'ptAge', 'ptSex', 'ptOcc', 'ptCond', 'ptBond', 'parentsRel', 'ptRel', 'ptBorn', 'ptDied', 'ptGid'].forEach(function (k) { if (src[k] != null) c[k] = txt(src[k]); });
    if (src.notes != null) c.notes = String(src.notes).slice(0, 600);
    if (src.pos && typeof src.pos === 'object') { c.pos = {}; Object.keys(src.pos).slice(0, 200).forEach(function (k) { var v = +src.pos[k]; if (/^[\w-]{1,24}$/.test(k) && isFinite(v) && v) c.pos[k] = Math.max(-12, Math.min(12, v)); }); }
    ['ptSubst', 'ptDead', 'initials', 'ptMed'].forEach(function (k) { c[k] = !!src[k]; });
    ['ptFill', 'byAge', 'showTitle'].forEach(function (k) { c[k] = src[k] !== false; }); c.household = !!src.household;
    var ids = {};
    c.family = (Array.isArray(src.family) ? src.family : []).slice(0, 200).filter(function (m) { return m && typeof m === 'object'; }).map(function (m) {
      var o = { id: /^[\w-]{1,24}$/.test(String(m.id || '')) && !ids[m.id] && m.id !== 'pt' ? String(m.id) : uid('f') }; ids[o.id] = true;
      TEXT_KEYS.forEach(function (k) { if (m[k] != null && m[k] !== '') o[k] = txt(m[k]); }); FLAG_KEYS.forEach(function (k) { if (m[k]) o[k] = true; });
      if (!o.status) o.status = 'Living'; return o; });
    c.links = (Array.isArray(src.links) ? src.links : []).slice(0, 300).filter(function (l) { return l && typeof l === 'object'; }).map(function (l) { return { a: txt(l.a).slice(0, 24), type: txt(l.type).slice(0, 40), b: txt(l.b).slice(0, 24) }; });
    return c;
  }
  function openChartFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onerror = function () { say(tx('That file could not be read.')); };
    reader.onload = function () {
      var p = null; try { p = JSON.parse(reader.result); } catch (e) {}
      if (p && p.app === 'genogram' && p.data && !p.chart) { say(tx('That is a full backup. Use “Import backup” at the bottom of the page.')); return; }
      if (!p || p.app !== 'genogram' || p.kind !== 'chart' || !p.chart || typeof p.chart !== 'object') { say(tx('That is not a genogram file from this app.')); return; }
      var c = addChart(cleanChart(p.chart)); location.hash = '#/chart/' + c.id + (c.family.length ? '/view' : '');
    };
    reader.readAsText(file);
  }
  main.addEventListener('change', function (e) { if (e.target && e.target.getAttribute && e.target.getAttribute('data-k') === 'notes') rerender(); });   // the chart is redrawn when the notes box is left
  main.addEventListener('change', function (e) { if (e.target && e.target.id === 'open-file') { openChartFile(e.target.files && e.target.files[0]); e.target.value = ''; } });

  /* ---------- The chart on screen: pinch or + / − to zoom, drag to move, tap a person to edit ---------- */
  var pz = null;   // { cv, inner, w, h, fit, s, tx, ty }
  var moveMode = false, drag = null;   // “Move people”: dragging a symbol shifts that person sideways (chart.pos)
  var VIEW_UNIT = 56, viewNodes = null;   // pixels per symbol width on screen before zooming; the people on the chart being shown
  function pzApply() {
    var W = pz.cv.clientWidth, H = pz.cv.clientHeight, sw = pz.w * pz.s, sh = pz.h * pz.s;
    pz.tx = sw <= W ? (W - sw) / 2 : Math.min(0, Math.max(W - sw, pz.tx));
    pz.ty = sh <= H ? (H - sh) / 2 : Math.min(0, Math.max(H - sh, pz.ty));
    pz.inner.style.transform = 'translate(' + pz.tx.toFixed(1) + 'px,' + pz.ty.toFixed(1) + 'px) scale(' + pz.s.toFixed(4) + ')';
    var zoomed = pz.s > pz.fit * 1.01;
    pz.cv.style.touchAction = zoomed || moveMode ? 'none' : 'pan-y';   // at "fit" a finger still scrolls the page
    pz.cv.classList.toggle('is-zoomed', zoomed);
  }
  function pzZoom(k, cx, cy) {   // zoom by k around a point inside the box
    var s2 = Math.min(Math.max(pz.fit, pz.s * k), Math.max(pz.fit * 6, 3));
    if (cx == null) { cx = pz.cv.clientWidth / 2; cy = pz.cv.clientHeight / 2; }
    pz.tx = cx - (cx - pz.tx) * (s2 / pz.s); pz.ty = cy - (cy - pz.ty) * (s2 / pz.s); pz.s = s2; pzApply();
  }
  function pzInit() {
    var cv = document.getElementById('canvas'), inner = document.getElementById('canvas-in'), svg = inner && inner.querySelector('svg');
    pz = null; if (!cv || !svg) return;
    var w = parseFloat(svg.getAttribute('width')), h = parseFloat(svg.getAttribute('height')), W = cv.clientWidth, maxH = Math.max(260, window.innerHeight * 0.68);
    var fit = Math.min(W / w, maxH / h, 1.5);
    cv.style.height = Math.round(h * fit) + 'px';
    pz = { cv: cv, inner: inner, w: w, h: h, fit: fit, s: fit, tx: 0, ty: 0 };
    pzApply();
    if (cv._pz) return; cv._pz = true;   // a resize sets up the same box again
    cv.addEventListener('pointerdown', pzDown);
    cv.addEventListener('wheel', function (e) { if (!pz || !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); var r = cv.getBoundingClientRect(); pzZoom(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  }
  function pzButton(act) { if (!pz) return; if (act === 'zoomfit') { pz.s = pz.fit; pz.tx = pz.ty = 0; pzApply(); } else pzZoom(act === 'zoomin' ? 1.4 : 1 / 1.4); }
  var pzPts = {}, pzMoved = false, pzDist = 0, pzT0 = 0;
  function pzCount() { return Object.keys(pzPts).length; }
  function pzDown(e) {
    if (!pz || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (!pzCount()) { pzMoved = false; pzT0 = Date.now(); drag = null;
      if (moveMode) { var hid = pzHit(e), hc = curChart(); if (hid && hc) drag = { id: hid, x0: e.clientX, base: (hc.pos && +hc.pos[hid]) || 0, snapped: false }; } }
    pzPts[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pzCount() === 2) { var k = Object.keys(pzPts), a = pzPts[k[0]], b = pzPts[k[1]]; pzDist = Math.hypot(a.x - b.x, a.y - b.y) || 1; pzMoved = true; }
  }
  window.addEventListener('pointermove', function (e) {
    var p = pzPts[e.pointerId]; if (!pz || !p) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (drag && pzCount() === 1) {   // moving a person: redraw the chart with that person shifted
      var dc = curChart(), du = (e.clientX - drag.x0) / pz.s / VIEW_UNIT; if (!dc) return;
      if (Math.abs(du) < 0.08 && !drag.snapped) return;
      if (!drag.snapped) { snap(dc); drag.snapped = true; } pzMoved = true;
      dc.pos = dc.pos || {}; dc.pos[drag.id] = Math.max(-12, Math.min(12, Math.round((drag.base + du) * 20) / 20)); if (!dc.pos[drag.id]) delete dc.pos[drag.id];
      var dL = null; try { dL = layoutOf(dc, true); } catch (err) { dL = null; }
      if (dL) { viewNodes = dL.nodes; pz.inner.innerHTML = G.svg(dL, VIEW_UNIT); pz.w = dL.w * VIEW_UNIT; pz.h = dL.h * VIEW_UNIT; pzApply(); }
      return;
    }
    if (pzCount() === 1) {
      if (Math.abs(dx) + Math.abs(dy) > 6) pzMoved = true;
      if (pzMoved && pz.s > pz.fit * 1.01) { pz.tx += dx; pz.ty += dy; p.x = e.clientX; p.y = e.clientY; pzApply(); }
    } else if (pzCount() === 2) {
      p.x = e.clientX; p.y = e.clientY;
      var k = Object.keys(pzPts), a = pzPts[k[0]], b = pzPts[k[1]], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, r = pz.cv.getBoundingClientRect();
      pzZoom(d / pzDist, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); pzDist = d;
    }
  });
  function pzHit(e) {   // the person under the pointer, from the layout (in chart units)
    var r = pz.cv.getBoundingClientRect(), ux = (e.clientX - r.left - pz.tx) / pz.s / VIEW_UNIT, uy = (e.clientY - r.top - pz.ty) / pz.s / VIEW_UNIT, id = null;
    (viewNodes || []).forEach(function (n) { if (!n.ghost && ux >= n.x - 0.12 && ux <= n.x + 1.12 && uy >= n.y - 0.12 && uy <= n.y + 1.12 + (n.side ? 0 : Math.min(0.7, n.lab.h))) id = n.id; });
    return id;
  }
  function pzUp(e) {
    if (!pzPts[e.pointerId]) return;
    delete pzPts[e.pointerId];
    if (drag && drag.snapped) { drag = null; var mc = curChart(); if (mc) touch(mc); rerender(); return; }
    drag = null;
    if (e.type !== 'pointerup' || pzCount() || pzMoved || Date.now() - pzT0 > 600 || !pz) return;
    var c = curChart(), r = pz.cv.getBoundingClientRect(); if (!c || !document.body.contains(pz.cv)) return;
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    // which person is under the finger: the symbol and the first lines of the label under it (in chart units)
    var id = pzHit(e);
    if (!id || (id !== 'pt' && !memberById(c, id))) return;
    focusMember = id; if (id !== 'pt') openMember = id;
    location.hash = '#/chart/' + c.id;
  }
  window.addEventListener('pointerup', pzUp); window.addEventListener('pointercancel', pzUp);
  var pzResize = null;
  window.addEventListener('resize', function () { clearTimeout(pzResize); pzResize = setTimeout(function () { if (document.getElementById('canvas')) pzInit(); }, 200); });
  AFTER.chart = function (id, step) {
    if (step === 'view') { pzInit(); return; }
    if (!focusMember || step === 'lines') return;
    var target = focusMember === 'pt' ? main.querySelector('.idx') : document.getElementById('m-' + focusMember); focusMember = null;
    if (target) window.requestAnimationFrame(function () { target.scrollIntoView({ block: 'center' }); var f = target.querySelector('input[data-k="ptName"], input[data-k="name"]'); if (f) f.focus({ preventScroll: true }); });
  };

  window.__genoTest = { pdfFromJpeg: pdfFromJpeg, renderCanvas: renderCanvas, canvasBytes: canvasBytes, getChart: getChart };   // used by the checks in tools/

  /* ---------- Symbols library ---------- */
  /* A couple's line drawn small for the symbols page: the same colour, pattern, house and marks as on the genogram */
  function couplePrims(name) {
    var K = G.FAM_COUPLE_KIND[name] || {}, c = K.c || G.INK, out = [{ t: 'line', x1: 0.15, y1: 0.5, x2: 1.85, y2: 0.5, c: c, w: 0.055, dash: K.dash || false }];
    var ln = function (x1, y1, x2, y2) { out.push({ t: 'line', x1: x1, y1: y1, x2: x2, y2: y2, c: c, w: 0.055 }); };
    var hx = K.mark ? 0.72 : 1, at = K.house ? 1.36 : 1, fwd = function (o) { ln(at + o - 0.1, 0.78, at + o + 0.1, 0.22); };
    if (K.house) out.push({ t: 'poly', pts: [[-0.2, -0.03], [0, -0.23], [0.2, -0.03], [0.2, 0.19], [-0.2, 0.19]].map(function (q) { return [hx + q[0], 0.5 + q[1]]; }), c: c, w: 0.055, fill: 'FFFFFF', close: true });
    if (K.mark === 'sep') fwd(0); else if (K.mark === 'legal') ln(at - 0.1, 0.22, at + 0.1, 0.78); else if (K.mark === 'div') { fwd(-0.1); fwd(0.1); }
    else if (K.mark === 'null') { fwd(-0.2); fwd(0); fwd(0.2); } else if (K.mark === 'wid') { ln(at - 0.17, 0.33, at + 0.17, 0.67); ln(at - 0.17, 0.67, at + 0.17, 0.33); }
    return out;
  }
  var LIB = [   // English here; translated when drawn (VIEWS.symbols), so a language switch needs no reload
    { h: 'Who the person is', c: '#1C7A86', rows: [
      ['Male', 'Square.', symPrims({ sex: 'M' })], ['Female', 'Circle.', symPrims({ sex: 'F' })], ['Sex not stated', 'Diamond. Also used for a group of children of both sexes.', symPrims({ sex: 'U' })],
      ['Index person', 'Double outline with an arrow pointing at it: the patient or client the genogram is about.', symPrims({ sex: 'F', pt: true })],
      ['Age', 'Written inside the symbol. Months are shortened, for example 8m.', symPrims({ sex: 'M', text: '33' })]] },
    { h: 'Status and marks', c: '#D4502A', rows: [
      ['Living', 'Empty symbol.', symPrims({ sex: 'M' })], ['Deceased', 'An X through the symbol.', symPrims({ sex: 'F', dead: true })],
      ['Psychiatric disorder', 'Shaded symbol. Write the condition in “Condition / illness” so it shows under the name.', symPrims({ sex: 'M', fill: true })],
      ['Substance use disorder', 'The lower half is dark. It can be combined with the shading for a psychiatric disorder.', symPrims({ sex: 'M', subst: true })],
      ['Medical illness', 'A small bold cross beside the symbol. Write the illness in “Condition / illness”.', [{ t: 'shape', g: 'rect', x: 0.3, y: 0.1, w: 0.8, h: 0.8, fill: 'FFFFFF', c: G.INK, sw: 0.045 }, { t: 'line', x1: 0.14, y1: 0.72, x2: 0.14, y2: 0.96, c: G.INK, w: 0.07 }, { t: 'line', x1: 0.02, y1: 0.84, x2: 0.26, y2: 0.84, c: G.INK, w: 0.07 }]],
      ['Both', 'Shaded, with a dark lower half.', symPrims({ sex: 'F', fill: true, subst: true })],
      ['Transgender', 'The symbol follows the person’s gender identity; a small symbol beside it shows the sex assigned at birth. Choose it under “Gender identity”.', [{ t: 'shape', g: 'rect', x: 0.15, y: 0.1, w: 0.8, h: 0.8, fill: 'FFFFFF', c: G.INK, sw: 0.045 }, { t: 'shape', g: 'ellipse', x: 0.92, y: 0.7, w: 0.24, h: 0.24, fill: 'FFFFFF', c: G.INK, sw: 0.035 }]],
      ['Non-binary', 'A small diamond beside the symbol.', [{ t: 'shape', g: 'rect', x: 0.15, y: 0.1, w: 0.8, h: 0.8, fill: 'FFFFFF', c: G.INK, sw: 0.045 }, { t: 'shape', g: 'diamond', x: 0.92, y: 0.7, w: 0.24, h: 0.24, fill: 'FFFFFF', c: G.INK, sw: 0.035 }]],
      ['Pet', 'A small rounded square, in a row under the family with other relatives and household members who are not related. Join it to someone with a relationship line.', [{ t: 'shape', g: 'rect', r: 0.2, x: 0.3, y: 0.25, w: 0.6, h: 0.6, fill: 'FFFFFF', c: G.INK, sw: 0.045 }]],
      ['Several people in one symbol', '×n inside the symbol, from “Number of people”: 5 former partners, 7 children.', symPrims({ sex: 'U', text: '×7' })],
      ['Parent not listed', 'Dashed symbol with a question mark, drawn for half-siblings when the other parent was not added.', symPrims({ sex: 'U', ghost: true, text: '?' })],
      ['Household', 'With “Outline the household” turned on above the chart, a dashed blue outline is drawn around the index person and everyone who lives with them, instead of the small houses.', [{ t: 'shape', g: 'rect', r: 0.12, x: 0.12, y: 0.22, w: 0.96, h: 0.78, fill: '', c: G.BLUE, sw: 0.04, dash: true }]],
      ['Lives with the index person', 'A small house beside the symbol.', [{ t: 'poly', pts: [[0.25, 0.62], [0.6, 0.3], [0.95, 0.62], [0.95, 0.98], [0.25, 0.98]], c: G.SLATE, w: 0.03, fill: G.SLATE, close: true }]]] },
    { h: 'Couples and children', c: '#C2337A', rows: [
      ['Married / partners', 'A solid line between two people.', [{ t: 'line', x1: 0.15, y1: 0.5, x2: 1.85, y2: 0.5, c: G.INK, w: 0.055 }], 2],
      ['Separated', 'One slash across the line.', couplePrims('Separated'), 2],
      ['Legal separation', 'One slash leaning the other way: a legal separation has been filed or granted.', couplePrims('Legal separation'), 2],
      ['Divorce', 'Two slashes across the line.', couplePrims('Divorce'), 2],
      ['Nullity', 'Three slashes: the marriage was annulled or declared void.', couplePrims('Nullity'), 2],
      ['Widowed', 'A cross on the line: one spouse died during the marriage. Use it mainly when the surviving spouse has a new partner.', couplePrims('Widowed'), 2],
      ['Engagement', 'A blue dashed line. Blue lines are for couples who are not married.', couplePrims('Engagement'), 2],
      ['Engagement and cohabitation', 'Blue dashed line with a small house: engaged and living together.', couplePrims('Engagement and cohabitation'), 2],
      ['Engagement and separation', 'Blue dashed line with a slash: the engagement was broken.', couplePrims('Engagement and separation'), 2],
      ['Legal cohabitation', 'Dash-and-dot line with a house: living together under a written or registered agreement.', couplePrims('Legal cohabitation'), 2],
      ['Legal cohabitation and separation in fact', 'The same with a slash: no longer living together, but the agreement has not been ended.', couplePrims('Legal cohabitation and separation in fact'), 2],
      ['Legal cohabitation and legal separation', 'The same with a slash leaning the other way: the agreement has been legally ended.', couplePrims('Legal cohabitation and legal separation'), 2],
      ['Cohabitation', 'Dotted line with a house: living together as a couple without being married (live-in partners).', couplePrims('Cohabitation'), 2],
      ['Cohabitation and separation', 'Dotted line with a house and a slash: they no longer live together.', couplePrims('Cohabitation and separation'), 2],
      ['Non-sentimental cohabitation', 'Widely spaced dots with a house: living together without affection as a couple.', couplePrims('Non-sentimental cohabitation'), 2],
      ['Non-sentimental cohabitation and separation', 'Widely spaced dots with a house and a slash: they no longer live together.', couplePrims('Non-sentimental cohabitation and separation'), 2],
      ['Committed relationship', 'Short blue dashes: a long-term relationship, not living together.', couplePrims('Committed relationship'), 2],
      ['Committed relationship and separation', 'Short blue dashes with a slash: the relationship ended.', couplePrims('Committed relationship and separation'), 2],
      ['Casual relationship or dating', 'A blue dotted line: seeing each other or dating, short-term.', couplePrims('Casual relationship or dating'), 2],
      ['Casual relationship and separation', 'Blue dotted line with a slash: no longer dating (a former boyfriend or girlfriend).', couplePrims('Casual relationship and separation'), 2],
      ['Temporary relation / one night stand', 'A long dash and two dots: a brief relation. Add it when a child was born from it.', couplePrims('Temporary relation / one night stand'), 2],
      ['Love affair', 'A pink dash-and-dot line.', couplePrims('Love affair'), 2],
      ['Love affair and separation', 'Pink line with a slash: the affair ended.', couplePrims('Love affair and separation'), 2],
      ['Rape / forced relationship', 'Widely spaced red dots. Used mostly in therapy, or when a child was born from it.', couplePrims('Rape / forced relationship'), 2],
      ['Other or unknown', 'A grey line: a relationship that is not in this list, or is not known.', couplePrims('Other or unknown'), 2],
      ['Children', 'Hang from the line between their parents, oldest on the left.', [{ t: 'line', x1: 1, y1: 0.1, x2: 1, y2: 0.45, c: G.INK, w: 0.055 }, { t: 'line', x1: 0.4, y1: 0.45, x2: 1.6, y2: 0.45, c: G.INK, w: 0.055 }, { t: 'line', x1: 0.4, y1: 0.45, x2: 0.4, y2: 0.9, c: G.INK, w: 0.055 }, { t: 'line', x1: 1.6, y1: 0.45, x2: 1.6, y2: 0.9, c: G.INK, w: 0.055 }], 2],
      ['Adopted child', 'A dashed line down to the child.', [{ t: 'line', x1: 0.6, y1: 0.1, x2: 0.6, y2: 1.1, c: G.INK, w: 0.055, dash: true }]],
      ['Foster child', 'A dotted line down to the child.', [{ t: 'line', x1: 0.6, y1: 0.1, x2: 0.6, y2: 1.1, c: G.INK, w: 0.055, dash: 'dot' }]],
      ['Pregnancy', 'A triangle. Type the weeks in Age, for example 20 weeks.', [{ t: 'poly', pts: [[0.6, 0.2], [1.05, 1.0], [0.15, 1.0]], c: G.INK, w: 0.055, fill: 'FFFFFF', close: true }]],
      ['Miscarriage', 'A small filled circle.', [{ t: 'shape', g: 'ellipse', x: 0.42, y: 0.42, w: 0.36, h: 0.36, fill: G.INK, c: G.INK, sw: 0.03 }]],
      ['Abortion', 'A small cross.', [{ t: 'line', x1: 0.4, y1: 0.4, x2: 0.8, y2: 0.8, c: G.INK, w: 0.07 }, { t: 'line', x1: 0.8, y1: 0.4, x2: 0.4, y2: 0.8, c: G.INK, w: 0.07 }]],
      ['Stillbirth', 'A small symbol with an X through it.', [{ t: 'shape', g: 'rect', x: 0.35, y: 0.35, w: 0.5, h: 0.5, fill: 'FFFFFF', c: G.INK, sw: 0.045 }, { t: 'line', x1: 0.28, y1: 0.28, x2: 0.92, y2: 0.92, c: G.INK, w: 0.04 }, { t: 'line', x1: 0.92, y1: 0.28, x2: 0.28, y2: 0.92, c: G.INK, w: 0.04 }]],
      ['Twins', 'Two lines that start from the same point.', [{ t: 'line', x1: 1, y1: 0.15, x2: 0.45, y2: 0.9, c: G.INK, w: 0.055 }, { t: 'line', x1: 1, y1: 0.15, x2: 1.55, y2: 0.9, c: G.INK, w: 0.055 }], 2]] },
    { h: 'Relationship lines', c: '#0E8A8A', rows: [
      ['Close', 'Two green lines.'], ['Very close / enmeshed', 'Three green lines.'], ['Distant', 'A dotted line.'], ['Conflictual', 'A red zigzag.'],
      ['Close but conflictual', 'A red zigzag between two green lines.'], ['Cut off / estranged', 'A line broken in the middle.'], ['Abusive toward', 'A red zigzag with an arrow pointing at the person harmed.'],
      ['Hostile', 'A red zigzag between two red lines.'], ['Physical abuse toward', 'A blue zigzag with an arrow pointing at the person harmed.'],
      ['Emotional abuse toward', 'A blue zigzag between two blue lines, with an arrow pointing at the person harmed.'],
      ['Sexual abuse toward', 'A red zigzag between two red lines, with an arrow pointing at the person harmed.'],
      ['Neglect toward', 'A grey dashed line with an arrow pointing at the person neglected.'], ['Caregiver of', 'A green line with an arrow pointing at the person cared for.']] }
  ];
  TITLES.symbols = 'Symbols and lines';
  VIEWS.symbols = function () {
    return '<div class="wrap page"><header class="page__head"><h1>' + esc(tx('Symbols and lines')) + '</h1><p>' + esc(tx('The standard genogram notation this app draws. The key on each genogram lists only what that chart uses.')) + '</p></header>' +
      LIB.map(function (sec) {
        return '<section class="grp" style="--c:' + sec.c + '"><h2 class="grp__h"><span class="grp__dot"></span>' + esc(tx(sec.h)) + '</h2><div class="card lib">' + sec.rows.map(function (r) {
          var pic = r[2] ? miniSVG(r[2], r[3] || 1.2, r[3] ? 1 : 1.2, 34) : linkIcon(r[0]);
          return '<div class="lib__row"><span class="lib__ico' + (r[3] || !r[2] ? ' lib__ico--wide' : '') + '">' + pic + '</span><span><strong>' + esc(tx(r[0])) + '</strong><small>' + esc(tx(r[1])) + '</small></span></div>'; }).join('') + '</div></section>';
      }).join('') + '</div>';
  };

  /* ---------- How to use ---------- */
  var GUIDE = [   // English here; translated when drawn (VIEWS.guide)
    ['Start with the index person', 'Open a new genogram and fill in the index person: the name to show (initials or an alias are fine), age and sex. The shading for a psychiatric disorder is on to begin with; tap it to turn it off. “Substance use disorder” darkens the lower half of the symbol.'],
    ['Add the family with one tap', 'Tap + Father, + Mother, + Sister and so on. Each person appears as a row; tap a row to open it and add the age, occupation and conditions. “Someone else…” has every other relationship: step-parents, half-siblings, former partners, nephews and nieces, grandchildren, grandparents and great-grandparents, aunts and uncles, and cousins.'],
    ['Oldest to youngest', 'Brothers, sisters and children are placed by age, oldest on the left, whatever order you typed them in. Ages such as “8 mo” or “1 y 6 mo” are understood. For people of the same age, use Move up and Move down; for twins, turn on Twin for each of them.'],
    ['Children with different partners', 'Add each partner first (Husband, Wife, Partner, Former partner). Then open the child and choose the other parent. Leave it on the first choice and the child goes with the current spouse or partner.'],
    ['Couples: married, engaged, living together, dating', 'Open a spouse, partner or former partner and choose “Couple’s relationship”. The list is grouped: Married (separated, legal separation, divorce, nullity, widowed), Engaged, Living together, Not living together (committed, casual, temporary, love affair) and Other. Married couples are joined by a dark line; couples who are not married by a blue line. A small house on the line means they live together, and a slash means they have separated. Symbols and lines shows every one.'],
    ['Years, medical illness and notes', 'Each person has a year of birth and a year of death; they show under the name as 1950–2020. The age of someone who died is written over the cross. “Medical illness” adds a small cross beside the symbol. Under the chart, “Notes under the genogram” is for the informant, who drew it and a short summary; it is printed below the key.'],
    ['Moving people by hand', 'The chart places everyone automatically. To adjust it, turn on “Move people” above the chart and drag a person left or right; the lines follow. “Reset positions” puts everyone back. Undo also works.'],
    ['Same-sex couples', 'Add the partner as Husband, Wife or Partner as usual. For “Partner” and “Former partner”, choose the sex in their card. The couple’s line and their children are drawn the same way.'],
    ['Others in the household, and pets', '“Other relative”, “Household member (not related)” and “Pet” are drawn in a row of their own under the family. They are not joined to anyone unless you add a relationship line in step 2, for example Caregiver of or Close.'],
    ['Step-parents and half-siblings', 'A stepfather is drawn beside the mother, a stepmother beside the father. A paternal half-sibling hangs between the father and the stepmother; if no stepmother was added, a dashed “?” parent is drawn.'],
    ['Great-grandparents', 'Add the grandparent first, then the great-grandfather or great-grandmother, and choose whose parent they are. Each grandparent has room for two parents.'],
    ['Cousins', 'Add the aunt or uncle first, then add the cousin and choose whose child they are. Paternal cousins are drawn on the left, maternal cousins on the right.'],
    ['Adopted and foster children, pregnancies and losses', 'Open a brother, sister, child, nephew, niece, grandchild or cousin. “Joined the family” draws a dashed line for an adopted child and a dotted line for a foster child. “Pregnancy or loss” draws a triangle for a current pregnancy, a small filled circle for a miscarriage, a small cross for an abortion and a small crossed symbol for a stillbirth.'],
    ['Many people in one symbol', 'Type a number in “Number of people” to let one symbol stand for several people, such as 5 former partners or 7 children. Each person has room for four partners on the chart (the third and fourth are joined by a line that goes over the top), so this is the way to show more.'],
    ['Relationship lines', 'In step 2, pick two people and how they relate. Lines between generations start under the older person’s label so they do not run through the words.'],
    ['Tap, zoom and undo', 'On the chart, tap a person to open their card. Pinch, or use + and −, to zoom in, then drag to move around; Fit shows the whole chart again. While editing, Undo takes back the last change, one step at a time. A deleted genogram can be brought back from the message that appears.'],
    ['Save and share', 'In step 3, Save picture makes a PNG and Save PDF makes a one-page A4 PDF. Share file saves that one genogram as a file: a colleague opens it with “Open a genogram file” on the home page, and PsychInterview can open it in its Family section. On an installed iPhone or iPad app the share sheet opens so you can save to Files or send it.'],
    ['Privacy', 'Everything stays on this device. Nothing is sent to a server. Use initials or an alias, or turn on “Initials only” above the chart to shorten every name on it. A passcode lock is under About. Use Export backup in the footer to move your genograms to another device.']
  ];
  /* ---------- Privacy: what the app keeps and where ---------- */
  var PRIVACY = [   // English here; translated when drawn (VIEWS.privacy)
    ['Nothing leaves this device', 'Genogram has no account, no server and no tracking. It does not collect, send or share any information. The app’s own files are loaded from the website once and then work offline.'],
    ['Where your genograms are kept', 'Everything you type is saved in this browser’s storage on this phone, tablet or computer. Nobody else, including the maker of the app, can see it.'],
    ['Files you choose to save', 'A picture, a PDF, a shared genogram file or a backup file is made on this device and goes only where you send it. These files are not encrypted: treat them like any other patient document.'],
    ['Protecting the people on the chart', 'Use initials or an alias, or turn on “Initials only”. Follow your hospital’s rules on patient information. The optional passcode keeps the app closed on a shared device; it does not encrypt what is saved.'],
    ['Removing your data', 'Delete a genogram from the home screen, or clear this site’s data in the browser settings to remove everything. Because nothing is kept anywhere else, deleted genograms cannot be recovered without a backup file.'],
    ['Questions', 'Write to isaymotion@gmail.com.']
  ];
  TITLES.privacy = 'Privacy';
  VIEWS.privacy = function () {
    return '<div class="wrap page"><header class="page__head"><h1>' + esc(tx('Privacy')) + '</h1><p>' + esc(tx('In short: your genograms stay on your device.')) + '</p></header>' +
      PRIVACY.map(function (g) { return '<div class="row row--static"><span><h3>' + esc(tx(g[0])) + '</h3><p>' + esc(tx(g[1])) + '</p></span><span></span></div>'; }).join('') + '</div>';
  };
  TITLES.guide = 'How to use';
  VIEWS.guide = function () {
    return '<div class="wrap page"><header class="page__head"><h1>' + esc(tx('How to use')) + '</h1><p>' + txh('Short notes on each part of the app. The {link} shows what everything on the chart means.', { link: '<a href="#/symbols">' + esc(tx('symbols page')) + '</a>' }) + '</p></header>' +
      GUIDE.map(function (g, i) { return '<div class="row row--static"><span class="row__num">' + (i + 1) + '</span><span><h3>' + esc(tx(g[0])) + '</h3><p>' + esc(tx(g[1])) + '</p></span><span></span></div>'; }).join('') + '</div>';
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
    if (has(TITLES, key)) return tx(TITLES[key]);
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
  if (LOCK) { if (lockOK) lockShow(); else document.documentElement.classList.remove('locked'); } else document.documentElement.classList.remove('locked');
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
        if (k && k.indexOf(PREFIX) === 0 && k !== PREFIX + 'lock') data[k.slice(PREFIX.length)] = localStorage.getItem(k);   // the passcode lock stays on this device
      }
    } catch (e) {}
    return data;
  }
  function bkReplace(data) {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(PREFIX) === 0 && k !== PREFIX + 'lock') keys.push(k); }
    keys.forEach(function (k) { localStorage.removeItem(k); });
    Object.keys(data).forEach(function (k) { if (k !== 'lock') localStorage.setItem(PREFIX + k, data[k]); });
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
