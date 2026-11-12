# 1.5.0: household outline, deceased ages, newer relationship lines, in both apps. Usage: python3 -I t_150.py <genogram> <case-psychinterview>
import os, asyncio, json, sys, subprocess, time
QA=os.environ.get('GENO_QA','/tmp/geno-qa')
from playwright.async_api import async_playwright
G,P=sys.argv[1],sys.argv[2]; subprocess.run(['node',os.path.join(os.path.dirname(os.path.abspath(__file__)),'make_150_chart.js')],check=True)
srv=[subprocess.Popen([sys.executable,'-I','-m','http.server',str(p),'--directory',r],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL) for p,r in ((8773,G),(8774,P))]; time.sleep(1); res=[]
def ok(name,cond,extra=''): res.append((name,bool(cond))); print(('PASS ' if cond else 'FAIL ')+name+(' — '+str(extra) if extra and not cond else ''))
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block'); page=await ctx.new_page(); errs=[]
        page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errs.append(str(e)))
        await page.goto('http://localhost:8773/'); await page.wait_for_function('window.Geno')
        r=await page.evaluate("""(()=>{ const bad=[]; Geno.FAM_LINKS.forEach(t=>{ const p=Geno.linkPrims([[0,0],[2,0.5]],t.type,1); if(!p.length||p.some(q=>q.t!=='poly')) bad.push(t.type); if(!t.say) bad.push('say '+t.type); }); return [Geno.FAM_LINKS.length,bad]; })()""")
        ok('13 kinds of relationship line, all drawn as plain outlines',r==[13,[]],r)
        await page.evaluate("localStorage.setItem('g:v1:charts', JSON.stringify({order:['c1'],byId:{c1:Object.assign({id:'c1',updated:Date.now(),created:Date.now()}, JSON.parse(%s).chart)}}))" % json.dumps(open(QA+'/pp/c150.genogram.json').read()))
        await page.goto('http://localhost:8773/#/chart/c1/view'); await page.reload(); await page.wait_for_selector('#canvas svg'); await page.wait_for_timeout(300)
        t=await page.inner_text('#canvas'); ok('household outline and its key entry','Household: lives with the patient' in t and 'Lives with the patient' not in t.replace('Household: lives with the patient',''))
        ok('ages of people who died are on the chart','66' in t and '82' in t and '58' in t); ok('new lines named in the key',all(x in t for x in ['Physical abuse (arrow toward the person harmed)','Hostile','Caregiver (arrow toward the person cared for)','Neglect (arrow toward the person harmed)']))
        await page.locator('#canvas').screenshot(path=QA+'/c150-genogram.png')
        chip=page.locator('[data-k="household"], [data-tog="household"], button:has-text("Outline the household")').first; await chip.click(); await page.wait_for_timeout(400)
        st=await page.evaluate("JSON.parse(localStorage.getItem('g:v1:charts')).byId.c1.household"); t=await page.inner_text('#canvas'); ok('the switch turns the outline off and the houses come back',st is False and 'Household:' not in t and 'Lives with the patient' in t,st)
        ok('Genogram: no console errors',not errs,errs[:3]); await ctx.close()
        ctx=await b.new_context(viewport={'width':1024,'height':1366},service_workers='block'); page=await ctx.new_page(); errs=[]
        page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errs.append(str(e))); page.on('dialog',lambda d: asyncio.ensure_future(d.accept()))
        await page.goto('http://localhost:8774/'); await page.click('#new'); await page.wait_for_selector('[data-sec]')
        await page.locator('[data-sec]',has_text='Family profile').first.click(); await page.wait_for_selector('[data-famadd]')
        await page.set_input_files('#geno-file',QA+'/pp/c150.genogram.json'); await page.wait_for_timeout(700)
        t=await page.inner_text('#geno'); ok('PsychInterview: opens the file with the household outline on','Household: lives with the patient' in t and await page.get_attribute('[data-genoflag="genoHousehold"]','aria-pressed')=='true')
        o=await page.locator('select[data-lk="type"]').first.locator('option').all_inner_texts(); ok('PsychInterview: new lines offered',any('Caregiver of' in x for x in o) and any('Hostile' in x for x in o),o)
        await page.click('[data-genoflag="genoHousehold"]'); await page.wait_for_timeout(700); t=await page.inner_text('#geno'); ok('PsychInterview: switch turns the outline off','Household:' not in t)
        ok('PsychInterview: no console errors',not errs,errs[:3]); await b.close()
asyncio.run(main()); [s.terminate() for s in srv]
bad=[r for r in res if not r[1]]; print(len(res)-len(bad),'of',len(res),'passed'); sys.exit(1 if bad else 0)
