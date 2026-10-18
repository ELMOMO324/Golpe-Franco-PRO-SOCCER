// Genera el juego en archivos separados (sin módulos, para que funcione con doble clic):
//   dist/Jugar.html        -> página principal: abre el juego
//   dist/juego/juego.css   -> estilos
//   dist/juego/juego.js    -> código del juego (un único archivo clásico)
//   dist/index.html        -> redirige a Jugar.html (compatibilidad)
//   dist/artifact.html     -> versión autocontenida para publicar (la genera tools/build.mjs)
// Uso: node tools/build-split.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let esbuild;
try { esbuild = require('esbuild'); } catch { esbuild = require('/opt/npm-tools/node_modules/esbuild'); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const dir = path.join(dist, 'juego');
fs.mkdirSync(dir, { recursive: true });

// 1) JS: un solo archivo clásico (IIFE) para que cargue desde file://
const res = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.js')], bundle: true, format: 'iife', minify: true,
  write: false, target: 'es2020', legalComments: 'none',
});
fs.writeFileSync(path.join(dir, 'juego.js'), res.outputFiles[0].text);

// 2) CSS
fs.copyFileSync(path.join(root, 'css/style.css'), path.join(dir, 'juego.css'));

// 3) Página principal a partir de la plantilla, con CSS y JS externos
const tpl = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const head = tpl.slice(tpl.indexOf('<!--BEGIN-->') + 12, tpl.indexOf('<!--BODY-->'));
const body = tpl.slice(tpl.indexOf('<body>') + 6, tpl.indexOf('<!--END-->'));
const pagina = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#050a14">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Golpe Franco">
<link rel="manifest" href="manifest.json">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
${head.replace('href="css/style.css"', 'href="juego/juego.css"').trim()}
</head>
<body>${body.replace(/^<body>/, '').replace(/<script type="module"[^>]*><\/script>/, '')}
<div id="aviso-carga" hidden style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:#070b14;color:#f3f5f9;font:600 18px/1.5 system-ui,sans-serif;text-align:center;z-index:999">
<div id="aviso-texto"></div></div>
<script>
// Diagnóstico: si el juego no carga o no muestra nada, se explica el motivo en vez de dejar la pantalla en blanco
function avisoCarga(texto) {
  var box = document.getElementById('aviso-carga');
  document.getElementById('aviso-texto').textContent = texto;
  box.hidden = false;
}
</script>
<script src="juego/juego.js" onerror="avisoCarga('No se encontró juego/juego.js. Deja la carpeta «juego» junto a Jugar.html (en la misma carpeta, sin moverla) y vuelve a abrirlo.')"></script>
<script>
setTimeout(function () {
  if (!document.getElementById('ui').childElementCount && !document.getElementById('gl').width) {
    avisoCarga('El juego se cargó pero no arrancó. Pulsa F12, abre la pestaña Consola y envíame el primer mensaje rojo.');
  }
}, 5000);
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dist, 'Jugar.html'), pagina);
import { copiarAssets } from './copiar-assets.mjs';
copiarAssets(root);

// 4) index.html antiguo: redirige a Jugar.html
fs.writeFileSync(path.join(dist, 'index.html'),
  '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=Jugar.html"><title>Golpe Franco</title></head><body><a href="Jugar.html">Abrir Golpe Franco</a></body></html>\n');

// 5) artifact.html (versión autocontenida) con el build existente, sin dejar el archivo temporal
execFileSync(process.execPath, [path.join(root, 'tools/build.mjs'), '--out=dist/_tmp-full.html'], { cwd: root, stdio: 'inherit' });
fs.rmSync(path.join(dist, '_tmp-full.html'), { force: true });

console.log(`OK dist/Jugar.html (${(pagina.length / 1024).toFixed(0)} KB) + dist/juego/juego.js (${(res.outputFiles[0].text.length / 1024).toFixed(0)} KB) + dist/juego/juego.css`);
