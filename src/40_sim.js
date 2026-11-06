// ================= SIM: players, weapons, enemies, bosses, bullets, pickups, hazards =================
// key bindings: one primary key per action (rebindable in Settings), plus hidden default alternates
const KDEF = [
  { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS', f: 'Space', a: 'ShiftLeft', wl: 'KeyQ', wr: 'KeyE', c: 'KeyC', v: 'KeyV' },
  { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown', f: 'Enter', a: 'ShiftRight', wl: 'Comma', wr: 'Period', c: 'Semicolon', v: 'Quote' }
];
const KALT = [{ f: ['KeyF'], a: ['KeyR', 'KeyX'] }, { f: ['NumpadEnter', 'Slash', 'Numpad0'], a: ['KeyM'] }];
const KB = [{}, {}], KALL = {};
function applyKeys() {
  const ck = SET.keys || {};
  for (let i = 0; i < 2; i++) for (const a in KDEF[i]) { const c = ck[i + a]; KB[i][a] = Array.isArray(c) && c.length ? c.slice() : [KDEF[i][a]].concat(KALT[i][a] || []); }
  for (const a of ['l', 'r', 'u', 'd', 'f', 'a', 'c', 'v']) KALL[a] = KB[0][a].concat(KB[1][a]);
}
applyKeys();
const abKey = c => { if (G.players.length > 1 && !G.net) return KB[0].a.indexOf(c) >= 0 ? 0 : KB[1].a.indexOf(c) >= 0 ? 1 : -1; return KALL.a.indexOf(c) >= 0 ? 0 : -1; };
const kdown = list => { for (let i = 0; i < list.length; i++) if (IN.keys[list[i]]) return true; return false; };
const DIFFM = [{ hp: .8, dm: .7 }, { hp: 1, dm: 1 }, { hp: 1.25, dm: 1.35 }];

function mkPlayer(i) {
  const pl = (G.netPl && G.netPl[i]) || SAVE.pl[i], st = shipStats(pl);
  return { id: i, pl, cfg: pl.cfg, x: 140, y: V.H / 2 + [-70, 70, -150, 150][i & 3] * (G.coop || i > 1 ? 1 : 0), vx: 0, vy: 0, st, hp: st.hp, mhp: st.hp, sh: st.sh, msh: st.sh, am: st.am, mam: st.am, wpn: WPN[pl.wpn] && pl.wown.indexOf(pl.wpn) >= 0 ? pl.wpn : 'twin', alive: true, inv: 100, blink: false, fcd: 0, od: 0, slow: 0, rest: 0, shT: 0, score: 0, kills: 0, lastHit: 0, gx: 0, mod: newMod(), cards: {}, abCd: 0, abMax: 1, wallT: 0, ovl: 0, dashT: 0, dvx: 0, dvy: 0, lmx: 0, lmy: 0, gzc: 0, bcd: 0, dr: [], oa: 0, orbP: [], phaseT: 0, reflT: 0, sup: 0, supT: 0, chg: 0, secCd: 0, pcd: 0, parT: 0, secH: false };
}
function setWeapon(p, id) { if (p.pl.wown.indexOf(id) >= 0 && p.wpn !== id) { p.wpn = id; p.pl.wpn = id; SFX.click(); alertMsg(WPN[id].nm.toUpperCase()); } }
function cycleWeapon(p, dir) { const own = WORDER.filter(w => p.pl.wown.indexOf(w) >= 0); if (own.length < 2) { alertMsg('ONLY ONE WEAPON OWNED'); return; } setWeapon(p, own[(own.indexOf(p.wpn) + dir + own.length) % own.length]); }
const alive = () => G.players.filter(p => p.alive);
function nearP(x, y) { let b = null, bd = 1e9; for (const p of G.players) { if (!p.alive) continue; const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (d < bd) { bd = d; b = p; } } return b; }
function nearE(x, y, maxD, skip) { let b = null, bd = maxD * maxD; for (const e of G.ent.en) { if (e.dead || e.x > V.W + 10 || (skip && skip.indexOf(e) >= 0)) continue; const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y); if (d < bd) { bd = d; b = e; } } return b; }

// ---------- input -> intent ----------
function inputFor(p) {
  if (p.remote) return netRemoteInput(p);
  const co = G.players.length > 1 && !G.net, me = G.net ? !!p.local : p.id === 0, o = { mx: 0, my: 0, tx: null, ty: null, fire: false }, k = co ? KB[p.id] : KALL, P = IN.ptr;
  if (kdown(k.l)) o.mx -= 1; if (kdown(k.r)) o.mx += 1; if (kdown(k.u)) o.my -= 1; if (kdown(k.d)) o.my += 1; if (kdown(k.f)) o.fire = true;
  if (o.mx || o.my) P.fresh = false;
  const pad = co ? IN.pads[p.id] : IN.pads[0]; if (pad) { o.mx += pad.x; o.my += pad.y; if (pad.fire) o.fire = true; if (pad.x || pad.y) P.fresh = false; }
  const si = G.net ? 0 : p.id; if (IN.swap[si]) { cycleWeapon(p, IN.swap[si]); IN.swap[si] = 0; }
  if (me && P.type === 'mouse' && P.fresh) { o.tx = P.tx; o.ty = P.ty; if (P.down) o.fire = true; }
  if (touchOn()) {
    if (SET.scheme === 'stick') { if (me || !co) { if (IN.stick.x || IN.stick.y) { o.mx += IN.stick.x; o.my += IN.stick.y; } if (IN.tfire) o.fire = true; } }
    else { const ids = Object.keys(IN.tp); let pt = null; for (const id of ids) { const q = IN.tp[id]; if (!co || (p.id === 0) === (q.x < V.W / 2)) { pt = q; break; } } if (pt) { o.tx = pt.tx; o.ty = pt.ty; o.fire = true; } }
  }
  p.lmx = o.mx; p.lmy = o.my; if (o.tx !== null) { p.lmx = o.tx - p.x; p.lmy = o.ty - p.y; }
  if (SET.auto) o.fire = true;
  return o;
}
const BOUND = () => ({ x0: G.run && G.run.stn ? 84 : 34, x1: V.W - 34, y0: 40, y1: V.H - 34 });

// ---------- player update ----------
function updPlayer(p) {
  if (p.alive && !SET.reduce) { const f = p.hp / p.mhp; if (f < .6 && G.t % (f < .3 ? 3 : 7) === 0) smoke(p.x - 14, p.y + rnd(-4, 4), 1, f < .3 ? 12 : 8); if (f < .35 && G.t % 4 === 0) spark(p.x - 10, p.y + rnd(-6, 6), 1, Math.random() < .5 ? '#fb923c' : '#fde047', 2.2, 16, 2.4); }
  if (!p.alive) { if (G.run && G.run.var === 'versus') return; if (G.players.length > 1 && alive().length && p.rest > 0) { if (!coopDead(p) && --p.rest <= 0) revive(p); } return; }
  const o = inputFor(p), hz = curHz(), sp = p.st.spd * 1.25 * (p.slow > 0 ? .55 : 1) * (p.phaseT > 0 ? 1.4 : 1);
  const ai = G.net ? (p.local ? 0 : -1) : p.id; if (ai >= 0 && IN.ab[ai]) { IN.ab[ai] = 0; useAbility(p); } if (p.remote && p.netAb) { p.netAb = 0; useAbility(p); }
  if (p.remote) { const B0 = BOUND(); p.vx = (o.x - p.x) * .5; p.vy = (o.y - p.y) * .5; p.x = clamp(o.x, B0.x0, B0.x1); p.y = clamp(o.y, B0.y0, B0.y1); }
  else if (o.tx !== null) {
    const dx = o.tx - p.x, dy = o.ty - p.y, d = Math.hypot(dx, dy) || 1, v = Math.min(d * .22, sp * 2.2);
    p.vx += (dx / d * v - p.vx) * .5; p.vy += (dy / d * v - p.vy) * .5;
  } else {
    let mx = o.mx, my = o.my; const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    const acc = hz === 'ice' ? .05 : .3; p.vx += (mx * sp - p.vx) * acc; p.vy += (my * sp - p.vy) * acc;
  }
  if (hz === 'wind') p.vy += Math.sin(G.t * .012 + 1) * .1;
  if (hz === 'current') p.vx += Math.sin(G.t * .008) * .08 - .02;
  if (hz === 'pulse' && G.t % 480 > 430) p.vx -= .4;
  if (hz === 'bhole') { const dx = V.W * .82 - p.x, dy = V.H * .5 - p.y, d = Math.hypot(dx, dy) || 1; p.vx += dx / d * .07 * Math.min(2, 260 / d); p.vy += dy / d * .07 * Math.min(2, 260 / d); }
  if (p.remote) { if (p.dashT > 0) p.dashT--; } else if (p.dashT > 0) { p.dashT--; p.vx = p.dvx; p.vy = p.dvy; if (!p.dashT) { p.dvx *= .3; p.dvy *= .3; p.vx = p.dvx; p.vy = p.dvy; } }
  if (!p.remote) { p.x += p.vx; p.y += p.vy; const B = BOUND(); p.x = clamp(p.x, B.x0, B.x1); p.y = clamp(p.y, B.y0, B.y1); }
  if (p.inv > 0) p.inv--; if (p.slow > 0) p.slow--; if (p.od > 0) p.od--; p.lastHit++;
  if (G.run && G.run.freeAmmo) p.am = p.mam;
  p.fcd--;
  if (o.fire && p.fcd <= 0 && !(p.supT > 0)) fireP(p);
  combatTick(p, o);
  updMeta(p);
  const spd = Math.hypot(p.vx, p.vy), dsh = p.dashT > 0;
  if (!SET.reduce && (G.t % 3 === 0 || dsh || (spd > 3.2 && G.t % 2 === 0))) { const bo = Math.min(1, spd / 6), L = 14 + bo * 8; pcl({ x: p.x - 32 * (HULLK[p.cfg.hull] || 1), y: p.y + rnd(-3, 3), vx: -2.2 - Math.abs(p.vx) * .2 - bo * 2.4 - (dsh ? 4 : 0), vy: rnd(-.3, .3), l: L, l0: L, c: dsh ? '#e0f2fe' : trailCol(p), r: 3 + bo * 2 + (dsh ? 3 : 0), k: 0, fr: .9 }); }
}
function revive(p) { p.alive = true; p.hp = p.mhp * .5; p.sh = 0; p.inv = 150; p.blink = true; const q = alive()[0]; if (q) { p.x = q.x - 40; p.y = q.y + 60; } R3 && R3.repair(p); shock(p.x, p.y, '#4ade80', 90); alertMsg('PILOT ' + (p.id + 1) + ' BACK IN THE FIGHT'); SFX.power(); }
function pb(p, x, y, vx, vy, k, o) {
  const w = WPN[k] || WPN.twin, m = p.mod, b = Object.assign({ x, y, vx, vy, r: 4, d: 5, k, c: k === p.wpn ? bulletCol(p, k, w.c) : w.c, pierce: 0, hs: [], own: p.id, l: 100, home: 0, hm2: 0, blast: 0, chain: 0, crush: 0 }, o);
  if (m.home && !b.home) b.hm2 = m.home;
  if (m.pierce && b.pierce < 90) b.pierce += m.pierce;
  if (p.ovl > 0 && b.pierce < 90) b.pierce += 2;
  if (m.blast && !b.blast) { b.blast = 24 + 9 * m.blast; b.cb = 1; }
  if (m.chain) b.chain += m.chain;
  if (m.crit && Math.random() < m.crit) { b.d *= 3; b.crit = 1; }
  G.ent.pb.push(b);
}
function fireP(p) {
  const W = WPN[p.wpn], kk = HULLK[p.cfg.hull] || 1, nx = p.x + 30 * kk, od = p.od > 0 ? 1.5 : 1, lv = wlvOf(p.pl, p.wpn), ev = wevOf(p.pl, p.wpn), ov = p.ovl > 0, m = p.mod;
  const rate = p.st.rate * od * (1 + .04 * lv) * (ov ? 1.8 : 1);
  if (p.am < W.am) { p.fcd = 15 / rate; pb(p, nx, p.y, 11, 0, 'twin', { d: 2.2 * p.st.dmg, c: '#94a3b8', r: 3 }); SFX.aux(); return; }
  p.am -= W.am * (1 - .03 * lv); p.fcd = W.r / rate; const d = W.d * p.st.dmg * od * (G.pdm || 1) * (1 + .12 * lv) * (ov ? 1.15 : 1), s = W.s;
  switch (p.wpn) {
    case 'twin': { const pr = ev ? 1 : 0; pb(p, nx, p.y - 9, s, 0, 'twin', { d, pierce: pr }); pb(p, nx, p.y + 9, s, 0, 'twin', { d, pierce: pr }); if (ev) pb(p, nx + 5, p.y, s, 0, 'twin', { d: d * 1.1, pierce: pr }); break; }
    case 'spread': { const n = ev ? 3 : 2; for (let i = -n; i <= n; i++) { const a = i * (ev ? .13 : .17); pb(p, nx, p.y, Math.cos(a) * s, Math.sin(a) * s, 'spread', { d: ev ? d * 1.15 : d, r: 3.4, l: ev ? 70 : 55 }); } break; }
    case 'lancer': if (ev) { [-7, 7].forEach(q => pb(p, nx, p.y + q, s, 0, 'lancer', { d: d * .85, r: 7, pierce: 99, l: 80 })); } else pb(p, nx, p.y, s, 0, 'lancer', { d, r: 6, pierce: 99, l: 80 }); break;
    case 'ion': { const a = rnd(-.05, .05); pb(p, nx, p.y + rnd(-6, 6), Math.cos(a) * s, Math.sin(a) * s, 'ion', { d: ev ? d * 1.2 : d, r: 3.4 }); if (ev) { const a2 = rnd(-.07, .07); pb(p, nx, p.y + rnd(-10, 10), Math.cos(a2) * s, Math.sin(a2) * s, 'ion', { d: d * 1.2, r: 3.4 }); } break; }
    case 'missile': (ev ? [-1, 1, -2, 2] : [-1, 1]).forEach(q => pb(p, nx - 6, p.y + q * 10, s, q * 2.4, 'missile', { d, r: 6, home: 1, blast: ev ? 80 : 62, l: 150 })); break;
    case 'orb': pb(p, nx + 6, p.y, s, 0, 'orb', ev ? { d: d * 1.25, r: 23, pierce: 99, crush: 1, l: 200, blast: 78 } : { d, r: 17, pierce: 99, crush: 1, l: 200 }); break;
    case 'arc': pb(p, nx, p.y, s, 0, 'arc', { d, r: 6, chain: ev ? 5 : 3, l: 70 }); break;
    case 'rail': pb(p, nx, p.y, s, 0, 'rail', { d, r: 5, pierce: 99, l: 60 }); if (ev) [-.05, .05].forEach(a => pb(p, nx, p.y, Math.cos(a) * s, Math.sin(a) * s, 'rail', { d: d * .5, r: 4, pierce: 99, l: 60 })); G.ent.bm.push({ k: 'trail', x: nx, y: p.y, l: 8, l0: 8 }); break;
  }
  if (m.multi) { const dd = d * .55; for (let i = 1; i <= m.multi; i++) for (const q of [-1, 1]) { const a = q * (.1 + i * .08); pb(p, nx - 4, p.y + q * 12, Math.cos(a) * s, Math.sin(a) * s, 'ion', { d: dd, r: 3, l: 60, c: W.c }); } }
  SFX.shoot(p.wpn); if (p.wpn === 'orb' || p.wpn === 'rail') shake(1.5, 4);
}

// ---------- damage to player ----------
// V55: an enemy bullet always takes at least a third of your max hull (before shields)
function bulletDmg(p, d) { const R = G.run, m = R && R.mode; if (!R || m === 'training' || m === 'tutorial' || R.var === 'versus') return d; return Math.max(d, p.mhp / 3); }
function hurt(p, dmg, kind) {
  if (!p.alive || p.inv > 0 || G.god || (G.run && G.run.nodmg)) return false;
  const R0 = G.run; dmg = Math.round(dmg * (DIFFM[SET.diff] || DIFFM[1]).dm * p.mod.arm * (R0 && R0.assist ? .65 : 1)); if (dmg <= 0) return false;
  if (R0) { R0.lastSrc = R0.boss ? 'boss' : kind; if (R0.var === 'nohit') { ftext(p.x, p.y - 30, 'HIT!', '#fb7185', 20); p.sh = 0; p.hp = 0; killPlayer(p); return true; } }
  p.lastHit = 0; p.inv = 42; let hull = 0;
  if (p.sh > 0) { const a = Math.min(p.sh, dmg); p.sh -= a; dmg -= a; shock(p.x, p.y, '#38bdf8', 56, 16); SFX.shield(); if (p.sh <= 0) { ftext(p.x, p.y - 26, 'SHIELD DOWN', '#38bdf8', 11); shake(3, 8); if (p.mod.burst && p.bcd <= 0) shieldBurst(p); } }
  if (R0 && R0.var === 'versus') p.score = Math.max(0, p.score - 100);
  if (dmg > 0) { hull = dmg; p.hp -= dmg; p.blink = true; SFX.hurt(); shake(4 + Math.min(8, dmg / 3), 12); G.hitT = 14; haptic(40); G.freeze = dmg >= 18 ? 4 : 2; spark(p.x, p.y, 12, '#fb923c', 5, 28, 3); smoke(p.x, p.y, 2, 12); ftext(p.x, p.y - 24, '-' + dmg, '#fb7185', 14); if (G.run) G.run.hurt += dmg; if (R3) R3.hit(p, dmg >= 14 ? 1 : 0); }
  else p.inv = 20;
  if (R0) R0.low = Math.min(R0.low === undefined ? 1 : R0.low, Math.max(0, p.hp) / p.mhp);
  if (p.hp <= 0) {
    if (p.mod.second > 0) { p.mod.second--; p.hp = Math.max(1, p.mhp * .5); p.sh = p.msh; p.inv = 150; p.blink = false; G.flashT = 12; shock(p.x, p.y, '#fbbf24', 220, 30); shock(p.x, p.y, '#ffffff', 120, 20); ftext(p.x, p.y - 40, 'SECOND WIND', '#fbbf24', 14); alertMsg('SECOND WIND!'); SFX.power(); if (R3) R3.repair(p); }
    else killPlayer(p);
  }
  return true;
}
function killPlayer(p) {
  p.alive = false; p.hp = 0; boom2D(p.x, p.y, 70, '#f97316'); shake(14, 24); G.freeze = 8; SFX.boom(true); haptic([60, 40, 90]); if (R3) R3.die(p);
  p.dX = p.x; p.dY = p.y; p.rv = 0;
  if (G.run && G.run.var === 'versus') { p.rest = 180; alertMsg('PILOT ' + (p.id + 1) + ' DOWN - RESPAWNING (-400)'); }
  else if (G.players.length > 1 && alive().length && !(G.run && G.run.var === 'hardcore')) { p.rest = 900; alertMsg('PILOT ' + (p.id + 1) + ' DOWN - FLY TO THEIR SPOT TO REVIVE'); }
}

// ---------- enemies ----------
function runMul() { const R = G.run, dm = DIFFM[SET.diff] || DIFFM[1]; return { hp: R.hpm * dm.hp * (G.players.length > 1 ? 1 + .6 * (G.players.length - 1) : 1), ed: R.edm }; }
function mkEnemy(id, x, y, o) {
  const d = EN[id], mu = runMul();
  const e = { id, d, boss: false, dfT: G.run && G.run.stn ? rint(500, 900) : 1e9, x, y, y0: y, vx: 0, vy: 0, w: d.w, r: d.w * .34, hp: 1, mhp: 1, t: 0, ph: Math.random() * TAU, st: 0, fcd: rint(30, Math.max(31, d.f ? d.f.r : 60)), hf: 0, ram: d.ram || 20, dead: false, hx: V.W * rnd(.6, .86), sa: 0, bq: 0, bcd: 0, bang: 0, hide: false, minion: !!(o && o.minion), tx: 0, ty: 0, ux: 0 };
  e.hp = e.mhp = Math.max(1, Math.round(d.hp * mu.hp * (o && o.hpm || 1)));
  if (G.run && G.run.brief && id !== 'rock') { const sn = G.run.seen || (G.run.seen = {}); if (!sn[id]) { sn[id] = 1; e.tagUntil = G.t + 240; } }
  if (d.ai === 'bomber') e.y = e.y0 = Math.random() < .5 ? 80 : V.H - 80;
  if (d.ai === 'drop') { e.x = V.W * rnd(.45, 1); e.y = -40; e.vy = d.sp * 1.9; e.vx = -d.sp * .5; }
  if (d.ai === 'charge') e.hx = V.W * rnd(.7, .9);
  G.ent.en.push(e); return e;
}
function updEnemy(e) {
  const d = e.d, ts = G.ts || 1, sp = d.sp * ts, P = nearP(e.x, e.y), W = V.W, Hh = V.H; e.t++; if (e.hf > 0) e.hf--;
  switch (d.ai) {
    case 'line': e.x -= sp; if (e.vy) e.y += e.vy * ts; break;
    case 'sine': e.x -= sp; e.y = clamp(e.y0 + Math.sin(e.t * .045 + e.ph) * 80, 60, Hh - 60); break;
    case 'zig': e.x -= sp * .8; if (!e.vy) e.vy = (Math.random() < .5 ? -1 : 1) * sp * 1.1; if (e.t % 50 === 0) e.vy = -e.vy; e.y += e.vy * ts; if (e.y < 60 || e.y > Hh - 60) { e.vy = -e.vy; e.y = clamp(e.y, 60, Hh - 60); } break;
    case 'dive': if (e.st === 0) { e.x -= sp; if (P && e.x < Math.max(P.x + 360, W * .62)) { e.st = 1; const a = Math.atan2(P.y - e.y, P.x - e.x); e.vx = Math.cos(a) * sp * 1.7; e.vy = Math.sin(a) * sp * 1.7; } } else { e.x += e.vx * ts; e.y += e.vy * ts; } break;
    case 'hover': if (e.x > e.hx) e.x -= sp * 1.2; else { e.x -= .12 * ts; e.y = clamp(e.y0 + Math.sin(e.t * .02 + e.ph) * 120, 70, Hh - 70); } break;
    case 'charge':
      if (e.st === 0) { e.x -= sp; if (e.x < e.hx && e.t > 40) { e.st = 1; e.ux = 0; } }
      else if (e.st === 1) { e.ux++; e.hide = false; e.x += Math.sin(e.ux * 1.5) * 1.2; if (e.ux > 36) { e.st = 2; const a = P ? Math.atan2(P.y - e.y, P.x - e.x) : PI; e.vx = Math.cos(a) * sp * 3.6; e.vy = Math.sin(a) * sp * 3.6; } if (e.ux % 6 < 3) e.hf = 2; }
      else { e.x += e.vx * ts; e.y += e.vy * ts; if (++e.ux > 100) e.st = 3; } if (e.st === 3) e.x -= sp * 1.2; break;
    case 'orbit': e.x -= sp * .7; { const a = e.t * .04 + e.ph; e.y = clamp(e.y0 + Math.sin(a) * 90, 60, Hh - 60); e.x += Math.cos(a) * 1.1; } break;
    case 'drift': e.x -= sp; e.y = clamp(e.y0 + Math.sin(e.t * .02 + e.ph) * 40, 60, Hh - 60); if (P && Math.hypot(P.x - e.x, P.y - e.y) < 62 && d.burst) hurtEnemy(e, 9999, null); break;
    case 'seeker': { if (e.x > W + 40) { e.x -= sp; break; } if (P) { const a = Math.atan2(P.y - e.y, P.x - e.x); e.vx += Math.cos(a) * .08 * ts; e.vy += Math.sin(a) * .08 * ts; const v = Math.hypot(e.vx, e.vy), m = sp * 1.15; if (v > m) { e.vx *= m / v; e.vy *= m / v; } } e.x += e.vx - .35; e.y += e.vy; break; }
    case 'blink':
      if (e.x > e.hx) e.x -= sp * 1.4; else { e.ux++; const c = e.ux % 130; if (c === 100) { e.hide = true; e.hf = 0; } if (c === 115) { e.x = W * rnd(.5, .92); e.y = rnd(80, Hh - 80); e.y0 = e.y; e.hide = false; shock(e.x, e.y, hex(hx((d.m[1] || {}).e || 0xffffff)), 60, 14); if (d.f) e.fcd = Math.min(e.fcd, 12); } }
      break;
    case 'bomber': e.x -= sp; e.y += (e.y0 < Hh / 2 ? 1 : -1) * Math.sin(e.t * .03) * .6; break;
    case 'snake': e.x -= sp * .9; e.y = clamp(e.y0 + Math.sin(e.t * .06 + e.ph) * 120, 60, Hh - 60); break;
    case 'turret': e.x -= e.x > W * .8 ? sp : .45 * ts; e.y += Math.sin(e.t * .02 + e.ph) * .4; break;
    case 'drop': e.x += e.vx * ts; e.y += e.vy * ts; break;
    case 'swoop': e.x -= sp * .85; e.y = clamp(e.y0 + Math.sin(e.t * .03 + e.ph) * (Hh * .32), 60, Hh - 60); break;
    default: e.x -= sp;
  }
  if (G.run && G.run.stn) { if (e.t > e.dfT) e.x -= .5 * ts; if (e.x < STN_X + e.w * .25) { stnRam(e); return; } }
  if (e.x < -e.w * 1.6 || e.y < -120 - (d.ai === 'drop' ? 0 : 60) || e.y > Hh + 120) { e.dead = true; e.esc = true; if (!e.minion && G.run) G.run.esc++; return; }
  // fire
  if (d.f && e.x < W - 24 && e.x > 20 && !e.hide) {
    if (--e.fcd <= 0) { fireEnemy(e); e.fcd = Math.max(6, d.f.r * (d.elite ? 1 : 1.25) * rnd(.85, 1.15) / (1 + (G.run.diff - 1) * .1)); }
    if (e.bq > 0 && --e.bcd <= 0) { ebullet(e.x - e.w * .35, e.y, Math.cos(e.bang) * d.f.s, Math.sin(e.bang) * d.f.s, 'shard'); e.bq--; e.bcd = 6; }
  }
  if (d.summon && e.x < W - 40 && e.t % 340 === 220 && G.ent.en.filter(q => q.minion).length < 6) for (let i = 0; i < 2; i++) mkEnemy(d.summon, e.x - 30, e.y + (i ? 60 : -60), { minion: 1, hpm: .7 });
}
function ebullet(x, y, vx, vy, k, o) {
  if (G.ent.eb.length > 460 || (G.ent.eb.length > 130 && !(o && o.d !== undefined))) return; const d = o && o.d !== undefined ? o.d : Math.round(10 * G.run.edm);
  G.ent.eb.push({ x, y, vx, vy, k: k || 'orb', r: (o && o.r) || (k === 'shard' ? 5 : k === 'mine' ? 10 : 6), d, l: (o && o.l) || 420, ice: o && o.ice, mine: o && o.mine, hm: o && o.hm, arm: 0 });
}
function fireEnemy(e) {
  const f = e.d.f, P = nearP(e.x, e.y), ang = P ? Math.atan2(P.y - e.y, P.x - e.x) : PI, ox = e.x - e.w * .3, mk = (a, s, k, o) => ebullet(ox, e.y, Math.cos(a) * s, Math.sin(a) * s, k, o);
  switch (f.k) {
    case 'aim': mk(ang, f.s, 'orb'); break;
    case 'aimfast': mk(ang, f.s, 'shard'); break;
    case 'aimice': mk(ang, f.s, 'ice', { ice: 1 }); break;
    case 'aim3': for (let i = -1; i <= 1; i++) mk(ang + i * .26, f.s, 'orb'); break;
    case 'fan': { const n = f.n || 5; for (let i = 0; i < n; i++) mk(ang + (i - (n - 1) / 2) * .17, f.s, 'orb'); break; }
    case 'ring': { const n = f.n || 10, a0 = Math.random() * TAU; for (let i = 0; i < n; i++) mk(a0 + i / n * TAU, f.s, 'ring'); break; }
    case 'line': mk(PI, f.s, 'orb'); break;
    case 'burst': e.bq = f.n || 3; e.bcd = 0; e.bang = ang; break;
    case 'spiral': e.sa += .42; mk(e.sa, f.s, 'ring'); break;
    case 'drop': ebullet(e.x, e.y, -.8, e.y < V.H / 2 ? f.s : -f.s, 'orb'); break;
    case 'mine': ebullet(e.x, e.y, -1.1, 0, 'mine', { mine: 1, l: 460 }); break;
    case 'wall': wallOf(f.s, e.x, 12); break;
  }
  if (f.k !== 'spiral') SFX.hit();
}
function wallOf(s, x, n) { const gap = rint(1, n - 3), step = (V.H - 100) / n; for (let i = 0; i < n; i++) if (i < gap || i > gap + 1) ebullet(x, 70 + i * step, -s, 0, 'shard', { r: 6 }); }
function hurtEnemy(e, dmg, b) {
  if (e.dead || e.inv) { if (e.inv) spark(e.x, e.y, 3, '#94a3b8', 3, 12, 2); return false; }
  if (e.boss && !(b && b.raw)) dmg *= bossArmor(e);
  e.hp -= dmg; e.hf = 4; if (dmg < 9000) { const cr = b && b.crit; ftext(e.x + rnd(-10, 10), e.y - e.r - 6, Math.max(1, Math.round(dmg)), cr ? '#fb923c' : dmg > 20 ? '#fde047' : '#e2e8f0', cr ? 17 : dmg > 20 ? 14 : 11); SFX.hit(); }
  if (e.hp <= 0) { if (e.boss) killBoss(e, b); else killEnemy(e, b ? b.own : -1); return true; }
  return false;
}
function killEnemy(e, own) {
  if (e.dead) return; e.dead = true; const d = e.d, R = G.run, col = hex(d.m[1].e || 0xf97316);
  if (R && R.mode !== 'tutorial' && e.id !== 'dummy') { if (!SAVE.kd[e.id]) toast('BESTIARY: ' + d.nm.toUpperCase(), 'New entry - see Profile > Bestiary', '#22d3ee'); SAVE.kd[e.id] = (SAVE.kd[e.id] || 0) + 1; }
  boom2D(e.x, e.y, e.w * .75, col); SFX.boom(); if (R3) R3.boom(e.x, e.y, Math.min(14, 4 + (e.w / 12 | 0)), hx(d.m[1].c || 0x555555), 5 + e.w / 40, 6 + e.w / 12);
  R.kills++; R.combo = R.comboT > 0 ? R.combo + 1 : 1; R.comboT = 150; if (R.combo > R.maxCombo) R.maxCombo = R.combo; const mul = 1 + Math.min(R.combo, 20) * .1; R.score += Math.round(d.sc * mul); const pl = G.players[own]; if (pl) { pl.kills++; pl.score += d.sc; if (pl.alive && pl.mod.vamp) pl.hp = Math.min(pl.mhp, pl.hp + pl.mod.vamp * (d.elite ? 3 : .35)); }
  if (R.blitz) R.time += .5; shake(d.elite ? 8 : 2, d.elite ? 14 : 5); if (d.elite) { G.freeze = 5; shock(e.x, e.y, '#fff', 160, 26); shock(e.x, e.y, col, 270, 34); boom2D(e.x + rnd(-18, 18), e.y + rnd(-18, 18), e.w * .9, col); }
  dropLoot(e); onKillC(e, own); if (e.id === 'rival') rivalDown(e); killFx(e); { const kp = G.players[own]; if (kp && R) { const wk = R.wk || (R.wk = {}); wk[kp.wpn] = (wk[kp.wpn] | 0) + 1; } }
  if (d.burst) for (let i = 0; i < d.burst; i++) { const a = i / d.burst * TAU; ebullet(e.x, e.y, Math.cos(a) * 3.2, Math.sin(a) * 3.2, 'shard'); }
  if (d.split) for (let i = 0; i < 2; i++) { const c = mkEnemy(d.split, e.x, e.y + (i ? 26 : -26), { hpm: 1 }); c.vy = i ? 2 : -2; c.st = 9; }
}
function dropLoot(e) {
  const d = e.d, R = G.run, E = G.ent.pk; let cv = ECON * ((R.lootM || 1) * d.cr * (e.gold ? 3 : 1) * (1 + (R.w || 0) * .12) * (1 + (R.remix ? .3 * (R.remix - 1) : 0)) * (1 + G.players.reduce((a, q) => a + q.mod.loot, 0))); cv = Math.floor(cv) + (Math.random() < cv % 1 ? 1 : 0); if (R.mode === 'training' || R.mode === 'tutorial') cv = Math.min(cv, 1);
  const n = cv <= 0 ? 0 : cv <= 4 ? 1 : cv <= 14 ? 3 : 6, each = Math.max(1, Math.round(cv / n));
  for (let i = 0; i < n; i++) E.push({ k: 'core', v: each, x: e.x + rnd(-14, 14), y: e.y + rnd(-14, 14), vx: rnd(-1.5, 1), vy: rnd(-1.5, 1.5), l: 700 });
  const lowAm = G.players.some(p => p.alive && p.am < p.mam * .55 && !(R.freeAmmo));
  const roll = () => Math.random();
  if (!R.freeAmmo && (roll() < (lowAm ? .38 : .17) * (R.ammoDrop || 1) || d.elite)) E.push({ k: 'ammo', x: e.x, y: e.y, vx: -1, vy: rnd(-1, 1), l: 760 });
  if (roll() < (d.elite ? .45 : .03)) E.push({ k: 'hp', x: e.x, y: e.y, vx: -1, vy: rnd(-1, 1), l: 760 });
  if (roll() < (d.elite ? .45 : .035)) E.push({ k: 'sh', x: e.x, y: e.y, vx: -1, vy: rnd(-1, 1), l: 760 });
  if (roll() < (d.elite ? .3 : .02)) E.push({ k: 'od', x: e.x, y: e.y, vx: -1, vy: rnd(-1, 1), l: 760 });
}
function updPickups() {
  const E = G.ent.pk, magnetAll = G.run && G.run.stage === 'clear';
  for (let i = E.length - 1; i >= 0; i--) {
    const k = E[i]; k.l--; k.x += k.vx; k.y += k.vy; k.vx += (-1.0 - k.vx) * .04; k.vy *= .94;
    const P = nearP(k.x, k.y);
    if (P) { const dx = P.x - k.x, dy = P.y - k.y, d = Math.hypot(dx, dy), mr = (k.k === 'core' ? 120 : 90) * P.st.mag + (magnetAll ? 3000 : 0); if (d < mr) { const pull = (magnetAll ? 14 : 7) * (1 - d / (mr + 1)) + 1.5; k.x += dx / d * pull; k.y += dy / d * pull; } if (d < 30) { collect(P, k); E.splice(i, 1); continue; } }
    if (k.l <= 0 || k.x < -30) E.splice(i, 1);
  }
}
function collect(p, k) {
  const R = G.run; SFX.pick();
  if (k.k === 'core') { if (p.remote) { R.rCores = (R.rCores | 0) + k.v; ftext(p.x, p.y - 22, '+' + k.v, '#fbbf24', 12); } else { SAVE.cores += k.v; R.cores += k.v; } ftext(p.x, p.y - 22, '+' + k.v, '#fbbf24', 12); }
  else if (k.k === 'ammo') { const a = Math.max(30, p.mam * .4); p.am = Math.min(p.mam, p.am + a); ftext(p.x, p.y - 22, '+PLASMA', '#2dd4bf', 12); shock(p.x, p.y, '#2dd4bf', 50, 14); }
  else if (k.k === 'hp') { const a = Math.max(20, p.mhp * .2); p.hp = Math.min(p.mhp, p.hp + a); ftext(p.x, p.y - 22, '+HULL', '#4ade80', 12); shock(p.x, p.y, '#4ade80', 56, 16); SFX.power(); if (R3) { if (p.hp > p.mhp * .9) R3.repair(p); } }
  else if (k.k === 'sh') { p.sh = Math.min(p.msh, p.sh + Math.max(20, p.msh * .4)); ftext(p.x, p.y - 22, '+SHIELD', '#38bdf8', 12); shock(p.x, p.y, '#38bdf8', 56, 16); SFX.power(); }
  else if (k.k === 'log') gotLog(p, k);
  else if (k.k === 'od') { p.od = 600; ftext(p.x, p.y - 22, 'OVERDRIVE!', '#fb923c', 13); shock(p.x, p.y, '#fb923c', 90, 20); SFX.power(); }
  if (R.tut) R.tut.picked[k.k] = true;
}

// ---------- player bullets ----------
function updPB() {
  const A = G.ent.pb, En = G.ent.en;
  for (let i = A.length - 1; i >= 0; i--) {
    const b = A[i]; let rm = false;
    if (b.home) { const t = nearE(b.x, b.y, 460); if (t) { const want = Math.atan2(t.y - b.y, t.x - b.x), cur = Math.atan2(b.vy, b.vx); let df = want - cur; while (df > PI) df -= TAU; while (df < -PI) df += TAU; const na = cur + clamp(df, -.1, .1), sp = Math.hypot(b.vx, b.vy) * 1.012; b.vx = Math.cos(na) * Math.min(sp, 13); b.vy = Math.sin(na) * Math.min(sp, 13); } if (G.t % 2 === 0) pcl({ x: b.x - b.vx, y: b.y, vx: -1, vy: rnd(-.4, .4), l: 14, l0: 14, c: '#fb923c', r: 4, k: 0, fr: .9 }); }
    else if (b.hm2) { let t = null, bd = 330 * 330; for (const e of En) { if (e.dead || e.hide || e.x > V.W + 10 || e.x < b.x - 6) continue; const dd = (e.x - b.x) * (e.x - b.x) + (e.y - b.y) * (e.y - b.y); if (dd < bd) { bd = dd; t = e; } } if (t) { const sp = Math.hypot(b.vx, b.vy), want = Math.atan2(t.y - b.y, t.x - b.x), cur = Math.atan2(b.vy, b.vx); let df = want - cur; while (df > PI) df -= TAU; while (df < -PI) df += TAU; const na = cur + clamp(df, -.022 * b.hm2, .022 * b.hm2); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; } }
    b.x += b.vx; b.y += b.vy; b.l--;
    if (b.crush) { const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j]; if ((q.x - b.x) * (q.x - b.x) + (q.y - b.y) * (q.y - b.y) < (b.r + q.r + 6) * (b.r + q.r + 6)) { spark(q.x, q.y, 3, '#c084fc', 3, 14, 2); eb.splice(j, 1); } } }
    const bs = G.run && G.run.boss;
    if (bs && bs.pods) { const pd = podHit(bs, b); if (pd && b.hs.indexOf(pd) < 0) { b.hs.push(pd); hurtPod(bs, pd, b.d, b); spark(b.x, b.y, 4, b.c, 3, 12, 2); if (b.pierce > 0) b.pierce--; else { A.splice(i, 1); continue; } } }
    for (let j = 0; j < En.length; j++) {
      const e = En[j]; if (e.dead || e.x > V.W + 8 || e.hide) continue;
      const rr = b.r + e.r; if ((e.x - b.x) * (e.x - b.x) + (e.y - b.y) * (e.y - b.y) > rr * rr) continue;
      if (b.hs.indexOf(e) >= 0) continue; b.hs.push(e);
      hurtEnemy(e, b.d, b); spark(b.x, b.y, 4, b.c, 3, 12, 2);
      if (b.blast) { if (b.cb) { shock(b.x, b.y, '#fb923c', b.blast * 1.1, 12); spark(b.x, b.y, 4, '#fbbf24', 3, 10, 2); } else boom2D(b.x, b.y, 38, '#fb923c'); for (const q of En) if (q !== e && !q.dead && (q.x - b.x) * (q.x - b.x) + (q.y - b.y) * (q.y - b.y) < (b.blast + q.r) * (b.blast + q.r)) hurtEnemy(q, b.d * .6, b); }
      if (b.chain) { let from = e; const seen = [e]; for (let c = 0; c < b.chain; c++) { const n = nearE(from.x, from.y, 170, seen); if (!n) break; seen.push(n); G.ent.bm.push({ k: 'arc', x: from.x, y: from.y, x2: n.x, y2: n.y, l: 10, l0: 10 }); hurtEnemy(n, b.d * .7, b); from = n; } }
      if (b.pierce > 0) b.pierce--; else { rm = true; break; }
    }
    if (rm || b.l <= 0 || b.x > V.W + 60 || b.x < -40 || b.y < -40 || b.y > V.H + 40) A.splice(i, 1);
  }
}

// ---------- enemy bullets ----------
function updEB() {
  const A = G.ent.eb, ts = G.ts || 1;
  for (let i = A.length - 1; i >= 0; i--) {
    const b = A[i]; let rm = false;
    if (b.hm && b.l < 380) { const P = nearP(b.x, b.y); if (P) { const sp = Math.hypot(b.vx, b.vy), want = Math.atan2(P.y - b.y, P.x - b.x), cur = Math.atan2(b.vy, b.vx); let df = want - cur; while (df > PI) df -= TAU; while (df < -PI) df += TAU; const na = cur + clamp(df, -.028, .028); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; } }
    b.x += b.vx * ts; b.y += b.vy * ts; b.l--; b.arm++;
    for (const p of G.players) if (p.alive && p.wallT > 0 && Math.abs(b.y - p.y) < 100 && Math.abs(b.x - (p.x + 54)) < 14) { spark(b.x, b.y, 3, '#7dd3fc', 3, 12, 2); rm = true; break; }
    if (rm) { A.splice(i, 1); continue; }
    if (b.mine) { const P = nearP(b.x, b.y); if (b.l <= 0 || (b.arm > 70 && P && Math.hypot(P.x - b.x, P.y - b.y) < 70)) { for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; ebullet(b.x, b.y, Math.cos(a) * 3.2, Math.sin(a) * 3.2, 'shard'); } boom2D(b.x, b.y, 26, '#f59e0b'); rm = true; } b.vx *= .985; }
    else for (const p of G.players) {
      if (!p.alive) continue;
      const dx = p.x - b.x, dy = p.y - b.y, d2 = dx * dx + dy * dy, rr = b.r + 11;
      if (p.inv > 0) { if (p.dashT > 0 && !b.gz && d2 < (rr + 18) * (rr + 18)) graze(p, b); continue; }
      if (d2 < rr * rr) { hurt(p, bulletDmg(p, b.d), 'b'); if (b.ice) { p.slow = 100; ftext(p.x, p.y - 36, 'FROZEN', '#bae6fd', 11); } rm = true; break; }
      if (!b.gz && d2 < (rr + 18) * (rr + 18)) graze(p, b);
    }
    if (!rm && G.run && G.run.stn && b.x < STN_X && b.vx < 0 && !b.mine) { stnHit(G.run, b.d * .3, b.x, b.y); rm = true; }
    if (rm || b.l <= 0 || b.x < -40 || b.x > V.W + 80 || b.y < -40 || b.y > V.H + 40) A.splice(i, 1);
  }
}

// ---------- ramming ----------
function ramCheck() {
  for (const p of G.players) {
    if (!p.alive) continue;
    for (const e of G.ent.en) {
      if (e.dead || e.hide || e.x > V.W + 6) continue;
      const rr = 15 + e.r * .86; if ((p.x - e.x) * (p.x - e.x) + (p.y - e.y) * (p.y - e.y) > rr * rr) continue;
      if (p.dashT > 0) { if (!e.boss && !(e.dhT > G.t)) { e.dhT = G.t + 30; spark(e.x, e.y, 8, '#e0f2fe', 5, 16, 2); hurtEnemy(e, 34 + e.mhp * .22, { own: p.id }); } continue; }
      if (e.boss) { if (!e.rcd) { hurt(p, 26, 'ram'); e.rcd = 45; const a = Math.atan2(p.y - e.y, p.x - e.x); p.vx = Math.cos(a) * 8; p.vy = Math.sin(a) * 8; } continue; }
      if (p.inv > 0 && p.od <= 0) continue;
      const a = Math.atan2(p.y - e.y, p.x - e.x); p.vx += Math.cos(a) * 6; p.vy += Math.sin(a) * 6;
      hurt(p, e.ram * (e.d.elite ? 1.4 : 1) * G.run.edm * (1 - .4 * p.mod.ramc), 'ram');
      if (e.d.elite) { hurtEnemy(e, e.mhp * (.3 + .1 * p.mod.ramc), { own: p.id }); e.rcd = 30; } else { e.hp = 0; killEnemy(e, p.id); }
    }
  }
  for (const e of G.ent.en) if (e.rcd > 0) e.rcd--;
}

// ---------- bosses ----------
function spawnBoss(wi, hpMul) {
  const B = BOSSES[wi], mu = runMul(), R0 = G.run, bm = R0.bhm && R0.spec ? R0.bhm * R0.hpm / R0.spec.diff : 1, hp = Math.round(B.hp * (hpMul || 1) * mu.hp * bm / (R0.bhm && R0.spec ? R0.hpm : 1) * (1 + (G.run.tier - 1) * .35));
  const e = { id: 'boss', boss: true, bi: wi, d: { ai: 'boss', m: ['boss', {}], sc: B.rew, cr: 0, nm: B.nm }, x: V.W + B.w, y: V.H / 2, y0: V.H / 2, w: B.w, r: B.w * .3, hp, mhp: hp, t: 0, hf: 0, ph: 0, atk: 0, acd: 120, inv: true, st: 0, tgx: V.W - B.w * .55, dead: false, rcd: 0, hide: false, sa: 0, q: [], mv: B.ph[0].mv };
  e.pods = B.ph.map((_, i) => mkPod(e, B, i)); e.stg = 0;
  G.ent.en.push(e); G.run.boss = e; G.ent.eb.length = 0;
  const intro = () => { SFX.warn(); music.start(G.world, true); document.body.classList.add('lb'); setTimeout(() => document.body.classList.remove('lb'), 2400); banner('WARNING', B.nm.toUpperCase(), true); shake(6, 40); };
  if (storyDue(wi)) { (SAVE.flags.cut || (SAVE.flags.cut = {}))[wi] = 1; playCut(bossPanels(wi), intro); } else intro();
  return e;
}
function updBoss(e) {
  const B = BOSSES[e.bi], W = V.W, Hh = V.H, t = ++e.t; if (e.hf > 0) e.hf--; if (e.rcd > 0) e.rcd--;
  const ph = B.ph[e.ph], P = nearP(e.x, e.y), ts = G.ts || 1;
  if (e.stg > 0) e.stg--; { const pd0 = podOf(e); if (pd0) { pd0.age++; if (pd0.hf > 0) pd0.hf--; } }
  if (e.st === 0) { e.x += (e.tgx - e.x) * .02 - .6; if (e.x <= e.tgx + 6) { e.st = 1; e.inv = false; } return; }
  if (e.st === 2) { // dying
    e.x += rnd(-1, 1); e.y += rnd(-1, 1); if (e.t % 5 === 0) boom2D(e.x + rnd(-e.w / 2, e.w / 2), e.y + rnd(-e.w / 3, e.w / 3), rnd(30, 70), B.c); if (--e.dt <= 0) { finalBossBlast(e); e.dead = true; } return;
  }
  if (e.pause > 0) { if (--e.pause === 0) e.inv = false; return; }
  const mv = ph.mv, tgx = e.tgx;
  if (mv === 'hover') { e.x += (tgx + Math.sin(t * .017) * 30 - e.x) * .06; e.y += (Hh / 2 + Math.sin(t * .021) * Hh * .28 - e.y) * .06; }
  else if (mv === 'sweep') { e.x += (tgx + Math.cos(t * .015) * 60 - e.x) * .06; e.y += (Hh / 2 + Math.sin(t * .03) * Hh * .36 - e.y) * .08; }
  else if (mv === 'orbit') { e.x += (tgx - 40 + Math.cos(t * .02) * 120 - e.x) * .06; e.y += (Hh / 2 + Math.sin(t * .02) * Hh * .3 - e.y) * .06; }
  else if (mv === 'charge') {
    if (e.cs === undefined) { e.cs = 0; e.cc = 0; }
    e.cc++;
    if (e.cs === 0) { e.x += (tgx + Math.sin(t * .02) * 20 - e.x) * .06; e.y += (Hh / 2 + Math.sin(t * .021) * Hh * .26 - e.y) * .06; if (e.cc > 280) { e.cs = 1; e.cc = 0; e.cy = P ? P.y : Hh / 2; } }
    else if (e.cs === 1) { e.x += (tgx + 60 - e.x) * .08; e.y += (e.cy - e.y) * .1; if (e.cc % 8 < 4) e.hf = 2; if (e.cc > 50) { e.cs = 2; e.cc = 0; } }
    else if (e.cs === 2) { e.x -= 17; if (e.x < 150 || e.cc > 60) { e.cs = 3; e.cc = 0; shake(10, 18); } }
    else { e.x += (tgx - e.x) * .045; if (e.cc > 60) { e.cs = 0; e.cc = 0; } }
  }
  e.y = clamp(e.y, e.w * .3, Hh - e.w * .3);
  // phase change
  if (e.ph < B.ph.length - 1 && e.hp / e.mhp <= B.ph[e.ph + 1].at) {
    e.ph++; e.atk = 0; e.acd = 70; e.inv = true; e.pause = 50; e.stg = 0; e.cs = undefined; G.ent.eb.forEach(q => spark(q.x, q.y, 2, '#fb7185', 2, 12, 2)); G.ent.eb.length = 0;
    shock(e.x, e.y, B.c, e.w * 1.2, 30); shake(10, 30); banner('PHASE ' + (e.ph + 1), B.nm.toUpperCase(), true); SFX.warn(); return;
  }
  if (e.sp) { // active spiral
    if (e.sp.left > 0 && t % 2 === 0) { e.sp.a += .36; ebullet(e.x - e.w * .35, e.y, Math.cos(e.sp.a) * e.sp.s, Math.sin(e.sp.a) * e.sp.s, 'ring'); e.sp.left--; }
  }
  if (e.cs === 2 || e.cs === 1) return;
  if (!e.rage && e.ph === B.ph.length - 1 && e.hp / e.mhp < .18) { e.rage = true; banner('ENRAGED', B.nm.toUpperCase(), true); shake(8, 24); shock(e.x, e.y, '#ef4444', e.w * 1.3, 28); SFX.warn(); }
  e.acd -= ts;
  if (e.acd <= 0) { const bd = bossDiff(); let a = ph.atk[e.atk % ph.atk.length]; if (bd >= 1 && e.ph >= 1 && e.atk % 4 === 3) a = BEXTRA[(e.atk >> 2) & 1]; e.atk++; bossAtk(e, scaleAtk(a, bd)); e.acd = a.r / (1 + bd * .08) * (e.rage ? .8 : 1); }
}
function bossAtk(e, a) {
  const ox = e.x - e.w * .38, P = nearP(e.x, e.y), ang = P ? Math.atan2(P.y - e.y, P.x - ox) : PI, ice = a.ice ? { ice: 1 } : null, dm = Math.round(12 * G.run.edm);
  const mk = (an, s, k, o) => ebullet(ox, e.y, Math.cos(an) * s, Math.sin(an) * s, k, Object.assign({ d: dm }, o));
  switch (a.k) {
    case 'fan': for (let i = 0; i < a.n; i++) mk(ang + (i - (a.n - 1) / 2) * (a.sp / Math.max(1, a.n - 1) * 2 || .15), a.s, 'orb'); break;
    case 'aim': for (let i = 0; i < a.n; i++) mk(ang + rnd(-.04, .04), a.s - i * .35, 'shard'); break;
    case 'ring': { const a0 = Math.random() * TAU; for (let i = 0; i < a.n; i++) mk(a0 + i / a.n * TAU, a.s, 'ring', ice); break; }
    case 'rain': for (let i = 0; i < a.n; i++) ebullet(V.W * rnd(.25, 1), -10 - i * 14, -.8, a.s, a.ice ? 'ice' : 'shard', { d: dm, ice: a.ice, l: 300 }); break;
    case 'spiral': e.sp = { left: a.n, a: Math.random() * TAU, s: a.s }; break;
    case 'summon': { let c = G.ent.en.filter(q => q.minion).length; for (let i = 0; i < a.n && c < 8; i++, c++) mkEnemy(a.id, e.x - e.w * .4, e.y + (i - (a.n - 1) / 2) * 60, { minion: 1, hpm: .6 }); shock(e.x, e.y, '#fff', 120, 18); break; }
    case 'mines': for (let i = 0; i < a.n; i++) ebullet(e.x - e.w * .5 - i * 40, e.y + (i - (a.n - 1) / 2) * 70, -1.6, 0, 'mine', { mine: 1, l: 420, d: dm }); break;
    case 'wall': wallOf(a.s, e.x - e.w * .3, a.n); break;
    case 'homing': for (let i = 0; i < a.n; i++) mk(PI + (i - (a.n - 1) / 2) * .5, a.s, 'plasma', { hm: 1, r: 7, l: 420 }); break;
    case 'beam': G.ent.bm.push({ k: 'beam', o: e, y: P ? P.y : V.H / 2, h: 64, tel: 70, on: 46, c: BOSSES[e.bi].c }); break;
  }
  SFX.hit(); shake(2, 5);
}
function killBoss(e) {
  if (e.st === 2) return; e.st = 2; e.dt = 130; e.inv = true; G.ent.eb.length = 0; G.ent.bm = G.ent.bm.filter(b => b.k !== 'beam'); e.sp = null;
  G.freeze = 18; shake(16, 60); G.slowUntil = performance.now() + 1300; SFX.boom(true); G.run.score += BOSSES[e.bi].rew; haptic([80, 60, 120]);
  G.ent.en.forEach(q => { if (q.minion && !q.dead) { q.hp = 0; killEnemy(q, -1); } });
}
function finalBossBlast(e) {
  const B = BOSSES[e.bi]; boom2D(e.x, e.y, 200, B.c); shock(e.x, e.y, '#fff', 380, 40); shock(e.x, e.y, B.c, 520, 50); shake(20, 50); G.flashT = 30; G.slowUntil = performance.now() + 700;
  if (R3) R3.boom(e.x, e.y, 40, hx(B.c), 12, 18);
  const n = 14; for (let i = 0; i < n; i++) G.ent.pk.push({ k: 'core', v: Math.max(2, Math.round(B.rew / 60 * ECON * (e.gold ? 3 : 1))), x: e.x + rnd(-60, 60), y: e.y + rnd(-60, 60), vx: rnd(-4, 2), vy: rnd(-4, 4), l: 900 });
  G.ent.pk.push({ k: 'hp', x: e.x, y: e.y, vx: -1, vy: 0, l: 900 }, { k: 'sh', x: e.x, y: e.y + 30, vx: -1, vy: 0, l: 900 });
  G.run.boss = null; G.run.bossDown = (G.run.bossDown | 0) + 1;
  if (G.run.mode !== 'tutorial') { if (!SAVE.bd[e.bi]) toast('BESTIARY: ' + B.nm.toUpperCase(), 'Boss entry added - see Profile > Bestiary', '#fbbf24'); SAVE.bd[e.bi] = (SAVE.bd[e.bi] || 0) + 1; }
}

// ---------- beams + hazards ----------
function updBeams() {
  const A = G.ent.bm;
  for (let i = A.length - 1; i >= 0; i--) {
    const b = A[i];
    if (b.k === 'beam') {
      if (!b.o || b.o.dead) { A.splice(i, 1); continue; }
      const P = nearP(b.o.x, b.y);
      if (b.tel > 0) { b.tel--; if (P) b.y += (P.y - b.y) * .06; if (b.tel === 0) { SFX.boom(true); shake(6, b.on); } }
      else { if (P) b.y += (P.y - b.y) * .008; b.on--; for (const p of G.players) if (p.alive && p.inv <= 0 && p.x < b.o.x && Math.abs(p.y - b.y) < b.h / 2 + 8) hurt(p, Math.round(14 * G.run.edm), 'beam'); if (b.on <= 0) A.splice(i, 1); }
    } else if (--b.l <= 0) A.splice(i, 1);
  }
  const H2 = G.ent.hz, hz = curHz(), R = G.run;
  if (hz === 'lava' && R && R.stage === 'wave' && G.t % 300 === 150) H2.push({ k: 'gey', x: rnd(V.W * .15, V.W * .88), tel: 70, on: 50, top: Math.random() < .3 });
  if (R && R.hazMode && G.t % 90 === 0 && R.stage === 'wave' && (R.q.length || G.ent.en.some(e => !e.dead && !e.boss && e.id !== 'rock'))) mkEnemy('rock', V.W + 40, rnd(70, V.H - 70), { hpm: .7 }).vy = rnd(-.8, .8);
  if (hz === 'bolt' && R && R.stage === 'wave' && G.t % 210 === 100) { const tp = G.players.find(q => q.alive); H2.push({ k: 'bolt', x: tp && Math.random() < .5 ? clamp(tp.x + rnd(-90, 90), 40, V.W - 40) : rnd(V.W * .2, V.W * .92), tel: 54, on: 12 }); }
  for (let i = H2.length - 1; i >= 0; i--) {
    const h = H2[i], bolt = h.k === 'bolt';
    if (h.tel > 0) { h.tel--; if (bolt && h.tel === 0) { shake(5, 10); G.flashT = 5; SFX.boom(true); } } else { h.on--; for (const p of G.players) if (p.alive && p.inv <= 0 && Math.abs(p.x - h.x) < (bolt ? 24 : 30) && (bolt || (h.top ? p.y < V.H * .62 : p.y > V.H * .3))) hurt(p, Math.round((bolt ? 15 : 12) * G.run.edm), bolt ? 'bolt' : 'geyser'); if (h.on <= 0) H2.splice(i, 1); }
  }
  G.ts = (hz === 'time' ? 1 + Math.sin(G.t * .004) * .26 : 1) * (G.abTs > 0 ? .4 : 1);
}

function curHz() { return G.mapX ? null : WORLDS[G.world | 0].hz; }
