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
  // V61: hull surface detail (panel seams, rivets, worn plates) + a fresnel rim light on every hull material
  const DET = (() => { try {
    const S = 512, rs = (() => { let s = 1337; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const alb = cv(S, S, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
      const cut = (x, y, w, h, d) => { if (w < 40 || h < 40 || d > 3) { g.fillStyle = 'rgba(0,0,0,' + (rs() * .09) + ')'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(10,14,22,.42)'; g.lineWidth = 1.4; g.strokeRect(x + .8, y + .8, w - 1.6, h - 1.6); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 2, y + h - 2); g.lineTo(x + 2, y + 2); g.lineTo(x + w - 2, y + 2); g.stroke(); if (rs() < .35) { g.fillStyle = 'rgba(15,20,30,.5)'; [[4, 4], [w - 6, 4], [4, h - 6], [w - 6, h - 6]].forEach(([a, b]) => { g.beginPath(); g.arc(x + a + 1, y + b + 1, 1.3, 0, 6.3); g.fill(); }); } if (rs() < .12 && w > 40) { g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 5; i++) g.fillRect(x + 6, y + 6 + i * 5, w * .4, 2); } return; }
        if (w > h ? rs() < .8 : rs() < .2) { const k = w * (.3 + rs() * .4); cut(x, y, k, h, d + 1); cut(x + k, y, w - k, h, d + 1); } else { const k = h * (.3 + rs() * .4); cut(x, y, w, k, d + 1); cut(x, y + k, w, h - k, d + 1); } };
      cut(0, 0, S, S, 0);
      for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(0,0,0,' + rs() * .05 + ')'; g.fillRect(rs() * S, rs() * S, rs() * 30, rs() * 3); }
    });
    const rough = cv(256, 256, (g) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { const v = 150 + rs() * 105 | 0; g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.fillRect(rs() * 256, rs() * 256, 2 + rs() * 14, 1 + rs() * 3); } });
    const map = srgb(new THREE.CanvasTexture(alb)), rm = new THREE.CanvasTexture(rough);
    [map, rm].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; });
    return { map, rm, rim: { value: new THREE.Color(0x9ad8ff).multiplyScalar(.42) }, on: SET.detail !== false };
  } catch (e) { return { on: false, rim: { value: null } }; } })();
  const NAV = { r: new THREE.MeshBasicMaterial({ color: 0xff3344 }), g: new THREE.MeshBasicMaterial({ color: 0x33ff88 }), w: new THREE.MeshBasicMaterial({ color: 0xffffff }) };
  (function navBlink(t) { requestAnimationFrame(navBlink); try { const k = (t / 1000) % 1.4, on = k < .12 || (k > .24 && k < .32); NAV.w.color.setScalar(on ? 1 : .08); const s = .55 + .45 * Math.sin(t / 260); NAV.r.color.setRGB(1, .2 * s, .27 * s).multiplyScalar(.5 + .5 * s); NAV.g.color.setRGB(.2 * s, 1, .53).multiplyScalar(.5 + .5 * s); } catch (e) { } })(0);
  function navLights(g, lx, rx, y, z, tz, glowC) { // red port, green starboard, white strobe at the tail
    const n = (m, x, yy, zz, s) => { const o = new THREE.Mesh(new THREE.SphereGeometry(s || .07, 8, 6), m); o.position.set(x, yy, zz); o.userData.nav = 1; g.add(o); return o; };
    n(NAV.r, lx, y, z); n(NAV.g, rx, y, z); n(NAV.w, 0, y + .05, tz, .06);
    if (glowC !== undefined) { gl(g, 0xff3344, .55, lx, y, z); gl(g, 0x33ff88, .55, rx, y, z); }
  }
  function rimify(mat) {
    if (!mat || mat.flatShading || !mat.userData || mat.userData.rim) return mat; mat.userData.rim = 1;
    mat.onBeforeCompile = sh => { sh.uniforms.uRim = DET.rim; sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', 'float rimF = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);\n gl_FragColor.rgb += uRim * pow(rimF, 2.3);\n#include <dithering_fragment>'); };
    mat.customProgramCacheKey = () => 'rim1'; return mat;
  }
  const M = (c, m = .9, r = .3, o) => { const mt = new THREE.MeshStandardMaterial(Object.assign({ color: c, metalness: m, roughness: r }, o)); if (DET.on && r >= .1 && !(o && (o.transparent || o.flatShading || o.map))) { mt.map = DET.map; mt.roughnessMap = DET.rm; } return rimify(mt); };
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
  // ---- cosmetic ship bodies, hats and pets (looks only: stats still come from the hull) ----
  const BODYS = {
    shark: { prof: [[0, -1.5], [.3, -1.4], [.42, -.6], [.38, .4], [.22, 1.2], [.02, 1.95]], x: (b, h, a) => { b.add(mesh(BX(.05, .75, .9), h, [0, .5, .1], [-.35, 0, 0])); [1, -1].forEach(s => [0, .15, .3].forEach(z => b.add(mesh(BX(.02, .14, .04), a, [.38 * s, .02, -.55 + z], [0, 0, .2 * s])))); } },
    needle: { prof: [[0, -1.2], [.2, -1.1], [.22, .4], [.12, 1.6], [.01, 2.5]], x: (b, h, a) => b.add(mesh(CY(.012, .012, 1.1, 6), a, [0, 0, -2.9], [H, 0, 0])) },
    bulldog: { prof: [[0, -1.1], [.5, -1.0], [.64, -.3], [.62, .6], [.5, 1.0], [.32, 1.28], [0, 1.3]], x: (b, h, a) => { b.add(mesh(BX(1.15, .22, .18), dark, [0, -.28, -1.3])); [1, -1].forEach(s => b.add(mesh(SP(.09, 10), a, [.36 * s, .05, -1.32]))); } },
    saucer: { prof: null, nw: 1, x: (b, h, a) => { b.add(mesh(lathe([[0, -.22], [.9, -.18], [1.45, 0], [1.5, .06], [.9, .2], [0, .28]], 48), h)); b.add(mesh(TO(1.46, .035, 8, 48), a, [0, .03, 0], [H, 0, 0])); for (let i = 0; i < 10; i++) { const t = i / 10 * TAU; b.add(mesh(SP(.06, 8), a, [Math.cos(t) * 1.2, -.12, Math.sin(t) * 1.2])); } } },
    beetle: { prof: [[0, -1.0], [.45, -.9], [.6, -.2], [.56, .5], [.32, 1.0], [.05, 1.2]], x: (b, h, a) => { [1, -1].forEach(s => { b.add(mesh(SP(.5, 18), h, [.3 * s, .22, .1], null, [.8, .55, 1.6])); [-.3, .3].forEach(z => b.add(mesh(SP(.08, 8), a, [.42 * s, .44, z]))); }); [1, -1].forEach(s => b.add(mesh(CO(.05, .5, 6), dark, [.16 * s, .12, -1.35], [-H - .3, 0, .3 * s]))); } },
    manta: { prof: [[0, -1.0], [.26, -.9], [.3, .2], [.16, 1.0], [.02, 1.3]], nw: 1, x: (b, h, a) => { [1, -1].forEach(s => { b.add(mesh(BX(1.9, .06, 1.5), h, [1.0 * s, -.02, .15], [0, .5 * s, 0])); b.add(mesh(BX(1.5, .03, .06), a, [1.0 * s, .03, -.25], [0, .5 * s, 0])); }); b.add(mesh(CY(.03, .01, 1.6, 6), dark, [0, 0, 2.0], [H, 0, 0])); } },
    twinboom: { prof: [[0, -.7], [.24, -.6], [.28, .2], [.14, .8], [.02, 1.0]], x: (b, h, a) => { [1, -1].forEach(s => { b.add(mesh(lathe([[0, -1.4], [.18, -1.3], [.2, .6], [.1, 1.4], [0, 1.6]], 20), h, [.75 * s, 0, 0], [-H, 0, 0])); b.add(mesh(BX(.05, .5, .5), h, [.75 * s, .3, 1.1])); }); b.add(mesh(BX(1.5, .05, .3), a, [0, .1, 1.15])); } },
    crystal: { prof: null, x: (b, h, a) => { const cm = new THREE.MeshStandardMaterial({ color: h.color, metalness: .3, roughness: .1, emissive: a.emissive, emissiveIntensity: .45, transparent: true, opacity: .92 }); b.add(mesh(OC(.6), cm, [0, 0, -.3], null, [.7, .55, 2.6])); [1, -1].forEach(s => b.add(mesh(OC(.3), cm, [.55 * s, 0, .5], null, [.6, .4, 1.4]))); b.add(mesh(OC(.18), a, [0, 0, -.3])); } },
    arrow: { prof: [[0, -1.2], [.35, -1.15], [.3, 0], [.15, 1.2], [0, 2.1]], x: (b, h, a) => [1, -1].forEach(s => { b.add(mesh(BX(.6, .04, .25), h, [.35 * s, 0, -1.2], [0, .4 * s, 0])); b.add(mesh(BX(.5, .02, .05), a, [.35 * s, .03, -1.1], [0, .4 * s, 0])); }) },
    rocket: { prof: [[0, -1.3], [.36, -1.2], [.42, -.2], [.36, .8], [.16, 1.5], [0, 1.95]], x: (b, h, a) => { [-.7, -.2].forEach(z => { b.add(mesh(TO(.12, .025, 6, 18), a, [.35, .12, z], [0, H, 0])); b.add(mesh(TO(.12, .025, 6, 18), a, [-.35, .12, z], [0, H, 0])); }); b.add(mesh(TO(.43, .03, 8, 28), a, [0, 0, .2])); } },
    stingray: { prof: [[0, -.9], [.24, -.8], [.3, .3], [.12, 1.0], [.02, 1.2]], nw: 1, x: (b, h, a) => { [1, -1].forEach(s => b.add(mesh(BX(1.5, .05, 1.1), h, [.75 * s, -.03, 0], [0, .35 * s, .1 * s]))); b.add(mesh(CY(.04, .01, 2.4, 6), dark, [0, 0, 2.2], [H, 0, 0])); b.add(mesh(SP(.07, 8), a, [0, 0, 3.4])); } },
    bubble: { prof: null, x: (b, h, a) => { b.add(mesh(SP(.62, 26), glass, [0, .1, -.3])); b.add(mesh(TO(.62, .06, 8, 32), h, [0, .1, -.3], [H, 0, 0])); b.add(mesh(CY(.3, .4, .8, 16), h, [0, 0, .6], [H, 0, 0])); b.add(mesh(SP(.12, 10), a, [0, .1, -.3])); } }
  };
  const HATS = {
    tophat: (g, a) => { g.add(mesh(CY(.36, .36, .04, 20), dark), mesh(CY(.22, .24, .42, 20), dark, [0, .22, 0]), mesh(CY(.245, .245, .07, 20), a, [0, .08, 0])); },
    crown: (g, a) => { const au = M(0xd4a64a, .9, .25); g.add(mesh(CY(.26, .24, .18, 16, 1), au, [0, .08, 0])); for (let i = 0; i < 6; i++) { const t = i / 6 * TAU; g.add(mesh(CO(.05, .16, 6), au, [Math.cos(t) * .24, .24, Math.sin(t) * .24]), mesh(SP(.035, 8), a, [Math.cos(t) * .24, .33, Math.sin(t) * .24])); } },
    cowboy: (g, a) => { const br = M(0x8b5a2b, .1, .8); g.add(mesh(CY(.5, .5, .04, 24), br, null, null, [1, 1, 1.15]), mesh(CY(.2, .25, .26, 16), br, [0, .14, 0]), mesh(CY(.255, .255, .05, 16), a, [0, .05, 0])); },
    party: (g, a) => { g.add(mesh(CO(.18, .5, 14), M(0xf472b6, .2, .5), [0, .25, 0]), mesh(SP(.07, 10), a, [0, .52, 0]), mesh(TO(.15, .025, 6, 16), M(0xfde047, .2, .5), [0, .12, 0], [H, 0, 0])); },
    halo: (g, a) => { g.add(mesh(TO(.26, .035, 8, 28), E(0xfde68a, 3), [0, .32, 0], [H, 0, 0])); },
    horns: (g, a) => { [1, -1].forEach(s => g.add(mesh(CO(.07, .38, 8), M(0xf5f5f4, .2, .5), [.2 * s, .16, 0], [0, 0, -.5 * s]))); },
    antenna: (g, a) => { g.add(mesh(CY(.015, .015, .5, 6), dark, [0, .25, 0]), mesh(SP(.07, 10), a, [0, .52, 0])); },
    wizard: (g, a) => { const pu = M(0x5b21b6, .2, .6); g.add(mesh(CY(.42, .42, .03, 22), pu), mesh(CO(.24, .75, 16), pu, [0, .38, 0], [-.15, 0, 0]), mesh(OC(.07), E(0xfde047, 2.6), [0, .28, -.22])); },
    viking: (g, a) => { const st = M(0x9ca3af, .9, .3); g.add(mesh(new THREE.SphereGeometry(.26, 18, 10, 0, TAU, 0, H), st)); [1, -1].forEach(s => g.add(mesh(CO(.06, .32, 8), M(0xfef3c7, .1, .6), [.27 * s, .14, 0], [0, 0, -1.1 * s]))); },
    propeller: (g, a, spin) => { g.add(mesh(new THREE.SphereGeometry(.22, 16, 8, 0, TAU, 0, H), M(0x2563eb, .2, .6))); const p = grp(mesh(BX(.6, .02, .07), M(0xef4444, .2, .5)), mesh(CY(.03, .03, .1, 6), dark)); p.position.y = .24; g.add(p); spin.push(p); },
    chef: (g, a) => { const w = M(0xffffff, 0, .9); g.add(mesh(CY(.2, .2, .2, 16), w, [0, .1, 0]), mesh(SP(.27, 14), w, [0, .3, 0], null, [1, .7, 1])); },
    bunny: (g, a) => { [1, -1].forEach(s => g.add(mesh(SP(.07, 10), M(0xfbcfe8, .1, .7), [.1 * s, .3, 0], [0, 0, -.2 * s], [1, 4, .6]))); },
    tricorne: (g, a) => { const bk = M(0x1f2937, .1, .7); for (let i = 0; i < 3; i++) g.add(mesh(BX(.5, .12, .06), bk, [Math.sin(i * 2.094) * .18, .1, Math.cos(i * 2.094) * .18], [0, i * 2.094, .2])); g.add(mesh(SP(.18, 12), bk, [0, .12, 0], null, [1, .6, 1]), mesh(SP(.05, 8), M(0xd4a64a, .9, .3), [0, .2, -.2])); },
    headphones: (g, a) => { g.add(mesh(new THREE.TorusGeometry(.26, .03, 8, 24, PI), dark, [0, .05, 0], [0, H, 0])); [1, -1].forEach(s => g.add(mesh(CY(.1, .1, .08, 14), a, [.27 * s, .02, 0], [0, 0, H]))); },
    catears: (g, a) => { [1, -1].forEach(s => g.add(mesh(CO(.09, .18, 4), M(0x111827, .2, .6), [.13 * s, .1, 0], [0, H / 2, -.2 * s]), mesh(CO(.05, .1, 4), M(0xf9a8d4, .2, .6), [.13 * s, .1, -.02], [0, H / 2, -.2 * s]))); },
    flower: (g, a) => { g.add(mesh(SP(.06, 10), M(0xfde047, .1, .6), [0, .15, 0])); for (let i = 0; i < 6; i++) { const t = i / 6 * TAU; g.add(mesh(SP(.06, 8), M(0xf9a8d4, .1, .6), [Math.cos(t) * .1, .15, Math.sin(t) * .1], null, [1.4, .5, 1])); } g.add(mesh(CY(.01, .01, .15, 4), M(0x16a34a, .1, .6), [0, .07, 0])); },
    cone: (g, a) => { g.add(mesh(CO(.18, .5, 16), M(0xf97316, .1, .6), [0, .25, 0]), mesh(CY(.115, .135, .08, 16), M(0xffffff, .1, .6), [0, .22, 0]), mesh(BX(.42, .03, .42), M(0xf97316, .1, .6))); },
    gradcap: (g, a) => { const bk = M(0x111827, .2, .6); g.add(mesh(CY(.18, .2, .12, 16), bk, [0, .06, 0]), mesh(BX(.5, .025, .5), bk, [0, .14, 0], [0, H / 2, 0]), mesh(CY(.008, .008, .2, 4), M(0xfde047, .3, .5), [.2, .05, .2]), mesh(SP(.03, 6), M(0xfde047, .3, .5), [.2, -.06, .2])); }
  };
  const PETS = {
    cat: (g, a) => { const fur = M(0xf59e0b, .1, .8); g.add(mesh(SP(.28, 14), fur, [0, .18, 0]), mesh(SP(.36, 14), fur, [0, -.22, .1], null, [1, .85, 1.2])); [1, -1].forEach(s => g.add(mesh(CO(.08, .16, 4), fur, [.15 * s, .44, 0]), mesh(SP(.04, 6), E(0x22d3ee, 2), [.1 * s, .22, -.24]))); g.add(mesh(CY(.03, .02, .5, 6), fur, [0, -.1, .5], [.9, 0, 0])); },
    pup: (g, a) => { const fur = M(0xd6d3d1, .1, .8), dk = M(0x57534e, .1, .8); g.add(mesh(SP(.3, 14), fur, [0, .15, 0]), mesh(SP(.34, 14), fur, [0, -.25, .1], null, [1, .85, 1.2]), mesh(SP(.06, 8), dark, [0, .12, -.3])); [1, -1].forEach(s => g.add(mesh(SP(.08, 8), dk, [.26 * s, .2, 0], null, [.6, 1.6, .8]), mesh(SP(.035, 6), dark, [.1 * s, .22, -.26]))); },
    owl: (g, a) => { const br = M(0x92400e, .1, .8); g.add(mesh(SP(.35, 14), br, [0, 0, 0], null, [1, 1.2, 1])); [1, -1].forEach(s => g.add(mesh(SP(.1, 10), M(0xffffff, 0, .6), [.13 * s, .14, -.28]), mesh(SP(.05, 8), dark, [.13 * s, .14, -.36]), mesh(CO(.05, .14, 4), br, [.18 * s, .42, 0]))); g.add(mesh(CO(.04, .1, 4), M(0xf59e0b, .1, .5), [0, .02, -.36], [-H, 0, 0])); },
    jelly: (g, a) => { const jm = new THREE.MeshStandardMaterial({ color: 0xf0abfc, emissive: 0xc026d3, emissiveIntensity: .8, transparent: true, opacity: .75 }); g.add(mesh(new THREE.SphereGeometry(.34, 18, 10, 0, TAU, 0, H), jm)); for (let i = 0; i < 6; i++) { const t = i / 6 * TAU; g.add(mesh(CY(.02, .005, .6, 4), jm, [Math.cos(t) * .2, -.3, Math.sin(t) * .2])); } },
    ufo: (g, a) => { g.add(mesh(lathe([[0, -.08], [.3, -.06], [.42, 0], [.3, .07], [0, .1]], 24), M(0xcbd5e1, .9, .3)), mesh(new THREE.SphereGeometry(.16, 14, 8, 0, TAU, 0, H), glass, [0, .07, 0])); for (let i = 0; i < 6; i++) { const t = i / 6 * TAU; g.add(mesh(SP(.03, 6), a, [Math.cos(t) * .34, -.02, Math.sin(t) * .34])); } },
    slime: (g, a) => { const sm = new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x16a34a, emissiveIntensity: .4, transparent: true, opacity: .85, roughness: .1 }); g.add(mesh(SP(.36, 16), sm, null, null, [1.1, .8, 1])); [1, -1].forEach(s => g.add(mesh(SP(.05, 8), dark, [.12 * s, .1, -.3]))); },
    dragon: (g, a) => { const sc = M(0xdc2626, .4, .4); g.add(mesh(SP(.3, 14), sc, null, null, [.9, .9, 1.4]), mesh(SP(.18, 12), sc, [0, .22, -.34]), mesh(CO(.08, .5, 6), sc, [0, 0, .55], [H, 0, 0])); [1, -1].forEach(s => g.add(mesh(BX(.5, .02, .3), M(0xfca5a5, .2, .6), [.35 * s, .18, 0], [0, 0, .5 * s]), mesh(CO(.03, .12, 4), M(0xfef3c7, .2, .5), [.08 * s, .4, -.34]))); g.add(mesh(SP(.03, 6), E(0xfde047, 3), [.08, .26, -.5]), mesh(SP(.03, 6), E(0xfde047, 3), [-.08, .26, -.5])); },
    penguin: (g, a) => { g.add(mesh(SP(.32, 14), dark, null, null, [1, 1.3, 1]), mesh(SP(.24, 14), M(0xffffff, 0, .7), [0, -.05, -.12], null, [1, 1.3, .8]), mesh(CO(.05, .12, 6), M(0xf59e0b, .1, .5), [0, .18, -.34], [-H, 0, 0])); [1, -1].forEach(s => g.add(mesh(SP(.035, 6), M(0xffffff, 0, .5), [.09 * s, .26, -.26]))); },
    ghost: (g, a) => { const gm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe0e7ff, emissiveIntensity: .6, transparent: true, opacity: .8 }); g.add(mesh(SP(.32, 16), gm, [0, .1, 0]), mesh(CY(.32, .38, .4, 16, 1, true), gm, [0, -.18, 0])); [1, -1].forEach(s => g.add(mesh(SP(.05, 8), dark, [.11 * s, .16, -.28]))); },
    fish: (g, a) => { const fm = M(0xfb923c, .3, .4); g.add(mesh(SP(.3, 14), fm, null, null, [.7, 1, 1.3]), mesh(CO(.22, .3, 4), fm, [0, 0, .46], [H, 0, 0], [.4, 1, 1])); [1, -1].forEach(s => g.add(mesh(SP(.05, 8), dark, [.16 * s, .08, -.22]))); },
    robot: (g, a) => { const st = M(0x94a3b8, .9, .3); g.add(mesh(BX(.42, .36, .36), st), mesh(BX(.34, .3, .3), st, [0, -.36, 0]), mesh(CY(.015, .015, .2, 6), dark, [0, .28, 0]), mesh(SP(.05, 8), E(0xef4444, 3), [0, .4, 0])); [1, -1].forEach(s => g.add(mesh(SP(.05, 8), a, [.1 * s, .04, -.19]))); },
    star: (g, a) => { g.add(mesh(OC(.32), E(0xfde047, 2), null, null, [1, 1, .4])); [1, -1].forEach(s => g.add(mesh(SP(.04, 6), dark, [.08 * s, .05, -.14]))); },
    duck: (g, a) => { const y = M(0xfde047, .1, .7); g.add(mesh(SP(.3, 14), y, [0, -.1, .05], null, [1, .9, 1.3]), mesh(SP(.2, 14), y, [0, .22, -.15]), mesh(BX(.16, .04, .16), M(0xf97316, .1, .5), [0, .2, -.36])); [1, -1].forEach(s => g.add(mesh(SP(.03, 6), dark, [.08 * s, .28, -.3]))); }
  };
  function buildShip(cfg) {
    const ac = hx(cfg.accent || '#22d3ee'), fin = FIN[cfg.finish] || FIN.chrome; let pc = hx(cfg.paint || '#94a3b8'); if (cfg.finish === 'carbon') pc = shade(pc, .3);
    const hullM = M(pc, fin.m, fin.r, { side: THREE.DoubleSide, emissive: fin.e ? ac : 0x000000, emissiveIntensity: fin.e }), acc = E(ac, 1.9);
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const P = { fin: grp(), wingL: grp(), wingR: grp(), engL: grp(), engR: grp(), canopy: grp() }, flames = [];
    for (const k in P) body.add(P[k]);
    const hull = HULLP[cfg.hull] ? cfg.hull : 'falcon', BD = cfg.body && BODYS[cfg.body], prof = BD ? (BD.prof || [[.3, 0]]) : HULLP[hull], rm = Math.max.apply(null, prof.map(a => a[0]));
    if (!BD || BD.prof) body.add(mesh(lathe(prof, 40), hullM, null, [-H, 0, 0])); if (BD) BD.x(body, hullM, acc);
    if (cfg.stripe !== false) body.add(mesh(BX(.05, .02, 1.5), acc, [0, rm + .01, .45]));
    // hull-specific details
    if (!BD && hull === 'vanguard') [1, -1].forEach(s => body.add(mesh(BX(.12, .46, 1.5), hullM, [.52 * s, .05, .2]), mesh(BX(.06, .1, 1.1), acc, [.6 * s, .05, .2])));
    if (!BD && hull === 'phantom') body.add(mesh(CY(.025, .05, 1.2, 8), dark, [0, 0, -2.25], [H, 0, 0]), mesh(BX(.04, .7, 1.4), hullM, [0, .45, .95], [-.25, 0, 0]));
    if (!BD && hull === 'titan') [-.6, 0, .6].forEach(z => body.add(mesh(TO(.62, .05, 8, 28), dark, [0, 0, z])));
    if (!BD && hull === 'nova') { body.add(mesh(TO(.46, .04, 8, 28), acc, [0, 0, -.1])); [1, -1].forEach(s => body.add(mesh(BX(.04, .38, .8), hullM, [.2 * s, .38, 1.0], [0, 0, -.4 * s]))); }
    if (!BD && hull === 'wraith') { [1, -1].forEach(s => body.add(mesh(BX(.03, .02, 1.3), acc, [.17 * s, .06, -.3], [0, -.12 * s, 0]), mesh(BX(.5, .03, .5), dark, [.3 * s, 0, -.9], [0, .5 * s, 0]))); body.add(mesh(CY(.02, .045, 1.5, 8), dark, [0, 0, -2.5], [H, 0, 0])); }
    if (!BD && hull === 'aegis') { [1, -1].forEach(s => body.add(mesh(BX(.34, .5, .9), hullM, [.62 * s, 0, -.2], [0, 0, .12 * s]), mesh(BX(.06, .12, .7), acc, [.8 * s, .08, -.2]))); body.add(mesh(TO(.74, .06, 8, 32), acc, [0, 0, .15])); }
    if (!BD && hull === 'ronin') { [1, -1].forEach(s => body.add(mesh(BX(.04, .05, 2.4), acc, [.34 * s, 0, -.6], [0, .1 * s, 0]), mesh(BX(.36, .03, .14), dark, [.3 * s, 0, .55]))); body.add(mesh(BX(.03, .16, 1.1), acc, [0, 0, -2.25])); body.add(mesh(BX(.2, .05, .06), dark, [0, 0, -1.7])); }
    if (!BD && hull === 'hive') { [1, -1].forEach(s => { [-.45, .35].forEach(z => body.add(mesh(SP(.2, 14), dark, [.66 * s, -.05, z]), mesh(TO(.2, .035, 6, 16), acc, [.66 * s, -.05, z], [H, 0, 0]))); }); body.add(mesh(BX(.5, .04, 1.8), dark, [0, .5, -.1]), mesh(BX(.06, .05, 1.7), acc, [0, .53, -.1])); }
    if (!BD && hull === 'longbow') { body.add(mesh(CY(.05, .07, 1.9, 10), dark, [0, 0, -2.6], [H, 0, 0]), mesh(CY(.09, .09, .18, 10), acc, [0, 0, -3.5], [H, 0, 0])); body.add(mesh(CY(.06, .06, .8, 10), dark, [0, .34, -.6], [H, 0, 0]), mesh(SP(.07, 10), acc, [0, .34, -1.02])); }
    // tail fins (detachable)
    if (BD && BD.nw) { } else if (hull === 'phantom' || hull === 'nova' || hull === 'wraith' || hull === 'longbow' || hull === 'ronin') P.fin.add(mesh(BX(.05, .62, .8), hullM, [0, .4, 1.0], [0, 0, 0]));
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
    if (!(BD && BD.nw)) [1, -1].forEach(s => {
      const P2 = s > 0 ? P.wingR : P.wingL, w = mesh(wingG(wk), hullM, [0, -.04, 0], [-H, 0, 0], [s, 1, 1]);
      P2.add(w, mesh(BX(.12, .05, .3), acc, [wx * s, .02, wk === 'forward' ? -.7 : 1.02]), mesh(CY(.045, .055, 1.7, 12), dark, [cx * s, .03, -.2], [H, 0, 0]));
      P2.userData.c = [1.2 * s, 0, .1];
    });
    // engines (detachable) + flames
    const fc = cfg.flame ? hx(cfg.flame) : ac, ek = cfg.engine || 'twin', ES = { twin: { r: .2, l: .9, z: 1.0, pts: [[.36, 0]] }, quad: { r: .13, l: .8, z: 1.0, pts: [[.3, .15], [.3, -.15]] }, heavy: { r: .3, l: 1.1, z: .95, pts: [[.4, 0]] }, pods: { r: .17, l: 1.1, z: .55, pts: [[1.45, -.04]] } }[ek] || { r: .2, l: .9, z: 1, pts: [[.36, 0]] };
    [1, -1].forEach(s => {
      const P2 = s > 0 ? P.engR : P.engL;
      ES.pts.forEach(pt => {
        const x = pt[0] * s, y = pt[1], zt = ES.z + ES.l / 2;
        P2.add(mesh(CY(ES.r, ES.r * 1.2, ES.l, 20), dark, [x, y, ES.z], [H, 0, 0]), mesh(TO(ES.r, .03, 8, 24), acc, [x, y, zt]));
        const f = mesh(new THREE.ConeGeometry(ES.r * .75, 1.6, 14, 1, true), new THREE.MeshBasicMaterial({ color: fc, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }), [x, y, zt + .8], [H, 0, 0]);
        const gs = sprite(fc, 1.5, x, y, zt + .1); P2.add(f, gs); flames.push(f, gs);
      });
      P2.userData.c = [ES.pts[0][0] * s, 0, ES.z];
    });
    if (!(BD && BD.nw)) { const tipZ = wk === 'forward' ? -.6 : .95; const nr = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), NAV.g); nr.userData.nav = 1; nr.position.set(wx, .04, tipZ); P.wingR.add(nr); const nl = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), NAV.r); nl.userData.nav = 1; nl.position.set(-wx, .04, tipZ); P.wingL.add(nl); }
    { const st = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), NAV.w); st.userData.nav = 1; st.position.set(0, rm + .06, .9); body.add(st); body.add(mesh(CY(.008, .014, .55, 5), dark, [0, rm + .26, .55], [-.35, 0, 0])); }
    ES.pts.forEach(pt => [1, -1].forEach(s => { const core = new THREE.Mesh(new THREE.CircleGeometry(ES.r * .78, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })); core.userData.nav = 1; core.position.set(pt[0] * s, pt[1], ES.z + ES.l / 2 + .015); (s > 0 ? P.engR : P.engL).add(core); }));
    const light = new THREE.PointLight(fc, 1.8, 170); light.position.set(0, 0, 2); body.add(light);
    const spinL = []; let pet = null;
    if (cfg.hat && HATS[cfg.hat]) { const hg = grp(); HATS[cfg.hat](hg, acc, spinL); hg.position.set(0, cy + (cfg.canopy === 'dome' ? .32 : .22), BD && !BD.prof ? -.3 : -.35); hg.scale.setScalar(1.25); P.canopy.add(hg); }
    if (cfg.pet && PETS[cfg.pet]) { pet = grp(); PETS[cfg.pet](pet, acc); pet.position.set(0, 1.05, 2.1); pet.scale.setScalar(.85); pet.userData.y0 = 1.05; g.add(pet); }
    return { g, body, P, flames, light, k: HULLK[hull] || 1, pet, spin: spinL };
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
  // V61: detail kits bolted onto the base archetypes (cockpits, nozzles, vents, antennas, armour plates)
  const KIT = (() => {
    const glassK = new THREE.MeshStandardMaterial({ color: 0x0b1b2e, metalness: 1, roughness: .05, emissive: 0x0e7490, emissiveIntensity: .45 });
    const noz = (g, x, y, z, r, em) => { g.add(mesh(CY(r, r * 1.25, r * 1.6, 14), dark, [x, y, z], [H, 0, 0]), mesh(TO(r * .95, r * .16, 6, 18), em, [x, y, z + r * .8])); const c = new THREE.Mesh(new THREE.CircleGeometry(r * .8, 14), new THREE.MeshBasicMaterial({ color: 0xffffff })); c.position.set(x, y, z + r * .82); c.userData.nav = 1; g.add(c); gl(g, em.emissive.getHex(), r * 5, x, y, z + r * 1.2); };
    const vent = (g, x, y, z, w, d, em, ry) => { const v = grp(); for (let i = 0; i < 4; i++) v.add(mesh(BX(w, .03, d * .18), i % 2 ? dark : em, [0, 0, (i - 1.5) * d * .24])); v.position.set(x, y, z); if (ry) v.rotation.y = ry; g.add(v); };
    const ant = (g, x, y, z, h) => { g.add(mesh(CY(.012, .02, h, 5), dark, [x, y + h / 2, z])); g.add(mesh(SP(.04, 6), NAV.r, [x, y + h, z])); };
    return {
      dart(g, o) { const hu = M(shade(o.c, .8), .85, .32), em = E(o.e, 2.4); g.add(mesh(SP(.32, 18), glassK, [0, .3, -.7], null, [.8, .6, 2.1]), mesh(BX(.08, .18, 1.6), hu, [0, .42, .5]), mesh(BX(.5, .06, .8), dark, [0, -.42, .3])); [1, -1].forEach(s => { noz(g, .28 * s, 0, 2.15, .15, em); g.add(mesh(BX(.18, .2, .7), hu, [.42 * s, -.12, -.2], [0, .2 * s, 0]), mesh(BX(.03, .18, .5), dark, [1.25 * s, .1, .75], [0, -.55 * s, 0])); }); },
      saucer(g, o) { const em = E(o.e, 2.2), hu = M(shade(o.c, .7), .9, .3); g.add(mesh(TO(1.1, .05, 6, 40), em, [0, -.17, 0], [H, 0, 0]), mesh(TO(1.66, .04, 6, 48), dark, [0, .12, 0], [H, 0, 0]), mesh(CY(.45, .6, .2, 24), hu, [0, -.28, 0])); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + .5, t = grp(mesh(SP(.16, 10), hu), mesh(CY(.04, .04, .45, 6), dark, [0, 0, -.25], [H, 0, 0])); t.position.set(Math.cos(a) * .95, -.25, Math.sin(a) * .95); g.add(t); } ant(g, 0, .45, 0, .5); },
      sniper(g, o) { const hu = M(shade(o.c, .75), .9, .3), em = E(o.e, 2.6); for (let i = 0; i < 6; i++) g.add(mesh(CY(.2, .2, .05, 12), dark, [0, 0, -1.0 - i * .28], [H, 0, 0])); g.add(mesh(CY(.17, .13, .35, 10), hu, [0, 0, -3.95], [H, 0, 0]), mesh(TO(.32, .04, 6, 20), em, [0, .45, -.45]), mesh(CY(.14, .14, .9, 10), hu, [0, .7, .1], [H, 0, 0]), mesh(SP(.12, 10), E(o.e, 3), [0, .7, -.38])); noz(g, 0, -.1, 1.65, .28, em); vent(g, 0, .7, .7, .5, .8, em); },
      elite(g, o) { const hu = M(shade(o.c, .8), .85, .3), em = E(o.e, 2.4); g.add(mesh(SP(.38, 16), glassK, [0, .65, -.35], null, [.9, .55, 1.6]), mesh(BX(1.4, .12, 1.8), hu, [0, .52, 1.0])); [1, -1].forEach(s => { vent(g, .55 * s, .52, 1.0, .35, 1.4, em); noz(g, 1.4 * s, 0, 1.45, .3, em); g.add(mesh(BX(.6, .5, .25), hu, [1.4 * s, .35, -.5], [.3, 0, 0])); ant(g, .9 * s, .45, 1.6, .55); }); },
      crab(g, o) { const hu = M(shade(o.c, .75), .75, .4), em = E(o.e, 2.4); for (let i = 0; i < 4; i++) g.add(mesh(SP(.95 - i * .1, 16), hu, [0, .3 + i * .03, .9 - i * .45], null, [1.15, .3, .5])); [1, -1].forEach(s => g.add(mesh(CY(.04, .05, .5, 6), dark, [.4 * s, .55, -.65], [-.4, 0, 0]), mesh(SP(.1, 10), em, [.4 * s, .78, -.78]))); },
      gear(g, o) { const em = E(o.e, 2.4), r = g.children.find(c => c.userData.spin); if (!r) return; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; r.add(mesh(BX(.12, .5, .75), dark, [Math.cos(a) * .9, 0, Math.sin(a) * .9], [0, -a, 0]), mesh(SP(.07, 6), em, [Math.cos(a + .5) * 1.18, .25, Math.sin(a + .5) * 1.18])); } },
      ringeye(g, o) { const hu = M(shade(o.c, .7), .9, .25); g.add(mesh(new THREE.SphereGeometry(.74, 24, 12, 0, TAU, 0, 1.0), hu, [0, 0, 0], [-H - .35, 0, 0]), mesh(new THREE.SphereGeometry(.74, 24, 12, 0, TAU, 0, 1.0), hu, [0, 0, 0], [H + 2.8, 0, 0])); },
      tank(g, o) { const hu = M(shade(o.c, .75), .8, .4), em = E(o.e, 2.4); [1, -1].forEach(s => { for (let i = 0; i < 5; i++) g.add(mesh(CY(.26, .26, .2, 14), dark, [1.35 * s, -.4, -1.1 + i * .72], [0, 0, H]), mesh(CY(.1, .1, .22, 8), em, [1.36 * s, -.4, -1.1 + i * .72], [0, 0, H])); g.add(mesh(CY(.11, .11, .55, 8), dark, [.75 * s, .55, 1.85])); }); g.add(mesh(CY(.28, .28, .1, 14), hu, [.3, 1.0, .9]), mesh(CY(.2, .2, .12, 10), dark, [0, .7, -1.95], [H, 0, 0])); ant(g, -.45, .9, 1.0, .9); vent(g, 0, .42, 1.4, .9, 1.0, em); },
      manta(g, o) { const em = E(o.e, 2.5), hu = M(shade(o.c, .7), .75, .35); for (let i = 0; i < 4; i++) g.add(mesh(CO(.09, .4, 6), hu, [0, .42 - i * .04, -.1 + i * .45], [-.4, 0, 0])); [1, -1].forEach(s => noz(g, .5 * s, .05, 1.0, .16, em)); g.add(mesh(SP(.28, 14), glassK, [0, .3, -.7], null, [.8, .5, 1.4])); }
    };
  })();
