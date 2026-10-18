// Entrada de teclado. Traduce teclas físicas a acciones del juego y guarda
// pulsaciones y sueltas hasta que la simulación las consume.

// Teclas fijas: movimiento y menús. No se pueden reasignar.
const TECLAS_FIJAS = {
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Enter: 'confirm',
};

/** Acciones que se pueden reasignar, con el nombre que se muestra en el menú. */
export const ACCIONES = [
  ['pass', 'Pase / entrada / saque corto'],
  ['through', 'Pase al hueco / presión'],
  ['shoot', 'Disparo / tiro a puerta / deslizante'],
  ['lob', 'Pase elevado / centro / despeje'],
  ['chip', 'Vaselina'],
  ['shield', 'Proteger balón / contención'],
  ['feint', 'Regate'],
  ['sprint', 'Sprint'],
  ['switch', 'Cambiar de jugador'],
  ['stats', 'Estadísticas en vivo'],
  ['subs', 'Cambios'],
  ['pause', 'Pausa'],
];

/** Teclas por defecto de cada acción (una acción puede tener varias). */
export const TECLADO_DEFECTO = {
  pass: ['Space'], through: ['AltLeft', 'AltRight', 'KeyV'], shoot: ['KeyE'], lob: ['KeyR'],
  chip: ['KeyF'], shield: ['KeyC'], feint: ['KeyX'], sprint: ['ShiftLeft', 'ShiftRight'],
  switch: ['KeyQ'], stats: ['KeyT'], subs: ['KeyG'], pause: ['Escape', 'KeyP'],
};

/**
 * Esquema alternativo: pase con clic izquierdo, disparo con clic derecho y sprint con E.
 * El resto de acciones mantienen su tecla por defecto.
 */
export const ESQUEMA_ALTERNATIVO = {
  ...TECLADO_DEFECTO, pass: ['Mouse0'], shoot: ['Mouse2'], sprint: ['KeyE'],
};

/** Botones del ratón como códigos de acción (solo se escuchan sobre el campo). */
const BOTONES_RATON = { 0: 'Mouse0', 1: 'Mouse1', 2: 'Mouse2' };

/** Teclas que no se pueden asignar a una acción (menús, movimiento y cancelar). */
export const TECLAS_RESERVADAS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'NumpadEnter', 'Escape', 'Tab', 'Backspace', 'F11', 'F12']);

/** Mapa completo acción → teclas, con los cambios del jugador sobre los valores por defecto. */
export function teclasEfectivas(guardadas) {
  const out = {};
  for (const [a] of ACCIONES) out[a] = [...((guardadas && guardadas[a]) || TECLADO_DEFECTO[a])];
  return out;
}

function mapaDeTeclas(efectivas) {
  const m = { ...TECLAS_FIJAS };
  for (const a in efectivas) for (const code of efectivas[a]) m[code] = a;
  return m;
}

/** Nombre corto de una tecla para mostrarla en pantalla. */
export function nombreTecla(code) {
  const especiales = { Mouse0: 'CLIC IZQ.', Mouse1: 'CLIC CENT.', Mouse2: 'CLIC DER.', Space: 'ESPACIO', ShiftLeft: 'MAYÚS IZQ.', ShiftRight: 'MAYÚS DER.', AltLeft: 'ALT IZQ.', AltRight: 'ALT DER.', ControlLeft: 'CTRL IZQ.', ControlRight: 'CTRL DER.', Escape: 'ESC' };
  if (!code) return '—';
  if (especiales[code]) return especiales[code];
  return String(code).replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'NUM ').toUpperCase();
}

export const CONTROLS_HELP = {
  ataque: [
    ['W A S D', 'Moverse'],
    ['SHIFT', 'Sprint'],
    ['ESPACIO', 'Pase (mantener = más fuerte)'],
    ['ALT o V', 'Pase al hueco'],
    ['R', 'Pase elevado / centro'],
    ['E', 'Disparo (mantener = más potencia y altura)'],
    ['C + E', 'Disparo colocado'],
    ['F', 'Vaselina'],
    ['C', 'Proteger el balón'],
    ['X', 'Regate (recorte)'],
    ['T', 'Estadísticas en vivo'],
    ['G', 'Cambios (en pausa)'],
  ],
  defensa: [
    ['Q', 'Cambiar de jugador'],
    ['ESPACIO', 'Entrada'],
    ['E', 'Entrada deslizante'],
    ['R', 'Despeje'],
    ['C', 'Contención'],
    ['ALT o V', 'Presión de un compañero'],
    ['ESC', 'Pausa'],
  ],
};

export class Input {
  constructor() {
    this.keys = new Set();
    this.keymap = mapaDeTeclas(teclasEfectivas(null));
    this.pressedQ = new Set();
    this.releasedQ = new Set();
    this.enabled = true;
    this._move = { x: 0, z: 0 };
    // Dirección del puntero (vector unitario del jugador hacia el puntero) y si el movimiento va con el ratón
    this.aimVec = null;
    this.mouseMove = false;
    this.padHeld = new Set();   // acciones que mantiene el mando
    this.padMove = { x: 0, z: 0 }; // stick izquierdo / cruceta
    this.touchHeld = new Set();    // botones táctiles que están pulsados (móvil)
    this.touchMove = { x: 0, z: 0 }; // joystick táctil
    this.listeners = [];
    // Puntero del ratón sobre el canvas (coordenadas CSS relativas al canvas)
    this.pointer = { x: 0, y: 0, inside: false, t: -1e9 };
    this.canvasEl = null;
    this._mouse = (e) => this.onMouse(e);
    this._down = (e) => this.onKey(e, true);
    this._up = (e) => this.onKey(e, false);
    this._blur = () => this.reset();
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    window.addEventListener('blur', this._blur);
  }

  /** Aplica las teclas que ha elegido el jugador (acción → lista de códigos). */
  setKeyBindings(guardadas) {
    this.keymap = mapaDeTeclas(teclasEfectivas(guardadas));
  }

  /** Escucha pulsaciones de acción (para menús, pausa, saltar repeticiones). */
  onAction(fn) {
    this.listeners.push(fn);
    return () => {
      const i = this.listeners.indexOf(fn);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  onKey(e, down) {
    const a = this.keymap[e.code];
    if (!a) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    if (down) {
      if (!this.keys.has(a)) {
        this.keys.add(a);
        if (!e.repeat) {
          this.pressedQ.add(a);
          for (const fn of this.listeners.slice()) fn(a, e);
        }
      }
    } else {
      this.keys.delete(a);
      this.releasedQ.add(a);
    }
  }

  reset() {
    this.keys.clear();
    this.pressedQ.clear();
    this.releasedQ.clear();
  }

  down(a) { return this.enabled && (this.keys.has(a) || this.padHeld.has(a) || this.touchHeld.has(a)); }
  pressed(a) { return this.enabled && this.pressedQ.has(a); }
  released(a) { return this.enabled && this.releasedQ.has(a); }

  /** Dirección de movimiento en el plano del campo (X a la derecha, Z hacia la cámara). */
  get move() {
    const m = this._move;
    if (!this.enabled) { m.x = 0; m.z = 0; return m; }
    // Con dirección por ratón el teclado solo avanza (W / flecha arriba): S, A y D no mueven al jugador
    const teclado = this.mouseMove && this.aimVec;
    let x = (teclado ? 0 : (this.keys.has('right') ? 1 : 0) - (this.keys.has('left') ? 1 : 0)) + this.padMove.x + this.touchMove.x;
    let z = (teclado ? 0 : (this.keys.has('down') ? 1 : 0)) - (this.keys.has('up') ? 1 : 0) + this.padMove.z + this.touchMove.z;
    x = Math.max(-1, Math.min(1, x)); z = Math.max(-1, Math.min(1, z));
    // Dirección con ratón: el movimiento (W) va hacia el puntero
    if (teclado) {
      const th = Math.atan2(this.aimVec.z, this.aimVec.x) + Math.PI / 2;
      const c = Math.cos(th), s = Math.sin(th);
      const rx = x * c - z * s, rz = x * s + z * c;
      x = rx; z = rz;
    }
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    m.x = x; m.z = z;
    return m;
  }

  /**
   * Acciones que mantiene el mando en este fotograma. Las que empiezan se tratan
   * como una pulsación de teclado (llegan a los listeners y a pressed()).
   */
  setPad(acciones, move) {
    for (const a of this.padHeld) {
      if (!acciones.has(a)) this.releasedQ.add(a);
    }
    for (const a of acciones) {
      if (!this.padHeld.has(a)) {
        this.pressedQ.add(a);
        for (const fn of this.listeners.slice()) fn(a, null);
      }
    }
    this.padHeld = new Set(acciones);
    this.padMove.x = move.x;
    this.padMove.z = move.z;
  }

  /**
   * Entrada táctil (móvil): acciones pulsadas y joystick. Las que empiezan se tratan como una
   * pulsación, igual que las del teclado o el mando.
   */
  setTouch(acciones, move) {
    for (const a of acciones) {
      if (!this.touchHeld.has(a)) {
        this.pressedQ.add(a);
        for (const fn of this.listeners.slice()) fn(a, null);
      }
    }
    this.touchHeld = new Set(acciones);
    this.touchMove.x = move.x;
    this.touchMove.z = move.z;
  }

  /** Se llama al final de cada paso de simulación que ha leído la entrada. */
  endStep() {
    this.pressedQ.clear();
    this.releasedQ.clear();
  }

  dispose() {
    window.removeEventListener('keydown', this._down);
    window.removeEventListener('keyup', this._up);
    window.removeEventListener('blur', this._blur);
  }
}

// Puntero: solo cuenta como «en uso» si está sobre el canvas y se ha movido hace poco.
// Mientras no se usa, el apuntado de pase sigue al joystick o al teclado.
const POINTER_VIVO_MS = 2500;

Input.prototype.attachPointer = function attachPointer(canvas) {
  if (this.canvasEl) {
    window.removeEventListener('mousemove', this._mouse);
    window.removeEventListener('mousedown', this._mdown);
    window.removeEventListener('mouseup', this._mup);
  }
  this.canvasEl = canvas;
  // Botones del ratón: solo cuenta lo pulsado sobre el campo (no los clics de los menús)
  this._mdown = (e) => {
    if (e.target !== canvas || !BOTONES_RATON[e.button]) return;
    this.onKey({ code: BOTONES_RATON[e.button], target: canvas, preventDefault() {}, repeat: false }, true);
  };
  this._mup = (e) => {
    if (!BOTONES_RATON[e.button]) return;
    this.onKey({ code: BOTONES_RATON[e.button], target: canvas, preventDefault() {}, repeat: false }, false);
  };
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mousemove', this._mouse);
  window.addEventListener('mousedown', this._mdown);
  window.addEventListener('mouseup', this._mup);
};

Input.prototype.onMouse = function onMouse(e) {
  const el = this.canvasEl;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const dentro = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
  this.pointer.inside = dentro;
  if (dentro) { this.pointer.x = x; this.pointer.y = y; this.pointer.t = performance.now(); }
};

/** true si el ratón está sobre el campo y se ha movido hace poco. */
Input.prototype.pointerActive = function pointerActive(now = performance.now()) {
  return !!this.canvasEl && this.pointer.inside && now - this.pointer.t < POINTER_VIVO_MS;
};

