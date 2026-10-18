// Menú principal del modo DT: navegación superior, panel de evento y tareas,
// y feed de noticias. Todo se calcula a partir del estado de la carrera, así que
// se actualiza solo al avanzar jornadas.

import { getTeam, ATTR_KEYS, ATTR_LABELS } from '../data/TeamsData.js';
import { ligas } from '../data/Custom.js';
import { FORMATIONS } from '../data/Formations.js';
import { tarjetaJugadorHTML } from './PlayerCard.js';
import { fotoJugador } from '../render/PlayerPreview.js';
import { crestURL as crestDeClub } from '../render/Crests.js';
import { crestURL } from '../render/Crests.js';
import { tablaDe, userFixture, ventanaAbierta, involucra, titularesDe, plantillaActiva, formacionPara, proximoEvento, cumpleObjetivo } from '../career/Career.js';
import { fechaActual, fechaLarga, fechaCorta, diasHasta, etiquetaTemporada, fechasLiga, fechasUCL } from '../career/Fechas.js';
import { championsDe, partidoDelClub } from '../data/Champions.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const DIAS_JORNADA = 7;
const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const pad = (n) => String(n).padStart(2, '0');

/** Fecha actual del juego: titulo («MIÉRCOLES, 01 DE JUL») y larga («1 de julio de 2025»). */
export function fechaJuego(c) {
  const ms = fechaActual(c);
  const d = new Date(ms);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return {
    titulo: fechaLarga(ms),
    larga: `${d.getUTCDate()} de ${meses[d.getUTCMonth()]} de ${d.getUTCFullYear()}`,
  };
}

/** Confianza de la directiva (0-99): sube si el club va por encima de su posición esperada. */
export function confianzaDirectiva(c) {
  if (c.jornada === 0) return 60;
  const tabla = tablaDe(c);
  const pos = tabla.findIndex((t) => t.id === c.clubId) + 1;
  const esperada = [...c.clubes].sort((a, b) => getTeam(b).ovr - getTeam(a).ovr).indexOf(c.clubId) + 1;
  return clamp(Math.round(55 + (esperada - pos) * 4), 5, 99);
}

/** Hash pequeño y estable para que los contadores de las noticias no cambien al redibujar. */
function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Tareas pendientes. La actual es la primera sin hacer según el progreso de la temporada. */
export function tareasDT(c) {
  const abierta = ventanaAbierta(c);
  const f = userFixture(c);
  // Un solo paso actual: primero conocer la plantilla, luego el mercado si está abierto y después el partido.
  const actual = c.jornada === 0 ? 0 : abierta ? 1 : 2;
  const textos = [
    { t: 'Conoce tu plantilla', i: 'plantilla' },
    { t: 'Revisa el mercado de fichajes', i: 'mercado' },
    { t: f ? `Prepara el partido de la jornada ${c.jornada + 1}` : 'Avanza a la siguiente jornada', i: 'partido' },
  ];
  return textos.map((x, k) => ({
    ...x,
    estado: k === actual ? 'actual' : k === 0 && c.jornada > 0 ? 'hecha' : 'pendiente',
  }));
}

/** Noticias del club: último resultado, líder de la liga y el mercado si está abierto. */
export function noticiasDT(c) {
  const club = getTeam(c.clubId);
  const fecha = fechaJuego(c).larga;
  const noticias = [];
  for (let j = c.jornada - 1; j >= 0; j--) {
    const f = c.calendario[j].find((x) => involucra(c, x));
    if (!f || !f.res) continue;
    const local = f.local === c.clubId;
    const rival = getTeam(local ? f.visitante : f.local);
    const mg = local ? f.res[0] : f.res[1], rg = local ? f.res[1] : f.res[0];
    const titulo = mg > rg ? `${club.name} gana ${mg}-${rg} a ${rival.name}`
      : mg < rg ? `${club.name} cae ${mg}-${rg} ante ${rival.name}`
      : `${club.name} y ${rival.name} empatan ${mg}-${rg}`;
    const resumen = mg > rg ? `Una victoria que sitúa al equipo en buena dinámica para la jornada ${j + 2}.`
      : mg < rg ? `Un resultado amargo que obliga a revisar el planteamiento antes del próximo partido.`
      : `Reparto de puntos en un partido igualado, con ocasiones para ambos.`;
    noticias.push({ id: `res${j}`, titulo, resumen, fecha, club: club, nuevo: j === c.jornada - 1 });
    break;
  }
  const tabla = tablaDe(c);
  const lider = getTeam(tabla[0].id);
  noticias.push({
    id: 'lider', titulo: `${lider.name} lidera la clasificación`,
    resumen: `Con ${tabla[0].pts} puntos tras ${tabla[0].pj} partidos, ${lider.name} marca el ritmo de la liga. ${club.name} ocupa la posición ${tabla.findIndex((t) => t.id === c.clubId) + 1}.`,
    fecha, club: lider, nuevo: c.jornada === 0,
  });
  if (ventanaAbierta(c)) {
    noticias.push({
      id: 'mercado', titulo: 'Se abre el mercado de fichajes',
      resumen: `La ventana de fichajes está abierta. Los clubes buscan refuerzos antes de la segunda parte de la temporada.`,
      fecha, club, nuevo: true,
    });
  }
  return noticias.map((n) => ({
    ...n,
    likes: 40 + (hash(n.id + c.temporada + c.jornada) % 900),
    comentarios: 3 + (hash(n.id + 'c' + c.jornada) % 120),
  }));
}

// ---------------------------------------------------------------- Iconos
const ICONO = {
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  trofeo: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H4v2a3 3 0 0 0 3 3M16 6h4v2a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6"/>',
  balon: '<circle cx="12" cy="12" r="9"/><path d="M12 8l3.5 2.5-1.3 4h-4.4l-1.3-4zM12 8V3M15.5 10.5l4.5-1.5M14.2 14.5l2.8 3.5M9.8 14.5l-2.8 3.5M8.5 10.5L4 9"/>',
  calendario: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  plantilla: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.8-3.5 3-5 6-5s5.2 1.5 6 5M14 20c.4-2 1.6-3 3.5-3s3.2 1 3.5 3"/>',
  mercado: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6-1 1.4-2.5 1.7-2.5.8-2.5 1.8 1 1.6 2.5 1.6 2.5-.5 2.5-1.5"/>',
  central: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  notif: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  oficina: '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M9 11h.01M15 11h.01"/>',
  corazon: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  comentario: '<path d="M4 5h16v11H9l-5 4z"/>',
  check: '<path d="M5 12l4 4 10-10"/>',
  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  tuerca: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5l1.6 2.6 3-.6.5 3 2.6 1.6-1.4 2.7 1.4 2.7-2.6 1.6-.5 3-3-.6L12 21.5l-1.6-2.6-3 .6-.5-3-2.6-1.6 1.4-2.7-1.4-2.7 2.6-1.6.5-3 3 .6z"/>',
};
export const icono = (k, size = 22) => `<svg class="ico-svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONO[k]}</svg>`;

// ------------------------------------------------------- Ilustración de fondo
/** Estadio en ilustración SVG, tintado con los colores del club. */
export function svgEstadio(a = '#0f6b8f', b = '#f26b3a') {
  return `<svg class="estadio" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050a14"/><stop offset="1" stop-color="#14263a"/></linearGradient>
      <linearGradient id="cesped" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7d3c"/><stop offset="1" stop-color="#215e2b"/></linearGradient>
      <radialGradient id="foco"><stop offset="0" stop-color="#fff6d1" stop-opacity=".9"/><stop offset="1" stop-color="#fff6d1" stop-opacity="0"/></radialGradient>
      <pattern id="asientos" width="18" height="14" patternUnits="userSpaceOnUse"><circle cx="9" cy="7" r="3" fill="#0b1220" opacity=".45"/></pattern>
    </defs>
    <rect width="1600" height="900" fill="url(#cielo)"/>
    <circle cx="180" cy="90" r="220" fill="url(#foco)"/><circle cx="1420" cy="90" r="220" fill="url(#foco)"/>
    <path d="M0 330 L1600 330 L1600 900 L0 900Z" fill="#0c1624"/>
    <path d="M120 360 L1480 360 L1640 900 L-40 900Z" fill="${a}" opacity=".85"/>
    <path d="M120 360 L1480 360 L1640 900 L-40 900Z" fill="url(#asientos)"/>
    <path d="M200 380 L1400 380 L1500 560 L100 560Z" fill="${b}" opacity=".5"/>
    <path d="M200 380 L1400 380 L1500 560 L100 560Z" fill="url(#asientos)"/>
    <path d="M250 560 L1350 560 L1420 900 L180 900Z" fill="url(#cesped)"/>
    <g fill="none" stroke="#e8f5e2" stroke-opacity=".55" stroke-width="4">
      <rect x="300" y="580" width="1000" height="300"/><line x1="800" y1="580" x2="800" y2="880"/>
      <circle cx="800" cy="730" r="70"/>
    </g>
    <rect x="0" y="0" width="1600" height="900" fill="#000" opacity=".15"/>
  </svg>`;
}

// ---------------------------------------------------------------- Bloques

/** Pestaña «Calendario»: jornadas de liga con su resultado y las fechas de la Champions. */
export function calendarioHTML(c) {
  const fl = fechasLiga(c);
  const filas = c.calendario.map((jor, j) => {
    const f = jor.find((x) => x.local === c.clubId || x.visitante === c.clubId);
    if (!f) return '';
    const esLocal = f.local === c.clubId;
    const rival = getTeam(esLocal ? f.visitante : f.local);
    let marcador = j < c.jornada ? '—' : 'PENDIENTE';
    if (f.res) marcador = esLocal ? `${f.res[0]} - ${f.res[1]}` : `${f.res[1]} - ${f.res[0]}`;
    return `<div class="cal-row${j === c.jornada ? ' hoy' : ''}">
      <span class="cal-j">J${j + 1}</span><span>${fechaCorta(fl[j])}</span>
      <span class="cal-h">${esLocal ? 'LOCAL' : 'VISITANTE'}</span><b>${esc(rival.short)}</b><span class="cal-m">${marcador}</span></div>`;
  }).join('');
  const etiquetas = ['Fase de grupos · Fecha 1', 'Fase de grupos · Fecha 2', 'Fase de grupos · Fecha 3', 'Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'];
  const participa = !!(c.champions && c.champions.equipos && c.champions.equipos.includes(c.clubId));
  const fu = fechasUCL(c);
  const ucl = etiquetas.map((e, i) => `<div class="cal-row"><span class="cal-j">${i + 1}</span><span>${fechaCorta(fu[i])}</span>
      <span class="cal-h">${participa ? 'PARTICIPAS' : 'NO CLASIFICADO'}</span><b>${esc(e)}</b><span></span></div>`).join('');
  return `<section class="hub-pagina">
    <h2>CALENDARIO · LIGA</h2><div class="cal-tabla">${filas}</div>
    <h2>UEFA CHAMPIONS LEAGUE</h2><div class="cal-tabla">${ucl}</div>
  </section>`;
}

/** Barra superior compartida por el inicio y las pestañas. */
export function navHTML(c, activa) {
  const club = getTeam(c.clubId);
  const conf = confianzaDirectiva(c);
  const pestanas = [
    ['Inicio', 'tabInicio', 'balon', 'inicio'],
    ['Central', 'tabCentral', 'central', 'central'],
    ['Notificaciones', 'tabNotif', 'notif', 'notif'],
    ['Plantilla', 'tabPlantilla', 'plantilla', 'plantilla'],
    ['Reclutamiento', 'tabMercado', 'mercado', 'reclutamiento'],
    ['Calendario', 'tabCalendario', 'calendario', 'calendario'],
    ['Oficina', 'tabOficina', 'oficina', 'oficina'],
  ];
  return `<nav class="hub-nav">
    <button class="hub-user" data-nav data-act="tabPerfil" data-arg="${c.id}" aria-label="Perfil">${icono('usuario', 20)}</button>
    <div class="hub-tabs">${pestanas.map(([t, act, ic, clave]) => `
      <button class="hub-tab${clave === activa ? ' on' : ''}" data-nav data-act="${act}" data-arg="${c.id}"${clave === 'inicio' ? ' data-default' : ''}>
        ${icono(ic, 16)}<span>${t}</span></button>`).join('')}</div>
    <button class="hub-gear" data-nav data-act="dtAjustes" data-arg="${c.id}" aria-label="Ajustes de la carrera" title="Ajustes">${icono('tuerca', 20)}</button>
    <div class="hub-club">
      <img src="${crestURL(club, 64)}" alt="">
      <div><b>${esc(club.name)}</b>
        <div class="hub-conf" title="Confianza de la directiva"><span>CONFIANZA</span><span class="hub-bar"><i style="width:${conf}%"></i></span><b>${conf}</b></div>
      </div>
    </div>
  </nav>`;
}

/** Pantalla principal del DT. */
export function hubDTHTML(c, msg = '') {
  const club = getTeam(c.clubId);
  const ahora = fechaActual(c);
  const fecha = fechaJuego(c);
  const ev = proximoEvento(c);
  const ref = partidoDelClub(championsDe(c), c.clubId);
  const dias = ev ? diasHasta(ev.fecha, ahora) : 0;
  let evento, jugable = null;
  if (ev && ev.tipo === 'ucl') {
    if (ref) {
      const local = ref.p.a === c.clubId;
      const rival = getTeam(local ? ref.p.b : ref.p.a);
      evento = {
        tipo: `UEFA CHAMPIONS LEAGUE · ${ev.nombre.toUpperCase()}`,
        titulo: `${local ? 'LOCAL' : 'VISITANTE'} vs ${rival.name.toUpperCase()}`,
        desc: `${club.name} se enfrenta a ${rival.name} el ${fechaCorta(ev.fecha)}.`, ico: 'trofeo',
      };
      jugable = 'ucl';
    } else {
      evento = {
        tipo: 'UEFA CHAMPIONS LEAGUE', titulo: ev.nombre.toUpperCase(),
        desc: 'Tu club no juega esta fase. Si avanzas, se simula.', ico: 'trofeo',
      };
    }
  } else if (ev) {
    const f = userFixture(c);
    const rival = f ? getTeam(f.local === c.clubId ? f.visitante : f.local) : null;
    const local = f && f.local === c.clubId;
    evento = rival
      ? { tipo: 'PRÓXIMO PARTIDO', titulo: `JORNADA ${c.jornada + 1} · ${local ? 'LOCAL' : 'VISITANTE'} vs ${rival.name.toUpperCase()}`, desc: `${club.name} se enfrenta a ${rival.name} el ${fechaCorta(ev.fecha)}.`, ico: 'balon' }
      : { tipo: 'LIGA', titulo: `JORNADA ${c.jornada + 1}`, desc: 'Jornada de liga.', ico: 'balon' };
    if (rival) jugable = 'liga';
  } else {
    evento = { tipo: 'TEMPORADA', titulo: 'SIN EVENTOS PENDIENTES', desc: 'La liga y la UEFA Champions League han terminado.', ico: 'trofeo' };
  }
  const tareas = tareasDT(c);
  const noticias = noticiasDT(c);
  const kit = club.home;
  return `
    <div class="hub-bg">${svgEstadio(kit.shirt, kit.accent)}</div>
    <div class="hub">
      ${navHTML(c, 'inicio')}
      <div class="hub-grid">
        <section class="hub-main">
          <h1 class="hub-fecha">${fecha.titulo}</h1>
          <p class="hub-sub">Siguiente evento en ${dias} días · Temporada ${etiquetaTemporada(c)}</p>
          <article class="hub-evento">
            <div class="hub-ico">${icono(evento.ico, 44)}</div>
            <div class="hub-evento-txt">
              <small>${evento.tipo}</small>
              <h2>${evento.titulo}</h2>
              <p>${evento.desc}</p>
            </div>
            <div class="hub-acc">
              ${ev ? `<button class="btn go" data-nav data-act="sim" data-arg="${c.id}" data-default>AVANZAR</button>` : ''}
              ${jugable === 'liga' ? `<button class="btn" data-nav data-act="play" data-arg="${c.id}">JUGAR EN 3D</button>` : ''}
              ${jugable === 'ucl' ? `<button class="btn" data-nav data-act="uclJugar" data-arg="${c.id}">JUGAR EN 3D</button>` : ''}
              <button class="btn" data-nav data-act="champ" data-arg="${c.id}">UEFA CHAMPIONS LEAGUE</button>
            </div>
            ${msg ? `<p class="car-msg hub-msg">${esc(msg)}</p>` : ''}
          </article>
          <h3 class="hub-h3">TAREAS PENDIENTES</h3>
          <ul class="hub-tareas">
            ${tareas.map((t) => `<li class="${t.estado}">${icono(t.i, 20)}<span>${esc(t.t)}</span>${t.estado === 'hecha' ? icono('check', 18) : ''}</li>`).join('')}
          </ul>
        </section>
        <aside class="hub-feed">
          ${noticias.map((n) => feedCardHTML(n)).join('')}
        </aside>
      </div>
    </div>`;
}

/** Tarjeta de noticia tipo publicación. */
export function feedCardHTML(n) {
  const k = n.club.home;
  return `<article class="feed-card">
    <header>
      <span class="feed-logo">PD</span>
      <div><b>PITCH DAILY</b><small>${esc(n.fecha)}</small></div>
      ${n.nuevo ? '<span class="feed-new">NUEVO</span>' : ''}
    </header>
    <div class="feed-img">${svgEstadio(k.shirt, k.accent)}</div>
    <h4>${esc(n.titulo)}</h4>
    <p>${esc(n.resumen)}</p>
    <footer>
      <span>${icono('corazon', 18)} ${n.likes}</span>
      <span>${icono('comentario', 18)} ${n.comentarios}</span>
    </footer>
  </article>`;
}

/** Pestaña «Central»: clasificación completa. */
export function centralHTML(c) {
  const tabla = tablaDe(c);
  return `<section class="hub-pagina">
    <h2>CENTRAL · CLASIFICACIÓN</h2>
    <div class="hub-tabla">
      <div class="ct ct-h"><span>#</span><span>CLUB</span><span>PJ</span><span>DG</span><span>PTS</span></div>
      ${tabla.map((t, i) => {
        const cl = getTeam(t.id);
        return `<div class="ct${t.id === c.clubId ? ' me' : ''}"><span>${i + 1}</span><span>${esc(cl.name)}</span><span>${t.pj}</span><span>${t.gf - t.gc}</span><b>${t.pts}</b></div>`;
      }).join('')}
    </div>
  </section>`;
}

/** Pestaña «Notificaciones»: todas las noticias y tareas. */
export function notifHTML(c) {
  return `<section class="hub-pagina">
    <h2>NOTIFICACIONES</h2>
    <div class="hub-notif-grid">${noticiasDT(c).map((n) => feedCardHTML(n)).join('')}</div>
  </section>`;
}

/** Posiciones a las que se puede mover un jugador. */
export const POSICIONES_CAMPO = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const ROLES = [['capitan', 'C', 'Capitán'], ['penales', 'P', 'Lanzador de penaltis'], ['faltas', 'F', 'Lanzador de faltas']];

// Foto de perfil de cada jugador: se genera una vez y se reutiliza mientras no cambie su aspecto.
const fotos = new Map();
function fotoDe(p, kit) {
  const clave = [p.id, p.skin, p.hair, p.hairStyle, p.height, p.number, p.pos, kit.shirt, kit.accent].join('|');
  if (!fotos.has(clave)) {
    let url = '';
    try {
      url = fotoJugador({ number: p.number, short: p.short, skin: p.skin, hair: p.hair, hairStyle: p.hairStyle, height: p.height, pos: p.pos }, kit);
    } catch (e) { url = ''; }
    fotos.set(clave, url);
  }
  return fotos.get(clave);
}

/** Pestaña «Plantilla»: campo con el once, lista de jugadores y panel de acciones del jugador elegido. */
export function plantillaHTML(c, opts = {}) {
  const { sel = null, det = false, msg = '', swap = null } = opts;
  const club = getTeam(c.clubId);
  const kit = club.home;
  const todos = [...c.plantillas[c.clubId]].sort((a, b) => b.ovr - a.ovr);
  const ids = titularesDe(c, c.clubId);                  // once en orden de huecos
  const titulares = new Set(ids);
  const porId = (id) => todos.find((p) => p.id === id);
  const roles = (c.roles && c.roles[c.clubId]) || {};
  const formacion = formacionPara(c, c.clubId, club.style.formation);
  const huecos = [{ role: 'GK', d: -0.5, w: 0 }, ...(FORMATIONS[formacion] || [])];
  const insignias = (pid) => ROLES.filter(([k]) => roles[k] === pid)
    .map(([k, l, t]) => `<i class="rol rol-${k}" title="${t}">${l}</i>`).join('');
  const estado = (p) => (p.lesion > 0 ? `LESIONADO · ${p.lesion} j.` : 'APTO');
  const carta = (p) => tarjetaJugadorHTML({
    name: p.name, pos: p.pos, ovr: p.ovr, attrs: p.attrs, number: p.number,
    clubShort: club.short, crest: crestDeClub(club, 48), photo: fotoDe(p, kit),
  });

  // Campo: cada titular en el hueco de su lista (i = índice en el once)
  const campo = huecos.map((hueco, i) => {
    const top = Math.max(18, Math.min(90, 90 - ((hueco.d + 0.5) / 1.4) * 70));
    const left = Math.max(16, Math.min(84, 50 + hueco.w * 36));
    const p = porId(ids[i]);
    if (!p) return `<div class="pj-hueco" style="top:${top}%;left:${left}%" data-slot="${i}">VACANTE</div>`;
    return `<button class="pj pj-carta${sel === p.id ? ' on' : ''}${p.lesion > 0 ? ' lesion' : ''}${swap && titulares.has(p.id) ? ' objetivo' : ''}" data-nav data-act="plSel" data-arg="${p.id}" data-slot="${i}" style="top:${top}%;left:${left}%" title="${esc(p.name)}">
      <span class="pj-cuerpo">${carta(p)}</span>
      <span class="pj-roles">${insignias(p.id)}</span>
    </button>`;
  }).join('');

  // Suplentes: tarjetas individuales
  const banca = todos.filter((p) => !titulares.has(p.id)).map((p) => `
    <button class="sup-card${swap === p.id ? ' on' : ''}${p.lesion > 0 ? ' lesion' : ''}" data-nav data-act="plSupl" data-arg="${p.id}" title="${esc(p.name)}">
      <span class="pj-cuerpo">${carta(p)}</span>
      <span class="sup-estado">${estado(p)}</span>
    </button>`).join('') || '<p class="mute sm">No hay suplentes en la plantilla.</p>';

  const jugador = todos.find((p) => p.id === sel);
  let panel = '<p class="mute">Pulsa un jugador del campo o de la banca para ver sus opciones.</p>';
  if (jugador) {
    const lesionado = jugador.lesion > 0;
    const tit = titulares.has(jugador.id);
    panel = `
      <div class="pl-cab">
        <span class="pl-cab-pos">${jugador.pos}</span>
        <div><b>${esc(jugador.name)}</b><small>#${jugador.number} · ${jugador.age} años · ${estado(jugador)}</small></div>
        <span class="pl-cab-ovr">${jugador.ovr}</span>
      </div>
      <div class="pl-acc">
        ${swap && swap !== jugador.id ? '<p class="car-msg">Pulsa un titular para sustituirlo por el suplente seleccionado.</p>' : ''}
        ${tit ? '' : `<button class="btn" data-nav data-act="plSupl" data-arg="${jugador.id}" ${lesionado ? 'disabled' : ''}>${swap === jugador.id ? 'CANCELAR SELECCIÓN' : 'SELECCIONAR PARA SUSTITUIR'}</button>`}
        <div class="pl-pos-sel">
          <span>POSICIÓN</span>
          <button class="arrow sm" data-nav data-act="plPos" data-arg="${jugador.id}:-1" aria-label="Posición anterior">◀</button>
          <b>${jugador.pos}</b>
          <button class="arrow sm" data-nav data-act="plPos" data-arg="${jugador.id}:1" aria-label="Posición siguiente">▶</button>
        </div>
        <button class="btn" data-nav data-act="plDet" data-arg="${jugador.id}">${det ? 'OCULTAR DETALLES' : 'VER DETALLES DEL JUGADOR'}</button>
        ${det ? `<div class="pl-attrs">${ATTR_KEYS.map((k) => `<div><span>${ATTR_LABELS[k]}</span><b>${jugador.attrs[k]}</b></div>`).join('')}</div>` : ''}
        <div class="pl-roles">
          <span>ROLES</span>
          ${ROLES.map(([k, l, t]) => `<button class="btn${roles[k] === jugador.id ? ' go' : ''}" data-nav data-act="plRol" data-arg="${jugador.id}:${k}">${roles[k] === jugador.id ? 'QUITAR' : 'ASIGNAR'} · ${t.toUpperCase()}</button>`).join('')}
        </div>
      </div>`;
  }

  return `<section class="hub-pagina">
    <h2>PLANTILLA · ${todos.length} JUGADORES</h2>
    ${msg ? `<p class="car-msg">${esc(msg)}</p>` : ''}
    <div class="plant-layout">
      <div class="pitch-wrap">
        <div class="pitch">${campo}</div>
        <p class="mute sm">${formacion} · Arrastra un titular sobre otro para intercambiar sus puestos. Pulsa un suplente y luego un titular para sustituirlo.</p>
      </div>
      <div class="pl-panel">${panel}</div>
    </div>
    <h3 class="hub-h3">SUPLENTES</h3>
    <div class="sup-grid">${banca}</div>
  </section>`;
}

const ligaNombreDe = (id) => { const l = ligas().find((x) => x.id === id); return l ? l.nombre : null; };

/** Pestaña «Oficina»: palmarés del club y objetivos de la directiva. */
export function oficinaHTML(c) {
  const club = getTeam(c.clubId);
  const pal = c.palmares || [];
  const titulosLiga = pal.filter((p) => p.campeon).length;
  const titulosUcl = pal.filter((p) => p.uclCampeon).length;
  const tabla = tablaDe(c);
  const pos = tabla.findIndex((t) => t.id === c.clubId) + 1;
  const objetivos = c.fin ? c.fin.objetivos || [] : (c.objetivos || []).map((o) => ({ ...o, cumplido: cumpleObjetivo(c, o, pos) }));
  const estado = (o) => {
    if (c.fin) return o.cumplido ? 'CUMPLIDO' : 'NO CUMPLIDO';
    if (o.cumplido) return 'CUMPLIDO';
    return c.jornada === 0 ? 'PENDIENTE' : 'EN CURSO';
  };
  const ligasIncl = c.dt && c.dt.ligas ? c.dt.ligas.map((id) => (ligaNombreDe(id))).filter(Boolean) : [];
  return `
    <section class="hub-pagina">
      <h2>OFICINA · ${esc(club.name)}</h2>
      <div class="car-info">
        <span>TÍTULOS DE LIGA <b>${titulosLiga}</b></span>
        <span>UEFA CHAMPIONS LEAGUE <b>${titulosUcl}</b></span>
        <span>REPUTACIÓN <b>${c.reputacion}</b></span>
        <span>PRESUPUESTO <b>${(c.caja[c.clubId] || 0).toFixed(1)} M€</b></span>
      </div>
      <h3 class="hub-h3">OBJETIVOS · TEMPORADA ${c.temporada}</h3>
      <ul class="hub-tareas">
        ${objetivos.map((o) => `<li class="${o.cumplido ? 'hecha' : 'pendiente'}"><span>${esc(o.texto)}</span><b>${estado(o)}</b></li>`).join('')}
      </ul>
      <h3 class="hub-h3">PALMARÉS</h3>
      ${pal.length ? `<div class="hub-tabla">
        <div class="ct ct-h pal"><span>TEMP.</span><span>LIGA</span><span>POS.</span><span>CHAMPIONS</span><span>OBJ.</span></div>
        ${pal.map((p) => `<div class="ct pal${p.campeon ? ' me' : ''}"><span>${p.temporada}</span><span>${p.campeon ? '🏆 Campeón' : '—'}</span><span>${p.posicion}º</span><span>${p.uclCampeon ? '🏆 Campeón' : '—'}</span><span>${p.objetivos ?? 0}/${p.objetivosTotal ?? 0}</span></div>`).join('')}
      </div>` : '<p class="mute">Aún no hay temporadas terminadas en tu palmarés.</p>'}
      ${ligasIncl.length ? `<p class="mute sm">Ligas incluidas en el mundo: ${esc(ligasIncl.join(' · '))}</p>` : ''}
    </section>`;
}
