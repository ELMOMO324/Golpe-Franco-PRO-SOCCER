// Modo carrera: liga de los 12 clubes, plantillas por club, presupuestos,
// lesiones, mercado de fichajes, jugador propio (modo jugador), fin de
// temporada con ofertas y contratos. Sin interfaz ni render.
//
// Los partidos que juega el usuario salen en 3D con el motor de partidos. El
// resto se resuelven con un modelo rápido que depende de la fuerza real de
// cada plantilla (once titular disponible), así que lesiones y fichajes
// cambian los resultados también fuera del campo.

import { TEAMS, getTeam, ATTR_KEYS, overall, ORIGINAL_CLUB_IDS } from '../data/TeamsData.js';
import { pickLineupFor, FORMATIONS } from '../data/Formations.js';
import { championsDe, fasePendiente, indiceFase, simularFase } from '../data/Champions.js';
import { fechasLiga, fechasUCL, inicioTemporada, FASES_UCL } from './Fechas.js';
import { RNG, clamp } from '../core/MathUtils.js';
import { ligas } from '../data/Custom.js';

export const CLAVE_CARRERAS = 'golpe-franco-carreras';
export const POSICIONES_JUGADOR = ['CB', 'CM', 'ST'];
export const PUNTOS_INICIALES = 130;   // reparto inicial del jugador sobre la base
export const ATTR_BASE = 50;
export const ATTR_MIN_INICIAL = 35;
export const ATTR_MAX_INICIAL = 85;
export const ATTR_MAX = 99;
export const JORNADA_VENTANA = [0, 11]; // jornadas (índice) en las que hay mercado abierto
// Clubes originales (antes de cualquier personalización): para migrar carreras antiguas
const ORIGINAL_IDS = ORIGINAL_CLUB_IDS;
const NOMBRES = ['Mateo', 'Lucas', 'Samu', 'Tomás', 'Diego', 'Ivo', 'Kai', 'Noa', 'Ezra', 'Jonah', 'Rafa', 'Elio', 'Marco', 'Leo'];
const APELLIDOS = ['Varela', 'Okafor', 'Brandt', 'Lindqvist', 'Ferreiro', 'Mendes', 'Kowal', 'Azcona', 'Rinaldi', 'Duval', 'Sokolov', 'Haddad', 'Soler', 'Keane'];
const POS_CANTERA = ['CB', 'CM', 'CAM', 'ST', 'RB', 'LB', 'CDM', 'RW', 'LW', 'GK'];

// ------------------------------------------------------------- Dinero

function semilla(str) {
  let h = 0;
  for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(h) % 1000) / 1000; // 0..1, fija para cada club
}
/** Factor propio de cada club: unos son más ricos que otros. */
export const factorClub = (id) => 0.8 + semilla(id) * 0.5;

const ovrClub = (id) => getTeam(id).ovr;

/** Valor de mercado en M€: crece mucho con la media y baja con la edad. */
export function valorDe(p) {
  let v = Math.pow(Math.max(0, p.ovr - 54) / 12, 2.2) * 6 + 0.2;
  if (p.age <= 23) v *= 1.25;
  else if (p.age >= 34) v *= 0.5;
  else if (p.age >= 31) v *= 0.75;
  return Math.max(0.2, Math.round(v * 10) / 10);
}

/** Sueldo anual en M€. */
export function salarioDe(p) {
  return Math.max(0.2, Math.round((p.ovr - 55) * 0.09 * 20) / 20);
}

/** Ingresos de un club al iniciar una temporada: cada uno distinto y cambiante. */
export function ingresosTemporada(id, temporada) {
  const f = factorClub(id) * (0.95 + 0.1 * semilla(id + temporada));
  return Math.round((9 + Math.max(0, ovrClub(id) - 55) * 1.0) * f * 10) / 10;
}

function cajaInicial(id) {
  return Math.round((20 + Math.max(0, ovrClub(id) - 55) * 2) * factorClub(id) * 10) / 10;
}

// ------------------------------------------------------- Jugadores

function jugadorDeEquipo(p) {
  return { ...p, attrs: { ...p.attrs }, lesion: 0 };
}

function nuevoId(rng) {
  return 'j' + Date.now().toString(36) + rng.int(0, 99999).toString(36);
}

/** Jugador generado (cantera o agente libre). */
export function generarJugador(rng, pos, media, edad) {
  const attrs = {};
  for (const k of ATTR_KEYS) attrs[k] = Math.round(clamp(media + rng.range(-9, 9), 30, 99));
  let ovr;
  if (pos === 'GK') {
    attrs.porteria = Math.round(clamp(media + rng.range(-5, 5), 40, 96));
    ovr = attrs.porteria;
  } else {
    ovr = overall(pos, attrs);
  }
  const first = rng.pick(NOMBRES), last = rng.pick(APELLIDOS);
  const ref = rng.pick(TEAMS).squad[0];
  return {
    id: nuevoId(rng),
    name: `${first} ${last}`, short: last, initial: `${first[0]}. ${last}`,
    number: rng.int(20, 99), pos, age: edad, attrs, ovr,
    skin: ref.skin, hair: ref.hair, hairStyle: ref.hairStyle, height: ref.height,
    lesion: 0,
  };
}

/** Clubes del mundo de la carrera: los de la liga más los de las ligas incluidas (plantillas, cajas, mercado). */
export function mundoDe(c) {
  return c.mundo && c.mundo.length ? c.mundo : c.clubes;
}

function inicializarClubes(c) {
  c.plantillas = {};
  c.caja = {};
  for (const id of mundoDe(c)) {
    const t = getTeam(id);
    c.plantillas[id] = t.squad.map(jugadorDeEquipo);
    c.caja[id] = cajaInicial(id);
  }
}

/** Plantilla que juega para un club: sin lesionados y con el jugador del usuario si es suyo. */
export function plantillaActiva(c, clubId) {
  let lista = (c.plantillas[clubId] || []).filter((p) => !p.lesion);
  const j = c.jugador;
  if (j && j.clubId === clubId && !j.lesion) {
    // Siempre eres titular en tu posición: ocupas el hueco del peor titular de tu línea
    const formacion = formacionPara(c, clubId, getTeam(clubId).style.formation);
    const huecos = FORMATIONS[formacion].filter((s) => s.role === j.pos).length;
    const deLinea = lista.filter((p) => p.pos === j.pos).sort((a, b) => b.ovr - a.ovr);
    const quedan = new Set(deLinea.slice(0, Math.max(0, huecos - 1)));
    lista = lista.filter((p) => p.pos !== j.pos || quedan.has(p));
    lista = [...lista, j];
  }
  return lista;
}

/** Objeto de equipo para el motor de partidos, con la plantilla de la carrera. */
export function equipoPara(c, clubId) {
  const base = getTeam(clubId);
  const squad = plantillaActiva(c, clubId);
  const extra = { roles: (c.roles && c.roles[clubId]) || null };
  if (c.titulares && c.titulares[clubId] && c.titulares[clubId].length === 11) {
    extra.titulares = c.titulares[clubId];
    extra.titularesOrdenados = true;  // el orden de la lista es el hueco de cada titular
  }
  // En la carrera de jugador tu futbolista siempre es titular (solo en tu club)
  if (esClubDelJugador(c, clubId)) extra.titulares = titularesDe(c, clubId);
  return { ...base, squad, ...extra };
}

/** ¿Es el club del jugador de una carrera de jugador (con el jugador disponible)? */
function esClubDelJugador(c, clubId) {
  return c.modo === 'jugador' && !!c.jugador && c.jugador.clubId === clubId && !c.jugador.lesion;
}

/** Once titular de un club en la carrera (11 ids). Si no hay uno guardado, el automático. */
export function titularesDe(c, clubId) {
  const guardados = c.titulares && c.titulares[clubId];
  let ids;
  if (guardados && guardados.length === 11) ids = [...guardados];
  else {
    const base = getTeam(clubId);
    ids = pickLineupFor(plantillaActiva(c, clubId), formacionPara(c, clubId, base.style.formation), base.titulares)
      .filter((e) => e && e.player).map((e) => e.player.id);
  }
  if (!esClubDelJugador(c, clubId) || ids.includes('yo') || ids.length < 11) return ids;
  // Tu jugador entra en el once: sustituye al titular de su posición o, si no hay, al de menor media
  const squad = plantillaActiva(c, clubId);
  const pos = c.jugador.pos;
  let idx = ids.findIndex((id) => (squad.find((p) => p.id === id) || {}).pos === pos);
  if (idx < 0) {
    let peor = Infinity;
    ids.forEach((id, i) => {
      const p = squad.find((x) => x.id === id);
      if (p && p.ovr < peor) { peor = p.ovr; idx = i; }
    });
  }
  ids[idx] = 'yo';
  return ids;
}

/**
 * Pasa a un jugador al once o a la suplencia manteniendo siempre 11 titulares.
 * Devuelve un mensaje de error o null si todo ha ido bien.
 */
export function alternarTitular(c, clubId, pid) {
  const todos = (c.plantillas[clubId] || []).filter((p) => !p.lesion);
  const p = todos.find((x) => x.id === pid);
  if (!p) return 'Ese jugador no está disponible.';
  const ids = titularesDe(c, clubId);
  const porId = (id) => (c.plantillas[clubId] || []).find((x) => x.id === id);
  const idx = ids.indexOf(pid);
  if (idx >= 0) {
    const suplentes = todos.filter((x) => !ids.includes(x.id)).sort((a, b) => b.ovr - a.ovr);
    const repl = suplentes.find((x) => x.pos === p.pos) || suplentes[0];
    if (!repl) return 'No hay suplentes disponibles para sustituirlo.';
    ids[idx] = repl.id;
  } else {
    const titulares = ids.map(porId).filter(Boolean).sort((a, b) => a.ovr - b.ovr);
    const cambio = titulares.find((x) => x.pos === p.pos) || titulares[0];
    if (!cambio) return 'No hay titulares que sustituir.';
    ids[ids.indexOf(cambio.id)] = pid;
  }
  c.titulares = { ...(c.titulares || {}), [clubId]: ids };
  return null;
}

/** Un suplente ocupa el hueco de un titular (el titular pasa a la suplencia). Devuelve un error o null. */
export function sustituirTitular(c, clubId, titularId, suplenteId) {
  const suplente = (c.plantillas[clubId] || []).find((x) => x.id === suplenteId);
  if (!suplente || suplente.lesion) return 'Ese suplente no está disponible.';
  const ids = titularesDe(c, clubId);
  const idx = ids.indexOf(titularId);
  if (idx < 0) return 'Ese jugador no es titular.';
  if (ids.includes(suplenteId)) return 'Ese jugador ya es titular.';
  ids[idx] = suplenteId;
  c.titulares = { ...(c.titulares || {}), [clubId]: ids };
  return null;
}

/** Intercambia los huecos de dos titulares (por índice en el once, 0 = portero). */
export function intercambiarTitulares(c, clubId, i, j) {
  const ids = titularesDe(c, clubId);
  if (i === j || i < 0 || j < 0 || i >= ids.length || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  c.titulares = { ...(c.titulares || {}), [clubId]: ids };
}

/** Asigna un rol (capitan, penales, faltas) a un jugador; si ya lo tenía, lo quita. */
export function asignarRol(c, clubId, rol, pid) {
  const roles = { ...((c.roles && c.roles[clubId]) || {}) };
  if (roles[rol] === pid) delete roles[rol];
  else roles[rol] = pid;
  c.roles = { ...(c.roles || {}), [clubId]: roles };
}

/** Cambia la posición de un jugador de la plantilla (solo en esta carrera). */
export function cambiarPosicion(c, clubId, pid, pos) {
  const p = (c.plantillas[clubId] || []).find((x) => x.id === pid);
  if (p) p.pos = pos;
}

/** Formación real de un club en la carrera: la del club, salvo que tu jugador no tenga hueco en ella. */
export function formacionPara(c, clubId, formacion) {
  const j = c.modo === 'jugador' && c.jugador && c.jugador.clubId === clubId ? c.jugador : null;
  if (j && !FORMATIONS[formacion].some((s) => s.role === j.pos)) return '4-3-3';
  return formacion;
}

/** Media de los once titulares disponibles. */
export function fuerza(c, clubId) {
  const base = getTeam(clubId);
  const once = pickLineupFor(plantillaActiva(c, clubId), formacionPara(c, clubId, base.style.formation), titularesDe(c, clubId)).filter((e) => e && e.player);
  if (!once.length) return 40;
  return once.reduce((s, e) => s + e.player.ovr, 0) / once.length;
}

// ------------------------------------------------------------ Creación

export function crearCarrera({ nombre, modo, clubId, jugador, clubes, ligaId, ligaNombre, mundo, dt, dificultad }) {
  const ids = clubes && clubes.length ? [...clubes] : ORIGINAL_IDS.filter((id) => TEAMS.some((t) => t.id === id));
  const c = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    fecha: new Date().toISOString(),
    modo,                       // 'jugador' | 'dt'
    nombre: (nombre || '').trim() || (modo === 'dt' ? 'Entrenador' : 'Jugador'),
    clubId,
    reputacion: 50,
    temporada: 1,
    jornada: 0,
    clubes: ids,
    ligaId: ligaId || 'original',
    ligaNombre: ligaNombre || 'LIGA GOLPE FRANCO',
    mundo: [...new Set([...ids, ...(mundo || [])])],   // clubes de todas las ligas incluidas
    dt: dt || null,                                   // DT: { edad, aspecto }
    dificultad: dificultad || null,                   // dificultad de los partidos de esta carrera (null = ajustes globales)
    calendario: generarCalendario(ids),
    palmares: [],
    fin: null,
    mercado: null,
    dinero: 0,                  // jugador: dinero acumulado en M€
    puntos: 0,                  // jugador: puntos de mejora sin gastar
    jugador: null,
  };
  inicializarClubes(c);
  c.objetivos = generarObjetivos(c);
  if (modo === 'jugador' && jugador) {
    const attrs = { ...jugador.attrs };
    const ovr = overall(jugador.pos, attrs);
    c.jugador = {
      id: 'yo', clubId, name: jugador.nombre, short: jugador.nombre, initial: jugador.nombre,
      number: 10, pos: jugador.pos, age: 19, attrs, ovr,
      skin: jugador.skin, hair: jugador.hair, hairStyle: jugador.hairStyle, height: jugador.height,
      lesion: 0, salario: 0,
      stats: { pj: 0, goles: 0, asistencias: 0 },
    };
    c.jugador.salario = salarioDe(c.jugador);
  }
  return c;
}

/**
 * Objetivos de la directiva para la temporada, según la fuerza del club (1 = el más fuerte de la liga).
 * Se generan al empezar cada temporada y se evalúan al terminarla.
 */
export function generarObjetivos(c) {
  const orden = [...c.clubes].sort((a, b) => getTeam(b).ovr - getTeam(a).ovr);
  const rango = Math.max(1, orden.indexOf(c.clubId) + 1);
  const plazas = Math.max(1, Math.round(c.clubes.length * 0.2));
  const objetivos = [{ id: 'clasi', texto: `Clasificarse para la UEFA Champions League (top ${plazas})`, meta: plazas }];
  const meta = rango <= 3 ? 1 : Math.max(2, Math.min(c.clubes.length, rango - 2));
  objetivos.push({ id: 'pos', texto: meta === 1 ? 'Ganar la liga' : `Terminar entre los ${meta} primeros`, meta });
  if (c.clasificadoUCL) objetivos.push({ id: 'ucl', texto: 'Superar la fase de grupos de la UEFA Champions League', meta: 0 });
  return objetivos;
}

/** Cumplimiento de un objetivo. final = true cuando la temporada ha terminado. */
export function cumpleObjetivo(c, o, pos) {
  if (o.id === 'clasi') return pos <= o.meta;
  if (o.id === 'pos') return pos <= o.meta;
  if (o.id === 'ucl') {
    const t = c.champions;
    return !!(t && t.clasificados && t.clasificados.includes(c.clubId));
  }
  return false;
}

/** Liga "todos contra todos" de ida y vuelta (método del círculo). */
export function generarCalendario(ids) {
  const equipos = [...ids];
  if (equipos.length % 2 !== 0) equipos.push(null);
  const n = equipos.length;
  const jornadas = [];
  for (let r = 0; r < n - 1; r++) {
    const jornada = [];
    for (let i = 0; i < n / 2; i++) {
      const a = equipos[i], b = equipos[n - 1 - i];
      if (a && b) jornada.push(r % 2 === 0 ? { local: a, visitante: b, res: null } : { local: b, visitante: a, res: null });
    }
    jornadas.push(jornada);
    equipos.splice(1, 0, equipos.pop());
  }
  const vuelta = jornadas.map((j) => j.map((p) => ({ local: p.visitante, visitante: p.local, res: null })));
  return [...jornadas, ...vuelta];
}

// ----------------------------------------------------------- Clasificación

export function tablaDe(c) {
  const t = {};
  for (const id of c.clubes) t[id] = { id, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
  for (const j of c.calendario) for (const f of j) {
    if (!f.res) continue;
    const [gl, gv] = f.res;
    const L = t[f.local], V = t[f.visitante];
    L.pj++; V.pj++;
    L.gf += gl; L.gc += gv; V.gf += gv; V.gc += gl;
    if (gl > gv) { L.pg++; L.pts += 3; V.pp++; }
    else if (gl < gv) { V.pg++; V.pts += 3; L.pp++; }
    else { L.pe++; V.pe++; L.pts++; V.pts++; }
  }
  return Object.values(t).sort((a, b) =>
    b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf || a.id.localeCompare(b.id));
}

// ---------------------------------------------------- Jornada y partidos

export function involucra(c, f) {
  return f.local === c.clubId || f.visitante === c.clubId;
}

export function userFixture(c) {
  if (!c || c.jornada >= c.calendario.length) return null;
  return c.calendario[c.jornada].find((f) => involucra(c, f)) || null;
}

/** Modelo rápido de resultado: goles de Poisson según la fuerza de cada plantilla. */
export function quickSim(c, homeId, awayId, rnd = Math.random) {
  const poisson = (lambda) => {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= rnd(); } while (p > L);
    return k - 1;
  };
  const sh = fuerza(c, homeId), sa = fuerza(c, awayId);
  const lh = clamp(1.3 * Math.pow(sh / sa, 3) * 1.08, 0.15, 3.5); // ventaja de jugar en casa
  const lv = clamp(1.3 * Math.pow(sa / sh, 3) * 0.94, 0.15, 3.5);
  return [poisson(lh), poisson(lv)];
}

export function registrarResultado(c, f, gl, gv) {
  f.res = [gl, gv];
  if (involucra(c, f)) {
    const esLocal = f.local === c.clubId;
    const uf = esLocal ? gl : gv, ur = esLocal ? gv : gl;
    if (uf > ur) c.reputacion += 2;
    else if (uf < ur) c.reputacion -= 1;
    c.reputacion = clamp(c.reputacion, 0, 100);
  }
}

export function prepararJornada(c) {
  if (c.jornada >= c.calendario.length) return;
  for (const f of c.calendario[c.jornada]) {
    if (f.res || involucra(c, f)) continue;
    f.res = quickSim(c, f.local, f.visitante);
  }
}

/** Lesiones: cada jornada los lesionados se recuperan poco a poco y nuevos jugadores se lesionan. */
function jornadaMedica(c, rnd = Math.random) {
  for (const id of mundoDe(c)) {
    for (const p of c.plantillas[id]) {
      if (p.lesion > 0) p.lesion--;
      else if (rnd() < 0.012) p.lesion = 1 + Math.floor(rnd() * 5);
    }
  }
  if (c.jugador) {
    if (c.jugador.lesion > 0) c.jugador.lesion--;
    else if (rnd() < 0.008) c.jugador.lesion = 1 + Math.floor(rnd() * 4);
  }
}

/** Cierra la jornada de liga en curso: fija la fecha del juego y avanza a la siguiente. */
export function cerrarJornada(c) {
  jornadaMedica(c);
  if (c.jornada < c.calendario.length) c.fechaJuego = fechasLiga(c)[c.jornada];
  c.jornada++;
  resolverDelegadas(c);
  comprobarFinTemporada(c);
}

/** La temporada termina cuando acaban la liga y la Champions de la temporada. */
export function comprobarFinTemporada(c) {
  if (c.fin) return;
  if (c.jornada < c.calendario.length) return;
  if (indiceFase(championsDe(c)) < FASES_UCL) return;
  finalizarTemporada(c);
}

/**
 * Eventos pendientes de la temporada, ordenados por fecha: la siguiente jornada de liga y la
 * siguiente fase de la Champions (si quedan).
 */
export function eventosPendientes(c) {
  const out = [];
  if (c.jornada < c.calendario.length) {
    out.push({ tipo: 'liga', idx: c.jornada, fecha: fechasLiga(c)[c.jornada] });
  }
  const t = championsDe(c);
  const idx = indiceFase(t);
  if (idx < FASES_UCL) {
    out.push({ tipo: 'ucl', idx, fecha: fechasUCL(c)[idx], nombre: fasePendiente(t).nombre });
  }
  return out.sort((a, b) => a.fecha - b.fecha);
}

export function proximoEvento(c) {
  return eventosPendientes(c)[0] || null;
}

/**
 * Avanza al siguiente evento de la temporada (jornada de liga o fase de la Champions) sin
 * jugarlo en 3D: se simula y la fecha del juego pasa a ser la de ese evento.
 */
export function avanzarEvento(id) {
  const c = cargarCarrera(id);
  if (!c || c.fin || c.modo !== 'dt') return null;
  const ev = proximoEvento(c);
  if (ev && ev.tipo === 'liga') {
    prepararJornada(c);
    const f = userFixture(c);
    if (f && !f.res) registrarResultado(c, f, ...quickSim(c, f.local, f.visitante));
    cerrarJornada(c);
  } else if (ev) {
    simularFase(championsDe(c));
    c.fechaJuego = ev.fecha;
    comprobarFinTemporada(c);
  } else {
    comprobarFinTemporada(c);
  }
  guardarCarrera(c);
  return c;
}

/**
 * Tras un partido de la Champions jugado en 3D: si quedan partidos de esa misma fase se
 * simulan (la fase se cierra entera) y la fecha del juego pasa a la de la fase.
 * idx = fase en la que se jugó el partido, calculada antes de registrarlo.
 */
export function cerrarFaseUCL(c, idx) {
  const t = championsDe(c);
  if (indiceFase(t) === idx) simularFase(t);
  c.fechaJuego = fechasUCL(c)[idx];
  comprobarFinTemporada(c);
}

/** Sueldo que ofrece cada club a tu jugador (M€/año). */
export function salarioOferta(c, clubId) {
  const base = Math.max(0.3, (c.jugador.ovr - 52) * 0.14);
  return Math.round(base * (ovrClub(clubId) / 68) * factorClub(clubId) * 20) / 20;
}

export function finalizarTemporada(c) {
  const tabla = tablaDe(c);
  const pos = tabla.findIndex((t) => t.id === c.clubId) + 1;
  const campeon = tabla[0].id;
  const delta = pos <= 3 ? 8 : pos <= 6 ? 3 : pos >= 10 ? -5 : 0;
  c.reputacion = clamp(c.reputacion + delta, 0, 100);

  let ofertas = [], contratos = null;
  if (c.modo === 'jugador') {
    // Todos los clubes te ofrecen contrato; el actual aparece también (quedarte)
    contratos = mundoDe(c).map((id) => ({ clubId: id, salario: salarioOferta(c, id), actual: id === c.clubId }))
      .sort((a, b) => b.salario - a.salario);
  } else {
    const ovrPropio = ovrClub(c.clubId);
    if (pos <= 4 || c.reputacion >= 70) {
      ofertas = TEAMS.filter((t) => t.id !== c.clubId && mundoDe(c).includes(t.id) && t.ovr >= ovrPropio + 2)
        .sort((a, b) => a.ovr - b.ovr).slice(0, 3).map((t) => t.id);
    }
  }
  const objetivos = (c.objetivos || []).map((o) => ({ ...o, cumplido: cumpleObjetivo(c, o, pos) }));
  c.palmares.push({
    temporada: c.temporada, club: c.clubId, posicion: pos, campeon: campeon === c.clubId,
    uclCampeon: championsDe(c).campeon === c.clubId, objetivos: objetivos.filter((o) => o.cumplido).length,
    objetivosTotal: objetivos.length,
  });
  // Clasificación para la Champions de la temporada siguiente: plazas según el tamaño de la liga (~20 %)
  const plazas = Math.max(1, Math.round(c.clubes.length * 0.2));
  c.clasificadoUCL = pos <= plazas;
  const ucl = championsDe(c);
  c.fin = {
    temporada: c.temporada, posicion: pos, puntos: tabla[pos - 1].pts, campeon, delta, ofertas, contratos,
    ucl: { campeon: ucl.campeon === c.clubId, clasificado: c.clasificadoUCL },
    objetivos,
  };
}

/**
 * Nueva temporada: nuevo club si se acepta una oferta (clubNuevo), presupuestos,
 * envejecimiento, retiradas y jugadores de cantera.
 */
export function nuevaTemporada(c, clubNuevo = null, salarioNuevo = null) {
  if (c.jugador) {
    // Cobras el sueldo de la temporada que acaba de terminar
    c.dinero = Math.round((c.dinero + c.jugador.salario) * 10) / 10;
    if (clubNuevo) {
      c.clubId = clubNuevo;
      if (salarioNuevo != null) c.jugador.salario = salarioNuevo;
    }
    c.jugador.clubId = c.clubId;
  } else if (clubNuevo) {
    c.clubId = clubNuevo;
  }
  c.temporada++;
  c.jornada = 0;
  c.calendario = generarCalendario(c.clubes);
  c.fechaJuego = inicioTemporada(c);
  c.champions = null;  // la Champions de la nueva temporada se crea con los clasificados
  c.objetivos = generarObjetivos(c);
  c.fin = null;
  c.mercado = null;
  progresarPlantillas(c);
  for (const id of mundoDe(c)) {
    const sueldos = c.plantillas[id].reduce((s, p) => s + salarioDe(p), 0);
    c.caja[id] = Math.round((c.caja[id] + ingresosTemporada(id, c.temporada) - sueldos) * 10) / 10;
  }
}

function progresarPlantillas(c) {
  const rng = new RNG((Date.now() % 100000) + c.temporada * 7919);
  for (const id of mundoDe(c)) {
    const vivos = [];
    let retirados = 0;
    for (const p of c.plantillas[id]) {
      p.age++;
      if (p.age >= 37 || (p.age >= 35 && rng.chance(0.5))) { retirados++; continue; }
      const d = p.age <= 23 ? rng.int(1, 4) : p.age <= 28 ? rng.int(0, 2) : p.age <= 31 ? rng.int(-1, 1) : rng.int(-3, -1);
      for (const k of ATTR_KEYS) p.attrs[k] = clamp(p.attrs[k] + d, 30, 99);
      p.ovr = p.pos === 'GK' ? clamp(p.ovr + d, 40, 96) : overall(p.pos, p.attrs);
      vivos.push(p);
    }
    for (let i = 0; i < retirados + 1; i++) {
      const pos = rng.pick(POS_CANTERA);
      vivos.push(generarJugador(rng, pos, 50 + rng.int(0, 10), rng.int(17, 19)));
    }
    c.plantillas[id] = vivos;
  }
}

// -------------------------------------------------------------- Mercado

export function ventanaAbierta(c) {
  return c.modo === 'dt' && JORNADA_VENTANA.includes(c.jornada) && c.fin == null;
}

/** Genera el mercado de la ventana actual: jugadores en venta, agentes libres y fichajes entre IA. */
export function obtenerMercado(c) {
  const clave = `${c.temporada}-${c.jornada}`;
  if (c.mercado && c.mercado.clave === clave) return c.mercado;
  const rng = new RNG(Math.floor(Math.random() * 1e9) + 1);
  const otros = mundoDe(c).filter((id) => id !== c.clubId);
  const ventas = [];
  for (const id of otros) {
    const plant = [...c.plantillas[id]].sort((a, b) => b.ovr - a.ovr);
    for (const p of plant.slice(Math.max(0, plant.length - 4)).slice(0, 2)) ventas.push({ clubId: id, id: p.id });
  }
  // Fichajes entre clubes de la IA: los que tienen dinero compran a otros
  for (const comprador of otros) {
    if (!rng.chance(0.6)) continue;
    const idx = ventas.findIndex((v) => v.clubId !== comprador);
    if (idx < 0) break;
    const v = ventas[idx];
    const p = c.plantillas[v.clubId].find((x) => x.id === v.id);
    if (!p || c.caja[comprador] < valorDe(p)) continue;
    moverJugador(c, v.clubId, comprador, p.id, valorDe(p));
    ventas.splice(idx, 1);
  }
  const libres = [];
  for (let i = 0; i < 2; i++) {
    const pos = rng.pick(POS_CANTERA.filter((x) => x !== 'GK'));
    libres.push(generarJugador(rng, pos, 60 + rng.int(0, 8), rng.int(24, 32)));
  }
  c.mercado = { clave, ventas: ventas.filter((v) => c.plantillas[v.clubId].some((p) => p.id === v.id)), libres };
  return c.mercado;
}

function moverJugador(c, origen, destino, id, precio) {
  const idx = c.plantillas[origen].findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const [p] = c.plantillas[origen].splice(idx, 1);
  c.plantillas[destino].push(p);
  c.caja[origen] = Math.round((c.caja[origen] + precio) * 10) / 10;
  c.caja[destino] = Math.round((c.caja[destino] - precio) * 10) / 10;
  return p;
}

/** Compra un jugador en venta de otro club o un agente libre. Devuelve { ok, msg }. */
export function comprar(c, { clubId, id }) {
  if (!ventanaAbierta(c)) return { ok: false, msg: 'El mercado está cerrado.' };
  const m = c.mercado;
  if (clubId) {
    const p = (c.plantillas[clubId] || []).find((x) => x.id === id);
    if (!p) return { ok: false, msg: 'Ese jugador ya no está disponible.' };
    const precio = valorDe(p);
    if (c.caja[c.clubId] < precio) return { ok: false, msg: `Te faltan ${(precio - c.caja[c.clubId]).toFixed(1)} M€.` };
    moverJugador(c, clubId, c.clubId, id, precio);
    m.ventas = m.ventas.filter((v) => v.id !== id);
    return { ok: true, msg: `Fichado ${p.short} por ${precio.toFixed(1)} M€.` };
  }
  const idx = m.libres.findIndex((x) => x.id === id);
  if (idx < 0) return { ok: false, msg: 'Ese jugador ya no está libre.' };
  const [p] = m.libres.splice(idx, 1);
  c.plantillas[c.clubId].push(p);
  return { ok: true, msg: `${p.short} firma como agente libre.` };
}

/** Vende un jugador de tu plantilla a un club de la IA con dinero (90% de su valor). */
export function vender(c, id) {
  if (!ventanaAbierta(c)) return { ok: false, msg: 'El mercado está cerrado.' };
  const p = c.plantillas[c.clubId].find((x) => x.id === id);
  if (!p) return { ok: false, msg: 'Ese jugador no está en tu plantilla.' };
  if (c.plantillas[c.clubId].length <= 16) return { ok: false, msg: 'Necesitas al menos 16 jugadores en plantilla.' };
  const precio = Math.round(valorDe(p) * 0.9 * 10) / 10;
  const compradores = mundoDe(c).filter((x) => x !== c.clubId && c.caja[x] >= precio);
  if (!compradores.length) return { ok: false, msg: 'Ningún club puede pagar ese precio.' };
  const destino = compradores[Math.floor(Math.random() * compradores.length)];
  moverJugador(c, c.clubId, destino, id, precio);
  if (c.mercado) c.mercado.ventas = c.mercado.ventas.filter((v) => v.id !== id);
  return { ok: true, msg: `Vendido ${p.short} a ${getTeam(destino).short} por ${precio.toFixed(1)} M€.` };
}

// -------------------------------------------------------- Jugador propio

/** Puntos de mejora que da un partido: solo si ganas. 1 por ganar, +1 por gol o asistencia, máximo +2 por eso. */
export function puntosPorPartido({ victoria, goles, asistencias }) {
  if (!victoria) return 0;
  return 1 + Math.min(2, goles + asistencias);
}

export function registrarPartidoJugador(c, { victoria, goles, asistencias }) {
  if (!c.jugador) return 0;
  const pts = puntosPorPartido({ victoria, goles, asistencias });
  c.puntos += pts;
  c.jugador.stats.pj++;
  c.jugador.stats.goles += goles;
  c.jugador.stats.asistencias += asistencias;
  return pts;
}

/** Gasta un punto de mejora en un atributo. */
export function mejorar(c, attr) {
  const j = c.jugador;
  if (!j || c.puntos <= 0 || !ATTR_KEYS.includes(attr) || j.attrs[attr] >= ATTR_MAX) return false;
  j.attrs[attr]++;
  c.puntos--;
  j.ovr = overall(j.pos, j.attrs);
  return true;
}

// ------------------------------------------------------ Acciones de alto nivel

/** Simula la jornada entera (incluido tu partido). Solo en modo DT. */
export function simularJornada(id) {
  const c = cargarCarrera(id);
  if (!c || c.fin || c.modo !== 'dt') return null;
  prepararJornada(c);
  const f = userFixture(c);
  if (f && !f.res) registrarResultado(c, f, ...quickSim(c, f.local, f.visitante));
  cerrarJornada(c);
  guardarCarrera(c);
  return c;
}

// --------------------------------------------------------------- Guardado

export function listarCarreras() {
  try {
    return JSON.parse(window.localStorage.getItem(CLAVE_CARRERAS) || '{}');
  } catch (e) {
    return {};
  }
}

export function cargarCarrera(id) {
  const c = listarCarreras()[id] || null;
  if (c && !c.clubes) {
    // Carreras guardadas antes de las ligas: juegan con la liga original
    c.clubes = ORIGINAL_IDS.filter((id) => TEAMS.some((t) => t.id === id));
    c.ligaId = 'original';
    c.ligaNombre = 'LIGA GOLPE FRANCO';
  }
  if (c && !c.plantillas) {
    // Carreras guardadas antes de las plantillas: se les añade la liga completa
    inicializarClubes(c);
    c.mercado = null;
    c.dinero = c.dinero || 0;
    c.puntos = c.puntos || 0;
    c.jugador = c.jugador || null;
  }
  return c;
}

export function guardarCarrera(c) {
  const todas = listarCarreras();
  todas[c.id] = c;
  try {
    window.localStorage.setItem(CLAVE_CARRERAS, JSON.stringify(todas));
  } catch (e) { /* sin almacenamiento: la carrera vive solo en memoria */ }
}

export function borrarCarrera(id) {
  const todas = listarCarreras();
  delete todas[id];
  try {
    window.localStorage.setItem(CLAVE_CARRERAS, JSON.stringify(todas));
  } catch (e) { /* ignorar */ }
}

// -------------------------------------------------- Negociaciones y búsqueda (DT)

let negoSeq = 0;
const nuevoIdNego = () => 'n' + Date.now().toString(36) + (negoSeq++).toString(36);

/** Liga a la que pertenece un club (id de liga o null). */
export function ligaDeClub(clubId) {
  const l = ligas().find((x) => x.clubes.includes(clubId));
  return l ? l.id : null;
}

/** Jugador de cualquier club de la carrera, con su club. */
export function jugadorDelMundo(c, pid) {
  for (const id of mundoDe(c)) {
    const p = (c.plantillas[id] || []).find((x) => x.id === pid);
    if (p) return { p, clubId: id };
  }
  return null;
}

/** Búsqueda de jugadores de otros clubes por texto, liga y posición (máximo 60 resultados). */
export function buscarJugadores(c, { texto = '', liga = '', pos = '' } = {}) {
  const norm = (x) => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = norm(texto).trim();
  const out = [];
  for (const id of mundoDe(c)) {
    if (id === c.clubId) continue;
    if (liga && ligaDeClub(id) !== liga) continue;
    const club = getTeam(id);
    for (const p of c.plantillas[id] || []) {
      if (pos && p.pos !== pos) continue;
      if (q && !norm(`${p.name} ${club.name} ${club.short} ${p.pos}`).includes(q)) continue;
      out.push({ p, clubId: id });
    }
  }
  out.sort((a, b) => b.p.ovr - a.p.ovr);
  return { total: out.length, lista: out.slice(0, 60) };
}

/** Intereses: jugadores que el DT ha marcado para negociar. */
export function anadirInteres(c, pid) {
  c.intereses = c.intereses || [];
  if (!c.intereses.includes(pid)) c.intereses.push(pid);
}

export function quitarInteres(c, pid) {
  c.intereses = (c.intereses || []).filter((x) => x !== pid);
}

/**
 * Oferta formal a un club por uno de sus jugadores. Puedes ajustar el precio, proponer un
 * intercambio (uno de tus jugadores) y ceder un % de una futura venta. El club acepta,
 * contraataca exigiendo más dinero o cláusulas, o rechaza. Con «delegar», la directiva
 * responde en la próxima jornada.
 */
export function ofertarCompra(c, pid, oferta, opts = {}) {
  if (!ventanaAbierta(c)) return { ok: false, msg: 'El mercado está cerrado.' };
  const j = jugadorDelMundo(c, pid);
  if (!j) return { ok: false, msg: 'Ese jugador ya no está disponible.' };
  oferta = Math.round(oferta * 10) / 10;
  if (oferta < 0) return { ok: false, msg: 'La oferta no puede ser negativa.' };
  if (oferta > c.caja[c.clubId]) return { ok: false, msg: `No tienes presupuesto: te quedan ${c.caja[c.clubId].toFixed(1)} M€.` };
  const pide = valorDe(j.p);
  const club = getTeam(j.clubId).short;
  c.negociaciones = c.negociaciones || [];
  const n = {
    id: nuevoIdNego(), tipo: 'compra', pid, clubId: j.clubId, pide, oferta,
    intercambio: opts.intercambio || null,
    porcentaje: clamp(Math.round(opts.porcentaje || 0), 0, 20),
    estado: 'abierta', msg: '',
  };
  if (opts.delegar) {
    n.estado = 'delegada';
    n.resuelve = c.jornada + 1;
    n.msg = `La directiva de ${club} estudiará tu oferta por ${j.p.short}. Te avisarán en la próxima jornada.`;
    c.negociaciones.push(n);
    return { ok: true, msg: n.msg, negociacion: n };
  }
  const r = evaluarOferta(c, n, j.p);
  c.negociaciones.push(n);
  return { ok: r.ok, msg: r.msg, negociacion: n };
}

/** Decide la respuesta del club a una oferta (la guarda en la negociación `n`). */
export function evaluarOferta(c, n, p) {
  const inter = n.intercambio ? (c.plantillas[c.clubId] || []).find((x) => x.id === n.intercambio) : null;
  // Un jugador a cambio vale el 90 % de su valor; el % de futura venta resta valor al club
  const efectivo = n.oferta + (inter ? valorDe(inter) * 0.9 : 0) - (n.porcentaje / 100) * n.pide * 0.5;
  const club = getTeam(n.clubId).short;
  if (efectivo >= n.pide) {
    n.estado = 'club_ok';
    n.precio = n.pide;
    n.msg = `${club} acepta. Ahora tienes que cerrar el contrato con ${p.short} y su agente.`;
    return { ok: true, msg: n.msg };
  }
  if (efectivo >= n.pide * 0.8) {
    const nuevo = Math.round(n.pide * 1.1 * 10) / 10;
    n.estado = 'contra';
    n.pide = nuevo;
    n.exige = n.porcentaje < 10 ? 10 : n.porcentaje;
    n.msg = `${club} contraataca: pide ${nuevo.toFixed(1)} M€${n.exige ? ` y un ${n.exige} % de una futura venta` : ''}.`;
    return { ok: false, msg: n.msg };
  }
  n.estado = 'rechazada';
  n.msg = `${club} rechaza ${n.oferta.toFixed(1)} M€ por ${p.short}: la consideran insuficiente.`;
  return { ok: false, msg: n.msg };
}

/** Respuesta de las ofertas delegadas en la directiva (se llama al cerrar cada jornada). */
export function resolverDelegadas(c) {
  for (const n of c.negociaciones || []) {
    if (n.estado !== 'delegada' || n.resuelve > c.jornada) continue;
    const j = jugadorDelMundo(c, n.pid);
    if (!j) { n.estado = 'cerrada'; n.msg = 'El jugador ya no está disponible.'; continue; }
    n.pide = valorDe(j.p);
    evaluarOferta(c, n, j.p);
    n.msg = `La directiva responde: ${n.msg}`;
  }
}

// Líneas del campo: un club busca reforzar la que tiene más floja.
const LINEAS = { DEF: ['CB', 'LB', 'RB'], MED: ['CDM', 'CM', 'CAM'], DEL: ['LW', 'RW', 'ST'] };
const NOMBRE_LINEA = { DEF: 'defensa', MED: 'centrocampista', DEL: 'delantero' };
const lineaDe = (pos) => Object.keys(LINEAS).find((k) => LINEAS[k].includes(pos)) || null;
/** Media de los mejores 4 de una línea de una plantilla. */
function mediaLinea(plant, linea) {
  const xs = plant.filter((p) => lineaDe(p.pos) === linea).map((p) => p.ovr).sort((x, y) => y - x).slice(0, 4);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/**
 * Clubes que se interesan por tus jugadores (una vez por ventana). Cada club busca
 * reforzar su línea más floja: solo se fija en jugadores tuyos de esa línea que
 * mejorarían su media. El aviso dice qué posición necesita.
 */
export function generarEntrantes(c) {
  c.negociaciones = c.negociaciones || [];
  const clave = `${c.temporada}-${c.jornada}`;
  if (c.entrantesClave === clave || !ventanaAbierta(c)) return;
  c.entrantesClave = clave;
  const usados = new Set(c.negociaciones.filter((n) => n.tipo === 'venta').map((n) => n.pid));
  const rivales = mundoDe(c).filter((x) => x !== c.clubId && c.caja[x] > 0).sort(() => Math.random() - 0.5);
  let creadas = 0;
  for (const club of rivales) {
    if (creadas >= 2) break;
    if (Math.random() < 0.6) continue; // no todos los clubes se interesan a la vez
    const plant = c.plantillas[club] || [];
    if (!plant.length) continue;
    const medias = Object.keys(LINEAS).map((k) => [k, mediaLinea(plant, k)]).sort((x, y) => x[1] - y[1]);
    const linea = medias[0][0];
    const nivel = medias[0][1];
    const candidatos = c.plantillas[c.clubId]
      .filter((p) => !p.lesion && !usados.has(p.id) && lineaDe(p.pos) === linea && p.ovr >= nivel - 2)
      .sort((x, y) => y.ovr - x.ovr);
    const p = candidatos[0];
    if (!p) continue;
    const precio = Math.round(valorDe(p) * 0.9 * 10) / 10;
    if (c.caja[club] < precio) continue;
    usados.add(p.id);
    creadas++;
    c.negociaciones.push({ id: nuevoIdNego(), tipo: 'venta', pid: p.id, clubId: club, pide: precio, oferta: precio, estado: 'abierta',
      msg: `${getTeam(club).short} busca reforzar su ${NOMBRE_LINEA[linea]} y se ha fijado en ${p.short}. Ofrece ${precio.toFixed(1)} M€.` });
  }
}

/** Aceptar: la contraoferta del club (queda pendiente el contrato) o la oferta de un club por tu jugador. */
export function aceptarNegociacion(c, nid) {
  if (!ventanaAbierta(c)) return { ok: false, msg: 'El mercado está cerrado.' };
  const n = (c.negociaciones || []).find((x) => x.id === nid);
  if (!n) return { ok: false, msg: 'Esa negociación ya no existe.' };
  if (n.tipo === 'compra') {
    const j = jugadorDelMundo(c, n.pid);
    if (!j) { n.estado = 'cerrada'; return { ok: false, msg: 'Ese jugador ya no está disponible.' }; }
    if (n.pide > c.caja[c.clubId]) return { ok: false, msg: `No tienes presupuesto para ${n.pide.toFixed(1)} M€.` };
    n.estado = 'club_ok';
    n.precio = n.pide;
    n.msg = `${getTeam(n.clubId).short} acepta tu contraoferta. Cierra el contrato con ${j.p.short}.`;
    return { ok: true, msg: n.msg };
  }
  const p = c.plantillas[c.clubId].find((x) => x.id === n.pid);
  if (!p) { n.estado = 'cerrada'; return { ok: false, msg: 'Ese jugador ya no está en tu plantilla.' }; }
  if (c.plantillas[c.clubId].length <= 16) return { ok: false, msg: 'Necesitas al menos 16 jugadores en plantilla.' };
  if (c.caja[n.clubId] < n.pide) { n.estado = 'cerrada'; return { ok: false, msg: 'El club ya no puede pagar ese precio.' }; }
  moverJugador(c, c.clubId, n.clubId, n.pid, n.pide);
  n.estado = 'cerrada';
  return { ok: true, msg: `Vendido ${p.short} por ${n.pide.toFixed(1)} M€.` };
}

// ---------------------------------- Contrato con el jugador y su agente

export const ROLES = ['indiscutible', 'importante', 'rotacion', 'futuro'];
export const ROLES_NOMBRE = {
  indiscutible: 'Titular indiscutible', importante: 'Jugador importante', rotacion: 'Rotación', futuro: 'Futuro prometedor',
};
const FACTOR_ROL = { indiscutible: 1.4, importante: 1.0, rotacion: 0.7, futuro: 0.6 };

/** Rol que espera el agente según la media del jugador frente a los once del club. */
export function rolEsperado(c, p) {
  const media = (c.plantillas[c.clubId] || []).map((x) => x.ovr).sort((a, b) => b - a).slice(0, 11)
    .reduce((a, b, _, arr) => a + b / arr.length, 0);
  if (p.ovr >= media + 2) return 'indiscutible';
  if (p.ovr >= media - 2) return 'importante';
  if (p.age <= 21) return 'futuro';
  return 'rotacion';
}

/** Sueldo semanal mínimo (M€) que acepta el agente para ese rol, años y primas. */
export function sueldoMinimo(c, p, cond) {
  const esperado = rolEsperado(c, p);
  let min = Math.max(0.05, (p.ovr - 55) * 0.012) * FACTOR_ROL[esperado];
  const orden = ROLES.indexOf(cond.rol);
  const ordenEsp = ROLES.indexOf(esperado);
  if (orden > ordenEsp) min *= 1.3;          // le ofreces menos rol del que espera: pide más
  else if (orden < ordenEsp) min *= 0.95;
  const primas = Object.values(cond.primas || {}).filter(Boolean).length;
  min *= 1 - 0.04 * primas;                  // las primas compensan un poco el sueldo
  if (p.age >= 31 && cond.anios >= 4) min *= 1.1;
  return Math.round(min * 100) / 100;
}

/**
 * Reacción del agente: sonríe y acepta si el sueldo cubre sus pretensiones; se cruza de
 * brazos si queda lejos; se rompe la negociación si el sueldo es demasiado bajo.
 */
export function contratoEvaluar(c, nid, cond) {
  const n = (c.negociaciones || []).find((x) => x.id === nid);
  const j = n && jugadorDelMundo(c, n.pid);
  if (!j) return { resultado: 'ruptura', reaccion: 'niega', minimo: 0, msg: 'El jugador ya no está disponible.' };
  const min = sueldoMinimo(c, j.p, cond);
  if (cond.sueldo >= min) {
    return { resultado: 'firma', reaccion: 'sonrisa', minimo: min, msg: `${j.p.short} y su agente sonríen: el acuerdo está cerrado.` };
  }
  if (cond.sueldo >= min * 0.85) {
    return { resultado: 'exige', reaccion: 'brazos', minimo: min, msg: 'El agente se cruza de brazos: la oferta está lejos de sus pretensiones.' };
  }
  return { resultado: 'ruptura', reaccion: 'niega', minimo: min, msg: 'El agente niega con la cabeza y da por rotas las negociaciones.' };
}

/** Firma el contrato: paga el precio acordado con el club y fija el contrato del jugador. */
export function firmarContrato(c, nid, cond) {
  const n = (c.negociaciones || []).find((x) => x.id === nid);
  if (!n || n.estado !== 'club_ok') return { ok: false, msg: 'Primero tiene que aceptar el club.' };
  const ev = contratoEvaluar(c, nid, cond);
  if (ev.resultado === 'ruptura') { n.estado = 'cerrada'; return { ok: false, ev, msg: ev.msg }; }
  if (ev.resultado !== 'firma') return { ok: false, ev, msg: ev.msg };
  const j = jugadorDelMundo(c, n.pid);
  if (!j) { n.estado = 'cerrada'; return { ok: false, ev, msg: 'El jugador ya no está disponible.' }; }
  if (n.precio > c.caja[c.clubId]) return { ok: false, ev, msg: `No tienes presupuesto para ${n.precio.toFixed(1)} M€.` };
  moverJugador(c, j.clubId, c.clubId, n.pid, n.precio);
  const fichado = c.plantillas[c.clubId].find((x) => x.id === n.pid);
  if (fichado) {
    fichado.contrato = {
      anios: cond.anios, sueldo: cond.sueldo, rol: cond.rol, primas: { ...cond.primas }, clausula: cond.clausula,
    };
  }
  quitarInteres(c, n.pid);
  n.estado = 'cerrada';
  return { ok: true, ev, nombre: j.p.name, short: j.p.short, dorsal: j.p.number, msg: `${j.p.short} se incorpora a ${getTeam(c.clubId).name}.` };
}

/** Rechazar o cerrar una negociación. */
export function cerrarNegociacion(c, nid) {
  const n = (c.negociaciones || []).find((x) => x.id === nid);
  if (n) n.estado = 'cerrada';
}
