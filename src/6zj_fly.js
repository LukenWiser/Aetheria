// ================= V87: the open galaxy - fly your capital ship between the worlds =================
const FLY = (function () {
  let T = window.THREE || null; const TAU = Math.PI * 2;
  let built = false, scene, cam, ship, shipParts = {}, worlds = [], hud = null, labels = [], st = null, sun, dust, prevDraw = null, prevView = null, last = null, lastT = 0, t0 = 0;
  const keys = {}, mv = { x: 0, y: 0 }, orb = { yaw: 0, pitch: 0, drag: false };
  let sd = 7; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const cvs = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; };
  const glowT = () => cvs(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  let GLOW = null, CLOUD = null;
  const cloudT = () => cvs(256, 256, (g) => { for (let i = 0; i < 26; i++) { const x = 60 + R() * 136, y = 60 + R() * 136, r = 30 + R() * 70, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,' + (.12 + R() * .14) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } });
  const spr = (col, s, op, add) => { const m = new T.SpriteMaterial({ map: GLOW, color: new T.Color(col), transparent: true, opacity: op === undefined ? 1 : op, depthWrite: false, blending: add === false ? T.NormalBlending : T.AdditiveBlending }); const sp = new T.Sprite(m); sp.scale.setScalar(s); return sp; };
  const std = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: new T.Color(c), metalness: .5, roughness: .55 }, o || {}));
  const emi = (c, i) => new T.MeshStandardMaterial({ color: 0x000000, emissive: new T.Color(c), emissiveIntensity: i || 2 });
  const shade = (hex, f) => { const c = new T.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };

  // ---------------- the worlds ----------------
  const KIND = ['city', 'jungle', 'dunes', 'nebula', 'hole', 'ice', 'lava', 'ocean', 'grid', 'brass', 'ring', 'crystal', 'gas', 'grave', 'core', 'glitch', 'prime'];
  const RAD = [190, 210, 170, 160, 120, 200, 180, 230, 170, 160, 150, 150, 300, 190, 110, 120, 260];
  function wpos(i) { const a = i * .62 + .3, r = 1100 + i * 360; return new T.Vector3(Math.cos(a) * r, Math.sin(i * 1.7) * 380, Math.sin(a) * r); }
  function planetTex(i) {
    const W0 = WORLDS[i], ac = W0.ac, c1 = W0.col[1], c2 = W0.col[2], k = KIND[i]; sd = 1000 + i * 77;
    let em = null;
    const map = cvs(1024, 512, (g, w, h) => {
      const blobs = (n, cols, r0, r1, a) => { for (let j = 0; j < n; j++) { const x = R() * w, y = h * .12 + R() * h * .76, r = r0 + R() * (r1 - r0); g.fillStyle = cols[j % cols.length]; g.globalAlpha = a; g.beginPath(); for (let q = 0; q < 14; q++) { const an = q / 14 * TAU, rr = r * (.6 + R() * .5); g.lineTo(x + Math.cos(an) * rr * 1.6, y + Math.sin(an) * rr); } g.fill(); g.globalAlpha = 1; } };
      const bands = (cols, n) => { for (let y = 0; y < h; y += h / n) { g.fillStyle = cols[(y / (h / n) | 0) % cols.length]; g.fillRect(0, y, w, h / n + 1); } for (let j = 0; j < 400; j++) { g.fillStyle = 'rgba(255,255,255,' + R() * .06 + ')'; g.fillRect(R() * w, R() * h, 20 + R() * 120, 1 + R() * 3); } };
      const speck = (n, a) => { for (let j = 0; j < n; j++) { g.fillStyle = 'rgba(' + (R() < .5 ? '255,255,255' : '0,0,0') + ',' + R() * a + ')'; g.fillRect(R() * w, R() * h, 2, 2); } };
      const craters = (n, c) => { for (let j = 0; j < n; j++) { const x = R() * w, y = R() * h, r = 3 + R() * 18; g.strokeStyle = c; g.globalAlpha = .5; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.globalAlpha = .25; g.fillStyle = '#000'; g.beginPath(); g.arc(x + 2, y + 2, r * .8, 0, TAU); g.fill(); g.globalAlpha = 1; } };
      const clouds = (n, a) => { for (let j = 0; j < n; j++) { g.fillStyle = 'rgba(255,255,255,' + (a * (.4 + R() * .6)) + ')'; const x = R() * w, y = R() * h; g.beginPath(); g.ellipse(x, y, 30 + R() * 90, 4 + R() * 10, (R() - .5) * .3, 0, TAU); g.fill(); } };
      switch (k) {
        case 'city': g.fillStyle = '#123a6b'; g.fillRect(0, 0, w, h); blobs(16, ['#4b5563', '#6b7280', '#3f6212'], 40, 110, 1); clouds(90, .5); break;
        case 'jungle': g.fillStyle = '#0f3b2a'; g.fillRect(0, 0, w, h); blobs(26, ['#166534', '#15803d', '#14532d', '#365314'], 40, 120, .9); clouds(120, .55); break;
        case 'dunes': g.fillStyle = '#9a3412'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(0,0,0,' + (.05 + .05 * Math.sin(y * .2)) + ')'; g.fillRect(0, y, w, 2); } blobs(12, ['#7c2d12', '#c2410c'], 50, 120, .6); craters(80, '#fed7aa'); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 12, w, 12); break;
        case 'nebula': bands(['#581c87', '#6b21a8', '#4c1d95', '#7e22ce', '#3b0764'], 22); break;
        case 'ice': g.fillStyle = '#9fbad6'; g.fillRect(0, 0, w, h); blobs(20, ['#b6cde4', '#7fa6cc', '#cfe0ef'], 40, 110, .8); g.strokeStyle = 'rgba(30,64,175,.5)'; for (let j = 0; j < 70; j++) { let x = R() * w, y = R() * h; g.lineWidth = 1 + R() * 2; g.beginPath(); g.moveTo(x, y); for (let q = 0; q < 6; q++) { x += (R() - .5) * 60; y += (R() - .5) * 30; g.lineTo(x, y); } g.stroke(); } break;
        case 'lava': g.fillStyle = '#1c1917'; g.fillRect(0, 0, w, h); speck(4000, .2); craters(60, '#57534e'); break;
        case 'ocean': g.fillStyle = '#04343f'; g.fillRect(0, 0, w, h); blobs(10, ['#065f46', '#0f766e'], 20, 50, .7); clouds(60, .35); break;
        case 'grid': g.fillStyle = '#070312'; g.fillRect(0, 0, w, h); break;
        case 'brass': bands(['#a16207', '#854d0e', '#ca8a04', '#713f12'], 14); for (let j = 0; j < 30; j++) { const x = R() * w, y = R() * h, r = 8 + R() * 22; g.strokeStyle = 'rgba(253,224,71,.5)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); for (let q = 0; q < 8; q++) { const an = q / 8 * TAU; g.fillStyle = 'rgba(253,224,71,.5)'; g.fillRect(x + Math.cos(an) * r - 2, y + Math.sin(an) * r - 2, 5, 5); } } break;
        case 'ring': g.fillStyle = '#64748b'; g.fillRect(0, 0, w, h); speck(5000, .25); craters(160, '#cbd5e1'); break;
        case 'crystal': g.fillStyle = '#f9a8d4'; g.fillRect(0, 0, w, h); blobs(20, ['#f0abfc', '#fbcfe8', '#c084fc'], 40, 100, .7); break;
        case 'gas': bands(['#3f6212', '#65a30d', '#4d7c0f', '#a3e635', '#365314', '#84cc16'], 26); g.fillStyle = 'rgba(254,249,195,.85)'; g.beginPath(); g.ellipse(w * .6, h * .62, 70, 30, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(101,163,13,.9)'; g.beginPath(); g.ellipse(w * .6, h * .62, 44, 16, 0, 0, TAU); g.fill(); break;
        case 'grave': g.fillStyle = '#44403c'; g.fillRect(0, 0, w, h); speck(5000, .25); craters(220, '#a8a29e'); break;
        case 'core': g.fillStyle = '#0e7490'; g.fillRect(0, 0, w, h); blobs(30, ['#22d3ee', '#67e8f9', '#0891b2'], 20, 70, .7); break;
        case 'glitch': g.fillStyle = '#0a0010'; g.fillRect(0, 0, w, h); for (let j = 0; j < 160; j++) { g.fillStyle = ['#ff2bd6', '#22d3ee', '#fff'][j % 3]; g.globalAlpha = .3 + R() * .6; g.fillRect(R() * w, R() * h, 10 + R() * 140, 2 + R() * 10); } g.globalAlpha = 1; break;
        case 'prime': g.fillStyle = '#1e40af'; g.fillRect(0, 0, w, h); blobs(18, ['#a16207', '#ca8a04', '#3f6212', '#d97706'], 40, 120, 1); clouds(110, .6); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, 0, w, 18); g.fillRect(0, h - 16, w, 16); break;
        default: g.fillStyle = shade(ac, .6); g.fillRect(0, 0, w, h);
      }
    });
    // night lights, magma cracks, glowing grids and bioluminescence live in an emissive map
    if (['city', 'lava', 'grid', 'ocean', 'prime', 'core'].includes(k)) em = cvs(1024, 512, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h); sd = 2000 + i * 31;
      if (k === 'city' || k === 'prime') for (let j = 0; j < 3000; j++) { const x = R() * w, y = h * .15 + R() * h * .7; g.fillStyle = R() < .7 ? '#fde68a' : '#fff7ed'; g.globalAlpha = .4 + R() * .6; g.fillRect(x, y, 2, 2); }
      if (k === 'lava') { g.strokeStyle = '#fb923c'; g.lineCap = 'round'; for (let j = 0; j < 120; j++) { let x = R() * w, y = R() * h; g.lineWidth = 1 + R() * 4; g.globalAlpha = .6 + R() * .4; g.beginPath(); g.moveTo(x, y); for (let q = 0; q < 7; q++) { x += (R() - .5) * 70; y += (R() - .5) * 40; g.lineTo(x, y); } g.stroke(); } }
      if (k === 'grid') { g.strokeStyle = '#4ade80'; g.lineWidth = 2; for (let x = 0; x <= w; x += 32) { g.globalAlpha = .7; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.fillStyle = '#e879f9'; for (let j = 0; j < 90; j++) g.fillRect((R() * 32 | 0) * 32 - 3, (R() * 16 | 0) * 32 - 3, 6, 6); }
      if (k === 'ocean') for (let j = 0; j < 900; j++) { g.fillStyle = R() < .5 ? '#2dd4bf' : '#a78bfa'; g.globalAlpha = .3 + R() * .5; g.beginPath(); g.arc(R() * w, R() * h, 1 + R() * 2.5, 0, TAU); g.fill(); }
      if (k === 'core') for (let j = 0; j < 200; j++) { g.strokeStyle = '#a5f3fc'; g.globalAlpha = .3 + R() * .4; g.lineWidth = 1 + R() * 2; g.beginPath(); g.arc(R() * w, R() * h, 4 + R() * 30, 0, TAU); g.stroke(); }
      g.globalAlpha = 1;
    });
    return { map, em };
  }
  function ringMesh(r0, r1, cols, op) {
    const t = cvs(512, 8, (g, w) => { for (let x = 0; x < w; x++) { g.fillStyle = cols[(x / 9 | 0) % cols.length]; g.globalAlpha = (.35 + .65 * Math.abs(Math.sin(x * .05))) * (x < 10 || x > w - 10 ? .3 : 1); g.fillRect(x, 0, 1, 8); } });
    const geo = new T.RingGeometry(r0, r1, 128, 1), pos = geo.attributes.position, uv = geo.attributes.uv, v = new T.Vector3(); for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - r0) / (r1 - r0), .5); }
    return new T.Mesh(geo, new T.MeshBasicMaterial({ map: t, side: T.DoubleSide, transparent: true, opacity: op || .85, depthWrite: false }));
  }
  function buildWorld(i) {
    const W0 = WORLDS[i], k = KIND[i], r = RAD[i], g = new T.Group(); g.position.copy(wpos(i)); const spin = new T.Group(); g.add(spin);
    const locked = i >= SAVE.wu; const o = { i, g, spin, r, k, locked, anim: [] };
    if (k === 'hole') {
      spin.add(new T.Mesh(new T.SphereGeometry(r, 48, 32), new T.MeshBasicMaterial({ color: 0x000000 })));
      const disk = cvs(512, 8, (gg, w) => { for (let x = 0; x < w; x++) { const f = x / w; gg.fillStyle = 'rgb(255,' + (200 - f * 170 | 0) + ',' + (120 - f * 110 | 0) + ')'; gg.globalAlpha = Math.pow(1 - f, 1.4) * (.6 + .4 * Math.sin(x * .3)); gg.fillRect(x, 0, 1, 8); } });
      const geo = new T.RingGeometry(r * 1.25, r * 4, 160, 1), pos = geo.attributes.position, uv = geo.attributes.uv, v = new T.Vector3(); for (let q = 0; q < pos.count; q++) { v.fromBufferAttribute(pos, q); uv.setXY(q, (v.length() - r * 1.25) / (r * 2.75), .5); }
      const dm = new T.Mesh(geo, new T.MeshBasicMaterial({ map: disk, side: T.DoubleSide, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); dm.rotation.x = -Math.PI / 2 + .25; g.add(dm);
      const halo = new T.Mesh(new T.TorusGeometry(r * 1.12, r * .06, 8, 96), new T.MeshBasicMaterial({ color: 0xffd7a0, transparent: true, opacity: .9, blending: T.AdditiveBlending })); g.add(halo); g.add(spr('#fb7185', r * 6, .35));
      o.anim.push((dt) => { dm.rotation.z += dt * .4; });
    } else if (k === 'glitch') {
      const m = new T.Mesh(new T.BoxGeometry(r * 1.4, r * 1.4, r * 1.4), std('#120018', { emissive: new T.Color('#ff2bd6'), emissiveIntensity: .4, map: planetTex(i).map })); spin.add(m);
      const wf = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(r * 1.7, r * 1.7, r * 1.7)), new T.LineBasicMaterial({ color: 0x22d3ee })); spin.add(wf);
      o.anim.push((dt, t) => { spin.rotation.x += dt * .5; spin.position.x = Math.random() < .06 ? (Math.random() - .5) * 30 : 0; wf.visible = Math.sin(t * 13) > -.6; });
    } else {
      const tx = planetTex(i), geo = k === 'crystal' ? new T.IcosahedronGeometry(r, 2) : new T.SphereGeometry(r, 64, 40);
      const mat = std('#ffffff', { map: tx.map, roughness: k === 'ocean' || k === 'ice' ? .35 : .8, metalness: k === 'brass' ? .6 : .05, flatShading: k === 'crystal' });
      if (tx.em) { mat.emissiveMap = tx.em; mat.emissive = new T.Color('#ffffff'); mat.emissiveIntensity = k === 'core' ? 1.6 : 1.1; }
      if (k === 'core') { mat.emissive = new T.Color('#22d3ee'); mat.emissiveIntensity = 1.2; }
      const pl = new T.Mesh(geo, mat); spin.add(pl); spin.rotation.z = .3;
      // atmosphere: a soft back-glow plus a thin rim shell
      g.add(spr(W0.ac, r * (k === 'core' ? 4 : 2.5), k === 'core' ? .45 : .16));
      const atm = new T.Mesh(new T.SphereGeometry(r * 1.04, 48, 32), new T.MeshBasicMaterial({ color: new T.Color(W0.ac), transparent: true, opacity: .07, blending: T.AdditiveBlending, depthWrite: false, side: T.BackSide })); g.add(atm);
      if (k === 'gas' || k === 'prime' || k === 'brass') { const rg = ringMesh(r * 1.4, r * 2.3, k === 'gas' ? ['#d9f99d', '#a3e635', '#65a30d', '#ecfccb'] : k === 'brass' ? ['#fde047', '#a16207', '#facc15'] : ['#fde68a', '#fbbf24', '#fef3c7', '#d97706'], .8); rg.rotation.x = -Math.PI / 2 + .35; g.add(rg); }
      if (k === 'ring') { const st2 = new T.Group(); st2.rotation.x = .5; g.add(st2); const hull = std('#94a3b8', { metalness: .8, roughness: .35 }), lit = emi('#e0f2fe', 2); for (let s = 0; s < 36; s++) { if (s % 9 === 4) continue; const a = s / 36 * TAU, seg = new T.Mesh(new T.BoxGeometry(46, 16, 22), hull); seg.position.set(Math.cos(a) * r * 2.1, 0, Math.sin(a) * r * 2.1); seg.rotation.y = -a; st2.add(seg); const wl = new T.Mesh(new T.BoxGeometry(40, 3, 1), lit); wl.position.copy(seg.position).multiplyScalar(1.0); wl.position.y = 4; wl.rotation.y = -a; st2.add(wl); } for (let s = 0; s < 4; s++) { const sp2 = new T.Mesh(new T.CylinderGeometry(3, 3, r * 2.1 * 2, 6), hull); sp2.rotation.z = Math.PI / 2; sp2.rotation.y = s / 4 * Math.PI; st2.add(sp2); } o.anim.push(dt => { st2.rotation.y += dt * .05; }); }
      if (k === 'crystal') { for (let s = 0; s < 14; s++) { const c = new T.Mesh(new T.OctahedronGeometry(14 + R() * 20, 0), std('#f5d0fe', { emissive: new T.Color('#e879f9'), emissiveIntensity: .8, roughness: .2, flatShading: true })); const a = R() * TAU, e = (R() - .5) * 1.2, d = r * (1.5 + R() * .8); c.position.set(Math.cos(a) * d, Math.sin(e) * d * .5, Math.sin(a) * d); c.scale.y = 2; g.add(c); } }
      if (k === 'grave') { const hull = std('#57534e', { metalness: .7, roughness: .5 }); for (let s = 0; s < 18; s++) { const b = new T.Mesh(new T.BoxGeometry(20 + R() * 60, 8 + R() * 16, 10 + R() * 20), hull); const a = R() * TAU, d = r * (1.4 + R() * .9); b.position.set(Math.cos(a) * d, (R() - .5) * r * .6, Math.sin(a) * d); b.rotation.set(R() * 3, R() * 3, R() * 3); g.add(b); } }
      if (k === 'nebula') { for (let s = 0; s < 22; s++) { const c = new T.Sprite(new T.SpriteMaterial({ map: CLOUD, color: new T.Color(['#a855f7', '#ec4899', '#6366f1', '#c084fc'][s % 4]), transparent: true, opacity: .12, depthWrite: false, blending: T.AdditiveBlending })); c.scale.setScalar(500 + R() * 700); c.position.set((R() - .5) * 1100, (R() - .5) * 500, (R() - .5) * 1100); g.add(c); } }
      if (k === 'core') { for (let s = 0; s < 3; s++) { const rr = new T.Mesh(new T.TorusGeometry(r * (1.6 + s * .45), 2.5, 6, 96), emi('#67e8f9', 1.6)); rr.rotation.set(R() * 3, R() * 3, 0); g.add(rr); o.anim.push(dt => { rr.rotation.x += dt * (.2 + s * .1); rr.rotation.y += dt * .15; }); } }
      // a moon or two
      if (['city', 'jungle', 'dunes', 'ice', 'ocean', 'prime', 'gas'].includes(k)) { const n = k === 'gas' ? 3 : 1 + (i % 2); for (let s = 0; s < n; s++) { const mn = new T.Mesh(new T.SphereGeometry(r * (.12 + R() * .1), 24, 16), std('#a8a29e', { roughness: .9 })); const piv = new T.Group(); piv.rotation.z = (R() - .5) * .6; piv.add(mn); mn.position.x = r * (2.2 + s * .7); g.add(piv); const sp3 = .05 + R() * .1; o.anim.push(dt => { piv.rotation.y += dt * sp3; }); } }
      o.anim.push(dt => { spin.rotation.y += dt * .03; });
      o.mat = mat;
    }
    if (locked) g.traverse(m => { if (m.material && m.material.color && !m.isSprite) { m.material = m.material.clone(); m.material.color.multiplyScalar(.25); if (m.material.emissive) m.material.emissiveIntensity *= .2; } else if (m.isSprite) m.material = m.material.clone(), m.material.opacity *= .3; });
    return o;
  }
  // ---------------- your capital ship ----------------
  function hullTex(ac) {
    return cvs(512, 512, (g, w, h) => {
      g.fillStyle = '#7b8494'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 128) { const tone = 110 + (R() * 30 | 0); g.fillStyle = 'rgb(' + tone + ',' + (tone + 6) + ',' + (tone + 16) + ')'; g.fillRect(x + 2, y + 2, 124, 60); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x, y, 128, 2); g.fillRect(x, y, 2, 64); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x + 2, y + 2, 124, 1); }
      for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(0,0,0,' + R() * .25 + ')'; g.fillRect(R() * w, R() * h, 2 + R() * 30, 2 + R() * 4); }
      g.fillStyle = ac; g.globalAlpha = .9; g.fillRect(0, 230, w, 26); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.4)'; for (let x = 0; x < w; x += 40) g.fillRect(x, 230, 20, 26);
      g.font = '900 34px monospace'; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText('ASV AETHERIA', 40, 320); g.font = '700 18px monospace'; g.fillText('HULL 01 / DRIFTWIRE YARDS', 40, 350);
    });
  }
  function buildShip() {
    const cfg = (SAVE.pl && SAVE.pl[0] && SAVE.pl[0].cfg) || {}, ac = cfg.accent || '#22d3ee', pc = cfg.paint || '#94a3b8';
    sd = 99; const S = new T.Group(), body = new T.Group(); S.add(body); shipParts = { nozz: [], flames: [], blink: [], dish: null, body };
    const hullM = std(pc, { map: hullTex(ac), metalness: .65, roughness: .4 }), dark = std('#1f2937', { metalness: .7, roughness: .45 }), mid = std('#475569', { metalness: .7, roughness: .4 }), glass = std('#0b1220', { emissive: new T.Color(ac), emissiveIntensity: .35, metalness: .9, roughness: .1 }), win = emi('#fde68a', 1.8), acM = emi(ac, 2.2);
    const B = (p, w, h, d, m, x, y, z, rx, ry, rz) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.set(rx || 0, ry || 0, rz || 0); p.add(b); return b; };
    const C = (p, rt, rb, h, m, x, y, z, rx, ry, rz, seg) => { const c = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 20), m); c.position.set(x, y, z); c.rotation.set(rx || 0, ry || 0, rz || 0); p.add(c); return c; };
    // spine: a long armoured hull tapering to a wedge prow (the ship faces -z)
    B(body, 16, 9, 70, hullM, 0, 0, 0); B(body, 22, 6, 46, hullM, 0, -5, 8); B(body, 12, 6, 30, mid, 0, 6, 4);
    const prow = new T.Mesh(new T.CylinderGeometry(0, 11, 34, 4, 1), hullM); prow.rotation.set(-Math.PI / 2, Math.PI / 4, 0); prow.scale.set(1, 1, .55); prow.position.set(0, -1, -51); body.add(prow);
    B(body, 4, 2, 50, acM, 0, 4.6, -6); B(body, 23, 1, 2, acM, 0, -2, -14); B(body, 23, 1, 2, acM, 0, -2, 26);
    // window rows along both flanks
    [-1, 1].forEach(s => { for (let z = -30; z < 30; z += 3.2) if (R() < .75) B(body, .3, .8, 1.6, win, s * 8.05, 1.5, z); for (let z = -12; z < 30; z += 3.2) if (R() < .6) B(body, .3, .7, 1.6, win, s * 11.05, -4, z); });
    // command tower with a lit bridge, masts, a spinning dish and blinking lights
    B(body, 9, 8, 12, hullM, 0, 11, 16); B(body, 7, 5, 9, mid, 0, 17, 18); B(body, 7.4, 1.6, 9.4, glass, 0, 16.5, 18); for (let x = -3; x <= 3; x += 1.2) B(body, .8, .9, .2, win, x, 16.6, 13.2);
    C(body, .3, .3, 12, dark, -2, 25, 20); C(body, .2, .2, 8, dark, 2, 23, 21); const dish = new T.Group(); dish.position.set(0, 20.5, 22.5); body.add(dish); C(dish, 3, .3, 1.4, mid, 0, 1, 0, .5, 0, 0, 16); C(dish, .2, .2, 2, dark, 0, 0, 0); shipParts.dish = dish;
    [[-2, 31.2, 20], [2, 27.2, 21]].forEach(p => { const l = new T.Mesh(new T.SphereGeometry(.5, 8, 6), emi('#ef4444', 3)); l.position.set(...p); body.add(l); shipParts.blink.push(l); });
    // swept wings with engine pods, turrets, running lights
    [-1, 1].forEach(s => {
      const wing = B(body, 26, 2.2, 22, hullM, s * 20, -3, 18, 0, s * -.35, s * -.06); B(body, 26, .5, 3, acM, s * 21, -1.8, 9, 0, s * -.35, s * -.06);
      C(body, 3.4, 3.4, 22, mid, s * 32, -3, 24, Math.PI / 2); C(body, 2.6, 3.4, 5, dark, s * 32, -3, 37, Math.PI / 2); const pn = new T.Mesh(new T.CircleGeometry(2.4, 20), emi(ac, 1.5)); pn.position.set(s * 32, -3, 39.6); body.add(pn); shipParts.nozz.push(pn);
      for (let t = 0; t < 3; t++) { const tz = -22 + t * 14, tu = new T.Group(); tu.position.set(s * 9, 4.5, tz); body.add(tu); C(tu, 1.6, 1.8, 1.2, dark, 0, 0, 0); B(tu, 2.4, 1.2, 2.6, mid, 0, 1, 0); C(tu, .25, .25, 4, dark, -.5, 1.2, -2.6, Math.PI / 2); C(tu, .25, .25, 4, dark, .5, 1.2, -2.6, Math.PI / 2); }
      const rl = new T.Mesh(new T.SphereGeometry(.7, 8, 6), emi(s < 0 ? '#ef4444' : '#22c55e', 3)); rl.position.set(s * 33.5, -2.5, 8); body.add(rl);
      for (let z = 0; z < 4; z++) B(body, 3, 1.2, 2, dark, s * (13 + z * 3), -5, 22 + z * 2);
    });
    // main engine block: four big bells with hot cores and long exhaust plumes
    B(body, 26, 14, 10, hullM, 0, -1, 37); for (let q = 0; q < 4; q++) { const x = (q % 2 ? 6 : -6), y = (q < 2 ? 3 : -5); C(body, 4.2, 5.4, 7, dark, x, y, 44, Math.PI / 2); const n = new T.Mesh(new T.CircleGeometry(3.8, 24), emi(ac, 1.5)); n.position.set(x, y, 47.6); body.add(n); shipParts.nozz.push(n); }
    const plT = cvs(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    shipParts.nozz.forEach(n => { const big = n.geometry.parameters.radius > 3; const fl = new T.Mesh(new T.ConeGeometry(n.geometry.parameters.radius * .9, 1, 16, 1, true), new T.MeshBasicMaterial({ map: plT, color: new T.Color(ac), transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); fl.rotation.x = -Math.PI / 2; fl.position.copy(n.position); fl.userData.base = big ? 26 : 16; body.add(fl); shipParts.flames.push(fl); const gs = spr(ac, n.geometry.parameters.radius * 4, .4); gs.position.copy(n.position); gs.position.z += 1; body.add(gs); });
    // greebles: hundreds of little boxes so the hull never reads as flat
    for (let q = 0; q < 220; q++) { const side = R(); let x, y, z = -32 + R() * 64; if (side < .4) { x = (R() - .5) * 14; y = 4.6 + R() * .6; } else if (side < .8) { const s = R() < .5 ? -1 : 1; x = s * (8 + R() * .5); y = -3 + R() * 6; } else { const s = R() < .5 ? -1 : 1; x = s * (11 + R() * .4); y = -7 + R() * 3; z = -14 + R() * 42; } B(body, .5 + R() * 2, .4 + R() * 1.2, .5 + R() * 3, R() < .5 ? dark : mid, x, y, z); }
    // hangar mouth under the prow
    B(body, 10, 3, 1, std('#020617'), 0, -6.2, -18); for (let x = -4; x <= 4; x += 2) B(body, .8, .3, .3, acM, x, -7.6, -18.6);
    S.scale.setScalar(1);
    return S;
  }
  // ---------------- the sky ----------------
  function buildSky() {
    const sky = cvs(2048, 1024, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#02030a'); gr.addColorStop(.5, '#060a1c'); gr.addColorStop(1, '#02030a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // the galactic band
      for (let i = 0; i < 260; i++) { const x = R() * w, y = h * .5 + Math.sin(x / w * TAU) * h * .12 + (R() - .5) * h * .14, r = 20 + R() * 90, c = ['80,70,140', '120,80,160', '60,90,160', '160,120,120'][i % 4], gg = g.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, 'rgba(' + c + ',' + (.02 + R() * .035) + ')'); gg.addColorStop(1, 'rgba(' + c + ',0)'); g.fillStyle = gg; g.fillRect(x - r, y - r, r * 2, r * 2); }
      for (let i = 0; i < 9000; i++) { const band = R() < .6, y = band ? h * .5 + Math.sin(0) * 0 + (R() - .5) * h * .3 : R() * h; g.fillStyle = 'rgba(255,255,255,' + R() * .8 + ')'; g.fillRect(R() * w, y, 1, 1); }
      for (let i = 0; i < 40; i++) { const x = R() * w, y = R() * h, r = 100 + R() * 220, c = ['168,85,247', '236,72,153', '56,189,248', '34,197,94', '251,146,60'][i % 5], gg = g.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, 'rgba(' + c + ',' + (.015 + R() * .03) + ')'); gg.addColorStop(1, 'rgba(' + c + ',0)'); g.fillStyle = gg; g.fillRect(x - r, y - r, r * 2, r * 2); }
    });
    const m = new T.Mesh(new T.SphereGeometry(30000, 48, 24), new T.MeshBasicMaterial({ map: sky, side: T.BackSide, depthWrite: false, fog: false })); scene.add(m);
    // stars with real depth
    const N = 7000, p = new Float32Array(N * 3), c = new Float32Array(N * 3), col = new T.Color();
    for (let i = 0; i < N; i++) { const v = new T.Vector3(R() - .5, R() - .5, R() - .5).normalize().multiplyScalar(9000 + R() * 15000); p.set([v.x, v.y, v.z], i * 3); col.setHSL([.6, .08, .12, .55][i % 4], .6, .7 + R() * .3); c.set([col.r, col.g, col.b], i * 3); }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(p, 3)); sg.setAttribute('color', new T.BufferAttribute(c, 3));
    scene.add(new T.Points(sg, new T.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, map: GLOW, transparent: true, depthWrite: false })));
    // three spiral galaxies far away
    for (let gi = 0; gi < 3; gi++) {
      const n = 6000, gp = new Float32Array(n * 3), gc = new Float32Array(n * 3), arms = 2 + gi, hue = [.62, .85, .08][gi];
      for (let i = 0; i < n; i++) { const r = Math.pow(R(), .7) * 2200, a = (i % arms) / arms * TAU + r * .0028 + (R() - .5) * .5; gp.set([Math.cos(a) * r + (R() - .5) * 120, (R() - .5) * 90 * (1 - r / 2400), Math.sin(a) * r + (R() - .5) * 120], i * 3); col.setHSL(r < 500 ? .1 : hue, .7, .55 + R() * .3); gc.set([col.r, col.g, col.b], i * 3); }
      const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(gp, 3)); gg.setAttribute('color', new T.BufferAttribute(gc, 3));
      const gx = new T.Points(gg, new T.PointsMaterial({ size: 14, sizeAttenuation: true, vertexColors: true, map: GLOW, transparent: true, opacity: .75, depthWrite: false, blending: T.AdditiveBlending }));
      const G2 = new T.Group(); G2.add(gx); const core = spr('#ffe8c2', 1600, .55); G2.add(core); G2.position.set([-14000, 12000, 6000][gi], [3000, -2500, 5200][gi], [-9000, -6000, 13000][gi]); G2.rotation.set(R() * 2, R() * 3, R() * 2); scene.add(G2); G2.userData.spin = .01 + gi * .005; worlds.galaxies = (worlds.galaxies || []).concat(G2);
    }
    // nebula banks you can fly through
    const banks = [[-1800, 300, -2200, '#7c3aed'], [3600, -500, 1400, '#db2777'], [-4200, 600, 3800, '#0ea5e9'], [800, 900, 5200, '#22c55e'], [5600, 200, -3600, '#f97316'], [-6000, -400, -800, '#e11d48'], [2200, -800, -5600, '#14b8a6']];
    banks.forEach(([x, y, z, c]) => { const G3 = new T.Group(); G3.position.set(x, y, z); scene.add(G3); for (let s = 0; s < 24; s++) { const cs = new T.Sprite(new T.SpriteMaterial({ map: CLOUD, color: new T.Color(c).offsetHSL((R() - .5) * .08, 0, (R() - .5) * .2), transparent: true, opacity: .05 + R() * .07, depthWrite: false, blending: T.AdditiveBlending })); cs.scale.setScalar(700 + R() * 1500); cs.position.set((R() - .5) * 2600, (R() - .5) * 900, (R() - .5) * 2600); G3.add(cs); } for (let s = 0; s < 6; s++) { const st3 = spr('#ffffff', 40 + R() * 60, .6); st3.position.set((R() - .5) * 2000, (R() - .5) * 700, (R() - .5) * 2000); G3.add(st3); } });
    // asteroid belt sweeping between the inner and outer worlds
    const ast = new T.Group(); scene.add(ast); const am = std('#57534e', { roughness: .95, metalness: .1, flatShading: true }), ag = new T.IcosahedronGeometry(1, 0);
    for (let i = 0; i < 260; i++) { const a = R() * TAU, r = 3600 + (R() - .5) * 700, m2 = new T.Mesh(ag, am); m2.position.set(Math.cos(a) * r, (R() - .5) * 160, Math.sin(a) * r); m2.scale.set(6 + R() * 30, 5 + R() * 22, 6 + R() * 26); m2.rotation.set(R() * 3, R() * 3, R() * 3); ast.add(m2); }
    worlds.belt = ast;
    // the sun
    sun = new T.DirectionalLight(0xfff1dc, 1.7); sun.position.set(-1, .35, .55); scene.add(sun); scene.add(new T.HemisphereLight(0x8fb4ff, 0x1a1020, .25)); scene.add(new T.AmbientLight(0x404a66, .22));
    const sunS = spr('#fff1dc', 5000, .9); sunS.position.set(-1, .35, .55).multiplyScalar(26000); scene.add(sunS); const sunH = spr('#fb923c', 12000, .35); sunH.position.copy(sunS.position); scene.add(sunH);
    // streaking dust: tiny lines that stretch with your speed
    const DN = 420, dp = new Float32Array(DN * 6); const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(dp, 3));
    dust = new T.LineSegments(dg, new T.LineBasicMaterial({ color: 0xbfdbfe, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false })); dust.frustumCulled = false; dust.userData.pts = []; for (let i = 0; i < DN; i++) dust.userData.pts.push(new T.Vector3((R() - .5) * 1600, (R() - .5) * 800, (R() - .5) * 1600)); scene.add(dust);
  }
  function build() {
    if (built) return; T = window.THREE; tmp = new T.Vector3(); tmp2 = new T.Vector3(); fwd = new T.Vector3(); built = true; GLOW = glowT(); CLOUD = cloudT();
    scene = new T.Scene(); cam = new T.PerspectiveCamera(60, 1, 1, 80000);
    buildSky(); for (let i = 0; i < WORLDS.length; i++) { const o = buildWorld(i); worlds.push(o); scene.add(o.g); if (i === GLITCH_W && o.locked) o.g.visible = false; }
    // a faint route line threading the worlds in order
    const pts = []; for (let i = 0; i < WORLDS.length; i++) if (i !== GLITCH_W) pts.push(wpos(i)); const cu = new T.CatmullRomCurve3(pts); const rl = new T.Line(new T.BufferGeometry().setFromPoints(cu.getPoints(600)), new T.LineDashedMaterial({ color: 0x38bdf8, dashSize: 30, gapSize: 40, transparent: true, opacity: .25 })); rl.computeLineDistances(); scene.add(rl);
    ship = buildShip(); scene.add(ship);
  }
  // ---------------- HUD ----------------
  const touch = () => matchMedia('(pointer: coarse)').matches;
  function mkHud() {
    const d = document.createElement('div'); d.id = 'flyHud';
    d.innerHTML = '<div class="fy-top"><div class="fy-ttl"><b>GALAXY</b><span>Fly to a world to drop in</span></div><div class="fy-btns"><button data-f="auto">AUTOPILOT <i>N</i></button><button data-f="exit" class="fy-exit">EXIT <i>ESC</i></button></div></div>'
      + '<div class="fy-help">' + (touch() ? 'Left side: steer and throttle &middot; Right side: look &middot; Tap a world name to autopilot' : 'W/S throttle &middot; A/D turn &middot; Space/C up/down &middot; Shift boost &middot; Drag to look &middot; Click a world name to autopilot') + '</div>'
      + '<canvas class="fy-radar" width="320" height="320"></canvas><div class="fy-spd"><div class="fy-bar"><i></i></div><span>0</span><em>KM/S</em></div><div class="fy-tgt"></div><div class="fy-arrow"></div><div class="fy-auto">AUTOPILOT ENGAGED</div>'
      + '<div class="fy-panel"></div><div class="fy-labels"></div>'
      + (touch() ? '<div class="fy-tb"><button data-f="boost">BOOST</button><button data-f="up">&#9650;</button><button data-f="down">&#9660;</button></div>' : '') + '<div class="fy-joy"><i></i></div><div class="fy-fade"></div>';
    document.body.appendChild(d); hud = d;
    const lw = d.querySelector('.fy-labels'); labels = worlds.map(o => { const e = document.createElement('div'); e.className = 'fy-lab'; e.dataset.i = o.i; lw.appendChild(e); return e; });
    d.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { e.stopPropagation(); const f = b.dataset.f; if (f === 'exit') close(); else if (f === 'auto') autoNext(); else if (f === 'launch') launch(); else if (f === 'map') routeMap(); else if (f.startsWith('sec:')) { st.sel = +f.slice(4); SFX.click(); panel(true); } else if (f.startsWith('tier:')) { st.tier = +f.slice(5); st.sel = firstOpen(st.near.i, st.tier); SFX.click(); panel(true); } return; } const l = e.target.closest('.fy-lab'); if (l) { const o = worlds[+l.dataset.i]; if (o && o.g.visible) { st.auto = o; SFX.click(); } } });
    // pointers: drag to look (mouse/right side), virtual stick (left side on touch)
    const joy = d.querySelector('.fy-joy'), knob = joy.firstChild; let jid = null, jx = 0, jy = 0, lid = null, lx = 0, ly = 0;
    d.addEventListener('pointerdown', e => { if (e.target.closest('button,.fy-lab,.fy-panel')) return; if (e.pointerType !== 'mouse' && e.clientX < innerWidth / 2 && jid == null) { jid = e.pointerId; jx = e.clientX; jy = e.clientY; joy.style.left = jx + 'px'; joy.style.top = jy + 'px'; joy.classList.add('on'); return; } lid = e.pointerId; lx = e.clientX; ly = e.clientY; orb.drag = true; });
    d.addEventListener('pointermove', e => { if (e.pointerId === jid) { const dx = e.clientX - jx, dy = e.clientY - jy, m = Math.min(1, Math.hypot(dx, dy) / 55), a = Math.atan2(dy, dx); mv.x = Math.cos(a) * m; mv.y = Math.sin(a) * m; knob.style.transform = 'translate(' + mv.x * 40 + 'px,' + mv.y * 40 + 'px)'; } else if (e.pointerId === lid) { orb.yaw -= (e.clientX - lx) * .006; orb.pitch = Math.max(-.9, Math.min(.7, orb.pitch + (e.clientY - ly) * .004)); lx = e.clientX; ly = e.clientY; } });
    const up = e => { if (e.pointerId === jid) { jid = null; mv.x = mv.y = 0; knob.style.transform = ''; joy.classList.remove('on'); } if (e.pointerId === lid) { lid = null; orb.drag = false; } };
    d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up);
    ['boost', 'up', 'down'].forEach(k => { const b = d.querySelector('[data-f="' + k + '"]'); if (!b) return; b.addEventListener('pointerdown', e => { e.stopPropagation(); keys['t' + k] = 1; }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { keys['t' + k] = 0; })); });
  }
  const KM = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', Space: 'u', KeyR: 'u', KeyC: 'd', KeyF: 'd', ControlLeft: 'd', ShiftLeft: 'boost', ShiftRight: 'boost' };
  addEventListener('keydown', e => { if (!st) return; e.stopPropagation(); const k = KM[e.code]; if (k) { keys[k] = 1; e.preventDefault(); if (k !== 'boost') st.auto = null; return; } if (e.code === 'Escape') { e.preventDefault(); close(); } else if (e.code === 'KeyN' || e.code === 'Tab') { e.preventDefault(); autoNext(e.code === 'Tab'); } else if ((e.code === 'KeyE' || e.code === 'Enter') && st.near) { e.preventDefault(); launch(); } else if (e.code === 'KeyM' && st.near) routeMap(); else if (/^Digit[1-9]$/.test(e.code) && st.near) { const n = +e.code.slice(5) - 1; if (n < LV) { st.sel = n; panel(true); } } }, true);
  addEventListener('keyup', e => { if (!st) return; e.stopPropagation(); const k = KM[e.code]; if (k) keys[k] = 0; }, true);
  addEventListener('blur', () => { for (const k in keys) keys[k] = 0; });
  function nextWorld() { const n = qNext(); return worlds[n.w]; }
  function autoNext(cycle) { if (!st) return; const open = worlds.filter(o => !o.locked && o.g.visible); if (!open.length) return; let o = nextWorld(); if (cycle && st.auto) { const k = open.indexOf(st.auto); o = open[(k + 1) % open.length]; } st.auto = o; SFX.click(); }
  // ---------------- the drop-in panel ----------------
  function panel(force) {
    const P = hud.querySelector('.fy-panel'), o = st.near; if (!o) { P.classList.remove('on'); st.pk = ''; return; }
    const W0 = WORLDS[o.i], pr = prog(o.i), tier = Math.min(st.tier || pr.t, pr.t), arr = pr.done[tier - 1] || [], key = o.i + ':' + tier + ':' + st.sel + ':' + arr.join(',');
    if (!force && st.pk === key) return; st.pk = key; P.classList.add('on'); P.style.setProperty('--ac', W0.ac);
    if (o.locked) { P.innerHTML = '<div class="fy-pw">WORLD ' + (o.i + 1) + '</div><h3>' + escH(W0.nm) + '</h3><p>' + escH(W0.sub) + '</p><div class="fy-lock">LOCKED &mdash; clear ' + escH(WORLDS[Math.max(0, o.i - 1)].nm) + ' to open the way here</div>'; return; }
    const stars = arr.reduce((a, v) => a + (v || 0), 0), tiers = pr.t > 1 ? '<div class="fy-tiers">' + Array.from({ length: pr.t }, (_, n) => '<button data-f="tier:' + (n + 1) + '" class="' + (n + 1 === tier ? 'on' : '') + '">TIER ' + (n + 1) + '</button>').join('') + '</div>' : '';
    const names = { c: 'Combat', e: 'Elite', s: 'Supply', h: 'Hunt', B: 'Boss' };
    const chips = o.i === GLITCH_W ? '' : '<div class="fy-secs">' + NODE_PAT.map((t, n) => { const done = !!arr[n], openN = done || nodeOpen(o.i, arr, n); return '<button data-f="sec:' + n + '" class="' + (done ? 'dn' : openN ? 'av' : 'lk') + (st.sel === n ? ' sel' : '') + (t === 'B' ? ' bs' : '') + '" ' + (openN ? '' : 'disabled') + ' title="' + (names[t] || 'Sector') + '">' + (t === 'B' ? 'BOSS' : n + 1) + (done ? '<em>' + '&#9733;'.repeat(arr[n]) + '</em>' : '') + '</button>'; }).join('') + '</div>';
    const t = NODE_PAT[st.sel], selOpen = arr[st.sel] || nodeOpen(o.i, arr, st.sel);
    P.innerHTML = '<div class="fy-pw">WORLD ' + (o.i + 1) + ' &middot; ' + stars + ' &#9733;</div><h3>' + escH(W0.nm) + '</h3><p>' + escH(W0.sub) + '</p>' + tiers + chips
      + (o.i === GLITCH_W ? '<div class="fy-row"><button data-f="map" class="fy-go">ENTER THE GLITCH <i>E</i></button></div>' : '<div class="fy-sel">' + (t === 'B' ? 'BOSS &mdash; ' + escH((BOSSES[o.i] || {}).nm || 'Guardian') : 'SECTOR ' + (st.sel + 1) + ' &middot; ' + (names[t] || 'Combat').toUpperCase()) + '</div><div class="fy-row"><button data-f="launch" class="fy-go" ' + (selOpen ? '' : 'disabled') + '>DROP IN <i>E</i></button><button data-f="map">ROUTE MAP <i>M</i></button></div>');
  }
  function leave(after) { const h = hud; if (h) h.classList.add('out'); setTimeout(() => { close(true); after && after(); }, 280); }
  function launch() { const o = st && st.near; if (!o || o.locked) { SFX.no && SFX.no(); return; } if (o.i === GLITCH_W) { routeMap(); return; } const pr = prog(o.i), tier = Math.min(st.tier || pr.t, pr.t), arr = pr.done[tier - 1] || []; if (!(arr[st.sel] || nodeOpen(o.i, arr, st.sel))) { SFX.no && SFX.no(); return; } const sel = st.sel; SFX.click(); leave(() => { UI.mode = 'expedition'; UI.w = o.i; UI.tier = tier; UI.sel = sel; UI.alt = null; ACT.start([]); }); }
  function routeMap() { const o = st && st.near; if (!o || o.locked) return; const pr = prog(o.i), tier = Math.min(st.tier || pr.t, pr.t); SFX.click(); leave(() => { UI.mode = 'expedition'; UI.w = o.i; UI.tier = tier; UI.sel = st && st.sel !== undefined ? st.sel : firstOpen(o.i, tier); UI.alt = null; UI.show('scMap'); }); }
  // ---------------- the loop (drawn by the 3D engine in place of the ship interior) ----------------
  let tmp, tmp2, fwd;
  function draw(renderer, W, H) {
    if (!st) return; const now = performance.now(), rdt = Math.min(.1, (now - lastT) / 1000 || .016), dt = Math.min(.05, rdt); lastT = now; const t = (now - t0) / 1000;
    cam.aspect = W / H; const S = st;
    // input: keyboard, touch stick, gamepad
    let thr = (keys.f ? 1 : 0) - (keys.b ? .5 : 0) - mv.y, turn = (keys.r ? 1 : 0) - (keys.l ? 1 : 0) + mv.x, vert = (keys.u || keys.tup ? 1 : 0) - (keys.d || keys.tdown ? 1 : 0), boost = keys.boost || keys.tboost;
    const gps = navigator.getGamepads ? navigator.getGamepads() : []; for (const gp of gps) { if (!gp || !gp.connected) continue; const dz = v => Math.abs(v) < .15 ? 0 : v; turn += dz(gp.axes[0]); thr -= dz(gp.axes[1]); const rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0); if (rx || ry) { orb.yaw -= rx * rdt * 2.4; orb.pitch = Math.max(-.9, Math.min(.7, orb.pitch + ry * rdt * 1.6)); orb.drag = true; } else if (!S.mdrag) orb.drag = false; const b = n => gp.buttons[n] && gp.buttons[n].pressed; if (b(7)) boost = 1; if (b(5)) vert += 1; if (b(4)) vert -= 1; const edge = n => { const was = S.gb[n]; S.gb[n] = b(n); return b(n) && !was; }; if (edge(1)) { close(); return; } if (edge(0) && S.near) launch(); if (edge(3)) autoNext(); if (edge(2) && S.near) routeMap(); if (edge(14) && S.near) { S.sel = Math.max(0, S.sel - 1); panel(true); } if (edge(15) && S.near) { S.sel = Math.min(LV - 1, S.sel + 1); panel(true); } break; }
    if (Math.abs(thr) > .05 || Math.abs(turn) > .05 || Math.abs(vert) > .05) S.auto = null;
    // autopilot: turn toward the target, climb or dive to its height, burn hard when far and ease in
    if (S.auto) { const o = S.auto; tmp.copy(o.g.position).sub(S.pos); const dist = tmp.length(), want = Math.atan2(-tmp.x, -tmp.z); let d = want - S.yaw; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; turn = Math.max(-1, Math.min(1, d * 2.5)); vert = Math.max(-1, Math.min(1, tmp.y / 300)); const stopAt = o.r * 2.3; thr = Math.abs(d) < .9 ? Math.max(0, Math.min(1, (dist - stopAt) / 600)) : .15; boost = dist > 2200 && Math.abs(d) < .3; if (dist < stopAt + 40) { S.auto = null; } }
    thr = Math.max(-.5, Math.min(1, thr)); turn = Math.max(-1, Math.min(1, turn)); vert = Math.max(-1, Math.min(1, vert));
    const maxV = boost && thr > .2 ? 1500 : 420; S.yaw -= turn * dt * (.9 - Math.min(.5, S.spd / 3000)); fwd.set(-Math.sin(S.yaw), 0, -Math.cos(S.yaw));
    S.spd += (thr * maxV - S.spd) * Math.min(1, dt * (boost ? 1.2 : 1.6)); S.vy += (vert * 260 - S.vy) * Math.min(1, dt * 2.2);
    S.pos.addScaledVector(fwd, S.spd * dt); S.pos.y += S.vy * dt; S.pos.y = Math.max(-2600, Math.min(2600, S.pos.y));
    // bump around planets instead of through them
    let near = null, nd = 1e9; for (const o of worlds) { if (!o.g.visible) continue; tmp.copy(S.pos).sub(o.g.position); const d = tmp.length(), minD = o.r * 1.25 + 30; if (d < minD) { S.pos.copy(o.g.position).addScaledVector(tmp.normalize(), minD); S.spd *= .9; } const rng = o.r * 2.8 + 120; if (d < rng && d < nd) { nd = d; near = o; } }
    if (near !== S.near) { S.near = near; if (near) { const pr = prog(near.i); S.tier = pr.t; S.sel = firstOpen(near.i, pr.t); SFX.click && SFX.click(); } panel(true); } else panel();
    ship.position.copy(S.pos); S.bank += (-turn * .45 - S.bank) * Math.min(1, dt * 3); S.pitch += (S.vy / 900 - S.pitch) * Math.min(1, dt * 3);
    ship.rotation.set(0, S.yaw, 0); shipParts.body.rotation.set(S.pitch, 0, S.bank); shipParts.body.position.y = Math.sin(t * 1.1) * .8;
    // engines and lights
    const heat = Math.max(.08, Math.abs(S.spd) / 1500); shipParts.flames.forEach((f, k) => { const L = f.userData.base * (.25 + heat * (boost ? 3 : 1.6)) * (1 + Math.sin(t * 40 + k) * .06); f.scale.set(1, L, 1); f.position.z = shipParts.nozz[k].position.z + L / 2 + .3; f.material.opacity = .3 + heat * .45; });
    shipParts.blink.forEach((l, k) => { l.visible = Math.sin(t * 3 + k * 2) > .6; }); if (shipParts.dish) shipParts.dish.rotation.y += dt * 1.2;
    for (const o of worlds) for (const f of o.anim) f(dt, t); (worlds.galaxies || []).forEach(g2 => { g2.rotation.y += dt * g2.userData.spin * .2; }); if (worlds.belt) worlds.belt.rotation.y += dt * .004;
    // chase camera: sits behind and above, swings out when you turn, pulls back and widens when you boost
    if (!orb.drag) { orb.yaw *= 1 - Math.min(1, dt * 1.5); orb.pitch += (0 - orb.pitch) * Math.min(1, dt * 1.5); }
    const back = 110 + Math.min(80, S.spd * .05), cy = S.yaw + orb.yaw + S.bank * .4; tmp.set(Math.sin(cy) * back * Math.cos(orb.pitch * .8), 34 + Math.sin(-orb.pitch) * back + S.vy * .03, Math.cos(cy) * back * Math.cos(orb.pitch * .8)).add(S.pos);
    cam.position.lerp(tmp, Math.min(1, dt * 4)); for (const o of worlds) { if (!o.g.visible) continue; tmp.copy(cam.position).sub(o.g.position); const mn = o.r * 1.12 + 20; if (tmp.length() < mn) cam.position.copy(o.g.position).addScaledVector(tmp.normalize(), mn); } tmp2.copy(S.pos).addScaledVector(fwd, 60); tmp2.y += 10; cam.lookAt(tmp2);
    const wantF = 58 + Math.min(18, Math.max(0, S.spd - 420) / 60); cam.fov += (wantF - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix();
    // streaks
    const pa = dust.geometry.attributes.position.array, vel = fwd.clone().multiplyScalar(S.spd).add(tmp.set(0, S.vy, 0)), sl = Math.min(90, vel.length() * .045);
    dust.userData.pts.forEach((p, k) => { tmp.copy(p).sub(S.pos); if (tmp.x > 800) p.x -= 1600; else if (tmp.x < -800) p.x += 1600; if (tmp.y > 400) p.y -= 800; else if (tmp.y < -400) p.y += 800; if (tmp.z > 800) p.z -= 1600; else if (tmp.z < -800) p.z += 1600; tmp2.copy(vel).normalize().multiplyScalar(-Math.max(1.5, sl)); pa.set([p.x, p.y, p.z, p.x + tmp2.x, p.y + tmp2.y, p.z + tmp2.z], k * 6); });
    dust.geometry.attributes.position.needsUpdate = true; dust.material.opacity = .25 + Math.min(.5, S.spd / 1500);
    renderer.render(scene, cam);
    hudFrame(W, H, t);
    last = { pos: S.pos.clone(), yaw: S.yaw };
  }
  function hudFrame(W, H, t) {
    const S = st; if (!hud) return;
    hud.querySelector('.fy-spd span').textContent = Math.round(Math.abs(S.spd) * 2.4); hud.querySelector('.fy-bar i').style.width = Math.min(100, Math.abs(S.spd) / 15) + '%'; hud.querySelector('.fy-spd').classList.toggle('boost', S.spd > 600);
    hud.querySelector('.fy-auto').classList.toggle('on', !!S.auto);
    // world labels follow the planets on screen
    cam.updateMatrixWorld(); const nx = nextWorld();
    worlds.forEach((o, k) => { const el = labels[k]; if (!o.g.visible) { el.style.display = 'none'; return; } tmp.copy(o.g.position); tmp.y += o.r * 1.15; const d = tmp.distanceTo(cam.position); tmp.project(cam); if (tmp.z > 1 || Math.abs(tmp.x) > 1.2 || Math.abs(tmp.y) > 1.2) { el.style.display = 'none'; return; }
      el.style.display = ''; el.style.transform = 'translate(' + ((tmp.x + 1) / 2 * W) + 'px,' + ((1 - tmp.y) / 2 * H) + 'px) translate(-50%,-100%)'; const W0 = WORLDS[o.i], pr = prog(o.i), arr = pr.done[0] || [], dn = arr.filter(Boolean).length;
      const key = o.locked + ':' + dn + ':' + (o === nx) + ':' + (o === S.auto) + ':' + (o === S.near); if (el._k !== key) { el._k = key; el.innerHTML = '<b>' + (o.i === 16 && o.locked ? '???' : escH(W0.nm)) + '</b><span>' + (o.locked ? 'LOCKED' : 'WORLD ' + (o.i + 1) + ' &middot; ' + dn + '/' + LV) + '</span>' + (o === nx && !o.locked ? '<em>NEXT</em>' : ''); el.style.setProperty('--ac', W0.ac); el.classList.toggle('lk', o.locked); el.classList.toggle('tg', o === S.auto); el.classList.toggle('nx', o === nx); }
      el.style.opacity = Math.max(.35, Math.min(1, 6000 / d)); });
    // objective marker: the autopilot target or your next world, with an edge arrow when it is off screen
    const tg = S.auto || (nx && !S.near ? nx : null), mk = hud.querySelector('.fy-tgt'), ar = hud.querySelector('.fy-arrow');
    if (tg) { tmp.copy(tg.g.position); const dist = tmp.distanceTo(S.pos); tmp.project(cam); const behind = tmp.z > 1, on = !behind && Math.abs(tmp.x) < .95 && Math.abs(tmp.y) < .95; mk.style.display = on ? '' : 'none'; ar.style.display = on ? 'none' : ''; if (on) { mk.style.transform = 'translate(' + ((tmp.x + 1) / 2 * W) + 'px,' + ((1 - tmp.y) / 2 * H) + 'px) translate(-50%,-50%)'; mk.textContent = Math.round(dist / 10) / 100 + ' AU'; } else { let x = tmp.x, y = tmp.y; if (behind) { x = -x; y = -y; } const a = Math.atan2(y, x), r = Math.min(W, H) * .42; ar.style.transform = 'translate(' + (W / 2 + Math.cos(a) * r) + 'px,' + (H / 2 - Math.sin(a) * r) + 'px) rotate(' + (-a) + 'rad)'; ar.style.setProperty('--ac', WORLDS[tg.i].ac); } } else { mk.style.display = 'none'; ar.style.display = 'none'; }
    // radar: top-down, your heading up
    const cv2 = hud.querySelector('.fy-radar'), g = cv2.getContext('2d'), Rr = 150, sc = Rr / 9000; g.clearRect(0, 0, 320, 320); g.save(); g.translate(160, 160);
    g.fillStyle = 'rgba(2,6,23,.72)'; g.beginPath(); g.arc(0, 0, Rr, 0, TAU); g.fill(); g.strokeStyle = 'rgba(56,189,248,.35)'; g.lineWidth = 2; g.stroke(); [.33, .66].forEach(f => { g.beginPath(); g.arc(0, 0, Rr * f, 0, TAU); g.strokeStyle = 'rgba(56,189,248,.12)'; g.stroke(); });
    g.rotate(S.yaw); g.save(); g.beginPath(); g.arc(0, 0, Rr - 2, 0, TAU); g.clip();
    worlds.forEach(o => { if (!o.g.visible) return; const x = (o.g.position.x - S.pos.x) * sc, y = (o.g.position.z - S.pos.z) * sc; g.fillStyle = o.locked ? 'rgba(148,163,184,.4)' : WORLDS[o.i].ac; g.beginPath(); g.arc(x, y, o === nx ? 7 : 5, 0, TAU); g.fill(); if (o === S.auto || o === nx) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 10 + Math.sin(t * 5) * 2, 0, TAU); g.stroke(); } });
    g.restore(); g.rotate(-S.yaw); g.fillStyle = '#e0f2fe'; g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.fill(); g.restore();
  }
  // ---------------- open / close ----------------
  function available() { return !!window.THREE && typeof R3 !== 'undefined' && R3 && !R3.lost && !R3.shipFail && SET.models && !!R3.setView; }
  function open(opt) {
    if (st) return true; if (!available()) return false;
    try { build(); } catch (e) { console.warn('galaxy failed to build', e); built = false; return false; }
    const n = (opt && opt.w !== undefined) ? worlds[opt.w] : nextWorld();
    st = { pos: new T.Vector3(), yaw: 0, spd: 0, vy: 0, bank: 0, pitch: 0, near: null, auto: null, sel: 0, tier: 1, gb: {}, pk: '' };
    if (last && !(opt && opt.w !== undefined)) { st.pos.copy(last.pos); st.yaw = last.yaw; }
    else { const p = n.g.position; const a = Math.atan2(p.x, p.z) + .5; st.pos.set(p.x + Math.sin(a) * (n.r * 2 + 900), p.y + 80, p.z + Math.cos(a) * (n.r * 2 + 900)); tmp.copy(p).sub(st.pos); st.yaw = Math.atan2(-tmp.x, -tmp.z); }
    worlds.forEach(o => { const lk = o.i >= SAVE.wu; if (lk !== o.locked) { scene.remove(o.g); const k = worlds.indexOf(o); const nw = buildWorld(o.i); worlds[k] = nw; scene.add(nw.g); } }); if (worlds[GLITCH_W]) worlds[GLITCH_W].g.visible = !worlds[GLITCH_W].locked;
    scene.remove(ship); ship = buildShip(); scene.add(ship); ship.position.copy(st.pos);
    cam.position.set(st.pos.x + Math.sin(st.yaw) * 400, st.pos.y + 160, st.pos.z + Math.cos(st.yaw) * 400); cam.fov = 58;
    G.fly = true; document.body.classList.add('flying'); const ui = document.getElementById('ui'); if (ui) { ui.dataset.fop = ui.style.opacity; ui.style.opacity = 0; ui.style.pointerEvents = 'none'; }
    prevDraw = R3.shipDraw; prevView = R3.getView ? R3.getView() : 'menu'; R3.shipDraw = draw; R3.setView('ship');
    mkHud(); lastT = performance.now(); t0 = lastT; for (const k in keys) keys[k] = 0; orb.yaw = orb.pitch = 0;
    try { SFX.dash && SFX.dash(); } catch (e) { }
    return true;
  }
  function close(quiet) {
    if (!st) return; st = null; G.fly = false; document.body.classList.remove('flying'); if (hud) hud.remove(); hud = null; labels = [];
    R3.shipDraw = prevDraw; if (!(typeof SHIP !== 'undefined' && SHIP.on)) R3.setView(prevView || 'menu');
    const ui = document.getElementById('ui'); if (ui) { ui.style.opacity = ui.dataset.fop || ''; ui.style.pointerEvents = ''; }
    if (!quiet) { try { UI.show('scMenu'); } catch (e) { } }
  }
  return { open, close, available, get on() { return !!st; }, get _st() { return st; }, get _cam() { return cam; }, get _worlds() { return worlds; } };
})();

// the Map button now opens the galaxy; the route map is one tap away inside it
const _mxmapFly = ACT.mxmap;
ACT.mxmap = function () { if (SET.flyMap !== false && FLY.open()) return; return _mxmapFly.apply(this, arguments); };
ACT.galaxyfly = () => { if (!FLY.open()) _mxmapFly(); };
(function () {
  const st = document.createElement('style'); st.textContent = `
body.flying #qCrumb,body.flying #shipTag,body.flying #padCur,body.flying #pcur{display:none!important}
#flyHud{position:fixed;inset:0;z-index:60;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;font-family:var(--mono)}
#flyHud .fy-top{position:absolute;top:14px;left:16px;right:16px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;pointer-events:none}
#flyHud .fy-ttl b{display:block;font:italic 900 26px var(--disp,system-ui);letter-spacing:.14em;color:#e0f2fe;text-shadow:0 0 18px rgba(56,189,248,.7)}
#flyHud .fy-ttl span{font:800 10px var(--mono);letter-spacing:.2em;color:#7dd3fc}
#flyHud .fy-btns{display:flex;gap:8px;pointer-events:auto}
#flyHud button{font:900 11px var(--mono);letter-spacing:.16em;color:#e0f2fe;background:rgba(8,47,73,.7);border:1px solid rgba(56,189,248,.55);padding:9px 14px;cursor:pointer;pointer-events:auto}
#flyHud button:hover{background:rgba(14,116,144,.8)}
#flyHud button i{font-style:normal;opacity:.6;margin-left:6px;font-size:9px}
#flyHud .fy-exit{color:#fecaca;background:rgba(127,29,29,.55);border-color:rgba(248,113,113,.6)}
#flyHud .fy-help{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);font:800 10px var(--mono);letter-spacing:.12em;color:#cbd5e1;background:rgba(2,6,15,.6);padding:7px 14px;border:1px solid rgba(148,163,184,.25);white-space:nowrap;max-width:94vw;overflow:hidden;text-overflow:ellipsis;animation:fyHelp 9s forwards;pointer-events:none}
@keyframes fyHelp{0%,75%{opacity:1}100%{opacity:.2}}
#flyHud .fy-radar{position:absolute;left:16px;bottom:16px;width:150px;height:150px;pointer-events:none}
#flyHud .fy-spd{position:absolute;right:18px;bottom:22px;display:flex;align-items:baseline;gap:8px;color:#e0f2fe;pointer-events:none}
#flyHud .fy-spd span{font:900 30px var(--mono);min-width:3.4em;text-align:right}
#flyHud .fy-spd em{font:800 10px var(--mono);font-style:normal;letter-spacing:.2em;color:#7dd3fc}
#flyHud .fy-bar{width:150px;height:6px;background:rgba(148,163,184,.25);align-self:center}
#flyHud .fy-bar i{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#e0f2fe);transition:width .1s}
#flyHud .fy-spd.boost .fy-bar i{background:linear-gradient(90deg,#f97316,#fde68a);box-shadow:0 0 12px #fb923c}
#flyHud .fy-labels{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}#flyHud .fy-panel,#flyHud .fy-top,#flyHud .fy-radar,#flyHud .fy-spd{z-index:2}
#flyHud .fy-lab{position:absolute;left:0;top:0;text-align:center;pointer-events:auto;cursor:pointer;padding:4px 8px;white-space:nowrap}
#flyHud .fy-lab b{display:block;font:900 12px var(--mono);letter-spacing:.14em;color:#fff;text-shadow:0 0 10px var(--ac),0 1px 2px #000}
#flyHud .fy-lab span{font:800 9px var(--mono);letter-spacing:.16em;color:var(--ac)}
#flyHud .fy-lab em{display:block;font:900 8px var(--mono);font-style:normal;letter-spacing:.2em;color:#020617;background:var(--ac);margin:3px auto 0;width:max-content;padding:1px 6px}
#flyHud .fy-lab.lk b{color:#94a3b8;text-shadow:none}#flyHud .fy-lab.lk span{color:#64748b}
#flyHud .fy-lab.tg b{outline:1px solid var(--ac);outline-offset:3px}
#flyHud .fy-lab:hover b{color:var(--ac)}
#flyHud .fy-tgt{position:absolute;left:0;top:0;width:58px;height:58px;border:2px solid #e0f2fe;border-radius:50%;box-shadow:0 0 12px rgba(56,189,248,.8);pointer-events:none;display:flex;align-items:flex-end;justify-content:center;font:900 9px var(--mono);color:#e0f2fe;letter-spacing:.1em;padding-bottom:0;line-height:0;text-shadow:0 1px 2px #000}
#flyHud .fy-arrow{position:absolute;left:0;top:0;width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:22px solid var(--ac,#38bdf8);filter:drop-shadow(0 0 6px var(--ac,#38bdf8));pointer-events:none;margin:-12px 0 0 -11px}
#flyHud .fy-auto{position:absolute;left:50%;top:70px;transform:translateX(-50%);font:900 11px var(--mono);letter-spacing:.24em;color:#fde68a;background:rgba(120,53,15,.55);border:1px solid rgba(251,191,36,.6);padding:6px 14px;opacity:0;transition:opacity .25s;pointer-events:none}
#flyHud .fy-auto.on{opacity:1;animation:fyPulse 1.2s infinite}
@keyframes fyPulse{50%{box-shadow:0 0 18px rgba(251,191,36,.6)}}
#flyHud .fy-panel{position:absolute;right:18px;top:50%;transform:translate(30px,-50%);width:min(360px,calc(100vw - 36px));background:linear-gradient(180deg,rgba(2,6,23,.92),rgba(8,15,35,.92));border:1px solid var(--ac,#38bdf8);border-left:4px solid var(--ac,#38bdf8);padding:16px 16px 14px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;box-shadow:0 0 40px rgba(0,0,0,.6),0 0 24px color-mix(in srgb,var(--ac,#38bdf8) 30%,transparent);cursor:default}
#flyHud .fy-panel.on{opacity:1;transform:translate(0,-50%);pointer-events:auto}
#flyHud .fy-pw{font:900 10px var(--mono);letter-spacing:.2em;color:var(--ac)}
#flyHud .fy-panel h3{margin:4px 0 2px;font:italic 900 22px var(--disp,system-ui);letter-spacing:.06em;color:#fff}
#flyHud .fy-panel p{margin:0 0 10px;font:600 11px/1.4 system-ui;color:#94a3b8}
#flyHud .fy-tiers{display:flex;gap:4px;margin-bottom:8px}#flyHud .fy-tiers button{padding:5px 8px;font-size:9px}#flyHud .fy-tiers button.on{background:var(--ac);color:#020617}
#flyHud .fy-secs{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:10px}
#flyHud .fy-secs button{padding:7px 0;font-size:11px;position:relative;background:rgba(15,23,42,.8);border-color:rgba(148,163,184,.35)}
#flyHud .fy-secs button em{display:block;font:900 7px var(--mono);font-style:normal;color:#fde047;letter-spacing:0;margin-top:1px}
#flyHud .fy-secs button.av{border-color:var(--ac);color:#fff}
#flyHud .fy-secs button.dn{background:rgba(20,83,45,.5);border-color:rgba(74,222,128,.5)}
#flyHud .fy-secs button.lk{opacity:.35;cursor:not-allowed}
#flyHud .fy-secs button.bs{grid-column:span 2;color:#fecaca;border-color:rgba(248,113,113,.6)}
#flyHud .fy-secs button.sel{outline:2px solid #fff;outline-offset:1px;background:color-mix(in srgb,var(--ac) 35%,#020617)}
#flyHud .fy-sel{font:900 11px var(--mono);letter-spacing:.16em;color:#e2e8f0;margin-bottom:8px}
#flyHud .fy-row{display:flex;gap:8px}#flyHud .fy-row button{flex:1}
#flyHud .fy-go{background:var(--ac)!important;color:#020617!important;border-color:var(--ac)!important;font-size:13px!important}
#flyHud .fy-go[disabled]{opacity:.4;cursor:not-allowed}
#flyHud .fy-lock{font:900 11px var(--mono);letter-spacing:.12em;color:#fca5a5;background:rgba(127,29,29,.35);border:1px solid rgba(248,113,113,.4);padding:10px}
#flyHud .fy-joy{position:absolute;width:110px;height:110px;margin:-55px 0 0 -55px;border-radius:50%;border:2px solid rgba(148,163,184,.45);background:rgba(15,23,42,.35);display:none;pointer-events:none}
#flyHud .fy-joy.on{display:block}#flyHud .fy-joy i{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(125,211,252,.55)}
#flyHud .fy-tb{position:absolute;right:16px;bottom:70px;display:flex;flex-direction:column;gap:8px}#flyHud .fy-tb button{width:72px;height:52px;padding:0}
#flyHud .fy-fade{position:absolute;inset:0;background:#02040a;pointer-events:none;animation:fyIn .5s ease forwards}
#flyHud.out .fy-fade{animation:fyOut .28s ease forwards}
@keyframes fyIn{from{opacity:1}to{opacity:0}}@keyframes fyOut{from{opacity:0}to{opacity:1}}
@media (max-width:700px){#flyHud .fy-panel{top:auto;bottom:12px;right:12px;transform:translateY(20px)}#flyHud .fy-panel.on{transform:none}#flyHud .fy-radar{width:110px;height:110px;bottom:auto;top:70px}#flyHud .fy-spd{bottom:auto;top:76px}#flyHud .fy-spd span{font-size:20px}#flyHud .fy-bar{width:70px}}
`; document.head.appendChild(st);
})();
window.__FLY = FLY;
if (SET.flyMap === undefined) SET.flyMap = true;
try { SETS.GRAPHICS.push(['flyMap', 'tog', 'Galaxy flight map', 'Pick worlds by flying your ship through the galaxy. Off: the classic sector map']); } catch (e) { }
