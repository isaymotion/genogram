# End-to-end check of the Genogram app: python3 t_app.py <app folder> <out folder>
import sys, os, json, base64; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start
from playwright.sync_api import sync_playwright
root, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True); start(root, 8841)
errs=[]
def ok(c,m):
    if not c: errs.append(m)
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(w,h,scheme='light'):
        ctx=b.new_context(viewport={'width':w,'height':h}, has_touch=True, accept_downloads=True, color_scheme=scheme, service_workers='block')
        pg=ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type=='error' and errs.append(m.text)); return pg
    pg=page(390,844); U='http://127.0.0.1:8841/index.html'
    pg.goto(U); pg.wait_for_timeout(400); pg.screenshot(path=out+'/phone-home-empty.png', full_page=True)
    # build a family by hand
    pg.click('.hero [data-act="new"]'); pg.wait_for_timeout(300)
    pg.fill('[data-k="title"]','Cruz family'); pg.fill('[data-k="ptName"]','J.C.'); pg.fill('[data-k="ptAge"]','33'); pg.click('[data-set="ptSex"][data-v="Male"]')
    def add(rel, name, age, **kw):
        pg.click(f'[data-act="add"][data-rel="{rel}"]'); pg.wait_for_timeout(120)
        if rel=='': pg.select_option('.member.is-open [data-k="rel"]', kw.pop('pick')); pg.wait_for_timeout(120)
        pg.fill('.member.is-open [data-k="name"]', name); pg.fill('.member.is-open [data-k="age"]', age)
        for k,v in kw.items():
            if k=='tog': pg.click(f'.member.is-open [data-tog="{v}"]'); pg.wait_for_timeout(100)
            elif k in ('sex','of','relStatus'): pg.select_option(f'.member.is-open [data-k="{k}"]', v); pg.wait_for_timeout(100)
            else: pg.fill(f'.member.is-open [data-k="{k}"]', v)
    add('Sister','Ana','28'); add('Brother','Kuya','36'); add('Father','Greg','57', occ='welder', cond='Hypertension'); add('Mother','Carla','58', tog='withPt')
    add('', '', '', pick='Former partner', sex='Female', count='5'); add('', '', '', pick='Child (sex not stated)', count='7')
    add('Son','Bunso','8 mo'); add('Daughter','Ate','9', tog='twin')
    pg.wait_for_timeout(500)
    d=pg.evaluate("JSON.parse(localStorage.getItem('g:v1:charts'))"); c=list(d['byId'].values())[0]
    ok(c['title']=='Cruz family' and c['ptSex']=='Male' and len(c['family'])==8, 'saved data: '+json.dumps(c)[:200])
    ok(pg.inner_text('#pcount').startswith('19 people'), 'count: '+pg.inner_text('#pcount'))
    pg.screenshot(path=out+'/phone-family.png', full_page=True)
    ok(pg.evaluate('document.documentElement.scrollWidth')<=391, 'page is wider than the phone: '+str(pg.evaluate('document.documentElement.scrollWidth')))
    cid=c['id']; fa=[m for m in c['family'] if m['rel']=='Father'][0]['id']
    pg.goto(U+f'#/chart/{cid}/lines'); pg.wait_for_timeout(300)
    pg.click('[data-act="addl"]'); pg.select_option('[data-l="0"][data-k="type"]','Conflictual'); pg.select_option('[data-l="0"][data-k="b"]', fa); pg.wait_for_timeout(200)
    pg.screenshot(path=out+'/phone-lines.png', full_page=True)
    pg.goto(U+f'#/chart/{cid}/view'); pg.wait_for_timeout(400)
    svg=pg.inner_html('#canvas'); ok('J.C.' in svg and 'Cruz family (' in svg and '5 former partners' in svg and 'Conflictual' in svg, 'chart content')
    xs=pg.evaluate("(()=>{const t=[...document.querySelectorAll('#canvas text')]; const f=n=>{const e=t.find(x=>x.textContent===n); return e?+e.getAttribute('x'):null}; return [f('Kuya'),f('J.C.'),f('Ana'),f('Ate'),f('Bunso')]})()")
    ok(xs[0]<xs[1]<xs[2] and xs[3]<xs[4], 'age order '+str(xs))
    pg.screenshot(path=out+'/phone-view.png', full_page=True)
    for kind,ext in (('png','.png'),('pdf','.pdf')):
        with pg.expect_download() as dl: pg.click(f'[data-act="{kind}"]')
        f=os.path.join(out,'export'+ext); dl.value.save_as(f); ok(dl.value.suggested_filename.startswith('Cruz_family_') and os.path.getsize(f)>20000, kind+' export '+dl.value.suggested_filename)
    ok(open(os.path.join(out,'export.pdf'),'rb').read(5)==b'%PDF-', 'pdf header')
    # home with a chart, sample, duplicate, delete, search
    pg.goto(U+'#/'); pg.wait_for_timeout(300); pg.click('.hero [data-act="sample"]'); pg.wait_for_timeout(400)
    ok('Reyes' in pg.inner_html('#canvas'), 'sample'); pg.goto(U+'#/'); pg.wait_for_timeout(300)
    ok(pg.locator('.chartcard').count()==2, 'two charts'); pg.click('.chartcard [data-act="dup"]'); pg.wait_for_timeout(200); ok(pg.locator('.chartcard').count()==3, 'duplicate')
    pg.once('dialog', lambda x: x.accept()); pg.click('.chartcard [data-act="del"]'); pg.wait_for_timeout(200); ok(pg.locator('.chartcard').count()==2, 'delete')
    pg.screenshot(path=out+'/phone-home.png', full_page=True)
    for h in ('symbols','guide','about','whats-new','search/twins'):
        pg.goto(U+'#/'+h); pg.wait_for_timeout(250); ok(pg.locator('#main h1').count()==1, h)
        if h=='symbols': pg.screenshot(path=out+'/phone-symbols.png', full_page=True)
    ok(pg.locator('.result').count()>=1, 'search finds twins')
    store=pg.evaluate("localStorage.getItem('g:v1:charts')")
    # tablet, dark
    pg2=page(1180,820,'dark'); pg2.goto(U); pg2.evaluate("v=>localStorage.setItem('g:v1:charts', v)", store); pg2.reload(); pg2.wait_for_timeout(400)
    pg2.screenshot(path=out+'/tablet-home-dark.png', full_page=True)
    sid=[k for k,v in json.loads(store)['byId'].items() if 'Reyes' in v['title']][0]
    pg2.goto(U+f'#/chart/{sid}'); pg2.wait_for_timeout(300); pg2.click('.member__head >> nth=2'); pg2.wait_for_timeout(200); pg2.screenshot(path=out+'/tablet-family-dark.png', full_page=True)
    pg2.goto(U+f'#/chart/{sid}/view'); pg2.wait_for_timeout(300); pg2.screenshot(path=out+'/tablet-view-dark.png', full_page=True)
    pg3=page(1180,820); pg3.goto(U); pg3.evaluate("v=>localStorage.setItem('g:v1:charts', v)", store); pg3.goto(U+f'#/chart/{sid}/view'); pg3.reload(); pg3.wait_for_timeout(400); pg3.screenshot(path=out+'/tablet-view.png', full_page=True)
    b.close()
print('errors', errs)
