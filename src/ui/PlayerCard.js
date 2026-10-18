// Carta de jugador estilo EA SPORTS FC: media y posición arriba, foto de perfil
// (render 3D), nombre, club y las seis estadísticas principales. El color de la
// carta depende de la media (oro, plata o bronce).

import { POS_LABEL } from '../data/TeamsData.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Las seis stats de la carta a partir de los atributos del juego. */
export function statsCarta(attrs) {
  const media2 = (a, b) => Math.round(((attrs[a] ?? 50) + (attrs[b] ?? 50)) / 2);
  return [
    { k: 'PAC', v: media2('ritmo', 'aceleracion') },
    { k: 'SHO', v: attrs.tiro ?? 50 },
    { k: 'PAS', v: attrs.pase ?? 50 },
    { k: 'DRI', v: media2('regate', 'control') },
    { k: 'DEF', v: attrs.defensa ?? 50 },
    { k: 'PHY', v: media2('fisico', 'fuerza') },
  ];
}

const tier = (ovr) => (ovr >= 85 ? 'oro' : ovr >= 75 ? 'plata' : 'bronce');

/**
 * HTML de la carta.
 * p: { name, pos, ovr, attrs, number, clubShort, crest (url o ''), photo (data URL o '') }
 */
export function tarjetaJugadorHTML(p) {
  const stats = statsCarta(p.attrs);
  const apellido = esc(String(p.name).trim().split(/\s+/).pop() || p.name);
  const nombre = esc(p.name);
  const foto = p.photo
    ? `<img class="jc-foto" src="${p.photo}" alt="">`
    : `<div class="jc-foto jc-sin-foto">${esc(String(p.name).trim()[0] || '?')}</div>`;
  return `
    <div class="jcard jcard-${tier(p.ovr)}">
      <div class="jc-cabecera">
        <div class="jc-ovr"><b>${p.ovr}</b><span>${POS_LABEL[p.pos] || p.pos}</span></div>
        ${p.crest ? `<img class="jc-club" src="${p.crest}" alt="">` : `<span class="jc-club jc-club-vacio">${esc(p.clubShort || 'LIBRE')}</span>`}
      </div>
      ${foto}
      <div class="jc-nombre" title="${nombre}">${apellido}</div>
      <div class="jc-linea"><span>${esc(p.clubShort || 'LIBRE')}</span><span>#${p.number}</span></div>
      <div class="jc-stats">
        ${stats.map((s) => `<div class="jc-stat"><b>${s.v}</b><span>${s.k}</span></div>`).join('')}
      </div>
    </div>`;
}
