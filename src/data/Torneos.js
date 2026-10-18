// Torneos creados por el jugador: reparto de cupos, formatos válidos, sorteo de
// grupos o cuadro, y simulación de resultados. No depende de la interfaz.
//
// Un torneo tiene: tipo ('clubes' | 'selecciones'), n participantes, fuentes
// (ligas o selecciones elegidas), cupos por fuente, y formato:
//   - 'eliminatoria': eliminatoria directa desde el primer partido.
//   - 'grupos': fase de grupos (round robin) y después eliminatoria con los
//     primeros de cada grupo, los segundos y, opcionalmente, los mejores terceros.

import { clamp } from '../core/MathUtils.js';

const esPotencia2 = (n) => n >= 2 && (n & (n - 1)) === 0;

/** Nombre de una ronda según cuántos equipos quedan. */
export function nombreRonda(equipos) {
  return { 2: 'Final', 4: 'Semifinales', 8: 'Cuartos de final', 16: 'Octavos de final', 32: 'Dieciseisavos de final' }[equipos]
    || `Ronda de ${equipos}`;
}

/** Eliminatoria directa válida con n participantes (potencia de 2, mínimo 4). */
export function eliminatoriaValida(n) {
  return esPotencia2(n) && n >= 4;
}

/**
 * Combinaciones válidas de grupos + eliminatoria para n participantes.
 * Devuelve [{ g, gs, k, pasan }]: g grupos de gs equipos, pasan los dos primeros
 * de cada grupo más k mejores terceros. El total de clasificados debe ser potencia de 2.
 */
export function opcionesGrupos(n) {
  const out = [];
  for (let g = 2; g <= 16; g++) {
    if (n % g) continue;
    const gs = n / g;
    if (gs < 3 || gs > 8) continue;
    for (let k = 0; k <= g; k++) {
      const q = 2 * g + k;
      if (esPotencia2(q) && q < n) out.push({ g, gs, k, pasan: q });
    }
  }
  return out;
}

/** Reparto de n cupos entre fuentes, sin pasarse de los equipos disponibles de cada una. */
export function repartirCupos(n, fuentes) {
  const c = Object.fromEntries(fuentes.map((f) => [f.id, 0]));
  let resto = n;
  while (resto > 0) {
    const libres = fuentes.filter((f) => c[f.id] < f.disponibles);
    if (!libres.length) break;
    const base = Math.max(1, Math.floor(resto / libres.length));
    for (const f of libres) {
      const add = Math.min(base, f.disponibles - c[f.id], resto);
      c[f.id] += add;
      resto -= add;
      if (!resto) break;
    }
  }
  return c;
}

/** Orden de siembra clásico (1 contra n, 2 contra n-1…) para un cuadro de n equipos. */
function ordenSiembra(n) {
  if (n === 1) return [1];
  const a = ordenSiembra(n / 2);
  const r = [];
  for (const s of a) r.push(s, n + 1 - s);
  return r;
}

/** Empareja equipos ordenados por nivel (el mejor contra el peor) en una primera ronda. */
function emparejar(ids) {
  const orden = ordenSiembra(ids.length);
  const sembrados = orden.map((s) => ids[s - 1]);
  const partidos = [];
  for (let i = 0; i < sembrados.length; i += 2) partidos.push({ a: sembrados[i], b: sembrados[i + 1], ga: null, gb: null, ganador: null });
  return partidos;
}

/** Reparto en grupos en serpentina, para que los mejores queden repartidos. */
function sortearGrupos(ids, g) {
  const grupos = Array.from({ length: g }, (_, i) => ({ nombre: String.fromCharCode(65 + i), equipos: [], partidos: [] }));
  ids.forEach((id, i) => {
    const fila = Math.floor(i / g);
    const col = fila % 2 === 0 ? i % g : g - 1 - (i % g);
    grupos[col].equipos.push(id);
  });
  for (const gr of grupos) {
    for (let i = 0; i < gr.equipos.length; i++) {
      for (let j = i + 1; j < gr.equipos.length; j++) {
        gr.partidos.push({ a: gr.equipos[i], b: gr.equipos[j], gl: null, gv: null });
      }
    }
  }
  return grupos;
}

/**
 * Crea un torneo nuevo. ids: participantes ordenados de mejor a peor nivel.
 * cfg: { nombre, logo, tipo, formato, n, fuentes, cupos, g, k }
 */
export function crearTorneo(cfg, ids) {
  const t = {
    id: 't' + Math.random().toString(36).slice(2, 8),
    nombre: cfg.nombre, logo: cfg.logo || null, tipo: cfg.tipo, formato: cfg.formato,
    n: cfg.n, fuentes: cfg.fuentes, cupos: cfg.cupos || {}, g: cfg.g || 0, k: cfg.k || 0,
    equipos: [...ids], grupos: null, rondas: [], simulado: false, campeon: null,
  };
  if (cfg.formato === 'eliminatoria') {
    t.rondas = [{ nombre: nombreRonda(ids.length), partidos: emparejar(ids) }];
  } else {
    t.grupos = sortearGrupos(ids, cfg.g);
  }
  return t;
}

/** Tabla de un grupo a partir de sus resultados. Ordena por puntos, diferencia y goles. */
export function tablaGrupo(grupo) {
  const st = Object.fromEntries(grupo.equipos.map((id) => [id, { id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }]));
  for (const p of grupo.partidos) {
    if (p.gl == null) continue;
    const a = st[p.a], b = st[p.b];
    a.pj++; b.pj++;
    a.gf += p.gl; a.gc += p.gv; b.gf += p.gv; b.gc += p.gl;
    if (p.gl > p.gv) { a.g++; a.pts += 3; b.p++; }
    else if (p.gl < p.gv) { b.g++; b.pts += 3; a.p++; }
    else { a.e++; b.e++; a.pts++; b.pts++; }
  }
  return Object.values(st).sort((x, y) => (y.pts - x.pts) || ((y.gf - y.gc) - (x.gf - x.gc)) || (y.gf - x.gf));
}

function poisson(lambda, rnd) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rnd(); } while (p > L);
  return k - 1;
}

/** Goles simulados entre dos equipos según su nivel (ovr). */
export function simPartido(a, b, ovrDe, rnd) {
  const sa = ovrDe(a), sb = ovrDe(b);
  const la = clamp(1.3 * Math.pow(sa / sb, 3), 0.15, 3.5);
  const lb = clamp(1.3 * Math.pow(sb / sa, 3), 0.15, 3.5);
  return [poisson(la, rnd), poisson(lb, rnd)];
}

/**
 * Simula el torneo entero y guarda los resultados en el propio objeto.
 * Los empates de eliminatoria se deciden por tanda de penaltis al azar.
 */
export function simularTorneo(t, ovrDe, rnd = Math.random) {
  if (t.grupos) {
    for (const gr of t.grupos) for (const p of gr.partidos) [p.gl, p.gv] = simPartido(p.a, p.b, ovrDe, rnd);
    const tablas = t.grupos.map((gr) => tablaGrupo(gr));
    const primeros = tablas.map((tb) => tb[0].id);
    const segundos = tablas.map((tb) => tb[1].id);
    const terceros = tablas
      .map((tb) => tb[2])
      .filter(Boolean)
      .sort((x, y) => (y.pts - x.pts) || ((y.gf - y.gc) - (x.gf - x.gc)) || (y.gf - x.gf))
      .slice(0, t.k)
      .map((x) => x.id);
    // Cruces clásicos: 1º del grupo i contra 2º del grupo i+1, y viceversa.
    const q = [];
    for (let i = 0; i < t.grupos.length; i += 2) {
      if (i + 1 < t.grupos.length) q.push(primeros[i], segundos[i + 1], primeros[i + 1], segundos[i]);
      else q.push(primeros[i], segundos[i]);
    }
    q.push(...terceros);
    t.clasificados = q;
    t.tablas = tablas.map((tb) => tb.map((x) => x.id));
    const partidos = [];
    for (let i = 0; i < q.length; i += 2) partidos.push({ a: q[i], b: q[i + 1], ga: null, gb: null, ganador: null });
    t.rondas = [{ nombre: nombreRonda(q.length), partidos }];
  }
  // Eliminatoria (directa o tras la fase de grupos)
  // Una eliminatoria ya simulada vuelve a empezar desde su primera ronda
  if (!t.grupos) {
    const r0 = t.rondas[0];
    t.rondas = [{ nombre: r0.nombre, partidos: r0.partidos.map((p) => ({ a: p.a, b: p.b, ga: null, gb: null, ganador: null })) }];
  }
  let ronda = t.rondas[0];
  for (;;) {
    for (const p of ronda.partidos) {
      [p.ga, p.gb] = simPartido(p.a, p.b, ovrDe, rnd);
      if (p.ga === p.gb) {
        p.penaltis = true;
        p.ganador = rnd() < 0.5 ? p.a : p.b;
      } else {
        p.ganador = p.ga > p.gb ? p.a : p.b;
      }
    }
    const pasan = ronda.partidos.map((p) => p.ganador);
    if (pasan.length === 1) { t.campeon = pasan[0]; break; }
    const siguiente = [];
    for (let i = 0; i < pasan.length; i += 2) siguiente.push({ a: pasan[i], b: pasan[i + 1], ga: null, gb: null, ganador: null });
    ronda = { nombre: nombreRonda(pasan.length), partidos: siguiente };
    t.rondas.push(ronda);
  }
  t.simulado = true;
  return t;
}

/** Quita resultados para volver a simular desde cero (conserva grupos y participantes). */
export function reiniciarTorneo(t) {
  if (t.grupos) {
    for (const gr of t.grupos) for (const p of gr.partidos) { p.gl = null; p.gv = null; }
    t.rondas = [];
    delete t.tablas;
    delete t.clasificados;
  } else {
    t.rondas = [{ nombre: nombreRonda(t.equipos.length), partidos: emparejar(t.equipos) }];
  }
  t.campeon = null;
  t.simulado = false;
  return t;
}
