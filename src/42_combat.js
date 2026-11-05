// ================= COMBAT 2.0: charge shot, secondary weapons, parry, super finisher, golden elites, mid-level events =================
const SECW = {
  salvo: { nm: 'Seeker Salvo', ds: 'Four homing missiles that blast on impact.', c: '#fb923c' },
  shotgun: { nm: 'Flak Burst', ds: 'A close-range blast of nine pellets. Huge damage up close.', c: '#fde047' },
  mines: { nm: 'Mine Layer', ds: 'Drops six slow mines that explode when enemies touch them.', c: '#f472b6' }
};
const secOf = p => SECW[p.pl.sec] ? p.pl.sec : 'salvo';
const IN2 = { tsec: false, sup: [0, 0], rdown: false };
function secHeld(p) {
  const co = G.players.length > 1, k = co ? KB[p.id] : KALL;
  if (k.c && kdown(k.c)) return true;
  const pad = co ? IN.pads[p.id] : IN.pads[0]; if (pad && pad.sec) return true;
  if (p.id === 0 && (IN2.rdown || IN2.tsec)) return true;
  return false;
}
function supPressed(p) { if (IN2.sup[p.id]) { IN2.sup[p.id] = 0; return true; } return false; }
function addSup(p, v) { if (!p || !p.alive || p.supT > 0 || p.noSup) return; const was = p.sup >= 100; p.sup = Math.min(100, (p.sup || 0) + v); if (!was && p.sup >= 100) { alertMsg((G.players.length > 1 ? 'P' + (p.id + 1) + ' ' : '') + 'SUPER READY - ' + (touchOn() ? 'TAP SUPER' : 'PRESS ' + keyLabel(KB[p.id].v[0]))); SFX.power(); } }

// ---- per pilot, every frame ----
function combatTick(p, o) {
  if (p.secCd > 0) p.secCd--; if (p.pcd > 0) p.pcd--; if (p.parT > 0) p.parT--;
  const held = secHeld(p), R = G.run;
  if (held && !p.secH) { // fresh press: parry if a shot is about to hit, otherwise start charging
    p.secH = true; p.chg = 0; p.secLock = false;
    if (p.pcd <= 0) { if (tryParry(p)) p.secLock = true; else p.pcd = 40; }
  } else if (held && !p.secLock) { p.chg = Math.min(80, p.chg + 1); p.vx *= .97; p.vy *= .97; if (p.chg >= 12 && p.chg % 10 === 0 && p.chg < 80) SFX.charge(p.chg / 80); if (p.chg === 80) SFX.power(); }
  else if (!held && p.secH) { // release
    p.secH = false;
    if (!p.secLock) { if (p.chg >= 30) chargeShot(p, (p.chg - 30) / 50); else if (p.secCd <= 0) fireSec(p); }
    p.chg = 0; p.secLock = false;
  }
  if (supPressed(p)) { if (p.sup >= 100) superGo(p); else if (p.alive) alertMsg('SUPER ' + Math.floor(p.sup || 0) + '%'); }
  if (p.supT > 0) superTick(p);
  if (p.cfg.hull === 'ronin' && R) roninTick(p);
}
function tryParry(p) {
  const eb = G.ent.eb; let n = 0;
  for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j], dx = q.x - p.x, dy = q.y - p.y; if (dx * dx + dy * dy < 70 * 70) n++; }
  if (!n) return false;
  for (let j = eb.length - 1; j >= 0; j--) {
    const q = eb[j], dx = q.x - p.x, dy = q.y - p.y; if (dx * dx + dy * dy > 110 * 110) continue;
    const t = nearE(q.x, q.y, 900), a = t ? Math.atan2(t.y - q.y, t.x - q.x) : 0;
    pb(p, q.x, q.y, Math.cos(a) * 13, Math.sin(a) * 13, 'ion', { d: 14 * p.st.dmg * (G.pdm || 1), r: 5, c: '#fef08a', l: 90, pierce: 1 }); spark(q.x, q.y, 3, '#fef08a', 3, 12, 2); eb.splice(j, 1);
  }
  p.inv = Math.max(p.inv, 24); p.blink = false; p.parT = 18; p.pcd = 22; G.freeze = 5; shake(4, 8);
  shock(p.x, p.y, '#fef08a', 150, 18); shock(p.x, p.y, '#ffffff', 80, 12); ftext(p.x, p.y - 34, 'PARRY!', '#fef08a', 18); SFX.parry(); haptic(30);
  addSup(p, 9 + n * 2); SAVE.st.parry = (SAVE.st.parry | 0) + 1; if (G.run) G.run.parries = (G.run.parries | 0) + 1;
  return true;
}
function chargeShot(p, f) {
  const nx = p.x + 30 * (HULLK[p.cfg.hull] || 1), d = (16 + 44 * f) * p.st.dmg * (G.pdm || 1), r = 11 + 13 * f;
  pb(p, nx, p.y, 15, 0, 'lancer', { d, r, pierce: 99, crush: 1, l: 90, c: f > .9 ? '#ffffff' : '#a5f3fc', chg: 1 });
  if (f > .95) [-.12, .12].forEach(a => pb(p, nx, p.y, Math.cos(a) * 14, Math.sin(a) * 14, 'lancer', { d: d * .5, r: r * .6, pierce: 99, l: 70, c: '#a5f3fc', chg: 1 }));
  shock(nx, p.y, '#a5f3fc', 60 + 80 * f, 14); shake(2 + 5 * f, 8); p.vx -= 2 + 4 * f; SFX.shoot('rail');
  if (f > .95) ftext(p.x, p.y - 30, 'FULL CHARGE', '#a5f3fc', 13);
}
function fireSec(p) {
  const k = secOf(p), nx = p.x + 26, dm = p.st.dmg * (G.pdm || 1); p.secCd = 80;
  if (k === 'salvo') [-2, -1, 1, 2].forEach(q => pb(p, nx - 6, p.y + q * 8, 7, q * 2.2, 'missile', { d: 8 * dm, r: 6, home: 1, blast: 54, l: 150, c: '#fb923c' }));
  else if (k === 'shotgun') { for (let i = -4; i <= 4; i++) { const a = i * .11 + rnd(-.03, .03); pb(p, nx, p.y, Math.cos(a) * 15, Math.sin(a) * 15, 'spread', { d: 7 * dm, r: 4.5, l: 20, c: '#fde047' }); } shake(3, 6); p.vx -= 3; }
  else for (let i = 0; i < 6; i++) pb(p, nx, p.y, 2.2 + i * .45, (i - 2.5) * .8, 'orb', { d: 6 * dm, r: 9, l: 300, blast: 70, c: '#f472b6', mine: 1 });
  SFX.shoot(k === 'salvo' ? 'missile' : k === 'shotgun' ? 'spread' : 'orb');
}
// ---- super finisher: a huge beam that sweeps the lane in front of you ----
function superGo(p) {
  if (!p.alive || !G.run || G.run.over) return;
  const mate = G.players.find(q => q !== p && q.alive && q.sup >= 100 && G.run.var !== 'versus'); if (mate) { mate.sup = 0; mate.supT = 120; mate.team = 1; p.team = 1; mate.inv = Math.max(mate.inv, 130); banner('TEAM FINISHER', 'DOUBLE NOVA BEAM', false); SAVE.st.team = (SAVE.st.team | 0) + 1; }
  p.sup = 0; p.supT = 120; p.inv = Math.max(p.inv, 130); p.blink = false; G.flashT = 10; G.freeze = 6; shake(10, 30);
  shock(p.x, p.y, '#e879f9', 420, 30); shock(p.x, p.y, '#ffffff', 220, 22); banner('FINISHER', 'NOVA BEAM', false); SFX.sup(); SFX.boom(true); haptic([40, 30, 80]);
  G.ent.eb.forEach(q => spark(q.x, q.y, 2, '#f0abfc', 3, 14, 2)); G.ent.eb.length = 0; SAVE.st.supers = (SAVE.st.supers | 0) + 1; if (G.run) G.run.supers = (G.run.supers | 0) + 1;
}
function superTick(p) {
  p.supT--; const hw = (p.team ? 95 : 70) + Math.sin(G.t * .5) * 6, dm = p.st.dmg * (G.pdm || 1) * (p.team ? 1.5 : 1); if (p.supT <= 0) p.team = 0;
  const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j]; if (q.x > p.x && Math.abs(q.y - p.y) < hw) eb.splice(j, 1); }
  if (G.t % 6 === 0) for (const e of G.ent.en) { if (e.dead || e.hide || e.x < p.x || e.x > V.W + 20 || Math.abs(e.y - p.y) > hw + e.r) continue; hurtEnemy(e, (e.boss ? 9 : 26) * dm, { own: p.id, raw: 0 }); spark(e.x, e.y, 6, '#f0abfc', 5, 16, 3); }
  if (!SET.reduce && G.t % 2 === 0) spark(p.x + 40 + Math.random() * (V.W - p.x), p.y + rnd(-hw, hw) * .8, 1, Math.random() < .5 ? '#f0abfc' : '#ffffff', 6, 14, 2.5);
}
// ---- Ronin: a blade field that cuts anything that gets close ----
function roninTick(p) {
  if (!p.alive || G.t % 14) return; const dm = p.st.dmg * (G.pdm || 1); let hit = 0;
  for (const e of G.ent.en) { if (e.dead || e.hide) continue; const dx = e.x - p.x, dy = e.y - p.y, rr = 92 + e.r; if (dx * dx + dy * dy < rr * rr && dx > -30) { hurtEnemy(e, (e.boss ? 7 : 16) * dm, { own: p.id }); hit++; } }
  const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j], dx = q.x - p.x, dy = q.y - p.y; if (dx > 0 && dx * dx + dy * dy < 80 * 80) { spark(q.x, q.y, 2, '#fecaca', 3, 10, 2); eb.splice(j, 1); hit++; } }
  if (hit) { p.slashT = 10; p.slashA = (p.slashA || 0) + 1; }
}
function ronSlash(p) { // ability: CRESCENT - a dash that cuts a huge arc
  const dm = p.st.dmg * (G.pdm || 1); p.dvx = 15; p.dvy = (p.lmy || 0) * 4; p.dashT = 9; p.inv = Math.max(p.inv, 30); p.blink = false; p.bigSlash = 22;
  for (const e of G.ent.en) { if (e.dead || e.hide) continue; const dx = e.x - p.x, dy = e.y - p.y; if (dx > -40 && dx < 330 && Math.abs(dy) < 170 + e.r) hurtEnemy(e, e.boss ? e.mhp * .03 + 30 * dm : 60 * dm, { own: p.id }); }
  const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j], dx = q.x - p.x, dy = q.y - p.y; if (dx > -40 && dx < 330 && Math.abs(dy) < 170) { spark(q.x, q.y, 2, '#fecaca', 3, 12, 2); eb.splice(j, 1); } }
  shock(p.x + 120, p.y, '#fca5a5', 220, 18); shake(8, 14);
}
function hiveSwarm(p) { // ability: SWARM - eight kamikaze drones
  const dm = p.st.dmg * (G.pdm || 1);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; pb(p, p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, Math.cos(a) * 5 + 3, Math.sin(a) * 5, 'missile', { d: 14 * dm, r: 7, home: 1, blast: 60, l: 220, c: p.cfg.accent, drone: 1 }); }
  shock(p.x, p.y, p.cfg.accent, 140, 20);
}
function bowDeadeye(p) { // ability: DEADEYE - rail shots straight into the toughest targets
  const dm = p.st.dmg * (G.pdm || 1), T = G.ent.en.filter(e => !e.dead && !e.hide && e.x < V.W + 10 && e.x > 0).sort((a, b) => b.hp - a.hp).slice(0, 4);
  if (!T.length) { pb(p, p.x + 30, p.y, 26, 0, 'rail', { d: 60 * dm, r: 7, pierce: 99, l: 60 }); return; }
  T.forEach((e, i) => { (G.cfx = G.cfx || []).push({ k: 'rail', x: p.x + 30, y: p.y, x2: e.x, y2: e.y, l: 22, l0: 22 }); hurtEnemy(e, e.boss ? e.mhp * .035 + 40 * dm : 85 * dm, { own: p.id, crit: 1 }); spark(e.x, e.y, 10, '#e0f2fe', 5, 18, 3); });
  G.freeze = 6; shake(6, 10); shock(p.x, p.y, '#e0f2fe', 120, 16);
}

// ---- golden elites: rare, tough, worth a fortune - and they run away ----
function goldRoll(e, R) {
  if (!R || R.var === 'vault' || e.minion || e.id === 'rock' || R.goldDone || R.mode === 'training' || R.mode === 'tutorial') return;
  const force = R.bounty; if (!force && (Math.random() > .045 || (R.mode === 'expedition' && R.lv < 1))) return;
  R.goldDone = 1; R.bounty = 0; e.gold = 1; e.hunt = 1; e.hp = e.mhp = Math.round(e.mhp * 3); e.gT = 720;
  alertMsg('GOLDEN ELITE SPOTTED - HUNT IT!'); SFX.power();
}
function onKillC(e, own) {
  const p = G.players[own] || alive()[0]; const R = G.run;
  if (p) addSup(p, (e.d.elite ? 14 : 3) + Math.min(R ? R.combo : 0, 20) * .2 + (e.gold ? 30 : 0));
  if (e.hunt) {
    SAVE.st.gold = (SAVE.st.gold | 0) + 1; if (R) R.golds = (R.golds | 0) + 1; banner('GOLDEN ELITE DOWN', '+ BONUS CORES', false); SFX.clear();
    for (let i = 0; i < 10; i++) G.ent.pk.push({ k: 'core', v: 6 + (R ? R.w : 0) * 2, x: e.x + rnd(-40, 40), y: e.y + rnd(-40, 40), vx: rnd(-3, 2), vy: rnd(-3, 3), l: 800 });
    G.ent.pk.push({ k: 'od', x: e.x, y: e.y, vx: -1, vy: 0, l: 760 }); shock(e.x, e.y, '#fde047', 300, 30);
  }
}
// ---- mid-level events ----
const EVENTS = {
  meteor: { nm: 'METEOR SHOWER', ds: 'Rocks are falling - dodge or shoot them' },
  supply: { nm: 'SUPPLY DROP', ds: 'Friendly cargo incoming - grab it' },
  ambush: { nm: 'AMBUSH', ds: 'Extra enemies warping in' },
  bounty: { nm: 'BOUNTY', ds: 'A golden elite is on its way' },
  surge: { nm: 'ION SURGE', ds: 'Your guns are supercharged' }
};
function eventRoll(R) {
  if (!R || R.evDone || R.wave < 1 || G.brief) return;
  if (!(R.mode === 'expedition' && R.spec && R.spec.type !== 'B' && R.spec.type !== 's') && R.mode !== 'endless') return;
  if (Math.random() > (R.mode === 'endless' ? .3 : .4)) return;
  R.evDone = 1; const ks = Object.keys(EVENTS), k = ks[Math.floor(Math.random() * ks.length)]; startEvent(R, k);
}
function startEvent(R, k) {
  const E = EVENTS[k]; R.ev = { k, t: 0 }; banner(E.nm, E.ds, false); SFX.abil();
  if (k === 'supply') { ['hp', 'sh', 'ammo', 'od', 'ammo'].forEach((q, i) => G.ent.pk.push({ k: q, x: V.W * .7 + i * 30, y: V.H * (.25 + i * .12), vx: -1.2, vy: 0, l: 900 })); for (let i = 0; i < 8; i++) G.ent.pk.push({ k: 'core', v: 4, x: V.W * .75 + rnd(-40, 40), y: V.H * .5 + rnd(-90, 90), vx: -1, vy: 0, l: 900 }); }
  if (k === 'ambush') { const ro = rosterFor(R.w, R.lv || 0); for (let i = 0; i < 5; i++) { const ne = mkEnemy(pick(ro), V.W + 60 + i * 30, V.H * (.15 + i * .17)); ne.minion = true; } }
  if (k === 'bounty') R.bounty = 1;
  if (k === 'surge') G.players.forEach(p => { if (p.alive) { p.od = Math.max(p.od, 420); shock(p.x, p.y, '#fb923c', 140, 20); } });
}
function combatWorld(R) {
  const ev = R.ev; if (ev) { ev.t++; if (ev.k === 'meteor') { if (ev.t % 22 === 0 && ev.t < 540) { const m = mkEnemy('rock', V.W * rnd(.35, 1.05), -40, { hpm: .6, minion: true }); m.vy = rnd(2.2, 3.4); } if (ev.t > 600) R.ev = null; } else if (ev.t > 400) R.ev = null; }
  for (const e of G.ent.en) { if (!e.hunt || e.dead) continue; if (e.gT > 0 && --e.gT === 0) { alertMsg('THE GOLDEN ELITE IS ESCAPING!'); e.flee = 1; e.minion = true; } if (e.flee) { e.x -= 7; e.y += (V.H / 2 - e.y) * .01; } if (!SET.reduce && G.t % 5 === 0) spark(e.x + rnd(-e.r, e.r), e.y + rnd(-e.r, e.r), 1, '#fde047', 1.5, 20, 2); }
  if (G.cfx) G.cfx = G.cfx.filter(f => --f.l > 0);
}
function drawCombat(g, t) {
  const R = G.run; if (!R) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  if (R.var !== 'vault') for (const e of G.ent.en) if (e.hunt && !e.dead && !e.hide) { drawGlow(g, e.x, e.y, e.w * .85, '#fbbf24', .38 + Math.sin(t * .2) * .1); g.strokeStyle = 'rgba(253,224,71,.8)'; g.lineWidth = 2; g.setLineDash([8, 6]); g.lineDashOffset = -t * .5; g.beginPath(); g.arc(e.x, e.y, e.r * 1.6, 0, TAU); g.stroke(); g.setLineDash([]); }
  for (const p of G.players) {
    if (!p.alive) continue;
    if (p.chg > 6) { const f = Math.min(1, p.chg / 80), nx = p.x + 34 * (HULLK[p.cfg.hull] || 1), full = p.chg >= 80; drawGlow(g, nx, p.y, 10 + f * 34, full ? '#ffffff' : '#a5f3fc', .35 + f * .45 + (full ? Math.sin(t * .8) * .15 : 0)); if (p.chg >= 30) { g.strokeStyle = 'rgba(165,243,252,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(nx, p.y, 8 + f * 18, t * .3, t * .3 + TAU * f); g.stroke(); } }
    if (p.parT > 0) { g.strokeStyle = 'rgba(254,240,138,' + (p.parT / 18).toFixed(2) + ')'; g.lineWidth = 4; g.beginPath(); g.arc(p.x, p.y, 110 - p.parT * 3, 0, TAU); g.stroke(); }
    if (p.sup >= 100 && !SET.reduce) drawGlow(g, p.x, p.y, 50 + Math.sin(t * .3) * 6, '#e879f9', .22);
    if (p.supT > 0) {
      const k = Math.min(1, p.supT / 15, (120 - p.supT + 1) / 6), hw = (60 + Math.sin(t * .6) * 8) * k, x0 = p.x + 20;
      const gr = g.createLinearGradient(0, p.y - hw, 0, p.y + hw); gr.addColorStop(0, 'rgba(232,121,249,0)'); gr.addColorStop(.3, 'rgba(232,121,249,.55)'); gr.addColorStop(.5, 'rgba(255,255,255,.95)'); gr.addColorStop(.7, 'rgba(232,121,249,.55)'); gr.addColorStop(1, 'rgba(232,121,249,0)');
      g.fillStyle = gr; g.fillRect(x0, p.y - hw, V.W - x0 + 20, hw * 2); drawGlow(g, x0, p.y, hw * 1.8, '#f0abfc', .8);
    }
    if (p.slashT > 0) { p.slashT--; const a = p.slashT / 10, s = (p.slashA & 1) ? 1 : -1; g.strokeStyle = 'rgba(254,202,202,' + a.toFixed(2) + ')'; g.lineWidth = 5 * a + 1; g.beginPath(); g.arc(p.x + 10, p.y, 84, -1.1 * s, 1.1 * s, s < 0); g.stroke(); }
    if (p.bigSlash > 0) { p.bigSlash--; const a = p.bigSlash / 22; g.strokeStyle = 'rgba(254,226,226,' + a.toFixed(2) + ')'; g.lineWidth = 14 * a + 2; g.beginPath(); g.arc(p.x - 60, p.y, 260, -.75, .75); g.stroke(); g.lineWidth = 4 * a; g.strokeStyle = 'rgba(248,113,113,' + a.toFixed(2) + ')'; g.beginPath(); g.arc(p.x - 60, p.y, 236, -.7, .7); g.stroke(); }
  }
  if (G.cfx) for (const f of G.cfx) { const a = f.l / f.l0; g.strokeStyle = 'rgba(224,242,254,' + a.toFixed(2) + ')'; g.lineWidth = 6 * a + 1; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x2, f.y2); g.stroke(); drawGlow(g, f.x2, f.y2, 40 * a, '#e0f2fe', a); }
  const ev = R.ev; if (ev && ev.k === 'meteor' && ev.t < 540 && !SET.reduce) { g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(251,146,60,.05)'; g.fillRect(0, 0, V.W, V.H); }
  g.restore(); drawRift(g, t); drawVexAlly(g, t); drawCoop(g, t); drawGhost(g, t); drawHitbox(g); drawCorrupt(g, t); drawCrashEnemies(g, t);
}
