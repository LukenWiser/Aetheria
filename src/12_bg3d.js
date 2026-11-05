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
