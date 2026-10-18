import { TEAMS } from '../src/data/TeamsData.js';
import { tacticsFromStyle } from '../src/match/Tactics.js';
import { Match } from '../src/match/Match.js';
import { STATE, SIM_DT } from '../src/core/Config.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const kinds = {}; let total = 0, own = 0; const shots = {};
for (let g = 0; g < +(args.n || 10); g++) {
  const home = TEAMS[(g * 3) % 12], away = TEAMS[(g * 5 + 1) % 12];
  const m = new Match({ home, away, homeTactics: tacticsFromStyle(home.style), awayTactics: tacticsFromStyle(away.style), difficulty: args.diff || 'normal', halfMinutes: 5, userSide: null, seed: 50 + g });
  let last = null;
  m.on('shot', (d) => { last = { kind: d.kind, t: m.clock, dist: d.dist, team: d.team }; shots[d.kind] = (shots[d.kind] || 0) + 1; });
  m.on('goal', (d) => { total++; if (d.own) own++; const k = last && m.clock - last.t < 4 && last.team === d.team ? last.kind + (m.clock - last.t > 1.6 ? '+rebote' : '') : 'sin tiro'; kinds[k] = (kinds[k] || 0) + 1; if (args.v) console.log(m.clockText(), k, last ? last.dist.toFixed(1) : '', d.own ? 'PROPIA' : '', 'gk y:', m.ball.y.toFixed(2), 'z:', m.ball.z.toFixed(2)); });
  let steps = 0;
  while (m.state !== STATE.FULL_TIME && steps++ < 200000) m.step(SIM_DT);
}
console.log('goles', total, 'en propia', own, kinds, 'tiros', shots);
