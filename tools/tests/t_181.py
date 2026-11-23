# 1.8.1: the phone app (window.Capacitor) shows app wording; the website keeps browser wording. Usage: python3 -I t_181.py <genogram repo>
import sys, subprocess, time
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-I','-m','http.server','8782','--directory',sys.argv[1]],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
res=[]
def ok(name,c,extra=''): res.append(c); print(('PASS ' if c else 'FAIL ')+name, '' if c else extra)
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for native in (False, True):
        ctx=b.new_context(viewport={'width':390,'height':844},service_workers='block')
        if native: ctx.add_init_script("window.Capacitor={isNativePlatform:function(){return true}}")
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        tag='phone app' if native else 'website'
        pg.goto('http://localhost:8782/#/privacy'); pg.wait_for_timeout(600); main=pg.inner_text('main'); box=pg.inner_text('.backup__text')
        ok(tag+': privacy wording', (("app’s own storage" in main and 'Face ID' in main and 'browser' not in main) if native else ("browser’s storage" in main and 'Face ID' not in main)), main[:200])
        ok(tag+': backup box wording', (('phone or tablet' in box) if native else ('this browser' in box)), box)
        pg.evaluate("localStorage.setItem('g:v1:lang',JSON.stringify('tl'))"); pg.reload(); pg.wait_for_timeout(600)
        tl=pg.inner_text('main')+pg.inner_text('.backup__text')
        ok(tag+': Tagalog shown', (('sariling storage ng app' in tl and 'teleponong ito o tablet' in tl) if native else ('storage ng browser' in tl)), tl[:200])
        ok(tag+': no page errors', not errs, errs[:2]); ctx.close()
    b.close()
srv.terminate(); print(sum(res),'of',len(res),'passed'); sys.exit(0 if all(res) else 1)
