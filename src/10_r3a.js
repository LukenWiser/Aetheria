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
