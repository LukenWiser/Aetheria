// ================= V59: brand-new in-game HUD ("VECTOR") =================
// Pilot cluster sits in the bottom corner (top corner on touch screens so it clears the controls).
// Hull is split into HIT CELLS - each cell is one enemy bullet - so you can read "hits left" at a glance.
// Bars drain with a white ghost trail, panels fade out when your ship flies under them.
(function () {
  const css = `
#hud{--hh:#ff5a6a;--hs:#4cc9f0;--hp:#2dd4bf;--ha:#fbbf24;--hu:#e879f9;font-family:var(--mono)}
#hud .hx{position:absolute;width:min(350px,42vw);pointer-events:none;transition:opacity .25s;filter:drop-shadow(0 6px 14px rgba(0,0,0,.55))}
#hud .hx.l{left:calc(14px + env(safe-area-inset-left));bottom:calc(14px + env(safe-area-inset-bottom))}
#hud .hx.r{right:calc(14px + env(safe-area-inset-right));bottom:calc(14px + env(safe-area-inset-bottom));display:none}
#hud.coop .hx.r{display:block}
#hud .hx.l2,#hud .hx.r2{bottom:calc(132px + env(safe-area-inset-bottom))}
#hud.tch .hx.l,#hud.tch .hx.r{bottom:auto;top:calc(8px + env(safe-area-inset-top));width:330px;transform:scale(var(--hsc,.68));transform-origin:0 0}#hud.tch .hx.r{transform-origin:100% 0}
#hud.tch #top{width:min(340px,38vw);top:calc(8px + env(safe-area-inset-top))}#hud.tch #top .scb .s1{font-size:14px}
@media (min-width:1100px){#hud.tch{--hsc:.85}}
#hud.tch .hx.l2,#hud.tch .hx.r2{top:calc(96px + env(safe-area-inset-top))}
#hud .hx.dim{opacity:.28}
.hx .fr{position:relative;padding:9px 12px 10px 14px;background:linear-gradient(100deg,rgba(4,10,22,.86),rgba(8,20,40,.72));clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,14px 100%,0 calc(100% - 14px));border-left:3px solid var(--pc,#22d3ee)}
.hx.r .fr{clip-path:polygon(16px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 16px);border-left:0;border-right:3px solid var(--pc,#fb923c)}
.hx .fr:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px);pointer-events:none}
.hx .hd{display:flex;align-items:baseline;gap:8px;font:800 10px var(--mono);letter-spacing:.18em;color:#9fb3cf;margin-bottom:6px}
.hx .hd .id{color:#04101f;background:var(--pc,#22d3ee);padding:1px 6px 1px 5px;clip-path:polygon(0 0,100% 0,calc(100% - 5px) 100%,0 100%);font-weight:900}
.hx .hd .wp{color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.hx .hd .wp i{font-style:normal;color:var(--ha);margin-left:5px}
.hx .hd .od{color:#fb923c;display:none}.hx.odon .hd .od{display:inline;animation:hxbl .4s steps(2) infinite}
.hx .main{display:flex;gap:10px;align-items:stretch}
.hx .col{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.hx .shl{position:relative;height:6px;background:rgba(76,201,240,.12);clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)}
.hx .shl b,.hx .cell b{position:absolute;left:0;top:0;bottom:0;width:0}
.hx .shl .g{background:#fff;transition:width .5s ease .25s;opacity:.75}
.hx .shl .f{background:linear-gradient(90deg,#0ea5e9,var(--hs));box-shadow:0 0 10px var(--hs)}
.hx.shoff .shl{background:repeating-linear-gradient(-45deg,rgba(76,201,240,.18) 0 4px,transparent 4px 8px)}
.hx .cells{display:flex;gap:4px;height:20px}
.hx .cell{position:relative;flex:1;background:rgba(255,90,106,.1);border:1px solid rgba(255,90,106,.28);clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%);overflow:hidden}
.hx .cell .g{background:#fff;transition:width .55s ease .2s}
.hx .cell .f{background:linear-gradient(180deg,#ff8a95,var(--hh) 55%,#b91c3c);box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}
.hx .cell.gone{border-color:rgba(255,90,106,.12)}
.hx .rd{display:flex;justify-content:space-between;align-items:baseline;font:700 9px var(--mono);letter-spacing:.14em;color:#8ea4c4}
.hx .rd .hv{font:900 18px/1 var(--mono);color:#fff;letter-spacing:.02em}.hx .rd .hv small{font-size:10px;color:#8ea4c4;margin-left:2px}
.hx .rd .hl{color:#fff;background:rgba(255,90,106,.22);border:1px solid rgba(255,90,106,.5);padding:2px 7px;font:900 9px var(--mono);letter-spacing:.16em;white-space:nowrap}.hx.crit .rd .hl{background:#ef4444;animation:hxbl .4s steps(2) infinite}
.hx .srow{font:800 8px var(--mono);letter-spacing:.2em;color:var(--hs);margin-bottom:-2px}.hx.shoff .srow{color:#64748b}
.hx .pl{display:flex;align-items:center;gap:6px;font:700 9px var(--mono);color:#8ea4c4;letter-spacing:.12em}
.hx .pl .tk{flex:1;height:5px;background:rgba(45,212,191,.12);position:relative}
.hx .pl .tk b{position:absolute;left:0;top:0;bottom:0;background:var(--hp);width:0}
.hx .pl .tk:after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 9px,rgba(4,10,22,.9) 9px 11px)}
.hx.amlo .pl{color:#f87171}.hx.amlo .pl .tk b{background:#f87171}
.hx .dials{display:flex;gap:8px;align-items:center}
.hx .dl{position:relative;width:48px;height:48px;border-radius:50%;background:conic-gradient(var(--dc) var(--p,0deg),rgba(255,255,255,.08) 0);display:grid;place-items:center}
.hx .dl:before{content:'';position:absolute;inset:4px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#13233f,#050b18)}
.hx .dl span{position:relative;font:900 9px/1.05 var(--mono);text-align:center;color:#cbd5e1;letter-spacing:.06em}
.hx .dl em{position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);font:900 8px var(--mono);font-style:normal;padding:0 4px;background:#04101f;color:var(--dc);border:1px solid var(--dc);border-radius:3px;white-space:nowrap}
.hx .dl.rdy{box-shadow:0 0 14px var(--dc),0 0 0 2px var(--dc)}.hx .dl.rdy span{color:#fff}
.hx .dl.rdy:after{content:'';position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--dc);animation:hxring 1.2s ease-out infinite}
@keyframes hxring{from{opacity:.9;transform:scale(.85)}to{opacity:0;transform:scale(1.25)}}
@keyframes hxbl{50%{opacity:.2}}
@keyframes hxhit{0%{transform:translate(0,0)}20%{transform:translate(-5px,2px)}40%{transform:translate(4px,-2px)}60%{transform:translate(-3px,1px)}80%{transform:translate(2px,0)}}
.hx.hit .fr{animation:hxhit .3s linear}
.hx.crit .fr{border-color:#ef4444;background:linear-gradient(100deg,rgba(60,6,12,.9),rgba(30,6,12,.78))}
.hx.crit .cell{animation:hxbl .5s steps(2) infinite}
.hx.down .fr{filter:grayscale(1) brightness(.6)}
.hx.dn .main{opacity:.35}
#hud.p4 .hx{width:min(250px,28vw)}#hud.p4 .hx .dials{display:none}
/* top strip */
#top{position:absolute;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;width:min(560px,52vw);min-width:240px;transition:opacity .25s}
#top.dim{opacity:.3}
#top .strip{display:flex;align-items:stretch;width:100%;background:linear-gradient(180deg,rgba(4,10,22,.86),rgba(8,20,40,.7));clip-path:polygon(0 0,100% 0,calc(100% - 18px) 100%,18px 100%);filter:drop-shadow(0 6px 12px rgba(0,0,0,.5))}
#top .strip>div{padding:6px 12px;display:flex;flex-direction:column;justify-content:center}
#top .ob{flex:1;padding-left:26px!important;font:800 10px var(--mono);letter-spacing:.16em;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:0;background:none;box-shadow:none;border-radius:0}
#top .pips{display:flex;gap:3px;margin-top:4px}#top .pips i{width:14px;height:4px;background:rgba(148,163,184,.25);transform:skewX(-25deg)}#top .pips i.on{background:var(--acc)}#top .pips i.cur{background:#fff;animation:hxbl .8s steps(2) infinite}
#top .scb{align-items:flex-end;padding-right:26px!important;border-left:1px solid rgba(56,189,248,.2)}
#top .scb .s1{font:900 17px/1 var(--mono);color:#fff;letter-spacing:.04em}
#top .scb .s2{font:700 9px var(--mono);letter-spacing:.14em;color:var(--gold,#fbbf24);margin-top:3px}
#top .sc{display:none}
#hcmb{position:absolute;right:calc(18px + env(safe-area-inset-right));top:calc(70px + env(safe-area-inset-top));text-align:right;pointer-events:none;opacity:0;transition:opacity .2s}
#hcmb.on{opacity:1}
#hcmb .x{font:900 34px/1 var(--mono);color:#fde047;text-shadow:0 0 16px rgba(250,204,21,.6),0 3px 0 #713f12;transform:skewX(-8deg)}
#hcmb .l{font:800 9px var(--mono);letter-spacing:.3em;color:#fef3c7}
#hcmb .t{height:3px;width:110px;margin:4px 0 0 auto;background:rgba(253,224,71,.2)}#hcmb .t b{display:block;height:100%;background:#fde047;width:0}
#hcmb .gz{font:800 9px var(--mono);letter-spacing:.2em;color:#a5f3fc;margin-top:5px}
#hud.tch #hcmb{top:calc(62px + env(safe-area-inset-top));right:auto;left:50%;transform:translateX(-50%);text-align:center}#hud.tch #hcmb .x{font-size:24px}#hud.tch #hcmb .t{margin:4px auto 0}
#boss{display:none;width:100%}#boss.on{display:block}
#boss .bn{display:flex;justify-content:space-between;font:900 10px var(--mono);letter-spacing:.22em;color:#fecdd3;text-align:left;margin-bottom:3px;text-shadow:0 2px 0 #000}
#boss .bar{height:12px;--c:#f43f5e;border-radius:0;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);position:relative}
#boss .bar:after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),rgba(4,10,22,.85) calc(10% - 1px) 10%)}
#stn .bar{border-radius:0}
body.lb #hud .hx,body.lb #top,body.lb #hcmb{opacity:0!important;transition:opacity .4s}
`;
  const st = document.createElement('style'); st.id = 'hxcss'; st.textContent = css; document.head.appendChild(st);
  // rebuild the top strip, keeping the ids the rest of the game uses
  const top = document.getElementById('top');
  if (top) {
    const keep = id => document.getElementById(id);
    const stn = keep('stn'), boss = keep('boss');
    top.innerHTML = '<div class="strip"><div class="ob"><span id="obj">-</span><div class="pips" id="hpips"></div></div><div class="scb"><span class="s1" id="score">0</span><span class="s2"><span id="cores">0</span> CORES</span></div></div><div class="sc"><span id="combo"></span><span id="graze"></span></div>';
    if (stn) top.appendChild(stn); if (boss) top.appendChild(boss);
    const c = document.createElement('div'); c.id = 'hcmb'; c.innerHTML = '<div class="x" id="hcx"></div><div class="l">COMBO</div><div class="t"><b id="hct"></b></div><div class="gz" id="hcg"></div>';
    document.getElementById('hud').appendChild(c);
  }
})();

const HX_COL = ['#22d3ee', '#fb923c', '#a3e635', '#e879f9'];
hudPanel = function (p) {
  const k = KB[p.id] || KB[0], ak = !G.net && p.id < 2 && !touchOn() ? keyLabel(k.a[0]) : '', vk = !G.net && p.id < 2 && !touchOn() ? keyLabel(k.v[0]) : '';
  const ab = abilOf(p).nm.toUpperCase().split(' ');
  return '<div class="fr" style="--pc:' + HX_COL[p.id & 3] + '"><div class="hd"><span class="id">P' + (p.id + 1) + '</span><span class="wp" id="hw' + p.id + '"></span><span class="od">OVERDRIVE</span></div>'
    + '<div class="main"><div class="col">'
    + '<div class="srow"><span class="sv" id="ts' + p.id + '"></span></div><div class="shl" data-k="sh"><b class="g" id="hsg' + p.id + '"></b><b class="f" id="hsf' + p.id + '"></b></div>'
    + '<div class="cells" data-k="hull" id="hc' + p.id + '"></div>'
    + '<div class="rd"><span><span class="hv" id="th' + p.id + '">0</span><small>HULL</small></span><span class="hl" id="hhl' + p.id + '"></span></div>'
    + '<div class="pl" data-k="am"><span>PLASMA</span><div class="tk"><b id="hpa' + p.id + '"></b></div><span id="ta' + p.id + '"></span></div>'
    + '</div><div class="dials">'
    + '<div class="dl" data-k="ab" id="hda' + p.id + '" style="--dc:var(--ha)"><span id="tb' + p.id + '">' + ab.slice(0, 2).join('<br>') + '</span>' + (ak ? '<em>' + ak + '</em>' : '') + '</div>'
    + '<div class="dl" data-k="sup" id="hdu' + p.id + '" style="--dc:var(--hu)"><span id="tu' + p.id + '">SUPER</span>' + (vk ? '<em>' + vk + '</em>' : '') + '</div>'
    + '</div></div></div>';
};
buildHud = function () {
  const h = $('hud'); h.classList.add('on'); h.classList.toggle('coop', G.players.length > 1); h.classList.toggle('p4', G.players.length > 2); h.classList.toggle('tch', touchOn());
  for (let i = 0; i < 4; i++) { const e = $('hp' + i); if (!e) continue; e.className = 'hx ' + ['l', 'r', 'l l2', 'r r2'][i]; if (i > 1) { e.innerHTML = ''; e.style.display = 'none'; } }
  G.players.forEach((p, i) => { const e = $('hp' + i); if (e) { e.innerHTML = hudPanel(p); if (i > 1) e.style.display = 'block'; } p._hc = {}; });
  $('boss').classList.remove('on'); $('stn').style.display = G.run && G.run.stn ? 'block' : 'none';
};
const hxW = (id, f) => { const e = $(id); if (e) e.style.width = (clamp(f, 0, 1) * 100).toFixed(1) + '%'; };
function hxCells(p) { const c = $('hc' + p.id); if (!c) return; const n = clamp(Math.round(p.mhp / Math.max(1, p.mhp / 3)), 1, 8); if (c._n !== n) { c._n = n; c.innerHTML = Array.from({ length: n }, () => '<div class="cell"><b class="g"></b><b class="f"></b></div>').join(''); } const per = p.mhp / n, cs = c.children; for (let k = 0; k < n; k++) { const f = clamp((p.hp - k * per) / per, 0, 1), cl = cs[k]; cl.children[1].style.width = (f * 100).toFixed(1) + '%'; cl.children[0].style.width = (f * 100).toFixed(1) + '%'; cl.classList.toggle('gone', f <= 0); } }
const HXR = new Map(); let hxRT = 0; function hxRect(el) { const now = performance.now(); if (now - hxRT > 500) { HXR.clear(); hxRT = now; } let r = HXR.get(el); if (!r) { r = el.getBoundingClientRect(); HXR.set(el, r); } return r; }
// map a game position to the screen, to fade panels the ship flies under
function hxScr(x, y) { const cv = document.getElementById('cvFx') || document.getElementById('cvBg'); const r = hxRect(cv); return [r.left + x / V.W * r.width, r.top + y / V.H * r.height]; }
hudTick = function () {
  const R = G.run; if (!R) return;
  const pos = G.players.filter(p => p.alive).map(p => hxScr(p.x, p.y));
  const near = el => { if (!el || !el.offsetParent && el.id !== 'top') return false; const r = hxRect(el); return pos.some(([x, y]) => x > r.left - 30 && x < r.right + 30 && y > r.top - 30 && y < r.bottom + 30); };
  for (const p of G.players) {
    const c = p._hc, i = p.id, el = $('hp' + i); if (!el) continue;
    const hv = Math.round(p.hp), sv = Math.round(p.sh), av = Math.round(p.am), lv = wlvOf(p.pl, p.wpn), ev = wevOf(p.pl, p.wpn), wk = p.wpn + lv + (ev ? 'E' : '') + (p.alive ? '' : 'x');
    if (c.h !== hv || c.mh !== p.mhp) { if (c.h !== undefined && hv < c.h) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } c.h = hv; c.mh = p.mhp; hxCells(p); $('th' + i).innerHTML = Math.max(0, hv) + '<small>/' + Math.round(p.mhp) + '</small>'; }
    const hl = p.alive ? hitsLeft(p) : 0; if (c.hl !== hl) { c.hl = hl; $('hhl' + i).textContent = p.alive ? (hl <= 1 ? 'LAST HIT!' : hl + ' HITS LEFT') : 'DOWN'; el.classList.toggle('crit', p.alive && hl <= 1); }
    if (c.s !== sv || c.ms !== p.msh) { c.s = sv; c.ms = p.msh; const f = p.msh ? p.sh / p.msh : 0; hxW('hsf' + i, f); hxW('hsg' + i, f); $('ts' + i).textContent = sv > 0 ? 'SHIELD ' + sv + '/' + Math.round(p.msh) : 'SHIELD OFFLINE'; el.classList.toggle('shoff', sv <= 0); }
    if (c.a !== av) { c.a = av; hxW('hpa' + i, p.am / p.mam); const aux = p.am < WPN[p.wpn].am; $('ta' + i).textContent = aux ? 'EMPTY' : av; el.classList.toggle('amlo', aux || p.am < p.mam * .2); }
    if (c.w !== wk) { c.w = wk; $('hw' + i).innerHTML = p.alive ? wName(p.pl, p.wpn).toUpperCase() + (ev ? '<i>EVO</i>' : lv ? '<i>LV' + (lv + 1) + '</i>' : '') : 'SHIP DOWN'; el.classList.toggle('down', !p.alive); }
    const od = p.od > 0; if (c.od !== od) { c.od = od; el.classList.toggle('odon', od); }
    const abv = p.abCd > 0 ? Math.ceil(p.abCd / 60) : 0, af = p.abMax ? 1 - p.abCd / p.abMax : 1, ak = Math.round(af * 60) + '/' + abv + (p.alive ? '' : 'x');
    if (c.b !== ak) { c.b = ak; const d = $('hda' + i), tb = $('tb' + i); if (d) { d.style.setProperty('--p', (p.alive ? af * 360 : 0).toFixed(0) + 'deg'); d.classList.toggle('rdy', p.alive && !abv); } if (tb) tb.innerHTML = !p.alive ? '-' : abv ? abv + 's' : abilOf(p).nm.toUpperCase().split(' ').slice(0, 2).join('<br>'); }
    const su = p.alive ? Math.floor(p.supT > 0 ? 0 : p.sup || 0) : -1; if (c.u !== su) { c.u = su; const d = $('hdu' + i), tu = $('tu' + i); if (d) { d.style.setProperty('--p', (Math.max(0, su) * 3.6).toFixed(0) + 'deg'); d.classList.toggle('rdy', su >= 100); } if (tu) tu.innerHTML = su < 0 ? '-' : su >= 100 ? 'SUPER<br>READY' : su + '%'; }
    const dm = near(el); if (c.dm !== dm) { c.dm = dm; el.classList.toggle('dim', dm); }
  }
  { const ts = $('tsup'), p0 = G.players[0]; if (ts && p0) ts.classList.toggle('rdy', p0.alive && p0.sup >= 100); }
  const sc = fmt(Math.round(R.score)); if (R._sc !== sc) { R._sc = sc; $('score').textContent = sc; }
  const cr = fmt(SAVE.cores); if (R._cr !== cr) { R._cr = cr; $('cores').textContent = cr; }
  // combo: big multiplier on the right with a decay line
  const cm = $('hcmb'); if (cm) { const on = R.combo > 1; if (cm._on !== on) { cm._on = on; cm.classList.toggle('on', on); } if (on) { const x = 'x' + (1 + Math.min(R.combo, 20) * .1).toFixed(1); if (cm._x !== x) { cm._x = x; $('hcx').textContent = x; } hxW('hct', (R.comboT || 0) / 150); } const gz = R.graze ? 'GRAZE ' + R.graze : ''; if (cm._g !== gz) { cm._g = gz; $('hcg').textContent = gz; } }
  // objective + wave pips
  let ob = objText(R); const wm = / - WAVE (\d+)\/(\d+)$/.exec(ob); let pk = '';
  if (wm && +wm[2] <= 14) { ob = ob.slice(0, wm.index); const cur = +wm[1], n = +wm[2]; pk = cur + '/' + n; }
  if (R._ob !== ob) { R._ob = ob; $('obj').textContent = ob; }
  if (R._pk !== pk) { R._pk = pk; const pe = $('hpips'); if (pe) { if (!pk) pe.innerHTML = ''; else { const [cur, n] = pk.split('/').map(Number); pe.innerHTML = Array.from({ length: n }, (_, k) => '<i class="' + (k < cur - 1 ? 'on' : k === cur - 1 ? 'cur' : '') + '"></i>').join(''); } } }
  if (R.stn) { const sn = R.stn, k = Math.round(sn.hp) + ':' + Math.round(sn.sh); if (R._sk !== k) { R._sk = k; $('stnH').style.width = sn.hp / sn.mhp * 100 + '%'; $('stnS').style.width = sn.sh / sn.msh * 100 + '%'; $('stnT').textContent = 'STATION ' + Math.round(sn.hp / sn.mhp * 100) + '%'; } }
  const tbt = $('tab'), p0 = G.players[0]; if (tbt && p0) { const f = p0.abMax ? 1 - p0.abCd / p0.abMax : 1, k = (p0.alive ? Math.round(f * 36) : 0) + (p0.abCd > 0 ? '' : 'r'); if (tbt._k !== k) { tbt._k = k; tbt.style.setProperty('--cd', (360 - Math.round(f * 360)) + 'deg'); tbt.classList.toggle('rdy', p0.alive && p0.abCd <= 0); } }
  const b = R.boss; if (b && !b.dead) { const pd = b.pods ? podOf(b) : null; $('boss').classList.add('on'); const nm = BOSSES[b.bi].nm.toUpperCase() + (b.stg > 0 ? ' - EXPOSED!' : pd ? ' - ARMORED' : ''), pc = Math.ceil(clamp(b.hp / b.mhp, 0, 1) * 100) + '%', bk = nm + pc; const bn = $('bossN'); if (bn._k !== bk) { bn._k = bk; bn.innerHTML = '<span>' + nm + '</span><span>' + pc + '</span>'; } $('bossF').style.width = clamp(b.hp / b.mhp, 0, 1) * 100 + '%'; const sp = pd && b.st === 1; $('bossPb').style.display = sp ? 'block' : 'none'; if (sp) $('bossP').style.width = clamp(pd.hp / pd.mhp, 0, 1) * 100 + '%'; } else $('boss').classList.remove('on');
  const tp = $('top'); if (tp) { const r = hxRect(tp), dm = pos.some(([x, y]) => x > r.left - 30 && x < r.right + 30 && y < r.bottom + 30); if (tp._dm !== dm) { tp._dm = dm; tp.classList.toggle('dim', dm); } }
};
