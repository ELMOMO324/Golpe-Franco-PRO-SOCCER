import { TEAMS } from '../src/data/TeamsData.js';
import { tacticsFromStyle } from '../src/match/Tactics.js';
import { Match } from '../src/match/Match.js';
import { Renderer } from '../src/render/GL.js';
import { MatchView, viewSetup } from '../src/render/MatchView.js';
import { HEADER, STRIDE } from '../src/match/Replay.js';

const canvas = document.getElementById('c');
const r = new Renderer(canvas, { shadowSize: 2048 });
r.resize(innerWidth, innerHeight, 1);
const home = TEAMS[2], away = TEAMS[0];
const m = new Match({ home, away, homeTactics: tacticsFromStyle(home.style), awayTactics: tacticsFromStyle(away.style), difficulty: 'normal', halfMinutes: 5, userSide: null, seed: 5 });
const view = new MatchView(r, viewSetup(m, false, 1));
view.capture(m);
// Fila de figuras con poses concretas: [estado, progreso, aux, velocidad, fase, y]
const POSES = {
  a: [[0, 1, 0, 0, 0, 0], [0, 0, 0, 7.5, 1.2, 0], [0, 0, 0, 7.5, 3.0, 0], [0, 0, 0, 4, 4.4, 0], [1, 0.25, 1, 0, 0, 0], [1, 0.42, 1, 0, 0, 0], [1, 0.6, 1, 0, 0, 0], [1, 0.42, 0, 0, 0, 0], [2, 0.4, 0, 3, 0, 0], [3, 0.5, 0, 5, 0, 0], [4, 0.4, 0, 0, 0, 0]],
  b: [[4, 0.5, 1, 0, 0, 0], [5, 0.5, 0, 0, 0, 0.55], [5, 0.5, 1, 0, 0, 0.5], [6, 0.6, 1, 0, 0, 0.8], [6, 0.6, -1, 0, 0, 0.3], [7, 1, 10, 0, 0, 0], [8, 0.3, 20, 0, 0, 0], [8, 0.7, 0, 0, 0, 0], [9, 1.3, 2, 0, 0, 0], [9, 0, 1, 6, 2, 0], [10, 0.5, 0, 2, 1, 0]],
  c: [[11, 0.5, 1, 0, 0, 0], [11, 0.5, 2, 0, 0, 0], [11, 0.5, 3, 0, 0, 0], [11, 0.5, 4, 0, 0, 0], [11, 0.5, 5, 0, 0, 0], [0, 1, 100, 1, 0.5, 0], [4, 0.5, 2, 0, 0, 0], [4, 0.5, 3, 0, 0, 0], [0, 2, 0, 0, 0, 0], [0, 2, 0, 2, 0.8, 0], [0, 2, 0, 2, 2.4, 0]],
};
window.pose = (set, facing) => {
  const f = new Float32Array(view.cur.length);
  for (let e = 0; e < 25; e++) f[HEADER + e * STRIDE + 6] = -1;
  const list = POSES[set];
  list.forEach((p, i) => {
    const e = set === 'c' && i < 5 ? 22 + (i % 3) : i;
    const k = HEADER + (set === 'c' && i < 5 ? (i < 3 ? 22 + i : 20 + i) : i) * STRIDE;
    void e;
    f[k] = -10 + i * 2; f[k + 1] = p[5]; f[k + 2] = 0; f[k + 3] = facing; f[k + 4] = p[3]; f[k + 5] = p[4];
    f[k + 6] = p[0]; f[k + 7] = p[1]; f[k + 8] = p[2] + 2;
  });
  f[0] = -12; f[1] = 0.11; f[2] = 1;
  view.setFrames(f, 0, f, 0);
  const d = view.director;
  d.mode = 'custom'; d.snap = true;
  const orig = d.update.bind(d);
  d.update = () => { const c = view.cam; c.pos[0] = 0; c.pos[1] = 2.2; c.pos[2] = 13; c.target[0] = 0; c.target[1] = 1; c.target[2] = 0; c.fov = 0.62; c.update(); };
  view.draw(1, 1 / 60, 1.3, { hideMarks: true });
  d.update = orig;
};
window.ready = true;
