// "Usuario" automático muy simple para comprobar que los controles producen fútbol:
// conduce hacia portería, pasa cuando le presionan, tira cerca del área y entra al rival.
import { TEAMS } from '../src/data/TeamsData.js';
import { tacticsFromStyle } from '../src/match/Tactics.js';
import { Match } from '../src/match/Match.js';
import { UserControl } from '../src/match/UserControl.js';
import { laneRisk } from '../src/match/Actions.js';
import { carrierAI } from '../src/match/PlayerAI.js';
import { STATE, SIM_DT, PITCH } from '../src/core/Config.js';

class Bot {
  constructor() { this.keys = new Set(); this.p = new Set(); this.rel = new Set(); this._m = { x: 0, z: 0 }; this.hold = {}; }
  get move() { return this._m; }
  down(a) { return this.keys.has(a); } pressed(a) { return this.p.has(a); } released(a) { return this.rel.has(a); }
  endStep() { this.p.clear(); this.rel.clear(); }
  press(a, dur = 0.05) { if (this.keys.has(a)) return; this.keys.add(a); this.p.add(a); this.hold[a] = dur; }
  tick(dt) { for (const a in this.hold) { this.hold[a] -= dt; if (this.hold[a] <= 0) { this.keys.delete(a); this.rel.add(a); delete this.hold[a]; } } }
}
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const N = +(args.n || 4);
let tot = { gf: 0, ga: 0, shots: 0, pass: 0, passOk: 0, tackles: 0, fouls: 0 };
for (let g = 0; g < N; g++) {
  const home = TEAMS[(g * 2) % 12], away = TEAMS[(g * 2 + 5) % 12];
  const m = new Match({ home, away, homeTactics: tacticsFromStyle(home.style), awayTactics: tacticsFromStyle(away.style), difficulty: args.diff || 'normal', halfMinutes: 4, userSide: 0, seed: 300 + g });
  const inp = new Bot();
  m.user = new UserControl(m, inp);
  const u = m.teams[0];
  if (args.aiattack) {
    // Ataque decidido por la IA; defensa en manos del usuario automático
    const orig = m.user.update.bind(m.user);
    m.user.update = (dt) => {
      const p = m.controlled;
      if (p && m.ball.owner === p && m.state === 'PLAYING' && !p.isGK) { m.user.idle = true; if (p.state === 'free') carrierAI(m, p, m.ais[0], dt); inp.endStep(); return; }
      if (p && m.setPiece && m.setPiece.taker === p) { inp.endStep(); if (m.setPiece.t > 1.5 && p.state === 'free' && !m.setPiece.tried) { m.setPiece.tried = m.setPiece.t; m.rules.aiTake(m.setPiece); } return; }
      orig(dt);
    };
  }
  let lock = 0, cool = 0, steps = 0, switches = 0, ctrlTime = 0, ballTime = 0;
  const kinds = {};
  m.on('kick', (d) => { if (d.player.team === u) kinds[d.type] = (kinds[d.type] || 0) + 1; });
  let cur = null; const outc = {};
  const close = (o) => { if (cur) { outc[o] = (outc[o] || 0) + 1; if (args.v) console.log(`   pase d=${cur.d.toFixed(0)} v=${cur.v.toFixed(0)} tgt=${cur.tgt} pres=${cur.pres.toFixed(1)} -> ${o} (${(m.clock - cur.t).toFixed(1)}s)`); cur = null; } };
  m.on('kick', (d) => { close('otro golpeo:' + d.type); if (d.player.team === u && d.type === 'pass') { const t = m.ball.passTarget; cur = { t: m.clock, d: t ? Math.hypot(t.x - m.ball.x, t.z - m.ball.z) : 0, v: d.speed, tgt: t ? t.role : 'NADIE', pres: 0 }; let near = 9; for (const o of u.opponent.players) near = Math.min(near, Math.hypot(o.x - d.player.x, o.z - d.player.z)); cur.pres = near; } });
  m.on('control', (d) => close(d.player.team === u ? 'OK' : 'rival'));
  m.on('out', () => close('fuera')); m.on('foul', () => close('falta')); m.on('offside', () => close('fdj'));
  m.on('touch', (d) => { if (cur && d.player.team !== u) close('rechace rival'); });
  m.on('fullTime', () => console.log('   resultados de pase:', JSON.stringify(outc)));
  let gain = null; const how = {};
  m.on('control', (d) => { if (d.player.team !== u) { if (!gain) gain = { t: m.clock, x: d.player.x * u.dir, steal: d.steal, from: m.lastUserAct || '?', who: d.player.role }; } else gain = null; });
  m.on('kick', (d) => { if (d.player.team === u) m.lastUserAct = d.type + (d.player.isGK ? ':GK' : ''); });
  m.on('shot', (d) => { if (d.team !== u && gain) { const k = `${gain.from}${gain.steal ? ':robo' : ''}`; how[k] = (how[k] || 0) + 1; if (args.trace) console.log(`   TIRO rival ${m.clockText()} tras ${(m.clock - gain.t).toFixed(1)}s, recuperó en u=${gain.x.toFixed(0)} (${gain.who}) origen=${k} dist=${d.dist.toFixed(0)}`); gain = null; } });
  m.on('fullTime', () => console.log('   origen de los tiros rivales:', JSON.stringify(how)));
  while (m.state !== STATE.FULL_TIME && steps++ < 200000) {
    inp.tick(SIM_DT);
    const p = m.controlled, b = m.ball;
    cool -= SIM_DT;
    if (p) {
      const dir = u.dir, gx = PITCH.HL * dir;
      const has = b.owner === p;
      const sp = m.setPiece;
      if (m.state === STATE.PLAYING) ctrlTime += SIM_DT;
      if (has) {
        ballTime += SIM_DT;
        const dg = Math.hypot(gx - p.x, p.z);
        let near = 99; for (const o of u.opponent.players) near = Math.min(near, Math.hypot(o.x - p.x, o.z - p.z));
        const ang = Math.atan2(-p.z * 0.4, gx - p.x);
        if (lock > 0) { lock -= SIM_DT; } else { inp._m.x = Math.cos(ang); inp._m.z = Math.sin(ang); }
        inp.keys.add('sprint');
        if (cool <= 0) {
          if (sp && sp.taker === p) { inp.press(sp.type === 'PENALTY' || (sp.type === 'FREE_KICK' && sp.direct) ? 'shoot' : sp.type === 'CORNER' ? 'lob' : 'pass', 0.3); cool = 1; }
          else if (dg < 20 && Math.abs(p.z) < 16) { inp.press('shoot', 0.25 + Math.random() * 0.3); cool = 0.8; }
          else if (near < 3.2) {
            // Apunta al compañero más libre, como haría una persona
            let best = null, bs = -1e9;
            for (const t of u.players) {
              if (t === p || t.isGK) continue;
              const d = Math.hypot(t.x - p.x, t.z - p.z); if (d < 5 || d > 30) continue;
              let od = 99; for (const o of u.opponent.players) od = Math.min(od, Math.hypot(o.x - t.x, o.z - t.z));
              const sc = Math.min(od, 8) - laneRisk(u, p.x, p.z, t.x, t.z, 15) * 6 + (t.x - p.x) * dir * 0.06;
              if (sc > bs) { bs = sc; best = t; }
            }
            if (best) { const a2 = Math.atan2(best.z - p.z, best.x - p.x); inp._m.x = Math.cos(a2); inp._m.z = Math.sin(a2); lock = 0.2; }
            inp.press('pass', 0.08); cool = 0.4;
          }
          else if (p.u > 30 && Math.abs(p.v) > 16) { inp.press('lob', 0.3); cool = 0.6; }
        }
      } else {
        const tx = b.owner ? b.owner.x : b.x, tz = b.owner ? b.owner.z : b.z;
        const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1;
        inp._m.x = dx / d; inp._m.z = dz / d;
        inp.keys.add('sprint');
        if (args.idle && !b.owner && b.passTarget === p) { inp._m.x = 0; inp._m.z = 0; }
        if (args.nodef) { inp._m.x = 0; inp._m.z = 0; inp.keys.delete('sprint'); }
        else if (b.owner && b.owner.team !== u && d < 1.7 && cool <= 0 && !args.notackle) { inp.press('pass', 0.05); cool = 0.9; }
        if (d > 16 && cool <= 0 && m.possession !== u && !args.noswitch && !args.nodef) { inp.press('switch', 0.05); cool = 0.6; switches++; }
      }
    }
    m.step(SIM_DT);
  }
  const s = u.stats;
  console.log(`#${g} ${home.short} ${m.teams[0].score}-${m.teams[1].score} ${away.short} | usuario: tiros ${s.shots}(${s.onTarget}) pases ${s.passesOk}/${s.passes} entradas ${s.tackles} faltas ${s.fouls} córn ${s.corners} | con balón ${(ballTime / ctrlTime * 100).toFixed(0)}% | cambios ${switches} | ${JSON.stringify(kinds)}`);
  { const o = m.teams[1].stats; console.log(`      rival: tiros ${o.shots}(${o.onTarget}) pases ${o.passesOk}/${o.passes} paradas nuestras ${u.stats.saves} penaltis/faltas sufridas ${u.stats.fouls} rojas ${u.stats.red} jugadores ${u.players.length}`); }
  tot.gf += m.teams[0].score; tot.ga += m.teams[1].score; tot.shots += s.shots; tot.pass += s.passes; tot.passOk += s.passesOk; tot.tackles += s.tackles; tot.fouls += s.fouls;
}
console.log('TOTAL', JSON.stringify(tot));
