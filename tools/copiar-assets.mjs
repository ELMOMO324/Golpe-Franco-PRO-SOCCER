// Copia el manifiesto y los iconos (carpeta assets/) a dist/ tras cada build.
import fs from 'node:fs';
import path from 'node:path';

export function copiarAssets(root) {
  const origen = path.join(root, 'assets');
  const destino = path.join(root, 'dist');
  fs.mkdirSync(path.join(destino, 'icons'), { recursive: true });
  fs.copyFileSync(path.join(origen, 'manifest.json'), path.join(destino, 'manifest.json'));
  for (const f of fs.readdirSync(path.join(origen, 'icons'))) {
    fs.copyFileSync(path.join(origen, 'icons', f), path.join(destino, 'icons', f));
  }
}
