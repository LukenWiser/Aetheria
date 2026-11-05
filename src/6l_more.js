// ================= MORE COSMETICS: 3D ship bodies, hats, pets, engine glows, trail effects, and a lot more of everything =================
(function () {
  const add = (cat, id, o) => { COS[cat] = COS[cat] || {}; COS[cat][id] = Object.assign({ src: 'shop', p: RARX[o.r || 0][2] }, o); };
  add('body', 'none', { nm: 'Hull Default', p: 0, r: 0, src: 'starter' });
  [['shark', 'Shark', 2], ['needle', 'Needle', 1], ['bulldog', 'Bulldog', 1], ['saucer', 'Flying Saucer', 3], ['beetle', 'Beetle', 2], ['manta', 'Manta', 3], ['twinboom', 'Twin Boom', 2], ['crystal', 'Crystal Shard', 3], ['arrow', 'Arrowhead', 1], ['rocket', 'Retro Rocket', 2], ['stingray', 'Stingray', 2], ['bubble', 'Bubble Pod', 1]].forEach(s => add('body', s[0], { nm: s[1], r: s[2] }));
  add('hat', 'none', { nm: 'No Hat', p: 0, r: 0, src: 'starter' });
  [['tophat', 'Top Hat', 1], ['crown', 'Crown', 3], ['cowboy', 'Space Cowboy', 2], ['party', 'Party Hat', 0], ['halo', 'Halo', 2], ['horns', 'Horns', 1], ['antenna', 'Antenna', 0], ['wizard', 'Wizard Hat', 2], ['viking', 'Raider Helm', 2], ['propeller', 'Propeller Cap', 1], ['chef', 'Chef Hat', 0], ['bunny', 'Bunny Ears', 1], ['tricorne', 'Tricorne', 2], ['headphones', 'Headphones', 1], ['catears', 'Cat Ears', 1], ['flower', 'Flower', 0], ['cone', 'Traffic Cone', 0], ['gradcap', 'Grad Cap', 1]].forEach(s => add('hat', s[0], { nm: s[1], r: s[2] }));
  add('pet', 'none', { nm: 'No Pet', p: 0, r: 0, src: 'starter' });
  [['cat', 'Space Cat', 2], ['pup', 'Star Pup', 2], ['owl', 'Night Owl', 1], ['jelly', 'Jelly', 2], ['ufo', 'Mini UFO', 1], ['slime', 'Slime', 1], ['dragon', 'Dragonling', 3], ['penguin', 'Penguin', 2], ['ghost', 'Ghosty', 1], ['fish', 'Goldfish', 0], ['robot', 'Bolt Bot', 1], ['star', 'Lucky Star', 0], ['duck', 'Rubber Duck', 0]].forEach(s => add('pet', s[0], { nm: s[1], r: s[2] }));
  add('engine', 'none', { nm: 'Accent Glow', p: 0, r: 0, src: 'starter' });
  [['white', 'White Hot', '#f8fafc', 0], ['blue', 'Blue Flame', '#3b82f6', 0], ['green', 'Toxic Burn', '#4ade80', 1], ['pink', 'Pink Nitro', '#f472b6', 1], ['gold', 'Gold Rush', '#fbbf24', 2], ['red', 'Red Line', '#ef4444', 0], ['void', 'Void Burn', '#7c3aed', 2], ['cyan', 'Ion Blue', '#22d3ee', 0], ['orange', 'Afterburner', '#fb923c', 1], ['lime', 'Neon Lime', '#a3e635', 1], ['rose', 'Rose Fire', '#fb7185', 2], ['ice', 'Ice Thruster', '#bae6fd', 2]].forEach(s => add('engine', s[0], { nm: s[1], c: s[2], r: s[3] }));
  add('trailfx', 'none', { nm: 'No Effect', p: 0, r: 0, src: 'starter' });
  [['sparkle', 'Sparkles', '#fde68a', 1], ['bubbles', 'Bubbles', '#7dd3fc', 0], ['pixels', 'Pixel Dust', '#a3e635', 1], ['hearts', 'Hearts', '#fb7185', 1], ['notes', 'Music Notes', '#c4b5fd', 2], ['smoke', 'Smoke', '#94a3b8', 0], ['lightning', 'Lightning', '#a5b4fc', 2], ['ribbon', 'Ribbon', '#f472b6', 2], ['petals', 'Petals', '#f9a8d4', 1], ['snow', 'Snowfall', '#e0f2fe', 1], ['embers', 'Embers', '#fb923c', 1], ['coins', 'Coin Shower', '#fbbf24', 3], ['binary', 'Binary', '#4ade80', 2], ['comet', 'Comet Tail', '#67e8f9', 3], ['rainbow', 'Rainbow Road', 'rb', 3]].forEach(s => add('trailfx', s[0], { nm: s[1], c: s[2], r: s[3] }));
  // more of the existing kinds
  [['crimsonw', 'Crimson Wing', ['#7f1d1d', '#f87171'], 1], ['seafoam', 'Seafoam', '#5eead4', 0], ['lavender', 'Lavender', '#c4b5fd', 0], ['inferno', 'Inferno', ['#ef4444', '#fb923c', '#fde047'], 2], ['galaxy', 'Galaxy', ['#1e1b4b', '#7c3aed', '#22d3ee'], 3]].forEach(s => add('trail', s[0], { nm: s[1], c: s[2], r: s[3] }));
  [['mintb', 'Mint', '#6ee7b7', 0], ['sky', 'Sky', '#7dd3fc', 0], ['magma', 'Magma', ['#ef4444', '#fb923c'], 1], ['frost', 'Frostbite', ['#e0f2fe', '#38bdf8'], 1], ['venomb', 'Venom', ['#365314', '#a3e635'], 2], ['royalb', 'Royal', ['#4c1d95', '#fbbf24'], 2], ['prism', 'Prism', 'rb', 3]].forEach(s => add('bullet', s[0], { nm: s[1], c: s[2], r: s[3] }));
  [['wings', 'Light Wings', '#fef3c7', 'crown', 3], ['toxic', 'Toxic Cloud', '#84cc16', 'glow', 1], ['rose', 'Rose Ring', '#fb7185', 'halo', 1], ['sun', 'Sunburst', '#fde047', 'glow', 2], ['ocean', 'Tide Ring', '#22d3ee', 'orbit', 2], ['shadow', 'Shadow', '#4c1d95', 'void', 2], ['spark', 'Spark Field', '#e0e7ff', 'storm', 1], ['fireflies', 'Fireflies', '#bef264', 'orbit', 1]].forEach(s => add('aura', s[0], { nm: s[1], c: s[2], type: s[3], r: s[4] }));
  [['shock', 'Shockwave', 1], ['bubblepop', 'Bubble Pop', 0], ['petalburst', 'Petal Burst', 1], ['gold', 'Gold Coins', 2], ['ink', 'Ink Splash', 1], ['supercell', 'Supercell', 3]].forEach(s => add('kfx', s[0], { nm: s[1], r: s[2] }));
  [['lime', 'Lime', '#a3e635', 0], ['ocean', 'Ocean', '#0ea5e9', 0], ['ruby', 'Ruby', '#e11d48', 1], ['gold', 'Gold', '#fbbf24', 2], ['shadow', 'Shadow', '#6d28d9', 2], ['ice', 'Ice', '#e0f2fe', 1]].forEach(s => add('dskin', s[0], { nm: s[1], c: s[2], r: s[3] }));
  [['ember', 'Ember', ['#450a0a', '#dc2626', '#f97316'], 1], ['deepsea', 'Deep Sea', ['#020617', '#075985', '#0d9488'], 1], ['candy', 'Candy', ['#f9a8d4', '#a5f3fc'], 0], ['forest', 'Forest', ['#14532d', '#365314'], 0], ['synth', 'Synthwave', ['#2e1065', '#db2777', '#f59e0b'], 2], ['glitch', 'Glitch', ['#000000', '#ff2bd6', '#22d3ee'], 2], ['blackhole', 'Event Horizon', ['#000000', '#7c2d12', '#000000'], 3], ['frost', 'Frost', ['#e0f2fe', '#7dd3fc'], 1], ['royal', 'Royal', ['#1e1b4b', '#4c1d95', '#a16207'], 2], ['mono', 'Mono', ['#18181b', '#52525b'], 0]].forEach(s => add('banner', s[0], { nm: s[1], g: s[2], r: s[3] }));
  [['pilot', 'Hotshot', 0], ['captain', 'Captain', 1], ['admiral', 'Admiral', 2], ['glitch', 'Glitch Hunter', 2], ['collector', 'Collector', 1], ['dragon', 'Dragon Rider', 2], ['stargazer', 'Stargazer', 0], ['comet', 'Comet Chaser', 1], ['void', 'Void Walker', 3], ['tycoon', 'Core Tycoon', 2], ['menace', 'Menace', 1], ['chill', 'Totally Chill', 0], ['mvp', 'MVP', 3], ['goat', 'G.O.A.T.', 3], ['sniper', 'Sharpshooter', 1]].forEach(s => add('title', s[0], { nm: s[1], r: s[2] }));
  [['skin', 'neonnight', { nm: 'Neon Night', cfg: { paint: '#0f172a', accent: '#f472b6', finish: 'neon' }, r: 2 }], ['skin', 'sandstorm', { nm: 'Sandstorm', cfg: { paint: '#d6a35c', accent: '#7c2d12', finish: 'matte' }, r: 0 }], ['skin', 'glacier', { nm: 'Glacier', cfg: { paint: '#bae6fd', accent: '#0369a1', finish: 'pearl' }, r: 1 }], ['skin', 'bumblebee', { nm: 'Bumblebee', cfg: { paint: '#facc15', accent: '#111827', finish: 'chrome' }, r: 1 }], ['skin', 'nebulas', { nm: 'Nebula', cfg: { paint: '#3b0764', accent: '#22d3ee', finish: 'neon' }, r: 2 }], ['skin', 'carbon', { nm: 'Carbon Fiber', cfg: { paint: '#27272a', accent: '#a3a3a3', finish: 'carbon' }, r: 1 }]].forEach(([c, id, o]) => add(c, id, o));
})();
CATS.splice(1, 0, ['body', 'Ship Bodies'], ['hat', 'Hats'], ['pet', 'Pets'], ['engine', 'Engine Glows'], ['trailfx', 'Trail Effects']);
const CFGCAT = { body: 'body', hat: 'hat', pet: 'pet', engine: 'flame' }, CAT3D = { skin: 1, body: 1, hat: 1, pet: 1, engine: 1 };
// equip: the 3D kinds live on the ship's own config, so they show in every mode (and online)
const _equipM = equip;
equip = function (cat, id) { if (!CFGCAT[cat]) return _equipM(cat, id); const c = COS[cat][id]; if (!c || !own2(cat, id)) return false; const cf = SAVE.pl[0].cfg, k = CFGCAT[cat]; if (id === 'none') delete cf[k]; else cf[k] = cat === 'engine' ? c.c : id; PC()[cat] = id; saveGame(); return true; };
// auras now share a few looks; draw by type
const _drawAuraM = drawAura;
Object.defineProperty(COS.aura, '__t', { value: {}, writable: true, enumerable: false, configurable: true });
drawAura = function (g, x, y, id, t, s) { const A = COS.aura[id]; if (A && A.type) { const tmp = A.type === 'glow' ? 'frost' : A.type; COS.aura.__t = Object.assign({}, COS.aura[tmp] || {}, { c: A.c }); return _drawAuraM(g, x, y, A.type === 'glow' ? 'frost' : A.type, t, s, A.c); } return _drawAuraM(g, x, y, id, t, s); };
const _killFxM = killFx;
killFx = function (e) { const k = PS().cos.kfx; if (SET.reduce) return;
  if (k === 'shock') { shock(e.x, e.y, '#e0f2fe', e.w * 2, 16); shock(e.x, e.y, '#38bdf8', e.w * 1.2, 10); }
  else if (k === 'bubblepop') { for (let i = 0; i < 10; i++) pcl({ x: e.x + rnd(-20, 20), y: e.y + rnd(-20, 20), vx: rnd(-1, 1), vy: rnd(-2, 0), l: 36, l0: 36, c: '#7dd3fc', r: rnd(3, 7), k: 0, fr: .97 }); }
  else if (k === 'petalburst') { for (let i = 0; i < 14; i++) pcl({ x: e.x, y: e.y, vx: rnd(-3, 3), vy: rnd(-3, 1), l: 50, l0: 50, c: pick(['#f9a8d4', '#fbcfe8', '#fda4af']), r: 3, k: 0, fr: .95 }); }
  else if (k === 'gold') { for (let i = 0; i < 12; i++) pcl({ x: e.x, y: e.y, vx: rnd(-3, 3), vy: rnd(-5, -1), l: 46, l0: 46, c: '#fbbf24', r: 3.2, k: 0, fr: .97, g: .15 }); }
  else if (k === 'ink') { for (let i = 0; i < 12; i++) pcl({ x: e.x, y: e.y, vx: rnd(-4, 4), vy: rnd(-4, 4), l: 30, l0: 30, c: '#1e1b4b', r: rnd(4, 9), k: 0, fr: .88 }); }
  else if (k === 'supercell') { shock(e.x, e.y, '#a5b4fc', e.w * 2.4, 20); for (let i = 0; i < 4; i++) G.ent.bm.push({ k: 'arc', x: e.x, y: e.y, x2: e.x + rnd(-110, 110), y2: e.y + rnd(-110, 110), l: 12, l0: 12 }); }
  else _killFxM(e); };

// ---------- trail effects behind your ship ----------
const TFX = [];
function tfxEmit(p, id, t) {
  const c = COS.trailfx[id], col = c ? cycleC(c.c, t) : '#fff', x = p.x - 30, y = p.y + rnd(-6, 6), k = id;
  if (t % (k === 'ribbon' || k === 'lightning' || k === 'comet' || k === 'rainbow' ? 1 : 3)) return;
  TFX.push({ k, x, y, vx: -2 - Math.random() * 2, vy: k === 'snow' || k === 'coins' ? rnd(.3, 1.2) : k === 'bubbles' || k === 'embers' || k === 'notes' ? rnd(-1.2, -.2) : rnd(-.5, .5), l: k === 'ribbon' || k === 'rainbow' ? 26 : 40, l0: k === 'ribbon' || k === 'rainbow' ? 26 : 40, c: col, r: rnd(.7, 1.3), s: k === 'binary' ? (Math.random() < .5 ? '0' : '1') : '' });
  if (TFX.length > 220) TFX.splice(0, TFX.length - 220);
}
function tfxDraw(g) {
  if (!TFX.length) return; g.save();
  const lines = {}; for (const f of TFX) { if (f.k === 'ribbon' || f.k === 'lightning' || f.k === 'rainbow') (lines[f.k] = lines[f.k] || []).push(f); }
  for (let i = TFX.length - 1; i >= 0; i--) { const f = TFX[i]; f.x += f.vx; f.y += f.vy; f.l--; if (f.l <= 0) { TFX.splice(i, 1); continue; } const a = f.l / f.l0, s = f.r; g.globalAlpha = a;
    switch (f.k) {
      case 'sparkle': g.fillStyle = f.c; g.save(); g.translate(f.x, f.y); g.rotate(f.l * .2); g.beginPath(); for (let k = 0; k < 8; k++) { const rr = k % 2 ? 1.6 * s : 5 * s; g.lineTo(Math.cos(k * PI / 4) * rr, Math.sin(k * PI / 4) * rr); } g.fill(); g.restore(); break;
      case 'bubbles': g.strokeStyle = f.c; g.lineWidth = 1.4; g.beginPath(); g.arc(f.x, f.y, 4 * s + (1 - a) * 4, 0, TAU); g.stroke(); break;
      case 'pixels': g.fillStyle = f.c; g.fillRect(f.x, f.y, 4 * s, 4 * s); break;
      case 'hearts': g.fillStyle = f.c; g.save(); g.translate(f.x, f.y); g.scale(s, s); g.beginPath(); g.moveTo(0, 3); g.bezierCurveTo(-6, -2, -3, -7, 0, -3); g.bezierCurveTo(3, -7, 6, -2, 0, 3); g.fill(); g.restore(); break;
      case 'notes': g.fillStyle = f.c; g.font = '700 ' + Math.round(12 * s) + 'px system-ui'; g.fillText(f.l % 2 ? '♪' : '♫', f.x, f.y); break;
      case 'smoke': g.fillStyle = f.c; g.globalAlpha = a * .35; g.beginPath(); g.arc(f.x, f.y, 5 + (1 - a) * 14, 0, TAU); g.fill(); break;
      case 'petals': g.fillStyle = f.c; g.save(); g.translate(f.x, f.y); g.rotate(f.l * .15); g.beginPath(); g.ellipse(0, 0, 4 * s, 2 * s, 0, 0, TAU); g.fill(); g.restore(); break;
      case 'snow': g.fillStyle = f.c; g.beginPath(); g.arc(f.x, f.y, 2 * s, 0, TAU); g.fill(); break;
      case 'embers': g.globalCompositeOperation = 'lighter'; drawGlow(g, f.x, f.y, 5 * s, f.c, a); g.globalCompositeOperation = 'source-over'; break;
      case 'coins': g.fillStyle = f.c; g.save(); g.translate(f.x, f.y); g.scale(Math.abs(Math.cos(f.l * .2)) + .15, 1); g.beginPath(); g.arc(0, 0, 4 * s, 0, TAU); g.fill(); g.fillStyle = '#b45309'; g.fillRect(-1, -2, 2, 4); g.restore(); f.vy += .05; break;
      case 'binary': g.fillStyle = f.c; g.font = '700 11px monospace'; g.fillText(f.s, f.x, f.y); break;
      case 'comet': g.globalCompositeOperation = 'lighter'; drawGlow(g, f.x, f.y, 14 * a + 4, f.c, a * .7); g.globalCompositeOperation = 'source-over'; break;
    } }
  g.globalAlpha = 1; g.lineCap = 'round';
  for (const k in lines) { const L = lines[k]; if (L.length < 2) continue; g.globalCompositeOperation = 'lighter';
    if (k === 'lightning') { g.strokeStyle = L[0].c; g.lineWidth = 2; g.beginPath(); L.forEach((f, i) => { const yy = f.y + (Math.random() - .5) * 10; i ? g.lineTo(f.x, yy) : g.moveTo(f.x, yy); }); g.stroke(); }
    else for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i]; g.strokeStyle = k === 'rainbow' ? RAINBOW[i % RAINBOW.length] : a.c; g.globalAlpha = b.l / b.l0; g.lineWidth = (k === 'rainbow' ? 8 : 5) * (b.l / b.l0); g.beginPath(); g.moveTo(a.x, a.y + Math.sin(a.l * .3) * 4); g.lineTo(b.x, b.y + Math.sin(b.l * .3) * 4); g.stroke(); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
  g.restore();
}
const _ctM = combatTick;
combatTick = function (p, o) { const r = _ctM.apply(this, arguments); try { if (p === G.players[0] && !G.net && p.alive && !SET.reduce) { const id = PC().trailfx; if (id && id !== 'none') tfxEmit(p, id, G.t); } } catch (e) { } return r; };
const _dmM = drawMeta;
drawMeta = function (g, t) { try { tfxDraw(g); } catch (e) { } return _dmM.apply(this, arguments); };
const _beginM = beginRun; beginRun = function (o) { TFX.length = 0; return _beginM.apply(this, arguments); };

// ---------- the Locker shows 3D items on your real ship ----------
function lkCfg() { const cf = Object.assign({}, SAVE.pl[0].cfg), [c, id] = (LV2.sel || '').split(':'); if (!c || !COS[c] || !COS[c][id]) return cf; const it = COS[c][id];
  if (c === 'skin') Object.assign(cf, it.cfg); else if (CFGCAT[c]) { if (id === 'none') delete cf[CFGCAT[c]]; else cf[CFGCAT[c]] = c === 'engine' ? it.c : id; } return cf; }
const _showM = UI.show.bind(UI);
UI.show = function (id, nh) { const r = _showM(id, nh); try { if (id === 'scLocker' && R3 && G.scene !== 'play') { const sc = (LV2.sel || '').split(':')[0], d3 = LV2.tab === 'locker' ? CAT3D[LV2.cat] : CAT3D[sc]; if (d3) { G.showCfg = lkCfg(); G.showF = { k: .095, x: .775, y: .34, ny: .2 }; R3.setView('hangar'); document.body.classList.add('lk3d'); } else { R3.setView('off'); document.body.classList.remove('lk3d'); } } else document.body.classList.remove('lk3d'); if (id !== 'scLocker') G.showF = null; } catch (e) { } return r; };
const _swM = swatch;
swatch = function (cat, id) { const c = COS[cat][id] || {}; if (cat === 'body' || cat === 'hat' || cat === 'pet') return 'radial-gradient(circle at 50% 40%,' + RARX[c.r | 0][1] + '55,#0b1222 70%)'; if (cat === 'engine') return id === 'none' ? 'radial-gradient(circle,' + (SAVE.pl[0].cfg.accent || '#22d3ee') + ',#0b1222 65%)' : 'radial-gradient(circle,#fff 5%,' + c.c + ' 30%,#0b1222 70%)'; if (cat === 'trailfx') return c.c === 'rb' ? 'linear-gradient(90deg,' + RAINBOW.join(',') + ')' : 'linear-gradient(90deg,#0b1222,' + c.c + ')'; return _swM(cat, id); };
const ICO3 = { body: '<svg viewBox="0 0 64 40"><path d="M6 20 L40 8 L58 20 L40 32 Z" fill="none" stroke="#fff" stroke-width="2"/><path d="M30 12 L22 2 M30 28 L22 38" stroke="#fff" stroke-width="2"/></svg>', hat: '<svg viewBox="0 0 64 40"><rect x="20" y="6" width="24" height="22" rx="2" fill="none" stroke="#fff" stroke-width="2"/><path d="M10 30 H54" stroke="#fff" stroke-width="3"/></svg>', pet: '<svg viewBox="0 0 64 40"><circle cx="32" cy="22" r="12" fill="none" stroke="#fff" stroke-width="2"/><path d="M23 13 L22 3 L29 10 M41 13 L42 3 L35 10" stroke="#fff" stroke-width="2" fill="none"/><circle cx="28" cy="21" r="1.6" fill="#fff"/><circle cx="36" cy="21" r="1.6" fill="#fff"/></svg>' };
const _icM = itemCard;
itemCard = function (cat, id, o) { let h = _icM(cat, id, o); if (ICO3[cat] && id !== 'none') h = h.replace('"></i><b>', '">' + ICO3[cat] + '<em>' + escH(COS[cat][id].nm) + '</em></i><b>'); return h; };
// Battle Pass now also hands out 3D items
const _bpRM = bpReward;
bpReward = function (tr, n) { const X = tr === 'f' ? { 12: ['hat', 'party'], 22: ['trailfx', 'sparkle'], 32: ['pet', 'duck'], 42: ['engine', 'white'] } : { 2: ['hat', 'tophat'], 5: ['pet', 'cat'], 9: ['trailfx', 'notes'], 14: ['body', 'shark'], 17: ['engine', 'void'], 24: ['hat', 'wizard'], 27: ['pet', 'jelly'], 34: ['trailfx', 'comet'], 39: ['body', 'manta'], 44: ['pet', 'dragon'], 47: ['hat', 'crown'] }; return X[n] ? { cos: X[n] } : _bpRM(tr, n); };
