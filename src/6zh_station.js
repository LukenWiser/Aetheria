// ================= V74: the Station, rebuilt =================
// A lit, living station: nebula sky, a planet with an atmosphere, a two-deck rotating ring,
// modules you can see working (ore streams, turrets, a lab dish, orbiting drones, a shield bubble),
// shuttles coming and going - and a cleaner side panel with a card for every module.
const BICON = {
  refinery: '<path d="M4 20h16M6 20V10l6-6 6 6v10"/><path d="M10 20v-5h4v5"/><path d="M12 4v-2"/>',
  armory: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/>',
  lab: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3"/><path d="M7.5 15h9"/>',
  shield: '<circle cx="12" cy="12" r="9"/><path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18M3 12h18"/>',
  turret: '<circle cx="9" cy="14" r="5"/><path d="M12 11l8-6M9 14h0"/><path d="M4 21h10"/>',
  dronebay: '<rect x="8" y="9" width="8" height="6" rx="2"/><path d="M4 7l4 2M20 7l-4 2M4 17l4-2M20 17l-4-2"/><circle cx="3" cy="6" r="1.5"/><circle cx="21" cy="6" r="1.5"/><circle cx="3" cy="18" r="1.5"/><circle cx="21" cy="18" r="1.5"/>'
};
const bIco = (k, c) => '<svg viewBox="0 0 24 24" fill="none" stroke="' + (c || 'currentColor') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (BICON[k] || '') + '</svg>';
const BX = { sky: null, skyW: 0, skyH: 0, ships: [], ore: [] };
function bSky(W, H, dpr) {
  if (BX.sky && BX.skyW === W && BX.skyH === H) return BX.sky; const c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr; const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#060b1f'); bg.addColorStop(.55, '#0a0f2a'); bg.addColorStop(1, '#14082a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const rs = seeded(91), neb = (x, y, r, col, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) neb(rs() * W, rs() * H * .8, (.2 + rs() * .35) * Math.max(W, H), ['rgba(56,189,248,A)', 'rgba(168,85,247,A)', 'rgba(236,72,153,A)'][i % 3], .06 + rs() * .06);
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 420; i++) { const x = rs() * W, y = rs() * H, s = rs() < .05 ? 1.8 : rs() * 1.1 + .3; g.fillStyle = 'rgba(' + (200 + rs() * 55 | 0) + ',' + (210 + rs() * 45 | 0) + ',255,' + (.3 + rs() * .6) + ')'; g.fillRect(x, y, s, s); }
  // planet with atmosphere and a lit edge
  const px = W * .9, py = H * 1.08, pr = H * .62; const pg = g.createRadialGradient(px - pr * .45, py - pr * .55, pr * .1, px, py, pr); pg.addColorStop(0, '#5b8def'); pg.addColorStop(.45, '#2a4a9a'); pg.addColorStop(.85, '#0f1b45'); pg.addColorStop(1, '#070c22'); g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(px, py, pr, 0, TAU); g.clip(); for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(180,210,255,' + (.04 + rs() * .06) + ')'; g.lineWidth = 6 + rs() * 18; g.beginPath(); g.ellipse(px, py + (rs() - .5) * pr * 1.6, pr * 1.1, pr * (.05 + rs() * .08), -.25, 0, TAU); g.stroke(); } g.restore();
  const at = g.createRadialGradient(px, py, pr * .96, px, py, pr * 1.12); at.addColorStop(0, 'rgba(125,211,252,.55)'); at.addColorStop(1, 'rgba(125,211,252,0)'); g.fillStyle = at; g.beginPath(); g.arc(px, py, pr * 1.12, 0, TAU); g.fill();
  BX.sky = c; BX.skyW = W; BX.skyH = H; return c;
}
bDraw = function () {
  const cv = document.getElementById('bCv'); if (!cv || UI.top !== 'scBase') { BV.raf = 0; return; } BV.raf = requestAnimationFrame(bDraw); BV.t++;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return; if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); BX.sky = null; }
  const g = cv.getContext('2d'), t = BV.t, wide = W > 820, cx = W * (wide ? .36 : .5), cy = H * (wide ? .54 : .33), R = Math.min(W * (wide ? .3 : .38), H * (wide ? .36 : .27)), tilt = .38, rot = t * .0022, raid = raidOn();
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bSky(W, H, dpr), 0, 0); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  // twinkles
  for (let i = 0; i < 18; i++) { const a = .5 + .5 * Math.sin(t * .05 + i * 7.3); if (a < .8) continue; const x = (i * 197.3) % W, y = (i * 113.7) % (H * .9); g.fillStyle = 'rgba(255,255,255,' + (a - .6) + ')'; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
  const P = (a, r, h) => [cx + Math.cos(a + rot) * r, cy + Math.sin(a + rot) * r * tilt + (h || 0)];
  // shield bubble (behind)
  const shl = bLv('shield'); if (shl) { g.save(); g.globalCompositeOperation = 'lighter'; const sr = R * 1.32; const sg = g.createRadialGradient(cx, cy, sr * .7, cx, cy, sr); sg.addColorStop(0, 'rgba(56,189,248,0)'); sg.addColorStop(.85, 'rgba(56,189,248,' + (.04 + shl * .015) + ')'); sg.addColorStop(1, 'rgba(125,211,252,' + (.12 + shl * .03) * (.8 + .2 * Math.sin(t * .04)) + ')'); g.fillStyle = sg; g.beginPath(); g.ellipse(cx, cy, sr, sr * .72, 0, 0, TAU); g.fill(); g.restore(); }
  // ring helper: two decks with lit windows
  const ring = front => {
    const a0 = front ? 0 : PI, a1 = front ? PI : TAU;
    for (const [rr, w, col] of [[R * 1.0, R * .085, '#2b3a55'], [R * .9, R * .05, '#1c2740']]) { g.lineWidth = w; g.strokeStyle = col; g.beginPath(); g.ellipse(cx, cy, rr, rr * tilt, 0, a0, a1); g.stroke(); }
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(148,197,255,' + (front ? .7 : .35) + ')'; g.beginPath(); g.ellipse(cx, cy, R * 1.045, R * 1.045 * tilt, 0, a0, a1); g.stroke();
    for (let i = 0; i < 48; i++) { const a = i / 48 * TAU + rot; const s = Math.sin(a); if (front ? s < 0 : s >= 0) continue; const x = cx + Math.cos(a) * R, y = cy + s * R * tilt; const on = ((i * 7 + (t >> 4)) % 11) > 2; g.fillStyle = on ? (raid ? 'rgba(255,90,90,.9)' : 'rgba(253,230,138,' + (front ? .95 : .5) + ')') : 'rgba(30,41,59,.9)'; g.fillRect(x - 1.5, y - 1, 3, 2); }
  };
  const mods = BKEYS.map((k, i) => { const a = i / BKEYS.length * TAU; const [x, y] = P(a, R); return { k, a, x, y, z: Math.sin(a + rot) }; });
  const spoke = q => { g.strokeStyle = 'rgba(71,85,105,.9)'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(q.x, q.y); g.stroke(); g.strokeStyle = 'rgba(125,211,252,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy - 2); g.lineTo(q.x, q.y - 2); g.stroke(); };
  BV.hit = [];
  const module = q => {
    const k = q.k, M = BMOD[k], lv = bLv(k), s = R * (.17 + (q.z + 1) * .025), sel = BV.sel === k, c = M.c, depth = .6 + (q.z + 1) * .2;
    g.save(); g.translate(q.x, q.y); g.globalAlpha = depth;
    if (lv) { g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, s * 2.6, c, .25 + lv * .07); g.globalCompositeOperation = 'source-over'; }
    // block: top face + front face
    const w = s * 1.2, h = s * .55, d = s * .5;
    if (lv) {
      g.fillStyle = '#0f172a'; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2, 0); g.lineTo(w / 2, h); g.lineTo(-w / 2, h); g.closePath(); g.fill();
      const fg = g.createLinearGradient(0, 0, 0, h); fg.addColorStop(0, '#334766'); fg.addColorStop(1, '#141d33'); g.fillStyle = fg; g.fill();
      const tg = g.createLinearGradient(0, -d * .5, 0, 0); tg.addColorStop(0, '#5a7096'); tg.addColorStop(1, '#3a4d70'); g.fillStyle = tg; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2 + d * .5, -d * .5); g.lineTo(w / 2 + d * .5, -d * .5); g.lineTo(w / 2, 0); g.closePath(); g.fill();
      g.fillStyle = '#1b2742'; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2 + d * .5, -d * .5); g.lineTo(w / 2 + d * .5, h - d * .5); g.lineTo(w / 2, h); g.closePath(); g.fill();
      g.fillStyle = c; g.fillRect(-w / 2, h * .38, w, h * .1); // colour band
      for (let i = 0; i < 5; i++) { g.fillStyle = (t >> 3) % 9 === i ? '#fff' : 'rgba(253,230,138,.85)'; g.fillRect(-w / 2 + w * .1 + i * w * .17, h * .62, w * .08, h * .14); }
      // what each module does, visibly
      if (k === 'refinery') { g.fillStyle = '#475569'; g.fillRect(-w * .1, -d * .5 - s * .5, w * .2, s * .5); g.fillStyle = c; g.beginPath(); g.moveTo(-w * .14, -d * .5 - s * .5); g.lineTo(w * .14, -d * .5 - s * .5); g.lineTo(0, -d * .5 - s * .78 + Math.sin(t * .3) * 2); g.closePath(); g.fill(); }
      if (k === 'turret') for (let i = 0; i < Math.min(lv, 3); i++) { const ox = -w * .28 + i * w * .28, ang = Math.sin(t * .02 + i * 2) * .8 - PI / 2; g.fillStyle = '#64748b'; g.beginPath(); g.arc(ox, -d * .35, s * .1, 0, TAU); g.fill(); g.strokeStyle = '#94a3b8'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(ox, -d * .35); g.lineTo(ox + Math.cos(ang) * s * .3, -d * .35 + Math.sin(ang) * s * .3); g.stroke(); if ((t + i * 37) % 120 < 4) { g.globalCompositeOperation = 'lighter'; drawGlow(g, ox + Math.cos(ang) * s * .34, -d * .35 + Math.sin(ang) * s * .34, s * .35, '#fdba74', .9); g.globalCompositeOperation = 'source-over'; } }
      if (k === 'lab') { g.save(); g.translate(0, -d * .5 - s * .2); g.rotate(Math.sin(t * .02) * .6); g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, s * .3, s * .12, 0, PI, TAU); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s * .2); g.stroke(); g.restore(); const pu = (t % 90) / 90; g.strokeStyle = 'rgba(167,139,250,' + (1 - pu) + ')'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, -d * .5 - s * .4, s * (.1 + pu * .6), 0, TAU); g.stroke(); }
      if (k === 'armory') { for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#7f1d1d' : '#991b1b'; g.fillRect(-w * .3 + i * w * .22, -d * .5 - s * .18, w * .18, s * .18); g.fillStyle = 'rgba(254,202,202,.6)'; g.fillRect(-w * .3 + i * w * .22, -d * .5 - s * .12, w * .18, 2); } }
      if (k === 'dronebay') for (let i = 0; i < lv; i++) { const a = t * .04 + i / lv * TAU; const x = Math.cos(a) * s * 1.1, y = Math.sin(a) * s * .45 - s * .2; g.fillStyle = '#d1fae5'; g.fillRect(x - 2.5, y - 1.5, 5, 3); g.fillStyle = 'rgba(52,211,153,.6)'; g.fillRect(x - 6, y - .5, 4, 1); }
      if (k === 'shield') { g.strokeStyle = 'rgba(125,211,252,' + (.5 + .4 * Math.sin(t * .1)) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(0, -d * .5, s * .32, PI, TAU); g.stroke(); }
      // level pips
      for (let i = 0; i < BMAX; i++) { g.fillStyle = i < lv ? c : 'rgba(148,163,184,.25)'; g.fillRect(-w / 2 + i * (w / BMAX) + 1, h + 4, w / BMAX - 2, 3); }
    } else {
      // hologram blueprint for an unbuilt module
      const a = .45 + .25 * Math.sin(t * .08 + q.a * 3); g.strokeStyle = 'rgba(125,211,252,' + a + ')'; g.setLineDash([5, 4]); g.lineDashOffset = -t * .3; g.lineWidth = 1.5; g.strokeRect(-w / 2, -d * .5, w, h + d * .5); g.setLineDash([]);
      g.fillStyle = 'rgba(56,189,248,' + a * .25 + ')'; g.fillRect(-w / 2, -d * .5, w, h + d * .5);
      g.strokeStyle = 'rgba(224,242,254,' + (a + .2) + ')'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-s * .16, h * .2); g.lineTo(s * .16, h * .2); g.moveTo(0, h * .2 - s * .16); g.lineTo(0, h * .2 + s * .16); g.stroke();
    }
    g.globalAlpha = 1; g.font = '800 ' + Math.max(10, Math.round(s * .24)) + 'px ui-monospace,monospace'; g.textAlign = 'center'; g.fillStyle = sel ? '#fff' : lv ? c : 'rgba(186,230,253,.8)'; g.fillText(M.nm.toUpperCase(), 0, -d * .5 - s * (k === 'refinery' && lv ? .95 : .6)); if (!lv) { g.font = '700 9px ui-monospace,monospace'; g.fillStyle = 'rgba(186,230,253,.7)'; g.fillText('BUILD - ' + fmt(bCost(k)), 0, h + 18); }
    if (sel) { const r2 = s * 1.15, sp = t * .04; g.strokeStyle = '#fff'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = sp + i * PI / 2; g.beginPath(); g.arc(0, h * .2, r2, a, a + .6); g.stroke(); } }
    g.restore(); BV.hit.push({ k, x: q.x, y: q.y + s * .1, r: s * 1.2 });
  };
  mods.filter(q => q.z < 0).sort((a, b) => a.z - b.z).forEach(q => { spoke(q); module(q); });
  ring(false);
  // hub: a lit cylinder with a beacon
  const hr = R * .3, hh = R * .28; const side = g.createLinearGradient(cx - hr, 0, cx + hr, 0); side.addColorStop(0, '#1e293b'); side.addColorStop(.35, '#64748b'); side.addColorStop(.6, '#334155'); side.addColorStop(1, '#0f172a');
  g.fillStyle = side; g.beginPath(); g.ellipse(cx, cy + hh / 2, hr, hr * tilt, 0, 0, PI); g.lineTo(cx - hr, cy - hh / 2); g.ellipse(cx, cy - hh / 2, hr, hr * tilt, 0, PI, 0, true); g.closePath(); g.fill();
  for (let r = 0; r < 3; r++) for (let i = 0; i < 16; i++) { const a = i / 16 * PI + .1; const x = cx + Math.cos(a) * hr * .96, y = cy - hh / 2 + hh * (.25 + r * .25) + Math.sin(a) * hr * tilt; if (((i + r * 5 + (t >> 5)) % 7) === 0) continue; g.fillStyle = raid ? 'rgba(255,120,120,.9)' : 'rgba(186,230,253,.85)'; g.fillRect(x - 1, y - 1, 2.5, 1.6); }
  const top = g.createRadialGradient(cx - hr * .3, cy - hh / 2 - hr * tilt * .4, 2, cx, cy - hh / 2, hr); top.addColorStop(0, '#cbd5e1'); top.addColorStop(1, '#475569'); g.fillStyle = top; g.beginPath(); g.ellipse(cx, cy - hh / 2, hr, hr * tilt, 0, 0, TAU); g.fill();
  g.strokeStyle = raid ? 'rgba(239,68,68,.9)' : 'rgba(34,211,238,.85)'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy - hh / 2, hr * .7, hr * .7 * tilt, 0, 0, TAU); g.stroke();
  g.globalCompositeOperation = 'lighter'; drawGlow(g, cx, cy - hh / 2, R * .55, raid ? '#ef4444' : '#22d3ee', .3 + .12 * Math.sin(t * .05)); const bl = (t % 80) < 8; if (bl) drawGlow(g, cx, cy - hh / 2 - R * .22, R * .18, raid ? '#ef4444' : '#ffffff', .9); g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#94a3b8'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy - hh / 2); g.lineTo(cx, cy - hh / 2 - R * .22); g.stroke();
  ring(true);
  mods.filter(q => q.z >= 0).sort((a, b) => a.z - b.z).forEach(q => { spoke(q); module(q); });
  // ore flowing from the refinery to the hub while it is storing cores
  const rf = mods.find(q => q.k === 'refinery'); if (rf && bLv('refinery')) { if (t % 6 === 0) BX.ore.push({ u: 0 }); for (let i = BX.ore.length - 1; i >= 0; i--) { const o = BX.ore[i]; o.u += .012; if (o.u >= 1) { BX.ore.splice(i, 1); continue; } const x = rf.x + (cx - rf.x) * o.u, y = rf.y + (cy - rf.y) * o.u - Math.sin(o.u * PI) * R * .12; g.fillStyle = 'rgba(251,191,36,' + (1 - o.u) + ')'; g.fillRect(x - 1.5, y - 1.5, 3, 3); } }
  // shuttles coming and going
  if (t % 140 === 0 && BX.ships.length < 4) BX.ships.push({ u: 0, a: Math.random() * TAU, out: Math.random() < .5 });
  for (let i = BX.ships.length - 1; i >= 0; i--) { const s = BX.ships[i]; s.u += .004; if (s.u >= 1) { BX.ships.splice(i, 1); continue; } const k = s.out ? s.u : 1 - s.u, d = R * (.35 + k * 2.6), x = cx + Math.cos(s.a) * d, y = cy + Math.sin(s.a) * d * .5 - k * R * .3, sc = 1 - k * .4; g.fillStyle = '#e2e8f0'; g.beginPath(); g.ellipse(x, y, 4 * sc, 2 * sc, s.a, 0, TAU); g.fill(); g.globalCompositeOperation = 'lighter'; drawGlow(g, x - Math.cos(s.a) * 5 * (s.out ? 1 : -1), y - Math.sin(s.a) * 2.5 * (s.out ? 1 : -1), 8 * sc, '#60a5fa', .8); g.globalCompositeOperation = 'source-over'; }
  if (raid) { g.fillStyle = 'rgba(239,68,68,' + (.05 + .05 * Math.sin(t * .1)) + ')'; g.fillRect(0, 0, W, H); for (let i = 0; i < 5; i++) { const a = t * .01 + i * 1.3, x = cx + Math.cos(a) * R * 1.8, y = cy + Math.sin(a * 1.3) * R * .7; g.fillStyle = '#f87171'; g.beginPath(); g.moveTo(x + 6, y); g.lineTo(x - 5, y - 4); g.lineTo(x - 5, y + 4); g.closePath(); g.fill(); } }
};

// ---------- side panel: a card for every module + a refinery card ----------
const _scBaseX = SCR.scBase;
SCR.scBase = function () {
  let h = _scBaseX.apply(this, arguments);
  // fix the tab highlight (MODULES stayed lit on the Forge tab)
  h = h.replace('<button data-act="btab:station" class="on">', '<button data-act="btab:station" class="' + (BV.tab === 'station' || !BV.tab ? 'on' : '') + '">');
  { const cap0 = 8 * bLv('refinery') * 8; h = h.replace(/(Refinery <b class="gold">[\d,]+<\/b> \/ )[\d,]+/, '$1' + fmt(cap0)); }
  if (BV.tab === 'drones' || BV.tab === 'forge') return h;
  const a = h.indexOf('<div class="gx-k"'), b = h.indexOf('</aside>'); if (a < 0 || b < 0) return h;
  const B = BS(), k = BV.sel, M = BMOD[k], lv = bLv(k), cost = bCost(k), ore = Math.floor(B.ore || 0), cap = 8 * bLv('refinery') * 8;
  const card = x => { const X = BMOD[x], l = bLv(x), on = x === k; return '<button class="bm-card' + (on ? ' on' : '') + (l ? '' : ' nb') + '" data-act="bsel:' + x + '" style="--mc:' + X.c + '"><span class="bm-ic">' + bIco(x) + '</span><span class="bm-tx"><b>' + X.nm + '</b><i>' + Array.from({ length: BMAX }, (_, n) => '<u class="' + (n < l ? 'f' : '') + '"></u>').join('') + '</i></span>' + (l < BMAX ? '<em>' + (l ? 'LV ' + l : 'NEW') + '</em>' : '<em class="mx">MAX</em>') + '</button>'; };
  const det = '<div class="bm-det" style="--mc:' + M.c + '"><div class="bm-dh"><span class="bm-big">' + bIco(k) + '</span><div><div class="bm-k">MODULE - LEVEL ' + lv + ' / ' + BMAX + '</div><h2 class="bm-n">' + M.nm + '</h2></div></div>' +
    '<p class="bm-now">' + (lv ? M.ds(lv) : 'Not built yet.') + '</p>' + (lv < BMAX ? '<p class="bm-next"><b>NEXT:</b> ' + M.ds(lv + 1) + '</p><button class="btn big gold bm-go' + (SAVE.cores < cost ? ' off' : '') + '" data-act="bup:' + k + '">' + (lv ? 'UPGRADE' : 'BUILD') + ' - ' + fmt(cost) + ' CORES</button>' + (SAVE.cores < cost ? '<div class="bm-need">' + fmt(cost - SAVE.cores) + ' more cores needed</div>' : '') : '<p class="bm-next good">Fully upgraded.</p>') + '</div>';
  const refC = bLv('refinery') ? '<div class="bm-ore"><div class="bm-oh"><b>REFINERY STORAGE</b><span>' + fmt(ore) + ' / ' + fmt(cap) + '</span></div><i><u style="width:' + Math.min(100, Math.round(ore / Math.max(1, cap) * 100)) + '%"></u></i><button class="btn sm gold' + (ore < 1 ? ' off' : '') + '" data-act="bcollect">COLLECT ' + fmt(ore) + ' CORES</button></div>' : '';
  return h.slice(0, a) + det + refC + '<div class="bm-grid">' + BKEYS.map(card).join('') + '</div>' + h.slice(b);
};
(function () { const st = document.createElement('style'); st.textContent = `
.gx.bs .gx-side{background:linear-gradient(165deg,rgba(16,24,52,.9),rgba(6,10,24,.92));border:1px solid rgba(125,211,252,.25);border-radius:4px;box-shadow:0 20px 50px rgba(0,0,0,.5)}
.bm-det{position:relative;padding:12px 12px 14px;margin-bottom:10px;border-left:3px solid var(--mc);background:linear-gradient(100deg,color-mix(in srgb,var(--mc) 16%,transparent),transparent 70%)}
.bm-dh{display:flex;gap:12px;align-items:center}.bm-big{width:46px;height:46px;flex:none;display:grid;place-items:center;color:var(--mc);background:color-mix(in srgb,var(--mc) 16%,#04101f);border:1px solid color-mix(in srgb,var(--mc) 55%,transparent);clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);animation:bmBob 3s ease-in-out infinite}.bm-big svg{width:26px;height:26px}
@keyframes bmBob{50%{transform:translateY(-3px)}}
.bm-k{font:900 9px var(--mono);letter-spacing:.24em;color:var(--mc)}.bm-n{margin:2px 0 0;font:900 26px/1 var(--disp);letter-spacing:.04em;color:#fff;text-transform:uppercase}.bm-n::after{display:none}
.bm-now{margin:10px 0 4px;font:700 12px/1.5 var(--mono);color:#e2e8f0}.bm-next{margin:0 0 10px;font:600 11px/1.5 var(--mono);color:#94a3b8}.bm-next b{color:var(--mc)}
.bm-go{width:100%}.bm-need{margin-top:6px;font:700 10px var(--mono);color:#fca5a5;text-align:center;letter-spacing:.08em}
.bm-ore{padding:10px 12px;margin-bottom:10px;border:1px solid rgba(251,191,36,.35);background:linear-gradient(100deg,rgba(251,191,36,.12),transparent)}
.bm-oh{display:flex;justify-content:space-between;font:800 10px var(--mono);letter-spacing:.16em;color:#fde68a}.bm-ore i{display:block;height:6px;margin:6px 0 8px;background:rgba(255,255,255,.08)}.bm-ore i u{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#fde047);box-shadow:0 0 10px #f59e0b}
.bm-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.bm-card{position:relative;display:flex;gap:8px;align-items:center;padding:8px;text-align:left;cursor:pointer;color:#e2e8f0;background:rgba(10,18,38,.85);border:1px solid rgba(148,163,184,.18);border-left:3px solid var(--mc);transition:transform .15s,background .15s,border-color .15s}
.bm-card:hover{transform:translateY(-2px);background:color-mix(in srgb,var(--mc) 14%,rgba(10,18,38,.9))}.bm-card.on{background:color-mix(in srgb,var(--mc) 22%,rgba(10,18,38,.9));border-color:var(--mc)}
.bm-card.nb{opacity:.75}.bm-card.nb .bm-ic{filter:grayscale(.6)}
.bm-ic{width:28px;height:28px;flex:none;display:grid;place-items:center;color:var(--mc)}.bm-ic svg{width:20px;height:20px}.bm-card:hover .bm-ic{animation:bmWig .4s ease}@keyframes bmWig{30%{transform:rotate(-12deg) scale(1.15)}70%{transform:rotate(8deg)}}
.bm-tx{display:flex;flex-direction:column;gap:4px;min-width:0}.bm-tx b{font:800 11px var(--mono);letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bm-tx i{display:flex;gap:2px}.bm-tx u{width:10px;height:3px;background:rgba(148,163,184,.25)}.bm-tx u.f{background:var(--mc);box-shadow:0 0 4px var(--mc)}
.bm-card em{position:absolute;top:4px;right:5px;font:900 8px var(--mono);font-style:normal;letter-spacing:.12em;color:var(--mc)}.bm-card em.mx{color:#fbbf24}
`; document.head.appendChild(st); })();
