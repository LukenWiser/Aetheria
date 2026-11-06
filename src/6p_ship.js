// ================= SHIP MENUS: every menu floats in the air inside your ship, and buttons fly you between its rooms =================
// The real menu screens (#ui) are placed in 3D with CSS transforms; the ship interior is drawn by the 3D layer behind them.
const SHIPROOM = {
  scMenu: 'bridge', scTut: 'bridge', scUpdates: 'bridge', scName: 'bridge', scCredits: 'bridge', scSlots: 'bridge',
  scModes: 'map', scMap: 'map', scMaps: 'map', scBrief: 'map', scDaily: 'map', scMissions: 'map', scChal: 'map', scCreate: 'map',
  scGalaxy: 'deck',
  scLocker: 'shop', scHangar: 'shop', scCos: 'shop',
  scBase: 'fab', scShop: 'fab',
  scSettings: 'eng', scKeys: 'eng', scJukebox: 'eng', scJuke: 'eng',
  scOnline: 'comms', scRoom: 'comms', scBoards: 'comms', scRanked: 'comms', scInbox: 'comms', scCloud: 'comms', scChSend: 'comms',
  scProfile: 'arch', scStats: 'arch', scLogs: 'arch', scCodex: 'arch', scGallery: 'arch', scTheater: 'arch'
};
if (SET.shipMenu === undefined) SET.shipMenu = true;
if (SETS.GRAPHICS) SETS.GRAPHICS.unshift(['shipMenu', 'tog', 'Ship interior menus', 'Menus float inside your ship - buttons fly you between its rooms']);
// pointer position inside an element, correct even when the menus are tilted in 3D
function locXY(e, el) {
  if (e.target === el && typeof e.offsetX === 'number') return [e.offsetX, e.offsetY];
  const r = el.getBoundingClientRect(); return [(e.clientX - r.left) * el.offsetWidth / Math.max(1, r.width), (e.clientY - r.top) * el.offsetHeight / Math.max(1, r.height)];
}

const SHIP = (() => {
  const T = typeof THREE !== 'undefined' ? THREE : null, TAU = Math.PI * 2, HP = Math.PI / 2;
  const S = { on: false, built: false, room: null, travel: null, mx: 0, my: 0, smx: 0, smy: 0, t: 0, fade: 0, first: true };
  let scene, cam, rooms = {}, doors = [], anim = [], lights = [], camL, hemi, sunD, wrap, camEl, ui, tag, shipObj = null, shipKey = '', shipGrp, arms = [], spray, sprayV, paintT = 0;
  const ORDER = ['bridge', 'map', 'deck', 'shop', 'fab', 'eng', 'comms', 'arch'];
  const NAMES = { bridge: 'BRIDGE', map: 'MAP ROOM', deck: 'STAR DECK', shop: 'WORKSHOP', fab: 'FAB BAY', eng: 'ENGINEERING', comms: 'COMMS', arch: 'ARCHIVE' };
  const COLS = { bridge: '#22d3ee', map: '#fde047', deck: '#a78bfa', shop: '#f472b6', fab: '#34d399', eng: '#fb923c', comms: '#38bdf8', arch: '#e2e8f0' };
  const HUB_A = 5, R0 = 16, DOORW = 2.6, DOORH = 3.1;

  // ---------- small helpers ----------
  let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ctex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };
  const EM = {}; const emi = (c, i = 1.6) => { const k = c + ':' + i; return EM[k] || (EM[k] = new T.MeshStandardMaterial({ color: 0x000000, emissive: new T.Color(c), emissiveIntensity: i })); };
  const std = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, metalness: .7, roughness: .45 }, o || {}));
  const add = (p, o) => { p.add(o); return o; };
  const mesh = (p, geo, mat, x, y, z, rx, ry, rz) => { if (mat && mat.userData && mat.userData.tile && geo.attributes.uv) { const P = geo.parameters || {}, tl = mat.userData.tile, gw = (P.width || (P.radius || 1) * 2) / tl, gh = (P.height || (P.radius || 1) * 2) / tl, uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * gw, uv.getY(i) * gh); } const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); p.add(m); return m; };
  const box = (p, w, h, d, mat, x, y, z, ry) => mesh(p, new T.BoxGeometry(w, h, d), mat, x, y, z, 0, ry || 0, 0);
  let glowTex; const glow = (p, c, s, o = 1) => { const m = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: new T.Color(c), transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false })); m.scale.setScalar(s); p.add(m); return m; };
  const holoM = (c, o) => new T.MeshBasicMaterial({ color: new T.Color(c), transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let M = {};
  function mats() {
    glowTex = ctex(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
    const HT = hiTex(); kit();
    const wallT = HT.wall, floorT = HT.floor, ceilT = HT.ceil;
    M = { wallT, floorT, ceilT, trim: std(0x5b6b82, { metalness: .9, roughness: .3 }), dark: std(0x101722, { metalness: .85, roughness: .35 }), mid: std(0x2b3647, { metalness: .8, roughness: .4 }), gold: std(0xb98a2e, { metalness: 1, roughness: .28 }), glass: new T.MeshStandardMaterial({ color: 0x9be7ff, transparent: true, opacity: .12, metalness: .2, roughness: .05, side: T.DoubleSide, depthWrite: false }) };
  }
  const TXM = {}; const texMat = (t, w, h, col, o) => { const k = t.uuid + (col || 0) + JSON.stringify(o || {}); return TXM[k] || (TXM[k] = std(col || 0xffffff, Object.assign({ map: t, bumpMap: t, bumpScale: .035, metalness: .6, roughness: .62 }, o || {}, { userData: { tile: (t.userData && t.userData.tile) || 3 } }))); };
  const plane = (p, w, h, mat, x, y, z, rx, ry) => mesh(p, new T.PlaneGeometry(w, h), mat, x, y, z, rx, ry, 0);
  const label = (txt, col, w = 512, h = 96) => ctex(w, h, (g) => { g.fillStyle = 'rgba(4,10,20,.85)'; g.fillRect(0, 0, w, h); g.strokeStyle = col; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = col; g.fillRect(14, 14, 10, h - 28); g.font = 'italic 900 ' + (h * .5 | 0) + 'px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillStyle = '#f0f9ff'; g.fillText(txt, 40, h / 2 + 2); });
  const screenT = (c, kind) => ctex(256, 160, (g, w, h) => { g.fillStyle = '#04111c'; g.fillRect(0, 0, w, h); g.strokeStyle = c; g.globalAlpha = .25; for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.globalAlpha = 1; g.lineWidth = 2;
    if (kind === 1) { for (let i = 0; i < 7; i++) { g.fillStyle = c; g.globalAlpha = .35 + rnd() * .5; const bh = 20 + rnd() * 100; g.fillRect(14 + i * 34, h - 14 - bh, 22, bh); } g.globalAlpha = 1; }
    else if (kind === 2) { g.strokeStyle = c; g.beginPath(); g.arc(w / 2, h / 2, 56, 0, TAU); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 30, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + 56, h / 2 - 20); g.stroke(); for (let i = 0; i < 6; i++) { g.fillStyle = c; g.fillRect(w / 2 + (rnd() - .5) * 100, h / 2 + (rnd() - .5) * 100, 4, 4); } }
    else { g.strokeStyle = c; g.beginPath(); for (let x = 0; x < w; x += 3) g.lineTo(x, h * .55 + Math.sin(x * .06 + rnd() * .4) * 30 * (.4 + rnd() * .6)); g.stroke(); g.fillStyle = c; g.font = 'bold 14px monospace'; g.fillText('SYS ' + (rnd() * 999 | 0) + '  OK', 10, 20); } });

  // ---------- generic room: floor, ceiling, paneled walls, ribs, light strips, a door gap facing the hub ----------
  function shell(G, w, d, h, o = {}) {
    const col = o.col || '#22d3ee'; G.userData.dim = { w, d, h, col, noCeil: !!o.noCeil };
    plane(G, w, d, texMat(M.floorT, w, d, 0xa8b4c4, { metalness: .5, roughness: .7 }), 0, 0, -d / 2, -HP, 0);
    if (!o.noCeil) plane(G, w, d, texMat(M.ceilT, w, d, 0xffffff), 0, h, -d / 2, HP, 0);
    const wm = texMat(M.wallT, Math.max(w, d), h, 0xffffff);
    // side walls and far wall
    plane(G, d, h, wm, -w / 2, h / 2, -d / 2, 0, HP); plane(G, d, h, wm, w / 2, h / 2, -d / 2, 0, -HP);
    if (!o.window) plane(G, w, h, wm, 0, h / 2, -d, 0, 0);
    // door wall (facing into the room) with the gap
    const side = (w - DOORW) / 2; [-1, 1].forEach(s => plane(G, side, h, wm, s * (DOORW / 2 + side / 2), h / 2, 0, 0, Math.PI)); plane(G, DOORW, h - DOORH, wm, 0, DOORH + (h - DOORH) / 2, 0, 0, Math.PI);
    // ribs + floor edge glow + ceiling light panels
    for (let z = -2; z > -d + 1; z -= 3) [-1, 1].forEach(s => { box(G, .35, h, .4, M.trim, s * (w / 2 - .17), h / 2, z); box(G, .06, h * .7, .06, emi(col, 1.4), s * (w / 2 - .36), h * .45, z); });
    [[w, .05, .07, 0, .03, -d + .06], [.07, .05, d, -w / 2 + .06, .03, -d / 2], [.07, .05, d, w / 2 - .06, .03, -d / 2]].forEach(a => box(G, a[0], a[1], a[2], emi(col, 1.5), a[3], a[4], a[5]));
    if (!o.noCeil) for (let z = -2.5; z > -d + 1; z -= 4) [-1, 1].forEach(s => box(G, 1.6, .05, .5, emi('#dbeafe', .9), s * w * .22, h - .03, z));
    // wall consoles along the side walls
    for (let z = -3.5; z > -d + 2; z -= 3) { if (o.noConsoles) break; [-1, 1].forEach(s => { if (rnd() < .35) return; const c = new T.Group(); c.position.set(s * (w / 2 - .5), 0, z); c.rotation.y = -s * HP; G.add(c); box(c, 1.4, .9, .6, M.dark, 0, .45, 0); const sc = plane(c, 1.1, .55, new T.MeshBasicMaterial({ map: screenT(col, (rnd() * 3) | 0) }), 0, 1.35, -.18, -.25, 0); box(c, 1.2, .08, .1, emi(col, 1.6), 0, .92, .28); }); }
    // sliding door in the door gap
    const dg = new T.Group(); G.add(dg); const fr = M.trim;
    [-1, 1].forEach(s => box(dg, .3, DOORH + .3, .5, fr, s * (DOORW / 2 + .15), (DOORH + .3) / 2, 0)); box(dg, DOORW + .6, .3, .5, fr, 0, DOORH + .15, 0); box(dg, DOORW, .06, .52, emi(col, 2.2), 0, DOORH - .02, 0);
    const L = []; [-1, 1].forEach(s => { const lf = box(dg, DOORW / 2, DOORH, .14, M.mid, s * DOORW / 4, DOORH / 2, 0); box(lf, .05, DOORH * .7, .16, emi(col, 1.8), -s * (DOORW / 4 - .12), 0, 0); L.push([lf, s]); });
    doors.push({ G, L, o: 0, wp: new T.Vector3() });
  }
  // corridor from the room's door (local z=0) back to the hub (local z = R0 - HUB_A)
  function corridor(G, col) {
    const L = R0 - HUB_A, cw = 3, ch = 3.4, C = new T.Group(); C.position.z = L / 2; G.add(C);
    plane(C, cw, L, texMat(M.floorT, cw, L, 0xa8b4c4), 0, 0, 0, -HP, 0); plane(C, cw, L, texMat(M.ceilT, cw, L, 0xffffff), 0, ch, 0, HP, 0);
    const wm = texMat(M.wallT, L, ch, 0xffffff); plane(C, L, ch, wm, -cw / 2, ch / 2, 0, 0, HP); plane(C, L, ch, wm, cw / 2, ch / 2, 0, 0, -HP);
    for (let z = -L / 2 + 1; z < L / 2; z += 2) { const rib = mesh(C, new T.TorusGeometry(1.6, .1, 6, 4, Math.PI), M.trim, 0, 1.55, z, 0, 0, 0); rib.rotation.z = Math.PI / 4 - Math.PI / 4; box(C, 2.2, .04, .06, emi('#bfe3ff', 1.6), 0, ch - .03, z); box(C, .05, .04, .5, emi(col, 1.8), -cw / 2 + .08, .03, z); box(C, .05, .04, .5, emi(col, 1.8), cw / 2 - .08, .03, z); }
    // arrows on the floor pointing into the room
    for (let z = -L / 2 + 2; z < L / 2 - 1; z += 3) { const a = mesh(C, new T.CircleGeometry(.35, 3), emi(col, 1.2), 0, .02, z, -HP, 0, 0); a.rotation.z = Math.PI / 2; }
  }

  // ================= V77: detail pass - real surface textures, structure, clutter, life =================
  // ---- hi-res procedural surfaces (albedo doubles as a bump map so seams, rivets and plates catch the light) ----
  function hiTex() {
    const S = 1024, R = () => rnd();
    const rivet = (g, x, y, r) => { const gr = g.createRadialGradient(x - r * .3, y - r * .3, 0, x, y, r); gr.addColorStop(0, '#c9d4e3'); gr.addColorStop(.6, '#6b7a90'); gr.addColorStop(1, '#1b2230'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const bevel = (g, x, y, w, h, lw) => { g.lineWidth = lw; g.strokeStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y); g.lineTo(x + w, y); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.stroke(); };
    const grime = (g, n, S2) => { for (let i = 0; i < n; i++) { const x = R() * S2, y = R() * S2, r = 30 + R() * 160, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,' + (.06 + R() * .1) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } for (let i = 0; i < n * 2; i++) { g.fillStyle = 'rgba(0,0,0,' + (.04 + R() * .06) + ')'; g.fillRect(R() * S2, R() * S2, 1 + R() * 2, 20 + R() * 90); } };
    const stencils = ['DECK 03', 'AUX PWR', 'NO STEP', 'CAUTION', 'HULL 7-B', 'O2 LINE', 'SECTOR C', 'COOLANT', 'DATA BUS', 'KEEP CLEAR', 'Ø 4.2', 'ACCESS 12'];
    const wall = ctex(S, S, g => {
      const bg = g.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, '#2c374b'); bg.addColorStop(1, '#232c3c'); g.fillStyle = bg; g.fillRect(0, 0, S, S);
      // cable channel along the top, kick plate along the bottom
      g.fillStyle = '#161c28'; g.fillRect(0, 0, S, 70); for (let x = 10; x < S; x += 46) { g.fillStyle = '#0c1018'; g.fillRect(x, 14, 30, 42); } bevel(g, 0, 0, S, 70, 3);
      g.fillStyle = '#141924'; g.fillRect(0, S - 120, S, 120); g.save(); g.beginPath(); g.rect(0, S - 110, S, 34); g.clip(); g.fillStyle = '#1a1a1a'; g.fillRect(0, S - 110, S, 34); g.fillStyle = '#d99a1e'; for (let x = -40; x < S + 40; x += 40) { g.beginPath(); g.moveTo(x, S - 76); g.lineTo(x + 20, S - 110); g.lineTo(x + 40, S - 110); g.lineTo(x + 20, S - 76); g.fill(); } g.restore();
      for (let x = 0; x < S; x += 128) { rivet(g, x + 20, S - 40, 5); rivet(g, x + 108, S - 40, 5); }
      // four big plates, each with an inset sub-panel and its own personality
      for (let py = 0; py < 2; py++) for (let px = 0; px < 2; px++) {
        const x = px * 512 + 10, y = 80 + py * 412, w = 492, h = 396, tone = 38 + (R() * 10 | 0);
        g.fillStyle = 'rgb(' + tone + ',' + (tone + 9) + ',' + (tone + 24) + ')'; g.fillRect(x, y, w, h); bevel(g, x, y, w, h, 4);
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 30, y + 30, w - 60, h - 60); bevel(g, x + 30, y + 30, w - 60, h - 60, 3);
        [[x + 14, y + 14], [x + w - 14, y + 14], [x + 14, y + h - 14], [x + w - 14, y + h - 14]].forEach(([a, b]) => rivet(g, a, b, 6));
        const kind = (px + py * 2 + (R() * 4 | 0)) % 4;
        if (kind === 0) { for (let i = 0; i < 9; i++) { g.fillStyle = '#0a0d14'; g.fillRect(x + 90, y + 90 + i * 22, w - 180, 10); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + 90, y + 100 + i * 22, w - 180, 2); } }
        else if (kind === 1) { g.font = '900 40px monospace'; g.fillStyle = 'rgba(203,213,225,.32)'; g.fillText(stencils[R() * stencils.length | 0], x + 60, y + 120); g.font = '700 22px monospace'; g.fillText('REF ' + ((R() * 9000 | 0) + 1000), x + 60, y + 160); g.fillStyle = 'rgba(250,204,21,.6)'; g.fillRect(x + 60, y + 200, 120, 10); }
        else if (kind === 2) { g.fillStyle = '#0d1119'; g.fillRect(x + w / 2 - 70, y + h / 2 - 90, 140, 180); bevel(g, x + w / 2 - 70, y + h / 2 - 90, 140, 180, 3); for (let i = 0; i < 4; i++) { g.fillStyle = ['#22d3ee', '#4ade80', '#fbbf24', '#f43f5e'][i]; g.globalAlpha = .7; g.fillRect(x + w / 2 - 50 + i * 28, y + h / 2 - 70, 14, 8); } g.globalAlpha = 1; g.fillStyle = '#1e293b'; g.fillRect(x + w / 2 - 50, y + h / 2 - 40, 100, 110); }
        else { for (let i = 0; i < 3; i++) { const yy = y + 110 + i * 90; g.fillStyle = '#4a5568'; g.fillRect(x + 40, yy, w - 80, 22); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 40, yy, w - 80, 4); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 40, yy + 18, w - 80, 4); rivet(g, x + 60, yy + 11, 7); rivet(g, x + w - 60, yy + 11, 7); } }
      }
      grime(g, 40, S);
    });
    const floor = ctex(S, S, g => {
      g.fillStyle = '#1b2230'; g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 24) for (let x = (y / 24 % 2) * 12; x < S; x += 24) { g.save(); g.translate(x, y); g.rotate(.6); g.fillStyle = 'rgba(255,255,255,.09)'; g.fillRect(-7, -2, 14, 4); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-7, 2, 14, 2); g.restore(); }
      for (let i = 0; i <= S; i += 512) { g.fillStyle = '#0a0d14'; g.fillRect(i - 4, 0, 8, S); g.fillRect(0, i - 4, S, 8); }
      for (let y = 0; y < S; y += 512) for (let x = 0; x < S; x += 512) [[20, 20], [492, 20], [20, 492], [492, 492], [256, 20], [256, 492], [20, 256], [492, 256]].forEach(([a, b]) => rivet(g, x + a, y + b, 7));
      g.fillStyle = 'rgba(250,204,21,.28)'; g.fillRect(0, 40, S, 6); g.fillRect(0, S - 46, S, 6);
      for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,255,255,' + (.02 + R() * .03) + ')'; g.beginPath(); g.ellipse(R() * S, R() * S, 40 + R() * 120, 10 + R() * 40, R() * 3, 0, TAU); g.fill(); }
      grime(g, 30, S);
    });
    const ceil = ctex(S, S, g => {
      g.fillStyle = '#171e2b'; g.fillRect(0, 0, S, S);
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const X = x * 512, Y = y * 512; g.fillStyle = '#1f2838'; g.fillRect(X + 12, Y + 12, 488, 488); bevel(g, X + 12, Y + 12, 488, 488, 4);
        if ((x + y) % 2) { g.fillStyle = '#0b0f17'; g.beginPath(); g.arc(X + 256, Y + 256, 150, 0, TAU); g.fill(); for (let a = 0; a < 8; a++) { g.save(); g.translate(X + 256, Y + 256); g.rotate(a / 8 * TAU); g.fillStyle = '#2f3a4e'; g.fillRect(-14, 20, 28, 120); g.restore(); } rivet(g, X + 256, Y + 256, 18); }
        else { for (let i = 0; i < 12; i++) { g.fillStyle = '#0b0f17'; g.fillRect(X + 70, Y + 70 + i * 32, 372, 16); } } }
      grime(g, 20, S);
    });
    [wall, floor, ceil].forEach((t, i) => { t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; t.userData = { tile: [3.4, 4, 4][i] }; });
    return { wall, floor, ceil };
  }
  // ---- small kit of parts ----
  const PART = {};
  function kit() {
    const metalT = ctex(256, 256, g => { g.fillStyle = '#5b6474'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(' + (R2() > .5 ? '255,255,255' : '0,0,0') + ',' + (.03 + R2() * .05) + ')'; g.fillRect(R2() * 256, R2() * 256, 2 + R2() * 40, 1); } });
    function R2() { return rnd(); }
    const crateT = ctex(256, 256, g => { g.fillStyle = '#3d4a3a'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#1c231b'; g.lineWidth = 14; g.strokeRect(7, 7, 242, 242); g.beginPath(); g.moveTo(14, 14); g.lineTo(242, 242); g.stroke(); g.fillStyle = 'rgba(250,204,21,.8)'; g.font = '900 34px monospace'; g.fillText('SUPPLY', 62, 140); g.fillStyle = 'rgba(255,255,255,.4)'; g.font = '700 16px monospace'; g.fillText('LOT ' + (100 + (rnd() * 800 | 0)), 80, 170); });
    const crateT2 = ctex(256, 256, g => { g.fillStyle = '#4b3b2a'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, 256, 3); } g.strokeStyle = '#2a1f14'; g.lineWidth = 12; g.strokeRect(6, 6, 244, 244); g.fillStyle = 'rgba(244,63,94,.85)'; g.font = '900 30px monospace'; g.fillText('FRAGILE', 58, 136); });
    const barrelT = ctex(128, 256, g => { g.fillStyle = '#9a3412'; g.fillRect(0, 0, 128, 256); [40, 128, 216].forEach(y => { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y - 6, 128, 12); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, y - 6, 128, 3); }); g.fillStyle = '#fde047'; g.fillRect(30, 80, 68, 30); g.fillStyle = '#111'; g.font = '900 20px monospace'; g.fillText('FUEL', 40, 102); });
    const lockerT = ctex(128, 256, g => { g.fillStyle = '#334155'; g.fillRect(0, 0, 128, 256); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 4; g.strokeRect(4, 4, 120, 248); for (let i = 0; i < 6; i++) { g.fillStyle = '#0f172a'; g.fillRect(30, 20 + i * 10, 68, 5); } g.fillStyle = '#94a3b8'; g.fillRect(100, 120, 8, 40); g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '700 16px monospace'; g.fillText((rnd() * 90 + 10 | 0) + '', 48, 230); });
    const posterT = (title, col) => ctex(256, 360, g => { const gr = g.createLinearGradient(0, 0, 0, 360); gr.addColorStop(0, '#0b1020'); gr.addColorStop(1, '#1e1b4b'); g.fillStyle = gr; g.fillRect(0, 0, 256, 360); g.fillStyle = col; g.beginPath(); g.arc(128, 150, 80, 0, TAU); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(150, 130, 80, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.font = '900 30px sans-serif'; g.textAlign = 'center'; g.fillText(title, 128, 290); g.font = '700 14px monospace'; g.fillStyle = col; g.fillText('AETHERIA FLEET', 128, 320); g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(3, 3, 250, 354); });
    const bookT = ctex(64, 64, g => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#7f1d1d', '#1e3a8a', '#14532d', '#78350f', '#4c1d95', '#334155', '#9a3412', '#0f766e'][i]; g.fillRect(i * 8, 0, 8, 64); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(i * 8 + 2, 10, 4, 3); } });
    Object.assign(PART, {
      metal: std(0x9aa3b2, { map: metalT, metalness: .85, roughness: .38 }), pipeC: std(0x8b5a2b, { metalness: .9, roughness: .35 }), pipeB: std(0x2563eb, { metalness: .7, roughness: .4 }), pipeG: std(0x4b5563, { metalness: .9, roughness: .3 }),
      rubber: std(0x111318, { metalness: .1, roughness: .9 }), crate: std(0xffffff, { map: crateT, metalness: .2, roughness: .8 }), crate2: std(0xffffff, { map: crateT2, metalness: .1, roughness: .85 }), barrel: std(0xffffff, { map: barrelT, metalness: .6, roughness: .45 }),
      locker: std(0xffffff, { map: lockerT, metalness: .7, roughness: .45 }), red: std(0xb91c1c, { metalness: .4, roughness: .4 }), yellow: std(0xeab308, { metalness: .4, roughness: .5 }), wood: std(0x6b4423, { metalness: .05, roughness: .8 }),
      leaf: std(0x2f7d4f, { metalness: 0, roughness: .8, flatShading: true }), leaf2: std(0x3fa463, { metalness: 0, roughness: .8, flatShading: true }), soil: std(0x3b2a1e, { metalness: 0, roughness: 1 }), cloth: std(0x1e293b, { metalness: 0, roughness: .95 }), cloth2: std(0x7c2d12, { metalness: 0, roughness: .95 }),
      books: std(0xffffff, { map: bookT, metalness: 0, roughness: .9 }), posterT
    });
    PART.bump = 0;
  }
  // pipes along a wall, with brackets, flanges and the odd valve wheel
  function pipeRun(G, x, y, z0, z1, n, mats, side) {
    const L = Math.abs(z1 - z0), zc = (z0 + z1) / 2;
    for (let i = 0; i < n; i++) { const r = .07 + (i % 2) * .03; mesh(G, new T.CylinderGeometry(r, r, L, 12), mats[i % mats.length], x - side * i * .2, y - i * .22, zc, HP, 0, 0); }
    for (let z = Math.min(z0, z1) + .6; z < Math.max(z0, z1) - .3; z += 1.8) { box(G, .1, .3 + n * .22, .14, PART.metal, x + side * .05, y - n * .11 + .1, z); for (let i = 0; i < n; i++) mesh(G, new T.CylinderGeometry(.13 + (i % 2) * .03, .13 + (i % 2) * .03, .08, 12), PART.pipeG, x - side * i * .2, y - i * .22, z + .5, HP, 0, 0); if (rnd() < .3) { const v = mesh(G, new T.TorusGeometry(.16, .025, 6, 16), PART.red, x - side * .2 * (n - 1) - side * .2, y - (n - 1) * .22, z + .9, 0, HP, 0); mesh(G, new T.CylinderGeometry(.03, .03, .2, 6), PART.metal, x - side * .2 * (n - 1) - side * .1, y - (n - 1) * .22, z + .9, 0, 0, HP); } }
  }
  // a sagging cable bundle between two points
  function cable(G, a, b, sag, col, r) { const m = new T.Vector3().addVectors(a, b).multiplyScalar(.5); m.y -= sag; const cu = new T.QuadraticBezierCurve3(a, m, b); mesh(G, new T.TubeGeometry(cu, 16, r || .03, 6, false), col || PART.rubber); }
  function crate(G, x, z, s, ry, y, alt) { const c = box(G, s, s, s, alt ? PART.crate2 : PART.crate, x, (y || 0) + s / 2, z, ry || 0); return c; }
  function barrel(G, x, z, y) { mesh(G, new T.CylinderGeometry(.32, .32, .9, 16), PART.barrel, x, (y || 0) + .45, z); mesh(G, new T.CylinderGeometry(.34, .34, .04, 16), PART.pipeG, x, (y || 0) + .9, z); }
  function locker(G, x, z, ry, n) { const L = new T.Group(); L.position.set(x, 0, z); L.rotation.y = ry; G.add(L); for (let i = 0; i < n; i++) { box(L, .55, 1.9, .5, PART.locker, (i - (n - 1) / 2) * .58, .95, 0); } box(L, n * .58 + .1, .08, .55, PART.metal, 0, 1.94, 0); return L; }
  function extinguisher(G, x, z, ry) { const E = new T.Group(); E.position.set(x, 0, z); E.rotation.y = ry; G.add(E); box(E, .3, .5, .06, PART.metal, 0, 1.1, -.03); mesh(E, new T.CylinderGeometry(.09, .09, .45, 12), PART.red, 0, 1.05, .08); mesh(E, new T.CylinderGeometry(.03, .04, .1, 8), PART.rubber, 0, 1.33, .08); box(E, .3, .12, .02, emi('#f43f5e', 1.2), 0, 1.45, -.02); }
  function plant(G, x, z, s) { const P = new T.Group(); P.position.set(x, 0, z); P.scale.setScalar(s || 1); G.add(P); mesh(P, new T.CylinderGeometry(.35, .28, .6, 12), PART.metal, 0, .3, 0); mesh(P, new T.CylinderGeometry(.32, .32, .04, 12), PART.soil, 0, .6, 0); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, l = mesh(P, new T.ConeGeometry(.12, .9, 4), i % 2 ? PART.leaf : PART.leaf2, Math.cos(a) * .12, 1.0, Math.sin(a) * .12); l.rotation.set(Math.sin(a) * .6, 0, -Math.cos(a) * .6); } mesh(P, new T.IcosahedronGeometry(.28, 0), PART.leaf2, 0, 1.25, 0); box(P, .3, .03, .02, emi('#4ade80', 1.2), 0, .5, .34); }
  function chair(G, x, z, ry) { const C = new T.Group(); C.position.set(x, 0, z); C.rotation.y = ry; G.add(C); mesh(C, new T.CylinderGeometry(.05, .05, .45, 8), PART.metal, 0, .25, 0); mesh(C, new T.CylinderGeometry(.3, .3, .05, 5), PART.metal, 0, .04, 0); box(C, .55, .1, .5, PART.cloth, 0, .5, 0); box(C, .55, .6, .08, PART.cloth, 0, .85, .24); return C; }
  function desk(G, x, z, ry, col) { const D = new T.Group(); D.position.set(x, 0, z); D.rotation.y = ry; G.add(D); box(D, 1.6, .06, .7, PART.metal, 0, .76, 0); [-1, 1].forEach(s => box(D, .06, .76, .66, PART.pipeG, s * .76, .38, 0)); const sc = plane(D, .7, .42, new T.MeshBasicMaterial({ map: screenT(col, rnd() * 3 | 0) }), -.2, 1.1, -.2, -.15, 0); box(D, .74, .46, .03, M.dark, -.2, 1.1, -.22); box(D, .05, .26, .05, PART.metal, -.2, .9, -.22); box(D, .5, .02, .16, M.dark, -.1, .8, .1); mesh(D, new T.CylinderGeometry(.04, .035, .1, 10), PART.red, .5, .84, .05); return D; }
  function serverRack(G, x, z, ry, col) { const R = new T.Group(); R.position.set(x, 0, z); R.rotation.y = ry; G.add(R); box(R, .7, 2.2, .8, M.dark, 0, 1.1, 0); const leds = []; for (let i = 0; i < 10; i++) { box(R, .6, .14, .02, PART.pipeG, 0, .3 + i * .18, .41); const l = box(R, .04, .03, .02, emi(i % 3 ? col : '#4ade80', 2.2), -.22 + (i % 4) * .05, .3 + i * .18, .42); leds.push(l); } anim.push((dt, c) => { leds.forEach((l, i) => { l.visible = Math.sin(c * (4 + i % 5) + i * 3.1) > -.2; }); }); return R; }
  function hangLamp(G, x, y, z, len, col) { mesh(G, new T.CylinderGeometry(.01, .01, len, 4), PART.rubber, x, y - len / 2, z); mesh(G, new T.ConeGeometry(.3, .25, 12, 1, true), PART.metal, x, y - len - .1, z); const b = mesh(G, new T.SphereGeometry(.09, 10, 8), emi(col || '#fff7e0', 2.4), x, y - len - .18, z); glow(G, col || '#ffe8c2', 1.1, .35).position.set(x, y - len - .25, z); return b; }
  function poster(G, x, y, z, ry, title, col) { plane(G, .8, 1.12, std(0xffffff, { map: PART.posterT(title, col), metalness: 0, roughness: .7 }), x, y, z, 0, ry); }
  function sign(G, txt, col, x, y, z, ry, w) { plane(G, w || 1.6, (w || 1.6) * .19, new T.MeshBasicMaterial({ map: label(txt, col) }), x, y, z, 0, ry); }
  function dust(G, w, d, h, col) { const N = 140, p = new Float32Array(N * 3); for (let i = 0; i < N; i++) { p[i * 3] = (rnd() - .5) * w; p[i * 3 + 1] = rnd() * h; p[i * 3 + 2] = -rnd() * d; } const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(p, 3)); const pts = new T.Points(geo, new T.PointsMaterial({ color: new T.Color(col || '#cbd5e1'), size: .035, map: glowTex, transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending })); G.add(pts); anim.push((dt, c) => { const a = geo.attributes.position.array; for (let i = 0; i < N; i++) { a[i * 3 + 1] += dt * .05; a[i * 3] += Math.sin(c * .3 + i) * dt * .02; if (a[i * 3 + 1] > h) a[i * 3 + 1] = 0; } geo.attributes.position.needsUpdate = true; }); }
  function steam(G, x, y, z, col) { const puffs = []; for (let i = 0; i < 6; i++) { const s = glow(G, col || '#e2e8f0', .4, 0); s.position.set(x, y, z); puffs.push({ s, t: i / 6 }); } anim.push(dt => puffs.forEach(p => { p.t += dt * .35; if (p.t > 1) p.t -= 1; p.s.position.set(x + Math.sin(p.t * 6) * .1, y + p.t * 1.6, z); p.s.scale.setScalar(.3 + p.t * 1.4); p.s.material.opacity = .35 * Math.sin(p.t * Math.PI); })); }
  function beacon(G, x, y, z, col) { const B = new T.Group(); B.position.set(x, y, z); G.add(B); mesh(B, new T.CylinderGeometry(.12, .14, .16, 12), PART.metal); const dome = mesh(B, new T.SphereGeometry(.12, 12, 8, 0, TAU, 0, HP), new T.MeshStandardMaterial({ color: 0x220000, emissive: new T.Color(col), emissiveIntensity: 1.2, transparent: true, opacity: .9 }), 0, .08, 0); const g2 = glow(B, col, .9, .6); g2.position.y = .12; const arm = new T.Group(); arm.position.y = .12; B.add(arm); const beam = mesh(arm, new T.ConeGeometry(.6, 2.2, 12, 1, true), holoM(col, .12), 1.1, 0, 0, 0, 0, HP); anim.push((dt, c) => { arm.rotation.y += dt * 3; g2.material.opacity = .4 + .3 * Math.sin(c * 6); }); }
  function catwalk(G, x0, x1, y, z, depth) { const L = Math.abs(x1 - x0), xc = (x0 + x1) / 2; box(G, L, .06, depth, PART.metal, xc, y, z); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1) + .01; x += 1) { box(G, .05, 1, .05, PART.pipeG, x, y + .5, z + depth / 2); } box(G, L, .05, .05, PART.yellow, xc, y + 1, z + depth / 2); box(G, L, .04, .04, PART.pipeG, xc, y + .55, z + depth / 2); }
  function shelf(G, x, z, ry, w, levels) { const S2 = new T.Group(); S2.position.set(x, 0, z); S2.rotation.y = ry; G.add(S2); [-1, 1].forEach(s => box(S2, .06, levels * .55 + .2, .5, PART.pipeG, s * w / 2, (levels * .55 + .2) / 2, 0)); for (let i = 0; i < levels; i++) { box(S2, w, .04, .5, PART.metal, 0, .2 + i * .55, 0); let cx = -w / 2 + .15; while (cx < w / 2 - .25) { const t = rnd(); if (t < .35) { const s = .2 + rnd() * .2; box(S2, s, s, s, rnd() < .5 ? PART.crate : PART.crate2, cx + s / 2, .22 + i * .55 + s / 2, 0, rnd() * .4); cx += s + .08; } else if (t < .6) { mesh(S2, new T.CylinderGeometry(.08, .08, .22, 10), [PART.red, PART.yellow, PART.pipeB][rnd() * 3 | 0], cx + .08, .33 + i * .55, 0); cx += .2; } else { box(S2, .3, .3, .36, PART.books, cx + .15, .37 + i * .55, 0); cx += .34; } } } return S2; }

  // ---- generic dressing for every room: structure overhead, services on the walls, clutter in the corners, life in the air ----
  function dress(G, k) {
    const D = G.userData.dim; if (!D) return; const { w, d, h, col } = D, hasCeil = !D.noCeil;
    if (hasCeil) {
      // ceiling beams and a cable tray
      [-1, 1].forEach(s => box(G, .3, .4, d - .4, PART.metal, s * w * .3, h - .22, -d / 2));
      for (let z = -1.5; z > -d + .5; z -= 3) box(G, w - .6, .3, .25, PART.metal, 0, h - .2, z);
      box(G, .6, .06, d - 1, PART.pipeG, w * .38 * (k === 'shop' ? -1 : 1), h - .55, -d / 2); for (let i = 0; i < 4; i++) mesh(G, new T.CylinderGeometry(.04, .04, d - 1.2, 6), [PART.rubber, PART.pipeB, PART.red, PART.rubber][i], w * .38 * (k === 'shop' ? -1 : 1) - .2 + i * .13, h - .49, -d / 2, HP, 0, 0);
      for (let z = -1; z > -d + 1; z -= 2.5) mesh(G, new T.CylinderGeometry(.015, .015, .5, 4), PART.metal, w * .38 * (k === 'shop' ? -1 : 1), h - .3, z);
      // a couple of sagging cables between the beams
      for (let i = 0; i < 3; i++) { const z = -2 - i * (d - 3) / 3; cable(G, new T.Vector3(-w * .3, h - .35, z), new T.Vector3(w * .3, h - .35, z - .8), .5 + rnd() * .4, i % 2 ? PART.rubber : PART.pipeB, .025); }
    }
    // pipes high on both side walls
    if (k !== 'bridge') { pipeRun(G, -w / 2 + .35, h - .9, -.8, -d + .3, 3, [PART.pipeG, PART.pipeC, PART.pipeB], -1); pipeRun(G, w / 2 - .35, h - 1.1, -.8, -d + .3, 2, [PART.pipeC, PART.pipeG], 1); }
    // floor cable runs and a centre grate with under-glow
    [-1, 1].forEach(s => { box(G, .18, .05, d - 1, PART.rubber, s * (w / 2 - .45), .025, -d / 2); });
    if (!['shop', 'eng', 'map', 'deck'].includes(k)) { box(G, 1.2, .02, d - 3, std(0x0b0f17, { metalness: .8, roughness: .5 }), 0, .012, -d / 2 - .5); for (let z = -2; z > -d + 1.5; z -= .3) box(G, 1.2, .025, .04, PART.pipeG, 0, .02, z); box(G, 1.24, .01, d - 3, emi(col, .35), 0, .006, -d / 2 - .5); }
    // the services everyone needs: extinguisher and a sign by the door, a locker bank, a waste bin, a vent with a fan
    extinguisher(G, w / 2 - .06, -1.2, -HP);
    sign(G, NAMES[k], col, -w / 2 + .04, h - 1.5, -1.6, HP, 1.4);
    if (!['bridge', 'eng', 'arch'].includes(k)) locker(G, -w / 2 + .3, -d + 1.2, HP, 3);
    mesh(G, new T.CylinderGeometry(.22, .18, .55, 12), PART.pipeG, w / 2 - .5, .28, -2.2);
    const fan = new T.Group(); fan.position.set(w / 2 - .02, h - 1.8, -d * .6); fan.rotation.y = -HP; G.add(fan); mesh(fan, new T.CylinderGeometry(.42, .42, .06, 20), M.dark, 0, 0, 0, HP, 0, 0); const blades = new T.Group(); fan.add(blades); for (let i = 0; i < 5; i++) box(blades, .08, .7, .02, PART.metal, 0, 0, .02).rotation.z = i / 5 * Math.PI; anim.push(dt => { blades.rotation.z += dt * 4; });
    // status lights scattered over the walls
    const leds = []; for (let i = 0; i < 14; i++) { const s = rnd() < .5 ? -1 : 1, z = -1.5 - rnd() * (d - 2.5); leds.push(box(G, .03, .05, .05, emi(['#4ade80', col, '#fbbf24', '#f43f5e'][i % 4], 2.4), s * (w / 2 - .03), .8 + rnd() * 2.6, z)); } anim.push((dt, c) => leds.forEach((l, i) => { l.visible = Math.sin(c * (1.5 + i % 4) + i * 2.3) > -.4; }));
    // a poster or two
    poster(G, w / 2 - .03, 2.2, -d * .45, -HP, ['EXPLORE', 'STAY ALERT', 'FLY SAFE', 'TEAMWORK'][ORDER.indexOf(k) % 4], col);
    dust(G, w - 1, d - 1, h, col);
  }
  // ---- per-room extras ----
  const EXTRA = {
    bridge(G) { const { w, d, h } = G.userData.dim; [-1, 1].forEach(s => { desk(G, s * (w / 2 - 1.3), -6, s * HP, COLS.bridge); chair(G, s * (w / 2 - 2.1), -6, -s * HP); desk(G, s * (w / 2 - 1.3), -9, s * HP, '#fde047'); chair(G, s * (w / 2 - 2.1), -9, -s * HP); plant(G, s * (w / 2 - .7), -3.4, .9); }); [-4.2, 4.2].forEach((x, i) => { plane(G, 1.4, .8, new T.MeshBasicMaterial({ map: screenT(COLS.bridge, i) }), x, h - .8, -d + 4.2, .3, 0); box(G, 1.5, .9, .05, M.dark, x, h - .8, -d + 4.16); }); hangLamp(G, -3, h, -4, .6); hangLamp(G, 3, h, -4, .6); },
    map(G) { const { w, d, h } = G.userData.dim; desk(G, -w / 2 + 1.1, -5, HP, COLS.map); chair(G, -w / 2 + 1.9, -5, -HP); shelf(G, w / 2 - .4, -3.5, -HP, 2.2, 3); const tbl = new T.Group(); tbl.position.set(-3.2, 0, -10); G.add(tbl); box(tbl, 2.2, .08, 1.2, PART.wood, 0, .9, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(tbl, .08, .9, .08, PART.metal, a * 1, .45, b * .5)); plane(tbl, 2, 1.05, std(0xffffff, { map: screenT(COLS.map, 2), metalness: 0, roughness: .8 }), 0, .95, 0, -HP, 0); for (let i = 0; i < 3; i++) mesh(tbl, new T.CylinderGeometry(.05, .05, .9, 10), std(0xe8dcc0, { roughness: .9, metalness: 0 }), -.6 + i * .3, 1.0, -.3, 0, 0, HP); hangLamp(G, -3.2, h, -10, 1.2, '#fff1c2'); plant(G, w / 2 - .8, -d + .9, 1); },
    deck(G) { const { w, d } = G.userData.dim; [[-4.5, -11.3], [5.6, -11.2], [3.2, -11.4], [-5.6, -2]].forEach(([x, z]) => plant(G, x, z, .9 + rnd() * .5)); const tele = new T.Group(); tele.position.set(-4.4, 0, -8.4); G.add(tele); [0, 1, 2].forEach(i => { const a = i / 3 * TAU; const l = mesh(tele, new T.CylinderGeometry(.03, .03, 1.4, 6), PART.metal, Math.cos(a) * .3, .65, Math.sin(a) * .3); l.rotation.set(Math.sin(a) * .3, 0, -Math.cos(a) * .3); }); mesh(tele, new T.CylinderGeometry(.12, .16, 1.4, 16), PART.pipeB, 0, 1.6, 0, -.9, .4, 0); mesh(tele, new T.TorusGeometry(.17, .03, 6, 16), PART.metal, .25, 2.1, -.5, -.9, .4, 0); box(G, 4, .02, 2.6, PART.cloth2, 0, .012, -9.3); },
    shop(G) { const { w, d, h } = G.userData.dim; const wb = new T.Group(); wb.position.set(-5.1, 0, -9.5); wb.rotation.y = HP; G.add(wb); box(wb, 3, .1, 1, PART.wood, 0, .9, 0); [-1.4, 1.4].forEach(x => box(wb, .1, .9, .9, PART.pipeG, x, .45, 0)); box(wb, .3, .25, .2, PART.pipeB, -.9, 1.07, 0); box(wb, .2, .08, .5, PART.red, .4, .99, .1); mesh(wb, new T.CylinderGeometry(.06, .06, .3, 10), PART.yellow, 1.0, 1.1, -.2); for (let i = 0; i < 7; i++) { const t2 = box(G, .04, .4 + rnd() * .3, .1, PART.metal, -w / 2 + .5, 2.3, -8.3 - i * .35); t2.rotation.x = (rnd() - .5) * .3; } for (let i = 0; i < 6; i++) barrel(G, w / 2 - .7 - (i % 2) * .7, -11 - (i / 2 | 0) * .75); [[-w / 2 + 1, -13.6], [-w / 2 + 2.2, -13.8]].forEach(([x, z], i) => { crate(G, x, z, .9, rnd() * .3, 0, i); crate(G, x + .1, z, .6, rnd() * .5, .9, !i); }); const crane = new T.Group(); crane.position.set(0, h - .5, -11.5); G.add(crane); box(crane, w - 1, .3, .4, PART.yellow, 0, 0, 0); const trolley = new T.Group(); crane.add(trolley); box(trolley, .6, .3, .6, M.dark, 0, -.3, 0); mesh(trolley, new T.CylinderGeometry(.015, .015, 1.8, 4), PART.rubber, 0, -1.3, 0); mesh(trolley, new T.TorusGeometry(.12, .03, 6, 12, Math.PI), PART.metal, 0, -2.25, 0, 0, 0, Math.PI); anim.push((dt, c) => { trolley.position.x = Math.sin(c * .15) * (w / 2 - 2); }); const spk = []; for (let i = 0; i < 10; i++) { const s2 = glow(G, '#fde68a', .12, 0); spk.push({ s: s2, v: new T.Vector3(), t: 1 + i * .1 }); } anim.push((dt, c) => spk.forEach(p => { p.t += dt * 1.5; if (p.t > 1) { p.t = 0; p.s.position.set(-5.1, 1.1, -9.1); p.v.set((rnd() - .2) * 1.4, rnd() * 1.8, (rnd() - .5) * 1.2); } p.v.y -= dt * 4; p.s.position.addScaledVector(p.v, dt); p.s.material.opacity = (1 - p.t) * (Math.sin(c * .7) > .2 ? 1 : 0); })); },
    fab(G) { const { w, d, h } = G.userData.dim; shelf(G, -4.6, -11.6, 0, 2, 3); [-4.6, -5.4, -7.6, -8.4].forEach(z => barrel(G, w / 2 - .6, z)); const press = new T.Group(); press.position.set(1.1, 0, -8); G.add(press); box(press, 1.4, .3, 1.2, M.dark, 0, .15, 0); [-1, 1].forEach(s => box(press, .2, 2.4, .2, PART.metal, s * .55, 1.3, 0)); box(press, 1.4, .4, 1.2, PART.yellow, 0, 2.6, 0); const ram = box(press, .9, .4, .8, PART.metal, 0, 1.8, 0); anim.push((dt, c) => { ram.position.y = 1.3 + Math.abs(Math.sin(c * 1.4)) * .9; }); steam(G, 3, 4.6, -9.5, '#fed7aa'); },
    eng(G) { const { w, d, h } = G.userData.dim; catwalk(G, -w / 2 + .3, w / 2 - .3, 4.2, -d + 1.2, 1.2); for (let y = 0; y < 4.2; y += .35) box(G, .5, .04, .04, PART.metal, -w / 2 + .9, y + .2, -d + 2); [-1, 1].forEach(s => box(G, .04, 4.4, .04, PART.metal, -w / 2 + .9 + s * .25, 2.2, -d + 2)); for (let i = 0; i < 3; i++) { const tk = new T.Group(); tk.position.set(-w / 2 + 1, 0, -5.6 - i * 1.6); G.add(tk); mesh(tk, new T.CylinderGeometry(.55, .55, 2.6, 20), i % 2 ? PART.pipeB : PART.pipeG, 0, 1.4, 0); mesh(tk, new T.SphereGeometry(.55, 20, 10, 0, TAU, 0, HP), i % 2 ? PART.pipeB : PART.pipeG, 0, 2.7, 0); box(tk, .3, .4, .05, emi('#38bdf8', 1.4), 0, 1.6, .55); } beacon(G, -w / 2 + .4, h - .8, -2.5, '#f97316'); beacon(G, w / 2 - .4, h - .8, -2.5, '#f97316'); steam(G, -4.2, .1, -4.6); steam(G, w / 2 - 1.2, .1, -5.5); const gauges = new T.Group(); gauges.position.set(w / 2 - .05, 1.6, -9.5); gauges.rotation.y = -HP; G.add(gauges); box(gauges, 2.4, 1.2, .1, M.dark, 0, 0, -.05); const nd = []; for (let i = 0; i < 4; i++) { mesh(gauges, new T.CircleGeometry(.22, 20), std(0xf1f5f9, { metalness: 0, roughness: .6 }), -.85 + i * .57, .15, .01); const n = box(gauges, .02, .18, .01, PART.red, -.85 + i * .57, .15, .02); nd.push(n); box(gauges, .3, .06, .02, emi(['#4ade80', '#fbbf24', '#4ade80', '#f43f5e'][i], 2), -.85 + i * .57, -.32, .02); } anim.push((dt, c) => nd.forEach((n, i) => { n.rotation.z = Math.sin(c * (.6 + i * .3) + i) * 1.2; })); },
    comms(G) { const { w, d } = G.userData.dim; [-4.6, -5.4, -7.6, -8.4].forEach(z => serverRack(G, -w / 2 + .5, z, HP, COLS.comms)); [-4.6, -5.4].forEach(z => serverRack(G, w / 2 - .5, z, -HP, '#a78bfa')); desk(G, -1.6, -8.8, 0, COLS.comms); chair(G, -1.6, -8.1, Math.PI); desk(G, .2, -8.8, 0, '#a78bfa'); chair(G, .2, -8.1, Math.PI); },
    arch(G) { const { w, d, h } = G.userData.dim; shelf(G, -w / 2 + .4, -2.9, HP, 2.4, 4); shelf(G, -w / 2 + .4, -9.6, HP, 2.6, 4); box(G, 3.6, .015, 2.4, PART.cloth2, -2.8, .01, -6.5); [-1, 1].forEach(s => { const ac = new T.Group(); ac.position.set(-1.2, 0, -6.5 + s * 1.1); ac.rotation.y = HP + s * .25; G.add(ac); box(ac, .9, .45, .8, PART.cloth2, 0, .3, 0); box(ac, .9, .6, .2, PART.cloth2, 0, .75, .32); [-1, 1].forEach(t => box(ac, .16, .35, .8, PART.cloth2, t * .45, .55, 0)); }); hangLamp(G, -2.8, h, -6.5, 1.4, '#fff1c2'); plant(G, w / 2 - 1.2, -1.6, 1.1); for (let i = 0; i < 2; i++) { const dc = new T.Group(); dc.position.set(-.4 + i * 1.6, 0, -9.8); G.add(dc); box(dc, .8, 1, .8, M.dark, 0, .5, 0); box(dc, .76, .7, .76, M.glass, 0, 1.35, 0); mesh(dc, i ? new T.TorusKnotGeometry(.15, .05, 48, 8) : new T.IcosahedronGeometry(.2, 0), std(i ? 0xfbbf24 : 0x93c5fd, { metalness: 1, roughness: .2 }), 0, 1.3, 0); } }
  };
  // ---- corridor and hub dressing ----
  function dressCorridor(G, col) {
    const L = R0 - HUB_A, cw = 3, ch = 3.4, C = new T.Group(); C.position.z = L / 2; G.add(C);
    [-1, 1].forEach(s => { box(C, .05, .05, L - .4, PART.metal, s * (cw / 2 - .12), 1.0, 0); for (let z = -L / 2 + .8; z < L / 2; z += 1.6) box(C, .04, .14, .04, PART.metal, s * (cw / 2 - .06), 1.0, z); pipeRun(C, s * (cw / 2 - .18), ch - .35, -L / 2 + .3, L / 2 - .3, 2, s < 0 ? [PART.pipeC, PART.pipeG] : [PART.pipeB, PART.pipeG], s); });
    for (let z = -L / 2 + 1.5; z < L / 2 - 1; z += 3) [-1, 1].forEach(s => { box(C, .06, .18, .3, PART.metal, s * (cw / 2 - .04), 2.2, z); box(C, .03, .12, .24, emi('#fff1d6', 2.2), s * (cw / 2 - .07), 2.2, z); glow(C, '#ffe8c2', .7, .3).position.set(s * (cw / 2 - .2), 2.2, z); });
    box(C, .9, .015, L - .6, std(0x0b0f17, { metalness: .8, roughness: .5 }), 0, .01, 0); box(C, .94, .008, L - .6, emi(col, .5), 0, .004, 0);
    // a terminal and a sign halfway along
    const tm = new T.Group(); tm.position.set(cw / 2 - .3, 0, 0); tm.rotation.y = -HP; C.add(tm); box(tm, .7, 1.1, .3, M.dark, 0, .55, 0); plane(tm, .55, .35, new T.MeshBasicMaterial({ map: screenT(col, 0) }), 0, 1.25, .1, -.4, 0);
    sign(C, '<  ' + 'HUB', '#94a3b8', -cw / 2 + .03, 2.75, L / 2 - 2, HP, 1.1);
  }
  function dressHub(G) {
    const h = 4.5; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; const x = Math.sin(a) * 3.6, z = -Math.cos(a) * 3.6; if (i % 2) plant(G, x, z, .8); else { const bn = new T.Group(); bn.position.set(x, 0, z); bn.rotation.y = -a; G.add(bn); box(bn, 1.2, .1, .45, PART.wood, 0, .45, 0); [-1, 1].forEach(s => box(bn, .06, .45, .4, PART.metal, s * .5, .22, 0)); } }
    mesh(G, new T.TorusGeometry(3.9, .08, 8, 64), PART.metal, 0, h - .5, 0, HP, 0, 0); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; cable(G, new T.Vector3(Math.cos(a) * 3.9, h - .5, Math.sin(a) * 3.9), new T.Vector3(Math.cos(a + .35) * 3.9, h - .5, Math.sin(a + .35) * 3.9), .35, i % 3 ? PART.rubber : PART.pipeB, .02); }
    for (let i = 0; i < 4; i++) hangLamp(G, Math.cos(i / 4 * TAU + .4) * 2.2, h, Math.sin(i / 4 * TAU + .4) * 2.2, .7, '#e0f2fe');
    dust(G, 9, 9, h, '#bae6fd'); G.children.slice(-1)[0].position.z = 4.5;
  }


  // ---- cardboard shipping boxes: kraft board, packing tape, a printed shipping label, ink stamps and handling marks ----
  const CBM = [];
  function cardboard(i) {
    if (CBM[i % 4]) return CBM[i % 4];
    const v = i % 4, dests = ['FAB BAY 03', 'HANGAR 7', 'STATION KESH', 'OUTPOST VELA'], items = ['HULL PLATES', 'DRONE PARTS', 'COOLANT CELLS', 'NAV CHIPS'], stamps = [['FRAGILE', '#b91c1c'], ['INSPECTED', '#1d4ed8'], ['PRIORITY', '#b91c1c'], ['APPROVED', '#15803d']];
    const kraft = (g, W, H) => { g.fillStyle = ['#b98a55', '#c49a64', '#a97c4a', '#bf925c'][v]; g.fillRect(0, 0, W, H); for (let k = 0; k < 900; k++) { g.fillStyle = 'rgba(' + (rnd() < .5 ? '90,60,30' : '235,205,160') + ',' + (.05 + rnd() * .08) + ')'; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1); } for (let y = 6; y < H; y += 9) { g.fillStyle = 'rgba(80,50,20,.05)'; g.fillRect(0, y, W, 2); } const e = g.createLinearGradient(0, 0, 0, H); e.addColorStop(0, 'rgba(60,35,10,.25)'); e.addColorStop(.08, 'rgba(0,0,0,0)'); e.addColorStop(.92, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(60,35,10,.3)'); g.fillStyle = e; g.fillRect(0, 0, W, H); };
    const tape = (g, x, y, w, h) => { g.fillStyle = 'rgba(214,180,120,.75)'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y + 2, w, 3); g.strokeStyle = 'rgba(120,85,40,.35)'; g.lineWidth = 1; g.strokeRect(x, y, w, h); };
    const stamp = (g, txt, col, x, y, rot, size) => { g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = .78; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 4; g.font = '900 ' + size + 'px monospace'; const tw = g.measureText(txt).width; g.strokeRect(-tw / 2 - 10, -size * .8, tw + 20, size * 1.25); g.fillText(txt, -tw / 2, size * .3); g.globalCompositeOperation = 'destination-out'; for (let k = 0; k < 60; k++) { g.globalAlpha = .5; g.fillRect((rnd() - .5) * (tw + 20), (rnd() - .7) * size, 2 + rnd() * 4, 1 + rnd() * 2); } g.restore(); };
    const side = ctex(512, 384, (g, W, H) => {
      kraft(g, W, H); tape(g, W / 2 - 34, 0, 68, 90);
      // printed shipping label
      g.save(); g.translate(40, 120); g.rotate((rnd() - .5) * .06); g.fillStyle = '#f5f1e6'; g.fillRect(0, 0, 230, 200); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(4, 196, 230, 6);
      g.fillStyle = '#111'; g.font = '900 20px monospace'; g.fillText('AETHERIA FREIGHT', 12, 28); g.fillRect(12, 36, 206, 3);
      g.font = '700 13px monospace'; g.fillText('SHIP TO:', 12, 58); g.font = '900 17px monospace'; g.fillText(dests[v], 12, 80); g.font = '700 13px monospace'; g.fillText('CONTENTS: ' + items[v], 12, 102); g.fillText('WT ' + (4 + v * 3) + '.' + (rnd() * 9 | 0) + ' KG   QTY ' + (2 + v * 4), 12, 120);
      for (let x = 12; x < 210; x += 2 + (rnd() * 3 | 0)) { g.fillRect(x, 134, rnd() < .5 ? 2 : 1, 40); } g.font = '700 11px monospace'; g.fillText('AF-' + (10000 + (rnd() * 89999 | 0)) + '-' + 'ABCD'[v], 12, 190); g.restore();
      // stamps and handling marks
      stamp(g, stamps[v][0], stamps[v][1], 390, 170, -.25 + rnd() * .15, 30);
      g.save(); g.translate(385, 290); g.strokeStyle = '#2b1d10'; g.fillStyle = '#2b1d10'; g.globalAlpha = .8; g.lineWidth = 6; [-26, 26].forEach(dx => { g.beginPath(); g.moveTo(dx, 30); g.lineTo(dx, -14); g.stroke(); g.beginPath(); g.moveTo(dx - 13, -10); g.lineTo(dx, -30); g.lineTo(dx + 13, -10); g.fill(); }); g.font = '900 12px monospace'; g.fillText('THIS SIDE UP', -46, 52); g.restore();
      g.save(); g.globalAlpha = .7; g.fillStyle = '#2b1d10'; g.font = '900 14px monospace'; g.fillText('LOT ' + (300 + v * 41) + '  /  ' + ['A', 'B', 'C', 'D'][v] + '-' + (rnd() * 90 + 10 | 0), 300, 360); g.restore();
    });
    const end = ctex(384, 384, (g, W, H) => { kraft(g, W, H); tape(g, W / 2 - 34, 0, 68, 70); g.save(); g.globalAlpha = .75; g.fillStyle = '#2b1d10'; g.font = '900 40px monospace'; g.fillText('AF', 40, 150); g.font = '700 16px monospace'; g.fillText(items[v], 40, 180); g.restore(); stamp(g, ['HANDLE WITH CARE', 'KEEP DRY', 'HEAVY', 'DO NOT STACK'][v], '#1f2937', 192, 290, .12, 22); g.save(); g.translate(300, 110); g.strokeStyle = '#2b1d10'; g.globalAlpha = .7; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.stroke(); g.font = '900 13px monospace'; g.fillStyle = '#2b1d10'; g.fillText('QC ' + (v + 1), -20, 5); g.restore(); });
    const top = ctex(384, 384, (g, W, H) => { kraft(g, W, H); g.fillStyle = 'rgba(60,35,10,.4)'; g.fillRect(0, H / 2 - 1, W, 2); tape(g, 0, H / 2 - 34, W, 68); stamp(g, ['RUSH', 'CHECKED', 'OK', 'SEALED'][v], stamps[(v + 1) % 4][1], 110, 90, -.3, 26); g.fillStyle = 'rgba(40,25,10,.5)'; g.font = '700 14px monospace'; g.fillText('OPEN HERE', 230, 330); });
    const mk = t => std(0xffffff, { map: t, metalness: 0, roughness: .92 });
    const mS = mk(side), mE = mk(end), mT = mk(top);
    return (CBM[v] = [mS, mS, mT, mT, mE, mE]);
  }
  // ---------- room contents ----------
  const BUILD = {
    bridge(G) {
      const w = 14, d = 15, h = 5.5; shell(G, w, d, h, { window: 1, col: COLS.bridge, noConsoles: 1 });
      // the great window: frame and mullions, space beyond
      [[w, .5, 0, h - .25], [w, .6, 0, .3], [.5, h, -w / 2 + .25, h / 2], [.5, h, w / 2 - .25, h / 2], [.3, h, -2.6, h / 2], [.3, h, 2.6, h / 2]].forEach(([a, b, x, y]) => box(G, a, b, .6, M.trim, x, y, -d));
      box(G, w, .08, .62, emi(COLS.bridge, 2.2), 0, .62, -d); plane(G, w, h, M.glass, 0, h / 2, -d - .05, 0, 0);
      const sp = new T.Group(); G.add(sp); sp.position.z = -d; G.userData.space = sp;
      const sN = 1600, pts = new Float32Array(sN * 3); for (let i = 0; i < sN; i++) { const a = (rnd() - .5) * 2.6, e = (rnd() - .5) * 1.6, r = 300; pts[i * 3] = Math.sin(a) * Math.cos(e) * r; pts[i * 3 + 1] = Math.sin(e) * r; pts[i * 3 + 2] = -Math.cos(a) * Math.cos(e) * r; }
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(pts, 3)); sp.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: true, fog: false })));
      const pl = mesh(sp, new T.SphereGeometry(40, 48, 32), new T.MeshStandardMaterial({ color: 0xffffff, roughness: .85, metalness: 0, fog: false }), -34, -18, -150); G.userData.planet = pl;
      const ring = mesh(sp, new T.RingGeometry(55, 80, 96), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .2, side: T.DoubleSide, fog: false }), -34, -18, -150, 1.2, .2, 0); G.userData.pring = ring;
      const atm = glow(sp, '#7dd3fc', 120, .35); atm.position.set(-34, -18, -150); G.userData.atm = atm;
      glow(sp, '#ffe8c2', 60, .9).position.set(60, 40, -260);
      // flight deck: raised platform, consoles in an arc, the captain's chair, side stations
      mesh(G, new T.CylinderGeometry(4.6, 4.8, .25, 48, 1, false, -HP * 1.4, Math.PI * 1.4), M.mid, 0, .12, -d + 4.2);
      for (let i = 0; i < 7; i++) { const a = (i - 3) * .3, c = new T.Group(); c.position.set(Math.sin(a) * 5.4, 0, -d + 4.6 - Math.cos(a) * 3.2 + 3.2); c.rotation.y = -a; G.add(c); box(c, 1.6, 1, .9, M.dark, 0, .5, 0); plane(c, 1.4, .7, new T.MeshBasicMaterial({ map: screenT(['#22d3ee', '#fde047', '#f472b6', '#4ade80'][i % 4], i % 3) }), 0, 1.2, .1, -.6, 0); box(c, 1.5, .05, .1, emi(COLS.bridge, 1.6), 0, 1.02, .45); }
      const ch = new T.Group(); ch.position.set(0, 0, -d + 8); G.add(ch); box(ch, 1.1, .5, 1, M.dark, 0, .55, 0); box(ch, 1.1, 1.5, .25, M.dark, 0, 1.35, .45); [-1, 1].forEach(s => { box(ch, .15, .55, .9, M.trim, s * .62, .85, 0); box(ch, .3, .06, .5, emi(COLS.bridge, 1.8), s * .62, 1.14, -.1); }); box(ch, .3, .5, .3, M.trim, 0, .2, 0);
      // a holo of the ship's course above the flight deck
      const hol = new T.Group(); hol.position.set(0, 3.9, -d + 5); G.add(hol); for (let i = 0; i < 3; i++) { const r = mesh(hol, new T.TorusGeometry(.5 + i * .3, .015, 6, 64), holoM(COLS.bridge, .5), 0, 0, 0, HP + i * .3, 0, 0); anim.push(dt => { r.rotation.z += dt * (.3 + i * .2); }); }
      glow(hol, COLS.bridge, 1.6, .5);
      G.userData.view = { p: [3.1, 2.15, -2.6], l: [-.6, 2.35, -11.5], yaw: -.06 };
      G.userData.lights = [[0, 4.6, -6, 0x9fd8ff, 1.6, 16], [0, 3.6, -12, 0xbfe3ff, 1.2, 14]];
    },
    map(G) {
      const w = 13, d = 12, h = 5; shell(G, w, d, h, { col: COLS.map });
      const t = new T.Group(); t.position.set(1.4, 0, -7); G.add(t);
      mesh(t, new T.CylinderGeometry(2.4, 2.8, 1, 48), M.dark, 0, .5, 0); const tr = mesh(t, new T.TorusGeometry(2.38, .05, 8, 96), emi(COLS.map, 2), 0, 1.02, 0, -HP, 0, 0);
      mesh(t, new T.CylinderGeometry(2.4, 2.1, 2.5, 48, 1, true), holoM(COLS.map, .05), 0, 2.25, 0);
      const holo = new T.Group(); holo.position.y = 2.3; holo.rotation.x = .4; t.add(holo); mesh(holo, new T.SphereGeometry(.24, 20, 14), new T.MeshBasicMaterial({ color: 0xfff1d6 })); glow(holo, '#fde047', 1.5, .7);
      const pl = []; WORLDS.forEach((W, i) => { const r = .5 + i * .1; mesh(holo, new T.TorusGeometry(r, .005, 4, 96), holoM(COLS.map, .25), 0, 0, 0, HP, 0, 0); const p = mesh(holo, new T.SphereGeometry(.06 + (i === 16 ? .04 : 0), 14, 10), new T.MeshBasicMaterial({ color: new T.Color(W.ac) })); const g2 = glow(p, W.ac, .35, .7); pl.push({ p, g2, r, a: i * 2.3, sp: .4 / Math.sqrt(r) }); });
      anim.push((dt, c) => { holo.rotation.y += dt * .06; const sel = UI.w | 0; pl.forEach((o, i) => { o.a += o.sp * dt * .4; o.p.position.set(Math.cos(o.a) * o.r, 0, Math.sin(o.a) * o.r); const on = i === sel; o.p.scale.setScalar(on ? 2.4 + Math.sin(c * 5) * .25 : 1); o.g2.material.opacity = on ? 1 : .55; }); tr.material.emissiveIntensity = 1.6 + Math.sin(c * 2) * .4; });
      // wall charts
      [-1, 1].forEach(s => { const cht = plane(G, 3.2, 1.8, new T.MeshBasicMaterial({ map: screenT(COLS.map, 2) }), s * 3.2, 2.6, -d + .05, 0, 0); });
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .4, c = new T.Group(); c.position.set(1.4 + Math.cos(a) * 3.6, 0, -7 + Math.sin(a) * 3.6); c.rotation.y = -a - HP; G.add(c); box(c, .6, .5, .6, M.mid, 0, .45, 0); box(c, .6, .8, .1, M.mid, 0, .95, .28); }
      G.userData.view = { p: [-2.6, 2.1, -1.8], l: [-2.6, 2.1, -9], yaw: -.05 };
      G.userData.lights = [[1.4, 4.3, -7, 0xfde047, 1.4, 12], [-3, 4.3, -3, 0xc7d2fe, 1, 12]];
    },
    deck(G) {
      const w = 13, d = 12, h = 7; shell(G, w, d, h, { col: COLS.deck, noCeil: 1 });
      // glass dome open to the stars
      const dome = mesh(G, new T.SphereGeometry(9, 32, 16, 0, TAU, 0, HP), new T.MeshBasicMaterial({ color: 0x050816, side: T.BackSide }), 0, h - .2, -d / 2); dome.scale.set(.72, .5, .66);
      for (let i = 0; i < 8; i++) { const r = mesh(G, new T.TorusGeometry(6.4, .06, 6, 48, Math.PI), M.trim, 0, h - .2, -d / 2, 0, i / 8 * Math.PI, 0); r.scale.set(1, .5 * 9 / 6.4, .66 * 9 / 6.4); }
      const sN = 700, pts = new Float32Array(sN * 3); for (let i = 0; i < sN; i++) { const a = rnd() * TAU, e = rnd() * HP * .95, r = 8.6; pts[i * 3] = Math.cos(a) * Math.cos(e) * r * .72; pts[i * 3 + 1] = h - .2 + Math.sin(e) * r * .5; pts[i * 3 + 2] = -d / 2 + Math.sin(a) * Math.cos(e) * r * .66; }
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(pts, 3)); G.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: .05, map: glowTex, transparent: true, depthWrite: false })));
      // the star projector and its spinning galaxy
      const pr = new T.Group(); pr.position.set(1.8, 0, -7); G.add(pr);
      mesh(pr, new T.CylinderGeometry(.6, 1, .8, 24), M.dark, 0, .4, 0); box(pr, 1.1, .05, 1.1, emi(COLS.deck, 2.4), 0, .82, 0);
      mesh(pr, new T.CylinderGeometry(.1, 2.2, 3.6, 32, 1, true), holoM(COLS.deck, .05), 0, 2.6, 0);
      const gN = 3600, gp = new Float32Array(gN * 3), gc = new Float32Array(gN * 3), cA = new T.Color(0xa78bfa), cB = new T.Color(0x22d3ee), cC = new T.Color(0xfff1d6);
      for (let i = 0; i < gN; i++) { const arm = i % 3, dd = Math.pow(rnd(), .7) * 2.6, a = dd * 2.3 + arm / 3 * TAU + (rnd() - .5) * .5; gp[i * 3] = Math.cos(a) * dd; gp[i * 3 + 1] = (rnd() - .5) * .14 * (1 - dd / 2.6); gp[i * 3 + 2] = Math.sin(a) * dd; const c = dd < .5 ? cC : arm ? cA : cB; gc[i * 3] = c.r; gc[i * 3 + 1] = c.g; gc[i * 3 + 2] = c.b; }
      const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(gp, 3)); gg.setAttribute('color', new T.BufferAttribute(gc, 3));
      const gal = new T.Points(gg, new T.PointsMaterial({ size: .07, map: glowTex, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); gal.position.y = 4.3; gal.rotation.x = .45; pr.add(gal); glow(pr, '#fff1d6', 1.6, .6).position.y = 4.3;
      anim.push(dt => { gal.rotation.y += dt * .12; });
      // observation benches
      [-1, 1].forEach(s => { box(G, 3, .45, .8, M.mid, s * 4.5, .35, -9); box(G, 3, .05, .05, emi(COLS.deck, 1.6), s * 4.5, .6, -8.6); });
      G.userData.view = { p: [-2.4, 1.9, -1.8], l: [-2.6, 2.7, -9], yaw: -.05 };
      G.userData.lights = [[1.8, 5, -7, 0xa78bfa, 1.6, 12], [-3, 4, -3, 0xc7d2fe, .9, 12]];
    },
    shop(G) {
      const w = 14, d = 15, h = 7; shell(G, w, d, h, { col: COLS.shop, noConsoles: 1 });
      // bay door on the far wall with hazard stripes
      const hz = ctex(256, 64, (g, w2, h2) => { g.fillStyle = '#111'; g.fillRect(0, 0, w2, h2); g.fillStyle = '#f59e0b'; for (let x = -64; x < w2 + 64; x += 64) { g.beginPath(); g.moveTo(x, h2); g.lineTo(x + 32, 0); g.lineTo(x + 64, 0); g.lineTo(x + 32, h2); g.fill(); } });
      box(G, 8, 5, .3, M.mid, 0, 2.5, -d + .2); plane(G, 8, .5, new T.MeshBasicMaterial({ map: hz }), 0, 5.25, -d + .4, 0, 0); plane(G, 8, .3, new T.MeshBasicMaterial({ map: hz }), 0, .15, -d + .4, 0, 0); box(G, .08, 5, .34, M.dark, 0, 2.5, -d + .22);
      // the lift your real ship sits on
      const lift = new T.Group(); lift.position.set(2.4, 0, -9); G.add(lift); box(lift, 5.6, .3, 5.6, M.dark, 0, .15, 0);
      const lr = mesh(lift, new T.TorusGeometry(2.7, .05, 8, 4), emi(COLS.shop, 2), 0, .32, 0, -HP, 0, Math.PI / 4); G.userData.liftRing = lr;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { box(lift, .3, .7, .3, M.trim, a * 2.7, .65, b * 2.7); box(lift, .32, .08, .32, emi(COLS.shop, 1.8), a * 2.7, 1.02, b * 2.7); });
      shipGrp = new T.Group(); shipGrp.position.set(2.4, 1.9, -9); G.add(shipGrp);
      // robot arms that swing in and paint when your look changes
      [[5.6, -12.6, -1], [-.8, -12.6, 1]].forEach(([x, z, s]) => { const base = new T.Group(); base.position.set(x, h, z); G.add(base); box(base, .9, .4, .9, M.dark, 0, -.2, 0); const up = new T.Group(); up.position.y = -.4; base.add(up); box(up, .32, 2.2, .32, M.trim, 0, -1.1, 0); const el = new T.Group(); el.position.y = -2.2; up.add(el); box(el, .26, 1.7, .26, M.trim, 0, -.85, 0); const tip = new T.Group(); tip.position.y = -1.7; el.add(tip); box(tip, .2, .4, .2, M.dark, 0, -.15, 0); const tg = glow(tip, COLS.shop, .9, 0); tg.position.y = -.42; arms.push({ base, up, el, tip, tg, s }); });
      sprayV = new Float32Array(240 * 3); spray = new T.Points(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array(240 * 3), 3)), new T.PointsMaterial({ color: 0xf472b6, size: .07, map: glowTex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); G.add(spray);
      // tool wall + crates
      for (let i = 0; i < 5; i++) { const p = box(G, .2, 2.4, 1.6, M.dark, -w / 2 + .3, 1.8, -4 - i * 2); box(G, .04, 2, .04, emi(i % 2 ? COLS.shop : '#22d3ee', 1.6), -w / 2 + .45, 1.8, -4 - i * 2); }
      [[-4.6, -12.5], [-3.4, -12.8], [-4.1, -11.4]].forEach(([x, z], i) => { box(G, 1.1, 1.1 - (i === 2 ? .4 : 0), 1.1, M.mid, x, i === 2 ? 1.1 + .35 : .55, z, rnd()); box(G, 1.12, .06, 1.12, emi('#f59e0b', 1), x, i === 2 ? 1.6 : .9, z, 0); });
      G.userData.view = { p: [-3.4, 2.4, -2.2], l: [-1.7, 2.1, -10], yaw: -.05 };
      G.userData.lights = [[2.4, 6.2, -9, 0xfff1d6, 2, 16], [-3, 3, -5, 0xf472b6, 1, 12]];
    },
    fab(G) {
      const w = 13, d = 12, h = 5.5; shell(G, w, d, h, { col: COLS.fab });
      // the forge: a furnace with a glowing mouth and heat haze
      const fg = new T.Group(); fg.position.set(3, 0, -9.2); G.add(fg); box(fg, 3.2, 3.2, 2, M.dark, 0, 1.6, 0); box(fg, 1.8, 1.2, .1, emi('#fb923c', 3), 0, 1.2, 1.01); const heat = glow(fg, '#fb923c', 4, .6); heat.position.set(0, 1.3, 1.4);
      box(fg, 3.4, .2, 2.2, M.trim, 0, 3.3, 0); mesh(fg, new T.CylinderGeometry(.4, .5, 2.2, 16), M.trim, .8, 4.4, -.3);
      const anv = new T.Group(); anv.position.set(3, 0, -6.2); G.add(anv); box(anv, .9, .7, .5, M.trim, 0, .35, 0); box(anv, 1.4, .3, .6, M.trim, 0, .85, 0); box(anv, 1.2, .04, .4, emi('#fdba74', 1.4), 0, 1.01, 0);
      anim.push((dt, c) => { heat.material.opacity = .45 + Math.sin(c * 7) * .1 + Math.random() * .08; });
      // conveyor with crates moving along the left wall
      const cv = new T.Group(); cv.position.set(-5, 0, -6); G.add(cv); box(cv, 1.4, .8, 9, M.dark, 0, .4, 0); const beltT = ctex(64, 256, (g, W, H) => { g.fillStyle = '#16181c'; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 16) { g.fillStyle = '#2a2e35'; g.fillRect(0, y, W, 6); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, y + 6, W, 2); } for (let k = 0; k < 120; k++) { g.fillStyle = 'rgba(255,255,255,' + rnd() * .05 + ')'; g.fillRect(rnd() * W, rnd() * H, 1, 3); } }); beltT.wrapS = beltT.wrapT = T.RepeatWrapping; beltT.repeat.set(1, 9);
      box(cv, 1.2, .04, 9, std(0xffffff, { map: beltT, metalness: .1, roughness: .85 }), 0, .82, 0); [-1, 1].forEach(sd => { box(cv, .08, .1, 9, M.trim, sd * .64, .84, 0); box(cv, .02, .02, 9, emi(COLS.fab, 1.6), sd * .69, .86, 0); }); for (let z = -4.2; z <= 4.2; z += 1.4) [-1, 1].forEach(sd => mesh(cv, new T.CylinderGeometry(.06, .06, .06, 10), M.trim, sd * .7, .55, z, 0, 0, HP)); [-4.5, 4.5].forEach(z => mesh(cv, new T.CylinderGeometry(.14, .14, 1.3, 16), M.trim, 0, .7, z, 0, 0, HP));
      anim.push(dt => { beltT.offset.y += dt * .6; });
      const crates = []; for (let i = 0; i < 4; i++) { const c = box(cv, .8, .6, .8, cardboard(i), 0, 1.11, -4 + i * 2.2); c.rotation.y = (rnd() - .5) * .25; crates.push(c); }
      anim.push(dt => { crates.forEach(c => { c.position.z += dt * .6; if (c.position.z > 4.3) c.position.z = -4.3; }); });
      // drone pods with drones hovering in them
      const DC = ['#22d3ee', '#fde047', '#f472b6'];
      DC.forEach((c, i) => { const pod = new T.Group(); pod.position.set(-1.2 + i * 2.1, 0, -10.6); G.add(pod); box(pod, 1.5, .2, 1.5, M.dark, 0, .1, 0); mesh(pod, new T.CylinderGeometry(.7, .7, 2.4, 20, 1, true), M.glass, 0, 1.4, 0); box(pod, 1.5, .1, 1.5, M.trim, 0, 2.65, 0);
        const dr = new T.Group(); dr.position.y = 1.4; pod.add(dr); mesh(dr, new T.OctahedronGeometry(.28, 0), std(0xdbe4ee, { metalness: .8, roughness: .25 })); [0, 1, 2, 3].forEach(k => { const a = k / 4 * TAU; mesh(dr, new T.TorusGeometry(.13, .02, 6, 16), emi(c, 2), Math.cos(a) * .4, 0, Math.sin(a) * .4, HP, 0, 0); }); glow(dr, c, .9, .7);
        anim.push((dt, cl) => { dr.position.y = 1.4 + Math.sin(cl * 1.6 + i) * .12; dr.rotation.y += dt * (.6 + i * .2); }); });
      G.userData.view = { p: [-2.4, 2.05, -1.7], l: [-2.5, 2, -9], yaw: -.05 };
      G.userData.lights = [[3, 3.4, -7.5, 0xfb923c, 1.8, 10], [-2, 4.8, -5, 0xbbf7d0, 1.1, 14]];
    },
    eng(G) {
      const w = 13, d = 13, h = 8; shell(G, w, d, h, { col: COLS.eng, noConsoles: 1 });
      const core = new T.Group(); core.position.set(2.6, 0, -8); G.add(core);
      mesh(core, new T.CylinderGeometry(2.2, 2.6, .8, 40), M.dark, 0, .4, 0); mesh(core, new T.CylinderGeometry(2.2, 2.6, .8, 40), M.dark, 0, h - .4, 0);
      mesh(core, new T.CylinderGeometry(1.3, 1.3, h - 1.6, 40, 1, true), new T.MeshStandardMaterial({ color: 0xfdba74, transparent: true, opacity: .14, metalness: .2, roughness: .05, side: T.DoubleSide, depthWrite: false }), 0, h / 2, 0);
      const om = new T.MeshStandardMaterial({ color: 0x000000, emissive: 0xf97316, emissiveIntensity: 1.6 }), orb = mesh(core, new T.IcosahedronGeometry(.7, 2), om, 0, h / 2, 0); const cg = glow(core, '#fb923c', 5, .6); cg.position.y = h / 2;
      const rings = [0, 1, 2].map(k => mesh(core, new T.TorusGeometry(1.6 + k * .32, .07, 8, 64), M.trim, 0, h / 2, 0));
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; mesh(core, new T.CylinderGeometry(.16, .16, h - 1.6, 10), M.trim, Math.cos(a) * 3, h / 2, Math.sin(a) * 3); box(core, .05, h - 2.4, .05, emi('#fb923c', 1.8), Math.cos(a) * 2.78, h / 2, Math.sin(a) * 2.78); }
      const hz = ctex(256, 32, (g, w2, h2) => { g.fillStyle = '#111'; g.fillRect(0, 0, w2, h2); g.fillStyle = '#f59e0b'; for (let x = -32; x < w2 + 32; x += 32) { g.beginPath(); g.moveTo(x, h2); g.lineTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 16, h2); g.fill(); } });
      mesh(core, new T.RingGeometry(3.4, 3.8, 64), new T.MeshBasicMaterial({ map: hz }), 0, .02, 0, -HP, 0, 0);
      // pipes along the walls
      [-1, 1].forEach(s => { for (let k = 0; k < 3; k++) mesh(G, new T.CylinderGeometry(.14, .14, d - 1, 10), k === 1 ? std(0xb45309, { metalness: .8, roughness: .4 }) : M.trim, s * (w / 2 - .9), 5.4 + k * .4, -d / 2, HP, 0, 0); });
      anim.push((dt, c) => { const p = .5 + .5 * Math.sin(c * 3.2); om.emissiveIntensity = 1.1 + p * .9; cg.material.opacity = .4 + p * .3; cg.scale.setScalar(4.4 + p * 1.4); orb.rotation.set(c * .5, c * .8, 0); rings.forEach((r, k) => { r.rotation.x = c * (.4 + k * .2) + k; r.rotation.y = c * (.25 + k * .15); }); });
      G.userData.view = { p: [-2.4, 2.25, -1.8], l: [-2.6, 2.7, -10], yaw: -.05 };
      G.userData.lights = [[2.6, 4, -8, 0xfb923c, 2.6, 14], [-2, 6.5, -4, 0xfed7aa, .9, 14]];
    },
    comms(G) {
      const w = 13, d = 12, h = 5.5; shell(G, w, d, h, { col: COLS.comms });
      // a wall of screens
      const sw = new T.Group(); sw.position.set(0, 0, -d + .1); G.add(sw);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { const s = plane(sw, 2, 1.2, new T.MeshBasicMaterial({ map: screenT(['#38bdf8', '#22d3ee', '#a78bfa', '#4ade80'][(r + c) % 4], (r * 5 + c) % 3) }), -4.4 + c * 2.2, 1.3 + r * 1.35, 0, 0, 0); box(sw, 2.1, 1.3, .05, M.dark, -4.4 + c * 2.2, 1.3 + r * 1.35, -.04); }
      // holo globe with network arcs
      const gl = new T.Group(); gl.position.set(2.6, 2.4, -7); G.add(gl);
      mesh(G, new T.CylinderGeometry(.8, 1.1, .9, 24), M.dark, 2.6, .45, -7); box(G, 1.4, .05, 1.4, emi(COLS.comms, 2), 2.6, .92, -7);
      mesh(gl, new T.SphereGeometry(1.1, 24, 16), new T.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: .25 }));
      const nodes = []; for (let i = 0; i < 18; i++) { const u = rnd() * 2 - 1, a = rnd() * TAU, s = Math.sqrt(1 - u * u); const v = new T.Vector3(Math.cos(a) * s, u, Math.sin(a) * s).multiplyScalar(1.12); nodes.push(v); glow(gl, '#7dd3fc', .25, .9).position.copy(v); }
      const lp = []; for (let i = 0; i < 14; i++) { const a = nodes[i], b = nodes[(i * 7 + 3) % nodes.length], mid = a.clone().add(b).normalize().multiplyScalar(1.6); const cu = new T.QuadraticBezierCurve3(a, mid, b).getPoints(16); for (let k = 0; k < 16; k++) lp.push(cu[k].x, cu[k].y, cu[k].z, cu[k + 1].x, cu[k + 1].y, cu[k + 1].z); }
      const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(lp, 3)); gl.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: .6, blending: T.AdditiveBlending })));
      anim.push(dt => { gl.rotation.y += dt * .25; });
      // antenna mast with blinking lights
      const mast = mesh(G, new T.CylinderGeometry(.08, .12, h - .2, 8), M.trim, -5, h / 2, -9.5); const bl = []; for (let i = 0; i < 4; i++) bl.push(glow(G, '#f43f5e', .4, 1)); bl.forEach((b, i) => b.position.set(-5, 1 + i * 1.1, -9.5));
      anim.push((dt, c) => bl.forEach((b, i) => { b.material.opacity = (Math.sin(c * 3 - i * .8) > .6) ? 1 : .15; }));
      G.userData.view = { p: [-2.4, 2.05, -1.7], l: [-2.5, 2.1, -9], yaw: -.05 };
      G.userData.lights = [[2.6, 4.6, -7, 0x38bdf8, 1.5, 12], [-2, 4.6, -4, 0xc7d2fe, 1, 12]];
    },
    arch(G) {
      const w = 13, d = 12, h = 5.5; shell(G, w, d, h, { col: COLS.arch, noConsoles: 1 });
      // trophy wall: a trophy for every boss you have beaten
      const tw = new T.Group(); tw.position.set(0, 0, -d + .5); G.add(tw); const tro = [];
      for (let r = 0; r < 3; r++) { box(tw, 10, .12, .9, M.trim, 0, .9 + r * 1.4, 0); box(tw, 10, .03, .05, emi('#fde68a', 1.2), 0, .97 + r * 1.4, .45); }
      for (let i = 0; i < 17; i++) { const r = (i / 6) | 0, c = i % 6, g = new T.Group(); g.position.set(-4.1 + c * 1.64, 1.0 + r * 1.4, 0); tw.add(g); box(g, .4, .1, .4, M.dark, 0, .05, 0); const cup = mesh(g, i % 3 === 0 ? new T.OctahedronGeometry(.25, 0) : i % 3 === 1 ? new T.ConeGeometry(.22, .5, 6) : new T.TorusKnotGeometry(.14, .05, 40, 6), M.gold, 0, .42, 0); const gw = glow(g, '#fde68a', .9, .5); gw.position.y = .42; tro.push({ g, cup, gw }); }
      anim.push((dt, c) => { const n = SAVE.bd ? Object.keys(SAVE.bd).filter(k => SAVE.bd[k]).length : 0; tro.forEach((t, i) => { const got = i < n; t.cup.visible = got; t.gw.visible = got; if (got) t.cup.rotation.y += dt * .6; }); });
      // specimen tubes with holo creatures
      [0, 1, 2].forEach(i => { const tb = new T.Group(); tb.position.set(4.6, 0, -3 - i * 2.4); G.add(tb); mesh(tb, new T.CylinderGeometry(.6, .7, .3, 20), M.dark, 0, .15, 0); mesh(tb, new T.CylinderGeometry(.55, .55, 2.6, 20, 1, true), M.glass, 0, 1.6, 0); mesh(tb, new T.CylinderGeometry(.6, .6, .2, 20), M.dark, 0, 3, 0);
        const cr = mesh(tb, i === 0 ? new T.TetrahedronGeometry(.35) : i === 1 ? new T.DodecahedronGeometry(.3) : new T.TorusGeometry(.22, .08, 8, 20), holoM(['#4ade80', '#f472b6', '#38bdf8'][i], .7), 0, 1.6, 0); glow(tb, ['#4ade80', '#f472b6', '#38bdf8'][i], 1.4, .35).position.y = 1.6; anim.push((dt, c) => { cr.rotation.set(c * .7 + i, c + i, 0); cr.position.y = 1.6 + Math.sin(c * 1.5 + i) * .12; }); });
      // holo-theater screen on the left wall
      const th = plane(G, 4.2, 2.4, new T.MeshBasicMaterial({ map: screenT('#e2e8f0', 0) }), -w / 2 + .1, 2.6, -6.5, 0, HP); box(G, .1, 2.6, 4.4, M.dark, -w / 2 + .05, 2.6, -6.5);
      box(G, 2.6, .45, .9, std(0x334155, { metalness: .3, roughness: .8 }), -3.2, .35, -6.5);
      G.userData.view = { p: [-1.9, 2.05, -1.7], l: [-2.1, 2.2, -9], yaw: -.05 };
      G.userData.lights = [[0, 4.6, -8, 0xfff1d6, 1.4, 12], [3.6, 3.4, -5, 0x86efac, .8, 10]];
    }
  };

  // ---------- the hub that joins every corridor ----------
  function hub() {
    const G = new T.Group(); scene.add(G); const h = 4.5, rr = HUB_A / Math.cos(Math.PI / 8);
    mesh(G, new T.CircleGeometry(rr, 8, Math.PI / 8), texMat(M.floorT, 10, 10, 0xa8b4c4), 0, 0, 0, -HP, 0, 0);
    mesh(G, new T.CircleGeometry(rr, 8, Math.PI / 8), texMat(M.ceilT, 10, 10, 0xffffff), 0, h, 0, HP, 0, 0);
    const fw = 2 * HUB_A * Math.tan(Math.PI / 8), side = (fw - DOORW) / 2;
    ORDER.forEach((k, i) => {
      const th = i * Math.PI / 4, F = new T.Group(); F.position.set(Math.sin(th) * HUB_A, 0, -Math.cos(th) * HUB_A); F.rotation.y = -th; G.add(F);
      const wm = texMat(M.wallT, fw, h, 0xffffff);
      [-1, 1].forEach(s => plane(F, side, h, wm, s * (DOORW / 2 + side / 2), h / 2, 0, 0, 0));
      plane(F, DOORW, h - DOORH, wm, 0, DOORH + (h - DOORH) / 2, 0, 0, 0);
      box(F, DOORW + .4, .08, .3, emi(COLS[k], 2.2), 0, DOORH + .04, .1);
      const sg = plane(F, 2.4, .45, new T.MeshBasicMaterial({ map: label(NAMES[k], COLS[k]) }), 0, DOORH + .55, .08, 0, 0);
      // pillar at the octagon corner
      const ca = th + Math.PI / 8; box(G, .5, h, .5, M.trim, Math.sin(ca) * rr * .97, h / 2, -Math.cos(ca) * rr * .97, -ca);
    });
    // centre: a holo column with the ship's crest
    mesh(G, new T.CylinderGeometry(1.1, 1.3, .3, 32), M.dark, 0, .15, 0); mesh(G, new T.TorusGeometry(1.15, .04, 8, 64), emi('#22d3ee', 2), 0, .31, 0, -HP, 0, 0);
    mesh(G, new T.CylinderGeometry(.9, 1.1, 3, 32, 1, true), holoM('#22d3ee', .06), 0, 1.8, 0);
    const crest = new T.Group(); crest.position.y = 2.1; G.add(crest);
    [0, 1, 2].forEach(i => { const r = mesh(crest, new T.TorusGeometry(.45 + i * .18, .02, 6, 48), holoM(['#22d3ee', '#a78bfa', '#fde047'][i], .7), 0, 0, 0, i * .7, i * .4, 0); anim.push(dt => { r.rotation.x += dt * (.4 + i * .25); r.rotation.y += dt * (.3 + i * .15); }); });
    glow(crest, '#7dd3fc', 1.8, .6); mesh(crest, new T.OctahedronGeometry(.18, 0), emi('#e0f2fe', 2.4));
    mesh(G, new T.TorusGeometry(2.6, .05, 8, 96), emi('#22d3ee', 1.2), 0, .03, 0, -HP, 0, 0);
    if (SET.preset !== 'low') try { dressHub(G); } catch (e) { console.warn('hub detail', e); }
    hubG = G;
  }
  let hubG;

  // ---------- build everything once ----------
  function build() {
    tv = new T.Vector3(); ts = new T.Vector3(); up = new T.Vector3(0, 1, 0);
    scene = new T.Scene(); scene.background = new T.Color(0x02040a); scene.fog = new T.Fog(0x03060c, 18, 60);
    cam = new T.PerspectiveCamera(55, 16 / 9, .05, 900);
    mats();
    hemi = new T.HemisphereLight(0xa8c4ea, 0x0a0d14, .55); scene.add(hemi);
    sunD = new T.DirectionalLight(0xfff1d6, .5); sunD.position.set(30, 40, -60); scene.add(sunD);
    for (let i = 0; i < 4; i++) { const l = new T.PointLight(0xffffff, 0, 14, 2); scene.add(l); lights.push(l); }
    camL = new T.PointLight(0xdbeafe, .9, 9, 2); scene.add(camL);
    hub();
    ORDER.forEach((k, i) => {
      const G = new T.Group(), th = i * Math.PI / 4; G.position.set(Math.sin(th) * R0, 0, -Math.cos(th) * R0); G.rotation.y = -th; scene.add(G);
      BUILD[k](G); if (SET.preset !== 'low') try { dress(G, k); if (EXTRA[k]) EXTRA[k](G); } catch (e) { console.warn('room detail', k, e); } corridor(G, COLS[k]); if (SET.preset !== 'low') try { dressCorridor(G, COLS[k]); } catch (e) { console.warn('corridor detail', e); } G.updateMatrixWorld(true); rooms[k] = G;
    });
    doors.forEach(d => d.G.localToWorld(d.wp.set(0, 1.6, 0)));
    S.built = true;
  }
  const W2 = (k, v) => rooms[k].localToWorld(new T.Vector3(v[0], v[1], v[2]));
  function viewOf(k) { const V = rooms[k].userData.view; return { p: W2(k, V.p), l: W2(k, V.l), yaw: V.yaw || 0 }; }
  function lightRoom(k, a) { (rooms[k].userData.lights || []).forEach((L, i) => { const l = lights[a + i]; if (!l) return; l.position.copy(W2(k, L)); l.color.setHex(L[3]); l.intensity = L[4]; l.distance = L[5]; }); }
  function showRooms(a, b) { ORDER.forEach(k => { rooms[k].visible = k === a || k === b; }); }

  // ---------- the player's real ship on the workshop lift ----------
  function syncShip(force) {
    if (!shipGrp || !R3 || !R3.shipModel) return;
    const cfg = G.showCfg || (SAVE.pl && SAVE.pl[0] && SAVE.pl[0].cfg); if (!cfg) return; const key = JSON.stringify(cfg);
    if (key === shipKey && !force) return; const had = !!shipObj; shipKey = key;
    if (shipObj) { shipGrp.remove(shipObj.g); shipObj.g.traverse(n => { if (n.geometry) n.geometry.dispose(); }); }
    try { shipObj = R3.shipModel(cfg); const g = shipObj.g; const bb = new T.Box3().setFromObject(g), sz = bb.getSize(new T.Vector3()); const k = 4.2 / Math.max(sz.x, sz.z, .01); g.scale.setScalar(k); shipGrp.add(g); } catch (e) { shipObj = null; console.warn('ship model', e); }
    if (had) { paintT = 1.8; const ac = cfg.accent || '#f472b6'; spray.material.color.set(ac); arms.forEach(a => a.tg.material.color.set(ac)); }
  }

  // ---------- placing the menus in the room ----------
  let tv, ts, up;
  function panelMatrix(k, W, H) {
    const v = viewOf(k), fwd = v.l.clone().sub(v.p).normalize(), D = 4.2;
    const vh = 2 * D * Math.tan(cam.fov * Math.PI / 360), vw = vh * cam.aspect, cover = W < 760 ? .93 : .87;
    const pos = v.p.clone().addScaledVector(fwd, D);
    const o = new T.Object3D(); o.position.copy(pos); o.lookAt(v.p); o.rotateY(W < 760 ? 0 : v.yaw); o.scale.setScalar(Math.min(vw / W, vh / H) * cover); o.updateMatrix(); return o.matrix;
  }
  const ep = v => Math.abs(v) < 1e-10 ? 0 : v;
  function cssApply(W, H) {
    const fov = cam.projectionMatrix.elements[5] * H / 2, e = cam.matrixWorldInverse.elements;
    wrap.style.perspective = fov + 'px';
    camEl.style.width = W + 'px'; camEl.style.height = H + 'px';
    camEl.style.transform = 'translateZ(' + fov + 'px) matrix3d(' + [e[0], -e[1], e[2], e[3], e[4], -e[5], e[6], e[7], e[8], -e[9], e[10], e[11], e[12], -e[13], e[14], e[15]].map(ep).join(',') + ') translate(' + W / 2 + 'px,' + H / 2 + 'px)';
    const m = S.pm.elements; ui.style.transform = 'translate(-50%,-50%) matrix3d(' + [m[0], m[1], m[2], m[3], -m[4], -m[5], -m[6], -m[7], m[8], m[9], m[10], m[11], m[12], m[13], m[14], m[15]].map(ep).join(',') + ')';
  }
  function cssClear() { if (!wrap) return; wrap.style.perspective = ''; camEl.style.transform = ''; camEl.style.width = ''; camEl.style.height = ''; ui.style.transform = ''; ui.style.opacity = ''; ui.style.pointerEvents = ''; }
  function wrapUI() {
    if (wrap) return; ui = document.getElementById('ui'); if (!ui) return;
    wrap = document.createElement('div'); wrap.id = 'shipWrap'; camEl = document.createElement('div'); camEl.id = 'shipCam';
    ui.parentNode.insertBefore(wrap, ui); wrap.appendChild(camEl); camEl.appendChild(ui);
    tag = document.createElement('div'); tag.id = 'shipTag'; wrap.parentNode.insertBefore(tag, wrap.nextSibling);
  }

  // ---------- travel between rooms ----------
  function pathTo(k, fromHub) {
    const B = viewOf(k), pts = [cam.position.clone()];
    const a = S.room, dA = a && !fromHub ? rooms[a] : null, dB = rooms[k];
    if (dA) { pts.push(W2(a, [0, 1.85, -1.4]), W2(a, [0, 1.85, 3.5]), W2(a, [0, 1.85, R0 - HUB_A - .6])); }
    pts.push(new T.Vector3(0, 1.85, 0).lerp(W2(k, [0, 1.85, R0]), .001));
    pts.push(W2(k, [0, 1.85, R0 - HUB_A - .6]), W2(k, [0, 1.85, 3.5]), W2(k, [0, 1.95, -1.2]), B.p);
    // drop points that sit on top of each other so the curve stays smooth
    const out = [pts[0]]; for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(out[out.length - 1]) > .6) out.push(pts[i]);
    return new T.CatmullRomCurve3(out, false, 'centripetal', .5);
  }
  function go(k, how) {
    if (!S.built || !rooms[k]) return;
    if (k === S.room && !how) return;
    const prevK = S.room || (S.travel && S.travel.k);
    const curve = pathTo(k, how === 'hub'), len = curve.getLength(), quick = SET.reduce;
    S.travel = { curve, t: 0, d: quick ? .01 : Math.max(.01, Math.max(1.1, Math.min(2.3, len / 17)) * (+SET.shipTravel || 1)), from: S.look.clone(), to: viewOf(k).l, k };
    S.fade = 0; ui.style.opacity = 0; ui.style.pointerEvents = 'none';
    showRooms(prevK, k); lightRoom(k, 2); if (S.room) lightRoom(S.room, 0);
    tag.textContent = NAMES[k]; tag.style.setProperty('--c', COLS[k]); tag.classList.add('on');
    if (!quick) { try { SFX.dash && SFX.dash(); } catch (e) { } }
  }
  function arrive() { const k = S.travel.k; S.room = k; S.travel = null; showRooms(k, null); lightRoom(k, 0); lights[2].intensity = 0; lights[3].intensity = 0; setTimeout(() => tag.classList.remove('on'), 500); }

  // ---------- turning ship mode on and off ----------
  function wanted(ignoreIntro) {
    return !!T && !!T.CatmullRomCurve3 && !!T.Fog && SET.shipMenu !== false && !!R3 && !!SET.models && !R3.lost && !R3.shipFail && G.scene !== 'play' && !G.cut && (ignoreIntro || !(typeof INTRO !== 'undefined' && INTRO.on && !document.body.classList.contains('introfade')))
      && !!UI.top && !!SHIPROOM[UI.top] && !document.body.classList.contains('photo');
  }
  function enable() {
    try { if (!S.built) build(); } catch (e) { console.warn('ship build failed', e); if (R3) R3.shipFail = 1; return; }
    wrapUI(); if (!wrap) return; S.on = true; document.body.classList.add('shipm'); R3.shipDraw = draw; R3.setView('ship');
    const k = SHIPROOM[UI.top]; S.look = new T.Vector3();
    // first boarding: start at the hub and walk in; afterwards come back through the hub too
    if (S.first) { // straight out of the intro (or the first load): glide up to the room's menu instead of flying in from the hub
      S.first = false; const v = viewOf(k), back = v.p.clone().sub(v.l).setY(0).normalize(); cam.position.copy(v.p).addScaledVector(back, 3.5).add(new T.Vector3(0, .5, 0)); S.look.copy(v.l);
      S.room = null; showRooms(k, null); lightRoom(k, 0); lights[2].intensity = lights[3].intensity = 0; S.fade = 0; ui.style.opacity = 0; ui.style.pointerEvents = 'none';
      S.travel = { curve: new T.CatmullRomCurve3([cam.position.clone(), cam.position.clone().lerp(v.p, .5), v.p.clone()]), t: 0, d: SET.reduce ? .01 : 1.8, from: v.l.clone(), to: v.l.clone(), k }; syncShip(true); return; }
    cam.position.set(0, 1.85, 0); const th = ORDER.indexOf(k) * Math.PI / 4; S.look.set(Math.sin(th) * 6, 1.85, -Math.cos(th) * 6);
    S.room = null; go(k, 'hub'); syncShip(true);
  }
  function disable() { S.on = false; S.travel = null; document.body.classList.remove('shipm'); cssClear(); if (tag) tag.classList.remove('on'); if (R3 && R3.getView && R3.getView() === 'ship') { if (G.scene !== 'play' && UI.top) UI.refresh(); else R3.setView('menu'); } }

  // runs every frame: keeps the mode in sync, moves the camera and the menus
  let lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const rdt = Math.max(0, Math.min(.5, (now - lastT) / 1000)), dt = Math.min(.05, rdt); lastT = now; S.t += dt;
    const want = wanted();
    if (want && !S.on) enable(); else if (!want && S.on) disable();
    if (!S.on) return;
    if (R3.getView && R3.getView() !== 'ship') R3.setView('ship');
    const k = SHIPROOM[UI.top]; if (k && k !== S.room && (!S.travel || S.travel.k !== k)) go(k);
    const W = innerWidth, H = innerHeight; cam.aspect = W / H; cam.fov = cam.aspect < .8 ? 70 : cam.aspect < 1.25 ? 62 : 55; cam.updateProjectionMatrix();
    if (S.travel) {
      const tr = S.travel; tr.t += dt / tr.d; const u = Math.max(0, Math.min(1, ease(Math.min(1, tr.t))));
      tr.curve.getPointAt(u, cam.position);
      const ah = tr.curve.getPointAt(Math.min(1, u + .05)); ah.y = cam.position.y; const ahead = cam.position.clone().add(ah.sub(cam.position).normalize().multiplyScalar(5));
      const w0 = 1 - sstep(0, .2, u), w1 = sstep(.6, 1, u); S.look.copy(ahead).lerp(tr.from, w0).lerp(tr.to, w1);
      if (tr.t >= 1) arrive();
    } else if (S.room) {
      const v = viewOf(S.room), touch = matchMedia('(pointer: coarse)').matches;
      S.smx += ((touch ? Math.sin(S.t * .3) * .15 : S.mx) - S.smx) * Math.min(1, dt * 3); S.smy += ((touch ? 0 : S.my) - S.smy) * Math.min(1, dt * 3);
      const right = tv.copy(v.l).sub(v.p).cross(up).normalize();
      cam.position.copy(v.p).addScaledVector(right, S.smx * .35).add(ts.set(0, -S.smy * .18 + Math.sin(S.t * .7) * .02, 0));
      S.look.copy(v.l).addScaledVector(right, S.smx * .25);
      S.fade = Math.min(1, S.fade + rdt * 3.5); ui.style.opacity = S.fade.toFixed(3); ui.style.pointerEvents = S.fade > .5 ? '' : 'none';
    }
    cam.lookAt(S.look); cam.updateMatrixWorld(); camL.position.copy(cam.position);
    S.pm = panelMatrix(S.travel ? S.travel.k : S.room, W, H); cssApply(W, H);
  }
  // the 3D layer calls this to draw the ship interior
  function draw(renderer, W, H, df) {
    const dt = df / 60, c = S.t;
    for (const f of anim) f(dt, c);
    for (const d of doors) { const near = cam.position.distanceTo(d.wp) < 5 ? 1 : 0; d.o += (near - d.o) * Math.min(1, dt * 6); d.L.forEach(([lf, s]) => { lf.position.x = s * (DOORW / 4 + d.o * DOORW * .47); }); }
    // bridge view: the planet of your newest world
    const br = rooms.bridge; if (br && br.visible) { const wi = Math.max(0, Math.min(WORLDS.length - 1, (SAVE.wu | 0) - 1)), ac = WORLDS[wi].ac; if (br.userData.wc !== ac) { br.userData.wc = ac; br.userData.planet.material.color.set(ac).lerp(new T.Color('#ffffff'), .25); br.userData.pring.material.color.set(ac); br.userData.atm.material.color.set(ac); } br.userData.planet.rotation.y += dt * .01; }
    // workshop: your ship turns on the lift, the arms paint when your look changes
    if (rooms.shop.visible) {
      if ((S.t * 10 | 0) % 3 === 0) syncShip();
      shipGrp.rotation.y += dt * .3; shipGrp.position.y = 1.9 + Math.sin(c * 1.4) * .06; if (shipObj && R3.flickerShip) R3.flickerShip(shipObj, c * 60, .4);
      const cfg = G.showCfg || SAVE.pl[0].cfg; if (rooms.shop.userData.liftRing) rooms.shop.userData.liftRing.material.emissive.set(cfg.accent || COLS.shop);
      paintT = Math.max(0, paintT - dt); const pk = sstep(0, .4, paintT);
      arms.forEach((a, i) => { a.up.rotation.z = a.s * (.35 + pk * .45) + Math.sin(c * .6 + i) * .08; a.el.rotation.z = a.s * (.6 + pk * .5) + Math.sin(c * .8 + i * 2) * .1; a.base.rotation.y = Math.sin(c * .3 + i) * .4; a.tg.material.opacity = pk * (.7 + Math.random() * .3); });
      spray.material.opacity = pk * .9;
      if (pk > 0) { const pa = spray.geometry.attributes.position, sp = shipGrp.getWorldPosition(new T.Vector3()); spray.parent.worldToLocal(sp); arms.forEach((a, kk) => { a.tip.getWorldPosition(tv); spray.parent.worldToLocal(tv); for (let i = kk * 120; i < kk * 120 + 120; i++) { if (Math.random() < .08 || pa.getY(i) < .5) { pa.setXYZ(i, tv.x, tv.y - .4, tv.z); sprayV[i * 3] = (sp.x - tv.x) * .9 + (Math.random() - .5); sprayV[i * 3 + 1] = (sp.y - tv.y) * .9 + (Math.random() - .5) * .6; sprayV[i * 3 + 2] = (sp.z - tv.z) * .9 + (Math.random() - .5); } else pa.setXYZ(i, pa.getX(i) + sprayV[i * 3] * dt, pa.getY(i) + sprayV[i * 3 + 1] * dt, pa.getZ(i) + sprayV[i * 3 + 2] * dt); } }); pa.needsUpdate = true; }
    }
    renderer.render(scene, cam);
  }
  addEventListener('pointermove', e => { S.mx = e.clientX / innerWidth - .5; S.my = e.clientY / innerHeight - .5; }, { passive: true });
  // a tap during a flight skips straight to the room
  addEventListener('pointerdown', () => { if (S.on && S.travel && S.travel.t > .08) S.travel.t = 1; }, { capture: true, passive: true });
  requestAnimationFrame(frame);
  // the intro calls this the instant it starts to fade, so the ship is in place before anything underneath shows
  function handoff() { if (!S.on && wanted(true)) { enable(); if (S.on) { ui.style.opacity = 0; ui.style.pointerEvents = 'none'; const W = innerWidth, H = innerHeight; cam.aspect = W / H; cam.updateProjectionMatrix(); cam.lookAt(S.look); cam.updateMatrixWorld(); S.pm = panelMatrix(SHIPROOM[UI.top], W, H); cssApply(W, H); } } }
  return { S, go, handoff, get cam() { return cam; }, get rooms() { return rooms; }, get on() { return S.on; }, get room() { return S.room; }, get busy() { return !!S.travel || S.fade < 1 || (UI.top && SHIPROOM[UI.top] && SHIPROOM[UI.top] !== S.room); } };
})();
window.__SHIP = SHIP;
