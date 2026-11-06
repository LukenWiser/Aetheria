// ================= hidden dev console =================
// Type the word on the keyboard while on the main menu to open it. Nothing in the menus points here.
const DEVW = 'devmode';
const DEV = { buf: '', tab: 'run', on: () => !!SAVE.dvx };
document.addEventListener('keydown', e => {
  const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  if (e.key && e.key.length === 1) { DEV.buf = (DEV.buf + e.key.toLowerCase()).slice(-DEVW.length); if (DEV.buf === DEVW && UI.top === 'scMenu' && G.scene !== 'play') { DEV.buf = ''; const first = !SAVE.dvx; SAVE.dvx = 1; saveGame(); if (first) { SFX.buy(); toast('DEV MODE', 'Unlocked. Type the word again on the main menu to reopen, F1 in a run for hotkeys.', '#fbbf24'); } UI.show('scDev'); } }
  if (!SAVE.dvx || G.scene !== 'play' || !G.run) return;
  const hk = DEV.HK[e.code]; if (hk) { e.preventDefault(); try { hk[1](); } catch (er) { console.warn(er); } }
}, true);

// ---------- actions ----------
const dvMsg = m => { alertMsg(m); SFX.click && SFX.click(); };
const P0 = () => SAVE.pl[0];
const DVA = {
  // economy
  c1k() { SAVE.cores += 1000; }, c10k() { SAVE.cores += 10000; }, c100k() { SAVE.cores += 100000; }, c0() { SAVE.cores = 0; },
  econ(a) { const v = +a; ECON = v; SAVE.dvEcon = v; dvMsg('CORE INCOME x' + v); },
  // ship
  upmax() { SAVE.pl.forEach(pl => Object.keys(UPG).forEach(k => { pl.up[k] = UPG[k].max; })); dvMsg('ALL UPGRADES MAXED'); },
  up0() { SAVE.pl.forEach(pl => Object.keys(UPG).forEach(k => { pl.up[k] = 0; })); dvMsg('UPGRADES RESET'); },
  wall() { SAVE.pl.forEach(pl => { pl.wown = Object.keys(WPN); pl.wlv = pl.wlv || {}; pl.wevo = pl.wevo || {}; Object.keys(WPN).forEach(id => { pl.wlv[id] = WMAXLV; pl.wevo[id] = true; }); }); dvMsg('ALL GUNS OWNED, MAXED + EVOLVED'); },
  w0() { SAVE.pl.forEach(pl => { pl.wown = ['twin']; pl.wpn = 'twin'; pl.wlv = {}; pl.wevo = {}; }); dvMsg('GUNS RESET TO TWIN PULSE'); },
  parts() { SAVE.pl.forEach(pl => Object.keys(PARTS).forEach(k => { pl.own[k] = Object.keys(PARTS[k]); })); dvMsg('ALL HULLS + PARTS OWNED'); },
  cos() { try { Object.keys(COS).forEach(c => Object.keys(COS[c]).forEach(id => grant(c, id))); } catch (e) { } dvMsg('ALL COSMETICS OWNED'); },
  // progress
  worlds() { SAVE.wu = WORLDS.length; WORLDS.forEach((_, i) => { prog(i).t = 3; }); dvMsg('ALL WORLDS + TIERS OPEN'); },
  sectors() { SAVE.devAll = !SAVE.devAll; dvMsg(SAVE.devAll ? 'ALL SECTORS OPEN (BOSS SECTORS SKIP TO BOSS)' : 'SECTORS NORMAL'); },
  stars() { WORLDS.forEach((_, w) => { const p = prog(w); for (let t = 0; t < 3; t++) { const a = p.done[t] || (p.done[t] = []); for (let i = 0; i < LV; i++) a[i] = 3; } p.t = 3; }); SAVE.wu = WORLDS.length; dvMsg('EVERY SECTOR CLEARED WITH 3 STARS'); },
  ach() { ACH.forEach(a => { SAVE.ach[a.id] = SAVE.ach[a.id] || Date.now(); }); dvMsg('ALL ACHIEVEMENTS'); },
  vex() { const S = ST(); S.vex = {}; S.riv = 0; dvMsg('VEX MEETINGS RESET'); },
  tut() { SAVE.tut = false; G._tutAsked = 0; dvMsg('TUTORIAL WILL ASK AGAIN'); },
  // balance switches (V55-V58)
  scale() { SET.scaleThreat = SET.scaleThreat === false; saveSet(); dvMsg('THREAT SCALING ' + (SET.scaleThreat !== false ? 'ON' : 'OFF')); },
  floor() { SAVE.dvNoFloor = !SAVE.dvNoFloor; dvMsg('BULLET 1/3 HULL RULE ' + (SAVE.dvNoFloor ? 'OFF' : 'ON')); },
  regen() { SAVE.dvRegen = !SAVE.dvRegen; dvMsg('OLD SHIELD REGEN ' + (SAVE.dvRegen ? 'ON' : 'OFF')); },
  // screens
  intro() { UI.hideAll(); try { introPlay(); } catch (e) { } },
  pick() { UI.show('scPick'); },
  slots() { UI.show('scSlots'); },
  lock() { SAVE.dvx = 0; SAVE.devAll = false; G.god = false; G.devOHK = 0; G.devTs = 1; saveGame(); UI.hist = []; UI.show('scMenu', true); dvMsg('DEV MODE HIDDEN'); return 1; },
  // in-run
  god() { G.god = !G.god; dvMsg('GOD MODE ' + (G.god ? 'ON' : 'OFF')); },
  ohk() { G.devOHK = !G.devOHK; G.pdm = G.devOHK ? 999 : 1; dvMsg('ONE-HIT KILLS ' + (G.devOHK ? 'ON' : 'OFF')); },
  ammo() { if (G.run) { G.run.freeAmmo = !G.run.freeAmmo; dvMsg('INFINITE PLASMA ' + (G.run.freeAmmo ? 'ON' : 'OFF')); } },
  heal() { G.players.forEach(p => { if (!p.alive) return; p.hp = p.mhp; p.sh = p.msh; p.am = p.mam; }); dvMsg('FULL REPAIR'); },
  last() { G.players.forEach(p => { if (!p.alive) return; p.sh = 0; p.hp = Math.max(1, Math.round(p.mhp * .1)); }); dvMsg('ONE HIT FROM DEATH'); },
  hit() { const p = G.players[0]; if (p && p.alive) { const g = G.god; G.god = false; p.inv = 0; hurt(p, bulletDmg(p, 5), 'b'); G.god = g; } },
  power() { G.players.forEach(p => { p.sup = 100; p.abCd = 0; p.od = 600; }); dvMsg('SUPER + ABILITY + OVERDRIVE'); },
  kill() { G.ent.en.slice().forEach(e => { if (!e.dead && !e.boss) { e.hp = 0; killEnemy(e, 0); } }); G.ent.eb.length = 0; dvMsg('ENEMIES CLEARED'); },
  wave() { const R = G.run; if (!R) return; DVA.kill(); R.q = []; if (R.stage === 'wave') { R.wave++; nextStage(R, R.wave >= R.waves ? (R.spec && R.spec.type === 'B' ? 'boss' : 'clear') : 'wave', true); } dvMsg('WAVE SKIPPED'); },
  boss() { if (G.run && !G.run.boss) { G.run.stage = 'boss'; spawnBoss(G.run.w); dvMsg('BOSS SPAWNED'); } },
  bosshp() { const b = G.run && G.run.boss; if (b && !b.dead) { b.hp = Math.max(1, b.mhp * .1); dvMsg('BOSS AT 10%'); } },
  win() { const R = G.run; if (!R) return; G.players.forEach(p => { p.inv = 99999; }); if (R.boss) R.boss.hp = 1; R.stage = 'clear'; R.st = 190; if (G.paused) togglePause(); dvMsg('LEVEL WON'); },
  elite() { const R = G.run; if (!R) return; const ro = WORLDS[R.w].ro, e = mkEnemy(ro[ro.length - 1], V.W - 60, V.H / 2, { elite: 1 }); if (e && G.ent.en.indexOf(e) < 0) G.ent.en.push(e); dvMsg('ELITE SPAWNED'); },
  drops() { const p = G.players[0]; if (!p) return; ['hp', 'sh', 'ammo', 'od', 'core', 'core', 'core'].forEach((k, i) => G.ent.pk.push({ k, v: 25, x: p.x + 120 + i * 30, y: p.y + (i % 2 ? 30 : -30), vx: -.4, vy: 0, l: 900 })); dvMsg('PICKUPS DROPPED'); },
  cards() { if (G.run && offerCards()) { dvMsg('CARD PICK'); } },
  slow() { G.devTs = (G.devTs || 1) === 1 ? .35 : (G.devTs === .35 ? 2 : 1); dvMsg('ENEMY SPEED x' + G.devTs); },
  hbox() { SET.hitbox = !SET.hitbox; saveSet(); dvMsg('HITBOXES ' + (SET.hitbox ? 'ON' : 'OFF')); },
  hud() { const h = $('hud'); h.style.visibility = h.style.visibility === 'hidden' ? '' : 'hidden'; },
  fps() { const f = $('fps'); f.style.display = f.style.display === 'block' ? 'none' : 'block'; G.devFps = f.style.display === 'block'; },
  info() { DEV.info = !DEV.info; }
};
DEV.HK = {
  F1: ['Hotkey list', () => toast('DEV HOTKEYS', Object.entries(DEV.HK).map(([k, v]) => k + ' ' + v[0]).join(' / '), '#fbbf24')],
  F2: ['God mode', DVA.god], F3: ['Full repair', DVA.heal], F4: ['Kill all', DVA.kill], F6: ['Skip wave', DVA.wave], F7: ['Spawn boss', DVA.boss],
  F8: ['Super + ability', DVA.power], F9: ['Enemy speed', DVA.slow], F10: ['Win level', DVA.win], Backquote: ['Live stats', DVA.info], Backslash: ['One-hit kills', DVA.ohk]
};

// ---------- the screen ----------
const dvB = (act, lbl, on) => '<button class="btn sm' + (on ? ' gold' : '') + '" data-act="dv:' + act + '">' + lbl + (on === undefined ? '' : on ? ' - ON' : ' - OFF') + '</button>';
const dvSec = (t, b) => '<div class="xs b" style="letter-spacing:.2em;color:#fbbf24;margin:12px 0 6px">' + t + '</div><div class="row wrap" style="gap:6px">' + b + '</div>';
Object.assign(SCR, {
  scDev: () => {
    const tabs = [['run', 'IN-RUN'], ['eco', 'ECONOMY'], ['ship', 'SHIP'], ['prog', 'PROGRESS'], ['bal', 'BALANCE'], ['misc', 'MISC']], T = DEV.tab, inRun = G.scene === 'play' && !!G.run;
    let b = '';
    if (T === 'run') b = (inRun ? '' : '<p class="xs mut">Start a run, pause, and open DEV from the pause menu - or use the F-key hotkeys while playing.</p>')
      + dvSec('PLAYER', dvB('god', 'GOD MODE', !!G.god) + dvB('ohk', 'ONE-HIT KILLS', !!G.devOHK) + dvB('ammo', 'INFINITE PLASMA', !!(G.run && G.run.freeAmmo)) + dvB('heal', 'FULL REPAIR') + dvB('power', 'SUPER + ABILITY + OVERDRIVE'))
      + dvSec('TEST THE NEW STUFF', dvB('hit', 'TAKE A BULLET') + dvB('last', 'SET TO ONE HIT LEFT') + dvB('drops', 'DROP PICKUPS') + dvB('cards', 'OFFER CARDS'))
      + dvSec('LEVEL', dvB('kill', 'KILL ALL') + dvB('wave', 'SKIP WAVE') + dvB('elite', 'SPAWN ELITE') + dvB('boss', 'SPAWN BOSS') + dvB('bosshp', 'BOSS TO 10%') + dvB('win', 'WIN LEVEL'))
      + dvSec('VIEW', dvB('slow', 'ENEMY SPEED x' + (G.devTs || 1)) + dvB('hbox', 'HITBOXES', !!SET.hitbox) + dvB('hud', 'HIDE HUD') + dvB('fps', 'FPS', !!G.devFps) + dvB('info', 'LIVE STATS', !!DEV.info));
    if (T === 'eco') b = dvSec('CORES (' + fmt(SAVE.cores) + ')', dvB('c1k', '+1,000') + dvB('c10k', '+10,000') + dvB('c100k', '+100,000') + dvB('c0', 'SET TO 0'))
      + dvSec('CORE INCOME MULTIPLIER (NOW x' + ECON + ', SHIPPED x0.5)', [.25, .5, 1, 2, 5].map(v => dvB('econ:' + v, 'x' + v, ECON === v ? true : undefined)).join(''));
    if (T === 'ship') b = dvSec('UPGRADES', dvB('upmax', 'MAX ALL') + dvB('up0', 'RESET ALL')) + dvSec('GUNS', dvB('wall', 'OWN + MAX + EVOLVE ALL') + dvB('w0', 'RESET TO TWIN')) + dvSec('UNLOCKS', dvB('parts', 'ALL HULLS + PARTS') + dvB('cos', 'ALL COSMETICS'))
      + dvSec('YOUR SHIP RIGHT NOW', '<div class="xs mut" style="line-height:1.7">' + (() => { const s = shipStats(P0()); return 'HULL ' + s.hp + ' / SHIELD ' + s.sh + ' / DMG x' + s.dmg.toFixed(2) + ' / RATE x' + s.rate.toFixed(2) + '<br>Each bullet takes at least ' + Math.round(s.hp / 3) + ' (one third of hull)'; })() + '</div>');
    if (T === 'prog') b = dvSec('UNLOCK', dvB('worlds', 'ALL WORLDS + TIERS') + dvB('sectors', 'ALL SECTORS', !!SAVE.devAll) + dvB('stars', '3-STAR EVERYTHING') + dvB('ach', 'ALL ACHIEVEMENTS'))
      + dvSec('RESET', dvB('vex', 'VEX MEETINGS') + dvB('tut', 'TUTORIAL PROMPT'));
    if (T === 'bal') b = dvSec('V55-V58 RULES', dvB('scale', 'THREAT SCALING', SET.scaleThreat !== false) + dvB('floor', 'BULLET = 1/3 HULL', !SAVE.dvNoFloor) + dvB('regen', 'OLD SHIELD REGEN', !!SAVE.dvRegen))
      + dvSec('THREAT SCALING PREVIEW (YOUR SHIP)', '<div class="xs mut" style="line-height:1.7;columns:2">' + WORLDS.map((W, w) => { const c = BAL.calc(P0(), w); return 'W' + (w + 1) + ' hull x' + c.hp.toFixed(2) + ' dmg x' + c.ed.toFixed(2); }).join('<br>') + '</div>');
    if (T === 'misc') b = dvSec('SCREENS', dvB('intro', 'REPLAY INTRO') + dvB('pick', 'PROFILE PICKER') + dvB('slots', 'SAVE SLOTS')) + dvSec('HOTKEYS IN A RUN', '<div class="xs mut" style="line-height:1.7">' + Object.entries(DEV.HK).map(([k, v]) => '<b style="color:#fbbf24">' + k.replace('Backquote', '`').replace('Backslash', '\\') + '</b> ' + v[0]).join('<br>') + '</div>') + dvSec('HIDE', dvB('lock', 'HIDE DEV MODE AGAIN'));
    return '<div class="card wide" style="border-color:rgba(251,191,36,.5)"><div class="row sp wrap"><h2 style="color:#fbbf24">Dev Console</h2><span class="xs mut">PROFILE ' + (SLOT + 1) + '</span></div><div class="seg" style="margin:8px 0">' + tabs.map(([k, n]) => '<button class="' + (k === T ? 'on' : '') + '" data-act="dvtab:' + k + '">' + n + '</button>').join('') + '</div>' + b + '<div class="row" style="gap:8px;margin-top:14px"><button class="btn" data-act="back">BACK</button></div></div>';
  }
});
Object.assign(ACT, {
  dv(a) { if (!SAVE.dvx) return; const f = DVA[a[0]]; if (!f) return; const stop = f(a[1]); saveGame(); if (!stop && UI.top === 'scDev') UI.refresh(); },
  dvtab(a) { DEV.tab = a[0]; UI.refresh(); },
  dvopen() { if (SAVE.dvx) UI.show('scDev'); }
});
try { SHIPROOM.scDev = 'eng'; } catch (e) { }

// remembered income multiplier
if (SAVE.dvx && SAVE.dvEcon) ECON = SAVE.dvEcon;
const _sw = switchSlot; switchSlot = function () { const r = _sw.apply(this, arguments); ECON = SAVE.dvx && SAVE.dvEcon ? SAVE.dvEcon : .5; return r; };

// bullet floor switch
const _bd = bulletDmg; bulletDmg = function (p, d) { return SAVE.dvx && SAVE.dvNoFloor ? d : _bd(p, d); };

// live loop: old shield regen, enemy speed, stats readout, DEV tag
(function () {
  const tag = document.createElement('div'); tag.style.cssText = 'position:absolute;left:50%;bottom:calc(6px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:13;pointer-events:none;font:800 9px var(--mono);letter-spacing:.18em;color:#fbbf24;text-shadow:0 1px 0 #000;display:none;text-align:center;white-space:pre';
  const hookUI = () => { const u = document.getElementById('ui'); if (u && !tag.parentNode) u.appendChild(tag); };
  let last = 0;
  (function loop(now) {
    requestAnimationFrame(loop); hookUI();
    const play = SAVE.dvx && G.scene === 'play' && G.run;
    if (play && !G.paused) {
      if (SAVE.dvRegen) G.players.forEach(p => { if (p.alive && p.lastHit > 200 && p.sh < p.msh) p.sh = Math.min(p.msh, p.sh + .22); });
      if (G.devOHK) G.pdm = 999;
    }
    if (now - last < 200) return; last = now;
    if (!play) { tag.style.display = 'none'; return; }
    const on = [G.god && 'GOD', G.devOHK && 'OHK', G.run.freeAmmo && 'INF', G.devTs && G.devTs !== 1 && 'SPD x' + G.devTs, SAVE.dvNoFloor && 'NO-FLOOR', SAVE.dvRegen && 'REGEN', SET.scaleThreat === false && 'NO-SCALE', ECON !== .5 && 'ECON x' + ECON].filter(Boolean);
    let s = 'DEV' + (on.length ? ' | ' + on.join(' | ') : '') + '  (F1 HOTKEYS)';
    if (DEV.info) { const R = G.run, p = G.players[0], b = R.bal || { hp: 1, ed: 1 }; s += '\nW' + (R.w + 1) + ' S' + (R.lv + 1) + ' T' + R.tier + ' ' + R.stage.toUpperCase() + ' wave ' + (R.wave + 1) + '/' + R.waves + ' | enemy hp x' + (R.hpm || 1).toFixed(2) + ' dmg x' + (R.edm || 1).toFixed(2) + ' (scaling ' + b.hp.toFixed(2) + '/' + b.ed.toFixed(2) + ')' + '\nenemies ' + G.ent.en.length + ' bullets ' + G.ent.eb.length + ' pickups ' + G.ent.pk.length + ' | hits left ' + (p ? hitsLeft(p) : '-') + ' | run cores ' + (R.cores | 0); }
    tag.textContent = s; tag.style.display = 'block';
  })(performance.now());
})();
