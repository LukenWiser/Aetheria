// ================= V68: QoL batch 3 - cards, results & progress =================
(function () { const st = document.createElement('style'); st.textContent = `
.pc.q-fav{box-shadow:0 0 0 2px #fbbf24,0 0 24px rgba(251,191,36,.45)!important}.pc .q-fv{position:absolute;right:8px;top:6px;color:#fbbf24;font-size:14px}
.q-build{max-width:600px;width:100%;margin:10px auto 0;font:700 10px/1.6 var(--mono);color:#94a3b8;letter-spacing:.06em;text-align:center}.q-build b{color:#e2e8f0}
.q-auto{height:3px;max-width:600px;width:100%;margin:6px auto 0;background:rgba(255,255,255,.1)}.q-auto b{display:block;height:100%;background:var(--acc);transition:width 1s linear}
.setrow.q-best b::after{content:" NEW BEST";font:900 8px var(--mono);letter-spacing:.16em;color:#04101f;background:#34d399;padding:1px 5px;margin-left:6px;vertical-align:middle}
.q-graph{margin-top:12px}.q-graph svg{width:100%;height:46px;display:block;background:rgba(4,10,22,.6);border:1px solid rgba(56,189,248,.18)}
.q-graph .xs{letter-spacing:.2em;color:#94a3b8;margin-bottom:4px}
.q-xp{margin-top:10px;font:700 10px var(--mono);letter-spacing:.14em;color:#c4b5fd}.q-xp i{display:block;height:4px;margin-top:4px;background:rgba(255,255,255,.1)}.q-xp i b{display:block;height:100%;background:linear-gradient(90deg,#8b5cf6,#e879f9)}
.q-ach{margin-top:8px;font:700 10px var(--mono);color:#fde68a;letter-spacing:.06em}.q-ach i{display:block;height:3px;margin:3px 0 6px;background:rgba(255,255,255,.1)}.q-ach i b{display:block;height:100%;background:#fbbf24}
.q-sess,.q-close{margin-top:8px;font:700 10px/1.6 var(--mono);color:#94a3b8;letter-spacing:.08em}.q-sess b,.q-close b{color:#e2e8f0}
.q-cal{display:flex;gap:4px;margin:8px 0}.q-cal i{flex:1;height:26px;display:grid;place-items:center;font:800 9px var(--mono);font-style:normal;background:rgba(255,255,255,.06);color:#64748b}.q-cal i.ok{background:rgba(52,211,153,.25);color:#a7f3d0}.q-cal i.td{outline:1px solid var(--acc);color:#fff}
`; document.head.appendChild(st); })();

// ---------- 62, 63, 65, 66: card picks ----------
SAVE.flags.favC = SAVE.flags.favC || {};
try { if (SETS.GAMEPLAY && !SETS.GAMEPLAY.some(r => r[0] === 'cardAuto')) SETS.GAMEPLAY.push(['cardAuto', 'tog', 'Auto-pick cards after 10 s', 'Picks a favourite (or the first card) if you wait'], ['autoClaim', 'tog', 'Auto-claim mission rewards', 'Collect finished missions automatically']); } catch (e) { }
let qCardT = 0;
QPOST.push((id, el) => {
  clearTimeout(qCardT); if (id !== 'scCards' || !el || !G.pick) return; const K = G.pick, p = G.players[K.who]; if (!p) return;
  el.querySelectorAll('.pc[data-act^="card:"]').forEach(c => { const cid = K.opts[+c.dataset.act.split(':')[1]]; if (SAVE.flags.favC[cid]) { c.classList.add('q-fav'); if (!c.querySelector('.q-fv')) c.insertAdjacentHTML('beforeend', '<span class="q-fv" title="Favourite">★</span>'); } c.title = 'Right-click to favourite'; });
  const host = el.querySelector('.cpick'); if (!host || host.querySelector('.q-build')) return;
  const have = Object.keys(p.cards || {}).filter(k => p.cards[k]); host.insertAdjacentHTML('beforeend', '<div class="q-build">YOUR BUILD: ' + (have.length ? have.map(k => '<b>' + escH(CARDS[k].nm) + (p.cards[k] > 1 ? ' x' + p.cards[k] : '') + '</b>').join(' - ') : 'nothing yet') + '</div>');
  if (SET.cardAuto) { host.insertAdjacentHTML('beforeend', '<div class="q-auto"><b style="width:100%"></b></div>'); requestAnimationFrame(() => { const b = host.querySelector('.q-auto b'); if (b) { b.style.transition = 'width 10s linear'; b.style.width = '0%'; } }); qCardT = setTimeout(() => { if (UI.top !== 'scCards' || !G.pick) return; let i = G.pick.opts.findIndex(c => SAVE.flags.favC[c]); if (i < 0) i = 0; pickCard(i); }, 10000); }
});
document.addEventListener('contextmenu', e => { const c = e.target.closest && e.target.closest('.pc[data-act^="card:"]'); if (!c || !G.pick) return; e.preventDefault(); const id = G.pick.opts[+c.dataset.act.split(':')[1]]; if (SAVE.flags.favC[id]) delete SAVE.flags.favC[id]; else SAVE.flags.favC[id] = 1; saveGame(); UI.refresh(); }, true);

// ---------- 68: hull over time; 67/69/73: bests, cores per minute ----------
const _beginQ4 = beginRun; beginRun = function () { const r = _beginQ4.apply(this, arguments); try { if (G.run) { G.run.hpLog = []; G.run.hitT = []; } } catch (e) { } return r; };
setInterval(() => { const R = G.run; if (!R || G.scene !== 'play' || G.paused || !R.hpLog) return; const p = G.players[0]; if (!p) return; if (R.hpLog.length < 600) R.hpLog.push(Math.max(0, (p.hp + p.sh) / (p.mhp + p.msh))); }, 1000);
const _hurtQ4 = hurt; hurt = function (p) { const r = _hurtQ4.apply(this, arguments); try { if (r && G.run && G.run.hpLog && p.id === 0) G.run.hitT.push(G.run.hpLog.length); } catch (e) { } return r; };
const _resQ4 = UI.result.bind(UI);
UI.result = function (d) {
  try {
    const R = G.run; d.hpLog = R && R.hpLog ? R.hpLog.slice() : null; d.hitT = R && R.hitT ? R.hitT.slice() : null;
    if (R && R.mode === 'expedition' && d.win) { const k = R.w + ':' + R.lv + ':' + R.tier, B = (SAVE.flags.sb || (SAVE.flags.sb = {})), o = B[k] || {}; d.prevBest = Object.assign({}, o); d.newBest = {}; if (d.score > (o.score | 0)) { o.score = d.score; d.newBest.score = 1; } if (!o.time || d.time < o.time) { if (o.time) d.newBest.time = 1; o.time = d.time; } if (d.kills > (o.kills | 0)) { if (o.kills) d.newBest.kills = 1; o.kills = d.kills; } if (!d.prevBest.score) d.newBest = { first: 1 }; B[k] = o; }
    QS.cores += (d.cores | 0) + (d.bonus | 0); QS.runs++; if (d.win) QS.wins++;
    if (SET.autoClaim) { const M = missions(); M.d.forEach((m, i) => { if (m.done && !m.got) claimMission(i); }); if (M.w.done && !M.w.got) claimMission('w'); }
  } catch (e) { console.warn(e); }
  return _resQ4(d);
};
const QS = { t0: Date.now(), cores: 0, runs: 0, wins: 0 };
QPOST.push((id, el) => {
  if (id !== 'scResult' || !el || el.querySelector('.q-xp')) return; const d = UI.res; if (!d) return;
  el.querySelectorAll('.setrow').forEach(row => { const lab = (row.querySelector('span') || {}).textContent || ''; const nb = d.newBest || {}; if ((lab === 'SCORE' && nb.score) || (lab === 'TIME' && nb.time) || (lab === 'KILLS' && nb.kills)) row.classList.add('q-best'); });
  const rowsBox = el.querySelector('.setrow') && el.querySelector('.setrow').parentElement;
  if (rowsBox && d.time > 5) { const cpm = Math.round(((d.cores | 0) + (d.bonus | 0)) / (d.time / 60)); rowsBox.insertAdjacentHTML('beforeend', '<div class="setrow"><span class="mut">CORES PER MINUTE</span><b>' + fmt(cpm) + '</b></div>' + (d.prevBest && d.prevBest.score ? '<div class="setrow"><span class="mut">YOUR BEST HERE</span><b>' + fmt(d.prevBest.score) + ' pts - ' + d.prevBest.time + 's</b></div>' : '')); }
  const hero = el.querySelector('.rs-hero') || el.querySelector('.tc') || el.querySelector('.card'); if (!hero) return;
  if (d.hpLog && d.hpLog.length > 2) { const L = d.hpLog, n = L.length, pts = L.map((v, i) => (i / (n - 1) * 300).toFixed(1) + ',' + (44 - v * 40).toFixed(1)).join(' '), hits = (d.hitT || []).map(i => '<line x1="' + (Math.min(i, n - 1) / (n - 1) * 300).toFixed(1) + '" x2="' + (Math.min(i, n - 1) / (n - 1) * 300).toFixed(1) + '" y1="2" y2="44" stroke="rgba(244,63,94,.55)" stroke-width="1"/>').join('');
    hero.insertAdjacentHTML('beforeend', '<div class="q-graph"><div class="xs">HULL + SHIELD OVER THE RUN - RED LINES ARE HITS</div><svg viewBox="0 0 300 46" preserveAspectRatio="none">' + hits + '<polyline points="' + pts + '" fill="none" stroke="#34d399" stroke-width="2" vector-effect="non-scaling-stroke"/></svg></div>'); }
  const X = PS().xp, need = xpNeed(X.lv); hero.insertAdjacentHTML('beforeend', '<div class="q-xp">PILOT LV ' + X.lv + ' ' + rankName(X.lv).toUpperCase() + ' - ' + fmt(X.xp) + ' / ' + fmt(need) + ' XP<i><b style="width:' + Math.round(X.xp / need * 100) + '%"></b></i></div>');
  const close = qCloseAch(2); if (close.length) hero.insertAdjacentHTML('beforeend', close.map(a => '<div class="q-ach">ALMOST: ' + escH(a.nm) + ' - ' + a.c + ' / ' + a.max + '<i><b style="width:' + Math.round(a.c / a.max * 100) + '%"></b></i></div>').join(''));
  const st = el.querySelector('.rs-act') || el.querySelector('.stack'); if (st && !st.querySelector('[data-act="qshare"]')) st.insertAdjacentHTML('beforeend', '<button class="btn sm" data-act="qshare">Save result image</button>');
});
function qCloseAch(n) { try { return ACH.filter(a => !SAVE.ach[a.id] && !a.sec).map(a => { const c = Math.min(a.cur(), a.max); return { nm: a.nm, c, max: a.max, f: c / a.max }; }).filter(a => a.f >= .5 && a.f < 1).sort((a, b) => b.f - a.f).slice(0, n); } catch (e) { return []; } }
// ---------- 70: save / share a result image ----------
ACT.qshare = function () {
  const d = UI.res; if (!d) return; const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 1200, 630); gr.addColorStop(0, '#071226'); gr.addColorStop(1, '#0b1f3d'); g.fillStyle = gr; g.fillRect(0, 0, 1200, 630);
  g.strokeStyle = 'rgba(34,211,238,.6)'; g.lineWidth = 3; g.strokeRect(24, 24, 1152, 582);
  g.fillStyle = '#22d3ee'; g.font = '800 26px monospace'; g.fillText('AETHERIA: QUANTUM STRIKE', 70, 100);
  g.fillStyle = d.win ? '#34d399' : '#fb7185'; g.font = '900 78px sans-serif'; g.fillText(d.win ? 'SECTOR CLEARED' : 'SHIP DESTROYED', 70, 200);
  const W = WORLDS[d.w || 0]; g.fillStyle = '#cbd5e1'; g.font = '700 28px monospace'; g.fillText((W ? W.nm : '') + (d.mode === 'expedition' ? ' - SECTOR ' + ((d.lv | 0) + 1) : ' - ' + String(d.mode).toUpperCase()), 70, 250);
  const rows = [['SCORE', fmt(d.score)], ['RANK', d.rank || '-'], ['KILLS', d.kills], ['TIME', d.time + 's'], ['BEST CHAIN', d.maxCombo]]; rows.forEach((r, i) => { g.fillStyle = '#94a3b8'; g.font = '700 24px monospace'; g.fillText(r[0], 70 + (i % 3) * 360, 340 + Math.floor(i / 3) * 110); g.fillStyle = '#fff'; g.font = '900 52px monospace'; g.fillText(String(r[1]), 70 + (i % 3) * 360, 395 + Math.floor(i / 3) * 110); });
  if (d.stars) { g.fillStyle = '#fbbf24'; g.font = '60px sans-serif'; g.fillText('★'.repeat(d.stars) + '☆'.repeat(3 - d.stars), 800, 200); }
  g.fillStyle = '#64748b'; g.font = '700 20px monospace'; g.fillText('Driftwire Games - lukenwiser.github.io', 70, 580);
  c.toBlob(b => { if (!b) return; const f = new File([b], 'aetheria-result.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: 'Aetheria result' }).catch(() => { }); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'aetheria-result.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('IMAGE SAVED', 'aetheria-result.png', '#22d3ee'); }, 'image/png');
};
// ---------- 72, 79: session summary + close-to-unlocking on the main menu ----------
QPOST.push((id, el) => {
  if (id !== 'scMenu' || !el) return; const host = el.querySelector('.mm-card') || el.querySelector('.card'); if (!host || host.querySelector('.q-close')) return;
  const m = Math.round((Date.now() - QS.t0) / 60000); if (QS.runs) host.insertAdjacentHTML('beforeend', '<div class="q-sess">THIS SESSION: <b>' + QS.runs + '</b> runs - <b>' + QS.wins + '</b> wins - <b>+' + fmt(QS.cores) + '</b> cores - ' + m + ' min</div>');
  const a = qCloseAch(1)[0], nu = typeof nextUpgrade === 'function' ? nextUpgrade() : null, wb = SAVE.wu <= WORLDS.length - 1 ? BOSSES[SAVE.wu - 1] : null;
  host.insertAdjacentHTML('beforeend', '<div class="q-close">' + (wb ? 'NEXT WORLD: beat <b>' + escH(wb.nm) + '</b><br>' : '') + (nu ? 'NEXT UPGRADE: <b>' + escH(UPG[nu.k].nm) + '</b> ' + (SAVE.cores >= nu.pr ? '- ready!' : fmt(nu.pr - SAVE.cores) + ' cores to go') + '<br>' : '') + (a ? 'ALMOST: <b>' + escH(a.nm) + '</b> ' + a.c + '/' + a.max : '') + '</div>');
});
// ---------- 75: mission progress popups mid-run; 76: claim all ----------
(function () { let seen = null; setInterval(() => { try { if (G.scene !== 'play' || !G.run) { seen = null; return; } const M = missions(), all = M.d.concat([M.w]), k = all.map(m => m.done ? 1 : 0).join(''); if (seen !== null && k !== seen) all.forEach((m, i) => { if (m.done && seen[i] === '0') toast('MISSION COMPLETE', (m.nm || 'Mission') + ' - claim it after the run', '#4ade80'); }); seen = k; } catch (e) { } }, 1500); })();
QPOST.push((id, el) => { if (id !== 'scMissions' || !el || el.querySelector('[data-act="qclaimall"]')) return; const n = msnReady(); if (n < 2) return; const h = el.querySelector('h2') || el.querySelector('.card'); if (h) h.insertAdjacentHTML('afterend', '<button class="btn sm gold" data-act="qclaimall" style="margin:6px 0">CLAIM ALL (' + n + ')</button>'); });
ACT.qclaimall = () => { const M = missions(); M.d.forEach((m, i) => { if (m.done && !m.got) claimMission(i); }); if (M.w.done && !M.w.got) claimMission('w'); UI.refresh(); };
// ---------- 78: 7-day daily challenge calendar ----------
QPOST.push((id, el) => {
  if (id !== 'scDaily' || !el || el.querySelector('.q-cal')) return; const D = SAVE.dl || {}, done = D.done || {}, now = new Date();
  const days = []; for (let i = 6; i >= 0; i--) { const t = new Date(now); t.setDate(now.getDate() - i); const k = t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate(); const k2 = typeof dayKey === 'function' && i === 0 ? dayKey() : null; const ok = done[k] || (k2 && done[k2]); days.push('<i class="' + (ok ? 'ok' : '') + (i === 0 ? ' td' : '') + '">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'][t.getDay()] + '</i>'); }
  const h = el.querySelector('h2') || el.querySelector('.card'); if (h) h.insertAdjacentHTML('afterend', '<div class="xs mut" style="letter-spacing:.2em;margin-top:6px">LAST 7 DAYS</div><div class="q-cal">' + days.join('') + '</div>');
});
