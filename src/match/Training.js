// Modo entrenamiento: situaciones fijas sobre el mismo motor de partido.
// Cada intento empieza con un saque preparado y termina con un resultado
// (gol, parada, fuera, interceptado…). El portero se ajusta con su nivel.

import { PITCH, STATE } from '../core/Config.js';
import { clamp } from '../core/MathUtils.js';
import { DIFFICULTIES } from './Tactics.js';

const { HL } = PITCH;

export const TRAINING = {
  penalty: { name: 'PENALTIS', desc: 'Penaltis contra el portero. Marca cuando el balón entra.', attempts: 10 },
  freekick: { name: 'TIROS DESDE FUERA', desc: 'Faltas directas a unos 22 m de la portería. Marca cuando el balón entra.', attempts: 10 },
  longpass: { name: 'PASES LARGOS', desc: 'Pasa a un compañero dentro de la zona marcada, a 25 m o más de distancia.', attempts: 10 },
};

export const KEEPER_LEVELS = ['NOVATO', 'AMATEUR', 'PROFESIONAL', 'ÉLITE', 'LEYENDA'];

/** Perfil de la IA rival con un portero de nivel 1 a 5 (los demás parámetros son los de «normal»). */
export function keeperProfile(level) {
  const i = clamp(Math.round(level) - 1, 0, 4);
  return {
    ...DIFFICULTIES.normal,
    id: 'entreno',
    gkReaction: [0.5, 0.3, 0.15, 0.06, 0][i],
    gkPosError: [1.3, 0.9, 0.6, 0.3, 0.12][i],
    gkReach: [0.84, 0.89, 0.93, 0.97, 1.02][i],
  };
}

export class Trainer {
  constructor(m, cfg) {
    this.m = m;
    this.kind = cfg.kind;
    this.session = cfg.session;
    this.active = false;
    this.done = false;
    this.t = 0;
    this.shot = null;
    this.passer = null;
    this.origin = { x: 0, z: 0 };
    m.on('shot', (d) => {
      if (this.active && !this.done && d.team === m.userTeam && !this.shot) this.shot = { t: 0, on: !!d.onTarget };
    });
    m.on('goal', (d) => {
      if (this.active && !this.done && d.team === m.userTeam) this.finish('¡GOL!', true);
    });
    // Último que golpeó el balón: el pase largo cuenta si llega a la zona bajo control del equipo
    m.on('kick', (d) => { this.lastKicker = d.player; });
    m.on('save', (d) => {
      if (this.active && !this.done && this.shot && d.gk && d.gk.team !== m.userTeam) this.finish('PARADA', false);
    });
  }

  /** Saque preparado del intento (se llama al empezar cada intento). */
  nextSetPiece() {
    const m = this.m, team = m.userTeam, dir = team.dir;
    if (this.kind === 'penalty') {
      this.origin = { x: (HL - 11) * dir, z: 0 };
      return { type: 'PENALTY', team, x: 0, z: 0 };
    }
    if (this.kind === 'freekick') {
      this.origin = { x: (HL - 22) * dir, z: 0 };
      return { type: 'FREE_KICK', team, x: this.origin.x, z: 0, indirect: false };
    }
    this.origin = { x: (-HL + 30) * dir, z: 0 };
    return { type: 'FREE_KICK', team, x: this.origin.x, z: 0, indirect: true };
  }

  start() {
    this.active = true;
    this.t = 0;
    if (this.kind === 'longpass') {
      // Ejercicio de pase: los rivales no cortan la línea
      const m = this.m, dir = m.userTeam.dir;
      // Rivales parados a los lados: dejan libre la franja central por la que se pasa
      let i = 0;
      for (const p of m.userTeam.opponent.players) {
        if (p.isGK) continue;
        const lado = i % 2 ? 1 : -1, fila = Math.floor(i / 2);
        p.place(dir * (32 + (fila % 3) * 4), lado * (23 + Math.floor(fila / 3) * 7), dir > 0 ? Math.PI : 0);
        p.fixed = true;
        i++;
      }
    }
  }

  /** Zona de destino del pase largo: en campo rival, dentro de la franja central (a 25 m o más del pasador). */
  inZone(p) {
    const dir = this.m.userTeam.dir;
    const u = p.x * dir;
    const lejos = Math.hypot(p.x - this.origin.x, p.z - this.origin.z) >= 25;
    return u >= 8 && u <= 42 && Math.abs(p.z) < 18 && lejos;
  }

  update(dt) {
    if (!this.active || this.done) return;
    const m = this.m;
    this.t += dt;
    if (this.kind === 'longpass') {
      const ow = m.ball.owner;
      if (m.state === STATE.BALL_OUT) return this.finish('FUERA', false);
      if (m.state === STATE.FOUL || m.state === STATE.OFFSIDE) return this.finish('FALTA', false);
      if (ow && ow.team !== m.userTeam) return this.finish(ow.isGK ? 'LO RECOGE EL PORTERO' : 'INTERCEPTADO', false);
      if (ow && ow.team === m.userTeam && !ow.isGK && ow !== this.passer) {
        if (this.passer && this.inZone(ow)) return this.finish('¡ACIERTO!', true);
        this.passer = ow;
      }
      // El balón parado o lento dentro de la zona, tras un golpe de nuestro equipo, cuenta como acierto
      if (!ow && this.lastKicker && this.lastKicker.team === m.userTeam && this.passer
          && this.lastKicker !== this.passer && Math.hypot(m.ball.vx, m.ball.vz) < 3
          && this.inZone({ x: m.ball.x, z: m.ball.z })) return this.finish('¡ACIERTO!', true);
      if (this.t > 12) this.finish('TIEMPO', false);
      return;
    }
    if (this.shot) {
      this.shot.t += dt;
      if (this.shot.t > 3.5) this.finish(this.shot.on ? 'PARADA' : 'FUERA', false);
    } else if (this.t > 15) {
      this.finish('NO TIRÓ', false);
    }
  }

  finish(label, ok) {
    if (this.done) return;
    this.done = true;
    this.session.results.push({ label, ok });
    this.m.emit('trainingEnd', { label, ok, session: this.session });
  }
}
