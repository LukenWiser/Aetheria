// ================= PROFILE: achievements, toasts, secrets, save slots, key rebinding, gamepad navigation =================

// ---------- toasts ----------
function toast(title, sub, col) {
  let box = $('toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const e = document.createElement('div'); e.className = 'toast'; e.style.setProperty('--tc', col || '#22d3ee'); e.innerHTML = '<b>' + title + '</b><span>' + sub + '</span>';
  box.appendChild(e); while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(() => { e.classList.add('out'); setTimeout(() => { if (e.parentNode) e.parentNode.removeChild(e); }, 500); }, 3600);
}

// ---------- achievements ----------
const mkAch = (id, nm, ds, ic, r, cur, max, sec) => ({ id, nm, ds, ic, r, cur, max, sec: !!sec });
const sumStars = () => { let n = 0; for (const w in SAVE.prog) for (const t of SAVE.prog[w].done) if (t) for (const s of t) if (s === 3) n++; return n; };
const STDHULLS = ['falcon', 'vanguard', 'phantom', 'titan', 'nova'];
const ACH = [
  mkAch('first', 'First Blood', 'Destroy your first enemy.', 'target', 50, () => SAVE.st.kills, 1),
  mkAch('k100', 'Centurion', 'Destroy 100 enemies.', 'target', 80, () => SAVE.st.kills, 100),
  mkAch('k1k', 'Exterminator', 'Destroy 1,000 enemies.', 'blast', 200, () => SAVE.st.kills, 1000),
  mkAch('k10k', 'Extinction Event', 'Destroy 10,000 enemies.', 'skull', 600, () => SAVE.st.kills, 10000),
  mkAch('boss1', 'Giant Slayer', 'Defeat a boss.', 'skull', 100, () => SAVE.st.bosses, 1),
  mkAch('boss10', 'Dread Hunter', 'Defeat 10 bosses.', 'skull', 300, () => SAVE.st.bosses, 10),
  mkAch('w5', 'World Walker', 'Unlock the 5th world.', 'map', 150, () => SAVE.wu, 5),
  mkAch('w10', 'Conqueror', 'Defeat the boss of the 10th world.', 'B', 500, () => { const p = SAVE.prog[9]; return p && p.done[0] && p.done[0][12] ? 1 : 0; }, 1),
  mkAch('stars', 'Perfectionist', 'Earn 3 stars on 10 sectors.', 'star', 250, sumStars, 10),
  mkAch('s1', 'Rank S', 'Earn an S rank.', 'star', 100, () => SAVE.st.ranks.S, 1),
  mkAch('s10', 'Ace Pilot', 'Earn 10 S ranks.', 'nova', 400, () => SAVE.st.ranks.S, 10),
  mkAch('gz500', 'Close Shave', 'Graze 500 enemy shots.', 'graze', 100, () => SAVE.st.graze, 500),
  mkAch('gz5k', 'Daredevil', 'Graze 5,000 enemy shots.', 'graze', 300, () => SAVE.st.graze, 5000),
  mkAch('cb30', 'Chain Reaction', 'Reach a 30-kill chain.', 'chain', 100, () => SAVE.st.combo, 30),
  mkAch('cb80', 'Unbroken', 'Reach an 80-kill chain.', 'chain', 300, () => SAVE.st.combo, 80),
  mkAch('cards25', 'Card Shark', 'Pick 25 upgrade cards.', 'multi', 100, () => SAVE.st.cards, 25),
  mkAch('deck8', 'Full Deck', 'Hold 8 different cards in one run.', 'multi', 200, () => SAVE.flags.deck8 ? 1 : 0, 1),
  mkAch('evo', 'Evolved', 'Evolve a weapon.', 'dmg', 250, () => SAVE.pl.some(pl => Object.keys(pl.wevo || {}).some(k => pl.wevo[k])) ? 1 : 0, 1),
  mkAch('armada', 'Armada', 'Own 3 wingman drones at once.', 'drn', 200, () => SAVE.pl[0].up.drn, 3),
  mkAch('maker', 'Maker', 'Beat a custom level or boss you built.', 'map', 300, () => (SAVE.st.custom | 0) ? 1 : 0, 1),
  mkAch('crash', 'Have You Tried Turning It Off', 'Survive the AetherOS crash.', 'bolt', 1200, () => SAVE.flags.crash ? 1 : 0, 1, 1),
  mkAch('clean', 'Antivirus', 'Cleanse 10 corrupted sectors.', 'sh', 800, () => Object.keys(SAVE.flags.clean || {}).length, 10),
  mkAch('w17', 'The True Ending', 'Defeat Aetheria Prime.', 'B', 3000, () => SAVE.flags.trueEnd ? 1 : 0, 1),
  mkAch('vex', 'Wingmate', 'Win Vex over to your side.', 'wing', 800, () => SAVE.story && SAVE.story.ally ? 1 : 0, 1, 1),
  mkAch('lv10', 'Rising Star', 'Reach pilot level 10.', 'target', 300, () => (SAVE.xp || { lv: 1 }).lv, 10),
  mkAch('lv30', 'Top Brass', 'Reach pilot level 30.', 'target', 900, () => (SAVE.xp || { lv: 1 }).lv, 30),
  mkAch('logs', 'Archivist', 'Collect every data log.', 'map', 800, () => Object.keys(SAVE.logs || {}).length, 16),
  mkAch('master', 'Weapon Master', 'Reach GOLD mastery with any gun.', 'bolt', 500, () => Object.keys(SAVE.wm || {}).some(k => (SAVE.wm[k] | 0) >= 400) ? 1 : 0, 1),
  mkAch('medals', 'Decorated', 'Earn 20 gold or platinum medals.', 'ring', 600, () => Object.values(SAVE.md || {}).filter(v => v >= 3).length, 20),
  mkAch('rifts', 'Rift Walker', 'Find all five hidden rifts.', 'ring', 800, () => riftsFound(), 5),
  mkAch('retro', 'Insert Coin', 'Beat the 1-UP retro world.', 'coin', 600, () => SAVE.flags.retro ? 1 : 0, 1, 1),
  mkAch('hc20', 'Iron Will', 'Reach wave 20 in Hardcore.', 'bolt', 700, () => (SAVE.hi.hc || {}).wave | 0, 20),
  mkAch('gal4', 'Showoff', 'Win a boss rematch with 4 or more modifiers.', 'skull', 600, () => SAVE.flags.gal4 ? 1 : 0, 1),
  mkAch('routes', 'Off the Map', 'Clear 5 side routes.', 'map', 300, () => Object.keys(SAVE.flags.alt || {}).length, 5),
  mkAch('parry', 'Untouchable', 'Parry 25 enemy shots.', 'sh', 300, () => SAVE.st.parry | 0, 25),
  mkAch('gold', 'Gold Rush', 'Hunt down 5 golden elites.', 'coin', 400, () => SAVE.st.gold | 0, 5),
  mkAch('super', 'Nova Beam', 'Unleash 10 super finishers.', 'bolt', 250, () => SAVE.st.supers | 0, 10),
  mkAch('hulls', 'Hangar Queen', 'Own all five standard hulls.', 'wing', 300, () => STDHULLS.filter(h => SAVE.pl[0].own.hull.indexOf(h) >= 0).length, 5),
  mkAch('rich', 'Core Hoarder', 'Hold 10,000 cores at once.', 'coin', 200, () => SAVE.cores, 10000),
  mkAch('coop', 'Wingmates', 'Win a run in 2-player co-op.', 'e', 100, () => SAVE.flags.coop ? 1 : 0, 1),
  mkAch('end20', 'Marathon', 'Reach wave 20 in Endless.', 'inf', 250, () => SAVE.hi.endless.wave, 20),
  mkAch('end30', 'Ironwall', 'Reach wave 30 in Endless.', 'inf', 400, () => SAVE.hi.endless.wave, 30),
  mkAch('blitz', 'Speed Demon', 'Score 20,000 in Blitz.', 'bolt', 250, () => SAVE.hi.blitz.score, 20000),
  mkAch('rush', 'Gauntlet', 'Finish a Boss Rush.', 'skull', 400, () => SAVE.hi.rush.time > 0 ? 1 : 0, 1),
  mkAch('daily', 'Daily Driver', 'Win a Daily Challenge.', 'clock', 150, () => SAVE.flags.daily ? 1 : 0, 1),
  mkAch('daily3', 'On a Roll', 'Win Daily Challenges 3 days in a row.', 'clock', 300, () => SAVE.dl.streak, 3),
  mkAch('def5', 'Station Keeper', 'Reach wave 5 in Station Defense.', 'sh', 150, () => SAVE.hi.def.wave, 5),
  mkAch('defwin', 'Fortress', 'Win a Station Defense.', 'armor', 400, () => SAVE.flags.defwin ? 1 : 0, 1),
  mkAch('tier2', 'Higher Tier', 'Unlock Tier 2 on any world.', 'B', 200, () => Object.keys(SAVE.prog).some(w => SAVE.prog[w].t >= 2) ? 1 : 0, 1),
  mkAch('close', 'Close Call', 'Win a sector with under 10% hull left.', 'hp', 150, () => SAVE.flags.close ? 1 : 0, 1),
  mkAch('untouch', 'Untouchable', 'Defeat a boss without taking a single hit.', 'ring', 400, () => SAVE.flags.untouch ? 1 : 0, 1, true),
  mkAch('ghost', 'Ghost Run', 'Clear a No-Hit run.', 'nova', 500, () => SAVE.flags.nohit ? 1 : 0, 1, true),
  mkAch('vault', 'Vault Cracker', 'Crack the Vault.', 'coin', 600, () => SAVE.flags.vault ? 1 : 0, 1, true),
  mkAch('remix2', 'Remix Pilot', 'Clear any sector on Tier 2.', 'B', 200, () => Object.keys(SAVE.prog).some(w => (SAVE.prog[w].done[1] || []).some(x => x)) ? 1 : 0, 1),
  mkAch('remix3', 'Nightmare Fuel', 'Defeat a boss on Tier 3.', 'skull', 500, () => Object.keys(SAVE.prog).some(w => SAVE.prog[w].done[2] && SAVE.prog[w].done[2][12]) ? 1 : 0, 1),
  mkAch('w15', 'Heart of the Machine', 'Defeat The Aetheria Core.', 'B', 1000, () => { const p = SAVE.prog[14]; return p && p.done[0] && p.done[0][12] ? 1 : 0; }, 1),
  mkAch('w15u', 'Deep Space', 'Unlock the 15th world.', 'map', 300, () => SAVE.wu, 15),
  mkAch('w16u', 'Glitch in the System', 'Find World 16: The Glitch.', 'map', 400, () => SAVE.wu, 16),
  mkAch('w16', 'Patch Notes', 'Defeat The Null Process.', 'B', 1500, () => { const p = SAVE.prog[15]; return p && p.done[0] && p.done[0][12] ? 1 : 0; }, 1),
  mkAch('all', 'Completionist', 'Earn every other achievement.', 'star', 1000, () => ACH.filter(a => a.id !== 'all' && SAVE.ach[a.id]).length, 1, true)
];
ACH[ACH.length - 1].max = ACH.length - 1;
let achBusy = false;
function achScan() {
  if (achBusy || !SAVE) return; achBusy = true;
  try { checkUnlocks(); for (const a of ACH) if (!SAVE.ach[a.id] && a.cur() >= a.max) unlockAch(a); } finally { achBusy = false; }
}
function unlockAch(a) {
  SAVE.ach[a.id] = Date.now(); SAVE.cores += a.r; toast('ACHIEVEMENT: ' + a.nm.toUpperCase(), a.ds + '  +' + a.r + ' cores', '#fbbf24'); SFX.power();
  store.set(SAVE_KEY, JSON.stringify(SAVE));
}
// secrets: things that appear once a hidden requirement is met
function checkUnlocks() {
  for (let w = 0; w < WORLDS.length - 1; w++) { const p = SAVE.prog[w]; if (p && p.done[0] && p.done[0][12] && SAVE.wu < w + 2) SAVE.wu = w + 2; }
  if (!SAVE.unl.vault && SAVE.st.ranks.S + SAVE.st.ranks.A >= 6) { SAVE.unl.vault = 1; toast('SECRET FOUND', 'A new mode just appeared on the mode list.', '#fbbf24'); }
}
const achCount = () => ACH.filter(a => SAVE.ach[a.id]).length;

// ---------- save slots + export / import ----------
function summarize(s, active) { return { cores: s.cores, wu: s.wu, kills: s.st.kills, time: s.st.time | 0, runs: s.st.runs, ach: Object.keys(s.ach || {}).length, active }; }
function slotInfo(i) { if (i === SLOT) return summarize(SAVE, true); const s = jget(SLOT_KEYS[i], null); return s ? summarize(merge(defSave(), s), false) : null; }
function switchSlot(i) {
  if (i === SLOT) return; saveGame(); SLOT = i; SAVE_KEY = SLOT_KEYS[i]; store.set('aetheria_slot', String(i)); SAVE = loadSave(); store.set(SAVE_KEY, JSON.stringify(SAVE));
  UI.pi = 0; UI.w = 0; UI.tier = 1; UI.sel = 0; G.showCfg = null; SFX.click();
}
function deleteSlot(i) { store.del(SLOT_KEYS[i]); if (i === SLOT) { SAVE = loadSave(); store.set(SAVE_KEY, JSON.stringify(SAVE)); } }
function exportCode(i) { const s = i === SLOT ? SAVE : jget(SLOT_KEYS[i], null); if (!s) return ''; return 'AETH1:' + btoa(unescape(encodeURIComponent(JSON.stringify(s)))); }
function importCode(txt, i) {
  try {
    txt = String(txt || '').replace(/\s+/g, ''); if (txt.indexOf('AETH1:') !== 0) return 'That is not an Aetheria save code.';
    const j = JSON.parse(decodeURIComponent(escape(atob(txt.slice(6))))); if (!j || typeof j !== 'object' || !Array.isArray(j.pl) || typeof j.cores !== 'number') return 'This save code looks damaged.';
    const m = merge(defSave(), j); m.pl = [merge(defPlayer(0), j.pl[0] || {}), merge(defPlayer(1), j.pl[1] || {})]; store.set(SLOT_KEYS[i], JSON.stringify(m));
    if (i === SLOT) SAVE = loadSave(); return '';
  } catch (e) { return 'Could not read that code. Copy the whole thing.'; }
}

// ---------- keyboard rebinding ----------
const KACT = [['u', 'Move up'], ['d', 'Move down'], ['l', 'Move left'], ['r', 'Move right'], ['f', 'Fire'], ['a', 'Ability'], ['wl', 'Previous gun'], ['wr', 'Next gun'], ['c', 'Charge / secondary / parry'], ['v', 'Super finisher']];
const KRES = ['Escape', 'KeyP', 'KeyN', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Tab', 'F5', 'F11', 'F12'];
const KLAB = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'SPACE', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT', Enter: 'ENTER', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`', Backspace: 'BKSP', CapsLock: 'CAPS' };
function keyLabel(c) { if (!c) return '-'; if (KLAB[c]) return KLAB[c]; if (c.indexOf('Key') === 0) return c.slice(3); if (c.indexOf('Digit') === 0) return c.slice(5); if (c.indexOf('Numpad') === 0) return 'NUM ' + c.slice(6).toUpperCase(); return c.toUpperCase(); }
function startRebind(pi, a) { G.rebind = { pi, a }; IN.keys = {}; UI.refresh(); }
function keyCaptured(code) {
  const rb = G.rebind; if (!rb) return;
  if (code === 'Escape') { G.rebind = null; UI.refresh(); return; }
  if (KRES.indexOf(code) >= 0) { alertMsg('THAT KEY IS RESERVED'); return; }
  setKey(rb.pi, rb.a, code); G.rebind = null; SFX.buy(); UI.refresh();
}
function setKey(pi, a, code) {
  SET.keys = SET.keys || {}; const old = KB[pi][a][0];
  for (let j = 0; j < 2; j++) for (const b in KDEF[j]) {
    if (j === pi && b === a) continue; const list = KB[j][b]; if (list.indexOf(code) < 0) continue;
    let nl = list.filter(k => k !== code); if (!nl.length) nl = [old]; SET.keys[j + b] = nl;
  }
  SET.keys[pi + a] = [code]; applyKeys(); saveSet();
}
function resetKeys() { SET.keys = {}; applyKeys(); saveSet(); }

// ---------- gamepad menu navigation ----------
function navEls() {
  const root = document.querySelector('.scr.on'); if (!root) return [];
  return Array.from(root.querySelectorAll('[data-act],.tog,select,input[type=range]')).filter(e => { if (e.classList.contains('off') || e.disabled) return false; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; });
}
function navFocus(el) {
  const old = document.querySelector('.gpf'); if (old) old.classList.remove('gpf'); UI.gpf = el || null;
  if (el) { el.classList.add('gpf'); UI.gpfIdx = Math.max(0, navEls().indexOf(el)); UI.gpfOn = true; try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { } }
}
function navRestore() { if (!UI.gpfOn) return; const els = navEls(); if (!els.length) return; navFocus(els[Math.min(UI.gpfIdx | 0, els.length - 1)]); }
function navAdjust(el, d) {
  if (el.type === 'range') { const st = +el.step || 1, v = clamp((+el.value) + d * st, +el.min, +el.max); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.selectedIndex = clamp(el.selectedIndex + d, 0, el.options.length - 1); el.dispatchEvent(new Event('change', { bubbles: true })); }
}
function navCur(els) { return UI.gpf && els.indexOf(UI.gpf) >= 0 ? UI.gpf : null; }
function navMove(dx, dy) {
  const els = navEls(); if (!els.length) return; const cur = navCur(els);
  if (!cur) { navFocus(els.find(e => e.classList.contains('big')) || els[0]); return; }
  if (dx && (cur.type === 'range' || cur.tagName === 'SELECT')) { navAdjust(cur, dx); return; }
  const c = cur.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2; let best = null, bs = 1e12;
  for (const e of els) { if (e === cur) continue; const r = e.getBoundingClientRect(), ex = r.left + r.width / 2 - cx, ey = r.top + r.height / 2 - cy, along = dx ? ex * dx : ey * dy, across = dx ? Math.abs(ey) : Math.abs(ex); if (along <= 4) continue; const sc = along + across * 2.2; if (sc < bs) { bs = sc; best = e; } }
  if (best) { navFocus(best); SFX.click(); }
}
function navAct() {
  const els = navEls(), cur = navCur(els); if (!cur) { navFocus(els.find(e => e.classList.contains('big')) || els[0]); return; }
  if (cur.type === 'range' || cur.tagName === 'SELECT') return; cur.click();
}
function navBack() { if (G.pick || G.rebind) return; if (UI.top) UI.escape(); }
function padNav(o, prev) {
  const nv = { L: o.x < -.6, R: o.x > .6, U: o.y < -.6, D: o.y > .6 }; o.nv = nv; const pv = prev.nv || {};
  if (nv.L && !pv.L) navMove(-1, 0); if (nv.R && !pv.R) navMove(1, 0); if (nv.U && !pv.U) navMove(0, -1); if (nv.D && !pv.D) navMove(0, 1);
  if (o.a0 && !prev.a0) navAct(); if (o.b1 && !prev.b1) navBack();
}
