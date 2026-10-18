// UEFA Champions League: torneo que se juega dentro de cada carrera (modo jugador y DT).
// 32 clubes de las ligas europeas según sus cupos. Fase de grupos (8 grupos de 4, cada
// fecha es una fase) y después eliminatoria directa (16 clasificados). Las fases avanzan
// cuando el jugador quiera: la fecha que le toca a su club se juega en 3D o se simula.
// No depende de la interfaz ni del render.

import { TEAMS, getTeam } from './TeamsData.js';
import { crearTorneo, tablaGrupo, nombreRonda, simPartido } from './Torneos.js';

export const UEFA_NOMBRE = 'UEFA CHAMPIONS LEAGUE';

/** Cupos de clubes por liga europea (suman 32). */
export const UEFA_CUPOS = {
  'lg-eng': 5, 'lg-esp': 5, 'lg-ger': 4, 'lg-ita': 4, 'lg-fra': 4,
  'lg-por': 2, 'lg-ned': 2, 'lg-bel': 2, 'lg-tur': 2, 'lg-sco': 2,
};

// Orden de los partidos de un grupo de 4 (pares i<j): 3 fechas de 2 partidos cada una
const FECHAS = [[0, 5], [1, 4], [2, 3]];
const ovrDe = (id) => (getTeam(id) || { ovr: 60 }).ovr;

/**
 * Crea el torneo con los 32 mejores clubes de cada liga según sus cupos.
 * clubId: club del jugador. Si incluir es true, entra en la Champions (plaza de su liga);
 * si no, se excluye (por ejemplo, si no se ha clasificado).
 */
export function crearChampions(clubId = null, incluir = false) {
  let ids = [];
  for (const [liga, n] of Object.entries(UEFA_CUPOS)) {
    const mejores = TEAMS.filter((t) => t.liga === liga.slice(3) && !t.seleccion)
      .sort((a, b) => b.ovr - a.ovr).map((t) => t.id).filter((id) => id !== clubId);
    ids.push(...mejores.slice(0, n));
  }
  if (clubId && incluir) {
    ids = ids.sort((a, b) => ovrDe(b) - ovrDe(a)).slice(0, 31);
    ids.push(clubId);
  }
  ids = ids.sort((a, b) => ovrDe(b) - ovrDe(a));
  return crearTorneo({
    nombre: UEFA_NOMBRE, tipo: 'clubes', formato: 'grupos', n: ids.length,
    fuentes: Object.keys(UEFA_CUPOS), cupos: UEFA_CUPOS, g: 8, k: 0,
  }, ids);
}

/**
 * Índice de la fase en curso (0-2 grupos, 3-6 eliminatorias: octavos, cuartos, semifinal, final).
 * Devuelve 7 cuando el torneo ha terminado.
 */
export function indiceFase(t) {
  const f = fasePendiente(t);
  if (!f) return 7;
  const m = /Fecha (\d)/.exec(f.nombre);
  if (m) return +m[1] - 1;
  const orden = ['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'];
  const k = orden.indexOf(f.nombre);
  return k < 0 ? 3 : 3 + k;
}

/** Torneo de una carrera (se crea la primera vez que se abre). */
export function championsDe(c) {
  if (!c.champions) c.champions = crearChampions(c.clubId, c.clasificadoUCL === true);
  return c.champions;
}

/** Cruces de octavos a partir de los dos primeros de cada grupo (como en el torneo normal). */
function armarCuadro(t) {
  const tablas = t.grupos.map((gr) => tablaGrupo(gr));
  const primeros = tablas.map((tb) => tb[0].id);
  const segundos = tablas.map((tb) => tb[1].id);
  const q = [];
  for (let i = 0; i < t.grupos.length; i += 2) {
    q.push(primeros[i], segundos[i + 1], primeros[i + 1], segundos[i]);
  }
  t.clasificados = q;
  t.tablas = tablas.map((tb) => tb.map((x) => x.id));
  const partidos = [];
  for (let i = 0; i < q.length; i += 2) partidos.push({ a: q[i], b: q[i + 1], ga: null, gb: null, ganador: null });
  t.rondas = [{ nombre: nombreRonda(q.length), partidos }];
}

/**
 * Fase en curso: { nombre, partidos: [{ tipo, p }] } con los partidos pendientes.
 * Devuelve null si el torneo ha terminado.
 */
export function fasePendiente(t) {
  if (t.campeon) return null;
  if (t.grupos) {
    for (let f = 0; f < FECHAS.length; f++) {
      const refs = [];
      for (const gr of t.grupos) {
        for (const k of FECHAS[f]) if (gr.partidos[k].gl == null) refs.push({ tipo: 'grupo', p: gr.partidos[k] });
      }
      if (refs.length) return { nombre: `Fase de grupos · Fecha ${f + 1}`, partidos: refs };
    }
    if (!t.rondas.length) armarCuadro(t);
  }
  const r = t.rondas[t.rondas.length - 1];
  const pend = r.partidos.filter((p) => !p.ganador);
  if (pend.length) return { nombre: r.nombre, partidos: pend.map((p) => ({ tipo: 'ko', p })) };
  const pasan = r.partidos.map((p) => p.ganador);
  if (pasan.length === 1) { t.campeon = pasan[0]; return null; }
  const siguiente = [];
  for (let i = 0; i < pasan.length; i += 2) siguiente.push({ a: pasan[i], b: pasan[i + 1], ga: null, gb: null, ganador: null });
  t.rondas.push({ nombre: nombreRonda(pasan.length), partidos: siguiente });
  return fasePendiente(t);
}

/** Partido pendiente del club en la fase actual (o null). */
export function partidoDelClub(t, clubId) {
  const f = fasePendiente(t);
  if (!f) return null;
  return f.partidos.find((r) => r.p.a === clubId || r.p.b === clubId) || null;
}

/** Guarda el resultado de un partido (grupo o eliminatoria; en eliminatoria, empate = penaltis). */
export function registrarPartido(t, ref, gl, gv, rnd = Math.random) {
  const p = ref.p;
  if (ref.tipo === 'grupo') { p.gl = gl; p.gv = gv; return; }
  p.ga = gl; p.gb = gv;
  if (gl === gv) { p.penaltis = true; p.ganador = rnd() < 0.5 ? p.a : p.b; }
  else p.ganador = gl > gv ? p.a : p.b;
}

/** Simula toda la fase en curso (también el partido del club del jugador). */
export function simularFase(t, rnd = Math.random) {
  const f = fasePendiente(t);
  if (!f) return null;
  for (const ref of f.partidos) {
    const [gl, gv] = simPartido(ref.p.a, ref.p.b, ovrDe, rnd);
    registrarPartido(t, ref, gl, gv, rnd);
  }
  return f.nombre;
}
