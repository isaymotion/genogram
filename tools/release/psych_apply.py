#!/usr/bin/env python3
"""Re-appliable PsychInterview side of a genogram release: run on a clean, up-to-date checkout.
usage: psych_apply.py <case-psychinterview> <genogram> <changelog title> <item>|<item>..."""
import sys, re, subprocess, pathlib, datetime
P, G, title, items = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4].split('|')
subprocess.run([sys.executable, G+'/tools/sync_engine.py', str(P)], check=True, stdout=subprocess.DEVNULL)
f=P/'index.html'; s=f.read_text(encoding='utf-8')
def rep(a,b):
    global s
    if b in s: return          # already there
    assert s.count(a)==1, (a[:70], s.count(a)); s=s.replace(a,b)
import os
EXTRA_FILE = os.environ.get('PSYCH_EXTRA', '/tmp/psych_extra.py')   # a python file defining EXTRA = [(old, new), ...] for THIS release only
if os.path.exists(EXTRA_FILE):
    ns={}; exec(open(EXTRA_FILE,encoding='utf-8').read(), ns)
    for a,b in ns['EXTRA']: rep(a,b)
# version: one more than whatever is live now
sw=P/'sw.js'; t=sw.read_text(); cur=int(re.search(r"const CACHE = PREFIX \+ 'v(\d+)'", t).group(1)); new=cur+1
sw.write_text(t.replace(f"PREFIX + 'v{cur}'", f"PREFIX + 'v{new}'"))
nid=int(re.search(r"const CHANGELOG=\[\s*\{id:(\d+)", s).group(1))+1
entry="    {id:%d, v:'v%d', date:'%s', title:%r, items:[\n%s]},\n" % (nid, new, datetime.date.today().isoformat(), title, ',\n'.join("      ['%s',%r]" % tuple(i.split('::',1)) for i in items))
s=s.replace("  const CHANGELOG=[\n", "  const CHANGELOG=[\n"+entry, 1)
f.write_text(s, encoding='utf-8'); print('PsychInterview now v%d (changelog id %d)' % (new, nid))
