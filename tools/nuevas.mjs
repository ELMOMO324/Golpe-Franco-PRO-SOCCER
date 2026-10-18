// Pruebas de las funciones nuevas del partido: jugadas guardadas, mapa de calor,
// cambios y entrenamiento. Sin gráficos.
import { TEAMS } from '../src/data/TeamsData.js';
import { tacticsFromStyle } from '../src/match/Tactics.js';
import { Match } from '../src/match/Match.js';
import { TRAINING, keeperProfile } from '../src/match/Training.js';
import { STATE, SIM_DT } from '../src/core/Config.js';
import { HEAT_W, HEAT_H } from '../src/match/Player.js';

const fail = (msg) => { console.log('  FALLO:', msg); process.exitCode = 1; };
const ok = (msg) => console.log('  ok:', msg);

function partido(extra = {}, seed = 77) {
  const home = TEAMS[0], away = TEAMS[1];
  return new Match({
    home, away, homeTactics: tacticsFromStyle(home.style), awayTactics: tacticsFromStyle(away.style),
    difficulty: 'normal', halfMinutes: 3, userSide: 0, seed, ...extra,
  });
}

// ---------------------------------------------------------------- partido completo
console.log('Partido completo con usuario (jugadas, calor, cambios):');
{
  const m = partido({}, 4242);
  let subsDone = 0, errores = 0;
  const cambios = [];
  let steps = 0;
  while (m.state !== STATE.FULL_TIME && steps < 60 * 60 * 20) {
    m.step(SIM_DT); steps++;
    // a mitad de la primera parte, cambia al primer jugador de campo por un suplente
    if (steps === 60 * 60 * 2 && m.canSubstitute() && m.userTeam.bench.length) {
      const out = m.userTeam.players.find((p) => !p.isGK && p !== m.controlled && !p.sentOff);
      const inn = m.userTeam.bench.find((x) => (x.pos === 'GK') === out.isGK);
      if (out && inn) {
        const np = m.substitute(m.userTeam, out, inn);
        if (np) cambios.push(`${out.data.name} -> ${np.data.name}`); else errores++;
      }
    }
    if (!Number.isFinite(m.ball.x)) { errores++; break; }
  }
  if (cambios.length) ok(`cambio realizado: ${cambios[0]} (banca ${m.userTeam.bench.length}, cambios ${m.userTeam.subs})`);
  else fail('no se pudo hacer el cambio');
  if (m.userTeam.subs !== cambios.length) fail('contador de cambios incorrecto');
  if (m.roster.length !== 22 || m.active.length !== 22) fail(`plantilla: roster ${m.roster.length} activos ${m.active.length}`);
  if (m.userTeam.players.some((p) => !m.active.includes(p))) fail('jugador del campo no está en activos');
  ok(`cambios hechos, plantilla de 22 coherente`);
  const heatTotal = m.played.reduce((s, p) => s + p.heat.reduce((a, b) => a + b, 0), 0);
  if (heatTotal < 1000) fail(`calor poco muestreado: ${heatTotal}`); else ok(`muestras de posición: ${Math.round(heatTotal)}`);
  const jugador = m.played.find((p) => p.heat.some((v) => v > 0));
  if (!jugador) fail('ningún jugador con calor'); else ok(`jugador con calor: ${jugador.data.name}`);
  if (m.played.length !== 23) ok(`jugadores que han jugado: ${m.played.length}`);
  ok(`jugadas guardadas: ${m.highlights.length}` + (m.highlights[0] ? ` (ej.: ${m.highlights[0].title} ${m.highlights[0].minute}', ${m.highlights[0].clip.n} fotogramas)` : ''));
  if (m.highlights.length > 10) fail('demasiadas jugadas');
  for (const h of m.highlights) if (!(h.clip.n > 90)) fail('clip demasiado corto');
  if (errores) fail(`errores: ${errores}`);
}

// ------------------------------------------------------------ entrenamiento
console.log('Entrenamiento (cada modo, 10 intentos, portero de distinto nivel):');
for (const kind of Object.keys(TRAINING)) {
  for (const lvl of [1, 5]) {
    const session = { kind, keeper: lvl, results: [], total: TRAINING[kind].attempts };
    let intentos = 0, guard = 0;
    const cerrar = () => {
      // Un intento: arranca, juega hasta que el entrenador termina (o se agota el tiempo)
      const m = new Match({
        home: TEAMS[0], away: TEAMS[1], homeTactics: tacticsFromStyle(TEAMS[0].style), awayTactics: tacticsFromStyle(TEAMS[1].style),
        difficulty: 'normal', halfMinutes: 5, userSide: 0, seed: 900 + intentos * 13 + lvl, external: true,
        profiles: { 0: 'normal', 1: keeperProfile(lvl) }, training: { kind, session },
      });
      m.on('trainingEnd', () => {});
      m.beginPlay();
      let s = 0;
      while (!m.trainer.done && s < 60 * 60 * 40) { m.step(SIM_DT); s++; }
      if (!m.trainer.done) m.trainer.finish('SIN RESULTADO', false);
      return m;
    };
    while (session.results.length < session.total && guard++ < 40) { cerrar(); intentos++; }
    const aciertos = session.results.filter((r) => r.ok).length;
    const etiquetas = [...new Set(session.results.map((r) => r.label))].join(', ');
    console.log(`  ${kind} portero ${lvl}: ${aciertos}/${session.results.length} aciertos · resultados: ${etiquetas}`);
    if (session.results.length !== session.total) fail(`${kind}: se completaron ${session.results.length}/${session.total}`);
    if (session.results.some((r) => r.label === 'SIN RESULTADO')) fail(`${kind}: intento sin resultado`);
  }
}
console.log(process.exitCode ? 'ALGO FALLA' : 'TODO OK');
