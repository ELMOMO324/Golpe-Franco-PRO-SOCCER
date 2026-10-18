// Mete en el juego los logos que has cambiado en los clubes y ligas originales.
//
// Uso (desde la carpeta del proyecto):
//   node tools/importar-escudos.mjs ruta/a/golpe-franco-copia-AAAA-MM-DD.json
//
// La copia se exporta desde el juego: PERSONALIZAR → BASE DE DATOS → EXPORTAR COPIA.
// El script escribe src/data/Escudos.js. Después vuelve a generar el juego (npm run build
// o node tools/build.mjs) y los logos se verán en todas las copias del juego.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = join(aqui, '..', 'src', 'data', 'Escudos.js');
const ruta = process.argv[2];
if (!ruta) {
  console.error('Falta la ruta de la copia. Ejemplo: node tools/importar-escudos.mjs copia.json');
  process.exit(1);
}

const copia = JSON.parse(readFileSync(ruta, 'utf8'));
const crudo = copia.claves ? copia.claves['golpe-franco-personalizacion'] : null;
if (!crudo) {
  console.error('La copia no contiene datos personalizados (golpe-franco-personalizacion).');
  process.exit(1);
}
const datos = JSON.parse(crudo);
const esImagen = (u) => typeof u === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(u);

const escudos = {}, logosLigas = {};
const avisos = [];
for (const [id, ed] of Object.entries(datos.edClubes || {})) {
  if (ed && esImagen(ed.logo)) escudos[id] = ed.logo;
}
for (const [id, ed] of Object.entries(datos.edLigas || {})) {
  if (ed && esImagen(ed.logo)) logosLigas[id] = ed.logo;
}
for (const [id, url] of [...Object.entries(escudos), ...Object.entries(logosLigas)]) {
  const kb = Math.round(url.length * 0.75 / 1024);
  if (kb > 200) avisos.push(`${id}: ${kb} KB (conviene reducirlo a 256 px)`);
}

const cab = `// Escudos y logos de los clubes y ligas originales. Este archivo lo genera
// tools/importar-escudos.mjs a partir de una copia exportada desde el juego.
// Cada valor es una imagen en data URL (se incluye en el juego, así la ven todos).`;
writeFileSync(destino,
  `${cab}\nexport const ESCUDOS = ${JSON.stringify(escudos, null, 1)};\n` +
  `export const LOGOS_LIGAS = ${JSON.stringify(logosLigas, null, 1)};\n`);

console.log(`Escudos de clubes: ${Object.keys(escudos).length}`);
console.log(`Logos de ligas: ${Object.keys(logosLigas).length}`);
for (const a of avisos) console.log('Aviso:', a);
console.log(`Escrito: ${destino}`);
