// Vista previa 3D de un futbolista (editor y carta). Usa el mismo motor WebGL2,
// las mismas figuras articuladas y las mismas camisetas que el partido, pero en
// un lienzo propio y sin estadio. Sirve para girar el modelo en pantalla y para
// hacer la foto de perfil de la carta.

import { Renderer, Scene, Camera } from './GL.js';
import { environment } from './Stadium.js';
import { Figures, makeLook } from './PlayerModel.js';
import { kitAtlas } from './Textures.js';

const DEG = Math.PI / 180;

export class PlayerPreview {
  /**
   * canvas: elemento donde se dibuja.
   * player: { number, short, skin, hair, hairStyle, height, pos }
   * kit: { shirt, accent, pattern, shorts, socks, num }
   */
  constructor(canvas, player, kit) {
    this.canvas = canvas;
    this.r = new Renderer(canvas, { shadowSize: 0 });
    this.env = environment(false);
    this.env.shadows = false;
    this.scene = new Scene();
    this.cam = new Camera();
    this.raf = 0;
    this.t0 = performance.now();
    this.stopped = true;

    const isGK = player.pos === 'GK';
    const atlas = kitAtlas([{ kit, number: player.number, name: player.short || '' }], 256);
    this.atlasTex = this.r.texture(atlas.canvas, { aniso: 4 });
    this.figures = new Figures(this.r, this.scene, this.atlasTex, 2);
    this.look = makeLook(player, kit, atlas.rects[0], isGK, 0);
    this.h = this.look.h;
  }

  /** Ajusta el lienzo al tamaño CSS que ocupa en pantalla. */
  fit() {
    const w = this.canvas.clientWidth || 300;
    const h = this.canvas.clientHeight || 400;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.r.resize(w, h, dpr);
  }

  /**
   * Dibuja un fotograma. Modo 'cuerpo' muestra la figura entera girando;
   * modo 'rostro' encuadra la cabeza y el torso (para la foto de la carta).
   */
  draw(time, modo = 'cuerpo', giro = null) {
    const h = this.h;
    const cam = this.cam;
    cam.aspect = this.canvas.width / this.canvas.height;
    if (modo === 'rostro') {
      cam.fov = 26 * DEG;
      cam.pos = [0, 1.45 * h, 2.3];
      cam.target = [0, 1.36 * h, 0];
    } else {
      cam.fov = 30 * DEG;
      cam.pos = [0, 1.0 * h, 5.4];
      cam.target = [0, 0.98 * h, 0];
    }
    cam.update();
    this.figures.begin();
    const facing = giro ?? time * 0.6;
    // Estado 0 = postura normal de pie; sin velocidad ni animación de carrera.
    this.figures.emit(this.look, 0, 0, 0, facing, 0, 0, 0, 0, 0, time);
    this.r.render(this.scene, cam, this.env, time);
  }

  /** Empieza la animación en bucle del giro (vista previa interactiva). */
  start() {
    if (!this.stopped) return;
    this.stopped = false;
    const loop = () => {
      if (this.stopped) return;
      if (!this.canvas.isConnected) { this.dispose(); return; }  // pantalla cerrada: se libera el contexto
      this.fit();
      this.draw((performance.now() - this.t0) / 1000, 'cuerpo');
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
  }

  /** Devuelve la foto de perfil (PNG) con encuadre de rostro. */
  snapshot(size = 512) {
    this.canvas.width = size;
    this.canvas.height = size;
    this.r.pixelRatio = 1;
    this.draw(0, 'rostro', 0.35);
    return this.canvas.toDataURL('image/png');
  }

  /** Libera el contexto WebGL de este visor. */
  dispose() {
    this.stop();
    const ext = this.r.gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  }
}

/** Foto de perfil de un jugador como imagen (data URL). Crea y libera su propio contexto. */
export function fotoJugador(player, kit) {
  const c = document.createElement('canvas');
  const visor = new PlayerPreview(c, player, kit);
  try {
    return visor.snapshot(512);
  } finally {
    visor.dispose();
  }
}
