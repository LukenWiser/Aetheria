// ================= UI: Creator (level editor + boss builder), AetherOS mode, corrupted map nodes =================
Object.assign(MODES, {
  create: { nm: 'Creator', ds: 'Build your own levels and bosses, test them, and swap share codes with friends.', ic: 'map', cat: 1 },
  crash: { nm: 'AetherOS', ds: 'The game crashed. Something is still running inside it.', ic: 'bolt', cat: 1, secret: 1, hint: 'Defeat The Null Process and see what happens to the game itself.' }
});
const CR = { tab: 'level', lv: null, cb: null, msg: '', code: '' };
const crLv = () => CR.lv || (CR.lv = newLevel());
const crCb = () => CR.cb || (CR.cb = newCBoss());
const edEnemies = () => { const set = new Set(); for (let w = 0; w < Math.min(SAVE.wu, WORLDS.length); w++) worldEnemies(w).forEach(id => set.add(id)); Object.keys(SAVE.kd || {}).forEach(id => { if (EN[id] && id !== 'rival' && id !== 'dummy') set.add(id); }); set.delete('rock'); return Array.from(set); };
const opt = (v, l, sel) => '<option value="' + escH(v) + '"' + (String(sel) === String(v) ? ' selected' : '') + '>' + escH(l) + '</option>';
function crLevelHtml() {
  const L = crLv(), ens = edEnemies(), cbs = SAVE.cbs || [];
  const waves = L.waves.map((W, i) => '<div class="edw"><div class="row sp"><b class="acc xs" style="letter-spacing:.14em">WAVE ' + (i + 1) + '</b><button class="btn sm warn" data-act="edwx:' + i + '">REMOVE WAVE</button></div>' + W.map((g, j) => '<div class="edg"><select data-chg="edg:' + i + ':' + j + ':id">' + ens.map(id => opt(id, EN[id].nm, g.id)).join('') + '</select><span class="row" style="gap:4px"><button class="btn sm" data-act="edn:' + i + ':' + j + ':-1">-</button><b style="min-width:22px;text-align:center">' + g.n + '</b><button class="btn sm" data-act="edn:' + i + ':' + j + ':1">+</button></span><select data-chg="edg:' + i + ':' + j + ':f">' + Object.keys(FORMS).map(f => opt(f, FORMS[f], g.f)).join('') + '</select><button class="btn sm" data-act="edgx:' + i + ':' + j + '">X</button></div>').join('') + (W.length < 6 ? '<button class="btn sm" data-act="edga:' + i + '" style="margin-top:6px">+ ADD GROUP</button>' : '') + '</div>').join('');
  const bossSel = '<select data-chg="ed:boss">' + opt('', 'No boss', L.cb ? 'c' : L.boss === null ? '' : L.boss) + BOSSES.slice(0, BASE_BOSSES).map((B, w) => bossBeaten(w) ? opt(w, B.nm, L.cb ? '' : L.boss) : '').join('') + cbs.map((c, k) => opt('c' + k, 'Custom: ' + c.nm, L.cb && L.cbk === k ? 'c' + k : '')).join('') + '</select>';
  return '<div class="edrow"><label>NAME</label><input data-chg="ed:nm" maxlength="28" value="' + escH(L.nm) + '"></div><div class="edrow"><label>WORLD</label><select data-chg="ed:w">' + WORLDS.map((W, w) => w < SAVE.wu ? opt(w, (w + 1) + '. ' + W.nm, L.w) : '').join('') + '</select></div><div class="edrow"><label>END BOSS</label>' + bossSel + '</div>' +
    '<div class="edws">' + waves + '</div>' + (L.waves.length < 8 ? '<button class="btn sm" data-act="edwa" style="margin-top:8px">+ ADD WAVE</button>' : '') +
    '<div class="row sp wrap" style="margin-top:12px;gap:6px"><button class="btn gold" data-act="edplay">TEST PLAY</button><button class="btn" data-act="edsave">SAVE</button><button class="btn" data-act="edshare">SHARE CODE</button><button class="btn" data-act="edload">LOAD CODE</button><button class="btn sm warn" data-act="ednew">NEW</button></div>' +
    ((SAVE.lvls || []).length ? '<div class="xs mut b" style="letter-spacing:.14em;margin:12px 0 6px">SAVED LEVELS</div><div class="row wrap" style="gap:6px">' + SAVE.lvls.map((l, k) => '<button class="btn sm" data-act="edopen:' + k + '">' + escH(l.nm) + '</button>').join('') + '</div>' : '');
}
function crBossHtml() {
  const C = crCb(), mods = BOSSES.slice(0, BASE_BOSSES).map((B, w) => bossBeaten(w) ? opt(w, B.nm, C.m) : '').join('') || opt(0, BOSSES[0].nm, 0);
  const ens = edEnemies().filter(id => !EN[id].elite);
  const ph = C.ph.map((p, i) => '<div class="edw"><div class="row sp"><b class="acc xs" style="letter-spacing:.14em">PHASE ' + (i + 1) + (i ? ' - BELOW ' + Math.round((1 - i / C.ph.length) * 100) + '% HP' : '') + '</b><span class="row" style="gap:6px"><select data-chg="cbm:' + i + '">' + Object.keys(BMOVES).map(m => opt(m, BMOVES[m], p.mv)).join('') + '</select>' + (C.ph.length > 1 ? '<button class="btn sm warn" data-act="cbpx:' + i + '">X</button>' : '') + '</span></div>' +
    p.atk.map((a, j) => '<div class="edg"><select data-chg="cba:' + i + ':' + j + ':k">' + Object.keys(ATKP).map(k => opt(k, ATKP[k].nm, a[0])).join('') + '</select><select data-chg="cba:' + i + ':' + j + ':l">' + [[0, 'Light'], [1, 'Medium'], [2, 'Heavy']].map(l => opt(l[0], l[1], a[1])).join('') + '</select><button class="btn sm" data-act="cbax:' + i + ':' + j + '">X</button></div>').join('') + (p.atk.length < 4 ? '<button class="btn sm" data-act="cbaa:' + i + '" style="margin-top:6px">+ ADD ATTACK</button>' : '') + '</div>').join('');
  return '<div class="edrow"><label>NAME</label><input data-chg="cb:nm" maxlength="28" value="' + escH(C.nm) + '"></div><div class="edrow"><label>BODY</label><select data-chg="cb:m">' + mods + '</select></div><div class="edrow"><label>COLOUR</label><span class="row wrap" style="gap:6px">' + BCOLS.map(c => '<i class="sw' + (C.c === c ? ' sel' : '') + '" data-act="cbc:' + c.slice(1) + '" style="background:' + c + ';width:26px;height:26px"></i>').join('') + '</span></div>' +
    '<div class="edrow"><label>HEALTH ' + fmt(C.hp) + '</label><input type="range" min="1000" max="14000" step="250" value="' + C.hp + '" data-chg="cb:hp" style="flex:1"></div><div class="edrow"><label>MINIONS</label><select data-chg="cb:minion">' + ens.map(id => opt(id, EN[id].nm, C.minion)).join('') + '</select></div>' +
    '<div class="edws">' + ph + '</div>' + (C.ph.length < 5 ? '<button class="btn sm" data-act="cbpa" style="margin-top:8px">+ ADD PHASE</button>' : '') +
    '<div class="row sp wrap" style="margin-top:12px;gap:6px"><button class="btn gold" data-act="cbplay">TEST FIGHT</button><button class="btn" data-act="cbsave">SAVE</button><button class="btn" data-act="cbshare">SHARE CODE</button><button class="btn" data-act="cbload">LOAD CODE</button><button class="btn sm warn" data-act="cbnew">NEW</button></div>' +
    ((SAVE.cbs || []).length ? '<div class="xs mut b" style="letter-spacing:.14em;margin:12px 0 6px">SAVED BOSSES</div><div class="row wrap" style="gap:6px">' + SAVE.cbs.map((c, k) => '<button class="btn sm" data-act="cbopen:' + k + '">' + escH(c.nm) + '</button>').join('') + '</div>' : '');
}
Object.assign(SCR, {
  scCreate: () => '<div class="card wide"><div class="row sp wrap"><h2>Creator</h2><div class="seg" style="width:300px"><button data-act="crtab:level" class="' + (CR.tab === 'level' ? 'on' : '') + '">LEVEL EDITOR</button><button data-act="crtab:boss" class="' + (CR.tab === 'boss' ? 'on' : '') + '">BOSS BUILDER</button></div></div><div class="crb">' + (CR.tab === 'level' ? crLevelHtml() : crBossHtml()) + '</div>' +
    '<div class="xs mut b" style="letter-spacing:.14em;margin:12px 0 6px">SHARE CODE</div><textarea id="crCode" class="code" rows="2" placeholder="SHARE CODE puts a code here. Paste a friend\'s code here, then press LOAD CODE.">' + escH(CR.code) + '</textarea><div class="row sp" style="margin-top:6px"><button class="btn sm" data-act="crcopy">COPY</button><span class="xs ' + (CR.msg[0] === '!' ? 'bad' : 'good') + '">' + escH(CR.msg.replace(/^!/, '')) + '</span></div><div class="row sp" style="margin-top:12px"><button class="btn sm" data-act="back">BACK</button></div></div>'
});
const crSaveList = (key, item, max) => { const A = SAVE[key] || (SAVE[key] = []); const i = A.findIndex(x => x.nm === item.nm); if (i >= 0) A[i] = JSON.parse(JSON.stringify(item)); else { A.push(JSON.parse(JSON.stringify(item))); if (A.length > max) A.shift(); } saveGame(); };
const crMsg = m => { CR.msg = m; UI.refresh(); };
const _mode3 = ACT.mode;
ACT.mode = a => { if (a[0] === 'create') { CR.msg = ''; UI.show('scCreate'); return; } if (a[0] === 'crash') { if (!SAVE.unl.crash) { SFX.no(); alertMsg('LOCKED - DEFEAT THE NULL PROCESS'); return; } startCrash(); return; } return _mode3(a); };
Object.assign(ACT, {
  crtab(a) { CR.tab = a[0]; CR.msg = ''; SFX.click(); UI.refresh(); },
  edwa() { crLv().waves.push([{ id: edEnemies()[0] || 'jet', n: 4, f: 'line' }]); UI.refresh(); },
  edwx(a) { crLv().waves.splice(+a[0], 1); UI.refresh(); },
  edga(a) { crLv().waves[+a[0]].push({ id: edEnemies()[0] || 'jet', n: 3, f: 'line' }); UI.refresh(); },
  edgx(a) { crLv().waves[+a[0]].splice(+a[1], 1); UI.refresh(); },
  edn(a) { const g = crLv().waves[+a[0]][+a[1]]; g.n = clamp(g.n + (+a[2]), 1, 12); UI.refresh(); },
  edplay() { const L = crLv(); if (!L.waves.length && !L.cb && (L.boss === null || L.boss === undefined)) { crMsg('!Add a wave or a boss first.'); return; } const o = { mode: 'expedition', var: 'custom', w: L.w | 0, lv: 6, tier: 1, co: SAVE.players === 2, cust: JSON.parse(JSON.stringify(L)) }; G.last = o; beginRun(o); },
  edsave() { crSaveList('lvls', crLv(), 10); crMsg('Level saved.'); },
  edshare() { const L = crLv(); CR.code = packCode('AQL1:', { v: 1, nm: L.nm, w: L.w, waves: L.waves, boss: L.boss, cb: L.cb }); crMsg('Code ready - copy it and send it to a friend.'); },
  edload() { const v = ($('crCode') || {}).value || ''; const L = unpackCode('AQL1:', v); if (!L || !Array.isArray(L.waves)) { crMsg('!That is not a level code (level codes start with AQL1:).'); return; } L.w = clamp(L.w | 0, 0, WORLDS.length - 1); if (L.w >= SAVE.wu) L.w = 0; L.waves = L.waves.slice(0, 8).map(W => (W || []).slice(0, 6).map(g => ({ id: EN[g.id] ? g.id : 'jet', n: clamp(g.n | 0, 1, 12), f: FORMS[g.f] ? g.f : 'line' }))); CR.lv = L; CR.tab = 'level'; crMsg('Level loaded: ' + L.nm); },
  ednew() { CR.lv = newLevel(); crMsg('New level.'); },
  edopen(a) { CR.lv = JSON.parse(JSON.stringify(SAVE.lvls[+a[0]])); crMsg('Opened ' + CR.lv.nm); },
  cbpa() { crCb().ph.push({ mv: 'orbit', atk: [['ring', 1]] }); UI.refresh(); },
  cbpx(a) { crCb().ph.splice(+a[0], 1); UI.refresh(); },
  cbaa(a) { crCb().ph[+a[0]].atk.push(['aim', 1]); UI.refresh(); },
  cbax(a) { const p = crCb().ph[+a[0]]; if (p.atk.length > 1) p.atk.splice(+a[1], 1); UI.refresh(); },
  cbc(a) { crCb().c = '#' + a[0]; UI.refresh(); },
  cbplay() { startCBoss(crCb(), Math.min(crCb().m | 0, SAVE.wu - 1)); },
  cbsave() { crSaveList('cbs', crCb(), 8); crMsg('Boss saved - pick it as an END BOSS in the level editor.'); },
  cbshare() { CR.code = packCode('AQB1:', crCb()); crMsg('Code ready - copy it and send it to a friend.'); },
  cbload() { const v = ($('crCode') || {}).value || ''; const C = unpackCode('AQB1:', v); if (!C || !Array.isArray(C.ph) || !C.ph.length) { crMsg('!That is not a boss code (boss codes start with AQB1:).'); return; } C.ph = C.ph.slice(0, 5).map(p => ({ mv: BMOVES[p.mv] ? p.mv : 'hover', atk: (p.atk || []).slice(0, 4).filter(x => ATKP[x[0]]).map(x => [x[0], clamp(x[1] | 0, 0, 2)]) })); C.hp = clamp(+C.hp || 4000, 1000, 14000); C.m = clamp(C.m | 0, 0, BASE_BOSSES - 1); CR.cb = C; CR.tab = 'boss'; crMsg('Boss loaded: ' + C.nm); },
  cbnew() { CR.cb = newCBoss(); crMsg('New boss.'); },
  cbopen(a) { CR.cb = JSON.parse(JSON.stringify(SAVE.cbs[+a[0]])); crMsg('Opened ' + CR.cb.nm); },
  crcopy() { const v = ($('crCode') || {}).value || ''; if (!v) return; try { navigator.clipboard.writeText(v).then(() => alertMsg('CODE COPIED')); } catch (e) { } }
});
function crChange(k, v) {
  const p = k.split(':'), L = crLv(), C = crCb();
  if (p[0] === 'ed') { if (p[1] === 'nm') L.nm = v.slice(0, 28) || 'My Level'; else if (p[1] === 'w') L.w = +v; else if (p[1] === 'boss') { if (v === '') { L.boss = null; L.cb = null; } else if (v[0] === 'c') { const k2 = +v.slice(1); L.cb = JSON.parse(JSON.stringify(SAVE.cbs[k2])); L.cbk = k2; L.boss = null; } else { L.boss = +v; L.cb = null; } } }
  else if (p[0] === 'edg') { const g = L.waves[+p[1]][+p[2]]; g[p[3]] = v; }
  else if (p[0] === 'cb') { if (p[1] === 'nm') C.nm = v.slice(0, 28) || 'My Boss'; else if (p[1] === 'hp') C.hp = +v; else if (p[1] === 'm') C.m = +v; else if (p[1] === 'minion') C.minion = v; }
  else if (p[0] === 'cbm') C.ph[+p[1]].mv = v;
  else if (p[0] === 'cba') { const a = C.ph[+p[1]].atk[+p[2]]; if (p[3] === 'k') a[0] = v; else a[1] = +v; }
  UI.refresh();
}
document.addEventListener('change', e => { const el = e.target && e.target.closest && e.target.closest('[data-chg]'); if (el && UI.top === 'scCreate') crChange(el.dataset.chg, el.value); });
