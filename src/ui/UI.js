// Menús del juego: portada, menú principal, selección de equipos, formación y
// tácticas, ajustes del partido, pausa, descanso y final. Todo se maneja con
// teclado (flechas / WASD, Enter, Esc) o con el ratón.

import { TEAMS, POS_LABEL, ATTR_KEYS, ATTR_LABELS, getTeam, overall } from '../data/TeamsData.js';
import { TRAINING, KEEPER_LEVELS } from '../match/Training.js';
import { HEAT_W, HEAT_H } from '../match/Player.js';
import { guardarSeleccion, borrarSeleccion, esSeleccionOriginal, torneos, guardarTorneo, borrarTorneo, restaurarBaseDeDatos, crearNuevaBaseDeDatos, jugadores, jugadorPorId, clubDeJugador, guardarJugador, borrarJugador, guardarClub, borrarClub, miembrosDe, estiloPorDefecto, equipacionesPorDefecto, ligas, guardarLiga, guardarLigaOriginal, borrarLiga, leerLogo, esJugadorPersonalizado, esClubOriginal, POSICIONES, PATRONES, COLORES_CAMISETA, COLORES_PIEL, COLORES_PELO, ALTURAS, MIN_JUGADORES_CLUB, MIN_CLUBES_LIGA } from '../data/Custom.js';
import { listarCarreras, cargarCarrera, crearCarrera, guardarCarrera, borrarCarrera, tablaDe, userFixture, simularJornada, nuevaTemporada, ventanaAbierta, obtenerMercado, comprar, vender, valorDe, mejorar, POSICIONES_JUGADOR, PUNTOS_INICIALES, ATTR_BASE, ATTR_MIN_INICIAL, ATTR_MAX_INICIAL, ATTR_MAX, avanzarEvento, titularesDe, sustituirTitular, intercambiarTitulares } from '../career/Career.js';

import { buscarJugadores, jugadorDelMundo, anadirInteres, quitarInteres, ofertarCompra, generarEntrantes, aceptarNegociacion, cerrarNegociacion, ROLES, ROLES_NOMBRE, sueldoMinimo, contratoEvaluar, firmarContrato } from '../career/Career.js';
import { FORMATIONS, FORMATION_NAMES, pickLineup, pickLineupFor } from '../data/Formations.js';
import { MENTALITIES, SLIDERS, DIFFICULTIES, DIFFICULTY_ORDER, tacticsFromStyle, presetForMentality } from '../match/Tactics.js';
import { CONTROLS_HELP, ACCIONES, TECLADO_DEFECTO, TECLAS_RESERVADAS, teclasEfectivas, nombreTecla } from '../core/Input.js';
import { MANDO_DEFECTO, mandoEfectivo, nombreBoton, familiaMando } from '../core/Gamepad.js';
import { CAMERA_STYLES } from '../render/Camera.js';
import { crestURL } from '../render/Crests.js';
import { PlayerPreview, fotoJugador } from '../render/PlayerPreview.js';
import { tarjetaJugadorHTML } from './PlayerCard.js';
import { descargarCopia, restaurarCopia } from '../data/Copia.js';
import { guardadoCorrecto } from '../data/Custom.js';
import { VIDEO_CONTROLES } from './EjemploVideo.js';
import { hubDTHTML, navHTML, calendarioHTML, centralHTML, notifHTML, plantillaHTML, svgEstadio, icono, POSICIONES_CAMPO, oficinaHTML } from './HubDT.js';
import { alternarTitular, asignarRol, cambiarPosicion } from '../career/Career.js';
import { clamp } from '../core/MathUtils.js';
import { Sala, generarCodigo, generarClave } from '../net/Sala.js';
import { LIMITES, ajustesPorDefecto, validarTuClub, tuClubDefinicion } from '../net/TuClub.js';
import { PLATAFORMAS } from '../core/Plataforma.js';
const PLATAFORMA_NOMBRE = { auto: 'AUTOMÁTICA', pc: 'PC', movil: 'MÓVIL' };
import { crearLlave, pendientes, registrarResultado, TAMANOS_TORNEO, nombreRonda } from '../net/Llave.js';
import { opcionesGrupos, eliminatoriaValida, repartirCupos, crearTorneo, simularTorneo, tablaGrupo } from '../data/Torneos.js';
import { UEFA_NOMBRE, championsDe, fasePendiente, partidoDelClub, simularFase } from '../data/Champions.js';

/** Ligas que reciben cupos en los torneos (las del golpe franco, la argentina y la brasileña quedan fuera). */
const LIGAS_EUROPEAS = ['lg-eng', 'lg-esp', 'lg-ger', 'lg-ita', 'lg-fra', 'lg-por', 'lg-ned', 'lg-bel', 'lg-tur', 'lg-sco'];

// Iconos sencillos (SVG) para las tarjetas de personalización
const ICONO = {
  jugador: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="18" r="10" fill="currentColor"/><path d="M14 58c0-12 8-20 18-20s18 8 18 20z" fill="currentColor"/></svg>',
  club: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 10h40v22c0 12-9 20-20 24C21 52 12 44 12 32z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M22 22h20v12c0 6-5 10-10 12-5-2-10-6-10-12z" fill="currentColor"/></svg>',
  liga: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 8h28v14c0 9-6 16-14 18-8-2-14-9-14-18z" fill="currentColor"/><path d="M18 14H8c0 9 4 13 11 14M46 14h10c0 9-4 13-11 14" fill="none" stroke="currentColor" stroke-width="3"/><rect x="26" y="40" width="12" height="8" fill="currentColor"/><rect x="18" y="48" width="28" height="7" rx="2" fill="currentColor"/></svg>',
  editar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" fill="currentColor"/><path d="M14 6l4 4" stroke="#0e1626" stroke-width="1.6"/></svg>',
  borrar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l-1 13H6zM9 4h6l1 2H8z" fill="currentColor"/><path d="M9 10v7M12 10v7M15 10v7" stroke="#0e1626" stroke-width="1.5"/></svg>',
};

Object.assign(ICONO, {
  seleccion: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="8" width="4" height="50" fill="currentColor"/><path d="M16 10h34l-6 9 6 9H16z" fill="currentColor"/><path d="M16 10h34l-6 9 6 9H16z" fill="none" stroke="currentColor" stroke-width="0"/></svg>',
  torneo: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 8h28v12c0 9-6 16-14 18-8-2-14-9-14-18z" fill="currentColor"/><path d="M18 14H8c0 9 4 13 11 14M46 14h10c0 9-4 13-11 14" fill="none" stroke="currentColor" stroke-width="3"/><rect x="28" y="38" width="8" height="8" fill="currentColor"/><rect x="20" y="46" width="24" height="8" rx="2" fill="currentColor"/></svg>',
});

/** Siguiente valor de una lista, en la dirección dada (-1 o 1), dando la vuelta. */
function cyc(lista, actual, dir) {
  const i = lista.indexOf(actual);
  const n = lista.length;
  return lista[((i < 0 ? 0 : i) + Number(dir) + n) % n];
}

const ESQUEMAS = ['clasico', 'alternativo', 'personalizado'];
const ESQUEMA_NOMBRE = { clasico: 'CLÁSICO', alternativo: 'ALTERNATIVO', personalizado: 'PERSONALIZADO' };

/** Apellido del DT de cada club: siempre el mismo para ese club. */
const APELLIDOS_DT = ['Ferrer', 'Ortolá', 'Varela', 'Nakamura', 'Brandt', 'Solanas', 'Okafor', 'Moreno', 'Rinaldi', 'Kovač', 'Lindqvist', 'Sokolov'];
function apellidoDT(clubId) {
  let h = 2166136261;
  for (const ch of String(clubId)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return APELLIDOS_DT[(h >>> 0) % APELLIDOS_DT.length];
}

/** Oficina con el DT detrás de la mesa y el jugador de pie frente a él (ilustración SVG). */
function escenaOficina(kit) {
  const camisa = kit && kit.shirt ? kit.shirt : '#c8102e';
  return `<svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="pared" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2433"/><stop offset="1" stop-color="#0b1119"/></linearGradient></defs>
    <rect width="800" height="420" fill="url(#pared)"/>
    <rect x="520" y="50" width="210" height="180" fill="#2b4a6e" stroke="#4a6d94" stroke-width="8"/>
    <path d="M520 150h210M625 50v180" stroke="#4a6d94" stroke-width="6"/>
    <rect x="120" y="90" width="150" height="110" fill="#152030" stroke="#33465f" stroke-width="4"/>
    <rect x="132" y="102" width="126" height="86" fill="#2f7d3c" opacity=".55"/>
    <rect x="60" y="262" width="680" height="16" fill="#4a3322"/>
    <rect x="100" y="278" width="22" height="130" fill="#2a1e14"/><rect x="678" y="278" width="22" height="130" fill="#2a1e14"/>
    <rect x="180" y="226" width="110" height="36" fill="#e9ecf2" opacity=".85"/>
    <rect x="186" y="232" width="98" height="5" fill="#9aa6bb"/><rect x="186" y="244" width="70" height="5" fill="#9aa6bb"/>
    <rect x="600" y="222" width="46" height="40" fill="#8a5a2b"/><path d="M606 222l-4-26h38l-4 26" fill="#2a3a52"/>
    <g class="cine-jug">
      <circle cx="260" cy="170" r="28" fill="#d19a73"/><path d="M234 160c4-22 46-22 52 0-10-8-42-8-52 0z" fill="#2d2018"/>
      <rect x="226" y="198" width="72" height="92" rx="12" fill="${camisa}"/>
      <rect x="236" y="290" width="22" height="96" fill="#1c2230"/><rect x="266" y="290" width="22" height="96" fill="#1c2230"/>
    </g>
    <g class="cine-dt">
      <rect x="455" y="200" width="100" height="86" rx="14" fill="#1f2a3d"/>
      <path d="M498 200l-8 26 8 14 8-14z" fill="#c8102e"/>
      <circle cx="505" cy="168" r="30" fill="#c79571"/><path d="M476 158c6-26 56-26 60 0-14-12-46-12-60 0z" fill="#8f8f8f"/>
      <rect x="470" y="280" width="28" height="60" fill="#1c2230"/><rect x="512" y="280" width="28" height="60" fill="#1c2230"/>
    </g>
  </svg>`;
}

/** Escena de la firma: DT tras la mesa, agente y jugador de traje, contrato y camiseta con dorsal y nombre. */
function escenaFirma(kit, firma) {
  const camisa = kit && kit.shirt ? kit.shirt : '#c8102e';
  const acento = kit && kit.accent ? kit.accent : '#ffffff';
  const dorsal = firma && firma.dorsal != null ? firma.dorsal : 10;
  const nombre = firma && firma.short ? firma.short : '';
  return `<svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="800" height="420" fill="#141c2a"/>
    <rect x="0" y="0" width="800" height="26" fill="${camisa}"/><rect x="0" y="26" width="800" height="6" fill="${acento}"/>
    <rect x="80" y="60" width="150" height="110" fill="#1d2a40" stroke="#33465f" stroke-width="4"/>
    <rect x="590" y="60" width="150" height="110" fill="#1d2a40" stroke="#33465f" stroke-width="4"/>
    <rect x="130" y="240" width="540" height="22" fill="#4a3322"/>
    <rect x="150" y="262" width="20" height="120" fill="#2a1e14"/><rect x="630" y="262" width="20" height="120" fill="#2a1e14"/>
    <rect x="330" y="226" width="140" height="18" fill="#e9ecf2"/><path d="M348 226l18-26 18 26" fill="none" stroke="#2b3446" stroke-width="3"/>
    <g class="cine-agente">
      <circle cx="210" cy="170" r="26" fill="#b98062"/><path d="M186 160c6-20 42-20 48 0" fill="#1c1c1c"/>
      <rect x="180" y="196" width="60" height="94" rx="10" fill="#1f2a3d"/><path d="M210 196l-6 18 6 14 6-14z" fill="#f2f2f2"/>
      <rect x="186" y="290" width="18" height="92" fill="#11151f"/><rect x="216" y="290" width="18" height="92" fill="#11151f"/>
    </g>
    <g class="cine-jug">
      <circle cx="400" cy="162" r="28" fill="#d19a73"/><path d="M374 152c4-22 46-22 52 0-10-8-42-8-52 0z" fill="#2d2018"/>
      <rect x="368" y="192" width="64" height="100" rx="12" fill="${camisa}"/>
      <rect x="378" y="292" width="20" height="92" fill="#1c2230"/><rect x="402" y="292" width="20" height="92" fill="#1c2230"/>
      <rect x="352" y="206" width="96" height="66" rx="6" fill="${camisa}" stroke="${acento}" stroke-width="3"/>
      <text x="400" y="246" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="30" fill="${acento}">${esc(String(dorsal))}</text>
      <text x="400" y="186" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="14" fill="${acento}" opacity=".9">${esc(nombre)}</text>
    </g>
    <g class="cine-dt">
      <rect x="560" y="200" width="100" height="86" rx="14" fill="#1f2a3d"/>
      <path d="M602 200l-8 26 8 14 8-14z" fill="${camisa}"/>
      <circle cx="610" cy="168" r="30" fill="#c79571"/><path d="M581 158c6-26 56-26 60 0-14-12-46-12-60 0z" fill="#8f8f8f"/>
      <rect x="575" y="280" width="28" height="60" fill="#1c2230"/><rect x="617" y="280" width="28" height="60" fill="#1c2230"/>
    </g>
  </svg>`;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DURATIONS = [2, 3, 5, 8, 10];
const QUALITIES = [['baja', 'BAJA'], ['media', 'MEDIA'], ['alta', 'ALTA']];

function bar(label, value) {
  return `<div class="stat"><span class="stat-l">${label}</span><span class="stat-b"><i style="width:${value}%"></i></span><span class="stat-v">${value}</span></div>`;
}

function kitSwatch(k) {
  const pat = {
    stripes: `repeating-linear-gradient(90deg, ${k.shirt} 0 14%, ${k.accent} 14% 28%)`,
    pinstripes: `repeating-linear-gradient(90deg, ${k.shirt} 0 12%, ${k.accent} 12% 15%)`,
    hoops: `repeating-linear-gradient(180deg, ${k.shirt} 0 16%, ${k.accent} 16% 32%)`,
    halves: `linear-gradient(90deg, ${k.shirt} 50%, ${k.accent} 50%)`,
    sash: `linear-gradient(125deg, ${k.shirt} 40%, ${k.accent} 40% 60%, ${k.shirt} 60%)`,
    band: `linear-gradient(180deg, ${k.shirt} 35%, ${k.accent} 35% 55%, ${k.shirt} 55%)`,
  }[k.pattern] || k.shirt;
  const sleeve = k.pattern === 'sleeves' ? k.accent : k.shirt;
  return `<span class="kit"><i class="kit-sl" style="background:${sleeve}"></i><i class="kit-body" style="background:${pat}"></i><i class="kit-sl" style="background:${sleeve}"></i><i class="kit-sh" style="background:${k.shorts}"></i></span>`;
}

const CLAVE_BD = 'Unlock';

/** Posición en cuatro grupos para filtrar. */
function catPosicion(pos) {
  if (pos === 'GK') return 'POR';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'DEF';
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'MED';
  return 'DEL';
}

/** Filtros por posición, media y edad. Cada uno dice qué valores ofrece y si una fila lo cumple. */
const FILTROS_CHIP = {
  jug: {
    pos: {
      etiqueta: 'POSICIÓN', todos: 'TODAS', valores: ['', 'POR', 'DEF', 'MED', 'DEL'],
      nombre: (v) => ({ POR: 'PORTEROS', DEF: 'DEFENSAS', MED: 'CENTROCAMPISTAS', DEL: 'DELANTEROS' })[v],
      cumple: (v, d) => d.cat === v,
    },
    ovr: {
      etiqueta: 'MEDIA', todos: 'TODAS', valores: ['', '60', '70', '80'],
      nombre: (v) => `${v}+`,
      cumple: (v, d) => Number(d.ovr) >= Number(v),
    },
    edad: {
      etiqueta: 'EDAD', todos: 'TODAS', valores: ['', '-23', '23-27', '28-31', '32+'],
      nombre: (v) => ({ '-23': 'HASTA 23', '23-27': '23 A 27', '28-31': '28 A 31', '32+': '32 O MÁS' })[v],
      cumple: (v, d) => {
        const e = Number(d.edad);
        if (!d.edad) return false;
        if (v === '-23') return e <= 23;
        if (v === '32+') return e >= 32;
        const [a, b] = v.split('-').map(Number);
        return e >= a && e <= b;
      },
    },
  },
  club: {
    ovr: {
      etiqueta: 'MEDIA DEL CLUB', todos: 'TODAS', valores: ['', '60', '70', '75'],
      nombre: (v) => `${v}+`,
      cumple: (v, d) => Number(d.ovr) >= Number(v),
    },
  },
};

/** Color del mapa de calor: azul (poco) → amarillo → rojo (mucho). */
function rampaCalor(t) {
  const a = [30, 90, 255], b = [255, 220, 40], c = [255, 30, 20];
  const f = (x, y, k) => Math.round(x + (y - x) * k);
  if (t < 0.5) { const k = t * 2; return [f(a[0], b[0], k), f(a[1], b[1], k), f(a[2], b[2], k)]; }
  const k = (t - 0.5) * 2;
  return [f(b[0], c[0], k), f(b[1], c[1], k), f(b[2], c[2], k)];
}
const TECLAS_CLAVE = ['KeyA', 'KeyX', 'KeyF'];
const LUPA = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

/** Texto en minúsculas y sin acentos, para comparar búsquedas. */
const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export class UI {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.screen = null;
    this.actions = {};
    this.back = null;
    this.focusIdx = 0;
    this.state = {};
    // Mantener pulsado ◀ ▶ + − : la acción se repite; el clic al soltar no vuelve a contar
    root.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('button.arrow[data-act]');
      if (!el || !this.root.contains(el) || el.disabled || e.button > 0) return;
      this.pararRepeticion();
      const act = el.dataset.act, arg = el.dataset.arg;
      this.skipClick = { key: act + '|' + (arg ?? ''), at: performance.now() };
      const nav = el.closest('[data-nav]');
      if (nav) this.focus(this.navs().indexOf(nav));
      this.run(act, arg, el);
      this.holdT = setTimeout(() => {
        this.holdI = setInterval(() => {
          if (this.actions[act]) this.run(act, arg, el);
          else this.pararRepeticion();
        }, 90);
      }, 380);
    });
    const parar = () => this.pararRepeticion();
    window.addEventListener('pointerup', parar);
    window.addEventListener('pointercancel', parar);
    window.addEventListener('blur', parar);

    root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || !this.root.contains(el)) return;
      const k = el.dataset.act + '|' + (el.dataset.arg ?? '');
      if (this.skipClick && this.skipClick.key === k && performance.now() - this.skipClick.at < 1500) {
        this.skipClick = null;
        return;
      }
      const nav = el.closest('[data-nav]');
      if (nav) this.focus(this.navs().indexOf(nav));
      this.run(el.dataset.act, el.dataset.arg, el);
    });
    root.addEventListener('mousemove', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        const i = this.navs().indexOf(nav);
        if (i >= 0 && i !== this.focusIdx) this.focus(i, true);
      }
    });
    root.addEventListener('change', (e) => {
      const el = e.target.closest('[data-change]');
      if (el && this.root.contains(el)) this.run(el.dataset.change, el.files && el.files[0], el);
    });
    root.addEventListener('input', (e) => {
      const el = e.target.closest('[data-input]');
      if (el) this.run(el.dataset.input, el.value, el);
    });
    root.addEventListener('input', (e) => {
      const f = e.target.closest && e.target.closest('[data-filtro]');
      if (f && this.root.contains(f)) {
        this.state.filtro = { ...(this.state.filtro || {}), [f.dataset.filtro]: f.value };
        this.aplicarFiltro();
      }
    });
    window.addEventListener('keydown', (e) => this.onKey(e));
    // Combinación secreta A+X+F en el menú principal (mantenidas a la vez)
    this.teclasPulsadas = new Set();
    this.bdDesbloqueada = false;
    this.bloqueo = false;
    window.addEventListener('keydown', (e) => {
      this.teclasPulsadas.add(e.code);
      if (this.screen === 'main' && !this.bloqueo && TECLAS_CLAVE.every((c) => this.teclasPulsadas.has(c))) this.abrirPuerta();
    });
    window.addEventListener('keyup', (e) => this.teclasPulsadas.delete(e.code));
    window.addEventListener('blur', () => this.teclasPulsadas.clear());
  }

  get visible() {
    return !!this.screen;
  }

  navs() {
    return Array.from(this.root.querySelectorAll('[data-nav]')).filter((n) => !n.closest('[hidden]'));
  }

  pararRepeticion() {
    clearTimeout(this.holdT);
    clearInterval(this.holdI);
    this.holdT = null;
    this.holdI = null;
  }

  focus(i, silent) {
    const list = this.navs();
    if (!list.length) return;
    this.focusIdx = clamp(i, 0, list.length - 1);
    list.forEach((n, k) => n.classList.toggle('focus', k === this.focusIdx));
    const el = list[this.focusIdx];
    if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    if (!silent) this.game.audio.ui('move');
  }

  run(name, arg, el) {
    const fn = this.actions[name];
    if (fn) fn(arg, el);
  }

  onKey(e) {
    if (this.bloqueo) return;
    const campo = e.target && e.target.tagName === 'INPUT' && e.target.dataset && e.target.dataset.filtro;
    if (campo) {
      // En el buscador: Esc limpia, Enter o flecha abajo pasan a la lista
      if (e.code === 'Escape') { e.preventDefault(); e.target.value = ''; this.state.filtro = { ...(this.state.filtro || {}), [e.target.dataset.filtro]: '' }; this.aplicarFiltro(); e.target.blur(); }
      else if (e.code === 'Enter' || e.code === 'ArrowDown') { e.preventDefault(); e.target.blur(); this.focus(0); }
      return;
    }
    if (this.captura && this.captura.tipo === 'teclado') {
      e.preventDefault();
      if (e.code === 'Escape') this.cancelarCaptura();
      else this.terminarCaptura(e.code);
      return;
    }
    if (!this.screen || e === this.skipEvent) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' && e.target.type !== 'range') return;
    const list = this.navs();
    const cur = list[this.focusIdx];
    const k = e.code;
    const up = k === 'ArrowUp' || k === 'KeyW', down = k === 'ArrowDown' || k === 'KeyS';
    const left = k === 'ArrowLeft' || k === 'KeyA', right = k === 'ArrowRight' || k === 'KeyD';
    if (this.actions.any && !e.repeat && k !== 'F11' && k !== 'F12' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); this.run('any'); return; }
    if (up || down) {
      e.preventDefault();
      if (!list.length) return;
      // Navegación espacial sencilla: el más cercano en esa dirección
      const r = cur ? cur.getBoundingClientRect() : null;
      let best = -1, bs = 1e9;
      list.forEach((n, i) => {
        if (n === cur) return;
        const q = n.getBoundingClientRect();
        const dy = (q.top + q.height / 2) - (r.top + r.height / 2);
        if ((down && dy <= 4) || (up && dy >= -4)) return;
        const dx = Math.abs((q.left + q.width / 2) - (r.left + r.width / 2));
        const s = Math.abs(dy) + dx * 0.6;
        if (s < bs) { bs = s; best = i; }
      });
      if (best >= 0) this.focus(best);
    } else if (left || right) {
      if (!cur) return;
      const adj = cur.dataset.adj;
      if (adj) { e.preventDefault(); this.run(adj, right ? 1 : -1, cur); this.game.audio.ui('move'); return; }
      // Sin ajuste: moverse en horizontal entre elementos de la misma fila
      const r = cur.getBoundingClientRect();
      let best = -1, bs = 1e9;
      list.forEach((n, i) => {
        if (n === cur) return;
        const q = n.getBoundingClientRect();
        const dx = (q.left + q.width / 2) - (r.left + r.width / 2);
        if ((right && dx <= 4) || (left && dx >= -4)) return;
        const dy = Math.abs((q.top + q.height / 2) - (r.top + r.height / 2));
        const s = Math.abs(dx) + dy * 2.5;
        if (s < bs) { bs = s; best = i; }
      });
      if (best >= 0) { e.preventDefault(); this.focus(best); }
    } else if (k === 'Enter' || k === 'Space') {
      e.preventDefault();
      if (cur && cur.dataset.act) { this.run(cur.dataset.act, cur.dataset.arg, cur); }
      else this.run('enter');
    } else if (k === 'Escape' || k === 'Backspace') {
      if (this.back) { e.preventDefault(); this.game.audio.ui('back'); this.back(); }
    }
  }

  /** Muestra una pantalla. keepFocus conserva el elemento seleccionado al redibujar. */
  render(name, html, actions, back, keepFocus) {
    const same = this.screen === name;
    this.screen = name;
    this.actions = actions || {};
    this.back = back || null;
    // Si es la misma pantalla, se conserva la posición de cada zona con desplazamiento
    const guardados = same ? [...this.root.querySelectorAll('*')].map((e, i) => [i, e.scrollTop]).filter(([, t]) => t > 0) : [];
    this.root.innerHTML = `<div class="screen s-${name}">${html}</div>`;
    this.root.hidden = false;
    this.syncVolverMovil();
    if (guardados.length) {
      const nodos = this.root.querySelectorAll('*');
      for (const [i, t] of guardados) if (nodos[i]) nodos[i].scrollTop = t;
    }
    const list = this.navs();
    let i = same && keepFocus ? this.focusIdx : list.findIndex((n) => n.hasAttribute('data-default'));
    if (i < 0) i = 0;
    this.focusIdx = Math.min(i, Math.max(0, list.length - 1));
    list.forEach((n, k) => n.classList.toggle('focus', k === this.focusIdx));
    this.aplicarFiltro();
    if (name !== 'main') this.quitarBotonBD();
  }

  /** Botón FILTRAR y etiqueta del filtro activo (jugadores por club, clubes por liga). */
  filtroBtn(lista) {
    const f = (this.state.fExt || {})[lista];
    let nombre = '';
    if (f) {
      if (f.tipo === 'liga') nombre = (ligas().find((l) => l.id === f.id) || {}).nombre || '';
      else nombre = f.id === 'libre' ? 'LIBRE' : ((getTeam(f.id) || {}).name || '');
    }
    const tipo = f && f.tipo === 'liga' ? 'LIGA' : 'CLUB';
    return `<button class="pl-fbtn${f ? ' on' : ''}" data-nav data-act="fAbrir" data-arg="${lista}">FILTRAR</button>`
      + (f ? `<span class="pl-chip">${tipo}: ${esc(nombre)} <button data-nav data-act="fQuitar" data-arg="${lista}" aria-label="Quitar filtro">✕</button></span>` : '');
  }

  /** Panel con cuadro de texto y opciones para elegir el filtro (liga o club). */
  panelFiltro(lista) {
    if ((this.state.fPanel || null) !== lista) return '';
    const esClub = lista === 'club';
    const opciones = esClub
      ? ligas().map((l) => ({ id: l.id, name: l.nombre, sub: `${l.clubes.length} clubes` }))
      : [{ id: 'libre', name: 'Libre', sub: 'sin club' }, ...TEAMS.map((t) => ({ id: t.id, name: t.name, sub: t.short }))];
    return `<div class="pl-filtro-panel">
      <div class="pl-panel-h"><b>FILTRAR POR ${esClub ? 'LIGA' : 'CLUB'}</b><button class="pl-fcerrar" data-nav data-act="fCerrar">CERRAR</button></div>
      <label class="pl-search">${LUPA}<input type="search" data-filtro="fpanel" autocomplete="off" placeholder="Escribe ${esClub ? 'una liga' : 'un club'}…" aria-label="Escribe para filtrar"></label>
      <div class="pl-fopts">${opciones.map((o) => `<button class="pl-fopt" data-nav data-act="fPick" data-arg="${lista}|${o.id}" data-busca="${esc(norm(o.name + ' ' + o.sub))}"><b>${esc(o.name)}</b><small>${esc(o.sub)}</small></button>`).join('')}</div>
      <p class="mute pl-vacio-f" hidden>Ninguna opción coincide.</p>
    </div>`;
  }

  /** Acciones del botón FILTRAR para una lista. */
  accionesFiltro(lista) {
    const refrescar = () => (this.state.lista === 'jug' ? this.listaJugadores() : this.listaClubes());
    return {
      fChip: (arg) => {
        const [l, key] = arg.split('|');
        const cfg = FILTROS_CHIP[l][key];
        const cur = ((this.state.fChip || {})[l] || {})[key] || '';
        const sig = cfg.valores[(cfg.valores.indexOf(cur) + 1) % cfg.valores.length];
        this.state.fChip = { ...(this.state.fChip || {}), [l]: { ...((this.state.fChip || {})[l] || {}), [key]: sig } };
        refrescar();
      },
      fChipsOff: (l) => { this.state.fChip = { ...(this.state.fChip || {}), [l]: {} }; refrescar(); },
      fAbrir: () => { this.state.fPanel = lista; refrescar(); },
      fCerrar: () => { this.state.fPanel = null; refrescar(); },
      fQuitar: () => { const e = { ...(this.state.fExt || {}) }; delete e[lista]; this.state.fExt = e; refrescar(); },
      fPick: (arg) => {
        const [l, id] = arg.split('|');
        const tipo = l === 'club' ? 'liga' : 'club';
        this.state.fExt = { ...(this.state.fExt || {}), [l]: { tipo, id } };
        this.state.fPanel = null;
        refrescar();
      },
    };
  }

  /** Botones que cambian posición, media y edad (se combinan con el buscador y el filtro de club o liga). */
  chipsFiltro(lista) {
    const act = (this.state.fChip || {})[lista] || {};
    const cfg = FILTROS_CHIP[lista];
    const botones = Object.entries(cfg).map(([key, c]) => {
      const v = act[key] || '';
      const txt = v ? c.nombre(v) : c.todos;
      return `<button class="pl-chip-f${v ? ' on' : ''}" data-nav data-act="fChip" data-arg="${lista}|${key}">${c.etiqueta}: <b>${esc(txt)}</b></button>`;
    }).join('');
    const hay = Object.values(act).some(Boolean);
    return `<div class="pl-chips">${botones}${hay ? `<button class="pl-chip-f clear" data-nav data-act="fChipsOff" data-arg="${lista}">LIMPIAR</button>` : ''}</div>`;
  }

  /** Grupos a los que pertenece una fila para el filtro: ligas del club, o club del jugador. */
  gruposDe(lista, id) {
    if (lista === 'club') return ligas().filter((l) => l.clubes.includes(id)).map((l) => l.id).join('|');
    return id || 'libre';
  }

  /** Muestra solo las filas de la lista que coinciden con el buscador. */
  aplicarFiltro() {
    const campo = this.root.querySelector('[data-filtro]');
    if (!campo) return;
    const q = norm(campo.value.trim());
    const ext = (this.state.fExt || {})[this.state.lista];
    const chips = (this.state.fChip || {})[this.state.lista] || {};
    let visibles = 0;
    this.root.querySelectorAll('.pl-row[data-busca]').forEach((r) => {
      const okTexto = !q || q.split(/\s+/).every((w) => r.dataset.busca.includes(w));
      const okGrupo = !ext || (r.dataset.grupos || '').split('|').includes(ext.id);
      const okChips = Object.entries(chips).every(([k, v]) => !v || FILTROS_CHIP[this.state.lista][k].cumple(v, r.dataset));
      const ok = okTexto && okGrupo && okChips;
      r.hidden = !ok;
      if (ok) visibles++;
    });
    // Panel de filtro: escribir filtra sus opciones
    const fp = this.root.querySelector('[data-filtro="fpanel"]');
    if (fp) {
      const qf = norm(fp.value.trim());
      let vf = 0;
      this.root.querySelectorAll('.pl-fopt').forEach((o) => {
        const ok = !qf || qf.split(/\s+/).every((w) => o.dataset.busca.includes(w));
        o.hidden = !ok;
        if (ok) vf++;
      });
      const vacioF = this.root.querySelector('.pl-vacio-f');
      if (vacioF) vacioF.hidden = vf > 0;
    }
    const vacio = this.root.querySelector('.pl-empty');
    if (vacio) vacio.hidden = visibles > 0;
  }

  buscador(lista, texto) {
    const v = esc((this.state.filtro && this.state.filtro[lista]) || '');
    return `<label class="pl-search">${LUPA}<input type="search" data-filtro="${lista}" value="${v}" placeholder="${texto}" autocomplete="off" aria-label="${texto}"></label>`;
  }

  /**
   * Botón de volver (solo en móvil): siempre visible en las pantallas de menú, para no quedarse
   * atrapado en una pantalla. Usa la misma función de retorno que la tecla ESC.
   */
  syncVolverMovil() {
    let b = document.getElementById('volver-movil');
    if (!b) {
      b = document.createElement('button');
      b.id = 'volver-movil';
      b.className = 'volver-movil';
      b.setAttribute('aria-label', 'Volver');
      b.textContent = '‹ VOLVER';
      b.addEventListener('click', (e) => { e.preventDefault(); this.volverMovil(); });
      document.body.appendChild(b);
    }
    const movil = document.documentElement.classList.contains('movil');
    const SIN_VOLVER = ['main', 'setup', 'splash', 'loading'];
    const enMenu = !!this.screen && !SIN_VOLVER.includes(this.screen) && !this.root.hidden;
    b.hidden = !(movil && enMenu);
  }

  /** Vuelve a la pantalla anterior; si no hay, al menú principal. */
  volverMovil() {
    this.game.audio.ui('back');
    try {
      if (this.back) this.back();
      else this.main();
    } catch (e) {
      this.main();   // si la pantalla anterior no se puede abrir, se vuelve al menú principal
    }
  }

  hide() {
    this.screen = null;
    this.actions = {};
    this.back = null;
    this.root.innerHTML = '';
    this.syncVolverMovil();
    this.root.hidden = true;
  }

  hint(items) {
    return `<div class="hint">${items.map(([k, t]) => `<span><kbd>${k}</kbd>${t}</span>`).join('')}</div>`;
  }

  // ----------------------------------------------------------------- Créditos
  // ----------------------------------------------------------------- Online
  /** Tarjeta grande de la sección Online (Partidos, Torneo, Liga). */
  otCard(act, titulo, desc, bloqueada = false) {
    return `<button class="ot${bloqueada ? ' ot-soon' : ''}" data-nav data-act="${act}" ${bloqueada ? 'disabled' : ''}>
      <span class="ot-t">${titulo}</span><span class="ot-d">${desc}</span>
      ${bloqueada ? '<span class="ot-badge">PRÓXIMAMENTE</span>' : ''}
    </button>`;
  }

  /** «Tu Club»: usuario, club base de la plantilla, nombre y logo propios. */
  tuClub() {
    const g = this.game;
    if (!this.state.tcDraft) {
      const guardado = g.save.settings.tuClub;
      const base = TEAMS.filter((t) => !t.seleccion).map((t) => t.id);
      this.state.tcDraft = guardado ? { ...guardado } : ajustesPorDefecto(base);
      if (!this.state.tcDraft.base) this.state.tcDraft.base = base[0];
    }
    const d = this.state.tcDraft;
    const clubes = TEAMS.filter((t) => !t.seleccion);
    const idx = Math.max(0, clubes.findIndex((t) => t.id === d.base));
    const base = clubes[idx];
    const vista = validarTuClub(d).length ? null : tuClubDefinicion(d);
    const errores = validarTuClub(d);
    const vistaEquipo = tuClubDefinicion({ ...d, base: base.id, usuario: d.usuario || 'Jugador' });
    const cabecera = `<header class="head"><span class="head-step">ONLINE</span><h1>TU CLUB</h1></header>`;
    this.render('tuClub', `
      ${cabecera}
      <div class="tc-grid">
        <div class="ol-panel">
          <label class="car-field"><span>NOMBRE DE USUARIO</span>
            <input class="car-input" type="text" maxlength="${LIMITES.usuario}" autocomplete="off" value="${esc(d.usuario)}" data-input="tcUsuario"></label>
          <div class="row" data-nav data-adj="tcBase"><span class="row-l">CLUB BASE</span><span class="row-v">
            <button class="arrow sm" data-act="tcBase" data-arg="-1" aria-label="Club anterior">◀</button>
            <b class="tc-base">${esc(base.name)}</b>
            <button class="arrow sm" data-act="tcBase" data-arg="1" aria-label="Club siguiente">▶</button></span></div>
          <p class="mute sm">Usas la plantilla y la media de ${esc(base.name)} (${base.ovr} de media).</p>
          <label class="car-field"><span>NOMBRE DE TU CLUB (OPCIONAL)</span>
            <input class="car-input" type="text" maxlength="${LIMITES.nombre}" autocomplete="off" value="${esc(d.nombre)}" placeholder="${esc(base.name)}" data-input="tcNombre"></label>
          <div class="tc-logo">
            <span>LOGO PROPIO</span>
            <label class="btn sm">SUBIR LOGO<input type="file" accept="image/png,image/jpeg,image/webp" hidden data-change="tcLogo"></label>
            ${d.logo ? '<button class="btn sm" data-nav data-act="tcQuitar">QUITAR LOGO</button>' : '<span class="mute sm">Sin logo: se usa el del club base.</span>'}
          </div>
          ${errores.length ? `<ul class="car-msg tc-errores">${errores.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
          ${this.tcMsg ? `<p class="ol-estado">${esc(this.tcMsg)}</p>` : ''}
          <div class="report-btns">
            <button class="btn go" data-nav data-act="tcGuardar" data-default ${errores.length ? 'disabled' : ''}>GUARDAR MI CLUB</button>
            <button class="btn" data-nav data-act="olVolverA">VOLVER</button>
          </div>
        </div>
        <div class="tc-vista">
          <div class="tc-card">
            <img class="tc-escudo" src="${crestURL(vista || vistaEquipo, 200)}" alt="">
            <b class="tc-nombre">${esc(vistaEquipo.name)}</b>
            <span class="tc-usuario">${esc(d.usuario || 'Jugador')}</span>
            <span class="tc-meta">Plantilla de ${esc(base.name)} · ${vistaEquipo.ovr} de media</span>
          </div>
        </div>
      </div>
      ${this.hint([['↑ ↓ ← →', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      tcUsuario: (v) => { this.state.tcDraft = { ...d, usuario: String(v).slice(0, LIMITES.usuario) }; this.tcMsg = ''; },
      tcNombre: (v) => { this.state.tcDraft = { ...d, nombre: String(v).slice(0, LIMITES.nombre) }; this.tcMsg = ''; },
      tcBase: (dir) => { this.state.tcDraft = { ...d, base: clubes[(idx + Number(dir) + clubes.length) % clubes.length].id }; this.tcMsg = ''; this.tuClub(); },
      tcLogo: (file) => {
        leerLogo(file).then((url) => { this.state.tcDraft = { ...this.state.tcDraft, logo: url }; this.tcMsg = 'Logo cargado.'; this.tuClub(); })
          .catch((e) => { this.tcMsg = e.message; this.tuClub(); });
      },
      tcQuitar: () => { this.state.tcDraft = { ...d, logo: null }; this.tuClub(); },
      tcGuardar: () => {
        const errs = validarTuClub(d);
        if (errs.length) { this.tcMsg = errs[0]; this.tuClub(); return; }
        g.save.setSetting('tuClub', { usuario: d.usuario.trim(), base: d.base, nombre: (d.nombre || '').trim(), logo: d.logo || null });
        g.audio.ui('ok');
        this.tcMsg = 'Club guardado.';
        this.tuClub();
      },
      olVolverA: () => this.online(),
    }, () => this.online(), true);
  }

  /** Pantalla principal de Online: tarjetas. */
  online() {
    this.state.olNombre = this.state.olNombre || 'Jugador';
    this.render('online', `
      <header class="head"><span class="head-step">ONLINE</span><h1>JUGAR EN LÍNEA</h1></header>
      <div class="ol-nombre">
        <label class="car-field"><span>TU NOMBRE EN LA SALA</span>
          <input class="car-input" type="text" maxlength="20" autocomplete="off" value="${esc(this.state.olNombre)}" data-input="olNombreJugador"></label>
      </div>
      <nav class="ot-grid">
        ${this.otCard('olPartidos', 'PARTIDOS ONLINE', 'Crea una sala como anfitrión o únete a la de un amigo para jugar uno contra uno.')}
        ${this.otCard('olTorneo', 'TORNEO ONLINE', 'Crea un torneo con llaves para varios jugadores o únete a uno ya creado.')}
        ${this.otCard('tuClub', 'TU CLUB', 'Tu usuario, un club base con su plantilla y tu nombre y logo propios.')}
        ${this.otCard('', 'LIGA ONLINE', 'Liga con varios jugadores y clasificación compartida.', true)}
      </nav>
      ${this.hint([['↑ ↓ ← →', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      olNombreJugador: (v) => { this.state.olNombre = String(v).slice(0, 20); },
      olPartidos: () => this.onlinePartidos(),
      olTorneo: () => this.onlineTorneo(),
      tuClub: () => this.tuClub(),
    }, () => { this.olCerrar(); this.main(); }, true);
  }

  /** Subvista de partidos online: crear sala o unirse. */
  onlinePartidos() {
    this.render('olPartidos', `
      <header class="head"><span class="head-step">ONLINE · PARTIDOS</span><h1>PARTIDOS ONLINE</h1></header>
      <nav class="ot-grid ot-dos">
        ${this.otCard('olCrearSala', 'CREAR SALA', 'Eres el anfitrión. Recibirás un código y una contraseña para tu amigo.')}
        ${this.otCard('olUnirse', 'UNIRSE', 'Escribe el código y la contraseña que te ha dado el anfitrión.')}
      </nav>
      ${this.hint([['↑ ↓ ← →', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      olCrearSala: () => this.onlineCrearSala(),
      olUnirse: () => { this.state.olForm = { codigo: '', clave: '' }; this.onlineUnirse('partidos'); },
    }, () => this.online(), true);
  }

  /** Crea la sala de partidos (un invitado) y muestra el código y la contraseña. */
  async onlineCrearSala() {
    this.olCerrar();
    this.render('olSala', '<header class="head"><span class="head-step">ONLINE</span><h1>CREANDO SALA…</h1></header>', {}, () => this.onlinePartidos());
    try {
      const sala = new Sala({ nombre: this.state.olNombre, maxInvitados: 1 });
      sala.onEvento = () => this.olRedibujar();
      await sala.abrirComoAnfitrion();
      this.olSala = { rol: 'host', tipo: 'partidos', sala };
      this.olRedibujar();
    } catch (e) {
      this.olError = e.message;
      this.olPintarError('partidos');
    }
  }

  /** Pantalla del anfitrión de una sala de partidos. */
  olPintarSalaHost() {
    const s = this.olSala.sala;
    const inv = s.invitados.map((c) => c.nombre);
    this.render('olSala', `
      <header class="head"><span class="head-step">PARTIDO ONLINE · ANFITRIÓN</span><h1>TU SALA</h1></header>
      <div class="ol-panel">
        <div class="ol-cred"><span>CÓDIGO DE SALA</span><b>${s.codigo}</b></div>
        <div class="ol-cred"><span>CONTRASEÑA</span><b>${s.clave}</b></div>
        <p class="mute">Comparte el código y la contraseña con tu amigo. Tiene que escribirlos en «Unirse».</p>
        <p class="ol-estado">${inv.length ? `Invitado conectado: ${esc(inv[0])}` : 'Esperando a un invitado…'}</p>
        <p class="mute sm">El partido se juega en tiempo real: tú simulas y el invitado juega con sus controles desde su navegador.</p>
        ${inv.length ? '<div class="report-btns"><button class="btn go" data-nav data-act="olEmpezar" data-default>EMPEZAR PARTIDO ▶</button></div>' : ''}
        <div class="report-btns"><button class="btn" data-nav data-act="olCerrarSala">CERRAR SALA</button></div>
      </div>`, { olCerrarSala: () => this.olSalirDeSala('partidos'), olEmpezar: () => this.olEmpezarPartido() }, () => this.olSalirDeSala('partidos'), true);
  }

  /** Anfitrión: prepara la partida y se la envía al invitado; ambos empiezan a la vez. */
  olEmpezarPartido() {
    if (!this.olSala || this.olSala.rol !== 'host' || !this.olSala.sala.invitados.length) return;
    const cfg = this.game.configurarPartidaOnline();
    this.olSala.sala.enviar({ t: 'inicio', cfg });
    this.game.startNetMatch('anfitrion', cfg, this.olSala.sala);
  }

  /** Invitado: al recibir el inicio del anfitrión empieza la partida (réplica). */
  olMensajeInvitado(msg, tipo) {
    if (!msg || msg.t !== 'inicio' || tipo !== 'partidos' || !this.olSala || this.olSala.rol !== 'guest') return;
    this.game.startNetMatch('invitado', msg.cfg, this.olSala.sala);
  }

  /** Subvista para unirse con código y contraseña (partidos o torneo). */
  onlineUnirse(tipo) {
    const f = this.state.olForm || { codigo: '', clave: '' };
    const volver = () => (tipo === 'torneo' ? this.onlineTorneo() : this.onlinePartidos());
    this.render('olUnirse', `
      <header class="head"><span class="head-step">ONLINE · ${tipo === 'torneo' ? 'TORNEO' : 'PARTIDOS'}</span><h1>UNIRSE</h1></header>
      <div class="ol-panel">
        <label class="car-field"><span>CÓDIGO DE SALA</span>
          <input class="car-input" type="text" maxlength="8" autocomplete="off" value="${esc(f.codigo)}" placeholder="Ej: WZ9HTA" data-input="olCodigo"></label>
        <label class="car-field"><span>CONTRASEÑA</span>
          <input class="car-input" type="text" maxlength="8" autocomplete="off" value="${esc(f.clave)}" placeholder="Ej: K7MQ" data-input="olClave"></label>
        ${this.olMsg ? `<p class="car-msg">${esc(this.olMsg)}</p>` : ''}
        <div class="report-btns">
          <button class="btn go" data-nav data-act="olConectar" data-arg="${tipo}" data-default>CONECTAR</button>
          <button class="btn" data-nav data-act="olVolverSub" data-arg="${tipo}">VOLVER</button>
        </div>
      </div>`, {
      olCodigo: (v) => { this.state.olForm = { ...f, codigo: String(v).toUpperCase().slice(0, 8) }; },
      olClave: (v) => { this.state.olForm = { ...(this.state.olForm || f), clave: String(v).toUpperCase().slice(0, 8) }; },
      olConectar: (t) => this.olConectar(t),
      olVolverSub: () => volver(),
    }, volver, true);
  }

  async olConectar(tipo) {
    const f = this.state.olForm || {};
    this.olMsg = '';
    if (!f.codigo || !f.clave) { this.olMsg = 'Escribe el código y la contraseña.'; this.onlineUnirse(tipo); return; }
    this.olCerrar();
    const sala = new Sala({ nombre: this.state.olNombre });
    sala.onMensaje = (msg) => this.olRecibir(msg);
    sala.onEvento = (ev) => { if (ev.tipo === 'desconectado') { this.olMsg = 'Se ha cerrado la conexión con el anfitrión.'; this.olCerrar(); this.onlineUnirse(tipo); } };
    this.render('olSala', '<header class="head"><span class="head-step">ONLINE</span><h1>CONECTANDO…</h1></header>', {}, () => this.onlineUnirse(tipo));
    try {
      const bienvenida = await sala.conectarComoInvitado(f.codigo, f.clave, this.state.olNombre);
      sala.onMensaje = (msg) => this.olMensajeInvitado(msg, tipo);
      this.olSala = { rol: 'guest', tipo, sala, anfitrion: bienvenida.nombre, codigo: f.codigo };
      this.olMsg = '';
      this.olRedibujar();
    } catch (e) {
      this.olMsg = e.message;
      this.onlineUnirse(tipo);
    }
  }

  /** Pantalla del invitado mientras espera al anfitrión. */
  olPintarInvitado() {
    const sala = this.olSala;
    this.render('olSala', `
      <header class="head"><span class="head-step">${sala.tipo === 'torneo' ? 'TORNEO ONLINE' : 'PARTIDO ONLINE'} · INVITADO</span><h1>CONECTADO</h1></header>
      <div class="ol-panel">
        <p class="ol-estado">Conectado a la sala de <b>${esc(sala.anfitrion)}</b>.</p>
        <p class="mute">Esperando a que el anfitrión prepare el ${sala.tipo === 'torneo' ? 'torneo' : 'partido'}.</p>
        <p class="mute sm">La conexión es directa entre los dos navegadores; el servidor solo ayuda a encontrarse.</p>
        <div class="report-btns"><button class="btn" data-nav data-act="olCerrarSala" data-default>SALIR DE LA SALA</button></div>
      </div>`, { olCerrarSala: () => this.olSalirDeSala(sala.tipo) }, () => this.olSalirDeSala(sala.tipo), true);
  }

  /** Subvista de torneo online: crear o unirse. */
  onlineTorneo() {
    this.render('olTorneo', `
      <header class="head"><span class="head-step">ONLINE · TORNEO</span><h1>TORNEO ONLINE</h1></header>
      <nav class="ot-grid ot-dos">
        ${this.otCard('olCrearTorneo', 'CREAR TORNEO', 'Elige el nombre y los participantes. Se genera el código para que se unan.')}
        ${this.otCard('olUnirseTorneo', 'UNIRSE', 'Escribe el código y la contraseña del torneo para sumarte a las llaves.')}
      </nav>
      ${this.hint([['↑ ↓ ← →', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      olCrearTorneo: () => { this.state.olTorneoForm = this.state.olTorneoForm || { nombre: 'Copa online', tam: 8 }; this.onlineCrearTorneo(); },
      olUnirseTorneo: () => { this.state.olForm = { codigo: '', clave: '' }; this.onlineUnirse('torneo'); },
    }, () => this.online(), true);
  }

  /** Formulario de creación de torneo: nombre, participantes y código generado al crear. */
  onlineCrearTorneo() {
    const f = this.state.olTorneoForm || { nombre: 'Copa online', tam: 8 };
    this.render('olCrearTorneo', `
      <header class="head"><span class="head-step">ONLINE · TORNEO</span><h1>CREAR TORNEO</h1></header>
      <div class="ol-panel">
        <label class="car-field"><span>NOMBRE DEL TORNEO</span>
          <input class="car-input" type="text" maxlength="32" autocomplete="off" value="${esc(f.nombre)}" data-input="olNombreTorneo"></label>
        <div class="row" data-nav data-adj="olTam"><span class="row-l">PARTICIPANTES</span><span class="row-v">
          <button class="arrow sm" data-act="olTam" data-arg="-1">◀</button><b>${f.tam}</b><button class="arrow sm" data-act="olTam" data-arg="1">▶</button></span></div>
        <p class="mute sm">Tú también participas. Los demás jugadores se unen con el código y la contraseña.</p>
        ${this.olMsg ? `<p class="car-msg">${esc(this.olMsg)}</p>` : ''}
        <div class="report-btns">
          <button class="btn go" data-nav data-act="olCrearTorneoOk" data-default>CREAR TORNEO</button>
          <button class="btn" data-nav data-act="olVolverSub" data-arg="torneo">VOLVER</button>
        </div>
      </div>`, {
      olNombreTorneo: (v) => { this.state.olTorneoForm = { ...f, nombre: String(v).slice(0, 32) }; },
      olTam: (dir) => {
        const i = TAMANOS_TORNEO.indexOf(f.tam);
        this.state.olTorneoForm = { ...f, tam: TAMANOS_TORNEO[(i + Number(dir) + TAMANOS_TORNEO.length) % TAMANOS_TORNEO.length] };
        this.onlineCrearTorneo();
      },
      olCrearTorneoOk: () => this.olAbrirTorneo(),
      olVolverSub: () => this.onlineTorneo(),
    }, () => this.onlineTorneo(), true);
  }

  /** El anfitrión abre la sala del torneo: el número de invitados es tam - 1 (él juega). */
  async olAbrirTorneo() {
    const f = this.state.olTorneoForm || { nombre: 'Copa online', tam: 8 };
    this.olCerrar();
    this.render('olSala', '<header class="head"><span class="head-step">ONLINE</span><h1>CREANDO TORNEO…</h1></header>', {}, () => this.onlineCrearTorneo());
    try {
      const sala = new Sala({ nombre: this.state.olNombre, maxInvitados: f.tam - 1 });
      sala.onEvento = (ev) => {
        if (ev.tipo === 'entra' || ev.tipo === 'sale') this.olDifundirParticipantes();
        this.olRedibujar();
      };
      await sala.abrirComoAnfitrion();
      this.olSala = { rol: 'host', tipo: 'torneo', sala, nombreTorneo: f.nombre, tam: f.tam, llave: null, res: {} };
      this.olRedibujar();
    } catch (e) {
      this.olMsg = e.message;
      this.onlineCrearTorneo();
    }
  }

  /** Lista de participantes (anfitrión + invitados) enviada a todos. */
  olParticipantes() {
    const s = this.olSala;
    const nombres = [this.state.olNombre, ...s.sala.invitados.map((c) => c.nombre)];
    return nombres.map((nombre, i) => ({ id: `p${i + 1}`, nombre }));
  }

  olDifundirParticipantes() {
    const s = this.olSala;
    if (!s || s.rol !== 'host') return;
    s.sala.enviar({ t: 'participantes', lista: this.olParticipantes(), tam: s.tam });
  }

  /** Pantalla del anfitrión del torneo: participantes, llaves y resultados. */
  olPintarTorneoHost() {
    const s = this.olSala;
    const lista = this.olParticipantes();
    const llena = lista.length === s.tam;
    const cerrar = () => this.olSalirDeSala('torneo');
    if (!s.llave) {
      this.render('olSala', `
        <header class="head"><span class="head-step">TORNEO · ANFITRIÓN</span><h1>${esc(s.nombreTorneo)}</h1></header>
        <div class="ol-panel">
          <div class="ol-cred"><span>CÓDIGO DEL TORNEO</span><b>${s.sala.codigo}</b></div>
          <div class="ol-cred"><span>CONTRASEÑA</span><b>${s.sala.clave}</b></div>
          <p class="ol-estado">Participantes: ${lista.length} / ${s.tam}</p>
          <ul class="ol-lista">${lista.map((p) => `<li>${esc(p.nombre)}</li>`).join('')}</ul>
          ${this.olMsg ? `<p class="car-msg">${esc(this.olMsg)}</p>` : ''}
          <div class="report-btns">
            <button class="btn go" data-nav data-act="olGenerar" data-default ${llena ? '' : 'disabled'}>GENERAR LLAVES</button>
            <button class="btn" data-nav data-act="olCerrarSala">CERRAR TORNEO</button>
          </div>
        </div>`, { olGenerar: () => this.olGenerarLlaves(), olCerrarSala: cerrar }, cerrar, true);
      return;
    }
    const pend = pendientes(s.llave);
    const fila = (p) => {
      const r = s.res[p.id] || { ga: 0, gb: 0 };
      return `<div class="ol-partido">
        <span class="ol-eq">${esc(p.a.nombre)}</span>
        <span class="ol-gol"><button class="arrow sm" data-nav data-act="olGol" data-arg="${p.id}:a:-1">◀</button><b>${r.ga}</b><button class="arrow sm" data-nav data-act="olGol" data-arg="${p.id}:a:1">▶</button></span>
        <span class="ol-x">-</span>
        <span class="ol-gol"><button class="arrow sm" data-nav data-act="olGol" data-arg="${p.id}:b:-1">◀</button><b>${r.gb}</b><button class="arrow sm" data-nav data-act="olGol" data-arg="${p.id}:b:1">▶</button></span>
        <span class="ol-eq">${esc(p.b.nombre)}</span>
        <button class="btn sm" data-nav data-act="olResultado" data-arg="${p.id}">GUARDAR</button>
      </div>`;
    };
    const rondas = s.llave.rondas.map((ronda) => `
      <h3 class="hub-h3">${nombreRonda(ronda.length)}</h3>
      ${ronda.map((p) => (p.ganador
        ? `<div class="ol-partido hecho"><span class="ol-eq">${esc(p.a.nombre)}</span><b>${p.ga} - ${p.gb}</b><span class="ol-eq">${esc(p.b.nombre)}</span></div>`
        : (p.a && p.b ? fila(p) : ''))).join('')}`).join('');
    this.render('olSala', `
      <header class="head"><span class="head-step">TORNEO · ANFITRIÓN</span><h1>${esc(s.nombreTorneo)}</h1></header>
      <div class="ol-panel">
        ${s.llave.campeon ? `<p class="ol-estado">Campeón: <b>${esc(s.llave.campeon.nombre)}</b></p>` : `<p class="mute">Pendientes: ${pend.length}. Cuando guardes un resultado, las llaves se actualizan en todos los navegadores.</p>`}
        ${rondas}
        ${this.olMsg ? `<p class="car-msg">${esc(this.olMsg)}</p>` : ''}
        <div class="report-btns"><button class="btn" data-nav data-act="olCerrarSala" data-default>CERRAR TORNEO</button></div>
      </div>`, {
      olGol: (arg) => this.olAjustarGol(arg),
      olResultado: (id) => this.olGuardarResultado(id),
      olCerrarSala: cerrar,
    }, cerrar, true);
  }

  /** Crea las llaves con los participantes en orden aleatorio y las envía a todos. */
  olGenerarLlaves() {
    const s = this.olSala;
    const lista = this.olParticipantes();
    const barajados = [...lista].sort(() => Math.random() - 0.5);
    try {
      s.llave = crearLlave(s.nombreTorneo, barajados, s.tam);
      this.olMsg = '';
      s.sala.enviar({ t: 'llave', llave: s.llave });
    } catch (e) { this.olMsg = e.message; }
    this.olRedibujar();
  }

  olAjustarGol(arg) {
    const [id, lado, dir] = String(arg).split(':');
    const s = this.olSala;
    const r = s.res[id] || { ga: 0, gb: 0 };
    const k = lado === 'a' ? 'ga' : 'gb';
    s.res[id] = { ...r, [k]: clamp(r[k] + Number(dir), 0, 30) };
    this.olRedibujar();
  }

  olGuardarResultado(id) {
    const s = this.olSala;
    const r = s.res[id] || { ga: 0, gb: 0 };
    try {
      s.llave = registrarResultado(s.llave, id, r.ga, r.gb);
      delete s.res[id];
      this.olMsg = '';
      s.sala.enviar({ t: 'llave', llave: s.llave });
    } catch (e) { this.olMsg = e.message; }
    this.olRedibujar();
  }

  /** Pantalla del invitado del torneo: ve las llaves que actualiza el anfitrión. */
  olPintarTorneoInvitado() {
    const s = this.olSala;
    const ll = s.llave;
    const cerrar = () => this.olSalirDeSala('torneo');
    const cuerpo = !ll ? '<p class="mute">Esperando a que el anfitrión genere las llaves.</p>'
      : ll.rondas.map((ronda) => `<h3 class="hub-h3">${nombreRonda(ronda.length)}</h3>${ronda.map((p) => (p.ganador
        ? `<div class="ol-partido hecho"><span class="ol-eq">${esc(p.a.nombre)}</span><b>${p.ga} - ${p.gb}</b><span class="ol-eq">${esc(p.b.nombre)}</span></div>`
        : `<div class="ol-partido"><span class="ol-eq">${p.a ? esc(p.a.nombre) : '…'}</span><span class="ol-x">vs</span><span class="ol-eq">${p.b ? esc(p.b.nombre) : '…'}</span></div>`)).join('')}`).join('');
    this.render('olSala', `
      <header class="head"><span class="head-step">TORNEO · INVITADO</span><h1>${esc(ll ? ll.nombre : s.anfitrion)}</h1></header>
      <div class="ol-panel">
        <p class="ol-estado">Sala de <b>${esc(s.anfitrion)}</b>${ll && ll.campeon ? ` · Campeón: <b>${esc(ll.campeon.nombre)}</b>` : ''}</p>
        ${cuerpo}
        <div class="report-btns"><button class="btn" data-nav data-act="olCerrarSala" data-default>SALIR DEL TORNEO</button></div>
      </div>`, { olCerrarSala: cerrar }, cerrar, true);
  }

  /** Mensajes que llegan a un invitado (llaves y participantes). */
  olRecibir(msg) {
    const s = this.olSala;
    if (!s || s.rol !== 'guest') return;
    if (msg.t === 'llave') s.llave = msg.llave;
    if (msg.t === 'participantes') s.participantes = msg.lista;
    this.olRedibujar();
  }

  /** Dibuja la pantalla que corresponde al estado actual de la sala. */
  olRedibujar() {
    const s = this.olSala;
    if (!s) return;
    if (s.rol === 'host' && s.tipo === 'partidos') this.olPintarSalaHost();
    else if (s.rol === 'guest' && s.tipo === 'partidos') this.olPintarInvitado();
    else if (s.rol === 'host') this.olPintarTorneoHost();
    else this.olPintarTorneoInvitado();
  }

  olPintarError(tipo) {
    this.render('olSala', `
      <header class="head"><span class="head-step">ONLINE</span><h1>NO SE HA PODIDO CREAR</h1></header>
      <div class="ol-panel"><p class="car-msg">${esc(this.olError || 'Error de red')}</p>
      <div class="report-btns"><button class="btn" data-nav data-act="olVolver" data-default>VOLVER</button></div></div>`,
      { olVolver: () => (tipo === 'torneo' ? this.onlineTorneo() : this.onlinePartidos()) },
      () => (tipo === 'torneo' ? this.onlineTorneo() : this.onlinePartidos()), true);
  }

  /** Sale de la sala (anfitrión o invitado) y vuelve a la subvista de su tipo. */
  olSalirDeSala(tipo) {
    this.olCerrar();
    this.olMsg = '';
    if (tipo === 'torneo') this.onlineTorneo();
    else this.onlinePartidos();
  }

  olCerrar() {
    if (this.olSala && this.olSala.sala) this.olSala.sala.cerrar();
    this.olSala = null;
  }

  credits() {
    this.render('credits', `
      <header class="head"><h1>CRÉDITOS</h1></header>
      <div class="credits">
        <p><span>Autor</span><b>MrPolfer</b></p>
        <p><span>Programado por</span><b>Claude Opus 5.5 Extra</b></p>
        <p><span>Modificado por</span><b>NismanCFK "El Momo" &amp; Claude Haiku 5.5</b></p>
        <p class="credits-aviso"><span>Aviso</span>Fan game sin fines de lucro. Sin microtransacciones ni pay to win: todo el contenido se desbloquea jugando o creando.</p>
        <div class="credits-links">
          <p><span>Canal de MrPolfer</span><a href="https://www.youtube.com/@polfernandezpapi" target="_blank" rel="noopener">youtube.com/@polfernandezpapi</a></p>
          <p><span>Servidor del mod</span><a href="https://discord.gg/NKKghtPY94" target="_blank" rel="noopener">discord.gg/NKKghtPY94</a></p>
        </div>
      </div>
      <div class="report-btns car-foot"><button class="btn go" data-nav data-act="back" data-default>VOLVER</button></div>
      ${this.hint([['ENTER', 'Volver'], ['ESC', 'Volver']])}
    `, { back: () => this.main() }, () => this.main(), true);
  }

  // ------------------------------------------------------------------ Portada
  splash() {
    this.render('splash', `
      <div class="logo">
        <div class="logo-top">FÚTBOL 3D</div>
        <h1>GOLPE<br><em>FRANCO</em></h1>
        <div class="logo-sub">PRO SOCCER</div>
        <div class="logo-line"></div>
      </div>
      <button class="press" data-act="any">${this.game.plataforma === 'movil' ? 'TOCA PARA EMPEZAR' : 'PULSA CUALQUIER TECLA PARA EMPEZAR'}</button>
      <p class="splash-note">Se juega con teclado o con mando (Xbox o PlayStation). Recomendado: pantalla completa y sonido activado.</p>
    `, { any: () => this.game.enterMenu() });
  }

  // ----------------------------------------------------------- Menú principal
  main() {
    if (!this.game.save.settings.setupDone) {
      if (this.game.plataforma === 'movil') { this.state.setupDir = 'wasd'; this.setupInicial(2); return; }
      this.setupInicial(1); return;
    }
    const p = this.game.save.data.progress;
    const avisoGuardado = guardadoCorrecto() ? '' : '<p class="car-msg">No se han podido guardar los últimos cambios: el navegador no tiene más espacio. Exporta una copia y sustituye los logos por imágenes más pequeñas.</p>';
    const items = [
      ['play', 'JUGAR PARTIDO', 'Elige equipos, formación y dificultad y salta al césped.'],
      ['soon', 'TORNEO', 'Próximamente: eliminatorias con los 12 clubes.', 'torneo'],
      ['entreno', 'ENTRENAMIENTO', 'Penaltis, tiros de falta y pases largos contra un portero ajustable.'],
      ['carrera', 'MODO CARRERA', 'Temporadas con tu club: liga, clasificación y ofertas de otros equipos.'],
      ['personalizar', 'PERSONALIZAR', 'Crea y edita jugadores, clubes y ligas con tu propio estilo.'],
      ['online', 'ONLINE', 'Partidos y torneos con otros jugadores por internet.'],
      ['settings', 'AJUSTES', 'Sonido, gráficos, cámara y controles.'],
      ['credits', 'CRÉDITOS', 'Autor, programación, modificación y canales del proyecto.'],
    ];
    this.render('main', `
      <header class="brand"><span class="brand-s">FÚTBOL 3D</span><b>GOLPE <em>FRANCO</em></b><small class="brand-sub">PRO SOCCER</small></header>
      ${avisoGuardado}
      <nav class="menu">
        ${items.map(([act, label, desc, arg], i) => `
          <button class="mi${act === 'soon' ? ' mi-soon' : ''}" data-nav data-act="${act}" ${arg ? `data-arg="${arg}"` : ''} ${i === 0 ? 'data-default' : ''}>
            <span class="mi-n">${String(i + 1).padStart(2, '0')}</span>
            <span class="mi-t">${label}${act === 'soon' ? '<small>PRÓXIMAMENTE</small>' : ''}</span>
            <span class="mi-d">${desc}</span>
          </button>`).join('')}
      </nav>
      <aside class="record">
        <h3>TU HISTORIAL</h3>
        <div class="record-row"><b>${p.played}</b><span>JUGADOS</span><b>${p.won}</b><span>GANADOS</span><b>${p.drawn}</b><span>EMPATES</span><b>${p.lost}</b><span>PERDIDOS</span></div>
        <div class="record-sub">Goles ${p.gf} a favor · ${p.ga} en contra</div>
      </aside>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Aceptar']])}
    `, {
      play: () => { this._mainIdx = 0; this.game.audio.ui('ok'); this.teams(); },
      settings: () => { this._mainIdx = this.focusIdx; this.game.audio.ui('ok'); this.settings(() => this.main()); },
      credits: () => { this._mainIdx = this.focusIdx; this.game.audio.ui('ok'); this.credits(); },
      soon: (arg) => { this._mainIdx = this.focusIdx; this.game.audio.ui('ok'); this.soon(arg); },
      carrera: () => { this._mainIdx = this.focusIdx; this.game.audio.ui('ok'); this.careerMenu(); },
      entreno: () => { this._mainIdx = this.focusIdx; this.game.audio.ui('ok'); this.trainingMenu(); },
      personalizar: () => { this._mainIdx = this.focusIdx; this.game.audio.ui('ok'); this.personalizar(); },
      online: () => { this._mainIdx = this.focusIdx; this.game.audio.ui('ok'); this.online(); },
    });
    if (this._mainIdx) this.focus(this._mainIdx, true);
    this.game.audio.music('menu');
    this.actualizarBotonBD();
  }

  // ----------------------------------------------- Base de datos (oculta)
  // Se abre desde el menú principal con A+X+F. Tras la contraseña aparece un
  // botón cuadrado arriba a la derecha con las acciones de la base de datos.

  abrirPuerta() {
    if (this.puerta) return;
    this.bloqueo = true;
    const el = document.createElement('div');
    el.className = 'db-gate';
    el.innerHTML = `<div class="db-box db-box-pass">
        <input type="password" class="db-pass" placeholder="ingresar contraseña" autocomplete="off" aria-label="ingresar contraseña">
        <p class="db-msg" aria-live="polite"></p>
      </div>`;
    document.body.appendChild(el);
    this.puerta = el;
    const input = el.querySelector('input');
    input.focus();
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.code === 'Enter') {
        if (input.value === CLAVE_BD) {
          this.cerrarPuerta();
          this.bdDesbloqueada = true;
          this.actualizarBotonBD();
        } else {
          el.querySelector('.db-msg').textContent = 'Contraseña incorrecta';
          input.value = '';
        }
      } else if (e.code === 'Escape') {
        this.cerrarPuerta();
      }
    });
    el.addEventListener('click', (e) => { if (e.target === el) this.cerrarPuerta(); });
  }

  cerrarPuerta() {
    if (this.puerta) this.puerta.remove();
    this.puerta = null;
    this.bloqueo = false;
    this.teclasPulsadas.clear();
  }

  actualizarBotonBD() {
    if (this.screen !== 'main' || !this.bdDesbloqueada) { this.quitarBotonBD(); return; }
    if (this.botonBD) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'db-btn';
    b.title = 'Base de datos';
    b.setAttribute('aria-label', 'Base de datos');
    b.textContent = 'BD';
    b.addEventListener('click', () => this.menuBD());
    document.body.appendChild(b);
    this.botonBD = b;
  }

  quitarBotonBD() {
    if (this.botonBD) this.botonBD.remove();
    this.botonBD = null;
  }

  menuBD() {
    if (this.dbMenu) return;
    this.bloqueo = true;
    const el = document.createElement('div');
    el.className = 'db-gate';
    document.body.appendChild(el);
    this.dbMenu = el;
    this.dbEscape = (e) => { if (e.code === 'Escape') this.cerrarBD(); };
    window.addEventListener('keydown', this.dbEscape);
    el.addEventListener('click', (e) => {
      if (e.target === el) { this.cerrarBD(); return; }
      const b = e.target.closest('[data-db]');
      if (!b) return;
      const a = b.dataset.db;
      if (a === 'restaurar' || a === 'nueva') this.pintarBD('confirmar-' + a);
      else if (a === 'menu') this.pintarBD('menu');
      else if (a === 'historial') this.pintarBD('confirmar-historial');
      else if (a === 'confirmar-historial') {
        this.game.save.clearHistory();
        this.pintarBD('menu', 'Historial de partidos borrado.');
      }
      else if (a === 'cerrar') this.cerrarBD();
      else if (a === 'exportar') descargarCopia();
      else if (a === 'importar') { const f = el.querySelector('[data-db-archivo]'); if (f) f.click(); }
      else if (a === 'confirmar-restaurar') {
        const txt = el.querySelector('[data-db-texto]');
        if (!txt || txt.value.trim().toUpperCase() !== 'BORRAR') {
          this.pintarBD('confirmar-restaurar', 'Escribe BORRAR en el recuadro para confirmar.');
          return;
        }
        restaurarBaseDeDatos();
        this.cerrarBD();
        this.main();
      } else if (a === 'confirmar-nueva') {
        if (crearNuevaBaseDeDatos()) { this.cerrarBD(); this.main(); }
        else this.pintarBD('confirmar-nueva', 'No se ha podido guardar: el almacenamiento del navegador está lleno.');
      }
    });
    this.pintarBD('menu');
  }

  pintarBD(paso, msg = '') {
    const el = this.dbMenu;
    if (!el) return;
    const aviso = msg ? `<p class="db-msg">${msg}</p>` : '';
    let html;
    if (paso === 'menu') {
      html = `<div class="db-box">
          <div class="modal-tag">BASE DE DATOS</div>
          <h2>GESTIONAR DATOS</h2>
          <p class="mute">Estas acciones afectan a los clubes, jugadores y ligas de todo el juego.</p>
          <button class="btn" data-db="exportar">EXPORTAR COPIA</button>
          <p class="db-desc">Descarga un archivo con todo lo que has creado y ajustado: clubes, jugadores, ligas, carreras y ajustes.</p>
          <button class="btn" data-db="importar">IMPORTAR COPIA</button>
          <p class="db-desc">Restaura una copia guardada antes. Sustituye los datos actuales.</p>
          <button class="btn" data-db="historial">BORRAR HISTORIAL DE PARTIDOS</button>
          <p class="db-desc">Borra tus partidos jugados, victorias, empates, derrotas y goles. No afecta a clubes, jugadores, ligas ni carreras.</p>
          <button class="btn" data-db="restaurar" data-default>RESTAURAR BASE DE DATOS</button>
          <p class="db-desc">Elimina todos los clubes personalizados y deja a los originales.</p>
          <button class="btn go" data-db="nueva">CREAR NUEVA BASE DE DATOS</button>
          <p class="db-desc">Convierte todos los jugadores, clubes y ligas existentes en originales, para que se incluyan al compartir el juego.</p>
          <button class="btn" data-db="cerrar">CERRAR</button>
          ${aviso}
          <input type="file" accept="application/json,.json" data-db-archivo hidden>
        </div>`;
    } else {
      const restaurar = paso === 'confirmar-restaurar';
      html = `<div class="db-box">
          <div class="modal-tag">CONFIRMAR</div>
          <h2>${paso === 'confirmar-historial' ? 'BORRAR HISTORIAL' : restaurar ? 'RESTAURAR' : 'NUEVA BASE'}</h2>
          <p>${paso === 'confirmar-historial'
            ? 'Se borrarán todos tus partidos jugados y tus estadísticas (victorias, empates, derrotas y goles). Esta acción no se puede deshacer.'
            : restaurar
            ? 'Se borrarán todos los clubes, jugadores, ligas y torneos personalizados, y el juego volverá a sus datos de fábrica. Esta acción no se puede deshacer.'
            : 'Todo lo creado pasará a ser original. Esta acción no se puede deshacer.'}</p>
          ${restaurar ? '<label class="car-field"><span>ESCRIBE BORRAR PARA CONFIRMAR</span><input class="car-input" type="text" autocomplete="off" data-db-texto></label>' : ''}
          ${aviso}
          <button class="btn" data-db="exportar">EXPORTAR COPIA ANTES</button>
          <button class="btn go" data-db="${paso}" data-default>SÍ, CONTINUAR</button>
          <button class="btn" data-db="menu">CANCELAR</button>
        </div>`;
    }
    el.innerHTML = html;
    const archivo = el.querySelector('[data-db-archivo]');
    if (archivo) archivo.addEventListener('change', () => this.importarCopiaDesdeArchivo(archivo.files[0]));
    const d = el.querySelector('[data-db-texto]') || el.querySelector('[data-default]');
    if (d) d.focus();
  }

  importarCopiaDesdeArchivo(file) {
    if (!file) return;
    file.text().then((texto) => {
      const r = restaurarCopia(texto);
      if (!r.ok) { this.pintarBD('menu', r.error); return; }
      this.pintarBD('menu', `Copia restaurada (${r.n} elementos). Reiniciando…`);
      setTimeout(() => location.reload(), 800);
    });
  }

  cerrarBD() {
    if (this.dbMenu) this.dbMenu.remove();
    this.dbMenu = null;
    if (this.dbEscape) window.removeEventListener('keydown', this.dbEscape);
    this.dbEscape = null;
    this.bloqueo = false;
    this.teclasPulsadas.clear();
  }

  soon(which) {
    const info = {
      torneo: ['TORNEO', 'Una copa por eliminatorias con los 12 clubes, sorteo de cruces, prórroga y tanda de penaltis.'],
      personalizar: ['PERSONALIZAR', 'Editor de equipaciones, escudos, nombres de jugadores y estadio.'],
    }[which] || ['PRÓXIMAMENTE', ''];
    this.render('soon', `
      <div class="modal">
        <div class="modal-tag">PRÓXIMAMENTE</div>
        <h2>${info[0]}</h2>
        <p>${info[1]}</p>
        <p class="mute">Esta primera versión se centra en el partido: elige JUGAR PARTIDO para saltar al campo.</p>
        <button class="btn" data-nav data-act="back" data-default>VOLVER</button>
      </div>
    `, { back: () => this.main() }, () => this.main());
  }

  // ------------------------------------------------------ Selección de equipos
  teams() {
    const g = this.game, last = g.save.data.last;
    const st = this.state.teams || (this.state.teams = {
      home: Math.max(0, TEAMS.findIndex((t) => t.id === last.home)),
      away: Math.max(0, TEAMS.findIndex((t) => t.id === last.away)),
      side: last.side === 1 ? 1 : last.side === null ? null : 0,
      homeKit: 'home', awayKit: 'auto',
    });
    if (st.home === st.away) st.away = (st.away + 1) % TEAMS.length;
    // Liga de cada lado: se elige primero la liga y después el equipo (solo se recorren sus clubes)
    const indicesDe = (lid) => {
      const l = ligas().find((x) => x.id === lid) || ligas()[0];
      return l.clubes.map((id) => TEAMS.findIndex((t) => t.id === id)).filter((i) => i >= 0);
    };
    const ligaDe = (idx) => ((ligas().find((l) => l.clubes.includes(TEAMS[idx].id)) || ligas()[0]).id);
    if (!st.homeLiga) st.homeLiga = ligaDe(st.home);
    if (!st.awayLiga) st.awayLiga = ligaDe(st.away);
    const panel = (which, idx) => {
      const t = TEAMS[idx];
      const liga = ligas().find((l) => l.id === st[which + 'Liga']) || ligas()[0];
      const mine = st.side === (which === 'home' ? 0 : 1);
      const kitSel = which === 'home' ? st.homeKit : st.awayKit;
      const kits = which === 'home' ? [['home', '1ª'], ['away', '2ª']] : [['auto', 'AUTO'], ['home', '1ª'], ['away', '2ª']];
      return `
      <section class="team t-${which}${mine ? ' mine' : ''}" style="--tc:${t.home.shirt};--ta:${t.home.accent}">
        <div class="team-tag">${which === 'home' ? 'LOCAL' : 'VISITANTE'}${mine ? '<b>TÚ</b>' : st.side === null ? '' : '<i>IA</i>'}</div>
        <div class="row liga-pick" data-nav data-adj="${which}Liga">
          <span class="row-l">LIGA</span>
          <span class="row-v"><button class="arrow sm" data-act="${which}Liga" data-arg="-1" aria-label="Liga anterior">◀</button><b>${esc(liga.nombre)}</b><button class="arrow sm" data-act="${which}Liga" data-arg="1" aria-label="Liga siguiente">▶</button></span>
        </div>
        <div class="team-pick" data-nav data-adj="${which}" ${which === 'home' ? 'data-default' : ''}>
          <button class="arrow" data-act="${which}" data-arg="-1" aria-label="Equipo anterior">◀</button>
          <div class="team-id">
            <img class="crest" src="${crestURL(t, 200)}" alt="">
            <h2>${esc(t.name)}</h2>
            <p>${esc(t.tagline)}</p>
          </div>
          <button class="arrow" data-act="${which}" data-arg="1" aria-label="Equipo siguiente">▶</button>
        </div>
        <div class="team-ovr"><b>${t.ovr}</b><span>MEDIA</span></div>
        <div class="stats">${bar('ATAQUE', t.att)}${bar('MEDIO', t.mid)}${bar('DEFENSA', t.def)}</div>
        <div class="row" data-nav data-adj="${which}Kit">
          <span class="row-l">EQUIPACIÓN</span>
          <span class="row-v">${kits
            .map(([id, lb]) => `<button class="chip${kitSel === id ? ' on' : ''}" data-act="${which}KitSet" data-arg="${id}">${lb}${id !== 'auto' ? kitSwatch(t[id]) : ''}</button>`).join('')}</span>
        </div>
        <div class="style">
          <span>${t.style.formation}</span>
          <span>${(MENTALITIES.find((m) => m.id === t.style.mentality) || MENTALITIES[2]).name}</span>
        </div>
      </section>`;
    };
    const sideName = st.side === 0 ? 'LOCAL' : st.side === 1 ? 'VISITANTE' : 'ESPECTADOR (IA vs IA)';
    const redraw = () => this.teams();
    // Equipo: recorre solo los clubes de la liga elegida (sin repetir el del otro lado)
    const cyc = (key, d) => {
      const other = key === 'home' ? 'away' : 'home';
      const lst = indicesDe(st[key + 'Liga']);
      if (!lst.length) return;
      let i = lst.indexOf(st[key]);
      if (i < 0) i = 0;
      let n = 0;
      do { i = (i + Number(d) + lst.length) % lst.length; n++; } while (lst[i] === st[other] && n < lst.length);
      st[key] = lst[i];
      redraw();
    };
    // Liga: cambia la liga y se queda con su primer club
    const cycLiga = (key, d) => {
      const L = ligas();
      const i = (L.findIndex((l) => l.id === st[key + 'Liga']) + Number(d) + L.length) % L.length;
      st[key + 'Liga'] = L[i].id;
      const lst = indicesDe(L[i].id);
      if (lst.length) st[key] = lst[0];
      redraw();
    };
    this.render('teams', `
      <header class="head"><span class="head-step">1 / 3</span><h1>ELIGE LIGA Y EQUIPOS</h1></header>
      <div class="vs-wrap">
        ${panel('home', st.home)}
        <div class="vs">VS</div>
        ${panel('away', st.away)}
      </div>
      <div class="foot">
        <div class="row row-wide" data-nav data-adj="side">
          <span class="row-l">JUEGAS CON</span>
          <span class="row-v"><button class="arrow sm" data-act="side" data-arg="-1">◀</button><b>${sideName}</b><button class="arrow sm" data-act="side" data-arg="1">▶</button></span>
        </div>
        <button class="btn go" data-nav data-act="next">CONTINUAR ▶</button>
      </div>
      ${this.hint([['← →', 'Cambiar'], ['↑ ↓', 'Moverse'], ['ENTER', 'Continuar'], ['ESC', 'Volver']])}
    `, {
      home: (d) => cyc('home', d), away: (d) => cyc('away', d),
      homeLiga: (d) => cycLiga('home', d), awayLiga: (d) => cycLiga('away', d),
      homeKit: () => { st.homeKit = st.homeKit === 'home' ? 'away' : 'home'; redraw(); },
      awayKit: (d) => { const o = ['auto', 'home', 'away']; st.awayKit = o[(o.indexOf(st.awayKit) + Number(d) + 3) % 3]; redraw(); },
      homeKitSet: (id) => { st.homeKit = id; redraw(); },
      awayKitSet: (id) => { st.awayKit = id; redraw(); },
      side: (d) => { const o = [0, 1, null]; st.side = o[(o.indexOf(st.side) + Number(d) + 3) % 3]; redraw(); },
      next: () => { this.game.audio.ui('ok'); this.state.tactics = null; this.tactics(); },
      enter: () => { this.game.audio.ui('ok'); this.state.tactics = null; this.tactics(); },
    }, () => { this.main(); }, true);
    this.game.audio.music('select');
  }

  /** Táctica de trabajo para el equipo indicado (guardada o la propia del club). */
  tacticsFor(team) {
    const saved = this.game.save.data.tactics[team.id];
    return saved && FORMATIONS[saved.formation] ? { ...tacticsFromStyle(team.style), ...saved } : tacticsFromStyle(team.style);
  }

  pitchHTML(team, formation) {
    const lineup = pickLineupFor(team.squad, formation, formation === team.style.formation ? team.titulares : undefined);
    const k = team.home;
    return `<div class="pitch"><div class="pitch-in">
      <i class="pl-mid"></i><i class="pl-circle"></i><i class="pl-box a"></i><i class="pl-box b"></i>
      ${lineup.map((e) => {
        const gk = e.slot.role === 'GK';
        const y = gk ? 93 : 82 - e.slot.d * 68;
        const x = 50 + e.slot.w * 40;
        return `<div class="tok${gk ? ' gk' : ''}" style="left:${x}%;top:${y}%;--c:${gk ? '#f2e94e' : k.shirt};--n:${gk ? '#1a1a1a' : k.num}">
          <b>${e.player.number}</b><span>${esc(e.player.short)}</span><em>${POS_LABEL[e.slot.role]} · ${e.player.ovr}</em></div>`;
      }).join('')}
    </div></div>`;
  }

  // ------------------------------------------------------ Formación y táctica
  tactics(inMatch, ret) {
    const g = this.game;
    if (ret) this._tacRet = ret;
    const leave = () => (this._tacRet ? this._tacRet() : this.pause());
    const sel = this.state.teams;
    let team, tac;
    if (inMatch) {
      team = g.match.userTeam.data;
      tac = g.match.userTeam.tactics;
    } else {
      const side = sel.side === null ? 0 : sel.side;
      team = TEAMS[side === 0 ? sel.home : sel.away];
      tac = this.state.tactics || (this.state.tactics = this.tacticsFor(team));
    }
    const redraw = () => this.tactics(inMatch);
    const done = () => {
      g.save.saveTactics(team.id, tac);
      if (inMatch) leave(); else { g.audio.ui('ok'); this.matchSetup(); }
    };
    const setFormation = (f) => {
      if (inMatch) g.match.userTeam.setFormation(f); else tac.formation = f;
      redraw();
    };
    const ment = MENTALITIES.find((m) => m.id === tac.mentality);
    this.render('tactics', `
      <header class="head"><span class="head-step">${inMatch ? 'PAUSA' : '2 / 3'}</span><h1>FORMACIÓN Y TÁCTICA</h1>
        <div class="head-team"><img src="${crestURL(team, 96)}" alt=""><b>${esc(team.name)}</b></div></header>
      <div class="tac">
        <div class="tac-forms">
          <h3>FORMACIÓN</h3>
          ${FORMATION_NAMES.map((f) => `<button class="opt${f === tac.formation ? ' on' : ''}" data-nav data-act="form" data-arg="${f}" ${f === tac.formation ? 'data-default' : ''}>${f}</button>`).join('')}
        </div>
        ${this.pitchHTML(team, tac.formation)}
        <div class="tac-side">
          <h3>MENTALIDAD</h3>
          <div class="row" data-nav data-adj="ment">
            <span class="row-v full"><button class="arrow sm" data-act="ment" data-arg="-1">◀</button><b>${ment.name}</b><button class="arrow sm" data-act="ment" data-arg="1">▶</button></span>
          </div>
          <p class="mute sm">${ment.desc}</p>
          <h3>AJUSTES</h3>
          ${SLIDERS.map((s) => `
            <div class="slider" data-nav data-adj="sl:${s.key}">
              <span class="slider-l">${s.name}</span>
              <span class="slider-t"><i style="width:${Math.round(tac[s.key] * 100)}%"></i></span>
              <span class="slider-e"><em>${s.lo}</em><em>${s.hi}</em></span>
            </div>`).join('')}
          <button class="btn go" data-nav data-act="done">${inMatch ? 'APLICAR Y VOLVER' : 'CONTINUAR ▶'}</button>
        </div>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['← →', 'Ajustar'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      form: (f) => setFormation(f),
      ment: (d) => {
        tac.mentality = clamp(tac.mentality + Number(d), -2, 2);
        Object.assign(tac, presetForMentality(tac.mentality));
        for (const s of SLIDERS) tac[s.key] = clamp(tac[s.key], 0, 1);
        redraw();
      },
      done,
      ...Object.fromEntries(SLIDERS.map((s) => [`sl:${s.key}`, (d) => { tac[s.key] = clamp(Math.round((tac[s.key] + Number(d) * 0.1) * 10) / 10, 0, 1); redraw(); }])),
    }, () => { if (inMatch) leave(); else this.teams(); }, true);
  }

  // -------------------------------------------------------- Ajustes de partido
  matchSetup() {
    const g = this.game, s = g.save.settings;
    const redraw = () => this.matchSetup();
    const set = (k, v) => { g.save.setSetting(k, v); redraw(); };
    const cyc = (list, cur, d) => list[(list.indexOf(cur) + Number(d) + list.length) % list.length];
    const diff = DIFFICULTIES[s.difficulty] || DIFFICULTIES.normal;
    const camIds = Object.keys(CAMERA_STYLES);
    this.render('setup', `
      <header class="head"><span class="head-step">3 / 3</span><h1>DIFICULTAD Y PARTIDO</h1></header>
      <div class="setup">
        <div class="diffs">
          ${DIFFICULTY_ORDER.map((id, i) => {
            const d = DIFFICULTIES[id];
            return `<button class="diff${id === s.difficulty ? ' on' : ''}" data-nav data-act="diff" data-arg="${id}" ${id === s.difficulty ? 'data-default' : ''}>
              <span class="diff-n">${'●'.repeat(i + 1)}${'○'.repeat(3 - i)}</span><b>${d.name}</b><span>${d.desc}</span></button>`;
          }).join('')}
        </div>
        <div class="opts">
          <div class="row" data-nav data-adj="dur"><span class="row-l">DURACIÓN</span><span class="row-v"><button class="arrow sm" data-act="dur" data-arg="-1">◀</button><b>${s.halfMinutes} MIN POR PARTE</b><button class="arrow sm" data-act="dur" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="night"><span class="row-l">HORARIO</span><span class="row-v"><button class="arrow sm" data-act="night" data-arg="-1">◀</button><b>${s.night ? 'NOCHE' : 'DÍA'}</b><button class="arrow sm" data-act="night" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="cam"><span class="row-l">CÁMARA</span><span class="row-v"><button class="arrow sm" data-act="cam" data-arg="-1">◀</button><b>${CAMERA_STYLES[s.camera] ? CAMERA_STYLES[s.camera].name : 'RETRANSMISIÓN'}</b><button class="arrow sm" data-act="cam" data-arg="1">▶</button></span></div>
          <button class="btn go big" data-nav data-act="play">¡AL CAMPO! ▶</button>
        </div>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['← →', 'Cambiar'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      diff: (id) => set('difficulty', id),
      dur: (d) => set('halfMinutes', cyc(DURATIONS, s.halfMinutes, d)),
      night: () => set('night', !s.night),
      cam: (d) => set('camera', cyc(camIds, s.camera, d)),
      play: () => { g.audio.ui('ok'); this.launch(); },
    }, () => this.tactics(), true);
    void diff;
  }

  launch() {
    const g = this.game, sel = this.state.teams, s = g.save.settings;
    const home = TEAMS[sel.home], away = TEAMS[sel.away];
    const userTeam = sel.side === 1 ? away : home;
    const userTac = this.state.tactics || this.tacticsFor(userTeam);
    g.save.data.last = { home: home.id, away: away.id, side: sel.side, homeKit: sel.homeKit, awayKit: sel.awayKit };
    g.save.save();
    const tacOf = (t) => (sel.side !== null && t === userTeam ? userTac : tacticsFromStyle(t.style));
    this.render('loading', `<div class="loading"><div class="load-vs">
        <img src="${crestURL(home, 200)}" alt=""><b>VS</b><img src="${crestURL(away, 200)}" alt=""></div>
        <h2>${esc(home.name)} — ${esc(away.name)}</h2><p>Preparando el estadio…</p></div>`, {});
    setTimeout(() => g.startMatch({
      home, away, homeTactics: tacOf(home), awayTactics: tacOf(away),
      homeKit: sel.homeKit, awayKit: sel.awayKit === 'auto' ? undefined : sel.awayKit,
      difficulty: s.difficulty, halfMinutes: s.halfMinutes, userSide: sel.side, night: s.night,
    }), 60);
  }

  // ---------------------------------------------------------------- Ajustes
  settings(onBack) {
    const g = this.game, s = g.save.settings;
    this._settingsBack = onBack || this._settingsBack || (() => this.main());
    const back = () => this._settingsBack();
    const redraw = () => this.settings();
    const vol = (key, label) => `
      <div class="slider" data-nav data-adj="v:${key}">
        <span class="slider-l">${label}</span>
        <span class="slider-t"><i style="width:${Math.round(s[key] * 100)}%"></i></span>
        <span class="slider-n">${Math.round(s[key] * 100)}</span>
      </div>`;
    const toggle = (key, label, on = 'SÍ', off = 'NO') => `
      <div class="row" data-nav data-adj="t:${key}" data-act="t:${key}"><span class="row-l">${label}</span><span class="row-v"><b>${s[key] ? on : off}</b></span></div>`;
    const qi = Math.max(0, QUALITIES.findIndex((q) => q[0] === s.quality));
    const camIds = Object.keys(CAMERA_STYLES);
    const acts = {
      back,
      controls: () => this.controls(() => this.settings()),
      cplat: (d) => { const i = PLATAFORMAS.indexOf(g.save.settings.plataforma || 'auto'); g.save.setSetting('plataforma', PLATAFORMAS[(i + Number(d) + PLATAFORMAS.length) % PLATAFORMAS.length]); g.applySettings(); redraw(); },
      cmodo: () => { const ctl = g.save.settings.controles || {}; g.save.setSetting('controles', { ...ctl, modo: ctl.modo === 'wasd' ? 'raton' : 'wasd' }); g.applyControls(); redraw(); },
      cesq: (d) => { const ctl = g.save.settings.controles || {}; const lista = ESQUEMAS; const i = lista.indexOf(ctl.esquema || 'clasico'); g.save.setSetting('controles', { ...ctl, esquema: lista[(i + Number(d) + lista.length) % lista.length] }); g.applyControls(); redraw(); },
      bindings: () => this.controlesPersonal(),
      fs: () => g.toggleFullscreen(),
      'q': (d) => { g.save.setSetting('quality', QUALITIES[(qi + Number(d) + 3) % 3][0]); g.applySettings(); redraw(); },
      'cam': (d) => { g.save.setSetting('camera', camIds[(camIds.indexOf(s.camera) + Number(d) + camIds.length) % camIds.length]); g.applySettings(); redraw(); },
    };
    for (const k of ['master', 'music', 'sfx', 'crowd']) {
      acts[`v:${k}`] = (d) => { g.save.setSetting(k, clamp(Math.round((s[k] + Number(d) * 0.1) * 10) / 10, 0, 1)); g.applySettings(); g.audio.ui('move'); redraw(); };
    }
    for (const k of ['voice', 'captions', 'radar']) acts[`t:${k}`] = () => { g.save.setSetting(k, !s[k]); g.applySettings(); redraw(); };
    const voces = g.commentary.voicesES();
    const actual = (g.commentary.voice && g.commentary.voice.name) || 'Automática';
    acts['vz'] = (d) => {
      const lista = [null, ...voces.map((v) => v.name)];
      const i = Math.max(0, lista.indexOf(s.voiceName || null));
      g.save.setSetting('voiceName', lista[(i + Number(d) + lista.length) % lista.length]);
      g.applySettings(); redraw();
    };
    acts['vzTest'] = () => { g.applySettings(); g.commentary.probar(); };
    this.render('settings', `
      <header class="head"><h1>AJUSTES</h1></header>
      <div class="cols">
        <div class="col">
          <h3>SONIDO</h3>
          ${vol('master', 'VOLUMEN GENERAL')}${vol('music', 'MÚSICA')}${vol('sfx', 'EFECTOS')}${vol('crowd', 'PÚBLICO')}
          ${toggle('voice', 'VOZ DEL COMENTARISTA')}
          ${toggle('captions', 'SUBTÍTULOS DEL COMENTARISTA')}
          <div class="row" data-nav data-adj="vz"><span class="row-l">VOZ</span><span class="row-v"><button class="arrow sm" data-act="vz" data-arg="-1">◀</button><b>${esc(voces.length ? actual : 'Sin voces')}</b><button class="arrow sm" data-act="vz" data-arg="1">▶</button></span></div>
          <button class="btn" data-nav data-act="vzTest">PROBAR VOZ</button>
          ${voces.length ? '' : '<p class="mute sm">Este navegador no tiene voces en español instaladas: el comentarista aparecerá solo como texto.</p>'}
        </div>
        <div class="col">
          <h3>IMAGEN</h3>
          <div class="row" data-nav data-adj="q"><span class="row-l">CALIDAD GRÁFICA</span><span class="row-v"><button class="arrow sm" data-act="q" data-arg="-1">◀</button><b>${QUALITIES[qi][1]}</b><button class="arrow sm" data-act="q" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="cam"><span class="row-l">CÁMARA</span><span class="row-v"><button class="arrow sm" data-act="cam" data-arg="-1">◀</button><b>${CAMERA_STYLES[s.camera] ? CAMERA_STYLES[s.camera].name : 'RETRANSMISIÓN'}</b><button class="arrow sm" data-act="cam" data-arg="1">▶</button></span></div>
          ${toggle('radar', 'RADAR')}
          <p class="mute sm">La calidad gráfica se aplica por completo al empezar el siguiente partido.</p>
          <button class="btn" data-nav data-act="fs">PANTALLA COMPLETA</button>
          <div class="row pc-only" data-nav data-adj="cmodo"><span class="row-l">DIRECCIÓN</span><span class="row-v"><button class="arrow sm" data-act="cmodo" data-arg="-1">◀</button><b>${(g.save.settings.controles || {}).modo === 'wasd' ? 'WASD' : 'MOUSE'}</b><button class="arrow sm" data-act="cmodo" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="cplat"><span class="row-l">PLATAFORMA</span><span class="row-v"><button class="arrow sm" data-act="cplat" data-arg="-1">◀</button><b>${PLATAFORMA_NOMBRE[g.save.settings.plataforma || 'auto']}</b><button class="arrow sm" data-act="cplat" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="cesq"><span class="row-l">ESQUEMA</span><span class="row-v"><button class="arrow sm" data-act="cesq" data-arg="-1">◀</button><b>${ESQUEMA_NOMBRE[(g.save.settings.controles || {}).esquema || 'clasico']}</b><button class="arrow sm" data-act="cesq" data-arg="1">▶</button></span></div>
          <button class="btn" data-nav data-act="controls">VER CONTROLES</button>
          <button class="btn" data-nav data-act="bindings">PERSONALIZAR CONTROLES</button>
          <button class="btn go" data-nav data-act="back" data-default>VOLVER</button>
        </div>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['← →', 'Ajustar'], ['ESC', 'Volver']])}
    `, acts, back, true);
  }

  /**
   * Primera vez: ¿cómo quieres jugar? (paso 1 dirección, paso 2 controles).
   * Se puede cambiar después en Ajustes.
   */
  setupInicial(paso = 1) {
    const g = this.game;
    this.state.setupPaso = paso;
    const pie = '<p class="mute sm setup-pie">Podrás cambiarlo después en AJUSTES → CONTROLES.</p>';
    let cuerpo;
    if (paso === 1) {
      cuerpo = `
        <header class="head"><span class="head-step">BIENVENIDO · 1 / 2</span><h1>¿Cómo quieres jugar?</h1></header>
        <div class="setup-cards">
          <div class="setup-card">
            <h2>DIRECCIÓN CON MOUSE</h2>
            <p>Avanzas con W. La dirección de los pases y tiros es con el mouse: una línea te muestra hacia dónde irá el balón.</p>
            <div class="setup-acc">
              <button class="btn go" data-nav data-act="setupDir" data-arg="raton" data-default>ELEGIR</button>
            </div>
          </div>
          <div class="setup-card">
            <h2>DIRECCIÓN CON WASD</h2>
            <p>Te mueves con WASD. Sin línea ni dirección del mouse: el pase y el tiro van hacia donde te mueves.</p>
            <div class="setup-acc">
              <button class="btn go" data-nav data-act="setupDir" data-arg="wasd">ELEGIR</button>
            </div>
          </div>
        </div>
        <div class="setup-ej"><video src="${VIDEO_CONTROLES}" controls autoplay loop muted playsinline></video></div>
        ${pie}`;
    } else if (this.game.plataforma === 'movil') {
      cuerpo = `
        <header class="head"><span class="head-step">BIENVENIDO</span><h1>Controles táctiles</h1></header>
        <div class="setup-cards">
          <div class="setup-card">
            <h2>JOYSTICK Y BOTONES</h2>
            <p>Mueve al jugador con el joystick de la izquierda. Pase, tiro, pase largo, globo, sprint y cambio están a la derecha.</p>
            <div class="setup-acc"><button class="btn go" data-nav data-act="setupEsq" data-arg="clasico" data-default>ELEGIR</button></div>
          </div>
        </div>
        ${pie}`;
    } else {
      const filas = CONTROLS_HELP.ataque.slice(0, 6).map(([k, t]) => `<tr><td><kbd>${k}</kbd></td><td>${t}</td></tr>`).join('');
      cuerpo = `
        <header class="head"><span class="head-step">BIENVENIDO · 2 / 2</span><h1>¿Cuáles quieres que sean tus controles?</h1></header>
        <div class="setup-cards">
          <div class="setup-card">
            <h2>CLÁSICO</h2>
            <p>Los controles de siempre.</p>
            <table class="keys setup-keys">${filas}</table>
            <div class="setup-acc"><button class="btn go" data-nav data-act="setupEsq" data-arg="clasico" data-default>ELEGIR</button></div>
          </div>
          <div class="setup-card">
            <h2>ALTERNATIVO</h2>
            <p>Pases con clic izquierdo, disparo con clic derecho y sprint con E.</p>
            <div class="setup-acc"><button class="btn go" data-nav data-act="setupEsq" data-arg="alternativo">ELEGIR</button></div>
          </div>
        </div>
        <p class="mute sm setup-pie">También puedes elegir PERSONALIZADO en AJUSTES → CONTROLES para asignar cada tecla y botón.</p>
        ${pie}`;
    }
    this.render('setup', `<div class="setup">${cuerpo}</div>`, {
      setupDir: (dir) => { this.state.setupDir = dir; this.setupInicial(2); },
      setupEsq: (esq) => {
        const ctl = g.save.settings.controles || {};
        g.save.setSetting('controles', { ...ctl, modo: this.state.setupDir || 'raton', esquema: esq });
        g.save.setSetting('setupDone', true);
        g.applyControls();
        g.audio.ui('ok');
        this.main();
      },
    }, null, false);
  }

  /** Pantalla para cambiar la tecla y el botón de cada acción. */
  controlesPersonal() {
    const g = this.game;
    const ctl = g.save.settings.controles || {};
    const tec = teclasEfectivas(ctl.teclado);
    const man = mandoEfectivo(ctl.mando);
    const fam = familiaMando(g.pad.nombre || '');
    const cap = this.captura;
    const pedir = cap
      ? `<p class="car-msg">${cap.tipo === 'teclado' ? 'Pulsa la nueva tecla (ESC cancela)' : 'Pulsa el nuevo botón del mando'}…</p>`
      : `<p class="mute sm">Elige una acción y pulsa ENTER para cambiar su tecla o su botón. Movimiento y menús no se pueden cambiar.</p>`;
    const msg = this.state.bindMsg || '';
    this.state.bindMsg = '';
    this.render('bindings', `
      <header class="head"><h1>PERSONALIZAR CONTROLES</h1></header>
      <div class="bind-wrap">
        <div class="bind-row bind-h"><span>ACCIÓN</span><span>TECLADO</span><span>MANDO${g.pad.nombre ? '' : ' (no conectado)'}</span></div>
        ${ACCIONES.map(([a, label], i) => `
          <div class="bind-row">
            <span>${label}</span>
            <button class="bind-btn${cap && cap.accion === a && cap.tipo === 'teclado' ? ' esperando' : ''}" data-nav data-act="bindKey" data-arg="${a}" ${i === 0 ? 'data-default' : ''}>${esc(nombreTecla(tec[a][0]))}</button>
            <button class="bind-btn${cap && cap.accion === a && cap.tipo === 'mando' ? ' esperando' : ''}" data-nav data-act="bindPad" data-arg="${a}">${esc(nombreBoton(man[a], fam))}</button>
          </div>`).join('')}
      </div>
      ${pedir}
      ${msg ? `<p class="car-msg">${esc(msg)}</p>` : ''}
      <div class="report-btns car-foot">
        <button class="btn" data-nav data-act="reset">RESTAURAR</button>
        <button class="btn go" data-nav data-act="back">VOLVER</button>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Cambiar'], ['ESC', 'Volver']])}
    `, {
      bindKey: (a) => this.empezarCaptura('teclado', a),
      bindPad: (a) => this.empezarCaptura('mando', a),
      reset: () => {
        const previo = g.save.settings.controles || {};
        g.save.setSetting('controles', { modo: previo.modo, esquema: previo.esquema });
        g.applyControls();
        this.state.bindMsg = 'Controles restaurados.';
        this.controlesPersonal();
      },
      back: () => this.settings(),
    }, () => this.settings(), true);
  }

  empezarCaptura(tipo, accion) {
    this.captura = { tipo, accion };
    this.game.pad.captura = tipo === 'mando' ? (boton) => this.terminarCaptura(boton) : null;
    this.game.audio.ui('move');
    this.controlesPersonal();
  }

  cancelarCaptura() {
    this.captura = null;
    this.game.pad.captura = null;
    this.controlesPersonal();
  }

  /** Asigna la tecla o el botón. Si ya lo usaba otra acción, ambas intercambian. */
  terminarCaptura(valor) {
    const cap = this.captura;
    if (!cap) return;
    this.captura = null;
    this.game.pad.captura = null;
    const g = this.game;
    const ctl = g.save.settings.controles || {};
    if (cap.tipo === 'teclado') {
      if (TECLAS_RESERVADAS.has(valor)) {
        this.state.bindMsg = `${nombreTecla(valor)} está reservada para el movimiento o los menús.`;
        this.game.audio.ui('back');
        this.controlesPersonal();
        return;
      }
      const tec = teclasEfectivas(ctl.teclado);
      for (const a of Object.keys(tec)) {
        if (a !== cap.accion && tec[a].includes(valor)) tec[a] = [...tec[cap.accion]];
      }
      tec[cap.accion] = [valor];
      ctl.teclado = tec;
    } else {
      const man = mandoEfectivo(ctl.mando);
      for (const a of Object.keys(man)) {
        if (a !== cap.accion && man[a] === valor) man[a] = man[cap.accion];
      }
      man[cap.accion] = valor;
      ctl.mando = man;
    }
    g.save.setSetting('controles', ctl);
    g.applyControls();
    this.game.audio.ui('ok');
    this.controlesPersonal();
  }

  controls(onBack) {
    const col = (title, rows) => `<div class="col"><h3>${title}</h3><table class="keys">${rows.map(([k, t]) => `<tr><td><kbd>${k}</kbd></td><td>${t}</td></tr>`).join('')}</table></div>`;
    this.render('controls', `
      <header class="head"><h1>CONTROLES</h1></header>
      <div class="cols">${col('CON BALÓN', CONTROLS_HELP.ataque)}${col('SIN BALÓN', CONTROLS_HELP.defensa)}
        <div class="col"><h3>SAQUES</h3><table class="keys">
          <tr><td><kbd>W A S D</kbd></td><td>Apuntar</td></tr>
          <tr><td><kbd>ESPACIO</kbd></td><td>Saque en corto</td></tr>
          <tr><td><kbd>R</kbd></td><td>Saque largo / centro (mantener = más lejos)</td></tr>
          <tr><td><kbd>E</kbd></td><td>Tiro directo en faltas y penaltis</td></tr>
          <tr><td><kbd>W / S</kbd></td><td>Penalti: elegir lado. Como portero, lado de la estirada</td></tr>
        </table></div>
        <div class="col"><h3>MANDO · XBOX / PLAYSTATION</h3><table class="pad-table">
          <tr><td>Mover</td><td colspan="2"><b>Stick izquierdo / cruceta</b></td></tr>
          <tr><td>Pase (mantener = fuerte)</td><td><b>A</b></td><td><b>✕</b></td></tr>
          <tr><td>Pase al hueco</td><td><b>B</b></td><td><b>○</b></td></tr>
          <tr><td>Disparo (mantener = potencia)</td><td><b>X</b></td><td><b>□</b></td></tr>
          <tr><td>Pase elevado / centro</td><td><b>Y</b></td><td><b>△</b></td></tr>
          <tr><td>Cambiar de jugador</td><td><b>LB</b></td><td><b>L1</b></td></tr>
          <tr><td>Proteger el balón</td><td><b>RB</b></td><td><b>R1</b></td></tr>
          <tr><td>Regate</td><td><b>LT</b></td><td><b>L2</b></td></tr>
          <tr><td>Sprint</td><td><b>RT</b></td><td><b>R2</b></td></tr>
          <tr><td>Vaselina</td><td><b>R3</b></td><td><b>R3</b></td></tr>
          <tr><td>Pausa</td><td><b>Menú</b></td><td><b>Opciones</b></td></tr>
          <tr><td>En menús</td><td><b>A aceptar · B volver</b></td><td><b>✕ aceptar · ○ volver</b></td></tr>
        </table>
        <p class="mute sm">En saques y penaltis, A/✕ saca en corto, Y/△ en largo y X/□ tira a puerta.</p>
        <button class="btn go" data-nav data-act="back" data-default>VOLVER</button></div>
      </div>
    `, { back: onBack }, onBack);
  }

  // ------------------------------------------------------------------ Pausa
  pause() {
    const g = this.game, m = g.match;
    const user = !!m.userTeam;
    this.render('pause', `
      <div class="pause">
        <div class="pause-score">${this.scoreLine(m)}</div>
        <h1>PAUSA</h1>
        <nav class="menu compact">
          <button class="mi" data-nav data-act="resume" data-default><span class="mi-t">REANUDAR</span></button>
          ${user ? '<button class="mi" data-nav data-act="tactics"><span class="mi-t">FORMACIÓN Y TÁCTICA</span></button>' : ''}
          ${user ? '<button class="mi" data-nav data-act="subs"><span class="mi-t">CAMBIOS</span></button>' : ''}
          <button class="mi" data-nav data-act="controls"><span class="mi-t">CONTROLES</span></button>
          <button class="mi" data-nav data-act="settings"><span class="mi-t">AJUSTES</span></button>
          <button class="mi" data-nav data-act="restart"><span class="mi-t">REINICIAR PARTIDO</span></button>
          <button class="mi" data-nav data-act="quit"><span class="mi-t">SALIR AL MENÚ</span></button>
        </nav>
      </div>
    `, {
      resume: () => g.resume(),
      tactics: () => this.tactics(true, () => this.pause()),
      subs: () => this.subs(() => this.pause()),
      controls: () => this.controls(() => this.pause()),
      settings: () => this.settings(() => this.pause()),
      restart: () => g.restartMatch(),
      quit: () => g.quitToMenu(),
    }, () => g.resume());
  }

  scoreLine(m) {
    const [h, a] = m.teams;
    return `<span class="sl-team"><img src="${crestURL(h.data, 96)}" alt="">${esc(h.name)}</span>
      <b class="sl-score">${h.score} - ${a.score}</b>
      <span class="sl-team r">${esc(a.name)}<img src="${crestURL(a.data, 96)}" alt=""></span>`;
  }

  statsTable(m) {
    const [h, a] = m.teams;
    const poss = m.possessionPct();
    const pct = (t) => (t.stats.passes ? Math.round((Math.min(t.stats.passesOk, t.stats.passes) / t.stats.passes) * 100) : 0);
    const rows = [
      ['POSESIÓN', poss[0] + '%', poss[1] + '%', poss[0], poss[1]],
      ['TIROS', h.stats.shots, a.stats.shots],
      ['TIROS A PUERTA', h.stats.onTarget, a.stats.onTarget],
      ['PASES', h.stats.passes, a.stats.passes],
      ['PRECISIÓN DE PASE', pct(h) + '%', pct(a) + '%', pct(h), pct(a)],
      ['ENTRADAS GANADAS', h.stats.tackles, a.stats.tackles],
      ['FALTAS', h.stats.fouls, a.stats.fouls],
      ['CÓRNERS', h.stats.corners, a.stats.corners],
      ['FUERAS DE JUEGO', h.stats.offsides, a.stats.offsides],
      ['TARJETAS', `${h.stats.yellow} / ${h.stats.red}`, `${a.stats.yellow} / ${a.stats.red}`, h.stats.yellow + h.stats.red * 2, a.stats.yellow + a.stats.red * 2],
    ];
    return `<div class="stt" style="--hc:${h.kit.shirt};--ac:${a.kit.shirt}">${rows.map(([label, hv, av, hn, an]) => {
      const x = Number(hn ?? hv) || 0, y = Number(an ?? av) || 0;
      const tot = x + y || 1;
      return `<div class="stt-r"><b>${hv}</b><div class="stt-m"><span>${label}</span><div class="stt-b"><i style="width:${(x / tot) * 100}%"></i><u style="width:${(y / tot) * 100}%"></u></div></div><b>${av}</b></div>`;
    }).join('')}</div>`;
  }

  scorers(m) {
    const side = (t) => m.scorers.filter((s) => s.team === t).map((s) => `<span>${esc(s.scorer.data.short)} ${s.minute}'${s.own ? ' (p.p.)' : ''}</span>`).join('');
    return `<div class="scorers"><div>${side(m.teams[0])}</div><i class="dot"></i><div>${side(m.teams[1])}</div></div>`;
  }

  halfTime() {
    const g = this.game, m = g.match;
    this.render('half', `
      <div class="report">
        <div class="report-tag">DESCANSO</div>
        <div class="pause-score big">${this.scoreLine(m)}</div>
        ${this.scorers(m)}
        ${this.statsTable(m)}
        <div class="report-btns">
          ${m.userTeam ? '<button class="btn" data-nav data-act="tactics">FORMACIÓN Y TÁCTICA</button>' : ''}
          ${m.userTeam ? '<button class="btn" data-nav data-act="subs">CAMBIOS</button>' : ''}
          <button class="btn go" data-nav data-act="go" data-default>SEGUNDA PARTE ▶</button>
        </div>
      </div>
    `, {
      go: () => g.secondHalf(),
      tactics: () => this.tactics(true, () => this.halfTime()),
      subs: () => this.subs(() => this.halfTime()),
    });
  }

  fullTime() {
    const g = this.game, m = g.match;
    const [h, a] = m.teams;
    let verdict = 'FINAL DEL PARTIDO';
    if (m.userTeam) {
      const u = m.userTeam, o = u.opponent;
      verdict = u.score > o.score ? '¡VICTORIA!' : u.score < o.score ? 'DERROTA' : 'EMPATE';
    } else if (h.score !== a.score) verdict = `GANA ${(h.score > a.score ? h : a).name.toUpperCase()}`;
    this.render('full', `
      <div class="report">
        <div class="report-tag">FINAL DEL PARTIDO</div>
        <h1 class="verdict">${esc(verdict)}</h1>
        <div class="pause-score big">${this.scoreLine(m)}</div>
        ${this.scorers(m)}
        ${this.statsTable(m)}
        ${g.careerCtx && g.careerPointsInfo ? this.careerPointsHTML(g.careerPointsInfo) : ''}
        <div class="report-btns">
          <button class="btn" data-nav data-act="heat">MAPA DE CALOR</button>
          ${m.highlights && m.highlights.length ? `<button class="btn" data-nav data-act="hl">MEJORES JUGADAS (${m.highlights.length})</button>` : ''}
          ${g.careerCtx ? '' : '<button class="btn" data-nav data-act="again">REVANCHA</button>'}
          <button class="btn go" data-nav data-act="menu" data-default>${g.careerCtx ? 'CONTINUAR CARRERA' : 'VOLVER AL MENÚ'}</button>
        </div>
      </div>
    `, {
      again: () => g.restartMatch(),
      menu: () => g.quitToMenu(),
      heat: () => this.mapaDeCalor('T0'),
      hl: () => this.highlights(),
    });
  }


  // ------------------------------------------------------------ Personalizar
  personalizar() {
    const tile = (act, titulo, desc, icono, def) => `
      <button class="tile" data-nav data-act="${act}" ${def ? 'data-default' : ''}>
        <span class="tile-ico">${icono}</span><b>${titulo}</b><small>${desc}</small></button>`;
    this.render('pers', `
      <header class="head"><h1>PERSONALIZAR</h1></header>
      <div class="tiles">
        ${tile('pJugadores', 'JUGADORES', 'Crea y edita futbolistas: apariencia, nombre y estadísticas.', ICONO.jugador, true)}
        ${tile('pClubes', 'CLUBES', 'Escudo, equipaciones, plantilla, titulares y formación.', ICONO.club)}
        ${tile('pLigas', 'LIGAS', 'Crea ligas con su logo y los clubes que las forman.', ICONO.liga)}
        ${tile('pSelecciones', 'SELECCIONES', 'Crea selecciones con bandera, camiseta y jugadores de cualquier club.', ICONO.seleccion)}
        ${tile('pTorneos', 'TORNEOS', 'Torneos de clubes o de selecciones, con grupos o eliminatorias.', ICONO.torneo)}
      </div>
      ${this.hint([['← →', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      pJugadores: () => { this.game.audio.ui('ok'); this.listaJugadores(); },
      pClubes: () => { this.game.audio.ui('ok'); this.listaClubes(); },
      pLigas: () => { this.game.audio.ui('ok'); this.listaLigas(); },
      pSelecciones: () => { this.game.audio.ui('ok'); this.listaSelecciones(); },
      pTorneos: () => { this.game.audio.ui('ok'); this.torneosLista(); },
    }, () => this.main(), true);
  }

  /** Icono de borrar o editar: se confirma con un segundo toque. */
  filaAcciones(tipo, id, sure) {
    return `<button class="ico" data-nav data-act="${tipo}Edit" data-arg="${id}" aria-label="Editar">${ICONO.editar}</button>`
      + `<button class="ico del${sure ? ' sure' : ''}" data-nav data-act="${tipo}Del" data-arg="${id}" aria-label="Borrar">${sure ? '¿BORRAR?' : ICONO.borrar}</button>`;
  }

  listaJugadores() {
    this.state.lista = 'jug';
    const sure = this.state.confirmDel;
    const lista = [...jugadores()].sort((a, b) => (clubDeJugador(a.id) || 'zz').localeCompare(clubDeJugador(b.id) || 'zz') || b.ovr - a.ovr);
    this.render('plist', `
      <header class="head"><span class="head-step">PERSONALIZAR</span><h1>JUGADORES</h1></header>
      <div class="pl-top">${this.buscador('jug', 'Buscar jugador, club o posición')}${this.filtroBtn('jug')}<button class="btn go" data-nav data-act="jNew" data-default>CREAR JUGADOR ▶</button></div>
      ${this.panelFiltro('jug')}
      ${this.chipsFiltro('jug')}
      <div class="pl-list">
        ${lista.map((p) => {
          const club = clubDeJugador(p.id);
          const nombreClub = club ? getTeam(club).name.toUpperCase() : 'LIBRE';
          return `<div class="pl-row jug" data-grupos="${esc(this.gruposDe('jug', club))}" data-cat="${catPosicion(p.pos)}" data-ovr="${p.ovr}" data-edad="${p.age ?? ''}" data-busca="${norm([p.name, club ? getTeam(club).name + ' ' + getTeam(club).short : 'libre', p.pos, p.ovr].join(' '))}">
            <span class="pl-pos">${p.pos}</span>
            <span class="pl-name">${esc(p.name)}<i class="club-box">[ ${esc(nombreClub)} ]</i>${esJugadorPersonalizado(p.id) ? ' <i class="tag">PERSONALIZADO</i>' : ''}</span>
            <span class="pl-ovr">${p.ovr}</span>
            ${this.filaAcciones('j', p.id, sure === 'j' + p.id)}
          </div>`;
        }).join('')}
        <p class="pl-empty" hidden>Ningún jugador coincide con la búsqueda.</p>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      ...this.accionesFiltro('jug'),
      jNew: () => this.editarJugador(null),
      jEdit: (id) => this.editarJugador(id),
      jDel: (id) => {
        if (this.state.confirmDel !== 'j' + id) { this.state.confirmDel = 'j' + id; this.listaJugadores(); return; }
        this.state.confirmDel = null;
        borrarJugador(id);
        this.game.audio.ui('back');
        this.listaJugadores();
      },
    }, () => this.personalizar(), true);
  }

  editarJugador(id) {
    const base = id ? jugadorPorId(id) : null;
    if (!this.state.pDraft || this.state.pDraft.pid !== (id || null)) {
      this.state.pDraft = base ? {
        pid: id, name: base.name, pos: base.pos, number: base.number, age: base.age,
        attrs: { ...base.attrs }, skin: base.skin, hair: base.hair, hairStyle: base.hairStyle, height: base.height,
        clubId: clubDeJugador(id),
      } : {
        pid: null, name: '', pos: 'CM', number: 10, age: 22,
        attrs: Object.fromEntries(ATTR_KEYS.map((k) => [k, 60])), skin: COLORES_PIEL[0], hair: COLORES_PELO[0], hairStyle: 0, height: 1.02,
        clubId: null,
      };
    }
    const d = this.state.pDraft;
    const clubes = TEAMS.filter((t) => !t.seleccion).map((t) => t.id);
    const ovr = d.pos === 'GK' ? (d.attrs.porteria ?? 60) : overall(d.pos, d.attrs);
    const pal = (lista, actual) => lista.map((c) => `<i class="sw${c === actual ? ' on' : ''}" style="background:${c}"></i>`).join('');

    // Carta: la foto 3D solo se vuelve a generar si cambia la apariencia (no con cada stat)
    const kitD = this.kitDeBorrador(d);
    const firmaFoto = [d.skin, d.hair, d.hairStyle, d.height, d.number, d.pos, kitD.shirt, kitD.accent, kitD.pattern, kitD.shorts].join('|');
    if (!this.state.pFoto || this.state.pFoto.firma !== firmaFoto) {
      let url = '';
      try { url = fotoJugador(this.jugadorVisual(d), kitD); } catch (e) { url = ''; }
      this.state.pFoto = { firma: firmaFoto, url };
    }
    const clubD = d.clubId ? getTeam(d.clubId) : null;
    const tarjeta = tarjetaJugadorHTML({
      name: d.name.trim() || 'Nuevo jugador', pos: d.pos, ovr, attrs: d.attrs, number: d.number,
      clubShort: clubD ? clubD.short : 'LIBRE', crest: clubD ? crestURL(clubD, 48) : '',
      photo: this.state.pFoto.url,
    });
    this.render('pedit', `
      <header class="head"><span class="head-step">PERSONALIZAR · JUGADOR</span><h1>${d.pid ? 'EDITAR JUGADOR' : 'NUEVO JUGADOR'}</h1></header>
      <div class="pe-wrap">
        <div class="pe-col">
          <label class="car-field"><span>NOMBRE</span>
            <input class="car-input" type="text" maxlength="28" autocomplete="off" value="${esc(d.name)}" placeholder="Nombre y apellido" data-input="pname"></label>
          <div class="row" data-nav data-adj="ppos"><span class="row-l">POSICIÓN</span><span class="row-v"><button class="arrow sm" data-act="ppos" data-arg="-1">◀</button><b>${d.pos}</b><button class="arrow sm" data-act="ppos" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="pnum"><span class="row-l">DORSAL</span><span class="row-v"><button class="arrow sm" data-act="pnum" data-arg="-1">◀</button><b>${d.number}</b><button class="arrow sm" data-act="pnum" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="page"><span class="row-l">EDAD</span><span class="row-v"><button class="arrow sm" data-act="page" data-arg="-1">◀</button><b>${d.age}</b><button class="arrow sm" data-act="page" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="pclub"><span class="row-l">CLUB</span><span class="row-v"><button class="arrow sm" data-act="pclub" data-arg="-1">◀</button><b>${d.clubId ? esc(getTeam(d.clubId).short) : 'LIBRE'}</b><button class="arrow sm" data-act="pclub" data-arg="1">▶</button></span></div>
          <h3>APARIENCIA</h3>
          <div class="row" data-nav data-adj="pskin"><span class="row-l">PIEL</span><span class="swatches">${pal(COLORES_PIEL, d.skin)}</span><span class="row-v"><button class="arrow sm" data-act="pskin" data-arg="-1">◀</button><button class="arrow sm" data-act="pskin" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="phair"><span class="row-l">PELO</span><span class="swatches">${pal(COLORES_PELO, d.hair)}</span><span class="row-v"><button class="arrow sm" data-act="phair" data-arg="-1">◀</button><button class="arrow sm" data-act="phair" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="pstyle"><span class="row-l">PEINADO</span><span class="row-v"><button class="arrow sm" data-act="pstyle" data-arg="-1">◀</button><b>${d.hairStyle + 1}</b><button class="arrow sm" data-act="pstyle" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="pheight"><span class="row-l">ALTURA</span><span class="row-v"><button class="arrow sm" data-act="pheight" data-arg="-1">◀</button><b>${Math.round(d.height * 100)}</b><button class="arrow sm" data-act="pheight" data-arg="1">▶</button></span></div>
        </div>
        <div class="pe-col">
          <h3>CARTA</h3>
          <div class="pe-card">${tarjeta}</div>
          <h3>ESTADÍSTICAS</h3>
          ${ATTR_KEYS.map((k) => `
            <div class="car-attr" data-nav data-adj="pattr:${k}">
              <span class="car-attr-l">${ATTR_LABELS[k]}</span>
              <span class="stat-b"><i style="width:${d.attrs[k]}%"></i></span>
              <b>${d.attrs[k]}</b>
              <button class="arrow sm" data-act="pattr" data-arg="${k}:-1" aria-label="Bajar">−</button>
              <button class="arrow sm" data-act="pattr" data-arg="${k}:1" aria-label="Subir">+</button>
            </div>`).join('')}
          <div class="pe-btns">
            <button class="btn go" data-nav data-act="pSave">GUARDAR</button>
            <button class="btn" data-nav data-act="p3d">VISTA 3D</button>
            <button class="btn" data-nav data-act="back">CANCELAR</button>
          </div>
        </div>
      </div>
      ${this.state.msgP ? `<p class="car-msg">${esc(this.state.msgP)}</p>` : ''}
      ${this.hint([['↑ ↓', 'Moverse'], ['← →', 'Ajustar'], ['ENTER', 'Guardar'], ['ESC', 'Cancelar']])}
    `, {
      ppos: (dir) => { d.pos = cyc(POSICIONES, d.pos, dir); this.state.msgP = ''; this.editarJugador(id); },
      pnum: (dir) => { d.number = clamp(d.number + Number(dir), 1, 99); this.editarJugador(id); },
      page: (dir) => { d.age = clamp(d.age + Number(dir), 15, 42); this.editarJugador(id); },
      pclub: (dir) => { const lista = [null, ...clubes]; d.clubId = cyc(lista, d.clubId, dir); this.editarJugador(id); },
      pskin: (dir) => { d.skin = cyc(COLORES_PIEL, d.skin, dir); this.editarJugador(id); },
      phair: (dir) => { d.hair = cyc(COLORES_PELO, d.hair, dir); this.editarJugador(id); },
      pstyle: (dir) => { d.hairStyle = (d.hairStyle + Number(dir) + 4) % 4; this.editarJugador(id); },
      pheight: (dir) => { d.height = cyc(ALTURAS, d.height, dir); this.editarJugador(id); },
      pattr: (arg) => {
        const [k, dir] = arg.split(':');
        d.attrs[k] = clamp(d.attrs[k] + Number(dir), 30, 99);
        this.editarJugador(id);
      },
      pname: (v) => { d.name = v; },
      p3d: () => this.vistaPrevia3D(d),
      pSave: () => {
        if (!d.name.trim()) { this.state.msgP = 'Escribe un nombre.'; this.editarJugador(id); return; }
        const pid = guardarJugador(d, d.pid);
        this.state.pDraft = null; this.state.msgP = '';
        this.game.audio.ui('ok');
        void pid;
        this.listaJugadores();
      },
      back: () => { this.state.pDraft = null; this.state.msgP = ''; this.listaJugadores(); },
    }, () => { this.state.pDraft = null; this.state.msgP = ''; this.listaJugadores(); }, true);
  }

  /** Equipación del borrador: la del club elegido o la de fábrica si es libre. */
  kitDeBorrador(d) {
    const t = d.clubId ? getTeam(d.clubId) : null;
    return t ? t.home : equipacionesPorDefecto().home;
  }

  /** Datos visuales de un jugador en edición (cara, pelo, altura, dorsal, posición). */
  jugadorVisual(d) {
    const apellido = (d.name.trim().split(/\s+/).pop() || 'J').slice(0, 12);
    return { number: d.number, short: apellido, skin: d.skin, hair: d.hair, hairStyle: d.hairStyle, height: d.height, pos: d.pos };
  }

  /** Abre la vista previa 3D del jugador en edición (modelo girando, con su equipación). */
  vistaPrevia3D(d) {
    this.cerrarVistaPrevia3D();
    const el = document.createElement('div');
    el.className = 'm3d';
    el.innerHTML = `
      <div class="m3d-box" role="dialog" aria-label="Vista previa 3D">
        <div class="modal-tag">VISTA PREVIA 3D</div>
        <canvas class="m3d-canvas"></canvas>
        <p class="m3d-nota">${esc(d.name.trim() || 'Nuevo jugador')} · ${d.pos} · #${d.number}</p>
        <div class="m3d-btns"><button class="btn go" data-m3d-cerrar>CERRAR</button></div>
      </div>`;
    document.body.appendChild(el);
    const canvas = el.querySelector('.m3d-canvas');
    const cerrar = () => this.cerrarVistaPrevia3D();
    el.querySelector('[data-m3d-cerrar]').addEventListener('click', cerrar);
    const tecla = (e) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        e.stopImmediatePropagation();
        cerrar();
      }
    };
    window.addEventListener('keydown', tecla, true);
    try {
      const visor = new PlayerPreview(canvas, this.jugadorVisual(d), this.kitDeBorrador(d));
      visor.start();
      this.vista3D = { el, visor, tecla };
    } catch (err) {
      canvas.outerHTML = '<p class="m3d-nota">Este navegador no puede mostrar el modelo 3D (hace falta WebGL2).</p>';
      this.vista3D = { el, visor: null, tecla };
    }
  }

  cerrarVistaPrevia3D() {
    const v = this.vista3D;
    if (!v) return;
    if (v.visor) v.visor.dispose();
    v.el.remove();
    window.removeEventListener('keydown', v.tecla, true);
    this.vista3D = null;
  }

  listaClubes() {
    this.state.lista = 'club';
    const sure = this.state.confirmDel;
    this.render('clist', `
      <header class="head"><span class="head-step">PERSONALIZAR</span><h1>CLUBES</h1></header>
      <div class="pl-top">${this.buscador('club', 'Buscar club por nombre o abreviatura')}${this.filtroBtn('club')}<button class="btn go" data-nav data-act="cNew" data-default>CREAR CLUB ▶</button></div>
      ${this.panelFiltro('club')}
      ${this.chipsFiltro('club')}
      <div class="pl-list">
        ${TEAMS.filter((t) => !t.seleccion).map((t) => `
          <div class="pl-row" data-grupos="${esc(this.gruposDe('club', t.id))}" data-ovr="${t.ovr}" data-busca="${norm(t.name + ' ' + t.short)}">
            <img class="pl-crest" src="${crestURL(t, 48)}" alt="">
            <span class="pl-name">${esc(t.name)}${esClubOriginal(t.id) ? '' : ' <i class="tag">PERSONALIZADO</i>'}</span>
            <span class="pl-club">${esc(t.short)}</span>
            <span class="pl-ovr">${t.ovr}</span>
            ${this.filaAcciones('c', t.id, sure === 'c' + t.id)}
          </div>`).join('')}
        <p class="pl-empty" hidden>Ningún club coincide con la búsqueda.</p>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      ...this.accionesFiltro('club'),
      cNew: () => this.editarClub(null),
      cEdit: (id) => this.editarClub(id),
      cDel: (id) => {
        if (this.state.confirmDel !== 'c' + id) { this.state.confirmDel = 'c' + id; this.listaClubes(); return; }
        this.state.confirmDel = null;
        borrarClub(id);
        this.game.audio.ui('back');
        this.listaClubes();
      },
    }, () => this.personalizar(), true);
  }

  editarClub(id, seleccion = false) {
    const base = id ? getTeam(id) : null;
    if (!this.state.cDraft || this.state.cDraft.id !== (id || null)) {
      const eq = equipacionesPorDefecto('#e91e63');
      const esSel = !!seleccion || !!(base && base.seleccion);
      this.state.cDraft = base ? {
        id, seleccion: esSel, name: base.name, short: base.short, logo: base.logo || null,
        home: { ...base.home }, away: { ...base.away }, style: { ...base.style },
        miembros: base.squad.map((p) => p.id), titulares: base.titulares ? [...base.titulares] : [],
      } : {
        id: null, seleccion: esSel, name: '', short: '', logo: null, home: eq.home, away: eq.away, style: estiloPorDefecto(),
        miembros: [], titulares: [],
      };
      this.state.cMsg = '';
    }
    this.cRender();
  }

  /** Pantalla principal del editor de clubes (con el borrador guardado en el estado). */
  cRender() {
    const d = this.state.cDraft;
    const fIdx = FORMATION_NAMES.indexOf(d.style.formation);
    const mIdx = MENTALITIES.findIndex((m) => m.id === d.style.mentality);
    const patIdx = PATRONES.indexOf(d.home.pattern);
    const preview = { name: d.name || 'Club', short: d.short || 'CLU', logo: d.logo, home: d.home, away: d.away, crest: { shape: 'shield', emblem: 'wave', mono: (d.short || 'CL').slice(0, 2) }, id: d.id || 'draft' };
    const sw = (k) => `<span class="kit-sw" style="background:${k}"></span>`;
    this.render('cedit', `
      <header class="head"><span class="head-step">PERSONALIZAR · ${d.seleccion ? 'SELECCIÓN' : 'CLUB'}</span><h1>${d.id ? 'EDITAR ' : 'NUEVA '}${d.seleccion ? 'SELECCIÓN' : 'CLUB'}</h1></header>
      <div class="pe-wrap">
        <div class="pe-col">
          <label class="car-field"><span>NOMBRE</span>
            <input class="car-input" type="text" maxlength="28" autocomplete="off" value="${esc(d.name)}" placeholder="${d.seleccion ? 'Nombre de la selección' : 'Nombre del club'}" data-input="cname2"></label>
          <label class="car-field"><span>ABREVIATURA (3 LETRAS)</span>
            <input class="car-input" type="text" maxlength="3" autocomplete="off" value="${esc(d.short)}" placeholder="ABC" data-input="cshort"></label>
          <div class="logo-box">
            <img class="logo-prev" src="${crestURL(preview, 96)}" alt="">
            <div class="logo-btns">
              <button class="btn" data-nav data-act="cPickLogo">${d.seleccion ? 'SUBIR BANDERA PNG' : 'SUBIR LOGO PNG'}</button>
              ${d.logo ? '<button class="btn" data-nav data-act="cClearLogo">QUITAR LOGO</button>' : ''}
            </div>
            <input type="file" accept="image/png" id="logo-file" data-change="cLogoFile" hidden>
          </div>
          <h3>EQUIPACIÓN</h3>
          <div class="row" data-nav data-adj="ckit:shirt"><span class="row-l">CAMISETA</span><span class="swatches">${COLORES_CAMISETA.map((c) => `<i class="sw${c === d.home.shirt ? ' on' : ''}" style="background:${c}"></i>`).join('')}</span><span class="row-v"><button class="arrow sm" data-act="ckit" data-arg="shirt:-1">◀</button><button class="arrow sm" data-act="ckit" data-arg="shirt:1">▶</button></span></div>
          <div class="row" data-nav data-adj="ckit:accent"><span class="row-l">DETALLES</span><span class="swatches">${COLORES_CAMISETA.map((c) => `<i class="sw${c === d.home.accent ? ' on' : ''}" style="background:${c}"></i>`).join('')}</span><span class="row-v"><button class="arrow sm" data-act="ckit" data-arg="accent:-1">◀</button><button class="arrow sm" data-act="ckit" data-arg="accent:1">▶</button></span></div>
          <div class="row" data-nav data-adj="ckit:pattern"><span class="row-l">PATRÓN</span><span class="row-v"><button class="arrow sm" data-act="ckit" data-arg="pattern:-1">◀</button><b>${d.home.pattern.toUpperCase()}</b><button class="arrow sm" data-act="ckit" data-arg="pattern:1">▶</button></span></div>
          <div class="row" data-nav data-adj="ckit:shorts"><span class="row-l">PANTALÓN</span><span class="swatches">${COLORES_CAMISETA.map((c) => `<i class="sw${c === d.home.shorts ? ' on' : ''}" style="background:${c}"></i>`).join('')}</span><span class="row-v"><button class="arrow sm" data-act="ckit" data-arg="shorts:-1">◀</button><button class="arrow sm" data-act="ckit" data-arg="shorts:1">▶</button></span></div>
          <div class="kit-prev">${kitSwatch(d.home)}</div>
        </div>
        <div class="pe-col">
          <h3>TÁCTICA</h3>
          <div class="row" data-nav data-adj="cform"><span class="row-l">FORMACIÓN</span><span class="row-v"><button class="arrow sm" data-act="cform" data-arg="-1">◀</button><b>${d.style.formation}</b><button class="arrow sm" data-act="cform" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="cment"><span class="row-l">MENTALIDAD</span><span class="row-v"><button class="arrow sm" data-act="cment" data-arg="-1">◀</button><b>${MENTALITIES[mIdx >= 0 ? mIdx : 2].name}</b><button class="arrow sm" data-act="cment" data-arg="1">▶</button></span></div>
          <h3>PLANTILLA</h3>
          <p class="mute sm">${d.miembros.length} jugadores · mínimo ${MIN_JUGADORES_CLUB}. Titulares elegidos: ${d.titulares.length === 11 ? '11 / 11' : 'automáticos'}.</p>
          <div class="pe-btns">
            <button class="btn" data-nav data-act="cSquad">ELEGIR JUGADORES ▶</button>
            <button class="btn" data-nav data-act="cStart">ELEGIR TITULARES ▶</button>
          </div>
          ${this.state.cMsg ? `<p class="car-msg">${esc(this.state.cMsg)}</p>` : ''}
          <div class="pe-btns">
            <button class="btn go" data-nav data-act="cSave">${d.seleccion ? 'GUARDAR SELECCIÓN' : 'GUARDAR CLUB'}</button>
            <button class="btn" data-nav data-act="back">CANCELAR</button>
          </div>
        </div>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['← →', 'Ajustar'], ['ENTER', 'Elegir'], ['ESC', 'Cancelar']])}
    `, {
      cname2: (v) => { d.name = v; },
      cshort: (v) => { d.short = v.toUpperCase(); },
      cPickLogo: () => { const f = this.root.querySelector('#logo-file'); if (f) f.click(); },
      cLogoFile: (file) => {
        if (!file) return;
        leerLogo(file).then((url) => { d.logo = url; this.state.cMsg = ''; this.cRender(); })
          .catch((err) => { this.state.cMsg = err.message; this.cRender(); });
      },
      cClearLogo: () => { d.logo = null; this.cRender(); },
      ckit: (arg) => {
        const [campo, dir] = arg.split(':');
        if (campo === 'shirt' || campo === 'accent' || campo === 'shorts') {
          d.home[campo] = cyc(COLORES_CAMISETA, d.home[campo], dir);
          if (campo === 'shirt') { d.home.socks = d.home.shirt; d.home.num = d.home.accent; }
        } else d.home.pattern = cyc(PATRONES, d.home.pattern, dir);
        d.away = { ...d.away, shirt: d.away.shirt, accent: d.home.shirt, num: d.home.shirt };
        this.cRender();
      },
      cform: (dir) => { d.style = { ...d.style, formation: cyc(FORMATION_NAMES, d.style.formation, dir) }; d.titulares = []; this.cRender(); },
      cment: (dir) => { const m = MENTALITIES[cyc(MENTALITIES.map((_, i) => i), mIdx, dir)]; d.style = { ...d.style, mentality: m.id }; this.cRender(); },
      cSquad: () => this.cSquad(),
      cStart: () => this.cTitulares(),
      cSave: () => {
        if (!d.name.trim()) { this.state.cMsg = 'Escribe un nombre para el club.'; this.cRender(); return; }
        if (d.miembros.length < MIN_JUGADORES_CLUB) { this.state.cMsg = `Necesita al menos ${MIN_JUGADORES_CLUB} jugadores.`; this.cRender(); return; }
        guardarClub({ ...d }, d.id);
        this.game.audio.ui('ok');
        this.volverEditorClub();
      },
      back: () => this.volverEditorClub(),
    }, () => this.volverEditorClub(), true);
  }

  /** Sale del editor de clubes o selecciones a su lista. */
  volverEditorClub() {
    const sel = !!(this.state.cDraft && this.state.cDraft.seleccion);
    this.state.cDraft = null;
    this.state.cMsg = '';
    if (sel) this.listaSelecciones(); else this.listaClubes();
  }

  /** Elegir qué jugadores forman parte del club (de cualquier club o libres). */
  cSquad() {
    const d = this.state.cDraft;
    const todos = [...jugadores()].sort((a, b) => b.ovr - a.ovr);
    this.render('csquad', `
      <header class="head"><span class="head-step">${esc(d.short || d.name || 'CLUB')}</span><h1>ELEGIR JUGADORES</h1></header>
      <p class="mute sm car-sum">${d.miembros.length} seleccionados · ${d.seleccion ? 'un jugador puede estar en su club y en la selección a la vez.' : 'un jugador que elijas aquí sale de su club actual.'}</p>
      <div class="pl-list">
        ${todos.map((p) => {
          const on = d.miembros.includes(p.id);
          const otro = !on && clubDeJugador(p.id) && clubDeJugador(p.id) !== d.id;
          return `<button class="pl-row pick${on ? ' on' : ''}" data-nav data-act="cm" data-arg="${p.id}">
            <span class="pl-pos">${p.pos}</span><span class="pl-name">${esc(p.name)}</span>
            <span class="pl-club">${otro ? esc(getTeam(clubDeJugador(p.id)).short) : (clubDeJugador(p.id) ? esc(getTeam(clubDeJugador(p.id)).short) : 'LIBRE')}</span>
            <span class="pl-ovr">${p.ovr}</span><b class="check">${on ? '✔' : ''}</b></button>`;
        }).join('')}
      </div>
      <div class="report-btns car-foot"><button class="btn go" data-nav data-act="back" data-default>LISTO</button></div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Marcar'], ['ESC', 'Volver']])}
    `, {
      cm: (pid) => {
        const i = d.miembros.indexOf(pid);
        if (i >= 0) { d.miembros.splice(i, 1); d.titulares = d.titulares.filter((x) => x !== pid); }
        else d.miembros.push(pid);
        this.cSquad();
      },
      back: () => this.cRender(),
    }, () => this.cRender(), true);
  }

  /** Elegir los 11 titulares entre los miembros del club. */
  cTitulares() {
    const d = this.state.cDraft;
    const miembros = d.miembros.map((id) => jugadorPorId(id)).filter(Boolean).sort((a, b) => b.ovr - a.ovr);
    this.render('cstart', `
      <header class="head"><span class="head-step">${esc(d.short || d.name || 'CLUB')} · ${d.style.formation}</span><h1>TITULARES ${d.titulares.length}/11</h1></header>
      <p class="mute sm car-sum">Marca 11 jugadores. Los que no marques serán suplentes. Si no marcas ninguno, el juego elige el once solo.</p>
      <div class="pl-list">
        ${miembros.map((p) => `
          <button class="pl-row pick${d.titulares.includes(p.id) ? ' on' : ''}" data-nav data-act="ct" data-arg="${p.id}">
            <span class="pl-pos">${p.pos}</span><span class="pl-name">${esc(p.name)}</span>
            <span class="pl-ovr">${p.ovr}</span><b class="check">${d.titulares.includes(p.id) ? '★' : ''}</b></button>`).join('')}
      </div>
      <div class="report-btns car-foot">
        <button class="btn" data-nav data-act="cAuto">AUTOMÁTICO</button>
        <button class="btn go" data-nav data-act="back" data-default>LISTO</button>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Marcar'], ['ESC', 'Volver']])}
    `, {
      ct: (pid) => {
        const i = d.titulares.indexOf(pid);
        if (i >= 0) d.titulares.splice(i, 1);
        else if (d.titulares.length < 11) d.titulares.push(pid);
        else { this.game.audio.ui('back'); }
        this.cTitulares();
      },
      cAuto: () => {
        const once = pickLineup(miembros, d.style.formation).map((e) => e.player.id);
        d.titulares = once.length === 11 ? once : [];
        this.cTitulares();
      },
      back: () => { if (d.titulares.length && d.titulares.length !== 11) { this.state.cMsg = 'Los titulares son 11 o ninguno.'; } d.titulares = d.titulares.length === 11 ? d.titulares : []; this.cRender(); },
    }, () => this.cRender(), true);
  }

  // ------------------------------------------------- Cambios durante el partido

  /** Pantalla de cambios: elige quién sale del campo y quién entra desde la banca. */
  subs(back) {
    const m = this.game.match, team = m && m.userTeam;
    if (!team) { back(); return; }
    const st = this.state.subs || (this.state.subs = { out: null });
    const usados = team.subs || 0;
    const puede = m.canSubstitute() && usados < 5;
    const outP = st.out ? team.players.find((p) => p.data.id === st.out) : null;
    if (st.out && !outP) st.out = null;
    const campo = team.players.filter((p) => !p.sentOff);
    const banca = team.bench
      .filter((x) => !outP || (x.pos === 'GK') === outP.isGK)
      .sort((a, b) => b.ovr - a.ovr);
    const aviso = !m.canSubstitute() ? 'Ahora no se puede cambiar: espera a que el juego siga.'
      : usados >= 5 ? 'Ya has hecho los 5 cambios permitidos.'
      : outP ? `Elige quién entra por ${esc(outP.data.name)}.`
      : 'Elige primero quién sale del campo.';
    this.render('subs', `
      <header class="head"><span class="head-step">${esc(team.short)} · CAMBIOS ${usados} / 5</span><h1>CAMBIOS</h1></header>
      <p class="mute sm car-sum">${aviso}</p>
      <div class="subs">
        <div class="subs-col"><h3>EN EL CAMPO</h3>
          <div class="pl-list small">
            ${campo.map((p) => `<button class="pl-row pick${st.out === p.data.id ? ' on' : ''}" data-nav data-act="sOut" data-arg="${p.data.id}">
              <span class="pl-pos">${p.data.pos}</span><span class="pl-name">${esc(p.data.name)}</span><span class="pl-club"></span>
              <span class="pl-ovr">${p.data.ovr}</span><b class="check">${st.out === p.data.id ? '▲' : ''}</b></button>`).join('')}
          </div>
        </div>
        <div class="subs-col"><h3>BANCA</h3>
          <div class="pl-list small">
            ${banca.map((x) => `<button class="pl-row pick" data-nav data-act="sIn" data-arg="${x.id}">
              <span class="pl-pos">${x.pos}</span><span class="pl-name">${esc(x.name)}</span><span class="pl-club"></span>
              <span class="pl-ovr">${x.ovr}</span><b class="check"></b></button>`).join('') || '<p class="mute sm">No hay suplentes para esta posición.</p>'}
          </div>
        </div>
      </div>
      <div class="report-btns car-foot"><button class="btn" data-nav data-act="back" data-default>VOLVER</button></div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      sOut: (id) => {
        if (!puede) return;
        st.out = st.out === id ? null : id;
        this.subs(back);
      },
      sIn: (id) => {
        if (!puede || !outP) return;
        const np = m.substitute(team, outP, team.bench.find((x) => x.id === id));
        if (np) {
          st.out = null;
          this.game.audio.ui('ok');
          back();
        } else {
          this.subs(back);
        }
      },
      back: () => { st.out = null; back(); },
    }, () => { st.out = null; back(); }, true);
  }

  // ---------------------------------------------------- Resumen del partido

  /** Lista de mejores jugadas guardadas (se ven a cámara lenta). */
  highlights() {
    const g = this.game, m = g.match;
    const list = ((m && m.highlights) || []).map((h, i) => ({ h, i })).sort((a, b) => a.h.at - b.h.at);
    const nombreEq = (t) => (m && m.teams.find((x) => x === t) ? t.name : '');
    this.render('hl', `
      <header class="head"><span class="head-step">RESUMEN</span><h1>MEJORES JUGADAS</h1></header>
      <p class="mute sm car-sum">Reproducción a cámara lenta. ESPACIO o ENTER vuelve a esta lista.</p>
      <div class="pl-list">
        ${list.map(({ h, i }) => `<button class="pl-row pick" data-nav data-act="hPlay" data-arg="${i}">
          <span class="pl-pos">${h.minute}'</span><span class="pl-name">${esc(h.title)}</span>
          <span class="pl-club">${esc(nombreEq(h.team))}</span><span class="pl-ovr">${h.xg.toFixed(2)}</span><b class="check">▶</b></button>`).join('')
          || '<p class="pl-empty">No hay jugadas guardadas en este partido.</p>'}
      </div>
      <div class="report-btns car-foot"><button class="btn go" data-nav data-act="back" data-default>VOLVER AL RESUMEN</button></div>
    `, {
      hPlay: (i) => g.playHighlight(Number(i)),
      back: () => this.fullTime(),
    }, () => this.fullTime(), true);
  }

  /** Mapa de calor de un equipo entero o de un jugador. sel: 'T0', 'T1' o 'p<índice>'. */
  mapaDeCalor(sel = 'T0') {
    const g = this.game, m = g.match;
    this.state.heatSel = sel;
    const items = m.played.filter((p) => p.heat.some((v) => v > 0));
    const grid = new Float32Array(HEAT_W * HEAT_H);
    let titulo = '';
    const sumar = (arr) => { for (const p of arr) for (let i = 0; i < grid.length; i++) grid[i] += p.heat[i]; };
    if (sel === 'T0' || sel === 'T1') {
      const t = m.teams[sel === 'T0' ? 0 : 1];
      sumar(items.filter((p) => p.team === t));
      titulo = `${t.name} · equipo completo`;
    } else {
      const p = items[Number(sel.slice(1))];
      if (p) { sumar([p]); titulo = `${p.data.name} · ${p.team.name}`; }
    }
    const lista = (t) => items.filter((p) => p.team === t).map((p) => ({ p, idx: items.indexOf(p) }));
    const fila = ({ p, idx }) => `<button class="pl-row pick${sel === 'p' + idx ? ' on' : ''}" data-nav data-act="hSel" data-arg="p${idx}">
      <span class="pl-pos">${p.data.pos}</span><span class="pl-name">${esc(p.data.name)}</span><span class="pl-club">${esc(p.team.short)}</span>
      <span class="pl-ovr">${p.data.ovr}</span><b class="check">${sel === 'p' + idx ? '●' : ''}</b></button>`;
    this.render('heat', `
      <header class="head"><span class="head-step">RESUMEN</span><h1>MAPA DE CALOR</h1></header>
      <div class="heat">
        <div class="heat-l">
          <button class="btn${sel === 'T0' ? ' go' : ''}" data-nav data-act="hSel" data-arg="T0" data-default>${esc(m.teams[0].short)} · EQUIPO</button>
          <button class="btn${sel === 'T1' ? ' go' : ''}" data-nav data-act="hSel" data-arg="T1">${esc(m.teams[1].short)} · EQUIPO</button>
          <div class="pl-list small">${lista(m.teams[0]).map(fila).join('')}${lista(m.teams[1]).map(fila).join('')}</div>
        </div>
        <div class="heat-r">
          <canvas class="heat-cv" width="720" height="470"></canvas>
          <p class="mute sm">${esc(titulo)}</p>
        </div>
      </div>
      <div class="report-btns car-foot"><button class="btn" data-nav data-act="back">VOLVER AL RESUMEN</button></div>
    `, {
      hSel: (k) => this.mapaDeCalor(k),
      back: () => this.fullTime(),
    }, () => this.fullTime(), true);
    const cv = this.root.querySelector('.heat-cv');
    if (cv) this.dibujarCalor(cv, grid);
  }

  /** Dibuja el campo y el calor (la cuadrícula se suaviza al escalarla). */
  dibujarCalor(cv, grid) {
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height, pad = 14;
    ctx.fillStyle = '#1d6b35';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.06)';
      ctx.fillRect((i * w) / 10, 0, w / 10, h);
    }
    let max = 0;
    for (const v of grid) max = Math.max(max, v);
    const off = document.createElement('canvas');
    off.width = HEAT_W; off.height = HEAT_H;
    const oc = off.getContext('2d');
    const img = oc.createImageData(HEAT_W, HEAT_H);
    for (let i = 0; i < grid.length; i++) {
      const t = max ? grid[i] / max : 0;
      const [R, G, B] = rampaCalor(t);
      img.data[i * 4] = R; img.data[i * 4 + 1] = G; img.data[i * 4 + 2] = B;
      img.data[i * 4 + 3] = Math.round(255 * Math.min(1, t * 1.1));
    }
    oc.putImageData(img, 0, 0);
    ctx.save();
    ctx.filter = 'blur(12px)';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, pad, pad, w - pad * 2, h - pad * 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.beginPath(); ctx.moveTo(w / 2, pad); ctx.lineTo(w / 2, h - pad); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.16, 0, Math.PI * 2); ctx.stroke();
    const bd = (16.5 / 105) * (w - pad * 2), bw = (40.3 / 68) * (h - pad * 2);
    ctx.strokeRect(pad, h / 2 - bw / 2, bd, bw);
    ctx.strokeRect(w - pad - bd, h / 2 - bw / 2, bd, bw);
  }

  // ------------------------------------------------------------ Entrenamiento

  trainingMenu() {
    const st = this.state.train || (this.state.train = { kind: 'penalty', keeper: 3 });
    const modos = Object.entries(TRAINING);
    this.render('train', `
      <header class="head"><span class="head-step">ENTRENAMIENTO</span><h1>PRACTICAR</h1></header>
      <div class="pl-list small">
        ${modos.map(([k, t], i) => `<button class="pl-row pick${st.kind === k ? ' on' : ''}" data-nav data-act="tkind" data-arg="${k}" ${i === 0 ? 'data-default' : ''}>
          <span class="pl-pos"></span><span class="pl-name">${t.name}</span><span class="pl-club">${t.attempts} intentos</span><span class="pl-ovr"></span>
          <b class="check">${st.kind === k ? '✔' : ''}</b></button>`).join('')}
      </div>
      <p class="mute sm car-sum">${esc(TRAINING[st.kind].desc)}</p>
      <div class="row" data-nav data-adj="tkeep"><span class="row-l">PORTERO RIVAL</span>
        <span class="row-v"><button class="arrow sm" data-act="tkeep" data-arg="-1">◀</button><b>${KEEPER_LEVELS[st.keeper - 1]}</b><button class="arrow sm" data-act="tkeep" data-arg="1">▶</button></span></div>
      <div class="report-btns car-foot"><button class="btn go" data-nav data-act="tgo">EMPEZAR ▶</button><button class="btn" data-nav data-act="back">VOLVER</button></div>
      ${this.hint([['↑ ↓', 'Moverse'], ['← →', 'Ajustar'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      tkind: (k) => { st.kind = k; this.trainingMenu(); },
      tkeep: (d) => { st.keeper = Math.max(1, Math.min(KEEPER_LEVELS.length, st.keeper + Number(d))); this.trainingMenu(); },
      tgo: () => { this.game.audio.ui('ok'); this.game.startTraining(st.kind, st.keeper); },
      back: () => this.main(),
    }, () => this.main());
  }

  /** Resumen de una sesión de entrenamiento. */
  trainingEnd(s) {
    if (!s) { this.main(); return; }
    const ok = s.results.filter((r) => r.ok).length;
    this.render('trend', `
      <div class="report">
        <div class="report-tag">ENTRENAMIENTO · ${TRAINING[s.kind].name}</div>
        <h1 class="verdict">${ok} / ${s.total}</h1>
        <p class="mute">Portero rival: ${KEEPER_LEVELS[s.keeper - 1]}</p>
        <div class="tr-list">${s.results.map((r, i) => `<span class="${r.ok ? 'ok' : 'no'}">${i + 1}. ${esc(r.label)}</span>`).join('')}</div>
        <div class="report-btns">
          <button class="btn go" data-nav data-act="again" data-default>OTRO ENTRENAMIENTO</button>
          <button class="btn" data-nav data-act="menu">VOLVER AL MENÚ</button>
        </div>
      </div>`, {
      again: () => this.game.startTraining(s.kind, s.keeper),
      menu: () => this.main(),
    });
  }

  // ---------------------------------------------------------- Selecciones

  listaSelecciones() {
    this.state.lista = 'sel';
    const sure = this.state.confirmDel;
    const lst = TEAMS.filter((t) => t.seleccion);
    this.render('slist', `
      <header class="head"><span class="head-step">PERSONALIZAR</span><h1>SELECCIONES</h1></header>
      <div class="pl-top">${this.buscador('sel', 'Buscar selección')}<button class="btn go" data-nav data-act="sNew" data-default>CREAR SELECCIÓN ▶</button></div>
      <div class="pl-list">
        ${lst.map((t) => `
          <div class="pl-row" data-busca="${norm(t.name + ' ' + t.short)}">
            <img class="pl-crest" src="${crestURL(t, 48)}" alt="">
            <span class="pl-name">${esc(t.name)}${esSeleccionOriginal(t.id) ? '' : ' <i class="tag">PERSONALIZADA</i>'}</span>
            <span class="pl-club">${t.squad.length} jug.</span>
            <span class="pl-ovr">${t.ovr}</span>
            ${this.filaAcciones('s', t.id, sure === 's' + t.id)}
          </div>`).join('')}
        <p class="pl-empty" hidden>Ninguna selección coincide con la búsqueda.</p>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      sNew: () => this.editarClub(null, true),
      sEdit: (id) => this.editarClub(id, true),
      sDel: (id) => {
        if (this.state.confirmDel !== 's' + id) { this.state.confirmDel = 's' + id; this.listaSelecciones(); return; }
        this.state.confirmDel = null;
        borrarSeleccion(id);
        this.game.audio.ui('back');
        this.listaSelecciones();
      },
    }, () => this.personalizar(), true);
  }

  // ------------------------------------------------------------ Torneos

  torneosLista() {
    this.state.lista = 'torneo';
    const sure = this.state.confirmDel;
    const lst = torneos();
    this.render('tlist', `
      <header class="head"><span class="head-step">PERSONALIZAR</span><h1>TORNEOS</h1></header>
      <div class="pl-top">${this.buscador('torneo', 'Buscar torneo')}<button class="btn go" data-nav data-act="tNew" data-default>CREAR TORNEO ▶</button></div>
      <div class="pl-list">
        ${lst.map((t) => `
          <div class="pl-row" data-busca="${norm(t.nombre + ' ' + t.tipo)}">
            ${t.logo ? `<img class="pl-crest" src="${t.logo}" alt="">` : `<span class="pl-crest ico-liga">${ICONO.torneo}</span>`}
            <span class="pl-name">${esc(t.nombre)}</span>
            <span class="pl-club">${t.tipo === 'clubes' ? 'CLUBES' : 'SELECC.'} · ${t.n}</span>
            <span class="pl-ovr">${t.simulado ? 'JUGADO' : t.formato === 'grupos' ? 'GRUPOS' : 'ELIM.'}</span>
            <span class="tp-acc"><button class="btn" data-nav data-act="tVer" data-arg="${t.id}">VER</button><button class="ico del${sure === 't' + t.id ? ' sure' : ''}" data-nav data-act="tDel" data-arg="${t.id}" aria-label="Borrar">${sure === 't' + t.id ? '¿BORRAR?' : ICONO.borrar}</button></span>
          </div>`).join('')}
        <p class="pl-empty" hidden>Ningún torneo coincide con la búsqueda.</p>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      tNew: () => this.tNew(),
      tVer: (id) => this.tVer(id),
      tDel: (id) => {
        if (this.state.confirmDel !== 't' + id) { this.state.confirmDel = 't' + id; this.torneosLista(); return; }
        this.state.confirmDel = null;
        borrarTorneo(id);
        this.game.audio.ui('back');
        this.torneosLista();
      },
    }, () => this.personalizar(), true);
  }

  /** Equipos de la fuente elegida: ligas (clubes) o selecciones. */
  tFuentes() {
    const d = this.state.tDraft;
    if (d.tipo === 'selecciones') {
      return TEAMS.filter((t) => t.seleccion).map((t) => ({ id: t.id, nombre: t.name, clubes: [t.id], info: `${t.squad.length} jug.` }));
    }
    // Solo las ligas europeas pueden dar cupos (no la liga original, la argentina ni la brasileña)
    return ligas()
      .filter((l) => LIGAS_EUROPEAS.includes(l.id))
      .map((l) => ({ id: l.id, nombre: l.nombre, clubes: l.clubes.filter((id) => TEAMS.some((t) => t.id === id && !t.seleccion)) }))
      .filter((f) => f.clubes.length)
      .map((f) => ({ ...f, info: `${f.clubes.length} clubes` }));
  }

  /** Clubes distintos disponibles entre las fuentes elegidas. */
  tDisponibles() {
    const d = this.state.tDraft;
    const set = new Set();
    for (const f of this.tFuentes()) if (d.fuentes.includes(f.id)) for (const c of f.clubes) set.add(c);
    return set.size;
  }

  ovrDe(id) { const t = TEAMS.find((x) => x.id === id); return t ? t.ovr : 50; }
  ordenarPorOvr(ids) { return [...ids].sort((a, b) => this.ovrDe(b) - this.ovrDe(a)); }
  nombreDe(id) { const t = TEAMS.find((x) => x.id === id); return t ? t.name : '(eliminado)'; }

  tNew() {
    this.state.tDraft = { paso: 'tipo', tipo: null, nombre: '', logo: null, fuentes: [], n: 8, cupos: {}, formato: null, g: 0, k: 0 };
    this.state.tMsg = '';
    this.tPaso();
  }

  tPaso() {
    const paso = this.state.tDraft.paso;
    ({ tipo: () => this.tPasoTipo(), datos: () => this.tPasoDatos(), fuentes: () => this.tPasoFuentes(),
      n: () => this.tPasoN(), cupos: () => this.tPasoCupos(), formato: () => this.tPasoFormato(),
      resumen: () => this.tPasoResumen() })[paso]();
  }

  tIr(paso) { this.state.tDraft.paso = paso; this.state.tMsg = ''; this.tPaso(); }

  tAtras() {
    const d = this.state.tDraft;
    const prev = { tipo: null, datos: 'tipo', fuentes: 'datos', n: 'fuentes', cupos: 'n',
      formato: d.tipo === 'clubes' ? 'cupos' : 'fuentes', resumen: 'formato' }[d.paso];
    if (!prev) { this.state.tDraft = null; this.torneosLista(); return; }
    this.tIr(prev);
  }

  tRender(titulo, cuerpo, acciones) {
    this.render('tedit', `
      <header class="head"><span class="head-step">PERSONALIZAR · TORNEO</span><h1>${titulo}</h1></header>
      <div class="tb-wrap">${cuerpo}</div>
      ${this.state.tMsg ? `<p class="car-msg">${esc(this.state.tMsg)}</p>` : ''}
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['← →', 'Ajustar'], ['ESC', 'Atrás']])}
    `, acciones, () => this.tAtras(), true);
  }

  tPasoTipo() {
    this.tRender('TIPO DE TORNEO', `
      <div class="pe-btns">
        <button class="btn go" data-nav data-act="tTipo" data-arg="clubes" data-default>CLUBES · con ligas</button>
        <button class="btn go" data-nav data-act="tTipo" data-arg="selecciones">SELECCIONES</button>
      </div>
      <p class="mute sm">En un torneo de clubes eliges ligas y repartes los cupos entre ellas. En uno de selecciones eliges las selecciones directamente.</p>
    `, {
      tTipo: (tipo) => { const d = this.state.tDraft; d.tipo = tipo; d.fuentes = []; d.cupos = {}; this.tIr('datos'); },
    });
  }

  tPasoDatos() {
    const d = this.state.tDraft;
    this.tRender('NOMBRE Y LOGO', `
      <label class="car-field"><span>NOMBRE DEL TORNEO</span>
        <input class="car-input" type="text" maxlength="32" autocomplete="off" value="${esc(d.nombre)}" placeholder="Copa Golpe Franco" data-input="tnombre"></label>
      <div class="logo-box">
        ${d.logo ? `<img class="logo-prev" src="${d.logo}" alt="">` : `<span class="logo-prev ico-liga">${ICONO.torneo}</span>`}
        <div class="logo-btns">
          <button class="btn" data-nav data-act="tPickLogo">SUBIR LOGO PNG</button>
          ${d.logo ? '<button class="btn" data-nav data-act="tClearLogo">QUITAR LOGO</button>' : ''}
        </div>
        <input type="file" accept="image/png" id="tlogo-file" data-change="tLogo" hidden>
      </div>
      <div class="pe-btns"><button class="btn go" data-nav data-act="tOk" data-default>CONTINUAR ▶</button></div>
    `, {
      tnombre: (v) => { d.nombre = v; },
      tPickLogo: () => { const f = this.root.querySelector('#tlogo-file'); if (f) f.click(); },
      tClearLogo: () => { d.logo = null; this.tPasoDatos(); },
      tLogo: (file) => {
        if (!file) return;
        leerLogo(file).then((url) => { d.logo = url; this.state.tMsg = ''; this.tPasoDatos(); })
          .catch((err) => { this.state.tMsg = err.message; this.tPasoDatos(); });
      },
      tOk: () => {
        if (!d.nombre.trim()) { this.state.tMsg = 'Escribe un nombre para el torneo.'; this.tPasoDatos(); return; }
        d.nombre = d.nombre.trim();
        this.tIr('fuentes');
      },
    });
  }

  tPasoFuentes() {
    const d = this.state.tDraft;
    const fuentes = this.tFuentes();
    const titulo = d.tipo === 'clubes' ? 'LIGAS PARTICIPANTES' : 'SELECCIONES PARTICIPANTES';
    this.tRender(titulo, `
      <p class="mute sm">${d.fuentes.length} seleccionadas${d.tipo === 'clubes' ? ` · ${this.tDisponibles()} clubes distintos` : ''}. Marca al menos ${d.tipo === 'clubes' ? 'una liga' : 'cuatro selecciones'}.</p>
      <div class="pl-list">
        ${fuentes.map((f, i) => {
          const on = d.fuentes.includes(f.id);
          return `<button class="pl-row pick${on ? ' on' : ''}" data-nav data-act="tf" data-arg="${f.id}" ${i === 0 ? 'data-default' : ''}>
            <span class="pl-pos">${String(i + 1).padStart(2, '0')}</span><span class="pl-name">${esc(f.nombre)}</span>
            <span class="pl-club">${esc(f.info)}</span><span class="pl-ovr"></span><b class="check">${on ? '✔' : ''}</b></button>`;
        }).join('') || '<p class="pl-empty">No hay ligas con clubes todavía.</p>'}
      </div>
      <div class="pe-btns"><button class="btn go" data-nav data-act="tOk">CONTINUAR ▶</button></div>
    `, {
      tf: (id) => {
        const i = d.fuentes.indexOf(id);
        if (i >= 0) d.fuentes.splice(i, 1); else d.fuentes.push(id);
        d.cupos = {};
        this.tPasoFuentes();
      },
      tOk: () => {
        const minimo = d.tipo === 'clubes' ? 1 : 4;
        if (d.tipo === 'clubes' && this.tDisponibles() < 4) { this.state.tMsg = 'Las ligas elegidas necesitan al menos 4 clubes en total.'; this.tPasoFuentes(); return; }
        if (d.tipo === 'selecciones' && d.fuentes.length < minimo) { this.state.tMsg = 'Elige al menos 4 selecciones.'; this.tPasoFuentes(); return; }
        this.state.tMsg = '';
        if (d.tipo === 'clubes') this.tIr('n');
        else { d.n = d.fuentes.length; this.tIr('formato'); }
      },
    });
  }

  tPasoN() {
    const d = this.state.tDraft;
    const disp = this.tDisponibles();
    const opciones = [4, 6, 8, 12, 16, 24, 32].filter((v) => v <= disp);
    this.tRender('NÚMERO DE CLUBES', `
      <p class="mute sm">Hay ${disp} clubes distintos disponibles en las ligas elegidas.</p>
      <div class="pl-list">
        ${opciones.map((v, i) => `<button class="pl-row pick${d.n === v ? ' on' : ''}" data-nav data-act="tn" data-arg="${v}" ${i === 0 ? 'data-default' : ''}>
            <span class="pl-pos"></span><span class="pl-name">${v} clubes</span><span class="pl-club"></span><span class="pl-ovr"></span><b class="check">${d.n === v ? '✔' : ''}</b></button>`).join('')}
      </div>
      <div class="pe-btns"><button class="btn go" data-nav data-act="tOk">CONTINUAR ▶</button></div>
    `, {
      tn: (v) => { d.n = Number(v); d.cupos = {}; this.tPasoN(); },
      tOk: () => {
        if (d.n > disp) { this.state.tMsg = 'Elige un número de clubes que quepa en las ligas.'; this.tPasoN(); return; }
        this.tIr('cupos');
      },
    });
  }

  tPasoCupos() {
    const d = this.state.tDraft;
    const fuentes = this.tFuentes().filter((f) => d.fuentes.includes(f.id));
    // Solo se reparte solo la primera vez; después se respetan los cambios del jugador (◀ ▶)
    if (!Object.keys(d.cupos).length) {
      d.cupos = repartirCupos(d.n, fuentes.map((f) => ({ id: f.id, disponibles: f.clubes.length })));
    }
    const suma = fuentes.reduce((s, f) => s + (d.cupos[f.id] || 0), 0);
    this.tRender('REPARTIR CUPOS', `
      <p class="mute sm">Cupos de ${d.n} clubes. Usa ◀ ▶ en cada liga. Total: <b>${suma} / ${d.n}</b>.</p>
      <div class="pl-list">
        ${fuentes.map((f, i) => `
          <div class="row" data-nav data-adj="tcq" data-id="${f.id}" ${i === 0 ? 'data-default' : ''}>
            <span class="row-l">${esc(f.nombre)} <small class="mute">(${f.clubes.length} clubes)</small></span>
            <span class="row-v"><button class="arrow sm" data-act="tcq" data-arg="-1" data-id="${f.id}">◀</button><b>${d.cupos[f.id] || 0}</b><button class="arrow sm" data-act="tcq" data-arg="1" data-id="${f.id}">▶</button></span>
          </div>`).join('')}
      </div>
      <div class="pe-btns"><button class="btn" data-nav data-act="tRepartir">REPARTIR AUTOMÁTICO</button><button class="btn go" data-nav data-act="tOk">CONTINUAR ▶</button></div>
    `, {
      tcq: (dir, el) => {
        const id = el.dataset.id;
        const sum = fuentes.reduce((s, f) => s + (d.cupos[f.id] || 0), 0);
        const f = fuentes.find((x) => x.id === id);
        if (!f) return;
        if (dir > 0 && sum < d.n && (d.cupos[id] || 0) < f.clubes.length) d.cupos[id] = (d.cupos[id] || 0) + 1;
        if (dir < 0 && (d.cupos[id] || 0) > 0) d.cupos[id] -= 1;
        this.tPasoCupos();
      },
      tRepartir: () => { d.cupos = repartirCupos(d.n, fuentes.map((f) => ({ id: f.id, disponibles: f.clubes.length }))); this.tPasoCupos(); },
      tOk: () => {
        if (suma !== d.n) { this.state.tMsg = `Los cupos suman ${suma} y tienen que sumar ${d.n}.`; this.tPasoCupos(); return; }
        this.state.tMsg = '';
        this.tIr('formato');
      },
    });
  }

  tPasoFormato() {
    const d = this.state.tDraft;
    const opciones = [];
    if (eliminatoriaValida(d.n)) opciones.push({ formato: 'eliminatoria', g: 0, k: 0, texto: 'ELIMINATORIA DIRECTA', sub: `${d.n} equipos, cruces desde la primera ronda` });
    for (const o of opcionesGrupos(d.n)) {
      opciones.push({
        formato: 'grupos', g: o.g, k: o.k,
        texto: `GRUPOS + ELIMINATORIA · ${o.g} grupos de ${o.gs}`,
        sub: `Pasan ${o.pasan}: los 2 primeros de cada grupo${o.k ? ` y los ${o.k} mejores terceros` : ''}`,
      });
    }
    this.tRender('FORMATO', `
      <p class="mute sm">Formatos válidos para ${d.n} participantes.</p>
      <div class="pl-list">
        ${opciones.map((o, i) => `<button class="pl-row" data-nav data-act="tfmt" data-arg="${i}" ${i === 0 ? 'data-default' : ''} style="grid-template-columns:minmax(0,1fr)">
            <span class="tp-row"><span></span><span><span class="pl-name">${o.texto}</span><br><small>${o.sub}</small></span><span></span></span></button>`).join('')
          || '<p class="pl-empty">Con este número de participantes no hay formato válido. Vuelve atrás y cambia los cupos.</p>'}
      </div>
    `, {
      tfmt: (i) => {
        const o = opciones[Number(i)];
        if (!o) return;
        d.formato = o.formato; d.g = o.g; d.k = o.k;
        this.tIr('resumen');
      },
    });
  }

  tPasoResumen() {
    const d = this.state.tDraft;
    const fuentes = this.tFuentes().filter((f) => d.fuentes.includes(f.id));
    const formato = d.formato === 'grupos' ? `${d.g} grupos de ${d.n / d.g} + eliminatoria` : 'eliminatoria directa';
    this.tRender('RESUMEN', `
      <div class="modal" style="margin:0;max-width:none;width:100%">
        <div class="modal-tag">${d.tipo === 'clubes' ? 'CLUBES' : 'SELECCIONES'}</div>
        <h2>${esc(d.nombre)}</h2>
        <p>${d.n} participantes · ${formato}</p>
        ${d.tipo === 'clubes' ? `<p class="mute">${fuentes.map((f) => `${esc(f.nombre)}: ${d.cupos[f.id] || 0}`).join(' · ')}</p>` : ''}
      </div>
      <div class="pe-btns"><button class="btn go" data-nav data-act="tCrear" data-default>CREAR TORNEO</button></div>
    `, {
      tCrear: () => this.tCrear(),
    });
  }

  tCrear() {
    const d = this.state.tDraft;
    const fuentes = this.tFuentes().filter((f) => d.fuentes.includes(f.id));
    let ids = [];
    let error = '';
    if (d.tipo === 'clubes') {
      const usados = new Set();
      for (const f of fuentes) {
        const c = d.cupos[f.id] || 0;
        if (!c) continue;
        const tomados = this.ordenarPorOvr(f.clubes).filter((id) => !usados.has(id)).slice(0, c);
        if (tomados.length < c) error = 'Hay clubes repetidos entre las ligas elegidas. Reduce los cupos de alguna.';
        tomados.forEach((id) => usados.add(id));
        ids.push(...tomados);
      }
    } else {
      ids = fuentes.map((f) => f.id);
    }
    if (!error && ids.length !== d.n) error = 'No hay suficientes equipos para completar los cupos.';
    if (error) { this.state.tMsg = error; this.tPaso(); return; }
    const t = crearTorneo({
      nombre: d.nombre, logo: d.logo, tipo: d.tipo, formato: d.formato, n: d.n,
      fuentes: d.fuentes, cupos: d.cupos, g: d.g, k: d.k,
    }, this.ordenarPorOvr(ids));
    guardarTorneo(t);
    this.state.tDraft = null;
    this.state.tMsg = '';
    this.game.audio.ui('ok');
    this.tVer(t.id);
  }

  tVer(id) {
    const t = torneos().find((x) => x.id === id);
    if (!t) { this.torneosLista(); return; }
    const partido = (p) => {
      const res = p.gl == null ? '–' : `${p.gl} – ${p.gv}`;
      return `<div class="tb-m"><div><span>${esc(this.nombreDe(p.a))}</span><b>${res}</b><span>${esc(this.nombreDe(p.b))}</span></div></div>`;
    };
    const tbMatch = (p) => `<div class="tb-m">
        <div class="${p.ganador === p.a ? 'win' : ''}"><span>${esc(this.nombreDe(p.a))}</span><b>${p.ga == null ? '–' : p.ga}</b></div>
        <div class="${p.ganador === p.b ? 'win' : ''}"><span>${esc(this.nombreDe(p.b))}</span><b>${p.gb == null ? '–' : p.gb}${p.penaltis ? ' p.' : ''}</b></div>
      </div>`;
    let cuerpo = '';
    if (t.grupos) {
      cuerpo += `<div class="tb-groups">${t.grupos.map((gr) => {
        const tb = tablaGrupo(gr);
        return `<div class="tb-table"><h4>GRUPO ${gr.nombre}</h4>
          <table><tr><th></th><th>EQUIPO</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>PTS</th></tr>
          ${tb.map((r, i) => `<tr class="${i < 2 ? 'q' : ''}"><td>${i + 1}</td><td>${esc(this.nombreDe(r.id))}</td><td>${r.pj}</td><td>${r.g}</td><td>${r.e}</td><td>${r.p}</td><td>${r.gf}</td><td>${r.gc}</td><td>${r.pts}</td></tr>`).join('')}
          </table>
          <div class="tb-res">${gr.partidos.map(partido).join('')}</div></div>`;
      }).join('')}</div>`;
    }
    if (t.rondas && t.rondas.length) {
      cuerpo += `<div class="tb-rounds">${t.rondas.map((r) => `<div class="tb-round"><h4>${esc(r.nombre.toUpperCase())}</h4>${r.partidos.map(tbMatch).join('')}</div>`).join('')}</div>`;
    }
    if (t.campeon) cuerpo += `<div class="tb-champ">CAMPEÓN · ${esc(this.nombreDe(t.campeon))}</div>`;
    const formato = t.formato === 'grupos' ? `${t.g} grupos + eliminatoria` : 'Eliminatoria directa';
    this.render('tver', `
      <header class="head"><span class="head-step">TORNEO · ${t.tipo === 'clubes' ? 'CLUBES' : 'SELECCIONES'} · ${t.n} EQUIPOS</span><h1>${esc(t.nombre)}</h1></header>
      <p class="mute sm">${formato}</p>
      <div class="tb-wrap">
        ${cuerpo || '<p class="mute">Aún no hay resultados. Simula el torneo para ver los partidos.</p>'}
        <div class="tb-actions">
          <button class="btn go" data-nav data-act="tSim" data-arg="${t.id}" data-default>${t.simulado ? 'VOLVER A SIMULAR' : 'SIMULAR TORNEO'}</button>
          <button class="btn" data-nav data-act="back">VOLVER</button>
        </div>
      </div>
      ${this.hint([['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      tSim: (tid) => {
        const x = torneos().find((q) => q.id === tid);
        if (!x) return;
        simularTorneo(x, (tid2) => this.ovrDe(tid2));
        guardarTorneo(x);
        this.game.audio.ui('ok');
        this.tVer(tid);
      },
      back: () => this.torneosLista(),
    }, () => this.torneosLista(), true);
  }

  listaLigas() {
    this.state.lista = 'liga';
    const sure = this.state.confirmDel;
    const lst = ligas();
    this.render('llist', `
      <header class="head"><span class="head-step">PERSONALIZAR</span><h1>LIGAS</h1></header>
      <div class="pl-top">${this.buscador('liga', 'Buscar liga')}<button class="btn go" data-nav data-act="lNew" data-default>CREAR LIGA ▶</button></div>
      <div class="pl-list">
        ${lst.map((l) => `
          <div class="pl-row" data-busca="${norm(l.nombre)}">
            ${l.logo ? `<img class="pl-crest" src="${l.logo}" alt="">` : `<span class="pl-crest ico-liga">${ICONO.liga}</span>`}
            <span class="pl-name">${esc(l.nombre)}${l.original ? ' <i class="tag">ORIGINAL</i>' : ''}</span>
            <span class="pl-club">${l.clubes.length} clubes</span>
            ${l.original ? `<button class="ico" data-nav data-act="lEdit" data-arg="${l.id}" aria-label="Editar nombre y logo">${ICONO.editar}</button>` : this.filaAcciones('l', l.id, sure === 'l' + l.id)}
          </div>`).join('')}
        <p class="pl-empty" hidden>Ninguna liga coincide con la búsqueda.</p>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      lNew: () => this.editarLiga(null),
      lEdit: (id) => this.editarLiga(id),
      lDel: (id) => {
        if (this.state.confirmDel !== 'l' + id) { this.state.confirmDel = 'l' + id; this.listaLigas(); return; }
        this.state.confirmDel = null;
        borrarLiga(id);
        this.game.audio.ui('back');
        this.listaLigas();
      },
    }, () => this.personalizar(), true);
  }

  editarLiga(id) {
    if (!this.state.lDraft || this.state.lDraft.id !== (id || null)) {
      const l = id ? ligas().find((x) => x.id === id) : null;
      this.state.lDraft = l ? { id, nombre: l.nombre, logo: l.logo, clubes: [...l.clubes], original: !!l.original } : { id: null, nombre: '', logo: null, clubes: [] };
      this.state.lMsg = '';
    }
    this.lRender();
  }

  lRender() {
    const d = this.state.lDraft;
    this.render('ledit', `
      <header class="head"><span class="head-step">PERSONALIZAR · LIGA</span><h1>${d.id ? 'EDITAR LIGA' : 'NUEVA LIGA'}</h1></header>
      <div class="pe-wrap">
        <div class="pe-col">
          <label class="car-field"><span>NOMBRE DE LA LIGA</span>
            <input class="car-input" type="text" maxlength="30" autocomplete="off" value="${esc(d.nombre)}" placeholder="Nombre de la liga" data-input="lname"></label>
          <div class="logo-box">
            ${d.logo ? `<img class="logo-prev" src="${d.logo}" alt="">` : `<span class="logo-prev ico-liga big">${ICONO.liga}</span>`}
            <div class="logo-btns">
              <button class="btn" data-nav data-act="lPickLogo">SUBIR LOGO PNG</button>
              ${d.logo ? '<button class="btn" data-nav data-act="lClearLogo">QUITAR LOGO</button>' : ''}
            </div>
            <input type="file" accept="image/png" id="logo-file" data-change="lLogoFile" hidden>
          </div>
          <p class="mute sm">${d.clubes.length} clubes · mínimo ${MIN_CLUBES_LIGA}.</p>
          ${this.state.lMsg ? `<p class="car-msg">${esc(this.state.lMsg)}</p>` : ''}
          <div class="pe-btns">
            <button class="btn go" data-nav data-act="lSave">GUARDAR LIGA</button>
            <button class="btn" data-nav data-act="back">CANCELAR</button>
          </div>
        </div>
        <div class="pe-col">${d.original ? '<p class="mute">Las ligas originales conservan sus clubes: aquí solo cambias su nombre y su logo.</p>' : `
          <h3>CLUBES AFILIADOS</h3>
          <div class="pl-list small">
            ${TEAMS.filter((t) => !t.seleccion).map((t) => {
              const on = d.clubes.includes(t.id);
              return `<button class="pl-row pick${on ? ' on' : ''}" data-nav data-act="lc" data-arg="${t.id}">
                <img class="pl-crest" src="${crestURL(t, 40)}" alt=""><span class="pl-name">${esc(t.name)}</span><b class="check">${on ? '✔' : ''}</b></button>`;
            }).join('')}
          </div>
        `}</div>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Marcar'], ['ESC', 'Cancelar']])}
    `, {
      lname: (v) => { d.nombre = v; },
      lPickLogo: () => { const f = this.root.querySelector('#logo-file'); if (f) f.click(); },
      lLogoFile: (file) => {
        if (!file) return;
        leerLogo(file).then((url) => { d.logo = url; this.state.lMsg = ''; this.lRender(); })
          .catch((err) => { this.state.lMsg = err.message; this.lRender(); });
      },
      lClearLogo: () => { d.logo = null; this.lRender(); },
      lc: (cid) => {
        const i = d.clubes.indexOf(cid);
        if (i >= 0) d.clubes.splice(i, 1); else d.clubes.push(cid);
        this.lRender();
      },
      lSave: () => {
        if (!d.nombre.trim()) { this.state.lMsg = 'Escribe un nombre para la liga.'; this.lRender(); return; }
        if (!d.original && d.clubes.length < MIN_CLUBES_LIGA) { this.state.lMsg = `Una liga necesita al menos ${MIN_CLUBES_LIGA} clubes.`; this.lRender(); return; }
        if (d.original) guardarLigaOriginal(d.id, d); else guardarLiga(d, d.id);
        this.state.lDraft = null; this.state.lMsg = '';
        this.game.audio.ui('ok');
        this.listaLigas();
      },
      back: () => { this.state.lDraft = null; this.state.lMsg = ''; this.listaLigas(); },
    }, () => { this.state.lDraft = null; this.state.lMsg = ''; this.listaLigas(); }, true);
  }

  // ----------------------------------------------------------- Modo carrera
  careerMenu() {
    this.render('carmenu', `
      <header class="head"><h1>MODO CARRERA</h1></header>
      <nav class="menu compact">
        <button class="mi" data-nav data-act="careerSlots" data-arg="jugador" data-default>
          <span class="mi-n">01</span><span class="mi-t">MODO CARRERA JUGADOR</span>
          <span class="mi-d">Creas a tu futbolista, repartes sus atributos y mejoras ganando partidos.</span></button>
        <button class="mi" data-nav data-act="careerSlots" data-arg="dt">
          <span class="mi-n">02</span><span class="mi-t">MODO CARRERA DT</span>
          <span class="mi-d">Diriges al club: presupuesto, mercado de fichajes y lesiones. Puedes jugar cualquier partido.</span></button>
      </nav>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      careerSlots: (modo) => { this.game.audio.ui('ok'); this.careerSlots(modo); },
    }, () => this.main());
  }

  careerSlots(modo) {
    this.state.carMode = modo;
    const list = Object.values(listarCarreras())
      .filter((c) => c.modo === modo)
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const label = modo === 'dt' ? 'DT' : 'JUGADOR';
    this.render('carslots', `
      <header class="head"><span class="head-step">${label}</span><h1>CARRERAS</h1></header>
      <div class="car-list">
        ${list.length ? list.map((c, i) => {
          const club = getTeam(c.clubId);
          return `<div class="car-row">
            <button class="car-main" data-nav data-act="careerLoad" data-arg="${c.id}" ${i === 0 ? 'data-default' : ''}>
              <img class="car-crest" src="${crestURL(club, 96)}" alt="">
              <span class="car-txt"><b>${esc(c.nombre)}${c.jugador ? ' · ' + c.jugador.pos : ''}</b><small>${esc(club.name)} · Temporada ${c.temporada} · Jornada ${Math.min(c.jornada + 1, c.calendario.length)}/${c.calendario.length}</small></span>
            </button>
            <button class="car-del" data-nav data-act="careerDel" data-arg="${c.id}" aria-label="Borrar carrera">BORRAR</button>
          </div>`;
        }).join('') : '<p class="mute">Todavía no tienes carreras en este modo.</p>'}
        <button class="btn go" data-nav data-act="careerNew" ${list.length ? '' : 'data-default'}>CARRERA NUEVA ▶</button>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      careerLoad: (id) => { this.game.audio.ui('ok'); this.careerHub(id); },
      careerDel: (id) => { borrarCarrera(id); this.careerSlots(this.state.carMode); },
      careerNew: () => {
        this.game.audio.ui('ok');
        this.state.careerDraft = { nombre: '', idx: 0, pos: 1, attrs: null, pool: PUNTOS_INICIALES };
        this.careerNew(this.state.carMode);
      },
    }, () => this.careerMenu(), true);
  }

  careerNew(modo) {
    if (modo === 'dt') { this.careerNewDT(); return; }
    this.pararPreviewDT();
    const d = this.state.careerDraft || (this.state.careerDraft = { nombre: '', liga: 0, idx: 0, pos: 1, attrs: null, pool: PUNTOS_INICIALES });
    if (modo === 'dt') {
      d.edad = d.edad || 45;
      d.aspecto = d.aspecto || { skin: COLORES_PIEL[1], hair: COLORES_PELO[0], hairStyle: 0, height: 1 };
      d.incl = d.incl || [];
    }
    const lista = ligas();
    d.liga = Math.min(d.liga || 0, lista.length - 1);
    const liga = lista[d.liga];
    const clubes = liga.clubes.map((id) => getTeam(id));
    d.idx = Math.min(d.idx || 0, Math.max(0, clubes.length - 1));
    const t = clubes[d.idx];
    d.clubId = t.id;
    d.ligaId = liga.id;
    const label = modo === 'dt' ? 'DT' : 'JUGADOR';
    const on = (x) => (d.incl || []).includes(x);
    const dtSeccion = modo !== 'dt' ? '' : `
      <div class="dt-new">
        <div class="dt-new-col">
          <h3>TU ENTRENADOR</h3>
          <canvas class="dt-prev" width="260" height="320"></canvas>
          <div class="row" data-nav data-adj="dtEdad"><span class="row-l">EDAD</span><span class="row-v"><button class="arrow sm" data-act="dtEdad" data-arg="-1">◀</button><b>${d.edad} años</b><button class="arrow sm" data-act="dtEdad" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="dtPiel"><span class="row-l">PIEL</span><span class="row-v"><button class="arrow sm" data-act="dtPiel" data-arg="-1">◀</button><i class="sw on" style="background:${d.aspecto.skin}"></i><button class="arrow sm" data-act="dtPiel" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="dtPelo"><span class="row-l">PELO</span><span class="row-v"><button class="arrow sm" data-act="dtPelo" data-arg="-1">◀</button><i class="sw on" style="background:${d.aspecto.hair}"></i><button class="arrow sm" data-act="dtPelo" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="dtPeinado"><span class="row-l">PEINADO</span><span class="row-v"><button class="arrow sm" data-act="dtPeinado" data-arg="-1">◀</button><b>${d.aspecto.hairStyle + 1}</b><button class="arrow sm" data-act="dtPeinado" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="dtAltura"><span class="row-l">ALTURA</span><span class="row-v"><button class="arrow sm" data-act="dtAltura" data-arg="-1">◀</button><b>${d.aspecto.height.toFixed(2)}</b><button class="arrow sm" data-act="dtAltura" data-arg="1">▶</button></span></div>
        </div>
        <div class="dt-new-col">
          <h3>LIGAS INCLUIDAS EN EL MUNDO</h3>
          <p class="mute sm">Tu liga (${esc(liga.nombre)}) siempre está incluida. Los clubes de las ligas que marques aparecen en el mercado y en las ofertas. La UEFA Champions League juega con todas las ligas.</p>
          <div class="dt-ligas">
            ${lista.filter((x) => x.id !== liga.id).map((x) => `<button class="btn${on(x.id) ? ' go' : ''}" data-nav data-act="dtLiga" data-arg="${x.id}">${on(x.id) ? '✔ ' : ''}${esc(x.nombre)} · ${x.clubes.length}</button>`).join('')}
          </div>
        </div>
      </div>`;
    this.render('carnew', `
      <header class="head"><span class="head-step">${label}</span><h1>CARRERA NUEVA</h1></header>
      <div class="car-new">
        <label class="car-field"><span>${modo === 'dt' ? 'NOMBRE DEL ENTRENADOR' : 'NOMBRE DEL JUGADOR'}</span>
          <input class="car-input" type="text" maxlength="24" autocomplete="off" value="${esc(d.nombre)}" placeholder="Escribe un nombre" data-input="cname"></label>
        <div class="team-pick car-club" data-nav data-adj="cliga" data-default>
          <button class="arrow" data-act="cliga" data-arg="-1" aria-label="Liga anterior">◀</button>
          <div class="team-id">
            ${liga.logo ? `<img class="crest" src="${liga.logo}" alt="">` : `<span class="crest ico-liga big">${ICONO.liga}</span>`}
            <h2>${esc(liga.nombre)}</h2>
            <p>${liga.clubes.length} clubes · liga de la tabla</p>
          </div>
          <button class="arrow" data-act="cliga" data-arg="1" aria-label="Liga siguiente">▶</button>
        </div>
        <div class="team-pick car-club" data-nav data-adj="cclub">
          <button class="arrow" data-act="cclub" data-arg="-1" aria-label="Club anterior">◀</button>
          <div class="team-id">
            <img class="crest" src="${crestURL(t, 200)}" alt="">
            <h2>${esc(t.name)}</h2>
            <p>${esc(t.tagline)}</p>
          </div>
          <button class="arrow" data-act="cclub" data-arg="1" aria-label="Club siguiente">▶</button>
        </div>
        <div class="team-ovr"><b>${t.ovr}</b><span>MEDIA</span></div>
        <div class="stats">${bar('ATAQUE', t.att)}${bar('MEDIO', t.mid)}${bar('DEFENSA', t.def)}</div>
        ${dtSeccion}
        <button class="btn go" data-nav data-act="cstart">${modo === 'dt' ? 'EMPEZAR CARRERA ▶' : 'SIGUIENTE: TU JUGADOR ▶'}</button>
      </div>
      ${this.hint([['← →', 'Cambiar'], ['ENTER', 'Continuar'], ['ESC', 'Volver']])}
    `, {
      cliga: (dir) => { d.liga = (d.liga + Number(dir) + lista.length) % lista.length; d.idx = 0; this.careerNew(modo); },
      cclub: (dir) => { d.idx = (d.idx + Number(dir) + clubes.length) % clubes.length; this.careerNew(modo); },
      // Escribir no vuelve a dibujar la pantalla (así no se pierde el foco del campo)
      cname: (v) => { d.nombre = v; },
      dtEdad: (dir) => { d.edad = clamp(d.edad + Number(dir), 25, 70); this.careerNew(modo); },
      dtPiel: (dir) => { d.aspecto.skin = cyc(COLORES_PIEL, d.aspecto.skin, Number(dir)); this.careerNew(modo); },
      dtPelo: (dir) => { d.aspecto.hair = cyc(COLORES_PELO, d.aspecto.hair, Number(dir)); this.careerNew(modo); },
      dtPeinado: (dir) => { d.aspecto.hairStyle = (d.aspecto.hairStyle + Number(dir) + 4) % 4; this.careerNew(modo); },
      dtAltura: (dir) => { d.aspecto.height = cyc(ALTURAS, d.aspecto.height, Number(dir)); this.careerNew(modo); },
      dtLiga: (id) => { d.incl = on(id) ? d.incl.filter((x) => x !== id) : [...d.incl, id]; this.careerNew(modo); },
      cstart: () => {
        this.game.audio.ui('ok');
        if (modo === 'jugador') { this.careerPlayer(modo); return; }
        const incl = (d.incl || []).filter((x) => x !== liga.id);
        const mundo = [...liga.clubes, ...lista.filter((x) => incl.includes(x.id)).flatMap((x) => x.clubes)];
        const c = crearCarrera({
          nombre: d.nombre, modo, clubId: d.clubId, clubes: liga.clubes, ligaId: liga.id, ligaNombre: liga.nombre,
          mundo, dt: { edad: d.edad, aspecto: { ...d.aspecto }, ligas: [liga.id, ...incl] },
        });
        guardarCarrera(c);
        this.state.careerDraft = null;
        this.pararPreviewDT();
        this.careerHub(c.id);
      },
    }, () => { this.pararPreviewDT(); this.careerSlots(modo); }, true);
    if (modo === 'dt') this.arrancarPreviewDT(d, t);
  }

  /** Creación de carrera de DT en cinco pasos: nombre y edad, apariencia, ligas, club y dificultad. */
  careerNewDT() {
    const d = this.state.careerDraft || (this.state.careerDraft = { nombre: '', idx: 0, pos: 1, attrs: null, pool: PUNTOS_INICIALES });
    const cyc = (list, cur, dir) => list[(list.indexOf(cur) + Number(dir) + list.length) % list.length];
    d.paso = d.paso || 1;
    d.edad = d.edad || 45;
    d.aspecto = d.aspecto || { skin: COLORES_PIEL[1], hair: COLORES_PELO[0], hairStyle: 0, height: 1 };
    d.incl = d.incl && d.incl.length ? d.incl : ['original'];
    d.dificultad = d.dificultad || this.game.save.settings.difficulty || 'normal';
    const todas = ligas();
    const sel = todas.filter((l) => d.incl.includes(l.id));
    if (!sel.length) { d.incl = ['original']; this.careerNewDT(); return; }
    if (!sel.some((l) => l.id === d.ligaId)) { d.ligaId = sel[0].id; d.idx = 0; }
    const liga = sel.find((l) => l.id === d.ligaId);
    const clubes = liga.clubes.map((id) => getTeam(id));
    d.idx = Math.min(d.idx || 0, clubes.length - 1);
    const t = clubes[d.idx];
    d.clubId = t.id;
    const titulos = ['NOMBRE Y EDAD', 'APARIENCIA', 'LIGAS DE SIMULACIÓN', 'TU CLUB', 'DIFICULTAD DE LOS PARTIDOS'];
    const pie = (siguiente) => `<div class="dt-nav">
        ${d.paso > 1 ? '<button class="btn" data-nav data-act="dtAtras">◀ ATRÁS</button>' : ''}
        <button class="btn go" data-nav data-act="${siguiente}" data-default>${siguiente === 'dtGo' ? 'EMPEZAR CARRERA ▶' : 'SIGUIENTE ▶'}</button>
      </div>`;
    const paso = d.paso;
    let cuerpo = '';
    if (paso === 1) {
      cuerpo = `
        <label class="car-field"><span>NOMBRE DEL ENTRENADOR</span>
          <input class="car-input" type="text" maxlength="24" autocomplete="off" value="${esc(d.nombre)}" placeholder="Escribe un nombre" data-input="dtNombre"></label>
        <div class="row" data-nav data-adj="dtEdad" data-default><span class="row-l">EDAD</span><span class="row-v"><button class="arrow sm" data-act="dtEdad" data-arg="-1">◀</button><b>${d.edad} años</b><button class="arrow sm" data-act="dtEdad" data-arg="1">▶</button></span></div>
        ${pie('dtSig')}`;
    } else if (paso === 2) {
      cuerpo = `
        <div class="dt-new-col">
          <canvas class="dt-prev" width="260" height="320"></canvas>
        </div>
        <div class="dt-new-col">
          <div class="row" data-nav data-adj="dtPiel" data-default><span class="row-l">PIEL</span><span class="row-v"><button class="arrow sm" data-act="dtPiel" data-arg="-1">◀</button><i class="sw on" style="background:${d.aspecto.skin}"></i><button class="arrow sm" data-act="dtPiel" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="dtPelo"><span class="row-l">PELO</span><span class="row-v"><button class="arrow sm" data-act="dtPelo" data-arg="-1">◀</button><i class="sw on" style="background:${d.aspecto.hair}"></i><button class="arrow sm" data-act="dtPelo" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="dtPeinado"><span class="row-l">PEINADO</span><span class="row-v"><button class="arrow sm" data-act="dtPeinado" data-arg="-1">◀</button><b>${d.aspecto.hairStyle + 1}</b><button class="arrow sm" data-act="dtPeinado" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="dtAltura"><span class="row-l">ALTURA</span><span class="row-v"><button class="arrow sm" data-act="dtAltura" data-arg="-1">◀</button><b>${d.aspecto.height.toFixed(2)}</b><button class="arrow sm" data-act="dtAltura" data-arg="1">▶</button></span></div>
        </div>
        ${pie('dtSig')}`;
    } else if (paso === 3) {
      const total = sel.reduce((s, l) => s + l.clubes.length, 0);
      cuerpo = `
        <p class="mute sm">Las ligas marcadas se simulan y sus clubes aparecen en el mercado y en las ofertas. Elige al menos una. Hay ${sel.length} marcadas, con ${total} clubes en total.</p>
        <div class="pl-list small">
          ${todas.map((l) => {
            const on = d.incl.includes(l.id);
            return `<button class="pl-row pick${on ? ' on' : ''}" data-nav data-act="dtLiga" data-arg="${l.id}" ${l.id === todas[0].id ? 'data-default' : ''}>
              <span class="pl-pos">${l.clubes.length}</span><span class="pl-name">${esc(l.nombre)}</span><span class="pl-club"></span><span class="pl-ovr"></span><b class="check">${on ? '✔' : ''}</b></button>`;
          }).join('')}
        </div>
        ${pie('dtSig')}`;
    } else if (paso === 4) {
      cuerpo = `
        <p class="mute sm">Elige la liga y el club con el que empiezas. El club debe estar en una de las ligas marcadas.</p>
        <div class="team-pick car-club" data-nav data-adj="cliga" data-default>
          <button class="arrow" data-act="cliga" data-arg="-1" aria-label="Liga anterior">◀</button>
          <div class="team-id">
            ${liga.logo ? `<img class="crest" src="${liga.logo}" alt="">` : `<span class="crest ico-liga big">${ICONO.liga}</span>`}
            <h2>${esc(liga.nombre)}</h2>
            <p>${liga.clubes.length} clubes · liga de la tabla</p>
          </div>
          <button class="arrow" data-act="cliga" data-arg="1" aria-label="Liga siguiente">▶</button>
        </div>
        <div class="team-pick car-club" data-nav data-adj="cclub">
          <button class="arrow" data-act="cclub" data-arg="-1" aria-label="Club anterior">◀</button>
          <div class="team-id">
            <img class="crest" src="${crestURL(t, 200)}" alt="">
            <h2>${esc(t.name)}</h2>
            <p>${esc(t.tagline)}</p>
          </div>
          <button class="arrow" data-act="cclub" data-arg="1" aria-label="Club siguiente">▶</button>
        </div>
        <div class="team-ovr"><b>${t.ovr}</b><span>MEDIA</span></div>
        <div class="stats">${bar('ATAQUE', t.att)}${bar('MEDIO', t.mid)}${bar('DEFENSA', t.def)}</div>
        ${pie('dtSig')}`;
    } else {
      cuerpo = `
        <p class="mute sm">Afecta a los partidos de esta carrera. Puedes cambiarla después en el menú del DT.</p>
        <div class="diffs">
          ${DIFFICULTY_ORDER.map((id, i) => {
            const dd = DIFFICULTIES[id];
            return `<button class="diff${id === d.dificultad ? ' on' : ''}" data-nav data-act="dtDif" data-arg="${id}" ${id === d.dificultad ? 'data-default' : ''}>
              <span class="diff-n">${'●'.repeat(i + 1)}${'○'.repeat(3 - i)}</span><b>${dd.name}</b><span>${esc(dd.desc)}</span></button>`;
          }).join('')}
        </div>
        ${pie('dtGo')}`;
    }
    this.render('carnew', `
      <header class="head"><span class="head-step">DT · PASO ${paso} DE 5</span><h1>${titulos[paso - 1]}</h1></header>
      <div class="car-new dt-wiz">${cuerpo}</div>
      ${this.state.carMsg ? `<p class="car-msg">${esc(this.state.carMsg)}</p>` : ''}
      ${this.hint([['← →', 'Cambiar'], ['ENTER', 'Continuar'], ['ESC', 'Atrás']])}
    `, {
      // Paso 1
      dtNombre: (v) => { d.nombre = v; },
      dtEdad: (dir) => { d.edad = clamp(d.edad + Number(dir), 25, 70); this.careerNewDT(); },
      // Paso 2
      dtPiel: (dir) => { d.aspecto.skin = cyc(COLORES_PIEL, d.aspecto.skin, dir); this.careerNewDT(); },
      dtPelo: (dir) => { d.aspecto.hair = cyc(COLORES_PELO, d.aspecto.hair, dir); this.careerNewDT(); },
      dtPeinado: (dir) => { d.aspecto.hairStyle = (d.aspecto.hairStyle + Number(dir) + 4) % 4; this.careerNewDT(); },
      dtAltura: (dir) => { d.aspecto.height = cyc(ALTURAS, d.aspecto.height, dir); this.careerNewDT(); },
      // Paso 3
      dtLiga: (id) => {
        if (d.incl.includes(id)) {
          if (d.incl.length === 1) { this.state.carMsg = 'Marca al menos una liga.'; this.careerNewDT(); return; }
          d.incl = d.incl.filter((x) => x !== id);
        } else d.incl = [...d.incl, id];
        this.state.carMsg = '';
        this.careerNewDT();
      },
      // Paso 4
      cliga: (dir) => { const i = sel.findIndex((l) => l.id === d.ligaId); d.ligaId = sel[(i + Number(dir) + sel.length) % sel.length].id; d.idx = 0; this.careerNewDT(); },
      cclub: (dir) => { d.idx = (d.idx + Number(dir) + clubes.length) % clubes.length; this.careerNewDT(); },
      // Paso 5
      dtDif: (id) => { d.dificultad = id; this.careerNewDT(); },
      // Navegación
      dtSig: () => { this.state.carMsg = ''; this.game.audio.ui('ok'); d.paso = Math.min(5, d.paso + 1); this.careerNewDT(); },
      dtAtras: () => { this.state.carMsg = ''; d.paso = Math.max(1, d.paso - 1); this.careerNewDT(); },
      dtGo: () => {
        this.game.audio.ui('ok');
        const mundo = [...new Set(sel.flatMap((l) => l.clubes))];
        const c = crearCarrera({
          nombre: d.nombre, modo: 'dt', clubId: d.clubId, clubes: liga.clubes, ligaId: liga.id, ligaNombre: liga.nombre,
          mundo, dt: { edad: d.edad, aspecto: { ...d.aspecto }, ligas: sel.map((l) => l.id) }, dificultad: d.dificultad,
        });
        guardarCarrera(c);
        this.state.careerDraft = null;
        this.pararPreviewDT();
        this.careerHub(c.id);
      },
    }, () => {
      if (d.paso > 1) { d.paso -= 1; this.careerNewDT(); return; }
      this.pararPreviewDT();
      this.careerSlots('dt');
    }, true);
    if (paso === 2) this.arrancarPreviewDT(d, t);
  }

  /** Vista previa 3D del entrenador en la creación de carrera. */
  arrancarPreviewDT(d, t) {
    const cv = this.root.querySelector('.dt-prev');
    if (!cv) return;
    const a = d.aspecto;
    // Ropa de calle: camisa clara, pantalón oscuro y calcetines; nada de equipación de jugador
    const civil = { shirt: '#e9ecf2', accent: '#2b3446', pattern: 'solid', shorts: '#2b3446', socks: '#1c2230', num: '#e9ecf2' };
    this.dtVisor = new PlayerPreview(cv, { number: 10, short: 'DT', skin: a.skin, hair: a.hair, hairStyle: a.hairStyle, height: a.height, pos: 'CM' }, civil);
    this.dtVisor.start();
  }

  pararPreviewDT() {
    if (this.dtVisor) { this.dtVisor.dispose(); this.dtVisor = null; }
  }

  /** Creación de tu jugador: posición y reparto de atributos. */
  careerPlayer(modo) {
    const d = this.state.careerDraft;
    if (!d.attrs) {
      d.attrs = Object.fromEntries(ATTR_KEYS.map((k) => [k, ATTR_BASE]));
      d.pool = PUNTOS_INICIALES;
    }
    const pos = POSICIONES_JUGADOR[d.pos];
    const ovr = overall(pos, d.attrs);
    this.render('carplayer', `
      <header class="head"><span class="head-step">JUGADOR</span><h1>TU FUTBOLISTA</h1></header>
      <div class="car-player">
        <div class="car-pl-top">
          <div class="row" data-nav data-adj="cpos">
            <span class="row-l">POSICIÓN</span>
            <span class="row-v"><button class="arrow sm" data-act="cpos" data-arg="-1">◀</button><b>${pos}</b><button class="arrow sm" data-act="cpos" data-arg="1">▶</button></span>
          </div>
          <div class="car-ovr"><b>${ovr}</b><span>MEDIA</span></div>
          <div class="car-pool${d.pool ? '' : ' ok'}"><b>${d.pool}</b><span>PUNTOS LIBRES</span></div>
        </div>
        <div class="car-attrs">
          ${ATTR_KEYS.map((k) => `
            <div class="car-attr" data-nav data-adj="pattr:${k}">
              <span class="car-attr-l">${ATTR_LABELS[k]}</span>
              <span class="stat-b"><i style="width:${d.attrs[k]}%"></i></span>
              <b>${d.attrs[k]}</b>
              <button class="arrow sm" data-act="pattr" data-arg="${k}:-1" aria-label="Quitar">−</button>
              <button class="arrow sm" data-act="pattr" data-arg="${k}:1" aria-label="Añadir">+</button>
            </div>`).join('')}
        </div>
        <p class="mute sm">Reparte los ${PUNTOS_INICIALES} puntos entre los atributos. Cada atributo va de ${ATTR_MIN_INICIAL} a ${ATTR_MAX_INICIAL}.</p>
        <button class="btn go" data-nav data-act="cgo" data-default>${d.pool ? `TE QUEDAN ${d.pool} PUNTOS` : 'CREAR CARRERA ▶'}</button>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['← →', 'Ajustar'], ['ENTER', 'Crear'], ['ESC', 'Volver']])}
    `, {
      cpos: (dir) => { d.pos = (d.pos + Number(dir) + POSICIONES_JUGADOR.length) % POSICIONES_JUGADOR.length; this.careerPlayer(modo); },
      pattr: (arg) => {
        const [k, dir] = arg.split(':');
        const v = d.attrs[k] + Number(dir);
        if (Number(dir) > 0 && (d.pool <= 0 || v > ATTR_MAX_INICIAL)) return;
        if (Number(dir) < 0 && v < ATTR_MIN_INICIAL) return;
        d.attrs[k] = v;
        d.pool -= Number(dir);
        this.careerPlayer(modo);
      },
      cgo: () => {
        if (d.pool > 0) { this.game.audio.ui('back'); this.careerPlayer(modo); return; }
        this.game.audio.ui('ok');
        const ref = getTeam(d.clubId).squad[0];
        const liga = ligas().find((l) => l.id === d.ligaId) || ligas()[0];
        const c = crearCarrera({
          nombre: d.nombre, modo: 'jugador', clubId: d.clubId, clubes: liga.clubes, ligaId: liga.id, ligaNombre: liga.nombre,
          jugador: { nombre: (d.nombre || '').trim() || 'Jugador', pos: POSICIONES_JUGADOR[d.pos], attrs: d.attrs,
            skin: ref.skin, hair: ref.hair, hairStyle: ref.hairStyle, height: ref.height },
        });
        guardarCarrera(c);
        this.state.careerDraft = null;
        this.careerHub(c.id);
      },
    }, () => this.careerNew(modo), true);
  }

  /** Escena: el jugador se reúne con el DT del club en su oficina (texto que se escribe). */
  careerCinematica(id, paso = 0) {
    const c = cargarCarrera(id);
    if (!c || !c.jugador) { this.careerHub(id); return; }
    const club = getTeam(c.clubId);
    const dt = `DT ${apellidoDT(c.clubId)}`;
    const j = c.jugador;
    const lineas = [
      `Así que tú eres el nuevo, ${j.short}. ${club.name} confía en ti: ${j.ovr} de media, y eso se nota en la plantilla.`,
      'Aquí la presión es constante. Quiero compromiso en el campo y en los entrenamientos, y lo quiero desde el primer día.',
      'La afición se gana partido a partido. Sé el primero en llegar a la ciudad y el último en irte del vestuario.',
    ];
    const ultimo = paso >= lineas.length - 1;
    this.render('cine', `
      <div class="cine">
        <div class="cine-escena">${escenaOficina(club.home)}</div>
        <div class="cine-txt"><span class="cine-nombre">${esc(dt)}</span><p id="cine-p" aria-live="polite"></p></div>
        <div class="cine-btns"><button class="btn go" data-nav data-act="cSig" data-default>${ultimo ? 'ENTRAR AL CLUB ▶' : 'CONTINUAR ▶'}</button></div>
      </div>
      ${this.hint([['ENTER', 'Continuar'], ['ESC', 'Saltar']])}`, {
      cSig: () => {
        if (this.cineEscribiendo) { this.cineTerminar(); return; }
        if (!ultimo) { this.careerCinematica(id, paso + 1); return; }
        const cc = cargarCarrera(id);
        if (cc) { cc.escenas = [...(cc.escenas || []), cc.clubId]; guardarCarrera(cc); }
        this.cineParar();
        this.careerHub(id);
      },
    }, () => { this.cineParar(); this.careerHub(id); }, true);
    this.cineEscribir(lineas[paso]);
  }

  /** Escribe el texto letra a letra (pulsar CONTINUAR lo completa). */
  cineEscribir(texto) {
    this.cineParar();
    this.cineEscribiendo = true;
    this.cineTexto = texto;
    const el = this.root.querySelector('#cine-p');
    if (!el) { this.cineEscribiendo = false; return; }
    let i = 0;
    this.cineT = setInterval(() => {
      const p = this.root.querySelector('#cine-p');
      if (!p) { this.cineParar(); return; }
      i++;
      p.textContent = texto.slice(0, i);
      if (i >= texto.length) this.cineTerminar();
    }, 28);
  }

  cineTerminar() {
    clearInterval(this.cineT);
    this.cineT = null;
    this.cineEscribiendo = false;
    const p = this.root.querySelector('#cine-p');
    if (p) p.textContent = this.cineTexto || '';
  }

  cineParar() {
    clearInterval(this.cineT);
    this.cineT = null;
    this.cineEscribiendo = false;
  }

  careerHub(id) {
    const c = cargarCarrera(id);
    if (!c) { this.careerMenu(); return; }
    if (c.fin) { this.careerSeason(id); return; }
    this.state.carId = id;
    this.game.careerPointsInfo = null;
    if (c.modo === 'dt') { this.careerHubDT(id, this.state.carMsg || ''); this.state.carMsg = ''; return; }
    // Primera vez en un club: escena con el DT del club en su oficina
    if (!(c.escenas || []).includes(c.clubId)) { this.careerCinematica(id, 0); return; }
    const club = getTeam(c.clubId);
    const tabla = tablaDe(c);
    const pos = tabla.findIndex((t) => t.id === c.clubId) + 1;
    const me = tabla[pos - 1] || { pts: 0, gf: 0, gc: 0, pj: 0 };
    const f = userFixture(c);
    const total = c.calendario.length;
    const rival = f ? getTeam(f.local === c.clubId ? f.visitante : f.local) : null;
    const esLocal = f && f.local === c.clubId;
    const jug = c.modo === 'jugador';
    const abierta = ventanaAbierta(c);
    const top = tabla.slice(0, 8);
    const info = jug
      ? `<div class="car-info">
          <span>MEDIA <b>${c.jugador.ovr}</b></span><span>PUNTOS <b>${c.puntos}</b></span>
          <span>GOLES <b>${c.jugador.stats.goles}</b></span><span>ASIST. <b>${c.jugador.stats.asistencias}</b></span>
          <span>SUELDO <b>${c.jugador.salario.toFixed(1)} M€</b></span><span>DINERO <b>${c.dinero.toFixed(1)} M€</b></span>
          ${c.jugador.lesion ? `<span class="car-hurt">LESIONADO · ${c.jugador.lesion} jornadas</span>` : ''}
        </div>`
      : `<div class="car-info">
          <span>PRESUPUESTO <b>${c.caja[c.clubId].toFixed(1)} M€</b></span>
          <span>MERCADO <b>${abierta ? 'ABIERTO' : 'CERRADO'}</b></span>
          <span>PLANTILLA <b>${c.plantillas[c.clubId].length}</b></span>
        </div>`;
    const msg = this.state.carMsg || '';
    this.state.carMsg = '';
    this.render('carhub', `
      <header class="car-head">
        <img class="car-crest" src="${crestURL(club, 96)}" alt="">
        <div><b>${esc(club.name)}</b><small>${esc(c.nombre)} · ${jug ? 'JUGADOR' : 'DT'}</small></div>
        <div class="car-season">TEMPORADA ${c.temporada}<small>JORNADA ${Math.min(c.jornada + 1, total)} / ${total}</small></div>
      </header>
      ${info}
      <div class="car-body">
        <section class="car-next">
          <h3>PRÓXIMO PARTIDO</h3>
          ${f && rival ? `
            <div class="car-match">
              <span>${esLocal ? 'LOCAL' : 'VISITANTE'}</span>
              <div class="car-vs"><img src="${crestURL(club, 96)}" alt=""><b>VS</b><img src="${crestURL(rival, 96)}" alt=""></div>
              <p>${esc(club.name)} — ${esc(rival.name)}</p>
            </div>
            <button class="btn go" data-nav data-act="play" data-arg="${id}" data-default>${jug ? 'JUGAR PARTIDO EN 3D ▶' : 'JUGAR PARTIDO EN 3D (CONTROLAS UN JUGADOR) ▶'}</button>
            ${jug ? '' : `<button class="btn" data-nav data-act="sim" data-arg="${id}">SIMULAR JORNADA</button>
            <button class="btn" data-nav data-act="watch" data-arg="${id}">VER PARTIDO SIN CONTROLAR</button>`}
          ` : '<p class="mute">No queda ningún partido por jugar.</p>'}
          ${msg ? `<p class="car-msg">${esc(msg)}</p>` : ''}
          <div class="car-btns">
            ${jug ? `<button class="btn" data-nav data-act="upgrades" data-arg="${id}">MEJORAR ESTADÍSTICAS${c.puntos ? ' (' + c.puntos + ')' : ''}</button>` : `<button class="btn" data-nav data-act="market" data-arg="${id}">MERCADO DE FICHAJES${abierta ? ' · ABIERTO' : ''}</button>`}
            <button class="btn" data-nav data-act="champ" data-arg="${id}">${UEFA_NOMBRE}</button>
          </div>
          <div class="car-rep"><span>REPUTACIÓN</span><span class="stat-b"><i style="width:${c.reputacion}%"></i></span><b>${c.reputacion}</b></div>
          <p class="mute sm">Posición ${pos}º · ${me.pts} pts · ${me.gf}-${me.gc} en goles</p>
        </section>
        <section class="car-table">
          <h3>CLASIFICACIÓN</h3>
          <div class="ct ct-h"><span>#</span><span>CLUB</span><span>PJ</span><span>DG</span><span>PTS</span></div>
          ${top.map((t, i) => {
            const cl = getTeam(t.id);
            return `<div class="ct${t.id === c.clubId ? ' me' : ''}"><span>${i + 1}</span><span>${esc(cl.short || cl.name)}</span><span>${t.pj}</span><span>${t.gf - t.gc}</span><b>${t.pts}</b></div>`;
          }).join('')}
          ${pos > 8 ? `<div class="ct me"><span>${pos}</span><span>${esc(club.short || club.name)}</span><span>${me.pj}</span><span>${me.gf - me.gc}</span><b>${me.pts}</b></div>` : ''}
        </section>
      </div>
      <div class="report-btns car-foot">
        <button class="btn" data-nav data-act="carMenu">SALIR AL MENÚ</button>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Menú']])}
    `, {
      play: (cid) => { this.game.startCareer(cid, false); },
      watch: (cid) => { this.game.startCareer(cid, true); },
      sim: (cid) => { this.game.audio.ui('ok'); simularJornada(cid); this.careerHub(cid); },
      market: (cid) => { this.game.audio.ui('ok'); this.careerMarket(cid); },
      upgrades: (cid) => { this.game.audio.ui('ok'); this.careerUpgrades(cid); },
      champ: (cid) => { this.game.audio.ui('ok'); this.careerChampions(cid); },
      carMenu: () => this.main(),
    }, () => this.main(), true);
    this.game.audio.music('select');
  }

  /** Menú principal del DT: pantalla rediseñada con navegación superior, evento, tareas y noticias. */
  careerHubDT(id, msg = '') {
    const c = cargarCarrera(id);
    if (!c) { this.careerMenu(); return; }
    if (c.fin) { this.careerSeason(id); return; }
    this.state.carId = id;
    this.render('carhub', hubDTHTML(c, msg), this.accionesDT(id), () => this.main(), true);
    this.game.audio.music('select');
  }

  /** Acciones compartidas por el inicio del DT y sus pestañas. */
  accionesDT(id) {
    return {
      champ: (cid) => { this.game.audio.ui('ok'); this.careerChampions(cid); },
      play: (cid) => { this.game.startCareer(cid, false); },
      sim: (cid) => {
        this.game.audio.ui('ok');
        avanzarEvento(cid);
        const c = cargarCarrera(cid);
        if (c && c.fin) { this.careerSeason(cid); return; }
        this.careerHubDT(cid);
      },
      tabInicio: (cid) => this.careerHubDT(cid),
      tabCentral: (cid) => this.careerTabDT(cid, 'central'),
      tabNotif: (cid) => this.careerTabDT(cid, 'notif'),
      tabPlantilla: (cid) => this.careerTabDT(cid, 'plantilla'),
      tabMercado: (cid) => { this.game.audio.ui('ok'); this.careerMarket(cid); },
      tabCalendario: (cid) => this.careerTabDT(cid, 'calendario'),
      tabOficina: (cid) => this.careerTabDT(cid, 'oficina'),
      tabPerfil: (cid) => this.careerTabDT(cid, 'perfil'),
      dtAjustes: (cid) => this.dtAjustes(cid),
      uclJugar: (cid) => { this.game.startChampions(cid, false); },
      plSel: (pid) => {
        if (this.dragT && Date.now() - this.dragT < 300) return;  // el clic que termina un arrastre no cuenta
        const c = cargarCarrera(id);
        if (this.state.plSwap && titularesDe(c, c.clubId).includes(pid)) {
          const err = sustituirTitular(c, c.clubId, pid, this.state.plSwap);
          if (!err) guardarCarrera(c);
          this.state.plSwap = null; this.state.plSel = pid; this.state.plMsg = err || '';
          this.careerTabDT(id, 'plantilla'); return;
        }
        this.state.plSel = pid; this.state.plDet = false; this.state.plMsg = ''; this.careerTabDT(id, 'plantilla');
      },
      plSupl: (pid) => {
        if (this.dragT && Date.now() - this.dragT < 300) return;
        this.state.plSel = pid; this.state.plDet = false; this.state.plMsg = '';
        this.state.plSwap = this.state.plSwap === pid ? null : pid;
        this.careerTabDT(id, 'plantilla');
      },
      plDet: (pid) => { this.state.plSel = pid; this.state.plDet = !this.state.plDet; this.careerTabDT(id, 'plantilla'); },
      plTitular: (pid) => {
        const c = cargarCarrera(id);
        const err = alternarTitular(c, c.clubId, pid);
        if (!err) guardarCarrera(c);
        this.state.plSel = pid; this.state.plMsg = err || '';
        this.careerTabDT(id, 'plantilla');
      },
      plPos: (arg) => {
        const [pid, dir] = arg.split(':');
        const c = cargarCarrera(id);
        const p = (c.plantillas[c.clubId] || []).find((x) => x.id === pid);
        if (!p) return;
        const i = Math.max(0, POSICIONES_CAMPO.indexOf(p.pos));
        const n = POSICIONES_CAMPO.length;
        cambiarPosicion(c, c.clubId, pid, POSICIONES_CAMPO[(i + Number(dir) + n) % n]);
        guardarCarrera(c);
        this.state.plSel = pid; this.state.plMsg = '';
        this.careerTabDT(id, 'plantilla');
      },
      plRol: (arg) => {
        const [pid, rol] = arg.split(':');
        const c = cargarCarrera(id);
        asignarRol(c, c.clubId, rol, pid);
        guardarCarrera(c);
        this.state.plSel = pid; this.state.plMsg = '';
        this.careerTabDT(id, 'plantilla');
      },
      carMenu: () => this.main(),
    };
  }

  /** Ajustes de la carrera DT: dificultad de los partidos y salida al menú principal. */
  dtAjustes(id) {
    const s = this.game.save.settings;
    const cc = cargarCarrera(id);
    const dif = (cc && cc.dificultad) || s.difficulty;
    const actual = DIFFICULTIES[dif] || DIFFICULTIES.normal;
    this.render('dtajustes', `
      <header class="head"><span class="head-step">CARRERA DT</span><h1>AJUSTES</h1></header>
      <div class="pl-list">
        <p class="mute">Dificultad de los partidos (se aplica a los próximos partidos). Ahora: <b>${actual.name}</b></p>
        ${DIFFICULTY_ORDER.map((d, i) => {
          const dd = DIFFICULTIES[d];
          const on = d === dif;
          return `<button class="pl-row pick${on ? ' on' : ''}" data-nav data-act="dtDif" data-arg="${d}" ${on ? 'data-default' : ''} style="grid-template-columns:minmax(0,1fr) auto auto">
            <span class="pl-name">${'●'.repeat(i + 1)}${'○'.repeat(3 - i)} · ${dd.name}</span><span class="pl-club">${esc(dd.desc)}</span><b class="check">${on ? '✔' : ''}</b></button>`;
        }).join('')}
      </div>
      <div class="report-btns car-foot">
        <button class="btn" data-nav data-act="dtVolver">VOLVER A LA CARRERA</button>
        <button class="btn" data-nav data-act="dtSalir">SALIR AL MENÚ PRINCIPAL</button>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      dtDif: (d) => {
        const c = cargarCarrera(id);
        if (c) { c.dificultad = d; guardarCarrera(c); }
        this.dtAjustes(id);
      },
      dtVolver: () => this.careerHubDT(id),
      dtSalir: () => { this.game.audio.ui('back'); this.main(); },
    }, () => this.careerHubDT(id), true);
  }

  /** Pestañas del menú DT (Central, Notificaciones, Plantilla, Oficina y perfil). */
  /** Pantalla dentro del hub DT: barra superior, fondo del estadio y botón para volver al inicio. */
  hubLayout(c, clave, cuerpo, acciones, volver) {
    const club = getTeam(c.clubId);
    const kit = club.home;
    this.render('carhubtab', `
      <div class="hub-bg">${svgEstadio(kit.shirt, kit.accent)}</div>
      <div class="hub">
        ${navHTML(c, clave)}
        ${cuerpo}
        <div class="report-btns car-foot"><button class="btn" data-nav data-act="tabInicio" data-arg="${c.id}" data-default>VOLVER AL INICIO</button></div>
      </div>`, { ...this.accionesDT(c.id), ...acciones }, volver, true);
  }

  /**
   * Arrastrar un titular sobre otro hueco del campo para intercambiar sus puestos.
   * Un clic normal sigue siendo selección; el arrastre empieza al mover más de 8 px.
   */
  activarArrastrePlantilla(id) {
    this.root.querySelectorAll('.pj.pj-carta[data-slot]').forEach((el) => {
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        this.arrastre = { id, i: Number(el.dataset.slot), x: e.clientX, y: e.clientY, el, activo: false, ghost: null, destino: null };
      });
    });
    if (this._arrastreWin) return;
    this._arrastreWin = true;
    window.addEventListener('pointermove', (e) => {
      const a = this.arrastre;
      if (!a) return;
      if (!a.activo) {
        if (Math.hypot(e.clientX - a.x, e.clientY - a.y) < 8) return;
        a.activo = true;
        const cuerpo = a.el.querySelector('.pj-cuerpo');
        a.ghost = document.createElement('div');
        a.ghost.className = 'drag-ghost';
        a.ghost.innerHTML = cuerpo ? cuerpo.innerHTML : '';
        document.body.appendChild(a.ghost);
        a.el.classList.add('arrastrando');
      }
      a.ghost.style.left = `${e.clientX}px`;
      a.ghost.style.top = `${e.clientY}px`;
      const bajo = document.elementFromPoint(e.clientX, e.clientY);
      const dest = bajo && bajo.closest ? bajo.closest('[data-slot]') : null;
      this.root.querySelectorAll('.pj-destino').forEach((x) => x.classList.remove('pj-destino'));
      const valido = dest && dest !== a.el && dest.dataset.slot !== undefined && dest.classList.contains('pj');
      if (valido) dest.classList.add('pj-destino');
      a.destino = valido ? Number(dest.dataset.slot) : null;
    });
    const soltar = () => {
      const a = this.arrastre;
      this.arrastre = null;
      if (!a || !a.activo) return;   // fue un clic normal
      a.ghost.remove();
      this.dragT = Date.now();
      if (a.destino !== null && a.destino !== a.i) {
        const c = cargarCarrera(a.id);
        intercambiarTitulares(c, c.clubId, a.i, a.destino);
        guardarCarrera(c);
      }
      this.careerTabDT(a.id, 'plantilla');
    };
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  }

  careerTabDT(id, tab) {
    const c = cargarCarrera(id);
    if (!c) { this.careerMenu(); return; }
    const club = getTeam(c.clubId);
    const claves = { central: 'central', notif: 'notif', plantilla: 'plantilla', oficina: 'oficina', calendario: 'calendario' };
    const cuerpo = {
      central: () => centralHTML(c),
      notif: () => notifHTML(c),
      plantilla: () => { const m = this.state.plMsg || ''; this.state.plMsg = ''; return plantillaHTML(c, { sel: this.state.plSel || null, det: !!this.state.plDet, msg: m, swap: this.state.plSwap || null }); },
      oficina: () => oficinaHTML(c),
      calendario: () => calendarioHTML(c),
      perfil: () => `<section class="hub-pagina"><h2>PERFIL</h2><div class="car-info">
          <span>CLUB <b>${esc(club.name)}</b></span><span>REPUTACIÓN <b>${c.reputacion}</b></span>
          <span>PRESUPUESTO <b>${c.caja[c.clubId].toFixed(1)} M€</b></span><span>PLANTILLA <b>${c.plantillas[c.clubId].length}</b></span>
          <span>TEMPORADA <b>${c.temporada}</b></span></div></section>`,
    }[tab]();
    const kit = club.home;
    this.render('carhubtab', `
      <div class="hub-bg">${svgEstadio(kit.shirt, kit.accent)}</div>
      <div class="hub">
        ${navHTML(c, claves[tab] || null)}
        ${cuerpo}
        <div class="report-btns car-foot"><button class="btn" data-nav data-act="tabInicio" data-arg="${id}" data-default>VOLVER AL INICIO</button></div>
      </div>`, this.accionesDT(id), () => this.careerHubDT(id), true);
    if (tab === 'plantilla') this.activarArrastrePlantilla(id);
  }

  /** Mercado de fichajes (solo DT y solo con la ventana abierta para comprar o vender). */
  /** Transferencias (DT): tres cuadrados: buscar jugador, negociaciones activas e intereses. */
  careerMarket(id) {
    const c = cargarCarrera(id);
    if (!c || c.modo !== 'dt') { this.careerHub(id); return; }
    this.state.carId = id;
    obtenerMercado(c);
    generarEntrantes(c);
    guardarCarrera(c);
    const abierta = ventanaAbierta(c);
    const pendientes = (c.negociaciones || []).filter((n) => n.estado === 'abierta' || n.estado === 'contra').length;
    const msg = this.state.carMsg || '';
    this.state.carMsg = '';
    this.hubLayout(c, 'reclutamiento', `
      <header class="car-head">
        <div><b>TRANSFERENCIAS</b><small>${esc(getTeam(c.clubId).name)} · Presupuesto <b>${c.caja[c.clubId].toFixed(1)} M€</b> · ${abierta ? 'VENTANA ABIERTA' : 'VENTANA CERRADA'}</small></div>
      </header>
      ${msg ? `<p class="car-msg">${esc(msg)}</p>` : ''}
      ${abierta ? '' : '<p class="mute sm">El mercado abre al inicio de la temporada y a mitad de liga (tras la jornada 11). Puedes preparar negociaciones, pero no cerrarlas.</p>'}
      <div class="tr-tiles">
        <button class="tr-tile" data-nav data-act="trBuscar" data-arg="${id}" data-default>
          <span class="tr-ico">${LUPA}</span><b>BUSCAR JUGADOR</b><small>Por nombre, liga, club o posición</small></button>
        <button class="tr-tile" data-nav data-act="trNeg" data-arg="${id}">
          <span class="tr-ico tr-num">${pendientes}</span><b>NEGOCIACIONES ACTIVAS</b><small>${pendientes ? 'Clubes que esperan tu respuesta' : 'Sin negociaciones pendientes'}</small></button>
        <button class="tr-tile" data-nav data-act="trInt" data-arg="${id}">
          <span class="tr-ico tr-num">${(c.intereses || []).length}</span><b>INTERESES</b><small>Jugadores marcados para negociar</small></button>
      </div>
      <div class="report-btns car-foot"><button class="btn" data-nav data-act="back">VOLVER</button></div>
      ${this.hint([['← →', 'Moverse'], ['ENTER', 'Abrir'], ['ESC', 'Volver']])}
    `, {
      trBuscar: (cid) => this.careerBuscar(cid),
      trNeg: (cid) => this.careerNegociaciones(cid),
      trInt: (cid) => this.careerIntereses(cid),
      back: () => this.careerHub(id),
    }, () => this.careerHub(id), true);
  }

  /** Lista de resultados de la búsqueda (solo se redibuja esta parte, para no perder el foco). */
  resultadosBuscar(c) {
    const bq = this.state.bq || {};
    const r = buscarJugadores(c, { texto: bq.texto || '', liga: bq.liga || '', pos: bq.pos || '' });
    const filas = r.lista.map(({ p, clubId }) => {
      const en = (c.intereses || []).includes(p.id);
      return `<div class="tr-row">
        <span class="pl-pos">${p.pos}</span><span class="tr-name">${esc(p.name)}</span>
        <span class="pl-club">${esc(getTeam(clubId).short)}</span><span class="pl-ovr">${p.ovr}</span>
        <b class="mk-price">${valorDe(p).toFixed(1)} M€</b>
        ${en ? '<span class="tr-ok">EN INTERESES</span>' : `<button class="btn sm" data-nav data-act="bAdd" data-arg="${p.id}">AÑADIR A INTERESES</button>`}
      </div>`;
    }).join('');
    return (filas || '<p class="mute">Ningún jugador coincide con la búsqueda.</p>')
      + (r.total > r.lista.length ? `<p class="mute sm">Mostrando ${r.lista.length} de ${r.total}. Afina la búsqueda.</p>` : '');
  }

  careerBuscar(id) {
    const c = cargarCarrera(id);
    if (!c || c.modo !== 'dt') { this.careerHub(id); return; }
    this.state.carId = id;
    const bq = this.state.bq || (this.state.bq = { texto: '', liga: '', pos: '' });
    const ligasL = ligas();
    const lig = ligasL.find((l) => l.id === bq.liga);
    this.hubLayout(c, 'reclutamiento', `
      <header class="car-head"><div><b>BUSCAR JUGADOR</b><small>Añade jugadores a Intereses para negociar su fichaje</small></div></header>
      <div class="tr-filters">
        <label class="pl-search">${LUPA}<input type="search" data-input="bq" value="${esc(bq.texto)}" placeholder="Nombre, club o posición…" autocomplete="off" aria-label="Buscar jugador"></label>
        <div class="row" data-nav data-adj="bqliga"><span class="row-l">LIGA</span><span class="row-v"><button class="arrow sm" data-act="bqliga" data-arg="-1">◀</button><b>${esc(lig ? lig.nombre : 'TODAS')}</b><button class="arrow sm" data-act="bqliga" data-arg="1">▶</button></span></div>
        <div class="row" data-nav data-adj="bqpos"><span class="row-l">POSICIÓN</span><span class="row-v"><button class="arrow sm" data-act="bqpos" data-arg="-1">◀</button><b>${esc(bq.pos || 'TODAS')}</b><button class="arrow sm" data-act="bqpos" data-arg="1">▶</button></span></div>
      </div>
      <div id="bres" class="pl-list">${this.resultadosBuscar(c)}</div>
      <div class="report-btns car-foot"><button class="btn" data-nav data-act="back">VOLVER</button></div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Añadir'], ['ESC', 'Volver']])}
    `, {
      bq: (v) => { this.state.bq.texto = v; const r = this.root.querySelector('#bres'); if (r) r.innerHTML = this.resultadosBuscar(c); },
      bqliga: (d) => {
        const lista = ['', ...ligasL.map((l) => l.id)];
        const i = (lista.indexOf(bq.liga) + Number(d) + lista.length) % lista.length;
        this.state.bq.liga = lista[i];
        this.careerBuscar(id);
      },
      bqpos: (d) => {
        const lista = ['', ...POSICIONES];
        const i = (lista.indexOf(bq.pos) + Number(d) + lista.length) % lista.length;
        this.state.bq.pos = lista[i];
        this.careerBuscar(id);
      },
      bAdd: (pid) => {
        anadirInteres(c, pid);
        guardarCarrera(c);
        this.game.audio.ui('ok');
        const r = this.root.querySelector('#bres');
        if (r) r.innerHTML = this.resultadosBuscar(c);
      },
      back: () => this.careerMarket(id),
    }, () => this.careerMarket(id), true);
  }

  careerIntereses(id) {
    const c = cargarCarrera(id);
    if (!c || c.modo !== 'dt') { this.careerHub(id); return; }
    this.state.carId = id;
    const msg = this.state.carMsg || '';
    this.state.carMsg = '';
    const lista = (c.intereses || []).map((pid) => jugadorDelMundo(c, pid)).filter(Boolean);
    const filas = lista.map(({ p, clubId }) => `
      <div class="tr-row">
        <span class="pl-pos">${p.pos}</span><span class="tr-name">${esc(p.name)}</span>
        <span class="pl-club">${esc(getTeam(clubId).short)}</span><span class="pl-ovr">${p.ovr}</span>
        <b class="mk-price">${valorDe(p).toFixed(1)} M€</b>
        <button class="btn sm go" data-nav data-act="nIni" data-arg="${p.id}">NEGOCIAR FICHAJE</button>
        <button class="ico" data-nav data-act="iQuitar" data-arg="${p.id}" aria-label="Quitar de intereses">${ICONO.borrar}</button>
      </div>`).join('');
    this.hubLayout(c, 'reclutamiento', `
      <header class="car-head"><div><b>INTERESES</b><small>${lista.length} jugadores · Presupuesto ${c.caja[c.clubId].toFixed(1)} M€</small></div></header>
      ${msg ? `<p class="car-msg">${esc(msg)}</p>` : ''}
      <div class="pl-list">${filas || '<p class="mute">Todavía no tienes jugadores marcados. Busca alguno y añádelo a Intereses.</p>'}</div>
      <div class="report-btns car-foot">
        <button class="btn" data-nav data-act="trBuscar" data-arg="${id}">BUSCAR JUGADOR</button>
        <button class="btn" data-nav data-act="back" data-default>VOLVER</button>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Negociar'], ['ESC', 'Volver']])}
    `, {
      nIni: (pid) => this.careerNegociar(id, pid),
      iQuitar: (pid) => { quitarInteres(c, pid); guardarCarrera(c); this.careerIntereses(id); },
      trBuscar: (cid) => this.careerBuscar(cid),
      back: () => this.careerMarket(id),
    }, () => this.careerMarket(id), true);
  }

  /**
   * Negociación en la oficina del club: el DT del club conversa contigo. Haces ofertas con
   * los controles de abajo y él responde en la escena, sin salir de la sala.
   */
  careerNegociar(id, pid) {
    const c = cargarCarrera(id);
    if (!c) { this.careerHub(id); return; }
    const j = jugadorDelMundo(c, pid);
    if (!j) { this.state.carMsg = 'Ese jugador ya no está disponible.'; this.careerIntereses(id); return; }
    const pide = Math.round(valorDe(j.p) * 10) / 10;
    if (!this.state.nDraft || this.state.nDraft.pid !== pid) this.state.nDraft = { pid, oferta: pide, intercambio: null, porcentaje: 0 };
    const d = this.state.nDraft;
    if (!this.state.nChat || this.state.nChat.pid !== pid) {
      this.state.nChat = { pid, respuesta: `Pasa, siéntate. Tenemos el interés en ${j.p.short}. Dime qué ofreces.`, tuLinea: '', escrita: false };
    }
    const chat = this.state.nChat;
    const cerrado = !ventanaAbierta(c);
    const club = getTeam(j.clubId);
    const dtClub = `DT ${apellidoDT(j.clubId)}`;
    const mios = [...(c.plantillas[c.clubId] || [])].sort((x, y) => y.ovr - x.ovr).slice(0, 25);
    const cambio = mios.find((p) => p.id === d.intercambio);
    const PORC = [0, 5, 10, 15, 20];
    const ultima = (c.negociaciones || []).filter((n) => n.pid === pid && n.estado !== 'cerrada').slice(-1)[0];
    const puedeContrato = ultima && ultima.estado === 'club_ok';
    const linea = (quien, t) => `<div class="nego-linea"><span>${esc(quien)}</span> ${esc(t)}</div>`;
    this.render('carnegocia', `
      <div class="cine nego">
        <div class="cine-escena nego-escena">${escenaOficina(club.home)}</div>
        <div class="nego-dialogo">
          <div class="nego-meta"><b>${esc(club.name)}</b><span>${esc(j.p.name)} · ${j.p.pos} · ${j.p.ovr} · valor ${pide.toFixed(1)} M€</span><span>Presupuesto ${c.caja[c.clubId].toFixed(1)} M€</span></div>
          ${chat.tuLinea ? linea('TÚ:', chat.tuLinea) : ''}
          <div class="nego-linea club"><span>${esc(dtClub)}:</span> <b id="cine-p" aria-live="polite"></b></div>
        </div>
        <div class="nego-controles">
          <div class="row" data-nav data-adj="nOf"><span class="row-l">PRECIO</span><span class="row-v"><button class="arrow sm" data-act="nOf" data-arg="-0.5">−0,5</button><b>${d.oferta.toFixed(1)} M€</b><button class="arrow sm" data-act="nOf" data-arg="0.5">+0,5</button></span></div>
          <div class="row" data-nav data-adj="nInt"><span class="row-l">INTERCAMBIO</span><span class="row-v"><button class="arrow sm" data-act="nInt" data-arg="-1">◀</button><b>${cambio ? `${esc(cambio.short)} · ${cambio.ovr}` : 'NINGUNO'}</b><button class="arrow sm" data-act="nInt" data-arg="1">▶</button></span></div>
          <div class="row" data-nav data-adj="nPor"><span class="row-l">% DE FUTURA VENTA</span><span class="row-v"><button class="arrow sm" data-act="nPor" data-arg="-1">◀</button><b>${d.porcentaje} %</b><button class="arrow sm" data-act="nPor" data-arg="1">▶</button></span></div>
          ${cerrado ? '<p class="car-msg">El mercado está cerrado: no se pueden hacer ofertas ahora.</p>' : ''}
          <div class="report-btns car-foot nego-btns">
            <button class="btn go" data-nav data-act="nEnviar" data-default ${cerrado ? 'disabled' : ''}>HACER OFERTA ▶</button>
            <button class="btn" data-nav data-act="nDeleg" ${cerrado ? 'disabled' : ''}>QUE LO DECIDA LA DIRECTIVA</button>
            ${puedeContrato ? `<button class="btn go" data-nav data-act="nContrato" data-arg="${ultima.id}">NEGOCIAR CONTRATO ▶</button>` : ''}
            <button class="btn" data-nav data-act="back">LEVANTARSE</button>
          </div>
        </div>
      </div>`, {
      nOf: (dir) => { d.oferta = Math.max(0.5, Math.round((d.oferta + Number(dir)) * 10) / 10); this.careerNegociar(id, pid); },
      nInt: (dir) => {
        const lista = [null, ...mios.map((p) => p.id)];
        d.intercambio = lista[(lista.indexOf(d.intercambio) + Number(dir) + lista.length) % lista.length];
        this.careerNegociar(id, pid);
      },
      nPor: (dir) => { d.porcentaje = PORC[(PORC.indexOf(d.porcentaje) + Number(dir) + PORC.length) % PORC.length]; this.careerNegociar(id, pid); },
      nEnviar: () => this.responderOferta(id, pid, false),
      nDeleg: () => this.responderOferta(id, pid, true),
      nContrato: (nid) => this.careerContrato(id, nid),
      back: () => { this.state.nDraft = null; this.state.nChat = null; this.careerIntereses(id); },
    }, () => { this.state.nDraft = null; this.state.nChat = null; this.careerIntereses(id); }, true);
    if (!chat.escrita) {
      chat.escrita = true;
      this.cineEscribir(chat.respuesta);
    }
  }

  /** Envía la oferta desde la escena: el DT del club responde en el diálogo. */
  responderOferta(id, pid, delegar) {
    const cc = cargarCarrera(id);
    const d = this.state.nDraft || { oferta: 0 };
    const chat = this.state.nChat || (this.state.nChat = { pid, respuesta: '', tuLinea: '', escrita: false });
    // Solo cuenta la última oferta: se quitan las anteriores que el club ya rechazó o contraatacó
    cc.negociaciones = (cc.negociaciones || []).filter((n) => !(n.pid === pid && (n.estado === 'rechazada' || n.estado === 'contra')));
    const cambio = (cc.plantillas[cc.clubId] || []).find((p) => p.id === d.intercambio);
    const r = ofertarCompra(cc, pid, d.oferta, { intercambio: d.intercambio, porcentaje: d.porcentaje, delegar });
    guardarCarrera(cc);
    this.game.audio.ui(r.ok ? 'ok' : 'back');
    chat.tuLinea = delegar
      ? 'Prefiero que lo decida la directiva. Mañana me dices.'
      : `Te ofrezco ${d.oferta.toFixed(1)} M€${cambio ? ` más ${cambio.short}` : ''}${d.porcentaje ? ` y un ${d.porcentaje} % de futura venta` : ''}.`;
    chat.respuesta = delegar
      ? 'Lo consultaré con la directiva. Te avisamos en la próxima jornada.'
      : r.msg;
    chat.escrita = false;
    this.careerNegociar(id, pid);
  }

  /** Negociaciones: ofertas con respuesta de los clubes, ofertas entrantes y acuerdos pendientes de contrato. */
  careerNegociaciones(id) {
    const c = cargarCarrera(id);
    if (!c || c.modo !== 'dt') { this.careerHub(id); return; }
    this.state.carId = id;
    generarEntrantes(c);
    guardarCarrera(c);
    const msg = this.state.carMsg || '';
    this.state.carMsg = '';
    const abiertas = (c.negociaciones || []).filter((n) => n.estado !== 'cerrada');
    const etiqueta = {
      club_ok: 'ACUERDO CON EL CLUB', contra: 'CONTRAOFERTA', delegada: 'DELEGADA EN LA DIRECTIVA',
      abierta: 'OFERTA DE UN CLUB', rechazada: 'RECHAZADA',
    };
    const filas = abiertas.map((n) => {
      let botones;
      if (n.estado === 'club_ok') {
        botones = `<button class="btn sm go" data-nav data-act="nCont" data-arg="${n.id}">NEGOCIAR CONTRATO</button>
          <button class="btn sm" data-nav data-act="nRech" data-arg="${n.id}">RECHAZAR</button>`;
      } else if (n.estado === 'delegada') {
        botones = '<span class="mute sm">Respuesta en la próxima jornada</span>';
      } else if (n.estado === 'rechazada') {
        botones = `<button class="btn sm" data-nav data-act="nRech" data-arg="${n.id}">CERRAR</button>`;
      } else {
        botones = `<button class="btn sm go" data-nav data-act="nAcep" data-arg="${n.id}">ACEPTAR</button>
          <button class="btn sm" data-nav data-act="nRech" data-arg="${n.id}">RECHAZAR</button>`;
      }
      return `<div class="tr-row tr-neg">
        <span class="tr-tag${n.estado === 'rechazada' ? ' no' : ''}">${etiqueta[n.estado] || etiqueta[n.tipo] || ''}</span>
        <span class="tr-name">${esc(n.msg)}</span>
        <span class="mk-price">${n.pide.toFixed(1)} M€</span>
        ${botones}
      </div>`;
    }).join('');
    this.hubLayout(c, 'reclutamiento', `
      <header class="car-head"><div><b>NEGOCIACIONES ACTIVAS</b><small>Clubes que quieren tus jugadores y fichajes en curso · Presupuesto ${c.caja[c.clubId].toFixed(1)} M€</small></div></header>
      ${msg ? `<p class="car-msg">${esc(msg)}</p>` : ''}
      <div class="pl-list">${filas || '<p class="mute">No hay negociaciones activas. Haz una oferta desde Intereses o espera a las ofertas de los clubes.</p>'}</div>
      <div class="report-btns car-foot"><button class="btn" data-nav data-act="back" data-default>VOLVER</button></div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      nAcep: (nid) => {
        const cc = cargarCarrera(id);
        const r = aceptarNegociacion(cc, nid);
        guardarCarrera(cc);
        this.state.carMsg = r.msg;
        this.game.audio.ui(r.ok ? 'ok' : 'back');
        this.careerNegociaciones(id);
      },
      nRech: (nid) => { const cc = cargarCarrera(id); cerrarNegociacion(cc, nid); guardarCarrera(cc); this.careerNegociaciones(id); },
      nCont: (nid) => this.careerContrato(id, nid),
      back: () => this.careerMarket(id),
    }, () => this.careerMarket(id), true);
  }

  /** Mesa con el jugador y su agente: rol, duración, sueldo, primas y cláusula de rescisión. */
  careerContrato(id, nid) {
    const c = cargarCarrera(id);
    const n = c && (c.negociaciones || []).find((x) => x.id === nid);
    if (!n || n.estado !== 'club_ok') { this.careerNegociaciones(id); return; }
    const j = jugadorDelMundo(c, n.pid);
    if (!j) { this.state.carMsg = 'Ese jugador ya no está disponible.'; this.careerNegociaciones(id); return; }
    if (!this.state.cDraft || this.state.cDraft.nid !== nid) {
      this.state.cDraft = { nid, rol: 'importante', anios: 3, sueldo: null, primas: { goles: false, partidos: false, titulo: false },
        clausula: Math.round(valorDe(j.p) * 1.5 * 10) / 10 };
    }
    const d = this.state.cDraft;
    const cond = () => ({ rol: d.rol, anios: d.anios, primas: { ...d.primas }, clausula: d.clausula, sueldo: d.sueldo || 0 });
    if (d.sueldo == null) d.sueldo = Math.round(sueldoMinimo(c, j.p, cond()) * 100) / 100;
    const minimo = sueldoMinimo(c, j.p, cond());
    const ev = contratoEvaluar(c, nid, cond());
    const agente = {
      sonrisa: 'SONRÍE Y ESTRECHA LA MANO', brazos: 'SE CRUZA DE BRAZOS', niega: 'NIEGA CON LA CABEZA',
    }[ev.reaccion];
    const prima = (k, t) => `<button class="btn sm${d.primas[k] ? ' go' : ''}" data-nav data-act="cPrima" data-arg="${k}">${t}${d.primas[k] ? ' ✔' : ''}</button>`;
    this.hubLayout(c, 'reclutamiento', `
      <header class="car-head"><div><b>NEGOCIAR CONTRATO</b><small>${esc(j.p.name)} · ${j.p.pos} · ${j.p.ovr} de media</small></div></header>
      <div class="car-player">
        <div class="row" data-nav data-adj="cRol"><span class="row-l">ROL EN LA PLANTILLA</span><span class="row-v"><button class="arrow sm" data-act="cRol" data-arg="-1">◀</button><b>${ROLES_NOMBRE[d.rol]}</b><button class="arrow sm" data-act="cRol" data-arg="1">▶</button></span></div>
        <div class="row" data-nav data-adj="cAnios"><span class="row-l">DURACIÓN</span><span class="row-v"><button class="arrow sm" data-act="cAnios" data-arg="-1">◀</button><b>${d.anios} ${d.anios === 1 ? 'AÑO' : 'AÑOS'}</b><button class="arrow sm" data-act="cAnios" data-arg="1">▶</button></span></div>
        <div class="row" data-nav data-adj="cSueldo"><span class="row-l">SUELDO SEMANAL</span><span class="row-v"><button class="arrow sm" data-act="cSueldo" data-arg="-0.05">−</button><b>${d.sueldo.toFixed(2)} M€</b><button class="arrow sm" data-act="cSueldo" data-arg="0.05">+</button></span></div>
        <div class="row" data-nav data-adj="cClau"><span class="row-l">CLÁUSULA DE RESCISIÓN</span><span class="row-v"><button class="arrow sm" data-act="cClau" data-arg="-1">−</button><b>${d.clausula.toFixed(1)} M€</b><button class="arrow sm" data-act="cClau" data-arg="1">+</button></span></div>
        <h3 class="car-h">PRIMAS</h3>
        <div class="tr-filters">${prima('goles', 'Por goles')} ${prima('partidos', 'Por partidos jugados')} ${prima('titulo', 'Si gana un título')}</div>
        <div class="ag-box ag-${ev.reaccion}">
          <div><b>AGENTE · ${esc(agente)}</b><p>${esc(ev.msg)}</p><small>Sueldo mínimo que acepta: ${minimo.toFixed(2)} M€ por semana</small></div>
        </div>
        <div class="report-btns car-foot">
          <button class="btn go" data-nav data-act="cFirmar" data-default ${ev.resultado === 'firma' ? '' : 'disabled'}>FIRMAR CONTRATO ▶</button>
          <button class="btn" data-nav data-act="back">VOLVER</button>
        </div>
      </div>
      ${this.hint([['↑ ↓', 'Moverse'], ['← →', 'Ajustar'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      cRol: (dir) => { d.rol = ROLES[(ROLES.indexOf(d.rol) + Number(dir) + ROLES.length) % ROLES.length]; this.careerContrato(id, nid); },
      cAnios: (dir) => { d.anios = clamp(d.anios + Number(dir), 1, 5); this.careerContrato(id, nid); },
      cSueldo: (dir) => { d.sueldo = Math.max(0.05, Math.round((d.sueldo + Number(dir)) * 100) / 100); this.careerContrato(id, nid); },
      cClau: (dir) => { d.clausula = Math.max(1, Math.round((d.clausula + Number(dir)) * 10) / 10); this.careerContrato(id, nid); },
      cPrima: (k) => { d.primas[k] = !d.primas[k]; this.careerContrato(id, nid); },
      cFirmar: () => {
        const cc = cargarCarrera(id);
        const r = firmarContrato(cc, nid, cond());
        guardarCarrera(cc);
        if (r.ok) { this.state.cDraft = null; this.careerFirma(id, r); return; }
        this.state.carMsg = r.msg;
        this.game.audio.ui('back');
        if (r.ev && r.ev.resultado === 'ruptura') { this.state.cDraft = null; this.careerNegociaciones(id); return; }
        this.careerContrato(id, nid);
      },
      back: () => { this.state.cDraft = null; this.careerNegociaciones(id); },
    }, () => { this.state.cDraft = null; this.careerNegociaciones(id); }, true);
  }

  /** Cinemática de la firma: la puerta, las miradas, el contrato y la foto con la camiseta. Termina en el menú principal. */
  careerFirma(id, res) {
    const c = cargarCarrera(id);
    const club = c ? getTeam(c.clubId) : null;
    const lineas = [
      'La puerta se abre. Entran el jugador y su agente, con traje y expresión seria.',
      'Se miran a los ojos y hablan de dinero. Nadie aparta la vista.',
      'Firman el contrato. El bolígrafo pasa de mano en mano.',
      `Posan con la camiseta de ${club ? club.name : 'el club'}, con el ${res.dorsal} y el nombre de ${res.short}. Bienvenido.`,
    ];
    this.cineSecuencia(lineas, club ? club.home : null, { nombre: `FIRMA · ${club ? club.short : ''}`, dorsal: res.dorsal, short: res.short }, () => {
      this.cineParar();
      this.game.toast(`Fichaje oficial: ${res.short} se incorpora a la plantilla.`);
      this.main();
    });
  }

  /** Secuencia de texto sobre la escena de la firma: CONTINUAR completa o avanza, y al final ejecuta `alFinal`. */
  cineSecuencia(lineas, kit, firma, alFinal, paso = 0) {
    const ultimo = paso >= lineas.length - 1;
    this.render('cine', `
      <div class="cine">
        <div class="cine-escena">${escenaFirma(kit, firma)}</div>
        <div class="cine-txt"><span class="cine-nombre">${esc(firma.nombre)}</span><p id="cine-p" aria-live="polite"></p></div>
        <div class="cine-btns"><button class="btn go" data-nav data-act="cSig" data-default>${ultimo ? 'CONTINUAR ▶' : 'SIGUIENTE ▶'}</button></div>
      </div>`, {
      cSig: () => {
        if (this.cineEscribiendo) { this.cineTerminar(); return; }
        if (!ultimo) { this.cineSecuencia(lineas, kit, firma, alFinal, paso + 1); return; }
        alFinal();
      },
    }, () => { this.cineParar(); this.main(); }, true);
    this.cineEscribir(lineas[paso]);
  }

  /** UEFA Champions League dentro de la carrera: fase actual, tu partido, grupos y eliminatoria. */
  careerChampions(id) {
    const c = cargarCarrera(id);
    if (!c) { this.careerMenu(); return; }
    this.state.carId = id;
    const t = championsDe(c);
    const fase = fasePendiente(t);
    const mio = partidoDelClub(t, c.clubId);
    guardarCarrera(c);
    const participa = t.equipos.includes(c.clubId);
    const jug = c.modo === 'jugador';
    const nom = (cid) => { const x = getTeam(cid); return esc(x.short || x.name); };
    const estado = t.campeon
      ? `CAMPEÓN: ${esc(getTeam(t.campeon).name)}`
      : (fase ? esc(fase.nombre) : '');
    const grupos = t.grupos ? t.grupos.map((gr) => {
      const tb = tablaGrupo(gr);
      return `<div class="ch-grp"><h4>GRUPO ${gr.nombre}</h4>
        ${tb.map((x, i) => `<div class="ch-row${x.id === c.clubId ? ' me' : ''}"><span>${i + 1}</span><span>${nom(x.id)}</span><span>${x.pj}</span><b>${x.pts}</b></div>`).join('')}</div>`;
    }).join('') : '';
    const ko = t.rondas.filter((r) => r.partidos.some((p) => p.a)).map((r) => `
      <div class="ch-ronda"><h4>${esc(r.nombre)}</h4>
        ${r.partidos.map((p) => `<div class="ch-match${p.a === c.clubId || p.b === c.clubId ? ' me' : ''}">
          <span>${nom(p.a)}</span><b>${p.ga == null ? '–' : `${p.ga} - ${p.gb}`}</b><span>${nom(p.b)}</span>${p.penaltis ? '<i>pen.</i>' : ''}</div>`).join('')}
      </div>`).join('');
    const botones = t.campeon ? '' : `
      ${mio ? `<button class="btn go" data-nav data-act="chPlay" data-arg="${id}" data-default>JUGAR MI PARTIDO EN 3D ▶</button>` : ''}
      ${mio && !jug ? `<button class="btn" data-nav data-act="chWatch" data-arg="${id}">VER PARTIDO SIN CONTROLAR</button>` : ''}
      ${fase ? `<button class="btn" data-nav data-act="chSim" data-arg="${id}" ${mio ? '' : 'data-default'}>SIMULAR FASE</button>` : ''}`;
    this.render('chmp', `
      <header class="car-head">
        <div><b>${esc(UEFA_NOMBRE)}</b><small>${esc(getTeam(c.clubId).name)} · ${participa ? 'CLASIFICADO' : 'NO CLASIFICADO · puedes simular las fases'}</small></div>
        <div class="car-season">${estado}</div>
      </header>
      ${mio ? `<p class="car-sum">Tu próximo partido: <b>${nom(mio.p.a)} – ${nom(mio.p.b)}</b></p>` : ''}
      <div class="ch-wrap">
        ${grupos ? `<div class="ch-grupos">${grupos}</div>` : ''}
        ${ko ? `<div class="ch-ko">${ko}</div>` : ''}
      </div>
      <div class="report-btns car-foot">${botones}<button class="btn" data-nav data-act="back">VOLVER A LA CARRERA</button></div>
      ${this.hint([['↑ ↓', 'Moverse'], ['ENTER', 'Elegir'], ['ESC', 'Volver']])}
    `, {
      chPlay: (cid) => this.game.startChampions(cid, false),
      chWatch: (cid) => this.game.startChampions(cid, true),
      chSim: (cid) => {
        const cc = cargarCarrera(cid);
        if (cc) { simularFase(championsDe(cc)); guardarCarrera(cc); }
        this.game.audio.ui('ok');
        this.careerChampions(cid);
      },
      back: () => this.careerHub(id),
    }, () => this.careerHub(id), true);
  }

  careerSeason(id) {
    const c = cargarCarrera(id);
    if (!c || !c.fin) { this.careerHub(id); return; }
    this.state.carId = id;
    const f = c.fin;
    const club = getTeam(c.clubId);
    const campeonTxt = f.campeon === c.clubId ? '¡Campeón de liga!' : `Campeón: ${esc(getTeam(f.campeon).name)}`;
    const cabecera = `
      <div class="report-tag">FIN DE TEMPORADA ${f.temporada}</div>
      <h1 class="verdict">${f.posicion}º CLASIFICADO</h1>
      <p class="car-sum">${esc(club.name)} · ${f.puntos} puntos · ${campeonTxt}</p>
      <p class="car-sum">Reputación ${f.delta >= 0 ? '+' : ''}${f.delta} → <b>${c.reputacion}</b></p>`;
    if (c.modo === 'jugador') {
      const yo = c.jugador;
      this.render('carseason', `
        <div class="report">
          ${cabecera}
          <p class="car-sum">${esc(yo.name)} · ${yo.stats.goles} goles · ${yo.stats.asistencias} asistencias · Media ${yo.ovr}</p>
          <h3 class="car-h">CONTRATOS</h3>
          <div class="mk-list car-contracts">
            ${f.contratos.map((k) => {
              const o = getTeam(k.clubId);
              return `<button class="mk-row" data-nav data-act="contract" data-arg="${k.clubId}">
                <img class="car-crest sm" src="${crestURL(o, 64)}" alt="">
                <span class="mk-name">${esc(o.name)}${k.actual ? ' <i class="mk-hurt">ACTUAL</i>' : ''}</span>
                <span class="mk-ovr">${o.ovr}</span>
                <b class="mk-price">${k.salario.toFixed(2)} M€/año</b>
              </button>`;
            }).join('')}
          </div>
          <p class="mute sm">Elige el club para la próxima temporada. Puedes quedarte en el tuyo con su oferta.</p>
        </div>
      `, {
        contract: (clubId) => {
          const cc = cargarCarrera(id);
          if (!cc) return;
          const k = cc.fin.contratos.find((x) => x.clubId === clubId);
          nuevaTemporada(cc, clubId, k ? k.salario : null);
          guardarCarrera(cc);
          this.game.audio.ui('ok');
          this.careerHub(id);
        },
      }, () => this.main(), true);
      return;
    }
    const hayOfertas = f.ofertas.length > 0;
    this.render('carseason', `
      <div class="report">
        ${cabecera}
        ${hayOfertas ? `
          <h3 class="car-h">OFERTAS DE OTROS CLUBES</h3>
          <div class="car-offers">
            ${f.ofertas.map((oid) => {
              const o = getTeam(oid);
              return `<button class="car-offer" data-nav data-act="offer" data-arg="${oid}">
                <img src="${crestURL(o, 96)}" alt=""><span><b>${esc(o.name)}</b><small>Media ${o.ovr}</small></span></button>`;
            }).join('')}
          </div>` : '<p class="mute sm">Ningún club te ha hecho una oferta esta temporada.</p>'}
        <div class="report-btns">
          <button class="btn go" data-nav data-act="stay" data-default>${hayOfertas ? 'SEGUIR EN ' + esc(club.short || club.name).toUpperCase() : 'EMPEZAR TEMPORADA ' + (f.temporada + 1)} ▶</button>
        </div>
      </div>
    `, {
      offer: (oid) => {
        const cc = cargarCarrera(id);
        if (!cc) return;
        nuevaTemporada(cc, oid, null);
        guardarCarrera(cc);
        this.game.audio.ui('ok');
        this.careerHub(id);
      },
      stay: () => {
        const cc = cargarCarrera(id);
        if (!cc) return;
        nuevaTemporada(cc, null, null);
        guardarCarrera(cc);
        this.game.audio.ui('ok');
        this.careerHub(id);
      },
    }, () => this.main(), true);
  }

  careerPointsHTML(i) {
    const txt = i.victoria ? `+${i.pts} puntos de mejora` : 'Sin puntos de mejora: solo se ganan al ganar el partido';
    const det = i.victoria ? ` (${i.goles} gol${i.goles === 1 ? '' : 'es'}, ${i.asistencias} asistencia${i.asistencias === 1 ? '' : 's'})` : '';
    return `<p class="car-pts"><b>${txt}</b>${det}</p>`;
  }

  attrsHTML(p) {
    return ATTR_KEYS.map((k) => `<span>${ATTR_LABELS[k]} <b>${p.attrs[k]}</b></span>`).join('');
  }
}
