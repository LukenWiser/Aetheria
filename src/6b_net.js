// ================= ONLINE: Firebase sign-in, profiles, friends, presence, invites, rooms, and online co-op / versus =================
// Online only runs on the web version (GitHub Pages). The claude.ai version points players to the website instead.
const FB_CFG = { apiKey: 'AIzaSyD8pdSPg6W36pGWlkk0sUUl9qkyubaO4oo', authDomain: 'aetheria-qs.firebaseapp.com', projectId: 'aetheria-qs', storageBucket: 'aetheria-qs.firebasestorage.app', messagingSenderId: '359429804121', appId: '1:359429804121:web:01a46890a270cef9cda148', databaseURL: 'https://aetheria-qs-default-rtdb.firebaseio.com' };
const WEB_URL = 'https://lukenwiser.github.io/Aetheria/';
const FB_VER = '10.12.2';
const NET = { ok: /(^|\.)github\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) || !!window.__netTest, ready: false, loading: null, user: null, me: null, db: null, friends: {}, fdata: {}, pres: {}, reqs: {}, invites: {}, room: null, code: null, role: null, conn: null, msg: '', subs: [], blocked: {} };
const NETG = { wsel: 0 };
// ---------- loading the Firebase SDK (only when someone opens the Online screen) ----------
function netScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); }); }
function netInit() {
  if (!NET.ok) return Promise.reject(new Error('offline build'));
  if (NET.loading) return NET.loading;
  NET.loading = (async () => {
    if (!window.firebase) { const b = 'https://cdn.jsdelivr.net/npm/firebase@' + FB_VER + '/'; await netScript(b + 'firebase-app-compat.js'); await Promise.all([netScript(b + 'firebase-auth-compat.js'), netScript(b + 'firebase-database-compat.js')]); }
    if (!firebase.apps.length) firebase.initializeApp(FB_CFG);
    NET.db = firebase.database(); NET.ready = true;
    firebase.auth().onAuthStateChanged(u => { NET.user = u; if (u) netSignedIn(u); else netSignedOut(); if (UI.top === 'scOnline' || UI.top === 'scName') UI.refresh(); });
  })();
  return NET.loading;
}
const R_ = p => NET.db.ref(p);
const TS = () => firebase.database.ServerValue.TIMESTAMP;
function netSub(ref, ev, fn) { ref.on(ev, fn); NET.subs.push(() => ref.off(ev, fn)); }
async function netSignIn() {
  try { await netInit(); const pr = new firebase.auth.GoogleAuthProvider(); try { await firebase.auth().signInWithPopup(pr); } catch (e) { if (e && /popup/.test(e.code || '')) await firebase.auth().signInWithRedirect(pr); else throw e; } }
  catch (e) { NET.msg = '!Sign-in failed: ' + ((e && (e.code || e.message)) || 'unknown error'); UI.refresh(); }
}
function netSignOut() { netLeaveRoom(); NET.subs.forEach(f => f()); NET.subs = []; try { firebase.auth().signOut(); } catch (e) { } }
function netSignedOut() { NET.me = null; NET.friends = {}; NET.reqs = {}; NET.invites = {}; }
async function netSignedIn(u) {
  let snap; try { snap = await R_('users/' + u.uid).once('value'); } catch (e) { NET.msg = '!Database error: ' + (e.code || e.message) + ' - check the security rules in Firebase.'; UI.refresh(); return; } NET.me = snap.val();
  if (!NET.me || !NET.me.name) { if (UI.top !== 'scName') UI.show('scName'); return; }
  netStartLive();
}
// ---------- pilot names + friend codes ----------
const BADW = ['fuck', 'shit', 'bitch', 'cunt', 'nigg', 'whore', 'slut', 'porn', 'penis', 'vagina', 'retard', 'hitler', 'nazi', 'pussy', 'faggot'], BADX = ['cum', 'sex', 'anal', 'rape', 'cock', 'dick', 'fag', 'kys', 'ass', 'tits', 'boob'];
const nameKey = n => n.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
function nameOk(n) {
  if (n.length < 3 || n.length > 16) return 'Names need 3 to 16 characters (you have ' + n.length + ').';
  const bad = n.replace(/[A-Za-z0-9 _-]/g, ''); if (bad) return 'These characters are not allowed: ' + Array.from(new Set(bad)).join(' ') + ' - use letters, numbers, spaces, - or _';
  if (!/[A-Za-z0-9]/.test(n)) return 'Use at least one letter or number.';
  const l = n.toLowerCase().replace(/[0-9]/g, m => ({ '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' })[m] || m), flat = l.replace(/[^a-z]/g, ''), words = l.split(/[^a-z]+/);
  if (BADW.some(w => flat.indexOf(w) >= 0) || BADX.some(w => words.indexOf(w) >= 0)) return 'Pick a friendlier name.'; return '';
}
async function netSetName(n) {
  const u = NET.user; n = String(n || '').trim(); const bad = nameOk(n); if (bad) return bad;
  n = n.replace(/\s+/g, ' '); const lk = nameKey(n); const taken = await R_('names/' + lk).once('value'); if (taken.exists() && taken.val() !== u.uid) return 'That name is taken';
  try { await R_('names/' + lk).set(u.uid); } catch (e) { return 'That name is taken'; }
  let code = NET.me && NET.me.code;
  for (let i = 0; !code && i < 8; i++) { const c = 'ACE-' + String(1000 + Math.floor(Math.random() * 9000)); try { const ex = await R_('codes/' + c).once('value'); if (ex.exists()) continue; await R_('codes/' + c).set(u.uid); code = c; } catch (e) { } }
  if (NET.me && NET.me.name && nameKey(NET.me.name) !== lk) { try { await R_('names/' + nameKey(NET.me.name)).remove(); } catch (e) { } }
  NET.me = Object.assign(NET.me || {}, { name: n, code }); await netPushProfile(); netStartLive(); return '';
}
function netProfile() { const X = PS().xp; return { name: NET.me.name, code: NET.me.code, lv: X.lv, rk: rankName(X.lv), hull: SAVE.pl[0].cfg.hull, paint: SAVE.pl[0].cfg.paint, acc: SAVE.pl[0].cfg.accent, wu: SAVE.wu, hi: Math.round(SAVE.hi.endless.score || 0), hc: (SAVE.hi.hc || {}).wave | 0, at: TS() }; }
function netPushProfile() { if (!NET.user || !NET.me) return Promise.resolve(); return R_('users/' + NET.user.uid).set(netProfile()).catch(() => { }); }
// ---------- live data: presence, friends, requests, invites ----------
function netStartLive() {
  if (NET.live) return; NET.live = 1; const me = NET.user.uid;
  netSub(R_('.info/connected'), 'value', s => { if (s.val() !== true) return; const pr = R_('presence/' + me); pr.onDisconnect().remove(); pr.set({ on: true, at: TS(), room: NET.code || null }); });
  netSub(R_('friends/' + me), 'value', s => { NET.friends = s.val() || {}; Object.keys(NET.friends).forEach(netWatchFriend); netRefresh(); });
  netSub(R_('requests/' + me), 'value', s => { NET.reqs = s.val() || {}; netRefresh(); });
  netSub(R_('blocks/' + me), 'value', s => { NET.blocked = s.val() || {}; });
  netSub(R_('invites/' + me), 'value', s => { const v = s.val() || {}, old = NET.invites; NET.invites = v; Object.keys(v).forEach(k => { if (!old[k] && !NET.blocked[k] && Date.now() - (v[k].at || 0) < 120000) toast('GAME INVITE', v[k].name + ' wants to play ' + (v[k].mode === 'vs' ? 'Versus' : 'Co-op') + ' - open Online to join', '#22d3ee'); }); netRefresh(); });
  netPushProfile();
}
const watched = {};
function netWatchFriend(uid) { if (watched[uid]) return; watched[uid] = 1; netSub(R_('users/' + uid), 'value', s => { NET.fdata[uid] = s.val(); netRefresh(); }); netSub(R_('presence/' + uid), 'value', s => { NET.pres[uid] = s.val(); netRefresh(); }); }
let netRT = 0; function netRefresh() { clearTimeout(netRT); netRT = setTimeout(() => { if (UI.top === 'scOnline' || UI.top === 'scRoom') UI.refresh(); }, 60); }
async function netAddFriend(code) {
  code = String(code || '').toUpperCase().replace(/\s+/g, ''); if (/^\d{4}$/.test(code)) code = 'ACE-' + code;
  const s = await R_('codes/' + code).once('value'); const uid = s.val(); if (!uid) return '!No pilot has that friend code.'; if (uid === NET.user.uid) return '!That is your own code.'; if (NET.friends[uid]) return '!You are already friends.';
  await R_('requests/' + uid + '/' + NET.user.uid).set({ name: NET.me.name, at: TS() }); return 'Friend request sent.';
}
async function netAccept(uid) { const me = NET.user.uid; await R_('friends/' + me + '/' + uid).set(true); await R_('friends/' + uid + '/' + me).set(true); await R_('requests/' + me + '/' + uid).remove(); }
function netDecline(uid) { return R_('requests/' + NET.user.uid + '/' + uid).remove(); }
async function netUnfriend(uid) { const me = NET.user.uid; await R_('friends/' + me + '/' + uid).remove(); await R_('friends/' + uid + '/' + me).remove().catch(() => { }); delete NET.fdata[uid]; }
async function netBlock(uid) { await R_('blocks/' + NET.user.uid + '/' + uid).set(true); await netUnfriend(uid).catch(() => { }); await netDecline(uid).catch(() => { }); }
function netReport(uid, why) { return R_('reports').push({ from: NET.user.uid, who: uid, why: why || 'name', at: TS() }); }

// ---------- rooms (up to 4 pilots: the host plus 3 guests) ----------
const RC = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const mkCode = () => Array.from({ length: 4 }, () => RC[Math.floor(Math.random() * RC.length)]).join('');
function netPlData() { const p = JSON.parse(JSON.stringify(SAVE.pl[0])); return p; }
const roomMax = r => r && r.mode === 'rk' ? 2 : 4;
const isVs = m => m === 'vs' || m === 'rk';
const roomGuests = r => Object.keys((r && r.pl) || {}).filter(u => r.pl[u] && u !== r.host).sort((a, z) => (r.pl[a].at || 0) - (r.pl[z].at || 0) || (a < z ? -1 : 1));
async function netCreateRoom(quick, mode) {
  netLeaveRoom(); const me = NET.user.uid;
  for (let i = 0; i < 6; i++) { const c = mkCode(); const ex = await R_('rooms/' + c).once('value'); if (ex.exists()) continue;
    await R_('rooms/' + c).set({ host: me, hn: NET.me.name, mode: mode || 'coop', w: 0, lv: 0, st: 'open', quick: quick ? 1 : 0, at: TS() });
    R_('rooms/' + c).onDisconnect().remove(); NET.code = c; NET.role = 'host'; netWatchRoom(c); R_('presence/' + me + '/room').set(c).catch(() => { }); return c; }
  throw new Error('no room');
}
async function netJoinRoom(c) {
  c = String(c || '').toUpperCase().trim(); const s = await R_('rooms/' + c).once('value'), r = s.val(); const me = NET.user.uid;
  if (!r) return '!No room with that code.'; if (r.host === me) return '!That is your own room.'; if (r.st !== 'open') return '!That match has already started.';
  if (roomGuests(r).length >= roomMax(r) - 1) return '!That room is full.';
  try { await R_('rooms/' + c + '/pl/' + me).set({ n: NET.me.name, at: TS() }); } catch (e) { return '!Could not join that room.'; }
  netLeaveRoom(true); NET.code = c; NET.role = 'guest'; R_('rooms/' + c + '/pl/' + me).onDisconnect().remove(); netWatchRoom(c); R_('presence/' + me + '/room').set(c).catch(() => { }); return '';
}
function netWatchRoom(c) {
  const ref = R_('rooms/' + c), fn = s => { const r = s.val(); const was = NET.room; NET.room = r; const me = NET.user && NET.user.uid;
    if (!r) { if (NET.code === c) { const inMatch = G.net; NET.code = null; NET.role = null; if (inMatch && !G.netHost) netConnLost('The host left.'); else if (UI.top === 'scRoom') { NET.msg = '!The room was closed.'; UI.show('scOnline'); } } return; }
    const gs = roomGuests(r);
    if (NET.role === 'guest' && NET.code === c && !(r.pl && r.pl[me]) && r.st === 'open' && was && was.pl && was.pl[me]) { NET.code = null; NET.role = null; if (NET.roomOff) { NET.roomOff(); NET.roomOff = null; } NET.msg = '!You left the room (or it was full).'; if (UI.top === 'scRoom') UI.show('scOnline'); return; }
    if (NET.role === 'host') { if (gs.length > roomMax(r) - 1 && r.st === 'open') gs.slice(roomMax(r) - 1).forEach(u => R_('rooms/' + c + '/pl/' + u).remove().catch(() => { }));
      if (r.quick && gs.length >= roomMax(r) - 1) R_('queue/' + r.mode + '/' + me).remove().catch(() => { });
      if (r.quick && r.mode === 'rk' && gs.length === 1 && r.st === 'open' && !NET.autoGo) { NET.autoGo = 1; setTimeout(() => { NET.autoGo = 0; if (NET.room && NET.room.st === 'open' && roomGuests(NET.room).length) netStart(); }, 1500); } }
    if (r.st === 'go' && (!was || was.st !== 'go')) netGo(r);
    if (r.st === 'open' && was && was.st === 'go' && !G.net && UI.top !== 'scRoom') UI.show('scRoom');
    netRefresh(); };
  ref.on('value', fn); NET.roomOff = () => ref.off('value', fn);
  if (UI.top !== 'scRoom') UI.show('scRoom');
}
function netLeaveRoom(keepUI) {
  const c = NET.code; if (NET.roomOff) { NET.roomOff(); NET.roomOff = null; } netCloseConn();
  if (c && NET.user) { const me = NET.user.uid; if (NET.role === 'host') { R_('rooms/' + c).remove().catch(() => { }); R_('signal/' + c).remove().catch(() => { }); R_('relay/' + c).remove().catch(() => { }); } else { R_('rooms/' + c + '/pl/' + me).remove().catch(() => { }); } ['coop', 'vs', 'rk'].forEach(m => R_('queue/' + m + '/' + me).remove().catch(() => { })); R_('presence/' + me + '/room').remove().catch(() => { }); }
  NET.code = null; NET.role = null; NET.room = null;
}
async function netQuick(mode) {
  const me = NET.user.uid, s = await R_('queue/' + mode).once('value'), q = s.val() || {};
  const now = Date.now(); const ks = Object.keys(q).filter(k => k !== me && !NET.blocked[k] && now - (q[k].at || 0) < 90000).sort((a, b) => q[a].at - q[b].at);
  for (const k of ks) { const e = await netJoinRoom(q[k].code); if (!e) return ''; }
  const c = await netCreateRoom(true, mode); const qr = R_('queue/' + mode + '/' + me); await qr.set({ code: c, name: NET.me.name, at: TS() }); qr.onDisconnect().remove(); NET.msg = mode === 'rk' ? 'Searching for a ranked opponent...' : 'Searching for pilots...'; return '';
}
function netInvite(uid) { const r = NET.room; return R_('invites/' + uid + '/' + NET.user.uid).set({ code: NET.code, name: NET.me.name, mode: r ? r.mode : 'coop', at: TS() }); }
async function netAcceptInvite(uid) { const v = NET.invites[uid]; await R_('invites/' + NET.user.uid + '/' + uid).remove().catch(() => { }); if (!v) return '!Invite expired.'; return netJoinRoom(v.code); }
function netRoomSet(k, v) { if (NET.role === 'host' && NET.code) R_('rooms/' + NET.code + '/' + k).set(v).catch(() => { }); }
async function netStart() { // host presses START
  const r = NET.room, gs = roomGuests(r); if (!r || !gs.length) return '!Wait for another pilot.'; if (r.mode === 'coop' && (r.w | 0) >= SAVE.wu) return '!Pick a world you have unlocked.';
  if (r.mode === 'rk' && gs.length !== 1) return '!Ranked is one versus one.';
  const ord = gs.slice(0, roomMax(r) - 1);
  await R_('signal/' + NET.code).remove().catch(() => { }); await R_('relay/' + NET.code).remove().catch(() => { }); await R_('rooms/' + NET.code + '/gpl').remove().catch(() => { });
  await R_('rooms/' + NET.code + '/ord').set(ord); await R_('rooms/' + NET.code + '/hpl').set(JSON.stringify(netPlData())); await R_('rooms/' + NET.code + '/st').set('go'); return '';
}
// the host keeps one link per guest; NET.conn is a stand-in that talks to all of them at once
function netHub(conns) {
  const H = { hub: true, conns, onMsg: null, onClose: null, closed: false,
    get mode() { const a = Object.values(conns); return a.some(c => c.mode === 'relay') ? 'relay' : 'rtc'; },
    get ping() { return Math.max(0, ...Object.values(conns).map(c => c.ping | 0)); },
    get last() { const a = Object.values(conns).filter(c => !c.closed); return a.length ? Math.min(...a.map(c => c.last)) : Date.now(); },
    send(ch, m) { for (const u in conns) if (!conns[u].closed) conns[u].send(ch, m); },
    sendTo(u, ch, m) { if (conns[u] && !conns[u].closed) conns[u].send(ch, m); },
    close() { if (H.closed) return; H.closed = true; for (const u in conns) conns[u].close(); } };
  return H;
}
async function netGo(r) { // everyone: connect, then the host starts the match
  const me = NET.user.uid, ord = r.ord || roomGuests(r).slice(0, 3);
  if (NET.role === 'guest') { if (ord.indexOf(me) < 0) { NET.msg = '!The match started without you (room was full).'; netLeaveRoom(); UI.show('scOnline'); return; } await R_('rooms/' + NET.code + '/gpl/' + me).set(JSON.stringify(netPlData())).catch(() => { }); }
  NET.msg = 'Connecting...'; NET.warned = 0; netRefresh();
  if (NET.role === 'guest') {
    try { NET.conn = await netConnect(NET.code + '/' + me, 'guest'); } catch (e) { NET.msg = '!Could not connect: ' + e.message; netRefresh(); return; }
    NET.conn.onMsg = netOnMsg; NET.conn.onClose = () => netConnLost('Connection lost.'); return;
  }
  const conns = {}; await Promise.all(ord.map(u => netConnect(NET.code + '/' + u, 'host').then(c => { conns[u] = c; }).catch(() => { })));
  if (!Object.keys(conns).length) { NET.msg = '!Could not connect to anyone.'; netRoomSet('st', 'open'); netRefresh(); return; }
  const H = NET.conn = netHub(conns), live = ord.filter(u => conns[u]);
  live.forEach((u, k) => { conns[u].onMsg = m => netOnMsg(m, k + 1); conns[u].onClose = () => netGuestLost(u, k + 1); });
  const gpl = []; for (const u of live) { let v = null; for (let i = 0; i < 40 && !v; i++) { const s = await R_('rooms/' + NET.code + '/gpl/' + u).once('value'); v = s.val(); if (!v) await new Promise(r2 => setTimeout(r2, 250)); } gpl.push(v ? JSON.parse(v) : SAVE.pl[0]); }
  NET.order = live; netHostStart(r, gpl, live.map(u => (r.pl && r.pl[u] && r.pl[u].n) || 'Pilot'));
}
function netGuestLost(uid, i) { // one guest dropped: their ship goes down, everyone else keeps flying
  const H = NET.conn; if (H && H.conns && H.conns[uid]) { H.conns[uid].close(); delete H.conns[uid]; }
  const p = G.players[i]; if (p && G.run && !G.run.over) { p.remote = false; p.alive = false; p.hp = 0; p.rest = 0; alertMsg(((G.netNames || [])[i] || 'A PILOT').toUpperCase() + ' DISCONNECTED'); }
  if (H && H.conns && !Object.keys(H.conns).length) netConnLost('Everyone left.');
}

// ---------- transport: WebRTC data channels (direct), with a relay through the database as backup ----------
const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
function netConnect(code, role) {
  return new Promise((resolve, reject) => {
    const sig = R_('signal/' + code), C = { mode: 'rtc', onMsg: null, onClose: null, last: Date.now(), fastCh: null, relCh: null, pc: null, offs: [], closed: false, ping: 0 };
    let done = false; const finish = () => { if (done) return; done = true; clearTimeout(tmo); resolve(C); };
    const recv = d => { C.last = Date.now(); let m; try { m = JSON.parse(d); } catch (e) { return; } if (m.t === 'pi') { C.send('rel', { t: 'po', s: m.s }); return; } if (m.t === 'po') { C.ping = Date.now() - m.s; return; } if (C.onMsg) C.onMsg(m); };
    C.send = (ch, m) => { if (C.closed) return; const s = JSON.stringify(m); if (C.mode === 'rtc') { const c = ch === 'fast' && C.fastCh && C.fastCh.readyState === 'open' ? C.fastCh : C.relCh; if (c && c.readyState === 'open') { try { c.send(s); } catch (e) { } } } else C.relaySend(ch, m, s); };
    C.close = () => { if (C.closed) return; C.closed = true; try { C.pc && C.pc.close(); } catch (e) { } C.offs.forEach(f => f()); clearInterval(C.hb); };
    const wire = ch => { ch.onmessage = e => recv(e.data); ch.onopen = () => { if (C.relCh && C.relCh.readyState === 'open' && (!C.fastCh || C.fastCh.readyState === 'open')) finish(); }; ch.onclose = () => { if (!C.closed && C.mode === 'rtc' && C.onClose) C.onClose(); }; };
    // relay backup
    C.startRelay = () => {
      if (C.mode === 'relay') return; C.mode = 'relay'; try { C.pc && C.pc.close(); } catch (e) { }
      const mine = role === 'host' ? 'h' : 'g', theirs = role === 'host' ? 'g' : 'h', rf = R_('relay/' + code);
      let lastFast = 0; C.relaySend = (ch, m, s) => { if (ch === 'fast') { const now = Date.now(); if (now - lastFast < 90) return; lastFast = now; rf.child(mine + 'f').set(s).catch(() => { }); } else rf.child(mine + 'r').push(s).catch(() => { }); };
      const f1 = s => { if (s.val()) recv(s.val()); }, f2 = s => { recv(s.val()); s.ref.remove().catch(() => { }); };
      rf.child(theirs + 'f').on('value', f1); rf.child(theirs + 'r').on('child_added', f2); C.offs.push(() => { rf.child(theirs + 'f').off('value', f1); rf.child(theirs + 'r').off('child_added', f2); });
      finish();
    };
    const tmo = setTimeout(() => { if (role === 'host') sig.child('relay').set(true).catch(() => { }); C.startRelay(); }, 8000);
    const rl = s => { if (s.val() === true) C.startRelay(); }; sig.child('relay').on('value', rl); C.offs.push(() => sig.child('relay').off('value', rl));
    C.hb = setInterval(() => { C.send('rel', { t: 'pi', s: Date.now() }); if (done && Date.now() - C.last > 9000 && C.onClose && !C.closed) C.onClose(); }, 2000);
    if (!window.RTCPeerConnection) { return; } // no WebRTC: the timeout above falls back to the relay
    const pc = C.pc = new RTCPeerConnection({ iceServers: ICE });
    const mineC = role === 'host' ? 'hc' : 'gc', theirC = role === 'host' ? 'gc' : 'hc';
    pc.onicecandidate = e => { if (e.candidate) sig.child(mineC).push(JSON.stringify(e.candidate.toJSON())).catch(() => { }); };
    const fc = s => { try { pc.addIceCandidate(JSON.parse(s.val())).catch(() => { }); } catch (e) { } }; sig.child(theirC).on('child_added', fc); C.offs.push(() => sig.child(theirC).off('child_added', fc));
    if (role === 'host') {
      C.fastCh = pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 }); C.relCh = pc.createDataChannel('rel', { ordered: true }); wire(C.fastCh); wire(C.relCh);
      pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => sig.child('offer').set(JSON.stringify(pc.localDescription))).catch(reject);
      const fa = s => { if (s.val() && !pc.currentRemoteDescription) pc.setRemoteDescription(JSON.parse(s.val())).catch(() => { }); }; sig.child('answer').on('value', fa); C.offs.push(() => sig.child('answer').off('value', fa));
    } else {
      pc.ondatachannel = e => { if (e.channel.label === 'fast') C.fastCh = e.channel; else C.relCh = e.channel; wire(e.channel); };
      const fo = s => { if (!s.val() || pc.currentRemoteDescription) return; pc.setRemoteDescription(JSON.parse(s.val())).then(() => pc.createAnswer()).then(a => pc.setLocalDescription(a)).then(() => sig.child('answer').set(JSON.stringify(pc.localDescription))).catch(() => { }); };
      sig.child('offer').on('value', fo); C.offs.push(() => sig.child('offer').off('value', fo));
    }
  });
}
function netCloseConn() { if (NET.conn) { NET.conn.close(); NET.conn = null; } }

// ---------- the match ----------
const KCODE = ['orb', 'shard', 'ice', 'mine', 'ring', 'plasma', 'twin', 'spread', 'lancer', 'ion', 'missile', 'arc', 'rail'];
const kIdx = k => { const i = KCODE.indexOf(k); return i < 0 ? 0 : i; };
const PKC = ['core', 'ammo', 'hp', 'sh', 'od', 'log'];
const r1 = v => Math.round(v * 10) / 10;
let netEvQ = [];
function netEv(...a) { if (G.netHost && G.inCombat && netEvQ.length < 200) netEvQ.push(a); }
function netWrapHost() { // copy the host's eye candy and sounds to the guest
  if (NET.wrapped) return; NET.wrapped = 1;
  const b2 = boom2D; boom2D = function (x, y, s, c) { netEv('b2', r1(x), r1(y), s, c); return b2.apply(this, arguments); };
  const sh = shock; shock = function (x, y, c, r, l) { netEv('sk', r1(x), r1(y), c, r, l); return sh.apply(this, arguments); };
  const bn = banner; banner = function (t, s, b) { netEv('bn', t, s, b); return bn.apply(this, arguments); };
  const am = alertMsg; alertMsg = function (t) { netEv('al', t); return am.apply(this, arguments); };
  const ft = ftext; ftext = function (x, y, t, c, s) { if ((s | 0) >= 13) netEv('ft', r1(x), r1(y), t, c, s); return ft.apply(this, arguments); };
  Object.keys(SFX).forEach(k => { const f = SFX[k]; SFX[k] = function (a) { netEv('sx', k, a); return f.apply(this, arguments); }; });
}
function netHostStart(r, gpls, names) {
  netWrapHost(); NET.inMatch = 1; NET.rkMode = r.mode === 'rk';
  const o = isVs(r.mode) ? { mode: 'endless', var: 'versus', w: Math.min(r.w | 0, Math.max(0, SAVE.wu - 1)), lv: 0, tier: 1, co: true } : { mode: 'expedition', w: r.w | 0, lv: r.lv | 0, tier: 1, co: true };
  const pls = [SAVE.pl[0]].concat(gpls); G.netNames = [NET.me.name].concat(names); G.netUids = [NET.user.uid].concat(NET.order || []);
  G.net = 1; G.netHost = 1; G.netGuest = 0; G.netMe = 0; G.netN = pls.length; G.netPl = pls; G.last = o; netEvQ = [];
  beginRun(o); G.players[0].local = true; for (let i = 1; i < G.players.length; i++) { const p = G.players[i]; p.remote = true; p.netIn = { x: p.x / V.W, y: p.y / V.H }; } NET.uidC = 0;
  (NET.order || []).forEach((u, k) => NET.conn.sendTo(u, 'rel', { t: 'start', o, W: V.W, H: V.H, pls, names: G.netNames, uids: G.netUids, me: k + 1, rk: NET.rkMode ? 1 : 0 }));
  if (NET.rkMode && typeof rkMatchStart === 'function') rkMatchStart();
}
function netSnap(R) {
  const en = [], eb = [], pb = [], pk = [], bm = [];
  for (const e of G.ent.en) { if (e.dead) continue; if (!e.uid) e.uid = ++NET.uidC; en.push([e.uid, e.boss ? 'B' + e.bi : e.id, r1(e.x), r1(e.y), Math.round(e.hp), Math.round(e.mhp), e.hf | 0, (e.gold ? 1 : 0) | (e.hunt ? 2 : 0) | (e.hide ? 4 : 0), e.boss ? [e.ph | 0, e.st | 0, e.stg | 0, e.inv ? 1 : 0] : 0]); }
  const EB = G.ent.eb; for (let i = 0; i < EB.length && i < 420; i++) { const b = EB[i]; eb.push([r1(b.x), r1(b.y), r1(b.vx), r1(b.vy), kIdx(b.k), b.r | 0]); }
  const PB = G.ent.pb; for (let i = 0; i < PB.length && i < 160; i++) { const b = PB[i]; pb.push([r1(b.x), r1(b.y), r1(b.vx), r1(b.vy), kIdx(b.k), Math.round(b.r), b.c || '']); }
  for (const k of G.ent.pk) pk.push([PKC.indexOf(k.k), r1(k.x), r1(k.y)]);
  for (const b of G.ent.bm) if (b.k === 'beam' && b.o) bm.push([r1(b.y), b.h, b.tel | 0, b.on | 0, b.c]);
  const P = G.players.map(p => [r1(p.x), r1(p.y), Math.round(p.hp), p.mhp, Math.round(p.sh), p.msh, Math.round(p.am), p.mam, p.alive ? 1 : 0, p.wpn, Math.floor(p.sup || 0), p.supT | 0, p.abCd | 0, p.abMax | 0, p.chg | 0, p.inv > 0 ? 1 : 0, p.dashT | 0, r1(p.dvx || 0), r1(p.dvy || 0), p.parT | 0, Math.round(p.score), p.rest | 0, p.dX === undefined ? -1 : r1(p.dX), p.dY === undefined ? -1 : r1(p.dY), p.rv | 0, p.od | 0, p.phaseT | 0, p.ovl | 0, p.wallT | 0, p.reflT | 0, p.team | 0]);
  return { t: 's', f: G.t, R: [Math.round(R.score), R.combo, R.wave, R.waves, R.stage, R.kills, R.rCores | 0, R.vs ? R.vs.time : 0, R.graze | 0, R.maxCombo | 0], P, en, eb, pb, pk, bm };
}
function netHostTick(R) {
  const C = NET.conn; if (!C) return;
  if (G.t % 3 === 0) C.send('fast', netSnap(R));
  if (netEvQ.length) { C.send('rel', { t: 'ev', e: netEvQ }); netEvQ = []; }
  if (G.players.some(p => p.remote) && Date.now() - C.last > 6000 && !NET.warned) { NET.warned = 1; alertMsg('A PILOT IS LAGGING...'); }
}
function netRemoteInput(p) { const n = p.netIn || {}; p.lmx = n.mx || 0; p.lmy = n.my || 0; return { mx: n.mx || 0, my: n.my || 0, tx: null, ty: null, fire: !!n.fire, x: (n.x || 0) * V.W, y: (n.y || 0) * V.H }; }
function netSendEnd(R, win) { if (!NET.conn) return; NET.conn.send('rel', { t: 'end', win: !!win, score: Math.round(R.score), kills: R.kills, wave: R.wave, rc: R.rCores | 0, vs: G.players.map(p => Math.round(p.score)), names: G.netNames, time: Math.round((G.t - R.t0) / 60), maxCombo: R.maxCombo | 0, graze: R.graze | 0, w: R.w, lv: R.lv, bossDown: R.bossDown | 0 }); }
function netOnMsg(m, from) {
  from = from | 0 || 1;
  if (m.t === 'start' && NET.role === 'guest') netGuestStart(m);
  else if (m.t === 's' && G.netGuest) NET.snap = m;
  else if (m.t === 'ev' && G.netGuest) netPlayEv(m.e);
  else if (m.t === 'in' && G.netHost) { const p = G.players[from]; if (!p || !p.remote) return; p.netIn = m; if (m.ab) p.netAb = 1; if (m.sup) p.netSup = 1; if (m.sw) cycleWeapon(p, m.sw); if (m.ws) { const id = WORDER[m.ws - 1]; if (id) setWeapon(p, id); } if (m.emo) { netEmote(from, m.emo); NET.conn.send('rel', { t: 'emo', p: from, e: m.emo }); } }
  else if (m.t === 'end' && G.netGuest) netGuestEnd(m);
  else if (m.t === 'emo') { if (!(G.netGuest && m.p === G.netMe)) netEmote(m.p, m.e); }
  else if (m.t === 'bye') { if (G.netHost && NET.order) netGuestLost(NET.order[from - 1], from); else netConnLost('The host left the match.'); }
}
// ---------- guest side ----------
function netGuestStart(m) {
  NET.inMatch = 1; NET.hW = m.W; NET.hH = m.H; G.net = 1; G.netGuest = 1; G.netHost = 0; const pls = m.pls || [m.hpl, SAVE.pl[0]]; G.netMe = m.me || 1; pls[G.netMe] = SAVE.pl[0]; G.netPl = pls; G.netN = pls.length; G.netNames = m.names || null; G.netUids = m.uids || null; NET.rkMode = !!m.rk; G.last = m.o; NET.ents = new Map(); NET.snap = null; NET.gc0 = 0;
  beginRun(m.o); G.players.forEach((p, i) => { if (i === G.netMe) p.local = true; else p.remote = true; }); G.ent.en.length = 0;
  if (NET.rkMode && typeof rkMatchStart === 'function') rkMatchStart();
}
const mx_ = x => x * V.W / (NET.hW || V.W), my_ = y => y * V.H / (NET.hH || V.H);
function netPlayEv(E) {
  for (const a of E) { try {
    if (a[0] === 'b2') b2Local(mx_(a[1]), my_(a[2]), a[3], a[4]);
    else if (a[0] === 'sk') shock(mx_(a[1]), my_(a[2]), a[3], a[4], a[5]);
    else if (a[0] === 'bn') banner(a[1], a[2], a[3]);
    else if (a[0] === 'al') alertMsg(a[1]);
    else if (a[0] === 'ft') ftext(mx_(a[1]), my_(a[2]), a[3], a[4], a[5]);
    else if (a[0] === 'sx' && SFX[a[1]]) SFX[a[1]](a[2]);
  } catch (e) { } }
}
function b2Local(x, y, s, c) { boom2D(x, y, s, c); if (R3 && R3.boom) try { R3.boom(x, y, Math.min(14, 4 + (s / 12 | 0)), hx(c || '#f97316'), 4 + s / 40, 6 + s / 12); } catch (e) { } }
const NETIN = { t: 0 };
function netGuestUpdate(R) {
  const S = NET.snap, me = G.players[G.netMe | 0 || 1];
  // 1) fly our own ship locally (no waiting for the host)
  if (me && me.alive && !R.over) {
    const sw = IN.swap[0]; IN.swap[0] = 0; const ab = IN.ab[0]; IN.ab[0] = 0; const sup = IN2.sup[0]; IN2.sup[0] = 0;
    const o = inputFor(me), sp = me.st.spd * 1.25 * (me.slow > 0 ? .55 : 1) * (me.phaseT > 0 ? 1.4 : 1);
    if (me.dashT > 0) { me.dashT--; me.vx = me.dvx; me.vy = me.dvy; }
    else if (o.tx !== null) { const dx = o.tx - me.x, dy = o.ty - me.y, d = Math.hypot(dx, dy) || 1, v = Math.min(d * .22, sp * 2.2); me.vx += (dx / d * v - me.vx) * .5; me.vy += (dy / d * v - me.vy) * .5; }
    else { let mx = o.mx, my = o.my; const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; } me.vx += (mx * sp - me.vx) * .3; me.vy += (my * sp - me.vy) * .3; }
    me.x += me.vx; me.y += me.vy; const B = BOUND(); me.x = clamp(me.x, B.x0, B.x1); me.y = clamp(me.y, B.y0, B.y1);
    const sec = secHeld(me); NETIN.ab = (NETIN.ab || 0) | (ab ? 1 : 0); NETIN.sup = (NETIN.sup || 0) | (sup ? 1 : 0); if (sw) NETIN.sw = sw; if (NETG.wsel) { NETIN.ws = NETG.wsel; NETG.wsel = 0; }
    if (G.t % 2 === 0 && NET.conn) { NET.conn.send(NETIN.ab || NETIN.sup || NETIN.sw || NETIN.ws ? 'rel' : 'fast', { t: 'in', x: me.x / V.W, y: me.y / V.H, mx: o.mx, my: o.my, fire: !!o.fire, sec: !!sec, ab: NETIN.ab | 0, sup: NETIN.sup | 0, sw: NETIN.sw | 0, ws: NETIN.ws | 0 }); NETIN.ab = NETIN.sup = NETIN.sw = NETIN.ws = 0; }
    if (!SET.reduce && G.t % 3 === 0) pcl({ x: me.x - 32, y: me.y + rnd(-3, 3), vx: -3, vy: rnd(-.3, .3), l: 16, l0: 16, c: trailCol(me), r: 3, k: 0, fr: .9 });
  }
  // 2) apply the latest picture of the world from the host
  if (S && S !== NET.applied) { NET.applied = S; netApply(S, R); }
  // 3) move everything a little between pictures so it stays smooth
  for (const e of G.ent.en) { if (e.tx !== undefined) { e.x += (e.tx - e.x) * .3; e.y += (e.ty - e.y) * .3; } e.t = (e.t || 0) + 1; if (e.hf > 0) e.hf--; }
  for (const b of G.ent.eb) { b.x += b.vx; b.y += b.vy; } for (const b of G.ent.pb) { b.x += b.vx; b.y += b.vy; }
  for (const rp of G.players) if (rp !== me && rp.tx !== undefined) { rp.x += (rp.tx - rp.x) * .35; rp.y += (rp.ty - rp.y) * .35; }
  updParticles(); if (R3) R3.tick(); if (G.shake > 0) G.shake--; if (G.flashT > 0) G.flashT--; if (G.hitT > 0) G.hitT--; if (G.t % 3 === 0) hudTick();
  if (NET.conn && Date.now() - NET.conn.last > 6000 && !NET.warned) { NET.warned = 1; alertMsg('THE HOST IS LAGGING...'); }
}
function netApply(S, R) {
  const sx = V.W / (NET.hW || V.W), sy = V.H / (NET.hH || V.H);
  const r = S.R; R.score = r[0]; R.combo = r[1]; R.comboT = r[1] > 0 ? 60 : 0; R.wave = r[2]; R.waves = r[3]; R.stage = r[4]; R.kills = r[5]; R.rCores = r[6]; if (R.vs) R.vs.time = r[7]; R.graze = r[8]; R.maxCombo = r[9];
  S.P.forEach((a, i) => { const p = G.players[i]; if (!p) return; const loc = i === G.netMe;
    if (!loc) { p.tx = a[0] * sx; p.ty = a[1] * sy; if (p.x === undefined || Math.abs(p.x - p.tx) > 200) { p.x = p.tx; p.y = p.ty; } }
    else if (!a[8] || !p.alive) { p.x = a[0] * sx; p.y = a[1] * sy; }
    p.hp = a[2]; p.mhp = a[3]; p.sh = a[4]; p.msh = a[5]; p.am = a[6]; p.mam = a[7]; const wasA = p.alive; p.alive = !!a[8]; if (wasA && !p.alive && R3) try { R3.die(p); } catch (e) { } if (!wasA && p.alive && R3) try { R3.repair(p); } catch (e) { }
    p.wpn = a[9]; p.sup = a[10]; p.supT = a[11]; p.abCd = a[12]; p.abMax = a[13]; p.chg = a[14]; p.blink = !!a[15]; if (loc && a[16] > 0 && !(p.dashT > 0)) { p.dashT = a[16]; p.dvx = a[17]; p.dvy = a[18]; } p.parT = a[19]; p.score = a[20]; p.rest = a[21]; p.dX = a[22] < 0 ? undefined : a[22] * sx; p.dY = a[23] < 0 ? undefined : a[23] * sy; p.rv = a[24]; p.od = a[25]; p.phaseT = a[26]; p.ovl = a[27]; p.wallT = a[28]; p.reflT = a[29]; p.team = a[30]; });
  const seen = new Set();
  for (const a of S.en) { const uid = a[0]; seen.add(uid); let e = NET.ents.get(uid);
    if (!e) { if (a[1][0] === 'B' && /^B\d+$/.test(a[1])) { const bi = +a[1].slice(1); if (!BOSSES[bi]) continue; e = spawnBoss(bi, 1); } else { if (!EN[a[1]]) continue; e = mkEnemy(a[1], a[2] * sx, a[3] * sy); } e.x = a[2] * sx; e.y = a[3] * sy; NET.ents.set(uid, e); }
    e.tx = a[2] * sx; e.ty = a[3] * sy; e.hp = a[4]; e.mhp = a[5]; if (a[6]) e.hf = a[6]; e.gold = a[7] & 1; e.hunt = (a[7] & 2) ? 1 : 0; e.hide = !!(a[7] & 4);
    if (a[8]) { e.ph = a[8][0]; e.st = a[8][1]; e.stg = a[8][2]; e.inv = !!a[8][3]; R.boss = e; } }
  NET.ents.forEach((e, uid) => { if (!seen.has(uid)) { e.dead = true; NET.ents.delete(uid); if (R.boss === e) R.boss = null; } });
  for (let i = G.ent.en.length - 1; i >= 0; i--) if (G.ent.en[i].dead) G.ent.en.splice(i, 1);
  G.ent.eb = S.eb.map(a => ({ x: a[0] * sx, y: a[1] * sy, vx: a[2] * sx, vy: a[3] * sy, k: KCODE[a[4]] || 'orb', r: a[5] }));
  G.ent.pb = S.pb.map(a => ({ x: a[0] * sx, y: a[1] * sy, vx: a[2] * sx, vy: a[3] * sy, k: KCODE[a[4]] || 'twin', r: a[5], c: a[6] || undefined, hs: [] }));
  G.ent.pk = S.pk.map(a => ({ k: PKC[a[0]] || 'core', x: a[1] * sx, y: a[2] * sy, vx: 0, vy: 0, l: 500, v: 1 }));
  G.ent.bm = G.ent.bm.filter(b => b.k !== 'beam').concat(R.boss ? S.bm.map(a => ({ k: 'beam', o: R.boss, y: a[0] * sy, h: a[1], tel: a[2], on: a[3], c: a[4] })) : []);
}
function netGuestEnd(m) {
  const R = G.run; if (!R || R.over) return; R.over = true; G.inCombat = false; $('touch').classList.remove('on'); music.stop();
  const rc = m.rc | 0; SAVE.cores += rc; const bonus = m.win ? 80 + (m.wave | 0) * 10 : 20; SAVE.cores += bonus; SAVE.st.runs++; saveGame();
  const d = { rank: m.win ? 'B' : 'C', win: m.win, mode: R.var || R.mode, base: R.mode, score: m.score, kills: m.kills, cores: rc, stars: m.win ? 2 : 0, bonus, w: m.w, lv: m.lv, tier: 1, wave: m.wave, time: m.time, maxCombo: m.maxCombo, graze: m.graze, next: null, unlockW: -1, name: 'Online match', online: 1 };
  if (m.vs) { const top = Math.max(...m.vs); d.vs = m.vs; d.vsNm = m.names || null; d.vsWin = m.vs.filter(s => s === top).length > 1 ? 0 : m.vs.indexOf(top) + 1; }
  setTimeout(() => UI.result(d), 300);
}
// ---------- leaving, disconnects, emotes ----------
function netConnLost(why) {
  if (!G.net || (G.run && G.run.over)) { netCloseConn(); return; } const host = G.netHost; NET.warned = 0;
  if (host && G.run && !G.run.over) { G.players.forEach(p => { if (p.remote) { p.remote = false; p.alive = false; p.hp = 0; p.rest = 0; } }); alertMsg('EVERYONE DISCONNECTED - FLYING SOLO'); netEndNet(true); return; }
  netEndNet(); if (G.run && !G.run.over) { exitToMenu('scOnline'); } NET.msg = '!' + why; if (UI.top === 'scOnline') UI.refresh();
}
function netEndNet(keepRun) { netCloseConn(); if (!keepRun) { G.net = 0; G.netHost = 0; G.netGuest = 0; G.netPl = null; } else { G.netHost = 0; G.net = 0; } NET.inMatch = 0; }
let netPauseT = 0;
function netPauseKey() { const now = Date.now(); if (now - netPauseT < 2000) { netLeaveMatch(); return; } netPauseT = now; alertMsg('ONLINE MATCH - PRESS AGAIN TO LEAVE'); }
function netLeaveMatch() { if (NET.conn) NET.conn.send('rel', { t: 'bye' }); netEndNet(); netLeaveRoom(); exitToMenu('scOnline'); }
const EMOS = ['GG!', 'HELP!', 'NICE!', 'BOSS!', 'THANKS!', 'WAIT'];
const PCOL = ['#22d3ee', '#fb923c', '#a3e635', '#e879f9'];
function netEmote(pi, e) { const p = G.players[pi], t = EMOS[(e | 0) - 1]; if (!p || !t) return; ftext(p.x, p.y - 44, t, PCOL[pi & 3], 16); SFX.click(); }
function netSendEmote(e) { if (!NET.conn || !G.net) return; const pi = G.netHost ? 0 : G.netMe | 0 || 1, me = G.players[pi]; netEmote(pi, e); if (G.netHost) NET.conn.send('rel', { t: 'emo', p: 0, e }); else NET.conn.send('rel', { t: 'in', emo: e, x: me.x / V.W, y: me.y / V.H }); }
addEventListener('keydown', e => { if (!G.net || !G.inCombat) return; const k = '7890'.indexOf(e.key); if (k >= 0 && !e.repeat) netSendEmote(k + 1); });
