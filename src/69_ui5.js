// ================= UI: versus, challenge codes, stats graphs, backups, controller remap, accessibility settings =================
Object.assign(MODES, {
  versus: { nm: 'Versus', ds: 'Two players, two minutes. Most points wins. Getting hit or shot down costs you.', ic: 'target', cat: 1 },
  chal: { nm: 'Challenge Codes', ds: 'Play a code from a friend - same waves, same twist - and try to beat their score.', ic: 'map', cat: 1 }
});
SETS.ACCESS = SETS.ACCESS.concat([['cbp', 'sel', 'Colour-blind palette', 'Recolours enemy fire', [['off', 'Off'], ['dt', 'Red-green safe'], ['tr', 'Blue-yellow safe']]], ['bigb', 'tog', 'Bigger enemy bullets', 'Easier to see (hitboxes stay the same)'], ['hitbox', 'tog', 'Show your hitbox', 'A dot marks the exact spot that can be hit'], ['speed', 'sel', 'Game speed', 'Slow the action down', [[1, '100%'], [.85, '85%'], [.7, '70%']]]]);
SETS.GRAPHICS.push(['autoperf', 'tog', 'Auto performance mode', 'Lowers graphics if the game starts to lag']);
SETS.GAMEPLAY.push(['ghost', 'tog', 'Ghost replays', 'Race your best run of each sector']);
const _mode2 = ACT.mode;
ACT.mode = a => {
  if (a[0] === 'versus') { if (SAVE.players !== 2) { SAVE.players = 2; saveGame(); alertMsg('VERSUS NEEDS 2 PLAYERS - 2P TURNED ON'); } const o = { mode: 'endless', var: 'versus', w: Math.floor(Math.random() * Math.max(1, Math.min(SAVE.wu, 15))), lv: 0, tier: 1, co: true }; G.last = o; beginRun(o); return; }
  if (a[0] === 'chal') { UI.chMsg = ''; UI.show('scChal'); return; }
  return _mode2(a);
};
function svgBars(rows, opt) { // rows: [label, value, colour]
  const W = 520, bh = 18, gap = 6, mx = Math.max(1, ...rows.map(r => r[1])), lw = opt && opt.lw || 110, H = rows.length * (bh + gap);
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block">' + rows.map((r, i) => { const y = i * (bh + gap), w = Math.max(2, (W - lw - 60) * r[1] / mx); return '<text x="' + (lw - 8) + '" y="' + (y + 13) + '" text-anchor="end" fill="#94a3b8" font-size="11" font-family="ui-monospace,monospace">' + escH(String(r[0]).slice(0, 16)) + '</text><rect x="' + lw + '" y="' + y + '" width="' + w + '" height="' + bh + '" rx="4" fill="' + (r[2] || '#38bdf8') + '"/><text x="' + (lw + w + 6) + '" y="' + (y + 13) + '" fill="#e2e8f0" font-size="11" font-family="ui-monospace,monospace">' + fmt(Math.round(r[1])) + '</text>'; }).join('') + '</svg>';
}
function svgRuns(H0) {
  const W = 520, Hh = 120, n = H0.length; if (!n) return '<div class="xs mut">Play a few runs to see your history here.</div>';
  const mx = Math.max(1, ...H0.map(r => r.s)), bw = W / Math.max(n, 10);
  return '<svg viewBox="0 0 ' + W + ' ' + (Hh + 16) + '" style="width:100%;height:auto;display:block"><line x1="0" y1="' + Hh + '" x2="' + W + '" y2="' + Hh + '" stroke="#334155"/>' + H0.map((r, i) => { const h = Math.max(2, (Hh - 6) * r.s / mx); return '<rect x="' + (i * bw + 2) + '" y="' + (Hh - h) + '" width="' + (bw - 4) + '" height="' + h + '" rx="3" fill="' + (r.win ? '#4ade80' : '#fb7185') + '"><title>' + escH(r.m + ' - ' + fmt(r.s)) + '</title></rect>'; }).join('') + '<text x="0" y="' + (Hh + 13) + '" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">OLDER</text><text x="' + W + '" y="' + (Hh + 13) + '" text-anchor="end" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">LATEST - GREEN WIN, RED LOSS</text></svg>';
}
Object.assign(SCR, {
  scChal: () => {
    const c = UI.chPrev; return '<div class="card mid"><h2>Challenge Codes</h2><p class="xs mut" style="margin:6px 0 10px;line-height:1.6">A code locks in a world, a sector, a twist and a random seed, so you and a friend get exactly the same waves. Finish a challenge and you get a new code with your score as the target. Send it back!</p>' +
      '<div class="row" style="gap:8px"><input id="chIn" class="code" style="flex:1;font-size:16px;letter-spacing:.12em;text-transform:uppercase" placeholder="e.g. 3A1-0K9F-5Z7" value="' + escH(UI.chTxt || '') + '"><button class="btn" data-act="chgo">PLAY</button></div><div class="xs ' + ((UI.chMsg || '')[0] === '!' ? 'bad' : 'good') + '" style="margin-top:6px">' + escH((UI.chMsg || '').replace(/^!/, '')) + '</div>' +
      (c ? '<div class="item" style="margin-top:10px;flex-direction:column;align-items:stretch"><div class="b acc">' + c.code + '</div><div class="xs mut" style="margin-top:4px">World ' + (c.w + 1) + ' ' + WORLDS[c.w].nm + ' - sector ' + (c.lv + 1) + ' - ' + (c.mod >= 0 ? DMODS[c.mod].nm : 'no twist') + (c.target ? ' - score to beat ' + fmt(c.target) : '') + '</div></div>' : '') +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm gold" data-act="chrand">MAKE A RANDOM CHALLENGE</button></div></div>';
  },
  scStats: () => {
    const S = SAVE.st, H0 = (SAVE.hist || []).slice(-24), wins = (SAVE.hist || []).filter(r => r.win).length, tot = (SAVE.hist || []).length;
    const wpn = WORDER.map(k => [WPN[k].nm, (SAVE.wm || {})[k] | 0, WPN[k].c]).filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]);
    const hulls = Object.keys(S.hull || {}).map(k => [PARTS.hull[k] ? PARTS.hull[k].nm : k, S.hull[k], '#a78bfa']).sort((a, b) => b[1] - a[1]);
    const stars = WORLDS.map((W, w) => { const d = (prog(w).done[0] || []); return [(w + 1) + '. ' + W.nm, d.reduce((a, x) => a + (x | 0), 0), W.ac]; }).filter((r, w) => w < SAVE.wu);
    const tile = (k, v) => '<div class="st2"><b>' + v + '</b><span>' + k + '</span></div>';
    return '<div class="card wide"><div class="row sp"><h2>Stats</h2>' + rankChip() + '</div><div class="statg2">' + tile('RUNS', fmt(S.runs)) + tile('WIN RATE', tot ? Math.round(wins / tot * 100) + '%' : '-') + tile('KILLS', fmt(S.kills)) + tile('BOSSES', fmt(S.bosses)) + tile('PARRIES', fmt(S.parry | 0)) + tile('SUPERS', fmt(S.supers | 0)) + tile('GOLDEN ELITES', fmt(S.gold | 0)) + tile('PLAY TIME', fmtT(S.time)) + '</div>' +
      '<div class="xs mut b" style="letter-spacing:.14em;margin:14px 0 6px">LAST ' + H0.length + ' RUNS - SCORE</div>' + svgRuns(H0) +
      '<div class="grid2" style="margin-top:12px;align-items:start"><div><div class="xs mut b" style="letter-spacing:.14em;margin-bottom:6px">KILLS BY GUN</div>' + (wpn.length ? svgBars(wpn) : '<div class="xs mut">-</div>') + '</div><div><div class="xs mut b" style="letter-spacing:.14em;margin-bottom:6px">RUNS BY SHIP</div>' + (hulls.length ? svgBars(hulls) : '<div class="xs mut">-</div>') + '</div></div>' +
      '<div class="xs mut b" style="letter-spacing:.14em;margin:12px 0 6px">STARS PER WORLD (MAX 39)</div>' + svgBars(stars, { lw: 150 }) +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button></div></div>';
  }
});
Object.assign(ACT, {
  chgo() { const v = inVal('chIn') || ''; UI.chTxt = v; const c = chParse(v); if (!c) { UI.chMsg = '!That code does not look right. Check it and try again.'; SFX.no(); UI.refresh(); return; } if (c.w >= SAVE.wu) { UI.chMsg = '!You need to unlock World ' + (c.w + 1) + ' first.'; SFX.no(); UI.refresh(); return; } startChallenge(c); },
  chrand() { const c = randChal(); UI.chPrev = c; UI.chTxt = c.code; UI.chMsg = 'New challenge ready - press PLAY, or copy the code for a friend.'; SFX.click(); UI.refresh(); },
  copycode(a) { const c = a[0]; try { navigator.clipboard.writeText(c).then(() => alertMsg('CODE COPIED'), () => alertMsg('CODE: ' + c)); } catch (e) { alertMsg('CODE: ' + c); } },
  stats() { UI.show('scStats'); },
  bkdl() { const code = exportCode(SLOT), name = 'aetheria-backup-' + dayKey() + '.txt'; if (DLNS) DLNS.save({ filename: name, data: code }).then(() => { UI.slotMsg = 'Backup saved.'; UI.refresh(); }).catch(e => { if (!e || e.code !== 'declined') { UI.slotMsg = '!Could not save a file here - use EXPORT and copy the code instead.'; UI.refresh(); } }); else { try { const a = document.createElement('a'); a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(code); a.download = name; document.body.appendChild(a); a.click(); a.remove(); UI.slotMsg = 'Backup saved.'; } catch (e) { UI.slotMsg = '!Could not save a file - use EXPORT instead.'; } UI.refresh(); } },
  bkload() { const i = document.createElement('input'); i.type = 'file'; i.accept = '.txt,text/plain'; i.onchange = () => { const f = i.files && i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { UI.slotCode = String(r.result || '').trim(); UI.slotMsg = 'Backup loaded into the box - press IMPORT HERE on a slot.'; UI.refresh(); }; r.readAsText(f); }; i.click(); },
  padbind(a) { G.padBind = a[0]; SFX.click(); UI.refresh(); },
  padreset() { SET.padMap = null; saveSet(); SFX.click(); UI.refresh(); }
});
const padSection = () => '<div class="xs mut b" style="letter-spacing:.14em;margin:14px 0 6px">GAMEPAD - tap an action, then press a button on your controller</div><div class="keycols"><div class="kcol">' + PADA.map(r => '<div class="setrow"><span>' + r[1] + '</span><button class="kbtn' + (G.padBind === r[0] ? ' wait' : '') + '" data-act="padbind:' + r[0] + '">' + (G.padBind === r[0] ? 'PRESS A BUTTON...' : padLabel(r[0])) + '</button></div>').join('') + '</div><div class="kcol xs mut" style="line-height:1.7">Stick / D-pad: move. START: pause. In menus: D-pad moves, A selects, B goes back.<br>' + ((IN.pads && IN.pads.length) || (G._padPrev && G._padPrev.length) ? '<b class="good">Controller connected.</b>' : 'No controller detected yet - press any button on it.') + '<br><button class="btn sm" data-act="padreset" style="margin-top:8px">RESET CONTROLLER</button></div></div>';
