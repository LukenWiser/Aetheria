// ================= V81: walk the ship in first person =================
ACT.walk = () => {
  if (typeof SHIP === 'undefined' || !SHIP.on) { toast('SHIP VIEW IS OFF', 'Turn on Ship menu and 3D models in Settings > Graphics to walk the ship', '#fbbf24'); return; }
  if (SHIP.busy && SHIP.S.travel) { SHIP.S.travel.t = 1; setTimeout(() => SHIP.walk(), 80); return; }
  SHIP.walk();
};
QPOST.push((id, el) => {
  if (id !== 'scMenu' || !el || el.querySelector('[data-act="walk"]')) return; const r = el.querySelector('.mx-right'); if (!r) return;
  r.insertAdjacentHTML('afterbegin', '<button class="mx-ib wk-btn" data-act="walk" title="Walk the ship (first person)" aria-label="Walk the ship"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="2"/><path d="M10 21l2-6 3 3v3M8 12l2-4h4l3 4M12 8l-1 5"/></svg><span>WALK</span></button>');
});
(function () {
  const st = document.createElement('style'); st.textContent = `
#scMenu .wk-btn{width:auto!important;padding:0 12px 0 9px;gap:6px;display:inline-flex;align-items:center;font:900 10px var(--mono);letter-spacing:.16em;color:#a7f3d0;border-color:rgba(52,211,153,.55)!important;background:linear-gradient(180deg,rgba(16,185,129,.22),rgba(6,78,59,.35))!important}
#scMenu .wk-btn:hover{box-shadow:0 0 18px rgba(52,211,153,.45);color:#ecfdf5}
#scMenu .wk-btn svg{width:16px;height:16px}
body.walking #qCrumb,body.walking #shipTag,body.walking .toastWrap,body.walking #padCur{display:none!important}
#wkHud{position:fixed;inset:0;z-index:60;cursor:crosshair;touch-action:none;user-select:none;-webkit-user-select:none}
#wkHud.locked{cursor:none}
#wkHud .wk-x{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#e0f2fe;box-shadow:0 0 0 2px rgba(0,0,0,.45),0 0 10px rgba(125,211,252,.8)}
#wkHud .wk-help{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);font:800 11px var(--mono);letter-spacing:.14em;color:#cbd5e1;background:rgba(2,6,15,.6);padding:7px 14px;border:1px solid rgba(148,163,184,.25);white-space:nowrap;animation:wkHelp 6s forwards}
@keyframes wkHelp{0%,70%{opacity:1}100%{opacity:.25}}
#wkHud .wk-exit{position:absolute;top:16px;right:16px;font:900 11px var(--mono);letter-spacing:.18em;color:#fecaca;background:rgba(127,29,29,.55);border:1px solid rgba(248,113,113,.6);padding:10px 16px;cursor:pointer}
#wkHud .wk-exit:hover{background:rgba(185,28,28,.7);color:#fff}
#wkHud .wk-click{position:absolute;left:50%;top:58%;transform:translateX(-50%);font:900 12px var(--mono);letter-spacing:.2em;color:#e0f2fe;background:rgba(2,6,15,.7);padding:9px 16px;border:1px solid rgba(125,211,252,.45);pointer-events:none}
#wkHud.locked .wk-click{display:none}
@media (pointer:coarse){#wkHud .wk-click{display:none}}
#wkHud .wk-room{position:absolute;left:50%;top:14%;transform:translateX(-50%);font:italic 900 28px var(--disp,system-ui);letter-spacing:.12em;color:#f0f9ff;text-shadow:0 0 18px var(--c,#22d3ee);opacity:0;pointer-events:none;border-bottom:3px solid var(--c,#22d3ee);padding-bottom:4px}
#wkHud .wk-room.on{animation:wkRoom 2.4s ease forwards}
@keyframes wkRoom{0%{opacity:0;transform:translate(-50%,10px)}15%,70%{opacity:1;transform:translate(-50%,0)}100%{opacity:0}}
#wkHud .wk-joy{position:absolute;width:110px;height:110px;margin:-55px 0 0 -55px;border-radius:50%;border:2px solid rgba(148,163,184,.45);background:rgba(15,23,42,.35);display:none;pointer-events:none}
#wkHud .wk-joy.on{display:block}
#wkHud .wk-joy i{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(125,211,252,.55)}
#wkHud .wk-fade{position:absolute;inset:0;background:#02040a;pointer-events:none;animation:wkIn .35s ease forwards}
#wkHud.out .wk-fade{animation:wkOut .25s ease forwards}
@keyframes wkIn{from{opacity:1}to{opacity:0}}@keyframes wkOut{from{opacity:0}to{opacity:1}}
`; document.head.appendChild(st);
})();
