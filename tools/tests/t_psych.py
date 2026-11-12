import os
QA=os.environ.get('GENO_QA','/tmp/geno-qa'); os.makedirs(QA,exist_ok=True); os.makedirs(QA+'/pp',exist_ok=True)
import asyncio, json, sys, subprocess, time, glob, zipfile
from playwright.async_api import async_playwright
ROOT=sys.argv[1]; PORT=8766
srv=subprocess.Popen([sys.executable,'-I','-m','http.server',str(PORT),'--directory',ROOT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
URL=f'http://localhost:{PORT}/'; res=[]
def ok(name,cond,extra=''): res.append((name,bool(cond))); print(('PASS ' if cond else 'FAIL ')+name+(' — '+str(extra) if extra and not cond else ''))
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(); ctx=await b.new_context(viewport={'width':1024,'height':1366},accept_downloads=True,service_workers='block'); page=await ctx.new_page(); errs=[]
        page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errs.append(str(e)))
        page.on('dialog',lambda d: asyncio.ensure_future(d.accept()))
        await page.goto(URL); await page.click('#new'); await page.wait_for_selector('[data-sec]')
        await page.locator('[data-sec]',has_text='Family profile').first.click(); await page.wait_for_selector('[data-famadd]')
        await page.click('[data-famadd]'); await page.wait_for_selector('select[data-fk="rel"]')
        opts=await page.locator('select[data-fk="rel"] option').all_inner_texts(); ok('cousin relationships offered','Female cousin' in opts)
        await page.select_option('select[data-fk="rel"]','Son'); await page.wait_for_selector('select[data-fk="preg"]')
        ok('new fields in the family card',await page.locator('select[data-fk="bond"]').count()==1 and await page.locator('button[data-fk="subst"]').count()==1 and await page.locator('[data-genoflag="genoPtSubst"]').count()==1)
        await page.select_option('select[data-fk="bond"]','Adopted'); await page.click('button[data-fk="subst"]'); await page.click('[data-genoflag="genoPtSubst"]'); await page.wait_for_timeout(600)
        txt=await page.inner_text('#geno'); ok('genogram redraws with adopted + substance use',('Adopted' in txt) and ('Substance use' in txt),txt[-300:])
        f=glob.glob(QA+'/*.genogram.json')[0]
        await page.set_input_files('#geno-file',f); await page.wait_for_timeout(500)
        txt=await page.inner_text('#geno'); n=await page.locator('.famcard').count()
        ok('opens a Genogram app file',n>=16 and ('Miscarriage' in txt) and ('Nico' in txt) and ('Cora' in txt),(n,txt[-200:]))
        ok('nothing left undrawn','Not drawn' not in txt)
        await page.locator('#geno').screenshot(path=QA+'/psych-geno.png')
        async with page.expect_download() as d: await page.click('[data-genofile]')
        dl=await d.value; await dl.save_as(QA+'/from-psych.genogram.json'); j=json.load(open(QA+'/from-psych.genogram.json')); ok('saves a Genogram app file',j['app']=='genogram' and len(j['chart']['family'])>=15)
        async with page.expect_download() as d: await page.click('[data-genosave]')
        dl=await d.value; ok('genogram picture saves',dl.suggested_filename.endswith('.png'))
        # slides: draw the genogram pieces through the real slide builder
        r=await page.evaluate("""(()=>{ try{ const d=JSON.parse(JSON.stringify(Object.values(JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>{try{const v=JSON.parse(localStorage.getItem(k));return v&&v.cases}catch(e){return false}}))).cases)[0].data)); const G=genogramLayout(d); const kinds={}; G.prims.forEach(p=>{kinds[p.t+(p.g?':'+p.g:'')]=(kinds[p.t+(p.g?':'+p.g:'')]||0)+1}); return kinds; }catch(e){ return String(e) } })()""")
        ok('only drawing pieces the slides understand',isinstance(r,dict) and set(k.split(':')[0] for k in r)<= {'line','poly','shape','text'} and all(k in ('line','poly','text','shape:rect','shape:ellipse','shape:diamond') for k in r),r)
        ok('no console errors',not errs,errs[:3])
        await page.screenshot(path=QA+'/psych-page.png')
        await b.close()
asyncio.run(main()); srv.terminate()
bad=[r for r in res if not r[1]]; print(len(res)-len(bad),'of',len(res),'passed')
