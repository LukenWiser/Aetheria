// ================= V91: the Station in real 3D =================
// A lit three.js scene in place of the flat drawing: a rotating two-deck ring on a hub with a spine,
// solar wings and a beacon; every module is its own model that changes as you build it; a shield
// bubble, orbiting drones, swivelling turrets, ore hauled in from an asteroid field, shuttles docking,
// a planet below. Drag to turn the station, click a module to select it. Falls back to the 2D view
// if WebGL is not available.
const S3 = { r: null, cv: null, sc: null, cam: null, ring: null, mods: {}, sig: '', t: 0, yaw: -.5, vy: 0, drag: null, moved: 0, fail: false, lab: null, ships: [], ore: [], fx: [], tex: {} };
const _bDraw2D = bDraw;
function s3Ok() { return !S3.fail && typeof THREE !== 'undefined' && THREE.WebGLRenderer; }
function s3Can(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
function s3Tex(key, w, h, fn, rx, ry) {
  if (S3.tex[key]) return S3.tex[key]; const t = new THREE.CanvasTexture(s3Can(w, h, fn)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry || 1); } return (S3.tex[key] = t);
}
// ---- textures ----
function s3Hull(rx, ry, key) {
  return s3Tex(key || 'hull' + rx + 'x' + ry, 256, 256, (g, W, H) => {
    const rs = seeded(404); g.fillStyle = '#8a94a6'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 64) { const v = 120 + rs() * 40 | 0, ox = (y / 32) % 2 ? 32 : 0; g.fillStyle = 'rgb(' + v + ',' + (v + 6) + ',' + (v + 18) + ')'; g.fillRect((x + ox) % W, y, 62, 30); }
    g.strokeStyle = 'rgba(20,26,40,.75)'; g.lineWidth = 2; for (let y = 0; y <= H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let y = 0; y < H; y += 32) for (let x = (y / 32) % 2 ? 32 : 0; x < W + 64; x += 64) { g.beginPath(); g.moveTo(x % (W + 1), y); g.lineTo(x % (W + 1), y + 32); g.stroke(); }
    for (let i = 0; i < 14; i++) { const x = rs() * W | 0, y = rs() * H | 0, w = 16 + rs() * 40 | 0, h = 8 + rs() * 20 | 0; g.fillStyle = 'rgba(40,48,66,' + (.35 + rs() * .4) + ')'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(200,210,230,.25)'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w, h); }
    g.fillStyle = 'rgba(15,20,32,.6)'; for (let y = 4; y < H; y += 32) for (let x = 4; x < W; x += 16) g.fillRect(x, y, 2, 2);
    for (let i = 0; i < 3; i++) { const y = rs() * H | 0; for (let x = 0; x < 48; x += 12) { g.fillStyle = '#e8b931'; g.beginPath(); g.moveTo(x + i * 80, y); g.lineTo(x + i * 80 + 6, y); g.lineTo(x + i * 80 + 12, y + 8); g.lineTo(x + i * 80 + 6, y + 8); g.fill(); } }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,' + rs() * .12 + ')'; g.fillRect(rs() * W, rs() * H, 2 + rs() * 30, 1 + rs() * 3); }
  }, rx, ry);
}
function s3Win(rx, key, raid) {
  return s3Tex((key || 'win') + rx + (raid ? 'r' : ''), 512, 64, (g, W, H) => {
    const rs = seeded(raid ? 77 : 55); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (const y0 of [6, H - 14]) for (let x = 3; x < W; x += 9) { if (rs() < .22) continue; const c = raid ? (rs() < .5 ? '#ff5a4a' : '#ffb4a8') : rs() < .15 ? '#9be7ff' : rs() < .5 ? '#ffe7a3' : '#fff3cf'; g.fillStyle = c; g.globalAlpha = .55 + rs() * .45; g.fillRect(x, y0, 5, 7); }
    g.globalAlpha = 1; g.fillStyle = raid ? '#ff3b30' : '#38bdf8'; g.fillRect(0, H / 2 - 1, W, 2);
  }, rx, 1);
}
function s3Solar() { return s3Tex('solar', 128, 128, (g, W, H) => { g.fillStyle = '#0b1530'; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) { const gr = g.createLinearGradient(x, y, x + 16, y + 16); gr.addColorStop(0, '#1d3a7a'); gr.addColorStop(1, '#0f2150'); g.fillStyle = gr; g.fillRect(x + 1, y + 1, 14, 14); } g.strokeStyle = 'rgba(180,200,255,.35)'; g.strokeRect(0, 0, W, H); }, 6, 1); }
function s3Glow() { return s3Tex('glow', 64, 64, (g, W) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); }); }
function s3Planet() {
  return s3Tex('planet', 1024, 512, (g, W, H) => {
    const rs = seeded(9); const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1d3570'); bg.addColorStop(.5, '#28519a'); bg.addColorStop(1, '#172a5a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(' + (40 + rs() * 60 | 0) + ',' + (110 + rs() * 60 | 0) + ',' + (70 + rs() * 40 | 0) + ',.75)'; g.beginPath(); g.ellipse(rs() * W, rs() * H, 30 + rs() * 120, 12 + rs() * 50, rs() * 3, 0, TAU); g.fill(); }
    for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(235,242,255,' + (.08 + rs() * .3) + ')'; g.beginPath(); g.ellipse(rs() * W, rs() * H, 10 + rs() * 70, 2 + rs() * 7, (rs() - .5) * .3, 0, TAU); g.fill(); }
  });
}
function s3Sky() {
  return s3Tex('sky', 1024, 512, (g, W, H) => {
    const rs = seeded(91); g.fillStyle = '#03050f'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) { const x = rs() * W, y = H * (.25 + rs() * .5), r = 60 + rs() * 220, c = ['56,189,248', '168,85,247', '236,72,153', '99,102,241'][i % 4]; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + c + ',' + (.1 + rs() * .1) + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.globalCompositeOperation = 'source-over';
  });
}
// ---- materials ----
function s3Mats() {
  if (S3.M) return S3.M; const T = THREE, std = o => new T.MeshStandardMaterial(Object.assign({ roughness: .55, metalness: .55 }, o));
  return (S3.M = {
    hull: std({ map: s3Hull(2, 2), color: 0xb8c2d4 }), hullL: std({ map: s3Hull(1, 1), color: 0xc9d2e2 }), dark: std({ color: 0x2a3446, roughness: .7, metalness: .6, map: s3Hull(1, 1, 'hullD') }),
    trim: std({ color: 0x1b2333, roughness: .4, metalness: .8 }), solar: std({ map: s3Solar(), roughness: .25, metalness: .7, emissive: 0x0a1a44, emissiveIntensity: .6 }),
    glass: new T.MeshStandardMaterial({ color: 0x6fb7e8, roughness: .05, metalness: .4, transparent: true, opacity: .4, emissive: 0x1a4f8a, emissiveIntensity: .35 }),
    holo: new T.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: .14, depthWrite: false, blending: T.AdditiveBlending }),
    holoL: new T.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: .8 })
  });
}
const s3Emit = (c, k) => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: new THREE.Color(c), emissiveIntensity: k || 1.6, roughness: .4 });
function s3Spr(c, s, o) { const m = new THREE.SpriteMaterial({ map: s3Glow(), color: new THREE.Color(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o == null ? 1 : o }); const sp = new THREE.Sprite(m); sp.scale.set(s, s, 1); return sp; }
function s3Mesh(geo, mat, x, y, z, rx, ry, rz) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); return m; }
// ---- scene ----
function s3Init() {
  try {
    const T = THREE, cv = document.createElement('canvas'); cv.id = 'bCv';
    const r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' });
    r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.0; r.setClearColor(0x03050f);
    const sc = new T.Scene(), cam = new T.PerspectiveCamera(34, 1, 2, 20000);
    S3.r = r; S3.cv = cv; S3.sc = sc; S3.cam = cam; const M = s3Mats();
    // sky, planet, sun
    const sky = new T.Mesh(new T.SphereGeometry(4000, 32, 16), new T.MeshBasicMaterial({ map: s3Sky(), side: T.BackSide, depthWrite: false, fog: false })); sky.renderOrder = -2; sc.add(sky); S3.sky = sky;
    { const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), rs = seeded(31); for (let i = 0; i < n; i++) { const u = rs() * 2 - 1, a = rs() * TAU, q = Math.sqrt(1 - u * u); pos.set([Math.cos(a) * q * 3500, u * 3500, Math.sin(a) * q * 3500], i * 3); const b = .45 + rs() * .55, w = rs(); col.set([b * (w < .2 ? 1 : .8), b * .88, b], i * 3); }
      const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(pos, 3)); gg.setAttribute('color', new T.BufferAttribute(col, 3)); S3.stars = new T.Points(gg, new T.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false, fog: false })); S3.stars.renderOrder = -1; sc.add(S3.stars); }
    const pl = new T.Mesh(new T.SphereGeometry(5000, 96, 64), new T.MeshStandardMaterial({ map: s3Planet(), roughness: .9, metalness: 0, color: 0x8a9ab8 })); pl.position.set(0, -5700, 0); pl.rotation.z = .25; sc.add(pl); S3.planet = pl;
    const atm = new T.Mesh(new T.SphereGeometry(5090, 96, 64), new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.BackSide, uniforms: {}, vertexShader: 'varying vec3 vN;varying vec3 vV;void main(){vec4 w=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-w.xyz);gl_Position=projectionMatrix*w;}', fragmentShader: 'varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(vN,vV)),5.);gl_FragColor=vec4(.42,.72,1.,f*.9);}' })); atm.position.copy(pl.position); sc.add(atm);
    const sun = s3Spr('#fff1d0', 520, .95); sun.position.set(-1500, 900, -2600); sc.add(sun); const sun2 = s3Spr('#ffd27a', 1400, .25); sun2.position.copy(sun.position); sc.add(sun2);
    sc.add(new T.AmbientLight(0x3a4466, .55)); sc.add(new T.HemisphereLight(0x9cc4ff, 0x20123a, .45));
    const dl = new T.DirectionalLight(0xfff0d8, 1.9); dl.position.set(-1500, 900, 800); sc.add(dl);
    const rim = new T.DirectionalLight(0x5b8def, .8); rim.position.set(900, -700, -900); sc.add(rim);
    S3.alert = new T.PointLight(0xff2a2a, 0, 600); S3.alert.position.set(0, 60, 0); sc.add(S3.alert);
    // the station
    const st = new T.Group(); sc.add(st); S3.st = st;
    // hub
    const hubWin = new T.MeshStandardMaterial({ map: s3Hull(4, 1, 'hubh'), emissiveMap: s3Win(3, 'hubw'), emissive: 0xffffff, emissiveIntensity: 1.2, roughness: .5, metalness: .6 }); S3.hubWin = hubWin;
    st.add(s3Mesh(new T.CylinderGeometry(26, 26, 34, 40, 1), hubWin));
    st.add(s3Mesh(new T.CylinderGeometry(30, 30, 5, 40), M.trim, 0, 19.5)); st.add(s3Mesh(new T.CylinderGeometry(30, 30, 5, 40), M.trim, 0, -19.5));
    st.add(s3Mesh(new T.CylinderGeometry(18, 28, 12, 32), M.hull, 0, 28)); st.add(s3Mesh(new T.SphereGeometry(16, 32, 16, 0, TAU, 0, PI / 2), M.glass, 0, 34));
    st.add(s3Mesh(new T.CylinderGeometry(24, 12, 22, 32), M.hull, 0, -33)); st.add(s3Mesh(new T.CylinderGeometry(7, 7, 90, 16), M.dark, 0, -88));
    for (let i = 0; i < 5; i++) st.add(s3Mesh(new T.TorusGeometry(10, 1.6, 8, 24), M.trim, 0, -55 - i * 16, 0, PI / 2));
    st.add(s3Mesh(new T.CylinderGeometry(14, 4, 14, 16), M.hull, 0, -138)); const eng = s3Spr('#7dd3fc', 60, .8); eng.position.set(0, -150, 0); st.add(eng);
    // mast + beacon
    st.add(s3Mesh(new T.CylinderGeometry(1.1, 1.6, 50, 8), M.trim, 0, 64)); st.add(s3Mesh(new T.BoxGeometry(18, 1, 1), M.trim, 0, 74)); st.add(s3Mesh(new T.BoxGeometry(12, 1, 1), M.trim, 0, 80, 0, 0, PI / 2 * 0));
    S3.beacon = s3Spr('#ff4b4b', 26, 1); S3.beacon.position.set(0, 90, 0); st.add(S3.beacon);
    // solar wings on the spine
    for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(0, -100, 0); w.rotation.y = s > 0 ? 0 : PI; st.add(w);
      w.add(s3Mesh(new T.BoxGeometry(150, 2.4, 2.4), M.trim, 85, 0, 0)); for (let k = 0; k < 3; k++) { const p = s3Mesh(new T.BoxGeometry(44, .8, 30), M.solar, 40 + k * 48, 0, 0, .35); w.add(p); } }
    // docking ports on the hub
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + PI / 4, d = new T.Group(); d.position.set(Math.cos(a) * 30, 0, Math.sin(a) * 30); d.rotation.y = -a; st.add(d); d.add(s3Mesh(new T.BoxGeometry(12, 10, 10), M.hull, 6)); const l = s3Spr(i % 2 ? '#7dd3fc' : '#86efac', 9, .9); l.position.set(13, 6, 0); d.add(l); }
    // the ring: two decks with windows, spokes and lights
    const ring = new T.Group(); st.add(ring); S3.ring = ring; const RR = 100;
    S3.ringMat = new T.MeshStandardMaterial({ color: 0xb0bccf, map: s3Hull(40, 2, 'ringh'), emissiveMap: s3Win(18), emissive: 0xffffff, emissiveIntensity: 1.3, roughness: .5, metalness: .6 });
    ring.add(s3Mesh(new T.TorusGeometry(RR, 7.5, 18, 120), S3.ringMat, 0, 0, 0, PI / 2));
    ring.add(s3Mesh(new T.TorusGeometry(RR, 3.2, 10, 120), M.dark, 0, 9, 0, PI / 2)); ring.add(s3Mesh(new T.TorusGeometry(RR, 3.2, 10, 120), M.dark, 0, -9, 0, PI / 2));
    ring.add(s3Mesh(new T.TorusGeometry(RR + 8.5, .8, 6, 160), s3Emit('#38bdf8', 1.4), 0, 0, 0, PI / 2)); S3.ringLine = ring.children[ring.children.length - 1];
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, sp = s3Mesh(new T.BoxGeometry(RR - 30, i % 2 ? 2.4 : 4, i % 2 ? 2.4 : 5), i % 2 ? M.trim : M.hull, Math.cos(a) * (RR / 2 + 15), 0, Math.sin(a) * (RR / 2 + 15), 0, -a); ring.add(sp); }
    for (let i = 0; i < 24; i++) { const a = (i + .5) / 24 * TAU, b = s3Mesh(new T.BoxGeometry(4, 17, 17), M.trim, Math.cos(a) * RR, 0, Math.sin(a) * RR, 0, -a); ring.add(b); }
    S3.blinks = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, s = s3Spr(i % 2 ? '#ff5050' : '#9be7ff', 7, 1); s.position.set(Math.cos(a) * (RR + 9), 0, Math.sin(a) * (RR + 9)); ring.add(s); S3.blinks.push(s); }
    // shield bubble (shown when the Shield Array is built)
    S3.bubble = new T.Mesh(new T.SphereGeometry(165, 48, 32), new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.FrontSide,
      uniforms: { t: { value: 0 }, a: { value: 0 }, c: { value: new T.Color(0x38bdf8) } },
      vertexShader: 'varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){vec4 w=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-w.xyz);vP=position;gl_Position=projectionMatrix*w;}',
      fragmentShader: 'uniform float t;uniform float a;uniform vec3 c;varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){float f=pow(1.-abs(dot(vN,vV)),2.6);float hex=step(.93,abs(sin(vP.x*.09+t)*sin(vP.y*.09)*sin(vP.z*.09-t*.5)));float sw=smoothstep(.0,.04,abs(fract(vP.y*.004-t*.15)-.5));gl_FragColor=vec4(c,(f*.85+hex*.12+(1.-sw)*.25*f)*a);}' }));
    S3.bubble.scale.y = .78; sc.add(S3.bubble);
    // asteroid field (ore source)
    S3.rocks = new T.Group(); S3.rocks.position.set(-330, -40, -160); sc.add(S3.rocks); const rm = new T.MeshStandardMaterial({ color: 0x6b5a4a, roughness: .95, metalness: .05, flatShading: true }), rs = seeded(12);
    for (let i = 0; i < 22; i++) { const g = new T.IcosahedronGeometry(3 + rs() * 12, 0); const p = g.attributes.position; for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (.7 + rs() * .6), p.getY(k) * (.7 + rs() * .6), p.getZ(k) * (.7 + rs() * .6)); g.computeVertexNormals();
      const m = s3Mesh(g, rm, (rs() - .5) * 180, (rs() - .5) * 90, (rs() - .5) * 180, rs() * 3, rs() * 3); m.userData.sp = (rs() - .5) * .01; S3.rocks.add(m); }
    // labels
    S3.lab = document.createElement('div'); S3.lab.className = 's3-labs';
    // drag to turn, click to select (click is suppressed after a drag)
    cv.addEventListener('pointerdown', e => { S3.drag = { x: e.clientX, y0: S3.yaw }; S3.moved = 0; try { cv.setPointerCapture(e.pointerId); } catch (er) { } });
    cv.addEventListener('pointermove', e => { if (!S3.drag) return; const dx = e.clientX - S3.drag.x; S3.moved = Math.max(S3.moved, Math.abs(dx)); if (S3.moved > 5) { const ny = S3.drag.y0 - dx * .008; S3.vy = (ny - S3.yaw) * .5; S3.yaw = ny; cv.style.cursor = 'grabbing'; } });
    const up = () => { S3.drag = null; cv.style.cursor = ''; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('click', e => { if (S3.moved > 5) { e.stopImmediatePropagation(); S3.moved = 0; } }, true);
    return true;
  } catch (e) { S3.fail = true; try { S3.r && S3.r.dispose(); } catch (er) { } S3.r = null; return false; }
}
// ---- modules ----
function s3Module(k, lv) {
  const T = THREE, M = s3Mats(), c = BMOD[k].c, g = new T.Group(), em = s3Emit(c, 1.8);
  if (!lv) { // hologram blueprint
    const geo = new T.BoxGeometry(24, 16, 20); g.add(s3Mesh(geo, M.holo, 0, 8)); const e = new T.LineSegments(new T.EdgesGeometry(geo), M.holoL); e.position.y = 8; g.add(e);
    const pl = new T.Group(); pl.position.y = 8; for (const [w, h] of [[10, 2], [2, 10]]) pl.add(s3Mesh(new T.BoxGeometry(w, h, .5), new T.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: .9 }), 0, 0, 10.5));
    g.add(pl); g.userData.holo = e; return g;
  }
  g.add(s3Mesh(new T.BoxGeometry(28, 4, 22), M.dark, 0, 2)); // deck plate
  for (let i = 0; i < BMAX; i++) g.add(s3Mesh(new T.BoxGeometry(3, 1.2, .6), i < lv ? em : M.trim, -8 + i * 4, 2.6, 11.2)); // level lights
  const band = s3Mesh(new T.BoxGeometry(26.4, 1.4, 20.4), em, 0, 5.5); g.add(band);
  const A = g.userData.anim = [];
  if (k === 'refinery') {
    g.add(s3Mesh(new T.BoxGeometry(18, 14, 16), M.hull, -3, 12)); g.add(s3Mesh(new T.ConeGeometry(8, 10, 12, 1, true), M.trim, 6, 24, 0, PI));
    g.add(s3Mesh(new T.CylinderGeometry(8, 8, 2, 16), M.trim, 6, 29)); const ore = s3Mesh(new T.CylinderGeometry(6.5, 6.5, 1, 16), s3Emit('#fbbf24', 2.4), 6, 29.6); g.add(ore);
    for (let i = 0; i < Math.min(lv, 3); i++) { g.add(s3Mesh(new T.CylinderGeometry(2, 2.4, 14 + i * 4, 10), M.hullL, -9 + i * 5, 24 + i * 2, -5)); const s = s3Spr('#fdba74', 8, .6); s.position.set(-9 + i * 5, 32 + i * 4, -5); g.add(s); A.push(t => { s.material.opacity = .35 + .3 * Math.sin(t * .08 + i); }); }
    const glow = s3Spr('#fbbf24', 26, .6); glow.position.set(6, 31, 0); g.add(glow); A.push(t => { glow.material.opacity = .45 + .2 * Math.sin(t * .05); });
    g.userData.port = new T.Vector3(6, 30, 0);
  } else if (k === 'armory') {
    g.add(s3Mesh(new T.CylinderGeometry(12, 13, 12, 6), M.hull, 0, 10)); g.add(s3Mesh(new T.CylinderGeometry(13.5, 13.5, 1.5, 6), em, 0, 16.5));
    const n = 2 + lv; for (let i = 0; i < n; i++) { const a = i / n * TAU; const p = new T.Group(); p.position.set(Math.cos(a) * 7, 17, Math.sin(a) * 7); p.rotation.set(.25 * Math.cos(a), 0, -.25 * Math.sin(a) * 0); g.add(p);
      p.add(s3Mesh(new T.CylinderGeometry(1.4, 1.4, 9, 8), M.hullL, 0, 4.5)); p.add(s3Mesh(new T.ConeGeometry(1.4, 3.5, 8), s3Emit('#ef4444', 1.4), 0, 10.7)); }
    g.add(s3Mesh(new T.BoxGeometry(8, 8, 3), M.trim, 0, 8, 12));
  } else if (k === 'lab') {
    g.add(s3Mesh(new T.CylinderGeometry(12, 13, 6, 24), M.hull, 0, 7)); g.add(s3Mesh(new T.SphereGeometry(11, 24, 12, 0, TAU, 0, PI / 2), M.glass, 0, 10));
    const core = s3Mesh(new T.IcosahedronGeometry(3.4, 1), s3Emit('#c4b5fd', 2.2), 0, 15); g.add(core); const cg = s3Spr('#a78bfa', 22, .8); cg.position.set(0, 15, 0); g.add(cg);
    const ring1 = s3Mesh(new T.TorusGeometry(6.5, .35, 6, 32), em, 0, 15); g.add(ring1);
    const dish = new T.Group(); dish.position.set(-9, 12, -8); g.add(dish); dish.add(s3Mesh(new T.CylinderGeometry(.6, .6, 10, 6), M.trim, 0, 5)); const dh = new T.Group(); dh.position.y = 11; dish.add(dh);
    dh.add(s3Mesh(new T.SphereGeometry(6, 18, 8, 0, TAU, 0, .7), M.hullL, 0, 0, 0, PI * .6)); const tip = s3Spr(c, 6, 1); tip.position.set(0, 3, 2); dh.add(tip);
    A.push(t => { core.rotation.y = t * .03; core.rotation.x = t * .017; ring1.rotation.x = t * .04; ring1.rotation.y = t * .025; dh.rotation.y = t * .012; core.position.y = 15 + Math.sin(t * .05) * .8; });
  } else if (k === 'shield') {
    g.add(s3Mesh(new T.CylinderGeometry(9, 12, 6, 16), M.hull, 0, 7));
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + .5, x = Math.cos(a) * 9, z = Math.sin(a) * 7; g.add(s3Mesh(new T.CylinderGeometry(1.2, 1.8, 18, 8), M.hullL, x, 15, z)); g.add(s3Mesh(new T.SphereGeometry(2, 12, 8), em, x, 24.5, z)); const s = s3Spr(c, 12, .9); s.position.set(x, 24.5, z); g.add(s); A.push(t => { s.material.opacity = .5 + .4 * Math.sin(t * .1 + i * 2); }); }
    const r1 = s3Mesh(new T.TorusGeometry(8, .5, 6, 40), em, 0, 19, 0, PI / 2), r2 = s3Mesh(new T.TorusGeometry(5, .4, 6, 32), em, 0, 19, 0, PI / 2); g.add(r1); g.add(r2);
    A.push(t => { r1.rotation.y = t * .03; r2.rotation.x = PI / 2 + t * .05; r1.position.y = 19 + Math.sin(t * .04) * 2; });
  } else if (k === 'turret') {
    g.add(s3Mesh(new T.CylinderGeometry(12, 13, 5, 20), M.hull, 0, 6.5)); const n = Math.min(lv, 3); g.userData.guns = [];
    for (let i = 0; i < n; i++) { const tg = new T.Group(); tg.position.set((i - (n - 1) / 2) * 8, 9, 0); g.add(tg); tg.add(s3Mesh(new T.CylinderGeometry(3, 3.4, 2.4, 12), M.trim, 0, 1.2));
      const head = new T.Group(); head.position.y = 4; tg.add(head); head.add(s3Mesh(new T.BoxGeometry(5, 3.6, 5), M.hullL)); head.add(s3Mesh(new T.BoxGeometry(5.4, .8, 5.4), em, 0, .4));
      for (const s of [-1, 1]) head.add(s3Mesh(new T.CylinderGeometry(.45, .45, 8, 6), M.trim, s * 1.2, .2, 5.5, PI / 2));
      const fl = s3Spr('#fed7aa', 9, 0); fl.position.set(0, .2, 10); head.add(fl); g.userData.guns.push({ head, fl, ph: i * 2.1 }); }
    A.push(t => { for (const q of g.userData.guns) { q.head.rotation.y = Math.sin(t * .012 + q.ph) * 1.1; q.head.rotation.x = -.25 + Math.sin(t * .02 + q.ph) * .2; q.fl.material.opacity = Math.max(0, q.fl.material.opacity - .12); } });
  } else if (k === 'dronebay') {
    g.add(s3Mesh(new T.BoxGeometry(22, 12, 16), M.hull, 0, 10)); g.add(s3Mesh(new T.CylinderGeometry(11, 11, 22, 24, 1, false, 0, PI), M.hullL, 0, 16, 0, 0, 0, PI / 2));
    g.add(s3Mesh(new T.PlaneGeometry(14, 8), s3Emit('#34d399', 1.2), 0, 9, 8.1)); const dg = s3Spr('#34d399', 20, .5); dg.position.set(0, 9, 10); g.add(dg);
    const dm = s3Emit('#d1fae5', 1.6), ds = []; for (let i = 0; i < lv; i++) { const d = new T.Group(); d.add(s3Mesh(new T.BoxGeometry(3, 1.2, 2), M.hullL)); d.add(s3Mesh(new T.BoxGeometry(6, .3, .8), dm)); const e = s3Spr('#34d399', 6, .9); e.position.z = -1.4; d.add(e); g.add(d); ds.push(d); }
    A.push(t => { ds.forEach((d, i) => { const a = t * .025 + i / ds.length * TAU; d.position.set(Math.cos(a) * 24, 18 + Math.sin(t * .04 + i) * 4, Math.sin(a) * 18); d.rotation.y = -a; }); });
  }
  return g;
}
function s3Build() {
  const sig = BKEYS.map(k => bLv(k)).join(',') + (raidOn() ? 'R' : ''); if (sig === S3.sig) return; S3.sig = sig;
  for (const k in S3.mods) { S3.ring.remove(S3.mods[k]); } S3.mods = {};
  BKEYS.forEach((k, i) => { const a = i / BKEYS.length * TAU, g = s3Module(k, bLv(k)); const w = new THREE.Group(); w.position.set(Math.cos(a) * 100, 12, Math.sin(a) * 100); w.rotation.y = -a + PI / 2; g.scale.setScalar(1.35); w.add(g); w.userData.k = k; S3.ring.add(w); S3.mods[k] = w; });
  const raid = raidOn(); S3.ringMat.emissiveMap = s3Win(18, 0, raid); S3.hubWin.emissiveMap = s3Win(3, 'hubw', raid); S3.ringMat.needsUpdate = S3.hubWin.needsUpdate = true;
  S3.ringLine.material.emissive.set(raid ? '#ef4444' : '#38bdf8');
  // selection marker
  if (!S3.sel) { const T = THREE, s = new T.Group(); s.add(s3Mesh(new T.TorusGeometry(19, .7, 6, 64), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9 }), 0, 1, 0, PI / 2));
    const beam = s3Mesh(new T.CylinderGeometry(19, 19, 10, 40, 1, true), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .1, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }), 0, 5); s.add(beam); S3.sel = s; S3.selBeam = beam; }
  S3.labSig = '';
}
function s3Labels(W, H) {
  const T = THREE, v = new T.Vector3(), c = new T.Vector3(); BV.hit = []; let html = '';
  const rows = BKEYS.map(k => { const w = S3.mods[k]; w.getWorldPosition(v); const d = v.distanceTo(S3.cam.position); c.copy(v); c.y += 40; c.project(S3.cam); const p = v.clone().project(S3.cam);
    const x = (p.x + 1) / 2 * W, y = (1 - p.y) / 2 * H, lx = (c.x + 1) / 2 * W, ly = (1 - c.y) / 2 * H; return { k, x, y, lx, ly, d }; });
  const near = Math.min(...rows.map(r => r.d)), far = Math.max(...rows.map(r => r.d));
  const sig = BV.sel + '|' + S3.sig; if (S3.labSig !== sig) { S3.labSig = sig; S3.lab.innerHTML = BKEYS.map(k => { const M = BMOD[k], lv = bLv(k); return '<div class="s3-l' + (BV.sel === k ? ' on' : '') + (lv ? '' : ' nb') + '" data-k="' + k + '" style="--c:' + M.c + '"><b>' + M.nm + '</b><span>' + (lv ? 'LV ' + lv + (lv >= BMAX ? ' MAX' : '') : 'BUILD - ' + fmt(bCost(k))) + '</span></div>'; }).join(''); }
  rows.forEach(r => { const el = S3.lab.querySelector('[data-k="' + r.k + '"]'); const f = (r.d - near) / Math.max(1, far - near); if (el) { el.style.transform = 'translate(' + r.lx.toFixed(1) + 'px,' + r.ly.toFixed(1) + 'px) translate(-50%,-100%)'; el.style.opacity = (1 - f * .55).toFixed(2); el.style.zIndex = 100 - Math.round(f * 50); }
    BV.hit.push({ k: r.k, x: r.x, y: r.y - 12, r: Math.max(34, 70 * (1 - f * .4) * Math.min(1.4, W / 1100)) }); });
}
function s3Mount() {
  const cv0 = document.getElementById('bCv'); if (!cv0 || UI.top !== 'scBase' || !s3Ok()) return false;
  if (!S3.r && !s3Init()) return false;
  if (cv0 !== S3.cv) { cv0.replaceWith(S3.cv); S3.cv._b = 0; try { bBind(); } catch (e) { } }
  if (S3.lab.parentElement !== S3.cv.parentElement) { S3.cv.after(S3.lab); S3.lk = ''; }
  return true;
}
function s3Frame() {
  const cv = S3.cv, W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return; const T = THREE, t = ++S3.t, raid = raidOn();
  const dpr = Math.min(1.75, devicePixelRatio || 1); if (S3.W !== W || S3.H !== H || S3.dpr !== dpr) { S3.W = W; S3.H = H; S3.dpr = dpr; S3.r.setPixelRatio(dpr); S3.r.setSize(W, H, false); }
  s3Build();
  // camera: fit the station into the free area left of the side panel (or the top on narrow screens)
  const wide = W > 820, cx = wide ? .36 : .5, cy = wide ? .5 : .37, cam = S3.cam; cam.aspect = W / H;
  const vf = cam.fov * PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect), dist = Math.max(150 / (Math.tan(hf / 2) * (wide ? .62 : .95)), 128 / (Math.tan(vf / 2) * (wide ? .92 : .3)));
  if (!S3.drag) { S3.yaw += S3.vy; S3.vy *= .94; S3.yaw += .0006; }
  const el = .38 + Math.sin(t * .003) * .04; cam.position.set(Math.sin(S3.yaw) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(S3.yaw) * Math.cos(el) * dist); cam.lookAt(0, -6, 0);
  cam.setViewOffset(W, H, (.5 - cx) * W, (.5 - cy) * H, W, H); cam.updateProjectionMatrix();
  S3.sky.position.copy(cam.position); S3.stars.position.copy(cam.position);
  // motion
  S3.ring.rotation.y += .0016; S3.planet.rotation.y += .0004; S3.rocks.rotation.y += .0007; S3.rocks.children.forEach(m => { m.rotation.x += m.userData.sp; m.rotation.y += m.userData.sp * .7; });
  S3.beacon.material.opacity = (t % 90) < 10 ? 1 : .12; S3.beacon.material.color.set(raid ? '#ff3030' : '#ff6b6b');
  S3.blinks.forEach((b, i) => { b.material.opacity = ((t >> 3) + i * 3) % 16 < 2 ? 1 : .25; });
  S3.alert.intensity = raid ? 1.2 + Math.sin(t * .15) * 1.1 : 0;
  for (const k in S3.mods) { const g = S3.mods[k].children[0]; (g.userData.anim || []).forEach(f => f(t)); if (g.userData.holo) g.userData.holo.material.opacity = .45 + .35 * Math.sin(t * .08); }
  const shl = bLv('shield'); S3.bubble.visible = shl > 0; S3.bubble.material.uniforms.t.value = t * .02; S3.bubble.material.uniforms.a.value = .14 + shl * .04 + (raid ? .15 * Math.sin(t * .2) : 0);
  // selection marker rides on the selected module
  const sw = S3.mods[BV.sel]; if (sw && S3.sel.parent !== sw) sw.add(S3.sel); if (S3.sel) { S3.sel.rotation.y = t * .02; const col = new T.Color(BMOD[BV.sel] ? BMOD[BV.sel].c : '#fff'); S3.sel.children[0].material.color.copy(col); S3.selBeam.material.color.copy(col); S3.selBeam.material.opacity = .12 + .08 * Math.sin(t * .08); }
  // turrets fire tracers at raiders (or at the asteroid field for practice)
  const tw = S3.mods.turret; if (tw && bLv('turret') && t % (raid ? 14 : 70) === 0) { const guns = tw.children[0].userData.guns || []; const q = guns[(t / 14 | 0) % Math.max(1, guns.length)]; if (q) { q.fl.material.opacity = 1; const a = new T.Vector3(); q.fl.getWorldPosition(a); const b = raid && S3.raiders ? S3.raiders[(t / 7 | 0) % S3.raiders.length].position.clone() : a.clone().add(new T.Vector3((Math.random() - .5) * 400, 120 + Math.random() * 120, (Math.random() - .5) * 400)); s3Tracer(a, b); } }
  for (let i = S3.fx.length - 1; i >= 0; i--) { const f = S3.fx[i]; f.l--; f.m.position.addScaledVector(f.v, 1); f.m.material.opacity = f.l / 24; if (f.l <= 0) { S3.sc.remove(f.m); f.m.material.dispose(); S3.fx.splice(i, 1); } }
  // raiders circling during a raid
  if (raid && !S3.raiders) { S3.raiders = []; for (let i = 0; i < 5; i++) { const r = new T.Group(); r.add(s3Mesh(new T.ConeGeometry(3, 12, 4), s3Emit('#7f1d1d', .8), 0, 0, 0, PI / 2)); r.add(s3Mesh(new T.BoxGeometry(14, .8, 4), s3Mats().dark)); const e = s3Spr('#ef4444', 14, 1); e.position.z = -7; r.add(e); S3.sc.add(r); S3.raiders.push(r); } }
  if (!raid && S3.raiders) { S3.raiders.forEach(r => S3.sc.remove(r)); S3.raiders = null; }
  if (S3.raiders) S3.raiders.forEach((r, i) => { const a = t * .006 + i * 1.26, R = 230 + 30 * Math.sin(i * 2 + t * .01); const p = new T.Vector3(Math.cos(a) * R, 30 * Math.sin(t * .02 + i), Math.sin(a) * R); r.lookAt(p.clone().add(new T.Vector3(-Math.sin(a), 0, Math.cos(a)))); r.position.copy(p); });
  // ore hauled in from the asteroid field to the refinery
  const rf = S3.mods.refinery; if (rf && bLv('refinery')) { if (t % 16 === 0 && S3.ore.length < 18) { const m = s3Mesh(new T.IcosahedronGeometry(1.6 + Math.random(), 0), s3Emit('#f59e0b', 1.6)); const s = new T.Vector3(); S3.rocks.children[(Math.random() * S3.rocks.children.length) | 0].getWorldPosition(s); m.position.copy(s); S3.sc.add(m); S3.ore.push({ m, s, u: 0 }); } }
  for (let i = S3.ore.length - 1; i >= 0; i--) { const o = S3.ore[i], e = new T.Vector3(); if (!rf) { S3.sc.remove(o.m); S3.ore.splice(i, 1); continue; } rf.children[0].localToWorld(e.copy(rf.children[0].userData.port || new T.Vector3(0, 20, 0))); o.u += .006;
    if (o.u >= 1) { S3.sc.remove(o.m); o.m.geometry.dispose(); S3.ore.splice(i, 1); continue; } const u = o.u, mid = o.s.clone().lerp(e, .5); mid.y += 90; const a = o.s.clone().lerp(mid, u), b = mid.clone().lerp(e, u); o.m.position.copy(a.lerp(b, u)); o.m.rotation.x += .05; o.m.rotation.y += .03; }
  // shuttles docking and leaving
  if (t % 200 === 0 && S3.ships.length < 3) S3.ships.push(s3Ship());
  for (let i = S3.ships.length - 1; i >= 0; i--) { const s = S3.ships[i]; s.u += .0028; if (s.u >= 1) { S3.st.remove(s.g); S3.ships.splice(i, 1); continue; } const k = s.out ? s.u : 1 - s.u, e = k * k;
    const p = new T.Vector3(Math.cos(s.a) * (40 + e * 520), s.h * e, Math.sin(s.a) * (40 + e * 520)); const look = new T.Vector3(Math.cos(s.a), s.h / 520, Math.sin(s.a)).multiplyScalar(s.out ? 1 : -1); s.g.position.copy(p); s.g.lookAt(p.clone().add(look)); s.fl.scale.setScalar(6 + 8 * (s.out ? s.u : 1 - s.u) + Math.random() * 2); }
  S3.r.render(S3.sc, cam); const L = S3.lab.style, k = cv.offsetLeft + ',' + cv.offsetTop + ',' + W + ',' + H; if (S3.lk !== k) { S3.lk = k; L.inset = 'auto'; L.left = cv.offsetLeft + 'px'; L.top = cv.offsetTop + 'px'; L.width = W + 'px'; L.height = H + 'px'; } S3.lab.classList.toggle('sm', W < 600); s3Labels(W, H);
}
function s3Tracer(a, b) { const T = THREE, v = b.clone().sub(a), len = v.length(), m = new T.Mesh(new T.CylinderGeometry(.5, .5, 18, 4), new T.MeshBasicMaterial({ color: 0xffd28a, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
  m.position.copy(a); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.clone().normalize()); S3.sc.add(m); S3.fx.push({ m, v: v.normalize().multiplyScalar(Math.min(14, len / 24)), l: 24 }); }
function s3Ship() {
  const T = THREE, M = s3Mats(), g = new T.Group(), body = new T.Group(); g.add(body);
  body.add(s3Mesh(new T.BoxGeometry(5, 3.4, 12), M.hullL)); body.add(s3Mesh(new T.ConeGeometry(2.6, 5, 6), M.hull, 0, 0, 8.4, PI / 2)); body.add(s3Mesh(new T.BoxGeometry(14, .6, 4), M.dark, 0, -.6, -2));
  body.add(s3Mesh(new T.BoxGeometry(3.2, 1.2, 2), M.glass, 0, 1.4, 4)); const fl = s3Spr('#7dd3fc', 8, 1); fl.position.z = -7.5; body.add(fl);
  const a = Math.random() * TAU, out = Math.random() < .5; S3.st.add(g); return { g, fl, a, out, u: 0, h: (Math.random() - .3) * 260 };
}
// ---- hook into the station screen ----
bDraw = function () {
  const cv = document.getElementById('bCv'); if (!cv || UI.top !== 'scBase') { BV.raf = 0; return; }
  if (!s3Mount()) return _bDraw2D();
  BV.raf = requestAnimationFrame(bDraw); BV.t++;
  try { s3Frame(); } catch (e) { console.warn('station3d', e); }
};
const _scBase3 = SCR.scBase;
SCR.scBase = function () { const h = _scBase3.apply(this, arguments); if (s3Ok()) queueMicrotask(() => { try { s3Mount(); } catch (e) { } }); return h.replace('Tap a module to select it', 'Tap a module to select it - drag to turn the station'); };
(function () { const st = document.createElement('style'); st.textContent = `
.gx .s3-labs,.s3-labs{position:absolute!important;inset:0;pointer-events:none;z-index:1;overflow:hidden}
.s3-l{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 8px 5px;background:rgba(4,10,24,.72);border:1px solid color-mix(in srgb,var(--c) 55%,transparent);border-bottom:2px solid var(--c);white-space:nowrap;transition:opacity .2s}
.s3-l b{font:800 10px var(--mono);letter-spacing:.14em;color:#e2e8f0;text-transform:uppercase}.s3-l span{font:800 9px var(--mono);letter-spacing:.12em;color:var(--c)}
.s3-l.nb{border-style:dashed;border-bottom-style:solid;background:rgba(4,16,32,.6)}.s3-l.nb span{color:#7dd3fc}
.s3-l.on{background:color-mix(in srgb,var(--c) 30%,rgba(4,10,24,.85));border-color:var(--c);box-shadow:0 0 16px color-mix(in srgb,var(--c) 50%,transparent)}.s3-l.on b{color:#fff}
.s3-labs.sm .s3-l{padding:2px 5px 3px}.s3-labs.sm .s3-l b{font-size:8px;letter-spacing:.08em}.s3-labs.sm .s3-l:not(.on) span{display:none}.s3-labs.sm .s3-l::after{height:8px}
.s3-l::after{content:'';position:absolute;left:50%;top:100%;width:1px;height:14px;background:linear-gradient(var(--c),transparent)}
`; document.head.appendChild(st); })();
window.__S3 = S3;
