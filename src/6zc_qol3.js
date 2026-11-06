// ================= V68: QoL batch 2 - sector map & in-run =================
(function () {
  const st = document.createElement('style'); st.textContent = `
.q-mapbar{position:absolute;right:10px;top:10px;z-index:5;display:flex;gap:6px}
.wm-map{position:relative}
.q-mini{position:absolute;right:10px;bottom:10px;z-index:5;width:150px;height:56px;background:rgba(4,10,22,.85);border:1px solid var(--line);cursor:pointer}
.q-mini i{position:absolute;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:#475569}.q-mini i.dn{background:#34d399}.q-mini i.av{background:#fbbf24}.q-mini i.bs{background:#f43f5e;width:6px;height:6px;margin:-3px 0 0 -3px}
.q-mini b{position:absolute;top:0;bottom:0;border:1px solid #fff;background:rgba(255,255,255,.08)}
.node .q-st{position:absolute;left:50%;top:100%;transform:translateX(-50%);font-size:9px;letter-spacing:-1px;color:#fbbf24;white-space:nowrap;pointer-events:none;text-shadow:0 1px 0 #000}
.node .q-st s{text-decoration:none;color:#475569}
.node .q-bl{position:absolute;left:50%;bottom:100%;transform:translateX(-50%);font:900 8px var(--mono);letter-spacing:.14em;color:#fda4af;white-space:nowrap;pointer-events:none;margin-bottom:3px}
.node.q-recent{box-shadow:0 0 0 3px rgba(255,255,255,.65),0 0 18px rgba(255,255,255,.4)!important}
.wm-map.q-only .node.q-full{opacity:.25}
#hud.on~#qCrumb{display:none}
#qTip{position:fixed;z-index:40;pointer-events:none;display:none;padding:8px 10px;max-width:240px;background:rgba(4,10,22,.95);border:1px solid var(--line2);font:700 10px/1.5 var(--mono);color:#cbd5e1;letter-spacing:.04em}
#qTip b{color:#fff;display:block;font-size:11px;letter-spacing:.08em}
.q-pst{margin-top:10px;padding:10px 12px;border-left:3px solid var(--acc);background:rgba(8,20,40,.7);font:700 11px/1.6 var(--mono);color:#cbd5e1}
.q-pst .xs{letter-spacing:.2em;color:var(--acc)}
`; document.head.appendChild(st);
  document.body.insertAdjacentHTML('beforeend', '<div id="qTip"></div>');
})();
// ---------- 31-40: sector map ----------
UI.mapZ = UI.mapZ || 1; UI.mapPos = UI.mapPos || {};
QPOST.push((id, el) => {
  if (id !== 'scMap' || !el) return; const m = el.querySelector('#mapScroll'), inn = m && m.querySelector('.wm-in'); if (!m || !inn) return;
  inn.style.zoom = UI.mapZ; const w = UI.w, tier = UI.tier || 1, arr = prog(w).done[tier - 1] || [], rec = SAVE.flags.lastLv;
  if (UI.qOnly) m.classList.add('q-only');
  inn.querySelectorAll('.node[data-act^="lvl:"]').forEach(n => {
    const i = +n.dataset.act.split(':')[1], s = arr[i] | 0;
    if (s && !n.querySelector('.q-st')) n.insertAdjacentHTML('beforeend', '<span class="q-st">' + '★'.repeat(s) + '<s>' + '★'.repeat(3 - s) + '</s></span>');
    if (s >= 3) n.classList.add('q-full');
    if (n.classList.contains('bs') && !n.querySelector('.q-bl')) n.insertAdjacentHTML('beforeend', '<span class="q-bl">' + escH(BOSSES[w].nm.toUpperCase()) + '</span>');
    if (rec && rec.w === w && rec.i === i && rec.tier === tier) n.classList.add('q-recent');
  });
  const par = m.parentElement; if (getComputedStyle(par).position === 'static') par.style.position = 'relative';
  if (!par.querySelector('.q-mapbar')) m.insertAdjacentHTML('afterend', '<div class="q-mapbar"><button class="btn sm" data-act="qmz:-1" title="Zoom out">-</button><button class="btn sm" data-act="qmz:1" title="Zoom in">+</button><button class="btn sm gold" data-act="qmnext" title="Jump to your next sector">NEXT</button><button class="btn sm' + (UI.qOnly ? ' on' : '') + '" data-act="qmonly" title="Fade sectors that already have 3 stars">UNFINISHED</button></div>');
  qMini(m, inn); const place = () => { const bar = par.querySelector('.q-mapbar'), mm = par.querySelector('.q-mini'); if (bar) { bar.style.top = (m.offsetTop + 10) + 'px'; bar.style.left = 'auto'; bar.style.right = (par.clientWidth - m.offsetLeft - m.offsetWidth + 10) + 'px'; } if (mm) { mm.style.top = (m.offsetTop + m.offsetHeight - 66) + 'px'; mm.style.bottom = 'auto'; mm.style.right = (par.clientWidth - m.offsetLeft - m.offsetWidth + 10) + 'px'; } }; place(); requestAnimationFrame(place);
  const pos = UI.mapPos[w + ':' + tier]; if (pos !== undefined && !m._qr) { m._qr = 1; requestAnimationFrame(() => { m.scrollLeft = pos[0]; m.scrollTop = pos[1]; }); }
  if (!m._qs) { m._qs = 1; m.addEventListener('scroll', () => { UI.mapPos[UI.w + ':' + (UI.tier || 1)] = [m.scrollLeft, m.scrollTop]; UI._keepScroll = m.scrollLeft; qMiniView(m); }, { passive: true }); }
});
function qMini(m, inn) {
  let mm = m.parentElement.querySelector('.q-mini'); const W = inn.offsetWidth || 1, H = inn.offsetHeight || 1;
  if (!mm) { mm = document.createElement('div'); mm.className = 'q-mini'; mm.title = 'Click to jump'; m.after(mm); mm.addEventListener('click', e => { const r = mm.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height; m.scrollLeft = fx * m.scrollWidth - m.clientWidth / 2; m.scrollTop = fy * m.scrollHeight - m.clientHeight / 2; }); }
  mm.innerHTML = [...inn.querySelectorAll('.node')].map(n => '<i class="' + (n.classList.contains('bs') ? 'bs' : n.classList.contains('dn') ? 'dn' : n.classList.contains('av') ? 'av' : '') + '" style="left:' + (n.offsetLeft / W * 100) + '%;top:' + (n.offsetTop / H * 100) + '%"></i>').join('') + '<b></b>';
  qMiniView(m);
}
function qMiniView(m) { const mm = m.parentElement && m.parentElement.querySelector('.q-mini b'); if (!mm || !m.scrollWidth) return; mm.style.left = (m.scrollLeft / m.scrollWidth * 100) + '%'; mm.style.width = (m.clientWidth / m.scrollWidth * 100) + '%'; }
Object.assign(ACT, {
  qmz(a) { UI.mapZ = clamp(+(UI.mapZ + a[0] * .2).toFixed(2), .5, 1.6); UI.refresh(); },
  qmnext() { const m = $('mapScroll'); if (!m) return; const n = m.querySelector('.node.av:not(.dn)') || m.querySelector('.node.sel'); if (!n) return; const r = n.getBoundingClientRect(), mr = m.getBoundingClientRect(); m.scrollBy({ left: r.left - mr.left - mr.width / 2, top: r.top - mr.top - mr.height / 2, behavior: 'smooth' }); },
  qmonly() { UI.qOnly = !UI.qOnly; UI.refresh(); }
});
document.addEventListener('wheel', e => { const m = e.target.closest && e.target.closest('#mapScroll'); if (!m || !e.ctrlKey) return; e.preventDefault(); ACT.qmz([e.deltaY < 0 ? 1 : -1]); }, { passive: false, capture: true });
// hover preview
document.addEventListener('pointerover', e => {
  const tip = $('qTip'), n = e.target.closest && e.target.closest('.node[data-act^="lvl:"]'); if (!n || e.pointerType === 'touch') { tip.style.display = 'none'; return; }
  try { const i = +n.dataset.act.split(':')[1], w = UI.w, tier = UI.tier || 1, sp = levelSpec(w, i, tier), s = (prog(w).done[tier - 1] || [])[i] | 0, rk = (prog(w).rk || {})[(tier - 1) + ':' + i];
    tip.innerHTML = '<b>' + escH(sp.name) + '</b>' + (sp.type === 'B' ? 'Boss: ' + escH(BOSSES[w].nm) : sp.waves + ' waves') + '<br>Stars: ' + (s ? '★'.repeat(s) + '☆'.repeat(3 - s) : 'not cleared') + (rk ? ' - best rank ' + rk : '') + (n.classList.contains('lk') ? '<br><span style="color:#fca5a5">Locked - clear a connected sector first</span>' : '<br><span style="color:#7dd3fc">Double-click to launch</span>');
    const r = n.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - 250, r.right + 8) + 'px'; tip.style.top = Math.max(8, r.top - 6) + 'px'; tip.style.display = 'block'; } catch (er) { tip.style.display = 'none'; }
}, true);
document.addEventListener('pointerout', e => { if (e.target.closest && e.target.closest('.node')) $('qTip').style.display = 'none'; }, true);
const _shTip = UI.show.bind(UI); UI.show = function () { const t = $('qTip'); if (t) t.style.display = 'none'; return _shTip.apply(this, arguments); };
// remember the last sector you played
const _beginQ3 = beginRun; beginRun = function (o) { if (o && o.mode === 'expedition') { SAVE.flags.lastLv = { w: o.w | 0, i: o.lv | 0, tier: o.tier || 1 }; } return _beginQ3.apply(this, arguments); };

function qtext(x, y, t, c) { const d = SET.dmgnum; SET.dmgnum = true; try { ftext(x, y, t, c, 12); } finally { SET.dmgnum = d; } }
// ---------- 41: restart from pause; 59/60: run stats and your cards in the pause menu ----------
QPOST.push((id, el) => {
  if (id !== 'scPause' || !el || !G.run || el.querySelector('.q-pst')) return; const R = G.run, p = G.players[0];
  const cards = p && p.cards ? Object.keys(p.cards).map(c => (CARDS[c] ? CARDS[c].nm : c) + (p.cards[c] > 1 ? ' x' + p.cards[c] : '')) : [];
  const host = el.querySelector('aside') || el.querySelector('.card') || el; const can = R.mode !== 'tutorial' && !G.net && G.last;
  host.insertAdjacentHTML('beforeend', '<div class="q-pst"><div class="xs">THIS RUN</div>Kills ' + R.kills + ' - Cores +' + fmt(R.cores | 0) + ' - ' + Math.floor((R.time | 0) / 60) + ':' + String((R.time | 0) % 60).padStart(2, '0') + ' - Best chain ' + (R.maxCombo | 0) + '<div class="xs" style="margin-top:6px">CARDS</div>' + (cards.length ? escH(cards.join(', ')) : 'None yet') + '</div>' + (can ? '<button class="btn sm warn" data-act="qrestart" style="margin-top:8px">Restart sector</button>' : ''));
});
ACT.qrestart = function () { const b = document.querySelector('[data-act="qrestart"]'); if (b && !b._arm) { b._arm = 1; b.textContent = 'Tap again to restart'; setTimeout(() => { if (b.isConnected) { b._arm = 0; b.textContent = 'Restart sector'; } }, 3000); return; } UI.hideAll(); G.paused = false; beginRun(G.last); };
// ---------- 42: pause when a controller disconnects ----------
window.addEventListener('gamepaddisconnected', () => { if (G.scene === 'play' && G.run && !G.paused) { togglePause(); alertMsg('CONTROLLER DISCONNECTED - PAUSED'); } });
// ---------- 48: damage numbers on bosses only ----------
try { if (SETS.GAMEPLAY && !SETS.GAMEPLAY.some(r => r[0] === 'dmgBoss')) SETS.GAMEPLAY.push(['dmgBoss', 'tog', 'Damage numbers on bosses only', 'Keeps the screen clean in normal waves']); } catch (e) { }
const _hurtEnQ = hurtEnemy; hurtEnemy = function (e) { if (SET.dmgBoss && !e.boss && SET.dmgnum) { SET.dmgnum = false; try { return _hurtEnQ.apply(this, arguments); } finally { SET.dmgnum = true; } } return _hurtEnQ.apply(this, arguments); };
// ---------- 50: mouse wheel switches guns ----------
let qWh = 0; document.addEventListener('wheel', e => { if (G.scene !== 'play' || !G.run || G.paused || SET.wheelGun === false) return; const now = performance.now(); if (now - qWh < 180) return; qWh = now; const p = G.players[0]; if (p && p.alive) cycleWeapon(p, e.deltaY > 0 ? 1 : -1); }, { passive: true });
// ---------- 52, 53: ability and super ready cues; 44: magnet range flash ----------
// ---------- 45, 46, 47, 49: edge arrows, enemies left, last-enemy marker ----------
(function () {
  const prev = {};
  const _r = render;
  render = function () {
    const r = _r.apply(this, arguments);
    try {
      if (G.scene !== 'play' || !G.run) return r; const R = G.run, g = fx, t = G.t;
      for (const p of G.players) { const k = p.id, ab = p.abCd <= 0, su = (p.sup || 0) >= 100; const pv = prev[k] || (prev[k] = { ab, su }); if (p.alive && ab && !pv.ab) { tone(1200, 1800, .12, .05, 'triangle'); qtext(p.x, p.y - 40, 'ABILITY READY', '#fde047'); } if (p.alive && su && !pv.su) { [660, 880, 1320].forEach((f, i) => tone(f, f, .2, .05, 'sine', null, i * .06)); if (typeof DNG !== 'undefined' && SET.flash !== false) { DNG.hitA = .45; DNG.hitC = '232,121,249'; } qtext(p.x, p.y - 52, 'SUPER READY', '#e879f9'); } pv.ab = ab; pv.su = su; }
      g.save(); g.globalCompositeOperation = 'source-over';
      // arrows for enemies just off the right / top / bottom edges
      for (const e of G.ent.en) { if (e.dead || e.hide) continue; const off = e.x > V.W + 4 || e.y < -4 || e.y > V.H + 4; if (!off || e.x > V.W + 420) continue; const x = clamp(e.x, 18, V.W - 18), y = clamp(e.y, 18, V.H - 18), a = Math.atan2(e.y - y, e.x - x) || 0; g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha = .55 + .35 * Math.sin(t * .2); g.fillStyle = e.boss ? '#f43f5e' : e.d.elite ? '#fbbf24' : '#fb7185'; g.beginPath(); g.moveTo(10, 0); g.lineTo(-6, -7); g.lineTo(-3, 0); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore(); }
      // repair / shield pickups drifting off the left edge
      for (const k of G.ent.pk) { if ((k.k === 'hp' || k.k === 'sh') && k.x < 60) { g.globalAlpha = .6 + .4 * Math.sin(t * .3); g.fillStyle = k.k === 'hp' ? '#4ade80' : '#38bdf8'; g.font = '900 12px ui-monospace,monospace'; g.textAlign = 'left'; g.fillText('< ' + (k.k === 'hp' ? 'REPAIR' : 'SHIELD'), 6, clamp(k.y, 16, V.H - 8)); } }
      // last enemy of a wave
      if (R.stage === 'wave' && (!R.q || !R.q.length)) { const al = G.ent.en.filter(e => !e.dead && !e.minion); if (al.length === 1 && al[0].x < V.W) { const e = al[0], s = e.w * .7 + 6 + Math.sin(t * .2) * 4; g.globalAlpha = .9; g.strokeStyle = '#fde047'; g.lineWidth = 2; g.beginPath(); g.arc(e.x, e.y, s, 0, TAU); g.stroke(); g.font = '900 10px ui-monospace,monospace'; g.fillStyle = '#fde047'; g.textAlign = 'center'; g.fillText('LAST ONE', e.x, e.y - s - 6); } }
      // magnet range shown for the first 2 seconds of a run
      if (R.time < 2 && !R._mg) { for (const p of G.players) { if (!p.alive || !p.st) continue; g.globalAlpha = .35 * (1 - R.time / 2); g.strokeStyle = '#fbbf24'; g.setLineDash([6, 6]); g.lineWidth = 1.5; g.beginPath(); g.arc(p.x, p.y, 120 * p.st.mag, 0, TAU); g.stroke(); g.setLineDash([]); } }
      g.restore();
    } catch (er) { }
    return r;
  };
})();
// enemies left + gun ammo cost in the HUD
const _hudTickQ = hudTick;
hudTick = function () {
  const r = _hudTickQ.apply(this, arguments);
  try {
    const R = G.run; if (!R) return r; const pe = $('hpips');
    if (pe && R.stage === 'wave') { const n = G.ent.en.filter(e => !e.dead && !e.minion).length + (R.q ? R.q.length : 0), k = 'L' + n; if (pe._ql !== k) { pe._ql = k; let s = pe.parentElement.querySelector('.q-left'); if (!s) { s = document.createElement('span'); s.className = 'q-left'; s.style.cssText = 'font:800 9px var(--mono);letter-spacing:.16em;color:#94a3b8;margin-left:8px'; pe.parentElement.appendChild(s); } s.textContent = n + ' ENEMIES LEFT'; } }
    else if (pe) { const s = pe.parentElement.querySelector('.q-left'); if (s && s.textContent) { s.textContent = ''; pe._ql = ''; } }
    for (const p of G.players) { const h = $('hw' + p.id); if (!h || !p.alive) continue; const W = WPN[p.wpn], c = (W.am * (1 - .03 * wlvOf(p.pl, p.wpn))).toFixed(1).replace('.0', ''), k = p.wpn + c; let q = h.querySelector('.qa'); if (!q) { h.insertAdjacentHTML('beforeend', '<i class="qa" style="color:#5eead4;margin-left:6px"></i>'); q = h.querySelector('.qa'); } if (q.textContent !== c + '/SHOT') q.textContent = c + '/SHOT'; }
  } catch (e) { }
  return r;
};
