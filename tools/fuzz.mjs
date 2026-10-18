// Prueba de estrés: un "usuario" que pulsa teclas al azar durante partidos completos.
import { TEAMS } from '../src/data/TeamsData.js';
import { tacticsFromStyle } from '../src/match/Tactics.js';
import { Match } from '../src/match/Match.js';
import { UserControl } from '../src/match/UserControl.js';
import { FORMATION_NAMES } from '../src/data/Formations.js';
import { STATE, SIM_DT } from '../src/core/Config.js';
import { RNG } from '../src/core/MathUtils.js';

class FakeInput {
  constructor(seed) { this.r = new RNG(seed); this.keys = new Set(); this.p = new Set(); this.rel = new Set(); this._m = { x: 0, z: 0 }; this.t = 0; }
  tick() {
    const r = this.r;
    for (const a of ['pass', 'through', 'lob', 'shoot', 'chip', 'shield', 'feint', 'switch', 'sprint']) {
      if (this.keys.has(a)) { if (r.chance(0.08)) { this.keys.delete(a); this.rel.add(a); } }
      else if (r.chance(a === 'sprint' ? 0.05 : 0.012)) { this.keys.add(a); this.p.add(a); }
    }
    if (r.chance(0.03)) { const a = r.range(0, 6.283); this._m.x = Math.cos(a); this._m.z = Math.sin(a); if (r.chance(0.2)) { this._m.x = 0; this._m.z = 0; } }
  }
  get move() { return this._m; }
  down(a) { return this.keys.has(a); } pressed(a) { return this.p.has(a); } released(a) { return this.rel.has(a); }
  endStep() { this.p.clear(); this.rel.clear(); }
}
const N = +(process.argv[2] || 6);
for (let g = 0; g < N; g++) {
  const home = TEAMS[g % 12], away = TEAMS[(g * 7 + 5) % 12];
  const m = new Match({ home, away, homeTactics: tacticsFromStyle(home.style), awayTactics: tacticsFromStyle(away.style), difficulty: ['facil', 'normal', 'dificil', 'experto'][g % 4], halfMinutes: 3, userSide: g % 2, seed: 900 + g });
  const inp = new FakeInput(77 + g);
  m.user = new UserControl(m, inp);
  let steps = 0; const ev = {};
  m.on('*', (d, t) => { ev[t] = (ev[t] || 0) + 1; });
  while (m.state !== STATE.FULL_TIME && steps++ < 200000) {
    inp.tick();
    m.step(SIM_DT);
    if (steps % 3000 === 0) { const t = m.teams[g % 2]; t.setFormation(FORMATION_NAMES[(steps / 3000 + g) % FORMATION_NAMES.length]); t.tactics.mentality = (steps / 3000) % 5 - 2; }
    const b = m.ball;
    if (!Number.isFinite(b.x + b.y + b.z)) throw new Error('NaN balón');
    for (const p of m.active) if (!Number.isFinite(p.x + p.z + p.facing)) throw new Error('NaN jugador');
    if (m.userTeam && (!m.controlled || m.controlled.team !== m.userTeam || m.controlled.sentOff)) throw new Error('control inválido en ' + m.state);
  }
  console.log(`#${g} ${home.short} ${m.teams[0].score}-${m.teams[1].score} ${away.short} usuario=${g % 2} pasos=${steps} estado=${m.state} faltas=${ev.foul || 0} rojas=${m.teams[0].stats.red + m.teams[1].stats.red} pen=${(ev.setPiece || 0)} fdj=${ev.offside || 0}`);
}
