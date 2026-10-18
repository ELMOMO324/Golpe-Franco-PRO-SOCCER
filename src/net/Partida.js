// Partida en línea 1 contra 1 (anfitrión autoritario).
//
// El anfitrión simula el partido con el motor de siempre. El invitado no simula: envía sus
// controles (movimiento, teclas mantenidas y pulsaciones) y muestra el estado que recibe.
//   · Anfitrión → invitado: estado de todos los jugadores y del balón (~20 veces por segundo)
//     y los eventos del partido (goles, faltas, medias partes…). Los valores numéricos se
//     interpolan en el invitado para que el movimiento se vea fluido.
//   · Invitado → anfitrión: sus controles (~30 veces por segundo).
// Solo se envían valores primitivos (números, textos, booleanos): el motor no se toca.

import { clamp } from '../core/MathUtils.js';
import { UserControl } from '../match/UserControl.js';

export const TASA_ESTADO = 0.05;     // segundos entre estados (20 Hz)
export const TASA_CONTROLES = 1 / 30;
export const RETRASO_VISTA = 0.09;   // segundos que el invitado mira hacia atrás para interpolar

/** Solo valores simples de un objeto (lo que se puede enviar por la red). */
export function primitivos(o) {
  const r = {};
  for (const k in o) {
    const v = o[k];
    const t = typeof v;
    if (t === 'number' || t === 'string' || t === 'boolean' || v === null) r[k] = v;
  }
  return r;
}

/** Evento del motor → formato enviable. Jugadores, equipos y balón se envían como índice. */
export function serializarEvento(v, m, prof = 0) {
  if (v === null || v === undefined) return v;
  if (typeof v !== 'object') return typeof v === 'function' ? undefined : v;
  if (m.roster.includes(v)) return { __p: m.roster.indexOf(v) };
  if (m.teams.includes(v)) return { __t: m.teams.indexOf(v) };
  if (v === m.ball) return { __b: 1 };
  if (prof > 2) return undefined;
  if (Array.isArray(v)) return v.slice(0, 40).map((x) => serializarEvento(x, m, prof + 1));
  const r = {};
  for (const k in v) {
    if (k === 'team' || k === 'match' || k === 'bus') continue;
    const s = serializarEvento(v[k], m, prof + 1);
    if (s !== undefined) r[k] = s;
  }
  return r;
}

/** Índice → referencia viva en la réplica del invitado. */
export function deserializarEvento(v, m) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => deserializarEvento(x, m));
  if ('__p' in v) return m.roster[v.__p] || null;
  if ('__t' in v) return m.teams[v.__t] || null;
  if ('__b' in v) return m.ball;
  const r = {};
  for (const k in v) r[k] = deserializarEvento(v[k], m);
  return r;
}

/** Mando del segundo humano en el anfitrión: lo que llega del invitado, con el mismo interfaz que Input. */
export class RemoteInput {
  constructor() {
    this.enabled = true;
    this.keys = new Set();          // acciones mantenidas
    this.pressedQ = new Set();      // pulsaciones de este paso
    this.releasedQ = new Set();
    this.move = { x: 0, z: 0 };
    this.aimVec = null;
    this.mouseMove = false;
  }

  aplicar(msg) {
    const nuevas = new Set(Array.isArray(msg.h) ? msg.h : []);
    for (const k of this.keys) if (!nuevas.has(k)) this.releasedQ.add(k);
    this.keys = nuevas;
    for (const k of Array.isArray(msg.k) ? msg.k : []) this.pressedQ.add(k);
    const mv = msg.mv || { x: 0, z: 0 };
    this.move = { x: clamp(Number(mv.x) || 0, -1, 1), z: clamp(Number(mv.z) || 0, -1, 1) };
  }

  down(a) { return this.enabled && this.keys.has(a); }
  pressed(a) { return this.enabled && this.pressedQ.has(a); }
  released(a) { return this.enabled && this.releasedQ.has(a); }
  endStep() { this.pressedQ.clear(); this.releasedQ.clear(); }
}

/** Anfitrión: simula, controla al invitado y envía estado y eventos. */
export class PartidaAnfitrion {
  constructor(sala, m) {
    this.anfitrion = true;
    this.invitado = false;
    this.sala = sala;
    this.m = m;
    this.acc = 0;
    this.input = new RemoteInput();
    m.guestUser = new UserControl(m, this.input, true);
    m.onNetEvent = (tipo, datos) => this.evento(tipo, datos);
    sala.onMensaje = (msg) => this.recibir(msg);
  }

  recibir(msg) {
    if (msg && msg.t === 'entrada') this.input.aplicar(msg);
  }

  /** Llamar en cada frame con el partido en marcha: envía el estado a 20 Hz. */
  tick(dt) {
    this.acc += dt;
    if (this.acc < TASA_ESTADO) return;
    this.acc = 0;
    this.enviarEstado();
  }

  enviarEstado() {
    const m = this.m;
    const idx = (p) => (p ? m.roster.indexOf(p) : -1);
    this.sala.enviar({
      t: 'estado',
      p: m.roster.map(primitivos),
      b: primitivos(m.ball),
      m: {
        state: m.state, stateT: m.stateT, clock: m.clock, time: m.time, half: m.half,
        marcador: [m.teams[0].score, m.teams[1].score],
        ctl: [idx(m.controlled), idx(m.guestCtl)],
      },
    });
  }

  evento(tipo, datos) {
    this.sala.enviar({ t: 'evento', n: tipo, d: serializarEvento(datos, this.m) });
  }
}

/** Invitado: no simula. Envía sus controles y muestra el estado del anfitrión interpolado. */
export class PartidaInvitado {
  constructor(sala, m) {
    this.anfitrion = false;
    this.invitado = true;
    this.sala = sala;
    this.m = m;
    this.estados = [];   // [{ ts, s }] los últimos estados recibidos
    this.kAcc = new Set();
    this.controlAcc = 0;
    sala.onMensaje = (msg, conn) => this.recibir(msg, conn);
  }

  /** Mensajes del anfitrión. `ahora` en ms (inyectable para pruebas). */
  recibir(msg, _conn, ahora = performance.now()) {
    if (!msg) return;
    if (msg.t === 'estado') {
      this.estados.push({ ts: ahora, s: msg });
      if (this.estados.length > 30) this.estados.shift();
    } else if (msg.t === 'evento') {
      this.m.emit(msg.n, deserializarEvento(msg.d, this.m));
    }
  }

  /** Cada frame: aplica el estado interpolado y envía los controles locales. */
  frame(ahora, input, dt) {
    this.aplicar(ahora);
    for (const k of input.pressedQ) this.kAcc.add(k);
    this.controlAcc += dt;
    if (this.controlAcc >= TASA_CONTROLES) {
      this.controlAcc = 0;
      const mv = input.move || { x: 0, z: 0 };
      const held = [...input.keys];
      if (input.padHeld) held.push(...input.padHeld);
      this.sala.enviar({ t: 'entrada', mv: { x: mv.x, z: mv.z }, h: held, k: [...this.kAcc] });
      this.kAcc.clear();
    }
    input.endStep();
  }

  /** Escribe en la réplica el estado del momento de visualización (con un poco de retraso). */
  aplicar(ahora) {
    const q = this.estados;
    if (!q.length) return;
    const t = ahora - RETRASO_VISTA * 1000;
    let a = q[0], b = q[0];
    if (t >= q[q.length - 1].ts) { a = b = q[q.length - 1]; }
    else {
      for (let i = 0; i < q.length - 1; i++) {
        if (q[i].ts <= t && t <= q[i + 1].ts) { a = q[i]; b = q[i + 1]; break; }
      }
    }
    const f = b.ts > a.ts ? clamp((t - a.ts) / (b.ts - a.ts), 0, 1) : 1;
    const m = this.m;
    const mezcla = (ia, ib, destino) => {
      for (const k in ib) {
        const vb = ib[k];
        const va = ia ? ia[k] : undefined;
        const angular = /face|head|dir|angle|yaw/i.test(k);
        if (typeof vb === 'number' && typeof va === 'number' && !angular) destino[k] = va + (vb - va) * f;
        else destino[k] = vb;
      }
    };
    const sa = a.s, sb = b.s;
    m.roster.forEach((p, i) => mezcla(sa.p[i], sb.p[i], p));
    mezcla(sa.b, sb.b, m.ball);
    m.state = sb.m.state;
    m.stateT = sb.m.stateT;
    m.clock = sb.m.clock;
    m.time = sb.m.time;
    m.half = sb.m.half;
    m.teams[0].score = sb.m.marcador[0];
    m.teams[1].score = sb.m.marcador[1];
    // Perspectiva del invitado: su jugador es el de la izquierda de la lista de controles
    const [ctlAnfitrion, ctlInvitado] = sb.m.ctl;
    m.controlled = ctlInvitado >= 0 ? m.roster[ctlInvitado] : null;
    m.guestCtl = ctlAnfitrion >= 0 ? m.roster[ctlAnfitrion] : null;
  }
}
