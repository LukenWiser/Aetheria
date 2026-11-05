// ================= META 2: co-op revives + link beam + team super, versus, ghost replays, challenge codes,
// gamepad remapping, accessibility helpers, auto performance, run history =================

// ---- co-op: fly to a downed teammate to revive them ----
function coopDead(p) { // called every frame for a downed pilot in co-op; returns true if it handled the revive
  const q = alive()[0]; if (!q || p.dX === undefined) return false;
  const near = Math.hypot(q.x - p.dX, q.y - p.dY) < 70;
  p.rv = near ? (p.rv | 0) + 1 : Math.max(0, (p.rv | 0) - 2);
  if (near && G.t % 10 === 0) spark(p.dX, p.dY, 2, '#4ade80', 2, 14, 2);
  if (p.rv >= 110) { p.rv = 0; revive(p); p.x = p.dX; p.y = p.dY; SAVE.st.revives = (SAVE.st.revives | 0) + 1; return true; }
  return false;
}
function linkTick() { // two pilots close together are joined by a beam that hurts anything crossing it
  if (G.players.length < 2 || G.run.var === 'versus') { G.link = null; return; }
  const a = G.players[0], b = G.players[1]; if (!a.alive || !b.alive) { G.link = null; return; }
  const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 230 || d < 30) { G.link = null; return; }
  G.link = { a, b, d }; if (G.t % 6) return;
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy, dm = 4 * (a.st.dmg + b.st.dmg) * .5 * (G.pdm || 1);
  const segD = (x, y) => { const u = clamp(((x - a.x) * dx + (y - a.y) * dy) / L2, 0, 1); return Math.hypot(a.x + dx * u - x, a.y + dy * u - y); };
  for (const e of G.ent.en) { if (e.dead || e.hide) continue; if (segD(e.x, e.y) < e.r + 6) { hurtEnemy(e, e.boss ? dm * .5 : dm, { own: 0 }); spark(e.x, e.y, 3, '#86efac', 3, 12, 2); } }
  const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) if (segD(eb[j].x, eb[j].y) < eb[j].r + 3) { spark(eb[j].x, eb[j].y, 2, '#86efac', 2, 10, 2); eb.splice(j, 1); }
}
function drawCoop(g, t) {
  const L = G.link; if (L) { g.save(); g.globalCompositeOperation = 'lighter'; const k = 1 - L.d / 230; g.strokeStyle = 'rgba(134,239,172,' + (.35 + k * .5).toFixed(2) + ')'; g.lineWidth = 3 + k * 5 + Math.sin(t * .5) * 1.5; g.beginPath(); g.moveTo(L.a.x, L.a.y); g.lineTo(L.b.x, L.b.y); g.stroke(); g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.stroke(); g.restore(); }
  for (const p of G.players) {
    if (p.alive || p.dX === undefined || !(p.rest > 0)) continue; const f = (p.rv | 0) / 110;
    g.save(); g.globalAlpha = .55 + Math.sin(t * .2) * .2; g.strokeStyle = '#4ade80'; g.lineWidth = 2; g.setLineDash([6, 6]); g.lineDashOffset = -t; g.beginPath(); g.arc(p.dX, p.dY, 34, 0, TAU); g.stroke(); g.setLineDash([]);
    if (f > 0) { g.globalAlpha = 1; g.lineWidth = 5; g.beginPath(); g.arc(p.dX, p.dY, 40, -H, -H + TAU * f); g.stroke(); }
    g.globalAlpha = .9; g.fillStyle = '#bbf7d0'; g.font = '800 10px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillText('P' + (p.id + 1) + ' DOWN - FLY HERE TO REVIVE', p.dX, p.dY - 48); g.fillText(Math.ceil(p.rest / 60) + 's', p.dX, p.dY + 4); g.restore();
  }
}

// ---- versus: 2 minute score duel ----
function setupVersus(R) { R.vs = { time: 120 * 60 }; R.hpm = 1; R.edm = 1; }
function versusTick(R) {
  if (R.var !== 'versus' || R.over) return; const V2 = R.vs; if (R.stage === 'wave' || R.stage === 'boss') V2.time--;
  if (V2.time === 600) alertMsg('10 SECONDS LEFT!');
  for (const p of G.players) if (!p.alive && p.rest > 0 && --p.rest <= 0) { revive(p); p.score = Math.max(0, p.score - 400); ftext(p.x, p.y - 30, '-400', '#fb7185', 14); }
  if (V2.time <= 0) { R.stage = 'clear'; R.st = 200; finishRun(true); }
}
function versusFinish(R, win, d) { const a = G.players[0] ? G.players[0].score : 0, b = G.players[1] ? G.players[1].score : 0; d.name = 'Versus'; d.vs = [Math.round(a), Math.round(b)]; d.win = true; d.bonus = 150; d.vsWin = a === b ? 0 : a > b ? 1 : 2; SAVE.st.vs = (SAVE.st.vs | 0) + 1; }

// ---- ghost replays: your best run of each sector flies alongside you ----
const ghostKey = R => R.w + ':' + R.lv + ':' + R.tier + (R.alt ? 'b' : '');
function ghEnc(a) { const b = new Uint8Array(a.length * 2); for (let i = 0; i < a.length; i++) { const v = a[i] & 0xffff; b[i * 2] = v & 255; b[i * 2 + 1] = v >> 8; } let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
function ghDec(s) { try { const r = atob(s), a = new Int16Array(r.length >> 1); for (let i = 0; i < a.length; i++) { const v = r.charCodeAt(i * 2) | (r.charCodeAt(i * 2 + 1) << 8); a[i] = v > 32767 ? v - 65536 : v; } return a; } catch (e) { return null; } }
function ghostStart(R) { R.gh = []; R.gt = 0; R.ghost = null; if (R.mode !== 'expedition' || R.var || G.players.length > 1 || SET.ghost === false) return; const G0 = (SAVE.gh || {})[ghostKey(R)]; if (G0) { R.ghost = ghDec(G0.d); R.ghostS = G0.s; } }
function ghostTick(R) {
  if (R.gh === undefined || R.mode !== 'expedition' || R.var || G.players.length > 1) return; if (R.stage === 'intro') return; R.gt++;
  if (R.gt % 3 === 0 && R.gh.length < 12000) { const p = G.players[0]; R.gh.push(p.alive ? Math.round(p.x) : -1, Math.round(p.y)); }
}
function ghostSave(R, win) {
  if (!win || !R.gh || R.var || R.mode !== 'expedition' || G.players.length > 1 || R.gh.length < 20) return; const S = SAVE.gh || (SAVE.gh = {}), k = ghostKey(R);
  if (S[k] && S[k].s >= R.score) return; S[k] = { s: Math.round(R.score), d: ghEnc(R.gh), at: Date.now() };
  const ks = Object.keys(S); if (ks.length > 40) ks.sort((a, b) => S[a].at - S[b].at).slice(0, ks.length - 40).forEach(x => delete S[x]);
}
function drawGhost(g, t) {
  const R = G.run; if (!R || !R.ghost || !R.gt) return; const i = Math.floor(R.gt / 3) * 2; if (i + 1 >= R.ghost.length) return; const x = R.ghost[i], y = R.ghost[i + 1]; if (x < 0) return;
  g.save(); g.globalAlpha = .33; drawShip2D(g, { x, y, cfg: { hull: 'falcon', paint: '#e0f2fe', accent: '#a5f3fc', wings: 'swept', engine: 'twin', canopy: 'bubble', finish: 'chrome', stripe: false } }, t); g.globalAlpha = .7; g.fillStyle = '#a5f3fc'; g.font = '800 9px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillText('BEST ' + fmt(R.ghostS || 0), x, y - 26); g.restore();
}

// ---- challenge codes: the same seed, modifier and target score for a friend ----
function chCode(w, lv, mod, seed, target) { const body = [w + 1, lv + 1, mod + 1].map(n => n.toString(36)).join('') + '-' + (seed % 1679616).toString(36).toUpperCase().padStart(4, '0') + '-' + Math.round(target / 50).toString(36).toUpperCase(); const lb = body.toLowerCase(); let c = 0; for (let i = 0; i < lb.length; i++) c = (c * 31 + lb.charCodeAt(i)) % 36; return (body + c.toString(36)).toUpperCase(); }
function chParse(code) {
  code = String(code || '').toUpperCase().replace(/[^0-9A-Z-]/g, ''); const ck = code.slice(-1), body = code.slice(0, -1); let c = 0; for (let i = 0; i < body.length; i++) c = (c * 31 + body.toLowerCase().charCodeAt(i)) % 36; if (c.toString(36).toUpperCase() !== ck) return null;
  const p = body.split('-'); if (p.length !== 3 || p[0].length !== 3) return null; const w = parseInt(p[0][0], 36) - 1, lv = parseInt(p[0][1], 36) - 1, mod = parseInt(p[0][2], 36) - 1, seed = parseInt(p[1], 36), target = parseInt(p[2], 36) * 50;
  if (!(w >= 0 && w < WORLDS.length && lv >= 0 && lv < LV - 1 && mod >= -1 && mod < DMODS.length && seed >= 0)) return null; return { w, lv, mod, seed, target, code };
}
function startChallenge(c) { const o = { mode: 'expedition', var: 'chal', w: c.w, lv: c.lv, tier: 1, co: SAVE.players === 2, chal: c }; G.last = o; beginRun(o); }
function setupChal(R, o) { const c = R.chal = o.chal, sp = R.spec; R.rng = seeded(c.seed); sp.type = 'c'; sp.waves = R.waves = 4; sp.name = 'Challenge ' + c.code; R.hazMode = false; if (c.mod >= 0 && DMODS[c.mod]) DMODS[c.mod].ap(R); }
function chalFinish(R, win, d) { const c = R.chal; d.name = 'Challenge ' + c.code; d.chal = c; d.beat = Math.round(R.score) > c.target; d.bonus = win ? 200 + (d.beat ? 300 : 0) : 30; d.newCode = chCode(c.w, c.lv, c.mod, c.seed, Math.max(c.target, Math.round(R.score))); }
function randChal() { const n = Math.max(1, Math.min(SAVE.wu, WORLDS.length)), w = Math.floor(Math.random() * n), lv = 2 + Math.floor(Math.random() * 9), mod = Math.random() < .3 ? -1 : Math.floor(Math.random() * DMODS.length); return chParse(chCode(w, lv, mod, Math.floor(Math.random() * 1679616), 0)); }

// ---- gamepad remapping ----
const PADB = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'L-STICK', 'R-STICK'];
const PADA = [['fire', 'Fire', [0, 7]], ['ab', 'Ability', [1, 3]], ['sec', 'Charge / secondary / parry', [6, 2]], ['sup', 'Super finisher', [10, 11, 8]], ['wl', 'Previous gun', [4]], ['wr', 'Next gun', [5]]];
const padBtns = a => { const m = SET.padMap; if (m && m[a] !== undefined) return [m[a]]; const r = PADA.find(x => x[0] === a); return r ? r[2] : []; };
const padDown = (gp, a) => padBtns(a).some(i => gp.buttons[i] && gp.buttons[i].pressed);
const padLabel = a => padBtns(a).map(i => PADB[i] || '#' + i).join(' / ');
function padRebindPoll(gp, prev) { if (!G.padBind) return false; for (let i = 0; i < gp.buttons.length && i < 16; i++) { if (gp.buttons[i] && gp.buttons[i].pressed && !(prev.raw && prev.raw[i])) { if (i === 9 && G.padBind !== 'pause') { } SET.padMap = SET.padMap || {}; SET.padMap[G.padBind] = i; G.padBind = null; saveSet(); SFX.click(); if (UI.top === 'scKeys') UI.refresh(); return true; } } return true; }

// ---- accessibility ----
const CBP = { dt: { orb: ['#fde047', '#facc15'], shard: ['#f0abfc', '#e879f9'], ice: ['#ffffff', '#cbd5e1'], mine: ['#fde047', '#f59e0b'], ring: ['#fef08a', '#facc15'], plasma: ['#fde047', '#fb923c'] }, tr: { orb: ['#ff3b5c', '#f43f5e'], shard: ['#ff7ad9', '#f472b6'], ice: ['#ffffff', '#fecdd3'], mine: ['#fb7185', '#e11d48'], ring: ['#ff3b5c', '#be123c'], plasma: ['#fb7185', '#e11d48'] } };
let EBCP = null;
const EBC0 = JSON.parse(JSON.stringify(EBC));
function applyAccess() { const P = CBP[SET.cbp]; for (const k in EBC0) EBC[k] = P && P[k] ? P[k] : EBC0[k]; }
function drawHitbox(g) { if (!SET.hitbox || !G.run) return; for (const p of G.players) { if (!p.alive) continue; g.save(); g.fillStyle = '#fff'; g.strokeStyle = '#ef4444'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 5, 0, TAU); g.fill(); g.stroke(); g.restore(); } }

// ---- auto performance mode ----
const PERF = { n: 0, t: 0, low: 0, step: 0 };
function perfTick(now) {
  if (SET.autoperf === false || G.scene !== 'play' || G.paused || G.cut) { PERF.t = now; PERF.n = 0; return; }
  PERF.n++; if (now - PERF.t < 1000) return; const fps = PERF.n * 1000 / (now - PERF.t); PERF.n = 0; PERF.t = now;
  if (fps < 38) PERF.low++; else PERF.low = Math.max(0, PERF.low - 1);
  if (G.run && G.t - G.run.t0 < 360) return;
  if (PERF.low < 6 || PERF.step >= 2) return; PERF.low = 0; PERF.step++;
  if (PERF.step === 1) { SET.bloom = false; SET.weather = false; } else if (PERF.step === 2) { SET.q = 1; SET.back = Math.min(SET.back, 1); SET.parts = Math.min(SET.parts, 90); layout(); }
  saveSet(); toast('PERFORMANCE MODE', 'Graphics lowered to keep the game smooth (step ' + PERF.step + '/2). Change it in Settings.', '#38bdf8');
}

// ---- run history (for the stats page) ----
function histAdd(R, win, d) { const H0 = SAVE.hist || (SAVE.hist = []); H0.push({ m: R.var || R.mode, w: R.w, s: Math.round(R.score), k: R.kills, win: win ? 1 : 0, t: d.time, at: Date.now() }); if (H0.length > 60) H0.splice(0, H0.length - 60); }
