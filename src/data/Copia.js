// Copia de seguridad: exporta todo lo que el juego guarda en el navegador
// (personalizaciones, base de datos, carreras y ajustes) a un archivo .json, y
// lo restaura desde ese archivo.

const PREFIJO = 'golpe-franco';
const APP = 'golpe-franco';
const VERSION = 1;

/** Devuelve un objeto con todas las claves del juego guardadas en el navegador. */
export function crearCopia() {
  const claves = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIJO)) claves[k] = window.localStorage.getItem(k);
    }
  } catch (e) { /* sin almacenamiento */ }
  return { app: APP, version: VERSION, fecha: new Date().toISOString(), claves };
}

/** Descarga la copia como archivo .json. */
export function descargarCopia() {
  const datos = JSON.stringify(crearCopia(), null, 2);
  const blob = new Blob([datos], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fecha = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `golpe-franco-copia-${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Restaura una copia desde el texto de un archivo. Valida antes de escribir nada.
 * Devuelve { ok: true, n } o { ok: false, error }.
 */
export function restaurarCopia(texto) {
  let obj;
  try { obj = JSON.parse(texto); } catch (e) { return { ok: false, error: 'El archivo no es un JSON válido.' }; }
  if (!obj || obj.app !== APP || obj.version !== VERSION || !obj.claves || typeof obj.claves !== 'object') {
    return { ok: false, error: 'Ese archivo no es una copia de Golpe Franco.' };
  }
  const entradas = Object.entries(obj.claves);
  for (const [k, v] of entradas) {
    if (!k.startsWith(PREFIJO) || typeof v !== 'string') return { ok: false, error: 'La copia tiene datos no válidos.' };
    try { JSON.parse(v); } catch (e) { return { ok: false, error: 'La copia tiene datos corruptos.' }; }
  }
  try {
    for (const [k, v] of entradas) window.localStorage.setItem(k, v);
  } catch (e) {
    return { ok: false, error: 'No hay espacio suficiente en el navegador para restaurar la copia.' };
  }
  return { ok: true, n: entradas.length };
}
