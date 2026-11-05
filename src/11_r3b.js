
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
      const on = R.on = !!SET.models && view !== 'off' && !R.lost; cvs.style.visibility = on ? 'visible' : 'hidden'; R.bgActive = false;
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
