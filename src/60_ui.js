// ================= UI: menus, map, hangar, shop, settings, pause, results =================
const svg = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
const ICO = {
  map: svg('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'), inf: svg('<path d="M18.2 8.5c-3 0-4.6 3.5-6.2 3.5S8.8 8.5 5.8 8.5a3.5 3.5 0 000 7c3 0 4.6-3.500 6.2-3.500s3.200 3.500 6.200 3.500a3.500 3.500 0 000-7z"/>'),
  skull: svg('<path d="M12 3a8 8 0 00-5 14v3h3v-2h4v2h3v-3a8 8 0 00-5-14z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/>'), bolt: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'), target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  c: svg('<circle cx="12" cy="12" r="8"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>'), e: svg('<path d="M12 3a8 8 0 00-5 14v3h3v-2h4v2h3v-3a8 8 0 00-5-14z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/>'),
  s: svg('<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="4"/>'), h: svg('<path d="M12 3L2 20h20z"/><path d="M12 10v5M12 18v.5"/>'), B: svg('<path d="M3 18l2-11 5 5 2-8 2 8 5-5 2 11z"/>'),
  hp: svg('<path d="M12 21s-7-4.500-7-10a4 4 0 017-2.600A4 4 0 0119 11c0 5.500-7 10-7 10z"/>'), sh: svg('<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/>'), am: svg('<path d="M8 3h8l3 5-7 13L5 8z"/>'),
  dmg: svg('<path d="M14 3l7 7-3 3-7-7zM11 6L3 14l-1 7 7-1 8-8"/>'), rate: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>'), spd: svg('<path d="M3 12h10M3 6h7M3 18h7M16 6l5 6-5 6"/>'), mag: svg('<path d="M6 3v8a6 6 0 0012 0V3h-4v8a2 2 0 01-4 0V3z"/>'), lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>')
};
Object.assign(ICO, {
  armor: svg('<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'), coin: svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9 12h6"/>'),
  home: svg('<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.500"/>'), pierce: svg('<path d="M3 12h16M15 7l5 5-5 5"/><path d="M8 5v14"/>'),
  multi: svg('<path d="M3 12h15M3 6l13 4M3 18l13-4"/>'), star: svg('<path d="M12 3l2.600 5.500 6 .8-4.400 4.200 1.100 6-5.300-3-5.300 3 1.100-6L3.400 9.300l6-.8z"/>'),
  chain: svg('<path d="M3 6l5 5-3 3 6 5M13 3l4 4-3 3 6 7"/>'), blast: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>'),
  regen: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>'), ring: svg('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>'),
  drop: svg('<path d="M12 3s6 6.500 6 11a6 6 0 01-12 0c0-4.500 6-11 6-11z"/>'), orbit: svg('<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5"/><circle cx="21" cy="12" r="1.500"/>'),
  ram: svg('<path d="M4 8h9l4 4-4 4H4z"/><path d="M17 12h4"/>'), heart: ICO.hp, clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  graze: svg('<path d="M3 17c4 0 5-10 9-10M9 20c4 0 5-10 9-10M3 11c3 0 4-6 7-6"/>'), nova: svg('<path d="M12 2l2 7 7 3-7 3-2 7-2-7-7-3 7-3z"/>'),
  wing: svg('<path d="M3 15l9-9 9 9h-4l-5-5-5 5z"/><path d="M12 21v-6"/>'), drn: svg('<path d="M3 15l9-9 9 9h-4l-5-5-5 5z"/><circle cx="12" cy="19" r="2"/>'), drd: svg('<path d="M3 15l9-9 9 9h-4l-5-5-5 5z"/><path d="M12 14v7M9 18h6"/>')
});
const stars = n => '<span class="stars">' + '★'.repeat(n) + '<span style="opacity:.25">' + '★'.repeat(3 - n) + '</span></span>';
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pi = () => Math.min(UI.pi, SAVE.players - 1);

// ---------- settings schema ----------
const SETS = {
  GAMEPLAY: [['diff', 'sel', 'Difficulty', 'Enemy health and damage', [[0, 'Easy'], [1, 'Normal'], [2, 'Hard']]], ['story', 'sel', 'Story scenes', 'Comic cutscenes before bosses', [['once', 'First time only'], ['always', 'Always'], ['off', 'Off']]], ['brief', 'sel', 'Enemy briefings', 'Intel card + labels in each world\'s first sector', [['once', 'First time only'], ['always', 'Always'], ['off', 'Off']]], ['auto', 'tog', 'Auto-fire', 'Fire without holding a button'], ['dmgnum', 'tog', 'Damage numbers', ''], ['flash', 'tog', 'Screen flash on hit', ''], ['pauseBlur', 'tog', 'Auto-pause when you switch away', ''], ['cards', 'tog', 'Power-up cards', 'Pick a card between waves']],
  GRAPHICS: [['menu3d', 'tog', 'Flying main menu', 'Your ship flies through your latest world'], ['intro', 'tog', 'Intro movie', 'Play the intro when the game loads'], ['models', 'tog', '3D ship models', 'Off = flat 2D ships (fastest)'], ['bg3d', 'tog', '3D backgrounds', 'Orbit each world in 3D (needs 3D models on)'], ['toon', 'tog', 'Cel shading', 'Cartoon lighting with ink outlines'], ['bloom', 'tog', 'Bloom glow', 'Lights and lasers bleed glow'], ['weather', 'tog', 'Weather effects', 'Rain, snow, sand and more over the action'], ['daynight', 'tog', 'Day / night cycle', 'Outdoor worlds slowly turn to night'], ['q', 'sel', 'Render quality', 'Lower is faster on phones', [[1, 'Low'], [1.5, 'Medium'], [2, 'High']]], ['back', 'sel', 'Backdrop detail', '', [[0, 'Minimal'], [1, 'Standard'], [2, 'Rich']]], ['parts', 'range', 'Particle limit', '', [30, 300, 10]], ['glow', 'range', 'Glow strength', '', [0, 1.5, .1]], ['shake', 'range', 'Screen shake', '', [0, 1.5, .1]], ['vig', 'tog', 'Vignette', ''], ['ui3d', 'tog', '3D menu effects', 'Tilt, depth and pop-in'], ['tilt', 'range', 'Menu tilt strength', '', [0, 2, .1]], ['fps', 'tog', 'Show FPS', ''], ['cap30', 'tog', 'Cap at 30 FPS', 'Saves battery'], ['slowmo', 'tog', 'Boss-kill slow motion', '']],
  AUDIO: [['vol', 'range', 'Master volume', '', [0, 1, .05]], ['sfx', 'range', 'Effects', '', [0, 1, .05]], ['mus', 'range', 'Music', '', [0, 1, .05]]],
  CONTROLS: [['touch', 'sel', 'Touch controls', 'Auto shows them on phones/tablets', [['auto', 'Auto'], ['on', 'Always on'], ['off', 'Off']]], ['scheme', 'sel', 'Touch scheme', 'Stick + fire button, or drag to fly', [['stick', 'Stick + Fire'], ['drag', 'Drag to fly']]], ['tsize', 'range', 'Button size', '', [.7, 1.5, .05]], ['tside', 'sel', 'Stick side', '', [['left', 'Left'], ['right', 'Right']]], ['haptic', 'tog', 'Vibration', ''], ['dead', 'range', 'Gamepad deadzone', '', [0, .5, .02]]],
  ACCESS: [['reduce', 'tog', 'Reduce motion', 'Less shake, no big banner animation'], ['hc', 'tog', 'High-contrast enemy fire', 'White outlines on hostile shots'], ['cb', 'tog', 'Colour-blind shapes', 'Enemy shots become diamonds with outlines']]
};
function prevCfg() { const c = SAVE.pl[pi()].cfg, v = UI.prev; if (!v) return c; const o = Object.assign({}, c); o[v[0]] = v[1]; return o; }
function setRow(r) {
  const k = r[0], t = r[1], v = SET[k]; let c = '';
  if (t === 'tog') c = '<div class="tog' + (v ? ' on' : '') + '" data-set="' + k + '"></div>';
  else if (t === 'sel') c = '<select data-set="' + k + '">' + r[4].map(o => '<option value="' + o[0] + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
  else c = '<input type="range" data-set="' + k + '" min="' + r[4][0] + '" max="' + r[4][1] + '" step="' + r[4][2] + '" value="' + v + '">';
  return '<div class="setrow"><div>' + r[2] + (r[3] ? '<small>' + r[3] + '</small>' : '') + '</div>' + c + '</div>';
}
function applySet(k) {
  saveSet();
  if (k === 'q' || k === 'ui3d' || k === 'reduce') layout();
  if (k === 'back') buildBackdrop(G.world | 0);
  if (k === 'vol' || k === 'sfx' || k === 'mus') applyVol();
  if (k === 'touch' || k === 'scheme' || k === 'tsize' || k === 'tside') buildTouch();
}

// ---------- screens ----------
const RKC = { S: '#fbbf24', A: '#34d399', B: '#38bdf8', C: '#94a3b8' };
const rankHtml = d => (d.win && (d.mode === 'expedition' || d.mode === 'rush' || d.mode === 'daily' || d.mode === 'vault' || d.mode === 'nohit' || d.mode === 'defense')) ? '<div class="rk" style="color:' + RKC[d.rank] + ';text-shadow:0 0 26px ' + RKC[d.rank] + '">' + d.rank + '</div><div class="xs mut" style="letter-spacing:.3em;margin-top:-4px">RANK' + (d.mode === 'expedition' && RANKB[d.rank] ? ' - +' + Math.round(RANKB[d.rank] * 100) + '% BONUS' : '') + '</div>' : '';
function wupHtml(pl, id) {
  if (pl.wown.indexOf(id) < 0) return '';
  const lv = wlvOf(pl, id), ev = wevOf(pl, id), E = WEVO[id];
  const pips = '<div class="pips">' + Array.from({ length: WMAXLV }, (_, n) => '<i class="' + (n < lv ? 'on' : '') + '"></i>').join('') + '<i class="' + (ev ? 'on' : '') + '" style="width:14px;' + (ev ? 'background:#fbbf24;box-shadow:0 0 6px #fbbf24' : '') + '"></i></div>';
  let btn;
  if (ev) btn = '<span class="good b xs">EVOLVED - ' + E.ds + '</span>';
  else if (lv < WMAXLV) { const pr = wupPrice(id, lv); btn = '<button class="btn sm gold' + (SAVE.cores < pr ? ' off' : '') + '" data-act="wup:' + id + '">LEVEL UP ' + fmt(pr) + '</button>'; }
  else { const pr = wevoPrice(id); btn = '<button class="btn sm warn' + (SAVE.cores < pr ? ' off' : '') + '" data-act="wevo:' + id + '">EVOLVE ' + fmt(pr) + '</button>'; }
  return '<div class="row sp wrap" style="margin-top:6px"><div><div class="xs mut b">LEVEL ' + (lv + 1) + (lv >= WMAXLV ? ' (MAX)' : '') + (!ev && lv >= WMAXLV ? ' - ' + E.nm + ': ' + E.ds : '') + '</div>' + pips + '</div>' + btn + '</div>';
}
const SCR = {
  scCards: () => {
    const K = G.pick; if (!K) return '';
    const p = G.players[K.who], co = G.players.length > 1, cost = 20 * (K.rr + 1);
    return '<div class="cpick"><div class="tc"><div class="title" style="font-size:clamp(20px,5.2vw,34px);letter-spacing:.12em">CHOOSE AN UPGRADE</div><div class="subt" style="margin:4px 0 0">' + (co ? 'PILOT ' + (K.who + 1) + ' - ' : '') + 'LASTS FOR THIS RUN</div></div><div class="cards3">' +
      K.opts.map((id, i) => { const c = CARDS[id], r = RAR[c.rar], n = p.cards[id] | 0; return '<div class="pc r' + c.rar + '" data-act="card:' + i + '" style="--rc:' + r.c + ';--i:' + i + '"><em>' + r.nm + '</em><div class="pci">' + ICO[c.ic] + '</div><div class="pct"><b>' + c.nm + '</b><span>' + c.ds + '</span><i>' + (n ? 'LEVEL ' + n + ' → ' + (n + 1) : 'NEW') + '</i></div>' + (touchOn() ? '' : '<u>' + (i + 1) + '</u>') + '</div>'; }).join('') +
      '</div><div class="row sp wrap" style="width:100%;max-width:600px"><button class="btn sm' + (SAVE.cores < cost ? ' off' : '') + '" data-act="cardroll">REROLL - ' + cost + '</button>' + (touchOn() ? '' : '<span class="xs mut">Keys 1 2 3 - R rerolls</span>') + '<button class="btn sm gold" data-act="cardskip">SKIP +25 CORES</button></div></div>';
  },
  scTut: () => '<div class="card" style="width:min(480px,100%)"><div class="title" style="font-size:clamp(22px,6vw,34px)">WELCOME, PILOT</div><div class="subt">NEW HERE?</div><p class="tc mut" style="line-height:1.7;margin-bottom:18px">Take the 2-minute <b class="acc">Flight School</b>: how to fly, what ammo looks like, what the pickups do, and how the shop, hangar and map work.</p><div class="stack"><button class="btn big" data-act="tutorial">START FLIGHT SCHOOL</button><button class="btn" data-act="tutlater">SKIP - I KNOW WHAT I\'M DOING</button></div></div>',
  scMenu: () => {
    const t = touchOn();
    return '<div class="card" style="width:min(450px,100%)"><div class="title" data-act="tap">AETHERIA</div><div class="subt">QUANTUM STRIKE</div><div class="stack">' +
      '<button class="btn big" data-act="play">PLAY</button>' +
      '<button class="btn" data-act="online" style="border-color:#22d3ee">ONLINE <span class="xs mut">FRIENDS, CO-OP, VERSUS</span></button>' +
      '<div class="grid2"><button class="btn" data-act="hangar">HANGAR</button><button class="btn" data-act="shop">SHOP</button></div>' +
      '<div class="grid2"><button class="btn" data-act="settings">SETTINGS</button><button class="btn" data-act="tutorial">FLIGHT SCHOOL</button></div>' +
      '<div class="grid2"><button class="btn sm" data-act="fs">' + (document.fullscreenElement ? 'EXIT FULL SCREEN' : 'FULL SCREEN') + '</button><button class="btn sm" data-act="updates">UPDATES <span class="gold">' + GAME_VER + '</span></button></div>' +
      '<div class="grid2"><button class="btn" data-act="profile">PROFILE ' + achCount() + '/' + ACH.length + '</button><button class="btn' + (SAVE.dl.done[dayKey()] ? '' : ' gold') + '" data-act="daily">DAILY' + (SAVE.dl.done[dayKey()] ? '' : ' - NEW') + '</button></div>' +
      '<div class="grid2"><button class="btn' + (msnReady() ? ' gold' : '') + '" data-act="missions">MISSIONS' + (msnReady() ? ' - ' + msnReady() + ' READY' : '') + '</button><button class="btn" data-act="cos">COSMETICS</button></div>' +
      '<div class="row sp"><span class="mut sm b" style="letter-spacing:.14em">PLAYERS</span><div class="seg" style="width:62%"><button data-act="players:1" class="' + (SAVE.players === 1 ? 'on' : '') + '">1 PLAYER</button><button data-act="players:2" class="' + (SAVE.players === 2 ? 'on' : '') + '">2P CO-OP</button></div></div>' +
      '<div class="row sp xs mut">' + rankChip() + '<span>' + Object.keys(PS().logs).length + '/' + LOGS.length + ' LOGS</span></div><div class="row sp xs mut"><span>CORES <b class="gold">' + fmt(SAVE.cores) + '</b></span><span>WORLDS <b class="acc">' + Math.min(SAVE.wu, WORLDS.length) + '/' + WORLDS.length + '</b></span><span>KILLS <b>' + fmt(SAVE.st.kills) + '</b></span></div>' +
      '<div class="tc xs mut" style="line-height:1.6">' + (t ? 'Touch: stick to fly - FIRE to shoot' : SAVE.players === 2 ? 'P1: WASD + SPACE - P2: ARROWS + ENTER (or gamepads)' : 'WASD / mouse to fly - SPACE / click to fire - Q E swap gun - P pause') + '</div><div class="tc xs mut credit" data-act="credits">MADE BY <b class="gold">LUKEN WISER</b> - ' + GAME_VER + '</div></div></div>';
  },
  scModes: () => {
    const card = k => {
      const m = MODES[k];
      if (m.secret && !SAVE.unl[k]) return '<div class="mode lk" data-act="mode:' + k + '"><div class="row"><span class="mut" style="width:22px;height:22px">' + ICO.lock + '</span><b>???</b></div><span>' + (m.hint || 'Something is hidden here. Keep flying, and keep it clean.') + '</span><em></em></div>';
      const sk = dailyStreakNow(), hi = k === 'endless' ? (SAVE.hi.endless.score ? 'BEST ' + fmt(SAVE.hi.endless.score) + ' - WAVE ' + SAVE.hi.endless.wave : '') : k === 'blitz' ? (SAVE.hi.blitz.score ? 'BEST ' + fmt(SAVE.hi.blitz.score) : '') : k === 'rush' ? (SAVE.hi.rush.time ? 'BEST ' + SAVE.hi.rush.time + 's' : 'ALL UNLOCKED BOSSES') : k === 'daily' ? dailyInfo().mod.nm + (sk ? ' - ' + sk + ' DAY STREAK' : '') : k === 'defense' ? (SAVE.hi.def.wave ? 'BEST WAVE ' + SAVE.hi.def.wave : '') : k === 'nohit' ? (Object.keys(SAVE.hi.nohit).length ? Object.keys(SAVE.hi.nohit).length + ' WORLDS CLEARED' : '') : k === 'vault' ? (SAVE.hi.vault.clears ? 'CLEARED x' + SAVE.hi.vault.clears : 'UNLOCKED') : '';
      return '<div class="mode" data-act="mode:' + k + '"><div class="row"><span class="acc" style="width:22px;height:22px">' + ICO[m.ic] + '</span><b>' + m.nm.toUpperCase() + '</b></div><span>' + m.ds + '</span><em>' + hi + '</em></div>';
    };
    const ks = Object.keys(MODES);
    return '<div class="card mid"><div class="row sp"><h2>Select Mode</h2><div class="seg" style="width:46%"><button data-act="players:1" class="' + (SAVE.players === 1 ? 'on' : '') + '">1P</button><button data-act="players:2" class="' + (SAVE.players === 2 ? 'on' : '') + '">2P CO-OP</button></div></div><div class="grid2" style="margin-top:12px">' + ks.filter(k => !MODES[k].cat).map(card).join('') + '</div>' +
      '<div class="xs mut b" style="letter-spacing:.2em;margin:18px 0 0">CHALLENGES</div><div class="grid2" style="margin-top:8px">' + ks.filter(k => MODES[k].cat).map(card).join('') + '</div>' +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><span class="xs mut">' + (SAVE.players === 2 ? '2-player co-op is on' : 'Tip: flip on 2P CO-OP to bring a friend') + '</span></div></div>';
  },
  scMap: () => {
    const w = UI.w; bgPrewarm(w); const W = WORLDS[w], pr = prog(w), mode = UI.mode, B = BOSSES[w], tier = Math.min(UI.tier, pr.t), arr = pr.done[tier - 1] || [];
    let first = 0; while (first < LV && arr[first]) first++; if (SAVE.devAll) first = LV - 1;
    const tabs = WORLDS.map((x, i) => '<div class="tab' + (i === w ? ' on' : '') + (i >= SAVE.wu ? ' lk' : '') + '" data-act="world:' + i + '">' + (i >= SAVE.wu ? '' : '') + (i + 1) + '. ' + x.nm + (i >= SAVE.wu ? ' (locked)' : '') + '</div>').join('');
    let body = '';
    if (mode === 'expedition') {
      const isAlt = !!ALT_NODE[UI.sel] && UI.alt === w + ':' + UI.sel;
      const nodes = NODE_PAT.map((t, i) => {
        const done = !!arr[i], av = i <= first, sel = UI.sel === i && !isAlt, cl = 'node' + (t === 'B' ? ' bs' : '') + (done ? ' dn' : av ? ' av' : ' lk');
        const cor = glitchSpreading() && isCorrupt(w, i) && !(SAVE.flags.clean || {})[corruptKey(w, i)];
        let h = '<div class="node ' + cl.slice(5) + (cor ? ' cor' : '') + '" data-act="lvl:' + i + '" style="' + (sel ? 'outline:2px solid #fff;outline-offset:3px;' : '') + (ALT_NODE[i] ? '' : 'margin-top:' + (i % 2 ? 22 : -10) + 'px') + '">' + ICO[t] + '<span>' + (done ? '★'.repeat(arr[i]) : (i + 1)) + '</span>' + (medalAt(w, i, tier) ? '<i class="mdl" style="background:' + MEDALS[medalAt(w, i, tier)][1] + '"></i>' : '') + '</div>';
        if (ALT_NODE[i]) { const at = ALT_NODE[i], as = altStars(w, i, tier), asel = UI.sel === i && isAlt; h = '<div class="fork"><div class="node alt ' + (as ? 'dn' : av ? 'av' : 'lk') + '" data-act="lvl:' + i + ':alt" title="' + ALT_INFO[at].nm + '" style="' + (asel ? 'outline:2px solid #fbbf24;outline-offset:3px;' : '') + '">' + ICO[at] + '<span>' + (as ? '★'.repeat(as) : (i + 1) + 'B') + '</span></div>' + h + '</div>'; }
        return h + (i < LV - 1 ? '<div style="width:26px;height:2px;background:var(--line2);flex:none"></div>' : '');
      }).join('');
      const i = UI.sel, t = isAlt ? ALT_NODE[i] : NODE_PAT[i], sp = levelSpec(w, i, tier, isAlt), ro = t === 'B' ? [] : rosterFor(w, i).map(id => EN[id].nm);
      body = '<div id="mapScroll"><div id="mapIn" style="gap:0">' + nodes + '</div></div>' +
        '<div class="item" style="margin-top:10px;align-items:flex-start"><div class="fl"><div class="b" style="letter-spacing:.12em">' + (i + 1) + '. ' + sp.name.toUpperCase() + ' <span class="mut sm">- ' + NODE_NAME[t] + '</span></div><div class="xs mut" style="margin-top:4px;line-height:1.6">' + (t === 'B' ? 'BOSS: <b class="bad">' + B.nm + '</b> - ' + fmt(B.hp * (1 + (tier - 1) * .35)) + '+ HP, ' + B.ph.length + ' phases' : sp.waves + ' waves - ' + ro.join(', ') + (t === 'e' ? ' - <b class="bad">ELITE: ' + EN[W.el].nm + '</b>' : '') + (t === 'h' ? ' - asteroid storm' : '') + (t === 's' ? ' - lighter waves, extra loot' : '') + (glitchSpreading() && isCorrupt(w, i) && !(SAVE.flags.clean || {})[corruptKey(w, i)] ? '<br><b style="color:#ff2bd6">CORRUPTED: the glitch has spread here. Glitched enemies, +50% cores. Clear it to push the glitch back.</b>' : '') + (ALT_INFO[t] ? '<br><b class="gold">' + ALT_INFO[t].ds + '</b>' : ALT_NODE[i] ? '<br><span class="gold">A side route branches off here - tap the node above</span>' : '')) + '</div></div><button class="btn big" data-act="start">' + ((isAlt ? altStars(w, i, tier) : arr[i]) ? 'REPLAY' : 'LAUNCH') + '</button></div>';
    } else {
      body = '<div class="item" style="align-items:flex-start"><div class="fl"><div class="b">' + MODES[mode].nm.toUpperCase() + ' - ' + W.nm.toUpperCase() + '</div><div class="xs mut" style="margin-top:4px;line-height:1.6">' + MODES[mode].ds + '</div></div><button class="btn big" data-act="start">START</button></div>';
    }
    const tierSeg = mode === 'expedition' && pr.t > 1 ? '<div class="seg" style="width:200px">' + [1, 2, 3].map(n => '<button data-act="tier:' + n + '" class="' + (n === tier ? 'on' : '') + '"' + (n > pr.t ? ' disabled style="opacity:.35"' : '') + '>TIER ' + n + '</button>').join('') + '</div>' : '';
    return '<div class="card wide"><div class="row sp wrap"><div><h2 style="color:' + W.ac + '">' + W.nm + '</h2><div class="xs mut">' + W.sub + '</div>' + (mode === 'expedition' && tier > 1 ? '<div class="xs gold b" style="margin-top:4px;letter-spacing:.1em">REMIX: ' + (tier === 2 ? 'CROSSFIRE' : 'NIGHTMARE') + ' - other worlds join the fight, +' + (tier - 1) * 25 + '% rewards</div>' : '') + '</div>' + tierSeg + '</div><div class="tabs wf" style="margin-top:8px">' + tabs + '</div>' + body + '<div class="row sp" style="margin-top:12px"><button class="btn sm" data-act="back">BACK</button><span class="xs mut">' + (mode === 'expedition' ? 'Clear the boss to unlock the next world and higher tiers' : '') + '</span></div></div>';
  },
  scHangar: () => {
    const i = pi(), pl = SAVE.pl[i], c = pl.cfg, cat = UI.cat, st = shipStats(pl);
    const tabsP = SAVE.players === 2 ? '<div class="seg" style="width:140px">' + [0, 1].map(n => '<button data-act="ptab:' + n + '" class="' + (n === i ? 'on' : '') + '">P' + (n + 1) + '</button>').join('') + '</div>' : '';
    const cats = ['hull', 'wings', 'engine', 'canopy', 'paint', 'finish', 'weapon'], cn = { hull: 'HULL', wings: 'WINGS', engine: 'ENGINE', canopy: 'CANOPY', paint: 'PAINT', finish: 'FINISH', weapon: 'GUNS' };
    let items = '';
    const pv = UI.prev, optBtn = (act, sel, name, ds, price, own) => { const q = act.split(':'), isPv = pv && pv[0] === q[q.length - 2] && pv[1] === q[q.length - 1]; return '<div class="opt' + (sel || isPv ? ' sel' : '') + '" data-act="' + act + '"><b>' + name + '</b><span>' + ds + '</span>' + (sel ? '<span class="good b">EQUIPPED</span>' : own ? '<span class="acc">OWNED - tap to equip</span>' : isPv ? '<span class="gold b">PREVIEWING - TAP AGAIN TO BUY ' + fmt(price) + '</span>' : '<span class="lock">' + fmt(price) + ' CORES - tap to preview</span>') + '</div>'; };
    if (cat === 'hull' || cat === 'wings' || cat === 'engine' || cat === 'canopy') {
      const key = cat, P = PARTS[cat]; items = '<div class="grid2">' + Object.keys(P).map(id => P[id].secret && !SAVE.unl[id] && pl.own[cat].indexOf(id) < 0 ? '<div class="opt" style="opacity:.65;cursor:default"><b>??? SECRET HULL</b><span>' + P[id].hint + '</span><span class="lock">LOCKED</span></div>' : optBtn('part:' + cat + ':' + id, c[key] === id, P[id].nm, P[id].ds + (cat === 'hull' && ABIL[id] ? '<br><b style="color:#fbbf24">ABILITY: ' + ABIL[id].nm + '</b>' : ''), P[id].p, pl.own[cat].indexOf(id) >= 0)).join('') + '</div>';
    } else if (cat === 'paint') {
      items = '<div class="xs mut b" style="margin:4px 0 8px;letter-spacing:.12em">HULL COLOUR</div><div class="row wrap">' + PAINTS.map(p => '<div class="sw' + (c.paint === p ? ' sel' : '') + '" data-act="paint:' + p + '" style="background:' + p + '"></div>').join('') + '</div><div class="xs mut b" style="margin:14px 0 8px;letter-spacing:.12em">ACCENT GLOW</div><div class="row wrap">' + ACCENTS.map(p => '<div class="sw' + (c.accent === p ? ' sel' : '') + '" data-act="accent:' + p + '" style="background:' + p + ';box-shadow:0 0 12px ' + p + '"></div>').join('') + '</div><div class="setrow" style="margin-top:10px"><div>Racing stripe</div><div class="tog' + (c.stripe !== false ? ' on' : '') + '" data-act="stripe"></div></div>';
    } else if (cat === 'finish') {
      items = '<div class="grid2">' + Object.keys(FINISHES).map(id => optBtn('finish:' + id, c.finish === id, FINISHES[id].nm, id === 'chrome' ? 'Mirror metal' : id === 'matte' ? 'Flat, no shine' : id === 'pearl' ? 'Soft sheen' : id === 'neon' ? 'Glows in your accent' : 'Dark woven', FINISHES[id].p, (pl.own.finish || []).indexOf(id) >= 0)).join('') + '</div>';
    } else {
      items = '<div class="xs mut b" style="margin:4px 0 6px;letter-spacing:.12em">SECONDARY - ' + (touchOn() ? 'TAP SHOT' : 'TAP ' + keyLabel(KB[i].c[0]) + ' / RIGHT-CLICK') + '. HOLD TO CHARGE. TAP AS A SHOT HITS TO PARRY.</div><div class="grid3 secg">' + Object.keys(SECW).map(k => '<div class="opt' + ((pl.sec || 'salvo') === k ? ' sel' : '') + '" data-act="sec:' + k + '"><b style="color:' + SECW[k].c + '">' + SECW[k].nm + '</b><span>' + SECW[k].ds + '</span>' + ((pl.sec || 'salvo') === k ? '<span class="good b">EQUIPPED</span>' : '<span class="acc">FREE - tap to equip</span>') + '</div>').join('') + '</div><div class="xs mut b" style="margin:12px 0 6px;letter-spacing:.12em">MAIN GUN</div><div class="stack" style="gap:8px">' + WORDER.map(id => { const w = WPN[id], own = pl.wown.indexOf(id) >= 0, eq = pl.wpn === id; return '<div class="opt' + (eq ? ' sel' : '') + '" data-act="wpn:' + id + '"><div class="row sp"><b style="color:' + w.c + '">' + wName(pl, id) + '</b>' + (eq ? '<span class="good b">EQUIPPED</span>' : own ? '<span class="acc">OWNED</span>' : '<span class="lock">' + fmt(w.price) + ' CORES</span>') + '</div><span>' + w.ds + '</span><span class="xs">DMG ' + w.d + ' - RATE ' + (60 / w.r).toFixed(1) + '/s - PLASMA ' + w.am + '/shot</span>' + wupHtml(pl, id) + (own ? masteryHtml(pl, id) : '') + '</div>'; }).join('') + '</div>';
    }
    const bar = (lbl, v, mx, col) => '<div class="st"><span>' + lbl + '</span><div class="bar" style="height:8px"><i style="width:' + clamp(v / mx, 0, 1) * 100 + '%;--c:' + col + '"></i></div><b>' + (v < 10 ? v.toFixed(1) : Math.round(v)) + '</b></div>';
    return '<div class="hg"><div class="card" style="align-self:flex-start;margin-top:4px"><div class="row sp"><h2>Hangar</h2>' + tabsP + '<span class="gold b">' + fmt(SAVE.cores) + ' <span class="mut xs">CORES</span></span></div>' +
      '<div class="tabs wrap" style="margin-top:8px">' + cats.map(k => '<div class="tab' + (cat === k ? ' on' : '') + '" data-act="cat:' + k + '">' + cn[k] + '</div>').join('') + '</div>' + items +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">DONE</button><span class="xs mut">Drag to spin the ship</span></div></div>' +
      '<div class="hgr"><div class="card"><div class="b acc xs" style="letter-spacing:.2em;margin-bottom:6px">SHIP STATS - PILOT ' + (i + 1) + '</div>' + bar('HULL', st.hp, 400, '#fb7185') + bar('SHIELD', st.sh, 250, '#38bdf8') + bar('PLASMA', st.am, 350, '#2dd4bf') + bar('DAMAGE', st.dmg, 3, '#fde047') + bar('FIRE RATE', st.rate, 2.4, '#fb923c') + bar('SPEED', st.spd, 8, '#4ade80') + (() => { const vh = UI.prev && UI.prev[0] === 'hull' ? UI.prev[1] : c.hull, A = ABIL[vh] || ABIL.falcon; return '<div class="xs mut" style="margin-top:8px;line-height:1.5">ABILITY: <b class="gold">' + A.nm + '</b><br>' + A.ds + '</div>'; })() + '</div></div></div>';
  },
  scShop: () => {
    const i = pi(), pl = SAVE.pl[i], tabsP = SAVE.players === 2 ? '<div class="seg" style="width:140px">' + [0, 1].map(n => '<button data-act="ptab:' + n + '" class="' + (n === i ? 'on' : '') + '">P' + (n + 1) + '</button>').join('') + '</div>' : '';
    const up = Object.keys(UPG).map(k => {
      const U = UPG[k], lv = pl.up[k], mx = lv >= U.max, pr = upPrice(k, lv), can = SAVE.cores >= pr;
      return '<div class="item"><div class="ic acc">' + ICO[U.ic] + '</div><div class="fl"><div class="b sm">' + U.nm.toUpperCase() + '</div><div class="xs mut">' + U.ds + '</div><div class="pips">' + Array.from({ length: U.max }, (_, n) => '<i class="' + (n < lv ? 'on' : '') + '"></i>').join('') + '</div></div><button class="btn sm gold' + (mx || !can ? ' off' : '') + '" data-act="buy:' + k + '">' + (mx ? 'MAX' : fmt(pr)) + '</button></div>';
    }).join('');
    const wp = WORDER.map(id => { const w = WPN[id], own = pl.wown.indexOf(id) >= 0; return '<div class="item"><div class="ic" style="color:' + w.c + '">' + ICO.dmg + '</div><div class="fl"><div class="b sm" style="color:' + w.c + '">' + wName(pl, id).toUpperCase() + '</div><div class="xs mut">' + w.ds + '</div>' + wupHtml(pl, id) + '</div>' + (own ? '<button class="btn sm' + (pl.wpn === id ? ' on' : '') + '" data-act="wpn:' + id + '">' + (pl.wpn === id ? 'EQUIPPED' : 'EQUIP') + '</button>' : '<button class="btn sm gold' + (SAVE.cores < w.price ? ' off' : '') + '" data-act="wpn:' + id + '">' + fmt(w.price) + '</button>') + '</div>'; }).join('');
    return '<div class="card wide"><div class="row sp"><h2>Shop</h2>' + tabsP + '<span class="gold b">' + fmt(SAVE.cores) + ' <span class="mut xs">CORES</span></span></div><p class="xs mut" style="margin:6px 0 10px">Upgrades get pricier with every level you buy. Prices shown are for the NEXT level.</p><div class="grid2">' + up + '</div><h2 style="margin-top:16px">Weapons</h2><div class="grid2" style="margin-top:8px">' + wp + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm" data-act="hangar">HANGAR</button></div></div>';
  },
  scSettings: () => {
    const tab = UI.stab, tabs = Object.keys(SETS).concat(['DATA']), body = tab === 'DATA' ? '<div class="stack"><button class="btn" data-act="slots">SAVE SLOTS & TRANSFER</button><button class="btn" data-act="profile">PROFILE & ACHIEVEMENTS</button>' + (!SAVE.dev ? '<div class="row" style="gap:8px"><input id="devCode" class="inp" placeholder="ENTER CODE" autocomplete="off" autocapitalize="characters" spellcheck="false" style="flex:1;min-width:0;padding:10px;border-radius:9px;border:1px solid var(--line);background:rgba(4,12,26,.9);color:#e2e8f0;font:800 12px var(--mono);letter-spacing:.12em"><button class="btn sm" data-act="devcode">ENTER</button></div>' : '<button class="btn" data-act="cheat:cores">DEV: +1000 CORES</button><button class="btn" data-act="cheat:unlock">DEV: UNLOCK ALL WORLDS</button><button class="btn" data-act="cheat:sectors">DEV: UNLOCK ALL SECTORS ' + (SAVE.devAll ? '(ON)' : '(OFF)') + '</button><button class="btn" data-act="cheat:god">DEV: GOD MODE ' + (G.god ? '(ON)' : '(OFF)') + '</button><button class="btn sm" data-act="devoff">LOCK DEV TOOLS</button>') + '<button class="btn warn" data-act="resetset">RESET SETTINGS</button><button class="btn warn" data-act="wipe">WIPE SAVE DATA</button></div>' : SETS[tab].map(setRow).join('') + (tab === 'CONTROLS' ? '<div class="stack" style="margin-top:12px"><button class="btn" data-act="keys">KEYBOARD CONTROLS</button></div>' : '');
    return '<div class="card mid"><h2>Settings</h2><div class="tabs wrap" style="margin:8px 0">' + tabs.map(t => '<div class="tab' + (tab === t ? ' on' : '') + '" data-act="stab:' + t + '">' + t + '</div>').join('') + '</div>' + body + '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><span class="xs mut">Saved automatically</span></div></div>';
  },
  scPause: () => {
    const R = G.run, tr = R && R.mode === 'training', dev = SAVE.dev || G.god;
    return '<div class="card" style="width:min(400px,100%)"><h2 class="tc" style="font-size:20px">Paused</h2><div class="stack" style="margin-top:14px"><button class="btn big" data-act="resume">RESUME</button><button class="btn sm" data-act="photo">PHOTO MODE</button><button class="btn sm" data-act="fs">' + (document.fullscreenElement ? 'EXIT FULL SCREEN' : 'FULL SCREEN') + '</button>' + (tr ? '<div class="grid2"><button class="btn" data-act="spawnboss">SPAWN BOSS</button><button class="btn" data-act="nextworld">NEXT WORLD</button></div>' : '') + '<div class="grid2"><button class="btn" data-act="restart">RESTART</button><button class="btn" data-act="settings">SETTINGS</button></div><button class="btn warn" data-act="quit">QUIT TO MENU</button>' + (dev ? '<div class="grid2"><button class="btn sm gold" data-act="cheat:win">DEV: WIN</button><button class="btn sm gold" data-act="cheat:god">DEV: GOD</button></div>' : '') + '</div></div>';
  },
  scResult: () => {
    const d = UI.res, win = d.win, m = d.mode, titles = { expedition: win ? 'SECTOR CLEARED' : 'STARFIGHTER DESTROYED', endless: 'RUN OVER', blitz: 'TIME!', rush: win ? 'BOSS RUSH COMPLETE' : 'DEFEATED', training: 'SESSION OVER', daily: win ? 'DAILY COMPLETE' : 'DAILY FAILED', nohit: win ? 'FLAWLESS' : 'YOU WERE HIT', vault: win ? 'VAULT CRACKED' : 'VAULT LOCKED', defense: win ? 'STATION SAVED' : d.lost ? 'STATION LOST' : 'SHIP LOST', hardcore: 'HARDCORE OVER', versus: d.vsWin ? ((d.vsNm && d.vsNm[d.vsWin - 1]) || 'PLAYER ' + d.vsWin).toUpperCase() + ' WINS' : 'DRAW', chal: d.beat ? 'CHALLENGE BEATEN' : win ? 'CHALLENGE DONE' : 'CHALLENGE FAILED', gallery: win ? 'REMATCH WON' : 'REMATCH LOST', retro: win ? 'GAME CLEAR!' : 'GAME OVER' };
    const rows = [d.labB ? ['STATION LAB BONUS', '+' + fmt(d.labB)] : null, d.oreLost ? ['REFINERY CORES LOST', '-' + fmt(d.oreLost)] : null, d.rep ? ['REPUTATION', '+' + d.rep + (d.repUp ? ' - NOW ' + d.repUp.toUpperCase() : '')] : null, ['SCORE', fmt(d.score)], ['KILLS', d.kills], ['CORES PICKED UP', '+' + fmt(d.cores)], d.bonus ? ['MISSION BONUS', '+' + fmt(d.bonus)] : null, d.remix ? ['REMIX FIRST-CLEAR (INCLUDED)', '+' + fmt(d.remix)] : null, m === 'endless' || m === 'hardcore' ? ['WAVE REACHED', d.wave + 1] : null, d.alt ? ['SIDE ROUTE BONUS', '+30%'] : null, d.secret ? ['SECRET EXIT', 'FOUND!'] : null, m === 'defense' ? ['WAVES HELD', d.wave] : null, d.stn !== undefined ? ['STATION INTEGRITY', d.stn + '%'] : null, d.streak ? ['DAILY STREAK', d.streak + (d.streak === 1 ? ' day' : ' days')] : null, ['GRAZES', d.graze], ['LONGEST CHAIN', d.maxCombo + ' kills'], ['TIME', d.time + 's'], d.xp ? ['PILOT XP', '+' + fmt(d.xp)] : null, d.lvUp ? ['LEVEL UP!', 'LV ' + d.lv + ' ' + rankName(d.lv).toUpperCase() + ' (+' + fmt(d.lvCores | 0) + ')'] : null, d.medal ? [MEDALS[d.medal][0] + ' MEDAL', '+' + fmt(d.medalCores | 0)] : null, d.missions ? ['MISSIONS DONE', d.missions.length + ' - claim in Missions'] : null, d.mastery ? ['MASTERY', d.mastery.join(', ')] : null, ...(d.vs ? d.vs.map((s, i) => [((d.vsNm && d.vsNm[i]) || 'PLAYER ' + (i + 1)).toUpperCase(), fmt(s)]) : []), d.rk ? ['RANKED RATING', d.rk.r1 + ' (' + (d.rk.r1 >= d.rk.r0 ? '+' : '') + (d.rk.r1 - d.rk.r0) + ') ' + rkTier(d.rk.r1).nm.toUpperCase()] : null, d.chal && d.chal.target ? ['SCORE TO BEAT', fmt(d.chal.target)] : null].filter(Boolean);
    return '<div class="card" style="width:min(460px,100%)"><div class="tc"><div class="title" style="font-size:clamp(22px,6vw,34px);background:linear-gradient(180deg,#fff,' + (win ? '#34d399' : '#fb7185') + ');-webkit-background-clip:text;background-clip:text">' + (titles[m] || (win ? 'MISSION COMPLETE' : 'MISSION FAILED')) + '</div>' + (m === 'expedition' && win ? '<div style="font-size:30px;margin:10px 0">' + stars(d.stars) + '</div>' : '') + rankHtml(d) + (titles[m] === undefined ? '' : '') + (d.best ? '<div class="gold b" style="margin-top:8px">★ NEW PERSONAL BEST ★</div>' : '') + (d.unlockW >= 0 ? '<div class="good b" style="margin-top:8px">WORLD ' + (d.unlockW + 1) + ' UNLOCKED: ' + WORLDS[d.unlockW].nm.toUpperCase() + '</div>' : '') + (d.unlock ? '<div class="gold b" style="margin-top:8px">NEW SHIP UNLOCKED: ' + d.unlock + '</div>' : '') + (d.ending ? '<div class="gold b" style="margin-top:8px">CAMPAIGN COMPLETE - THANK YOU FOR FLYING</div>' : '') + (d.assist ? '<div class="mut xs" style="margin-top:6px;letter-spacing:.1em">ASSIST RUN - REDUCED REWARDS</div>' : '') + '</div><div style="margin:14px 0">' + rows.map(r => '<div class="setrow"><span class="mut">' + r[0] + '</span><b>' + r[1] + '</b></div>').join('') + '</div>' + (!win && m !== 'training' && m !== 'blitz' ? '<div class="tipbox"><b class="gold xs" style="letter-spacing:.2em">TIP</b><div class="xs" style="line-height:1.6;margin-top:3px">' + hintFor(d) + '</div></div>' : '') + '<div class="stack">' + (!win && !d.assist && (d.fails | 0) >= 2 && (m === 'expedition' || m === 'daily') ? '<button class="btn gold" data-act="assist">TRY WITH ASSIST: +40% HULL, 35% LESS DAMAGE</button>' : '') +
      (d.newCode ? '<div class="item" style="flex-direction:column;align-items:stretch;gap:6px"><div class="xs mut b" style="letter-spacing:.12em">CHALLENGE A FRIEND - THEY MUST BEAT ' + fmt(Math.max(d.score, d.chal ? d.chal.target : 0)) + '</div><div class="row sp"><b class="acc" style="letter-spacing:.14em">' + d.newCode + '</b><span class="row" style="gap:6px">' + (netOn() ? '<button class="btn sm gold" data-act="chsendto:' + d.newCode + ':' + Math.max(d.score, d.chal ? d.chal.target : 0) + '">SEND</button>' : '') + '<button class="btn sm" data-act="copycode:' + d.newCode + '">COPY</button></span></div></div>' : '') + (m === 'expedition' && win && d.next !== null ? '<button class="btn big" data-act="nextlv">NEXT SECTOR</button>' : '') + (d.side ? '<button class="btn big" data-act="galaxy">BACK TO THE GALAXY</button>' : '') + (m === 'expedition' ? '<button class="btn" data-act="retry">' + (win ? 'REPLAY' : 'RETRY SECTOR') + '</button><button class="btn" data-act="tomap">EXPEDITION MAP</button>' : '<button class="btn big" data-act="retry">PLAY AGAIN</button>') + '<div class="grid2"><button class="btn sm" data-act="shop">SHOP</button><button class="btn sm" data-act="menu">MAIN MENU</button></div></div></div>';
  }
};
const SCLEAR = { scHangar: 1, scBestiary: 1 };

// ---------- UI controller ----------
const UI = {
  top: null, hist: [], w: 0, sel: 0, tier: 1, mode: 'expedition', pi: 0, cat: 'hull', stab: 'GAMEPLAY', res: null, retMode: null,
  el(id) {
    let e = $(id); if (!e) { e = document.createElement('div'); e.id = id; e.className = 'scr' + (SCLEAR[id] ? ' clear' : ''); $('ui').appendChild(e); }
    return e;
  },
  show(id, noHist) {
    document.querySelectorAll('.scr.on').forEach(e => e.classList.remove('on'));
    const e = this.el(id); e.innerHTML = '<div id="hdrag" style="position:absolute;inset:0;pointer-events:auto;touch-action:none;display:' + (id === 'scHangar' ? 'block' : 'none') + '"></div>' + SCR[id](); e.classList.add('on');
    if (id !== 'scHangar' && id.slice(0, 2) === 'sc') { const c = e.querySelector('.card'); if (c) c.scrollTop = 0; }
    if (!noHist && this.top && this.top !== id && !['scPause', 'scResult', 'scTut'].includes(this.top)) this.hist.push(this.top);
    this.top = id; G.showCfg = id === 'scHangar' ? prevCfg() : null; if (id !== 'scKeys') G.rebind = null;
    if (G.scene !== 'play' && R3) R3.setView(id === 'scHangar' ? 'hangar' : id === 'scBestiary' ? 'model' : 'menu');
    if (id === 'scBestiary') bstShow();
    const mp = e.querySelector('#mapScroll'); if (mp) { const n = mp.querySelector('.node.av:last-of-type, .node.sel'); const av = mp.querySelectorAll('.node.av'); const t = av[av.length - 1] || mp.querySelector('.node'); if (t && !this._keepScroll) mp.scrollLeft = Math.max(0, t.offsetLeft - mp.clientWidth / 2 + 30); if (this._keepScroll) mp.scrollLeft = this._keepScroll; this._keepScroll = 0; }
    if (this.gpfOn) navRestore();
  },
  refresh() { if (!this.top || !SCR[this.top]) return; const mp = $('mapScroll'); if (mp) this._keepScroll = mp.scrollLeft; const sc = document.querySelector('.scr.on .card'), st = sc ? sc.scrollTop : 0; this.show(this.top, true); const c = document.querySelector('.scr.on .card'); if (c) c.scrollTop = st; },
  hideAll() { document.querySelectorAll('.scr.on').forEach(e => e.classList.remove('on')); this.top = null; this.hist = []; },
  back() { const p = this.hist.pop(); if (G.scene === 'play' && G.paused && !p) { this.resume(); return; } this.show(p || 'scMenu', true); },
  escape() { if (this.top === 'scMenu') return; if (this.top === 'scPause') return togglePause(); this.back(); },
  pause() { this.show('scPause', true); },
  resume() { this.hideAll(); G.paused = false; },
  result(d) { this.res = d; clearMsgs(); this.show('scResult', true); }
};
function uiTick() { }

// ---------- actions ----------
function startLevel(w, lv, tier, alt) { const o = { mode: 'expedition', w, lv, tier, alt: !!alt, co: SAVE.players === 2 }; G.last = o; beginRun(o); }
function startMode(m, w) {
  const co = SAVE.players === 2; let o;
  if (m === 'daily') return startDaily();
  if (m === 'nohit') o = { mode: 'expedition', var: 'nohit', w: w | 0, lv: 12, tier: 1, co };
  else if (m === 'vault') o = { mode: 'expedition', var: 'vault', w: Math.max(0, Math.min(SAVE.wu, WORLDS.length) - 1), lv: 12, tier: 1, co };
  else o = { mode: m, w: w | 0, lv: 0, tier: 1, co };
  G.last = o; beginRun(o);
}
function buyUp(pl, k) { const U = UPG[k], lv = pl.up[k], pr = upPrice(k, lv); if (lv >= U.max) return; if (SAVE.cores < pr) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= pr; pl.up[k]++; SFX.buy(); saveGame(); UI.refresh(); }
const ACT = {
  play() { if (!SAVE.tut && !G._tutAsked) { G._tutAsked = 1; UI.show('scTut'); return; } UI.show('scModes'); },
  tutlater() { SAVE.tut = true; saveGame(); UI.show('scMenu', true); },
  tutorial() { SAVE.tut = SAVE.tut; UI.hideAll(); beginRun({ mode: 'tutorial', w: 0 }); },
  tutnext() { const R = G.run; if (!R || !R.tut) return; const T = R.tut, s = TUT[T.step]; if (s.last) tutFinish(false); else tutGo(T.step + 1); },
  tutskip() { tutFinish(true); },
  players(a) { SAVE.players = +a[0]; saveGame(); UI.refresh(); },
  hangar() { UI.prev = null; UI.cat = UI.cat || 'hull'; UI.show('scHangar'); },
  shop() { if (G.scene === 'play') { exitToMenu('scShop'); return; } UI.show('scShop'); },
  settings() { UI.show('scSettings'); },
  back() { UI.prev = null; UI.back(); },
  menu() { exitToMenu('scMenu'); },
  mode(a) { const m = a[0]; if (m === 'daily') { UI.show('scDaily'); return; } if (MODES[m].secret && !SAVE.unl[m]) { SFX.no(); alertMsg('LOCKED - A SECRET. KEEP PLAYING.'); return; } UI.mode = m; if (m === 'rush' || m === 'vault') { startMode(m, 0); return; } UI.w = Math.min(UI.w, SAVE.wu - 1); UI.sel = m === 'expedition' ? firstOpen(UI.w, UI.tier) : 0; UI.show('scMap'); },
  world(a) { const w = +a[0]; if (w >= SAVE.wu) { SFX.no(); alertMsg('DEFEAT THE PREVIOUS BOSS TO UNLOCK'); return; } UI.w = w; UI.tier = Math.min(UI.tier, prog(w).t); UI.sel = firstOpen(w, UI.tier); UI.refresh(); },
  tier(a) { UI.tier = +a[0]; UI.sel = firstOpen(UI.w, UI.tier); UI.refresh(); },
  lvl(a) { UI.alt = a[1] === 'alt' ? UI.w + ':' + a[0] : null; const i = +a[0], arr = prog(UI.w).done[UI.tier - 1] || []; let first = 0; while (first < LV && arr[first]) first++; if (SAVE.devAll) first = LV - 1; if (i > first) { SFX.no(); alertMsg('CLEAR EARLIER SECTORS FIRST'); return; } UI.sel = i; SFX.click(); UI.refresh(); },
  start() { if (UI.mode === 'expedition') startLevel(UI.w, UI.sel, UI.tier, !!ALT_NODE[UI.sel] && UI.alt === UI.w + ':' + UI.sel); else startMode(UI.mode, UI.w); },
  cat(a) { UI.cat = a[0]; UI.prev = null; SFX.click(); UI.refresh(); },
  ptab(a) { UI.pi = +a[0]; UI.prev = null; SFX.click(); UI.show(UI.top, true); },
  part(a) { const pl = SAVE.pl[pi()], cat = a[0], id = a[1], P = PARTS[cat][id]; if (pl.own[cat].indexOf(id) < 0) { if (!UI.prev || UI.prev[0] !== cat || UI.prev[1] !== id) { UI.prev = [cat, id]; SFX.click(); UI.refresh(); return; } if (SAVE.cores < P.p) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= P.p; pl.own[cat].push(id); SFX.buy(); } pl.cfg[cat] = id; UI.prev = null; saveGame(); UI.refresh(); },
  finish(a) { const pl = SAVE.pl[pi()], id = a[0]; pl.own.finish = pl.own.finish || ['chrome']; if (pl.own.finish.indexOf(id) < 0) { if (!UI.prev || UI.prev[0] !== 'finish' || UI.prev[1] !== id) { UI.prev = ['finish', id]; SFX.click(); UI.refresh(); return; } if (SAVE.cores < FINISHES[id].p) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= FINISHES[id].p; pl.own.finish.push(id); SFX.buy(); } pl.cfg.finish = id; UI.prev = null; saveGame(); UI.refresh(); },
  paint(a) { SAVE.pl[pi()].cfg.paint = a[0]; saveGame(); SFX.click(); UI.refresh(); },
  accent(a) { SAVE.pl[pi()].cfg.accent = a.join(':'); saveGame(); SFX.click(); UI.refresh(); },
  stripe() { const c = SAVE.pl[pi()].cfg; c.stripe = c.stripe === false; saveGame(); UI.refresh(); },
  wpn(a) { const pl = SAVE.pl[pi()], id = a[0], w = WPN[id]; if (pl.wown.indexOf(id) < 0) { if (SAVE.cores < w.price) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= w.price; pl.wown.push(id); SFX.buy(); } pl.wpn = id; saveGame(); UI.refresh(); },
  buy(a) { buyUp(SAVE.pl[pi()], a[0]); },
  wup(a) { buyWup(SAVE.pl[pi()], a[0]); },
  wevo(a) { buyWevo(SAVE.pl[pi()], a[0]); },
  card(a) { pickCard(+a[0]); },
  cardroll() { const K = G.pick; if (!K) return; const cost = 20 * (K.rr + 1); if (SAVE.cores < cost) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= cost; K.rr++; K.opts = rollCards(G.players[K.who], 3); SFX.buy(); UI.refresh(); },
  cardskip() { const K = G.pick; if (!K) return; SAVE.cores += 25; if (G.run) G.run.cores += 25; SFX.pick(); endPick(); },
  stab(a) { UI.stab = a[0]; UI.refresh(); },
  resume() { togglePause(); },
  restart() { UI.hideAll(); G.paused = false; G.inCombat = false; if (G.last) beginRun(G.last); },
  quit() { exitToMenu('scMenu'); },
  retry() { UI.hideAll(); if (G.last) beginRun(G.last); },
  nextlv() { const d = UI.res; UI.hideAll(); startLevel(d.w, d.next, d.tier); },
  tomap() { const d = UI.res; UI.w = d.w; UI.tier = d.tier; UI.mode = 'expedition'; UI.sel = firstOpen(d.w, d.tier); exitToMenu('scMap'); },
  spawnboss() { togglePause(); const R = G.run; if (R && !R.boss) { R.boss = spawnBoss(R.w, .6); } },
  nextworld() { const R = G.run; R.w = (R.w + 1) % WORLDS.length; G.world = R.w; buildBackdrop(R.w); R.q = []; G.ent.en.length = 0; togglePause(); },
  rotok() { G.rotOk = true; $('rot').style.display = 'none'; },
  devcode() { const c = String(UI.devCodeVal || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c === 'AETHERIA' || c === 'DEVMODE' || c === 'QUANTUMSTRIKE') { SAVE.dev = true; saveGame(); SFX.buy(); alertMsg('DEV TOOLS UNLOCKED'); UI.devCodeVal = ''; UI.refresh(); } else { SFX.no(); alertMsg('INVALID CODE'); } },
  devoff() { SAVE.dev = false; SAVE.devAll = false; G.god = false; saveGame(); UI.refresh(); },
  fs() { toggleFS(); },
  tap() { UI._taps = (UI._taps || 0) + 1; if (UI._taps === 7) { SAVE.dev = true; saveGame(); alertMsg('DEV TOOLS UNLOCKED (SETTINGS > DATA)'); } },
  cheat(a) { const k = a[0]; if (k === 'cores') { SAVE.cores += 1000; SFX.buy(); } else if (k === 'unlock') { SAVE.wu = WORLDS.length; WORLDS.forEach((_, i) => { prog(i).t = 3; }); } else if (k === 'sectors') { SAVE.devAll = !SAVE.devAll; alertMsg(SAVE.devAll ? 'ALL SECTORS OPEN' : 'SECTORS LOCKED AGAIN'); } else if (k === 'god') { G.god = !G.god; alertMsg(G.god ? 'GOD MODE ON' : 'GOD MODE OFF'); } else if (k === 'win') { togglePause(); if (G.run) { G.players.forEach(p => { p.inv = 99999; }); G.run.stage = 'clear'; G.run.st = 190; if (G.run.boss) { G.run.boss.hp = 1; } } } saveGame(); if (UI.top === 'scSettings') UI.refresh(); },
  resetset() { Object.assign(SET, SET_DEF); SET.keys = {}; applyKeys(); saveSet(); layout(); applyVol(); UI.refresh(); },
  wipe() { if (!window._wipeArm) { window._wipeArm = 1; alertMsg('TAP AGAIN TO WIPE EVERYTHING'); setTimeout(() => { window._wipeArm = 0; }, 3000); return; } store.del(SAVE_KEY); SAVE = loadSave(); saveGame(); UI.show('scMenu', true); }
};
function firstOpen(w, tier) { const arr = prog(w).done[tier - 1] || []; let f = 0; while (f < LV && arr[f]) f++; if (SAVE.devAll) f = Math.min(f, LV - 1); return Math.min(f, LV - 1); }
function initUI() {
  const ui = $('ui');
  ui.addEventListener('click', e => {
    const s = e.target.closest('[data-set]');
    if (s && s.classList.contains('tog')) { const k = s.dataset.set; SET[k] = !SET[k]; s.classList.toggle('on', SET[k]); SFX.click(); applySet(k); return; }
    const el = e.target.closest('[data-act]'); if (!el || el.classList.contains('off') || el.disabled) return;
    audio(); const p = el.dataset.act.split(':'), f = ACT[p[0]]; if (f) { if (p[0] !== 'buy' && p[0] !== 'part') SFX.click(); f(p.slice(1), el, e); }
  });
  const chg = e => { const s = e.target.closest('[data-set]'); if (!s || s.classList.contains('tog')) return; const k = s.dataset.set; let v = s.value; if (typeof SET_DEF[k] === 'number') v = parseFloat(v); SET[k] = v; applySet(k); };
  ui.addEventListener('input', e => { if (e.target.type === 'range') chg(e); else if (e.target.id === 'slotCode') UI.slotCode = e.target.value; else if (e.target.id === 'devCode') UI.devCodeVal = e.target.value; });
  ui.addEventListener('pointerdown', () => { if (UI.gpfOn) { UI.gpfOn = false; navFocus(null); } }, true); ui.addEventListener('change', e => { if (e.target.tagName === 'SELECT') chg(e); });
  let dragX = null;
  const mp = new Map();
  ui.addEventListener('pointerdown', e => { if (e.target.id === 'mdrag') { mp.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { e.target.setPointerCapture(e.pointerId); } catch (x) { } } });
  ui.addEventListener('pointermove', e => { const p = mp.get(e.pointerId); if (!p || !R3) return; if (mp.size === 1) R3.modelDrag(e.clientX - p.x, e.clientY - p.y); else { let o = null; mp.forEach((v, k) => { if (k !== e.pointerId) o = v; }); if (o) { const d0 = Math.hypot(p.x - o.x, p.y - o.y), d1 = Math.hypot(e.clientX - o.x, e.clientY - o.y); if (d0 > 4) R3.modelZoom(d1 / d0); } } p.x = e.clientX; p.y = e.clientY; });
  const mend = e => mp.delete(e.pointerId); ui.addEventListener('pointerup', mend); ui.addEventListener('pointercancel', mend);
  ui.addEventListener('pointerdown', e => { if (e.target.id === 'hdrag') { dragX = e.clientX; try { e.target.setPointerCapture(e.pointerId); } catch (x) { } } });
  ui.addEventListener('pointermove', e => { if (dragX !== null && R3) { R3.spin((e.clientX - dragX) * .012); dragX = e.clientX; } });
  const end = () => { dragX = null; }; ui.addEventListener('pointerup', end); ui.addEventListener('pointercancel', end);
  ui.addEventListener('wheel', e => { if (e.target.id === 'mdrag' && R3) R3.modelZoom(e.deltaY < 0 ? 1.1 : .91); const tb = e.target.closest && e.target.closest('.tabs'); if (tb && !G.inCombat) { tb.scrollLeft += e.deltaY; }
    if (G.inCombat && !G.paused && G.players[0]) cycleWeapon(G.players[0], e.deltaY > 0 ? 1 : -1); }, { passive: true });
}

function toggleFS() {
  const d = document, el = d.documentElement;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
    else { const f = el.requestFullscreen || el.webkitRequestFullscreen; if (!f) { alertMsg('FULL SCREEN NOT SUPPORTED HERE (TRY F11)'); return; } const p = f.call(el); if (p && p.catch) p.catch(() => alertMsg('FULL SCREEN BLOCKED (TRY F11)')); }
  } catch (e) { alertMsg('FULL SCREEN BLOCKED (TRY F11)'); }
}
document.addEventListener('fullscreenchange', () => { setTimeout(layout, 80); if (UI.top === 'scMenu' || G.paused) UI.refresh && UI.refresh(); });
