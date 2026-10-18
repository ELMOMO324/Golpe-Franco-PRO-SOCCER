// Recorre los menús y las pantallas de pausa para detectar errores.
export default async function (p, out) {
  const wait = (ms) => p.waitForTimeout(ms);
  const snap = (n) => p.screenshot({ path: `${out}/${n}.png` });
  const click = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error('no existe ' + s); e.click(); }, sel);
  const screen = () => p.evaluate(() => window.__game.ui.screen);
  await p.waitForFunction('window.__game', null, { timeout: 60000 });
  await wait(500);
  await p.keyboard.press('KeyK'); await wait(300);
  console.log('tras portada:', await screen());
  // Ajustes
  for (let i = 0; i < 4; i++) await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter'); await wait(250);
  console.log('ajustes:', await screen());
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowRight'); await wait(150);
  await snap('u1-settings');
  await click('[data-act="controls"]'); await wait(200); await snap('u2-controls');
  await p.keyboard.press('Escape'); await wait(150); await p.keyboard.press('Escape'); await wait(150);
  console.log('vuelta:', await screen());
  // Próximamente
  console.log('foco al volver (debe ser 4):', await p.evaluate(() => window.__game.ui.focusIdx));
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('Enter'); await wait(200); await snap('u3-soon');
  console.log('próximamente:', await screen());
  await p.keyboard.press('Enter'); await wait(150);
  // Partido de noche como visitante
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('Enter'); await wait(250);
  console.log('equipos:', await screen());
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
  await click('[data-act="side"][data-arg="1"]'); await wait(100);
  await snap('u4-teams');
  await p.keyboard.press('Enter'); await wait(250);
  console.log('táctica:', await screen());
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await wait(150);
  await click('[data-act="ment"][data-arg="1"]'); await wait(100);
  await snap('u5-tactics');
  await click('[data-act="done"]'); await wait(200);
  await click('[data-act="night"]'); await wait(100);
  await click('[data-act="diff"][data-arg="dificil"]'); await wait(100);
  await click('[data-act="play"]'); await wait(5000);
  await p.keyboard.press('Space'); await wait(1500);
  await snap('u6-night');
  await p.keyboard.press('Escape'); await wait(300);
  console.log('pausa:', await screen());
  await snap('u7-pause');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await wait(200);
  console.log('táctica en partido:', await screen());
  await click('[data-act="form"][data-arg="3-5-2"]'); await wait(150);
  await snap('u8-tactics-match');
  await click('[data-act="done"]'); await wait(200);
  console.log('tras táctica:', await screen(), await p.evaluate(() => window.__game.match.userTeam.tactics.formation));
  await p.keyboard.press('Escape'); await wait(400);
  console.log('reanudado:', await screen(), await p.evaluate(() => window.__game.paused));
  await p.keyboard.down('KeyA'); await wait(1500); await p.keyboard.up('KeyA');
  await p.keyboard.press('KeyQ'); await wait(300);
  // Pausa y reinicio, luego salir
  await p.keyboard.press('Escape'); await wait(300);
  await click('[data-act="restart"]'); await wait(3000);
  console.log('reinicio:', await p.evaluate(() => window.__game.match.state));
  await p.keyboard.press('Escape'); await wait(300);
  await click('[data-act="quit"]'); await wait(1200);
  console.log('menú:', await screen(), await p.evaluate(() => window.__game.mode));
  await snap('u9-menu-again');
  // Ancho de teléfono
  await p.setViewportSize({ width: 400, height: 780 }); await wait(600);
  await snap('u10-phone-main');
  await p.keyboard.press('Enter'); await wait(300);
  await snap('u11-phone-teams');
  const over = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log('desbordamiento horizontal:', JSON.stringify(over));
}
