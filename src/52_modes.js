// ================= MODES: daily challenge, station defense, no-hit run, the vault, assist + death hints =================

// ---------- daily challenge ----------
const DMODS = [
  { id: 'glass', nm: 'GLASS CANNON', ds: 'Your hull and shield are halved. Your damage is up 70%.', ap: R => { G.players.forEach(p => { p.mhp = Math.round(p.mhp * .5); p.hp = p.mhp; p.msh = Math.round(p.msh * .5); p.sh = p.msh; p.st.dmg *= 1.7; }); } },
  { id: 'swarm', nm: 'SWARM', ds: 'Far more enemies, but each one is 35% weaker.', ap: R => { R.hpm *= .65; R.swarm = 1.6; } },
  { id: 'iron', nm: 'IRON HIDE', ds: 'Enemies have 70% more health and drop 50% more cores.', ap: R => { R.hpm *= 1.7; G.players.forEach(p => { p.mod.loot += .5; }); } },
  { id: 'overdrive', nm: 'OVERDRIVE', ds: 'You fire 25% faster. Enemy shots hurt 30% more.', ap: R => { R.edm *= 1.3; G.players.forEach(p => { p.st.rate *= 1.25; }); } },
  { id: 'lowpwr', nm: 'LOW POWER', ds: 'Plasma capacity is halved, but kills drop far more ammo.', ap: R => { G.players.forEach(p => { p.mam = Math.round(p.mam * .5); p.am = p.mam; }); R.ammoDrop = 2.2; } },
  { id: 'chrono', nm: 'CHRONO', ds: 'Abilities recharge 2.5x faster. Enemies are 25% tougher.', ap: R => { R.hpm *= 1.25; G.players.forEach(p => { p.mod.cdr *= .4; }); } },
  { id: 'plated', nm: 'PLATED', ds: 'You take 30% less damage. Waves are 30% larger.', ap: R => { R.swarm = 1.3; G.players.forEach(p => { p.mod.arm *= .7; }); } }
];
const dayKey = d => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function dailyInfo(key) {
  key = key || dayKey(); const seed = hashStr('aetheria-' + key), n = Math.max(1, Math.min(SAVE.wu, WORLDS.length));
  return { key, seed, w: seed % n, lv: 6 + (seed >>> 8) % 6, mod: DMODS[(seed >>> 4) % DMODS.length] };
}
function startDaily() { const di = dailyInfo(), o = { mode: 'expedition', var: 'daily', w: di.w, lv: di.lv, tier: 1, co: SAVE.players === 2, daily: di }; G.last = o; beginRun(o); }
function pruneDaily() { const dl = SAVE.dl; for (const k of ['best', 'done']) Object.keys(dl[k]).sort().reverse().slice(14).forEach(x => { delete dl[k][x]; }); }
function dailyStreakNow() { const dl = SAVE.dl, t = dayKey(), y = new Date(); y.setDate(y.getDate() - 1); return dl.last === t || dl.last === dayKey(y) ? dl.streak : 0; }

// ---------- run variants (daily / no-hit / vault are flavoured expeditions) ----------
function setupVariant(R, o) {
  if (o.var === 'hardcore') return setupHardcore(R);
  if (o.var === 'versus') return setupVersus(R);
  const sp = R.spec; if (!sp) return;
  if (o.var === 'gallery') return setupGallery(R, o);
  if (o.var === 'retro') return setupRetro(R);
  if (o.var === 'chal') return setupChal(R, o);
  if (o.var === 'custom') return setupCustom(R, o);
  if (o.var === 'crash') return setupCrash(R, o);
  if (o.var === 'daily') { const di = o.daily || dailyInfo(); R.dinfo = di; R.rng = seeded(di.seed); sp.type = 'B'; sp.waves = R.waves = 5; sp.name = 'Daily Challenge'; R.hazMode = false; di.mod.ap(R); }
  else if (o.var === 'nohit') { sp.type = 'B'; sp.waves = R.waves = 2; sp.name = 'No-Hit Run'; R.hazMode = false; }
  else if (o.var === 'vault') { sp.type = 'B'; sp.waves = R.waves = 6; sp.name = 'The Vault'; R.hazMode = false; R.bmul = 1.1; R.hpm = Math.max(R.hpm, 1.15 + R.w * .08); }
}
function applyAssist() { G.players.forEach(p => { p.mhp = Math.round(p.mhp * 1.4); p.hp = p.mhp; p.msh = Math.round(p.msh * 1.4); p.sh = p.msh; }); }
function varObj(R) { if (R.var === 'custom' || R.var === 'crash') return (R.var === 'crash' ? 'AETHEROS' : (R.cust.nm || 'CUSTOM').toUpperCase()) + (R.stage === 'boss' ? ' - BOSS' : ' - WAVE ' + Math.min(R.wave + 1, R.waves) + '/' + R.waves); if (R.var === 'versus') { const a = G.players[0], b = G.players[1], s = Math.max(0, Math.ceil(R.vs.time / 60)); return 'VERSUS ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' - P1 ' + fmt(Math.round(a ? a.score : 0)) + ' vs P2 ' + fmt(Math.round(b ? b.score : 0)); } if (R.var === 'chal') return 'CHALLENGE ' + R.chal.code + ' - WAVE ' + Math.min(R.wave + 1, R.waves) + '/' + R.waves + ' - BEAT ' + fmt(R.chal.target); if (R.var === 'hardcore') return 'HARDCORE - SECTOR ' + R.hc.sect + ' - WAVE ' + (R.wave + 1) + ' - ' + WORLDS[R.w].nm.toUpperCase(); if (R.var === 'gallery') return 'REMATCH' + (R.gmods.length ? ' - ' + R.gmods.map(k => GMODS[k].nm).join(' + ') : ''); const w = Math.min(R.wave + 1, R.waves), tag = R.var === 'daily' ? 'DAILY' : R.var === 'nohit' ? 'NO-HIT' : R.var === 'retro' ? '1-UP' : 'VAULT'; return tag + (R.stage === 'boss' ? ' - BOSS' : ' - WAVE ' + w + '/' + R.waves) + (R.var === 'daily' && R.dinfo ? ' - ' + R.dinfo.mod.nm : '') + (R.assist ? ' - ASSIST' : ''); }
function varBanner(R) { if (R.var === 'daily') banner('DAILY CHALLENGE', R.dinfo ? R.dinfo.mod.nm : ''); else if (R.var === 'nohit') banner('NO-HIT RUN', 'ONE HIT ENDS IT'); else if (R.var === 'crash') banner('AETHEROS', 'THE GAME CRASHED. YOU DID NOT.', false); else if (R.var === 'custom') banner((R.cust.nm || 'CUSTOM LEVEL').toUpperCase(), 'CUSTOM LEVEL', false); else if (R.var === 'versus') banner('VERSUS', 'MOST POINTS IN 2 MINUTES WINS', false); else if (R.var === 'chal') banner('CHALLENGE', R.chal.target ? 'SCORE TO BEAT: ' + fmt(R.chal.target) : R.chal.code, false); else if (R.var === 'hardcore') banner('HARDCORE', 'ONE LIFE. NO SECOND CHANCES.'); else if (R.var === 'gallery') banner('REMATCH', BOSSES[R.w].nm.toUpperCase() + (R.gmods.length ? ' - x' + galleryMult(R.gmods).toFixed(1) + ' REWARDS' : ''), true); else if (R.var === 'retro') banner('1-UP', 'PRESS START', false); else banner('THE VAULT', 'GOLD EVERYWHERE. STAY SHARP.'); }

function variantFinish(R, win, d) {
  const v = R.var;
  if (v === 'hardcore') return hcFinish(R, win, d);
  if (v === 'versus') return versusFinish(R, win, d);
  if (v === 'chal') return chalFinish(R, win, d);
  if (v === 'custom') return customFinish(R, win, d);
  if (v === 'crash') return crashFinish(R, win, d);
  if (v === 'gallery') return galleryFinish(R, win, d);
  if (v === 'retro') { d.name = '1-UP: Retro Run'; d.bonus = win ? 2500 : R.wave * 100; if (win && !R.assist) SAVE.flags.retro = 1; return; }
  if (v === 'daily') {
    const di = R.dinfo || dailyInfo(), dl = SAVE.dl; d.name = 'Daily Challenge'; d.dkey = di.key;
    d.bonus = win ? Math.round(160 + R.score / 60) : Math.round(R.score / 120);
    if (!R.assist) {
      if (R.score > (dl.best[di.key] || 0)) { dl.best[di.key] = Math.round(R.score); d.best = true; }
      if (win && dl.last !== di.key) { const y = new Date(); y.setDate(y.getDate() - 1); dl.streak = dl.last === dayKey(y) ? dl.streak + 1 : 1; dl.last = di.key; dl.done[di.key] = 1; d.streak = dl.streak; d.bonus += 100 + 25 * Math.min(dl.streak, 10); d.first = true; }
    }
    pruneDaily();
  } else if (v === 'nohit') {
    d.name = 'No-Hit Run'; d.bonus = win ? 300 + 140 * R.w : 30 * R.wave; if (win && !R.assist) SAVE.hi.nohit[R.w] = 1;
  } else if (v === 'vault') {
    d.name = 'The Vault'; d.bonus = win ? 1200 : R.wave * 70;
    if (!R.assist) { if (R.score > SAVE.hi.vault.score) { SAVE.hi.vault.score = Math.round(R.score); d.best = true; } if (win) { SAVE.hi.vault.clears++; F_vault(d); } }
  }
}
function F_vault(d) { SAVE.flags.vault = 1; if (!SAVE.unl.aegis) unlockHull('aegis', d); }
function defenseFinish(R, win, d) {
  const s = R.stn; d.name = 'Station Defense'; d.stn = Math.round(s.hp / s.mhp * 100); d.lost = !!R.lost;
  d.bonus = R.wave * 45 + (win ? 500 + Math.round(s.hp / s.mhp * 500) : 0);
  if (!R.assist) { if (R.score > SAVE.hi.def.score) { SAVE.hi.def.score = Math.round(R.score); d.best = true; } SAVE.hi.def.wave = Math.max(SAVE.hi.def.wave, R.wave + (win ? 1 : 0)); }
}
function unlockHull(id, d) {
  if (SAVE.unl[id]) return; SAVE.unl[id] = 1; SAVE.pl.forEach(pl => { if (pl.own.hull.indexOf(id) < 0) pl.own.hull.push(id); });
  if (d) d.unlock = PARTS.hull[id].nm.toUpperCase();
  toast('NEW SHIP UNLOCKED', PARTS.hull[id].nm.toUpperCase() + ' is waiting in your hangar', '#fbbf24');
}
// bookkeeping at the end of every run: stats, flags, per-sector fail streaks
function afterRun(R, win, d) {
  const S = SAVE, F = S.flags, st = S.st;
  st.time += d.time; if (win) st.wins++; else st.deaths++;
  if (R.mode !== 'training' && R.mode !== 'tutorial') st.bosses += R.bossDown | 0;
  const hh = G.players[0] ? G.players[0].cfg.hull : 'falcon'; st.hull[hh] = (st.hull[hh] | 0) + 1;
  if (R.assist) return;
  if (R.mode === 'expedition' && !R.var) { const k = R.w + ':' + R.lv + ':' + R.tier; if (win) delete S.fails[k]; else S.fails[k] = (S.fails[k] | 0) + 1; d.fails = S.fails[k] | 0; }
  if (win && R.bossDown && R.hurt === 0 && R.mode !== 'training') F.untouch = 1;
  if (win && R.low !== undefined && R.low <= .1 && R.mode !== 'training') F.close = 1;
  if (win && G.players.length > 1) F.coop = 1;
  if (win && R.var === 'nohit') { F.nohit = 1; unlockHull('wraith', d); }
  if (R.mode === 'defense' && win) F.defwin = 1;
  if (R.var === 'daily' && win) F.daily = 1;
  if (G.players.some(p => Object.keys(p.cards).length >= 8)) F.deck8 = 1;
}
const HINTS = {
  b: ['Enemy shots are slower than you. Slide sideways early instead of at the last second.', 'Stay on the left side of the screen. You get more time to read patterns before shots reach you.', 'Passing close to a shot (a graze) charges your ability and adds bonus score.', 'Use your ability (Shift / R / X or the ability button) to bail out of tight spots.'],
  ram: ['Touching an enemy hurts. Shoot them before they get close, or dash through small ones.', 'Tough ships take many hits. A piercing or heavy gun clears them faster.'],
  beam: ['Beams show a thin warning line first. Leave that lane before it fires.'],
  geyser: ['Lava geysers show a red warning column. Stay out of it until it fades.'],
  bolt: ['Lightning shows a flickering dotted line first. Slide out of that column before it strikes.'],
  boss: ['Bosses have a glowing weak point. Shoot it to break their armor and stagger them.', 'Save your ability for the boss. Time slow or the shock bomb can turn a fight.', 'Boss attacks change each phase. Learn the first one, then adapt.'],
  nohit: ['Take it slow. In a No-Hit run the safest spot is usually the middle-left of the screen.']
};
function hintFor(d) {
  const k = d.mode === 'nohit' ? 'nohit' : d.hadBoss ? 'boss' : d.killer, arr = HINTS[k] || HINTS.b;
  return arr[((SAVE.st.deaths | 0) + (d.fails | 0)) % arr.length];
}

// ---------- station defense ----------
const STN_X = 62;
function mkStation() { return { hp: 600, mhp: 600, sh: 240, msh: 240, hf: 0, rg: 0, dead: false }; }
function stnHit(R, dmg, x, y) {
  const s = R.stn; if (!s || s.dead || R.over || G.god) return;
  dmg = Math.max(1, Math.round(dmg * (R.assist ? .65 : 1))); s.rg = 240; s.hf = 8;
  if (s.sh > 0) { const a = Math.min(s.sh, dmg); s.sh -= a; dmg -= a; spark(STN_X + 8, y, 3, '#7dd3fc', 3, 12, 2); if (s.sh <= 0) { ftext(86, y, 'SHIELD DOWN', '#38bdf8', 11); shake(3, 8); } }
  if (dmg > 0) { s.hp -= dmg; spark(40, y, 5, '#fb923c', 4, 20, 3); smoke(40, y, 1, 12); shake(2, 5); SFX.hurt(); }
  if (s.hp <= 0) { s.hp = 0; s.dead = true; stationLost(R); }
}
function stationLost(R) {
  if (R.stage === 'dead' || R.stage === 'clear') return; R.stage = 'dead'; R.st = 0; R.lost = 1; banner('STATION LOST', ''); music.stop();
  boom2D(30, V.H / 2, 160, '#f97316'); shock(30, V.H / 2, '#ffffff', 420, 34); shake(18, 40); G.freeze = 10; SFX.boom(true);
}
function stnRam(e) { const R = G.run; e.dead = true; e.esc = true; boom2D(e.x, e.y, e.w * .7, '#f97316'); SFX.boom(); stnHit(R, 7 + e.d.cost * 5 + (e.d.elite ? 22 : 0), e.x, e.y); }
function stnRepair(R) { const s = R.stn; if (s.dead) return; s.hp = Math.min(s.mhp, s.hp + s.mhp * .15); s.sh = s.msh; ftext(100, V.H / 2, 'STATION REPAIRED', '#4ade80', 13); SFX.power(); }
function updStation(R) {
  const s = R.stn; if (s.hf > 0) s.hf--; if (s.rg > 0) s.rg--; else if (s.sh < s.msh && !s.dead) s.sh = Math.min(s.msh, s.sh + .3);
  if (s.hp < s.mhp * .35 && !s.dead && G.t % 14 === 0) { smoke(rnd(10, 50), rnd(80, V.H - 80), 1, 24); spark(rnd(10, 50), rnd(80, V.H - 80), 2, '#fb923c', 2, 16, 2); }
}
function drawStation(g, t, R) {
  const s = R.stn, H = V.H, f = s.hf > 0 ? 1 : 0, hpF = s.hp / s.mhp, shF = s.sh / s.msh;
  g.save();
  const gr = g.createLinearGradient(0, 0, 46, 0); gr.addColorStop(0, '#05080f'); gr.addColorStop(.55, '#1e293b'); gr.addColorStop(1, '#475569'); g.fillStyle = gr; g.fillRect(-6, 0, 52, H);
  g.fillStyle = 'rgba(148,163,184,.18)'; for (let y = 24; y < H; y += 46) g.fillRect(-6, y, 52, 2);
  for (let y = 40; y < H; y += 46) { const on = ((t >> 5) + (y >> 4)) % 5 !== 0; g.fillStyle = on ? 'rgba(253,224,71,.8)' : 'rgba(80,60,20,.7)'; g.fillRect(8, y, 6, 4); g.fillRect(20, y, 6, 4); }
  // docking spire in the middle
  g.fillStyle = '#334155'; g.beginPath(); g.moveTo(40, H / 2 - 74); g.lineTo(74, H / 2 - 26); g.lineTo(74, H / 2 + 26); g.lineTo(40, H / 2 + 74); g.closePath(); g.fill();
  g.strokeStyle = '#94a3b8'; g.lineWidth = 2; g.stroke();
  const blink = (t >> 4) & 1; g.fillStyle = blink ? '#ef4444' : '#7f1d1d'; g.beginPath(); g.arc(72, H / 2 - 24, 3.5, 0, TAU); g.fill(); g.fillStyle = blink ? '#7f1d1d' : '#22c55e'; g.beginPath(); g.arc(72, H / 2 + 24, 3.5, 0, TAU); g.fill();
  if (hpF < 1) { g.fillStyle = 'rgba(0,0,0,' + (1 - hpF) * .45 + ')'; g.fillRect(-6, 0, 52, H); }
  // shield dome
  if (shF > 0 || f) {
    g.globalCompositeOperation = 'lighter'; const a = .12 + .32 * shF + f * .4; g.strokeStyle = 'rgba(56,189,248,' + a + ')'; g.lineWidth = 3 + f * 4; g.shadowColor = '#38bdf8'; g.shadowBlur = 14;
    g.beginPath(); g.ellipse(0, H / 2, STN_X + 14, H * .62, 0, -PI / 2, PI / 2); g.stroke();
    g.fillStyle = 'rgba(56,189,248,' + (.03 + .07 * shF + f * .12) + ')'; g.beginPath(); g.ellipse(0, H / 2, STN_X + 14, H * .62, 0, -PI / 2, PI / 2); g.fill();
  }
  g.restore();
}
// vault enemies shimmer gold; other mode flourishes
function drawModes(g, t) {
  const R = G.run; if (!R) return;
  if (R.stn) drawStation(g, t, R);
  if (R.var === 'vault') { g.globalCompositeOperation = 'lighter'; for (const e of G.ent.en) if (e.gold && !e.dead && !e.hide) drawGlow(g, e.x, e.y, e.w * (e.boss ? .55 : .75), '#fbbf24', .3 + Math.sin(t * .15 + e.x) * .08); g.globalCompositeOperation = 'source-over'; }
}
