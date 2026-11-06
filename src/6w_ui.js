// ================= V62: "VECTOR" menu style - matches the in-game HUD =================
// Cut-corner buttons with a light sweep, bracketed glass panels, scanlines, sharp rows,
// a staged entrance when a screen opens, and quiet hover ticks.
(function () {
  const css = `
:root{--vx-cut:10px;--vx-line:rgba(56,189,248,.32);--vx-glass:linear-gradient(160deg,rgba(11,22,44,.95),rgba(4,9,20,.97))}
.card{border-radius:4px;background:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 3px),var(--vx-glass);border:1px solid var(--vx-line);box-shadow:0 0 0 1px rgba(0,0,0,.4),0 24px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06)}
.card::after{content:"";position:absolute;inset:6px;pointer-events:none;z-index:0;
 background:linear-gradient(var(--acc),var(--acc)) 0 0/18px 2px,linear-gradient(var(--acc),var(--acc)) 0 0/2px 18px,linear-gradient(var(--acc),var(--acc)) 100% 100%/18px 2px,linear-gradient(var(--acc),var(--acc)) 100% 100%/2px 18px;background-repeat:no-repeat;opacity:.7}
.card>*{position:relative;z-index:1}
.btn{border-radius:2px;clip-path:polygon(var(--vx-cut) 0,100% 0,100% calc(100% - var(--vx-cut)),calc(100% - var(--vx-cut)) 100%,0 100%,0 var(--vx-cut));background:linear-gradient(180deg,rgba(34,211,238,.2),rgba(8,47,73,.35));border:1px solid rgba(34,211,238,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 -2px 0 rgba(0,0,0,.35);overflow:hidden;transition:transform .12s,filter .12s,background .15s}
.btn::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent);transform:skewX(-20deg);pointer-events:none;transition:none}
.btn:hover{transform:translateY(-1px);filter:brightness(1.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -2px 0 rgba(0,0,0,.35),0 0 18px rgba(34,211,238,.28)}
.btn:hover::after{left:130%;transition:left .55s ease}
.btn:active{transform:translateY(1px) scale(.985);box-shadow:inset 0 2px 6px rgba(0,0,0,.5)}
.btn.big{background:linear-gradient(180deg,rgba(52,211,153,.32),rgba(6,78,59,.4));border-color:rgba(52,211,153,.75);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 -2px 0 rgba(0,0,0,.35)}
.btn.big:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 0 22px rgba(52,211,153,.35)}
.btn.sm{border-radius:2px;--vx-cut:7px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.btn.warn{background:linear-gradient(180deg,rgba(251,113,133,.3),rgba(76,5,25,.4));box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}
.btn.gold{background:linear-gradient(180deg,rgba(251,191,36,.34),rgba(90,50,5,.4));box-shadow:inset 0 1px 0 rgba(255,255,255,.16)}
.item{border-radius:3px;background:linear-gradient(90deg,rgba(10,22,44,.9),rgba(6,13,28,.82));box-shadow:none;border:1px solid rgba(56,189,248,.2);border-left:2px solid rgba(56,189,248,.45);transition:border-color .15s,background .15s,transform .15s}
button.item:hover,.item[data-act]:hover{border-left-color:var(--acc);background:linear-gradient(90deg,rgba(14,40,70,.95),rgba(6,13,28,.85));transform:translateX(2px)}
.setrow{border-bottom:1px dashed rgba(56,189,248,.14)}
.tabs button,.seg button{border-radius:2px!important}
.inp,input.inp,select{border-radius:3px!important}
h2{letter-spacing:.22em}
.card h2::after{content:"";display:block;width:42px;height:2px;margin-top:6px;background:linear-gradient(90deg,var(--acc),transparent)}
.title,.lay-t{text-shadow:0 0 30px rgba(34,211,238,.18)}

/* titles: upright, wide-tracked, with an eyebrow tag and cut accent strip */
.lay-t,.st-rail h2,.card>h2{transform:none!important;letter-spacing:.06em!important;font-style:normal!important}
.vx-eb{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font:800 10px var(--mono);letter-spacing:.32em;color:var(--acc);margin-bottom:6px;transform:none;filter:none;text-shadow:none}
.vx-eb i{font-style:normal;display:inline-block;background:var(--acc);color:#04101f;padding:1px 7px 1px 6px;margin-right:8px;clip-path:polygon(0 0,100% 0,calc(100% - 5px) 100%,0 100%)}
.lay-t::after,.st-rail h2::after{content:"";display:block;width:min(180px,40%);height:3px;margin-top:10px;background:linear-gradient(90deg,var(--acc) 0 60%,transparent 60% 64%,var(--acc) 64% 72%,transparent 72%);clip-path:polygon(0 0,100% 0,calc(100% - 3px) 100%,0 100%)}
/* main menu words: upright, numbered, cut highlight bar */
.mm-main{counter-reset:mmn}
.mm-nav{counter-increment:mmn}
.mm-nav .mm-w{transform:none!important;letter-spacing:.04em}
.mm-nav .mm-w::before{content:"0" counter(mmn);font:800 12px var(--mono);letter-spacing:.1em;color:var(--acc);vertical-align:top;margin-right:12px;-webkit-text-stroke:0;opacity:.75}
.mm-nav::before{transform:scaleX(0)!important;clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%);opacity:.32!important;transition:transform .22s cubic-bezier(.2,.8,.2,1)!important}
.mm-nav:hover::before,.mm-nav:focus-visible::before,.mm-nav.gpf::before{transform:scaleX(1)!important}
.mm-nav:hover .mm-w,.mm-nav:focus-visible .mm-w,.mm-nav.gpf .mm-w{transform:translateX(12px)!important}
/* side rails: cut-corner active block */
.st-rail .tab{border-radius:0!important;clip-path:polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)}
.st-rail .tab.on,.st-rail .tab[aria-selected="true"]{background:linear-gradient(90deg,rgba(34,211,238,.28),rgba(34,211,238,.06))!important;border-left-color:var(--acc)!important;color:#fff!important}
/* staged entrance */
.scr.vin>.card,.scr.vin>.lay,.scr.vin>div>.card{animation:vxIn .42s cubic-bezier(.16,.9,.25,1) both}
.scr.vin .card .item,.scr.vin .card .btn,.scr.vin .card .setrow{animation:vxRow .38s cubic-bezier(.16,.9,.25,1) both}
.scr.vin .card .item:nth-child(2),.scr.vin .card .setrow:nth-child(2){animation-delay:.03s}.scr.vin .card .item:nth-child(3),.scr.vin .card .setrow:nth-child(3){animation-delay:.06s}.scr.vin .card .item:nth-child(4),.scr.vin .card .setrow:nth-child(4){animation-delay:.09s}.scr.vin .card .item:nth-child(n+5),.scr.vin .card .setrow:nth-child(n+5){animation-delay:.12s}
@keyframes vxIn{0%{opacity:0;transform:translateY(14px) scale(.985);clip-path:inset(0 0 100% 0)}60%{clip-path:inset(0 0 0 0)}100%{opacity:1;transform:none;clip-path:inset(0 0 0 0)}}
@keyframes vxRow{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
.reduce .scr.vin *, .nofx .scr.vin *{animation:none!important}
/* scan wipe over the whole screen on change */
#vxWipe{position:absolute;inset:0;z-index:25;pointer-events:none;opacity:0;background:linear-gradient(180deg,transparent 0,rgba(34,211,238,.12) 48%,rgba(255,255,255,.35) 50%,rgba(34,211,238,.12) 52%,transparent 100%);background-size:100% 260%;}
#vxWipe.go{animation:vxWipe .45s ease-out}
@keyframes vxWipe{0%{opacity:1;background-position:0 100%}100%{opacity:0;background-position:0 0}}
`;
  const st = document.createElement('style'); st.id = 'vxcss'; st.textContent = css; document.head.appendChild(st);
  const wipe = document.createElement('div'); wipe.id = 'vxWipe'; const u = document.getElementById('ui'); if (u) u.appendChild(wipe);
})();
const VX_EB = { scModes: ['01', 'SORTIE // SELECT OPERATION'], scSettings: ['SYS', 'SHIP SYSTEMS // CONFIG'], scShop: ['02', 'QUARTERMASTER // REQUISITION'], scHangar: ['03', 'HANGAR BAY // LOADOUT'], scMissions: ['04', 'COMMAND // ORDERS'], scProfile: ['05', 'PILOT RECORD'], scLocker: ['06', 'LOCKER // COSMETICS'], scMap: ['07', 'NAV // SECTOR CHART'], scUpdates: ['LOG', 'PATCH NOTES'], scCredits: ['END', 'CREDITS'], scSlots: ['MEM', 'SAVE CORE'], scKeys: ['SYS', 'INPUT MAP'], scDaily: ['08', 'DAILY OPS'], scJukebox: ['AUD', 'JUKEBOX'], scOnline: ['NET', 'COMMS ARRAY'], scBestiary: ['DB', 'THREAT DATABASE'] };
const _showVX = UI.show.bind(UI);
UI.show = function (id) {
  const prev = UI.top, r = _showVX.apply(this, arguments);
  try {
    if (id && id !== prev && !SET.reduce) {
      const el = document.getElementById(id); if (el) { el.classList.remove('vin'); void el.offsetWidth; el.classList.add('vin'); clearTimeout(el._vin); el._vin = setTimeout(() => el.classList.remove('vin'), 650); }
      if (el && !el.querySelector('.vx-eb')) { const t = el.querySelector('.lay-t, .st-rail h2, .card > h2, .card .row > h2'); const lab = VX_EB[id]; if (t && lab) t.insertAdjacentHTML('afterbegin', '<span class="vx-eb"><i>' + lab[0] + '</i>' + lab[1] + '</span>'); }
      const w = document.getElementById('vxWipe'); if (w && G.scene !== 'play' && !document.body.classList.contains('shipm')) { w.classList.remove('go'); void w.offsetWidth; w.classList.add('go'); }
    }
  } catch (e) { }
  return r;
};
// quiet hover tick on buttons
const vxT = { t: 0, el: null };
document.addEventListener('pointerover', e => {
  const b = e.target.closest && e.target.closest('.btn,button.item,.item[data-act],.mm-nav button,.sm-tile'); if (!b || b === vxT.el || e.pointerType === 'touch') return; vxT.el = b;
  const now = performance.now(); if (now - (vxT.t || 0) < 45) return; vxT.t = now;
  try { if (!AC || !sfxG || AC.state !== 'running') return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(1600, t + .03); g.gain.setValueAtTime(.025, t); g.gain.exponentialRampToValueAtTime(.0001, t + .04); o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + .05); } catch (er) { }
}, true);
