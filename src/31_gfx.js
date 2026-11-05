// ================= GFX: glow, backdrops (10 worlds), particles, bullets, pickups, 2D fallback models =================
const GLC = {};
function glowSpr(col) {
  if (GLC[col]) return GLC[col];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 64, 64); g.globalCompositeOperation = 'destination-in';
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.3, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return GLC[col] = c;
}
function drawGlow(g, x, y, r, col, a) { g.globalAlpha = a * SET.glow; g.drawImage(glowSpr(col), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; }
const rgba = (h, a) => { const n = hx(h); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; };

// ---------- parallax backdrops ----------
const BG = { w: -1, layers: [], sky: null, t: 0 };
function buildBackdrop(w) {
  if (typeof w !== 'number' || !WORLDS[w]) w = 0;
  const W = WORLDS[w], H = V.H, sc = Math.min(V.s * V.dpr, 1.25), rs = seeded(w * 31 + 7), TW = 1600, lv = SET.back;
  BG.w = w; BG.layers = []; BG.W = V.W; BG.H = H;
  const mk = (fn, sp, a) => { const c = document.createElement('canvas'); c.width = Math.round(TW * sc); c.height = Math.round(H * sc); const g = c.getContext('2d'); g.scale(sc, sc); fn(g, TW, H); BG.layers.push({ c, sp, a: a === undefined ? 1 : a }); };
  const wrap = (g, x, r, f) => { f(x); if (x < r) f(x + TW); if (x > TW - r) f(x - TW); };
  const R = (a, b) => a + rs() * (b - a), ac = W.ac;
  const blob = (g, x, y, r, col, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
  const stars = (g, n, big) => { for (let i = 0; i < n; i++) { const x = R(0, TW), y = R(0, H), r = big ? R(.6, 1.8) : R(.3, 1); g.fillStyle = 'rgba(255,255,255,' + R(.25, .9).toFixed(2) + ')'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } };
  mk((g) => stars(g, 150, 0), .06); if (lv >= 1) mk((g) => stars(g, 70, 1), .14);
  if (lv >= 1) {
    const P = {
      sky: () => {
        mk((g) => { for (let i = 0; i < 26; i++) wrap(g, R(0, TW), 200, x => blob(g, x, R(H * .55, H), R(100, 220), '#6366f1', .1)); const gx = g.createLinearGradient(0, H * .7, 0, H); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(56,189,248,.12)'); g.fillStyle = gx; g.fillRect(0, H * .7, TW, H * .3); }, .22);
        mk((g) => { for (let i = 0; i < 26; i++) { const x = R(0, TW), bw = R(30, 80), bh = R(H * .15, H * .5); wrap(g, x, bw, xx => { g.fillStyle = '#0a1226'; g.fillRect(xx, H - bh, bw, bh); g.fillStyle = 'rgba(56,189,248,.5)'; for (let k = 0; k < bh / 14; k++) if (rs() < .35) g.fillRect(xx + R(4, bw - 8), H - bh + k * 14 + 4, 3, 4); g.fillStyle = '#1d2b4d'; g.fillRect(xx + bw / 2 - 1, H - bh - 18, 2, 18); }); } }, .42);
        if (lv >= 2) mk((g) => { for (let i = 0; i < 9; i++) wrap(g, R(0, TW), 260, x => { const y = R(30, H - 30); for (let k = 0; k < 5; k++) blob(g, x + k * 55, y + R(-14, 14), R(60, 120), '#c7d2fe', .1); }); }, 1.1, .8);
      },
      jungle: () => {
        mk((g) => { for (let i = 0; i < 20; i++) wrap(g, R(0, TW), 240, x => { const r = R(80, 200); blob(g, x, R(H * .3, H), r, '#10b981', .09); }); }, .2);
        mk((g) => { for (let i = 0; i < 12; i++) { const x = R(0, TW), th = R(30, 60), hh = R(H * .35, H * .7); wrap(g, x, 200, xx => { g.fillStyle = '#052e1f'; g.beginPath(); g.moveTo(xx - th / 2, H); g.quadraticCurveTo(xx - 6, H - hh * .6, xx - th * .25, H - hh); g.lineTo(xx + th * .25, H - hh); g.quadraticCurveTo(xx + 6, H - hh * .6, xx + th / 2, H); g.fill(); for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(xx + R(-90, 90), H - hh + R(-20, 30), R(40, 90), 0, TAU); g.fill(); } g.fillStyle = 'rgba(52,211,153,.6)'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(xx + R(-80, 80), H - hh + R(-10, 60), R(1.5, 3.5), 0, TAU); g.fill(); } }); }
          g.strokeStyle = '#064e3b'; g.lineWidth = 3; for (let i = 0; i < 14; i++) { const x = R(0, TW), l = R(60, 200); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 20, l * .4, x - 20, l * .7, x + 5, l); g.stroke(); } }, .45);
        if (lv >= 2) mk((g) => { for (let i = 0; i < 60; i++) { const x = R(0, TW), y = R(0, H); blob(g, x, y, R(3, 8), pick(['#bef264', '#34d399', '#a7f3d0']), .9); } }, 1.2, .9);
      },
      dunes: () => {
        mk((g) => { blob(g, TW * .72, H * .3, 160, '#fdba74', .5); g.fillStyle = 'rgba(253,186,116,.35)'; g.beginPath(); g.arc(TW * .72, H * .3, 70, 0, TAU); g.fill(); for (let i = 0; i < 8; i++) { const x = R(0, TW), bw = R(90, 180), bh = R(30, 90); g.fillStyle = '#4a2008'; g.fillRect(x, H * .72 - bh, bw, bh); g.fillRect(x + bw * .2, H * .72 - bh - 14, bw * .5, 14); } }, .16);
        const dune = (col, base, amp, f) => (g) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= TW; x += 20) g.lineTo(x, base + Math.sin(x / TW * TAU * f) * amp + Math.sin(x / TW * TAU * f * 3 + 1) * amp * .3); g.lineTo(TW, H); g.fill(); };
        mk(dune('#5a2a0e', H * .82, 26, 2), .3); mk(dune('#3b1a08', H * .9, 22, 3), .55);
        if (lv >= 2) mk((g) => { for (let i = 0; i < 30; i++) { const x = R(0, TW), y = R(0, H), l = R(60, 200); const gr = g.createLinearGradient(x, y, x + l, y); gr.addColorStop(0, 'rgba(251,191,36,0)'); gr.addColorStop(.5, 'rgba(251,191,36,.22)'); gr.addColorStop(1, 'rgba(251,191,36,0)'); g.fillStyle = gr; g.fillRect(x, y, l, 2); } }, 1.8, 1);
      },
      nebula: () => {
        mk((g) => { for (let i = 0; i < 34; i++) wrap(g, R(0, TW), 260, x => blob(g, x, R(0, H), R(120, 300), pick(['#a855f7', '#ec4899', '#6366f1', '#7c3aed']), .12)); }, .18);
        mk((g) => { for (let i = 0; i < 16; i++) { const x = R(0, TW), y = R(H * .15, H * .9), s = R(20, 60); wrap(g, x, 80, xx => { g.fillStyle = 'rgba(192,132,252,.18)'; g.strokeStyle = 'rgba(240,171,252,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(xx, y - s * 1.6); g.lineTo(xx + s * .5, y); g.lineTo(xx, y + s * 1.6); g.lineTo(xx - s * .5, y); g.closePath(); g.fill(); g.stroke(); }); } }, .42);
        if (lv >= 2) mk((g) => { stars(g, 90, 1); for (let i = 0; i < 6; i++) blob(g, R(0, TW), R(0, H), R(30, 60), '#f0abfc', .3); }, 1.3, .8);
      },
      hole: () => {
        mk((g) => { const cx = TW * .66, cy = H * .5; blob(g, cx, cy, 260, '#7f1d1d', .5); for (let i = 0; i < 5; i++) { g.strokeStyle = rgba(pick(['#fb7185', '#fbbf24', '#f43f5e']), .22 - i * .03); g.lineWidth = 6 - i; g.beginPath(); g.ellipse(cx, cy, 240 - i * 28, 54 - i * 7, -.35, 0, TAU); g.stroke(); } g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, 60, 0, TAU); g.fill(); }, .12);
        mk((g) => { for (let i = 0; i < 40; i++) { const x = R(0, TW), y = R(0, H), l = R(30, 140); const gr = g.createLinearGradient(x, y, x - l, y + l * .3); gr.addColorStop(0, 'rgba(251,113,133,.5)'); gr.addColorStop(1, 'rgba(251,113,133,0)'); g.strokeStyle = gr; g.lineWidth = R(1, 2.4); g.beginPath(); g.moveTo(x, y); g.lineTo(x - l, y + l * .3); g.stroke(); } }, .5);
        if (lv >= 2) mk((g) => { for (let i = 0; i < 22; i++) { g.fillStyle = 'rgba(120,20,30,.7)'; g.beginPath(); g.arc(R(0, TW), R(0, H), R(2, 7), 0, TAU); g.fill(); } }, 1.4, .9);
      },
      ice: () => {
        mk((g) => { for (let i = 0; i < 14; i++) wrap(g, R(0, TW), 260, x => blob(g, x, R(0, H * .6), R(120, 260), pick(['#22d3ee', '#4ade80', '#a78bfa']), .08)); }, .16);
        const berg = (col, hh, n) => (g) => { g.fillStyle = col; for (let i = 0; i < n; i++) { const x = R(0, TW), bw = R(80, 200), bh = R(hh * .4, hh); wrap(g, x, bw, xx => { g.beginPath(); g.moveTo(xx, H); g.lineTo(xx + bw * .2, H - bh * .6); g.lineTo(xx + bw * .42, H - bh); g.lineTo(xx + bw * .65, H - bh * .5); g.lineTo(xx + bw, H); g.fill(); g.beginPath(); g.moveTo(xx + bw * .1, 0); g.lineTo(xx + bw * .25, bh * .45); g.lineTo(xx + bw * .4, 0); g.fill(); }); } };
        mk(berg('#0b3a5a', H * .5, 9), .3); mk(berg('#0e5a82', H * .35, 8), .55);
        if (lv >= 2) mk((g) => { for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(224,242,254,' + R(.3, .9).toFixed(2) + ')'; g.beginPath(); g.arc(R(0, TW), R(0, H), R(1, 2.6), 0, TAU); g.fill(); } }, 1.6, 1);
      },
      lava: () => {
        mk((g) => { blob(g, TW * .3, H, 400, '#ea580c', .35); blob(g, TW * .8, H, 340, '#f59e0b', .25); }, .14);
        const ridge = (col, base, amp, f, glow) => (g) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= TW; x += 16) g.lineTo(x, base - Math.abs(Math.sin(x / TW * TAU * f)) * amp - Math.sin(x * .05) * amp * .1); g.lineTo(TW, H); g.fill(); if (glow) { g.strokeStyle = 'rgba(251,146,60,.7)'; g.lineWidth = 2; for (let i = 0; i < 18; i++) { const x = R(0, TW); g.beginPath(); g.moveTo(x, H); g.lineTo(x + R(-20, 20), H - R(10, amp)); g.stroke(); } } };
        mk(ridge('#2a0f06', H * .84, 110, 3), .3); mk(ridge('#170702', H * .94, 80, 5, 1), .55);
        if (lv >= 2) mk((g) => { for (let i = 0; i < 50; i++) blob(g, R(0, TW), R(0, H), R(2, 6), pick(['#fb923c', '#fbbf24', '#f87171']), .9); }, 1.5, 1);
      },
      deep: () => {
        mk((g) => { for (let i = 0; i < 7; i++) { const x = R(0, TW), w = R(60, 150); const gr = g.createLinearGradient(x, 0, x + 80, H); gr.addColorStop(0, 'rgba(94,234,212,.14)'); gr.addColorStop(1, 'rgba(94,234,212,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w + 140, H); g.lineTo(x + 40, H); g.fill(); } }, .15);
        mk((g) => { for (let i = 0; i < 22; i++) { const x = R(0, TW), hh = R(60, H * .5); wrap(g, x, 40, xx => { g.strokeStyle = '#042f2e'; g.lineWidth = R(5, 10); g.lineCap = 'round'; g.beginPath(); g.moveTo(xx, H); g.bezierCurveTo(xx + 20, H - hh * .4, xx - 24, H - hh * .7, xx + 6, H - hh); g.stroke(); blob(g, xx + 6, H - hh, 14, '#5eead4', .5); }); } }, .4);
        if (lv >= 2) mk((g) => { for (let i = 0; i < 50; i++) { g.strokeStyle = 'rgba(165,243,252,.5)'; g.lineWidth = 1; const r = R(2, 6); g.beginPath(); g.arc(R(0, TW), R(0, H), r, 0, TAU); g.stroke(); } }, 1.3, 1);
      },
      grid: () => {
        mk((g) => { const hz = H * .62; g.strokeStyle = 'rgba(74,222,128,.28)'; g.lineWidth = 1; for (let i = -30; i <= 30; i++) { g.beginPath(); g.moveTo(TW / 2 + i * 14, hz); g.lineTo(TW / 2 + i * 120, H); g.stroke(); } for (let k = 1; k < 12; k++) { const y = hz + Math.pow(k / 12, 2) * (H - hz); g.beginPath(); g.moveTo(0, y); g.lineTo(TW, y); g.stroke(); } blob(g, TW / 2, hz, 260, '#a855f7', .2); }, .1);
        mk((g) => { for (let i = 0; i < 26; i++) { const x = R(0, TW), y = R(0, H), s = R(14, 40); g.strokeStyle = rgba(pick(['#4ade80', '#e879f9', '#22d3ee']), .5); g.lineWidth = 1.4; g.strokeRect(x, y, s, s); g.strokeRect(x + s * .25, y - s * .25, s, s); } }, .38);
        if (lv >= 2) mk((g) => { g.font = '12px monospace'; for (let i = 0; i < 38; i++) { const x = R(0, TW), y = R(0, H), n = rint(3, 9); for (let k = 0; k < n; k++) { g.fillStyle = 'rgba(74,222,128,' + (1 - k / n) * .6 + ')'; g.fillText(rs() < .5 ? '0' : '1', x, y + k * 13); } } }, 1.2, 1);
      },
      clock: () => {
        const gear = (g, x, y, r, n, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, rr = i % 2 ? r : r * 1.12; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x, y, r * .55, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; };
        mk((g) => { blob(g, TW * .5, H * .5, 400, '#fde047', .12); for (let i = 0; i < 6; i++) gear(g, R(0, TW), R(0, H), R(80, 190), rint(10, 18), 'rgba(120,80,10,.28)'); }, .14);
        mk((g) => { for (let i = 0; i < 9; i++) { const x = R(0, TW), y = R(H * .1, H * .9), r = R(34, 70); g.strokeStyle = 'rgba(253,224,71,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * r * .86, y + Math.sin(a) * r * .86); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); } g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(-r, r) * .5, y - r * .6); g.moveTo(x, y); g.lineTo(x + r * .7, y + R(-r, r) * .3); g.stroke(); } }, .36);
        if (lv >= 2) mk((g) => { for (let i = 0; i < 45; i++) blob(g, R(0, TW), R(0, H), R(2, 5), pick(['#fde047', '#fff7cc', '#fbbf24']), .9); }, 1.4, 1);
      },
      ring: () => {
        mk((g) => { const cx = TW * .5, cy = H * 2.05, r = H * 1.5, a = g.createRadialGradient(cx, cy, r * .97, cx, cy, r * 1.07); a.addColorStop(0, 'rgba(125,211,252,.4)'); a.addColorStop(1, 'rgba(125,211,252,0)'); g.fillStyle = a; g.beginPath(); g.arc(cx, cy, r * 1.07, 0, TAU); g.fill(); g.fillStyle = '#07102a'; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); for (let i = 0; i < 40; i++) { const x = R(cx - 520, cx + 520), y = R(H * .72, H); if (Math.hypot(x - cx, y - cy) < r) { g.fillStyle = 'rgba(253,224,71,' + R(.2, .7).toFixed(2) + ')'; g.fillRect(x, y, 2, 2); } } }, .1);
        mk((g) => { const y0 = H * .34, A = H * .1; g.lineWidth = 16; for (let x = 0; x < TW; x += 40) { if (rs() < .22) continue; const y1 = y0 + Math.sin(x / TW * TAU) * A, y2 = y0 + Math.sin((x + 34) / TW * TAU) * A; g.strokeStyle = rs() < .15 ? 'rgba(251,191,36,.6)' : 'rgba(148,163,184,.42)'; g.beginPath(); g.moveTo(x, y1); g.lineTo(x + 34, y2); g.stroke(); if (rs() < .3) { g.fillStyle = 'rgba(253,224,71,.8)'; g.fillRect(x + 10, y1 - 12, 3, 3); } } g.lineWidth = 3; g.strokeStyle = 'rgba(148,163,184,.3)'; g.beginPath(); for (let x = 0; x <= TW; x += 20) g.lineTo(x, y0 - 18 + Math.sin(x / TW * TAU) * A); g.stroke(); }, .22);
        mk((g) => { for (let i = 0; i < 16; i++) { const x = R(0, TW), y = R(30, H - 30), w = R(30, 110), h = R(10, 36), ang = R(-.6, .6); wrap(g, x, w, xx => { g.save(); g.translate(xx, y); g.rotate(ang); g.fillStyle = '#0b1220'; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = 'rgba(148,163,184,.4)'; g.lineWidth = 1.5; g.strokeRect(-w / 2, -h / 2, w, h); g.fillStyle = 'rgba(251,191,36,.7)'; for (let k = 0; k < w / 16; k++) if (k % 2 === 0) g.fillRect(-w / 2 + 4 + k * 14, -h / 2 + 4, 4, 3); g.restore(); }); } }, .5);
        if (lv >= 2) mk((g) => { for (let i = 0; i < 60; i++) blob(g, R(0, TW), R(0, H), R(2, 4), pick(['#fbbf24', '#e2e8f0', '#fb923c']), .85); }, 1.3, 1);
      },
      crystal: () => {
        mk((g) => { for (let i = 0; i < 18; i++) wrap(g, R(0, TW), 260, x => blob(g, x, R(0, H * .8), R(120, 280), pick(['#ec4899', '#a855f7', '#f9a8d4', '#6366f1']), .1)); for (let i = 0; i < 6; i++) { const x = R(0, TW), y = R(H * .2, H * .7), w = R(70, 160); wrap(g, x, w, xx => { g.fillStyle = 'rgba(31,10,40,.85)'; g.beginPath(); g.moveTo(xx - w, y); g.lineTo(xx + w, y); g.lineTo(xx + w * .5, y + w * .5); g.lineTo(xx, y + w * 1.1); g.lineTo(xx - w * .5, y + w * .5); g.closePath(); g.fill(); g.strokeStyle = 'rgba(249,168,212,.3)'; g.lineWidth = 1.5; g.stroke(); }); } }, .18);
        const spire = (up, n, hmin, hmax, col, edge) => (g) => { for (let i = 0; i < n; i++) { const x = R(0, TW), bw = R(30, 80), bh = R(hmin, hmax), y0 = up ? H : 0, d = up ? -1 : 1; wrap(g, x, bw, xx => { g.fillStyle = col; g.beginPath(); g.moveTo(xx, y0); g.lineTo(xx + bw * .15, y0 + d * bh * .6); g.lineTo(xx + bw * .5, y0 + d * bh); g.lineTo(xx + bw * .85, y0 + d * bh * .5); g.lineTo(xx + bw, y0); g.closePath(); g.fill(); g.fillStyle = edge; g.beginPath(); g.moveTo(xx + bw * .5, y0 + d * bh); g.lineTo(xx + bw * .85, y0 + d * bh * .5); g.lineTo(xx + bw, y0); g.lineTo(xx + bw * .5, y0); g.closePath(); g.fill(); }); } };
        mk(spire(1, 12, H * .25, H * .55, '#3b0a2e', 'rgba(244,114,182,.28)'), .32); mk(spire(0, 8, H * .15, H * .35, '#2a0724', 'rgba(244,114,182,.24)'), .5);
        if (lv >= 2) mk((g) => { for (let i = 0; i < 50; i++) { const x = R(0, TW), y = R(0, H), s = R(2, 6); g.fillStyle = 'rgba(' + (rs() < .5 ? '251,207,232' : '233,213,255') + ',' + R(.4, .95).toFixed(2) + ')'; g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x + s, y); g.lineTo(x, y + s * 1.6); g.lineTo(x - s, y); g.closePath(); g.fill(); } }, 1.4, 1);
      },
      gas: () => {
        mk((g) => { for (let i = 0; i < 14; i++) { const y = i / 14 * H, hh = R(18, 60), c = pick(['190,242,100', '132,204,22', '77,124,15', '54,83,20']), gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, 'rgba(' + c + ',0)'); gr.addColorStop(.5, 'rgba(' + c + ',' + R(.08, .2).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)'); g.fillStyle = gr; g.fillRect(0, y, TW, hh); } for (let i = 0; i < 3; i++) { const x = R(200, TW - 200), y = R(H * .2, H * .8); for (let k = 0; k < 4; k++) { g.strokeStyle = 'rgba(217,249,157,' + (.18 - k * .035) + ')'; g.lineWidth = 8 - k * 1.6; g.beginPath(); g.ellipse(x, y, 130 - k * 24, 60 - k * 10, .2, 0, TAU * .9); g.stroke(); } } }, .14);
        mk((g) => { for (let i = 0; i < 26; i++) wrap(g, R(0, TW), 220, x => { const y = R(0, H), r = R(60, 160); blob(g, x, y, r, '#0a1204', .6); blob(g, x - r * .15, y - r * .25, r * .8, '#4d7c0f', .12); }); }, .35);
        if (lv >= 2) mk((g) => { g.lineWidth = 1.2; for (let i = 0; i < 90; i++) { const x = R(0, TW), y = R(0, H), l = R(14, 34); g.strokeStyle = 'rgba(217,249,157,' + R(.1, .4).toFixed(2) + ')'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * .35, y + l); g.stroke(); } }, 1.8, 1);
      },
      grave: () => {
        mk((g) => { for (let i = 0; i < 12; i++) wrap(g, R(0, TW), 240, x => blob(g, x, R(H * .3, H), R(100, 240), pick(['#0f766e', '#134e4a', '#1c1917']), .1)); for (let i = 0; i < 3; i++) { const x = R(0, TW), y = R(H * .2, H * .75), L = R(300, 520); wrap(g, x, L, xx => { g.strokeStyle = 'rgba(214,211,209,.2)'; g.fillStyle = 'rgba(12,10,9,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(xx - L / 2, y); g.quadraticCurveTo(xx, y - 60, xx + L / 2, y + 8); g.quadraticCurveTo(xx, y + 70, xx - L / 2, y); g.closePath(); g.fill(); g.stroke(); for (let k = 1; k < 9; k++) { const u = k / 9, px = xx - L / 2 + L * u, hh = 56 * Math.sin(u * PI); g.beginPath(); g.moveTo(px, y - hh * .8); g.lineTo(px + 8, y + hh * .9); g.stroke(); } }); } }, .16);
        mk((g) => { for (let i = 0; i < 14; i++) { const x = R(0, TW), y = R(H * .1, H * .9), w = R(40, 150), ang = R(-.7, .7), lx = R(-w / 3, w / 3); wrap(g, x, w, xx => { g.save(); g.translate(xx, y); g.rotate(ang); g.fillStyle = '#12100f'; g.beginPath(); g.moveTo(-w / 2, -8); g.lineTo(w / 2, -16); g.lineTo(w * .35, 12); g.lineTo(-w * .4, 14); g.closePath(); g.fill(); g.strokeStyle = 'rgba(153,246,228,.28)'; g.lineWidth = 1.4; g.stroke(); g.fillStyle = 'rgba(153,246,228,.7)'; g.fillRect(lx, -2, 3, 3); g.restore(); }); } }, .45);
        if (lv >= 2) mk((g) => { for (let i = 0; i < 40; i++) blob(g, R(0, TW), R(0, H), R(3, 9), pick(['#5eead4', '#99f6e4', '#d6d3d1']), .5); }, 1.2, .9);
      },
      core: () => {
        mk((g) => { const cx = TW * .5, cy = H * .5; blob(g, cx, cy, 420, '#22d3ee', .22); blob(g, cx, cy, 220, '#e0f2fe', .28); for (let i = 0; i < 7; i++) { g.strokeStyle = 'rgba(103,232,249,' + (.28 - i * .03) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 70 + i * 52, 0, TAU); g.stroke(); } for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; g.strokeStyle = 'rgba(207,250,254,.1)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + Math.cos(a) * 80, cy + Math.sin(a) * 80); g.lineTo(cx + Math.cos(a) * 380, cy + Math.sin(a) * 380); g.stroke(); } }, .1);
        mk((g) => { for (let i = 0; i < 22; i++) { const x = R(0, TW), y = R(0, H), s = R(16, 54), col = rgba(pick(['#22d3ee', '#a5f3fc', '#e0f2fe']), .4); wrap(g, x, s * 2, xx => { g.strokeStyle = col; g.lineWidth = 1.4; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + .5; g.lineTo(xx + Math.cos(a) * s, y + Math.sin(a) * s); } g.closePath(); g.stroke(); g.fillStyle = rgba('#22d3ee', .05); g.fill(); }); } }, .36);
        if (lv >= 2) mk((g) => { for (let i = 0; i < 70; i++) blob(g, R(0, TW), R(0, H), R(1.5, 4), pick(['#e0f2fe', '#67e8f9', '#ffffff']), .9); }, 1.4, 1);
      }
    };
    (P[W.bk] || P.sky)();
  }
  // sky gradient
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, W.col[2]); gr.addColorStop(.5, W.col[0]); gr.addColorStop(1, W.col[1]); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); BG.sky = c;
}
let bgOff = 0;
function drawBackdrop(g, t) {
  const W = V.W, H = V.H;
  if (BG.w !== (G.world | 0) || BG.H !== H) buildBackdrop(G.world | 0);
  g.drawImage(BG.sky, -24, -24, W + 48, H + 48);
  for (const L of BG.layers) {
    const x0 = -((bgOff * L.sp) % 1600) - 24; g.globalAlpha = L.a;
    for (let x = x0; x < W + 24; x += 1600) g.drawImage(L.c, x, -24, 1600, H + 48);
  }
  g.globalAlpha = 1;
  const k = WORLDS[G.world | 0].bk; // animated overlays (cheap)
  if (SET.back >= 2 && !SET.reduce) {
    if (k === 'ice') { for (let i = 0; i < 3; i++) { const gr = g.createLinearGradient(0, 0, 0, H * .5); const hue = [rgba('#4ade80', .1), rgba('#22d3ee', .1), rgba('#a78bfa', .1)][i]; gr.addColorStop(0, hue); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); for (let x = 0; x <= W; x += 40) g.lineTo(x, H * (.12 + i * .06) + Math.sin(x * .01 + t * .01 + i * 2) * 30); g.lineTo(W, 0); g.fill(); } }
    else if (k === 'lava') { g.globalAlpha = .12 + Math.sin(t * .03) * .05; g.fillStyle = '#f97316'; g.fillRect(0, H * .8, W, H * .2); g.globalAlpha = 1; }
    else if (k === 'sky' && ((t | 0) % 420) < 5 && ((t | 0) % 2)) { g.fillStyle = 'rgba(199,210,254,.14)'; g.fillRect(0, 0, W, H); }
    else if (k === 'gas' && ((t | 0) % 260) < 4 && ((t | 0) % 2)) { g.fillStyle = 'rgba(217,249,157,.12)'; g.fillRect(0, 0, W, H); }
    else if (k === 'core') { g.globalAlpha = .05 + (Math.sin(t * .04) * .5 + .5) * .06; g.fillStyle = '#22d3ee'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    else if (k === 'grid') { const y = H * .62 + ((t * .6) % 40); g.strokeStyle = 'rgba(74,222,128,.18)'; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  }
}

// ---------- particles / floating text ----------
function pcl(o) { if (G.ent.pa.length >= SET.parts) G.ent.pa.shift(); G.ent.pa.push(o); }
function spark(x, y, n, col, spd, life, r) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = spd * (.3 + Math.random()); pcl({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: life * (.5 + Math.random() * .6), l0: life, c: col, r: r || 3, k: 0, fr: .96 }); } }
function smoke(x, y, n, r) { for (let i = 0; i < n; i++) pcl({ x, y, vx: rnd(-1, 1), vy: rnd(-1, 1), l: 40 + Math.random() * 30, l0: 70, c: '#475569', r: r || 14, k: 1, fr: .97, gr: .05 }); }
function shock(x, y, col, r1, life) { pcl({ x, y, vx: 0, vy: 0, l: life || 22, l0: life || 22, c: col, r: r1 || 80, k: 2 }); }
function boom2D(x, y, size, col) {
  col = col || '#fb923c'; pcl({ x, y, vx: 0, vy: 0, l: 10, l0: 10, c: '#ffffff', r: size * 1.4, k: 3 });
  spark(x, y, Math.min(26, 8 + size / 3 | 0), col, 5 + size / 14, 36, 3); spark(x, y, 8, '#fde047', 3 + size / 20, 30, 2.4); smoke(x, y, 3 + (size / 22 | 0), size * .4); shock(x, y, col, size * 1.7, 20);
}
function ftext(x, y, txt, col, sz) { if (!SET.dmgnum && sz !== 99) return; if (G.ent.fl.length > 40) G.ent.fl.shift(); G.ent.fl.push({ x, y, t: txt, c: col, l: 44, s: sz || 12, vy: -1.1 }); }
function drawParticles(g) {
  g.globalCompositeOperation = 'lighter';
  for (const p of G.ent.pa) {
    const k = p.l / p.l0;
    if (p.k === 1) continue;
    if (p.k === 2) { const rr = p.r * (1 - k * k); g.strokeStyle = rgba(p.c, k * .8); g.lineWidth = 2 + k * 3; g.beginPath(); g.arc(p.x, p.y, rr, 0, TAU); g.stroke(); }
    else if (p.k === 3) drawGlow(g, p.x, p.y, p.r * (1.2 - k * .4), p.c, k);
    else drawGlow(g, p.x, p.y, p.r * (.7 + k * .6) * 2, p.c, Math.min(1, k * 1.4));
  }
  g.globalCompositeOperation = 'source-over';
  for (const p of G.ent.pa) if (p.k === 1) { const k = p.l / p.l0; g.globalAlpha = k * .35; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * (1.5 - k * .5), 0, TAU); g.fill(); }
  g.globalAlpha = 1; g.textAlign = 'center';
  for (const f of G.ent.fl) { g.globalAlpha = Math.min(1, f.l / 18); g.font = '800 ' + f.s + 'px ui-monospace,Menlo,monospace'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(f.t, f.x, f.y); g.fillStyle = f.c; g.fillText(f.t, f.x, f.y); }
  g.globalAlpha = 1;
}
function updParticles() {
  const pa = G.ent.pa;
  for (let i = pa.length - 1; i >= 0; i--) { const p = pa[i]; p.x += p.vx - (p.k === 1 ? .8 : 0); p.y += p.vy; if (p.fr) { p.vx *= p.fr; p.vy *= p.fr; } if (p.gr) p.vy -= p.gr; if (--p.l <= 0) pa.splice(i, 1); }
  const fl = G.ent.fl; for (let i = fl.length - 1; i >= 0; i--) { const f = fl[i]; f.y += f.vy; f.vy *= .96; if (--f.l <= 0) fl.splice(i, 1); }
}

// ---------- bullets ----------
const EBC = { orb: ['#ff3b5c', '#ff9a3c'], shard: ['#e879f9', '#fb7185'], ice: ['#bae6fd', '#38bdf8'], mine: ['#f59e0b', '#ef4444'], ring: ['#fb7185', '#f43f5e'], plasma: ['#fb923c', '#ef4444'] };
function drawPB(g, b, t) { // player projectiles: bright, streamlined, always cyan/teal/gold family with a pointed tip
  const a = Math.atan2(b.vy, b.vx), c = b.c || '#22d3ee';
  g.save(); g.translate(b.x, b.y); g.rotate(a);
  g.globalCompositeOperation = 'lighter';
  if (b.k === 'orb') { drawGlow(g, 0, 0, b.r * 3.2, c, .8); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, b.r * .55, 0, TAU); g.fill(); g.strokeStyle = rgba(c, .9); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, b.r * .85, 0, TAU); g.stroke(); g.rotate(t * .2); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, b.r * .7, 0, 1.6); g.stroke(); }
  else if (b.k === 'missile') { drawGlow(g, -14, 0, 16, '#fb923c', .8); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#e2e8f0'; g.beginPath(); g.moveTo(10, 0); g.lineTo(2, -3.4); g.lineTo(-9, -3.4); g.lineTo(-9, 3.4); g.lineTo(2, 3.4); g.closePath(); g.fill(); g.fillStyle = '#f43f5e'; g.beginPath(); g.moveTo(10, 0); g.lineTo(4, -3); g.lineTo(4, 3); g.fill(); g.fillStyle = '#94a3b8'; g.fillRect(-9, -6, 5, 3); g.fillRect(-9, 3, 5, 3); }
  else if (b.k === 'lancer' || b.k === 'rail') { const L = b.k === 'rail' ? 56 : 38; drawGlow(g, 0, 0, L * .7, c, .6); g.globalCompositeOperation = 'source-over'; const gr = g.createLinearGradient(-L, 0, L * .4, 0); gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(1, '#fff'); g.fillStyle = gr; g.beginPath(); g.moveTo(L * .5, 0); g.lineTo(-L, -3.4); g.lineTo(-L, 3.4); g.closePath(); g.fill(); }
  else if (b.k === 'arc') { g.globalCompositeOperation = 'source-over'; g.strokeStyle = '#fff'; g.lineWidth = 2.4; g.shadowColor = c; g.shadowBlur = 12; g.beginPath(); g.moveTo(-16, 0); for (let i = 1; i <= 5; i++) g.lineTo(-16 + i * 7, (Math.random() - .5) * 9); g.stroke(); g.shadowBlur = 0; }
  else if (b.k === 'ion') { drawGlow(g, 0, 0, 12, c, .7); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#fff'; g.fillRect(-9, -1.4, 14, 2.8); }
  else { // bolt: capsule with white-hot core and a pointed tip + trail
    const L = b.k === 'spread' ? 8 : 12; drawGlow(g, 0, 0, 14, c, .65); g.globalCompositeOperation = 'source-over';
    const gr = g.createLinearGradient(-L * 2, 0, L, 0); gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(1, rgba(c, .8)); g.fillStyle = gr; g.fillRect(-L * 2, -2, L * 2, 4);
    g.fillStyle = c; g.beginPath(); g.moveTo(L + 4, 0); g.lineTo(L - 2, -3.6); g.lineTo(-L, -3.6); g.lineTo(-L, 3.6); g.lineTo(L - 2, 3.6); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(L + 2, 0); g.lineTo(L - 3, -1.8); g.lineTo(-L + 3, -1.8); g.lineTo(-L + 3, 1.8); g.lineTo(L - 3, 1.8); g.closePath(); g.fill();
  }
  g.restore(); g.globalCompositeOperation = 'source-over';
}
function drawEB(g, b, t) { // hostile projectiles: red/orange/magenta, spiky halo, dark center -> never confused with friendly cyan bolts
  if (EBCP !== SET.cbp) { EBCP = SET.cbp; applyAccess(); }
  const cl = EBC[b.k] || EBC.orb, r = b.r; g.save(); g.translate(b.x, b.y); if (SET.bigb) g.scale(1.4, 1.4);
  g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, r * 3.4, cl[1], .7); g.globalCompositeOperation = 'source-over';
  if (SET.cb || SET.hc) { g.strokeStyle = '#fff'; g.lineWidth = 2; }
  if (b.k === 'shard' || SET.cb) { g.rotate(Math.atan2(b.vy, b.vx)); g.fillStyle = cl[0]; g.beginPath(); g.moveTo(r * 1.9, 0); g.lineTo(0, -r * 1.05); g.lineTo(-r * 1.4, 0); g.lineTo(0, r * 1.05); g.closePath(); g.fill(); if (SET.cb || SET.hc) g.stroke(); g.fillStyle = '#240008'; g.beginPath(); g.arc(0, 0, r * .4, 0, TAU); g.fill(); }
  else if (b.k === 'mine') { g.rotate(t * .05); g.fillStyle = '#1c1917'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.strokeStyle = cl[1]; g.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5)); g.stroke(); } g.fillStyle = (t >> 3) & 1 ? '#ef4444' : '#7f1d1d'; g.beginPath(); g.arc(0, 0, r * .45, 0, TAU); g.fill(); }
  else { g.fillStyle = cl[1]; g.beginPath(); g.arc(0, 0, r * 1.15, 0, TAU); g.fill(); g.fillStyle = cl[0]; g.beginPath(); g.arc(0, 0, r * .85, 0, TAU); g.fill(); if (SET.cb || SET.hc) { g.beginPath(); g.arc(0, 0, r * 1.15, 0, TAU); g.stroke(); } g.fillStyle = '#26000c'; g.beginPath(); g.arc(0, 0, r * .42, 0, TAU); g.fill(); g.rotate(t * .08); g.strokeStyle = cl[0]; g.lineWidth = 1.6; for (let i = 0; i < 4; i++) { g.rotate(H); g.beginPath(); g.moveTo(r * 1.15, 0); g.lineTo(r * 1.7, 0); g.stroke(); } }
  g.restore();
}

// ---------- pickups ----------
const PK = {
  ammo: { c: '#2dd4bf', lb: 'PLASMA' }, hp: { c: '#4ade80', lb: 'REPAIR' }, sh: { c: '#38bdf8', lb: 'SHIELD' }, core: { c: '#fbbf24', lb: '' }, od: { c: '#fb923c', lb: 'OVERDRIVE' }, log: { c: '#67e8f9', lb: 'DATA LOG' }
};
function drawPickup(g, p, t) {
  const d = PK[p.k], bob = Math.sin(t * .08 + (p.ph === undefined ? (p.ph = Math.random() * 6.28) : p.ph)) * 2.5, a = Math.min(1, p.l / 40); g.save(); g.translate(p.x, p.y + bob); g.globalAlpha = a;
  g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, 30, d.c, .55 + Math.sin(t * .15) * .15); g.globalCompositeOperation = 'source-over';
  // rotating bracket ring: the universal "this is an item" signal
  if (p.k !== 'core') { g.save(); g.rotate(t * .03); g.strokeStyle = d.c; g.lineWidth = 2.2; for (let i = 0; i < 4; i++) { g.rotate(H); g.beginPath(); g.arc(0, 0, 19, -.38, .38); g.stroke(); } g.restore(); }
  if (p.k === 'ammo') { // plasma cell: capsule canister with bullet icons
    g.fillStyle = '#0f2f33'; g.strokeStyle = '#99f6e4'; g.lineWidth = 1.6; g.beginPath(); g.roundRect ? g.roundRect(-8, -12, 16, 24, 5) : g.rect(-8, -12, 16, 24); g.fill(); g.stroke();
    g.fillStyle = d.c; g.fillRect(-6, -2, 12, 9); g.fillStyle = '#f0fdfa'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 3.6, -9.5); g.lineTo(i * 3.6 + 1.6, -6); g.lineTo(i * 3.6 - 1.6, -6); g.fill(); g.fillRect(i * 3.6 - 1.6, -6, 3.2, 5); }
    g.fillStyle = '#134e4a'; g.fillRect(-8, 7, 16, 2.4);
  } else if (p.k === 'hp') { g.fillStyle = '#052e16'; g.strokeStyle = d.c; g.lineWidth = 2; g.beginPath(); g.rect(-10, -10, 20, 20); g.fill(); g.stroke(); g.fillStyle = '#f0fdf4'; g.fillRect(-2.6, -7, 5.2, 14); g.fillRect(-7, -2.6, 14, 5.2); }
  else if (p.k === 'sh') { g.fillStyle = '#082f49'; g.strokeStyle = d.c; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -12); g.lineTo(10, -7); g.lineTo(8, 5); g.lineTo(0, 12); g.lineTo(-8, 5); g.lineTo(-10, -7); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#e0f2fe'; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, -4); g.lineTo(4, 3); g.lineTo(0, 7); g.lineTo(-4, 3); g.lineTo(-5, -4); g.closePath(); g.fill(); }
  else if (p.k === 'log') { g.fillStyle = '#082f49'; g.strokeStyle = '#a5f3fc'; g.lineWidth = 1.8; g.beginPath(); g.rect(-9, -11, 18, 22); g.fill(); g.stroke(); g.fillStyle = '#67e8f9'; for (let i = 0; i < 4; i++) g.fillRect(-6, -7 + i * 4.5, 12 - (i % 2) * 4, 2); }
  else if (p.k === 'od') { g.fillStyle = '#431407'; g.strokeStyle = d.c; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#ffedd5'; g.beginPath(); g.moveTo(2, -8); g.lineTo(-5, 1); g.lineTo(0, 1); g.lineTo(-2, 8); g.lineTo(5, -2); g.lineTo(0, -2); g.closePath(); g.fill(); }
  else { g.rotate(t * .06); g.fillStyle = '#78350f'; g.strokeStyle = '#fde68a'; g.lineWidth = 1.6; g.beginPath(); for (let i = 0; i < 6; i++) { const q = i / 6 * TAU; g.lineTo(Math.cos(q) * 8, Math.sin(q) * 8); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = d.c; g.beginPath(); for (let i = 0; i < 6; i++) { const q = i / 6 * TAU; g.lineTo(Math.cos(q) * 4.4, Math.sin(q) * 4.4); } g.closePath(); g.fill(); }
  g.restore();
  if (d.lb && (p.l > 40 || (t >> 3) & 1)) { g.save(); g.globalAlpha = a * .95; g.font = '800 9px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(d.lb, p.x, p.y + 27 + bob); g.fillStyle = d.c; g.fillText(d.lb, p.x, p.y + 27 + bob); g.restore(); }
}

// ---------- 2D fallback models (used when 3D is off/unavailable) ----------
function drawShip2D(g, p, t) {
  const c = p.cfg, pc = c.paint, ac = c.accent, k = HULLK[c.hull] || 1; g.save(); g.translate(p.x, p.y); g.scale(k, k);
  g.globalCompositeOperation = 'lighter'; drawGlow(g, -34, 0, 22 + Math.random() * 4, ac, .8); g.globalCompositeOperation = 'source-over';
  g.lineJoin = 'round'; g.lineWidth = 1.4; g.strokeStyle = ac; g.fillStyle = pc;
  [-1, 1].forEach(s => { g.beginPath(); g.moveTo(-6, 0); g.lineTo(-24, s * 30); g.lineTo(2, s * 20); g.lineTo(10, s * 3); g.closePath(); g.fill(); g.stroke(); });
  g.beginPath(); g.moveTo(32, 0); g.quadraticCurveTo(14, -11, -24, -9); g.lineTo(-30, 0); g.lineTo(-24, 9); g.quadraticCurveTo(14, 11, 32, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#0b2a3d'; g.beginPath(); g.ellipse(6, 0, 10, 4.4, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(3, -1.4, 4, 1.1, 0, 0, TAU); g.fill();
  g.restore();
}
function drawEnemy2D(g, e, t) {
  const d = e.boss ? null : EN[e.id], a = d ? d.m[0] : 'boss', o = d ? d.m[1] : {}, c = e.boss ? BOSSES[e.bi].c : hex(o.c || 0x475569), em = e.boss ? BOSSES[e.bi].c : hex(o.e || 0xf43f5e), r = e.w / 2;
  g.save(); g.translate(e.x, e.y); g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, r * 1.7, em, .45); g.globalCompositeOperation = 'source-over';
  g.lineJoin = 'round'; g.lineWidth = 1.6; g.strokeStyle = em; g.fillStyle = c;
  const poly = pts => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0] * r, q[1] * r) : g.moveTo(q[0] * r, q[1] * r)); g.closePath(); g.fill(); g.stroke(); };
  const circ = (x, y, rr, fill) => { g.beginPath(); g.arc(x * r, y * r, rr * r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } else { g.fill(); g.stroke(); } };
  if (e.boss) { circ(0, 0, 1); g.strokeStyle = em; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.save(); g.rotate(t * .02 * (i + 1) + i); g.beginPath(); g.ellipse(0, 0, r * (1 + i * .1), r * (.5 + i * .12), 0, 0, TAU); g.stroke(); g.restore(); } circ(0, 0, .35, em); }
  else if (a === 'dart') poly([[-1, 0], [.5, -.5], [1, -.2], [1, .2], [.5, .5]]);
  else if (a === 'saucer') { poly([[-1, 0], [-.5, -.3], [.5, -.3], [1, 0], [.5, .3], [-.5, .3]]); circ(0, -.3, .4, 'rgba(125,211,252,.6)'); }
  else if (a === 'pod') { circ(0, 0, .7); g.strokeStyle = em; for (let i = 0; i < (o.n || 8); i++) { const q = i / (o.n || 8) * TAU + t * .02; g.beginPath(); g.moveTo(Math.cos(q) * r * .7, Math.sin(q) * r * .7); g.lineTo(Math.cos(q) * r, Math.sin(q) * r); g.stroke(); } circ(-.25, 0, .22, em); }
  else if (a === 'crab' || a === 'tank' || a === 'elite') { poly([[-1, -.35], [.8, -.5], [1, 0], [.8, .5], [-1, .35]]); circ(-.1, 0, .3, em); }
  else if (a === 'gear') { g.rotate(t * .06); circ(0, 0, .75); for (let i = 0; i < 10; i++) { g.save(); g.rotate(i / 10 * TAU); g.fillRect(r * .7, -r * .1, r * .3, r * .2); g.restore(); } circ(0, 0, .3, em); }
  else if (a === 'ringeye') { circ(0, 0, .45); g.strokeStyle = em; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, r, r * .5, t * .05, 0, TAU); g.stroke(); circ(0, 0, .2, em); }
  else if (a === 'crystal') { poly([[-1, 0], [0, -.5], [1, 0], [0, .5]]); circ(0, 0, .2, em); }
  else if (a === 'manta') poly([[-1, 0], [0, -.9], [.9, -.3], [.4, 0], [.9, .3], [0, .9]]);
  else if (a === 'jelly') { g.beginPath(); g.arc(-r * .2, 0, r * .8, H, -H, true); g.fill(); g.stroke(); circ(-.2, 0, .3, em); }
  else if (a === 'cube') { g.rotate(t * .03); poly([[-.6, -.6], [.6, -.6], [.6, .6], [-.6, .6]]); circ(0, 0, .25, em); }
  else if (a === 'clock') { circ(0, 0, .8); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r * .6); g.moveTo(0, 0); g.lineTo(r * .4, 0); g.stroke(); }
  else if (a === 'worm') { for (let i = 0; i < 5; i++) circ(.8 - i * .42, Math.sin(t * .1 + i) * .15, .3 - i * .03); }
  else { poly([[-.9, -.2], [-.3, -.8], [.6, -.6], [.9, .1], [.2, .8], [-.7, .6]]); }
  g.restore();
}
