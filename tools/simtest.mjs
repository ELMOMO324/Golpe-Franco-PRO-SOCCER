// Banco de pruebas sin gráficos: juega partidos completos IA contra IA y
// comprueba que no hay bloqueos ni valores inválidos.
import { TEAMS } from '../src/data/TeamsData.js';
import { tacticsFromStyle } from '../src/match/Tactics.js';
import { Match } from '../src/match/Match.js';
import { STATE, SIM_DT } from '../src/core/Config.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const N = +(args.n || 4), diff = args.diff || 'normal', mins = +(args.min || 5), verbose = !!args.v;
const seed0 = +(args.seed || 1000);

function run(i) {
  const home = TEAMS[(i * 5 + (+(args.h || 0))) % 12], away = TEAMS[(i * 7 + 3 + (+(args.a || 0))) % 12 === (i * 5 + (+(args.h || 0))) % 12 ? (i * 7 + 4) % 12 : (i * 7 + 3 + (+(args.a || 0))) % 12];
  const m = new Match({
    home, away, homeTactics: tacticsFromStyle(home.style), awayTactics: tacticsFromStyle(away.style),
    difficulty: diff, halfMinutes: mins, userSide: null, seed: seed0 + i, profiles: args.vs ? args.vs.split(',') : undefined,
  });
  const ev = {};
  m.on('*', (d, type) => { ev[type] = (ev[type] || 0) + 1; if (verbose && ['goal', 'foul', 'card', 'offside', 'out', 'save', 'post'].includes(type)) console.log(`  ${m.clockText()} ${type}`, d && d.kind ? d.kind : '', d && d.player ? d.player.data.short : d && d.scorer ? d.scorer.data.short : ''); });
  const stateTime = {};
  let stuck = 0, maxStuck = 0, lastState = null, steps = 0, ownerNull = 0;
  let ballStill = 0, maxBallStill = 0;
  const kicks = {};
  m.on('kick', (d) => { kicks[d.type] = (kicks[d.type] || 0) + 1; });
  const t0 = Date.now();
  while (m.state !== STATE.FULL_TIME && steps < 60 * 60 * 40) {
    m.step(SIM_DT);
    steps++;
    stateTime[m.state] = (stateTime[m.state] || 0) + SIM_DT;
    if (m.state === lastState) { stuck += SIM_DT; if (stuck > maxStuck) maxStuck = stuck; } else { if (stuck > 20 && lastState !== 'PLAYING') console.log('  !! estado largo', lastState, stuck.toFixed(1)); stuck = 0; lastState = m.state; }
    const b = m.ball;
    if (!Number.isFinite(b.x + b.y + b.z + b.vx + b.vy + b.vz)) throw new Error('NaN en el balón en el paso ' + steps);
    for (const p of m.active) if (!Number.isFinite(p.x + p.z + p.vx + p.vz + p.facing)) throw new Error('NaN en jugador ' + p.data.name + ' estado ' + p.state);
    if (m.state === 'PLAYING') {
      if (!b.owner && b.speed < 0.05) { ballStill += SIM_DT; if (ballStill > maxBallStill) maxBallStill = ballStill; } else ballStill = 0;
    }
  }
  const [h, a] = m.teams;
  const poss = m.possessionPct();
  const row = (t) => `${t.stats.shots}(${t.stats.onTarget}) pases ${t.stats.passesOk}/${t.stats.passes} faltas ${t.stats.fouls} córn ${t.stats.corners} fdj ${t.stats.offsides} TA ${t.stats.yellow} TR ${t.stats.red} paradas ${t.stats.saves} entr ${t.stats.tackles}`;
  console.log(`#${i} ${home.short} ${h.score}-${a.score} ${away.short}  [${diff}] pos ${poss[0]}-${poss[1]}  (${((Date.now() - t0) / 1000).toFixed(1)}s, ${steps} pasos)`);
  console.log(`   ${home.short}: tiros ${row(h)}`);
  console.log(`   ${away.short}: tiros ${row(a)}`);
  console.log('   golpeos:', JSON.stringify(kicks));
  console.log('   eventos:', JSON.stringify(Object.fromEntries(Object.entries(ev).filter(([k]) => !['kick', 'state', 'control', 'bounce', 'passComplete', 'controlChange', 'touch'].includes(k)))));
  console.log('   tiempo por estado:', Object.entries(stateTime).map(([k, v]) => `${k}:${v.toFixed(0)}`).join(' '), ' balón parado máx:', maxBallStill.toFixed(1), 's');
  return { goals: h.score + a.score, shots: h.stats.shots + a.stats.shots };
}

let g = 0, s = 0;
for (let i = 0; i < N; i++) { const r = run(i); g += r.goals; s += r.shots; }
console.log(`\nMedia: ${(g / N).toFixed(2)} goles y ${(s / N).toFixed(1)} tiros por partido`);
