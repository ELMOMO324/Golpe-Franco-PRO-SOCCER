// Orquestador: une menús, partido, vista 3D, sonido, comentarista, repeticiones
// y guardado. Lleva el bucle principal con simulación a paso fijo.

import { SIM_DT, STATE } from './Config.js';
import { Input, ESQUEMA_ALTERNATIVO } from './Input.js';
import { plataformaEfectiva, aplicarPlataforma } from './Plataforma.js';
import { TouchControls } from '../ui/TouchControls.js';
import { Gamepad } from './Gamepad.js';
import { SaveSystem } from './SaveSystem.js';
import { getTeam, TEAMS, ORIGINAL_CLUB_IDS } from '../data/TeamsData.js';
import { tacticsFromStyle } from '../match/Tactics.js';
import { PartidaAnfitrion, PartidaInvitado } from '../net/Partida.js';
import { cargarCarrera, guardarCarrera, prepararJornada, userFixture, registrarResultado, cerrarJornada, equipoPara, formacionPara, registrarPartidoJugador, cerrarFaseUCL } from '../career/Career.js';
import { championsDe, partidoDelClub, registrarPartido, indiceFase } from '../data/Champions.js';
import { Match } from '../match/Match.js';
import { UserControl } from '../match/UserControl.js';
import { TRAINING, keeperProfile } from '../match/Training.js';
import { findPassTarget, nearestToPoint } from '../match/Actions.js';
import { FRAME_SIZE } from '../match/Replay.js';
import { Renderer } from '../render/GL.js';
import { MatchView, viewSetup } from '../render/MatchView.js';
import { MenuScene, menuSetup } from '../render/MenuScene.js';
import { AudioEngine } from '../audio/Audio.js';
import { Commentary } from '../audio/Commentary.js';
import { UI } from '../ui/UI.js';
import { HUD } from '../ui/HUD.js';

const QUALITY = {
  baja: { dpr: 0.8, shadows: 0, crowd: 0.5 },
  media: { dpr: 1, shadows: 1024, crowd: 1 },
  alta: { dpr: 1.5, shadows: 2048, crowd: 1 },
};

export class Game {
  constructor(els) {
    this.els = els;
    this.canvas = els.canvas;
    this.save = new SaveSystem();
    this.input = new Input();
    this.pad = new Gamepad(this.input, null);
    this.pad.onAviso = (t) => this.toast(t);
    this.audio = new AudioEngine();
    this.commentary = new Commentary();
    this.renderer = new Renderer(this.canvas, { shadowSize: 2048 });
    // El navegador puede quitar la gráfica (memoria, suspensión, otra app): se avisa y se recupera
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.onGlPerdido(); });
    this.canvas.addEventListener('webglcontextrestored', () => this.onGlRecuperado());
    this.input.attachPointer(this.canvas);
    // Plataforma: PC o móvil (controles táctiles y adaptación de la interfaz)
    this.plataforma = plataformaEfectiva(this.save.settings.plataforma);
    aplicarPlataforma(this.plataforma);
    this.touch = this.plataforma === 'movil' ? new TouchControls(this.input) : null;
    this.ui = new UI(els.ui, this);
    this.pad.ui = this.ui;
    this.hud = new HUD(els.hud);
    this.mode = 'splash';
    this.match = null;
    this.careerCtx = null; // { id } cuando el partido en curso es de una carrera
    this.view = null;
    this.menuScene = null;
    this.user = null;
    this.paused = false;
    this.replay = null;
    this.acc = 0;
    this.last = 0;
    this.time = 0;
    this.resumedAt = 0;
    this.timers = [];
    this.lastCfg = null;
    this.crowdT = 0;
    this.introT = 0;
    this.commentary.onCaption = (text, dur) => this.hud.caption(text, dur);
    this.input.onAction((a, e) => this.onAction(a, e));
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'match' && !this.paused && this.match && this.match.state !== STATE.FULL_TIME) this.pause();
    });
    const unlock = () => this.audio.init();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  boot() {
    this.applySettings();
    this.buildMenuScene();
    this.hud.setVisible(false);
    this.ui.splash();
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  get quality() {
    // En móvil la calidad «alta» se limita a «media» para no sobrecalentar el dispositivo
    const q = this.save.settings.quality;
    if (this.plataforma === 'movil' && q === 'alta') return QUALITY.media;
    return QUALITY[q] || QUALITY.alta;
  }

  /** true si el jugador que controlas (o su equipo) tiene el balón. */
  tieneBalon() {
    const m = this.match;
    return !!(m && m.controlled && m.ball.owner && m.ball.owner.team === m.controlled.team);
  }

  /** Modo de dirección efectivo: en móvil siempre se usa el joystick (equivale a WASD). */
  modoDireccion() {
    return this.plataforma === 'movil' ? 'wasd' : (this.save.settings.controles || {}).modo;
  }

  /** Cambia la plataforma en caliente (desde Ajustes). */
  cambiarPlataforma(ajuste) {
    this.plataforma = plataformaEfectiva(ajuste);
    aplicarPlataforma(this.plataforma);
    if (this.touch) { this.touch.destruir(); this.touch = null; }
    if (this.plataforma === 'movil') this.touch = new TouchControls(this.input);
  }

  resize() {
    const q = this.quality;
    const device = Math.min(window.devicePixelRatio || 1, 2);
    const dpr = q.dpr < 1 ? Math.min(device, 1) * q.dpr : Math.min(device, q.dpr);
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.resize(w, h, dpr);
  }

  /** Aplica al teclado y al mando los controles que haya elegido el jugador. */
  applyControls() {
    const c = this.save.settings.controles || {};
    // Esquema: clásico (por defecto), alternativo (clic para pase y tiro) o personalizado (teclas propias)
    const esquema = c.esquema || 'clasico';
    const teclado = esquema === 'personalizado' ? c.teclado : esquema === 'alternativo' ? ESQUEMA_ALTERNATIVO : undefined;
    this.input.setKeyBindings(teclado);
    this.pad.setBindings(c.mando);
  }

  applySettings() {
    const s = this.save.settings;
    if (s.plataforma !== undefined && s.plataforma !== this._plataformaAjuste) { this._plataformaAjuste = s.plataforma; this.cambiarPlataforma(s.plataforma); }
    this.applyControls();
    this.audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx, crowd: s.crowd });
    this.commentary.voiceOn = !!s.voice;
    this.commentary.volume = s.master;
    this.commentary.voiceName = s.voiceName || null;
    this.commentary.pickVoice();
    this.hud.showCaptions = !!s.captions;
    this.hud.showRadar = !!s.radar;
    if (this.view && this.mode === 'match') this.view.director.setStyle(s.camera);
    const q = this.quality;
    if (this.renderer.shadowSize !== q.shadows) this.renderer.setShadowSize(q.shadows);
    this.resize();
  }

  toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else {
        const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) { /* no disponible en este visor */ }
  }

  /** Aviso breve sobre la pantalla (p. ej. mando conectado). */
  toast(texto) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = texto;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), 2800);
  }

  later(sec, fn) {
    const id = setTimeout(() => { this.timers = this.timers.filter((t) => t !== id); fn(); }, sec * 1000);
    this.timers.push(id);
  }

  clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  cut() {
    const f = this.els.fade;
    f.classList.remove('cut');
    void f.offsetWidth;
    f.classList.add('cut');
  }

  // ----------------------------------------------------------------- Menú
  buildMenuScene() {
    const last = this.save.data.last;
    const home = getTeam(last.home), away = getTeam(last.away);
    this.renderer.releaseAll();
    this.view = new MatchView(this.renderer, menuSetup(home, away, true, this.quality.crowd));
    this.view.director.setMode('menu');
    this.menuScene = new MenuScene();
    this.view.excite(0.03, 0.03);
  }

  enterMenu() {
    this.audio.init();
    this.audio.ui('ok');
    this.mode = 'menu';
    this.ui.main();
  }

  quitToMenu() {
    const careerId = this.careerCtx ? this.careerCtx.id : null;
    const champions = !!(this.careerCtx && this.careerCtx.champions);
    this.careerCtx = null;
    this.clearTimers();
    this.commentary.detach();
    this.audio.crowdStop();
    this.match = null;
    this.user = null;
    this.replay = null;
    this.paused = false;
    this.input.enabled = true;
    this.hud.setVisible(false);
    this.mode = 'menu';
    this.buildMenuScene();
    this.cut();
    if (careerId && champions) this.ui.careerChampions(careerId);
    else if (careerId) this.ui.careerHub(careerId);
    else this.ui.main();
  }

  // -------------------------------------------------------------- Partido
  /**
   * Partida en línea 1 contra 1. El anfitrión simula y envía las tácticas: el invitado
   * construye la misma plantilla (mismo orden de jugadores) con esas tácticas.
   */
  startNetMatch(rol, cfg, sala) {
    this.netSala = sala;
    const home = getTeam(cfg.home), away = getTeam(cfg.away);
    const s = this.save.settings;
    const tac = cfg.tacticas || { home: tacticsFromStyle(home.style), away: tacticsFromStyle(away.style) };
    const base = {
      home, away, homeTactics: tac.home, awayTactics: tac.away, homeKit: 'home', awayKit: undefined,
      difficulty: cfg.difficulty || s.difficulty, halfMinutes: cfg.halfMinutes || s.halfMinutes, night: s.night,
    };
    if (rol === 'anfitrion') this.startMatch({ ...base, userSide: 0, guestSide: 1, net: 'anfitrion' });
    else this.startMatch({ ...base, userSide: 1, guestSide: 0, net: 'invitado', remote: true });
  }

  /** Configuración de una partida en línea (la prepara el anfitrión). Solo clubes originales: ambos los tienen. */
  configurarPartidaOnline() {
    const solo = (id, fallback) => (ORIGINAL_CLUB_IDS.includes(id) ? id : fallback);
    const last = this.save.data.last || {};
    const home = solo(last.home, 'bcu'), away = solo(last.away, 'mdr');
    const h = getTeam(home), a = getTeam(away);
    const s = this.save.settings;
    return {
      home, away, halfMinutes: s.halfMinutes, difficulty: s.difficulty,
      tacticas: { home: this.ui.tacticsFor(h), away: tacticsFromStyle(a.style) },
    };
  }

  startMatch(cfg) {
    this.clearTimers();
    this.lastCfg = cfg;
    this.commentary.detach();
    this.renderer.releaseAll();
    const match = new Match({ ...cfg, external: true });
    this.match = match;
    this.user = null;
    this.net = null;
    if (cfg.net === 'invitado') {
      // Réplica: no hay control local ni simulación; el estado llega del anfitrión
      this.net = new PartidaInvitado(this.netSala, match);
    } else if (match.userTeam) {
      this.user = new UserControl(match, this.input);
      match.user = this.user;
      if (cfg.net === 'anfitrion') this.net = new PartidaAnfitrion(this.netSala, match);
    }
    if (cfg.controlId && match.userTeam) {
      const p = match.roster.find((x) => x.data && x.data.id === cfg.controlId);
      if (p) { match.lockedPlayer = p; match.setControlled(p); }
    }
    this.view = new MatchView(this.renderer, viewSetup(match, cfg.night, this.quality.crowd));
    this.view.director.setStyle(this.save.settings.camera);
    this.view.capture(match);
    this.view.director.setMode('intro');
    this.menuScene = null;
    this.bindMatch(match);
    this.hud.setMatch(match);
    this.hud.setVisible(true);
    this.ui.hide();
    this.mode = 'match';
    this.paused = false;
    this.replay = null;
    this.trainWait = false;
    this.acc = 0;
    this.introT = 0;
    this.input.reset();
    this.input.enabled = true;
    this.audio.music(null);
    this.audio.crowdStart();
    this.audio.crowdSet(0.4);
    this.updateScoreboard();
    this.cut();
    const [h, a] = match.teams;
    this.hud.banner(`${h.name}  ·  ${a.name}`, 'ENTER o ESPACIO para empezar', 5.5, 'intro');
  }

  /** Empieza tu partido de la jornada. watch = DT viendo sin controlar a nadie concreto. */
  startCareer(id, watch) {
    const c = cargarCarrera(id);
    if (!c || c.fin) return;
    prepararJornada(c);
    const f = userFixture(c);
    guardarCarrera(c);
    if (!f || f.res) { this.ui.careerHub(id); return; }
    const home = equipoPara(c, f.local), away = equipoPara(c, f.visitante);
    const s = this.save.settings;
    const tacOf = (t) => {
      const base = t.id === c.clubId ? this.ui.tacticsFor(t) : tacticsFromStyle(t.style);
      return { ...base, formation: formacionPara(c, t.id, base.formation) };
    };
    this.careerCtx = { id };
    this.careerPointsInfo = null;
    this.startMatch({
      home, away, homeTactics: tacOf(home), awayTactics: tacOf(away),
      homeKit: 'home', awayKit: undefined,
      difficulty: c.dificultad || s.difficulty, halfMinutes: s.halfMinutes,
      userSide: watch ? null : (f.local === c.clubId ? 0 : 1),
      controlId: c.modo === 'jugador' && !watch ? 'yo' : null,
      night: s.night,
    });
  }

  /** Partido de la UEFA Champions del club del jugador en la fase actual. watch = DT sin controlar. */
  startChampions(id, watch) {
    const c = cargarCarrera(id);
    if (!c) return;
    const t = championsDe(c);
    const ref = partidoDelClub(t, c.clubId);
    guardarCarrera(c);
    if (!ref) { this.ui.careerChampions(id); return; }
    const equipo = (cid) => (cid === c.clubId ? equipoPara(c, cid) : getTeam(cid));
    const home = equipo(ref.p.a), away = equipo(ref.p.b);
    const s = this.save.settings;
    const tacOf = (tm) => {
      const base = tm.id === c.clubId ? this.ui.tacticsFor(tm) : tacticsFromStyle(tm.style);
      return { ...base, formation: formacionPara(c, tm.id, base.formation) };
    };
    this.careerCtx = { id, champions: true };
    this.careerPointsInfo = null;
    this.startMatch({
      home, away, homeTactics: tacOf(home), awayTactics: tacOf(away),
      homeKit: 'home', awayKit: undefined,
      difficulty: c.dificultad || s.difficulty, halfMinutes: s.halfMinutes,
      userSide: watch ? null : (ref.p.a === c.clubId ? 0 : 1),
      controlId: c.modo === 'jugador' && !watch ? 'yo' : null,
      night: s.night,
    });
  }

  restartMatch() {
    if (this.lastCfg) this.startMatch(this.lastCfg);
  }

  /** La gráfica 3D se ha perdido: se detiene la simulación y se muestra un aviso con la opción de recuperar. */
  onGlPerdido() {
    this.glPerdido = true;
    this.paused = true;
    let a = document.getElementById('gl-aviso');
    if (!a) {
      a = document.createElement('div');
      a.id = 'gl-aviso';
      a.className = 'gl-aviso';
      a.innerHTML = `<div class="gl-aviso-caja">
        <p>La imagen 3D se ha interrumpido porque el dispositivo ha liberado la gráfica.</p>
        <button class="btn go" id="gl-recargar">RECUPERAR IMAGEN</button></div>`;
      document.body.appendChild(a);
      a.querySelector('#gl-recargar').addEventListener('click', () => location.reload());
    }
    a.hidden = false;
  }

  /** Tras recuperar la gráfica se crean de nuevo los recursos y el partido vuelve a empezar. */
  onGlRecuperado() {
    this.glPerdido = false;
    const a = document.getElementById('gl-aviso');
    if (a) a.hidden = true;
    if (!this.lastCfg) { location.reload(); return; }
    try {
      this.renderer = new Renderer(this.canvas, { shadowSize: 2048 });
      this.restartMatch();
    } catch (e) {
      location.reload();
    }
  }

  updateScoreboard(banner) {
    const m = this.match;
    if (!m || !this.view) return;
    this.view.setScoreboard({
      home: m.teams[0].data, away: m.teams[1].data,
      score: [m.teams[0].score, m.teams[1].score],
      clock: m.clockText().slice(0, 2) + "'", banner,
    });
  }

  bindMatch(m) {
    const a = this.audio, hud = this.hud;
    const homeIs = (team) => team === m.teams[0];
    m.on('kick', (d) => a.kick(d.speed / 28, d.type === 'pass' || d.type === 'throw'));
    m.on('bounce', (d) => a.bounce(d.v));
    m.on('net', () => a.net());
    m.on('post', (d) => { a.post(d.speed); if (d.speed > 6) { a.ooh(0.9); this.view.excite(0.5, 0.5, 0.6); } });
    m.on('whistle', (d) => a.whistle(d.kind));
    m.on('tackleStart', (d) => a.tackle(d.slide));
    m.on('touch', (d) => { if (d.speed > 8) a.kick(Math.min(0.5, d.speed / 40), true); });
    m.on('shot', (d) => { if (d.xg > 0.25) { a.cheer(0.2, 1.4); this.view.excite(homeIs(d.team) ? 0.45 : 0.1, homeIs(d.team) ? 0.1 : 0.45, 0.8); } });
    m.on('save', (d) => { if (!d.claim) { a.ooh(0.7); this.view.excite(0.35, 0.35, 0.5); } });
    m.on('goal', (d) => {
      const home = homeIs(d.team);
      a.cheer(home ? 1 : 0.45, home ? 6 : 3.5);
      if (!home) a.boo(0.3);
      a.crowdSet(home ? 0.9 : 0.3);
      this.view.excite(home ? 1 : 0.02, home ? 0.02 : 1, 7);
      hud.goal(d);
      this.updateScoreboard('¡GOL DE ' + d.team.name.toUpperCase() + '!');
      this.view.director.setMode('goal', {}, false);
    });
    m.on('out', (d) => {
      const names = { CORNER: '¡CÓRNER!', THROW_IN: 'SAQUE DE BANDA', GOAL_KICK: 'SAQUE DE PUERTA' };
      hud.banner(names[d.kind], d.team.name, 1.8);
    });
    m.on('foul', (d) => {
      hud.banner(d.penalty ? '¡PENALTI!' : 'FALTA', `${d.offender.data.short} (${d.offender.team.short})`, 2.4, d.penalty ? 'alert' : '');
      if (!homeIs(d.offender.team)) a.boo(d.penalty ? 1 : 0.5); else a.ooh(0.3);
    });
    m.on('card', (d) => {
      hud.card(d.player, d.card);
      hud.banner(d.card === 'yellow' ? 'TARJETA AMARILLA' : 'TARJETA ROJA', d.player.data.name, 2.4, d.card === 'yellow' ? 'yellow' : 'alert');
    });
    m.on('offside', (d) => hud.banner('FUERA DE JUEGO', d.player.data.short, 1.8));
    m.on('setPiece', (d) => {
      this.cut();
      this.view.hasPrev = false;
      this.view.director.setMode('tv', d.type === 'PENALTY' ? { zoom: -7 } : d.type === 'CORNER' ? { zk: 0.46, zoom: 4.5 } : {}, true);
      if (d.type === 'PENALTY') hud.banner('PENALTI', d.team.name, 2.2, 'alert');
      this.updateScoreboard();
    });
    m.on('restart', () => { this.view.director.params = {}; });
    m.on('substitution', (d) => hud.banner('CAMBIO', `${d.in.name} entra · ${d.out.name} sale`, 2.2));
    m.on('trainingEnd', (d) => {
      const s = d.session;
      const aciertos = s.results.filter((r) => r.ok).length;
      hud.banner(d.label, `${aciertos} de ${s.results.length} aciertos`, 2.2, d.ok ? 'yellow' : 'alert');
      if (s.results.length >= s.total) {
        this.later(2.6, () => { if (this.match === m) this.endTraining(); });
      } else {
        this.later(1.2, () => {
          if (this.match !== m) return;
          this.trainWait = true;
          hud.banner('ENTER para el siguiente intento', `${s.results.length} de ${s.total}`, 999);
        });
      }
    });
    m.on('halfTime', () => {
      hud.banner('DESCANSO', '', 2.5);
      if (this.net && this.net.invitado) return;
      this.later(2.2, () => { if (this.match === m) { this.audio.music('select'); this.hud.setVisible(false); this.ui.halfTime(); } });
    });
    m.on('fullTime', (d) => {
      hud.banner('FINAL DEL PARTIDO', '', 3);
      if (this.net && this.net.invitado) { this.later(4, () => { if (this.match === m) this.quitToMenu(); }); return; }
      if (this.careerCtx) this.recordCareerMatch(m);
      a.cheer(0.7, 5);
      this.view.excite(0.8, 0.5, 6);
      if (m.userTeam) {
        const u = m.userTeam, o = u.opponent;
        this.save.recordMatch({ team: u.name, rival: o.name, gf: u.score, ga: o.score, difficulty: this.lastCfg.difficulty });
      }
      this.later(3, () => {
        if (this.match !== m) return;
        let track = 'draw';
        if (m.userTeam && d.winner) track = d.winner === m.userTeam ? 'win' : 'lose';
        else if (d.winner) track = 'win';
        this.audio.music(track);
        this.hud.setVisible(false);
        this.ui.fullTime();
      });
    });
    this.commentary.attach(m);
  }

  /** Al terminar un partido de carrera: resultado, estadísticas del jugador y avance de jornada. */
  recordCareerMatch(m) {
    const c = cargarCarrera(this.careerCtx.id);
    if (!c) return;
    if (this.careerCtx.champions) { this.recordChampionsMatch(m, c); return; }
    const f = userFixture(c);
    if (!f || f.res) return;
    const gl = m.teams[0].score, gv = m.teams[1].score;
    registrarResultado(c, f, gl, gv);
    if (c.modo === 'jugador') {
      const esLocal = f.local === c.clubId;
      const goles = m.scorers.filter((x) => !x.own && x.scorer && x.scorer.data.id === 'yo').length;
      const asistencias = m.scorers.filter((x) => !x.own && x.assist && x.assist.data.id === 'yo').length;
      const victoria = esLocal ? gl > gv : gv > gl;
      this.careerPoints = registrarPartidoJugador(c, { victoria, goles, asistencias });
      this.careerPointsInfo = { goles, asistencias, victoria, pts: this.careerPoints };
    }
    cerrarJornada(c);
    guardarCarrera(c);
  }

  /** Resultado de un partido de la UEFA Champions: se guarda en el torneo de la carrera. */
  recordChampionsMatch(m, c) {
    const t = championsDe(c);
    const ref = partidoDelClub(t, c.clubId);
    if (!ref) { guardarCarrera(c); return; }
    const gl = m.teams[0].score, gv = m.teams[1].score;
    const fase = indiceFase(t);  // fase en la que se jugó el partido
    registrarPartido(t, ref, gl, gv);
    cerrarFaseUCL(c, fase);
    if (c.modo === 'jugador') {
      const esLocal = ref.p.a === c.clubId;
      const goles = m.scorers.filter((x) => !x.own && x.scorer && x.scorer.data.id === 'yo').length;
      const asistencias = m.scorers.filter((x) => !x.own && x.assist && x.assist.data.id === 'yo').length;
      const victoria = esLocal ? gl > gv : gv > gl;
      this.careerPoints = registrarPartidoJugador(c, { victoria, goles, asistencias });
      this.careerPointsInfo = { goles, asistencias, victoria, pts: this.careerPoints };
    }
    guardarCarrera(c);
  }

  secondHalf() {
    this.ui.hide();
    this.hud.setVisible(true);
    this.audio.music(null);
    this.match.startSecondHalf();
    this.input.reset();
  }

  pause() {
    if (this.touch) this.touch.reset();
    if (this.mode !== 'match' || this.paused || this.ui.visible) return;
    this.paused = true;
    this.input.enabled = false;
    this.commentary.stop();
    this.audio.crowdSet(0.15);
    this.ui.pause();
  }

  resume() {
    this.paused = false;
    this.resumedAt = performance.now();
    this.input.reset();
    this.input.enabled = true;
    this.ui.hide();
    this.audio.crowdSet(0.4);
  }

  onAction(a, e) {
    if (this.mode !== 'match' || !this.match) return;
    const m = this.match;
    if (a === 'stats') {
      if (!this.paused && !this.ui.visible && !this.replay) this.hud.toggleStats(m);
      return;
    }
    if (a === 'subs') {
      if (!this.paused && !this.ui.visible && !this.replay && m.userTeam && m.canSubstitute()) {
        this.pause();
        this.ui.subs(() => this.ui.pause());
      }
      return;
    }
    if (this.trainWait && (a === 'pass' || a === 'confirm')) {
      this.input.endStep();
      this.startTrainingAttempt();
      return;
    }
    if (a === 'pause') {
      // En una partida en línea el invitado no puede pausar: el anfitrión sigue jugando
      if (this.net && this.net.invitado) return;
      if (!this.paused && !this.ui.visible && performance.now() - this.resumedAt > 250) {
        this.ui.skipEvent = e; // la misma pulsación no debe cerrar el menú recién abierto
        this.pause();
      }
      return;
    }
    if (this.paused || this.ui.visible) return;
    if (this.replay && (a === 'pass' || a === 'confirm' || a === 'shoot')) { this.endReplay(); this.input.endStep(); return; }
    if (m.state === STATE.INTRO && (a === 'pass' || a === 'confirm') && this.introT > 0.6) { this.beginPlay(); this.input.endStep(); }
    // Saltar la celebración: directo a la repetición
    if (m.state === STATE.GOAL && !this.replay && (a === 'pass' || a === 'confirm') && m.stateT > 1.3 && !m.replayRequested) {
      m.replayRequested = true;
      this.startReplay('goal');
      this.input.endStep();
    }
  }

  beginPlay() {
    const m = this.match;
    if (!m || m.state !== STATE.INTRO) return;
    this.hud.el.banner.hidden = true;
    this.cut();
    this.view.director.setMode('tv', {}, true);
    m.beginPlay();
  }

  /** Reproduce una jugada guardada a cámara lenta. */
  playHighlight(i) {
    const m = this.match;
    const h = m && m.highlights[i];
    if (!h) return;
    const len = h.clip.n / 60;
    const segs = [{ angle: 'behind', from: 0, to: Math.max(0.5, len - 0.2), speed: 0.4 }];
    this.ui.hide();
    this.hud.setVisible(true);
    this.replay = { clip: h.clip, segs, idx: 0, t: 0, side: h.team === m.teams[0] ? 1 : -1, goal: false, highlight: i };
    this.view.director.setMode('replay', { angle: segs[0].angle, goalSide: this.replay.side }, true);
    this.view.focusOverride = null;
    this.view.ballLast = null;
    this.hud.replay(true, `${h.title} · ${h.minute}' · ESPACIO para volver`);
    this.cut();
    this.audio.crowdSet(0.25);
  }

  // ------------------------------------------------------------ Entrenamiento
  startTraining(kind, keeper) {
    this.training = { kind, keeper, results: [], total: TRAINING[kind].attempts };
    this.startTrainingAttempt();
  }

  startTrainingAttempt() {
    const s = this.training;
    if (!s) return;
    const last = this.save.data.last || {};
    const home = TEAMS.find((t) => t.id === last.home) || TEAMS[0];
    const away = TEAMS.find((t) => t.id === last.away && t !== home) || TEAMS.find((t) => t !== home);
    this.startMatch({
      home, away, homeTactics: tacticsFromStyle(home.style), awayTactics: tacticsFromStyle(away.style),
      difficulty: this.save.settings.difficulty, halfMinutes: 5, userSide: 0, night: this.save.settings.night,
      profiles: { 0: 'normal', 1: keeperProfile(s.keeper) },
      training: { kind: s.kind, session: s },
    });
  }

  endTraining() {
    const s = this.training;
    this.training = null;
    this.trainWait = false;
    this.quitToMenu();
    this.ui.trainingEnd(s);
  }

  // ---------------------------------------------------------- Repeticiones
  startReplay(reason) {
    const m = this.match;
    const goal = reason === 'goal';
    const since = goal ? m.stateT : 0; // tiempo transcurrido desde el gol
    const clip = m.replay.clip(goal ? since + 5.6 : 5.5);
    if (clip.n < 90) { if (goal) m.resumeAfterGoal(); return; }
    const len = clip.n / 60;
    const end = goal ? Math.max(1.5, Math.min(len - 0.05, len - since + 1.1)) : len - 0.3;
    const lastBallX = clip.frames[(Math.max(0, Math.floor(end * 60) - 1)) * FRAME_SIZE];
    const side = lastBallX >= 0 ? 1 : -1;
    const segs = goal
      ? [{ angle: 'tvzoom', from: Math.max(0, end - 5.2), to: end, speed: 0.8 }, { angle: 'behind', from: Math.max(0, end - 3.4), to: end, speed: 0.45 }]
      : [{ angle: Math.random() < 0.5 ? 'lateral' : 'close', from: Math.max(0, end - 4), to: end, speed: 0.55 }];
    this.replay = { clip, segs, idx: 0, t: segs[0].from, side, goal };
    this.view.director.setMode('replay', { angle: segs[0].angle, goalSide: side }, true);
    this.view.focusOverride = null;
    this.view.ballLast = null;
    this.hud.replay(true, 'REPETICIÓN');
    this.cut();
    this.audio.crowdSet(0.25);
  }

  endReplay() {
    const m = this.match, wasGoal = this.replay && this.replay.goal;
    if (this.replay && this.replay.highlight !== undefined) {
      this.replay = null;
      this.hud.replay(false);
      this.hud.setVisible(false);
      this.cut();
      this.ui.highlights();
      return;
    }
    this.replay = null;
    this.hud.replay(false);
    this.cut();
    this.view.hasPrev = false;
    this.view.ballLast = null;
    this.view.capture(m);
    this.view.director.setMode('tv', {}, true);
    this.view.focusOverride = null;
    this.audio.crowdSet(0.4);
    this.acc = 0;
    this.input.reset();
    if (wasGoal && m.state === STATE.GOAL) m.resumeAfterGoal();
  }

  // ------------------------------------------------------------- Bucle
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    this.pad.poll(this.ui.visible, dt);
    this.governor(dt);
    try {
      if (this.mode === 'match') this.frameMatch(dt);
      else this.frameMenu(dt);
    } catch (e) {
      console.error(e);
      if (!this.crashed) { this.crashed = true; this.showError(e); }
    }
  }

  /** Si el equipo no llega a un ritmo fluido, baja un escalón la calidad gráfica. */
  governor(dt) {
    if (this.mode !== 'match' || this.paused || document.hidden) { this.slowT = 0; return; }
    this.slowT = dt > 0.036 ? (this.slowT || 0) + dt : Math.max(0, (this.slowT || 0) - dt * 2);
    if (this.slowT > 3.5) {
      this.slowT = -6;
      const q = this.save.settings.quality;
      const next = q === 'alta' ? 'media' : q === 'media' ? 'baja' : null;
      if (next) {
        this.save.setSetting('quality', next);
        this.applySettings();
      }
    }
  }

  /** Punto del campo al que apunta el ratón, o null si el ratón no se está usando. */
  aimNow() {
    if (!this.view || this.modoDireccion() === 'wasd' || !this.input.pointerActive()) return null;
    return this.view.pickGround(this.input.pointer.x, this.input.pointer.y);
  }

  showError(e) {
    const d = document.createElement('div');
    d.className = 'fatal';
    d.textContent = 'Se ha producido un error: ' + (e && e.message ? e.message : e);
    this.els.app.appendChild(d);
  }

  frameMenu(dt) {
    if (this.touch) this.touch.setVisible(false);
    if (!this.menuScene) return;
    this.menuScene.update(dt);
    const s = this.menuScene;
    this.view.setFrames(s.a, 0, s.b, 0);
    this.view.draw(1, dt, this.time, { hideMarks: true });
  }

  frameMatch(dt) {
    const m = this.match, view = this.view;
    if (!m) return;
    if (this.touch) {
      // Los controles solo se ven con el partido en curso: ni en pausa ni con un menú abierto
      const visibles = !this.paused && !!this.ui && !!this.ui.root && this.ui.root.hidden;
      if (visibles) this.touch.setContexto(this.tieneBalon());
      this.touch.setVisible(visibles);
    }
    let alpha = 1;
    if (this.replay) {
      this.frameReplay(dt);
    } else {
      if (!this.paused) {
        if (m.state === STATE.INTRO) {
          this.introT += dt;
          if (this.introT > 6) this.beginPlay();
        }
        this.acc += dt;
        let n = 0;
        m.aimPoint = this.aimNow();
        // Movimiento con ratón: W avanza hacia el puntero (vector del jugador al puntero)
        const aimP = m.aimPoint, pc = m.controlled;
        this.input.mouseMove = this.modoDireccion() !== 'wasd';
        const dx = aimP && pc ? aimP.x - pc.x : 0, dz = aimP && pc ? aimP.z - pc.z : 0, dl = Math.hypot(dx, dz);
        this.input.aimVec = dl > 0.5 ? { x: dx / dl, z: dz / dl } : null;
        if (this.net && this.net.invitado) {
          // Invitado: muestra el estado del anfitrión y le envía sus controles
          this.net.frame(performance.now(), this.input, dt);
          view.capture(m);
          this.acc = 0;
        } else {
          while (this.acc >= SIM_DT && n < 4) {
            m.step(SIM_DT);
            view.capture(m);
            this.acc -= SIM_DT;
            n++;
            if (m.replayRequest) break;
          }
          if (n === 4) this.acc = 0;
          if (this.net && this.net.anfitrion) this.net.tick(dt);
        }
        alpha = this.acc / SIM_DT;
        if (m.replayRequest) {
          const rq = m.replayRequest;
          m.replayRequest = null;
          this.startReplay(rq.reason);
          if (this.replay) { this.frameReplay(0); this.afterFrame(dt); return; }
        }
        this.commentary.tick(dt);
        this.audio.crowdTick(dt, m.state === STATE.PLAYING);
        this.crowdT -= dt;
        if (this.crowdT <= 0 && m.state === STATE.PLAYING) {
          this.crowdT = 0.6;
          const danger = Number.isFinite(m.ball.x) ? Math.max(0, (Math.abs(m.ball.x) - 25) / 27) : 0;
          this.audio.crowdSet(0.35 + danger * 0.35);
        }
      }
      // Marcas del jugador controlado
      const overlay = { controlled: -1 };
      const p = m.controlled;
      if (p && m.state !== STATE.GOAL && m.state !== STATE.INTRO) {
        overlay.controlled = m.roster.indexOf(p);
        const user = this.user, sp = m.setPiece;
        const taking = sp && sp.taker === p;
        if (taking || (user && user.charge)) {
          const mv = this.input.move;
          const ang = taking || !(mv.x || mv.z) ? p.facing : Math.atan2(mv.z, mv.x);
          overlay.aim = { x: m.ball.x, z: m.ball.z, angle: ang, power: user ? user.power : 0 };
        }
        if (m.ball.owner === p && m.state === STATE.PLAYING && !m.ball.held) {
          const mv = this.input.move;
          const t = findPassTarget(m, p, mv.x, mv.z, user ? user.power : 0.3);
          if (t) overlay.target = m.roster.indexOf(t);
        }
        // Con el ratón: línea hasta el puntero y marcador en el compañero que recibiría el pase
        const aim = m.aimPoint;
        if (aim && user && m.state === STATE.PLAYING) {
          overlay.aim = null;
          overlay.line = { x0: p.x, z0: p.z, x1: aim.x, z1: aim.z };
          const t = nearestToPoint(p, aim);
          overlay.target = t ? m.roster.indexOf(t) : -1;
        }
      }
      if (m.state === STATE.GOAL && m.celebHero) {
        const h = m.celebHero;
        view.focusOverride = { x: h.x, y: 1, z: h.z };
      } else view.focusOverride = null;
      view.draw(this.paused ? 1 : alpha, this.paused ? 0 : dt, this.time, overlay);
    }
    this.afterFrame(dt);
  }

  afterFrame(dt) {
    const m = this.match;
    this.hud.update(dt, m, this.user, !!this.replay);
    if (Math.floor(this.time) !== this.sbSec) { this.sbSec = Math.floor(this.time); this.updateScoreboard(); }
  }

  frameReplay(dt) {
    const r = this.replay, view = this.view;
    const seg = r.segs[r.idx];
    r.t += dt * seg.speed;
    if (r.t >= seg.to) {
      r.idx++;
      if (r.idx >= r.segs.length) { this.endReplay(); this.view.draw(1, dt, this.time, { hideMarks: true }); return; }
      const nx = r.segs[r.idx];
      r.t = nx.from;
      view.director.setMode('replay', { angle: nx.angle, goalSide: r.side }, true);
      view.ballLast = null;
      this.cut();
    }
    const f = r.t * 60;
    const i0 = Math.min(r.clip.n - 2, Math.max(0, Math.floor(f)));
    view.setFrames(r.clip.frames, i0 * FRAME_SIZE, r.clip.frames, (i0 + 1) * FRAME_SIZE);
    view.draw(Math.min(1, f - i0), dt, this.time, { hideMarks: true });
  }
}
