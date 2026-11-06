// ================= YOUR STATION (base building + raids) and DRONE COMPANIONS =================
const BMOD = {
  refinery: { nm: 'Refinery', c: '#fbbf24', ds: lv => 'Mines ' + (15 * lv) + ' cores an hour while you are away (holds ' + 8 + ' hours).', cost: 300 },
  armory: { nm: 'Armory', c: '#fb7185', ds: lv => '+' + (4 * lv) + '% hull on your ship in every run.', cost: 500 },
  lab: { nm: 'Research Lab', c: '#a78bfa', ds: lv => '+' + (4 * lv) + '% cores from every run you finish.', cost: 600 },
  shield: { nm: 'Shield Array', c: '#38bdf8', ds: lv => '+' + (30 * lv) + '% station hull and shields during raids.', cost: 400 },
  turret: { nm: 'Defense Turrets', c: '#f97316', ds: lv => lv + ' auto-turret' + (lv === 1 ? '' : 's') + ' fire on raiders.', cost: 500 },
  dronebay: { nm: 'Drone Bay', c: '#34d399', ds: lv => 'Unlocks drones and gives them +' + (20 * lv) + '% XP.', cost: 450 }
};
const BKEYS = Object.keys(BMOD), BMAX = 5;
function BS() { const B = SAVE.base || (SAVE.base = { m: {}, ore: 0, t: Date.now(), raidAt: 0, raids: 0 }); return B; }
const bLv = k => BS().m[k] | 0;
const bCost = k => Math.round(BMOD[k].cost * Math.pow(bLv(k) + 1, 1.6));
const bTotal = () => BKEYS.reduce((a, k) => a + bLv(k), 0);
function bTick() { // refinery output since you last looked, and raid timing
  const B = BS(), now = Date.now(), lv = bLv('refinery'), dt = Math.max(0, now - (B.t || now)) / 36e5; B.t = now;
  if (lv) B.ore = Math.min(8 * lv * 8, (B.ore || 0) + 8 * lv * dt);
  if (bTotal() >= 2) { if (!B.raidAt) B.raidAt = now + (18 + Math.random() * 12) * 36e5; else if (now > B.raidAt + 24 * 36e5) { const lost = Math.round((B.ore || 0) * .3); B.ore = Math.max(0, (B.ore || 0) - lost); B.raidAt = now + (18 + Math.random() * 12) * 36e5; B.lostRaid = lost; } }
}
const raidOn = () => { const B = BS(); return !!B.raidAt && Date.now() > B.raidAt && Date.now() < B.raidAt + 24 * 36e5; };

// raids are Station Defense runs at your own station, boosted by your modules
const _setupVarB = setupVariant;
setupVariant = function (R, o) {
  if (o.var !== 'raid') return _setupVarB(R, o);
  const sh = 1 + .3 * bLv('shield'); if (R.stn) { R.stn.mhp = R.stn.hp = Math.round(R.stn.mhp * sh); R.stn.msh = R.stn.sh = Math.round(R.stn.msh * sh); } R.raidTur = bLv('turret'); R.waves = 8; R.hpm = 1 + bTotal() * .05;
};
const _varFinB = variantFinish;
variantFinish = function (R, win, d) {
  if (R.var !== 'raid') return _varFinB(R, win, d);
  const B = BS(); d.name = 'Station Raid'; d.win = win = !(R.stn && R.stn.dead) && win;
  if (win) { d.bonus = 300 + 150 * bTotal(); B.raids = (B.raids | 0) + 1; } else { const lost = Math.round((B.ore || 0) * .3); B.ore = Math.max(0, (B.ore || 0) - lost); d.bonus = 0; d.oreLost = lost; }
  B.raidAt = Date.now() + (18 + Math.random() * 12) * 36e5;
};
function startRaid() { const o = { mode: 'defense', var: 'raid', w: Math.max(0, Math.min(SAVE.wu, WORLDS.length) - 1), co: SAVE.players === 2 }; G.last = o; beginRun(o); }

// ---------- drones ----------
const DRONES = {
  spark: { nm: 'Spark', c: '#22d3ee', ds: 'Zaps the nearest enemy with a bolt of lightning.', cost: 0, bay: 0 },
  magnet: { nm: 'Magnet', c: '#fbbf24', ds: 'Pulls cores and pickups to you from far away.', cost: 700, bay: 1 },
  aegis: { nm: 'Aegis', c: '#60a5fa', ds: 'Destroys an enemy shot headed your way every few seconds.', cost: 900, bay: 1 },
  medic: { nm: 'Medic', c: '#34d399', ds: 'Slowly repairs your hull.', cost: 1200, bay: 2 },
  hunter: { nm: 'Hunter', c: '#fb7185', ds: 'Fires homing missiles at enemies.', cost: 1600, bay: 3 },
  nova: { nm: 'Nova', c: '#c084fc', ds: 'Blasts a ring of energy shots every few seconds.', cost: 2400, bay: 4 }
};
const DMAX = 10, dXp = lv => 50 + lv * 40;
function DS() { const D = SAVE.drones || (SAVE.drones = { own: { spark: { lv: 1, xp: 0 } }, eq: 'spark', skin: '' }); if (!D.own.spark) D.own.spark = { lv: 1, xp: 0 }; return D; }
const DR = { x: 0, y: 0, shots: [], t: 0, zap: null };
function droneOn() { const D = DS(); return !G.net && D.eq && D.own[D.eq] && G.run && !G.run.over && G.players[0] && G.players[0].alive && G.run.mode !== 'tutorial'; }
function droneTick() {
  if (!droneOn()) { DR.shots.length = 0; return; } const D = DS(), id = D.eq, lv = D.own[id].lv, p = G.players[0], R = G.run; DR.t++;
  const tx = p.x - 46, ty = p.y - 50 + Math.sin(DR.t * .07) * 6; if (!DR.x) { DR.x = tx; DR.y = ty; } DR.x += (tx - DR.x) * .12; DR.y += (ty - DR.y) * .12;
  const near = (x, y, rr) => { let b = null, bd = rr * rr; for (const e of G.ent.en) { if (e.dead || e.hide || e.inv || e.x > V.W + 20) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; b = e; } } return b; };
  const dmgK = Math.sqrt(R.hpm || 1);
  if (id === 'spark' && DR.t % Math.max(22, 70 - lv * 5) === 0) { const e = near(DR.x, DR.y, 520); if (e) { hurtEnemy(e, (5 + lv * 2) * dmgK, { drone: 1 }); DR.zap = { x: e.x, y: e.y, l: 8 }; spark(e.x, e.y, 5, DRONES.spark.c, 3, 14, 2); } }
  else if (id === 'magnet') { const rr = 260 + lv * 30; for (const k of G.ent.pk) { const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy); if (d < rr && d > 4) { k.x += dx / d * (3 + lv * .5); k.y += dy / d * (3 + lv * .5); } } }
  else if (id === 'aegis' && DR.t % Math.max(80, 260 - lv * 16) === 0) { let bi = -1, bd = 160 * 160; G.ent.eb.forEach((b, i) => { const d = (b.x - p.x) ** 2 + (b.y - p.y) ** 2; if (d < bd) { bd = d; bi = i; } }); if (bi >= 0) { const b = G.ent.eb[bi]; DR.zap = { x: b.x, y: b.y, l: 8 }; spark(b.x, b.y, 6, DRONES.aegis.c, 3, 14, 2); G.ent.eb.splice(bi, 1); } else DR.t--; }
  else if (id === 'medic' && DR.t % 60 === 0 && p.hp < p.mhp) { p.hp = Math.min(p.mhp, p.hp + p.mhp * (.003 + lv * .0012)); if (DR.t % 240 === 0) ftext(p.x, p.y - 30, '+', DRONES.medic.c, 14); }
  else if (id === 'hunter' && DR.t % Math.max(45, 140 - lv * 9) === 0) { const e = near(DR.x, DR.y, 900); if (e) DR.shots.push({ x: DR.x, y: DR.y, vx: 2, vy: -2, e, d: (8 + lv * 3) * dmgK, c: DRONES.hunter.c, l: 140, home: 1 }); }
  else if (id === 'nova' && DR.t % Math.max(90, 240 - lv * 14) === 0) { const n = 6 + lv; for (let i = 0; i < n; i++) { const a = i / n * TAU; DR.shots.push({ x: DR.x, y: DR.y, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, d: (3 + lv) * dmgK, c: DRONES.nova.c, l: 70 }); } }
  for (let i = DR.shots.length - 1; i >= 0; i--) { const s = DR.shots[i]; s.l--;
    if (s.home) { if (!s.e || s.e.dead) s.e = near(s.x, s.y, 900); if (s.e) { const dx = s.e.x - s.x, dy = s.e.y - s.y, d = Math.hypot(dx, dy) || 1; s.vx += (dx / d * 9 - s.vx) * .12; s.vy += (dy / d * 9 - s.vy) * .12; } }
    s.x += s.vx; s.y += s.vy; if (!SET.reduce && DR.t % 2 === 0) pcl({ x: s.x, y: s.y, vx: 0, vy: 0, l: 10, l0: 10, c: s.c, r: 2.4, k: 0, fr: .9 });
    let hit = null; for (const e of G.ent.en) { if (e.dead || e.hide) continue; if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 < (e.r + 6) ** 2) { hit = e; break; } }
    if (hit) { hurtEnemy(hit, s.d, { drone: 1 }); spark(s.x, s.y, 5, s.c, 3, 12, 2); DR.shots.splice(i, 1); } else if (s.l <= 0 || s.x < -40 || s.x > V.W + 40 || s.y < -40 || s.y > V.H + 40) DR.shots.splice(i, 1); }
  if (R.raidTur && R.stn && !R.stn.dead && G.t % Math.max(18, 50 - R.raidTur * 5) === 0) { // station turrets during raids
    for (let k = 0; k < R.raidTur; k++) { const x0 = 70, y0 = V.H * (k + 1) / (R.raidTur + 1), e = near(x0, y0, 900); if (e) DR.shots.push({ x: x0, y: y0, vx: 10, vy: 0, e, d: 6 * dmgK, c: '#f97316', l: 120, home: 1 }); } }
}
function droneDraw(g) {
  if (!droneOn()) return; const D = DS(), Dd = DRONES[D.eq], c = (D.skin && typeof COS2 !== 'undefined' && COS2.dskin(D.skin)) || Dd.c, lv = D.own[D.eq].lv, t = DR.t;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const s of DR.shots) drawGlow(g, s.x, s.y, 10, s.c, .9);
  if (DR.zap && DR.zap.l-- > 0) { g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(DR.x, DR.y); for (let i = 1; i < 6; i++) g.lineTo(DR.x + (DR.zap.x - DR.x) * i / 6 + (Math.random() - .5) * 14, DR.y + (DR.zap.y - DR.y) * i / 6 + (Math.random() - .5) * 14); g.stroke(); }
  drawGlow(g, DR.x, DR.y, 26 + lv, c, .6); g.globalCompositeOperation = 'source-over';
  g.translate(DR.x, DR.y); g.fillStyle = '#0b1222'; g.strokeStyle = c; g.lineWidth = 2;
  g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .02; g.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); } g.closePath(); g.fill(); g.stroke();
  g.fillStyle = c; g.beginPath(); g.arc(0, 0, 3.5 + Math.sin(t * .2) * .8, 0, TAU); g.fill();
  g.rotate(-t * .05); g.globalAlpha = .7; g.beginPath(); g.ellipse(0, 0, 16, 5, 0, 0, TAU); g.stroke(); g.globalAlpha = 1;
  for (let i = 0; i < Math.min(4, Math.ceil(lv / 3)); i++) { const a = i / 4 * TAU + t * .08; g.fillStyle = '#fff'; g.fillRect(Math.cos(a) * 16 - 1, Math.sin(a) * 5 - 1, 2, 2); }
  g.restore();
}
const _combatTickB = combatTick;
combatTick = function (p, o) { const r = _combatTickB.apply(this, arguments); if (p === G.players[0]) { try { droneTick(); } catch (e) { console.warn('drone', e); } } return r; };
const _drawMetaB = drawMeta;
drawMeta = function (g, t) { const r = _drawMetaB.apply(this, arguments); try { droneDraw(g); if (G.run && G.run.raidTur && G.run.stn && !G.run.stn.dead) for (let k = 0; k < G.run.raidTur; k++) { const y = V.H * (k + 1) / (G.run.raidTur + 1); g.fillStyle = '#1f2937'; g.fillRect(52, y - 9, 26, 18); g.fillStyle = '#f97316'; g.fillRect(70, y - 3, 14, 6); } } catch (e) { } return r; };
const _killB = killEnemy;
killEnemy = function (e, own) { const was = e && !e.dead; const r = _killB.apply(this, arguments); try { if (was && G.run && !G.net && G.run.mode !== 'tutorial') { const D = DS(), d = D.own[D.eq]; if (d && d.lv < DMAX) { d.xp += (e.boss ? 40 : 1) * (1 + .2 * bLv('dronebay')); while (d.lv < DMAX && d.xp >= dXp(d.lv)) { d.xp -= dXp(d.lv); d.lv++; if (G.scene === 'play') alertMsg(DRONES[D.eq].nm.toUpperCase() + ' DRONE REACHED LEVEL ' + d.lv); } } } } catch (x) { } return r; };
const _beginB = beginRun;
beginRun = function (o) { const r = _beginB.apply(this, arguments); try { DR.x = 0; DR.shots.length = 0; DR.t = 0; const a = bLv('armory'); if (a && !G.net) G.players.forEach(p => { p.mhp = Math.round(p.mhp * (1 + .04 * a)); p.hp = p.mhp; }); } catch (e) { } return r; };
const _uiResB = UI.result;
UI.result = function (d) { try { const l = bLv('lab'); if (l && d && !d.online && (d.bonus || d.cores)) { d.labB = Math.round(((d.bonus | 0) + (d.cores | 0)) * .04 * l); SAVE.cores += d.labB; saveGame(); } } catch (e) { } return _uiResB.apply(this, arguments); };

// ---------- the station screen ----------
const BV = { sel: 'refinery', tab: 'station', raf: 0, t: 0, hit: [] };
function bDraw() {
  const cv = document.getElementById('bCv'); if (!cv || UI.top !== 'scBase') { BV.raf = 0; return; } BV.raf = requestAnimationFrame(bDraw); BV.t++;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return; if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d'), t = BV.t, cx = W * (W > 820 ? .38 : .5), cy = H * (W > 820 ? .52 : .34), R = Math.min(W * (W > 820 ? .26 : .36), H * .3); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H)); bg.addColorStop(0, '#101a3a'); bg.addColorStop(1, '#02030a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const rs = seeded(77); for (let i = 0; i < 220; i++) { const x = rs() * W, y = rs() * H, s = rs() * 1.4 + .3; g.fillStyle = 'rgba(200,220,255,' + (.25 + .5 * Math.abs(Math.sin(t * .01 + i))) + ')'; g.fillRect(x, y, s, s); }
  const pl = g.createRadialGradient(W * .88, H * .86, 10, W * .88, H * .86, H * .55); pl.addColorStop(0, '#3b5aa8'); pl.addColorStop(.6, '#16224a'); pl.addColorStop(1, 'rgba(10,14,30,0)'); g.fillStyle = pl; g.beginPath(); g.arc(W * .95, H * 1.02, H * .5, 0, TAU); g.fill();
  const rot = t * .0025, tilt = .42, P = (a, r) => [cx + Math.cos(a + rot) * r, cy + Math.sin(a + rot) * r * tilt];
  // ring back half, core, ring front half
  const ring = (front) => { g.lineWidth = R * .07; g.strokeStyle = '#334155'; g.beginPath(); g.ellipse(cx, cy, R, R * tilt, 0, front ? 0 : PI, front ? PI : TAU); g.stroke(); g.lineWidth = 2; g.strokeStyle = 'rgba(125,211,252,.55)'; g.beginPath(); g.ellipse(cx, cy, R * 1.04, R * tilt * 1.04, 0, front ? 0 : PI, front ? PI : TAU); g.stroke(); };
  const pods = BKEYS.map((k, i) => { const a = i / BKEYS.length * TAU, [x, y] = P(a, R); return { k, x, y, z: Math.sin(a + rot) }; });
  const pod = q => { const k = q.k, lv = bLv(k), M = BMOD[k], s = R * (.17 + q.z * .03) * (lv ? 1 : .8), sel = BV.sel === k;
    g.save(); g.translate(q.x, q.y); g.globalAlpha = .55 + (q.z + 1) * .225;
    if (lv) { g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, s * 2.4, M.c, .35 + lv * .06); g.globalCompositeOperation = 'source-over'; }
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + PI / 6; g.lineTo(Math.cos(a) * s, Math.sin(a) * s * .8); } g.closePath();
    const fg = g.createLinearGradient(0, -s, 0, s); fg.addColorStop(0, lv ? '#3b4b6b' : '#151c2e'); fg.addColorStop(1, lv ? '#141c30' : '#0b1020'); g.fillStyle = fg; g.fill(); g.lineWidth = sel ? 3 : 1.5; g.strokeStyle = lv ? M.c : '#334155'; if (!lv) g.setLineDash([4, 4]); g.stroke(); g.setLineDash([]);
    for (let i = 0; i < BMAX; i++) { g.fillStyle = i < lv ? M.c : 'rgba(148,163,184,.25)'; g.fillRect(-s * .6 + i * s * .26, s * .35, s * .16, s * .12); }
    if (lv) { g.fillStyle = M.c; g.globalAlpha = .6 + .4 * Math.sin(t * .1 + k.length); g.beginPath(); g.arc(0, -s * .15, s * .16, 0, TAU); g.fill(); }
    g.globalAlpha = 1; g.font = '700 ' + Math.max(10, Math.round(s * .26)) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = sel ? '#fff' : 'rgba(226,232,240,.85)'; g.fillText(M.nm.toUpperCase(), 0, -s - 8);
    if (sel) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, s * 1.35, t * .03, t * .03 + 1.2); g.stroke(); g.beginPath(); g.arc(0, 0, s * 1.35, t * .03 + PI, t * .03 + PI + 1.2); g.stroke(); }
    g.restore(); BV.hit.push({ k, x: q.x, y: q.y, r: s * 1.2 }); };
  BV.hit = []; pods.filter(q => q.z < 0).sort((a, b) => a.z - b.z).forEach(q => { g.strokeStyle = 'rgba(100,116,139,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(q.x, q.y); g.stroke(); pod(q); });
  ring(false);
  const cg = g.createRadialGradient(cx - R * .1, cy - R * .12, 2, cx, cy, R * .34); cg.addColorStop(0, '#e2e8f0'); cg.addColorStop(.35, '#64748b'); cg.addColorStop(1, '#1e293b'); g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, R * .3, 0, TAU); g.fill();
  g.globalCompositeOperation = 'lighter'; drawGlow(g, cx, cy, R * .5, raidOn() ? '#ef4444' : '#22d3ee', .45 + .15 * Math.sin(t * .05)); g.globalCompositeOperation = 'source-over';
  g.strokeStyle = 'rgba(34,211,238,.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, R * .3, R * .1, 0, 0, TAU); g.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + rot * 3, [x, y] = [cx + Math.cos(a) * R * .3, cy + Math.sin(a) * R * .1]; g.fillStyle = (t + i * 8) % 60 < 30 ? '#fde68a' : '#475569'; g.fillRect(x - 1.5, y - 1.5, 3, 3); }
  ring(true);
  pods.filter(q => q.z >= 0).sort((a, b) => a.z - b.z).forEach(q => { g.strokeStyle = 'rgba(100,116,139,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(q.x, q.y); g.stroke(); pod(q); });
  if (raidOn() && t % 50 < 25) { g.fillStyle = 'rgba(239,68,68,.12)'; g.fillRect(0, 0, W, H); }
}
function bBind() { const cv = document.getElementById('bCv'); if (!cv || cv._b) return; cv._b = 1; cv.addEventListener('click', e => { const [x, y] = locXY(e, cv); let best = null, bd = 1e9; for (const h of BV.hit) { const d = Math.hypot(h.x - x, h.y - y); if (d < h.r && d < bd) { bd = d; best = h; } } if (best) { BV.sel = best.k; BV.tab = 'station'; SFX.click(); UI.refresh(); } }); }
SCR.scBase = () => {
  bTick(); const B = BS(), D = DS(), raid = raidOn(); setTimeout(() => { bBind(); if (!BV.raf) bDraw(); }, 0);
  const k = BV.sel, M = BMOD[k], lv = bLv(k), cost = bCost(k), ore = Math.floor(B.ore || 0);
  const side = BV.tab === 'drones' ? '<div class="xs mut b nh" style="margin-top:0">DRONES - ONE FLIES WITH YOU IN EVERY SOLO RUN</div><div class="stack" style="gap:6px">' + Object.keys(DRONES).map(id => { const X = DRONES[id], o = D.own[id], eq = D.eq === id, can = bLv('dronebay') >= X.bay;
      return '<div class="bdr' + (eq ? ' on' : '') + '" style="--dc:' + X.c + '"><i class="bdi"></i><div class="fl"><b>' + X.nm + (o ? ' <span class="xs mut">LV ' + o.lv + (o.lv < DMAX ? ' - ' + Math.floor(o.xp) + '/' + dXp(o.lv) + ' XP' : ' MAX') + '</span>' : '') + '</b><div class="xs mut">' + X.ds + '</div>' + (o && o.lv < DMAX ? '<div class="bxp"><i style="width:' + Math.round(o.xp / dXp(o.lv) * 100) + '%"></i></div>' : '') + '</div>' +
        (o ? (eq ? '<span class="xs good b">FLYING</span>' : '<button class="btn sm" data-act="deq:' + id + '">EQUIP</button>') : can ? '<button class="btn sm gold' + (SAVE.cores < X.cost ? ' off' : '') + '" data-act="dbuy:' + id + '">' + fmt(X.cost) + '</button>' : '<span class="xs mut">DRONE BAY ' + X.bay + '</span>') + '</div>'; }).join('') + '</div><div class="xs mut" style="margin-top:8px">Drones level up from the enemies you destroy (up to level ' + DMAX + ').</div>'
    : '<div class="gx-k" style="color:' + M.c + '">MODULE - LEVEL ' + lv + ' / ' + BMAX + '</div><h2 class="gx-n">' + M.nm + '</h2><p class="sm" style="margin:0 0 6px">' + (lv ? M.ds(lv) : 'Not built yet.') + '</p>' + (lv < BMAX ? '<p class="xs mut" style="margin:0 0 10px">Next level: ' + M.ds(lv + 1) + '</p><button class="btn big gold' + (SAVE.cores < cost ? ' off' : '') + '" style="width:100%" data-act="bup:' + k + '">' + (lv ? 'UPGRADE' : 'BUILD') + ' - ' + fmt(cost) + ' CORES</button>' : '<p class="xs good b">Fully upgraded</p>') +
      '<div class="row wrap" style="gap:6px;margin-top:12px">' + BKEYS.map(x => '<button class="btn sm' + (x === k ? ' gold' : '') + '" data-act="bsel:' + x + '">' + BMOD[x].nm + ' ' + bLv(x) + '</button>').join('') + '</div>';
  return '<div class="gx bs"><canvas id="bCv"></canvas><header class="gx-h"><h1 class="lay-t">Your Station</h1><span class="xs mut">' + (bTotal() ? 'Tap a module to select it' : 'Build your first module to bring the station online') + '</span>' +
    (raid ? '<div class="braid"><b>RAID IN PROGRESS</b> Raiders are attacking your station. Defend it before they break through or lose 30% of the refinery\'s stored cores.<button class="btn sm warn" data-act="braid">DEFEND THE STATION</button></div>' : B.lostRaid ? '<div class="braid lost">You missed a raid and lost ' + fmt(B.lostRaid) + ' stored cores. <button class="btn sm" data-act="bok">OK</button></div>' : '') + '</header>' +
    '<aside class="gx-side"><div class="seg" style="margin-bottom:12px"><button data-act="btab:station" class="' + (BV.tab !== 'drones' ? 'on' : '') + '">MODULES</button><button data-act="btab:drones" class="' + (BV.tab === 'drones' ? 'on' : '') + '">DRONES</button></div>' + side + '</aside>' +
    '<footer class="gx-f"><button class="btn sm" data-act="back">Back</button><span class="xs mut">Cores <b class="gold">' + fmt(SAVE.cores) + '</b>' + (bLv('refinery') ? ' - Refinery <b class="gold">' + fmt(ore) + '</b> / ' + fmt(15 * bLv('refinery') * 8) : '') + (B.raids ? ' - ' + B.raids + ' raids repelled' : '') + '</span>' + (bLv('refinery') ? '<button class="btn sm gold' + (ore < 1 ? ' off' : '') + '" data-act="bcollect">Collect ' + fmt(ore) + '</button>' : '<span></span>') + '</footer></div>';
};
Object.assign(ACT, {
  base() { if (G.run || G.scene === 'play') exitToMenu('scBase'); else UI.show('scBase'); },
  bsel(a) { BV.sel = a[0]; BV.tab = 'station'; UI.refresh(); },
  btab(a) { BV.tab = a[0]; UI.refresh(); },
  bup(a) { const k = a[0], c = bCost(k); if (bLv(k) >= BMAX || SAVE.cores < c) { SFX.no(); return; } bTick(); SAVE.cores -= c; BS().m[k] = bLv(k) + 1; saveGame(); toast(BMOD[k].nm.toUpperCase() + (bLv(k) === 1 ? ' BUILT' : ' UPGRADED'), 'Level ' + bLv(k) + ': ' + BMOD[k].ds(bLv(k)), BMOD[k].c); UI.refresh(); },
  bcollect() { bTick(); const B = BS(), n = Math.floor(B.ore || 0); if (n < 1) return; B.ore -= n; SAVE.cores += n; saveGame(); toast('REFINERY', '+' + fmt(n) + ' cores collected', '#fbbf24'); UI.refresh(); },
  braid() { startRaid(); },
  bok() { BS().lostRaid = 0; saveGame(); UI.refresh(); },
  dbuy(a) { const X = DRONES[a[0]], D = DS(); if (!X || D.own[a[0]] || SAVE.cores < X.cost || bLv('dronebay') < X.bay) { SFX.no(); return; } SAVE.cores -= X.cost; D.own[a[0]] = { lv: 1, xp: 0 }; D.eq = a[0]; saveGame(); toast('NEW DRONE: ' + X.nm.toUpperCase(), X.ds, X.c); UI.refresh(); },
  deq(a) { const D = DS(); if (D.own[a[0]]) { D.eq = a[0]; saveGame(); UI.refresh(); } }
});
MI.base = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="9.5" ry="4"/><path d="M12 9V3M12 15v6"/></svg>';
