// ================= balance pass (V55): threat scales with how upgraded you are =================
// Each world has an "expected" amount of upgrades. If your ship is stronger than that,
// enemies get tougher (hull) and hit harder, so early sectors stay a fight. Upgrades
// still help: only part of the extra power is cancelled out.
const BAL = {
  // expected upgrade levels for a player arriving at world w
  exp(w) { return { dmg: Math.min(12, w * 1.1), rate: Math.min(10, w * .9), wl: Math.min(WMAXLV, w * .45), ev: w >= 9 ? 1 : 0, hp: Math.min(12, w * 1.1), sh: Math.min(12, w * 1.1), drn: Math.min(3, w * .25) }; },
  off(dmg, rate, wl, ev, drn) { return (1 + dmg * .08) * (1 + rate * .05) * (1 + .12 * wl) * (1 + .04 * wl) * (ev ? 1.4 : 1) * (1 + drn * .18); },
  calc(pl, w) {
    const u = pl.up || {}, e = BAL.exp(w), wl = wlvOf(pl, pl.wpn), ev = wevOf(pl, pl.wpn) ? 1 : 0, st = shipStats(pl);
    const offA = BAL.off(u.dmg | 0, u.rate | 0, wl, ev, u.drn | 0) * st.dmg / (1 + (u.dmg | 0) * .08) * st.rate / (1 + (u.rate | 0) * .05);
    const offE = BAL.off(e.dmg, e.rate, e.wl, e.ev, e.drn);
    const defA = st.hp + st.sh, defE = 80 + e.hp * 20 + 30 + e.sh * 15 + w * 4;
    const ro = offA / offE, rd = defA / defE;
    return { hp: ro > 1.05 ? Math.min(3, Math.pow(ro, .75)) : 1, ed: rd > 1.05 ? Math.min(2.2, Math.pow(rd, .8)) : 1, ro, rd };
  }
};
const _beginBal = beginRun;
beginRun = function (o) {
  const r = _beginBal.apply(this, arguments);
  try {
    const R = G.run;
    if (R && R.mode === 'expedition' && !G.net && SET.scaleThreat !== false) {
      // strongest local player decides
      let best = { hp: 1, ed: 1 };
      G.players.forEach(p => { const b = BAL.calc(p.pl, R.w); if (b.hp * b.ed > best.hp * best.ed) best = b; });
      R.hpm *= best.hp; R.edm *= best.ed; R.bal = best;
      if (best.hp > 1.15 || best.ed > 1.15) setTimeout(() => { if (G.run === R && typeof toast === 'function') toast('THREAT SCALED', 'Your ship outclasses this sector. Enemies +' + Math.round((best.hp - 1) * 100) + '% hull, +' + Math.round((best.ed - 1) * 100) + '% damage.', '#f87171'); }, 900);
    }
  } catch (e) { console.warn('bal', e); }
  return r;
};

// ---------- startup profile picker ----------
Object.assign(SCR, {
  scPick: () => {
    const cards = [0, 1, 2].map(i => {
      const si = slotInfo(i);
      return '<button class="item slot' + (i === SLOT ? ' act' : '') + '" data-act="pickslot:' + i + '" style="width:100%;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer"><span><b>PROFILE ' + (i + 1) + '</b>' + (i === SLOT ? ' <span class="good xs">LAST PLAYED</span>' : '') + '<br><span class="xs mut">' + (si && si.runs ? fmt(si.cores) + ' cores - ' + si.wu + '/' + WORLDS.length + ' worlds - ' + fmtT(si.time) + ' played' : 'Empty - start fresh') + '</span></span><span class="b acc">' + (si && si.runs ? 'CONTINUE' : 'NEW GAME') + '</span></button>';
    }).join('');
    return '<div class="card mid"><div class="title" style="font-size:clamp(20px,5vw,30px)">SELECT PROFILE</div><p class="xs mut tc" style="margin:6px 0 12px">Three separate saves. Manage, delete or transfer them in Settings.</p><div class="stack" style="gap:8px">' + cards + '</div></div>';
  }
});
Object.assign(ACT, {
  pickslot(a) {
    const i = +a[0]; if (i !== SLOT) switchSlot(i); else SFX.click();
    const si = slotInfo(i); if (!si || !store.get(SLOT_KEYS[i])) saveGame();
    UI.hist = []; UI.show(SAVE.tut ? 'scMenu' : 'scTut', true);
  }
});
try { if (typeof SHIPROOM !== 'undefined') SHIPROOM.scPick = 'bridge'; } catch (e) { }
