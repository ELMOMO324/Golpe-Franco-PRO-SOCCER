export default async function (p, out) {
  await p.waitForFunction('window.ready', null, { timeout: 60000 });
  for (const s of ['a', 'b', 'c']) {
    await p.evaluate((s) => window.pose(s, 0), s);
    await p.screenshot({ path: `${out}/pose-${s}.png`, clip: { x: 0, y: 200, width: 1280, height: 400 } });
  }
  await p.evaluate(() => window.pose('b', Math.PI / 2));
  await p.screenshot({ path: `${out}/pose-b-front.png`, clip: { x: 0, y: 200, width: 1280, height: 400 } });
}
