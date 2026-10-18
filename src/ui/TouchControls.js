// Controles táctiles para móvil: joystick de movimiento (izquierda) y botones de acción (derecha).
// Cada botón y el joystick se envían al motor de entrada igual que el teclado o el mando, así que
// el partido no necesita saber si se juega con pantalla táctil.

// Botones principales: Tiro, Pase y Sprint. «Cambio» es secundario. Sin balón, el tiro y el pase
// cambian de nombre y de función (barrida y presión): el motor ya usa la misma acción para ambos casos.
const ETIQUETAS = {
  conBalon: { shoot: 'TIRO', pass: 'PASE' },
  sinBalon: { shoot: 'BARRIDA', pass: 'PRESIÓN' },
};
const RADIO_JOY = 60;   // píxeles de recorrido del pulgar
const ZONA_MUERTA = 0.15;

export class TouchControls {
  constructor(input, contenedor = document.body) {
    this.input = input;
    this.punteros = new Map();   // pointerId -> acción de botón
    this.joyId = null;
    this.move = { x: 0, z: 0 };
    this.el = document.createElement('div');
    this.el.className = 'touch-ui';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="tc-joy" data-joy>
        <div class="tc-joy-base"><div class="tc-joy-knob"></div></div>
      </div>
      <div class="tc-btns">
        <button class="tc-b tc-tiro" data-a="shoot"><span>TIRO</span></button>
        <button class="tc-b tc-pase" data-a="pass"><span>PASE</span></button>
        <button class="tc-b tc-sprint" data-a="sprint"><span>SPRINT</span></button>
        <button class="tc-b tc-cambio" data-a="switch" aria-label="Cambiar de jugador"><span>⇄</span></button>
      </div>
      <button class="tc-pausa" data-a="pause" aria-label="Pausa">❚❚</button>`;
    contenedor.appendChild(this.el);
    this.joy = this.el.querySelector('[data-joy]');
    this.knob = this.el.querySelector('.tc-joy-knob');
    this.el.addEventListener('pointerdown', (e) => this.down(e));
    this.el.addEventListener('pointermove', (e) => this.moveEv(e));
    this.el.addEventListener('pointerup', (e) => this.up(e));
    this.el.addEventListener('pointercancel', (e) => this.up(e));
    // Evita el zoom y el desplazamiento de la página mientras se juega
    this.el.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  setVisible(v) {
    this.el.hidden = !v;
    if (!v) this.reset();
  }

  /** Cambia las etiquetas de Tiro y Pase según tengas el balón (ofensiva) o no (defensiva). */
  setContexto(conBalon) {
    const et = conBalon ? ETIQUETAS.conBalon : ETIQUETAS.sinBalon;
    if (this.conBalon === conBalon) return;
    this.conBalon = conBalon;
    this.el.querySelector('.tc-tiro span').textContent = et.shoot;
    this.el.querySelector('.tc-pase span').textContent = et.pass;
  }

  /** Suelta todos los dedos (al pausar o al ocultar los controles). */
  reset() {
    this.punteros.clear();
    this.joyId = null;
    this.move = { x: 0, z: 0 };
    if (this.knob) this.knob.style.transform = '';
    this.el.querySelectorAll('.tc-b.on, .tc-pausa.on').forEach((b) => b.classList.remove('on'));
    this.input.setTouch(new Set(), { x: 0, z: 0 });
  }

  down(e) {
    const joy = e.target.closest('[data-joy]');
    const boton = e.target.closest('[data-a]');
    if (joy && !boton) {
      this.joyId = e.pointerId;
      this.joy.setPointerCapture(e.pointerId);
      this.joyCentro = this.joy.getBoundingClientRect();
      this.stick(e.clientX, e.clientY);
      return;
    }
    if (boton) {
      e.preventDefault();
      boton.setPointerCapture(e.pointerId);
      this.punteros.set(e.pointerId, boton.dataset.a);
      boton.classList.add('on');
      this.flush();
    }
  }

  moveEv(e) {
    if (e.pointerId === this.joyId) this.stick(e.clientX, e.clientY);
  }

  up(e) {
    if (e.pointerId === this.joyId) {
      this.joyId = null;
      this.move = { x: 0, z: 0 };
      this.knob.style.transform = '';
      this.flush();
    }
    if (this.punteros.has(e.pointerId)) {
      this.punteros.delete(e.pointerId);
      this.el.querySelectorAll('.tc-b.on, .tc-pausa.on').forEach((b) => {
        if (![...this.punteros.values()].includes(b.dataset.a)) b.classList.remove('on');
      });
      this.flush();
    }
  }

  /** Posiciona el stick del joystick y calcula el vector de movimiento (x derecha, z abajo). */
  stick(cx, cy) {
    const r = this.joyCentro;
    let dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RADIO_JOY) { dx = (dx / d) * RADIO_JOY; dy = (dy / d) * RADIO_JOY; }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const fuerza = Math.min(1, Math.hypot(dx, dy) / RADIO_JOY);
    if (fuerza < ZONA_MUERTA) { this.move = { x: 0, z: 0 }; }
    else {
      const ux = dx / (Math.hypot(dx, dy) || 1), uz = dy / (Math.hypot(dx, dy) || 1);
      this.move = { x: ux * fuerza, z: uz * fuerza };
    }
    this.flush();
  }

  /** Envía al motor de entrada lo que está pulsado ahora mismo. */
  flush() {
    this.input.setTouch(new Set(this.punteros.values()), this.move);
  }

  destruir() {
    this.input.setTouch(new Set(), { x: 0, z: 0 });
    this.el.remove();
  }
}
