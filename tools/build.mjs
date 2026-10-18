// Empaqueta el juego en un único archivo HTML autocontenido.
//   dist/index.html     -> página completa (se puede abrir con doble clic)
//   dist/artifact.html  -> el mismo contenido sin <html>/<head>/<body>, para publicarlo
// Uso: node tools/build.mjs [--debug=1]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let esbuild;
try { esbuild = require('esbuild'); } catch { esbuild = require('/opt/npm-tools/node_modules/esbuild'); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const entry = path.resolve(root, args.entry || 'src/main.js');

const res = await esbuild.build({
  entryPoints: [entry], bundle: true, format: 'iife', minify: !args.debug, write: false,
  target: 'es2020', legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const tpl = fs.readFileSync(path.join(root, args.template || 'index.html'), 'utf8');
const inline = (html) => html
  .replace(/<link rel="stylesheet" href="css\/style.css"\s*\/?>/, () => `<style>\n${css}\n</style>`)
  .replace(/<script type="module" src="[^"]+"><\/script>/, () => `<script>\n${js}\n</script>`);
const full = inline(tpl).replace(/<!--(BEGIN|BODY|END)-->\n?/g, '');
const out = path.resolve(root, args.out || 'dist/index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, full);
import { copiarAssets } from './copiar-assets.mjs';
copiarAssets(root);
console.log(`OK ${path.relative(root, out)}  (${(full.length / 1024).toFixed(0)} KB)`);
if (tpl.includes('<!--BEGIN-->')) {
  const head = tpl.slice(tpl.indexOf('<!--BEGIN-->') + 12, tpl.indexOf('<!--BODY-->'));
  const body = tpl.slice(tpl.indexOf('<body>') + 6, tpl.indexOf('<!--END-->'));
  const frag = inline(head + body).trim() + '\n';
  const aout = path.join(path.dirname(out), 'artifact.html');
  fs.writeFileSync(aout, frag);
  console.log(`OK ${path.relative(root, aout)}  (${(frag.length / 1024).toFixed(0)} KB)`);
}
