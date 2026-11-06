// ================= V66: quality of life =================
// ---- MAX: buy as many levels of an upgrade as you can afford (also Shift+click on a price) ----
function buyMax(pl, k) {
  const U = UPG[k]; let n = 0, spent = 0;
  while (pl.up[k] < U.max) { const pr = upPrice(k, pl.up[k]); if (SAVE.cores < pr) break; SAVE.cores -= pr; spent += pr; pl.up[k]++; n++; }
  if (!n) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; }
  SFX.buy(); saveGame(); toast(U.nm.toUpperCase() + ' +' + n, 'Now level ' + pl.up[k] + '/' + U.max + ' for ' + fmt(spent) + ' cores', '#fbbf24'); UI.refresh();
}
Object.assign(ACT, { buymax(a) { buyMax(SAVE.pl[UI.pi | 0], a[0]); } });
document.addEventListener('click', e => { if (!e.shiftKey) return; const b = e.target.closest && e.target.closest('[data-act^="buy:"]'); if (!b) return; e.preventDefault(); e.stopPropagation(); buyMax(SAVE.pl[UI.pi | 0], b.dataset.act.split(':')[1]); }, true);
(function () { const st = document.createElement('style'); st.textContent = '.sh-row .sh-max{margin-left:6px;padding:9px 10px;font-size:10px}.wm-map{cursor:grab;touch-action:none}.wm-map.drag{cursor:grabbing}.wm-map.drag *{pointer-events:none}'; document.head.appendChild(st); })();

// ---- keep every scroll position when a screen refreshes (not just the outer panel) ----
function qolScrollKey(el, root) { const path = []; let n = el; while (n && n !== root) { const p = n.parentElement; path.push((n.id ? '#' + n.id : n.tagName + '.' + (n.className || '').toString().split(' ')[0]) + ':' + (p ? Array.prototype.indexOf.call(p.children, n) : 0)); n = p; } return path.join('<'); }
const _refQ = UI.refresh.bind(UI);
UI.refresh = function () {
  const root = this.top && document.getElementById(this.top), saved = [];
  if (root) root.querySelectorAll('*').forEach(el => { if (el.scrollTop > 0 || el.scrollLeft > 0) saved.push([qolScrollKey(el, root), el.scrollTop, el.scrollLeft]); });
  const r = _refQ.apply(this, arguments);
  if (root && saved.length) { const map = new Map(saved.map(s => [s[0], s])); const apply = () => root.querySelectorAll('*').forEach(el => { if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) return; const s = map.get(qolScrollKey(el, root)); if (s) { el.scrollTop = s[1]; el.scrollLeft = s[2]; } }); apply(); requestAnimationFrame(apply); }
  return r;
};

// ---- sector map: click-and-drag (or finger-drag) to pan; a drag never counts as a click ----
(function () {
  let st = null, moved = false;
  document.addEventListener('pointerdown', e => {
    const m = e.target.closest && e.target.closest('#mapScroll'); if (!m || e.button > 0) return;
    st = { m, x: e.clientX, y: e.clientY, sl: m.scrollLeft, stp: m.scrollTop, id: e.pointerId }; moved = false;
  }, true);
  document.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id) return; const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!moved && Math.hypot(dx, dy) > 6) { moved = true; st.m.classList.add('drag'); try { st.m.setPointerCapture(e.pointerId); } catch (er) { } }
    if (moved) { st.m.scrollLeft = st.sl - dx; st.m.scrollTop = st.stp - dy; UI._keepScroll = st.m.scrollLeft; e.preventDefault(); }
  }, true);
  const end = () => { if (st) st.m.classList.remove('drag'); st = null; setTimeout(() => { moved = false; }, 0); };
  document.addEventListener('pointerup', end, true); document.addEventListener('pointercancel', end, true);
  document.addEventListener('click', e => { if (moved && e.target.closest && e.target.closest('#mapScroll')) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  // mouse wheel scrolls the map sideways too
  document.addEventListener('wheel', e => { const m = e.target.closest && e.target.closest('#mapScroll'); if (!m || e.ctrlKey) return; if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && m.scrollWidth > m.clientWidth && m.scrollHeight <= m.clientHeight + 4) { m.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false, capture: true });
})();
