// ================= SCREEN LAYOUTS: full-screen versions of the main screens, in the main-menu style =================
// ---------- Select Mode: big typographic list on the left, the chosen mode's briefing on the right ----------
const modeHi = k => { const sk = dailyStreakNow(); return k === 'endless' ? (SAVE.hi.endless.score ? 'Best ' + fmt(SAVE.hi.endless.score) + ', wave ' + SAVE.hi.endless.wave : '') : k === 'blitz' ? (SAVE.hi.blitz.score ? 'Best ' + fmt(SAVE.hi.blitz.score) : '') : k === 'rush' ? (SAVE.hi.rush.time ? 'Best time ' + SAVE.hi.rush.time + 's' : 'Every boss you have unlocked') : k === 'daily' ? 'Today: ' + dailyInfo().mod.nm + (sk ? ', ' + sk + ' day streak' : '') : k === 'defense' ? (SAVE.hi.def.wave ? 'Best wave ' + SAVE.hi.def.wave : '') : k === 'nohit' ? (Object.keys(SAVE.hi.nohit).length ? Object.keys(SAVE.hi.nohit).length + ' worlds cleared' : '') : k === 'vault' ? (SAVE.hi.vault.clears ? 'Cracked ' + SAVE.hi.vault.clears + 'x' : '') : k === 'hardcore' ? ((SAVE.hi.hc || {}).wave ? 'Best wave ' + SAVE.hi.hc.wave : '') : k === 'expedition' ? Math.min(SAVE.wu, WORLDS.length) + ' of ' + WORLDS.length + ' worlds open' : ''; };
SCR.scModes = () => {
  const wu = Math.max(1, Math.min(SAVE.wu, WORLDS.length)), w = wu - 1, W = WORLDS[w], pr = prog(w), done = (pr.done[0] || []).filter(Boolean).length, fresh = SAVE.wu <= 1 && !done;
  const others = Object.keys(MODES).filter(k => k !== 'expedition');
  const tile = k => { const M = MODES[k], lk = M.secret && !SAVE.unl[k]; return '<button class="sm-tile' + (lk ? ' lk' : '') + '" data-act="mode:' + k + '"><span class="sm-ic">' + (lk ? ICO.lock : ICO[M.ic] || '') + '</span><b>' + (lk ? '???' : M.nm) + '</b><small>' + (lk ? 'A secret. Keep playing.' : M.ds.split('. ')[0].replace(/\.$/, '')) + '</small></button>'; };
  return '<div class="lay lay-modes2"><header class="lay-h"><h1 class="lay-t">Play</h1><div class="mm-seg" role="group" aria-label="Players"><button data-act="players:1" class="' + (SAVE.players === 1 ? 'on' : '') + '">1P</button><button data-act="players:2" class="' + (SAVE.players === 2 ? 'on' : '') + '">2P co-op</button></div></header>' +
    '<div class="sm-scroll"><button class="xp-hero" style="--wc:' + (W.ac || '#22d3ee') + '" data-act="mode:expedition"><span class="xp-tag">' + (fresh ? 'START HERE' : 'THE MAIN GAME') + ' - STORY CAMPAIGN</span><span class="xp-t">Expedition</span>' +
      '<span class="xp-d">Fly through ' + WORLDS.length + ' worlds, beat every boss and uncover the story. Everything else unlocks as you go.</span>' +
      '<span class="xp-prog"><span class="xp-w">World <b>' + wu + '</b> / ' + WORLDS.length + ' - ' + escH(W.nm) + '</span><i class="xp-bar"><i style="width:' + Math.round((w + done / 13) / WORLDS.length * 100) + '%"></i></i><span class="xs">' + done + ' of 13 sectors cleared in this world</span></span>' +
      '<span class="btn big gold xp-go">' + (fresh ? 'START THE STORY' : 'CONTINUE - WORLD ' + wu) + '</span><span class="xp-num">' + String(wu).padStart(2, '0') + '</span></button>' +
    '<div class="sm-grp2">More ways to play <span class="xs mut">- side modes and challenges for when you want a break from the story</span></div><div class="sm-tiles">' + others.map(tile).join('') + '</div></div>' +
    '<footer class="lay-f"><button class="btn sm" data-act="back">Back</button><span class="xs mut">' + (SAVE.players === 2 ? '2-player co-op is on' : 'Tip: switch to 2P co-op to bring a friend') + '</span></footer></div>';
};
ACT.msel = a => { if (UI.msel === a[0] && MODES[a[0]] && !(MODES[a[0]].secret && !SAVE.unl[a[0]])) { ACT.mode([a[0]]); return; } UI.msel = a[0]; SFX.click(); UI.refresh(); };

// ---------- Pause: the run on the right, big choices on the left ----------
SCR.scPause = () => {
  const R = G.run, tr = R && R.mode === 'training', dev = SAVE.dev || G.god, W = R ? WORLDS[R.w] : null;
  const it = (act, label, cls) => '<button class="mm-nav' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"><span class="mm-w">' + label + '</span></button>';
  return '<div class="lay lay-pause"><h1 class="lay-t">Paused</h1><nav class="mm-main ps-nav">' + it('resume', 'Resume', 'ps-first') + it('restart', 'Restart') + it('settings', 'Settings') + it('photo', 'Photo mode') + it('quit', 'Quit to menu', 'ps-quit') + '</nav>' +
    '<aside class="mm-card ps-run">' + (R ? '<div class="mm-who"><span class="mm-name">' + escH(objText(R)) + '</span></div><div class="xs mut" style="margin-top:4px">' + (W ? 'World ' + (R.w + 1) + ', ' + escH(W.nm) : '') + '</div><dl class="mm-stats" style="margin-top:12px"><div><dt>Score</dt><dd>' + fmt(Math.round(R.score)) + '</dd></div><div><dt>Kills</dt><dd>' + fmt(R.kills) + '</dd></div><div><dt>Cores</dt><dd class="gold">' + fmt(R.cores) + '</dd></div></dl>' : '') +
    '<div class="row" style="gap:6px;margin-top:12px;flex-wrap:wrap"><button class="btn sm" data-act="fs">' + (document.fullscreenElement ? 'Exit full screen' : 'Full screen') + '</button>' + (tr ? '<button class="btn sm" data-act="spawnboss">Spawn boss</button><button class="btn sm" data-act="nextworld">Next world</button>' : '') + (dev ? '<button class="btn sm gold" data-act="cheat:win">Dev: win</button><button class="btn sm gold" data-act="cheat:god">Dev: god</button>' : '') + '</div></aside></div>';
};

// ---------- Shop: categories down the left, one clean list on the right ----------
SCR.scShop = () => {
  const i = pi(), pl = SAVE.pl[i], cat = UI.shc === 'wpn' ? 'wpn' : 'up';
  const tabsP = SAVE.players === 2 ? '<div class="mm-seg">' + [0, 1].map(n => '<button data-act="ptab:' + n + '" class="' + (n === i ? 'on' : '') + '">P' + (n + 1) + '</button>').join('') + '</div>' : '';
  const rows = cat === 'up' ? Object.keys(UPG).map(k => { const U = UPG[k], lv = pl.up[k], mx = lv >= U.max, pr = upPrice(k, lv), can = SAVE.cores >= pr;
      return '<div class="sh-row"><span class="sh-ic">' + ICO[U.ic] + '</span><div class="sh-tx"><b>' + U.nm + '</b><span>' + U.ds + '</span><div class="sh-pips">' + Array.from({ length: U.max }, (_, n) => '<i class="' + (n < lv ? 'on' : '') + '"></i>').join('') + '</div></div><button class="btn' + (mx ? ' off' : can ? ' gold' : ' off') + '" data-act="buy:' + k + '">' + (mx ? 'Maxed' : fmt(pr)) + '</button></div>'; }).join('')
    : WORDER.map(id => { const w = WPN[id], own = pl.wown.indexOf(id) >= 0, eq = pl.wpn === id;
      return '<div class="sh-row"><span class="sh-ic" style="color:' + w.c + '">' + ICO.dmg + '</span><div class="sh-tx"><b style="color:' + w.c + '">' + wName(pl, id) + '</b><span>' + w.ds + '</span>' + (own ? wupHtml(pl, id) : '<span class="xs mut">Damage ' + w.d + ', ' + (60 / w.r).toFixed(1) + ' shots a second</span>') + '</div>' + (own ? '<button class="btn' + (eq ? ' on' : '') + '" data-act="wpn:' + id + '">' + (eq ? 'Equipped' : 'Equip') + '</button>' : '<button class="btn gold' + (SAVE.cores < w.price ? ' off' : '') + '" data-act="wpn:' + id + '">' + fmt(w.price) + '</button>') + '</div>'; }).join('');
  return '<div class="lay lay-shop"><header class="lay-h"><h1 class="lay-t">Shop</h1>' + tabsP + '<div class="sh-wallet"><span>Cores</span><b>' + fmt(SAVE.cores) + '</b></div></header>' +
    '<div class="sh-cols"><nav class="sh-rail"><button class="sh-cat' + (cat === 'up' ? ' on' : '') + '" data-act="shc:up"><span>Upgrades</span><small>Hull, shields, damage, speed</small></button><button class="sh-cat' + (cat === 'wpn' ? ' on' : '') + '" data-act="shc:wpn"><span>Weapons</span><small>Buy, equip and level up guns</small></button><button class="sh-cat" data-act="hangar"><span>Hangar</span><small>Ship parts and paint</small></button><button class="sh-cat" data-act="cos"><span>Cosmetics</span><small>Skins, trails, effects</small></button></nav>' +
    '<section class="sh-list">' + (cat === 'up' ? '<p class="xs mut" style="margin:0 0 8px">Each level costs more than the last. Prices are for the next level.</p>' : '') + rows + '</section></div>' +
    '<footer class="lay-f"><button class="btn sm" data-act="back">Back</button></footer></div>';
};
ACT.shc = a => { UI.shc = a[0]; SFX.click(); UI.refresh(); };

// ---------- screens rebuilt after they draw (their content logic stays where it is) ----------
const LAYOUTS = {
  scResult(el) {
    const c = el.querySelector('.card'); if (!c || c.classList.contains('rs')) return; c.classList.add('rs'); c.style.width = '';
    const tc = c.querySelector('.tc'), rowsBox = c.querySelector('.setrow') && c.querySelector('.setrow').parentElement, stack = c.querySelector('.stack');
    const hero = document.createElement('div'); hero.className = 'rs-hero'; const side = document.createElement('div'); side.className = 'rs-side';
    if (tc) { while (tc.firstChild) { const n = tc.firstChild; if (n === rowsBox || (n.querySelector && n.querySelector('.setrow'))) { side.appendChild(n); continue; } hero.appendChild(n); } tc.remove(); }
    if (rowsBox && !side.contains(rowsBox)) side.appendChild(rowsBox);
    c.querySelectorAll('.tipbox').forEach(t => hero.appendChild(t));
    c.prepend(side); c.prepend(hero); if (stack) { stack.classList.add('rs-act'); c.appendChild(stack); }
    const t = hero.querySelector('.title'); if (t) t.removeAttribute('style');
    if (UI.res) c.classList.add(UI.res.win ? 'rs-win' : 'rs-lose');
  },
  scSettings(el) {
    const c = el.querySelector('.card'); if (!c || c.classList.contains('st2')) return; c.classList.add('st2');
    const h = c.querySelector('h2'), tabs = c.querySelector('.tabs'), foot = c.lastElementChild; const rail = document.createElement('nav'), body = document.createElement('div'); rail.className = 'st-rail'; body.className = 'st-body';
    Array.from(c.children).forEach(n => { if (n === h || n === tabs) rail.appendChild(n); else if (n !== foot) body.appendChild(n); });
    if (tabs) tabs.classList.remove('wrap'); c.prepend(body); c.prepend(rail); if (foot) c.appendChild(foot);
  },
  scProfile(el) {
    const c = el.querySelector('.card'); if (!c || c.classList.contains('pf2')) return; c.classList.add('pf2');
    const ag = c.querySelector('.agrid'); if (!ag) return; const head = ag.previousElementSibling, foot = c.lastElementChild;
    const left = document.createElement('div'), right = document.createElement('div'); left.className = 'pf-left'; right.className = 'pf-right';
    Array.from(c.children).forEach(n => { if (n === ag || n === head) right.appendChild(n); else if (n !== foot) left.appendChild(n); });
    c.prepend(right); c.prepend(left); if (foot) c.appendChild(foot);
  },
  scHangar(el) {
    const c = el.querySelector('.hg>.card'); if (!c || c.classList.contains('hg2')) return; c.classList.add('hg2'); c.removeAttribute('style');
    const head = c.firstElementChild, tabs = c.querySelector('.tabs'), foot = c.lastElementChild; const rail = document.createElement('nav'), body = document.createElement('div'); rail.className = 'st-rail hg-rail'; body.className = 'st-body hg-body';
    Array.from(c.children).forEach(n => { if (n === head || n === tabs) rail.appendChild(n); else if (n !== foot) body.appendChild(n); });
    if (tabs) tabs.classList.remove('wrap'); c.prepend(body); c.prepend(rail); if (foot) c.appendChild(foot);
  },
  scMap(el) {
    const c = el.querySelector('.card'); if (!c || c.classList.contains('mp2')) return; c.classList.add('mp2');
    c.querySelectorAll('.tabs.wf .tab').forEach((t, i) => { t.title = t.textContent; t.innerHTML = '<b>' + (i + 1) + '</b>' + (t.classList.contains('lk') ? ICO.lock : ''); });
    const h = c.querySelector('h2'); if (h && WORLDS[UI.w]) c.style.setProperty('--wc', WORLDS[UI.w].ac);
  }
};
const _show3 = UI.show.bind(UI);
UI.show = function (id, nh) { const r = _show3(id, nh); try { if (LAYOUTS[id]) LAYOUTS[id](this.el(id)); } catch (e) { console.warn('layout', id, e); } return r; };
