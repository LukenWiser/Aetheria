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
