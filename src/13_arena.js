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
    m.polygonOffset = true; m.polygonOffsetFactor = -2 - Math.min(6, Math.max(0, Math.round(y - A.gy))); m.polygonOffsetUnits = m.polygonOffsetFactor * 2; // strips sit a hair above the ground: pull them forward in the depth test so they never flicker
    track(m); const gm = new T.Mesh(track(new T.PlaneGeometry(W, D)), m); gm.rotation.x = -Math.PI / 2; gm.position.set(0, y, (z0 + z1) / 2); gm.renderOrder = 1; scene.add(gm);
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
          if (h < 260) { put(awn[k % awn.length], G.box, x + w / 2, gy() + 52, 86, w - 20, 8, 26, -.35, 0, 0); put(SIGNS[k % SIGNS.length], G.box, x + w / 2, gy() + 84, 85, w * .7, 26, 3); }
          else { for (let f = 1; f < h / 70; f++) put(concrete, G.box, x + w / 2, gy() + f * 70, 84, w - 14, 4, 10); }
          x += w; k++; } });
      // street furniture on both curbs
      layer(-1100, lenFor(-1100), put => { const L = lenFor(-1100); for (let x = 60; x < L; x += 260) { put(metal, G.cyl6, x, gy() + 60, 0, 4, 120, 4); put(metal, G.box, x + 14, gy() + 118, 0, 30, 3, 4); put(lamp, G.box, x + 26, gy() + 114, 0, 10, 4, 8); } for (let x = 190; x < L; x += 520) { put(trunk, G.cyl6, x, gy() + 22, 0, 6, 44, 6); put(tree, G.ico, x, gy() + 62, 0, 50, 50, 50, 0, rs() * 3, 0, 1, 1, tint(1, .3)); } });
      layer(-1480, lenFor(-1480), put => { const L = lenFor(-1480); for (let x = 130; x < L; x += 260) { put(metal, G.cyl6, x, gy() + 60, 0, 4, 120, 4); put(metal, G.box, x - 14, gy() + 118, 0, 30, 3, 4); put(lamp, G.box, x - 26, gy() + 114, 0, 10, 4, 8); }
        for (let x = 400; x < L; x += 900) { put(metal, G.box, x, gy() + 34, -10, 70, 4, 18); put(metal, G.box, x - 32, gy() + 17, -10, 3, 34, 3); put(metal, G.box, x + 32, gy() + 17, -10, 3, 34, 3); put(SIGNS[3], G.box, x, gy() + 50, -10, 60, 16, 2); } });
      // billboards high on the far blocks
      const bb = layer(-2300, lenFor(-2300), put => { const L = lenFor(-2300); for (let i = 0; i < 6; i++) { // billboard towers: two legs planted in the ground, a catwalk, then the board
        const x = (i + .5) / 6 * L, y = gy() + 300 + rs() * 300, legH = y - 5 - gy();
        for (const lx of [-70, 70]) put(metal, G.box, x + lx, gy() + legH / 2, -14, 9, legH, 9);
        for (let k = 1; k * 120 < legH - 40; k++) put(metal, G.box, x, gy() + k * 120, -14, 150, 5, 5);
        put(metal, G.box, x, y - 4, -2, 250, 6, 26); put(SIGNS[i % SIGNS.length], G.box, x, y + 36, 0, 230, 70, 4); } });
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
    // Galaxy sector: an orbital shipyard - deck plating, gantries, half-built cruisers, sweeping cranes
    dockyard() {
      A.gy = -470; A.fogNear = 900; A.fogFar = 7800; A.tilt = .1; A.speed = 2.4;
      sky('#02030c', '#1b2a55', '#050814', { fog: '#16213f', sun: '#fff1d6', sx: -.35, sy: .25 });
      amb.intensity = .45; sunL.color.set(lc('#dbeafe')); sunL.intensity = 2; sunL.position.set(-700, 500, -600); scene.add(track(new T.HemisphereLight(lc('#60a5fa'), lc('#0b1222'), .5)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#1a2130'; g.fillRect(0, 0, w, h); g.strokeStyle = '#0f141f'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } g.fillStyle = '#3a4560'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(i * 64 + 6, j * 64 + 6, 4, 4); }, { tile: 400, rough: .5, metal: .4, emi: (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#38bdf8'; g.fillRect(0, h / 2 - 2, w, 4); }, emiCol: '#38bdf8', ei: .7 });
      const planet = new T.Mesh(G.sph, MAT({ color: '#1e3a8a', emissive: '#1d4ed8', emissiveIntensity: .25, vertexColors: false })); planet.scale.setScalar(2200); planet.position.set(1800, 1500, -7600); scene.add(planet);
      const steel = C3('#64748b'), dark = C3('#1f2937'), hullC = C3('#94a3b8'), warn = C3('#facc15'), lit = GL3('#7dd3fc', 2.4), red = GL3('#f43f5e', 3);
      layer(-2900, lenFor(-2900), put => { const L = lenFor(-2900); for (let x = 300; x < L; x += 1300) { // dry docks with cruisers under construction
        for (const dz of [-200, 200]) { put(steel, G.box, x, gy() + 380, dz, 30, 760, 30); put(steel, G.box, x + 900, gy() + 380, dz, 30, 760, 30); } put(steel, G.box, x + 450, gy() + 760, 0, 960, 24, 430);
        put(hullC, G.box, x + 450, gy() + 300, 0, 780, 150, 170, 0, 0, 0, 6, 1, tint(1, .15)); put(hullC, G.cone, x + 900, gy() + 300, 0, 120, 200, 120, 0, 0, -Math.PI / 2); put(dark, G.box, x + 300, gy() + 300, 0, 260, 152, 172); for (let r = 0; r < 6; r++) put(lit, G.box, x + 150 + r * 110, gy() + 340, 88, 40, 8, 2); } });
      const gant = layer(-2200, lenFor(-2200), put => { const L = lenFor(-2200); for (let x = 100; x < L; x += 560) { put(steel, G.box, x, gy() + 260, 0, 26, 520, 26); for (let k = 1; k < 6; k++) put(steel, G.box, x, gy() + k * 90, 0, 120, 6, 6, 0, 0, k % 2 ? .6 : -.6); put(warn, G.box, x, gy() + 525, 0, 60, 10, 60); put(red, G.box, x, gy() + 540, 0, 10, 10, 10); } });
      for (let i = 0; i < 4; i++) { const arm = new T.Group(), b = new T.Mesh(G.box, warn); b.scale.set(420, 14, 14); b.position.x = 180; arm.add(b); const hk = new T.Mesh(G.box, dark); hk.scale.set(8, 120, 8); hk.position.set(370, -60, 0); arm.add(hk); const ph = rs() * 6; ride(gant, arm, i * gant.len / 4 + 100, gy() + 520, 0, (o, t) => { o.rotation.y = Math.sin(t * .2 + ph) * .9; }); }
      layer(-1250, lenFor(-1250), put => { const L = lenFor(-1250); for (let x = 80; x < L; x += 300) { put(dark, G.box, x, gy() + 40, 0, 120, 80, 80, 0, 0, 0, 1, 1, tint(1, .3)); put(warn, G.box, x, gy() + 82, 0, 124, 4, 84); put(lit, G.box, x - 40, gy() + 30, 41, 20, 10, 1); } for (let x = 200; x < L; x += 900) { put(steel, G.cyl, x, gy() + 70, -60, 70, 140, 70); put(lit, G.cyl, x, gy() + 142, -60, 50, 4, 50); } });
      const KIT = kits(); fleet(KIT, traffic([[-1050, 2.6, A.gy + 1], [-1110, -2, A.gy + 1]], 6, () => rs() < .5 ? 'truck' : 'car', 7000), { span: 7000 });
      for (let i = 0; i < 6; i++) { const sh = new T.Group(), hb = new T.Mesh(G.box, hullC); hb.scale.set(140, 26, 40); sh.add(hb); const nz = new T.Mesh(G.cone, hullC); nz.scale.set(26, 50, 26); nz.rotation.z = -Math.PI / 2; nz.position.x = 94; sh.add(nz); const en = new T.Mesh(G.box, GL3('#38bdf8', 3)); en.scale.set(6, 18, 30); en.position.x = -72; sh.add(en); const v = 2 + rs() * 2; ride(A.layers[1], sh, rs() * A.layers[1].len, gy() + 900 + rs() * 500, (rs() - .5) * 400, (o, t, df) => { o.position.x += v * df; if (o.position.x > A.layers[1].len * 2) o.position.x -= A.layers[1].len * 3; }); }
      weather(0, 220, '#bae6fd', [1400, 800, 1600], [-.2, .05, 2], 3);
    },
    // Galaxy sector: an asteroid mine - cratered rock, drill rigs, ore conveyors, haul trucks under a gas giant
    mine() {
      A.gy = -450; A.fogNear = 600; A.fogFar = 6800; A.tilt = .11; A.speed = 2.3;
      sky('#0a0510', '#4a2a1c', '#140a06', { fog: '#3b2416', sun: '#ffd8a8', sx: .4, sy: .08 });
      amb.intensity = .4; sunL.color.set(lc('#ffd2a1')); sunL.intensity = 2; sunL.position.set(800, 220, -700); scene.add(track(new T.HemisphereLight(lc('#fdba74'), lc('#1c0f08'), .45)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#5b4636'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const x = rs() * w, y = rs() * h, r = 4 + rs() * 22; g.fillStyle = 'rgba(30,20,14,' + (.25 + rs() * .3) + ')'; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); g.strokeStyle = 'rgba(160,130,100,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(x - 1, y - 1, r, 3.6, 5.6); g.stroke(); } }, { tile: 520 });
      const giant = new T.Mesh(G.sph, MAT({ color: '#c2410c', emissive: '#7c2d12', emissiveIntensity: .35, vertexColors: false })); giant.scale.setScalar(3000); giant.position.set(-2600, 1400, -9200); scene.add(giant);
      const rock = C3('#6b5444'), rock2 = C3('#3f2f24'), rig = C3('#a3a3a3'), yel = C3('#eab308'), ore = GL3('#22d3ee', 2.2), lamp = GL3('#fde68a', 2.6);
      layer(-4200, lenFor(-4200), put => { const L = lenFor(-4200); for (let i = 0; i < 26; i++) { const s = 300 + rs() * 700; put(rs() < .5 ? rock : rock2, G.cone, rs() * L, gy() + s * .35, (rs() - .5) * 700, s * 1.4, s * .7, s, 0, rs() * 3, 0); } });
      layer(-2400, lenFor(-2400), put => { const L = lenFor(-2400); for (let x = 200; x < L; x += 800) { put(rig, G.box, x - 60, gy() + 220, 0, 16, 440, 16, 0, 0, .12); put(rig, G.box, x + 60, gy() + 220, 0, 16, 440, 16, 0, 0, -.12); put(yel, G.box, x, gy() + 450, 0, 170, 30, 60); put(lamp, G.box, x, gy() + 470, 0, 30, 10, 30); put(rock2, G.cone, x, gy() + 50, 0, 260, 100, 260); }
        for (let i = 0; i < 18; i++) put(ore, G.box, rs() * L, gy() + 10 + rs() * 40, (rs() - .5) * 300, 20 + rs() * 30, 20 + rs() * 40, 20 + rs() * 30, rs(), rs(), rs()); });
      const drills = layer(-2400, lenFor(-2400), () => { }); for (let x = 200; x < drills.len; x += 800) { const d = new T.Mesh(G.cone, C3('#9ca3af')); d.scale.set(50, 180, 50); d.rotation.z = Math.PI; ride(drills, d, x, gy() + 300, 0, (o, t) => { o.rotation.y = t * 3; o.position.y = gy() + 300 + Math.sin(t * 1.5) * 60; }); }
      layer(-1300, lenFor(-1300), put => { const L = lenFor(-1300); put(C3('#262626'), G.box, L / 2, gy() + 46, 0, L, 10, 40); for (let x = 0; x < L; x += 140) { put(rig, G.box, x, gy() + 22, 0, 8, 44, 40); } for (let x = 100; x < L; x += 600) { put(rock, G.sph, x, gy() + 20, 120, 140, 80, 120); put(lamp, G.cyl6, x + 200, gy() + 90, -40, 6, 180, 6); } });
      const belt = layer(-1300, lenFor(-1300), () => { }); for (let i = 0; i < 24; i++) { const c = new T.Mesh(G.box, i % 3 ? C3('#57534e') : ore); c.scale.set(26, 22, 26); ride(belt, c, i * belt.len / 24, gy() + 62, 0, (o, t, df) => { o.position.x -= 1.4 * df; if (o.position.x < -belt.len) o.position.x += belt.len * 3; }); }
      const KIT = kits(); fleet(KIT, traffic([[-1080, 1.8, A.gy + 1], [-1160, -1.6, A.gy + 1]], 5, () => 'truck', 7000), { span: 7000 });
      weather(0, 260, '#fdba74', [1400, 700, 1600], [-.6, .1, 3], 4);
    },
    // Galaxy sector: a comet's frozen surface - crystal spires, jetting geysers, a frozen probe and a tail of ice
    comet() {
      A.gy = -430; A.fogNear = 700; A.fogFar = 7600; A.tilt = .09; A.speed = 2.5;
      sky('#030712', '#164e63', '#082f49', { fog: '#0e3a4f', sun: '#e0f2fe', sx: -.2, sy: .18, aur: 1 });
      amb.intensity = .3; sunL.color.set(lc('#e0f2fe')); sunL.intensity = 1.15; sunL.position.set(-500, 400, -800); scene.add(track(new T.HemisphereLight(lc('#a5f3fc'), lc('#082f49'), .35)));
      ground('#ffffff', (g, w, h) => { g.fillStyle = '#5f97ad'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(14,116,144,' + (.15 + rs() * .25) + ')'; g.lineWidth = 1 + rs() * 2; g.beginPath(); let x = rs() * w, y = rs() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rs() - .5) * 60; y += (rs() - .5) * 60; g.lineTo(x, y); } g.stroke(); } }, { tile: 600, rough: .25, metal: .1 });
      const ice = MAT({ color: '#5fb8cc', emissive: '#0e7490', emissiveIntensity: .3, roughness: .15, metalness: .1, vertexColors: false }), ice2 = MAT({ color: '#9fd3e0', emissive: '#155e75', emissiveIntensity: .25, roughness: .2, vertexColors: false }), probe = C3('#d4d4d8'), gold = MAT({ color: '#d4a64a', metalness: .8, roughness: .3, vertexColors: false }), blink = GL3('#f43f5e', 3);
      layer(-4600, lenFor(-4600), put => { const L = lenFor(-4600); for (let i = 0; i < 30; i++) { const h = 500 + rs() * 1100; put(rs() < .5 ? ice : ice2, G.cone, rs() * L, gy() + h / 2, (rs() - .5) * 800, h * .35, h, h * .35, (rs() - .5) * .2, rs() * 3, (rs() - .5) * .25); } });
      layer(-2300, lenFor(-2300), put => { const L = lenFor(-2300); for (let i = 0; i < 40; i++) { const h = 80 + rs() * 360, x = rs() * L; for (let k = 0; k < 3; k++) put(k ? ice2 : ice, G.cone, x + (k - 1) * h * .25, gy() + h * (k ? .3 : .5), (rs() - .5) * 200, h * .25, h * (k ? .6 : 1), h * .25, 0, rs() * 3, (k - 1) * .35); } });
      layer(-1400, lenFor(-1400), put => { const L = lenFor(-1400); for (let x = 600; x < L; x += 2400) { put(probe, G.box, x, gy() + 50, 0, 120, 70, 80, 0, .3, .2); put(gold, G.box, x, gy() + 50, 0, 124, 30, 84, 0, .3, .2); put(probe, G.box, x - 140, gy() + 80, 0, 160, 4, 60, 0, .3, .5); put(probe, G.cyl6, x + 40, gy() + 130, 0, 4, 90, 4); put(blink, G.box, x + 40, gy() + 178, 0, 8, 8, 8); }
        for (let i = 0; i < 30; i++) put(rs() < .5 ? ice : ice2, G.sph, rs() * L, gy() + 10, (rs() - .5) * 400, 40 + rs() * 90, 20 + rs() * 30, 40 + rs() * 90); });
      const gey = layer(-1900, lenFor(-1900), () => { }), jet = BAS({ color: '#cffafe', opacity: .35 }); for (let i = 0; i < 6; i++) { const m = new T.Mesh(G.cone, jet), ph = rs() * 6; m.scale.set(60, 700, 60); ride(gey, m, i * gey.len / 6 + rs() * 200, gy() + 350, (rs() - .5) * 200, (o, t) => { const k = Math.max(.05, Math.sin(t * .7 + ph)); o.scale.set(60 * k + 10, 700 * k, 60 * k + 10); o.position.y = gy() + 350 * k; }); }
      for (let i = 0; i < 6 * q + 2; i++) { const s = new T.Sprite(spriteM('#a5f3fc', .12, true)); s.scale.set(2400 + rs() * 1600, 260 + rs() * 200, 1); ride(A.layers[0], s, rs() * A.layers[0].len, 1300 + rs() * 700, (rs() - .5) * 600); }
      weather(0, 380, '#ecfeff', [1400, 800, 1600], [-.5, -.4, 3], 3);
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
