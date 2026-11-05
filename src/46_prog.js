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
