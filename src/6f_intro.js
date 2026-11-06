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
      if (t >= T_OUT) { add('out'); if (document.body.classList.contains('intro')) { try { if (typeof SHIP !== 'undefined') SHIP.handoff(); } catch (e) { } document.body.classList.remove('intro'); document.body.classList.add('introfade'); setTimeout(() => document.body.classList.remove('introfade'), 1200); } }
      if (t >= T_END) return end();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
