// Mando de Xbox (One / Series) y PlayStation (PS4 / PS5) mediante la API Gamepad
// del navegador, con el mapeo estándar: 0 = A/✕, 1 = B/○, 2 = X/□, 3 = Y/△,
// 4 = LB/L1, 5 = RB/R1, 6 = LT/L2, 7 = RT/R2, 8 = Vista/Crear, 9 = Menú/Opciones.
//
// En el partido, cada botón envía la misma acción que su tecla equivalente, así
// que toda la lógica de juego sigue igual. Con un menú abierto, la cruceta y el
// stick navegan, A/✕ acepta y B/○ vuelve, igual que con el teclado.

const DEAD = 0.25;
const NAV_REPEAT = 0.14;   // segundos entre repeticiones del stick en los menús
const NAV_FIRST = 0.4;     // pausa antes de empezar a repetir

/** Botón por defecto de cada acción del partido (índice del mapeo estándar). */
export const MANDO_DEFECTO = {
  pass: 0, through: 1, shoot: 2, lob: 3, switch: 4, shield: 5, feint: 6, sprint: 7, pause: 9, chip: 11,
};

/** Acción → botón, con los cambios del jugador sobre los valores por defecto. */
export function mandoEfectivo(guardados) {
  const out = { ...MANDO_DEFECTO };
  if (guardados) for (const a in guardados) out[a] = guardados[a];
  return out;
}

/** Nombre del botón según el mando conectado. */
const NOMBRES_XBOX = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VISTA', 'MENÚ', 'L3', 'R3', '↑', '↓', '←', '→', 'XBOX'];
const NOMBRES_PS = ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'CREAR', 'OPCIONES', 'L3', 'R3', '↑', '↓', '←', '→', 'PS'];
export function nombreBoton(i, familia) {
  if (i == null) return '—';
  if (familia === 'xbox') return NOMBRES_XBOX[i] || `BOTÓN ${i}`;
  if (familia === 'ps') return NOMBRES_PS[i] || `BOTÓN ${i}`;
  return `BOTÓN ${i}`;
}

// Botón → tecla que usan los menús
const NAV_DE_BOTON = {
  0: 'Enter', 1: 'Escape', 9: 'Escape',
  12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight',
};

const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);
const sinZona = (v) => (Math.abs(v) < DEAD ? 0 : v);

/** Identifica la familia del mando por su nombre (solo para mostrar el texto correcto). */
export function familiaMando(id = '') {
  const s = String(id).toLowerCase();
  if (/xbox|xinput|045e/.test(s)) return 'xbox';
  if (/dualsense|dualshock|playstation|054c|sony|wireless controller/.test(s)) return 'ps';
  return 'generico';
}

export class Gamepad {
  constructor(input, ui) {
    this.input = input;
    this.ui = ui;
    this.acciones = this.mapaBotones(mandoEfectivo(null));
    this.captura = null;        // función que recibe el siguiente botón pulsado
    this.prevHeld = new Set();
    this.nombre = null;
    this.lastUi = null;
    this.lock = new Set();      // botones ya pulsados al cambiar de modo: no cuentan hasta soltarlos
    this.prevNav = new Set();
    this.stickDir = null;
    this.stickT = 0;
    this.onAviso = null;        // callback (texto) para mostrar avisos al conectar o desconectar
    window.addEventListener('gamepadconnected', (e) => this.connect(e.gamepad));
    window.addEventListener('gamepaddisconnected', (e) => this.disconnect(e.gamepad));
  }

  /** Botón → acción, a partir de acción → botón. */
  mapaBotones(efectivo) {
    const m = {};
    for (const a in efectivo) m[efectivo[a]] = a;
    return m;
  }

  /** Aplica los botones que ha elegido el jugador (acción → índice de botón). */
  setBindings(guardados) {
    this.acciones = this.mapaBotones(mandoEfectivo(guardados));
  }

  connect(gp) {
    this.nombre = gp.id;
    if (this.onAviso) this.onAviso(`Mando conectado · ${familiaNombre(gp.id)}`);
  }

  disconnect() {
    this.nombre = null;
    this.input.setPad(new Set(), { x: 0, z: 0 });
    if (this.onAviso) this.onAviso('Mando desconectado');
  }

  /** Mando activo: el primero conectado que el navegador ofrezca. */
  activo() {
    const lista = (navigator.getGamepads && navigator.getGamepads()) || [];
    for (const p of lista) if (p && p.connected) return p;
    return null;
  }

  /** Llamar en cada fotograma. uiVisible: hay un menú abierto. dt: segundos desde el último fotograma. */
  poll(uiVisible, dt) {
    const p = this.activo();
    if (!p) {
      this.input.setPad(new Set(), { x: 0, z: 0 });
      this.prevNav = new Set();
      this.prevHeld = new Set();
      return;
    }
    if (!this.nombre) this.nombre = p.id;
    const btn = (i) => { const b = p.buttons[i]; return !!(b && (b.pressed || b.value > 0.5)); };
    const held = new Set();
    for (let i = 0; i < p.buttons.length; i++) if (btn(i)) held.add(i);
    const nuevos = [...held].filter((i) => !this.prevHeld.has(i));
    this.prevHeld = held;
    if (this.captura && nuevos.length) {
      // Modo "pulsa un botón": el siguiente botón nuevo se asigna y no hace nada más
      const cb = this.captura;
      this.captura = null;
      cb(nuevos[0]);
      return;
    }

    if (this.lastUi !== null && this.lastUi !== uiVisible) this.lock = new Set(held);
    this.lastUi = uiVisible;
    for (const i of [...this.lock]) if (!held.has(i)) this.lock.delete(i);
    const fresh = (i) => held.has(i) && !this.lock.has(i);

    const sx = sinZona(p.axes[0] || 0), sy = sinZona(p.axes[1] || 0);

    if (uiVisible) {
      // Menús: la cruceta y los botones de navegación envían teclas al menú
      this.input.setPad(new Set(), { x: 0, z: 0 });
      const ahora = new Set(Object.keys(NAV_DE_BOTON).map(Number).filter(fresh));
      for (const i of ahora) if (!this.prevNav.has(i)) this.tap(NAV_DE_BOTON[i]);
      this.prevNav = ahora;

      // Stick: repetición mientras se mantiene
      let dir = null;
      if (sy < -0.6) dir = 'ArrowUp';
      else if (sy > 0.6) dir = 'ArrowDown';
      else if (sx < -0.6) dir = 'ArrowLeft';
      else if (sx > 0.6) dir = 'ArrowRight';
      if (dir !== this.stickDir) {
        this.stickDir = dir;
        if (dir) { this.tap(dir); this.stickT = NAV_FIRST; }
      } else if (dir) {
        this.stickT -= dt;
        if (this.stickT <= 0) { this.tap(dir); this.stickT = NAV_REPEAT; }
      }
      return;
    }

    // Partido: botones → acciones y stick/cruceta → movimiento
    this.stickDir = null;
    this.prevNav = new Set();
    const acciones = new Set();
    for (const k of Object.keys(this.acciones)) if (fresh(Number(k))) acciones.add(this.acciones[k]);
    let mx = sx, mz = sy;
    if (btn(14)) mx -= 1;
    if (btn(15)) mx += 1;
    if (btn(12)) mz -= 1;
    if (btn(13)) mz += 1;
    this.input.setPad(acciones, { x: clamp1(mx), z: clamp1(mz) });
  }

  /** Envía una pulsación de tecla al menú (igual que si el teclado la hubiera generado). */
  tap(code) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, bubbles: true }));
  }
}

function familiaNombre(id) {
  const f = familiaMando(id);
  return f === 'xbox' ? 'Xbox' : f === 'ps' ? 'PlayStation' : 'mando genérico';
}
