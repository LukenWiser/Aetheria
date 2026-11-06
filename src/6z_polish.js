// ================= V65: graphics presets, text/HUD size, controller prompts, next-upgrade hook =================
const PRESETS = {
  low: { q: 1, back: 0, parts: .4, glow: .5, bloom: false, weather: false, daynight: false, detail: false },
  med: { q: 1.5, back: 1, parts: .75, glow: .8, bloom: true, weather: true, daynight: true, detail: true },
  high: { q: 2, back: 2, parts: 1, glow: 1, bloom: true, weather: true, daynight: true, detail: true }
};
try {
  const GR = SETS.GRAPHICS; if (GR && !GR.some(r => r[0] === 'preset')) GR.unshift(['preset', 'sel', 'Graphics preset', 'Sets everything below in one go', [['custom', 'Custom'], ['low', 'Low (old phones)'], ['med', 'Medium'], ['high', 'High']]]);
  const AX = SETS.ACCESS || SETS.ACCESSIBILITY || SETS.GAMEPLAY;
  if (AX && !AX.some(r => r[0] === 'uiz')) AX.push(['uiz', 'sel', 'Menu text size', '', [[.9, 'Small'], [1, 'Normal'], [1.15, 'Large'], [1.3, 'Huge']]], ['hudz', 'sel', 'HUD size', 'Pilot panel, top strip and combo', [[.85, 'Small'], [1, 'Normal'], [1.2, 'Large'], [1.4, 'Huge']]]);
  if (SET.preset === undefined) SET.preset = 'custom'; if (SET.uiz === undefined) SET.uiz = 1; if (SET.hudz === undefined) SET.hudz = 1;
} catch (e) { }
function applyPreset(k) { const P = PRESETS[k]; if (!P) return; for (const s in P) { SET[s] = P[s]; try { applySet(s); } catch (e) { } } SET.preset = k; try { saveSet(); } catch (e) { } }
function applySizes() { const d = document.documentElement.style; d.setProperty('--uiz', String(+SET.uiz || 1)); d.setProperty('--hudz', String(+SET.hudz || 1)); }
(function () { const st = document.createElement('style'); st.textContent = '#ui .scr .card,#ui .scr .lay{zoom:var(--uiz,1)}#hud .hx .fr,#top,#hcmb{zoom:var(--hudz,1)}'; document.head.appendChild(st); applySizes(); })();
const _applySetZ = applySet;
applySet = function (k) {
  if (k === 'preset') { if (SET.preset !== 'custom') { applyPreset(SET.preset); if (UI.top === 'scSettings') UI.refresh(); } return; }
  if (k === 'uiz' || k === 'hudz') { SET[k] = parseFloat(SET[k]) || 1; applySizes(); try { saveSet(); } catch (e) { } return; }
  const r = _applySetZ.apply(this, arguments); if (PRESETS.low[k] !== undefined && SET.preset !== 'custom') { SET.preset = 'custom'; try { saveSet(); } catch (e) { } } return r;
};
// first launch: pick a preset for this device
setTimeout(() => {
  try {
    if (SET.presetAuto) return; SET.presetAuto = 1;
    const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8, small = Math.min(innerWidth, innerHeight) < 500;
    const k = mem <= 2 || cores <= 2 ? 'low' : (mem <= 4 || cores <= 4 || (IS_TOUCH && small)) ? 'med' : 'high';
    if (k !== 'high') { applyPreset(k); toast('GRAPHICS', 'Set to ' + (k === 'low' ? 'Low' : 'Medium') + ' for this device. Change it any time in Settings > Graphics.', '#22d3ee'); } else { SET.preset = 'high'; saveSet(); }
  } catch (e) { }
}, 4000);

// ---- controller prompts: HUD shows pad buttons when you're playing on a gamepad ----
G.padUI = false;
function setPadUI(on) { if (G.padUI === on) return; G.padUI = on; try { if (G.scene === 'play' && G.run) buildHud(); } catch (e) { } }
window.addEventListener('keydown', () => setPadUI(false), true);
window.addEventListener('pointerdown', () => setPadUI(false), true);
setInterval(() => { try { const ps = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of ps) { if (!p) continue; if (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .5)) { setPadUI(true); break; } } } catch (e) { } }, 250);
const _hudPanelZ = hudPanel;
hudPanel = function (p) {
  let h = _hudPanelZ.apply(this, arguments);
  if (G.padUI && p.id === 0) try { const a = padLabel('ab'), v = padLabel('sup'); h = h.replace(/(id="hda0"[^>]*>[\s\S]*?<\/span>)(<em>[^<]*<\/em>)?/, '$1<em>' + a + '</em>').replace(/(id="hdu0"[^>]*>[\s\S]*?<\/span>)(<em>[^<]*<\/em>)?/, '$1<em>' + v + '</em>'); } catch (e) { }
  return h;
};

// ---- results: always show the next upgrade within reach ----
function nextUpgrade() {
  const pl = SAVE.pl[0]; let best = null;
  for (const k in UPG) { const lv = pl.up[k] | 0; if (lv >= UPG[k].max) continue; const pr = upPrice(k, lv); if (!best || pr < best.pr) best = { k, lv, pr }; }
  return best;
}
const _showZ = UI.show.bind(UI);
UI.show = function (id) {
  const r = _showZ.apply(this, arguments);
  if (id === 'scResult') try {
    const el = document.getElementById('scResult'), d = UI.res, nu = nextUpgrade(); if (!el || !nu || el.querySelector('.rsx-up') || (d && d.mode === 'training')) return r;
    const can = SAVE.cores >= nu.pr, box = document.createElement('div'); box.className = 'rsx-up';
    box.style.cssText = 'margin-top:12px;padding:9px 12px;border-left:3px solid ' + (can ? '#fbbf24' : '#22d3ee') + ';background:linear-gradient(90deg,' + (can ? 'rgba(251,191,36,.16)' : 'rgba(34,211,238,.12)') + ',transparent);font:700 11px var(--mono);letter-spacing:.08em;display:flex;align-items:center;justify-content:space-between;gap:10px';
    const pct = Math.min(100, Math.round(SAVE.cores / nu.pr * 100));
    box.innerHTML = '<span><b style="color:' + (can ? '#fde68a' : '#a5f3fc') + ';letter-spacing:.2em;font-size:10px">' + (can ? 'UPGRADE READY' : 'NEXT UPGRADE') + '</b><br>' + UPG[nu.k].nm + ' LV' + (nu.lv + 1) + ' - ' + (can ? fmt(nu.pr) + ' cores' : fmt(nu.pr - SAVE.cores) + ' more cores') + '<i style="display:block;height:3px;margin-top:5px;background:rgba(255,255,255,.1)"><i style="display:block;height:100%;width:' + pct + '%;background:' + (can ? '#fbbf24' : '#22d3ee') + '"></i></i></span>' + (can ? '<button class="btn sm gold" data-act="shop">SHOP</button>' : '');
    const hero = el.querySelector('.rs-hero') || el.querySelector('.tc') || el.querySelector('.card'); if (hero) hero.appendChild(box);
  } catch (e) { console.warn(e); }
  return r;
};
