import { TEAMS } from '../src/data/TeamsData.js';
import { tacticsFromStyle } from '../src/match/Tactics.js';
import { Match } from '../src/match/Match.js';
import { SIM_DT } from '../src/core/Config.js';
import { Renderer } from '../src/render/GL.js';
import { MatchView, viewSetup } from '../src/render/MatchView.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const r = new Renderer(canvas, { shadowSize: 2048 });
r.resize(innerWidth, innerHeight, 1);
const home = TEAMS[+(q.get('h') || 0)], away = TEAMS[+(q.get('a') || 2)];
const m = new Match({ home, away, homeTactics: tacticsFromStyle(home.style), awayTactics: tacticsFromStyle(away.style), difficulty: 'normal', halfMinutes: 5, userSide: null, seed: +(q.get('seed') || 5) });
const t0 = performance.now();
const view = new MatchView(r, viewSetup(m, q.get('night') === '1', 1));
window.buildMs = performance.now() - t0;
window.m = m; window.view = view;
window.advance = (steps) => { for (let i = 0; i < steps; i++) { m.step(SIM_DT); view.capture(m); } };
window.shot = (mode, params) => {
  if (mode) view.director.setMode(mode, params || {}, true);
  const t = performance.now();
  view.draw(1, 1 / 60, m.clock, { controlled: 9 });
  r.gl.finish();
  return { ms: performance.now() - t, draws: r.stats.draws, inst: r.stats.instances, crowd: view.stadium.crowdCount, state: m.state };
};
view.capture(m);
window.ready = true;
