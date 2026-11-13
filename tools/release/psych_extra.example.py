EXTRA = [
# 1.7.0: gender identity, positions moved by hand in the Genogram app
("""<label>Year of birth<input type="text" inputmode="numeric" maxlength="10" data-fam="${i}" data-fk="born" value""",
 """<label>Gender identity<select data-fam="${i}" data-fk="gid">${pick([['','Same as the symbol'], ...FAM_GID.map(o=>[o,o])], m.gid)}</select></label>
            <label>Year of birth<input type="text" inputmode="numeric" maxlength="10" data-fam="${i}" data-fk="born" value"""),
("""            <button class="chip" data-genoflag="genoPtMed" aria-pressed="${!!d.genoPtMed}">Medical illness</button>""",
 """            <button class="chip" data-genoflag="genoPtMed" aria-pressed="${!!d.genoPtMed}">Medical illness</button>
            <button class="chip" data-genoflag="genoPtTrans" aria-pressed="${d.genoPtGid==='Transgender'}">Transgender</button>"""),
("else if(b.dataset.genoflag){ const k=b.dataset.genoflag; d[k]=!d[k];","else if(b.dataset.genoflag==='genoPtTrans'){ d.genoPtGid = d.genoPtGid==='Transgender' ? '' : 'Transgender'; b.setAttribute('aria-pressed', d.genoPtGid==='Transgender'); refreshGeno(); touch(); }\n    else if(b.dataset.genoflag){ const k=b.dataset.genoflag; d[k]=!d[k];"),
("""        <label style="flex:1 1 100%">Note under the genogram""","""        ${d.genoPos && Object.keys(d.genoPos).length ? `<button class="chip" data-genoflag="genoPosOff" aria-pressed="${!!d.genoPosOff}">Genogram: ignore positions moved by hand</button>` : ''}
        <label style="flex:1 1 100%">Note under the genogram"""),
("'bond','preg','desc','born','died'], GENO_FLAGS","'bond','preg','desc','born','died','gid'], GENO_FLAGS"),
("ptBorn:str(d.genoPtBorn), notes:str(d.genoNotes), family:famMembers(d)","ptBorn:str(d.genoPtBorn), ptGid:str(d.genoPtGid), notes:str(d.genoNotes), pos:(d.genoPos && !d.genoPosOff) ? d.genoPos : undefined, family:famMembers(d)"),
("if(str(c.notes) && !str(d.genoNotes)) d.genoNotes = str(c.notes).slice(0,600);","if(str(c.notes) && !str(d.genoNotes)) d.genoNotes = str(c.notes).slice(0,600); if(FAM_GID.includes(c.ptGid)) d.genoPtGid = c.ptGid; if(c.pos && typeof c.pos==='object'){ d.genoPos = {}; Object.keys(c.pos).slice(0,200).forEach(k=>{ const v=+c.pos[k]; if(/^[A-Za-z0-9_-]{1,24}$/.test(k) && isFinite(v) && v) d.genoPos[k]=Math.max(-12, Math.min(12, v)); }); d.genoPosOff = false; }"),
]
