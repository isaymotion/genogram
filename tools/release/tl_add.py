import json,sys
def add(note, tl, p='data/content-tl.js'):
    s=open(p,encoding='utf-8').read(); i=s.rindex('};'); body=s[:i].rstrip()
    s=body+',\n  /* '+note+' */\n'+',\n'.join('  %s: %s' % (json.dumps(k,ensure_ascii=False), json.dumps(v,ensure_ascii=False)) for k,v in tl)+'\n};\n'
    open(p,'w',encoding='utf-8').write(s)
def edit(p, pairs):
    s=open(p,encoding='utf-8').read()
    for a,b in pairs:
        assert s.count(a)==1, (p, a[:70], s.count(a)); s=s.replace(a,b)
    open(p,'w',encoding='utf-8').write(s)
def bump(old,new,title,items):
    edit('data/app-meta.js',[("version: '%s'"%old,"version: '%s'"%new)]); edit('sw.js',[("PREFIX + '%s'"%old,"PREFIX + '%s'"%new)])
    import datetime
    e="  {\n    version: '%s',\n    date: '%s',\n    title: %s,\n    items: [\n%s\n    ]\n  },\n" % (new, datetime.date.today().isoformat(), json.dumps(title,ensure_ascii=False), ',\n'.join("      { type: '%s', text: %s }" % (t, json.dumps(x,ensure_ascii=False)) for t,x in items))
    edit('data/changelog.js',[("window.APP_CHANGELOG = [\n","window.APP_CHANGELOG = [\n"+e)])
