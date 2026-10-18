// Calendario real de la carrera: fechas de la liga y de la UEFA Champions League.
// Cada temporada empieza el 1 de julio (la temporada 1 es 2025/2026). No depende de la interfaz.

const DIA = 86400000;
const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const pad = (n) => String(n).padStart(2, '0');

/** Año en que empieza la temporada (temporada 1 → 2025). */
export const anioInicio = (c) => 2025 + (c.temporada - 1);

/** Primer día de la temporada: 1 de julio. */
export const inicioTemporada = (c) => Date.UTC(anioInicio(c), 6, 1);

/** Fecha actual del juego (ms UTC): la del último evento cerrado. */
export const fechaActual = (c) => (c.fechaJuego != null ? c.fechaJuego : inicioTemporada(c));

const INICIO_LIGA = (c) => Date.UTC(anioInicio(c), 7, 16);   // mediados de agosto
const FIN_LIGA = (c) => Date.UTC(anioInicio(c) + 1, 3, 25);  // finales de abril
const sabado = (ms) => ms + (((6 - new Date(ms).getUTCDay()) + 7) % 7) * DIA;

/** Fecha (ms) de cada jornada de liga: sábados repartidos entre agosto y abril. */
export function fechasLiga(c) {
  const n = c.calendario.length;
  const paso = n > 1 ? (FIN_LIGA(c) - INICIO_LIGA(c)) / (n - 1) : 0;
  const out = [];
  let prev = -Infinity;
  for (let j = 0; j < n; j++) {
    let f = sabado(INICIO_LIGA(c) + j * paso);
    if (f <= prev) f = prev + 7 * DIA;
    out.push(f);
    prev = f;
  }
  return out;
}

// Fases de la Champions: 3 fechas de grupos y 4 rondas eliminatorias (octavos a final).
const UCL_GRUPOS = [[8, 16], [9, 7], [9, 28]];                    // sep 16, oct 7, oct 28 (año de inicio)
const UCL_ELIMINATORIAS = [[1, 17], [2, 10], [3, 14], [4, 27]];   // feb 17, mar 10, abr 14, may 27 (año siguiente)
export const FASES_UCL = 7;

/** Fecha (ms) de cada fase de la Champions de la temporada. */
export function fechasUCL(c) {
  const a = anioInicio(c);
  return [
    ...UCL_GRUPOS.map(([m, d]) => Date.UTC(a, m, d)),
    ...UCL_ELIMINATORIAS.map(([m, d]) => Date.UTC(a + 1, m, d)),
  ];
}

/** «MIÉRCOLES, 01 DE JUL» */
export function fechaLarga(ms) {
  const d = new Date(ms);
  return `${DIAS[d.getUTCDay()]}, ${pad(d.getUTCDate())} DE ${MESES[d.getUTCMonth()]}`;
}

/** «01 DE JUL» */
export function fechaCorta(ms) {
  const d = new Date(ms);
  return `${pad(d.getUTCDate())} DE ${MESES[d.getUTCMonth()]}`;
}

/** Días completos entre la fecha actual y un evento. */
export function diasHasta(ms, desde) {
  return Math.max(0, Math.round((ms - desde) / DIA));
}

/** «2025/2026» para la temporada de la carrera. */
export const etiquetaTemporada = (c) => `${anioInicio(c)}/${anioInicio(c) + 1}`;
