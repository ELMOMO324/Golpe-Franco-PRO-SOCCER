// Partido en modo espectador: avanza rápido hasta cada tipo de jugada y captura la pantalla.
export default async function (p, out) {
  const wait = (ms) => p.waitForTimeout(ms);
  await p.waitForFunction('window.__game', null, { timeout: 60000 });
  await wait(800);
  await p.keyboard.press('Enter'); await wait(300);
  await p.evaluate((night) => {
    const g = window.__game;
    const T = g.ui.state; void T;
    const teams = g.save.data;
    void teams;
    g.ui.teams();
    const st = g.ui.state.teams; st.side = null; st.home = 5; st.away = 9;
    g.save.settings.night = night; g.save.settings.halfMinutes = 3;
    g.ui.launch();
  }, process.env.NIGHT === '1');
  await wait(3500);
  await p.screenshot({ path: `${out}/e00-intro.png` });
  await p.keyboard.press('Enter'); await wait(600);
  await p.evaluate(() => {
    const g = window.__game, m = g.match;
    window.__ev = null; window.__seen = {};
    for (const t of ['goal', 'foul', 'offside', 'save', 'card']) m.on(t, () => { if (!window.__ev) window.__ev = t; });
    m.on('setPiece', (d) => { if (!window.__ev && d.type !== 'KICKOFF') window.__ev = 'sp-' + d.type; });
  });
  const seen = {};
  for (let iter = 0; iter < 400; iter++) {
    const ev = await p.evaluate(() => {
      const g = window.__game, m = g.match;
      if (g.replay || g.ui.visible) return g.ui.visible ? 'ui:' + g.ui.screen : 'replay';
      window.__ev = null;
      for (let i = 0; i < 900 && !window.__ev && !m.replayRequest; i++) { m.step(1 / 60); g.view.capture(m); if (m.state === 'HALF_TIME' || m.state === 'FULL_TIME') break; }
      return window.__ev || m.state;
    });
    if (ev === 'replay') {
      if (!seen.replay || seen.replay < 3) { seen.replay = (seen.replay || 0) + 1; await wait(1500); await p.screenshot({ path: `${out}/e-replay${seen.replay}.png` }); await wait(2500); await p.screenshot({ path: `${out}/e-replay${seen.replay}b.png` }); }
      await p.keyboard.press('Space'); await wait(250);
      continue;
    }
    if (ev.startsWith('ui:')) {
      await wait(500);
      if (!seen[ev]) { seen[ev] = 1; await p.screenshot({ path: `${out}/e-${ev.replace(':', '-')}.png` }); }
      if (ev === 'ui:half') { await p.keyboard.press('Enter'); await wait(400); continue; }
      if (ev === 'ui:full') break;
      await wait(300); continue;
    }
    if (ev === 'HALF_TIME' || ev === 'FULL_TIME') { await wait(2600); continue; }
    if (ev && !seen[ev] || (ev === 'goal' && seen.goal < 2)) {
      seen[ev] = (seen[ev] || 0) + 1;
      await wait(ev === 'goal' ? 1600 : 700);
      await p.screenshot({ path: `${out}/e-${ev}${seen[ev] > 1 ? seen[ev] : ''}.png` });
      if (ev === 'goal') { await wait(3500); }
    }
  }
  const info = await p.evaluate(() => { const m = window.__game.match; return { state: m.state, score: [m.teams[0].score, m.teams[1].score], clock: m.clockText() }; });
  console.log(JSON.stringify(info), Object.keys(seen).join(','));
}
