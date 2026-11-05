// ================= RUN: HUD, level director, modes, results, tutorial, update + render =================
let alT = 0, r3err = 0;
function banner(t, s, boss) { const b = $('banner'); b.className = boss ? 'boss' : ''; b.querySelector('.t').textContent = t; b.querySelector('.s').textContent = s || ''; void b.offsetWidth; b.classList.add('show'); }
function clearMsgs() { const b = $('banner'); b.classList.remove('show'); b.style.opacity = 0; clearTimeout(alT); $('alert').style.opacity = 0; void b.offsetWidth; b.style.opacity = ''; }
function alertMsg(t) { const a = $('alert'); a.textContent = t; a.style.opacity = 1; clearTimeout(alT); alT = setTimeout(() => { a.style.opacity = 0; }, 1500); }

// ---------- HUD ----------
const IC = {
  hull: '<svg viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2.2" stroke-linejoin="round"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/></svg>',
  sh: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
  am: '<svg viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" stroke-width="2.2" stroke-linejoin="round"><path d="M8 3h8l3 5-7 13L5 8z"/></svg>',
  ab: '<svg viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2.2" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>'
};
function hudPanel(p) {
  const row = (k, c, id, ic) => '<div class="rw">' + ic + '<div class="bar" id="b' + k + p.id + '"><i style="--c:' + c + '"></i></div><b id="t' + k + p.id + '"></b></div>';
  return '<div class="nm"><span>PILOT ' + (p.id + 1) + '</span><em id="hw' + p.id + '"></em></div>' + row('h', '#fb7185', '', IC.hull) + row('s', '#38bdf8', '', IC.sh) + row('a', '#2dd4bf', '', IC.am) + row('b', '#fde047', '', IC.ab) + row('u', '#e879f9', '', IC.ab);
}
function buildHud() {
  const h = $('hud'); h.classList.add('on'); h.classList.toggle('coop', G.players.length > 1);
  G.players.forEach((p, i) => { $('hp' + i).innerHTML = hudPanel(p); p._hc = {}; });
  $('boss').classList.remove('on'); $('stn').style.display = G.run && G.run.stn ? 'block' : 'none';
}
function setW(id, v, txt) {
  const el = $(id); if (!el) return; const i = el.firstChild; if (i) { const w = clamp(v, 0, 1) * 100; i.style.width = w + '%'; } el.classList.toggle('lo', v < .3);
}
function hudTick() {
  const R = G.run; if (!R) return;
  for (const p of G.players) {
    const c = p._hc, i = p.id, hv = Math.round(p.hp), sv = Math.round(p.sh), av = Math.round(p.am), lv = wlvOf(p.pl, p.wpn), ev = wevOf(p.pl, p.wpn), wk = p.wpn + lv + (ev ? 'E' : '') + (p.od > 0 ? '!' : '') + (p.alive ? '' : 'x');
    if (c.h !== hv) { c.h = hv; setW('bh' + i, p.hp / p.mhp); $('th' + i).textContent = hv; }
    if (c.s !== sv) { c.s = sv; setW('bs' + i, p.msh ? p.sh / p.msh : 0); $('ts' + i).textContent = sv; }
    if (c.a !== av) { c.a = av; setW('ba' + i, p.am / p.mam); $('ta' + i).textContent = p.am < WPN[p.wpn].am ? 'AUX' : av; }
    if (c.w !== wk) { c.w = wk; $('hw' + i).textContent = (p.alive ? wName(p.pl, p.wpn).toUpperCase() + (ev || !lv ? '' : ' LV' + (lv + 1)) : 'DOWN') + (p.od > 0 ? ' x1.5' : ''); }
    const abv = p.abCd > 0 ? Math.ceil(p.abCd / 60) : 0, af = p.abMax ? Math.round((1 - p.abCd / p.abMax) * 40) : 40, ak = af + '/' + abv + (p.alive ? '' : 'x');
    if (c.b !== ak) { c.b = ak; const bb = $('bb' + i), tb = $('tb' + i); if (bb && bb.firstChild) { bb.firstChild.style.width = (p.alive ? af / 40 * 100 : 0) + '%'; bb.classList.toggle('rdy', p.alive && !abv); } if (tb) tb.textContent = !p.alive ? '-' : abv ? abv + 's' : 'READY'; }
    const su = p.alive ? Math.floor(p.supT > 0 ? 0 : p.sup || 0) : -1; if (c.u !== su) { c.u = su; setW('bu' + i, Math.max(0, su) / 100); const tu = $('tu' + i), bu = $('bu' + i); if (tu) tu.textContent = su < 0 ? '-' : su >= 100 ? 'SUPER!' : su + '%'; if (bu) bu.classList.toggle('rdy', su >= 100); }
  }
  { const ts = $('tsup'), p0 = G.players[0]; if (ts && p0) ts.classList.toggle('rdy', p0.alive && p0.sup >= 100); }
  const sc = String(Math.round(R.score)); if (R._sc !== sc) { R._sc = sc; $('score').textContent = sc; }
  const cr = String(SAVE.cores); if (R._cr !== cr) { R._cr = cr; $('cores').textContent = cr; }
  const cb = R.combo > 1 ? 'x' + (1 + Math.min(R.combo, 20) * .1).toFixed(1) + ' COMBO' : ''; if (R._cb !== cb) { R._cb = cb; $('combo').textContent = cb; }
  const ob = objText(R); if (R._ob !== ob) { R._ob = ob; $('obj').textContent = ob; }
  if (R.stn) { const sn = R.stn, k = Math.round(sn.hp) + ':' + Math.round(sn.sh); if (R._sk !== k) { R._sk = k; $('stnH').style.width = sn.hp / sn.mhp * 100 + '%'; $('stnS').style.width = sn.sh / sn.msh * 100 + '%'; $('stnT').textContent = 'STATION ' + Math.round(sn.hp / sn.mhp * 100) + '%'; } }
  const gz = R.graze ? 'GRAZE ' + R.graze : ''; if (R._gz !== gz) { R._gz = gz; $('graze').textContent = gz; }
  const tbt = $('tab'), p0 = G.players[0]; if (tbt && p0) { const f = p0.abMax ? 1 - p0.abCd / p0.abMax : 1, k = (p0.alive ? Math.round(f * 36) : 0) + (p0.abCd > 0 ? '' : 'r'); if (tbt._k !== k) { tbt._k = k; tbt.style.setProperty('--cd', (360 - Math.round(f * 360)) + 'deg'); tbt.classList.toggle('rdy', p0.alive && p0.abCd <= 0); } }
  const b = R.boss; if (b && !b.dead) { const pd = b.pods ? podOf(b) : null; $('boss').classList.add('on'); $('bossN').textContent = BOSSES[b.bi].nm.toUpperCase() + (b.stg > 0 ? ' - EXPOSED!' : pd ? ' - ARMORED' : ''); $('bossF').style.width = clamp(b.hp / b.mhp, 0, 1) * 100 + '%'; const sp = pd && b.st === 1; $('bossPb').style.display = sp ? 'block' : 'none'; if (sp) $('bossP').style.width = clamp(pd.hp / pd.mhp, 0, 1) * 100 + '%'; } else $('boss').classList.remove('on');
}
function objText(R) {
  const m = R.mode; if (R.var) return varObj(R); if (m === 'expedition' && R.spec && ALT_INFO[R.spec.type] && R.stage !== 'boss') return ALT_INFO[R.spec.type].nm + ' - WAVE ' + Math.min(R.wave + 1, R.waves) + '/' + R.waves; if (m === 'defense') return 'STATION DEFENSE - WAVE ' + Math.min(R.wave + 1, R.waves) + '/' + R.waves + (R.assist ? ' - ASSIST' : '');
  if (m === 'expedition') return R.stage === 'boss' ? 'BOSS FIGHT' : (R.spec ? (R.spec.type === 'h' ? 'HAZARD ZONE' : R.spec.type === 'e' ? 'ELITE AMBUSH' : R.spec.type === 's' ? 'SUPPLY RUN' : 'SECTOR') : '') + ' - WAVE ' + Math.min(R.wave + 1, R.waves) + '/' + R.waves;
  if (m === 'endless') return (G.mapX ? G.mapX.nm.toUpperCase() : 'ENDLESS') + ' - WAVE ' + (R.wave + 1) + (G.mapX ? '' : ' - ' + WORLDS[R.w].nm.toUpperCase());
  if (m === 'blitz') return 'BLITZ - ' + Math.max(0, Math.ceil(R.time)) + 's';
  if (m === 'rush') return 'BOSS RUSH - ' + Math.min(R.ri + 1, R.rush.length) + '/' + R.rush.length;
  if (m === 'training') return 'TRAINING - ' + WORLDS[R.w].nm.toUpperCase();
  if (m === 'tutorial') return 'FLIGHT SCHOOL';
  return '';
}

// ---------- run setup ----------
function beginRun(o) {
  retroOff(); crashOff(); BOSSES.length = BASE_BOSSES; if (music.jbx >= 0) jbStop(); G.mapX = o.map ? MAPS.find(m => m.k === o.map) || null : (o.mode === 'expedition' && (o.w | 0) === GLITCH_W) ? glitchMap(o.lv) : null;
  audio(); if (UI.hideAll) UI.hideAll(); clearMsgs();
  const co = !!o.co && o.mode !== 'tutorial'; G.coop = co; G.mode = o.mode; G.world = (o.w | 0) % WORLDS.length;
  const R = G.run = { mode: o.mode, w: G.world, lv: o.lv | 0, tier: o.tier || 1, diff: 1, hpm: 1, edm: 1, stage: 'intro', st: 0, wave: 0, waves: 4, q: [], kills: 0, score: 0, cores: 0, hurt: 0, combo: 0, comboT: 0, boss: null, time: 0, hazMode: false, nodmg: false, freeAmmo: false, blitz: false, tut: null, over: false, bossDown: 0, spec: null, gap: 0, t0: G.t, rush: null, ri: 0, graze: 0, maxCombo: 0, esc: 0, gzT: 0, var: o.var || null, assist: !!o.assist, rng: null, swarm: 1, ammoDrop: 1, bmul: 1, stn: null, lastSrc: null, low: undefined, dinfo: null };
  G.players = [mkPlayer(0)]; if (co) G.players.push(mkPlayer(1));
  G.players.forEach(p => { p.x = 150; p.y = V.H / 2 + (co ? (p.id ? 80 : -80) : 0); });
  G.ent = { en: [], pb: [], eb: [], pk: [], pa: [], fl: [], bm: [], hz: [] }; G.freeze = 0; G.shake = 0; G.hitT = 0; G.ts = 1; G.paused = false; G.god = false; G.pick = null; G.abTs = 0; G.slowUntil = 0; IN.ab = [0, 0];
  if (o.mode === 'expedition') { const sp = R.spec = levelSpec(R.w, R.lv, R.tier, o.alt); R.diff = sp.diff; R.waves = sp.waves; R.hazMode = sp.type === 'h'; R.hpm = sp.diff; R.edm = 1 + (sp.diff - 1) * .35; R.alt = sp.alt; applyRoute(R); }
  if (R.mode === 'expedition' && !o.var && R.tier > 1) R.remix = R.tier;
  if (R.mode === 'expedition' && !o.var && !G.net && (o.lv | 0) === 0 && SET.brief !== 'off') { R.brief = 1; if (SET.brief === 'always' || !(SAVE.flags.brief && SAVE.flags.brief[R.w])) { G.brief = 1; setTimeout(() => { if (G.brief) UI.show('scBrief'); }, 30); } }
  if (R.mode === 'expedition' && !o.var && SAVE.devAll && R.spec && R.spec.type === 'B') R.skipToBoss = 1; // dev: boss sectors jump straight to the boss
  else if (o.mode === 'endless') { R.hpm = 1; R.edm = 1; R.waves = 1e9; }
  else if (o.mode === 'rush') { R.rush = []; for (let i = 0; i < Math.min(WORLDS.length, SAVE.wu); i++) R.rush.push(i); R.waves = 0; R.hpm = 1.1; R.edm = 1.15; }
  else if (o.mode === 'blitz') { R.blitz = true; R.freeAmmo = true; R.time = 90; R.waves = 1e9; R.hpm = 1; R.edm = .9; }
  else if (o.mode === 'training') { R.nodmg = true; R.freeAmmo = true; R.waves = 1e9; R.hpm = .8; R.edm = .6; }
  else if (o.mode === 'defense') { R.waves = 10; R.hpm = 1; R.edm = 1; R.stn = mkStation(); R.bmul = .8; }
  else if (o.mode === 'tutorial') { R.waves = 0; R.freeAmmo = false; R.hpm = .6; R.edm = .5; R.tut = { step: -1, picked: {}, moved: 0, kills0: 0, lx: 0, ly: 0, t: 0, ok: false, rammed: false }; G.world = 0; R.w = 0; }
  if (o.var) setupVariant(R, o); if (o.assist) applyAssist(); ghostStart(R); corruptSetup(R);
  if (R3) { R3.reset(); G.players.forEach(p => R3.repair(p)); R3.setView('play'); }
  G.scene = 'play'; G.inCombat = true; G.view = 'play'; buildHud(); buildTouch(); buildBackdrop(G.world); layoutHl(); music.start(G.world, false);
  document.body.classList.add('lb'); setTimeout(() => document.body.classList.remove('lb'), 1200);
  hudTick();
}
function introBanner(R) {
  if (R.var) varBanner(R);
  else if (R.mode === 'defense') banner('STATION DEFENSE', 'DO NOT LET THEM THROUGH');
  else if (R.mode === 'expedition') banner(R.spec.name.toUpperCase(), 'WORLD ' + (R.w + 1) + ' - ' + WORLDS[R.w].nm.toUpperCase() + (R.tier > 1 ? ' - TIER ' + R.tier + ' REMIX: ' + (R.tier === 2 ? 'CROSSFIRE' : 'NIGHTMARE') : ''), R.spec.type === 'B');
  else if (R.mode === 'endless') banner(G.mapX ? G.mapX.nm.toUpperCase() : 'ENDLESS', G.mapX ? 'EXTRA MAP - HOW LONG CAN YOU HOLD?' : 'HOW LONG CAN YOU HOLD?');
  else if (R.mode === 'blitz') banner('BLITZ', '90 SECONDS. UNLIMITED PLASMA.');
  else if (R.mode === 'rush') banner('BOSS RUSH', R.rush.length + ' BOSSES');
  else if (R.mode === 'training') banner('TRAINING', 'NO DAMAGE. TRY EVERYTHING.');
  else if (R.mode === 'tutorial') banner('FLIGHT SCHOOL', 'LEARN THE BASICS');
}

// ---------- wave generation ----------
function formation(q, id, n, t0) {
  const Hh = V.H, type = pick(['line', 'column', 'vee', 'stagger', 'line']), y0 = rnd(110, Hh - 110), cn = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    let y = y0, dt = 0, dx = 0;
    if (type === 'line') dt = i * 36;
    else if (type === 'column') { y = Hh * (.18 + .64 * (n === 1 ? .5 : i / (n - 1))); dt = i * 4; }
    else if (type === 'vee') { y = clamp(y0 + (i - cn) * 56, 80, Hh - 80); dx = Math.abs(i - cn) * 46; dt = Math.abs(i - cn) * 18; }
    else { y = i % 2 ? Hh * .3 : Hh * .7; dt = i * 30; }
    q.push({ t: t0 + dt, id, y, dx });
  }
}
function genWave(R) { if (!R.rng) return genWave0(R); const old = RF; RF = R.rng; try { genWave0(R); } finally { RF = old; } }
function genWave0(R) {
  if (R.cust) return customWave(R);
  const w = R.w, lv = R.lv, wave = R.wave, q = []; let ro, budget, t = 20;
  if (R.mode === 'expedition') { ro = rosterFor(w, lv); budget = 4 + lv * 1.05 + w * .8 + wave * 1.3; if (R.spec.type === 's') budget *= .6; }
  else if (R.mode === 'endless') { ro = WORLDS[w].ro.slice(0, Math.min(4, 2 + (wave / 3 | 0))); budget = 5 + wave * 1.5; }
  else if (R.mode === 'blitz') { ro = WORLDS[w].ro.slice(0, 3); budget = 7 + (R.wave) * 1.1; }
  else if (R.mode === 'defense') { ro = WORLDS[w].ro.slice(0, Math.min(4, 2 + (wave / 2 | 0))); budget = 5 + wave * 1.7; }
  else { ro = WORLDS[w].ro; budget = 4; }
  if (R.var === 'vault') ro = WORLDS[w].ro.concat(WORLDS[(w + 3) % WORLDS.length].ro.slice(0, 2));
  if (R.remix) { const ow = (w + 4 + R.remix * 2) % WORLDS.length; ro = ro.concat(WORLDS[ow].ro.slice(0, R.remix === 2 ? 1 : 2)); budget *= 1 + .08 * (R.remix - 1); }
  budget *= R.swarm || 1;
  const elite = (R.mode === 'expedition' && (R.spec.type === 'e' || R.spec.type === 'x') && (wave === 1 || wave === R.waves - 1)) || (R.mode === 'endless' && wave % 5 === 4) || ((R.var === 'daily' || R.var === 'vault') && (wave === 2 || wave === 4)) || (R.mode === 'defense' && wave % 4 === 3) || (R.remix && R.mode === 'expedition' && R.spec.type !== 's' && R.spec.type !== 'B' && (wave === 2 || (R.remix === 3 && wave === 3)));
  if (elite) { q.push({ t: 60, id: R.remix === 3 && wave % 2 === 1 ? WORLDS[(w + 7) % WORLDS.length].el : WORLDS[w].el, y: V.H / 2, dx: 0 }); budget -= 4; }
  let guard = 0;
  while (budget > .5 && guard++ < 12) {
    const id = pick(ro), c = Math.max(1, EN[id].cost), n = Math.max(1, Math.min(8, Math.round(rnd(2.6, 5.4) / c * (c === 1 ? 1.3 : 1))));
    formation(q, id, n, t); budget -= n * c; t += rnd(80, 170);
  }
  R.q = q.sort((a, b) => a.t - b.t); R.st = 0;
}
function startWave(R) {
  if (R.mode === 'defense') { if (R.wave >= R.waves) { R.stage = 'boss'; R.st = 0; R.mini = false; return; } R.hpm = 1 + R.wave * .08; R.edm = 1 + R.wave * .03; if (R.wave > 0) stnRepair(R); }
  if (R.var === 'hardcore' && hcWave(R)) return;
  if (R.mode === 'endless' && R.var !== 'hardcore' && R.wave > 0 && R.wave % 10 === 0) { R.stage = 'boss'; R.st = 0; R.mini = true; return; }
  if (R.mode === 'endless' && R.var !== 'hardcore' && R.wave > 0 && R.wave % 8 === 0) { R.w = (R.w + 1) % WORLDS.length; G.world = R.w; buildBackdrop(R.w); banner(WORLDS[R.w].nm.toUpperCase(), 'NEW SECTOR', false); music.w = R.w; }
  if (R.mode === 'endless' && R.var !== 'hardcore') { R.hpm = 1 + R.wave * .09 + R.w * .12; R.edm = 1 + R.wave * .025; }
  genWave(R); if (R.mode !== 'blitz' && R.mode !== 'training' && R.wave > 0) alertMsg('WAVE ' + (R.wave + 1)); eventRoll(R);
}
function stepRun(R) {
  R.st++; if (R.stn) updStation(R); if (R.mode !== 'tutorial') { combatWorld(R); routeWorld(R); }
  if (R.var !== 'versus' && R.stage !== 'dead' && R.stage !== 'clear' && !alive().length && !G.players.some(p => p.rest > 0 && alive().length)) { R.stage = 'dead'; R.st = 0; banner('SHIP LOST', ''); music.stop(); }
  if (R.mode === 'tutorial') return tutTick(R);
  switch (R.stage) {
    case 'intro': if (R.st === 1) introBanner(R); if (R.st > 130) { R.stage = R.mode === 'rush' || R.skipToBoss ? 'boss' : 'wave'; R.st = 0; if (R.stage === 'wave') startWave(R); } break;
    case 'wave': {
      const live = G.ent.en.filter(e => !e.dead && !e.boss && e.id !== 'rock').length, cap = 7 + Math.min(5, R.lv / 2 | 0) + (R.mode === 'blitz' ? 4 : 0) + (G.players.length > 1 ? 2 : 0);
      let sp = live; while (R.q.length && R.q[0].t <= R.st && sp < cap) { const s = R.q.shift(), ne = mkEnemy(s.id, V.W + 70 + (s.dx || 0), s.y); if (R.var === 'vault') ne.gold = 1; else goldRoll(corruptSpawn(ne, R), R); sp++; }
      if (R.blitz) { R.time -= 1 / 60; if (R.time <= 0) { finishRun(true); return; } if (!R.q.length && live < 5) { R.wave++; genWave(R); } return; }
      if (R.mode === 'training') { if (!R.q.length && live < 3) { R.wave++; genWave(R); } return; }
      if (!R.q.length && live === 0) { if (++R.gap > 50) { R.gap = 0; R.wave++; if (R.mode === 'expedition' && R.wave >= R.waves) { if (R.spec.type === 'B') { nextStage(R, 'boss'); } else { toClear(R); } } else nextStage(R, 'wave'); } } else R.gap = 0;
      break;
    }
    case 'boss':
      if (R.st === 1) { const wi = R.mode === 'rush' ? R.rush[R.ri] : R.bossW !== undefined ? R.bossW : R.w; if (R.mode === 'rush') { R.w = wi; G.world = wi; buildBackdrop(wi); } const nb = spawnBoss(wi, R.mini ? .55 * (R.var === 'hardcore' ? R.bmul * 1.6 : 1) : (R.bmul || 1)); if (R.var === 'vault') nb.gold = 1; }
      if (R.st > 5 && !R.boss) {
        if (R.mode === 'rush') { R.ri++; if (R.ri >= R.rush.length) { toClear(R); } else { R.stage = 'heal'; R.st = 0; banner('BOSS DOWN', 'REPAIRING...'); if (SET.cards !== false) offerCards(); G.players.forEach(p => { if (p.alive) { p.hp = Math.min(p.mhp, p.hp + p.mhp * .4); p.sh = p.msh; } else { revive(p); } }); } }
        else if (R.mini) { R.mini = false; R.wave++; banner('MINI-BOSS DOWN', ''); nextStage(R, 'wave', true); }
        else toClear(R);
      }
      break;
    case 'heal': if (R.st > 200) { R.stage = 'boss'; R.st = 0; } break;
    case 'cards': if (!G.pick) { R.stage = R.nxt; R.st = 0; if (R.stage === 'wave') startWave(R); } break;
    case 'clear': if (R.st === 1) { banner('SECTOR CLEARED', 'COLLECT YOUR SPOILS'); SFX.clear(); music.stop(); } if (R.st > 210) finishRun(true); break;
    case 'dead': if (R.st > 110) finishRun(false); break;
  }
}
function toClear(R) { R.stage = 'clear'; R.st = 0; }
function nextStage(R, st, force) { if (cardsDue(R, st, force) && offerCards()) { R.stage = 'cards'; R.nxt = st; R.st = 0; return; } R.stage = st; R.st = 0; if (st === 'wave') startWave(R); }

// ---------- results ----------
function finishRun(win) {
  const R = G.run; if (!R || R.over) return; R.over = true; G.inCombat = false; if (G.netHost) netSendEnd(R, win); $('touch').classList.remove('on'); music.stop();
  const tot = G.players.reduce((a, p) => a + p.mhp, 0), stars = win ? (R.hurt < tot * .25 ? 3 : R.hurt < tot * .75 ? 2 : 1) : 0;
  const rk0 = rankFor(R, win), rk = R.assist && (rk0 === 'S' || rk0 === 'A') ? 'B' : rk0, d = { rank: rk, assist: !!R.assist, killer: R.lastSrc || 'b', hadBoss: !!R.boss, graze: R.graze, maxCombo: R.maxCombo, win, mode: R.var || R.mode, base: R.mode, score: Math.round(R.score), kills: R.kills, cores: R.cores, stars, bonus: 0, w: R.w, lv: R.lv, tier: R.tier, wave: R.wave, time: Math.round((G.t - R.t0) / 60), best: false, next: null, unlockW: -1, name: R.spec ? R.spec.name : '' };
  if (R.mode === 'expedition' && !R.var && win) {
    const sp = R.spec, pr = prog(R.w); d.bonus = Math.round((40 + 18 * R.lv + 50 * R.w) * (1 + .15 * (stars - 1)) * R.tier + (sp.type === 'B' ? BOSSES[R.w].rew / 3 : 0));
    d.bonus = Math.round(d.bonus * (1 + RANKB[rk])); pr.rk = pr.rk || {}; const rkey = (R.tier - 1) + ':' + R.lv, RO = { C: 0, B: 1, A: 2, S: 3 }; if (!pr.rk[rkey] || RO[rk] > RO[pr.rk[rkey]]) pr.rk[rkey] = rk;
    const firstClear = !((pr.done[R.tier - 1] || [])[R.lv]);
    if (R.tier > 1) { d.bonus = Math.round(d.bonus * (1 + .25 * (R.tier - 1))); if (firstClear) { d.remix = Math.round(120 * R.tier * (1 + R.lv * .22) + (sp.type === 'B' ? 1500 * (R.tier - 1) : 0)); d.bonus += d.remix; } }
    const arr = pr.done[R.tier - 1] || (pr.done[R.tier - 1] = []); arr[R.lv] = Math.max(arr[R.lv] || 0, stars);
    if (R.alt) { const af = SAVE.flags.alt || (SAVE.flags.alt = {}), ak = altKey(R.w, R.lv, R.tier); af[ak] = Math.max(af[ak] | 0, stars); d.bonus = Math.round(d.bonus * 1.3); d.alt = 1; }
    if (R.secretExit) d.secret = 1;
    if (sp.type === 'B') { if (R.w + 1 < WORLDS.length && SAVE.wu < R.w + 2) { SAVE.wu = R.w + 2; d.unlockW = R.w + 1; } if (pr.t < 3 && R.tier === pr.t) pr.t++; }
    d.next = R.lv + 1 < LV ? R.lv + 1 : null;
  } else if (R.var) variantFinish(R, win, d);
  else if (R.mode === 'defense') defenseFinish(R, win, d);
  else if (R.mode === 'endless') { if (G.mapX) { const hm = SAVE.hi.maps || (SAVE.hi.maps = {}); if (R.score > (hm[G.mapX.k] || 0)) hm[G.mapX.k] = Math.round(R.score); } d.bonus = R.wave * 12; if (R.score > SAVE.hi.endless.score) { SAVE.hi.endless.score = Math.round(R.score); d.best = true; } SAVE.hi.endless.wave = Math.max(SAVE.hi.endless.wave, R.wave); }
  else if (R.mode === 'blitz') { d.bonus = Math.round(R.score / 40); if (R.score > SAVE.hi.blitz.score) { SAVE.hi.blitz.score = Math.round(R.score); d.best = true; } }
  else if (R.mode === 'rush') { d.bonus = win ? 800 : R.ri * 150; const sec = d.time; if (win && (!SAVE.hi.rush.time || sec < SAVE.hi.rush.time)) { SAVE.hi.rush.time = sec; d.best = true; } SAVE.hi.rush.boss = Math.max(SAVE.hi.rush.boss, R.ri + (win ? 0 : 0)); }
  if (R.assist) d.bonus = Math.round(d.bonus * .6);
  afterRun(R, win, d); try { progAfter(R, win, d); } catch (e) { console.error('prog', e); }
  const endDue = win && R.mode === 'expedition' && !R.var && R.spec && R.spec.type === 'B' && R.w === 14, showEnd = endDue && SET.story !== 'off' && (SET.story === 'always' || !SAVE.flags.ending);
  if (endDue) { SAVE.flags.ending = 1; d.ending = 1; }
  const crashDue = win && R.mode === 'expedition' && !R.var && R.spec && R.spec.type === 'B' && R.w === GLITCH_W && !SAVE.flags.crash;
  const tDue = win && R.mode === 'expedition' && !R.var && R.spec && R.spec.type === 'B' && R.w === 16, showTrue = tDue && SET.story !== 'off' && (SET.story === 'always' || !SAVE.flags.trueEnd);
  if (tDue) { SAVE.flags.trueEnd = 1; d.ending = 1; }
  SAVE.cores += d.bonus; SAVE.st.kills += R.kills; SAVE.st.runs++; SAVE.st.graze += R.graze; SAVE.st.combo = Math.max(SAVE.st.combo, R.maxCombo); if (win && (R.mode === 'expedition' || R.mode === 'rush')) SAVE.st.ranks[rk]++; saveGame();
  const go = () => UI.result(d);
  if (showEnd) setTimeout(() => playCut(endingPanels(), go, { music: 14 }), 600); else if (showTrue) setTimeout(() => playCut(TRUE_END(!!ST().ally), go, { music: 16 }), 600); else if (crashDue) setTimeout(() => crashIntro(() => { UI.hideAll(); startCrash(); }), 900); else setTimeout(go, win ? 300 : 100);
}
function exitToMenu(to) {
  G.mapX = null; retroOff(); crashOff(); BOSSES.length = BASE_BOSSES;
  G.pick = null; G.abTs = 0; G.slowUntil = 0; IN.ab = [0, 0]; clearMsgs(); document.body.classList.remove('lb'); G.inCombat = false; G.scene = 'ui'; G.paused = false; G.run = null; G.players = []; G.ent = { en: [], pb: [], eb: [], pk: [], pa: [], fl: [], bm: [], hz: [] }; $('hud').classList.remove('on'); $('touch').classList.remove('on'); $('coach').classList.remove('on'); $('hl').style.display = 'none'; $('boss').classList.remove('on');
  music.stop(); if (R3) { R3.reset(); R3.setView('menu'); } G.showCfg = null; saveGame(); UI.show(to || 'scMenu');
}
function togglePause() { if (G.net) { netPauseKey(); return; } if (!G.inCombat || !G.run || G.run.over || G.pick || G.cut || G.brief) return; G.paused = !G.paused; if (G.paused) { UI.pause(); SFX.click(); } else UI.resume(); }

// ---------- tutorial ----------
const TUT = [
  { t: 'WELCOME, PILOT', x: () => 'This is a 2-minute flight briefing. You can leave any time with SKIP.', btn: 1 },
  { t: 'MOVE', x: () => touchOn() ? (SET.scheme === 'stick' ? 'Use the LEFT STICK to fly. Fly around to continue.' : 'Drag your finger anywhere - the ship follows. Fly around to continue.') : 'Fly with WASD or the ARROW KEYS, or just move the MOUSE. Fly around to continue.' },
  { t: 'SHOOT', x: () => (touchOn() ? (SET.scheme === 'stick' ? 'Hold the red FIRE button' : 'Keep your finger down - the ship fires while you touch') : 'Hold SPACE or click and hold') + ' to shoot. Destroy the 3 target drones!', hl: '#hp0 .rw:nth-of-type(4)' },
  { t: 'PLASMA (YOUR AMMO)', x: () => 'Every shot burns PLASMA (the teal bar). At zero you only get a weak backup blaster. Enemies drop teal PLASMA CELLS - capsules inside a spinning bracket. Grab them!', hl: '#hp0 .rw:nth-of-type(4)' },
  { t: 'ENEMY FIRE', x: () => 'Glowing RED orbs with a dark core are ENEMY shots - they hurt. Your real hitbox is tiny, so weave between them. Destroy the 2 gunships.', hl: '#hp0 .rw:nth-of-type(2)' },
  { t: 'PICKUPS', x: () => 'Green cross = REPAIR hull. Blue shield = SHIELD. Gold hex = CORES (money). Orange bolt = OVERDRIVE (+50% damage). Collect all four.' },
  { t: 'RAMMING', x: () => 'Crash into a normal enemy and it explodes - but you take damage too. Shields soak it first. Ram the drone to see (or dodge it!).' },
  { t: 'WEAPONS', x: () => (touchOn() ? 'Tap GUN' : 'Press Q / E (or 1-6)') + ' to cycle weapons you own. Buy new guns in the SHOP and equip your favorite there.' },
  { t: 'YOUR ABILITY', x: () => 'Every hull has a special ABILITY on a cooldown - the yellow bar. Yours is ' + abilOf(G.players[0]).nm + ': ' + abilOf(G.players[0]).ds.toLowerCase() + ' ' + (touchOn() ? 'Tap the ABILITY button now.' : 'Press SHIFT or R now.'), hl: '#hp0 .rw:nth-of-type(5)' },
  { t: 'YOUR HOME BASE', x: () => 'After missions: SHOP = upgrades (each costs more than the last), HANGAR = custom ship parts and paint, EXPEDITION = 15 worlds. Tap PLAYERS for 2-player co-op.', btn: 1, last: 1 }
];
function coachShow(i) {
  const c = $('coach'), s = TUT[i]; c.classList.add('on');
  c.innerHTML = '<div class="ct"><span>' + s.t + '</span><span>' + (i + 1) + '/' + TUT.length + '</span></div><div class="cx">' + s.x() + '</div><div class="row sp"><div class="dots">' + TUT.map((_, k) => '<i class="' + (k < i ? 'd' : k === i ? 'on' : '') + '"></i>').join('') + '</div><div class="row"><button class="btn sm" data-act="tutskip">SKIP</button>' + (s.btn ? '<button class="btn sm big" data-act="tutnext">' + (s.last ? 'FINISH' : 'NEXT') + '</button>' : '') + '</div></div>';
  layoutHl(s.hl);
}
function layoutHl(sel) {
  const h = $('hl'); if (!sel) { h.style.display = 'none'; return; }
  const el = document.querySelector(sel); if (!el) { h.style.display = 'none'; return; }
  const r = el.getBoundingClientRect(); Object.assign(h.style, { display: 'block', left: r.left - 6 + 'px', top: r.top - 4 + 'px', width: r.width + 12 + 'px', height: r.height + 8 + 'px' });
}
function tutGo(i) {
  const R = G.run, T = R.tut, p = G.players[0]; T.step = i; T.t = 0; T.ok = false; T.picked = {}; T.rammed = false; T.abUsed = false; G.ent.en.length = 0; G.ent.eb.length = 0; coachShow(i);
  const E = G.ent.pk;
  if (i === 2) { T.kills0 = R.kills; for (let k = 0; k < 3; k++) mkEnemy('dummy', V.W * .72 + k * 60, V.H * (.3 + k * .2), {}).tx = 1; }
  if (i === 3) { p.am = p.mam * .12; E.push({ k: 'ammo', x: V.W * .75, y: p.y - 80, vx: -1, vy: 0, l: 1500 }, { k: 'ammo', x: V.W * .9, y: p.y + 60, vx: -1, vy: 0, l: 1500 }); }
  if (i === 4) { T.kills0 = R.kills; R.nodmg = false; for (let k = 0; k < 2; k++) mkEnemy('jet', V.W * .85 + k * 80, V.H * (.35 + k * .3)); G.ent.en.forEach(e => { e.hp = e.mhp = 18; e.fcd = 40 + e.x % 50; }); }
  if (i === 5) { ['hp', 'sh', 'core', 'od'].forEach((k, n) => E.push({ k, v: 5, x: V.W * (.6 + n * .08), y: V.H * (.25 + n * .17), vx: -.6, vy: 0, l: 1800 })); p.hp = p.mhp * .6; p.sh = 0; }
  if (i === 6) { const e = mkEnemy('drone', V.W + 40, p.y, {}); e.hp = e.mhp = 4; e.d = Object.assign({}, e.d, { f: null, ai: 'line', sp: 1.4 }); }
  if (i === 8) { p.abCd = 0; }
}
function tutTick(R) {
  const T = R.tut, p = G.players[0]; if (T.step < 0) { R.nodmg = true; tutGo(0); return; }
  T.t++; const s = TUT[T.step]; if (T.step === 0 || s.last) return;
  const E = G.ent.pk; let ok = false;
  if (T.step !== 3 && p.am < p.mam * .2) p.am = p.mam * .6;
  if (T.step === 1) { T.moved += Math.hypot(p.x - T.lx, p.y - T.ly); T.lx = p.x; T.ly = p.y; ok = T.moved > 900 && T.t > 90; }
  else if (T.step === 2) { ok = R.kills - T.kills0 >= 3; if (!G.ent.en.length && !ok) for (let k = 0; k < 3; k++) mkEnemy('dummy', V.W * .72 + k * 60, V.H * (.3 + k * .2), {}).tx = 1; }
  else if (T.step === 3) { ok = !!T.picked.ammo; if (!ok && !E.some(k => k.k === 'ammo')) E.push({ k: 'ammo', x: V.W + 20, y: clamp(p.y + rnd(-90, 90), 90, V.H - 90), vx: -1, vy: 0, l: 1500 }); }
  else if (T.step === 4) {
    const need = 2 - (R.kills - T.kills0); ok = need <= 0; if (p.hp < 25) p.hp = p.mhp;
    if (!ok && G.ent.en.filter(e => !e.dead).length < need) { const e = mkEnemy('jet', V.W + 40, V.H * rnd(.3, .7)); e.hp = e.mhp = 18; e.fcd = 50; }
  }
  else if (T.step === 5) {
    ok = T.picked.hp && T.picked.sh && T.picked.core && T.picked.od;
    ['hp', 'sh', 'core', 'od'].forEach((k, n) => { if (!T.picked[k] && !E.some(q => q.k === k)) E.push({ k, v: 5, x: V.W + 20 + n * 24, y: V.H * (.25 + n * .17), vx: -.6, vy: 0, l: 1800 }); });
  }
  else if (T.step === 6) {
    ok = R.kills - (T.k6 = T.k6 === undefined ? R.kills : T.k6) >= 1 || T.t > 600; if (T.t > 600) p.hp = p.mhp;
    if (!ok && !G.ent.en.some(e => !e.dead)) { const e = mkEnemy('drone', V.W + 40, p.y, {}); e.hp = e.mhp = 4; e.d = Object.assign({}, e.d, { f: null, ai: 'line', sp: 1.4 }); }
  }
  else if (T.step === 7) ok = T.t > 240;
  else if (T.step === 8) ok = !!T.abUsed || T.t > 1500;
  if (!ok && T.step >= 1 && T.t > 2700) ok = true; // never trap a player in a step
  if (ok && !T.ok) { T.ok = true; SFX.clear(); banner('NICE', '', false); setTimeout(() => { if (G.run === R && !R.over) tutGo(T.step + 1); }, 900); }
}
function tutFinish(skip) {
  const R = G.run; SAVE.tut = true; if (!skip) { SAVE.cores += 100; } saveGame(); $('coach').classList.remove('on'); $('hl').style.display = 'none';
  if (R) { R.over = true; G.inCombat = false; } exitToMenu('scMenu'); if (!skip) setTimeout(() => alertMsg('+100 CORES - GRADUATION BONUS'), 300);
}

// ---------- main update ----------
function update() {
  G.t++; bgOff += (G.scene === 'play' ? 1 : .35) * (G.scrollMul || 1);
  pollPads();
  if (G.scene !== 'play') { updParticles(); if (R3) R3.tick(); uiTick(); return; }
  const R = G.run; if (!R) return;
  if (G.netGuest) { netGuestUpdate(R); return; }
  if (G.paused || G.pick || G.cut || G.brief) return;
  if (G.freeze > 0) { G.freeze--; return; }
  if (R.over) { updParticles(); if (R3) R3.tick(); updPB(); updEB(); return; }
  stepRun(R);
  for (const p of G.players) updPlayer(p);
  for (const e of G.ent.en) { if (e.dead) continue; if (e.boss) updBoss(e); else updEnemy(e); }
  updPB(); ramCheck(); updEB(); updPickups(); updBeams();
  const en = G.ent.en; for (let i = en.length - 1; i >= 0; i--) if (en[i].dead) { if (en[i].boss && R.boss === en[i]) R.boss = null; en.splice(i, 1); }
  updParticles(); if (R3) R3.tick(); if (G.netHost) netHostTick(R);
  if (R.comboT > 0) R.comboT--; else R.combo = 0;
  if (G.abTs > 0) G.abTs--; if (R.gzT > 0) R.gzT--;
  if (G.shake > 0) G.shake--; if (G.hitT > 0) G.hitT--; if (G.flashT > 0) G.flashT--;
  if (G.t % 3 === 0) hudTick();
}

// ---------- render ----------
function render() {
  const dpr = V.dpr * V.s, play = G.scene === 'play';
  let sx = 0, sy = 0; if (G.shake > 0 && !SET.reduce) { const a = G.shakeA * Math.min(1, G.shake / 8); sx = (Math.random() - .5) * 2 * a; sy = (Math.random() - .5) * 2 * a; } else G.shakeA = 0;
  G.sx = sx; G.sy = sy;
  bg.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr); if (!(play && R3 && R3.bgActive)) drawBackdrop(bg, G.t); if (G.crash && play) drawDesktop(bg, G.t);
  fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, cvFx.width, cvFx.height); fx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
  if (R3) { try { R3.draw(G, V); r3err = 0; } catch (e) { console.error('R3', e); if (++r3err > 6) { R3.on = false; R3 = null; } } }
  const g = fx, t = G.t, use3 = R3 && R3.on;
  if (play) {
    if (!SET.reduce && (G.world === 2 || G.world === 6)) { // heat shimmer: slow wavy bands of hot air rising off the ground
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = 14; g.lineCap = 'round';
      for (let k = 0; k < 6; k++) { const y0 = V.H * (.38 + k * .11), ph = t * .02 + k * 1.7; g.strokeStyle = G.world === 6 ? 'rgba(251,146,60,.035)' : 'rgba(253,186,116,.03)'; g.beginPath();
        for (let x = 0; x <= V.W + 40; x += 40) { const y = y0 + Math.sin(x * .014 + ph) * 7 + Math.sin(x * .031 - ph * 1.6) * 3; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      g.restore();
    }
    for (const h of G.ent.hz) { if (h.k !== 'bolt') continue; if (h.tel > 0) { g.strokeStyle = 'rgba(217,249,157,' + (.18 + .22 * ((h.tel >> 2) & 1)) + ')'; g.lineWidth = 2; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(h.x, 0); g.lineTo(h.x, V.H); g.stroke(); g.setLineDash([]); } else { g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = '#d9f99d'; g.shadowBlur = 18; g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 5; g.beginPath(); g.moveTo(h.x, 0); for (let y = 24; y < V.H; y += 24) g.lineTo(h.x + rnd(-16, 16), y); g.lineTo(h.x, V.H); g.stroke(); g.strokeStyle = 'rgba(190,242,100,.5)'; g.lineWidth = 14; g.stroke(); g.restore(); } }
    for (const h of G.ent.hz) { if (h.k !== 'gey') continue; const hh = V.H * .72, y0 = h.top ? 0 : V.H - hh; if (h.tel > 0) { g.fillStyle = 'rgba(251,146,60,' + (.08 + .1 * ((h.tel >> 2) & 1)) + ')'; g.fillRect(h.x - 28, y0, 56, hh); g.fillStyle = 'rgba(251,191,36,.6)'; g.fillRect(h.x - 28, h.top ? 0 : V.H - 6, 56, 6); } else { const gr = g.createLinearGradient(0, h.top ? 0 : V.H, 0, h.top ? hh : V.H - hh); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.25, 'rgba(251,191,36,.85)'); gr.addColorStop(1, 'rgba(239,68,68,.0)'); g.fillStyle = gr; g.fillRect(h.x - 26 - Math.sin(t) * 3, y0, 52 + Math.sin(t) * 6, hh); } }
    g.globalCompositeOperation = 'lighter';
    for (const b of G.ent.bm) {
      if (b.k === 'beam') { if (!b.o) continue; if (b.tel > 0) { g.strokeStyle = rgba(b.c, .25 + .35 * ((b.tel >> 2) & 1)); g.lineWidth = 3; g.beginPath(); g.moveTo(b.o.x - b.o.w * .3, b.y); g.lineTo(0, b.y); g.stroke(); } else { const gr = g.createLinearGradient(0, b.y - b.h / 2, 0, b.y + b.h / 2); gr.addColorStop(0, rgba(b.c, 0)); gr.addColorStop(.35, rgba(b.c, .85)); gr.addColorStop(.5, 'rgba(255,255,255,.95)'); gr.addColorStop(.65, rgba(b.c, .85)); gr.addColorStop(1, rgba(b.c, 0)); g.fillStyle = gr; g.fillRect(0, b.y - b.h / 2, b.o.x - b.o.w * .3, b.h); } }
      else if (b.k === 'arc') { g.strokeStyle = 'rgba(147,197,253,' + b.l / b.l0 + ')'; g.lineWidth = 3; g.shadowColor = '#93c5fd'; g.shadowBlur = 10; g.beginPath(); g.moveTo(b.x, b.y); for (let i = 1; i < 5; i++) g.lineTo(b.x + (b.x2 - b.x) * i / 5 + rnd(-8, 8), b.y + (b.y2 - b.y) * i / 5 + rnd(-8, 8)); g.lineTo(b.x2, b.y2); g.stroke(); g.shadowBlur = 0; }
      else if (b.k === 'trail') { g.fillStyle = 'rgba(255,255,255,' + b.l / b.l0 * .5 + ')'; g.fillRect(b.x, b.y - 1.5, V.W, 3); }
    }
    g.globalCompositeOperation = 'source-over';
    for (const k of G.ent.pk) drawPickup(g, k, t);
    for (const e of G.ent.en) { if (!e.hide && (!use3 || !R3.has3D(e))) drawEnemy2D(g, e, t); }
    for (const e of G.ent.en) if (e.tagUntil > G.t && !e.dead && !e.hide && e.x < V.W - 10) drawTag(g, e);
    if (SET.weather !== false && !SET.reduce) drawWeather(g, t);
    if (G.world === GLITCH_W && !SET.reduce && G.t % 200 < 7) { g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? 'rgba(255,43,214,.16)' : 'rgba(34,211,238,.14)'; g.fillRect(0, Math.random() * V.H, V.W, 4 + Math.random() * 26); } g.restore(); }
    for (const p of G.players) if (p.alive && (!use3 || !R3.hasShip(p)) && !(p.inv > 0 && (t >> 2) & 1 && p.blink)) drawShip2D(g, p, t);
    if (use3) { for (const e of G.ent.en) if (e.hf > 0 && !e.hide && R3.has3D(e)) { g.globalCompositeOperation = 'lighter'; drawGlow(g, e.x, e.y, e.w * .7, '#ffffff', .22); g.globalCompositeOperation = 'source-over'; } }
    for (const p of G.players) { if (!p.alive) continue; if (p.inv > 0 && p.blink === false) { g.strokeStyle = 'rgba(56,189,248,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 36 + Math.sin(t * .3) * 2, 0, TAU); g.stroke(); } if (p.od > 0) { g.globalCompositeOperation = 'lighter'; drawGlow(g, p.x, p.y, 62, '#fb923c', .35 + Math.sin(t * .4) * .1); g.globalCompositeOperation = 'source-over'; } if (p.slow > 0) { g.strokeStyle = 'rgba(186,230,253,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 30, 0, TAU); g.stroke(); } if (G.coop || G.players.length > 1) { g.font = '800 10px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillStyle = p.id ? '#fb923c' : '#22d3ee'; g.fillText('P' + (p.id + 1), p.x, p.y - 38); } }
    drawMeta(g, t);
    for (const b of G.ent.pb) drawPB(g, b, t);
    for (const b of G.ent.eb) drawEB(g, b, t);
    // boss shield flash / enemy hp bars for elites
    for (const e of G.ent.en) { if (e.d.elite && !e.boss && e.hp < e.mhp) { const w = e.w * .7; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(e.x - w / 2, e.y - e.r - 14, w, 5); g.fillStyle = '#f43f5e'; g.fillRect(e.x - w / 2, e.y - e.r - 14, w * e.hp / e.mhp, 5); } }
    if (curHz() === 'pulse' && !SET.reduce) { const ph = G.t % 480; if (ph > 400) { const u = (ph - 400) / 80, x = V.W * (1.05 - u * 1.1); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(x - 70, 0, x + 70, 0); gr.addColorStop(0, 'rgba(103,232,249,0)'); gr.addColorStop(.5, 'rgba(165,243,252,' + (ph > 430 ? .32 : .14) + ')'); gr.addColorStop(1, 'rgba(103,232,249,0)'); g.fillStyle = gr; g.fillRect(x - 70, 0, 140, V.H); g.globalCompositeOperation = 'source-over'; } }
    // time warp ring
    if (curHz() === 'time' && !SET.reduce) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(253,224,71,' + (.06 + Math.abs(G.ts - 1) * .3) + ')'; g.lineWidth = 8; g.beginPath(); g.arc(V.W / 2, V.H / 2, Math.min(V.W, V.H) * (.35 + (G.ts - 1) * .3), 0, TAU); g.stroke(); g.globalCompositeOperation = 'source-over'; }
  }
  drawParticles(g);
  // overlays (DOM)
  const fl = $('flash'), low = play && G.players.some(p => p.alive && p.hp < p.mhp * .28), a = SET.flash ? Math.max(G.hitT / 14 * .85, low ? .16 + .1 * Math.sin(t * .15) : 0, (G.flashT || 0) / 30) : 0;
  const av = a.toFixed(2); if (fl._a !== av) { fl._a = av; fl.style.opacity = av; if (G.flashT > 0) fl.style.background = 'radial-gradient(ellipse at 50% 50%,rgba(255,255,255,.7),rgba(255,255,255,.95))'; else fl.style.background = ''; }
  const vg = $('vig'); if (vg._v !== SET.vig) { vg._v = SET.vig; vg.style.display = SET.vig ? 'block' : 'none'; }
}

// "NEW ENEMY" callout that follows an enemy the first time it shows up in a world's first sector
function drawTag(g, e) {
  const d = e.d, left = e.tagUntil - G.t, a = Math.min(1, left / 30, (240 - left) / 12), f = enemyFacts(e.id), l1 = 'NEW: ' + d.nm.toUpperCase(), l2 = f.slice(0, 2).join(' - ');
  g.save(); g.globalAlpha = Math.max(0, a); g.font = '800 11px ui-monospace, Menlo, Consolas, monospace'; const w1 = g.measureText(l1).width; g.font = '700 9px ui-monospace, Menlo, Consolas, monospace'; const w2 = g.measureText(l2).width;
  const w = Math.max(w1, w2) + 18, h = 34, x = clamp(e.x - w / 2, 8, V.W - w - 8), y = clamp(e.y - e.w * .6 - h - 14, 60, V.H - h - 8), col = d.elite ? '#c084fc' : '#22d3ee';
  g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.moveTo(clamp(e.x, x + 8, x + w - 8), y + h); g.lineTo(e.x, e.y - e.w * .45); g.stroke();
  g.fillStyle = 'rgba(4,10,22,.88)'; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, 7); else g.rect(x, y, w, h); g.fill(); g.stroke();
  g.fillStyle = col; g.font = '800 11px ui-monospace, Menlo, Consolas, monospace'; g.fillText(l1, x + 9, y + 14); g.fillStyle = '#cbd5e1'; g.font = '700 9px ui-monospace, Menlo, Consolas, monospace'; g.fillText(l2, x + 9, y + 27);
  g.restore();
}

// ---- foreground weather: drawn over the action, different in every world ----
const WX = { k: null, p: [] };
const WXK = { 2: 'sand', 5: 'snow', 6: 'ember', 7: 'bubble', 8: 'data', 12: 'rain', 1: 'spore', 13: 'ash', 15: 'pixel' };
function drawWeather(g, t) {
  const k = G.mapX ? ({ beach: 'spray', backrooms: 'dust', blocks: 'leaf', park: 'confetti', freeway: 'rain2', vapor: 'spark2', school: null, suburb: 'leaf', glitchcore: 'pixel' })[G.mapX.k] : WXK[G.world | 0];
  if (k !== WX.k) { WX.k = k; WX.p = []; } if (!k) return;
  const N = k === 'rain' ? 90 : k === 'snow' || k === 'sand' ? 70 : 34;
  while (WX.p.length < N) WX.p.push({ x: Math.random() * V.W, y: Math.random() * V.H, s: Math.random(), ph: Math.random() * 6 });
  g.save();
  if (k === 'sand') { const st = .5 + .5 * Math.sin(t * .006); g.fillStyle = 'rgba(194,120,60,' + (.04 + st * .08).toFixed(3) + ')'; g.fillRect(0, 0, V.W, V.H); } // sandstorm gusts dim the view
  if (k === 'snow') { const gr = g.createRadialGradient(V.W / 2, V.H / 2, V.H * .35, V.W / 2, V.H / 2, V.W * .7); gr.addColorStop(0, 'rgba(224,242,254,0)'); gr.addColorStop(1, 'rgba(224,242,254,.16)'); g.fillStyle = gr; g.fillRect(0, 0, V.W, V.H); } // frost creeping in
  for (const q of WX.p) {
    if (k === 'rain' || k === 'rain2') { q.x -= 7 + q.s * 5; q.y += 16 + q.s * 8; g.strokeStyle = k === 'rain' ? 'rgba(217,249,157,.32)' : 'rgba(186,230,253,.28)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x + 6, q.y - 16); g.stroke(); }
    else if (k === 'snow') { q.x -= 1.2 + q.s * 1.4 + Math.sin(t * .03 + q.ph); q.y += .8 + q.s * 1.2; g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(q.x, q.y, 1.2 + q.s * 2.2, 0, TAU); g.fill(); }
    else if (k === 'sand') { q.x -= 9 + q.s * 9; q.y += Math.sin(t * .05 + q.ph) * .6; g.fillStyle = 'rgba(253,186,116,.35)'; g.fillRect(q.x, q.y, 10 + q.s * 16, 1.4); }
    else if (k === 'ember' || k === 'spark2') { q.x -= 1.5 + q.s; q.y -= .8 + q.s * 1.4; g.fillStyle = k === 'ember' ? 'rgba(251,146,60,' + (.4 + .4 * Math.sin(t * .2 + q.ph)).toFixed(2) + ')' : 'rgba(255,110,199,.6)'; g.fillRect(q.x, q.y, 2.4, 2.4); }
    else if (k === 'bubble') { q.x -= 1 + q.s * .6; q.y -= .7 + q.s; g.strokeStyle = 'rgba(165,243,252,.45)'; g.lineWidth = 1; g.beginPath(); g.arc(q.x, q.y, 2 + q.s * 4, 0, TAU); g.stroke(); }
    else if (k === 'data' || k === 'pixel') { q.y += 3 + q.s * 3; q.x -= 1; g.fillStyle = k === 'data' ? 'rgba(74,222,128,.4)' : ['rgba(255,43,214,.45)', 'rgba(34,211,238,.45)'][q.ph > 3 ? 1 : 0]; g.fillRect(q.x, q.y, k === 'data' ? 2 : 4, k === 'data' ? 10 : 4); }
    else if (k === 'spore' || k === 'dust') { q.x -= .6 + q.s * .5; q.y += Math.sin(t * .02 + q.ph) * .4; g.fillStyle = k === 'spore' ? 'rgba(217,249,157,.4)' : 'rgba(255,243,196,.35)'; g.beginPath(); g.arc(q.x, q.y, 1.4 + q.s * 1.6, 0, TAU); g.fill(); }
    else if (k === 'ash') { q.x -= 3 + q.s * 3; q.y += 1 + q.s; g.fillStyle = 'rgba(168,162,158,.4)'; g.fillRect(q.x, q.y, 3, 2); }
    else if (k === 'leaf' || k === 'confetti') { q.x -= 1.6 + q.s * 1.6; q.y += .7 + Math.sin(t * .04 + q.ph) * .8; g.save(); g.translate(q.x, q.y); g.rotate(t * .05 + q.ph); g.fillStyle = k === 'leaf' ? ['rgba(234,88,12,.6)', 'rgba(250,204,21,.6)', 'rgba(101,163,13,.6)'][(q.ph * 10 | 0) % 3] : ['#f472b6', '#facc15', '#22d3ee', '#a78bfa'][(q.ph * 10 | 0) % 4]; g.fillRect(-3, -1.5, 6, 3); g.restore(); }
    else if (k === 'spray') { q.x -= 2 + q.s * 2; q.y -= Math.sin(t * .05 + q.ph) * .5; g.fillStyle = 'rgba(224,242,254,.4)'; g.beginPath(); g.arc(q.x, q.y, 1 + q.s * 1.4, 0, TAU); g.fill(); }
    if (q.x < -30 || q.y > V.H + 30 || q.y < -30) { q.x = V.W + Math.random() * 60; q.y = k === 'rain' || k === 'rain2' || k === 'data' || k === 'pixel' ? -20 + Math.random() * V.H * .3 : k === 'ember' || k === 'bubble' || k === 'spark2' ? V.H + 10 : Math.random() * V.H; if (k === 'rain' || k === 'rain2') q.x = Math.random() * V.W * 1.3; }
  }
  g.restore();
}
