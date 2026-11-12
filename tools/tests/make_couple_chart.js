// A chart that uses every line pattern, colour, house and mark of the 1.3.0 couple kinds. Writes the same file as make_stress_chart.js,
// so t_pptx.py picks it up: node make_couple_chart.js [set]   (set 0..3: which seven kinds; default 1)
const G=require(require('path').resolve(__dirname,'../../../genogram/js/genogram-engine.js'));
const QA=process.env.GENO_QA||'/tmp/geno-qa'; require('fs').mkdirSync(QA+'/pp',{recursive:true});
const pickSets=[['Legal separation','Widowed','Nullity','Divorce','Engagement','Separated','Married'],
 ['Cohabitation','Engagement and cohabitation','Legal cohabitation and legal separation','Non-sentimental cohabitation and separation','Legal cohabitation','Cohabitation and separation','Engagement and separation'],
 ['Committed relationship','Casual relationship or dating','Temporary relation / one night stand','Love affair and separation','Rape / forced relationship','Other or unknown','Committed relationship and separation'],
 ['Non-sentimental cohabitation','Love affair','Casual relationship and separation','Legal cohabitation and separation in fact','Living together','Annulled / divorced','Married']];
const st=pickSets[+process.argv[2]||1];
const fam=[{id:'fa',name:'Ramon',rel:'Father',age:'62'},{id:'mo',name:'Lourdes',rel:'Mother',age:'58'},{id:'sf',name:'Dong',rel:'Stepfather',age:'50',relStatus:st[2]},
 {id:'h',name:'Marco',rel:'Husband',age:'36'},{id:'x',name:'Rey',rel:'Former partner',sex:'Male',age:'40',relStatus:st[3]},{id:'x2',name:'Jo',rel:'Former partner',sex:'Male',age:'41',relStatus:st[4]},{id:'x3',name:'Al',rel:'Former partner',sex:'Male',age:'44',relStatus:st[5]},
 {id:'k1',name:'Bea',rel:'Daughter',age:'8'},{id:'k3',name:'Baby',rel:'Son',age:'2',of:'x'},{id:'k4',name:'Cy',rel:'Son',age:'12',of:'x3'},
 {id:'b1',name:'Jun',rel:'Brother',age:'38'},{id:'b1w',name:'Tess',rel:"Sibling's spouse / partner",sex:'Female',age:'36',of:'b1',relStatus:st[6]},{id:'n1',name:'Kiko',rel:'Nephew',age:'9',of:'b1'}];
const chart={title:'Couples',ptName:'Lia',ptAge:'34',ptSex:'Female',ptCond:'MDD',ptFill:true,parentsRel:st[0],ptRel:st[1],byAge:true,family:fam,links:[{a:'pt',type:'Close',b:'h'}]};
require('fs').writeFileSync(QA+'/pp/stress.genogram.json',JSON.stringify({app:'genogram',kind:'chart',format:1,chart}));
require('fs').writeFileSync(QA+'/pp/couples.genogram.json',JSON.stringify({app:'genogram',kind:'chart',format:1,chart}));
console.log('wrote',QA+'/pp/stress.genogram.json',st.join(' | '));
