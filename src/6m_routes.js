// ================= EXPEDITION 2: themed world maps with a random route tree per world =================
// Every world gets its own seeded map: the main path wanders between five lanes, side routes split off, dead-end,
// cross over and rejoin. Nodes sit on a grid (one per cell) so nothing can ever overlap. Branch sectors use indices 13-28.
const BRT = {
  n: { nm: 'SWARM NEST', ds: 'A nest has hatched: far more enemies, each one weaker.', ic: 'multi' },
  g: { nm: 'TREASURE RUN', ds: 'A golden elite is guaranteed and loot is doubled.', ic: 'coin' },
  e: { nm: 'ACE DUEL', ds: 'Elite squadrons only. Hard, but they drop more.', ic: 'target' },
  x: { nm: 'THE GAUNTLET', ds: 'Elites and hazards together, wave after wave.', ic: 'x' },
  v: { nm: 'SECTOR CACHE', ds: 'A fortified cache at the end of a long route, with a huge one-time reward.', ic: 'star' },
  q: { nm: 'STORM RUN', ds: 'A short, fast run straight through a hazard storm.', ic: 'bolt' }
};
const BRN = ['Hideout', 'Hollow', 'Backroad', 'Outpost', 'Nest', 'Cache', 'Rift', 'Undercroft', 'Overlook', 'Drift', 'Spur', 'Sidetrack'];
const MNBR = 16, MCOLS = LV, MROWS = 5, GXSP = 118, GYSP = 68, MPX0 = 70, MPY0 = 46;
const MGRAPH = {};
function wg(w) { // build (once) the route tree for world w
  if (MGRAPH[w]) return MGRAPH[w];
  for (let seed = 0; seed < 20; seed++) {
    const rs = seeded(w * 7331 + 97 + seed * 101), cell = {}, N = {}, E = [], key = (c, r) => c + ',' + r;
    const put = (i, c, r, o) => { cell[key(c, r)] = i; N[i] = Object.assign({ i, c, r }, o || {}); }, link = (a, b, k) => { if (!E.some(e => e[0] === a && e[1] === b)) E.push([a, b, k]); };
    let r = Math.floor(rs() * MROWS);
    for (let i = 0; i < LV; i++) { if (i) { const st = rs(); r = Math.max(0, Math.min(MROWS - 1, r + (st < .34 ? -1 : st < .68 ? 1 : 0))); } put(i, i, r, { spine: 1 }); if (i) link(i - 1, i, 's'); }
    let idx = LV, caches = 0, tries = 0;
    while (idx < LV + MNBR && tries++ < 400) {
      const pool = Object.values(N).filter(n => n.c < MCOLS - 2 && n.i !== LV - 1), from = rs() < .6 ? pool.filter(n => n.spine)[Math.floor(rs() * pool.filter(n => n.spine).length)] : pool[Math.floor(rs() * pool.length)];
      if (!from) continue; const L = Math.min(LV + MNBR - idx, 1 + Math.floor(rs() * 3)), path = []; let c = from.c, rr = from.r, ok = true;
      for (let k = 0; k < L; k++) { c++; const opts = [-1, 0, 1].map(d => rr + d).filter(y => y >= 0 && y < MROWS && cell[key(c, y)] === undefined && !path.some(p => p.c === c && p.r === y)); if (!opts.length || c > MCOLS - 2) { ok = false; break; } rr = opts[Math.floor(rs() * opts.length)]; path.push({ c, r: rr }); }
      if (!ok || !path.length) continue;
      const end = path[path.length - 1], back = rs() < .55, targets = back ? [-1, 0, 1].map(d => cell[key(end.c + 1, end.r + d)]).filter(t => t !== undefined && t !== LV - 1) : [];
      const dead = !targets.length, kinds = ['n', 'g', 'e', 'q', 'x'];
      let prev = from.i; path.forEach((p, k) => { const last = k === path.length - 1, t = last && dead && path.length >= 2 && caches < 2 && rs() < .7 ? (caches++, 'v') : kinds[Math.floor(rs() * kinds.length)]; put(idx, p.c, p.r, { t, dead: last && dead }); link(prev, idx, 'b'); prev = idx; idx++; });
      if (!dead) link(prev, targets[Math.floor(rs() * targets.length)], 'j');
    }
    if (idx < LV + MNBR || E.filter(e => e[2] === 'j').length < 2 || Object.values(N).filter(n => n.dead).length > 8) continue;
    // a few extra cross-links between neighbouring side sectors so routes weave together
    let extra = 0; Object.values(N).forEach(n => { if (n.i < LV || extra >= 3) return; [-1, 0, 1].forEach(d => { const t = cell[key(n.c + 1, n.r + d)]; if (t !== undefined && t >= LV && !E.some(e => (e[0] === n.i && e[1] === t) || (e[0] === t && e[1] === n.i)) && rs() < .3 && extra < 3) { link(n.i, t, 'x'); extra++; } }); });
    return MGRAPH[w] = { N, E };
  }
  return MGRAPH[w] = { N: {}, E: [] };
}
const brOf = (w, i) => { const n = wg(w).N[i]; return i >= LV && n ? n : null; };
const brName = (w, b) => { const W = WORLDS[w]; return (W.A ? W.A[(b.i * 3 + w) % W.A.length] : 'Lost') + ' ' + BRN[(b.i * 5 + w * 2) % BRN.length]; };
const _lsBr = levelSpec;
levelSpec = function (w, i, tier, alt) {
  const b = brOf(w, i); if (!b) return _lsBr(w, i, tier, alt);
  const depth = Math.max(1, Math.min(LV - 2, b.c)), base = _lsBr(w, depth, tier), T = b.t, u = T === 'n' ? 'c' : T === 'q' ? 'h' : T === 'v' ? 'x' : T;
  return Object.assign(base, { i, type: u, bt: T, br: 1, name: brName(w, b), seed: w * 977 + i * 131 + tier, rs: seeded(w * 977 + i * 131 + tier * 7919 + 13), waves: T === 'q' ? 3 : T === 'v' ? 6 : T === 'x' ? 5 + Math.floor(depth / 4) : 4 + Math.floor(depth / 4), diff: base.diff + (T === 'v' ? .3 : T === 'x' || T === 'e' ? .15 : 0) });
};
const _beginBr = beginRun;
beginRun = function (o) { const r = _beginBr.apply(this, arguments); try { const R = G.run, sp = R && R.spec; if (sp && sp.br) { if (sp.bt === 'n') { R.hpm *= .65; R.swarm = 1.6; } if (sp.bt === 'v') R.lootM = (R.lootM || 1) * 2.5; if (sp.bt === 'e') R.lootM = (R.lootM || 1) * 1.4; } } catch (e) { } return r; };
// a sector opens when any route leading into it has been cleared
function nodeOpen(w, arr, i) { if (i === 0 || SAVE.devAll) return true; return wg(w).E.some(e => e[1] === i && arr[e[0]]); }
function brNextOf(w, i) { const outs = wg(w).E.filter(e => e[0] === i).map(e => e[1]); if (i < LV - 1 && outs.indexOf(i + 1) >= 0 && i < LV) return i + 1; const arr = prog(w).done[0] || []; return outs.find(t => !arr[t]) ?? outs[0] ?? null; }
const _resBr = UI.result;
UI.result = function (d) { try { const R = G.run; if (d && R && d.mode === 'expedition' && d.win && R.lv >= LV && !d.brDone) { d.brDone = 1; const k = R.w + ':' + R.lv + ':' + (R.tier || 1), F = SAVE.flags.br || (SAVE.flags.br = {}); d.next = brNextOf(R.w, R.lv); d.w = R.w; d.tier = R.tier; if (!F[k]) { F[k] = 1; const b = brOf(R.w, R.lv), n = Math.round((b && b.t === 'v' ? 600 + 150 * R.w : 120 + 40 * R.w) * (R.tier || 1)); SAVE.cores += n; d.brBonus = n; saveGame(); } } } catch (e) { } return _resBr.apply(this, arguments); };
ACT.lvl = function (a) { const i = +a[0], arr = prog(UI.w).done[UI.tier - 1] || []; if (!wg(UI.w).N[i]) return; if (!nodeOpen(UI.w, arr, i) && !arr[i]) { SFX.no(); alertMsg('CLEAR A SECTOR THAT LEADS HERE FIRST'); return; } UI.alt = null; UI.sel = i; SFX.click(); UI.refresh(); };
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
const MPW = MPX0 * 2 + (MCOLS - 1) * GXSP, MPH = MPY0 * 2 + (MROWS - 1) * GYSP;
const nodeXY = (w, i) => { const n = wg(w).N[i]; return n ? [MPX0 + n.c * GXSP, MPY0 + n.r * GYSP] : [0, 0]; };
const _scMapBr = SCR.scMap;
SCR.scMap = () => {
  if (UI.mode !== 'expedition') return _scMapBr();
  const w = UI.w; bgPrewarm(w); const W = WORLDS[w], pr = prog(w), tier = Math.min(UI.tier, pr.t), arr = pr.done[tier - 1] || [], B = BOSSES[w], ac = W.ac || '#22d3ee', GW = wg(w);
  let first = 0; while (first < LV && arr[first]) first++;
  if (UI.sel === undefined || UI.sel === null || !GW.N[UI.sel]) UI.sel = Math.min(first, LV - 1);
  const avail = i => nodeOpen(w, arr, i) || !!arr[i], sel = UI.sel;
  const curve = (a, b, on) => { const [x1, y1] = nodeXY(w, a), [x2, y2] = nodeXY(w, b), mx = (x1 + x2) / 2; return '<path d="M' + x1 + ' ' + y1 + ' C ' + mx + ' ' + y1 + ', ' + mx + ' ' + y2 + ', ' + x2 + ' ' + y2 + '" class="wm-p' + (on ? ' on' : '') + '"/>'; };
  const paths = GW.E.map(e => curve(e[0], e[1], !!arr[e[0]])).join('');
  const node = i => { const [x, y] = nodeXY(w, i), b = brOf(w, i), t = b ? b.t : NODE_PAT[i], done = arr[i] | 0, av = avail(i), boss = t === 'B', md = medalAt(w, i, tier), cor = !b && glitchSpreading() && isCorrupt(w, i) && !(SAVE.flags.clean || {})[corruptKey(w, i)];
    const ic = b ? (ICO[BRT[t].ic] || ICO.star) : ICO[t] || ICO.c;
    return '<button class="node wm-n' + (boss ? ' bs' : '') + (b && t === 'v' ? ' cache' : '') + (done ? ' dn' : av ? ' av' : ' lk') + (i === sel ? ' sel' : '') + (cor ? ' cor' : '') + '" style="left:' + x + 'px;top:' + y + 'px" data-act="lvl:' + i + '" title="' + (b ? BRT[t].nm : NODE_NAME[t]) + '">' + (av || done ? ic : ICO.lock) + '<span>' + (done ? '★'.repeat(done) : '') + '</span>' + (md ? '<i class="mdl" style="background:' + MEDALS[md][1] + '"></i>' : '') + (b && b.dead && !boss ? '<i class="wm-end"></i>' : '') + '</button>'; };
  const nodes = Object.keys(GW.N).map(Number).map(node).join('');
  const rs = seeded(w * 101 + 7), deco = wmDeco(WTH[w] || 'rings', MPW, MPH, ac, rs);
  const b = brOf(w, sel), t = b ? b.t : NODE_PAT[sel], sp = levelSpec(w, sel, tier), ro = t === 'B' ? [] : rosterFor(w, Math.min(b ? b.c : sel, LV - 2)).map(id => EN[id].nm), done = arr[sel] | 0, av = avail(sel), bonusK = w + ':' + sel + ':' + tier;
  const outs = GW.E.filter(e => e[0] === sel).length, ins = GW.E.filter(e => e[1] === sel).length;
  const info = '<div class="wm-i"><div class="fl"><div class="wm-k" style="color:' + (b ? '#fbbf24' : ac) + '">' + (t === 'B' ? 'WORLD BOSS' : b ? BRT[t].nm : NODE_NAME[t]) + (t === 'B' ? '' : ' - ' + (outs > 1 ? 'THE ROUTE SPLITS HERE' : !outs ? 'DEAD END' : ins > 1 ? 'ROUTES MEET HERE' : b ? 'SIDE ROUTE' : 'MAIN ROUTE')) + '</div><h3 class="wm-nm">' + escH(sp.name) + '</h3>' +
    '<div class="xs mut wm-d">' + (t === 'B' ? 'BOSS: <b class="bad">' + B.nm + '</b> - ' + fmt(B.hp * (1 + (tier - 1) * .35)) + '+ HP, ' + B.ph.length + ' phases - beat it to unlock the next world' : (b ? BRT[t].ds + '<br>' : '') + sp.waves + ' waves - ' + ro.join(', ') + (t === 'e' && !b ? ' - <b class="bad">ELITE: ' + EN[W.el].nm + '</b>' : '') + (t === 'h' ? ' - asteroid storm' : '') + (t === 's' ? ' - lighter waves, extra loot' : '')) +
    (b && !(SAVE.flags.br || {})[bonusK] ? '<br><b class="gold">First clear bonus: +' + fmt(Math.round((t === 'v' ? 600 + 150 * w : 120 + 40 * w) * tier)) + ' cores</b>' : '') + '</div></div>' +
    '<div class="wm-go">' + (done ? '<span class="wm-st">' + '★'.repeat(done) + '<span class="mut">' + '★'.repeat(3 - done) + '</span></span>' : '') + '<button class="btn big' + (av ? ' gold' : ' off') + '" data-act="start">' + (done ? 'REPLAY' : av ? 'LAUNCH' : 'LOCKED') + '</button></div></div>';
  const pills = WORLDS.map((x, i) => '<button class="wm-w' + (i === w ? ' on' : '') + (i >= SAVE.wu ? ' lk' : '') + '" style="--pc:' + (x.ac || '#22d3ee') + '" data-act="world:' + i + '" title="' + escH(x.nm) + '">' + (i >= SAVE.wu ? ICO.lock : '<b>' + (i + 1) + '</b>') + '</button>').join('');
  const tierSeg = pr.t > 1 ? '<div class="seg wm-tier">' + [1, 2, 3].map(n => '<button data-act="tier:' + n + '" class="' + (n === tier ? 'on' : '') + '"' + (n > pr.t ? ' disabled style="opacity:.35"' : '') + '>TIER ' + n + '</button>').join('') + '</div>' : '';
  const nDone = Object.keys(GW.N).filter(i => arr[i]).length, nAll = Object.keys(GW.N).length;
  return '<div class="wm" style="--wc:' + ac + ';--wb1:' + (W.col ? W.col[0] : '#030712') + ';--wb2:' + (W.col ? W.col[1] : '#0f172a') + '"><header class="wm-h"><span class="wm-num">' + String(w + 1).padStart(2, '0') + '</span><div class="fl"><div class="wm-k">WORLD ' + (w + 1) + ' OF ' + WORLDS.length + (tier > 1 ? ' - TIER ' + tier + ' REMIX' : '') + '</div><h2 class="wm-t">' + escH(W.nm) + '</h2><div class="xs wm-sub">' + escH(W.sub) + '</div></div>' +
    '<div class="wm-side">' + tierSeg + '<div class="wm-bs"><span class="xs mut">WORLD BOSS</span><b>' + escH(B.nm) + '</b></div><div class="xs mut">' + nDone + ' / ' + nAll + ' sectors cleared</div></div></header>' +
    '<nav class="wm-ws">' + pills + '</nav>' +
    '<div class="wm-map" id="mapScroll"><div class="wm-in" style="width:' + MPW + 'px;height:' + MPH + 'px"><svg class="wm-deco" viewBox="0 0 ' + MPW + ' ' + MPH + '" width="' + MPW + '" height="' + MPH + '" aria-hidden="true">' + deco + '</svg><svg class="wm-paths" viewBox="0 0 ' + MPW + ' ' + MPH + '" width="' + MPW + '" height="' + MPH + '" aria-hidden="true">' + paths + '</svg>' + nodes + '</div></div>' + info +
    '<footer class="wm-f"><button class="btn sm" data-act="back">Back</button><span class="xs mut">Every world\'s routes are different. Clear any sector to open the ones it connects to - only the boss unlocks the next world.</span></footer></div>';
};
ACT.start = (function (orig) { return function () { if (UI.mode !== 'expedition') return orig.apply(this, arguments); const arr = prog(UI.w).done[UI.tier - 1] || []; if (!nodeOpen(UI.w, arr, UI.sel) && !arr[UI.sel]) { SFX.no(); return; } startLevel(UI.w, UI.sel, UI.tier, false); }; })(ACT.start);
