import os
QA=os.environ.get('GENO_QA','/tmp/geno-qa'); os.makedirs(QA,exist_ok=True); os.makedirs(QA+'/pp',exist_ok=True)
import asyncio, json, sys, subprocess, time, os
from playwright.async_api import async_playwright
ROOT=sys.argv[1]; PORT=8765
srv=subprocess.Popen([sys.executable,'-I','-m','http.server',str(PORT),'--directory',ROOT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
URL=f'http://localhost:{PORT}/'
res=[]
def ok(name,cond,extra=''): res.append((name,bool(cond),extra)); print(('PASS ' if cond else 'FAIL ')+name+(' — '+str(extra) if extra and not cond else ''))
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch()
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True,accept_downloads=True,service_workers='block')
        page=await ctx.new_page(); errs=[]; ext=[]
        page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        page.on('pageerror',lambda e: errs.append(str(e)))
        page.on('request',lambda r: ext.append(r.url) if not r.url.startswith(URL) and not r.url.startswith('data:') and not r.url.startswith('blob:') else None)
        await page.goto(URL); await page.wait_for_selector('.hero')
        ok('home loads',True)
        await page.click('button[data-act="sample"]'); await page.wait_for_selector('#canvas svg')
        n=await page.locator('#canvas [data-id]').count(); ok('symbols carry ids',n>=14,n)
        box=await page.locator('#canvas').bounding_box(); ok('canvas has height',box['height']>150,box)
        await page.screenshot(path=QA+'/view-phone.png')
        t0=await page.evaluate("document.getElementById('canvas-in').style.transform")
        await page.click('button[data-act="zoomin"]'); t1=await page.evaluate("document.getElementById('canvas-in').style.transform"); ok('zoom in changes scale',t0!=t1,(t0,t1))
        await page.click('button[data-act="zoomfit"]'); t2=await page.evaluate("document.getElementById('canvas-in').style.transform"); ok('fit restores',t2==t0,(t0,t2))
        # initials
        await page.click('button[data-tog="initials"]'); txt=await page.inner_text('#canvas'); ok('initials only',('R.' in txt) and ('Ramon' not in txt),txt[:200])
        await page.click('button[data-tog="initials"]')
        # tap father
        el=page.locator('#canvas [data-id="fa"]').first; bb=await el.bounding_box()
        await page.mouse.click(bb['x']+bb['width']/2, bb['y']+bb['height']/2)
        await page.wait_for_selector('#m-fa.is-open',timeout=3000); ok('tap a symbol opens that person',True)
        v=await page.input_value('#m-fa input[data-k="name"]'); ok('father card shows name',v=='Ramon',v)
        ok('substance chip on',await page.get_attribute('#m-fa button[data-tog="subst"]','aria-pressed')=='true')
        # undo typing
        ok('undo disabled at first',await page.is_disabled('#undo-btn'))
        await page.fill('#m-fa input[data-k="name"]','Ramonito'); ok('undo enabled after typing',not await page.is_disabled('#undo-btn'))
        await page.click('#undo-btn'); await page.wait_for_timeout(100)
        v=await page.input_value('#m-fa input[data-k="name"]'); ok('undo typing',v=='Ramon',v)
        # remove + undo
        await page.click('#m-fa button[data-act="rm"]'); await page.wait_for_timeout(100); ok('removed',await page.locator('#m-fa').count()==0)
        await page.click('#undo-btn'); await page.wait_for_timeout(100); ok('undo remove',await page.locator('#m-fa').count()==1)
        links=await page.evaluate("JSON.parse(localStorage.getItem('g:v1:charts'))"); cid=links['order'][0]
        ok('links restored after undo',any(l['b']=='fa' for l in links['byId'][cid]['links']))
        # add a cousin: someone else
        await page.click('button[data-act="add"][data-rel=""]'); await page.select_option('.member.is-open select[data-k="rel"]','Female cousin')
        ok('cousin has bond+preg selects',await page.locator('.member.is-open select[data-k="bond"]').count()==1 and await page.locator('.member.is-open select[data-k="preg"]').count()==1)
        ofopts=await page.locator('.member.is-open select[data-k="of"] option').all_inner_texts(); ok('cousin parent choices are aunts/uncles',any('Ben' in o for o in ofopts),ofopts)
        await page.fill('.member.is-open input[data-k="name"]','Cora')
        await page.goto(URL+'#/chart/'+cid+'/view'); await page.wait_for_selector('#canvas svg'); txt=await page.inner_text('#canvas')
        ok('cousins drawn',('Cora' in txt) and ('Nico' in txt) and ('Adopted' in txt) and ('Miscarriage' in txt) and ('Substance use' in txt),txt[-400:])
        ok('nothing left undrawn',await page.locator('.callout--caution').count()==0)
        # exports
        r=await page.evaluate("(async()=>{const t=window.__genoTest,c=t.getChart('%s');const cv=await t.renderCanvas(c);const j=await t.canvasBytes(cv,'image/jpeg',0.9);const p=t.pdfFromJpeg(j,cv.width,cv.height,'x');return [cv.width,cv.height,p.length,String.fromCharCode(...p.slice(0,5))]})()"%cid)
        ok('picture and PDF build',r[0]>500 and r[3]=='%PDF-',r)
        async with page.expect_download() as d: await page.click('button[data-act="sharefile"]')
        dl=await d.value; path=QA+'/'+dl.suggested_filename; await dl.save_as(path); j=json.load(open(path)); ok('share file',dl.suggested_filename.endswith('.genogram.json') and j['kind']=='chart' and len(j['chart']['family'])>=15,dl.suggested_filename)
        await page.goto(URL+'#/'); await page.wait_for_selector('.hero'); n0=await page.locator('.chartcard').count()
        await page.set_input_files('#open-file',path); await page.wait_for_selector('#canvas svg'); await page.goto(URL+'#/'); await page.wait_for_selector('.hero')
        ok('open a genogram file adds a copy',await page.locator('.chartcard').count()==n0+1)
        # bad file
        open(QA+'/bad.json','w').write('{"app":"x"}'); await page.set_input_files('#open-file',QA+'/bad.json'); await page.wait_for_timeout(200)
        ok('bad file refused',('not a genogram file' in await page.inner_text('#ed-status')))
        # delete + undo
        await page.locator('button[data-act="del"]').first.click(); await page.wait_for_timeout(100); ok('deleted',await page.locator('.chartcard').count()==n0)
        await page.click('.snack__btn'); await page.wait_for_timeout(150); ok('undo delete',await page.locator('.chartcard').count()==n0+1)
        # lock
        await page.goto(URL+'#/about'); await page.wait_for_selector('#lk-new')
        await page.fill('#lk-new','1234'); await page.fill('#lk-new2','1235'); await page.click('button[data-lock="on"]'); ok('mismatch refused','not the same' in await page.inner_text('#lk-status'))
        await page.fill('#lk-new2','1234'); await page.click('button[data-lock="on"]'); await page.wait_for_selector('#lk-cur'); ok('lock on',True)
        await page.reload(); await page.wait_for_selector('#lockscreen'); vis=await page.evaluate("getComputedStyle(document.querySelector('.shell')).display"); ok('content hidden while locked',vis=='none',vis)
        await page.screenshot(path=QA+'/lock-phone.png')
        await page.fill('#lock-in','9999'); await page.keyboard.press('Enter'); await page.wait_for_timeout(600); ok('wrong passcode refused',await page.locator('#lockscreen').count()==1 and 'not right' in await page.inner_text('#lock-status'))
        await page.fill('#lock-in','1234'); await page.keyboard.press('Enter'); await page.wait_for_selector('#lockscreen',state='detached'); vis=await page.evaluate("getComputedStyle(document.querySelector('.shell')).display"); ok('right passcode unlocks',vis!='none',vis)
        bk=await page.evaluate("(()=>{const d={};for(let i=0;i<localStorage.length;i++){d[localStorage.key(i)]=1}return Object.keys(d)})()"); ok('lock stored',any(k=='g:v1:lock' for k in bk),bk)
        await page.fill('#lk-cur','1234'); await page.click('button[data-lock="off"]'); await page.wait_for_selector('#lk-new'); ok('lock off',await page.evaluate("localStorage.getItem('g:v1:lock')") is None)
        # pages
        for h in ['#/symbols','#/guide','#/whats-new']:
            await page.goto(URL+h); await page.wait_for_timeout(150)
        await page.goto(URL+'#/symbols'); await page.wait_for_timeout(200); await page.screenshot(path=QA+'/symbols-phone.png',full_page=True)
        fam=await page.evaluate("document.fonts.ready.then(()=>[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family))"); ok('bundled fonts load',any('Figtree' in f for f in fam),fam)
        ok('no requests to other sites',not ext,ext[:3]); ok('no console errors',not errs,errs[:3])
        # desktop view
        p2=await (await b.new_context(viewport={'width':1280,'height':800},service_workers='block')).new_page(); await p2.goto(URL); await p2.click('button[data-act="sample"]'); await p2.wait_for_selector('#canvas svg'); await p2.screenshot(path=QA+'/view-desktop.png')
        await b.close()
asyncio.run(main()); srv.terminate()
bad=[r for r in res if not r[1]]; print(len(res)-len(bad),'of',len(res),'passed'); sys.exit(1 if bad else 0)
