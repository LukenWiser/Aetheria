// ================= MUSIC: a composed, mixed score per world that reacts to the fight =================
// Signal chain: instrument buses -> (reverb send, tempo-synced echo send) -> compressor -> low-pass (muffles when
// the hull is critical) -> music volume. Pads duck under the kick. Each world has its own key, mode, tempo, chord
// progression, written melody (call + answer phrases), drum groove, bass line and lead instrument.
// Layers: 0 calm (pads + soft arp) -> 1 waves (bass, light drums, melody) -> 2 busy (full kit, arps)
//         -> 3 boss (faster, darker chords, heavy drums, doubled lead) -> 4 late boss (counter-arp, crashes, risers).
let noiseBuf = null;
const SCALE = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], phr: [0, 1, 3, 5, 7, 8, 10], lyd: [0, 2, 4, 6, 7, 9, 11], mix: [0, 2, 4, 5, 7, 9, 10], hmin: [0, 2, 3, 5, 7, 8, 11] };
const DRUMS = { // 16 steps per bar: k kick, s snare, c clap, h closed hat, o open hat, t tom, p perc
  synthwave: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
  tribal: { k: 'x.....x...x.....', t: '..x.x...x..x.x.x', p: 'x..x..x.x..x..x.' },
  halftime: { k: 'x.........x.....', s: '........x.......', h: 'xxxxxxxxxxxxxxxx' },
  ambient: { k: 'x...............', p: '......x.......x.', h: '..x...x...x...x.' },
  industrial: { k: 'x...x...x...x...', c: '....x.......x...', h: '..x...x...x...x.', p: 'x..x..x...x..x..' },
  breaks: { k: 'x.........x.....', s: '....x.......x..x', h: 'x.x.x.x.x.x.x.xx' },
  electro: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', o: '......x.......x.' },
  tick: { k: 'x.......x.......', s: '....x.......x...', p: 'xxxxxxxxxxxxxxxx' },
  rock: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  dnb: { k: 'x.........x.....', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
  epic: { k: 'x...x...x...x...', t: '..x...x.xx..x.x.', s: '....x.......x...' },
  boss: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx', o: '..x...x...x...x.' }
};
const BASSP = { // R root, r octave up, 3 third, 5 fifth, 6 sixth, _ hold, . rest
  octave8: 'R.r.R.r.R.r.R.r.', pulse: 'R...R...R...R...', gallop: 'R.RRR.RRR.RRR.RR', drone: 'R_______________', rolling16: 'RRRRRRRRRRRRRRRR', offbeat: '..R...R...R...R.', walking: 'R...3...5...6...'
};
// lead: instrument; pad: 'saw' supersaw or 'soft'; arp: 'up' | 'updown' | 'sparkle' | 'none'; A/B: two-bar phrases (16 steps per bar)
const MSPEC = [
  { key: 52, sc: 'min', bpm: 112, prog: [0, 5, 2, 6], boss: [0, 5, 3, 4], lead: 'saw', pad: 'saw', drums: 'synthwave', bass: 'octave8', arp: 'up',
    A: '7 _ _ 6 7 _ 9 _ 8 _ _ 7 6 _ 4 _ 5 _ _ _ 4 _ 2 _ 4 _ _ _ . . . .', B: '4 _ 5 _ 6 _ 7 _ 9 _ _ 8 7 _ 6 _ 7 _ _ _ 6 _ 4 _ 2 _ _ _ . . 4 _' },
  { key: 50, sc: 'dor', bpm: 104, prog: [0, 3, 0, 6], boss: [0, 3, 5, 6], lead: 'flute', pad: 'soft', drums: 'tribal', bass: 'pulse', arp: 'updown',
    A: '0 _ 2 . 3 _ 2 . 0 _ . . 4 _ 3 _ 2 _ 0 _ . . 3 _ 2 _ 0 _ -1 _ 0 _', B: '4 _ _ 5 4 _ 3 _ 2 _ _ _ 3 _ 4 _ 7 _ _ _ 6 _ 4 _ 3 _ 2 _ 0 _ _ _' },
  { key: 52, sc: 'phr', bpm: 96, prog: [0, 1, 0, 6], boss: [0, 1, 5, 6], lead: 'twang', pad: 'soft', drums: 'halftime', bass: 'gallop', arp: 'none',
    A: '0 _ _ 1 0 _ _ . 3 _ 2 _ 1 _ 0 _ 4 _ _ _ 3 _ 1 _ 0 _ _ _ . . . .', B: '7 _ _ 6 5 _ 4 _ 3 _ _ 4 3 _ 1 _ 0 _ _ _ 1 _ 3 _ 1 _ _ _ 0 _ _ _' },
  { key: 45, sc: 'hmin', bpm: 84, prog: [0, 5, 3, 4], boss: [0, 1, 3, 4], lead: 'bell', pad: 'saw', drums: 'ambient', bass: 'drone', arp: 'sparkle',
    A: '4 _ _ _ _ _ 6 _ 7 _ _ _ _ _ 6 _ 4 _ _ _ 3 _ _ _ 2 _ _ _ _ _ . .', B: '2 _ _ _ 4 _ _ _ 6 _ _ _ 5 _ _ _ 4 _ _ _ _ _ _ _ . . . . . . . .' },
  { key: 48, sc: 'phr', bpm: 120, prog: [0, 1, 6, 0], boss: [0, 1, 4, 1], lead: 'saw', pad: 'saw', drums: 'industrial', bass: 'rolling16', arp: 'up',
    A: '0 _ 0 _ 1 _ . . 0 _ 0 _ 3 _ 1 _ 0 _ 0 _ 1 _ . . -1 _ _ _ 0 _ _ _', B: '4 _ _ 3 4 _ 5 _ 4 _ 1 _ 3 _ _ _ 1 _ _ 0 1 _ 3 _ 1 _ 0 _ -1 _ _ _' },
  { key: 47, sc: 'min', bpm: 92, prog: [0, 5, 2, 6], boss: [0, 3, 5, 4], lead: 'bell', pad: 'saw', drums: 'breaks', bass: 'pulse', arp: 'sparkle',
    A: '7 _ 6 _ 4 _ 6 _ 7 _ _ _ 9 _ _ _ 8 _ 7 _ 6 _ 4 _ 6 _ _ _ . . . .', B: '4 _ 6 _ 7 _ 9 _ 11 _ _ _ 9 _ 7 _ 8 _ _ _ 7 _ 6 _ 7 _ _ _ . . . .' },
  { key: 50, sc: 'phr', bpm: 128, prog: [0, 1, 0, 5], boss: [0, 1, 6, 1], lead: 'brass', pad: 'saw', drums: 'industrial', bass: 'rolling16', arp: 'none',
    A: '0 _ 0 0 1 _ 0 _ 3 _ _ 1 0 _ . . 0 _ 0 0 1 _ 3 _ 4 _ 3 _ 1 _ 0 _', B: '7 _ _ _ 8 _ 7 _ 5 _ _ _ 4 _ 3 _ 1 _ _ _ 3 _ 1 _ 0 _ _ _ . . . .' },
  { key: 43, sc: 'min', bpm: 78, prog: [0, 3, 5, 4], boss: [0, 1, 5, 4], lead: 'flute', pad: 'soft', drums: 'ambient', bass: 'drone', arp: 'updown',
    A: '0 _ _ _ _ _ 2 _ 3 _ _ _ _ _ . . 4 _ _ _ 3 _ 2 _ 0 _ _ _ _ _ . .', B: '-1 _ _ _ 0 _ _ _ 2 _ _ _ 4 _ _ _ 3 _ _ _ _ _ 2 _ 0 _ _ _ . . . .' },
  { key: 57, sc: 'min', bpm: 132, prog: [0, 5, 6, 0], boss: [0, 5, 6, 4], lead: 'chip', pad: 'saw', drums: 'electro', bass: 'offbeat', arp: 'up',
    A: '7 . 7 . 6 . 7 . 9 . 7 . 6 . 4 . 5 . 5 . 4 . 2 . 4 _ _ _ . . 4 6', B: '7 . 9 . 11 . 9 . 7 . 6 . 7 _ _ _ 4 . 6 . 7 . 6 . 4 _ _ _ 2 _ 4 _' },
  { key: 50, sc: 'hmin', bpm: 116, prog: [0, 3, 4, 0], boss: [0, 5, 4, 4], lead: 'harpsi', pad: 'soft', drums: 'tick', bass: 'walking', arp: 'none',
    A: '7 6 7 4 2 4 0 2 4 6 7 9 7 6 4 2 6 4 6 2 -1 2 -3 -1 1 2 4 6 4 2 1 -1', B: '9 7 9 6 4 6 2 4 6 7 9 11 9 7 6 4 7 6 4 2 0 2 4 6 7 _ _ _ . . . .' },
  { key: 52, sc: 'min', bpm: 120, prog: [0, 6, 5, 6], boss: [0, 5, 6, 4], lead: 'saw', pad: 'saw', drums: 'rock', bass: 'octave8', arp: 'updown',
    A: '4 _ _ 4 6 _ 7 _ 6 _ 4 _ 3 _ 4 _ 2 _ _ _ . . 2 3 4 _ _ _ . . . .', B: '7 _ _ _ 6 _ 4 _ 6 _ _ _ 7 _ 9 _ 8 _ _ _ 7 _ _ _ 6 _ 4 _ 4 _ _ _' },
  { key: 53, sc: 'lyd', bpm: 100, prog: [0, 1, 5, 4], boss: [5, 1, 4, 4], lead: 'bell', pad: 'saw', drums: 'breaks', bass: 'pulse', arp: 'sparkle',
    A: '7 _ 9 _ 11 _ 9 _ 7 _ 6 _ 4 _ _ _ 5 _ 7 _ 9 _ 7 _ 5 _ _ _ . . . .', B: '11 _ 10 _ 9 _ 7 _ 9 _ _ _ 6 _ _ _ 7 _ _ _ 4 _ 5 _ 7 _ _ _ . . . .' },
  { key: 48, sc: 'min', bpm: 138, prog: [0, 5, 6, 4], boss: [0, 1, 6, 4], lead: 'saw', pad: 'saw', drums: 'dnb', bass: 'rolling16', arp: 'up',
    A: '0 _ 2 _ 3 _ 4 _ 3 _ 2 _ 3 _ _ _ 5 _ 4 _ 3 _ 2 _ 0 _ _ _ . . -1 _', B: '4 _ _ 5 6 _ _ 7 6 _ 5 _ 4 _ 3 _ 2 _ 3 _ 4 _ _ _ 6 _ _ _ 7 _ _ _' },
  { key: 45, sc: 'min', bpm: 72, prog: [0, 4, 5, 3], boss: [0, 1, 5, 4], lead: 'choir', pad: 'soft', drums: 'ambient', bass: 'drone', arp: 'none',
    A: '4 _ _ _ 3 _ _ _ 2 _ _ _ 1 _ _ _ 0 _ _ _ _ _ _ _ -1 _ _ _ . . . .', B: '2 _ _ _ 4 _ _ _ 5 _ _ _ 4 _ 3 _ 2 _ _ _ _ _ _ _ . . . . . . . .' },
  { key: 50, sc: 'dor', bpm: 110, prog: [0, 5, 2, 6], boss: [0, 5, 3, 4], lead: 'choir', pad: 'saw', drums: 'epic', bass: 'octave8', arp: 'updown',
    A: '0 _ _ _ 4 _ _ _ 7 _ _ _ 6 _ 4 _ 5 _ _ _ 4 _ 2 _ 4 _ _ _ _ _ . .', B: '7 _ _ _ 9 _ _ _ 11 _ _ _ 9 _ 7 _ 8 _ _ _ 7 _ 6 _ 7 _ _ _ _ _ _ _' },
  // extra maps: suburb, theme park, backrooms, blocklands
  { key: 60, sc: 'maj', bpm: 108, prog: [0, 4, 5, 3], boss: [5, 3, 4, 4], lead: 'twang', pad: 'soft', drums: 'breaks', bass: 'walking', arp: 'updown',
    A: '0 _ 2 _ 4 _ 7 _ 5 _ 4 _ 2 _ _ _ 3 _ 4 _ 5 _ 4 _ 2 _ 0 _ 1 _ _ _', B: '4 _ 5 _ 7 _ 9 _ 8 _ 7 _ 5 _ _ _ 4 _ 2 _ 3 _ 1 _ 0 _ _ _ . . . .' },
  { key: 55, sc: 'maj', bpm: 126, prog: [0, 3, 4, 0], boss: [5, 3, 4, 4], lead: 'chip', pad: 'saw', drums: 'rock', bass: 'octave8', arp: 'up',
    A: '7 _ 4 _ 2 _ 4 _ 7 _ 9 _ 7 _ _ _ 8 _ 5 _ 3 _ 5 _ 8 _ _ _ 7 _ _ _', B: '9 _ 7 _ 6 _ 7 _ 9 _ 11 _ 9 _ 7 _ 6 _ 4 _ 2 _ 4 _ 7 _ _ _ . . . .' },
  { key: 45, sc: 'min', bpm: 66, prog: [0, 5, 3, 4], boss: [0, 1, 3, 4], lead: 'bell', pad: 'soft', drums: 'ambient', bass: 'drone', arp: 'none',
    A: '4 _ _ _ _ _ _ _ 3 _ _ _ _ _ _ _ 2 _ _ _ _ _ 1 _ 0 _ _ _ _ _ _ _', B: '. . . . 6 _ _ _ 5 _ _ _ . . . . 4 _ _ _ _ _ _ _ . . . . . . . .' },
  { key: 60, sc: 'lyd', bpm: 88, prog: [0, 1, 0, 4], boss: [5, 1, 4, 4], lead: 'bell', pad: 'soft', drums: 'ambient', bass: 'pulse', arp: 'sparkle',
    A: '7 _ _ _ 4 _ 2 _ 4 _ _ _ 7 _ 9 _ 8 _ _ _ 6 _ _ _ 4 _ _ _ . . . .', B: '2 _ 4 _ 6 _ 7 _ 9 _ _ _ 7 _ 6 _ 4 _ _ _ 2 _ _ _ 0 _ _ _ . . . .' },
  // world 16 glitch maps: freeway, school, beach, vapor grid, null sector (boss)
  { key: 54, sc: 'min', bpm: 118, prog: [0, 5, 2, 6], boss: [0, 5, 3, 4], lead: 'saw', pad: 'saw', drums: 'synthwave', bass: 'octave8', arp: 'up',
    A: '4 _ _ _ 6 _ 7 _ 6 _ 4 _ 3 _ _ _ 2 _ _ _ 4 _ 3 _ 2 _ 0 _ . . . .', B: '7 _ _ _ 9 _ 7 _ 6 _ _ _ 4 _ 6 _ 7 _ _ _ 6 _ 4 _ 2 _ _ _ . . . .' },
  { key: 50, sc: 'maj', bpm: 132, prog: [0, 4, 5, 3], boss: [5, 3, 4, 4], lead: 'saw', pad: 'soft', drums: 'rock', bass: 'octave8', arp: 'none',
    A: '0 _ 2 _ 4 _ 4 _ 5 _ 4 _ 2 _ _ _ 4 _ 4 _ 5 _ 7 _ 5 _ 4 _ 2 _ _ _', B: '7 _ _ 7 9 _ 7 _ 5 _ 4 _ 2 _ _ _ 4 _ 5 _ 4 _ 2 _ 1 _ 0 _ _ _ . .' },
  { key: 55, sc: 'maj', bpm: 100, prog: [0, 3, 4, 3], boss: [5, 3, 4, 4], lead: 'bell', pad: 'soft', drums: 'breaks', bass: 'pulse', arp: 'updown',
    A: '4 _ 5 _ 4 _ 2 _ 0 _ _ _ 2 _ 4 _ 5 _ _ _ 4 _ 2 _ 4 _ _ _ . . . .', B: '7 _ 9 _ 7 _ 5 _ 4 _ _ _ 5 _ 7 _ 8 _ _ _ 7 _ 5 _ 4 _ _ _ . . . .' },
  { key: 51, sc: 'maj', bpm: 84, prog: [0, 5, 3, 4], boss: [5, 3, 4, 4], lead: 'bell', pad: 'saw', drums: 'halftime', bass: 'pulse', arp: 'sparkle',
    A: '9 _ _ _ 7 _ _ _ 8 _ _ _ 4 _ _ _ 5 _ _ _ 4 _ 2 _ 4 _ _ _ _ _ . .', B: '4 _ _ _ 5 _ _ _ 7 _ _ _ 9 _ _ _ 8 _ _ _ 7 _ 5 _ 4 _ _ _ _ _ . .' },
  { key: 49, sc: 'phr', bpm: 140, prog: [0, 1, 6, 0], boss: [0, 1, 4, 1], lead: 'chip', pad: 'saw', drums: 'dnb', bass: 'rolling16', arp: 'up',
    A: '0 . 0 . 7 . 0 . 6 _ 4 _ 3 . 1 . 0 . 0 . 7 . 8 . 7 _ 4 _ 1 _ 0 _', B: '7 _ 8 _ 7 _ 4 _ 3 _ 4 _ 1 _ _ _ 0 _ 1 _ 3 _ 4 _ 7 _ 8 _ 11 _ _ _' },
  // World 17: Aetheria Prime - heroic finale
  { key: 52, sc: 'maj', bpm: 120, prog: [0, 5, 3, 4], boss: [5, 3, 0, 4], lead: 'choir', pad: 'saw', drums: 'epic', bass: 'octave8', arp: 'sparkle',
    A: '0 _ 4 _ 7 _ _ _ 9 _ 7 _ 4 _ _ _ 5 _ 7 _ 9 _ 11 _ 12 _ _ _ . . . .', B: '12 _ _ _ 11 _ 9 _ 7 _ _ _ 9 _ 11 _ 12 _ 14 _ 12 _ 11 _ 9 _ _ _ 7 _ _ _' }
];
const mHz = n => 440 * Math.pow(2, (n - 69) / 12);
function mTheme(w) {
  const S = MSPEC[w % MSPEC.length], sc = SCALE[S.sc], parse = str => str.trim().split(/\s+/).map(t => t === '_' ? 'h' : t === '.' ? null : +t);
  return Object.assign({}, S, { w, scale: sc, A: parse(S.A), B: parse(S.B) }); // parsed phrases must win over the raw strings
}
// scale degree -> midi (degrees past 6 wrap into the next octave; negative go below)
const mDeg = (T, d) => { const n = T.scale.length, o = Math.floor(d / n), i = ((d % n) + n) % n; return T.key + T.scale[i] + 12 * o; };
// keep strong-beat and held melody notes on the current chord: an off-chord degree resolves one step down
const mSnap = (T, d, root) => { const n = T.scale.length, r = (((d - root) % n) + n) % n; return r === 0 || r === 2 || r === 4 ? d : r === 6 ? d + 1 : d - 1; };
const mChord = (T, root) => [mDeg(T, root), mDeg(T, root + 2), mDeg(T, root + 4)];

const MX = { // the mixing desk, built once per audio context
  ctx: null,
  build() {
    if (this.ctx === AC) return true; if (!AC || !musG) return false; this.ctx = AC;
    const g = v => { const n = AC.createGain(); n.gain.value = v; return n; };
    this.comp = AC.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 3.2; this.comp.attack.value = .006; this.comp.release.value = .22; this.comp.knee.value = 12;
    this.lp = AC.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = .5;
    this.out = g(1); this.comp.connect(this.lp); this.lp.connect(this.out); this.out.connect(musG);
    // reverb: generated stereo hall impulse
    const len = Math.floor(AC.sampleRate * 2.6), ir = AC.createBuffer(2, len, AC.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { const v = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); lp += (v - lp) * (i < AC.sampleRate * .02 ? 1 : .55); d[i] = i < AC.sampleRate * .012 ? 0 : lp; } }
    this.rev = AC.createConvolver(); this.rev.buffer = ir; this.revIn = g(1); this.revOut = g(.55); this.revIn.connect(this.rev); this.rev.connect(this.revOut); this.revOut.connect(this.comp);
    // echo: tempo-synced dotted eighth with a darkening feedback loop
    this.dl = AC.createDelay(2); this.fb = g(.34); this.dlp = AC.createBiquadFilter(); this.dlp.type = 'lowpass'; this.dlp.frequency.value = 2600; this.dIn = g(1); this.dOut = g(.42);
    this.dIn.connect(this.dl); this.dl.connect(this.dlp); this.dlp.connect(this.fb); this.fb.connect(this.dl); this.dlp.connect(this.dOut); this.dOut.connect(this.comp);
    const bus = (dry, rv, dl) => { const b = g(1), d = g(dry); b.connect(d); d.connect(this.comp); if (rv) { const r = g(rv); b.connect(r); r.connect(this.revIn); } if (dl) { const e = g(dl); b.connect(e); e.connect(this.dIn); } return b; };
    this.pad = bus(.55, .7, 0); this.lead = bus(.8, .35, .28); this.arp = bus(.6, .3, .38); this.drum = bus(.95, .1, 0); this.bass = bus(.9, 0, 0); this.fx = bus(.7, .6, 0);
    this.duck = g(1); this.pad.disconnect(); this.pad.connect(this.duck); { const d = g(.55); this.duck.connect(d); d.connect(this.comp); const r = g(.7); this.duck.connect(r); r.connect(this.revIn); }
    // distortion curve for the heavy worlds
    this.shape = AC.createWaveShaper(); const cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; cv[i] = Math.tanh(x * 2.6); } this.shape.curve = cv; this.heavy = g(.55); this.shape.connect(this.heavy); this.heavy.connect(this.bass);
    this.pulse = AC.createPeriodicWave(new Float32Array([0, ...Array.from({ length: 31 }, (_, k) => 0)]), new Float32Array([0, ...Array.from({ length: 31 }, (_, k) => { const n = k + 1; return 2 / (n * Math.PI) * Math.sin(n * Math.PI * .25); })])); // 25% pulse for chiptune
    return true;
  },
  noise() { if (!noiseBuf || noiseBuf.sampleRate !== AC.sampleRate) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noiseBuf; }
};
const mv = { // instruments: each call schedules one note
  ok() { return AC && musG && MX.build(); },
  env(p, t, a, peak, d, r) { p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a); p.setTargetAtTime(peak * .7, t + a, d * .4); p.setTargetAtTime(0, t + Math.max(a, d), r || .08); },
  osc(type, f, t, det) { const o = AC.createOscillator(); if (type === 'pulse') o.setPeriodicWave(MX.pulse); else o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.value = det; return o; },
  out(node, bus, t, len) { node.connect(bus); return len; },
  pad(n, t, dur, vel, soft) {
    const g = AC.createGain(), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = .7; f.frequency.setValueAtTime(soft ? 900 : 700, t); f.frequency.linearRampToValueAtTime(soft ? 1400 : 2600, t + dur * .5); f.frequency.linearRampToValueAtTime(soft ? 900 : 1200, t + dur);
    this.env(g.gain, t, soft ? .35 : .25, vel, dur, .45); f.connect(g); g.connect(MX.duck);
    (soft ? [['triangle', 0], ['sine', 7]] : [['sawtooth', -11], ['sawtooth', 0], ['sawtooth', 11]]).forEach(([tp, dt]) => { const o = this.osc(tp, mHz(n), t, dt); o.connect(f); o.start(t); o.stop(t + dur + 1.6); });
  },
  bass(n, t, dur, vel, heavy) {
    const g = AC.createGain(), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(heavy ? 1600 : 900, t); f.frequency.exponentialRampToValueAtTime(heavy ? 260 : 180, t + Math.min(.25, dur));
    this.env(g.gain, t, .006, vel, dur * .9, .05); const s = this.osc('sine', mHz(n), t), o = this.osc('sawtooth', mHz(n), t, 4); const sg = AC.createGain(); sg.gain.value = .8; s.connect(sg); sg.connect(g); o.connect(f);
    f.connect(g); g.connect(heavy ? MX.shape : MX.bass); [s, o].forEach(x => { x.start(t); x.stop(t + dur + .3); });
  },
  lead(kind, n, t, dur, vel) {
    const g = AC.createGain(), f = AC.createBiquadFilter(); f.type = 'lowpass'; g.connect(MX.lead); const hz = mHz(n), stop = t + dur + .6; let oscs = [];
    const vib = (o, amt, del) => { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = 5.4; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(amt, t + del); l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(stop); };
    if (kind === 'saw' || kind === 'brass') {
      f.Q.value = kind === 'brass' ? 2 : 4; f.frequency.setValueAtTime(kind === 'brass' ? 500 : 1200, t); f.frequency.linearRampToValueAtTime(kind === 'brass' ? 3200 : 4200, t + (kind === 'brass' ? .12 : .03)); f.frequency.setTargetAtTime(kind === 'brass' ? 1800 : 2400, t + .1, .2);
      oscs = [this.osc('sawtooth', hz, t, -7), this.osc(kind === 'brass' ? 'sawtooth' : 'square', hz, t, 7)]; oscs.forEach(o => { o.connect(f); vib(o, hz * .006, .25); }); f.connect(g); this.env(g.gain, t, kind === 'brass' ? .05 : .012, vel, dur, .12);
    } else if (kind === 'flute') {
      f.frequency.value = 3200; oscs = [this.osc('sine', hz, t), this.osc('triangle', hz * 2, t)]; const h = AC.createGain(); h.gain.value = .18; oscs[0].connect(f); oscs[1].connect(h); h.connect(f); vib(oscs[0], hz * .008, .18); f.connect(g); this.env(g.gain, t, .06, vel * 1.15, dur, .1);
      const b = AC.createBufferSource(), bf = AC.createBiquadFilter(), bg = AC.createGain(); b.buffer = MX.noise(); bf.type = 'bandpass'; bf.frequency.value = hz * 2; bf.Q.value = 2; bg.gain.setValueAtTime(vel * .25, t); bg.gain.exponentialRampToValueAtTime(.001, t + .12); b.connect(bf); bf.connect(bg); bg.connect(g); b.start(t); b.stop(t + .15);
    } else if (kind === 'twang') { // plucked, slightly bent string
      f.Q.value = 3; f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(700, t + .35); oscs = [this.osc('sawtooth', hz * .985, t), this.osc('triangle', hz, t, 5)]; oscs.forEach(o => { o.frequency.exponentialRampToValueAtTime(hz, t + .06); o.connect(f); }); f.connect(g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 1.1, t + .004); g.gain.setTargetAtTime(0, t + .01, Math.min(.5, dur * .6));
    } else if (kind === 'bell') { // FM bell
      const c = this.osc('sine', hz, t), m = this.osc('sine', hz * 3.5, t), mg = AC.createGain(); mg.gain.setValueAtTime(hz * 2.4, t); mg.gain.exponentialRampToValueAtTime(hz * .05, t + 1.2); m.connect(mg); mg.connect(c.frequency); c.connect(g); oscs = [c, m];
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * .9, t + .004); g.gain.setTargetAtTime(0, t + .01, .55);
    } else if (kind === 'chip') {
      oscs = [this.osc('pulse', hz, t), this.osc('square', hz * 2, t)]; const h = AC.createGain(); h.gain.value = .12; oscs[0].connect(g); oscs[1].connect(h); h.connect(g); g.gain.setValueAtTime(vel * .8, t); g.gain.setValueAtTime(vel * .55, t + .05); g.gain.setTargetAtTime(0, t + dur * .9, .03);
    } else if (kind === 'harpsi') {
      f.Q.value = 1; f.frequency.setValueAtTime(7000, t); f.frequency.exponentialRampToValueAtTime(1500, t + .25); oscs = [this.osc('sawtooth', hz, t, -4), this.osc('square', hz * 2, t, 3)]; const h = AC.createGain(); h.gain.value = .3; oscs[0].connect(f); oscs[1].connect(h); h.connect(f); f.connect(g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * .75, t + .002); g.gain.setTargetAtTime(0, t + .005, .22);
    } else { // choir: filtered saws through two vowel formants
      const f1 = AC.createBiquadFilter(), f2 = AC.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = 700; f2.frequency.value = 1150; f1.Q.value = f2.Q.value = 5; const sum = AC.createGain(); sum.gain.value = 2.2;
      oscs = [this.osc('sawtooth', hz, t, -9), this.osc('sawtooth', hz, t, 9), this.osc('sawtooth', hz / 2, t, 0)]; oscs.forEach(o => { o.connect(f1); o.connect(f2); vib(o, hz * .005, .4); }); f1.connect(sum); f2.connect(sum); sum.connect(g); this.env(g.gain, t, .18, vel * 1.2, dur, .3);
    }
    oscs.forEach(o => { o.start(t); o.stop(stop); });
  },
  pluck(n, t, vel, bright) { const g = AC.createGain(), f = AC.createBiquadFilter(), o = this.osc('square', mHz(n), t), o2 = this.osc('sawtooth', mHz(n), t, 9); f.type = 'lowpass'; f.Q.value = 5; f.frequency.setValueAtTime(bright ? 6000 : 3800, t); f.frequency.exponentialRampToValueAtTime(500, t + .16);
    o.connect(f); o2.connect(f); f.connect(g); g.gain.setValueAtTime(vel, t); g.gain.setTargetAtTime(0, t + .01, .07); g.connect(MX.arp); o.start(t); o2.start(t); o.stop(t + .45); o2.stop(t + .45); },
  nz(t, dur, vel, type, freq, q, bus, sweep) { const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = MX.noise(); f.type = type; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur); f.Q.value = q || .7;
    g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(bus || MX.drum); s.start(t, Math.random() * .5); s.stop(t + dur + .05); },
  kick(t, v) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(44, t + .14); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .42); o.connect(g); g.connect(MX.drum); o.start(t); o.stop(t + .45);
    this.nz(t, .02, v * .5, 'highpass', 3000, .7); MX.duck.gain.setValueAtTime(.42, t); MX.duck.gain.linearRampToValueAtTime(1, t + .22); },
  snare(t, v) { this.nz(t, .2, v, 'bandpass', 1900, .9); const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(150, t + .08); g.gain.setValueAtTime(v * .7, t); g.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(g); g.connect(MX.drum); o.start(t); o.stop(t + .14); },
  clap(t, v) { for (let i = 0; i < 3; i++) this.nz(t + i * .011, .03, v * .8, 'bandpass', 1300, 2); this.nz(t + .033, .2, v * .7, 'bandpass', 1200, 1.5); },
  hat(t, v, open) { this.nz(t, open ? .28 : .045, v, 'highpass', 7600, .8); },
  tom(t, v, hz) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(hz * 1.6, t); o.frequency.exponentialRampToValueAtTime(hz, t + .12); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .38); o.connect(g); g.connect(MX.drum); o.start(t); o.stop(t + .4); },
  perc(t, v, hz) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(hz, t); o.frequency.exponentialRampToValueAtTime(hz * .7, t + .05); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .09); o.connect(g); g.connect(MX.drum); o.start(t); o.stop(t + .1); },
  crash(t, v) { this.nz(t, 1.8, v, 'highpass', 5200, .6, MX.fx); },
  riser(t, dur, v) { this.nz(t, dur, v, 'bandpass', 300, 3, MX.fx, 6000); },
  stinger() { if (!this.ok()) return; const t = AC.currentTime + .02; this.kick(t, .9); this.crash(t, .3); [0, 7, 12].forEach(k => this.lead('brass', 45 + k, t, 1.2, .16)); this.nz(t, .8, .25, 'lowpass', 2400, 1, MX.fx, 120); }
};
const music = {
  on: false, w: 0, step: 0, nt: 0, timer: null, boss: false, lv: 0, th: null, tense: false, force: -1,
  get cur() { return this.sd() * 1000; },
  sd() { const T = this.th || mTheme(this.w); return 60 / (T.bpm * (this.lv >= 3 ? 1.1 : 1)) / 4; },
  start(w, boss) {
    if (G.mapX) w = G.mapX.mi; else if (w === GLITCH_W) w = 23; else if (w === 16) w = 24;
    const was = this.boss; this.w = w; this.boss = !!boss; if (!this.th || this.th.w !== w) this.th = mTheme(w);
    if (this.on) { if (boss && !was) { try { mv.stinger(); } catch (e) { } } return; }
    this.on = true; this.step = 0; this.lv = this.level(); this.nt = 0; clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 25);
  },
  setTimer() { }, // kept for compatibility: the look-ahead scheduler has no per-step timer
  stop() { this.on = false; clearInterval(this.timer); try { if (MX.ctx === AC && MX.out) { const t = AC.currentTime; MX.out.gain.cancelScheduledValues(t); MX.out.gain.setValueAtTime(MX.out.gain.value, t); MX.out.gain.linearRampToValueAtTime(0, t + .4); MX.out.gain.setValueAtTime(1, t + .5); } } catch (e) { } },
  level() {
    if (this.force >= 0) return this.force; if (G.cut) return 0;
    const R = G.run; if (!R) return 0; const b = R.boss;
    if (b && !b.dead) return b.ph >= 2 || b.hp < b.mhp * .35 ? 4 : 3;
    if (R.stage === 'wave') return G.ent.en.length >= 6 || G.ent.eb.length > 24 ? 2 : 1;
    return R.stage === 'cards' || R.stage === 'intro' ? 0 : 1;
  },
  tick() { // look-ahead scheduler: queue every 16th note that starts in the next ~120 ms
    if (!AC || !musG || G.paused || SET.vol <= 0 || SET.mus <= 0 || AC.state !== 'running' || !mv.ok()) return;
    if (!this.th || this.th.w !== this.w) this.th = mTheme(this.w);
    const now = AC.currentTime; if (this.nt < now - .2) this.nt = now + .04; // resync after a pause or a stall
    let guard = 0; while (this.nt < now + .12 && guard++ < 24) { try { this.play(this.step, this.nt); } catch (e) { } this.nt += this.sd(); this.step++; }
  },
  play(s, t) {
    const T = this.th, st = s & 15, bar = s >> 4, cyc = bar & 7;
    if (st === 0) { this.lv = this.level(); const tz = !!G.run && G.players.some(p => p.alive && p.hp < p.mhp * .3); if (tz !== this.tense) { this.tense = tz; MX.lp.frequency.setTargetAtTime(tz ? 1100 : 20000, t, .4); } }
    const L = this.lv, prog = L >= 3 ? T.boss : T.prog, root = prog[bar & 3], ch = mChord(T, root), sd = this.sd(), barLen = sd * 16;
    // pads: a chord per bar
    if (st === 0) { const v = L === 0 ? .07 : L >= 3 ? .045 : .055; ch.forEach(n => mv.pad(n, t, barLen * .98, v, T.pad === 'soft' || L === 0)); if (L >= 1) mv.pad(ch[0] - 12, t, barLen * .98, v * .8, true); }
    if (L === 0) { if (st % 4 === 0 && T.arp !== 'none') mv.pluck(ch[(st / 4) % 3] + 12, t, .05, false); return; }
    // drums
    const D = DRUMS[L >= 3 ? 'boss' : T.drums], k = L === 1 ? .6 : 1, on = (p) => p && p[st] === 'x';
    if (on(D.k)) mv.kick(t, .85 * k); if (L >= 2 || T.drums === 'tribal') { if (on(D.s)) mv.snare(t, .32 * k); if (on(D.c)) mv.clap(t, .3 * k); if (on(D.t)) mv.tom(t, .32 * k, [110, 140, 90][st % 3]); }
    if (on(D.h)) mv.hat(t, (st % 4 === 0 ? .11 : .07) * k); if (L >= 2 && on(D.o)) mv.hat(t, .07, true); if (on(D.p)) mv.perc(t, .12 * k, T.drums === 'tick' ? 1900 : 420 + (st % 3) * 140);
    if (L >= 2 && cyc === 7 && st >= 12) { mv.snare(t, .18 + (st - 12) * .05); if (st === 14) mv.tom(t, .3, 100); } // fill into the next phrase
    if (L >= 2 && cyc === 0 && st === 0) mv.crash(t, L >= 4 ? .26 : .18);
    if (L >= 2 && cyc === 7 && st === 0) mv.riser(t, barLen, L >= 3 ? .07 : .045);
    // bass
    const bp = L >= 3 ? 'rolling16' : T.bass, bc = BASSP[bp][st];
    if (bc !== '.' && bc !== '_') { let len = 1; while (st + len < 16 && BASSP[bp][st + len] === '_') len++; const off = { R: 0, r: 12, '3': mDeg(T, root + 2) - ch[0], '5': mDeg(T, root + 4) - ch[0], '6': mDeg(T, root + 5) - ch[0] }[bc] || 0;
      mv.bass(ch[0] - 24 + off, t, sd * len * .95, (bp === 'rolling16' ? (st % 4 === 0 ? .32 : .22) : .34), T.drums === 'industrial' || L >= 3); }
    // arpeggio
    if (L >= 2 && T.arp !== 'none') { const pat = T.arp === 'updown' ? [0, 1, 2, 3, 2, 1] : T.arp === 'sparkle' ? [3, 1, 4, 2, 5, 0] : [0, 1, 2, 3]; const i = pat[st % pat.length], n = (i >= 3 ? ch[i - 3] + 12 : ch[i]) + (T.arp === 'sparkle' ? 24 : 12); if (T.arp !== 'sparkle' || st % 2 === 0) mv.pluck(n, t, L >= 4 ? .09 : .07, T.arp === 'sparkle'); }
    if (L >= 4 && st % 2 === 1) mv.pluck(ch[(st >> 1) % 3] + 24, t, .045, true); // late-boss counter line
    // melody: A B A B over 8 bars; on calmer waves it rests every other phrase
    const ph = (cyc >> 1) & 1 ? T.B : T.A, idx = (cyc & 1) * 16 + st, d = ph[idx];
    if (L === 1 && cyc >= 4) return;
    if (d !== null && d !== 'h') { let len = 1; while (idx + len < 32 && ph[idx + len] === 'h') len++; const n = mDeg(T, (st % 8 === 0 || len >= 4) ? mSnap(T, d, root) : d) + 12, vel = (L >= 3 ? .14 : .12) * (st % 4 === 0 ? 1 : .85);
      mv.lead(T.lead, n, t, sd * len, vel); if (L >= 3) mv.lead(T.lead === 'choir' ? 'saw' : T.lead, n + 12, t, sd * len, vel * .4); }
    if (this.tense && (st === 0 || st === 3)) mv.kick(t, .45);
  }
};
