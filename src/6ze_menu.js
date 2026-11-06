// ================= V69: new main menu (tabs along the top) + controller cursor =================
const MX_TABS = [
  ['play', 'Play', 'Start or continue the story and every other mode'],
  ['ship', 'Ship', 'Build your ship, buy upgrades and new guns'],
  ['station', 'Station', 'Your base: the Forge, drones and passive cores'],
  ['career', 'Career', 'Missions, daily challenge, profile and records'],
  ['social', 'Online', 'Co-op and versus with friends']
];
UI.mtab = UI.mtab || 'play';
try { const s = JSON.parse(localStorage.getItem('aetheria_ui') || '{}'); if (s.mtab) UI.mtab = s.mtab; } catch (e) { }
QPOST.push(() => { try { const s = JSON.parse(localStorage.getItem('aetheria_ui') || '{}'); s.mtab = UI.mtab; localStorage.setItem('aetheria_ui', JSON.stringify(s)); } catch (e) { } });
const mxIco = k => ICO[k] || MI[k] || ICO.target || '';
function mxTile(act, ico, title, desc, badge, cls) { return '<button class="mx-tile' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"><span class="mx-ti">' + mxIco(ico) + '</span><span class="mx-tt"><b>' + title + '</b><small>' + desc + '</small></span>' + (badge ? '<em class="mx-badge">' + badge + '</em>' : '') + '</button>'; }
function mxTab(tab) {
  const fresh = SAVE.st.runs < 1, ms = msnReady(), dNew = !SAVE.dl.done[dayKey()], online = NET.user && NET.me && NET.me.name, pl = SAVE.pl[0];
  if (tab === 'play') {
    const n = qNext(), W = WORLDS[n.w], done = (prog(n.w).done[0] || []).filter(Boolean).length;
    const hero = '<button class="mx-hero" data-act="' + (fresh ? 'mxstory' : 'cont') + '" style="--wc:' + (W.ac || '#22d3ee') + '"><span class="mx-hk">' + (fresh ? 'NEW HERE? START HERE' : 'CONTINUE THE STORY') + '</span><span class="mx-ht">' + (fresh ? 'Start the story' : 'World ' + (n.w + 1) + ' - Sector ' + (n.lv + 1)) + '</span><span class="mx-hd">' + (fresh ? 'Fly through ' + WORLDS.length + ' worlds and beat every boss. Everything else in the game unlocks as you go.' : escH(W.nm) + ' - ' + done + ' sectors cleared in this world') + '</span><span class="btn big gold mx-go">' + (fresh ? 'LAUNCH' : 'CONTINUE') + (touchOn() ? '' : ' <i class="mx-key">C</i>') + '</span></button>';
    return '<div class="mx-split">' + hero + '<div class="mx-grid">' +
      mxTile('mxmap', 'map', 'Expedition map', 'Pick any sector you have unlocked, replay for stars') +
      mxTile('play', 'target', 'All modes', 'Endless, boss rush, blitz, challenges and more') +
      mxTile('galaxy', 'inf', 'Galaxy', 'Free-roam jobs, bounties and supply crates') +
      mxTile('daily', 'daily', 'Daily challenge', 'One new run every day with a twist', dNew ? 'NEW' : '') +
      mxTile('tutorial', 'tutorial', 'Flight school', 'Learn to fly, dodge and use your ability', fresh ? 'TRY ME' : '') +
      mxTile('mxcoop', 'profile', SAVE.players === 2 ? 'Local co-op: ON' : 'Local co-op: OFF', 'Two players on one screen (P2 uses arrows + Enter)') + '</div></div><div class="mm-card mx-goals"></div>';
  }
  if (tab === 'ship') {
    const nu = typeof nextUpgrade === 'function' ? nextUpgrade() : null;
    return '<div class="mx-grid mx-g3">' +
      mxTile('mxups', 'hp', 'Upgrades', 'Hull, shields, damage, fire rate and more', nu && SAVE.cores >= nu.pr ? 'READY' : '') +
      mxTile('mxwpn', 'bolt', 'Weapons', 'Buy, equip and level up guns - now using ' + escH(wName(pl, pl.wpn))) +
      mxTile('hangar', 'target', 'Hangar', 'Swap hulls, wings and engines, paint your ship') +
      mxTile('locker', 'cos', 'Locker', 'Cosmetics: skins, trails, bullet colours, kill effects') +
      mxTile('mxforge', 'skull', 'The Forge', 'Fuse two maxed guns into a hybrid weapon') +
      mxTile('profile', 'profile', 'Bestiary & stats', 'Every enemy you have met and your records') + '</div>';
  }
  if (tab === 'station') {
    return '<div class="mx-intro">Your station keeps working while you are away. Build modules to earn cores, craft hybrid guns in the Forge and arm combat drones.</div><div class="mx-grid mx-g3">' +
      mxTile('mxstation', 'base', 'Station modules', 'Refinery, lab, armory - collect cores here', typeof raidOn === 'function' && raidOn() ? 'RAID!' : '') +
      mxTile('mxforge', 'skull', 'The Forge', 'Combine two maxed guns into one hybrid') +
      mxTile('mxdrones', 'bolt', 'Drones', 'Pick a drone that flies and fights with you') + '</div>';
  }
  if (tab === 'career') {
    return '<div class="mx-grid mx-g3">' +
      mxTile('missions', 'missions', 'Missions', 'Daily and weekly goals for cores and XP', ms ? ms + ' READY' : '') +
      mxTile('daily', 'daily', 'Daily challenge', 'Today\'s run and your streak', dNew ? 'NEW' : '') +
      mxTile('profile', 'profile', 'Profile', 'Rank, achievements, bestiary and stats') +
      mxTile('boards', 'ranks', 'Leaderboards', 'See how you stack up') +
      mxTile('theater', 'theater', 'Replays', 'Watch your saved clips') +
      mxTile('updates', 'updates', 'Patch notes', 'Everything that changed in each update') + '</div>';
  }
  return '<div class="mx-grid mx-g3">' +
    mxTile('online', 'inf', online ? 'Online: ' + escH(online) : 'Go online', 'Friends, invites, co-op and versus', online && inboxCount() ? inboxCount() : '') +
    mxTile('mxcoop', 'profile', SAVE.players === 2 ? 'Local co-op: ON' : 'Local co-op: OFF', 'Two players on one screen') +
    mxTile('boards', 'ranks', 'Leaderboards', 'Global and friends rankings') + '</div>';
}
SCR.scMenu = function () {
  const has = MAINNAV[0][0] === 'cont'; if (SAVE.st.runs >= 1 && !has) MAINNAV.unshift(['cont', 'Continue', '']); else if (SAVE.st.runs < 1 && has) MAINNAV.shift();
  const X = PS().xp, ac = SAVE.pl[0].cfg.accent || '#22d3ee', t = UI.mtab, fsOn = !!document.fullscreenElement, U = UPDATES[0], online = NET.user && NET.me && NET.me.name ? NET.me.name : null, flux = (SAVE.flux | 0);
  const badge = k => k === 'career' ? (msnReady() || (!SAVE.dl.done[dayKey()] ? '!' : '')) : k === 'station' && typeof raidOn === 'function' && raidOn() ? '!' : '';
  return '<div class="mx" style="--pa:' + ac + '">' +
    '<header class="mx-top"><div class="mx-brand"><b>AETHERIA</b><span>QUANTUM STRIKE</span></div>' +
    '<nav class="mx-tabs">' + (touchOn() ? '' : '<i class="mx-lb">LB</i>') + MX_TABS.map((x, i) => '<button class="mx-tab' + (x[0] === t ? ' on' : '') + '" data-act="mtab:' + x[0] + '" title="' + x[2] + '">' + x[1] + (badge(x[0]) ? '<em>' + badge(x[0]) + '</em>' : '') + '</button>').join('') + (touchOn() ? '' : '<i class="mx-lb">RB</i>') + '</nav>' +
    '<div class="mx-right"><span class="mx-wal"><small>CORES</small><b>' + fmt(SAVE.cores) + '</b></span>' + (flux ? '<span class="mx-wal fx"><small>FLUX</small><b>' + fmt(flux) + '</b></span>' : '') +
    '<button class="mx-ib" data-act="settings" title="Settings" aria-label="Settings">' + MI.settings + '</button><button class="mx-ib" data-act="fs" title="Full screen" aria-label="Full screen">' + (fsOn ? MI.fsx : MI.fs) + '</button></div></header>' +
    '<div class="mx-sub">' + (MX_TABS.find(x => x[0] === t) || MX_TABS[0])[2] + '</div>' +
    '<main class="mx-body">' + mxTab(t) + '</main>' +
    '<footer class="mx-foot"><aside class="mx-pilot"><span class="mx-pn">' + escH(online || 'Pilot') + '</span><span class="mx-pr">LV ' + X.lv + ' ' + rankName(X.lv) + '</span><i class="mx-xp"><b style="width:' + Math.round(X.xp / xpNeed(X.lv) * 100) + '%"></b></i></aside>' +
    '<button class="mm-news" data-act="updates"><b>' + U[0] + '</b> ' + escH(U[1]) + '</button><span class="mm-keys">' + (touchOn() ? '' : '1-5 or [ ] switch tabs') + '</span><button class="mm-cred" data-act="credits">' + dwEmblem('dw-sm') + '<b>Driftwire</b> Games</button></footer></div>';
};
Object.assign(ACT, {
  mtab(a) { if (UI.mtab === a[0]) return; UI.mtab = a[0]; SFX.click(); UI.refresh(); },
  mxstory() { if (!SAVE.tut && !G._tutAsked) { G._tutAsked = 1; UI.show('scTut'); return; } startLevel(0, 0, 1); },
  mxmap() { const n = qNext(); UI.mode = 'expedition'; UI.w = UI.w !== undefined && UI.w < SAVE.wu ? UI.w : n.w; UI.tier = UI.tier || 1; UI.sel = firstOpen(UI.w, UI.tier); UI.show('scMap'); },
  mxcoop() { SAVE.players = SAVE.players === 2 ? 1 : 2; saveGame(); SFX.click(); UI.refresh(); },
  mxups() { UI.shc = 'up'; ACT.shop([]); }, mxwpn() { UI.shc = 'wpn'; ACT.shop([]); },
  mxstation() { BV.tab = 'station'; ACT.base([]); }, mxforge() { BV.tab = 'forge'; ACT.base([]); }, mxdrones() { BV.tab = 'drones'; ACT.base([]); }
});
document.addEventListener('keydown', e => {
  if (UI.top !== 'scMenu' || G.scene === 'play' || e.repeat) return; const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  const i = MX_TABS.findIndex(x => x[0] === UI.mtab);
  if (e.code === 'BracketLeft' || e.code === 'BracketRight') { ACT.mtab([MX_TABS[(i + (e.code === 'BracketRight' ? 1 : MX_TABS.length - 1)) % MX_TABS.length][0]]); e.preventDefault(); }
  else if (/^Digit[1-5]$/.test(e.code)) { ACT.mtab([MX_TABS[+e.code.slice(5) - 1][0]]); e.preventDefault(); }
});
(function () {
  const st = document.createElement('style'); st.textContent = `
.mx{position:relative;display:flex;flex-direction:column;width:100%;height:100%;padding:max(14px,env(safe-area-inset-top)) max(3.5vw,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(3.5vw,env(safe-area-inset-left));gap:12px;color:#e7eefb;box-sizing:border-box}
.mx-top{display:flex;align-items:center;gap:18px}
.mx-brand{display:flex;flex-direction:column;line-height:1}.mx-brand b{font:900 22px var(--disp);letter-spacing:.12em;color:#fff}.mx-brand span{font:800 8px var(--mono);letter-spacing:.5em;color:var(--acc);margin-top:3px}
.mx-tabs{flex:1;display:flex;justify-content:center;align-items:center;gap:4px}
.mx-tab{position:relative;background:none;border:0;cursor:pointer;padding:10px 18px;font:900 clamp(14px,1.5vw,20px) var(--disp);letter-spacing:.14em;text-transform:uppercase;color:rgba(203,213,225,.65);transition:color .15s}
.mx-tab::after{content:"";position:absolute;left:12px;right:12px;bottom:2px;height:3px;background:var(--acc);transform:scaleX(0);transition:transform .2s cubic-bezier(.2,.8,.2,1);clip-path:polygon(0 0,100% 0,calc(100% - 3px) 100%,3px 100%)}
.mx-tab:hover{color:#fff}.mx-tab.on{color:#fff;text-shadow:0 0 18px rgba(34,211,238,.45)}.mx-tab.on::after{transform:scaleX(1)}
.mx-tab em{position:absolute;top:2px;right:2px;min-width:14px;height:14px;padding:0 3px;border-radius:7px;background:#f43f5e;color:#fff;font:900 9px/14px var(--mono);font-style:normal}
.mx-lb{font:900 9px var(--mono);font-style:normal;color:#64748b;border:1px solid #334155;border-radius:4px;padding:2px 5px;margin:0 6px}
.mx-right{display:flex;align-items:center;gap:10px}
.mx-wal{display:flex;flex-direction:column;align-items:flex-end;line-height:1.05;padding:0 6px}.mx-wal small{font:800 8px var(--mono);letter-spacing:.24em;color:#94a3b8}.mx-wal b{font:900 18px var(--mono);color:#fbbf24}.mx-wal.fx b{color:#c084fc}
.mx-ib{width:38px;height:38px;display:grid;place-items:center;background:rgba(10,22,44,.85);border:1px solid var(--line);cursor:pointer;color:#cbd5e1;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}.mx-ib svg{width:18px;height:18px}.mx-ib:hover{color:#fff;border-color:var(--acc)}
.mx-sub{text-align:center;font:700 11px var(--mono);letter-spacing:.2em;color:#7dd3fc;text-transform:uppercase;margin-top:-4px}
.mx-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column}.mx-body>:first-child{margin-top:auto}.mx-body>:last-child{margin-bottom:auto}
.mx-split{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:14px;align-items:stretch}
.mx-hero{position:relative;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;min-height:min(46vh,360px);padding:22px;text-align:left;cursor:pointer;border:1px solid color-mix(in srgb,var(--wc) 60%,transparent);background:linear-gradient(160deg,color-mix(in srgb,var(--wc) 26%,transparent),rgba(4,9,20,.92) 70%);clip-path:polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px);transition:transform .15s,filter .15s}
.mx-hero:hover{transform:translateY(-2px);filter:brightness(1.12)}
.mx-hk{font:900 10px var(--mono);letter-spacing:.3em;color:var(--wc)}.mx-ht{font:900 clamp(28px,4.2vw,52px)/1 var(--disp);text-transform:uppercase;color:#fff;letter-spacing:.03em}.mx-hd{font:600 12px/1.5 var(--mono);color:#cbd5e1;max-width:46ch}
.mx-go{align-self:flex-start;margin-top:6px}.mx-key{font-style:normal;font-size:10px;border:1px solid currentColor;border-radius:4px;padding:1px 5px;margin-left:8px;opacity:.75}
.mx-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-content:center}.mx-g3{grid-template-columns:repeat(3,minmax(0,1fr));max-width:1100px;width:100%;margin:0 auto}
.mx-tile{position:relative;display:flex;align-items:center;gap:12px;text-align:left;padding:14px;cursor:pointer;background:linear-gradient(160deg,rgba(14,30,58,.92),rgba(5,11,24,.9));border:1px solid rgba(56,189,248,.25);color:#e2e8f0;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);transition:transform .15s,border-color .15s,background .15s;min-height:74px}
.mx-tile:hover,.mx-tile.pc-hover{transform:translateY(-2px);border-color:var(--acc);background:linear-gradient(160deg,rgba(18,48,86,.95),rgba(6,14,30,.92))}
.mx-ti{flex:none;width:40px;height:40px;display:grid;place-items:center;background:rgba(34,211,238,.1);color:var(--acc);clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}.mx-ti svg{width:22px;height:22px}
.mx-tt{display:flex;flex-direction:column;gap:3px;min-width:0}.mx-tt b{font:900 15px var(--disp);letter-spacing:.08em;text-transform:uppercase}.mx-tt small{font:600 11px/1.4 var(--mono);color:#94a3b8}
.mx-badge{position:absolute;top:8px;right:10px;font:900 9px var(--mono);font-style:normal;letter-spacing:.14em;color:#04101f;background:#fbbf24;padding:1px 6px}
.mx-intro{text-align:center;font:600 12px/1.6 var(--mono);color:#cbd5e1;max-width:70ch;margin:0 auto 14px}
.mx-foot{display:flex;align-items:center;gap:14px}
.mx-pilot{display:flex;flex-direction:column;gap:2px;min-width:180px;padding:6px 10px;border-left:3px solid var(--pa,var(--acc));background:rgba(8,18,38,.7)}.mx-pn{font:900 13px var(--mono);color:#fff;letter-spacing:.08em}.mx-pr{font:700 9px var(--mono);color:#94a3b8;letter-spacing:.14em}.mx-xp{display:block;height:3px;background:rgba(255,255,255,.1)}.mx-xp b{display:block;height:100%;background:linear-gradient(90deg,#8b5cf6,#e879f9)}
.mx-foot .mm-news{flex:1;text-align:left;background:none;border:0;box-shadow:none;font:700 10px var(--mono);letter-spacing:.12em;color:#94a3b8;cursor:pointer;padding:0}.mx-foot .mm-news b{color:var(--acc);margin-right:6px}.mx-foot .mm-keys{font:700 9px var(--mono);letter-spacing:.12em;color:#64748b;white-space:nowrap}
.mx-goals{display:flex;gap:18px;align-items:flex-start;justify-content:center;flex-wrap:wrap;margin-top:12px}.mx-goals:empty{display:none}.mx .q-sess,.mx .q-hk{display:none}.mx .q-close,.mx #qWish{margin-top:0}
@media (max-width:900px){.mx-split{grid-template-columns:1fr}.mx-g3{grid-template-columns:repeat(2,minmax(0,1fr))}.mx-hero{min-height:150px}.mx-tab{padding:8px 9px;letter-spacing:.06em}.mx-brand{display:none}.mx-lb{display:none}.mx-tt small{display:none}.mx-tile{min-height:52px;padding:10px}.mx-foot .mm-keys,.mx-foot .mm-cred{display:none}}
@media (max-height:520px){.mx{gap:6px}.mx-hero{min-height:0;padding:10px 14px;flex-direction:row;align-items:center;justify-content:space-between;gap:12px}.mx-hd{display:none}.mx-ht{font-size:22px}.mx-go{margin:0;align-self:center}.mx-grid,.mx-g3{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.mx-ti{width:30px;height:30px}.mx-ti svg{width:16px;height:16px}.mx-tt b{font-size:12px}.mx-intro{display:none}.mx-split{gap:8px}.mx-tile{min-height:48px;padding:8px}.mx-tt small{display:none}.mx-sub{display:none}}
`; document.head.appendChild(st);
})();

// ================= controller cursor =================
// Left stick / d-pad moves a pointer, A clicks what it is over, B goes back, right stick scrolls,
// LB / RB switch main-menu tabs. Mouse or keyboard input hides it again.
const PCUR = { x: innerWidth / 2, y: innerHeight / 2, on: false, el: null, hov: null, prev: {}, last: 0 };
(function () {
  const c = document.createElement('div'); c.id = 'padCur'; c.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2l15 9-6.5 1.6L16 20l-3 1.4-3.4-7.4L4 18z" fill="#fff" stroke="#04101f" stroke-width="1.6" stroke-linejoin="round"/></svg>'; document.body.appendChild(c); PCUR.el = c;
  const st = document.createElement('style'); st.textContent = '#padCur{position:fixed;left:0;top:0;z-index:9999;pointer-events:none;display:none;filter:drop-shadow(0 0 6px rgba(34,211,238,.9)) drop-shadow(0 2px 3px rgba(0,0,0,.6));transition:transform .06s linear}#padCur.click svg{transform:scale(.85)}.pc-hover{outline:2px solid var(--acc)!important;outline-offset:2px;filter:brightness(1.18)}'; document.head.appendChild(st);
  const hide = () => { if (PCUR.on) { PCUR.on = false; c.style.display = 'none'; if (PCUR.hov) PCUR.hov.classList.remove('pc-hover'); PCUR.hov = null; } };
  window.addEventListener('mousemove', e => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) hide(); }, true);
  window.addEventListener('keydown', hide, true);
})();
try { if (SETS.CONTROLS && !SETS.CONTROLS.some(r => r[0] === 'padCursor')) SETS.CONTROLS.push(['padCursor', 'tog', 'Controller cursor in menus', 'Move a pointer with the stick, A to click (off = jump between buttons)']); if (SET.padCursor === undefined) SET.padCursor = true; } catch (e) { }
const _padNavPC = padNav; padNav = function (o, prev) { if (SET.padCursor === false) return _padNavPC.apply(this, arguments); };
function pcTarget() { let el = document.elementFromPoint(PCUR.x, PCUR.y); if (!el || el === PCUR.el) return null; return el.closest('[data-act],button,select,input,.tog,[data-set],a,label') || null; }
function pcClick(el) {
  if (!el) return; PCUR.el.classList.add('click'); setTimeout(() => PCUR.el.classList.remove('click'), 120);
  if (el.tagName === 'SELECT') { el.selectedIndex = (el.selectedIndex + 1) % el.options.length; el.dispatchEvent(new Event('change', { bubbles: true })); return; }
  if (el.tagName === 'INPUT' && el.type === 'range') { const st = +el.step || .05, mx = +el.max; el.value = (+el.value + st > mx + 1e-9) ? el.min : (+el.value + st); el.dispatchEvent(new Event('input', { bubbles: true })); return; }
  if (el.tagName === 'INPUT') { el.focus(); return; }
  const o = { bubbles: true, cancelable: true, clientX: PCUR.x, clientY: PCUR.y, pointerType: 'mouse', button: 0 };
  try { el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); } catch (e) { }
  el.click();
}
(function loop(now) {
  requestAnimationFrame(loop);
  try {
    const dt = Math.min(.05, (now - (PCUR.last || now)) / 1000); PCUR.last = now;
    if (SET.padCursor === false || G.cut || G.photo || G.padBind) return;
    const inUI = !G.inCombat || G.paused || G.pick || G.brief; if (!inUI) { if (PCUR.on) { PCUR.on = false; PCUR.el.style.display = 'none'; } return; }
    const gps = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const g of gps) if (g && g.connected) { gp = g; break; } if (!gp) return;
    const dz = Math.max(.15, SET.dead || .2), b = i => gp.buttons[i] && gp.buttons[i].pressed, ax = v => Math.abs(v) > dz ? (v - Math.sign(v) * dz) / (1 - dz) : 0;
    let mx = ax(gp.axes[0] || 0) + (b(15) ? 1 : 0) - (b(14) ? 1 : 0), my = ax(gp.axes[1] || 0) + (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
    const sx = ax(gp.axes[2] || 0), sy = ax(gp.axes[3] || 0), P = PCUR.prev, A = b(0), B = b(1), LB = b(4), RB = b(5);
    const any = mx || my || sx || sy || A || B || LB || RB;
    if (any && !PCUR.on) { PCUR.on = true; PCUR.el.style.display = 'block'; }
    if (PCUR.on) {
      const tgt = pcTarget(), slow = tgt ? .55 : 1, sp = (900 + 900 * Math.min(1, Math.hypot(mx, my))) * slow * (Math.min(innerWidth, innerHeight) / 900);
      PCUR.x = clamp(PCUR.x + Math.sign(mx) * mx * mx * sp * dt, 2, innerWidth - 2); PCUR.y = clamp(PCUR.y + Math.sign(my) * my * my * sp * dt, 2, innerHeight - 2);
      PCUR.el.style.transform = 'translate(' + (PCUR.x - 4) + 'px,' + (PCUR.y - 3) + 'px)';
      const h = pcTarget(); if (h !== PCUR.hov) { if (PCUR.hov) PCUR.hov.classList.remove('pc-hover'); PCUR.hov = h; if (h) h.classList.add('pc-hover'); }
      if (sx || sy) { let s = document.elementFromPoint(PCUR.x, PCUR.y); while (s && s !== document.body && !(s.scrollHeight > s.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(s).overflowY)) && !(s.scrollWidth > s.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(s).overflowX))) s = s.parentElement; if (s && s !== document.body) { s.scrollTop += sy * 900 * dt; s.scrollLeft += sx * 900 * dt; } }
      if (A && !P.A) pcClick(h);
      if (B && !P.B) { try { navBack(); } catch (e) { ACT.back && ACT.back(); } }
      if ((LB && !P.LB) || (RB && !P.RB)) { if (UI.top === 'scMenu') { const i = MX_TABS.findIndex(x => x[0] === UI.mtab); ACT.mtab([MX_TABS[(i + (RB ? 1 : MX_TABS.length - 1)) % MX_TABS.length][0]]); } }
    }
    PCUR.prev = { A, B, LB, RB };
  } catch (e) { }
})(performance.now());
