import { TEAMS } from './data/TeamsData.js';
// Punto de entrada: espera a las fuentes (se usan también en las texturas del
// estadio y las camisetas) y arranca el juego.
import { Game } from './core/Game.js';
import { precargarLogos } from './data/Custom.js';

async function start() {
  const app = document.getElementById('app');
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('800 32px "Barlow Condensed"'),
        document.fonts.load('900 32px "Big Shoulders Display"'),
      ]),
      new Promise((r) => setTimeout(r, 1800)),
    ]);
  } catch (e) { /* se usarán las fuentes de reserva */ }
  // Logos PNG subidos por el jugador: se cargan antes para que el estadio ya los tenga
  await Promise.race([precargarLogos(), new Promise((r) => setTimeout(r, 2000))]);
  try {
    const game = new Game({
      app,
      canvas: document.getElementById('gl'),
      ui: document.getElementById('ui'),
      hud: document.getElementById('hud'),
      fade: document.getElementById('fade'),
    });
    window.__game = game;
    window.__TEAMS = TEAMS; // gancho de depuración (pruebas automáticas)
    game.boot();
  } catch (e) {
    console.error(e);
    const d = document.createElement('div');
    d.className = 'fatal';
    d.textContent = /WebGL2/.test(String(e && e.message))
      ? 'Este navegador no ofrece WebGL2, necesario para el 3D. Prueba con una versión reciente de Chrome, Edge o Firefox.'
      : 'No se ha podido iniciar el juego: ' + (e && e.message ? e.message : e);
    app.appendChild(d);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
