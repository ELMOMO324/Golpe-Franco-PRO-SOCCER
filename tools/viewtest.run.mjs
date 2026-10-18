export default async function (p, out) {
  await p.waitForFunction('window.ready', null, { timeout: 60000 });
  console.log('build ms', await p.evaluate('window.buildMs'));
  console.log(JSON.stringify(await p.evaluate(() => window.shot('tv'))));
  await p.screenshot({ path: out + '/v1-kickoff.png' });
  await p.evaluate(() => window.advance(900));
  console.log(JSON.stringify(await p.evaluate(() => window.shot('tv'))));
  await p.screenshot({ path: out + '/v2-play.png' });
  console.log(JSON.stringify(await p.evaluate(() => { window.view.director.setStyle('cercana'); return window.shot('tv'); })));
  await p.screenshot({ path: out + '/v3-close.png' });
  console.log(JSON.stringify(await p.evaluate(() => window.shot('replay', { angle: 'lateral' }))));
  await p.screenshot({ path: out + '/v4-lateral.png' });
  console.log(JSON.stringify(await p.evaluate(() => window.shot('replay', { angle: 'behind' }))));
  await p.screenshot({ path: out + '/v5-behind.png' });
  console.log(JSON.stringify(await p.evaluate(() => window.shot('intro'))));
  await p.screenshot({ path: out + '/v6-intro.png' });
}
