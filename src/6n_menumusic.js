// ================= MENU MUSIC: a main theme for the menus, and each world's theme on its map =================
const MENU_TH = MSPEC.length;
MSPEC.push({ key: 50, sc: 'dor', bpm: 92, prog: [0, 5, 3, 4], boss: [0, 5, 3, 4], lead: 'bell', pad: 'saw', drums: 'halftime', bass: 'pulse', arp: 'sparkle',
  A: '4 _ _ _ 7 _ 6 _ 4 _ _ _ 2 _ 4 _ 3 _ _ _ 2 _ 0 _ 2 _ _ _ . . . .', B: '7 _ _ _ 9 _ 7 _ 6 _ _ _ 4 _ 6 _ 7 _ _ _ 9 _ 11 _ 9 _ _ _ 7 _ _ _' });
if (SET.menuMusic === undefined) SET.menuMusic = true;
SETS.AUDIO = SETS.AUDIO || []; if (Array.isArray(SETS.AUDIO)) SETS.AUDIO.push(['menuMusic', 'tog', 'Menu music', 'Music on the menus and world maps']);
function menuTheme(id) { if (id === 'scMap' && UI.mode === 'expedition' && WORLDS[UI.w]) return UI.w; if (id === 'scGalaxy') return 10; if (id === 'scBase') return 6; return MENU_TH; }
function menuMusic(id) {
  try {
    if (!AC || G.scene === 'play' || G.cut || music.jbx >= 0 || id === 'scJukebox' || id === 'scPause' || id === 'scResult' || id === 'scCards') return;
    if (SET.menuMusic === false) { if (music.menuOn) { music.menuOn = false; music.stop(); } return; }
    const t = menuTheme(id), target = t === 15 ? 23 : t === 16 ? 24 : t;
    if (music.on && music.menuOn && music.w === target) return;
    if (AC.state !== 'running') { try { AC.resume(); } catch (e) { } }
    const go = () => { if (G.scene === 'play' || G.cut || music.jbx >= 0) return; const mx = G.mapX; G.mapX = null; music.on = false; clearInterval(music.timer); music.force = 1; music._menuCall = 1; music.start(t, false); music._menuCall = 0; music.menuOn = true; G.mapX = mx; };
    if (music.on && music.menuOn) { music.stop(); clearTimeout(menuMusic.tm); menuMusic.tm = setTimeout(go, 450); } else go();
  } catch (e) { console.warn('menu music', e); }
}
const _mStartM = music.start;
music.start = function (w, boss) {
  if (this.menuOn && !this._menuCall) { this.menuOn = false; this.on = false; clearInterval(this.timer); if (G.scene === 'play' && !G.cut) this.force = -1; }
  return _mStartM.apply(this, arguments);
};
const _mStopM = music.stop;
music.stop = function () { if (!this._menuCall) this.menuOn = false; return _mStopM.apply(this, arguments); };
const _showMM = UI.show.bind(UI);
UI.show = function (id, nh) { const r = _showMM(id, nh); if (G.scene !== 'play') setTimeout(() => menuMusic(id), 0); return r; };
// browsers only allow sound after the first tap or key press
const mmKick = () => { audio(); setTimeout(() => { if (UI.top && G.scene !== 'play') menuMusic(UI.top); }, 60); };
addEventListener('pointerdown', mmKick, { once: true, capture: true }); addEventListener('keydown', mmKick, { once: true, capture: true });
