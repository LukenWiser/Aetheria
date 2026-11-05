// ================= ROUTES & SECRETS: branching paths, boss gallery, hidden rifts, 1-UP retro world, hardcore =================
// ---- branching paths: some sectors have a side route ----
const ALT_NODE = { 3: 'g', 8: 'x' };
const ALT_INFO = { g: { nm: 'TREASURE RUN', ds: 'Side route: a golden elite is guaranteed and loot is boosted' }, x: { nm: 'THE GAUNTLET', ds: 'Side route: elites, asteroid storms and tougher enemies - double cores' } };
const altKey = (w, i, tier) => w + ':' + i + ':' + tier;
const altStars = (w, i, tier) => ((SAVE.flags.alt || {})[altKey(w, i, tier)]) | 0;
function applyRoute(R) {
  const t = R.spec && R.spec.type;
  if (t === 'x') { R.hazMode = true; R.hpm *= 1.12; R.lootM = 2; }
  if (t === 'g') { R.bounty = 1; R.lootM = 1.7; }
}

// ---- hidden rifts: shoot the flickering crack to find a secret exit ----
const RIFTS = [[0, 4], [2, 6], [4, 7], [7, 5], [11, 9]];
const riftKey = (w, lv) => w + ':' + lv;
const riftsFound = () => Object.keys(SAVE.flags.rifts || {}).length;
function riftTick(R) {
  if (R.mode !== 'expedition' || R.var || !R.spec || R.tier !== 1) return;
  if (!RIFTS.some(r => r[0] === R.w && r[1] === R.lv)) return;
  const k = riftKey(R.w, R.lv); if ((SAVE.flags.rifts || {})[k]) return;
  if (!R.rift && !R.riftGone && R.stage === 'wave' && R.wave >= 1 && R.st > 120) { R.rift = { x: V.W * rnd(.62, .86), y: V.H * rnd(.25, .75), hp: 14, t: 0 }; }
  const F = R.rift; if (!F) return; F.t++;
  if (F.t > 900) { R.rift = null; R.riftGone = 1; return; } // it closes if you miss it
  const vis = F.t % 90 < 60 || F.hp < 14; if (!vis) return;
  const A = G.ent.pb; for (let i = A.length - 1; i >= 0; i--) { const b = A[i]; if ((b.x - F.x) * (b.x - F.x) + (b.y - F.y) * (b.y - F.y) < 34 * 34) { A.splice(i, 1); F.hp--; spark(b.x, b.y, 3, '#c084fc', 3, 12, 2); if (F.hp <= 0) break; } }
  if (F.hp <= 0) {
    R.rift = null; (SAVE.flags.rifts = SAVE.flags.rifts || {})[k] = 1; const n = riftsFound();
    shock(F.x, F.y, '#c084fc', 400, 30); shock(F.x, F.y, '#ffffff', 200, 20); G.flashT = 10; SFX.power();
    banner('SECRET EXIT FOUND', 'RIFT ' + n + ' OF ' + RIFTS.length, false); SAVE.cores += 300; R.cores += 300;
    if (n === 3) toast('SECRET UNLOCKED', 'A strange new challenge waits in Select Mode...', '#c084fc');
    if (n === 3) SAVE.unl.retro = 1;
    saveGame(); R.secretExit = 1; G.ent.eb.length = 0; toClear(R);
  }
}
function drawRift(g, t) {
  const R = G.run, F = R && R.rift; if (!F) return; if (!(F.t % 90 < 60 || F.hp < 14)) return;
  const a = .55 + Math.sin(t * .4) * .25, k = 1 - F.hp / 14 * .4;
  g.save(); g.translate(F.x, F.y); g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, 60 * k + 20, '#a855f7', a);
  g.strokeStyle = 'rgba(233,213,255,' + a.toFixed(2) + ')'; g.lineWidth = 3; g.beginPath(); let y = -38; g.moveTo(0, y); while (y < 38) { y += 9; g.lineTo((Math.random() - .5) * 16 * k, y); } g.stroke(); g.restore();
}

// ---- boss gallery rematches ----
const GMODS = {
  hp2: { nm: 'DOUBLE HEALTH', ds: 'The boss has twice the health', m: .6 },
  fury: { nm: 'FURY', ds: 'Boss shots hit 50% harder', m: .5 },
  escort: { nm: 'ESCORTS', ds: 'Enemies keep warping in during the fight', m: .5 },
  noab: { nm: 'NO ABILITIES', ds: 'No ability and no super', m: .4 },
  glass: { nm: 'ONE HIT', ds: 'A single hit destroys you', m: 1.5 }
};
const bossBeaten = w => !!((prog(w).done[0] || [])[LV - 1]) || SAVE.wu > w + 1;
function galleryMult(mods) { return 1 + (mods || []).reduce((a, k) => a + (GMODS[k] ? GMODS[k].m : 0), 0); }
function startGallery(w, mods) { const o = { mode: 'expedition', var: 'gallery', w, lv: 12, tier: 1, co: SAVE.players === 2, mods: (mods || []).slice() }; G.last = o; beginRun(o); }
function setupGallery(R, o) {
  const sp = R.spec, M = R.gmods = o.mods || []; sp.type = 'B'; sp.waves = R.waves = 0; sp.name = 'Rematch: ' + BOSSES[R.w].nm; R.hazMode = false; R.skipToBoss = 1;
  if (M.indexOf('hp2') >= 0) R.bmul = 2;
  if (M.indexOf('fury') >= 0) R.edm *= 1.5;
  if (M.indexOf('noab') >= 0) G.players.forEach(p => { p.abCd = p.abMax = 1e9; p.noSup = 1; });
  if (M.indexOf('glass') >= 0) G.players.forEach(p => { p.mhp = p.hp = 1; p.msh = p.sh = 0; });
}
function galleryTick(R) {
  if (R.var !== 'gallery' || R.stage !== 'boss' || !R.boss || R.gmods.indexOf('escort') < 0) return;
  if (R.st % 300 === 150) { const ro = WORLDS[R.w].ro; for (let i = 0; i < 3; i++) { const e = mkEnemy(pick(ro), V.W + 60 + i * 40, V.H * (.2 + i * .3)); e.minion = true; } }
}
function galleryFinish(R, win, d) {
  const mult = galleryMult(R.gmods), hi = SAVE.hi.gal || (SAVE.hi.gal = {}); d.name = 'Rematch: ' + BOSSES[R.w].nm;
  d.bonus = win ? Math.round((250 + 110 * R.w) * mult) : 0;
  if (win && !R.assist) { const cur = hi[R.w] || {}, sc = R.gmods.length; if (!cur.t || d.time < cur.t || sc > (cur.m | 0)) { hi[R.w] = { t: !cur.t || d.time < cur.t ? d.time : cur.t, m: Math.max(sc, cur.m | 0) }; d.best = true; } if (sc >= 4) SAVE.flags.gal4 = 1; }
}

// ---- 1-UP: the retro world (found through the rifts) ----
function setupRetro(R) { const sp = R.spec; sp.type = 'B'; sp.waves = R.waves = 4; sp.name = '1-UP: Retro Run'; R.hazMode = false; R.hpm = Math.max(R.hpm, 1.3); R.lootM = 2; G.retro = 1; document.body.classList.add('retro'); layout(); }
function retroOff() { if (!G.retro) return; G.retro = 0; document.body.classList.remove('retro'); layout(); }

// ---- hardcore: one life, random sectors, carry everything forward ----
function setupHardcore(R) {
  R.hc = { sect: 1, bosses: 0 }; R.hpm = 1.2; R.edm = 1.25; R.w = G.world = hcWorld(); R.lootM = 1.25;
  G.players.forEach(p => { p.hcOne = 1; });
}
function hcWorld() { const n = Math.max(1, Math.min(SAVE.wu, WORLDS.length)); let w = Math.floor(Math.random() * n); if (w === GLITCH_W && n > 1) w = 0; return w; }
function hcWave(R) { // called at the start of each hardcore wave; returns true if it took over
  if (R.wave > 0 && R.wave % 10 === 0) { R.stage = 'boss'; R.st = 0; R.mini = true; R.bmul = 1 + R.wave * .02; return true; }
  if (R.wave > 0 && R.wave % 5 === 0) { R.hc.sect++; R.w = G.world = hcWorld(); buildBackdrop(R.w); music.w = R.w; banner('SECTOR ' + R.hc.sect, WORLDS[R.w].nm.toUpperCase(), false); }
  R.hpm = 1.2 + R.wave * .1; R.edm = 1.25 + R.wave * .03; return false;
}
function hcFinish(R, win, d) {
  d.name = 'Hardcore'; d.bonus = R.wave * 30 + (R.bossDown | 0) * 350; d.hcWave = R.wave; const hc = SAVE.hi.hc || (SAVE.hi.hc = { wave: 0, score: 0 });
  if (!R.assist) { if (R.wave > hc.wave) { hc.wave = R.wave; d.best = true; } hc.score = Math.max(hc.score, Math.round(R.score)); }
}
function routeWorld(R) { riftTick(R); logTick(R); rivalTick(R); vexAllyTick(R); linkTick(); versusTick(R); ghostTick(R); corruptTick(R); if (R.var === 'gallery') galleryTick(R); }
