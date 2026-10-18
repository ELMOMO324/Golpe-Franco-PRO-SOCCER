// Salas en línea sobre WebRTC con PeerJS. El código de sala es el identificador (peer ID) del
// anfitrión: el navegador del invitado usa ese código para encontrar al anfitrión a través del
// servidor de señalización gratuito de PeerJS; después la conexión viaja directa entre los dos.
// La contraseña es una protección sencilla para evitar entradas por accidente, no un cifrado.
import { codificar, decodificar } from './Llave.js';

const PEERJS_VERSION = '1.5.4';
const PEERJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/peerjs/${PEERJS_VERSION}/peerjs.min.js`;
const PREFIJO = 'golpefranco-';
// Sin caracteres confusos (0/O, 1/I)
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generarCodigo(n = 6) {
  let s = '';
  for (let i = 0; i < n; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return s;
}

export const generarClave = () => generarCodigo(4);

let cargando = null;
/** Carga PeerJS desde su CDN la primera vez que hace falta. */
export function cargarPeerJS() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (!cargando) {
    cargando = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = PEERJS_URL;
      s.onload = () => (window.Peer ? ok(window.Peer) : ko(new Error('La librería de red no se ha cargado.')));
      s.onerror = () => { cargando = null; ko(new Error('No se pudo cargar la red. Revisa tu conexión a internet.')); };
      document.head.appendChild(s);
    });
  }
  return cargando;
}

/**
 * Anfitrión: abre la sala con un código y acepta invitados que envíen la contraseña correcta.
 * Invitado: se conecta al código de la sala.
 */
export class Sala {
  constructor({ nombre = 'Jugador', codigo = generarCodigo(), clave = generarClave(), maxInvitados = 1 } = {}) {
    this.nombre = nombre;
    this.codigo = codigo;
    this.clave = clave;
    this.maxInvitados = maxInvitados;
    this.invitados = [];        // conexiones aceptadas (anfitrión)
    this.anfitrion = null;      // conexión con el anfitrión (invitado)
    this.peer = null;
    this.onEvento = () => {};   // (evento) => {}  entrada/salida de invitados, errores
    this.onMensaje = () => {};  // (msg, conn) => {}
  }

  /** Anfitrión: abre la sala con su código. */
  async abrirComoAnfitrion() {
    const Peer = await cargarPeerJS();
    return new Promise((ok, ko) => {
      this.peer = new Peer(PREFIJO + this.codigo, { debug: 0 });
      this.peer.on('open', () => ok(this));
      this.peer.on('connection', (conn) => this._aceptar(conn));
      this.peer.on('error', (err) => {
        if (err.type === 'unavailable-id') ko(new Error('Ese código ya está en uso. Crea la sala otra vez.'));
        else { this.onEvento({ tipo: 'error', motivo: err.message || 'Error de red' }); ko(err); }
      });
    });
  }

  _aceptar(conn) {
    let validado = false;
    conn.on('open', () => {
      // Si la sala está llena, se avisa y se cierra antes de hablar más
      if (this.invitados.length >= this.maxInvitados) {
        conn.send(codificar({ t: 'rechazo', motivo: 'La sala está llena.' }));
        setTimeout(() => conn.close(), 300);
      }
    });
    conn.on('data', (texto) => {
      const msg = decodificar(texto);
      if (!msg) return;
      if (!validado) {
        if (msg.t !== 'hola') return;
        if (this.invitados.length >= this.maxInvitados) return;
        if (String(msg.clave).toUpperCase() !== this.clave) {
          conn.send(codificar({ t: 'rechazo', motivo: 'Contraseña incorrecta.' }));
          setTimeout(() => conn.close(), 300);
          return;
        }
        validado = true;
        conn.nombre = String(msg.nombre || 'Invitado').slice(0, 20);
        this.invitados.push(conn);
        conn.send(codificar({ t: 'bienvenida', sala: this.codigo, nombre: this.nombre }));
        this.onEvento({ tipo: 'entra', nombre: conn.nombre, total: this.invitados.length });
        return;
      }
      this.onMensaje(msg, conn);
    });
    conn.on('close', () => {
      if (!validado) return;
      this.invitados = this.invitados.filter((c) => c !== conn);
      this.onEvento({ tipo: 'sale', nombre: conn.nombre, total: this.invitados.length });
    });
  }

  /** Invitado: busca al anfitrión por su código y se presenta con la contraseña. */
  async conectarComoInvitado(codigo, clave, nombre) {
    const Peer = await cargarPeerJS();
    return new Promise((ok, ko) => {
      this.peer = new Peer({ debug: 0 });
      const limite = setTimeout(() => ko(new Error('No se encuentra la sala. Revisa el código.')), 15000);
      this.peer.on('error', (err) => {
        clearTimeout(limite);
        if (err.type === 'peer-unavailable') ko(new Error('No se encuentra la sala. Revisa el código.'));
        else ko(new Error(err.message || 'Error de red'));
      });
      this.peer.on('open', () => {
        const conn = this.peer.connect(PREFIJO + String(codigo).trim().toUpperCase(), { reliable: true });
        conn.on('open', () => conn.send(codificar({ t: 'hola', nombre, clave: String(clave).trim().toUpperCase() })));
        conn.on('data', (texto) => {
          const msg = decodificar(texto);
          if (!msg) return;
          if (msg.t === 'bienvenida') { clearTimeout(limite); this.anfitrion = conn; ok(msg); return; }
          if (msg.t === 'rechazo') { clearTimeout(limite); ko(new Error(msg.motivo)); conn.close(); return; }
          this.onMensaje(msg, conn);
        });
        conn.on('close', () => this.onEvento({ tipo: 'desconectado' }));
      });
    });
  }

  /** Envía a todos los invitados (anfitrión) o al anfitrión (invitado). */
  enviar(msg) {
    const texto = codificar(msg);
    const destinos = this.anfitrion ? [this.anfitrion] : this.invitados;
    destinos.forEach((c) => { if (c.open) c.send(texto); });
  }

  cerrar() {
    this.invitados.forEach((c) => c.close());
    if (this.anfitrion) this.anfitrion.close();
    if (this.peer) this.peer.destroy();
    this.invitados = [];
    this.anfitrion = null;
    this.peer = null;
  }
}
