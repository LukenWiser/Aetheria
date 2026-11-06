// ================= CORE: utils, settings, save, view, audio, input, loop =================
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
let RF = Math.random; // swappable so the daily challenge can generate the same waves for everyone
const rnd = (a, b) => a + RF() * (b - a), rint = (a, b) => Math.floor(rnd(a, b + 1)), pick = a => a[Math.floor(RF() * a.length)];
const TAU = Math.PI * 2, PI = Math.PI, H = PI / 2;
function seeded(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mem = {};
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return k in mem ? mem[k] : null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } delete mem[k]; }
};
const jget = (k, d) => { try { const s = store.get(k); return s ? JSON.parse(s) : d; } catch (e) { return d; } };
function merge(def, src) { // fills missing keys of src from def (plain objects only)
  if (src === null || typeof src !== 'object' || Array.isArray(def) !== Array.isArray(src)) return def;
  if (Array.isArray(def)) return src;
  const o = {}; for (const k in def) o[k] = k in src ? (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) ? merge(def[k], src[k]) : src[k]) : def[k];
  for (const k in src) if (!(k in o)) o[k] = src[k]; return o;
}
let IS_TOUCH = false; try { IS_TOUCH = matchMedia('(pointer:coarse)').matches; } catch (e) { }

// ---------- settings ----------
const SET_KEY = 'aetheria_set4';
const SET_DEF = { intro: true, menu3d: true, speed: 1, autoperf: true, ghost: true, bigb: false, hitbox: false, cbp: 'off', diff: 1, auto: false, dmgnum: true, flash: true, pauseBlur: true, q: 2, models: true, parts: 180, back: 2, vig: true, shake: 1, glow: 1, fps: false, cap30: false, ui3d: true, tilt: 1, reduce: false, vol: .8, sfx: 1, mus: .5, touch: 'auto', scheme: 'stick', tsize: 1, tside: 'left', haptic: true, dead: .2, hc: false, cb: false, cards: true, slowmo: true, story: 'once', bg3d: true, toon: true, brief: 'once', bloom: true, weather: true, daynight: true };
const firstRun = store.get(SET_KEY) === null;
const SET = Object.assign({}, SET_DEF, jget(SET_KEY, {}));
Object.defineProperty(SET, 'toon', { get: () => false, set() { }, enumerable: false, configurable: false }); // cel shading was retired: always the standard look
if (firstRun && IS_TOUCH) { SET.q = 1.5; SET.parts = 100; SET.back = 1; }
function saveSet() { store.set(SET_KEY, JSON.stringify(SET)); }
const touchOn = () => SET.touch === 'on' || (SET.touch === 'auto' && IS_TOUCH);

// ---------- save ----------
const SLOT_KEYS = ['aetheria_v4', 'aetheria_v4_s2', 'aetheria_v4_s3'];
let SLOT = Math.min(2, Math.max(0, parseInt(store.get('aetheria_slot') || '0', 10) || 0));
let SAVE_KEY = SLOT_KEYS[SLOT];
function defPlayer(i) {
  return {
    cfg: { hull: 'falcon', wings: 'swept', engine: 'twin', canopy: 'bubble', paint: i ? '#fb923c' : '#94a3b8', accent: i ? '#fb923c' : '#22d3ee', finish: 'chrome', stripe: true },
    own: { hull: ['falcon'], wings: ['swept'], engine: ['twin'], canopy: ['bubble'] }, wpn: 'twin', wown: ['twin'],
    up: { hp: 0, sh: 0, am: 0, dmg: 0, spd: 0, mag: 0, rate: 0, drn: 0, drd: 0 }, wlv: {}, wevo: {}
  };
}
function defSave() { return { v: 4, cores: 250, wu: 1, prog: {}, pl: [defPlayer(0), defPlayer(1)], hi: { endless: { score: 0, wave: 0 }, blitz: { score: 0 }, rush: { time: 0, boss: 0 }, def: { score: 0, wave: 0 }, nohit: {}, vault: { score: 0, clears: 0 } }, st: { kills: 0, runs: 0, graze: 0, combo: 0, cards: 0, ranks: { S: 0, A: 0, B: 0, C: 0 }, time: 0, deaths: 0, wins: 0, bosses: 0, hull: {} }, ach: {}, dl: { best: {}, done: {}, streak: 0, last: '' }, fails: {}, unl: {}, flags: {}, kd: {}, bd: {}, dev: false, devAll: false, tut: false, players: 1 }; }
function loadSave(key) {
  key = key || SAVE_KEY; const d = defSave(); let s = jget(key, null);
  if (s) { s = merge(d, s); s.pl = [merge(defPlayer(0), s.pl[0]), merge(defPlayer(1), s.pl[1])]; return s; }
  const o = key === SLOT_KEYS[0] ? jget('aetheria_save_v2', null) : null; // migrate cores + upgrades from the previous version
  if (o) { d.cores = Math.max(250, o.c | 0); d.pl[0].up.hp = clamp(Math.round(((o.hp || 50) - 50) / 25), 0, 20); d.pl[0].up.sh = clamp(Math.round((o.sh || 0) / 15), 0, 20); d.pl[0].up.am = clamp(Math.round(((o.am || 100) - 100) / 25), 0, 20); d.tut = !!store.get('aeth_tut'); }
  return d;
}
let SAVE = loadSave();
function saveGame() { store.set(SAVE_KEY, JSON.stringify(SAVE)); if (typeof achScan === 'function') achScan(); }
function prog(w) { return SAVE.prog[w] || (SAVE.prog[w] = { t: 1, done: [] }); }

// ---------- game state ----------
const G = {
  t: 0, scene: 'ui', paused: false, run: null, players: [], coop: false, inCombat: false, world: 0, mode: 'expedition',
  ent: { en: [], pb: [], eb: [], pk: [], pa: [], fl: [], bm: [], hz: [] }, shake: 0, shakeA: 0, freeze: 0, god: false, hitT: 0, view: 'menu', lastNode: null
};

// ---------- view / layout ----------
const V = { W: 1000, H: 600, s: 1, dpr: 1, iw: 1000, ih: 600 };
const cvBg = $('cvBg'), cvFx = $('cvFx'), bg = cvBg.getContext('2d'), fx = cvFx.getContext('2d');
let R3 = null;
function layout() {
  const iw = Math.max(320, innerWidth), ih = Math.max(240, innerHeight);
  V.iw = iw; V.ih = ih; V.s = ih < 600 ? ih / 600 : 1; V.W = Math.round(iw / V.s); V.H = Math.round(ih / V.s);
  V.dpr = G.retro ? .32 : Math.min(window.devicePixelRatio || 1, SET.q >= 2 ? 2 : 1.25);
  for (const c of [cvBg, cvFx]) { c.width = Math.round(iw * V.dpr); c.height = Math.round(ih * V.dpr); }
  if (R3) R3.resize(iw, ih, V.H, G.retro ? .32 : Math.min(window.devicePixelRatio || 1, SET.q));
  document.body.classList.toggle('nofx', !SET.ui3d); document.body.classList.toggle('reduce', !!SET.reduce);
  if (typeof buildBackdrop === 'function') buildBackdrop(G.world);
  if (typeof buildTouch === 'function') buildTouch();
  $('rot').style.display = (IS_TOUCH && ih > iw * 1.1 && !G.rotOk) ? 'flex' : 'none';
}
const toLogic = (cx, cy) => ({ x: cx / V.s, y: cy / V.s });

// ---------- audio ----------
let AC = null, masterG = null, sfxG = null, musG = null;
function audio() {
  if (AC) return AC;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); masterG = AC.createGain(); sfxG = AC.createGain(); musG = AC.createGain(); sfxG.connect(masterG); musG.connect(masterG); masterG.connect(AC.destination); applyVol(); } catch (e) { AC = null; }
  return AC;
}
function applyVol() { if (!AC) return; masterG.gain.value = SET.vol; sfxG.gain.value = SET.sfx; musG.gain.value = SET.mus * .45; }
const lastSnd = {};
function snd(f, type, dur, vol = .1, slide = 0, key) {
  if (SET.vol <= 0 || SET.sfx <= 0) return;
  const now = performance.now(), k = key || (f + type); if (now - (lastSnd[k] || 0) < 35) return; lastSnd[k] = now;
  const ac = audio(); if (!ac) return;
  try {
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(1e-4, t + dur); o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + dur + .02);
  } catch (e) { }
}
const SFX = {
  shoot: (k) => snd(k === 'lancer' ? 180 : k === 'ion' ? 700 : k === 'spread' ? 300 : k === 'missile' ? 140 : k === 'orb' ? 110 : 440, k === 'lancer' || k === 'orb' ? 'sawtooth' : 'sine', .07, .06, k === 'lancer' ? 400 : -120, 'sh' + k),
  aux: () => snd(220, 'triangle', .08, .08, 0, 'aux'), hit: () => snd(260, 'square', .05, .04, -80, 'hit'), boom: (b) => snd(b ? 70 : 120, 'square', b ? .6 : .22, b ? .2 : .13, -60, 'boom'),
  pick: () => snd(780, 'sine', .12, .12, 500, 'pick'), power: () => { snd(520, 'sine', .15, .12, 600, 'pw'); snd(880, 'triangle', .2, .08, 400, 'pw2'); }, hurt: () => snd(180, 'sawtooth', .16, .18, -90, 'hurt'), shield: () => snd(320, 'triangle', .1, .14, 0, 'shd'),
  warn: () => { snd(300, 'sawtooth', .3, .12, 200, 'warn'); }, click: () => snd(600, 'sine', .06, .07, 200, 'clk'), buy: () => snd(660, 'sine', .12, .1, 400, 'buy'), no: () => snd(140, 'square', .12, .08, -40, 'no'), abil: () => { snd(300, 'sawtooth', .25, .14, 500, 'abil'); snd(900, 'sine', .3, .08, -400, 'abil2'); }, graze: () => snd(1500, 'sine', .035, .03, 250, 'gz'), clear: () => { snd(523, 'sine', .2, .12, 0, 'c1'); setTimeout(() => snd(659, 'sine', .2, .12, 0, 'c2'), 120); setTimeout(() => snd(784, 'sine', .35, .12, 0, 'c3'), 240); }
};
const SCALES = [[0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 2, 3, 7, 8], [0, 1, 5, 7, 8], [0, 2, 5, 7, 9], [0, 3, 5, 6, 10], [0, 2, 4, 6, 9], [0, 2, 3, 5, 7], [0, 3, 5, 7, 8], [0, 2, 4, 5, 7]];
// the music engine lives in 54_music.js
function haptic(ms) { if (SET.haptic && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { } } }
function shake(a, t) { if (SET.reduce) return; G.shakeA = Math.max(G.shakeA, a * SET.shake); G.shake = Math.max(G.shake, t); }

// ---------- input ----------
const IN = { tp: {}, keys: {}, ptr: { x: 0, y: 0, down: false, fresh: false, tx: 0, ty: 0, type: 'mouse', drag: false }, stick: { x: 0, y: 0, id: null }, tfire: false, pads: [], swap: [0, 0], ab: [0, 0] };
function buildTouch() {
  const t = $('touch'); t.innerHTML = ''; t.classList.toggle('on', touchOn() && G.inCombat);
  if (!touchOn()) return;
  const sz = SET.tsize, L = SET.tside === 'left', side = L ? 'left' : 'right', other = L ? 'right' : 'left', inset = 'calc(18px + env(safe-area-inset-' + side + '))', inset2 = 'calc(18px + env(safe-area-inset-' + other + '))';
  if (SET.scheme === 'stick') {
    const st = document.createElement('div'); st.className = 'tstick'; st.style[side] = inset; st.style.transform = 'scale(' + sz + ')'; st.style.transformOrigin = L ? 'left bottom' : 'right bottom'; st.innerHTML = '<i></i>'; t.appendChild(st);
    const knob = st.firstChild; const upd = e => { const r = st.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2; let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } IN.stick.x = Math.abs(dx) < .12 ? 0 : dx; IN.stick.y = Math.abs(dy) < .12 ? 0 : dy; knob.style.transform = 'translate(' + dx * 36 + 'px,' + dy * 36 + 'px)'; };
    st.addEventListener('pointerdown', e => { IN.stick.id = e.pointerId; try { st.setPointerCapture(e.pointerId); } catch (x) { } upd(e); e.preventDefault(); });
    st.addEventListener('pointermove', e => { if (IN.stick.id === e.pointerId) upd(e); });
    const end = e => { if (IN.stick.id === e.pointerId) { IN.stick.id = null; IN.stick.x = IN.stick.y = 0; knob.style.transform = ''; } };
    st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  }
  const mk = (cls, txt, css, down, up) => { const b = document.createElement('div'); b.className = 'tbtn ' + cls; b.textContent = txt; Object.assign(b.style, css); b.addEventListener('pointerdown', e => { b.classList.add('dn'); try { b.setPointerCapture(e.pointerId); } catch (x) { } down && down(); e.preventDefault(); }); const u = () => { b.classList.remove('dn'); up && up(); }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); t.appendChild(b); return b; };
  const bottom = 'calc(22px + env(safe-area-inset-bottom))';
  mk('', 'FIRE', { [other]: inset2, bottom, transform: 'scale(' + sz + ')', transformOrigin: L ? 'right bottom' : 'left bottom' }, () => IN.tfire = true, () => IN.tfire = false);
  mk('sml', 'GUN', { [other]: 'calc(' + (112 * sz + 30) + 'px + env(safe-area-inset-' + other + '))', bottom: 'calc(26px + env(safe-area-inset-bottom))' }, () => IN.swap[0] = 1);
  if (G.players && G.players[0]) {
    const ab = mk('abl', '', { [other]: 'calc(' + (112 * sz + 24) + 'px + env(safe-area-inset-' + other + '))', bottom: 'calc(92px + env(safe-area-inset-bottom))' }, () => { if (G.inCombat && !G.paused && !G.pick) IN.ab[0] = 1; });
    ab.id = 'tab'; ab.innerHTML = abilOf(G.players[0]).nm.replace(' ', '<br>');
    mk('sml sec', 'SHOT', { [other]: inset2, bottom: 'calc(' + (112 * sz + 34) + 'px + env(safe-area-inset-bottom))' }, () => IN2.tsec = true, () => IN2.tsec = false);
    const su = mk('sml sup', 'SUPER', { [other]: 'calc(' + (112 * sz + 24) + 'px + env(safe-area-inset-' + other + '))', bottom: 'calc(158px + env(safe-area-inset-bottom))' }, () => { if (G.inCombat && !G.paused && !G.pick) IN2.sup[0] = 1; }); su.id = 'tsup';
  }
  const narrow = innerWidth < 640;
  mk('sml', 'II', narrow ? { [side]: 'calc(' + (112 * sz + 26) + 'px + env(safe-area-inset-' + side + '))', bottom: 'calc(10px + env(safe-area-inset-bottom))' } : { left: '50%', marginLeft: '-26px', bottom: 'calc(10px + env(safe-area-inset-bottom))' }, () => G.inCombat && togglePause());
}
function onKey(e, down) {
  if (G.cut) { if (down && !e.repeat) cutKey(e); e.preventDefault(); return; }
  if (G.photo) { if (down && !e.repeat) { const c = e.code, shot = document.getElementById('photoShot'); if (shot) { if (c === 'Escape' || c === 'Backspace') photoDo('close'); else if (c === 'Enter' || c === 'Space' || c === 'KeyS') photoSave(); } else if (c === 'Escape' || c === 'KeyP') photoExit(); else if (c === 'Enter' || c === 'Space') photoDo('snap'); else if (c === 'KeyF' || c === 'ArrowRight' || c === 'KeyE') photoDo('f', 1); else if (c === 'ArrowLeft' || c === 'KeyQ') photoDo('f', -1); else if (c === 'KeyH') photoDo('hud'); } e.preventDefault(); return; }
  if (G.brief) { if (down && !e.repeat && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) { ACT.briefok(); e.preventDefault(); return; } if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') return; }
  if (G.rebind) { if (down) { e.preventDefault(); keyCaptured(e.code); } return; }
  const c = e.code; IN.keys[c] = down;
  if (G.pick) { if (down) { const i = '123'.indexOf(e.key); if (i >= 0) { pickCard(i); e.preventDefault(); } else if (c === 'KeyR') ACT.cardroll(); } return; }
  if (G.inCombat && !G.paused && (c === 'Space' || c.startsWith('Arrow'))) e.preventDefault();
  if (!down) return;
  if (c === 'KeyP' || c === 'Escape') { if (G.inCombat) { togglePause(); e.preventDefault(); } else if (G.scene !== 'play' && UI.top && c === 'Escape') UI.escape(); }
  else if (c === 'KeyN') { SET.vol = SET.vol > 0 ? 0 : .8; applyVol(); saveSet(); alertMsg(SET.vol ? 'SOUND ON' : 'SOUND OFF'); }
  else if (G.inCombat && !G.paused) {
    if (G.netGuest) { const i2 = '123456'.indexOf(e.key); if (i2 >= 0) NETG.wsel = i2 + 1; if (KALL.a.indexOf(c) >= 0) IN.ab[0] = 1; if (KB[0].wl.indexOf(c) >= 0 || KB[1].wl.indexOf(c) >= 0) IN.swap[0] = -1; if (KB[0].wr.indexOf(c) >= 0 || KB[1].wr.indexOf(c) >= 0) IN.swap[0] = 1; return; }
    const i = '123456'.indexOf(e.key); if (i >= 0 && G.players[0]) setWeapon(G.players[0], WORDER[i]);
    if (G.players[0]) { if (KB[0].wl.indexOf(c) >= 0) cycleWeapon(G.players[0], -1); if (KB[0].wr.indexOf(c) >= 0) cycleWeapon(G.players[0], 1); }
    if (G.players[1] && !G.net) { if (KB[1].wl.indexOf(c) >= 0) cycleWeapon(G.players[1], -1); if (KB[1].wr.indexOf(c) >= 0) cycleWeapon(G.players[1], 1); }
    const ai = abKey(c); if (ai >= 0) IN.ab[ai] = 1;
    for (let q = 0; q < G.players.length; q++) if ((G.players.length > 1 && !G.net ? KB[q].v : KALL.v).indexOf(c) >= 0 && !e.repeat) { IN2.sup[q] = 1; break; }
  }
}
function pollPads() {
  IN.pads = [];
  let gps = []; try { gps = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch (e) { }
  let n = 0;
  for (const gp of gps) {
    if (!gp || !gp.connected) continue;
    const dz = SET.dead, ax = Math.abs(gp.axes[0]) > dz ? gp.axes[0] : 0, ay = Math.abs(gp.axes[1]) > dz ? gp.axes[1] : 0, b = i => gp.buttons[i] && gp.buttons[i].pressed;
    const o = { x: ax + (b(15) ? 1 : 0) - (b(14) ? 1 : 0), y: ay + (b(13) ? 1 : 0) - (b(12) ? 1 : 0), fire: b(0) || b(7) || b(2) || b(5) && false, lb: b(4), rb: b(5), start: b(9), a0: b(0), b1: b(1) };
    o.fire = padDown(gp, 'fire');
    const prev = G._padPrev && G._padPrev[n] || {};
    o.x2 = b(2); o.y3 = b(3);
    if (G.photo) { photoPad(o, prev); IN.pads[n] = { x: 0, y: 0 }; (G._padPrev = G._padPrev || [])[n] = o; n++; if (n >= 2) break; continue; }
    o.raw = gp.buttons.map(x => !!(x && x.pressed)); if (G.padBind) { padRebindPoll(gp, prev); IN.pads[n] = { x: 0, y: 0 }; (G._padPrev = G._padPrev || [])[n] = o; n++; if (n >= 2) break; continue; }
    if (o.start && !prev.start && G.inCombat) togglePause();
    o.lb = padDown(gp, 'wl'); o.rb = padDown(gp, 'wr');
    if (o.lb && !prev.lb && G.inCombat) IN.swap[n] = -1; if (o.rb && !prev.rb && G.inCombat) IN.swap[n] = 1;
    o.ab = padDown(gp, 'ab'); if (o.ab && !prev.ab && G.inCombat && !G.paused && !G.pick && !G.cut) IN.ab[n] = 1;
    o.sec = padDown(gp, 'sec'); o.su = padDown(gp, 'sup'); if (o.su && !prev.su && G.inCombat && !G.paused && !G.pick) IN2.sup[n] = 1;
    if (G.cut) { if (o.a0 && !prev.a0) cutNext(); if (o.b1 && !prev.b1) cutSkip(); const cu = o.y < -.6, cd = o.y > .6; if (cu && !prev.cu) cutPadSel(-1); if (cd && !prev.cd) cutPadSel(1); o.cu = cu; o.cd = cd; } else if (!G.inCombat || G.paused || G.pick || G.brief) padNav(o, prev);
    IN.pads[n] = o; (G._padPrev = G._padPrev || [])[n] = o; n++; if (n >= 2) break;
  }
}
function initInput() {
  addEventListener('keydown', e => onKey(e, true)); addEventListener('keyup', e => onKey(e, false));
  const toPt = e => { const l = toLogic(e.clientX, e.clientY); return { x: l.x, y: l.y, tx: l.x, ty: l.y - 64 }; };
  addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') {
      const P = IN.ptr, l = toLogic(e.clientX, e.clientY); P.type = 'mouse'; P.x = l.x; P.y = l.y; P.tx = l.x; P.ty = l.y; P.fresh = true;
      if (SET.ui3d && SET.tilt > 0 && G.scene !== 'play') { const d = document.documentElement.style, k = SET.tilt; d.setProperty('--rx', (-(e.clientY / innerHeight - .5) * 6 * k).toFixed(2) + 'deg'); d.setProperty('--ry', ((e.clientX / innerWidth - .5) * 8 * k).toFixed(2) + 'deg'); }
    } else if (IN.tp[e.pointerId]) Object.assign(IN.tp[e.pointerId], toPt(e));
  });
  addEventListener('pointerdown', e => {
    if (e.target && e.target.closest && e.target.closest('#touch>*,.scr,#coach,button')) return;
    if (e.pointerType === 'mouse' && e.button === 2) { IN2.rdown = true; return; }
    if (e.pointerType === 'mouse') { const P = IN.ptr, l = toLogic(e.clientX, e.clientY); P.type = 'mouse'; P.x = P.tx = l.x; P.y = P.ty = l.y; P.fresh = true; P.down = true; }
    else if (touchOn() && SET.scheme === 'drag' && G.inCombat) IN.tp[e.pointerId] = toPt(e);
  });
  addEventListener('mouseup', e => { if (e.button === 2) IN2.rdown = false; }); addEventListener('mousedown', e => { if (e.button === 2 && G.inCombat) IN2.rdown = true; });
  const up = e => { if (e.pointerType === 'mouse') { if (e.button === 2) { IN2.rdown = false; return; } IN.ptr.down = false; } delete IN.tp[e.pointerId]; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('blur', () => { IN.keys = {}; IN.ptr.down = false; IN.tp = {}; IN2.rdown = false; IN2.tsec = false; if (SET.pauseBlur && G.inCombat && !G.paused) togglePause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && SET.pauseBlur && G.inCombat && !G.paused) togglePause(); });
  addEventListener('resize', layout); addEventListener('orientationchange', () => setTimeout(layout, 120));
  addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('touchmove', e => { if (G.inCombat) e.preventDefault(); }, { passive: false });
  const fl = () => { audio(); if (AC && AC.state === 'suspended') AC.resume(); };
  addEventListener('pointerdown', fl, { passive: true }); addEventListener('keydown', fl, { passive: true });
}

// ---------- main loop ----------
let lastT = 0, accT = 0, fpsN = 0, fpsT = 0, skipR = false;
const STEP = 1000 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastT) lastT = now; const dt = Math.min(now - lastT, 100); lastT = now; accT += dt * (G.slowUntil && now < G.slowUntil && SET.slowmo !== false ? .3 : 1) * (G.scene === 'play' ? (+SET.speed || 1) : 1); perfTick(now);
  let n = 0;
  while (accT >= STEP && n < 4) { update(); accT -= STEP; n++; }
  if (accT > STEP * 4) accT = 0;
  if (n > 0) {
    if (SET.cap30) { skipR = !skipR; if (skipR) return; }
    render(); fpsN++;
    if (now - fpsT > 1000) { const el = $('fps'); if (!SET.fps) el.style.display = 'none'; fpsN = 0; fpsT = now; }
  }
}
