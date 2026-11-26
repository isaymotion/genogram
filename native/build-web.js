/* Copies the website (the repo root) into native/www for the phone app, and changes index.html so that
   js/native.js starts first: it restores saved genograms from the phone's own storage, then loads the app.
   Run: node build-web.js   (from native/). Nothing here changes the website itself. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = path.join(__dirname, 'www');
const COPY = ['index.html', 'css', 'js', 'data', 'fonts', 'icons'];
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
for (const f of COPY) fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
fs.copyFileSync(path.join(__dirname, 'js', 'native.js'), path.join(out, 'js', 'native.js'));
// Capacitor's JS runtime: the native bridge alone has no registerPlugin(), so without this js/native.js
// cannot reach the Share, Filesystem, Preferences or Face ID plugins (Save PDF / picture / file did nothing).
fs.copyFileSync(require.resolve('@capacitor/core/dist/capacitor.js'), path.join(out, 'js', 'capacitor.js'));
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
const re = /<script src="((?:data|js)\/[^"]+\.js)"><\/script>\s*/g, list = [];
html = html.replace(re, (m, src) => { list.push(src); return ''; });
if (!list.includes('js/app.js')) throw new Error('index.html: app scripts not found');
html = html.replace('<link rel="manifest" href="manifest.webmanifest">', '')
  .replace('</body>', '<script>window.GENO_SCRIPTS = ' + JSON.stringify(list) + ';</script>\n<script src="js/capacitor.js"></script>\n<script src="js/native.js"></script>\n</body>');
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('www ready: ' + list.length + ' app scripts load after js/native.js');
