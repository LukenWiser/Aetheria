// ================= V63: audio pass =================
// Warnings bus with its own volume, music ducking on big moments, music that brightens with your combo,
// a rising coin ladder for cores, shield-shatter, empty-gun clicks and wave stingers.
const AUDX = { alert: null, duck: null, shelf: null, wired: null, ladder: 0, ladT: 0 };
try { if (SETS.AUDIO && !SETS.AUDIO.some(r => r[0] === 'alertVol')) SETS.AUDIO.push(['alertVol', 'range', 'Warnings', 'Heartbeat, alarm and hit sounds', [0, 1, .05]]); if (SET.alertVol === undefined) SET.alertVol = .9; } catch (e) { }
function audxWire() {
  if (!AC || AUDX.wired === AC) return !!AUDX.alert; AUDX.wired = AC;
  try {
    AUDX.alert = AC.createGain(); AUDX.alert.connect(masterG);
    AUDX.duck = AC.createGain(); AUDX.shelf = AC.createBiquadFilter(); AUDX.shelf.type = 'highshelf'; AUDX.shelf.frequency.value = 3200; AUDX.shelf.gain.value = 0;
    musG.disconnect(); musG.connect(AUDX.duck); AUDX.duck.connect(AUDX.shelf); AUDX.shelf.connect(masterG);
    audxVol();
  } catch (e) { console.warn('audx', e); AUDX.alert = null; }
  return !!AUDX.alert;
}
function audxVol() { try { if (AUDX.alert) AUDX.alert.gain.value = SET.alertVol === undefined ? .9 : SET.alertVol; } catch (e) { } }
const _applyVolX = applyVol; applyVol = function () { const r = _applyVolX.apply(this, arguments); audxWire(); audxVol(); return r; };
// sidechain-style dip in the music
function duck(depth, ms) { if (!audxWire() || SET.reduce === 'audio') return; try { const t = AC.currentTime, g = AUDX.duck.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(1 - depth, t + .04); g.linearRampToValueAtTime(1, t + .04 + ms / 1000); } catch (e) { } }
function tone(f0, f1, dur, vol, type, bus, when) {
  try { if (!audxWire()) return; const t = AC.currentTime + (when || 0), o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(bus || sfxG); o.start(t); o.stop(t + dur + .03); } catch (e) { }
}
function noiseBurst(dur, vol, hp, bus) {
  try { if (!audxWire()) return; const n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2); const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = b; f.type = 'highpass'; f.frequency.value = hp || 2000; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(bus || sfxG); s.start(); } catch (e) { }
}
// route the danger sounds onto the warnings bus
dngTone = function (f0, f1, dur, vol, type) { tone(f0, f1, dur, vol, type, AUDX.alert || sfxG); };

// hits: duck the music; shield break: glassy shatter
const _hurtX = hurt;
hurt = function (p, dmg, kind) {
  const sh0 = p.sh, hp0 = p.hp, r = _hurtX.apply(this, arguments);
  try { if (r && G.run) { if (hp0 - p.hp > 0) duck(.55, 520); else duck(.25, 260); if (sh0 > 0 && p.sh <= 0) { noiseBurst(.35, .32, 3500, AUDX.alert); [2600, 3300, 4100].forEach((f, i) => tone(f, f * .6, .25, .05, 'triangle', AUDX.alert, i * .03)); } } } catch (e) { }
  return r;
};
// pickups: cores climb a ladder when collected in a row, repairs get a warm chord
const _collectX = collect;
collect = function (p, k) {
  const r = _collectX.apply(this, arguments);
  try {
    if (!p.remote) {
      const now = performance.now();
      if (k.k === 'core') { AUDX.ladder = now - AUDX.ladT < 450 ? Math.min(14, AUDX.ladder + 1) : 0; AUDX.ladT = now; const f = 880 * Math.pow(2, AUDX.ladder / 12); tone(f, f * 1.01, .09, .045, 'triangle'); }
      else if (k.k === 'hp') [523, 659, 784].forEach((f, i) => tone(f, f, .32, .06, 'sine', null, i * .045));
      else if (k.k === 'sh') [784, 988, 1319].forEach((f, i) => tone(f, f * 1.02, .28, .05, 'triangle', null, i * .04));
      else if (k.k === 'ammo') tone(300, 900, .14, .06, 'square');
    }
  } catch (e) { }
  return r;
};
// boss down / player down: big duck
const _killBX = killBoss; killBoss = function (e) { const was = e.st === 2, r = _killBX.apply(this, arguments); if (!was) duck(.8, 2200); return r; };
const _killPX = killPlayer; killPlayer = function (p) { const r = _killPX.apply(this, arguments); duck(.7, 1600); tone(220, 55, .9, .14, 'sawtooth', AUDX.alert); return r; };

// live mix: combo brightens the music, empty gun clicks, wave stingers
(function () {
  let lastWave = -1, lastStage = '', lastAux = 0;
  setInterval(() => {
    try {
      const R = G.run; if (!AC || AC.state !== 'running' || !audxWire()) return;
      const play = G.scene === 'play' && R && !G.paused, cb = play ? Math.min(R.combo || 0, 20) : 0;
      AUDX.shelf.gain.setTargetAtTime(cb >= 6 ? Math.min(6, (cb - 5) * .5) : 0, AC.currentTime, .3);
      if (!play) { lastWave = -1; lastStage = ''; return; }
      if (R.stage === 'wave' && R.wave !== lastWave && lastWave !== -1) [392, 523, 659].forEach((f, i) => tone(f, f, .18, .045, 'square', null, i * .07));
      if (R.stage === 'clear' && lastStage !== 'clear') [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .35, .06, 'triangle', null, i * .09));
      if (R.stage === 'boss' && lastStage !== 'boss') { duck(.6, 1200); tone(80, 40, 1.4, .2, 'sawtooth', AUDX.alert); }
      lastWave = R.wave; lastStage = R.stage;
      const p = G.players[0], now = performance.now(); if (p && p.alive && p.am < (WPN[p.wpn] || WPN.twin).am && IN.keys && Object.keys(IN.keys).some(k => IN.keys[k]) && now - lastAux > 600) { lastAux = now; tone(1800, 1200, .03, .03, 'square'); }
    } catch (e) { }
  }, 100);
})();
window.__AUDX = AUDX;
