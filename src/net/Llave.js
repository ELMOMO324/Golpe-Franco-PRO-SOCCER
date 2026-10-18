// Llaves de un torneo online. Es lógica pura (sin red ni pantalla): el anfitrión la mantiene en
// memoria, la actualiza con cada resultado y la envía a todos los participantes conectados.

export const TAMANOS_TORNEO = [4, 8, 16, 32];

/** Nombre de una ronda según el número de partidos que tiene. */
export function nombreRonda(partidos) {
  return { 1: 'Final', 2: 'Semifinales', 4: 'Cuartos de final', 8: 'Octavos de final', 16: 'Dieciseisavos' }[partidos] || `Ronda de ${partidos * 2}`;
}

/**
 * Crea la llave con los participantes ya ordenados (el anfitrión los baraja antes).
 * participantes: [{ id, nombre }], tamaño exacto del torneo (4, 8, 16 o 32).
 */
export function crearLlave(nombre, participantes, tam) {
  if (!TAMANOS_TORNEO.includes(tam)) throw new Error('Tamaño de torneo no válido.');
  if (participantes.length !== tam) throw new Error(`Faltan participantes (${participantes.length} de ${tam}).`);
  const primera = [];
  for (let i = 0; i < tam; i += 2) {
    primera.push({ id: `R1-${i / 2 + 1}`, a: participantes[i], b: participantes[i + 1], ga: null, gb: null, ganador: null });
  }
  return { nombre: String(nombre || 'Torneo').slice(0, 32), tam, rondas: [primera], campeon: null };
}

/** Partidos pendientes de jugar (con los dos participantes ya definidos). */
export function pendientes(llave) {
  const out = [];
  for (const ronda of llave.rondas) for (const p of ronda) if (!p.ganador && p.a && p.b) out.push(p);
  return out;
}

/**
 * Registra el resultado de un partido. Las eliminatorias no admiten empate.
 * Devuelve una llave nueva (no modifica la anterior).
 */
export function registrarResultado(llave, partidoId, ga, gb) {
  const n = Number(ga), m = Number(gb);
  if (!Number.isInteger(n) || !Number.isInteger(m) || n < 0 || m < 0 || n > 30 || m > 30) throw new Error('Marcador no válido.');
  if (n === m) throw new Error('En una eliminatoria no puede haber empate: indica quién pasa.');
  const copia = JSON.parse(JSON.stringify(llave));
  const partido = copia.rondas.flat().find((p) => p.id === partidoId);
  if (!partido) throw new Error('Partido no encontrado.');
  if (partido.ganador) throw new Error('Ese partido ya tiene resultado.');
  if (!partido.a || !partido.b) throw new Error('Ese partido todavía no tiene a sus dos participantes.');
  partido.ga = n;
  partido.gb = m;
  partido.ganador = n > m ? partido.a : partido.b;
  return avanzar(copia);
}

/** Si una ronda está completa, crea la siguiente con los ganadores en orden. Cuando queda la final, hay campeón. */
function avanzar(llave) {
  const ultima = llave.rondas[llave.rondas.length - 1];
  if (ultima.length === 1 && ultima[0].ganador) { llave.campeon = ultima[0].ganador; return llave; }
  if (!ultima.every((p) => p.ganador)) return llave;
  const ganadores = ultima.map((p) => p.ganador);
  const siguiente = [];
  for (let i = 0; i < ganadores.length; i += 2) {
    siguiente.push({ id: `R${llave.rondas.length + 1}-${i / 2 + 1}`, a: ganadores[i], b: ganadores[i + 1], ga: null, gb: null, ganador: null });
  }
  llave.rondas.push(siguiente);
  return avanzar(llave);
}

// ------------------------------------------------------------------ Mensajes entre navegadores
// Todo lo que viaja por la conexión es JSON con un campo «t» (tipo). Se valida al recibirlo.
const TIPOS = {
  hola: ['nombre', 'clave'],
  bienvenida: ['sala', 'nombre'],
  rechazo: ['motivo'],
  participantes: ['lista', 'tam'],
  llave: ['llave'],
  // partida en línea 1 contra 1
  inicio: ['cfg'],
  estado: ['p', 'b', 'm'],
  evento: ['n', 'd'],
  entrada: ['mv', 'h', 'k'],
  fin: ['motivo'],
};

export function codificar(msg) {
  if (!TIPOS[msg.t]) throw new Error('Tipo de mensaje desconocido');
  return JSON.stringify(msg);
}

export function decodificar(texto) {
  let msg;
  try { msg = JSON.parse(texto); } catch (e) { return null; }
  if (!msg || typeof msg !== 'object' || !TIPOS[msg.t]) return null;
  for (const campo of TIPOS[msg.t]) if (!(campo in msg)) return null;
  return msg;
}
