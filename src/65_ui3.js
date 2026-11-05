// ================= UI: boss gallery, new modes, route icons =================
Object.assign(ICO, { g: ICO.coin, x: ICO.skull });
Object.assign(MODES, {
  gallery: { nm: 'Boss Gallery', ds: 'Rematch any boss you have beaten. Stack modifiers for bigger rewards.', ic: 'skull', cat: 1 },
  hardcore: { nm: 'Hardcore', ds: 'One life. Random sectors from every world you have unlocked. Upgrades carry forward until you fall.', ic: 'bolt', cat: 1 },
  retro: { nm: '1-UP', ds: 'A world from another era. Insert coin.', ic: 'ring', cat: 1, secret: 1, hint: 'Five rifts flicker somewhere in the campaign. Shoot what flickers. Find three.' }
});
const GAL = { w: 0, mods: [] };
Object.assign(SCR, {
  scGallery: () => {
    const hi = SAVE.hi.gal || {}, mult = galleryMult(GAL.mods);
    const cards = BOSSES.map((B, w) => { if (w >= WORLDS.length) return ''; const ok = bossBeaten(w), h = hi[w];
      if (!ok) return '<div class="gcard lk"><b>???</b><span>World ' + (w + 1) + '</span></div>';
      return '<div class="gcard' + (GAL.w === w ? ' sel' : '') + '" data-act="galw:' + w + '"><b style="color:' + WORLDS[w].ac + '">' + B.nm + '</b><span>World ' + (w + 1) + ' - ' + WORLDS[w].nm + '</span>' + (h ? '<em>BEST ' + h.t + 's - ' + (h.m | 0) + ' MODS</em>' : '<em>NOT REMATCHED</em>') + '</div>'; }).join('');
    const mods = Object.keys(GMODS).map(k => { const on = GAL.mods.indexOf(k) >= 0; return '<div class="opt' + (on ? ' sel' : '') + '" data-act="galm:' + k + '"><b>' + GMODS[k].nm + '</b><span>' + GMODS[k].ds + '</span><span class="gold b">+' + Math.round(GMODS[k].m * 100) + '% REWARD' + (on ? ' - ON' : '') + '</span></div>'; }).join('');
    const can = bossBeaten(GAL.w);
    return '<div class="card wide"><div class="row sp wrap"><h2>Boss Gallery</h2><span class="gold b">REWARD x' + mult.toFixed(1) + '</span></div><div class="xs mut" style="margin:4px 0 10px">Pick a boss you have beaten, add modifiers, and fight it again.</div><div class="ggrid">' + cards + '</div><div class="xs mut b" style="letter-spacing:.14em;margin:14px 0 6px">MODIFIERS</div><div class="grid3 gmods">' + mods + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn big' + (can ? '' : ' off') + '" data-act="galgo">FIGHT ' + (can ? BOSSES[GAL.w].nm.toUpperCase() : '') + '</button></div></div>';
  }
});
const _mode = ACT.mode;
Object.assign(ACT, {
  mode(a) {
    const m = a[0];
    if (m === 'gallery') { if (!bossBeaten(GAL.w)) { const f = BOSSES.findIndex((_, w) => w < WORLDS.length && bossBeaten(w)); if (f < 0) { SFX.no(); alertMsg('BEAT A BOSS FIRST'); return; } GAL.w = f; } UI.show('scGallery'); return; }
    if (m === 'hardcore') { const o = { mode: 'endless', var: 'hardcore', w: 0, lv: 0, tier: 1, co: SAVE.players === 2 }; G.last = o; beginRun(o); return; }
    if (m === 'retro') { if (!SAVE.unl.retro) { SFX.no(); alertMsg('LOCKED - FIND THREE RIFTS (' + riftsFound() + '/3)'); return; } const o = { mode: 'expedition', var: 'retro', w: 0, lv: 8, tier: 1, co: SAVE.players === 2 }; G.last = o; beginRun(o); return; }
    return _mode(a);
  },
  galw(a) { const w = +a[0]; if (!bossBeaten(w)) return; GAL.w = w; SFX.click(); UI.refresh(); },
  galm(a) { const k = a[0], i = GAL.mods.indexOf(k); if (i >= 0) GAL.mods.splice(i, 1); else GAL.mods.push(k); SFX.click(); UI.refresh(); },
  galgo() { if (!bossBeaten(GAL.w)) { SFX.no(); return; } startGallery(GAL.w, GAL.mods); }
});
