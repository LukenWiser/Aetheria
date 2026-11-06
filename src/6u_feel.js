// ================= V60: game feel, death report, animated results, quick restart =================
// ---- who is shooting: tag enemy bullets with the enemy that fired them ----
const _updE_f6 = updEnemy; updEnemy = function (e) { G.curSh = e.d && e.d.nm; const r = _updE_f6.apply(this, arguments); G.curSh = null; return r; };
const _updB_f6 = updBoss; updBoss = function (e) { G.curSh = BOSSES[e.bi] && BOSSES[e.bi].nm; const r = _updB_f6.apply(this, arguments); G.curSh = null; return r; };
const _ebul_f6 = ebullet; ebullet = function () { const n = G.ent.eb.length, r = _ebul_f6.apply(this, arguments); if (G.ent.eb.length > n && G.curSh) G.ent.eb[G.ent.eb.length - 1].src = G.curSh; return r; };

// ---- per-hit log for the death report ----
const _hurtF_f6 = hurt;
hurt = function (p, dmg, kind) {
  const hp0 = p.hp, sh0 = p.sh, r = _hurtF_f6.apply(this, arguments);
  try {
    if (r && G.run) {
      const src = G.lastB, nm = src ? (src.d && typeof src.d === 'object' ? src.d.nm : src.src) : null, behind = !!(src && kind === 'b' && src.x < p.x - 6);
      const L = G.run.hitLog || (G.run.hitLog = []); G.hitLogR = L; L.push({ nm: nm || (kind === 'b' ? 'Enemy fire' : kind === 'ram' ? 'A collision' : 'Hazard'), kind, dmg: Math.round(hp0 - p.hp + sh0 - p.sh), behind, t: G.run.time | 0, hull: hp0 - p.hp > 0 });
      // directional kick: the screen jolts away from where the hit came from
      if (!SET.reduce && src) { const a = Math.atan2(p.y - src.y, p.x - src.x), k = hp0 - p.hp > 0 ? 9 : 4; G.kx = (G.kx || 0) + Math.cos(a) * k * (SET.shake || 1); G.ky = (G.ky || 0) + Math.sin(a) * k * (SET.shake || 1); }
    }
  } catch (e) { }
  G.lastB = null; return r;
};
function deathReport(R) {
  const L = (R && R.hitLog) || G.hitLogR || []; if (!L.length) return null;
  const last = L[L.length - 1], by = {}; L.forEach(h => { by[h.nm] = (by[h.nm] || 0) + h.dmg; });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0], back = L.filter(h => h.behind).length, rams = L.filter(h => h.kind === 'ram').length;
  const tips = [];
  if (back >= Math.max(1, L.length / 3)) tips.push(back + ' of your ' + L.length + ' hits came from BEHIND you - stay further right and watch both sides.');
  if (rams >= 2) tips.push('You crashed into enemies ' + rams + ' times - every crash costs a third of your hull.');
  if (L.length >= 2 && L[L.length - 1].t - L[L.length - 2].t <= 2) tips.push('The last two hits landed within 2 seconds - after a hit, back off and find space.');
  if (!tips.length) tips.push(top[0] + ' did the most damage (' + top[1] + '). Learn its pattern first.');
  return { killer: last.nm, kind: last.kind, hits: L.length, top: top[0], topDmg: top[1], tips };
}

// ---- kills: bigger enemies stop time a little and throw debris ----
const _killE_f6 = killEnemy;
killEnemy = function (e, own) {
  const was = e.dead, r = _killE_f6.apply(this, arguments);
  try {
    if (!was && G.run) {
      const big = e.w || 40, fx = SET.reduce ? .4 : 1;
      if (!e.d.elite && big >= 80) G.freeze = Math.max(G.freeze || 0, 2);
      const n = Math.round(Math.min(16, 3 + big / 10) * fx), c = hex((e.d.m && e.d.m[1] && e.d.m[1].c) || 0x64748b);
      spark(e.x, e.y, n, c, 4 + big / 30, 26 + big / 6, 3 + big / 40); spark(e.x, e.y, Math.round(n / 2), '#fde68a', 3, 14, 2);
      if (big >= 80) { G.kx = (G.kx || 0) + rnd(-3, 3); G.ky = (G.ky || 0) + rnd(-3, 3); }
      feelHit(own >= 0 ? G.players[own] : null, true, big);
    }
  } catch (er) { }
  return r;
};
// ---- per-gun impact ticks (very quiet, rate-limited) ----
const GUNP6 = { twin: 1500, spread: 1100, lancer: 700, ion: 2100, missile: 420, orb: 320, arc: 2600, rail: 260 };
let feelT = 0;
function feelHit(p, kill, big) {
  const now = performance.now(); if (now - feelT < (kill ? 30 : 55)) return; feelT = now;
  try { if (!AC || !sfxG) return; const f = (p && GUNP6[p.wpn]) || 1200, t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = kill ? 'square' : 'triangle'; o.frequency.setValueAtTime(f * (kill ? .6 : 1) * (.94 + Math.random() * .12), t); o.frequency.exponentialRampToValueAtTime(f * .35, t + (kill ? .09 : .05)); g.gain.setValueAtTime(kill ? .07 + Math.min(.08, (big || 0) / 1500) : .035, t); g.gain.exponentialRampToValueAtTime(.0001, t + (kill ? .1 : .06)); o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + .12); } catch (e) { }
}
const _hurtEn_f6 = hurtEnemy;
hurtEnemy = function (e, dmg, b) { const r = _hurtEn_f6.apply(this, arguments); if (b && b.own !== undefined && b.own >= 0 && !r) feelHit(G.players[b.own], false); return r; };

// ---- heavy guns kick the ship (and the camera) back ----
const KICK6 = { lancer: 1.4, missile: .8, orb: 2.2, rail: 3.4 };
const _fireP_f6 = fireP;
fireP = function (p) { const f0 = p.fcd, r = _fireP_f6.apply(this, arguments); try { const k = KICK6[p.wpn]; if (k && p.fcd > f0 && p.alive) { p.x = Math.max(20, p.x - k * 1.6); if (!SET.reduce) G.kx = (G.kx || 0) - k * .9; } } catch (e) { } return r; };

// ---- boss deaths: chain of explosions + a final shockwave ----
const _killB_f6 = killBoss;
killBoss = function (e) {
  const was = e.st === 2, r = _killB_f6.apply(this, arguments);
  if (!was) {
    const R = G.run, x = e.x, y = e.y, w = e.w || 200;
    for (let i = 0; i < 9; i++) setTimeout(() => { if (G.run !== R) return; const bx = x + rnd(-w * .4, w * .4), by = y + rnd(-w * .35, w * .35); boom2D(bx, by, 40 + Math.random() * 60, ['#fb923c', '#fde047', '#f43f5e'][i % 3]); if (R3) R3.boom(bx, by, 8, 0xffa040, 6, 14); SFX.boom(i % 3 === 0); shake(6 + i, 10); }, 120 + i * 130);
    setTimeout(() => { if (G.run !== R) return; G.flashT = 30; shock(x, y, '#ffffff', 900, 60); shock(x, y, '#fde047', 600, 45); shake(22, 40); SFX.boom(true); haptic([120, 50, 200]); }, 1350);
  }
  return r;
};

// ---- results: death report, staged count-up, stamps, R to retry ----
const _uiRes_f6 = UI.result.bind(UI);
UI.result = function (d) { try { if (!d.win) d.death = deathReport(G.run); } catch (e) { } return _uiRes_f6(d); };
const _beginF_f6 = beginRun; beginRun = function () { G.hitLogR = null; return _beginF_f6.apply(this, arguments); };
(function () {
  const st = document.createElement('style'); st.textContent = `
.rsx-row{opacity:0;transform:translateX(-14px);animation:rsxIn .32s cubic-bezier(.2,.9,.3,1.3) forwards}
@keyframes rsxIn{to{opacity:1;transform:none}}
.rsx-stamp{animation:rsxStamp .45s cubic-bezier(.2,.9,.3,1.4) both}
@keyframes rsxStamp{0%{opacity:0;transform:scale(2.4) rotate(-8deg)}60%{opacity:1;transform:scale(.92)}100%{transform:scale(1)}}
.rsx-death{margin-top:12px;padding:10px 12px;border-left:3px solid #f43f5e;background:linear-gradient(90deg,rgba(244,63,94,.16),rgba(244,63,94,.02));text-align:left}
.rsx-death .k{font:900 10px var(--mono);letter-spacing:.22em;color:#fda4af}
.rsx-death .n{font:900 18px var(--mono);color:#fff;margin:3px 0 6px}
.rsx-death li{font:600 11px/1.55 var(--mono);color:#cbd5e1;margin-left:14px}
.rsx-key{display:inline-block;margin-left:8px;padding:1px 6px;border:1px solid currentColor;border-radius:4px;font:900 9px var(--mono);opacity:.7}
`; document.head.appendChild(st);
})();
function rsxCount(el, to, ms) { const t0 = performance.now(), pre = el.textContent.match(/^[+-]?/)[0], suf = el.textContent.replace(/^[+-]?[\d,]+/, ''); (function step(n) { const k = Math.min(1, (n - t0) / ms), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = pre + fmt(v) + suf; if (k < 1) requestAnimationFrame(step); })(t0); }
const _showRes_f6 = UI.show.bind(UI);
UI.show = function (id) {
  const r = _showRes_f6.apply(this, arguments);
  if (id === 'scResult') try {
    const el = document.getElementById('scResult'), d = UI.res; if (!el || !d) return r;
    const reduce = SET.reduce;
    const t = el.querySelector('.title'); if (t && !reduce) t.classList.add('rsx-stamp');
    el.querySelectorAll('.setrow').forEach((row, i) => { if (!reduce) { row.classList.add('rsx-row'); row.style.animationDelay = (.25 + i * .06) + 's'; } const b = row.querySelector('b'); const m = b && /^[+-]?([\d,]+)/.exec(b.textContent); if (m && !reduce) { const v = +m[1].replace(/,/g, ''); if (v > 0) { b.textContent = b.textContent.replace(m[1], '0'); setTimeout(() => rsxCount(b, v, 700), 250 + i * 60); } } });
    if (d.death && !el.querySelector('.rsx-death')) {
      const box = document.createElement('div'); box.className = 'rsx-death';
      box.innerHTML = '<div class="k">WHAT GOT YOU</div><div class="n">' + escH(d.death.killer.toUpperCase()) + (d.death.kind === 'ram' ? ' (COLLISION)' : '') + '</div><ul style="margin:0;padding:0">' + d.death.tips.map(x => '<li>' + escH(x) + '</li>').join('') + '</ul>';
      el.querySelectorAll('.tipbox').forEach(x => { x.style.display = 'none'; });
      const hero = el.querySelector('.rs-hero') || el.querySelector('.tc') || el.querySelector('.card'); if (hero) hero.appendChild(box);
    }
    const rb = el.querySelector('[data-act="retry"]'); if (rb && !rb.querySelector('.rsx-key') && !touchOn()) rb.insertAdjacentHTML('beforeend', '<span class="rsx-key">R</span>');
    const nb = el.querySelector('[data-act="nextlv"]'); if (nb && !nb.querySelector('.rsx-key') && !touchOn()) nb.insertAdjacentHTML('beforeend', '<span class="rsx-key">ENTER</span>');
  } catch (e) { console.warn(e); }
  return r;
};
document.addEventListener('keydown', e => {
  if (e.repeat || UI.top !== 'scResult' || G.scene === 'play') return; const t = e.target; if (t && t.tagName === 'INPUT') return;
  if (e.code === 'KeyR') { e.preventDefault(); ACT.retry(); }
  else if (e.code === 'Enter' && document.querySelector('#scResult [data-act="nextlv"]')) { e.preventDefault(); ACT.nextlv(); }
});
