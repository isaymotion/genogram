# 1.6.0: welcome card, privacy page, backup reminder, years / medical illness / notes in both apps. Usage: python3 -I t_160.py <genogram> <case-psychinterview>
import os, asyncio, json, sys, subprocess, time
QA=os.environ.get('GENO_QA','/tmp/geno-qa'); os.makedirs(QA,exist_ok=True)
from playwright.async_api import async_playwright
G,P=sys.argv[1],sys.argv[2]
srv=[subprocess.Popen([sys.executable,'-I','-m','http.server',str(p),'--directory',r],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL) for p,r in ((8775,G),(8776,P))]; time.sleep(1); res=[]
def ok(name,cond,extra=''): res.append((name,bool(cond))); print(('PASS ' if cond else 'FAIL ')+name+(' — '+str(extra) if extra and not cond else ''))
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block',accept_downloads=True); page=await ctx.new_page(); errs=[]
        page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errs.append(str(e))); page.on('dialog',lambda d: asyncio.ensure_future(d.accept()))
        U='http://localhost:8775/'
        await page.goto(U); await page.wait_for_selector('#welcome'); t=await page.inner_text('#welcome'); ok('welcome shows on the first visit','Welcome to Genogram' in t)
        await page.locator('#welcome').screenshot(path=QA+'/welcome.png')
        for _ in range(3): await page.click('[data-act="intro-next"]'); await page.wait_for_timeout(120)
        t=await page.inner_text('#welcome'); ok('four screens, the last offers a start','3. Save and share' in t and await page.locator('[data-act="intro-sample"]').count()==1)
        await page.click('[data-act="intro-sample"]'); await page.wait_for_selector('#canvas svg'); await page.goto(U+'#/'); await page.wait_for_timeout(300)
        ok('welcome is not shown again',await page.locator('#welcome').count()==0 and await page.evaluate("localStorage.getItem('g:v1:introSeen')") is not None)
        ok('no backup reminder with one genogram',await page.locator('#bk-nudge').count()==0)
        for i in (1,2): await page.locator('.samplerow').nth(i).click(); await page.wait_for_selector('#canvas svg'); await page.goto(U+'#/'); await page.wait_for_selector('.samplerow')
        ok('backup reminder with three genograms',await page.locator('#bk-nudge').count()==1); await page.click('[data-act="bk-later"]'); await page.wait_for_timeout(200)
        ok('“Remind me later” hides it',await page.locator('#bk-nudge').count()==0)
        await page.evaluate("localStorage.removeItem('g:v1:bkSnooze')"); await page.reload(); await page.wait_for_selector('#bk-nudge')
        async with page.expect_download() as d: await page.click('[data-act="bk-now"]')
        await d.value; await page.wait_for_timeout(300); ok('“Save a backup now” saves the file and the reminder goes',await page.locator('#bk-nudge').count()==0)
        await page.goto(U+'#/privacy'); await page.wait_for_selector('.page__head'); t=await page.inner_text('main'); ok('privacy page','Nothing leaves this device' in t and 'isaymotion@gmail.com' in t)
        ok('privacy is in the menu',await page.locator('a[href="#/privacy"]').count()>=1)
        # years, medical illness, notes
        cid=await page.evaluate("JSON.parse(localStorage.getItem('g:v1:charts')).order[2]")   # the Reyes sample
        await page.goto(U+'#/chart/'+cid); await page.wait_for_selector('.member'); await page.locator('.member',has_text='Ramon').first.locator('.member__head, summary, button').first.click(); await page.wait_for_timeout(300)
        box=page.locator('.member.is-open'); await box.locator('[data-k="born"]').fill('1964'); await box.locator('[data-tog="med"]').click(); await page.wait_for_timeout(300)
        await page.locator('[data-k="ptBorn"]').fill('1992'); await page.locator('[data-tog="ptMed"]').click(); await page.wait_for_timeout(400)
        await page.goto(U+'#/chart/'+cid+'/view'); await page.wait_for_selector('#canvas svg'); await page.fill('textarea[data-k="notes"]','Informant: the patient. Drawn on admission.'); await page.locator('textarea[data-k="notes"]').blur(); await page.wait_for_timeout(500)
        t=await page.inner_text('#canvas'); ok('years, medical illness and notes are on the chart','b. 1964' in t and 'b. 1992' in t and 'Medical illness (cross beside the symbol)' in t and 'Informant: the patient.' in t,t[-300:])
        await page.locator('#canvas').screenshot(path=QA+'/c160-genogram.png')
        async with page.expect_download() as d: await page.locator('[data-act="sharefile"], button:has-text("Share file")').first.click()
        dl=await d.value; await dl.save_as(QA+'/c160.genogram.json'); j=json.load(open(QA+'/c160.genogram.json'))['chart']; fa=[m for m in j['family'] if m.get('name')=='Ramon'][0]
        ok('the share file carries the new fields',fa.get('born')=='1964' and fa.get('med') is True and j.get('ptMed') is True and j.get('ptBorn')=='1992' and 'Informant' in j.get('notes',''),(fa,j.get('notes')))
        ok('Genogram: no console errors',not errs,errs[:3]); await ctx.close()
        ctx=await b.new_context(viewport={'width':1024,'height':1366},service_workers='block'); page=await ctx.new_page(); errs=[]
        page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errs.append(str(e))); page.on('dialog',lambda d: asyncio.ensure_future(d.accept()))
        await page.goto('http://localhost:8776/'); await page.click('#new'); await page.wait_for_selector('[data-sec]')
        await page.locator('[data-sec]',has_text='Family profile').first.click(); await page.wait_for_selector('[data-famadd]')
        await page.set_input_files('#geno-file',QA+'/c160.genogram.json'); await page.wait_for_timeout(700)
        t=await page.inner_text('#geno'); ok('PsychInterview: opens the file with years, medical illness and the note','b. 1964' in t and 'Medical illness' in t and 'Informant: the patient.' in t,t[-200:])
        ok('PsychInterview: new fields in the family card',await page.locator('input[data-fk="born"]').count()>=1 and await page.locator('button[data-fk="med"]').count()>=1 and await page.get_attribute('[data-genoflag="genoPtMed"]','aria-pressed')=='true')
        await page.fill('input[data-f="genoNotes"]','Seen with the mother.'); await page.wait_for_timeout(700); t=await page.inner_text('#geno'); ok('PsychInterview: the note redraws','Seen with the mother.' in t)
        ok('PsychInterview: no console errors',not errs,errs[:3]); await b.close()
asyncio.run(main()); [s.terminate() for s in srv]
bad=[r for r in res if not r[1]]; print(len(res)-len(bad),'of',len(res),'passed'); sys.exit(1 if bad else 0)
