// ================= META: run cards, hull abilities, wingmen, weapon levels, boss weak points, graze + rank =================

// ---------- run cards: power-ups that last for one run ----------
const RAR = [{ nm: 'COMMON', c: '#94a3b8' }, { nm: 'UNCOMMON', c: '#38bdf8' }, { nm: 'RARE', c: '#fbbf24' }];
const newMod = () => ({ arm: 1, home: 0, pierce: 0, multi: 0, crit: 0, chain: 0, blast: 0, regen: 0, burst: 0, vamp: 0, orb: 0, ramc: 0, second: 0, cdr: 1, graze: 0, xdr: 0, loot: 0 });
const CARDS = {
  dmg: { nm: 'Hot Rounds', ds: '+15% weapon damage', rar: 0, max: 5, ic: 'dmg', ap: p => { p.st.dmg *= 1.15; } },
  rate: { nm: 'Overclock', ds: '+12% fire rate', rar: 0, max: 4, ic: 'rate', ap: p => { p.st.rate *= 1.12; } },
  spd: { nm: 'Afterburners', ds: '+10% flight speed', rar: 0, max: 3, ic: 'spd', ap: p => { p.st.spd *= 1.1; } },
  hull: { nm: 'Plating Patch', ds: '+25 max hull and repair 25 now', rar: 0, max: 4, ic: 'hp', ap: p => { p.mhp += 25; p.hp = Math.min(p.mhp, p.hp + 25); } },
  shld: { nm: 'Shield Booster', ds: '+25 max shield, recharged now', rar: 0, max: 4, ic: 'sh', ap: p => { p.msh += 25; p.sh = p.msh; } },
  plas: { nm: 'Plasma Cells', ds: '+35 max plasma and a full refill', rar: 0, max: 4, ic: 'am', ap: p => { p.mam += 35; p.am = p.mam; } },
  mag: { nm: 'Gravity Well', ds: '+40% pickup magnet range', rar: 0, max: 3, ic: 'mag', ap: p => { p.st.mag *= 1.4; } },
  armr: { nm: 'Reactive Plating', ds: 'Take 12% less damage', rar: 0, max: 3, ic: 'armor', ap: p => { p.mod.arm *= .88; } },
  loot: { nm: 'Salvage Beacon', ds: '+25% cores from kills', rar: 0, max: 3, ic: 'coin', ap: p => { p.mod.loot += .25; } },
  home: { nm: 'Seeker Rounds', ds: 'Your bolts curve toward enemies', rar: 1, max: 3, ic: 'home', ap: p => { p.mod.home++; } },
  prc: { nm: 'Piercing Bolts', ds: 'Bolts punch through 1 more enemy', rar: 1, max: 3, ic: 'pierce', ap: p => { p.mod.pierce++; } },
  mult: { nm: 'Extra Barrels', ds: '+2 side shots with every volley', rar: 1, max: 2, ic: 'multi', ap: p => { p.mod.multi++; } },
  crit: { nm: 'Lucky Shots', ds: '+12% chance for triple damage', rar: 1, max: 3, ic: 'star', ap: p => { p.mod.crit += .12; } },
  chn: { nm: 'Static Charge', ds: 'Bolts arc to a nearby enemy', rar: 1, max: 2, ic: 'chain', ap: p => { p.mod.chain++; } },
  blst: { nm: 'Explosive Tips', ds: 'Bolts burst on impact', rar: 1, max: 3, ic: 'blast', ap: p => { p.mod.blast++; } },
  regn: { nm: 'Nano Repair', ds: 'Slowly regenerate hull', rar: 1, max: 3, ic: 'regen', ap: p => { p.mod.regen++; } },
  bst: { nm: 'Shield Burst', ds: 'A breaking shield blasts enemy fire away', rar: 1, max: 2, ic: 'ring', ap: p => { p.mod.burst++; } },
  vamp: { nm: 'Life Siphon', ds: 'Kills heal your hull', rar: 1, max: 3, ic: 'drop', ap: p => { p.mod.vamp++; } },
  orb: { nm: 'Orbit Drone', ds: 'A drone circles you, blocking shots', rar: 1, max: 3, ic: 'orbit', ap: p => { p.mod.orb++; } },
  ramc: { nm: 'Ram Plating', ds: 'Ramming hurts 25% less and hits harder', rar: 1, max: 2, ic: 'ram', ap: p => { p.mod.ramc++; } },
  sec: { nm: 'Second Wind', ds: 'Survive one lethal hit this run', rar: 2, max: 1, ic: 'heart', ap: p => { p.mod.second++; } },
  cdr: { nm: 'Chrono Core', ds: 'Ability recharges 25% faster', rar: 2, max: 3, ic: 'clock', ap: p => { p.mod.cdr *= .75; } },
  grz: { nm: 'Graze Reactor', ds: 'Grazing recharges your ability and plasma', rar: 2, max: 2, ic: 'graze', ap: p => { p.mod.graze++; } },
  nova: { nm: 'Nova Heart', ds: '+30% damage, +20% fire rate, -20% max hull', rar: 2, max: 1, ic: 'nova', ap: p => { p.st.dmg *= 1.3; p.st.rate *= 1.2; p.mhp = Math.round(p.mhp * .8); p.hp = Math.min(p.hp, p.mhp); } },
  wing: { nm: 'Phantom Wingman', ds: 'A wingman fights beside you this run', rar: 2, max: 2, ic: 'wing', ap: p => { p.mod.xdr++; } }
};
function rollCards(p, n) {
  const pool = [], R = G.run, bias = 1 + (R ? R.w * .04 + (R.tier - 1) * .25 : 0);
  for (const id in CARDS) { const c = CARDS[id], have = p.cards[id] | 0; if (have >= c.max) continue; pool.push([id, [10, 5 * bias, 2 * bias][c.rar] * (have ? .6 : 1)]); }
  const out = [];
  while (out.length < n && pool.length) {
    let tot = 0; for (const q of pool) tot += q[1];
    let r = Math.random() * tot, k = 0; for (; k < pool.length - 1; k++) { r -= pool[k][1]; if (r <= 0) break; }
    out.push(pool[k][0]); pool.splice(k, 1);
  }
  return out;
}
function advancePick() { // moves to the next pilot that still has cards to offer
  const K = G.pick; K.rr = 0;
  while (++K.who < G.players.length) { const o = rollCards(G.players[K.who], 3); if (o.length) { K.opts = o; return true; } }
  return false;
}
function offerCards() {
  if (!G.run || !G.players.length) return false;
  G.pick = { who: -1, opts: [], rr: 0 };
  if (!advancePick()) { G.pick = null; return false; }
  IN.ab[0] = IN.ab[1] = 0; clearMsgs(); UI.show('scCards', true); SFX.clear(); return true;
}
function endPick() { if (advancePick()) UI.refresh(); else { G.pick = null; UI.hideAll(); } }
function pickCard(i) {
  const K = G.pick; if (!K) return; const id = K.opts[i], p = G.players[K.who]; if (!id || !p) return;
  const c = CARDS[id]; c.ap(p); p.cards[id] = (p.cards[id] | 0) + 1; SAVE.st.cards++; SFX.power();
  shock(p.x, p.y, RAR[c.rar].c, 130, 26); ftext(p.x, p.y - 34, c.nm.toUpperCase(), RAR[c.rar].c, 12); saveGame();
  endPick();
}
function cardsDue(R, st, force) {
  if (SET.cards === false || G.net) return false;
  if (force) return true;
  if (R.mode === 'expedition') return st === 'boss' || R.wave === 1 || R.wave === 3 || R.wave === 5;
  if (R.mode === 'endless') return st === 'wave' && R.wave > 0 && R.wave % 3 === 0 && R.wave % 10 !== 0;
  if (R.mode === 'defense') return st === 'wave' && R.wave > 0 && R.wave % 2 === 0 && R.wave < R.waves;
  return false;
}

// ---------- hull abilities (one per hull, on a cooldown) ----------
const ABIL = {
  falcon: { id: 'dash', nm: 'DASH', cd: 210, ds: 'Burst of speed. Ignores damage and smashes small enemies.' },
  vanguard: { id: 'wall', nm: 'AEGIS WALL', cd: 540, ds: 'A barrier ahead of you blocks enemy fire for 3 seconds.' },
  phantom: { id: 'slow', nm: 'TIME SLOW', cd: 640, ds: 'Enemies and their shots slow to 40% for 3 seconds.' },
  titan: { id: 'bomb', nm: 'SHOCK BOMB', cd: 900, ds: 'Erases every enemy shot and blasts all enemies.' },
  nova: { id: 'ovl', nm: 'OVERLOAD', cd: 720, ds: 'Double fire rate and piercing bolts for 4 seconds.' },
  wraith: { id: 'phase', nm: 'PHASE SHIFT', cd: 600, ds: 'Turn intangible for 1.7 seconds: shots and enemies pass through you and you fly faster.' },
  ronin: { id: 'slash', nm: 'CRESCENT', cd: 420, ds: 'Lunge forward and cut a giant arc that deletes enemy shots and slices everything in it.' },
  hive: { id: 'swarm', nm: 'SWARM', cd: 600, ds: 'Launch eight kamikaze drones that hunt down enemies.' },
  longbow: { id: 'deadeye', nm: 'DEADEYE', cd: 660, ds: 'Rail shots hit the four toughest enemies on screen instantly.' },
  aegis: { id: 'reflect', nm: 'REFLECTOR', cd: 780, ds: 'A mirror field for 2.5 seconds turns nearby enemy shots into your shots.' }
};
const abilOf = p => ABIL[p.cfg.hull] || ABIL.falcon;
function useAbility(p) {
  const R = G.run; if (!p || !p.alive || p.abCd > 0 || G.pick || G.paused || !R || R.over) return false;
  const A = abilOf(p); p.abCd = p.abMax = Math.max(60, Math.round(A.cd * p.mod.cdr)); SFX.abil(); haptic(25); if (R.tut) R.tut.abUsed = true;
  switch (A.id) {
    case 'dash': { let dx = p.lmx, dy = p.lmy; const m = Math.hypot(dx, dy); if (m < .2) { dx = 1; dy = 0; } else { dx /= m; dy /= m; } p.dvx = dx * 17; p.dvy = dy * 17; p.dashT = 11; p.inv = Math.max(p.inv, 26); p.blink = false; shock(p.x, p.y, '#a5f3fc', 80, 18); break; }
    case 'wall': p.wallT = 180; shock(p.x + 54, p.y, '#38bdf8', 120, 20); break;
    case 'slow': G.abTs = 190; shock(p.x, p.y, '#7dd3fc', 520, 44); shock(p.x, p.y, '#e0f2fe', 280, 32); break;
    case 'bomb': {
      G.flashT = 12; shake(14, 26); shock(p.x, p.y, '#ffffff', 760, 36); shock(p.x, p.y, '#fbbf24', 480, 30);
      for (const e of G.ent.en) { if (e.dead || e.x > V.W + 20) continue; hurtEnemy(e, e.boss ? e.mhp * .035 : 22 + e.mhp * .25, { own: p.id }); }
      for (const q of G.ent.eb) spark(q.x, q.y, 2, '#fde047', 3, 14, 2); G.ent.eb.length = 0; break;
    }
    case 'ovl': p.ovl = 260; shock(p.x, p.y, '#fb923c', 120, 24); break;
    case 'phase': p.phaseT = 100; p.inv = Math.max(p.inv, 100); p.blink = false; shock(p.x, p.y, '#c4b5fd', 90, 20); break;
    case 'slash': ronSlash(p); break;
    case 'swarm': hiveSwarm(p); break;
    case 'deadeye': bowDeadeye(p); break;
    case 'reflect': p.reflT = 150; shock(p.x, p.y, '#7dd3fc', 120, 22); break;
  }
  return true;
}
function shieldBurst(p) { // card: breaking shield blows enemy fire away
  const r = 130 + 45 * p.mod.burst; p.bcd = 480; shock(p.x, p.y, '#38bdf8', r * 1.7, 28); shock(p.x, p.y, '#ffffff', r, 18); SFX.power();
  const eb = G.ent.eb; for (let i = eb.length - 1; i >= 0; i--) { const q = eb[i]; if ((q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y) < r * r) { spark(q.x, q.y, 2, '#7dd3fc', 3, 12, 2); eb.splice(i, 1); } }
  for (const e of G.ent.en) if (!e.dead && !e.hide && Math.hypot(e.x - p.x, e.y - p.y) < r + e.r) hurtEnemy(e, 12 * p.mod.burst + e.mhp * .04, { own: p.id });
}

// ---------- per-pilot upkeep: cooldowns, regen, wingmen, orbit drones ----------
function updMeta(p) {
  if (p.abCd > 0) p.abCd--; if (p.wallT > 0) p.wallT--; if (p.ovl > 0) p.ovl--; if (p.gzc > 0) p.gzc--; if (p.bcd > 0) p.bcd--;
  if (p.mod.regen && p.hp < p.mhp) p.hp = Math.min(p.mhp, p.hp + p.mod.regen * .015);
  if (p.phaseT > 0) { p.phaseT--; p.inv = Math.max(p.inv, 3); p.blink = false; }
  if (p.reflT > 0) { p.reflT--; const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j]; if ((q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y) < 96 * 96) { pb(p, q.x, q.y, -q.vx * 1.4, -q.vy * 1.4, 'ion', { d: 7 * p.st.dmg, r: 4, c: '#7dd3fc', l: 90 }); spark(q.x, q.y, 3, '#7dd3fc', 3, 12, 2); eb.splice(j, 1); } } }
  syncDrones(p); updDrones(p); updOrbs(p);
}
const DSLOT = [[-30, -58], [-30, 58], [-80, 0], [-58, -104]];
function syncDrones(p) {
  const n = Math.min(4, (p.pl.up.drn | 0) + (p.mod.xdr | 0) + (p.cfg.hull === 'hive' ? 2 : 0)); if (p.dr.length === n) return;
  while (p.dr.length < n) p.dr.push({ x: p.x - 30, y: p.y, vx: 0, vy: 0, fcd: 20 + p.dr.length * 9, fl: 0 });
  p.dr.length = n;
}
function updDrones(p) {
  if (!p.dr.length) return;
  const dm = 3 * (1 + .25 * (p.pl.up.drd | 0)) * p.st.dmg * (G.pdm || 1);
  p.dr.forEach((d, i) => {
    const s = DSLOT[i], tx = p.x + s[0], ty = p.y + s[1] + Math.sin(G.t * .05 + i * 2) * 5;
    d.vx += (tx - d.x) * .07; d.vy += (ty - d.y) * .07; d.vx *= .78; d.vy *= .78; d.x += d.vx; d.y += d.vy; if (d.fl > 0) d.fl--;
    if (--d.fcd > 0) return;
    let t = null, bd = 640 * 640;
    for (const e of G.ent.en) { if (e.dead || e.hide || e.x > V.W - 20 || e.x < d.x) continue; const dd = (e.x - d.x) * (e.x - d.x) + (e.y - d.y) * (e.y - d.y) * 2.2; if (dd < bd) { bd = dd; t = e; } }
    if (!t) { d.fcd = 8; return; }
    const a = Math.atan2(t.y - d.y, t.x - d.x); d.fcd = Math.round(24 / (p.od > 0 ? 1.5 : 1)); d.fl = 6;
    pb(p, d.x + 10, d.y, Math.cos(a) * 13, Math.sin(a) * 13, 'ion', { d: dm, r: 3, c: p.cfg.accent, l: 70 });
  });
}
function updOrbs(p) {
  const n = p.mod.orb | 0; p.orbP = [];
  if (!n) return;
  p.oa += .07;
  for (let i = 0; i < n; i++) {
    const a = p.oa + i / n * TAU, x = p.x + Math.cos(a) * 54, y = p.y + Math.sin(a) * 54, r = 11; p.orbP.push({ x, y });
    const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j], rr = r + q.r; if ((q.x - x) * (q.x - x) + (q.y - y) * (q.y - y) < rr * rr) { spark(q.x, q.y, 3, '#67e8f9', 3, 12, 2); eb.splice(j, 1); } }
    for (const e of G.ent.en) { if (e.dead || e.hide || e.x > V.W || e.odT > G.t) continue; const rr = r + e.r * .8; if ((e.x - x) * (e.x - x) + (e.y - y) * (e.y - y) < rr * rr) { e.odT = G.t + 22; spark(x, y, 4, '#67e8f9', 3, 12, 2); hurtEnemy(e, 9 + 3 * n, { own: p.id }); } }
  }
}

// ---------- weapon levels + evolutions ----------
const WMAXLV = 4;
const WEVO = {
  twin: { nm: 'Twin Pulse EX', ds: 'Three piercing bolts per volley' },
  spread: { nm: 'Scatter Storm', ds: '7 pellets, +15% damage' },
  lancer: { nm: 'Lancer Prime', ds: 'Twin lances, wider and deadlier' },
  ion: { nm: 'Ion Storm', ds: 'Double stream, +20% damage' },
  missile: { nm: 'Swarm Missiles', ds: '4 missiles with bigger blasts' },
  orb: { nm: 'Nova Orb', ds: 'Bigger orb that explodes on contact' },
  arc: { nm: 'Storm Caster', ds: 'Lightning chains through 5 enemies' },
  rail: { nm: 'Rail Prime', ds: 'Main slug plus two flanking slugs' }
};
const wBase = id => Math.max(180, Math.round(WPN[id].price * .28));
const wlvOf = (pl, id) => (pl.wlv && pl.wlv[id]) | 0;
const wevOf = (pl, id) => !!(pl.wevo && pl.wevo[id]);
const wupPrice = (id, lv) => Math.round(wBase(id) * [1, 1.45, 2.1, 3.05][Math.min(3, lv)]);
const wevoPrice = id => Math.round(wBase(id) * 5);
const wName = (pl, id) => wevOf(pl, id) ? WEVO[id].nm : WPN[id].nm;
function buyWup(pl, id) {
  if (pl.wown.indexOf(id) < 0) return; const lv = wlvOf(pl, id); if (lv >= WMAXLV) return; const pr = wupPrice(id, lv);
  if (SAVE.cores < pr) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; }
  SAVE.cores -= pr; pl.wlv = pl.wlv || {}; pl.wlv[id] = lv + 1; SFX.buy(); saveGame(); UI.refresh();
}
function buyWevo(pl, id) {
  if (pl.wown.indexOf(id) < 0 || wevOf(pl, id) || wlvOf(pl, id) < WMAXLV) return; const pr = wevoPrice(id);
  if (SAVE.cores < pr) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; }
  SAVE.cores -= pr; pl.wevo = pl.wevo || {}; pl.wevo[id] = true; SFX.buy(); SFX.power(); saveGame(); UI.refresh();
}

// ---------- boss weak points ----------
// every phase has one weak point. While it is intact the boss body is armored; breaking it staggers the boss and opens a damage window.
const POD_AT = [[-.74, -.46], [-.74, .46], [-.9, 0], [-.6, -.74], [-.6, .74]];
function mkPod(e, B, i) { const o = POD_AT[i % POD_AT.length], hp = Math.round(e.mhp * (.08 + i * .01)); return { ox: o[0] * e.r, oy: o[1] * e.r, r: 18 + B.w / 42, hp, mhp: hp, dead: false, age: 0, hf: 0 }; }
const podOf = e => { const pd = e.pods && e.pods[e.ph]; return pd && !pd.dead ? pd : null; };
const bossArmor = e => e.stg > 0 ? 1.6 : podOf(e) ? .75 : 1;
function podHit(e, b) { // can this bullet strike the weak point right now?
  if (e.dead || e.st !== 1 || e.inv || e.pause > 0) return null; const pd = podOf(e); if (!pd || pd.age < 18) return null;
  const x = e.x + pd.ox, y = e.y + pd.oy, rr = b.r + pd.r; return (x - b.x) * (x - b.x) + (y - b.y) * (y - b.y) < rr * rr ? pd : null;
}
function hurtPod(e, pd, dmg, b) {
  pd.hp -= dmg; pd.hf = 5; const x = e.x + pd.ox, y = e.y + pd.oy; ftext(x + rnd(-8, 8), y - pd.r - 6, Math.max(1, Math.round(dmg)), '#fde047', 12); SFX.hit(); spark(x, y, 3, '#fbbf24', 3, 12, 2);
  if (pd.hp <= 0) breakPod(e, pd, b ? b.own : -1);
}
function breakPod(e, pd, own) {
  pd.dead = true; pd.hp = 0; const x = e.x + pd.ox, y = e.y + pd.oy, B = BOSSES[e.bi];
  boom2D(x, y, 56, '#fbbf24'); shock(x, y, '#ffffff', 220, 28); shock(x, y, B.c, 340, 36); shake(9, 20); G.freeze = 6; SFX.boom(true); haptic([40, 30, 60]);
  if (R3) R3.boom(x, y, 14, 0xfbbf24, 6, 10);
  e.stg = 300; e.sp = null; e.acd = Math.max(e.acd, 90); for (const q of G.ent.eb) spark(q.x, q.y, 2, '#fbbf24', 2, 10, 2); G.ent.eb.length = 0;
  for (let i = 0; i < 4; i++) G.ent.pk.push({ k: 'core', v: 3 + e.bi, x, y, vx: rnd(-3, 1), vy: rnd(-3, 3), l: 700 });
  alertMsg('WEAK POINT DOWN - HIT THE CORE!'); ftext(x, y - 30, 'ARMOR BROKEN', '#fbbf24', 13);
  hurtEnemy(e, e.mhp * .06, { own, raw: 1 });
}
const BEXTRA = [{ k: 'aim', n: 4, s: 5.2, r: 55 }, { k: 'ring', n: 18, s: 3.4, r: 70 }];
const bossDiff = () => (SET.diff - 1) + ((G.run ? G.run.tier : 1) - 1) * .6;
function scaleAtk(a, bd) {
  if (!bd) return a; const o = Object.assign({}, a);
  if (o.n) o.n = Math.max(1, Math.round(o.n * (1 + bd * .15))); if (o.s) o.s *= 1 + bd * .05; return o;
}

// ---------- graze + rank ----------
function graze(p, b) {
  const R = G.run; if (!R || p.gzc > 0) return; p.gzc = 4; b.gz = 1; R.graze++; R.gzT = 100;
  R.score += Math.round(8 * (1 + Math.min(R.combo, 20) * .1)); if (R.combo > 0) R.comboT = Math.max(R.comboT, 45);
  if (p.abCd > 0) p.abCd = Math.max(0, p.abCd - (p.mod.graze ? 20 : 6));
  if (p.mod.graze) p.am = Math.min(p.mam, p.am + .5 * p.mod.graze);
  const a = Math.atan2(b.y - p.y, b.x - p.x); spark(p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16, 2, '#67e8f9', 2.4, 10, 1.8); SFX.graze();
  if (R.graze % 10 === 0) ftext(p.x, p.y - 40, 'GRAZE x' + R.graze, '#67e8f9', 11);
}
const RANKB = { S: .35, A: .2, B: .08, C: 0 };
function rankFor(R, win) {
  const tot = G.players.reduce((a, p) => a + p.mhp, 0) || 1, hr = R.hurt / tot, eff = 1 - R.esc / Math.max(1, R.kills + R.esc);
  let pts = win ? 40 : 15;
  pts += hr < .08 ? 30 : hr < .2 ? 22 : hr < .45 ? 12 : hr < .8 ? 5 : 0;
  pts += Math.min(20, R.graze * .5) + Math.min(10, R.maxCombo * .6) + eff * 10;
  return pts >= 92 ? 'S' : pts >= 76 ? 'A' : pts >= 58 ? 'B' : 'C';
}

// ---------- drawing for all of the above (2D overlay) ----------
function drawWing(g, d, p, t) {
  const ac = p.cfg.accent; g.save(); g.translate(d.x, d.y); g.globalCompositeOperation = 'lighter'; drawGlow(g, -9, 0, 14 + Math.random() * 2, ac, .7); if (d.fl > 0) drawGlow(g, 10, 0, 16, '#ffffff', d.fl / 8);
  g.globalCompositeOperation = 'source-over'; g.lineJoin = 'round'; g.lineWidth = 1.2; g.strokeStyle = ac; g.fillStyle = p.cfg.paint;
  g.beginPath(); g.moveTo(12, 0); g.lineTo(-6, -8); g.lineTo(-9, -3); g.lineTo(-7, 0); g.lineTo(-9, 3); g.lineTo(-6, 8); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#e0f2fe'; g.beginPath(); g.ellipse(2, 0, 3.6, 1.8, 0, 0, TAU); g.fill(); g.restore();
}
function drawMeta(g, t) {
  const R = G.run; if (!R) return;
  drawModes(g, t); drawCombat(g, t);
  if (G.abTs > 0 && !SET.reduce) { g.fillStyle = 'rgba(125,211,252,' + (Math.min(1, G.abTs / 20) * .07).toFixed(3) + ')'; g.fillRect(0, 0, V.W, V.H); }
  for (const p of G.players) {
    if (!p.alive) continue;
    for (const d of p.dr) drawWing(g, d, p, t);
    if (p.orbP) for (const o of p.orbP) { g.save(); g.translate(o.x, o.y); g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, 22, '#67e8f9', .55); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#0c4a6e'; g.strokeStyle = '#a5f3fc'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#e0f2fe'; g.beginPath(); g.arc(-2, -2, 2.6, 0, TAU); g.fill(); g.restore(); }
    if (p.wallT > 0) {
      const wx = p.x + 54, hh = 100, a = Math.min(1, p.wallT / 20) * (p.wallT < 40 && (t >> 2) & 1 ? .45 : 1);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; const gr = g.createLinearGradient(wx - 14, 0, wx + 14, 0); gr.addColorStop(0, 'rgba(56,189,248,0)'); gr.addColorStop(.5, 'rgba(186,230,253,.85)'); gr.addColorStop(1, 'rgba(56,189,248,0)'); g.fillStyle = gr; g.fillRect(wx - 14, p.y - hh, 28, hh * 2);
      g.strokeStyle = 'rgba(224,242,254,.7)'; g.lineWidth = 1.5; for (let y = -hh; y < hh; y += 22) { g.beginPath(); g.moveTo(wx - 9, p.y + y); g.lineTo(wx, p.y + y + 11); g.lineTo(wx + 9, p.y + y); g.stroke(); } g.restore();
    }
    if (p.ovl > 0) { g.globalCompositeOperation = 'lighter'; drawGlow(g, p.x, p.y, 78, '#fb923c', .32 + Math.sin(t * .5) * .1); g.globalCompositeOperation = 'source-over'; }
    if (p.phaseT > 0) { g.save(); g.strokeStyle = 'rgba(196,181,253,.8)'; g.setLineDash([6, 6]); g.lineDashOffset = -t; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 34 + Math.sin(t * .4) * 2, 0, TAU); g.stroke(); g.globalCompositeOperation = 'lighter'; drawGlow(g, p.x, p.y, 54, '#a78bfa', .28); g.restore(); }
    if (p.reflT > 0) { const a = Math.min(1, p.reflT / 20) * (p.reflT < 40 && (t >> 2) & 1 ? .5 : 1); g.save(); g.translate(p.x, p.y); g.globalAlpha = a; g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(186,230,253,.85)'; g.lineWidth = 2.5; g.beginPath(); for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + t * .02; g.lineTo(Math.cos(an) * 96, Math.sin(an) * 96); } g.closePath(); g.stroke(); drawGlow(g, 0, 0, 100, '#38bdf8', .16); g.restore(); }
    if (p.dashT > 0) { g.globalCompositeOperation = 'lighter'; for (let k = 1; k < 6; k++) drawGlow(g, p.x - p.dvx * k * .9, p.y - p.dvy * k * .9, 26 - k * 3, '#a5f3fc', .5 - k * .07); g.globalCompositeOperation = 'source-over'; }
  }
  const e = R.boss;
  if (e && !e.dead && e.pods && e.st === 1) {
    const pd = podOf(e), B = BOSSES[e.bi];
    g.save(); g.translate(e.x, e.y); g.lineWidth = 2.5; g.setLineDash([10, 9]); g.lineDashOffset = -t * .4; g.strokeStyle = e.stg > 0 ? 'rgba(251,191,36,.85)' : pd ? 'rgba(148,163,184,.55)' : 'rgba(0,0,0,0)'; g.beginPath(); g.arc(0, 0, e.r * 1.28, 0, TAU); g.stroke(); g.setLineDash([]); g.restore();
    if (pd) {
      const x = e.x + pd.ox, y = e.y + pd.oy, k = Math.min(1, pd.age / 20), r = pd.r * (.4 + .6 * k), pulse = .55 + .25 * Math.sin(t * (pd.hp < pd.mhp * .4 ? .5 : .2));
      g.save(); g.translate(x, y); g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, r * 2.6, '#ef4444', pulse); g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#1c1917'; g.strokeStyle = pd.hf > 0 ? '#ffffff' : '#fbbf24'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .01; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke();
      g.fillStyle = pd.hf > 0 ? '#ffffff' : '#fb7185'; g.beginPath(); g.arc(0, 0, r * .52, 0, TAU); g.fill(); g.fillStyle = '#450a0a'; g.beginPath(); g.arc(0, 0, r * .22, 0, TAU); g.fill();
      g.strokeStyle = '#fde047'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r + 7, -H, -H + TAU * Math.max(0, pd.hp / pd.mhp)); g.stroke();
      if (k >= 1) { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.6; g.rotate(t * .03); for (let i = 0; i < 4; i++) { g.rotate(H); g.beginPath(); g.moveTo(r + 13, 0); g.lineTo(r + 20, 0); g.stroke(); } }
      g.restore();
    }
  }
}
