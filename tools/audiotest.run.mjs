export default async function (p) {
  await p.waitForFunction('window.ready', null, { timeout: 30000 });
  const r = await p.evaluate(() => window.runAudio());
  console.log(r.join('\n'));
}
