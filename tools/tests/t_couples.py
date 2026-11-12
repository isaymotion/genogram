# The 1.3.0 couple kinds, in both apps. Usage: python3 -I t_couples.py <genogram repo> <case-psychinterview repo>   (run make_couple_chart.js first)
import os, asyncio, json, sys, subprocess, time
QA=os.environ.get('GENO_QA','/tmp/geno-qa'); os.makedirs(QA+'/pp',exist_ok=True)
from playwright.async_api import async_playwright
G,P=sys.argv[1],sys.argv[2]
subprocess.run(['node',os.path.join(os.path.dirname(os.path.abspath(__file__)),'make_couple_chart.js'),'1'],check=True,stdout=subprocess.DEVNULL)
srv=[subprocess.Popen([sys.executable,'-I','-m','http.server',str(p),'--directory',r],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL) for p,r in ((8771,G),(8772,P))]; time.sleep(1)
res=[]
def ok(name,cond,extra=''): res.append((name,bool(cond))); print(('PASS ' if cond else 'FAIL ')+name+(' — '+str(extra) if extra and not cond else ''))
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch()
        # ---- engine facts, from the page
        ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block'); page=await ctx.new_page(); errs=[]
        page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errs.append(str(e)))
        page.on('dialog',lambda d: asyncio.ensure_future(d.accept()))
        await page.goto('http://localhost:8771/'); await page.wait_for_function('window.Geno')
        n=await page.evaluate("[Geno.FAM_COUPLE.length, [].concat.apply([],Geno.FAM_COUPLE_GROUPS.map(g=>g.o)).length, Geno.FAM_COUPLE.every(k=>Geno.FAM_COUPLE_KIND[k])]")
        ok('25 kinds offered, 27 understood, each with a drawing rule',n==[27,25,True],n)
        kinds=await page.evaluate("""(()=>{ const bad=[]; Geno.FAM_COUPLE.forEach(k=>{ const L=Geno.layout({agesex:'30 / Female',genoPtName:'A',ptRel:k,parentsRel:k,family:[{id:'h',rel:'Husband',name:'B'},{id:'f',rel:'Father'},{id:'m',rel:'Mother'},{id:'k',rel:'Son',age:'3'}]},{});
            L.prims.forEach(p=>{ if(!(p.t==='line'||p.t==='poly'||p.t==='text'||(p.t==='shape'&&['rect','ellipse','diamond'].includes(p.g)))) bad.push(k+':'+p.t); if(![false,true,undefined,'dot','sparse','dashdot','dashdotdot','short'].includes(p.dash)) bad.push(k+' dash '+p.dash); });
            if(k!=='Married' && !L.prims.some(p=>p.t==='text' && p.lines.some(l=>l.t===k))) bad.push('no key for '+k); const s=Geno.svg(L,56); if(s.indexOf('NaN')>=0||s.indexOf('undefined')>=0) bad.push('svg '+k); }); return bad; })()""")
        ok('every kind draws with pieces the slides understand, and is named in the key',kinds==[],kinds[:5])
        # ---- Genogram app: open the couples chart, check the pickers
        await page.evaluate("localStorage.setItem('g:v1:charts', JSON.stringify({order:['c1'],byId:{c1:Object.assign({id:'c1',updated:Date.now(),created:Date.now()}, JSON.parse(%s).chart)}}))" % json.dumps(open(QA+'/pp/couples.genogram.json').read()))
        await page.goto('http://localhost:8771/#/chart/c1'); await page.reload(); await page.wait_for_selector('select[data-k="parentsRel"]')
        v=[await page.input_value('select[data-k="parentsRel"]'), await page.input_value('select[data-k="ptRel"]')]; ok('parents and spouse pickers show the saved kinds',v==['Cohabitation','Engagement and cohabitation'],v)
        g=await page.eval_on_selector_all('select[data-k="parentsRel"] optgroup','els=>els.map(e=>[e.label,e.children.length])'); ok('five groups of 6, 3, 7, 7 and 2',[x[1] for x in g]==[6,3,7,7,2],g)
        await page.select_option('select[data-k="parentsRel"]','Legal separation'); await page.wait_for_timeout(500)
        st=await page.evaluate("JSON.parse(localStorage.getItem('g:v1:charts')).byId.c1.parentsRel"); ok('a new choice is saved',st=='Legal separation',st)
        await page.goto('http://localhost:8771/#/chart/c1/view'); await page.wait_for_selector('#canvas svg'); await page.wait_for_timeout(400)
        svg=await page.inner_html('#canvas'); ok('blue lines, a house and the key on the chart',('#1F4FB0' in svg) and ('Legal separation' in svg) and ('Cohabitation and separation' in svg) and svg.count('<polygon')>=3)
        await page.locator('#canvas').screenshot(path=QA+'/couples-genogram.png')
        await page.goto('http://localhost:8771/#/symbols'); await page.wait_for_selector('.lib__row'); t=await page.inner_text('main')
        ok('symbols page lists the new lines',all(x in t for x in ['Nullity','Widowed','Non-sentimental cohabitation','Love affair','Other or unknown'])); await page.screenshot(path=QA+'/couples-symbols.png',full_page=True)
        # an older chart keeps its older value in the picker
        await page.evaluate("(()=>{var c=JSON.parse(localStorage.getItem('g:v1:charts')); c.byId.c1.parentsRel='Living together'; localStorage.setItem('g:v1:charts',JSON.stringify(c));})()")
        await page.goto('http://localhost:8771/#/chart/c1'); await page.reload(); await page.wait_for_selector('select[data-k="parentsRel"]')
        ok('an older value stays selected',await page.input_value('select[data-k="parentsRel"]')=='Living together' and await page.locator('select[data-k="parentsRel"] option[value="Living together"]').count()==1)
        ok('Genogram: no console errors',not errs,errs[:3]); await ctx.close()
        # ---- PsychInterview
        ctx=await b.new_context(viewport={'width':1024,'height':1366},service_workers='block'); page=await ctx.new_page(); errs=[]
        page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errs.append(str(e))); page.on('dialog',lambda d: asyncio.ensure_future(d.accept()))
        await page.goto('http://localhost:8772/'); await page.click('#new'); await page.wait_for_selector('[data-sec]')
        await page.locator('[data-sec]',has_text='Family profile').first.click(); await page.wait_for_selector('[data-famadd]')
        ok('PsychInterview: parents and spouse are lists',await page.locator('select[data-f="parentsRel"] option').count()==26 and await page.locator('select[data-f="ptRel"]').count()==1)
        await page.set_input_files('#geno-file',QA+'/pp/couples.genogram.json'); await page.wait_for_timeout(700)
        v=[await page.input_value('select[data-f="parentsRel"]'), await page.input_value('select[data-f="ptRel"]')]; ok('PsychInterview: opens a Genogram file with the new kinds',v==['Cohabitation','Engagement and cohabitation'],v)
        await page.select_option('select[data-f="parentsRel"]','Nullity'); await page.wait_for_timeout(700)
        txt=await page.inner_text('#geno'); ok('PsychInterview: genogram redraws after a new choice',('Nullity' in txt) and ('Engagement and cohabitation' in txt),txt[-300:])
        n=await page.locator('select[data-fk="relStatus"]').first.locator('optgroup').count(); ok('PsychInterview: a partner card has the grouped list',n>=5,n)
        await page.locator('#geno').screenshot(path=QA+'/couples-psych.png')
        ok('PsychInterview: no console errors',not errs,errs[:3]); await b.close()
asyncio.run(main()); [s.terminate() for s in srv]
bad=[r for r in res if not r[1]]; print(len(res)-len(bad),'of',len(res),'passed'); sys.exit(1 if bad else 0)
