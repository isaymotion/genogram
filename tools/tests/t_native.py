"""Bridge test with a pretend phone: Capacitor plugins are mocked in the page."""
import sys, threading, http.server, functools, json
from playwright.sync_api import sync_playwright
www = sys.argv[1]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = functools.partial(Q, directory=www)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % srv.server_port
MOCK = """
window.__prefs = JSON.parse(sessionStorage.getItem('__prefs') || '{}'); window.__shared = [];
function savePrefs(){ sessionStorage.setItem('__prefs', JSON.stringify(window.__prefs)); }
window.Capacitor = { isNativePlatform: () => true, registerPlugin: (n) => ({
 Preferences: { set: ({key,value}) => { __prefs[key]=value; savePrefs(); return Promise.resolve(); }, remove: ({key}) => { delete __prefs[key]; savePrefs(); return Promise.resolve(); },
   keys: () => Promise.resolve({keys:Object.keys(__prefs)}), get: ({key}) => Promise.resolve({value: key in __prefs ? __prefs[key] : null}) },
 Filesystem: { writeFile: (o) => Promise.resolve({uri:'file:///cache/'+o.path, _len:o.data.length}) },
 Share: { share: (o) => { __shared.push(o); return Promise.resolve({}); } },
 NativeBiometric: { isAvailable: () => Promise.resolve({isAvailable:true}), verifyIdentity: () => Promise.resolve() } }[n]) };
"""
res = []; errs = []
def ok(name, cond): res.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(); ctx.add_init_script(MOCK); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(URL); pg.wait_for_selector('[data-act="sample"]', timeout=15000)
    ok('app starts after native.js', pg.evaluate('!!window.GenoNative && !!window.Geno'))
    ok('no service worker in phone app', pg.evaluate('navigator.serviceWorker ? navigator.serviceWorker.controller === null : true'))
    pg.click('[data-act="sample"]'); pg.wait_for_timeout(800)
    n = pg.evaluate("Object.keys(__prefs).filter(k=>k.indexOf('g:v1:')===0).length")
    ok('saved items copied to phone storage', n > 0 and 'g:v1:charts' in pg.evaluate('Object.keys(__prefs)'))
    charts = pg.evaluate("localStorage.getItem('g:v1:charts')")
    ok('phone copy equals web view copy', pg.evaluate("__prefs['g:v1:charts']") == charts)
    # web view storage wiped (as the phone might): reload must restore it
    pg.evaluate("Object.keys(localStorage).forEach(k=>localStorage.removeItem.call ? Storage.prototype.removeItem.call(localStorage,k) : 0)")
    # removeItem is patched and would delete the phone copy too, so wipe with clear() which is not patched
    pg.evaluate("sessionStorage.setItem('__prefs', JSON.stringify(Object.assign(JSON.parse(sessionStorage.getItem('__prefs')||'{}'), {'g:v1:charts': %s})))" % json.dumps(charts))
    pg.evaluate('localStorage.clear()')
    pg.reload(); pg.wait_for_timeout(1500)
    ok('genograms restored after web view storage was cleared', pg.evaluate("localStorage.getItem('g:v1:charts')") == charts)
    # native save: backup export
    r = pg.evaluate("GenoNative.save('{\"a\":1}', 'x/y.json').then(()=>__shared[__shared.length-1])")
    ok('save opens share sheet with a cache file', r and r['files'][0] == 'file:///cache/x-y.json')
    r = pg.evaluate("GenoNative.save(new Uint8Array(70000).fill(65), 'big.pdf').then(()=>true)")
    ok('large binary file saves', r)
    ok('bio available flag set', pg.evaluate('GenoNative.bio'))
    # lock screen offers Face ID and unlocks with it
    pg.evaluate("localStorage.setItem('g:v1:lock', JSON.stringify({salt:'AAAAAAAAAAAAAAAAAAAAAA==',hash:'x',iter:1000}))")
    pg.reload(); pg.wait_for_timeout(1500)
    shown = pg.evaluate("!!document.getElementById('lockscreen') || null")
    ok('lock screen gone after Face ID (auto prompt)', shown is None)
    ctx2 = b.new_context(); ctx2.add_init_script(MOCK.replace("verifyIdentity: () => Promise.resolve()", "verifyIdentity: () => Promise.reject(new Error('no'))")); p2 = ctx2.new_page()
    p2.goto(URL); p2.wait_for_timeout(300)
    p2.evaluate("localStorage.setItem('g:v1:lock', JSON.stringify({salt:'AAAAAAAAAAAAAAAAAAAAAA==',hash:'x',iter:1000}))"); p2.reload(); p2.wait_for_timeout(1500)
    ok('failed Face ID keeps the lock, button offered', p2.evaluate("!!document.getElementById('lockscreen') && !!document.getElementById('lock-bio')"))
    b.close()
ok('no console errors', not errs); errs and print(errs[:5])
print('%d of %d passed' % (sum(1 for r in res if r[1]), len(res)))
