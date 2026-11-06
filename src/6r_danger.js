// ================= V57: loud hit feedback + "about to die" warnings =================
const DNG = { el: null, hit: null, txt: null, big: null, hitA: 0, hitC: '244,63,94', lvl: 0, lastBeat: 0, state: '', bigT: 0 };
function dngInit() {
  if (DNG.el) return; const fl = document.getElementById('flash'); if (!fl) return; const par = fl.parentNode;
  const st = document.createElement('style');
  st.textContent = '#dngV{position:absolute;inset:0;z-index:5;pointer-events:none;opacity:0;box-shadow:inset 0 0 0 0 rgba(239,68,68,0);background:radial-gradient(ellipse at 50% 50%,rgba(127,29,29,0) 38%,rgba(185,28,28,.55) 78%,rgba(127,0,0,.95) 100%)}'
    + '#dngH{position:absolute;inset:0;z-index:6;pointer-events:none;opacity:0}'
    + '#dngT{position:absolute;left:0;right:0;top:calc(64px + env(safe-area-inset-top));text-align:center;z-index:13;pointer-events:none;font:900 clamp(16px,3.2vw,30px) var(--mono,monospace);letter-spacing:.22em;color:#fecaca;text-shadow:0 0 12px #ef4444,0 0 28px #b91c1c,0 2px 0 #450a0a;display:none}'
    + '#dngT small{display:block;font-size:.45em;letter-spacing:.3em;color:#fca5a5;margin-top:4px}'
    + '#dngB{position:absolute;left:0;right:0;top:42%;text-align:center;z-index:13;pointer-events:none;font:900 clamp(26px,6vw,60px) var(--mono,monospace);letter-spacing:.12em;opacity:0;transform:scale(1.4)}'
    + 'body.dngShake #dngT{animation:dngJ .12s linear infinite}@keyframes dngJ{0%{transform:translate(0,0)}25%{transform:translate(-2px,1px)}50%{transform:translate(2px,-1px)}75%{transform:translate(-1px,-1px)}}';
  document.head.appendChild(st);
  const mk = id => { const d = document.createElement('div'); d.id = id; par.insertBefore(d, fl.nextSibling); return d; };
  DNG.el = mk('dngV'); DNG.hit = mk('dngH'); DNG.txt = mk('dngT'); DNG.big = mk('dngB');
}
// tiny synth sounds (cannot be heard in testing - tune by ear)
function dngTone(f0, f1, dur, vol, type) {
  try { if (!AC || !sfxG) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + dur + .02); } catch (e) { }
}
const dngBeat = () => { dngTone(95, 45, .16, .55); setTimeout(() => dngTone(80, 40, .18, .45), 170); };
const dngAlarm = () => { dngTone(880, 660, .12, .18, 'square'); setTimeout(() => dngTone(880, 660, .12, .18, 'square'), 160); };
const dngCrunch = () => { dngTone(160, 35, .3, .7, 'sawtooth'); dngTone(60, 30, .35, .6); };
function dngBig(txt, col) { if (!DNG.big) return; DNG.big.textContent = txt; DNG.big.style.color = col; DNG.big.style.textShadow = '0 0 18px ' + col + ',0 3px 0 #000'; DNG.bigT = 50; }
// how many more bullet hits can this player take?
function hitsLeft(p) { const dm = (DIFFM[SET.diff] || DIFFM[1]).dm, per = Math.max(1, Math.round(p.mhp / 3 * dm * p.mod.arm * (G.run && G.run.assist ? .65 : 1))); return Math.ceil((p.hp + p.sh) / per); }

const _hurtD = hurt;
hurt = function (p, dmg, kind) {
  const hp0 = p.hp, sh0 = p.sh, r = _hurtD.apply(this, arguments);
  try {
    if (!r || !G.run || G.run.mode === 'training') return r; dngInit();
    const lost = hp0 - p.hp, slost = sh0 - p.sh, fx = SET.flash !== false;
    if (lost > 0) {
      DNG.hitA = fx ? 1 : .35; DNG.hitC = '239,68,68'; shake(10 + Math.min(10, lost / 3), 22); G.freeze = Math.max(G.freeze || 0, 7); haptic([70, 40, 110]); dngCrunch();
      if (p.alive) { const h = hitsLeft(p); if (h <= 1) dngBig('ONE MORE HIT', '#ff3b3b'); else if (h === 2) dngBig('HULL BREACHED', '#fb923c'); }
    } else if (slost > 0) {
      DNG.hitA = fx ? .55 : .2; DNG.hitC = '56,189,248'; shake(5, 12); haptic(35);
      if (p.sh <= 0) dngBig('SHIELD DOWN', '#38bdf8');
    }
  } catch (e) { }
  return r;
};

function dngTick() {
  if (!DNG.el) { if (G.scene === 'play') dngInit(); if (!DNG.el) return; }
  const now = performance.now(), play = G.scene === 'play' && G.run && G.run.mode !== 'training' && !G.paused, fx = SET.flash !== false;
  let worst = 9; if (play) G.players.forEach(p => { if (p.alive) worst = Math.min(worst, hitsLeft(p), p.sh <= 0 && p.hp < p.mhp * .35 ? 2 : 9); });
  const state = !play ? '' : worst <= 1 ? 'lethal' : worst <= 2 ? 'crit' : '';
  if (state !== DNG.state) { if (state === 'lethal') { dngAlarm(); haptic([40, 60, 40]); } DNG.state = state; }
  // heartbeat pulse
  const per = state === 'lethal' ? 520 : 900; let pulse = 0;
  if (state) { if (now - DNG.lastBeat > per) { DNG.lastBeat = now; dngBeat(); } const ph = (now - DNG.lastBeat) / per; pulse = Math.max(0, 1 - ph * 3.2) + Math.max(0, .7 - Math.abs(ph - .33) * 4); }
  const base = state === 'lethal' ? .75 : state === 'crit' ? .4 : 0, v = state ? Math.min(1, base + (fx ? pulse * .35 : 0)) : 0;
  DNG.el.style.opacity = v.toFixed(2);
  document.body.classList.toggle('dngShake', state === 'lethal');
  if (DNG.txt) {
    if (state) { DNG.txt.style.display = 'block'; const html = state === 'lethal' ? 'CRITICAL - ONE HIT FROM DEATH<small>GRAB A REPAIR OR SHIELD PICKUP</small>' : 'HULL DAMAGED<small>TWO HITS LEFT</small>'; if (DNG.txt._h !== html) { DNG.txt._h = html; DNG.txt.innerHTML = html; } DNG.txt.style.opacity = state === 'lethal' ? (fx ? (.55 + .45 * Math.abs(Math.sin(now / 140))).toFixed(2) : '1') : '.85'; DNG.txt.style.color = state === 'lethal' ? '#fecaca' : '#fed7aa'; }
    else DNG.txt.style.display = 'none';
  }
  // hit flash: solid tint that fades fast + thick edge
  if (DNG.hitA > 0) { DNG.hit.style.opacity = DNG.hitA.toFixed(2); DNG.hit.style.background = 'radial-gradient(ellipse at 50% 50%,rgba(' + DNG.hitC + ',.18) 0%,rgba(' + DNG.hitC + ',.5) 60%,rgba(' + DNG.hitC + ',.95) 100%)'; DNG.hitA = Math.max(0, DNG.hitA - .06); } else if (DNG.hit.style.opacity !== '0') DNG.hit.style.opacity = '0';
  if (!play) DNG.bigT = 0;
  if (DNG.bigT > 0) { DNG.bigT--; const k = DNG.bigT / 50; DNG.big.style.opacity = Math.min(1, k * 2.5).toFixed(2); DNG.big.style.transform = 'scale(' + (1 + Math.max(0, k - .8) * 2).toFixed(2) + ')'; } else if (DNG.big.style.opacity !== '0') DNG.big.style.opacity = '0';
}
(function dngLoop() { try { dngTick(); } catch (e) { } requestAnimationFrame(dngLoop); })();
window.__DNG = DNG;
