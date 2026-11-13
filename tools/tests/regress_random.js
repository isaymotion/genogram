// usage: node regress_random.js <old engine.js> <new engine.js>   -> "different: 0 of 300"
// old charts: identical apart from the age of people who died (now on a plate). Random charts without a deceased person's age must match exactly.
const A=require(require('path').resolve(process.argv[2])), B=require(require('path').resolve(process.argv[3]));
const strip=L=>JSON.stringify(L.prims.map(p=>{const q={...p}; delete q.id; return q;}));
const src=require('fs').readFileSync(require('path').join(__dirname,'regress.js'),'utf8'); const fam=eval(src.match(/const fam=(\[[\s\S]*?\]);\nconst mk/)[1]);
const links=['Close','Very close / enmeshed','Distant','Conflictual','Close but conflictual','Cut off / estranged','Abusive toward'], ids=['pt',...fam.map(m=>m.id)];
let bad=0, n=300; for(let i=0;i<n;i++){ const f=JSON.parse(JSON.stringify(fam)).filter(()=>Math.random()>0.2); f.forEach(m=>{ if(m.status==='Deceased') delete m.age; if(Math.random()<0.2) m.withPt=true; });
  const have=new Set(['pt',...f.map(m=>m.id)]); const L=[]; const k=Math.floor(Math.random()*2); for(let j=0;j<k;j++){ const a=ids[Math.floor(Math.random()*ids.length)], b=ids[Math.floor(Math.random()*ids.length)]; if(a!==b&&have.has(a)&&have.has(b)) L.push({a,b,type:links[Math.floor(Math.random()*7)]}); }
  const mk=()=>({agesex:'34 / Female',genoPtName:'Lia',parentsRel:'Separated',ptRel:'Married',family:JSON.parse(JSON.stringify(f)),famLinks:JSON.parse(JSON.stringify(L))});
  if(strip(A.layout(mk(),{}))!==strip(B.layout(mk(),{}))) bad++; }
console.log('different:',bad,'of',n);
