// ================= V74: livelier buttons and more motion between menus =================
(function () {
  const st = document.createElement('style'); st.textContent = `
/* ---- colour families: every button has a hue, and the hue drives its glow, edge and icon ---- */
#ui .btn{--h1:#22d3ee;--h2:#3b82f6;--hg:rgba(34,211,238,.45);background:linear-gradient(135deg,color-mix(in srgb,var(--h1) 30%,#071328),color-mix(in srgb,var(--h2) 26%,#050c1f));border-color:color-mix(in srgb,var(--h1) 70%,transparent);color:#ecfeff;text-shadow:0 1px 0 rgba(0,0,0,.5);isolation:isolate}
#ui .btn.big{--h1:var(--pa,#34d399);--h2:color-mix(in srgb,var(--pa,#34d399) 55%,#06b6d4);--hg:color-mix(in srgb,var(--pa,#34d399) 50%,transparent);background:linear-gradient(135deg,var(--h1),var(--h2));color:#04101c;text-shadow:none;border-color:transparent}
#ui .btn.big.gold{background:linear-gradient(135deg,#fcd34d,#f59e0b 55%,#ea580c);color:#1c0f02}#ui .btn.big.warn{background:linear-gradient(135deg,#fb7185,#e11d48);color:#fff}
#ui .btn.gold{--h1:#fde047;--h2:#f97316;--hg:rgba(251,191,36,.55);background:linear-gradient(135deg,#fcd34d,#f59e0b 55%,#ea580c);color:#1c0f02;text-shadow:0 1px 0 rgba(255,255,255,.35);border-color:#fde68a}
#ui .btn.warn{--h1:#fb7185;--h2:#e11d48;--hg:rgba(244,63,94,.5)}
#ui .btn.on{--h1:#a78bfa;--h2:#22d3ee;--hg:rgba(167,139,250,.5)}
#ui .btn.gold:hover{color:#1c0f02;background:linear-gradient(135deg,#fde68a,#fbbf24 55%,#f97316)}#ui .btn.big:hover{color:#04101c;background:linear-gradient(135deg,color-mix(in srgb,var(--h1) 80%,#fff),var(--h2))}
#ui .btn.off,#ui .btn:disabled{filter:grayscale(.85) brightness(.75)}
/* a soft inner light band on top, so buttons read as physical */
#ui .btn::before{content:"";position:absolute;inset:0 0 50% 0;background:linear-gradient(180deg,rgba(255,255,255,.16),transparent);pointer-events:none;z-index:-1}
#ui .btn:hover{color:#fff;background:linear-gradient(135deg,color-mix(in srgb,var(--h1) 42%,#071328),color-mix(in srgb,var(--h2) 36%,#050c1f));filter:brightness(1.15) saturate(1.15);box-shadow:0 0 0 1px var(--h1),0 0 22px var(--hg),inset 0 1px 0 rgba(255,255,255,.25);transform:translateY(-2px)}
#ui .btn:active{transform:translateY(1px) scale(.96);transition-duration:.05s}
/* primary buttons breathe and shimmer on their own */
#ui .btn.gold:not(.off),#ui .btn.big:not(.off){animation:jBreathe 2.6s ease-in-out infinite}
#ui .btn.gold:not(.off)::after,#ui .btn.big:not(.off)::after{animation:jShine 3.2s ease-in-out infinite}
@keyframes jBreathe{0%,100%{box-shadow:0 0 0 0 var(--hg),inset 0 1px 0 rgba(255,255,255,.25)}50%{box-shadow:0 0 18px 2px var(--hg),inset 0 1px 0 rgba(255,255,255,.25)}}
@keyframes jShine{0%,60%{left:-60%}85%,100%{left:130%}}
#ui .btn.gold:hover::after,#ui .btn.big:hover::after{animation:none;left:130%;transition:left .5s}
/* main menu tiles: each tab has its own colour */
.mx{--tc:#22d3ee}.mx[data-tab="ship"]{--tc:#fb923c}.mx[data-tab="station"]{--tc:#a78bfa}.mx[data-tab="career"]{--tc:#fbbf24}.mx[data-tab="social"]{--tc:#34d399}
.mx-tile{border-color:color-mix(in srgb,var(--tc) 35%,transparent);background:linear-gradient(150deg,color-mix(in srgb,var(--tc) 14%,rgba(10,20,40,.95)),rgba(5,10,22,.92) 70%);overflow:hidden}
.mx-tile::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tc);box-shadow:0 0 12px var(--tc);transform:scaleY(.35);transition:transform .25s cubic-bezier(.2,.9,.3,1.3)}
.mx-tile::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at var(--mx,50%) var(--my,50%),color-mix(in srgb,var(--tc) 30%,transparent),transparent 55%);opacity:0;transition:opacity .2s;pointer-events:none}
.mx-tile:hover::before,.mx-tile.pc-hover::before{transform:scaleY(1)}.mx-tile:hover::after,.mx-tile.pc-hover::after{opacity:1}
.mx-tile:hover,.mx-tile.pc-hover{border-color:var(--tc);box-shadow:0 10px 24px rgba(0,0,0,.45),0 0 18px color-mix(in srgb,var(--tc) 40%,transparent)}
.mx-ti{color:#04101f;background:linear-gradient(135deg,var(--tc),color-mix(in srgb,var(--tc) 50%,#fff));box-shadow:0 0 14px color-mix(in srgb,var(--tc) 55%,transparent)}
.mx-tile:hover .mx-ti{animation:jPop .45s cubic-bezier(.2,.9,.3,1.5)}
@keyframes jPop{40%{transform:scale(1.22) rotate(-8deg)}100%{transform:none}}
.mx-tile:active{transform:scale(.97)}
.mx-tab.on{color:var(--tc)}.mx-tab::after{background:var(--tc)}
.mx-hero .mx-go{animation:jBreathe 2.6s ease-in-out infinite}
/* tab content slides in from the side you moved towards, tiles pop in one after another */
.mx-body.jl>*{animation:jFromR .38s cubic-bezier(.16,.9,.25,1) both}.mx-body.jr>*{animation:jFromL .38s cubic-bezier(.16,.9,.25,1) both}
.mx-body.jl .mx-tile,.mx-body.jr .mx-tile{animation:jTile .42s cubic-bezier(.2,.9,.3,1.25) both}
.mx-body .mx-tile:nth-child(2){animation-delay:.04s}.mx-body .mx-tile:nth-child(3){animation-delay:.08s}.mx-body .mx-tile:nth-child(4){animation-delay:.12s}.mx-body .mx-tile:nth-child(5){animation-delay:.16s}.mx-body .mx-tile:nth-child(6){animation-delay:.2s}
@keyframes jFromR{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}@keyframes jFromL{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}
@keyframes jTile{from{opacity:0;transform:translateY(16px) scale(.92)}to{opacity:1;transform:none}}
.mx-sub.jt{animation:jFade .35s ease both}@keyframes jFade{from{opacity:0;letter-spacing:.5em}to{opacity:1}}
/* sliding tab underline */
.mx-tabs{position:relative}.mx-ul{position:absolute;bottom:0;height:3px;background:var(--tc);box-shadow:0 0 12px var(--tc);transition:left .32s cubic-bezier(.2,.9,.3,1.15),width .32s cubic-bezier(.2,.9,.3,1.15);pointer-events:none}
.mx-tab::after{display:none}
/* other lists get the same lift and colour edge */
.item[data-act],button.item,.sh-row,.opt,.sm-tile,.lk-it{transition:transform .15s,box-shadow .2s,border-color .2s}
.sh-row:hover,.opt:hover,.sm-tile:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(0,0,0,.4),0 0 14px rgba(34,211,238,.18)}
.sh-cat{transition:transform .15s,background .2s}.sh-cat:hover{transform:translateX(4px)}
.tog{transition:background .2s,box-shadow .2s}.tog.on{box-shadow:0 0 12px rgba(34,211,238,.55)}
/* mode tiles: each gets a colour */
.sm-tile{--tc:#22d3ee;position:relative;border-left:3px solid var(--tc)!important;background:linear-gradient(150deg,color-mix(in srgb,var(--tc) 12%,rgba(10,20,40,.92)),rgba(5,10,22,.9) 70%)!important}
.sm-tile:nth-child(6n+2){--tc:#f472b6}.sm-tile:nth-child(6n+3){--tc:#fbbf24}.sm-tile:nth-child(6n+4){--tc:#34d399}.sm-tile:nth-child(6n+5){--tc:#a78bfa}.sm-tile:nth-child(6n+6){--tc:#fb923c}
.sm-tile.lk{--tc:#475569}
.sm-tile .sm-ic{color:var(--tc);transition:transform .2s}.sm-tile:hover .sm-ic{animation:jPop .45s cubic-bezier(.2,.9,.3,1.5)}
.sm-tile:hover{border-color:var(--tc)!important;box-shadow:0 8px 20px rgba(0,0,0,.4),0 0 16px color-mix(in srgb,var(--tc) 35%,transparent)!important}
.st-rail .tab{transition:transform .15s,color .15s}.st-rail .tab:hover{transform:translateX(5px);color:#fff}
.sh-cat.on{box-shadow:inset 3px 0 0 var(--acc),0 0 18px rgba(34,211,238,.18)}
/* shop rows: price and MAX side by side */
.sh-row{grid-template-columns:40px minmax(0,1fr) auto auto!important}.sh-row .btn.sh-max{min-width:0}
/* click burst */
.jb{position:fixed;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;pointer-events:none;z-index:10000;animation:jBurst .5s cubic-bezier(.2,.8,.3,1) forwards}
@keyframes jBurst{to{transform:translate(var(--dx),var(--dy)) scale(.2);opacity:0}}
.jr{position:fixed;border-radius:50%;pointer-events:none;z-index:9999;border:2px solid var(--c);animation:jRing .45s ease-out forwards}
@keyframes jRing{from{width:0;height:0;margin:0;opacity:.9}to{width:70px;height:70px;margin:-35px 0 0 -35px;opacity:0}}
/* screen exits: the old screen slides and fades out while the new one comes in */
.jx{position:absolute;inset:0;pointer-events:none;z-index:19;animation:jOut .3s ease-in forwards}
@keyframes jOut{to{opacity:0;transform:translateX(-30px) scale(.98);filter:blur(4px)}}
.scr.vin>.card,.scr.vin>.lay,.scr.vin>.mx,.scr.vin>.gx,.scr.vin>.wm{animation:jIn .45s cubic-bezier(.16,.9,.25,1) both}
@keyframes jIn{from{opacity:0;transform:translateX(30px) scale(.985)}to{opacity:1;transform:none}}
.reduce .jx,.reduce .jb,.reduce .jr{display:none}.reduce .btn,.reduce .mx-tile,.reduce .mx-body>*{animation:none!important}
`; document.head.appendChild(st);
})();
// tile spotlight follows the pointer
document.addEventListener('pointermove', e => { const t = e.target.closest && e.target.closest('.mx-tile'); if (!t) return; const r = t.getBoundingClientRect(); t.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%'); t.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%'); }, { passive: true });
// click bursts in the button's colour
function jBurst(x, y, c) { if (SET.reduce) return; const n = 9; for (let i = 0; i < n; i++) { const d = document.createElement('i'), a = i / n * TAU + Math.random() * .4, r = 26 + Math.random() * 22; d.className = 'jb'; d.style.cssText = 'left:' + x + 'px;top:' + y + 'px;background:' + c + ';box-shadow:0 0 6px ' + c + ';--dx:' + (Math.cos(a) * r) + 'px;--dy:' + (Math.sin(a) * r) + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 520); } const ring = document.createElement('i'); ring.className = 'jr'; ring.style.cssText = 'left:' + x + 'px;top:' + y + 'px;--c:' + c; document.body.appendChild(ring); setTimeout(() => ring.remove(), 470); }
document.addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('.btn,.mx-tile,.mx-tab,.bm-card,.sh-cat,.opt,.sm-tile,.lk-it,.node.av,.tog'); if (!b || b.classList.contains('off')) return;
  const cs = getComputedStyle(b); let c = cs.getPropertyValue('--h1').trim() || cs.getPropertyValue('--tc').trim() || cs.getPropertyValue('--mc').trim() || '#22d3ee'; if (b.classList.contains('gold')) c = '#fde047';
  jBurst(e.clientX, e.clientY, c);
}, true);
// main menu: direction-aware tab animation and a sliding underline
let jPrevTab = UI.mtab;
const _scMenuJ = SCR.scMenu;
SCR.scMenu = function () { return _scMenuJ.apply(this, arguments).replace('<div class="mx" ', '<div class="mx" data-tab="' + (UI.mtab || 'play') + '" '); };
QPOST.push((id, el) => {
  if (id !== 'scMenu' || !el) return; const tabs = el.querySelector('.mx-tabs'), body = el.querySelector('.mx-body'); if (!tabs) return;
  const order = MX_TABS.map(x => x[0]), ni = order.indexOf(UI.mtab), pi0 = order.indexOf(jPrevTab);
  if (body && jPrevTab !== UI.mtab && !SET.reduce) { body.classList.add(ni > pi0 ? 'jl' : 'jr'); const s = el.querySelector('.mx-sub'); if (s) s.classList.add('jt'); }
  let ul = tabs.querySelector('.mx-ul'); if (!ul) { ul = document.createElement('i'); ul.className = 'mx-ul'; tabs.appendChild(ul); }
  const on = tabs.querySelector('.mx-tab.on'); if (on) { const place = (b, anim) => { ul.style.transition = anim ? '' : 'none'; ul.style.left = (b.offsetLeft + 12) + 'px'; ul.style.width = Math.max(10, b.offsetWidth - 24) + 'px'; }; const prev = tabs.querySelector('[data-act="mtab:' + jPrevTab + '"]'); if (prev && prev !== on) { place(prev, false); void ul.offsetWidth; requestAnimationFrame(() => place(on, true)); } else place(on, false); }
  jPrevTab = UI.mtab;
});
// screen exits: keep a snapshot of the old screen and let it slide away (flat menus only - the ship flies between rooms instead)
const _showJ = UI.show.bind(UI);
UI.show = function (id, noHist) {
  const prev = this.top, old = prev && prev !== id && document.getElementById(prev);
  let ghost = null;
  try { if (old && G.scene !== 'play' && !document.body.classList.contains('shipm') && !SET.reduce && old.classList.contains('on') && !/scPause|scCards|scResult/.test(prev + id)) { ghost = old.cloneNode(true); ghost.removeAttribute('id'); ghost.querySelectorAll('[id]').forEach(n => n.removeAttribute('id')); ghost.classList.add('jx'); ghost.classList.remove('vin'); old.parentElement.appendChild(ghost); setTimeout(() => ghost.remove(), 320); } } catch (e) { }
  return _showJ.apply(this, arguments);
};
