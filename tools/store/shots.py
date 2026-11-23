# Store screenshots of Genogram. Usage: python3 -I shots.py <genogram checkout> <out dir>
# Makes iPhone 6.9" (1320x2868), iPad 13" (2064x2752) and Android phone (1080x2160) sets.
import sys, os, subprocess, time
from playwright.sync_api import sync_playwright
app, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
link = os.path.join(app, '__shots')
if os.path.lexists(link): os.remove(link)
os.symlink(os.path.abspath(out), link)   # serve the raw shots for the store versions; removed at the end
srv = subprocess.Popen([sys.executable, '-I', '-m', 'http.server', '8791', '--directory', app], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
U = 'http://localhost:8791/'
SETS = {'iphone-6.9': (440, 956, 3, True), 'ipad-13': (1032, 1376, 2, True), 'android-phone': (360, 720, 3, True)}
THEME = sys.argv[3] if len(sys.argv) > 3 else 'light'
def shots(pg, name, d):
    def snap(tag): pg.wait_for_timeout(500); pg.screenshot(path=os.path.join(d, tag + '.png'))
    pg.goto(U + '#/'); pg.wait_for_selector('.samplerow'); pg.evaluate("localStorage.setItem('g:v1:introSeen','true')")
    pg.goto(U + '#/'); pg.wait_for_selector('.samplerow')
    # open Reyes (sample 0) and Dela Cruz (sample 2) so the home list shows two genograms
    pg.locator('.samplerow').nth(2).click(); pg.wait_for_selector('#canvas svg')
    pg.goto(U + '#/'); pg.wait_for_selector('.samplerow'); pg.locator('.samplerow').nth(0).click(); pg.wait_for_selector('#canvas svg')
    cid = pg.evaluate("JSON.parse(localStorage.getItem('g:v1:charts')).order[0]")
    pg.wait_for_timeout(400)
    if w < 700:   # phones: scroll so the whole chart sits under the top bar
        pg.evaluate("(()=>{var c=document.querySelector('#canvas');var top=document.querySelector('.topbar,header');var y=c.getBoundingClientRect().top+scrollY-(top?top.getBoundingClientRect().height:0)-8;scrollTo(0,y);var m=document.querySelector('main');if(m&&m.scrollHeight>m.clientHeight)m.scrollTop=y})()"); pg.wait_for_timeout(300)
    snap('1-genogram')
    pg.goto(U + '#/chart/' + cid); pg.wait_for_timeout(600); snap('2-family')
    pg.goto(U + '#/chart/' + cid + '/lines'); pg.wait_for_timeout(600); snap('3-relationships')
    pg.goto(U + '#/symbols'); pg.wait_for_timeout(600); snap('4-symbols')
    pg.goto(U + '#/'); pg.wait_for_timeout(600); snap('5-home')
    pg.goto(U + '#/privacy'); pg.wait_for_timeout(600); snap('6-privacy')
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (w, h, s, mob) in SETS.items():
        d = os.path.join(out, name); os.makedirs(d, exist_ok=True)
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=s, is_mobile=mob, has_touch=True, service_workers='block', color_scheme=THEME)
        ctx.add_init_script("window.Capacitor={isNativePlatform:function(){return true}}")   # phone-app wording (1.8.1)
        shots(ctx.new_page(), name, d); ctx.close()
    # Store versions: caption on the brand colour above the screen, same pixel size as the raw shot
    CAP = {'1-genogram': 'Standard genogram symbols, drawn for you', '2-family': 'Add the family in a few taps',
           '3-relationships': 'Mark how people relate', '4-symbols': 'Every symbol explained',
           '5-home': 'Five sample families to learn from', '6-privacy': 'Private: everything stays on your device'}
    for name, (w, h, s, mob) in SETS.items():
        d = os.path.join(out, name); fd = os.path.join(out, name + '-store'); os.makedirs(fd, exist_ok=True)
        pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=s)
        pg.goto(U + 'fonts/OFL.txt')   # same origin, so the bundled Fraunces font loads
        for tag, cap in CAP.items():
            src = 'http://localhost:8791/__shots/' + name + '/' + tag + '.png'
            capH = round(h * 0.17); scale = (h - capH - 18) / h
            pg.set_content('<html><head><style>@font-face{font-family:F;src:url(http://localhost:8791/fonts/fraunces-latin-wght-normal.woff2)}'
              'html,body{margin:0;width:%dpx;height:%dpx;overflow:hidden;background:linear-gradient(160deg,#1C676E,#10474C 70%%)}'
              '.c{height:%dpx;display:flex;align-items:center;justify-content:center;padding:0 %dpx;box-sizing:border-box;text-align:center;'
              'font-family:F,Georgia,serif;font-weight:600;color:#EFFAFB;font-size:%dpx;line-height:1.15}'
              'img{display:block;margin:0 auto;width:%dpx;border-radius:%dpx;box-shadow:0 10px 40px rgba(0,0,0,.35)}</style></head>'
              '<body><div class="c">%s</div><img src="%s"></body></html>' % (w, h, capH, round(w*.07), round(min(w, 1.4*h/2)*0.075), round(w*scale), round(w*0.05), cap, src))
            pg.wait_for_timeout(700); pg.screenshot(path=os.path.join(fd, tag + '.png'))
        pg.close()
    b.close()
srv.terminate(); os.remove(link); print('done', out)
