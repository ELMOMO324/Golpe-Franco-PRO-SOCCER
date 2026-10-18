import { TEAMS } from '../src/data/TeamsData.js';
import { tacticsFromStyle } from '../src/match/Tactics.js';
import { Match } from '../src/match/Match.js';
import { STATE, SIM_DT } from '../src/core/Config.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const home = TEAMS[+(args.h||0)], away = TEAMS[+(args.a||1)];
let buf=[]; const log=(s)=>buf.push(s);
const m = new Match({ home, away, homeTactics: tacticsFromStyle(home.style), awayTactics: tacticsFromStyle(away.style), difficulty: 'experto', halfMinutes: 5, userSide: null, seed: +(args.seed||50) });
let watch = null;
m.on('shot', (d) => { if (d.kind === 'header') { const gk = d.team.opponent.gk; const g = m.gks[d.team.opponent.side]; watch = { t: m.clock, n: 0 }; buf=[]; log(`\n${m.clockText()} CABEZAZO d=${d.dist.toFixed(1)} bola=(${m.ball.x.toFixed(1)},${m.ball.y.toFixed(1)},${m.ball.z.toFixed(1)}) v=(${m.ball.vx.toFixed(1)},${m.ball.vy.toFixed(1)},${m.ball.vz.toFixed(1)}) gk=(${gk.x.toFixed(1)},${gk.z.toFixed(1)}) estado=${gk.state} onT=${d.onTarget}`); } });
m.on('goal', () => { if (watch) { log('   -> GOL'); console.log(buf.join('\n')); } watch = null; });
m.on('save', (d) => { watch = null; });
m.on('dive', (d) => { if (watch) log('   estirada '+JSON.stringify(d.gk.dive)+' t+' + (m.clock - watch.t).toFixed(2)); });
let steps = 0;
while (m.state !== STATE.FULL_TIME && steps++ < 200000) { m.step(SIM_DT); if (watch && watch.n++ < 40 && watch.n % 6 === 0) { const gk = m.teams.find(t => t !== (m.lastShooter && m.lastShooter.team)).gk; const g = m.gks[gk.team.side]; log(`   t+${(m.clock - watch.t).toFixed(2)} bola=(${m.ball.x.toFixed(1)},${m.ball.y.toFixed(1)},${m.ball.z.toFixed(1)}) gk=(${gk.x.toFixed(1)},${gk.z.toFixed(1)},${gk.state}) threat=${g.threat ? g.threat.z.toFixed(1) + '/' + g.threat.t.toFixed(2) : '-'} react=${g.reactT.toFixed(2)}`); } }
