// ================= V64: telegraphs, signature elite patterns, gentler first sectors =================
// ---- signature volleys: each world's elites have one readable pattern, fired every 3rd shot ----
const SIGP = [
  { nm: 'FAN', f: (e, a, s) => { for (let i = -2; i <= 2; i++) sigShot(e, a + i * .2, s); } },
  { nm: 'RING', f: (e, a, s) => { for (let i = 0; i < 12; i++) sigShot(e, a + i / 12 * TAU, s * .75); } },
  { nm: 'CROSS', f: (e, a, s) => { for (let k = 0; k < 3; k++) [0, PI / 2, PI, -PI / 2].forEach(q => setTimeout(() => { if (!e.dead && G.run) sigShot(e, q + .4 + k * .25, s * .9); }, k * 120)); } },
  { nm: 'SPIRAL', f: (e, a, s) => { for (let i = 0; i < 14; i++) setTimeout(() => { if (!e.dead && G.run) sigShot(e, a + PI + i * .45, s * .8); }, i * 45); } }
];
function sigShot(e, a, s) { ebullet(e.x - e.w * .3, e.y, Math.cos(a) * s, Math.sin(a) * s, 'orb'); }
function earlyRun() { const R = G.run; return R && R.mode === 'expedition' && !R.var && R.w === 0 && R.lv < 3 && R.tier === 1; }
const _fireEY = fireEnemy;
fireEnemy = function (e) {
  try {
    if (e.d.elite && G.run && G.run.mode !== 'tutorial') {
      e.sigN = (e.sigN | 0) + 1;
      if (e.sigN % 3 === 0) { const P = nearP(e.x, e.y), a = P ? Math.atan2(P.y - e.y, P.x - e.x) : PI; SIGP[G.run.w % 4].f(e, a, (e.d.f && e.d.f.s) || 4); return; }
    }
  } catch (er) { }
  return _fireEY.apply(this, arguments);
};
// ---- gentler first three sectors: slower enemy fire, no threat scaling, show your hitbox ----
const _updEY = updEnemy;
updEnemy = function (e) { const f0 = e.fcd, r = _updEY.apply(this, arguments); try { if (earlyRun() && typeof f0 === 'number' && e.fcd > f0 + 1) e.fcd = Math.round(e.fcd * (G.run.lv === 0 ? 1.8 : G.run.lv === 1 ? 1.5 : 1.25)); } catch (er) { } return r; };
const _beginY = beginRun;
beginRun = function () {
  const r = _beginY.apply(this, arguments);
  try {
    const R = G.run;
    if (earlyRun()) { if (R.bal) { R.hpm /= R.bal.hp; R.edm /= R.bal.ed; R.bal = { hp: 1, ed: 1 }; } R.learn = 1;
      if (R.lv === 0 && !SAVE.flags.dodgeTip) { SAVE.flags.dodgeTip = 1; setTimeout(() => { if (G.run === R) toast('DODGING 101', 'Only the glowing dot in the middle of your ship can be hit. Weave it between the red shots - every hit costs a third of your hull.', '#22d3ee'); }, 3500); } }
  } catch (er) { }
  return r;
};
const _hbY = drawHitbox;
drawHitbox = function (g) {
  if (SET.hitbox || !G.run || !G.run.learn) return _hbY.apply(this, arguments);
  // learning sectors: a soft pulsing core dot on your ship
  for (const p of G.players) { if (!p.alive) continue; const k = .6 + .4 * Math.sin(G.t * .15); g.save(); g.globalAlpha = .85; g.fillStyle = '#fff'; g.shadowColor = '#22d3ee'; g.shadowBlur = 12 * k; g.beginPath(); g.arc(p.x, p.y, 3.2, 0, TAU); g.fill(); g.globalAlpha = .5 * k; g.strokeStyle = '#22d3ee'; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x, p.y, 7 + 2 * k, 0, TAU); g.stroke(); g.restore(); }
};

// ---- telegraphs: a charge-up glow at the muzzle before every enemy shot; bigger for signature volleys ----
const _renderY = render;
render = function () {
  const r = _renderY.apply(this, arguments);
  try {
    if (G.scene === 'play' && G.run && SET.tele !== false) {
      const g = fx; g.save();
      for (const e of G.ent.en) {
        if (e.dead || e.hide || !e.d.f || e.boss || e.x > V.W - 24) continue;
        const lead = 26, f = e.fcd; if (typeof f !== 'number' || f > lead || f <= 0) continue;
        const k = 1 - f / lead, sig = e.d.elite && ((e.sigN | 0) + 1) % 3 === 0, x = e.x - e.w * .3, y = e.y, rad = (sig ? 34 : 16) * (1 - k) + 4;
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = .45 + .55 * k; g.strokeStyle = sig ? '#ff3b5c' : '#ff8a5c'; g.lineWidth = sig ? 4 : 3; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.stroke();
        const gr = g.createRadialGradient(x, y, 0, x, y, 10 + 8 * k); gr.addColorStop(0, 'rgba(255,240,220,' + (.9 * k) + ')'); gr.addColorStop(1, 'rgba(255,60,60,0)'); g.fillStyle = gr; g.globalAlpha = 1; g.beginPath(); g.arc(x, y, 10 + 8 * k, 0, TAU); g.fill();
        if (sig && k > .3) { g.globalCompositeOperation = 'source-over'; g.globalAlpha = k; g.font = '900 13px ui-monospace,monospace'; g.fillStyle = '#ffd1d9'; g.textAlign = 'center'; g.fillText(SIGP[G.run.w % 4].nm + '!', e.x, e.y - e.w * .5 - 8); }
      }
      g.restore();
    }
  } catch (er) { }
  return r;
};
try { if (SETS.GAMEPLAY && !SETS.GAMEPLAY.some(r => r[0] === 'tele')) SETS.GAMEPLAY.push(['tele', 'tog', 'Shot warnings', 'A glow charges up where an enemy is about to fire']); if (SET.tele === undefined) SET.tele = true; } catch (e) { }
