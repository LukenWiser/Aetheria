// ================= AUDIO SAFETY: keeps the sound engine from choking, going silent or getting stuck =================
// 1) a bad number (NaN / Infinity) reaching a filter or gain can silence the whole mix for good: drop those values
(function () {
  const AP = window.AudioParam && AudioParam.prototype; if (!AP || AP.__safe) return; AP.__safe = 1;
  const fin = v => typeof v === 'number' && isFinite(v);
  ['setValueAtTime', 'linearRampToValueAtTime', 'setTargetAtTime'].forEach(k => { const o = AP[k]; AP[k] = function (v, t, c) { if (!fin(v) || !fin(t) || (c !== undefined && !(fin(c) && c > 0))) return this; try { return o.call(this, v, Math.max(0, t), c); } catch (e) { return this; } }; });
  const ex = AP.exponentialRampToValueAtTime; AP.exponentialRampToValueAtTime = function (v, t) { if (!fin(v) || !fin(t)) return this; if (Math.abs(v) < 1e-5) v = v < 0 ? -1e-5 : 1e-5; try { return ex.call(this, v, Math.max(0, t)); } catch (e) { return this; } };
  const ds = Object.getOwnPropertyDescriptor(AP, 'value'); if (ds && ds.set) Object.defineProperty(AP, 'value', { get: ds.get, set(v) { if (fin(v)) ds.set.call(this, v); }, configurable: true });
})();
// 2) a voice budget: when drones, hybrids and explosions all fire at once, too many sounds overload the audio thread
//    and everything crackles and cuts out. Cap the sounds alive at once and the sounds started per moment.
const VB = { ends: [], burst: 0, bt: 0, max: 44, perBurst: 16 };
function voiceOK(t, dur) {
  if (!AC) return false; const now = AC.currentTime, pn = performance.now();
  if (pn - VB.bt > 40) { VB.bt = pn; VB.burst = 0; } if (VB.burst >= VB.perBurst) return false;
  if (VB.ends.length >= VB.max) { VB.ends = VB.ends.filter(e => e > now); if (VB.ends.length >= VB.max) return false; }
  VB.burst++; VB.ends.push(t + dur + .05); return true;
}
const _sTone = sTone; sTone = function (t, type, f0, f1, dur, vol) { if (!voiceOK(t, dur)) return; try { _sTone.apply(this, arguments); } catch (e) { } };
const _sNoise = sNoise; sNoise = function (t, dur) { if (!voiceOK(t, dur)) return; try { _sNoise.apply(this, arguments); } catch (e) { } };
// 3) the menus must never stay muffled or muted: undo the low-health muffle and any half-finished fade
function audioUnmute() { try { if (MX.ctx === AC && MX.lp) { const t = AC.currentTime; MX.lp.frequency.cancelScheduledValues(t); MX.lp.frequency.setTargetAtTime(20000, t, .15); music.tense = false; } } catch (e) { } }
const _stM = music.start; music.start = function () { const was = this.on; const r = _stM.apply(this, arguments); if (!was && this.on) { try { if (MX.ctx === AC && MX.out) { const t = AC.currentTime; MX.out.gain.cancelScheduledValues(t); MX.out.gain.setValueAtTime(Math.max(.0001, MX.out.gain.value), t); MX.out.gain.linearRampToValueAtTime(1, t + .25); } } catch (e) { } if (G.scene !== 'play') audioUnmute(); } return r; };
// 4) wake the audio back up whenever the browser paused it (tab switch, phone call, headphones unplugged, sleep)
function audioWake() {
  if (!AC) return; try {
    if (AC.state === 'closed') { AC = null; FXB.ctx = null; audio(); if (UI.top && G.scene !== 'play') menuMusic(UI.top); else if (G.run) { music.on = false; music.start(G.run.w, !!(G.run.boss && !G.run.boss.dead)); } return; }
    if (AC.state !== 'running') AC.resume().then(() => { if (music.on) music.nt = 0; }).catch(() => { });
  } catch (e) { }
}
['pointerdown', 'keydown', 'touchend', 'focus'].forEach(ev => addEventListener(ev, audioWake, { capture: true, passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(audioWake, 60); });
setInterval(() => { if (AC && AC.state === 'running' && music.on && MX.ctx === AC && MX.out && MX.out.gain.value < .02) { try { const t = AC.currentTime; MX.out.gain.cancelScheduledValues(t); MX.out.gain.setValueAtTime(.0001, t); MX.out.gain.linearRampToValueAtTime(1, t + .3); } catch (e) { } } }, 3000);
