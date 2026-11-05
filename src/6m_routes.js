// ================= EXPEDITION 2: themed world maps, branching routes and 7 extra sectors per world =================
// Branch sectors use indices 13-19 so every save, medal, ghost and star keeps working.
const BR = [ // i: sector index, p: parent sector, t: kind, j: spine sector it rejoins (-1 = dead end), lane: -2/-1 above the main path, 1/2 below, k: step along the branch
  { i: 13, p: 1, t: 'n', j: -1, lane: -2, k: 1 }, { i: 14, p: 13, t: 'g', j: -1, lane: -2, k: 2 },
  { i: 15, p: 2, t: 'q', j: 5, lane: 2, k: 1 }, { i: 16, p: 15, t: 'e', j: 5, lane: 2, k: 2 },
  { i: 17, p: 4, t: 'e', j: -1, lane: -1, k: 1 }, { i: 18, p: 17, t: 'x', j: -1, lane: -1, k: 2 }, { i: 19, p: 18, t: 'v', j: -1, lane: -1, k: 3 },
  { i: 20, p: 6, t: 'n', j: -1, lane: 1, k: 1 }, { i: 21, p: 20, t: 'g', j: -1, lane: 1, k: 2 },
  { i: 22, p: 7, t: 'q', j: 10, lane: -2, k: 1 }, { i: 23, p: 22, t: 'n', j: 10, lane: -2, k: 2 },
  { i: 24, p: 9, t: 'e', j: -1, lane: 2, k: 1 }, { i: 25, p: 24, t: 'x', j: -1, lane: 2, k: 2 }, { i: 26, p: 25, t: 'v', j: -1, lane: 2, k: 3 },
  { i: 27, p: 16, t: 'g', j: -1, lane: 1, k: 3 }, { i: 28, p: 23, t: 'e', j: -1, lane: -1, k: 3 }
];
const BRLAB = { 13: 'DEAD END', 15: 'SHORTCUT', 17: 'DEEP ROUTE', 20: 'DEAD END', 22: 'SHORTCUT', 24: 'DEEP ROUTE', 27: 'HIDDEN', 28: 'HIDDEN' };
const brOf = i => BR.find(b => b.i === i);
const BRT = {
  n: { nm: 'SWARM NEST', ds: 'A nest has hatched: far more enemies, each one weaker.', ic: 'multi' },
  g: { nm: 'TREASURE RUN', ds: 'A golden elite is guaranteed and loot is doubled.', ic: 'coin' },
  e: { nm: 'ACE DUEL', ds: 'Elite squadrons only. Hard, but they drop more.', ic: 'target' },
  x: { nm: 'THE GAUNTLET', ds: 'Elites and hazards together, wave after wave.', ic: 'x' },
  v: { nm: 'SECTOR CACHE', ds: 'The end of the deep route: a fortified cache with a huge one-time reward.', ic: 'star' },
  q: { nm: 'STORM RUN', ds: 'A short, fast run straight through a hazard storm.', ic: 'bolt' }
};
const BRN = ['Hideout', 'Hollow', 'Backroad', 'Outpost', 'Nest', 'Cache', 'Rift', 'Undercroft', 'Overlook', 'Drift'];
const brName = (w, b) => { const W = WORLDS[w]; return (W.A ? W.A[(b.i * 3 + w) % W.A.length] : 'Lost') + ' ' + BRN[(b.i + w * 2) % BRN.length]; };
const _lsBr = levelSpec;
levelSpec = function (w, i, tier, alt) {
  const b = brOf(i); if (!b) return _lsBr(w, i, tier, alt);
  const depth = Math.min(LV - 2, b.p + b.k), base = _lsBr(w, depth, tier), T = b.t, u = T === 'n' ? 'c' : T === 'q' ? 'h' : T === 'v' ? 'x' : T;
  return Object.assign(base, { i, type: u, bt: T, br: 1, name: brName(w, b), seed: w * 977 + i * 131 + tier, rs: seeded(w * 977 + i * 131 + tier * 7919 + 13), waves: T === 'q' ? 3 : T === 'v' ? 6 : T === 'x' ? 5 + Math.floor(depth / 4) : 4 + Math.floor(depth / 4), diff: base.diff + (T === 'v' ? .3 : T === 'x' || T === 'e' ? .15 : 0) });
};
const _beginBr = beginRun;
beginRun = function (o) { const r = _beginBr.apply(this, arguments); try { const R = G.run, sp = R && R.spec; if (sp && sp.br) { if (sp.bt === 'n') { R.hpm *= .65; R.swarm = 1.6; } if (sp.bt === 'v') R.lootM = (R.lootM || 1) * 2.5; if (sp.bt === 'e') R.lootM = (R.lootM || 1) * 1.4; } } catch (e) { } return r; };
const brOpen = (arr, i) => { const b = brOf(i); return b ? !!arr[b.p] : true; };
function brNextOf(i) { if (i < LV) return i + 1 < LV ? i + 1 : null; const c = BR.find(b => b.p === i); return c ? c.i : null; }
// first clears of side routes pay a bonus; the Sector Cache pays a lot
const _resBr = UI.result;
UI.result = function (d) { try { const R = G.run; if (d && R && d.mode === 'expedition' && d.win && R.lv >= LV && !d.brDone) { d.brDone = 1; const k = R.w + ':' + R.lv + ':' + (R.tier || 1), F = SAVE.flags.br || (SAVE.flags.br = {}); d.next = brNextOf(R.lv); d.w = R.w; d.tier = R.tier; if (!F[k]) { F[k] = 1; const b = brOf(R.lv), n = Math.round((b.t === 'v' ? 600 + 150 * R.w : 120 + 40 * R.w) * (R.tier || 1)); SAVE.cores += n; d.brBonus = n; saveGame(); } } } catch (e) { } return _resBr.apply(this, arguments); };
const _lvlBr = ACT.lvl;
ACT.lvl = function (a) { const i = +a[0]; if (i >= LV) { const arr = prog(UI.w).done[UI.tier - 1] || []; if (!brOpen(arr, i) && !SAVE.devAll) { SFX.no(); alertMsg('CLEAR THE SECTOR THIS ROUTE BRANCHES FROM FIRST'); return; } UI.alt = null; UI.sel = i; SFX.click(); UI.refresh(); return; } return _lvlBr.apply(this, arguments); };

// ---------- themed world maps ----------
const WTH = ['skyline', 'vines', 'dunes', 'rings', 'vortex', 'peaks', 'gears', 'bubbles', 'grid', 'clock', 'orbit', 'islands', 'bolts', 'craters', 'pillars', 'glitch', 'rays'];
function wmDeco(type, W, H, c, rs) { // a few hundred bytes of SVG art per world, drawn behind the route
  let s = ''; const r = () => rs(), op = (a) => ' opacity="' + a + '"';
  switch (type) {
    case 'skyline': for (let x = 0; x < W; x += 30 + r() * 40) { const h = 40 + r() * 140, w = 24 + r() * 36; s += '<rect x="' + x + '" y="' + (H - h) + '" width="' + w + '" height="' + h + '" fill="' + c + '"' + op(.12 + r() * .1) + '/>'; for (let k = 0; k < 4; k++) s += '<rect x="' + (x + 4 + r() * (w - 8)) + '" y="' + (H - h + 8 + r() * (h - 16)) + '" width="3" height="3" fill="#fde68a"' + op(.5) + '/>'; } break;
    case 'vines': for (let k = 0; k < 14; k++) { const x = r() * W; s += '<path d="M' + x + ' 0 C ' + (x + 40) + ' 80, ' + (x - 40) + ' 160, ' + (x + 20) + ' ' + (120 + r() * 160) + '" stroke="' + c + '" stroke-width="' + (2 + r() * 4) + '" fill="none"' + op(.2) + '/>'; s += '<ellipse cx="' + (x + 10) + '" cy="' + (60 + r() * 120) + '" rx="10" ry="5" fill="' + c + '"' + op(.25) + '/>'; } break;
    case 'dunes': for (let k = 0; k < 4; k++) { const y = H - 30 - k * 40; let d = 'M0 ' + H + ' L0 ' + y; for (let x = 0; x <= W; x += 80) d += ' Q ' + (x + 40) + ' ' + (y - 30 - r() * 30) + ' ' + (x + 80) + ' ' + y; s += '<path d="' + d + ' L' + W + ' ' + H + ' Z" fill="' + c + '"' + op(.06 + k * .03) + '/>'; } s += '<circle cx="' + W * .8 + '" cy="60" r="40" fill="#fde68a"' + op(.18) + '/>'; break;
    case 'rings': s += '<circle cx="' + W * .7 + '" cy="' + H * .55 + '" r="120" fill="' + c + '"' + op(.12) + '/><ellipse cx="' + W * .7 + '" cy="' + H * .55 + '" rx="220" ry="34" stroke="' + c + '" stroke-width="6" fill="none"' + op(.22) + '/>'; for (let k = 0; k < 80; k++) s += '<circle cx="' + r() * W + '" cy="' + r() * H + '" r="' + r() * 1.5 + '" fill="#fff"' + op(.5) + '/>'; break;
    case 'vortex': for (let k = 1; k < 9; k++) s += '<ellipse cx="' + W * .5 + '" cy="' + H * .5 + '" rx="' + k * 70 + '" ry="' + k * 18 + '" stroke="' + c + '" stroke-width="2" fill="none"' + op(.25 - k * .02) + ' transform="rotate(' + (k * 4) + ' ' + W * .5 + ' ' + H * .5 + ')"/>'; s += '<circle cx="' + W * .5 + '" cy="' + H * .5 + '" r="22" fill="#000"' + op(.6) + '/>'; break;
    case 'peaks': for (let x = -40; x < W; x += 60 + r() * 60) { const h = 80 + r() * 150; s += '<path d="M' + x + ' ' + H + ' L' + (x + 70) + ' ' + (H - h) + ' L' + (x + 140) + ' ' + H + ' Z" fill="' + c + '"' + op(.12) + '/><path d="M' + (x + 52) + ' ' + (H - h + 40) + ' L' + (x + 70) + ' ' + (H - h) + ' L' + (x + 88) + ' ' + (H - h + 40) + ' Z" fill="#fff"' + op(.25) + '/>'; } for (let k = 0; k < 40; k++) s += '<circle cx="' + r() * W + '" cy="' + r() * H + '" r="1.6" fill="#fff"' + op(.5) + '/>'; break;
    case 'gears': case 'clock': for (let k = 0; k < 9; k++) { const x = r() * W, y = r() * H, R = 20 + r() * 50; s += '<circle cx="' + x + '" cy="' + y + '" r="' + R + '" stroke="' + c + '" stroke-width="' + (type === 'clock' ? 3 : 8) + '" stroke-dasharray="' + (type === 'clock' ? '2 10' : '10 8') + '" fill="none"' + op(.22) + '/>'; if (type === 'clock') s += '<line x1="' + x + '" y1="' + y + '" x2="' + (x + R * .7) + '" y2="' + (y - R * .3) + '" stroke="' + c + '" stroke-width="3"' + op(.3) + '/>'; } break;
    case 'bubbles': for (let k = 0; k < 50; k++) s += '<circle cx="' + r() * W + '" cy="' + r() * H + '" r="' + (2 + r() * 10) + '" stroke="' + c + '" stroke-width="1.5" fill="none"' + op(.3) + '/>'; for (let x = 0; x < W; x += 50) s += '<path d="M' + x + ' ' + H + ' q 10 -60 0 -' + (60 + r() * 60) + '" stroke="#10b981" stroke-width="4" fill="none"' + op(.25) + '/>'; break;
    case 'grid': for (let x = 0; x < W; x += 40) s += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + H + '" stroke="' + c + '"' + op(.08) + '/>'; for (let y = 0; y < H; y += 40) s += '<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="' + c + '"' + op(.08) + '/>'; for (let k = 0; k < 30; k++) s += '<rect x="' + Math.round(r() * W / 40) * 40 + '" y="' + Math.round(r() * H / 40) * 40 + '" width="40" height="40" fill="' + c + '"' + op(.08) + '/>'; break;
    case 'orbit': s += '<circle cx="' + W * .2 + '" cy="' + H * .8 + '" r="160" fill="' + c + '"' + op(.12) + '/>'; for (let k = 1; k < 4; k++) s += '<ellipse cx="' + W * .2 + '" cy="' + H * .8 + '" rx="' + (180 + k * 120) + '" ry="' + (60 + k * 40) + '" stroke="' + c + '" stroke-dasharray="4 8" fill="none"' + op(.25) + '/>'; break;
    case 'islands': for (let k = 0; k < 9; k++) { const x = r() * W, y = 40 + r() * (H - 80), w = 40 + r() * 70; s += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + w + '" ry="12" fill="' + c + '"' + op(.2) + '/><path d="M' + (x - w * .6) + ' ' + y + ' L' + x + ' ' + (y + w * .7) + ' L' + (x + w * .6) + ' ' + y + ' Z" fill="' + c + '"' + op(.12) + '/>'; } break;
    case 'bolts': for (let k = 0; k < 8; k++) { let x = r() * W, y = 0, d = 'M' + x + ' 0'; while (y < H) { x += (r() - .5) * 40; y += 20 + r() * 20; d += ' L' + x + ' ' + y; } s += '<path d="' + d + '" stroke="' + c + '" stroke-width="2" fill="none"' + op(.25) + '/>'; } break;
    case 'craters': for (let k = 0; k < 24; k++) { const x = r() * W, y = r() * H, R = 6 + r() * 28; s += '<circle cx="' + x + '" cy="' + y + '" r="' + R + '" fill="' + c + '"' + op(.08) + '/><path d="M' + (x - R) + ' ' + y + ' A ' + R + ' ' + R + ' 0 0 1 ' + (x + R) + ' ' + y + '" stroke="#fff" fill="none"' + op(.12) + '/>'; } break;
    case 'pillars': for (let x = 30; x < W; x += 120) s += '<rect x="' + x + '" y="40" width="26" height="' + (H - 40) + '" fill="' + c + '"' + op(.1) + '/><rect x="' + (x - 8) + '" y="34" width="42" height="10" fill="' + c + '"' + op(.16) + '/>'; break;
    case 'glitch': for (let k = 0; k < 40; k++) s += '<rect x="' + r() * W + '" y="' + r() * H + '" width="' + (20 + r() * 140) + '" height="' + (2 + r() * 8) + '" fill="' + (k % 2 ? '#ff2bd6' : '#22d3ee') + '"' + op(.18) + '/>'; break;
    case 'rays': for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; s += '<line x1="' + W * .5 + '" y1="' + H * .5 + '" x2="' + (W * .5 + Math.cos(a) * W) + '" y2="' + (H * .5 + Math.sin(a) * W) + '" stroke="' + c + '" stroke-width="' + (6 + (k % 3) * 6) + '"' + op(.06) + '/>'; } s += '<circle cx="' + W * .5 + '" cy="' + H * .5 + '" r="70" fill="' + c + '"' + op(.15) + '/>'; break;
  }
  return s;
}
const MPW = 1640, MPH = 384, LANEY = { '-2': 50, '-1': 116, '1': 268, '2': 334 }, sxy = i => [80 + i * 122, MPH / 2 + Math.sin(i * .85) * 30];
function nodeXY(i) { if (i < LV) return sxy(i); const b = brOf(i); let rt = b; while (rt.p >= LV) rt = brOf(rt.p); const [px] = sxy(rt.p), y = LANEY[b.lane]; if (b.j >= 0) { const [jx] = sxy(b.j), n = BR.filter(q => q.j === b.j && q.lane === b.lane).length; return [px + (jx - px) * b.k / (n + 1), y]; } return [px + b.k * 112, y]; }
const _scMapBr = SCR.scMap;
SCR.scMap = () => {
  if (UI.mode !== 'expedition') return _scMapBr();
  const w = UI.w; bgPrewarm(w); const W = WORLDS[w], pr = prog(w), tier = Math.min(UI.tier, pr.t), arr = pr.done[tier - 1] || [], B = BOSSES[w], ac = W.ac || '#22d3ee';
  let first = 0; while (first < LV && arr[first]) first++; if (SAVE.devAll) first = LV - 1;
  if (UI.sel === undefined || UI.sel === null || (UI.sel >= LV && !brOf(UI.sel))) UI.sel = Math.min(first, LV - 1);
  const avail = i => i < LV ? i <= first : (brOpen(arr, i) || SAVE.devAll), sel = UI.sel;
  const curve = (a, b, dash, on) => { const [x1, y1] = nodeXY(a), [x2, y2] = nodeXY(b), mx = (x1 + x2) / 2; return '<path d="M' + x1 + ' ' + y1 + ' C ' + mx + ' ' + y1 + ', ' + mx + ' ' + y2 + ', ' + x2 + ' ' + y2 + '" class="wm-p' + (on ? ' on' : '') + (dash ? ' br' : '') + '"/>'; };
  let paths = ''; for (let i = 0; i < LV - 1; i++) paths += curve(i, i + 1, 0, !!arr[i]);
  BR.forEach(b => { paths += curve(b.p, b.i, 1, !!arr[b.p]); const nx = BR.find(q => q.p === b.i); if (!nx && b.j >= 0) paths += curve(b.i, b.j, 1, !!arr[b.i]); });
  const node = i => { const [x, y] = nodeXY(i), b = brOf(i), t = b ? b.t : NODE_PAT[i], done = arr[i] | 0, av = avail(i), boss = t === 'B', md = medalAt(w, i, tier), cor = !b && glitchSpreading() && isCorrupt(w, i) && !(SAVE.flags.clean || {})[corruptKey(w, i)];
    const ic = b ? (ICO[BRT[t].ic] || ICO.star) : ICO[t] || ICO.c;
    return '<button class="node wm-n' + (boss ? ' bs' : '') + (b ? ' brn' : '') + (done ? ' dn' : av ? ' av' : ' lk') + (i === sel ? ' sel' : '') + (cor ? ' cor' : '') + '" style="left:' + x + 'px;top:' + y + 'px" data-act="lvl:' + i + '" title="' + (b ? BRT[t].nm : NODE_NAME[t]) + '">' + (av || done ? ic : ICO.lock) + '<span>' + (done ? '★'.repeat(done) : b ? '' : (i + 1)) + '</span>' + (md ? '<i class="mdl" style="background:' + MEDALS[md][1] + '"></i>' : '') + '</button>'; };
  let nodes = ''; for (let i = 0; i < LV; i++) nodes += node(i); BR.forEach(b => { nodes += node(b.i); });
  const rs = seeded(w * 101 + 7), deco = wmDeco(WTH[w] || 'rings', MPW, MPH, ac, rs);
  const b = brOf(sel), t = b ? b.t : NODE_PAT[sel], sp = levelSpec(w, sel, tier), ro = t === 'B' ? [] : rosterFor(w, Math.min(sel, LV - 2)).map(id => EN[id].nm), done = arr[sel] | 0, av = avail(sel), bonusK = w + ':' + sel + ':' + tier;
  const info = '<div class="wm-i"><div class="fl"><div class="wm-k" style="color:' + (b ? '#fbbf24' : ac) + '">' + (b ? 'SIDE ROUTE - ' + BRT[t].nm : 'SECTOR ' + (sel + 1) + ' - ' + NODE_NAME[t]) + '</div><h3 class="wm-nm">' + escH(sp.name) + '</h3>' +
    '<div class="xs mut wm-d">' + (t === 'B' ? 'BOSS: <b class="bad">' + B.nm + '</b> - ' + fmt(B.hp * (1 + (tier - 1) * .35)) + '+ HP, ' + B.ph.length + ' phases' : (b ? BRT[t].ds + '<br>' : '') + sp.waves + ' waves - ' + ro.join(', ') + (t === 'e' && !b ? ' - <b class="bad">ELITE: ' + EN[W.el].nm + '</b>' : '') + (t === 'h' ? ' - asteroid storm' : '') + (t === 's' ? ' - lighter waves, extra loot' : '')) +
    (b && !(SAVE.flags.br || {})[bonusK] ? '<br><b class="gold">First clear bonus: +' + fmt(Math.round((t === 'v' ? 600 + 150 * w : 120 + 40 * w) * tier)) + ' cores</b>' : '') + '</div></div>' +
    '<div class="wm-go">' + (done ? '<span class="wm-st">' + '★'.repeat(done) + '<span class="mut">' + '★'.repeat(3 - done) + '</span></span>' : '') + '<button class="btn big' + (av ? ' gold' : ' off') + '" data-act="start">' + (done ? 'REPLAY' : 'LAUNCH') + '</button></div></div>';
  const pills = WORLDS.map((x, i) => '<button class="wm-w' + (i === w ? ' on' : '') + (i >= SAVE.wu ? ' lk' : '') + '" style="--pc:' + (x.ac || '#22d3ee') + '" data-act="world:' + i + '" title="' + escH(x.nm) + '">' + (i >= SAVE.wu ? ICO.lock : '<b>' + (i + 1) + '</b>') + '</button>').join('');
  const tierSeg = pr.t > 1 ? '<div class="seg wm-tier">' + [1, 2, 3].map(n => '<button data-act="tier:' + n + '" class="' + (n === tier ? 'on' : '') + '"' + (n > pr.t ? ' disabled style="opacity:.35"' : '') + '>TIER ' + n + '</button>').join('') + '</div>' : '';
  const nDone = arr.filter(Boolean).length, nAll = LV + BR.length;
  return '<div class="wm" style="--wc:' + ac + ';--wb1:' + (W.col ? W.col[0] : '#030712') + ';--wb2:' + (W.col ? W.col[1] : '#0f172a') + '"><header class="wm-h"><span class="wm-num">' + String(w + 1).padStart(2, '0') + '</span><div class="fl"><div class="wm-k">WORLD ' + (w + 1) + ' OF ' + WORLDS.length + (tier > 1 ? ' - TIER ' + tier + ' REMIX' : '') + '</div><h2 class="wm-t">' + escH(W.nm) + '</h2><div class="xs wm-sub">' + escH(W.sub) + '</div></div>' +
    '<div class="wm-side">' + tierSeg + '<div class="wm-bs"><span class="xs mut">WORLD BOSS</span><b>' + escH(B.nm) + '</b></div><div class="xs mut">' + nDone + ' / ' + nAll + ' sectors cleared</div></div></header>' +
    '<nav class="wm-ws">' + pills + '</nav>' +
    '<div class="wm-map" id="mapScroll"><div class="wm-in" style="width:' + MPW + 'px;height:' + MPH + 'px"><svg class="wm-deco" viewBox="0 0 ' + MPW + ' ' + MPH + '" width="' + MPW + '" height="' + MPH + '" aria-hidden="true">' + deco + '</svg><svg class="wm-paths" viewBox="0 0 ' + MPW + ' ' + MPH + '" width="' + MPW + '" height="' + MPH + '" aria-hidden="true">' + paths + '</svg>' + nodes +
    Object.keys(BRLAB).map(k => { const [x, y] = nodeXY(+k); return '<span class="wm-lab" style="left:' + x + 'px;top:' + (y < MPH / 2 ? y - 44 : y + 30) + 'px">' + BRLAB[k] + '</span>'; }).join('') + '</div></div>' + info +
    '<footer class="wm-f"><button class="btn sm" data-act="back">Back</button><span class="xs mut">Main path to the boss unlocks the next world. Side routes branch off for extra rewards - dashed lines show where they rejoin.</span></footer></div>';
};
const _startBr = ACT.start;
ACT.start = function () { if (UI.mode === 'expedition' && UI.sel >= LV) { const arr = prog(UI.w).done[UI.tier - 1] || []; if (!brOpen(arr, UI.sel) && !SAVE.devAll) { SFX.no(); return; } startLevel(UI.w, UI.sel, UI.tier, false); return; } if (UI.mode === 'expedition') { const arr = prog(UI.w).done[UI.tier - 1] || []; let f = 0; while (f < LV && arr[f]) f++; if (UI.sel > f && !SAVE.devAll) { SFX.no(); return; } } return _startBr.apply(this, arguments); };
