# The five sample families open from the home screen and draw completely. Usage: python3 -I t_samples.py <genogram repo>
import sys, subprocess, time
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-I','-m','http.server','8781','--directory',sys.argv[1]],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
want=[('Reyes',15),('Santos',9),('Dela Cruz',13),('Villanueva',13),('Lim',12)]; bad=0
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_context(viewport={'width':390,'height':844},service_workers='block').new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    for i,(name,n) in enumerate(want):
        pg.goto('http://localhost:8781/#/'); pg.wait_for_selector('.samplerow'); pg.locator('.samplerow').nth(i).click(); pg.wait_for_selector('#canvas svg'); pg.wait_for_timeout(300)
        got=pg.evaluate("(()=>{var d=JSON.parse(localStorage.getItem('g:v1:charts'));var c=d.byId[d.order[0]];var L=Geno.layout(JSON.parse(JSON.stringify(Object.assign({},c,{famLinks:c.links}))),{});return [c.title,c.family.length]})()")
        good = name in got[0] and got[1]==n and 'not drawn' not in pg.inner_text('main').lower() and name in pg.inner_html('#canvas')
        bad += 0 if good else 1; print(('PASS ' if good else 'FAIL ')+name, '' if good else got)
    good = not errs; bad += 0 if good else 1; print(('PASS ' if good else 'FAIL ')+'no console errors', errs[:3] if errs else ''); b.close()
srv.terminate(); print(len(want)+1-bad,'of',len(want)+1,'passed'); sys.exit(1 if bad else 0)
