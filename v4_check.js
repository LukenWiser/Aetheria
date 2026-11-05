(function(){'use strict';
// ================= 3D: models + realtime layer (Three.js r128). Part A: setup, ship builder, enemy archetypes =================
function init3D() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(1); renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
  const srgb = t => { t.encoding = THREE.sRGBEncoding; return t; };
  // procedural studio reflections so metal has something to mirror
  const envTex = srgb(new THREE.CanvasTexture(cv(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#16233d'); gr.addColorStop(.5, '#05070d'); gr.addColorStop(1, '#0a0f1c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const blob = (x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.283); g.fill(); };
    try { g.filter = 'blur(14px)'; } catch (e) { }
    blob(200, 150, 140, 40, '#e8f6ff'); blob(700, 120, 200, 26, '#ffffff'); blob(480, 300, 90, 60, '#22d3ee'); blob(880, 250, 70, 90, '#f0abfc'); blob(60, 260, 60, 80, '#38bdf8');
  })));
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  try { scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(envTex).texture; } catch (e) { console.warn('env map unavailable', e); }
  const glowTex = new THREE.CanvasTexture(cv(128, 128, (g, w) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }));
  const sprite = (color, size, x, y, z) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.set(size, size, 1); s.position.set(x, y, z); return s; };

  // ---- tiny helpers ----
  const M = (c, m = .9, r = .3, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, metalness: m, roughness: r }, o));
  const E = (c, i = 2.2) => new THREE.MeshStandardMaterial({ color: 0x080808, emissive: c, emissiveIntensity: i });
  const mesh = (geo, mat, p, r, s) => { const m = new THREE.Mesh(geo, mat); if (p) m.position.set(p[0], p[1], p[2]); if (r) m.rotation.set(r[0], r[1], r[2]); if (s) m.scale.set(s[0], s[1], s[2]); return m; };
  const grp = (...c) => { const g = new THREE.Group(); c.forEach(x => g.add(x)); return g; };
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), CY = (a, b, h, s = 12) => new THREE.CylinderGeometry(a, b, h, s), CO = (r, h, s = 12) => new THREE.ConeGeometry(r, h, s);
  const SP = (r, s = 16) => new THREE.SphereGeometry(r, s, Math.max(6, Math.round(s * .75))), TO = (r, t, rs = 8, ts = 28) => new THREE.TorusGeometry(r, t, rs, ts), OC = (r, d = 0) => new THREE.OctahedronGeometry(r, d);
  const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(a => new THREE.Vector2(a[0], a[1])), seg);
  const spin = (o, x, y, z) => { o.userData.spin = [x, y, z]; return o; };
  const shade = (c, k) => ((c >> 16 & 255) * k << 16) | ((c >> 8 & 255) * k << 8) | ((c & 255) * k);
  const dark = M(0x141b27, .75, .42), glass = M(0x0b2a3d, 1, .06, { emissive: 0x0a4a66, emissiveIntensity: .35 });
  const gl = (g, color, size, x, y, z) => { (g.userData.gl = g.userData.gl || []).push([color, size, x, y, z]); return g; }; // glow specs are added AFTER measuring (sprites would inflate the box)
  const addGlows = g => { (g.userData.gl || []).forEach(a => { const s = sprite(a[0], a[1], a[2], a[3], a[4]); s.userData.pulse = a[1]; g.add(s); }); };

  // ================= player ship (parametric) =================
  const HULLP = {
    falcon: [[0, -1.3], [.28, -1.2], [.36, -.6], [.31, .4], [.18, 1.1], [.03, 1.75]], vanguard: [[0, -1.1], [.42, -1.0], [.55, -.5], [.5, .5], [.32, 1.1], [.05, 1.45]],
    phantom: [[0, -1.7], [.17, -1.5], [.27, -.4], [.23, .6], [.11, 1.3], [.02, 1.95]], titan: [[0, -1.0], [.52, -.95], [.64, -.3], [.6, .6], [.4, 1.2], [.08, 1.4]], nova: [[0, -1.5], [.12, -1.3], [.34, -.2], [.4, .5], [.2, 1.1], [.02, 1.6]],
    ronin: [[0, -1.8], [.18, -1.6], [.3, -.6], [.28, .5], [.16, 1.2], [.03, 1.7]], hive: [[0, -1.0], [.44, -.95], [.58, -.3], [.58, .7], [.4, 1.25], [.08, 1.45]], longbow: [[0, -2.0], [.12, -1.85], [.22, -.6], [.27, .5], [.14, 1.3], [.02, 1.8]],
    wraith: [[0, -1.9], [.14, -1.7], [.25, -.55], [.21, .7], [.1, 1.4], [.02, 2.1]], aegis: [[0, -.9], [.5, -.85], [.72, -.2], [.68, .7], [.46, 1.25], [.1, 1.45]]
  };
  const WINGP = { swept: [[.25, .4], [2.1, -.95], [2.1, -1.25], [.3, -.6]], delta: [[.25, .8], [1.9, -1.25], [.3, -.9]], forward: [[.25, -.25], [2.0, .7], [2.0, .35], [.3, -.9]], broad: [[.25, .6], [1.6, .3], [2.4, -.7], [2.3, -1.1], [.3, -.9]] };
  const WINGX = { swept: 2.08, delta: 1.85, forward: 2.0, broad: 2.3 };
  const FIN = { chrome: { m: .92, r: .22, e: 0 }, matte: { m: .2, r: .72, e: 0 }, pearl: { m: .6, r: .3, e: .08 }, neon: { m: .5, r: .35, e: .32 }, carbon: { m: .85, r: .5, e: 0 } };
  const wingGeo = {};
  function wingG(k) {
    if (wingGeo[k]) return wingGeo[k];
    const p = WINGP[k] || WINGP.swept, sh = new THREE.Shape(); sh.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) sh.lineTo(p[i][0], p[i][1]); sh.closePath();
    return wingGeo[k] = new THREE.ExtrudeGeometry(sh, { depth: .07, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 2 });
  }
  function buildShip(cfg) {
    const ac = hx(cfg.accent || '#22d3ee'), fin = FIN[cfg.finish] || FIN.chrome; let pc = hx(cfg.paint || '#94a3b8'); if (cfg.finish === 'carbon') pc = shade(pc, .3);
    const hullM = M(pc, fin.m, fin.r, { side: THREE.DoubleSide, emissive: fin.e ? ac : 0x000000, emissiveIntensity: fin.e }), acc = E(ac, 1.9);
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const P = { fin: grp(), wingL: grp(), wingR: grp(), engL: grp(), engR: grp(), canopy: grp() }, flames = [];
    for (const k in P) body.add(P[k]);
    const hull = HULLP[cfg.hull] ? cfg.hull : 'falcon', prof = HULLP[hull], rm = Math.max.apply(null, prof.map(a => a[0]));
    body.add(mesh(lathe(prof, 40), hullM, null, [-H, 0, 0]));
    if (cfg.stripe !== false) body.add(mesh(BX(.05, .02, 1.5), acc, [0, rm + .01, .45]));
    // hull-specific details
    if (hull === 'vanguard') [1, -1].forEach(s => body.add(mesh(BX(.12, .46, 1.5), hullM, [.52 * s, .05, .2]), mesh(BX(.06, .1, 1.1), acc, [.6 * s, .05, .2])));
    if (hull === 'phantom') body.add(mesh(CY(.025, .05, 1.2, 8), dark, [0, 0, -2.25], [H, 0, 0]), mesh(BX(.04, .7, 1.4), hullM, [0, .45, .95], [-.25, 0, 0]));
    if (hull === 'titan') [-.6, 0, .6].forEach(z => body.add(mesh(TO(.62, .05, 8, 28), dark, [0, 0, z])));
    if (hull === 'nova') { body.add(mesh(TO(.46, .04, 8, 28), acc, [0, 0, -.1])); [1, -1].forEach(s => body.add(mesh(BX(.04, .38, .8), hullM, [.2 * s, .38, 1.0], [0, 0, -.4 * s]))); }
    if (hull === 'wraith') { [1, -1].forEach(s => body.add(mesh(BX(.03, .02, 1.3), acc, [.17 * s, .06, -.3], [0, -.12 * s, 0]), mesh(BX(.5, .03, .5), dark, [.3 * s, 0, -.9], [0, .5 * s, 0]))); body.add(mesh(CY(.02, .045, 1.5, 8), dark, [0, 0, -2.5], [H, 0, 0])); }
    if (hull === 'aegis') { [1, -1].forEach(s => body.add(mesh(BX(.34, .5, .9), hullM, [.62 * s, 0, -.2], [0, 0, .12 * s]), mesh(BX(.06, .12, .7), acc, [.8 * s, .08, -.2]))); body.add(mesh(TO(.74, .06, 8, 32), acc, [0, 0, .15])); }
    if (hull === 'ronin') { [1, -1].forEach(s => body.add(mesh(BX(.04, .05, 2.4), acc, [.34 * s, 0, -.6], [0, .1 * s, 0]), mesh(BX(.36, .03, .14), dark, [.3 * s, 0, .55]))); body.add(mesh(BX(.03, .16, 1.1), acc, [0, 0, -2.25])); body.add(mesh(BX(.2, .05, .06), dark, [0, 0, -1.7])); }
    if (hull === 'hive') { [1, -1].forEach(s => { [-.45, .35].forEach(z => body.add(mesh(SP(.2, 14), dark, [.66 * s, -.05, z]), mesh(TO(.2, .035, 6, 16), acc, [.66 * s, -.05, z], [H, 0, 0]))); }); body.add(mesh(BX(.5, .04, 1.8), dark, [0, .5, -.1]), mesh(BX(.06, .05, 1.7), acc, [0, .53, -.1])); }
    if (hull === 'longbow') { body.add(mesh(CY(.05, .07, 1.9, 10), dark, [0, 0, -2.6], [H, 0, 0]), mesh(CY(.09, .09, .18, 10), acc, [0, 0, -3.5], [H, 0, 0])); body.add(mesh(CY(.06, .06, .8, 10), dark, [0, .34, -.6], [H, 0, 0]), mesh(SP(.07, 10), acc, [0, .34, -1.02])); }
    // tail fins (detachable)
    if (hull === 'phantom' || hull === 'nova' || hull === 'wraith' || hull === 'longbow' || hull === 'ronin') P.fin.add(mesh(BX(.05, .62, .8), hullM, [0, .4, 1.0], [0, 0, 0]));
    else [1, -1].forEach(s => P.fin.add(mesh(BX(.05, .55, .7), hullM, [.3 * s, .34, .9], [0, 0, -.35 * s])));
    P.fin.userData.c = [0, .4, .95];
    // canopy variants
    const cy = rm * .6, cn = cfg.canopy;
    if (cn === 'razor') P.canopy.add(mesh(SP(.3, 24), glass, [0, cy, -.1], null, [.55, .4, 2.6]));
    else if (cn === 'dome') P.canopy.add(mesh(SP(.42, 24), glass, [0, cy, -.25], null, [1, .85, 1.5]));
    else if (cn === 'visor') P.canopy.add(mesh(BX(.5, .2, .95), glass, [0, cy, -.5], [.28, 0, 0]), mesh(BX(.52, .04, .96), acc, [0, cy + .1, -.5], [.28, 0, 0]));
    else P.canopy.add(mesh(SP(.3, 24), glass, [0, cy, -.35], null, [1, .7, 1.9]));
    P.canopy.userData.c = [0, cy, -.3];
    // wings (detachable) + cannons
    const wk = WINGP[cfg.wings] ? cfg.wings : 'swept', wx = WINGX[wk], cx = wk === 'delta' ? .9 : wk === 'broad' ? 1.2 : 1;
    [1, -1].forEach(s => {
      const P2 = s > 0 ? P.wingR : P.wingL, w = mesh(wingG(wk), hullM, [0, -.04, 0], [-H, 0, 0], [s, 1, 1]);
      P2.add(w, mesh(BX(.12, .05, .3), acc, [wx * s, .02, wk === 'forward' ? -.7 : 1.02]), mesh(CY(.045, .055, 1.7, 12), dark, [cx * s, .03, -.2], [H, 0, 0]));
      P2.userData.c = [1.2 * s, 0, .1];
    });
    // engines (detachable) + flames
    const ek = cfg.engine || 'twin', ES = { twin: { r: .2, l: .9, z: 1.0, pts: [[.36, 0]] }, quad: { r: .13, l: .8, z: 1.0, pts: [[.3, .15], [.3, -.15]] }, heavy: { r: .3, l: 1.1, z: .95, pts: [[.4, 0]] }, pods: { r: .17, l: 1.1, z: .55, pts: [[1.45, -.04]] } }[ek] || { r: .2, l: .9, z: 1, pts: [[.36, 0]] };
    [1, -1].forEach(s => {
      const P2 = s > 0 ? P.engR : P.engL;
      ES.pts.forEach(pt => {
        const x = pt[0] * s, y = pt[1], zt = ES.z + ES.l / 2;
        P2.add(mesh(CY(ES.r, ES.r * 1.2, ES.l, 20), dark, [x, y, ES.z], [H, 0, 0]), mesh(TO(ES.r, .03, 8, 24), acc, [x, y, zt]));
        const f = mesh(new THREE.ConeGeometry(ES.r * .75, 1.6, 14, 1, true), new THREE.MeshBasicMaterial({ color: ac, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }), [x, y, zt + .8], [H, 0, 0]);
        const gs = sprite(ac, 1.5, x, y, zt + .1); P2.add(f, gs); flames.push(f, gs);
      });
      P2.userData.c = [ES.pts[0][0] * s, 0, ES.z];
    });
    const light = new THREE.PointLight(ac, 1.8, 170); light.position.set(0, 0, 2); body.add(light);
    return { g, body, P, flames, light, k: HULLK[hull] || 1 };
  }

  // ================= enemy archetypes (all face -Z, about 3-4 units long) =================
  const ARCH = {
    dart(o) {
      const hu = M(o.c, .85, .3), em = E(o.e, 2.4), g = grp(), n = o.n || 8, k = o.k || 1;
      g.add(mesh(CO(.5, 2.4, n), hu, [0, 0, -.8], [-H, 0, 0]), mesh(CY(.5, .38, 1.6, n), hu, [0, 0, 1.0], [H, 0, 0]), mesh(SP(.26, 12), em, [0, .28, -.2]));
      [1, -1].forEach(s => g.add(mesh(BX(1.7 * k, .07, .8), hu, [1.0 * s, 0, .8], [0, -.55 * s, .18 * s]), mesh(BX(.08, .35, .5), em, [1.85 * s * Math.min(k, 1.2), 0, 1.3]), mesh(CY(.14, .18, .5, 10), dark, [.28 * s, 0, 1.8], [H, 0, 0])));
      if (o.drill) g.add(spin(mesh(CO(.4, 1.7, 8), M(0xd1d5db, .95, .25), [0, 0, -2.6], [-H, 0, 0]), 0, .5, 0));
      return gl(g, o.e, 1.8, 0, 0, 2.1);
    },
    saucer(o) {
      const g = grp(), red = E(o.e, 2), lights = new THREE.Group();
      g.add(mesh(lathe([[0, -.18], [.9, -.12], [1.6, 0], [1.72, .1], [1.0, .3], [.5, .42], [0, .46]], 56), M(o.c, .9, .3, { side: THREE.DoubleSide })), mesh(new THREE.SphereGeometry(.62, 28, 14, 0, 6.283, 0, 1.571), new THREE.MeshStandardMaterial({ color: 0x7dd3fc, metalness: .1, roughness: .05, transparent: true, opacity: .6, emissive: 0x0b4a70, emissiveIntensity: .6 }), [0, .4, 0], null, [1, .85, 1]), mesh(TO(1.42, .035, 8, 56), red, [0, .05, 0], [H, 0, 0]));
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; lights.add(mesh(SP(.06, 8), red, [Math.cos(a) * 1.62, .06, Math.sin(a) * 1.62])); }
      g.add(spin(lights, 0, .03, 0)); return gl(g, o.e, 3.2, 0, -.25, 0);
    },
    sniper(o) {
      const hu = M(o.c, .9, .3), g = grp();
      g.add(mesh(CY(.09, .13, 3.6, 12), dark, [0, 0, -2.1], [H, 0, 0]), mesh(SP(1, 18), hu, [0, 0, .3], null, [1, .75, 1.5]), mesh(SP(.3, 12), E(o.e, 2.6), [0, .45, -.45]), mesh(BX(.12, .9, 1.2), hu, [.7, .3, 1.1], [0, 0, .5]), mesh(BX(.12, .9, 1.2), hu, [-.7, .3, 1.1], [0, 0, -.5]));
      return g;
    },
    elite(o) {
      const hu = M(o.c, .85, .32), pu = E(o.e, 2.4), g = grp();
      g.add(mesh(CO(.9, 2.6, 6), hu, [0, 0, -1.1], [-H, 0, 0]), mesh(BX(1.8, .7, 2.4), hu, [0, 0, .9]), mesh(BX(1.2, .25, 1.5), dark, [0, .45, .7]), mesh(SP(.3, 14), pu, [0, .62, .2]));
      [1, -1].forEach(s => g.add(mesh(CY(.36, .36, 2.8, 16), hu, [1.4 * s, 0, -.1], [H, 0, 0]), mesh(CY(.1, .1, 1.8, 10), dark, [1.4 * s, 0, -2], [H, 0, 0]), mesh(SP(.15, 10), pu, [1.4 * s, 0, -2.95]), mesh(BX(.9, .14, .6), hu, [1 * s, 0, .2]), mesh(BX(.1, .9, 1.7), hu, [1.1 * s, .3, .9], [0, 0, .45 * s]), mesh(TO(.26, .05, 8, 16), pu, [.6 * s, 0, 2.1])));
      return g;
    },
    pod(o) {
      const hu = M(o.c, .6, .4), em = E(o.e, 2.2), g = grp(), sp = grp(), n = o.n === undefined ? 8 : o.n;
      g.add(mesh(new THREE.IcosahedronGeometry(1, 1), hu, null, null, [1.15, .95, 1.1]), mesh(SP(.4, 14), em, [0, .1, -.95]), mesh(SP(.18, 10), E(0xffffff, 2), [0, .1, -1.3]));
      for (let i = 0; i < n; i++) { const th = i * 2.399963, ph = ((i + .5) / n * 2 - 1) * 1.25, a = new THREE.Group(); a.rotation.set(th, 0, ph); a.add(mesh(CO(.2, .85, 6), M(0x1c1917, .8, .35), [0, 1.35, 0])); a.add(mesh(SP(.07, 8), em, [0, 1.8, 0])); sp.add(a); }
      g.add(spin(sp, .004, .018, .008)); return gl(g, o.e, 3.2, 0, 0, 0);
    },
    crab(o) {
      const hu = M(o.c, .75, .4), em = E(o.e, 2.4), g = grp();
      g.add(mesh(SP(1, 18), hu, [0, 0, .2], null, [1.25, .55, 1.15]), mesh(SP(.17, 10), em, [.4, .35, -.78]), mesh(SP(.17, 10), em, [-.4, .35, -.78]), mesh(BX(1.5, .15, .5), em, [0, .2, 1.2]));
      [1, -1].forEach(s => {
        g.add(mesh(CY(.17, .2, 1.5, 10), hu, [1.2 * s, 0, -.4], [H, 0, .5 * s]), mesh(CO(.3, 1.2, 8), M(0xd6d3d1, .8, .3), [1.45 * s, 0, -1.65], [-H, 0, .22 * s]), mesh(CO(.26, 1.0, 8), M(0xd6d3d1, .8, .3), [.85 * s, 0, -1.55], [-H, 0, -.25 * s]));
        for (let i = 0; i < 3; i++) g.add(mesh(CY(.06, .08, 1.5, 6), dark, [1.45 * s, -.1, .1 + i * .55], [0, 0, H - .5 * s]));
      }); return gl(g, o.e, 2.4, 0, 0, 0);
    },
    gear(o) {
      const hu = M(o.c, .9, .35), em = E(o.e, 2.2), g = grp(), r = grp();
      r.add(mesh(CY(1.35, 1.35, .45, 28), hu), mesh(CY(.5, .5, .55, 16), em), mesh(TO(.9, .06, 8, 28), em, [0, .26, 0], [H, 0, 0]));
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; r.add(mesh(BX(.5, .5, .42), hu, [Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55], [0, -a, 0])); }
      g.add(spin(r, 0, .06, 0)); return gl(g, o.e, 3, 0, 0, 0);
    },
    ringeye(o) {
      const hu = M(o.c, .9, .25), em = E(o.e, 2.6), g = grp();
      g.add(mesh(SP(.7, 20), hu), mesh(SP(.38, 14), em, [0, 0, -.55]), mesh(SP(.16, 10), E(0xffffff, 2.4), [0, 0, -.88]), spin(mesh(TO(1.5, .09, 10, 40), M(o.e, 1, .2)), .03, 0, 0), spin(mesh(TO(1.15, .07, 10, 36), em, null, [0, H, 0]), 0, .05, .02));
      return gl(g, o.e, 3.4, 0, 0, 0);
    },
    tank(o) {
      const hu = M(o.c, .8, .4), em = E(o.e, 2.4), g = grp();
      g.add(mesh(BX(2.2, .8, 3.4), hu, [0, 0, .3]), mesh(CY(.75, .85, .55, 16), hu, [0, .65, .5]), mesh(CY(.12, .15, 2.4, 10), dark, [0, .7, -1.2], [H, 0, 0]), mesh(SP(.18, 10), em, [0, .7, -2.45]), mesh(BX(1.2, .14, .06), em, [0, .1, -1.43]));
      [1, -1].forEach(s => g.add(mesh(BX(.55, .6, 3.6), dark, [1.35 * s, -.15, .3]), mesh(BX(.1, .5, 3.2), em, [1.66 * s, -.15, .3]), mesh(CY(.12, .12, .5, 8), dark, [.8 * s, .95, 1.6])));
      return gl(g, o.e, 2.4, 0, 0, 1.9);
    },
    worm(o) {
      const hu = M(o.c, .6, .4), em = E(o.e, 2.2), g = grp(), n = o.n || 6;
      for (let i = 0; i < n; i++) { const r = .75 - i * .08, s = mesh(SP(r > .3 ? r : .3, 14), i % 2 ? M(shade(o.c, .6), .6, .4) : hu, [0, 0, -1.8 + i * .85]); s.userData.wob = i * 1.2; g.add(s); if (i > 0 && i < n - 1) { const f = mesh(CO(.14, .55, 6), em, [0, .62 - i * .06, -1.8 + i * .85]); g.add(f); } }
      g.add(mesh(SP(.17, 10), em, [.35, .22, -2.2]), mesh(SP(.17, 10), em, [-.35, .22, -2.2]), mesh(CO(.25, .7, 8), M(0xe7e5e4, .6, .3), [0, 0, -2.7], [-H, 0, 0]));
      return gl(g, o.e, 2.2, 0, 0, -1.8);
    },
    crystal(o) {
      const hu = M(o.c, .5, .15, { flatShading: true }), em = E(o.e, 2.6), g = grp(), orb = grp();
      g.add(mesh(OC(1), hu, null, null, [.62, .62, 1.9]), mesh(OC(.5), em, null, null, [.6, .6, 1.2]));
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; orb.add(mesh(OC(.3), em, [Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0], [a, a, 0], [1, 1, 1.6])); }
      g.add(spin(orb, 0, 0, .05)); return gl(g, o.e, 3.4, 0, 0, 0);
    },
    manta(o) {
      const sh = new THREE.Shape(), pts = [[0, 1.8], [1.2, .8], [2.6, -.3], [2.2, -.7], [1.0, -.3], [0, -1.3], [-1.0, -.3], [-2.2, -.7], [-2.6, -.3], [-1.2, .8]]; sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath();
      const hu = M(o.c, .75, .35, { side: THREE.DoubleSide }), em = E(o.e, 2.5), g = grp();
      g.add(mesh(new THREE.ExtrudeGeometry(sh, { depth: .14, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 2 }), hu, [0, 0, 0], [-H, 0, 0]), mesh(SP(.5, 16), hu, [0, .12, -.3], null, [.9, .7, 1.8]), mesh(SP(.18, 10), em, [.28, .28, -1.1]), mesh(SP(.18, 10), em, [-.28, .28, -1.1]), mesh(BX(.1, .1, 2.2), em, [0, .1, .6]));
      [1, -1].forEach(s => g.add(mesh(BX(.12, .06, 1.2), em, [1.9 * s, .09, .2], [0, -.5 * s, 0])));
      if (o.lure) { g.add(mesh(CY(.04, .04, 2.2, 6), dark, [0, .45, -1.9], [H + .5, 0, 0]), mesh(SP(.2, 12), E(o.e, 3.4), [0, .1, -3.0])); gl(g, o.e, 1.8, 0, .1, -3.0); }
      if (o.fire) [-1, 0, 1].forEach(i => g.add(mesh(CO(.28, 1.8, 8), E(0xf97316, 2.2), [i * .6, .1, 2.3], [H, 0, 0])));
      return gl(g, o.e, 3.2, 0, 0, 0);
    },
    jelly(o) {
      const hu = M(o.c, .2, .12, { transparent: true, opacity: .78, emissive: o.e, emissiveIntensity: .35 }), em = E(o.e, 2.4), g = grp(), t = grp(), n = o.n || 6;
      g.add(mesh(new THREE.SphereGeometry(1.2, 24, 12, 0, 6.283, 0, 1.571), hu, [0, 0, -.2], [-H, 0, 0], [1, 1, .85]), mesh(SP(.5, 14), em, [0, 0, .1]), mesh(TO(1.2, .07, 8, 36), em, [0, 0, -.2]));
      for (let i = 0; i < n; i++) { const a = i / n * TAU, c = mesh(CY(.05, .02, 2.2, 6), em, [Math.cos(a) * .8, Math.sin(a) * .8, 1.1], [H, 0, 0]); c.userData.wob = i * 1.1; t.add(c); }
      g.add(t); return gl(g, o.e, 3.4, 0, 0, 0);
    },
    cube(o) {
      const hu = M(o.c, .9, .2, { transparent: true, opacity: .4, side: THREE.DoubleSide }), em = E(o.e, 2.6), g = grp();
      g.add(spin(grp(mesh(BX(2, 2, 2), hu), mesh(BX(1.0, 1.0, 1.0), em)), .025, .035, .015));
      const k = grp(); for (let i = 0; i < 8; i++) k.add(mesh(SP(.13, 8), em, [(i & 1 ? 1 : -1), (i & 2 ? 1 : -1), (i & 4 ? 1 : -1)])); g.add(spin(k, .025, .035, .015));
      return gl(g, o.e, 3.2, 0, 0, 0);
    },
    clock(o) {
      const go = M(o.c, .95, .25), em = E(o.e, 2.5), g = grp(), h1 = grp(), h2 = grp();
      g.userData.face = 1;
      g.add(mesh(CY(1.4, 1.4, .3, 32), M(0x1c1917, .8, .4), null, [H, 0, 0]), mesh(TO(1.45, .12, 10, 40), go, [0, 0, .1]), mesh(SP(.2, 12), em, [0, 0, .25]));
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.add(mesh(BX(i % 3 ? .08 : .14, i % 3 ? .22 : .34, .08), em, [Math.sin(a) * 1.15, Math.cos(a) * 1.15, .18], [0, 0, -a])); }
      h1.add(mesh(BX(.14, .75, .06), go, [0, .37, .2])); h2.add(mesh(BX(.09, 1.1, .06), em, [0, .55, .22]));
      g.add(spin(h1, 0, 0, -.006), spin(h2, 0, 0, -.06)); return gl(g, o.e, 3.4, 0, 0, .3);
    },
    rock(o) {
      const geo = new THREE.IcosahedronGeometry(1, 1), p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), d = 1 + .22 * Math.sin(x * 3.1 + y * 2.3) * Math.cos(z * 2.7) + .08 * Math.sin(z * 6); p.setXYZ(k, x * d, y * d, z * d); }
      geo.computeVertexNormals(); return spin(grp(mesh(geo, M(o.c, .3, .85, { flatShading: true }), null, null, [1.1, .85, 1])), .01, .02, .015);
    }
  };


  // ================= bosses: each returns {g, anim(a)}; front is -Z =================
  function B0() {
    const g = new THREE.Group(), hu = M(0x50627f, .9, .3), c = E(0x38bdf8, 2), rings = [];
    g.add(mesh(BX(3.2, 1, 8), hu, [0, 0, .5]), mesh(CO(2.1, 4.2, 4), hu, [0, 0, -5.6], [-H, PI / 4, 0]), mesh(BX(2.2, .6, 5), dark, [0, .75, .8]), mesh(BX(1, 1.3, 1.8), hu, [0, 1.7, 2]), mesh(BX(.8, .12, .06), c, [0, 2, 1.08]));
    [1, -1].forEach(s => { g.add(mesh(BX(.9, .5, 6), hu, [2 * s, 0, .8]), mesh(BX(.05, .08, 5.6), c, [2.45 * s, .1, .8]));
      [-.5, -2.6].forEach(z => g.add(mesh(CY(.35, .4, .35, 16), dark, [.9 * s, 1.15, z]), mesh(CY(.07, .07, 1.7, 8), dark, [.9 * s + .15, 1.2, z - 1], [H, 0, 0]), mesh(CY(.07, .07, 1.7, 8), dark, [.9 * s - .15, 1.2, z - 1], [H, 0, 0]))); });
    for (let x = -1.2; x <= 1.3; x += .6) { g.add(mesh(CY(.22, .28, .8, 16), dark, [x, 0, 4.6], [H, 0, 0])); const r = mesh(TO(.22, .05, 8, 16), E(0x38bdf8, 2), [x, 0, 5.05]); g.add(r); rings.push(r); }
    return { g, anim: a => rings.forEach((r, i) => r.material.emissiveIntensity = 1.6 + Math.sin(a + i) * .9) };
  }
  function B1() {
    const g = new THREE.Group(), gm = new THREE.MeshStandardMaterial({ color: 0x14532d, emissive: 0x10b981, emissiveIntensity: .35, roughness: .45, metalness: .2 });
    const ico = new THREE.IcosahedronGeometry(2.3, 3), p = ico.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), d = 1 + .16 * Math.sin(x * 2.2) * Math.cos(y * 2.6 + z) + .07 * Math.sin(z * 5); p.setXYZ(k, x * d, y * d, z * d); }
    ico.computeVertexNormals(); g.add(new THREE.Mesh(ico, gm));
    [[-.9, .6, -1.9, .5], [.9, .6, -1.9, .5], [0, -.5, -2.15, .6]].forEach(e => g.add(mesh(SP(e[3], 20), M(0xf0fdf4, .1, .2), [e[0], e[1], e[2]]), mesh(SP(e[3] * .45, 16), E(0x10b981, 2.4), [e[0], e[1], e[2] - e[3] * .75])));
    for (let i = 0; i < 9; i++) { const a = i * 2.4, v = new THREE.Vector3(Math.cos(a), Math.sin(a * 1.7), Math.sin(a)).normalize().multiplyScalar(2.35); g.add(mesh(SP(.2, 10), E(0xbef264, 1.8), [v.x, v.y, Math.abs(v.z) * .5 + .4])); }
    const tg = new THREE.Group(); g.add(tg);
    return { g, anim: a => { while (tg.children.length) { tg.children[0].geometry.dispose(); tg.remove(tg.children[0]); }
      for (let t = 0; t < 6; t++) { const an = t / 6 * 2 * PI, pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(new THREE.Vector3(Math.cos(an) * (1.3 + u * 1.2) + Math.sin(a + u * 4 + t) * .4 * u, Math.sin(an) * (1.3 + u * 1.2) + Math.cos(a + u * 4 + t) * .4 * u, 1.4 + u * 4.6)); }
        tg.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .26, 8), gm)); } } };
  }
  function B2() {
    const g = new THREE.Group(), ru = M(0x8a3a14, .55, .75), wheels = [];
    g.add(mesh(BX(3, 2, 4.2), ru, [0, 0, .3]), mesh(BX(1.5, .8, 1.3), glass, [0, 1.35, -.6]), mesh(CO(1.35, 3.6, 24), M(0x9ca3af, .95, .3), [0, 0, -3.9], [-H, 0, 0]), mesh(SP(.22, 10), E(0xf59e0b, 3), [0, 0, -5.8]));
    [-.8, .8].forEach(x => g.add(mesh(CY(.25, .32, 1.7, 12), dark, [x, 1.8, 1.5]), mesh(CY(.2, .2, .1, 12), E(0xf97316, 3), [x, 2.67, 1.5])));
    [1, -1].forEach(s => { const w = new THREE.Group(); w.position.set(2.7 * s, -.2, .2); w.add(mesh(CY(1.9, 1.9, .5, 36), M(0x6b7280, .9, .35), [0, 0, 0], [0, 0, H]), mesh(CY(.5, .5, .6, 16), E(0xf59e0b, 1.6), [0, 0, 0], [0, 0, H]));
      for (let i = 0; i < 18; i++) { const a = i / 18 * 2 * PI; w.add(mesh(BX(.45, .5, .5), M(0xd1d5db, .95, .25), [0, Math.cos(a) * 2.1, Math.sin(a) * 2.1], [a, 0, 0])); }
      g.add(w, mesh(CY(.13, .13, 1.6, 8), dark, [1.7 * s, -.2, .2], [0, 0, H])); wheels.push(w); });
    return { g, anim: a => wheels.forEach(w => w.rotation.x = a) };
  }
  function B3() {
    const g = new THREE.Group(), vm = M(0x4c1d95, .9, .25), rg = [], sh = [];
    g.add(mesh(lathe([[0, -.3], [2.4, -.2], [3.8, 0], [3.9, .15], [2.2, .5], [0, .6]], 64), vm), mesh(SP(1, 32), E(0xf5d0fe, 3), [0, .5, 0]));
    g.children[0].material.side = THREE.DoubleSide;
    [[2.6, 0], [2.1, 1], [1.6, 2]].forEach(() => { const t = mesh(TO(2, .11, 12, 64), M(0xc084fc, 1, .15), [0, .5, 0]); g.add(t); rg.push(t); });
    rg[0].scale.setScalar(1.3); rg[1].scale.setScalar(1.05); rg[2].scale.setScalar(.8);
    for (let i = 0; i < 8; i++) { const s = mesh(OC(.55), E(0xe879f9, 1.6)); s.scale.set(.6, 1.8, .6); g.add(s); sh.push(s); }
    return { g, anim: a => { rg[0].rotation.set(a, 0, 0); rg[1].rotation.set(0, a, 1); rg[2].rotation.set(1, a, a); sh.forEach((s, i) => { const t = i / 8 * 2 * PI + a; s.position.set(Math.cos(t) * 3.3, .5 + Math.sin(t * 2) * .3, Math.sin(t) * 3.3); s.rotation.set(t, 0, 0); }); } };
  }
  function B4() {
    const g = new THREE.Group(), rg = [], sp = new THREE.Group();
    g.add(mesh(SP(1.4, 48), M(0x000000, 1, .05)));
    const dk = srgb(new THREE.CanvasTexture(cv(256, 4, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.2, '#fef08a'); gr.addColorStop(.55, '#f43f5e'); gr.addColorStop(1, 'rgba(120,0,20,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); })));
    const rgGeo = new THREE.RingGeometry(1.7, 4.4, 96), pp = rgGeo.attributes.position, uv = rgGeo.attributes.uv, v = new THREE.Vector3();
    for (let i = 0; i < pp.count; i++) { v.fromBufferAttribute(pp, i); uv.setXY(i, (v.length() - 1.7) / 2.7, .5); }
    const disk = new THREE.Mesh(rgGeo, new THREE.MeshBasicMaterial({ map: dk, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); disk.rotation.x = H - .3; g.add(disk);
    [[2.0, 0xf43f5e], [2.5, 0xfb7185], [3.0, 0xfef08a]].forEach(r => { const t = mesh(TO(r[0], .07, 10, 80), E(r[1], 2.4)); g.add(t); rg.push(t); });
    for (let i = 0; i < 10; i++) { const a = i / 10 * 2 * PI; sp.add(mesh(CO(.28, 1.6, 8), M(0x7f1d1d, .9, .3), [Math.cos(a) * 4.4, Math.sin(a) * 4.4, 0], [0, 0, a - H])); } g.add(sp);
    return { g, anim: a => { rg[0].rotation.set(a, 0, 0); rg[1].rotation.set(0, a, 0); rg[2].rotation.set(a, 0, a); sp.rotation.z = a; disk.rotation.z = a; } };
  }
  function B5() { // Permafrost Warden: ice-crystal fortress
    const g = grp(), ice = M(0xa5e1ff, .15, .1, { transparent: true, opacity: .86 }), cr = E(0x38bdf8, 2.4), sh = grp();
    g.add(mesh(CY(1.4, 1.9, 5.2, 6), ice, [0, 0, .6], [H, 0, 0]), mesh(CO(1.4, 3, 6), ice, [0, 0, -3.5], [-H, 0, 0]), mesh(SP(.95, 20), cr, [0, 0, .4]), mesh(CY(.5, .5, 5.6, 8), dark, [0, 0, .6], [H, 0, 0]));
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.add(mesh(CO(.3, 2.3 + (i % 2), 6), ice, [Math.cos(a) * 1.8, Math.sin(a) * 1.8, 2.6], [0, 0, a - H])); }
    for (let i = 0; i < 6; i++) { const s = mesh(OC(.6), cr); s.scale.set(.6, .6, 2); sh.add(s); } g.add(sh);
    return { g, anim: a => sh.children.forEach((s, i) => { const t = i / 6 * TAU + a * .8; s.position.set(Math.cos(t) * 3.2, Math.sin(t) * 3.2, 1 + Math.sin(a * 2 + i) * .3); s.rotation.z = t; }) };
  }
  function B6() { // Forge Titan: furnace body, hammer arms
    const g = grp(), st = M(0x44403c, .85, .45), mo = M(0x7c2d12, .7, .5), fire = E(0xfb923c, 2.6), arms = [];
    g.add(mesh(BX(3.8, 2.6, 4.2), st, [0, 0, .4]), mesh(BX(2.4, 1.6, 2), mo, [0, .4, -2.3]), mesh(BX(1.8, .35, .1), fire, [0, .5, -3.32]), mesh(BX(3, .5, 3), fire, [0, 1.4, .3]));
    [-1.1, 1.1].forEach(x => g.add(mesh(CY(.35, .45, 2.2, 10), st, [x, 2.2, 1.2]), mesh(CY(.3, .3, .1, 10), fire, [x, 3.3, 1.2])));
    [1, -1].forEach(s => { const arm = grp(); arm.position.set(2.5 * s, .4, -.2); arm.add(mesh(CY(.4, .4, 2.8, 10), st, [0, 0, -1.4], [H, 0, 0]), mesh(BX(1.4, 1.4, 1.8), mo, [0, 0, -3.2]), mesh(BX(1.5, .2, .2), fire, [0, 0, -3.2])); g.add(arm); arms.push(arm); });
    return { g, anim: a => arms.forEach((m, i) => m.rotation.x = Math.sin(a * 1.6 + i * 2) * .5) };
  }
  function B7() { // Abyssal Angler: mech fish with glowing lure
    const g = grp(), hu = M(0x134e4a, .6, .4), tooth = M(0xe2e8f0, .2, .3), lum = E(0x5eead4, 2.6), jaw = grp(), lure = mesh(SP(.4, 14), E(0x5eead4, 3.4), [0, 2.1, -3.7]);
    g.add(mesh(SP(1, 22), hu, [0, .2, .6], null, [2.1, 1.7, 3]), mesh(SP(.3, 12), lum, [.95, .8, -1.7]), mesh(SP(.3, 12), lum, [-.95, .8, -1.7]), mesh(BX(2.4, .5, 2.4), hu, [0, -.3, -1.7]));
    for (let i = -2; i <= 2; i++) g.add(mesh(CO(.14, .6, 6), tooth, [i * .42, -.75, -2.7], [Math.PI, 0, 0]));
    jaw.position.set(0, -.8, -.8); jaw.add(mesh(BX(2.2, .4, 2.6), hu, [0, -.1, -1.2]));
    for (let i = -2; i <= 2; i++) jaw.add(mesh(CO(.14, .6, 6), tooth, [i * .42, .35, -2.3]));
    g.add(jaw, lure, mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.4, -.6), new THREE.Vector3(0, 2.9, -1.4), new THREE.Vector3(0, 3.1, -2.8), new THREE.Vector3(0, 2.2, -3.6)]), 20, .07, 6), dark));
    for (let i = 0; i < 7; i++) g.add(mesh(SP(.12, 8), lum, [1.95, -.3, -1.3 + i * .55]), mesh(SP(.12, 8), lum, [-1.95, -.3, -1.3 + i * .55]));
    [1, -1].forEach(s => g.add(mesh(BX(2.4, .12, 1.6), hu, [2.6 * s, -.3, 1], [0, -.5 * s, .25 * s])));
    g.add(mesh(BX(.12, 2.4, 2), hu, [0, .2, 3.4], [0, 0, 0]));
    return { g, anim: a => { jaw.rotation.x = -(.05 + (Math.sin(a * 1.4) + 1) * .17); lure.scale.setScalar(1 + Math.sin(a * 3) * .18); } };
  }
  function B8() { // Overmind Mainframe: data cube with orbiting frames
    const g = grp(), hu = M(0x14231c, .9, .25, { emissive: 0x052e16, emissiveIntensity: .45 }), em = E(0x4ade80, 2.4), mg = E(0xe879f9, 2.2), core = mesh(BX(1.5, 1.5, 1.5), em), rings = [], orb = grp();
    g.add(mesh(BX(2.8, 2.8, 2.8), hu), core, mesh(SP(.4, 14), mg, [.7, .3, -1.45]), mesh(SP(.4, 14), mg, [-.7, .3, -1.45]), mesh(BX(1.4, .12, .1), em, [0, -.5, -1.43]));
    [3.4, 4.1, 4.8].forEach((r, i) => { const t = mesh(TO(r, .09, 4, 4), E(i === 1 ? 0xe879f9 : 0x4ade80, 2.2)); g.add(t); rings.push(t); });
    for (let i = 0; i < 8; i++) { const c = mesh(BX(.5, .5, .5), i % 2 ? mg : em); orb.add(c); } g.add(orb);
    for (let i = 0; i < 5; i++) g.add(mesh(BX(.1, 2 + i % 3, .1), em, [-1.6 + i * .8, 0, 2.4]));
    return { g, anim: a => { rings[0].rotation.set(a, a * .6, 0); rings[1].rotation.set(0, a, a * .5); rings[2].rotation.set(a * .4, 0, a); core.scale.setScalar(1 + Math.sin(a * 3) * .12); orb.children.forEach((c, i) => { const t = i / 8 * TAU + a; c.position.set(Math.cos(t) * 3.6, Math.sin(t * 2) * .8, Math.sin(t) * 3.6); c.rotation.set(t, t, 0); }); } };
  }
  function B9() { // Chrono Archon: golden clock face (faces the camera)
    const g = grp(), go = M(0xd4a017, 1, .2), bk = M(0x1c1917, .8, .4), em = E(0xfde047, 2.6), h1 = grp(), h2 = grp(), h3 = grp(), gears = [];
    g.userData.face = 1;
    g.add(mesh(CY(3.1, 3.1, .5, 48), bk, null, [H, 0, 0]), mesh(TO(3.2, .24, 12, 64), go, [0, 0, .1]), mesh(TO(2.4, .05, 8, 56), em, [0, 0, .3]), mesh(SP(.4, 14), em, [0, 0, .5]));
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.add(mesh(BX(i % 3 ? .12 : .22, i % 3 ? .4 : .6, .12), em, [Math.sin(a) * 2.7, Math.cos(a) * 2.7, .35], [0, 0, -a])); }
    h1.add(mesh(BX(.28, 1.7, .1), go, [0, .85, .5])); h2.add(mesh(BX(.2, 2.5, .1), go, [0, 1.25, .56])); h3.add(mesh(BX(.06, 2.8, .06), em, [0, 1.2, .62]));
    g.add(h1, h2, h3);
    [[-3.4, -2.8], [3.5, 2.7]].forEach((p, i) => { const gr = grp(); gr.position.set(p[0], p[1], -.7); gr.add(mesh(CY(1.1, 1.1, .3, 20), go, null, [H, 0, 0])); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; gr.add(mesh(BX(.34, .4, .3), go, [Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0], [0, 0, a])); } g.add(gr); gears.push(gr); });
    [1, -1].forEach(s => { for (let k = 0; k < 4; k++) g.add(mesh(BX(.1, 2.2 - k * .3, .06), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }), [(3.9 + k * .45) * s, 0, 0], [0, 0, .3 * s * (k - 1.5)])); });
    return { g, anim: a => { h1.rotation.z = -a * .15; h2.rotation.z = -a * .9; h3.rotation.z = -a * 3; gears.forEach((q, i) => q.rotation.z = a * (i ? -1 : 1)); } };
  }
  function B10() { // Orbital Ring Sovereign: broken ring station around a reactor (faces the camera)
    const g = grp(), st = M(0x64748b, .9, .35), pl = M(0x94a3b8, .85, .3), am = E(0xfbbf24, 2.4), bl = E(0x60a5fa, 2.4), ring = grp(), core = mesh(SP(.9, 20), am);
    g.userData.face = 1;
    g.add(mesh(CY(1.5, 1.5, 1.2, 24), M(0x1e293b, .8, .3), null, [H, 0, 0]), core, mesh(TO(1.55, .12, 8, 32), pl, [0, 0, .5]));
    for (let i = 0; i < 16; i++) { if (i === 3 || i === 4 || i === 10) continue; const a = i / 16 * TAU, s = grp(); s.position.set(Math.cos(a) * 3.8, Math.sin(a) * 3.8, 0); s.rotation.z = a; s.add(mesh(BX(.5, 1.3, 1 + (i % 3) * .35), i % 2 ? st : pl), mesh(BX(.08, .5, .5), i % 4 ? bl : am, [.28, 0, 0]), mesh(CY(.05, .05, 1.2, 6), dark, [-.1, 0, 0], [0, 0, H])); ring.add(s); }
    g.add(ring);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + .3, L = i === 2 ? 1.6 : 2.7, rc = 1.5 + L / 2; g.add(mesh(BX(.2, L, .2), dark, [Math.cos(a) * rc, Math.sin(a) * rc, 0], [0, 0, a - H])); }
    [3.5, 4.5, 10.5].forEach(k => { const a = k / 16 * TAU; for (let j = 0; j < 3; j++) g.add(mesh(BX(.15, .5 + j * .2, .15), st, [Math.cos(a + j * .06) * (3.8 + j * .3), Math.sin(a + j * .06) * (3.8 + j * .3), j * .3 - .3], [j, j * 2, j * 3])); });
    return { g, anim: a => { ring.rotation.z = a * .12; core.scale.setScalar(1 + Math.sin(a * 3) * .15); } };
  }
  function B11() { // Prism Hydra: crystal body with five swaying crystal heads
    const g = grp(), cr = M(0xf9a8d4, .2, .08, { transparent: true, opacity: .88, emissive: 0x831843, emissiveIntensity: .35 }), dk = M(0x4a044e, .8, .3), em = E(0xfbcfe8, 2.6), heads = [];
    g.add(mesh(new THREE.IcosahedronGeometry(2.1, 0), cr, [0, 0, 1.6], null, [1.1, 1, 1.4]), mesh(OC(1), dk, [0, 0, 1.6], null, [1.2, 1.2, 1.6]), mesh(SP(.7, 16), em, [0, 0, 1.6]));
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .8; g.add(mesh(CO(.55, 2.2 + (i % 2) * .8, 5), cr, [Math.cos(a) * 1.6, Math.sin(a) * 1.4, 4.5], [H, 0, 0])); }
    for (let i = 0; i < 5; i++) { const h = grp(), n = []; for (let k = 0; k < 5; k++) { const b = mesh(OC(.5 - k * .04), k === 4 ? em : cr); h.add(b); n.push(b); } g.add(h); heads.push({ n, dir: i - 2 }); }
    return { g, anim: a => heads.forEach((o, i) => o.n.forEach((b, k) => { const u = k / 4; b.position.set(o.dir * .55 * u + Math.sin(a * .9 + i) * .3 * u, o.dir * .72 * u + Math.cos(a + i) * .25 * u, -.5 - u * 3.4 + Math.sin(a * 1.2 + i * 1.3) * .6 * u); b.rotation.set(a + k, a * .7, 0); if (k === 4) b.scale.setScalar(1.6 + Math.sin(a * 3 + i) * .25); })) };
  }
  function B12() { // Cyclone Tyrant: a living tornado engine
    const g = grp(), gm = M(0x365314, .85, .35), gm2 = M(0x4d7c0f, .8, .35), em = E(0xbef264, 2.6), rings = [];
    for (let i = 0; i < 8; i++) { const t = mesh(TO(3.3 - i * .33, .22 + (7 - i) * .01, 8, 40), i % 2 ? gm : gm2, [0, 2.8 - i * .8, 0], [H, 0, 0]); g.add(t); rings.push(t); }
    g.add(mesh(SP(.9, 18), em, [0, .3, -.6]), mesh(SP(.45, 12), E(0xffffff, 3), [0, .3, -1.35]), mesh(CY(.35, .15, 6.4, 10), dark, [0, 0, 0]));
    for (let i = 0; i < 6; i++) g.add(mesh(BX(.08, 1.3, .08), em, [Math.cos(i) * 3.6, 2.4 - i * .8, Math.sin(i) * 3.6], [0, i, .6]));
    return { g, anim: a => rings.forEach((t, i) => { t.rotation.x = H + Math.sin(a * 1.3 + i * .7) * .14; t.rotation.y = Math.cos(a * 1.1 + i) * .14; }) };
  }
  function B13() { // Grave Admiral: a derelict flagship with a skull prow
    const g = grp(), bone = M(0xd6d3d1, .5, .5), dk = M(0x292524, .8, .45), ghost = E(0x99f6e4, 2.4), eyes = [], sails = [];
    g.add(mesh(BX(2.2, 1.6, 8), dk, [0, 0, 1]), mesh(BX(1.2, .7, 5), bone, [0, 1.1, 1.8]), mesh(SP(1.2, 18), bone, [0, .3, -3.6], null, [1.1, 1, 1.3]), mesh(BX(1.5, .5, 1.2), bone, [0, -.7, -4.2]));
    [1, -1].forEach(s => { const e = mesh(SP(.38, 12), ghost, [.5 * s, .5, -4.6]); g.add(e); eyes.push(e); g.add(mesh(CO(.12, .5, 6), bone, [.55 * s, -1, -4.5], [PI, 0, 0]), mesh(CO(.12, .5, 6), bone, [.2 * s, -1, -4.55], [PI, 0, 0])); });
    for (let i = 0; i < 7; i++) { const z = -1.6 + i * 1.15, r = 1.35 - Math.abs(i - 3) * .08; g.add(mesh(new THREE.TorusGeometry(r, .09, 6, 16, PI), bone, [0, .1, z]), mesh(new THREE.TorusGeometry(r, .09, 6, 16, PI), bone, [0, .1, z], [0, 0, PI])); }
    [[-.6, 3.4], [1.8, 2.6]].forEach((m, i) => { g.add(mesh(BX(.12, m[1], .12), dk, [0, 1.4 + m[1] / 2, m[0]], [.1 * (i ? -1 : 1), 0, 0])); const sl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, m[1] * .7), new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: .22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); sl.position.set(0, 1.9 + m[1] * .45, m[0] + 1.1); sl.rotation.y = H; g.add(sl); sails.push(sl); });
    return { g, anim: a => { eyes.forEach(e => e.scale.setScalar(1 + Math.sin(a * 3) * .2)); sails.forEach((s, i) => { s.scale.set(1, 1, 1 + Math.sin(a * 1.4 + i) * .08); s.material.opacity = .18 + Math.sin(a * 2 + i) * .06; }); } };
  }
  function B14() { // The Aetheria Core: a crystal heart inside gyroscope rings (faces the camera)
    const g = grp(), wh = M(0xe0f2fe, .3, .12, { emissive: 0x0e7490, emissiveIntensity: .5 }), cy = E(0x67e8f9, 2.8), gy = [], sh = grp(), core = mesh(new THREE.IcosahedronGeometry(1.6, 1), wh);
    g.userData.face = 1;
    g.add(core, mesh(SP(.9, 18), cy), mesh(OC(2.2), M(0x22d3ee, .1, .05, { transparent: true, opacity: .18 })));
    [[3.2, 0x22d3ee], [3.8, 0xe0f2fe], [4.4, 0x67e8f9]].forEach(r => { const t = mesh(TO(r[0], .1, 8, 64), E(r[1], 2.4)); g.add(t); gy.push(t); });
    for (let i = 0; i < 9; i++) sh.add(mesh(OC(.45), i % 2 ? cy : wh, null, null, [.6, 1.9, .6]));
    g.add(sh);
    return { g, anim: a => { gy[0].rotation.set(a, 0, 0); gy[1].rotation.set(0, a * .8, 1); gy[2].rotation.set(a * .5, a * .6, a * .3); core.rotation.set(a * .4, a * .7, 0); core.scale.setScalar(1 + Math.sin(a * 3) * .08); sh.children.forEach((s, i) => { const t = i / 9 * TAU + a; s.position.set(Math.cos(t) * 5.2, Math.sin(t * 2) * 1.2, Math.sin(t) * 3.2); s.rotation.set(t, 0, t * .5); }); } };
  }
  function B15() { // The Null Process: a black monolith that keeps losing its texture, ringed by stolen fragments of other worlds
    const g = grp(), blk = M(0x0b0b12, .2, .6), mag = E(0xff2bd6, 2.6), cy = E(0x22d3ee, 2.4), grn = E(0x4ade80, 2.2), chk = M(0xff00ff, .1, .8), frag = [], slices = [];
    g.userData.face = 1;
    const body = mesh(BX(2.4, 4.2, 1.2), blk); g.add(body);
    for (let i = 0; i < 6; i++) { const s = mesh(BX(2.6, .14, 1.3), i % 2 ? mag : cy, [0, -1.8 + i * .7, 0]); g.add(s); slices.push(s); }
    g.add(mesh(BX(.5, .3, .1), mag, [-.55, 1.2, .62]), mesh(BX(.5, .3, .1), cy, [.55, 1.2, .62]), mesh(BX(1.4, .12, .1), grn, [0, .6, .62]));
    const cols = [0xdc2626, 0x5fa83a, 0xcbb35a, 0x2563eb, 0xf472b6, 0x8a5a33, 0xfacc15, 0x94a3b8];
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = 3.2 + (i % 3) * .5, f = mesh(BX(.5 + (i % 3) * .25, .5 + (i % 2) * .3, .5), i % 4 === 0 ? chk : M(cols[i % 8], .3, .5), [Math.cos(a) * r, Math.sin(a) * r, (i % 2 ? .6 : -.6)]); f.userData.a = a; f.userData.r = r; g.add(f); frag.push(f); }
    const ring = mesh(TO(3.6, .06, 6, 64), mag); g.add(ring);
    return { g, anim: a => { ring.rotation.z = a * .4; const tick = Math.floor(a * 6);
      frag.forEach((f, i) => { const ang = f.userData.a + a * .25 * (i % 2 ? 1 : -1), j = (tick + i * 7) % 11 === 0 ? .5 : 0; f.position.set(Math.cos(ang) * f.userData.r + j, Math.sin(ang) * f.userData.r, f.position.z); f.rotation.set(a + i, a * .7 + i, 0); });
      slices.forEach((s, i) => { s.position.x = (tick + i * 3) % 9 === 0 ? (i % 2 ? .5 : -.5) : 0; s.visible = (tick + i) % 13 !== 0; });
      body.position.x = tick % 17 === 0 ? .25 : 0; } };
  }
  function B16() { // Aetheria Prime: a golden sun-core with a halo crown and six blade wings (faces the camera)
    const g = grp(), gold = M(0xfbbf24, .9, .22, { emissive: 0x92400e, emissiveIntensity: .35 }), wht = M(0xfff7ed, .4, .2, { emissive: 0xfde68a, emissiveIntensity: .3 }), sun = E(0xfde047, 3), hal = E(0xffffff, 2.4), wings = [], halos = [];
    g.userData.face = 1;
    const core = mesh(SP(1.5, 28), sun); g.add(core, mesh(new THREE.IcosahedronGeometry(2.1, 1), M(0xfde047, .2, .1, { transparent: true, opacity: .16 })));
    for (let i = 0; i < 6; i++) { const w = grp(), a = i / 6 * TAU + TAU / 12; w.add(mesh(BX(.5, 3.6, .16), gold, [0, 2.6, 0]), mesh(BX(.18, 2.8, .2), hal, [0, 2.5, .12]), mesh(OC(.4), wht, [0, 4.6, 0], null, [.6, 1.6, .6])); w.rotation.z = a; g.add(w); wings.push(w); }
    [[2.5, .09], [3.1, .06]].forEach(r => { const t = mesh(TO(r[0], r[1], 8, 72), hal); g.add(t); halos.push(t); });
    const crown = grp(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; crown.add(mesh(CO(.22, .9, 6), gold, [Math.cos(a) * 2.9, Math.sin(a) * 2.9, 0], [0, 0, a - H])); } g.add(crown);
    return { g, anim: a => { core.scale.setScalar(1 + Math.sin(a * 4) * .06); halos[0].rotation.set(a * .6, a * .3, 0); halos[1].rotation.set(-a * .4, a * .5, a * .2); crown.rotation.z = a * .2; wings.forEach((w, i) => { w.rotation.z = i / 6 * TAU + TAU / 12 + Math.sin(a * 1.5 + i) * .08; w.position.z = Math.sin(a * 2 + i) * .2; }); } };
  }
  const BM = [B0, B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11, B12, B13, B14, B15, B16];

  // ================= realtime layer =================
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 4000), DIST = 1000;
  const keyL = new THREE.DirectionalLight(0xfff2e0, 3.2); keyL.position.set(6, 10, 12);
  const rimL = new THREE.DirectionalLight(0x22d3ee, 2.2); rimL.position.set(-8, 3, -10);
  const hemiL = new THREE.HemisphereLight(0x8aa0d0, 0x0a0c14, .55); scene.add(hemiL, keyL, rimL);
  const cvs = renderer.domElement; cvs.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:1'; cvBg.after(cvs);
  cvs.addEventListener('webglcontextlost', e => { e.preventDefault(); R.lost = true; R.on = false; cvs.style.visibility = 'hidden'; }); cvs.addEventListener('webglcontextrestored', () => { R.lost = false; });
  const rigs = {}, enemies = new Map(), tpl = {}, debs = [], tv = new THREE.Vector3(), bb = new THREE.Box3(), b2 = new THREE.Box3();
  let cw = 1000, ch = 600, view = 'off', lastTk = 0, rimKey = '';
  let BG3 = null, bgFail = null; try { BG3 = makeBG3D(renderer); } catch (e) { console.warn('3D backdrop unavailable', e); }

  // ================= cel shading: banded toon light + screen-space ink outlines =================
  const TOON = { mats: new Map(), om: null };
  function toonMat(m) {
    if (!m || !m.isMeshStandardMaterial) return m;
    let t = TOON.mats.get(m); if (t) return t;
    const met = m.metalness || 0, c = m.color.clone(); c.multiplyScalar(1 + met * .2); // metal leaned on reflections; toon needs the base colour lifted instead
    t = new THREE.MeshToonMaterial({ color: c, map: m.map, gradientMap: toonGrad(), emissive: m.emissive.clone(), emissiveIntensity: m.emissiveIntensity, emissiveMap: m.emissiveMap, transparent: m.transparent, opacity: m.opacity, side: m.side, vertexColors: m.vertexColors, depthWrite: m.depthWrite });
    TOON.mats.set(m, t); return t;
  }
  function outlineMat() {
    return TOON.om || (TOON.om = new THREE.ShaderMaterial({
      uniforms: { w: { value: 1.4 }, c: { value: new THREE.Color(0x04060c) } }, side: THREE.BackSide,
      vertexShader: 'attribute vec3 onrm; uniform float w; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vec3 n=normalize(normalMatrix*onrm); mv.xyz+=n*w; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 c; void main(){ gl_FragColor=vec4(c,1.); }'
    }));
  }
  function smoothNormals(geo) { // outlines follow averaged normals so hard-edged parts don't crack open at the corners
    if (geo.attributes.onrm) return; if (!geo.attributes.normal) geo.computeVertexNormals();
    const p = geo.attributes.position, n = geo.attributes.normal, acc = new Map(), keys = new Array(p.count), o = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const k = Math.round(p.getX(i) * 1e3) + ',' + Math.round(p.getY(i) * 1e3) + ',' + Math.round(p.getZ(i) * 1e3); keys[i] = k; const a = acc.get(k) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); acc.set(k, a); }
    for (let i = 0; i < p.count; i++) { const a = acc.get(keys[i]), l = Math.hypot(a[0], a[1], a[2]) || 1; o[i * 3] = a[0] / l; o[i * 3 + 1] = a[1] / l; o[i * 3 + 2] = a[2] / l; }
    geo.setAttribute('onrm', new THREE.BufferAttribute(o, 3));
  }
  function toonify(root) {
    if (!SET.toon) return root;
    const list = []; root.traverse(n => { if (n.isMesh && !n.userData.outline) list.push(n); });
    for (const m of list) {
      const src = m.material; if (Array.isArray(src)) continue;
      const glow = src && src.emissive && src.emissiveIntensity >= 1 && (src.color.r + src.color.g + src.color.b) < .3; // pure light sources stay clean
      m.material = toonMat(src);
      if (glow || !src || src.transparent || !m.geometry || m.geometry.attributes.position.count < 4) continue;
      try { smoothNormals(m.geometry); const o = new THREE.Mesh(m.geometry, outlineMat()); o.userData.outline = 1; o.raycast = () => { }; m.add(o); } catch (e) { }
    }
    return root;
  }
  function measure(root) { root.updateMatrixWorld(true); bb.makeEmpty(); root.traverse(o => { if (o.isMesh) { b2.setFromObject(o); bb.union(b2); } }); return bb.getSize(tv).x || 1; }
  function T(id) {
    const tk = id + (SET.toon ? ':t' : ''); let t = tpl[tk]; if (t) return t;
    const d = EN[id], a = d.m, g = ARCH[a[0]](a[1] || {});
    if (d.elite) g.add(mesh(TO(2.3, .06, 8, 48), E(hx(a[1].e || 0xffffff), 2), [0, 0, 0], [H, 0, 0]));
    toonify(g);
    const face = g.userData.face ? 1 : 0, inner = grp(g), root = grp(inner); root.rotation.x = .5; inner.rotation.y = face ? 0 : H;
    return tpl[tk] = { g, face, sc: d.w / measure(root) };
  }
  const badM = new Set();
  function buildEnemy(e) {
    const key = e.boss ? 'B' + e.bi : e.id; if (badM.has(key)) return { bad: true };
    const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner); root.rotation.x = .5;
    try {
      let m, sc, anim = null;
      if (e.boss) { const bdef = BOSSES[e.bi], b = BM[bdef && bdef.model !== undefined ? bdef.model : e.bi](); toonify(b.g); m = b.g; anim = b.anim; inner.add(m); inner.rotation.y = m.userData.face ? 0 : H; sc = e.w / measure(root); if (anim) anim(0); }
      else { const t = T(e.id); m = t.g.clone(true); addGlows(m); inner.add(m); inner.rotation.y = t.face ? 0 : H; sc = t.sc; }
      root.scale.setScalar(sc); scene.add(root);
      const sp = [], wb = [], pl = [];
      m.traverse(n => { const u = n.userData; if (u) { if (u.spin) sp.push(n); if (u.wob !== undefined) { u.by = n.position.y; wb.push(n); } if (u.pulse) pl.push(n); } });
      return { root, inner, anim, sc, py: e.y, spin: sp, wob: wb, pulse: pl, age: 0, ph: Math.random() * 6.28, boss: !!e.boss, face: !!(m && m.userData && m.userData.face) };
    } catch (err) { badM.add(key); R.lastErr = String(err && err.message || err); console.warn('3D model failed, using 2D sprite for', key, err); try { scene.remove(root); } catch (x) { } return { bad: true }; }
  }
  // ---- bestiary model viewer ----
  let MV = null, TH = null; const THC = {};
  function buildView(spec) {
    if (MV) { scene.remove(MV.hold); if (MV.boss) disposeTree(MV.hold); MV = null; }
    if (!spec) return;
    let m, anim = null, face = 0;
    if (spec.boss !== undefined) { const b = BM[spec.boss](); toonify(b.g); m = b.g; anim = b.anim; face = m.userData.face ? 1 : 0; if (anim) anim(0); }
    else { const t = T(spec.id); m = t.g.clone(true); addGlows(m); face = t.face; }
    m.updateMatrixWorld(true); bb.makeEmpty(); m.traverse(o => { if (o.isMesh && !o.userData.outline) { b2.setFromObject(o); bb.union(b2); } });
    const sz = bb.getSize(new THREE.Vector3()), size = Math.max(sz.x, sz.y, sz.z) || 1, c = bb.getCenter(new THREE.Vector3()); m.position.sub(c);
    const hold = new THREE.Group(), spin = new THREE.Group(), inner = new THREE.Group(); inner.add(m); inner.rotation.y = face ? 0 : H; spin.add(inner); hold.add(spin); scene.add(hold);
    const sp = [], wb = [], pl = []; m.traverse(n => { const u = n.userData; if (u) { if (u.spin) sp.push(n); if (u.wob !== undefined) { u.by = n.position.y; wb.push(n); } if (u.pulse) pl.push(n); } });
    MV = { hold, spin, anim, size, sp, wb, pl, yaw: -.5, pitch: .3, zoom: 1, auto: true, boss: spec.boss !== undefined, ay: 0 };
  }
  // ---- bloom: copy the finished frame, keep only the bright parts, blur them small, add them back on top ----
  let BL = null;
  function blInit() {
    BL = { tex: null, a: null, b: null, w: 0, h: 0, scn: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad: null, v0: new THREE.Vector2(), size: new THREE.Vector2() };
    const blVS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
    BL.bright = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: blVS, fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb; float l=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c*smoothstep(.8,1.,l)*smoothstep(.12,.45,max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b))+.2),1.); }', depthTest: false, depthWrite: false });
    BL.blur = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: blVS, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb*.227; c+=texture2D(t,vUv+d*1.38).rgb*.316; c+=texture2D(t,vUv-d*1.38).rgb*.316; c+=texture2D(t,vUv+d*3.23).rgb*.07; c+=texture2D(t,vUv-d*3.23).rgb*.07; gl_FragColor=vec4(c,1.); }' });
    BL.comp = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, k: { value: .85 } }, vertexShader: blVS, depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
    fragmentShader: 'uniform sampler2D t; uniform float k; varying vec2 vUv; void main(){ vec3 b=texture2D(t,vUv).rgb*k; gl_FragColor=vec4(b,max(b.r,max(b.g,b.b))); }' });
    BL.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), BL.bright); BL.quad.frustumCulled = false; BL.scn.add(BL.quad);
  }
  function blPass(mat, src, dst) { BL.quad.material = mat; mat.uniforms.t.value = src; renderer.setRenderTarget(dst); renderer.render(BL.scn, BL.cam); }
  function bloom() {
    if (!BL) blInit();
    renderer.getDrawingBufferSize(BL.size); const w = BL.size.x | 0, h = BL.size.y | 0; if (!w || !h) return;
    if (w !== BL.w || h !== BL.h) { if (BL.tex) { BL.tex.dispose(); BL.a.dispose(); BL.b.dispose(); } BL.w = w; BL.h = h;
      BL.tex = new THREE.DataTexture(new Uint8Array(w * h * 4), w, h, THREE.RGBAFormat); BL.tex.minFilter = BL.tex.magFilter = THREE.LinearFilter; BL.tex.generateMipmaps = false; BL.tex.needsUpdate = true;
      const o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }; BL.a = new THREE.WebGLRenderTarget(Math.max(1, w >> 2), Math.max(1, h >> 2), o); BL.b = BL.a.clone(); }
    renderer.copyFramebufferToTexture(BL.v0, BL.tex);
    const ac = renderer.autoClear; renderer.autoClear = true;
    blPass(BL.bright, BL.tex, BL.a);
    for (let i = 0; i < 2; i++) { BL.blur.uniforms.d.value.set(1 / BL.a.width, 0); blPass(BL.blur, BL.a.texture, BL.b); BL.blur.uniforms.d.value.set(0, 1 / BL.a.height); blPass(BL.blur, BL.b.texture, BL.a); }
    renderer.autoClear = false; BL.comp.uniforms.k.value = view === 'play' ? .7 : .5; blPass(BL.comp, BL.a.texture, null); renderer.autoClear = ac;
  }
  function disposeTree(o) { o.traverse(n => { if (n.geometry && n.geometry.dispose) n.geometry.dispose(); }); }
  function rigFor(id, cfg) {
    const key = JSON.stringify(cfg) + (SET.toon ? 't' : ''); let r = rigs[id];
    if (r && r.key === key) return r;
    if (r && r.rig) scene.remove(r.rig);
    try {
      const s = buildShip(cfg); toonify(s.g); const rig = new THREE.Group(), ship = new THREE.Group(); ship.add(s.g); ship.rotation.y = -H; rig.add(ship); rig.rotation.x = .55; scene.add(rig);
      return rigs[id] = { key, s, rig, ship, torn: 0, py: null, k: s.k };
    } catch (err) { R.lastErr = String(err && err.message || err); console.warn('3D ship failed, using 2D ship', err); return rigs[id] = { key, bad: true }; }
  }
  function flicker(r, tk, thr) {
    r.s.flames.forEach((f, i) => { const k = (1 + Math.sin(tk * .7 + i * 2) * .12 + Math.random() * .08) * (1 + (thr || 0) * .35); if (f.isSprite) f.scale.setScalar(1.5 * k); else f.scale.set(1, k, 1); });
    r.s.light.intensity = 1.5 + Math.random() * .6 + (thr || 0) * .5;
  }

  // ---- debris: chips + torn-off ship parts ----
  const shardGeo = [new THREE.TetrahedronGeometry(1), BX(1.4, .4, .9), OC(.8)], shardMat = {};
  const smat = c => { const k = c + (SET.toon ? 't' : ''); return shardMat[k] || (shardMat[k] = SET.toon ? toonMat(M(c, .8, .35)) : M(c, .8, .35)); };
  // fireballs, smoke and shockwave rings layered on top of the flying chips
  const FX = [], ringG = new THREE.RingGeometry(.8, 1, 48), smokeM = new THREE.SpriteMaterial({ map: glowTex, color: 0x1f2937, transparent: true, opacity: .6, depthWrite: false });
  function fxBurst(x, y, n, col) {
    if (FX.length > 60) return; const px = x - cw / 2, py = ch / 2 - y, s = 10 + n * 4.5;
    const fb = sprite(0xffd28a, s * 1.2, px, py, 30); fb.material = fb.material.clone(); fb.material.color.setHex(0xfff1c4); scene.add(fb); FX.push({ o: fb, k: 'fire', l: 26, l0: 26, s0: s * 1.2, col });
    const fb2 = sprite(col, s * 2, px, py, 20); fb2.material = fb2.material.clone(); scene.add(fb2); FX.push({ o: fb2, k: 'fire', l: 34, l0: 34, s0: s * 2 });
    if (n >= 6) { const rg = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); rg.position.set(px, py, 25); scene.add(rg); FX.push({ o: rg, k: 'ring', l: 28, l0: 28, s0: s * .6 }); }
    for (let i = 0; i < Math.min(5, 1 + (n / 4 | 0)); i++) { const sm = new THREE.Sprite(smokeM.clone()); sm.position.set(px + (Math.random() - .5) * s * .6, py + (Math.random() - .5) * s * .4, 10); sm.scale.setScalar(s * .6); scene.add(sm); FX.push({ o: sm, k: 'smoke', l: 70 + Math.random() * 30, l0: 100, s0: s * .6, vy: .4 + Math.random() * .5 }); }
  }
  function boom(x, y, n, col, spd, size) {
    try { fxBurst(x, y, n, col); } catch (e) { }
    for (let i = 0; i < n; i++) {
      if (debs.length > 170) break;
      const m = mesh(shardGeo[i % 3], smat(col), [x - cw / 2, ch / 2 - y, rnd(-8, 8)]), sc = (size || 8) * (.5 + Math.random()), a = Math.random() * TAU, v = (spd || 6) * (.3 + Math.random());
      m.scale.setScalar(sc); m.rotation.set(Math.random() * 6, Math.random() * 6, 0); scene.add(m);
      debs.push({ o: m, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: (Math.random() - .5) * v, rx: (Math.random() - .5) * .4, ry: (Math.random() - .5) * .4, s0: sc, l: 36 + Math.random() * 34 });
    }
  }
  const TORN = ['fin', 'wingR', 'engL', 'wingL', 'engR', 'canopy'], TORN_AT = [.86, .68, .52, .38, .25, .12];
  function tear(r, name, fast) {
    const part = r.s.P[name]; if (!part || !part.visible) return;
    part.visible = false;
    const root = new THREE.Group(), yaw = new THREE.Group(), piv = new THREE.Group(), c = part.clone(true), cc = part.userData.c || [0, 0, 0];
    c.visible = true; c.position.set(-cc[0], -cc[1], -cc[2]); piv.position.set(cc[0], cc[1], cc[2]); piv.add(c); yaw.rotation.y = -H; yaw.add(piv); root.add(yaw);
    root.position.copy(r.rig.position); root.rotation.copy(r.rig.rotation); root.scale.copy(r.rig.scale); scene.add(root);
    const side = cc[0] > 0.2 ? 1 : cc[0] < -0.2 ? -1 : (Math.random() < .5 ? 1 : -1), k = fast ? 1.5 : 1;
    debs.push({ o: root, piv, vx: rnd(-1, 3.5) * k, vy: rnd(2, 6) * (Math.random() < .5 ? 1 : -1) * k, vz: side * rnd(2, 5) * k, rx: rnd(-.25, .25), ry: rnd(-.25, .25), rz: rnd(-.3, .3), s0: r.rig.scale.x, l: 90 });
  }
  function repairRig(r) { r.torn = 0; for (const k in r.s.P) r.s.P[k].visible = true; }

  const R = {
    on: false, hy: 0, lastErr: null, bgActive: false, get bg() { return BG3; }, get __scene() { return scene; }, get __renderer() { return renderer; },
    resize(iw, ih, lh, pr) { if (BG3) BG3.resize(iw, ih); camera.fov = 2 * Math.atan(lh / 2 / DIST) * 180 / PI; camera.aspect = iw / ih; camera.updateProjectionMatrix(); renderer.setPixelRatio(pr); renderer.setSize(iw, ih); ch = lh; cw = lh * iw / ih; },
    setQuality(pr) { renderer.setPixelRatio(pr); },
    setView(v) { view = v; },
    spin(d) { R.hy += d; },
    boom,
    hit(p, sev) {
      const r = rigs['p' + p.id]; if (!r || r.bad) { boom(p.x, p.y, sev ? 9 : 4, hx(p.cfg.paint), 7, 7); return; }
      boom(p.x, p.y, sev ? 9 : 4, hx(p.cfg.paint), 7, 7);
      const f = p.hp / p.mhp; let n = 0;
      while (r.torn < TORN.length && f < TORN_AT[r.torn] && n++ < 2) tear(r, TORN[r.torn++]);
    },
    die(p) { const r = rigs['p' + p.id]; if (!r || r.bad) { boom(p.x, p.y, 26, hx(p.cfg.paint), 10, 9); return; } for (const k of TORN) tear(r, k, true); boom(p.x, p.y, 26, hx(p.cfg.paint), 10, 9); },
    repair(p) { const r = rigs['p' + p.id]; if (r && !r.bad) repairRig(r); },
    has3D(e) { const o = enemies.get(e); return !!(o && !o.bad); },
    hasShip(p) { const r = rigs['p' + p.id]; return !!(r && !r.bad); },
    showModel(spec) { try { buildView(spec); } catch (e) { R.lastErr = String(e && e.message || e); console.warn('model viewer failed', e); MV = null; } return !!MV; },
    modelDrag(dx, dy) { if (!MV) return; MV.yaw += dx * .012; MV.pitch = clamp(MV.pitch + dy * .01, -1.4, 1.4); MV.auto = false; },
    modelZoom(k) { if (MV) MV.zoom = clamp(MV.zoom * k, .45, 2.8); },
    modelTurn(a) { if (MV) { MV.yaw += a; MV.auto = false; } },
    modelReset() { if (MV) { MV.yaw = -.5; MV.pitch = .3; MV.zoom = 1; MV.auto = true; MV.ay = 0; } },
    modelAuto() { if (MV) MV.auto = !MV.auto; return MV && MV.auto; },
    thumb(id) { // cel-shaded snapshot of an enemy model, cached as an image URL
      const key = id + (SET.toon ? ':t' : ''); if (THC[key] !== undefined) return THC[key];
      try {
        if (!TH) { const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); r.setPixelRatio(1); r.setSize(160, 120); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15; r.setClearColor(0, 0);
          const sc = new THREE.Scene(), k = new THREE.DirectionalLight(0xfff2e0, 1), rl = new THREE.DirectionalLight(0x22d3ee, 1), h = new THREE.HemisphereLight(0x8aa0d0, 0x0a0c14, .5); k.position.set(6, 10, 12); rl.position.set(-8, 3, -10); sc.add(k, rl, h); if (scene.environment) sc.environment = scene.environment;
          TH = { r, sc, cam: new THREE.PerspectiveCamera(30, 4 / 3, .01, 1000), k, rl, h }; }
        const toon = !!SET.toon; TH.k.intensity = toon ? .72 : 3.2; TH.rl.intensity = toon ? 1.05 : 2.2; TH.h.intensity = toon ? .26 : .55;
        const t = T(id), m = t.g.clone(true); addGlows(m); const g = new THREE.Group(), inner = new THREE.Group(); inner.add(m); inner.rotation.y = t.face ? 0 : H; g.add(inner); g.rotation.set(.42, -.55, 0);
        g.updateMatrixWorld(true); bb.makeEmpty(); g.traverse(o => { if (o.isMesh && !o.userData.outline) { b2.setFromObject(o); bb.union(b2); } });
        const c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3()).length() || 1; g.position.sub(c); TH.sc.add(g);
        TH.cam.position.set(0, 0, s * 1.75); TH.cam.lookAt(0, 0, 0); TH.cam.updateProjectionMatrix();
        const ow = TOON.om ? TOON.om.uniforms.w.value : 0; if (TOON.om) TOON.om.uniforms.w.value = s * .011;
        TH.r.render(TH.sc, TH.cam); if (TOON.om) TOON.om.uniforms.w.value = ow;
        const url = TH.r.domElement.toDataURL(); TH.sc.remove(g); return THC[key] = url;
      } catch (e) { console.warn('thumb failed', id, e); return THC[key] = null; }
    },
    reset() { enemies.forEach((o, e) => { if (o.bad) return; scene.remove(o.root); if (e.boss) disposeTree(o.root); }); enemies.clear(); while (debs.length) scene.remove(debs.pop().o); for (const k in rigs) if (!rigs[k].bad) repairRig(rigs[k]); },
    tick() {
      for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i], u = 1 - f.l / f.l0; f.l--;
        if (f.k === 'fire') { f.o.scale.setScalar(f.s0 * (.6 + u * 1.1)); f.o.material.opacity = Math.max(0, 1 - u * 1.1); }
        else if (f.k === 'ring') { f.o.scale.setScalar(f.s0 * (1 + u * 5)); f.o.material.opacity = .8 * (1 - u); }
        else { f.o.position.y += f.vy; f.o.scale.setScalar(f.s0 * (1 + u * 2.2)); f.o.material.opacity = .55 * Math.min(1, f.l / 40); }
        if (f.l <= 0) { scene.remove(f.o); if (f.o.material) f.o.material.dispose(); FX.splice(i, 1); } }
      for (let i = debs.length - 1; i >= 0; i--) {
        const d = debs[i]; d.o.position.x += d.vx; d.o.position.y += d.vy; d.o.position.z += d.vz; d.vy -= .05; d.vx *= .996;
        const q = d.piv || d.o; q.rotation.x += d.rx; q.rotation.y += d.ry; if (d.rz) q.rotation.z += d.rz;
        d.l--; d.o.scale.setScalar(d.s0 * (d.l < 24 ? Math.max(.01, d.l / 24) : 1));
        if (d.l <= 0) { scene.remove(d.o); debs.splice(i, 1); }
      }
    },
    draw(Gs, Vw) {
      let flyOn = false; const on = R.on = !!SET.models && view !== 'off' && !R.lost; cvs.style.visibility = on ? 'visible' : 'hidden'; R.bgActive = false;
      if (TOON.om) TOON.om.uniforms.w.value = view === 'play' ? 2 : 3.2;
      if (SET.toon) { keyL.intensity = .72; rimL.intensity = 1.05; hemiL.intensity = .26; } else { keyL.intensity = 3.2; rimL.intensity = 2.2; hemiL.intensity = .55; }
      if (!on) return;
      const W = Vw.W, Hh = Vw.H, tk = Gs.t, df = Math.min(4, Math.max(0, tk - lastTk)); lastTk = tk; cw = W; ch = Hh;
      for (const k in rigs) if (!rigs[k].bad) rigs[k].rig.visible = false; if (MV) MV.hold.visible = false;
      enemies.forEach(o => { if (!o.bad) o.root.visible = false; });
      if (view === 'play') {
        for (const p of Gs.players) {
          const r = rigFor('p' + p.id, p.cfg); if (r.bad) continue; const dy = r.py === null ? 0 : p.y - r.py; r.py = p.y; const dxx = r.px === undefined ? 0 : p.x - r.px; r.px = p.x; r.sp = (r.sp || 0) + (Math.min(1, Math.hypot(dxx, dy) / 7) - (r.sp || 0)) * .15;
          r.rig.visible = p.alive && !(p.inv > 0 && (tk >> 2) & 1 && p.blink);
          r.rig.position.set(p.x - W / 2, Hh / 2 - p.y, 0); r.rig.rotation.z += (clamp(-dy * .05, -.5, .5) - r.rig.rotation.z) * .2; r.rig.scale.setScalar(21 * r.k);
          r.s.body.rotation.z = Math.sin(tk * .05 + p.id) * .06; flicker(r, tk, Math.abs(dy) * .12 + r.sp * 2.2);
        }
        const seen = new Set();
        for (const e of Gs.ent.en) {
          let o = enemies.get(e); if (!o) { o = buildEnemy(e); enemies.set(e, o); } seen.add(e); if (o.bad) continue;
          o.root.visible = !e.hide; o.root.position.set(e.x - W / 2, Hh / 2 - e.y, 0);
          const d = e.y - o.py; o.py = e.y; o.root.rotation.z += (clamp(d * .06, -.4, .4) - o.root.rotation.z) * .15;
          o.age += df; const ag = o.boss ? Math.min(1, o.age / 150) : Math.min(1, o.age / 18), eo = 1 - Math.pow(1 - ag, 3), pop = o.boss ? 1 + (1 - eo) * .9 : .3 + .7 * eo + Math.sin(ag * Math.PI) * .12; // spawn-in: enemies pop, bosses swoop in past the camera
          if (o.boss && ag < 1) { const w = 1 - eo; o.root.position.x += w * W * .45; o.root.position.y -= w * Hh * .25; o.root.position.z = w * 380; o.inner.rotation.z = w * 1.2; } else if (o.boss) { o.root.position.z = 0; o.inner.rotation.z = 0; }
          o.root.scale.setScalar(o.sc * pop * (e.hf > 0 ? 1.08 : 1));
          if (!o.face) { o.root.rotation.y = Math.sin(tk * .035 + o.ph) * (o.boss ? .1 : .22); if (ag < 1) o.root.rotation.x = .5 + (1 - eo) * (o.boss ? .5 : .9); else o.root.rotation.x = .5; } // idle sway + tumble-in
          if (!o.boss) o.root.position.y += Math.sin(tk * .06 + o.ph) * 1.6;
          for (const n of o.spin) { const s = n.userData.spin; n.rotation.x += s[0] * df; n.rotation.y += s[1] * df; n.rotation.z += s[2] * df; }
          for (const n of o.wob) n.position.y = n.userData.by + Math.sin(tk * .12 + n.userData.wob) * .32;
          for (const s of o.pulse) s.scale.setScalar(s.userData.pulse * (1 + Math.sin(tk * .2 + s.userData.pulse) * .08));
          if (o.anim && tk % 2 === 0) o.anim(tk * .05);
        }
        enemies.forEach((o, e) => { if (!seen.has(e)) { if (!o.bad) { scene.remove(o.root); if (e.boss) disposeTree(o.root); } enemies.delete(e); } });
        const ac = hx(WORLDS[Gs.world] ? WORLDS[Gs.world].ac : '#22d3ee'), rk = 'w' + Gs.world; if (rk !== rimKey) { rimKey = rk; rimL.color.setHex(ac); }
      } else if (view === 'model') { // bestiary viewer: the model floats over the right-hand panel
        if (MV) {
          const el = document.getElementById('mdrag'), cr = cvs.getBoundingClientRect(); let cx = W * .7, cy = Hh * .5, tgt = Hh * .55;
          if (el && cr.width) { const r = el.getBoundingClientRect(), kx = W / cr.width, ky = Hh / cr.height; cx = (r.left + r.width / 2 - cr.left) * kx; cy = (r.top + r.height * .46 - cr.top) * ky; tgt = Math.min(r.width * kx, r.height * ky) * .6; }
          MV.hold.visible = true; MV.hold.position.set(cx - W / 2, Hh / 2 - cy, 0); MV.hold.scale.setScalar(tgt / MV.size * MV.zoom);
          if (MV.auto) MV.ay += .008 * df; MV.spin.rotation.set(MV.pitch, MV.yaw + MV.ay, 0);
          for (const n of MV.sp) { const q = n.userData.spin; n.rotation.x += q[0] * df; n.rotation.y += q[1] * df; n.rotation.z += q[2] * df; }
          for (const n of MV.wb) n.position.y = n.userData.by + Math.sin(tk * .12 + n.userData.wob) * .32;
          for (const n of MV.pl) n.scale.setScalar(n.userData.pulse * (1 + Math.sin(tk * .2 + n.userData.pulse) * .08));
          if (MV.anim && tk % 2 === 0) MV.anim(tk * .05);
          const rk = 'mv'; if (rk !== rimKey) { rimKey = rk; rimL.color.setHex(0x22d3ee); }
        }
      } else if (view === 'menu' && typeof MENU3 !== 'undefined' && MENU3.fly()) { // flying main menu: your ship cruises through your latest world
        const M = MENU3, cfg = SAVE.pl[0].cfg, r = rigFor('show', cfg); M.tick(df); flyOn = !r.bad;
        if (!r.bad) {
          const t = M.t, narrow = W < 760, u = M.ease(), bx = narrow ? W * .5 : W * .68, by = narrow ? Hh * .3 : Hh * .5;
          let x = bx + Math.sin(t * .009) * W * .045, y = by + Math.sin(t * .015) * Hh * .07 + Math.sin(t * .043) * 5;
          const vy = Math.cos(t * .015) * .015 * Hh * .07, w = 1 - u;
          x = x - w * W * .75; y = y + w * Hh * .45; M.sx = x; M.sy = y;
          const sc = (narrow ? Hh * .075 : Hh * .1) * r.k;
          r.rig.visible = !M.hide; r.rig.position.set(x - W / 2, Hh / 2 - y, w * 720); r.rig.scale.setScalar(sc * (1 + w * .4));
          r.ship.rotation.y = -H + .32 + Math.sin(t * .007) * .12 - w * .5;
          r.rig.rotation.x = .55 + M.roll() + w * Math.PI * 2; r.rig.rotation.z = clamp(-vy * .35, -.35, .35) + w * .3;
          r.s.body.rotation.z = Math.sin(t * .05) * .05; flicker(r, tk, 2.4 + (M.warp > 0 ? 3 : 0) + w * 3);
          const rk = 's' + cfg.accent; if (rk !== rimKey) { rimKey = rk; rimL.color.setHex(hx(cfg.accent)); }
        }
      } else { // menu / hangar showcase ship
        const cfg = Gs.showCfg || SAVE.pl[0].cfg, r = rigFor('show', cfg), hang = view === 'hangar', narrow = W < 760; if (r.bad) { renderer.render(scene, camera); return; }
        R.hy += .006 * df; const yaw = hang ? R.hy : Math.sin(tk * .012) * .7;
        r.rig.visible = true; r.ship.rotation.y = -H + yaw; r.rig.rotation.x = hang ? .42 : .55;
        const sc = (hang ? (narrow ? Hh * .1 : Hh * .19) : (narrow ? Hh * .1 : Hh * .15)) * r.k, x = hang ? (narrow ? W * .5 : W * .76) : (narrow ? W * .5 : W * .74), y = hang ? (narrow ? Hh * .3 : Hh * .46) : (narrow ? Hh * .26 : Hh * .5) + Math.sin(tk * .03) * 8;
        r.rig.position.set(x - W / 2, Hh / 2 - y, 0); r.rig.scale.setScalar(sc); r.rig.rotation.z = Math.sin(tk * .02) * .08; flicker(r, tk, .5);
        const rk = 's' + cfg.accent; if (rk !== rimKey) { rimKey = rk; rimL.color.setHex(hx(cfg.accent)); }
      }
      camera.position.set(-(Gs.sx || 0), Gs.sy || 0, DIST);
      let bgOk = false;
      if (BG3 && flyOn && SET.bg3d !== false) { const M = MENU3, mx = G.mapX, fk = 'f' + M.w; if (fk !== bgFail) { G.mapX = null; renderer.autoClear = false; renderer.clear(); try { BG3.draw({ world: M.w, run: M, players: [{ alive: true, x: M.sx || Vw.W * .6, y: M.sy || Vw.H * .5 }], scrollMul: M.warp > 0 ? 6 : 1.7, sx: 0, sy: 0 }, W, Hh, df); bgOk = true; } catch (e) { console.warn('menu backdrop failed', e); bgFail = fk; } G.mapX = mx; renderer.clearDepth(); } }
      const bgKey = G.mapX ? 'm:' + G.mapX.k : Gs.world | 0;
      if (BG3 && view === 'play' && SET.bg3d !== false && bgKey !== bgFail) { // 3D world backdrop first, then the ships on top with a fresh depth buffer
        renderer.autoClear = false; renderer.clear();
        try { BG3.draw(Gs, W, Hh, df); bgOk = true; } catch (e) { console.warn('3D backdrop failed for ' + bgKey + ', using 2D there', e); bgFail = bgKey; }
        renderer.clearDepth();
      }
      renderer.render(scene, camera); renderer.autoClear = true; R.bgActive = bgOk;
      if (SET.bloom !== false) { try { bloom(); } catch (e) { console.warn('bloom off', e); SET.bloom = false; } }
    }
  };
  for (const k of ['boom', 'hit', 'die', 'repair', 'reset', 'tick', 'setView', 'spin', 'resize', 'setQuality']) { // the sim must never die because of a 3D hiccup
    const f = R[k]; R[k] = (...a) => { try { return f.apply(R, a); } catch (e) { R.lastErr = String(e && e.message || e); console.warn('3D ' + k + ' failed', e); } };
  }
  return R;
}

// ================= 3D BACKDROPS: every world is fought in orbit around its own celestial body =================
// A separate scene + camera rendered behind the ships. The camera slowly orbits the world's planet / black hole / core
// while star, nebula, dust and debris layers sit at different depths, so everything parallaxes against everything else.
// Colors are authored in sRGB; custom shaders output them untouched, built-in materials get linear-converted colors.

// ---- per-world look ----
// p: body type, r: body radius, d: camera orbit distance, h: camera height, nx/ny: where the body sits on screen (-1..1),
// sun: direction toward the sun, atm: atmosphere glow, deb: debris belt, xtra: special set pieces
const BG3D_W = [
  { arena: 'city', seed: 11 },
  { arena: 'jungle', seed: 23 },
  { arena: 'desert', seed: 37 },
  { p: 'gas', seed: 41, r: 175, d: 520, h: 40, nx: .48, ny: -.56, atm: '#c084fc', ramp: [[0, '#1e0a3c'], [.3, '#581c87'], [.55, '#a21caf'], [.75, '#c084fc'], [1, '#f5d0fe']], bands: 11, warp: .9, eye: { x: .3, y: .56, s: .085 }, deb: null, neb: 1.6, dust: '#e9d5ff' },
  { p: 'bh', seed: 53, r: 44, d: 560, h: 104, nx: .56, ny: .3, deb: { k: 'rock', n: 26, c: '#1c1917', s: [3, 9] }, dust: '#fecaca', neb: .7 },
  { arena: 'ice', seed: 67 },
  { arena: 'foundry', seed: 71 },
  { arena: 'deep', seed: 83 },
  { arena: 'cyber', seed: 97 },
  { arena: 'clock', seed: 101 },
  { p: 'terra', seed: 113, r: 150, d: 547, h: 38, nx: .56, ny: -.7, atm: '#93c5fd', sea: ['#0f172a', '#1e3a8a', '#3b82f6'], land: ['#334155', '#475569', '#94a3b8', '#e2e8f0'], seaLv: .5, ice: .82, clouds: .45, lights: '#f8fafc', xtra: 'station', deb: { k: 'hull', n: 24, c: '#475569', s: [3, 9] }, dust: '#cbd5e1' },
  { arena: 'islands', seed: 127 },
  { arena: 'storm', seed: 131 },
  { p: 'rock', seed: 139, r: 145, d: 535, h: 30, nx: .56, ny: -.7, atm: '#99f6e4', ramp: [[0, '#0c0a09'], [.4, '#292524'], [.7, '#57534e'], [1, '#a8a29e']], craters: 34, xtra: 'graves', deb: { k: 'hull', n: 22, c: '#3f3f46', s: [3, 10] }, dust: '#99f6e4' },
  { arena: 'sanctum', seed: 151 },
  { arena: 'glitchcore', seed: 301 },
  { p: 'gas', seed: 163, r: 190, d: 520, h: 40, nx: .5, ny: -.5, atm: '#fde047', ramp: [[0, '#451a03'], [.3, '#b45309'], [.55, '#f59e0b'], [.75, '#fde047'], [1, '#fffbeb']], bands: 9, warp: .7, eye: { x: .64, y: .4, s: .07 }, deb: { k: 'rock', n: 18, c: '#fbbf24', s: [2, 6] }, neb: 1.2, dust: '#fef3c7' }
];

let TOON_GRAD = null;
function toonGrad() { // three hard light bands
  if (!TOON_GRAD) { const d = new Uint8Array([64, 64, 64, 255, 150, 150, 150, 255, 255, 255, 255, 255]); TOON_GRAD = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); TOON_GRAD.minFilter = TOON_GRAD.magFilter = THREE.NearestFilter; TOON_GRAD.generateMipmaps = false; TOON_GRAD.needsUpdate = true; }
  return TOON_GRAD;
}
function bgNoise(seed) {
  const rs = seeded(seed), P = new Uint8Array(512), Vv = new Float32Array(256), p = [];
  for (let i = 0; i < 256; i++) { p[i] = i; Vv[i] = rs(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(rs() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const n3 = (x, y, z) => {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), fx = x - X, fy = y - Y, fz = z - Z;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), xi = X & 255, yi = Y & 255, zi = Z & 255;
    const a = P[xi] + yi, aa = P[a] + zi, ab = P[a + 1] + zi, b = P[xi + 1] + yi, ba = P[b] + zi, bb = P[b + 1] + zi;
    const x1 = Vv[P[aa]] + u * (Vv[P[ba]] - Vv[P[aa]]), x2 = Vv[P[ab]] + u * (Vv[P[bb]] - Vv[P[ab]]), x3 = Vv[P[aa + 1]] + u * (Vv[P[ba + 1]] - Vv[P[aa + 1]]), x4 = Vv[P[ab + 1]] + u * (Vv[P[bb + 1]] - Vv[P[ab + 1]]);
    const y1 = x1 + v * (x2 - x1), y2 = x3 + v * (x4 - x3); return y1 + w * (y2 - y1);
  };
  return { n3, fbm(x, y, z, o) { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * n3(x * f + i * 17.3, y * f, z * f); n += a; a *= .5; f *= 2.03; } return s / n; } };
}
function bgRamp(stops) {
  const S = stops.map(s => { const c = parseInt(s[1].slice(1), 16); return [s[0], c >> 16 & 255, c >> 8 & 255, c & 255]; }), o = [0, 0, 0];
  return t => { t = t < 0 ? 0 : t > 1 ? 1 : t; let i = 0; while (i < S.length - 2 && t > S[i + 1][0]) i++; const a = S[i], b = S[i + 1], k = (t - a[0]) / ((b[0] - a[0]) || 1); o[0] = a[1] + (b[1] - a[1]) * k; o[1] = a[2] + (b[2] - a[2]) * k; o[2] = a[3] + (b[3] - a[3]) * k; return o; };
}
const bgRGB = h => { const c = parseInt(h.slice(1), 16); return [c >> 16 & 255, c >> 8 & 255, c & 255]; };
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// equirectangular planet textures: colour map + emissive map (city lights, lava, bioluminescence, circuits)
function bgPlanetTex(C, W, H) {
  const N = bgNoise(C.seed), N2 = bgNoise(C.seed + 77), n = W * H, A = new Float32Array(n), B = new Float32Array(n);
  const sc = C.p === 'gas' ? 1.6 : 2.1;
  let amin = 9, amax = -9, bmin = 9, bmax = -9;
  for (let y = 0; y < H; y++) {
    const lat = (.5 - (y + .5) / H) * Math.PI, cl = Math.cos(lat), sy = Math.sin(lat);
    for (let x = 0; x < W; x++) {
      const lon = (x + .5) / W * 6.2832, px = cl * Math.cos(lon), pz = cl * Math.sin(lon), i = y * W + x;
      const wx = C.warp ? (N2.fbm(px * 1.3 + 3, sy * 1.3, pz * 1.3, 3) - .5) * C.warp * 2 : 0;
      const a = N.fbm(px * sc + wx, sy * sc + wx, pz * sc, 6), b = N2.fbm(px * sc * 3.1, sy * sc * 3.1, pz * sc * 3.1, 4);
      A[i] = a; B[i] = b; if (a < amin) amin = a; if (a > amax) amax = a; if (b < bmin) bmin = b; if (b > bmax) bmax = b;
    }
  }
  const mc = document.createElement('canvas'), ec = document.createElement('canvas'); mc.width = ec.width = W; mc.height = ec.height = H;
  const mg = mc.getContext('2d'), eg = ec.getContext('2d'), md = mg.createImageData(W, H), ed = eg.createImageData(W, H), M = md.data, E = ed.data;
  const ra = 1 / ((amax - amin) || 1), rb = 1 / ((bmax - bmin) || 1);
  const rmp = C.ramp ? bgRamp(C.ramp) : null, seaR = C.sea ? bgRamp([[0, C.sea[0]], [.7, C.sea[1]], [1, C.sea[2]]]) : null, landR = C.land ? bgRamp([[0, C.land[0]], [.4, C.land[1]], [.75, C.land[2]], [1, C.land[3]]]) : null;
  const L1 = C.lights ? bgRGB(C.lights) : null, CR = C.crack ? bgRGB(C.crack) : null, BI = C.bio ? bgRGB(C.bio) : null, LN = C.line ? bgRGB(C.line) : null;
  for (let y = 0; y < H; y++) {
    const lat = (.5 - (y + .5) / H) * Math.PI, al = Math.abs(lat) / (Math.PI / 2);
    for (let x = 0; x < W; x++) {
      const i = y * W + x, j = i * 4, a = (A[i] - amin) * ra, b = (B[i] - bmin) * rb; let c, er = 0, eg2 = 0, eb = 0;
      if (C.p === 'terra') {
        const sl = C.seaLv;
        if (a < sl) { c = seaR(Math.pow(a / sl, 1.6)); }
        else { c = landR((a - sl) / (1 - sl) * .8 + b * .2); if (L1 && b > .5 && a < sl + .22) { const hsh = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453, rn = hsh - Math.floor(hsh), k = (rn > .82 ? 1 : rn > .7 ? .35 : 0) * Math.min(1, (b - .5) * 4) * (al < .7 ? 1 : 0); er = L1[0] * k; eg2 = L1[1] * k; eb = L1[2] * k; } }
        const ice = sstep(C.ice - .06, C.ice + .02, al + (b - .5) * .18); if (ice > 0) { c = [c[0] + (240 - c[0]) * ice, c[1] + (246 - c[1]) * ice, c[2] + (250 - c[2]) * ice]; er *= 1 - ice; eg2 *= 1 - ice; eb *= 1 - ice; }
      } else if (C.p === 'gas') {
        const lat2 = (.5 - (y + .5) / H) * Math.PI, t = .5 + .5 * Math.sin(lat2 * C.bands + (a - .5) * 5 * (C.warp || .5)) * .8 + (b - .5) * .25;
        c = rmp(t); if (C.cracks) { const rr = 1 - Math.abs(2 * b - 1); if (rr > .94) { const k = (rr - .94) / .06 * .35; c = [c[0] * (1 - k) + 255 * k, c[1] * (1 - k) + 255 * k, c[2] * (1 - k) + 255 * k]; } }
      } else if (C.p === 'rock') {
        c = rmp(a * .78 + b * .22);
        if (C.caps) { const ice = sstep(.78, .86, al + (b - .5) * .2); if (ice > 0) { const q = bgRGB(C.caps); c = [c[0] + (q[0] - c[0]) * ice, c[1] + (q[1] - c[1]) * ice, c[2] + (q[2] - c[2]) * ice]; } }
      } else if (C.p === 'lava') {
        c = rmp(a * .7 + b * .3); const rr = 1 - Math.abs(2 * b - 1), k = sstep(.86, .97, rr), g2 = sstep(.6, .9, rr) * .25 + (a < .25 ? (.25 - a) * 2 : 0);
        const kk = Math.min(1, k + g2); c = [c[0] * (1 - k * .8), c[1] * (1 - k * .8), c[2] * (1 - k * .8)]; er = CR[0] * kk; eg2 = CR[1] * kk * (.6 + k * .4); eb = CR[2] * kk * .5;
      } else if (C.p === 'ocean') {
        c = rmp(a * .85 + b * .15); if (b > .8) { const k = Math.pow((b - .8) / .2, 2); er = BI[0] * k; eg2 = BI[1] * k; eb = BI[2] * k; }
      } else if (C.p === 'grid') {
        c = rmp(a); const lon = (x + .5) / W * 6.2832, fl = (lon / (6.2832 / 32)) % 1, fa = ((lat + 2) / (Math.PI / 16)) % 1;
        const line = Math.abs(fl - .5) > .44 || Math.abs(fa - .5) > .42 ? .75 : 0, blk = b > .76 ? .45 : 0, k = Math.max(line, blk);
        er = LN[0] * k; eg2 = LN[1] * k; eb = LN[2] * k;
      } else { // core
        c = rmp(a * .65 + b * .35); er = c[0] * .9; eg2 = c[1] * .9; eb = c[2] * .9;
      }
      M[j] = c[0]; M[j + 1] = c[1]; M[j + 2] = c[2]; M[j + 3] = 255; E[j] = er; E[j + 1] = eg2; E[j + 2] = eb; E[j + 3] = 255;
    }
  }
  mg.putImageData(md, 0, 0); eg.putImageData(ed, 0, 0);
  const rs = seeded(C.seed + 5);
  if (C.craters) for (let k = 0; k < C.craters; k++) { // squash with latitude so craters stay round on the sphere
    const y = H * (.18 + rs() * .64), x = rs() * W, lat = (.5 - y / H) * Math.PI, r = 2 + rs() * rs() * 14, rx = r / Math.max(.35, Math.cos(lat));
    mg.fillStyle = 'rgba(0,0,0,.28)'; mg.beginPath(); mg.ellipse(x, y, rx, r, 0, 0, 6.283); mg.fill();
    mg.strokeStyle = 'rgba(255,255,255,.14)'; mg.lineWidth = 1.2; mg.beginPath(); mg.ellipse(x - .6, y - .6, rx, r, 0, 3.4, 6.0); mg.stroke();
  }
  const spot = (o, eye) => { // big storm / the nebula world's eye
    const x = o.x * W, y = o.y * H, ry = o.s * H, rx = ry * 1.7;
    if (eye) {
      mg.fillStyle = 'rgba(245,243,255,.85)'; mg.beginPath(); mg.ellipse(x, y, rx, ry * .62, 0, 0, 6.283); mg.fill();
      const ig = mg.createRadialGradient(x, y, 0, x, y, ry * .6); ig.addColorStop(0, '#fdf4ff'); ig.addColorStop(.35, '#d946ef'); ig.addColorStop(.8, '#581c87'); ig.addColorStop(1, '#1e0a3c');
      mg.fillStyle = ig; mg.beginPath(); mg.arc(x, y, ry * .58, 0, 6.283); mg.fill(); mg.fillStyle = '#05000a'; mg.beginPath(); mg.ellipse(x, y, ry * .12, ry * .44, 0, 0, 6.283); mg.fill();
      const eg3 = eg.createRadialGradient(x, y, 0, x, y, ry * .6); eg3.addColorStop(0, 'rgba(240,171,252,.9)'); eg3.addColorStop(.6, 'rgba(192,38,211,.6)'); eg3.addColorStop(1, 'rgba(0,0,0,0)');
      eg.fillStyle = eg3; eg.beginPath(); eg.arc(x, y, ry * .6, 0, 6.283); eg.fill(); eg.fillStyle = '#000'; eg.beginPath(); eg.ellipse(x, y, ry * .12, ry * .44, 0, 0, 6.283); eg.fill();
    } else {
      for (let k = 6; k > 0; k--) { mg.fillStyle = k % 2 ? 'rgba(236,252,203,.22)' : 'rgba(38,64,15,.3)'; mg.beginPath(); mg.ellipse(x, y, rx * k / 6, ry * k / 6, 0, 0, 6.283); mg.fill(); }
      mg.strokeStyle = 'rgba(247,254,231,.35)'; mg.lineWidth = 2; for (let arm = 0; arm < 3; arm++) { mg.beginPath(); for (let s = 0; s < 40; s++) { const a = arm * 2.09 + s * .16, rr = s / 40; mg.lineTo(x + Math.cos(a) * rx * rr, y + Math.sin(a) * ry * rr); } mg.stroke(); }
    }
  };
  if (C.eye) spot(C.eye, true); if (C.storm) spot(C.storm, false);
  return { map: mc, emap: ec };
}
function bgCloudTex(C, W, H) {
  const N = bgNoise(C.seed + 300), N2 = bgNoise(C.seed + 301), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), d = g.createImageData(W, H), D = d.data, A = new Float32Array(W * H); let mn = 9, mx = -9;
  for (let y = 0; y < H; y++) {
    const lat = (.5 - (y + .5) / H) * Math.PI, cl = Math.cos(lat), sy = Math.sin(lat);
    for (let x = 0; x < W; x++) { const lon = (x + .5) / W * 6.2832, px = cl * Math.cos(lon), pz = cl * Math.sin(lon), w = (N2.fbm(px * 2, sy * 2, pz * 2, 3) - .5) * 1.6, v = N.fbm(px * 2.6 + w, sy * 5 + w, pz * 2.6, 6); A[y * W + x] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
  }
  for (let i = 0; i < W * H; i++) { const v = (A[i] - mn) / ((mx - mn) || 1), a = sstep(1 - C.clouds, 1 - C.clouds + .28, v); D[i * 4] = D[i * 4 + 1] = D[i * 4 + 2] = 255; D[i * 4 + 3] = a * 235; }
  g.putImageData(d, 0, 0); return c;
}

// planet textures are the slow part (~0.15-0.5s), so keep the last few and pre-build them while the player is on the map
const BGTEX = new Map();
function bgTexFor(wi) {
  let t = BGTEX.get(wi); if (t) { BGTEX.delete(wi); BGTEX.set(wi, t); return t; }
  const C = BG3D_W[wi] || BG3D_W[0]; t = C.p === 'bh' || C.arena ? {} : bgPlanetTex(C, 512, 256); if (C.clouds) t.cloud = bgCloudTex(C, 512, 256);
  BGTEX.set(wi, t); while (BGTEX.size > 4) BGTEX.delete(BGTEX.keys().next().value); return t;
}
function bgPrewarm(wi) { if (!window.THREE || !SET.models || SET.bg3d === false || BGTEX.has(wi)) return; setTimeout(() => { try { bgTexFor(wi); } catch (e) { } }, 60); }
function makeBG3D(renderer) {
  const T = THREE, scene = new T.Scene(), cam = new T.PerspectiveCamera(50, 16 / 9, 1, 12000);
  const lc = h => new T.Color(h).convertSRGBToLinear();
  const sunL = new T.DirectionalLight(0xfff4e0, 2.4), amb = new T.AmbientLight(0x8090b0, .32); scene.add(sunL, amb);
  const sunU = { value: new T.Vector3(-.75, .32, .58).normalize() }, timeU = { value: 0 }, sun0 = new T.Vector3(), yAx = new T.Vector3(0, 1, 0);
  const glowTex = new T.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.2, 'rgba(255,255,255,.5)'); gr.addColorStop(.5, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c; })());
  const VS = 'varying vec3 vN; varying vec3 vW; varying vec2 vUv; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }';
  const planetMat = (map, emap, atm, o) => new T.ShaderMaterial({
    uniforms: { toon: { value: SET.toon ? 1 : 0 }, map: { value: map }, emap: { value: emap }, sun: sunU, atm: { value: new T.Color(atm || '#000000') }, amb: { value: o.amb !== undefined ? o.amb : .06 }, eDay: { value: o.eDay || 0 }, eNight: { value: o.eNight !== undefined ? o.eNight : 1 }, pulse: { value: 1 }, alphaMode: { value: o.alpha ? 1 : 0 } },
    vertexShader: VS, transparent: !!o.alpha, depthWrite: !o.alpha,
    fragmentShader: 'uniform float toon; uniform sampler2D map; uniform sampler2D emap; uniform vec3 sun; uniform vec3 atm; uniform float amb; uniform float eDay; uniform float eNight; uniform float pulse; uniform float alphaMode; varying vec3 vN; varying vec3 vW; varying vec2 vUv;' +
      'void main(){ vec3 N=normalize(vN), V=normalize(cameraPosition-vW); float d=dot(N,sun); float l=max(d,0.); if(toon>.5){ l=l<.06?0.:l<.45?.42:1.; } vec4 t=texture2D(map,vUv);' +
      ' vec3 c=t.rgb*(vec3(1.,.97,.92)*pow(l,.8)*.9+amb); float rim=pow(1.-max(dot(N,V),0.),2.6); c+=atm*rim*smoothstep(-.3,.55,d)*1.1;' +
      ' vec3 e=texture2D(emap,vUv).rgb; c+=e*(eDay+eNight*(1.-smoothstep(-.22,.1,d)))*pulse;' +
      ' gl_FragColor=vec4(c, alphaMode>.5 ? t.a*(.18+.82*smoothstep(-.35,.25,d)) : 1.); }'
  });
  const haloMat = (atm, k) => new T.ShaderMaterial({
    uniforms: { sun: sunU, atm: { value: new T.Color(atm) }, k: { value: k || 1.6 } }, vertexShader: VS, side: T.BackSide, blending: T.AdditiveBlending, transparent: true, depthWrite: false,
    fragmentShader: 'uniform vec3 sun; uniform vec3 atm; uniform float k; varying vec3 vN; varying vec3 vW; varying vec2 vUv; void main(){ vec3 N=normalize(vN), V=normalize(cameraPosition-vW); float d=clamp(-dot(N,V),0.,1.); float lit=smoothstep(-.4,.5,dot(N,sun)); gl_FragColor=vec4(atm*pow(d,2.2)*k*(.18+lit),1.); }'
  });
  const diskMat = (cIn, cOut, ri, ro, k, beam) => new T.ShaderMaterial({ // accretion disk: hot inner edge, swirling bands, one side Doppler-brightened
    uniforms: { t: timeU, ci: { value: new T.Color(cIn) }, co: { value: new T.Color(cOut) }, ri: { value: ri }, ro: { value: ro }, k: { value: k }, beam: { value: beam || 0 } },
    vertexShader: 'varying vec2 vL; void main(){ vL=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float t; uniform vec3 ci; uniform vec3 co; uniform float ri; uniform float ro; uniform float k; uniform float beam; varying vec2 vL;' +
      'void main(){ float r=length(vL); float u=clamp((r-ri)/(ro-ri),0.,1.); float a=atan(vL.y,vL.x);' +
      ' float sw=a+u*3.2-t*.55; float s=.62+.16*sin(u*90.+sin(sw*3.)*2.)+.2*sin(sw*5.+u*11.)*sin(sw*2.-t*.4)+.1*sin(u*170.+sw*7.);' +
      ' float f=pow(1.-u,1.7)*smoothstep(0.,.05,u)*s; float dop=1.+beam*.6*sin(a+1.2);' +
      ' vec3 c=mix(ci,co,smoothstep(0.,.65,u))*f*k*dop; gl_FragColor=vec4(c,1.); }',
    blending: T.AdditiveBlending, transparent: true, depthWrite: false, side: T.DoubleSide
  });
  const ringMat = (tex, col, ri, ro, R) => new T.ShaderMaterial({
    uniforms: { map: { value: tex }, col: { value: new T.Color(col) }, ri: { value: ri }, ro: { value: ro }, R: { value: R }, sun: sunU },
    vertexShader: 'varying vec2 vL; varying vec3 vW; void main(){ vL=position.xy; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'uniform sampler2D map; uniform vec3 col; uniform float ri; uniform float ro; uniform float R; uniform vec3 sun; varying vec2 vL; varying vec3 vW;' +
      'void main(){ float u=(length(vL)-ri)/(ro-ri); vec4 b=texture2D(map,vec2(u,.5)); float along=dot(vW,sun); float off=length(vW-along*sun);' +
      ' float sh= along<0. ? smoothstep(R*.92,R*1.04,off) : 1.; vec3 c=col*b.rgb*(.18+.82*sh); gl_FragColor=vec4(c,b.a*(.3+.7*sh)); }',
    transparent: true, depthWrite: false, side: T.DoubleSide
  });
  const pointsMat = (atten, maxSz) => new T.ShaderMaterial({
    uniforms: { pr: { value: 1 }, t: timeU },
    vertexShader: 'attribute float sz; attribute vec3 col; varying vec3 vC; varying float vA; uniform float pr; uniform float t;' +
      'void main(){ vC=col; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; float tw=.72+.28*sin(t*1.7+position.x*.031+position.z*.017);' +
      (atten ? ' float z=-mv.z; gl_PointSize=min(' + maxSz.toFixed(1) + ', sz*pr*260./max(z,1.)); vA=(1.-smoothstep(260.,1400.,z))*smoothstep(8.,40.,z);' : ' gl_PointSize=sz*pr*tw; vA=1.;') + ' }',
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=1.-smoothstep(0.,.5,d); gl_FragColor=vec4(vC*a*a*vA,1.); }',
    blending: T.AdditiveBlending, transparent: true, depthWrite: false
  });
  const skyMat = (c0, c1, c2, band) => new T.ShaderMaterial({
    uniforms: { c0: { value: new T.Color(c0) }, c1: { value: new T.Color(c1) }, c2: { value: new T.Color(c2) }, band: { value: new T.Color(band) } },
    vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 band; varying vec3 vD;' +
      'void main(){ vec3 d=normalize(vD); float y=d.y; vec3 c=y>0.? mix(c0,c2,smoothstep(0.,.9,y)) : mix(c0,c1,smoothstep(0.,.9,-y));' +
      ' float b=exp(-pow(dot(d,normalize(vec3(.35,1.,-.25)))/.2,2.)); float cl=.55+.45*sin(d.x*9.+d.z*5.)*sin(d.y*7.-d.x*4.);' +
      ' c+=band*b*cl*.55; gl_FragColor=vec4(c*.62,1.); }',
    side: T.BackSide, depthWrite: false
  });
  const nebTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), rs = seeded(9); for (let i = 0; i < 46; i++) { const a = rs() * 6.283, d = rs() * 70, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d * .7, r = 22 + rs() * 60, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } return c; })();
  const nebT = new T.CanvasTexture(nebTex);

  scene.add(cam); const veil = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .3, depthTest: false, depthWrite: false })); veil.position.z = -2; veil.renderOrder = 999; cam.add(veil);
  let lastToon = null, S = 0, cur = null, curW = -1, ang = 0, lastRun = null, aspect = 16 / 9, par = { x: 0, y: 0 }, tt = 0, flashT = 0, flashSp = null, lastQ = -1;
  const DISPOSE = [];
  const track = o => { DISPOSE.push(o); return o; };
  const clear = () => { scene.fog = null; sunL.color.set(0xfff4e0); sunL.intensity = 2.4; amb.color.set(0x8090b0); amb.intensity = .32; while (scene.children.length > 3) scene.remove(scene.children[3]); DISPOSE.forEach(o => { try { o.dispose(); } catch (e) { } }); DISPOSE.length = 0; cur = null; };
  const tex = c => track(new T.CanvasTexture(c));

  function build(wi) {
    clear(); curW = wi;
    const MP = typeof wi === 'string' ? MAPS.find(m => 'm:' + m.k === wi) : null, C = MP ? { arena: MP.arena, seed: MP.seed } : BG3D_W[wi] || BG3D_W[0], W = MP ? WORLDS[0] : WORLDS[wi] || WORLDS[0], q = SET.back === 0 ? .45 : SET.back === 1 ? .75 : 1, rs = seeded(C.seed * 13 + 1), R = C.r;
    lastQ = SET.back; lastToon = !!SET.toon; const upd = []; cur = { C, upd };
    if (C.arena) { flashSp = null; cur.arena = buildArena(C.arena, { scene, track, lc, rs, q, sunL, amb, glowTex, cloudTex: nebT, timeU, seed: C.seed, pr: () => renderer.getPixelRatio() }); return; }
    // sun direction: toward the camera's left so the opening frame shows a lit crescent that sweeps as we orbit
    sun0.set(-.82, .34, .5).normalize(); sunU.value.copy(sun0); sunL.position.copy(sunU.value).multiplyScalar(1000); cur.sunSp = [];
    // sky dome follows the camera (never parallaxes) with a faint galactic band in the world's accent
    const sky = new T.Mesh(track(new T.SphereGeometry(9000, 32, 16)), track(skyMat(W.col[0], W.col[1], W.col[2], W.ac))); sky.renderOrder = -10; scene.add(sky); cur.sky = sky;
    // far stars
    const nS = Math.round(2600 * q), sp = new Float32Array(nS * 3), sz = new Float32Array(nS), sc = new Float32Array(nS * 3), tint = bgRGB(W.ac);
    for (let i = 0; i < nS; i++) {
      const u = rs() * 2 - 1, a = rs() * 6.283, s = Math.sqrt(1 - u * u), r = 7000; sp[i * 3] = Math.cos(a) * s * r; sp[i * 3 + 1] = u * r; sp[i * 3 + 2] = Math.sin(a) * s * r;
      const big = rs(); sz[i] = big > .985 ? 5 + rs() * 3 : big > .9 ? 2.6 + rs() * 1.4 : 1.2 + rs() * 1.2; const k = .45 + rs() * .55, tw = rs() < .25;
      sc[i * 3] = (tw ? tint[0] / 255 : 1) * k; sc[i * 3 + 1] = (tw ? tint[1] / 255 : .97) * k; sc[i * 3 + 2] = (tw ? tint[2] / 255 : .92 + rs() * .08) * k;
    }
    const sg = track(new T.BufferGeometry()); sg.setAttribute('position', new T.BufferAttribute(sp, 3)); sg.setAttribute('sz', new T.BufferAttribute(sz, 1)); sg.setAttribute('col', new T.BufferAttribute(sc, 3));
    const stars = new T.Points(sg, track(pointsMat(false))); stars.renderOrder = -9; scene.add(stars); cur.starM = stars.material;
    // nebula clouds (mid-far layer)
    const nN = Math.round((C.neb || .8) * 9 * q), nc = [W.ac, W.col[1], W.col[2], '#ffffff'];
    for (let i = 0; i < nN; i++) {
      const m = track(new T.SpriteMaterial({ map: nebT, color: lc(nc[i % 3]).multiplyScalar(.9), transparent: true, opacity: (.22 + rs() * .25) * Math.min(1.4, C.neb || 1), blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      const s = new T.Sprite(m), a = rs() * 6.283, el = (rs() - .5) * 1.1, d = 2600 + rs() * 2600; s.position.set(Math.cos(a) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(a) * Math.cos(el) * d); s.scale.setScalar(1500 + rs() * 2600); m.rotation = rs() * 6.28; s.renderOrder = -8; scene.add(s);
    }
    // the sun
    const sunPos = sunU.value.clone().multiplyScalar(6000), sunCol = C.p === 'bh' ? '#fecaca' : '#fff1d6';
    [[2600, .55], [700, 1]].forEach(([s, o]) => { const m = new T.Sprite(track(new T.SpriteMaterial({ map: glowTex, color: lc(sunCol), transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }))); m.position.copy(sunPos); m.scale.setScalar(s); m.renderOrder = -7; scene.add(m); cur.sunSp.push(m); });

    // ---- the celestial body ----
    const body = new T.Group(); scene.add(body); cur.body = body;
    if (C.p === 'bh') {
      body.add(new T.Mesh(track(new T.SphereGeometry(R, 48, 32)), track(new T.MeshBasicMaterial({ color: 0x000000 }))));
      const disk = new T.Mesh(track(new T.RingGeometry(R * 1.55, R * 5.4, 160, 4)), track(diskMat('#fff7ed', '#c2410c', R * 1.55, R * 5.4, 1.2, 1)));
      disk.rotation.x = -Math.PI / 2 + .12; body.add(disk); cur.disk = disk;
      // the lensed far side of the disk wraps over and under the hole, so draw a camera-facing ring around it
      const lens = new T.Mesh(track(new T.RingGeometry(R * 1.04, R * 2.3, 128, 3)), track(diskMat('#fff7ed', '#c2410c', R * 1.04, R * 2.1, 1.15, .6))); body.add(lens); cur.face = [lens];
      const photon = new T.Mesh(track(new T.RingGeometry(R * 1.0, R * 1.09, 128, 1)), track(new T.MeshBasicMaterial({ color: lc('#ffffff'), transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }))); body.add(photon); cur.face.push(photon);
      const glow = new T.Sprite(track(new T.SpriteMaterial({ map: glowTex, color: lc('#ea580c'), transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }))); glow.scale.setScalar(R * 9); glow.renderOrder = -1; body.add(glow);
    } else {
      const tx = bgTexFor(wi), mapT = tex(tx.map), eT = tex(tx.emap);
      const core = C.p === 'core', pm = planetMat(mapT, eT, C.atm, core ? { eDay: .55, eNight: 0, amb: .35 } : C.p === 'lava' ? { eDay: .7, eNight: .6 } : C.p === 'grid' ? { eDay: .65, eNight: .5 } : C.p === 'ocean' ? { eDay: .25, eNight: 1.1 } : { eDay: 0, eNight: 1.15 });
      const planet = new T.Mesh(track(new T.SphereGeometry(R, 72, 48)), track(pm)); planet.rotation.z = .18; body.add(planet); cur.planet = planet; cur.pm = pm;
      if (C.clouds) { const cl = new T.Mesh(track(new T.SphereGeometry(R * 1.018, 72, 48)), track(planetMat(tex(tx.cloud), eT, C.atm, { alpha: 1, amb: .04, eNight: 0 }))); cl.rotation.z = .18; body.add(cl); cur.clouds = cl; }
      const halo = new T.Mesh(track(new T.SphereGeometry(R * (core ? 1.4 : 1.13), 48, 32)), track(haloMat(C.atm, core ? 1.6 : 1.5))); body.add(halo);
      if (core) { const gl = new T.Sprite(track(new T.SpriteMaterial({ map: glowTex, color: lc('#22d3ee'), transparent: true, opacity: .7, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }))); gl.scale.setScalar(R * 5); gl.material.opacity = .45; gl.renderOrder = -1; body.add(gl); cur.coreGlow = gl; }
      if (C.ring) { // ring with real planet shadow
        const ri = R * C.ring.ri, ro = R * C.ring.ro, rc = document.createElement('canvas'); rc.width = 256; rc.height = 4; const g = rc.getContext('2d'), r2 = seeded(C.seed + 9);
        for (let x = 0; x < 256; x++) { const gap = (x > 150 && x < 162) || x < 3 || x > 250, v = .55 + r2() * .45, a = gap ? .05 : (.35 + .65 * Math.abs(Math.sin(x * .09 + r2() * .4))) * (x > 205 ? (256 - x) / 51 : 1); g.fillStyle = 'rgba(' + (v * 255 | 0) + ',' + (v * 255 | 0) + ',' + (v * 255 | 0) + ',' + a.toFixed(3) + ')'; g.fillRect(x, 0, 1, 4); }
        const ring = new T.Mesh(track(new T.RingGeometry(ri, ro, 160, 2)), track(ringMat(tex(rc), C.ring.c, ri, ro, R))); ring.rotation.x = -Math.PI / 2 + C.ring.tilt * .4; ring.rotation.y = C.ring.tilt * .3; ring.renderOrder = 2; body.add(ring);
      }
    }
    // moons
    cur.moons = (C.moons || []).map((m, k) => {
      const mc = Object.assign({ p: 'rock', seed: C.seed + 40 + k, craters: 8 }, m), tx = bgPlanetTex(mc, 128, 64);
      let geo = new T.SphereGeometry(m.r, 32, 20); if (m.irr) { geo = new T.IcosahedronGeometry(m.r, 3); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 1 + .22 * Math.sin(x * .4 + y * .3) * Math.cos(z * .35); p.setXYZ(i, x * d, y * d * .82, z * d); } geo.computeVertexNormals(); }
      const mesh = new T.Mesh(track(geo), track(planetMat(tex(tx.map), tex(tx.emap), '#334155', { amb: .12 }))); scene.add(mesh); return { mesh, m, ph: k * 2.2 + 1 };
    });
    // ---- set pieces ----
    const std = (c, o) => { o = o || {}; if (SET.toon) { const m = new T.MeshToonMaterial({ color: lc(c), gradientMap: toonGrad(), transparent: !!o.transparent, opacity: o.opacity !== undefined ? o.opacity : 1 }); if (o.emissive) { m.emissive = o.emissive; m.emissiveIntensity = o.emissiveIntensity || 1; } return track(m); } return track(new T.MeshStandardMaterial(Object.assign({ color: lc(c), roughness: .6, metalness: .4, flatShading: true }, o))); };
    const emi = (c, i) => ({ emissive: lc(c), emissiveIntensity: i || 1 });
    const inst = (geo, mat, n) => { const m = new T.InstancedMesh(track(geo), mat, n); m.instanceMatrix.setUsage(T.DynamicDrawUsage); return m; };
    const dmy = new T.Object3D();
    const X = C.xtra;
    if (X === 'forge') { // a ring of foundry blocks around the molten moon, glowing underneath
      const n = 44, bl = inst(new T.BoxGeometry(18, 9, 26), std('#3f3f46', { metalness: .8, roughness: .35 }), n), gw = inst(new T.BoxGeometry(14, 2, 22), std('#000000', emi('#f97316', 2.4)), n), g = new T.Group();
      for (let i = 0; i < n; i++) { const a = i / n * 6.283; dmy.position.set(Math.cos(a) * R * 1.42, 0, Math.sin(a) * R * 1.42); dmy.rotation.set(0, -a, 0); dmy.scale.setScalar(1); dmy.updateMatrix(); bl.setMatrixAt(i, dmy.matrix); dmy.position.y = -5.5; dmy.updateMatrix(); gw.setMatrixAt(i, dmy.matrix); }
      g.add(bl, gw); g.rotation.x = .28; g.rotation.z = -.12; body.add(g); upd.push(df => { g.rotation.y += .0011 * df; });
    } else if (X === 'wire' || X === 'shells') { // wireframe shells (the machine mind / the heart's cage)
      const col = X === 'wire' ? '#4ade80' : '#67e8f9', defs = X === 'wire' ? [[1.28, 1, .55], [1.62, 0, .35]] : [[1.55, 1, .5], [2.05, 0, .4], [2.5, 1, .22]];
      defs.forEach(([s, det, o], k) => { const ln = new T.LineSegments(track(new T.EdgesGeometry(new T.IcosahedronGeometry(R * s, det))), track(new T.LineBasicMaterial({ color: lc(col), transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }))); body.add(ln); upd.push(df => { ln.rotation.y += (.0012 + k * .0009) * df * (k % 2 ? -1 : 1); ln.rotation.x += .0005 * df; }); });
      if (X === 'shells') { const d2 = new T.Mesh(track(new T.RingGeometry(R * 1.3, R * 3.2, 128, 3)), track(diskMat('#ecfeff', '#0891b2', R * 1.3, R * 3.2, .85, .3))); d2.rotation.x = -Math.PI / 2 + .3; body.add(d2); }
      else { // data ring of flowing points
        const n = Math.round(900 * q), pp = new Float32Array(n * 3), ps = new Float32Array(n), pc = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rs() * 6.283, r = R * (1.85 + rs() * .25); pp[i * 3] = Math.cos(a) * r; pp[i * 3 + 1] = (rs() - .5) * 4; pp[i * 3 + 2] = Math.sin(a) * r; ps[i] = 1.4 + rs() * 2; const k2 = .4 + rs() * .6; pc[i * 3] = .29 * k2; pc[i * 3 + 1] = .87 * k2; pc[i * 3 + 2] = .5 * k2; }
        const gg = track(new T.BufferGeometry()); gg.setAttribute('position', new T.BufferAttribute(pp, 3)); gg.setAttribute('sz', new T.BufferAttribute(ps, 1)); gg.setAttribute('col', new T.BufferAttribute(pc, 3));
        const pts = new T.Points(gg, track(pointsMat(false))); pts.rotation.x = .35; body.add(pts); cur.ptsM = pts.material; upd.push(df => { pts.rotation.y -= .004 * df; });
      }
    } else if (X === 'clock') { // giant clock rings ticking at different speeds
      [[1.32, 1.3, 0, 60], [1.55, 1.7, .9, 12], [1.8, 2.0, -.5, 60]].forEach(([s, tube, tilt, ticks], k) => {
        const g = new T.Group(); g.rotation.x = Math.PI / 2 + tilt * .5; g.rotation.y = tilt;
        g.add(new T.Mesh(track(new T.TorusGeometry(R * s, tube, 8, 160)), std('#a16207', Object.assign({ metalness: .9, roughness: .3 }, emi('#facc15', .12)))));
        const tk = inst(new T.BoxGeometry(3, ticks === 12 ? 22 : 9, 3), std('#fde68a', emi('#fde047', .8)), ticks); for (let i = 0; i < ticks; i++) { const a = i / ticks * 6.283; dmy.position.set(Math.cos(a) * R * s, Math.sin(a) * R * s, 0); dmy.rotation.set(0, 0, a + Math.PI / 2); dmy.scale.setScalar(1); dmy.updateMatrix(); tk.setMatrixAt(i, dmy.matrix); }
        g.add(tk); body.add(g); upd.push(df => { g.rotation.z += [.0016, -.0006, .0003][k] * df; });
      });
    } else if (X === 'station') { // the shattered orbital ring: arcs with gaps, modules and blinking lights
      const g = new T.Group(), arcs = 7, rr = R * 1.85; g.rotation.x = .32; g.rotation.z = -.1;
      const mods = inst(new T.BoxGeometry(10, 7, 14), std('#64748b', { metalness: .85, roughness: .35 }), arcs * 8), lit = inst(new T.BoxGeometry(10.5, 1.2, 14.5), std('#000000', emi('#fef3c7', 1.8)), arcs * 8); let mi = 0;
      for (let k = 0; k < arcs; k++) {
        const a0 = k / arcs * 6.283, len = 6.283 / arcs - .2 - rs() * .25, tor = new T.Mesh(track(new T.TorusGeometry(rr, 3.2, 8, 40, len)), std('#475569', { metalness: .85, roughness: .4 })); tor.rotation.x = Math.PI / 2; tor.rotation.z = a0; g.add(tor);
        for (let j = 0; j < 8; j++) { const a = a0 + len * (j + .5) / 8; dmy.position.set(Math.cos(a) * rr, 0, -Math.sin(a) * rr); dmy.rotation.set(0, a, 0); dmy.scale.setScalar(1); dmy.updateMatrix(); mods.setMatrixAt(mi, dmy.matrix); dmy.position.y = 3.8; dmy.updateMatrix(); lit.setMatrixAt(mi++, dmy.matrix); }
      }
      g.add(mods, lit); body.add(g); upd.push(df => { g.rotation.y += .0009 * df; });
    } else if (X === 'islands') { // floating islands with crystal spires drifting in the orbit lane
      for (let i = 0; i < Math.round(9 * q + 2); i++) {
        const g = new T.Group(), s = 9 + rs() * 16, rock = new T.IcosahedronGeometry(1, 1), p = rock.attributes.position;
        for (let v = 0; v < p.count; v++) { const y = p.getY(v); p.setY(v, y > 0 ? y * .35 : y * 1.25); p.setX(v, p.getX(v) * (1 + (rs() - .5) * .25)); } rock.computeVertexNormals();
        g.add(new T.Mesh(track(rock), std('#4a1236', { roughness: .9, metalness: .05 })));
        const top = new T.Mesh(track(new T.CylinderGeometry(.92, .98, .18, 9)), std('#f9a8d4', Object.assign({ roughness: .8, metalness: 0 }, emi('#831843', .3)))); top.position.y = .34; g.add(top);
        for (let c = 0; c < 3; c++) { const cr = new T.Mesh(track(new T.OctahedronGeometry(.22, 0)), std('#fbcfe8', emi('#f472b6', 1.8))); cr.scale.set(1, 2.6 + rs() * 1.5, 1); cr.position.set((rs() - .5) * 1.1, .7, (rs() - .5) * 1.1); g.add(cr); }
        placeOrbit(g, s, rs, C); scene.add(g); const sp2 = (rs() - .5) * .004; upd.push(df => { g.rotation.y += sp2 * df; });
      }
    } else if (X === 'graves') { // derelict hulks and a leviathan skeleton
      for (let i = 0; i < 4; i++) {
        const g = new T.Group(), m = std('#3f3f46', { metalness: .7, roughness: .55 });
        g.add(new T.Mesh(track(new T.BoxGeometry(70, 11, 14)), m)); const br = new T.Mesh(track(new T.BoxGeometry(14, 10, 10)), m); br.position.set(20, 9, 0); g.add(br);
        for (let r = 0; r < 6; r++) { const rib = new T.Mesh(track(new T.BoxGeometry(2, 22, 2)), m); rib.position.set(-40 - r * 6, 0, 0); rib.rotation.z = (rs() - .5) * .6; g.add(rib); }
        const lt = new T.Mesh(track(new T.BoxGeometry(30, 1, 14.4)), std('#000000', emi('#5eead4', .9))); lt.position.y = 2; g.add(lt);
        placeOrbit(g, .45 + rs() * .3, rs, C); g.rotation.set(rs() * 6, rs() * 6, rs() * 6); scene.add(g); const sp2 = (rs() - .5) * .0016; upd.push(df => { g.rotation.x += sp2 * df; g.rotation.z += sp2 * .6 * df; });
      }
      const sk = new T.Group(), bone = std('#d6d3d1', { roughness: .85, metalness: 0 }), nV = 16, vert = inst(new T.SphereGeometry(3.2, 10, 8), bone, nV), ribs = inst(new T.TorusGeometry(12, 1.1, 6, 18, Math.PI), bone, nV);
      for (let i = 0; i < nV; i++) { const x = i * 8 - 64, y = Math.sin(i * .35) * 10, s = 1 - Math.abs(i - 6) / 14; dmy.position.set(x, y, 0); dmy.rotation.set(0, 0, 0); dmy.scale.setScalar(.6 + s * .6); dmy.updateMatrix(); vert.setMatrixAt(i, dmy.matrix); dmy.rotation.set(0, Math.PI / 2, Math.PI); dmy.scale.setScalar(Math.max(.25, s * 1.3)); dmy.updateMatrix(); ribs.setMatrixAt(i, dmy.matrix); }
      sk.add(vert, ribs); placeOrbit(sk, 1.1, rs, C); sk.rotation.set(.4, 1.2, .2); scene.add(sk); upd.push(df => { sk.rotation.y += .0004 * df; });
    }
    // debris belt crossing the orbit lane (the strongest parallax layer besides dust)
    if (C.deb) {
      const D = C.deb, n = Math.round(D.n * q), geo = D.k === 'ice' ? new T.OctahedronGeometry(1, 0) : D.k === 'crystal' ? new T.OctahedronGeometry(1, 0) : D.k === 'cube' ? new T.BoxGeometry(1.4, 1.4, 1.4) : D.k === 'hull' ? new T.BoxGeometry(2.6, .7, 1.2) : D.k === 'plate' ? new T.CylinderGeometry(1.2, 1.2, .22, 6) : D.k === 'cog' ? new T.CylinderGeometry(1.3, 1.3, .35, 10) : new T.IcosahedronGeometry(1, 1);
      if (D.k === 'rock' || D.k === 'slag') { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 1 + .25 * Math.sin(x * 3.1 + y * 2.3) * Math.cos(z * 2.7); p.setXYZ(i, x * d, y * d * .8, z * d); } geo.computeVertexNormals(); }
      const mat = std(D.c, Object.assign(D.k === 'ice' ? { roughness: .15, metalness: .1, transparent: true, opacity: .85 } : D.k === 'hull' || D.k === 'cog' ? { metalness: .85, roughness: .4 } : { roughness: .85, metalness: .05 }, D.e ? emi(D.e, D.k === 'slag' ? .7 : 1.1) : {}));
      const im = inst(geo, mat, n), data = [];
      for (let i = 0; i < n; i++) { const o = new T.Object3D(); placeOrbit(o, D.s[0] + rs() * rs() * (D.s[1] - D.s[0]) * 1.3, rs, C); data.push({ p: o.position.clone(), s: o.scale.x * (D.k === 'ice' || D.k === 'crystal' ? 1 : 1), st: [D.k === 'ice' || D.k === 'crystal' ? 2.2 : 1, 1], r: [rs() * 6, rs() * 6, rs() * 6], w: [(rs() - .5) * .02, (rs() - .5) * .02] }); }
      scene.add(im); cur.deb = { im, data };
      upd.push(df => { for (let i = 0; i < data.length; i++) { const d = data[i]; d.r[0] += d.w[0] * df; d.r[1] += d.w[1] * df; dmy.position.copy(d.p); dmy.rotation.set(d.r[0], d.r[1], d.r[2]); dmy.scale.set(d.s, d.s * d.st[0], d.s); dmy.updateMatrix(); im.setMatrixAt(i, dmy.matrix); } im.instanceMatrix.needsUpdate = true; });
    }
    // near dust: thousands of motes around the orbit lane, the fastest-moving layer
    const nD = Math.round(1700 * q * (C.dustN || 1)), dp = new Float32Array(nD * 3), ds = new Float32Array(nD), dc = new Float32Array(nD * 3), dcol = bgRGB(C.dust || '#ffffff');
    for (let i = 0; i < nD; i++) { const a = rs() * 6.283, r = C.d + (rs() - .62) * 360, y = C.h + (rs() - .5) * 300; dp[i * 3] = Math.sin(a) * r; dp[i * 3 + 1] = y; dp[i * 3 + 2] = Math.cos(a) * r; ds[i] = .5 + rs() * 1.4; const k = .25 + rs() * .45; dc[i * 3] = dcol[0] / 255 * k; dc[i * 3 + 1] = dcol[1] / 255 * k; dc[i * 3 + 2] = dcol[2] / 255 * k; }
    const dg = track(new T.BufferGeometry()); dg.setAttribute('position', new T.BufferAttribute(dp, 3)); dg.setAttribute('sz', new T.BufferAttribute(ds, 1)); dg.setAttribute('col', new T.BufferAttribute(dc, 3));
    const dust = new T.Points(dg, track(pointsMat(true, 9))); scene.add(dust); cur.dustM = dust.material;
    if (C.flash) { flashSp = new T.Sprite(track(new T.SpriteMaterial({ map: glowTex, color: lc(C.flash), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }))); flashSp.scale.setScalar(R * 1.1); scene.add(flashSp); } else flashSp = null;
  }
  // put something somewhere along the camera's orbit lane, mostly between the camera and the body so it drifts across view
  function placeOrbit(o, s, rs, C) {
    let dr, dh; do { dr = -40 - rs() * 260 + (rs() < .15 ? 300 : 0); dh = (rs() - .5) * 280; } while (Math.hypot(dr, dh) < 95);
    const a = rs() * 6.283, r = C.d + dr; o.position.set(Math.sin(a) * r, C.h + dh, Math.cos(a) * r); o.scale.setScalar(s);
  }

  const B = {
    get w() { return curW; },
    setAngle(a) { ang = a; }, addTime(sec) { tt += sec; timeU.value = tt; },
    resize(iw, ih) { aspect = iw / Math.max(1, ih); cam.aspect = aspect; cam.updateProjectionMatrix(); },
    draw(Gs, W, H, df) {
      const wi = G.mapX ? 'm:' + G.mapX.k : Gs.world | 0; if (wi !== curW || SET.back !== lastQ || !!SET.toon !== lastToon) build(wi);
      if (Gs.run !== lastRun) { lastRun = Gs.run; ang = 0; }
      if (cur.arena) { // ground-level arena: still camera, the world streams past
        const A = cur.arena, kk = SET.reduce ? .4 : 1; S += df * A.speed * kk * (Gs.scrollMul || 1); tt += df / 60; timeU.value = tt;
        const p = Gs.players && Gs.players.find(q2 => q2.alive), tx = p ? p.x / W - .35 : 0, ty = p ? p.y / H - .5 : 0;
        par.x += (tx - par.x) * Math.min(1, .05 * df); par.y += (ty - par.y) * Math.min(1, .05 * df);
        cam.rotation.set(-A.tilt, 0, 0); cam.position.set(par.x * 46 + (Gs.sx || 0) * .6, A.camY - par.y * 34 - (Gs.sy || 0) * .6, 0); cam.updateMatrixWorld();
        A.sky.position.copy(cam.position); A.skyU.flash.value = A.flash;
        for (const L of A.layers) L.g.position.x = -(S % L.len);
        for (const [o, fn] of A.anims) fn(o, tt, df);
        for (const f of A.upd) f(df, S);
        renderer.render(scene, cam); return;
      }
      const C = cur.C, k = SET.reduce ? .3 : 1; ang += df * (C.spd || .00034) * k * (Gs.scrollMul || 1); tt += df / 60; timeU.value = tt;
      // orbit: camera circles the body; moving to its right makes the universe flow left, like flying forward
      sunU.value.copy(sun0).applyAxisAngle(yAx, ang * .6); sunL.position.copy(sunU.value).multiplyScalar(1000); for (const m of cur.sunSp) m.position.copy(sunU.value).multiplyScalar(6000);
      const a = ang, D = C.d; cam.position.set(Math.sin(a) * D, C.h, Math.cos(a) * D); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
      const tv = Math.tan(cam.fov * Math.PI / 360); cam.rotateY(Math.atan(C.nx * tv * aspect)); cam.rotateX(Math.atan(-C.ny * tv));
      // parallax from the lead pilot's position and the screen shake: near layers slide, the body barely moves
      const p = Gs.players && Gs.players.find(q => q.alive), tx = p ? p.x / W - .35 : 0, ty = p ? p.y / H - .5 : 0;
      par.x += (tx - par.x) * Math.min(1, .05 * df); par.y += (ty - par.y) * Math.min(1, .05 * df);
      cam.translateX(par.x * 34 + (Gs.sx || 0) * .5); cam.translateY(-par.y * 26 - (Gs.sy || 0) * .5); cam.updateMatrixWorld();
      cur.sky.position.copy(cam.position);
      const pr = renderer.getPixelRatio(); if (cur.starM) cur.starM.uniforms.pr.value = pr; if (cur.dustM) cur.dustM.uniforms.pr.value = pr; if (cur.ptsM) cur.ptsM.uniforms.pr.value = pr;
      if (cur.planet) cur.planet.rotation.y += .0007 * df; if (cur.clouds) cur.clouds.rotation.y += .001 * df;
      if (cur.pm && C.p === 'core') { const pu = 1 + Math.sin(tt * 2.4) * .12; cur.pm.uniforms.pulse.value = pu; if (cur.coreGlow) cur.coreGlow.material.opacity = .38 + (pu - 1) * 1.2; }
      if (cur.face) for (const f of cur.face) f.quaternion.copy(cam.quaternion);
      for (const m of cur.moons) { const t2 = tt * .05 * m.m.sp + m.ph; m.mesh.position.set(Math.cos(t2) * m.m.d, Math.sin(t2) * m.m.d * m.m.inc, Math.sin(t2) * m.m.d); m.mesh.rotation.y += .002 * df; }
      for (const f of cur.upd) f(df);
      if (flashSp) { // lightning inside the cloud tops, on the side facing us
        flashT -= df; if (flashT <= 0 && Math.random() < .004 * df && !SET.reduce) { flashT = 14; const d = cam.position.clone().normalize(), side = new T.Vector3(-d.z, 0, d.x).normalize(); flashSp.position.copy(d.multiplyScalar(C.r * .96)).add(side.multiplyScalar((Math.random() - .5) * C.r * .9)).add(new T.Vector3(0, (Math.random() - .5) * C.r * .9, 0)); }
        flashSp.material.opacity = flashT > 0 ? (flashT % 4 < 2 ? .9 : .35) * flashT / 14 : 0;
      }
      renderer.render(scene, cam);
    }
  };
  return B;
}

// ================= 3D ARENAS: ground-level worlds get a full scrolling environment =================
// The camera sits still and the world streams past. Each depth layer is merged into a handful of meshes (one per
// material), built three times end-to-end and slid left by (scroll mod length), so it loops forever with no seams
// and perspective does the parallax for free. Fog melts the far layers into the sky.

function buildArena(kind, X) {
  const T = THREE, { scene, track, lc, rs, q, sunL, amb, glowTex } = X;
  const A = { layers: [], anims: [], upd: [], camY: 0, tilt: .1, gy: -420, speed: 2.4, flash: 0, flashCol: null, fogNear: 300, fogFar: 4200 };
  // ---------- tiny toolkit ----------
  const srgb = t => { t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return track(t); };
  const canv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
  const EMIS = [];
  const MAT = (o) => { const m = MAT0(o); if (o.emissive !== undefined && m.emissiveIntensity !== undefined) EMIS.push([m, m.emissiveIntensity]); return m; };
  const MAT0 = (o) => {
    if (SET.toon) { const m = new T.MeshToonMaterial({ color: o.color !== undefined ? lc(o.color) : new T.Color(1, 1, 1), map: o.map || null, gradientMap: toonGrad(), vertexColors: o.vertexColors !== false, transparent: !!o.transparent, opacity: o.opacity !== undefined ? o.opacity : 1 });
      if (o.emissive !== undefined) { m.emissive = lc(o.emissive); m.emissiveIntensity = o.emissiveIntensity !== undefined ? o.emissiveIntensity : 1; } if (o.emissiveMap) m.emissiveMap = o.emissiveMap; if (o.color === '#000000') m.userData.glow = 1; return track(m); }
    return track(new T.MeshStandardMaterial(Object.assign({ roughness: .85, metalness: .1, flatShading: true, vertexColors: true }, o, o.color !== undefined ? { color: lc(o.color) } : {}, o.emissive !== undefined ? { emissive: lc(o.emissive) } : {})));
  };
  const BAS = (o) => track(new T.MeshBasicMaterial(Object.assign({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false }, o, o.color !== undefined ? { color: lc(o.color) } : {})));
  const G = {
    box: new T.BoxGeometry(1, 1, 1), cyl: new T.CylinderGeometry(.5, .5, 1, 10), cyl6: new T.CylinderGeometry(.5, .5, 1, 6), cone: new T.ConeGeometry(.5, 1, 7), cone4: new T.ConeGeometry(.5, 1, 4),
    mesa: new T.CylinderGeometry(.36, .5, 1, 7), ico: new T.IcosahedronGeometry(.5, 1), ico0: new T.IcosahedronGeometry(.5, 0), sph: new T.SphereGeometry(.5, 12, 9), oct: new T.OctahedronGeometry(.5, 0),
    tor: new T.TorusGeometry(.5, .07, 6, 28), half: new T.TorusGeometry(.5, .06, 6, 20, Math.PI), plane: new T.PlaneGeometry(1, 1), gear: null
  };
  { // lumpy rock + a gear with teeth, both unit sized
    const p = G.ico.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 1 + .22 * Math.sin(x * 9.1 + y * 6.3) * Math.cos(z * 7.7); p.setXYZ(i, x * d, y * d, z * d); } G.ico.computeVertexNormals();
    const parts = [[new T.CylinderGeometry(.42, .42, .16, 24), new T.Matrix4()]]; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, m = new T.Matrix4().compose(new T.Vector3(Math.cos(a) * .46, 0, Math.sin(a) * .46), new T.Quaternion().setFromEuler(new T.Euler(0, -a, 0)), new T.Vector3(.1, .16, .08)); parts.push([G.box, m]); }
    G.gear = mergeGeos(parts); G.gear.rotateX(Math.PI / 2);
  }
  const tmpM = new T.Matrix4(), tmpQ = new T.Quaternion(), tmpE = new T.Euler(), tmpV = new T.Vector3(), tmpS = new T.Vector3();
  function mergeGeos(list) { // [[geo, matrix, ux, uy, tint]] -> one non-indexed geometry with position/normal/uv/color
    let n = 0; const parts = list.map(e => { const g = e[0].index ? e[0].toNonIndexed() : e[0]; n += g.attributes.position.count; return [g, e[1], e[2] || 1, e[3] || 1, e[4], g !== e[0]]; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), C = new Float32Array(n * 3), v = new T.Vector3(), nm = new T.Matrix3(); let o = 0;
    for (const [g, m, ux, uy, tint, tmp] of parts) {
      const p = g.attributes.position, nr = g.attributes.normal, uv = g.attributes.uv, tc = tint || [1, 1, 1]; nm.getNormalMatrix(m);
      for (let i = 0; i < p.count; i++) {
        const k = o + i; v.fromBufferAttribute(p, i).applyMatrix4(m); P[k * 3] = v.x; P[k * 3 + 1] = v.y; P[k * 3 + 2] = v.z;
        if (nr) { v.fromBufferAttribute(nr, i).applyMatrix3(nm).normalize(); N[k * 3] = v.x; N[k * 3 + 1] = v.y; N[k * 3 + 2] = v.z; }
        if (uv) { U[k * 2] = uv.getX(i) * ux; U[k * 2 + 1] = uv.getY(i) * uy; }
        C[k * 3] = tc[0]; C[k * 3 + 1] = tc[1]; C[k * 3 + 2] = tc[2];
      }
      o += p.count; if (tmp) g.dispose();
    }
    const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(N, 3)); out.setAttribute('uv', new T.BufferAttribute(U, 2)); out.setAttribute('color', new T.BufferAttribute(C, 3));
    return out;
  }
  const mtx = (x, y, z, sx, sy, sz, rx, ry, rz) => new T.Matrix4().compose(tmpV.set(x, y, z), tmpQ.setFromEuler(tmpE.set(rx || 0, ry || 0, rz || 0)), tmpS.set(sx, sy, sz));
  const tint = (k, r) => { const v = k + (rs() - .5) * (r || .25); return [v, v, v]; };
  // a looping depth layer: fill(put) places props in x = [0, len); put(material, geometry, x, y, z, sx, sy, sz, rx, ry, rz, ux, uy, tint)
  function layer(z, len, fill) {
    const B = new Map(), g = new T.Group();
    fill((mat, geo, x, y, zz, sx, sy, sz, rx, ry, rz, ux, uy, tn) => { let a = B.get(mat); if (!a) B.set(mat, a = []); for (let k = -1; k <= 1; k++) a.push([geo, mtx(x + k * len, y, z + (zz || 0), sx, sy, sz, rx, ry, rz), ux, uy, tn]); });
    B.forEach((list, mat) => { const m = new T.Mesh(track(mergeGeos(list)), mat); g.add(m); ink(m); }); scene.add(g); const L = { g, len, z }; A.layers.push(L); return L;
  }
  // animated or special objects that still loop with a layer: three clones riding the layer's group
  function ride(L, obj, x, y, z, fn) { if (obj.isMesh || obj.isGroup) inkTree(obj); for (let k = -1; k <= 1; k++) { const o = k ? obj.clone() : obj; o.position.set(x + k * L.len, y, (z || 0) + L.z); L.g.add(o); if (fn) A.anims.push([o, fn]); } }
  const lenFor = z => Math.max(900, Math.abs(z) * 1.25 + 300);
  const spriteM = (c, o, add) => track(new T.SpriteMaterial({ map: X.cloudTex, color: lc(c), transparent: true, opacity: o, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending }));
  const glowM = (c, o) => track(new T.SpriteMaterial({ map: glowTex, color: lc(c), transparent: true, opacity: o, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false }));

  // ---------- sky, fog, ground, weather, lightning ----------
  function sky(top, hor, bot, o) {
    o = o || {}; const u = { top: { value: new T.Color(top) }, hor: { value: new T.Color(hor) }, bot: { value: new T.Color(bot) }, sunD: { value: new T.Vector3(o.sx || .4, o.sy || .12, -1).normalize() }, sunC: { value: new T.Color(o.sun || '#000000') }, aur: { value: o.aur ? 1 : 0 }, aurC: { value: new T.Color(o.aur || '#000000') }, t: X.timeU, flash: { value: 0 }, fc: { value: new T.Color(o.fc || '#c7d2fe') } };
    const m = track(new T.ShaderMaterial({ uniforms: u, side: T.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; uniform vec3 sunD; uniform vec3 sunC; uniform float aur; uniform vec3 aurC; uniform float t; uniform float flash; uniform vec3 fc; varying vec3 vD;' +
        'void main(){ vec3 d=normalize(vD); float y=d.y; vec3 c= y>0. ? mix(hor,top,pow(smoothstep(0.,.55,y),.75)) : mix(hor,bot,smoothstep(0.,.25,-y));' +
        ' float s=max(dot(d,sunD),0.); c+=sunC*(pow(s,90.)*1.6+pow(s,8.)*.35+pow(s,2.)*.08);' +
        ' if(aur>0.){ float a=smoothstep(.06,.22,y)*(1.-smoothstep(.28,.55,y)); float w=.5+.5*sin(d.x*5.+t*.25); float w2=.5+.5*sin(d.x*19.-t*.6+d.z*3.); c+=aurC*a*w*(.4+.6*w2)*.9; }' +
        ' c+=fc*flash*smoothstep(-.1,.6,y)*.7; gl_FragColor=vec4(c,1.); }' }));
    const sk = new T.Mesh(track(new T.SphereGeometry(8000, 32, 16)), m); sk.renderOrder = -10; scene.add(sk); A.sky = sk; A.skyU = u;
    scene.fog = new T.Fog(new T.Color(o.fog || hor), A.fogNear, A.fogFar); // fog is applied after output encoding in r128, so no linear conversion
  }
  function ground(c, fn, o) { // a huge plane whose texture scrolls at exactly the world's speed
    o = o || {}; const tile = o.tile || 600, cv = canv(256, 256, fn), map = srgb(new T.CanvasTexture(cv)), em = o.emi ? srgb(new T.CanvasTexture(canv(256, 256, o.emi))) : null;
    const W = 20000, D = 9000; map.repeat.set(W / tile, D / tile); if (em) em.repeat.copy(map.repeat);
    const m = SET.toon ? track(new T.MeshToonMaterial({ map, color: lc(c), gradientMap: toonGrad(), emissive: em ? lc(o.emiCol || '#ffffff') : lc('#000000'), emissiveMap: em, emissiveIntensity: o.ei || 1, transparent: !!o.alpha, opacity: o.alpha || 1 })) : track(new T.MeshStandardMaterial({ map, color: lc(c), roughness: o.rough !== undefined ? o.rough : .9, metalness: o.metal || 0, emissive: em ? lc(o.emiCol || '#ffffff') : lc('#000000'), emissiveMap: em, emissiveIntensity: o.ei || 1, transparent: !!o.alpha, opacity: o.alpha || 1 }));
    const gm = new T.Mesh(track(new T.PlaneGeometry(W, D)), m); gm.rotation.x = -Math.PI / 2; gm.position.set(0, o.y !== undefined ? o.y : A.gy, -D / 2 + 200); scene.add(gm);
    A.upd.push((df, S) => { const off = (S / tile) % 1; map.offset.x = off; if (em) em.offset.x = off; if (o.drift) { map.offset.y = (X.timeU.value * o.drift) % 1; if (em) em.offset.y = map.offset.y; } });
    return gm;
  }
  // weather: points in a box around the camera that drift with the world; kinds 0 soft dot, 1 rain streak, 2 bubble ring, 3 data streak
  function weather(kindN, n, col, box, vel, size, z0) {
    n = Math.round(n * q); const P = new Float32Array(n * 3), S = new Float32Array(n), D = new Float32Array(n);
    for (let i = 0; i < n; i++) { P[i * 3] = (rs() * 2 - 1) * box[0]; P[i * 3 + 1] = (rs() * 2 - 1) * box[1]; P[i * 3 + 2] = -(z0 || 120) - rs() * box[2]; S[i] = size * (.5 + rs()); D[i] = rs(); }
    const g = track(new T.BufferGeometry()); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('sz', new T.BufferAttribute(S, 1)); g.setAttribute('sd', new T.BufferAttribute(D, 1));
    const u = { t: X.timeU, sc: { value: 0 }, box: { value: new T.Vector3(box[0], box[1], box[2]) }, vel: { value: new T.Vector3(vel[0], vel[1], vel[2] || 0) }, col: { value: new T.Color(col) }, pr: { value: 1 }, kind: { value: kindN } };
    const m = track(new T.ShaderMaterial({ uniforms: u, blending: T.AdditiveBlending, transparent: true, depthWrite: false,
      vertexShader: 'attribute float sz; attribute float sd; uniform float t; uniform float sc; uniform vec3 box; uniform vec3 vel; uniform float pr; varying float vA; varying float vS;' +
        'void main(){ vec3 p=position; p.x=mod(p.x-sc+vel.x*t*60.*(.7+sd*.6)+box.x,box.x*2.)-box.x+sin(t*1.1+sd*40.)*vel.z; p.y=mod(p.y+vel.y*t*60.*(.6+sd*.8)+box.y,box.y*2.)-box.y;' +
        ' vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; float z=-mv.z; gl_PointSize=min(48.,sz*pr*320./max(z,1.)); vA=smoothstep(30.,140.,z)*(1.-smoothstep(1400.,2600.,z)); vS=sd; }',
      fragmentShader: 'uniform vec3 col; uniform float kind; uniform float t; varying float vA; varying float vS; void main(){ vec2 c=gl_PointCoord-.5; float a;' +
        ' if(kind<.5){ a=1.-smoothstep(0.,.5,length(c)); a*=a; } else if(kind<1.5){ a=(1.-smoothstep(0.,.07,abs(c.x+c.y*.18)))*(1.-smoothstep(.3,.5,abs(c.y))); }' +
        ' else if(kind<2.5){ float r=length(c); a=smoothstep(.3,.42,r)*(1.-smoothstep(.42,.5,r))+(1.-smoothstep(0.,.12,length(c-vec2(-.12,-.12))))*.6; }' +
        ' else { a=(1.-smoothstep(0.,.1,abs(c.x)))*(.3+.7*step(.5,fract(c.y*3.+vS*7.+t))); }' +
        ' float bl=kind>2.5?1.:(.65+.35*sin(t*3.+vS*50.)); gl_FragColor=vec4(col*a*vA*bl,1.); }' }));
    const pts = new T.Points(g, m); pts.position.set(0, A.camY, 0); pts.frustumCulled = false; scene.add(pts); A.upd.push((df, S) => { u.sc.value = S; u.pr.value = X.pr(); });
  }
  function lightning(col, every) { // flicker the sky + drop a jagged bolt somewhere in the distance
    const n = 26, P = new Float32Array(n * 6), g = track(new T.BufferGeometry()); g.setAttribute('position', new T.BufferAttribute(P, 3));
    const bolt = new T.LineSegments(g, track(new T.LineBasicMaterial({ color: lc(col), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }))); bolt.frustumCulled = false; scene.add(bolt);
    let ft = 0; A.flashCol = col;
    A.upd.push(df => {
      ft -= df; if (ft <= 0 && Math.random() < df / every && !SET.reduce) {
        ft = 16; let x = (Math.random() - .3) * 2600, y = 1300, z = -2200 - Math.random() * 1400;
        for (let i = 0; i < n; i++) { const nx = x + (Math.random() - .5) * 160, ny = y - (1300 - A.gy) / n * (1 + Math.random() * .4); P.set([x, y, z, nx, ny, z], i * 6); x = nx; y = ny; }
        g.attributes.position.needsUpdate = true;
      }
      const f = ft > 0 ? (ft % 5 < 2.5 ? 1 : .35) * ft / 16 : 0; bolt.material.opacity = f; A.flash = f;
    });
  }
  // shared facade texture: dark panels with a grid of windows; the emissive map lights a random subset
  function facade(base, lit, frac, cols, rows) {
    const R2 = seeded(X.seed + 3); cols = cols || 4; rows = rows || 4;
    const map = canv(64, 64, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) g.fillRect(i * w / cols + 3, j * h / rows + 4, w / cols - 6, h / rows - 7); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, w, 2); });
    const emi = canv(64, 64, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (R2() < frac) { g.fillStyle = lit[(R2() * lit.length) | 0]; g.globalAlpha = .55 + R2() * .45; g.fillRect(i * w / cols + 3, j * h / rows + 4, w / cols - 6, h / rows - 7); } g.globalAlpha = 1; });
    return { map: srgb(new T.CanvasTexture(map)), emi: srgb(new T.CanvasTexture(emi)) };
  }
  const gy = () => A.gy;
  // ---------- cel shading for the environment: fog-aware ink outlines that stay ~1.5px wide at any depth ----------
  let OUTM = null;
  const outlineM = () => OUTM || (OUTM = track(new T.ShaderMaterial({
    uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { k: { value: .0022 }, c: { value: new T.Color(0x07060d) } }]), side: T.BackSide, fog: true,
    vertexShader: 'attribute vec3 onrm; uniform float k;\n#include <fog_pars_vertex>\nvoid main(){\n#ifdef USE_INSTANCING\n vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position,1.); vec3 n = normalize(normalMatrix * mat3(instanceMatrix) * onrm);\n#else\n vec4 mvPosition = modelViewMatrix * vec4(position,1.); vec3 n = normalize(normalMatrix * onrm);\n#endif\n mvPosition.xyz += n * k * max(1., -mvPosition.z); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: 'uniform vec3 c;\n#include <fog_pars_fragment>\nvoid main(){ gl_FragColor = vec4(c,1.);\n#include <fog_fragment>\n}'
  })));
  function smoothN(geo) {
    if (geo.attributes.onrm) return; if (!geo.attributes.normal) geo.computeVertexNormals();
    const p = geo.attributes.position, n = geo.attributes.normal, acc = new Map(), keys = new Array(p.count), o = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const k = Math.round(p.getX(i) * 10) + ',' + Math.round(p.getY(i) * 10) + ',' + Math.round(p.getZ(i) * 10); keys[i] = k; let a = acc.get(k); if (!a) acc.set(k, a = [0, 0, 0]); a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); }
    for (let i = 0; i < p.count; i++) { const a = acc.get(keys[i]), l = Math.hypot(a[0], a[1], a[2]) || 1; o[i * 3] = a[0] / l; o[i * 3 + 1] = a[1] / l; o[i * 3 + 2] = a[2] / l; }
    geo.setAttribute('onrm', new T.BufferAttribute(o, 3));
  }
  const inked = mat => SET.toon && mat && mat.isMeshToonMaterial && !mat.transparent && !mat.userData.glow;
  function ink(mesh) { // add an outline twin (shares geometry; instanced meshes share the instance matrices too)
    if (!inked(mesh.material)) return mesh;
    try { smoothN(mesh.geometry); let o;
      if (mesh.isInstancedMesh) { o = new T.InstancedMesh(mesh.geometry, outlineM(), mesh.count); o.instanceMatrix = mesh.instanceMatrix; o.frustumCulled = false; mesh.parent ? mesh.parent.add(o) : mesh.userData.twin = o; }
      else { o = new T.Mesh(mesh.geometry, outlineM()); mesh.add(o); }
    } catch (e) { }
    return mesh;
  }
  const inkTree = root => { const l = []; root.traverse(n => { if (n.isMesh && n.material !== OUTM) l.push(n); }); l.forEach(ink); return root; };
  // a long scrolling surface between two depths (roads, sidewalks, water)
  function strip(z0, z1, y, c, fn, o) {
    o = o || {}; const tile = o.tile || 300, map = srgb(new T.CanvasTexture(canv(256, 256, fn))), em = o.emi ? srgb(new T.CanvasTexture(canv(256, 256, o.emi))) : null, W = 20000, D = Math.abs(z1 - z0);
    map.repeat.set(W / tile, (o.ty || 1)); if (em) em.repeat.copy(map.repeat);
    const m = SET.toon ? new T.MeshToonMaterial({ map, color: lc(c), gradientMap: toonGrad(), emissive: em ? lc(o.emiCol || '#ffffff') : lc('#000000'), emissiveMap: em, emissiveIntensity: o.ei || 1 }) : new T.MeshStandardMaterial({ map, color: lc(c), roughness: o.rough || .85, emissive: em ? lc(o.emiCol || '#ffffff') : lc('#000000'), emissiveMap: em, emissiveIntensity: o.ei || 1 });
    track(m); const gm = new T.Mesh(track(new T.PlaneGeometry(W, D)), m); gm.rotation.x = -Math.PI / 2; gm.position.set(0, y, (z0 + z1) / 2); scene.add(gm);
    A.upd.push((df, S) => { const off = (S / tile) % 1; map.offset.x = off; if (em) em.offset.x = off; });
    return gm;
  }
  // instanced vehicles / walkers: kinds define parts [geometry, material, x, y, z, sx, sy, sz, colorSlot, flag]
  const PALETTE = { car: ['#dc2626', '#2563eb', '#f8fafc', '#111827', '#9ca3af', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#b45309', '#e11d48', '#475569'], skin: ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a0522d'], shirt: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f8fafc', '#111827', '#a855f7', '#f97316', '#14b8a6', '#ec4899', '#64748b', '#0ea5e9'] };
  function fleet(defs, list, o) { // list: [{kind, x0, z, v, y, col}] ; moves at its own speed on top of the world scroll
    o = o || {}; const span = o.span || 6000, buckets = new Map(), items = list.map(it => Object.assign({ y: 0, bob: 0 }, it));
    items.forEach((it, idx) => { defs[it.kind].forEach((p, pi) => { const key = p[0].uuid + p[1].uuid; let b = buckets.get(key); if (!b) buckets.set(key, b = { geo: p[0], mat: p[1], refs: [] }); b.refs.push([idx, p]); }); });
    const meshes = []; buckets.forEach(b => { const m = new T.InstancedMesh(b.geo, b.mat, b.refs.length); m.frustumCulled = false; m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      b.refs.forEach(([idx, p], i) => { const it = items[idx], slot = p[8]; if (slot) { const c = slot === 'body' ? it.col : slot === 'skin' ? it.skin : slot === 'shirt' ? it.shirt : slot === 'pants' ? it.pants : slot; m.setColorAt(i, lc(c || '#ffffff')); } });
      if (m.instanceColor) m.instanceColor.needsUpdate = true; scene.add(m); ink(m); b.m = m; meshes.push(b); });
    const dm = new T.Object3D(), tE = new T.Euler(), tV = new T.Vector3();
    A.upd.push((df, S) => { const t = X.timeU.value * 60;
      for (const b of meshes) { b.refs.forEach(([idx, p], i) => { const it = items[idx], dir = it.v >= 0 ? 1 : -1; let x = ((it.x0 + it.v * t - S) % span + span * 1.5) % span - span / 2;
          let sc = 1; if (p[9] === 'flashA') sc = (t * .14 + idx) % 2 < 1 ? 1 : 0; else if (p[9] === 'flashB') sc = (t * .14 + idx) % 2 < 1 ? 0 : 1; else if (p[9] === 'blink') sc = (t * .05 + idx * .7) % 2 < 1 ? 1 : 0;
          const bob = it.bob ? Math.abs(Math.sin(t * it.bob + idx)) * 1.6 : 0, sw = p[9] === 'legL' ? Math.sin(t * it.bob * 2 + idx) * .5 : p[9] === 'legR' ? -Math.sin(t * it.bob * 2 + idx) * .5 : 0;
          const kk = it.k || 1, fl = p[9], rx = fl === 'wingL' ? Math.sin(t * .35 + idx) * .8 : fl === 'wingR' ? -Math.sin(t * .35 + idx) * .8 : fl === 'tumble' ? t * .06 + idx : 0, ry2 = fl === 'spin' ? t * .4 : fl === 'tail' ? Math.sin(t * .3 + idx) * .4 : 0, rz2 = fl === 'tumble' ? t * .045 + idx * 2 : 0;
          if (fl === 'tumble') { tE.set(rx, 0, rz2); tV.set(p[2] * dir * kk, p[3] * kk, p[4] * dir * kk).applyEuler(tE); dm.position.set(x + tV.x, it.y + tV.y + bob, it.z + tV.z); } else dm.position.set(x + p[2] * dir * kk, it.y + p[3] * kk + bob, it.z + p[4] * dir * kk);
          dm.rotation.set(rx, (dir > 0 ? 0 : Math.PI) + ry2, sw + (p[10] || 0) + rz2); dm.scale.set(p[5] * sc * kk || 1e-4, p[6] * sc * kk || 1e-4, p[7] * sc * kk || 1e-4); dm.updateMatrix(); b.m.setMatrixAt(i, dm.matrix); });
        b.m.instanceMatrix.needsUpdate = true; } });
    return items;
  }
  // shared vehicle and pedestrian kits (unit geometry scaled per part)
  function kits() {
    const wheel = new T.CylinderGeometry(.5, .5, 1, 12); wheel.rotateX(Math.PI / 2); G.wheel = wheel; G.capsule = new T.CylinderGeometry(.42, .5, 1, 8); G.head = new T.SphereGeometry(.5, 10, 8);
    const body = MAT({ color: '#ffffff', vertexColors: false, roughness: .4, metalness: .3 }), glass = MAT({ color: '#1e293b', vertexColors: false, roughness: .2 }), tire = MAT({ color: '#111111', vertexColors: false }),
      hl = MAT({ color: '#000000', emissive: '#fef3c7', emissiveIntensity: 2.2, vertexColors: false }), tl = MAT({ color: '#000000', emissive: '#ef4444', emissiveIntensity: 2, vertexColors: false }), red = MAT({ color: '#000000', emissive: '#ff2b2b', emissiveIntensity: 3, vertexColors: false }), blue = MAT({ color: '#000000', emissive: '#3b82f6', emissiveIntensity: 3, vertexColors: false }),
      olive = MAT({ color: '#4d5a2a', vertexColors: false }), olive2 = MAT({ color: '#3b4521', vertexColors: false }), white = MAT({ color: '#f8fafc', vertexColors: false }), dark = MAT({ color: '#1f2937', vertexColors: false }), yel = MAT({ color: '#facc15', vertexColors: false }), wins = MAT({ color: '#000000', emissive: '#fde68a', emissiveIntensity: 1.1, vertexColors: false });
    const B = G.box, Wh = (x, z, r) => [wheel, tire, x, r || 6, z, (r || 6) * 2, (r || 6) * 2, 5], car = (h) => [[B, body, 0, 11 * h, 0, 46, 12 * h, 22, 'body'], [B, glass, -2, 21 * h + 1, 0, 24, 10, 20.5], Wh(15, 11), Wh(-15, 11), Wh(15, -11), Wh(-15, -11), [B, hl, 23.2, 12 * h, 7, 1, 3, 5], [B, hl, 23.2, 12 * h, -7, 1, 3, 5], [B, tl, -23.2, 12 * h, 7, 1, 3, 5], [B, tl, -23.2, 12 * h, -7, 1, 3, 5]];
    return {
      car: car(1), suv: car(1.3).map(p => p[1] === body ? [B, body, 0, 14, 0, 50, 18, 24, 'body'] : p),
      taxi: car(1).concat([[B, yel, -2, 29, 0, 8, 3, 6]]),
      police: car(1).concat([[B, red, -2, 28.5, -5, 6, 3, 8, null, 'flashA'], [B, blue, -2, 28.5, 5, 6, 3, 8, null, 'flashB']]).map(p => p[1] === body ? [B, white, 0, 11, 0, 46, 12, 22] : p),
      bus: [[B, body, 0, 24, 0, 120, 34, 26, 'body'], [B, wins, 4, 32, 0, 104, 8, 26.6], Wh(40, 13, 8), Wh(-38, 13, 8), Wh(40, -13, 8), Wh(-38, -13, 8), [B, hl, 60.5, 14, 8, 1, 4, 6], [B, hl, 60.5, 14, -8, 1, 4, 6], [B, tl, -60.5, 14, 8, 1, 4, 6], [B, tl, -60.5, 14, -8, 1, 4, 6]],
      truck: [[B, olive, 34, 18, 0, 24, 24, 24], [B, glass, 40, 24, 0, 10, 9, 24.5], [B, olive2, -10, 22, 0, 62, 28, 26], Wh(36, 12, 7), Wh(36, -12, 7), Wh(-4, 12, 7), Wh(-4, -12, 7), Wh(-26, 12, 7), Wh(-26, -12, 7), [B, hl, 46.5, 12, 8, 1, 4, 5], [B, hl, 46.5, 12, -8, 1, 4, 5]],
      tank: [[B, olive, 0, 13, 0, 70, 18, 34], [B, olive2, -4, 28, 0, 34, 12, 26], [G.cyl, olive2, 26, 29, 0, 5, 44, 5, null, null, -Math.PI / 2], [B, dark, 0, 7, 16, 74, 12, 8], [B, dark, 0, 7, -16, 74, 12, 8]],
      walker: [[G.capsule, body, 0, 15, 0, 7, 13, 6, 'shirt'], [G.head, body, 0, 25.5, 0, 6.5, 6.5, 6.5, 'skin'], [B, body, 0, 5, 1.8, 2.6, 10, 2.6, 'pants', 'legL'], [B, body, 0, 5, -1.8, 2.6, 10, 2.6, 'pants', 'legR']]
    };
  }
  // a traffic list for a road: lanes [z, speed] ; kinds picked from a weighted list
  function traffic(lanes, n, pick, span) { const out = []; lanes.forEach(([z, v, y]) => { for (let i = 0; i < n; i++) { const kind = pick(); out.push({ kind, x0: (i + rs() * .6) / n * span, z, v: v * (kind === 'tank' || kind === 'truck' ? .55 : kind === 'bus' ? .75 : .8 + rs() * .45), y: y || 0, col: PALETTE.car[(rs() * PALETTE.car.length) | 0] }); } }); return out; }
  function crowd(zs, n, y, span) { const out = []; zs.forEach(z => { for (let i = 0; i < n; i++) { const sp = (.35 + rs() * .5) * (rs() < .5 ? -1 : 1); out.push({ kind: 'walker', x0: rs() * span, z: z + (rs() - .5) * 14, v: sp, y, bob: .16 + rs() * .06, skin: PALETTE.skin[(rs() * 6) | 0], shirt: PALETTE.shirt[(rs() * 12) | 0], pants: ['#1e3a8a', '#111827', '#57534e', '#78350f', '#334155'][(rs() * 5) | 0] }); } }); return out; }
  // gable roof prism (ridge along x), unit size
  const roofGeo = (() => { const sh = new T.Shape(); sh.moveTo(-.5, 0); sh.lineTo(.5, 0); sh.lineTo(0, .5); sh.closePath(); const g = new T.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -.5); g.rotateY(Math.PI / 2); return g; })();
  G.roof = roofGeo;
  function sign(text, bg, fg, w) { const c = canv(256, 64, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 256, 64); g.fillStyle = fg; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 34); g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, 248, 56); }); const t = srgb(new T.CanvasTexture(c)); return MAT({ color: '#000000', map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 1.4, vertexColors: false }); }

  // =====================================================================================================
  const K = {
    // W1 Aetheria Skylines - the old capital at sunset: a living city under siege, storm decks overhead
    city() {
      A.gy = -560; A.fogNear = 700; A.fogFar = 7200; A.tilt = .135; A.speed = 2.2;
      sky('#1d1446', '#ff8f4f', '#2b1530', { fog: '#c46a52', sun: '#ffd27a', sx: .32, sy: .035 });
      amb.intensity = .35; sunL.color.set(lc('#ffb37a')); sunL.intensity = 1.7; sunL.position.set(700, 260, -900); scene.add(track(new T.HemisphereLight(lc('#8b7cf6'), lc('#2b1530'), .55)));
      const KIT = kits();
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#3a3340'; g.fillRect(0, 0, w, h); g.fillStyle = '#4b4452'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(i * 64 + 8, j * 64 + 8, 48, 48); g.fillStyle = '#2f6b3a'; g.fillRect(8, 8, 48, 48); g.fillRect(136, 136, 48, 48); }, { tile: 700 });
      // the avenue: six lanes, sidewalks, curbs, crossings
      const ROAD = [-1150, -1440];
      strip(ROAD[0], ROAD[1], A.gy + 1, '#ffffff', (g, w, h) => { g.fillStyle = '#2b2b33'; g.fillRect(0, 0, w, h); g.fillStyle = '#f8fafc'; for (let k = 1; k < 6; k++) { if (k === 3) { g.fillStyle = '#facc15'; g.fillRect(0, k * h / 6 - 2, w, 4); g.fillStyle = '#f8fafc'; continue; } for (let x = 0; x < w; x += 64) g.fillRect(x, k * h / 6 - 1.5, 34, 3); } g.fillStyle = 'rgba(248,250,252,.85)'; for (let i = 0; i < 9; i++) g.fillRect(200 + i * 6, 6, 3, h - 12); }, { tile: 900 });
      strip(-1090, ROAD[0], A.gy + 3, '#ffffff', (g, w, h) => { g.fillStyle = '#9c9aa6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7d7b87'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } g.fillStyle = '#cbd5e1'; g.fillRect(0, h - 6, w, 6); }, { tile: 260 });
      strip(ROAD[1], -1500, A.gy + 3, '#ffffff', (g, w, h) => { g.fillStyle = '#9c9aa6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7d7b87'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } g.fillStyle = '#cbd5e1'; g.fillRect(0, 0, w, 6); }, { tile: 260 });
      // building looks
      const F = [facade('#5d6b86', ['#fde68a', '#fef3c7', '#fdba74'], .3, 6, 8), facade('#8a4b3c', ['#fde68a', '#fed7aa'], .35, 4, 6), facade('#a8a29e', ['#fef3c7', '#bae6fd'], .25, 5, 5), facade('#334a5e', ['#7dd3fc', '#fde68a'], .4, 8, 10), facade('#c7b9a5', ['#fde68a'], .3, 3, 4)];
      const bm = F.map(f => MAT({ map: f.map, emissiveMap: f.emi, emissive: '#ffffff', emissiveIntensity: .85, flatShading: false }));
      const roofM = MAT({ color: '#3f3a4a' }), concrete = MAT({ color: '#d6d3d1' }), metal = MAT({ color: '#64748b', metalness: .6, roughness: .4 }), redL = MAT({ color: '#000000', emissive: '#ff3b3b', emissiveIntensity: 3, vertexColors: false }),
        gold = MAT({ color: '#d4a64a', metalness: .7, roughness: .35 }), awn = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#14b8a6'].map(c => MAT({ color: c, vertexColors: false })), lamp = MAT({ color: '#000000', emissive: '#fff1c4', emissiveIntensity: 2.4, vertexColors: false }),
        tree = MAT({ color: '#2f7d3a' }), trunk = MAT({ color: '#5b3a22' }), water = MAT({ color: '#7c4a2d' });
      const tower = (put, x, zz, w, h, d, kind) => { // a few silhouettes so the skyline reads as many different buildings
        const mt = bm[kind % bm.length], ux = w / 70, uy = h / 70;
        if (kind % 5 === 0) { put(mt, G.box, x, gy() + h * .35, zz, w, h * .7, d, 0, 0, 0, ux, uy * .7, tint(1, .2)); put(mt, G.box, x, gy() + h * .8, zz, w * .72, h * .3, d * .72, 0, 0, 0, ux * .72, uy * .3); put(mt, G.box, x, gy() + h * 1.02, zz, w * .44, h * .16, d * .44, 0, 0, 0, ux * .44, uy * .16); put(metal, G.cyl6, x, gy() + h * 1.2, zz, 4, h * .22, 4); put(redL, G.box, x, gy() + h * 1.32, zz, 7, 7, 7); }
        else if (kind % 5 === 1) { put(mt, G.cyl, x, gy() + h / 2, zz, w, h, w, 0, 0, 0, ux * 3, uy, tint(1, .2)); put(gold, G.cone, x, gy() + h + w * .5, zz, w * .9, w, w * .9); }
        else if (kind % 5 === 2) { put(mt, G.box, x, gy() + h / 2, zz, w, h, d, 0, 0, 0, ux, uy, tint(1, .25)); put(roofM, G.box, x, gy() + h + 4, zz, w + 6, 8, d + 6); put(water, G.cyl, x + w * .2, gy() + h + 26, zz, 22, 30, 22); put(water, G.cone, x + w * .2, gy() + h + 48, zz, 26, 14, 26); }
        else if (kind % 5 === 3) { put(mt, G.box, x, gy() + h / 2, zz, w, h, d, 0, 0, 0, ux, uy, tint(1, .25)); put(gold, G.sph, x, gy() + h, zz, w * .7, w * .5, w * .7); put(metal, G.cyl6, x, gy() + h + w * .3, zz, 3, 60, 3); }
        else { put(mt, G.box, x, gy() + h / 2, zz, w, h, d, 0, 0, 0, ux, uy, tint(1, .25)); put(roofM, G.box, x - w * .2, gy() + h + 10, zz, w * .3, 20, d * .3); put(metal, G.box, x + w * .2, gy() + h + 6, zz, w * .25, 12, d * .3); }
      };
      [[-5600, 22, 520, 1150], [-3800, 16, 420, 950], [-2500, 11, 320, 720]].forEach(([z, n, w0, h0], li) => layer(z, lenFor(z), put => { const L = lenFor(z); for (let i = 0; i < n * q + 6; i++) { const w = w0 * (.4 + rs() * .55), h = h0 * (.3 + rs() * .75); tower(put, rs() * L, (rs() - .5) * 600, w, h, w * (.7 + rs() * .4), (rs() * 50) | 0); } }));
      // near block across the avenue: shops with awnings and signs, apartment blocks, lamps, trees
      const SIGNS = [['AETHER COLA', '#b91c1c', '#fde68a'], ['NOVA NEWS', '#1e3a8a', '#e0f2fe'], ['PIZZA ORBIT', '#166534', '#fef08a'], ['SKY TRANSIT', '#0f172a', '#67e8f9'], ['CAFE 24/7', '#7c2d12', '#ffedd5'], ['ARCADE', '#581c87', '#f0abfc']].map(s => sign(s[0], s[1], s[2]));
      const block = layer(-1720, lenFor(-1720), put => { const L = lenFor(-1720); let x = 0, k = 0;
        while (x < L - 120) { const w = 140 + rs() * 160, h = rs() < .65 ? 110 + rs() * 110 : 260 + rs() * 260, mt = bm[(k + 1) % bm.length];
          put(mt, G.box, x + w / 2, gy() + h / 2, 0, w - 8, h, 160, 0, 0, 0, w / 70, h / 70, tint(1, .3));
          if (h < 260) { put(awn[k % awn.length], G.box, x + w / 2, gy() + 52, 86, w - 20, 8, 26, -.35, 0, 0); put(SIGNS[k % SIGNS.length], G.box, x + w / 2, gy() + 84, 81, w * .7, 26, 2); }
          else { for (let f = 1; f < h / 70; f++) put(concrete, G.box, x + w / 2, gy() + f * 70, 84, w - 14, 4, 10); }
          x += w; k++; } });
      // street furniture on both curbs
      layer(-1100, lenFor(-1100), put => { const L = lenFor(-1100); for (let x = 60; x < L; x += 260) { put(metal, G.cyl6, x, gy() + 60, 0, 4, 120, 4); put(metal, G.box, x + 14, gy() + 118, 0, 30, 3, 4); put(lamp, G.box, x + 26, gy() + 114, 0, 10, 4, 8); } for (let x = 190; x < L; x += 520) { put(trunk, G.cyl6, x, gy() + 22, 0, 6, 44, 6); put(tree, G.ico, x, gy() + 62, 0, 50, 50, 50, 0, rs() * 3, 0, 1, 1, tint(1, .3)); } });
      layer(-1480, lenFor(-1480), put => { const L = lenFor(-1480); for (let x = 130; x < L; x += 260) { put(metal, G.cyl6, x, gy() + 60, 0, 4, 120, 4); put(metal, G.box, x - 14, gy() + 118, 0, 30, 3, 4); put(lamp, G.box, x - 26, gy() + 114, 0, 10, 4, 8); }
        for (let x = 400; x < L; x += 900) { put(metal, G.box, x, gy() + 34, -10, 70, 4, 18); put(metal, G.box, x - 32, gy() + 17, -10, 3, 34, 3); put(metal, G.box, x + 32, gy() + 17, -10, 3, 34, 3); put(SIGNS[3], G.box, x, gy() + 50, -10, 60, 16, 2); } });
      // billboards high on the far blocks
      const bb = layer(-2300, lenFor(-2300), put => { const L = lenFor(-2300); for (let i = 0; i < 6; i++) { const x = (i + .5) / 6 * L, y = gy() + 300 + rs() * 300; put(metal, G.box, x, y - 40, -20, 8, 80, 8); put(SIGNS[i % SIGNS.length], G.box, x, y + 30, 0, 230, 70, 4); } });
      // traffic: cars, taxis, buses, police with light bars; a military convoy pushes the other way
      const span = 7000, pick = () => { const r = rs(); return r < .5 ? 'car' : r < .63 ? 'suv' : r < .73 ? 'taxi' : r < .8 ? 'bus' : r < .9 ? 'police' : r < .96 ? 'truck' : 'tank'; };
      const ry = A.gy + 1; fleet(KIT, traffic([[-1175, 3.4, ry], [-1222, 2.6, ry], [-1270, 2, ry]], 9, pick, span).concat(traffic([[-1320, -2, ry], [-1368, -2.8, ry], [-1415, -3.6, ry]], 9, pick, span)).concat(traffic([[-1068, 0, A.gy + 1]], 14, () => rs() < .7 ? 'car' : 'suv', span)), { span });
      fleet(KIT, crowd([-1110, -1130, -1460, -1485], 22 * q + 6, A.gy + 3, span), { span });
      // military over the city: gunships with spinning rotors, a storm-deck airship, sweeping searchlights
      const heli = () => { const g = new T.Group(), m = MAT({ color: '#3f4a2c', vertexColors: false }), dk = MAT({ color: '#1f2937', vertexColors: false });
        const b = new T.Mesh(G.box, m); b.scale.set(60, 20, 20); g.add(b); const tl = new T.Mesh(G.box, m); tl.scale.set(56, 6, 6); tl.position.set(-52, 4, 0); g.add(tl); const fin = new T.Mesh(G.box, m); fin.scale.set(8, 18, 3); fin.position.set(-78, 12, 0); g.add(fin);
        const gl = new T.Mesh(G.box, MAT({ color: '#93c5fd', vertexColors: false })); gl.scale.set(16, 12, 18); gl.position.set(26, 2, 0); g.add(gl); const r = new T.Mesh(G.box, dk); r.scale.set(130, 1.5, 6); r.position.y = 15; g.add(r); const r2 = r.clone(); r2.rotation.y = Math.PI / 2; g.add(r2);
        const sk = new T.Mesh(G.box, dk); sk.scale.set(50, 2, 2); sk.position.set(0, -14, 9); g.add(sk); const sk2 = sk.clone(); sk2.position.z = -9; g.add(sk2); return g; };
      const air = layer(-2000, lenFor(-2000), () => { });
      for (let i = 0; i < 4; i++) { const h = heli(); h.scale.setScalar(1.3); const vx = (rs() < .5 ? 1 : -1) * (1.4 + rs()); if (vx < 0) h.rotation.y = Math.PI; ride(air, h, rs() * air.len, 260 + rs() * 380, (rs() - .5) * 600, (o, t, df) => { o.position.x += vx * df; if (o.position.x > air.len * 2) o.position.x -= air.len * 3; if (o.position.x < -air.len) o.position.x += air.len * 3; o.position.y += Math.sin(t * 1.4 + o.id) * .15; o.children[4].rotation.y += .5 * df; o.children[5].rotation.y += .5 * df; }); }
      const deck = new T.Group(); { const m = MAT({ color: '#475569', vertexColors: false }); const hull = new T.Mesh(G.sph, m); hull.scale.set(900, 140, 220); deck.add(hull); const pl = new T.Mesh(G.box, m); pl.scale.set(700, 20, 260); pl.position.y = -70; deck.add(pl); const lt = new T.Mesh(G.box, MAT({ color: '#000000', emissive: '#7dd3fc', emissiveIntensity: 2, vertexColors: false })); lt.scale.set(640, 4, 262); lt.position.y = -82; deck.add(lt); }
      ride(A.layers[1], deck, A.layers[1].len * .3, 1300, -200, (o, t) => { o.position.y = 1300 + Math.sin(t * .3) * 20; });
      const beamM = BAS({ color: '#fff7d6', opacity: .1, side: T.DoubleSide }), beamG = new T.ConeGeometry(70, 1400, 16, 1, true); beamG.translate(0, 700, 0); G.beam = beamG;
      for (let i = 0; i < 5; i++) { const b = new T.Mesh(beamG, beamM), ph = rs() * 6; ride(A.layers[2], b, rs() * A.layers[2].len, gy() + 400, 0, (o, t) => { o.rotation.z = Math.sin(t * .5 + ph) * .55; o.rotation.x = Math.sin(t * .3 + ph) * .2; }); }
      for (let i = 0; i < 8 * q + 3; i++) { const s = new T.Sprite(spriteM('#ffb4a2', .3)); s.scale.set(1600 + rs() * 1400, 300 + rs() * 200, 1); ride(A.layers[0], s, rs() * A.layers[0].len, 1000 + rs() * 900, (rs() - .5) * 800); }
      weather(0, 300, '#fde68a', [1400, 800, 1600], [-.3, .2, 4], 4);
    },
    // W2 Emerald Ravines - the hive grows in the green dark
    jungle() {
      A.gy = -440; A.fogNear = 120; A.fogFar = 3000; A.tilt = .08;
      sky('#010a07', '#0a3324', '#020c08', { fog: '#062a1e', sun: '#a3e635', sx: .3, sy: .55 });
      amb.intensity = .3; sunL.color.set(lc('#bbf7d0')); sunL.intensity = 1.1; sunL.position.set(200, 800, 300); scene.add(track(new T.HemisphereLight(lc('#34d399'), lc('#022c22'), .6)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#0b2117'; g.fillRect(0, 0, w, h); for (let i = 0; i < 600; i++) { g.fillStyle = ['#14532d', '#0f3d24', '#1a4d2e', '#052e16'][i % 4]; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 9, 0, 6.3); g.fill(); } }, { tile: 380 });
      const rock = MAT({ color: '#1f3b2c', roughness: 1 }), bark = MAT({ color: '#2d1f12', roughness: 1 }), leaf = MAT({ color: '#166534', roughness: .9 }), leaf2 = MAT({ color: '#14532d', roughness: .9 }), vine = MAT({ color: '#15803d' });
      const hive = MAT({ color: '#3f6212', emissive: '#a3e635', emissiveIntensity: .9, roughness: .5 }), hiveC = MAT({ color: '#1a2e05', emissive: '#d9f99d', emissiveIntensity: 2.2, vertexColors: false });
      layer(-2700, lenFor(-2700), put => { const L = lenFor(-2700); for (let i = 0; i < 40 * q + 10; i++) { const x = rs() * L, h = 700 + rs() * 1500, w = 300 + rs() * 500; put(rock, G.ico, x, gy() + h * .35, (rs() - .5) * 300, w, h, 400, 0, rs() * 3, 0, 1, 1, tint(.9, .35)); }
        for (let i = 0; i < 26 * q; i++) { const x = rs() * L, l = 300 + rs() * 600; put(vine, G.cyl6, x, 700 - l / 2 + rs() * 300, 220, 6, l, 6, 0, 0, (rs() - .5) * .1); } });
      layer(-1400, lenFor(-1400), put => { const L = lenFor(-1400); for (let i = 0; i < 12 * q + 4; i++) { const x = rs() * L, h = 500 + rs() * 700, zz = (rs() - .5) * 400; put(bark, G.cyl6, x, gy() + h / 2, zz, 26 + rs() * 20, h, 26 + rs() * 20, 0, 0, (rs() - .5) * .12);
          for (let c = 0; c < 3; c++) put(c % 2 ? leaf : leaf2, G.ico, x + (rs() - .5) * 140, gy() + h - 40 + rs() * 90, zz + (rs() - .5) * 80, 150 + rs() * 110, 90 + rs() * 60, 140 + rs() * 90, 0, rs() * 3, 0, 1, 1, tint(1, .3)); }
        for (let i = 0; i < 8; i++) { const x = rs() * L, y = gy() + 200 + rs() * 600, s = 70 + rs() * 90; put(hive, G.sph, x, y, -40, s, s * 1.35, s, 0, 0, 0, 1, 1, tint(1, .2)); for (let k = 0; k < 5; k++) put(hiveC, G.cyl6, x + (rs() - .5) * s * .6, y + (rs() - .5) * s * .9, -40 + s * .48, s * .14, s * .14, 4, Math.PI / 2, 0, 0); } });
      layer(-520, lenFor(-520), put => { const L = lenFor(-520); for (let i = 0; i < 7; i++) { const x = rs() * L, l = 120 + rs() * 260; put(vine, G.cyl6, x, 520 - l / 2, (rs() - .5) * 120, 5, l, 5, 0, 0, (rs() - .5) * .15); put(leaf, G.cone4, x, 520 - l, 0, 30, 50, 6, Math.PI, 0, 0); }
        for (let i = 0; i < 14; i++) { const x = rs() * L; put(i % 2 ? leaf : leaf2, G.cone, x, gy() + 30, (rs() - .5) * 200, 90 + rs() * 90, 90 + rs() * 120, 90, 0, rs() * 3, 0, 1, 1, tint(1, .4)); } });
      weather(0, 340, '#d9f99d', [1300, 650, 1300], [-.3, .25, 6], 9);
      weather(0, 500, '#4ade80', [1300, 650, 1500], [-.6, -.15, 3], 4);
    },
    // W3 Rust Dunes of Mars - scrap winds and iron canyons
    desert() {
      A.gy = -420; A.fogNear = 300; A.fogFar = 5000; A.tilt = .05;
      sky('#2a0e05', '#b4542a', '#3b1406', { fog: '#8a3d16', sun: '#fde68a', sx: .55, sy: .22 });
      amb.intensity = .4; sunL.color.set(lc('#fed7aa')); sunL.intensity = 2; sunL.position.set(500, 300, -300); scene.add(track(new T.HemisphereLight(lc('#fdba74'), lc('#431407'), .6)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#9a3e15'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.fillStyle = 'rgba(' + (Math.sin(y * .35) > 0 ? '255,200,150,.06' : '60,15,5,.08') + ')'; g.fillRect(0, y + Math.sin(y) * 2, w, 2); } for (let i = 0; i < 200; i++) { g.fillStyle = 'rgba(40,10,4,.35)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, { tile: 420 });
      const sand = MAT({ color: '#b45324', roughness: 1 }), sand2 = MAT({ color: '#9a3412', roughness: 1 }), mesa = MAT({ color: '#7c2d12', roughness: 1 }), rust = MAT({ color: '#7c3a17', metalness: .6, roughness: .7 }), iron = MAT({ color: '#44403c', metalness: .8, roughness: .5 });
      layer(-3800, lenFor(-3800), put => { const L = lenFor(-3800); for (let i = 0; i < 16; i++) { const x = rs() * L, h = 400 + rs() * 900, w = 400 + rs() * 1100; put(mesa, G.mesa, x, gy() + h / 2, (rs() - .5) * 400, w, h, w * .6, 0, rs(), 0, 1, 1, tint(1, .3)); put(mesa, G.mesa, x + w * .3, gy() + h * .3, 100, w * .7, h * .6, w * .5, 0, rs(), 0, 1, 1, tint(.85, .2)); } });
      layer(-1900, lenFor(-1900), put => { const L = lenFor(-1900); for (let i = 0; i < 18; i++) put(sand, G.sph, rs() * L, gy() - 20, (rs() - .5) * 600, 900 + rs() * 900, 220 + rs() * 200, 500, 0, 0, 0, 1, 1, tint(1, .2));
        // the wrecked excavator that gave the boss its name, and half-buried gears
        const x0 = L * .3; put(rust, G.box, x0, gy() + 170, 0, 520, 260, 260, 0, 0, .05); put(rust, G.box, x0 + 120, gy() + 380, 0, 200, 180, 200, 0, 0, .05); put(iron, G.box, x0 - 340, gy() + 400, 0, 520, 40, 40, 0, 0, -.65); put(iron, G.box, x0 - 600, gy() + 240, 0, 360, 34, 34, 0, 0, .9);
        put(rust, G.cone4, x0 - 760, gy() + 110, 0, 200, 170, 180, 0, .78, Math.PI * .85); for (let t = 0; t < 6; t++) put(iron, G.cone4, x0 - 830 + t * 26, gy() + 20, 60, 22, 60, 22, Math.PI, 0, 0);
        put(iron, G.box, x0 - 60, gy() + 40, 120, 640, 80, 70); put(iron, G.box, x0 - 60, gy() + 40, -120, 640, 80, 70);
        for (let i = 0; i < 4; i++) { const x = rs() * L, s = 260 + rs() * 380; put(rust, G.gear, x, gy() + s * .25, (rs() - .5) * 400, s, s, s, (rs() - .5) * .5, (rs() - .5) * .8, rs() * 3); }
        for (let i = 0; i < 6; i++) { const x = rs() * L, h = 320 + rs() * 360; put(iron, G.box, x, gy() + h / 2, 300, 18, h, 18, 0, 0, (rs() - .5) * .3); put(iron, G.box, x, gy() + h, 300, 140, 12, 12); } });
      layer(-650, lenFor(-650), put => { const L = lenFor(-650); for (let i = 0; i < 12; i++) put(sand2, G.sph, rs() * L, gy() - 10, (rs() - .5) * 200, 500 + rs() * 500, 120 + rs() * 90, 260, 0, 0, 0, 1, 1, tint(1, .2));
        for (let i = 0; i < 14; i++) { const x = rs() * L; put(i % 3 ? iron : rust, i % 2 ? G.box : G.cyl, x, gy() + 20, (rs() - .5) * 200, 40 + rs() * 120, 20 + rs() * 50, 30 + rs() * 60, rs(), rs(), rs()); put(mesa, G.ico, rs() * L, gy() + 10, (rs() - .5) * 200, 50 + rs() * 70, 40 + rs() * 40, 50 + rs() * 60); } });
      weather(0, 1300, '#fdba74', [1500, 700, 1500], [-9, -.4, 18], 6);
    },
    // W6 Frostbite Reach - a frozen armada drifts in silence: icy mountains, warships locked in the ice, aurora
    ice() {
      A.gy = -420; A.fogNear = 300; A.fogFar = 4800; A.tilt = .05;
      sky('#030b18', '#2b6a8f', '#0b2236', { fog: '#1b4a66', aur: '#34d399', sun: '#e0f2fe', sx: -.5, sy: .1 });
      amb.intensity = .45; sunL.color.set(lc('#e0f2fe')); sunL.intensity = 1.4; sunL.position.set(-500, 400, 200); scene.add(track(new T.HemisphereLight(lc('#bae6fd'), lc('#0c4a6e'), .7)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#4f7a96'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(224,242,254,.4)'; g.lineWidth = 1; for (let i = 0; i < 26; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - .5) * 60; y += (Math.random() - .5) * 60; g.lineTo(x, y); } g.stroke(); } g.fillStyle = 'rgba(12,74,110,.18)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 30, 3); }, { tile: 700, rough: .25, metal: .1 });
      const rockM = MAT({ color: '#334155', roughness: .9 }), snow = MAT({ color: '#f1f5f9', roughness: .6 }), iceM = MAT({ color: '#7dd3fc', roughness: .15, metalness: .1, transparent: true, opacity: .85 }), hull = MAT({ color: '#94a3b8', metalness: .5, roughness: .55 }), frost = MAT({ color: '#e0f2fe', roughness: .5 }), lamp = MAT({ color: '#000000', emissive: '#7dd3fc', emissiveIntensity: 1.6, vertexColors: false });
      layer(-4000, lenFor(-4000), put => { const L = lenFor(-4000); for (let i = 0; i < 22; i++) { const x = rs() * L, h = 900 + rs() * 1600, w = h * (.8 + rs() * .6), zz = (rs() - .5) * 600; put(rockM, G.cone, x, gy() + h / 2, zz, w, h, w * .7, 0, rs() * 3, 0, 1, 1, tint(1, .3)); put(snow, G.cone, x, gy() + h * .82, zz + 2, w * .37, h * .36, w * .27, 0, 0, 0, 1, 1, tint(1, .1)); } });
      layer(-1900, lenFor(-1900), put => { const L = lenFor(-1900);
        for (let s = 0; s < 4; s++) { // a warship frozen at a tilt, half under the ice
          const x = (s + .3 + rs() * .4) / 4 * L, tl = (rs() - .5) * .4, len = 520 + rs() * 360, zz = (rs() - .5) * 500;
          put(hull, G.box, x, gy() + 40, zz, len, 120, 110, 0, 0, tl); put(hull, G.cone4, x + len * .55, gy() + 40 + Math.sin(tl) * len * .55, zz, 110, 160, 110, 0, Math.PI / 4, -Math.PI / 2 + tl);
          put(hull, G.box, x - len * .1, gy() + 150 + Math.sin(tl) * -len * .1, zz, 120, 110, 80, 0, 0, tl); put(hull, G.box, x - len * .1, gy() + 240, zz, 50, 90, 50, 0, 0, tl);
          for (let b = 0; b < 2; b++) put(hull, G.cyl, x + len * (.18 + b * .14), gy() + 120 + Math.sin(tl) * len * .2, zz, 14, 160, 14, 0, 0, Math.PI / 2 + tl - .2);
          put(frost, G.box, x, gy() + 104 + Math.sin(tl) * 0, zz, len * .95, 14, 112, 0, 0, tl); put(lamp, G.box, x - len * .1, gy() + 170, zz + 41, 70, 10, 2, 0, 0, tl); }
        for (let i = 0; i < 18; i++) { const x = rs() * L, h = 200 + rs() * 500; put(iceM, G.cone4, x, gy() + h / 2 - 30, (rs() - .5) * 600, 60 + rs() * 90, h, 60 + rs() * 90, 0, rs(), (rs() - .5) * .3); } });
      layer(-650, lenFor(-650), put => { const L = lenFor(-650); for (let i = 0; i < 18; i++) { const x = rs() * L; put(i % 3 ? iceM : snow, i % 2 ? G.oct : G.ico0, x, gy() + 10, (rs() - .5) * 200, 50 + rs() * 110, 60 + rs() * 140, 50 + rs() * 100, rs(), rs() * 3, rs() * .4); } for (let i = 0; i < 10; i++) put(snow, G.sph, rs() * L, gy() - 8, (rs() - .5) * 200, 300 + rs() * 300, 40 + rs() * 30, 120); });
      weather(0, 1400, '#ffffff', [1400, 800, 1600], [-1.4, -1.6, 14], 8);
    },
    // W7 Cinder Foundry - a moon forged into a weapon
    foundry() {
      A.gy = -420; A.fogNear = 200; A.fogFar = 3600; A.tilt = .06;
      sky('#0d0200', '#4a1404', '#120300', { fog: '#2a0a03', sun: '#ea580c', sx: .1, sy: -.02 });
      amb.intensity = .3; sunL.color.set(lc('#fb923c')); sunL.intensity = 1.2; sunL.position.set(0, 200, -600); scene.add(track(new T.HemisphereLight(lc('#f97316'), lc('#1c0a00'), .55)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#1c1917'; g.fillRect(0, 0, w, h); g.strokeStyle = '#0c0a09'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.strokeRect(i * 52, 0, 52, h); } for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(68,64,60,.4)'; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } },
        { tile: 640, emi: (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffb347'; g.lineWidth = 10; g.shadowColor = '#f97316'; g.shadowBlur = 16; g.beginPath(); g.moveTo(0, 90); g.bezierCurveTo(80, 60, 170, 140, 256, 90); g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(0, 200); g.bezierCurveTo(90, 230, 160, 170, 256, 200); g.stroke(); }, emiCol: '#f97316', ei: 1.6, drift: 0 });
      const iron = MAT({ color: '#292524', metalness: .8, roughness: .45 }), iron2 = MAT({ color: '#44403c', metalness: .7, roughness: .5 }), hot = MAT({ color: '#000000', emissive: '#ea580c', emissiveIntensity: 1.5, vertexColors: false }), molten = MAT({ color: '#000000', emissive: '#fb923c', emissiveIntensity: 1.8, vertexColors: false }), slag = MAT({ color: '#1c1917', roughness: 1, emissive: '#7c2d12', emissiveIntensity: .5 });
      layer(-3300, lenFor(-3300), put => { const L = lenFor(-3300); for (let i = 0; i < 14; i++) { const x = rs() * L, h = 500 + rs() * 900, w = 700 + rs() * 900; put(slag, G.cone, x, gy() + h / 2, (rs() - .5) * 400, w, h, w * .6, 0, rs() * 3, 0, 1, 1, tint(.8, .3)); }
        for (let i = 0; i < 10; i++) { const x = rs() * L, h = 900 + rs() * 900; put(iron, G.cyl, x, gy() + h / 2, 200, 90, h, 90); put(hot, G.cyl, x, gy() + h, 200, 96, 30, 96); } });
      layer(-1600, lenFor(-1600), put => { const L = lenFor(-1600);
        for (let i = 0; i < 6; i++) { const x = rs() * L, h = 500 + rs() * 600, r = 60 + rs() * 50; put(iron2, G.cyl, x, gy() + h / 2, (rs() - .5) * 300, r, h, r, 0, 0, 0, 1, 1, tint(1, .3)); put(hot, G.cyl, x, gy() + h + 8, 0, r * 1.08, 18, r * 1.08); put(iron2, G.cyl, x, gy() + h * .6, 0, r * 1.15, 16, r * 1.15); }
        for (let c = 0; c < 2; c++) { // gantry crane pouring a crucible
          const x = (c + .5) / 2 * L, h = 640; put(iron, G.box, x - 240, gy() + h / 2, 0, 30, h, 30); put(iron, G.box, x + 240, gy() + h / 2, 0, 30, h, 30); put(iron, G.box, x, gy() + h, 0, 560, 34, 40);
          put(iron2, G.cyl, x - 40, gy() + h - 120, 0, 120, 110, 120, 0, 0, .6); put(molten, G.cyl, x + 30, gy() + h / 2 - 140, 0, 14, h - 260, 14, 0, 0, 0); put(molten, G.sph, x + 30, gy() + 20, 0, 140, 40, 90); }
      });
      layer(-700, lenFor(-700), put => { const L = lenFor(-700);
        for (let i = 0; i < 8; i++) put(slag, G.ico, rs() * L, gy() + 10, (rs() - .5) * 200, 80 + rs() * 90, 40 + rs() * 40, 90, 0, rs() * 3, 0); });
      for (let i = 0; i < 8 * q + 2; i++) { const s = new T.Sprite(spriteM('#1c1917', .55)); s.scale.set(900 + rs() * 700, 500 + rs() * 300, 1); const ly = A.layers[1]; ride(ly, s, rs() * ly.len, 300 + rs() * 500, -200 - rs() * 300); }
      weather(0, 900, '#fb923c', [1300, 750, 1400], [-.5, 2.4, 10], 6);
    },
    // W8 Abyssal Trench - pressure, lights, and teeth
    deep() {
      A.gy = -440; A.fogNear = 80; A.fogFar = 2600; A.tilt = -.02; A.speed = 1.8;
      sky('#0b4a5c', '#03222d', '#010609', { fog: '#02202a', sun: '#67e8f9', sx: -.2, sy: .9 });
      amb.intensity = .35; sunL.color.set(lc('#67e8f9')); sunL.intensity = .9; sunL.position.set(0, 1000, 0); scene.add(track(new T.HemisphereLight(lc('#22d3ee'), lc('#010609'), .55)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#0b2a2e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = ['#0f3b40', '#082024', '#134e4a'][i % 3]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 4 + Math.random() * 14, 2 + Math.random() * 5, 0, 0, 6.3); g.fill(); } }, { tile: 420 });
      const rock = MAT({ color: '#0f2f35', roughness: 1 }), kelp = MAT({ color: '#166534', roughness: .8, emissive: '#052e16', emissiveIntensity: .4 }), coral = MAT({ color: '#be185d', roughness: .7 }), coral2 = MAT({ color: '#c2410c', roughness: .7 }), bio = MAT({ color: '#000000', emissive: '#5eead4', emissiveIntensity: 2.4, vertexColors: false }), bio2 = MAT({ color: '#000000', emissive: '#a78bfa', emissiveIntensity: 2.2, vertexColors: false });
      layer(-2400, lenFor(-2400), put => { const L = lenFor(-2400); for (let i = 0; i < 30; i++) { const x = rs() * L, h = 900 + rs() * 1400, w = 260 + rs() * 420; put(rock, G.ico, x, gy() + h * .4, (rs() - .5) * 300, w, h, 300, 0, rs() * 3, 0, 1, 1, tint(.9, .4)); } for (let i = 0; i < 26; i++) put(bio, G.sph, rs() * L, gy() + rs() * 900, 160, 8, 8, 8); });
      layer(-1150, lenFor(-1150), put => { const L = lenFor(-1150);
        for (let a = 0; a < 3; a++) { const x = (a + .4) / 3 * L, r = 260 + rs() * 120; put(rock, G.half, x, gy(), -100, r * 2, r * 2, r * 3, 0, 0, 0, 1, 1, tint(.9, .2)); }
        for (let i = 0; i < 16; i++) { const x = rs() * L, h = 280 + rs() * 520, zz = (rs() - .5) * 300; for (let s = 0; s < 6; s++) put(kelp, G.box, x + Math.sin(s * 1.3 + i) * 14, gy() + h * (s + .5) / 6, zz, 10, h / 6 + 4, 24, 0, s * .4, Math.sin(s + i) * .15); }
        for (let i = 0; i < 9; i++) { const x = rs() * L; put(rock, G.ico, x, gy() + 30, -40, 140, 90, 120); put(bio2, G.sph, x, gy() + 75, -40, 26, 26, 26); }
        for (let i = 0; i < 16; i++) put(bio, G.sph, rs() * L, gy() + 100 + rs() * 700, (rs() - .5) * 300, 6, 6, 6); });
      layer(-460, lenFor(-460), put => { const L = lenFor(-460); for (let i = 0; i < 22; i++) { const x = rs() * L, zz = (rs() - .5) * 150; if (i % 3 === 0) { for (let b = 0; b < 4; b++) put(coral, G.cyl6, x + (b - 1.5) * 16, gy() + 40 + b * 6, zz, 12, 90 + b * 20, 12, 0, 0, (b - 1.5) * .3); } else if (i % 3 === 1) put(coral2, G.sph, x, gy() + 20, zz, 70, 50, 60); else put(rock, G.ico, x, gy() + 10, zz, 90 + rs() * 80, 50 + rs() * 50, 90); }
        for (let i = 0; i < 5; i++) { const x = rs() * L, h = 200 + rs() * 220; for (let s = 0; s < 5; s++) put(kelp, G.box, x + Math.sin(s * 1.4 + i) * 10, gy() + h * (s + .5) / 5, 60, 7, h / 5 + 3, 18, 0, s * .5, Math.sin(s + i) * .2); } });
      // god rays from the surface
      const rays = layer(-900, lenFor(-900), () => { }); for (let i = 0; i < 6; i++) { const m = new T.Mesh(G.plane, BAS({ color: '#67e8f9', opacity: .06 + rs() * .05, side: T.DoubleSide })); m.scale.set(120 + rs() * 120, 2200, 1); m.rotation.z = -.25 + rs() * .1; ride(rays, m, rs() * rays.len, 300, (rs() - .5) * 400); }
      for (let i = 0; i < 6; i++) { const s = new T.Sprite(glowM(i % 2 ? '#5eead4' : '#fde68a', .55)); s.scale.setScalar(60 + rs() * 50); ride(A.layers[1], s, rs() * A.layers[1].len, gy() + 200 + rs() * 600, -60, (o, t) => { o.material.opacity = .3 + .3 * Math.sin(t * 1.4 + o.position.x * .01); }); }
      weather(2, 380, '#a5f3fc', [1300, 700, 1300], [-.2, 1.5, 8], 10);
      weather(0, 700, '#5eead4', [1300, 700, 1400], [-.3, .15, 5], 4);
    },
    // W9 Neon Mainframe - the machine mind is awake: a neon cyber city on a glowing grid
    cyber() {
      A.gy = -700; A.fogNear = 700; A.fogFar = 7000; A.tilt = .09;
      sky('#030008', '#2a0b4a', '#05010d', { fog: '#14062e', sun: '#c026d3', sx: .2, sy: .05 });
      amb.intensity = .25; sunL.color.set(lc('#a78bfa')); sunL.intensity = .6; scene.add(track(new T.HemisphereLight(lc('#7c3aed'), lc('#02130f'), .5)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#04020a'; g.fillRect(0, 0, w, h); }, { tile: 300, rough: .3, metal: .5, emi: (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4ade80'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2); g.lineWidth = 1; g.globalAlpha = .4; g.strokeRect(w / 2, 0, 0, h); g.strokeRect(0, h / 2, w, 0); }, emiCol: '#4ade80', ei: 1.4 });
      const fA = facade('#0b0717', ['#4ade80', '#a3e635', '#22d3ee'], .38, 6, 8), fB = facade('#0a0614', ['#f0abfc', '#c084fc', '#4ade80'], .3, 4, 10);
      const tA = MAT({ map: fA.map, emissiveMap: fA.emi, emissive: '#ffffff', emissiveIntensity: 1.8, roughness: .4, metalness: .5, flatShading: false }), tB = MAT({ map: fB.map, emissiveMap: fB.emi, emissive: '#ffffff', emissiveIntensity: 1.7, roughness: .4, metalness: .5, flatShading: false });
      const neonG = MAT({ color: '#000000', emissive: '#4ade80', emissiveIntensity: 2.6, vertexColors: false }), neonP = MAT({ color: '#000000', emissive: '#e879f9', emissiveIntensity: 2.6, vertexColors: false }), dark = MAT({ color: '#0b0717', metalness: .6, roughness: .4 });
      const tower = (put, mt, x, zz, w, h, d, neon) => { put(mt, G.box, x, gy() + h / 2, zz, w, h, d, 0, 0, 0, w / 66, h / 66, tint(1, .25)); put(neon, G.box, x - w / 2, gy() + h / 2, zz + d / 2, 4, h, 4); put(neon, G.box, x + w / 2, gy() + h / 2, zz + d / 2, 4, h, 4); put(neon, G.box, x, gy() + h, zz + d / 2, w, 4, 4); };
      layer(-3600, lenFor(-3600), put => { const L = lenFor(-3600); for (let i = 0; i < 30 * q + 8; i++) { const w = 220 + rs() * 380, h = 700 + rs() * 1700; tower(put, i % 2 ? tA : tB, rs() * L, (rs() - .5) * 500, w, h, w * .7, i % 3 ? neonP : neonG); } });
      layer(-1700, lenFor(-1700), put => { const L = lenFor(-1700); for (let i = 0; i < 20 * q + 6; i++) { const x = rs() * L, w = 160 + rs() * 240, h = 300 + rs() * 1000, zz = (rs() - .5) * 400; tower(put, i % 2 ? tB : tA, x, zz, w, h, w * .8, i % 2 ? neonG : neonP);
          if (rs() < .4) { put(dark, G.cyl6, x, gy() + h + 80, zz, 8, 160, 8); put(neonG, G.sph, x, gy() + h + 166, zz, 14, 14, 14); } } });
      // holo billboards with scrolling glyphs
      const glyph = canv(256, 128, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, w, h); g.font = 'bold 22px monospace'; for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) { g.fillStyle = ['#4ade80', '#e879f9', '#22d3ee'][(r + c) % 3]; g.globalAlpha = .4 + Math.random() * .6; g.fillText(String.fromCharCode(0x30A0 + (Math.random() * 90 | 0)), c * 18 + 4, r * 25 + 22); } g.globalAlpha = 1; g.strokeStyle = '#4ade80'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4); });
      const gt = track(new T.CanvasTexture(glyph)); gt.wrapS = T.RepeatWrapping; const holoM = BAS({ map: gt, opacity: .75, side: T.DoubleSide });
      const hb = layer(-1100, lenFor(-1100), () => { }); for (let i = 0; i < 5; i++) { const m = new T.Mesh(G.plane, holoM); m.scale.set(260, 130, 1); ride(hb, m, (i + .5) / 5 * hb.len, 120 + rs() * 380, (rs() - .5) * 300); }
      A.upd.push(df => { gt.offset.y = (gt.offset.y + .002 * df) % 1; holoM.opacity = Math.random() < .015 ? .2 : .75; });
      layer(-800, lenFor(-800), put => { const L = lenFor(-800); for (let i = 0; i < 4; i++) { const x = rs() * L, h = 160 + rs() * 260; put(dark, G.box, x, gy() + h / 2, 0, 22, h, 22); put(i % 2 ? neonG : neonP, G.box, x, gy() + h / 2, 12, 5, h, 2); }
        for (let i = 0; i < 8; i++) put(i % 2 ? neonG : neonP, G.box, rs() * L, gy() + 200 + rs() * 600, (rs() - .5) * 200, 16, 16, 16, rs(), rs(), rs()); });
      weather(3, 900, '#4ade80', [1400, 800, 1500], [-.1, 3.2, 0], 16);
    },
    // W10 Chrono Spire - the last hour of the last world: a clockwork city frozen at sunset
    clock() {
      A.gy = -420; A.fogNear = 300; A.fogFar = 4600; A.tilt = .06;
      sky('#140c1e', '#d97706', '#2a1804', { fog: '#6b3f12', sun: '#fde68a', sx: .3, sy: .05 });
      amb.intensity = .45; sunL.color.set(lc('#fcd34d')); sunL.intensity = 2; sunL.position.set(400, 120, -800); scene.add(track(new T.HemisphereLight(lc('#fbbf24'), lc('#1c1006'), .55)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#3a2a12'; g.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#4a3618' : '#33240f'; g.fillRect(x * 32 + (y % 2) * 16, y * 32, 30, 30); } }, { tile: 340, rough: .6, metal: .3 });
      const brass = MAT({ color: '#a16207', metalness: .85, roughness: .35 }), stone = MAT({ color: '#57452a', roughness: .9 }), dark = MAT({ color: '#1c140a', roughness: .8 }), glowY = MAT({ color: '#000000', emissive: '#fde047', emissiveIntensity: 1.8, vertexColors: false });
      const face = canv(128, 128, (g, w) => { g.fillStyle = '#fef3c7'; g.beginPath(); g.arc(64, 64, 62, 0, 6.3); g.fill(); g.strokeStyle = '#78350f'; g.lineWidth = 5; g.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.lineWidth = i % 3 ? 3 : 6; g.beginPath(); g.moveTo(64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48); g.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); g.stroke(); } });
      const faceM = track(new T.MeshStandardMaterial({ map: srgb(new T.CanvasTexture(face)), emissive: lc('#fde68a'), emissiveIntensity: .45, roughness: .5 })), handM = track(new T.MeshBasicMaterial({ color: lc('#1c1006') }));
      layer(-3700, lenFor(-3700), put => { const L = lenFor(-3700); for (let i = 0; i < 26; i++) { const x = rs() * L, h = 800 + rs() * 1700, w = 70 + rs() * 120, zz = (rs() - .5) * 500; put(dark, G.cyl6, x, gy() + h / 2, zz, w, h, w, 0, 0, 0, 1, 1, tint(1, .3)); put(dark, G.cone, x, gy() + h + 160, zz, w * 1.3, 320, w * 1.3); if (rs() < .4) put(glowY, G.box, x, gy() + h * .7, zz + w / 2, w * .5, 30, 2); } });
      // giant gears turning behind the city
      const gl = layer(-2600, lenFor(-2600), () => { }); for (let i = 0; i < 4; i++) { const s = 500 + rs() * 600, m = new T.Mesh(G.gear, brass); m.scale.setScalar(s); const sp = (i % 2 ? 1 : -1) * (.002 + rs() * .002) / (s / 600); ride(gl, m, (i + .5) / 4 * gl.len, gy() + s * .45 + rs() * 300, (rs() - .5) * 300, (o, t) => { o.rotation.z = t * 60 * sp; }); }
      const ct = layer(-1500, lenFor(-1500), put => { const L = lenFor(-1500); for (let i = 0; i < 12; i++) { const x = rs() * L, w = 140 + rs() * 120, h = 500 + rs() * 700, zz = (rs() - .5) * 300; put(stone, G.box, x, gy() + h / 2, zz, w, h, w, 0, 0, 0, 1, 1, tint(1, .25)); put(brass, G.cone4, x, gy() + h + w * .5, zz, w * 1.5, w, w * 1.5, 0, Math.PI / 4, 0); put(brass, G.box, x, gy() + h - w * .6, zz, w * 1.08, 14, w * 1.08); }
        for (let a = 0; a < 3; a++) { const x = rs() * L; put(stone, G.half, x, gy() + 120, 150, 380, 300, 500, 0, 0, 0); } });
      for (let i = 0; i < 6; i++) { // clock faces with moving hands on the towers' fronts
        const g = new T.Group(), f = new T.Mesh(track(new T.CircleGeometry(.5, 32)), faceM), h1 = new T.Mesh(G.box, handM), h2 = new T.Mesh(G.box, handM); h1.scale.set(.05, .3, .02); h1.geometry = G.box; h1.position.set(0, .15, .01); h2.scale.set(.03, .44, .02); h2.position.set(0, .22, .02);
        const p1 = new T.Group(), p2 = new T.Group(); p1.add(h1); p2.add(h2); g.add(f, p1, p2); g.scale.setScalar(110 + rs() * 60); const sp = .5 + rs();
        ride(ct, g, (i + .3) / 6 * ct.len, gy() + 380 + rs() * 380, 260, (o, t) => { o.children[2].rotation.z = -t * sp; o.children[1].rotation.z = -t * sp / 12; }); }
      layer(-700, lenFor(-700), put => { const L = lenFor(-700); for (let i = 0; i < 6; i++) { const s = 60 + rs() * 100; put(brass, G.gear, rs() * L, gy() + s * .3, (rs() - .5) * 150, s, s, s, (rs() - .5) * .4, (rs() - .5) * 1.2, rs() * 3); } });
      weather(0, 700, '#fde68a', [1300, 700, 1400], [-.4, -.6, 5], 6);
    },
    // W12 Crystal Archipelago - floating islands that sing when they break
    islands() {
      A.gy = -560; A.fogNear = 300; A.fogFar = 4600; A.tilt = .04;
      sky('#140620', '#f0a6c9', '#5b2141', { fog: '#8a4a72', sun: '#fff1f2', sx: -.3, sy: .08 });
      amb.intensity = .5; sunL.color.set(lc('#ffe4e6')); sunL.intensity = 1.6; sunL.position.set(-400, 300, -500); scene.add(track(new T.HemisphereLight(lc('#f9a8d4'), lc('#4a1236'), .65)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#d58bb0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 50; g.fillStyle = Math.random() < .5 ? 'rgba(255,240,248,.35)' : 'rgba(120,40,80,.18)'; g.beginPath(); g.ellipse(x, y, r * 1.8, r * .6, 0, 0, 6.3); g.fill(); } }, { tile: 900, drift: .004 });
      const rock = MAT({ color: '#5b2a4a', roughness: .95 }), grass = MAT({ color: '#f9a8d4', roughness: .8 }), cryP = MAT({ color: '#fbcfe8', emissive: '#f472b6', emissiveIntensity: 1.3, roughness: .2, metalness: .1 }), cryC = MAT({ color: '#cffafe', emissive: '#67e8f9', emissiveIntensity: 1.1, roughness: .2 }), fall = BAS({ color: '#fdf2f8', opacity: .14, side: T.DoubleSide });
      const island = (put, x, y, zz, s, crystals) => { put(rock, G.cone, x, y - s * .55, zz, s * 2, s * 1.3, s * 1.6, Math.PI, rs() * 3, 0, 1, 1, tint(1, .3)); put(grass, G.cyl, x, y, zz, s * 2.02, s * .12, s * 1.62, 0, 0, 0, 1, 1, tint(1, .2));
        for (let c = 0; c < crystals; c++) { const h = s * (.4 + rs() * .9); put(c % 3 ? cryP : cryC, G.oct, x + (rs() - .5) * s * 1.2, y + h * .45, zz + (rs() - .5) * s * .8, s * .22, h, s * .22, 0, rs(), (rs() - .5) * .4); } };
      layer(-3600, lenFor(-3600), put => { const L = lenFor(-3600); for (let i = 0; i < 12; i++) island(put, rs() * L, -200 + rs() * 900, (rs() - .5) * 500, 160 + rs() * 220, 4); for (let i = 0; i < 6; i++) { const h = 900 + rs() * 900; put(cryP, G.oct, rs() * L, gy() + h * .4, 300, 160, h, 160, 0, rs(), (rs() - .5) * .3); } });
      const mid = layer(-1700, lenFor(-1700), put => { const L = lenFor(-1700); for (let i = 0; i < 8; i++) island(put, (i + rs() * .6) / 8 * L, -260 + rs() * 620, (rs() - .5) * 300, 110 + rs() * 120, 6); });
      for (let i = 0; i < 4; i++) { const m = new T.Mesh(G.plane, fall); m.scale.set(40 + rs() * 30, 900, 1); ride(mid, m, rs() * mid.len, -600, 60); }
      layer(-600, lenFor(-600), put => { const L = lenFor(-600); for (let i = 0; i < 6; i++) { const x = rs() * L, y = -300 + rs() * 600, s = 12 + rs() * 18; put(rock, G.ico, x, y, (rs() - .5) * 150, s * 2, s * 1.5, s * 2, 0, rs() * 3, 0); if (i % 2) put(cryP, G.oct, x, y + s, 0, s * .5, s * 1.8, s * .5); } });
      for (let i = 0; i < 7 * q + 2; i++) { const s = new T.Sprite(spriteM('#fff1f2', .4)); s.scale.set(1100 + rs() * 900, 260 + rs() * 160, 1); ride(A.layers[0], s, rs() * A.layers[0].len, gy() + 100 + rs() * 260, -200); }
      weather(0, 520, '#fbcfe8', [1300, 700, 1400], [-.3, .3, 6], 6);
    },
    // W13 Tempest Gyre - inside a storm the size of a world
    storm() {
      A.gy = -620; A.fogNear = 150; A.fogFar = 3400; A.tilt = .02; A.speed = 3.2;
      sky('#030602', '#2c4212', '#0a1205', { fog: '#18240b', fc: '#ecfccb' });
      amb.intensity = .4; sunL.color.set(lc('#d9f99d')); sunL.intensity = .7; scene.add(track(new T.HemisphereLight(lc('#84cc16'), lc('#0a0f0a'), .5)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#1a2a0c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 120; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(190,242,100,.08)' : 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 60, 8 + Math.random() * 14, 0, 0, 6.3); g.fill(); } }, { tile: 800, drift: .01 });
      // the gyre itself: a towering funnel spinning on the horizon
      const sw = canv(256, 256, (g, w, h) => { g.fillStyle = '#1a2a0c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.strokeStyle = Math.random() < .5 ? 'rgba(217,249,157,.25)' : 'rgba(0,0,0,.4)'; g.lineWidth = 2 + Math.random() * 8; g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(w * .3, y - 40, w * .6, y + 40, w, y); g.stroke(); } });
      const swT = srgb(new T.CanvasTexture(sw)); swT.repeat.set(3, 2);
      const fun = new T.Mesh(track(new T.CylinderGeometry(1400, 120, 3200, 40, 1, true)), track(new T.MeshStandardMaterial({ map: swT, color: lc('#a3c45a'), side: T.DoubleSide, roughness: 1, emissive: lc('#3f6212'), emissiveIntensity: .6, transparent: true, opacity: .75, fog: false, depthWrite: false })));
      fun.position.set(700, A.gy + 1500, -3300); fun.renderOrder = -5; scene.add(fun); A.upd.push(df => { swT.offset.x = (swT.offset.x - .0025 * df) % 1; swT.offset.y = (swT.offset.y + .0015 * df) % 1; });
      const deb = MAT({ color: '#3f3f2a', roughness: 1 });
      [[-2700, 10, '#2c4212', .4, 2600, 900], [-1700, 12, '#3f5f1a', .45, 1800, 600], [-700, 8, '#577a24', .32, 1000, 320]].forEach(([z, n, c, o, sx, sy], k) => { const L = layer(z, lenFor(z), put => { if (k === 1) for (let i = 0; i < 26; i++) put(deb, G.ico, rs() * lenFor(z), -300 + rs() * 1000, (rs() - .5) * 400, 20 + rs() * 50, 16 + rs() * 40, 20 + rs() * 50, rs(), rs(), rs()); });
        for (let i = 0; i < n * q + 3; i++) { const s = new T.Sprite(spriteM(c, o)); s.scale.set(sx * (.6 + rs() * .8), sy * (.6 + rs() * .8), 1); ride(L, s, rs() * L.len, k ? A.gy + 200 + rs() * 1100 : A.gy + 100 + rs() * 500, (rs() - .5) * 400); } });
      weather(1, 1800, '#d9f99d', [1400, 900, 1600], [-5, -12, 0], 14);
      lightning('#ecfccb', 120);
    },
    // W15 Heart of Aetheria - where every signal began: the inner sanctum, with the Core blazing at its end
    sanctum() {
      A.gy = -440; A.fogNear = 300; A.fogFar = 4200; A.tilt = .05; A.speed = 2;
      sky('#020a10', '#0b3b4d', '#01060a', { fog: '#062634', sun: '#a5f3fc', sx: .32, sy: .1 });
      amb.intensity = .35; sunL.color.set(lc('#a5f3fc')); sunL.intensity = 1.1; sunL.position.set(300, 400, -600); scene.add(track(new T.HemisphereLight(lc('#22d3ee'), lc('#020617'), .55)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#04141b'; g.fillRect(0, 0, w, h); }, { tile: 260, rough: .3, metal: .6, emi: (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#22d3ee'; g.lineWidth = 2; const r = 32; for (let y = -1; y < 6; y++) for (let x = -1; x < 6; x++) { const cx = x * r * 1.5, cy = y * r * 1.732 + (x % 2 ? r * .866 : 0); g.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * 6.283; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.globalAlpha = .35 + Math.random() * .5; g.stroke(); } g.globalAlpha = 1; }, emiCol: '#22d3ee', ei: 1.2 });
      const core = new T.Sprite(glowM('#a5f3fc', .9)); core.scale.setScalar(2600); core.position.set(1400, 500, -5200); scene.add(core); const core2 = new T.Sprite(glowM('#ffffff', .9)); core2.scale.setScalar(700); core2.position.copy(core.position); scene.add(core2);
      A.upd.push(() => { const p = 1 + Math.sin(X.timeU.value * 2.4) * .08; core.scale.setScalar(2600 * p); core2.material.opacity = .75 + (p - 1) * 2; });
      const stone = MAT({ color: '#0e2a33', metalness: .5, roughness: .45 }), band = MAT({ color: '#000000', emissive: '#22d3ee', emissiveIntensity: 2.2, vertexColors: false }), white = MAT({ color: '#000000', emissive: '#e0f2fe', emissiveIntensity: 2, vertexColors: false });
      layer(-3300, lenFor(-3300), put => { const L = lenFor(-3300); for (let i = 0; i < 14; i++) { const x = (i + .5) / 14 * L, h = 2600, r = 140 + rs() * 60; put(stone, G.cyl, x, gy() + h / 2, (rs() - .5) * 200, r, h, r); for (let b = 0; b < 4; b++) put(band, G.cyl, x, gy() + 300 + b * 520, 0, r * 1.06, 14, r * 1.06); } });
      layer(-1600, lenFor(-1600), put => { const L = lenFor(-1600); for (let i = 0; i < 6; i++) { const x = (i + .5) / 6 * L; put(stone, G.half, x, gy(), 0, 1100, 1300, 900, 0, 0, 0); put(band, G.half, x, gy() + 4, 30, 1060, 1260, 120, 0, 0, 0); }
        for (let i = 0; i < 4; i++) { const y = gy() + 200 + rs() * 600; put(stone, G.cyl, rs() * L, y, 200, 40, L * .3, 40, 0, 0, Math.PI / 2); } });
      layer(-560, lenFor(-560), put => { const L = lenFor(-560); for (let i = 0; i < 5; i++) { const x = rs() * L, y = gy() + 60 + rs() * 260, s = 18 + rs() * 22; put(stone, G.cyl6, x, y, (rs() - .5) * 150, s * 2, 8, s * 2, Math.PI / 2 + (rs() - .5) * .6, rs(), 0); put(i % 2 ? band : white, G.cyl6, x, y, 4, s * 1.4, 9, s * 1.4, Math.PI / 2 + (rs() - .5) * .6, 0, 0); } });
      // pulses running along the floor conduits toward the core
      const pulse = layer(-900, lenFor(-900), () => { }); for (let i = 0; i < 6; i++) { const s = new T.Sprite(glowM('#67e8f9', .8)); s.scale.setScalar(70); ride(pulse, s, rs() * pulse.len, gy() + 8, (rs() - .5) * 300, (o, t, df) => { o.position.x += 4 * df; if (o.position.x > pulse.len * 2) o.position.x -= pulse.len * 3; }); }
      weather(0, 800, '#a5f3fc', [1300, 750, 1400], [-.3, 1.1, 6], 6);
    }
  };
  // =================== LIFE: creatures and vehicles moving through each world ===================
  const C3 = c => MAT({ color: c, vertexColors: false }), GL3 = (c, i) => MAT({ color: '#000000', emissive: c, emissiveIntensity: i || 2, vertexColors: false });
  const flock = (kind, n, zr, yr, vr, extra) => { const out = []; for (let i = 0; i < n; i++) { const v = (vr[0] + rs() * (vr[1] - vr[0])) * (vr[2] === 'both' && rs() < .5 ? -1 : 1); out.push(Object.assign({ kind, x0: rs() * 7000, z: zr[0] + rs() * (zr[1] - zr[0]), y: yr[0] + rs() * (yr[1] - yr[0]), v, bob: 0, col: PALETTE.car[(rs() * 12) | 0] }, extra ? extra(i) : {})); } return out; };
  const bird = (body, wing, s, beak) => [[G.sph, body, 0, 0, 0, 14 * s, 8 * s, 8 * s], [G.box, wing, 0, 2 * s, 9 * s, 10 * s, 1.5 * s, 16 * s, null, 'wingL'], [G.box, wing, 0, 2 * s, -9 * s, 10 * s, 1.5 * s, 16 * s, null, 'wingR'], [G.cone, beak || body, 8 * s, 0, 0, 3 * s, 6 * s, 3 * s, null, null, -Math.PI / 2]];
  const LIFE = {
    jungle() { const K2 = kits(), p1 = C3('#22c55e'), p2 = C3('#ef4444'), p3 = C3('#3b82f6'), y = C3('#facc15'), blk = C3('#111827'), sh = C3('#14532d');
      fleet({ par1: bird(p1, p2, 1.4, y), par2: bird(p3, y, 1.4, blk), wasp: [[G.sph, y, 0, 0, 0, 16, 9, 9], [G.sph, blk, -8, 0, 0, 10, 8, 8], [G.box, C3('#e0f2fe'), 0, 5, 7, 8, 1, 14, null, 'wingL'], [G.box, C3('#e0f2fe'), 0, 5, -7, 8, 1, 14, null, 'wingR']],
        beetle: [[G.sph, sh, 0, 10, 0, 40, 18, 26], [G.sph, blk, 18, 9, 0, 12, 10, 12], [G.box, blk, 0, 3, 12, 30, 3, 3, null, 'legL'], [G.box, blk, 0, 3, -12, 30, 3, 3, null, 'legR']] },
        flock('par1', 10, [-800, -1500], [80, 420], [1.6, 3.2, 'both'], () => ({ k: 1.7 })).concat(flock('par2', 8, [-800, -1500], [100, 460], [1.6, 3.2, 'both'], () => ({ k: 1.7 })), flock('wasp', 14, [-900, -1400], [-200, 200], [-2.5, 2.5], i => ({ bob: .12, k: 1.6 })), flock('beetle', 6, [-1100, -1300], [A.gy, A.gy], [-.6, .6], i => ({ bob: .2, k: 1.7 }))), { span: 7000 }); },
    desert() { const K2 = kits(), rust = C3('#9a3412'), r2 = C3('#78350f'), blk = C3('#1c1917');
      const buggy = K2.car.map(p => p[8] === 'body' ? [G.box, rust, 0, 12, 0, 44, 10, 24] : p[1] && p[1].userData && p[1] === K2.car[1][1] ? [G.box, C3('#44403c'), -2, 22, 0, 20, 3, 22] : p);
      fleet({ buggy, truck: K2.truck.map(p => p[1] === K2.truck[0][1] ? [p[0], rust, ...p.slice(2)] : p[1] === K2.truck[2][1] ? [p[0], r2, ...p.slice(2)] : p), vul: bird(blk, blk, 2, C3('#fca5a5')) },
        flock('buggy', 6, [-1050, -1300], [A.gy, A.gy], [3, 5.5, 'both'], () => ({ k: 1.5 })).concat(flock('truck', 4, [-1350, -1550], [A.gy, A.gy], [-1.5, -1], () => ({ k: 1.4 })), flock('vul', 7, [-1200, -2000], [300, 700], [.6, 1.6, 'both'], () => ({ k: 2 }))), { span: 7000 });
      const dd = new T.Mesh(new T.ConeGeometry(60, 420, 20, 1, true), BAS({ color: '#fdba74', opacity: .14, side: T.DoubleSide })); dd.geometry.rotateX(Math.PI); track(dd.geometry);
      for (let i = 0; i < 3; i++) ride(A.layers[1], dd.clone(), rs() * A.layers[1].len, gy() + 200, (rs() - .5) * 300, (o, t, df) => { o.rotation.y += .2 * df; o.position.x += Math.sin(t * .4 + o.id) * 1.2; }); },
    ice() { const blk = C3('#111827'), wht = C3('#f8fafc'), org = C3('#f97316'), dr = C3('#64748b');
      fleet({ peng: [[G.sph, blk, 0, 13, 0, 14, 24, 13], [G.sph, wht, 4, 12, 0, 8, 18, 10], [G.sph, blk, 0, 28, 0, 10, 10, 10], [G.cone, org, 6, 28, 0, 3, 6, 3, null, null, -Math.PI / 2], [G.box, blk, 0, 14, 7, 6, 14, 2, null, 'legL'], [G.box, blk, 0, 14, -7, 6, 14, 2, null, 'legR']],
        drone: [[G.box, dr, 0, 0, 0, 30, 8, 30], [G.box, GL3('#7dd3fc', 2), 16, 0, 0, 2, 4, 10], [G.box, C3('#1f2937'), 0, 6, 0, 46, 1, 6, null, 'spin'], [G.box, C3('#1f2937'), 0, 6, 0, 6, 1, 46, null, 'spin']] },
        flock('peng', 18, [-1100, -1400], [A.gy, A.gy], [-.5, .5], i => ({ bob: .25, k: 1.8 })).concat(flock('drone', 5, [-900, -1600], [100, 450], [1.5, 3, 'both'], i => ({ bob: .05, k: 1.5 }))), { span: 7000 }); },
    foundry() { const K2 = kits(), ore = GL3('#fb923c', 2.4), iron = C3('#44403c'), hat = C3('#facc15'), vest = '#f97316';
      strip(-1100, -1140, A.gy + 2, '#ffffff', (g, w, h) => { g.fillStyle = '#1c1917'; g.fillRect(0, 0, w, h); g.fillStyle = '#78716c'; g.fillRect(0, h * .2, w, h * .12); g.fillRect(0, h * .68, w, h * .12); g.fillStyle = '#3f2a1a'; for (let x = 0; x < w; x += 24) g.fillRect(x, 0, 10, h); }, { tile: 200 });
      fleet({ cart: [[G.box, iron, 0, 16, 0, 44, 22, 26], [G.box, ore, 0, 28, 0, 38, 6, 22], [K2.car[2][0], C3('#111111'), 14, 6, 13, 10, 10, 4], [K2.car[2][0], C3('#111111'), -14, 6, 13, 10, 10, 4], [K2.car[2][0], C3('#111111'), 14, 6, -13, 10, 10, 4], [K2.car[2][0], C3('#111111'), -14, 6, -13, 10, 10, 4]],
        bot: K2.walker.concat([[G.sph, hat, 0, 29, 0, 8, 4, 8]]) },
        flock('cart', 10, [-1120, -1120], [A.gy, A.gy], [2.4, 2.4], () => ({ k: 1.5 })).concat(flock('bot', 14, [-1000, -1060], [A.gy, A.gy], [-.5, .5], i => ({ bob: .18, k: 1.7, skin: '#9ca3af', shirt: vest, pants: '#1f2937' }))), { span: 7000 }); },
    deep() { const f1 = C3('#fbbf24'), f2 = C3('#38bdf8'), f3 = C3('#f472b6'), sub = C3('#a16207'), jel = MAT({ color: '#c4b5fd', emissive: '#a78bfa', emissiveIntensity: .8, transparent: true, opacity: .7, vertexColors: false }), port = GL3('#fde68a', 2);
      const fish = (m, s) => [[G.sph, m, 0, 0, 0, 16 * s, 8 * s, 5 * s], [G.cone, m, -10 * s, 0, 0, 6 * s, 8 * s, 2 * s, null, 'tail', Math.PI / 2]];
      const list = []; for (let sch = 0; sch < 7; sch++) { const z = -600 - rs() * 900, y = A.gy + 80 + rs() * 600, x = rs() * 7000, v = (1 + rs() * 1.5) * (rs() < .5 ? -1 : 1), k = ['f1', 'f2', 'f3'][sch % 3]; for (let i = 0; i < 9; i++) list.push({ kind: k, x0: x + (rs() - .5) * 160, z: z + (rs() - .5) * 80, y: y + (rs() - .5) * 70, v, bob: .05 }); }
      fleet({ f1: fish(f1, 1), f2: fish(f2, 1), f3: fish(f3, 1.2), jelly: [[G.sph, jel, 0, 0, 0, 28, 20, 28], [G.cyl6, jel, 0, -24, 6, 2, 34, 2, null, 'legL'], [G.cyl6, jel, 0, -24, -6, 2, 34, 2, null, 'legR'], [G.cyl6, jel, 6, -22, 0, 2, 30, 2]],
        sub: [[G.sph, sub, 0, 0, 0, 160, 44, 44], [G.box, sub, 10, 30, 0, 40, 26, 14], [G.box, port, 40, 0, 22.5, 10, 10, 1], [G.box, port, 0, 0, 22.5, 10, 10, 1], [G.box, port, -40, 0, 22.5, 10, 10, 1], [G.box, C3('#713f12'), -86, 0, 0, 14, 40, 4, null, 'spin']] },
        list.concat(flock('jelly', 9, [-800, -1400], [A.gy + 150, 400], [-.3, .3], i => ({ bob: .04, k: 1.6 })), flock('sub', 1, [-1300, -1300], [A.gy + 260, A.gy + 260], [.8, .8])), { span: 7000 }); },
    cyber() { const K2 = kits(), neon = [GL3('#4ade80', 2.2), GL3('#e879f9', 2.2), GL3('#22d3ee', 2.2)], body = MAT({ color: '#ffffff', vertexColors: false, roughness: .3 });
      const fcar = n => [[G.box, body, 0, 0, 0, 46, 10, 22, 'body'], [G.box, C3('#0b0717'), -2, 9, 0, 24, 9, 20], [G.box, n, 0, -6, 0, 40, 2, 20], [G.box, GL3('#fef3c7', 2.2), 23.2, 1, 6, 1, 3, 5], [G.box, GL3('#fef3c7', 2.2), 23.2, 1, -6, 1, 3, 5], [G.box, GL3('#ef4444', 2), -23.2, 1, 6, 1, 3, 5], [G.box, GL3('#ef4444', 2), -23.2, 1, -6, 1, 3, 5]];
      const lanes = []; [[-900, 180, 4], [-1000, 320, -3], [-1200, 60, 5], [-1350, 420, -4.5], [-1500, 250, 3.5]].forEach(([z, y, v]) => { for (let i = 0; i < 8; i++) lanes.push({ kind: 'fc' + (i % 3), k: 1.6, x0: i / 8 * 7000 + rs() * 300, z, y: y + (rs() - .5) * 20, v: v * (.85 + rs() * .3), col: ['#0f172a', '#1e1b4b', '#334155', '#f8fafc', '#7c3aed'][(rs() * 5) | 0] }); });
      fleet({ fc0: fcar(neon[0]), fc1: fcar(neon[1]), fc2: fcar(neon[2]), train: [[G.box, C3('#e2e8f0'), 0, 0, 0, 300, 30, 34], [G.box, GL3('#22d3ee', 1.6), 0, 6, 17.5, 280, 8, 1], [G.box, GL3('#22d3ee', 1.6), 0, -16, 0, 300, 3, 30]] }, lanes.concat(flock('train', 3, [-1700, -1700], [A.gy + 340, A.gy + 340], [6, 6])), { span: 7000 });
      layer(-1700, lenFor(-1700), put => { const L = lenFor(-1700); put(C3('#1e1b4b'), G.box, L / 2, A.gy + 318, 0, L, 10, 40); for (let x = 0; x < L; x += 300) put(C3('#1e1b4b'), G.box, x, A.gy + 160, 0, 16, 320, 16); }); },
    clock() { const brass = C3('#a16207'), dark = C3('#1c140a'), red = C3('#7f1d1d'), coal = GL3('#fb923c', 1.8), win = GL3('#fde68a', 1.4);
      layer(-1250, lenFor(-1250), put => { const L = lenFor(-1250); put(dark, G.box, L / 2, A.gy + 240, 0, L, 16, 50); for (let x = 0; x < L; x += 380) { put(dark, G.box, x, A.gy + 120, 0, 30, 240, 30); put(dark, G.half, x + 190, A.gy + 232, 0, 380, 120, 50); } });
      const cars = []; const x0 = rs() * 7000; cars.push({ kind: 'loco', x0, z: -1250, y: A.gy + 248, v: 2.8 }); for (let i = 1; i <= 5; i++) cars.push({ kind: 'coach', x0: x0 - i * 128, z: -1250, y: A.gy + 248, v: 2.8 });
      fleet({ loco: [[G.cyl, dark, 10, 34, 0, 40, 90, 40, null, null, Math.PI / 2], [G.box, dark, -40, 40, 0, 40, 56, 44], [G.cyl, dark, 40, 66, 0, 12, 30, 12], [G.box, coal, -40, 46, 22.5, 22, 14, 1], [G.box, red, 0, 10, 0, 110, 14, 40], [G.box, brass, 52, 34, 0, 4, 30, 30]],
        coach: [[G.box, red, 0, 32, 0, 118, 46, 40], [G.box, win, 0, 40, 20.5, 100, 12, 1], [G.box, dark, 0, 58, 0, 122, 6, 44], [G.box, dark, 0, 6, 0, 100, 10, 30]], mbird: bird(brass, C3('#fde68a'), 1.6, dark) },
        cars.concat(flock('mbird', 8, [-800, -1600], [150, 520], [1.5, 3, 'both'], () => ({ k: 1.7 }))), { span: 7000 });
      const smoke = new T.Sprite(spriteM('#e7e5e4', .25)); smoke.scale.set(160, 110, 1); },
    islands() { const env = C3('#f5d0fe'), gnd = C3('#7c3aed'), wht = C3('#f8fafc'), gry = C3('#94a3b8');
      fleet({ blimp: [[G.sph, env, 0, 0, 0, 220, 70, 70], [G.box, gnd, 0, -42, 0, 60, 16, 22], [G.box, env, -100, 10, 0, 30, 40, 4], [G.box, env, -100, 0, 0, 30, 4, 40], [G.box, GL3('#fde68a', 1.6), 0, -42, 11.5, 50, 6, 1]], gull: bird(wht, wht, 1.5, C3('#fb923c')) },
        flock('blimp', 3, [-1500, -2600], [200, 700], [.8, 1.6, 'both']).concat(flock('gull', 14, [-800, -1500], [-100, 400], [1.8, 3.4, 'both'], () => ({ k: 1.7 }))), { span: 7000 }); },
    storm() { const wood = C3('#78350f'), cow = C3('#f8fafc'), spot = C3('#111827'), pink = C3('#f9a8d4'), env = C3('#64748b');
      const tumble = (s) => ({ bob: 0, spinX: s });
      fleet({ plank: [[G.box, wood, 0, 0, 0, 60, 6, 14, null, 'tumble']], cow: [[G.box, cow, 0, 0, 0, 44, 22, 20, null, 'tumble'], [G.box, spot, 4, 4, 10.5, 14, 10, 1, null, 'tumble'], [G.box, cow, 26, 6, 0, 14, 14, 14, null, 'tumble'], [G.box, pink, 33, 2, 0, 3, 7, 10, null, 'tumble']],
        ship: [[G.sph, env, 0, 0, 0, 260, 70, 70], [G.box, C3('#334155'), 0, -44, 0, 70, 20, 26], [G.box, env, -120, 10, 0, 36, 46, 4]] },
        flock('plank', 18, [-700, -1500], [-300, 500], [-7, -4]).concat(flock('cow', 3, [-800, -1300], [-100, 400], [-6, -4.5]), flock('ship', 2, [-1800, -2400], [300, 800], [-2.4, -1.6])), { span: 7000 }); },
    sanctum() { const K2 = kits(), robe = '#e0f2fe', orb = GL3('#67e8f9', 2.4), ring = C3('#0e2a33');
      fleet({ pil: K2.walker.concat([[G.cone, MAT({ color: '#ffffff', vertexColors: false }), 0, 11, 0, 12, 22, 12, 'shirt']]),
        orb: [[G.sph, orb, 0, 0, 0, 16, 16, 16], [G.tor, ring, 0, 0, 0, 36, 36, 36, null, 'spin']] },
        flock('pil', 18, [-1050, -1250], [A.gy, A.gy], [-.35, .35], i => ({ bob: .12, k: 1.7, skin: PALETTE.skin[(rs() * 6) | 0], shirt: robe, pants: '#94a3b8' })).concat(flock('orb', 10, [-800, -1500], [-200, 400], [-1.6, 1.6], i => ({ bob: .04 }))), { span: 7000 }); }
  };
  // =================== EXTRA MAPS ===================
  Object.assign(K, {
    // Maple Grove: a golden-afternoon suburb with streets, houses, people, dogs, cars, a school bus and an ice cream truck
    suburb() {
      A.gy = -480; A.fogNear = 900; A.fogFar = 7600; A.tilt = .13; A.speed = 2;
      sky('#3b82f6', '#fde2b8', '#9fb7d9', { fog: '#f5d7b0', sun: '#fff1c4', sx: .42, sy: .14 });
      amb.intensity = .55; sunL.color.set(lc('#ffe8c4')); sunL.intensity = 2; sunL.position.set(600, 500, -400); scene.add(track(new T.HemisphereLight(lc('#bfdbfe'), lc('#4d7c0f'), .6)));
      const KIT = kits();
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#5aa13a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = ['#4d9332', '#66ad45', '#58a03a'][i % 3]; g.fillRect(Math.random() * w, Math.random() * h, 3, 2); } }, { tile: 500 });
      strip(-860, -990, A.gy + 1, '#ffffff', (g, w, h) => { g.fillStyle = '#3d3d44'; g.fillRect(0, 0, w, h); g.fillStyle = '#facc15'; for (let x = 0; x < w; x += 64) g.fillRect(x, h / 2 - 2, 36, 4); g.fillStyle = '#e5e7eb'; g.fillRect(0, 2, w, 3); g.fillRect(0, h - 5, w, 3); }, { tile: 700 });
      const sw = (z0, z1) => strip(z0, z1, A.gy + 3, '#ffffff', (g, w, h) => { g.fillStyle = '#d4d4d8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a1a1aa'; for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }, { tile: 240 });
      sw(-830, -860); sw(-990, -1020);
      const wall = ['#fde68a', '#bfdbfe', '#fecaca', '#d9f99d', '#f5f5f4', '#e9d5ff', '#fed7aa', '#a7f3d0', '#cbd5e1'].map(c => MAT({ color: c, vertexColors: false })), roofs = ['#7c2d12', '#334155', '#1f2937', '#78350f', '#7f1d1d', '#374151'].map(c => MAT({ color: c, vertexColors: false }));
      const glass = MAT({ color: '#1e3a5f', vertexColors: false }), white = MAT({ color: '#f8fafc', vertexColors: false }), door = MAT({ color: '#7c2d12', vertexColors: false }), garage = MAT({ color: '#e7e5e4', vertexColors: false }), brick = MAT({ color: '#9a3412', vertexColors: false }),
        drive = MAT({ color: '#a8a29e', vertexColors: false }), hedge = MAT({ color: '#2f6b2a' }), leaf = MAT({ color: '#3f8f2f' }), leaf2 = MAT({ color: '#d97706' }), trunk = MAT({ color: '#6b4423', vertexColors: false }), pole = MAT({ color: '#5b4636', vertexColors: false }), wire = MAT({ color: '#1f2937', vertexColors: false }), mail = MAT({ color: '#1d4ed8', vertexColors: false });
      const house = (put, x, z, w, kind, k) => { // ranch, two-storey colonial, modern box, or cottage
        const wm = wall[k % wall.length], rm = roofs[k % roofs.length], d = 150, gyy = gy();
        if (kind === 0) { put(wm, G.box, x, gyy + 40, z, w, 80, d); put(rm, G.roof, x, gyy + 80, z, w + 20, 60, d + 16); put(white, G.box, x + w * .3, gyy + 45, z + d / 2 + 1, w * .3, 50, 2); put(garage, G.box, x - w * .28, gyy + 32, z + d / 2 + 1, w * .32, 56, 2); }
        else if (kind === 1) { put(wm, G.box, x, gyy + 80, z, w, 160, d); put(rm, G.roof, x, gyy + 160, z, w + 20, 70, d + 16); put(brick, G.box, x + w * .35, gyy + 200, z - 20, 18, 80, 18); put(white, G.box, x, gyy + 30, z + d / 2 + 10, w * .5, 6, 20); put(white, G.box, x - w * .2, gyy + 15, z + d / 2 + 18, 5, 30, 5); put(white, G.box, x + w * .2, gyy + 15, z + d / 2 + 18, 5, 30, 5); }
        else if (kind === 2) { put(wm, G.box, x, gyy + 60, z, w, 120, d); put(white, G.box, x + w * .15, gyy + 135, z, w * .7, 30, d * .8); put(glass, G.box, x - w * .1, gyy + 70, z + d / 2 + 1, w * .6, 60, 2); }
        else { put(wm, G.box, x, gyy + 45, z, w, 90, d); put(rm, G.roof, x, gyy + 90, z, w + 16, 90, d + 12); put(brick, G.box, x - w * .3, gyy + 120, z, 16, 70, 16); }
        if (kind !== 2) { for (const sx of [-.15, .15]) put(glass, G.box, x + w * sx + (kind === 0 ? w * .1 : 0), gyy + (kind === 1 ? 110 : 52), z + d / 2 + 1, 26, 26, 2); if (kind === 1) for (const sx of [-.3, .3]) put(glass, G.box, x + w * sx, gyy + 50, z + d / 2 + 1, 24, 30, 2); }
        put(door, G.box, x + (kind === 0 ? w * .08 : 0), gyy + 22, z + d / 2 + 1.5, 20, 44, 2);
        put(drive, G.box, x - w * .28, gyy + 2, z + d / 2 + 70, w * .3, 2, 130); put(hedge, G.box, x + w * .25, gyy + 10, z + d / 2 + 14, w * .4, 20, 16);
        for (let f = 0; f < 6; f++) put(white, G.box, x + w * .08 + f * 14, gyy + 12, z + d / 2 + 125, 4, 24, 3); put(white, G.box, x + w * .08 + 35, gyy + 18, z + d / 2 + 125, 78, 3, 3);
        put(trunk, G.box, x + w * .62, gyy + 6, z + d / 2 + 120, 3, 34, 3); put(mail, G.box, x + w * .62, gyy + 36, z + d / 2 + 120, 12, 9, 7);
      };
      const row = (z, n) => layer(z, lenFor(z), put => { const L = lenFor(z); let x = 80, k = (rs() * 9) | 0; while (x < L - 100) { const w = 160 + rs() * 90; house(put, x + w / 2, 0, w, (rs() * 4) | 0, k++); const tx = x + w + 30; if (rs() < .8) { put(trunk, G.cyl6, tx, gy() + 40, 40, 10, 80, 10); put(rs() < .25 ? leaf2 : leaf, rs() < .5 ? G.ico : G.cone, tx, gy() + 120, 40, 80, rs() < .5 ? 90 : 140, 80, 0, rs() * 3, 0, 1, 1, tint(1, .3)); } x += w + 70; } });
      row(-1200, 0); row(-2100, 0);
      layer(-4200, lenFor(-4200), put => { const L = lenFor(-4200); for (let i = 0; i < 40; i++) put(i % 3 ? leaf : hedge, G.ico, rs() * L, gy() + 60, (rs() - .5) * 600, 160 + rs() * 200, 120 + rs() * 180, 160, 0, rs() * 3, 0, 1, 1, tint(1, .3));
        const xs = rs() * L; put(white, G.cyl, xs, gy() + 240, 0, 20, 480, 20); put(MAT({ color: '#93c5fd', vertexColors: false }), G.sph, xs, gy() + 520, 0, 130, 90, 130); // water tower
        const xc = (xs + L / 2) % L; put(white, G.box, xc, gy() + 90, 0, 140, 180, 120); put(roofs[2], G.roof, xc, gy() + 180, 0, 150, 90, 130); put(white, G.box, xc, gy() + 300, 0, 40, 160, 40); put(roofs[2], G.cone4, xc, gy() + 430, 0, 50, 110, 50, 0, Math.PI / 4, 0); }); // church
      layer(-815, lenFor(-815), put => { const L = lenFor(-1120); for (let x = 50; x < L; x += 420) { put(pole, G.cyl6, x, gy() + 130, 0, 8, 260, 8); put(pole, G.box, x, gy() + 240, 0, 4, 4, 70); } put(wire, G.box, L / 2, gy() + 236, -20, L, 1.2, 1.2); put(wire, G.box, L / 2, gy() + 236, 20, L, 1.2, 1.2);
        for (let x = 260; x < L; x += 700) { put(trunk, G.cyl6, x, gy() + 40, 10, 10, 80, 10); put(leaf, G.ico, x, gy() + 120, 10, 90, 90, 90, 0, rs() * 3, 0, 1, 1, tint(1, .3)); } });
      // life: commuters, a yellow school bus, an ice cream truck, parked cars, people walking dogs, kids on bikes
      const bus = KIT.bus.map(p => p[8] === 'body' ? [G.box, MAT({ color: '#facc15', vertexColors: false }), ...p.slice(2, 8)] : p), icecream = KIT.suv.concat([[G.box, MAT({ color: '#f9a8d4', vertexColors: false }), 0, 12, 0, 50.5, 4, 24.5], [G.cone, MAT({ color: '#fde68a', vertexColors: false }), 0, 38, 0, 10, 16, 10, null, null, Math.PI], [G.sph, MAT({ color: '#fbcfe8', vertexColors: false }), 0, 48, 0, 12, 12, 12]]);
      const dogM = MAT({ color: '#ffffff', vertexColors: false }), dog = [[G.box, dogM, 0, 9, 0, 18, 8, 7, 'body'], [G.box, dogM, 10, 13, 0, 7, 7, 6, 'body'], [G.box, dogM, -10, 13, 0, 7, 2, 2, 'body', 'tail'], [G.box, dogM, 6, 3, 0, 2, 7, 5, 'body', 'legL'], [G.box, dogM, -6, 3, 0, 2, 7, 5, 'body', 'legR']];
      const bike = KIT.walker.map(p => p[9] === 'legL' || p[9] === 'legR' ? p : [p[0], p[1], p[2], p[3] + 8, p[4], p[5] * .85, p[6] * .85, p[7] * .85, p[8]]).concat([[G.wheel, MAT({ color: '#111111', vertexColors: false }), 9, 6, 0, 12, 12, 2], [G.wheel, MAT({ color: '#111111', vertexColors: false }), -9, 6, 0, 12, 12, 2], [G.box, MAT({ color: '#dc2626', vertexColors: false }), 0, 10, 0, 18, 2, 2]]);
      const span = 7000, pick = () => { const r = rs(); return r < .55 ? 'car' : r < .8 ? 'suv' : r < .88 ? 'police' : 'taxi'; };
      const list = traffic([[-895, 2.6, A.gy + 1]], 7, pick, span).concat(traffic([[-955, -2.6, A.gy + 1]], 7, pick, span), [{ kind: 'bus', x0: 900, z: -895, v: 2, y: A.gy + 1 }, { kind: 'ice', x0: 4000, z: -955, v: -1.4, y: A.gy + 1, col: '#ffffff' }], traffic([[-1065, 0, A.gy + 3]], 12, () => rs() < .6 ? 'car' : 'suv', span));
      const ppl = crowd([-845, -1005], 12 * q + 4, A.gy + 3, span), dogs = ppl.filter((p, i) => i % 3 === 0).map(p => ({ kind: 'dog', x0: p.x0 + 26 * Math.sign(p.v), z: p.z + 6, v: p.v, y: A.gy + 3, bob: .3, col: ['#f5f5f4', '#78350f', '#1f2937', '#d97706'][(rs() * 4) | 0] }));
      const kids = []; for (let i = 0; i < 5; i++) kids.push({ kind: 'bike', x0: rs() * span, z: -848 - rs() * 8, v: 1.4 + rs(), y: A.gy + 3, bob: .25, skin: PALETTE.skin[(rs() * 6) | 0], shirt: PALETTE.shirt[(rs() * 12) | 0], pants: '#1e3a8a', k: .8 });
      fleet(Object.assign({}, KIT, { bus, ice: icecream, dog, bike }), list.concat(ppl, dogs, kids), { span });
      fleet({ b: bird(MAT({ color: '#1f2937', vertexColors: false }), MAT({ color: '#1f2937', vertexColors: false }), 1.3) }, flock('b', 10, [-900, -1800], [200, 600], [1.5, 3, 'both']), { span });
      for (let i = 0; i < 9 * q + 3; i++) { const s = new T.Sprite(spriteM('#ffffff', .75)); s.scale.set(700 + rs() * 600, 220 + rs() * 120, 1); ride(A.layers[2] || A.layers[0], s, rs() * 4000, 1000 + rs() * 700, -800 - rs() * 1000); }
    },
    // Starlight Park: theme park at dusk - a physics-driven looping coaster, Ferris wheel, carousel, drop tower, swinging ship, fireworks
    park() {
      A.gy = -470; A.fogNear = 900; A.fogFar = 7600; A.tilt = .12; A.speed = 1.8;
      sky('#1e1b4b', '#fb7185', '#2a1840', { fog: '#7a4a7a', sun: '#fdba74', sx: -.4, sy: .02 });
      amb.intensity = .45; sunL.color.set(lc('#fecaca')); sunL.intensity = 1.3; sunL.position.set(-600, 250, -500); scene.add(track(new T.HemisphereLight(lc('#c4b5fd'), lc('#3b2a4a'), .6)));
      const KIT = kits();
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#b8a48c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a08c74'; for (let x = 0; x < w; x += 32) for (let y = 0; y < h; y += 32) g.strokeRect(x + (y / 32 % 2) * 16, y, 32, 32); g.fillStyle = '#4d8b3a'; g.fillRect(0, 0, w, 40); }, { tile: 420 });
      const C = c => MAT({ color: c, vertexColors: false }), G2 = (c, i) => MAT({ color: '#000000', emissive: c, emissiveIntensity: i || 2.2, vertexColors: false });
      const steel = C('#e11d48'), steel2 = C('#f8fafc'), sup = C('#94a3b8'), bulbs = [G2('#fde68a'), G2('#f472b6'), G2('#67e8f9')];
      // ---------------- the roller coaster ----------------
      const P = [[0, 40, 120], [140, 40, 120], [230, 60, 120], [420, 380, 120], [520, 520, 110], [560, 520, 95], [620, 380, 80], [690, 60, 60], [760, 30, 40],
        [840, 60, 30], [900, 170, 20], [905, 290, 10], [850, 350, 0], [790, 290, -10], [795, 170, -20], [860, 60, -30], [960, 30, -40], // vertical loop
        [1080, 260, -50], [1180, 270, -50], [1290, 60, -50], [1400, 120, -40], [1470, 200, 30], [1430, 240, 130], [1330, 210, 160], [1250, 150, 140], [1240, 110, 60], // camelback + helix turnaround
        [1150, 60, -130], [1020, 140, -150], [900, 60, -150], [760, 120, -150], [620, 50, -150], [420, 40, -140], [200, 40, -60], [60, 40, 40]];
      const curve = new T.CatmullRomCurve3(P.map(p => new T.Vector3(p[0], p[1], p[2])), true, 'centripetal', .5), N = 900, pts = curve.getSpacedPoints(N), tan = [], up = [];
      for (let i = 0; i <= N; i++) tan.push(curve.getTangentAt(i / N).normalize());
      { // parallel-transport the "up" vector along the track (keeps it upright on hills and inverts it correctly through the loop)
        let u = new T.Vector3(0, 1, 0); u.sub(tan[0].clone().multiplyScalar(u.dot(tan[0]))).normalize(); up.push(u.clone()); const q = new T.Quaternion();
        for (let i = 1; i <= N; i++) { q.setFromUnitVectors(tan[i - 1], tan[i]); u.applyQuaternion(q); u.sub(tan[i].clone().multiplyScalar(u.dot(tan[i]))).normalize(); up.push(u.clone()); }
        const tw = Math.atan2(new T.Vector3().crossVectors(up[N], up[0]).dot(tan[0]), up[N].dot(up[0])); for (let i = 0; i <= N; i++) up[i].applyAxisAngle(tan[i], tw * i / N); // close the twist
      }
      const side = i => new T.Vector3().crossVectors(tan[i], up[i]).normalize();
      const rail = (off, upOff, r, mat) => { const ps = []; for (let i = 0; i <= N; i += 2) ps.push(pts[i].clone().add(side(i).multiplyScalar(off)).add(up[i].clone().multiplyScalar(upOff))); const g = new T.TubeGeometry(new T.CatmullRomCurve3(ps, true), N, r, 6, true); track(g); const m = new T.Mesh(g, mat); return ink(m); };
      const cg = new T.Group(); cg.add(rail(9, 0, 2.6, steel), rail(-9, 0, 2.6, steel), rail(0, -9, 3.6, steel));
      { const n = (N / 6) | 0, ties = new T.InstancedMesh(G.box, steel2, n), d = new T.Object3D(); for (let k = 0; k < n; k++) { const i = k * 6; d.position.copy(pts[i]).add(up[i].clone().multiplyScalar(-4)); d.up.copy(up[i]); d.lookAt(pts[i].clone().add(tan[i])); d.scale.set(22, 2.5, 3); d.updateMatrix(); ties.setMatrixAt(k, d.matrix); } cg.add(ties); ink(ties);
        const sp = []; for (let i = 0; i < N; i += 14) { if (up[i].y < .6 || pts[i].y < 30) continue; sp.push(i); } const sups = new T.InstancedMesh(G.cyl6, sup, sp.length); sp.forEach((i, k) => { const h = pts[i].y - 9; d.position.set(pts[i].x, h / 2, pts[i].z); d.rotation.set(0, 0, 0); d.up.set(0, 1, 0); d.quaternion.identity(); d.scale.set(5, h, 5); d.updateMatrix(); sups.setMatrixAt(k, d.matrix); }); cg.add(sups); ink(sups); }
      // station + lift-hill chain lights
      const stn = new T.Group(); { const roof = new T.Mesh(G.box, C('#7c3aed')); roof.scale.set(200, 8, 90); roof.position.set(90, 120, 120); stn.add(roof); for (const x of [0, 180]) for (const z of [80, 160]) { const p = new T.Mesh(G.cyl6, sup); p.scale.set(6, 120, 6); p.position.set(x, 60, z); stn.add(p); } const sg = new T.Mesh(G.box, sign('STARLIGHT EXPRESS', '#4c1d95', '#fde68a')); sg.scale.set(150, 30, 3); sg.position.set(90, 140, 165); stn.add(sg); }
      cg.add(inkTree(stn));
      // the train: physics speed from the drop height; chain lift pulls it up the hill at a steady clip
      const trainCars = []; const carBody = C('#2563eb'), seatM = C('#111827');
      for (let c = 0; c < 5; c++) { const g = new T.Group(), b = new T.Mesh(G.box, c === 0 ? C('#facc15') : carBody); b.scale.set(26, 10, 22); b.position.y = 8; g.add(b); const s1 = new T.Mesh(G.box, seatM); s1.scale.set(6, 10, 20); s1.position.set(-8, 15, 0); g.add(s1);
        for (const z of [-5, 5]) { const h = new T.Mesh(G.head, C(PALETTE.skin[(rs() * 6) | 0])); h.scale.setScalar(6); h.position.set(-2, 20, z); g.add(h); const bd = new T.Mesh(G.capsule, C(PALETTE.shirt[(rs() * 12) | 0])); bd.scale.set(5, 8, 5); bd.position.set(-2, 13, z); g.add(bd); }
        inkTree(g); cg.add(g); trainCars.push(g); }
      const len = curve.getLength(), Htop = 520, LIFT = [230 / 1560, 560 / 1560];
      const st = { s: 0, v: 1.2 }, mtx = new T.Matrix4(), yAx = new T.Vector3(), zAx = new T.Vector3();
      const sAt = s => { s = ((s % len) + len) % len; const f = s / len * N, i = Math.floor(f) % N, k = f - Math.floor(f); return { p: pts[i].clone().lerp(pts[i + 1], k), t: tan[i].clone().lerp(tan[i + 1], k).normalize(), u: up[i].clone().lerp(up[i + 1], k).normalize(), f: s / len }; };
      A.upd.push(df => {
        const a = sAt(st.s), y = a.p.y, onLift = a.f > .035 && a.f < .2, inStation = a.f < .035 || a.f > .965;
        st.v = onLift ? 1.4 : inStation ? Math.max(1, st.v * .95) : Math.max(1.4, Math.sqrt(2 * .16 * Math.max(0, Htop + 30 - y)) * .98);
        st.s += st.v * df * .9;
        trainCars.forEach((g, c) => { const b = sAt(st.s - c * 30); zAx.crossVectors(b.t, b.u).normalize(); yAx.copy(b.u); mtx.makeBasis(b.t, yAx, zAx); g.quaternion.setFromRotationMatrix(mtx); g.position.copy(b.p); });
      });
      const coaster = layer(-2000, lenFor(-2000), () => { }); coaster.len = 8000; cg.scale.setScalar(1.35); cg.position.set(-300, gy(), coaster.z - 60); coaster.g.add(cg); // one big coaster (no clones: it moves through the frame as the park scrolls)
      // ---------------- other rides ----------------
      const wheel = new T.Group(), R = 260; { const rim = new T.Mesh(new T.TorusGeometry(R, 4, 6, 64), steel2); track(rim.geometry); wheel.add(rim); const rim2 = rim.clone(); rim2.position.z = 30; wheel.add(rim2); for (let i = 0; i < 16; i++) { const sp = new T.Mesh(G.box, steel2); sp.scale.set(R * 2, 3, 3); sp.rotation.z = i / 16 * Math.PI; wheel.add(sp); }
        for (let i = 0; i < 32; i++) { const b = new T.Mesh(G.sph, bulbs[i % 3]); b.scale.setScalar(9); b.position.set(Math.cos(i / 32 * 6.283) * R, Math.sin(i / 32 * 6.283) * R, 16); wheel.add(b); }
        wheel.userData.cars = []; for (let i = 0; i < 12; i++) { const c = new T.Mesh(G.box, C(['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'][i % 6])); c.scale.set(34, 30, 26); c.position.set(Math.cos(i / 12 * 6.283) * R, Math.sin(i / 12 * 6.283) * R - 22, 15); wheel.add(c); wheel.userData.cars.push(c); } }
      const wheelBase = new T.Group(); { for (const s of [-1, 1]) { const l = new T.Mesh(G.box, sup); l.scale.set(10, R + 40, 10); l.position.set(s * 70, (R + 40) / 2, 0); l.rotation.z = -s * .25; wheelBase.add(l); } wheel.position.y = R + 40; wheelBase.add(wheel); }
      const far = layer(-3000, lenFor(-3000), () => { }); far.len = 11000; inkTree(wheelBase); wheelBase.position.set(1400, gy(), far.z); far.g.add(wheelBase);
      A.anims.push([wheel, (o, t, df) => { o.rotation.z += .0025 * df; o.userData.cars.forEach((c, i) => { const a = i / 12 * 6.283 + o.rotation.z; c.position.set(Math.cos(a) * R, Math.sin(a) * R - 22, 15); c.rotation.z = -o.rotation.z; }); }]);
      // carousel
      const car = new T.Group(); { const base = new T.Mesh(G.cyl, C('#f8fafc')); base.scale.set(220, 16, 220); car.add(base); const roof = new T.Mesh(new T.ConeGeometry(130, 70, 12), C('#ec4899')); track(roof.geometry); roof.position.y = 150; car.add(roof); const pole = new T.Mesh(G.cyl6, C('#fde68a')); pole.scale.set(16, 140, 16); pole.position.y = 80; car.add(pole);
        const spin = new T.Group(); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, p = new T.Mesh(G.cyl6, C('#fde68a')); p.scale.set(3, 130, 3); p.position.set(Math.cos(a) * 85, 80, Math.sin(a) * 85); spin.add(p); const h = new T.Mesh(G.box, C(['#f8fafc', '#fbbf24', '#a78bfa'][i % 3])); h.scale.set(34, 18, 10); h.position.set(Math.cos(a) * 85, 60, Math.sin(a) * 85); h.rotation.y = -a; h.userData.a = a; spin.add(h); }
        for (let i = 0; i < 24; i++) { const b = new T.Mesh(G.sph, bulbs[i % 3]); b.scale.setScalar(7); b.position.set(Math.cos(i / 24 * 6.283) * 128, 118, Math.sin(i / 24 * 6.283) * 128); spin.add(b); } car.add(spin); car.userData.spin = spin; }
      // drop tower and swinging ship
      const tower = new T.Group(); { const m = new T.Mesh(G.box, sup); m.scale.set(26, 760, 26); m.position.y = 380; tower.add(m); const top = new T.Mesh(G.sph, bulbs[1]); top.scale.setScalar(30); top.position.y = 770; tower.add(top); const ring = new T.Mesh(new T.TorusGeometry(34, 10, 6, 20), C('#22c55e')); track(ring.geometry); ring.rotation.x = Math.PI / 2; ring.position.y = 60; tower.add(ring); tower.userData.ring = ring; }
      const ship = new T.Group(); { for (const s of [-1, 1]) { const l = new T.Mesh(G.box, sup); l.scale.set(8, 230, 8); l.position.set(s * 70, 110, 0); l.rotation.z = s * .3; ship.add(l); } const arm = new T.Group(); arm.position.y = 215; const hull = new T.Mesh(G.half, C('#92400e')); hull.scale.set(220, 110, 300); hull.rotation.z = Math.PI; hull.position.y = -160; arm.add(hull); const mast = new T.Mesh(G.box, C('#78350f')); mast.scale.set(6, 120, 6); mast.position.y = -110; arm.add(mast); const sail = new T.Mesh(G.box, C('#f8fafc')); sail.scale.set(70, 60, 2); sail.position.y = -100; arm.add(sail); ship.add(arm); ship.userData.arm = arm; }
      const mid = layer(-1500, lenFor(-1500), put => { const L = lenFor(-1500); // food stands, game booths, string lights
        for (let x = 60; x < L; x += 230) { const k = (x / 230) | 0, col = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'][k % 5]; put(C('#f8fafc'), G.box, x, gy() + 35, 0, 120, 70, 80); put(C(col), G.cone4, x, gy() + 95, 0, 150, 50, 110, 0, Math.PI / 4, 0); put(C(col), G.box, x, gy() + 72, 42, 120, 6, 4); }
        for (let x = 0; x < L; x += 26) put(bulbs[(x / 26 | 0) % 3], G.sph, x, gy() + 180 + Math.sin(x / 115 * Math.PI) * 18, 60, 6, 6, 6); for (let x = 0; x < L; x += 230) put(sup, G.cyl6, x + 115, gy() + 95, 60, 5, 190, 5); });
      const rides = layer(-1800, 1000, () => { }); rides.len = 6200; [[car, 300], [tower, 2200], [ship, 4100]].forEach(([o, x]) => { inkTree(o); o.position.set(x, gy(), rides.z); rides.g.add(o); });
      A.anims.push([car, (o, t, df) => { o.userData.spin.rotation.y += .012 * df; o.userData.spin.children.forEach(c => { if (c.userData.a !== undefined) c.position.y = 60 + Math.sin(t * 3 + c.userData.a * 2) * 10; }); }]);
      A.anims.push([tower, (o, t) => { const c = (t * .15) % 1; o.userData.ring.position.y = c < .7 ? 60 + c / .7 * 640 : c < .78 ? 700 : 700 - Math.pow((c - .78) / .22, 2) * 640; }]);
      A.anims.push([ship, (o, t) => { o.userData.arm.rotation.z = Math.sin(t * .9) * .95; }]);
      // crowds with balloons, and fireworks over the park
      const bal = MAT({ color: '#ffffff', vertexColors: false }), walkerB = KIT.walker.concat([[G.sph, bal, 6, 46, 0, 9, 11, 9, 'body'], [G.box, MAT({ color: '#e5e7eb', vertexColors: false }), 4, 34, 0, .5, 22, .5]]);
      const ppl = crowd([-1180, -1240, -1300], 16 * q + 5, A.gy + 1, 7000); ppl.forEach((p, i) => { if (i % 4 === 0) { p.kind = 'walkerB'; p.col = ['#ef4444', '#facc15', '#22d3ee', '#a855f7', '#f472b6'][i % 5]; } });
      fleet(Object.assign({}, KIT, { walkerB }), ppl, { span: 7000 });
      const FW = 6, fwN = 70, fp = new Float32Array(FW * fwN * 3), fsz = new Float32Array(FW * fwN), fcol = new Float32Array(FW * fwN * 3), fg = track(new T.BufferGeometry());
      fg.setAttribute('position', new T.BufferAttribute(fp, 3)); fg.setAttribute('sz', new T.BufferAttribute(fsz, 1)); fg.setAttribute('col', new T.BufferAttribute(fcol, 3));
      const fm = track(new T.ShaderMaterial({ uniforms: { pr: { value: 1 } }, vertexShader: 'attribute float sz; attribute vec3 col; varying vec3 vC; uniform float pr; void main(){ vC=col; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=sz*pr*900./max(-mv.z,1.); }', fragmentShader: 'varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5); float a=1.-smoothstep(0.,.5,d); gl_FragColor=vec4(vC*a*a,1.); }', blending: T.AdditiveBlending, transparent: true, depthWrite: false }));
      const fpts = new T.Points(fg, fm); fpts.frustumCulled = false; scene.add(fpts);
      const shells = []; for (let i = 0; i < FW; i++) shells.push({ age: 999, cx: 0, cy: 0, cz: 0, vel: [], c: [1, 1, 1] });
      A.upd.push(df => { fm.uniforms.pr.value = X.pr();
        shells.forEach((s, si) => { s.age += df; if (s.age > 110 && Math.random() < .01 * df) { s.age = 0; s.cx = (Math.random() - .5) * 3000; s.cy = 700 + Math.random() * 500; s.cz = -3000 - Math.random() * 1500; s.c = [[1, .4, .6], [.5, .9, 1], [1, .85, .3], [.7, .5, 1], [.4, 1, .6]][(Math.random() * 5) | 0]; s.vel = []; for (let k = 0; k < fwN; k++) { const a = Math.random() * 6.283, b = Math.acos(Math.random() * 2 - 1), sp = 5 + Math.random() * 2; s.vel.push([Math.cos(a) * Math.sin(b) * sp, Math.cos(b) * sp, Math.sin(a) * Math.sin(b) * sp]); } }
          const life = Math.max(0, 1 - s.age / 90); for (let k = 0; k < fwN; k++) { const j = si * fwN + k, v = s.vel[k] || [0, 0, 0], a = s.age; fp[j * 3] = s.cx + v[0] * a; fp[j * 3 + 1] = s.cy + v[1] * a - .02 * a * a; fp[j * 3 + 2] = s.cz + v[2] * a; fsz[j] = life > 0 ? 7 : 0; fcol[j * 3] = s.c[0] * life; fcol[j * 3 + 1] = s.c[1] * life; fcol[j * 3 + 2] = s.c[2] * life; } });
        fg.attributes.position.needsUpdate = true; fg.attributes.sz.needsUpdate = true; fg.attributes.col.needsUpdate = true; });
      layer(-4400, lenFor(-4400), put => { const L = lenFor(-4400); for (let i = 0; i < 30; i++) put(C('#3b2a4a'), G.ico, rs() * L, gy() + 80, (rs() - .5) * 600, 240 + rs() * 260, 140 + rs() * 200, 200, 0, rs() * 3, 0); });
    }
  });
  function facadeTex(a, b) { return srgb(new T.CanvasTexture(canv(64, 64, (g, w, h) => { g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; for (let y = 0; y < h; y += 8) for (let x = (y / 8 % 2) * 8; x < w; x += 16) { g.beginPath(); g.moveTo(x + 4, y); g.lineTo(x + 8, y + 4); g.lineTo(x + 4, y + 8); g.lineTo(x, y + 4); g.closePath(); g.fill(); } g.fillStyle = 'rgba(80,60,10,.12)'; g.fillRect(0, 0, 2, h); }))); }
  Object.assign(K, {
    // The Backrooms: endless mono-yellow rooms, damp carpet, buzzing fluorescent panels
    backrooms() {
      A.gy = -420; A.fogNear = 300; A.fogFar = 4200; A.tilt = 0; A.speed = 1.6; const CEIL = 520;
      sky('#3d3518', '#8a7a3c', '#2a2410', { fog: '#a8964f' });
      amb.intensity = .75; amb.color.set(lc('#fff3c4')); sunL.color.set(lc('#fff7d6')); sunL.intensity = .7; sunL.position.set(0, 1000, 200); const hemi = new T.HemisphereLight(lc('#fff3c4'), lc('#6b5a2a'), .5); scene.add(track(hemi));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#8a7238'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = ['#7f6831', '#957c40', '#86703a', '#6f5b2b'][i % 4]; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(60,45,15,.25)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 30, 10 + Math.random() * 20, 0, 0, 6.3); g.fill(); } }, { tile: 380 });
      // ceiling tiles with fluorescent panels (a second scrolling plane, facing down)
      const ctex = srgb(new T.CanvasTexture(canv(256, 256, (g, w, h) => { g.fillStyle = '#d8d0a8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a99f72'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } g.fillStyle = '#fffbe6'; g.fillRect(70, 70, 52, 116); })));
      const cem = srgb(new T.CanvasTexture(canv(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff6cc'; g.fillRect(70, 70, 52, 116); })));
      ctex.repeat.set(20000 / 300, 9000 / 300); cem.repeat.copy(ctex.repeat);
      const cm = track(SET.toon ? new T.MeshToonMaterial({ map: ctex, gradientMap: toonGrad(), emissive: lc('#fff3c4'), emissiveMap: cem, emissiveIntensity: 1.2 }) : new T.MeshStandardMaterial({ map: ctex, emissive: lc('#fff3c4'), emissiveMap: cem, emissiveIntensity: 1.2 }));
      const ceil = new T.Mesh(track(new T.PlaneGeometry(20000, 9000)), cm); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, CEIL, -4300); scene.add(ceil);
      let flick = 0; A.upd.push((df, S) => { const off = (S / 300) % 1; ctex.offset.x = off; cem.offset.x = off; flick -= df; if (flick < -260 && Math.random() < .01 * df && !SET.reduce) flick = 26; const f = flick > 0 ? (Math.random() < .5 ? .25 : 1) : 1; cm.emissiveIntensity = 1.2 * f; amb.intensity = .75 * (.55 + .45 * f); hemi.intensity = .5 * f; });
      const wp = facadeTex('#cbb35a', '#bfa54c'), wall = MAT({ map: wp, color: '#ffffff', flatShading: false }), base = MAT({ color: '#8f7a3a' }), H2 = CEIL - A.gy;
      // walls with openings at several depths, so you always see rooms behind rooms
      layer(-1150, lenFor(-1150), put => { const L = lenFor(-1150); for (let x = 200; x < L; x += 500 + rs() * 400) put(wall, G.box, x, A.gy + H2 / 2, (rs() - .5) * 200, 54, H2, 54, 0, 0, 0, 54 / 140, H2 / 140); });
      [[-1700, .4], [-2400, .5], [-3300, .65]].forEach(([z, fill]) => layer(z, lenFor(z), put => { const L = lenFor(z); let x = 0;
        while (x < L) { const seg = 120 + rs() * 420; if (rs() < fill) { put(wall, G.box, x + seg / 2, A.gy + H2 / 2, 0, seg, H2, 26, 0, 0, 0, seg / 140, H2 / 140); put(base, G.box, x + seg / 2, A.gy + 8, 14, seg, 16, 2); } else if (rs() < .4) { put(wall, G.box, x + 30, A.gy + H2 / 2, 0, 60, H2, 60, 0, 0, 0, 60 / 140, H2 / 140); } x += seg; } }));
      // something stands in a far doorway, now and then
      const fig = new T.Group(); { const m = track(new T.MeshBasicMaterial({ color: 0x0b0905 })); const b = new T.Mesh(G.box, m); b.scale.set(26, 190, 14); b.position.y = 95; fig.add(b); const h = new T.Mesh(G.head, m); h.scale.setScalar(24); h.position.y = 205; fig.add(h); for (const s of [-1, 1]) { const a = new T.Mesh(G.box, m); a.scale.set(6, 170, 6); a.position.set(s * 18, 110, 0); fig.add(a); } }
      fig.visible = false; fig.position.set(0, A.gy, -3000); scene.add(fig); let seen = -1;
      A.upd.push((df, S) => { const t = X.timeU.value; if (seen < 0 && Math.random() < .0006 * df) { seen = 180; fig.position.x = 300 + Math.random() * 600; } if (seen >= 0) { seen -= df; fig.position.x -= 1.6 * .3 * df; fig.visible = seen > 0 && (seen > 20 || (seen | 0) % 4 < 2); } });
      weather(0, 500, '#fff3c4', [1300, 700, 1300], [-.2, -.1, 3], 3);
    },
    // Blocklands: a world made of blocks
    blocks() {
      A.gy = -470; A.fogNear = 1100; A.fogFar = 6500; A.tilt = .12; A.speed = 1.8; const B = 60;
      sky('#3b82f6', '#bfe3ff', '#7aa7d9', { fog: '#bcdcf5' });
      amb.intensity = .55; sunL.color.set(lc('#fffbe6')); sunL.intensity = 1.8; sunL.position.set(500, 900, 300); scene.add(track(new T.HemisphereLight(lc('#bfdbfe'), lc('#5b8a3a'), .6)));
      const px = (fn) => { const c = canv(16, 16, fn), t = srgb(new T.CanvasTexture(c)); t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false; return t; };
      const noise = (g, base, cols, n) => { g.fillStyle = base; g.fillRect(0, 0, 16, 16); for (let i = 0; i < (n || 70); i++) { g.fillStyle = cols[(Math.random() * cols.length) | 0]; g.fillRect((Math.random() * 16) | 0, (Math.random() * 16) | 0, 1, 1); } };
      const T_ = {
        top: px(g => noise(g, '#5fa83a', ['#4f9a2f', '#6cb845', '#57a034', '#79c24f'], 120)),
        side: px(g => { noise(g, '#8a5a33', ['#7a4e2b', '#966640', '#6e4426', '#a0714a'], 90); g.fillStyle = '#5fa83a'; g.fillRect(0, 0, 16, 3); for (let x = 0; x < 16; x++) if (Math.random() < .5) g.fillRect(x, 3, 1, 1 + (Math.random() * 2 | 0)); }),
        dirt: px(g => noise(g, '#8a5a33', ['#7a4e2b', '#966640', '#6e4426', '#a0714a'], 90)),
        stone: px(g => noise(g, '#8b8b8b', ['#7a7a7a', '#9a9a9a', '#6e6e6e', '#a5a5a5'], 100)),
        ore: px(g => { noise(g, '#8b8b8b', ['#7a7a7a', '#9a9a9a'], 80); g.fillStyle = '#1f1f1f'; [[3, 4], [4, 4], [10, 9], [11, 10], [6, 12], [12, 3]].forEach(p => g.fillRect(p[0], p[1], 2, 2)); }),
        gold: px(g => { noise(g, '#8b8b8b', ['#7a7a7a', '#9a9a9a'], 80); g.fillStyle = '#facc15'; [[4, 3], [9, 8], [5, 11], [12, 12]].forEach(p => g.fillRect(p[0], p[1], 2, 2)); }),
        log: px(g => { g.fillStyle = '#6b4a2b'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#4e3520'; for (let x = 0; x < 16; x += 3) g.fillRect(x, 0, 1, 16); }),
        leaf: px(g => noise(g, '#3f8f2f', ['#2f7a22', '#4ea53a', '#2a6b1e'], 120)),
        sand: px(g => noise(g, '#e3d29a', ['#d6c286', '#efe0aa'], 80))
      };
      const M_ = {}; for (const k in T_) M_[k] = MAT({ map: T_[k], color: '#ffffff' });
      ground('#ffffff', (g, w, h) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = ['#5fa83a', '#4f9a2f', '#6cb845', '#57a034'][(Math.random() * 4) | 0]; g.fillRect(x * 16, y * 16, 16, 16); } g.strokeStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i <= 4; i++) { g.strokeRect(0, i * 64, w, 0); g.strokeRect(i * 64, 0, 0, h); } }, { tile: 240 });
      const hgt = (col, row) => Math.max(1, Math.round(2 + 1.3 * Math.sin(col * .21 + row * 1.7) + .9 * Math.sin(col * .53 + row * .9) + .5 * Math.sin(col * 1.3)));
      const H = [];
      const terrain = (z0, rows, bs, cols, flora) => { for (let r = 0; r < rows; r++) { const z = z0 - r * bs, L = cols * bs; const LH = []; H.push({ z, L, bs, LH });
        layer(z, L, put => { for (let c = 0; c < cols; c++) { const h = hgt(c + r * 7, r + z0 * .01) + (bs > B ? 2 : 0), x = c * bs + bs / 2; LH.push(h);
            for (let k = 0; k < h; k++) { const y = A.gy + k * bs + bs / 2, top = k === h - 1, depth = h - 1 - k; const m = top ? M_.side : depth < 2 ? M_.dirt : rs() < .08 ? M_.ore : rs() < .03 ? M_.gold : M_.stone; put(m, G.box, x, y, 0, bs, bs, bs); }
            put(M_.top, G.box, x, A.gy + h * bs + 1, 0, bs, 2, bs);
            if (flora && rs() < .12 && c % 3 === 1) { const th = 3 + (rs() * 2 | 0); for (let k = 0; k < th; k++) put(M_.log, G.box, x, A.gy + (h + k) * bs + bs / 2, 0, bs, bs, bs); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let l = 0; l < 2; l++) if (!(a === 0 && b === 0 && l === 0) || true) put(M_.leaf, G.box, x + a * bs, A.gy + (h + th + l - 1) * bs + bs / 2, b * bs, bs, bs, bs); put(M_.leaf, G.box, x, A.gy + (h + th + 1) * bs + bs / 2, 0, bs, bs, bs); }
            else if (flora && rs() < .18) put(rs() < .5 ? MAT({ color: '#ef4444', vertexColors: false }) : MAT({ color: '#facc15', vertexColors: false }), G.box, x + (rs() - .5) * bs * .5, A.gy + h * bs + 8, (rs() - .5) * bs * .5, 6, 14, 6); } }); } };
      terrain(-1150, 6, B, 46, true); terrain(-2000, 3, B * 2, 30, true); terrain(-3600, 2, B * 4, 26, false);
      // square clouds, square sun
      const cl = layer(-4200, lenFor(-4200), put => { const L = lenFor(-3600); const wm = MAT({ color: '#ffffff', vertexColors: false }); for (let i = 0; i < 14; i++) { const x = rs() * L, y = 900 + rs() * 500, w = 2 + (rs() * 4 | 0); for (let a = 0; a < w; a++) for (let b = 0; b < 2; b++) if (rs() < .85) put(wm, G.box, x + a * 120, y, b * 120, 120, 40, 120); } });
      const sun = new T.Mesh(G.plane, BAS({ color: '#fff7c2', opacity: 1, side: T.DoubleSide, blending: T.NormalBlending })); sun.scale.set(500, 500, 1); sun.position.set(1800, 2600, -6800); scene.add(sun);
      // blocky critters strolling over the hills (they follow the terrain height)
      const row = H[1], Cm = c => MAT({ color: c, vertexColors: false });
      const critter = (body, head, legs, extra) => { const g = new T.Group(), b = new T.Mesh(G.box, body); b.scale.set(34, 22, 22); b.position.y = 22; g.add(b); const h = new T.Mesh(G.box, head); h.scale.set(18, 18, 18); h.position.set(22, 30, 0); g.add(h);
        for (const [x, z] of [[-11, -7], [-11, 7], [11, -7], [11, 7]]) { const l = new T.Mesh(G.box, legs); l.scale.set(7, 12, 7); l.position.set(x, 6, z); g.add(l); } if (extra) extra(g); return g; };
      const kinds = [() => critter(Cm('#f4a3b0'), Cm('#f4a3b0'), Cm('#e88c9b'), g => { const s = new T.Mesh(G.box, Cm('#e07888')); s.scale.set(4, 6, 10); s.position.set(31, 28, 0); g.add(s); }),
        () => critter(Cm('#f1f5f9'), Cm('#d6c5b0'), Cm('#d6c5b0')), () => { const g = critter(Cm('#ffffff'), Cm('#ffffff'), Cm('#f59e0b'), g2 => { const c = new T.Mesh(G.box, Cm('#ef4444')); c.scale.set(4, 6, 4); c.position.set(24, 42, 0); g2.add(c); }); g.scale.setScalar(.6); return g; }];
      for (let i = 0; i < 9; i++) { const g = kinds[i % 3](), v = (rs() < .5 ? -1 : 1) * (.3 + rs() * .4), L = A.layers[1];
        if (v < 0) g.rotation.y = Math.PI; ride(L, g, rs() * L.len, A.gy, 0, (o, t, df) => { o.position.x += v * df; const lx = ((o.position.x % L.len) + L.len) % L.len, c = Math.min(row.LH.length - 1, Math.max(0, Math.floor(lx / row.bs))); o.position.y = A.gy + row.LH[c] * row.bs + 2 + Math.abs(Math.sin(t * 6 + o.id)) * 2; }); }
    }
  });
  Object.assign(K, {
    // Midnight Freeway: eight lanes of night traffic, sodium lights, sign gantries, overpasses and a glowing skyline
    freeway() {
      A.gy = -540; A.fogNear = 700; A.fogFar = 6800; A.tilt = .16; A.speed = 3;
      sky('#05060f', '#5a2d1a', '#0b0b14', { fog: '#22161f', sun: '#ff7a3d', sx: .1, sy: -.02 });
      amb.intensity = .3; sunL.color.set(lc('#ffb070')); sunL.intensity = .8; sunL.position.set(0, 600, 400); scene.add(track(new T.HemisphereLight(lc('#5b6bd6'), lc('#2a1a12'), .45)));
      const KIT = kits(); const C = c => MAT({ color: c, vertexColors: false }), GL = (c, i) => MAT({ color: '#000000', emissive: c, emissiveIntensity: i || 2.4, vertexColors: false });
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#16151c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(80,70,90,.3)'; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } }, { tile: 600 });
      strip(-880, -1300, A.gy + 2, '#ffffff', (g, w, h) => { g.fillStyle = '#26252d'; g.fillRect(0, 0, w, h); g.fillStyle = '#e5e7eb'; for (let k = 1; k < 8; k++) { if (k === 4) { g.fillStyle = '#facc15'; g.fillRect(0, k * h / 8 - 3, w, 6); g.fillStyle = '#e5e7eb'; continue; } for (let x = 0; x < w; x += 80) g.fillRect(x, k * h / 8 - 1.5, 40, 3); } g.fillStyle = '#f8fafc'; g.fillRect(0, 2, w, 4); g.fillRect(0, h - 6, w, 4); }, { tile: 900 });
      const conc = C('#9ca3af'), lamp = GL('#ffb347', 3), pole = C('#4b5563'), green = sign('EXIT 16  NULL AVE', '#166534', '#f8fafc'), green2 = sign('AETHER CITY  12', '#166534', '#f8fafc'), green3 = sign('<- AIRPORT  RT 9', '#166534', '#f8fafc');
      layer(-880, lenFor(-880), put => { const L = lenFor(-880); put(conc, G.box, L / 2, A.gy + 18, 0, L, 36, 14); for (let x = 0; x < L; x += 280) { put(pole, G.cyl6, x, A.gy + 170, -10, 6, 300, 6); put(pole, G.box, x, A.gy + 318, -60, 6, 6, 110); put(lamp, G.box, x, A.gy + 312, -110, 18, 5, 12); } });
      layer(-1090, lenFor(-1090), put => { const L = lenFor(-1090); put(conc, G.box, L / 2, A.gy + 20, 0, L, 40, 18); });
      layer(-1310, lenFor(-1310), put => { const L = lenFor(-1310); put(conc, G.box, L / 2, A.gy + 18, 0, L, 36, 14); for (let x = 140; x < L; x += 280) { put(pole, G.cyl6, x, A.gy + 170, 10, 6, 300, 6); put(pole, G.box, x, A.gy + 318, 60, 6, 6, 110); put(lamp, G.box, x, A.gy + 312, 110, 18, 5, 12); } });
      layer(-1100, 3600, put => { for (const [x, s] of [[600, green], [2400, green2]]) { put(pole, G.box, x, A.gy + 220, -230, 14, 440, 14); put(pole, G.box, x, A.gy + 220, 230, 14, 440, 14); put(pole, G.box, x, A.gy + 430, 0, 14, 14, 480); put(s, G.box, x, A.gy + 400, -110, 4, 70, 200, 0, Math.PI / 2, 0); put(green3, G.box, x, A.gy + 400, 110, 4, 70, 200, 0, Math.PI / 2, 0); } });
      layer(-1750, lenFor(-1750), put => { const L = lenFor(-1750); for (let x = 400; x < L; x += 1400) { put(conc, G.box, x, A.gy + 230, 0, 1100, 40, 160); put(conc, G.box, x, A.gy + 260, 76, 1100, 30, 8); for (const dx of [-400, 0, 400]) put(conc, G.box, x + dx, A.gy + 105, 0, 40, 210, 60); } });
      const F = [facade('#151827', ['#fde68a', '#fef3c7', '#fca5a5'], .45, 6, 9), facade('#1c2033', ['#bae6fd', '#fde68a'], .4, 5, 8)], bm = F.map(f => MAT({ map: f.map, emissiveMap: f.emi, emissive: '#ffffff', emissiveIntensity: 1, flatShading: false })), red = GL('#ff3b3b', 3);
      [[-5200, 30, 1700], [-3600, 20, 1100]].forEach(([z, n, h0]) => layer(z, lenFor(z), put => { const L = lenFor(z); for (let i = 0; i < n * q + 6; i++) { const w = 200 + rs() * 300, h = h0 * (.3 + rs() * .7), x = rs() * L; put(bm[i % 2], G.box, x, A.gy + h / 2, (rs() - .5) * 500, w, h, w, 0, 0, 0, w / 70, h / 70); if (rs() < .4) put(red, G.box, x, A.gy + h + 20, 0, 10, 10, 10); } }));
      const semi = [[G.box, C('#e5e7eb'), -18, 34, 0, 110, 46, 30], [G.box, MAT({ color: '#ffffff', vertexColors: false }), 50, 22, 0, 30, 34, 28, 'body'], [G.box, C('#1e293b'), 60, 30, 0, 12, 12, 28.5], [G.wheel, C('#111111'), 52, 7, 14, 14, 14, 4], [G.wheel, C('#111111'), 52, 7, -14, 14, 14, 4], [G.wheel, C('#111111'), -50, 7, 14, 14, 14, 4], [G.wheel, C('#111111'), -50, 7, -14, 14, 14, 4], [G.wheel, C('#111111'), -30, 7, 14, 14, 14, 4], [G.wheel, C('#111111'), -30, 7, -14, 14, 14, 4], [G.box, GL('#fef3c7'), 65.5, 14, 9, 1, 5, 6], [G.box, GL('#fef3c7'), 65.5, 14, -9, 1, 5, 6], [G.box, GL('#ef4444'), -73.5, 14, 10, 1, 5, 6], [G.box, GL('#ef4444'), -73.5, 14, -10, 1, 5, 6]];
      const span = 7000, pick = () => { const r = rs(); return r < .55 ? 'car' : r < .72 ? 'suv' : r < .8 ? 'taxi' : r < .9 ? 'semi' : r < .95 ? 'bus' : 'police'; }, y = A.gy + 2;
      fleet(Object.assign({}, KIT, { semi }), traffic([[-910, 5, y], [-960, 4.2, y], [-1010, 3.4, y], [-1055, 2.8, y]], 8, pick, span).concat(traffic([[-1130, -2.8, y], [-1175, -3.4, y], [-1225, -4.2, y], [-1275, -5, y]], 8, pick, span)), { span });
      weather(0, 200, '#ffb347', [1400, 700, 1500], [-.5, .1, 3], 3);
    },
    // Hall Pass: a high school hallway between classes
    school() {
      A.gy = -420; A.fogNear = 600; A.fogFar = 4800; A.tilt = 0; A.speed = 1.6; const CEIL = 520, H2 = CEIL - A.gy, WZ = -1700;
      sky('#dfe7ef', '#e8edf2', '#c9d3dc', { fog: '#d9dee6' });
      amb.intensity = .8; amb.color.set(lc('#f8fafc')); sunL.color.set(lc('#ffffff')); sunL.intensity = .9; sunL.position.set(200, 900, 600); scene.add(track(new T.HemisphereLight(lc('#ffffff'), lc('#94a3b8'), .5)));
      const KIT = kits(); const C = c => MAT({ color: c, vertexColors: false });
      ground('#ffffff', (g, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#e2e8f0' : (x * 7 + y * 3) % 5 === 0 ? '#93c5fd' : '#cbd5e1'; g.fillRect(x * 32, y * 32, 32, 32); } g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 0, w, 3); }, { tile: 260, rough: .25 });
      const ctex = srgb(new T.CanvasTexture(canv(256, 256, (g, w, h) => { g.fillStyle = '#f1f5f9'; g.fillRect(0, 0, w, h); g.strokeStyle = '#cbd5e1'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } g.fillStyle = '#ffffff'; g.fillRect(8, 100, 240, 40); })));
      ctex.repeat.set(20000 / 320, 9000 / 320); const cm = track(SET.toon ? new T.MeshToonMaterial({ map: ctex, gradientMap: toonGrad(), emissive: lc('#ffffff'), emissiveMap: ctex, emissiveIntensity: .35 }) : new T.MeshStandardMaterial({ map: ctex, emissive: lc('#ffffff'), emissiveMap: ctex, emissiveIntensity: .35 }));
      const ceil = new T.Mesh(track(new T.PlaneGeometry(20000, 9000)), cm); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, CEIL, -4300); scene.add(ceil); A.upd.push((df, S) => { ctex.offset.x = (S / 320) % 1; });
      const lk = srgb(new T.CanvasTexture(canv(64, 128, (g, w, h) => { g.fillStyle = '#2563eb'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1e3a8a'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4); g.fillStyle = '#1e3a8a'; for (let i = 0; i < 5; i++) g.fillRect(16, 10 + i * 6, 32, 2); g.fillStyle = '#cbd5e1'; g.fillRect(48, 60, 6, 14); })));
      const locker = MAT({ map: lk, color: '#ffffff', flatShading: false }), wallM = C('#f1e9d8'), stripe = C('#1d4ed8'), wood = C('#8b5a2b'), glass = MAT({ color: '#000000', emissive: '#bae6fd', emissiveIntensity: .5, vertexColors: false }), board = C('#7c5a3a'), cork = C('#d4a373'), white = C('#f8fafc'), trophy = C('#facc15');
      const poster = ['GO AETHERS!', 'PROM - SAT 8PM', 'SCIENCE FAIR', 'CLASS OF 2027', 'CHESS CLUB'].map((t, i) => sign(t, ['#b91c1c', '#7c3aed', '#047857', '#1d4ed8', '#111827'][i], '#ffffff'));
      layer(WZ, lenFor(WZ), put => { const L = lenFor(WZ); put(wallM, G.box, L / 2, A.gy + H2 / 2, -20, L, H2, 20); put(stripe, G.box, L / 2, A.gy + 300, -8, L, 16, 2);
        let x = 0, k = 0; while (x < L - 200) { const t = k % 6;
          if (t < 3) { for (let i = 0; i < 6; i++) put(locker, G.box, x + 20 + i * 42, A.gy + 120, -6, 40, 240, 16); x += 270; }
          else if (t === 3) { put(wood, G.box, x + 60, A.gy + 105, -6, 90, 210, 6); put(glass, G.box, x + 75, A.gy + 150, -2, 26, 50, 2); put(white, G.box, x + 60, A.gy + 225, -4, 110, 10, 4); put(poster[k % 5], G.box, x + 160, A.gy + 240, -6, 110, 34, 3); x += 230; }
          else if (t === 4) { put(board, G.box, x + 100, A.gy + 220, -8, 170, 110, 6); put(cork, G.box, x + 100, A.gy + 220, -4, 156, 96, 2); for (let i = 0; i < 4; i++) put(MAT({ color: ['#fde68a', '#fecaca', '#bfdbfe', '#bbf7d0'][i], vertexColors: false }), G.box, x + 50 + i * 34, A.gy + 220 + (i % 2 ? 18 : -14), -2, 26, 30, 1); x += 220; }
          else { put(wood, G.box, x + 110, A.gy + 90, -10, 200, 180, 30); put(glass, G.box, x + 110, A.gy + 120, 6, 180, 110, 2); for (let i = 0; i < 4; i++) put(trophy, G.cyl6, x + 50 + i * 40, A.gy + 105, -6, 12, 30 + i * 6, 12); put(poster[0], G.box, x + 110, A.gy + 230, -6, 160, 36, 3); x += 250; }
          k++; } put(white, G.cyl, L * .5, A.gy + 400, -8, 50, 4, 50, Math.PI / 2, 0, 0); });
      layer(-1100, lenFor(-1100), put => { const L = lenFor(-1100); for (let x = 300; x < L; x += 900) { put(wallM, G.box, x, A.gy + H2 / 2, 0, 60, H2, 60); put(stripe, G.box, x, A.gy + 300, 31, 60, 16, 2); } });
      const pack = MAT({ color: '#ffffff', vertexColors: false }), stu = KIT.walker.concat([[G.box, pack, -5, 17, 0, 6, 10, 8, 'body']]);
      const ppl = crowd([-1450, -1520, -1600], 14 * q + 5, A.gy + 1, 7000); ppl.forEach((p, i) => { p.kind = 'stu'; p.col = PALETTE.shirt[(i * 5) % 12]; p.k = 1.15; if (i % 7 === 0) { p.v = 0; p.z = WZ + 30; } });
      fleet(Object.assign({}, KIT, { stu }), ppl, { span: 7000 });
      weather(0, 120, '#ffffff', [1300, 700, 1300], [-.2, -.05, 2], 2);
    },
    // Boardwalk: sand, surf, a pier and a sunset
    beach() {
      A.gy = -470; A.fogNear = 1200; A.fogFar = 9000; A.tilt = .1; A.speed = 1.7;
      sky('#3b4cc0', '#ffb36b', '#f6c7a0', { fog: '#f2c39a', sun: '#fff1c4', sx: .2, sy: .03 });
      amb.intensity = .55; sunL.color.set(lc('#ffd9a8')); sunL.intensity = 1.8; sunL.position.set(300, 200, -900); scene.add(track(new T.HemisphereLight(lc('#a5c8ff'), lc('#e8c48a'), .6)));
      const KIT = kits(); const C = c => MAT({ color: c, vertexColors: false });
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#e6c88f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1200; i++) { g.fillStyle = ['#d9b97c', '#f0d7a3', '#dcc08a'][i % 3]; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, { tile: 400 });
      const sea = strip(-1500, -9000, A.gy - 4, '#ffffff', (g, w, h) => { g.fillStyle = '#2b6cb0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.25)' : 'rgba(255,214,150,.25)'; g.fillRect(Math.random() * w, Math.random() * h, 10 + Math.random() * 40, 2); } }, { tile: 500, ty: 14 });
      const surf = strip(-1440, -1520, A.gy - 1, '#ffffff', (g, w, h) => { g.fillStyle = '#5fa8d3'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.85)'; for (let x = 0; x < w; x += 4) { const y = h * .3 + Math.sin(x * .05) * 10; g.fillRect(x, y, 4, 8); } }, { tile: 380 });
      A.upd.push(() => { sea.material.map.offset.y = (X.timeU.value * .02) % 1; surf.material.map.offset.y = Math.sin(X.timeU.value * .8) * .06; });
      strip(-760, -880, A.gy + 8, '#ffffff', (g, w, h) => { g.fillStyle = '#a16207'; g.fillRect(0, 0, w, h); g.strokeStyle = '#713f12'; g.lineWidth = 3; for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }, { tile: 200 });
      const wood = C('#8a5a2b'), white = C('#f8fafc'), trunk = C('#8b6b4a'), frond = C('#2f8f3a'), red = C('#ef4444'), tow = ['#ef4444', '#3b82f6', '#facc15', '#22c55e', '#ec4899', '#f97316'].map(C);
      layer(-890, lenFor(-890), put => { const L = lenFor(-890); put(wood, G.box, L / 2, A.gy + 34, 0, L, 4, 4); for (let x = 0; x < L; x += 60) put(wood, G.box, x, A.gy + 22, 0, 4, 28, 4); });
      layer(-1150, lenFor(-1150), put => { const L = lenFor(-1150); for (let i = 0; i < 12; i++) { const x = rs() * L, c = tow[i % 6], zz = (rs() - .5) * 220; put(white, G.cyl6, x, A.gy + 50, zz, 3, 100, 3); put(c, G.cone, x, A.gy + 105, zz, 110, 30, 110); put(tow[(i + 2) % 6], G.box, x + 30, A.gy + 2, zz + 20, 40, 2, 80); }
        for (let i = 0; i < 6; i++) { const x = rs() * L; let px = x, py = A.gy; for (let s = 0; s < 7; s++) { put(trunk, G.cyl6, px, py + 22, -200, 14 - s, 46, 14 - s, 0, 0, -.12); px += 5; py += 44; } for (let f = 0; f < 6; f++) put(frond, G.box, px + Math.cos(f) * 40, py + 4, -200 + Math.sin(f) * 40, 90, 6, 22, 0, -f, -.35); } });
      layer(-1300, 4200, put => { const x = 1200; put(white, G.box, x, A.gy + 110, 0, 50, 10, 50); for (const d of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) put(white, G.box, x + d[0], A.gy + 55, d[1], 5, 110, 5); put(red, G.box, x, A.gy + 140, 0, 54, 50, 54); put(white, G.roof, x, A.gy + 165, 0, 66, 30, 66); });
      layer(-2400, 6000, put => { const x0 = 800; for (let i = 0; i < 14; i++) { put(wood, G.box, x0, A.gy + 60, -i * 120, 140, 10, 120); put(wood, G.cyl6, x0 - 60, A.gy + 20, -i * 120, 8, 120, 8); put(wood, G.cyl6, x0 + 60, A.gy + 20, -i * 120, 8, 120, 8); } });
      const sail = [[G.box, C('#ffffff'), 0, 6, 0, 70, 12, 22, 'body'], [G.cyl6, C('#7c5a3a'), 4, 50, 0, 3, 90, 3], [G.cone4, C('#f8fafc'), 16, 52, 0, 4, 80, 40, null, null, 0]];
      fleet({ sail, gull: bird(C('#f8fafc'), C('#cbd5e1'), 1.4, C('#f59e0b')) }, flock('sail', 7, [-2200, -4200], [A.gy - 2, A.gy - 2], [.4, 1, 'both'], () => ({ k: 2, col: '#f8fafc' })).concat(flock('gull', 12, [-900, -1700], [-80, 380], [1.4, 3, 'both'], () => ({ k: 1.6 }))), { span: 7000 });
      const sw = MAT({ color: '#ffffff', vertexColors: false }), swimmer = KIT.walker.map(p => p[8] === 'shirt' ? [p[0], sw, p[2], p[3], p[4], p[5], p[6] * .7, p[7], 'shirt'] : p);
      const ppl = crowd([-820, -1020, -1240], 12 * q + 4, A.gy + 1, 7000); ppl.forEach((p, i) => { p.kind = 'sw'; p.y = p.z < -870 ? A.gy + 1 : A.gy + 10; p.shirt = ['#ef4444', '#facc15', '#22d3ee', '#ec4899', '#22c55e'][i % 5]; p.pants = p.shirt; p.k = 1.1; });
      fleet(Object.assign({}, KIT, { sw: swimmer }), ppl, { span: 7000 });
      for (let i = 0; i < 6 * q + 2; i++) { const s = new T.Sprite(spriteM('#ffd1a8', .5)); s.scale.set(900 + rs() * 600, 160 + rs() * 100, 1); ride(A.layers[0], s, rs() * A.layers[0].len, 900 + rs() * 700, -3000); }
    },
    // Vapor Grid: neon sunset over an endless grid, marble busts, wireframe mountains
    vapor() {
      A.gy = -440; A.fogNear = 1000; A.fogFar = 8000; A.tilt = .08; A.speed = 2.6;
      sky('#1a0533', '#ff6ec7', '#12002a', { fog: '#7a1f6e', sun: '#ffe066', sx: 0, sy: .1 });
      amb.intensity = .5; sunL.color.set(lc('#ff9de2')); sunL.intensity = 1.4; sunL.position.set(0, 300, -900); scene.add(track(new T.HemisphereLight(lc('#c084fc'), lc('#12002a'), .6)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#12002a'; g.fillRect(0, 0, w, h); }, { tile: 220, rough: .3, emi: (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ff2bd6'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); }, emiCol: '#ff2bd6', ei: 1.6 });
      const sunC = canv(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe066'); gr.addColorStop(.6, '#ff6ec7'); gr.addColorStop(1, '#a43bd6'); g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, 6.3); g.fill(); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 8; i++) { const y = 140 + i * 15; g.fillRect(0, y, w, 3 + i * 1.2); } });
      const sun = new T.Mesh(G.plane, track(new T.MeshBasicMaterial({ map: srgb(new T.CanvasTexture(sunC)), transparent: true, fog: false, toneMapped: false }))); sun.scale.set(2600, 2600, 1); sun.position.set(0, 700, -7400); scene.add(sun);
      const wire = c => track(new T.LineBasicMaterial({ color: lc(c), transparent: true, opacity: .8, toneMapped: false }));
      const mtn = layer(-5200, 9000, () => { }); for (let i = 0; i < 12; i++) { const h = 600 + rs() * 900, m = new T.LineSegments(track(new T.EdgesGeometry(new T.ConeGeometry(h * .9, h, 6 + (rs() * 3 | 0), 3))), wire(i % 2 ? '#22d3ee' : '#ff2bd6')); ride(mtn, m, i * 750 + rs() * 200, A.gy + h / 2, (rs() - .5) * 600); }
      const marble = MAT({ color: '#f1e7e7', vertexColors: false }), ped = MAT({ color: '#e0d4f5', vertexColors: false }), palm = MAT({ color: '#12002a', vertexColors: false }), col = MAT({ color: '#efe6f5', vertexColors: false });
      layer(-1500, lenFor(-1500), put => { const L = lenFor(-1500); for (let x = 200; x < L; x += 700) { put(ped, G.box, x, A.gy + 60, 0, 90, 120, 90); put(marble, G.box, x, A.gy + 135, 0, 40, 30, 36); put(marble, G.sph, x, A.gy + 185, 0, 64, 80, 66); put(marble, G.box, x + 20, A.gy + 190, 0, 30, 14, 40); }
        for (let x = 520; x < L; x += 1400) { for (const dx of [0, 160]) { put(col, G.cyl, x + dx, A.gy + 160, -60, 34, 320, 34); put(col, G.box, x + dx, A.gy + 326, -60, 50, 14, 50); } put(col, G.box, x + 80, A.gy + 344, -60, 230, 22, 60); } });
      layer(-2600, lenFor(-2600), put => { const L = lenFor(-2600); for (let i = 0; i < 10; i++) { const x = rs() * L; let py = A.gy; for (let s = 0; s < 8; s++) { put(palm, G.cyl6, x + s * 6, py + 25, 0, 16 - s, 52, 16 - s, 0, 0, -.1); py += 50; } for (let f = 0; f < 7; f++) put(palm, G.box, x + 48 + Math.cos(f) * 55, py, Math.sin(f) * 55, 130, 8, 26, 0, -f, -.4); } });
      const shapes = layer(-1100, 3600, () => { }); for (let i = 0; i < 6; i++) { const m = new T.LineSegments(track(new T.EdgesGeometry(i % 2 ? new T.OctahedronGeometry(60) : new T.IcosahedronGeometry(50))), wire(i % 3 ? '#22d3ee' : '#fde047')); ride(shapes, m, i * 600 + 200, -100 + rs() * 400, (rs() - .5) * 300, (o, t) => { o.rotation.set(t * .4, t * .6, 0); }); }
      const KIT = kits(), neon = MAT({ color: '#000000', emissive: '#22d3ee', emissiveIntensity: 2.4, vertexColors: false });
      fleet(Object.assign({}, KIT, { retro: KIT.car.concat([[G.box, neon, 0, 2, 0, 44, 2, 24]]) }), flock('retro', 8, [-950, -1250], [A.gy + 1, A.gy + 1], [3, 5, 'both'], () => ({ col: ['#ff2bd6', '#22d3ee', '#f8fafc', '#a855f7'][(rs() * 4) | 0], k: 1.3 })), { span: 7000 });
      weather(0, 400, '#ff9de2', [1400, 700, 1400], [-.4, .2, 3], 4);
    },
    // Null Sector: the void where broken pieces of every world drift (World 16 boss arena)
    glitchcore() {
      A.gy = -480; A.fogNear = 600; A.fogFar = 6000; A.tilt = .06; A.speed = 2.2;
      sky('#07000d', '#2a0b4a', '#000000', { fog: '#160626', fc: '#ff2bd6' });
      amb.intensity = .45; sunL.color.set(lc('#ff9de2')); sunL.intensity = 1.2; sunL.position.set(300, 600, 300); scene.add(track(new T.HemisphereLight(lc('#22d3ee'), lc('#2a0b4a'), .55)));
      ground('#ffffff', (g, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#1a0b2e' : '#ff00ff'; g.fillRect(x * 32, y * 32, 32, 32); } }, { tile: 420, emi: (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2 === 0) { g.fillStyle = 'rgba(255,0,255,.35)'; g.fillRect(x * 32, y * 32, 32, 32); } }, emiCol: '#ff2bd6', ei: .6 });
      const C = c => MAT({ color: c, vertexColors: false }), house = C('#fde68a'), roof = C('#7c2d12'), coaster = C('#e11d48'), yel = C('#cbb35a'), grass = C('#5fa83a'), dirt = C('#8a5a33'), tower = C('#5d6b86'), tree = C('#2f7d3a'), chk = C('#ff00ff');
      const frags = [g => { const hb = new T.Mesh(G.box, house); hb.scale.set(160, 110, 120); g.add(hb); const r = new T.Mesh(G.roof, roof); r.scale.set(176, 80, 130); r.position.y = 55; g.add(r); },
        g => { const t = new T.Mesh(G.tor, coaster); t.scale.set(300, 300, 300); g.add(t); },
        g => { const w = new T.Mesh(G.box, yel); w.scale.set(240, 300, 20); g.add(w); },
        g => { for (let i = 0; i < 6; i++) { const b = new T.Mesh(G.box, i % 3 ? dirt : grass); b.scale.setScalar(60); b.position.set((i % 3) * 60, -Math.floor(i / 3) * 60, 0); g.add(b); } },
        g => { const b = new T.Mesh(G.box, tower); b.scale.set(120, 420, 120); g.add(b); const c = new T.Mesh(G.box, chk); c.scale.set(124, 80, 124); c.position.y = 120; g.add(c); },
        g => { const t = new T.Mesh(G.cyl6, C('#5b3a22')); t.scale.set(14, 100, 14); g.add(t); const l = new T.Mesh(G.ico, tree); l.scale.setScalar(130); l.position.y = 90; g.add(l); }];
      [[-1700, 4], [-2600, 8], [-4000, 11]].forEach(([z, n], li) => { const L = layer(z, lenFor(z), () => { }); for (let i = 0; i < n; i++) { const g = new T.Group(); frags[(i + li) % frags.length](g); g.rotation.set(rs() * 6, rs() * 6, rs() * 6); const sp = (rs() - .5) * .02, by = -150 + rs() * 900, ph = rs() * 6;
        ride(L, g, rs() * L.len, by, (rs() - .5) * 400, (o, t, df) => { o.rotation.x += sp * df; o.rotation.y += sp * .7 * df; const k = Math.floor(t * 3 + ph * 10); o.position.y = by + Math.sin(t * .6 + ph) * 30 + (k % 23 === 0 ? 40 : 0); o.visible = k % 31 !== 0; }); } });
      const sph = new T.LineSegments(track(new T.EdgesGeometry(new T.IcosahedronGeometry(1400, 1))), track(new T.LineBasicMaterial({ color: lc('#ff2bd6'), transparent: true, opacity: .5, toneMapped: false })));
      sph.position.set(1200, 900, -7000); scene.add(sph); A.upd.push(df => { sph.rotation.y += .002 * df; sph.rotation.x += .001 * df; });
      lightning('#ff2bd6', 200);
      weather(3, 700, '#ff2bd6', [1400, 800, 1500], [-.2, 2.6, 0], 14);
      weather(3, 400, '#22d3ee', [1400, 800, 1500], [.3, -2, 0], 12);
    }
  });
  (K[kind] || K.city)();
  if (LIFE[kind]) { try { LIFE[kind](); } catch (e) { console.warn('arena life failed', kind, e); } }
  // ---- sunset to night over a few minutes on outdoor maps: sky darkens, sun fades, windows and lamps glow brighter ----
  if (SET.daynight !== false && ['city', 'suburb', 'beach', 'desert', 'ice', 'islands', 'park', 'clock'].indexOf(kind) >= 0 && A.skyU) {
    const U = A.skyU, b = { top: U.top.value.clone(), hor: U.hor.value.clone(), bot: U.bot.value.clone(), sun: U.sunC.value.clone() }, nt = { top: new T.Color('#020414'), hor: new T.Color('#1e1b3a'), bot: new T.Color('#05060f') };
    const fog0 = scene.fog ? scene.fog.color.clone() : null, fogN = new T.Color('#141428'), sun0 = sunL.intensity, amb0 = amb.intensity, t0 = X.timeU.value;
    A.upd.push(() => { const tt = X.timeU.value - t0, n = Math.min(.8, Math.max(0, (tt - 50) / 170)) ; if (n <= 0) return;
      U.top.value.copy(b.top).lerp(nt.top, n); U.hor.value.copy(b.hor).lerp(nt.hor, n * .85); U.bot.value.copy(b.bot).lerp(nt.bot, n); U.sunC.value.copy(b.sun).multiplyScalar(1 - n);
      if (fog0) scene.fog.color.copy(fog0).lerp(fogN, n * .8); sunL.intensity = sun0 * (1 - n * .7); amb.intensity = amb0 * (1 - n * .45);
      for (const [m, e0] of EMIS) m.emissiveIntensity = e0 * (1 + n * 1.3); });
  }
  // ---- destruction: while a boss is up, the background takes hits (fireballs, smoke, falling debris) ----
  if (A.layers.length) {
    const pool = []; for (let i = 0; i < 6; i++) { const f = new T.Sprite(glowM('#ffb347', 0)), s = new T.Sprite(spriteM('#2b2b33', 0)); f.material = f.material.clone(); s.material = s.material.clone(); scene.add(f, s); pool.push({ f, s, l: 0 }); }
    let cd = 0; A.upd.push(df => {
      const R = G.run, hot = R && R.boss && !R.boss.dead, rare = kind === 'city' || kind === 'freeway' || kind === 'glitchcore';
      cd -= df; if (cd <= 0 && (hot || (rare && Math.random() < .004)) && !SET.reduce) { cd = hot ? 50 + Math.random() * 60 : 300; const p = pool.find(q => q.l <= 0); if (p) { const z = -1400 - Math.random() * 1800, x = (Math.random() - .3) * z * -.9, y = A.gy + 80 + Math.random() * 500; p.f.position.set(x, y, z); p.s.position.set(x, y + 40, z - 10); p.l = 90; p.z = z; } }
      for (const p of pool) { if (p.l <= 0) { p.f.material.opacity = 0; p.s.material.opacity = 0; continue; } p.l -= df; const u = 1 - p.l / 90;
        p.f.scale.setScalar(120 + u * 520); p.f.material.opacity = Math.max(0, .95 - u * 1.4); p.s.scale.set(200 + u * 700, 160 + u * 500, 1); p.s.position.y += .6 * df; p.s.material.opacity = Math.min(.5, u * 1.5) * (1 - u); p.f.position.x -= A.speed * df; p.s.position.x -= A.speed * df; }
    });
  }
  Object.values(G).forEach(g => track(g)); // shared unit geometries stay alive for the animated clones; freed with the world
  return A;
}

// ================= CORE: utils, settings, save, view, audio, input, loop =================
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
let RF = Math.random; // swappable so the daily challenge can generate the same waves for everyone
const rnd = (a, b) => a + RF() * (b - a), rint = (a, b) => Math.floor(rnd(a, b + 1)), pick = a => a[Math.floor(RF() * a.length)];
const TAU = Math.PI * 2, PI = Math.PI, H = PI / 2;
function seeded(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mem = {};
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return k in mem ? mem[k] : null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } delete mem[k]; }
};
const jget = (k, d) => { try { const s = store.get(k); return s ? JSON.parse(s) : d; } catch (e) { return d; } };
function merge(def, src) { // fills missing keys of src from def (plain objects only)
  if (src === null || typeof src !== 'object' || Array.isArray(def) !== Array.isArray(src)) return def;
  if (Array.isArray(def)) return src;
  const o = {}; for (const k in def) o[k] = k in src ? (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) ? merge(def[k], src[k]) : src[k]) : def[k];
  for (const k in src) if (!(k in o)) o[k] = src[k]; return o;
}
let IS_TOUCH = false; try { IS_TOUCH = matchMedia('(pointer:coarse)').matches; } catch (e) { }

// ---------- settings ----------
const SET_KEY = 'aetheria_set4';
const SET_DEF = { intro: true, menu3d: true, speed: 1, autoperf: true, ghost: true, bigb: false, hitbox: false, cbp: 'off', diff: 1, auto: false, dmgnum: true, flash: true, pauseBlur: true, q: 2, models: true, parts: 180, back: 2, vig: true, shake: 1, glow: 1, fps: false, cap30: false, ui3d: true, tilt: 1, reduce: false, vol: .8, sfx: 1, mus: .5, touch: 'auto', scheme: 'stick', tsize: 1, tside: 'left', haptic: true, dead: .2, hc: false, cb: false, cards: true, slowmo: true, story: 'once', bg3d: true, toon: true, brief: 'once', bloom: true, weather: true, daynight: true };
const firstRun = store.get(SET_KEY) === null;
const SET = Object.assign({}, SET_DEF, jget(SET_KEY, {}));
if (firstRun && IS_TOUCH) { SET.q = 1.5; SET.parts = 100; SET.back = 1; }
function saveSet() { store.set(SET_KEY, JSON.stringify(SET)); }
const touchOn = () => SET.touch === 'on' || (SET.touch === 'auto' && IS_TOUCH);

// ---------- save ----------
const SLOT_KEYS = ['aetheria_v4', 'aetheria_v4_s2', 'aetheria_v4_s3'];
let SLOT = Math.min(2, Math.max(0, parseInt(store.get('aetheria_slot') || '0', 10) || 0));
let SAVE_KEY = SLOT_KEYS[SLOT];
function defPlayer(i) {
  return {
    cfg: { hull: 'falcon', wings: 'swept', engine: 'twin', canopy: 'bubble', paint: i ? '#fb923c' : '#94a3b8', accent: i ? '#fb923c' : '#22d3ee', finish: 'chrome', stripe: true },
    own: { hull: ['falcon'], wings: ['swept'], engine: ['twin'], canopy: ['bubble'] }, wpn: 'twin', wown: ['twin'],
    up: { hp: 0, sh: 0, am: 0, dmg: 0, spd: 0, mag: 0, rate: 0, drn: 0, drd: 0 }, wlv: {}, wevo: {}
  };
}
function defSave() { return { v: 4, cores: 250, wu: 1, prog: {}, pl: [defPlayer(0), defPlayer(1)], hi: { endless: { score: 0, wave: 0 }, blitz: { score: 0 }, rush: { time: 0, boss: 0 }, def: { score: 0, wave: 0 }, nohit: {}, vault: { score: 0, clears: 0 } }, st: { kills: 0, runs: 0, graze: 0, combo: 0, cards: 0, ranks: { S: 0, A: 0, B: 0, C: 0 }, time: 0, deaths: 0, wins: 0, bosses: 0, hull: {} }, ach: {}, dl: { best: {}, done: {}, streak: 0, last: '' }, fails: {}, unl: {}, flags: {}, kd: {}, bd: {}, dev: false, devAll: false, tut: false, players: 1 }; }
function loadSave(key) {
  key = key || SAVE_KEY; const d = defSave(); let s = jget(key, null);
  if (s) { s = merge(d, s); s.pl = [merge(defPlayer(0), s.pl[0]), merge(defPlayer(1), s.pl[1])]; return s; }
  const o = key === SLOT_KEYS[0] ? jget('aetheria_save_v2', null) : null; // migrate cores + upgrades from the previous version
  if (o) { d.cores = Math.max(250, o.c | 0); d.pl[0].up.hp = clamp(Math.round(((o.hp || 50) - 50) / 25), 0, 20); d.pl[0].up.sh = clamp(Math.round((o.sh || 0) / 15), 0, 20); d.pl[0].up.am = clamp(Math.round(((o.am || 100) - 100) / 25), 0, 20); d.tut = !!store.get('aeth_tut'); }
  return d;
}
let SAVE = loadSave();
function saveGame() { store.set(SAVE_KEY, JSON.stringify(SAVE)); if (typeof achScan === 'function') achScan(); }
function prog(w) { return SAVE.prog[w] || (SAVE.prog[w] = { t: 1, done: [] }); }

// ---------- game state ----------
const G = {
  t: 0, scene: 'ui', paused: false, run: null, players: [], coop: false, inCombat: false, world: 0, mode: 'expedition',
  ent: { en: [], pb: [], eb: [], pk: [], pa: [], fl: [], bm: [], hz: [] }, shake: 0, shakeA: 0, freeze: 0, god: false, hitT: 0, view: 'menu', lastNode: null
};

// ---------- view / layout ----------
const V = { W: 1000, H: 600, s: 1, dpr: 1, iw: 1000, ih: 600 };
const cvBg = $('cvBg'), cvFx = $('cvFx'), bg = cvBg.getContext('2d'), fx = cvFx.getContext('2d');
let R3 = null;
function layout() {
  const iw = Math.max(320, innerWidth), ih = Math.max(240, innerHeight);
  V.iw = iw; V.ih = ih; V.s = ih < 600 ? ih / 600 : 1; V.W = Math.round(iw / V.s); V.H = Math.round(ih / V.s);
  V.dpr = G.retro ? .32 : Math.min(window.devicePixelRatio || 1, SET.q >= 2 ? 2 : 1.25);
  for (const c of [cvBg, cvFx]) { c.width = Math.round(iw * V.dpr); c.height = Math.round(ih * V.dpr); }
  if (R3) R3.resize(iw, ih, V.H, G.retro ? .32 : Math.min(window.devicePixelRatio || 1, SET.q));
  document.body.classList.toggle('nofx', !SET.ui3d); document.body.classList.toggle('reduce', !!SET.reduce);
  if (typeof buildBackdrop === 'function') buildBackdrop(G.world);
  if (typeof buildTouch === 'function') buildTouch();
  $('rot').style.display = (IS_TOUCH && ih > iw * 1.1 && !G.rotOk) ? 'flex' : 'none';
}
const toLogic = (cx, cy) => ({ x: cx / V.s, y: cy / V.s });

// ---------- audio ----------
let AC = null, masterG = null, sfxG = null, musG = null;
function audio() {
  if (AC) return AC;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); masterG = AC.createGain(); sfxG = AC.createGain(); musG = AC.createGain(); sfxG.connect(masterG); musG.connect(masterG); masterG.connect(AC.destination); applyVol(); } catch (e) { AC = null; }
  return AC;
}
function applyVol() { if (!AC) return; masterG.gain.value = SET.vol; sfxG.gain.value = SET.sfx; musG.gain.value = SET.mus * .45; }
const lastSnd = {};
function snd(f, type, dur, vol = .1, slide = 0, key) {
  if (SET.vol <= 0 || SET.sfx <= 0) return;
  const now = performance.now(), k = key || (f + type); if (now - (lastSnd[k] || 0) < 35) return; lastSnd[k] = now;
  const ac = audio(); if (!ac) return;
  try {
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(1e-4, t + dur); o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + dur + .02);
  } catch (e) { }
}
const SFX = {
  shoot: (k) => snd(k === 'lancer' ? 180 : k === 'ion' ? 700 : k === 'spread' ? 300 : k === 'missile' ? 140 : k === 'orb' ? 110 : 440, k === 'lancer' || k === 'orb' ? 'sawtooth' : 'sine', .07, .06, k === 'lancer' ? 400 : -120, 'sh' + k),
  aux: () => snd(220, 'triangle', .08, .08, 0, 'aux'), hit: () => snd(260, 'square', .05, .04, -80, 'hit'), boom: (b) => snd(b ? 70 : 120, 'square', b ? .6 : .22, b ? .2 : .13, -60, 'boom'),
  pick: () => snd(780, 'sine', .12, .12, 500, 'pick'), power: () => { snd(520, 'sine', .15, .12, 600, 'pw'); snd(880, 'triangle', .2, .08, 400, 'pw2'); }, hurt: () => snd(180, 'sawtooth', .16, .18, -90, 'hurt'), shield: () => snd(320, 'triangle', .1, .14, 0, 'shd'),
  warn: () => { snd(300, 'sawtooth', .3, .12, 200, 'warn'); }, click: () => snd(600, 'sine', .06, .07, 200, 'clk'), buy: () => snd(660, 'sine', .12, .1, 400, 'buy'), no: () => snd(140, 'square', .12, .08, -40, 'no'), abil: () => { snd(300, 'sawtooth', .25, .14, 500, 'abil'); snd(900, 'sine', .3, .08, -400, 'abil2'); }, graze: () => snd(1500, 'sine', .035, .03, 250, 'gz'), clear: () => { snd(523, 'sine', .2, .12, 0, 'c1'); setTimeout(() => snd(659, 'sine', .2, .12, 0, 'c2'), 120); setTimeout(() => snd(784, 'sine', .35, .12, 0, 'c3'), 240); }
};
const SCALES = [[0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 2, 3, 7, 8], [0, 1, 5, 7, 8], [0, 2, 5, 7, 9], [0, 3, 5, 6, 10], [0, 2, 4, 6, 9], [0, 2, 3, 5, 7], [0, 3, 5, 7, 8], [0, 2, 4, 5, 7]];
// the music engine lives in 54_music.js
function haptic(ms) { if (SET.haptic && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { } } }
function shake(a, t) { if (SET.reduce) return; G.shakeA = Math.max(G.shakeA, a * SET.shake); G.shake = Math.max(G.shake, t); }

// ---------- input ----------
const IN = { tp: {}, keys: {}, ptr: { x: 0, y: 0, down: false, fresh: false, tx: 0, ty: 0, type: 'mouse', drag: false }, stick: { x: 0, y: 0, id: null }, tfire: false, pads: [], swap: [0, 0], ab: [0, 0] };
function buildTouch() {
  const t = $('touch'); t.innerHTML = ''; t.classList.toggle('on', touchOn() && G.inCombat);
  if (!touchOn()) return;
  const sz = SET.tsize, L = SET.tside === 'left', side = L ? 'left' : 'right', other = L ? 'right' : 'left', inset = 'calc(18px + env(safe-area-inset-' + side + '))', inset2 = 'calc(18px + env(safe-area-inset-' + other + '))';
  if (SET.scheme === 'stick') {
    const st = document.createElement('div'); st.className = 'tstick'; st.style[side] = inset; st.style.transform = 'scale(' + sz + ')'; st.style.transformOrigin = L ? 'left bottom' : 'right bottom'; st.innerHTML = '<i></i>'; t.appendChild(st);
    const knob = st.firstChild; const upd = e => { const r = st.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2; let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } IN.stick.x = Math.abs(dx) < .12 ? 0 : dx; IN.stick.y = Math.abs(dy) < .12 ? 0 : dy; knob.style.transform = 'translate(' + dx * 36 + 'px,' + dy * 36 + 'px)'; };
    st.addEventListener('pointerdown', e => { IN.stick.id = e.pointerId; try { st.setPointerCapture(e.pointerId); } catch (x) { } upd(e); e.preventDefault(); });
    st.addEventListener('pointermove', e => { if (IN.stick.id === e.pointerId) upd(e); });
    const end = e => { if (IN.stick.id === e.pointerId) { IN.stick.id = null; IN.stick.x = IN.stick.y = 0; knob.style.transform = ''; } };
    st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  }
  const mk = (cls, txt, css, down, up) => { const b = document.createElement('div'); b.className = 'tbtn ' + cls; b.textContent = txt; Object.assign(b.style, css); b.addEventListener('pointerdown', e => { b.classList.add('dn'); try { b.setPointerCapture(e.pointerId); } catch (x) { } down && down(); e.preventDefault(); }); const u = () => { b.classList.remove('dn'); up && up(); }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); t.appendChild(b); return b; };
  const bottom = 'calc(22px + env(safe-area-inset-bottom))';
  mk('', 'FIRE', { [other]: inset2, bottom, transform: 'scale(' + sz + ')', transformOrigin: L ? 'right bottom' : 'left bottom' }, () => IN.tfire = true, () => IN.tfire = false);
  mk('sml', 'GUN', { [other]: 'calc(' + (112 * sz + 30) + 'px + env(safe-area-inset-' + other + '))', bottom: 'calc(26px + env(safe-area-inset-bottom))' }, () => IN.swap[0] = 1);
  if (G.players && G.players[0]) {
    const ab = mk('abl', '', { [other]: 'calc(' + (112 * sz + 24) + 'px + env(safe-area-inset-' + other + '))', bottom: 'calc(92px + env(safe-area-inset-bottom))' }, () => { if (G.inCombat && !G.paused && !G.pick) IN.ab[0] = 1; });
    ab.id = 'tab'; ab.innerHTML = abilOf(G.players[0]).nm.replace(' ', '<br>');
    mk('sml sec', 'SHOT', { [other]: inset2, bottom: 'calc(' + (112 * sz + 34) + 'px + env(safe-area-inset-bottom))' }, () => IN2.tsec = true, () => IN2.tsec = false);
    const su = mk('sml sup', 'SUPER', { [other]: 'calc(' + (112 * sz + 24) + 'px + env(safe-area-inset-' + other + '))', bottom: 'calc(158px + env(safe-area-inset-bottom))' }, () => { if (G.inCombat && !G.paused && !G.pick) IN2.sup[0] = 1; }); su.id = 'tsup';
  }
  const narrow = innerWidth < 640;
  mk('sml', 'II', narrow ? { [side]: 'calc(' + (112 * sz + 26) + 'px + env(safe-area-inset-' + side + '))', bottom: 'calc(10px + env(safe-area-inset-bottom))' } : { left: '50%', marginLeft: '-26px', bottom: 'calc(10px + env(safe-area-inset-bottom))' }, () => G.inCombat && togglePause());
}
function onKey(e, down) {
  if (G.cut) { if (down && !e.repeat) cutKey(e); e.preventDefault(); return; }
  if (G.photo) { if (down && !e.repeat) { const c = e.code, shot = document.getElementById('photoShot'); if (shot) { if (c === 'Escape' || c === 'Backspace') photoDo('close'); else if (c === 'Enter' || c === 'Space' || c === 'KeyS') photoSave(); } else if (c === 'Escape' || c === 'KeyP') photoExit(); else if (c === 'Enter' || c === 'Space') photoDo('snap'); else if (c === 'KeyF' || c === 'ArrowRight' || c === 'KeyE') photoDo('f', 1); else if (c === 'ArrowLeft' || c === 'KeyQ') photoDo('f', -1); else if (c === 'KeyH') photoDo('hud'); } e.preventDefault(); return; }
  if (G.brief) { if (down && !e.repeat && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) { ACT.briefok(); e.preventDefault(); return; } if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') return; }
  if (G.rebind) { if (down) { e.preventDefault(); keyCaptured(e.code); } return; }
  const c = e.code; IN.keys[c] = down;
  if (G.pick) { if (down) { const i = '123'.indexOf(e.key); if (i >= 0) { pickCard(i); e.preventDefault(); } else if (c === 'KeyR') ACT.cardroll(); } return; }
  if (G.inCombat && !G.paused && (c === 'Space' || c.startsWith('Arrow'))) e.preventDefault();
  if (!down) return;
  if (c === 'KeyP' || c === 'Escape') { if (G.inCombat) { togglePause(); e.preventDefault(); } else if (G.scene !== 'play' && UI.top && c === 'Escape') UI.escape(); }
  else if (c === 'KeyN') { SET.vol = SET.vol > 0 ? 0 : .8; applyVol(); saveSet(); alertMsg(SET.vol ? 'SOUND ON' : 'SOUND OFF'); }
  else if (G.inCombat && !G.paused) {
    if (G.netGuest) { const i2 = '123456'.indexOf(e.key); if (i2 >= 0) NETG.wsel = i2 + 1; if (KALL.a.indexOf(c) >= 0) IN.ab[0] = 1; if (KB[0].wl.indexOf(c) >= 0 || KB[1].wl.indexOf(c) >= 0) IN.swap[0] = -1; if (KB[0].wr.indexOf(c) >= 0 || KB[1].wr.indexOf(c) >= 0) IN.swap[0] = 1; return; }
    const i = '123456'.indexOf(e.key); if (i >= 0 && G.players[0]) setWeapon(G.players[0], WORDER[i]);
    if (G.players[0]) { if (KB[0].wl.indexOf(c) >= 0) cycleWeapon(G.players[0], -1); if (KB[0].wr.indexOf(c) >= 0) cycleWeapon(G.players[0], 1); }
    if (G.players[1] && !G.net) { if (KB[1].wl.indexOf(c) >= 0) cycleWeapon(G.players[1], -1); if (KB[1].wr.indexOf(c) >= 0) cycleWeapon(G.players[1], 1); }
    const ai = abKey(c); if (ai >= 0) IN.ab[ai] = 1;
    for (let q = 0; q < G.players.length; q++) if ((G.players.length > 1 && !G.net ? KB[q].v : KALL.v).indexOf(c) >= 0 && !e.repeat) { IN2.sup[q] = 1; break; }
  }
}
function pollPads() {
  IN.pads = [];
  let gps = []; try { gps = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch (e) { }
  let n = 0;
  for (const gp of gps) {
    if (!gp || !gp.connected) continue;
    const dz = SET.dead, ax = Math.abs(gp.axes[0]) > dz ? gp.axes[0] : 0, ay = Math.abs(gp.axes[1]) > dz ? gp.axes[1] : 0, b = i => gp.buttons[i] && gp.buttons[i].pressed;
    const o = { x: ax + (b(15) ? 1 : 0) - (b(14) ? 1 : 0), y: ay + (b(13) ? 1 : 0) - (b(12) ? 1 : 0), fire: b(0) || b(7) || b(2) || b(5) && false, lb: b(4), rb: b(5), start: b(9), a0: b(0), b1: b(1) };
    o.fire = padDown(gp, 'fire');
    const prev = G._padPrev && G._padPrev[n] || {};
    o.x2 = b(2); o.y3 = b(3);
    if (G.photo) { photoPad(o, prev); IN.pads[n] = { x: 0, y: 0 }; (G._padPrev = G._padPrev || [])[n] = o; n++; if (n >= 2) break; continue; }
    o.raw = gp.buttons.map(x => !!(x && x.pressed)); if (G.padBind) { padRebindPoll(gp, prev); IN.pads[n] = { x: 0, y: 0 }; (G._padPrev = G._padPrev || [])[n] = o; n++; if (n >= 2) break; continue; }
    if (o.start && !prev.start && G.inCombat) togglePause();
    o.lb = padDown(gp, 'wl'); o.rb = padDown(gp, 'wr');
    if (o.lb && !prev.lb && G.inCombat) IN.swap[n] = -1; if (o.rb && !prev.rb && G.inCombat) IN.swap[n] = 1;
    o.ab = padDown(gp, 'ab'); if (o.ab && !prev.ab && G.inCombat && !G.paused && !G.pick && !G.cut) IN.ab[n] = 1;
    o.sec = padDown(gp, 'sec'); o.su = padDown(gp, 'sup'); if (o.su && !prev.su && G.inCombat && !G.paused && !G.pick) IN2.sup[n] = 1;
    if (G.cut) { if (o.a0 && !prev.a0) cutNext(); if (o.b1 && !prev.b1) cutSkip(); const cu = o.y < -.6, cd = o.y > .6; if (cu && !prev.cu) cutPadSel(-1); if (cd && !prev.cd) cutPadSel(1); o.cu = cu; o.cd = cd; } else if (!G.inCombat || G.paused || G.pick || G.brief) padNav(o, prev);
    IN.pads[n] = o; (G._padPrev = G._padPrev || [])[n] = o; n++; if (n >= 2) break;
  }
}
function initInput() {
  addEventListener('keydown', e => onKey(e, true)); addEventListener('keyup', e => onKey(e, false));
  const toPt = e => { const l = toLogic(e.clientX, e.clientY); return { x: l.x, y: l.y, tx: l.x, ty: l.y - 64 }; };
  addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') {
      const P = IN.ptr, l = toLogic(e.clientX, e.clientY); P.type = 'mouse'; P.x = l.x; P.y = l.y; P.tx = l.x; P.ty = l.y; P.fresh = true;
      if (SET.ui3d && SET.tilt > 0 && G.scene !== 'play') { const d = document.documentElement.style, k = SET.tilt; d.setProperty('--rx', (-(e.clientY / innerHeight - .5) * 6 * k).toFixed(2) + 'deg'); d.setProperty('--ry', ((e.clientX / innerWidth - .5) * 8 * k).toFixed(2) + 'deg'); }
    } else if (IN.tp[e.pointerId]) Object.assign(IN.tp[e.pointerId], toPt(e));
  });
  addEventListener('pointerdown', e => {
    if (e.target && e.target.closest && e.target.closest('#touch>*,.scr,#coach,button')) return;
    if (e.pointerType === 'mouse' && e.button === 2) { IN2.rdown = true; return; }
    if (e.pointerType === 'mouse') { const P = IN.ptr, l = toLogic(e.clientX, e.clientY); P.type = 'mouse'; P.x = P.tx = l.x; P.y = P.ty = l.y; P.fresh = true; P.down = true; }
    else if (touchOn() && SET.scheme === 'drag' && G.inCombat) IN.tp[e.pointerId] = toPt(e);
  });
  addEventListener('mouseup', e => { if (e.button === 2) IN2.rdown = false; }); addEventListener('mousedown', e => { if (e.button === 2 && G.inCombat) IN2.rdown = true; });
  const up = e => { if (e.pointerType === 'mouse') { if (e.button === 2) { IN2.rdown = false; return; } IN.ptr.down = false; } delete IN.tp[e.pointerId]; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('blur', () => { IN.keys = {}; IN.ptr.down = false; IN.tp = {}; IN2.rdown = false; IN2.tsec = false; if (SET.pauseBlur && G.inCombat && !G.paused) togglePause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && SET.pauseBlur && G.inCombat && !G.paused) togglePause(); });
  addEventListener('resize', layout); addEventListener('orientationchange', () => setTimeout(layout, 120));
  addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('touchmove', e => { if (G.inCombat) e.preventDefault(); }, { passive: false });
  const fl = () => { audio(); if (AC && AC.state === 'suspended') AC.resume(); };
  addEventListener('pointerdown', fl, { passive: true }); addEventListener('keydown', fl, { passive: true });
}

// ---------- main loop ----------
let lastT = 0, accT = 0, fpsN = 0, fpsT = 0, skipR = false;
const STEP = 1000 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastT) lastT = now; const dt = Math.min(now - lastT, 100); lastT = now; accT += dt * (G.slowUntil && now < G.slowUntil && SET.slowmo !== false ? .3 : 1) * (G.scene === 'play' ? (+SET.speed || 1) : 1); perfTick(now);
  let n = 0;
  while (accT >= STEP && n < 4) { update(); accT -= STEP; n++; }
  if (accT > STEP * 4) accT = 0;
  if (n > 0) {
    if (SET.cap30) { skipR = !skipR; if (skipR) return; }
    render(); fpsN++;
    if (now - fpsT > 1000) { const el = $('fps'); if (SET.fps) { el.style.display = 'block'; el.textContent = fpsN + ' FPS'; } else el.style.display = 'none'; fpsN = 0; fpsT = now; }
  }
}

// ================= CONTENT: worlds, enemies, bosses, weapons, ship parts, shop, modes =================
const hx = s => typeof s === 'number' ? s : parseInt(String(s).replace('#', ''), 16);
const hex = n => '#' + ('000000' + (n >>> 0).toString(16)).slice(-6);

// ---------- worlds ----------
// bk = backdrop kind, hz = hazard, ro = enemy roster (unlock order), el = elite id, A/B = level-name words
const WORLDS = [
  { nm: 'Aetheria Skylines', sub: 'Storm decks above the old capital', col: ['#030712', '#0f172a', '#1e1b4b'], ac: '#38bdf8', bk: 'sky', hz: null, ro: ['jet', 'drone', 'sniper', 'mine'], el: 'vanguard', A: ['Cloud', 'Gale', 'Storm', 'Thunder', 'Zephyr', 'Jet'], B: ['Run', 'Line', 'Rift', 'Deck', 'Gate', 'Stream'] },
  { nm: 'Emerald Ravines', sub: 'The hive grows in the green dark', col: ['#022c22', '#064e3b', '#0f172a'], ac: '#10b981', bk: 'jungle', hz: null, ro: ['wasp', 'spore', 'spitter', 'beetle'], el: 'hiveguard', A: ['Spore', 'Moss', 'Glow', 'Vine', 'Hive', 'Bloom'], B: ['Path', 'Cavern', 'Hollow', 'Gorge', 'Edge', 'Pit'] },
  { nm: 'Rust Dunes of Mars', sub: 'Scrap winds and iron canyons', col: ['#451a03', '#7c2d12', '#0f172a'], ac: '#f59e0b', bk: 'dunes', hz: 'wind', ro: ['gearling', 'driller', 'crawler', 'scrapper'], el: 'hauler', A: ['Dust', 'Rust', 'Dune', 'Scrap', 'Red', 'Iron'], B: ['Flats', 'Canyon', 'Sea', 'Basin', 'Mesa', 'Ridge'] },
  { nm: 'Deep Cosmos Nebula', sub: 'Where the void learns to look back', col: ['#311042', '#581c87', '#090d16'], ac: '#c084fc', bk: 'nebula', hz: 'fog', ro: ['wisp', 'shard', 'warper', 'rift'], el: 'sentinel', A: ['Nebula', 'Star', 'Void', 'Crystal', 'Dark', 'Echo'], B: ['Veil', 'Drift', 'Lane', 'Reef', 'Current', 'Field'] },
  { nm: 'Event Horizon', sub: 'Light bends. Time does not.', col: ['#180000', '#450a0a', '#030712'], ac: '#f43f5e', bk: 'hole', hz: 'bhole', ro: ['ember', 'lens', 'comet', 'flare'], el: 'warden', A: ['Ash', 'Warp', 'Grav', 'Photon', 'Tidal', 'Dying'], B: ['Belt', 'Scar', 'Wake', 'Ring', 'Edge', 'Star'] },
  { nm: 'Frostbite Reach', sub: 'A frozen armada drifts in silence', col: ['#04121f', '#0c4a6e', '#082f49'], ac: '#7dd3fc', bk: 'ice', hz: 'ice', ro: ['flake', 'icicle', 'frostgun', 'yeti'], el: 'icecruiser', A: ['Frost', 'Glacier', 'Polar', 'Hail', 'Crystal', 'White'], B: ['Shelf', 'Crevasse', 'Drift', 'Spire', 'Fjord', 'Gale'] },
  { nm: 'Cinder Foundry', sub: 'A moon forged into a weapon', col: ['#1a0500', '#7c2d12', '#240a02'], ac: '#fb923c', bk: 'lava', hz: 'lava', ro: ['magma', 'anvil', 'salamander', 'smelter'], el: 'colossus', A: ['Cinder', 'Magma', 'Slag', 'Ember', 'Forge', 'Molten'], B: ['Vent', 'Works', 'Pit', 'Furnace', 'Quarry', 'Core'] },
  { nm: 'Abyssal Trench', sub: 'Pressure, lights, and teeth', col: ['#020617', '#042f3e', '#012a2a'], ac: '#2dd4bf', bk: 'deep', hz: 'current', ro: ['jelly', 'puffer', 'eel', 'lure'], el: 'kraken', A: ['Abyss', 'Brine', 'Pearl', 'Kelp', 'Midnight', 'Sunken'], B: ['Trench', 'Reef', 'Vent', 'Shelf', 'Current', 'Maw'] },
  { nm: 'Neon Mainframe', sub: 'The machine mind is awake', col: ['#05000f', '#1e0a3c', '#02130f'], ac: '#4ade80', bk: 'grid', hz: 'glitch', ro: ['glitch', 'bit', 'firewall', 'virus'], el: 'daemon', A: ['Packet', 'Kernel', 'Root', 'Cache', 'Buffer', 'Null'], B: ['Port', 'Stack', 'Node', 'Sector', 'Thread', 'Core'] },
  { nm: 'Chrono Spire', sub: 'The last hour of the last world', col: ['#1a1203', '#3b2a08', '#0b0b1a'], ac: '#fde047', bk: 'clock', hz: 'time', ro: ['cog', 'tick', 'phoenix', 'paradox'], el: 'chronowarden', A: ['Second', 'Minute', 'Hour', 'Epoch', 'Aeon', 'Zero'], B: ['Hand', 'Gear', 'Spire', 'Bell', 'Loop', 'Hour'] },
  { nm: 'Shattered Orbital Ring', sub: 'A wrecked ring station that still fights back', col: ['#05070f', '#172033', '#0b1220'], ac: '#cbd5e1', bk: 'ring', hz: 'wind', ro: ['scav', 'hullrat', 'welder', 'railturret'], el: 'salvager', A: ['Girder', 'Airlock', 'Spoke', 'Hangar', 'Docking', 'Debris'], B: ['Arc', 'Bay', 'Span', 'Ring', 'Hub', 'Truss'] },
  { nm: 'Crystal Archipelago', sub: 'Floating islands that sing when they break', col: ['#1f0a1a', '#4a1236', '#12071a'], ac: '#f9a8d4', bk: 'crystal', hz: 'fog', ro: ['shardling', 'prism', 'geode', 'refractor'], el: 'monolith', A: ['Prism', 'Facet', 'Quartz', 'Lattice', 'Shard', 'Opal'], B: ['Isle', 'Spire', 'Chime', 'Reef', 'Vault', 'Bloom'] },
  { nm: 'Tempest Gyre', sub: 'A storm the size of a world, still growing', col: ['#0b1405', '#26400f', '#0a0f0a'], ac: '#bef264', bk: 'gas', hz: 'bolt', ro: ['sprite', 'squall', 'zapper', 'gasbag'], el: 'cyclone', A: ['Squall', 'Thunder', 'Static', 'Cell', 'Gale', 'Eye'], B: ['Front', 'Wall', 'Band', 'Funnel', 'Surge', 'Gyre'] },
  { nm: 'Graveyard of Giants', sub: 'Where fleets and leviathans came to rest', col: ['#0c0a09', '#292524', '#06141a'], ac: '#99f6e4', bk: 'grave', hz: 'current', ro: ['specter', 'reaper', 'ossuary', 'leech'], el: 'lich', A: ['Bone', 'Pale', 'Hollow', 'Wraith', 'Ashen', 'Last'], B: ['Orchard', 'Wreck', 'Drift', 'Vigil', 'Keel', 'Rest'] },
  { nm: 'Heart of Aetheria', sub: 'Where every signal began', col: ['#031b24', '#0e4a5e', '#020617'], ac: '#67e8f9', bk: 'core', hz: 'pulse', ro: ['photon', 'construct', 'echo', 'sentry'], el: 'guardian', A: ['Origin', 'Signal', 'Pulse', 'Lumen', 'Prime', 'Genesis'], B: ['Lattice', 'Gate', 'Chamber', 'Stream', 'Node', 'Heart'] },
  { nm: 'The Glitch', sub: 'Reality is buffering. None of these places should exist.', col: ['#07000d', '#1a0b2e', '#000000'], ac: '#ff2bd6', bk: 'grid', hz: 'glitch', ro: ['gjet', 'gpod', 'gcube', 'gecho'], el: 'gadmin', A: ['Null', 'Corrupt', 'Lost', 'Broken', 'Hidden', 'Phantom'], B: ['Sector', 'Packet', 'Frame', 'Buffer', 'Loop', 'Patch'] },
  { nm: 'Aetheria Prime', sub: 'The first world. The one every signal was trying to reach.', col: ['#1c1206', '#78350f', '#0c0a09'], ac: '#fde047', bk: 'core', hz: 'pulse', ro: ['phoenix', 'refractor', 'reaper', 'paradox'], el: 'guardian', A: ['Dawn', 'Gold', 'First', 'Radiant', 'Crown', 'Zenith'], B: ['Spire', 'Halo', 'Gate', 'Throne', 'Light', 'Sky'] }
];
const NODE_PAT = ['c', 'c', 'c', 'e', 'c', 's', 'c', 'h', 'c', 'e', 'c', 's', 'B']; // 12 levels + boss
const LV = NODE_PAT.length;
const NODE_NAME = { c: 'COMBAT', e: 'ELITE AMBUSH', s: 'SUPPLY RUN', h: 'HAZARD ZONE', B: 'BOSS', g: 'TREASURE RUN', x: 'THE GAUNTLET' };
const lvName = (w, i) => { const W = WORLDS[w]; if (w === GLITCH_W && i < LV - 1) { const k = GLITCH_SECT[i], mp = MAPS.find(x => x.k === k); return (mp ? mp.nm : 'Null Sector') + (GLITCH_SECT.indexOf(k) === i ? '' : ' (Corrupted)'); } return i === LV - 1 ? BOSSES[w].nm : W.A[(i * 5 + 1) % 6] + ' ' + W.B[(i * 7 + w) % 6]; };

// ---------- enemies ----------
// m = model [archetype, opts]; w = on-screen length; hp base; sp speed; ai movement; f = fire {k kind, r rate(frames), s speed, n count}; sc score; cr core value; cost wave-budget
const EN = {
  // W1 skylines
  jet: { nm: 'Skyjet', m: ['dart', { c: 0x475569, e: 0xf43f5e }], w: 62, hp: 10, sp: 2.6, ai: 'sine', f: { k: 'aim', r: 120, s: 4.2 }, sc: 100, cr: 2, cost: 1 },
  drone: { nm: 'Recon Drone', m: ['saucer', { c: 0x2a3344, e: 0xf43f5e }], w: 70, hp: 8, sp: 2.2, ai: 'zig', f: { k: 'line', r: 100, s: 4.6 }, sc: 90, cr: 2, cost: 1 },
  sniper: { nm: 'Sniper', m: ['sniper', { c: 0x334155, e: 0xf87171 }], w: 84, hp: 16, sp: 1.2, ai: 'hover', f: { k: 'aimfast', r: 140, s: 7.5 }, sc: 220, cr: 4, cost: 2 },
  mine: { nm: 'Aero Mine', m: ['pod', { c: 0x1e293b, e: 0xfbbf24, n: 10 }], w: 50, hp: 14, sp: 1.2, ai: 'drift', burst: 8, sc: 120, cr: 3, cost: 1 },
  vanguard: { nm: 'Vanguard Cruiser', m: ['elite', { c: 0x3b2f55, e: 0xc084fc }], w: 130, hp: 130, sp: 1.2, ai: 'hover', f: { k: 'fan', r: 70, s: 4.4, n: 5 }, sc: 800, cr: 25, cost: 6, elite: 1 },
  // W2 ravines
  wasp: { nm: 'Hive Wasp', m: ['dart', { c: 0x365314, e: 0xfacc15, n: 5, k: 1.3 }], w: 54, hp: 8, sp: 3.4, ai: 'sine', sc: 90, cr: 2, cost: 1, ram: 24 },
  spore: { nm: 'Spore Pod', m: ['pod', { c: 0x14532d, e: 0xbef264, n: 7 }], w: 58, hp: 18, sp: 1.3, ai: 'drift', burst: 10, sc: 130, cr: 3, cost: 1 },
  spitter: { nm: 'Acid Spitter', m: ['jelly', { c: 0x166534, e: 0x84cc16 }], w: 76, hp: 26, sp: 1.3, ai: 'hover', f: { k: 'aim3', r: 100, s: 4, n: 3 }, sc: 200, cr: 4, cost: 2 },
  beetle: { nm: 'Armor Beetle', m: ['crab', { c: 0x3f6212, e: 0xa3e635 }], w: 88, hp: 60, sp: 1.6, ai: 'charge', sc: 260, cr: 5, cost: 3, ram: 28 },
  hiveguard: { nm: 'Hive Guard', m: ['crab', { c: 0x14532d, e: 0xfacc15, k: 1.6 }], w: 138, hp: 160, sp: 1.1, ai: 'hover', f: { k: 'fan', r: 80, s: 4, n: 7 }, summon: 'wasp', sc: 900, cr: 28, cost: 6, elite: 1 },
  // W3 dunes
  gearling: { nm: 'Gearling', m: ['gear', { c: 0x78350f, e: 0xf59e0b }], w: 60, hp: 14, sp: 3.2, ai: 'line', sc: 100, cr: 2, cost: 1, ram: 26 },
  driller: { nm: 'Driller', m: ['dart', { c: 0x92400e, e: 0xfbbf24, n: 4, drill: 1 }], w: 70, hp: 20, sp: 2, ai: 'charge', sc: 150, cr: 3, cost: 2, ram: 30 },
  crawler: { nm: 'Dune Crawler', m: ['tank', { c: 0x7c2d12, e: 0xf97316 }], w: 90, hp: 40, sp: 1.3, ai: 'turret', f: { k: 'fan', r: 90, s: 4.2, n: 3 }, sc: 220, cr: 4, cost: 2 },
  scrapper: { nm: 'Scrapper', m: ['crab', { c: 0x57534e, e: 0xf59e0b }], w: 82, hp: 34, sp: 1.8, ai: 'bomber', f: { k: 'mine', r: 110, s: 0 }, sc: 200, cr: 4, cost: 2 },
  hauler: { nm: 'Scrap Hauler', m: ['tank', { c: 0x78350f, e: 0xfb923c, k: 1.5 }], w: 150, hp: 190, sp: 1.1, ai: 'hover', f: { k: 'ring', r: 90, s: 3.4, n: 12 }, sc: 950, cr: 30, cost: 7, elite: 1 },
  // W4 nebula
  wisp: { nm: 'Void Wisp', m: ['ringeye', { c: 0x6b21a8, e: 0xe879f9 }], w: 48, hp: 10, sp: 2.4, ai: 'orbit', f: { k: 'aim', r: 130, s: 3.8 }, sc: 110, cr: 2, cost: 1 },
  shard: { nm: 'Shard Caster', m: ['crystal', { c: 0x7e22ce, e: 0xf0abfc }], w: 70, hp: 24, sp: 2, ai: 'zig', f: { k: 'burst', r: 110, s: 5, n: 3 }, sc: 170, cr: 3, cost: 2 },
  warper: { nm: 'Warper', m: ['saucer', { c: 0x4c1d95, e: 0xc084fc }], w: 76, hp: 28, sp: 1.2, ai: 'blink', f: { k: 'aim3', r: 90, s: 4.4, n: 3 }, sc: 210, cr: 4, cost: 2 },
  rift: { nm: 'Rift Manta', m: ['manta', { c: 0x581c87, e: 0xd946ef }], w: 96, hp: 52, sp: 1.4, ai: 'hover', f: { k: 'ring', r: 150, s: 3.2, n: 9 }, sc: 280, cr: 5, cost: 3 },
  sentinel: { nm: 'Nebula Sentinel', m: ['ringeye', { c: 0x4c1d95, e: 0xf0abfc, k: 1.9 }], w: 140, hp: 200, sp: 1.1, ai: 'orbit', f: { k: 'spiral', r: 6, s: 3.6 }, sc: 1000, cr: 32, cost: 7, elite: 1 },
  // W5 horizon
  ember: { nm: 'Ember', m: ['pod', { c: 0x7f1d1d, e: 0xfb7185, n: 6 }], w: 44, hp: 12, sp: 2, ai: 'seeker', sc: 120, cr: 3, cost: 1, ram: 26 },
  lens: { nm: 'Lensing Eye', m: ['ringeye', { c: 0x450a0a, e: 0xfbbf24 }], w: 64, hp: 30, sp: 1.2, ai: 'orbit', f: { k: 'aim3', r: 100, s: 4.6, n: 3 }, sc: 200, cr: 4, cost: 2 },
  comet: { nm: 'Comet', m: ['dart', { c: 0x9f1239, e: 0xfde047, n: 3, k: .6 }], w: 66, hp: 22, sp: 3.8, ai: 'dive', f: { k: 'line', r: 80, s: 5.4 }, sc: 180, cr: 3, cost: 2 },
  flare: { nm: 'Solar Flare', m: ['crystal', { c: 0xb91c1c, e: 0xfde047 }], w: 74, hp: 42, sp: 1.5, ai: 'hover', f: { k: 'fan', r: 80, s: 4.6, n: 5 }, sc: 260, cr: 5, cost: 3 },
  warden: { nm: 'Horizon Warden', m: ['gear', { c: 0x7f1d1d, e: 0xfb7185, k: 1.5 }], w: 140, hp: 220, sp: 1.1, ai: 'hover', f: { k: 'ring', r: 55, s: 3.8, n: 14 }, sc: 1100, cr: 34, cost: 7, elite: 1 },
  // W6 frost
  flake: { nm: 'Snowflake', m: ['crystal', { c: 0x7dd3fc, e: 0xe0f2fe }], w: 56, hp: 14, sp: 2.2, ai: 'orbit', f: { k: 'ring', r: 190, s: 3, n: 5 }, sc: 130, cr: 3, cost: 1 },
  icicle: { nm: 'Icicle', m: ['dart', { c: 0xbae6fd, e: 0x38bdf8, n: 4 }], w: 66, hp: 16, sp: 4, ai: 'drop', sc: 120, cr: 2, cost: 1, ram: 24 },
  frostgun: { nm: 'Frost Cannon', m: ['tank', { c: 0x0c4a6e, e: 0x7dd3fc }], w: 88, hp: 46, sp: 1.2, ai: 'turret', f: { k: 'aimice', r: 100, s: 4.8 }, sc: 240, cr: 5, cost: 3 },
  yeti: { nm: 'Ice Yeti', m: ['crab', { c: 0xe0f2fe, e: 0x38bdf8 }], w: 86, hp: 70, sp: 1.8, ai: 'charge', sc: 280, cr: 5, cost: 3, ram: 30 },
  icecruiser: { nm: 'Glacier Cruiser', m: ['elite', { c: 0x0c4a6e, e: 0x7dd3fc }], w: 140, hp: 240, sp: 1.2, ai: 'hover', f: { k: 'fan', r: 60, s: 4.6, n: 7 }, summon: 'flake', sc: 1200, cr: 36, cost: 7, elite: 1 },
  // W7 foundry
  magma: { nm: 'Magma Blob', m: ['pod', { c: 0xea580c, e: 0xfde047, n: 0 }], w: 66, hp: 30, sp: 1.6, ai: 'sine', split: 'magmalet', sc: 160, cr: 3, cost: 2 },
  magmalet: { nm: 'Magmalet', m: ['pod', { c: 0xea580c, e: 0xfde047, n: 0 }], w: 36, hp: 8, sp: 2.6, ai: 'seeker', sc: 40, cr: 1, cost: 0, ram: 18 },
  anvil: { nm: 'Anvil Bomber', m: ['tank', { c: 0x44403c, e: 0xfb923c }], w: 84, hp: 48, sp: 1.8, ai: 'bomber', f: { k: 'drop', r: 70, s: 4.4 }, sc: 220, cr: 4, cost: 2 },
  salamander: { nm: 'Salamander', m: ['worm', { c: 0xb45309, e: 0xfbbf24, n: 6 }], w: 110, hp: 54, sp: 2, ai: 'snake', f: { k: 'line', r: 90, s: 4.8 }, sc: 260, cr: 5, cost: 3 },
  smelter: { nm: 'Smelter', m: ['gear', { c: 0x78350f, e: 0xef4444 }], w: 86, hp: 60, sp: 1.2, ai: 'hover', f: { k: 'fan', r: 70, s: 4.4, n: 5 }, sc: 300, cr: 6, cost: 3 },
  colossus: { nm: 'Foundry Colossus', m: ['tank', { c: 0x7c2d12, e: 0xfb923c, k: 1.6 }], w: 156, hp: 260, sp: 1.1, ai: 'hover', f: { k: 'ring', r: 60, s: 4, n: 14 }, summon: 'magma', sc: 1300, cr: 38, cost: 7, elite: 1 },
  // W8 abyss
  jelly: { nm: 'Glow Jelly', m: ['jelly', { c: 0x0e7490, e: 0x5eead4 }], w: 70, hp: 24, sp: 1.4, ai: 'sine', f: { k: 'ring', r: 180, s: 3, n: 7 }, sc: 150, cr: 3, cost: 1 },
  puffer: { nm: 'Pufferbomb', m: ['pod', { c: 0xca8a04, e: 0xfde047, n: 14 }], w: 66, hp: 30, sp: 1.8, ai: 'charge', burst: 12, sc: 180, cr: 4, cost: 2, ram: 28 },
  eel: { nm: 'Electric Eel', m: ['worm', { c: 0x155e75, e: 0x67e8f9, n: 7 }], w: 120, hp: 50, sp: 2.2, ai: 'snake', f: { k: 'aim', r: 80, s: 5 }, sc: 240, cr: 5, cost: 3 },
  lure: { nm: 'Lure Angler', m: ['manta', { c: 0x083344, e: 0x5eead4, lure: 1 }], w: 94, hp: 56, sp: 1.3, ai: 'hover', f: { k: 'aim3', r: 90, s: 4.6, n: 3 }, sc: 280, cr: 5, cost: 3 },
  kraken: { nm: 'Kraken Sub', m: ['jelly', { c: 0x134e4a, e: 0x2dd4bf, k: 1.9, n: 10 }], w: 150, hp: 280, sp: 1.1, ai: 'hover', f: { k: 'spiral', r: 5, s: 3.8 }, summon: 'jelly', sc: 1400, cr: 40, cost: 7, elite: 1 },
  // W9 mainframe
  glitch: { nm: 'Glitch Cube', m: ['cube', { c: 0x14532d, e: 0x4ade80 }], w: 54, hp: 18, sp: 2, ai: 'blink', f: { k: 'aim', r: 90, s: 5 }, sc: 140, cr: 3, cost: 1 },
  bit: { nm: 'Bit Swarmer', m: ['dart', { c: 0x1e1b4b, e: 0xe879f9, n: 4, k: .7 }], w: 40, hp: 6, sp: 3.4, ai: 'zig', sc: 60, cr: 1, cost: 1, ram: 18 },
  firewall: { nm: 'Firewall', m: ['tank', { c: 0x7f1d1d, e: 0xf97316 }], w: 90, hp: 80, sp: 1.2, ai: 'turret', f: { k: 'wall', r: 120, s: 3.4 }, sc: 320, cr: 6, cost: 3 },
  virus: { nm: 'Virus', m: ['pod', { c: 0x3b0764, e: 0xa3e635, n: 9 }], w: 56, hp: 26, sp: 1.8, ai: 'seeker', burst: 6, sc: 200, cr: 4, cost: 2 },
  daemon: { nm: 'Daemon Core', m: ['cube', { c: 0x052e16, e: 0x4ade80, k: 2.2 }], w: 140, hp: 300, sp: 1.1, ai: 'blink', f: { k: 'ring', r: 55, s: 4, n: 16 }, summon: 'bit', sc: 1500, cr: 42, cost: 7, elite: 1 },
  // W10 chrono
  cog: { nm: 'Cog Drone', m: ['gear', { c: 0xa16207, e: 0xfde047 }], w: 58, hp: 20, sp: 2.4, ai: 'sine', f: { k: 'aim', r: 100, s: 4.6 }, sc: 150, cr: 3, cost: 1 },
  tick: { nm: 'Tick Bomber', m: ['clock', { c: 0x422006, e: 0xfbbf24 }], w: 64, hp: 26, sp: 2.2, ai: 'seeker', burst: 8, sc: 180, cr: 4, cost: 2, ram: 28 },
  phoenix: { nm: 'Phoenix', m: ['manta', { c: 0xb45309, e: 0xfde047, fire: 1 }], w: 100, hp: 64, sp: 3, ai: 'swoop', f: { k: 'fan', r: 70, s: 4.8, n: 5 }, sc: 320, cr: 6, cost: 3 },
  paradox: { nm: 'Paradox', m: ['ringeye', { c: 0xa16207, e: 0xffffff }], w: 70, hp: 56, sp: 1.2, ai: 'blink', f: { k: 'burst', r: 90, s: 5.2, n: 4 }, sc: 300, cr: 6, cost: 3 },
  chronowarden: { nm: 'Chronowarden', m: ['clock', { c: 0x713f12, e: 0xfde047, k: 2 }], w: 150, hp: 340, sp: 1.1, ai: 'hover', f: { k: 'spiral', r: 4, s: 4.2 }, summon: 'cog', sc: 1700, cr: 46, cost: 8, elite: 1 },
  // W11 orbital ring
  scav: { nm: 'Scav Skiff', m: ['dart', { c: 0x64748b, e: 0xfbbf24, n: 6, k: 1.1, drill: 1 }], w: 66, hp: 34, sp: 2.6, ai: 'zig', f: { k: 'aim', r: 110, s: 4.8 }, sc: 170, cr: 3, cost: 1 },
  hullrat: { nm: 'Hull Rat', m: ['pod', { c: 0x292524, e: 0xfb923c, n: 5 }], w: 46, hp: 14, sp: 3, ai: 'seeker', burst: 4, sc: 80, cr: 2, cost: 1, ram: 22 },
  welder: { nm: 'Arc Welder', m: ['crab', { c: 0x475569, e: 0x60a5fa }], w: 88, hp: 64, sp: 1.8, ai: 'charge', sc: 300, cr: 5, cost: 3, ram: 32 },
  railturret: { nm: 'Rail Turret', m: ['tank', { c: 0x334155, e: 0xf59e0b }], w: 92, hp: 72, sp: 1.1, ai: 'turret', f: { k: 'aimfast', r: 120, s: 7.2 }, sc: 330, cr: 6, cost: 3 },
  salvager: { nm: 'Salvage Colossus', m: ['elite', { c: 0x475569, e: 0xfbbf24 }], w: 150, hp: 420, sp: 1.1, ai: 'hover', f: { k: 'fan', r: 55, s: 4.8, n: 9 }, summon: 'hullrat', sc: 1800, cr: 48, cost: 8, elite: 1 },
  // W12 crystal archipelago
  shardling: { nm: 'Shardling', m: ['crystal', { c: 0xdb2777, e: 0xfbcfe8 }], w: 56, hp: 28, sp: 2.6, ai: 'orbit', f: { k: 'ring', r: 170, s: 3.2, n: 6 }, sc: 170, cr: 3, cost: 1 },
  prism: { nm: 'Prism Drone', m: ['saucer', { c: 0x9d174d, e: 0xf9a8d4 }], w: 72, hp: 42, sp: 1.6, ai: 'sine', f: { k: 'fan', r: 90, s: 4.6, n: 3 }, sc: 230, cr: 4, cost: 2 },
  geode: { nm: 'Geode Mine', m: ['pod', { c: 0x831843, e: 0xf472b6, n: 10 }], w: 64, hp: 48, sp: 1.4, ai: 'drift', split: 'shardlet', sc: 240, cr: 4, cost: 2 },
  shardlet: { nm: 'Shardlet', m: ['crystal', { c: 0xdb2777, e: 0xfbcfe8 }], w: 34, hp: 8, sp: 2.8, ai: 'seeker', sc: 40, cr: 1, cost: 0, ram: 18 },
  refractor: { nm: 'Refractor', m: ['ringeye', { c: 0x701a75, e: 0xe9d5ff }], w: 78, hp: 72, sp: 1.2, ai: 'blink', f: { k: 'burst', r: 90, s: 5.4, n: 5 }, sc: 350, cr: 6, cost: 3 },
  monolith: { nm: 'Crystal Monolith', m: ['crystal', { c: 0x9d174d, e: 0xf9a8d4 }], w: 150, hp: 440, sp: 1.1, ai: 'hover', f: { k: 'ring', r: 50, s: 4.2, n: 18 }, summon: 'shardling', sc: 1900, cr: 50, cost: 8, elite: 1 },
  // W13 tempest gyre
  sprite: { nm: 'Storm Sprite', m: ['jelly', { c: 0x3f6212, e: 0xd9f99d }], w: 64, hp: 36, sp: 2.4, ai: 'sine', f: { k: 'line', r: 100, s: 5 }, sc: 180, cr: 3, cost: 1 },
  squall: { nm: 'Squall Rider', m: ['manta', { c: 0x365314, e: 0xbef264 }], w: 98, hp: 62, sp: 3, ai: 'swoop', f: { k: 'fan', r: 80, s: 4.8, n: 5 }, sc: 330, cr: 6, cost: 3 },
  zapper: { nm: 'Arc Zapper', m: ['sniper', { c: 0x1a2e05, e: 0xa3e635 }], w: 90, hp: 48, sp: 1.2, ai: 'hover', f: { k: 'aimfast', r: 120, s: 7.5 }, sc: 280, cr: 5, cost: 2 },
  gasbag: { nm: 'Gas Bag', m: ['pod', { c: 0x4d7c0f, e: 0xecfccb, n: 0 }], w: 82, hp: 74, sp: 1.6, ai: 'drift', burst: 14, sc: 300, cr: 5, cost: 3, ram: 24 },
  cyclone: { nm: 'Cyclone Engine', m: ['gear', { c: 0x365314, e: 0xbef264, k: 1.6 }], w: 150, hp: 460, sp: 1.1, ai: 'hover', f: { k: 'ring', r: 50, s: 4.2, n: 16 }, summon: 'sprite', sc: 2000, cr: 52, cost: 8, elite: 1 },
  // W14 graveyard
  specter: { nm: 'Specter Skiff', m: ['dart', { c: 0xa8a29e, e: 0x99f6e4, n: 8, k: 1.2 }], w: 72, hp: 46, sp: 2.8, ai: 'blink', f: { k: 'aim', r: 90, s: 5.4 }, sc: 240, cr: 4, cost: 2 },
  reaper: { nm: 'Reaper Drone', m: ['saucer', { c: 0x292524, e: 0xef4444 }], w: 74, hp: 58, sp: 2, ai: 'orbit', f: { k: 'fan', r: 80, s: 5, n: 5 }, sc: 300, cr: 5, cost: 2 },
  ossuary: { nm: 'Bone Turret', m: ['tank', { c: 0xd6d3d1, e: 0x99f6e4 }], w: 92, hp: 92, sp: 1.1, ai: 'turret', f: { k: 'wall', r: 110, s: 3.8 }, sc: 360, cr: 6, cost: 3 },
  leech: { nm: 'Hull Leech', m: ['worm', { c: 0x44403c, e: 0x84cc16, n: 8 }], w: 112, hp: 68, sp: 2.2, ai: 'snake', f: { k: 'line', r: 80, s: 5 }, sc: 320, cr: 6, cost: 3 },
  lich: { nm: 'Dread Lich', m: ['elite', { c: 0x44403c, e: 0x99f6e4 }], w: 150, hp: 500, sp: 1.1, ai: 'hover', f: { k: 'spiral', r: 4, s: 4.2 }, summon: 'specter', sc: 2100, cr: 54, cost: 8, elite: 1 },
  // W15 heart of aetheria
  photon: { nm: 'Photon Wisp', m: ['crystal', { c: 0xe0f2fe, e: 0x22d3ee }], w: 58, hp: 42, sp: 2.8, ai: 'orbit', f: { k: 'ring', r: 150, s: 3.6, n: 7 }, sc: 260, cr: 4, cost: 2 },
  construct: { nm: 'Aether Construct', m: ['gear', { c: 0x0e7490, e: 0x67e8f9, k: 1.2 }], w: 82, hp: 84, sp: 1.4, ai: 'hover', f: { k: 'fan', r: 75, s: 4.8, n: 5 }, sc: 380, cr: 7, cost: 3 },
  echo: { nm: 'Memory Echo', m: ['ringeye', { c: 0xcffafe, e: 0xffffff }], w: 72, hp: 70, sp: 1.3, ai: 'blink', f: { k: 'burst', r: 80, s: 5.6, n: 5 }, sc: 350, cr: 6, cost: 3 },
  sentry: { nm: 'Core Sentry', m: ['tank', { c: 0x155e75, e: 0x22d3ee }], w: 94, hp: 104, sp: 1.1, ai: 'turret', f: { k: 'aim3', r: 95, s: 5, n: 3 }, sc: 420, cr: 7, cost: 4 },
  // W16 the glitch: corrupted copies of things you have fought
  gjet: { nm: 'Corrupted Skyjet', m: ['dart', { c: 0x0b0b12, e: 0xff2bd6 }], w: 66, hp: 46, sp: 2.9, ai: 'blink', f: { k: 'aim', r: 95, s: 5.6 }, sc: 280, cr: 5, cost: 1 },
  gpod: { nm: 'Packet Loss', m: ['pod', { c: 0x1a0b2e, e: 0x22d3ee, n: 9 }], w: 62, hp: 70, sp: 1.4, ai: 'drift', burst: 14, sc: 300, cr: 6, cost: 1 },
  gcube: { nm: 'Missing Texture', m: ['cube', { c: 0xff00ff, e: 0x111111 }], w: 74, hp: 96, sp: 1.3, ai: 'blink', f: { k: 'burst', r: 100, s: 5.2, n: 5 }, sc: 420, cr: 8, cost: 2 },
  gecho: { nm: 'Deja Vu', m: ['ringeye', { c: 0x0b0b12, e: 0x4ade80 }], w: 76, hp: 88, sp: 2.4, ai: 'orbit', f: { k: 'ring', r: 90, s: 3.9, n: 9 }, sc: 400, cr: 8, cost: 2 },
  gadmin: { nm: 'Admin Process', m: ['elite', { c: 0x1a0b2e, e: 0xff2bd6 }], w: 160, hp: 620, sp: 1.1, ai: 'hover', f: { k: 'spiral', r: 55, s: 4.6 }, summon: 'gjet', sc: 2800, cr: 62, cost: 9, elite: 1 },
  guardian: { nm: 'Aether Guardian', m: ['elite', { c: 0x0e7490, e: 0xe0f2fe }], w: 160, hp: 560, sp: 1.1, ai: 'hover', f: { k: 'ring', r: 45, s: 4.4, n: 20 }, summon: 'photon', sc: 2400, cr: 58, cost: 9, elite: 1 },
  // misc
  dummy: { nm: 'Target Drone', m: ['saucer', { c: 0x334155, e: 0x22d3ee }], w: 74, hp: 30, sp: .9, ai: 'line', sc: 10, cr: 1, cost: 0 },
  rock: { nm: 'Asteroid', m: ['rock', { c: 0x57534e, e: 0x000000 }], w: 60, hp: 22, sp: 2, ai: 'line', sc: 20, cr: 1, cost: 0, ram: 20, rock: 1 }
};
Object.keys(EN).forEach(k => EN[k].id = k);

// ---------- bosses ----------
// atk entries: k kind, r = cooldown frames after use. phases switch at hp fraction `at`.
const BOSSES = [
  { nm: 'Sky-Dominator Dreadnought', hp: 600, w: 250, c: '#38bdf8', rew: 500, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'fan', n: 7, sp: 1.1, s: 4.2, r: 70 }, { k: 'aim', n: 3, s: 5, r: 60 }] },
    { at: .5, mv: 'sweep', atk: [{ k: 'ring', n: 16, s: 3.4, r: 80 }, { k: 'fan', n: 9, sp: 1.4, s: 4.6, r: 50 }, { k: 'rain', n: 8, s: 4, r: 90 }] }] },
  { nm: 'Bio-Hive Overseer', hp: 850, w: 260, c: '#10b981', rew: 750, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'spiral', n: 40, s: 3.4, r: 120 }, { k: 'aim', n: 5, s: 4.6, r: 55 }] },
    { at: .66, mv: 'sweep', atk: [{ k: 'summon', id: 'wasp', n: 4, r: 100 }, { k: 'ring', n: 18, s: 3.2, r: 80 }] },
    { at: .33, mv: 'hover', atk: [{ k: 'spiral', n: 60, s: 4, r: 90 }, { k: 'summon', id: 'spore', n: 3, r: 120 }, { k: 'fan', n: 11, sp: 1.8, s: 4.4, r: 50 }] }] },
  { nm: 'Rust-Titan Excavator', hp: 1100, w: 280, c: '#f59e0b', rew: 1000, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'rain', n: 10, s: 4.4, r: 80 }, { k: 'fan', n: 7, sp: 1.2, s: 4.4, r: 60 }] },
    { at: .66, mv: 'charge', atk: [{ k: 'mines', n: 5, r: 100 }, { k: 'ring', n: 14, s: 3.6, r: 70 }] },
    { at: .33, mv: 'sweep', atk: [{ k: 'wall', n: 12, s: 3.4, r: 110 }, { k: 'rain', n: 14, s: 5, r: 60 }, { k: 'summon', id: 'gearling', n: 4, r: 130 }] }] },
  { nm: 'Void Leviathan', hp: 1400, w: 270, c: '#c084fc', rew: 1500, mv: 'orbit', ph: [
    { at: 1, mv: 'orbit', atk: [{ k: 'ring', n: 20, s: 3.2, r: 70 }, { k: 'aim', n: 5, s: 5.2, r: 50 }] },
    { at: .66, mv: 'orbit', atk: [{ k: 'spiral', n: 50, s: 3.8, r: 90 }, { k: 'homing', n: 3, s: 3, r: 90 }] },
    { at: .33, mv: 'sweep', atk: [{ k: 'beam', r: 150 }, { k: 'ring', n: 24, s: 3.6, r: 60 }, { k: 'summon', id: 'wisp', n: 4, r: 140 }] }] },
  { nm: 'Singularity Sovereign', hp: 2000, w: 300, c: '#f43f5e', rew: 3000, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'spiral', n: 60, s: 3.8, r: 80 }, { k: 'ring', n: 20, s: 3.4, r: 60 }] },
    { at: .75, mv: 'sweep', atk: [{ k: 'homing', n: 4, s: 3.2, r: 80 }, { k: 'fan', n: 13, sp: 2, s: 4.8, r: 45 }] },
    { at: .5, mv: 'orbit', atk: [{ k: 'beam', r: 140 }, { k: 'rain', n: 14, s: 5, r: 60 }, { k: 'ring', n: 26, s: 3.8, r: 70 }] },
    { at: .25, mv: 'charge', atk: [{ k: 'spiral', n: 90, s: 4.4, r: 70 }, { k: 'homing', n: 5, s: 3.6, r: 70 }, { k: 'wall', n: 14, s: 4, r: 100 }] }] },
  { nm: 'Permafrost Warden', hp: 2300, w: 280, c: '#7dd3fc', rew: 3400, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'rain', n: 12, s: 4.6, r: 60, ice: 1 }, { k: 'fan', n: 9, sp: 1.6, s: 4.6, r: 60 }] },
    { at: .66, mv: 'sweep', atk: [{ k: 'ring', n: 22, s: 3.4, r: 70, ice: 1 }, { k: 'summon', id: 'flake', n: 4, r: 120 }, { k: 'aim', n: 5, s: 5.4, r: 50 }] },
    { at: .33, mv: 'orbit', atk: [{ k: 'beam', r: 130 }, { k: 'spiral', n: 70, s: 4.2, r: 70 }, { k: 'wall', n: 14, s: 3.8, r: 100 }] }] },
  { nm: 'Forge Titan', hp: 2700, w: 300, c: '#fb923c', rew: 3800, mv: 'charge', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'mines', n: 6, r: 90 }, { k: 'fan', n: 9, sp: 1.5, s: 4.6, r: 55 }] },
    { at: .66, mv: 'charge', atk: [{ k: 'rain', n: 16, s: 5.2, r: 55 }, { k: 'ring', n: 20, s: 3.8, r: 70 }] },
    { at: .33, mv: 'sweep', atk: [{ k: 'beam', r: 120 }, { k: 'summon', id: 'magma', n: 3, r: 130 }, { k: 'wall', n: 14, s: 4.2, r: 90 }, { k: 'spiral', n: 80, s: 4.4, r: 70 }] }] },
  { nm: 'Abyssal Angler', hp: 3100, w: 300, c: '#2dd4bf', rew: 4200, mv: 'sweep', ph: [
    { at: 1, mv: 'sweep', atk: [{ k: 'homing', n: 3, s: 3.2, r: 80 }, { k: 'fan', n: 9, sp: 1.6, s: 4.4, r: 60 }] },
    { at: .66, mv: 'charge', atk: [{ k: 'ring', n: 24, s: 3.4, r: 70 }, { k: 'summon', id: 'jelly', n: 3, r: 120 }, { k: 'aim', n: 5, s: 5.6, r: 50 }] },
    { at: .33, mv: 'orbit', atk: [{ k: 'beam', r: 120 }, { k: 'spiral', n: 90, s: 4.4, r: 60 }, { k: 'rain', n: 16, s: 5, r: 55 }] }] },
  { nm: 'Overmind Mainframe', hp: 3600, w: 290, c: '#4ade80', rew: 4800, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'wall', n: 14, s: 3.8, r: 100 }, { k: 'aim', n: 6, s: 5.4, r: 50 }] },
    { at: .66, mv: 'sweep', atk: [{ k: 'summon', id: 'bit', n: 6, r: 110 }, { k: 'ring', n: 26, s: 3.8, r: 65 }, { k: 'beam', r: 130 }] },
    { at: .33, mv: 'orbit', atk: [{ k: 'homing', n: 5, s: 3.6, r: 70 }, { k: 'spiral', n: 100, s: 4.6, r: 60 }, { k: 'rain', n: 18, s: 5.4, r: 55 }, { k: 'wall', n: 16, s: 4.4, r: 90 }] }] },
  { nm: 'Chrono Archon', hp: 4500, w: 310, c: '#fde047', rew: 7000, mv: 'orbit', ph: [
    { at: 1, mv: 'orbit', atk: [{ k: 'spiral', n: 70, s: 4, r: 70 }, { k: 'ring', n: 22, s: 3.6, r: 60 }] },
    { at: .75, mv: 'sweep', atk: [{ k: 'homing', n: 4, s: 3.4, r: 70 }, { k: 'fan', n: 15, sp: 2.2, s: 5, r: 45 }, { k: 'summon', id: 'cog', n: 4, r: 120 }] },
    { at: .5, mv: 'charge', atk: [{ k: 'beam', r: 110 }, { k: 'rain', n: 20, s: 5.6, r: 50 }, { k: 'wall', n: 16, s: 4.6, r: 90 }] },
    { at: .25, mv: 'orbit', atk: [{ k: 'spiral', n: 120, s: 4.8, r: 55 }, { k: 'homing', n: 6, s: 4, r: 60 }, { k: 'ring', n: 30, s: 4, r: 55 }, { k: 'beam', r: 100 }] }] },
  { nm: 'Orbital Ring Sovereign', hp: 4800, w: 320, c: '#cbd5e1', rew: 8500, mv: 'orbit', ph: [
    { at: 1, mv: 'orbit', atk: [{ k: 'ring', n: 24, s: 3.6, r: 70 }, { k: 'aim', n: 5, s: 5.6, r: 50 }] },
    { at: .75, mv: 'sweep', atk: [{ k: 'wall', n: 16, s: 4, r: 100 }, { k: 'rain', n: 16, s: 5.4, r: 55 }, { k: 'summon', id: 'hullrat', n: 5, r: 120 }] },
    { at: .5, mv: 'charge', atk: [{ k: 'mines', n: 7, r: 90 }, { k: 'fan', n: 13, sp: 1.8, s: 5, r: 50 }, { k: 'beam', r: 120 }] },
    { at: .25, mv: 'orbit', atk: [{ k: 'spiral', n: 100, s: 4.6, r: 60 }, { k: 'ring', n: 30, s: 4, r: 55 }, { k: 'homing', n: 5, s: 3.8, r: 70 }] }] },
  { nm: 'Prism Hydra', hp: 5200, w: 320, c: '#f9a8d4', rew: 9500, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'fan', n: 11, sp: 1.8, s: 4.8, r: 55 }, { k: 'aim', n: 6, s: 5.6, r: 50 }] },
    { at: .75, mv: 'sweep', atk: [{ k: 'ring', n: 26, s: 3.8, r: 65 }, { k: 'summon', id: 'shardling', n: 5, r: 110 }, { k: 'rain', n: 16, s: 5.4, r: 55 }] },
    { at: .5, mv: 'orbit', atk: [{ k: 'beam', r: 110 }, { k: 'homing', n: 5, s: 3.6, r: 70 }, { k: 'spiral', n: 90, s: 4.6, r: 60 }] },
    { at: .25, mv: 'charge', atk: [{ k: 'fan', n: 17, sp: 2.2, s: 5.2, r: 45 }, { k: 'ring', n: 32, s: 4, r: 55 }, { k: 'beam', r: 100 }, { k: 'wall', n: 16, s: 4.4, r: 90 }] }] },
  { nm: 'Cyclone Tyrant', hp: 5600, w: 320, c: '#bef264', rew: 10500, mv: 'sweep', ph: [
    { at: 1, mv: 'sweep', atk: [{ k: 'rain', n: 16, s: 5.4, r: 55 }, { k: 'aim', n: 6, s: 5.8, r: 50 }] },
    { at: .75, mv: 'orbit', atk: [{ k: 'spiral', n: 90, s: 4.4, r: 65 }, { k: 'summon', id: 'sprite', n: 5, r: 110 }, { k: 'fan', n: 13, sp: 1.9, s: 5.2, r: 50 }] },
    { at: .5, mv: 'charge', atk: [{ k: 'beam', r: 105 }, { k: 'ring', n: 30, s: 4, r: 55 }, { k: 'wall', n: 16, s: 4.6, r: 85 }] },
    { at: .25, mv: 'sweep', atk: [{ k: 'spiral', n: 120, s: 5, r: 55 }, { k: 'homing', n: 6, s: 4, r: 60 }, { k: 'rain', n: 22, s: 6, r: 45 }, { k: 'beam', r: 95 }] }] },
  { nm: 'Grave Admiral', hp: 6000, w: 330, c: '#99f6e4', rew: 12000, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'wall', n: 16, s: 4, r: 90 }, { k: 'aim', n: 7, s: 5.8, r: 45 }] },
    { at: .75, mv: 'sweep', atk: [{ k: 'summon', id: 'specter', n: 5, r: 110 }, { k: 'ring', n: 30, s: 4, r: 60 }, { k: 'mines', n: 7, r: 90 }] },
    { at: .5, mv: 'orbit', atk: [{ k: 'beam', r: 100 }, { k: 'homing', n: 6, s: 3.8, r: 65 }, { k: 'spiral', n: 110, s: 4.8, r: 55 }] },
    { at: .25, mv: 'charge', atk: [{ k: 'fan', n: 19, sp: 2.2, s: 5.4, r: 42 }, { k: 'ring', n: 34, s: 4.2, r: 50 }, { k: 'wall', n: 18, s: 4.8, r: 80 }, { k: 'beam', r: 90 }] }] },
  { nm: 'The Aetheria Core', hp: 7500, w: 340, c: '#67e8f9', rew: 20000, mv: 'orbit', ph: [
    { at: 1, mv: 'orbit', atk: [{ k: 'ring', n: 28, s: 3.8, r: 65 }, { k: 'aim', n: 7, s: 5.8, r: 45 }] },
    { at: .8, mv: 'sweep', atk: [{ k: 'spiral', n: 100, s: 4.6, r: 60 }, { k: 'summon', id: 'photon', n: 5, r: 110 }, { k: 'fan', n: 15, sp: 2, s: 5.4, r: 48 }] },
    { at: .6, mv: 'charge', atk: [{ k: 'beam', r: 100 }, { k: 'rain', n: 22, s: 6, r: 45 }, { k: 'wall', n: 18, s: 4.8, r: 80 }] },
    { at: .4, mv: 'orbit', atk: [{ k: 'homing', n: 6, s: 4, r: 60 }, { k: 'ring', n: 36, s: 4.2, r: 50 }, { k: 'spiral', n: 130, s: 5, r: 50 }, { k: 'summon', id: 'echo', n: 4, r: 120 }] },
    { at: .2, mv: 'charge', atk: [{ k: 'beam', r: 85 }, { k: 'fan', n: 21, sp: 2.4, s: 5.6, r: 40 }, { k: 'ring', n: 40, s: 4.4, r: 45 }, { k: 'homing', n: 7, s: 4.2, r: 55 }, { k: 'rain', n: 26, s: 6.4, r: 40 }] }] },
  { nm: 'The Null Process', hp: 8600, w: 330, c: '#ff2bd6', rew: 26000, mv: 'orbit', ph: [
    { at: 1, mv: 'orbit', atk: [{ k: 'wall', n: 18, s: 4.2, r: 85 }, { k: 'aim', n: 7, s: 6, r: 45 }] },
    { at: .8, mv: 'sweep', atk: [{ k: 'summon', id: 'gjet', n: 5, r: 110 }, { k: 'spiral', n: 110, s: 4.8, r: 55 }, { k: 'mines', n: 7, r: 90 }] },
    { at: .6, mv: 'charge', atk: [{ k: 'beam', r: 95 }, { k: 'rain', n: 24, s: 6.2, r: 45 }, { k: 'ring', n: 34, s: 4.2, r: 50 }] },
    { at: .4, mv: 'orbit', atk: [{ k: 'summon', id: 'gcube', n: 3, r: 120 }, { k: 'homing', n: 7, s: 4.2, r: 55 }, { k: 'fan', n: 21, sp: 2.4, s: 5.6, r: 42 }, { k: 'wall', n: 20, s: 5, r: 75 }] },
    { at: .2, mv: 'charge', atk: [{ k: 'beam', r: 80 }, { k: 'spiral', n: 140, s: 5.2, r: 45 }, { k: 'ring', n: 42, s: 4.6, r: 42 }, { k: 'rain', n: 28, s: 6.6, r: 38 }, { k: 'summon', id: 'gecho', n: 3, r: 130 }] }] },
  { nm: 'Aetheria Prime, the First Signal', hp: 11000, w: 360, c: '#fde047', rew: 40000, mv: 'orbit', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'fan', n: 13, sp: 1.8, s: 5, r: 55 }, { k: 'aim', n: 7, s: 6, r: 45 }, { k: 'ring', n: 26, s: 3.8, r: 70 }] },
    { at: .84, mv: 'sweep', atk: [{ k: 'spiral', n: 120, s: 4.8, r: 55 }, { k: 'summon', id: 'phoenix', n: 4, r: 120 }, { k: 'homing', n: 6, s: 4, r: 60 }] },
    { at: .68, mv: 'orbit', atk: [{ k: 'beam', r: 90 }, { k: 'wall', n: 18, s: 4.8, r: 75 }, { k: 'ring', n: 36, s: 4.2, r: 50 }] },
    { at: .52, mv: 'charge', atk: [{ k: 'rain', n: 26, s: 6.4, r: 40 }, { k: 'fan', n: 21, sp: 2.4, s: 5.6, r: 40 }, { k: 'summon', id: 'refractor', n: 3, r: 120 }, { k: 'mines', n: 8, r: 85 }] },
    { at: .34, mv: 'orbit', atk: [{ k: 'spiral', n: 150, s: 5.2, r: 45 }, { k: 'homing', n: 8, s: 4.4, r: 50 }, { k: 'beam', r: 80 }, { k: 'ring', n: 44, s: 4.6, r: 42 }] },
    { at: .16, mv: 'charge', atk: [{ k: 'beam', r: 70 }, { k: 'wall', n: 22, s: 5.2, r: 65 }, { k: 'spiral', n: 160, s: 5.4, r: 40 }, { k: 'rain', n: 30, s: 6.8, r: 36 }, { k: 'fan', n: 25, sp: 2.6, s: 5.8, r: 36 }, { k: 'summon', id: 'guardian', n: 1, r: 260 }] }] }
];

// ---------- weapons ----------
// d damage, r fire interval (frames), s bullet speed, am ammo per shot (aux = free), k kind for visuals
const WORDER = ['twin', 'spread', 'lancer', 'ion', 'missile', 'orb', 'arc', 'rail'];
const WPN = {
  twin: { nm: 'Twin Pulse', ds: 'Reliable paired bolts. Balanced and cheap.', d: 5, r: 9, s: 12, am: 1, price: 0, c: '#22d3ee' },
  spread: { nm: 'Scatter Fan', ds: '5-way shotgun spread. Great up close.', d: 3.2, r: 17, s: 11, am: 2.2, price: 600, c: '#a3e635' },
  lancer: { nm: 'Piercing Lancer', ds: 'Heavy bolts that punch through everything.', d: 14, r: 22, s: 17, am: 2.4, price: 900, c: '#f472b6', pierce: 99 },
  ion: { nm: 'Ion Repeater', ds: 'Rapid-fire stream. Lower damage per shot.', d: 2.6, r: 4, s: 14, am: .5, price: 1300, c: '#fde047' },
  missile: { nm: 'Seeker Missiles', ds: 'Homing rockets with a blast radius.', d: 11, r: 28, s: 7, am: 3, price: 1800, c: '#fb923c', home: 1 },
  orb: { nm: 'Plasma Orb', ds: 'Slow giant orb that crushes bullets and enemies.', d: 30, r: 46, s: 5, am: 5, price: 2400, c: '#c084fc', pierce: 99, big: 1 },
  arc: { nm: 'Arc Caster', ds: 'Lightning that chains between nearby enemies.', d: 8, r: 16, s: 15, am: 2, price: 3000, c: '#93c5fd', chain: 1 },
  rail: { nm: 'Rail Cannon', ds: 'Piercing hypersonic slug. Slow, ruinous.', d: 55, r: 54, s: 30, am: 6, price: 4000, c: '#f8fafc', pierce: 99 }
};

// ---------- ship parts ----------
const PARTS = {
  hull: {
    falcon: { nm: 'Falcon', ds: 'All-rounder', p: 0, hp: 0, sp: 0, am: 0, dm: 0, rd: 0 },
    vanguard: { nm: 'Vanguard', ds: '+30 hull, a bit slower', p: 500, hp: 30, sp: -.2, am: 0, dm: 0, rd: 0 },
    phantom: { nm: 'Phantom', ds: '+12% speed, -15 hull', p: 700, hp: -15, sp: .35, am: 0, dm: 0, rd: 0 },
    titan: { nm: 'Titan', ds: '+60 hull, +30 plasma, slow', p: 1200, hp: 60, sp: -.4, am: 30, dm: 0, rd: 0 },
    nova: { nm: 'Nova', ds: '+15% damage, -25 hull', p: 1600, hp: -25, sp: 0, am: 0, dm: .15, rd: 0 },
    ronin: { nm: 'Ronin', ds: 'MELEE: a blade field cuts enemies and shots that get close. +20 hull, +12% speed, -20% gun damage', p: 1800, hp: 20, sp: .35, am: 0, dm: -.2, rd: 0 },
    hive: { nm: 'Hive', ds: 'CARRIER: launches with 2 extra wingmen. +40 hull, slow, -15% gun damage', p: 2000, hp: 40, sp: -.25, am: 0, dm: -.15, rd: 0 },
    longbow: { nm: 'Longbow', ds: 'SNIPER: +40% damage, -25% fire rate, -15 hull', p: 1900, hp: -15, sp: 0, am: 0, dm: .4, rd: -.25 },
    wraith: { nm: 'Wraith', ds: '+25% speed, +10% damage, -25 hull', p: 0, hp: -25, sp: .5, am: 0, dm: .1, rd: 0, secret: 1, hint: 'Rumour: pilots who are never touched may earn this.' },
    aegis: { nm: 'Aegis', ds: '+90 hull, +40 plasma, slow', p: 0, hp: 90, sp: -.5, am: 40, dm: 0, rd: 0, secret: 1, hint: 'Rumour: it waits at the end of a golden vault.' }
  },
  wings: {
    swept: { nm: 'Swept', ds: 'Balanced', p: 0, hp: 0, sp: 0, am: 0, dm: 0, rd: 0 },
    delta: { nm: 'Delta', ds: '+8% damage', p: 350, hp: 0, sp: 0, am: 0, dm: .08, rd: 0 },
    forward: { nm: 'Forward', ds: '+8% fire rate', p: 450, hp: 0, sp: 0, am: 0, dm: 0, rd: .08 },
    broad: { nm: 'Broad', ds: '+12 hull, +10 plasma', p: 550, hp: 12, sp: 0, am: 10, dm: 0, rd: 0 }
  },
  engine: {
    twin: { nm: 'Twin Jets', ds: 'Balanced', p: 0, hp: 0, sp: 0, am: 0, dm: 0, rd: 0 },
    quad: { nm: 'Quad Thrusters', ds: '+10% speed', p: 400, hp: 0, sp: .3, am: 0, dm: 0, rd: 0 },
    heavy: { nm: 'Heavy Drive', ds: '+20 hull', p: 500, hp: 20, sp: -.1, am: 0, dm: 0, rd: 0 },
    pods: { nm: 'Wing Pods', ds: '+15 plasma, +5% speed', p: 600, hp: 0, sp: .15, am: 15, dm: 0, rd: 0 }
  },
  canopy: {
    bubble: { nm: 'Bubble', ds: 'Classic', p: 0 },
    razor: { nm: 'Razor', ds: 'Sleek', p: 200 },
    dome: { nm: 'Dome', ds: 'Roomy', p: 250 },
    visor: { nm: 'Visor', ds: 'Armored band', p: 300 }
  }
};
const PAINTS = ['#94a3b8', '#e2e8f0', '#1e293b', '#ef4444', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#3b82f6', '#a78bfa', '#f472b6', '#7c2d12'];
const ACCENTS = ['#22d3ee', '#4ade80', '#facc15', '#fb923c', '#f43f5e', '#e879f9', '#818cf8', '#ffffff'];
const FINISHES = { chrome: { nm: 'Chrome', p: 0 }, matte: { nm: 'Matte', p: 150 }, pearl: { nm: 'Pearl', p: 250 }, neon: { nm: 'Neon', p: 350 }, carbon: { nm: 'Carbon', p: 400 } };

// ---------- shop upgrades (price rises every purchase) ----------
const UPG = {
  hp: { nm: 'Hull Plating', ds: '+20 max hull per level', b: 70, g: 1.22, max: 12, ic: 'hp' },
  sh: { nm: 'Shield Cell', ds: '+15 max shield per level', b: 80, g: 1.22, max: 12, ic: 'sh' },
  am: { nm: 'Plasma Tank', ds: '+20 max plasma per level', b: 60, g: 1.2, max: 12, ic: 'am' },
  dmg: { nm: 'Weapon Core', ds: '+8% damage per level', b: 110, g: 1.26, max: 12, ic: 'dmg' },
  rate: { nm: 'Fire Control', ds: '+5% fire rate per level', b: 100, g: 1.25, max: 10, ic: 'rate' },
  spd: { nm: 'Thruster Tune', ds: '+4% move speed per level', b: 90, g: 1.24, max: 10, ic: 'spd' },
  mag: { nm: 'Tractor Beam', ds: '+25% pickup magnet range per level', b: 60, g: 1.25, max: 8, ic: 'mag' },
  drn: { nm: 'Wingman Bay', ds: '+1 AI wingman drone per level. They fly with you and shoot on their own.', b: 420, g: 1.75, max: 3, ic: 'drn' },
  drd: { nm: 'Wingman Tuning', ds: '+25% wingman damage per level', b: 160, g: 1.34, max: 6, ic: 'drd' }
};
const upPrice = (k, lv) => Math.round(UPG[k].b * Math.pow(UPG[k].g, lv));

// ---------- modes ----------
const MODES = {
  expedition: { nm: 'Expedition', ds: 'The campaign. Fight through ' + WORLDS.length + ' worlds, 13 stages each, ending in a boss.', ic: 'map' },
  endless: { nm: 'Endless', ds: 'Survive escalating waves across every world. Chase the high score.', ic: 'inf' },
  rush: { nm: 'Boss Rush', ds: 'Every boss you have beaten, back to back. Repairs between fights.', ic: 'skull' },
  blitz: { nm: 'Blitz', ds: '90 seconds. Unlimited plasma. Kills add time. Combos multiply score.', ic: 'bolt' },
  training: { nm: 'Training', ds: 'No damage, no pressure. Test weapons on any world.', ic: 'target' },
  daily: { nm: 'Daily Challenge', ds: 'A new modifier every day. Same waves all day. Build a streak.', ic: 'clock', cat: 1 },
  defense: { nm: 'Station Defense', ds: 'Protect the station for 10 waves. Anything that slips past hurts it.', ic: 'sh', cat: 1 },
  nohit: { nm: 'No-Hit Run', ds: 'Two waves and a boss. A single hit ends the run.', ic: 'ring', cat: 1 },
  vault: { nm: 'The Vault', ds: 'Golden enemies and triple cores. A secret for sharp pilots.', ic: 'coin', cat: 1, secret: 1 }
};

// ---------- ship stats ----------
function shipStats(pl) {
  const c = pl.cfg, h = PARTS.hull[c.hull] || PARTS.hull.falcon, w = PARTS.wings[c.wings] || PARTS.wings.swept, e = PARTS.engine[c.engine] || PARTS.engine.twin, u = pl.up;
  const sum = k => (h[k] || 0) + (w[k] || 0) + (e[k] || 0);
  return {
    hp: Math.round(100 + sum('hp') + u.hp * 20), sh: Math.round(40 + u.sh * 15), am: Math.round(100 + sum('am') + u.am * 20),
    dmg: 1 + sum('dm') + u.dmg * .08, rate: 1 + sum('rd') + u.rate * .05, spd: (4.6 + sum('sp')) * (1 + u.spd * .04), mag: 1 + u.mag * .25
  };
}
const HULLK = { falcon: 1, vanguard: 1.08, phantom: .96, titan: 1.2, nova: 1, wraith: .94, aegis: 1.26, ronin: 1, hive: 1.22, longbow: 1.04 };

// ---------- level generation ----------
function levelSpec(w, i, tier, alt) {
  const t = alt && ALT_NODE[i] ? ALT_NODE[i] : NODE_PAT[i], d = 1.3 + w * .16 + i * .035 + (tier - 1) * .5;
  const rs = seeded(w * 977 + i * 131 + tier * 7919 + 13);
  return { w, i, tier, type: t, diff: d, seed: w * 977 + i * 131 + tier, name: lvName(w, i) + (t === 'g' ? ' - Treasure Run' : t === 'x' ? ' - Gauntlet' : ''), rs, waves: t === 'B' ? 2 : t === 's' ? 3 : t === 'x' ? 5 + Math.floor(i / 4) : 4 + Math.floor(i / 4), alt: !!(alt && ALT_NODE[i]) };
}
// roster allowed at this level index (unlocks gradually)
function rosterFor(w, i) { const r = WORLDS[w].ro, n = i < 2 ? 1 : i < 4 ? 2 : i < 7 ? 3 : 4; return r.slice(0, Math.max(2, n)); }

// ---- extra maps: endless survival runs on themed 3D maps ----
const MAPS = [
  { k: 'suburb', nm: 'Maple Grove', sub: 'A sleepy suburb on a golden afternoon - until the sky fills with ships', arena: 'suburb', mi: 15, seed: 211, ac: '#fbbf24' },
  { k: 'park', nm: 'Starlight Park', sub: 'A theme park at dusk: coasters, a Ferris wheel and fireworks', arena: 'park', mi: 16, seed: 223, ac: '#f472b6' },
  { k: 'backrooms', nm: 'The Backrooms', sub: 'Endless yellow rooms, buzzing lights, damp carpet. Nobody should be here', arena: 'backrooms', mi: 17, seed: 227, ac: '#facc15' },
  { k: 'blocks', nm: 'Blocklands', sub: 'A world built out of blocks, with blocky critters wandering the hills', arena: 'blocks', mi: 18, seed: 229, ac: '#4ade80' },
  { k: 'freeway', nm: 'Midnight Freeway', sub: 'Eight lanes of night traffic under orange lights', arena: 'freeway', mi: 19, seed: 233, ac: '#fb923c' },
  { k: 'school', nm: 'Hall Pass', sub: 'A high school hallway between classes', arena: 'school', mi: 20, seed: 239, ac: '#60a5fa' },
  { k: 'beach', nm: 'Boardwalk', sub: 'Sand, surf, a pier and a sunset', arena: 'beach', mi: 21, seed: 241, ac: '#38bdf8' },
  { k: 'vapor', nm: 'Vapor Grid', sub: 'A neon sunset over a grid that never ends', arena: 'vapor', mi: 22, seed: 251, ac: '#f472b6' },
  { k: 'glitchcore', nm: 'Null Sector', sub: 'Where the broken pieces of every world drift', arena: 'glitchcore', mi: 23, seed: 257, ac: '#ff2bd6', hidden: 1 }
];
// World 16 is the glitch: every sector drops you into a different place that should not be there
const GLITCH_W = 15;
const GLITCH_SECT = ['suburb', 'freeway', 'school', 'park', 'beach', 'backrooms', 'vapor', 'blocks', 'suburb', 'freeway', 'school', 'park', 'glitchcore'];
const glitchMap = lv => MAPS.find(m => m.k === GLITCH_SECT[lv | 0]) || MAPS[0];

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

// ================= SIM: players, weapons, enemies, bosses, bullets, pickups, hazards =================
// key bindings: one primary key per action (rebindable in Settings), plus hidden default alternates
const KDEF = [
  { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS', f: 'Space', a: 'ShiftLeft', wl: 'KeyQ', wr: 'KeyE', c: 'KeyC', v: 'KeyV' },
  { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown', f: 'Enter', a: 'ShiftRight', wl: 'Comma', wr: 'Period', c: 'Semicolon', v: 'Quote' }
];
const KALT = [{ f: ['KeyF'], a: ['KeyR', 'KeyX'] }, { f: ['NumpadEnter', 'Slash', 'Numpad0'], a: ['KeyM'] }];
const KB = [{}, {}], KALL = {};
function applyKeys() {
  const ck = SET.keys || {};
  for (let i = 0; i < 2; i++) for (const a in KDEF[i]) { const c = ck[i + a]; KB[i][a] = Array.isArray(c) && c.length ? c.slice() : [KDEF[i][a]].concat(KALT[i][a] || []); }
  for (const a of ['l', 'r', 'u', 'd', 'f', 'a', 'c', 'v']) KALL[a] = KB[0][a].concat(KB[1][a]);
}
applyKeys();
const abKey = c => { if (G.players.length > 1 && !G.net) return KB[0].a.indexOf(c) >= 0 ? 0 : KB[1].a.indexOf(c) >= 0 ? 1 : -1; return KALL.a.indexOf(c) >= 0 ? 0 : -1; };
const kdown = list => { for (let i = 0; i < list.length; i++) if (IN.keys[list[i]]) return true; return false; };
const DIFFM = [{ hp: .8, dm: .7 }, { hp: 1, dm: 1 }, { hp: 1.25, dm: 1.35 }];

function mkPlayer(i) {
  const pl = (G.netPl && G.netPl[i]) || SAVE.pl[i], st = shipStats(pl);
  return { id: i, pl, cfg: pl.cfg, x: 140, y: V.H / 2 + [-70, 70, -150, 150][i & 3] * (G.coop || i > 1 ? 1 : 0), vx: 0, vy: 0, st, hp: st.hp, mhp: st.hp, sh: st.sh, msh: st.sh, am: st.am, mam: st.am, wpn: WPN[pl.wpn] && pl.wown.indexOf(pl.wpn) >= 0 ? pl.wpn : 'twin', alive: true, inv: 100, blink: false, fcd: 0, od: 0, slow: 0, rest: 0, shT: 0, score: 0, kills: 0, lastHit: 0, gx: 0, mod: newMod(), cards: {}, abCd: 0, abMax: 1, wallT: 0, ovl: 0, dashT: 0, dvx: 0, dvy: 0, lmx: 0, lmy: 0, gzc: 0, bcd: 0, dr: [], oa: 0, orbP: [], phaseT: 0, reflT: 0, sup: 0, supT: 0, chg: 0, secCd: 0, pcd: 0, parT: 0, secH: false };
}
function setWeapon(p, id) { if (p.pl.wown.indexOf(id) >= 0 && p.wpn !== id) { p.wpn = id; p.pl.wpn = id; SFX.click(); alertMsg(WPN[id].nm.toUpperCase()); } }
function cycleWeapon(p, dir) { const own = WORDER.filter(w => p.pl.wown.indexOf(w) >= 0); if (own.length < 2) { alertMsg('ONLY ONE WEAPON OWNED'); return; } setWeapon(p, own[(own.indexOf(p.wpn) + dir + own.length) % own.length]); }
const alive = () => G.players.filter(p => p.alive);
function nearP(x, y) { let b = null, bd = 1e9; for (const p of G.players) { if (!p.alive) continue; const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (d < bd) { bd = d; b = p; } } return b; }
function nearE(x, y, maxD, skip) { let b = null, bd = maxD * maxD; for (const e of G.ent.en) { if (e.dead || e.x > V.W + 10 || (skip && skip.indexOf(e) >= 0)) continue; const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y); if (d < bd) { bd = d; b = e; } } return b; }

// ---------- input -> intent ----------
function inputFor(p) {
  if (p.remote) return netRemoteInput(p);
  const co = G.players.length > 1 && !G.net, me = G.net ? !!p.local : p.id === 0, o = { mx: 0, my: 0, tx: null, ty: null, fire: false }, k = co ? KB[p.id] : KALL, P = IN.ptr;
  if (kdown(k.l)) o.mx -= 1; if (kdown(k.r)) o.mx += 1; if (kdown(k.u)) o.my -= 1; if (kdown(k.d)) o.my += 1; if (kdown(k.f)) o.fire = true;
  if (o.mx || o.my) P.fresh = false;
  const pad = co ? IN.pads[p.id] : IN.pads[0]; if (pad) { o.mx += pad.x; o.my += pad.y; if (pad.fire) o.fire = true; if (pad.x || pad.y) P.fresh = false; }
  const si = G.net ? 0 : p.id; if (IN.swap[si]) { cycleWeapon(p, IN.swap[si]); IN.swap[si] = 0; }
  if (me && P.type === 'mouse' && P.fresh) { o.tx = P.tx; o.ty = P.ty; if (P.down) o.fire = true; }
  if (touchOn()) {
    if (SET.scheme === 'stick') { if (me || !co) { if (IN.stick.x || IN.stick.y) { o.mx += IN.stick.x; o.my += IN.stick.y; } if (IN.tfire) o.fire = true; } }
    else { const ids = Object.keys(IN.tp); let pt = null; for (const id of ids) { const q = IN.tp[id]; if (!co || (p.id === 0) === (q.x < V.W / 2)) { pt = q; break; } } if (pt) { o.tx = pt.tx; o.ty = pt.ty; o.fire = true; } }
  }
  p.lmx = o.mx; p.lmy = o.my; if (o.tx !== null) { p.lmx = o.tx - p.x; p.lmy = o.ty - p.y; }
  if (SET.auto) o.fire = true;
  return o;
}
const BOUND = () => ({ x0: G.run && G.run.stn ? 84 : 34, x1: V.W - 34, y0: 40, y1: V.H - 34 });

// ---------- player update ----------
function updPlayer(p) {
  if (p.alive && !SET.reduce) { const f = p.hp / p.mhp; if (f < .6 && G.t % (f < .3 ? 3 : 7) === 0) smoke(p.x - 14, p.y + rnd(-4, 4), 1, f < .3 ? 12 : 8); if (f < .35 && G.t % 4 === 0) spark(p.x - 10, p.y + rnd(-6, 6), 1, Math.random() < .5 ? '#fb923c' : '#fde047', 2.2, 16, 2.4); }
  if (!p.alive) { if (G.run && G.run.var === 'versus') return; if (G.players.length > 1 && alive().length && p.rest > 0) { if (!coopDead(p) && --p.rest <= 0) revive(p); } return; }
  const o = inputFor(p), hz = curHz(), sp = p.st.spd * 1.25 * (p.slow > 0 ? .55 : 1) * (p.phaseT > 0 ? 1.4 : 1);
  const ai = G.net ? (p.local ? 0 : -1) : p.id; if (ai >= 0 && IN.ab[ai]) { IN.ab[ai] = 0; useAbility(p); } if (p.remote && p.netAb) { p.netAb = 0; useAbility(p); }
  if (p.remote) { const B0 = BOUND(); p.vx = (o.x - p.x) * .5; p.vy = (o.y - p.y) * .5; p.x = clamp(o.x, B0.x0, B0.x1); p.y = clamp(o.y, B0.y0, B0.y1); }
  else if (o.tx !== null) {
    const dx = o.tx - p.x, dy = o.ty - p.y, d = Math.hypot(dx, dy) || 1, v = Math.min(d * .22, sp * 2.2);
    p.vx += (dx / d * v - p.vx) * .5; p.vy += (dy / d * v - p.vy) * .5;
  } else {
    let mx = o.mx, my = o.my; const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    const acc = hz === 'ice' ? .05 : .3; p.vx += (mx * sp - p.vx) * acc; p.vy += (my * sp - p.vy) * acc;
  }
  if (hz === 'wind') p.vy += Math.sin(G.t * .012 + 1) * .1;
  if (hz === 'current') p.vx += Math.sin(G.t * .008) * .08 - .02;
  if (hz === 'pulse' && G.t % 480 > 430) p.vx -= .4;
  if (hz === 'bhole') { const dx = V.W * .82 - p.x, dy = V.H * .5 - p.y, d = Math.hypot(dx, dy) || 1; p.vx += dx / d * .07 * Math.min(2, 260 / d); p.vy += dy / d * .07 * Math.min(2, 260 / d); }
  if (p.remote) { if (p.dashT > 0) p.dashT--; } else if (p.dashT > 0) { p.dashT--; p.vx = p.dvx; p.vy = p.dvy; if (!p.dashT) { p.dvx *= .3; p.dvy *= .3; p.vx = p.dvx; p.vy = p.dvy; } }
  if (!p.remote) { p.x += p.vx; p.y += p.vy; const B = BOUND(); p.x = clamp(p.x, B.x0, B.x1); p.y = clamp(p.y, B.y0, B.y1); }
  if (p.inv > 0) p.inv--; if (p.slow > 0) p.slow--; if (p.od > 0) p.od--; p.lastHit++;
  if (p.lastHit > 200 && p.sh < p.msh) p.sh = Math.min(p.msh, p.sh + .22);
  if (G.run && G.run.freeAmmo) p.am = p.mam;
  p.fcd--;
  if (o.fire && p.fcd <= 0 && !(p.supT > 0)) fireP(p);
  combatTick(p, o);
  updMeta(p);
  const spd = Math.hypot(p.vx, p.vy), dsh = p.dashT > 0;
  if (!SET.reduce && (G.t % 3 === 0 || dsh || (spd > 3.2 && G.t % 2 === 0))) { const bo = Math.min(1, spd / 6), L = 14 + bo * 8; pcl({ x: p.x - 32 * (HULLK[p.cfg.hull] || 1), y: p.y + rnd(-3, 3), vx: -2.2 - Math.abs(p.vx) * .2 - bo * 2.4 - (dsh ? 4 : 0), vy: rnd(-.3, .3), l: L, l0: L, c: dsh ? '#e0f2fe' : trailCol(p), r: 3 + bo * 2 + (dsh ? 3 : 0), k: 0, fr: .9 }); }
}
function revive(p) { p.alive = true; p.hp = p.mhp * .5; p.sh = 0; p.inv = 150; p.blink = true; const q = alive()[0]; if (q) { p.x = q.x - 40; p.y = q.y + 60; } R3 && R3.repair(p); shock(p.x, p.y, '#4ade80', 90); alertMsg('PILOT ' + (p.id + 1) + ' BACK IN THE FIGHT'); SFX.power(); }
function pb(p, x, y, vx, vy, k, o) {
  const w = WPN[k] || WPN.twin, m = p.mod, b = Object.assign({ x, y, vx, vy, r: 4, d: 5, k, c: k === p.wpn ? bulletCol(p, k, w.c) : w.c, pierce: 0, hs: [], own: p.id, l: 100, home: 0, hm2: 0, blast: 0, chain: 0, crush: 0 }, o);
  if (m.home && !b.home) b.hm2 = m.home;
  if (m.pierce && b.pierce < 90) b.pierce += m.pierce;
  if (p.ovl > 0 && b.pierce < 90) b.pierce += 2;
  if (m.blast && !b.blast) { b.blast = 24 + 9 * m.blast; b.cb = 1; }
  if (m.chain) b.chain += m.chain;
  if (m.crit && Math.random() < m.crit) { b.d *= 3; b.crit = 1; }
  G.ent.pb.push(b);
}
function fireP(p) {
  const W = WPN[p.wpn], kk = HULLK[p.cfg.hull] || 1, nx = p.x + 30 * kk, od = p.od > 0 ? 1.5 : 1, lv = wlvOf(p.pl, p.wpn), ev = wevOf(p.pl, p.wpn), ov = p.ovl > 0, m = p.mod;
  const rate = p.st.rate * od * (1 + .04 * lv) * (ov ? 1.8 : 1);
  if (p.am < W.am) { p.fcd = 15 / rate; pb(p, nx, p.y, 11, 0, 'twin', { d: 2.2 * p.st.dmg, c: '#94a3b8', r: 3 }); SFX.aux(); return; }
  p.am -= W.am * (1 - .03 * lv); p.fcd = W.r / rate; const d = W.d * p.st.dmg * od * (G.pdm || 1) * (1 + .12 * lv) * (ov ? 1.15 : 1), s = W.s;
  switch (p.wpn) {
    case 'twin': { const pr = ev ? 1 : 0; pb(p, nx, p.y - 9, s, 0, 'twin', { d, pierce: pr }); pb(p, nx, p.y + 9, s, 0, 'twin', { d, pierce: pr }); if (ev) pb(p, nx + 5, p.y, s, 0, 'twin', { d: d * 1.1, pierce: pr }); break; }
    case 'spread': { const n = ev ? 3 : 2; for (let i = -n; i <= n; i++) { const a = i * (ev ? .13 : .17); pb(p, nx, p.y, Math.cos(a) * s, Math.sin(a) * s, 'spread', { d: ev ? d * 1.15 : d, r: 3.4, l: ev ? 70 : 55 }); } break; }
    case 'lancer': if (ev) { [-7, 7].forEach(q => pb(p, nx, p.y + q, s, 0, 'lancer', { d: d * .85, r: 7, pierce: 99, l: 80 })); } else pb(p, nx, p.y, s, 0, 'lancer', { d, r: 6, pierce: 99, l: 80 }); break;
    case 'ion': { const a = rnd(-.05, .05); pb(p, nx, p.y + rnd(-6, 6), Math.cos(a) * s, Math.sin(a) * s, 'ion', { d: ev ? d * 1.2 : d, r: 3.4 }); if (ev) { const a2 = rnd(-.07, .07); pb(p, nx, p.y + rnd(-10, 10), Math.cos(a2) * s, Math.sin(a2) * s, 'ion', { d: d * 1.2, r: 3.4 }); } break; }
    case 'missile': (ev ? [-1, 1, -2, 2] : [-1, 1]).forEach(q => pb(p, nx - 6, p.y + q * 10, s, q * 2.4, 'missile', { d, r: 6, home: 1, blast: ev ? 80 : 62, l: 150 })); break;
    case 'orb': pb(p, nx + 6, p.y, s, 0, 'orb', ev ? { d: d * 1.25, r: 23, pierce: 99, crush: 1, l: 200, blast: 78 } : { d, r: 17, pierce: 99, crush: 1, l: 200 }); break;
    case 'arc': pb(p, nx, p.y, s, 0, 'arc', { d, r: 6, chain: ev ? 5 : 3, l: 70 }); break;
    case 'rail': pb(p, nx, p.y, s, 0, 'rail', { d, r: 5, pierce: 99, l: 60 }); if (ev) [-.05, .05].forEach(a => pb(p, nx, p.y, Math.cos(a) * s, Math.sin(a) * s, 'rail', { d: d * .5, r: 4, pierce: 99, l: 60 })); G.ent.bm.push({ k: 'trail', x: nx, y: p.y, l: 8, l0: 8 }); break;
  }
  if (m.multi) { const dd = d * .55; for (let i = 1; i <= m.multi; i++) for (const q of [-1, 1]) { const a = q * (.1 + i * .08); pb(p, nx - 4, p.y + q * 12, Math.cos(a) * s, Math.sin(a) * s, 'ion', { d: dd, r: 3, l: 60, c: W.c }); } }
  SFX.shoot(p.wpn); if (p.wpn === 'orb' || p.wpn === 'rail') shake(1.5, 4);
}

// ---------- damage to player ----------
function hurt(p, dmg, kind) {
  if (!p.alive || p.inv > 0 || G.god || (G.run && G.run.nodmg)) return false;
  const R0 = G.run; dmg = Math.round(dmg * (DIFFM[SET.diff] || DIFFM[1]).dm * p.mod.arm * (R0 && R0.assist ? .65 : 1)); if (dmg <= 0) return false;
  if (R0) { R0.lastSrc = R0.boss ? 'boss' : kind; if (R0.var === 'nohit') { ftext(p.x, p.y - 30, 'HIT!', '#fb7185', 20); p.sh = 0; p.hp = 0; killPlayer(p); return true; } }
  p.lastHit = 0; p.inv = 42; let hull = 0;
  if (p.sh > 0) { const a = Math.min(p.sh, dmg); p.sh -= a; dmg -= a; shock(p.x, p.y, '#38bdf8', 56, 16); SFX.shield(); if (p.sh <= 0) { ftext(p.x, p.y - 26, 'SHIELD DOWN', '#38bdf8', 11); shake(3, 8); if (p.mod.burst && p.bcd <= 0) shieldBurst(p); } }
  if (R0 && R0.var === 'versus') p.score = Math.max(0, p.score - 100);
  if (dmg > 0) { hull = dmg; p.hp -= dmg; p.blink = true; SFX.hurt(); shake(4 + Math.min(8, dmg / 3), 12); G.hitT = 14; haptic(40); G.freeze = dmg >= 18 ? 4 : 2; spark(p.x, p.y, 12, '#fb923c', 5, 28, 3); smoke(p.x, p.y, 2, 12); ftext(p.x, p.y - 24, '-' + dmg, '#fb7185', 14); if (G.run) G.run.hurt += dmg; if (R3) R3.hit(p, dmg >= 14 ? 1 : 0); }
  else p.inv = 20;
  if (R0) R0.low = Math.min(R0.low === undefined ? 1 : R0.low, Math.max(0, p.hp) / p.mhp);
  if (p.hp <= 0) {
    if (p.mod.second > 0) { p.mod.second--; p.hp = Math.max(1, p.mhp * .5); p.sh = p.msh; p.inv = 150; p.blink = false; G.flashT = 12; shock(p.x, p.y, '#fbbf24', 220, 30); shock(p.x, p.y, '#ffffff', 120, 20); ftext(p.x, p.y - 40, 'SECOND WIND', '#fbbf24', 14); alertMsg('SECOND WIND!'); SFX.power(); if (R3) R3.repair(p); }
    else killPlayer(p);
  }
  return true;
}
function killPlayer(p) {
  p.alive = false; p.hp = 0; boom2D(p.x, p.y, 70, '#f97316'); shake(14, 24); G.freeze = 8; SFX.boom(true); haptic([60, 40, 90]); if (R3) R3.die(p);
  p.dX = p.x; p.dY = p.y; p.rv = 0;
  if (G.run && G.run.var === 'versus') { p.rest = 180; alertMsg('PILOT ' + (p.id + 1) + ' DOWN - RESPAWNING (-400)'); }
  else if (G.players.length > 1 && alive().length && !(G.run && G.run.var === 'hardcore')) { p.rest = 900; alertMsg('PILOT ' + (p.id + 1) + ' DOWN - FLY TO THEIR SPOT TO REVIVE'); }
}

// ---------- enemies ----------
function runMul() { const R = G.run, dm = DIFFM[SET.diff] || DIFFM[1]; return { hp: R.hpm * dm.hp * (G.players.length > 1 ? 1 + .6 * (G.players.length - 1) : 1), ed: R.edm }; }
function mkEnemy(id, x, y, o) {
  const d = EN[id], mu = runMul();
  const e = { id, d, boss: false, dfT: G.run && G.run.stn ? rint(500, 900) : 1e9, x, y, y0: y, vx: 0, vy: 0, w: d.w, r: d.w * .34, hp: 1, mhp: 1, t: 0, ph: Math.random() * TAU, st: 0, fcd: rint(30, Math.max(31, d.f ? d.f.r : 60)), hf: 0, ram: d.ram || 20, dead: false, hx: V.W * rnd(.6, .86), sa: 0, bq: 0, bcd: 0, bang: 0, hide: false, minion: !!(o && o.minion), tx: 0, ty: 0, ux: 0 };
  e.hp = e.mhp = Math.max(1, Math.round(d.hp * mu.hp * (o && o.hpm || 1)));
  if (G.run && G.run.brief && id !== 'rock') { const sn = G.run.seen || (G.run.seen = {}); if (!sn[id]) { sn[id] = 1; e.tagUntil = G.t + 240; } }
  if (d.ai === 'bomber') e.y = e.y0 = Math.random() < .5 ? 80 : V.H - 80;
  if (d.ai === 'drop') { e.x = V.W * rnd(.45, 1); e.y = -40; e.vy = d.sp * 1.9; e.vx = -d.sp * .5; }
  if (d.ai === 'charge') e.hx = V.W * rnd(.7, .9);
  G.ent.en.push(e); return e;
}
function updEnemy(e) {
  const d = e.d, ts = G.ts || 1, sp = d.sp * ts, P = nearP(e.x, e.y), W = V.W, Hh = V.H; e.t++; if (e.hf > 0) e.hf--;
  switch (d.ai) {
    case 'line': e.x -= sp; if (e.vy) e.y += e.vy * ts; break;
    case 'sine': e.x -= sp; e.y = clamp(e.y0 + Math.sin(e.t * .045 + e.ph) * 80, 60, Hh - 60); break;
    case 'zig': e.x -= sp * .8; if (!e.vy) e.vy = (Math.random() < .5 ? -1 : 1) * sp * 1.1; if (e.t % 50 === 0) e.vy = -e.vy; e.y += e.vy * ts; if (e.y < 60 || e.y > Hh - 60) { e.vy = -e.vy; e.y = clamp(e.y, 60, Hh - 60); } break;
    case 'dive': if (e.st === 0) { e.x -= sp; if (P && e.x < Math.max(P.x + 360, W * .62)) { e.st = 1; const a = Math.atan2(P.y - e.y, P.x - e.x); e.vx = Math.cos(a) * sp * 1.7; e.vy = Math.sin(a) * sp * 1.7; } } else { e.x += e.vx * ts; e.y += e.vy * ts; } break;
    case 'hover': if (e.x > e.hx) e.x -= sp * 1.2; else { e.x -= .12 * ts; e.y = clamp(e.y0 + Math.sin(e.t * .02 + e.ph) * 120, 70, Hh - 70); } break;
    case 'charge':
      if (e.st === 0) { e.x -= sp; if (e.x < e.hx && e.t > 40) { e.st = 1; e.ux = 0; } }
      else if (e.st === 1) { e.ux++; e.hide = false; e.x += Math.sin(e.ux * 1.5) * 1.2; if (e.ux > 36) { e.st = 2; const a = P ? Math.atan2(P.y - e.y, P.x - e.x) : PI; e.vx = Math.cos(a) * sp * 3.6; e.vy = Math.sin(a) * sp * 3.6; } if (e.ux % 6 < 3) e.hf = 2; }
      else { e.x += e.vx * ts; e.y += e.vy * ts; if (++e.ux > 100) e.st = 3; } if (e.st === 3) e.x -= sp * 1.2; break;
    case 'orbit': e.x -= sp * .7; { const a = e.t * .04 + e.ph; e.y = clamp(e.y0 + Math.sin(a) * 90, 60, Hh - 60); e.x += Math.cos(a) * 1.1; } break;
    case 'drift': e.x -= sp; e.y = clamp(e.y0 + Math.sin(e.t * .02 + e.ph) * 40, 60, Hh - 60); if (P && Math.hypot(P.x - e.x, P.y - e.y) < 62 && d.burst) hurtEnemy(e, 9999, null); break;
    case 'seeker': { if (e.x > W + 40) { e.x -= sp; break; } if (P) { const a = Math.atan2(P.y - e.y, P.x - e.x); e.vx += Math.cos(a) * .08 * ts; e.vy += Math.sin(a) * .08 * ts; const v = Math.hypot(e.vx, e.vy), m = sp * 1.15; if (v > m) { e.vx *= m / v; e.vy *= m / v; } } e.x += e.vx - .35; e.y += e.vy; break; }
    case 'blink':
      if (e.x > e.hx) e.x -= sp * 1.4; else { e.ux++; const c = e.ux % 130; if (c === 100) { e.hide = true; e.hf = 0; } if (c === 115) { e.x = W * rnd(.5, .92); e.y = rnd(80, Hh - 80); e.y0 = e.y; e.hide = false; shock(e.x, e.y, hex(hx((d.m[1] || {}).e || 0xffffff)), 60, 14); if (d.f) e.fcd = Math.min(e.fcd, 12); } }
      break;
    case 'bomber': e.x -= sp; e.y += (e.y0 < Hh / 2 ? 1 : -1) * Math.sin(e.t * .03) * .6; break;
    case 'snake': e.x -= sp * .9; e.y = clamp(e.y0 + Math.sin(e.t * .06 + e.ph) * 120, 60, Hh - 60); break;
    case 'turret': e.x -= e.x > W * .8 ? sp : .45 * ts; e.y += Math.sin(e.t * .02 + e.ph) * .4; break;
    case 'drop': e.x += e.vx * ts; e.y += e.vy * ts; break;
    case 'swoop': e.x -= sp * .85; e.y = clamp(e.y0 + Math.sin(e.t * .03 + e.ph) * (Hh * .32), 60, Hh - 60); break;
    default: e.x -= sp;
  }
  if (G.run && G.run.stn) { if (e.t > e.dfT) e.x -= .5 * ts; if (e.x < STN_X + e.w * .25) { stnRam(e); return; } }
  if (e.x < -e.w * 1.6 || e.y < -120 - (d.ai === 'drop' ? 0 : 60) || e.y > Hh + 120) { e.dead = true; e.esc = true; if (!e.minion && G.run) G.run.esc++; return; }
  // fire
  if (d.f && e.x < W - 24 && e.x > 20 && !e.hide) {
    if (--e.fcd <= 0) { fireEnemy(e); e.fcd = Math.max(6, d.f.r * (d.elite ? 1 : 1.25) * rnd(.85, 1.15) / (1 + (G.run.diff - 1) * .1)); }
    if (e.bq > 0 && --e.bcd <= 0) { ebullet(e.x - e.w * .35, e.y, Math.cos(e.bang) * d.f.s, Math.sin(e.bang) * d.f.s, 'shard'); e.bq--; e.bcd = 6; }
  }
  if (d.summon && e.x < W - 40 && e.t % 340 === 220 && G.ent.en.filter(q => q.minion).length < 6) for (let i = 0; i < 2; i++) mkEnemy(d.summon, e.x - 30, e.y + (i ? 60 : -60), { minion: 1, hpm: .7 });
}
function ebullet(x, y, vx, vy, k, o) {
  if (G.ent.eb.length > 460 || (G.ent.eb.length > 130 && !(o && o.d !== undefined))) return; const d = o && o.d !== undefined ? o.d : Math.round(10 * G.run.edm);
  G.ent.eb.push({ x, y, vx, vy, k: k || 'orb', r: (o && o.r) || (k === 'shard' ? 5 : k === 'mine' ? 10 : 6), d, l: (o && o.l) || 420, ice: o && o.ice, mine: o && o.mine, hm: o && o.hm, arm: 0 });
}
function fireEnemy(e) {
  const f = e.d.f, P = nearP(e.x, e.y), ang = P ? Math.atan2(P.y - e.y, P.x - e.x) : PI, ox = e.x - e.w * .3, mk = (a, s, k, o) => ebullet(ox, e.y, Math.cos(a) * s, Math.sin(a) * s, k, o);
  switch (f.k) {
    case 'aim': mk(ang, f.s, 'orb'); break;
    case 'aimfast': mk(ang, f.s, 'shard'); break;
    case 'aimice': mk(ang, f.s, 'ice', { ice: 1 }); break;
    case 'aim3': for (let i = -1; i <= 1; i++) mk(ang + i * .26, f.s, 'orb'); break;
    case 'fan': { const n = f.n || 5; for (let i = 0; i < n; i++) mk(ang + (i - (n - 1) / 2) * .17, f.s, 'orb'); break; }
    case 'ring': { const n = f.n || 10, a0 = Math.random() * TAU; for (let i = 0; i < n; i++) mk(a0 + i / n * TAU, f.s, 'ring'); break; }
    case 'line': mk(PI, f.s, 'orb'); break;
    case 'burst': e.bq = f.n || 3; e.bcd = 0; e.bang = ang; break;
    case 'spiral': e.sa += .42; mk(e.sa, f.s, 'ring'); break;
    case 'drop': ebullet(e.x, e.y, -.8, e.y < V.H / 2 ? f.s : -f.s, 'orb'); break;
    case 'mine': ebullet(e.x, e.y, -1.1, 0, 'mine', { mine: 1, l: 460 }); break;
    case 'wall': wallOf(f.s, e.x, 12); break;
  }
  if (f.k !== 'spiral') SFX.hit();
}
function wallOf(s, x, n) { const gap = rint(1, n - 3), step = (V.H - 100) / n; for (let i = 0; i < n; i++) if (i < gap || i > gap + 1) ebullet(x, 70 + i * step, -s, 0, 'shard', { r: 6 }); }
function hurtEnemy(e, dmg, b) {
  if (e.dead || e.inv) { if (e.inv) spark(e.x, e.y, 3, '#94a3b8', 3, 12, 2); return false; }
  if (e.boss && !(b && b.raw)) dmg *= bossArmor(e);
  e.hp -= dmg; e.hf = 4; if (dmg < 9000) { const cr = b && b.crit; ftext(e.x + rnd(-10, 10), e.y - e.r - 6, Math.max(1, Math.round(dmg)), cr ? '#fb923c' : dmg > 20 ? '#fde047' : '#e2e8f0', cr ? 17 : dmg > 20 ? 14 : 11); SFX.hit(); }
  if (e.hp <= 0) { if (e.boss) killBoss(e, b); else killEnemy(e, b ? b.own : -1); return true; }
  return false;
}
function killEnemy(e, own) {
  if (e.dead) return; e.dead = true; const d = e.d, R = G.run, col = hex(d.m[1].e || 0xf97316);
  if (R && R.mode !== 'tutorial' && e.id !== 'dummy') { if (!SAVE.kd[e.id]) toast('BESTIARY: ' + d.nm.toUpperCase(), 'New entry - see Profile > Bestiary', '#22d3ee'); SAVE.kd[e.id] = (SAVE.kd[e.id] || 0) + 1; }
  boom2D(e.x, e.y, e.w * .75, col); SFX.boom(); if (R3) R3.boom(e.x, e.y, Math.min(14, 4 + (e.w / 12 | 0)), hx(d.m[1].c || 0x555555), 5 + e.w / 40, 6 + e.w / 12);
  R.kills++; R.combo = R.comboT > 0 ? R.combo + 1 : 1; R.comboT = 150; if (R.combo > R.maxCombo) R.maxCombo = R.combo; const mul = 1 + Math.min(R.combo, 20) * .1; R.score += Math.round(d.sc * mul); const pl = G.players[own]; if (pl) { pl.kills++; pl.score += d.sc; if (pl.alive && pl.mod.vamp) pl.hp = Math.min(pl.mhp, pl.hp + pl.mod.vamp * (d.elite ? 3 : .35)); }
  if (R.blitz) R.time += .5; shake(d.elite ? 8 : 2, d.elite ? 14 : 5); if (d.elite) { G.freeze = 5; shock(e.x, e.y, '#fff', 160, 26); shock(e.x, e.y, col, 270, 34); boom2D(e.x + rnd(-18, 18), e.y + rnd(-18, 18), e.w * .9, col); }
  dropLoot(e); onKillC(e, own); if (e.id === 'rival') rivalDown(e); killFx(e); { const kp = G.players[own]; if (kp && R) { const wk = R.wk || (R.wk = {}); wk[kp.wpn] = (wk[kp.wpn] | 0) + 1; } }
  if (d.burst) for (let i = 0; i < d.burst; i++) { const a = i / d.burst * TAU; ebullet(e.x, e.y, Math.cos(a) * 3.2, Math.sin(a) * 3.2, 'shard'); }
  if (d.split) for (let i = 0; i < 2; i++) { const c = mkEnemy(d.split, e.x, e.y + (i ? 26 : -26), { hpm: 1 }); c.vy = i ? 2 : -2; c.st = 9; }
}
function dropLoot(e) {
  const d = e.d, R = G.run, E = G.ent.pk; let cv = Math.round((R.lootM || 1) * d.cr * (e.gold ? 3 : 1) * (1 + (R.w || 0) * .12) * (1 + (R.remix ? .3 * (R.remix - 1) : 0)) * (1 + G.players.reduce((a, q) => a + q.mod.loot, 0))); if (R.mode === 'training' || R.mode === 'tutorial') cv = Math.min(cv, 1);
  const n = cv <= 4 ? 1 : cv <= 14 ? 3 : 6, each = Math.max(1, Math.round(cv / n));
  for (let i = 0; i < n; i++) E.push({ k: 'core', v: each, x: e.x + rnd(-14, 14), y: e.y + rnd(-14, 14), vx: rnd(-1.5, 1), vy: rnd(-1.5, 1.5), l: 700 });
  const lowAm = G.players.some(p => p.alive && p.am < p.mam * .55 && !(R.freeAmmo));
  const roll = () => Math.random();
  if (!R.freeAmmo && (roll() < (lowAm ? .38 : .17) * (R.ammoDrop || 1) || d.elite)) E.push({ k: 'ammo', x: e.x, y: e.y, vx: -1, vy: rnd(-1, 1), l: 760 });
  if (roll() < (d.elite ? .6 : .05)) E.push({ k: 'hp', x: e.x, y: e.y, vx: -1, vy: rnd(-1, 1), l: 760 });
  if (roll() < (d.elite ? .6 : .05)) E.push({ k: 'sh', x: e.x, y: e.y, vx: -1, vy: rnd(-1, 1), l: 760 });
  if (roll() < (d.elite ? .3 : .02)) E.push({ k: 'od', x: e.x, y: e.y, vx: -1, vy: rnd(-1, 1), l: 760 });
}
function updPickups() {
  const E = G.ent.pk, magnetAll = G.run && G.run.stage === 'clear';
  for (let i = E.length - 1; i >= 0; i--) {
    const k = E[i]; k.l--; k.x += k.vx; k.y += k.vy; k.vx += (-1.0 - k.vx) * .04; k.vy *= .94;
    const P = nearP(k.x, k.y);
    if (P) { const dx = P.x - k.x, dy = P.y - k.y, d = Math.hypot(dx, dy), mr = (k.k === 'core' ? 120 : 90) * P.st.mag + (magnetAll ? 3000 : 0); if (d < mr) { const pull = (magnetAll ? 14 : 7) * (1 - d / (mr + 1)) + 1.5; k.x += dx / d * pull; k.y += dy / d * pull; } if (d < 30) { collect(P, k); E.splice(i, 1); continue; } }
    if (k.l <= 0 || k.x < -30) E.splice(i, 1);
  }
}
function collect(p, k) {
  const R = G.run; SFX.pick();
  if (k.k === 'core') { if (p.remote) { R.rCores = (R.rCores | 0) + k.v; ftext(p.x, p.y - 22, '+' + k.v, '#fbbf24', 12); } else { SAVE.cores += k.v; R.cores += k.v; } ftext(p.x, p.y - 22, '+' + k.v, '#fbbf24', 12); }
  else if (k.k === 'ammo') { const a = Math.max(30, p.mam * .4); p.am = Math.min(p.mam, p.am + a); ftext(p.x, p.y - 22, '+PLASMA', '#2dd4bf', 12); shock(p.x, p.y, '#2dd4bf', 50, 14); }
  else if (k.k === 'hp') { const a = Math.max(30, p.mhp * .3); p.hp = Math.min(p.mhp, p.hp + a); ftext(p.x, p.y - 22, '+HULL', '#4ade80', 12); shock(p.x, p.y, '#4ade80', 56, 16); SFX.power(); if (R3) { if (p.hp > p.mhp * .9) R3.repair(p); } }
  else if (k.k === 'sh') { p.sh = Math.min(p.msh, p.sh + Math.max(30, p.msh * .6)); ftext(p.x, p.y - 22, '+SHIELD', '#38bdf8', 12); shock(p.x, p.y, '#38bdf8', 56, 16); SFX.power(); }
  else if (k.k === 'log') gotLog(p, k);
  else if (k.k === 'od') { p.od = 600; ftext(p.x, p.y - 22, 'OVERDRIVE!', '#fb923c', 13); shock(p.x, p.y, '#fb923c', 90, 20); SFX.power(); }
  if (R.tut) R.tut.picked[k.k] = true;
}

// ---------- player bullets ----------
function updPB() {
  const A = G.ent.pb, En = G.ent.en;
  for (let i = A.length - 1; i >= 0; i--) {
    const b = A[i]; let rm = false;
    if (b.home) { const t = nearE(b.x, b.y, 460); if (t) { const want = Math.atan2(t.y - b.y, t.x - b.x), cur = Math.atan2(b.vy, b.vx); let df = want - cur; while (df > PI) df -= TAU; while (df < -PI) df += TAU; const na = cur + clamp(df, -.1, .1), sp = Math.hypot(b.vx, b.vy) * 1.012; b.vx = Math.cos(na) * Math.min(sp, 13); b.vy = Math.sin(na) * Math.min(sp, 13); } if (G.t % 2 === 0) pcl({ x: b.x - b.vx, y: b.y, vx: -1, vy: rnd(-.4, .4), l: 14, l0: 14, c: '#fb923c', r: 4, k: 0, fr: .9 }); }
    else if (b.hm2) { let t = null, bd = 330 * 330; for (const e of En) { if (e.dead || e.hide || e.x > V.W + 10 || e.x < b.x - 6) continue; const dd = (e.x - b.x) * (e.x - b.x) + (e.y - b.y) * (e.y - b.y); if (dd < bd) { bd = dd; t = e; } } if (t) { const sp = Math.hypot(b.vx, b.vy), want = Math.atan2(t.y - b.y, t.x - b.x), cur = Math.atan2(b.vy, b.vx); let df = want - cur; while (df > PI) df -= TAU; while (df < -PI) df += TAU; const na = cur + clamp(df, -.022 * b.hm2, .022 * b.hm2); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; } }
    b.x += b.vx; b.y += b.vy; b.l--;
    if (b.crush) { const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j]; if ((q.x - b.x) * (q.x - b.x) + (q.y - b.y) * (q.y - b.y) < (b.r + q.r + 6) * (b.r + q.r + 6)) { spark(q.x, q.y, 3, '#c084fc', 3, 14, 2); eb.splice(j, 1); } } }
    const bs = G.run && G.run.boss;
    if (bs && bs.pods) { const pd = podHit(bs, b); if (pd && b.hs.indexOf(pd) < 0) { b.hs.push(pd); hurtPod(bs, pd, b.d, b); spark(b.x, b.y, 4, b.c, 3, 12, 2); if (b.pierce > 0) b.pierce--; else { A.splice(i, 1); continue; } } }
    for (let j = 0; j < En.length; j++) {
      const e = En[j]; if (e.dead || e.x > V.W + 8 || e.hide) continue;
      const rr = b.r + e.r; if ((e.x - b.x) * (e.x - b.x) + (e.y - b.y) * (e.y - b.y) > rr * rr) continue;
      if (b.hs.indexOf(e) >= 0) continue; b.hs.push(e);
      hurtEnemy(e, b.d, b); spark(b.x, b.y, 4, b.c, 3, 12, 2);
      if (b.blast) { if (b.cb) { shock(b.x, b.y, '#fb923c', b.blast * 1.1, 12); spark(b.x, b.y, 4, '#fbbf24', 3, 10, 2); } else boom2D(b.x, b.y, 38, '#fb923c'); for (const q of En) if (q !== e && !q.dead && (q.x - b.x) * (q.x - b.x) + (q.y - b.y) * (q.y - b.y) < (b.blast + q.r) * (b.blast + q.r)) hurtEnemy(q, b.d * .6, b); }
      if (b.chain) { let from = e; const seen = [e]; for (let c = 0; c < b.chain; c++) { const n = nearE(from.x, from.y, 170, seen); if (!n) break; seen.push(n); G.ent.bm.push({ k: 'arc', x: from.x, y: from.y, x2: n.x, y2: n.y, l: 10, l0: 10 }); hurtEnemy(n, b.d * .7, b); from = n; } }
      if (b.pierce > 0) b.pierce--; else { rm = true; break; }
    }
    if (rm || b.l <= 0 || b.x > V.W + 60 || b.x < -40 || b.y < -40 || b.y > V.H + 40) A.splice(i, 1);
  }
}

// ---------- enemy bullets ----------
function updEB() {
  const A = G.ent.eb, ts = G.ts || 1;
  for (let i = A.length - 1; i >= 0; i--) {
    const b = A[i]; let rm = false;
    if (b.hm && b.l < 380) { const P = nearP(b.x, b.y); if (P) { const sp = Math.hypot(b.vx, b.vy), want = Math.atan2(P.y - b.y, P.x - b.x), cur = Math.atan2(b.vy, b.vx); let df = want - cur; while (df > PI) df -= TAU; while (df < -PI) df += TAU; const na = cur + clamp(df, -.028, .028); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; } }
    b.x += b.vx * ts; b.y += b.vy * ts; b.l--; b.arm++;
    for (const p of G.players) if (p.alive && p.wallT > 0 && Math.abs(b.y - p.y) < 100 && Math.abs(b.x - (p.x + 54)) < 14) { spark(b.x, b.y, 3, '#7dd3fc', 3, 12, 2); rm = true; break; }
    if (rm) { A.splice(i, 1); continue; }
    if (b.mine) { const P = nearP(b.x, b.y); if (b.l <= 0 || (b.arm > 70 && P && Math.hypot(P.x - b.x, P.y - b.y) < 70)) { for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; ebullet(b.x, b.y, Math.cos(a) * 3.2, Math.sin(a) * 3.2, 'shard'); } boom2D(b.x, b.y, 26, '#f59e0b'); rm = true; } b.vx *= .985; }
    else for (const p of G.players) {
      if (!p.alive) continue;
      const dx = p.x - b.x, dy = p.y - b.y, d2 = dx * dx + dy * dy, rr = b.r + 11;
      if (p.inv > 0) { if (p.dashT > 0 && !b.gz && d2 < (rr + 18) * (rr + 18)) graze(p, b); continue; }
      if (d2 < rr * rr) { hurt(p, b.d, 'b'); if (b.ice) { p.slow = 100; ftext(p.x, p.y - 36, 'FROZEN', '#bae6fd', 11); } rm = true; break; }
      if (!b.gz && d2 < (rr + 18) * (rr + 18)) graze(p, b);
    }
    if (!rm && G.run && G.run.stn && b.x < STN_X && b.vx < 0 && !b.mine) { stnHit(G.run, b.d * .3, b.x, b.y); rm = true; }
    if (rm || b.l <= 0 || b.x < -40 || b.x > V.W + 80 || b.y < -40 || b.y > V.H + 40) A.splice(i, 1);
  }
}

// ---------- ramming ----------
function ramCheck() {
  for (const p of G.players) {
    if (!p.alive) continue;
    for (const e of G.ent.en) {
      if (e.dead || e.hide || e.x > V.W + 6) continue;
      const rr = 15 + e.r * .86; if ((p.x - e.x) * (p.x - e.x) + (p.y - e.y) * (p.y - e.y) > rr * rr) continue;
      if (p.dashT > 0) { if (!e.boss && !(e.dhT > G.t)) { e.dhT = G.t + 30; spark(e.x, e.y, 8, '#e0f2fe', 5, 16, 2); hurtEnemy(e, 34 + e.mhp * .22, { own: p.id }); } continue; }
      if (e.boss) { if (!e.rcd) { hurt(p, 26, 'ram'); e.rcd = 45; const a = Math.atan2(p.y - e.y, p.x - e.x); p.vx = Math.cos(a) * 8; p.vy = Math.sin(a) * 8; } continue; }
      if (p.inv > 0 && p.od <= 0) continue;
      const a = Math.atan2(p.y - e.y, p.x - e.x); p.vx += Math.cos(a) * 6; p.vy += Math.sin(a) * 6;
      hurt(p, e.ram * (e.d.elite ? 1.4 : 1) * G.run.edm * (1 - .4 * p.mod.ramc), 'ram');
      if (e.d.elite) { hurtEnemy(e, e.mhp * (.3 + .1 * p.mod.ramc), { own: p.id }); e.rcd = 30; } else { e.hp = 0; killEnemy(e, p.id); }
    }
  }
  for (const e of G.ent.en) if (e.rcd > 0) e.rcd--;
}

// ---------- bosses ----------
function spawnBoss(wi, hpMul) {
  const B = BOSSES[wi], mu = runMul(), R0 = G.run, bm = R0.bhm && R0.spec ? R0.bhm * R0.hpm / R0.spec.diff : 1, hp = Math.round(B.hp * (hpMul || 1) * mu.hp * bm / (R0.bhm && R0.spec ? R0.hpm : 1) * (1 + (G.run.tier - 1) * .35));
  const e = { id: 'boss', boss: true, bi: wi, d: { ai: 'boss', m: ['boss', {}], sc: B.rew, cr: 0, nm: B.nm }, x: V.W + B.w, y: V.H / 2, y0: V.H / 2, w: B.w, r: B.w * .3, hp, mhp: hp, t: 0, hf: 0, ph: 0, atk: 0, acd: 120, inv: true, st: 0, tgx: V.W - B.w * .55, dead: false, rcd: 0, hide: false, sa: 0, q: [], mv: B.ph[0].mv };
  e.pods = B.ph.map((_, i) => mkPod(e, B, i)); e.stg = 0;
  G.ent.en.push(e); G.run.boss = e; G.ent.eb.length = 0;
  const intro = () => { SFX.warn(); music.start(G.world, true); document.body.classList.add('lb'); setTimeout(() => document.body.classList.remove('lb'), 2400); banner('WARNING', B.nm.toUpperCase(), true); shake(6, 40); };
  if (storyDue(wi)) { (SAVE.flags.cut || (SAVE.flags.cut = {}))[wi] = 1; playCut(bossPanels(wi), intro); } else intro();
  return e;
}
function updBoss(e) {
  const B = BOSSES[e.bi], W = V.W, Hh = V.H, t = ++e.t; if (e.hf > 0) e.hf--; if (e.rcd > 0) e.rcd--;
  const ph = B.ph[e.ph], P = nearP(e.x, e.y), ts = G.ts || 1;
  if (e.stg > 0) e.stg--; { const pd0 = podOf(e); if (pd0) { pd0.age++; if (pd0.hf > 0) pd0.hf--; } }
  if (e.st === 0) { e.x += (e.tgx - e.x) * .02 - .6; if (e.x <= e.tgx + 6) { e.st = 1; e.inv = false; } return; }
  if (e.st === 2) { // dying
    e.x += rnd(-1, 1); e.y += rnd(-1, 1); if (e.t % 5 === 0) boom2D(e.x + rnd(-e.w / 2, e.w / 2), e.y + rnd(-e.w / 3, e.w / 3), rnd(30, 70), B.c); if (--e.dt <= 0) { finalBossBlast(e); e.dead = true; } return;
  }
  if (e.pause > 0) { if (--e.pause === 0) e.inv = false; return; }
  const mv = ph.mv, tgx = e.tgx;
  if (mv === 'hover') { e.x += (tgx + Math.sin(t * .017) * 30 - e.x) * .06; e.y += (Hh / 2 + Math.sin(t * .021) * Hh * .28 - e.y) * .06; }
  else if (mv === 'sweep') { e.x += (tgx + Math.cos(t * .015) * 60 - e.x) * .06; e.y += (Hh / 2 + Math.sin(t * .03) * Hh * .36 - e.y) * .08; }
  else if (mv === 'orbit') { e.x += (tgx - 40 + Math.cos(t * .02) * 120 - e.x) * .06; e.y += (Hh / 2 + Math.sin(t * .02) * Hh * .3 - e.y) * .06; }
  else if (mv === 'charge') {
    if (e.cs === undefined) { e.cs = 0; e.cc = 0; }
    e.cc++;
    if (e.cs === 0) { e.x += (tgx + Math.sin(t * .02) * 20 - e.x) * .06; e.y += (Hh / 2 + Math.sin(t * .021) * Hh * .26 - e.y) * .06; if (e.cc > 280) { e.cs = 1; e.cc = 0; e.cy = P ? P.y : Hh / 2; } }
    else if (e.cs === 1) { e.x += (tgx + 60 - e.x) * .08; e.y += (e.cy - e.y) * .1; if (e.cc % 8 < 4) e.hf = 2; if (e.cc > 50) { e.cs = 2; e.cc = 0; } }
    else if (e.cs === 2) { e.x -= 17; if (e.x < 150 || e.cc > 60) { e.cs = 3; e.cc = 0; shake(10, 18); } }
    else { e.x += (tgx - e.x) * .045; if (e.cc > 60) { e.cs = 0; e.cc = 0; } }
  }
  e.y = clamp(e.y, e.w * .3, Hh - e.w * .3);
  // phase change
  if (e.ph < B.ph.length - 1 && e.hp / e.mhp <= B.ph[e.ph + 1].at) {
    e.ph++; e.atk = 0; e.acd = 70; e.inv = true; e.pause = 50; e.stg = 0; e.cs = undefined; G.ent.eb.forEach(q => spark(q.x, q.y, 2, '#fb7185', 2, 12, 2)); G.ent.eb.length = 0;
    shock(e.x, e.y, B.c, e.w * 1.2, 30); shake(10, 30); banner('PHASE ' + (e.ph + 1), B.nm.toUpperCase(), true); SFX.warn(); return;
  }
  if (e.sp) { // active spiral
    if (e.sp.left > 0 && t % 2 === 0) { e.sp.a += .36; ebullet(e.x - e.w * .35, e.y, Math.cos(e.sp.a) * e.sp.s, Math.sin(e.sp.a) * e.sp.s, 'ring'); e.sp.left--; }
  }
  if (e.cs === 2 || e.cs === 1) return;
  if (!e.rage && e.ph === B.ph.length - 1 && e.hp / e.mhp < .18) { e.rage = true; banner('ENRAGED', B.nm.toUpperCase(), true); shake(8, 24); shock(e.x, e.y, '#ef4444', e.w * 1.3, 28); SFX.warn(); }
  e.acd -= ts;
  if (e.acd <= 0) { const bd = bossDiff(); let a = ph.atk[e.atk % ph.atk.length]; if (bd >= 1 && e.ph >= 1 && e.atk % 4 === 3) a = BEXTRA[(e.atk >> 2) & 1]; e.atk++; bossAtk(e, scaleAtk(a, bd)); e.acd = a.r / (1 + bd * .08) * (e.rage ? .8 : 1); }
}
function bossAtk(e, a) {
  const ox = e.x - e.w * .38, P = nearP(e.x, e.y), ang = P ? Math.atan2(P.y - e.y, P.x - ox) : PI, ice = a.ice ? { ice: 1 } : null, dm = Math.round(12 * G.run.edm);
  const mk = (an, s, k, o) => ebullet(ox, e.y, Math.cos(an) * s, Math.sin(an) * s, k, Object.assign({ d: dm }, o));
  switch (a.k) {
    case 'fan': for (let i = 0; i < a.n; i++) mk(ang + (i - (a.n - 1) / 2) * (a.sp / Math.max(1, a.n - 1) * 2 || .15), a.s, 'orb'); break;
    case 'aim': for (let i = 0; i < a.n; i++) mk(ang + rnd(-.04, .04), a.s - i * .35, 'shard'); break;
    case 'ring': { const a0 = Math.random() * TAU; for (let i = 0; i < a.n; i++) mk(a0 + i / a.n * TAU, a.s, 'ring', ice); break; }
    case 'rain': for (let i = 0; i < a.n; i++) ebullet(V.W * rnd(.25, 1), -10 - i * 14, -.8, a.s, a.ice ? 'ice' : 'shard', { d: dm, ice: a.ice, l: 300 }); break;
    case 'spiral': e.sp = { left: a.n, a: Math.random() * TAU, s: a.s }; break;
    case 'summon': { let c = G.ent.en.filter(q => q.minion).length; for (let i = 0; i < a.n && c < 8; i++, c++) mkEnemy(a.id, e.x - e.w * .4, e.y + (i - (a.n - 1) / 2) * 60, { minion: 1, hpm: .6 }); shock(e.x, e.y, '#fff', 120, 18); break; }
    case 'mines': for (let i = 0; i < a.n; i++) ebullet(e.x - e.w * .5 - i * 40, e.y + (i - (a.n - 1) / 2) * 70, -1.6, 0, 'mine', { mine: 1, l: 420, d: dm }); break;
    case 'wall': wallOf(a.s, e.x - e.w * .3, a.n); break;
    case 'homing': for (let i = 0; i < a.n; i++) mk(PI + (i - (a.n - 1) / 2) * .5, a.s, 'plasma', { hm: 1, r: 7, l: 420 }); break;
    case 'beam': G.ent.bm.push({ k: 'beam', o: e, y: P ? P.y : V.H / 2, h: 64, tel: 70, on: 46, c: BOSSES[e.bi].c }); break;
  }
  SFX.hit(); shake(2, 5);
}
function killBoss(e) {
  if (e.st === 2) return; e.st = 2; e.dt = 130; e.inv = true; G.ent.eb.length = 0; G.ent.bm = G.ent.bm.filter(b => b.k !== 'beam'); e.sp = null;
  G.freeze = 18; shake(16, 60); G.slowUntil = performance.now() + 1300; SFX.boom(true); G.run.score += BOSSES[e.bi].rew; haptic([80, 60, 120]);
  G.ent.en.forEach(q => { if (q.minion && !q.dead) { q.hp = 0; killEnemy(q, -1); } });
}
function finalBossBlast(e) {
  const B = BOSSES[e.bi]; boom2D(e.x, e.y, 200, B.c); shock(e.x, e.y, '#fff', 380, 40); shock(e.x, e.y, B.c, 520, 50); shake(20, 50); G.flashT = 30; G.slowUntil = performance.now() + 700;
  if (R3) R3.boom(e.x, e.y, 40, hx(B.c), 12, 18);
  const n = 14; for (let i = 0; i < n; i++) G.ent.pk.push({ k: 'core', v: Math.max(2, Math.round(B.rew / 60 * (e.gold ? 3 : 1))), x: e.x + rnd(-60, 60), y: e.y + rnd(-60, 60), vx: rnd(-4, 2), vy: rnd(-4, 4), l: 900 });
  G.ent.pk.push({ k: 'hp', x: e.x, y: e.y, vx: -1, vy: 0, l: 900 }, { k: 'sh', x: e.x, y: e.y + 30, vx: -1, vy: 0, l: 900 });
  G.run.boss = null; G.run.bossDown = (G.run.bossDown | 0) + 1;
  if (G.run.mode !== 'tutorial') { if (!SAVE.bd[e.bi]) toast('BESTIARY: ' + B.nm.toUpperCase(), 'Boss entry added - see Profile > Bestiary', '#fbbf24'); SAVE.bd[e.bi] = (SAVE.bd[e.bi] || 0) + 1; }
}

// ---------- beams + hazards ----------
function updBeams() {
  const A = G.ent.bm;
  for (let i = A.length - 1; i >= 0; i--) {
    const b = A[i];
    if (b.k === 'beam') {
      if (!b.o || b.o.dead) { A.splice(i, 1); continue; }
      const P = nearP(b.o.x, b.y);
      if (b.tel > 0) { b.tel--; if (P) b.y += (P.y - b.y) * .06; if (b.tel === 0) { SFX.boom(true); shake(6, b.on); } }
      else { if (P) b.y += (P.y - b.y) * .008; b.on--; for (const p of G.players) if (p.alive && p.inv <= 0 && p.x < b.o.x && Math.abs(p.y - b.y) < b.h / 2 + 8) hurt(p, Math.round(14 * G.run.edm), 'beam'); if (b.on <= 0) A.splice(i, 1); }
    } else if (--b.l <= 0) A.splice(i, 1);
  }
  const H2 = G.ent.hz, hz = curHz(), R = G.run;
  if (hz === 'lava' && R && R.stage === 'wave' && G.t % 300 === 150) H2.push({ k: 'gey', x: rnd(V.W * .15, V.W * .88), tel: 70, on: 50, top: Math.random() < .3 });
  if (R && R.hazMode && G.t % 90 === 0 && R.stage === 'wave' && (R.q.length || G.ent.en.some(e => !e.dead && !e.boss && e.id !== 'rock'))) mkEnemy('rock', V.W + 40, rnd(70, V.H - 70), { hpm: .7 }).vy = rnd(-.8, .8);
  if (hz === 'bolt' && R && R.stage === 'wave' && G.t % 210 === 100) { const tp = G.players.find(q => q.alive); H2.push({ k: 'bolt', x: tp && Math.random() < .5 ? clamp(tp.x + rnd(-90, 90), 40, V.W - 40) : rnd(V.W * .2, V.W * .92), tel: 54, on: 12 }); }
  for (let i = H2.length - 1; i >= 0; i--) {
    const h = H2[i], bolt = h.k === 'bolt';
    if (h.tel > 0) { h.tel--; if (bolt && h.tel === 0) { shake(5, 10); G.flashT = 5; SFX.boom(true); } } else { h.on--; for (const p of G.players) if (p.alive && p.inv <= 0 && Math.abs(p.x - h.x) < (bolt ? 24 : 30) && (bolt || (h.top ? p.y < V.H * .62 : p.y > V.H * .3))) hurt(p, Math.round((bolt ? 15 : 12) * G.run.edm), bolt ? 'bolt' : 'geyser'); if (h.on <= 0) H2.splice(i, 1); }
  }
  G.ts = (hz === 'time' ? 1 + Math.sin(G.t * .004) * .26 : 1) * (G.abTs > 0 ? .4 : 1);
}

function curHz() { return G.mapX ? null : WORLDS[G.world | 0].hz; }

// ================= COMBAT 2.0: charge shot, secondary weapons, parry, super finisher, golden elites, mid-level events =================
const SECW = {
  salvo: { nm: 'Seeker Salvo', ds: 'Four homing missiles that blast on impact.', c: '#fb923c' },
  shotgun: { nm: 'Flak Burst', ds: 'A close-range blast of nine pellets. Huge damage up close.', c: '#fde047' },
  mines: { nm: 'Mine Layer', ds: 'Drops six slow mines that explode when enemies touch them.', c: '#f472b6' }
};
const secOf = p => SECW[p.pl.sec] ? p.pl.sec : 'salvo';
const IN2 = { tsec: false, sup: [0, 0], rdown: false };
function secHeld(p) {
  if (p.remote) return !!(p.netIn && p.netIn.sec);
  const co = G.players.length > 1 && !G.net, k = co ? KB[p.id] : KALL;
  if (k.c && kdown(k.c)) return true;
  const pad = co ? IN.pads[p.id] : IN.pads[0]; if (pad && pad.sec) return true;
  if ((G.net ? p.local : p.id === 0) && (IN2.rdown || IN2.tsec)) return true;
  return false;
}
function supPressed(p) { if (p.remote) { if (p.netSup) { p.netSup = 0; return true; } return false; } const i = G.net ? 0 : p.id; if (IN2.sup[i]) { IN2.sup[i] = 0; return true; } return false; }
function addSup(p, v) { if (!p || !p.alive || p.supT > 0 || p.noSup) return; const was = p.sup >= 100; p.sup = Math.min(100, (p.sup || 0) + v); if (!was && p.sup >= 100) { alertMsg((G.players.length > 1 ? 'P' + (p.id + 1) + ' ' : '') + 'SUPER READY - ' + (touchOn() ? 'TAP SUPER' : 'PRESS ' + keyLabel(KB[p.id].v[0]))); SFX.power(); } }

// ---- per pilot, every frame ----
function combatTick(p, o) {
  if (p.secCd > 0) p.secCd--; if (p.pcd > 0) p.pcd--; if (p.parT > 0) p.parT--;
  const held = secHeld(p), R = G.run;
  if (held && !p.secH) { // fresh press: parry if a shot is about to hit, otherwise start charging
    p.secH = true; p.chg = 0; p.secLock = false;
    if (p.pcd <= 0) { if (tryParry(p)) p.secLock = true; else p.pcd = 40; }
  } else if (held && !p.secLock) { p.chg = Math.min(80, p.chg + 1); p.vx *= .97; p.vy *= .97; if (p.chg >= 12 && p.chg % 10 === 0 && p.chg < 80) SFX.charge(p.chg / 80); if (p.chg === 80) SFX.power(); }
  else if (!held && p.secH) { // release
    p.secH = false;
    if (!p.secLock) { if (p.chg >= 30) chargeShot(p, (p.chg - 30) / 50); else if (p.secCd <= 0) fireSec(p); }
    p.chg = 0; p.secLock = false;
  }
  if (supPressed(p)) { if (p.sup >= 100) superGo(p); else if (p.alive) alertMsg('SUPER ' + Math.floor(p.sup || 0) + '%'); }
  if (p.supT > 0) superTick(p);
  if (p.cfg.hull === 'ronin' && R) roninTick(p);
}
function tryParry(p) {
  const eb = G.ent.eb; let n = 0;
  for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j], dx = q.x - p.x, dy = q.y - p.y; if (dx * dx + dy * dy < 70 * 70) n++; }
  if (!n) return false;
  for (let j = eb.length - 1; j >= 0; j--) {
    const q = eb[j], dx = q.x - p.x, dy = q.y - p.y; if (dx * dx + dy * dy > 110 * 110) continue;
    const t = nearE(q.x, q.y, 900), a = t ? Math.atan2(t.y - q.y, t.x - q.x) : 0;
    pb(p, q.x, q.y, Math.cos(a) * 13, Math.sin(a) * 13, 'ion', { d: 14 * p.st.dmg * (G.pdm || 1), r: 5, c: '#fef08a', l: 90, pierce: 1 }); spark(q.x, q.y, 3, '#fef08a', 3, 12, 2); eb.splice(j, 1);
  }
  p.inv = Math.max(p.inv, 24); p.blink = false; p.parT = 18; p.pcd = 22; G.freeze = 5; shake(4, 8);
  shock(p.x, p.y, '#fef08a', 150, 18); shock(p.x, p.y, '#ffffff', 80, 12); ftext(p.x, p.y - 34, 'PARRY!', '#fef08a', 18); SFX.parry(); haptic(30);
  addSup(p, 9 + n * 2); SAVE.st.parry = (SAVE.st.parry | 0) + 1; if (G.run) G.run.parries = (G.run.parries | 0) + 1;
  return true;
}
function chargeShot(p, f) {
  const nx = p.x + 30 * (HULLK[p.cfg.hull] || 1), d = (16 + 44 * f) * p.st.dmg * (G.pdm || 1), r = 11 + 13 * f;
  pb(p, nx, p.y, 15, 0, 'lancer', { d, r, pierce: 99, crush: 1, l: 90, c: f > .9 ? '#ffffff' : '#a5f3fc', chg: 1 });
  if (f > .95) [-.12, .12].forEach(a => pb(p, nx, p.y, Math.cos(a) * 14, Math.sin(a) * 14, 'lancer', { d: d * .5, r: r * .6, pierce: 99, l: 70, c: '#a5f3fc', chg: 1 }));
  shock(nx, p.y, '#a5f3fc', 60 + 80 * f, 14); shake(2 + 5 * f, 8); p.vx -= 2 + 4 * f; SFX.shoot('rail');
  if (f > .95) ftext(p.x, p.y - 30, 'FULL CHARGE', '#a5f3fc', 13);
}
function fireSec(p) {
  const k = secOf(p), nx = p.x + 26, dm = p.st.dmg * (G.pdm || 1); p.secCd = 80;
  if (k === 'salvo') [-2, -1, 1, 2].forEach(q => pb(p, nx - 6, p.y + q * 8, 7, q * 2.2, 'missile', { d: 8 * dm, r: 6, home: 1, blast: 54, l: 150, c: '#fb923c' }));
  else if (k === 'shotgun') { for (let i = -4; i <= 4; i++) { const a = i * .11 + rnd(-.03, .03); pb(p, nx, p.y, Math.cos(a) * 15, Math.sin(a) * 15, 'spread', { d: 7 * dm, r: 4.5, l: 20, c: '#fde047' }); } shake(3, 6); p.vx -= 3; }
  else for (let i = 0; i < 6; i++) pb(p, nx, p.y, 2.2 + i * .45, (i - 2.5) * .8, 'orb', { d: 6 * dm, r: 9, l: 300, blast: 70, c: '#f472b6', mine: 1 });
  SFX.shoot(k === 'salvo' ? 'missile' : k === 'shotgun' ? 'spread' : 'orb');
}
// ---- super finisher: a huge beam that sweeps the lane in front of you ----
function superGo(p) {
  if (!p.alive || !G.run || G.run.over) return;
  const mate = G.players.find(q => q !== p && q.alive && q.sup >= 100 && G.run.var !== 'versus'); if (mate) { mate.sup = 0; mate.supT = 120; mate.team = 1; p.team = 1; mate.inv = Math.max(mate.inv, 130); banner('TEAM FINISHER', 'DOUBLE NOVA BEAM', false); SAVE.st.team = (SAVE.st.team | 0) + 1; }
  p.sup = 0; p.supT = 120; p.inv = Math.max(p.inv, 130); p.blink = false; G.flashT = 10; G.freeze = 6; shake(10, 30);
  shock(p.x, p.y, '#e879f9', 420, 30); shock(p.x, p.y, '#ffffff', 220, 22); banner('FINISHER', 'NOVA BEAM', false); SFX.sup(); SFX.boom(true); haptic([40, 30, 80]);
  G.ent.eb.forEach(q => spark(q.x, q.y, 2, '#f0abfc', 3, 14, 2)); G.ent.eb.length = 0; SAVE.st.supers = (SAVE.st.supers | 0) + 1; if (G.run) G.run.supers = (G.run.supers | 0) + 1;
}
function superTick(p) {
  p.supT--; const hw = (p.team ? 95 : 70) + Math.sin(G.t * .5) * 6, dm = p.st.dmg * (G.pdm || 1) * (p.team ? 1.5 : 1); if (p.supT <= 0) p.team = 0;
  const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j]; if (q.x > p.x && Math.abs(q.y - p.y) < hw) eb.splice(j, 1); }
  if (G.t % 6 === 0) for (const e of G.ent.en) { if (e.dead || e.hide || e.x < p.x || e.x > V.W + 20 || Math.abs(e.y - p.y) > hw + e.r) continue; hurtEnemy(e, (e.boss ? 9 : 26) * dm, { own: p.id, raw: 0 }); spark(e.x, e.y, 6, '#f0abfc', 5, 16, 3); }
  if (!SET.reduce && G.t % 2 === 0) spark(p.x + 40 + Math.random() * (V.W - p.x), p.y + rnd(-hw, hw) * .8, 1, Math.random() < .5 ? '#f0abfc' : '#ffffff', 6, 14, 2.5);
}
// ---- Ronin: a blade field that cuts anything that gets close ----
function roninTick(p) {
  if (!p.alive || G.t % 14) return; const dm = p.st.dmg * (G.pdm || 1); let hit = 0;
  for (const e of G.ent.en) { if (e.dead || e.hide) continue; const dx = e.x - p.x, dy = e.y - p.y, rr = 92 + e.r; if (dx * dx + dy * dy < rr * rr && dx > -30) { hurtEnemy(e, (e.boss ? 7 : 16) * dm, { own: p.id }); hit++; } }
  const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j], dx = q.x - p.x, dy = q.y - p.y; if (dx > 0 && dx * dx + dy * dy < 80 * 80) { spark(q.x, q.y, 2, '#fecaca', 3, 10, 2); eb.splice(j, 1); hit++; } }
  if (hit) { p.slashT = 10; p.slashA = (p.slashA || 0) + 1; }
}
function ronSlash(p) { // ability: CRESCENT - a dash that cuts a huge arc
  const dm = p.st.dmg * (G.pdm || 1); p.dvx = 15; p.dvy = (p.lmy || 0) * 4; p.dashT = 9; p.inv = Math.max(p.inv, 30); p.blink = false; p.bigSlash = 22;
  for (const e of G.ent.en) { if (e.dead || e.hide) continue; const dx = e.x - p.x, dy = e.y - p.y; if (dx > -40 && dx < 330 && Math.abs(dy) < 170 + e.r) hurtEnemy(e, e.boss ? e.mhp * .03 + 30 * dm : 60 * dm, { own: p.id }); }
  const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j], dx = q.x - p.x, dy = q.y - p.y; if (dx > -40 && dx < 330 && Math.abs(dy) < 170) { spark(q.x, q.y, 2, '#fecaca', 3, 12, 2); eb.splice(j, 1); } }
  shock(p.x + 120, p.y, '#fca5a5', 220, 18); shake(8, 14);
}
function hiveSwarm(p) { // ability: SWARM - eight kamikaze drones
  const dm = p.st.dmg * (G.pdm || 1);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; pb(p, p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, Math.cos(a) * 5 + 3, Math.sin(a) * 5, 'missile', { d: 14 * dm, r: 7, home: 1, blast: 60, l: 220, c: p.cfg.accent, drone: 1 }); }
  shock(p.x, p.y, p.cfg.accent, 140, 20);
}
function bowDeadeye(p) { // ability: DEADEYE - rail shots straight into the toughest targets
  const dm = p.st.dmg * (G.pdm || 1), T = G.ent.en.filter(e => !e.dead && !e.hide && e.x < V.W + 10 && e.x > 0).sort((a, b) => b.hp - a.hp).slice(0, 4);
  if (!T.length) { pb(p, p.x + 30, p.y, 26, 0, 'rail', { d: 60 * dm, r: 7, pierce: 99, l: 60 }); return; }
  T.forEach((e, i) => { (G.cfx = G.cfx || []).push({ k: 'rail', x: p.x + 30, y: p.y, x2: e.x, y2: e.y, l: 22, l0: 22 }); hurtEnemy(e, e.boss ? e.mhp * .035 + 40 * dm : 85 * dm, { own: p.id, crit: 1 }); spark(e.x, e.y, 10, '#e0f2fe', 5, 18, 3); });
  G.freeze = 6; shake(6, 10); shock(p.x, p.y, '#e0f2fe', 120, 16);
}

// ---- golden elites: rare, tough, worth a fortune - and they run away ----
function goldRoll(e, R) {
  if (!R || R.var === 'vault' || e.minion || e.id === 'rock' || R.goldDone || R.mode === 'training' || R.mode === 'tutorial') return;
  const force = R.bounty; if (!force && (Math.random() > .045 || (R.mode === 'expedition' && R.lv < 1))) return;
  R.goldDone = 1; R.bounty = 0; e.gold = 1; e.hunt = 1; e.hp = e.mhp = Math.round(e.mhp * 3); e.gT = 720;
  alertMsg('GOLDEN ELITE SPOTTED - HUNT IT!'); SFX.power();
}
function onKillC(e, own) {
  const p = G.players[own] || alive()[0]; const R = G.run;
  if (p) addSup(p, (e.d.elite ? 14 : 3) + Math.min(R ? R.combo : 0, 20) * .2 + (e.gold ? 30 : 0));
  if (e.hunt) {
    SAVE.st.gold = (SAVE.st.gold | 0) + 1; if (R) R.golds = (R.golds | 0) + 1; banner('GOLDEN ELITE DOWN', '+ BONUS CORES', false); SFX.clear();
    for (let i = 0; i < 10; i++) G.ent.pk.push({ k: 'core', v: 6 + (R ? R.w : 0) * 2, x: e.x + rnd(-40, 40), y: e.y + rnd(-40, 40), vx: rnd(-3, 2), vy: rnd(-3, 3), l: 800 });
    G.ent.pk.push({ k: 'od', x: e.x, y: e.y, vx: -1, vy: 0, l: 760 }); shock(e.x, e.y, '#fde047', 300, 30);
  }
}
// ---- mid-level events ----
const EVENTS = {
  meteor: { nm: 'METEOR SHOWER', ds: 'Rocks are falling - dodge or shoot them' },
  supply: { nm: 'SUPPLY DROP', ds: 'Friendly cargo incoming - grab it' },
  ambush: { nm: 'AMBUSH', ds: 'Extra enemies warping in' },
  bounty: { nm: 'BOUNTY', ds: 'A golden elite is on its way' },
  surge: { nm: 'ION SURGE', ds: 'Your guns are supercharged' }
};
function eventRoll(R) {
  if (!R || R.evDone || R.wave < 1 || G.brief) return;
  if (!(R.mode === 'expedition' && R.spec && R.spec.type !== 'B' && R.spec.type !== 's') && R.mode !== 'endless') return;
  if (Math.random() > (R.mode === 'endless' ? .3 : .4)) return;
  R.evDone = 1; const ks = Object.keys(EVENTS), k = ks[Math.floor(Math.random() * ks.length)]; startEvent(R, k);
}
function startEvent(R, k) {
  const E = EVENTS[k]; R.ev = { k, t: 0 }; banner(E.nm, E.ds, false); SFX.abil();
  if (k === 'supply') { ['hp', 'sh', 'ammo', 'od', 'ammo'].forEach((q, i) => G.ent.pk.push({ k: q, x: V.W * .7 + i * 30, y: V.H * (.25 + i * .12), vx: -1.2, vy: 0, l: 900 })); for (let i = 0; i < 8; i++) G.ent.pk.push({ k: 'core', v: 4, x: V.W * .75 + rnd(-40, 40), y: V.H * .5 + rnd(-90, 90), vx: -1, vy: 0, l: 900 }); }
  if (k === 'ambush') { const ro = rosterFor(R.w, R.lv || 0); for (let i = 0; i < 5; i++) { const ne = mkEnemy(pick(ro), V.W + 60 + i * 30, V.H * (.15 + i * .17)); ne.minion = true; } }
  if (k === 'bounty') R.bounty = 1;
  if (k === 'surge') G.players.forEach(p => { if (p.alive) { p.od = Math.max(p.od, 420); shock(p.x, p.y, '#fb923c', 140, 20); } });
}
function combatWorld(R) {
  const ev = R.ev; if (ev) { ev.t++; if (ev.k === 'meteor') { if (ev.t % 22 === 0 && ev.t < 540) { const m = mkEnemy('rock', V.W * rnd(.35, 1.05), -40, { hpm: .6, minion: true }); m.vy = rnd(2.2, 3.4); } if (ev.t > 600) R.ev = null; } else if (ev.t > 400) R.ev = null; }
  for (const e of G.ent.en) { if (!e.hunt || e.dead) continue; if (e.gT > 0 && --e.gT === 0) { alertMsg('THE GOLDEN ELITE IS ESCAPING!'); e.flee = 1; e.minion = true; } if (e.flee) { e.x -= 7; e.y += (V.H / 2 - e.y) * .01; } if (!SET.reduce && G.t % 5 === 0) spark(e.x + rnd(-e.r, e.r), e.y + rnd(-e.r, e.r), 1, '#fde047', 1.5, 20, 2); }
  if (G.cfx) G.cfx = G.cfx.filter(f => --f.l > 0);
}
function drawCombat(g, t) {
  const R = G.run; if (!R) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  if (R.var !== 'vault') for (const e of G.ent.en) if (e.hunt && !e.dead && !e.hide) { drawGlow(g, e.x, e.y, e.w * .85, '#fbbf24', .38 + Math.sin(t * .2) * .1); g.strokeStyle = 'rgba(253,224,71,.8)'; g.lineWidth = 2; g.setLineDash([8, 6]); g.lineDashOffset = -t * .5; g.beginPath(); g.arc(e.x, e.y, e.r * 1.6, 0, TAU); g.stroke(); g.setLineDash([]); }
  for (const p of G.players) {
    if (!p.alive) continue;
    if (p.chg > 6) { const f = Math.min(1, p.chg / 80), nx = p.x + 34 * (HULLK[p.cfg.hull] || 1), full = p.chg >= 80; drawGlow(g, nx, p.y, 10 + f * 34, full ? '#ffffff' : '#a5f3fc', .35 + f * .45 + (full ? Math.sin(t * .8) * .15 : 0)); if (p.chg >= 30) { g.strokeStyle = 'rgba(165,243,252,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(nx, p.y, 8 + f * 18, t * .3, t * .3 + TAU * f); g.stroke(); } }
    if (p.parT > 0) { g.strokeStyle = 'rgba(254,240,138,' + (p.parT / 18).toFixed(2) + ')'; g.lineWidth = 4; g.beginPath(); g.arc(p.x, p.y, 110 - p.parT * 3, 0, TAU); g.stroke(); }
    if (p.sup >= 100 && !SET.reduce) drawGlow(g, p.x, p.y, 50 + Math.sin(t * .3) * 6, '#e879f9', .22);
    if (p.supT > 0) {
      const k = Math.min(1, p.supT / 15, (120 - p.supT + 1) / 6), hw = (60 + Math.sin(t * .6) * 8) * k, x0 = p.x + 20;
      const gr = g.createLinearGradient(0, p.y - hw, 0, p.y + hw); gr.addColorStop(0, 'rgba(232,121,249,0)'); gr.addColorStop(.3, 'rgba(232,121,249,.55)'); gr.addColorStop(.5, 'rgba(255,255,255,.95)'); gr.addColorStop(.7, 'rgba(232,121,249,.55)'); gr.addColorStop(1, 'rgba(232,121,249,0)');
      g.fillStyle = gr; g.fillRect(x0, p.y - hw, V.W - x0 + 20, hw * 2); drawGlow(g, x0, p.y, hw * 1.8, '#f0abfc', .8);
    }
    if (p.slashT > 0) { p.slashT--; const a = p.slashT / 10, s = (p.slashA & 1) ? 1 : -1; g.strokeStyle = 'rgba(254,202,202,' + a.toFixed(2) + ')'; g.lineWidth = 5 * a + 1; g.beginPath(); g.arc(p.x + 10, p.y, 84, -1.1 * s, 1.1 * s, s < 0); g.stroke(); }
    if (p.bigSlash > 0) { p.bigSlash--; const a = p.bigSlash / 22; g.strokeStyle = 'rgba(254,226,226,' + a.toFixed(2) + ')'; g.lineWidth = 14 * a + 2; g.beginPath(); g.arc(p.x - 60, p.y, 260, -.75, .75); g.stroke(); g.lineWidth = 4 * a; g.strokeStyle = 'rgba(248,113,113,' + a.toFixed(2) + ')'; g.beginPath(); g.arc(p.x - 60, p.y, 236, -.7, .7); g.stroke(); }
  }
  if (G.cfx) for (const f of G.cfx) { const a = f.l / f.l0; g.strokeStyle = 'rgba(224,242,254,' + a.toFixed(2) + ')'; g.lineWidth = 6 * a + 1; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x2, f.y2); g.stroke(); drawGlow(g, f.x2, f.y2, 40 * a, '#e0f2fe', a); }
  const ev = R.ev; if (ev && ev.k === 'meteor' && ev.t < 540 && !SET.reduce) { g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(251,146,60,.05)'; g.fillRect(0, 0, V.W, V.H); }
  g.restore(); drawRift(g, t); drawVexAlly(g, t); drawCoop(g, t); drawGhost(g, t); drawHitbox(g); drawCorrupt(g, t); drawCrashEnemies(g, t);
}

// ================= ROUTES & SECRETS: branching paths, boss gallery, hidden rifts, 1-UP retro world, hardcore =================
// ---- branching paths: some sectors have a side route ----
const ALT_NODE = { 3: 'g', 8: 'x' };
const ALT_INFO = { g: { nm: 'TREASURE RUN', ds: 'Side route: a golden elite is guaranteed and loot is boosted' }, x: { nm: 'THE GAUNTLET', ds: 'Side route: elites, asteroid storms and tougher enemies - double cores' } };
const altKey = (w, i, tier) => w + ':' + i + ':' + tier;
const altStars = (w, i, tier) => ((SAVE.flags.alt || {})[altKey(w, i, tier)]) | 0;
function applyRoute(R) {
  const t = R.spec && R.spec.type;
  if (t === 'x') { R.hazMode = true; R.hpm *= 1.12; R.lootM = 2; }
  if (t === 'g') { R.bounty = 1; R.lootM = 1.7; }
}

// ---- hidden rifts: shoot the flickering crack to find a secret exit ----
const RIFTS = [[0, 4], [2, 6], [4, 7], [7, 5], [11, 9]];
const riftKey = (w, lv) => w + ':' + lv;
const riftsFound = () => Object.keys(SAVE.flags.rifts || {}).length;
function riftTick(R) {
  if (R.mode !== 'expedition' || R.var || !R.spec || R.tier !== 1) return;
  if (!RIFTS.some(r => r[0] === R.w && r[1] === R.lv)) return;
  const k = riftKey(R.w, R.lv); if ((SAVE.flags.rifts || {})[k]) return;
  if (!R.rift && !R.riftGone && R.stage === 'wave' && R.wave >= 1 && R.st > 120) { R.rift = { x: V.W * rnd(.62, .86), y: V.H * rnd(.25, .75), hp: 14, t: 0 }; }
  const F = R.rift; if (!F) return; F.t++;
  if (F.t > 900) { R.rift = null; R.riftGone = 1; return; } // it closes if you miss it
  const vis = F.t % 90 < 60 || F.hp < 14; if (!vis) return;
  const A = G.ent.pb; for (let i = A.length - 1; i >= 0; i--) { const b = A[i]; if ((b.x - F.x) * (b.x - F.x) + (b.y - F.y) * (b.y - F.y) < 34 * 34) { A.splice(i, 1); F.hp--; spark(b.x, b.y, 3, '#c084fc', 3, 12, 2); if (F.hp <= 0) break; } }
  if (F.hp <= 0) {
    R.rift = null; (SAVE.flags.rifts = SAVE.flags.rifts || {})[k] = 1; const n = riftsFound();
    shock(F.x, F.y, '#c084fc', 400, 30); shock(F.x, F.y, '#ffffff', 200, 20); G.flashT = 10; SFX.power();
    banner('SECRET EXIT FOUND', 'RIFT ' + n + ' OF ' + RIFTS.length, false); SAVE.cores += 300; R.cores += 300;
    if (n === 3) toast('SECRET UNLOCKED', 'A strange new challenge waits in Select Mode...', '#c084fc');
    if (n === 3) SAVE.unl.retro = 1;
    saveGame(); R.secretExit = 1; G.ent.eb.length = 0; toClear(R);
  }
}
function drawRift(g, t) {
  const R = G.run, F = R && R.rift; if (!F) return; if (!(F.t % 90 < 60 || F.hp < 14)) return;
  const a = .55 + Math.sin(t * .4) * .25, k = 1 - F.hp / 14 * .4;
  g.save(); g.translate(F.x, F.y); g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, 60 * k + 20, '#a855f7', a);
  g.strokeStyle = 'rgba(233,213,255,' + a.toFixed(2) + ')'; g.lineWidth = 3; g.beginPath(); let y = -38; g.moveTo(0, y); while (y < 38) { y += 9; g.lineTo((Math.random() - .5) * 16 * k, y); } g.stroke(); g.restore();
}

// ---- boss gallery rematches ----
const GMODS = {
  hp2: { nm: 'DOUBLE HEALTH', ds: 'The boss has twice the health', m: .6 },
  fury: { nm: 'FURY', ds: 'Boss shots hit 50% harder', m: .5 },
  escort: { nm: 'ESCORTS', ds: 'Enemies keep warping in during the fight', m: .5 },
  noab: { nm: 'NO ABILITIES', ds: 'No ability and no super', m: .4 },
  glass: { nm: 'ONE HIT', ds: 'A single hit destroys you', m: 1.5 }
};
const bossBeaten = w => !!((prog(w).done[0] || [])[LV - 1]) || SAVE.wu > w + 1;
function galleryMult(mods) { return 1 + (mods || []).reduce((a, k) => a + (GMODS[k] ? GMODS[k].m : 0), 0); }
function startGallery(w, mods) { const o = { mode: 'expedition', var: 'gallery', w, lv: 12, tier: 1, co: SAVE.players === 2, mods: (mods || []).slice() }; G.last = o; beginRun(o); }
function setupGallery(R, o) {
  const sp = R.spec, M = R.gmods = o.mods || []; sp.type = 'B'; sp.waves = R.waves = 0; sp.name = 'Rematch: ' + BOSSES[R.w].nm; R.hazMode = false; R.skipToBoss = 1;
  if (M.indexOf('hp2') >= 0) R.bmul = 2;
  if (M.indexOf('fury') >= 0) R.edm *= 1.5;
  if (M.indexOf('noab') >= 0) G.players.forEach(p => { p.abCd = p.abMax = 1e9; p.noSup = 1; });
  if (M.indexOf('glass') >= 0) G.players.forEach(p => { p.mhp = p.hp = 1; p.msh = p.sh = 0; });
}
function galleryTick(R) {
  if (R.var !== 'gallery' || R.stage !== 'boss' || !R.boss || R.gmods.indexOf('escort') < 0) return;
  if (R.st % 300 === 150) { const ro = WORLDS[R.w].ro; for (let i = 0; i < 3; i++) { const e = mkEnemy(pick(ro), V.W + 60 + i * 40, V.H * (.2 + i * .3)); e.minion = true; } }
}
function galleryFinish(R, win, d) {
  const mult = galleryMult(R.gmods), hi = SAVE.hi.gal || (SAVE.hi.gal = {}); d.name = 'Rematch: ' + BOSSES[R.w].nm;
  d.bonus = win ? Math.round((250 + 110 * R.w) * mult) : 0;
  if (win && !R.assist) { const cur = hi[R.w] || {}, sc = R.gmods.length; if (!cur.t || d.time < cur.t || sc > (cur.m | 0)) { hi[R.w] = { t: !cur.t || d.time < cur.t ? d.time : cur.t, m: Math.max(sc, cur.m | 0) }; d.best = true; } if (sc >= 4) SAVE.flags.gal4 = 1; }
}

// ---- 1-UP: the retro world (found through the rifts) ----
function setupRetro(R) { const sp = R.spec; sp.type = 'B'; sp.waves = R.waves = 4; sp.name = '1-UP: Retro Run'; R.hazMode = false; R.hpm = Math.max(R.hpm, 1.3); R.lootM = 2; G.retro = 1; document.body.classList.add('retro'); layout(); }
function retroOff() { if (!G.retro) return; G.retro = 0; document.body.classList.remove('retro'); layout(); }

// ---- hardcore: one life, random sectors, carry everything forward ----
function setupHardcore(R) {
  R.hc = { sect: 1, bosses: 0 }; R.hpm = 1.2; R.edm = 1.25; R.w = G.world = hcWorld(); R.lootM = 1.25;
  G.players.forEach(p => { p.hcOne = 1; });
}
function hcWorld() { const n = Math.max(1, Math.min(SAVE.wu, WORLDS.length)); let w = Math.floor(Math.random() * n); if (w === GLITCH_W && n > 1) w = 0; return w; }
function hcWave(R) { // called at the start of each hardcore wave; returns true if it took over
  if (R.wave > 0 && R.wave % 10 === 0) { R.stage = 'boss'; R.st = 0; R.mini = true; R.bmul = 1 + R.wave * .02; return true; }
  if (R.wave > 0 && R.wave % 5 === 0) { R.hc.sect++; R.w = G.world = hcWorld(); buildBackdrop(R.w); music.w = R.w; banner('SECTOR ' + R.hc.sect, WORLDS[R.w].nm.toUpperCase(), false); }
  R.hpm = 1.2 + R.wave * .1; R.edm = 1.25 + R.wave * .03; return false;
}
function hcFinish(R, win, d) {
  d.name = 'Hardcore'; d.bonus = R.wave * 30 + (R.bossDown | 0) * 350; d.hcWave = R.wave; const hc = SAVE.hi.hc || (SAVE.hi.hc = { wave: 0, score: 0 });
  if (!R.assist) { if (R.wave > hc.wave) { hc.wave = R.wave; d.best = true; } hc.score = Math.max(hc.score, Math.round(R.score)); }
}
function routeWorld(R) { riftTick(R); logTick(R); rivalTick(R); vexAllyTick(R); linkTick(); versusTick(R); ghostTick(R); corruptTick(R); if (R.var === 'gallery') galleryTick(R); }

// ================= RUN: HUD, level director, modes, results, tutorial, update + render =================
let alT = 0, r3err = 0;
function banner(t, s, boss) { const b = $('banner'); b.className = boss ? 'boss' : ''; b.querySelector('.t').textContent = t; b.querySelector('.s').textContent = s || ''; void b.offsetWidth; b.classList.add('show'); }
function clearMsgs() { const b = $('banner'); b.classList.remove('show'); b.style.opacity = 0; clearTimeout(alT); $('alert').style.opacity = 0; void b.offsetWidth; b.style.opacity = ''; }
function alertMsg(t) { const a = $('alert'); a.textContent = t; a.style.opacity = 1; clearTimeout(alT); alT = setTimeout(() => { a.style.opacity = 0; }, 1500); }

// ---------- HUD ----------
const IC = {
  hull: '<svg viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2.2" stroke-linejoin="round"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/></svg>',
  sh: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
  am: '<svg viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" stroke-width="2.2" stroke-linejoin="round"><path d="M8 3h8l3 5-7 13L5 8z"/></svg>',
  ab: '<svg viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2.2" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>'
};
function hudPanel(p) {
  const row = (k, c, id, ic) => '<div class="rw">' + ic + '<div class="bar" id="b' + k + p.id + '"><i style="--c:' + c + '"></i></div><b id="t' + k + p.id + '"></b></div>';
  return '<div class="nm"><span>PILOT ' + (p.id + 1) + '</span><em id="hw' + p.id + '"></em></div>' + row('h', '#fb7185', '', IC.hull) + row('s', '#38bdf8', '', IC.sh) + row('a', '#2dd4bf', '', IC.am) + row('b', '#fde047', '', IC.ab) + row('u', '#e879f9', '', IC.ab);
}
function buildHud() {
  const h = $('hud'); h.classList.add('on'); h.classList.toggle('coop', G.players.length > 1); h.classList.toggle('p4', G.players.length > 2); for (let i = 2; i < 4; i++) { const e = $('hp' + i); if (e) { e.innerHTML = ''; e.style.display = 'none'; } }
  G.players.forEach((p, i) => { const e = $('hp' + i); if (e) { e.innerHTML = hudPanel(p); if (i > 1) e.style.display = 'block'; } p._hc = {}; });
  $('boss').classList.remove('on'); $('stn').style.display = G.run && G.run.stn ? 'block' : 'none';
}
function setW(id, v, txt) {
  const el = $(id); if (!el) return; const i = el.firstChild; if (i) { const w = clamp(v, 0, 1) * 100; i.style.width = w + '%'; } el.classList.toggle('lo', v < .3);
}
function hudTick() {
  const R = G.run; if (!R) return;
  for (const p of G.players) {
    const c = p._hc, i = p.id, hv = Math.round(p.hp), sv = Math.round(p.sh), av = Math.round(p.am), lv = wlvOf(p.pl, p.wpn), ev = wevOf(p.pl, p.wpn), wk = p.wpn + lv + (ev ? 'E' : '') + (p.od > 0 ? '!' : '') + (p.alive ? '' : 'x');
    if (c.h !== hv) { c.h = hv; setW('bh' + i, p.hp / p.mhp); $('th' + i).textContent = hv; }
    if (c.s !== sv) { c.s = sv; setW('bs' + i, p.msh ? p.sh / p.msh : 0); $('ts' + i).textContent = sv; }
    if (c.a !== av) { c.a = av; setW('ba' + i, p.am / p.mam); $('ta' + i).textContent = p.am < WPN[p.wpn].am ? 'AUX' : av; }
    if (c.w !== wk) { c.w = wk; $('hw' + i).textContent = (p.alive ? wName(p.pl, p.wpn).toUpperCase() + (ev || !lv ? '' : ' LV' + (lv + 1)) : 'DOWN') + (p.od > 0 ? ' x1.5' : ''); }
    const abv = p.abCd > 0 ? Math.ceil(p.abCd / 60) : 0, af = p.abMax ? Math.round((1 - p.abCd / p.abMax) * 40) : 40, ak = af + '/' + abv + (p.alive ? '' : 'x');
    if (c.b !== ak) { c.b = ak; const bb = $('bb' + i), tb = $('tb' + i); if (bb && bb.firstChild) { bb.firstChild.style.width = (p.alive ? af / 40 * 100 : 0) + '%'; bb.classList.toggle('rdy', p.alive && !abv); } if (tb) tb.textContent = !p.alive ? '-' : abv ? abv + 's' : 'READY'; }
    const su = p.alive ? Math.floor(p.supT > 0 ? 0 : p.sup || 0) : -1; if (c.u !== su) { c.u = su; setW('bu' + i, Math.max(0, su) / 100); const tu = $('tu' + i), bu = $('bu' + i); if (tu) tu.textContent = su < 0 ? '-' : su >= 100 ? 'SUPER!' : su + '%'; if (bu) bu.classList.toggle('rdy', su >= 100); }
  }
  { const ts = $('tsup'), p0 = G.players[0]; if (ts && p0) ts.classList.toggle('rdy', p0.alive && p0.sup >= 100); }
  const sc = String(Math.round(R.score)); if (R._sc !== sc) { R._sc = sc; $('score').textContent = sc; }
  const cr = String(SAVE.cores); if (R._cr !== cr) { R._cr = cr; $('cores').textContent = cr; }
  const cb = R.combo > 1 ? 'x' + (1 + Math.min(R.combo, 20) * .1).toFixed(1) + ' COMBO' : ''; if (R._cb !== cb) { R._cb = cb; $('combo').textContent = cb; }
  const ob = objText(R); if (R._ob !== ob) { R._ob = ob; $('obj').textContent = ob; }
  if (R.stn) { const sn = R.stn, k = Math.round(sn.hp) + ':' + Math.round(sn.sh); if (R._sk !== k) { R._sk = k; $('stnH').style.width = sn.hp / sn.mhp * 100 + '%'; $('stnS').style.width = sn.sh / sn.msh * 100 + '%'; $('stnT').textContent = 'STATION ' + Math.round(sn.hp / sn.mhp * 100) + '%'; } }
  const gz = R.graze ? 'GRAZE ' + R.graze : ''; if (R._gz !== gz) { R._gz = gz; $('graze').textContent = gz; }
  const tbt = $('tab'), p0 = G.players[0]; if (tbt && p0) { const f = p0.abMax ? 1 - p0.abCd / p0.abMax : 1, k = (p0.alive ? Math.round(f * 36) : 0) + (p0.abCd > 0 ? '' : 'r'); if (tbt._k !== k) { tbt._k = k; tbt.style.setProperty('--cd', (360 - Math.round(f * 360)) + 'deg'); tbt.classList.toggle('rdy', p0.alive && p0.abCd <= 0); } }
  const b = R.boss; if (b && !b.dead) { const pd = b.pods ? podOf(b) : null; $('boss').classList.add('on'); $('bossN').textContent = BOSSES[b.bi].nm.toUpperCase() + (b.stg > 0 ? ' - EXPOSED!' : pd ? ' - ARMORED' : ''); $('bossF').style.width = clamp(b.hp / b.mhp, 0, 1) * 100 + '%'; const sp = pd && b.st === 1; $('bossPb').style.display = sp ? 'block' : 'none'; if (sp) $('bossP').style.width = clamp(pd.hp / pd.mhp, 0, 1) * 100 + '%'; } else $('boss').classList.remove('on');
}
function objText(R) {
  const m = R.mode; if (R.var) return varObj(R); if (m === 'expedition' && R.spec && ALT_INFO[R.spec.type] && R.stage !== 'boss') return ALT_INFO[R.spec.type].nm + ' - WAVE ' + Math.min(R.wave + 1, R.waves) + '/' + R.waves; if (m === 'defense') return 'STATION DEFENSE - WAVE ' + Math.min(R.wave + 1, R.waves) + '/' + R.waves + (R.assist ? ' - ASSIST' : '');
  if (m === 'expedition') return R.stage === 'boss' ? 'BOSS FIGHT' : (R.spec ? (R.spec.type === 'h' ? 'HAZARD ZONE' : R.spec.type === 'e' ? 'ELITE AMBUSH' : R.spec.type === 's' ? 'SUPPLY RUN' : 'SECTOR') : '') + ' - WAVE ' + Math.min(R.wave + 1, R.waves) + '/' + R.waves;
  if (m === 'endless') return (G.mapX ? G.mapX.nm.toUpperCase() : 'ENDLESS') + ' - WAVE ' + (R.wave + 1) + (G.mapX ? '' : ' - ' + WORLDS[R.w].nm.toUpperCase());
  if (m === 'blitz') return 'BLITZ - ' + Math.max(0, Math.ceil(R.time)) + 's';
  if (m === 'rush') return 'BOSS RUSH - ' + Math.min(R.ri + 1, R.rush.length) + '/' + R.rush.length;
  if (m === 'training') return 'TRAINING - ' + WORLDS[R.w].nm.toUpperCase();
  if (m === 'tutorial') return 'FLIGHT SCHOOL';
  return '';
}

// ---------- run setup ----------
function beginRun(o) {
  if (!G.net && NET.code) netLeaveRoom(); retroOff(); crashOff(); BOSSES.length = BASE_BOSSES; if (music.jbx >= 0) jbStop(); G.mapX = o.map ? MAPS.find(m => m.k === o.map) || null : (o.mode === 'expedition' && (o.w | 0) === GLITCH_W) ? glitchMap(o.lv) : null;
  audio(); if (UI.hideAll) UI.hideAll(); clearMsgs();
  const co = !!o.co && o.mode !== 'tutorial'; G.coop = co; G.mode = o.mode; G.world = (o.w | 0) % WORLDS.length;
  const R = G.run = { mode: o.mode, w: G.world, lv: o.lv | 0, tier: o.tier || 1, diff: 1, hpm: 1, edm: 1, stage: 'intro', st: 0, wave: 0, waves: 4, q: [], kills: 0, score: 0, cores: 0, hurt: 0, combo: 0, comboT: 0, boss: null, time: 0, hazMode: false, nodmg: false, freeAmmo: false, blitz: false, tut: null, over: false, bossDown: 0, spec: null, gap: 0, t0: G.t, rush: null, ri: 0, graze: 0, maxCombo: 0, esc: 0, gzT: 0, var: o.var || null, assist: !!o.assist, rng: null, swarm: 1, ammoDrop: 1, bmul: 1, stn: null, lastSrc: null, low: undefined, dinfo: null };
  G.players = [mkPlayer(0)]; if (co) G.players.push(mkPlayer(1)); for (let i = 2; i < (G.net ? G.netN | 0 : 0); i++) G.players.push(mkPlayer(i));
  G.players.forEach(p => { p.x = 150; p.y = V.H / 2 + (co ? (p.id ? 80 : -80) : 0); });
  G.ent = { en: [], pb: [], eb: [], pk: [], pa: [], fl: [], bm: [], hz: [] }; G.freeze = 0; G.shake = 0; G.hitT = 0; G.ts = 1; G.paused = false; G.god = false; G.pick = null; G.abTs = 0; G.slowUntil = 0; IN.ab = [0, 0];
  if (o.mode === 'expedition') { const sp = R.spec = levelSpec(R.w, R.lv, R.tier, o.alt); R.diff = sp.diff; R.waves = sp.waves; R.hazMode = sp.type === 'h'; R.hpm = sp.diff; R.edm = 1.15 + R.w * .055 + R.lv * .012 + (R.tier - 1) * .18; R.bhm = 1.6 + R.w * .02; R.alt = sp.alt; applyRoute(R); }
  if (R.mode === 'expedition' && !o.var && R.tier > 1) R.remix = R.tier;
  if (R.mode === 'expedition' && !o.var && !G.net && (o.lv | 0) === 0 && SET.brief !== 'off') { R.brief = 1; if (SET.brief === 'always' || !(SAVE.flags.brief && SAVE.flags.brief[R.w])) { G.brief = 1; setTimeout(() => { if (G.brief) UI.show('scBrief'); }, 30); } }
  if (R.mode === 'expedition' && !o.var && SAVE.devAll && R.spec && R.spec.type === 'B') R.skipToBoss = 1; // dev: boss sectors jump straight to the boss
  else if (o.mode === 'endless') { R.hpm = 1; R.edm = 1; R.waves = 1e9; }
  else if (o.mode === 'rush') { R.rush = []; for (let i = 0; i < Math.min(WORLDS.length, SAVE.wu); i++) R.rush.push(i); R.waves = 0; R.hpm = 1.1; R.edm = 1.15; }
  else if (o.mode === 'blitz') { R.blitz = true; R.freeAmmo = true; R.time = 90; R.waves = 1e9; R.hpm = 1; R.edm = .9; }
  else if (o.mode === 'training') { R.nodmg = true; R.freeAmmo = true; R.waves = 1e9; R.hpm = .8; R.edm = .6; }
  else if (o.mode === 'defense') { R.waves = 10; R.hpm = 1; R.edm = 1; R.stn = mkStation(); R.bmul = .8; }
  else if (o.mode === 'tutorial') { R.waves = 0; R.freeAmmo = false; R.hpm = .6; R.edm = .5; R.tut = { step: -1, picked: {}, moved: 0, kills0: 0, lx: 0, ly: 0, t: 0, ok: false, rammed: false }; G.world = 0; R.w = 0; }
  if (o.var) setupVariant(R, o); if (o.assist) applyAssist(); ghostStart(R); corruptSetup(R);
  if (R3) { R3.reset(); G.players.forEach(p => R3.repair(p)); R3.setView('play'); }
  G.scene = 'play'; G.inCombat = true; G.view = 'play'; buildHud(); buildTouch(); buildBackdrop(G.world); layoutHl(); music.start(G.world, false);
  document.body.classList.add('lb'); setTimeout(() => document.body.classList.remove('lb'), 1200);
  hudTick();
}
function introBanner(R) {
  if (R.var) varBanner(R);
  else if (R.mode === 'defense') banner('STATION DEFENSE', 'DO NOT LET THEM THROUGH');
  else if (R.mode === 'expedition') banner(R.spec.name.toUpperCase(), 'WORLD ' + (R.w + 1) + ' - ' + WORLDS[R.w].nm.toUpperCase() + (R.tier > 1 ? ' - TIER ' + R.tier + ' REMIX: ' + (R.tier === 2 ? 'CROSSFIRE' : 'NIGHTMARE') : ''), R.spec.type === 'B');
  else if (R.mode === 'endless') banner(G.mapX ? G.mapX.nm.toUpperCase() : 'ENDLESS', G.mapX ? 'EXTRA MAP - HOW LONG CAN YOU HOLD?' : 'HOW LONG CAN YOU HOLD?');
  else if (R.mode === 'blitz') banner('BLITZ', '90 SECONDS. UNLIMITED PLASMA.');
  else if (R.mode === 'rush') banner('BOSS RUSH', R.rush.length + ' BOSSES');
  else if (R.mode === 'training') banner('TRAINING', 'NO DAMAGE. TRY EVERYTHING.');
  else if (R.mode === 'tutorial') banner('FLIGHT SCHOOL', 'LEARN THE BASICS');
}

// ---------- wave generation ----------
function formation(q, id, n, t0) {
  const Hh = V.H, type = pick(['line', 'column', 'vee', 'stagger', 'line']), y0 = rnd(110, Hh - 110), cn = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    let y = y0, dt = 0, dx = 0;
    if (type === 'line') dt = i * 36;
    else if (type === 'column') { y = Hh * (.18 + .64 * (n === 1 ? .5 : i / (n - 1))); dt = i * 4; }
    else if (type === 'vee') { y = clamp(y0 + (i - cn) * 56, 80, Hh - 80); dx = Math.abs(i - cn) * 46; dt = Math.abs(i - cn) * 18; }
    else { y = i % 2 ? Hh * .3 : Hh * .7; dt = i * 30; }
    q.push({ t: t0 + dt, id, y, dx });
  }
}
function genWave(R) { if (!R.rng) return genWave0(R); const old = RF; RF = R.rng; try { genWave0(R); } finally { RF = old; } }
function genWave0(R) {
  if (R.cust) return customWave(R);
  const w = R.w, lv = R.lv, wave = R.wave, q = []; let ro, budget, t = 20;
  if (R.mode === 'expedition') { ro = rosterFor(w, lv); budget = 5.5 + lv * 1.05 + w * .6 + wave * 1.3; if (R.spec.type === 's') budget *= .6; }
  else if (R.mode === 'endless') { ro = WORLDS[w].ro.slice(0, Math.min(4, 2 + (wave / 3 | 0))); budget = 5 + wave * 1.5; }
  else if (R.mode === 'blitz') { ro = WORLDS[w].ro.slice(0, 3); budget = 7 + (R.wave) * 1.1; }
  else if (R.mode === 'defense') { ro = WORLDS[w].ro.slice(0, Math.min(4, 2 + (wave / 2 | 0))); budget = 5 + wave * 1.7; }
  else { ro = WORLDS[w].ro; budget = 4; }
  if (R.var === 'vault') ro = WORLDS[w].ro.concat(WORLDS[(w + 3) % WORLDS.length].ro.slice(0, 2));
  if (R.remix) { const ow = (w + 4 + R.remix * 2) % WORLDS.length; ro = ro.concat(WORLDS[ow].ro.slice(0, R.remix === 2 ? 1 : 2)); budget *= 1 + .08 * (R.remix - 1); }
  budget *= R.swarm || 1;
  const elite = (R.mode === 'expedition' && (R.spec.type === 'e' || R.spec.type === 'x') && (wave === 1 || wave === R.waves - 1)) || (R.mode === 'endless' && wave % 5 === 4) || ((R.var === 'daily' || R.var === 'vault') && (wave === 2 || wave === 4)) || (R.mode === 'defense' && wave % 4 === 3) || (R.remix && R.mode === 'expedition' && R.spec.type !== 's' && R.spec.type !== 'B' && (wave === 2 || (R.remix === 3 && wave === 3)));
  if (elite) { q.push({ t: 60, id: R.remix === 3 && wave % 2 === 1 ? WORLDS[(w + 7) % WORLDS.length].el : WORLDS[w].el, y: V.H / 2, dx: 0 }); budget -= 4; }
  let guard = 0;
  while (budget > .5 && guard++ < 12) {
    const id = pick(ro), c = Math.max(1, EN[id].cost), n = Math.max(1, Math.min(8, Math.round(rnd(2.6, 5.4) / c * (c === 1 ? 1.3 : 1))));
    formation(q, id, n, t); budget -= n * c; t += rnd(80, 170);
  }
  R.q = q.sort((a, b) => a.t - b.t); R.st = 0;
}
function startWave(R) {
  if (R.mode === 'defense') { if (R.wave >= R.waves) { R.stage = 'boss'; R.st = 0; R.mini = false; return; } R.hpm = 1 + R.wave * .08; R.edm = 1 + R.wave * .03; if (R.wave > 0) stnRepair(R); }
  if (R.var === 'hardcore' && hcWave(R)) return;
  if (R.mode === 'endless' && R.var !== 'hardcore' && R.wave > 0 && R.wave % 10 === 0) { R.stage = 'boss'; R.st = 0; R.mini = true; return; }
  if (R.mode === 'endless' && R.var !== 'hardcore' && R.wave > 0 && R.wave % 8 === 0) { R.w = (R.w + 1) % WORLDS.length; G.world = R.w; buildBackdrop(R.w); banner(WORLDS[R.w].nm.toUpperCase(), 'NEW SECTOR', false); music.w = R.w; }
  if (R.mode === 'endless' && R.var !== 'hardcore') { R.hpm = 1 + R.wave * .09 + R.w * .12; R.edm = 1 + R.wave * .025; }
  genWave(R); if (R.mode !== 'blitz' && R.mode !== 'training' && R.wave > 0) alertMsg('WAVE ' + (R.wave + 1)); eventRoll(R);
}
function stepRun(R) {
  R.st++; if (R.stn) updStation(R); if (R.mode !== 'tutorial') { combatWorld(R); routeWorld(R); }
  if (R.var !== 'versus' && R.stage !== 'dead' && R.stage !== 'clear' && !alive().length && !G.players.some(p => p.rest > 0 && alive().length)) { R.stage = 'dead'; R.st = 0; banner('SHIP LOST', ''); music.stop(); }
  if (R.mode === 'tutorial') return tutTick(R);
  switch (R.stage) {
    case 'intro': if (R.st === 1) introBanner(R); if (R.st > 130) { R.stage = R.mode === 'rush' || R.skipToBoss ? 'boss' : 'wave'; R.st = 0; if (R.stage === 'wave') startWave(R); } break;
    case 'wave': {
      const live = G.ent.en.filter(e => !e.dead && !e.boss && e.id !== 'rock').length, cap = 7 + Math.min(5, R.lv / 2 | 0) + (R.mode === 'blitz' ? 4 : 0) + (G.players.length > 1 ? 2 : 0);
      let sp = live; while (R.q.length && R.q[0].t <= R.st && sp < cap) { const s = R.q.shift(), ne = mkEnemy(s.id, V.W + 70 + (s.dx || 0), s.y); if (R.var === 'vault') ne.gold = 1; else goldRoll(corruptSpawn(ne, R), R); sp++; }
      if (R.blitz) { R.time -= 1 / 60; if (R.time <= 0) { finishRun(true); return; } if (!R.q.length && live < 5) { R.wave++; genWave(R); } return; }
      if (R.mode === 'training') { if (!R.q.length && live < 3) { R.wave++; genWave(R); } return; }
      if (!R.q.length && live === 0) { if (++R.gap > 50) { R.gap = 0; R.wave++; if (R.mode === 'expedition' && R.wave >= R.waves) { if (R.spec.type === 'B') { nextStage(R, 'boss'); } else { toClear(R); } } else nextStage(R, 'wave'); } } else R.gap = 0;
      break;
    }
    case 'boss':
      if (R.st === 1) { const wi = R.mode === 'rush' ? R.rush[R.ri] : R.bossW !== undefined ? R.bossW : R.w; if (R.mode === 'rush') { R.w = wi; G.world = wi; buildBackdrop(wi); } const nb = spawnBoss(wi, R.mini ? .55 * (R.var === 'hardcore' ? R.bmul * 1.6 : 1) : (R.bmul || 1)); if (R.var === 'vault') nb.gold = 1; }
      if (R.st > 5 && !R.boss) {
        if (R.mode === 'rush') { R.ri++; if (R.ri >= R.rush.length) { toClear(R); } else { R.stage = 'heal'; R.st = 0; banner('BOSS DOWN', 'REPAIRING...'); if (SET.cards !== false) offerCards(); G.players.forEach(p => { if (p.alive) { p.hp = Math.min(p.mhp, p.hp + p.mhp * .4); p.sh = p.msh; } else { revive(p); } }); } }
        else if (R.mini) { R.mini = false; R.wave++; banner('MINI-BOSS DOWN', ''); nextStage(R, 'wave', true); }
        else toClear(R);
      }
      break;
    case 'heal': if (R.st > 200) { R.stage = 'boss'; R.st = 0; } break;
    case 'cards': if (!G.pick) { R.stage = R.nxt; R.st = 0; if (R.stage === 'wave') startWave(R); } break;
    case 'clear': if (R.st === 1) { banner('SECTOR CLEARED', 'COLLECT YOUR SPOILS'); SFX.clear(); music.stop(); } if (R.st > 210) finishRun(true); break;
    case 'dead': if (R.st > 110) finishRun(false); break;
  }
}
function toClear(R) { R.stage = 'clear'; R.st = 0; }
function nextStage(R, st, force) { if (cardsDue(R, st, force) && offerCards()) { R.stage = 'cards'; R.nxt = st; R.st = 0; return; } R.stage = st; R.st = 0; if (st === 'wave') startWave(R); }

// ---------- results ----------
function finishRun(win) {
  const R = G.run; if (!R || R.over) return; R.over = true; G.inCombat = false; if (G.netHost) netSendEnd(R, win); $('touch').classList.remove('on'); music.stop();
  const tot = G.players.reduce((a, p) => a + p.mhp, 0), stars = win ? (R.hurt < tot * .25 ? 3 : R.hurt < tot * .75 ? 2 : 1) : 0;
  const rk0 = rankFor(R, win), rk = R.assist && (rk0 === 'S' || rk0 === 'A') ? 'B' : rk0, d = { rank: rk, assist: !!R.assist, killer: R.lastSrc || 'b', hadBoss: !!R.boss, graze: R.graze, maxCombo: R.maxCombo, win, mode: R.var || R.mode, base: R.mode, score: Math.round(R.score), kills: R.kills, cores: R.cores, stars, bonus: 0, w: R.w, lv: R.lv, tier: R.tier, wave: R.wave, time: Math.round((G.t - R.t0) / 60), best: false, next: null, unlockW: -1, name: R.spec ? R.spec.name : '' };
  if (R.mode === 'expedition' && !R.var && win) {
    const sp = R.spec, pr = prog(R.w); d.bonus = Math.round((40 + 18 * R.lv + 50 * R.w) * (1 + .15 * (stars - 1)) * R.tier + (sp.type === 'B' ? BOSSES[R.w].rew / 3 : 0));
    d.bonus = Math.round(d.bonus * (1 + RANKB[rk])); pr.rk = pr.rk || {}; const rkey = (R.tier - 1) + ':' + R.lv, RO = { C: 0, B: 1, A: 2, S: 3 }; if (!pr.rk[rkey] || RO[rk] > RO[pr.rk[rkey]]) pr.rk[rkey] = rk;
    const firstClear = !((pr.done[R.tier - 1] || [])[R.lv]);
    if (R.tier > 1) { d.bonus = Math.round(d.bonus * (1 + .25 * (R.tier - 1))); if (firstClear) { d.remix = Math.round(120 * R.tier * (1 + R.lv * .22) + (sp.type === 'B' ? 1500 * (R.tier - 1) : 0)); d.bonus += d.remix; } }
    const arr = pr.done[R.tier - 1] || (pr.done[R.tier - 1] = []); arr[R.lv] = Math.max(arr[R.lv] || 0, stars);
    if (R.alt) { const af = SAVE.flags.alt || (SAVE.flags.alt = {}), ak = altKey(R.w, R.lv, R.tier); af[ak] = Math.max(af[ak] | 0, stars); d.bonus = Math.round(d.bonus * 1.3); d.alt = 1; }
    if (R.secretExit) d.secret = 1;
    if (sp.type === 'B') { if (R.w + 1 < WORLDS.length && SAVE.wu < R.w + 2) { SAVE.wu = R.w + 2; d.unlockW = R.w + 1; } if (pr.t < 3 && R.tier === pr.t) pr.t++; }
    d.next = R.lv + 1 < LV ? R.lv + 1 : null;
  } else if (R.var) variantFinish(R, win, d);
  else if (R.mode === 'defense') defenseFinish(R, win, d);
  else if (R.mode === 'endless') { if (G.mapX) { const hm = SAVE.hi.maps || (SAVE.hi.maps = {}); if (R.score > (hm[G.mapX.k] || 0)) hm[G.mapX.k] = Math.round(R.score); } d.bonus = R.wave * 12; if (R.score > SAVE.hi.endless.score) { SAVE.hi.endless.score = Math.round(R.score); d.best = true; } SAVE.hi.endless.wave = Math.max(SAVE.hi.endless.wave, R.wave); }
  else if (R.mode === 'blitz') { d.bonus = Math.round(R.score / 40); if (R.score > SAVE.hi.blitz.score) { SAVE.hi.blitz.score = Math.round(R.score); d.best = true; } }
  else if (R.mode === 'rush') { d.bonus = win ? 800 : R.ri * 150; const sec = d.time; if (win && (!SAVE.hi.rush.time || sec < SAVE.hi.rush.time)) { SAVE.hi.rush.time = sec; d.best = true; } SAVE.hi.rush.boss = Math.max(SAVE.hi.rush.boss, R.ri + (win ? 0 : 0)); }
  if (R.assist) d.bonus = Math.round(d.bonus * .6);
  afterRun(R, win, d); try { progAfter(R, win, d); } catch (e) { console.error('prog', e); }
  const endDue = win && R.mode === 'expedition' && !R.var && R.spec && R.spec.type === 'B' && R.w === 14, showEnd = endDue && SET.story !== 'off' && (SET.story === 'always' || !SAVE.flags.ending);
  if (endDue) { SAVE.flags.ending = 1; d.ending = 1; }
  const crashDue = win && R.mode === 'expedition' && !R.var && R.spec && R.spec.type === 'B' && R.w === GLITCH_W && !SAVE.flags.crash;
  const tDue = win && R.mode === 'expedition' && !R.var && R.spec && R.spec.type === 'B' && R.w === 16, showTrue = tDue && SET.story !== 'off' && (SET.story === 'always' || !SAVE.flags.trueEnd);
  if (tDue) { SAVE.flags.trueEnd = 1; d.ending = 1; }
  SAVE.cores += d.bonus; SAVE.st.kills += R.kills; SAVE.st.runs++; SAVE.st.graze += R.graze; SAVE.st.combo = Math.max(SAVE.st.combo, R.maxCombo); if (win && (R.mode === 'expedition' || R.mode === 'rush')) SAVE.st.ranks[rk]++; saveGame();
  const go = () => UI.result(d);
  if (showEnd) setTimeout(() => playCut(endingPanels(), go, { music: 14 }), 600); else if (showTrue) setTimeout(() => playCut(TRUE_END(!!ST().ally), go, { music: 16 }), 600); else if (crashDue) setTimeout(() => crashIntro(() => { UI.hideAll(); startCrash(); }), 900); else setTimeout(go, win ? 300 : 100);
}
function exitToMenu(to) {
  G.mapX = null; retroOff(); crashOff(); BOSSES.length = BASE_BOSSES;
  G.pick = null; G.abTs = 0; G.slowUntil = 0; IN.ab = [0, 0]; clearMsgs(); document.body.classList.remove('lb'); G.inCombat = false; G.scene = 'ui'; G.paused = false; G.run = null; G.players = []; G.ent = { en: [], pb: [], eb: [], pk: [], pa: [], fl: [], bm: [], hz: [] }; $('hud').classList.remove('on'); $('touch').classList.remove('on'); $('coach').classList.remove('on'); $('hl').style.display = 'none'; $('boss').classList.remove('on');
  music.stop(); if (R3) { R3.reset(); R3.setView('menu'); } G.showCfg = null; saveGame(); UI.show(to || 'scMenu');
}
function togglePause() { if (G.net) { netPauseKey(); return; } if (!G.inCombat || !G.run || G.run.over || G.pick || G.cut || G.brief) return; G.paused = !G.paused; if (G.paused) { UI.pause(); SFX.click(); } else UI.resume(); }

// ---------- tutorial ----------
const TUT = [
  { t: 'WELCOME, PILOT', x: () => 'This is a 2-minute flight briefing. You can leave any time with SKIP.', btn: 1 },
  { t: 'MOVE', x: () => touchOn() ? (SET.scheme === 'stick' ? 'Use the LEFT STICK to fly. Fly around to continue.' : 'Drag your finger anywhere - the ship follows. Fly around to continue.') : 'Fly with WASD or the ARROW KEYS, or just move the MOUSE. Fly around to continue.' },
  { t: 'SHOOT', x: () => (touchOn() ? (SET.scheme === 'stick' ? 'Hold the red FIRE button' : 'Keep your finger down - the ship fires while you touch') : 'Hold SPACE or click and hold') + ' to shoot. Destroy the 3 target drones!', hl: '#hp0 .rw:nth-of-type(4)' },
  { t: 'PLASMA (YOUR AMMO)', x: () => 'Every shot burns PLASMA (the teal bar). At zero you only get a weak backup blaster. Enemies drop teal PLASMA CELLS - capsules inside a spinning bracket. Grab them!', hl: '#hp0 .rw:nth-of-type(4)' },
  { t: 'ENEMY FIRE', x: () => 'Glowing RED orbs with a dark core are ENEMY shots - they hurt. Your real hitbox is tiny, so weave between them. Destroy the 2 gunships.', hl: '#hp0 .rw:nth-of-type(2)' },
  { t: 'PICKUPS', x: () => 'Green cross = REPAIR hull. Blue shield = SHIELD. Gold hex = CORES (money). Orange bolt = OVERDRIVE (+50% damage). Collect all four.' },
  { t: 'RAMMING', x: () => 'Crash into a normal enemy and it explodes - but you take damage too. Shields soak it first. Ram the drone to see (or dodge it!).' },
  { t: 'WEAPONS', x: () => (touchOn() ? 'Tap GUN' : 'Press Q / E (or 1-6)') + ' to cycle weapons you own. Buy new guns in the SHOP and equip your favorite there.' },
  { t: 'YOUR ABILITY', x: () => 'Every hull has a special ABILITY on a cooldown - the yellow bar. Yours is ' + abilOf(G.players[0]).nm + ': ' + abilOf(G.players[0]).ds.toLowerCase() + ' ' + (touchOn() ? 'Tap the ABILITY button now.' : 'Press SHIFT or R now.'), hl: '#hp0 .rw:nth-of-type(5)' },
  { t: 'YOUR HOME BASE', x: () => 'After missions: SHOP = upgrades (each costs more than the last), HANGAR = custom ship parts and paint, EXPEDITION = 15 worlds. Tap PLAYERS for 2-player co-op.', btn: 1, last: 1 }
];
function coachShow(i) {
  const c = $('coach'), s = TUT[i]; c.classList.add('on');
  c.innerHTML = '<div class="ct"><span>' + s.t + '</span><span>' + (i + 1) + '/' + TUT.length + '</span></div><div class="cx">' + s.x() + '</div><div class="row sp"><div class="dots">' + TUT.map((_, k) => '<i class="' + (k < i ? 'd' : k === i ? 'on' : '') + '"></i>').join('') + '</div><div class="row"><button class="btn sm" data-act="tutskip">SKIP</button>' + (s.btn ? '<button class="btn sm big" data-act="tutnext">' + (s.last ? 'FINISH' : 'NEXT') + '</button>' : '') + '</div></div>';
  layoutHl(s.hl);
}
function layoutHl(sel) {
  const h = $('hl'); if (!sel) { h.style.display = 'none'; return; }
  const el = document.querySelector(sel); if (!el) { h.style.display = 'none'; return; }
  const r = el.getBoundingClientRect(); Object.assign(h.style, { display: 'block', left: r.left - 6 + 'px', top: r.top - 4 + 'px', width: r.width + 12 + 'px', height: r.height + 8 + 'px' });
}
function tutGo(i) {
  const R = G.run, T = R.tut, p = G.players[0]; T.step = i; T.t = 0; T.ok = false; T.picked = {}; T.rammed = false; T.abUsed = false; G.ent.en.length = 0; G.ent.eb.length = 0; coachShow(i);
  const E = G.ent.pk;
  if (i === 2) { T.kills0 = R.kills; for (let k = 0; k < 3; k++) mkEnemy('dummy', V.W * .72 + k * 60, V.H * (.3 + k * .2), {}).tx = 1; }
  if (i === 3) { p.am = p.mam * .12; E.push({ k: 'ammo', x: V.W * .75, y: p.y - 80, vx: -1, vy: 0, l: 1500 }, { k: 'ammo', x: V.W * .9, y: p.y + 60, vx: -1, vy: 0, l: 1500 }); }
  if (i === 4) { T.kills0 = R.kills; R.nodmg = false; for (let k = 0; k < 2; k++) mkEnemy('jet', V.W * .85 + k * 80, V.H * (.35 + k * .3)); G.ent.en.forEach(e => { e.hp = e.mhp = 18; e.fcd = 40 + e.x % 50; }); }
  if (i === 5) { ['hp', 'sh', 'core', 'od'].forEach((k, n) => E.push({ k, v: 5, x: V.W * (.6 + n * .08), y: V.H * (.25 + n * .17), vx: -.6, vy: 0, l: 1800 })); p.hp = p.mhp * .6; p.sh = 0; }
  if (i === 6) { const e = mkEnemy('drone', V.W + 40, p.y, {}); e.hp = e.mhp = 4; e.d = Object.assign({}, e.d, { f: null, ai: 'line', sp: 1.4 }); }
  if (i === 8) { p.abCd = 0; }
}
function tutTick(R) {
  const T = R.tut, p = G.players[0]; if (T.step < 0) { R.nodmg = true; tutGo(0); return; }
  T.t++; const s = TUT[T.step]; if (T.step === 0 || s.last) return;
  const E = G.ent.pk; let ok = false;
  if (T.step !== 3 && p.am < p.mam * .2) p.am = p.mam * .6;
  if (T.step === 1) { T.moved += Math.hypot(p.x - T.lx, p.y - T.ly); T.lx = p.x; T.ly = p.y; ok = T.moved > 900 && T.t > 90; }
  else if (T.step === 2) { ok = R.kills - T.kills0 >= 3; if (!G.ent.en.length && !ok) for (let k = 0; k < 3; k++) mkEnemy('dummy', V.W * .72 + k * 60, V.H * (.3 + k * .2), {}).tx = 1; }
  else if (T.step === 3) { ok = !!T.picked.ammo; if (!ok && !E.some(k => k.k === 'ammo')) E.push({ k: 'ammo', x: V.W + 20, y: clamp(p.y + rnd(-90, 90), 90, V.H - 90), vx: -1, vy: 0, l: 1500 }); }
  else if (T.step === 4) {
    const need = 2 - (R.kills - T.kills0); ok = need <= 0; if (p.hp < 25) p.hp = p.mhp;
    if (!ok && G.ent.en.filter(e => !e.dead).length < need) { const e = mkEnemy('jet', V.W + 40, V.H * rnd(.3, .7)); e.hp = e.mhp = 18; e.fcd = 50; }
  }
  else if (T.step === 5) {
    ok = T.picked.hp && T.picked.sh && T.picked.core && T.picked.od;
    ['hp', 'sh', 'core', 'od'].forEach((k, n) => { if (!T.picked[k] && !E.some(q => q.k === k)) E.push({ k, v: 5, x: V.W + 20 + n * 24, y: V.H * (.25 + n * .17), vx: -.6, vy: 0, l: 1800 }); });
  }
  else if (T.step === 6) {
    ok = R.kills - (T.k6 = T.k6 === undefined ? R.kills : T.k6) >= 1 || T.t > 600; if (T.t > 600) p.hp = p.mhp;
    if (!ok && !G.ent.en.some(e => !e.dead)) { const e = mkEnemy('drone', V.W + 40, p.y, {}); e.hp = e.mhp = 4; e.d = Object.assign({}, e.d, { f: null, ai: 'line', sp: 1.4 }); }
  }
  else if (T.step === 7) ok = T.t > 240;
  else if (T.step === 8) ok = !!T.abUsed || T.t > 1500;
  if (!ok && T.step >= 1 && T.t > 2700) ok = true; // never trap a player in a step
  if (ok && !T.ok) { T.ok = true; SFX.clear(); banner('NICE', '', false); setTimeout(() => { if (G.run === R && !R.over) tutGo(T.step + 1); }, 900); }
}
function tutFinish(skip) {
  const R = G.run; SAVE.tut = true; if (!skip) { SAVE.cores += 100; } saveGame(); $('coach').classList.remove('on'); $('hl').style.display = 'none';
  if (R) { R.over = true; G.inCombat = false; } exitToMenu('scMenu'); if (!skip) setTimeout(() => alertMsg('+100 CORES - GRADUATION BONUS'), 300);
}

// ---------- main update ----------
function update() {
  G.t++; bgOff += (G.scene === 'play' ? 1 : .35) * (G.scrollMul || 1);
  pollPads();
  if (G.scene !== 'play') { updParticles(); if (R3) R3.tick(); uiTick(); return; }
  const R = G.run; if (!R) return;
  if (G.netGuest) { netGuestUpdate(R); return; }
  if (G.paused || G.pick || G.cut || G.brief) return;
  if (G.freeze > 0) { G.freeze--; return; }
  if (R.over) { updParticles(); if (R3) R3.tick(); updPB(); updEB(); return; }
  stepRun(R);
  for (const p of G.players) updPlayer(p);
  for (const e of G.ent.en) { if (e.dead) continue; if (e.boss) updBoss(e); else updEnemy(e); }
  updPB(); ramCheck(); updEB(); updPickups(); updBeams();
  const en = G.ent.en; for (let i = en.length - 1; i >= 0; i--) if (en[i].dead) { if (en[i].boss && R.boss === en[i]) R.boss = null; en.splice(i, 1); }
  updParticles(); if (R3) R3.tick(); if (G.netHost) netHostTick(R);
  if (R.comboT > 0) R.comboT--; else R.combo = 0;
  if (G.abTs > 0) G.abTs--; if (R.gzT > 0) R.gzT--;
  if (G.shake > 0) G.shake--; if (G.hitT > 0) G.hitT--; if (G.flashT > 0) G.flashT--;
  if (G.t % 3 === 0) hudTick();
}

// ---------- render ----------
function render() {
  const dpr = V.dpr * V.s, play = G.scene === 'play';
  let sx = 0, sy = 0; if (G.shake > 0 && !SET.reduce) { const a = G.shakeA * Math.min(1, G.shake / 8); sx = (Math.random() - .5) * 2 * a; sy = (Math.random() - .5) * 2 * a; } else G.shakeA = 0;
  G.sx = sx; G.sy = sy;
  bg.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr); if (!(R3 && R3.bgActive && (play || G.scene !== 'play'))) drawBackdrop(bg, G.t); else if (!play) bg.clearRect(0, 0, V.W, V.H); if (G.crash && play) drawDesktop(bg, G.t);
  fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, cvFx.width, cvFx.height); fx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
  if (R3) { try { R3.draw(G, V); r3err = 0; } catch (e) { console.error('R3', e); if (++r3err > 6) { R3.on = false; R3 = null; } } }
  const g = fx, t = G.t, use3 = R3 && R3.on; if (!play) menuFx(g);
  if (play) {
    if (!SET.reduce && (G.world === 2 || G.world === 6)) { // heat shimmer: slow wavy bands of hot air rising off the ground
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = 14; g.lineCap = 'round';
      for (let k = 0; k < 6; k++) { const y0 = V.H * (.38 + k * .11), ph = t * .02 + k * 1.7; g.strokeStyle = G.world === 6 ? 'rgba(251,146,60,.035)' : 'rgba(253,186,116,.03)'; g.beginPath();
        for (let x = 0; x <= V.W + 40; x += 40) { const y = y0 + Math.sin(x * .014 + ph) * 7 + Math.sin(x * .031 - ph * 1.6) * 3; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      g.restore();
    }
    for (const h of G.ent.hz) { if (h.k !== 'bolt') continue; if (h.tel > 0) { g.strokeStyle = 'rgba(217,249,157,' + (.18 + .22 * ((h.tel >> 2) & 1)) + ')'; g.lineWidth = 2; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(h.x, 0); g.lineTo(h.x, V.H); g.stroke(); g.setLineDash([]); } else { g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = '#d9f99d'; g.shadowBlur = 18; g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 5; g.beginPath(); g.moveTo(h.x, 0); for (let y = 24; y < V.H; y += 24) g.lineTo(h.x + rnd(-16, 16), y); g.lineTo(h.x, V.H); g.stroke(); g.strokeStyle = 'rgba(190,242,100,.5)'; g.lineWidth = 14; g.stroke(); g.restore(); } }
    for (const h of G.ent.hz) { if (h.k !== 'gey') continue; const hh = V.H * .72, y0 = h.top ? 0 : V.H - hh; if (h.tel > 0) { g.fillStyle = 'rgba(251,146,60,' + (.08 + .1 * ((h.tel >> 2) & 1)) + ')'; g.fillRect(h.x - 28, y0, 56, hh); g.fillStyle = 'rgba(251,191,36,.6)'; g.fillRect(h.x - 28, h.top ? 0 : V.H - 6, 56, 6); } else { const gr = g.createLinearGradient(0, h.top ? 0 : V.H, 0, h.top ? hh : V.H - hh); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.25, 'rgba(251,191,36,.85)'); gr.addColorStop(1, 'rgba(239,68,68,.0)'); g.fillStyle = gr; g.fillRect(h.x - 26 - Math.sin(t) * 3, y0, 52 + Math.sin(t) * 6, hh); } }
    g.globalCompositeOperation = 'lighter';
    for (const b of G.ent.bm) {
      if (b.k === 'beam') { if (!b.o) continue; if (b.tel > 0) { g.strokeStyle = rgba(b.c, .25 + .35 * ((b.tel >> 2) & 1)); g.lineWidth = 3; g.beginPath(); g.moveTo(b.o.x - b.o.w * .3, b.y); g.lineTo(0, b.y); g.stroke(); } else { const gr = g.createLinearGradient(0, b.y - b.h / 2, 0, b.y + b.h / 2); gr.addColorStop(0, rgba(b.c, 0)); gr.addColorStop(.35, rgba(b.c, .85)); gr.addColorStop(.5, 'rgba(255,255,255,.95)'); gr.addColorStop(.65, rgba(b.c, .85)); gr.addColorStop(1, rgba(b.c, 0)); g.fillStyle = gr; g.fillRect(0, b.y - b.h / 2, b.o.x - b.o.w * .3, b.h); } }
      else if (b.k === 'arc') { g.strokeStyle = 'rgba(147,197,253,' + b.l / b.l0 + ')'; g.lineWidth = 3; g.shadowColor = '#93c5fd'; g.shadowBlur = 10; g.beginPath(); g.moveTo(b.x, b.y); for (let i = 1; i < 5; i++) g.lineTo(b.x + (b.x2 - b.x) * i / 5 + rnd(-8, 8), b.y + (b.y2 - b.y) * i / 5 + rnd(-8, 8)); g.lineTo(b.x2, b.y2); g.stroke(); g.shadowBlur = 0; }
      else if (b.k === 'trail') { g.fillStyle = 'rgba(255,255,255,' + b.l / b.l0 * .5 + ')'; g.fillRect(b.x, b.y - 1.5, V.W, 3); }
    }
    g.globalCompositeOperation = 'source-over';
    for (const k of G.ent.pk) drawPickup(g, k, t);
    for (const e of G.ent.en) { if (!e.hide && (!use3 || !R3.has3D(e))) drawEnemy2D(g, e, t); }
    for (const e of G.ent.en) if (e.tagUntil > G.t && !e.dead && !e.hide && e.x < V.W - 10) drawTag(g, e);
    if (SET.weather !== false && !SET.reduce) drawWeather(g, t);
    if (G.world === GLITCH_W && !SET.reduce && G.t % 200 < 7) { g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? 'rgba(255,43,214,.16)' : 'rgba(34,211,238,.14)'; g.fillRect(0, Math.random() * V.H, V.W, 4 + Math.random() * 26); } g.restore(); }
    for (const p of G.players) if (p.alive && (!use3 || !R3.hasShip(p)) && !(p.inv > 0 && (t >> 2) & 1 && p.blink)) drawShip2D(g, p, t);
    if (use3) { for (const e of G.ent.en) if (e.hf > 0 && !e.hide && R3.has3D(e)) { g.globalCompositeOperation = 'lighter'; drawGlow(g, e.x, e.y, e.w * .7, '#ffffff', .22); g.globalCompositeOperation = 'source-over'; } }
    for (const p of G.players) { if (!p.alive) continue; if (p.inv > 0 && p.blink === false) { g.strokeStyle = 'rgba(56,189,248,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 36 + Math.sin(t * .3) * 2, 0, TAU); g.stroke(); } if (p.od > 0) { g.globalCompositeOperation = 'lighter'; drawGlow(g, p.x, p.y, 62, '#fb923c', .35 + Math.sin(t * .4) * .1); g.globalCompositeOperation = 'source-over'; } if (p.slow > 0) { g.strokeStyle = 'rgba(186,230,253,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 30, 0, TAU); g.stroke(); } if (G.coop || G.players.length > 1) { g.font = '800 10px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillStyle = p.id ? '#fb923c' : '#22d3ee'; g.fillText('P' + (p.id + 1), p.x, p.y - 38); } }
    drawMeta(g, t);
    for (const b of G.ent.pb) drawPB(g, b, t);
    for (const b of G.ent.eb) drawEB(g, b, t);
    // boss shield flash / enemy hp bars for elites
    for (const e of G.ent.en) { if (e.d.elite && !e.boss && e.hp < e.mhp) { const w = e.w * .7; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(e.x - w / 2, e.y - e.r - 14, w, 5); g.fillStyle = '#f43f5e'; g.fillRect(e.x - w / 2, e.y - e.r - 14, w * e.hp / e.mhp, 5); } }
    if (curHz() === 'pulse' && !SET.reduce) { const ph = G.t % 480; if (ph > 400) { const u = (ph - 400) / 80, x = V.W * (1.05 - u * 1.1); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(x - 70, 0, x + 70, 0); gr.addColorStop(0, 'rgba(103,232,249,0)'); gr.addColorStop(.5, 'rgba(165,243,252,' + (ph > 430 ? .32 : .14) + ')'); gr.addColorStop(1, 'rgba(103,232,249,0)'); g.fillStyle = gr; g.fillRect(x - 70, 0, 140, V.H); g.globalCompositeOperation = 'source-over'; } }
    // time warp ring
    if (curHz() === 'time' && !SET.reduce) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(253,224,71,' + (.06 + Math.abs(G.ts - 1) * .3) + ')'; g.lineWidth = 8; g.beginPath(); g.arc(V.W / 2, V.H / 2, Math.min(V.W, V.H) * (.35 + (G.ts - 1) * .3), 0, TAU); g.stroke(); g.globalCompositeOperation = 'source-over'; }
  }
  drawParticles(g);
  // overlays (DOM)
  const fl = $('flash'), low = play && G.players.some(p => p.alive && p.hp < p.mhp * .28), a = SET.flash ? Math.max(G.hitT / 14 * .85, low ? .16 + .1 * Math.sin(t * .15) : 0, (G.flashT || 0) / 30) : 0;
  const av = a.toFixed(2); if (fl._a !== av) { fl._a = av; fl.style.opacity = av; if (G.flashT > 0) fl.style.background = 'radial-gradient(ellipse at 50% 50%,rgba(255,255,255,.7),rgba(255,255,255,.95))'; else fl.style.background = ''; }
  const vg = $('vig'); if (vg._v !== SET.vig) { vg._v = SET.vig; vg.style.display = SET.vig ? 'block' : 'none'; }
}

// "NEW ENEMY" callout that follows an enemy the first time it shows up in a world's first sector
function drawTag(g, e) {
  const d = e.d, left = e.tagUntil - G.t, a = Math.min(1, left / 30, (240 - left) / 12), f = enemyFacts(e.id), l1 = 'NEW: ' + d.nm.toUpperCase(), l2 = f.slice(0, 2).join(' - ');
  g.save(); g.globalAlpha = Math.max(0, a); g.font = '800 11px ui-monospace, Menlo, Consolas, monospace'; const w1 = g.measureText(l1).width; g.font = '700 9px ui-monospace, Menlo, Consolas, monospace'; const w2 = g.measureText(l2).width;
  const w = Math.max(w1, w2) + 18, h = 34, x = clamp(e.x - w / 2, 8, V.W - w - 8), y = clamp(e.y - e.w * .6 - h - 14, 60, V.H - h - 8), col = d.elite ? '#c084fc' : '#22d3ee';
  g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.moveTo(clamp(e.x, x + 8, x + w - 8), y + h); g.lineTo(e.x, e.y - e.w * .45); g.stroke();
  g.fillStyle = 'rgba(4,10,22,.88)'; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, 7); else g.rect(x, y, w, h); g.fill(); g.stroke();
  g.fillStyle = col; g.font = '800 11px ui-monospace, Menlo, Consolas, monospace'; g.fillText(l1, x + 9, y + 14); g.fillStyle = '#cbd5e1'; g.font = '700 9px ui-monospace, Menlo, Consolas, monospace'; g.fillText(l2, x + 9, y + 27);
  g.restore();
}

// ---- foreground weather: drawn over the action, different in every world ----
const WX = { k: null, p: [] };
const WXK = { 2: 'sand', 5: 'snow', 6: 'ember', 7: 'bubble', 8: 'data', 12: 'rain', 1: 'spore', 13: 'ash', 15: 'pixel' };
function drawWeather(g, t) {
  const k = G.mapX ? ({ beach: 'spray', backrooms: 'dust', blocks: 'leaf', park: 'confetti', freeway: 'rain2', vapor: 'spark2', school: null, suburb: 'leaf', glitchcore: 'pixel' })[G.mapX.k] : WXK[G.world | 0];
  if (k !== WX.k) { WX.k = k; WX.p = []; } if (!k) return;
  const N = k === 'rain' ? 90 : k === 'snow' || k === 'sand' ? 70 : 34;
  while (WX.p.length < N) WX.p.push({ x: Math.random() * V.W, y: Math.random() * V.H, s: Math.random(), ph: Math.random() * 6 });
  g.save();
  if (k === 'sand') { const st = .5 + .5 * Math.sin(t * .006); g.fillStyle = 'rgba(194,120,60,' + (.04 + st * .08).toFixed(3) + ')'; g.fillRect(0, 0, V.W, V.H); } // sandstorm gusts dim the view
  if (k === 'snow') { const gr = g.createRadialGradient(V.W / 2, V.H / 2, V.H * .35, V.W / 2, V.H / 2, V.W * .7); gr.addColorStop(0, 'rgba(224,242,254,0)'); gr.addColorStop(1, 'rgba(224,242,254,.16)'); g.fillStyle = gr; g.fillRect(0, 0, V.W, V.H); } // frost creeping in
  for (const q of WX.p) {
    if (k === 'rain' || k === 'rain2') { q.x -= 7 + q.s * 5; q.y += 16 + q.s * 8; g.strokeStyle = k === 'rain' ? 'rgba(217,249,157,.32)' : 'rgba(186,230,253,.28)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x + 6, q.y - 16); g.stroke(); }
    else if (k === 'snow') { q.x -= 1.2 + q.s * 1.4 + Math.sin(t * .03 + q.ph); q.y += .8 + q.s * 1.2; g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(q.x, q.y, 1.2 + q.s * 2.2, 0, TAU); g.fill(); }
    else if (k === 'sand') { q.x -= 9 + q.s * 9; q.y += Math.sin(t * .05 + q.ph) * .6; g.fillStyle = 'rgba(253,186,116,.35)'; g.fillRect(q.x, q.y, 10 + q.s * 16, 1.4); }
    else if (k === 'ember' || k === 'spark2') { q.x -= 1.5 + q.s; q.y -= .8 + q.s * 1.4; g.fillStyle = k === 'ember' ? 'rgba(251,146,60,' + (.4 + .4 * Math.sin(t * .2 + q.ph)).toFixed(2) + ')' : 'rgba(255,110,199,.6)'; g.fillRect(q.x, q.y, 2.4, 2.4); }
    else if (k === 'bubble') { q.x -= 1 + q.s * .6; q.y -= .7 + q.s; g.strokeStyle = 'rgba(165,243,252,.45)'; g.lineWidth = 1; g.beginPath(); g.arc(q.x, q.y, 2 + q.s * 4, 0, TAU); g.stroke(); }
    else if (k === 'data' || k === 'pixel') { q.y += 3 + q.s * 3; q.x -= 1; g.fillStyle = k === 'data' ? 'rgba(74,222,128,.4)' : ['rgba(255,43,214,.45)', 'rgba(34,211,238,.45)'][q.ph > 3 ? 1 : 0]; g.fillRect(q.x, q.y, k === 'data' ? 2 : 4, k === 'data' ? 10 : 4); }
    else if (k === 'spore' || k === 'dust') { q.x -= .6 + q.s * .5; q.y += Math.sin(t * .02 + q.ph) * .4; g.fillStyle = k === 'spore' ? 'rgba(217,249,157,.4)' : 'rgba(255,243,196,.35)'; g.beginPath(); g.arc(q.x, q.y, 1.4 + q.s * 1.6, 0, TAU); g.fill(); }
    else if (k === 'ash') { q.x -= 3 + q.s * 3; q.y += 1 + q.s; g.fillStyle = 'rgba(168,162,158,.4)'; g.fillRect(q.x, q.y, 3, 2); }
    else if (k === 'leaf' || k === 'confetti') { q.x -= 1.6 + q.s * 1.6; q.y += .7 + Math.sin(t * .04 + q.ph) * .8; g.save(); g.translate(q.x, q.y); g.rotate(t * .05 + q.ph); g.fillStyle = k === 'leaf' ? ['rgba(234,88,12,.6)', 'rgba(250,204,21,.6)', 'rgba(101,163,13,.6)'][(q.ph * 10 | 0) % 3] : ['#f472b6', '#facc15', '#22d3ee', '#a78bfa'][(q.ph * 10 | 0) % 4]; g.fillRect(-3, -1.5, 6, 3); g.restore(); }
    else if (k === 'spray') { q.x -= 2 + q.s * 2; q.y -= Math.sin(t * .05 + q.ph) * .5; g.fillStyle = 'rgba(224,242,254,.4)'; g.beginPath(); g.arc(q.x, q.y, 1 + q.s * 1.4, 0, TAU); g.fill(); }
    if (q.x < -30 || q.y > V.H + 30 || q.y < -30) { q.x = V.W + Math.random() * 60; q.y = k === 'rain' || k === 'rain2' || k === 'data' || k === 'pixel' ? -20 + Math.random() * V.H * .3 : k === 'ember' || k === 'bubble' || k === 'spark2' ? V.H + 10 : Math.random() * V.H; if (k === 'rain' || k === 'rain2') q.x = Math.random() * V.W * 1.3; }
  }
  g.restore();
}

// ================= PROGRESSION: pilot XP & ranks, weapon mastery, missions, cosmetics, data logs, medals =================
function PS() { // progression save block (created on demand so old saves keep working)
  const S = SAVE;
  S.xp = S.xp || { lv: 1, xp: 0, tot: 0 };
  S.wm = S.wm || {};
  S.cos = S.cos || { own: { trail: ['accent'], bullet: ['default'], kfx: ['none'], skin: [] }, trail: 'accent', bullet: 'default', kfx: 'none' };
  S.ms = S.ms || { day: '', d: [], week: '', w: null };
  S.logs = S.logs || {};
  S.md = S.md || {};
  return S;
}
// ---- pilot XP and ranks ----
const RANKS = ['Cadet', 'Ensign', 'Lieutenant', 'Commander', 'Captain', 'Major', 'Colonel', 'Commodore', 'Admiral', 'Fleet Admiral', 'Legend'];
const xpNeed = lv => 120 + lv * 70;
const rankName = lv => RANKS[Math.min(RANKS.length - 1, Math.floor((lv - 1) / 5))];
const rankIdx = lv => Math.min(RANKS.length - 1, Math.floor((lv - 1) / 5));
function addXP(n, d) {
  const X = PS().xp; n = Math.max(0, Math.round(n)); X.xp += n; X.tot += n; let ups = 0;
  while (X.xp >= xpNeed(X.lv)) { X.xp -= xpNeed(X.lv); X.lv++; ups++; const r = 75 * X.lv; SAVE.cores += r; if (d) d.lvCores = (d.lvCores | 0) + r; if ((X.lv - 1) % 5 === 0) toast('PROMOTED: ' + rankName(X.lv).toUpperCase(), 'New rank reward: check the Cosmetics shop', '#fbbf24'); }
  if (d) { d.xp = n; d.lvUp = ups; d.lv = X.lv; }
  return ups;
}
// ---- weapon mastery ----
const MTIER = [[0, 'NONE', '#94a3b8'], [50, 'BRONZE', '#d97706'], [150, 'SILVER', '#cbd5e1'], [400, 'GOLD', '#fbbf24'], [1000, 'DIAMOND', '#67e8f9']];
const mastery = k => { const n = (PS().wm[k] || 0); let t = 0; for (let i = 0; i < MTIER.length; i++) if (n >= MTIER[i][0]) t = i; return { n, t, nm: MTIER[t][1], c: MTIER[t][2], next: MTIER[t + 1] ? MTIER[t + 1][0] : 0 }; };
const RAINBOW = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#818cf8', '#e879f9'];
// ---- cosmetics ----
const COS = {
  trail: { accent: { nm: 'Ship Accent', p: 0 }, fire: { nm: 'Afterburn', c: '#fb923c', p: 400 }, toxic: { nm: 'Toxic', c: '#a3e635', p: 400 }, royal: { nm: 'Royal', c: '#a78bfa', p: 500 }, ice: { nm: 'Frostline', c: '#bae6fd', p: 500 }, gold: { nm: 'Gold Dust', c: '#fbbf24', p: 900, rank: 3 }, rainbow: { nm: 'Rainbow', c: 'rb', p: 1500, rank: 5 } },
  bullet: { default: { nm: 'Weapon Default', p: 0 }, crimson: { nm: 'Crimson', c: '#f87171', p: 500 }, lime: { nm: 'Lime', c: '#a3e635', p: 500 }, violet: { nm: 'Violet', c: '#c084fc', p: 600 }, white: { nm: 'White Hot', c: '#f8fafc', p: 700 }, rainbow: { nm: 'Rainbow', c: 'rb', p: 2000, rank: 6 } },
  kfx: { none: { nm: 'Standard', p: 0 }, confetti: { nm: 'Confetti', p: 600 }, pixels: { nm: 'Pixel Burst', p: 700 }, lightning: { nm: 'Lightning', p: 800 }, ghost: { nm: 'Soul Escape', p: 900, rank: 2 }, nova: { nm: 'Supernova', p: 1400, rank: 4 } },
  skin: { midnight: { nm: 'Midnight', p: 800, cfg: { paint: '#1e293b', accent: '#818cf8', finish: 'matte' } }, inferno: { nm: 'Inferno', p: 800, cfg: { paint: '#7c2d12', accent: '#fb923c', finish: 'neon' } }, arctic: { nm: 'Arctic', p: 800, cfg: { paint: '#e2e8f0', accent: '#22d3ee', finish: 'pearl' } }, toxic: { nm: 'Biohazard', p: 900, cfg: { paint: '#1e293b', accent: '#a3e635', finish: 'carbon' } }, royal: { nm: 'Royal Guard', p: 1000, cfg: { paint: '#3b82f6', accent: '#facc15', finish: 'chrome' }, rank: 2 }, gold: { nm: 'Solid Gold', p: 2500, cfg: { paint: '#facc15', accent: '#ffffff', finish: 'chrome' }, rank: 7 } }
};
const cosOwn = (cat, id) => PS().cos.own[cat].indexOf(id) >= 0 || COS[cat][id].p === 0;
function trailCol(p) { const c = COS.trail[PS().cos.trail]; if (!c || !c.c) return p.cfg.accent; return c.c === 'rb' ? RAINBOW[(G.t >> 2) % RAINBOW.length] : c.c; }
function bulletCol(p, k, base) {
  const c = COS.bullet[PS().cos.bullet]; if (c && c.c) return c.c === 'rb' ? RAINBOW[(G.t + G.ent.pb.length) % RAINBOW.length] : c.c;
  const sk = p.pl.wsk && p.pl.wsk[k]; if (sk && mastery(k).t >= sk) return sk === 4 ? RAINBOW[(G.t >> 1) % RAINBOW.length] : MTIER[sk][2];
  return base;
}
function killFx(e) {
  const k = PS().cos.kfx; if (k === 'none' || SET.reduce) return;
  if (k === 'confetti') for (let i = 0; i < 14; i++) spark(e.x, e.y, 1, RAINBOW[i % RAINBOW.length], 4, 34, 2.6);
  else if (k === 'pixels') for (let i = 0; i < 10; i++) pcl({ x: e.x + rnd(-10, 10), y: e.y + rnd(-10, 10), vx: rnd(-3, 3), vy: rnd(-3, 3), l: 30, l0: 30, c: pick(['#22d3ee', '#a3e635', '#f472b6', '#facc15']), r: 4, k: 0, fr: .92 });
  else if (k === 'lightning') { for (let i = 0; i < 3; i++) G.ent.bm.push({ k: 'arc', x: e.x, y: e.y, x2: e.x + rnd(-70, 70), y2: e.y + rnd(-70, 70), l: 10, l0: 10 }); }
  else if (k === 'ghost') pcl({ x: e.x, y: e.y, vx: 0, vy: -1.2, l: 50, l0: 50, c: '#e0e7ff', r: e.r * .8, k: 0, fr: .99 });
  else if (k === 'nova') { shock(e.x, e.y, '#f0abfc', e.w * 2.2, 18); shock(e.x, e.y, '#ffffff', e.w, 12); }
}
// ---- data logs: one hidden in every world ----
const LOGS = [
  ['Flight Recorder 07', 'The storms over the Skylines are not weather. Something above the clouds is pulling them into shape.'],
  ['Hive Field Notes', 'The wasps do not attack at random. They are herding us toward the ravine floor. Toward the Queen.'],
  ['Mining Manifest', 'Shift 9 never came back up. The Excavator kept digging after the crew stopped answering.'],
  ['Nebula Echo', 'Our sensors keep picking up a voice in the gas cloud. It repeats our call signs back to us, one second early.'],
  ['Event Horizon Log', 'Time runs slower near the hole. I have written this sentence four times and I only remember once.'],
  ['Armada Distress Call', 'Frozen in formation. Engines warm. Crews asleep in the cryo bays. Who is flying these ships?'],
  ['Foundry Order 451', 'Production target: one weapon. Size: unlimited. Deadline: before the pilots arrive.'],
  ['Abyssal Sonar', 'The light at the bottom of the trench blinks in a pattern. The same pattern as the beacon at home.'],
  ['Mainframe Fragment', 'ERROR: pilot data found inside enemy firmware. The machines learned to fly by watching you.'],
  ['Clockwork Diary', 'The Keeper stopped every clock but one. That one counts down. Nobody knows to what.'],
  ['Station Logbook', 'The ring station commander sealed the airlocks from the inside. Then the station started moving.'],
  ['Crystal Survey', 'Each crystal hums a different note. Together they sing a map. The map points at Aetheria.'],
  ['Storm Chaser Tape', 'Lightning struck the same ship nine times. The ship was not hit. The ship was charging.'],
  ['Graveyard Roll Call', 'Every wreck out here is one of ours. Every one of them is still transmitting.'],
  ['Core Transmission', 'Where every signal began, a voice: you were never the first pilot. You are the one who finished.'],
  ['/dev/null', 'If you are reading this, the world you are standing in should not exist. Keep flying anyway.']
];
const LOG_LV = w => 2 + (w * 3) % 8;
function logTick(R) {
  if (R.mode !== 'expedition' || R.var || R.lv !== LOG_LV(R.w) || PS().logs[R.w] || R.logSpawned || R.stage !== 'wave' || R.wave < 1 || R.st < 200) return;
  R.logSpawned = 1; G.ent.pk.push({ k: 'log', x: V.W + 20, y: V.H * rnd(.25, .75), vx: -1.4, vy: 0, l: 1400, w: R.w }); alertMsg('DATA LOG DETECTED');
}
function gotLog(p, k) {
  const L = LOGS[k.w] || LOGS[0]; PS().logs[k.w] = 1; saveGame(); shock(p.x, p.y, '#67e8f9', 120, 20); SFX.power();
  toast('DATA LOG: ' + L[0].toUpperCase(), 'Read it in Profile > Data Logs (' + Object.keys(SAVE.logs).length + '/' + LOGS.length + ')', '#67e8f9');
}
// ---- sector medals ----
const MEDALS = [null, ['BRONZE', '#d97706', 0], ['SILVER', '#cbd5e1', 60], ['GOLD', '#fbbf24', 160], ['PLATINUM', '#a5f3fc', 320]];
function medalFor(stars, rank) { if (!stars) return 0; if (rank === 'S' && stars >= 3) return 4; if (stars >= 3 && (rank === 'A' || rank === 'S')) return 3; if (stars >= 2) return 2; return 1; }
const medalAt = (w, lv, tier) => PS().md[w + ':' + lv + ':' + (tier || 1)] | 0;
// ---- missions ----
const MSN = [
  { id: 'kill', nm: n => 'Destroy ' + n + ' enemies', n: [60, 120, 200], v: R => R.kills },
  { id: 'clear', nm: n => 'Clear ' + n + ' campaign sectors', n: [2, 3, 5], v: (R, win) => R.mode === 'expedition' && !R.var && win ? 1 : 0 },
  { id: 'boss', nm: n => 'Defeat ' + n + (n > 1 ? ' bosses' : ' boss'), n: [1, 2], v: R => R.bossDown | 0 },
  { id: 'parry', nm: n => 'Parry ' + n + ' shots', n: [5, 12, 20], v: R => R.parries | 0 },
  { id: 'super', nm: n => 'Fire ' + n + ' super finishers', n: [2, 4], v: R => R.supers | 0 },
  { id: 'combo', nm: n => 'Reach a ' + n + '-kill chain', n: [15, 25, 40], v: R => R.maxCombo, max: 1 },
  { id: 'cores', nm: n => 'Pick up ' + n + ' cores', n: [400, 900, 1500], v: R => R.cores },
  { id: 'graze', nm: n => 'Graze ' + n + ' shots', n: [20, 50, 90], v: R => R.graze },
  { id: 'gold', nm: n => 'Hunt ' + n + ' golden elite' + (n > 1 ? 's' : ''), n: [1, 2], v: R => R.golds | 0 },
  { id: 'hc', nm: n => 'Reach wave ' + n + ' in Hardcore', n: [6, 10, 15], v: R => R.var === 'hardcore' ? R.wave : 0, max: 1 }
];
const weekKey = () => { const d = new Date(); const j = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + 'W' + Math.ceil(((d - j) / 864e5 + j.getDay() + 1) / 7); };
function mkMission(seed, hard) { const r = seeded(seed), M = MSN[Math.floor(r() * MSN.length)], ti = Math.min(M.n.length - 1, Math.floor(r() * M.n.length) + (hard ? 1 : 0)), n = M.n[ti] * (hard ? 3 : 1); return { id: M.id, n, c: 0, done: 0, got: 0, rew: hard ? 1500 : 200 + ti * 120, xp: hard ? 600 : 120 + ti * 60 }; }
function missions() {
  const M = PS().ms, dk = dayKey(), wk = weekKey();
  if (M.day !== dk) { M.day = dk; const s = hashStr('msn' + dk), ids = []; M.d = []; for (let i = 0; M.d.length < 3 && i < 20; i++) { const m = mkMission(s + i * 977); if (ids.indexOf(m.id) < 0) { ids.push(m.id); M.d.push(m); } } }
  if (M.week !== wk) { M.week = wk; M.w = mkMission(hashStr('wk' + wk), 1); while (M.w.id === 'hc' || M.w.id === 'combo') M.w = mkMission(hashStr('wk' + wk + Math.random()), 1); }
  return M;
}
const msnDef = id => MSN.find(m => m.id === id);
const msnReady = () => { const M = missions(); return M.d.concat([M.w]).filter(m => m.done && !m.got).length; };
function msnUpdate(R, win) {
  const M = missions(), done = [];
  for (const m of M.d.concat([M.w])) { if (m.done) continue; const D = msnDef(m.id), v = D.v(R, win) | 0; m.c = D.max ? Math.max(m.c, v) : m.c + v; if (m.c >= m.n) { m.c = m.n; m.done = 1; done.push(D.nm(m.n)); } }
  return done;
}
function claimMission(i) { const M = missions(), m = i === 'w' ? M.w : M.d[+i]; if (!m || !m.done || m.got) return; m.got = 1; SAVE.cores += m.rew; addXP(m.xp); SFX.buy(); saveGame(); toast('MISSION REWARD', '+' + m.rew + ' cores, +' + m.xp + ' XP', '#4ade80'); }

// ---- end of every run ----
function progAfter(R, win, d) {
  if (R.mode === 'tutorial' || R.assist && R.mode === 'training') return;
  PS(); try { histAdd(R, win, d); ghostSave(R, win); corruptWin(R, win, d); } catch (e) { }
  // mastery
  if (R.wk) for (const k in R.wk) { const b = mastery(k).t; SAVE.wm[k] = (SAVE.wm[k] || 0) + R.wk[k]; const a = mastery(k); if (a.t > b) { (d.mastery = d.mastery || []).push(WPN[k].nm + ': ' + a.nm); toast('MASTERY: ' + a.nm, WPN[k].nm + ' - new bullet skin in Hangar > Guns', a.c); } }
  // medal
  if (R.mode === 'expedition' && !R.var && win) { const key = R.w + ':' + R.lv + ':' + R.tier + (R.alt ? 'b' : ''), md = medalFor(d.stars, d.rank), old = SAVE.md[key] | 0; if (md > old) { SAVE.md[key] = md; let r = 0; for (let i = old + 1; i <= md; i++) r += MEDALS[i][2]; SAVE.cores += r; d.medal = md; d.medalCores = r; } }
  // missions + XP
  if (R.mode !== 'training') { const dn = msnUpdate(R, win); if (dn.length) { d.missions = dn; dn.forEach(t => toast('MISSION COMPLETE', t + ' - claim it in Missions', '#4ade80')); } }
  const xp = R.mode === 'training' ? 0 : R.kills * 2 + R.score / 250 + (win ? 60 : 15) + (R.bossDown | 0) * 120 + (R.golds | 0) * 60 + (R.secretExit ? 200 : 0);
  addXP(xp * (R.assist ? .6 : 1), d);
}

// ================= META 2: co-op revives + link beam + team super, versus, ghost replays, challenge codes,
// gamepad remapping, accessibility helpers, auto performance, run history =================

// ---- co-op: fly to a downed teammate to revive them ----
function coopDead(p) { // called every frame for a downed pilot in co-op; returns true if it handled the revive
  const q = alive()[0]; if (!q || p.dX === undefined) return false;
  const near = Math.hypot(q.x - p.dX, q.y - p.dY) < 70;
  p.rv = near ? (p.rv | 0) + 1 : Math.max(0, (p.rv | 0) - 2);
  if (near && G.t % 10 === 0) spark(p.dX, p.dY, 2, '#4ade80', 2, 14, 2);
  if (p.rv >= 110) { p.rv = 0; revive(p); p.x = p.dX; p.y = p.dY; SAVE.st.revives = (SAVE.st.revives | 0) + 1; return true; }
  return false;
}
function linkTick() { // two pilots close together are joined by a beam that hurts anything crossing it
  if (G.players.length < 2 || G.run.var === 'versus') { G.link = null; return; }
  const a = G.players[0], b = G.players[1]; if (!a.alive || !b.alive) { G.link = null; return; }
  const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 230 || d < 30) { G.link = null; return; }
  G.link = { a, b, d }; if (G.t % 6) return;
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy, dm = 4 * (a.st.dmg + b.st.dmg) * .5 * (G.pdm || 1);
  const segD = (x, y) => { const u = clamp(((x - a.x) * dx + (y - a.y) * dy) / L2, 0, 1); return Math.hypot(a.x + dx * u - x, a.y + dy * u - y); };
  for (const e of G.ent.en) { if (e.dead || e.hide) continue; if (segD(e.x, e.y) < e.r + 6) { hurtEnemy(e, e.boss ? dm * .5 : dm, { own: 0 }); spark(e.x, e.y, 3, '#86efac', 3, 12, 2); } }
  const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) if (segD(eb[j].x, eb[j].y) < eb[j].r + 3) { spark(eb[j].x, eb[j].y, 2, '#86efac', 2, 10, 2); eb.splice(j, 1); }
}
function drawCoop(g, t) {
  const L = G.link; if (L) { g.save(); g.globalCompositeOperation = 'lighter'; const k = 1 - L.d / 230; g.strokeStyle = 'rgba(134,239,172,' + (.35 + k * .5).toFixed(2) + ')'; g.lineWidth = 3 + k * 5 + Math.sin(t * .5) * 1.5; g.beginPath(); g.moveTo(L.a.x, L.a.y); g.lineTo(L.b.x, L.b.y); g.stroke(); g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.stroke(); g.restore(); }
  for (const p of G.players) {
    if (p.alive || p.dX === undefined || !(p.rest > 0)) continue; const f = (p.rv | 0) / 110;
    g.save(); g.globalAlpha = .55 + Math.sin(t * .2) * .2; g.strokeStyle = '#4ade80'; g.lineWidth = 2; g.setLineDash([6, 6]); g.lineDashOffset = -t; g.beginPath(); g.arc(p.dX, p.dY, 34, 0, TAU); g.stroke(); g.setLineDash([]);
    if (f > 0) { g.globalAlpha = 1; g.lineWidth = 5; g.beginPath(); g.arc(p.dX, p.dY, 40, -H, -H + TAU * f); g.stroke(); }
    g.globalAlpha = .9; g.fillStyle = '#bbf7d0'; g.font = '800 10px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillText('P' + (p.id + 1) + ' DOWN - FLY HERE TO REVIVE', p.dX, p.dY - 48); g.fillText(Math.ceil(p.rest / 60) + 's', p.dX, p.dY + 4); g.restore();
  }
}

// ---- versus: 2 minute score duel ----
function setupVersus(R) { R.vs = { time: 120 * 60 }; R.hpm = 1; R.edm = 1; }
function versusTick(R) {
  if (R.var !== 'versus' || R.over) return; const V2 = R.vs; if (R.stage === 'wave' || R.stage === 'boss') V2.time--;
  if (V2.time === 600) alertMsg('10 SECONDS LEFT!');
  for (const p of G.players) if (!p.alive && p.rest > 0 && --p.rest <= 0) { revive(p); p.score = Math.max(0, p.score - 400); ftext(p.x, p.y - 30, '-400', '#fb7185', 14); }
  if (V2.time <= 0) { R.stage = 'clear'; R.st = 200; finishRun(true); }
}
function versusFinish(R, win, d) { const sc = G.players.map(p => Math.round(p.score)), top = Math.max(...sc), ti = sc.indexOf(top); d.name = 'Versus'; d.vs = sc; d.win = true; d.bonus = 150; d.vsWin = sc.filter(s => s === top).length > 1 ? 0 : ti + 1; if (G.netNames) d.vsNm = G.netNames.slice(); SAVE.st.vs = (SAVE.st.vs | 0) + 1; }

// ---- ghost replays: your best run of each sector flies alongside you ----
const ghostKey = R => R.w + ':' + R.lv + ':' + R.tier + (R.alt ? 'b' : '');
function ghEnc(a) { const b = new Uint8Array(a.length * 2); for (let i = 0; i < a.length; i++) { const v = a[i] & 0xffff; b[i * 2] = v & 255; b[i * 2 + 1] = v >> 8; } let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
function ghDec(s) { try { const r = atob(s), a = new Int16Array(r.length >> 1); for (let i = 0; i < a.length; i++) { const v = r.charCodeAt(i * 2) | (r.charCodeAt(i * 2 + 1) << 8); a[i] = v > 32767 ? v - 65536 : v; } return a; } catch (e) { return null; } }
function ghostStart(R) { R.gh = []; R.gt = 0; R.ghost = null; if (R.mode !== 'expedition' || R.var || G.players.length > 1 || SET.ghost === false) return; const G0 = (SAVE.gh || {})[ghostKey(R)]; if (G0) { R.ghost = ghDec(G0.d); R.ghostS = G0.s; } }
function ghostTick(R) {
  if (R.gh === undefined || R.mode !== 'expedition' || R.var || G.players.length > 1) return; if (R.stage === 'intro') return; R.gt++;
  if (R.gt % 3 === 0 && R.gh.length < 12000) { const p = G.players[0]; R.gh.push(p.alive ? Math.round(p.x) : -1, Math.round(p.y)); }
}
function ghostSave(R, win) {
  if (!win || !R.gh || R.var || R.mode !== 'expedition' || G.players.length > 1 || R.gh.length < 20) return; const S = SAVE.gh || (SAVE.gh = {}), k = ghostKey(R);
  if (S[k] && S[k].s >= R.score) return; S[k] = { s: Math.round(R.score), d: ghEnc(R.gh), at: Date.now() };
  const ks = Object.keys(S); if (ks.length > 40) ks.sort((a, b) => S[a].at - S[b].at).slice(0, ks.length - 40).forEach(x => delete S[x]);
}
function drawGhost(g, t) {
  const R = G.run; if (!R || !R.ghost || !R.gt) return; const i = Math.floor(R.gt / 3) * 2; if (i + 1 >= R.ghost.length) return; const x = R.ghost[i], y = R.ghost[i + 1]; if (x < 0) return;
  g.save(); g.globalAlpha = .33; drawShip2D(g, { x, y, cfg: { hull: 'falcon', paint: '#e0f2fe', accent: '#a5f3fc', wings: 'swept', engine: 'twin', canopy: 'bubble', finish: 'chrome', stripe: false } }, t); g.globalAlpha = .7; g.fillStyle = '#a5f3fc'; g.font = '800 9px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillText('BEST ' + fmt(R.ghostS || 0), x, y - 26); g.restore();
}

// ---- challenge codes: the same seed, modifier and target score for a friend ----
function chCode(w, lv, mod, seed, target) { const body = [w + 1, lv + 1, mod + 1].map(n => n.toString(36)).join('') + '-' + (seed % 1679616).toString(36).toUpperCase().padStart(4, '0') + '-' + Math.round(target / 50).toString(36).toUpperCase(); const lb = body.toLowerCase(); let c = 0; for (let i = 0; i < lb.length; i++) c = (c * 31 + lb.charCodeAt(i)) % 36; return (body + c.toString(36)).toUpperCase(); }
function chParse(code) {
  code = String(code || '').toUpperCase().replace(/[^0-9A-Z-]/g, ''); const ck = code.slice(-1), body = code.slice(0, -1); let c = 0; for (let i = 0; i < body.length; i++) c = (c * 31 + body.toLowerCase().charCodeAt(i)) % 36; if (c.toString(36).toUpperCase() !== ck) return null;
  const p = body.split('-'); if (p.length !== 3 || p[0].length !== 3) return null; const w = parseInt(p[0][0], 36) - 1, lv = parseInt(p[0][1], 36) - 1, mod = parseInt(p[0][2], 36) - 1, seed = parseInt(p[1], 36), target = parseInt(p[2], 36) * 50;
  if (!(w >= 0 && w < WORLDS.length && lv >= 0 && lv < LV - 1 && mod >= -1 && mod < DMODS.length && seed >= 0)) return null; return { w, lv, mod, seed, target, code };
}
function startChallenge(c) { const o = { mode: 'expedition', var: 'chal', w: c.w, lv: c.lv, tier: 1, co: SAVE.players === 2, chal: c }; G.last = o; beginRun(o); }
function setupChal(R, o) { const c = R.chal = o.chal, sp = R.spec; R.rng = seeded(c.seed); sp.type = 'c'; sp.waves = R.waves = 4; sp.name = 'Challenge ' + c.code; R.hazMode = false; if (c.mod >= 0 && DMODS[c.mod]) DMODS[c.mod].ap(R); }
function chalFinish(R, win, d) { const c = R.chal; d.name = 'Challenge ' + c.code; d.chal = c; d.beat = Math.round(R.score) > c.target; d.bonus = win ? 200 + (d.beat ? 300 : 0) : 30; d.newCode = chCode(c.w, c.lv, c.mod, c.seed, Math.max(c.target, Math.round(R.score))); }
function randChal() { const n = Math.max(1, Math.min(SAVE.wu, WORLDS.length)), w = Math.floor(Math.random() * n), lv = 2 + Math.floor(Math.random() * 9), mod = Math.random() < .3 ? -1 : Math.floor(Math.random() * DMODS.length); return chParse(chCode(w, lv, mod, Math.floor(Math.random() * 1679616), 0)); }

// ---- gamepad remapping ----
const PADB = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'L-STICK', 'R-STICK'];
const PADA = [['fire', 'Fire', [0, 7]], ['ab', 'Ability', [1, 3]], ['sec', 'Charge / secondary / parry', [6, 2]], ['sup', 'Super finisher', [10, 11, 8]], ['wl', 'Previous gun', [4]], ['wr', 'Next gun', [5]]];
const padBtns = a => { const m = SET.padMap; if (m && m[a] !== undefined) return [m[a]]; const r = PADA.find(x => x[0] === a); return r ? r[2] : []; };
const padDown = (gp, a) => padBtns(a).some(i => gp.buttons[i] && gp.buttons[i].pressed);
const padLabel = a => padBtns(a).map(i => PADB[i] || '#' + i).join(' / ');
function padRebindPoll(gp, prev) { if (!G.padBind) return false; for (let i = 0; i < gp.buttons.length && i < 16; i++) { if (gp.buttons[i] && gp.buttons[i].pressed && !(prev.raw && prev.raw[i])) { if (i === 9 && G.padBind !== 'pause') { } SET.padMap = SET.padMap || {}; SET.padMap[G.padBind] = i; G.padBind = null; saveSet(); SFX.click(); if (UI.top === 'scKeys') UI.refresh(); return true; } } return true; }

// ---- accessibility ----
const CBP = { dt: { orb: ['#fde047', '#facc15'], shard: ['#f0abfc', '#e879f9'], ice: ['#ffffff', '#cbd5e1'], mine: ['#fde047', '#f59e0b'], ring: ['#fef08a', '#facc15'], plasma: ['#fde047', '#fb923c'] }, tr: { orb: ['#ff3b5c', '#f43f5e'], shard: ['#ff7ad9', '#f472b6'], ice: ['#ffffff', '#fecdd3'], mine: ['#fb7185', '#e11d48'], ring: ['#ff3b5c', '#be123c'], plasma: ['#fb7185', '#e11d48'] } };
let EBCP = null;
const EBC0 = JSON.parse(JSON.stringify(EBC));
function applyAccess() { const P = CBP[SET.cbp]; for (const k in EBC0) EBC[k] = P && P[k] ? P[k] : EBC0[k]; }
function drawHitbox(g) { if (!SET.hitbox || !G.run) return; for (const p of G.players) { if (!p.alive) continue; g.save(); g.fillStyle = '#fff'; g.strokeStyle = '#ef4444'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 5, 0, TAU); g.fill(); g.stroke(); g.restore(); } }

// ---- auto performance mode ----
const PERF = { n: 0, t: 0, low: 0, step: 0 };
function perfTick(now) {
  if (SET.autoperf === false || G.scene !== 'play' || G.paused || G.cut) { PERF.t = now; PERF.n = 0; return; }
  PERF.n++; if (now - PERF.t < 1000) return; const fps = PERF.n * 1000 / (now - PERF.t); PERF.n = 0; PERF.t = now;
  if (fps < 38) PERF.low++; else PERF.low = Math.max(0, PERF.low - 1);
  if (G.run && G.t - G.run.t0 < 360) return;
  if (PERF.low < 6 || PERF.step >= 2) return; PERF.low = 0; PERF.step++;
  if (PERF.step === 1) { SET.bloom = false; SET.weather = false; } else if (PERF.step === 2) { SET.q = 1; SET.back = Math.min(SET.back, 1); SET.parts = Math.min(SET.parts, 90); layout(); }
  saveSet(); toast('PERFORMANCE MODE', 'Graphics lowered to keep the game smooth (step ' + PERF.step + '/2). Change it in Settings.', '#38bdf8');
}

// ---- run history (for the stats page) ----
function histAdd(R, win, d) { const H0 = SAVE.hist || (SAVE.hist = []); H0.push({ m: R.var || R.mode, w: R.w, s: Math.round(R.score), k: R.kills, win: win ? 1 : 0, t: d.time, at: Date.now() }); if (H0.length > 60) H0.splice(0, H0.length - 60); }

// ================= CREATE: level editor + custom bosses (with share codes), the glitch spreading, the desktop crash =================
const BASE_BOSSES = 17;
// ---- share codes (JSON -> base64 with a prefix) ----
const packCode = (pre, o) => pre + btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, '');
function unpackCode(pre, s) { s = String(s || '').replace(/\s+/g, ''); if (s.indexOf(pre) !== 0) return null; try { return JSON.parse(decodeURIComponent(escape(atob(s.slice(pre.length))))); } catch (e) { return null; } }

// ---- custom bosses ----
const ATKP = {
  fan: { nm: 'Fan spread', p: [{ n: 9, sp: 1.4, s: 4.4, r: 70 }, { n: 13, sp: 1.8, s: 5, r: 55 }, { n: 19, sp: 2.4, s: 5.6, r: 42 }] },
  aim: { nm: 'Aimed volley', p: [{ n: 3, s: 5, r: 60 }, { n: 5, s: 5.6, r: 50 }, { n: 7, s: 6.2, r: 42 }] },
  ring: { nm: 'Ring blast', p: [{ n: 18, s: 3.6, r: 70 }, { n: 28, s: 4, r: 60 }, { n: 40, s: 4.4, r: 48 }] },
  spiral: { nm: 'Spiral', p: [{ n: 80, s: 4.4, r: 60 }, { n: 110, s: 4.8, r: 52 }, { n: 150, s: 5.2, r: 44 }] },
  wall: { nm: 'Bullet wall', p: [{ n: 14, s: 4.2, r: 90 }, { n: 18, s: 4.8, r: 80 }, { n: 22, s: 5.2, r: 66 }] },
  rain: { nm: 'Bullet rain', p: [{ n: 16, s: 5.6, r: 55 }, { n: 24, s: 6.2, r: 45 }, { n: 30, s: 6.8, r: 38 }] },
  homing: { nm: 'Homing shots', p: [{ n: 4, s: 3.6, r: 70 }, { n: 6, s: 4, r: 60 }, { n: 8, s: 4.4, r: 50 }] },
  mines: { nm: 'Mines', p: [{ n: 5, r: 100 }, { n: 7, r: 90 }, { n: 9, r: 80 }] },
  beam: { nm: 'Sweeping beam', p: [{ r: 110 }, { r: 95 }, { r: 80 }] },
  summon: { nm: 'Summon minions', p: [{ n: 2, r: 140 }, { n: 4, r: 120 }, { n: 5, r: 110 }] }
};
const BMOVES = { hover: 'Hover', sweep: 'Sweep', orbit: 'Orbit', charge: 'Charge' };
const BCOLS = ['#38bdf8', '#4ade80', '#fbbf24', '#f472b6', '#a78bfa', '#fb923c', '#ef4444', '#67e8f9', '#e2e8f0', '#ff2bd6'];
const newCBoss = () => ({ v: 1, nm: 'My Boss', m: 0, c: '#f472b6', hp: 4000, ph: [{ mv: 'hover', atk: [['fan', 1], ['aim', 1]] }, { mv: 'sweep', atk: [['ring', 1], ['spiral', 1]] }], minion: 'jet' });
function cbossDef(cb) { // custom boss -> a normal boss definition
  const n = cb.ph.length; return { nm: String(cb.nm || 'Custom Boss').slice(0, 28), hp: clamp(+cb.hp || 4000, 1000, 14000), w: 300, c: cb.c || '#f472b6', rew: Math.round((+cb.hp || 4000) * 1.6), mv: cb.ph[0].mv, ph: cb.ph.map((p, i) => ({ at: i === 0 ? 1 : +(1 - i / n).toFixed(2), mv: BMOVES[p.mv] ? p.mv : 'hover', atk: p.atk.filter(a => ATKP[a[0]]).map(a => Object.assign({ k: a[0] }, ATKP[a[0]].p[clamp(a[1] | 0, 0, 2)], a[0] === 'summon' ? { id: EN[cb.minion] && !EN[cb.minion].elite ? cb.minion : 'jet' } : {})).concat([]) })).map(p => p.atk.length ? p : Object.assign(p, { atk: [Object.assign({ k: 'aim' }, ATKP.aim.p[1])] })), custom: 1, model: clamp(cb.m | 0, 0, BASE_BOSSES - 1) };
}
function useCBoss(cb) { BOSSES.length = BASE_BOSSES; BOSSES.push(cbossDef(cb)); return BASE_BOSSES; }
function startCBoss(cb, w) { const o = { mode: 'expedition', var: 'custom', w: w | 0, lv: 12, tier: 1, co: SAVE.players === 2, cust: { nm: cb.nm, w: w | 0, waves: [], cb } }; G.last = o; beginRun(o); }

// ---- custom levels ----
const FORMS = { line: 'Line', column: 'Column', vee: 'V shape', swarm: 'Swarm' };
const newLevel = () => ({ v: 1, nm: 'My Level', w: 0, waves: [[{ id: 'jet', n: 4, f: 'line' }], [{ id: 'drone', n: 5, f: 'vee' }, { id: 'jet', n: 3, f: 'column' }]], boss: null, cb: null });
function setupCustom(R, o) {
  const L = R.cust = o.cust, sp = R.spec; R.waves = sp.waves = Math.max(0, L.waves.length); sp.name = L.nm || 'Custom Level'; R.hazMode = false; R.hpm = 1 + (L.w || 0) * .15; R.edm = 1 + (L.w || 0) * .05;
  if (L.cb) { R.bossW = useCBoss(L.cb); sp.type = 'B'; } else if (L.boss !== null && L.boss !== undefined && BOSSES[L.boss]) { R.bossW = L.boss; sp.type = 'B'; } else sp.type = 'c';
  if (!R.waves && sp.type === 'B') R.skipToBoss = 1;
}
function customWave(R) {
  const W = R.cust.waves[R.wave] || [], q = []; let t = 20;
  for (const gr of W) { const id = EN[gr.id] ? gr.id : 'jet', n = clamp(gr.n | 0, 1, 12), f = gr.f || 'line', y0 = rnd(120, V.H - 120), cn = (n - 1) / 2;
    for (let i = 0; i < n; i++) { let y = y0, dt = 0, dx = 0; if (f === 'line') { dx = i * 54; dt = i * 8; } else if (f === 'column') { y = clamp(V.H / 2 + (i - cn) * 62, 70, V.H - 70); } else if (f === 'vee') { y = clamp(y0 + (i - cn) * 56, 70, V.H - 70); dx = Math.abs(i - cn) * 46; dt = Math.abs(i - cn) * 16; } else { y = rnd(80, V.H - 80); dt = i * 26; dx = rnd(0, 120); } q.push({ t: t + dt, id, y, dx }); }
    t += 150; }
  R.q = q.sort((a, b) => a.t - b.t); R.st = 0;
}
function customFinish(R, win, d) { d.name = R.cust.nm || 'Custom Level'; d.bonus = win ? 60 + R.waves * 25 : 10; SAVE.st.custom = (SAVE.st.custom | 0) + (win ? 1 : 0); }

// ---- the glitch spreads into the old worlds (after The Glitch opens, until the Null Process falls) ----
const glitchSpreading = () => SAVE.wu > GLITCH_W && !((SAVE.prog[GLITCH_W] && SAVE.prog[GLITCH_W].done[0] || [])[LV - 1]);
const isCorrupt = (w, lv) => w < GLITCH_W && lv < LV - 1 && ((w * 7 + lv * 13) % 5 === 0) && (SAVE.wu > GLITCH_W);
const corruptKey = (w, lv) => w + ':' + lv;
function corruptLive(R) { return R.mode === 'expedition' && !R.var && R.tier === 1 && glitchSpreading() && isCorrupt(R.w, R.lv) && !(SAVE.flags.clean || {})[corruptKey(R.w, R.lv)]; }
function corruptSetup(R) { if (!corruptLive(R)) return; R.corrupt = 1; R.lootM = (R.lootM || 1) * 1.5; R.hpm *= 1.1; }
function corruptSpawn(e, R) { if (!R.corrupt || e.minion || Math.random() > .25) return e; e.dead = true; const g = mkEnemy(pick(['gjet', 'gcube', 'gpod', 'gecho']), e.x, e.y); return g; }
function corruptTick(R) {
  if (!R.corrupt) return;
  if (G.t % 240 === 0 && !SET.reduce) { document.body.classList.add('glitchui'); setTimeout(() => { if (!(G.run && G.run.w === GLITCH_W)) document.body.classList.remove('glitchui'); }, 260 + Math.random() * 300); shake(3, 8); }
}
function corruptWin(R, win, d) { if (!R.corrupt || !win) return; (SAVE.flags.clean = SAVE.flags.clean || {})[corruptKey(R.w, R.lv)] = 1; d.cleansed = 1; toast('SECTOR CLEANSED', 'The glitch is pushed back - for now.', '#ff2bd6'); }
function drawCorrupt(g, t) { const R = G.run; if (!R || !R.corrupt || SET.reduce) return; if ((t >> 3) % 9 !== 0) return; g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const y = Math.random() * V.H; g.fillStyle = i % 2 ? 'rgba(255,43,214,.16)' : 'rgba(34,211,238,.16)'; g.fillRect(0, y, V.W, 4 + Math.random() * 16); } g.restore(); }

// ---- AetherOS: the game "crashes" into a fake desktop after the Null Process falls ----
Object.assign(EN, {
  popup: { nm: 'Error Popup', m: ['cube', { c: 0x1e293b, e: 0xef4444 }], w: 92, hp: 40, sp: 1.2, ai: 'hover', f: { k: 'fan', r: 90, s: 4.2, n: 5 }, sc: 300, cr: 6, cost: 2 },
  cursor: { nm: 'Rogue Cursor', m: ['dart', { c: 0xf8fafc, e: 0x22d3ee }], w: 54, hp: 12, sp: 3.4, ai: 'seeker', sc: 120, cr: 2, cost: 1, ram: 20 },
  folder: { nm: 'Zip Bomb', m: ['pod', { c: 0xca8a04, e: 0xfde047 }], w: 70, hp: 30, sp: 1.4, ai: 'drift', burst: 12, sc: 200, cr: 4, cost: 2 }
});
const CRASH_BOSS = { v: 1, nm: 'SYSTEM HALT', m: 15, c: '#38bdf8', hp: 7000, ph: [{ mv: 'hover', atk: [['wall', 1], ['aim', 2]] }, { mv: 'orbit', atk: [['summon', 2], ['ring', 2], ['homing', 1]] }, { mv: 'charge', atk: [['beam', 2], ['rain', 2], ['spiral', 2]] }], minion: 'popup' };
const CRASH_LVL = () => ({ v: 1, nm: 'AetherOS', w: GLITCH_W, waves: [[{ id: 'cursor', n: 6, f: 'swarm' }, { id: 'popup', n: 2, f: 'column' }], [{ id: 'folder', n: 3, f: 'vee' }, { id: 'cursor', n: 5, f: 'line' }], [{ id: 'popup', n: 4, f: 'column' }, { id: 'folder', n: 2, f: 'swarm' }]], boss: null, cb: CRASH_BOSS });
function startCrash() { const o = { mode: 'expedition', var: 'crash', w: GLITCH_W, lv: 12, tier: 1, co: SAVE.players === 2, cust: CRASH_LVL() }; G.last = o; beginRun(o); }
function setupCrash(R, o) { setupCustom(R, o); R.spec.name = 'AetherOS'; G.crash = 1; G.mapX = null; R.crashBg = SET.bg3d; SET.bg3d = false; }
function crashOff() { if (!G.crash) return; G.crash = 0; if (G.run && G.run.crashBg !== undefined) SET.bg3d = G.run.crashBg; else SET.bg3d = true; }
function crashFinish(R, win, d) { d.name = 'AetherOS'; d.bonus = win ? 3000 : 100; if (win) { SAVE.flags.crash = 1; SAVE.unl.crash = 1; } }
function drawDesktop(g, t) { // the fake desktop wallpaper, icons and taskbar, drawn behind the action
  const W = V.W, H = V.H, gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#0b3b5c'); gr.addColorStop(.6, '#1e3a8a'); gr.addColorStop(1, '#3b0764'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = .18; g.strokeStyle = '#93c5fd'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(W * .7, H * 1.2, 260 + i * 90 + Math.sin(t * .01 + i) * 10, Math.PI, TAU); g.stroke(); } g.restore();
  const icons = [['aetheria.exe', '#22d3ee'], ['readme.txt', '#e2e8f0'], ['worlds', '#fbbf24'], ['saves', '#4ade80'], ['bin', '#94a3b8']];
  icons.forEach((ic, i) => { const x = 30, y = 30 + i * 84, j = (t >> 4) % 23 === i ? rnd(-3, 3) : 0; g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x - 6 + j, y - 6, 64, 70); g.fillStyle = ic[1]; g.fillRect(x + 8 + j, y, 36, 40); g.fillStyle = '#0f172a'; g.fillRect(x + 14 + j, y + 8, 24, 4); g.fillRect(x + 14 + j, y + 16, 18, 4); g.fillStyle = '#e2e8f0'; g.font = '700 10px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillText(ic[0], x + 26 + j, y + 56); });
  g.fillStyle = 'rgba(2,6,23,.82)'; g.fillRect(0, H - 34, W, 34); g.fillStyle = '#22d3ee'; g.beginPath(); g.arc(24, H - 17, 11, 0, TAU); g.fill(); g.fillStyle = '#0f172a'; g.font = '900 11px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillText('A', 24, H - 13);
  g.fillStyle = '#e2e8f0'; g.textAlign = 'right'; g.font = '700 12px ui-monospace,Menlo,monospace'; const d = new Date(); g.fillText(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), W - 14, H - 12); g.textAlign = 'left'; g.fillText('AetherOS - aetheria.exe (Not Responding)', 46, H - 12);
}
function drawCrashEnemies(g, t) { // draw popups as error windows on top of their 3D bodies
  if (!G.crash) return;
  for (const e of G.ent.en) { if (e.dead || e.hide) continue;
    if (e.id === 'popup') { const w = e.w * 1.5, h = e.w, x = e.x - w / 2, y = e.y - h / 2; g.fillStyle = '#e2e8f0'; g.fillRect(x, y, w, h); g.fillStyle = e.hf > 0 ? '#fff' : '#1d4ed8'; g.fillRect(x, y, w, 16); g.fillStyle = '#fff'; g.font = '700 9px ui-monospace,Menlo,monospace'; g.textAlign = 'left'; g.fillText('Error', x + 5, y + 11); g.fillStyle = '#ef4444'; g.fillRect(x + w - 15, y + 2, 12, 12); g.fillStyle = '#ef4444'; g.beginPath(); g.arc(x + 18, y + h / 2 + 6, 9, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.font = '900 12px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillText('!', x + 18, y + h / 2 + 10); g.fillStyle = '#0f172a'; g.font = '700 8px ui-monospace,Menlo,monospace'; g.textAlign = 'left'; g.fillText('player.dll', x + 32, y + h / 2 + 2); g.fillText('not found', x + 32, y + h / 2 + 12); g.fillStyle = '#cbd5e1'; g.fillRect(x + w - 34, y + h - 16, 28, 11); }
    else if (e.id === 'cursor') { g.save(); g.translate(e.x, e.y); g.rotate(Math.atan2(e.vy || 0, e.vx || -1) + Math.PI * .75); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 24); g.lineTo(6, 18); g.lineTo(11, 28); g.lineTo(15, 26); g.lineTo(10, 16); g.lineTo(18, 16); g.closePath(); g.fill(); g.stroke(); g.restore(); }
    else if (e.id === 'folder') { const x = e.x - 26, y = e.y - 20; g.fillStyle = '#eab308'; g.fillRect(x, y + 6, 52, 36); g.fillRect(x, y, 22, 10); g.fillStyle = '#facc15'; g.fillRect(x, y + 12, 52, 30); g.fillStyle = '#713f12'; g.font = '900 9px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillText('.ZIP', e.x, e.y + 14); } }
}
// the fake crash screen itself (DOM), shown after the Null Process falls
function crashIntro(done) {
  if (document.getElementById('fakeos')) return; const d = document.createElement('div'); d.id = 'fakeos';
  d.innerHTML = '<div class="fo-icons">' + [['aetheria.exe', 'exe'], ['readme.txt', 'txt'], ['worlds', 'dir'], ['bin', 'bin']].map(i => '<div class="fo-ic" data-fo="' + i[1] + '"><i class="' + i[1] + '"></i><span>' + i[0] + '</span></div>').join('') + '</div><div class="fo-bar"><b>A</b><span>AetherOS</span><em id="foClock"></em></div><div class="fo-win" id="foWin"><div class="fo-t">aetheria.exe<u>x</u></div><div class="fo-b">aetheria.exe has stopped responding.<br><br>Something is still running inside it.</div><div class="fo-btns"><button data-fo="close">Close program</button><button data-fo="wait">Wait</button></div></div>';
  document.body.appendChild(d); SFX.no();
  const clk = () => { const c = document.getElementById('foClock'); if (c) { const n = new Date(); c.textContent = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); } }; clk();
  let n = 0; const spam = () => { if (!document.getElementById('fakeos')) return; const w = document.createElement('div'); w.className = 'fo-win sm'; w.style.left = (8 + Math.random() * 70) + '%'; w.style.top = (8 + Math.random() * 65) + '%'; w.innerHTML = '<div class="fo-t">Error<u>x</u></div><div class="fo-b">' + pick(['player.dll not found', 'reality.sys is corrupted', 'world_17 is not responding', 'ARIA.exe stopped working', 'The signal could not be closed']) + '</div>'; d.appendChild(w); SFX.no(); if (++n < 14) setTimeout(spam, 160 - n * 6); else setTimeout(() => { d.classList.add('fo-dive'); setTimeout(() => { d.remove(); done && done(); }, 700); }, 400); };
  d.addEventListener('click', e => { const k = e.target.closest('[data-fo]'); if (!k) return; const v = k.dataset.fo;
    if (v === 'txt') { const w = document.getElementById('foWin'); w.querySelector('.fo-t').firstChild.textContent = 'readme.txt'; w.querySelector('.fo-b').innerHTML = 'If you can read this, you got out of the game.<br>Or the game got out of you.<br><br>- ARIA'; }
    else if (v === 'close' || v === 'wait' || v === 'exe') { k.disabled = true; spam(); } });
  setTimeout(() => { if (document.getElementById('fakeos') && !n) spam(); }, 9000);
}

// ================= META: run cards, hull abilities, wingmen, weapon levels, boss weak points, graze + rank =================

// ---------- run cards: power-ups that last for one run ----------
const RAR = [{ nm: 'COMMON', c: '#94a3b8' }, { nm: 'UNCOMMON', c: '#38bdf8' }, { nm: 'RARE', c: '#fbbf24' }];
const newMod = () => ({ arm: 1, home: 0, pierce: 0, multi: 0, crit: 0, chain: 0, blast: 0, regen: 0, burst: 0, vamp: 0, orb: 0, ramc: 0, second: 0, cdr: 1, graze: 0, xdr: 0, loot: 0 });
const CARDS = {
  dmg: { nm: 'Hot Rounds', ds: '+15% weapon damage', rar: 0, max: 5, ic: 'dmg', ap: p => { p.st.dmg *= 1.15; } },
  rate: { nm: 'Overclock', ds: '+12% fire rate', rar: 0, max: 4, ic: 'rate', ap: p => { p.st.rate *= 1.12; } },
  spd: { nm: 'Afterburners', ds: '+10% flight speed', rar: 0, max: 3, ic: 'spd', ap: p => { p.st.spd *= 1.1; } },
  hull: { nm: 'Plating Patch', ds: '+25 max hull and repair 25 now', rar: 0, max: 4, ic: 'hp', ap: p => { p.mhp += 25; p.hp = Math.min(p.mhp, p.hp + 25); } },
  shld: { nm: 'Shield Booster', ds: '+25 max shield, recharged now', rar: 0, max: 4, ic: 'sh', ap: p => { p.msh += 25; p.sh = p.msh; } },
  plas: { nm: 'Plasma Cells', ds: '+35 max plasma and a full refill', rar: 0, max: 4, ic: 'am', ap: p => { p.mam += 35; p.am = p.mam; } },
  mag: { nm: 'Gravity Well', ds: '+40% pickup magnet range', rar: 0, max: 3, ic: 'mag', ap: p => { p.st.mag *= 1.4; } },
  armr: { nm: 'Reactive Plating', ds: 'Take 12% less damage', rar: 0, max: 3, ic: 'armor', ap: p => { p.mod.arm *= .88; } },
  loot: { nm: 'Salvage Beacon', ds: '+25% cores from kills', rar: 0, max: 3, ic: 'coin', ap: p => { p.mod.loot += .25; } },
  home: { nm: 'Seeker Rounds', ds: 'Your bolts curve toward enemies', rar: 1, max: 3, ic: 'home', ap: p => { p.mod.home++; } },
  prc: { nm: 'Piercing Bolts', ds: 'Bolts punch through 1 more enemy', rar: 1, max: 3, ic: 'pierce', ap: p => { p.mod.pierce++; } },
  mult: { nm: 'Extra Barrels', ds: '+2 side shots with every volley', rar: 1, max: 2, ic: 'multi', ap: p => { p.mod.multi++; } },
  crit: { nm: 'Lucky Shots', ds: '+12% chance for triple damage', rar: 1, max: 3, ic: 'star', ap: p => { p.mod.crit += .12; } },
  chn: { nm: 'Static Charge', ds: 'Bolts arc to a nearby enemy', rar: 1, max: 2, ic: 'chain', ap: p => { p.mod.chain++; } },
  blst: { nm: 'Explosive Tips', ds: 'Bolts burst on impact', rar: 1, max: 3, ic: 'blast', ap: p => { p.mod.blast++; } },
  regn: { nm: 'Nano Repair', ds: 'Slowly regenerate hull', rar: 1, max: 3, ic: 'regen', ap: p => { p.mod.regen++; } },
  bst: { nm: 'Shield Burst', ds: 'A breaking shield blasts enemy fire away', rar: 1, max: 2, ic: 'ring', ap: p => { p.mod.burst++; } },
  vamp: { nm: 'Life Siphon', ds: 'Kills heal your hull', rar: 1, max: 3, ic: 'drop', ap: p => { p.mod.vamp++; } },
  orb: { nm: 'Orbit Drone', ds: 'A drone circles you, blocking shots', rar: 1, max: 3, ic: 'orbit', ap: p => { p.mod.orb++; } },
  ramc: { nm: 'Ram Plating', ds: 'Ramming hurts 40% less and hits harder', rar: 1, max: 2, ic: 'ram', ap: p => { p.mod.ramc++; } },
  sec: { nm: 'Second Wind', ds: 'Survive one lethal hit this run', rar: 2, max: 1, ic: 'heart', ap: p => { p.mod.second++; } },
  cdr: { nm: 'Chrono Core', ds: 'Ability recharges 25% faster', rar: 2, max: 3, ic: 'clock', ap: p => { p.mod.cdr *= .75; } },
  grz: { nm: 'Graze Reactor', ds: 'Grazing recharges your ability and plasma', rar: 2, max: 2, ic: 'graze', ap: p => { p.mod.graze++; } },
  nova: { nm: 'Nova Heart', ds: '+30% damage, +20% fire rate, -20% max hull', rar: 2, max: 1, ic: 'nova', ap: p => { p.st.dmg *= 1.3; p.st.rate *= 1.2; p.mhp = Math.round(p.mhp * .8); p.hp = Math.min(p.hp, p.mhp); } },
  wing: { nm: 'Phantom Wingman', ds: 'A wingman fights beside you this run', rar: 2, max: 2, ic: 'wing', ap: p => { p.mod.xdr++; } }
};
function rollCards(p, n) {
  const pool = [], R = G.run, bias = 1 + (R ? R.w * .04 + (R.tier - 1) * .25 : 0);
  for (const id in CARDS) { const c = CARDS[id], have = p.cards[id] | 0; if (have >= c.max) continue; pool.push([id, [10, 5 * bias, 2 * bias][c.rar] * (have ? .6 : 1)]); }
  const out = [];
  while (out.length < n && pool.length) {
    let tot = 0; for (const q of pool) tot += q[1];
    let r = Math.random() * tot, k = 0; for (; k < pool.length - 1; k++) { r -= pool[k][1]; if (r <= 0) break; }
    out.push(pool[k][0]); pool.splice(k, 1);
  }
  return out;
}
function advancePick() { // moves to the next pilot that still has cards to offer
  const K = G.pick; K.rr = 0;
  while (++K.who < G.players.length) { const o = rollCards(G.players[K.who], 3); if (o.length) { K.opts = o; return true; } }
  return false;
}
function offerCards() {
  if (!G.run || !G.players.length) return false;
  G.pick = { who: -1, opts: [], rr: 0 };
  if (!advancePick()) { G.pick = null; return false; }
  IN.ab[0] = IN.ab[1] = 0; clearMsgs(); UI.show('scCards', true); SFX.clear(); return true;
}
function endPick() { if (advancePick()) UI.refresh(); else { G.pick = null; UI.hideAll(); } }
function pickCard(i) {
  const K = G.pick; if (!K) return; const id = K.opts[i], p = G.players[K.who]; if (!id || !p) return;
  const c = CARDS[id]; c.ap(p); p.cards[id] = (p.cards[id] | 0) + 1; SAVE.st.cards++; SFX.power();
  shock(p.x, p.y, RAR[c.rar].c, 130, 26); ftext(p.x, p.y - 34, c.nm.toUpperCase(), RAR[c.rar].c, 12); saveGame();
  endPick();
}
function cardsDue(R, st, force) {
  if (SET.cards === false || G.net) return false;
  if (force) return true;
  if (R.mode === 'expedition') return st === 'boss' || R.wave === 1 || R.wave === 3 || R.wave === 5;
  if (R.mode === 'endless') return st === 'wave' && R.wave > 0 && R.wave % 3 === 0 && R.wave % 10 !== 0;
  if (R.mode === 'defense') return st === 'wave' && R.wave > 0 && R.wave % 2 === 0 && R.wave < R.waves;
  return false;
}

// ---------- hull abilities (one per hull, on a cooldown) ----------
const ABIL = {
  falcon: { id: 'dash', nm: 'DASH', cd: 210, ds: 'Burst of speed. Ignores damage and smashes small enemies.' },
  vanguard: { id: 'wall', nm: 'AEGIS WALL', cd: 540, ds: 'A barrier ahead of you blocks enemy fire for 3 seconds.' },
  phantom: { id: 'slow', nm: 'TIME SLOW', cd: 640, ds: 'Enemies and their shots slow to 40% for 3 seconds.' },
  titan: { id: 'bomb', nm: 'SHOCK BOMB', cd: 900, ds: 'Erases every enemy shot and blasts all enemies.' },
  nova: { id: 'ovl', nm: 'OVERLOAD', cd: 720, ds: 'Double fire rate and piercing bolts for 4 seconds.' },
  wraith: { id: 'phase', nm: 'PHASE SHIFT', cd: 600, ds: 'Turn intangible for 1.7 seconds: shots and enemies pass through you and you fly faster.' },
  ronin: { id: 'slash', nm: 'CRESCENT', cd: 420, ds: 'Lunge forward and cut a giant arc that deletes enemy shots and slices everything in it.' },
  hive: { id: 'swarm', nm: 'SWARM', cd: 600, ds: 'Launch eight kamikaze drones that hunt down enemies.' },
  longbow: { id: 'deadeye', nm: 'DEADEYE', cd: 660, ds: 'Rail shots hit the four toughest enemies on screen instantly.' },
  aegis: { id: 'reflect', nm: 'REFLECTOR', cd: 780, ds: 'A mirror field for 2.5 seconds turns nearby enemy shots into your shots.' }
};
const abilOf = p => ABIL[p.cfg.hull] || ABIL.falcon;
function useAbility(p) {
  const R = G.run; if (!p || !p.alive || p.abCd > 0 || G.pick || G.paused || !R || R.over) return false;
  const A = abilOf(p); p.abCd = p.abMax = Math.max(60, Math.round(A.cd * p.mod.cdr)); SFX.abil(); haptic(25); if (R.tut) R.tut.abUsed = true;
  switch (A.id) {
    case 'dash': { let dx = p.lmx, dy = p.lmy; const m = Math.hypot(dx, dy); if (m < .2) { dx = 1; dy = 0; } else { dx /= m; dy /= m; } p.dvx = dx * 17; p.dvy = dy * 17; p.dashT = 11; p.inv = Math.max(p.inv, 26); p.blink = false; shock(p.x, p.y, '#a5f3fc', 80, 18); break; }
    case 'wall': p.wallT = 180; shock(p.x + 54, p.y, '#38bdf8', 120, 20); break;
    case 'slow': G.abTs = 190; shock(p.x, p.y, '#7dd3fc', 520, 44); shock(p.x, p.y, '#e0f2fe', 280, 32); break;
    case 'bomb': {
      G.flashT = 12; shake(14, 26); shock(p.x, p.y, '#ffffff', 760, 36); shock(p.x, p.y, '#fbbf24', 480, 30);
      for (const e of G.ent.en) { if (e.dead || e.x > V.W + 20) continue; hurtEnemy(e, e.boss ? e.mhp * .035 : 22 + e.mhp * .25, { own: p.id }); }
      for (const q of G.ent.eb) spark(q.x, q.y, 2, '#fde047', 3, 14, 2); G.ent.eb.length = 0; break;
    }
    case 'ovl': p.ovl = 260; shock(p.x, p.y, '#fb923c', 120, 24); break;
    case 'phase': p.phaseT = 100; p.inv = Math.max(p.inv, 100); p.blink = false; shock(p.x, p.y, '#c4b5fd', 90, 20); break;
    case 'slash': ronSlash(p); break;
    case 'swarm': hiveSwarm(p); break;
    case 'deadeye': bowDeadeye(p); break;
    case 'reflect': p.reflT = 150; shock(p.x, p.y, '#7dd3fc', 120, 22); break;
  }
  return true;
}
function shieldBurst(p) { // card: breaking shield blows enemy fire away
  const r = 130 + 45 * p.mod.burst; p.bcd = 480; shock(p.x, p.y, '#38bdf8', r * 1.7, 28); shock(p.x, p.y, '#ffffff', r, 18); SFX.power();
  const eb = G.ent.eb; for (let i = eb.length - 1; i >= 0; i--) { const q = eb[i]; if ((q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y) < r * r) { spark(q.x, q.y, 2, '#7dd3fc', 3, 12, 2); eb.splice(i, 1); } }
  for (const e of G.ent.en) if (!e.dead && !e.hide && Math.hypot(e.x - p.x, e.y - p.y) < r + e.r) hurtEnemy(e, 12 * p.mod.burst + e.mhp * .04, { own: p.id });
}

// ---------- per-pilot upkeep: cooldowns, regen, wingmen, orbit drones ----------
function updMeta(p) {
  if (p.abCd > 0) p.abCd--; if (p.wallT > 0) p.wallT--; if (p.ovl > 0) p.ovl--; if (p.gzc > 0) p.gzc--; if (p.bcd > 0) p.bcd--;
  if (p.mod.regen && p.hp < p.mhp) p.hp = Math.min(p.mhp, p.hp + p.mod.regen * .015);
  if (p.phaseT > 0) { p.phaseT--; p.inv = Math.max(p.inv, 3); p.blink = false; }
  if (p.reflT > 0) { p.reflT--; const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j]; if ((q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y) < 96 * 96) { pb(p, q.x, q.y, -q.vx * 1.4, -q.vy * 1.4, 'ion', { d: 7 * p.st.dmg, r: 4, c: '#7dd3fc', l: 90 }); spark(q.x, q.y, 3, '#7dd3fc', 3, 12, 2); eb.splice(j, 1); } } }
  syncDrones(p); updDrones(p); updOrbs(p);
}
const DSLOT = [[-30, -58], [-30, 58], [-80, 0], [-58, -104]];
function syncDrones(p) {
  const n = Math.min(4, (p.pl.up.drn | 0) + (p.mod.xdr | 0) + (p.cfg.hull === 'hive' ? 2 : 0)); if (p.dr.length === n) return;
  while (p.dr.length < n) p.dr.push({ x: p.x - 30, y: p.y, vx: 0, vy: 0, fcd: 20 + p.dr.length * 9, fl: 0 });
  p.dr.length = n;
}
function updDrones(p) {
  if (!p.dr.length) return;
  const dm = 3 * (1 + .25 * (p.pl.up.drd | 0)) * p.st.dmg * (G.pdm || 1);
  p.dr.forEach((d, i) => {
    const s = DSLOT[i], tx = p.x + s[0], ty = p.y + s[1] + Math.sin(G.t * .05 + i * 2) * 5;
    d.vx += (tx - d.x) * .07; d.vy += (ty - d.y) * .07; d.vx *= .78; d.vy *= .78; d.x += d.vx; d.y += d.vy; if (d.fl > 0) d.fl--;
    if (--d.fcd > 0) return;
    let t = null, bd = 640 * 640;
    for (const e of G.ent.en) { if (e.dead || e.hide || e.x > V.W - 20 || e.x < d.x) continue; const dd = (e.x - d.x) * (e.x - d.x) + (e.y - d.y) * (e.y - d.y) * 2.2; if (dd < bd) { bd = dd; t = e; } }
    if (!t) { d.fcd = 8; return; }
    const a = Math.atan2(t.y - d.y, t.x - d.x); d.fcd = Math.round(24 / (p.od > 0 ? 1.5 : 1)); d.fl = 6;
    pb(p, d.x + 10, d.y, Math.cos(a) * 13, Math.sin(a) * 13, 'ion', { d: dm, r: 3, c: p.cfg.accent, l: 70 });
  });
}
function updOrbs(p) {
  const n = p.mod.orb | 0; p.orbP = [];
  if (!n) return;
  p.oa += .07;
  for (let i = 0; i < n; i++) {
    const a = p.oa + i / n * TAU, x = p.x + Math.cos(a) * 54, y = p.y + Math.sin(a) * 54, r = 11; p.orbP.push({ x, y });
    const eb = G.ent.eb; for (let j = eb.length - 1; j >= 0; j--) { const q = eb[j], rr = r + q.r; if ((q.x - x) * (q.x - x) + (q.y - y) * (q.y - y) < rr * rr) { spark(q.x, q.y, 3, '#67e8f9', 3, 12, 2); eb.splice(j, 1); } }
    for (const e of G.ent.en) { if (e.dead || e.hide || e.x > V.W || e.odT > G.t) continue; const rr = r + e.r * .8; if ((e.x - x) * (e.x - x) + (e.y - y) * (e.y - y) < rr * rr) { e.odT = G.t + 22; spark(x, y, 4, '#67e8f9', 3, 12, 2); hurtEnemy(e, 9 + 3 * n, { own: p.id }); } }
  }
}

// ---------- weapon levels + evolutions ----------
const WMAXLV = 4;
const WEVO = {
  twin: { nm: 'Twin Pulse EX', ds: 'Three piercing bolts per volley' },
  spread: { nm: 'Scatter Storm', ds: '7 pellets, +15% damage' },
  lancer: { nm: 'Lancer Prime', ds: 'Twin lances, wider and deadlier' },
  ion: { nm: 'Ion Storm', ds: 'Double stream, +20% damage' },
  missile: { nm: 'Swarm Missiles', ds: '4 missiles with bigger blasts' },
  orb: { nm: 'Nova Orb', ds: 'Bigger orb that explodes on contact' },
  arc: { nm: 'Storm Caster', ds: 'Lightning chains through 5 enemies' },
  rail: { nm: 'Rail Prime', ds: 'Main slug plus two flanking slugs' }
};
const wBase = id => Math.max(180, Math.round(WPN[id].price * .28));
const wlvOf = (pl, id) => (pl.wlv && pl.wlv[id]) | 0;
const wevOf = (pl, id) => !!(pl.wevo && pl.wevo[id]);
const wupPrice = (id, lv) => Math.round(wBase(id) * [1, 1.45, 2.1, 3.05][Math.min(3, lv)]);
const wevoPrice = id => Math.round(wBase(id) * 5);
const wName = (pl, id) => wevOf(pl, id) ? WEVO[id].nm : WPN[id].nm;
function buyWup(pl, id) {
  if (pl.wown.indexOf(id) < 0) return; const lv = wlvOf(pl, id); if (lv >= WMAXLV) return; const pr = wupPrice(id, lv);
  if (SAVE.cores < pr) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; }
  SAVE.cores -= pr; pl.wlv = pl.wlv || {}; pl.wlv[id] = lv + 1; SFX.buy(); saveGame(); UI.refresh();
}
function buyWevo(pl, id) {
  if (pl.wown.indexOf(id) < 0 || wevOf(pl, id) || wlvOf(pl, id) < WMAXLV) return; const pr = wevoPrice(id);
  if (SAVE.cores < pr) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; }
  SAVE.cores -= pr; pl.wevo = pl.wevo || {}; pl.wevo[id] = true; SFX.buy(); SFX.power(); saveGame(); UI.refresh();
}

// ---------- boss weak points ----------
// every phase has one weak point. While it is intact the boss body is armored; breaking it staggers the boss and opens a damage window.
const POD_AT = [[-.74, -.46], [-.74, .46], [-.9, 0], [-.6, -.74], [-.6, .74]];
function mkPod(e, B, i) { const o = POD_AT[i % POD_AT.length], hp = Math.round(e.mhp * (.08 + i * .01)); return { ox: o[0] * e.r, oy: o[1] * e.r, r: 18 + B.w / 42, hp, mhp: hp, dead: false, age: 0, hf: 0 }; }
const podOf = e => { const pd = e.pods && e.pods[e.ph]; return pd && !pd.dead ? pd : null; };
const bossArmor = e => e.stg > 0 ? 1.6 : podOf(e) ? .75 : 1;
function podHit(e, b) { // can this bullet strike the weak point right now?
  if (e.dead || e.st !== 1 || e.inv || e.pause > 0) return null; const pd = podOf(e); if (!pd || pd.age < 18) return null;
  const x = e.x + pd.ox, y = e.y + pd.oy, rr = b.r + pd.r; return (x - b.x) * (x - b.x) + (y - b.y) * (y - b.y) < rr * rr ? pd : null;
}
function hurtPod(e, pd, dmg, b) {
  pd.hp -= dmg; pd.hf = 5; const x = e.x + pd.ox, y = e.y + pd.oy; ftext(x + rnd(-8, 8), y - pd.r - 6, Math.max(1, Math.round(dmg)), '#fde047', 12); SFX.hit(); spark(x, y, 3, '#fbbf24', 3, 12, 2);
  if (pd.hp <= 0) breakPod(e, pd, b ? b.own : -1);
}
function breakPod(e, pd, own) {
  pd.dead = true; pd.hp = 0; const x = e.x + pd.ox, y = e.y + pd.oy, B = BOSSES[e.bi];
  boom2D(x, y, 56, '#fbbf24'); shock(x, y, '#ffffff', 220, 28); shock(x, y, B.c, 340, 36); shake(9, 20); G.freeze = 6; SFX.boom(true); haptic([40, 30, 60]);
  if (R3) R3.boom(x, y, 14, 0xfbbf24, 6, 10);
  e.stg = 300; e.sp = null; e.acd = Math.max(e.acd, 90); for (const q of G.ent.eb) spark(q.x, q.y, 2, '#fbbf24', 2, 10, 2); G.ent.eb.length = 0;
  for (let i = 0; i < 4; i++) G.ent.pk.push({ k: 'core', v: 3 + e.bi, x, y, vx: rnd(-3, 1), vy: rnd(-3, 3), l: 700 });
  alertMsg('WEAK POINT DOWN - HIT THE CORE!'); ftext(x, y - 30, 'ARMOR BROKEN', '#fbbf24', 13);
  hurtEnemy(e, e.mhp * .06, { own, raw: 1 });
}
const BEXTRA = [{ k: 'aim', n: 4, s: 5.2, r: 55 }, { k: 'ring', n: 18, s: 3.4, r: 70 }];
const bossDiff = () => (SET.diff - 1) + ((G.run ? G.run.tier : 1) - 1) * .6;
function scaleAtk(a, bd) {
  if (!bd) return a; const o = Object.assign({}, a);
  if (o.n) o.n = Math.max(1, Math.round(o.n * (1 + bd * .15))); if (o.s) o.s *= 1 + bd * .05; return o;
}

// ---------- graze + rank ----------
function graze(p, b) {
  const R = G.run; if (!R || p.gzc > 0) return; p.gzc = 4; b.gz = 1; R.graze++; R.gzT = 100;
  R.score += Math.round(8 * (1 + Math.min(R.combo, 20) * .1)); if (R.combo > 0) R.comboT = Math.max(R.comboT, 45);
  if (p.abCd > 0) p.abCd = Math.max(0, p.abCd - (p.mod.graze ? 20 : 6));
  if (p.mod.graze) p.am = Math.min(p.mam, p.am + .5 * p.mod.graze);
  const a = Math.atan2(b.y - p.y, b.x - p.x); spark(p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16, 2, '#67e8f9', 2.4, 10, 1.8); SFX.graze();
  if (R.graze % 10 === 0) ftext(p.x, p.y - 40, 'GRAZE x' + R.graze, '#67e8f9', 11);
}
const RANKB = { S: .35, A: .2, B: .08, C: 0 };
function rankFor(R, win) {
  const tot = G.players.reduce((a, p) => a + p.mhp, 0) || 1, hr = R.hurt / tot, eff = 1 - R.esc / Math.max(1, R.kills + R.esc);
  let pts = win ? 40 : 15;
  pts += hr < .08 ? 30 : hr < .2 ? 22 : hr < .45 ? 12 : hr < .8 ? 5 : 0;
  pts += Math.min(20, R.graze * .5) + Math.min(10, R.maxCombo * .6) + eff * 10;
  return pts >= 92 ? 'S' : pts >= 76 ? 'A' : pts >= 58 ? 'B' : 'C';
}

// ---------- drawing for all of the above (2D overlay) ----------
function drawWing(g, d, p, t) {
  const ac = p.cfg.accent; g.save(); g.translate(d.x, d.y); g.globalCompositeOperation = 'lighter'; drawGlow(g, -9, 0, 14 + Math.random() * 2, ac, .7); if (d.fl > 0) drawGlow(g, 10, 0, 16, '#ffffff', d.fl / 8);
  g.globalCompositeOperation = 'source-over'; g.lineJoin = 'round'; g.lineWidth = 1.2; g.strokeStyle = ac; g.fillStyle = p.cfg.paint;
  g.beginPath(); g.moveTo(12, 0); g.lineTo(-6, -8); g.lineTo(-9, -3); g.lineTo(-7, 0); g.lineTo(-9, 3); g.lineTo(-6, 8); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#e0f2fe'; g.beginPath(); g.ellipse(2, 0, 3.6, 1.8, 0, 0, TAU); g.fill(); g.restore();
}
function drawMeta(g, t) {
  const R = G.run; if (!R) return;
  drawModes(g, t); drawCombat(g, t);
  if (G.abTs > 0 && !SET.reduce) { g.fillStyle = 'rgba(125,211,252,' + (Math.min(1, G.abTs / 20) * .07).toFixed(3) + ')'; g.fillRect(0, 0, V.W, V.H); }
  for (const p of G.players) {
    if (!p.alive) continue;
    for (const d of p.dr) drawWing(g, d, p, t);
    if (p.orbP) for (const o of p.orbP) { g.save(); g.translate(o.x, o.y); g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, 22, '#67e8f9', .55); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#0c4a6e'; g.strokeStyle = '#a5f3fc'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#e0f2fe'; g.beginPath(); g.arc(-2, -2, 2.6, 0, TAU); g.fill(); g.restore(); }
    if (p.wallT > 0) {
      const wx = p.x + 54, hh = 100, a = Math.min(1, p.wallT / 20) * (p.wallT < 40 && (t >> 2) & 1 ? .45 : 1);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; const gr = g.createLinearGradient(wx - 14, 0, wx + 14, 0); gr.addColorStop(0, 'rgba(56,189,248,0)'); gr.addColorStop(.5, 'rgba(186,230,253,.85)'); gr.addColorStop(1, 'rgba(56,189,248,0)'); g.fillStyle = gr; g.fillRect(wx - 14, p.y - hh, 28, hh * 2);
      g.strokeStyle = 'rgba(224,242,254,.7)'; g.lineWidth = 1.5; for (let y = -hh; y < hh; y += 22) { g.beginPath(); g.moveTo(wx - 9, p.y + y); g.lineTo(wx, p.y + y + 11); g.lineTo(wx + 9, p.y + y); g.stroke(); } g.restore();
    }
    if (p.ovl > 0) { g.globalCompositeOperation = 'lighter'; drawGlow(g, p.x, p.y, 78, '#fb923c', .32 + Math.sin(t * .5) * .1); g.globalCompositeOperation = 'source-over'; }
    if (p.phaseT > 0) { g.save(); g.strokeStyle = 'rgba(196,181,253,.8)'; g.setLineDash([6, 6]); g.lineDashOffset = -t; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 34 + Math.sin(t * .4) * 2, 0, TAU); g.stroke(); g.globalCompositeOperation = 'lighter'; drawGlow(g, p.x, p.y, 54, '#a78bfa', .28); g.restore(); }
    if (p.reflT > 0) { const a = Math.min(1, p.reflT / 20) * (p.reflT < 40 && (t >> 2) & 1 ? .5 : 1); g.save(); g.translate(p.x, p.y); g.globalAlpha = a; g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(186,230,253,.85)'; g.lineWidth = 2.5; g.beginPath(); for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + t * .02; g.lineTo(Math.cos(an) * 96, Math.sin(an) * 96); } g.closePath(); g.stroke(); drawGlow(g, 0, 0, 100, '#38bdf8', .16); g.restore(); }
    if (p.dashT > 0) { g.globalCompositeOperation = 'lighter'; for (let k = 1; k < 6; k++) drawGlow(g, p.x - p.dvx * k * .9, p.y - p.dvy * k * .9, 26 - k * 3, '#a5f3fc', .5 - k * .07); g.globalCompositeOperation = 'source-over'; }
  }
  const e = R.boss;
  if (e && !e.dead && e.pods && e.st === 1) {
    const pd = podOf(e), B = BOSSES[e.bi];
    g.save(); g.translate(e.x, e.y); g.lineWidth = 2.5; g.setLineDash([10, 9]); g.lineDashOffset = -t * .4; g.strokeStyle = e.stg > 0 ? 'rgba(251,191,36,.85)' : pd ? 'rgba(148,163,184,.55)' : 'rgba(0,0,0,0)'; g.beginPath(); g.arc(0, 0, e.r * 1.28, 0, TAU); g.stroke(); g.setLineDash([]); g.restore();
    if (pd) {
      const x = e.x + pd.ox, y = e.y + pd.oy, k = Math.min(1, pd.age / 20), r = pd.r * (.4 + .6 * k), pulse = .55 + .25 * Math.sin(t * (pd.hp < pd.mhp * .4 ? .5 : .2));
      g.save(); g.translate(x, y); g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, r * 2.6, '#ef4444', pulse); g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#1c1917'; g.strokeStyle = pd.hf > 0 ? '#ffffff' : '#fbbf24'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .01; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke();
      g.fillStyle = pd.hf > 0 ? '#ffffff' : '#fb7185'; g.beginPath(); g.arc(0, 0, r * .52, 0, TAU); g.fill(); g.fillStyle = '#450a0a'; g.beginPath(); g.arc(0, 0, r * .22, 0, TAU); g.fill();
      g.strokeStyle = '#fde047'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r + 7, -H, -H + TAU * Math.max(0, pd.hp / pd.mhp)); g.stroke();
      if (k >= 1) { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.6; g.rotate(t * .03); for (let i = 0; i < 4; i++) { g.rotate(H); g.beginPath(); g.moveTo(r + 13, 0); g.lineTo(r + 20, 0); g.stroke(); } }
      g.restore();
    }
  }
}

// ================= MODES: daily challenge, station defense, no-hit run, the vault, assist + death hints =================

// ---------- daily challenge ----------
const DMODS = [
  { id: 'glass', nm: 'GLASS CANNON', ds: 'Your hull and shield are halved. Your damage is up 70%.', ap: R => { G.players.forEach(p => { p.mhp = Math.round(p.mhp * .5); p.hp = p.mhp; p.msh = Math.round(p.msh * .5); p.sh = p.msh; p.st.dmg *= 1.7; }); } },
  { id: 'swarm', nm: 'SWARM', ds: 'Far more enemies, but each one is 35% weaker.', ap: R => { R.hpm *= .65; R.swarm = 1.6; } },
  { id: 'iron', nm: 'IRON HIDE', ds: 'Enemies have 70% more health and drop 50% more cores.', ap: R => { R.hpm *= 1.7; G.players.forEach(p => { p.mod.loot += .5; }); } },
  { id: 'overdrive', nm: 'OVERDRIVE', ds: 'You fire 25% faster. Enemy shots hurt 30% more.', ap: R => { R.edm *= 1.3; G.players.forEach(p => { p.st.rate *= 1.25; }); } },
  { id: 'lowpwr', nm: 'LOW POWER', ds: 'Plasma capacity is halved, but kills drop far more ammo.', ap: R => { G.players.forEach(p => { p.mam = Math.round(p.mam * .5); p.am = p.mam; }); R.ammoDrop = 2.2; } },
  { id: 'chrono', nm: 'CHRONO', ds: 'Abilities recharge 2.5x faster. Enemies are 25% tougher.', ap: R => { R.hpm *= 1.25; G.players.forEach(p => { p.mod.cdr *= .4; }); } },
  { id: 'plated', nm: 'PLATED', ds: 'You take 30% less damage. Waves are 30% larger.', ap: R => { R.swarm = 1.3; G.players.forEach(p => { p.mod.arm *= .7; }); } }
];
const dayKey = d => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function dailyInfo(key) {
  key = key || dayKey(); const seed = hashStr('aetheria-' + key), n = Math.max(1, Math.min(SAVE.wu, WORLDS.length));
  return { key, seed, w: seed % n, lv: 6 + (seed >>> 8) % 6, mod: DMODS[(seed >>> 4) % DMODS.length] };
}
function startDaily() { const di = dailyInfo(), o = { mode: 'expedition', var: 'daily', w: di.w, lv: di.lv, tier: 1, co: SAVE.players === 2, daily: di }; G.last = o; beginRun(o); }
function pruneDaily() { const dl = SAVE.dl; for (const k of ['best', 'done']) Object.keys(dl[k]).sort().reverse().slice(14).forEach(x => { delete dl[k][x]; }); }
function dailyStreakNow() { const dl = SAVE.dl, t = dayKey(), y = new Date(); y.setDate(y.getDate() - 1); return dl.last === t || dl.last === dayKey(y) ? dl.streak : 0; }

// ---------- run variants (daily / no-hit / vault are flavoured expeditions) ----------
function setupVariant(R, o) {
  if (o.var === 'hardcore') return setupHardcore(R);
  if (o.var === 'versus') return setupVersus(R);
  const sp = R.spec; if (!sp) return;
  if (o.var === 'gallery') return setupGallery(R, o);
  if (o.var === 'retro') return setupRetro(R);
  if (o.var === 'chal') return setupChal(R, o);
  if (o.var === 'custom') return setupCustom(R, o);
  if (o.var === 'crash') return setupCrash(R, o);
  if (o.var === 'daily') { const di = o.daily || dailyInfo(); R.dinfo = di; R.rng = seeded(di.seed); sp.type = 'B'; sp.waves = R.waves = 5; sp.name = 'Daily Challenge'; R.hazMode = false; di.mod.ap(R); }
  else if (o.var === 'nohit') { sp.type = 'B'; sp.waves = R.waves = 2; sp.name = 'No-Hit Run'; R.hazMode = false; }
  else if (o.var === 'vault') { sp.type = 'B'; sp.waves = R.waves = 6; sp.name = 'The Vault'; R.hazMode = false; R.bmul = 1.1; R.hpm = Math.max(R.hpm, 1.15 + R.w * .08); }
}
function applyAssist() { G.players.forEach(p => { p.mhp = Math.round(p.mhp * 1.4); p.hp = p.mhp; p.msh = Math.round(p.msh * 1.4); p.sh = p.msh; }); }
function varObj(R) { if (R.var === 'custom' || R.var === 'crash') return (R.var === 'crash' ? 'AETHEROS' : (R.cust.nm || 'CUSTOM').toUpperCase()) + (R.stage === 'boss' ? ' - BOSS' : ' - WAVE ' + Math.min(R.wave + 1, R.waves) + '/' + R.waves); if (R.var === 'versus') { const s = Math.max(0, Math.ceil(R.vs.time / 60)); return 'VERSUS ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' - ' + G.players.map((p, i) => 'P' + (i + 1) + ' ' + fmt(Math.round(p.score))).join(' vs '); } if (R.var === 'chal') return 'CHALLENGE ' + R.chal.code + ' - WAVE ' + Math.min(R.wave + 1, R.waves) + '/' + R.waves + ' - BEAT ' + fmt(R.chal.target); if (R.var === 'hardcore') return 'HARDCORE - SECTOR ' + R.hc.sect + ' - WAVE ' + (R.wave + 1) + ' - ' + WORLDS[R.w].nm.toUpperCase(); if (R.var === 'gallery') return 'REMATCH' + (R.gmods.length ? ' - ' + R.gmods.map(k => GMODS[k].nm).join(' + ') : ''); const w = Math.min(R.wave + 1, R.waves), tag = R.var === 'daily' ? 'DAILY' : R.var === 'nohit' ? 'NO-HIT' : R.var === 'retro' ? '1-UP' : 'VAULT'; return tag + (R.stage === 'boss' ? ' - BOSS' : ' - WAVE ' + w + '/' + R.waves) + (R.var === 'daily' && R.dinfo ? ' - ' + R.dinfo.mod.nm : '') + (R.assist ? ' - ASSIST' : ''); }
function varBanner(R) { if (R.var === 'daily') banner('DAILY CHALLENGE', R.dinfo ? R.dinfo.mod.nm : ''); else if (R.var === 'nohit') banner('NO-HIT RUN', 'ONE HIT ENDS IT'); else if (R.var === 'crash') banner('AETHEROS', 'THE GAME CRASHED. YOU DID NOT.', false); else if (R.var === 'custom') banner((R.cust.nm || 'CUSTOM LEVEL').toUpperCase(), 'CUSTOM LEVEL', false); else if (R.var === 'versus') banner('VERSUS', 'MOST POINTS IN 2 MINUTES WINS', false); else if (R.var === 'chal') banner('CHALLENGE', R.chal.target ? 'SCORE TO BEAT: ' + fmt(R.chal.target) : R.chal.code, false); else if (R.var === 'hardcore') banner('HARDCORE', 'ONE LIFE. NO SECOND CHANCES.'); else if (R.var === 'gallery') banner('REMATCH', BOSSES[R.w].nm.toUpperCase() + (R.gmods.length ? ' - x' + galleryMult(R.gmods).toFixed(1) + ' REWARDS' : ''), true); else if (R.var === 'retro') banner('1-UP', 'PRESS START', false); else banner('THE VAULT', 'GOLD EVERYWHERE. STAY SHARP.'); }

function variantFinish(R, win, d) {
  const v = R.var;
  if (v === 'hardcore') return hcFinish(R, win, d);
  if (v === 'versus') return versusFinish(R, win, d);
  if (v === 'chal') return chalFinish(R, win, d);
  if (v === 'custom') return customFinish(R, win, d);
  if (v === 'crash') return crashFinish(R, win, d);
  if (v === 'gallery') return galleryFinish(R, win, d);
  if (v === 'retro') { d.name = '1-UP: Retro Run'; d.bonus = win ? 2500 : R.wave * 100; if (win && !R.assist) SAVE.flags.retro = 1; return; }
  if (v === 'daily') {
    const di = R.dinfo || dailyInfo(), dl = SAVE.dl; d.name = 'Daily Challenge'; d.dkey = di.key;
    d.bonus = win ? Math.round(160 + R.score / 60) : Math.round(R.score / 120);
    if (!R.assist) {
      if (R.score > (dl.best[di.key] || 0)) { dl.best[di.key] = Math.round(R.score); d.best = true; }
      if (win && dl.last !== di.key) { const y = new Date(); y.setDate(y.getDate() - 1); dl.streak = dl.last === dayKey(y) ? dl.streak + 1 : 1; dl.last = di.key; dl.done[di.key] = 1; d.streak = dl.streak; d.bonus += 100 + 25 * Math.min(dl.streak, 10); d.first = true; }
    }
    pruneDaily();
  } else if (v === 'nohit') {
    d.name = 'No-Hit Run'; d.bonus = win ? 300 + 140 * R.w : 30 * R.wave; if (win && !R.assist) SAVE.hi.nohit[R.w] = 1;
  } else if (v === 'vault') {
    d.name = 'The Vault'; d.bonus = win ? 1200 : R.wave * 70;
    if (!R.assist) { if (R.score > SAVE.hi.vault.score) { SAVE.hi.vault.score = Math.round(R.score); d.best = true; } if (win) { SAVE.hi.vault.clears++; F_vault(d); } }
  }
}
function F_vault(d) { SAVE.flags.vault = 1; if (!SAVE.unl.aegis) unlockHull('aegis', d); }
function defenseFinish(R, win, d) {
  const s = R.stn; d.name = 'Station Defense'; d.stn = Math.round(s.hp / s.mhp * 100); d.lost = !!R.lost;
  d.bonus = R.wave * 45 + (win ? 500 + Math.round(s.hp / s.mhp * 500) : 0);
  if (!R.assist) { if (R.score > SAVE.hi.def.score) { SAVE.hi.def.score = Math.round(R.score); d.best = true; } SAVE.hi.def.wave = Math.max(SAVE.hi.def.wave, R.wave + (win ? 1 : 0)); }
}
function unlockHull(id, d) {
  if (SAVE.unl[id]) return; SAVE.unl[id] = 1; SAVE.pl.forEach(pl => { if (pl.own.hull.indexOf(id) < 0) pl.own.hull.push(id); });
  if (d) d.unlock = PARTS.hull[id].nm.toUpperCase();
  toast('NEW SHIP UNLOCKED', PARTS.hull[id].nm.toUpperCase() + ' is waiting in your hangar', '#fbbf24');
}
// bookkeeping at the end of every run: stats, flags, per-sector fail streaks
function afterRun(R, win, d) {
  const S = SAVE, F = S.flags, st = S.st;
  st.time += d.time; if (win) st.wins++; else st.deaths++;
  if (R.mode !== 'training' && R.mode !== 'tutorial') st.bosses += R.bossDown | 0;
  const hh = G.players[0] ? G.players[0].cfg.hull : 'falcon'; st.hull[hh] = (st.hull[hh] | 0) + 1;
  if (R.assist) return;
  if (R.mode === 'expedition' && !R.var) { const k = R.w + ':' + R.lv + ':' + R.tier; if (win) delete S.fails[k]; else S.fails[k] = (S.fails[k] | 0) + 1; d.fails = S.fails[k] | 0; }
  if (win && R.bossDown && R.hurt === 0 && R.mode !== 'training') F.untouch = 1;
  if (win && R.low !== undefined && R.low <= .1 && R.mode !== 'training') F.close = 1;
  if (win && G.players.length > 1) F.coop = 1;
  if (win && R.var === 'nohit') { F.nohit = 1; unlockHull('wraith', d); }
  if (R.mode === 'defense' && win) F.defwin = 1;
  if (R.var === 'daily' && win) F.daily = 1;
  if (G.players.some(p => Object.keys(p.cards).length >= 8)) F.deck8 = 1;
}
const HINTS = {
  b: ['Enemy shots are slower than you. Slide sideways early instead of at the last second.', 'Stay on the left side of the screen. You get more time to read patterns before shots reach you.', 'Passing close to a shot (a graze) charges your ability and adds bonus score.', 'Use your ability (Shift / R / X or the ability button) to bail out of tight spots.'],
  ram: ['Touching an enemy hurts. Shoot them before they get close, or dash through small ones.', 'Tough ships take many hits. A piercing or heavy gun clears them faster.'],
  beam: ['Beams show a thin warning line first. Leave that lane before it fires.'],
  geyser: ['Lava geysers show a red warning column. Stay out of it until it fades.'],
  bolt: ['Lightning shows a flickering dotted line first. Slide out of that column before it strikes.'],
  boss: ['Bosses have a glowing weak point. Shoot it to break their armor and stagger them.', 'Save your ability for the boss. Time slow or the shock bomb can turn a fight.', 'Boss attacks change each phase. Learn the first one, then adapt.'],
  nohit: ['Take it slow. In a No-Hit run the safest spot is usually the middle-left of the screen.']
};
function hintFor(d) {
  const k = d.mode === 'nohit' ? 'nohit' : d.hadBoss ? 'boss' : d.killer, arr = HINTS[k] || HINTS.b;
  return arr[((SAVE.st.deaths | 0) + (d.fails | 0)) % arr.length];
}

// ---------- station defense ----------
const STN_X = 62;
function mkStation() { return { hp: 600, mhp: 600, sh: 240, msh: 240, hf: 0, rg: 0, dead: false }; }
function stnHit(R, dmg, x, y) {
  const s = R.stn; if (!s || s.dead || R.over || G.god) return;
  dmg = Math.max(1, Math.round(dmg * (R.assist ? .65 : 1))); s.rg = 240; s.hf = 8;
  if (s.sh > 0) { const a = Math.min(s.sh, dmg); s.sh -= a; dmg -= a; spark(STN_X + 8, y, 3, '#7dd3fc', 3, 12, 2); if (s.sh <= 0) { ftext(86, y, 'SHIELD DOWN', '#38bdf8', 11); shake(3, 8); } }
  if (dmg > 0) { s.hp -= dmg; spark(40, y, 5, '#fb923c', 4, 20, 3); smoke(40, y, 1, 12); shake(2, 5); SFX.hurt(); }
  if (s.hp <= 0) { s.hp = 0; s.dead = true; stationLost(R); }
}
function stationLost(R) {
  if (R.stage === 'dead' || R.stage === 'clear') return; R.stage = 'dead'; R.st = 0; R.lost = 1; banner('STATION LOST', ''); music.stop();
  boom2D(30, V.H / 2, 160, '#f97316'); shock(30, V.H / 2, '#ffffff', 420, 34); shake(18, 40); G.freeze = 10; SFX.boom(true);
}
function stnRam(e) { const R = G.run; e.dead = true; e.esc = true; boom2D(e.x, e.y, e.w * .7, '#f97316'); SFX.boom(); stnHit(R, 7 + e.d.cost * 5 + (e.d.elite ? 22 : 0), e.x, e.y); }
function stnRepair(R) { const s = R.stn; if (s.dead) return; s.hp = Math.min(s.mhp, s.hp + s.mhp * .15); s.sh = s.msh; ftext(100, V.H / 2, 'STATION REPAIRED', '#4ade80', 13); SFX.power(); }
function updStation(R) {
  const s = R.stn; if (s.hf > 0) s.hf--; if (s.rg > 0) s.rg--; else if (s.sh < s.msh && !s.dead) s.sh = Math.min(s.msh, s.sh + .3);
  if (s.hp < s.mhp * .35 && !s.dead && G.t % 14 === 0) { smoke(rnd(10, 50), rnd(80, V.H - 80), 1, 24); spark(rnd(10, 50), rnd(80, V.H - 80), 2, '#fb923c', 2, 16, 2); }
}
function drawStation(g, t, R) {
  const s = R.stn, H = V.H, f = s.hf > 0 ? 1 : 0, hpF = s.hp / s.mhp, shF = s.sh / s.msh;
  g.save();
  const gr = g.createLinearGradient(0, 0, 46, 0); gr.addColorStop(0, '#05080f'); gr.addColorStop(.55, '#1e293b'); gr.addColorStop(1, '#475569'); g.fillStyle = gr; g.fillRect(-6, 0, 52, H);
  g.fillStyle = 'rgba(148,163,184,.18)'; for (let y = 24; y < H; y += 46) g.fillRect(-6, y, 52, 2);
  for (let y = 40; y < H; y += 46) { const on = ((t >> 5) + (y >> 4)) % 5 !== 0; g.fillStyle = on ? 'rgba(253,224,71,.8)' : 'rgba(80,60,20,.7)'; g.fillRect(8, y, 6, 4); g.fillRect(20, y, 6, 4); }
  // docking spire in the middle
  g.fillStyle = '#334155'; g.beginPath(); g.moveTo(40, H / 2 - 74); g.lineTo(74, H / 2 - 26); g.lineTo(74, H / 2 + 26); g.lineTo(40, H / 2 + 74); g.closePath(); g.fill();
  g.strokeStyle = '#94a3b8'; g.lineWidth = 2; g.stroke();
  const blink = (t >> 4) & 1; g.fillStyle = blink ? '#ef4444' : '#7f1d1d'; g.beginPath(); g.arc(72, H / 2 - 24, 3.5, 0, TAU); g.fill(); g.fillStyle = blink ? '#7f1d1d' : '#22c55e'; g.beginPath(); g.arc(72, H / 2 + 24, 3.5, 0, TAU); g.fill();
  if (hpF < 1) { g.fillStyle = 'rgba(0,0,0,' + (1 - hpF) * .45 + ')'; g.fillRect(-6, 0, 52, H); }
  // shield dome
  if (shF > 0 || f) {
    g.globalCompositeOperation = 'lighter'; const a = .12 + .32 * shF + f * .4; g.strokeStyle = 'rgba(56,189,248,' + a + ')'; g.lineWidth = 3 + f * 4; g.shadowColor = '#38bdf8'; g.shadowBlur = 14;
    g.beginPath(); g.ellipse(0, H / 2, STN_X + 14, H * .62, 0, -PI / 2, PI / 2); g.stroke();
    g.fillStyle = 'rgba(56,189,248,' + (.03 + .07 * shF + f * .12) + ')'; g.beginPath(); g.ellipse(0, H / 2, STN_X + 14, H * .62, 0, -PI / 2, PI / 2); g.fill();
  }
  g.restore();
}
// vault enemies shimmer gold; other mode flourishes
function drawModes(g, t) {
  const R = G.run; if (!R) return;
  if (R.stn) drawStation(g, t, R);
  if (R.var === 'vault') { g.globalCompositeOperation = 'lighter'; for (const e of G.ent.en) if (e.gold && !e.dead && !e.hide) drawGlow(g, e.x, e.y, e.w * (e.boss ? .55 : .75), '#fbbf24', .3 + Math.sin(t * .15 + e.x) * .08); g.globalCompositeOperation = 'source-over'; }
}

// ================= MUSIC: a composed, mixed score per world that reacts to the fight =================
// Signal chain: instrument buses -> (reverb send, tempo-synced echo send) -> compressor -> low-pass (muffles when
// the hull is critical) -> music volume. Pads duck under the kick. Each world has its own key, mode, tempo, chord
// progression, written melody (call + answer phrases), drum groove, bass line and lead instrument.
// Layers: 0 calm (pads + soft arp) -> 1 waves (bass, light drums, melody) -> 2 busy (full kit, arps)
//         -> 3 boss (faster, darker chords, heavy drums, doubled lead) -> 4 late boss (counter-arp, crashes, risers).
let noiseBuf = null;
const SCALE = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], phr: [0, 1, 3, 5, 7, 8, 10], lyd: [0, 2, 4, 6, 7, 9, 11], mix: [0, 2, 4, 5, 7, 9, 10], hmin: [0, 2, 3, 5, 7, 8, 11] };
const DRUMS = { // 16 steps per bar: k kick, s snare, c clap, h closed hat, o open hat, t tom, p perc
  synthwave: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
  tribal: { k: 'x.....x...x.....', t: '..x.x...x..x.x.x', p: 'x..x..x.x..x..x.' },
  halftime: { k: 'x.........x.....', s: '........x.......', h: 'xxxxxxxxxxxxxxxx' },
  ambient: { k: 'x...............', p: '......x.......x.', h: '..x...x...x...x.' },
  industrial: { k: 'x...x...x...x...', c: '....x.......x...', h: '..x...x...x...x.', p: 'x..x..x...x..x..' },
  breaks: { k: 'x.........x.....', s: '....x.......x..x', h: 'x.x.x.x.x.x.x.xx' },
  electro: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', o: '......x.......x.' },
  tick: { k: 'x.......x.......', s: '....x.......x...', p: 'xxxxxxxxxxxxxxxx' },
  rock: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  dnb: { k: 'x.........x.....', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
  epic: { k: 'x...x...x...x...', t: '..x...x.xx..x.x.', s: '....x.......x...' },
  boss: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx', o: '..x...x...x...x.' }
};
const BASSP = { // R root, r octave up, 3 third, 5 fifth, 6 sixth, _ hold, . rest
  octave8: 'R.r.R.r.R.r.R.r.', pulse: 'R...R...R...R...', gallop: 'R.RRR.RRR.RRR.RR', drone: 'R_______________', rolling16: 'RRRRRRRRRRRRRRRR', offbeat: '..R...R...R...R.', walking: 'R...3...5...6...'
};
// lead: instrument; pad: 'saw' supersaw or 'soft'; arp: 'up' | 'updown' | 'sparkle' | 'none'; A/B: two-bar phrases (16 steps per bar)
const MSPEC = [
  { key: 52, sc: 'min', bpm: 112, prog: [0, 5, 2, 6], boss: [0, 5, 3, 4], lead: 'saw', pad: 'saw', drums: 'synthwave', bass: 'octave8', arp: 'up',
    A: '7 _ _ 6 7 _ 9 _ 8 _ _ 7 6 _ 4 _ 5 _ _ _ 4 _ 2 _ 4 _ _ _ . . . .', B: '4 _ 5 _ 6 _ 7 _ 9 _ _ 8 7 _ 6 _ 7 _ _ _ 6 _ 4 _ 2 _ _ _ . . 4 _' },
  { key: 50, sc: 'dor', bpm: 104, prog: [0, 3, 0, 6], boss: [0, 3, 5, 6], lead: 'flute', pad: 'soft', drums: 'tribal', bass: 'pulse', arp: 'updown',
    A: '0 _ 2 . 3 _ 2 . 0 _ . . 4 _ 3 _ 2 _ 0 _ . . 3 _ 2 _ 0 _ -1 _ 0 _', B: '4 _ _ 5 4 _ 3 _ 2 _ _ _ 3 _ 4 _ 7 _ _ _ 6 _ 4 _ 3 _ 2 _ 0 _ _ _' },
  { key: 52, sc: 'phr', bpm: 96, prog: [0, 1, 0, 6], boss: [0, 1, 5, 6], lead: 'twang', pad: 'soft', drums: 'halftime', bass: 'gallop', arp: 'none',
    A: '0 _ _ 1 0 _ _ . 3 _ 2 _ 1 _ 0 _ 4 _ _ _ 3 _ 1 _ 0 _ _ _ . . . .', B: '7 _ _ 6 5 _ 4 _ 3 _ _ 4 3 _ 1 _ 0 _ _ _ 1 _ 3 _ 1 _ _ _ 0 _ _ _' },
  { key: 45, sc: 'hmin', bpm: 84, prog: [0, 5, 3, 4], boss: [0, 1, 3, 4], lead: 'bell', pad: 'saw', drums: 'ambient', bass: 'drone', arp: 'sparkle',
    A: '4 _ _ _ _ _ 6 _ 7 _ _ _ _ _ 6 _ 4 _ _ _ 3 _ _ _ 2 _ _ _ _ _ . .', B: '2 _ _ _ 4 _ _ _ 6 _ _ _ 5 _ _ _ 4 _ _ _ _ _ _ _ . . . . . . . .' },
  { key: 48, sc: 'phr', bpm: 120, prog: [0, 1, 6, 0], boss: [0, 1, 4, 1], lead: 'saw', pad: 'saw', drums: 'industrial', bass: 'rolling16', arp: 'up',
    A: '0 _ 0 _ 1 _ . . 0 _ 0 _ 3 _ 1 _ 0 _ 0 _ 1 _ . . -1 _ _ _ 0 _ _ _', B: '4 _ _ 3 4 _ 5 _ 4 _ 1 _ 3 _ _ _ 1 _ _ 0 1 _ 3 _ 1 _ 0 _ -1 _ _ _' },
  { key: 47, sc: 'min', bpm: 92, prog: [0, 5, 2, 6], boss: [0, 3, 5, 4], lead: 'bell', pad: 'saw', drums: 'breaks', bass: 'pulse', arp: 'sparkle',
    A: '7 _ 6 _ 4 _ 6 _ 7 _ _ _ 9 _ _ _ 8 _ 7 _ 6 _ 4 _ 6 _ _ _ . . . .', B: '4 _ 6 _ 7 _ 9 _ 11 _ _ _ 9 _ 7 _ 8 _ _ _ 7 _ 6 _ 7 _ _ _ . . . .' },
  { key: 50, sc: 'phr', bpm: 128, prog: [0, 1, 0, 5], boss: [0, 1, 6, 1], lead: 'brass', pad: 'saw', drums: 'industrial', bass: 'rolling16', arp: 'none',
    A: '0 _ 0 0 1 _ 0 _ 3 _ _ 1 0 _ . . 0 _ 0 0 1 _ 3 _ 4 _ 3 _ 1 _ 0 _', B: '7 _ _ _ 8 _ 7 _ 5 _ _ _ 4 _ 3 _ 1 _ _ _ 3 _ 1 _ 0 _ _ _ . . . .' },
  { key: 43, sc: 'min', bpm: 78, prog: [0, 3, 5, 4], boss: [0, 1, 5, 4], lead: 'flute', pad: 'soft', drums: 'ambient', bass: 'drone', arp: 'updown',
    A: '0 _ _ _ _ _ 2 _ 3 _ _ _ _ _ . . 4 _ _ _ 3 _ 2 _ 0 _ _ _ _ _ . .', B: '-1 _ _ _ 0 _ _ _ 2 _ _ _ 4 _ _ _ 3 _ _ _ _ _ 2 _ 0 _ _ _ . . . .' },
  { key: 57, sc: 'min', bpm: 132, prog: [0, 5, 6, 0], boss: [0, 5, 6, 4], lead: 'chip', pad: 'saw', drums: 'electro', bass: 'offbeat', arp: 'up',
    A: '7 . 7 . 6 . 7 . 9 . 7 . 6 . 4 . 5 . 5 . 4 . 2 . 4 _ _ _ . . 4 6', B: '7 . 9 . 11 . 9 . 7 . 6 . 7 _ _ _ 4 . 6 . 7 . 6 . 4 _ _ _ 2 _ 4 _' },
  { key: 50, sc: 'hmin', bpm: 116, prog: [0, 3, 4, 0], boss: [0, 5, 4, 4], lead: 'harpsi', pad: 'soft', drums: 'tick', bass: 'walking', arp: 'none',
    A: '7 6 7 4 2 4 0 2 4 6 7 9 7 6 4 2 6 4 6 2 -1 2 -3 -1 1 2 4 6 4 2 1 -1', B: '9 7 9 6 4 6 2 4 6 7 9 11 9 7 6 4 7 6 4 2 0 2 4 6 7 _ _ _ . . . .' },
  { key: 52, sc: 'min', bpm: 120, prog: [0, 6, 5, 6], boss: [0, 5, 6, 4], lead: 'saw', pad: 'saw', drums: 'rock', bass: 'octave8', arp: 'updown',
    A: '4 _ _ 4 6 _ 7 _ 6 _ 4 _ 3 _ 4 _ 2 _ _ _ . . 2 3 4 _ _ _ . . . .', B: '7 _ _ _ 6 _ 4 _ 6 _ _ _ 7 _ 9 _ 8 _ _ _ 7 _ _ _ 6 _ 4 _ 4 _ _ _' },
  { key: 53, sc: 'lyd', bpm: 100, prog: [0, 1, 5, 4], boss: [5, 1, 4, 4], lead: 'bell', pad: 'saw', drums: 'breaks', bass: 'pulse', arp: 'sparkle',
    A: '7 _ 9 _ 11 _ 9 _ 7 _ 6 _ 4 _ _ _ 5 _ 7 _ 9 _ 7 _ 5 _ _ _ . . . .', B: '11 _ 10 _ 9 _ 7 _ 9 _ _ _ 6 _ _ _ 7 _ _ _ 4 _ 5 _ 7 _ _ _ . . . .' },
  { key: 48, sc: 'min', bpm: 138, prog: [0, 5, 6, 4], boss: [0, 1, 6, 4], lead: 'saw', pad: 'saw', drums: 'dnb', bass: 'rolling16', arp: 'up',
    A: '0 _ 2 _ 3 _ 4 _ 3 _ 2 _ 3 _ _ _ 5 _ 4 _ 3 _ 2 _ 0 _ _ _ . . -1 _', B: '4 _ _ 5 6 _ _ 7 6 _ 5 _ 4 _ 3 _ 2 _ 3 _ 4 _ _ _ 6 _ _ _ 7 _ _ _' },
  { key: 45, sc: 'min', bpm: 72, prog: [0, 4, 5, 3], boss: [0, 1, 5, 4], lead: 'choir', pad: 'soft', drums: 'ambient', bass: 'drone', arp: 'none',
    A: '4 _ _ _ 3 _ _ _ 2 _ _ _ 1 _ _ _ 0 _ _ _ _ _ _ _ -1 _ _ _ . . . .', B: '2 _ _ _ 4 _ _ _ 5 _ _ _ 4 _ 3 _ 2 _ _ _ _ _ _ _ . . . . . . . .' },
  { key: 50, sc: 'dor', bpm: 110, prog: [0, 5, 2, 6], boss: [0, 5, 3, 4], lead: 'choir', pad: 'saw', drums: 'epic', bass: 'octave8', arp: 'updown',
    A: '0 _ _ _ 4 _ _ _ 7 _ _ _ 6 _ 4 _ 5 _ _ _ 4 _ 2 _ 4 _ _ _ _ _ . .', B: '7 _ _ _ 9 _ _ _ 11 _ _ _ 9 _ 7 _ 8 _ _ _ 7 _ 6 _ 7 _ _ _ _ _ _ _' },
  // extra maps: suburb, theme park, backrooms, blocklands
  { key: 60, sc: 'maj', bpm: 108, prog: [0, 4, 5, 3], boss: [5, 3, 4, 4], lead: 'twang', pad: 'soft', drums: 'breaks', bass: 'walking', arp: 'updown',
    A: '0 _ 2 _ 4 _ 7 _ 5 _ 4 _ 2 _ _ _ 3 _ 4 _ 5 _ 4 _ 2 _ 0 _ 1 _ _ _', B: '4 _ 5 _ 7 _ 9 _ 8 _ 7 _ 5 _ _ _ 4 _ 2 _ 3 _ 1 _ 0 _ _ _ . . . .' },
  { key: 55, sc: 'maj', bpm: 126, prog: [0, 3, 4, 0], boss: [5, 3, 4, 4], lead: 'chip', pad: 'saw', drums: 'rock', bass: 'octave8', arp: 'up',
    A: '7 _ 4 _ 2 _ 4 _ 7 _ 9 _ 7 _ _ _ 8 _ 5 _ 3 _ 5 _ 8 _ _ _ 7 _ _ _', B: '9 _ 7 _ 6 _ 7 _ 9 _ 11 _ 9 _ 7 _ 6 _ 4 _ 2 _ 4 _ 7 _ _ _ . . . .' },
  { key: 45, sc: 'min', bpm: 66, prog: [0, 5, 3, 4], boss: [0, 1, 3, 4], lead: 'bell', pad: 'soft', drums: 'ambient', bass: 'drone', arp: 'none',
    A: '4 _ _ _ _ _ _ _ 3 _ _ _ _ _ _ _ 2 _ _ _ _ _ 1 _ 0 _ _ _ _ _ _ _', B: '. . . . 6 _ _ _ 5 _ _ _ . . . . 4 _ _ _ _ _ _ _ . . . . . . . .' },
  { key: 60, sc: 'lyd', bpm: 88, prog: [0, 1, 0, 4], boss: [5, 1, 4, 4], lead: 'bell', pad: 'soft', drums: 'ambient', bass: 'pulse', arp: 'sparkle',
    A: '7 _ _ _ 4 _ 2 _ 4 _ _ _ 7 _ 9 _ 8 _ _ _ 6 _ _ _ 4 _ _ _ . . . .', B: '2 _ 4 _ 6 _ 7 _ 9 _ _ _ 7 _ 6 _ 4 _ _ _ 2 _ _ _ 0 _ _ _ . . . .' },
  // world 16 glitch maps: freeway, school, beach, vapor grid, null sector (boss)
  { key: 54, sc: 'min', bpm: 118, prog: [0, 5, 2, 6], boss: [0, 5, 3, 4], lead: 'saw', pad: 'saw', drums: 'synthwave', bass: 'octave8', arp: 'up',
    A: '4 _ _ _ 6 _ 7 _ 6 _ 4 _ 3 _ _ _ 2 _ _ _ 4 _ 3 _ 2 _ 0 _ . . . .', B: '7 _ _ _ 9 _ 7 _ 6 _ _ _ 4 _ 6 _ 7 _ _ _ 6 _ 4 _ 2 _ _ _ . . . .' },
  { key: 50, sc: 'maj', bpm: 132, prog: [0, 4, 5, 3], boss: [5, 3, 4, 4], lead: 'saw', pad: 'soft', drums: 'rock', bass: 'octave8', arp: 'none',
    A: '0 _ 2 _ 4 _ 4 _ 5 _ 4 _ 2 _ _ _ 4 _ 4 _ 5 _ 7 _ 5 _ 4 _ 2 _ _ _', B: '7 _ _ 7 9 _ 7 _ 5 _ 4 _ 2 _ _ _ 4 _ 5 _ 4 _ 2 _ 1 _ 0 _ _ _ . .' },
  { key: 55, sc: 'maj', bpm: 100, prog: [0, 3, 4, 3], boss: [5, 3, 4, 4], lead: 'bell', pad: 'soft', drums: 'breaks', bass: 'pulse', arp: 'updown',
    A: '4 _ 5 _ 4 _ 2 _ 0 _ _ _ 2 _ 4 _ 5 _ _ _ 4 _ 2 _ 4 _ _ _ . . . .', B: '7 _ 9 _ 7 _ 5 _ 4 _ _ _ 5 _ 7 _ 8 _ _ _ 7 _ 5 _ 4 _ _ _ . . . .' },
  { key: 51, sc: 'maj', bpm: 84, prog: [0, 5, 3, 4], boss: [5, 3, 4, 4], lead: 'bell', pad: 'saw', drums: 'halftime', bass: 'pulse', arp: 'sparkle',
    A: '9 _ _ _ 7 _ _ _ 8 _ _ _ 4 _ _ _ 5 _ _ _ 4 _ 2 _ 4 _ _ _ _ _ . .', B: '4 _ _ _ 5 _ _ _ 7 _ _ _ 9 _ _ _ 8 _ _ _ 7 _ 5 _ 4 _ _ _ _ _ . .' },
  { key: 49, sc: 'phr', bpm: 140, prog: [0, 1, 6, 0], boss: [0, 1, 4, 1], lead: 'chip', pad: 'saw', drums: 'dnb', bass: 'rolling16', arp: 'up',
    A: '0 . 0 . 7 . 0 . 6 _ 4 _ 3 . 1 . 0 . 0 . 7 . 8 . 7 _ 4 _ 1 _ 0 _', B: '7 _ 8 _ 7 _ 4 _ 3 _ 4 _ 1 _ _ _ 0 _ 1 _ 3 _ 4 _ 7 _ 8 _ 11 _ _ _' },
  // World 17: Aetheria Prime - heroic finale
  { key: 52, sc: 'maj', bpm: 120, prog: [0, 5, 3, 4], boss: [5, 3, 0, 4], lead: 'choir', pad: 'saw', drums: 'epic', bass: 'octave8', arp: 'sparkle',
    A: '0 _ 4 _ 7 _ _ _ 9 _ 7 _ 4 _ _ _ 5 _ 7 _ 9 _ 11 _ 12 _ _ _ . . . .', B: '12 _ _ _ 11 _ 9 _ 7 _ _ _ 9 _ 11 _ 12 _ 14 _ 12 _ 11 _ 9 _ _ _ 7 _ _ _' }
];
const mHz = n => 440 * Math.pow(2, (n - 69) / 12);
function mTheme(w) {
  const S = MSPEC[w % MSPEC.length], sc = SCALE[S.sc], parse = str => str.trim().split(/\s+/).map(t => t === '_' ? 'h' : t === '.' ? null : +t);
  return Object.assign({}, S, { w, scale: sc, A: parse(S.A), B: parse(S.B) }); // parsed phrases must win over the raw strings
}
// scale degree -> midi (degrees past 6 wrap into the next octave; negative go below)
const mDeg = (T, d) => { const n = T.scale.length, o = Math.floor(d / n), i = ((d % n) + n) % n; return T.key + T.scale[i] + 12 * o; };
// keep strong-beat and held melody notes on the current chord: an off-chord degree resolves one step down
const mSnap = (T, d, root) => { const n = T.scale.length, r = (((d - root) % n) + n) % n; return r === 0 || r === 2 || r === 4 ? d : r === 6 ? d + 1 : d - 1; };
const mChord = (T, root) => [mDeg(T, root), mDeg(T, root + 2), mDeg(T, root + 4)];

const MX = { // the mixing desk, built once per audio context
  ctx: null,
  build() {
    if (this.ctx === AC) return true; if (!AC || !musG) return false; this.ctx = AC;
    const g = v => { const n = AC.createGain(); n.gain.value = v; return n; };
    this.comp = AC.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 3.2; this.comp.attack.value = .006; this.comp.release.value = .22; this.comp.knee.value = 12;
    this.lp = AC.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = .5;
    this.out = g(1); this.comp.connect(this.lp); this.lp.connect(this.out); this.out.connect(musG);
    // reverb: generated stereo hall impulse
    const len = Math.floor(AC.sampleRate * 2.6), ir = AC.createBuffer(2, len, AC.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { const v = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); lp += (v - lp) * (i < AC.sampleRate * .02 ? 1 : .55); d[i] = i < AC.sampleRate * .012 ? 0 : lp; } }
    this.rev = AC.createConvolver(); this.rev.buffer = ir; this.revIn = g(1); this.revOut = g(.55); this.revIn.connect(this.rev); this.rev.connect(this.revOut); this.revOut.connect(this.comp);
    // echo: tempo-synced dotted eighth with a darkening feedback loop
    this.dl = AC.createDelay(2); this.fb = g(.34); this.dlp = AC.createBiquadFilter(); this.dlp.type = 'lowpass'; this.dlp.frequency.value = 2600; this.dIn = g(1); this.dOut = g(.42);
    this.dIn.connect(this.dl); this.dl.connect(this.dlp); this.dlp.connect(this.fb); this.fb.connect(this.dl); this.dlp.connect(this.dOut); this.dOut.connect(this.comp);
    const bus = (dry, rv, dl) => { const b = g(1), d = g(dry); b.connect(d); d.connect(this.comp); if (rv) { const r = g(rv); b.connect(r); r.connect(this.revIn); } if (dl) { const e = g(dl); b.connect(e); e.connect(this.dIn); } return b; };
    this.pad = bus(.55, .7, 0); this.lead = bus(.8, .35, .28); this.arp = bus(.6, .3, .38); this.drum = bus(.95, .1, 0); this.bass = bus(.9, 0, 0); this.fx = bus(.7, .6, 0);
    this.duck = g(1); this.pad.disconnect(); this.pad.connect(this.duck); { const d = g(.55); this.duck.connect(d); d.connect(this.comp); const r = g(.7); this.duck.connect(r); r.connect(this.revIn); }
    // distortion curve for the heavy worlds
    this.shape = AC.createWaveShaper(); const cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; cv[i] = Math.tanh(x * 2.6); } this.shape.curve = cv; this.heavy = g(.55); this.shape.connect(this.heavy); this.heavy.connect(this.bass);
    this.pulse = AC.createPeriodicWave(new Float32Array([0, ...Array.from({ length: 31 }, (_, k) => 0)]), new Float32Array([0, ...Array.from({ length: 31 }, (_, k) => { const n = k + 1; return 2 / (n * Math.PI) * Math.sin(n * Math.PI * .25); })])); // 25% pulse for chiptune
    return true;
  },
  noise() { if (!noiseBuf || noiseBuf.sampleRate !== AC.sampleRate) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noiseBuf; }
};
const mv = { // instruments: each call schedules one note
  ok() { return AC && musG && MX.build(); },
  env(p, t, a, peak, d, r) { p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a); p.setTargetAtTime(peak * .7, t + a, d * .4); p.setTargetAtTime(0, t + Math.max(a, d), r || .08); },
  osc(type, f, t, det) { const o = AC.createOscillator(); if (type === 'pulse') o.setPeriodicWave(MX.pulse); else o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.value = det; return o; },
  out(node, bus, t, len) { node.connect(bus); return len; },
  pad(n, t, dur, vel, soft) {
    const g = AC.createGain(), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = .7; f.frequency.setValueAtTime(soft ? 900 : 700, t); f.frequency.linearRampToValueAtTime(soft ? 1400 : 2600, t + dur * .5); f.frequency.linearRampToValueAtTime(soft ? 900 : 1200, t + dur);
    this.env(g.gain, t, soft ? .35 : .25, vel, dur, .45); f.connect(g); g.connect(MX.duck);
    (soft ? [['triangle', 0], ['sine', 7]] : [['sawtooth', -11], ['sawtooth', 0], ['sawtooth', 11]]).forEach(([tp, dt]) => { const o = this.osc(tp, mHz(n), t, dt); o.connect(f); o.start(t); o.stop(t + dur + 1.6); });
  },
  bass(n, t, dur, vel, heavy) {
    const g = AC.createGain(), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(heavy ? 1600 : 900, t); f.frequency.exponentialRampToValueAtTime(heavy ? 260 : 180, t + Math.min(.25, dur));
    this.env(g.gain, t, .006, vel, dur * .9, .05); const s = this.osc('sine', mHz(n), t), o = this.osc('sawtooth', mHz(n), t, 4); const sg = AC.createGain(); sg.gain.value = .8; s.connect(sg); sg.connect(g); o.connect(f);
    f.connect(g); g.connect(heavy ? MX.shape : MX.bass); [s, o].forEach(x => { x.start(t); x.stop(t + dur + .3); });
  },
  lead(kind, n, t, dur, vel) {
    const g = AC.createGain(), f = AC.createBiquadFilter(); f.type = 'lowpass'; g.connect(MX.lead); const hz = mHz(n), stop = t + dur + .6; let oscs = [];
    const vib = (o, amt, del) => { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = 5.4; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(amt, t + del); l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(stop); };
    if (kind === 'saw' || kind === 'brass') {
      f.Q.value = kind === 'brass' ? 2 : 4; f.frequency.setValueAtTime(kind === 'brass' ? 500 : 1200, t); f.frequency.linearRampToValueAtTime(kind === 'brass' ? 3200 : 4200, t + (kind === 'brass' ? .12 : .03)); f.frequency.setTargetAtTime(kind === 'brass' ? 1800 : 2400, t + .1, .2);
      oscs = [this.osc('sawtooth', hz, t, -7), this.osc(kind === 'brass' ? 'sawtooth' : 'square', hz, t, 7)]; oscs.forEach(o => { o.connect(f); vib(o, hz * .006, .25); }); f.connect(g); this.env(g.gain, t, kind === 'brass' ? .05 : .012, vel, dur, .12);
    } else if (kind === 'flute') {
      f.frequency.value = 3200; oscs = [this.osc('sine', hz, t), this.osc('triangle', hz * 2, t)]; const h = AC.createGain(); h.gain.value = .18; oscs[0].connect(f); oscs[1].connect(h); h.connect(f); vib(oscs[0], hz * .008, .18); f.connect(g); this.env(g.gain, t, .06, vel * 1.15, dur, .1);
      const b = AC.createBufferSource(), bf = AC.createBiquadFilter(), bg = AC.createGain(); b.buffer = MX.noise(); bf.type = 'bandpass'; bf.frequency.value = hz * 2; bf.Q.value = 2; bg.gain.setValueAtTime(vel * .25, t); bg.gain.exponentialRampToValueAtTime(.001, t + .12); b.connect(bf); bf.connect(bg); bg.connect(g); b.start(t); b.stop(t + .15);
    } else if (kind === 'twang') { // plucked, slightly bent string
      f.Q.value = 3; f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(700, t + .35); oscs = [this.osc('sawtooth', hz * .985, t), this.osc('triangle', hz, t, 5)]; oscs.forEach(o => { o.frequency.exponentialRampToValueAtTime(hz, t + .06); o.connect(f); }); f.connect(g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 1.1, t + .004); g.gain.setTargetAtTime(0, t + .01, Math.min(.5, dur * .6));
    } else if (kind === 'bell') { // FM bell
      const c = this.osc('sine', hz, t), m = this.osc('sine', hz * 3.5, t), mg = AC.createGain(); mg.gain.setValueAtTime(hz * 2.4, t); mg.gain.exponentialRampToValueAtTime(hz * .05, t + 1.2); m.connect(mg); mg.connect(c.frequency); c.connect(g); oscs = [c, m];
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * .9, t + .004); g.gain.setTargetAtTime(0, t + .01, .55);
    } else if (kind === 'chip') {
      oscs = [this.osc('pulse', hz, t), this.osc('square', hz * 2, t)]; const h = AC.createGain(); h.gain.value = .12; oscs[0].connect(g); oscs[1].connect(h); h.connect(g); g.gain.setValueAtTime(vel * .8, t); g.gain.setValueAtTime(vel * .55, t + .05); g.gain.setTargetAtTime(0, t + dur * .9, .03);
    } else if (kind === 'harpsi') {
      f.Q.value = 1; f.frequency.setValueAtTime(7000, t); f.frequency.exponentialRampToValueAtTime(1500, t + .25); oscs = [this.osc('sawtooth', hz, t, -4), this.osc('square', hz * 2, t, 3)]; const h = AC.createGain(); h.gain.value = .3; oscs[0].connect(f); oscs[1].connect(h); h.connect(f); f.connect(g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * .75, t + .002); g.gain.setTargetAtTime(0, t + .005, .22);
    } else { // choir: filtered saws through two vowel formants
      const f1 = AC.createBiquadFilter(), f2 = AC.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = 700; f2.frequency.value = 1150; f1.Q.value = f2.Q.value = 5; const sum = AC.createGain(); sum.gain.value = 2.2;
      oscs = [this.osc('sawtooth', hz, t, -9), this.osc('sawtooth', hz, t, 9), this.osc('sawtooth', hz / 2, t, 0)]; oscs.forEach(o => { o.connect(f1); o.connect(f2); vib(o, hz * .005, .4); }); f1.connect(sum); f2.connect(sum); sum.connect(g); this.env(g.gain, t, .18, vel * 1.2, dur, .3);
    }
    oscs.forEach(o => { o.start(t); o.stop(stop); });
  },
  pluck(n, t, vel, bright) { const g = AC.createGain(), f = AC.createBiquadFilter(), o = this.osc('square', mHz(n), t), o2 = this.osc('sawtooth', mHz(n), t, 9); f.type = 'lowpass'; f.Q.value = 5; f.frequency.setValueAtTime(bright ? 6000 : 3800, t); f.frequency.exponentialRampToValueAtTime(500, t + .16);
    o.connect(f); o2.connect(f); f.connect(g); g.gain.setValueAtTime(vel, t); g.gain.setTargetAtTime(0, t + .01, .07); g.connect(MX.arp); o.start(t); o2.start(t); o.stop(t + .45); o2.stop(t + .45); },
  nz(t, dur, vel, type, freq, q, bus, sweep) { const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = MX.noise(); f.type = type; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur); f.Q.value = q || .7;
    g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(bus || MX.drum); s.start(t, Math.random() * .5); s.stop(t + dur + .05); },
  kick(t, v) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(44, t + .14); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .42); o.connect(g); g.connect(MX.drum); o.start(t); o.stop(t + .45);
    this.nz(t, .02, v * .5, 'highpass', 3000, .7); MX.duck.gain.setValueAtTime(.42, t); MX.duck.gain.linearRampToValueAtTime(1, t + .22); },
  snare(t, v) { this.nz(t, .2, v, 'bandpass', 1900, .9); const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(150, t + .08); g.gain.setValueAtTime(v * .7, t); g.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(g); g.connect(MX.drum); o.start(t); o.stop(t + .14); },
  clap(t, v) { for (let i = 0; i < 3; i++) this.nz(t + i * .011, .03, v * .8, 'bandpass', 1300, 2); this.nz(t + .033, .2, v * .7, 'bandpass', 1200, 1.5); },
  hat(t, v, open) { this.nz(t, open ? .28 : .045, v, 'highpass', 7600, .8); },
  tom(t, v, hz) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(hz * 1.6, t); o.frequency.exponentialRampToValueAtTime(hz, t + .12); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .38); o.connect(g); g.connect(MX.drum); o.start(t); o.stop(t + .4); },
  perc(t, v, hz) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(hz, t); o.frequency.exponentialRampToValueAtTime(hz * .7, t + .05); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .09); o.connect(g); g.connect(MX.drum); o.start(t); o.stop(t + .1); },
  crash(t, v) { this.nz(t, 1.8, v, 'highpass', 5200, .6, MX.fx); },
  riser(t, dur, v) { this.nz(t, dur, v, 'bandpass', 300, 3, MX.fx, 6000); },
  stinger() { if (!this.ok()) return; const t = AC.currentTime + .02; this.kick(t, .9); this.crash(t, .3); [0, 7, 12].forEach(k => this.lead('brass', 45 + k, t, 1.2, .16)); this.nz(t, .8, .25, 'lowpass', 2400, 1, MX.fx, 120); }
};
const music = {
  on: false, w: 0, step: 0, nt: 0, timer: null, boss: false, lv: 0, th: null, tense: false, force: -1,
  get cur() { return this.sd() * 1000; },
  sd() { const T = this.th || mTheme(this.w); return 60 / (T.bpm * (this.lv >= 3 ? 1.1 : 1)) / 4; },
  start(w, boss) {
    if (G.mapX) w = G.mapX.mi; else if (w === GLITCH_W) w = 23; else if (w === 16) w = 24;
    const was = this.boss; this.w = w; this.boss = !!boss; if (!this.th || this.th.w !== w) this.th = mTheme(w);
    if (this.on) { if (boss && !was) { try { mv.stinger(); } catch (e) { } } return; }
    this.on = true; this.step = 0; this.lv = this.level(); this.nt = 0; clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 25);
  },
  setTimer() { }, // kept for compatibility: the look-ahead scheduler has no per-step timer
  stop() { this.on = false; clearInterval(this.timer); try { if (MX.ctx === AC && MX.out) { const t = AC.currentTime; MX.out.gain.cancelScheduledValues(t); MX.out.gain.setValueAtTime(MX.out.gain.value, t); MX.out.gain.linearRampToValueAtTime(0, t + .4); MX.out.gain.setValueAtTime(1, t + .5); } } catch (e) { } },
  level() {
    if (this.force >= 0) return this.force; if (G.cut) return 0;
    const R = G.run; if (!R) return 0; const b = R.boss;
    if (b && !b.dead) return b.ph >= 2 || b.hp < b.mhp * .35 ? 4 : 3;
    if (R.stage === 'wave') return G.ent.en.length >= 6 || G.ent.eb.length > 24 ? 2 : 1;
    return R.stage === 'cards' || R.stage === 'intro' ? 0 : 1;
  },
  tick() { // look-ahead scheduler: queue every 16th note that starts in the next ~120 ms
    if (!AC || !musG || G.paused || SET.vol <= 0 || SET.mus <= 0 || AC.state !== 'running' || !mv.ok()) return;
    if (!this.th || this.th.w !== this.w) this.th = mTheme(this.w);
    const now = AC.currentTime; if (this.nt < now - .2) this.nt = now + .04; // resync after a pause or a stall
    let guard = 0; while (this.nt < now + .12 && guard++ < 24) { try { this.play(this.step, this.nt); } catch (e) { } this.nt += this.sd(); this.step++; }
  },
  play(s, t) {
    const T = this.th, st = s & 15, bar = s >> 4, cyc = bar & 7;
    if (st === 0) { this.lv = this.level(); const tz = !!G.run && G.players.some(p => p.alive && p.hp < p.mhp * .3); if (tz !== this.tense) { this.tense = tz; MX.lp.frequency.setTargetAtTime(tz ? 1100 : 20000, t, .4); } }
    const L = this.lv, prog = L >= 3 ? T.boss : T.prog, root = prog[bar & 3], ch = mChord(T, root), sd = this.sd(), barLen = sd * 16;
    // pads: a chord per bar
    if (st === 0) { const v = L === 0 ? .07 : L >= 3 ? .045 : .055; ch.forEach(n => mv.pad(n, t, barLen * .98, v, T.pad === 'soft' || L === 0)); if (L >= 1) mv.pad(ch[0] - 12, t, barLen * .98, v * .8, true); }
    if (L === 0) { if (st % 4 === 0 && T.arp !== 'none') mv.pluck(ch[(st / 4) % 3] + 12, t, .05, false); return; }
    // drums
    const D = DRUMS[L >= 3 ? 'boss' : T.drums], k = L === 1 ? .6 : 1, on = (p) => p && p[st] === 'x';
    if (on(D.k)) mv.kick(t, .85 * k); if (L >= 2 || T.drums === 'tribal') { if (on(D.s)) mv.snare(t, .32 * k); if (on(D.c)) mv.clap(t, .3 * k); if (on(D.t)) mv.tom(t, .32 * k, [110, 140, 90][st % 3]); }
    if (on(D.h)) mv.hat(t, (st % 4 === 0 ? .11 : .07) * k); if (L >= 2 && on(D.o)) mv.hat(t, .07, true); if (on(D.p)) mv.perc(t, .12 * k, T.drums === 'tick' ? 1900 : 420 + (st % 3) * 140);
    if (L >= 2 && cyc === 7 && st >= 12) { mv.snare(t, .18 + (st - 12) * .05); if (st === 14) mv.tom(t, .3, 100); } // fill into the next phrase
    if (L >= 2 && cyc === 0 && st === 0) mv.crash(t, L >= 4 ? .26 : .18);
    if (L >= 2 && cyc === 7 && st === 0) mv.riser(t, barLen, L >= 3 ? .07 : .045);
    // bass
    const bp = L >= 3 ? 'rolling16' : T.bass, bc = BASSP[bp][st];
    if (bc !== '.' && bc !== '_') { let len = 1; while (st + len < 16 && BASSP[bp][st + len] === '_') len++; const off = { R: 0, r: 12, '3': mDeg(T, root + 2) - ch[0], '5': mDeg(T, root + 4) - ch[0], '6': mDeg(T, root + 5) - ch[0] }[bc] || 0;
      mv.bass(ch[0] - 24 + off, t, sd * len * .95, (bp === 'rolling16' ? (st % 4 === 0 ? .32 : .22) : .34), T.drums === 'industrial' || L >= 3); }
    // arpeggio
    if (L >= 2 && T.arp !== 'none') { const pat = T.arp === 'updown' ? [0, 1, 2, 3, 2, 1] : T.arp === 'sparkle' ? [3, 1, 4, 2, 5, 0] : [0, 1, 2, 3]; const i = pat[st % pat.length], n = (i >= 3 ? ch[i - 3] + 12 : ch[i]) + (T.arp === 'sparkle' ? 24 : 12); if (T.arp !== 'sparkle' || st % 2 === 0) mv.pluck(n, t, L >= 4 ? .09 : .07, T.arp === 'sparkle'); }
    if (L >= 4 && st % 2 === 1) mv.pluck(ch[(st >> 1) % 3] + 24, t, .045, true); // late-boss counter line
    // melody: A B A B over 8 bars; on calmer waves it rests every other phrase
    const ph = (cyc >> 1) & 1 ? T.B : T.A, idx = (cyc & 1) * 16 + st, d = ph[idx];
    if (L === 1 && cyc >= 4) return;
    if (d !== null && d !== 'h') { let len = 1; while (idx + len < 32 && ph[idx + len] === 'h') len++; const n = mDeg(T, (st % 8 === 0 || len >= 4) ? mSnap(T, d, root) : d) + 12, vel = (L >= 3 ? .14 : .12) * (st % 4 === 0 ? 1 : .85);
      mv.lead(T.lead, n, t, sd * len, vel); if (L >= 3) mv.lead(T.lead === 'choir' ? 'saw' : T.lead, n + 12, t, sd * len, vel * .4); }
    if (this.tense && (st === 0 || st === 3)) mv.kick(t, .45);
  }
};

// ================= AUDIO 2: layered sound effects, music stems that fade with the action, jukebox =================
// ---- sound effects: every sound is 2-4 layers (transient click + body + tail) through its own little bus ----
const FXB = { ctx: null };
function fxBus() {
  if (FXB.ctx === AC && FXB.in) return FXB; if (!AC || !sfxG) return null; FXB.ctx = AC;
  const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .12;
  const inp = AC.createGain(), dry = AC.createGain(), wet = AC.createGain(), rv = AC.createConvolver();
  const len = Math.floor(AC.sampleRate * .9), ir = AC.createBuffer(2, len, AC.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4) * .6; }
  rv.buffer = ir; dry.gain.value = 1; wet.gain.value = .22; inp.connect(dry); inp.connect(rv); rv.connect(wet); dry.connect(comp); wet.connect(comp); comp.connect(sfxG);
  FXB.in = inp; return FXB;
}
let fxNoise = null;
function fxN() { if (!fxNoise || fxNoise.sampleRate !== AC.sampleRate) { fxNoise = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = fxNoise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return fxNoise; }
const sLast = {};
function sOK(key, gap) { if (SET.vol <= 0 || SET.sfx <= 0) return null; const now = performance.now(); if (key && now - (sLast[key] || 0) < (gap || 35)) return null; if (key) sLast[key] = now; const ac = audio(); if (!ac) return null; if (ac.state === 'suspended') ac.resume(); const B = fxBus(); return B ? ac.currentTime : null; }
function sTone(t, type, f0, f1, dur, vol, det) { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); if (det) o.detune.value = det; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(1e-4, t + dur); o.connect(g); g.connect(FXB.in); o.start(t); o.stop(t + dur + .03); }
function sNoise(t, dur, vol, ftype, f0, f1, q) { const b = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); b.buffer = fxN(); b.loop = true; f.type = ftype || 'lowpass'; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); f.Q.value = q || .8; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(1e-4, t + dur); b.connect(f); f.connect(g); g.connect(FXB.in); b.start(t, Math.random() * .5); b.stop(t + dur + .03); }
const SHOTS = {
  twin: t => { sTone(t, 'square', 1250, 620, .05, .035); sTone(t, 'triangle', 620, 300, .07, .05); sNoise(t, .03, .03, 'highpass', 4000); },
  spread: t => { sNoise(t, .09, .07, 'bandpass', 2400, 700, 1.2); sTone(t, 'sawtooth', 300, 160, .08, .035); },
  lancer: t => { sTone(t, 'sawtooth', 180, 720, .12, .05); sTone(t, 'sine', 90, 60, .14, .07); sNoise(t, .05, .03, 'highpass', 3000); },
  ion: t => { sTone(t, 'sine', 1400, 900, .035, .03); sTone(t, 'square', 700, 500, .03, .015); },
  missile: t => { sNoise(t, .22, .07, 'lowpass', 1800, 300, .7); sTone(t, 'triangle', 160, 90, .16, .05); },
  orb: t => { sTone(t, 'sine', 110, 55, .25, .09); sTone(t, 'sawtooth', 220, 110, .18, .025, 12); sNoise(t, .12, .03, 'lowpass', 900, 200); },
  arc: t => { sNoise(t, .08, .06, 'bandpass', 3500, 1500, 3); sTone(t, 'square', 900, 1800, .05, .02); },
  rail: t => { sTone(t, 'sawtooth', 1600, 120, .22, .06); sNoise(t, .25, .06, 'bandpass', 5000, 400, 1.5); sTone(t, 'sine', 70, 40, .3, .1); }
};
Object.assign(SFX, {
  shoot: k => { const t = sOK('sh' + k, k === 'ion' ? 45 : 40); if (t === null) return; (SHOTS[k] || SHOTS.twin)(t); },
  aux: () => { const t = sOK('aux'); if (t !== null) sTone(t, 'triangle', 240, 180, .07, .05); },
  hit: () => { const t = sOK('hit', 45); if (t === null) return; sNoise(t, .04, .04, 'highpass', 2600); sTone(t, 'square', 320, 200, .04, .02); },
  boom: big => { const t = sOK(big ? 'boomB' : 'boom', big ? 60 : 50); if (t === null) return;
    sNoise(t, big ? 1.1 : .4, big ? .32 : .16, 'lowpass', big ? 2400 : 3000, big ? 90 : 220, .6); sTone(t, 'sine', big ? 95 : 140, big ? 32 : 50, big ? .8 : .3, big ? .3 : .16); sNoise(t, .05, big ? .12 : .07, 'highpass', 3000);
    if (big) { sNoise(t + .08, .9, .1, 'bandpass', 600, 120, 1.2); sTone(t, 'sawtooth', 70, 35, .6, .06); } },
  pick: () => { const t = sOK('pick', 40); if (t === null) return; const f = 1180 + (Math.random() * 4 | 0) * 110; sTone(t, 'sine', f, f, .09, .07); sTone(t + .045, 'sine', f * 1.5, f * 1.5, .12, .05); sTone(t, 'triangle', f * 2, f * 2, .05, .02); },
  power: () => { const t = sOK('pw', 80); if (t === null) return; [0, 4, 7, 12].forEach((k, i) => sTone(t + i * .05, 'triangle', 523 * Math.pow(2, k / 12), 0, .22, .06)); sNoise(t, .3, .03, 'highpass', 6000, 9000); },
  hurt: () => { const t = sOK('hurt', 60); if (t === null) return; sNoise(t, .2, .2, 'bandpass', 900, 200, 1.4); sTone(t, 'sawtooth', 200, 70, .2, .1); sTone(t, 'square', 90, 50, .15, .06); },
  shield: () => { const t = sOK('shd', 60); if (t === null) return; sTone(t, 'triangle', 480, 760, .12, .08); sTone(t, 'sine', 960, 1500, .16, .04); sNoise(t, .12, .04, 'highpass', 5000); },
  warn: () => { const t = sOK('warn', 200); if (t === null) return; for (let i = 0; i < 2; i++) { sTone(t + i * .22, 'sawtooth', 440, 330, .18, .08); sTone(t + i * .22, 'square', 220, 165, .18, .04); } },
  click: () => { const t = sOK('clk', 30); if (t === null) return; sTone(t, 'sine', 1800, 1200, .025, .04); sTone(t, 'triangle', 600, 600, .03, .03); },
  buy: () => { const t = sOK('buy', 60); if (t === null) return; [0, 7, 12, 16].forEach((k, i) => sTone(t + i * .04, 'sine', 880 * Math.pow(2, k / 12), 0, .14, .06)); sNoise(t, .1, .03, 'highpass', 7000); },
  no: () => { const t = sOK('no', 80); if (t === null) return; sTone(t, 'square', 180, 140, .09, .05); sTone(t + .09, 'square', 140, 110, .12, .05); },
  abil: () => { const t = sOK('abil', 80); if (t === null) return; sNoise(t, .35, .1, 'bandpass', 400, 5000, 1.5); sTone(t, 'sawtooth', 220, 880, .25, .06); sTone(t + .1, 'sine', 1320, 660, .3, .05); },
  graze: () => { const t = sOK('gz', 50); if (t !== null) { sTone(t, 'sine', 2200, 2600, .04, .025); sNoise(t, .03, .015, 'highpass', 8000); } },
  clear: () => { const t = sOK('clr', 300); if (t === null) return; [[0, 0], [4, .12], [7, .24], [12, .38]].forEach(a => { sTone(t + a[1], 'triangle', 523 * Math.pow(2, a[0] / 12), 0, .45, .07); sTone(t + a[1], 'sine', 1046 * Math.pow(2, a[0] / 12), 0, .3, .03); }); sNoise(t + .38, .8, .05, 'highpass', 6000, 12000); },
  charge: lv => { const t = sOK('chg', 90); if (t !== null) sTone(t, 'sine', 300 + lv * 900, 400 + lv * 1000, .1, .015 + lv * .012); },
  parry: () => { const t = sOK('parry', 60); if (t === null) return; sTone(t, 'triangle', 2400, 2400, .5, .09); sTone(t, 'sine', 3600, 3600, .35, .05); sTone(t, 'square', 1200, 600, .06, .04); sNoise(t, .06, .08, 'highpass', 5000); },
  sup: () => { const t = sOK('sup', 300); if (t === null) return; sNoise(t, 1.6, .2, 'bandpass', 200, 4000, 1.1); sTone(t, 'sawtooth', 55, 110, 1.5, .1); sTone(t, 'sawtooth', 82, 165, 1.5, .07, 8); [0, 7, 12].forEach(k => sTone(t + .3, 'triangle', 440 * Math.pow(2, k / 12), 0, 1.2, .05)); }
});

// ---- music stems: each layer fades in and out over a bar instead of popping ----
const STEMS = { lv: -1 };
function stemMix(L, t) {
  if (!MX.drum || STEMS.lv === L) return; STEMS.lv = L; const bar = music.sd() * 16;
  const set = (bus, v) => { try { bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(v, t + bar); } catch (e) { } };
  set(MX.drum, L === 0 ? .4 : L === 1 ? .75 : 1); set(MX.arp, L >= 2 ? 1 : .5); set(MX.bass, L === 0 ? .5 : 1); set(MX.lead, L === 1 ? .8 : 1);
}
const _mplay = music.play.bind(music);
music.play = function (s, t) {
  const st = s & 15; if (st === 0) { this.lv = this.level(); stemMix(this.lv, t); }
  _mplay(s, t);
  // heat stem: long combos add a driving shaker + octave bass; super finisher adds a choir swell
  const R = G.run, heat = R && R.combo >= 12 ? (R.combo >= 25 ? 2 : 1) : 0;
  if (heat && this.lv >= 1) { mv.hat(t, st % 2 ? .05 : .035); if (heat >= 2 && st % 4 === 2) mv.perc(t, .09, 1200); }
  if (R && G.players.some(p => p.supT > 100) && st % 8 === 0) { const T = this.th; mv.pad(mDeg(T, 0) + 12, t, this.sd() * 8, .05, false); mv.pad(mDeg(T, 4) + 12, t, this.sd() * 8, .04, false); }
};
const _mlevel = music.level.bind(music);
music.level = function () { if (this.jbx >= 0 && this.jbl >= 0) return this.jbl; return _mlevel(); };
const _mstart = music.start.bind(music);
music.start = function (w, boss) { if (this.jbx >= 0) { const was = this.jbx; this.on = false; clearInterval(this.timer); this.w = was; this.th = mTheme(was); this.on = true; this.step = 0; this.nt = 0; this.lv = this.level(); this.timer = setInterval(() => this.tick(), 25); STEMS.lv = -1; return; } STEMS.lv = -1; _mstart(w, boss); };
music.jbx = -1; music.jbl = -1;

// ---- jukebox ----
function jbTracks() {
  const T = []; for (let w = 0; w < 15; w++) T.push({ i: w, nm: WORLDS[w].nm, sub: 'World ' + (w + 1), c: WORLDS[w].ac, ok: w < SAVE.wu });
  T.push({ i: 23, nm: WORLDS[15].nm, sub: 'World 16', c: WORLDS[15].ac, ok: SAVE.wu > 15 });
  if (WORLDS[16]) T.push({ i: 24, nm: WORLDS[16].nm, sub: 'World 17', c: WORLDS[16].ac, ok: SAVE.wu > 16 });
  MAPS.filter(m => !m.hidden).forEach(m => T.push({ i: m.mi, nm: m.nm, sub: 'The Glitch - side map', c: m.ac, ok: SAVE.wu > 15 }));
  return T;
}
const JBL = [['CALM', 0], ['CRUISE', 1], ['ACTION', 2], ['BOSS', 3], ['FINALE', 4]];
function jbPlay(i) { audio(); if (AC && AC.state !== 'running') AC.resume(); music.stop(); music.jbx = i; if (music.jbl < 0) music.jbl = 2; setTimeout(() => { if (music.jbx === i) music.start(i, false); }, 520); }
function jbStop() { music.jbx = -1; music.jbl = -1; music.stop(); }
let jbRaf = 0, jbAn = null;
function jbViz() {
  cancelAnimationFrame(jbRaf); const cv = document.getElementById('jbViz'); if (!cv) { jbAn = null; return; }
  try { if (!jbAn && AC && musG) { jbAn = AC.createAnalyser(); jbAn.fftSize = 128; musG.connect(jbAn); } } catch (e) { }
  const g = cv.getContext('2d'), W = cv.width = cv.clientWidth * 2, H = cv.height = cv.clientHeight * 2, buf = new Uint8Array(64);
  const loop = () => { if (!document.getElementById('jbViz')) return; jbRaf = requestAnimationFrame(loop); g.clearRect(0, 0, W, H); if (jbAn) jbAn.getByteFrequencyData(buf); const n = 40, bw = W / n; for (let k = 0; k < n; k++) { const v = jbAn ? buf[k] / 255 : (music.jbx >= 0 ? .2 + .2 * Math.sin(performance.now() / 200 + k) : .02), h = Math.max(2, v * H * .95); const gr = g.createLinearGradient(0, H, 0, H - h); gr.addColorStop(0, '#22d3ee'); gr.addColorStop(1, '#e879f9'); g.fillStyle = gr; g.fillRect(k * bw + 2, H - h, bw - 4, h); } };
  loop();
}

// ================= PROFILE: achievements, toasts, secrets, save slots, key rebinding, gamepad navigation =================

// ---------- toasts ----------
function toast(title, sub, col) {
  let box = $('toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const e = document.createElement('div'); e.className = 'toast'; e.style.setProperty('--tc', col || '#22d3ee'); e.innerHTML = '<b>' + title + '</b><span>' + sub + '</span>';
  box.appendChild(e); while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(() => { e.classList.add('out'); setTimeout(() => { if (e.parentNode) e.parentNode.removeChild(e); }, 500); }, 3600);
}

// ---------- achievements ----------
const mkAch = (id, nm, ds, ic, r, cur, max, sec) => ({ id, nm, ds, ic, r, cur, max, sec: !!sec });
const sumStars = () => { let n = 0; for (const w in SAVE.prog) for (const t of SAVE.prog[w].done) if (t) for (const s of t) if (s === 3) n++; return n; };
const STDHULLS = ['falcon', 'vanguard', 'phantom', 'titan', 'nova'];
const ACH = [
  mkAch('first', 'First Blood', 'Destroy your first enemy.', 'target', 50, () => SAVE.st.kills, 1),
  mkAch('k100', 'Centurion', 'Destroy 100 enemies.', 'target', 80, () => SAVE.st.kills, 100),
  mkAch('k1k', 'Exterminator', 'Destroy 1,000 enemies.', 'blast', 200, () => SAVE.st.kills, 1000),
  mkAch('k10k', 'Extinction Event', 'Destroy 10,000 enemies.', 'skull', 600, () => SAVE.st.kills, 10000),
  mkAch('boss1', 'Giant Slayer', 'Defeat a boss.', 'skull', 100, () => SAVE.st.bosses, 1),
  mkAch('boss10', 'Dread Hunter', 'Defeat 10 bosses.', 'skull', 300, () => SAVE.st.bosses, 10),
  mkAch('w5', 'World Walker', 'Unlock the 5th world.', 'map', 150, () => SAVE.wu, 5),
  mkAch('w10', 'Conqueror', 'Defeat the boss of the 10th world.', 'B', 500, () => { const p = SAVE.prog[9]; return p && p.done[0] && p.done[0][12] ? 1 : 0; }, 1),
  mkAch('stars', 'Perfectionist', 'Earn 3 stars on 10 sectors.', 'star', 250, sumStars, 10),
  mkAch('s1', 'Rank S', 'Earn an S rank.', 'star', 100, () => SAVE.st.ranks.S, 1),
  mkAch('s10', 'Ace Pilot', 'Earn 10 S ranks.', 'nova', 400, () => SAVE.st.ranks.S, 10),
  mkAch('gz500', 'Close Shave', 'Graze 500 enemy shots.', 'graze', 100, () => SAVE.st.graze, 500),
  mkAch('gz5k', 'Daredevil', 'Graze 5,000 enemy shots.', 'graze', 300, () => SAVE.st.graze, 5000),
  mkAch('cb30', 'Chain Reaction', 'Reach a 30-kill chain.', 'chain', 100, () => SAVE.st.combo, 30),
  mkAch('cb80', 'Unbroken', 'Reach an 80-kill chain.', 'chain', 300, () => SAVE.st.combo, 80),
  mkAch('cards25', 'Card Shark', 'Pick 25 upgrade cards.', 'multi', 100, () => SAVE.st.cards, 25),
  mkAch('deck8', 'Full Deck', 'Hold 8 different cards in one run.', 'multi', 200, () => SAVE.flags.deck8 ? 1 : 0, 1),
  mkAch('evo', 'Evolved', 'Evolve a weapon.', 'dmg', 250, () => SAVE.pl.some(pl => Object.keys(pl.wevo || {}).some(k => pl.wevo[k])) ? 1 : 0, 1),
  mkAch('armada', 'Armada', 'Own 3 wingman drones at once.', 'drn', 200, () => SAVE.pl[0].up.drn, 3),
  mkAch('maker', 'Maker', 'Beat a custom level or boss you built.', 'map', 300, () => (SAVE.st.custom | 0) ? 1 : 0, 1),
  mkAch('crash', 'Have You Tried Turning It Off', 'Survive the AetherOS crash.', 'bolt', 1200, () => SAVE.flags.crash ? 1 : 0, 1, 1),
  mkAch('clean', 'Antivirus', 'Cleanse 10 corrupted sectors.', 'sh', 800, () => Object.keys(SAVE.flags.clean || {}).length, 10),
  mkAch('w17', 'The True Ending', 'Defeat Aetheria Prime.', 'B', 3000, () => SAVE.flags.trueEnd ? 1 : 0, 1),
  mkAch('vex', 'Wingmate', 'Win Vex over to your side.', 'wing', 800, () => SAVE.story && SAVE.story.ally ? 1 : 0, 1, 1),
  mkAch('lv10', 'Rising Star', 'Reach pilot level 10.', 'target', 300, () => (SAVE.xp || { lv: 1 }).lv, 10),
  mkAch('lv30', 'Top Brass', 'Reach pilot level 30.', 'target', 900, () => (SAVE.xp || { lv: 1 }).lv, 30),
  mkAch('logs', 'Archivist', 'Collect every data log.', 'map', 800, () => Object.keys(SAVE.logs || {}).length, 16),
  mkAch('master', 'Weapon Master', 'Reach GOLD mastery with any gun.', 'bolt', 500, () => Object.keys(SAVE.wm || {}).some(k => (SAVE.wm[k] | 0) >= 400) ? 1 : 0, 1),
  mkAch('medals', 'Decorated', 'Earn 20 gold or platinum medals.', 'ring', 600, () => Object.values(SAVE.md || {}).filter(v => v >= 3).length, 20),
  mkAch('rifts', 'Rift Walker', 'Find all five hidden rifts.', 'ring', 800, () => riftsFound(), 5),
  mkAch('retro', 'Insert Coin', 'Beat the 1-UP retro world.', 'coin', 600, () => SAVE.flags.retro ? 1 : 0, 1, 1),
  mkAch('hc20', 'Iron Will', 'Reach wave 20 in Hardcore.', 'bolt', 700, () => (SAVE.hi.hc || {}).wave | 0, 20),
  mkAch('gal4', 'Showoff', 'Win a boss rematch with 4 or more modifiers.', 'skull', 600, () => SAVE.flags.gal4 ? 1 : 0, 1),
  mkAch('routes', 'Off the Map', 'Clear 5 side routes.', 'map', 300, () => Object.keys(SAVE.flags.alt || {}).length, 5),
  mkAch('parry', 'Untouchable', 'Parry 25 enemy shots.', 'sh', 300, () => SAVE.st.parry | 0, 25),
  mkAch('gold', 'Gold Rush', 'Hunt down 5 golden elites.', 'coin', 400, () => SAVE.st.gold | 0, 5),
  mkAch('super', 'Nova Beam', 'Unleash 10 super finishers.', 'bolt', 250, () => SAVE.st.supers | 0, 10),
  mkAch('hulls', 'Hangar Queen', 'Own all five standard hulls.', 'wing', 300, () => STDHULLS.filter(h => SAVE.pl[0].own.hull.indexOf(h) >= 0).length, 5),
  mkAch('rich', 'Core Hoarder', 'Hold 10,000 cores at once.', 'coin', 200, () => SAVE.cores, 10000),
  mkAch('coop', 'Wingmates', 'Win a run in 2-player co-op.', 'e', 100, () => SAVE.flags.coop ? 1 : 0, 1),
  mkAch('end20', 'Marathon', 'Reach wave 20 in Endless.', 'inf', 250, () => SAVE.hi.endless.wave, 20),
  mkAch('end30', 'Ironwall', 'Reach wave 30 in Endless.', 'inf', 400, () => SAVE.hi.endless.wave, 30),
  mkAch('blitz', 'Speed Demon', 'Score 20,000 in Blitz.', 'bolt', 250, () => SAVE.hi.blitz.score, 20000),
  mkAch('rush', 'Gauntlet', 'Finish a Boss Rush.', 'skull', 400, () => SAVE.hi.rush.time > 0 ? 1 : 0, 1),
  mkAch('daily', 'Daily Driver', 'Win a Daily Challenge.', 'clock', 150, () => SAVE.flags.daily ? 1 : 0, 1),
  mkAch('daily3', 'On a Roll', 'Win Daily Challenges 3 days in a row.', 'clock', 300, () => SAVE.dl.streak, 3),
  mkAch('def5', 'Station Keeper', 'Reach wave 5 in Station Defense.', 'sh', 150, () => SAVE.hi.def.wave, 5),
  mkAch('defwin', 'Fortress', 'Win a Station Defense.', 'armor', 400, () => SAVE.flags.defwin ? 1 : 0, 1),
  mkAch('tier2', 'Higher Tier', 'Unlock Tier 2 on any world.', 'B', 200, () => Object.keys(SAVE.prog).some(w => SAVE.prog[w].t >= 2) ? 1 : 0, 1),
  mkAch('close', 'Close Call', 'Win a sector with under 10% hull left.', 'hp', 150, () => SAVE.flags.close ? 1 : 0, 1),
  mkAch('untouch', 'Untouchable', 'Defeat a boss without taking a single hit.', 'ring', 400, () => SAVE.flags.untouch ? 1 : 0, 1, true),
  mkAch('ghost', 'Ghost Run', 'Clear a No-Hit run.', 'nova', 500, () => SAVE.flags.nohit ? 1 : 0, 1, true),
  mkAch('vault', 'Vault Cracker', 'Crack the Vault.', 'coin', 600, () => SAVE.flags.vault ? 1 : 0, 1, true),
  mkAch('remix2', 'Remix Pilot', 'Clear any sector on Tier 2.', 'B', 200, () => Object.keys(SAVE.prog).some(w => (SAVE.prog[w].done[1] || []).some(x => x)) ? 1 : 0, 1),
  mkAch('remix3', 'Nightmare Fuel', 'Defeat a boss on Tier 3.', 'skull', 500, () => Object.keys(SAVE.prog).some(w => SAVE.prog[w].done[2] && SAVE.prog[w].done[2][12]) ? 1 : 0, 1),
  mkAch('w15', 'Heart of the Machine', 'Defeat The Aetheria Core.', 'B', 1000, () => { const p = SAVE.prog[14]; return p && p.done[0] && p.done[0][12] ? 1 : 0; }, 1),
  mkAch('w15u', 'Deep Space', 'Unlock the 15th world.', 'map', 300, () => SAVE.wu, 15),
  mkAch('w16u', 'Glitch in the System', 'Find World 16: The Glitch.', 'map', 400, () => SAVE.wu, 16),
  mkAch('w16', 'Patch Notes', 'Defeat The Null Process.', 'B', 1500, () => { const p = SAVE.prog[15]; return p && p.done[0] && p.done[0][12] ? 1 : 0; }, 1),
  mkAch('all', 'Completionist', 'Earn every other achievement.', 'star', 1000, () => ACH.filter(a => a.id !== 'all' && SAVE.ach[a.id]).length, 1, true)
];
ACH[ACH.length - 1].max = ACH.length - 1;
let achBusy = false;
function achScan() {
  if (achBusy || !SAVE) return; achBusy = true;
  try { checkUnlocks(); for (const a of ACH) if (!SAVE.ach[a.id] && a.cur() >= a.max) unlockAch(a); } finally { achBusy = false; }
}
function unlockAch(a) {
  SAVE.ach[a.id] = Date.now(); SAVE.cores += a.r; toast('ACHIEVEMENT: ' + a.nm.toUpperCase(), a.ds + '  +' + a.r + ' cores', '#fbbf24'); SFX.power();
  store.set(SAVE_KEY, JSON.stringify(SAVE));
}
// secrets: things that appear once a hidden requirement is met
function checkUnlocks() {
  for (let w = 0; w < WORLDS.length - 1; w++) { const p = SAVE.prog[w]; if (p && p.done[0] && p.done[0][12] && SAVE.wu < w + 2) SAVE.wu = w + 2; }
  if (!SAVE.unl.vault && SAVE.st.ranks.S + SAVE.st.ranks.A >= 6) { SAVE.unl.vault = 1; toast('SECRET FOUND', 'A new mode just appeared on the mode list.', '#fbbf24'); }
}
const achCount = () => ACH.filter(a => SAVE.ach[a.id]).length;

// ---------- save slots + export / import ----------
function summarize(s, active) { return { cores: s.cores, wu: s.wu, kills: s.st.kills, time: s.st.time | 0, runs: s.st.runs, ach: Object.keys(s.ach || {}).length, active }; }
function slotInfo(i) { if (i === SLOT) return summarize(SAVE, true); const s = jget(SLOT_KEYS[i], null); return s ? summarize(merge(defSave(), s), false) : null; }
function switchSlot(i) {
  if (i === SLOT) return; saveGame(); SLOT = i; SAVE_KEY = SLOT_KEYS[i]; store.set('aetheria_slot', String(i)); SAVE = loadSave(); store.set(SAVE_KEY, JSON.stringify(SAVE));
  UI.pi = 0; UI.w = 0; UI.tier = 1; UI.sel = 0; G.showCfg = null; SFX.click();
}
function deleteSlot(i) { store.del(SLOT_KEYS[i]); if (i === SLOT) { SAVE = loadSave(); store.set(SAVE_KEY, JSON.stringify(SAVE)); } }
function exportCode(i) { const s = i === SLOT ? SAVE : jget(SLOT_KEYS[i], null); if (!s) return ''; return 'AETH1:' + btoa(unescape(encodeURIComponent(JSON.stringify(s)))); }
function importCode(txt, i) {
  try {
    txt = String(txt || '').replace(/\s+/g, ''); if (txt.indexOf('AETH1:') !== 0) return 'That is not an Aetheria save code.';
    const j = JSON.parse(decodeURIComponent(escape(atob(txt.slice(6))))); if (!j || typeof j !== 'object' || !Array.isArray(j.pl) || typeof j.cores !== 'number') return 'This save code looks damaged.';
    const m = merge(defSave(), j); m.pl = [merge(defPlayer(0), j.pl[0] || {}), merge(defPlayer(1), j.pl[1] || {})]; store.set(SLOT_KEYS[i], JSON.stringify(m));
    if (i === SLOT) SAVE = loadSave(); return '';
  } catch (e) { return 'Could not read that code. Copy the whole thing.'; }
}

// ---------- keyboard rebinding ----------
const KACT = [['u', 'Move up'], ['d', 'Move down'], ['l', 'Move left'], ['r', 'Move right'], ['f', 'Fire'], ['a', 'Ability'], ['wl', 'Previous gun'], ['wr', 'Next gun'], ['c', 'Charge / secondary / parry'], ['v', 'Super finisher']];
const KRES = ['Escape', 'KeyP', 'KeyN', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Tab', 'F5', 'F11', 'F12'];
const KLAB = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'SPACE', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT', Enter: 'ENTER', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`', Backspace: 'BKSP', CapsLock: 'CAPS' };
function keyLabel(c) { if (!c) return '-'; if (KLAB[c]) return KLAB[c]; if (c.indexOf('Key') === 0) return c.slice(3); if (c.indexOf('Digit') === 0) return c.slice(5); if (c.indexOf('Numpad') === 0) return 'NUM ' + c.slice(6).toUpperCase(); return c.toUpperCase(); }
function startRebind(pi, a) { G.rebind = { pi, a }; IN.keys = {}; UI.refresh(); }
function keyCaptured(code) {
  const rb = G.rebind; if (!rb) return;
  if (code === 'Escape') { G.rebind = null; UI.refresh(); return; }
  if (KRES.indexOf(code) >= 0) { alertMsg('THAT KEY IS RESERVED'); return; }
  setKey(rb.pi, rb.a, code); G.rebind = null; SFX.buy(); UI.refresh();
}
function setKey(pi, a, code) {
  SET.keys = SET.keys || {}; const old = KB[pi][a][0];
  for (let j = 0; j < 2; j++) for (const b in KDEF[j]) {
    if (j === pi && b === a) continue; const list = KB[j][b]; if (list.indexOf(code) < 0) continue;
    let nl = list.filter(k => k !== code); if (!nl.length) nl = [old]; SET.keys[j + b] = nl;
  }
  SET.keys[pi + a] = [code]; applyKeys(); saveSet();
}
function resetKeys() { SET.keys = {}; applyKeys(); saveSet(); }

// ---------- gamepad menu navigation ----------
function navEls() {
  const root = document.querySelector('.scr.on'); if (!root) return [];
  return Array.from(root.querySelectorAll('[data-act],.tog,select,input[type=range]')).filter(e => { if (e.classList.contains('off') || e.disabled) return false; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; });
}
function navFocus(el) {
  const old = document.querySelector('.gpf'); if (old) old.classList.remove('gpf'); UI.gpf = el || null;
  if (el) { el.classList.add('gpf'); UI.gpfIdx = Math.max(0, navEls().indexOf(el)); UI.gpfOn = true; try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { } }
}
function navRestore() { if (!UI.gpfOn) return; const els = navEls(); if (!els.length) return; navFocus(els[Math.min(UI.gpfIdx | 0, els.length - 1)]); }
function navAdjust(el, d) {
  if (el.type === 'range') { const st = +el.step || 1, v = clamp((+el.value) + d * st, +el.min, +el.max); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.selectedIndex = clamp(el.selectedIndex + d, 0, el.options.length - 1); el.dispatchEvent(new Event('change', { bubbles: true })); }
}
function navCur(els) { return UI.gpf && els.indexOf(UI.gpf) >= 0 ? UI.gpf : null; }
function navMove(dx, dy) {
  const els = navEls(); if (!els.length) return; const cur = navCur(els);
  if (!cur) { navFocus(els.find(e => e.classList.contains('big')) || els[0]); return; }
  if (dx && (cur.type === 'range' || cur.tagName === 'SELECT')) { navAdjust(cur, dx); return; }
  const c = cur.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2; let best = null, bs = 1e12;
  for (const e of els) { if (e === cur) continue; const r = e.getBoundingClientRect(), ex = r.left + r.width / 2 - cx, ey = r.top + r.height / 2 - cy, along = dx ? ex * dx : ey * dy, across = dx ? Math.abs(ey) : Math.abs(ex); if (along <= 4) continue; const sc = along + across * 2.2; if (sc < bs) { bs = sc; best = e; } }
  if (best) { navFocus(best); SFX.click(); }
}
function navAct() {
  const els = navEls(), cur = navCur(els); if (!cur) { navFocus(els.find(e => e.classList.contains('big')) || els[0]); return; }
  if (cur.type === 'range' || cur.tagName === 'SELECT') return; cur.click();
}
function navBack() { if (G.pick || G.rebind) return; if (UI.top) UI.escape(); }
function padNav(o, prev) {
  const nv = { L: o.x < -.6, R: o.x > .6, U: o.y < -.6, D: o.y > .6 }; o.nv = nv; const pv = prev.nv || {};
  if (nv.L && !pv.L) navMove(-1, 0); if (nv.R && !pv.R) navMove(1, 0); if (nv.U && !pv.U) navMove(0, -1); if (nv.D && !pv.D) navMove(0, 1);
  if (o.a0 && !prev.a0) navAct(); if (o.b1 && !prev.b1) navBack();
}

// ================= FIELD GUIDE: what every enemy, boss and hazard does (bestiary + world briefings) =================
const INTEL = {
  jet: 'Fast interceptor that weaves up and down and fires single aimed shots. Fragile - pick it off before it lines up.',
  drone: 'Zig-zagging scout that fires straight bolts. Weak alone, annoying in groups.',
  sniper: 'Hangs back and fires very fast aimed shots. Keep moving up and down while it is on screen.',
  mine: 'Drifting mine. When destroyed it bursts into 8 shards in every direction - shoot it from a distance.',
  vanguard: 'ELITE. Heavy cruiser that holds position and fires 5-shot fans. Slip between the fans and focus fire.',
  wasp: 'Hive drone with no guns - it rams you. Shoot it before it reaches you.',
  spore: 'Floating pod that pops into 10 spores when killed. Do not pop it right in front of your ship.',
  spitter: 'Hovers and spits 3-shot aimed acid bursts.',
  beetle: 'Armored charger with a lot of health. It builds speed and rams - sidestep, then shoot.',
  hiveguard: 'ELITE. Fires 7-shot fans and keeps summoning Hive Wasps. Kill it fast or the swarm grows.',
  gearling: 'Small scrap drone that flies straight at you to ram.',
  driller: 'Charges forward with its drill. Hits hard if it connects.',
  crawler: 'Dune turret that fires 3-way spreads.',
  scrapper: 'Flies over the battlefield laying mines. Clear the mines or route around them.',
  hauler: 'ELITE. Armored freighter that fires 12-bullet rings - look for the gaps.',
  wisp: 'Circles around you and fires aimed shots. Hard to pin down.',
  shard: 'Zig-zags and fires 3-shot bursts of crystal shards.',
  warper: 'Teleports around the screen and fires a 3-shot burst from each new spot.',
  rift: 'Hovering manta that pulses out 9-bullet rings.',
  sentinel: 'ELITE. Orbits while firing a spinning spiral. Circle with the spiral instead of crossing it.',
  ember: 'Living flame that homes in on you and rams.',
  lens: 'Circling eye that fires aimed 3-shot volleys.',
  comet: 'Dives across the screen at high speed, firing straight ahead.',
  flare: 'Hovers and fires wide 5-shot fans.',
  warden: 'ELITE. Guards the horizon with dense 14-bullet rings.',
  flake: 'Orbiting snowflake that releases small 5-bullet rings.',
  icicle: 'Drops from above at high speed to ram you. Watch the top of the screen.',
  frostgun: 'Anchored cannon. Its shots freeze you - getting hit slows your ship.',
  yeti: 'Heavy charger with a lot of health. Dodge the charge, then punish it.',
  icecruiser: 'ELITE. Frozen warship that fires 7-shot fans and launches Snowflakes.',
  magma: 'Molten blob that splits into small seeking Magmalets when destroyed.',
  magmalet: 'A piece of a Magma Blob. Homes in and rams.',
  anvil: 'Bomber that flies over and drops heavy bombs.',
  salamander: 'Snakes across the screen firing straight shots.',
  smelter: 'Hovers and fires 5-shot fans of slag.',
  colossus: 'ELITE. Fires huge 14-bullet rings and summons Magma Blobs.',
  jelly: 'Drifts in a wave and pulses 7-bullet rings.',
  puffer: 'Charges at you and explodes into 12 spines when killed. Kill it early, far away.',
  eel: 'Slithers in a long curve and fires aimed shots.',
  lure: 'Hides behind a glowing lure and fires 3-shot bursts. The light is bait.',
  kraken: 'ELITE. Submarine that fires spirals and launches Glow Jellies.',
  glitch: 'Corrupted cube that teleports and fires aimed shots.',
  bit: 'Tiny fast swarmer that rams. Comes in packs.',
  firewall: 'Turret that throws whole walls of bullets. There is always a gap - find it.',
  virus: 'Homes in on you and bursts into 6 shots when destroyed.',
  daemon: 'ELITE. Teleports, fires 16-bullet rings and spawns Bit Swarmers.',
  cog: 'Clockwork drone that weaves and fires aimed shots.',
  tick: 'A living time bomb. Chases you and bursts into 8 shots when destroyed.',
  phoenix: 'Swoops in fast and fires 5-shot fans.',
  paradox: 'Teleports and fires 4-shot bursts. Never where you expect it.',
  chronowarden: 'ELITE. Fires spirals and summons Cog Drones.',
  scav: 'Agile salvage skiff that zig-zags and fires aimed shots.',
  hullrat: 'Fast scavenger that homes in, rams and pops into 4 shots.',
  welder: 'Charges in with an arc welder. Hits very hard up close.',
  railturret: 'Anchored rail gun. Very fast aimed shots - keep moving.',
  salvager: 'ELITE. Salvage colossus that fires 9-shot fans and releases Hull Rats.',
  shardling: 'Orbiting crystal that fires 6-bullet rings.',
  prism: 'Weaving drone that fires 3-way spreads.',
  geode: 'Drifting rock that cracks into seeking Shardlets when destroyed.',
  shardlet: 'A splinter of a Geode Mine. Homes in and rams.',
  refractor: 'Teleports and fires 5-shot bursts.',
  monolith: 'ELITE. Fires massive 18-bullet rings and summons Shardlings.',
  sprite: 'Storm spirit that weaves and fires straight bolts.',
  squall: 'Swoops in fast and fires 5-shot fans.',
  zapper: 'Hovers and fires very fast aimed lightning.',
  gasbag: 'Slow balloon that bursts into 14 shots when popped. Pop it from far away.',
  cyclone: 'ELITE. Fires 16-bullet rings and summons Storm Sprites.',
  specter: 'Ghost ship that teleports and fires aimed shots.',
  reaper: 'Circles around you and fires 5-shot fans.',
  ossuary: 'Bone turret that throws up walls of bullets. Find the gap.',
  leech: 'Slithers toward you firing straight shots.',
  lich: 'ELITE. Fires spirals and raises Specter Skiffs.',
  photon: 'Orbiting light that fires 7-bullet rings.',
  construct: 'Hovering construct that fires 5-shot fans.',
  echo: 'A memory of an old enemy. Teleports and fires 5-shot bursts.',
  sentry: 'Anchored core turret firing 3-shot aimed bursts.',
  gjet: 'A Skyjet that should have stayed dead. Flickers between positions and fires fast aimed shots.',
  gpod: 'A corrupted data packet. Drifts slowly and bursts into 14 shards when destroyed - pop it far away.',
  gcube: 'A cube with no texture loaded. Teleports and fires 5-shot bursts.',
  gecho: 'You have seen this before. Circles you and pulses 9-bullet rings.',
  gadmin: 'ELITE. A process with admin rights. Fires spirals and keeps spawning Corrupted Skyjets.',
  rival: 'RIVAL. Vex, the other pilot who answered the signal. Strafes, dashes and fires twin bursts and fans. Retreats when beaten - for now.',
  guardian: 'ELITE. The Core\'s last guard: 20-bullet rings and summons Photon Wisps.',
  rock: 'Asteroid. Floods hazard sectors - shoot it or fly around it.',
  dummy: 'Target drone used in training.'
};
const BOSS_INTEL = [
  'Flagship of the storm decks. Opens with wide fans and aimed shots, then adds rings and heavier fans when damaged. Hit the glowing weak points for bonus damage.',
  'Queen of the ravine hive. Spirals and aimed shots, then summons wasps and fires rings. Clear the wasps fast.',
  'A colossal mining machine. Rains debris, lays mines, then throws bullet walls.',
  'Something that lives inside the nebula. Rings, then spirals with homing shots, then a sweeping beam - watch for the warning line.',
  'Ruler of the black hole. Dense spirals and rings, homing shots, wide fans, and a last phase that pulls everything in.',
  'Commander of the frozen armada. Freezing rain, icy rings and Snowflakes. Getting hit slows you down.',
  'The weapon the foundry was built to make. Mines, molten rain, rings and a beam.',
  'The thing behind the light. Homing shots and fans, then rings and Glow Jellies.',
  'The machine mind. Bullet walls and aimed volleys, then Bit swarms, rings and beams.',
  'Keeper of the last hour. Spirals, homing shots, huge fans, and Cog Drones.',
  'The ring station\'s last commander. Rings and aimed shots, then walls, rain and reinforcements.',
  'A many-headed crystal beast. Wide fans and aimed shots, then rings and Shardlings.',
  'The eye of the storm. Lightning rain, huge spirals and Storm Sprites.',
  'Admiral of a dead fleet. Bullet walls and aimed volleys, then Specters, rings and mines.',
  'Where every signal began. Five phases that combine everything you have faced.',
  'The program that broke reality. Bullet walls, spirals, beams and rain, and it keeps summoning corrupted copies of your old enemies. Five phases.',
  'The first world, awake. Six phases that use everything: fans, spirals, beams, walls and rain, with Phoenixes, Refractors and finally an Aether Guardian joining the fight.'
];
const HZ_INTEL = {
  wind: 'Scrap winds push your ship up and down.',
  fog: 'Thick fog hangs over the battlefield.',
  bhole: 'The black hole on the right pulls you in - keep steering away from it.',
  ice: 'Frozen controls: your ship slides and is slow to stop.',
  lava: 'Lava geysers erupt from the floor or ceiling after an orange warning glow.',
  current: 'Currents drag your ship around - steer against them.',
  glitch: 'Glitches flicker across the screen.',
  time: 'Time speeds up and slows down - the whole fight changes pace.',
  bolt: 'Lightning strikes where a dashed line warns - get out of the line.',
  pulse: 'Every few seconds a pulse wave sweeps the screen and shoves you back.'
};
const AI_TXT = { sine: 'Weaves up and down', zig: 'Zig-zags', hover: 'Holds position', drift: 'Drifts slowly', charge: 'Charges you', blink: 'Teleports', orbit: 'Circles around', seeker: 'Homes in on you', dive: 'Dives across', drop: 'Drops from above', turret: 'Anchored turret', bomber: 'Flies over, bombing', swoop: 'Swoops in', snake: 'Slithers', line: 'Flies straight' };
const FIRE_TXT = { aim: 'Aimed shots', aimfast: 'Fast aimed shots', aimice: 'Freezing shots', burst: 'Bursts', drop: 'Drops bombs', fan: 'Fan spread', line: 'Straight bolts', mine: 'Lays mines', ring: 'Ring blasts', spiral: 'Spirals', wall: 'Bullet walls' };
// which enemies belong to which world (roster, elite, and the pieces some of them split into)
function worldEnemies(w) {
  const W = WORLDS[w], ids = W.ro.concat([W.el]);
  ids.slice().forEach(id => { const d = EN[id]; if (d && d.split && ids.indexOf(d.split) < 0) ids.splice(ids.indexOf(id) + 1, 0, d.split); });
  return ids.filter(id => EN[id]);
}
function enemyFacts(id) {
  const d = EN[id], f = d.f; const a = [];
  a.push(AI_TXT[d.ai] || 'Moves'); a.push(f ? (FIRE_TXT[f.k] || 'Shoots') + (f.n ? ' x' + f.n : '') : 'No guns'); if (d.ram) a.push('Rams'); if (d.burst) a.push('Bursts x' + d.burst + ' on death'); if (d.split) a.push('Splits when killed'); if (d.summon) a.push('Summons ' + (EN[d.summon] ? EN[d.summon].nm : 'help'));
  return a;
}

// ================= UI: menus, map, hangar, shop, settings, pause, results =================
const svg = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
const ICO = {
  map: svg('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'), inf: svg('<path d="M18.2 8.5c-3 0-4.6 3.5-6.2 3.5S8.8 8.5 5.8 8.5a3.5 3.5 0 000 7c3 0 4.6-3.500 6.2-3.500s3.200 3.500 6.200 3.500a3.500 3.500 0 000-7z"/>'),
  skull: svg('<path d="M12 3a8 8 0 00-5 14v3h3v-2h4v2h3v-3a8 8 0 00-5-14z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/>'), bolt: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'), target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  c: svg('<circle cx="12" cy="12" r="8"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>'), e: svg('<path d="M12 3a8 8 0 00-5 14v3h3v-2h4v2h3v-3a8 8 0 00-5-14z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/>'),
  s: svg('<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="4"/>'), h: svg('<path d="M12 3L2 20h20z"/><path d="M12 10v5M12 18v.5"/>'), B: svg('<path d="M3 18l2-11 5 5 2-8 2 8 5-5 2 11z"/>'),
  hp: svg('<path d="M12 21s-7-4.500-7-10a4 4 0 017-2.600A4 4 0 0119 11c0 5.500-7 10-7 10z"/>'), sh: svg('<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/>'), am: svg('<path d="M8 3h8l3 5-7 13L5 8z"/>'),
  dmg: svg('<path d="M14 3l7 7-3 3-7-7zM11 6L3 14l-1 7 7-1 8-8"/>'), rate: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>'), spd: svg('<path d="M3 12h10M3 6h7M3 18h7M16 6l5 6-5 6"/>'), mag: svg('<path d="M6 3v8a6 6 0 0012 0V3h-4v8a2 2 0 01-4 0V3z"/>'), lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>')
};
Object.assign(ICO, {
  armor: svg('<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'), coin: svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9 12h6"/>'),
  home: svg('<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.500"/>'), pierce: svg('<path d="M3 12h16M15 7l5 5-5 5"/><path d="M8 5v14"/>'),
  multi: svg('<path d="M3 12h15M3 6l13 4M3 18l13-4"/>'), star: svg('<path d="M12 3l2.600 5.500 6 .8-4.400 4.200 1.100 6-5.300-3-5.300 3 1.100-6L3.400 9.300l6-.8z"/>'),
  chain: svg('<path d="M3 6l5 5-3 3 6 5M13 3l4 4-3 3 6 7"/>'), blast: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>'),
  regen: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>'), ring: svg('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>'),
  drop: svg('<path d="M12 3s6 6.500 6 11a6 6 0 01-12 0c0-4.500 6-11 6-11z"/>'), orbit: svg('<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5"/><circle cx="21" cy="12" r="1.500"/>'),
  ram: svg('<path d="M4 8h9l4 4-4 4H4z"/><path d="M17 12h4"/>'), heart: ICO.hp, clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  graze: svg('<path d="M3 17c4 0 5-10 9-10M9 20c4 0 5-10 9-10M3 11c3 0 4-6 7-6"/>'), nova: svg('<path d="M12 2l2 7 7 3-7 3-2 7-2-7-7-3 7-3z"/>'),
  wing: svg('<path d="M3 15l9-9 9 9h-4l-5-5-5 5z"/><path d="M12 21v-6"/>'), drn: svg('<path d="M3 15l9-9 9 9h-4l-5-5-5 5z"/><circle cx="12" cy="19" r="2"/>'), drd: svg('<path d="M3 15l9-9 9 9h-4l-5-5-5 5z"/><path d="M12 14v7M9 18h6"/>')
});
const stars = n => '<span class="stars">' + '★'.repeat(n) + '<span style="opacity:.25">' + '★'.repeat(3 - n) + '</span></span>';
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pi = () => Math.min(UI.pi, SAVE.players - 1);

// ---------- settings schema ----------
const SETS = {
  GAMEPLAY: [['diff', 'sel', 'Difficulty', 'Enemy health and damage', [[0, 'Easy'], [1, 'Normal'], [2, 'Hard']]], ['story', 'sel', 'Story scenes', 'Comic cutscenes before bosses', [['once', 'First time only'], ['always', 'Always'], ['off', 'Off']]], ['brief', 'sel', 'Enemy briefings', 'Intel card + labels in each world\'s first sector', [['once', 'First time only'], ['always', 'Always'], ['off', 'Off']]], ['auto', 'tog', 'Auto-fire', 'Fire without holding a button'], ['dmgnum', 'tog', 'Damage numbers', ''], ['flash', 'tog', 'Screen flash on hit', ''], ['pauseBlur', 'tog', 'Auto-pause when you switch away', ''], ['cards', 'tog', 'Power-up cards', 'Pick a card between waves']],
  GRAPHICS: [['menu3d', 'tog', 'Flying main menu', 'Your ship flies through your latest world'], ['intro', 'tog', 'Intro movie', 'Play the intro when the game loads'], ['models', 'tog', '3D ship models', 'Off = flat 2D ships (fastest)'], ['bg3d', 'tog', '3D backgrounds', 'Orbit each world in 3D (needs 3D models on)'], ['toon', 'tog', 'Cel shading', 'Cartoon lighting with ink outlines'], ['bloom', 'tog', 'Bloom glow', 'Lights and lasers bleed glow'], ['weather', 'tog', 'Weather effects', 'Rain, snow, sand and more over the action'], ['daynight', 'tog', 'Day / night cycle', 'Outdoor worlds slowly turn to night'], ['q', 'sel', 'Render quality', 'Lower is faster on phones', [[1, 'Low'], [1.5, 'Medium'], [2, 'High']]], ['back', 'sel', 'Backdrop detail', '', [[0, 'Minimal'], [1, 'Standard'], [2, 'Rich']]], ['parts', 'range', 'Particle limit', '', [30, 300, 10]], ['glow', 'range', 'Glow strength', '', [0, 1.5, .1]], ['shake', 'range', 'Screen shake', '', [0, 1.5, .1]], ['vig', 'tog', 'Vignette', ''], ['ui3d', 'tog', '3D menu effects', 'Tilt, depth and pop-in'], ['tilt', 'range', 'Menu tilt strength', '', [0, 2, .1]], ['fps', 'tog', 'Show FPS', ''], ['cap30', 'tog', 'Cap at 30 FPS', 'Saves battery'], ['slowmo', 'tog', 'Boss-kill slow motion', '']],
  AUDIO: [['vol', 'range', 'Master volume', '', [0, 1, .05]], ['sfx', 'range', 'Effects', '', [0, 1, .05]], ['mus', 'range', 'Music', '', [0, 1, .05]]],
  CONTROLS: [['touch', 'sel', 'Touch controls', 'Auto shows them on phones/tablets', [['auto', 'Auto'], ['on', 'Always on'], ['off', 'Off']]], ['scheme', 'sel', 'Touch scheme', 'Stick + fire button, or drag to fly', [['stick', 'Stick + Fire'], ['drag', 'Drag to fly']]], ['tsize', 'range', 'Button size', '', [.7, 1.5, .05]], ['tside', 'sel', 'Stick side', '', [['left', 'Left'], ['right', 'Right']]], ['haptic', 'tog', 'Vibration', ''], ['dead', 'range', 'Gamepad deadzone', '', [0, .5, .02]]],
  ACCESS: [['reduce', 'tog', 'Reduce motion', 'Less shake, no big banner animation'], ['hc', 'tog', 'High-contrast enemy fire', 'White outlines on hostile shots'], ['cb', 'tog', 'Colour-blind shapes', 'Enemy shots become diamonds with outlines']]
};
function prevCfg() { const c = SAVE.pl[pi()].cfg, v = UI.prev; if (!v) return c; const o = Object.assign({}, c); o[v[0]] = v[1]; return o; }
function setRow(r) {
  const k = r[0], t = r[1], v = SET[k]; let c = '';
  if (t === 'tog') c = '<div class="tog' + (v ? ' on' : '') + '" data-set="' + k + '"></div>';
  else if (t === 'sel') c = '<select data-set="' + k + '">' + r[4].map(o => '<option value="' + o[0] + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
  else c = '<input type="range" data-set="' + k + '" min="' + r[4][0] + '" max="' + r[4][1] + '" step="' + r[4][2] + '" value="' + v + '">';
  return '<div class="setrow"><div>' + r[2] + (r[3] ? '<small>' + r[3] + '</small>' : '') + '</div>' + c + '</div>';
}
function applySet(k) {
  saveSet();
  if (k === 'q' || k === 'ui3d' || k === 'reduce') layout();
  if (k === 'back') buildBackdrop(G.world | 0);
  if (k === 'vol' || k === 'sfx' || k === 'mus') applyVol();
  if (k === 'touch' || k === 'scheme' || k === 'tsize' || k === 'tside') buildTouch();
}

// ---------- screens ----------
const RKC = { S: '#fbbf24', A: '#34d399', B: '#38bdf8', C: '#94a3b8' };
const rankHtml = d => (d.win && (d.mode === 'expedition' || d.mode === 'rush' || d.mode === 'daily' || d.mode === 'vault' || d.mode === 'nohit' || d.mode === 'defense')) ? '<div class="rk" style="color:' + RKC[d.rank] + ';text-shadow:0 0 26px ' + RKC[d.rank] + '">' + d.rank + '</div><div class="xs mut" style="letter-spacing:.3em;margin-top:-4px">RANK' + (d.mode === 'expedition' && RANKB[d.rank] ? ' - +' + Math.round(RANKB[d.rank] * 100) + '% BONUS' : '') + '</div>' : '';
function wupHtml(pl, id) {
  if (pl.wown.indexOf(id) < 0) return '';
  const lv = wlvOf(pl, id), ev = wevOf(pl, id), E = WEVO[id];
  const pips = '<div class="pips">' + Array.from({ length: WMAXLV }, (_, n) => '<i class="' + (n < lv ? 'on' : '') + '"></i>').join('') + '<i class="' + (ev ? 'on' : '') + '" style="width:14px;' + (ev ? 'background:#fbbf24;box-shadow:0 0 6px #fbbf24' : '') + '"></i></div>';
  let btn;
  if (ev) btn = '<span class="good b xs">EVOLVED - ' + E.ds + '</span>';
  else if (lv < WMAXLV) { const pr = wupPrice(id, lv); btn = '<button class="btn sm gold' + (SAVE.cores < pr ? ' off' : '') + '" data-act="wup:' + id + '">LEVEL UP ' + fmt(pr) + '</button>'; }
  else { const pr = wevoPrice(id); btn = '<button class="btn sm warn' + (SAVE.cores < pr ? ' off' : '') + '" data-act="wevo:' + id + '">EVOLVE ' + fmt(pr) + '</button>'; }
  return '<div class="row sp wrap" style="margin-top:6px"><div><div class="xs mut b">LEVEL ' + (lv + 1) + (lv >= WMAXLV ? ' (MAX)' : '') + (!ev && lv >= WMAXLV ? ' - ' + E.nm + ': ' + E.ds : '') + '</div>' + pips + '</div>' + btn + '</div>';
}
const SCR = {
  scCards: () => {
    const K = G.pick; if (!K) return '';
    const p = G.players[K.who], co = G.players.length > 1, cost = 20 * (K.rr + 1);
    return '<div class="cpick"><div class="tc"><div class="title" style="font-size:clamp(20px,5.2vw,34px);letter-spacing:.12em">CHOOSE AN UPGRADE</div><div class="subt" style="margin:4px 0 0">' + (co ? 'PILOT ' + (K.who + 1) + ' - ' : '') + 'LASTS FOR THIS RUN</div></div><div class="cards3">' +
      K.opts.map((id, i) => { const c = CARDS[id], r = RAR[c.rar], n = p.cards[id] | 0; return '<div class="pc r' + c.rar + '" data-act="card:' + i + '" style="--rc:' + r.c + ';--i:' + i + '"><em>' + r.nm + '</em><div class="pci">' + ICO[c.ic] + '</div><div class="pct"><b>' + c.nm + '</b><span>' + c.ds + '</span><i>' + (n ? 'LEVEL ' + n + ' → ' + (n + 1) : 'NEW') + '</i></div>' + (touchOn() ? '' : '<u>' + (i + 1) + '</u>') + '</div>'; }).join('') +
      '</div><div class="row sp wrap" style="width:100%;max-width:600px"><button class="btn sm' + (SAVE.cores < cost ? ' off' : '') + '" data-act="cardroll">REROLL - ' + cost + '</button>' + (touchOn() ? '' : '<span class="xs mut">Keys 1 2 3 - R rerolls</span>') + '<button class="btn sm gold" data-act="cardskip">SKIP +25 CORES</button></div></div>';
  },
  scTut: () => '<div class="card" style="width:min(480px,100%)"><div class="title" style="font-size:clamp(22px,6vw,34px)">WELCOME, PILOT</div><div class="subt">NEW HERE?</div><p class="tc mut" style="line-height:1.7;margin-bottom:18px">Take the 2-minute <b class="acc">Flight School</b>: how to fly, what ammo looks like, what the pickups do, and how the shop, hangar and map work.</p><div class="stack"><button class="btn big" data-act="tutorial">START FLIGHT SCHOOL</button><button class="btn" data-act="tutlater">SKIP - I KNOW WHAT I\'M DOING</button></div></div>',
  scMenu: () => {
    const t = touchOn();
    return '<div class="card" style="width:min(450px,100%)"><div class="title" data-act="tap">AETHERIA</div><div class="subt">QUANTUM STRIKE</div><div class="stack">' +
      '<button class="btn big" data-act="play">PLAY</button>' +
      '<button class="btn" data-act="online" style="border-color:#22d3ee">ONLINE <span class="xs mut">FRIENDS, CO-OP, VERSUS</span></button>' +
      '<div class="grid2"><button class="btn" data-act="hangar">HANGAR</button><button class="btn" data-act="shop">SHOP</button></div>' +
      '<div class="grid2"><button class="btn" data-act="settings">SETTINGS</button><button class="btn" data-act="tutorial">FLIGHT SCHOOL</button></div>' +
      '<div class="grid2"><button class="btn sm" data-act="fs">' + (document.fullscreenElement ? 'EXIT FULL SCREEN' : 'FULL SCREEN') + '</button><button class="btn sm" data-act="updates">UPDATES <span class="gold">' + GAME_VER + '</span></button></div>' +
      '<div class="grid2"><button class="btn" data-act="profile">PROFILE ' + achCount() + '/' + ACH.length + '</button><button class="btn' + (SAVE.dl.done[dayKey()] ? '' : ' gold') + '" data-act="daily">DAILY' + (SAVE.dl.done[dayKey()] ? '' : ' - NEW') + '</button></div>' +
      '<div class="grid2"><button class="btn' + (msnReady() ? ' gold' : '') + '" data-act="missions">MISSIONS' + (msnReady() ? ' - ' + msnReady() + ' READY' : '') + '</button><button class="btn" data-act="cos">COSMETICS</button></div>' +
      '<div class="row sp"><span class="mut sm b" style="letter-spacing:.14em">PLAYERS</span><div class="seg" style="width:62%"><button data-act="players:1" class="' + (SAVE.players === 1 ? 'on' : '') + '">1 PLAYER</button><button data-act="players:2" class="' + (SAVE.players === 2 ? 'on' : '') + '">2P CO-OP</button></div></div>' +
      '<div class="row sp xs mut">' + rankChip() + '<span>' + Object.keys(PS().logs).length + '/' + LOGS.length + ' LOGS</span></div><div class="row sp xs mut"><span>CORES <b class="gold">' + fmt(SAVE.cores) + '</b></span><span>WORLDS <b class="acc">' + Math.min(SAVE.wu, WORLDS.length) + '/' + WORLDS.length + '</b></span><span>KILLS <b>' + fmt(SAVE.st.kills) + '</b></span></div>' +
      '<div class="tc xs mut" style="line-height:1.6">' + (t ? 'Touch: stick to fly - FIRE to shoot' : SAVE.players === 2 ? 'P1: WASD + SPACE - P2: ARROWS + ENTER (or gamepads)' : 'WASD / mouse to fly - SPACE / click to fire - Q E swap gun - P pause') + '</div><div class="tc xs mut credit" data-act="credits">MADE BY <b class="gold">LUKEN WISER</b> - ' + GAME_VER + '</div></div></div>';
  },
  scModes: () => {
    const card = k => {
      const m = MODES[k];
      if (m.secret && !SAVE.unl[k]) return '<div class="mode lk" data-act="mode:' + k + '"><div class="row"><span class="mut" style="width:22px;height:22px">' + ICO.lock + '</span><b>???</b></div><span>' + (m.hint || 'Something is hidden here. Keep flying, and keep it clean.') + '</span><em></em></div>';
      const sk = dailyStreakNow(), hi = k === 'endless' ? (SAVE.hi.endless.score ? 'BEST ' + fmt(SAVE.hi.endless.score) + ' - WAVE ' + SAVE.hi.endless.wave : '') : k === 'blitz' ? (SAVE.hi.blitz.score ? 'BEST ' + fmt(SAVE.hi.blitz.score) : '') : k === 'rush' ? (SAVE.hi.rush.time ? 'BEST ' + SAVE.hi.rush.time + 's' : 'ALL UNLOCKED BOSSES') : k === 'daily' ? dailyInfo().mod.nm + (sk ? ' - ' + sk + ' DAY STREAK' : '') : k === 'defense' ? (SAVE.hi.def.wave ? 'BEST WAVE ' + SAVE.hi.def.wave : '') : k === 'nohit' ? (Object.keys(SAVE.hi.nohit).length ? Object.keys(SAVE.hi.nohit).length + ' WORLDS CLEARED' : '') : k === 'vault' ? (SAVE.hi.vault.clears ? 'CLEARED x' + SAVE.hi.vault.clears : 'UNLOCKED') : '';
      return '<div class="mode" data-act="mode:' + k + '"><div class="row"><span class="acc" style="width:22px;height:22px">' + ICO[m.ic] + '</span><b>' + m.nm.toUpperCase() + '</b></div><span>' + m.ds + '</span><em>' + hi + '</em></div>';
    };
    const ks = Object.keys(MODES);
    return '<div class="card mid"><div class="row sp"><h2>Select Mode</h2><div class="seg" style="width:46%"><button data-act="players:1" class="' + (SAVE.players === 1 ? 'on' : '') + '">1P</button><button data-act="players:2" class="' + (SAVE.players === 2 ? 'on' : '') + '">2P CO-OP</button></div></div><div class="grid2" style="margin-top:12px">' + ks.filter(k => !MODES[k].cat).map(card).join('') + '</div>' +
      '<div class="xs mut b" style="letter-spacing:.2em;margin:18px 0 0">CHALLENGES</div><div class="grid2" style="margin-top:8px">' + ks.filter(k => MODES[k].cat).map(card).join('') + '</div>' +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><span class="xs mut">' + (SAVE.players === 2 ? '2-player co-op is on' : 'Tip: flip on 2P CO-OP to bring a friend') + '</span></div></div>';
  },
  scMap: () => {
    const w = UI.w; bgPrewarm(w); const W = WORLDS[w], pr = prog(w), mode = UI.mode, B = BOSSES[w], tier = Math.min(UI.tier, pr.t), arr = pr.done[tier - 1] || [];
    let first = 0; while (first < LV && arr[first]) first++; if (SAVE.devAll) first = LV - 1;
    const tabs = WORLDS.map((x, i) => '<div class="tab' + (i === w ? ' on' : '') + (i >= SAVE.wu ? ' lk' : '') + '" data-act="world:' + i + '">' + (i >= SAVE.wu ? '' : '') + (i + 1) + '. ' + x.nm + (i >= SAVE.wu ? ' (locked)' : '') + '</div>').join('');
    let body = '';
    if (mode === 'expedition') {
      const isAlt = !!ALT_NODE[UI.sel] && UI.alt === w + ':' + UI.sel;
      const nodes = NODE_PAT.map((t, i) => {
        const done = !!arr[i], av = i <= first, sel = UI.sel === i && !isAlt, cl = 'node' + (t === 'B' ? ' bs' : '') + (done ? ' dn' : av ? ' av' : ' lk');
        const cor = glitchSpreading() && isCorrupt(w, i) && !(SAVE.flags.clean || {})[corruptKey(w, i)];
        let h = '<div class="node ' + cl.slice(5) + (cor ? ' cor' : '') + '" data-act="lvl:' + i + '" style="' + (sel ? 'outline:2px solid #fff;outline-offset:3px;' : '') + (ALT_NODE[i] ? '' : 'margin-top:' + (i % 2 ? 22 : -10) + 'px') + '">' + ICO[t] + '<span>' + (done ? '★'.repeat(arr[i]) : (i + 1)) + '</span>' + (medalAt(w, i, tier) ? '<i class="mdl" style="background:' + MEDALS[medalAt(w, i, tier)][1] + '"></i>' : '') + '</div>';
        if (ALT_NODE[i]) { const at = ALT_NODE[i], as = altStars(w, i, tier), asel = UI.sel === i && isAlt; h = '<div class="fork"><div class="node alt ' + (as ? 'dn' : av ? 'av' : 'lk') + '" data-act="lvl:' + i + ':alt" title="' + ALT_INFO[at].nm + '" style="' + (asel ? 'outline:2px solid #fbbf24;outline-offset:3px;' : '') + '">' + ICO[at] + '<span>' + (as ? '★'.repeat(as) : (i + 1) + 'B') + '</span></div>' + h + '</div>'; }
        return h + (i < LV - 1 ? '<div style="width:26px;height:2px;background:var(--line2);flex:none"></div>' : '');
      }).join('');
      const i = UI.sel, t = isAlt ? ALT_NODE[i] : NODE_PAT[i], sp = levelSpec(w, i, tier, isAlt), ro = t === 'B' ? [] : rosterFor(w, i).map(id => EN[id].nm);
      body = '<div id="mapScroll"><div id="mapIn" style="gap:0">' + nodes + '</div></div>' +
        '<div class="item" style="margin-top:10px;align-items:flex-start"><div class="fl"><div class="b" style="letter-spacing:.12em">' + (i + 1) + '. ' + sp.name.toUpperCase() + ' <span class="mut sm">- ' + NODE_NAME[t] + '</span></div><div class="xs mut" style="margin-top:4px;line-height:1.6">' + (t === 'B' ? 'BOSS: <b class="bad">' + B.nm + '</b> - ' + fmt(B.hp * (1 + (tier - 1) * .35)) + '+ HP, ' + B.ph.length + ' phases' : sp.waves + ' waves - ' + ro.join(', ') + (t === 'e' ? ' - <b class="bad">ELITE: ' + EN[W.el].nm + '</b>' : '') + (t === 'h' ? ' - asteroid storm' : '') + (t === 's' ? ' - lighter waves, extra loot' : '') + (glitchSpreading() && isCorrupt(w, i) && !(SAVE.flags.clean || {})[corruptKey(w, i)] ? '<br><b style="color:#ff2bd6">CORRUPTED: the glitch has spread here. Glitched enemies, +50% cores. Clear it to push the glitch back.</b>' : '') + (ALT_INFO[t] ? '<br><b class="gold">' + ALT_INFO[t].ds + '</b>' : ALT_NODE[i] ? '<br><span class="gold">A side route branches off here - tap the node above</span>' : '')) + '</div></div><button class="btn big" data-act="start">' + ((isAlt ? altStars(w, i, tier) : arr[i]) ? 'REPLAY' : 'LAUNCH') + '</button></div>';
    } else {
      body = '<div class="item" style="align-items:flex-start"><div class="fl"><div class="b">' + MODES[mode].nm.toUpperCase() + ' - ' + W.nm.toUpperCase() + '</div><div class="xs mut" style="margin-top:4px;line-height:1.6">' + MODES[mode].ds + '</div></div><button class="btn big" data-act="start">START</button></div>';
    }
    const tierSeg = mode === 'expedition' && pr.t > 1 ? '<div class="seg" style="width:200px">' + [1, 2, 3].map(n => '<button data-act="tier:' + n + '" class="' + (n === tier ? 'on' : '') + '"' + (n > pr.t ? ' disabled style="opacity:.35"' : '') + '>TIER ' + n + '</button>').join('') + '</div>' : '';
    return '<div class="card wide"><div class="row sp wrap"><div><h2 style="color:' + W.ac + '">' + W.nm + '</h2><div class="xs mut">' + W.sub + '</div>' + (mode === 'expedition' && tier > 1 ? '<div class="xs gold b" style="margin-top:4px;letter-spacing:.1em">REMIX: ' + (tier === 2 ? 'CROSSFIRE' : 'NIGHTMARE') + ' - other worlds join the fight, +' + (tier - 1) * 25 + '% rewards</div>' : '') + '</div>' + tierSeg + '</div><div class="tabs wf" style="margin-top:8px">' + tabs + '</div>' + body + '<div class="row sp" style="margin-top:12px"><button class="btn sm" data-act="back">BACK</button><span class="xs mut">' + (mode === 'expedition' ? 'Clear the boss to unlock the next world and higher tiers' : '') + '</span></div></div>';
  },
  scHangar: () => {
    const i = pi(), pl = SAVE.pl[i], c = pl.cfg, cat = UI.cat, st = shipStats(pl);
    const tabsP = SAVE.players === 2 ? '<div class="seg" style="width:140px">' + [0, 1].map(n => '<button data-act="ptab:' + n + '" class="' + (n === i ? 'on' : '') + '">P' + (n + 1) + '</button>').join('') + '</div>' : '';
    const cats = ['hull', 'wings', 'engine', 'canopy', 'paint', 'finish', 'weapon'], cn = { hull: 'HULL', wings: 'WINGS', engine: 'ENGINE', canopy: 'CANOPY', paint: 'PAINT', finish: 'FINISH', weapon: 'GUNS' };
    let items = '';
    const pv = UI.prev, optBtn = (act, sel, name, ds, price, own) => { const q = act.split(':'), isPv = pv && pv[0] === q[q.length - 2] && pv[1] === q[q.length - 1]; return '<div class="opt' + (sel || isPv ? ' sel' : '') + '" data-act="' + act + '"><b>' + name + '</b><span>' + ds + '</span>' + (sel ? '<span class="good b">EQUIPPED</span>' : own ? '<span class="acc">OWNED - tap to equip</span>' : isPv ? '<span class="gold b">PREVIEWING - TAP AGAIN TO BUY ' + fmt(price) + '</span>' : '<span class="lock">' + fmt(price) + ' CORES - tap to preview</span>') + '</div>'; };
    if (cat === 'hull' || cat === 'wings' || cat === 'engine' || cat === 'canopy') {
      const key = cat, P = PARTS[cat]; items = '<div class="grid2">' + Object.keys(P).map(id => P[id].secret && !SAVE.unl[id] && pl.own[cat].indexOf(id) < 0 ? '<div class="opt" style="opacity:.65;cursor:default"><b>??? SECRET HULL</b><span>' + P[id].hint + '</span><span class="lock">LOCKED</span></div>' : optBtn('part:' + cat + ':' + id, c[key] === id, P[id].nm, P[id].ds + (cat === 'hull' && ABIL[id] ? '<br><b style="color:#fbbf24">ABILITY: ' + ABIL[id].nm + '</b>' : ''), P[id].p, pl.own[cat].indexOf(id) >= 0)).join('') + '</div>';
    } else if (cat === 'paint') {
      items = '<div class="xs mut b" style="margin:4px 0 8px;letter-spacing:.12em">HULL COLOUR</div><div class="row wrap">' + PAINTS.map(p => '<div class="sw' + (c.paint === p ? ' sel' : '') + '" data-act="paint:' + p + '" style="background:' + p + '"></div>').join('') + '</div><div class="xs mut b" style="margin:14px 0 8px;letter-spacing:.12em">ACCENT GLOW</div><div class="row wrap">' + ACCENTS.map(p => '<div class="sw' + (c.accent === p ? ' sel' : '') + '" data-act="accent:' + p + '" style="background:' + p + ';box-shadow:0 0 12px ' + p + '"></div>').join('') + '</div><div class="setrow" style="margin-top:10px"><div>Racing stripe</div><div class="tog' + (c.stripe !== false ? ' on' : '') + '" data-act="stripe"></div></div>';
    } else if (cat === 'finish') {
      items = '<div class="grid2">' + Object.keys(FINISHES).map(id => optBtn('finish:' + id, c.finish === id, FINISHES[id].nm, id === 'chrome' ? 'Mirror metal' : id === 'matte' ? 'Flat, no shine' : id === 'pearl' ? 'Soft sheen' : id === 'neon' ? 'Glows in your accent' : 'Dark woven', FINISHES[id].p, (pl.own.finish || []).indexOf(id) >= 0)).join('') + '</div>';
    } else {
      items = '<div class="xs mut b" style="margin:4px 0 6px;letter-spacing:.12em">SECONDARY - ' + (touchOn() ? 'TAP SHOT' : 'TAP ' + keyLabel(KB[i].c[0]) + ' / RIGHT-CLICK') + '. HOLD TO CHARGE. TAP AS A SHOT HITS TO PARRY.</div><div class="grid3 secg">' + Object.keys(SECW).map(k => '<div class="opt' + ((pl.sec || 'salvo') === k ? ' sel' : '') + '" data-act="sec:' + k + '"><b style="color:' + SECW[k].c + '">' + SECW[k].nm + '</b><span>' + SECW[k].ds + '</span>' + ((pl.sec || 'salvo') === k ? '<span class="good b">EQUIPPED</span>' : '<span class="acc">FREE - tap to equip</span>') + '</div>').join('') + '</div><div class="xs mut b" style="margin:12px 0 6px;letter-spacing:.12em">MAIN GUN</div><div class="stack" style="gap:8px">' + WORDER.map(id => { const w = WPN[id], own = pl.wown.indexOf(id) >= 0, eq = pl.wpn === id; return '<div class="opt' + (eq ? ' sel' : '') + '" data-act="wpn:' + id + '"><div class="row sp"><b style="color:' + w.c + '">' + wName(pl, id) + '</b>' + (eq ? '<span class="good b">EQUIPPED</span>' : own ? '<span class="acc">OWNED</span>' : '<span class="lock">' + fmt(w.price) + ' CORES</span>') + '</div><span>' + w.ds + '</span><span class="xs">DMG ' + w.d + ' - RATE ' + (60 / w.r).toFixed(1) + '/s - PLASMA ' + w.am + '/shot</span>' + wupHtml(pl, id) + (own ? masteryHtml(pl, id) : '') + '</div>'; }).join('') + '</div>';
    }
    const bar = (lbl, v, mx, col) => '<div class="st"><span>' + lbl + '</span><div class="bar" style="height:8px"><i style="width:' + clamp(v / mx, 0, 1) * 100 + '%;--c:' + col + '"></i></div><b>' + (v < 10 ? v.toFixed(1) : Math.round(v)) + '</b></div>';
    return '<div class="hg"><div class="card" style="align-self:flex-start;margin-top:4px"><div class="row sp"><h2>Hangar</h2>' + tabsP + '<span class="gold b">' + fmt(SAVE.cores) + ' <span class="mut xs">CORES</span></span></div>' +
      '<div class="tabs wrap" style="margin-top:8px">' + cats.map(k => '<div class="tab' + (cat === k ? ' on' : '') + '" data-act="cat:' + k + '">' + cn[k] + '</div>').join('') + '</div>' + items +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">DONE</button><span class="xs mut">Drag to spin the ship</span></div></div>' +
      '<div class="hgr"><div class="card"><div class="b acc xs" style="letter-spacing:.2em;margin-bottom:6px">SHIP STATS - PILOT ' + (i + 1) + '</div>' + bar('HULL', st.hp, 400, '#fb7185') + bar('SHIELD', st.sh, 250, '#38bdf8') + bar('PLASMA', st.am, 350, '#2dd4bf') + bar('DAMAGE', st.dmg, 3, '#fde047') + bar('FIRE RATE', st.rate, 2.4, '#fb923c') + bar('SPEED', st.spd, 8, '#4ade80') + (() => { const vh = UI.prev && UI.prev[0] === 'hull' ? UI.prev[1] : c.hull, A = ABIL[vh] || ABIL.falcon; return '<div class="xs mut" style="margin-top:8px;line-height:1.5">ABILITY: <b class="gold">' + A.nm + '</b><br>' + A.ds + '</div>'; })() + '</div></div></div>';
  },
  scShop: () => {
    const i = pi(), pl = SAVE.pl[i], tabsP = SAVE.players === 2 ? '<div class="seg" style="width:140px">' + [0, 1].map(n => '<button data-act="ptab:' + n + '" class="' + (n === i ? 'on' : '') + '">P' + (n + 1) + '</button>').join('') + '</div>' : '';
    const up = Object.keys(UPG).map(k => {
      const U = UPG[k], lv = pl.up[k], mx = lv >= U.max, pr = upPrice(k, lv), can = SAVE.cores >= pr;
      return '<div class="item"><div class="ic acc">' + ICO[U.ic] + '</div><div class="fl"><div class="b sm">' + U.nm.toUpperCase() + '</div><div class="xs mut">' + U.ds + '</div><div class="pips">' + Array.from({ length: U.max }, (_, n) => '<i class="' + (n < lv ? 'on' : '') + '"></i>').join('') + '</div></div><button class="btn sm gold' + (mx || !can ? ' off' : '') + '" data-act="buy:' + k + '">' + (mx ? 'MAX' : fmt(pr)) + '</button></div>';
    }).join('');
    const wp = WORDER.map(id => { const w = WPN[id], own = pl.wown.indexOf(id) >= 0; return '<div class="item"><div class="ic" style="color:' + w.c + '">' + ICO.dmg + '</div><div class="fl"><div class="b sm" style="color:' + w.c + '">' + wName(pl, id).toUpperCase() + '</div><div class="xs mut">' + w.ds + '</div>' + wupHtml(pl, id) + '</div>' + (own ? '<button class="btn sm' + (pl.wpn === id ? ' on' : '') + '" data-act="wpn:' + id + '">' + (pl.wpn === id ? 'EQUIPPED' : 'EQUIP') + '</button>' : '<button class="btn sm gold' + (SAVE.cores < w.price ? ' off' : '') + '" data-act="wpn:' + id + '">' + fmt(w.price) + '</button>') + '</div>'; }).join('');
    return '<div class="card wide"><div class="row sp"><h2>Shop</h2>' + tabsP + '<span class="gold b">' + fmt(SAVE.cores) + ' <span class="mut xs">CORES</span></span></div><p class="xs mut" style="margin:6px 0 10px">Upgrades get pricier with every level you buy. Prices shown are for the NEXT level.</p><div class="grid2">' + up + '</div><h2 style="margin-top:16px">Weapons</h2><div class="grid2" style="margin-top:8px">' + wp + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm" data-act="hangar">HANGAR</button></div></div>';
  },
  scSettings: () => {
    const tab = UI.stab, tabs = Object.keys(SETS).concat(['DATA']), body = tab === 'DATA' ? '<div class="stack"><button class="btn" data-act="slots">SAVE SLOTS & TRANSFER</button><button class="btn" data-act="profile">PROFILE & ACHIEVEMENTS</button>' + (!SAVE.dev ? '<div class="row" style="gap:8px"><input id="devCode" class="inp" placeholder="ENTER CODE" autocomplete="off" autocapitalize="characters" spellcheck="false" style="flex:1;min-width:0;padding:10px;border-radius:9px;border:1px solid var(--line);background:rgba(4,12,26,.9);color:#e2e8f0;font:800 12px var(--mono);letter-spacing:.12em"><button class="btn sm" data-act="devcode">ENTER</button></div>' : '<button class="btn" data-act="cheat:cores">DEV: +1000 CORES</button><button class="btn" data-act="cheat:unlock">DEV: UNLOCK ALL WORLDS</button><button class="btn" data-act="cheat:sectors">DEV: UNLOCK ALL SECTORS ' + (SAVE.devAll ? '(ON)' : '(OFF)') + '</button><button class="btn" data-act="cheat:god">DEV: GOD MODE ' + (G.god ? '(ON)' : '(OFF)') + '</button><button class="btn sm" data-act="devoff">LOCK DEV TOOLS</button>') + '<button class="btn warn" data-act="resetset">RESET SETTINGS</button><button class="btn warn" data-act="wipe">WIPE SAVE DATA</button></div>' : SETS[tab].map(setRow).join('') + (tab === 'CONTROLS' ? '<div class="stack" style="margin-top:12px"><button class="btn" data-act="keys">KEYBOARD CONTROLS</button></div>' : '');
    return '<div class="card mid"><h2>Settings</h2><div class="tabs wrap" style="margin:8px 0">' + tabs.map(t => '<div class="tab' + (tab === t ? ' on' : '') + '" data-act="stab:' + t + '">' + t + '</div>').join('') + '</div>' + body + '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><span class="xs mut">Saved automatically</span></div></div>';
  },
  scPause: () => {
    const R = G.run, tr = R && R.mode === 'training', dev = SAVE.dev || G.god;
    return '<div class="card" style="width:min(400px,100%)"><h2 class="tc" style="font-size:20px">Paused</h2><div class="stack" style="margin-top:14px"><button class="btn big" data-act="resume">RESUME</button><button class="btn sm" data-act="photo">PHOTO MODE</button><button class="btn sm" data-act="fs">' + (document.fullscreenElement ? 'EXIT FULL SCREEN' : 'FULL SCREEN') + '</button>' + (tr ? '<div class="grid2"><button class="btn" data-act="spawnboss">SPAWN BOSS</button><button class="btn" data-act="nextworld">NEXT WORLD</button></div>' : '') + '<div class="grid2"><button class="btn" data-act="restart">RESTART</button><button class="btn" data-act="settings">SETTINGS</button></div><button class="btn warn" data-act="quit">QUIT TO MENU</button>' + (dev ? '<div class="grid2"><button class="btn sm gold" data-act="cheat:win">DEV: WIN</button><button class="btn sm gold" data-act="cheat:god">DEV: GOD</button></div>' : '') + '</div></div>';
  },
  scResult: () => {
    const d = UI.res, win = d.win, m = d.mode, titles = { expedition: win ? 'SECTOR CLEARED' : 'STARFIGHTER DESTROYED', endless: 'RUN OVER', blitz: 'TIME!', rush: win ? 'BOSS RUSH COMPLETE' : 'DEFEATED', training: 'SESSION OVER', daily: win ? 'DAILY COMPLETE' : 'DAILY FAILED', nohit: win ? 'FLAWLESS' : 'YOU WERE HIT', vault: win ? 'VAULT CRACKED' : 'VAULT LOCKED', defense: win ? 'STATION SAVED' : d.lost ? 'STATION LOST' : 'SHIP LOST', hardcore: 'HARDCORE OVER', versus: d.vsWin ? ((d.vsNm && d.vsNm[d.vsWin - 1]) || 'PLAYER ' + d.vsWin).toUpperCase() + ' WINS' : 'DRAW', chal: d.beat ? 'CHALLENGE BEATEN' : win ? 'CHALLENGE DONE' : 'CHALLENGE FAILED', gallery: win ? 'REMATCH WON' : 'REMATCH LOST', retro: win ? 'GAME CLEAR!' : 'GAME OVER' };
    const rows = [['SCORE', fmt(d.score)], ['KILLS', d.kills], ['CORES PICKED UP', '+' + fmt(d.cores)], d.bonus ? ['MISSION BONUS', '+' + fmt(d.bonus)] : null, d.remix ? ['REMIX FIRST-CLEAR (INCLUDED)', '+' + fmt(d.remix)] : null, m === 'endless' || m === 'hardcore' ? ['WAVE REACHED', d.wave + 1] : null, d.alt ? ['SIDE ROUTE BONUS', '+30%'] : null, d.secret ? ['SECRET EXIT', 'FOUND!'] : null, m === 'defense' ? ['WAVES HELD', d.wave] : null, d.stn !== undefined ? ['STATION INTEGRITY', d.stn + '%'] : null, d.streak ? ['DAILY STREAK', d.streak + (d.streak === 1 ? ' day' : ' days')] : null, ['GRAZES', d.graze], ['LONGEST CHAIN', d.maxCombo + ' kills'], ['TIME', d.time + 's'], d.xp ? ['PILOT XP', '+' + fmt(d.xp)] : null, d.lvUp ? ['LEVEL UP!', 'LV ' + d.lv + ' ' + rankName(d.lv).toUpperCase() + ' (+' + fmt(d.lvCores | 0) + ')'] : null, d.medal ? [MEDALS[d.medal][0] + ' MEDAL', '+' + fmt(d.medalCores | 0)] : null, d.missions ? ['MISSIONS DONE', d.missions.length + ' - claim in Missions'] : null, d.mastery ? ['MASTERY', d.mastery.join(', ')] : null, ...(d.vs ? d.vs.map((s, i) => [((d.vsNm && d.vsNm[i]) || 'PLAYER ' + (i + 1)).toUpperCase(), fmt(s)]) : []), d.rk ? ['RANKED RATING', d.rk.r1 + ' (' + (d.rk.r1 >= d.rk.r0 ? '+' : '') + (d.rk.r1 - d.rk.r0) + ') ' + rkTier(d.rk.r1).nm.toUpperCase()] : null, d.chal && d.chal.target ? ['SCORE TO BEAT', fmt(d.chal.target)] : null].filter(Boolean);
    return '<div class="card" style="width:min(460px,100%)"><div class="tc"><div class="title" style="font-size:clamp(22px,6vw,34px);background:linear-gradient(180deg,#fff,' + (win ? '#34d399' : '#fb7185') + ');-webkit-background-clip:text;background-clip:text">' + (titles[m] || (win ? 'MISSION COMPLETE' : 'MISSION FAILED')) + '</div>' + (m === 'expedition' && win ? '<div style="font-size:30px;margin:10px 0">' + stars(d.stars) + '</div>' : '') + rankHtml(d) + (titles[m] === undefined ? '' : '') + (d.best ? '<div class="gold b" style="margin-top:8px">★ NEW PERSONAL BEST ★</div>' : '') + (d.unlockW >= 0 ? '<div class="good b" style="margin-top:8px">WORLD ' + (d.unlockW + 1) + ' UNLOCKED: ' + WORLDS[d.unlockW].nm.toUpperCase() + '</div>' : '') + (d.unlock ? '<div class="gold b" style="margin-top:8px">NEW SHIP UNLOCKED: ' + d.unlock + '</div>' : '') + (d.ending ? '<div class="gold b" style="margin-top:8px">CAMPAIGN COMPLETE - THANK YOU FOR FLYING</div>' : '') + (d.assist ? '<div class="mut xs" style="margin-top:6px;letter-spacing:.1em">ASSIST RUN - REDUCED REWARDS</div>' : '') + '</div><div style="margin:14px 0">' + rows.map(r => '<div class="setrow"><span class="mut">' + r[0] + '</span><b>' + r[1] + '</b></div>').join('') + '</div>' + (!win && m !== 'training' && m !== 'blitz' ? '<div class="tipbox"><b class="gold xs" style="letter-spacing:.2em">TIP</b><div class="xs" style="line-height:1.6;margin-top:3px">' + hintFor(d) + '</div></div>' : '') + '<div class="stack">' + (!win && !d.assist && (d.fails | 0) >= 2 && (m === 'expedition' || m === 'daily') ? '<button class="btn gold" data-act="assist">TRY WITH ASSIST: +40% HULL, 35% LESS DAMAGE</button>' : '') +
      (d.newCode ? '<div class="item" style="flex-direction:column;align-items:stretch;gap:6px"><div class="xs mut b" style="letter-spacing:.12em">CHALLENGE A FRIEND - THEY MUST BEAT ' + fmt(Math.max(d.score, d.chal ? d.chal.target : 0)) + '</div><div class="row sp"><b class="acc" style="letter-spacing:.14em">' + d.newCode + '</b><span class="row" style="gap:6px">' + (netOn() ? '<button class="btn sm gold" data-act="chsendto:' + d.newCode + ':' + Math.max(d.score, d.chal ? d.chal.target : 0) + '">SEND</button>' : '') + '<button class="btn sm" data-act="copycode:' + d.newCode + '">COPY</button></span></div></div>' : '') + (m === 'expedition' && win && d.next !== null ? '<button class="btn big" data-act="nextlv">NEXT SECTOR</button>' : '') + (m === 'expedition' ? '<button class="btn" data-act="retry">' + (win ? 'REPLAY' : 'RETRY SECTOR') + '</button><button class="btn" data-act="tomap">EXPEDITION MAP</button>' : '<button class="btn big" data-act="retry">PLAY AGAIN</button>') + '<div class="grid2"><button class="btn sm" data-act="shop">SHOP</button><button class="btn sm" data-act="menu">MAIN MENU</button></div></div></div>';
  }
};
const SCLEAR = { scHangar: 1, scBestiary: 1 };

// ---------- UI controller ----------
const UI = {
  top: null, hist: [], w: 0, sel: 0, tier: 1, mode: 'expedition', pi: 0, cat: 'hull', stab: 'GAMEPLAY', res: null, retMode: null,
  el(id) {
    let e = $(id); if (!e) { e = document.createElement('div'); e.id = id; e.className = 'scr' + (SCLEAR[id] ? ' clear' : ''); $('ui').appendChild(e); }
    return e;
  },
  show(id, noHist) {
    document.querySelectorAll('.scr.on').forEach(e => e.classList.remove('on'));
    const e = this.el(id); e.innerHTML = '<div id="hdrag" style="position:absolute;inset:0;pointer-events:auto;touch-action:none;display:' + (id === 'scHangar' ? 'block' : 'none') + '"></div>' + SCR[id](); e.classList.add('on');
    if (id !== 'scHangar' && id.slice(0, 2) === 'sc') { const c = e.querySelector('.card'); if (c) c.scrollTop = 0; }
    if (!noHist && this.top && this.top !== id && !['scPause', 'scResult', 'scTut'].includes(this.top)) this.hist.push(this.top);
    this.top = id; G.showCfg = id === 'scHangar' ? prevCfg() : null; if (id !== 'scKeys') G.rebind = null;
    if (G.scene !== 'play' && R3) R3.setView(id === 'scHangar' ? 'hangar' : id === 'scBestiary' ? 'model' : 'menu');
    if (id === 'scBestiary') bstShow();
    const mp = e.querySelector('#mapScroll'); if (mp) { const n = mp.querySelector('.node.av:last-of-type, .node.sel'); const av = mp.querySelectorAll('.node.av'); const t = av[av.length - 1] || mp.querySelector('.node'); if (t && !this._keepScroll) mp.scrollLeft = Math.max(0, t.offsetLeft - mp.clientWidth / 2 + 30); if (this._keepScroll) mp.scrollLeft = this._keepScroll; this._keepScroll = 0; }
    if (this.gpfOn) navRestore();
  },
  refresh() { if (!this.top || !SCR[this.top]) return; const mp = $('mapScroll'); if (mp) this._keepScroll = mp.scrollLeft; const sc = document.querySelector('.scr.on .card'), st = sc ? sc.scrollTop : 0; this.show(this.top, true); const c = document.querySelector('.scr.on .card'); if (c) c.scrollTop = st; },
  hideAll() { document.querySelectorAll('.scr.on').forEach(e => e.classList.remove('on')); this.top = null; this.hist = []; },
  back() { const p = this.hist.pop(); if (G.scene === 'play' && G.paused && !p) { this.resume(); return; } this.show(p || 'scMenu', true); },
  escape() { if (this.top === 'scMenu') return; if (this.top === 'scPause') return togglePause(); this.back(); },
  pause() { this.show('scPause', true); },
  resume() { this.hideAll(); G.paused = false; },
  result(d) { this.res = d; clearMsgs(); this.show('scResult', true); }
};
function uiTick() { }

// ---------- actions ----------
function startLevel(w, lv, tier, alt) { const o = { mode: 'expedition', w, lv, tier, alt: !!alt, co: SAVE.players === 2 }; G.last = o; beginRun(o); }
function startMode(m, w) {
  const co = SAVE.players === 2; let o;
  if (m === 'daily') return startDaily();
  if (m === 'nohit') o = { mode: 'expedition', var: 'nohit', w: w | 0, lv: 12, tier: 1, co };
  else if (m === 'vault') o = { mode: 'expedition', var: 'vault', w: Math.max(0, Math.min(SAVE.wu, WORLDS.length) - 1), lv: 12, tier: 1, co };
  else o = { mode: m, w: w | 0, lv: 0, tier: 1, co };
  G.last = o; beginRun(o);
}
function buyUp(pl, k) { const U = UPG[k], lv = pl.up[k], pr = upPrice(k, lv); if (lv >= U.max) return; if (SAVE.cores < pr) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= pr; pl.up[k]++; SFX.buy(); saveGame(); UI.refresh(); }
const ACT = {
  play() { if (!SAVE.tut && !G._tutAsked) { G._tutAsked = 1; UI.show('scTut'); return; } UI.show('scModes'); },
  tutlater() { SAVE.tut = true; saveGame(); UI.show('scMenu', true); },
  tutorial() { SAVE.tut = SAVE.tut; UI.hideAll(); beginRun({ mode: 'tutorial', w: 0 }); },
  tutnext() { const R = G.run; if (!R || !R.tut) return; const T = R.tut, s = TUT[T.step]; if (s.last) tutFinish(false); else tutGo(T.step + 1); },
  tutskip() { tutFinish(true); },
  players(a) { SAVE.players = +a[0]; saveGame(); UI.refresh(); },
  hangar() { UI.prev = null; UI.cat = UI.cat || 'hull'; UI.show('scHangar'); },
  shop() { if (G.scene === 'play') { exitToMenu('scShop'); return; } UI.show('scShop'); },
  settings() { UI.show('scSettings'); },
  back() { UI.prev = null; UI.back(); },
  menu() { exitToMenu('scMenu'); },
  mode(a) { const m = a[0]; if (m === 'daily') { UI.show('scDaily'); return; } if (MODES[m].secret && !SAVE.unl[m]) { SFX.no(); alertMsg('LOCKED - A SECRET. KEEP PLAYING.'); return; } UI.mode = m; if (m === 'rush' || m === 'vault') { startMode(m, 0); return; } UI.w = Math.min(UI.w, SAVE.wu - 1); UI.sel = m === 'expedition' ? firstOpen(UI.w, UI.tier) : 0; UI.show('scMap'); },
  world(a) { const w = +a[0]; if (w >= SAVE.wu) { SFX.no(); alertMsg('DEFEAT THE PREVIOUS BOSS TO UNLOCK'); return; } UI.w = w; UI.tier = Math.min(UI.tier, prog(w).t); UI.sel = firstOpen(w, UI.tier); UI.refresh(); },
  tier(a) { UI.tier = +a[0]; UI.sel = firstOpen(UI.w, UI.tier); UI.refresh(); },
  lvl(a) { UI.alt = a[1] === 'alt' ? UI.w + ':' + a[0] : null; const i = +a[0], arr = prog(UI.w).done[UI.tier - 1] || []; let first = 0; while (first < LV && arr[first]) first++; if (SAVE.devAll) first = LV - 1; if (i > first) { SFX.no(); alertMsg('CLEAR EARLIER SECTORS FIRST'); return; } UI.sel = i; SFX.click(); UI.refresh(); },
  start() { if (UI.mode === 'expedition') startLevel(UI.w, UI.sel, UI.tier, !!ALT_NODE[UI.sel] && UI.alt === UI.w + ':' + UI.sel); else startMode(UI.mode, UI.w); },
  cat(a) { UI.cat = a[0]; UI.prev = null; SFX.click(); UI.refresh(); },
  ptab(a) { UI.pi = +a[0]; UI.prev = null; SFX.click(); UI.show(UI.top, true); },
  part(a) { const pl = SAVE.pl[pi()], cat = a[0], id = a[1], P = PARTS[cat][id]; if (pl.own[cat].indexOf(id) < 0) { if (!UI.prev || UI.prev[0] !== cat || UI.prev[1] !== id) { UI.prev = [cat, id]; SFX.click(); UI.refresh(); return; } if (SAVE.cores < P.p) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= P.p; pl.own[cat].push(id); SFX.buy(); } pl.cfg[cat] = id; UI.prev = null; saveGame(); UI.refresh(); },
  finish(a) { const pl = SAVE.pl[pi()], id = a[0]; pl.own.finish = pl.own.finish || ['chrome']; if (pl.own.finish.indexOf(id) < 0) { if (!UI.prev || UI.prev[0] !== 'finish' || UI.prev[1] !== id) { UI.prev = ['finish', id]; SFX.click(); UI.refresh(); return; } if (SAVE.cores < FINISHES[id].p) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= FINISHES[id].p; pl.own.finish.push(id); SFX.buy(); } pl.cfg.finish = id; UI.prev = null; saveGame(); UI.refresh(); },
  paint(a) { SAVE.pl[pi()].cfg.paint = a[0]; saveGame(); SFX.click(); UI.refresh(); },
  accent(a) { SAVE.pl[pi()].cfg.accent = a.join(':'); saveGame(); SFX.click(); UI.refresh(); },
  stripe() { const c = SAVE.pl[pi()].cfg; c.stripe = c.stripe === false; saveGame(); UI.refresh(); },
  wpn(a) { const pl = SAVE.pl[pi()], id = a[0], w = WPN[id]; if (pl.wown.indexOf(id) < 0) { if (SAVE.cores < w.price) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= w.price; pl.wown.push(id); SFX.buy(); } pl.wpn = id; saveGame(); UI.refresh(); },
  buy(a) { buyUp(SAVE.pl[pi()], a[0]); },
  wup(a) { buyWup(SAVE.pl[pi()], a[0]); },
  wevo(a) { buyWevo(SAVE.pl[pi()], a[0]); },
  card(a) { pickCard(+a[0]); },
  cardroll() { const K = G.pick; if (!K) return; const cost = 20 * (K.rr + 1); if (SAVE.cores < cost) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= cost; K.rr++; K.opts = rollCards(G.players[K.who], 3); SFX.buy(); UI.refresh(); },
  cardskip() { const K = G.pick; if (!K) return; SAVE.cores += 25; if (G.run) G.run.cores += 25; SFX.pick(); endPick(); },
  stab(a) { UI.stab = a[0]; UI.refresh(); },
  resume() { togglePause(); },
  restart() { UI.hideAll(); G.paused = false; G.inCombat = false; if (G.last) beginRun(G.last); },
  quit() { exitToMenu('scMenu'); },
  retry() { UI.hideAll(); if (G.last) beginRun(G.last); },
  nextlv() { const d = UI.res; UI.hideAll(); startLevel(d.w, d.next, d.tier); },
  tomap() { const d = UI.res; UI.w = d.w; UI.tier = d.tier; UI.mode = 'expedition'; UI.sel = firstOpen(d.w, d.tier); exitToMenu('scMap'); },
  spawnboss() { togglePause(); const R = G.run; if (R && !R.boss) { R.boss = spawnBoss(R.w, .6); } },
  nextworld() { const R = G.run; R.w = (R.w + 1) % WORLDS.length; G.world = R.w; buildBackdrop(R.w); R.q = []; G.ent.en.length = 0; togglePause(); },
  rotok() { G.rotOk = true; $('rot').style.display = 'none'; },
  devcode() { const c = String(UI.devCodeVal || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c === 'AETHERIA' || c === 'DEVMODE' || c === 'QUANTUMSTRIKE') { SAVE.dev = true; saveGame(); SFX.buy(); alertMsg('DEV TOOLS UNLOCKED'); UI.devCodeVal = ''; UI.refresh(); } else { SFX.no(); alertMsg('INVALID CODE'); } },
  devoff() { SAVE.dev = false; SAVE.devAll = false; G.god = false; saveGame(); UI.refresh(); },
  fs() { toggleFS(); },
  tap() { UI._taps = (UI._taps || 0) + 1; if (UI._taps === 7) { SAVE.dev = true; saveGame(); alertMsg('DEV TOOLS UNLOCKED (SETTINGS > DATA)'); } },
  cheat(a) { const k = a[0]; if (k === 'cores') { SAVE.cores += 1000; SFX.buy(); } else if (k === 'unlock') { SAVE.wu = WORLDS.length; WORLDS.forEach((_, i) => { prog(i).t = 3; }); } else if (k === 'sectors') { SAVE.devAll = !SAVE.devAll; alertMsg(SAVE.devAll ? 'ALL SECTORS OPEN' : 'SECTORS LOCKED AGAIN'); } else if (k === 'god') { G.god = !G.god; alertMsg(G.god ? 'GOD MODE ON' : 'GOD MODE OFF'); } else if (k === 'win') { togglePause(); if (G.run) { G.players.forEach(p => { p.inv = 99999; }); G.run.stage = 'clear'; G.run.st = 190; if (G.run.boss) { G.run.boss.hp = 1; } } } saveGame(); if (UI.top === 'scSettings') UI.refresh(); },
  resetset() { Object.assign(SET, SET_DEF); SET.keys = {}; applyKeys(); saveSet(); layout(); applyVol(); UI.refresh(); },
  wipe() { if (!window._wipeArm) { window._wipeArm = 1; alertMsg('TAP AGAIN TO WIPE EVERYTHING'); setTimeout(() => { window._wipeArm = 0; }, 3000); return; } store.del(SAVE_KEY); SAVE = loadSave(); saveGame(); UI.show('scMenu', true); }
};
function firstOpen(w, tier) { const arr = prog(w).done[tier - 1] || []; let f = 0; while (f < LV && arr[f]) f++; if (SAVE.devAll) f = Math.min(f, LV - 1); return Math.min(f, LV - 1); }
function initUI() {
  const ui = $('ui');
  ui.addEventListener('click', e => {
    const s = e.target.closest('[data-set]');
    if (s && s.classList.contains('tog')) { const k = s.dataset.set; SET[k] = !SET[k]; s.classList.toggle('on', SET[k]); SFX.click(); applySet(k); return; }
    const el = e.target.closest('[data-act]'); if (!el || el.classList.contains('off') || el.disabled) return;
    audio(); const p = el.dataset.act.split(':'), f = ACT[p[0]]; if (f) { if (p[0] !== 'buy' && p[0] !== 'part') SFX.click(); f(p.slice(1), el, e); }
  });
  const chg = e => { const s = e.target.closest('[data-set]'); if (!s || s.classList.contains('tog')) return; const k = s.dataset.set; let v = s.value; if (typeof SET_DEF[k] === 'number') v = parseFloat(v); SET[k] = v; applySet(k); };
  ui.addEventListener('input', e => { if (e.target.type === 'range') chg(e); else if (e.target.id === 'slotCode') UI.slotCode = e.target.value; else if (e.target.id === 'devCode') UI.devCodeVal = e.target.value; });
  ui.addEventListener('pointerdown', () => { if (UI.gpfOn) { UI.gpfOn = false; navFocus(null); } }, true); ui.addEventListener('change', e => { if (e.target.tagName === 'SELECT') chg(e); });
  let dragX = null;
  const mp = new Map();
  ui.addEventListener('pointerdown', e => { if (e.target.id === 'mdrag') { mp.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { e.target.setPointerCapture(e.pointerId); } catch (x) { } } });
  ui.addEventListener('pointermove', e => { const p = mp.get(e.pointerId); if (!p || !R3) return; if (mp.size === 1) R3.modelDrag(e.clientX - p.x, e.clientY - p.y); else { let o = null; mp.forEach((v, k) => { if (k !== e.pointerId) o = v; }); if (o) { const d0 = Math.hypot(p.x - o.x, p.y - o.y), d1 = Math.hypot(e.clientX - o.x, e.clientY - o.y); if (d0 > 4) R3.modelZoom(d1 / d0); } } p.x = e.clientX; p.y = e.clientY; });
  const mend = e => mp.delete(e.pointerId); ui.addEventListener('pointerup', mend); ui.addEventListener('pointercancel', mend);
  ui.addEventListener('pointerdown', e => { if (e.target.id === 'hdrag') { dragX = e.clientX; try { e.target.setPointerCapture(e.pointerId); } catch (x) { } } });
  ui.addEventListener('pointermove', e => { if (dragX !== null && R3) { R3.spin((e.clientX - dragX) * .012); dragX = e.clientX; } });
  const end = () => { dragX = null; }; ui.addEventListener('pointerup', end); ui.addEventListener('pointercancel', end);
  ui.addEventListener('wheel', e => { if (e.target.id === 'mdrag' && R3) R3.modelZoom(e.deltaY < 0 ? 1.1 : .91); const tb = e.target.closest && e.target.closest('.tabs'); if (tb && !G.inCombat) { tb.scrollLeft += e.deltaY; }
    if (G.inCombat && !G.paused && G.players[0]) cycleWeapon(G.players[0], e.deltaY > 0 ? 1 : -1); }, { passive: true });
}

function toggleFS() {
  const d = document, el = d.documentElement;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
    else { const f = el.requestFullscreen || el.webkitRequestFullscreen; if (!f) { alertMsg('FULL SCREEN NOT SUPPORTED HERE (TRY F11)'); return; } const p = f.call(el); if (p && p.catch) p.catch(() => alertMsg('FULL SCREEN BLOCKED (TRY F11)')); }
  } catch (e) { alertMsg('FULL SCREEN BLOCKED (TRY F11)'); }
}
document.addEventListener('fullscreenchange', () => { setTimeout(layout, 80); if (UI.top === 'scMenu' || G.paused) UI.refresh && UI.refresh(); });

// ================= UI 2: daily challenge, profile + achievements, save slots, key bindings =================
const sT = (n, s) => '<div class="stat"><b>' + n + '</b><span>' + s + '</span></div>';
const fmtT = s => { s = s | 0; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + 'h ' + m + 'm' : m + 'm ' + (s % 60) + 's'; };
const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

Object.assign(SCR, {
  scDaily: () => {
    const di = dailyInfo(), dl = SAVE.dl, W = WORLDS[di.w], streak = dailyStreakNow(), won = !!dl.done[di.key], rows = [];
    for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d); rows.push('<div class="setrow"><span class="' + (i ? 'mut' : 'acc b') + '">' + (i ? k : 'TODAY') + '</span><span>' + (dl.done[k] ? '<span class="good b">WON</span> ' : '') + ((dl.best[k] | 0) ? '<b>' + fmt(dl.best[k]) + '</b>' : '<span class="mut">-</span>') + '</span></div>'); }
    return '<div class="card mid"><div class="row sp"><div><h2>Daily Challenge</h2><div class="xs mut">' + di.key + ' - FIVE WAVES, THEN THE BOSS</div></div><div class="tc"><div class="gold b" style="font-size:24px">' + streak + '</div><div class="xs mut">DAY STREAK</div></div></div>' +
      '<div class="item" style="margin-top:12px;align-items:flex-start"><div class="fl"><div class="xs mut b" style="letter-spacing:.14em">TODAY\'S MODIFIER</div><div class="b acc" style="margin:3px 0">' + di.mod.nm + '</div><div class="xs mut" style="line-height:1.6">' + di.mod.ds + '</div><div class="xs mut" style="margin-top:8px">WORLD: <b style="color:' + W.ac + '">' + W.nm + '</b>' + (SAVE.wu < WORLDS.length ? ' <span class="mut">(more worlds as you unlock them)</span>' : '') + '</div></div></div>' +
      '<div class="xs mut b" style="letter-spacing:.14em;margin:14px 0 4px">LAST 7 DAYS - BEST SCORE</div>' + rows.join('') +
      '<div class="stack" style="margin-top:14px"><button class="btn big" data-act="dstart">' + (won ? 'PLAY AGAIN' : 'START CHALLENGE') + '</button></div><div class="row sp" style="margin-top:12px"><button class="btn sm" data-act="back">BACK</button><span class="xs mut">Win once a day to build a streak. Streaks pay bonus cores.</span></div></div>';
  },
  scProfile: () => {
    const S = SAVE, st = S.st, hv = Object.keys(st.hull).sort((a, b) => st.hull[b] - st.hull[a])[0], fav = hv && PARTS.hull[hv] ? PARTS.hull[hv].nm : '-';
    const stats = [[fmtT(st.time), 'PLAY TIME'], [fmt(st.runs), 'RUNS'], [fmt(st.kills), 'KILLS'], [fmt(st.bosses), 'BOSSES DOWN'], [fmt(st.deaths), 'SHIPS LOST'], [fmt(st.graze), 'GRAZES'], [st.combo + '', 'BEST CHAIN'], [fmt(st.cards), 'CARDS PICKED'], [fav, 'FAVOURITE HULL'], [dailyStreakNow() + '', 'DAILY STREAK'], [S.wu + '/' + WORLDS.length, 'WORLDS'], [sumStars() + '', '3-STAR SECTORS']];
    const ranks = ['S', 'A', 'B', 'C'].map(r => '<span class="rkb" style="color:' + RKC[r] + ';border-color:' + RKC[r] + '">' + r + ' <b>' + st.ranks[r] + '</b></span>').join('');
    const list = ACH.map(a => {
      const got = !!S.ach[a.id], hid = a.sec && !got, cur = Math.min(a.cur(), a.max), pc = Math.round(cur / a.max * 100);
      return '<div class="item ach' + (got ? ' got' : '') + '"><div class="ic ' + (got ? 'gold' : 'mut') + '">' + (hid ? ICO.lock : ICO[a.ic]) + '</div><div class="fl"><div class="b sm">' + (hid ? '???' : a.nm.toUpperCase()) + '</div><div class="xs mut">' + (hid ? 'A secret. Keep playing and it will find you.' : a.ds) + '</div>' + (got || hid ? '' : '<div class="bar" style="height:5px;margin-top:5px"><i style="width:' + pc + '%;--c:#fbbf24"></i></div>') + '</div><div class="xs ' + (got ? 'good b' : 'gold') + '" style="text-align:right;flex:none">' + (got ? 'DONE' : '+' + a.r) + '</div></div>';
    }).join('');
    return '<div class="card wide"><div class="row sp wrap"><h2>Pilot Profile</h2><span class="gold b">' + achCount() + '/' + ACH.length + ' <span class="mut xs">ACHIEVEMENTS</span></span></div><div class="statg" style="margin-top:10px">' + stats.map(s => sT(s[0], s[1])).join('') + '</div><div class="row" style="gap:8px;margin:10px 0 4px;flex-wrap:wrap">' + ranks + '</div><div style="margin-top:10px">' + rankChip() + xpBar() + '</div><div class="grid2" style="margin-top:10px"><button class="btn" data-act="logs">DATA LOGS <span class="acc">' + Object.keys(PS().logs).length + '/' + LOGS.length + '</span></button><button class="btn" data-act="missions">MISSIONS</button></div><div class="grid3" style="margin-top:8px"><button class="btn" data-act="codex">CODEX</button><button class="btn" data-act="juke">JUKEBOX</button><button class="btn" data-act="stats">STATS</button></div><button class="btn" data-act="bestiary" style="width:100%;margin-top:10px">BESTIARY  <span class="gold">' + bstCount()[0] + '/' + bstCount()[1] + '</span> <span class="mut xs">ENEMIES & BOSSES</span></button><div style="margin:14px 0 6px"><h2 style="font-size:15px">Achievements</h2></div><div class="agrid">' + list + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm" data-act="slots">SAVE SLOTS</button>' + (SAVE.flags.ending ? '<button class="btn sm gold" data-act="ending">WATCH ENDING</button>' : '') + '</div></div>';
  },
  scSlots: () => {
    const cards = [0, 1, 2].map(i => {
      const si = slotInfo(i), act = i === SLOT;
      return '<div class="item slot' + (act ? ' act' : '') + '" style="align-items:stretch;flex-direction:column;gap:8px"><div class="row sp wrap"><b>SLOT ' + (i + 1) + (act ? ' <span class="good xs">- ACTIVE</span>' : '') + '</b><span class="xs mut">' + (si ? fmt(si.cores) + ' cores - ' + si.wu + '/' + WORLDS.length + ' worlds - ' + fmt(si.kills) + ' kills - ' + fmtT(si.time) : 'EMPTY') + '</span></div><div class="row" style="gap:6px;flex-wrap:wrap">' +
        (act ? '' : '<button class="btn sm" data-act="slotuse:' + i + '">' + (si ? 'LOAD' : 'NEW GAME') + '</button>') + (si ? '<button class="btn sm" data-act="slotexp:' + i + '">EXPORT</button>' : '') + '<button class="btn sm" data-act="slotimp:' + i + '">IMPORT HERE</button>' + (si ? '<button class="btn sm warn" data-act="slotdel:' + i + '">' + (UI.delArm === i ? 'TAP AGAIN' : 'DELETE') + '</button>' : '') + '</div></div>';
    }).join('');
    const msg = UI.slotMsg || '';
    return '<div class="card mid"><h2>Save Slots</h2><p class="xs mut" style="margin:6px 0 10px;line-height:1.6">Three separate profiles. To move progress to another device: EXPORT a slot, copy the code, then paste it on the other device and press IMPORT HERE on a slot.</p><div class="stack" style="gap:8px">' + cards + '</div><div class="xs mut b" style="letter-spacing:.14em;margin:14px 0 6px">SAVE CODE</div><textarea id="slotCode" class="code" rows="4" placeholder="EXPORT fills this box. To import, paste a code here, then press IMPORT HERE on a slot.">' + escH(UI.slotCode || '') + '</textarea><div class="row sp" style="margin-top:8px"><span class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="slotcopy">COPY CODE</button><button class="btn sm" data-act="bkdl">DOWNLOAD BACKUP FILE</button><button class="btn sm" data-act="bkload">LOAD BACKUP FILE</button></span><span class="xs ' + (msg[0] === '!' ? 'bad' : 'good') + '" id="slotMsg">' + escH(msg.replace(/^!/, '')) + '</span></div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button></div></div>';
  },
  scKeys: () => {
    const rb = G.rebind;
    const col = pi => '<div class="kcol"><div class="b acc xs" style="letter-spacing:.2em;margin-bottom:6px">PLAYER ' + (pi + 1) + '</div>' + KACT.map(r => { const a = r[0], wait = rb && rb.pi === pi && rb.a === a, n = KB[pi][a].length; return '<div class="setrow"><span>' + r[1] + '</span><button class="kbtn' + (wait ? ' wait' : '') + '" data-act="rebind:' + pi + ':' + a + '">' + (wait ? 'PRESS A KEY...' : keyLabel(KB[pi][a][0]) + (n > 1 ? '<i>+' + (n - 1) + '</i>' : '')) + '</button></div>'; }).join('') + '</div>';
    return '<div class="card wide"><h2>Keyboard Controls</h2><p class="xs mut" style="margin:6px 0 10px;line-height:1.6">Tap an action, then press the new key. Esc cancels. A +N badge means extra default keys also work (set a new key to replace them). Reserved: P / Esc pause, N mute, 1-6 pick gun.</p><div class="keycols">' + col(0) + col(1) + '</div>' + padSection() + '<div style="height:12px"></div><div class="row sp"><button class="btn sm" data-act="back">BACK</button><button class="btn sm warn" data-act="keyreset">RESET TO DEFAULTS</button></div></div>';
  }
});

Object.assign(ACT, {
  daily() { UI.show('scDaily'); },
  dstart() { UI.hideAll(); startDaily(); },
  profile() { UI.show('scProfile'); },
  ending() { UI.hideAll(); playCut(endingPanels(), () => UI.show('scProfile'), { music: 14, world: 14 }); },
  slots() { UI.slotMsg = ''; UI.delArm = -1; UI.show('scSlots'); },
  slotuse(a) { switchSlot(+a[0]); UI.slotMsg = ''; UI.show('scSlots', true); },
  slotexp(a) { const i = +a[0]; UI.slotCode = exportCode(i); UI.slotMsg = 'Code for slot ' + (i + 1) + ' is ready. Press COPY CODE.'; UI.refresh(); },
  slotimp(a) { const i = +a[0], ta = $('slotCode'); if (ta) UI.slotCode = ta.value; const r = importCode(UI.slotCode, i); UI.slotMsg = r ? '!' + r : 'Imported into slot ' + (i + 1) + '.'; if (!r) UI.slotCode = ''; UI.refresh(); },
  slotdel(a) {
    const i = +a[0]; if (UI.delArm !== i) { UI.delArm = i; UI.refresh(); setTimeout(() => { if (UI.delArm === i) { UI.delArm = -1; if (UI.top === 'scSlots') UI.refresh(); } }, 3000); return; }
    UI.delArm = -1; deleteSlot(i); UI.slotMsg = 'Slot ' + (i + 1) + ' deleted.'; UI.refresh();
  },
  slotcopy() {
    const ta = $('slotCode'), m = $('slotMsg'), say = (t, bad) => { if (m) { m.textContent = t; m.className = 'xs ' + (bad ? 'bad' : 'good'); } };
    if (!ta || !ta.value) { say('Nothing to copy yet. Press EXPORT on a slot first.', 1); return; }
    ta.focus(); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { }
    if (ok) say('Copied!'); else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => say('Copied!'), () => say('Press and hold the box, then choose Copy.', 1)); else say('Press and hold the box, then choose Copy.', 1);
  },
  keys() { UI.show('scKeys'); },
  rebind(a) { startRebind(+a[0], a[1]); },
  keyreset() { resetKeys(); G.rebind = null; SFX.buy(); UI.refresh(); },
  assist() { UI.hideAll(); if (G.last) beginRun(Object.assign({}, G.last, { assist: true })); }
});

// ================= BESTIARY: every enemy and boss you've beaten, with a 3D model you can turn around =================
function bstInit() { // older saves: credit what the pilot has clearly already fought
  if (SAVE.flags.bst) return; SAVE.kd = SAVE.kd || {}; SAVE.bd = SAVE.bd || {};
  for (let w = 0; w < WORLDS.length; w++) { const pr = SAVE.prog[w]; if (!pr || !pr.done) continue; const any = pr.done.some(a => a && a.some(x => x)), boss = pr.done.some(a => a && a[12]);
    if (any) WORLDS[w].ro.concat([WORLDS[w].el]).forEach(id => { if (!SAVE.kd[id]) SAVE.kd[id] = 1; }); if (boss && !SAVE.bd[w]) SAVE.bd[w] = 1; }
  SAVE.flags.bst = 1;
}
function bstCount() { bstInit(); let n = 0, got = 0; for (let w = 0; w < WORLDS.length; w++) { worldEnemies(w).forEach(id => { n++; if (SAVE.kd[id]) got++; }); n++; if (SAVE.bd[w]) got++; } return [got, n]; }
function bstEntry(k) { return k.slice(0, 2) === 'B:' ? { boss: +k.slice(2) } : { id: k }; }
function bstShow() { const k = UI.bk; if (!R3) return; const e = k && bstEntry(k), ok = e && (e.boss !== undefined ? SAVE.bd[e.boss] : SAVE.kd[e.id]); R3.showModel(ok ? e : null); }
SCR.scBestiary = () => {
  bstInit(); const w = UI.bw | 0, ids = worldEnemies(w), [got, tot] = bstCount();
  if (!UI.bk || (UI.bk.slice(0, 2) !== 'B:' && ids.indexOf(UI.bk) < 0 && UI.bk !== 'B:' + w)) UI.bk = ids.find(id => SAVE.kd[id]) || (SAVE.bd[w] ? 'B:' + w : ids[0]);
  const tabs = WORLDS.map((x, i) => '<div class="tab' + (i === w ? ' on' : '') + '" data-act="bworld:' + i + '">' + (i + 1) + '</div>').join('');
  const ent = ids.map(id => { const d = EN[id], k = SAVE.kd[id] | 0; return '<button class="bent' + (k ? '' : ' lk') + (d.elite ? ' el' : '') + (UI.bk === id ? ' on' : '') + '" data-act="bsel:' + id + '">' + (k ? '<img src="' + enemyThumb(id) + '" alt="">' : '<div class="bq">?</div>') + '<span>' + (k ? d.nm : '???') + '</span><i>' + (k ? fmt(k) + ' KILLED' : 'NOT YET BEATEN') + '</i></button>'; }).join('')
    + '<button class="bent bs' + (SAVE.bd[w] ? '' : ' lk') + (UI.bk === 'B:' + w ? ' on' : '') + '" data-act="bsel:B:' + w + '"><span>' + (SAVE.bd[w] ? BOSSES[w].nm : '??? BOSS') + '</span><i>' + (SAVE.bd[w] ? 'BOSS - ' + SAVE.bd[w] + 'x DEFEATED' : 'BOSS - NOT YET BEATEN') + '</i></button>';
  const e = bstEntry(UI.bk); let info;
  if (e.boss !== undefined) { const B = BOSSES[e.boss], k = SAVE.bd[e.boss] | 0;
    info = k ? '<div class="b gold" style="letter-spacing:.12em">' + B.nm.toUpperCase() + ' <span class="xs">BOSS</span></div><div class="xs mut" style="margin:4px 0">' + WORLDS[e.boss].nm + ' - ' + k + 'x defeated - ' + fmt(B.hp) + ' base HP - ' + ((B.ph || []).length || 1) + ' phases</div><div class="sm" style="line-height:1.55">' + BOSS_INTEL[e.boss] + '</div>'
      : '<div class="b mut">??? BOSS</div><div class="sm mut" style="margin-top:6px;line-height:1.55">Defeat the boss of ' + WORLDS[e.boss].nm + ' to add it here.</div>';
  } else { const d = EN[e.id], k = SAVE.kd[e.id] | 0;
    info = k ? '<div class="b" style="letter-spacing:.12em">' + d.nm.toUpperCase() + (d.elite ? ' <span class="xs gold">ELITE</span>' : '') + '</div><div class="xs mut" style="margin:4px 0">' + fmt(k) + ' killed - ' + d.hp + ' base HP - speed ' + d.sp + '</div><div class="bchips">' + enemyFacts(e.id).map(t => '<span>' + t + '</span>').join('') + '</div><div class="sm" style="line-height:1.55;margin-top:6px">' + (INTEL[e.id] || '') + '</div>'
      : '<div class="b mut">???</div><div class="sm mut" style="margin-top:6px;line-height:1.55">Shoot one down in ' + WORLDS[w].nm + ' to unlock its entry and 3D model.</div>';
  }
  const ok = e.boss !== undefined ? SAVE.bd[e.boss] : SAVE.kd[e.id];
  return '<div class="bstL card"><div class="row sp"><h2>Bestiary</h2><span class="gold b">' + got + '/' + tot + ' <span class="mut xs">DISCOVERED</span></span></div>'
    + '<div class="xs mut b" style="letter-spacing:.14em;margin-top:6px">WORLD ' + (w + 1) + ' - ' + WORLDS[w].nm.toUpperCase() + '</div><div class="tabs wf" style="margin-top:6px">' + tabs + '</div>'
    + '<div class="bgrid">' + ent + '</div><div class="item" style="margin-top:10px;display:block">' + info + '</div>'
    + (ok && R3 ? '<div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn sm" data-act="bturn:-1">TURN LEFT</button><button class="btn sm" data-act="bturn:1">TURN RIGHT</button><button class="btn sm" data-act="bzoom:1">ZOOM +</button><button class="btn sm" data-act="bzoom:-1">ZOOM -</button><button class="btn sm" data-act="bauto">AUTO-SPIN</button><button class="btn sm" data-act="breset">RESET</button></div>' : '')
    + '<div class="row sp" style="margin-top:10px"><button class="btn sm" data-act="back">BACK</button></div></div>'
    + '<div id="mdrag">' + (!R3 ? '<div class="mhint" style="top:45%">3D MODELS ARE OFF - TURN THEM ON IN SETTINGS > GRAPHICS</div>' : ok ? '<div class="mhint">DRAG TO TURN  -  SCROLL OR PINCH TO ZOOM</div>' : '<div class="mhint" style="top:45%;font-size:30px;color:#334155">?</div>') + '</div>';
};
Object.assign(ACT, {
  bestiary() { UI.show('scBestiary'); },
  bworld(a) { UI.bw = +a[0]; UI.bk = null; SFX.click(); UI.refresh(); bstShow(); },
  bsel(a) { UI.bk = a.join(':'); SFX.click(); UI.refresh(); bstShow(); },
  bturn(a) { if (R3) R3.modelTurn(+a[0] * Math.PI / 4); },
  bzoom(a) { if (R3) R3.modelZoom(+a[0] > 0 ? 1.2 : .83); },
  bauto() { if (R3) R3.modelAuto(); },
  breset() { if (R3) R3.modelReset(); }
});

// ================= WORLD BRIEFING: shown before the first sector of each world =================
function enemyThumb(id) {
  if (R3 && R3.thumb) { const u = R3.thumb(id); if (u) return u; }
  const k = 'th2d:' + id; if (enemyThumb[k]) return enemyThumb[k]; // 2D fallback
  const c = document.createElement('canvas'); c.width = 160; c.height = 120; const g = c.getContext('2d'), d = EN[id];
  try { drawEnemy2D(g, { id, x: 80, y: 60, w: Math.min(110, 60 + d.w * .25), boss: false, d }, 0); } catch (e) { }
  return enemyThumb[k] = c.toDataURL();
}
SCR.scBrief = () => {
  const R = G.run, w = R ? R.w : 0, W = WORLDS[w], ids = worldEnemies(w), hz = W.hz && HZ_INTEL[W.hz];
  const rows = ids.map(id => { const d = EN[id]; return '<div class="brow' + (d.elite ? ' el' : '') + '"><img src="' + enemyThumb(id) + '" alt=""><div class="fl"><div class="b sm" style="letter-spacing:.1em">' + d.nm.toUpperCase() + (d.elite ? ' <span class="xs" style="color:#c084fc">ELITE</span>' : '') + '</div><div class="bchips">' + enemyFacts(id).map(t => '<span>' + t + '</span>').join('') + '</div><div class="xs" style="line-height:1.5;margin-top:4px;color:#cbd5e1">' + (INTEL[id] || '').replace(/^ELITE\. /, '') + '</div></div></div>'; }).join('');
  return '<div class="card mid brief"><div class="xs b" style="letter-spacing:.2em;color:' + W.ac + '">INTEL BRIEFING - WORLD ' + (w + 1) + '</div><h2 style="margin-top:2px;color:' + W.ac + '">' + W.nm + '</h2><div class="xs mut">' + W.sub + '</div>'
    + (hz ? '<div class="item" style="margin-top:10px;border-color:rgba(251,191,36,.45)"><div class="fl"><div class="xs b gold" style="letter-spacing:.14em">WORLD HAZARD</div><div class="xs" style="margin-top:3px;line-height:1.5">' + hz + '</div></div></div>' : '')
    + '<div class="bgrid2">' + rows + '</div>'
    + '<div class="xs mut" style="margin-top:10px;line-height:1.5">BOSS AHEAD: <b class="gold">' + BOSSES[w].nm + '</b> waits in sector 13. Each enemy gets a NEW label the first time it shows up in this sector.</div>'
    + '<div class="row sp bfoot"><span class="xs mut">Settings > Gameplay > Enemy briefings</span><button class="btn big" data-act="briefok">GOT IT - LAUNCH</button></div></div>';
};
ACT.briefok = () => { const R = G.run; SAVE.flags.brief = SAVE.flags.brief || {}; if (R) SAVE.flags.brief[R.w] = 1; saveGame(); G.brief = 0; UI.hideAll(); SFX.click(); };

// ================= EXTRA MAPS =================
SCR.scMaps = () => {
  const hm = SAVE.hi.maps || {};
  const cards = MAPS.map((m, i) => '<div class="mode" data-act="playmap:' + m.k + '" style="border-color:' + m.ac + '55"><div class="row"><b style="color:' + m.ac + '">' + m.nm.toUpperCase() + '</b></div><span>' + m.sub + '</span><em>' + (hm[m.k] ? 'BEST ' + fmt(hm[m.k]) : 'NOT PLAYED YET') + '</em></div>').join('');
  return '<div class="card mid"><div class="row sp"><h2>Extra Maps</h2><span class="xs mut">ENDLESS SURVIVAL</span></div><p class="xs mut" style="margin:6px 0 10px;line-height:1.6">Waves from every world keep coming, with a boss every 10 waves. ' + (SET.models && SET.bg3d !== false ? 'Best with 3D backgrounds on.' : 'Turn on 3D models and 3D backgrounds in Settings to see these maps!') + '</p><div class="grid2">' + cards + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button></div></div>';
};
Object.assign(ACT, {
  maps() { UI.show('scMaps'); },
  playmap(a) { const o = { mode: 'endless', w: 0, lv: 0, tier: 1, co: SAVE.players === 2, map: a[0] }; G.last = o; beginRun(o); }
});

// ================= WORLD 16: the UI glitches out =================
const GLY = '█▓▒░#@$%&?!01ΞΔΣ▚▞╳◆◇';
const GL = { on: false, held: [], bars: null };
function glitchCtx() {
  if (UI.top === 'scMap' && UI.mode === 'expedition' && UI.w === GLITCH_W) return true;
  const R = G.run; return !!(R && R.w === GLITCH_W && G.world === GLITCH_W && (G.scene === 'play' || UI.top === 'scResult' || UI.top === 'scBrief'));
}
function glitchTick() {
  const on = glitchCtx(); if (on !== GL.on) { GL.on = on; document.body.classList.toggle('glitchui', on); if (!on) glitchRestore(); }
  document.body.classList.toggle('calm', !!SET.reduce);
  if (!on || SET.reduce) { if (GL.bars) GL.bars.innerHTML = ''; return; }
  glitchRestore(true);
  if (Math.random() < .35) { // corrupt a few labels for a moment
    const root = [document.querySelector('#ui .scr.on'), document.getElementById('hud')].filter(Boolean), nodes = [];
    root.forEach(r => { const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.trim().length > 1 && n.parentElement && n.parentElement.offsetParent !== null && !n.parentElement.closest('input,textarea')) nodes.push(n); });
    for (let k = 0; k < 3 && nodes.length; k++) { const n = nodes[(Math.random() * nodes.length) | 0], t = n.nodeValue; if (GL.held.some(h => h[0] === n)) continue;
      const a = t.split('').map(ch => ch !== ' ' && Math.random() < .45 ? GLY[(Math.random() * GLY.length) | 0] : ch).join(''); GL.held.push([n, t, 1 + ((Math.random() * 3) | 0)]); n.nodeValue = a; }
  }
  if (!GL.bars) { GL.bars = document.createElement('div'); GL.bars.id = 'gbars'; document.body.appendChild(GL.bars); }
  GL.bars.innerHTML = Math.random() < .25 ? Array.from({ length: 2 + ((Math.random() * 4) | 0) }, () => '<i style="top:' + (Math.random() * 100).toFixed(1) + '%;height:' + (2 + Math.random() * 18).toFixed(0) + 'px;background:' + ['rgba(255,43,214,.22)', 'rgba(34,211,238,.2)', 'rgba(74,222,128,.16)', 'rgba(255,255,255,.12)'][(Math.random() * 4) | 0] + ';transform:translateX(' + ((Math.random() - .5) * 40).toFixed(0) + 'px)"></i>').join('') : '';
}
function glitchRestore(tickOnly) { GL.held = GL.held.filter(h => { if (tickOnly && --h[2] > 0) return true; if (h[0].isConnected) h[0].nodeValue = h[1]; return false; }); }
setInterval(() => { try { glitchTick(); } catch (e) { } }, 110);

// ================= PHOTO MODE: freeze, hide the UI, pick a filter, capture =================
const PHOTO = { f: 0, filters: [['NONE', ''], ['NOIR', 'grayscale(1) contrast(1.25)'], ['VIVID', 'saturate(1.7) contrast(1.1)'], ['RETRO', 'sepia(.6) saturate(1.3) hue-rotate(-12deg)'], ['DREAM', 'saturate(1.3) brightness(1.1) blur(.6px)'], ['GLITCH', 'hue-rotate(160deg) saturate(2)']] };
function photoEl() { let b = document.getElementById('photoBar'); if (!b) { b = document.createElement('div'); b.id = 'photoBar'; document.body.appendChild(b);
  b.addEventListener('click', e => { const a = e.target.closest('[data-p]'); if (!a) return; const k = a.dataset.p;
    photoDo(k); }); }
  const pd = (IN.pads && IN.pads.length) || (G._padPrev && G._padPrev.length), h = (t, k) => pd ? ' <i class="ph">' + k + '</i>' : '';
  b.innerHTML = '<button data-p="f">FILTER: ' + PHOTO.filters[PHOTO.f][0] + h('', 'X') + '</button><button data-p="hud">HUD' + h('', 'Y') + '</button><button data-p="snap" class="snap">CAPTURE' + h('', 'A') + '</button><button data-p="exit">EXIT' + h('', 'B') + '</button>'; return b; }
function photoDo(k, dir) {
  const shot = document.getElementById('photoShot');
  if (k === 'f') { PHOTO.f = (PHOTO.f + (dir || 1) + PHOTO.filters.length) % PHOTO.filters.length; photoApply(); SFX.click(); }
  else if (k === 'snap') photoSnap(); else if (k === 'hud') document.body.classList.toggle('photohud');
  else if (k === 'exit') photoExit(); else if (k === 'close') { if (shot) shot.remove(); } else if (k === 'save') photoSave();
}
let DLNS; try { if (window.claude && window.claude.use) window.claude.use('downloads').then(n => { DLNS = n; }).catch(() => { DLNS = null; }); } catch (e) { }
function photoSave() {
  const i = document.querySelector('#photoShot img'); if (!i) return; const name = 'aetheria-' + Date.now() + '.png';
  if (DLNS) { fetch(i.src).then(r => r.blob()).then(b => DLNS.save({ filename: name, data: b })).then(() => alertMsg('SAVED')).catch(e => { if (!e || e.code !== 'declined') alertMsg('COULD NOT SAVE - HOLD OR RIGHT-CLICK THE PICTURE'); }); return; }
  try { const a = document.createElement('a'); a.href = i.src; a.download = name; document.body.appendChild(a); a.click(); a.remove(); alertMsg('SAVED TO DOWNLOADS'); } catch (e) { alertMsg('HOLD OR RIGHT-CLICK THE PICTURE TO SAVE'); }
}
// controller in photo mode: A capture / save, X or bumpers or d-pad filter, Y hide HUD, B or START back
function photoPad(o, prev) {
  const e = k => o[k] && !prev[k], shot = document.getElementById('photoShot'), L = o.x < -.6 && !(prev.x < -.6), R = o.x > .6 && !(prev.x > .6);
  if (shot) { if (e('a0') || e('x2')) photoSave(); else if (e('b1') || e('start')) photoDo('close'); return; }
  if (e('a0')) photoDo('snap'); else if (e('x2') || e('rb') || R) photoDo('f', 1); else if (e('lb') || L) photoDo('f', -1); else if (e('y3')) photoDo('hud'); else if (e('b1') || e('start')) photoDo('exit');
}
function photoApply() { const f = PHOTO.filters[PHOTO.f][1]; ['cvBg', 'cvFx'].forEach(id => { const c = document.getElementById(id); if (c) c.style.filter = f; }); if (R3 && R3.__renderer) R3.__renderer.domElement.style.filter = f; photoEl(); }
function photoExit() { G.photo = false; document.body.classList.remove('photo', 'photohud'); PHOTO.f = 0; photoApply(); const b = document.getElementById('photoBar'); if (b) b.remove(); UI.show('scPause'); }
function photoSnap() {
  try { render(); const W = window.innerWidth, H = window.innerHeight, c = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1); c.width = W * dpr; c.height = H * dpr; const g = c.getContext('2d'); g.filter = PHOTO.filters[PHOTO.f][1] || 'none';
    [document.getElementById('cvBg'), R3 && R3.__renderer ? R3.__renderer.domElement : null, document.getElementById('cvFx')].forEach(cv => { if (cv && cv.style.visibility !== 'hidden') g.drawImage(cv, 0, 0, c.width, c.height); });
    g.filter = 'none'; g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '700 ' + (12 * dpr) + 'px monospace'; g.fillText('AETHERIA: QUANTUM STRIKE', 14 * dpr, c.height - 14 * dpr);
    let d = document.getElementById('photoShot'); if (d) d.remove(); d = document.createElement('div'); d.id = 'photoShot'; d.innerHTML = '<img alt="screenshot"><div>HOLD (PHONE) OR RIGHT-CLICK (COMPUTER) TO SAVE <button data-p="save">DOWNLOAD</button> <button data-p="close">CLOSE</button></div>' + ((IN.pads && IN.pads.length) || (G._padPrev && G._padPrev.length) ? '<div class="ph2">A / X: DOWNLOAD - B: CLOSE</div>' : ''); d.querySelector('img').src = c.toDataURL('image/png');
    d.addEventListener('click', e => { const k = e.target.dataset.p; if (k) photoDo(k); }); document.body.appendChild(d); SFX.click();
  } catch (e) { alertMsg('CAPTURE FAILED'); }
}
ACT.photo = () => { UI.hideAll(); G.photo = true; document.body.classList.add('photo'); photoEl(); };
ACT.sec = a => { const pl = SAVE.pl[pi()]; if (SECW[a[0]]) pl.sec = a[0]; saveGame(); SFX.click(); UI.refresh(); };

// ================= UPDATES (patch notes) + CREDITS =================
const inVal = id => { const a = Array.from(document.querySelectorAll('[id="' + id + '"]')), el = a.find(e => e.closest('.scr.on')) || a.find(e => e.offsetParent) || a[a.length - 1]; return ((el || {}).value || '').trim(); };
const GAME_VER = 'V38';
const STUDIO = 'Driftwire Games';
let dwN = 0;
function dwEmblem(cls) { const i = 'dw' + (++dwN); return '<svg class="dw-e ' + (cls || '') + '" viewBox="0 0 64 64" fill="none" aria-hidden="true"><defs><linearGradient id="' + i + 'g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset=".55" stop-color="#60a5fa"/><stop offset="1" stop-color="#c084fc"/></linearGradient><filter id="' + i + 'f" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6"/></filter></defs><path class="dw-w" pathLength="1" d="M3 47C9 47 10 54 17 54H30C45 54 54 44 54 32C54 20 45 10 30 10H19V36" stroke="url(#' + i + 'g)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path class="dw-w2" pathLength="1" d="M27 21H30C38 21 43 26 43 32C43 38 38 43 30 43H27" stroke="url(#' + i + 'g)" stroke-width="2.4" stroke-linecap="round" opacity=".55"/><g class="dw-n"><circle cx="19" cy="40" r="5.5" fill="#fff" filter="url(#' + i + 'f)" opacity=".9"/><circle cx="19" cy="40" r="3.2" fill="#fff"/></g></svg>'; }
const dwLogo = cls => '<div class="dw ' + (cls || '') + '" role="img" aria-label="' + STUDIO + '">' + dwEmblem() + '<div class="dw-t"><div class="dw-1">DRIFTWIRE</div><div class="dw-2">GAMES</div></div></div>';
const UPDATES = [
  ['V38', 'Squad Up', ['Online co-op for up to 4 pilots: quick match or a private room', 'Online versus for up to 4 pilots - most points wins', 'Enemies get tougher with every extra pilot', 'Ranked versus: one-on-one matches with a rating, six tiers from Bronze to Ace, and monthly seasons', 'Placement matches, promotions and demotions, plus a season leaderboard', 'End-of-season rewards: cores for the tier you reached', 'Four-pilot HUD and colour-coded pilots in the lobby']],
  ['V37', 'Online Records', ['Leaderboards: global top 50 and friends-only boards for Pilot XP, Endless, Blitz, Boss Rush, Hardcore, Station Defense and today\'s Daily', 'Cloud saves: back up your progress to your account and load it on any computer', 'Auto-backup to the cloud after each run (can be turned off)', 'Challenge inbox: send a challenge code straight to a friend, and find out when they beat (or fail to beat) your score', 'REVENGE button when a friend beats your challenge', 'New Leaderboards button on the main menu']],
  ['V36', 'Driftwire Games', ['Aetheria now has a studio: Driftwire Games', 'New animated Driftwire logo in the intro movie', 'The logo also appears in the credits and on the main menu']],
  ['V35', 'Lights, Camera', ['A new intro movie when the game loads: a warp jump, a drop into your world and the title slamming in (press any key to skip)', 'Flying main menu: your ship now cruises through the furthest world you have reached', 'The menu warps between your unlocked worlds every so often, and your ship does the odd barrel roll', 'Both can be turned off in Settings > Graphics']],
  ['V34', 'Difficulty Rebalance', ['Early worlds are tougher: enemies have more health, hit harder and come in bigger waves from World 1', 'Late bosses are fairer: World 15-17 bosses have about 60% less health than before', 'Enemy damage now rises more smoothly from world to world', 'Regular enemies in the last worlds are slightly less tanky']],
  ['V33', 'New Screen Layouts', ['Select Mode: a big list of modes on the left and a briefing for the one you pick', 'Shop: categories down the side and one clean list with level bars', 'Pause: big Resume / Restart / Settings / Photo / Quit choices with your run stats', 'Results: a huge title and rank on one side, your stats on the other', 'Settings, Hangar and Profile: side rails instead of rows of tabs', 'Expedition map: numbered world buttons and a bigger sector route']],
  ['V32', 'Every Screen Restyled', ['Every menu screen now matches the new main menu: big titles, glass panels and your ship in the background', 'Buttons, tabs, cards and toggles all follow your ship\'s accent colour', 'Cleaner layouts on phones']],
  ['V31', 'New Main Menu', ['A brand-new full-screen main menu: big title, your ship front and centre, and everything else tidied into one row', 'The menu takes its colour from your ship\'s accent', 'Pilot card with your rank, level progress, cores and worlds', 'Works with mouse, touch and controller, on any screen size']],
  ['V30', 'Online', ['Online play on the Aetheria website: sign in with Google', 'Pilot names and friend codes, friend requests, and see which friends are online', 'Online co-op and versus: quick match, private rooms with a 4-letter code, or invite a friend', 'Direct connection between players, with an automatic backup route if a network blocks it', 'Quick emotes in online matches (keys 7 8 9 0)', 'Block and report options for other pilots']],
  ['V29', 'Make It Yours', ['Creator mode: a level editor - pick a world, build waves from any enemy you have met, add an end boss', 'Boss builder: choose a body, colour, health, phases and attacks, then fight it', 'Share codes for levels (AQL1:) and bosses (AQB1:) so friends can play what you made', 'The glitch is spreading: once The Glitch opens, corrupted sectors appear in older worlds until you beat the Null Process', 'Corrupted sectors have glitched enemies and +50% cores - clear them to push the glitch back', 'Beat the Null Process and see what happens to the game itself...', 'New achievements: Maker, Antivirus, and a secret one']],
  ['V28', 'Together and Fair', ['Co-op: fly to a downed teammate to revive them', 'Co-op link beam: stay close and a beam between your ships cuts enemies and bullets', 'Team Finisher: when both supers are full, one press fires a double Nova Beam', 'Versus mode: a 2-minute score duel for two players', 'Ghost replays: race a ghost of your best run of every sector', 'Challenge codes: share a code so a friend gets the exact same waves and tries to beat your score', 'Controller remapping (Settings > Controls > Keys)', 'Accessibility: colour-blind palettes, bigger enemy bullets, hitbox display and slower game speeds', 'Download and load a backup file of your save', 'Auto performance mode lowers graphics if the game starts to lag', 'Stats page with charts (Profile > Stats)']],
  ['V27', 'Sound Overhaul', ['Every sound effect rebuilt with layers: punchier guns, deeper explosions, shimmering pickups', 'New sounds for charge shots, parries and the super finisher', 'Dynamic music: each layer of the soundtrack fades in and out with the action', 'Long combos add a driving percussion layer, and the super finisher adds a choir', 'Jukebox (Profile > Jukebox): play any track you have unlocked, at any intensity, with a visualizer']],
  ['V26', 'The First Signal', ['World 17: Aetheria Prime - unlocks after The Glitch', 'True final boss: Aetheria Prime, the First Signal, with six phases', 'The true ending - with a choice that changes how it ends', 'Vex, a rival ace, challenges you four times across the campaign', 'Dialogue choices in cutscenes: be kind or fierce to Vex - win her over and she joins the final fight', 'Codex: lore pages for every world, boss and character (Profile > Codex)', 'New achievements: The True Ending and Wingmate']],
  ['V25', 'Pilot Career', ['Pilot XP and 11 ranks from Cadet to Legend - level ups pay cores', 'Weapon mastery: Bronze, Silver, Gold and Diamond per gun, each unlocking a bullet skin (Hangar > Guns)', 'Missions: 3 daily missions and a big weekly one', 'Cosmetics shop: ship skins, engine trails, bullet colours and kill effects', 'Data logs: one hidden in every world, readable in Profile', 'Medals for every sector: Bronze, Silver, Gold and Platinum, with core rewards', 'New achievements: Rising Star, Top Brass, Archivist, Weapon Master and Decorated']],
  ['V24', 'Routes and Secrets', ['Branching paths: sectors 4 and 9 split into side routes - Treasure Run and The Gauntlet', 'Boss Gallery: rematch any boss you have beaten with modifiers (Double Health, Fury, Escorts, No Abilities, One Hit) for bigger rewards', 'Hardcore mode: one life, random sectors from every unlocked world, bosses every 10 waves', 'Five hidden rifts in the campaign - shoot what flickers to find a secret exit', 'Find three rifts to unlock a secret world...', 'New achievements: Rift Walker, Insert Coin, Iron Will, Showoff and Off the Map']],
  ['V23', 'Combat Overhaul', ['Charge shot: hold C (or right-click / SHOT button) and release for a piercing blast', 'Secondary weapons: tap C to fire Seeker Salvo, Flak Burst or Mine Layer (pick one in Hangar > Guns)', 'Parry: tap C just as a shot is about to hit to send it back at the enemy', 'Super Finisher: kills, combos and parries fill the pink bar - press V for a giant Nova Beam', 'Golden Elites: rare golden enemies with huge rewards - kill them before they escape', 'Mid-level events: Meteor Showers, Supply Drops, Ambushes, Bounties and Ion Surges', 'Three new ships: Ronin (melee blade), Hive (drone carrier) and Longbow (sniper)', 'New achievements: Untouchable, Gold Rush and Nova Beam', 'Photo mode works with a controller (A capture, X filter, Y HUD, B back) and has a DOWNLOAD button']],
  ['V22', 'Graphics Overhaul', ['Bloom glow on lasers, lights and explosions', 'Bigger explosions with fireballs, shockwaves and smoke', 'Your ship smokes and catches fire as it takes damage', 'Weather in every world: rain, snow, sandstorms, embers, bubbles, ash and data storms', '3D boss flyby intros', 'Day-to-night sunsets in outdoor worlds', 'Buildings and terrain explode in the background during boss fights', 'Photo mode: pause, then PHOTO MODE, with filters and capture', 'New Graphics settings for bloom, weather and day/night', 'Updates panel and credits']],
  ['V21', 'Corrupted Interface', ['The whole UI glitches out while you browse World 16', 'Scrambling text, tearing bars and jittering panels (calmer with Reduce Motion)']],
  ['V20', 'World 16: The Glitch', ['The extra maps became a real campaign world: a glitch in the matrix', 'New maps: Freeway, High School, Beach and Vaporwave', 'Five corrupted enemies, including the elite Admin Process', 'New boss: The Null Process, with five phases', 'Unlocks after you beat the World 15 boss']],
  ['V19', 'Strange Places', ['New map: The Backrooms - endless yellow halls', 'New map: Blocklands - an original voxel world']],
  ['V18', 'Hometown', ['New map: Suburb, full of houses, people and cars', 'New map: Theme Park, with working roller coasters']],
  ['V17', 'Living Worlds', ['Every world now has life in it: creatures, flocks, ships and traffic']],
  ['V16', 'The City Wakes Up', ['The city is packed with people, cars, police, the military, roads and sunsets', 'Cel shading on all backgrounds']],
  ['V15', 'Soundtrack', ['A new high-quality soundtrack with a theme for every world', 'Mixing, reverb and echo that make the music sound fuller']],
  ['V14', 'Field Briefings', ['The first sector of each world explains its enemies before you fly', 'New enemies are tagged the first time you see them']],
  ['V13', 'Bestiary', ['A Bestiary in your Profile for every enemy and boss you have beaten', 'Spin and zoom the 3D models to see them up close']],
  ['V12', 'Cel Shading', ['Cartoon lighting with ink outlines on every ship, enemy and boss']],
  ['V11', 'Themed Arenas', ['Every world got its own 3D landscape: icy mountains, a cyber city, a rusty desert and more', 'Only the true space worlds keep the orbiting camera']],
  ['V10', '3D Backgrounds', ['3D parallax backgrounds', 'The camera orbits planets and the black hole', 'Full screen button', 'Dev panel unlock code']],
  ['V9', 'Fix Pack', ['World select now fits on small screens', 'Dev option to unlock every sector', 'Fixed asteroid waves that could get stuck', 'Boss sectors now go straight to the boss']],
  ['V6-V8', 'Story Mode', ['Worlds 11 to 15 with five new bosses', 'Comic-style cutscenes with Aria and the pilots', 'A full ending', 'Boss stingers and world themes']],
  ['V5', 'More Ways to Play', ['Daily Challenge, Station Defense, No-Hit Runs and The Vault', 'Achievements and save slots', 'Key remapping and full gamepad menu control', 'Assist mode and save codes']],
  ['V1-V4', 'Launch', ['Aetheria: Quantum Strike takes off', 'Ten worlds, sector map, hangar and shop', 'Eight weapons with levels and evolutions', 'Upgrade cards, abilities, co-op, Endless, Boss Rush and Blitz', 'Flight School tutorial']]
];
Object.assign(SCR, {
  scUpdates: () => '<div class="card mid"><div class="row sp wrap"><h2>Updates</h2><span class="gold b">CURRENT VERSION ' + GAME_VER + '</span></div><div class="upd">' +
    UPDATES.map((u, i) => '<div class="updi' + (i ? '' : ' cur') + '"><div class="row sp"><b class="acc">' + u[0] + ' <span style="color:var(--txt,#fff)">' + u[1] + '</span></b>' + (i ? '' : '<span class="xs gold b">NEW</span>') + '</div><ul>' + u[2].map(t => '<li>' + t + '</li>').join('') + '</ul></div>').join('') +
    '</div><div class="row sp" style="margin-top:12px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm" data-act="credits">CREDITS</button></div></div>',
  scCredits: () => '<div class="card" style="width:min(440px,100%)"><div class="title" style="font-size:clamp(22px,6vw,32px)">CREDITS</div><div class="subt">AETHERIA: QUANTUM STRIKE ' + GAME_VER + '</div><div class="stack tc" style="gap:14px;margin:6px 0 14px"><div style="display:flex;justify-content:center;margin:4px 0 2px">' + dwLogo('dw-cr') + '</div><div><div class="xs mut b" style="letter-spacing:.2em">CREATED BY</div><div class="gold b" style="font-size:20px;letter-spacing:.06em">LUKEN WISER</div></div><div><div class="xs mut b" style="letter-spacing:.2em">GAME DESIGN AND DIRECTION</div><div class="b">Luken Wiser</div></div><div><div class="xs mut b" style="letter-spacing:.2em">3D ENGINE</div><div class="b">three.js</div></div><div class="xs mut">Thanks for playing!</div></div><button class="btn" data-act="back" style="width:100%">BACK</button></div>'
});
Object.assign(ACT, { updates() { UI.show('scUpdates'); }, credits() { UI.show('scCredits'); } });

// ================= STORY: comic-style cutscenes before each boss, and the ending =================
// Each boss gets three panels: a wide shot (ARIA, your ship's AI, briefs you), a close-up (you or ARIA react) and a reveal
// (the boss speaks). Shown the first time you meet a boss by default; Settings > Gameplay > Story scenes changes that.
const STORY = [
  [['wide', 'ARIA', 'Skylines ahead. The old capital air-defense grid is online... and hostile.'], ['close', 'PILOT', 'Of course it is. How big is it?'], ['reveal', 'BOSS', 'Intruder detected. This airspace is closed.']],
  [['wide', 'ARIA', 'Spores everywhere. The hive has grown through the whole ravine.'], ['close', 'PILOT', 'Something is feeding it. Break the glowing pods first.'], ['reveal', 'BOSS', 'You will bloom with the rest.']],
  [['wide', 'ARIA', 'Mars. The mining rigs never got the shutdown order.'], ['close', 'PILOT', 'So they just kept digging. For centuries.'], ['reveal', 'BOSS', 'Ore quota not met. You are ore.']],
  [['wide', 'ARIA', 'Sensors are blind in the nebula. Something huge is circling us.'], ['close', 'ARIA', 'Its armor has weak points. Shoot the glowing pod to stagger it.'], ['reveal', 'BOSS', 'The void looks back.']],
  [['wide', 'ARIA', 'Gravity is bending every shot. Stay out of the well.'], ['close', 'PILOT', 'Time to find out what is at the bottom.'], ['reveal', 'BOSS', 'All light belongs to me.']],
  [['wide', 'ARIA', 'A frozen armada. Hull temperature falling fast.'], ['close', 'PILOT', 'Keep the engines hot. We are not stopping now.'], ['reveal', 'BOSS', 'Sleep. The cold is patient.']],
  [['wide', 'ARIA', 'This whole moon was forged into one big weapon.'], ['close', 'PILOT', 'Then we break the hammer.'], ['reveal', 'BOSS', 'I am the forge. You are the metal.']],
  [['wide', 'ARIA', 'Pressure rising. Something is glowing in the dark.'], ['close', 'PILOT', 'Do not follow the light.'], ['reveal', 'BOSS', 'Come closer. The light is warm.']],
  [['wide', 'ARIA', 'The machine mind is awake. And it knows your name.'], ['close', 'PILOT', 'Then let us give it something to remember.'], ['reveal', 'BOSS', 'I have already simulated your defeat.']],
  [['wide', 'ARIA', 'Time is stuttering. This is the last hour of the last world.'], ['close', 'PILOT', 'We have heard that before.'], ['reveal', 'BOSS', 'Every moment ends here.']],
  [['wide', 'ARIA', 'Beyond the old worlds: a wrecked ring station. Something inside is still running it.'], ['close', 'PILOT', 'The signal is stronger here. We are close.'], ['reveal', 'BOSS', 'The ring must be mended. You are scrap.']],
  [['wide', 'ARIA', 'Crystal islands, singing. Every shard repeats the same signal.'], ['close', 'PILOT', 'It is not a song. It is a call.'], ['reveal', 'BOSS', 'One voice. A thousand facets.']],
  [['wide', 'ARIA', 'A storm the size of a world, and it is still growing.'], ['close', 'PILOT', 'Ride the edge. Watch for the strikes.'], ['reveal', 'BOSS', 'Feel the whole world turn!']],
  [['wide', 'ARIA', 'A graveyard of fleets. They answered the signal once, long ago.'], ['close', 'PILOT', 'And never came home.'], ['reveal', 'BOSS', 'We answered. Now you will too.']],
  [['wide', 'ARIA', 'This is it. The Heart of Aetheria, where every signal began.'], ['close', 'PILOT', 'Whatever it is, we finish this.'], ['reveal', 'BOSS', 'You heard the call. You came. Thank you. Now... please... stop me.']],
  [['wide', 'ARIA', 'Pilot... the Core is gone, but the signal never stopped. Something is copying the worlds and getting them wrong.'], ['close', 'PILOT', 'A suburb. A theme park. A school hallway. ARIA, none of these were ever out here.'], ['reveal', 'BOSS', 'ERROR: PLAYER NOT FOUND. DELETING... DELETING... DELETING...']]
];
const ENDING = [
  { kind: 'reveal', who: 'NARRATOR', text: 'The Core flickers. Its light bends, cracks... and the signal stops.', bi: 14, crack: 1, notitle: 1 },
  { kind: 'close', who: 'ARIA', text: 'Final packet decoded: "Thank you. The loop is broken. Fly home, pilot."' },
  { kind: 'wide', who: 'NARRATOR', text: 'Across fifteen worlds, the lights came back on. One by one.', ending: 1 },
  { kind: 'title', who: '', text: 'Thank you for flying' }
];
const bossPanels = wi => (STORY[wi] || []).map(p => ({ kind: p[0], who: p[1] === 'BOSS' ? BOSSES[wi].nm : p[1], text: p[2], bi: wi, boss: p[1] === 'BOSS' }));
const endingPanels = () => ENDING.map(p => Object.assign({}, p));
function storyDue(wi) {
  const R = G.run; if (!R || G.net || SET.story === 'off' || R.mode !== 'expedition' || R.var || !STORY[wi]) return false;
  const seen = SAVE.flags.cut && SAVE.flags.cut[wi]; return SET.story === 'always' || !seen;
}

// ---------- comic art helpers ----------
const dkc = (c, k) => { const n = hx(c); return 'rgb(' + ((n >> 16 & 255) * k | 0) + ',' + ((n >> 8 & 255) * k | 0) + ',' + ((n & 255) * k | 0) + ')'; };
const glowDot = (g, x, y, r, col) => { g.save(); g.globalCompositeOperation = 'lighter'; drawGlow(g, x, y, r * 3.4, col, .9); g.restore(); g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r * .45, 0, TAU); g.fill(); };
const poly = (g, pts) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
const BART = [
  (g, S, c, d, t) => { poly(g, [[-S, 0], [-S * .55, -S * .3], [S * .75, -S * .22], [S, 0], [S * .75, S * .22], [-S * .55, S * .3]]); g.fill(); g.stroke(); for (let i = -2; i <= 2; i++) { g.fillRect(i * S * .3 - S * .08, -S * .38, S * .16, S * .12); g.strokeRect(i * S * .3 - S * .08, -S * .38, S * .16, S * .12); } glowDot(g, -S * .8, 0, S * .08, c); },
  (g, S, c, d, t) => { g.beginPath(); for (let i = 0; i <= 44; i++) { const a = i / 44 * TAU, r = S * (.8 + .12 * Math.sin(a * 5 + t * .05) + .05 * Math.sin(a * 9)); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + .5, w = Math.sin(t * .05 + i) * S * .1; g.beginPath(); g.moveTo(Math.cos(a) * S * .75, Math.sin(a) * S * .75); g.quadraticCurveTo(Math.cos(a) * S * 1.1 + w, Math.sin(a) * S * 1.1, Math.cos(a + .25) * S * 1.35, Math.sin(a + .25) * S * 1.3 + w); g.stroke(); } glowDot(g, -S * .3, -S * .2, S * .13, c); glowDot(g, S * .12, -S * .3, S * .1, c); glowDot(g, -S * .1, S * .18, S * .12, c); },
  (g, S, c, d, t) => { g.beginPath(); g.arc(0, 0, S * .8, 0, TAU); g.fill(); g.stroke(); for (let i = 0; i < 14; i++) { g.save(); g.rotate(i / 14 * TAU + t * .01); g.fillStyle = c; g.fillRect(S * .66, -S * .05, S * .22, S * .1); g.restore(); } poly(g, [[-S * 1.2, 0], [-S * .75, -S * .26], [-S * .75, S * .26]]); g.fillStyle = d; g.fill(); g.stroke(); glowDot(g, 0, 0, S * .2, c); },
  (g, S, c, d, t) => { g.beginPath(); g.ellipse(0, 0, S, S * .3, 0, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, -S * .12, S * .4, S * .3, 0, Math.PI, TAU); g.fill(); g.stroke(); for (let i = 0; i < 3; i++) { g.save(); g.rotate(t * .01 * (i + 1) + i); g.beginPath(); g.ellipse(0, 0, S * (1.1 + i * .12), S * .5, 0, 0, TAU * .8); g.stroke(); g.restore(); } glowDot(g, 0, -S * .06, S * .14, c); },
  (g, S, c, d, t) => { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { g.strokeStyle = rgba(c, .5 - i * .1); g.lineWidth = 6 - i; g.beginPath(); g.ellipse(0, 0, S * (1 + i * .16), S * (.32 + i * .06), -.2, 0, TAU); g.stroke(); } g.restore(); g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, S * .55, 0, TAU); g.fill(); g.strokeStyle = c; g.lineWidth = 3; g.stroke(); g.beginPath(); g.moveTo(0, -S * .55); g.lineTo(0, -S * 1.3); g.moveTo(0, S * .55); g.lineTo(0, S * 1.3); g.stroke(); },
  (g, S, c, d, t) => { poly(g, [[0, -S], [S * .7, -S * .45], [S * .7, S * .45], [0, S], [-S * .7, S * .45], [-S * .7, -S * .45]]); g.fill(); g.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .5; poly(g, [[Math.cos(a - .14) * S * .78, Math.sin(a - .14) * S * .78], [Math.cos(a) * S * 1.3, Math.sin(a) * S * 1.3], [Math.cos(a + .14) * S * .78, Math.sin(a + .14) * S * .78]]); g.fill(); g.stroke(); } glowDot(g, 0, 0, S * .22, c); },
  (g, S, c, d, t) => { g.fillRect(-S * .6, -S * .5, S * 1.2, S); g.strokeRect(-S * .6, -S * .5, S * 1.2, S); [-1, 1].forEach(s => { g.fillRect(s * S * .62 - S * .12, -S * .3 + Math.sin(t * .05 + s) * S * .08, S * .24, S * .9); g.strokeRect(s * S * .62 - S * .12, -S * .3, S * .24, S * .9); g.fillRect(s * S * .2 - S * .08, -S * .9, S * .16, S * .4); }); g.fillStyle = c; g.fillRect(-S * .4, -S * .08, S * .8, S * .12); glowDot(g, 0, -S * .22, S * .1, c); },
  (g, S, c, d, t) => { g.beginPath(); g.ellipse(0, S * .1, S * .85, S * .55, 0, 0, TAU); g.fill(); g.stroke(); for (let i = -2; i <= 2; i++) { poly(g, [[-S * .82, i * S * .09 + S * .1 - S * .05], [-S * 1.0, i * S * .09 + S * .1], [-S * .82, i * S * .09 + S * .1 + S * .05]]); g.fillStyle = '#e2e8f0'; g.fill(); } g.fillStyle = d; g.beginPath(); g.moveTo(-S * .1, -S * .4); g.quadraticCurveTo(-S * .1, -S * 1.1, -S * .7, -S * 1.0); g.stroke(); glowDot(g, -S * .7, -S * 1.0, S * .12, c); glowDot(g, -S * .45, -S * .05, S * .09, c); },
  (g, S, c, d, t) => { g.fillRect(-S * .6, -S * .6, S * 1.2, S * 1.2); g.strokeRect(-S * .6, -S * .6, S * 1.2, S * 1.2); g.fillStyle = c; g.fillRect(-S * .28, -S * .28, S * .56, S * .56); for (let i = 0; i < 3; i++) { g.save(); g.rotate(t * .012 * (i % 2 ? -1 : 1) + i); g.strokeRect(-S * (.85 + i * .18), -S * (.85 + i * .18), S * (1.7 + i * .36), S * (1.7 + i * .36)); g.restore(); } glowDot(g, -S * .15, -S * .15, S * .07, '#ffffff'); glowDot(g, S * .15, -S * .15, S * .07, '#ffffff'); },
  (g, S, c, d, t) => { g.beginPath(); g.arc(0, 0, S * .9, 0, TAU); g.fill(); g.lineWidth = 6; g.stroke(); g.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * S * .72, Math.sin(a) * S * .72); g.lineTo(Math.cos(a) * S * .84, Math.sin(a) * S * .84); g.stroke(); } g.save(); g.rotate(t * .01); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -S * .5); g.stroke(); g.restore(); g.save(); g.rotate(t * .06); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -S * .7); g.stroke(); g.restore(); glowDot(g, 0, 0, S * .08, c); [[-1.0, .8], [1.05, -.75]].forEach(q => { g.beginPath(); g.arc(q[0] * S, q[1] * S, S * .28, 0, TAU); g.stroke(); }); },
  (g, S, c, d, t) => { g.lineWidth = 7; for (let i = 0; i < 16; i++) { if (i === 3 || i === 4 || i === 10) continue; const a0 = i / 16 * TAU; g.beginPath(); g.arc(0, 0, S, a0, a0 + TAU / 16 - .05); g.stroke(); } g.lineWidth = 3; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + .3; g.beginPath(); g.moveTo(Math.cos(a) * S * .3, Math.sin(a) * S * .3); g.lineTo(Math.cos(a) * S * .95, Math.sin(a) * S * .95); g.stroke(); } g.beginPath(); g.arc(0, 0, S * .3, 0, TAU); g.fill(); g.stroke(); glowDot(g, 0, 0, S * .12, c); },
  (g, S, c, d, t) => { poly(g, [[0, -S * .5], [S * .5, 0], [0, S * .5], [-S * .5, 0]]); g.fill(); g.stroke(); for (let i = 0; i < 5; i++) { const a = -1 + i * .5, w = Math.sin(t * .04 + i) * S * .08; g.beginPath(); g.moveTo(-S * .35, a * S * .15); g.quadraticCurveTo(-S * .8, a * S * .5 + w, -S * 1.1, a * S * .7 + w * 2); g.stroke(); poly(g, [[-S * 1.1, a * S * .7 + w * 2 - S * .1], [-S * 1.3, a * S * .7 + w * 2], [-S * 1.1, a * S * .7 + w * 2 + S * .1], [-S * .98, a * S * .7 + w * 2]]); g.fill(); g.stroke(); } glowDot(g, 0, 0, S * .13, c); },
  (g, S, c, d, t) => { for (let i = 0; i < 7; i++) { const w = S * (1 - i * .12), y = -S * .8 + i * S * .26; g.beginPath(); g.ellipse(Math.sin(t * .03 + i) * S * .05, y, w, w * .16, 0, 0, TAU); g.fill(); g.stroke(); } glowDot(g, -S * .1, -S * .62, S * .12, c); g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(S * .8, -S * .9); g.lineTo(S * .6, -S * .5); g.lineTo(S * .75, -S * .4); g.lineTo(S * .5, S * .1); g.stroke(); g.restore(); },
  (g, S, c, d, t) => { poly(g, [[-S, -S * .05], [-S * .6, -S * .3], [S * .8, -S * .25], [S, 0], [S * .8, S * .25], [-S * .6, S * .3]]); g.fill(); g.stroke(); g.fillStyle = '#d6d3d1'; g.beginPath(); g.ellipse(-S * .75, -S * .02, S * .28, S * .24, 0, 0, TAU); g.fill(); g.stroke(); g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-S * .35 + i * S * .24, 0, S * .22, Math.PI, TAU); g.stroke(); } glowDot(g, -S * .84, -S * .06, S * .06, c); glowDot(g, -S * .66, -S * .06, S * .06, c); g.save(); g.globalAlpha = .25; g.fillStyle = c; poly(g, [[0, -S * .3], [0, -S * 1.0], [S * .45, -S * .3]]); g.fill(); g.restore(); },
  (g, S, c, d, t) => { poly(g, [[0, -S * .75], [S * .65, -S * .38], [S * .65, S * .38], [0, S * .75], [-S * .65, S * .38], [-S * .65, -S * .38]]); g.fill(); g.stroke(); poly(g, [[0, -S * .45], [S * .39, -S * .22], [S * .39, S * .22], [0, S * .45], [-S * .39, S * .22], [-S * .39, -S * .22]]); g.fillStyle = c; g.globalAlpha = .55; g.fill(); g.globalAlpha = 1; for (let i = 0; i < 3; i++) { g.save(); g.rotate(t * .012 * (i + 1) + i); g.beginPath(); g.ellipse(0, 0, S * (1 + i * .13), S * .32, 0, 0, TAU); g.stroke(); g.restore(); } glowDot(g, 0, 0, S * .16, '#ffffff'); },
  (g, S, c, d, t) => { const sl = (t * .07 | 0) % 7; for (let k = 0; k < 3; k++) { g.save(); g.globalCompositeOperation = k ? 'lighter' : 'source-over'; g.translate(k === 1 ? -S * .06 : k === 2 ? S * .06 : 0, 0); g.fillStyle = k === 0 ? '#0b0b12' : k === 1 ? 'rgba(255,43,214,.55)' : 'rgba(34,211,238,.55)'; g.fillRect(-S * .6, -S * .75, S * 1.2, S * 1.5); g.restore(); } g.strokeStyle = c; g.lineWidth = 3; g.strokeRect(-S * .6, -S * .75, S * 1.2, S * 1.5); for (let i = 0; i < 9; i++) { const y = -S * .75 + ((i * 37 + sl * 13) % 150) / 150 * S * 1.5; g.fillStyle = i % 2 ? 'rgba(255,43,214,.8)' : 'rgba(74,222,128,.8)'; g.fillRect(-S * .6 + ((i * 53) % 40) / 40 * S * .3, y, S * (.3 + (i % 3) * .25), S * .05); } glowDot(g, -S * .2, -S * .3, S * .1, c); glowDot(g, S * .2, -S * .3, S * .1, '#22d3ee'); }
];
function drawBossArt(g, bi, cx, cy, S, t, a) {
  const c = BOSSES[bi].c, d = dkc(c, .22), f = BART[bi] || BART[0];
  g.save(); g.translate(cx, cy); g.globalAlpha = a === undefined ? 1 : a; g.fillStyle = d; g.strokeStyle = c; g.lineWidth = Math.max(2, S * .03); g.lineJoin = 'round';
  g.save(); g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, S * 2.1, c, .35); g.restore();
  f(g, S, c, d, t); g.restore();
}
function drawPilotArt(g, cx, cy, S, t, col) {
  g.save(); g.translate(cx, cy);
  const gr = g.createLinearGradient(-S, -S, S, S); gr.addColorStop(0, '#94a3b8'); gr.addColorStop(1, '#1e293b'); g.fillStyle = gr; g.strokeStyle = '#020617'; g.lineWidth = Math.max(3, S * .05);
  g.beginPath(); g.arc(0, 0, S, 0, TAU); g.fill(); g.stroke();
  const vg = g.createLinearGradient(0, -S * .5, 0, S * .5); vg.addColorStop(0, '#0e2a3f'); vg.addColorStop(1, '#020b14'); g.fillStyle = vg; g.beginPath(); g.moveTo(-S * .78, -S * .08); g.quadraticCurveTo(-S * .72, -S * .55, 0, -S * .55); g.quadraticCurveTo(S * .72, -S * .55, S * .78, -S * .08); g.quadraticCurveTo(S * .7, S * .5, 0, S * .52); g.quadraticCurveTo(-S * .7, S * .5, -S * .78, -S * .08); g.fill(); g.stroke();
  g.save(); g.clip(); g.globalAlpha = .55; g.fillStyle = col; g.beginPath(); g.ellipse(S * .5, -S * .1, S * .4, S * .5, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
  g.fillStyle = '#f8fafc'; [-1, 1].forEach(s => { g.beginPath(); g.ellipse(s * S * .32, 0, S * .18, S * .1 * ((t % 220) < 6 ? .15 : 1), 0, 0, TAU); g.fill(); g.fillStyle = '#020617'; g.beginPath(); g.arc(s * S * .32 + S * .06, 0, S * .06, 0, TAU); g.fill(); g.fillStyle = '#f8fafc'; });
  g.strokeStyle = 'rgba(103,232,249,.25)'; g.lineWidth = 1; for (let y = -S * .5; y < S * .5; y += S * .09) { g.beginPath(); g.moveTo(-S, y); g.lineTo(S, y); g.stroke(); } g.restore();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-S * .42, -S * .34, S * .22, S * .06, -.5, 0, TAU); g.fill();
  g.restore();
}
function drawAriaArt(g, cx, cy, S, t) {
  g.save(); g.translate(cx, cy); g.globalCompositeOperation = 'lighter'; drawGlow(g, 0, 0, S * 2.2, '#22d3ee', .5);
  g.strokeStyle = '#67e8f9'; g.lineWidth = Math.max(2, S * .035); for (let i = 0; i < 4; i++) { g.save(); g.rotate(t * .01 * (i % 2 ? -1 : 1) + i); g.beginPath(); g.arc(0, 0, S * (.55 + i * .15), 0, TAU * (.55 + .1 * i)); g.stroke(); g.restore(); }
  g.globalCompositeOperation = 'source-over'; g.fillStyle = '#0b2a3d'; g.beginPath(); g.arc(0, 0, S * .5, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#a5f3fc'; [-1, 1].forEach(s => { g.beginPath(); g.ellipse(s * S * .2, -S * .06, S * .08, S * .12, 0, 0, TAU); g.fill(); });
  g.beginPath(); for (let i = -6; i <= 6; i++) g.lineTo(i * S * .06, S * .22 + Math.sin(t * .2 + i) * S * .04 * (1 - Math.abs(i) / 7)); g.stroke();
  g.restore();
}
function wrapLines(g, text, maxW) { const out = []; let line = ''; text.split(' ').forEach(w => { const tr = line ? line + ' ' + w : w; if (g.measureText(tr).width > maxW && line) { out.push(line); line = w; } else line = tr; }); if (line) out.push(line); return out; }
function speedLines(g, cx, cy, R0, R1, n, col, a, t) { g.save(); g.fillStyle = col; g.globalAlpha = a; for (let i = 0; i < n; i++) { const an = i / n * TAU + Math.sin(i * 12.9) * .05 + t * .0006, w = .018 + (i % 3) * .01; g.beginPath(); g.moveTo(cx + Math.cos(an - w) * R1, cy + Math.sin(an - w) * R1); g.lineTo(cx + Math.cos(an) * R0, cy + Math.sin(an) * R0); g.lineTo(cx + Math.cos(an + w) * R1, cy + Math.sin(an + w) * R1); g.closePath(); g.fill(); } g.restore(); }
function halftone(g, w, h, col, a, step) { g.save(); g.fillStyle = col; g.globalAlpha = a; for (let y = 0, r = 0; y < h; y += step, r++) for (let x = (r % 2) * step / 2; x < w; x += step) { const k = Math.max(0, 1 - x / w) * .9 + .1, rad = step * .42 * k * (.4 + .6 * (y / h)); if (rad > .5) { g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); } } g.restore(); }

// ---------- the engine ----------
const CUT = { on: false, list: [], i: 0, age: 0, done: null, raf: 0, dir: 1, ht: null, htKey: '', own: false, bd: 0 };
function playCut(list, done, opt) {
  if (!list || !list.length) { if (done) done(); return; }
  Object.assign(CUT, { on: true, list, i: 0, age: 0, done, dir: 1, own: false });
  G.cut = CUT; IN.keys = {}; IN.tp = {}; IN.stick.x = IN.stick.y = 0; IN.stick.id = null; IN.tfire = false; IN.ptr.down = false; IN.ab = [0, 0];
  if (opt && opt.music !== undefined) { CUT.own = true; music.force = 1; music.start(opt.music, false); }
  if (opt && opt.world !== undefined) { G.world = opt.world; buildBackdrop(opt.world); }
  $('cut').classList.add('on'); cancelAnimationFrame(CUT.raf); CUT.raf = requestAnimationFrame(cutLoop);
}
function endCut() {
  if (!CUT.on) return; CUT.on = false; cancelAnimationFrame(CUT.raf); $('cut').classList.remove('on'); G.cut = null;
  if (CUT.own) { music.stop(); music.force = -1; CUT.own = false; }
  IN.keys = {}; const d = CUT.done; CUT.done = null; try { if (d) d(); } catch (e) { console.error('cut done', e); }
}
function cutNext() {
  if (!CUT.on) return; const P = CUT.list[CUT.i], full = P.text.length;
  if (CUT.age < full / .9 + 12) { CUT.age = Math.ceil(full / .9) + 10; return; }
  if (CUT.i + 1 >= CUT.list.length) { endCut(); return; }
  CUT.i++; CUT.age = 0; CUT.dir = -CUT.dir; SFX.click();
}
const cutSkip = () => { if (CUT.on) endCut(); };
function cutKey(e) { const c = e.code; if (c === 'Escape' || c === 'Backspace') cutSkip(); else if (c === 'Space' || c === 'Enter' || c === 'KeyZ' || c === 'ArrowRight' || c === 'KeyX') cutNext(); }
function cutLoop() { if (!CUT.on) return; CUT.raf = requestAnimationFrame(cutLoop); CUT.age++; try { cutDraw(); } catch (e) { console.error('cut', e); endCut(); } }
function cutDraw() {
  const cv = $('cutCv'), dpr = Math.min(window.devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); CUT.htKey = ''; }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#04060c'; g.fillRect(0, 0, W, H);
  const P = CUT.list[CUT.i], age = CUT.age, t = G.t + age, m = Math.round(Math.min(W, H) * .045), px = m, py = m, pw = W - 2 * m, ph = H - 2 * m - 18;
  const e = Math.min(1, age / 16), ea = 1 - (1 - e) * (1 - e), sk = Math.min(10, pw * .012);
  const wi = P.bi === undefined ? 14 : P.bi, bc = BOSSES[wi] ? BOSSES[wi].c : '#22d3ee', W0 = WORLDS[wi] || WORLDS[0];
  g.save(); g.translate(px + (1 - ea) * pw * .1 * CUT.dir, py); g.globalAlpha = ea;
  if (P.kind === 'reveal' && age < 14) g.translate((Math.random() - .5) * (14 - age) * .9, (Math.random() - .5) * (14 - age) * .9);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(pw, sk); g.lineTo(pw - sk * .6, ph); g.lineTo(sk * .4, ph - sk); g.closePath(); g.save(); g.clip();
  // ---- art
  if (P.kind === 'title') {
    const gr = g.createLinearGradient(0, 0, 0, ph); gr.addColorStop(0, '#020617'); gr.addColorStop(1, '#0e4a5e'); g.fillStyle = gr; g.fillRect(0, 0, pw, ph);
    g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 70; i++) { const x = (i * 97.3 + t * .25 * (1 + i % 3)) % pw, y = (i * 53.7) % ph; g.fillStyle = 'rgba(165,243,252,' + (.2 + (i % 5) * .12) + ')'; g.fillRect(x, y, 1 + i % 3, 1 + i % 2); } g.globalCompositeOperation = 'source-over';
    const sh = Object.assign({}, SAVE.pl[0].cfg); g.save(); g.translate(pw * .5 + Math.sin(t * .02) * 10, ph * .62); g.scale(ph / 260, ph / 260); drawShip2D(g, { x: 0, y: 0, cfg: sh }, t); g.restore();
  } else {
    g.save(); g.scale(pw / V.W, ph / V.H); if (P.kind !== 'close') drawBackdrop(g, t); g.restore();
    const dim = g.createLinearGradient(0, 0, 0, ph); dim.addColorStop(0, 'rgba(2,6,16,.35)'); dim.addColorStop(1, 'rgba(2,6,16,.78)'); g.fillStyle = dim; g.fillRect(0, 0, pw, ph);
    if (P.kind === 'close') { const rg = g.createRadialGradient(pw * .75, ph * .4, 10, pw * .6, ph * .5, Math.max(pw, ph) * .8); rg.addColorStop(0, rgba(bc, .55)); rg.addColorStop(1, '#030712'); g.fillStyle = rg; g.fillRect(0, 0, pw, ph); }
    halftone(g, pw, ph, rgba(bc, 1), .13, Math.max(10, Math.round(pw / 70)));
  }
  const S0 = Math.min(pw, ph);
  if (P.kind === 'wide') {
    speedLines(g, pw * 1.05, ph * .45, S0 * .25, S0 * 1.6, 26, rgba(bc, 1), .09, t);
    if (!P.ending && !P.nob) drawBossArt(g, wi, pw * .8 + Math.sin(t * .02) * 6, ph * .4, S0 * .3, t, .38);
    g.save(); g.translate(pw * (P.ending ? .45 : .2), ph * .58 + Math.sin(t * .03) * 6); g.scale(S0 / 300, S0 / 300); drawShip2D(g, { x: 0, y: 0, cfg: SAVE.pl[0].cfg }, t); g.restore();
    if (P.ending) { const sg = g.createRadialGradient(pw * .85, ph * .5, 4, pw * .85, ph * .5, S0 * .9); sg.addColorStop(0, 'rgba(253,224,71,.55)'); sg.addColorStop(1, 'rgba(253,224,71,0)'); g.fillStyle = sg; g.fillRect(0, 0, pw, ph); }
  } else if (P.kind === 'close') {
    speedLines(g, pw * .32, ph * .5, S0 * .3, S0 * 1.4, 30, rgba(bc, 1), .08, t);
    if (P.who === 'ARIA') drawAriaArt(g, pw * .3, ph * .5, S0 * .3, t); else drawPilotArt(g, pw * .3, ph * .5, S0 * .32, t, P.col || bc);
  } else if (P.kind === 'reveal') {
    speedLines(g, pw * .5, ph * .45, S0 * .15, S0 * 1.7, 36, rgba(bc, 1), .16, t);
    drawBossArt(g, wi, pw * .5, ph * .4 + Math.sin(t * .03) * 5, S0 * .34 * (1 + Math.max(0, 10 - age) * .04), t, 1);
    if (P.crack) { g.save(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.globalCompositeOperation = 'lighter'; const rs = seeded(7); for (let k = 0; k < 9; k++) { let x = pw * .5, y = ph * .4; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (rs() - .5) * S0 * .25; y += (rs() - .5) * S0 * .25; g.lineTo(x, y); } g.stroke(); } g.globalAlpha = Math.max(0, .9 - age * .03); g.fillStyle = '#fff'; g.fillRect(0, 0, pw, ph); g.restore(); }
    if (age < 5) { g.fillStyle = 'rgba(255,255,255,' + (1 - age / 5) * .85 + ')'; g.fillRect(0, 0, pw, ph); }
    if (P.boss) { const k = 1 + Math.max(0, 12 - age) * .05, fs = Math.round(Math.min(pw / 12, 54) * k); g.save(); g.translate(pw / 2, ph * .1); g.font = '900 ' + fs + 'px "Arial Black", Impact, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = fs * .22; g.strokeStyle = '#000'; const nm = P.who.toUpperCase(); g.strokeText(nm, 0, 0); g.fillStyle = bc; g.fillText(nm, 0, 0); g.restore(); }
  }
  g.restore(); // clip
  // ---- frame
  g.lineJoin = 'miter'; g.strokeStyle = '#020617'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(pw, sk); g.lineTo(pw - sk * .6, ph); g.lineTo(sk * .4, ph - sk); g.closePath(); g.stroke(); g.strokeStyle = '#f8fafc'; g.lineWidth = 4; g.stroke();
  // ---- words
  if (P.kind === 'title') {
    const fs = Math.round(Math.min(pw / 11, 56)); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 ' + fs + 'px "Arial Black", Impact, system-ui, sans-serif'; g.lineJoin = 'round'; g.lineWidth = fs * .2; g.strokeStyle = '#000';
    const l1 = 'AETHERIA', l2 = 'QUANTUM STRIKE'; g.strokeText(l1, pw / 2, ph * .16); g.fillStyle = '#67e8f9'; g.fillText(l1, pw / 2, ph * .16); g.font = '900 ' + Math.round(fs * .62) + 'px "Arial Black", Impact, system-ui, sans-serif'; g.strokeText(l2, pw / 2, ph * .16 + fs * .8); g.fillStyle = '#f8fafc'; g.fillText(l2, pw / 2, ph * .16 + fs * .8);
    const shown = Math.min(P.text.length, Math.max(0, Math.floor(age * .9 - 6))); g.font = '800 ' + Math.round(Math.min(pw / 26, 22)) + 'px ui-monospace, Menlo, Consolas, monospace'; g.fillStyle = '#fde047'; g.fillText(P.text.toUpperCase().slice(0, shown), pw / 2, ph * .86);
    g.fillStyle = '#94a3b8'; g.font = '700 ' + Math.round(Math.min(pw / 36, 14)) + 'px ui-monospace, Menlo, Consolas, monospace'; g.fillText(fmt(SAVE.st.kills) + ' KILLS  -  ' + SAVE.st.bosses + ' BOSSES  -  ' + achCount() + '/' + ACH.length + ' ACHIEVEMENTS', pw / 2, ph * .93);
  } else {
    const fs = Math.round(clamp(pw / 36, 13, 21)), bw = Math.min(pw * .86, 620), full = P.text.toUpperCase(), shown = Math.min(full.length, Math.max(0, Math.floor(age * .9 - 8)));
    g.font = '800 ' + fs + 'px ui-monospace, Menlo, Consolas, monospace'; const lines = wrapLines(g, full, bw - 30), lh = fs * 1.35, bh = lines.length * lh + 26;
    const isB = !!P.boss, bx = P.kind === 'close' ? pw - bw - 14 : (pw - bw) / 2, by = P.kind === 'wide' ? 14 : ph - bh - 16;
    const tag = P.who.toUpperCase(), tagCol = isB ? bc : P.col ? P.col : P.who === 'ARIA' ? '#22d3ee' : P.who === 'PILOT' ? '#fde047' : '#f8fafc';
    g.save(); g.translate(bx, by); g.lineJoin = 'round';
    if (P.kind === 'wide') { g.fillStyle = 'rgba(253,224,71,.96)'; g.fillRect(0, 0, bw, bh); g.strokeStyle = '#000'; g.lineWidth = 4; g.strokeRect(0, 0, bw, bh); g.fillStyle = '#111'; }
    else {
      g.fillStyle = isB ? '#1a0a0a' : '#fff'; g.strokeStyle = isB ? bc : '#000'; g.lineWidth = 4; const r = 14; g.beginPath(); g.moveTo(r, 0); g.lineTo(bw - r, 0); g.quadraticCurveTo(bw, 0, bw, r); g.lineTo(bw, bh - r); g.quadraticCurveTo(bw, bh, bw - r, bh);
      if (P.kind === 'reveal') { g.lineTo(bw * .62, bh); g.lineTo(bw * .5, bh + 16); g.lineTo(bw * .5 - 14, bh); }
      g.lineTo(r, bh); g.quadraticCurveTo(0, bh, 0, bh - r);
      if (P.kind === 'close') { g.lineTo(0, bh * .72); g.lineTo(-28, bh * .8); g.lineTo(0, bh * .46); }
      g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = isB ? '#fecaca' : '#111';
    }
    g.textAlign = 'left'; g.textBaseline = 'top'; g.font = '800 ' + fs + 'px ui-monospace, Menlo, Consolas, monospace'; let left = shown; lines.forEach((ln, i) => { if (left <= 0) return; g.fillText(ln.slice(0, left), 15, 13 + i * lh); left -= ln.length + 1; });
    g.font = '900 ' + Math.round(fs * .62) + 'px ui-monospace, Menlo, Consolas, monospace'; const tw = g.measureText(tag).width + 16; g.fillStyle = tagCol; g.fillRect(10, -Math.round(fs * .55), tw, Math.round(fs * .9)); g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(10, -Math.round(fs * .55), tw, Math.round(fs * .9)); g.fillStyle = '#000'; g.textBaseline = 'middle'; g.fillText(tag, 18, -Math.round(fs * .1));
    g.restore();
    if (shown > 0 && shown < full.length && age % 3 === 0) snd(480 + (shown % 5) * 38, 'square', .02, .02, 0, 'cutb');
  }
  g.restore();
  // ---- progress + hint
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 11px ui-monospace, Menlo, Consolas, monospace';
  for (let i = 0; i < CUT.list.length; i++) { g.fillStyle = i === CUT.i ? '#67e8f9' : 'rgba(148,163,184,.4)'; g.fillRect(W / 2 - CUT.list.length * 9 + i * 18, H - 15, 12, 4); }
  g.fillStyle = 'rgba(148,163,184,.75)'; g.textAlign = 'left'; g.fillText(IS_TOUCH ? 'TAP TO CONTINUE' : 'SPACE / CLICK: NEXT   ESC: SKIP', m, H - 13);
}
(function () { const el = $('cut'); if (!el) return; el.addEventListener('pointerdown', e => { if (e.target && e.target.id === 'cutSkip') return; e.preventDefault(); cutNext(); }); $('cutSkip').addEventListener('click', e => { e.stopPropagation(); cutSkip(); }); })();

// ================= UI: boss gallery, new modes, route icons =================
Object.assign(ICO, { g: ICO.coin, x: ICO.skull });
Object.assign(MODES, {
  gallery: { nm: 'Boss Gallery', ds: 'Rematch any boss you have beaten. Stack modifiers for bigger rewards.', ic: 'skull', cat: 1 },
  hardcore: { nm: 'Hardcore', ds: 'One life. Random sectors from every world you have unlocked. Upgrades carry forward until you fall.', ic: 'bolt', cat: 1 },
  retro: { nm: '1-UP', ds: 'A world from another era. Insert coin.', ic: 'ring', cat: 1, secret: 1, hint: 'Five rifts flicker somewhere in the campaign. Shoot what flickers. Find three.' }
});
const GAL = { w: 0, mods: [] };
Object.assign(SCR, {
  scGallery: () => {
    const hi = SAVE.hi.gal || {}, mult = galleryMult(GAL.mods);
    const cards = BOSSES.map((B, w) => { if (w >= WORLDS.length) return ''; const ok = bossBeaten(w), h = hi[w];
      if (!ok) return '<div class="gcard lk"><b>???</b><span>World ' + (w + 1) + '</span></div>';
      return '<div class="gcard' + (GAL.w === w ? ' sel' : '') + '" data-act="galw:' + w + '"><b style="color:' + WORLDS[w].ac + '">' + B.nm + '</b><span>World ' + (w + 1) + ' - ' + WORLDS[w].nm + '</span>' + (h ? '<em>BEST ' + h.t + 's - ' + (h.m | 0) + ' MODS</em>' : '<em>NOT REMATCHED</em>') + '</div>'; }).join('');
    const mods = Object.keys(GMODS).map(k => { const on = GAL.mods.indexOf(k) >= 0; return '<div class="opt' + (on ? ' sel' : '') + '" data-act="galm:' + k + '"><b>' + GMODS[k].nm + '</b><span>' + GMODS[k].ds + '</span><span class="gold b">+' + Math.round(GMODS[k].m * 100) + '% REWARD' + (on ? ' - ON' : '') + '</span></div>'; }).join('');
    const can = bossBeaten(GAL.w);
    return '<div class="card wide"><div class="row sp wrap"><h2>Boss Gallery</h2><span class="gold b">REWARD x' + mult.toFixed(1) + '</span></div><div class="xs mut" style="margin:4px 0 10px">Pick a boss you have beaten, add modifiers, and fight it again.</div><div class="ggrid">' + cards + '</div><div class="xs mut b" style="letter-spacing:.14em;margin:14px 0 6px">MODIFIERS</div><div class="grid3 gmods">' + mods + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn big' + (can ? '' : ' off') + '" data-act="galgo">FIGHT ' + (can ? BOSSES[GAL.w].nm.toUpperCase() : '') + '</button></div></div>';
  }
});
const _mode = ACT.mode;
Object.assign(ACT, {
  mode(a) {
    const m = a[0];
    if (m === 'gallery') { if (!bossBeaten(GAL.w)) { const f = BOSSES.findIndex((_, w) => w < WORLDS.length && bossBeaten(w)); if (f < 0) { SFX.no(); alertMsg('BEAT A BOSS FIRST'); return; } GAL.w = f; } UI.show('scGallery'); return; }
    if (m === 'hardcore') { const o = { mode: 'endless', var: 'hardcore', w: 0, lv: 0, tier: 1, co: SAVE.players === 2 }; G.last = o; beginRun(o); return; }
    if (m === 'retro') { if (!SAVE.unl.retro) { SFX.no(); alertMsg('LOCKED - FIND THREE RIFTS (' + riftsFound() + '/3)'); return; } const o = { mode: 'expedition', var: 'retro', w: 0, lv: 8, tier: 1, co: SAVE.players === 2 }; G.last = o; beginRun(o); return; }
    return _mode(a);
  },
  galw(a) { const w = +a[0]; if (!bossBeaten(w)) return; GAL.w = w; SFX.click(); UI.refresh(); },
  galm(a) { const k = a[0], i = GAL.mods.indexOf(k); if (i >= 0) GAL.mods.splice(i, 1); else GAL.mods.push(k); SFX.click(); UI.refresh(); },
  galgo() { if (!bossBeaten(GAL.w)) { SFX.no(); return; } startGallery(GAL.w, GAL.mods); }
});

// ================= UI: missions, cosmetics shop, data logs, mastery, ranks =================
const rankChip = () => { const X = PS().xp; return '<span class="rchip r' + rankIdx(X.lv) + '">LV ' + X.lv + ' ' + rankName(X.lv).toUpperCase() + '</span>'; };
const xpBar = () => { const X = PS().xp, f = X.xp / xpNeed(X.lv); return '<div class="xpbar"><i style="width:' + Math.round(f * 100) + '%"></i></div><div class="xs mut" style="margin-top:3px">' + fmt(X.xp) + ' / ' + fmt(xpNeed(X.lv)) + ' XP to level ' + (X.lv + 1) + '</div>'; };
function masteryHtml(pl, id) {
  const m = mastery(id), sk = (pl.wsk && pl.wsk[id]) | 0;
  const opts = [0, 1, 2, 3, 4].map(t => { const ok = t === 0 || m.t >= t, on = sk === t; return '<i class="msk' + (on ? ' on' : '') + (ok ? '' : ' lk') + '" data-act="wskin:' + id + ':' + t + '" title="' + (t ? MTIER[t][1] + ' SKIN' : 'DEFAULT') + '" style="background:' + (t === 4 ? 'conic-gradient(' + RAINBOW.join(',') + ')' : t ? MTIER[t][2] : WPN[id].c) + '"></i>'; }).join('');
  return '<div class="row sp wrap" style="margin-top:6px"><span class="xs b" style="color:' + m.c + '">MASTERY: ' + m.nm + ' - ' + fmt(m.n) + (m.next ? ' / ' + fmt(m.next) + ' kills' : ' kills (MAX)') + '</span><span class="row" style="gap:5px">' + opts + '</span></div>';
}
const COSTAB = { skin: 'SHIP SKINS', trail: 'ENGINE TRAILS', bullet: 'BULLET COLOURS', kfx: 'KILL EFFECTS' };
Object.assign(SCR, {
  scMissions: () => {
    const M = missions(), row = (m, i, wk) => { const D = msnDef(m.id), f = Math.min(1, m.c / m.n); return '<div class="item msn' + (m.got ? ' got' : '') + '"><div class="fl"><div class="b sm">' + (wk ? '<span class="gold">WEEKLY - </span>' : '') + D.nm(m.n).toUpperCase() + '</div><div class="xpbar" style="margin-top:6px"><i style="width:' + Math.round(f * 100) + '%;background:' + (m.done ? '#4ade80' : '#38bdf8') + '"></i></div><div class="xs mut" style="margin-top:3px">' + fmt(m.c) + ' / ' + fmt(m.n) + ' - REWARD ' + fmt(m.rew) + ' CORES + ' + m.xp + ' XP</div></div>' + (m.got ? '<span class="good b xs">CLAIMED</span>' : '<button class="btn sm gold' + (m.done ? '' : ' off') + '" data-act="claim:' + i + '">CLAIM</button>') + '</div>'; };
    return '<div class="card mid"><div class="row sp wrap"><h2>Missions</h2>' + rankChip() + '</div><div class="xs mut" style="margin:4px 0 10px">Three new daily missions every day, and a big weekly one. Progress counts from every mode.</div><div class="stack" style="gap:8px">' + M.d.map((m, i) => row(m, i)).join('') + row(M.w, 'w', 1) + '</div><div style="margin-top:12px">' + xpBar() + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm" data-act="cos">COSMETICS</button></div></div>';
  },
  scCos: () => {
    const tab = UI.cost || 'skin', C = COS[tab], X = PS().xp, cur = tab === 'skin' ? null : PS().cos[tab];
    const items = Object.keys(C).map(id => { const c = C[id], own = cosOwn(tab, id), lock = c.rank && rankIdx(X.lv) < c.rank, on = cur === id;
      const sw = tab === 'skin' ? '<span class="cosw" style="background:linear-gradient(135deg,' + c.cfg.paint + ' 55%,' + c.cfg.accent + ' 55%)"></span>' : c.c ? '<span class="cosw" style="background:' + (c.c === 'rb' ? 'conic-gradient(' + RAINBOW.join(',') + ')' : c.c) + '"></span>' : '<span class="cosw" style="background:#334155"></span>';
      const st = lock ? '<span class="lock">REACH ' + RANKS[c.rank].toUpperCase() + ' RANK</span>' : on ? '<span class="good b">EQUIPPED</span>' : own ? '<span class="acc">' + (tab === 'skin' ? 'OWNED - tap to apply' : 'OWNED - tap to equip') + '</span>' : '<span class="gold b">' + fmt(c.p) + ' CORES</span>';
      return '<div class="opt cos' + (on ? ' sel' : '') + (lock ? ' lkd' : '') + '" data-act="cosbuy:' + tab + ':' + id + '"><div class="row" style="gap:8px">' + sw + '<b>' + c.nm + '</b></div>' + st + '</div>'; }).join('');
    return '<div class="card wide"><div class="row sp wrap"><h2>Cosmetics</h2><span>' + rankChip() + ' <span class="gold b">' + fmt(SAVE.cores) + ' <span class="mut xs">CORES</span></span></span></div><div class="tabs wrap" style="margin:10px 0">' + Object.keys(COSTAB).map(k => '<div class="tab' + (tab === k ? ' on' : '') + '" data-act="costab:' + k + '">' + COSTAB[k] + '</div>').join('') + '</div><div class="grid3 cosg">' + items + '</div><div class="xs mut" style="margin-top:10px">' + (tab === 'skin' ? 'Skins repaint your ship for Pilot ' + (pi() + 1) + '. You can still fine-tune colours in the Hangar.' : tab === 'bullet' ? 'Bullet colours apply to your main gun. Mastery skins (Hangar > Guns) are used when this is set to Weapon Default.' : tab === 'kfx' ? 'Plays every time you destroy an enemy.' : 'Colour of the trail behind your engines.') + ' Higher ranks unlock more items.</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm" data-act="missions">MISSIONS</button></div></div>';
  },
  scLogs: () => {
    const L = PS().logs, n = Object.keys(L).length;
    return '<div class="card mid"><div class="row sp"><h2>Data Logs</h2><span class="acc b">' + n + '/' + LOGS.length + '</span></div><div class="xs mut" style="margin:4px 0 10px">One log is hidden in every world. Look for the glowing DATA LOG pickup - it drifts past once, in one sector per world.</div><div class="stack" style="gap:8px;max-height:min(58vh,520px);overflow-y:auto">' + LOGS.map((g, w) => L[w] ? '<div class="item" style="align-items:flex-start"><div class="fl"><div class="b sm acc">' + (w + 1) + '. ' + g[0].toUpperCase() + '</div><div class="sm" style="margin-top:4px;line-height:1.6">' + g[1] + '</div></div></div>' : '<div class="item" style="opacity:.5"><div class="fl"><div class="b sm">' + (w + 1) + '. ???</div><div class="xs mut">' + (w < SAVE.wu ? 'Hidden in ' + WORLDS[w].nm + ', sector ' + (LOG_LV(w) + 1) : 'World ' + (w + 1) + ' is still locked') + '</div></div></div>').join('') + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button></div></div>';
  }
});
Object.assign(ACT, {
  missions() { UI.show('scMissions'); },
  claim(a) { claimMission(a[0]); UI.refresh(); },
  cos() { UI.show('scCos'); },
  costab(a) { UI.cost = a[0]; SFX.click(); UI.refresh(); },
  cosbuy(a) {
    const cat = a[0], id = a[1], c = COS[cat][id], P = PS().cos; if (!c) return;
    if (c.rank && rankIdx(P && SAVE.xp.lv) < c.rank) { SFX.no(); alertMsg('REACH ' + RANKS[c.rank].toUpperCase() + ' RANK FIRST'); return; }
    if (!cosOwn(cat, id)) { if (SAVE.cores < c.p) { SFX.no(); alertMsg('NOT ENOUGH CORES'); return; } SAVE.cores -= c.p; P.own[cat].push(id); SFX.buy(); }
    else SFX.click();
    if (cat === 'skin') { Object.assign(SAVE.pl[pi()].cfg, c.cfg); const own = SAVE.pl[pi()].own; own.finish = own.finish || []; if (own.finish.indexOf(c.cfg.finish) < 0) own.finish.push(c.cfg.finish); alertMsg(c.nm.toUpperCase() + ' APPLIED'); }
    else P[cat] = id;
    saveGame(); UI.refresh();
  },
  wskin(a) { const id = a[0], t = +a[1], pl = SAVE.pl[pi()]; if (t && mastery(id).t < t) { SFX.no(); alertMsg('REACH ' + MTIER[t][1] + ' MASTERY FIRST (' + MTIER[t][0] + ' KILLS)'); return; } pl.wsk = pl.wsk || {}; pl.wsk[id] = t; SFX.click(); saveGame(); UI.refresh(); },
  logs() { UI.show('scLogs'); }
});

// ================= STORY 2: dialogue choices, the rival pilot Vex, World 17 and the true ending, codex =================
const ST = () => { const S = SAVE.story || (SAVE.story = { res: 0, riv: 0, vex: {}, ch: {} }); S.vex = S.vex || {}; S.ch = S.ch || {}; return S; };
const VEXC = '#f43f5e';
// World 17 boss art (cutscenes) + story
BART.push((g, S, c, d, t) => {
  g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TAU / 12 + Math.sin(t * .03 + i) * .06; g.save(); g.rotate(a); g.fillStyle = rgba(c, .5); poly(g, [[-S * .08, -S * .35], [S * .08, -S * .35], [S * .03, -S * 1.25], [-S * .03, -S * 1.25]]); g.fill(); g.restore(); } g.restore();
  for (let i = 0; i < 2; i++) { g.save(); g.rotate(t * .01 * (i ? -1 : 1)); g.lineWidth = 4 - i; g.beginPath(); g.ellipse(0, 0, S * (.62 + i * .14), S * (.62 + i * .14) * (i ? .45 : 1), 0, 0, TAU); g.stroke(); g.restore(); }
  g.beginPath(); g.arc(0, 0, S * .42, 0, TAU); g.fill(); g.stroke(); glowDot(g, 0, 0, S * .24, c);
});
STORY.push([['wide', 'ARIA', 'Coordinates locked. Pilot... this is where the signal was always pointing. The first world.'], ['close', 'PILOT', 'It is beautiful. Why does it feel like it is waiting for me?'], ['reveal', 'BOSS', 'Every pilot before you turned back here. Show me you are the one who does not.']]);
const TRUE_FINAL = stay => [{ kind: 'wide', who: 'NARRATOR', text: stay ? 'And so the pilot stayed. Every lost ship that ever followed the signal found its way home, guided by one small light.' : 'And so the pilot flew home. Behind them, seventeen worlds lit up one by one, like a road someone could follow.', ending: 1, bi: 16 }, { kind: 'title', who: '', text: 'The true ending - thank you for flying' }];
const TRUE_END = ally => [
  { kind: 'reveal', who: 'NARRATOR', text: 'The First Signal dims. Not destroyed. Quiet, at last.', bi: 16, crack: 1, notitle: 1 },
  { kind: 'close', who: 'ARIA', text: 'Pilot, I can read it now. It was never a weapon. It was a beacon, calling for someone strong enough to answer it and kind enough to stop.', bi: 16 },
  ally ? { kind: 'close', who: 'VEX', col: VEXC, text: 'Not bad, rookie. Not bad at all. Next time you fly somewhere impossible, call me first.', bi: 16 } : { kind: 'close', who: 'PILOT', text: 'Vex never came. Somewhere out there, still chasing the signal. Maybe one day.', bi: 16 },
  { kind: 'close', who: 'ARIA', bi: 16, text: 'The beacon is offering us a choice. We can stay and keep the light burning, or take it home with us.', choices: [{ t: 'We stay. Someone has to keep the light on.', k: 'stay' }, { t: 'We go home. And we bring the light with us.', k: 'home' }], after: k => TRUE_FINAL(k === 'stay') }
];
// ---------- dialogue choices inside cutscenes ----------
CUT.sel = 0;
function cutChoices(P) {
  let box = document.getElementById('cutCh'); const want = P && P.choices && !P.picked && CUT.age >= Math.ceil(P.text.length / .9) + 10;
  if (!want) { if (box) box.remove(); return false; }
  if (!box || box._p !== P) { if (box) box.remove(); box = document.createElement('div'); box.id = 'cutCh'; box._p = P; box.innerHTML = P.choices.map((c, i) => '<button data-i="' + i + '">' + (i + 1) + '. ' + c.t + '</button>').join(''); box.addEventListener('pointerdown', e => { e.stopPropagation(); }); box.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { e.stopPropagation(); cutPick(+b.dataset.i); } }); $('cut').appendChild(box); CUT.sel = 0; }
  box.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === CUT.sel));
  return true;
}
function cutPick(i) {
  const P = CUT.list[CUT.i]; if (!P || !P.choices || P.picked) return; const c = P.choices[i]; if (!c) return; P.picked = 1; SFX.click();
  const S = ST(); if (c.k === 'res') S.res++; else if (c.k === 'riv') S.riv++; if (P.cid) S.ch[P.cid] = c.k; if (c.k === 'stay' || c.k === 'home') S.end = c.k;
  const box = document.getElementById('cutCh'); if (box) box.remove();
  const rep = c.reply ? [{ kind: 'close', who: c.reply[0], col: c.reply[0] === 'VEX' ? VEXC : undefined, text: c.reply[1], bi: P.bi }] : [];
  if (P.after) rep.push.apply(rep, P.after(c.k)); saveGame();
  CUT.list.splice.apply(CUT.list, [CUT.i + 1, 0].concat(rep)); CUT.i++; CUT.age = 0; CUT.dir = -CUT.dir;
  if (CUT.i >= CUT.list.length) endCut();
}
const _cutNext = cutNext;
cutNext = function () { const P = CUT.list[CUT.i]; if (P && P.choices && !P.picked) { const full = P.text.length; if (CUT.age < full / .9 + 12) { CUT.age = Math.ceil(full / .9) + 10; return; } cutPick(CUT.sel); return; } _cutNext(); };
const _cutKey = cutKey;
cutKey = function (e) { const P = CUT.list[CUT.i], c = e.code; if (P && P.choices && !P.picked && document.getElementById('cutCh')) { if (c === 'ArrowUp' || c === 'KeyW') { CUT.sel = Math.max(0, CUT.sel - 1); return; } if (c === 'ArrowDown' || c === 'KeyS') { CUT.sel = Math.min(P.choices.length - 1, CUT.sel + 1); return; } const n = '123'.indexOf(e.key); if (n >= 0 && n < P.choices.length) { cutPick(n); return; } if (c === 'Escape') { cutPick(0); return; } } _cutKey(e); };
const _cutDraw = cutDraw;
cutDraw = function () { _cutDraw(); cutChoices(CUT.list[CUT.i]); };
const _endCut = endCut;
endCut = function () { const b = document.getElementById('cutCh'); if (b) b.remove(); _endCut(); };
function cutPadSel(dy) { const P = CUT.list[CUT.i]; if (P && P.choices && !P.picked) CUT.sel = clamp(CUT.sel + dy, 0, P.choices.length - 1); }

// ---------- the rival: Vex ----------
const RIVAL = [
  { w: 3, lv: 6, hp: 1, talk: [['wide', 'ARIA', 'Unknown fighter on an intercept course. Crimson paint. It is broadcasting on our channel.'], ['close', 'VEX', 'So you heard the signal too. Name is Vex. The signal is mine, rookie - turn around.']],
    ch: [{ t: 'We can follow it together.', k: 'res', reply: ['VEX', 'Together? Cute. Try to keep up first.'] }, { t: 'Then come and take it.', k: 'riv', reply: ['VEX', 'Gladly.'] }], lose: 'Not bad. Next time I will not go easy.' },
  { w: 7, lv: 6, hp: 1.5, talk: [['wide', 'ARIA', 'Crimson fighter again. She followed us all the way to the trench.'], ['close', 'VEX', 'Every world I reach, you are already there. Who ARE you?']],
    ch: [{ t: 'Just a pilot. Same as you.', k: 'res', reply: ['VEX', 'Nobody is the same as me. ...But fine. Prove it.'] }, { t: 'Your problem.', k: 'riv', reply: ['VEX', 'Then I will solve it.'] }], lose: 'Ugh. Lucky shot. I am still getting there first.' },
  { w: 11, lv: 6, hp: 2.1, talk: [['wide', 'ARIA', 'Vex is here. Her ship is damaged... she is still coming at us.'], ['close', 'VEX', 'The crystals told me something. Only one of us gets to reach the first world.']],
    ch: [{ t: 'Then we reach it together and break the rule.', k: 'res', reply: ['VEX', '...You really mean that. Weird. Fight me anyway.'] }, { t: 'Then it will be me.', k: 'riv', reply: ['VEX', 'We will see.'] }], lose: 'Go on, then. Show me what is at the end of all this.' },
  { w: 14, lv: 10, hp: 2.8, talk: [['wide', 'ARIA', 'The Heart of Aetheria. And Vex, blocking the way. One last time.'], ['close', 'VEX', 'This is it, rookie. Whoever wins this goes to the core. No more games.']],
    ch: [{ t: 'Fly with me instead.', k: 'res', reply: ['VEX', 'You keep saying that.'] }, { t: 'No more games.', k: 'riv', reply: ['VEX', 'Finally.'] }], lose: null }
];
Object.assign(EN, { rival: { nm: 'Vex, Rival Ace', m: ['dart', { c: 0x1f1d2b, e: 0xf43f5e }], w: 118, hp: 520, sp: 2.2, ai: 'hover', f: { k: 'aim', r: 38, s: 6.2, n: 2 }, sc: 3000, cr: 60, cost: 0, elite: 1, rival: 1 } });
const rivalIdx = R => R && R.mode === 'expedition' && !R.var && R.tier === 1 ? RIVAL.findIndex(r => r.w === R.w && r.lv === R.lv) : -1;
function rivalTick(R) {
  const i = rivalIdx(R); if (i < 0) return; const V0 = RIVAL[i], S = ST();
  if (S.vex[i] === undefined && !R.rivalOn && R.stage === 'wave' && R.wave >= 1 && R.st > 60) {
    R.rivalOn = 1; const panels = V0.talk.map(p => ({ kind: p[0], who: p[1], col: p[1] === 'VEX' ? VEXC : undefined, text: p[2], bi: R.w, nob: 1 }));
    panels[panels.length - 1].choices = V0.ch; panels[panels.length - 1].cid = 'vex' + i;
    const go = () => { const e = mkEnemy('rival', V.W + 80, V.H / 2, { hpm: V0.hp }); e.rv = i; e.hx = V.W * .78; banner('RIVAL: VEX', 'BEAT HER', true); };
    if (SET.story !== 'off' && !G.net) playCut(panels, go); else go();
  }
  for (const e of G.ent.en) { if (e.id !== 'rival' || e.dead) continue; // pilot-like movement: pick a lane, strafe, dash, fire fans
    e.rT = (e.rT | 0) + 1; if (e.rT % 80 === 1) e.ty = clamp((nearP(e.x, e.y) || { y: V.H / 2 }).y + rnd(-140, 140), 70, V.H - 70);
    e.y += ((e.ty || e.y) - e.y) * .06; e.x += (e.hx - e.x) * .04 + Math.sin(e.rT * .05) * 1.2;
    if (e.rT % 150 === 0) { e.hx = V.W * rnd(.55, .85); spark(e.x, e.y, 8, VEXC, 4, 14, 2); }
    if (e.rT % 110 === 55) { const P = nearP(e.x, e.y); if (P) { const a = Math.atan2(P.y - e.y, P.x - e.x); for (let k = -3; k <= 3; k++) ebullet(e.x - 20, e.y, Math.cos(a + k * .12) * 5, Math.sin(a + k * .12) * 5, 'shard'); } }
  }
}
function rivalDown(e) {
  if (e.rv === undefined) return; const i = e.rv, V0 = RIVAL[i], S = ST(); S.vex[i] = 1; const R = G.run;
  SAVE.cores += 500 + i * 400; if (R) R.cores += 500 + i * 400; banner('VEX RETREATS', '+' + (500 + i * 400) + ' CORES', false); SFX.clear();
  if (i === RIVAL.length - 1) { S.ally = S.res >= 3 ? 1 : 0; }
  saveGame();
  const line = i === RIVAL.length - 1 ? (S.ally ? 'You fly like someone worth following. When you go to the first world... I will be on your wing.' : 'Fine. You win. Go to the first world alone, rookie.') : V0.lose;
  if (line && SET.story !== 'off' && !G.net) setTimeout(() => { if (G.run && !G.run.over) playCut([{ kind: 'close', who: 'VEX', col: VEXC, text: line, bi: G.run.w, nob: 1 }], () => { }); }, 500);
}
// ally Vex in the World 17 boss fight: a crimson wingman that strafes the boss
function vexAllyTick(R) {
  if (R.w !== 16 || R.var || R.mode !== 'expedition' || !ST().ally || R.stage !== 'boss' || !R.boss) { R.vexA = null; return; }
  const A = R.vexA || (R.vexA = { x: -60, y: V.H * .3, t: 0 }), P = alive()[0] || { x: 150, y: V.H / 2 }; A.t++;
  if (A.t === 30) { alertMsg('VEX: "I TOLD YOU I WOULD BE ON YOUR WING."'); }
  const tx = P.x + 40, ty = clamp(P.y + (P.y > V.H / 2 ? -110 : 110), 60, V.H - 60); A.x += (tx - A.x) * .05; A.y += (ty - A.y) * .05;
  if (A.t % 9 === 0) { const b = R.boss, a = Math.atan2(b.y - A.y, b.x - A.x); G.ent.pb.push({ x: A.x + 14, y: A.y, vx: Math.cos(a) * 13, vy: Math.sin(a) * 13, r: 4, d: 9 * (G.pdm || 1), k: 'twin', c: VEXC, pierce: 0, hs: [], own: 0, l: 100, home: 0, hm2: 0, blast: 0, chain: 0, crush: 0 }); }
  if (!SET.reduce && A.t % 3 === 0) pcl({ x: A.x - 18, y: A.y + rnd(-2, 2), vx: -3, vy: 0, l: 14, l0: 14, c: VEXC, r: 3, k: 0, fr: .9 });
}
function drawVexAlly(g, t) {
  const R = G.run, A = R && R.vexA; if (!A) return;
  g.save(); g.globalCompositeOperation = 'lighter'; drawGlow(g, A.x, A.y, 34, VEXC, .5); g.restore();
  drawShip2D(g, { x: A.x, y: A.y, cfg: { hull: 'phantom', paint: '#1f1d2b', accent: VEXC, wings: 'delta', engine: 'twin', canopy: 'razor', finish: 'carbon', stripe: true } }, t);
}

// ---------- codex ----------
const CODEX_W = [
  'The old capital, still guarded by an air-defense grid that never got the order to stand down.', 'A ravine swallowed by a living hive. The spores carry the signal from plant to plant.', 'Red dunes and endless mining rigs, still digging for a company that died centuries ago.', 'A nebula so thick that sensors go blind. Things live inside it that have never seen a ship.', 'A black hole that bends light, time and bullets. The signal is loudest at the edge.', 'An armada frozen mid-flight, crews asleep, guns still warm.', 'A moon hollowed out and turned into a single forge for a single weapon.', 'The deepest trench of an ocean world, lit only by things that want you closer.', 'A planet-sized computer that learned to fly by watching pilots like you.', 'A world where every clock was stopped except one, and that one counts down.', 'A ring station drifting far past the old worlds. Its commander never left.', 'Floating islands of crystal that sing the signal back in a thousand notes.', 'A storm the size of a world, and the eye at its centre is alive.', 'Where fleets that answered the signal long ago came to rest. They still transmit.', 'The place every signal seemed to begin. It was not the beginning.', 'A world made of copies: suburbs, schools and theme parks that were never out here. Something is getting reality wrong.', 'The first world. Golden, quiet, waiting. Every signal was trying to lead someone here.'
];
const CHARS = [
  { nm: 'The Pilot', col: '#fde047', un: () => true, tx: 'You. Answered a signal nobody else could decode, in a ship you built yourself in a hangar that smells like coolant.' },
  { nm: 'ARIA', col: '#22d3ee', un: () => true, tx: 'Your ship\'s AI. Calm, curious, and a little too honest. She decodes the signal one world at a time.' },
  { nm: 'Vex', col: VEXC, un: () => Object.keys(ST().vex).length > 0, tx: () => 'A rival ace in a crimson fighter who heard the same signal. ' + (ST().ally ? 'After everything, she flies on your wing.' : ST().vex[3] ? 'She lost the last duel. Where she went after is anyone\'s guess.' : 'She is always one world ahead - or one behind.') },
  { nm: 'The Signal', col: '#67e8f9', un: () => !!SAVE.flags.ending, tx: 'A message stretched across seventeen worlds. Not a weapon. A beacon, looking for someone strong enough to answer it and kind enough to stop.' },
  { nm: 'Aetheria Prime', col: '#fbbf24', un: () => !!SAVE.flags.trueEnd, tx: () => 'The first world, and the source of everything. ' + (ST().end === 'stay' ? 'Its light is kept burning by one pilot who chose to stay.' : ST().end === 'home' ? 'Its light now shines all the way home.' : '') }
];
Object.assign(SCR, {
  scCodex: () => {
    const tab = UI.cxt || 'worlds'; let body = '';
    if (tab === 'worlds') body = WORLDS.map((W, w) => w < SAVE.wu ? '<div class="item" style="align-items:flex-start"><div class="fl"><div class="b sm" style="color:' + W.ac + '">' + (w + 1) + '. ' + W.nm.toUpperCase() + '</div><div class="xs mut">' + W.sub + '</div><div class="sm" style="margin-top:5px;line-height:1.6">' + (CODEX_W[w] || '') + '</div></div></div>' : '<div class="item" style="opacity:.45"><div class="fl"><div class="b sm">' + (w + 1) + '. ???</div><div class="xs mut">Reach this world to unlock its page</div></div></div>').join('');
    else if (tab === 'bosses') body = BOSSES.map((B, w) => w < WORLDS.length && bossBeaten(w) ? '<div class="item" style="align-items:flex-start"><div class="fl"><div class="b sm" style="color:' + B.c + '">' + B.nm.toUpperCase() + '</div><div class="sm" style="margin-top:4px;line-height:1.6">' + (BOSS_INTEL[w] || '') + '</div>' + (STORY[w] ? '<div class="xs mut" style="margin-top:4px">"' + STORY[w][STORY[w].length - 1][2] + '"</div>' : '') + '</div></div>' : '<div class="item" style="opacity:.45"><div class="fl"><div class="b sm">???</div><div class="xs mut">Defeat the World ' + (w + 1) + ' boss</div></div></div>').join('');
    else body = CHARS.map(c => c.un() ? '<div class="item" style="align-items:flex-start"><div class="fl"><div class="b sm" style="color:' + c.col + '">' + c.nm.toUpperCase() + '</div><div class="sm" style="margin-top:4px;line-height:1.6">' + (typeof c.tx === 'function' ? c.tx() : c.tx) + '</div></div></div>' : '<div class="item" style="opacity:.45"><div class="fl"><div class="b sm">???</div><div class="xs mut">Keep flying</div></div></div>').join('') + '<div class="xs mut" style="margin-top:8px">Your choices so far: ' + ST().res + ' kind, ' + ST().riv + ' fierce.</div>';
    return '<div class="card mid"><div class="row sp"><h2>Codex</h2><button class="btn sm" data-act="logs">DATA LOGS</button></div><div class="tabs" style="margin:10px 0">' + [['worlds', 'WORLDS'], ['bosses', 'BOSSES'], ['chars', 'CHARACTERS']].map(t => '<div class="tab' + (tab === t[0] ? ' on' : '') + '" data-act="cxt:' + t[0] + '">' + t[1] + '</div>').join('') + '</div><div class="stack" style="gap:8px;max-height:min(58vh,520px);overflow-y:auto">' + body + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button>' + (SAVE.flags.trueEnd ? '<button class="btn sm gold" data-act="trueend">WATCH TRUE ENDING</button>' : '') + '</div></div>';
  }
});
Object.assign(ACT, {
  codex() { UI.show('scCodex'); },
  cxt(a) { UI.cxt = a[0]; SFX.click(); UI.refresh(); },
  trueend() { UI.hideAll(); const S = ST(); playCut(TRUE_END(!!S.ally), () => UI.show('scCodex'), { music: 16, world: 16 }); }
});

// ================= UI: jukebox =================
Object.assign(SCR, {
  scJuke: () => {
    const T = jbTracks(), cur = T.find(x => x.i === music.jbx);
    return '<div class="card mid"><div class="row sp"><h2>Jukebox</h2><span class="xs mut">' + T.filter(x => x.ok).length + '/' + T.length + ' TRACKS</span></div>' +
      '<div class="item" style="margin:10px 0;flex-direction:column;align-items:stretch"><div class="row sp"><div><div class="xs mut b" style="letter-spacing:.14em">NOW PLAYING</div><div class="b" style="color:' + (cur ? cur.c : 'var(--mut)') + '">' + (cur ? cur.nm.toUpperCase() : '- NOTHING -') + '</div></div><button class="btn sm' + (cur ? ' warn' : ' off') + '" data-act="jbstop">STOP</button></div><canvas id="jbViz" style="position:static;display:block;width:100%;height:56px;margin-top:8px;inset:auto;z-index:auto;pointer-events:none"></canvas>' +
      '<div class="seg" style="margin-top:8px">' + JBL.map(l => '<button data-act="jblv:' + l[1] + '" class="' + ((music.jbl < 0 ? 2 : music.jbl) === l[1] ? 'on' : '') + '">' + l[0] + '</button>').join('') + '</div><div class="xs mut" style="margin-top:6px">Every track has five layers. Pick how intense you want it - in battle the game does this for you.</div></div>' +
      '<div class="grid2 jbg">' + T.map(x => x.ok ? '<div class="opt' + (music.jbx === x.i ? ' sel' : '') + '" data-act="jbplay:' + x.i + '"><b style="color:' + x.c + '">' + (music.jbx === x.i ? '▶ ' : '') + x.nm + '</b><span>' + x.sub + '</span></div>' : '<div class="opt" style="opacity:.4;cursor:default"><b>???</b><span>' + x.sub + ' - locked</span></div>').join('') + '</div>' +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="jbback">BACK</button><span class="xs mut">Music volume: Settings > Audio</span></div></div>';
  }
});
Object.assign(ACT, {
  juke() { UI.show('scJuke'); setTimeout(jbViz, 60); },
  jbplay(a) { jbPlay(+a[0]); UI.refresh(); setTimeout(jbViz, 60); },
  jblv(a) { music.jbl = +a[0]; STEMS.lv = -1; SFX.click(); UI.refresh(); setTimeout(jbViz, 60); },
  jbstop() { jbStop(); UI.refresh(); setTimeout(jbViz, 60); },
  jbback() { jbStop(); cancelAnimationFrame(jbRaf); UI.back(); }
});

// ================= UI: versus, challenge codes, stats graphs, backups, controller remap, accessibility settings =================
Object.assign(MODES, {
  versus: { nm: 'Versus', ds: 'Two players, two minutes. Most points wins. Getting hit or shot down costs you.', ic: 'target', cat: 1 },
  chal: { nm: 'Challenge Codes', ds: 'Play a code from a friend - same waves, same twist - and try to beat their score.', ic: 'map', cat: 1 }
});
SETS.ACCESS = SETS.ACCESS.concat([['cbp', 'sel', 'Colour-blind palette', 'Recolours enemy fire', [['off', 'Off'], ['dt', 'Red-green safe'], ['tr', 'Blue-yellow safe']]], ['bigb', 'tog', 'Bigger enemy bullets', 'Easier to see (hitboxes stay the same)'], ['hitbox', 'tog', 'Show your hitbox', 'A dot marks the exact spot that can be hit'], ['speed', 'sel', 'Game speed', 'Slow the action down', [[1, '100%'], [.85, '85%'], [.7, '70%']]]]);
SETS.GRAPHICS.push(['autoperf', 'tog', 'Auto performance mode', 'Lowers graphics if the game starts to lag']);
SETS.GAMEPLAY.push(['ghost', 'tog', 'Ghost replays', 'Race your best run of each sector']);
const _mode2 = ACT.mode;
ACT.mode = a => {
  if (a[0] === 'versus') { if (SAVE.players !== 2) { SAVE.players = 2; saveGame(); alertMsg('VERSUS NEEDS 2 PLAYERS - 2P TURNED ON'); } const o = { mode: 'endless', var: 'versus', w: Math.floor(Math.random() * Math.max(1, Math.min(SAVE.wu, 15))), lv: 0, tier: 1, co: true }; G.last = o; beginRun(o); return; }
  if (a[0] === 'chal') { UI.chMsg = ''; UI.show('scChal'); return; }
  return _mode2(a);
};
function svgBars(rows, opt) { // rows: [label, value, colour]
  const W = 520, bh = 18, gap = 6, mx = Math.max(1, ...rows.map(r => r[1])), lw = opt && opt.lw || 110, H = rows.length * (bh + gap);
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block">' + rows.map((r, i) => { const y = i * (bh + gap), w = Math.max(2, (W - lw - 60) * r[1] / mx); return '<text x="' + (lw - 8) + '" y="' + (y + 13) + '" text-anchor="end" fill="#94a3b8" font-size="11" font-family="ui-monospace,monospace">' + escH(String(r[0]).slice(0, 16)) + '</text><rect x="' + lw + '" y="' + y + '" width="' + w + '" height="' + bh + '" rx="4" fill="' + (r[2] || '#38bdf8') + '"/><text x="' + (lw + w + 6) + '" y="' + (y + 13) + '" fill="#e2e8f0" font-size="11" font-family="ui-monospace,monospace">' + fmt(Math.round(r[1])) + '</text>'; }).join('') + '</svg>';
}
function svgRuns(H0) {
  const W = 520, Hh = 120, n = H0.length; if (!n) return '<div class="xs mut">Play a few runs to see your history here.</div>';
  const mx = Math.max(1, ...H0.map(r => r.s)), bw = W / Math.max(n, 10);
  return '<svg viewBox="0 0 ' + W + ' ' + (Hh + 16) + '" style="width:100%;height:auto;display:block"><line x1="0" y1="' + Hh + '" x2="' + W + '" y2="' + Hh + '" stroke="#334155"/>' + H0.map((r, i) => { const h = Math.max(2, (Hh - 6) * r.s / mx); return '<rect x="' + (i * bw + 2) + '" y="' + (Hh - h) + '" width="' + (bw - 4) + '" height="' + h + '" rx="3" fill="' + (r.win ? '#4ade80' : '#fb7185') + '"><title>' + escH(r.m + ' - ' + fmt(r.s)) + '</title></rect>'; }).join('') + '<text x="0" y="' + (Hh + 13) + '" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">OLDER</text><text x="' + W + '" y="' + (Hh + 13) + '" text-anchor="end" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">LATEST - GREEN WIN, RED LOSS</text></svg>';
}
Object.assign(SCR, {
  scChal: () => {
    const c = UI.chPrev; return '<div class="card mid"><h2>Challenge Codes</h2><p class="xs mut" style="margin:6px 0 10px;line-height:1.6">A code locks in a world, a sector, a twist and a random seed, so you and a friend get exactly the same waves. Finish a challenge and you get a new code with your score as the target. Send it back!</p>' +
      '<div class="row" style="gap:8px"><input id="chIn" class="code" style="flex:1;font-size:16px;letter-spacing:.12em;text-transform:uppercase" placeholder="e.g. 3A1-0K9F-5Z7" value="' + escH(UI.chTxt || '') + '"><button class="btn" data-act="chgo">PLAY</button></div><div class="xs ' + ((UI.chMsg || '')[0] === '!' ? 'bad' : 'good') + '" style="margin-top:6px">' + escH((UI.chMsg || '').replace(/^!/, '')) + '</div>' +
      (c ? '<div class="item" style="margin-top:10px;flex-direction:column;align-items:stretch"><div class="b acc">' + c.code + '</div><div class="xs mut" style="margin-top:4px">World ' + (c.w + 1) + ' ' + WORLDS[c.w].nm + ' - sector ' + (c.lv + 1) + ' - ' + (c.mod >= 0 ? DMODS[c.mod].nm : 'no twist') + (c.target ? ' - score to beat ' + fmt(c.target) : '') + '</div>' + (netOn() ? '<button class="btn sm gold" style="margin-top:8px;align-self:flex-start" data-act="chsendto:' + c.code + ':' + (c.target | 0) + '">SEND TO A FRIEND</button>' : '') + '</div>' : '') +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm gold" data-act="chrand">MAKE A RANDOM CHALLENGE</button></div></div>';
  },
  scStats: () => {
    const S = SAVE.st, H0 = (SAVE.hist || []).slice(-24), wins = (SAVE.hist || []).filter(r => r.win).length, tot = (SAVE.hist || []).length;
    const wpn = WORDER.map(k => [WPN[k].nm, (SAVE.wm || {})[k] | 0, WPN[k].c]).filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]);
    const hulls = Object.keys(S.hull || {}).map(k => [PARTS.hull[k] ? PARTS.hull[k].nm : k, S.hull[k], '#a78bfa']).sort((a, b) => b[1] - a[1]);
    const stars = WORLDS.map((W, w) => { const d = (prog(w).done[0] || []); return [(w + 1) + '. ' + W.nm, d.reduce((a, x) => a + (x | 0), 0), W.ac]; }).filter((r, w) => w < SAVE.wu);
    const tile = (k, v) => '<div class="st2"><b>' + v + '</b><span>' + k + '</span></div>';
    return '<div class="card wide"><div class="row sp"><h2>Stats</h2>' + rankChip() + '</div><div class="statg2">' + tile('RUNS', fmt(S.runs)) + tile('WIN RATE', tot ? Math.round(wins / tot * 100) + '%' : '-') + tile('KILLS', fmt(S.kills)) + tile('BOSSES', fmt(S.bosses)) + tile('PARRIES', fmt(S.parry | 0)) + tile('SUPERS', fmt(S.supers | 0)) + tile('GOLDEN ELITES', fmt(S.gold | 0)) + tile('PLAY TIME', fmtT(S.time)) + '</div>' +
      '<div class="xs mut b" style="letter-spacing:.14em;margin:14px 0 6px">LAST ' + H0.length + ' RUNS - SCORE</div>' + svgRuns(H0) +
      '<div class="grid2" style="margin-top:12px;align-items:start"><div><div class="xs mut b" style="letter-spacing:.14em;margin-bottom:6px">KILLS BY GUN</div>' + (wpn.length ? svgBars(wpn) : '<div class="xs mut">-</div>') + '</div><div><div class="xs mut b" style="letter-spacing:.14em;margin-bottom:6px">RUNS BY SHIP</div>' + (hulls.length ? svgBars(hulls) : '<div class="xs mut">-</div>') + '</div></div>' +
      '<div class="xs mut b" style="letter-spacing:.14em;margin:12px 0 6px">STARS PER WORLD (MAX 39)</div>' + svgBars(stars, { lw: 150 }) +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button></div></div>';
  }
});
Object.assign(ACT, {
  chgo() { const v = inVal('chIn') || ''; UI.chTxt = v; const c = chParse(v); if (!c) { UI.chMsg = '!That code does not look right. Check it and try again.'; SFX.no(); UI.refresh(); return; } if (c.w >= SAVE.wu) { UI.chMsg = '!You need to unlock World ' + (c.w + 1) + ' first.'; SFX.no(); UI.refresh(); return; } startChallenge(c); },
  chrand() { const c = randChal(); UI.chPrev = c; UI.chTxt = c.code; UI.chMsg = 'New challenge ready - press PLAY, or copy the code for a friend.'; SFX.click(); UI.refresh(); },
  copycode(a) { const c = a[0]; try { navigator.clipboard.writeText(c).then(() => alertMsg('CODE COPIED'), () => alertMsg('CODE: ' + c)); } catch (e) { alertMsg('CODE: ' + c); } },
  stats() { UI.show('scStats'); },
  bkdl() { const code = exportCode(SLOT), name = 'aetheria-backup-' + dayKey() + '.txt'; if (DLNS) DLNS.save({ filename: name, data: code }).then(() => { UI.slotMsg = 'Backup saved.'; UI.refresh(); }).catch(e => { if (!e || e.code !== 'declined') { UI.slotMsg = '!Could not save a file here - use EXPORT and copy the code instead.'; UI.refresh(); } }); else { try { const a = document.createElement('a'); a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(code); a.download = name; document.body.appendChild(a); a.click(); a.remove(); UI.slotMsg = 'Backup saved.'; } catch (e) { UI.slotMsg = '!Could not save a file - use EXPORT instead.'; } UI.refresh(); } },
  bkload() { const i = document.createElement('input'); i.type = 'file'; i.accept = '.txt,text/plain'; i.onchange = () => { const f = i.files && i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { UI.slotCode = String(r.result || '').trim(); UI.slotMsg = 'Backup loaded into the box - press IMPORT HERE on a slot.'; UI.refresh(); }; r.readAsText(f); }; i.click(); },
  padbind(a) { G.padBind = a[0]; SFX.click(); UI.refresh(); },
  padreset() { SET.padMap = null; saveSet(); SFX.click(); UI.refresh(); }
});
const padSection = () => '<div class="xs mut b" style="letter-spacing:.14em;margin:14px 0 6px">GAMEPAD - tap an action, then press a button on your controller</div><div class="keycols"><div class="kcol">' + PADA.map(r => '<div class="setrow"><span>' + r[1] + '</span><button class="kbtn' + (G.padBind === r[0] ? ' wait' : '') + '" data-act="padbind:' + r[0] + '">' + (G.padBind === r[0] ? 'PRESS A BUTTON...' : padLabel(r[0])) + '</button></div>').join('') + '</div><div class="kcol xs mut" style="line-height:1.7">Stick / D-pad: move. START: pause. In menus: D-pad moves, A selects, B goes back.<br>' + ((IN.pads && IN.pads.length) || (G._padPrev && G._padPrev.length) ? '<b class="good">Controller connected.</b>' : 'No controller detected yet - press any button on it.') + '<br><button class="btn sm" data-act="padreset" style="margin-top:8px">RESET CONTROLLER</button></div></div>';

// ================= UI: Creator (level editor + boss builder), AetherOS mode, corrupted map nodes =================
Object.assign(MODES, {
  create: { nm: 'Creator', ds: 'Build your own levels and bosses, test them, and swap share codes with friends.', ic: 'map', cat: 1 },
  crash: { nm: 'AetherOS', ds: 'The game crashed. Something is still running inside it.', ic: 'bolt', cat: 1, secret: 1, hint: 'Defeat The Null Process and see what happens to the game itself.' }
});
const CR = { tab: 'level', lv: null, cb: null, msg: '', code: '' };
const crLv = () => CR.lv || (CR.lv = newLevel());
const crCb = () => CR.cb || (CR.cb = newCBoss());
const edEnemies = () => { const set = new Set(); for (let w = 0; w < Math.min(SAVE.wu, WORLDS.length); w++) worldEnemies(w).forEach(id => set.add(id)); Object.keys(SAVE.kd || {}).forEach(id => { if (EN[id] && id !== 'rival' && id !== 'dummy') set.add(id); }); set.delete('rock'); return Array.from(set); };
const opt = (v, l, sel) => '<option value="' + escH(v) + '"' + (String(sel) === String(v) ? ' selected' : '') + '>' + escH(l) + '</option>';
function crLevelHtml() {
  const L = crLv(), ens = edEnemies(), cbs = SAVE.cbs || [];
  const waves = L.waves.map((W, i) => '<div class="edw"><div class="row sp"><b class="acc xs" style="letter-spacing:.14em">WAVE ' + (i + 1) + '</b><button class="btn sm warn" data-act="edwx:' + i + '">REMOVE WAVE</button></div>' + W.map((g, j) => '<div class="edg"><select data-chg="edg:' + i + ':' + j + ':id">' + ens.map(id => opt(id, EN[id].nm, g.id)).join('') + '</select><span class="row" style="gap:4px"><button class="btn sm" data-act="edn:' + i + ':' + j + ':-1">-</button><b style="min-width:22px;text-align:center">' + g.n + '</b><button class="btn sm" data-act="edn:' + i + ':' + j + ':1">+</button></span><select data-chg="edg:' + i + ':' + j + ':f">' + Object.keys(FORMS).map(f => opt(f, FORMS[f], g.f)).join('') + '</select><button class="btn sm" data-act="edgx:' + i + ':' + j + '">X</button></div>').join('') + (W.length < 6 ? '<button class="btn sm" data-act="edga:' + i + '" style="margin-top:6px">+ ADD GROUP</button>' : '') + '</div>').join('');
  const bossSel = '<select data-chg="ed:boss">' + opt('', 'No boss', L.cb ? 'c' : L.boss === null ? '' : L.boss) + BOSSES.slice(0, BASE_BOSSES).map((B, w) => bossBeaten(w) ? opt(w, B.nm, L.cb ? '' : L.boss) : '').join('') + cbs.map((c, k) => opt('c' + k, 'Custom: ' + c.nm, L.cb && L.cbk === k ? 'c' + k : '')).join('') + '</select>';
  return '<div class="edrow"><label>NAME</label><input data-chg="ed:nm" maxlength="28" value="' + escH(L.nm) + '"></div><div class="edrow"><label>WORLD</label><select data-chg="ed:w">' + WORLDS.map((W, w) => w < SAVE.wu ? opt(w, (w + 1) + '. ' + W.nm, L.w) : '').join('') + '</select></div><div class="edrow"><label>END BOSS</label>' + bossSel + '</div>' +
    '<div class="edws">' + waves + '</div>' + (L.waves.length < 8 ? '<button class="btn sm" data-act="edwa" style="margin-top:8px">+ ADD WAVE</button>' : '') +
    '<div class="row sp wrap" style="margin-top:12px;gap:6px"><button class="btn gold" data-act="edplay">TEST PLAY</button><button class="btn" data-act="edsave">SAVE</button><button class="btn" data-act="edshare">SHARE CODE</button><button class="btn" data-act="edload">LOAD CODE</button><button class="btn sm warn" data-act="ednew">NEW</button></div>' +
    ((SAVE.lvls || []).length ? '<div class="xs mut b" style="letter-spacing:.14em;margin:12px 0 6px">SAVED LEVELS</div><div class="row wrap" style="gap:6px">' + SAVE.lvls.map((l, k) => '<button class="btn sm" data-act="edopen:' + k + '">' + escH(l.nm) + '</button>').join('') + '</div>' : '');
}
function crBossHtml() {
  const C = crCb(), mods = BOSSES.slice(0, BASE_BOSSES).map((B, w) => bossBeaten(w) ? opt(w, B.nm, C.m) : '').join('') || opt(0, BOSSES[0].nm, 0);
  const ens = edEnemies().filter(id => !EN[id].elite);
  const ph = C.ph.map((p, i) => '<div class="edw"><div class="row sp"><b class="acc xs" style="letter-spacing:.14em">PHASE ' + (i + 1) + (i ? ' - BELOW ' + Math.round((1 - i / C.ph.length) * 100) + '% HP' : '') + '</b><span class="row" style="gap:6px"><select data-chg="cbm:' + i + '">' + Object.keys(BMOVES).map(m => opt(m, BMOVES[m], p.mv)).join('') + '</select>' + (C.ph.length > 1 ? '<button class="btn sm warn" data-act="cbpx:' + i + '">X</button>' : '') + '</span></div>' +
    p.atk.map((a, j) => '<div class="edg"><select data-chg="cba:' + i + ':' + j + ':k">' + Object.keys(ATKP).map(k => opt(k, ATKP[k].nm, a[0])).join('') + '</select><select data-chg="cba:' + i + ':' + j + ':l">' + [[0, 'Light'], [1, 'Medium'], [2, 'Heavy']].map(l => opt(l[0], l[1], a[1])).join('') + '</select><button class="btn sm" data-act="cbax:' + i + ':' + j + '">X</button></div>').join('') + (p.atk.length < 4 ? '<button class="btn sm" data-act="cbaa:' + i + '" style="margin-top:6px">+ ADD ATTACK</button>' : '') + '</div>').join('');
  return '<div class="edrow"><label>NAME</label><input data-chg="cb:nm" maxlength="28" value="' + escH(C.nm) + '"></div><div class="edrow"><label>BODY</label><select data-chg="cb:m">' + mods + '</select></div><div class="edrow"><label>COLOUR</label><span class="row wrap" style="gap:6px">' + BCOLS.map(c => '<i class="sw' + (C.c === c ? ' sel' : '') + '" data-act="cbc:' + c.slice(1) + '" style="background:' + c + ';width:26px;height:26px"></i>').join('') + '</span></div>' +
    '<div class="edrow"><label>HEALTH ' + fmt(C.hp) + '</label><input type="range" min="1000" max="14000" step="250" value="' + C.hp + '" data-chg="cb:hp" style="flex:1"></div><div class="edrow"><label>MINIONS</label><select data-chg="cb:minion">' + ens.map(id => opt(id, EN[id].nm, C.minion)).join('') + '</select></div>' +
    '<div class="edws">' + ph + '</div>' + (C.ph.length < 5 ? '<button class="btn sm" data-act="cbpa" style="margin-top:8px">+ ADD PHASE</button>' : '') +
    '<div class="row sp wrap" style="margin-top:12px;gap:6px"><button class="btn gold" data-act="cbplay">TEST FIGHT</button><button class="btn" data-act="cbsave">SAVE</button><button class="btn" data-act="cbshare">SHARE CODE</button><button class="btn" data-act="cbload">LOAD CODE</button><button class="btn sm warn" data-act="cbnew">NEW</button></div>' +
    ((SAVE.cbs || []).length ? '<div class="xs mut b" style="letter-spacing:.14em;margin:12px 0 6px">SAVED BOSSES</div><div class="row wrap" style="gap:6px">' + SAVE.cbs.map((c, k) => '<button class="btn sm" data-act="cbopen:' + k + '">' + escH(c.nm) + '</button>').join('') + '</div>' : '');
}
Object.assign(SCR, {
  scCreate: () => '<div class="card wide"><div class="row sp wrap"><h2>Creator</h2><div class="seg" style="width:300px"><button data-act="crtab:level" class="' + (CR.tab === 'level' ? 'on' : '') + '">LEVEL EDITOR</button><button data-act="crtab:boss" class="' + (CR.tab === 'boss' ? 'on' : '') + '">BOSS BUILDER</button></div></div><div class="crb">' + (CR.tab === 'level' ? crLevelHtml() : crBossHtml()) + '</div>' +
    '<div class="xs mut b" style="letter-spacing:.14em;margin:12px 0 6px">SHARE CODE</div><textarea id="crCode" class="code" rows="2" placeholder="SHARE CODE puts a code here. Paste a friend\'s code here, then press LOAD CODE.">' + escH(CR.code) + '</textarea><div class="row sp" style="margin-top:6px"><button class="btn sm" data-act="crcopy">COPY</button><span class="xs ' + (CR.msg[0] === '!' ? 'bad' : 'good') + '">' + escH(CR.msg.replace(/^!/, '')) + '</span></div><div class="row sp" style="margin-top:12px"><button class="btn sm" data-act="back">BACK</button></div></div>'
});
const crSaveList = (key, item, max) => { const A = SAVE[key] || (SAVE[key] = []); const i = A.findIndex(x => x.nm === item.nm); if (i >= 0) A[i] = JSON.parse(JSON.stringify(item)); else { A.push(JSON.parse(JSON.stringify(item))); if (A.length > max) A.shift(); } saveGame(); };
const crMsg = m => { CR.msg = m; UI.refresh(); };
const _mode3 = ACT.mode;
ACT.mode = a => { if (a[0] === 'create') { CR.msg = ''; UI.show('scCreate'); return; } if (a[0] === 'crash') { if (!SAVE.unl.crash) { SFX.no(); alertMsg('LOCKED - DEFEAT THE NULL PROCESS'); return; } startCrash(); return; } return _mode3(a); };
Object.assign(ACT, {
  crtab(a) { CR.tab = a[0]; CR.msg = ''; SFX.click(); UI.refresh(); },
  edwa() { crLv().waves.push([{ id: edEnemies()[0] || 'jet', n: 4, f: 'line' }]); UI.refresh(); },
  edwx(a) { crLv().waves.splice(+a[0], 1); UI.refresh(); },
  edga(a) { crLv().waves[+a[0]].push({ id: edEnemies()[0] || 'jet', n: 3, f: 'line' }); UI.refresh(); },
  edgx(a) { crLv().waves[+a[0]].splice(+a[1], 1); UI.refresh(); },
  edn(a) { const g = crLv().waves[+a[0]][+a[1]]; g.n = clamp(g.n + (+a[2]), 1, 12); UI.refresh(); },
  edplay() { const L = crLv(); if (!L.waves.length && !L.cb && (L.boss === null || L.boss === undefined)) { crMsg('!Add a wave or a boss first.'); return; } const o = { mode: 'expedition', var: 'custom', w: L.w | 0, lv: 6, tier: 1, co: SAVE.players === 2, cust: JSON.parse(JSON.stringify(L)) }; G.last = o; beginRun(o); },
  edsave() { crSaveList('lvls', crLv(), 10); crMsg('Level saved.'); },
  edshare() { const L = crLv(); CR.code = packCode('AQL1:', { v: 1, nm: L.nm, w: L.w, waves: L.waves, boss: L.boss, cb: L.cb }); crMsg('Code ready - copy it and send it to a friend.'); },
  edload() { const v = inVal('crCode') || ''; const L = unpackCode('AQL1:', v); if (!L || !Array.isArray(L.waves)) { crMsg('!That is not a level code (level codes start with AQL1:).'); return; } L.w = clamp(L.w | 0, 0, WORLDS.length - 1); if (L.w >= SAVE.wu) L.w = 0; L.waves = L.waves.slice(0, 8).map(W => (W || []).slice(0, 6).map(g => ({ id: EN[g.id] ? g.id : 'jet', n: clamp(g.n | 0, 1, 12), f: FORMS[g.f] ? g.f : 'line' }))); CR.lv = L; CR.tab = 'level'; crMsg('Level loaded: ' + L.nm); },
  ednew() { CR.lv = newLevel(); crMsg('New level.'); },
  edopen(a) { CR.lv = JSON.parse(JSON.stringify(SAVE.lvls[+a[0]])); crMsg('Opened ' + CR.lv.nm); },
  cbpa() { crCb().ph.push({ mv: 'orbit', atk: [['ring', 1]] }); UI.refresh(); },
  cbpx(a) { crCb().ph.splice(+a[0], 1); UI.refresh(); },
  cbaa(a) { crCb().ph[+a[0]].atk.push(['aim', 1]); UI.refresh(); },
  cbax(a) { const p = crCb().ph[+a[0]]; if (p.atk.length > 1) p.atk.splice(+a[1], 1); UI.refresh(); },
  cbc(a) { crCb().c = '#' + a[0]; UI.refresh(); },
  cbplay() { startCBoss(crCb(), Math.min(crCb().m | 0, SAVE.wu - 1)); },
  cbsave() { crSaveList('cbs', crCb(), 8); crMsg('Boss saved - pick it as an END BOSS in the level editor.'); },
  cbshare() { CR.code = packCode('AQB1:', crCb()); crMsg('Code ready - copy it and send it to a friend.'); },
  cbload() { const v = inVal('crCode') || ''; const C = unpackCode('AQB1:', v); if (!C || !Array.isArray(C.ph) || !C.ph.length) { crMsg('!That is not a boss code (boss codes start with AQB1:).'); return; } C.ph = C.ph.slice(0, 5).map(p => ({ mv: BMOVES[p.mv] ? p.mv : 'hover', atk: (p.atk || []).slice(0, 4).filter(x => ATKP[x[0]]).map(x => [x[0], clamp(x[1] | 0, 0, 2)]) })); C.hp = clamp(+C.hp || 4000, 1000, 14000); C.m = clamp(C.m | 0, 0, BASE_BOSSES - 1); CR.cb = C; CR.tab = 'boss'; crMsg('Boss loaded: ' + C.nm); },
  cbnew() { CR.cb = newCBoss(); crMsg('New boss.'); },
  cbopen(a) { CR.cb = JSON.parse(JSON.stringify(SAVE.cbs[+a[0]])); crMsg('Opened ' + CR.cb.nm); },
  crcopy() { const v = inVal('crCode') || ''; if (!v) return; try { navigator.clipboard.writeText(v).then(() => alertMsg('CODE COPIED')); } catch (e) { } }
});
function crChange(k, v) {
  const p = k.split(':'), L = crLv(), C = crCb();
  if (p[0] === 'ed') { if (p[1] === 'nm') L.nm = v.slice(0, 28) || 'My Level'; else if (p[1] === 'w') L.w = +v; else if (p[1] === 'boss') { if (v === '') { L.boss = null; L.cb = null; } else if (v[0] === 'c') { const k2 = +v.slice(1); L.cb = JSON.parse(JSON.stringify(SAVE.cbs[k2])); L.cbk = k2; L.boss = null; } else { L.boss = +v; L.cb = null; } } }
  else if (p[0] === 'edg') { const g = L.waves[+p[1]][+p[2]]; g[p[3]] = v; }
  else if (p[0] === 'cb') { if (p[1] === 'nm') C.nm = v.slice(0, 28) || 'My Boss'; else if (p[1] === 'hp') C.hp = +v; else if (p[1] === 'm') C.m = +v; else if (p[1] === 'minion') C.minion = v; }
  else if (p[0] === 'cbm') C.ph[+p[1]].mv = v;
  else if (p[0] === 'cba') { const a = C.ph[+p[1]].atk[+p[2]]; if (p[3] === 'k') a[0] = v; else a[1] = +v; }
  UI.refresh();
}
document.addEventListener('change', e => { const el = e.target && e.target.closest && e.target.closest('[data-chg]'); if (el && UI.top === 'scCreate') crChange(el.dataset.chg, el.value); });

// ================= ONLINE: Firebase sign-in, profiles, friends, presence, invites, rooms, and online co-op / versus =================
// Online only runs on the web version (GitHub Pages). The claude.ai version points players to the website instead.
const FB_CFG = { apiKey: 'AIzaSyD8pdSPg6W36pGWlkk0sUUl9qkyubaO4oo', authDomain: 'aetheria-qs.firebaseapp.com', projectId: 'aetheria-qs', storageBucket: 'aetheria-qs.firebasestorage.app', messagingSenderId: '359429804121', appId: '1:359429804121:web:01a46890a270cef9cda148', databaseURL: 'https://aetheria-qs-default-rtdb.firebaseio.com' };
const WEB_URL = 'https://lukenwiser.github.io/Aetheria/';
const FB_VER = '10.12.2';
const NET = { ok: /(^|\.)github\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) || !!window.__netTest, ready: false, loading: null, user: null, me: null, db: null, friends: {}, fdata: {}, pres: {}, reqs: {}, invites: {}, room: null, code: null, role: null, conn: null, msg: '', subs: [], blocked: {} };
const NETG = { wsel: 0 };
// ---------- loading the Firebase SDK (only when someone opens the Online screen) ----------
function netScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); }); }
function netInit() {
  if (!NET.ok) return Promise.reject(new Error('offline build'));
  if (NET.loading) return NET.loading;
  NET.loading = (async () => {
    if (!window.firebase) { const b = 'https://cdn.jsdelivr.net/npm/firebase@' + FB_VER + '/'; await netScript(b + 'firebase-app-compat.js'); await Promise.all([netScript(b + 'firebase-auth-compat.js'), netScript(b + 'firebase-database-compat.js')]); }
    if (!firebase.apps.length) firebase.initializeApp(FB_CFG);
    NET.db = firebase.database(); NET.ready = true;
    firebase.auth().onAuthStateChanged(u => { NET.user = u; if (u) netSignedIn(u); else netSignedOut(); if (UI.top === 'scOnline' || UI.top === 'scName') UI.refresh(); });
  })();
  return NET.loading;
}
const R_ = p => NET.db.ref(p);
const TS = () => firebase.database.ServerValue.TIMESTAMP;
function netSub(ref, ev, fn) { ref.on(ev, fn); NET.subs.push(() => ref.off(ev, fn)); }
async function netSignIn() {
  try { await netInit(); const pr = new firebase.auth.GoogleAuthProvider(); try { await firebase.auth().signInWithPopup(pr); } catch (e) { if (e && /popup/.test(e.code || '')) await firebase.auth().signInWithRedirect(pr); else throw e; } }
  catch (e) { NET.msg = '!Sign-in failed: ' + ((e && (e.code || e.message)) || 'unknown error'); UI.refresh(); }
}
function netSignOut() { netLeaveRoom(); NET.subs.forEach(f => f()); NET.subs = []; try { firebase.auth().signOut(); } catch (e) { } }
function netSignedOut() { NET.me = null; NET.friends = {}; NET.reqs = {}; NET.invites = {}; }
async function netSignedIn(u) {
  let snap; try { snap = await R_('users/' + u.uid).once('value'); } catch (e) { NET.msg = '!Database error: ' + (e.code || e.message) + ' - check the security rules in Firebase.'; UI.refresh(); return; } NET.me = snap.val();
  if (!NET.me || !NET.me.name) { if (UI.top !== 'scName') UI.show('scName'); return; }
  netStartLive();
}
// ---------- pilot names + friend codes ----------
const BADW = ['fuck', 'shit', 'bitch', 'cunt', 'nigg', 'whore', 'slut', 'porn', 'penis', 'vagina', 'retard', 'hitler', 'nazi', 'pussy', 'faggot'], BADX = ['cum', 'sex', 'anal', 'rape', 'cock', 'dick', 'fag', 'kys', 'ass', 'tits', 'boob'];
const nameKey = n => n.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
function nameOk(n) {
  if (n.length < 3 || n.length > 16) return 'Names need 3 to 16 characters (you have ' + n.length + ').';
  const bad = n.replace(/[A-Za-z0-9 _-]/g, ''); if (bad) return 'These characters are not allowed: ' + Array.from(new Set(bad)).join(' ') + ' - use letters, numbers, spaces, - or _';
  if (!/[A-Za-z0-9]/.test(n)) return 'Use at least one letter or number.';
  const l = n.toLowerCase().replace(/[0-9]/g, m => ({ '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' })[m] || m), flat = l.replace(/[^a-z]/g, ''), words = l.split(/[^a-z]+/);
  if (BADW.some(w => flat.indexOf(w) >= 0) || BADX.some(w => words.indexOf(w) >= 0)) return 'Pick a friendlier name.'; return '';
}
async function netSetName(n) {
  const u = NET.user; n = String(n || '').trim(); const bad = nameOk(n); if (bad) return bad;
  n = n.replace(/\s+/g, ' '); const lk = nameKey(n); const taken = await R_('names/' + lk).once('value'); if (taken.exists() && taken.val() !== u.uid) return 'That name is taken';
  try { await R_('names/' + lk).set(u.uid); } catch (e) { return 'That name is taken'; }
  let code = NET.me && NET.me.code;
  for (let i = 0; !code && i < 8; i++) { const c = 'ACE-' + String(1000 + Math.floor(Math.random() * 9000)); try { const ex = await R_('codes/' + c).once('value'); if (ex.exists()) continue; await R_('codes/' + c).set(u.uid); code = c; } catch (e) { } }
  if (NET.me && NET.me.name && nameKey(NET.me.name) !== lk) { try { await R_('names/' + nameKey(NET.me.name)).remove(); } catch (e) { } }
  NET.me = Object.assign(NET.me || {}, { name: n, code }); await netPushProfile(); netStartLive(); return '';
}
function netProfile() { const X = PS().xp; return { name: NET.me.name, code: NET.me.code, lv: X.lv, rk: rankName(X.lv), hull: SAVE.pl[0].cfg.hull, paint: SAVE.pl[0].cfg.paint, acc: SAVE.pl[0].cfg.accent, wu: SAVE.wu, hi: Math.round(SAVE.hi.endless.score || 0), hc: (SAVE.hi.hc || {}).wave | 0, at: TS() }; }
function netPushProfile() { if (!NET.user || !NET.me) return Promise.resolve(); return R_('users/' + NET.user.uid).set(netProfile()).catch(() => { }); }
// ---------- live data: presence, friends, requests, invites ----------
function netStartLive() {
  if (NET.live) return; NET.live = 1; const me = NET.user.uid;
  netSub(R_('.info/connected'), 'value', s => { if (s.val() !== true) return; const pr = R_('presence/' + me); pr.onDisconnect().remove(); pr.set({ on: true, at: TS(), room: NET.code || null }); });
  netSub(R_('friends/' + me), 'value', s => { NET.friends = s.val() || {}; Object.keys(NET.friends).forEach(netWatchFriend); netRefresh(); });
  netSub(R_('requests/' + me), 'value', s => { NET.reqs = s.val() || {}; netRefresh(); });
  netSub(R_('blocks/' + me), 'value', s => { NET.blocked = s.val() || {}; });
  netSub(R_('invites/' + me), 'value', s => { const v = s.val() || {}, old = NET.invites; NET.invites = v; Object.keys(v).forEach(k => { if (!old[k] && !NET.blocked[k] && Date.now() - (v[k].at || 0) < 120000) toast('GAME INVITE', v[k].name + ' wants to play ' + (v[k].mode === 'vs' ? 'Versus' : 'Co-op') + ' - open Online to join', '#22d3ee'); }); netRefresh(); });
  netPushProfile();
}
const watched = {};
function netWatchFriend(uid) { if (watched[uid]) return; watched[uid] = 1; netSub(R_('users/' + uid), 'value', s => { NET.fdata[uid] = s.val(); netRefresh(); }); netSub(R_('presence/' + uid), 'value', s => { NET.pres[uid] = s.val(); netRefresh(); }); }
let netRT = 0; function netRefresh() { clearTimeout(netRT); netRT = setTimeout(() => { if (UI.top === 'scOnline' || UI.top === 'scRoom') UI.refresh(); }, 60); }
async function netAddFriend(code) {
  code = String(code || '').toUpperCase().replace(/\s+/g, ''); if (/^\d{4}$/.test(code)) code = 'ACE-' + code;
  const s = await R_('codes/' + code).once('value'); const uid = s.val(); if (!uid) return '!No pilot has that friend code.'; if (uid === NET.user.uid) return '!That is your own code.'; if (NET.friends[uid]) return '!You are already friends.';
  await R_('requests/' + uid + '/' + NET.user.uid).set({ name: NET.me.name, at: TS() }); return 'Friend request sent.';
}
async function netAccept(uid) { const me = NET.user.uid; await R_('friends/' + me + '/' + uid).set(true); await R_('friends/' + uid + '/' + me).set(true); await R_('requests/' + me + '/' + uid).remove(); }
function netDecline(uid) { return R_('requests/' + NET.user.uid + '/' + uid).remove(); }
async function netUnfriend(uid) { const me = NET.user.uid; await R_('friends/' + me + '/' + uid).remove(); await R_('friends/' + uid + '/' + me).remove().catch(() => { }); delete NET.fdata[uid]; }
async function netBlock(uid) { await R_('blocks/' + NET.user.uid + '/' + uid).set(true); await netUnfriend(uid).catch(() => { }); await netDecline(uid).catch(() => { }); }
function netReport(uid, why) { return R_('reports').push({ from: NET.user.uid, who: uid, why: why || 'name', at: TS() }); }

// ---------- rooms (up to 4 pilots: the host plus 3 guests) ----------
const RC = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const mkCode = () => Array.from({ length: 4 }, () => RC[Math.floor(Math.random() * RC.length)]).join('');
function netPlData() { const p = JSON.parse(JSON.stringify(SAVE.pl[0])); return p; }
const roomMax = r => r && r.mode === 'rk' ? 2 : 4;
const isVs = m => m === 'vs' || m === 'rk';
const roomGuests = r => Object.keys((r && r.pl) || {}).filter(u => r.pl[u] && u !== r.host).sort((a, z) => (r.pl[a].at || 0) - (r.pl[z].at || 0) || (a < z ? -1 : 1));
async function netCreateRoom(quick, mode) {
  netLeaveRoom(); const me = NET.user.uid;
  for (let i = 0; i < 6; i++) { const c = mkCode(); const ex = await R_('rooms/' + c).once('value'); if (ex.exists()) continue;
    await R_('rooms/' + c).set({ host: me, hn: NET.me.name, mode: mode || 'coop', w: 0, lv: 0, st: 'open', quick: quick ? 1 : 0, at: TS() });
    R_('rooms/' + c).onDisconnect().remove(); NET.code = c; NET.role = 'host'; netWatchRoom(c); R_('presence/' + me + '/room').set(c).catch(() => { }); return c; }
  throw new Error('no room');
}
async function netJoinRoom(c) {
  c = String(c || '').toUpperCase().trim(); const s = await R_('rooms/' + c).once('value'), r = s.val(); const me = NET.user.uid;
  if (!r) return '!No room with that code.'; if (r.host === me) return '!That is your own room.'; if (r.st !== 'open') return '!That match has already started.';
  if (roomGuests(r).length >= roomMax(r) - 1) return '!That room is full.';
  try { await R_('rooms/' + c + '/pl/' + me).set({ n: NET.me.name, at: TS() }); } catch (e) { return '!Could not join that room.'; }
  netLeaveRoom(true); NET.code = c; NET.role = 'guest'; R_('rooms/' + c + '/pl/' + me).onDisconnect().remove(); netWatchRoom(c); R_('presence/' + me + '/room').set(c).catch(() => { }); return '';
}
function netWatchRoom(c) {
  const ref = R_('rooms/' + c), fn = s => { const r = s.val(); const was = NET.room; NET.room = r; const me = NET.user && NET.user.uid;
    if (!r) { if (NET.code === c) { const inMatch = G.net; NET.code = null; NET.role = null; if (inMatch && !G.netHost) netConnLost('The host left.'); else if (UI.top === 'scRoom') { NET.msg = '!The room was closed.'; UI.show('scOnline'); } } return; }
    const gs = roomGuests(r);
    if (NET.role === 'guest' && NET.code === c && !(r.pl && r.pl[me]) && r.st === 'open' && was && was.pl && was.pl[me]) { NET.code = null; NET.role = null; if (NET.roomOff) { NET.roomOff(); NET.roomOff = null; } NET.msg = '!You left the room (or it was full).'; if (UI.top === 'scRoom') UI.show('scOnline'); return; }
    if (NET.role === 'host') { if (gs.length > roomMax(r) - 1 && r.st === 'open') gs.slice(roomMax(r) - 1).forEach(u => R_('rooms/' + c + '/pl/' + u).remove().catch(() => { }));
      if (r.quick && gs.length >= roomMax(r) - 1) R_('queue/' + r.mode + '/' + me).remove().catch(() => { });
      if (r.quick && r.mode === 'rk' && gs.length === 1 && r.st === 'open' && !NET.autoGo) { NET.autoGo = 1; setTimeout(() => { NET.autoGo = 0; if (NET.room && NET.room.st === 'open' && roomGuests(NET.room).length) netStart(); }, 1500); } }
    if (r.st === 'go' && (!was || was.st !== 'go')) netGo(r);
    if (r.st === 'open' && was && was.st === 'go' && !G.net && UI.top !== 'scRoom') UI.show('scRoom');
    netRefresh(); };
  ref.on('value', fn); NET.roomOff = () => ref.off('value', fn);
  if (UI.top !== 'scRoom') UI.show('scRoom');
}
function netLeaveRoom(keepUI) {
  const c = NET.code; if (NET.roomOff) { NET.roomOff(); NET.roomOff = null; } netCloseConn();
  if (c && NET.user) { const me = NET.user.uid; if (NET.role === 'host') { R_('rooms/' + c).remove().catch(() => { }); R_('signal/' + c).remove().catch(() => { }); R_('relay/' + c).remove().catch(() => { }); } else { R_('rooms/' + c + '/pl/' + me).remove().catch(() => { }); } ['coop', 'vs', 'rk'].forEach(m => R_('queue/' + m + '/' + me).remove().catch(() => { })); R_('presence/' + me + '/room').remove().catch(() => { }); }
  NET.code = null; NET.role = null; NET.room = null;
}
async function netQuick(mode) {
  const me = NET.user.uid, s = await R_('queue/' + mode).once('value'), q = s.val() || {};
  const now = Date.now(); const ks = Object.keys(q).filter(k => k !== me && !NET.blocked[k] && now - (q[k].at || 0) < 90000).sort((a, b) => q[a].at - q[b].at);
  for (const k of ks) { const e = await netJoinRoom(q[k].code); if (!e) return ''; }
  const c = await netCreateRoom(true, mode); const qr = R_('queue/' + mode + '/' + me); await qr.set({ code: c, name: NET.me.name, at: TS() }); qr.onDisconnect().remove(); NET.msg = mode === 'rk' ? 'Searching for a ranked opponent...' : 'Searching for pilots...'; return '';
}
function netInvite(uid) { const r = NET.room; return R_('invites/' + uid + '/' + NET.user.uid).set({ code: NET.code, name: NET.me.name, mode: r ? r.mode : 'coop', at: TS() }); }
async function netAcceptInvite(uid) { const v = NET.invites[uid]; await R_('invites/' + NET.user.uid + '/' + uid).remove().catch(() => { }); if (!v) return '!Invite expired.'; return netJoinRoom(v.code); }
function netRoomSet(k, v) { if (NET.role === 'host' && NET.code) R_('rooms/' + NET.code + '/' + k).set(v).catch(() => { }); }
async function netStart() { // host presses START
  const r = NET.room, gs = roomGuests(r); if (!r || !gs.length) return '!Wait for another pilot.'; if (r.mode === 'coop' && (r.w | 0) >= SAVE.wu) return '!Pick a world you have unlocked.';
  if (r.mode === 'rk' && gs.length !== 1) return '!Ranked is one versus one.';
  const ord = gs.slice(0, roomMax(r) - 1);
  await R_('signal/' + NET.code).remove().catch(() => { }); await R_('relay/' + NET.code).remove().catch(() => { }); await R_('rooms/' + NET.code + '/gpl').remove().catch(() => { });
  await R_('rooms/' + NET.code + '/ord').set(ord); await R_('rooms/' + NET.code + '/hpl').set(JSON.stringify(netPlData())); await R_('rooms/' + NET.code + '/st').set('go'); return '';
}
// the host keeps one link per guest; NET.conn is a stand-in that talks to all of them at once
function netHub(conns) {
  const H = { hub: true, conns, onMsg: null, onClose: null, closed: false,
    get mode() { const a = Object.values(conns); return a.some(c => c.mode === 'relay') ? 'relay' : 'rtc'; },
    get ping() { return Math.max(0, ...Object.values(conns).map(c => c.ping | 0)); },
    get last() { const a = Object.values(conns).filter(c => !c.closed); return a.length ? Math.min(...a.map(c => c.last)) : Date.now(); },
    send(ch, m) { for (const u in conns) if (!conns[u].closed) conns[u].send(ch, m); },
    sendTo(u, ch, m) { if (conns[u] && !conns[u].closed) conns[u].send(ch, m); },
    close() { if (H.closed) return; H.closed = true; for (const u in conns) conns[u].close(); } };
  return H;
}
async function netGo(r) { // everyone: connect, then the host starts the match
  const me = NET.user.uid, ord = r.ord || roomGuests(r).slice(0, 3);
  if (NET.role === 'guest') { if (ord.indexOf(me) < 0) { NET.msg = '!The match started without you (room was full).'; netLeaveRoom(); UI.show('scOnline'); return; } await R_('rooms/' + NET.code + '/gpl/' + me).set(JSON.stringify(netPlData())).catch(() => { }); }
  NET.msg = 'Connecting...'; NET.warned = 0; netRefresh();
  if (NET.role === 'guest') {
    try { NET.conn = await netConnect(NET.code + '/' + me, 'guest'); } catch (e) { NET.msg = '!Could not connect: ' + e.message; netRefresh(); return; }
    NET.conn.onMsg = netOnMsg; NET.conn.onClose = () => netConnLost('Connection lost.'); return;
  }
  const conns = {}; await Promise.all(ord.map(u => netConnect(NET.code + '/' + u, 'host').then(c => { conns[u] = c; }).catch(() => { })));
  if (!Object.keys(conns).length) { NET.msg = '!Could not connect to anyone.'; netRoomSet('st', 'open'); netRefresh(); return; }
  const H = NET.conn = netHub(conns), live = ord.filter(u => conns[u]);
  live.forEach((u, k) => { conns[u].onMsg = m => netOnMsg(m, k + 1); conns[u].onClose = () => netGuestLost(u, k + 1); });
  const gpl = []; for (const u of live) { let v = null; for (let i = 0; i < 40 && !v; i++) { const s = await R_('rooms/' + NET.code + '/gpl/' + u).once('value'); v = s.val(); if (!v) await new Promise(r2 => setTimeout(r2, 250)); } gpl.push(v ? JSON.parse(v) : SAVE.pl[0]); }
  NET.order = live; netHostStart(r, gpl, live.map(u => (r.pl && r.pl[u] && r.pl[u].n) || 'Pilot'));
}
function netGuestLost(uid, i) { // one guest dropped: their ship goes down, everyone else keeps flying
  const H = NET.conn; if (H && H.conns && H.conns[uid]) { H.conns[uid].close(); delete H.conns[uid]; }
  const p = G.players[i]; if (p && G.run && !G.run.over) { p.remote = false; p.alive = false; p.hp = 0; p.rest = 0; alertMsg(((G.netNames || [])[i] || 'A PILOT').toUpperCase() + ' DISCONNECTED'); }
  if (H && H.conns && !Object.keys(H.conns).length) netConnLost('Everyone left.');
}

// ---------- transport: WebRTC data channels (direct), with a relay through the database as backup ----------
const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
function netConnect(code, role) {
  return new Promise((resolve, reject) => {
    const sig = R_('signal/' + code), C = { mode: 'rtc', onMsg: null, onClose: null, last: Date.now(), fastCh: null, relCh: null, pc: null, offs: [], closed: false, ping: 0 };
    let done = false; const finish = () => { if (done) return; done = true; clearTimeout(tmo); resolve(C); };
    const recv = d => { C.last = Date.now(); let m; try { m = JSON.parse(d); } catch (e) { return; } if (m.t === 'pi') { C.send('rel', { t: 'po', s: m.s }); return; } if (m.t === 'po') { C.ping = Date.now() - m.s; return; } if (C.onMsg) C.onMsg(m); };
    C.send = (ch, m) => { if (C.closed) return; const s = JSON.stringify(m); if (C.mode === 'rtc') { const c = ch === 'fast' && C.fastCh && C.fastCh.readyState === 'open' ? C.fastCh : C.relCh; if (c && c.readyState === 'open') { try { c.send(s); } catch (e) { } } } else C.relaySend(ch, m, s); };
    C.close = () => { if (C.closed) return; C.closed = true; try { C.pc && C.pc.close(); } catch (e) { } C.offs.forEach(f => f()); clearInterval(C.hb); };
    const wire = ch => { ch.onmessage = e => recv(e.data); ch.onopen = () => { if (C.relCh && C.relCh.readyState === 'open' && (!C.fastCh || C.fastCh.readyState === 'open')) finish(); }; ch.onclose = () => { if (!C.closed && C.mode === 'rtc' && C.onClose) C.onClose(); }; };
    // relay backup
    C.startRelay = () => {
      if (C.mode === 'relay') return; C.mode = 'relay'; try { C.pc && C.pc.close(); } catch (e) { }
      const mine = role === 'host' ? 'h' : 'g', theirs = role === 'host' ? 'g' : 'h', rf = R_('relay/' + code);
      let lastFast = 0; C.relaySend = (ch, m, s) => { if (ch === 'fast') { const now = Date.now(); if (now - lastFast < 90) return; lastFast = now; rf.child(mine + 'f').set(s).catch(() => { }); } else rf.child(mine + 'r').push(s).catch(() => { }); };
      const f1 = s => { if (s.val()) recv(s.val()); }, f2 = s => { recv(s.val()); s.ref.remove().catch(() => { }); };
      rf.child(theirs + 'f').on('value', f1); rf.child(theirs + 'r').on('child_added', f2); C.offs.push(() => { rf.child(theirs + 'f').off('value', f1); rf.child(theirs + 'r').off('child_added', f2); });
      finish();
    };
    const tmo = setTimeout(() => { if (role === 'host') sig.child('relay').set(true).catch(() => { }); C.startRelay(); }, 8000);
    const rl = s => { if (s.val() === true) C.startRelay(); }; sig.child('relay').on('value', rl); C.offs.push(() => sig.child('relay').off('value', rl));
    C.hb = setInterval(() => { C.send('rel', { t: 'pi', s: Date.now() }); if (done && Date.now() - C.last > 9000 && C.onClose && !C.closed) C.onClose(); }, 2000);
    if (!window.RTCPeerConnection) { return; } // no WebRTC: the timeout above falls back to the relay
    const pc = C.pc = new RTCPeerConnection({ iceServers: ICE });
    const mineC = role === 'host' ? 'hc' : 'gc', theirC = role === 'host' ? 'gc' : 'hc';
    pc.onicecandidate = e => { if (e.candidate) sig.child(mineC).push(JSON.stringify(e.candidate.toJSON())).catch(() => { }); };
    const fc = s => { try { pc.addIceCandidate(JSON.parse(s.val())).catch(() => { }); } catch (e) { } }; sig.child(theirC).on('child_added', fc); C.offs.push(() => sig.child(theirC).off('child_added', fc));
    if (role === 'host') {
      C.fastCh = pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 }); C.relCh = pc.createDataChannel('rel', { ordered: true }); wire(C.fastCh); wire(C.relCh);
      pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => sig.child('offer').set(JSON.stringify(pc.localDescription))).catch(reject);
      const fa = s => { if (s.val() && !pc.currentRemoteDescription) pc.setRemoteDescription(JSON.parse(s.val())).catch(() => { }); }; sig.child('answer').on('value', fa); C.offs.push(() => sig.child('answer').off('value', fa));
    } else {
      pc.ondatachannel = e => { if (e.channel.label === 'fast') C.fastCh = e.channel; else C.relCh = e.channel; wire(e.channel); };
      const fo = s => { if (!s.val() || pc.currentRemoteDescription) return; pc.setRemoteDescription(JSON.parse(s.val())).then(() => pc.createAnswer()).then(a => pc.setLocalDescription(a)).then(() => sig.child('answer').set(JSON.stringify(pc.localDescription))).catch(() => { }); };
      sig.child('offer').on('value', fo); C.offs.push(() => sig.child('offer').off('value', fo));
    }
  });
}
function netCloseConn() { if (NET.conn) { NET.conn.close(); NET.conn = null; } }

// ---------- the match ----------
const KCODE = ['orb', 'shard', 'ice', 'mine', 'ring', 'plasma', 'twin', 'spread', 'lancer', 'ion', 'missile', 'arc', 'rail'];
const kIdx = k => { const i = KCODE.indexOf(k); return i < 0 ? 0 : i; };
const PKC = ['core', 'ammo', 'hp', 'sh', 'od', 'log'];
const r1 = v => Math.round(v * 10) / 10;
let netEvQ = [];
function netEv(...a) { if (G.netHost && G.inCombat && netEvQ.length < 200) netEvQ.push(a); }
function netWrapHost() { // copy the host's eye candy and sounds to the guest
  if (NET.wrapped) return; NET.wrapped = 1;
  const b2 = boom2D; boom2D = function (x, y, s, c) { netEv('b2', r1(x), r1(y), s, c); return b2.apply(this, arguments); };
  const sh = shock; shock = function (x, y, c, r, l) { netEv('sk', r1(x), r1(y), c, r, l); return sh.apply(this, arguments); };
  const bn = banner; banner = function (t, s, b) { netEv('bn', t, s, b); return bn.apply(this, arguments); };
  const am = alertMsg; alertMsg = function (t) { netEv('al', t); return am.apply(this, arguments); };
  const ft = ftext; ftext = function (x, y, t, c, s) { if ((s | 0) >= 13) netEv('ft', r1(x), r1(y), t, c, s); return ft.apply(this, arguments); };
  Object.keys(SFX).forEach(k => { const f = SFX[k]; SFX[k] = function (a) { netEv('sx', k, a); return f.apply(this, arguments); }; });
}
function netHostStart(r, gpls, names) {
  netWrapHost(); NET.inMatch = 1; NET.rkMode = r.mode === 'rk';
  const o = isVs(r.mode) ? { mode: 'endless', var: 'versus', w: Math.min(r.w | 0, Math.max(0, SAVE.wu - 1)), lv: 0, tier: 1, co: true } : { mode: 'expedition', w: r.w | 0, lv: r.lv | 0, tier: 1, co: true };
  const pls = [SAVE.pl[0]].concat(gpls); G.netNames = [NET.me.name].concat(names); G.netUids = [NET.user.uid].concat(NET.order || []);
  G.net = 1; G.netHost = 1; G.netGuest = 0; G.netMe = 0; G.netN = pls.length; G.netPl = pls; G.last = o; netEvQ = [];
  beginRun(o); G.players[0].local = true; for (let i = 1; i < G.players.length; i++) { const p = G.players[i]; p.remote = true; p.netIn = { x: p.x / V.W, y: p.y / V.H }; } NET.uidC = 0;
  (NET.order || []).forEach((u, k) => NET.conn.sendTo(u, 'rel', { t: 'start', o, W: V.W, H: V.H, pls, names: G.netNames, uids: G.netUids, me: k + 1, rk: NET.rkMode ? 1 : 0 }));
  if (NET.rkMode && typeof rkMatchStart === 'function') rkMatchStart();
}
function netSnap(R) {
  const en = [], eb = [], pb = [], pk = [], bm = [];
  for (const e of G.ent.en) { if (e.dead) continue; if (!e.uid) e.uid = ++NET.uidC; en.push([e.uid, e.boss ? 'B' + e.bi : e.id, r1(e.x), r1(e.y), Math.round(e.hp), Math.round(e.mhp), e.hf | 0, (e.gold ? 1 : 0) | (e.hunt ? 2 : 0) | (e.hide ? 4 : 0), e.boss ? [e.ph | 0, e.st | 0, e.stg | 0, e.inv ? 1 : 0] : 0]); }
  const EB = G.ent.eb; for (let i = 0; i < EB.length && i < 420; i++) { const b = EB[i]; eb.push([r1(b.x), r1(b.y), r1(b.vx), r1(b.vy), kIdx(b.k), b.r | 0]); }
  const PB = G.ent.pb; for (let i = 0; i < PB.length && i < 160; i++) { const b = PB[i]; pb.push([r1(b.x), r1(b.y), r1(b.vx), r1(b.vy), kIdx(b.k), Math.round(b.r), b.c || '']); }
  for (const k of G.ent.pk) pk.push([PKC.indexOf(k.k), r1(k.x), r1(k.y)]);
  for (const b of G.ent.bm) if (b.k === 'beam' && b.o) bm.push([r1(b.y), b.h, b.tel | 0, b.on | 0, b.c]);
  const P = G.players.map(p => [r1(p.x), r1(p.y), Math.round(p.hp), p.mhp, Math.round(p.sh), p.msh, Math.round(p.am), p.mam, p.alive ? 1 : 0, p.wpn, Math.floor(p.sup || 0), p.supT | 0, p.abCd | 0, p.abMax | 0, p.chg | 0, p.inv > 0 ? 1 : 0, p.dashT | 0, r1(p.dvx || 0), r1(p.dvy || 0), p.parT | 0, Math.round(p.score), p.rest | 0, p.dX === undefined ? -1 : r1(p.dX), p.dY === undefined ? -1 : r1(p.dY), p.rv | 0, p.od | 0, p.phaseT | 0, p.ovl | 0, p.wallT | 0, p.reflT | 0, p.team | 0]);
  return { t: 's', f: G.t, R: [Math.round(R.score), R.combo, R.wave, R.waves, R.stage, R.kills, R.rCores | 0, R.vs ? R.vs.time : 0, R.graze | 0, R.maxCombo | 0], P, en, eb, pb, pk, bm };
}
function netHostTick(R) {
  const C = NET.conn; if (!C) return;
  if (G.t % 3 === 0) C.send('fast', netSnap(R));
  if (netEvQ.length) { C.send('rel', { t: 'ev', e: netEvQ }); netEvQ = []; }
  if (G.players.some(p => p.remote) && Date.now() - C.last > 6000 && !NET.warned) { NET.warned = 1; alertMsg('A PILOT IS LAGGING...'); }
}
function netRemoteInput(p) { const n = p.netIn || {}; p.lmx = n.mx || 0; p.lmy = n.my || 0; return { mx: n.mx || 0, my: n.my || 0, tx: null, ty: null, fire: !!n.fire, x: (n.x || 0) * V.W, y: (n.y || 0) * V.H }; }
function netSendEnd(R, win) { if (!NET.conn) return; NET.conn.send('rel', { t: 'end', win: !!win, score: Math.round(R.score), kills: R.kills, wave: R.wave, rc: R.rCores | 0, vs: G.players.map(p => Math.round(p.score)), names: G.netNames, time: Math.round((G.t - R.t0) / 60), maxCombo: R.maxCombo | 0, graze: R.graze | 0, w: R.w, lv: R.lv, bossDown: R.bossDown | 0 }); }
function netOnMsg(m, from) {
  from = from | 0 || 1;
  if (m.t === 'start' && NET.role === 'guest') netGuestStart(m);
  else if (m.t === 's' && G.netGuest) NET.snap = m;
  else if (m.t === 'ev' && G.netGuest) netPlayEv(m.e);
  else if (m.t === 'in' && G.netHost) { const p = G.players[from]; if (!p || !p.remote) return; p.netIn = m; if (m.ab) p.netAb = 1; if (m.sup) p.netSup = 1; if (m.sw) cycleWeapon(p, m.sw); if (m.ws) { const id = WORDER[m.ws - 1]; if (id) setWeapon(p, id); } if (m.emo) { netEmote(from, m.emo); NET.conn.send('rel', { t: 'emo', p: from, e: m.emo }); } }
  else if (m.t === 'end' && G.netGuest) netGuestEnd(m);
  else if (m.t === 'emo') { if (!(G.netGuest && m.p === G.netMe)) netEmote(m.p, m.e); }
  else if (m.t === 'bye') { if (G.netHost && NET.order) netGuestLost(NET.order[from - 1], from); else netConnLost('The host left the match.'); }
}
// ---------- guest side ----------
function netGuestStart(m) {
  NET.inMatch = 1; NET.hW = m.W; NET.hH = m.H; G.net = 1; G.netGuest = 1; G.netHost = 0; const pls = m.pls || [m.hpl, SAVE.pl[0]]; G.netMe = m.me || 1; pls[G.netMe] = SAVE.pl[0]; G.netPl = pls; G.netN = pls.length; G.netNames = m.names || null; G.netUids = m.uids || null; NET.rkMode = !!m.rk; G.last = m.o; NET.ents = new Map(); NET.snap = null; NET.gc0 = 0;
  beginRun(m.o); G.players.forEach((p, i) => { if (i === G.netMe) p.local = true; else p.remote = true; }); G.ent.en.length = 0;
  if (NET.rkMode && typeof rkMatchStart === 'function') rkMatchStart();
}
const mx_ = x => x * V.W / (NET.hW || V.W), my_ = y => y * V.H / (NET.hH || V.H);
function netPlayEv(E) {
  for (const a of E) { try {
    if (a[0] === 'b2') b2Local(mx_(a[1]), my_(a[2]), a[3], a[4]);
    else if (a[0] === 'sk') shock(mx_(a[1]), my_(a[2]), a[3], a[4], a[5]);
    else if (a[0] === 'bn') banner(a[1], a[2], a[3]);
    else if (a[0] === 'al') alertMsg(a[1]);
    else if (a[0] === 'ft') ftext(mx_(a[1]), my_(a[2]), a[3], a[4], a[5]);
    else if (a[0] === 'sx' && SFX[a[1]]) SFX[a[1]](a[2]);
  } catch (e) { } }
}
function b2Local(x, y, s, c) { boom2D(x, y, s, c); if (R3 && R3.boom) try { R3.boom(x, y, Math.min(14, 4 + (s / 12 | 0)), hx(c || '#f97316'), 4 + s / 40, 6 + s / 12); } catch (e) { } }
const NETIN = { t: 0 };
function netGuestUpdate(R) {
  const S = NET.snap, me = G.players[G.netMe | 0 || 1];
  // 1) fly our own ship locally (no waiting for the host)
  if (me && me.alive && !R.over) {
    const sw = IN.swap[0]; IN.swap[0] = 0; const ab = IN.ab[0]; IN.ab[0] = 0; const sup = IN2.sup[0]; IN2.sup[0] = 0;
    const o = inputFor(me), sp = me.st.spd * 1.25 * (me.slow > 0 ? .55 : 1) * (me.phaseT > 0 ? 1.4 : 1);
    if (me.dashT > 0) { me.dashT--; me.vx = me.dvx; me.vy = me.dvy; }
    else if (o.tx !== null) { const dx = o.tx - me.x, dy = o.ty - me.y, d = Math.hypot(dx, dy) || 1, v = Math.min(d * .22, sp * 2.2); me.vx += (dx / d * v - me.vx) * .5; me.vy += (dy / d * v - me.vy) * .5; }
    else { let mx = o.mx, my = o.my; const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; } me.vx += (mx * sp - me.vx) * .3; me.vy += (my * sp - me.vy) * .3; }
    me.x += me.vx; me.y += me.vy; const B = BOUND(); me.x = clamp(me.x, B.x0, B.x1); me.y = clamp(me.y, B.y0, B.y1);
    const sec = secHeld(me); NETIN.ab = (NETIN.ab || 0) | (ab ? 1 : 0); NETIN.sup = (NETIN.sup || 0) | (sup ? 1 : 0); if (sw) NETIN.sw = sw; if (NETG.wsel) { NETIN.ws = NETG.wsel; NETG.wsel = 0; }
    if (G.t % 2 === 0 && NET.conn) { NET.conn.send(NETIN.ab || NETIN.sup || NETIN.sw || NETIN.ws ? 'rel' : 'fast', { t: 'in', x: me.x / V.W, y: me.y / V.H, mx: o.mx, my: o.my, fire: !!o.fire, sec: !!sec, ab: NETIN.ab | 0, sup: NETIN.sup | 0, sw: NETIN.sw | 0, ws: NETIN.ws | 0 }); NETIN.ab = NETIN.sup = NETIN.sw = NETIN.ws = 0; }
    if (!SET.reduce && G.t % 3 === 0) pcl({ x: me.x - 32, y: me.y + rnd(-3, 3), vx: -3, vy: rnd(-.3, .3), l: 16, l0: 16, c: trailCol(me), r: 3, k: 0, fr: .9 });
  }
  // 2) apply the latest picture of the world from the host
  if (S && S !== NET.applied) { NET.applied = S; netApply(S, R); }
  // 3) move everything a little between pictures so it stays smooth
  for (const e of G.ent.en) { if (e.tx !== undefined) { e.x += (e.tx - e.x) * .3; e.y += (e.ty - e.y) * .3; } e.t = (e.t || 0) + 1; if (e.hf > 0) e.hf--; }
  for (const b of G.ent.eb) { b.x += b.vx; b.y += b.vy; } for (const b of G.ent.pb) { b.x += b.vx; b.y += b.vy; }
  for (const rp of G.players) if (rp !== me && rp.tx !== undefined) { rp.x += (rp.tx - rp.x) * .35; rp.y += (rp.ty - rp.y) * .35; }
  updParticles(); if (R3) R3.tick(); if (G.shake > 0) G.shake--; if (G.flashT > 0) G.flashT--; if (G.hitT > 0) G.hitT--; if (G.t % 3 === 0) hudTick();
  if (NET.conn && Date.now() - NET.conn.last > 6000 && !NET.warned) { NET.warned = 1; alertMsg('THE HOST IS LAGGING...'); }
}
function netApply(S, R) {
  const sx = V.W / (NET.hW || V.W), sy = V.H / (NET.hH || V.H);
  const r = S.R; R.score = r[0]; R.combo = r[1]; R.comboT = r[1] > 0 ? 60 : 0; R.wave = r[2]; R.waves = r[3]; R.stage = r[4]; R.kills = r[5]; R.rCores = r[6]; if (R.vs) R.vs.time = r[7]; R.graze = r[8]; R.maxCombo = r[9];
  S.P.forEach((a, i) => { const p = G.players[i]; if (!p) return; const loc = i === G.netMe;
    if (!loc) { p.tx = a[0] * sx; p.ty = a[1] * sy; if (p.x === undefined || Math.abs(p.x - p.tx) > 200) { p.x = p.tx; p.y = p.ty; } }
    else if (!a[8] || !p.alive) { p.x = a[0] * sx; p.y = a[1] * sy; }
    p.hp = a[2]; p.mhp = a[3]; p.sh = a[4]; p.msh = a[5]; p.am = a[6]; p.mam = a[7]; const wasA = p.alive; p.alive = !!a[8]; if (wasA && !p.alive && R3) try { R3.die(p); } catch (e) { } if (!wasA && p.alive && R3) try { R3.repair(p); } catch (e) { }
    p.wpn = a[9]; p.sup = a[10]; p.supT = a[11]; p.abCd = a[12]; p.abMax = a[13]; p.chg = a[14]; p.blink = !!a[15]; if (loc && a[16] > 0 && !(p.dashT > 0)) { p.dashT = a[16]; p.dvx = a[17]; p.dvy = a[18]; } p.parT = a[19]; p.score = a[20]; p.rest = a[21]; p.dX = a[22] < 0 ? undefined : a[22] * sx; p.dY = a[23] < 0 ? undefined : a[23] * sy; p.rv = a[24]; p.od = a[25]; p.phaseT = a[26]; p.ovl = a[27]; p.wallT = a[28]; p.reflT = a[29]; p.team = a[30]; });
  const seen = new Set();
  for (const a of S.en) { const uid = a[0]; seen.add(uid); let e = NET.ents.get(uid);
    if (!e) { if (a[1][0] === 'B' && /^B\d+$/.test(a[1])) { const bi = +a[1].slice(1); if (!BOSSES[bi]) continue; e = spawnBoss(bi, 1); } else { if (!EN[a[1]]) continue; e = mkEnemy(a[1], a[2] * sx, a[3] * sy); } e.x = a[2] * sx; e.y = a[3] * sy; NET.ents.set(uid, e); }
    e.tx = a[2] * sx; e.ty = a[3] * sy; e.hp = a[4]; e.mhp = a[5]; if (a[6]) e.hf = a[6]; e.gold = a[7] & 1; e.hunt = (a[7] & 2) ? 1 : 0; e.hide = !!(a[7] & 4);
    if (a[8]) { e.ph = a[8][0]; e.st = a[8][1]; e.stg = a[8][2]; e.inv = !!a[8][3]; R.boss = e; } }
  NET.ents.forEach((e, uid) => { if (!seen.has(uid)) { e.dead = true; NET.ents.delete(uid); if (R.boss === e) R.boss = null; } });
  for (let i = G.ent.en.length - 1; i >= 0; i--) if (G.ent.en[i].dead) G.ent.en.splice(i, 1);
  G.ent.eb = S.eb.map(a => ({ x: a[0] * sx, y: a[1] * sy, vx: a[2] * sx, vy: a[3] * sy, k: KCODE[a[4]] || 'orb', r: a[5] }));
  G.ent.pb = S.pb.map(a => ({ x: a[0] * sx, y: a[1] * sy, vx: a[2] * sx, vy: a[3] * sy, k: KCODE[a[4]] || 'twin', r: a[5], c: a[6] || undefined, hs: [] }));
  G.ent.pk = S.pk.map(a => ({ k: PKC[a[0]] || 'core', x: a[1] * sx, y: a[2] * sy, vx: 0, vy: 0, l: 500, v: 1 }));
  G.ent.bm = G.ent.bm.filter(b => b.k !== 'beam').concat(R.boss ? S.bm.map(a => ({ k: 'beam', o: R.boss, y: a[0] * sy, h: a[1], tel: a[2], on: a[3], c: a[4] })) : []);
}
function netGuestEnd(m) {
  const R = G.run; if (!R || R.over) return; R.over = true; G.inCombat = false; $('touch').classList.remove('on'); music.stop();
  const rc = m.rc | 0; SAVE.cores += rc; const bonus = m.win ? 80 + (m.wave | 0) * 10 : 20; SAVE.cores += bonus; SAVE.st.runs++; saveGame();
  const d = { rank: m.win ? 'B' : 'C', win: m.win, mode: R.var || R.mode, base: R.mode, score: m.score, kills: m.kills, cores: rc, stars: m.win ? 2 : 0, bonus, w: m.w, lv: m.lv, tier: 1, wave: m.wave, time: m.time, maxCombo: m.maxCombo, graze: m.graze, next: null, unlockW: -1, name: 'Online match', online: 1 };
  if (m.vs) { const top = Math.max(...m.vs); d.vs = m.vs; d.vsNm = m.names || null; d.vsWin = m.vs.filter(s => s === top).length > 1 ? 0 : m.vs.indexOf(top) + 1; }
  setTimeout(() => UI.result(d), 300);
}
// ---------- leaving, disconnects, emotes ----------
function netConnLost(why) {
  if (!G.net || (G.run && G.run.over)) { netCloseConn(); return; } const host = G.netHost; NET.warned = 0;
  if (host && G.run && !G.run.over) { G.players.forEach(p => { if (p.remote) { p.remote = false; p.alive = false; p.hp = 0; p.rest = 0; } }); alertMsg('EVERYONE DISCONNECTED - FLYING SOLO'); netEndNet(true); return; }
  netEndNet(); if (G.run && !G.run.over) { exitToMenu('scOnline'); } NET.msg = '!' + why; if (UI.top === 'scOnline') UI.refresh();
}
function netEndNet(keepRun) { netCloseConn(); if (!keepRun) { G.net = 0; G.netHost = 0; G.netGuest = 0; G.netPl = null; } else { G.netHost = 0; G.net = 0; } NET.inMatch = 0; }
let netPauseT = 0;
function netPauseKey() { const now = Date.now(); if (now - netPauseT < 2000) { netLeaveMatch(); return; } netPauseT = now; alertMsg('ONLINE MATCH - PRESS AGAIN TO LEAVE'); }
function netLeaveMatch() { if (NET.conn) NET.conn.send('rel', { t: 'bye' }); netEndNet(); netLeaveRoom(); exitToMenu('scOnline'); }
const EMOS = ['GG!', 'HELP!', 'NICE!', 'BOSS!', 'THANKS!', 'WAIT'];
const PCOL = ['#22d3ee', '#fb923c', '#a3e635', '#e879f9'];
function netEmote(pi, e) { const p = G.players[pi], t = EMOS[(e | 0) - 1]; if (!p || !t) return; ftext(p.x, p.y - 44, t, PCOL[pi & 3], 16); SFX.click(); }
function netSendEmote(e) { if (!NET.conn || !G.net) return; const pi = G.netHost ? 0 : G.netMe | 0 || 1, me = G.players[pi]; netEmote(pi, e); if (G.netHost) NET.conn.send('rel', { t: 'emo', p: 0, e }); else NET.conn.send('rel', { t: 'in', emo: e, x: me.x / V.W, y: me.y / V.H }); }
addEventListener('keydown', e => { if (!G.net || !G.inCombat) return; const k = '7890'.indexOf(e.key); if (k >= 0 && !e.repeat) netSendEmote(k + 1); });

// ================= UI: Online hub, pilot name, room lobby =================
const dot = on => '<i class="ndot' + (on ? ' on' : '') + '"></i>';
Object.assign(SCR, {
  scOnline: () => {
    const msg = NET.msg ? '<div class="xs ' + (NET.msg[0] === '!' ? 'bad' : 'good') + '" style="margin:6px 0">' + escH(NET.msg.replace(/^!/, '')) + '</div>' : '';
    if (!NET.ok) return '<div class="card mid"><h2>Online</h2><p class="mut sm" style="line-height:1.7;margin:10px 0">Online play - friends, co-op and versus with other people - runs on the Aetheria website, because Google sign-in cannot open inside this window.</p><div class="item" style="flex-direction:column;align-items:stretch;gap:8px"><b class="acc" style="letter-spacing:.06em">' + WEB_URL + '</b><div class="row" style="gap:8px"><button class="btn sm" data-act="copycode:' + WEB_URL + '">COPY LINK</button></div></div><div class="xs mut" style="margin-top:8px">Your progress here and on the website are separate saves. Use Settings > Data > Save Slots > EXPORT to move it over.</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="nhome">BACK</button></div></div>';
    if (!NET.ready) { netInit().catch(e => { NET.msg = '!Could not reach the online service (' + e.message + ').'; UI.refresh(); }); return '<div class="card mid"><h2>Online</h2><p class="mut" style="margin:14px 0">Connecting...</p>' + msg + '<button class="btn sm" data-act="nhome">BACK</button></div>'; }
    if (!NET.user) return '<div class="card mid"><h2>Online</h2><p class="mut sm" style="line-height:1.7;margin:10px 0">Sign in to add friends, see who is online, and fly co-op or versus with other pilots. Single-player never needs an account.</p>' + msg + '<button class="btn big" data-act="nsignin">SIGN IN WITH GOOGLE</button><div class="xs mut" style="margin-top:8px">We only store your pilot name, friend code and game stats - never your email in public.</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="nhome">BACK</button></div></div>';
    if (!NET.me || !NET.me.name) return SCR.scName();
    const me = NET.me, fr = Object.keys(NET.friends), rq = Object.keys(NET.reqs).filter(k => !NET.blocked[k]), inv = Object.keys(NET.invites).filter(k => !NET.blocked[k] && Date.now() - (NET.invites[k].at || 0) < 600000);
    const fl = fr.length ? fr.map(uid => { const f = NET.fdata[uid] || {}, pr = NET.pres[uid], on = !!(pr && pr.on); return '<div class="item frow"><div class="fl"><div class="b sm">' + dot(on) + escH(f.name || '...') + ' <span class="xs mut">' + escH(f.rk || '') + ' LV ' + (f.lv || 1) + '</span></div><div class="xs mut">' + (on ? (pr.room ? 'In a room' : 'Online') : 'Offline') + ' - best endless ' + fmt(f.hi || 0) + ' - ' + (f.wu || 1) + ' worlds</div></div><span class="row" style="gap:6px">' + (NET.code && on ? '<button class="btn sm gold" data-act="ninv:' + uid + '">INVITE</button>' : '') + '<button class="btn sm" data-act="nmore:' + uid + '">...</button></span></div>' + (UI.nmore === uid ? '<div class="row" style="gap:6px;margin:-4px 0 6px 10px"><button class="btn sm warn" data-act="nunf:' + uid + '">REMOVE FRIEND</button><button class="btn sm warn" data-act="nblock:' + uid + '">BLOCK</button><button class="btn sm warn" data-act="nrep:' + uid + '">REPORT NAME</button></div>' : ''); }).join('') : '<div class="xs mut">No friends yet. Share your friend code, or add someone else\'s below.</div>';
    return '<div class="card wide"><div class="row sp wrap"><div><h2>Online</h2><div class="xs mut">Signed in as <b class="acc">' + escH(me.name) + '</b> - friend code <b class="gold" style="letter-spacing:.1em">' + escH(me.code || '-') + '</b> <button class="btn sm" data-act="copycode:' + escH(me.code || '') + '" style="padding:3px 8px">COPY</button></div></div><span class="row wrap" style="gap:6px"><button class="btn sm gold" data-act="ranked">RANKED</button><button class="btn sm gold" data-act="boards">LEADERBOARDS</button><button class="btn sm' + (inboxCount() ? ' gold' : '') + '" data-act="inbox">INBOX' + (inboxCount() ? ' (' + inboxCount() + ')' : '') + '</button><button class="btn sm" data-act="cloud">CLOUD SAVE</button><button class="btn sm" data-act="nrename">CHANGE NAME</button><button class="btn sm" data-act="nsignout">SIGN OUT</button></span></div>' + msg +
      (inv.length ? '<div class="xs mut b nh">INVITES</div>' + inv.map(k => '<div class="item"><div class="fl b sm">' + escH(NET.invites[k].name) + ' invited you to ' + (NET.invites[k].mode === 'vs' ? 'VERSUS' : 'CO-OP') + '</div><span class="row" style="gap:6px"><button class="btn sm gold" data-act="njoininv:' + k + '">JOIN</button><button class="btn sm" data-act="ndelinv:' + k + '">NO</button></span></div>').join('') : '') +
      '<div class="grid2" style="margin-top:10px"><div><div class="xs mut b nh">PLAY</div><div class="stack" style="gap:8px"><div class="grid2"><button class="btn gold" data-act="nquick:coop">QUICK CO-OP (UP TO 4)</button><button class="btn gold" data-act="nquick:vs">QUICK VERSUS</button></div><button class="btn" data-act="ranked">RANKED VERSUS</button><button class="btn" data-act="ncreate">CREATE PRIVATE ROOM</button><div class="row" style="gap:6px"><input id="nRoom" class="code" maxlength="4" placeholder="CODE" style="flex:1;text-transform:uppercase;letter-spacing:.3em;font-size:16px"><button class="btn" data-act="njoin">JOIN ROOM</button></div></div>' +
      (rq.length ? '<div class="xs mut b nh">FRIEND REQUESTS</div>' + rq.map(k => '<div class="item"><div class="fl b sm">' + escH(NET.reqs[k].name || '?') + '</div><span class="row" style="gap:6px"><button class="btn sm gold" data-act="nacc:' + k + '">ACCEPT</button><button class="btn sm" data-act="ndec:' + k + '">NO</button><button class="btn sm warn" data-act="nblock:' + k + '">BLOCK</button></span></div>').join('') : '') +
      '<div class="xs mut b nh">ADD A FRIEND</div><div class="row" style="gap:6px"><input id="nFriend" class="code" placeholder="ACE-1234" style="flex:1;text-transform:uppercase"><button class="btn" data-act="nadd">SEND REQUEST</button></div></div>' +
      '<div><div class="xs mut b nh">FRIENDS (' + fr.length + ')</div><div class="stack flist" style="gap:6px">' + fl + '</div></div></div>' +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="nhome">BACK</button><span class="xs mut">In a match: 7 8 9 0 send quick emotes</span></div></div>';
  },
  scName: () => '<div class="card mid"><h2>Pick your pilot name</h2><p class="mut sm" style="margin:8px 0">This is what friends and other players see. 3-16 characters: letters, numbers, spaces, - or _. Keep it friendly.</p><div class="row" style="gap:8px"><input id="nName" class="code" maxlength="16" value="' + escH((NET.me && NET.me.name) || UI.nName || '') + '" style="flex:1;font-size:16px"><button class="btn gold" data-act="nsetname">SAVE</button></div><div class="xs bad" style="margin-top:6px">' + escH(UI.nErr || '') + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="nback">BACK</button></div></div>',
  scRoom: () => {
    const r = NET.room || {}, host = NET.role === 'host', gs = roomGuests(r), mx = roomMax(r), conn = NET.conn ? (NET.conn.mode === 'rtc' ? 'DIRECT' : 'RELAY') + (NET.conn.ping ? ' - ' + NET.conn.ping + ' ms' : '') : '', rk = r.mode === 'rk';
    const msg = NET.msg ? '<div class="xs ' + (NET.msg[0] === '!' ? 'bad' : 'good') + '" style="margin:6px 0">' + escH(NET.msg.replace(/^!/, '')) + '</div>' : '';
    const worlds = WORLDS.map((W, w) => w < SAVE.wu ? '<option value="' + w + '"' + ((r.w | 0) === w ? ' selected' : '') + '>' + (w + 1) + '. ' + escH(W.nm) + '</option>' : '').join('');
    const lvs = NODE_PAT.map((t, i) => '<option value="' + i + '"' + ((r.lv | 0) === i ? ' selected' : '') + '>Sector ' + (i + 1) + ' - ' + NODE_NAME[t] + '</option>').join('');
    const fr = Object.keys(NET.friends).filter(u => NET.pres[u] && NET.pres[u].on && !NET.pres[u].room);
    const slot = (i, nm, tag) => '<div class="item rslot' + (nm ? ' on' : '') + '" style="--pc:' + PCOL[i] + '"><div class="fl"><div class="xs mut b">PILOT ' + (i + 1) + (tag ? ' - ' + tag : '') + '</div><div class="b" style="color:' + (nm ? PCOL[i] : '') + '">' + (nm ? escH(nm) : '<span class="mut">' + (i < mx ? 'waiting...' : '-') + '</span>') + '</div></div></div>';
    const slots = [slot(0, r.hn || '...', 'HOST')]; for (let i = 1; i < mx; i++) { const u = gs[i - 1]; slots.push(slot(i, u ? (r.pl[u].n || '?') : '')); }
    return '<div class="card mid"><div class="row sp"><h2>' + (rk ? 'Ranked Match' : r.quick ? 'Quick Match' : 'Room') + '</h2><span class="gold b" style="font-size:22px;letter-spacing:.3em">' + escH(NET.code || '----') + '</span></div><div class="xs mut">' + (rk ? 'One versus one. Your rating goes up or down when it ends.' : 'Up to 4 pilots. Friends can join with this code from Online > JOIN ROOM.') + '</div>' + msg +
      '<div class="grid2" style="margin-top:10px">' + slots.join('') + '</div>' +
      (rk ? '' : '<div class="xs mut b nh">MODE</div><div class="seg">' + [['coop', 'CO-OP'], ['vs', 'VERSUS']].map(m => '<button data-act="nmode:' + m[0] + '" class="' + (r.mode === m[0] ? 'on' : '') + '"' + (host ? '' : ' disabled') + '>' + m[1] + '</button>').join('') + '</div>') +
      (r.mode === 'coop' ? '<div class="edrow" style="margin-top:8px"><label>WORLD</label><select data-nchg="w"' + (host ? '' : ' disabled') + '>' + worlds + '</select></div><div class="edrow"><label>SECTOR</label><select data-nchg="lv"' + (host ? '' : ' disabled') + '>' + lvs + '</select></div><div class="xs mut">Enemies get tougher with every extra pilot.</div>' : '<div class="xs mut" style="margin-top:8px">Two minutes, most points wins. Getting hit or shot down costs points.</div>') +
      (host && !rk && gs.length < mx - 1 && fr.length ? '<div class="xs mut b nh">INVITE AN ONLINE FRIEND</div><div class="row wrap" style="gap:6px">' + fr.map(u => '<button class="btn sm" data-act="ninv:' + u + '">' + escH((NET.fdata[u] || {}).name || '?') + '</button>').join('') + '</div>' : '') +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm warn" data-act="nleave">LEAVE</button><span class="xs mut">' + conn + '</span>' + (host && !rk ? '<button class="btn big' + (gs.length ? '' : ' off') + '" data-act="nstart">START' + (gs.length ? ' (' + (gs.length + 1) + ')' : '') + '</button>' : '<span class="xs mut">' + (rk ? (gs.length ? 'Starting...' : 'Waiting for an opponent...') : 'The host starts the match') + '</span>') + '</div></div>';
  }
});
const nAsync = (p, ok) => Promise.resolve(p).then(m => { NET.msg = m || ok || ''; UI.refresh(); }).catch(e => { NET.msg = '!' + (e && e.message || 'Something went wrong'); UI.refresh(); });
Object.assign(ACT, {
  online() { NET.msg = ''; UI.show('scOnline'); },
  nhome() { netLeaveRoom(); NET.msg = ''; UI.hist = []; UI.show('scMenu'); },
  nsignin() { NET.msg = ''; netSignIn(); },
  nsignout() { netSignOut(); NET.msg = 'Signed out.'; UI.refresh(); },
  nrename() { UI.nErr = ''; UI.show('scName'); },
  nback() { UI.show('scOnline'); },
  nsetname() { const v = inVal('nName') || ''; UI.nName = v; UI.nErr = 'Saving...'; UI.refresh(); const to = new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 9000)); Promise.race([netSetName(v), to]).then(err => { UI.nErr = err; if (!err) { NET.msg = 'Welcome, ' + v + '!'; UI.show('scOnline'); } else UI.refresh(); }).catch(e => { const c = (e && (e.code || e.message)) || 'unknown'; UI.nErr = /PERMISSION|permission/.test(c) ? 'The database said no (permission denied). Make sure the security rules are published in Firebase > Realtime Database > Rules.' : c === 'timeout' ? 'Could not reach the database. Make sure the Realtime Database is created, and check its link.' : 'Error: ' + c; UI.refresh(); }); },
  nadd() { nAsync(netAddFriend(inVal('nFriend'))); },
  nacc(a) { nAsync(netAccept(a[0]), 'Friend added!'); },
  ndec(a) { nAsync(netDecline(a[0])); },
  nmore(a) { UI.nmore = UI.nmore === a[0] ? null : a[0]; UI.refresh(); },
  nunf(a) { nAsync(netUnfriend(a[0]), 'Friend removed.'); },
  nblock(a) { nAsync(netBlock(a[0]), 'Blocked.'); },
  nrep(a) { nAsync(netReport(a[0], 'name'), 'Reported. Thanks for keeping it friendly.'); },
  ninv(a) { nAsync(netInvite(a[0]), 'Invite sent!'); },
  njoininv(a) { nAsync(netAcceptInvite(a[0])); },
  ndelinv(a) { nAsync(R_('invites/' + NET.user.uid + '/' + a[0]).remove()); },
  nquick(a) { NET.msg = 'Looking for a match...'; UI.refresh(); nAsync(netQuick(a[0])); },
  ncreate() { NET.msg = ''; nAsync(netCreateRoom(false, 'coop').then(() => '')); },
  njoin() { nAsync(netJoinRoom(inVal('nRoom'))); },
  nmode(a) { netRoomSet('mode', a[0]); },
  nstart() { nAsync(netStart()); },
  nleave() { netLeaveRoom(); NET.msg = ''; UI.show('scOnline'); }
});
document.addEventListener('change', e => { const el = e.target && e.target.closest && e.target.closest('[data-nchg]'); if (el && UI.top === 'scRoom') netRoomSet(el.dataset.nchg, +el.value); });
// after an online match: back to the room instead of replaying alone
['retry', 'menu', 'nextlv', 'tomap'].forEach(k => { const f = ACT[k]; ACT[k] = function (a) { if (G.net || (UI.res && UI.res.online) || NET.inMatch) { const host = NET.role === 'host'; netEndNet(); NET.inMatch = 0; exitToMenu(NET.code ? 'scRoom' : 'scOnline'); if (host && NET.code) netRoomSet('st', 'open'); return; } return f.apply(this, arguments); }; });

// leaving the online screens any other way (Esc, back gesture) never traps you in a room
const _uiBack = UI.back.bind(UI);
UI.back = function () { if (this.top === 'scOnline' || this.top === 'scName') { ACT.nhome(); return; } if (this.top === 'scRoom') { ACT.nleave(); return; } return _uiBack(); };

// ================= MAIN MENU: full-screen title screen =================
// Big condensed type on the left, your ship on the right, everything secondary tucked into one quiet row.
const MI = { // small line icons for the secondary row
  profile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7"/></svg>',
  missions: '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  daily: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  cos: '<svg viewBox="0 0 24 24"><path d="M14.5 4.5l5 5-9 9H5.5v-5z"/><path d="M12.5 6.5l5 5"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
  tutorial: '<svg viewBox="0 0 24 24"><path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c3 2.5 8 2.5 11 0v-5"/></svg>',
  ranks: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/></svg>',
  updates: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
  fs: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  fsx: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>'
};
const MAINNAV = [
  ['play', 'Play', 'Campaign, endless, boss rush and every challenge'],
  ['online', 'Online', 'Friends, co-op and versus with other pilots'],
  ['hangar', 'Hangar', 'Build, paint and arm your ship'],
  ['shop', 'Shop', 'Upgrades and new weapons']
];
SCR.scMenu = () => {
  const t = touchOn(), X = PS().xp, pc = SAVE.pl[0].cfg, ac = pc.accent || '#22d3ee', ms = msnReady(), dNew = !SAVE.dl.done[dayKey()], fsOn = !!document.fullscreenElement;
  const online = NET.user && NET.me && NET.me.name ? NET.me.name : null, U = UPDATES[0];
  const nav = MAINNAV.map((n, i) => '<button class="mm-nav" data-act="' + n[0] + '" style="--i:' + i + '"><span class="mm-w">' + n[1] + '</span><span class="mm-d">' + n[2] + '</span></button>').join('');
  const ic = (act, key, label, badge) => '<button class="mm-ic" data-act="' + act + '" title="' + label + '" aria-label="' + label + '">' + MI[key] + '<span>' + label + '</span>' + (badge ? '<b>' + badge + '</b>' : '') + '</button>';
  return '<div class="mm" style="--pa:' + ac + '">' +
    '<header class="mm-top"><button class="mm-logo" data-act="tap" aria-label="Aetheria: Quantum Strike"><span class="mm-l1">Aetheria</span><span class="mm-l2">Quantum Strike</span></button>' +
      '<div class="mm-tr"><button class="mm-pill' + (online ? ' on' : '') + '" data-act="online"><i></i>' + (online ? escH(online) : 'Offline') + (online && inboxCount() ? '<b class="mm-ib">' + inboxCount() + '</b>' : '') + '</button><div class="mm-seg" role="group" aria-label="Players"><button data-act="players:1" class="' + (SAVE.players === 1 ? 'on' : '') + '">1P</button><button data-act="players:2" class="' + (SAVE.players === 2 ? 'on' : '') + '">2P</button></div></div></header>' +
    '<nav class="mm-main">' + nav + '</nav>' +
    '<div class="mm-row">' + ic('profile', 'profile', 'Profile') + ic('missions', 'missions', 'Missions', ms ? ms : '') + ic('daily', 'daily', 'Daily', dNew ? 'new' : '') + ic('boards', 'ranks', 'Leaderboards', typeof inboxCount === 'function' && inboxCount() ? '' : '') + ic('cos', 'cos', 'Cosmetics') + ic('settings', 'settings', 'Settings') + ic('tutorial', 'tutorial', 'Flight school') + ic('updates', 'updates', 'Updates') + ic('fs', fsOn ? 'fsx' : 'fs', fsOn ? 'Exit full screen' : 'Full screen') + '</div>' +
    '<aside class="mm-card"><div class="mm-who"><span class="mm-name">' + escH(online || 'Pilot') + '</span><span class="mm-rank">' + 'Level ' + X.lv + ' ' + rankName(X.lv) + '</span></div><div class="mm-xp"><i style="width:' + Math.round(X.xp / xpNeed(X.lv) * 100) + '%"></i></div>' +
      '<dl class="mm-stats"><div><dt>Cores</dt><dd class="gold">' + fmt(SAVE.cores) + '</dd></div><div><dt>Worlds</dt><dd>' + Math.min(SAVE.wu, WORLDS.length) + '/' + WORLDS.length + '</dd></div><div><dt>Kills</dt><dd>' + fmt(SAVE.st.kills) + '</dd></div></dl></aside>' +
    '<footer class="mm-foot"><button class="mm-news" data-act="updates"><b>' + U[0] + '</b> ' + escH(U[1]) + '</button><span class="mm-keys">' + (t ? '' : (SAVE.players === 2 ? ['P1: WASD + Space', 'P2: arrows + Enter'] : ['WASD or mouse to fly', 'Space or click to fire', 'Esc to pause']).map(k => '<span>' + k + '</span>').join('')) + '</span><button class="mm-cred" data-act="credits">' + dwEmblem('dw-sm') + '<b>Driftwire</b> Games</button></footer>' +
  '</div>';
};

// every screen picks up the pilot's accent colour
const _show2 = UI.show.bind(UI);
UI.show = function (id, nh) { try { const a = SAVE.pl[0].cfg.accent; if (a) document.body.style.setProperty('--pa', a); } catch (e) { } return _show2(id, nh); };

// ================= SCREEN LAYOUTS: full-screen versions of the main screens, in the main-menu style =================
// ---------- Select Mode: big typographic list on the left, the chosen mode's briefing on the right ----------
const modeHi = k => { const sk = dailyStreakNow(); return k === 'endless' ? (SAVE.hi.endless.score ? 'Best ' + fmt(SAVE.hi.endless.score) + ', wave ' + SAVE.hi.endless.wave : '') : k === 'blitz' ? (SAVE.hi.blitz.score ? 'Best ' + fmt(SAVE.hi.blitz.score) : '') : k === 'rush' ? (SAVE.hi.rush.time ? 'Best time ' + SAVE.hi.rush.time + 's' : 'Every boss you have unlocked') : k === 'daily' ? 'Today: ' + dailyInfo().mod.nm + (sk ? ', ' + sk + ' day streak' : '') : k === 'defense' ? (SAVE.hi.def.wave ? 'Best wave ' + SAVE.hi.def.wave : '') : k === 'nohit' ? (Object.keys(SAVE.hi.nohit).length ? Object.keys(SAVE.hi.nohit).length + ' worlds cleared' : '') : k === 'vault' ? (SAVE.hi.vault.clears ? 'Cracked ' + SAVE.hi.vault.clears + 'x' : '') : k === 'hardcore' ? ((SAVE.hi.hc || {}).wave ? 'Best wave ' + SAVE.hi.hc.wave : '') : k === 'expedition' ? Math.min(SAVE.wu, WORLDS.length) + ' of ' + WORLDS.length + ' worlds open' : ''; };
SCR.scModes = () => {
  const ks = Object.keys(MODES), sel = MODES[UI.msel] ? UI.msel : 'expedition', m = MODES[sel], lock = m.secret && !SAVE.unl[sel];
  const row = k => { const M = MODES[k], lk = M.secret && !SAVE.unl[k]; return '<button class="sm-row' + (k === sel ? ' on' : '') + (lk ? ' lk' : '') + '" data-act="msel:' + k + '"><span class="sm-ic">' + (lk ? ICO.lock : ICO[M.ic] || '') + '</span><span class="sm-nm">' + (lk ? '???' : M.nm) + '</span></button>'; };
  return '<div class="lay lay-modes"><header class="lay-h"><h1 class="lay-t">Select mode</h1><div class="mm-seg" role="group" aria-label="Players"><button data-act="players:1" class="' + (SAVE.players === 1 ? 'on' : '') + '">1P</button><button data-act="players:2" class="' + (SAVE.players === 2 ? 'on' : '') + '">2P co-op</button></div></header>' +
    '<div class="sm-cols"><nav class="sm-list"><div class="sm-grp">Main</div>' + ks.filter(k => !MODES[k].cat).map(row).join('') + '<div class="sm-grp">Challenges</div>' + ks.filter(k => MODES[k].cat).map(row).join('') + '</nav>' +
    '<section class="sm-brief"><span class="sm-big">' + (lock ? ICO.lock : ICO[m.ic] || '') + '</span><h2 class="sm-bt">' + (lock ? '???' : m.nm) + '</h2><p class="sm-bd">' + (lock ? (m.hint || 'Something is hidden here. Keep flying, and keep it clean.') : m.ds) + '</p>' + (!lock && modeHi(sel) ? '<p class="sm-hi">' + modeHi(sel) + '</p>' : '') + '<button class="btn big' + (lock ? ' off' : '') + '" data-act="mode:' + sel + '">' + (sel === 'expedition' || sel === 'endless' || sel === 'training' || sel === 'nohit' ? 'Choose world' : 'Start') + '</button></section></div>' +
    '<footer class="lay-f"><button class="btn sm" data-act="back">Back</button><span class="xs mut">' + (SAVE.players === 2 ? '2-player co-op is on' : 'Tip: switch to 2P co-op to bring a friend') + '</span></footer></div>';
};
ACT.msel = a => { if (UI.msel === a[0] && MODES[a[0]] && !(MODES[a[0]].secret && !SAVE.unl[a[0]])) { ACT.mode([a[0]]); return; } UI.msel = a[0]; SFX.click(); UI.refresh(); };

// ---------- Pause: the run on the right, big choices on the left ----------
SCR.scPause = () => {
  const R = G.run, tr = R && R.mode === 'training', dev = SAVE.dev || G.god, W = R ? WORLDS[R.w] : null;
  const it = (act, label, cls) => '<button class="mm-nav' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"><span class="mm-w">' + label + '</span></button>';
  return '<div class="lay lay-pause"><h1 class="lay-t">Paused</h1><nav class="mm-main ps-nav">' + it('resume', 'Resume', 'ps-first') + it('restart', 'Restart') + it('settings', 'Settings') + it('photo', 'Photo mode') + it('quit', 'Quit to menu', 'ps-quit') + '</nav>' +
    '<aside class="mm-card ps-run">' + (R ? '<div class="mm-who"><span class="mm-name">' + escH(objText(R)) + '</span></div><div class="xs mut" style="margin-top:4px">' + (W ? 'World ' + (R.w + 1) + ', ' + escH(W.nm) : '') + '</div><dl class="mm-stats" style="margin-top:12px"><div><dt>Score</dt><dd>' + fmt(Math.round(R.score)) + '</dd></div><div><dt>Kills</dt><dd>' + fmt(R.kills) + '</dd></div><div><dt>Cores</dt><dd class="gold">' + fmt(R.cores) + '</dd></div></dl>' : '') +
    '<div class="row" style="gap:6px;margin-top:12px;flex-wrap:wrap"><button class="btn sm" data-act="fs">' + (document.fullscreenElement ? 'Exit full screen' : 'Full screen') + '</button>' + (tr ? '<button class="btn sm" data-act="spawnboss">Spawn boss</button><button class="btn sm" data-act="nextworld">Next world</button>' : '') + (dev ? '<button class="btn sm gold" data-act="cheat:win">Dev: win</button><button class="btn sm gold" data-act="cheat:god">Dev: god</button>' : '') + '</div></aside></div>';
};

// ---------- Shop: categories down the left, one clean list on the right ----------
SCR.scShop = () => {
  const i = pi(), pl = SAVE.pl[i], cat = UI.shc === 'wpn' ? 'wpn' : 'up';
  const tabsP = SAVE.players === 2 ? '<div class="mm-seg">' + [0, 1].map(n => '<button data-act="ptab:' + n + '" class="' + (n === i ? 'on' : '') + '">P' + (n + 1) + '</button>').join('') + '</div>' : '';
  const rows = cat === 'up' ? Object.keys(UPG).map(k => { const U = UPG[k], lv = pl.up[k], mx = lv >= U.max, pr = upPrice(k, lv), can = SAVE.cores >= pr;
      return '<div class="sh-row"><span class="sh-ic">' + ICO[U.ic] + '</span><div class="sh-tx"><b>' + U.nm + '</b><span>' + U.ds + '</span><div class="sh-pips">' + Array.from({ length: U.max }, (_, n) => '<i class="' + (n < lv ? 'on' : '') + '"></i>').join('') + '</div></div><button class="btn' + (mx ? ' off' : can ? ' gold' : ' off') + '" data-act="buy:' + k + '">' + (mx ? 'Maxed' : fmt(pr)) + '</button></div>'; }).join('')
    : WORDER.map(id => { const w = WPN[id], own = pl.wown.indexOf(id) >= 0, eq = pl.wpn === id;
      return '<div class="sh-row"><span class="sh-ic" style="color:' + w.c + '">' + ICO.dmg + '</span><div class="sh-tx"><b style="color:' + w.c + '">' + wName(pl, id) + '</b><span>' + w.ds + '</span>' + (own ? wupHtml(pl, id) : '<span class="xs mut">Damage ' + w.d + ', ' + (60 / w.r).toFixed(1) + ' shots a second</span>') + '</div>' + (own ? '<button class="btn' + (eq ? ' on' : '') + '" data-act="wpn:' + id + '">' + (eq ? 'Equipped' : 'Equip') + '</button>' : '<button class="btn gold' + (SAVE.cores < w.price ? ' off' : '') + '" data-act="wpn:' + id + '">' + fmt(w.price) + '</button>') + '</div>'; }).join('');
  return '<div class="lay lay-shop"><header class="lay-h"><h1 class="lay-t">Shop</h1>' + tabsP + '<div class="sh-wallet"><span>Cores</span><b>' + fmt(SAVE.cores) + '</b></div></header>' +
    '<div class="sh-cols"><nav class="sh-rail"><button class="sh-cat' + (cat === 'up' ? ' on' : '') + '" data-act="shc:up"><span>Upgrades</span><small>Hull, shields, damage, speed</small></button><button class="sh-cat' + (cat === 'wpn' ? ' on' : '') + '" data-act="shc:wpn"><span>Weapons</span><small>Buy, equip and level up guns</small></button><button class="sh-cat" data-act="hangar"><span>Hangar</span><small>Ship parts and paint</small></button><button class="sh-cat" data-act="cos"><span>Cosmetics</span><small>Skins, trails, effects</small></button></nav>' +
    '<section class="sh-list">' + (cat === 'up' ? '<p class="xs mut" style="margin:0 0 8px">Each level costs more than the last. Prices are for the next level.</p>' : '') + rows + '</section></div>' +
    '<footer class="lay-f"><button class="btn sm" data-act="back">Back</button></footer></div>';
};
ACT.shc = a => { UI.shc = a[0]; SFX.click(); UI.refresh(); };

// ---------- screens rebuilt after they draw (their content logic stays where it is) ----------
const LAYOUTS = {
  scResult(el) {
    const c = el.querySelector('.card'); if (!c || c.classList.contains('rs')) return; c.classList.add('rs'); c.style.width = '';
    const tc = c.querySelector('.tc'), rowsBox = c.querySelector('.setrow') && c.querySelector('.setrow').parentElement, stack = c.querySelector('.stack');
    const hero = document.createElement('div'); hero.className = 'rs-hero'; const side = document.createElement('div'); side.className = 'rs-side';
    if (tc) { while (tc.firstChild) { const n = tc.firstChild; if (n === rowsBox || (n.querySelector && n.querySelector('.setrow'))) { side.appendChild(n); continue; } hero.appendChild(n); } tc.remove(); }
    if (rowsBox && !side.contains(rowsBox)) side.appendChild(rowsBox);
    c.querySelectorAll('.tipbox').forEach(t => hero.appendChild(t));
    c.prepend(side); c.prepend(hero); if (stack) { stack.classList.add('rs-act'); c.appendChild(stack); }
    const t = hero.querySelector('.title'); if (t) t.removeAttribute('style');
    if (UI.res) c.classList.add(UI.res.win ? 'rs-win' : 'rs-lose');
  },
  scSettings(el) {
    const c = el.querySelector('.card'); if (!c || c.classList.contains('st2')) return; c.classList.add('st2');
    const h = c.querySelector('h2'), tabs = c.querySelector('.tabs'), foot = c.lastElementChild; const rail = document.createElement('nav'), body = document.createElement('div'); rail.className = 'st-rail'; body.className = 'st-body';
    Array.from(c.children).forEach(n => { if (n === h || n === tabs) rail.appendChild(n); else if (n !== foot) body.appendChild(n); });
    if (tabs) tabs.classList.remove('wrap'); c.prepend(body); c.prepend(rail); if (foot) c.appendChild(foot);
  },
  scProfile(el) {
    const c = el.querySelector('.card'); if (!c || c.classList.contains('pf2')) return; c.classList.add('pf2');
    const ag = c.querySelector('.agrid'); if (!ag) return; const head = ag.previousElementSibling, foot = c.lastElementChild;
    const left = document.createElement('div'), right = document.createElement('div'); left.className = 'pf-left'; right.className = 'pf-right';
    Array.from(c.children).forEach(n => { if (n === ag || n === head) right.appendChild(n); else if (n !== foot) left.appendChild(n); });
    c.prepend(right); c.prepend(left); if (foot) c.appendChild(foot);
  },
  scHangar(el) {
    const c = el.querySelector('.hg>.card'); if (!c || c.classList.contains('hg2')) return; c.classList.add('hg2'); c.removeAttribute('style');
    const head = c.firstElementChild, tabs = c.querySelector('.tabs'), foot = c.lastElementChild; const rail = document.createElement('nav'), body = document.createElement('div'); rail.className = 'st-rail hg-rail'; body.className = 'st-body hg-body';
    Array.from(c.children).forEach(n => { if (n === head || n === tabs) rail.appendChild(n); else if (n !== foot) body.appendChild(n); });
    if (tabs) tabs.classList.remove('wrap'); c.prepend(body); c.prepend(rail); if (foot) c.appendChild(foot);
  },
  scMap(el) {
    const c = el.querySelector('.card'); if (!c || c.classList.contains('mp2')) return; c.classList.add('mp2');
    c.querySelectorAll('.tabs.wf .tab').forEach((t, i) => { t.title = t.textContent; t.innerHTML = '<b>' + (i + 1) + '</b>' + (t.classList.contains('lk') ? ICO.lock : ''); });
    const h = c.querySelector('h2'); if (h && WORLDS[UI.w]) c.style.setProperty('--wc', WORLDS[UI.w].ac);
  }
};
const _show3 = UI.show.bind(UI);
UI.show = function (id, nh) { const r = _show3(id, nh); try { if (LAYOUTS[id]) LAYOUTS[id](this.el(id)); } catch (e) { console.warn('layout', id, e); } return r; };

// ================= FLYING MAIN MENU + INTRO MOVIE =================
// MENU3 drives the 3D menu: your ship cruises through the furthest world you have reached, warping between unlocked worlds now and then.
const MENU3 = {
  w: 0, t: 0, warp: 0, nw: 0, swapped: true, ix: 1, hide: false, next: 1400, rollT: -1, sx: 0, sy: 0, seen: null, st: null,
  fly() { return SET.menu3d !== false && SET.bg3d !== false && !!SET.models && G.scene !== 'play' && (UI.top === 'scMenu' || INTRO.on); },
  maxW() { return Math.max(0, Math.min(SAVE.wu || 1, WORLDS.length) - 1); },
  tick(df) {
    if (this.seen !== SLOT || this.w > this.maxW() || this.wu !== SAVE.wu) { this.w = this.maxW(); this.seen = SLOT; this.wu = SAVE.wu; }
    this.t += df;
    if (this.warp > 0) { this.warp -= df; if (this.warp <= 24 && !this.swapped) { this.swapped = true; this.w = this.nw; } }
    else if (!INTRO.on && this.t > this.next) {
      this.next = this.t + 1500 + Math.random() * 700; const n = this.maxW() + 1;
      if (n > 1) { let k = Math.random() < .45 ? n - 1 : Math.floor(Math.random() * n); if (k === this.w) k = (k + 1 + Math.floor(Math.random() * (n - 1))) % n; this.nw = k; this.warp = 48; this.swapped = false; }
    }
    if (this.rollT < 0 && !INTRO.on && Math.random() < df / 1100) this.rollT = 0;
    if (this.rollT >= 0) { this.rollT += df; if (this.rollT > 64) this.rollT = -1; }
  },
  roll() { if (this.rollT < 0) return 0; const u = this.rollT / 64; return (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2) * Math.PI * 2; },
  ease() { const u = Math.max(0, Math.min(1, this.ix)); return 1 - Math.pow(1 - u, 3); }
};
// speed streaks and the warp flash, drawn on the effects canvas over the 3D menu
function menuFx(g) {
  if (!MENU3.fly() || !(R3 && R3.bgActive) || SET.reduce) return;
  const M = MENU3, W = V.W, H = V.H, wp = M.warp > 0 ? Math.sin(Math.min(1, (48 - M.warp) / 48) * Math.PI) : 0;
  if (!M.st) { M.st = []; for (let i = 0; i < 46; i++) M.st.push({ x: Math.random() * W, y: Math.random() * H, v: 6 + Math.random() * 14, l: 20 + Math.random() * 90, a: .04 + Math.random() * .1 }); }
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  const ac = (SAVE.pl[0].cfg.accent || '#22d3ee');
  for (const s of M.st) {
    const sp = s.v * (1 + wp * 9); s.x -= sp; if (s.x + s.l * (1 + wp * 6) < 0) { s.x = W + Math.random() * 200; s.y = Math.random() * H; }
    const L = s.l * (1 + wp * 6); g.strokeStyle = wp > .05 ? 'rgba(220,240,255,' + Math.min(.7, s.a + wp * .5) + ')' : 'rgba(200,225,255,' + s.a + ')'; g.lineWidth = 1 + wp * 1.5;
    g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x + L, s.y); g.stroke();
  }
  if (wp > 0) { // tunnel glow + white-out at the middle of the jump
    const gr = g.createRadialGradient(M.sx || W * .6, M.sy || H * .5, 10, M.sx || W * .6, M.sy || H * .5, Math.max(W, H) * .8);
    gr.addColorStop(0, rgba(ac, .35 * wp)); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const f = M.warp > 14 && M.warp < 34 ? 1 - Math.abs(M.warp - 24) / 10 : 0; if (f > 0) { g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(255,255,255,' + f * .85 + ')'; g.fillRect(0, 0, W, H); }
  }
  g.restore();
}

// ---------- intro movie: warp tunnel, drop into your world, title slam ----------
const INTRO = { on: false };
function introPlay() {
  if (INTRO.on) return; INTRO.on = true;
  const ac = SAVE.pl[0].cfg.accent || '#22d3ee', d = document.createElement('div'); d.id = 'intro'; d.style.setProperty('--pa', ac);
  d.innerHTML = '<canvas></canvas><div class="in-pre">' + dwLogo('dw-in') + '<div class="in-pres">presents</div></div><div class="in-t"><div class="in-l1">' + 'AETHERIA'.split('').map((c, i) => '<span style="--i:' + i + '">' + c + '</span>').join('') + '</div><div class="in-l2">Quantum Strike</div></div><div class="in-skip">Press any key to skip</div>';
  document.body.appendChild(d); document.body.classList.add('intro');
  const cv = d.querySelector('canvas'), g = cv.getContext('2d'), S = [];
  for (let i = 0; i < 520; i++) S.push({ a: Math.random() * Math.PI * 2, z: Math.random(), c: Math.random() < .25 });
  let t0 = performance.now(), last = 0, done = false, cls = {}, shockT = -1;
  MENU3.hide = true; MENU3.ix = 0;
  const T_FLASH = 3600, T_TITLE = 4200, T_SUB = 5050, T_OUT = 7800, T_END = 8800;
  const add = c => { if (!cls[c]) { cls[c] = 1; d.classList.add(c); } };
  const skip = e => { if (e) { e.preventDefault(); e.stopPropagation(); } const t = performance.now() - t0; if (t < T_OUT) t0 = performance.now() - T_OUT; };
  const kd = e => skip(e); window.addEventListener('keydown', kd, true); d.addEventListener('pointerdown', skip);
  function end() { if (done) return; done = true; window.removeEventListener('keydown', kd, true); d.remove(); INTRO.on = false; MENU3.hide = false; MENU3.ix = 1; }
  function loop(now) {
    if (done) return; const t = window.__introT != null ? window.__introT : now - t0, dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); const dt = Math.min(50, t - last) / 16.7; last = t;
    try { const gp = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of gp) if (p && p.buttons.some(b => b.pressed) && t > 400) skip(); } catch (e) { }
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) * .55;
    if (t < T_FLASH) { // warp tunnel
      const u = t / T_FLASH, sp = .002 + Math.pow(u, 3) * .05;
      g.fillStyle = 'rgba(2,4,10,' + (.35 + (1 - u) * .4) + ')'; g.fillRect(0, 0, W, H);
      const neb = g.createRadialGradient(cx, cy, 0, cx, cy, R); neb.addColorStop(0, rgba(ac, .1 + u * .25)); neb.addColorStop(.5, 'rgba(76,29,149,' + (.05 + u * .12) + ')'); neb.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = neb; g.fillRect(0, 0, W, H);
      g.lineCap = 'round';
      for (const s of S) {
        const z0 = s.z; s.z -= sp * dt * (.6 + s.z); if (s.z <= .02) { s.z = 1; s.a = Math.random() * Math.PI * 2; continue; }
        const r0 = .06 / z0 * R, r1 = .06 / s.z * R, ca = Math.cos(s.a), sa = Math.sin(s.a), al = Math.min(1, (1 - s.z) * 1.6);
        g.strokeStyle = s.c ? rgba(ac, al) : 'rgba(235,245,255,' + al + ')'; g.lineWidth = Math.max(.6, (1 - s.z) * 2.6);
        g.beginPath(); g.moveTo(cx + ca * r0, cy + sa * r0); g.lineTo(cx + ca * (r1 + u * u * 40), cy + sa * (r1 + u * u * 40)); g.stroke();
      }
      if (u > .82) { g.fillStyle = 'rgba(255,255,255,' + Math.pow((u - .82) / .18, 2) + ')'; g.fillRect(0, 0, W, H); }
    } else { // out of warp: the world and your ship show through
      add('clear'); MENU3.hide = false; MENU3.ix = Math.min(1, (t - T_FLASH) / 1900);
      g.clearRect(0, 0, W, H); const f = Math.max(0, 1 - (t - T_FLASH) / 700); if (f > 0) { g.fillStyle = 'rgba(255,255,255,' + f + ')'; g.fillRect(0, 0, W, H); }
      if (t >= T_TITLE) add('title');
      if (t >= T_SUB) { add('sub'); if (shockT < 0) shockT = t; }
      if (shockT >= 0 && t - shockT < 900) { const k = (t - shockT) / 900; g.strokeStyle = rgba(ac, .7 * (1 - k)); g.lineWidth = 6 * (1 - k) + 1; g.beginPath(); g.ellipse(cx, cy, k * W * .7, k * W * .16, 0, 0, Math.PI * 2); g.stroke(); g.fillStyle = 'rgba(255,255,255,' + .25 * (1 - k) * (1 - k) + ')'; g.fillRect(0, 0, W, H); }
      if (t >= T_OUT) { add('out'); if (document.body.classList.contains('intro')) { document.body.classList.remove('intro'); document.body.classList.add('introfade'); setTimeout(() => document.body.classList.remove('introfade'), 1200); } }
      if (t >= T_END) return end();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// ================= ONLINE 2: leaderboards, cloud saves, challenge inbox =================
const LB = [
  ['pilot', 'Pilot XP', 'Total pilot XP ever earned'],
  ['endless', 'Endless', 'Best score in Endless'],
  ['blitz', 'Blitz', 'Best score in a 90-second Blitz'],
  ['rush', 'Boss Rush', 'Best score in Boss Rush'],
  ['hardcore', 'Hardcore', 'Best score in one-life Hardcore'],
  ['defense', 'Station Defense', 'Best score defending the station'],
  ['daily', 'Today\'s Daily', 'Best score on today\'s Daily Challenge']
];
let lbKey = b => b === 'daily' ? 'daily_' + dayKey().replace(/[^0-9a-z_-]/gi, '') : b;
const N2 = { lb: {}, lbFr: {}, lbView: 'global', lbB: 'endless', lbLoading: false, inbox: {}, cloud: undefined, cloudBusy: false, msg: '', live: false };
const netOn = () => !!(NET.ok && NET.ready && NET.user && NET.me && NET.me.name);
function n2Msg(m) { N2.msg = m || ''; if (['scBoards', 'scCloud', 'scInbox', 'scChSend'].includes(UI.top)) UI.refresh(); }

// ---------- leaderboards ----------
function lbSubmit(b, s) {
  s = Math.round(s || 0); if (!netOn() || !(s > 0) || s >= 1e8) return Promise.resolve(false);
  const best = SAVE.lbb || (SAVE.lbb = {}), k = lbKey(b); if ((best[k] || 0) >= s) return Promise.resolve(false); best[k] = s; saveGame();
  const row = { n: NET.me.name, s, lv: PS().xp.lv, hull: SAVE.pl[0].cfg.hull, at: TS() };
  return R_('lb/' + k + '/' + NET.user.uid).transaction(cur => (!cur || !(cur.s >= s)) ? row : undefined).then(() => { delete N2.lb[k]; return true; }).catch(e => { delete best[k]; console.warn('lb', e); return false; });
}
function lbSyncAll() { // push local bests once you sign in, so the boards are never empty
  if (!netOn()) return; const H = SAVE.hi || {};
  lbSubmit('pilot', PS().xp.tot || 0); lbSubmit('endless', H.endless && H.endless.score); lbSubmit('blitz', H.blitz && H.blitz.score); lbSubmit('defense', H.def && H.def.score);
  const dl = SAVE.dl && SAVE.dl.best && SAVE.dl.best[dayKey()]; if (dl) lbSubmit('daily', typeof dl === 'object' ? dl.score : dl);
}
function lbAfterRun(d) {
  if (!d || G.net || d.online || d.assist) return; const m = d.mode;
  if (['endless', 'blitz', 'rush', 'hardcore', 'defense', 'daily'].includes(m)) lbSubmit(m, d.score);
  lbSubmit('pilot', PS().xp.tot || 0);
}
async function lbLoad(b, force) {
  const k = lbKey(b); if (!netOn()) return;
  if (N2.lbView === 'global') {
    if (N2.lb[k] && !force) return; N2.lbLoading = true; n2Msg('');
    try { const sn = await R_('lb/' + k).orderByChild('s').limitToLast(50).once('value'), out = []; sn.forEach(c => { const v = c.val(); if (v && typeof v.s === 'number') out.push(Object.assign({ uid: c.key }, v)); }); out.sort((a, z) => z.s - a.s); N2.lb[k] = out; }
    catch (e) { n2Msg('!Could not load the leaderboard (' + (e.code || e.message) + '). Make sure the newest security rules are published in Firebase.'); }
  } else {
    N2.lbLoading = true; const ids = [NET.user.uid].concat(Object.keys(NET.friends || {})), out = [];
    try { await Promise.all(ids.map(u => R_('lb/' + k + '/' + u).once('value').then(s => { const v = s.val(); if (v && typeof v.s === 'number') out.push(Object.assign({ uid: u }, v)); }))); out.sort((a, z) => z.s - a.s); N2.lbFr[k] = out; }
    catch (e) { n2Msg('!Could not load your friends\' scores (' + (e.code || e.message) + ').'); }
  }
  N2.lbLoading = false; if (UI.top === 'scBoards') UI.refresh();
}
let lbFmt = (b, s) => b === 'pilot' ? fmt(s) + ' XP' : fmt(s);

// ---------- cloud save ----------
const saveSum = s => { s = s || SAVE; const x = s.xp || { lv: 1 }; return { wu: Math.min(s.wu || 1, WORLDS.length), lv: x.lv || 1, cores: s.cores | 0, kills: (s.st && s.st.kills) | 0 }; };
async function cloudPeek() {
  if (!netOn()) return; try { const s = await R_('saves/' + NET.user.uid).once('value'); const v = s.val(); N2.cloud = v ? { at: v.at, ver: v.ver, sum: v.sum || {}, size: (v.d || '').length } : null; } catch (e) { N2.cloud = undefined; n2Msg('!Could not check your cloud save (' + (e.code || e.message) + ').'); }
  if (UI.top === 'scCloud') UI.refresh();
}
async function cloudUp(quiet) {
  if (!netOn() || N2.cloudBusy) return; N2.cloudBusy = true; if (!quiet) n2Msg('Uploading...');
  try { saveGame(); const d = exportCode(SLOT), sum = saveSum(); await R_('saves/' + NET.user.uid).set({ d, ver: GAME_VER, sum, at: TS() }); SAVE.cloudAt = Date.now(); store.set(SAVE_KEY, JSON.stringify(SAVE)); N2.cloud = { at: Date.now(), ver: GAME_VER, sum, size: d.length }; if (!quiet) n2Msg('Saved to the cloud!'); }
  catch (e) { if (!quiet) n2Msg('!Upload failed (' + (e.code || e.message) + ').'); }
  N2.cloudBusy = false; if (UI.top === 'scCloud') UI.refresh();
}
async function cloudDown() {
  if (!netOn() || N2.cloudBusy) return; N2.cloudBusy = true; n2Msg('Downloading...');
  try { const s = await R_('saves/' + NET.user.uid).once('value'), v = s.val(); if (!v || !v.d) { n2Msg('!There is no cloud save yet.'); }
    else { const err = importCode(v.d, SLOT); if (err) n2Msg('!' + err); else { SAVE.cloudAt = v.at || Date.now(); saveGame(); n2Msg('Cloud save loaded into slot ' + (SLOT + 1) + '!'); } } }
  catch (e) { n2Msg('!Download failed (' + (e.code || e.message) + ').'); }
  N2.cloudBusy = false; N2.cloudSure = false; if (UI.top === 'scCloud') UI.refresh();
}
let cloudT = 0;
function cloudAuto() { if (SET.cloudAuto === false || !netOn()) return; const now = Date.now(); if (now - cloudT < 90000) return; cloudT = now; cloudUp(true); }

// ---------- challenge inbox ----------
function inboxStart() {
  if (N2.live || !netOn()) return; N2.live = true;
  netSub(R_('inbox/' + NET.user.uid), 'value', s => { N2.inbox = s.val() || {}; const n = inboxCount(); if (n > (N2.lastN || 0) && N2.lastN !== undefined && G.scene !== 'play') toast('NEW IN YOUR INBOX', n + ' message' + (n > 1 ? 's' : ''), '#22d3ee'); N2.lastN = n; if (['scInbox', 'scOnline', 'scMenu'].includes(UI.top)) UI.refresh(); });
}
const inboxList = () => Object.keys(N2.inbox || {}).map(k => Object.assign({ id: k }, N2.inbox[k])).filter(m => m && m.f && !NET.blocked[m.f]).sort((a, z) => (z.at || 0) - (a.at || 0));
const inboxCount = () => inboxList().length;
function chSend(uid, code, s) {
  if (!netOn()) return Promise.reject(new Error('Sign in first'));
  return R_('inbox/' + uid).push({ t: 'ch', f: NET.user.uid, n: NET.me.name, c: String(code).slice(0, 40), s: Math.round(s || 0), at: TS() });
}
function chPlayInbox(id) {
  const m = (N2.inbox || {})[id]; if (!m) return; const c = chParse(m.c); if (!c) { n2Msg('!That challenge code is broken.'); return; }
  if (c.w >= SAVE.wu) { n2Msg('!You need to unlock World ' + (c.w + 1) + ' to play this one.'); return; }
  c.from = { uid: m.f, name: m.n, id, s: m.s }; startChallenge(c);
}
function chReplyAfter(d) { // tell the friend how you did, and clear the challenge
  const c = d && d.chal; if (!c || !c.from || !netOn()) return; const f = c.from;
  R_('inbox/' + f.uid).push({ t: 'res', f: NET.user.uid, n: NET.me.name, c: c.code || '', s: Math.round(d.score || 0), y: f.s | 0, at: TS() }).catch(() => { });
  R_('inbox/' + NET.user.uid + '/' + f.id).remove().catch(() => { }); c.from = null;
}

// ---------- hooks ----------
const _nStartLive = netStartLive;
netStartLive = function () { const r = _nStartLive.apply(this, arguments); try { inboxStart(); lbSyncAll(); cloudPeek().then(() => { const c = N2.cloud, mine = saveSum(); if (c && c.sum && (c.sum.wu > mine.wu || c.sum.lv > mine.lv) && !SAVE.cloudAt) toast('CLOUD SAVE FOUND', 'Online > Cloud Save to load it', '#fbbf24'); }); } catch (e) { console.warn('online2', e); } return r; };
const _nSignOut = netSignOut;
netSignOut = function () { N2.live = false; N2.inbox = {}; N2.lb = {}; N2.lbFr = {}; N2.cloud = undefined; N2.lastN = undefined; return _nSignOut.apply(this, arguments); };
const _uiRes = UI.result.bind(UI);
UI.result = function (d) { const r = _uiRes(d); try { lbAfterRun(d); chReplyAfter(d); cloudAuto(); } catch (e) { console.warn('online2 result', e); } return r; };

// ---------- screens ----------
const n2m = () => N2.msg ? '<div class="xs ' + (N2.msg[0] === '!' ? 'bad' : 'good') + '" style="margin:6px 0">' + escH(N2.msg.replace(/^!/, '')) + '</div>' : '';
const n2Gate = t => { if (!NET.ok) return '<div class="card mid"><h2>' + t + '</h2><p class="mut sm" style="line-height:1.7;margin:10px 0">This needs the online version of Aetheria on the website (Google sign-in cannot open inside this window).</p><div class="item"><b class="acc">' + WEB_URL + '</b><button class="btn sm" data-act="copycode:' + WEB_URL + '">COPY LINK</button></div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button></div></div>'; if (!netOn()) return '<div class="card mid"><h2>' + t + '</h2><p class="mut sm" style="margin:10px 0">Sign in on the Online screen first.</p><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn gold" data-act="online">GO ONLINE</button></div></div>'; return null; };
Object.assign(SCR, {
  scBoards: () => {
    const g = n2Gate('Leaderboards'); if (g) return g;
    const b = N2.lbB, k = lbKey(b), glob = N2.lbView === 'global', rows = (glob ? N2.lb[k] : N2.lbFr[k]), me = NET.user.uid, B = LB.find(x => x[0] === b) || LB[0];
    if (!rows && !N2.lbLoading) setTimeout(() => lbLoad(b), 0);
    const mine = rows ? rows.findIndex(r => r.uid === me) : -1, myBest = (SAVE.lbb || {})[k] || 0;
    const list = !rows ? '<div class="mut sm" style="padding:24px 4px">Loading...</div>' : !rows.length ? '<div class="mut sm" style="padding:24px 4px">No scores yet. Be the first!</div>' : rows.map((r, i) => '<div class="lbrow' + (r.uid === me ? ' me' : '') + (i < 3 ? ' top' + (i + 1) : '') + '"><span class="lbr">' + (i + 1) + '</span><span class="lbn">' + escH(r.n || '?') + '<span class="xs mut"> LV ' + (r.lv | 0 || 1) + '</span></span><span class="lbs">' + lbFmt(b, r.s) + '</span></div>').join('');
    return '<div class="lay lay-modes lb2"><header class="lay-h"><h1 class="lay-t">Leaderboards</h1><div class="mm-seg" role="group" aria-label="Scope"><button data-act="lbv:global" class="' + (glob ? 'on' : '') + '">Global</button><button data-act="lbv:friends" class="' + (glob ? '' : 'on') + '">Friends</button></div></header>' +
      '<div class="sm-cols"><nav class="sm-list">' + LB.map(x => '<button class="sm-row' + (x[0] === b ? ' on' : '') + '" data-act="lbb:' + x[0] + '"><span class="sm-nm">' + x[1] + '</span></button>').join('') + '</nav>' +
      '<section class="sm-brief lbmain"><h2 class="sm-bt">' + B[1] + '</h2><p class="sm-bd" style="margin-bottom:8px">' + B[2] + (b === 'daily' ? ' (' + dayKey() + ')' : '') + '</p>' + n2m() + '<div class="lblist">' + list + '</div>' +
      '<p class="xs mut" style="margin-top:10px">' + (mine >= 0 ? 'You are #' + (mine + 1) + (glob ? ' in the world' : ' among your friends') : myBest ? 'Your best: ' + lbFmt(b, myBest) + (glob ? ' - not in the top 50 yet' : '') : 'Play this mode to get on the board') + '</p></section></div>' +
      '<footer class="lay-f"><button class="btn sm" data-act="back">Back</button><button class="btn sm" data-act="lbre">Refresh</button></footer></div>';
  },
  scCloud: () => {
    const g = n2Gate('Cloud Save'); if (g) return g;
    if (N2.cloud === undefined && !N2.cloudBusy) setTimeout(cloudPeek, 0);
    const c = N2.cloud, m = saveSum(), d = t => t ? new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-';
    const box = (t, s, sub) => '<div class="item cl-box"><div class="fl"><div class="xs mut b nh" style="margin:0">' + t + '</div>' + (s ? '<div class="cl-st"><span><b>' + s.wu + '</b>/' + WORLDS.length + ' worlds</span><span>LV <b>' + s.lv + '</b></span><span><b class="gold">' + fmt(s.cores) + '</b> cores</span></div>' : '<div class="mut sm" style="margin-top:6px">' + (c === undefined ? 'Checking...' : 'Nothing saved yet') + '</div>') + '<div class="xs mut">' + sub + '</div></div></div>';
    return '<div class="card mid"><h2>Cloud Save</h2><p class="mut sm" style="margin:6px 0 10px">Keep your progress safe in your account and carry it to any computer: sign in there and press DOWNLOAD.</p>' + n2m() +
      '<div class="grid2">' + box('THIS DEVICE - SLOT ' + (SLOT + 1), m, SAVE.cloudAt ? 'Last synced ' + d(SAVE.cloudAt) : 'Never synced') + box('IN THE CLOUD', c && c.sum, c ? 'Saved ' + d(c.at) + ' (' + escH(c.ver || '') + ')' : '') + '</div>' +
      '<div class="grid2" style="margin-top:10px"><button class="btn gold' + (N2.cloudBusy ? ' off' : '') + '" data-act="clup">UPLOAD THIS DEVICE</button><button class="btn' + (N2.cloudBusy || !c ? ' off' : '') + (N2.cloudSure ? ' warn' : '') + '" data-act="cldown">' + (N2.cloudSure ? 'PRESS AGAIN TO REPLACE SLOT ' + (SLOT + 1) : 'DOWNLOAD TO THIS DEVICE') + '</button></div>' +
      '<div class="setrow" style="margin-top:12px"><span>Auto-backup after each run</span><button class="tog' + (SET.cloudAuto !== false ? ' on' : '') + '" data-act="clauto"></button></div>' +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><span class="xs mut">Downloading replaces the save in slot ' + (SLOT + 1) + '</span></div></div>';
  },
  scInbox: () => {
    const g = n2Gate('Inbox'); if (g) return g; const L = inboxList();
    const it = m => m.t === 'res'
      ? '<div class="item"><div class="fl"><div class="b sm">' + escH(m.n) + ' played your challenge</div><div class="xs ' + (m.s > m.y ? 'bad' : 'good') + '">They scored ' + fmt(m.s) + ' - you set ' + fmt(m.y) + (m.s > m.y ? '. They beat you!' : '. You are still the champ!') + '</div></div><span class="row" style="gap:6px">' + (m.s > m.y ? '<button class="btn sm gold" data-act="ibrevenge:' + m.id + '">REVENGE</button>' : '') + '<button class="btn sm" data-act="ibdel:' + m.id + '">OK</button></span></div>'
      : (() => { const c = chParse(m.c) || {}; return '<div class="item"><div class="fl"><div class="b sm"><span class="acc">' + escH(m.n) + '</span> challenged you</div><div class="xs mut">' + (c.w >= 0 ? 'World ' + (c.w + 1) + ' sector ' + (c.lv + 1) + ' - ' : '') + 'beat <b class="gold">' + fmt(m.s) + '</b></div></div><span class="row" style="gap:6px"><button class="btn sm gold" data-act="ibplay:' + m.id + '">PLAY</button><button class="btn sm" data-act="ibdel:' + m.id + '">X</button></span></div>'; })();
    return '<div class="card mid"><div class="row sp"><h2>Inbox</h2><span class="xs mut">' + L.length + ' message' + (L.length === 1 ? '' : 's') + '</span></div><p class="mut sm" style="margin:6px 0 10px">Friends send you challenge codes here. Beat their score and they find out!</p>' + n2m() +
      '<div class="stack" style="gap:6px">' + (L.length ? L.map(it).join('') : '<div class="mut sm" style="padding:18px 4px">Nothing here yet. Finish a challenge or press SEND on the Challenge screen to dare a friend.</div>') + '</div>' +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm" data-act="mode:chal">NEW CHALLENGE</button></div></div>';
  },
  scChSend: () => {
    const g = n2Gate('Send a Challenge'); if (g) return g; const S = UI.chSend || {}, fr = Object.keys(NET.friends || {});
    return '<div class="card mid"><h2>Send a Challenge</h2><div class="xs mut" style="margin:4px 0 10px">Code <b class="acc">' + escH(S.code || '') + '</b> - they need to beat <b class="gold">' + fmt(S.s || 0) + '</b></div>' + n2m() +
      '<div class="stack" style="gap:6px">' + (fr.length ? fr.map(u => { const f = NET.fdata[u] || {}, sent = (UI.chSent || {})[u]; return '<div class="item"><div class="fl b sm">' + escH(f.name || '...') + '</div><button class="btn sm' + (sent ? ' off' : ' gold') + '" data-act="chsend:' + u + '">' + (sent ? 'SENT' : 'SEND') + '</button></div>'; }).join('') : '<div class="mut sm">Add friends on the Online screen first.</div>') + '</div>' +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">DONE</button></div></div>';
  }
});
Object.assign(ACT, {
  boards() { N2.msg = ''; UI.show('scBoards'); },
  lbb(a) { N2.lbB = a[0]; N2.msg = ''; UI.refresh(); },
  lbv(a) { N2.lbView = a[0]; UI.refresh(); },
  lbre() { const k = lbKey(N2.lbB); delete N2.lb[k]; delete N2.lbFr[k]; lbLoad(N2.lbB, true); UI.refresh(); },
  cloud() { N2.msg = ''; N2.cloudSure = false; UI.show('scCloud'); },
  clup() { cloudUp(); },
  cldown() { if (!N2.cloud) return; if (!N2.cloudSure) { N2.cloudSure = true; UI.refresh(); return; } cloudDown(); },
  clauto() { SET.cloudAuto = SET.cloudAuto === false; saveSet(); UI.refresh(); },
  inbox() { N2.msg = ''; UI.show('scInbox'); },
  ibplay(a) { chPlayInbox(a[0]); },
  ibdel(a) { if (netOn()) R_('inbox/' + NET.user.uid + '/' + a[0]).remove().catch(() => { }); },
  ibrevenge(a) { const m = (N2.inbox || {})[a[0]]; if (!m) return; const c = chParse(m.c); R_('inbox/' + NET.user.uid + '/' + a[0]).remove().catch(() => { }); if (c && c.w < SAVE.wu) { c.target = m.s; startChallenge(c); } },
  chsendto(a) { UI.chSend = { code: a[0], s: +a[1] || 0 }; UI.chSent = {}; N2.msg = ''; UI.show('scChSend'); },
  chsend(a) { const S = UI.chSend || {}; if ((UI.chSent || {})[a[0]]) return; chSend(a[0], S.code, S.s).then(() => { (UI.chSent = UI.chSent || {})[a[0]] = 1; SFX.click && SFX.click(); n2Msg('Challenge sent!'); }).catch(e => n2Msg('!Could not send (' + (e.code || e.message) + ').')); }
});

// ---------- ranked versus: tiers + monthly seasons ----------
const RKT = [[0, 'Bronze', '#d08a4f'], [1100, 'Silver', '#cbd5e1'], [1250, 'Gold', '#fbbf24'], [1400, 'Platinum', '#5eead4'], [1550, 'Diamond', '#a78bfa'], [1700, 'Ace', '#fb7185']];
function rkTier(r) { let i = 0; RKT.forEach((x, k) => { if (r >= x[0]) i = k; }); const t = RKT[i], nx = RKT[i + 1]; return { i, nm: t[1], c: t[2], lo: t[0], next: nx ? nx[0] : null }; }
const rkSeason = () => { const d = new Date(); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
const rkDaysLeft = () => { const d = new Date(), e = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); return Math.max(1, Math.ceil((e - d.getTime()) / 864e5)); };
const rkBadge = (r, big) => { const t = rkTier(r); return '<i class="rkb' + (big ? ' big' : '') + '" style="--rc:' + t.c + '"><svg viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>' + (t.i >= 3 ? '<path d="M8 11l4-3 4 3M8 15l4-3 4 3"/>' : t.i >= 1 ? '<path d="M8 13l4-3 4 3"/>' : '') + '</svg></i>'; };
async function rkLoad() {
  if (!netOn()) return; const S = rkSeason();
  try { const s = await R_('rank/' + S + '/' + NET.user.uid).once('value'), v = s.val(); N2.rk = v && typeof v.r === 'number' ? { r: v.r, w: v.w | 0, l: v.l | 0 } : { r: 1000, w: 0, l: 0 }; } catch (e) { N2.rk = N2.rk || { r: 1000, w: 0, l: 0 }; }
  const L = SAVE.rkLast; if (L && L.s !== S && !SAVE.rkPaid) { SAVE.rkPaid = {}; } if (L && L.s !== S && !(SAVE.rkPaid || {})[L.s]) { const t = rkTier(L.r), c = 250 * (t.i + 1); (SAVE.rkPaid = SAVE.rkPaid || {})[L.s] = 1; SAVE.cores += c; saveGame(); toast('SEASON ' + L.s + ' REWARD', 'You finished ' + t.nm + ' - +' + fmt(c) + ' cores', t.c); }
  if (UI.top === 'scRanked') UI.refresh();
}
function rkMatchStart() {
  const me = G.netMe | 0, opp = me === 0 ? 1 : 0, uid = (G.netUids || [])[opp]; N2.rkOpp = { uid, r: 1000 }; NET.rkPending = true; rkLoad();
  if (uid) R_('rank/' + rkSeason() + '/' + uid).once('value').then(s => { const v = s.val(); if (v && typeof v.r === 'number') N2.rkOpp.r = v.r; }).catch(() => { });
}
function rkAfter(d) {
  if (!NET.rkPending || !d || !d.vs || !netOn()) return; NET.rkPending = false;
  const me = G.netMe | 0, my = d.vs[me] || 0, op = d.vs[me ? 0 : 1] || 0, res = my > op ? 1 : my < op ? 0 : .5, cur = N2.rk || { r: 1000, w: 0, l: 0 };
  const R0 = cur.r, E = 1 / (1 + Math.pow(10, ((N2.rkOpp ? N2.rkOpp.r : 1000) - R0) / 400)), K = cur.w + cur.l < 10 ? 48 : 32, r1 = Math.max(0, Math.min(4999, Math.round(R0 + K * (res - E))));
  N2.rk = { r: r1, w: cur.w + (res === 1 ? 1 : 0), l: cur.l + (res === 0 ? 1 : 0) }; d.rk = { r0: R0, r1 }; const t0 = rkTier(R0), t1 = rkTier(r1); if (t1.i !== t0.i) d.rkTier = t1.i > t0.i ? 'up' : 'down';
  const S = rkSeason(); SAVE.rkLast = { s: S, r: r1 }; saveGame();
  R_('rank/' + S + '/' + NET.user.uid).set({ r: r1, w: N2.rk.w, l: N2.rk.l, n: NET.me.name, at: TS() }).catch(e => console.warn('rank', e));
  R_('lb/ranked_' + S.replace('-', '') + '/' + NET.user.uid).set({ n: NET.me.name, s: r1, lv: PS().xp.lv, hull: SAVE.pl[0].cfg.hull, at: TS() }).catch(() => { });
  if (d.rkTier) setTimeout(() => toast(d.rkTier === 'up' ? 'PROMOTED!' : 'DEMOTED', 'You are now ' + t1.nm, t1.c), 600);
}
LB.splice(1, 0, ['ranked', 'Ranked Season', 'Ranked versus rating this season (resets every month)']);
const _lbKey0 = lbKey; lbKey = b => b === 'ranked' ? 'ranked_' + rkSeason().replace('-', '') : _lbKey0(b);
const _lbFmt0 = lbFmt; lbFmt = (b, s) => b === 'ranked' ? rkBadge(s) + ' ' + fmt(s) : _lbFmt0(b, s);
const _uiRes2 = UI.result; UI.result = function (d) { try { rkAfter(d); } catch (e) { console.warn('rank result', e); } return _uiRes2.apply(this, arguments); };
SCR.scRanked = () => {
  const g = n2Gate('Ranked'); if (g) return g; if (!N2.rk) setTimeout(rkLoad, 0);
  const k = N2.rk || { r: 1000, w: 0, l: 0 }, t = rkTier(k.r), lo = t.i ? t.lo : 850, pc = t.next ? clamp(Math.round((k.r - lo) / (t.next - lo) * 100), 0, 100) : 100, gp = k.w + k.l;
  return '<div class="card mid rk2" style="--rc:' + t.c + '"><div class="row sp"><h2>Ranked</h2><span class="xs mut">Season ' + rkSeason() + ' - ends in ' + rkDaysLeft() + ' day' + (rkDaysLeft() > 1 ? 's' : '') + '</span></div>' + n2m() +
    '<div class="rk-hero">' + rkBadge(k.r, true) + '<div><div class="rk-tier">' + t.nm + '</div><div class="rk-r">' + fmt(k.r) + ' <span class="xs mut">rating</span></div><div class="rk-bar"><i style="width:' + pc + '%"></i></div><div class="xs mut">' + (t.next ? (t.next - k.r) + ' to ' + rkTier(t.next).nm : 'Top tier!') + ' - ' + k.w + ' wins, ' + k.l + ' losses' + (gp < 10 ? ' - ' + (10 - gp) + ' placement matches left (bigger swings)' : '') + '</div></div></div>' +
    '<div class="rk-tiers">' + RKT.map((x, i) => '<b class="rkt' + (i === t.i ? ' on' : '') + '" style="--rc:' + x[2] + '">' + rkBadge(x[0]) + x[1] + '</b>').join('') + '</div>' +
    '<p class="xs mut" style="line-height:1.6;margin:8px 0">One versus one, two minutes, most points wins. Beat higher-rated pilots for bigger gains. At the end of each month you get cores for the tier you reached: from 250 (Bronze) to 1,500 (Ace).</p>' +
    '<div class="grid2"><button class="btn big gold" data-act="nquick:rk">FIND RANKED MATCH</button><button class="btn" data-act="rkboard">SEASON LEADERBOARD</button></div>' +
    '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button></div></div>';
};
Object.assign(ACT, { ranked() { N2.msg = ''; UI.show('scRanked'); }, rkboard() { N2.lbB = 'ranked'; N2.lbView = 'global'; UI.show('scBoards'); } });

// ================= BOOT =================
function boot() {
  layout(); initInput(); initUI();
  try { if (window.THREE) { R3 = init3D(); layout(); R3.setView('menu'); } } catch (e) { console.error('3D init failed, using 2D fallback:', e); R3 = null; }
  buildBackdrop(0);
  G.scene = 'ui'; UI.show(SAVE.tut ? 'scMenu' : 'scTut');
  try { if ((SET.intro !== false && !navigator.webdriver) || window.__intro) introPlay(); } catch (e) { console.warn('intro', e); INTRO.on = false; }
  requestAnimationFrame(frame);
}
window.AET = {
  G, SET, V, UI, ACT, IN, update, render, beginRun, finishRun, spawnBoss, mkEnemy, killEnemy, hurt, fireP, layout, exitToMenu, startLevel, startMode,
  get SAVE() { return SAVE; }, get R3() { return R3; }, get ok3d() { return !!(R3 && R3.on); },
  step(n) { for (let i = 0; i < n; i++) update(); render(); },
  CARDS, ABIL, WEVO, useAbility, offerCards, pickCard, rollCards, graze, rankFor, buyWup, buyWevo, wupPrice, wevoPrice, hurtPod, breakPod, podOf, ramCheck, updEB, updPB, killBoss, nextStage, hurtEnemy,
  startDaily, dailyInfo, DMODS, dayKey, ACH, achScan, mkStation, stnHit, STN_X, slotInfo, switchSlot, deleteSlot, exportCode, importCode, setKey, keyLabel, KB, KDEF, applyKeys, hintFor, unlockHull, padNav, navEls, navMove, navAct, toast, variantFinish, checkUnlocks, genWave,
  musTap() { audio(); if (AC.state !== 'running') AC.resume(); const a = AC.createAnalyser(); a.fftSize = 2048; musG.connect(a); const buf = new Float32Array(a.fftSize); return () => { a.getFloatTimeDomainData(buf); let s = 0, pk = 0; for (const v of buf) { s += v * v; pk = Math.max(pk, Math.abs(v)); } return { rms: Math.sqrt(s / buf.length), pk, st: AC.state }; }; },
  __nameOk: nameOk, NET, netInit, netSetName, netAddFriend, netAccept, netCreateRoom, netJoinRoom, netStart, netQuick, netSendEmote,
  CR, startCrash, crashIntro, startCBoss, packCode, unpackCode, glitchSpreading, isCorrupt, newLevel, newCBoss,
  chCode, chParse, startChallenge, randChal, coopDead, PERF, ghDec, PADA, padLabel,
  SFX, jbPlay, jbStop, jbTracks, STEMS, get sfxG() { return sfxG; }, get AC() { return AC; },
  ST, RIVAL, TRUE_END, cutPick, rivalTick,
  PS, missions, addXP, LOGS, mastery, COS, progAfter, medalAt,
  IN2, SECW, EVENTS, ALT_NODE, RIFTS, GMODS, GAL, startGallery, riftsFound, bossBeaten, retroOff, startEvent, superGo, tryParry, chargeShot, fireSec, goldRoll, combatTick,
  photoSnap, photoExit, GLITCH_W, glitchCtx, MAPS, levelSpec, enemyThumb, INTEL, BOSS_INTEL, worldEnemies, bstCount, BG3D_W, bgPlanetTex, audio, playCut, endCut, cutNext, cutSkip, STORY, ENDING, bossPanels, endingPanels, storyDue, CUT, music, mTheme, mv, drawBossArt,
  get SLOT() { return SLOT; }, N2, lbSubmit, lbLoad, cloudUp, cloudDown, cloudPeek, chSend, inboxCount, chPlayInbox, netOn,
  defs: { WORLDS, EN, BOSSES, WPN, PARTS, UPG }
};
boot();


})();
