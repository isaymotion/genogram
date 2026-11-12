# 1.7.0: move people by hand, gender identity, pets and others, in both apps. Usage: python3 -I t_170.py <genogram> <case-psychinterview>
import os, asyncio, json, sys, subprocess, time
QA=os.environ.get('GENO_QA','/tmp/geno-qa'); os.makedirs(QA,exist_ok=True)
from playwright.async_api import async_playwright
G,P=sys.argv[1],sys.argv[2]
srv=[subprocess.Popen([sys.executable,'-I','-m','http.server',str(p),'--directory',r],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL) for p,r in ((8777,G),(8778,P))]; time.sleep(1); res=[]
def ok(name,cond,extra=''): res.append((name,bool(cond))); print(('PASS ' if cond else 'FAIL ')+name+(' — '+str(extra) if extra and not cond else ''))
chart={'title':'Checks 1.7.0','ptName':'Alex','ptAge':'24','ptSex':'Male','ptGid':'Transgender','parentsRel':'Married','family':[{'id':'fa','name':'Ben','rel':'Father','age':'60'},{'id':'mo','name':'Ana','rel':'Mother','age':'58'},
 {'id':'z','name':'Kai','rel':'Sister','age':'20','gid':'Non-binary'},{'id':'h','name':'Luis','rel':'Husband','age':'25'},{'id':'p','name':'Bantay','rel':'Pet','age':'5','withPt':True},{'id':'y','name':'Rosa','rel':'Household member (not related)','sex':'Female','age':'50'},{'id':'o','name':'Boy','rel':'Other relative','sex':'Male','age':'66'}],'links':[{'a':'pt','type':'Close','b':'p'}]}
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(); ctx=await b.new_context(viewport={'width':1100,'height':900},service_workers='block',accept_downloads=True); page=await ctx.new_page(); errs=[]
        page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errs.append(str(e))); page.on('dialog',lambda d: asyncio.ensure_future(d.accept()))
        U='http://localhost:8777/'; await page.goto(U)
        await page.evaluate("localStorage.setItem('g:v1:introSeen','true'); localStorage.setItem('g:v1:charts', JSON.stringify({order:['c1'],byId:{c1:Object.assign({id:'c1',updated:new Date().toISOString(),created:new Date().toISOString(),byAge:true,showTitle:true}, %s)}}))" % json.dumps(chart))
        await page.goto(U+'#/chart/c1/view'); await page.reload(); await page.wait_for_selector('#canvas svg'); t=await page.inner_text('main')
        ok('pet, household member and other relative are drawn','Not drawn' not in t and all(x in t for x in ['Bantay','Rosa','Boy','Pet']))
        ok('gender identity in the key','Transgender (small symbol: sex assigned at birth)' in t and 'Non-binary (small diamond)' in t)
        ok('same-sex couple drawn','Luis' in t and 'Husband' in t)
        pos=lambda: page.evaluate("(()=>{var c=JSON.parse(localStorage.getItem('g:v1:charts')).byId.c1;return c.pos||{}})()")
        await page.click('[data-act="movemode"]'); await page.wait_for_selector('#move-hint')
        box=await page.evaluate("""(()=>{var L=Geno.layout({agesex:'24 / Male',genoPtName:'Alex',genoPtGid:'Transgender',parentsRel:'Married',family:%s,famLinks:[]},{title:'x'}); var n=L.nodes.filter(function(n){return n.id==='z'})[0]; var r=document.getElementById('canvas').getBoundingClientRect(), svg=document.querySelector('#canvas svg').getBoundingClientRect(); var k=svg.width/L.w; return [svg.left+(n.x+0.5)*k, svg.top+(n.y+0.5)*k, k]; })()""" % json.dumps(chart['family']))
        await page.mouse.move(box[0],box[1]); await page.mouse.down(); await page.mouse.move(box[0]+box[2]*0.6,box[1],steps=4); await page.mouse.move(box[0]+box[2]*1.0,box[1],steps=4); await page.mouse.up(); await page.wait_for_timeout(600)
        p=await pos(); ok('dragging a person saves a sideways shift',abs(p.get('z',0)-1.0)<0.3,p)
        ok('“Reset positions” appears',await page.locator('[data-act="resetpos"]').count()==1); await page.locator('#canvas').screenshot(path=QA+'/c170-genogram.png')
        async with page.expect_download() as d: await page.locator('[data-act="sharefile"], button:has-text("Share file")').first.click()
        dl=await d.value; await dl.save_as(QA+'/c170.genogram.json'); j=json.load(open(QA+'/c170.genogram.json'))['chart']; ok('the share file carries positions and gender identity','z' in j.get('pos',{}) and j.get('ptGid')=='Transgender' and [m for m in j['family'] if m['id']=='z'][0].get('gid')=='Non-binary')
        await page.click('[data-act="resetpos"]'); await page.wait_for_timeout(400); p=await pos(); ok('reset clears them',p=={},p)
        await page.goto(U+'#/chart/c1'); await page.wait_for_selector('.member'); ok('gender identity on the index person form',await page.input_value('select[data-k="ptGid"]')=='Transgender')
        ok('Genogram: no console errors',not errs,errs[:3]); await ctx.close()
        ctx=await b.new_context(viewport={'width':1024,'height':1366},service_workers='block'); page=await ctx.new_page(); errs=[]
        page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errs.append(str(e))); page.on('dialog',lambda d: asyncio.ensure_future(d.accept()))
        await page.goto('http://localhost:8778/'); await page.click('#new'); await page.wait_for_selector('[data-sec]')
        await page.locator('[data-sec]',has_text='Family profile').first.click(); await page.wait_for_selector('[data-famadd]')
        await page.set_input_files('#geno-file',QA+'/c170.genogram.json'); await page.wait_for_timeout(700); t=await page.inner_text('#geno')
        ok('PsychInterview: draws the pet, the others and gender identity','Not drawn' not in t and 'Bantay' in t and 'Rosa' in t and 'Non-binary (small diamond)' in t and 'Transgender (small symbol' in t,t[-300:])
        ok('PsychInterview: positions kept, with a chip to ignore them',await page.locator('[data-genoflag="genoPosOff"]').count()==1 and await page.locator('select[data-fk="gid"]').count()>=1 and await page.get_attribute('[data-genoflag="genoPtTrans"]','aria-pressed')=='true')
        o=await page.locator('select[data-fk="rel"]').first.locator('option').all_inner_texts(); ok('PsychInterview: Pet is offered','Pet' in o)
        ok('PsychInterview: no console errors',not errs,errs[:3]); await b.close()
asyncio.run(main()); [s.terminate() for s in srv]
bad=[r for r in res if not r[1]]; print(len(res)-len(bad),'of',len(res),'passed'); sys.exit(1 if bad else 0)
