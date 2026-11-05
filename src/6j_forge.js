// ================= THE FORGE (hybrid weapon crafting) and REPLAY THEATER (clips) =================
// A hybrid fires its base gun's pattern, with the second gun's trait fused into every shot.
const HTRAIT = {
  twin: { adj: 'Twin', ds: 'every shot gets a twin', rk: 1, dk: .85 },
  spread: { adj: 'Scatter', ds: 'every shot splits into a fan', rk: 1, dk: .9 },
  lancer: { adj: 'Piercing', ds: 'shots pierce 3 enemies', rk: 1, dk: 1.1 },
  ion: { adj: 'Rapid', ds: 'fires 35% faster, a little weaker', rk: 1.35, dk: .8 },
  missile: { adj: 'Seeking', ds: 'shots home in and explode', rk: 1, dk: 1 },
  orb: { adj: 'Plasma', ds: 'bigger shots that crush bullets', rk: .85, dk: 1.15 },
  arc: { adj: 'Arcing', ds: 'shots chain lightning to 2 more enemies', rk: 1, dk: 1 },
  rail: { adj: 'Hypersonic', ds: 'much faster shots that pierce everything', rk: .8, dk: 1.2 }
};
const hyId = (a, b) => 'hy_' + a + '_' + b;
const mixC = (a, b) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v * .55 + y[i] * .45).toString(16).padStart(2, '0')).join(''); };
function hyDef(a, b) { const A = WPN[a], B = WPN[b], T = HTRAIT[b]; return { nm: T.adj + ' ' + A.nm, ds: A.nm + ' whose ' + T.ds + '.', d: A.d * T.dk, r: A.r / T.rk, s: A.s, am: A.am, price: -1, c: mixC(A.c, B.c), hy: [a, b] }; }
function hyReg() { const H = SAVE.hyb || (SAVE.hyb = []); H.forEach(id => { const m = /^hy_(\w+?)_(\w+)$/.exec(id); if (m && WPN[m[1]] && HTRAIT[m[2]] && !WPN[id]) WPN[id] = hyDef(m[1], m[2]); }); }
const hyCost = (a, b) => Math.round(1500 + (WPN[a].price + WPN[b].price) * .5);
let HYB = null;
const _pbH = pb;
pb = function (p, x, y, vx, vy, k, o) {
  if (!HYB || HYB.p !== p) return _pbH.apply(this, arguments);
  const t = HYB.b; o = Object.assign({}, o); if (o.d) o.d *= HTRAIT[t].dk; o.c = HYB.c;
  if (t === 'lancer' && (o.pierce | 0) < 3) o.pierce = 3;
  if (t === 'missile') { o.home = 1; o.blast = Math.max(o.blast | 0, 46); o.l = Math.max(o.l || 100, 130); }
  if (t === 'orb') { o.r = (o.r || 4) * 1.6; o.crush = 1; }
  if (t === 'arc') o.chain = (o.chain | 0) + 2;
  if (t === 'rail') { vx *= 1.6; vy *= 1.6; o.pierce = 99; }
  _pbH.call(this, p, x, y, vx, vy, k, o);
  if (t === 'twin') _pbH.call(this, p, x, y + 7, vx, vy, k, Object.assign({}, o, { d: o.d * .6 }));
  if (t === 'spread') { const sp = Math.hypot(vx, vy), a0 = Math.atan2(vy, vx); [-.16, .16].forEach(da => _pbH.call(this, p, x, y, Math.cos(a0 + da) * sp, Math.sin(a0 + da) * sp, k, Object.assign({}, o, { d: o.d * .5, l: 60 }))); }
};
const _fireH = fireP;
fireP = function (p) {
  const W = WPN[p.wpn]; if (!W || !W.hy) return _fireH.apply(this, arguments);
  const id = p.wpn, [a, b] = W.hy; p.wpn = a; HYB = { p, b, c: W.c };
  try { _fireH.call(this, p); } finally { HYB = null; p.wpn = id; } if (p.fcd > 0) p.fcd /= HTRAIT[b].rk;
};
const hyOrder = () => WORDER.concat((SAVE.hyb || []).filter(id => WPN[id]));
cycleWeapon = function (p, dir) { const own = hyOrder().filter(w => p.pl.wown.indexOf(w) >= 0); if (own.length < 2) { alertMsg('ONLY ONE WEAPON OWNED'); return; } setWeapon(p, own[(own.indexOf(p.wpn) + dir + own.length) % own.length]); };
hyReg();

// ---------- replay theater: the game keeps a rolling recording and saves clips on demand ----------
const CLIP = { on: false, cv: null, g: null, recs: [], t0: 0, db: null, list: null, busy: false };
const clipOk = () => typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream;
function clipDb() { if (CLIP.db) return CLIP.db; CLIP.db = new Promise((res, rej) => { try { const r = indexedDB.open('aetheria_clips', 1); r.onupgradeneeded = () => r.result.createObjectStore('clips', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); return CLIP.db; }
async function clipAll() { try { const db = await clipDb(); return await new Promise((res, rej) => { const q = db.transaction('clips').objectStore('clips').getAll(); q.onsuccess = () => res((q.result || []).sort((a, z) => z.at - a.at)); q.onerror = () => rej(q.error); }); } catch (e) { return []; } }
async function clipPut(c) { const db = await clipDb(); return new Promise((res, rej) => { const tx = db.transaction('clips', 'readwrite'); tx.objectStore('clips').put(c); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
async function clipDel(id) { const db = await clipDb(); return new Promise(res => { const tx = db.transaction('clips', 'readwrite'); tx.objectStore('clips').delete(id); tx.oncomplete = res; }); }
function clipStartRec() { // two staggered 24-second recorders, so a clip always holds the last 12-24 seconds
  if (!CLIP.cv) { CLIP.cv = document.createElement('canvas'); CLIP.cv.width = 854; CLIP.cv.height = 480; CLIP.g = CLIP.cv.getContext('2d'); CLIP.stream = CLIP.cv.captureStream(30); }
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  const mk = () => { const r = { chunks: [], t: performance.now() }; try { r.mr = new MediaRecorder(CLIP.stream, mime ? { mimeType: mime, videoBitsPerSecond: 2500000 } : undefined); } catch (e) { return null; } r.mr.ondataavailable = e => { if (e.data && e.data.size) r.chunks.push(e.data); }; r.mr.start(1000); return r; };
  CLIP.mk = mk; CLIP.recs = [mk()].filter(Boolean); CLIP.on = CLIP.recs.length > 0; CLIP.t0 = performance.now();
}
function clipStopAll() { CLIP.recs.forEach(r => { try { r.mr.state !== 'inactive' && r.mr.stop(); } catch (e) { } }); CLIP.recs = []; CLIP.on = false; }
function clipFrame() { // copy this frame's layers into the recorder canvas
  if (!CLIP.on) return; const g = CLIP.g, W = CLIP.cv.width, H = CLIP.cv.height;
  try { g.drawImage($('cvBg'), 0, 0, W, H); if (R3 && R3.on && R3.__renderer) g.drawImage(R3.__renderer.domElement, 0, 0, W, H); g.drawImage($('cvFx'), 0, 0, W, H); } catch (e) { }
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(W - 168, H - 30, 160, 22); g.fillStyle = '#e2e8f0'; g.font = '700 12px system-ui,sans-serif'; g.textAlign = 'right'; g.fillText('AETHERIA  ' + (G.run ? fmt(Math.round(G.run.score)) : ''), W - 14, H - 14);
  const now = performance.now(); CLIP.recs = CLIP.recs.filter(r => { if (now - r.t > 24000) { try { r.mr.stop(); } catch (e) { } return false; } return true; });
  if (CLIP.recs.length < 2 && (!CLIP.recs.length || now - CLIP.recs[CLIP.recs.length - 1].t > 12000)) { const r = CLIP.mk(); if (r) CLIP.recs.push(r); }
}
function clipSave(title, auto) {
  if (!CLIP.on || CLIP.busy) { if (!auto) alertMsg(clipOk() ? 'NOTHING TO CLIP YET' : 'CLIPS ARE NOT SUPPORTED IN THIS BROWSER'); return; }
  const r = CLIP.recs[0]; if (!r || performance.now() - r.t < 2500) { if (!auto) alertMsg('NOTHING TO CLIP YET'); return; }
  CLIP.busy = true; CLIP.recs.shift(); const thumb = CLIP.cv.toDataURL('image/jpeg', .6), secs = Math.round((performance.now() - r.t) / 1000), R = G.run;
  const meta = { id: 'c' + Date.now(), at: Date.now(), title: title || (R && R.spec ? R.spec.name : 'Clip'), w: R ? R.w : 0, score: R ? Math.round(R.score) : 0, secs, thumb };
  r.mr.onstop = () => { const blob = new Blob(r.chunks, { type: r.chunks[0] ? r.chunks[0].type : 'video/webm' }); meta.blob = blob; meta.size = blob.size; clipPut(meta).then(() => { CLIP.list = null; if (!auto) alertMsg('CLIP SAVED - ' + secs + 's'); else toast('CLIP SAVED', meta.title + ' - watch it in Replay Theater', '#22d3ee'); }).catch(() => alertMsg('COULD NOT SAVE CLIP')).finally(() => { CLIP.busy = false; }); };
  try { r.mr.stop(); } catch (e) { CLIP.busy = false; } if (CLIP.recs.length < 2) { const n = CLIP.mk(); if (n) CLIP.recs.push(n); }
}
const _renderC = render;
render = function () { const r = _renderC.apply(this, arguments); if (G.scene === 'play' && SET.clips !== false && clipOk() && !G.paused) { if (!CLIP.on) clipStartRec(); if (G.t % 2 === 0) clipFrame(); } else if (CLIP.on && G.scene !== 'play') clipStopAll(); return r; };
const _killBossC = killBoss;
killBoss = function (e) { const r = _killBossC.apply(this, arguments); try { if (SET.autoclip !== false && CLIP.on && !G.net) setTimeout(() => clipSave((BOSSES[e.bi] ? BOSSES[e.bi].nm : 'Boss') + ' down', true), 1500); } catch (x) { } return r; };
addEventListener('keydown', e => { if ((e.code === 'F8' || e.code === 'KeyK') && !e.repeat && G.scene === 'play' && !G.cut) clipSave(); });
SET_DEF.clips = !IS_TOUCH; SET_DEF.autoclip = true; if (SET.clips === undefined) SET.clips = SET_DEF.clips; if (SET.autoclip === undefined) SET.autoclip = true;
SETS.GRAPHICS.push(['clips', 'tog', 'Replay recording', 'Keeps the last 12-24 seconds so you can save clips (K or F8)'], ['autoclip', 'tog', 'Auto-clip boss kills', 'Saves a clip every time you beat a boss']);

// ---------- screens ----------
const FV = { a: 'twin', b: 'missile' };
function forgeHtml() {
  hyReg(); const pl = SAVE.pl[0], own = WORDER.filter(w => pl.wown.indexOf(w) >= 0), id = hyId(FV.a, FV.b), has = (SAVE.hyb || []).indexOf(id) >= 0, same = FV.a === FV.b, d = same ? null : hyDef(FV.a, FV.b), c = same ? 0 : hyCost(FV.a, FV.b), okA = own.indexOf(FV.a) >= 0, okB = own.indexOf(FV.b) >= 0;
  const pick = (k, cur) => '<div class="fg-row">' + WORDER.map(w => '<button class="fg-w' + (w === cur ? ' on' : '') + (own.indexOf(w) < 0 ? ' lk' : '') + '" style="--wc:' + WPN[w].c + '" data-act="fgp:' + k + ':' + w + '" title="' + WPN[w].nm + '"><i></i>' + WPN[w].nm.split(' ').pop() + '</button>').join('') + '</div>';
  const mine = (SAVE.hyb || []).filter(x => WPN[x]);
  return '<div class="xs mut b nh" style="margin-top:0">BASE GUN - ITS FIRING PATTERN</div>' + pick('a', FV.a) + '<div class="xs mut b nh">FUSE WITH - ITS TRAIT</div>' + pick('b', FV.b) +
    '<div class="fg-out" style="--wc:' + (d ? d.c : '#475569') + '">' + (same ? '<span class="mut sm">Pick two different guns.</span>' : '<i></i><div class="fl"><b>' + d.nm + '</b><div class="xs mut">' + d.ds + '</div><div class="xs">Damage ' + d.d.toFixed(1) + ' - fire delay ' + d.r.toFixed(1) + '</div></div>') + '</div>' +
    (same ? '' : has ? '<button class="btn big" style="width:100%" data-act="fgeq:' + id + '">' + (pl.wpn === id ? 'EQUIPPED' : 'EQUIP') + '</button>' : (!okA || !okB) ? '<p class="xs bad">Buy both guns in the Shop first.</p>' : '<button class="btn big gold' + (SAVE.cores < c ? ' off' : '') + '" style="width:100%" data-act="fgmake">FORGE - ' + fmt(c) + ' CORES</button>') +
    (mine.length ? '<div class="xs mut b nh">YOUR HYBRIDS (' + mine.length + ') - SWAP WITH Q / E IN A RUN</div><div class="stack" style="gap:5px">' + mine.map(x => '<div class="fg-mine" style="--wc:' + WPN[x].c + '"><i></i><span class="fl sm b">' + WPN[x].nm + '</span>' + (pl.wpn === x ? '<span class="xs good b">EQUIPPED</span>' : '<button class="btn sm" data-act="fgeq:' + x + '">EQUIP</button>') + '</div>').join('') + '</div>' : '');
}
const _scBaseF = SCR.scBase;
SCR.scBase = () => { let h = _scBaseF(); h = h.replace('<button data-act="btab:drones" class="' + (BV.tab === 'drones' ? 'on' : '') + '">DRONES</button></div>', '<button data-act="btab:drones" class="' + (BV.tab === 'drones' ? 'on' : '') + '">DRONES</button><button data-act="btab:forge" class="' + (BV.tab === 'forge' ? 'on' : '') + '">FORGE</button></div>');
  if (BV.tab === 'forge') { const a = h.indexOf('</div>', h.indexOf('data-act="btab:forge"')) + 6, b = h.indexOf('</aside>'); h = h.slice(0, a) + forgeHtml() + h.slice(b); } return h; };
SCR.scTheater = () => {
  if (!CLIP.list) { CLIP.list = []; clipAll().then(L => { CLIP.list = L; if (UI.top === 'scTheater') UI.refresh(); }); }
  const L = CLIP.list, sel = L.find(c => c.id === UI.clipSel) || L[0];
  if (sel && (!CLIP.url || CLIP.urlId !== sel.id) && sel.blob) { if (CLIP.url) URL.revokeObjectURL(CLIP.url); CLIP.url = URL.createObjectURL(sel.blob); CLIP.urlId = sel.id; }
  const dt = t => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return '<div class="lay lay-modes th"><header class="lay-h"><h1 class="lay-t">Replay Theater</h1><span class="xs mut">' + (clipOk() ? 'In a run, press K or F8 to clip the last 12-24 seconds' + (IS_TOUCH ? ' (turn on Replay recording in Settings > Graphics)' : '') + '. Boss kills clip themselves.' : 'Clips need a browser that can record video (Chrome, Edge or Firefox).') + '</span></header>' +
    '<div class="sm-cols"><nav class="sm-list th-list">' + (L.length ? L.map(c => '<button class="th-it' + (sel && c.id === sel.id ? ' on' : '') + '" data-act="thsel:' + c.id + '"><img src="' + c.thumb + '" alt=""><span><b>' + escH(c.title) + '</b><small>' + dt(c.at) + ' - ' + c.secs + 's' + (c.score ? ' - ' + fmt(c.score) : '') + '</small></span></button>').join('') : '<p class="mut sm" style="padding:10px">No clips yet. Go make some highlights!</p>') + '</nav>' +
    '<section class="sm-brief th-view">' + (sel ? '<video id="thVid" src="' + (CLIP.url || '') + '" controls autoplay loop playsinline poster="' + sel.thumb + '"></video><div class="row sp wrap" style="gap:8px;margin-top:10px"><div><b>' + escH(sel.title) + '</b><div class="xs mut">' + dt(sel.at) + ' - ' + sel.secs + ' seconds - ' + (sel.size / 1048576).toFixed(1) + ' MB</div></div><span class="row" style="gap:6px"><button class="btn sm" data-act="thslow">SLOW-MO</button><button class="btn sm gold" data-act="thdl">DOWNLOAD</button><button class="btn sm warn" data-act="thdel">DELETE</button></span></div>' : '<p class="mut">Your saved clips play here.</p>') + '</section></div>' +
    '<footer class="lay-f"><button class="btn sm" data-act="back">Back</button><span class="xs mut">' + L.length + ' clip' + (L.length === 1 ? '' : 's') + ' saved in this browser</span></footer></div>';
};
Object.assign(ACT, {
  fgp(a) { FV[a[0]] = a[1]; UI.refresh(); },
  fgmake() { const a = FV.a, b = FV.b, id = hyId(a, b), c = hyCost(a, b), pl = SAVE.pl[0]; if (a === b || pl.wown.indexOf(a) < 0 || pl.wown.indexOf(b) < 0 || SAVE.cores < c || (SAVE.hyb || []).indexOf(id) >= 0) { SFX.no(); return; } SAVE.cores -= c; (SAVE.hyb = SAVE.hyb || []).push(id); hyReg(); SAVE.pl.forEach(p => { if (p.wown.indexOf(id) < 0) p.wown.push(id); }); pl.wpn = id; saveGame(); toast('HYBRID FORGED', WPN[id].nm, WPN[id].c); UI.refresh(); },
  fgeq(a) { const pl = SAVE.pl[0]; if (WPN[a[0]]) { if (pl.wown.indexOf(a[0]) < 0) pl.wown.push(a[0]); pl.wpn = a[0]; saveGame(); UI.refresh(); } },
  theater() { CLIP.list = null; UI.show('scTheater'); },
  thsel(a) { UI.clipSel = a[0]; UI.refresh(); },
  thslow() { const v = document.getElementById('thVid'); if (v) v.playbackRate = v.playbackRate < 1 ? 1 : .35; },
  thdel() { const c = (CLIP.list || []).find(x => x.id === UI.clipSel) || (CLIP.list || [])[0]; if (!c) return; clipDel(c.id).then(() => { CLIP.list = null; UI.clipSel = null; UI.refresh(); }); },
  thdl() { const c = (CLIP.list || []).find(x => x.id === UI.clipSel) || (CLIP.list || [])[0]; if (!c || !c.blob) return; const name = 'aetheria-' + c.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.webm';
    if (DLNS) DLNS.save({ filename: name, data: c.blob }).then(() => alertMsg('SAVED')).catch(() => { }); else { const a = document.createElement('a'); a.href = CLIP.url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); } }
});
MI.theater = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z"/></svg>';
