import { AudioEngine, SONGS } from '../src/audio/Audio.js';
async function measure(name, dur, fn) {
  const ctx = new OfflineAudioContext(1, Math.round(44100 * dur), 44100);
  const a = new AudioEngine();
  a.init(ctx);
  // Los volúmenes se fijan de inmediato (sin rampa) para medir el nivel real
  a.master.gain.value = a.vol.master; a.musicBus.gain.value = a.vol.music * 1.5; a.sfxBus.gain.value = a.vol.sfx * 1.8; a.crowdBus.gain.value = a.vol.crowd * 1.7;
  fn(a, ctx);
  const buf = await ctx.startRendering();
  const d = buf.getChannelData(0);
  let peak = 0, sum = 0, nan = 0;
  for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (!(v >= 0)) nan++; if (v > peak) peak = v; sum += v * v; }
  return `${name}: pico ${peak.toFixed(2)} rms ${Math.sqrt(sum / d.length).toFixed(3)}${nan ? ' NaN=' + nan : ''}`;
}
window.runAudio = async () => {
  const out = [];
  for (const k of Object.keys(SONGS)) {
    out.push(await measure('música ' + k, 12, (a) => { const s = SONGS[k]; const six = 60 / s.bpm / 4; for (let st = 0; st < 12 / six - 2; st++) a.playStep(s, st + 64, 0.05 + st * six, six); }));
  }
  out.push(await measure('público base', 4, (a) => { a.crowdStart(); a.crowdGain.gain.value = 0.12 + 0.4 * 0.5; }));
  out.push(await measure('público gol', 6, (a) => { a.crowdStart(); a.crowdGain.gain.value = 0.5; a.cheer(1, 5); }));
  out.push(await measure('abucheo', 3, (a) => a.boo(1)));
  out.push(await measure('golpeo fuerte', 1, (a) => a.kick(1)));
  out.push(await measure('pase', 1, (a) => a.kick(0.4, true)));
  out.push(await measure('poste', 1, (a) => a.post(25)));
  out.push(await measure('red', 1, (a) => a.net()));
  out.push(await measure('silbato largo', 1.5, (a) => a.whistle('long')));
  out.push(await measure('silbato final', 2.5, (a) => a.whistle('full')));
  out.push(await measure('entrada', 1, (a) => a.tackle(true)));
  out.push(await measure('palmas', 4, (a) => { a.crowdLevel = 0.5; a.clapPattern(); }));
  out.push(await measure('menú ui', 1, (a) => a.ui('ok')));
  return out;
};
window.ready = true;
