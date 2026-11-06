// ================= V67: QoL batch 1 - shop & menus =================
// shared post-render hooks (run after every show/refresh)
const QPOST = [];
const _showQP = UI.show.bind(UI);
UI.show = function (id) { const r = _showQP.apply(this, arguments); for (const f of QPOST) { try { f(this.top, document.getElementById(this.top)); } catch (e) { console.warn('qpost', e); } } return r; };
(function () {
  const st = document.createElement('style'); st.textContent = `
.q-sub{display:block;font:700 10px var(--mono);letter-spacing:.06em;color:#7dd3fc;margin-top:3px}.q-sub.g{color:#86efac}.q-sub.r{color:#fca5a5}.q-sub.m{color:#94a3b8}
.sh-row.q-max{opacity:.55}.sh-row.q-max .sh-tx b::after{content:" MAXED";font:900 9px var(--mono);letter-spacing:.2em;color:#04101f;background:#fbbf24;padding:1px 6px;margin-left:8px;vertical-align:middle}
.sh-row.q-rec{box-shadow:inset 3px 0 0 #fbbf24}.q-rec-tag{font:900 9px var(--mono);letter-spacing:.2em;color:#04101f;background:#fbbf24;padding:1px 6px;margin-left:8px;vertical-align:middle}
.q-need{display:block;font:700 9px var(--mono);opacity:.8;margin-top:2px}
.q-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 10px}
#qUndo{position:absolute;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:30;display:none}
#qCrumb{position:absolute;left:calc(12px + env(safe-area-inset-left));top:calc(3px + env(safe-area-inset-top));z-index:14;pointer-events:none;font:800 9px var(--mono);letter-spacing:.24em;color:rgba(148,163,184,.75);text-transform:uppercase}
#qCrumb b{color:var(--acc)}
body.shipm #qCrumb,body.photo #qCrumb{display:none}
#qWish{display:flex;align-items:center;gap:10px;font:700 10px var(--mono);letter-spacing:.12em;color:#fde68a;padding:6px 10px;border-left:3px solid #fbbf24;background:linear-gradient(90deg,rgba(251,191,36,.14),transparent);margin-top:8px}
#qWish i{flex:1;height:3px;background:rgba(255,255,255,.12);display:block;min-width:60px}#qWish i b{display:block;height:100%;background:#fbbf24}
.q-arm{animation:qarm .5s steps(2) infinite}@keyframes qarm{50%{filter:brightness(1.6)}}
.q-search{width:100%;margin:10px 0 6px;padding:9px 10px;border-radius:3px;border:1px solid var(--line);background:rgba(4,12,26,.9);color:#e2e8f0;font:700 12px var(--mono);letter-spacing:.08em}
`; document.head.appendChild(st);
  const ui = document.getElementById('ui'); if (ui) { ui.insertAdjacentHTML('beforeend', '<button id="qUndo" class="btn gold" data-act="qundo">UNDO PURCHASE</button><div id="qCrumb"></div>'); }
})();

// ---------- 1, 2, 3, 5, 6, 7, 8, 10: a smarter shop ----------
const SHOTN = { twin: 2, spread: 5, lancer: 1, ion: 1, missile: 2, orb: 1, arc: 1, rail: 1 };
const wDps = (pl, id) => { const W = WPN[id], lv = wlvOf(pl, id); return W.d * (SHOTN[id] || 1) * 60 / W.r * (1 + .12 * lv) * (1 + .04 * lv) * (wevOf(pl, id) ? 1.3 : 1); };
const upSpent = (k, lv) => { let s = 0; for (let i = 0; i < lv; i++) s += upPrice(k, i); return s; };
function upDelta(pl, k) {
  const a = shipStats(pl), up = Object.assign({}, pl.up); up[k]++; const b = shipStats(Object.assign({}, pl, { up }));
  const m = { hp: ['Hull', 'hp'], sh: ['Shield', 'sh'], am: ['Plasma', 'am'], dmg: ['Damage', 'dmg', 1], rate: ['Fire rate', 'rate', 1], spd: ['Speed', 'spd', 1], mag: ['Magnet', 'mag', 1] }[k];
  if (!m) return k === 'drn' ? 'Wingmen ' + pl.up.drn + ' -> ' + (pl.up.drn + 1) : k === 'drd' ? 'Wingman damage +25%' : '';
  const f = v => m[2] ? 'x' + v.toFixed(2) : Math.round(v); return m[0] + ' ' + f(a[m[1]]) + ' -> ' + f(b[m[1]]);
}
function shopRec() { const r = SAVE.flags.qRec; return UPG[r] ? r : null; }
const _scShopQ = SCR.scShop;
SCR.scShop = function () {
  const html = _scShopQ.apply(this, arguments), i = pi(), pl = SAVE.pl[i], cat = UI.shc === 'wpn' ? 'wpn' : 'up';
  const bar = cat === 'up' ? '<div class="q-bar"><button class="btn sm gold" data-act="qbuyall">Buy all affordable</button><span class="xs mut">Hold a price to keep buying - Shift+click = MAX - keys 1-9 buy a row - right-click to pin a goal</span></div>'
    : '<div class="q-bar"><div class="mm-seg">' + [['all', 'All'], ['own', 'Owned'], ['new', 'Not owned']].map(([k, n]) => '<button data-act="qwf:' + k + '" class="' + ((UI.qwf || 'all') === k ? 'on' : '') + '">' + n + '</button>').join('') + '</div></div>';
  return html.replace('<section class="sh-list">', '<section class="sh-list">' + bar);
};
QPOST.push((id, el) => {
  if (id !== 'scShop' || !el) return; const i = pi(), pl = SAVE.pl[i], rec = shopRec();
  el.querySelectorAll('[data-act^="buy:"]').forEach(b => {
    const k = b.dataset.act.split(':')[1], row = b.closest('.sh-row,.item'), U = UPG[k]; if (!row || !U) return; const lv = pl.up[k], tx = row.querySelector('.sh-tx') || row.querySelector('.fl');
    if (lv >= U.max) { row.classList.add('q-max'); row.parentElement.appendChild(row); }
    else { if (tx && !tx.querySelector('.q-sub')) tx.insertAdjacentHTML('beforeend', '<span class="q-sub g">' + upDelta(pl, k) + '</span>'); const pr = upPrice(k, lv); if (SAVE.cores < pr && !b.querySelector('.q-need')) b.insertAdjacentHTML('beforeend', '<span class="q-need">need ' + fmt(pr - SAVE.cores) + '</span>'); }
    if (tx && lv > 0 && !tx.querySelector('.q-sub.m')) tx.insertAdjacentHTML('beforeend', '<span class="q-sub m">Spent so far: ' + fmt(upSpent(k, lv)) + ' cores</span>');
    if (k === rec && lv < U.max) { row.classList.add('q-rec'); const nm = row.querySelector('.sh-tx b, .fl .b'); if (nm && !nm.querySelector('.q-rec-tag')) nm.insertAdjacentHTML('beforeend', '<span class="q-rec-tag">RECOMMENDED</span>'); }
  });
  if (UI.shc === 'wpn') {
    const eq = pl.wpn, base = wDps(pl, eq);
    el.querySelectorAll('[data-act^="wpn:"]').forEach(b => {
      const wid = b.dataset.act.split(':')[1], row = b.closest('.sh-row'); if (!row || !WPN[wid]) return; const own = pl.wown.indexOf(wid) >= 0, f = UI.qwf || 'all';
      if ((f === 'own' && !own) || (f === 'new' && own)) { row.style.display = 'none'; return; }
      const tx = row.querySelector('.sh-tx'); if (tx && wid !== eq && !tx.querySelector('.q-sub')) { const d = Math.round((wDps(pl, wid) / base - 1) * 100); tx.insertAdjacentHTML('beforeend', '<span class="q-sub ' + (d >= 0 ? 'g' : 'r') + '">Raw damage vs ' + wName(pl, eq) + ': ' + (d >= 0 ? '+' : '') + d + '%' + (WPN[wid].pierce ? ' (pierces)' : WPN[wid].home ? ' (homing)' : '') + '</span>'); }
      if (!own && SAVE.cores < WPN[wid].price && !b.querySelector('.q-need')) b.insertAdjacentHTML('beforeend', '<span class="q-need">need ' + fmt(WPN[wid].price - SAVE.cores) + '</span>');
    });
  }
});
Object.assign(ACT, {
  qwf(a) { UI.qwf = a[0]; UI.refresh(); },
  qbuyall() { const pl = SAVE.pl[pi()]; let n = 0, spent = 0; for (;;) { let best = null; for (const k in UPG) { const lv = pl.up[k]; if (lv >= UPG[k].max) continue; const pr = upPrice(k, lv); if (pr <= SAVE.cores && (!best || pr < best.pr)) best = { k, pr }; } if (!best) break; SAVE.cores -= best.pr; spent += best.pr; pl.up[best.k]++; n++; } if (!n) { SFX.no(); alertMsg('NOTHING AFFORDABLE'); return; } SFX.buy(); saveGame(); toast('BOUGHT ' + n + ' UPGRADE LEVEL' + (n > 1 ? 'S' : ''), fmt(spent) + ' cores spent on the cheapest upgrades first', '#fbbf24'); UI.refresh(); }
});
// ---------- 4: undo the last purchase for 5 seconds ----------
const QU = { last: null, t: 0 };
function qRemember(o) { QU.last = o; clearTimeout(QU.t); const b = $('qUndo'); if (b) { b.style.display = 'block'; b.textContent = 'UNDO - ' + o.nm + ' (' + fmt(o.pr) + ')'; } QU.t = setTimeout(() => { QU.last = null; if (b) b.style.display = 'none'; }, 5000); }
const _buyUpQ = buyUp; buyUp = function (pl, k) { const lv = pl.up[k], c = SAVE.cores, r = _buyUpQ.apply(this, arguments); if (pl.up[k] > lv) qRemember({ t: 'up', pl, k, n: pl.up[k] - lv, pr: c - SAVE.cores, nm: UPG[k].nm }); return r; };
const _buyMaxQ = buyMax; buyMax = function (pl, k) { const lv = pl.up[k], c = SAVE.cores, r = _buyMaxQ.apply(this, arguments); if (pl.up[k] > lv) qRemember({ t: 'up', pl, k, n: pl.up[k] - lv, pr: c - SAVE.cores, nm: UPG[k].nm + ' x' + (pl.up[k] - lv) }); return r; };
const _wpnQ = ACT.wpn; ACT.wpn = function (a) { const pl = SAVE.pl[pi()], had = pl.wown.indexOf(a[0]) >= 0, prev = pl.wpn, c = SAVE.cores, r = _wpnQ.apply(this, arguments); if (!had && pl.wown.indexOf(a[0]) >= 0) qRemember({ t: 'w', pl, id: a[0], prev, pr: c - SAVE.cores, nm: WPN[a[0]].nm }); return r; };
ACT.qundo = () => { const o = QU.last; if (!o) return; if (o.t === 'up') o.pl.up[o.k] = Math.max(0, o.pl.up[o.k] - o.n); else { o.pl.wown = o.pl.wown.filter(x => x !== o.id); o.pl.wpn = o.prev; } SAVE.cores += o.pr; QU.last = null; $('qUndo').style.display = 'none'; saveGame(); SFX.click(); toast('REFUNDED', fmt(o.pr) + ' cores back', '#22d3ee'); UI.refresh(); };
const _shQU = UI.show.bind(UI); UI.show = function (id) { if (id !== 'scShop' && id !== this.top) { const b = $('qUndo'); if (b) b.style.display = 'none'; QU.last = null; } return _shQU.apply(this, arguments); };
// ---------- 9: hold a price to keep buying; 14: confirm big purchases; 15: number keys ----------
(function () {
  let hold = null, fired = false;
  document.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('[data-act^="buy:"]'); if (!b) return; const k = b.dataset.act.split(':')[1]; fired = false; clearTimeout(hold); hold = setTimeout(function rep() { fired = true; const pl = SAVE.pl[pi()]; if (pl.up[k] >= UPG[k].max || SAVE.cores < upPrice(k, pl.up[k])) return; ACT.buy([k]); hold = setTimeout(rep, 130); }, 450); }, true);
  const stop = () => { clearTimeout(hold); hold = null; }; document.addEventListener('pointerup', stop, true); document.addEventListener('pointercancel', stop, true);
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-act^="buy:"],[data-act^="wpn:"],[data-act^="wup:"]'); if (!b) return;
    if (fired && b.dataset.act.startsWith('buy:')) { fired = false; e.preventDefault(); e.stopPropagation(); return; }
    const [t, id] = b.dataset.act.split(':'), pl = SAVE.pl[pi()];
    const pr = t === 'buy' ? (UPG[id] && pl.up[id] < UPG[id].max ? upPrice(id, pl.up[id]) : 0) : t === 'wpn' ? (pl.wown.indexOf(id) < 0 ? WPN[id].price : 0) : (typeof wupPrice === 'function' ? wupPrice(id, wlvOf(pl, id)) : 0);
    if (pr >= 500 && pr <= SAVE.cores && pr > SAVE.cores * .5 && SET.qConfirm !== false) { if (b._arm && performance.now() - b._arm < 3000) return; b._arm = performance.now(); b.classList.add('q-arm'); const t0 = b.innerHTML; b.innerHTML = 'Confirm? ' + fmt(pr); setTimeout(() => { if (b.isConnected) { b.innerHTML = t0; b.classList.remove('q-arm'); b._arm = 0; } }, 3000); e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('keydown', e => {
    if (G.scene === 'play' || e.repeat) return; const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (UI.top === 'scShop' && /^Digit[1-9]$/.test(e.code)) { const bs = [...document.querySelectorAll('#scShop [data-act^="buy:"],#scShop [data-act^="wpn:"]')].filter(b => b.offsetParent); const b = bs[+e.code.slice(5) - 1]; if (b) { b.click(); e.preventDefault(); } }
  });
})();
// ---------- 13: pin a goal (right-click / long-press a shop item) ----------
function qWishOf(el) { const b = el.closest && el.closest('[data-act^="buy:"],[data-act^="wpn:"]'); if (!b) return null; const [t, id] = b.dataset.act.split(':'), pl = SAVE.pl[pi()]; if (t === 'buy' && UPG[id] && pl.up[id] < UPG[id].max) return { nm: UPG[id].nm + ' LV' + (pl.up[id] + 1), pr: upPrice(id, pl.up[id]), t, id }; if (t === 'wpn' && pl.wown.indexOf(id) < 0) return { nm: WPN[id].nm, pr: WPN[id].price, t, id }; return null; }
document.addEventListener('contextmenu', e => { if (UI.top !== 'scShop') return; const w = qWishOf(e.target); if (!w) return; e.preventDefault(); SAVE.flags.wish = w; saveGame(); toast('GOAL PINNED', w.nm + ' - shown on the main menu until you buy it', '#fbbf24'); });
QPOST.push((id, el) => {
  if (id !== 'scMenu' || !el) return; const w = SAVE.flags.wish; if (!w) return; const pl = SAVE.pl[0];
  if ((w.t === 'buy' && (pl.up[w.id] | 0) + 1 > +w.nm.split('LV')[1]) || (w.t === 'wpn' && pl.wown.indexOf(w.id) >= 0)) { delete SAVE.flags.wish; saveGame(); return; }
  const host = el.querySelector('.mm-card') || el.querySelector('.card'); if (!host || host.querySelector('#qWish')) return; const pc = Math.min(100, Math.round(SAVE.cores / w.pr * 100));
  host.insertAdjacentHTML('beforeend', '<div id="qWish" data-act="shop"><span>GOAL: ' + escH(w.nm) + '</span><i><b style="width:' + pc + '%"></b></i><span>' + (pc >= 100 ? 'READY!' : fmt(w.pr - SAVE.cores) + ' to go') + '</span></div>');
});
// ---------- 8: remember what to recommend from your last result ----------
const _resQ = UI.result.bind(UI);
UI.result = function (d) { try { const pl = SAVE.pl[0]; if (!d.win && d.death) SAVE.flags.qRec = pl.up.sh < pl.up.hp ? 'sh' : 'hp'; else if (d.win && d.time > 120) SAVE.flags.qRec = pl.up.rate < pl.up.dmg ? 'rate' : 'dmg'; } catch (e) { } return _resQ(d); };
// ---------- 11: swap guns right on the results screen ----------
QPOST.push((id, el) => {
  if (id !== 'scResult' || !el || el.querySelector('.q-guns')) return; const pl = SAVE.pl[0]; if (pl.wown.length < 2) return;
  const st = el.querySelector('.rs-act') || el.querySelector('.stack'); if (!st) return;
  st.insertAdjacentHTML('afterbegin', '<div class="q-guns q-bar"><span class="xs mut b" style="letter-spacing:.2em">GUN</span>' + pl.wown.map(w => '<button class="btn sm' + (w === pl.wpn ? ' on' : '') + '" data-act="wpn:' + w + '">' + escH(wName(pl, w)) + '</button>').join('') + '</div>');
});

// ---------- 16: Backspace goes back; 30: Esc on an expedition result goes to the map ----------
document.addEventListener('keydown', e => {
  const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
  if (e.code === 'Backspace' && G.scene !== 'play' && UI.top && UI.top !== 'scMenu') { e.preventDefault(); UI.escape ? UI.escape() : ACT.back(); }
  if (e.code === 'Escape' && UI.top === 'scResult' && UI.res && UI.res.mode === 'expedition' && G.scene !== 'play') { e.preventDefault(); e.stopPropagation(); ACT.tomap(); }
}, true);
// ---------- 17, 18: remember tabs, world and tier between visits ----------
(function () { try { const s = JSON.parse(localStorage.getItem('aetheria_ui') || '{}'); ['stab', 'shc', 'tier', 'cat', 'qwf'].forEach(k => { if (s[k] !== undefined) UI[k] = s[k]; }); if (s.w !== undefined && s.w < Math.max(1, SAVE.wu)) UI.w = s.w; } catch (e) { } })();
QPOST.push(() => { try { localStorage.setItem('aetheria_ui', JSON.stringify({ stab: UI.stab, shc: UI.shc, w: UI.w, tier: UI.tier, cat: UI.cat, qwf: UI.qwf })); } catch (e) { } });
// ---------- 19: CONTINUE on the main menu ----------
function qNext() { const w = Math.max(0, Math.min(SAVE.wu, WORLDS.length) - 1); let lv = firstOpen(w, 1); return { w, lv }; }
const _scMenuQ = SCR.scMenu;
SCR.scMenu = function () {
  const has = MAINNAV[0][0] === 'cont', fresh = SAVE.st.runs < 1;
  if (!fresh) { const n = qNext(), d = 'World ' + (n.w + 1) + ' - Sector ' + (n.lv + 1) + ': ' + WORLDS[n.w].nm; if (has) MAINNAV[0][2] = d; else MAINNAV.unshift(['cont', 'Continue', d]); } else if (has) MAINNAV.shift();
  return _scMenuQ.apply(this, arguments);
};
ACT.cont = () => { const n = qNext(); UI.w = n.w; UI.tier = 1; UI.sel = n.lv; UI.mode = 'expedition'; SFX.click(); startLevel(n.w, n.lv, 1); };
// ---------- 20: search box in Settings ----------
QPOST.push((id, el) => {
  if (id !== 'scSettings' || !el) return; const rail = el.querySelector('.st-rail') || el.querySelector('.card'), body = el.querySelector('.st-body');
  if (rail && !rail.querySelector('.q-search')) { rail.insertAdjacentHTML('beforeend', '<input class="q-search" id="qSetQ" placeholder="SEARCH SETTINGS" autocomplete="off" spellcheck="false" value="' + escH(UI.sq || '') + '">'); }
  if (UI.sq && body) qSettingsFilter(body);
});
function qSettingsFilter(body) { const q = (UI.sq || '').toLowerCase().trim(); if (!q) { UI.refresh(); return; } const rows = []; Object.keys(SETS).forEach(t => SETS[t].forEach(r => { if ((r[2] + ' ' + (r[3] || '') + ' ' + t).toLowerCase().indexOf(q) >= 0) rows.push(setRow(r)); })); body.innerHTML = '<p class="xs mut" style="margin:0 0 8px">' + rows.length + ' match' + (rows.length === 1 ? '' : 'es') + ' for "' + escH(UI.sq) + '"</p>' + rows.join(''); }
document.addEventListener('input', e => { if (e.target && e.target.id === 'qSetQ') { UI.sq = e.target.value; const b = document.querySelector('#scSettings .st-body'); if (b) qSettingsFilter(b); } }, true);
// ---------- 21: tooltips on icon-only buttons; 22: breadcrumb ----------
QPOST.push((id, el) => {
  if (!el) return; el.querySelectorAll('button[aria-label]:not([title])').forEach(b => b.title = b.getAttribute('aria-label'));
  const c = $('qCrumb'); if (!c) return; const nm = s => (s || '').replace(/^sc/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  c.innerHTML = G.scene === 'play' || !id || id === 'scMenu' ? '' : ['Menu'].concat(UI.hist.filter(h => h !== 'scMenu').slice(-3).map(nm)).join(' / ') + ' / <b>' + nm(id) + '</b>';
});
// ---------- 25: faster ship travel ----------
try { if (SETS.GRAPHICS && !SETS.GRAPHICS.some(r => r[0] === 'shipTravel')) SETS.GRAPHICS.push(['shipTravel', 'sel', 'Ship walk speed', 'How fast the camera moves between rooms', [[1, 'Normal'], [.55, 'Fast'], [.01, 'Instant']]]); if (SET.shipTravel === undefined) SET.shipTravel = 1; if (SETS.GAMEPLAY && !SETS.GAMEPLAY.some(r => r[0] === 'qConfirm')) SETS.GAMEPLAY.push(['qConfirm', 'tog', 'Confirm big purchases', 'Ask before spending over half your cores']); if (SET.qConfirm === undefined) SET.qConfirm = true; } catch (e) { }
// ---------- 28: main-menu hotkeys ----------
document.addEventListener('keydown', e => {
  if (UI.top !== 'scMenu' || G.scene === 'play' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  const map = { KeyP: 'play', KeyS: 'shop', KeyH: 'hangar', KeyC: 'cont', KeyG: 'galaxy', KeyL: 'locker' }, a = map[e.code];
  if (a && ACT[a] && !(a === 'cont' && MAINNAV[0][0] !== 'cont')) { e.preventDefault(); ACT[a]([]); }
});
QPOST.push((id, el) => { if (id !== 'scMenu' || !el || touchOn()) return; const k = el.querySelector('.mm-keys'); if (k && !k.querySelector('.q-hk')) k.insertAdjacentHTML('beforeend', '<span class="q-hk">' + (MAINNAV[0][0] === 'cont' ? 'C continue - ' : '') + 'P play - S shop - H hangar - Backspace back</span>'); });
// ---------- 29: double-click a sector to launch it ----------
document.addEventListener('dblclick', e => { const n = e.target.closest && e.target.closest('.node[data-act^="lvl:"]'); if (!n || n.classList.contains('lk')) return; const a = n.dataset.act.split(':').slice(1); ACT.lvl(a); if (UI.sel === +a[0]) ACT.start(); }, true);
