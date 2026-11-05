// ================= ONLINE 2: leaderboards, cloud saves, challenge inbox =================
const LB = [
  ['pilot', 'Pilot XP', 'Total pilot XP ever earned'],
  ['endless', 'Endless', 'Best score in Endless'],
  ['blitz', 'Blitz', 'Best score in a 90-second Blitz'],
  ['rush', 'Boss Rush', 'Best score in Boss Rush'],
  ['hardcore', 'Hardcore', 'Best score in one-life Hardcore'],
  ['defense', 'Station Defense', 'Best score defending the station'],
  ['daily', 'Today\'s Daily', 'Best score on today\'s Daily Challenge']
];
const lbKey = b => b === 'daily' ? 'daily_' + dayKey().replace(/[^0-9a-z_-]/gi, '') : b;
const N2 = { lb: {}, lbFr: {}, lbView: 'global', lbB: 'endless', lbLoading: false, inbox: {}, cloud: undefined, cloudBusy: false, msg: '', live: false };
const netOn = () => !!(NET.ok && NET.ready && NET.user && NET.me && NET.me.name);
function n2Msg(m) { N2.msg = m || ''; if (['scBoards', 'scCloud', 'scInbox', 'scChSend'].includes(UI.top)) UI.refresh(); }

// ---------- leaderboards ----------
function lbSubmit(b, s) {
  s = Math.round(s || 0); if (!netOn() || !(s > 0) || s >= 1e8) return Promise.resolve(false);
  const best = SAVE.lbb || (SAVE.lbb = {}), k = lbKey(b); if ((best[k] || 0) >= s) return Promise.resolve(false); best[k] = s; saveGame();
  const row = { n: NET.me.name, s, lv: PS().xp.lv, hull: SAVE.pl[0].cfg.hull, at: TS() };
  return R_('lb/' + k + '/' + NET.user.uid).transaction(cur => (!cur || !(cur.s >= s)) ? row : undefined).then(() => { delete N2.lb[k]; return true; }).catch(e => { delete best[k]; console.warn('lb', e); return false; });
}
function lbSyncAll() { // push local bests once you sign in, so the boards are never empty
  if (!netOn()) return; const H = SAVE.hi || {};
  lbSubmit('pilot', PS().xp.tot || 0); lbSubmit('endless', H.endless && H.endless.score); lbSubmit('blitz', H.blitz && H.blitz.score); lbSubmit('defense', H.def && H.def.score);
  const dl = SAVE.dl && SAVE.dl.best && SAVE.dl.best[dayKey()]; if (dl) lbSubmit('daily', typeof dl === 'object' ? dl.score : dl);
}
function lbAfterRun(d) {
  if (!d || G.net || d.online || d.assist) return; const m = d.mode;
  if (['endless', 'blitz', 'rush', 'hardcore', 'defense', 'daily'].includes(m)) lbSubmit(m, d.score);
  lbSubmit('pilot', PS().xp.tot || 0);
}
async function lbLoad(b, force) {
  const k = lbKey(b); if (!netOn()) return;
  if (N2.lbView === 'global') {
    if (N2.lb[k] && !force) return; N2.lbLoading = true; n2Msg('');
    try { const sn = await R_('lb/' + k).orderByChild('s').limitToLast(50).once('value'), out = []; sn.forEach(c => { const v = c.val(); if (v && typeof v.s === 'number') out.push(Object.assign({ uid: c.key }, v)); }); out.sort((a, z) => z.s - a.s); N2.lb[k] = out; }
    catch (e) { n2Msg('!Could not load the leaderboard (' + (e.code || e.message) + '). Make sure the newest security rules are published in Firebase.'); }
  } else {
    N2.lbLoading = true; const ids = [NET.user.uid].concat(Object.keys(NET.friends || {})), out = [];
    try { await Promise.all(ids.map(u => R_('lb/' + k + '/' + u).once('value').then(s => { const v = s.val(); if (v && typeof v.s === 'number') out.push(Object.assign({ uid: u }, v)); }))); out.sort((a, z) => z.s - a.s); N2.lbFr[k] = out; }
    catch (e) { n2Msg('!Could not load your friends\' scores (' + (e.code || e.message) + ').'); }
  }
  N2.lbLoading = false; if (UI.top === 'scBoards') UI.refresh();
}
const lbFmt = (b, s) => b === 'pilot' ? fmt(s) + ' XP' : fmt(s);

// ---------- cloud save ----------
const saveSum = s => { s = s || SAVE; const x = s.xp || { lv: 1 }; return { wu: Math.min(s.wu || 1, WORLDS.length), lv: x.lv || 1, cores: s.cores | 0, kills: (s.st && s.st.kills) | 0 }; };
async function cloudPeek() {
  if (!netOn()) return; try { const s = await R_('saves/' + NET.user.uid).once('value'); const v = s.val(); N2.cloud = v ? { at: v.at, ver: v.ver, sum: v.sum || {}, size: (v.d || '').length } : null; } catch (e) { N2.cloud = undefined; n2Msg('!Could not check your cloud save (' + (e.code || e.message) + ').'); }
  if (UI.top === 'scCloud') UI.refresh();
}
async function cloudUp(quiet) {
  if (!netOn() || N2.cloudBusy) return; N2.cloudBusy = true; if (!quiet) n2Msg('Uploading...');
  try { saveGame(); const d = exportCode(SLOT), sum = saveSum(); await R_('saves/' + NET.user.uid).set({ d, ver: GAME_VER, sum, at: TS() }); SAVE.cloudAt = Date.now(); store.set(SAVE_KEY, JSON.stringify(SAVE)); N2.cloud = { at: Date.now(), ver: GAME_VER, sum, size: d.length }; if (!quiet) n2Msg('Saved to the cloud!'); }
  catch (e) { if (!quiet) n2Msg('!Upload failed (' + (e.code || e.message) + ').'); }
  N2.cloudBusy = false; if (UI.top === 'scCloud') UI.refresh();
}
async function cloudDown() {
  if (!netOn() || N2.cloudBusy) return; N2.cloudBusy = true; n2Msg('Downloading...');
  try { const s = await R_('saves/' + NET.user.uid).once('value'), v = s.val(); if (!v || !v.d) { n2Msg('!There is no cloud save yet.'); }
    else { const err = importCode(v.d, SLOT); if (err) n2Msg('!' + err); else { SAVE.cloudAt = v.at || Date.now(); saveGame(); n2Msg('Cloud save loaded into slot ' + (SLOT + 1) + '!'); } } }
  catch (e) { n2Msg('!Download failed (' + (e.code || e.message) + ').'); }
  N2.cloudBusy = false; N2.cloudSure = false; if (UI.top === 'scCloud') UI.refresh();
}
let cloudT = 0;
function cloudAuto() { if (SET.cloudAuto === false || !netOn()) return; const now = Date.now(); if (now - cloudT < 90000) return; cloudT = now; cloudUp(true); }

// ---------- challenge inbox ----------
function inboxStart() {
  if (N2.live || !netOn()) return; N2.live = true;
  netSub(R_('inbox/' + NET.user.uid), 'value', s => { N2.inbox = s.val() || {}; const n = inboxCount(); if (n > (N2.lastN || 0) && N2.lastN !== undefined && G.scene !== 'play') toast('NEW IN YOUR INBOX', n + ' message' + (n > 1 ? 's' : ''), '#22d3ee'); N2.lastN = n; if (['scInbox', 'scOnline', 'scMenu'].includes(UI.top)) UI.refresh(); });
}
const inboxList = () => Object.keys(N2.inbox || {}).map(k => Object.assign({ id: k }, N2.inbox[k])).filter(m => m && m.f && !NET.blocked[m.f]).sort((a, z) => (z.at || 0) - (a.at || 0));
const inboxCount = () => inboxList().length;
function chSend(uid, code, s) {
  if (!netOn()) return Promise.reject(new Error('Sign in first'));
  return R_('inbox/' + uid).push({ t: 'ch', f: NET.user.uid, n: NET.me.name, c: String(code).slice(0, 40), s: Math.round(s || 0), at: TS() });
}
function chPlayInbox(id) {
  const m = (N2.inbox || {})[id]; if (!m) return; const c = chParse(m.c); if (!c) { n2Msg('!That challenge code is broken.'); return; }
  if (c.w >= SAVE.wu) { n2Msg('!You need to unlock World ' + (c.w + 1) + ' to play this one.'); return; }
  c.from = { uid: m.f, name: m.n, id, s: m.s }; startChallenge(c);
}
function chReplyAfter(d) { // tell the friend how you did, and clear the challenge
  const c = d && d.chal; if (!c || !c.from || !netOn()) return; const f = c.from;
  R_('inbox/' + f.uid).push({ t: 'res', f: NET.user.uid, n: NET.me.name, c: c.code || '', s: Math.round(d.score || 0), y: f.s | 0, at: TS() }).catch(() => { });
  R_('inbox/' + NET.user.uid + '/' + f.id).remove().catch(() => { }); c.from = null;
}

// ---------- hooks ----------
const _nStartLive = netStartLive;
netStartLive = function () { const r = _nStartLive.apply(this, arguments); try { inboxStart(); lbSyncAll(); cloudPeek().then(() => { const c = N2.cloud, mine = saveSum(); if (c && c.sum && (c.sum.wu > mine.wu || c.sum.lv > mine.lv) && !SAVE.cloudAt) toast('CLOUD SAVE FOUND', 'Online > Cloud Save to load it', '#fbbf24'); }); } catch (e) { console.warn('online2', e); } return r; };
const _nSignOut = netSignOut;
netSignOut = function () { N2.live = false; N2.inbox = {}; N2.lb = {}; N2.lbFr = {}; N2.cloud = undefined; N2.lastN = undefined; return _nSignOut.apply(this, arguments); };
const _uiRes = UI.result.bind(UI);
UI.result = function (d) { const r = _uiRes(d); try { lbAfterRun(d); chReplyAfter(d); cloudAuto(); } catch (e) { console.warn('online2 result', e); } return r; };

// ---------- screens ----------
const n2m = () => N2.msg ? '<div class="xs ' + (N2.msg[0] === '!' ? 'bad' : 'good') + '" style="margin:6px 0">' + escH(N2.msg.replace(/^!/, '')) + '</div>' : '';
const n2Gate = t => { if (!NET.ok) return '<div class="card mid"><h2>' + t + '</h2><p class="mut sm" style="line-height:1.7;margin:10px 0">This needs the online version of Aetheria on the website (Google sign-in cannot open inside this window).</p><div class="item"><b class="acc">' + WEB_URL + '</b><button class="btn sm" data-act="copycode:' + WEB_URL + '">COPY LINK</button></div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button></div></div>'; if (!netOn()) return '<div class="card mid"><h2>' + t + '</h2><p class="mut sm" style="margin:10px 0">Sign in on the Online screen first.</p><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn gold" data-act="online">GO ONLINE</button></div></div>'; return null; };
Object.assign(SCR, {
  scBoards: () => {
    const g = n2Gate('Leaderboards'); if (g) return g;
    const b = N2.lbB, k = lbKey(b), glob = N2.lbView === 'global', rows = (glob ? N2.lb[k] : N2.lbFr[k]), me = NET.user.uid, B = LB.find(x => x[0] === b) || LB[0];
    if (!rows && !N2.lbLoading) setTimeout(() => lbLoad(b), 0);
    const mine = rows ? rows.findIndex(r => r.uid === me) : -1, myBest = (SAVE.lbb || {})[k] || 0;
    const list = !rows ? '<div class="mut sm" style="padding:24px 4px">Loading...</div>' : !rows.length ? '<div class="mut sm" style="padding:24px 4px">No scores yet. Be the first!</div>' : rows.map((r, i) => '<div class="lbrow' + (r.uid === me ? ' me' : '') + (i < 3 ? ' top' + (i + 1) : '') + '"><span class="lbr">' + (i + 1) + '</span><span class="lbn">' + escH(r.n || '?') + '<span class="xs mut"> LV ' + (r.lv | 0 || 1) + '</span></span><span class="lbs">' + lbFmt(b, r.s) + '</span></div>').join('');
    return '<div class="lay lay-modes lb2"><header class="lay-h"><h1 class="lay-t">Leaderboards</h1><div class="mm-seg" role="group" aria-label="Scope"><button data-act="lbv:global" class="' + (glob ? 'on' : '') + '">Global</button><button data-act="lbv:friends" class="' + (glob ? '' : 'on') + '">Friends</button></div></header>' +
      '<div class="sm-cols"><nav class="sm-list">' + LB.map(x => '<button class="sm-row' + (x[0] === b ? ' on' : '') + '" data-act="lbb:' + x[0] + '"><span class="sm-nm">' + x[1] + '</span></button>').join('') + '</nav>' +
      '<section class="sm-brief lbmain"><h2 class="sm-bt">' + B[1] + '</h2><p class="sm-bd" style="margin-bottom:8px">' + B[2] + (b === 'daily' ? ' (' + dayKey() + ')' : '') + '</p>' + n2m() + '<div class="lblist">' + list + '</div>' +
      '<p class="xs mut" style="margin-top:10px">' + (mine >= 0 ? 'You are #' + (mine + 1) + (glob ? ' in the world' : ' among your friends') : myBest ? 'Your best: ' + lbFmt(b, myBest) + (glob ? ' - not in the top 50 yet' : '') : 'Play this mode to get on the board') + '</p></section></div>' +
      '<footer class="lay-f"><button class="btn sm" data-act="back">Back</button><button class="btn sm" data-act="lbre">Refresh</button></footer></div>';
  },
  scCloud: () => {
    const g = n2Gate('Cloud Save'); if (g) return g;
    if (N2.cloud === undefined && !N2.cloudBusy) setTimeout(cloudPeek, 0);
    const c = N2.cloud, m = saveSum(), d = t => t ? new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-';
    const box = (t, s, sub) => '<div class="item cl-box"><div class="fl"><div class="xs mut b nh" style="margin:0">' + t + '</div>' + (s ? '<div class="cl-st"><span><b>' + s.wu + '</b>/' + WORLDS.length + ' worlds</span><span>LV <b>' + s.lv + '</b></span><span><b class="gold">' + fmt(s.cores) + '</b> cores</span></div>' : '<div class="mut sm" style="margin-top:6px">' + (c === undefined ? 'Checking...' : 'Nothing saved yet') + '</div>') + '<div class="xs mut">' + sub + '</div></div></div>';
    return '<div class="card mid"><h2>Cloud Save</h2><p class="mut sm" style="margin:6px 0 10px">Keep your progress safe in your account and carry it to any computer: sign in there and press DOWNLOAD.</p>' + n2m() +
      '<div class="grid2">' + box('THIS DEVICE - SLOT ' + (SLOT + 1), m, SAVE.cloudAt ? 'Last synced ' + d(SAVE.cloudAt) : 'Never synced') + box('IN THE CLOUD', c && c.sum, c ? 'Saved ' + d(c.at) + ' (' + escH(c.ver || '') + ')' : '') + '</div>' +
      '<div class="grid2" style="margin-top:10px"><button class="btn gold' + (N2.cloudBusy ? ' off' : '') + '" data-act="clup">UPLOAD THIS DEVICE</button><button class="btn' + (N2.cloudBusy || !c ? ' off' : '') + (N2.cloudSure ? ' warn' : '') + '" data-act="cldown">' + (N2.cloudSure ? 'PRESS AGAIN TO REPLACE SLOT ' + (SLOT + 1) : 'DOWNLOAD TO THIS DEVICE') + '</button></div>' +
      '<div class="setrow" style="margin-top:12px"><span>Auto-backup after each run</span><button class="tog' + (SET.cloudAuto !== false ? ' on' : '') + '" data-act="clauto"></button></div>' +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><span class="xs mut">Downloading replaces the save in slot ' + (SLOT + 1) + '</span></div></div>';
  },
  scInbox: () => {
    const g = n2Gate('Inbox'); if (g) return g; const L = inboxList();
    const it = m => m.t === 'res'
      ? '<div class="item"><div class="fl"><div class="b sm">' + escH(m.n) + ' played your challenge</div><div class="xs ' + (m.s > m.y ? 'bad' : 'good') + '">They scored ' + fmt(m.s) + ' - you set ' + fmt(m.y) + (m.s > m.y ? '. They beat you!' : '. You are still the champ!') + '</div></div><span class="row" style="gap:6px">' + (m.s > m.y ? '<button class="btn sm gold" data-act="ibrevenge:' + m.id + '">REVENGE</button>' : '') + '<button class="btn sm" data-act="ibdel:' + m.id + '">OK</button></span></div>'
      : (() => { const c = chParse(m.c) || {}; return '<div class="item"><div class="fl"><div class="b sm"><span class="acc">' + escH(m.n) + '</span> challenged you</div><div class="xs mut">' + (c.w >= 0 ? 'World ' + (c.w + 1) + ' sector ' + (c.lv + 1) + ' - ' : '') + 'beat <b class="gold">' + fmt(m.s) + '</b></div></div><span class="row" style="gap:6px"><button class="btn sm gold" data-act="ibplay:' + m.id + '">PLAY</button><button class="btn sm" data-act="ibdel:' + m.id + '">X</button></span></div>'; })();
    return '<div class="card mid"><div class="row sp"><h2>Inbox</h2><span class="xs mut">' + L.length + ' message' + (L.length === 1 ? '' : 's') + '</span></div><p class="mut sm" style="margin:6px 0 10px">Friends send you challenge codes here. Beat their score and they find out!</p>' + n2m() +
      '<div class="stack" style="gap:6px">' + (L.length ? L.map(it).join('') : '<div class="mut sm" style="padding:18px 4px">Nothing here yet. Finish a challenge or press SEND on the Challenge screen to dare a friend.</div>') + '</div>' +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button><button class="btn sm" data-act="mode:chal">NEW CHALLENGE</button></div></div>';
  },
  scChSend: () => {
    const g = n2Gate('Send a Challenge'); if (g) return g; const S = UI.chSend || {}, fr = Object.keys(NET.friends || {});
    return '<div class="card mid"><h2>Send a Challenge</h2><div class="xs mut" style="margin:4px 0 10px">Code <b class="acc">' + escH(S.code || '') + '</b> - they need to beat <b class="gold">' + fmt(S.s || 0) + '</b></div>' + n2m() +
      '<div class="stack" style="gap:6px">' + (fr.length ? fr.map(u => { const f = NET.fdata[u] || {}, sent = (UI.chSent || {})[u]; return '<div class="item"><div class="fl b sm">' + escH(f.name || '...') + '</div><button class="btn sm' + (sent ? ' off' : ' gold') + '" data-act="chsend:' + u + '">' + (sent ? 'SENT' : 'SEND') + '</button></div>'; }).join('') : '<div class="mut sm">Add friends on the Online screen first.</div>') + '</div>' +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">DONE</button></div></div>';
  }
});
Object.assign(ACT, {
  boards() { N2.msg = ''; UI.show('scBoards'); },
  lbb(a) { N2.lbB = a[0]; N2.msg = ''; UI.refresh(); },
  lbv(a) { N2.lbView = a[0]; UI.refresh(); },
  lbre() { const k = lbKey(N2.lbB); delete N2.lb[k]; delete N2.lbFr[k]; lbLoad(N2.lbB, true); UI.refresh(); },
  cloud() { N2.msg = ''; N2.cloudSure = false; UI.show('scCloud'); },
  clup() { cloudUp(); },
  cldown() { if (!N2.cloud) return; if (!N2.cloudSure) { N2.cloudSure = true; UI.refresh(); return; } cloudDown(); },
  clauto() { SET.cloudAuto = SET.cloudAuto === false; saveSet(); UI.refresh(); },
  inbox() { N2.msg = ''; UI.show('scInbox'); },
  ibplay(a) { chPlayInbox(a[0]); },
  ibdel(a) { if (netOn()) R_('inbox/' + NET.user.uid + '/' + a[0]).remove().catch(() => { }); },
  ibrevenge(a) { const m = (N2.inbox || {})[a[0]]; if (!m) return; const c = chParse(m.c); R_('inbox/' + NET.user.uid + '/' + a[0]).remove().catch(() => { }); if (c && c.w < SAVE.wu) { c.target = m.s; startChallenge(c); } },
  chsendto(a) { UI.chSend = { code: a[0], s: +a[1] || 0 }; UI.chSent = {}; N2.msg = ''; UI.show('scChSend'); },
  chsend(a) { const S = UI.chSend || {}; if ((UI.chSent || {})[a[0]]) return; chSend(a[0], S.code, S.s).then(() => { (UI.chSent = UI.chSent || {})[a[0]] = 1; SFX.click && SFX.click(); n2Msg('Challenge sent!'); }).catch(e => n2Msg('!Could not send (' + (e.code || e.message) + ').')); }
});
