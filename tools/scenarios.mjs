// Situaciones forzadas: penaltis, faltas directas, córners y saques con usuario e IA.
import { TEAMS } from '../src/data/TeamsData.js';
import { tacticsFromStyle } from '../src/match/Tactics.js';
import { Match } from '../src/match/Match.js';
import { UserControl } from '../src/match/UserControl.js';
import { STATE, SIM_DT, PITCH } from '../src/core/Config.js';

class Keys {
  constructor() { this.keys = new Set(); this.p = new Set(); this.rel = new Set(); this._m = { x: 0, z: 0 }; this.hold = {}; }
  get move() { return this._m; }
  down(a) { return this.keys.has(a); } pressed(a) { return this.p.has(a); } released(a) { return this.rel.has(a); }
  endStep() { this.p.clear(); this.rel.clear(); }
  press(a, dur) { this.keys.add(a); this.p.add(a); this.hold[a] = dur; }
  tick(dt) { for (const a in this.hold) { this.hold[a] -= dt; if (this.hold[a] <= 0) { this.keys.delete(a); this.rel.add(a); delete this.hold[a]; } } }
}
function mk(userSide, seed) {
  const home = TEAMS[1], away = TEAMS[6];
  const m = new Match({ home, away, homeTactics: tacticsFromStyle(home.style), awayTactics: tacticsFromStyle(away.style), difficulty: 'normal', halfMinutes: 5, userSide, seed });
  const inp = new Keys();
  if (userSide !== null) m.user = new UserControl(m, inp);
  const log = [];
  m.on('*', (d, t) => { if (['goal', 'save', 'out', 'setPiece', 'restart', 'post', 'foul', 'card', 'offside'].includes(t)) log.push(t + (d && d.kind ? ':' + d.kind : d && d.type ? ':' + d.type : '')); });
  const run = (sec, each) => { for (let i = 0; i < sec * 60; i++) { inp.tick(SIM_DT); if (each) each(i / 60); m.step(SIM_DT); } };
  run(4); // saque inicial y algo de juego
  return { m, inp, log, run };
}
function penalty(userSide, who, seed) {
  const { m, inp, log, run } = mk(userSide, seed);
  // Falta del defensor dentro de su área sobre un atacante del equipo "who"
  const att = m.teams[who], def = att.opponent;
  const a = att.players[9], d = def.players[3];
  const gx = PITCH.HL * att.dir;
  while (m.state !== STATE.PLAYING) run(0.2);
  a.x = gx - att.dir * 8; a.z = 2; d.x = a.x - att.dir; d.z = 2.5;
  log.length = 0;
  m.rules.foul(d, a, { slide: true, behind: false });
  const takerIsUser = m.userTeam === att;
  let pressed = false;
  run(12, () => {
    if (m.state === 'PENALTY' && takerIsUser && !pressed && m.setPiece.t > 1) { inp._m.z = 1; inp.press('shoot', 0.35); pressed = true; }
    if (m.state === 'PENALTY' && m.userTeam === def) inp._m.z = -1;
  });
  return `${takerIsUser ? 'lanza USUARIO' : m.userTeam === def ? 'para USUARIO' : 'IA vs IA'} -> ${log.join(' ')} | estado ${m.state} marcador ${m.teams[0].score}-${m.teams[1].score}`;
}
console.log('PENALTIS');
for (let s = 0; s < 4; s++) console.log('  ' + penalty(null, 0, 10 + s));
for (let s = 0; s < 4; s++) console.log('  ' + penalty(0, 0, 20 + s));
for (let s = 0; s < 3; s++) console.log('  ' + penalty(0, 1, 30 + s));

function freeKick(userSide, seed, x, z) {
  const { m, inp, log, run } = mk(userSide, seed);
  const att = m.teams[0], def = att.opponent;
  while (m.state !== STATE.PLAYING) run(0.2);
  const a = att.players[8], d = def.players[4];
  a.x = x; a.z = z; d.x = x - 1; d.z = z + 0.5;
  log.length = 0;
  m.rules.foul(d, a, { slide: false, behind: false });
  let pressed = false, info = '';
  run(10, () => {
    const sp = m.setPiece;
    if (sp && sp.type === 'FREE_KICK' && !info) info = `directa=${sp.direct} lanzador=${sp.taker.data.short} barrera=${def.players.filter((q) => q.ai.wall).length}`;
    if (sp && sp.type === 'FREE_KICK' && userSide === 0 && !pressed && sp.t > 1) { inp.press('shoot', 0.45); pressed = true; }
  });
  return `${userSide === 0 ? 'USUARIO' : 'IA'} (${x},${z}) ${info} -> ${log.join(' ')} | ${m.state} ${m.teams[0].score}-${m.teams[1].score}`;
}
console.log('FALTAS');
for (let s = 0; s < 3; s++) console.log('  ' + freeKick(null, 40 + s, 30, 4 - s * 4));
for (let s = 0; s < 3; s++) console.log('  ' + freeKick(0, 50 + s, 31, -3 + s * 3));
console.log('  ' + freeKick(null, 60, -20, 10));

function corner(userSide, seed) {
  const { m, inp, log, run } = mk(userSide, seed);
  while (m.state !== STATE.PLAYING) run(0.2);
  const att = m.teams[0];
  log.length = 0;
  const b = m.ball;
  b.owner = null; b.x = PITCH.HL * att.dir - att.dir * 0.2; b.z = 20; b.vx = att.dir * 6; b.vz = 0; b.y = 0.11; b.vy = 0;
  b.lastTouch = att.opponent.players[2]; b.passTarget = null; b.kickType = 'tackle';
  let pressed = false;
  run(12, () => { const sp = m.setPiece; if (sp && sp.type === 'CORNER' && userSide === 0 && !pressed && sp.t > 1) { inp.press('lob', 0.2 + Math.random() * 0.5); pressed = true; } });
  return `${userSide === 0 ? 'USUARIO' : 'IA'} -> ${log.join(' ')} | ${m.state} ${m.teams[0].score}-${m.teams[1].score}`;
}
console.log('CÓRNERS');
for (let s = 0; s < 4; s++) console.log('  ' + corner(s % 2 ? 0 : null, 70 + s));
