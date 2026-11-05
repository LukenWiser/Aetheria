// ================= OPEN GALAXY: a 3D star map, stations, reputation and side missions =================
const GX_ST = ['Haven Dock', 'Frostgate', 'Neon Spire', 'Rustwell', 'Coral Deep', 'Verdant Ring', 'Cinder Keep', 'Halo Yard', 'Gridlock Hub', 'Eventide', 'Hollow Moon', 'Bastion Nine', 'Vortex Rest', 'Prism Port', 'Last Light', 'Null Relay', 'Prime Gate'];
const GX_REP = [0, 100, 250, 500, 900, 1500], GX_RN = ['Stranger', 'Known', 'Trusted', 'Respected', 'Honoured', 'Legend'];
const GX_T = {
  patrol: { nm: 'Patrol', ds: 'Clear four waves of raiders around the station.', lv: 4, k: 1, ic: 'map' },
  bounty: { nm: 'Bounty', ds: 'A wanted ace is hiding in this system. Two waves, then take them down.', lv: 12, k: 1.8, ic: 'skull' },
  hazard: { nm: 'Hazard Run', ds: 'Fly a supply route through a storm of hazards.', lv: 7, k: 1.3, ic: 'bolt' },
  swarm: { nm: 'Swarm Purge', ds: 'A nest has hatched. Far more enemies, each one weaker.', lv: 5, k: 1.2, ic: 'multi' },
  elite: { nm: 'Elite Hunt', ds: 'Elite squads are raiding traders. Hunt them down.', lv: 9, k: 1.5, ic: 'target' },
  ambush: { nm: 'Ambush', ds: 'Raiders dropped out of warp on top of you. Survive and drive them off.', lv: 5, k: 1.2, ic: 'skull' }
};
const GX_NAMES = ['Red Vane', 'Mother Static', 'Kessler', 'The Widow', 'Sable Jack', 'Quill', 'Ironjaw', 'Nightcap', 'Ghost Ferris', 'Hex Marrow'];
function GXS() { const S = SAVE.gx || (SAVE.gx = { at: 0, rep: {}, done: {}, crate: {}, runs: 0, jumps: 0 }); return S; }
const gxLv = w => { const p = GXS().rep[w] | 0; let l = 0; GX_REP.forEach((t, i) => { if (p >= t) l = i; }); return l; };
const gxOpen = () => Math.max(1, Math.min(SAVE.wu, WORLDS.length));
function gxMissions(w) { // three missions per system, new ones every day
  const day = dayKey(), rs = seeded((w + 1) * 7919 + day.split('').reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7)), ks = Object.keys(GX_T), out = []; rs(); rs(); for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(rs() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; }
  for (let i = 0; i < 3; i++) { const t = ks[i], T = GX_T[t]; out.push({ id: day + ':' + w + ':' + i, t, w, lv: Math.min(12, T.lv + (rs() < .4 ? 1 : 0)), rew: Math.round((70 + 45 * w) * T.k * (1 + rs() * .3)), rep: Math.round(35 + 30 * T.k), tgt: t === 'bounty' ? GX_NAMES[Math.floor(rs() * GX_NAMES.length)] : '', map: i < 2 ? gxMapsFor(w)[i] : '' }); }
  return out;
}
const GXM = ['dockyard', 'mine', 'comet', 'cinder', 'tidewell', 'lattice', 'rosette'];
const gxMapsFor = w => [GXM[w % GXM.length], GXM[(w * 3 + 2) % GXM.length]];
const gxMapNm = k => { const m = MAPS.find(x => x.k === k); return m ? m.nm : ''; };
const gxDone = id => !!(GXS().done[id.split(':')[0]] || {})[id];

// ---------- the side mission as a run variant ----------
const _setupVar = setupVariant;
setupVariant = function (R, o) {
  if (o.var !== 'side') return _setupVar(R, o);
  const sp = R.spec, m = o.side; R.side = m; R.hazMode = false; sp.name = ((GX_T[m.t] || GX_T.patrol).nm) + ': ' + (m.tgt || GX_ST[m.w]);
  if (m.t === 'patrol') { sp.type = 'c'; sp.waves = R.waves = 4; }
  else if (m.t === 'bounty') { sp.type = 'B'; sp.waves = R.waves = 2; R.bmul = .55; }
  else if (m.t === 'hazard') { sp.type = 'h'; sp.waves = R.waves = 3; R.hazMode = true; }
  else if (m.t === 'swarm') { sp.type = 'c'; sp.waves = R.waves = 3; R.hpm *= .65; R.swarm = 1.6; }
  else if (m.t === 'elite') { sp.type = 'e'; sp.waves = R.waves = 3; R.hpm *= 1.1; }
  else if (m.t === 'ambush') { sp.type = 'e'; sp.waves = R.waves = 3; R.swarm = 1.25; sp.name = 'Ambush at ' + GX_ST[m.w]; }
};
const _varFin = variantFinish;
variantFinish = function (R, win, d) {
  if (R.var !== 'side') return _varFin(R, win, d);
  const m = R.side, S = GXS(), lvl = gxLv(m.w); d.name = R.spec.name; d.side = 1;
  if (m.id && gxDone(m.id)) { d.bonus = win ? Math.round(m.rew * .15) : 0; return; }
  if (win) { d.bonus = Math.round(m.rew * (1 + lvl * .1)); const r0 = gxLv(m.w); S.rep[m.w] = (S.rep[m.w] | 0) + m.rep; d.rep = m.rep; if (gxLv(m.w) > r0) d.repUp = GX_RN[gxLv(m.w)]; if (m.id) { const day = m.id.split(':')[0]; Object.keys(S.done).forEach(k => { if (k !== day) delete S.done[k]; }); (S.done[day] = S.done[day] || {})[m.id] = 1; } S.runs = (S.runs | 0) + 1; }
  else d.bonus = Math.round(R.wave * 20);
};
function gxPlay(m) { const o = { mode: 'expedition', var: 'side', w: m.w, lv: m.lv, tier: 1, co: SAVE.players === 2, side: m, map: m.map || undefined }; G.last = o; GXS().at = m.w; beginRun(o); }

// ---------- star map renderer (2D canvas, real perspective) ----------
const GXV = { yaw: .4, pitch: .9, zoom: 1, sel: -1, raf: 0, stars: null, sys: null, fly: null, drag: null, enc: null, t: 0 };
function gxBuild() {
  if (GXV.stars) return; const rs = seeded(4242), st = [];
  for (let i = 0; i < 2600; i++) { const arm = i % 3, d = Math.pow(rs(), .7), a = arm * 2.094 + d * 5.2 + (rs() - .5) * .55 * (1 - d * .4), r = 40 + d * 520, sp = (1 - d) * 26 + 8;
    st.push({ x: Math.cos(a) * r + (rs() - .5) * sp * 2, z: Math.sin(a) * r + (rs() - .5) * sp * 2, y: (rs() - .5) * sp * (1.4 - d), s: rs() * 1.6 + .4, c: d < .25 ? [255, 214, 170] : rs() < .35 ? [180, 160, 255] : [170, 210, 255] }); }
  for (let i = 0; i < 500; i++) { const a = rs() * TAU, r = rs() * 60; st.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: (rs() - .5) * 24, s: rs() * 2 + .6, c: [255, 230, 190] }); }
  GXV.stars = st; GXV.sys = WORLDS.map((W, i) => { const arm = i % 3, d = .18 + i / WORLDS.length * .78, a = arm * 2.094 + d * 5.2 + .15; return { x: Math.cos(a) * (40 + d * 520), z: Math.sin(a) * (40 + d * 520), y: ((i * 37) % 11 - 5) * 3 }; });
}
function gxProj(p, W, H) {
  const cy = Math.cos(GXV.yaw), sy = Math.sin(GXV.yaw), cp = Math.cos(GXV.pitch), sp = Math.sin(GXV.pitch);
  let x = p.x * cy - p.z * sy, z = p.x * sy + p.z * cy, y = p.y; const y2 = y * cp - z * sp, z2 = y * sp + z * cp;
  const f = Math.min(W, H) * 1.05 * GXV.zoom, dz = 900 + z2; if (dz < 50) return null; const k = f / dz;
  return { x: W * .5 + (x - (GXV.cx || 0)) * k, y: H * .52 + (y2 - (GXV.cyy || 0)) * k, k, z: z2 };
}
function gxDraw() {
  const cv = document.getElementById('gxCv'); if (!cv || UI.top !== 'scGalaxy') { GXV.raf = 0; return; }
  GXV.raf = requestAnimationFrame(gxDraw); gxBuild(); GXV.t++;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!GXV.drag && !SET.reduce) GXV.yaw += .0009;
  const S = GXS(), F = GXV.fly; let focus = GXV.sys[S.at];
  if (F) { const u = Math.min(1, (performance.now() - F.t0) / F.d), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, a = GXV.sys[F.a], b = GXV.sys[F.b]; focus = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e - Math.sin(e * PI) * 60, z: a.z + (b.z - a.z) * e }; F.pos = focus; F.u = u; if (u >= 1) { GXV.fly = null; gxArrive(F.b); } }
  { const cy = Math.cos(GXV.yaw), sy = Math.sin(GXV.yaw), cp = Math.cos(GXV.pitch), sp = Math.sin(GXV.pitch), x = focus.x * cy - focus.z * sy, z = focus.x * sy + focus.z * cy; const tx = x * .55, ty = (focus.y * cp - z * sp) * .55; GXV.cx = (GXV.cx || 0) + (tx - (GXV.cx || 0)) * .06; GXV.cyy = (GXV.cyy || 0) + (ty - (GXV.cyy || 0)) * .06; }
  const bg = g.createRadialGradient(W * .5, H * .52, 0, W * .5, H * .52, Math.max(W, H) * .7); bg.addColorStop(0, '#0b1230'); bg.addColorStop(1, '#02030a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const core = gxProj({ x: 0, y: 0, z: 0 }, W, H); if (core) { const r = 150 * core.k * 2.2, cg = g.createRadialGradient(core.x, core.y, 0, core.x, core.y, r); cg.addColorStop(0, 'rgba(255,226,180,.55)'); cg.addColorStop(.3, 'rgba(250,170,120,.18)'); cg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = cg; g.fillRect(core.x - r, core.y - r, r * 2, r * 2); }
  g.globalCompositeOperation = 'lighter';
  for (const s of GXV.stars) { const p = gxProj(s, W, H); if (!p) continue; const a = Math.min(1, .25 + p.k * 1.4), r = s.s * p.k * 1.3; g.fillStyle = 'rgba(' + s.c[0] + ',' + s.c[1] + ',' + s.c[2] + ',' + a * .8 + ')'; if (r < 1.1) g.fillRect(p.x, p.y, r + .4, r + .4); else { g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill(); } }
  g.globalCompositeOperation = 'source-over';
  const open = gxOpen(), P = GXV.sys.map(s => gxProj(s, W, H));
  g.lineWidth = 1.2; g.setLineDash([4, 6]); g.strokeStyle = 'rgba(125,211,252,.28)'; g.beginPath(); for (let i = 1; i < open; i++) { const a = P[i - 1], b = P[i]; if (a && b) { g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); } } g.stroke(); g.setLineDash([]);
  GXV.hit = [];
  P.forEach((p, i) => { if (!p) return; const lk = i >= open, ac = lk ? '#475569' : WORLDS[i].ac || '#22d3ee', r = (lk ? 4 : 7) * Math.max(.7, p.k * 1.6), here = i === S.at && !F, sel = i === GXV.sel;
    if (!lk) { g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5); gl.addColorStop(0, rgba(ac, .5)); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(p.x - r * 5, p.y - r * 5, r * 10, r * 10); g.globalCompositeOperation = 'source-over'; }
    g.fillStyle = lk ? '#1e293b' : ac; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill(); g.strokeStyle = lk ? '#334155' : 'rgba(255,255,255,.75)'; g.lineWidth = 1.2; g.stroke();
    if (!lk) { g.save(); g.translate(p.x, p.y); g.scale(1, .35); g.strokeStyle = rgba(ac, .7); g.beginPath(); g.arc(0, 0, r * 2.1, 0, TAU); g.stroke(); g.restore(); }
    if (here) { const pr = r * 2.6 + Math.sin(GXV.t * .08) * 3; g.strokeStyle = '#fde047'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, pr, 0, TAU); g.stroke(); }
    if (sel) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; const q = r * 3.4; g.beginPath(); for (let k = 0; k < 4; k++) { const a0 = k * H_ + GXV.t * .02; g.moveTo(p.x + Math.cos(a0) * q, p.y + Math.sin(a0) * q); g.arc(p.x, p.y, q, a0, a0 + .7); } g.stroke(); }
    g.font = '700 ' + Math.round(11 + p.k * 4) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = lk ? 'rgba(148,163,184,.5)' : sel || here ? '#fff' : 'rgba(226,232,240,.8)'; g.fillText(lk ? '???' : GX_ST[i], p.x, p.y - r - 9);
    if (!lk) { const n = gxMissions(i).filter(m => !gxDone(m.id)).length; if (n) { g.fillStyle = '#fbbf24'; g.font = '800 10px system-ui,sans-serif'; g.fillText(n + ' JOB' + (n > 1 ? 'S' : ''), p.x, p.y + r + 14); } }
    GXV.hit.push({ i, x: p.x, y: p.y, r: Math.max(18, r * 2.5) }); });
  if (F && F.pos) { const p = gxProj(F.pos, W, H); if (p) { const a = GXV.sys[F.a], b = GXV.sys[F.b], pa = gxProj(a, W, H), pb = gxProj(b, W, H); if (pa && pb) { g.strokeStyle = 'rgba(253,224,71,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(pa.x, pa.y); g.quadraticCurveTo((pa.x + pb.x) / 2, Math.min(pa.y, pb.y) - 60 * p.k * 3, pb.x, pb.y); g.stroke(); }
    const ang = pb ? Math.atan2(pb.y - p.y, pb.x - p.x) : 0; g.save(); g.translate(p.x, p.y); g.rotate(ang); g.globalCompositeOperation = 'lighter'; const tg = g.createLinearGradient(-60, 0, 0, 0); tg.addColorStop(0, 'rgba(34,211,238,0)'); tg.addColorStop(1, 'rgba(34,211,238,.9)'); g.fillStyle = tg; g.fillRect(-60, -2, 60, 4); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(10, 0); g.lineTo(-7, -6); g.lineTo(-3, 0); g.lineTo(-7, 6); g.closePath(); g.fill(); g.restore(); } }
}
const H_ = PI / 2;
function gxArrive(w) {
  const S = GXS(); S.at = w; S.jumps = (S.jumps | 0) + 1; saveGame(); SFX.click && SFX.click();
  if (Math.random() < .28 && gxOpen() > 1) { const rs = Math.random; GXV.enc = { w, rew: Math.round(90 + 50 * w), loss: Math.max(20, Math.min(SAVE.cores, Math.round(40 + 25 * w))), who: pick(['Pirate raiders', 'A rogue drone pack', 'Glitched hunters', 'Scavenger gunships']) }; }
  gxPanel();
}
function gxJump(w) {
  const S = GXS(); if (GXV.fly || w === S.at || w >= gxOpen()) return; const a = GXV.sys[S.at], b = GXV.sys[w], d = Math.hypot(a.x - b.x, a.z - b.z);
  GXV.enc = null; GXV.fly = { a: S.at, b: w, t0: performance.now(), d: SET.reduce ? 300 : Math.min(2600, 900 + d * 2.2) }; GXV.sel = w; gxPanel(); try { SFX.dash && SFX.dash(); } catch (e) { }
}
function gxPanel() {
  const el = document.getElementById('gxSide'); if (!el) return; const st = document.getElementById('gxStat'); if (st) st.textContent = (GXS().runs | 0) + ' jobs done - ' + (GXS().jumps | 0) + ' jumps'; const S = GXS(), F = GXV.fly, w = GXV.sel >= 0 ? GXV.sel : S.at, here = w === S.at && !F, lk = w >= gxOpen(), lvl = gxLv(w), rp = S.rep[w] | 0, nx = GX_REP[lvl + 1];
  if (GXV.enc) { const E = GXV.enc; el.innerHTML = '<div class="gx-enc"><div class="gx-k bad">ENCOUNTER</div><h2 class="gx-n">' + E.who + '!</h2><p class="mut sm">They dropped out of warp right on top of you near ' + GX_ST[E.w] + '.</p><div class="stack" style="gap:8px;margin-top:12px"><button class="btn big gold" data-act="gxfight">FIGHT (+' + fmt(E.rew) + ' CORES)</button><button class="btn" data-act="gxflee">RUN FOR IT (DROP ' + fmt(E.loss) + ' CORES)</button></div></div>'; return; }
  if (F) { el.innerHTML = '<div class="gx-k">JUMPING</div><h2 class="gx-n">' + GX_ST[F.b] + '</h2><p class="mut sm">Hyperspace route plotted...</p>'; return; }
  if (lk) { el.innerHTML = '<div class="gx-k">UNCHARTED</div><h2 class="gx-n">???</h2><p class="mut sm">Beat the World ' + w + ' boss in Expedition to chart this system.</p>'; return; }
  const ms = gxMissions(w), crate = (S.crate || {})[w] === dayKey();
  const job = m => { const T = GX_T[m.t], dn = gxDone(m.id); return '<div class="gx-job' + (dn ? ' dn' : '') + '"><span class="gx-ji">' + (ICO[T.ic] || '') + '</span><div class="fl"><b>' + T.nm + (m.tgt ? ': ' + m.tgt : '') + '</b><div class="xs mut">' + T.ds + '</div><div class="xs">' + (m.map ? '<span class="acc">' + gxMapNm(m.map) + '</span> - ' : '') + '<span class="gold b">+' + fmt(Math.round(m.rew * (1 + lvl * .1))) + ' cores</span> <span class="acc">+' + m.rep + ' rep</span></div></div>' + (dn ? '<span class="xs good b">DONE</span>' : here ? '<button class="btn sm gold" data-act="gxjob:' + m.id + '">GO</button>' : '') + '</div>'; };
  el.innerHTML = '<div class="gx-k" style="color:' + WORLDS[w].ac + '">SYSTEM ' + (w + 1) + ' - ' + escH(WORLDS[w].nm.toUpperCase()) + '</div><h2 class="gx-n">' + GX_ST[w] + '</h2>' +
    '<div class="gx-rep"><div class="row sp xs"><b>' + GX_RN[lvl] + '</b><span class="mut">' + (nx ? rp + ' / ' + nx + ' rep' : 'Max reputation') + '</span></div><div class="gx-bar"><i style="width:' + (nx ? Math.round((rp - GX_REP[lvl]) / (nx - GX_REP[lvl]) * 100) : 100) + '%"></i></div><div class="xs mut">+' + lvl * 10 + '% cores from jobs here</div></div>' +
    (here ? '<div class="xs mut b nh">JOB BOARD - NEW JOBS EVERY DAY</div>' : '<div class="xs mut b nh">JOBS HERE</div>') + '<div class="stack" style="gap:6px">' + ms.map(job).join('') + '</div>' +
    (here ? '<button class="btn' + (crate ? ' off' : '') + '" style="margin-top:10px;width:100%" data-act="gxcrate">' + (crate ? 'SUPPLY CRATE COLLECTED TODAY' : 'COLLECT DAILY SUPPLY CRATE') + '</button>' : '<button class="btn big gold" style="margin-top:12px;width:100%" data-act="gxjump:' + w + '">JUMP HERE</button>');
}
function gxBind() {
  const cv = document.getElementById('gxCv'); if (!cv || cv._b) return; cv._b = 1;
  const pts = new Map(); let moved = 0, pd = 0;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; GXV.drag = 1; if (pts.size === 2) { const [a, b] = [...pts.values()]; pd = Math.hypot(a.x - b.x, a.y - b.y); } });
  cv.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pd) GXV.zoom = clamp(GXV.zoom * d / pd, .6, 2.4); pd = d; return; }
    GXV.yaw -= dx * .006; GXV.pitch = clamp(GXV.pitch + dy * .004, .25, 1.35); });
  const up = e => { const was = pts.size; pts.delete(e.pointerId); if (!pts.size) GXV.drag = 0; if (was === 1 && moved < 8) { const [x, y] = locXY(e, cv); let best = null, bd = 1e9; for (const h of GXV.hit || []) { const d = Math.hypot(h.x - x, h.y - y); if (d < h.r && d < bd) { bd = d; best = h; } } if (best) { if (GXV.sel === best.i && best.i !== GXS().at && best.i < gxOpen()) gxJump(best.i); else { GXV.sel = best.i; GXV.enc = null; gxPanel(); } } } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); GXV.zoom = clamp(GXV.zoom * (e.deltaY > 0 ? .9 : 1.1), .6, 2.4); }, { passive: false });
}
SCR.scGalaxy = () => {
  const S = GXS(); if (GXV.sel < 0 || GXV.sel >= WORLDS.length) GXV.sel = S.at; if (S.at >= gxOpen()) S.at = 0;
  setTimeout(() => { gxBind(); gxPanel(); if (!GXV.raf) gxDraw(); }, 0);
  return '<div class="gx"><canvas id="gxCv"></canvas><header class="gx-h"><h1 class="lay-t">Galaxy</h1><span class="xs mut">Drag to turn - scroll or pinch to zoom - tap a system, tap again to jump</span></header><aside class="gx-side" id="gxSide"></aside>' +
    '<footer class="gx-f"><button class="btn sm" data-act="back">Back</button><span class="xs mut" id="gxStat">' + (S.runs | 0) + ' jobs done - ' + (S.jumps | 0) + ' jumps</span><button class="btn sm" data-act="gxhome">Return to ' + GX_ST[S.at] + '</button></footer></div>';
};
Object.assign(ACT, {
  galaxy() { if (G.run || G.scene === 'play') exitToMenu('scGalaxy'); else UI.show('scGalaxy'); },
  gxjump(a) { gxJump(+a[0]); },
  gxhome() { GXV.sel = GXS().at; GXV.enc = null; gxPanel(); },
  gxjob(a) { const id = a.join(':'), w = +id.split(':')[1], m = gxMissions(w).find(x => x.id === id); if (m && !gxDone(id)) gxPlay(m); },
  gxcrate() { const S = GXS(), w = S.at; S.crate = S.crate || {}; if (S.crate[w] === dayKey()) return; S.crate[w] = dayKey(); const c = Math.round((40 + 20 * w) * (1 + gxLv(w) * .25)); SAVE.cores += c; saveGame(); toast('SUPPLY CRATE', '+' + fmt(c) + ' cores from ' + GX_ST[w], '#fbbf24'); gxPanel(); },
  gxfight() { const E = GXV.enc; if (!E) return; GXV.enc = null; gxPlay({ t: 'ambush', w: E.w, lv: Math.min(12, 4 + (E.w >> 1)), rew: E.rew, rep: 20, id: '', map: GXM[Math.floor(Math.random() * GXM.length)] }); },
  gxflee() { const E = GXV.enc; if (!E) return; SAVE.cores = Math.max(0, SAVE.cores - E.loss); saveGame(); alertMsg('ESCAPED - ' + fmt(E.loss) + ' CORES DROPPED'); GXV.enc = null; gxPanel(); }
});
MODES.galaxy = { nm: 'Open Galaxy', ds: 'Fly a 3D star map between every system you have charted. Dock at stations, take bounties and side jobs, earn reputation and survive ambushes on the way.', ic: 'map' };
const _modeG = ACT.mode; ACT.mode = a => { if (a[0] === 'galaxy') { UI.show('scGalaxy'); return; } return _modeG(a); };
MAINNAV.splice(1, 0, ['galaxy', 'Galaxy', 'Explore the open galaxy: stations, bounties and side jobs']);
