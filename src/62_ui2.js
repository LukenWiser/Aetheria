// ================= UI 2: daily challenge, profile + achievements, save slots, key bindings =================
const sT = (n, s) => '<div class="stat"><b>' + n + '</b><span>' + s + '</span></div>';
const fmtT = s => { s = s | 0; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + 'h ' + m + 'm' : m + 'm ' + (s % 60) + 's'; };
const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

Object.assign(SCR, {
  scDaily: () => {
    const di = dailyInfo(), dl = SAVE.dl, W = WORLDS[di.w], streak = dailyStreakNow(), won = !!dl.done[di.key], rows = [];
    for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d); rows.push('<div class="setrow"><span class="' + (i ? 'mut' : 'acc b') + '">' + (i ? k : 'TODAY') + '</span><span>' + (dl.done[k] ? '<span class="good b">WON</span> ' : '') + ((dl.best[k] | 0) ? '<b>' + fmt(dl.best[k]) + '</b>' : '<span class="mut">-</span>') + '</span></div>'); }
    return '<div class="card mid"><div class="row sp"><div><h2>Daily Challenge</h2><div class="xs mut">' + di.key + ' - FIVE WAVES, THEN THE BOSS</div></div><div class="tc"><div class="gold b" style="font-size:24px">' + streak + '</div><div class="xs mut">DAY STREAK</div></div></div>' +
      '<div class="item" style="margin-top:12px;align-items:flex-start"><div class="fl"><div class="xs mut b" style="letter-spacing:.14em">TODAY\'S MODIFIER</div><div class="b acc" style="margin:3px 0">' + di.mod.nm + '</div><div class="xs mut" style="line-height:1.6">' + di.mod.ds + '</div><div class="xs mut" style="margin-top:8px">WORLD: <b style="color:' + W.ac + '">' + W.nm + '</b>' + (SAVE.wu < WORLDS.length ? ' <span class="mut">(more worlds as you unlock them)</span>' : '') + '</div></div></div>' +
      '<div class="xs mut b" style="letter-spacing:.14em;margin:14px 0 4px">LAST 7 DAYS - BEST SCORE</div>' + rows.join('') +
      '<div class="stack" style="margin-top:14px"><button class="btn big" data-act="dstart">' + (won ? 'PLAY AGAIN' : 'START CHALLENGE') + '</button></div><div class="row sp" style="margin-top:12px"><button class="btn sm" data-act="back">BACK</button><span class="xs mut">Win once a day to build a streak. Streaks pay bonus cores.</span></div></div>';
  },
  scProfile: () => {
    const S = SAVE, st = S.st, hv = Object.keys(st.hull).sort((a, b) => st.hull[b] - st.hull[a])[0], fav = hv && PARTS.hull[hv] ? PARTS.hull[hv].nm : '-';
    const stats = [[fmtT(st.time), 'PLAY TIME'], [fmt(st.runs), 'RUNS'], [fmt(st.kills), 'KILLS'], [fmt(st.bosses), 'BOSSES DOWN'], [fmt(st.deaths), 'SHIPS LOST'], [fmt(st.graze), 'GRAZES'], [st.combo + '', 'BEST CHAIN'], [fmt(st.cards), 'CARDS PICKED'], [fav, 'FAVOURITE HULL'], [dailyStreakNow() + '', 'DAILY STREAK'], [S.wu + '/' + WORLDS.length, 'WORLDS'], [sumStars() + '', '3-STAR SECTORS']];
    const ranks = ['S', 'A', 'B', 'C'].map(r => '<span class="rkb" style="color:' + RKC[r] + ';border-color:' + RKC[r] + '">' + r + ' <b>' + st.ranks[r] + '</b></span>').join('');
    const list = ACH.map(a => {
      const got = !!S.ach[a.id], hid = a.sec && !got, cur = Math.min(a.cur(), a.max), pc = Math.round(cur / a.max * 100);
      return '<div class="item ach' + (got ? ' got' : '') + '"><div class="ic ' + (got ? 'gold' : 'mut') + '">' + (hid ? ICO.lock : ICO[a.ic]) + '</div><div class="fl"><div class="b sm">' + (hid ? '???' : a.nm.toUpperCase()) + '</div><div class="xs mut">' + (hid ? 'A secret. Keep playing and it will find you.' : a.ds) + '</div>' + (got || hid ? '' : '<div class="bar" style="height:5px;margin-top:5px"><i style="width:' + pc + '%;--c:#fbbf24"></i></div>') + '</div><div class="xs ' + (got ? 'good b' : 'gold') + '" style="text-align:right;flex:none">' + (got ? 'DONE' : '+' + a.r) + '</div></div>';
    }).join('');
    return '<div class="card wide"><div class="row sp wrap"><h2>Pilot Profile</h2><span class="gold b">' + achCount() + '/' + ACH.length + ' <span class="mut xs">ACHIEVEMENTS</span></span></div><div class="statg" style="margin-top:10px">' + stats.map(s => sT(s[0], s[1])).join('') + '</div><div class="row" style="gap:8px;margin:10px 0 4px;flex-wrap:wrap">' + ranks + '</div><div style="margin-top:10px">' + rankChip() + xpBar() + '</div><div class="grid2" style="margin-top:10px"><button class="btn" data-act="logs">DATA LOGS <span class="acc">' + Object.keys(PS().logs).length + '/' + LOGS.length + '</span></button><button class="btn" data-act="missions">MISSIONS</button></div><div class="grid3" style="margin-top:8px"><button class="btn" data-act="codex">CODEX</button><button class="btn" data-act="juke">JUKEBOX</button><button class="btn" data-act="stats">STATS</button></div><button class="btn" data-act="bestiary" style="width:100%;margin-top:10px">BESTIARY  <span class="gold">' + bstCount()[0] + '/' + bstCount()[1] + '</span> <span class="mut xs">ENEMIES & BOSSES</span></button><div style="margin:14px 0 6px"><h2 style="font-size:15px">Achievements</h2></div><div class="agrid">' + list + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm" data-act="slots">SAVE SLOTS</button>' + (SAVE.flags.ending ? '<button class="btn sm gold" data-act="ending">WATCH ENDING</button>' : '') + '</div></div>';
  },
  scSlots: () => {
    const cards = [0, 1, 2].map(i => {
      const si = slotInfo(i), act = i === SLOT;
      return '<div class="item slot' + (act ? ' act' : '') + '" style="align-items:stretch;flex-direction:column;gap:8px"><div class="row sp wrap"><b>SLOT ' + (i + 1) + (act ? ' <span class="good xs">- ACTIVE</span>' : '') + '</b><span class="xs mut">' + (si ? fmt(si.cores) + ' cores - ' + si.wu + '/' + WORLDS.length + ' worlds - ' + fmt(si.kills) + ' kills - ' + fmtT(si.time) : 'EMPTY') + '</span></div><div class="row" style="gap:6px;flex-wrap:wrap">' +
        (act ? '' : '<button class="btn sm" data-act="slotuse:' + i + '">' + (si ? 'LOAD' : 'NEW GAME') + '</button>') + (si ? '<button class="btn sm" data-act="slotexp:' + i + '">EXPORT</button>' : '') + '<button class="btn sm" data-act="slotimp:' + i + '">IMPORT HERE</button>' + (si ? '<button class="btn sm warn" data-act="slotdel:' + i + '">' + (UI.delArm === i ? 'TAP AGAIN' : 'DELETE') + '</button>' : '') + '</div></div>';
    }).join('');
    const msg = UI.slotMsg || '';
    return '<div class="card mid"><h2>Save Slots</h2><p class="xs mut" style="margin:6px 0 10px;line-height:1.6">Three separate profiles. To move progress to another device: EXPORT a slot, copy the code, then paste it on the other device and press IMPORT HERE on a slot.</p><div class="stack" style="gap:8px">' + cards + '</div><div class="xs mut b" style="letter-spacing:.14em;margin:14px 0 6px">SAVE CODE</div><textarea id="slotCode" class="code" rows="4" placeholder="EXPORT fills this box. To import, paste a code here, then press IMPORT HERE on a slot.">' + escH(UI.slotCode || '') + '</textarea><div class="row sp" style="margin-top:8px"><span class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="slotcopy">COPY CODE</button><button class="btn sm" data-act="bkdl">DOWNLOAD BACKUP FILE</button><button class="btn sm" data-act="bkload">LOAD BACKUP FILE</button></span><span class="xs ' + (msg[0] === '!' ? 'bad' : 'good') + '" id="slotMsg">' + escH(msg.replace(/^!/, '')) + '</span></div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button></div></div>';
  },
  scKeys: () => {
    const rb = G.rebind;
    const col = pi => '<div class="kcol"><div class="b acc xs" style="letter-spacing:.2em;margin-bottom:6px">PLAYER ' + (pi + 1) + '</div>' + KACT.map(r => { const a = r[0], wait = rb && rb.pi === pi && rb.a === a, n = KB[pi][a].length; return '<div class="setrow"><span>' + r[1] + '</span><button class="kbtn' + (wait ? ' wait' : '') + '" data-act="rebind:' + pi + ':' + a + '">' + (wait ? 'PRESS A KEY...' : keyLabel(KB[pi][a][0]) + (n > 1 ? '<i>+' + (n - 1) + '</i>' : '')) + '</button></div>'; }).join('') + '</div>';
    return '<div class="card wide"><h2>Keyboard Controls</h2><p class="xs mut" style="margin:6px 0 10px;line-height:1.6">Tap an action, then press the new key. Esc cancels. A +N badge means extra default keys also work (set a new key to replace them). Reserved: P / Esc pause, N mute, 1-6 pick gun.</p><div class="keycols">' + col(0) + col(1) + '</div>' + padSection() + '<div style="height:12px"></div><div class="row sp"><button class="btn sm" data-act="back">BACK</button><button class="btn sm warn" data-act="keyreset">RESET TO DEFAULTS</button></div></div>';
  }
});

Object.assign(ACT, {
  daily() { UI.show('scDaily'); },
  dstart() { UI.hideAll(); startDaily(); },
  profile() { UI.show('scProfile'); },
  ending() { UI.hideAll(); playCut(endingPanels(), () => UI.show('scProfile'), { music: 14, world: 14 }); },
  slots() { UI.slotMsg = ''; UI.delArm = -1; UI.show('scSlots'); },
  slotuse(a) { switchSlot(+a[0]); UI.slotMsg = ''; UI.show('scSlots', true); },
  slotexp(a) { const i = +a[0]; UI.slotCode = exportCode(i); UI.slotMsg = 'Code for slot ' + (i + 1) + ' is ready. Press COPY CODE.'; UI.refresh(); },
  slotimp(a) { const i = +a[0], ta = $('slotCode'); if (ta) UI.slotCode = ta.value; const r = importCode(UI.slotCode, i); UI.slotMsg = r ? '!' + r : 'Imported into slot ' + (i + 1) + '.'; if (!r) UI.slotCode = ''; UI.refresh(); },
  slotdel(a) {
    const i = +a[0]; if (UI.delArm !== i) { UI.delArm = i; UI.refresh(); setTimeout(() => { if (UI.delArm === i) { UI.delArm = -1; if (UI.top === 'scSlots') UI.refresh(); } }, 3000); return; }
    UI.delArm = -1; deleteSlot(i); UI.slotMsg = 'Slot ' + (i + 1) + ' deleted.'; UI.refresh();
  },
  slotcopy() {
    const ta = $('slotCode'), m = $('slotMsg'), say = (t, bad) => { if (m) { m.textContent = t; m.className = 'xs ' + (bad ? 'bad' : 'good'); } };
    if (!ta || !ta.value) { say('Nothing to copy yet. Press EXPORT on a slot first.', 1); return; }
    ta.focus(); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { }
    if (ok) say('Copied!'); else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => say('Copied!'), () => say('Press and hold the box, then choose Copy.', 1)); else say('Press and hold the box, then choose Copy.', 1);
  },
  keys() { UI.show('scKeys'); },
  rebind(a) { startRebind(+a[0], a[1]); },
  keyreset() { resetKeys(); G.rebind = null; SFX.buy(); UI.refresh(); },
  assist() { UI.hideAll(); if (G.last) beginRun(Object.assign({}, G.last, { assist: true })); }
});

// ================= BESTIARY: every enemy and boss you've beaten, with a 3D model you can turn around =================
function bstInit() { // older saves: credit what the pilot has clearly already fought
  if (SAVE.flags.bst) return; SAVE.kd = SAVE.kd || {}; SAVE.bd = SAVE.bd || {};
  for (let w = 0; w < WORLDS.length; w++) { const pr = SAVE.prog[w]; if (!pr || !pr.done) continue; const any = pr.done.some(a => a && a.some(x => x)), boss = pr.done.some(a => a && a[12]);
    if (any) WORLDS[w].ro.concat([WORLDS[w].el]).forEach(id => { if (!SAVE.kd[id]) SAVE.kd[id] = 1; }); if (boss && !SAVE.bd[w]) SAVE.bd[w] = 1; }
  SAVE.flags.bst = 1;
}
function bstCount() { bstInit(); let n = 0, got = 0; for (let w = 0; w < WORLDS.length; w++) { worldEnemies(w).forEach(id => { n++; if (SAVE.kd[id]) got++; }); n++; if (SAVE.bd[w]) got++; } return [got, n]; }
function bstEntry(k) { return k.slice(0, 2) === 'B:' ? { boss: +k.slice(2) } : { id: k }; }
function bstShow() { const k = UI.bk; if (!R3) return; const e = k && bstEntry(k), ok = e && (e.boss !== undefined ? SAVE.bd[e.boss] : SAVE.kd[e.id]); R3.showModel(ok ? e : null); }
SCR.scBestiary = () => {
  bstInit(); const w = UI.bw | 0, ids = worldEnemies(w), [got, tot] = bstCount();
  if (!UI.bk || (UI.bk.slice(0, 2) !== 'B:' && ids.indexOf(UI.bk) < 0 && UI.bk !== 'B:' + w)) UI.bk = ids.find(id => SAVE.kd[id]) || (SAVE.bd[w] ? 'B:' + w : ids[0]);
  const tabs = WORLDS.map((x, i) => '<div class="tab' + (i === w ? ' on' : '') + '" data-act="bworld:' + i + '">' + (i + 1) + '</div>').join('');
  const ent = ids.map(id => { const d = EN[id], k = SAVE.kd[id] | 0; return '<button class="bent' + (k ? '' : ' lk') + (d.elite ? ' el' : '') + (UI.bk === id ? ' on' : '') + '" data-act="bsel:' + id + '">' + (k ? '<img src="' + enemyThumb(id) + '" alt="">' : '<div class="bq">?</div>') + '<span>' + (k ? d.nm : '???') + '</span><i>' + (k ? fmt(k) + ' KILLED' : 'NOT YET BEATEN') + '</i></button>'; }).join('')
    + '<button class="bent bs' + (SAVE.bd[w] ? '' : ' lk') + (UI.bk === 'B:' + w ? ' on' : '') + '" data-act="bsel:B:' + w + '"><span>' + (SAVE.bd[w] ? BOSSES[w].nm : '??? BOSS') + '</span><i>' + (SAVE.bd[w] ? 'BOSS - ' + SAVE.bd[w] + 'x DEFEATED' : 'BOSS - NOT YET BEATEN') + '</i></button>';
  const e = bstEntry(UI.bk); let info;
  if (e.boss !== undefined) { const B = BOSSES[e.boss], k = SAVE.bd[e.boss] | 0;
    info = k ? '<div class="b gold" style="letter-spacing:.12em">' + B.nm.toUpperCase() + ' <span class="xs">BOSS</span></div><div class="xs mut" style="margin:4px 0">' + WORLDS[e.boss].nm + ' - ' + k + 'x defeated - ' + fmt(B.hp) + ' base HP - ' + ((B.ph || []).length || 1) + ' phases</div><div class="sm" style="line-height:1.55">' + BOSS_INTEL[e.boss] + '</div>'
      : '<div class="b mut">??? BOSS</div><div class="sm mut" style="margin-top:6px;line-height:1.55">Defeat the boss of ' + WORLDS[e.boss].nm + ' to add it here.</div>';
  } else { const d = EN[e.id], k = SAVE.kd[e.id] | 0;
    info = k ? '<div class="b" style="letter-spacing:.12em">' + d.nm.toUpperCase() + (d.elite ? ' <span class="xs gold">ELITE</span>' : '') + '</div><div class="xs mut" style="margin:4px 0">' + fmt(k) + ' killed - ' + d.hp + ' base HP - speed ' + d.sp + '</div><div class="bchips">' + enemyFacts(e.id).map(t => '<span>' + t + '</span>').join('') + '</div><div class="sm" style="line-height:1.55;margin-top:6px">' + (INTEL[e.id] || '') + '</div>'
      : '<div class="b mut">???</div><div class="sm mut" style="margin-top:6px;line-height:1.55">Shoot one down in ' + WORLDS[w].nm + ' to unlock its entry and 3D model.</div>';
  }
  const ok = e.boss !== undefined ? SAVE.bd[e.boss] : SAVE.kd[e.id];
  return '<div class="bstL card"><div class="row sp"><h2>Bestiary</h2><span class="gold b">' + got + '/' + tot + ' <span class="mut xs">DISCOVERED</span></span></div>'
    + '<div class="xs mut b" style="letter-spacing:.14em;margin-top:6px">WORLD ' + (w + 1) + ' - ' + WORLDS[w].nm.toUpperCase() + '</div><div class="tabs wf" style="margin-top:6px">' + tabs + '</div>'
    + '<div class="bgrid">' + ent + '</div><div class="item" style="margin-top:10px;display:block">' + info + '</div>'
    + (ok && R3 ? '<div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn sm" data-act="bturn:-1">TURN LEFT</button><button class="btn sm" data-act="bturn:1">TURN RIGHT</button><button class="btn sm" data-act="bzoom:1">ZOOM +</button><button class="btn sm" data-act="bzoom:-1">ZOOM -</button><button class="btn sm" data-act="bauto">AUTO-SPIN</button><button class="btn sm" data-act="breset">RESET</button></div>' : '')
    + '<div class="row sp" style="margin-top:10px"><button class="btn sm" data-act="back">BACK</button></div></div>'
    + '<div id="mdrag">' + (!R3 ? '<div class="mhint" style="top:45%">3D MODELS ARE OFF - TURN THEM ON IN SETTINGS > GRAPHICS</div>' : ok ? '<div class="mhint">DRAG TO TURN  -  SCROLL OR PINCH TO ZOOM</div>' : '<div class="mhint" style="top:45%;font-size:30px;color:#334155">?</div>') + '</div>';
};
Object.assign(ACT, {
  bestiary() { UI.show('scBestiary'); },
  bworld(a) { UI.bw = +a[0]; UI.bk = null; SFX.click(); UI.refresh(); bstShow(); },
  bsel(a) { UI.bk = a.join(':'); SFX.click(); UI.refresh(); bstShow(); },
  bturn(a) { if (R3) R3.modelTurn(+a[0] * Math.PI / 4); },
  bzoom(a) { if (R3) R3.modelZoom(+a[0] > 0 ? 1.2 : .83); },
  bauto() { if (R3) R3.modelAuto(); },
  breset() { if (R3) R3.modelReset(); }
});

// ================= WORLD BRIEFING: shown before the first sector of each world =================
function enemyThumb(id) {
  if (R3 && R3.thumb) { const u = R3.thumb(id); if (u) return u; }
  const k = 'th2d:' + id; if (enemyThumb[k]) return enemyThumb[k]; // 2D fallback
  const c = document.createElement('canvas'); c.width = 160; c.height = 120; const g = c.getContext('2d'), d = EN[id];
  try { drawEnemy2D(g, { id, x: 80, y: 60, w: Math.min(110, 60 + d.w * .25), boss: false, d }, 0); } catch (e) { }
  return enemyThumb[k] = c.toDataURL();
}
SCR.scBrief = () => {
  const R = G.run, w = R ? R.w : 0, W = WORLDS[w], ids = worldEnemies(w), hz = W.hz && HZ_INTEL[W.hz];
  const rows = ids.map(id => { const d = EN[id]; return '<div class="brow' + (d.elite ? ' el' : '') + '"><img src="' + enemyThumb(id) + '" alt=""><div class="fl"><div class="b sm" style="letter-spacing:.1em">' + d.nm.toUpperCase() + (d.elite ? ' <span class="xs" style="color:#c084fc">ELITE</span>' : '') + '</div><div class="bchips">' + enemyFacts(id).map(t => '<span>' + t + '</span>').join('') + '</div><div class="xs" style="line-height:1.5;margin-top:4px;color:#cbd5e1">' + (INTEL[id] || '').replace(/^ELITE\. /, '') + '</div></div></div>'; }).join('');
  return '<div class="card mid brief"><div class="xs b" style="letter-spacing:.2em;color:' + W.ac + '">INTEL BRIEFING - WORLD ' + (w + 1) + '</div><h2 style="margin-top:2px;color:' + W.ac + '">' + W.nm + '</h2><div class="xs mut">' + W.sub + '</div>'
    + (hz ? '<div class="item" style="margin-top:10px;border-color:rgba(251,191,36,.45)"><div class="fl"><div class="xs b gold" style="letter-spacing:.14em">WORLD HAZARD</div><div class="xs" style="margin-top:3px;line-height:1.5">' + hz + '</div></div></div>' : '')
    + '<div class="bgrid2">' + rows + '</div>'
    + '<div class="xs mut" style="margin-top:10px;line-height:1.5">BOSS AHEAD: <b class="gold">' + BOSSES[w].nm + '</b> waits in sector 13. Each enemy gets a NEW label the first time it shows up in this sector.</div>'
    + '<div class="row sp bfoot"><span class="xs mut">Settings > Gameplay > Enemy briefings</span><button class="btn big" data-act="briefok">GOT IT - LAUNCH</button></div></div>';
};
ACT.briefok = () => { const R = G.run; SAVE.flags.brief = SAVE.flags.brief || {}; if (R) SAVE.flags.brief[R.w] = 1; saveGame(); G.brief = 0; UI.hideAll(); SFX.click(); };

// ================= EXTRA MAPS =================
SCR.scMaps = () => {
  const hm = SAVE.hi.maps || {};
  const cards = MAPS.map((m, i) => '<div class="mode" data-act="playmap:' + m.k + '" style="border-color:' + m.ac + '55"><div class="row"><b style="color:' + m.ac + '">' + m.nm.toUpperCase() + '</b></div><span>' + m.sub + '</span><em>' + (hm[m.k] ? 'BEST ' + fmt(hm[m.k]) : 'NOT PLAYED YET') + '</em></div>').join('');
  return '<div class="card mid"><div class="row sp"><h2>Extra Maps</h2><span class="xs mut">ENDLESS SURVIVAL</span></div><p class="xs mut" style="margin:6px 0 10px;line-height:1.6">Waves from every world keep coming, with a boss every 10 waves. ' + (SET.models && SET.bg3d !== false ? 'Best with 3D backgrounds on.' : 'Turn on 3D models and 3D backgrounds in Settings to see these maps!') + '</p><div class="grid2">' + cards + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button></div></div>';
};
Object.assign(ACT, {
  maps() { UI.show('scMaps'); },
  playmap(a) { const o = { mode: 'endless', w: 0, lv: 0, tier: 1, co: SAVE.players === 2, map: a[0] }; G.last = o; beginRun(o); }
});

// ================= WORLD 16: the UI glitches out =================
const GLY = '█▓▒░#@$%&?!01ΞΔΣ▚▞╳◆◇';
const GL = { on: false, held: [], bars: null };
function glitchCtx() {
  if (UI.top === 'scMap' && UI.mode === 'expedition' && UI.w === GLITCH_W) return true;
  const R = G.run; return !!(R && R.w === GLITCH_W && G.world === GLITCH_W && (G.scene === 'play' || UI.top === 'scResult' || UI.top === 'scBrief'));
}
function glitchTick() {
  const on = glitchCtx(); if (on !== GL.on) { GL.on = on; document.body.classList.toggle('glitchui', on); if (!on) glitchRestore(); }
  document.body.classList.toggle('calm', !!SET.reduce);
  if (!on || SET.reduce) { if (GL.bars) GL.bars.innerHTML = ''; return; }
  glitchRestore(true);
  if (Math.random() < .35) { // corrupt a few labels for a moment
    const root = [document.querySelector('#ui .scr.on'), document.getElementById('hud')].filter(Boolean), nodes = [];
    root.forEach(r => { const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.trim().length > 1 && n.parentElement && n.parentElement.offsetParent !== null && !n.parentElement.closest('input,textarea')) nodes.push(n); });
    for (let k = 0; k < 3 && nodes.length; k++) { const n = nodes[(Math.random() * nodes.length) | 0], t = n.nodeValue; if (GL.held.some(h => h[0] === n)) continue;
      const a = t.split('').map(ch => ch !== ' ' && Math.random() < .45 ? GLY[(Math.random() * GLY.length) | 0] : ch).join(''); GL.held.push([n, t, 1 + ((Math.random() * 3) | 0)]); n.nodeValue = a; }
  }
  if (!GL.bars) { GL.bars = document.createElement('div'); GL.bars.id = 'gbars'; document.body.appendChild(GL.bars); }
  GL.bars.innerHTML = Math.random() < .25 ? Array.from({ length: 2 + ((Math.random() * 4) | 0) }, () => '<i style="top:' + (Math.random() * 100).toFixed(1) + '%;height:' + (2 + Math.random() * 18).toFixed(0) + 'px;background:' + ['rgba(255,43,214,.22)', 'rgba(34,211,238,.2)', 'rgba(74,222,128,.16)', 'rgba(255,255,255,.12)'][(Math.random() * 4) | 0] + ';transform:translateX(' + ((Math.random() - .5) * 40).toFixed(0) + 'px)"></i>').join('') : '';
}
function glitchRestore(tickOnly) { GL.held = GL.held.filter(h => { if (tickOnly && --h[2] > 0) return true; if (h[0].isConnected) h[0].nodeValue = h[1]; return false; }); }
setInterval(() => { try { glitchTick(); } catch (e) { } }, 110);

// ================= PHOTO MODE: freeze, hide the UI, pick a filter, capture =================
const PHOTO = { f: 0, filters: [['NONE', ''], ['NOIR', 'grayscale(1) contrast(1.25)'], ['VIVID', 'saturate(1.7) contrast(1.1)'], ['RETRO', 'sepia(.6) saturate(1.3) hue-rotate(-12deg)'], ['DREAM', 'saturate(1.3) brightness(1.1) blur(.6px)'], ['GLITCH', 'hue-rotate(160deg) saturate(2)']] };
function photoEl() { let b = document.getElementById('photoBar'); if (!b) { b = document.createElement('div'); b.id = 'photoBar'; document.body.appendChild(b);
  b.addEventListener('click', e => { const a = e.target.closest('[data-p]'); if (!a) return; const k = a.dataset.p;
    photoDo(k); }); }
  const pd = (IN.pads && IN.pads.length) || (G._padPrev && G._padPrev.length), h = (t, k) => pd ? ' <i class="ph">' + k + '</i>' : '';
  b.innerHTML = '<button data-p="f">FILTER: ' + PHOTO.filters[PHOTO.f][0] + h('', 'X') + '</button><button data-p="hud">HUD' + h('', 'Y') + '</button><button data-p="snap" class="snap">CAPTURE' + h('', 'A') + '</button><button data-p="exit">EXIT' + h('', 'B') + '</button>'; return b; }
function photoDo(k, dir) {
  const shot = document.getElementById('photoShot');
  if (k === 'f') { PHOTO.f = (PHOTO.f + (dir || 1) + PHOTO.filters.length) % PHOTO.filters.length; photoApply(); SFX.click(); }
  else if (k === 'snap') photoSnap(); else if (k === 'hud') document.body.classList.toggle('photohud');
  else if (k === 'exit') photoExit(); else if (k === 'close') { if (shot) shot.remove(); } else if (k === 'save') photoSave();
}
let DLNS; try { if (window.claude && window.claude.use) window.claude.use('downloads').then(n => { DLNS = n; }).catch(() => { DLNS = null; }); } catch (e) { }
function photoSave() {
  const i = document.querySelector('#photoShot img'); if (!i) return; const name = 'aetheria-' + Date.now() + '.png';
  if (DLNS) { fetch(i.src).then(r => r.blob()).then(b => DLNS.save({ filename: name, data: b })).then(() => alertMsg('SAVED')).catch(e => { if (!e || e.code !== 'declined') alertMsg('COULD NOT SAVE - HOLD OR RIGHT-CLICK THE PICTURE'); }); return; }
  try { const a = document.createElement('a'); a.href = i.src; a.download = name; document.body.appendChild(a); a.click(); a.remove(); alertMsg('SAVED TO DOWNLOADS'); } catch (e) { alertMsg('HOLD OR RIGHT-CLICK THE PICTURE TO SAVE'); }
}
// controller in photo mode: A capture / save, X or bumpers or d-pad filter, Y hide HUD, B or START back
function photoPad(o, prev) {
  const e = k => o[k] && !prev[k], shot = document.getElementById('photoShot'), L = o.x < -.6 && !(prev.x < -.6), R = o.x > .6 && !(prev.x > .6);
  if (shot) { if (e('a0') || e('x2')) photoSave(); else if (e('b1') || e('start')) photoDo('close'); return; }
  if (e('a0')) photoDo('snap'); else if (e('x2') || e('rb') || R) photoDo('f', 1); else if (e('lb') || L) photoDo('f', -1); else if (e('y3')) photoDo('hud'); else if (e('b1') || e('start')) photoDo('exit');
}
function photoApply() { const f = PHOTO.filters[PHOTO.f][1]; ['cvBg', 'cvFx'].forEach(id => { const c = document.getElementById(id); if (c) c.style.filter = f; }); if (R3 && R3.__renderer) R3.__renderer.domElement.style.filter = f; photoEl(); }
function photoExit() { G.photo = false; document.body.classList.remove('photo', 'photohud'); PHOTO.f = 0; photoApply(); const b = document.getElementById('photoBar'); if (b) b.remove(); UI.show('scPause'); }
function photoSnap() {
  try { render(); const W = window.innerWidth, H = window.innerHeight, c = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1); c.width = W * dpr; c.height = H * dpr; const g = c.getContext('2d'); g.filter = PHOTO.filters[PHOTO.f][1] || 'none';
    [document.getElementById('cvBg'), R3 && R3.__renderer ? R3.__renderer.domElement : null, document.getElementById('cvFx')].forEach(cv => { if (cv && cv.style.visibility !== 'hidden') g.drawImage(cv, 0, 0, c.width, c.height); });
    g.filter = 'none'; g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '700 ' + (12 * dpr) + 'px monospace'; g.fillText('AETHERIA: QUANTUM STRIKE', 14 * dpr, c.height - 14 * dpr);
    let d = document.getElementById('photoShot'); if (d) d.remove(); d = document.createElement('div'); d.id = 'photoShot'; d.innerHTML = '<img alt="screenshot"><div>HOLD (PHONE) OR RIGHT-CLICK (COMPUTER) TO SAVE <button data-p="save">DOWNLOAD</button> <button data-p="close">CLOSE</button></div>' + ((IN.pads && IN.pads.length) || (G._padPrev && G._padPrev.length) ? '<div class="ph2">A / X: DOWNLOAD - B: CLOSE</div>' : ''); d.querySelector('img').src = c.toDataURL('image/png');
    d.addEventListener('click', e => { const k = e.target.dataset.p; if (k) photoDo(k); }); document.body.appendChild(d); SFX.click();
  } catch (e) { alertMsg('CAPTURE FAILED'); }
}
ACT.photo = () => { UI.hideAll(); G.photo = true; document.body.classList.add('photo'); photoEl(); };
ACT.sec = a => { const pl = SAVE.pl[pi()]; if (SECW[a[0]]) pl.sec = a[0]; saveGame(); SFX.click(); UI.refresh(); };
