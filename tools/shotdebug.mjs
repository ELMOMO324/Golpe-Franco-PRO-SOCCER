import { TEAMS } from '../src/data/TeamsData.js';
import { tacticsFromStyle } from '../src/match/Tactics.js';
import { Match } from '../src/match/Match.js';
import { STATE, SIM_DT } from '../src/core/Config.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
let tot = { n: 0, on: 0, goal: 0 }; const byKind = {}; const distB = {};
for (let g = 0; g < +(args.n || 3); g++) {
  const home = TEAMS[(g * 3) % 12], away = TEAMS[(g * 5 + 1) % 12];
  const m = new Match({ home, away, homeTactics: tacticsFromStyle(home.style), awayTactics: tacticsFromStyle(away.style), difficulty: args.diff || 'normal', halfMinutes: 5, userSide: null, seed: 50 + g });
  let cur = null;
  const close = (out) => { if (!cur) return; const k = cur.kind; byKind[k] = byKind[k] || { n: 0, on: 0, goal: 0 }; byKind[k].n++; if (cur.on) byKind[k].on++; if (out === 'GOL') byKind[k].goal++; const db = Math.min(4, Math.floor(cur.dist / 8)); distB[db] = distB[db] || { n: 0, on: 0, goal: 0 }; distB[db].n++; if (cur.on) distB[db].on++; if (out === 'GOL') distB[db].goal++; tot.n++; if (cur.on) tot.on++; if (out === 'GOL') tot.goal++; if (args.v) console.log(`${m.clockText()} ${cur.kind.padEnd(7)} d=${cur.dist.toFixed(1)} xg=${cur.xg.toFixed(2)} v=${cur.speed.toFixed(0)} ${cur.on ? 'a puerta' : 'fuera   '} -> ${out} gk@${cur.gk}`); cur = null; };
  let lastSpeed = 0;
  m.on('kick', (d) => { lastSpeed = d.speed; });
  m.on('shot', (d) => { close('?'); const gk = d.team.opponent.gk; cur = { kind: d.kind, dist: d.dist, xg: d.xg, on: d.onTarget, speed: 0, gk: `${Math.hypot(gk.x - 52.5 * d.team.dir, gk.z).toFixed(1)}`, t: m.clock }; setTimeout(() => {}, 0); });
  m.on('kick', (d) => { if (cur && cur.speed === 0 && d.type === 'shot') cur.speed = d.speed; else if (cur && d.type !== 'shot') close('rechace/' + d.type); });
  m.on('goal', (d) => close('GOL'));
  m.on('save', (d) => close(d.catch ? 'blocaje' : d.claim ? 'salida' : 'despeje del portero'));
  m.on('out', (d) => close('fuera ' + d.kind));
  m.on('control', (d) => close('controla ' + (d.player.isGK ? 'portero' : d.player.role)));
  m.on('touch', (d) => { if (d.block) close('bloqueo'); });
  let steps = 0;
  while (m.state !== STATE.FULL_TIME && steps++ < 200000) m.step(SIM_DT);
  console.log(home.short, m.teams[0].score, '-', m.teams[1].score, away.short);
}
console.log('total', tot, 'por tipo', byKind); console.log('por distancia (x8m)', distB);
