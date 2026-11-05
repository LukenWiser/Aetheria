// ================= STYLE OVERHAUL: the Locker, rarities, new cosmetic types, the Item Shop and the Battle Pass =================
const RARX = [['Common', '#94a3b8', 300], ['Rare', '#38bdf8', 700], ['Epic', '#c084fc', 1400], ['Legendary', '#fbbf24', 2600], ['Mythic', '#f43f5e', 0]];
const CATS = [['skin', 'Ship Skins'], ['trail', 'Engine Trails'], ['bullet', 'Bullet Colours'], ['kfx', 'Kill Effects'], ['aura', 'Auras'], ['dskin', 'Drone Skins'], ['banner', 'Banners'], ['title', 'Titles']];
// rarities for the original items, then a big batch of new ones (src: shop = Item Shop rotation, pass = Battle Pass, rank = pilot rank)
(function () {
  const R0 = { trail: { fire: 0, toxic: 0, royal: 1, ice: 1, gold: 2, rainbow: 3 }, bullet: { crimson: 0, lime: 0, violet: 1, white: 1, rainbow: 3 }, kfx: { confetti: 0, pixels: 1, lightning: 1, ghost: 2, nova: 3 } };
  for (const c in R0) for (const id in R0[c]) if (COS[c][id]) { COS[c][id].r = R0[c][id]; COS[c][id].src = COS[c][id].rank ? 'rank' : 'shop'; }
  for (const id in COS.skin) { COS.skin[id].r = COS.skin[id].r === undefined ? (COS.skin[id].rank ? 2 : 1) : COS.skin[id].r; COS.skin[id].src = COS.skin[id].rank ? 'rank' : 'shop'; }
  const add = (cat, id, o) => { COS[cat] = COS[cat] || {}; COS[cat][id] = Object.assign({ src: 'shop', p: RARX[o.r || 0][2] }, o); };
  // ship skins: paint + accent + finish
  [['solar', 'Solar Flare', '#b45309', '#fde047', 'neon', 1], ['abyss', 'Abyssal', '#0c1222', '#2dd4bf', 'matte', 1], ['sakura', 'Sakura', '#fbcfe8', '#db2777', 'pearl', 1], ['jade', 'Jade Dynasty', '#065f46', '#fbbf24', 'chrome', 2], ['ghostly', 'Ghost Protocol', '#e5e7eb', '#94a3b8', 'pearl', 0], ['ember', 'Ember Ash', '#292524', '#f97316', 'matte', 0], ['ultra', 'Ultraviolet', '#2e1065', '#e879f9', 'neon', 2], ['cobalt', 'Cobalt Strike', '#1e3a8a', '#f8fafc', 'chrome', 0], ['venom', 'Venom', '#14532d', '#a3e635', 'neon', 1], ['royalx', 'Crown Jewel', '#4c1d95', '#fbbf24', 'chrome', 3], ['candy', 'Candy Rush', '#f472b6', '#22d3ee', 'pearl', 1], ['stealth', 'Stealth Ops', '#18181b', '#ef4444', 'matte', 2]].forEach(s => add('skin', s[0], { nm: s[1], cfg: { paint: s[2], accent: s[3], finish: s[4] }, r: s[5] }));
  // trails (an array cycles through its colours)
  [['plasma', 'Plasma Wake', ['#22d3ee', '#a78bfa'], 1], ['sunset', 'Sunset Drift', ['#fb923c', '#f43f5e', '#c084fc'], 2], ['mint', 'Mint', '#6ee7b7', 0], ['blood', 'Red Line', '#ef4444', 0], ['aurora', 'Aurora', ['#34d399', '#22d3ee', '#818cf8'], 3], ['void', 'Void Wake', ['#1e1b4b', '#7c3aed'], 2], ['candy', 'Cotton Candy', ['#f9a8d4', '#a5f3fc'], 1]].forEach(s => add('trail', s[0], { nm: s[1], c: s[2], r: s[3] }));
  [['tangerine', 'Tangerine', '#fb923c', 0], ['ocean', 'Deep Ocean', '#0ea5e9', 0], ['toxicb', 'Toxic Glow', '#bef264', 1], ['sakurab', 'Petal', ['#f9a8d4', '#fbcfe8'], 1], ['twilight', 'Twilight', ['#818cf8', '#f0abfc'], 2], ['solarb', 'Solar Core', ['#fde047', '#fb923c', '#ef4444'], 3]].forEach(s => add('bullet', s[0], { nm: s[1], c: s[2], r: s[3] }));
  [['stardust', 'Stardust', 1], ['vortex', 'Vortex', 2], ['glitch', 'Glitch Out', 2], ['firework', 'Fireworks', 3], ['shatter', 'Shatter', 0], ['blackhole', 'Black Hole', 3]].forEach(s => add('kfx', s[0], { nm: s[1], r: s[2] }));
  add('aura', 'none', { nm: 'No Aura', p: 0, r: 0, src: 'starter' });
  [['halo', 'Halo', '#fde68a', 1], ['ember', 'Ember Ring', '#fb923c', 1], ['orbit', 'Orbiters', '#22d3ee', 2], ['frost', 'Frost Field', '#bae6fd', 1], ['storm', 'Storm Cell', '#a5b4fc', 2], ['void', 'Void Rift', '#a855f7', 3], ['crown', 'Starcrown', '#fbbf24', 3]].forEach(s => add('aura', s[0], { nm: s[1], c: s[2], r: s[3] }));
  add('dskin', 'default', { nm: 'Drone Default', p: 0, r: 0, src: 'starter' });
  [['chrome', 'Chrome', '#e2e8f0', 0], ['toxicd', 'Toxic', '#a3e635', 1], ['rose', 'Rose Gold', '#fda4af', 1], ['inferno', 'Inferno', '#f97316', 2], ['phantom', 'Phantom', '#c4b5fd', 2], ['prism', 'Prism', 'rb', 3]].forEach(s => add('dskin', s[0], { nm: s[1], c: s[2], r: s[3] }));
  add('banner', 'none', { nm: 'Plain', p: 0, r: 0, src: 'starter', g: ['#0b1222', '#0b1222'] });
  [['dusk', 'Dusk', ['#7c2d12', '#4c1d95'], 0], ['reef', 'Reef', ['#0e7490', '#134e4a'], 0], ['nebula', 'Nebula', ['#581c87', '#be185d', '#1e3a8a'], 1], ['circuit', 'Circuit', ['#052e16', '#16a34a'], 1], ['solar', 'Solar Wind', ['#b45309', '#fde047'], 2], ['aurora', 'Aurora', ['#064e3b', '#22d3ee', '#4c1d95'], 2], ['champion', 'Champion', ['#78350f', '#fbbf24', '#78350f'], 3]].forEach(s => add('banner', s[0], { nm: s[1], g: s[2], r: s[3] }));
  add('title', 'none', { nm: 'No Title', p: 0, r: 0, src: 'starter' });
  [['rookie', 'Rookie', 0], ['ace', 'Ace', 1], ['wingman', 'Wingman', 0], ['bosshunter', 'Boss Hunter', 1], ['nightowl', 'Night Owl', 1], ['speedrun', 'Speedrunner', 2], ['untouch', 'Untouchable', 2], ['legend', 'Living Legend', 3], ['founder', 'Driftwire Founder', 3]].forEach(s => add('title', s[0], { nm: s[1], r: s[2] }));
})();
// battle pass exclusives
const PASS_ITEMS = [['skin', 'signal', { nm: 'Signal Fire', cfg: { paint: '#111827', accent: '#22d3ee', finish: 'neon' }, r: 3 }], ['skin', 'mythic', { nm: 'Aetherborn', cfg: { paint: '#f8fafc', accent: '#f43f5e', finish: 'neon' }, r: 4 }], ['trail', 'signal', { nm: 'Live Wire', c: ['#22d3ee', '#ffffff', '#c084fc'], r: 3 }], ['bullet', 'signal', { nm: 'Driftwire', c: ['#22d3ee', '#c084fc'], r: 2 }], ['aura', 'signal', { nm: 'Spark Coil', c: '#22d3ee', r: 3 }], ['aura', 'mythic', { nm: 'Supernova Crown', c: '#f43f5e', r: 4 }], ['kfx', 'signal', { nm: 'Wire Snap', r: 2 }], ['banner', 'signal', { nm: 'Signal Fire', g: ['#020617', '#0e7490', '#7c3aed'], r: 2 }], ['banner', 'mythic', { nm: 'Aetherborn', g: ['#4c0519', '#f43f5e', '#fbbf24'], r: 4 }], ['title', 'signal', { nm: 'Signal Chaser', r: 2 }], ['title', 'mythic', { nm: 'Aetherborn', r: 4 }], ['dskin', 'signal', { nm: 'Live Wire', c: '#67e8f9', r: 2 }], ['trail', 'mythic', { nm: 'Aether Flame', c: ['#f43f5e', '#fbbf24', '#ffffff'], r: 4 }]];
PASS_ITEMS.forEach(([c, id, o]) => { COS[c][id] = Object.assign({ src: 'pass', p: 0 }, o); });
const COS2 = { dskin: id => { const c = (COS.dskin[id] || {}).c; return !c ? null : c === 'rb' ? RAINBOW[(DR.t >> 2) % RAINBOW.length] : c; } };
const _cosOwn0 = cosOwn;
function PC() { const P = PS().cos; CATS.forEach(([c]) => { if (!P.own[c]) P.own[c] = []; if (P[c] === undefined && c !== 'skin') P[c] = c === 'dskin' ? 'default' : 'none'; }); return P; }
const own2 = (cat, id) => { const c = COS[cat] && COS[cat][id]; if (!c) return false; return c.p === 0 && c.src !== 'pass' || PC().own[cat].indexOf(id) >= 0; };
const cycleC = (c, t) => Array.isArray(c) ? c[Math.floor(t / 6) % c.length] : c === 'rb' ? RAINBOW[(t >> 2) % RAINBOW.length] : c;
trailCol = function (p) { const c = COS.trail[PS().cos.trail]; if (!c || !c.c) return p.cfg.accent; return cycleC(c.c, G.t); };
bulletCol = function (p, k, base) { const c = COS.bullet[PS().cos.bullet]; if (c && c.c) return cycleC(c.c, G.t + G.ent.pb.length * 3);
  const sk = p.pl.wsk && p.pl.wsk[k]; if (sk && mastery(k).t >= sk) return sk === 4 ? RAINBOW[(G.t >> 1) % RAINBOW.length] : MTIER[sk][2]; return base; };
const _killFx0 = killFx;
killFx = function (e) { const k = PS().cos.kfx; if (SET.reduce) return;
  if (k === 'stardust') { for (let i = 0; i < 16; i++) pcl({ x: e.x, y: e.y, vx: rnd(-2, 2), vy: rnd(-2, 2), l: 50, l0: 50, c: pick(['#fde68a', '#ffffff', '#c4b5fd']), r: 2, k: 0, fr: .96 }); }
  else if (k === 'vortex') { for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; pcl({ x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30, vx: -Math.sin(a) * 3 - Math.cos(a), vy: Math.cos(a) * 3 - Math.sin(a), l: 30, l0: 30, c: '#818cf8', r: 3, k: 0, fr: .93 }); } }
  else if (k === 'glitch') { for (let i = 0; i < 8; i++) pcl({ x: e.x + rnd(-20, 20), y: e.y + rnd(-20, 20), vx: rnd(-6, 6), vy: 0, l: 18, l0: 18, c: pick(['#ff2bd6', '#22d3ee', '#ffffff']), r: 5, k: 0, fr: .8 }); }
  else if (k === 'firework') { const cs = pick([RAINBOW, ['#fde047', '#fb923c'], ['#22d3ee', '#ffffff']]); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; pcl({ x: e.x, y: e.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, l: 40, l0: 40, c: cs[i % cs.length], r: 2.4, k: 0, fr: .93 }); } shock(e.x, e.y, '#ffffff', e.w * 1.2, 10); }
  else if (k === 'shatter') { for (let i = 0; i < 10; i++) pcl({ x: e.x, y: e.y, vx: rnd(-4, 4), vy: rnd(-4, 1), l: 40, l0: 40, c: '#e0f2fe', r: rnd(2, 5), k: 0, fr: .97 }); }
  else if (k === 'blackhole') { shock(e.x, e.y, '#7c3aed', e.w * 2, 22); for (let i = 0; i < 14; i++) { const a = rnd(0, TAU), r = 50; pcl({ x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, vx: -Math.cos(a) * 3, vy: -Math.sin(a) * 3, l: 16, l0: 16, c: '#c4b5fd', r: 2.5, k: 0, fr: 1 }); } }
  else if (k === 'signal') { for (let i = 0; i < 3; i++) G.ent.bm.push({ k: 'arc', x: e.x, y: e.y, x2: e.x + rnd(-90, 90), y2: e.y + rnd(-90, 90), l: 12, l0: 12 }); shock(e.x, e.y, '#22d3ee', e.w * 1.4, 12); }
  else _killFx0(e); };
function drawAura(g, x, y, id, t, s) { // shared by the game and the Locker preview
  const A = COS.aura[id]; if (!A || id === 'none') return; s = s || 1; const c = A.c;
  g.save(); g.globalCompositeOperation = 'lighter';
  if (id === 'halo') { g.strokeStyle = c; g.globalAlpha = .7; g.lineWidth = 2.5 * s; g.beginPath(); g.ellipse(x, y - 30 * s, 22 * s, 6 * s, 0, 0, TAU); g.stroke(); drawGlow(g, x, y - 30 * s, 26 * s, c, .35); }
  else if (id === 'orbit' || id === 'signal') { for (let i = 0; i < 4; i++) { const a = t * .06 + i * H; drawGlow(g, x + Math.cos(a) * 40 * s, y + Math.sin(a) * 16 * s, 9 * s, c, .9); } if (id === 'signal' && t % 20 < 3) { g.strokeStyle = c; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 40 * s, y); for (let i = 1; i < 6; i++) g.lineTo(x - 40 * s + i * 16 * s, y + (Math.random() - .5) * 24 * s); g.stroke(); } }
  else if (id === 'void' || id === 'mythic') { drawGlow(g, x, y, 62 * s, c, .45 + .15 * Math.sin(t * .08)); g.strokeStyle = id === 'mythic' ? '#fbbf24' : '#f0abfc'; g.lineWidth = 1.5 * s; g.globalAlpha = .7; for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(x, y, (44 + i * 10) * s, (16 + i * 4) * s, t * .02 * (i ? -1 : 1), 0, TAU); g.stroke(); } }
  else if (id === 'crown') { for (let i = 0; i < 5; i++) { const a = -PI / 2 + (i - 2) * .32; drawGlow(g, x + Math.cos(a) * 34 * s, y - 8 * s + Math.sin(a) * 34 * s, 8 * s, c, .8 + .2 * Math.sin(t * .2 + i)); } }
  else { drawGlow(g, x, y, (50 + Math.sin(t * .1) * 6) * s, c, id === 'frost' ? .3 : .38); if (id === 'storm' && t % 30 < 4) { g.strokeStyle = '#e0e7ff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 90 * s, y + (Math.random() - .5) * 60 * s); g.stroke(); } if (id === 'ember') for (let i = 0; i < 3; i++) drawGlow(g, x + Math.sin(t * .1 + i * 2) * 30 * s, y - ((t * 1.5 + i * 20) % 50) * s, 4 * s, '#fdba74', .8); }
  g.restore();
}
const _drawMetaS = drawMeta;
drawMeta = function (g, t) { try { const p = G.players[0], a = PS().cos.aura; if (p && p.alive && a && a !== 'none' && !G.net) drawAura(g, p.x, p.y, a, t); } catch (e) { } return _drawMetaS.apply(this, arguments); };

// ---------- item shop: a new rotation every day ----------
function shopToday() {
  const day = dayKey(), rs = seeded(day.split('').reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 99)), pool = [];
  CATS.forEach(([c]) => { for (const id in COS[c]) { const it = COS[c][id]; if (it.src === 'shop' && it.p > 0 && !it.rank) pool.push([c, id]); } });
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rs() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const feat = pool.filter(([c, id]) => COS[c][id].r >= 2).slice(0, 2), rest = pool.filter(x => feat.indexOf(x) < 0).slice(0, 6);
  return { feat, daily: rest, bundle: { items: feat.concat(rest.slice(0, 1)), off: .25 } };
}
const shopLeft = () => { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); const s = Math.max(0, (m - n) / 1000 | 0); return Math.floor(s / 3600) + 'h ' + Math.floor(s % 3600 / 60) + 'm'; };
function grant(cat, id) { const P = PC(); if (P.own[cat].indexOf(id) < 0) P.own[cat].push(id); }
function equip(cat, id) { const P = PC(), c = COS[cat][id]; if (!c || !own2(cat, id)) return false; if (cat === 'skin') { Object.assign(SAVE.pl[0].cfg, c.cfg); const o = SAVE.pl[0].own; o.finish = o.finish || []; if (o.finish.indexOf(c.cfg.finish) < 0) o.finish.push(c.cfg.finish); P.skin = id; } else if (cat === 'dskin') { P.dskin = id; DS().skin = id === 'default' ? '' : id; } else P[cat] = id; saveGame(); return true; }

// ---------- battle pass ----------
const BP_TIERS = 50, BP_XP = 250, BP_COST = 2500;
function BP() { const S = rkSeason(), B = SAVE.bp || (SAVE.bp = {}); if (B.s !== S) { SAVE.bp = { s: S, xp: 0, prem: false, got: { f: {}, p: {} } }; } return SAVE.bp; }
const bpTier = () => Math.min(BP_TIERS, Math.floor(BP().xp / BP_XP));
function bpReward(tr, n) { // n = 1..50
  if (tr === 'f') { const items = { 5: ['title', 'rookie'], 10: ['banner', 'dusk'], 15: ['trail', 'mint'], 20: ['dskin', 'chrome'], 25: ['bullet', 'signal'], 30: ['title', 'signal'], 35: ['banner', 'signal'], 40: ['aura', 'halo'], 45: ['kfx', 'shatter'], 50: ['skin', 'signal'] }; return items[n] ? { cos: items[n] } : { cores: 100 + n * 6 }; }
  const P = { 1: ['skin', 'solar'], 3: ['trail', 'plasma'], 6: ['aura', 'frost'], 8: ['banner', 'nebula'], 11: ['dskin', 'signal'], 13: ['kfx', 'signal'], 16: ['bullet', 'twilight'], 18: ['title', 'ace'], 21: ['skin', 'ultra'], 23: ['aura', 'signal'], 26: ['trail', 'signal'], 28: ['banner', 'aurora'], 31: ['kfx', 'vortex'], 33: ['title', 'bosshunter'], 36: ['skin', 'jade'], 38: ['dskin', 'phantom'], 41: ['aura', 'orbit'], 43: ['trail', 'aurora'], 46: ['banner', 'mythic'], 48: ['title', 'mythic'], 49: ['trail', 'mythic'], 50: ['skin', 'mythic'] };
  if (P[n]) return { cos: P[n] }; if (n === 40) return { cos: ['aura', 'mythic'] }; return { cores: 180 + n * 8 }; }
const _addXPS = addXP;
addXP = function (n, d) { const r = _addXPS.apply(this, arguments); try { const B = BP(), t0 = bpTier(); B.xp += Math.max(0, Math.round(n)); const t1 = bpTier(); if (t1 > t0) { if (d) d.bpUp = t1; else toast('BATTLE PASS TIER ' + t1, 'New rewards to claim', '#c084fc'); } } catch (e) { } return r; };
function bpClaim(tr, n) { const B = BP(); if (n > bpTier() || B.got[tr][n] || (tr === 'p' && !B.prem)) return false; const r = bpReward(tr, n); if (r.cores) SAVE.cores += r.cores; if (r.cos) grant(r.cos[0], r.cos[1]); B.got[tr][n] = 1; saveGame(); return r; }

// ---------- the Locker ----------
const LV2 = { cat: 'skin', sel: null, tab: 'locker', raf: 0, t: 0 };
const rarB = r => '<span class="rar" style="--rc:' + RARX[r | 0][1] + '">' + RARX[r | 0][0] + '</span>';
function swatch(cat, id) { const c = COS[cat][id] || {}, col = v => Array.isArray(v) ? 'linear-gradient(135deg,' + v.join(',') + ')' : v === 'rb' ? 'conic-gradient(' + RAINBOW.join(',') + ')' : v;
  if (cat === 'skin') return 'linear-gradient(135deg,' + c.cfg.paint + ' 55%,' + c.cfg.accent + ' 55%)'; if (cat === 'banner') return 'linear-gradient(110deg,' + c.g.join(',') + ')'; if (c.c) return col(c.c); return '#1e293b'; }
function itemCard(cat, id, o) { const c = COS[cat][id], own = own2(cat, id), P = PC(), on = (cat === 'skin' ? P.skin : P[cat]) === id; o = o || {};
  return '<button class="lk-it' + (on ? ' on' : '') + (own ? '' : ' no') + (LV2.sel === cat + ':' + id ? ' sel' : '') + '" style="--rc:' + RARX[c.r | 0][1] + '" data-act="' + (o.act || 'lksel') + ':' + cat + ':' + id + '"><i class="lk-sw" style="background:' + swatch(cat, id) + '">' + (cat === 'title' ? '<em>' + escH(c.nm) + '</em>' : cat === 'kfx' ? '<em>FX</em>' : '') + '</i><b>' + escH(c.nm) + '</b>' + rarB(c.r) + (o.price ? '<span class="lk-p">' + (own ? 'OWNED' : fmt(o.price) + ' CORES') + '</span>' : on ? '<span class="lk-p good">EQUIPPED</span>' : !own ? '<span class="lk-p mut">' + (c.src === 'pass' ? 'BATTLE PASS' : c.rank ? RANKS[c.rank] + ' RANK' : 'ITEM SHOP') + '</span>' : '') + '</button>'; }
function lkPreview() { // live preview of the full loadout
  const cv = document.getElementById('lkCv'); if (!cv || UI.top !== 'scLocker') { LV2.raf = 0; return; } LV2.raf = requestAnimationFrame(lkPreview); const t = ++LV2.t;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return; if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d'), P = PC(), [sc, sid] = (LV2.sel || '').split(':'), pv = (cat, def) => sc === cat ? sid : def; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bn = COS.banner[pv('banner', P.banner)] || COS.banner.none, bg = g.createLinearGradient(0, 0, W, H); bn.g.forEach((c, i) => bg.addColorStop(i / Math.max(1, bn.g.length - 1), c)); g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(2,4,12,.55)'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const x = (i * 97 + t * (1 + i % 3)) % (W + 40) - 20, y = (i * 53) % H; g.fillStyle = 'rgba(255,255,255,' + (.2 + (i % 4) * .1) + ')'; g.fillRect(W - x, y, 2, 2); }
  const sk = COS.skin[pv('skin', P.skin)], cfg = sk && sk.cfg ? sk.cfg : SAVE.pl[0].cfg, x = W * .32, y = H * .5 + Math.sin(t * .04) * 8;
  const tr = COS.trail[pv('trail', P.trail)], tc = tr && tr.c ? tr.c : cfg.accent; g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { drawGlow(g, x - 34 - i * 9, y + Math.sin((t - i * 3) * .04) * 8 * (i / 26), 10 - i * .3, cycleC(tc, t + i * 3), .55 * (1 - i / 26)); } g.globalCompositeOperation = 'source-over';
  drawAura(g, x, y, pv('aura', P.aura), t, 1.2);
  g.save(); g.translate(x, y); g.scale(1.6, 1.6); g.fillStyle = cfg.paint; g.strokeStyle = cfg.accent; g.lineWidth = 1.6; g.beginPath(); g.moveTo(28, 0); g.lineTo(6, -6); g.lineTo(-6, -22); g.lineTo(-14, -22); g.lineTo(-10, -6); g.lineTo(-20, -4); g.lineTo(-20, 4); g.lineTo(-10, 6); g.lineTo(-14, 22); g.lineTo(-6, 22); g.lineTo(6, 6); g.closePath(); g.fill(); g.stroke(); g.fillStyle = cfg.accent; g.beginPath(); g.ellipse(8, 0, 7, 3, 0, 0, TAU); g.fill(); g.restore();
  const bc = COS.bullet[pv('bullet', P.bullet)]; LV2.bs = LV2.bs || []; if (t % 9 === 0) LV2.bs.push({ x: x + 46, y: y - 6 }, { x: x + 46, y: y + 6 });
  g.globalCompositeOperation = 'lighter'; LV2.bs = LV2.bs.filter(b => { b.x += 9; drawGlow(g, b.x, b.y, 8, bc && bc.c ? cycleC(bc.c, t + b.y) : '#22d3ee', .9); g.fillStyle = '#fff'; g.fillRect(b.x - 6, b.y - 1, 12, 2); return b.x < W * .82; }); g.globalCompositeOperation = 'source-over';
  const ex = W * .84, ey = H * .5, ph = t % 120, kf = pv('kfx', P.kfx); if (ph < 90) { g.fillStyle = '#7f1d1d'; g.strokeStyle = '#fb7185'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .02; g.lineTo(ex + Math.cos(a) * 18, ey + Math.sin(a) * 18); } g.closePath(); g.fill(); g.stroke(); }
  if (ph === 90) { LV2.fx = []; const n = 22, cs = kf === 'confetti' || kf === 'firework' ? RAINBOW : kf === 'blackhole' || kf === 'vortex' ? ['#c4b5fd', '#7c3aed'] : kf === 'glitch' ? ['#ff2bd6', '#22d3ee'] : kf === 'signal' ? ['#22d3ee', '#ffffff'] : kf === 'ghost' ? ['#e0e7ff'] : kf === 'none' ? ['#fb923c', '#fde047'] : ['#fde68a', '#ffffff', '#c4b5fd']; for (let i = 0; i < n; i++) { const a = i / n * TAU, v = kf === 'blackhole' || kf === 'vortex' ? -2 : 2 + Math.random() * 3; LV2.fx.push({ x: ex + (v < 0 ? Math.cos(a) * 50 : 0), y: ey + (v < 0 ? Math.sin(a) * 50 : 0), vx: Math.cos(a) * v, vy: Math.sin(a) * v - (kf === 'ghost' ? 1.5 : 0), c: cs[i % cs.length], l: 34 }); } }
  g.globalCompositeOperation = 'lighter'; (LV2.fx || []).forEach(f => { f.x += f.vx; f.y += f.vy; f.vx *= .95; f.vy *= .95; f.l--; if (f.l > 0) drawGlow(g, f.x, f.y, 6, f.c, f.l / 34); }); g.globalCompositeOperation = 'source-over';
  const ti = COS.title[pv('title', P.title)]; g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '900 italic 22px "Big Shoulders Display", Impact, sans-serif'; g.fillText(((NET.me && NET.me.name) || 'PILOT').toUpperCase(), 16, H - 34); if (ti && pv('title', P.title) !== 'none') { g.fillStyle = RARX[ti.r | 0][1]; g.font = '700 12px system-ui,sans-serif'; g.fillText(ti.nm.toUpperCase(), 16, H - 16); }
}
SCR.scLocker = () => {
  const P = PC(), tab = LV2.tab; setTimeout(() => { if (!LV2.raf) lkPreview(); }, 0);
  let body = '';
  if (tab === 'locker') { const cat = LV2.cat, ids = Object.keys(COS[cat]).sort((a, b) => (own2(cat, b) - own2(cat, a)) || ((COS[cat][a].r | 0) - (COS[cat][b].r | 0))), nOwn = ids.filter(id => own2(cat, id)).length;
    body = '<div class="lk-cats">' + CATS.map(([c, n]) => '<button class="' + (c === cat ? 'on' : '') + '" data-act="lkcat:' + c + '">' + n + '</button>').join('') + '</div><div class="xs mut" style="margin:8px 0">' + nOwn + ' / ' + ids.length + ' collected</div><div class="lk-grid">' + ids.map(id => itemCard(cat, id)).join('') + '</div>'; }
  else if (tab === 'shop') { const S = shopToday(), b = S.bundle, bp = Math.round(b.items.reduce((a, [c, id]) => a + COS[c][id].p, 0) * (1 - b.off)), bOwn = b.items.every(([c, id]) => own2(c, id));
    body = '<div class="row sp"><div class="xs mut b nh" style="margin:0">FEATURED</div><span class="xs mut">New items in ' + shopLeft() + '</span></div><div class="lk-grid big">' + S.feat.map(([c, id]) => itemCard(c, id, { act: 'shbuy', price: COS[c][id].p })).join('') + '</div>' +
      '<div class="lk-bundle"><div><b>Daily Bundle</b><div class="xs mut">' + b.items.map(([c, id]) => COS[c][id].nm).join(' + ') + '</div></div><button class="btn sm gold' + (bOwn || SAVE.cores < bp ? ' off' : '') + '" data-act="shbundle">' + (bOwn ? 'OWNED' : fmt(bp) + ' CORES (-25%)') + '</button></div>' +
      '<div class="xs mut b nh">DAILY</div><div class="lk-grid">' + S.daily.map(([c, id]) => itemCard(c, id, { act: 'shbuy', price: COS[c][id].p })).join('') + '</div>'; }
  else { const B = BP(), tier = bpTier(), into = B.xp - tier * BP_XP, cell = (tr, n) => { const r = bpReward(tr, n), got = B.got[tr][n], can = n <= tier && !got && (tr === 'f' || B.prem), c = r.cos ? COS[r.cos[0]][r.cos[1]] : null;
      return '<div class="bp-c ' + tr + (got ? ' got' : '') + (n <= tier ? ' open' : '') + '" style="--rc:' + (c ? RARX[c.r | 0][1] : '#475569') + '">' + (c ? '<i class="lk-sw" style="background:' + swatch(r.cos[0], r.cos[1]) + '"></i><b>' + escH(c.nm) + '</b>' : '<i class="lk-sw core"></i><b>' + fmt(r.cores) + '</b>') + (can ? '<button class="btn sm gold" data-act="bpclaim:' + tr + ':' + n + '">CLAIM</button>' : got ? '<span class="xs good b">CLAIMED</span>' : tr === 'p' && !B.prem ? '<span class="xs mut">PREMIUM</span>' : '') + '</div>'; };
    const cols = []; for (let n = 1; n <= BP_TIERS; n++) cols.push('<div class="bp-col' + (n === tier + 1 ? ' next' : '') + '"><span class="bp-n">' + n + '</span>' + cell('p', n) + cell('f', n) + '</div>');
    const claimable = (() => { let k = 0; for (let n = 1; n <= tier; n++) { if (!B.got.f[n]) k++; if (B.prem && !B.got.p[n]) k++; } return k; })();
    body = '<div class="bp-head"><div><div class="gx-k">SEASON ' + B.s + ' - SIGNAL FIRE - ENDS IN ' + rkDaysLeft() + ' DAYS</div><div class="bp-t">Tier ' + tier + ' <span class="mut">/ ' + BP_TIERS + '</span></div><div class="gx-bar"><i style="width:' + (tier >= BP_TIERS ? 100 : Math.round(into / BP_XP * 100)) + '%"></i></div><div class="xs mut">' + (tier >= BP_TIERS ? 'Pass complete!' : into + ' / ' + BP_XP + ' XP to the next tier - every bit of pilot XP counts') + '</div></div>' +
      '<div class="stack" style="gap:6px;align-items:flex-end">' + (B.prem ? '<span class="rar" style="--rc:#fbbf24">PREMIUM ACTIVE</span>' : '<button class="btn gold' + (SAVE.cores < BP_COST ? ' off' : '') + '" data-act="bpbuy">UNLOCK PREMIUM - ' + fmt(BP_COST) + ' CORES</button>') + (claimable ? '<button class="btn sm" data-act="bpall">CLAIM ALL (' + claimable + ')</button>' : '') + '</div></div>' +
      '<div class="bp-rows"><div class="bp-lab"><span></span><b class="gold">PREMIUM</b><b>FREE</b></div><div class="bp-track" id="bpTrack">' + cols.join('') + '</div></div><p class="xs mut" style="margin-top:8px">Premium is bought with cores you earn in game. There is no real money anywhere in Aetheria.</p>'; }
  const [sc, sid] = (LV2.sel || '').split(':'), sel = sc && COS[sc] && COS[sc][sid];
  return '<div class="lay lk"><header class="lay-h"><h1 class="lay-t">' + (tab === 'shop' ? 'Item Shop' : tab === 'pass' ? 'Battle Pass' : 'Locker') + '</h1><div class="mm-seg" role="group"><button data-act="lktab:locker" class="' + (tab === 'locker' ? 'on' : '') + '">Locker</button><button data-act="lktab:shop" class="' + (tab === 'shop' ? 'on' : '') + '">Item Shop</button><button data-act="lktab:pass" class="' + (tab === 'pass' ? 'on' : '') + '">Battle Pass</button></div><span class="gold b">' + fmt(SAVE.cores) + ' <span class="xs mut">CORES</span></span></header>' +
    '<div class="lk-cols"><div class="lk-main">' + body + '</div><aside class="lk-side"><canvas id="lkCv"></canvas>' + (sel ? '<div class="lk-info"><b>' + escH(sel.nm) + '</b> ' + rarB(sel.r) + '<div class="xs mut">' + (CATS.find(c => c[0] === sc) || [0, ''])[1] + '</div>' + (own2(sc, sid) ? '<button class="btn sm gold" data-act="lkeq:' + sc + ':' + sid + '">EQUIP</button>' : '') + '</div>' : '<div class="lk-info xs mut">Tap any item to preview it here.</div>') + '</aside></div>' +
    '<footer class="lay-f"><button class="btn sm" data-act="back">Back</button><span class="xs mut">Tap once to preview, tap again to equip</span></footer></div>';
};
Object.assign(ACT, {
  cos() { UI.show('scLocker'); }, locker() { UI.show('scLocker'); },
  lktab(a) { LV2.tab = a[0]; UI.refresh(); if (a[0] === 'pass') setTimeout(() => { const T = document.getElementById('bpTrack'), n = document.querySelector('.bp-col.next'); if (T && n) T.scrollLeft = n.offsetLeft - 160; }, 30); },
  lkcat(a) { LV2.cat = a[0]; UI.refresh(); },
  lksel(a) { const k = a[0] + ':' + a[1]; if (LV2.sel === k && own2(a[0], a[1])) { equip(a[0], a[1]); toast('EQUIPPED', COS[a[0]][a[1]].nm, RARX[COS[a[0]][a[1]].r | 0][1]); } LV2.sel = k; UI.refresh(); },
  lkeq(a) { if (equip(a[0], a[1])) { SFX.click(); UI.refresh(); } },
  shbuy(a) { const c = COS[a[0]][a[1]], k = a[0] + ':' + a[1]; if (LV2.sel !== k) { LV2.sel = k; UI.refresh(); return; } if (own2(a[0], a[1])) { equip(a[0], a[1]); UI.refresh(); return; } if (SAVE.cores < c.p) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= c.p; grant(a[0], a[1]); equip(a[0], a[1]); SFX.buy(); toast('NEW ' + RARX[c.r | 0][0].toUpperCase(), c.nm, RARX[c.r | 0][1]); UI.refresh(); },
  shbundle() { const b = shopToday().bundle, p = Math.round(b.items.reduce((s, [c, id]) => s + COS[c][id].p, 0) * (1 - b.off)); if (b.items.every(([c, id]) => own2(c, id)) || SAVE.cores < p) { SFX.no(); return; } SAVE.cores -= p; b.items.forEach(([c, id]) => grant(c, id)); saveGame(); SFX.buy(); toast('BUNDLE UNLOCKED', b.items.length + ' items added to your Locker', '#fbbf24'); UI.refresh(); },
  bpbuy() { const B = BP(); if (B.prem || SAVE.cores < BP_COST) { SFX.no(); return; } SAVE.cores -= BP_COST; B.prem = true; saveGame(); toast('PREMIUM PASS UNLOCKED', 'Claim every premium reward you have reached', '#fbbf24'); UI.refresh(); },
  bpclaim(a) { const r = bpClaim(a[0], +a[1]); if (r) { SFX.buy(); toast('TIER ' + a[1] + ' REWARD', r.cos ? COS[r.cos[0]][r.cos[1]].nm : '+' + fmt(r.cores) + ' cores', r.cos ? RARX[COS[r.cos[0]][r.cos[1]].r | 0][1] : '#fbbf24'); UI.refresh(); } },
  bpall() { let n = 0; for (let k = 1; k <= bpTier(); k++) { if (bpClaim('f', k)) n++; if (BP().prem && bpClaim('p', k)) n++; } if (n) { SFX.buy(); toast('REWARDS CLAIMED', n + ' rewards', '#c084fc'); } UI.refresh(); }
});
// the main menu: banner + title on the pilot card, and the Locker button opens this
const _scMenuS = SCR.scMenu;
SCR.scMenu = () => { let h = _scMenuS(); try { const P = PC(), bn = COS.banner[P.banner], ti = COS.title[P.title]; if (bn && P.banner !== 'none') h = h.replace('<aside class="mm-card">', '<aside class="mm-card" style="background:linear-gradient(110deg,' + bn.g.map(c => c + 'cc').join(',') + ')">'); if (ti && P.title !== 'none') h = h.replace('<span class="mm-rank">', '<span class="mm-title" style="color:' + RARX[ti.r | 0][1] + '">' + escH(ti.nm) + '</span><span class="mm-rank">'); const B = BP(), cl = (() => { let k = 0; for (let n = 1; n <= bpTier(); n++) { if (!B.got.f[n]) k++; if (B.prem && !B.got.p[n]) k++; } return k; })(); h = h.replace("title=\"Cosmetics\" aria-label=\"Cosmetics\">", "title=\"Locker\" aria-label=\"Locker\">"); if (cl) h = h.replace('<span>Cosmetics</span>', '<span>Locker</span><b>' + cl + '</b>'); else h = h.replace('<span>Cosmetics</span>', '<span>Locker</span>'); } catch (e) { } return h; };

const _showS = UI.show.bind(UI);
UI.show = function (id, nh) { const r = _showS(id, nh); try { if (R3 && G.scene !== 'play' && (id === 'scLocker' || id === 'scBase' || id === 'scGalaxy' || id === 'scTheater')) R3.setView('off'); } catch (e) { } return r; };
