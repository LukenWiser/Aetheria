// ================= V70: QoL batch 4 - hangar, settings, saves =================
(function () { const st = document.createElement('style'); st.textContent = `
.q-hbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0;padding:8px;border:1px solid rgba(56,189,248,.2);background:rgba(4,10,22,.6)}
.q-hbar .xs{letter-spacing:.18em;color:#94a3b8;margin-right:4px}
.q-col{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0 4px;font:700 10px var(--mono);letter-spacing:.12em;color:#94a3b8}
.q-col input[type=color]{width:44px;height:30px;border:1px solid var(--line);background:none;padding:0;cursor:pointer}
.q-col .sw{width:22px;height:22px}
.lk-it.q-fav,.q-fav.lk-it{box-shadow:0 0 0 2px #fbbf24!important}
.q-favst{position:absolute;top:4px;left:6px;color:#fbbf24;font-size:12px}
.q-slotx{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.q-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:middle}
body.dysfont{--mono:Verdana,Tahoma,"Segoe UI",sans-serif;--disp:Verdana,Tahoma,"Segoe UI",sans-serif}
body.dysfont *{letter-spacing:.02em!important}
body.hchud #hud .hx .fr,body.hchud #top .strip{background:#000!important;border:2px solid #fff!important}
body.hchud #hud .hx .cell{border-color:#fff}body.hchud #hud .hx .hd,body.hchud #hud .hx .rd,body.hchud #top .ob{color:#fff!important}
`; document.head.appendChild(st); })();

// ---------- 81, 82, 85: loadouts, randomise, ship codes (hangar toolbar) ----------
SAVE.flags.loads = SAVE.flags.loads || {};
QPOST.push((id, el) => {
  if (id !== 'scHangar' || !el || el.querySelector('.q-hbar')) return; const host = el.querySelector('.card') || el; const L = SAVE.flags.loads;
  const slot = n => '<button class="btn sm' + (L[n] ? ' gold' : '') + '" data-act="qload:' + n + '" title="' + (L[n] ? 'Load preset ' + n : 'Empty') + '">' + n + '</button>';
  const bar = '<div class="q-hbar"><span class="xs">PRESETS</span>' + [1, 2, 3].map(slot).join('') + '<button class="btn sm" data-act="qsavel">SAVE CURRENT</button><span style="flex:1"></span><button class="btn sm" data-act="qrand">RANDOMISE LOOK</button><button class="btn sm" data-act="qcode">COPY SHIP CODE</button><button class="btn sm" data-act="qpaste">PASTE CODE</button></div>';
  const h = host.querySelector('h2'); if (h) (h.closest('.row') || h).insertAdjacentHTML('afterend', bar); else host.insertAdjacentHTML('afterbegin', bar);
  if (UI.cat === 'paint') { const pl = SAVE.pl[pi()], rc = SAVE.flags.recentCol || []; const items = host.querySelector('.row.wrap'); const cx = '<div class="q-col">CUSTOM HULL <input type="color" id="qPaint" value="' + (pl.cfg.paint || '#94a3b8') + '"> CUSTOM ACCENT <input type="color" id="qAcc" value="' + (pl.cfg.accent || '#22d3ee') + '">' + (rc.length ? ' RECENT ' + rc.map(c => '<span class="sw" data-act="paint:' + c + '" style="background:' + c + '" title="Hull: click, accent: right-click"></span>').join('') : '') + '</div>'; if (items) items.insertAdjacentHTML('beforebegin', cx); }
});
const qLook = pl => ({ cfg: Object.assign({}, pl.cfg), wpn: pl.wpn, cos: JSON.parse(JSON.stringify(PS().cos || {})) });
Object.assign(ACT, {
  qsavel() { const L = SAVE.flags.loads, n = [1, 2, 3].find(k => !L[k]) || (UI.qLastL % 3) + 1 || 1; L[n] = qLook(SAVE.pl[pi()]); UI.qLastL = n; saveGame(); toast('PRESET ' + n + ' SAVED', 'Load it any time from the Hangar', '#22d3ee'); UI.refresh(); },
  qload(a) { const o = SAVE.flags.loads[a[0]]; if (!o) { ACT.qsavel(); return; } const pl = SAVE.pl[pi()]; for (const k in o.cfg) { const own = pl.own[k]; if (!own || own.indexOf(o.cfg[k]) >= 0 || typeof o.cfg[k] !== 'string' || !PARTS[k]) pl.cfg[k] = o.cfg[k]; } if (pl.wown.indexOf(o.wpn) >= 0) pl.wpn = o.wpn; try { const P = PS().cos; for (const c in o.cos) if (c !== 'own') P[c] = o.cos[c]; } catch (e) { } saveGame(); SFX.buy(); toast('PRESET ' + a[0] + ' LOADED', '', '#22d3ee'); UI.refresh(); },
  qrand() { const pl = SAVE.pl[pi()], r = a => a[Math.floor(Math.random() * a.length)]; ['hull', 'wings', 'engine', 'canopy'].forEach(k => { if (pl.own[k] && pl.own[k].length) pl.cfg[k] = r(pl.own[k]); }); pl.cfg.paint = r(PAINTS); if (typeof ACCENTS !== 'undefined') pl.cfg.accent = r(ACCENTS); if (pl.own.finish && pl.own.finish.length) pl.cfg.finish = r(pl.own.finish.concat(['chrome'])); saveGame(); SFX.click(); UI.refresh(); },
  qcode() { const c = 'SHIP1:' + btoa(JSON.stringify(SAVE.pl[pi()].cfg)); try { navigator.clipboard.writeText(c); toast('SHIP CODE COPIED', 'Send it to a friend - they paste it in their Hangar', '#22d3ee'); } catch (e) { alertMsg(c); } },
  async qpaste() { let t = ''; try { t = await navigator.clipboard.readText(); } catch (e) { } if (!/^SHIP1:/.test(t || '')) { alertMsg('COPY A SHIP CODE FIRST'); return; } try { const cfg = JSON.parse(atob(t.slice(6))), pl = SAVE.pl[pi()]; let miss = 0; ['hull', 'wings', 'engine', 'canopy'].forEach(k => { if (cfg[k] && pl.own[k].indexOf(cfg[k]) >= 0) pl.cfg[k] = cfg[k]; else if (cfg[k]) miss++; }); ['paint', 'accent', 'stripe'].forEach(k => { if (cfg[k] !== undefined) pl.cfg[k] = cfg[k]; }); saveGame(); toast('SHIP LOOK APPLIED', miss ? miss + ' part(s) you do not own were skipped' : 'Colours and parts copied', '#22d3ee'); UI.refresh(); } catch (e) { alertMsg('THAT CODE DID NOT WORK'); } }
});
function qRecent(c) { const r = SAVE.flags.recentCol || (SAVE.flags.recentCol = []); const i = r.indexOf(c); if (i >= 0) r.splice(i, 1); r.unshift(c); r.length = Math.min(r.length, 8); }
document.addEventListener('change', e => { const t = e.target; if (!t || (t.id !== 'qPaint' && t.id !== 'qAcc')) return; const pl = SAVE.pl[pi()]; pl.cfg[t.id === 'qPaint' ? 'paint' : 'accent'] = t.value; qRecent(t.value); saveGame(); UI.refresh(); }, true);
document.addEventListener('contextmenu', e => { const s = e.target.closest && e.target.closest('.q-col .sw'); if (!s) return; e.preventDefault(); SAVE.pl[pi()].cfg.accent = s.dataset.act.split(':')[1]; saveGame(); UI.refresh(); }, true);
// ---------- 87: favourite cosmetics (right-click), shown first ----------
SAVE.flags.favCos = SAVE.flags.favCos || {};
QPOST.push((id, el) => { if (id !== 'scLocker' || !el) return; el.querySelectorAll('.lk-grid').forEach(g => { const favs = []; g.querySelectorAll('[data-act^="lksel:"],[data-act^="shbuy:"]').forEach(b => { const k = b.dataset.act.split(':').slice(1).join(':'); if (SAVE.flags.favCos[k]) { b.classList.add('q-fav'); if (!b.querySelector('.q-favst')) b.insertAdjacentHTML('beforeend', '<span class="q-favst">★</span>'); favs.push(b); } }); favs.reverse().forEach(b => g.prepend(b)); }); });
document.addEventListener('contextmenu', e => { if (UI.top !== 'scLocker') return; const b = e.target.closest && e.target.closest('[data-act^="lksel:"],[data-act^="shbuy:"]'); if (!b) return; e.preventDefault(); const k = b.dataset.act.split(':').slice(1).join(':'); if (SAVE.flags.favCos[k]) delete SAVE.flags.favCos[k]; else SAVE.flags.favCos[k] = 1; saveGame(); UI.refresh(); }, true);

// ---------- 89: reset just this settings tab; 94, 95, 96, 99, 100: new options ----------
try {
  const A = SETS.ACCESS; if (A && !A.some(r => r[0] === 'dysfont')) A.push(['dysfont', 'tog', 'Easy-read font', 'Swaps the game\'s fonts for a plain, wide one'], ['hchud', 'tog', 'High-contrast HUD', 'Solid black panels with white outlines'], ['bossParts', 'range', 'Effects during bosses', 'Lower this if boss fights get too busy', [.2, 1, .1]]);
  const C = SETS.CONTROLS; if (C && !C.some(r => r[0] === 'vib')) C.push(['vib', 'range', 'Vibration strength', 'Phones and controllers', [0, 1.5, .1]]);
  const AU = SETS.AUDIO; if (AU && !AU.some(r => r[0] === 'quiet')) AU.push(['quiet', 'tog', 'Quiet hours', 'Mutes the heartbeat and alarm between 10pm and 7am']);
  if (SET.bossParts === undefined) SET.bossParts = 1; if (SET.vib === undefined) SET.vib = 1;
} catch (e) { }
function qBodyFlags() { document.body.classList.toggle('dysfont', !!SET.dysfont); document.body.classList.toggle('hchud', !!SET.hchud); }
qBodyFlags();
const _applySetQ5 = applySet; applySet = function (k) { const r = _applySetQ5.apply(this, arguments); if (k === 'dysfont' || k === 'hchud') qBodyFlags(); if (k === 'bossParts' || k === 'vib') { SET[k] = parseFloat(SET[k]); try { saveSet(); } catch (e) { } } return r; };
const _togQ5 = ACT.tog; // settings toggles go through the generic handler; refresh the body flags after any change
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.tog[data-set]')) setTimeout(qBodyFlags, 0); }, true);
const _hapQ = haptic; haptic = function (ms) { const v = SET.vib === undefined ? 1 : +SET.vib; if (!v) return; return _hapQ(Array.isArray(ms) ? ms.map((x, i) => i % 2 ? x : Math.round(x * v)) : Math.round(ms * v)); };
setInterval(() => { try { const R = G.run; if (!R || G.scene !== 'play') { if (SET._pBase !== undefined) { SET.parts = SET._pBase; delete SET._pBase; } return; } const boss = R.stage === 'boss' && (+SET.bossParts || 1) < 1; if (boss && SET._pBase === undefined) { SET._pBase = SET.parts; SET.parts = SET.parts * SET.bossParts; } else if (!boss && SET._pBase !== undefined) { SET.parts = SET._pBase; delete SET._pBase; } if (AUDX.alert) { const h = new Date().getHours(), q = SET.quiet && (h >= 22 || h < 7); AUDX.alert.gain.value = q ? 0 : (SET.alertVol === undefined ? .9 : SET.alertVol); } } catch (e) { } }, 500);
QPOST.push((id, el) => { if (id !== 'scSettings' || !el || UI.stab === 'DATA' || UI.sq || el.querySelector('[data-act="qresettab"]')) return; const b = el.querySelector('.st-body'); if (b) b.insertAdjacentHTML('beforeend', '<button class="btn sm warn" data-act="qresettab" style="margin-top:12px">Reset ' + escH(String(UI.stab).toLowerCase()) + ' to defaults</button>'); });
ACT.qresettab = () => { (SETS[UI.stab] || []).forEach(r => { const k = r[0]; if (SET_DEF[k] !== undefined) { SET[k] = SET_DEF[k]; try { applySet(k); } catch (e) { } } }); try { saveSet(); } catch (e) { } qBodyFlags(); toast('RESET', UI.stab + ' settings are back to default', '#22d3ee'); UI.refresh(); };

// ---------- 102: settings codes; 101: weekly backup reminder ----------
QPOST.push((id, el) => {
  if (id !== 'scSettings' || !el || UI.stab !== 'DATA' || el.querySelector('[data-act="qsetcopy"]')) return; const b = el.querySelector('.st-body .stack') || el.querySelector('.st-body'); if (!b) return;
  b.insertAdjacentHTML('afterbegin', '<div class="row wrap" style="gap:6px"><button class="btn sm" data-act="qsetcopy">Copy settings code</button><button class="btn sm" data-act="qsetpaste">Paste settings code</button></div>');
});
Object.assign(ACT, {
  qsetcopy() { const s = Object.assign({}, SET); delete s.keys; const c = 'SET1:' + btoa(JSON.stringify(s)); try { navigator.clipboard.writeText(c); toast('SETTINGS COPIED', 'Paste them on another device in Settings > Data', '#22d3ee'); } catch (e) { alertMsg(c.slice(0, 60)); } },
  async qsetpaste() { let t = ''; try { t = await navigator.clipboard.readText(); } catch (e) { } if (!/^SET1:/.test(t || '')) { alertMsg('COPY A SETTINGS CODE FIRST'); return; } try { const o = JSON.parse(atob(t.slice(5))); for (const k in o) { SET[k] = o[k]; try { applySet(k); } catch (e) { } } saveSet(); qBodyFlags(); toast('SETTINGS APPLIED', '', '#22d3ee'); UI.refresh(); } catch (e) { alertMsg('THAT CODE DID NOT WORK'); } }
});
const _expQ = exportCode; exportCode = function () { SAVE.flags.lastExport = Date.now(); return _expQ.apply(this, arguments); };
setTimeout(() => { try { const l = SAVE.flags.lastExport || 0; if (SAVE.st.runs >= 8 && Date.now() - l > 7 * 864e5 && !sessionStorage.getItem('qbk')) { sessionStorage.setItem('qbk', 1); toast('BACK UP YOUR SAVE', 'Settings > Data > Save slots > EXPORT gives you a code that restores everything', '#fbbf24'); } } catch (e) { } }, 9000);

// ---------- 103-107: profile names, colours, copy, last saved, undo delete ----------
const QPN = { get() { try { return JSON.parse(localStorage.getItem('aetheria_slotmeta') || '{}'); } catch (e) { return {}; } }, set(o) { try { localStorage.setItem('aetheria_slotmeta', JSON.stringify(o)); } catch (e) { } } };
const QCOL = ['#22d3ee', '#fb923c', '#a3e635', '#e879f9', '#fbbf24', '#f43f5e'];
let qLastSave = Date.now(); const _saveQ = saveGame; saveGame = function () { qLastSave = Date.now(); return _saveQ.apply(this, arguments); };
function qSlotLabel(i) { const m = QPN.get()[i] || {}; return '<span class="q-dot" style="background:' + (m.c || QCOL[i]) + '"></span>' + escH(m.n || 'Profile ' + (i + 1)); }
QPOST.push((id, el) => {
  if ((id !== 'scSlots' && id !== 'scPick') || !el) return;
  if (id === 'scPick') { el.querySelectorAll('[data-act^="pickslot:"]').forEach(b => { const i = +b.dataset.act.split(':')[1], t = b.querySelector('b'); if (t && !t.querySelector('.q-dot')) t.innerHTML = qSlotLabel(i).toUpperCase(); }); return; }
  if (el.querySelector('.q-slotx')) return;
  el.querySelectorAll('.item.slot').forEach((card, i) => {
    const t = card.querySelector('b'); if (t) t.innerHTML = qSlotLabel(i) + (i === SLOT ? ' <span class="good xs">- ACTIVE</span>' : '');
    const has = !!slotInfo(i) && (i === SLOT || !!store.get(SLOT_KEYS[i])), tr = qTrash(i);
    card.insertAdjacentHTML('beforeend', '<div class="q-slotx"><button class="btn sm" data-act="qsname:' + i + '">RENAME</button><button class="btn sm" data-act="qscol:' + i + '">COLOUR</button>' + (has ? [0, 1, 2].filter(j => j !== i).map(j => '<button class="btn sm" data-act="qsdup:' + i + ':' + j + '">COPY TO ' + (j + 1) + '</button>').join('') : '') + (!has && tr ? '<button class="btn sm gold" data-act="qsrestore:' + i + '">RESTORE DELETED (' + Math.ceil((864e5 - (Date.now() - tr.t)) / 36e5) + 'h left)</button>' : '') + '</div>');
  });
  const h = el.querySelector('h2'); if (h) h.insertAdjacentHTML('afterend', '<div class="xs mut" id="qLastSaved" style="margin-top:4px"></div>');
});
setInterval(() => { const e = document.getElementById('qLastSaved'); if (e) e.textContent = 'Last saved ' + Math.max(0, Math.round((Date.now() - qLastSave) / 1000)) + 's ago - the game saves automatically'; }, 1000);
function qTrash(i) { try { const o = JSON.parse(localStorage.getItem('aetheria_trash_' + i) || 'null'); return o && Date.now() - o.t < 864e5 ? o : null; } catch (e) { return null; } }
const _delQ = deleteSlot; deleteSlot = function (i) { try { const s = i === SLOT ? JSON.stringify(SAVE) : store.get(SLOT_KEYS[i]); if (s) localStorage.setItem('aetheria_trash_' + i, JSON.stringify({ t: Date.now(), s })); } catch (e) { } return _delQ.apply(this, arguments); };
Object.assign(ACT, {
  qsname(a) { const i = +a[0], m = QPN.get(), cur = (m[i] || {}).n || 'Profile ' + (i + 1), card = document.querySelectorAll('#scSlots .item.slot')[i], t = card && card.querySelector('b'); if (!t) return; t.innerHTML = '<input class="inp q-sn" data-i="' + i + '" maxlength="18" value="' + escH(cur) + '" style="font:800 12px var(--mono);padding:4px 6px;width:180px;background:#04101f;color:#fff;border:1px solid var(--acc)">'; const inp = t.querySelector('input'); inp.focus(); inp.select(); },
  qscol(a) { const i = +a[0], m = QPN.get(), c = (m[i] || {}).c || QCOL[i]; (m[i] = m[i] || {}).c = QCOL[(QCOL.indexOf(c) + 1) % QCOL.length]; QPN.set(m); UI.refresh(); },
  qsdup(a) { const i = +a[0], j = +a[1]; const b = document.querySelector('[data-act="qsdup:' + i + ':' + j + '"]'); const target = !!store.get(SLOT_KEYS[j]) || j === SLOT; if (target && b && !b._arm) { b._arm = 1; b.textContent = 'OVERWRITE ' + (j + 1) + '?'; setTimeout(() => { if (b.isConnected) { b._arm = 0; b.textContent = 'COPY TO ' + (j + 1); } }, 3000); return; } saveGame(); const s = i === SLOT ? JSON.stringify(SAVE) : store.get(SLOT_KEYS[i]); if (!s) return; if (j === SLOT) { SAVE = merge(defSave(), JSON.parse(s)); saveGame(); } else store.set(SLOT_KEYS[j], s); toast('PROFILE COPIED', 'Profile ' + (i + 1) + ' -> Profile ' + (j + 1), '#22d3ee'); UI.refresh(); },
  qsrestore(a) { const i = +a[0], o = qTrash(i); if (!o) return; if (i === SLOT) { SAVE = loadSave(); Object.assign(SAVE, merge(defSave(), JSON.parse(o.s))); } store.set(SLOT_KEYS[i], o.s); if (i === SLOT) SAVE = loadSave(); localStorage.removeItem('aetheria_trash_' + i); toast('PROFILE RESTORED', '', '#4ade80'); UI.refresh(); }
});

document.addEventListener('keydown', e => { if (e.target && e.target.classList && e.target.classList.contains('q-sn') && e.key === 'Enter') e.target.blur(); }, true);
document.addEventListener('focusout', e => { const t = e.target; if (!t || !t.classList || !t.classList.contains('q-sn')) return; const i = +t.dataset.i, m = QPN.get(); (m[i] = m[i] || {}).n = (t.value || '').trim().slice(0, 18) || 'Profile ' + (i + 1); QPN.set(m); setTimeout(() => UI.refresh(), 0); }, true);
