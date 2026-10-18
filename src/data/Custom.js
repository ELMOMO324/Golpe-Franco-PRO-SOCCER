// Personalización: jugadores, clubes y ligas creados o editados por el jugador.
//
// Los datos se guardan en localStorage y se aplican al arrancar: se reconstruye
// el array TEAMS (el mismo que usan el motor, las carreras y los menús) a partir
// de los clubes originales más los cambios del jugador. Los clubes originales
// se pueden editar o borrar; sus jugadores se guardan como «ediciones» por id.

import { TEAMS, ATTR_KEYS, overall, ORIGINAL_CLUB_IDS } from './TeamsData.js';
import { LIGAS_EXTRA } from './LigasExtra.js';
import { LOGOS_LIGAS } from './Escudos.js';
import { clamp } from '../core/MathUtils.js';

const CLAVE = 'golpe-franco-personalizacion';

export const POSICIONES = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
export const PATRONES = ['solid', 'stripes', 'hoops', 'halves', 'sash', 'band', 'pinstripes', 'sleeves'];
export const COLORES_CAMISETA = ['#0f6b8f', '#f26b3a', '#f4e9c8', '#e5484d', '#2bb673', '#ffd23f', '#7b4ae2', '#1a1a1a', '#ffffff', '#2a5bd7', '#c0392b', '#e91e63', '#0e2b3a', '#35d07f'];
export const COLORES_PIEL = ['#f2c9a6', '#e6b38c', '#d19a73', '#b77c55', '#8f5a3a', '#6b4129', '#f5d3b5'];
export const COLORES_PELO = ['#1b1512', '#2d2018', '#4a3020', '#6e4a2a', '#b08a4e', '#d9c07a', '#111111', '#8a3b1e'];
export const ALTURAS = [0.94, 0.98, 1.02, 1.06];
export const MIN_JUGADORES_CLUB = 11;
export const MIN_CLUBES_LIGA = 4;

const NOMBRES = ['Mateo', 'Lucas', 'Samu', 'Tomás', 'Diego', 'Ivo', 'Kai', 'Noa', 'Ezra', 'Jonah', 'Rafa', 'Elio', 'Marco', 'Leo'];
const APELLIDOS = ['Varela', 'Okafor', 'Brandt', 'Lindqvist', 'Ferreiro', 'Mendes', 'Kowal', 'Azcona', 'Rinaldi', 'Duval', 'Sokolov', 'Haddad', 'Soler', 'Keane'];

// Base de datos original. Lo que el jugador convierte en «original» con
// «Crear nueva base de datos» se guarda aquí y sustituye a los datos de fábrica.
const BASE_KEY = 'golpe-franco-base';
const copia = (p) => ({ ...p, attrs: { ...p.attrs } });

// Datos de fábrica (antes de cualquier cambio)
const FABRICA = {
  clubes: TEAMS.map(({ squad, ovr, ...rest }) => ({ def: rest, squad: squad.map(copia) })),
  libres: [],
  ligas: LIGAS_EXTRA.map((l) => ({ ...l, clubes: [...l.clubes] })),
  selecciones: [],
};

let BASE_DEFS, BASE_SQUAD, BASE_CLUB_OF, BASE_JUGADORES, BASE_LIBRES, BASE_LIGAS, BASE_SEL;

/**
 * Añade a una base guardada los clubes y ligas de fábrica que le falten (por ejemplo,
 * las ligas nuevas de una versión posterior). No quita nada de lo que ya tenga.
 */
function completarBase(b) {
  const clubIds = new Set(b.clubes.map((c) => c.def.id));
  const ligaIds = new Set((b.ligas || []).map((l) => l.id));
  return {
    ...b,
    clubes: [...b.clubes, ...FABRICA.clubes.filter((c) => !clubIds.has(c.def.id))],
    ligas: [...(b.ligas || []), ...FABRICA.ligas.filter((l) => !ligaIds.has(l.id)).map((l) => ({ ...l, clubes: [...l.clubes] }))],
  };
}

function fijarBase(b0) {
  const b = completarBase(b0);
  BASE_DEFS = b.clubes.map((c) => c.def);
  BASE_SQUAD = Object.fromEntries(b.clubes.map((c) => [c.def.id, c.squad.map(copia)]));
  BASE_LIBRES = b.libres.map(copia);
  BASE_LIGAS = b.ligas;
  BASE_SEL = b.selecciones || [];
  BASE_CLUB_OF = {};
  BASE_JUGADORES = new Set();
  for (const c of b.clubes) {
    for (const p of c.squad) { BASE_CLUB_OF[p.id] = c.def.id; BASE_JUGADORES.add(p.id); }
  }
  for (const p of b.libres) BASE_JUGADORES.add(p.id);
}

function cargarBase() {
  try {
    const raw = window.localStorage.getItem(BASE_KEY);
    if (raw) {
      const b = JSON.parse(raw);
      if (b && Array.isArray(b.clubes)) return b;
    }
  } catch (e) { /* sin base guardada */ }
  return null;
}

fijarBase(cargarBase() || FABRICA);

const aleatorio = (n) => Math.random().toString(36).slice(2, 2 + n);
const vacio = () => ({ clubes: [], jugadores: [], ligas: [], selecciones: [], torneos: [], asig: {}, edClubes: {}, edJugadores: {}, edSelecciones: {}, edLigas: {}, sembrados: {}, borrados: { clubes: [], jugadores: [] } });

function cargar() {
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (raw) {
      const d = { ...vacio(), ...JSON.parse(raw) };
      d.borrados = { clubes: [], jugadores: [], ...(d.borrados || {}) };
      return d;
    }
  } catch (e) { /* sin datos guardados */ }
  return vacio();
}

let data = cargar();
let POOL = [];           // todos los jugadores, con su club efectivo en `club`
const logos = new Map(); // dataURL → Image ya cargada

// Si el navegador no tiene espacio, el último guardado falla: se avisa en el menú principal
let guardadoFallido = false;
export const guardadoCorrecto = () => !guardadoFallido;

function guardar() {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(data));
    guardadoFallido = false;
  } catch (e) {
    guardadoFallido = true;
  }
}

const esBaseJugador = (id) => BASE_JUGADORES.has(id);
const esBaseClub = (id) => BASE_DEFS.some((d) => d.id === id);

/** Club al que pertenece un jugador ahora mismo (null = libre). */
function clubEfectivo(pid) {
  return Object.prototype.hasOwnProperty.call(data.asig, pid) ? data.asig[pid] : (BASE_CLUB_OF[pid] ?? null);
}

function aplicarEdicion(p) {
  const e = data.edJugadores[p.id] || {};
  const q = { ...p, ...e, attrs: { ...p.attrs, ...(e.attrs || {}) } };
  q.ovr = q.pos === 'GK' ? clamp(q.attrs.porteria ?? q.ovr, 40, 99) : overall(q.pos, q.attrs);
  return q;
}

function construirPool() {
  const out = [];
  for (const d of BASE_DEFS) {
    for (const p of BASE_SQUAD[d.id] || []) {
      if (!data.borrados.jugadores.includes(p.id)) out.push(aplicarEdicion(p));
    }
  }
  for (const p of BASE_LIBRES) if (!data.borrados.jugadores.includes(p.id)) out.push(aplicarEdicion(p));
  for (const p of data.jugadores) if (!data.borrados.jugadores.includes(p.id)) out.push(aplicarEdicion(p));
  return out;
}

function jugadorGenerado(pos, media, edad) {
  const attrs = {};
  for (const k of ATTR_KEYS) attrs[k] = Math.round(clamp(media + (Math.random() * 18 - 9), 30, 99));
  if (pos === 'GK') attrs.porteria = Math.round(clamp(media, 40, 96));
  const first = NOMBRES[Math.floor(Math.random() * NOMBRES.length)];
  const last = APELLIDOS[Math.floor(Math.random() * APELLIDOS.length)];
  return {
    id: 'c' + aleatorio(8), name: `${first} ${last}`, short: last, initial: `${first[0]}. ${last}`,
    number: 20 + Math.floor(Math.random() * 79), pos, age: edad, attrs, ovr: 0,
    skin: COLORES_PIEL[0], hair: COLORES_PELO[0], hairStyle: 0, height: 1,
  };
}

function recalcularFuerza(squad) {
  const media = (lista) => {
    const xs = squad.filter((p) => lista.includes(p.pos)).map((p) => p.ovr).sort((a, b) => b - a).slice(0, 3);
    return xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 60;
  };
  return { att: media(['ST', 'LW', 'RW', 'CAM']), mid: media(['CM', 'CDM', 'CAM']), def: media(['CB', 'LB', 'RB', 'CDM', 'GK']) };
}

/** Selecciones que existen ahora (originales convertidas + creadas por el jugador). */
function seleccionesActuales() {
  const out = [];
  for (const s0 of BASE_SEL) {
    if (data.borrados.clubes.includes(s0.id)) continue;
    out.push({ ...s0, ...(data.edSelecciones[s0.id] || {}) });
  }
  for (const s0 of data.selecciones) if (!data.borrados.clubes.includes(s0.id)) out.push({ ...s0 });
  return out;
}

/** Guarda la plantilla de una selección (sin tocar los clubes de sus jugadores). */
function fijarMiembrosSeleccion(sid, lista) {
  const propia = data.selecciones.find((s0) => s0.id === sid);
  if (propia) propia.miembros = lista;
  else data.edSelecciones[sid] = { ...(data.edSelecciones[sid] || {}), miembros: lista };
}

/** Todos los clubes que existen ahora (originales no borrados + personalizados). */
function clubesActuales() {
  const out = [];
  for (const d of BASE_DEFS) if (!data.borrados.clubes.includes(d.id)) out.push({ ...d, ...(data.edClubes[d.id] || {}) });
  for (const c of data.clubes) if (!data.borrados.clubes.includes(c.id)) out.push({ ...c });
  return out;
}

/**
 * Reconstruye TEAMS a partir de los datos guardados. Se llama al arrancar y después
 * de cada cambio. Si un club se queda con menos de 11 jugadores se le añaden
 * jugadores de cantera, para que los partidos siempre tengan once.
 */
export function aplicarPersonalizacion() {
  POOL = construirPool();
  const clubes = clubesActuales();
  let generados = 0;
  for (const c of clubes) {
    const n = POOL.filter((p) => clubEfectivo(p.id) === c.id).length;
    for (let i = n; i < MIN_JUGADORES_CLUB + 3; i++) {
      const pos = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST', 'CB', 'CM'][i % 15];
      const j = jugadorGenerado(pos, 52 + Math.floor(Math.random() * 8), 18 + Math.floor(Math.random() * 10));
      data.jugadores.push(j);
      data.asig[j.id] = c.id;
      POOL.push(aplicarEdicion(j));
      generados++;
    }
  }
  // Selecciones con menos de 11 jugadores: se completan con jugadores libres
  const selecciones = seleccionesActuales();
  for (const s0 of selecciones) {
    const lista = [...(s0.miembros || [])];
    const n = POOL.filter((p) => lista.includes(p.id)).length;
    for (let i = n; i < MIN_JUGADORES_CLUB + 3; i++) {
      const pos = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST', 'CB', 'CM'][i % 15];
      const j = jugadorGenerado(pos, 52 + Math.floor(Math.random() * 8), 18 + Math.floor(Math.random() * 10));
      data.jugadores.push(j);
      POOL.push(aplicarEdicion(j));
      lista.push(j.id);
      generados++;
    }
    if (lista.length !== (s0.miembros || []).length) { fijarMiembrosSeleccion(s0.id, lista); s0.miembros = lista; }
  }
  if (generados) guardar();

  TEAMS.length = 0;
  for (const c of clubes) {
    const squad = POOL.filter((p) => clubEfectivo(p.id) === c.id).sort((a, b) => a.number - b.number);
    const base = BASE_SQUAD[c.id];
    const sinCambios = base && base.length === squad.length && base.every((p) => squad.some((q) => q.id === p.id))
      && !squad.some((p) => data.edJugadores[p.id]);
    const t = { ...c, squad };
    if (!sinCambios) Object.assign(t, recalcularFuerza(squad));
    if (c.titulares && c.titulares.length === 11 && c.titulares.every((id) => squad.some((p) => p.id === id))) t.titulares = c.titulares;
    else delete t.titulares;
    t.ovr = Math.round((t.att + t.mid + t.def) / 3);
    TEAMS.push(t);
  }
  for (const s0 of selecciones) {
    const squad = POOL.filter((p) => s0.miembros.includes(p.id)).sort((a, b) => a.number - b.number);
    const t = { ...s0, seleccion: true, squad, ...recalcularFuerza(squad) };
    if (s0.titulares && s0.titulares.length === 11 && s0.titulares.every((id) => squad.some((p) => p.id === id))) t.titulares = s0.titulares;
    else delete t.titulares;
    t.ovr = Math.round((t.att + t.mid + t.def) / 3);
    TEAMS.push(t);
  }
}

// ----------------------------------------------------------- Consultas

export function jugadores() { return POOL; }
export function jugadorPorId(id) { return POOL.find((p) => p.id === id) || null; }
export function clubDeJugador(pid) { return clubEfectivo(pid); }
export function esJugadorPersonalizado(id) { return !esBaseJugador(id) || !!data.edJugadores[id]; }
export function esClubOriginal(id) { return esBaseClub(id); }
export function esSeleccionOriginal(id) { return BASE_SEL.some((s0) => s0.id === id); }

/** Plantilla de jugadores de un club (en el orden del dorsal). */
export function miembrosDe(clubId) {
  return POOL.filter((p) => clubEfectivo(p.id) === clubId);
}

// ------------------------------------------------------------ Jugadores

/** Crea o edita un jugador. datos: { name, pos, number, age, attrs, skin, hair, hairStyle, height, clubId } */
export function guardarJugador(datos, id) {
  const pid = id || 'c' + aleatorio(8);
  const apellido = (datos.name || '').trim().split(/\s+/).pop() || 'Jugador';
  const nombre = (datos.name || '').trim() || 'Jugador';
  const campos = {
    name: nombre, short: apellido.slice(0, 12), initial: `${nombre[0]}. ${apellido}`,
    number: datos.number, pos: datos.pos, age: datos.age, attrs: { ...datos.attrs },
    skin: datos.skin, hair: datos.hair, hairStyle: datos.hairStyle, height: datos.height,
  };
  if (campos.pos === 'GK') campos.attrs.porteria = campos.attrs.porteria ?? 60;
  if (esBaseJugador(pid)) {
    data.edJugadores[pid] = { ...(data.edJugadores[pid] || {}), ...campos };
  } else {
    const i = data.jugadores.findIndex((p) => p.id === pid);
    if (i >= 0) data.jugadores[i] = { ...data.jugadores[i], ...campos, id: pid };
    else data.jugadores.push({ id: pid, ...campos });
  }
  data.asig[pid] = datos.clubId ?? null;
  guardar();
  aplicarPersonalizacion();
  return pid;
}

export function borrarJugador(id) {
  if (esBaseJugador(id)) {
    if (!data.borrados.jugadores.includes(id)) data.borrados.jugadores.push(id);
  } else {
    data.jugadores = data.jugadores.filter((p) => p.id !== id);
  }
  delete data.asig[id];
  guardar();
  aplicarPersonalizacion();
}

// --------------------------------------------------------------- Clubes

/**
 * Crea o edita un club. datos: { name, short, logo, home, away, style, miembros (ids), titulares (ids) }.
 * Los miembros pasan a este club; los que antes eran suyos y ya no están, quedan libres.
 */
export function guardarClub(datos, id) {
  if (datos.seleccion) return guardarSeleccion(datos, id);
  const cid = id || 'k' + aleatorio(6);
  const short = (datos.short || datos.name || 'CLU').toUpperCase().slice(0, 3);
  const campos = {
    name: (datos.name || 'Club nuevo').trim(), short,
    tagline: datos.tagline || 'Club personalizado',
    logo: datos.logo || null,
    home: datos.home, away: datos.away, style: datos.style,
    crest: { shape: 'shield', emblem: 'wave', mono: short.slice(0, 2) },
    flavor: 'es',
    titulares: datos.titulares && datos.titulares.length === 11 ? [...datos.titulares] : null,
  };
  if (esBaseClub(cid)) {
    data.edClubes[cid] = { ...(data.edClubes[cid] || {}), ...campos };
  } else {
    const i = data.clubes.findIndex((c) => c.id === cid);
    if (i >= 0) data.clubes[i] = { ...data.clubes[i], ...campos, id: cid };
    else data.clubes.push({ id: cid, ...campos });
  }
  const miembros = new Set(datos.miembros || []);
  for (const p of POOL) {
    if (miembros.has(p.id)) data.asig[p.id] = cid;
    else if (clubEfectivo(p.id) === cid) data.asig[p.id] = null;
  }
  guardar();
  aplicarPersonalizacion();
  return cid;
}

/** Crea o edita una selección. Mismos campos que un club, más la plantilla (miembros) sin quitar nada a los clubes. */
export function guardarSeleccion(datos, id) {
  const sid = id || 's' + aleatorio(6);
  const short = (datos.short || datos.name || 'SEL').toUpperCase().slice(0, 3);
  const campos = {
    name: (datos.name || 'Selección nueva').trim(), short,
    tagline: 'Selección personalizada',
    logo: datos.logo || null,
    home: datos.home, away: datos.away, style: datos.style,
    crest: { shape: 'shield', emblem: 'wave', mono: short.slice(0, 2) },
    flavor: 'es',
    titulares: datos.titulares && datos.titulares.length === 11 ? [...datos.titulares] : null,
    miembros: [...(datos.miembros || [])],
  };
  if (esSeleccionOriginal(sid)) {
    data.edSelecciones[sid] = { ...(data.edSelecciones[sid] || {}), ...campos };
  } else {
    const i = data.selecciones.findIndex((s0) => s0.id === sid);
    if (i >= 0) data.selecciones[i] = { ...data.selecciones[i], ...campos, id: sid };
    else data.selecciones.push({ id: sid, ...campos });
  }
  guardar();
  aplicarPersonalizacion();
  return sid;
}

export function borrarSeleccion(sid) {
  if (esSeleccionOriginal(sid)) {
    if (!data.borrados.clubes.includes(sid)) data.borrados.clubes.push(sid);
  } else {
    data.selecciones = data.selecciones.filter((s0) => s0.id !== sid);
  }
  guardar();
  aplicarPersonalizacion();
}

export function borrarClub(cid) {
  if (esBaseClub(cid)) {
    if (!data.borrados.clubes.includes(cid)) data.borrados.clubes.push(cid);
  } else {
    data.clubes = data.clubes.filter((c) => c.id !== cid);
  }
  for (const p of POOL) if (clubEfectivo(p.id) === cid) data.asig[p.id] = null;
  // Quita el club de las ligas personalizadas que lo tenían
  data.ligas = data.ligas.map((l) => ({ ...l, clubes: l.clubes.filter((x) => x !== cid) }));
  guardar();
  aplicarPersonalizacion();
}

/** Estilo de juego por defecto para un club nuevo. */
export function estiloPorDefecto() {
  return { formation: '4-3-3', mentality: 0, width: 0.6, depth: 0.4, pressing: 0.6, tempo: 0.5, line: 0.6 };
}

/** Equipaciones por defecto a partir de un color de camiseta. */
export function equipacionesPorDefecto(color = '#0f6b8f') {
  const home = { shirt: color, accent: '#ffffff', pattern: 'solid', shorts: '#ffffff', socks: color, num: '#ffffff' };
  const away = { shirt: '#f4f4f4', accent: color, pattern: 'solid', shorts: '#f4f4f4', socks: '#f4f4f4', num: color };
  return { home, away };
}

// ---------------------------------------------------------------- Ligas

/** Liga original (siempre existe) y las ligas personalizadas. */
export function ligas() {
  const originales = BASE_DEFS.map((d) => d.id).filter((id) => ORIGINAL_CLUB_IDS.includes(id) && !data.borrados.clubes.includes(id));
  // Las ligas originales pueden renombrarse o cambiar de logo (data.edLigas)
  const ov = (l) => ({ ...l, ...(data.edLigas[l.id] || {}) });
  const out = [ov({ id: 'original', nombre: 'LIGA GOLPE FRANCO', logo: LOGOS_LIGAS.original || null, clubes: originales, original: true })];
  for (const l of BASE_LIGAS) {
    out.push(ov({ ...l, clubes: l.clubes.filter((id) => TEAMS.some((t) => t.id === id)), original: true }));
  }
  for (const l of data.ligas) {
    out.push({ ...l, clubes: l.clubes.filter((id) => TEAMS.some((t) => t.id === id)) });
  }
  return out;
}

/** Nombre y logo de una liga original (no cambia sus clubes). */
export function guardarLigaOriginal(id, datos) {
  data.edLigas[id] = {
    nombre: (datos.nombre || '').trim().toUpperCase() || 'LIGA',
    logo: datos.logo || null,
  };
  guardar();
}

export function guardarLiga(datos, id) {
  const lid = id || 'l' + aleatorio(6);
  const campos = { nombre: (datos.nombre || 'Liga nueva').trim().toUpperCase(), logo: datos.logo || null, clubes: [...datos.clubes] };
  const i = data.ligas.findIndex((l) => l.id === lid);
  if (i >= 0) data.ligas[i] = { ...data.ligas[i], ...campos };
  else data.ligas.push({ id: lid, ...campos });
  guardar();
  return lid;
}

export function borrarLiga(id) {
  data.ligas = data.ligas.filter((l) => l.id !== id);
  guardar();
}

// -------------------------------------------------------- Torneos

export function torneos() {
  return data.torneos;
}

export function guardarTorneo(t) {
  const i = data.torneos.findIndex((x) => x.id === t.id);
  if (i >= 0) data.torneos[i] = t;
  else data.torneos.push(t);
  guardar();
}

export function borrarTorneo(id) {
  data.torneos = data.torneos.filter((x) => x.id !== id);
  guardar();
}

// ------------------------------------------------------ Base de datos

/** Quita todas las personalizaciones (clubes, jugadores y ligas creados o editados). La base original se mantiene. */
export function restaurarBaseDeDatos() {
  // Vuelve a los datos de fábrica: quita la base guardada (incluidas las creadas con «nueva base»)
  try { window.localStorage.removeItem(BASE_KEY); } catch (e) { /* sin almacenamiento */ }
  fijarBase(FABRICA);
  data = vacio();
  guardar();
  aplicarPersonalizacion();
}

/**
 * Convierte todo lo que existe ahora (clubes, jugadores y ligas) en la nueva base
 * original, para que al compartir el juego aparezca todo lo creado como original.
 */
export function crearNuevaBaseDeDatos() {
  aplicarPersonalizacion();
  const base = {
    clubes: TEAMS.filter((t) => !t.seleccion).map(({ squad, ovr, ...def }) => ({ def, squad: squad.map(copia) })),
    libres: POOL.filter((p) => !clubEfectivo(p.id)).map(copia),
    ligas: data.ligas.map((l) => ({ ...l, clubes: l.clubes.filter((id) => TEAMS.some((t) => t.id === id && !t.seleccion)) })),
    selecciones: TEAMS.filter((t) => t.seleccion).map(({ squad, ovr, att, mid, def, seleccion, ...rest }) => ({ ...rest, miembros: squad.map((p) => p.id) })),
  };
  try {
    window.localStorage.setItem(BASE_KEY, JSON.stringify(base));
  } catch (e) {
    return false;
  }
  fijarBase(base);
  // Los torneos creados se conservan; lo demás pasa a la base original
  data = { ...vacio(), torneos: data.torneos };
  guardar();
  aplicarPersonalizacion();
  return true;
}

// ------------------------------------------------------------- Imágenes

/** Lee un PNG y lo reduce a 256 px (cuadrado, con transparencia). Devuelve una dataURL. */
export function leerLogo(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) { reject(new Error('El logo tiene que ser una imagen PNG, JPG o WebP.')); return; }
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d');
        const s = Math.min(256 / im.width, 256 / im.height);
        ctx.drawImage(im, (256 - im.width * s) / 2, (256 - im.height * s) / 2, im.width * s, im.height * s);
        // WebP (con transparencia) ocupa mucho menos que PNG; si el navegador no lo genera, PNG
        const webp = c.toDataURL('image/webp', 0.9);
        const url = webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/png');
        cargarImagen(url);
        resolve(url);
      };
      im.onerror = () => reject(new Error('No se ha podido leer la imagen.'));
      im.src = fr.result;
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function cargarImagen(url) {
  if (logos.has(url)) return logos.get(url);
  const im = new Image();
  im.src = url;
  logos.set(url, im);
  return im;
}

/** Imagen de un logo si ya está cargada (para dibujarla en el escudo del estadio). */
export function logoListo(url) {
  if (!url) return null;
  const im = logos.get(url) || cargarImagen(url);
  return im.complete && im.naturalWidth ? im : null;
}

/** Carga los logos guardados antes de empezar, para que el estadio ya los tenga. */
export function precargarLogos() {
  const urls = [...TEAMS.map((t) => t.logo), ...data.ligas.map((l) => l.logo), ...Object.values(data.edLigas).map((l) => l.logo), ...data.clubes.map((c) => c.logo)].filter(Boolean);
  return Promise.all(urls.map((u) => new Promise((res) => {
    const im = cargarImagen(u);
    if (im.complete && im.naturalWidth) res();
    else { im.onload = () => res(); im.onerror = () => res(); }
  })));
}


// Aplica los cambios guardados del jugador a los clubes y jugadores del juego
aplicarPersonalizacion();
