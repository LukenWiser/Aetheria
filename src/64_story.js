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
  const R = G.run; if (!R || SET.story === 'off' || R.mode !== 'expedition' || R.var || !STORY[wi]) return false;
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
