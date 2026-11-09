// ================= MAIN MENU: full-screen title screen =================
// Big condensed type on the left, your ship on the right, everything secondary tucked into one quiet row.
const MI = { // small line icons for the secondary row
  profile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7"/></svg>',
  missions: '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  daily: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  cos: '<svg viewBox="0 0 24 24"><path d="M14.5 4.5l5 5-9 9H5.5v-5z"/><path d="M12.5 6.5l5 5"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
  tutorial: '<svg viewBox="0 0 24 24"><path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c3 2.5 8 2.5 11 0v-5"/></svg>',
  ranks: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/></svg>',
  updates: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
  fs: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  fsx: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>'
};
const MAINNAV = [
  ['play', 'Play', 'Campaign, endless, boss rush and every challenge'],
  ['online', 'Online', 'Friends, co-op and versus with other pilots'],
  ['hangar', 'Hangar', 'Build, paint and arm your ship'],
  ['shop', 'Shop', 'Upgrades and new weapons']
];
SCR.scMenu = () => {
  const t = touchOn(), X = PS().xp, pc = SAVE.pl[0].cfg, ac = pc.accent || '#22d3ee', ms = msnReady(), dNew = !SAVE.dl.done[dayKey()], fsOn = !!document.fullscreenElement;
  const online = NET.user && NET.me && NET.me.name ? NET.me.name : null, U = UPDATES[0];
  const nav = MAINNAV.map((n, i) => '<button class="mm-nav" data-act="' + n[0] + '" style="--i:' + i + '"><span class="mm-w">' + n[1] + '</span><span class="mm-d">' + n[2] + '</span></button>').join('');
  const ic = (act, key, label, badge) => '<button class="mm-ic" data-act="' + act + '" title="' + label + '" aria-label="' + label + '">' + MI[key] + '<span>' + label + '</span>' + (badge ? '<b>' + badge + '</b>' : '') + '</button>';
  return '<div class="mm" style="--pa:' + ac + '">' +
    '<header class="mm-top"><button class="mm-logo" data-act="tap" aria-label="Aetheria: Quantum Strike"><span class="mm-l1">Aetheria</span><span class="mm-l2">Quantum Strike</span></button>' +
      '<div class="mm-tr"><button class="mm-pill' + (online ? ' on' : '') + '" data-act="online"><i></i>' + (online ? escH(online) : 'Offline') + (online && inboxCount() ? '<b class="mm-ib">' + inboxCount() + '</b>' : '') + '</button><div class="mm-seg" role="group" aria-label="Players"><button data-act="players:1" class="' + (SAVE.players === 1 ? 'on' : '') + '">1P</button><button data-act="players:2" class="' + (SAVE.players === 2 ? 'on' : '') + '">2P</button></div></div></header>' +
    '<nav class="mm-main">' + nav + '</nav>' +
    '<div class="mm-row">' + ic('base', 'base', 'Station', typeof raidOn === 'function' && raidOn() ? '!' : '') + ic('profile', 'profile', 'Profile') + ic('missions', 'missions', 'Missions', ms ? ms : '') + ic('daily', 'daily', 'Daily', dNew ? 'new' : '') + ic('boards', 'ranks', 'Ranks', typeof inboxCount === 'function' && inboxCount() ? '' : '') + ic('cos', 'cos', 'Cosmetics') + ic('settings', 'settings', 'Settings') + ic('tutorial', 'tutorial', 'Flight school') + ic('theater', 'theater', 'Replays') + ic('updates', 'updates', 'Updates') + ic('fs', fsOn ? 'fsx' : 'fs', fsOn ? 'Exit full screen' : 'Full screen') + '</div>' +
    '<aside class="mm-card"><div class="mm-who"><span class="mm-name">' + escH(online || 'Pilot') + '</span><span class="mm-rank">' + 'Level ' + X.lv + ' ' + rankName(X.lv) + '</span></div><div class="mm-xp"><i style="width:' + Math.round(X.xp / xpNeed(X.lv) * 100) + '%"></i></div><div class="mm-card-icons">' + ic('profile', 'profile', 'Profile') + ic('settings', 'settings', 'Settings') + ic('cos', 'cos', 'Cosmetics') + '</div>' +
      '<dl class="mm-stats"><div><dt>Cores</dt><dd class="gold">' + fmt(SAVE.cores) + '</dd></div><div><dt>Worlds</dt><dd>' + Math.min(SAVE.wu, WORLDS.length) + '/' + WORLDS.length + '</dd></div><div><dt>Kills</dt><dd>' + fmt(SAVE.st.kills) + '</dd></div></dl></aside>' +
    '<footer class="mm-foot"><button class="mm-news" data-act="updates"><b>' + U[0] + '</b> ' + escH(U[1]) + '</button><span class="mm-keys">' + (t ? '' : (SAVE.players === 2 ? ['P1: WASD + Space', 'P2: arrows + Enter'] : ['WASD or mouse to fly', 'Space or click to fire', 'Esc to pause']).map(k => '<span>' + k + '</span>').join('')) + '</span><button class="mm-cred" data-act="credits">' + dwEmblem('dw-sm') + '<b>Driftwire</b> Games</button></footer>' +
  '</div>';
};

// every screen picks up the pilot's accent colour
const _show2 = UI.show.bind(UI);
UI.show = function (id, nh) { try { const a = SAVE.pl[0].cfg.accent; if (a) document.body.style.setProperty('--pa', a); } catch (e) { } return _show2(id, nh); };
