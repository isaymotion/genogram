// Usage: node check.js <repo>. Lists strings that need a Tagalog entry and CONTENT_TL keys never used.
var fs = require('fs'), vm = require('vm'), path = require('path');
var repo = process.argv[2], src = fs.readFileSync(path.join(repo, 'js/app.js'), 'utf8');
function readLit(s, i) { var q = s[i], j = i + 1, out = ''; while (j < s.length && s[j] !== q) { if (s[j] === '\\') { out += JSON.parse('"' + (s[j + 1] === "'" ? "'" : '\\' + s[j + 1]) + '"'); j += 2; } else out += s[j++]; } return { v: out, end: j + 1 }; }
var need = {}, i, re = /\btx([fh]?)\(/g, m;
function add(v, where) { if (v && /[A-Za-z]/.test(v)) need[v] = need[v] || where; }
while ((m = re.exec(src))) {
  var j = m.index + m[0].length, depth = 1, first = true, lits = [];
  while (j < src.length && depth > 0) {
    var ch = src[j];
    if (ch === "'" || ch === '"') { var L = readLit(src, j); lits.push({ v: L.v, first: first, before: src.slice(Math.max(0, j - 5), j), after: src.slice(L.end, L.end + 5) }); j = L.end; continue; }
    if (ch === '(' || ch === '{' || ch === '[') depth++;
    else if (ch === ')' || ch === '}' || ch === ']') depth--;
    else if (ch === ',' && depth === 1) first = false;
    j++;
  }
  lits.forEach(function (l) { if (m[1] && !l.first) return; if (/===\s*$/.test(l.before) || /^\s*===/.test(l.after)) return; add(l.v, 'tx' + m[1] + '('); });
}
function block(start) { var a = src.indexOf(start); if (a < 0) throw new Error('no ' + start); var b = src.indexOf('\n  ];', a); return src.slice(a, b); }
function allLits(s) { var out = [], k = 0; while (k < s.length) { if (s[k] === "'" || s[k] === '"') { var L = readLit(s, k); out.push(L.v); k = L.end; } else k++; } return out; }
var lib = block('var LIB = ['), r;
var rowRe = /\[\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'/g; while ((r = rowRe.exec(lib))) { add(r[1], 'LIB'); add(r[2], 'LIB'); }
var hRe = /\bh: '((?:[^'\\]|\\.)*)'/g; while ((r = hRe.exec(lib))) add(r[1], 'LIB');
var guide = block('var GUIDE = ['); rowRe.lastIndex = 0; while ((r = rowRe.exec(guide))) { add(r[1].replace(/\\'/g, "'"), 'GUIDE'); add(r[2].replace(/\\'/g, "'"), 'GUIDE'); }
var groups = block('var GROUPS = ['), lRe = /label: '((?:[^'\\]|\\.)*)'/g; while ((r = lRe.exec(groups))) add(r[1], 'GROUPS');
var nav = block('var NAV = ['); nav.split('\n').forEach(function (ln) { var x = /label: '((?:[^'\\]|\\.)*)'/.exec(ln); if (x && ln.indexOf('tkey') < 0) add(x[1], 'NAV'); });
var st = /var STEPS = (\[.*\]);/.exec(src); JSON.parse(st[1].replace(/'/g, '"')).forEach(function (s) { add(s[1], 'STEPS'); });
var hs = src.slice(src.indexOf('var steps = ['), src.indexOf("'#C2337A']];") + 12); var hl = allLits(hs); for (i = 0; i < hl.length; i += 4) { add(hl[i + 1], 'home steps'); add(hl[i + 2], 'home steps'); }
var tre = /TITLES\.\w+ = '([^']*)'/g; while ((r = tre.exec(src))) add(r[1], 'TITLES');
var q = /var QUICK = (\[.*\]);/.exec(src); JSON.parse(q[1].replace(/'/g, '"')).forEach(function (s) { add(s, 'QUICK'); });
// engine lists
var ctx = { window: {}, console: console }; ctx.self = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(repo, 'js/genogram-engine.js'), 'utf8'), ctx);
var G = ctx.window.Geno; if (!G) throw new Error('engine did not set window.Geno');
G.FAMILY_RELS.forEach(function (x) { add(x.rel, 'FAMILY_RELS'); add(x.g, 'FAMILY_RELS g'); });
G.FAM_COUPLE.forEach(function (x) { add(x, 'FAM_COUPLE'); });
(G.FAM_COUPLE_GROUPS || []).forEach(function (g) { add(g.h, 'FAM_COUPLE_GROUPS'); }); if (G.FAM_COUPLE_OLD) add('Older symbol', 'famCoupleOptions');
G.FAM_LINKS.forEach(function (x) { add(x.type, 'FAM_LINKS'); });
G.FAM_BOND.forEach(function (x) { add(x, 'FAM_BOND'); });
G.FAM_PREG.forEach(function (x) { add(x, 'FAM_PREG'); });
Object.keys(G.FAM_OF).forEach(function (k) { add(G.FAM_OF[k], 'FAM_OF'); });
// dictionary
var dctx = { window: {} }; vm.createContext(dctx); var dictPath = path.join(repo, 'data/content-tl.js');
var D = {}; if (fs.existsSync(dictPath)) { vm.runInContext(fs.readFileSync(dictPath, 'utf8'), dctx); D = dctx.window.CONTENT_TL || {}; }
var keys = Object.keys(need), missing = keys.filter(function (k) { return !Object.prototype.hasOwnProperty.call(D, k) || !D[k]; });
var unused = Object.keys(D).filter(function (k) { return !Object.prototype.hasOwnProperty.call(need, k); });
var phBad = Object.keys(D).filter(function (k) { var a = (k.match(/\{\w+\}/g) || []).sort().join(), b = (String(D[k]).match(/\{\w+\}/g) || []).sort().join(); return a !== b; });
if (process.argv[3] === '--list') { keys.forEach(function (k) { console.log(JSON.stringify(k) + '\t' + need[k]); }); process.exit(0); }
console.log('strings needing a translation: ' + keys.length + '; dictionary entries: ' + Object.keys(D).length);
console.log('missing: ' + missing.length); missing.forEach(function (k) { console.log('  MISSING [' + need[k] + '] ' + JSON.stringify(k)); });
console.log('unused keys: ' + unused.length); unused.forEach(function (k) { console.log('  UNUSED ' + JSON.stringify(k)); });
console.log('placeholder mismatches: ' + phBad.length); phBad.forEach(function (k) { console.log('  PLACEHOLDER ' + JSON.stringify(k)); });
process.exit(missing.length || phBad.length ? 1 : 0);
