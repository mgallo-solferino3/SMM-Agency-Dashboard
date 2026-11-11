// Prepara la versione web in public/ (servita dal Worker): l'interfaccia dell'app desktop (renderer/)
// con web/api.js al posto di preload.js + main.js.
//   node scripts/build-web.mjs
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'cloud', 'public');
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['app.js', 'icons.js', 'fonts']) cpSync(join(root, 'renderer', f), join(out, f), { recursive: true });
for (const f of ['api.js', 'web.css']) cpSync(join(root, 'web', f), join(out, f));
cpSync(join(root, 'build', 'icon.png'), join(out, 'icon.png'));

// Sul desktop il tema scelto lo applica Electron tramite prefers-color-scheme; nel browser no:
// i blocchi @media (prefers-color-scheme: dark) diventano regole sotto html.dark (la classe la mette api.js)
function darkAsClass(css) {
  const marker = '@media (prefers-color-scheme: dark) {';
  let res = '';
  let i = 0;
  for (let at = css.indexOf(marker); at !== -1; at = css.indexOf(marker, i)) {
    res += css.slice(i, at);
    let depth = 1;
    let j = at + marker.length;
    for (; depth; j++) depth += css[j] === '{' ? 1 : css[j] === '}' ? -1 : 0;
    const inner = css.slice(at + marker.length, j - 1);
    res += inner.replace(/([^{}]+)\{/g, (_, sel) => sel.split(',')
      .map((s) => (s.trim() === ':root' ? 'html.dark' : `html.dark ${s.trim()}`)).join(', ') + ' {');
    i = j;
  }
  return res + css.slice(i);
}
writeFileSync(join(out, 'styles.css'), darkAsClass(readFileSync(join(root, 'renderer', 'styles.css'), 'utf8')));

// ?v= evita che il browser tenga i file della versione precedente
const html = readFileSync(join(root, 'renderer', 'index.html'), 'utf8')
  .replace('<link rel="stylesheet" href="styles.css">', `<link rel="stylesheet" href="styles.css?v=${version}">
  <link rel="stylesheet" href="web.css?v=${version}">
  <link rel="icon" href="icon.png">
  <link rel="apple-touch-icon" href="icon.png">
  <link rel="manifest" href="manifest.webmanifest">`)
  .replace('<script src="icons.js"></script>', `<script src="api.js?v=${version}"></script>
  <script src="icons.js?v=${version}"></script>`)
  .replace('<script src="app.js"></script>', `<script src="app.js?v=${version}"></script>`);
if (!html.includes('api.js')) throw new Error('index.html cambiato: aggiorna build-web.mjs');
writeFileSync(join(out, 'index.html'), html);

// Installabile come app da Chrome/Edge (menu → Installa)
writeFileSync(join(out, 'manifest.webmanifest'), JSON.stringify({
  name: 'Solferino 3 Dashboard', short_name: 'Solferino 3', start_url: '/', display: 'standalone',
  background_color: '#f1edeb', theme_color: '#6295a5',
  icons: [{ src: 'icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
}, null, 2));
console.log(`Versione web ${version} pronta in cloud/public`);
