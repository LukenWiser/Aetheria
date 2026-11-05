// ================= AUDIO 2: layered sound effects, music stems that fade with the action, jukebox =================
// ---- sound effects: every sound is 2-4 layers (transient click + body + tail) through its own little bus ----
const FXB = { ctx: null };
function fxBus() {
  if (FXB.ctx === AC && FXB.in) return FXB; if (!AC || !sfxG) return null; FXB.ctx = AC;
  const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .12;
  const inp = AC.createGain(), dry = AC.createGain(), wet = AC.createGain(), rv = AC.createConvolver();
  const len = Math.floor(AC.sampleRate * .9), ir = AC.createBuffer(2, len, AC.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4) * .6; }
  rv.buffer = ir; dry.gain.value = 1; wet.gain.value = .22; inp.connect(dry); inp.connect(rv); rv.connect(wet); dry.connect(comp); wet.connect(comp); comp.connect(sfxG);
  FXB.in = inp; return FXB;
}
let fxNoise = null;
function fxN() { if (!fxNoise || fxNoise.sampleRate !== AC.sampleRate) { fxNoise = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = fxNoise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return fxNoise; }
const sLast = {};
function sOK(key, gap) { if (SET.vol <= 0 || SET.sfx <= 0) return null; const now = performance.now(); if (key && now - (sLast[key] || 0) < (gap || 35)) return null; if (key) sLast[key] = now; const ac = audio(); if (!ac) return null; if (ac.state === 'suspended') ac.resume(); const B = fxBus(); return B ? ac.currentTime : null; }
function sTone(t, type, f0, f1, dur, vol, det) { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); if (det) o.detune.value = det; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(1e-4, t + dur); o.connect(g); g.connect(FXB.in); o.start(t); o.stop(t + dur + .03); }
function sNoise(t, dur, vol, ftype, f0, f1, q) { const b = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); b.buffer = fxN(); b.loop = true; f.type = ftype || 'lowpass'; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); f.Q.value = q || .8; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(1e-4, t + dur); b.connect(f); f.connect(g); g.connect(FXB.in); b.start(t, Math.random() * .5); b.stop(t + dur + .03); }
const SHOTS = {
  twin: t => { sTone(t, 'square', 1250, 620, .05, .035); sTone(t, 'triangle', 620, 300, .07, .05); sNoise(t, .03, .03, 'highpass', 4000); },
  spread: t => { sNoise(t, .09, .07, 'bandpass', 2400, 700, 1.2); sTone(t, 'sawtooth', 300, 160, .08, .035); },
  lancer: t => { sTone(t, 'sawtooth', 180, 720, .12, .05); sTone(t, 'sine', 90, 60, .14, .07); sNoise(t, .05, .03, 'highpass', 3000); },
  ion: t => { sTone(t, 'sine', 1400, 900, .035, .03); sTone(t, 'square', 700, 500, .03, .015); },
  missile: t => { sNoise(t, .22, .07, 'lowpass', 1800, 300, .7); sTone(t, 'triangle', 160, 90, .16, .05); },
  orb: t => { sTone(t, 'sine', 110, 55, .25, .09); sTone(t, 'sawtooth', 220, 110, .18, .025, 12); sNoise(t, .12, .03, 'lowpass', 900, 200); },
  arc: t => { sNoise(t, .08, .06, 'bandpass', 3500, 1500, 3); sTone(t, 'square', 900, 1800, .05, .02); },
  rail: t => { sTone(t, 'sawtooth', 1600, 120, .22, .06); sNoise(t, .25, .06, 'bandpass', 5000, 400, 1.5); sTone(t, 'sine', 70, 40, .3, .1); }
};
Object.assign(SFX, {
  shoot: k => { const t = sOK('sh' + k, k === 'ion' ? 45 : 40); if (t === null) return; (SHOTS[k] || SHOTS.twin)(t); },
  aux: () => { const t = sOK('aux'); if (t !== null) sTone(t, 'triangle', 240, 180, .07, .05); },
  hit: () => { const t = sOK('hit', 45); if (t === null) return; sNoise(t, .04, .04, 'highpass', 2600); sTone(t, 'square', 320, 200, .04, .02); },
  boom: big => { const t = sOK(big ? 'boomB' : 'boom', big ? 60 : 50); if (t === null) return;
    sNoise(t, big ? 1.1 : .4, big ? .32 : .16, 'lowpass', big ? 2400 : 3000, big ? 90 : 220, .6); sTone(t, 'sine', big ? 95 : 140, big ? 32 : 50, big ? .8 : .3, big ? .3 : .16); sNoise(t, .05, big ? .12 : .07, 'highpass', 3000);
    if (big) { sNoise(t + .08, .9, .1, 'bandpass', 600, 120, 1.2); sTone(t, 'sawtooth', 70, 35, .6, .06); } },
  pick: () => { const t = sOK('pick', 40); if (t === null) return; const f = 1180 + (Math.random() * 4 | 0) * 110; sTone(t, 'sine', f, f, .09, .07); sTone(t + .045, 'sine', f * 1.5, f * 1.5, .12, .05); sTone(t, 'triangle', f * 2, f * 2, .05, .02); },
  power: () => { const t = sOK('pw', 80); if (t === null) return; [0, 4, 7, 12].forEach((k, i) => sTone(t + i * .05, 'triangle', 523 * Math.pow(2, k / 12), 0, .22, .06)); sNoise(t, .3, .03, 'highpass', 6000, 9000); },
  hurt: () => { const t = sOK('hurt', 60); if (t === null) return; sNoise(t, .2, .2, 'bandpass', 900, 200, 1.4); sTone(t, 'sawtooth', 200, 70, .2, .1); sTone(t, 'square', 90, 50, .15, .06); },
  shield: () => { const t = sOK('shd', 60); if (t === null) return; sTone(t, 'triangle', 480, 760, .12, .08); sTone(t, 'sine', 960, 1500, .16, .04); sNoise(t, .12, .04, 'highpass', 5000); },
  warn: () => { const t = sOK('warn', 200); if (t === null) return; for (let i = 0; i < 2; i++) { sTone(t + i * .22, 'sawtooth', 440, 330, .18, .08); sTone(t + i * .22, 'square', 220, 165, .18, .04); } },
  click: () => { const t = sOK('clk', 30); if (t === null) return; sTone(t, 'sine', 1800, 1200, .025, .04); sTone(t, 'triangle', 600, 600, .03, .03); },
  buy: () => { const t = sOK('buy', 60); if (t === null) return; [0, 7, 12, 16].forEach((k, i) => sTone(t + i * .04, 'sine', 880 * Math.pow(2, k / 12), 0, .14, .06)); sNoise(t, .1, .03, 'highpass', 7000); },
  no: () => { const t = sOK('no', 80); if (t === null) return; sTone(t, 'square', 180, 140, .09, .05); sTone(t + .09, 'square', 140, 110, .12, .05); },
  abil: () => { const t = sOK('abil', 80); if (t === null) return; sNoise(t, .35, .1, 'bandpass', 400, 5000, 1.5); sTone(t, 'sawtooth', 220, 880, .25, .06); sTone(t + .1, 'sine', 1320, 660, .3, .05); },
  graze: () => { const t = sOK('gz', 50); if (t !== null) { sTone(t, 'sine', 2200, 2600, .04, .025); sNoise(t, .03, .015, 'highpass', 8000); } },
  clear: () => { const t = sOK('clr', 300); if (t === null) return; [[0, 0], [4, .12], [7, .24], [12, .38]].forEach(a => { sTone(t + a[1], 'triangle', 523 * Math.pow(2, a[0] / 12), 0, .45, .07); sTone(t + a[1], 'sine', 1046 * Math.pow(2, a[0] / 12), 0, .3, .03); }); sNoise(t + .38, .8, .05, 'highpass', 6000, 12000); },
  charge: lv => { const t = sOK('chg', 90); if (t !== null) sTone(t, 'sine', 300 + lv * 900, 400 + lv * 1000, .1, .015 + lv * .012); },
  parry: () => { const t = sOK('parry', 60); if (t === null) return; sTone(t, 'triangle', 2400, 2400, .5, .09); sTone(t, 'sine', 3600, 3600, .35, .05); sTone(t, 'square', 1200, 600, .06, .04); sNoise(t, .06, .08, 'highpass', 5000); },
  sup: () => { const t = sOK('sup', 300); if (t === null) return; sNoise(t, 1.6, .2, 'bandpass', 200, 4000, 1.1); sTone(t, 'sawtooth', 55, 110, 1.5, .1); sTone(t, 'sawtooth', 82, 165, 1.5, .07, 8); [0, 7, 12].forEach(k => sTone(t + .3, 'triangle', 440 * Math.pow(2, k / 12), 0, 1.2, .05)); }
});

// ---- music stems: each layer fades in and out over a bar instead of popping ----
const STEMS = { lv: -1 };
function stemMix(L, t) {
  if (!MX.drum || STEMS.lv === L) return; STEMS.lv = L; const bar = music.sd() * 16;
  const set = (bus, v) => { try { bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(v, t + bar); } catch (e) { } };
  set(MX.drum, L === 0 ? .4 : L === 1 ? .75 : 1); set(MX.arp, L >= 2 ? 1 : .5); set(MX.bass, L === 0 ? .5 : 1); set(MX.lead, L === 1 ? .8 : 1);
}
const _mplay = music.play.bind(music);
music.play = function (s, t) {
  const st = s & 15; if (st === 0) { this.lv = this.level(); stemMix(this.lv, t); }
  _mplay(s, t);
  // heat stem: long combos add a driving shaker + octave bass; super finisher adds a choir swell
  const R = G.run, heat = R && R.combo >= 12 ? (R.combo >= 25 ? 2 : 1) : 0;
  if (heat && this.lv >= 1) { mv.hat(t, st % 2 ? .05 : .035); if (heat >= 2 && st % 4 === 2) mv.perc(t, .09, 1200); }
  if (R && G.players.some(p => p.supT > 100) && st % 8 === 0) { const T = this.th; mv.pad(mDeg(T, 0) + 12, t, this.sd() * 8, .05, false); mv.pad(mDeg(T, 4) + 12, t, this.sd() * 8, .04, false); }
};
const _mlevel = music.level.bind(music);
music.level = function () { if (this.jbx >= 0 && this.jbl >= 0) return this.jbl; return _mlevel(); };
const _mstart = music.start.bind(music);
music.start = function (w, boss) { if (this.jbx >= 0) { const was = this.jbx; this.on = false; clearInterval(this.timer); this.w = was; this.th = mTheme(was); this.on = true; this.step = 0; this.nt = 0; this.lv = this.level(); this.timer = setInterval(() => this.tick(), 25); STEMS.lv = -1; return; } STEMS.lv = -1; _mstart(w, boss); };
music.jbx = -1; music.jbl = -1;

// ---- jukebox ----
function jbTracks() {
  const T = []; for (let w = 0; w < 15; w++) T.push({ i: w, nm: WORLDS[w].nm, sub: 'World ' + (w + 1), c: WORLDS[w].ac, ok: w < SAVE.wu });
  T.push({ i: 23, nm: WORLDS[15].nm, sub: 'World 16', c: WORLDS[15].ac, ok: SAVE.wu > 15 });
  if (WORLDS[16]) T.push({ i: 24, nm: WORLDS[16].nm, sub: 'World 17', c: WORLDS[16].ac, ok: SAVE.wu > 16 });
  MAPS.filter(m => !m.hidden).forEach(m => T.push({ i: m.mi, nm: m.nm, sub: 'The Glitch - side map', c: m.ac, ok: SAVE.wu > 15 }));
  return T;
}
const JBL = [['CALM', 0], ['CRUISE', 1], ['ACTION', 2], ['BOSS', 3], ['FINALE', 4]];
function jbPlay(i) { audio(); if (AC && AC.state !== 'running') AC.resume(); music.stop(); music.jbx = i; if (music.jbl < 0) music.jbl = 2; setTimeout(() => { if (music.jbx === i) music.start(i, false); }, 520); }
function jbStop() { music.jbx = -1; music.jbl = -1; music.stop(); }
let jbRaf = 0, jbAn = null;
function jbViz() {
  cancelAnimationFrame(jbRaf); const cv = document.getElementById('jbViz'); if (!cv) { jbAn = null; return; }
  try { if (!jbAn && AC && musG) { jbAn = AC.createAnalyser(); jbAn.fftSize = 128; musG.connect(jbAn); } } catch (e) { }
  const g = cv.getContext('2d'), W = cv.width = cv.clientWidth * 2, H = cv.height = cv.clientHeight * 2, buf = new Uint8Array(64);
  const loop = () => { if (!document.getElementById('jbViz')) return; jbRaf = requestAnimationFrame(loop); g.clearRect(0, 0, W, H); if (jbAn) jbAn.getByteFrequencyData(buf); const n = 40, bw = W / n; for (let k = 0; k < n; k++) { const v = jbAn ? buf[k] / 255 : (music.jbx >= 0 ? .2 + .2 * Math.sin(performance.now() / 200 + k) : .02), h = Math.max(2, v * H * .95); const gr = g.createLinearGradient(0, H, 0, H - h); gr.addColorStop(0, '#22d3ee'); gr.addColorStop(1, '#e879f9'); g.fillStyle = gr; g.fillRect(k * bw + 2, H - h, bw - 4, h); } };
  loop();
}
