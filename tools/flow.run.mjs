export default async function (p, out) {
  const snap = async (name) => { await p.screenshot({ path: `${out}/${name}.png` }); };
  const wait = (ms) => p.waitForTimeout(ms);
  await p.waitForFunction('window.__game', null, { timeout: 60000 });
  await wait(1200);
  await snap('f01-splash');
  await p.keyboard.press('Enter'); await wait(700);
  await snap('f02-main');
  await p.keyboard.press('Enter'); await wait(500);
  await snap('f03-teams');
  await p.keyboard.press('ArrowRight'); await wait(150);
  // bajar hasta CONTINUAR
  for (let i = 0; i < 6; i++) { await p.keyboard.press('ArrowDown'); await wait(60); }
  await snap('f03b-teams-focus');
  await p.evaluate(() => document.querySelector('[data-act="next"]').click()); await wait(400);
  await snap('f04-tactics');
  await p.evaluate(() => document.querySelector('[data-act="done"]').click()); await wait(400);
  await snap('f05-setup');
  await p.evaluate(() => document.querySelector('[data-act="play"]').click());
  await wait(2500);
  await snap('f06-intro');
  await p.keyboard.press('Enter'); await wait(900);
  await snap('f07-kickoff');
  await p.keyboard.press('Space'); await wait(600);
  await p.keyboard.down('KeyD'); await p.keyboard.down('ShiftLeft'); await wait(1800);
  await snap('f08-run');
  await p.keyboard.down('KeyE'); await wait(500); await snap('f09-charge'); await p.keyboard.up('KeyE');
  await wait(1500);
  await p.keyboard.up('KeyD'); await p.keyboard.up('ShiftLeft');
  await snap('f10-after');
  const info = await p.evaluate(() => { const g = window.__game, m = g.match; return { state: m.state, score: [m.teams[0].score, m.teams[1].score], clock: m.clockText(), draws: g.renderer.stats.draws, inst: g.renderer.stats.instances, w: g.canvas.width, h: g.canvas.height }; });
  console.log(JSON.stringify(info));
  await p.keyboard.press('Escape'); await wait(400);
  await snap('f11-pause');
}
