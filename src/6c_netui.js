// ================= UI: Online hub, pilot name, room lobby =================
const dot = on => '<i class="ndot' + (on ? ' on' : '') + '"></i>';
Object.assign(SCR, {
  scOnline: () => {
    const msg = NET.msg ? '<div class="xs ' + (NET.msg[0] === '!' ? 'bad' : 'good') + '" style="margin:6px 0">' + escH(NET.msg.replace(/^!/, '')) + '</div>' : '';
    if (!NET.ok) return '<div class="card mid"><h2>Online</h2><p class="mut sm" style="line-height:1.7;margin:10px 0">Online play - friends, co-op and versus with other people - runs on the Aetheria website, because Google sign-in cannot open inside this window.</p>' + webLinkBox() + '<div class="xs mut" style="margin-top:8px">Your progress here and on the website are separate saves. Use Settings > Data > Save Slots > EXPORT to move it over.</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="nhome">BACK</button></div></div>';
    if (!NET.ready) { netInit().catch(e => { NET.msg = '!Could not reach the online service (' + e.message + ').'; UI.refresh(); }); return '<div class="card mid"><h2>Online</h2><p class="mut" style="margin:14px 0">Connecting...</p>' + msg + '<button class="btn sm" data-act="nhome">BACK</button></div>'; }
    if (!NET.user) return '<div class="card mid"><h2>Online</h2><p class="mut sm" style="line-height:1.7;margin:10px 0">Sign in to add friends, see who is online, and fly co-op or versus with other pilots. Single-player never needs an account.</p>' + msg + '<button class="btn big" data-act="nsignin">SIGN IN WITH GOOGLE</button><div class="xs mut" style="margin-top:8px">We only store your pilot name, friend code and game stats - never your email in public.</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="nhome">BACK</button></div></div>';
    if (!NET.me || !NET.me.name) return SCR.scName();
    const me = NET.me, fr = Object.keys(NET.friends), rq = Object.keys(NET.reqs).filter(k => !NET.blocked[k]), inv = Object.keys(NET.invites).filter(k => !NET.blocked[k] && Date.now() - (NET.invites[k].at || 0) < 600000);
    const fl = fr.length ? fr.map(uid => { const f = NET.fdata[uid] || {}, pr = NET.pres[uid], on = !!(pr && pr.on); return '<div class="item frow"><div class="fl"><div class="b sm">' + dot(on) + escH(f.name || '...') + ' <span class="xs mut">' + escH(f.rk || '') + ' LV ' + (f.lv || 1) + '</span></div><div class="xs mut">' + (on ? (pr.room ? 'In a room' : 'Online') : 'Offline') + ' - best endless ' + fmt(f.hi || 0) + ' - ' + (f.wu || 1) + ' worlds</div></div><span class="row" style="gap:6px">' + (NET.code && on ? '<button class="btn sm gold" data-act="ninv:' + uid + '">INVITE</button>' : '') + '<button class="btn sm" data-act="nmore:' + uid + '">...</button></span></div>' + (UI.nmore === uid ? '<div class="row" style="gap:6px;margin:-4px 0 6px 10px"><button class="btn sm warn" data-act="nunf:' + uid + '">REMOVE FRIEND</button><button class="btn sm warn" data-act="nblock:' + uid + '">BLOCK</button><button class="btn sm warn" data-act="nrep:' + uid + '">REPORT NAME</button></div>' : ''); }).join('') : '<div class="xs mut">No friends yet. Share your friend code, or add someone else\'s below.</div>';
    return '<div class="card wide"><div class="row sp wrap"><div><h2>Online</h2><div class="xs mut">Signed in as <b class="acc">' + escH(me.name) + '</b> - friend code <b class="gold" style="letter-spacing:.1em">' + escH(me.code || '-') + '</b> <button class="btn sm" data-act="copycode:' + escH(me.code || '') + '" style="padding:3px 8px">COPY</button></div></div><span class="row wrap" style="gap:6px"><button class="btn sm gold" data-act="ranked">RANKED</button><button class="btn sm gold" data-act="boards">LEADERBOARDS</button><button class="btn sm' + (inboxCount() ? ' gold' : '') + '" data-act="inbox">INBOX' + (inboxCount() ? ' (' + inboxCount() + ')' : '') + '</button><button class="btn sm" data-act="cloud">CLOUD SAVE</button><button class="btn sm" data-act="nrename">CHANGE NAME</button><button class="btn sm" data-act="nsignout">SIGN OUT</button></span></div>' + msg +
      (inv.length ? '<div class="xs mut b nh">INVITES</div>' + inv.map(k => '<div class="item"><div class="fl b sm">' + escH(NET.invites[k].name) + ' invited you to ' + (NET.invites[k].mode === 'vs' ? 'VERSUS' : 'CO-OP') + '</div><span class="row" style="gap:6px"><button class="btn sm gold" data-act="njoininv:' + k + '">JOIN</button><button class="btn sm" data-act="ndelinv:' + k + '">NO</button></span></div>').join('') : '') +
      '<div class="grid2" style="margin-top:10px"><div><div class="xs mut b nh">PLAY</div><div class="stack" style="gap:8px"><div class="grid2"><button class="btn gold" data-act="nquick:coop">QUICK CO-OP (UP TO 4)</button><button class="btn gold" data-act="nquick:vs">QUICK VERSUS</button></div><button class="btn" data-act="ranked">RANKED VERSUS</button><button class="btn" data-act="ncreate">CREATE PRIVATE ROOM</button><div class="row" style="gap:6px"><input id="nRoom" class="code" maxlength="4" placeholder="CODE" style="flex:1;text-transform:uppercase;letter-spacing:.3em;font-size:16px"><button class="btn" data-act="njoin">JOIN ROOM</button></div></div>' +
      (rq.length ? '<div class="xs mut b nh">FRIEND REQUESTS</div>' + rq.map(k => '<div class="item"><div class="fl b sm">' + escH(NET.reqs[k].name || '?') + '</div><span class="row" style="gap:6px"><button class="btn sm gold" data-act="nacc:' + k + '">ACCEPT</button><button class="btn sm" data-act="ndec:' + k + '">NO</button><button class="btn sm warn" data-act="nblock:' + k + '">BLOCK</button></span></div>').join('') : '') +
      '<div class="xs mut b nh">ADD A FRIEND</div><div class="row" style="gap:6px"><input id="nFriend" class="code" placeholder="ACE-1234" style="flex:1;text-transform:uppercase"><button class="btn" data-act="nadd">SEND REQUEST</button></div></div>' +
      '<div><div class="xs mut b nh">FRIENDS (' + fr.length + ')</div><div class="stack flist" style="gap:6px">' + fl + '</div></div></div>' +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="nhome">BACK</button><span class="xs mut">In a match: 7 8 9 0 send quick emotes</span></div></div>';
  },
  scName: () => '<div class="card mid"><h2>Pick your pilot name</h2><p class="mut sm" style="margin:8px 0">This is what friends and other players see. 3-16 characters: letters, numbers, spaces, - or _. Keep it friendly.</p><div class="row" style="gap:8px"><input id="nName" class="code" maxlength="16" value="' + escH((NET.me && NET.me.name) || UI.nName || '') + '" style="flex:1;font-size:16px"><button class="btn gold" data-act="nsetname">SAVE</button></div><div class="xs bad" style="margin-top:6px">' + escH(UI.nErr || '') + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="nback">BACK</button></div></div>',
  scRoom: () => {
    const r = NET.room || {}, host = NET.role === 'host', gs = roomGuests(r), mx = roomMax(r), conn = NET.conn ? (NET.conn.mode === 'rtc' ? 'DIRECT' : 'RELAY') + (NET.conn.ping ? ' - ' + NET.conn.ping + ' ms' : '') : '', rk = r.mode === 'rk';
    const msg = NET.msg ? '<div class="xs ' + (NET.msg[0] === '!' ? 'bad' : 'good') + '" style="margin:6px 0">' + escH(NET.msg.replace(/^!/, '')) + '</div>' : '';
    const worlds = WORLDS.map((W, w) => w < SAVE.wu ? '<option value="' + w + '"' + ((r.w | 0) === w ? ' selected' : '') + '>' + (w + 1) + '. ' + escH(W.nm) + '</option>' : '').join('');
    const lvs = NODE_PAT.map((t, i) => '<option value="' + i + '"' + ((r.lv | 0) === i ? ' selected' : '') + '>Sector ' + (i + 1) + ' - ' + NODE_NAME[t] + '</option>').join('');
    const fr = Object.keys(NET.friends).filter(u => NET.pres[u] && NET.pres[u].on && !NET.pres[u].room);
    const slot = (i, nm, tag) => '<div class="item rslot' + (nm ? ' on' : '') + '" style="--pc:' + PCOL[i] + '"><div class="fl"><div class="xs mut b">PILOT ' + (i + 1) + (tag ? ' - ' + tag : '') + '</div><div class="b" style="color:' + (nm ? PCOL[i] : '') + '">' + (nm ? escH(nm) : '<span class="mut">' + (i < mx ? 'waiting...' : '-') + '</span>') + '</div></div></div>';
    const slots = [slot(0, r.hn || '...', 'HOST')]; for (let i = 1; i < mx; i++) { const u = gs[i - 1]; slots.push(slot(i, u ? (r.pl[u].n || '?') : '')); }
    return '<div class="card mid"><div class="row sp"><h2>' + (rk ? 'Ranked Match' : r.quick ? 'Quick Match' : 'Room') + '</h2><span class="gold b" style="font-size:22px;letter-spacing:.3em">' + escH(NET.code || '----') + '</span></div><div class="xs mut">' + (rk ? 'One versus one. Your rating goes up or down when it ends.' : 'Up to 4 pilots. Friends can join with this code from Online > JOIN ROOM.') + '</div>' + msg +
      '<div class="grid2" style="margin-top:10px">' + slots.join('') + '</div>' +
      (rk ? '' : '<div class="xs mut b nh">MODE</div><div class="seg">' + [['coop', 'CO-OP'], ['vs', 'VERSUS']].map(m => '<button data-act="nmode:' + m[0] + '" class="' + (r.mode === m[0] ? 'on' : '') + '"' + (host ? '' : ' disabled') + '>' + m[1] + '</button>').join('') + '</div>') +
      (r.mode === 'coop' ? '<div class="edrow" style="margin-top:8px"><label>WORLD</label><select data-nchg="w"' + (host ? '' : ' disabled') + '>' + worlds + '</select></div><div class="edrow"><label>SECTOR</label><select data-nchg="lv"' + (host ? '' : ' disabled') + '>' + lvs + '</select></div><div class="xs mut">Enemies get tougher with every extra pilot.</div>' : '<div class="xs mut" style="margin-top:8px">Two minutes, most points wins. Getting hit or shot down costs points.</div>') +
      (host && !rk && gs.length < mx - 1 && fr.length ? '<div class="xs mut b nh">INVITE AN ONLINE FRIEND</div><div class="row wrap" style="gap:6px">' + fr.map(u => '<button class="btn sm" data-act="ninv:' + u + '">' + escH((NET.fdata[u] || {}).name || '?') + '</button>').join('') + '</div>' : '') +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm warn" data-act="nleave">LEAVE</button><span class="xs mut">' + conn + '</span>' + (host && !rk ? '<button class="btn big' + (gs.length ? '' : ' off') + '" data-act="nstart">START' + (gs.length ? ' (' + (gs.length + 1) + ')' : '') + '</button>' : '<span class="xs mut">' + (rk ? (gs.length ? 'Starting...' : 'Waiting for an opponent...') : 'The host starts the match') + '</span>') + '</div></div>';
  }
});
const nAsync = (p, ok) => Promise.resolve(p).then(m => { NET.msg = m || ok || ''; UI.refresh(); }).catch(e => { NET.msg = '!' + (e && e.message || 'Something went wrong'); UI.refresh(); });
Object.assign(ACT, {
  online() { NET.msg = ''; UI.show('scOnline'); },
  nhome() { netLeaveRoom(); NET.msg = ''; UI.hist = []; UI.show('scMenu'); },
  nsignin() { NET.msg = ''; netSignIn(); },
  nsignout() { netSignOut(); NET.msg = 'Signed out.'; UI.refresh(); },
  nrename() { UI.nErr = ''; UI.show('scName'); },
  nback() { UI.show('scOnline'); },
  nsetname() { const v = inVal('nName') || ''; UI.nName = v; UI.nErr = 'Saving...'; UI.refresh(); const to = new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 9000)); Promise.race([netSetName(v), to]).then(err => { UI.nErr = err; if (!err) { NET.msg = 'Welcome, ' + v + '!'; UI.show('scOnline'); } else UI.refresh(); }).catch(e => { const c = (e && (e.code || e.message)) || 'unknown'; UI.nErr = /PERMISSION|permission/.test(c) ? 'The database said no (permission denied). Make sure the security rules are published in Firebase > Realtime Database > Rules.' : c === 'timeout' ? 'Could not reach the database. Make sure the Realtime Database is created, and check its link.' : 'Error: ' + c; UI.refresh(); }); },
  nadd() { nAsync(netAddFriend(inVal('nFriend'))); },
  nacc(a) { nAsync(netAccept(a[0]), 'Friend added!'); },
  ndec(a) { nAsync(netDecline(a[0])); },
  nmore(a) { UI.nmore = UI.nmore === a[0] ? null : a[0]; UI.refresh(); },
  nunf(a) { nAsync(netUnfriend(a[0]), 'Friend removed.'); },
  nblock(a) { nAsync(netBlock(a[0]), 'Blocked.'); },
  nrep(a) { nAsync(netReport(a[0], 'name'), 'Reported. Thanks for keeping it friendly.'); },
  ninv(a) { nAsync(netInvite(a[0]), 'Invite sent!'); },
  njoininv(a) { nAsync(netAcceptInvite(a[0])); },
  ndelinv(a) { nAsync(R_('invites/' + NET.user.uid + '/' + a[0]).remove()); },
  nquick(a) { NET.msg = 'Looking for a match...'; UI.refresh(); nAsync(netQuick(a[0])); },
  ncreate() { NET.msg = ''; nAsync(netCreateRoom(false, 'coop').then(() => '')); },
  njoin() { nAsync(netJoinRoom(inVal('nRoom'))); },
  nmode(a) { netRoomSet('mode', a[0]); },
  nstart() { nAsync(netStart()); },
  nleave() { netLeaveRoom(); NET.msg = ''; UI.show('scOnline'); }
});
document.addEventListener('change', e => { const el = e.target && e.target.closest && e.target.closest('[data-nchg]'); if (el && UI.top === 'scRoom') netRoomSet(el.dataset.nchg, +el.value); });
// after an online match: back to the room instead of replaying alone
['retry', 'menu', 'nextlv', 'tomap'].forEach(k => { const f = ACT[k]; ACT[k] = function (a) { if (G.net || (UI.res && UI.res.online) || NET.inMatch) { const host = NET.role === 'host'; netEndNet(); NET.inMatch = 0; exitToMenu(NET.code ? 'scRoom' : 'scOnline'); if (host && NET.code) netRoomSet('st', 'open'); return; } return f.apply(this, arguments); }; });

// leaving the online screens any other way (Esc, back gesture) never traps you in a room
const _uiBack = UI.back.bind(UI);
UI.back = function () { if (this.top === 'scOnline' || this.top === 'scName') { ACT.nhome(); return; } if (this.top === 'scRoom') { ACT.nleave(); return; } return _uiBack(); };
