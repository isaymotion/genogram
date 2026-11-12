import os
QA=os.environ.get('GENO_QA','/tmp/geno-qa'); os.makedirs(QA,exist_ok=True); os.makedirs(QA+'/pp',exist_ok=True)
import asyncio, sys, subprocess, time
from playwright.async_api import async_playwright
PORT=8767; srv=subprocess.Popen([sys.executable,'-I','-m','http.server',str(PORT),'--directory',sys.argv[1]],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(); ctx=await b.new_context(viewport={'width':1024,'height':1366},accept_downloads=True,service_workers='block'); await ctx.add_init_script("try{Object.defineProperty(Navigator.prototype,'share',{value:undefined,configurable:true});Object.defineProperty(Navigator.prototype,'canShare',{value:undefined,configurable:true});}catch(e){}"); page=await ctx.new_page(); errs=[]
        page.on('pageerror',lambda e: errs.append(str(e))); page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); page.on('dialog',lambda d: asyncio.ensure_future(d.accept()))
        await page.goto(f'http://localhost:{PORT}/'); await page.click('#new'); await page.wait_for_selector('[data-sec]')
        await page.locator('[data-sec]',has_text='Family profile').first.click(); await page.wait_for_selector('[data-famadd]')
        await page.set_input_files('#geno-file',QA+'/pp/stress.genogram.json'); await page.wait_for_timeout(700)
        print('members',await page.locator('.famcard').count(), 'not drawn' , 'Not drawn' in await page.inner_text('#geno'))
        await page.click('#pres'); await page.wait_for_selector('#pgo'); await page.click('[data-pf="pptx"]')
        await page.click('#pgo'); await page.wait_for_timeout(5000)
        btns=await page.locator('#ptools button').all_inner_texts(); print('buttons',btns)
        async with page.expect_download(timeout=30000) as d: await page.locator('#ptools button').first.click()
        dl=await d.value; await dl.save_as(QA+'/pp/case.pptx'); print('saved',dl.suggested_filename,'errors',errs[:3]); await b.close()
asyncio.run(main()); srv.terminate()
