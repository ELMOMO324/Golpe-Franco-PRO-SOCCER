// Captura pantallas de una página local con Chromium sin interfaz (WebGL por software).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import path from 'node:path';
const file = path.resolve(process.argv[2]);
const outDir = process.argv[3];
const script = process.argv[4] ? (await import(path.resolve(process.argv[4]))).default : null;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
p.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
await p.goto('file://' + file + (process.env.QUERY || ''));
if (script) await script(p, outDir);
if (errors.length) console.log('ERRORES:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
await b.close();
