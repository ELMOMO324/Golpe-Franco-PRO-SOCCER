export default async function (p, out) {
  const wait = (ms) => p.waitForTimeout(ms);
  await p.waitForFunction('window.__game', null, { timeout: 60000 });
  await wait(600);
  await p.keyboard.press('Enter'); await wait(300);
  await p.evaluate(() => { const g = window.__game; g.ui.teams(); g.ui.state.teams.side = 0; g.ui.launch(); });
  await wait(4000);
  await p.evaluate(() => window.__game.beginPlay()); await wait(500);
  await p.evaluate(() => { const g = window.__game, m = g.match; for (let i = 0; i < 400 && m.state !== 'PLAYING'; i++) { m.step(1 / 60); g.view.capture(m); } });
  await p.evaluate(() => {
    const g = window.__game, m = g.match, b = m.ball;
    const att = m.teams[0];
    b.owner = null; b.x = 52.5 * att.dir - att.dir * 0.2; b.z = 20; b.vx = att.dir * 6; b.vz = 0; b.y = 0.11; b.vy = 0;
    b.lastTouch = att.opponent.players[2]; b.passTarget = null; b.kickType = 'tackle';
  });
  for (let i = 0; i < 6; i++) {
    await wait(900);
    const info = await p.evaluate(() => { const g = window.__game; const f = document.getElementById('fade'); const c = g.view.cam; return { state: g.match.state, fade: getComputedStyle(f).opacity, cam: Array.from(c.pos).map((v) => +v.toFixed(1)), tgt: Array.from(c.target).map((v) => +v.toFixed(1)), fov: +(c.fov * 57.3).toFixed(1), ball: [+g.match.ball.x.toFixed(1), +g.match.ball.z.toFixed(1)] }; });
    console.log(JSON.stringify(info));
    await p.screenshot({ path: `${out}/c${i}.png` });
  }
}
