// ================= V88: Flight School part 1 - a spotlight tour of the real menus =================
const TOUR = [
  { t: 'WELCOME ABOARD', x: 'This is Flight School. First a quick tour of your ship\'s menus, then a short practice flight that explains everything on your HUD. About three minutes - skip any time.' },
  { sel: '.mx-tabs', tab: 'play', t: 'FIVE TABS', x: () => 'Everything lives in these five tabs. ' + (touchOn() ? 'Tap one to switch.' : 'Click them, press 1-5 or [ and ] (controller: LB / RB).') },
  { sel: '.mx-hero', tab: 'play', t: 'CONTINUE THE STORY', x: 'The big card always launches your next sector, so this is the fastest way back into the action.' },
  { sel: '[data-act="mxmap"]', tab: 'play', t: 'EXPEDITION MAP', x: 'Every world and sector of the campaign. Pick any sector you have unlocked, replay old ones for stars, and choose your route at the branches.' },
  { sel: '[data-act="play"]', tab: 'play', t: 'ALL MODES', x: 'Endless, Boss Rush, Hardcore, Training and every other way to play.' },
  { sel: '.mx-body', tab: 'ship', t: 'SHIP', x: 'HANGAR: hull parts, wings, engines and paint. UPGRADES: spend cores on hull, shield and damage (MAX buys every level you can afford). WEAPONS: buy and level guns. LOCKER: cosmetics.' },
  { sel: '.mx-body', tab: 'station', t: 'STATION', x: 'Your base keeps earning cores while you are away. Build modules, craft hybrid guns in the Forge and arm drones that fight beside you.' },
  { sel: '.mx-body', tab: 'career', t: 'CAREER', x: 'Missions and the daily challenge pay out cores. Profile holds your stats and the Bestiary of everything you have fought. Patch notes show what is new.' },
  { sel: '.mx-body', tab: 'social', t: 'ONLINE', x: 'Team up in online co-op or go head to head in versus with friends.' },
  { sel: '.mx-right .mx-wal', tab: 'play', t: 'YOUR WALLET', x: 'CORES buy upgrades and guns - you earn them in every run. FLUX, once you have some, is only for cosmetics.' },
  { sel: '.mx-right [data-act="settings"]', tab: 'play', t: 'SETTINGS', x: 'Graphics presets, controls and key rebinding, accessibility options, audio and your save data.' },
  { sel: '.mx-pilot', tab: 'play', t: 'PILOT RANK', x: 'Every run earns XP toward your pilot level and rank.' },
  { t: 'NOW, THE COCKPIT', x: 'Next is a short practice flight that shows you every part of your HUD while you fly.', last: true }
];
const TOURS = { on: false, i: 0, el: null, raf: 0 };
function tourStart() {
  if (TOURS.on) return;
  if (UI.top !== 'scMenu') UI.show('scMenu', true);
  try { if (typeof SHIP !== 'undefined' && SHIP.on && !SHIP.room && !SHIP.S.travel) SHIP.go('bridge'); } catch (e) { }
  TOURS.on = true; TOURS.i = 0; G.tour = true;
  const d = document.createElement('div'); d.id = 'tourHud'; d.innerHTML = '<div class="tr-spot"></div><div class="tr-card"></div>'; document.body.appendChild(d); TOURS.el = d;
  d.addEventListener('click', e => { const b = e.target.closest('[data-tr]'); if (!b) return; e.stopPropagation(); const f = b.dataset.tr; if (f === 'next') tourGo(TOURS.i + 1); else if (f === 'back') tourGo(TOURS.i - 1); else if (f === 'skip') tourEnd(false); else if (f === 'fly') tourEnd(true); });
  tourGo(0); const loop = () => { if (!TOURS.on) return; TOURS.raf = requestAnimationFrame(loop); tourPlace(); }; loop();
}
function tourGo(i) {
  if (!TOURS.on) return; i = Math.max(0, Math.min(TOUR.length - 1, i)); TOURS.i = i; const s = TOUR[i];
  if (s.tab && UI.mtab !== s.tab) { try { ACT.mtab([s.tab]); } catch (e) { } }
  const c = TOURS.el.querySelector('.tr-card'), x = typeof s.x === 'function' ? s.x() : s.x;
  c.innerHTML = '<div class="tr-h"><b>' + s.t + '</b><span>' + (i + 1) + ' / ' + TOUR.length + '</span></div><p>' + x + '</p><div class="tr-dots">' + TOUR.map((_, k) => '<i class="' + (k < i ? 'd' : k === i ? 'on' : '') + '"></i>').join('') + '</div>'
    + '<div class="tr-row">' + (s.last ? '<button data-tr="skip">FINISH HERE</button><button data-tr="fly" class="go">START PRACTICE FLIGHT</button>' : '<button data-tr="skip">SKIP TOUR</button>' + (i ? '<button data-tr="back">BACK</button>' : '') + '<button data-tr="next" class="go">NEXT</button>') + '</div>';
  c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); try { SFX.click(); } catch (e) { }
  TOURS.el.classList.toggle('nospot', !s.sel); tourPlace(true);
}
function tourPlace() {
  if (!TOURS.on) return; const s = TOUR[TOURS.i], sp = TOURS.el.querySelector('.tr-spot'), c = TOURS.el.querySelector('.tr-card'), W = innerWidth, H = innerHeight;
  const el = s.sel ? document.querySelector('#scMenu ' + s.sel) || document.querySelector(s.sel) : null; const r = el && el.getBoundingClientRect();
  if (!r || r.width < 2) { sp.style.opacity = 0; c.style.left = (W - c.offsetWidth) / 2 + 'px'; c.style.top = (H - c.offsetHeight) / 2 + 'px'; return; }
  const pad = 8; sp.style.opacity = 1; sp.style.left = r.left - pad + 'px'; sp.style.top = r.top - pad + 'px'; sp.style.width = r.width + pad * 2 + 'px'; sp.style.height = r.height + pad * 2 + 'px';
  const cw = c.offsetWidth, ch = c.offsetHeight; let top = r.bottom + 18; if (top + ch > H - 10) top = r.top - ch - 18; if (top < 10) top = Math.min(H - ch - 10, Math.max(10, r.top + r.height / 2 - ch / 2));
  let left = Math.max(10, Math.min(W - cw - 10, r.left + r.width / 2 - cw / 2)); if (top < r.bottom && top + ch > r.top && r.width > W * .5) left = Math.max(10, Math.min(W - cw - 10, left)); c.style.left = left + 'px'; c.style.top = top + 'px';
}
function tourEnd(fly) {
  if (!TOURS.on) return; TOURS.on = false; G.tour = false; cancelAnimationFrame(TOURS.raf); if (TOURS.el) TOURS.el.remove(); TOURS.el = null;
  try { ACT.mtab(['play']); } catch (e) { }
  if (fly) { UI.hideAll(); beginRun({ mode: 'tutorial', w: 0 }); } else { SAVE.tut = true; saveGame(); }
}
addEventListener('keydown', e => { if (!TOURS.on) return; e.stopPropagation(); if (e.code === 'Enter' || e.code === 'ArrowRight' || e.code === 'Space') { e.preventDefault(); if (TOUR[TOURS.i].last) tourEnd(true); else tourGo(TOURS.i + 1); } else if (e.code === 'ArrowLeft' || e.code === 'Backspace') { e.preventDefault(); tourGo(TOURS.i - 1); } else if (e.code === 'Escape') { e.preventDefault(); tourEnd(false); } }, true);
// controller: A next, B back, Start skips
(function pad() { let prev = {}; (function l() { requestAnimationFrame(l); if (!TOURS.on) { prev = {}; return; } const gp = (navigator.getGamepads ? navigator.getGamepads() : [])[0]; if (!gp) return; const b = n => !!(gp.buttons[n] && gp.buttons[n].pressed), ed = n => b(n) && !prev[n]; if (ed(0)) { if (TOUR[TOURS.i].last) tourEnd(true); else tourGo(TOURS.i + 1); } else if (ed(1)) tourGo(TOURS.i - 1); else if (ed(9)) tourEnd(false); prev = { 0: b(0), 1: b(1), 9: b(9) }; })(); })();
// Flight School now starts with the tour
ACT.tutorial = () => tourStart();
ACT.tutpractice = () => { UI.hideAll(); beginRun({ mode: 'tutorial', w: 0 }); };
try { SCR.scTut = () => '<div class="card" style="width:min(500px,100%)"><div class="title" style="font-size:clamp(22px,6vw,34px)">WELCOME, PILOT</div><div class="subt">NEW HERE?</div><p class="tc mut" style="line-height:1.7;margin-bottom:18px">Take <b class="acc">Flight School</b>: a quick tour of your ship\'s menus - the map, hangar, station and more - then a practice flight that explains every part of your HUD.</p><div class="stack"><button class="btn big" data-act="tutorial">START FLIGHT SCHOOL</button><button class="btn" data-act="tutpractice">JUST THE PRACTICE FLIGHT</button><button class="btn" data-act="tutlater">SKIP - I KNOW WHAT I\'M DOING</button></div></div>'; } catch (e) { }
(function () {
  const st = document.createElement('style'); st.textContent = `
#tourHud{position:fixed;inset:0;z-index:70;pointer-events:auto;font-family:var(--mono)}
#tourHud .tr-spot{position:absolute;border:2px solid #fbbf24;border-radius:10px;box-shadow:0 0 0 9999px rgba(2,6,23,.66),0 0 24px rgba(251,191,36,.7);transition:left .35s ease,top .35s ease,width .35s ease,height .35s ease,opacity .25s;pointer-events:none;animation:trGlow 1.6s ease-in-out infinite}
#tourHud.nospot{background:rgba(2,6,23,.66)}
@keyframes trGlow{50%{box-shadow:0 0 0 9999px rgba(2,6,23,.66),0 0 40px rgba(251,191,36,.95)}}
#tourHud .tr-card{position:absolute;width:min(380px,calc(100vw - 20px));background:linear-gradient(180deg,rgba(15,23,42,.97),rgba(2,6,23,.97));border:1px solid rgba(251,191,36,.6);border-top:3px solid #fbbf24;padding:14px 16px 12px;box-shadow:0 18px 50px rgba(0,0,0,.6);transition:left .35s ease,top .35s ease}
#tourHud .tr-card.pop{animation:trPop .3s ease}
@keyframes trPop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
#tourHud .tr-h{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
#tourHud .tr-h b{font:italic 900 18px var(--disp,system-ui);letter-spacing:.08em;color:#fde68a}
#tourHud .tr-h span{font:800 10px var(--mono);letter-spacing:.16em;color:#94a3b8}
#tourHud p{margin:8px 0 10px;font:600 13px/1.55 system-ui;color:#e2e8f0}
#tourHud .tr-dots{display:flex;gap:4px;margin-bottom:10px}#tourHud .tr-dots i{width:14px;height:4px;background:rgba(148,163,184,.3)}#tourHud .tr-dots i.d{background:rgba(251,191,36,.5)}#tourHud .tr-dots i.on{background:#fbbf24}
#tourHud .tr-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
#tourHud button{font:900 11px var(--mono);letter-spacing:.14em;color:#e2e8f0;background:rgba(30,41,59,.9);border:1px solid rgba(148,163,184,.4);padding:9px 14px;cursor:pointer}
#tourHud button:hover{border-color:#fbbf24}
#tourHud button.go{background:#fbbf24;color:#1c1917;border-color:#fbbf24}
`; document.head.appendChild(st);
})();
window.__TOUR = { start: tourStart, go: tourGo, end: tourEnd, get i() { return TOURS.i; } };
