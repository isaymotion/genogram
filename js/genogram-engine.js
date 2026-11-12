/* Genogram engine: lays out a family and draws it as SVG. No page or storage code in this file.
   Shared with PsychInterview (isaymotion/case-psychinterview, index.html, the block that starts
   "Family members and genogram"). When the drawing changes in one app, copy that block here between
   the BEGIN/END marks so both apps draw the same genogram. Local addition: genoPtDead. */
(function () {
'use strict';
const str = v => v == null ? '' : String(v).trim();
function lc(s){ return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase()+s.slice(1) : s; }
function splitAgeSex(s){ const as=str(s).split(/\s*[\/,]\s*/); const out={}; if(as[0]) out.age=as[0].replace(/\s*(y\/?o|yrs?|years? old)\.?$/i,'').trim(); const sx=(as[1]||'').toLowerCase(); if(/^m/.test(sx)) out.sex='Male'; else if(/^f/.test(sx)) out.sex='Female'; return out; }
/* ===== BEGIN shared block ===== */
/* ---------- Family members and genogram ---------- */
/* role: where the person sits on the genogram. g: heading in the relationship picker. short: wording on the genogram. */
const FAMILY_RELS = [
  { rel:'Father', sex:'M', role:'father', g:'Parents' }, { rel:'Mother', sex:'F', role:'mother', g:'Parents' },
  { rel:'Stepfather', sex:'M', role:'stepfa', g:'Parents' }, { rel:'Stepmother', sex:'F', role:'stepmo', g:'Parents' },
  { rel:'Brother', sex:'M', role:'sib', g:'Siblings' }, { rel:'Sister', sex:'F', role:'sib', g:'Siblings' },
  { rel:'Paternal half-brother', sex:'M', role:'phalf', g:'Siblings', short:'Half-brother' }, { rel:'Paternal half-sister', sex:'F', role:'phalf', g:'Siblings', short:'Half-sister' },
  { rel:'Maternal half-brother', sex:'M', role:'mhalf', g:'Siblings', short:'Half-brother' }, { rel:'Maternal half-sister', sex:'F', role:'mhalf', g:'Siblings', short:'Half-sister' },
  { rel:'Husband', sex:'M', role:'spouse', g:'Spouse and partners' }, { rel:'Wife', sex:'F', role:'spouse', g:'Spouse and partners' }, { rel:'Partner', sex:'', role:'spouse', g:'Spouse and partners' },
  { rel:'Former husband', sex:'M', role:'exsp', g:'Spouse and partners' }, { rel:'Former wife', sex:'F', role:'exsp', g:'Spouse and partners' }, { rel:'Former partner', sex:'', role:'exsp', g:'Spouse and partners' },
  { rel:'Son', sex:'M', role:'child', g:'Children' }, { rel:'Daughter', sex:'F', role:'child', g:'Children' }, { rel:'Child (sex not stated)', sex:'', role:'child', g:'Children', short:'Child' },
  { rel:"Sibling's spouse / partner", sex:'', role:'sibsp', g:"Siblings' families", short:'Partner', say:"the spouse or partner of the patient's sibling" },
  { rel:'Nephew', sex:'M', role:'nib', g:"Siblings' families" }, { rel:'Niece', sex:'F', role:'nib', g:"Siblings' families" },
  { rel:"Child's spouse / partner", sex:'', role:'chsp', g:'Grandchildren', short:'Partner', say:"the spouse or partner of the patient's child" },
  { rel:'Grandson', sex:'M', role:'gchild', g:'Grandchildren' }, { rel:'Granddaughter', sex:'F', role:'gchild', g:'Grandchildren' },
  { rel:'Paternal grandfather', sex:'M', role:'pgf', g:'Grandparents' }, { rel:'Paternal grandmother', sex:'F', role:'pgm', g:'Grandparents' },
  { rel:'Maternal grandfather', sex:'M', role:'mgf', g:'Grandparents' }, { rel:'Maternal grandmother', sex:'F', role:'mgm', g:'Grandparents' },
  { rel:'Paternal uncle', sex:'M', role:'pside', g:'Aunts and uncles' }, { rel:'Paternal aunt', sex:'F', role:'pside', g:'Aunts and uncles' },
  { rel:'Maternal uncle', sex:'M', role:'mside', g:'Aunts and uncles' }, { rel:'Maternal aunt', sex:'F', role:'mside', g:'Aunts and uncles' },
  { rel:'Other relative', sex:'', role:'other', g:'Others' }, { rel:'Household member (not related)', sex:'', role:'other', g:'Others' }
];
const relInfo = r => FAMILY_RELS.find(x=>x.rel===r) || { rel:str(r), sex:'', role:'other' };
const famMembers = d => (Array.isArray(d.family) ? d.family : []).filter(m=>m && (str(m.name) || str(m.rel)));
const memberSex = m => relInfo(m.rel).sex || (m.sex==='Male' ? 'M' : m.sex==='Female' ? 'F' : 'U');
function patientSexOf(d){ const s=(/\b(f|female|babae)\b/i.test(str(d.agesex)) ? 'F' : /\b(m|male|lalaki)\b/i.test(str(d.agesex)) ? 'M' : 'U'); return s; }
const famCount = m => { const n=parseInt(str(m && m.count), 10); return n>1 ? n : 0; };
/* Who a member is attached to (roles that need a second person), and what the picker asks */
const FAM_OF = { child:'Other parent', sibsp:'Spouse / partner of', nib:'Child of', chsp:'Spouse / partner of', gchild:'Child of' };
const FAM_PARTNER_ROLES = ['spouse','exsp','sibsp','chsp','stepfa','stepmo'];
const FAM_TWIN_ROLES = ['sib','phalf','mhalf','child','nib','gchild'];
const FAM_COUPLE = ['Married','Living together','Separated','Annulled / divorced'];
/* Relationship lines between two people. dir: drawn from the first person toward the second. */
const FAM_LINKS = [
  { type:'Close', say:'close' }, { type:'Very close / enmeshed', say:'very close (enmeshed)' },
  { type:'Distant', say:'distant' }, { type:'Conflictual', say:'conflictual' },
  { type:'Close but conflictual', say:'close but conflictual' }, { type:'Cut off / estranged', say:'cut off (estranged)' },
  { type:'Abusive toward', say:'abusive toward', dir:true }
];
const FAM_ROLE_RANK = ['pgf','pgm','mgf','mgm','pside','father','stepmo','mother','stepfa','mside','phalf','sib','mhalf','sibsp','spouse','exsp','child','nib','chsp','gchild','other'];
/* Gives every family member a short permanent id, so links between members survive sorting and removing */
function famIds(d){
  const list = Array.isArray(d.family) ? d.family : [];
  const used = new Set(list.map(m=>m && m.id).filter(Boolean));
  list.forEach(m=>{ if(m && !m.id){ let id; do{ id='f'+Math.random().toString(36).slice(2,7); }while(used.has(id)); used.add(id); m.id=id; } });
  return list;
}
const famName = (d, id) => { if(id==='pt') return str(d.genoPtName)||'Patient'; const m=(d.family||[]).find(x=>x && x.id===id); return m ? (str(m.name)||str(m.rel)||'Family member') : ''; };
/* Relationship lines that still point at two different, existing people */
function famLinksOf(d){
  const ids = new Set(['pt', ...(Array.isArray(d.family)?d.family:[]).map(m=>m && m.id).filter(Boolean)]);
  return (Array.isArray(d.famLinks)?d.famLinks:[]).filter(l=>l && l.type && l.a && l.b && l.a!==l.b && ids.has(l.a) && ids.has(l.b));
}
const famLinkLine = (d, l) => { const t=FAM_LINKS.find(x=>x.type===l.type)||{say:lc(l.type)}; return t.dir ? famName(d,l.a)+' is '+t.say+' '+famName(d,l.b) : famName(d,l.a)+' and '+famName(d,l.b)+': '+t.say; };
/* Age in years from what was typed: "33", "8 mo", "1 y 6 mo", "3 weeks". null when it cannot be read. */
function ageYears(a){
  const s = str(a).toLowerCase(); if(!s) return null;
  let tot=0, hit=false;
  [[/(\d+(?:\.\d+)?)\s*(?:years?|yrs?|y\/?o|y)\b/,1],[/(\d+(?:\.\d+)?)\s*(?:months?|mos?)\b/,1/12],[/(\d+(?:\.\d+)?)\s*(?:weeks?|wks?)\b/,1/52],[/(\d+(?:\.\d+)?)\s*days?\b/,1/365]]
    .forEach(([re,k])=>{ const x=s.match(re); if(x){ tot+=parseFloat(x[1])*k; hit=true; } });
  if(hit) return tot;
  const v = parseFloat(s.replace(/[^\d.]/g,'')); return isNaN(v) ? null : v;
}
/* Oldest first; people whose age is not known keep their place in the list */
function famByAge(arr, age){
  const known = arr.filter(x=>age(x)!=null).sort((a,b)=>age(b)-age(a)); let k=0;
  return arr.map(x=>age(x)!=null ? known[k++] : x);
}
/* The member list regrouped by generation, each group oldest first */
function famSorted(d){
  const rank = m => { const i=FAM_ROLE_RANK.indexOf(relInfo(m.rel).role); return i<0 ? FAM_ROLE_RANK.length : i; };
  const list = (Array.isArray(d.family)?d.family:[]).filter(Boolean);
  const groups = {}; list.forEach(m=>{ (groups[rank(m)] = groups[rank(m)]||[]).push(m); });
  return Object.keys(groups).map(Number).sort((a,b)=>a-b).flatMap(k=>{ const g=groups[k], known=g.filter(m=>ageYears(m.age)!=null).sort((a,b)=>ageYears(b.age)-ageYears(a.age)); return [...known, ...g.filter(m=>ageYears(m.age)==null)]; });
}
/* One family member as a line of text: "AA (Father, 58): description" */
function memberLine(m){
  const n = famCount(m);
  const bits = [str(m.rel), n && n+' people', str(m.age) && (/^\d+$/.test(str(m.age)) ? str(m.age)+' y/o' : str(m.age)), str(m.occ), m.status==='Deceased' && 'deceased', m.psych && 'psychiatric condition'+(str(m.cond)?': '+str(m.cond):''), !m.psych && str(m.cond)].filter(Boolean);
  return (str(m.name)||'(no name)') + (bits.length ? ' ('+bits.join(', ')+')' : '') + (str(m.desc) ? ' — '+str(m.desc) : '');
}

/* Text sizes on the genogram are estimated, so the same layout works in the app, Word and slides */
const GENO_INK='1B2A3A', GENO_MID='4A5A6B', GENO_FILL='7C8796', GENO_GREEN='1E7B4F', GENO_RED='C0392B', GENO_SLATE='5B6B7D';
const genoCW = c => /[iljtfIr.,;:·'()\[\]! ]/.test(c) ? 0.31 : /[mwMW@]/.test(c) ? 0.84 : /[A-Z0-9]/.test(c) ? 0.64 : 0.5;
const genoTextW = (t, fs, bold) => [...String(t)].reduce((a,c)=>a+genoCW(c), 0)*fs*(bold?1.07:1);
function genoWrap(t, fs, maxW, maxLines, bold){
  const words = str(t).split(/\s+/).filter(Boolean), out=[]; let cur='';
  words.forEach(w=>{ const tryIt = cur ? cur+' '+w : w; if(cur && genoTextW(tryIt,fs,bold)>maxW){ out.push(cur); cur=w; } else cur=tryIt; });
  if(cur) out.push(cur);
  const cut = s => { while(s.length>2 && genoTextW(s+'…',fs,bold)>maxW) s=s.slice(0,-1); return s.replace(/[\s,;·]+$/,'')+'…'; };
  const fit = out.map(s=>genoTextW(s,fs,bold)>maxW ? cut(s) : s);
  if(fit.length>maxLines){ fit.length=maxLines; fit[maxLines-1]=cut(fit[maxLines-1]); }
  return fit;
}
const genoLabel = (t, n) => { t=str(t); return t.length>n ? t.slice(0,n-1)+'…' : t; };
const genoPlural = w => { const s=str(w); return /child$/i.test(s) ? s+'ren' : /wife$/i.test(s) ? s.slice(0,-2)+'ves' : s+'s'; };
/* What goes inside a symbol: the age, kept short ("8m", "1y6m") */
function genoAgeText(a){
  let s = str(a).replace(/\s*(y\/?o|yrs?|years? old)\.?$/i,'').trim();
  if(/[a-z]/i.test(s)) s = s.replace(/\s*(years?|yrs?)\b\.?/ig,'y').replace(/\s*(months?|mos?)\b\.?/ig,'m').replace(/\s*(weeks?|wks?)\b\.?/ig,'w').replace(/\s*days?\b\.?/ig,'d').replace(/\s+/g,'');
  return genoLabel(s, 6);
}
/* A relationship line drawn along a path (list of [x,y]); returns drawing pieces */
function genoLinkPrims(base, type, k){
  k = k||1;
  const W=0.036*k, out=[];
  // points every `step` along the path, each with the direction across the line
  const walk = step => { const pts=[]; let acc=0, next=0;
    for(let i=0;i<base.length-1;i++){ const [x1,y1]=base[i], [x2,y2]=base[i+1], L=Math.hypot(x2-x1,y2-y1); if(L<1e-6) continue; const ux=(x2-x1)/L, uy=(y2-y1)/L;
      while(next<=acc+L+1e-9){ const t=next-acc; pts.push({ x:x1+ux*t, y:y1+uy*t, nx:-uy, ny:ux, ux, uy, s:next }); next+=step; }
      acc+=L; }
    const [ex,ey]=base[base.length-1], lp=pts[pts.length-1]; if(lp && Math.hypot(ex-lp.x,ey-lp.y)>step*0.3) pts.push({ ...lp, x:ex, y:ey, s:acc });
    return pts; };
  const side = (pts, off) => pts.map(p=>[p.x+p.nx*off, p.y+p.ny*off]);
  const fine = walk(0.08*k);
  if(fine.length<2) return out;
  const zig = (pts, amp) => pts.map((p,i)=>{ const o = (i===0 || i===pts.length-1) ? 0 : (i%2 ? amp : -amp); return [p.x+p.nx*o, p.y+p.ny*o]; });
  const line = (pts, c, extra) => out.push({ t:'poly', pts, c, w:W, ...(extra||{}) });
  switch(type){
    case 'Close': line(side(fine,0.05*k), GENO_GREEN); line(side(fine,-0.05*k), GENO_GREEN); break;
    case 'Very close / enmeshed': [-0.08,0,0.08].forEach(o=>line(side(fine,o*k), GENO_GREEN)); break;
    case 'Distant': line(side(fine,0), GENO_SLATE, { dash:'dot' }); break;
    case 'Conflictual': line(zig(walk(0.1*k), 0.085*k), GENO_RED); break;
    case 'Close but conflictual': line(side(fine,0.13*k), GENO_GREEN); line(side(fine,-0.13*k), GENO_GREEN); line(zig(walk(0.1*k), 0.075*k), GENO_RED); break;
    case 'Cut off / estranged': { const tot=fine[fine.length-1].s, g=0.09*k, a=fine.filter(p=>p.s<=tot/2-g), b=fine.filter(p=>p.s>=tot/2+g);
      if(a.length>1 && b.length>1){ line(side(a,0), GENO_SLATE); line(side(b,0), GENO_SLATE);
        [a[a.length-1], b[0]].forEach(p=>line([[p.x+p.nx*0.15*k, p.y+p.ny*0.15*k],[p.x-p.nx*0.15*k, p.y-p.ny*0.15*k]], GENO_SLATE)); }
      else line(side(fine,0), GENO_SLATE, { dash:true });
      break; }
    case 'Abusive toward': { const z=walk(0.1*k), tot=z[z.length-1].s, body=z.filter(p=>p.s<=tot-0.2*k), e=z[z.length-1];
      const pts = body.length>1 ? zig(body, 0.085*k) : [[z[0].x,z[0].y]]; pts[pts.length-1]=[e.x-e.ux*0.18*k, e.y-e.uy*0.18*k]; line(pts, GENO_RED);
      const bx=e.x-e.ux*0.2*k, by=e.y-e.uy*0.2*k; out.push({ t:'poly', pts:[[e.x,e.y],[bx+e.nx*0.1*k,by+e.ny*0.1*k],[bx-e.nx*0.1*k,by-e.ny*0.1*k]], c:GENO_RED, w:W*0.6, fill:GENO_RED, close:true });
      break; }
    default: line(side(fine,0), GENO_SLATE);
  }
  return out;
}

/* Lays out the genogram in units of one symbol width: up to five generations (grandparents to grandchildren),
   step-parents and half-siblings, former partners, siblings' families, twins, grouped symbols (x5) and relationship lines.
   Returns { prims:[drawing pieces], nodes, lines, w, h, S, left:[names not drawn] } or null. opts.title adds a heading. */
function genogramLayout(d, opts){
  opts = opts||{};
  const raw = Array.isArray(d.family) ? d.family : [];
  const src = raw.map((m,i)=>({ m, id:(m && m.id) || 'i'+i })).filter(o=>o.m && (str(o.m.name) || str(o.m.rel)));
  if(!src.length) return null;
  const S=1, CG=1.3, DROP=0.6, INK=GENO_INK, N=src.length+1;
  const maxW = N<=7 ? 3.7 : N<=10 ? 3.0 : N<=15 ? 2.5 : 2.1, maxDet = N<=10 ? 5 : N<=15 ? 4 : 3;
  const FN=0.27, FD=0.215, LN=0.36, LD=0.285;
  const mkLabel = (name, parts) => {
    const lines = genoWrap(name, FN, maxW, 2, true).map(t=>({ t, b:true, fs:FN, lh:LN, c:INK }));
    let det = []; parts.filter(Boolean).forEach(p=>det.push(...genoWrap(p, FD, maxW, 3)));
    if(det.length>maxDet){ det.length=maxDet; det[maxDet-1]=det[maxDet-1].replace(/…?$/,'…'); }
    det.forEach(t=>lines.push({ t, fs:FD, lh:LD, c:GENO_MID }));
    return { lines, w:Math.max(0, ...lines.map(l=>genoTextW(l.t,l.fs,l.b))), h:lines.reduce((a,l)=>a+l.lh, 0) };
  };
  const left = [];
  const mk = o => { const m=o.m, ri=relInfo(m.rel);
    return { id:o.id, m, role:ri.role, sex:memberSex(m), dead:m.status==='Deceased', fill:!!m.psych, pt:false, count:famCount(m), home:!!m.withPt, twin:!!m.twin,
      age:genoAgeText(m.age), ageY:ageYears(m.age), name:str(m.name), cond:str(m.cond), relText:ri.short||str(m.rel), x:0, y:0, gen:0, side:'', partners:[], kids:{} }; };
  const all = src.map(mk), by = role => all.filter(n=>n.role===role);
  const nameOf = n => n.name || n.relText || 'family member';
  const drop = (n, why) => { left.push(nameOf(n)); n.out=true; };
  const pAge = splitAgeSex(d.agesex).age||'';
  const P = { id:'pt', role:'pt', sex:patientSexOf(d), dead:!!d.genoPtDead, fill:d.genoPtFill!==false, pt:true, count:0, home:false, twin:false, age:genoAgeText(pAge), ageY:ageYears(pAge),
    name:str(d.genoPtName)||'Patient', cond:str(d.genoPtCond), relText:'Index patient', x:0, y:0, gen:0, side:'', partners:[], kids:{} };
  const order = arr => d.genoByAge===false ? arr : famByAge(arr, n=>n.ageY);
  const couples = [], fams = [];
  const addPartner = (h, p, status) => { if(h.partners.length>=2){ drop(p); return false; } h.partners.push(p); p.cstatus=status||''; p.partnerOf=h; return true; };
  const addKid = (h, pid, k) => { (h.kids[pid] = h.kids[pid]||[]).push(k); };
  const ghost = sex => ({ id:'g'+Math.random().toString(36).slice(2,6), ghost:true, role:'ghost', sex, dead:false, fill:false, pt:false, count:0, age:'', inner:'?', ageY:null, name:'', cond:'', relText:'', x:0, y:0, gen:0, side:'', partners:[], kids:{}, lab:{ lines:[], w:0, h:0 } });

  /* --- who belongs to whom --- */
  const fa = by('father')[0]||null, mo = by('mother')[0]||null;
  by('father').slice(1).forEach(drop); by('mother').slice(1).forEach(drop);
  const sibs = by('sib'), phalf = fa ? by('phalf') : [], mhalf = mo ? by('mhalf') : [];
  if(!fa) by('phalf').forEach(drop); if(!mo) by('mhalf').forEach(drop);
  const heads0 = [...phalf, ...sibs, ...mhalf];
  // the patient's partners: current first, then former
  let firstSpouse = true;
  [...by('spouse'), ...by('exsp')].forEach(p=>{ const st = str(p.m.relStatus) || (p.role==='exsp' ? 'Separated' : firstSpouse ? str(d.ptRel) : ''); if(p.role==='spouse') firstSpouse=false; addPartner(P, p, st); });
  // children hang from the patient and the chosen (or first) partner
  by('child').forEach(k=>{ const of=str(k.m.of), p = P.partners.find(x=>x.id===of) || (of==='none' ? null : P.partners[0]) || null; addKid(P, p ? p.id : '', k); });
  // siblings' partners and children; children's partners and children
  const attach = (list, hosts, partner) => list.forEach(n=>{ const of=str(n.m.of), h = hosts.find(x=>x.id===of) || (hosts.length===1 ? hosts[0] : null);
    if(!h || h.out){ drop(n); return; }
    if(partner) addPartner(h, n, str(n.m.relStatus)); else n.host=h; });
  attach(by('sibsp'), heads0, true); attach(by('chsp'), by('child'), true);
  attach(by('nib'), heads0, false); attach(by('gchild'), by('child'), false);
  [...by('nib'), ...by('gchild')].forEach(k=>{ if(k.host) addKid(k.host, k.host.partners[0] ? k.host.partners[0].id : '', k); });
  // step-parents sit beside the parent they are with; half-siblings hang between them
  let stepmo = fa ? by('stepmo')[0]||null : null, stepfa = mo ? by('stepfa')[0]||null : null;
  by('stepmo').filter(n=>n!==stepmo).forEach(drop); by('stepfa').filter(n=>n!==stepfa).forEach(drop);
  if(phalf.length && !stepmo) stepmo = ghost('F');
  if(mhalf.length && !stepfa) stepfa = ghost('M');
  if(stepmo) stepmo.cstatus = stepmo.ghost ? '' : str(stepmo.m.relStatus);
  if(stepfa) stepfa.cstatus = stepfa.ghost ? '' : str(stepfa.m.relStatus);
  const ps = fa ? by('pside') : [], ms = mo ? by('mside') : [];
  if(!fa) by('pside').forEach(drop); if(!mo) by('mside').forEach(drop);
  const gpOf = (role, ok) => { const l=by(role); l.slice(ok?1:0).forEach(drop); return ok ? l[0]||null : null; };
  const pgf=gpOf('pgf',fa), pgm=gpOf('pgm',fa), mgf=gpOf('mgf',mo), mgm=gpOf('mgm',mo);
  by('other').forEach(drop);

  /* --- labels --- */
  const everyone = [P, ...all.filter(n=>!n.out)];
  everyone.forEach(n=>{
    let rel = n.relText;
    if((n.role==='sibsp' || n.role==='chsp') && n.partnerOf) rel = 'Partner of '+nameOf(n.partnerOf);
    if(n.count) rel = n.count+' '+lc(genoPlural(n.role==='sibsp'||n.role==='chsp' ? 'Partner' : n.relText));
    const occ = n.pt ? str(d.genoPtOcc) : str(n.m.occ);
    const bold = n.name || (rel.charAt(0).toUpperCase()+rel.slice(1));
    n.lab = mkLabel(bold, [[n.name ? rel : '', occ].filter(Boolean).join(' · '), n.cond]);
    n.inner = n.count ? '×'+n.count : n.age;
  });
  const hw = n => n.side || n.ghost ? S/2+0.3 : Math.max(S/2+0.42, n.lab.w/2+0.16);
  const apart = (a, b) => Math.max(S+CG, 2*Math.max(hw(a), hw(b)));   // a couple: far enough apart that the line to their children clears both labels

  /* --- a person with partners and children, laid out left to right; x is the left edge of each symbol --- */
  const shift = (ns, dx) => ns.forEach(n=>{ n.x+=dx; });
  function unit(h, gen){
    h.gen=gen; const sub=[h], [p1,p2]=h.partners; let pl=null, pr=null;
    if(p1 && p2){ pr=p1; pl=p2; } else if(p1){ if(h.first && !h.last) pl=p1; else pr=p1; }
    [pl,pr].forEach(p=>{ if(p){ p.gen=gen; sub.push(p); couples.push({ a:h, b:p, status:p.cstatus }); } });
    let cur=0;
    const blk = (ks, p) => { if(!ks || !ks.length) return null; const heads=order(ks), b=block(heads, gen+1); shift(b.nodes, cur);
      const r={ c:cur+(b.c0+b.c1)/2, x0:cur, x1:cur+b.w }; cur+=b.w; sub.push(...b.nodes); fams.push({ a:h, b:p, kids:heads }); return r; };
    const BL=blk(pl && h.kids[pl.id], pl), B0=blk(h.kids[''], null), BR=blk(pr && h.kids[pr.id], pr);
    if(B0) h.side = !pr ? 'R' : !pl ? 'L' : '';
    const dL = pl ? apart(h, pl) : 0, dR = pr ? apart(h, pr) : 0;
    const hc = B0 ? B0.c : BL&&BR ? BL.x1 : BR ? BR.c-dR/2 : BL ? BL.c+dL/2 : 0;
    h.x = hc-S/2;
    if(pr) pr.x = Math.max(hc+dR, BR ? 2*BR.c-hc : -1e9) - S/2;
    if(pl) pl.x = Math.min(hc-dL, BL ? 2*BL.c-hc : 1e9) - S/2;
    const top = [h, pl, pr].filter(Boolean);
    let lo = Math.min(0, ...top.map(n=>n.x+S/2-hw(n))), hi = Math.max(cur, ...top.map(n=>n.x+S/2+hw(n)));
    if(h.side==='R') hi = Math.max(hi, h.x+S+0.3+h.lab.w);
    if(h.side==='L') lo = Math.min(lo, h.x-0.3-h.lab.w);
    shift(sub, -lo);
    return { nodes:sub, w:hi-lo, hc:hc-lo };
  }
  function block(heads, gen){
    let cur=0; const nodes=[], cs=[];
    heads.forEach((h,i)=>{ h.first = i===0; h.last = i===heads.length-1; const u=unit(h, gen); shift(u.nodes, cur); cs.push(cur+u.hc); cur+=u.w; nodes.push(...u.nodes); });
    return { nodes, w:cur, c0:cs[0], c1:cs[cs.length-1] };
  }
  const cx = n => n.x+S/2;

  /* --- the patient's generation and everyone below --- */
  const full = order([...sibs, P]);
  let cur = 0; const placed = [];
  const put = heads => { if(!heads.length) return null; const b=block(heads, 0); shift(b.nodes, cur); const r={ c:cur+(b.c0+b.c1)/2 }; cur+=b.w; placed.push(...b.nodes); return r; };
  const phHeads = order(phalf), mhHeads = order(mhalf);
  const BP = put(phHeads), BF = put(full), BM = put(mhHeads);

  /* --- parents, step-parents, aunts and uncles, grandparents --- */
  const up = [];
  const setGen = (n, g) => { if(n){ n.gen=g; up.push(n); } };
  [fa, mo, stepmo, stepfa, ...ps, ...ms].forEach(n=>setGen(n, -1)); [pgf, pgm, mgf, mgm].forEach(n=>setGen(n, -2));
  const lone = (fa||mo) && !(fa&&mo) ? (fa||mo) : null;
  if(lone) lone.side = (lone===mo && stepfa) ? 'L' : (lone===fa && stepmo) ? 'R' : 'R';
  const single = (a, b) => { const n = a&&b ? null : a||b; if(n) n.side='R'; };
  if(fa && (pgf||pgm)) single(pgf, pgm); if(mo && (mgf||mgm)) single(mgf, mgm);
  const coupleAt = (a, b, mid) => { if(a && b){ const dd=apart(a, b); a.x=mid-dd/2-S/2; b.x=mid+dd/2-S/2; } else if(a||b){ (a||b).x = mid-S/2; } };
  let extra = 0;
  for(let it=0; it<40; it++){
    if(fa && mo){ const dd=apart(fa, mo)+extra; fa.x=BF.c-dd/2-S/2; mo.x=BF.c+dd/2-S/2; } else if(lone) lone.x = BF.c-S/2;
    if(stepmo) stepmo.x = cx(fa)-apart(fa, stepmo) - S/2;
    if(stepfa) stepfa.x = cx(mo)+apart(mo, stepfa) - S/2;
    let edge = fa ? cx(stepmo||fa)-hw(stepmo||fa) : 0;
    for(let i=ps.length-1; i>=0; i--){ ps[i].x = edge-hw(ps[i])-S/2; edge = cx(ps[i])-hw(ps[i]); }
    edge = mo ? cx(stepfa||mo)+hw(stepfa||mo) : 0;
    ms.forEach(n=>{ n.x = edge+hw(n)-S/2; edge = cx(n)+hw(n); });
    if(fa) coupleAt(pgf, pgm, ((ps.length ? cx(ps[0]) : cx(fa)) + cx(fa))/2);
    if(mo) coupleAt(mgf, mgm, (cx(mo) + (ms.length ? cx(ms[ms.length-1]) : cx(mo)))/2);
    const ext = (n, dir) => cx(n) + dir*(n.side==='R' && dir>0 ? S/2+0.3+n.lab.w : hw(n));
    const pR = Math.max(...[pgf,pgm].filter(Boolean).map(n=>ext(n,1)), -1e9), mL = Math.min(...[mgf,mgm].filter(Boolean).map(n=>ext(n,-1)), 1e9);
    if(pR <= mL || !fa || !mo) break;
    extra += (pR - mL) + 0.05;
  }
  if(fa && mo) couples.push({ a:fa, b:mo, status:str(d.parentsRel) });
  if(stepmo) couples.push({ a:stepmo, b:fa, status:stepmo.cstatus });
  if(stepfa) couples.push({ a:mo, b:stepfa, status:stepfa.cstatus });
  if(pgf && pgm) couples.push({ a:pgf, b:pgm, status:'' });
  if(mgf && mgm) couples.push({ a:mgf, b:mgm, status:'' });
  if(fa && mo) fams.push({ a:fa, b:mo, kids:full }); else if(lone) fams.push({ a:lone, b:null, kids:full }); else if(full.length>1) fams.push({ a:null, b:null, kids:full });
  if(phHeads.length) fams.push({ a:fa, b:stepmo, kids:phHeads, lift:0.22 });
  if(mhHeads.length) fams.push({ a:mo, b:stepfa, kids:mhHeads, lift:0.22 });
  if(fa && (pgf||pgm||ps.length)) fams.push({ a:pgf||pgm, b:pgf&&pgm ? pgm : null, kids:[...ps, fa], bare:!(pgf||pgm) });
  if(mo && (mgf||mgm||ms.length)) fams.push({ a:mgf||mgm, b:mgf&&mgm ? mgm : null, kids:[mo, ...ms], bare:!(mgf||mgm) });

  /* --- rows: each generation is as tall as its longest label --- */
  const nodes = [...new Set([...up, ...placed])];
  const gens = [...new Set(nodes.map(n=>n.gen))].sort((a,b)=>a-b), rowY = {};
  let y = 0;
  gens.forEach(g=>{ rowY[g]=y; const labH = Math.max(0.3, ...nodes.filter(n=>n.gen===g && !n.side).map(n=>n.lab.h)); y += S + 0.12 + labH + 0.48 + DROP; });
  nodes.forEach(n=>{ n.y = rowY[n.gen]; });

  /* --- drawing pieces --- */
  const prims = [], lines = [];
  const L = (x1,y1,x2,y2,dash) => { const l={ t:'line', x1, y1, x2, y2, dash:!!dash, c:INK, w:0.045 }; lines.push(l); prims.push(l); };
  const used = { couple:new Set(), link:new Set() };
  const coupled = new Set();
  // where the line to the children leaves a couple: midway, moved if a long label is in the way
  const dropX = (l, r) => { const mid=(l.x+S+r.x)/2, half = n => n.side || n.ghost ? S/2 : Math.max(S/2, n.lab.w/2), lo=cx(l)+half(l)+0.12, hi=cx(r)-half(r)-0.12;
    return lo>hi ? (lo+hi)/2 : Math.max(lo, Math.min(hi, mid)); };
  couples.forEach(({a,b,status})=>{
    const l = a.x<b.x ? a : b, r = l===a ? b : a, yy = l.y+S/2, mx = dropX(l, r);
    L(l.x+S, yy, r.x, yy, status==='Living together');
    const slash = off => L(mx+off-0.13, yy+0.24, mx+off+0.13, yy-0.24);
    if(status==='Separated') slash(0);
    if(status==='Annulled / divorced'){ slash(-0.09); slash(0.09); }
    used.couple.add(FAM_COUPLE.includes(status) ? status : 'Married');
    coupled.add(a.id+'|'+b.id); coupled.add(b.id+'|'+a.id);
  });
  const isTwin = (n, kids, i) => n.twin || (n.pt && [kids[i-1], kids[i+1]].some(o=>o && o.twin && o.ageY!=null && o.ageY===n.ageY));
  let anyTwin = false;
  fams.forEach(({a,b,kids,bare,lift})=>{
    if(!kids.length) return;
    const ys = kids[0].y-DROP-(lift||0), xs = kids.map(cx);
    let lo = Math.min(...xs), hi = Math.max(...xs), top = null;
    if(a && b && !bare){ const l = a.x<b.x ? a : b, r = l===a ? b : a; top = { x:dropX(l, r), y:l.y+S/2 }; }
    else if(a && !bare) top = { x:cx(a), y:a.side ? a.y+S : a.y+S+0.14+a.lab.h };
    if(top){ lo=Math.min(lo, top.x); hi=Math.max(hi, top.x); L(top.x, top.y, top.x, ys); }
    // twins: lines that meet at one point on the bar
    const done = new Set();
    for(let i=0; i<kids.length; i++){ if(!isTwin(kids[i], kids, i)) continue; let j=i; while(j+1<kids.length && isTwin(kids[j+1], kids, j+1) && kids[j+1].ageY===kids[i].ageY) j++;
      if(j>i){ const mx=(cx(kids[i])+cx(kids[j]))/2; for(let q=i; q<=j; q++){ L(mx, ys, cx(kids[q]), kids[q].y); done.add(kids[q]); } anyTwin=true; i=j; } }
    if(hi-lo > 0.001) L(lo, ys, hi, ys);
    kids.forEach(n=>{ if(!done.has(n)) L(cx(n), ys, cx(n), n.y); });
  });
  // arrow pointing at the patient, from the upper left
  { const tx=P.x-0.07, ty=P.y-0.07; L(tx-0.42, ty-0.36, tx, ty); L(tx, ty, tx-0.25, ty-0.07); L(tx, ty, tx-0.1, ty-0.24); }

  // relationship lines between two people
  const byId = {}; nodes.forEach(n=>{ byId[n.id]=n; });
  const linkOut = [];
  famLinksOf(d).forEach(l=>{
    const A=byId[l.a], B=byId[l.b]; if(!A || !B){ linkOut.push(famLinkLine(d,l)); return; }
    let base;
    if(A.gen===B.gen){
      const lft = A.x<B.x ? A : B, rgt = lft===A ? B : A, between = nodes.some(n=>n.gen===A.gen && n!==A && n!==B && cx(n)>cx(lft) && cx(n)<cx(rgt));
      if(!between){ const yy = lft.y+S/2 + (coupled.has(A.id+'|'+B.id) ? 0.27 : 0); base = [[lft.x+S+0.06, yy],[rgt.x-0.06, yy]]; }
      else { const x1=cx(lft)+0.24, x2=cx(rgt)-0.24, y0=lft.y-0.05, yc=y0-0.42; base=[];
        for(let i=0;i<=28;i++){ const t=i/28, u=1-t; base.push([u*u*u*x1+3*u*u*t*(x1+0.25)+3*u*t*t*(x2-0.25)+t*t*t*x2, u*u*u*y0+3*u*u*t*yc+3*u*t*t*yc+t*t*t*y0]); } }
      if(lft!==A) base.reverse();
    } else {
      const dx=cx(B)-cx(A), dy=(B.y+S/2)-(A.y+S/2), len=Math.hypot(dx,dy)||1, ux=dx/len, uy=dy/len;
      const edge = n => (n.sex==='F' ? 0.5 : n.sex==='U' ? 0.5/(Math.abs(ux)+Math.abs(uy)) : 0.5/Math.max(Math.abs(ux),Math.abs(uy))) + 0.07;
      // from the upper person the line starts under their label, so it never runs through the words
      const end = (n, sgn) => { const ex=cx(n)+sgn*ux*edge(n), ey=n.y+S/2+sgn*uy*edge(n);
        if(sgn*uy<=0.05 || n.side || !n.lab.lines.length) return [ex, ey];
        const yb=n.y+S+0.12+n.lab.h+0.07, t=(yb-(n.y+S/2))/(sgn*uy), xb=cx(n)+sgn*ux*t;
        return Math.abs(xb-cx(n)) <= n.lab.w/2+0.12 ? [xb, yb] : [ex, ey]; };
      base = [end(A, 1), end(B, -1)];
    }
    prims.push(...genoLinkPrims(base, l.type)); used.link.add(l.type);
  });

  // symbols and labels
  const symbol = (n, x, y, s, name) => {
    const g = n.sex==='F' ? 'ellipse' : n.sex==='U' ? 'diamond' : 'rect', k=s/S, sw=0.05*k, len=String(n.inner||'').length;
    prims.push({ t:'shape', g, x, y, w:s, h:s, fill:n.fill ? GENO_FILL : 'FFFFFF', c:n.ghost ? GENO_SLATE : INK, sw:n.ghost ? sw*0.7 : sw, dash:!!n.ghost, name:name||'Member',
      text: n.inner ? { t:String(n.inner), fs:(len<=2 ? 0.37 : len===3 ? 0.31 : len===4 ? 0.25 : 0.2)*k, b:true, c:n.fill ? 'FFFFFF' : n.ghost ? GENO_SLATE : INK } : null });
    if(n.pt){ const o=0.12*k; prims.push({ t:'shape', g, x:x+o, y:y+o, w:s-2*o, h:s-2*o, fill:'', c:n.fill ? 'FFFFFF' : INK, sw:sw*0.8, name:'Patient' }); }
    if(n.dead){ const e=0.11*k; [[x-e,y-e,x+s+e,y+s+e],[x+s+e,y-e,x-e,y+s+e]].forEach(q=>prims.push({ t:'line', x1:q[0], y1:q[1], x2:q[2], y2:q[3], c:INK, w:0.045*k })); }
  };
  const house = (x, y, k) => prims.push({ t:'poly', pts:[[x,y+0.11*k],[x+0.13*k,y],[x+0.26*k,y+0.11*k],[x+0.26*k,y+0.24*k],[x,y+0.24*k]], c:GENO_SLATE, w:0.02*k, fill:GENO_SLATE, close:true });
  nodes.forEach(n=>{
    symbol(n, n.x, n.y, S, nameOf(n));
    if(n.home) house(n.x+S-0.04, n.y-0.2, 1);
    if(!n.lab.lines.length) return;
    if(n.side==='R') prims.push({ t:'text', a:'s', x:n.x+S+0.2, y:n.y+S/2-n.lab.h/2, w:n.lab.w, h:n.lab.h, lines:n.lab.lines });
    else if(n.side==='L') prims.push({ t:'text', a:'e', x:n.x-0.2, y:n.y+S/2-n.lab.h/2, w:n.lab.w, h:n.lab.h, lines:n.lab.lines });
    else prims.push({ t:'text', a:'m', x:cx(n), y:n.y+S+0.12, w:n.lab.w, h:n.lab.h, lines:n.lab.lines, bg:true });
  });

  /* --- size, then the heading and the key --- */
  const box = p => p.t==='line' ? [Math.min(p.x1,p.x2), Math.min(p.y1,p.y2), Math.max(p.x1,p.x2), Math.max(p.y1,p.y2)]
    : p.t==='poly' ? [Math.min(...p.pts.map(q=>q[0])), Math.min(...p.pts.map(q=>q[1])), Math.max(...p.pts.map(q=>q[0])), Math.max(...p.pts.map(q=>q[1]))]
    : p.t==='shape' ? [p.x, p.y, p.x+p.w, p.y+p.h]
    : [p.a==='m' ? p.x-p.w/2 : p.a==='e' ? p.x-p.w : p.x, p.y, p.a==='m' ? p.x+p.w/2 : p.a==='e' ? p.x : p.x+p.w, p.y+p.h];
  let bx = prims.map(box), minX = Math.min(...bx.map(b=>b[0]))-0.45, maxX = Math.max(...bx.map(b=>b[2]))+0.45, minY = Math.min(...bx.map(b=>b[1]))-0.3, maxY = Math.max(...bx.map(b=>b[3]))+0.3;

  // the key lists only what this genogram uses
  const key = [];
  const has = f => nodes.some(f);
  const mini = (o) => ({ sex:'M', dead:false, fill:false, pt:false, ghost:false, inner:'', ...o });
  if(has(n=>n.sex==='M')) key.push({ w:0.34, text:'Male', draw:(x,y)=>symbol(mini({}), x, y, 0.34, 'Key') });
  if(has(n=>n.sex==='F')) key.push({ w:0.34, text:'Female', draw:(x,y)=>symbol(mini({sex:'F'}), x, y, 0.34, 'Key') });
  if(has(n=>n.sex==='U')) key.push({ w:0.34, text:'Sex not stated', draw:(x,y)=>symbol(mini({sex:'U'}), x, y, 0.34, 'Key') });
  key.push({ w:0.34, text:'Patient (double outline, arrow)', draw:(x,y)=>symbol(mini({sex:P.sex, pt:true}), x, y, 0.34, 'Key') });
  if(has(n=>n.fill)) key.push({ w:0.34, text:'Psychiatric / substance use disorder', draw:(x,y)=>symbol(mini({fill:true}), x, y, 0.34, 'Key') });
  if(has(n=>n.dead)) key.push({ w:0.34, text:'Deceased', draw:(x,y)=>symbol(mini({dead:true}), x+0.03, y+0.03, 0.28, 'Key') });
  if(has(n=>n.count)) key.push({ w:0.34, text:'×n: several people in one symbol', draw:(x,y)=>symbol(mini({sex:'U', inner:'×n'}), x, y, 0.34, 'Key') });
  if(has(n=>n.ghost)) key.push({ w:0.34, text:'Parent not listed', draw:(x,y)=>symbol(mini({sex:'U', ghost:true, inner:'?'}), x, y, 0.34, 'Key') });
  if(has(n=>n.home)) key.push({ w:0.34, text:'Lives with the patient', draw:(x,y)=>house(x+0.04, y+0.05, 1) });
  const seg = (x,y,dash) => prims.push({ t:'line', x1:x, y1:y+0.17, x2:x+0.62, y2:y+0.17, c:INK, w:0.04, dash:!!dash });
  const sl = (x,y,off) => prims.push({ t:'line', x1:x+0.31+off-0.07, y1:y+0.3, x2:x+0.31+off+0.07, y2:y+0.04, c:INK, w:0.04 });
  if(used.couple.has('Married')) key.push({ w:0.62, text:'Married / partners', draw:(x,y)=>seg(x,y) });
  if(used.couple.has('Living together')) key.push({ w:0.62, text:'Living together', draw:(x,y)=>seg(x,y,true) });
  if(used.couple.has('Separated')) key.push({ w:0.62, text:'Separated', draw:(x,y)=>{ seg(x,y); sl(x,y,0); } });
  if(used.couple.has('Annulled / divorced')) key.push({ w:0.62, text:'Annulled / divorced', draw:(x,y)=>{ seg(x,y); sl(x,y,-0.06); sl(x,y,0.06); } });
  if(anyTwin) key.push({ w:0.62, text:'Twins', draw:(x,y)=>{ [[0.12],[0.5]].forEach(q=>prims.push({ t:'line', x1:x+0.31, y1:y+0.03, x2:x+q[0], y2:y+0.31, c:INK, w:0.04 })); } });
  FAM_LINKS.forEach(t=>{ if(used.link.has(t.type)) key.push({ w:0.62, text:t.type==='Abusive toward' ? 'Abusive (arrow toward the person harmed)' : t.type, draw:(x,y)=>prims.push(...genoLinkPrims([[x,y+0.17],[x+0.62,y+0.17]], t.type, 0.72)) }); });
  key.push({ w:0, text:'Age inside each symbol', draw:()=>{} });
  const KF=0.2, KR=0.42, itemW = it => (it.w ? it.w+0.14 : 0) + genoTextW(it.text, KF) + 0.45;
  const colW = Math.max(...key.map(itemW));
  let W = maxX-minX;
  const cols0 = Math.max(1, Math.min(4, key.length, Math.floor(Math.max(W, 8.6)/colW)));
  const side = opts.key==='right';   // slides are wide: the key can sit beside the genogram instead of under it
  const cols = side ? 1 : cols0, kw = cols*colW + 0.3, rows = Math.ceil(key.length/cols), kh = rows*KR + 0.3;
  if(!side && kw+0.6 > W){ const add=(kw+0.6-W)/2; minX-=add; maxX+=add; W=maxX-minX; }
  const kx = side ? maxX+0.1 : minX+(W-kw)/2, ky = side ? Math.max(minY+0.3, (minY+maxY-kh)/2) : maxY+0.1;
  if(side){ maxX = kx+kw+0.45; W = maxX-minX; }
  prims.push({ t:'shape', g:'rect', r:0.1, x:kx, y:ky, w:kw, h:kh, fill:'F7F9FB', c:'9AA5B1', sw:0.022, name:'Key' });
  key.forEach((it,i)=>{ const col=Math.floor(i/rows), row=i%rows, x=kx+0.25+col*colW, yy=ky+0.15+row*KR;
    it.draw(x, yy);
    prims.push({ t:'text', a:'s', x:x+(it.w ? it.w+0.14 : 0), y:yy+0.03, w:genoTextW(it.text,KF), h:0.28, lines:[{ t:it.text, fs:KF, lh:0.28, c:INK }] }); });
  maxY = Math.max(maxY, ky+kh+0.3);
  if(opts.title){ const tw=genoTextW(opts.title, 0.36, true); if(tw+0.8 > W){ const add=(tw+0.8-W)/2; minX-=add; maxX+=add; }
    minY -= 0.75; prims.push({ t:'text', a:'m', x:(minX+maxX)/2, y:minY+0.2, w:tw, h:0.5, lines:[{ t:opts.title, b:true, fs:0.36, lh:0.5, c:INK }] }); }

  // move everything so the picture starts at 0,0
  prims.forEach(p=>{ if(p.t==='line'){ p.x1-=minX; p.x2-=minX; p.y1-=minY; p.y2-=minY; } else if(p.t==='poly'){ p.pts=p.pts.map(q=>[q[0]-minX, q[1]-minY]); } else { p.x-=minX; p.y-=minY; } });
  nodes.forEach(n=>{ n.x-=minX; n.y-=minY; });
  const notDrawn = [...new Set(left)];
  return { prims, nodes, lines, w:maxX-minX, h:maxY-minY, S, left:notDrawn, linksLeft:linkOut };
}
/* The genogram as an SVG picture (used in the app, and turned into a PNG for Word) */
function genogramSVG(G, unit){
  if(!G) return '';
  const u = unit||56, X = v => (v*u).toFixed(1), col = c => '#'+c;
  const esc = t => String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const dash = (d, w) => d==='dot' ? ` stroke-dasharray="${(w*u*0.4).toFixed(1)} ${(0.11*u).toFixed(1)}" stroke-linecap="round"` : d ? ` stroke-dasharray="${(0.16*u).toFixed(1)} ${(0.12*u).toFixed(1)}"` : '';
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${X(G.w)} ${X(G.h)}" width="${X(G.w)}" height="${X(G.h)}" font-family="Arial, Helvetica, sans-serif"><rect width="100%" height="100%" fill="#ffffff"/>`;
  G.prims.forEach(p=>{
    if(p.t==='line') out += `<line x1="${X(p.x1)}" y1="${X(p.y1)}" x2="${X(p.x2)}" y2="${X(p.y2)}" stroke="${col(p.c)}" stroke-width="${X(p.w)}"${dash(p.dash, p.w)}/>`;
    else if(p.t==='poly') out += `<${p.close?'polygon':'polyline'} points="${p.pts.map(q=>X(q[0])+','+X(q[1])).join(' ')}" fill="${p.fill?col(p.fill):'none'}" stroke="${col(p.c)}" stroke-width="${X(p.w)}" stroke-linejoin="round"${dash(p.dash, p.w)}/>`;
    else if(p.t==='shape'){
      const at = `fill="${p.fill?col(p.fill):'none'}" stroke="${col(p.c)}" stroke-width="${X(p.sw)}"${dash(p.dash, p.sw)}`;
      if(p.g==='ellipse') out += `<ellipse cx="${X(p.x+p.w/2)}" cy="${X(p.y+p.h/2)}" rx="${X(p.w/2)}" ry="${X(p.h/2)}" ${at}/>`;
      else if(p.g==='diamond') out += `<polygon points="${X(p.x+p.w/2)},${X(p.y)} ${X(p.x+p.w)},${X(p.y+p.h/2)} ${X(p.x+p.w/2)},${X(p.y+p.h)} ${X(p.x)},${X(p.y+p.h/2)}" ${at}/>`;
      else out += `<rect x="${X(p.x)}" y="${X(p.y)}" width="${X(p.w)}" height="${X(p.h)}"${p.r?` rx="${X(p.r)}"`:''} ${at}/>`;
      if(p.text) out += `<text x="${X(p.x+p.w/2)}" y="${X(p.y+p.h/2+p.text.fs*0.36)}" font-size="${X(p.text.fs)}" font-weight="700" text-anchor="middle" fill="${col(p.text.c)}">${esc(p.text.t)}</text>`;
    }
    else if(p.t==='text'){ let y=p.y; const anchor = p.a==='m' ? 'middle' : p.a==='e' ? 'end' : 'start';
      p.lines.forEach(l=>{ if(p.bg){ const tw=genoTextW(l.t,l.fs,l.b)+0.14; out += `<rect x="${X(p.x-tw/2)}" y="${X(y)}" width="${X(tw)}" height="${X(l.lh)}" fill="#ffffff"/>`; }
        out += `<text x="${X(p.x)}" y="${X(y+l.lh/2+l.fs*0.36)}" font-size="${X(l.fs)}" font-weight="${l.b?700:400}" text-anchor="${anchor}" fill="${col(l.c)}">${esc(l.t)}</text>`; y+=l.lh; }); }
  });
  return out + '</svg>';
}
/* ===== END shared block ===== */
const api = { layout:genogramLayout, svg:genogramSVG, linkPrims:genoLinkPrims, FAMILY_RELS, FAM_LINKS, FAM_COUPLE, FAM_OF, FAM_PARTNER_ROLES, FAM_TWIN_ROLES,
  relInfo, famIds, famSorted, famCount, famLinksOf, famLinkLine, famName, ageYears, memberSex, INK:GENO_INK, FILL:GENO_FILL, SLATE:GENO_SLATE };
if (typeof window !== 'undefined') window.Geno = api;
if (typeof module !== 'undefined') module.exports = api;
})();
