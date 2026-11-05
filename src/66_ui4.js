// ================= UI: missions, cosmetics shop, data logs, mastery, ranks =================
const rankChip = () => { const X = PS().xp; return '<span class="rchip r' + rankIdx(X.lv) + '">LV ' + X.lv + ' ' + rankName(X.lv).toUpperCase() + '</span>'; };
const xpBar = () => { const X = PS().xp, f = X.xp / xpNeed(X.lv); return '<div class="xpbar"><i style="width:' + Math.round(f * 100) + '%"></i></div><div class="xs mut" style="margin-top:3px">' + fmt(X.xp) + ' / ' + fmt(xpNeed(X.lv)) + ' XP to level ' + (X.lv + 1) + '</div>'; };
function masteryHtml(pl, id) {
  const m = mastery(id), sk = (pl.wsk && pl.wsk[id]) | 0;
  const opts = [0, 1, 2, 3, 4].map(t => { const ok = t === 0 || m.t >= t, on = sk === t; return '<i class="msk' + (on ? ' on' : '') + (ok ? '' : ' lk') + '" data-act="wskin:' + id + ':' + t + '" title="' + (t ? MTIER[t][1] + ' SKIN' : 'DEFAULT') + '" style="background:' + (t === 4 ? 'conic-gradient(' + RAINBOW.join(',') + ')' : t ? MTIER[t][2] : WPN[id].c) + '"></i>'; }).join('');
  return '<div class="row sp wrap" style="margin-top:6px"><span class="xs b" style="color:' + m.c + '">MASTERY: ' + m.nm + ' - ' + fmt(m.n) + (m.next ? ' / ' + fmt(m.next) + ' kills' : ' kills (MAX)') + '</span><span class="row" style="gap:5px">' + opts + '</span></div>';
}
const COSTAB = { skin: 'SHIP SKINS', trail: 'ENGINE TRAILS', bullet: 'BULLET COLOURS', kfx: 'KILL EFFECTS' };
Object.assign(SCR, {
  scMissions: () => {
    const M = missions(), row = (m, i, wk) => { const D = msnDef(m.id), f = Math.min(1, m.c / m.n); return '<div class="item msn' + (m.got ? ' got' : '') + '"><div class="fl"><div class="b sm">' + (wk ? '<span class="gold">WEEKLY - </span>' : '') + D.nm(m.n).toUpperCase() + '</div><div class="xpbar" style="margin-top:6px"><i style="width:' + Math.round(f * 100) + '%;background:' + (m.done ? '#4ade80' : '#38bdf8') + '"></i></div><div class="xs mut" style="margin-top:3px">' + fmt(m.c) + ' / ' + fmt(m.n) + ' - REWARD ' + fmt(m.rew) + ' CORES + ' + m.xp + ' XP</div></div>' + (m.got ? '<span class="good b xs">CLAIMED</span>' : '<button class="btn sm gold' + (m.done ? '' : ' off') + '" data-act="claim:' + i + '">CLAIM</button>') + '</div>'; };
    return '<div class="card mid"><div class="row sp wrap"><h2>Missions</h2>' + rankChip() + '</div><div class="xs mut" style="margin:4px 0 10px">Three new daily missions every day, and a big weekly one. Progress counts from every mode.</div><div class="stack" style="gap:8px">' + M.d.map((m, i) => row(m, i)).join('') + row(M.w, 'w', 1) + '</div><div style="margin-top:12px">' + xpBar() + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm" data-act="cos">COSMETICS</button></div></div>';
  },
  scCos: () => {
    const tab = UI.cost || 'skin', C = COS[tab], X = PS().xp, cur = tab === 'skin' ? null : PS().cos[tab];
    const items = Object.keys(C).map(id => { const c = C[id], own = cosOwn(tab, id), lock = c.rank && rankIdx(X.lv) < c.rank, on = cur === id;
      const sw = tab === 'skin' ? '<span class="cosw" style="background:linear-gradient(135deg,' + c.cfg.paint + ' 55%,' + c.cfg.accent + ' 55%)"></span>' : c.c ? '<span class="cosw" style="background:' + (c.c === 'rb' ? 'conic-gradient(' + RAINBOW.join(',') + ')' : c.c) + '"></span>' : '<span class="cosw" style="background:#334155"></span>';
      const st = lock ? '<span class="lock">REACH ' + RANKS[c.rank].toUpperCase() + ' RANK</span>' : on ? '<span class="good b">EQUIPPED</span>' : own ? '<span class="acc">' + (tab === 'skin' ? 'OWNED - tap to apply' : 'OWNED - tap to equip') + '</span>' : '<span class="gold b">' + fmt(c.p) + ' CORES</span>';
      return '<div class="opt cos' + (on ? ' sel' : '') + (lock ? ' lkd' : '') + '" data-act="cosbuy:' + tab + ':' + id + '"><div class="row" style="gap:8px">' + sw + '<b>' + c.nm + '</b></div>' + st + '</div>'; }).join('');
    return '<div class="card wide"><div class="row sp wrap"><h2>Cosmetics</h2><span>' + rankChip() + ' <span class="gold b">' + fmt(SAVE.cores) + ' <span class="mut xs">CORES</span></span></span></div><div class="tabs wrap" style="margin:10px 0">' + Object.keys(COSTAB).map(k => '<div class="tab' + (tab === k ? ' on' : '') + '" data-act="costab:' + k + '">' + COSTAB[k] + '</div>').join('') + '</div><div class="grid3 cosg">' + items + '</div><div class="xs mut" style="margin-top:10px">' + (tab === 'skin' ? 'Skins repaint your ship for Pilot ' + (pi() + 1) + '. You can still fine-tune colours in the Hangar.' : tab === 'bullet' ? 'Bullet colours apply to your main gun. Mastery skins (Hangar > Guns) are used when this is set to Weapon Default.' : tab === 'kfx' ? 'Plays every time you destroy an enemy.' : 'Colour of the trail behind your engines.') + ' Higher ranks unlock more items.</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm" data-act="missions">MISSIONS</button></div></div>';
  },
  scLogs: () => {
    const L = PS().logs, n = Object.keys(L).length;
    return '<div class="card mid"><div class="row sp"><h2>Data Logs</h2><span class="acc b">' + n + '/' + LOGS.length + '</span></div><div class="xs mut" style="margin:4px 0 10px">One log is hidden in every world. Look for the glowing DATA LOG pickup - it drifts past once, in one sector per world.</div><div class="stack" style="gap:8px;max-height:min(58vh,520px);overflow-y:auto">' + LOGS.map((g, w) => L[w] ? '<div class="item" style="align-items:flex-start"><div class="fl"><div class="b sm acc">' + (w + 1) + '. ' + g[0].toUpperCase() + '</div><div class="sm" style="margin-top:4px;line-height:1.6">' + g[1] + '</div></div></div>' : '<div class="item" style="opacity:.5"><div class="fl"><div class="b sm">' + (w + 1) + '. ???</div><div class="xs mut">' + (w < SAVE.wu ? 'Hidden in ' + WORLDS[w].nm + ', sector ' + (LOG_LV(w) + 1) : 'World ' + (w + 1) + ' is still locked') + '</div></div></div>').join('') + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button></div></div>';
  }
});
Object.assign(ACT, {
  missions() { UI.show('scMissions'); },
  claim(a) { claimMission(a[0]); UI.refresh(); },
  cos() { UI.show('scCos'); },
  costab(a) { UI.cost = a[0]; SFX.click(); UI.refresh(); },
  cosbuy(a) {
    const cat = a[0], id = a[1], c = COS[cat][id], P = PS().cos; if (!c) return;
    if (c.rank && rankIdx(P && SAVE.xp.lv) < c.rank) { SFX.no(); alertMsg('REACH ' + RANKS[c.rank].toUpperCase() + ' RANK FIRST'); return; }
    if (!cosOwn(cat, id)) { if (SAVE.cores < c.p) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= c.p; P.own[cat].push(id); SFX.buy(); }
    else SFX.click();
    if (cat === 'skin') { Object.assign(SAVE.pl[pi()].cfg, c.cfg); const own = SAVE.pl[pi()].own; own.finish = own.finish || []; if (own.finish.indexOf(c.cfg.finish) < 0) own.finish.push(c.cfg.finish); alertMsg(c.nm.toUpperCase() + ' APPLIED'); }
    else P[cat] = id;
    saveGame(); UI.refresh();
  },
  wskin(a) { const id = a[0], t = +a[1], pl = SAVE.pl[pi()]; if (t && mastery(id).t < t) { SFX.no(); alertMsg('REACH ' + MTIER[t][1] + ' MASTERY FIRST (' + MTIER[t][0] + ' KILLS)'); return; } pl.wsk = pl.wsk || {}; pl.wsk[id] = t; SFX.click(); saveGame(); UI.refresh(); },
  logs() { UI.show('scLogs'); }
});
