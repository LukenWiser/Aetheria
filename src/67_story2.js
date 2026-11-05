// ================= STORY 2: dialogue choices, the rival pilot Vex, World 17 and the true ending, codex =================
const ST = () => { const S = SAVE.story || (SAVE.story = { res: 0, riv: 0, vex: {}, ch: {} }); S.vex = S.vex || {}; S.ch = S.ch || {}; return S; };
const VEXC = '#f43f5e';
// World 17 boss art (cutscenes) + story
BART.push((g, S, c, d, t) => {
  g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TAU / 12 + Math.sin(t * .03 + i) * .06; g.save(); g.rotate(a); g.fillStyle = rgba(c, .5); poly(g, [[-S * .08, -S * .35], [S * .08, -S * .35], [S * .03, -S * 1.25], [-S * .03, -S * 1.25]]); g.fill(); g.restore(); } g.restore();
  for (let i = 0; i < 2; i++) { g.save(); g.rotate(t * .01 * (i ? -1 : 1)); g.lineWidth = 4 - i; g.beginPath(); g.ellipse(0, 0, S * (.62 + i * .14), S * (.62 + i * .14) * (i ? .45 : 1), 0, 0, TAU); g.stroke(); g.restore(); }
  g.beginPath(); g.arc(0, 0, S * .42, 0, TAU); g.fill(); g.stroke(); glowDot(g, 0, 0, S * .24, c);
});
STORY.push([['wide', 'ARIA', 'Coordinates locked. Pilot... this is where the signal was always pointing. The first world.'], ['close', 'PILOT', 'It is beautiful. Why does it feel like it is waiting for me?'], ['reveal', 'BOSS', 'Every pilot before you turned back here. Show me you are the one who does not.']]);
const TRUE_FINAL = stay => [{ kind: 'wide', who: 'NARRATOR', text: stay ? 'And so the pilot stayed. Every lost ship that ever followed the signal found its way home, guided by one small light.' : 'And so the pilot flew home. Behind them, seventeen worlds lit up one by one, like a road someone could follow.', ending: 1, bi: 16 }, { kind: 'title', who: '', text: 'The true ending - thank you for flying' }];
const TRUE_END = ally => [
  { kind: 'reveal', who: 'NARRATOR', text: 'The First Signal dims. Not destroyed. Quiet, at last.', bi: 16, crack: 1, notitle: 1 },
  { kind: 'close', who: 'ARIA', text: 'Pilot, I can read it now. It was never a weapon. It was a beacon, calling for someone strong enough to answer it and kind enough to stop.', bi: 16 },
  ally ? { kind: 'close', who: 'VEX', col: VEXC, text: 'Not bad, rookie. Not bad at all. Next time you fly somewhere impossible, call me first.', bi: 16 } : { kind: 'close', who: 'PILOT', text: 'Vex never came. Somewhere out there, still chasing the signal. Maybe one day.', bi: 16 },
  { kind: 'close', who: 'ARIA', bi: 16, text: 'The beacon is offering us a choice. We can stay and keep the light burning, or take it home with us.', choices: [{ t: 'We stay. Someone has to keep the light on.', k: 'stay' }, { t: 'We go home. And we bring the light with us.', k: 'home' }], after: k => TRUE_FINAL(k === 'stay') }
];
// ---------- dialogue choices inside cutscenes ----------
CUT.sel = 0;
function cutChoices(P) {
  let box = document.getElementById('cutCh'); const want = P && P.choices && !P.picked && CUT.age >= Math.ceil(P.text.length / .9) + 10;
  if (!want) { if (box) box.remove(); return false; }
  if (!box || box._p !== P) { if (box) box.remove(); box = document.createElement('div'); box.id = 'cutCh'; box._p = P; box.innerHTML = P.choices.map((c, i) => '<button data-i="' + i + '">' + (i + 1) + '. ' + c.t + '</button>').join(''); box.addEventListener('pointerdown', e => { e.stopPropagation(); }); box.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { e.stopPropagation(); cutPick(+b.dataset.i); } }); $('cut').appendChild(box); CUT.sel = 0; }
  box.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === CUT.sel));
  return true;
}
function cutPick(i) {
  const P = CUT.list[CUT.i]; if (!P || !P.choices || P.picked) return; const c = P.choices[i]; if (!c) return; P.picked = 1; SFX.click();
  const S = ST(); if (c.k === 'res') S.res++; else if (c.k === 'riv') S.riv++; if (P.cid) S.ch[P.cid] = c.k; if (c.k === 'stay' || c.k === 'home') S.end = c.k;
  const box = document.getElementById('cutCh'); if (box) box.remove();
  const rep = c.reply ? [{ kind: 'close', who: c.reply[0], col: c.reply[0] === 'VEX' ? VEXC : undefined, text: c.reply[1], bi: P.bi }] : [];
  if (P.after) rep.push.apply(rep, P.after(c.k)); saveGame();
  CUT.list.splice.apply(CUT.list, [CUT.i + 1, 0].concat(rep)); CUT.i++; CUT.age = 0; CUT.dir = -CUT.dir;
  if (CUT.i >= CUT.list.length) endCut();
}
const _cutNext = cutNext;
cutNext = function () { const P = CUT.list[CUT.i]; if (P && P.choices && !P.picked) { const full = P.text.length; if (CUT.age < full / .9 + 12) { CUT.age = Math.ceil(full / .9) + 10; return; } cutPick(CUT.sel); return; } _cutNext(); };
const _cutKey = cutKey;
cutKey = function (e) { const P = CUT.list[CUT.i], c = e.code; if (P && P.choices && !P.picked && document.getElementById('cutCh')) { if (c === 'ArrowUp' || c === 'KeyW') { CUT.sel = Math.max(0, CUT.sel - 1); return; } if (c === 'ArrowDown' || c === 'KeyS') { CUT.sel = Math.min(P.choices.length - 1, CUT.sel + 1); return; } const n = '123'.indexOf(e.key); if (n >= 0 && n < P.choices.length) { cutPick(n); return; } if (c === 'Escape') { cutPick(0); return; } } _cutKey(e); };
const _cutDraw = cutDraw;
cutDraw = function () { _cutDraw(); cutChoices(CUT.list[CUT.i]); };
const _endCut = endCut;
endCut = function () { const b = document.getElementById('cutCh'); if (b) b.remove(); _endCut(); };
function cutPadSel(dy) { const P = CUT.list[CUT.i]; if (P && P.choices && !P.picked) CUT.sel = clamp(CUT.sel + dy, 0, P.choices.length - 1); }

// ---------- the rival: Vex ----------
const RIVAL = [
  { w: 3, lv: 6, hp: 1, talk: [['wide', 'ARIA', 'Unknown fighter on an intercept course. Crimson paint. It is broadcasting on our channel.'], ['close', 'VEX', 'So you heard the signal too. Name is Vex. The signal is mine, rookie - turn around.']],
    ch: [{ t: 'We can follow it together.', k: 'res', reply: ['VEX', 'Together? Cute. Try to keep up first.'] }, { t: 'Then come and take it.', k: 'riv', reply: ['VEX', 'Gladly.'] }], lose: 'Not bad. Next time I will not go easy.' },
  { w: 7, lv: 6, hp: 1.5, talk: [['wide', 'ARIA', 'Crimson fighter again. She followed us all the way to the trench.'], ['close', 'VEX', 'Every world I reach, you are already there. Who ARE you?']],
    ch: [{ t: 'Just a pilot. Same as you.', k: 'res', reply: ['VEX', 'Nobody is the same as me. ...But fine. Prove it.'] }, { t: 'Your problem.', k: 'riv', reply: ['VEX', 'Then I will solve it.'] }], lose: 'Ugh. Lucky shot. I am still getting there first.' },
  { w: 11, lv: 6, hp: 2.1, talk: [['wide', 'ARIA', 'Vex is here. Her ship is damaged... she is still coming at us.'], ['close', 'VEX', 'The crystals told me something. Only one of us gets to reach the first world.']],
    ch: [{ t: 'Then we reach it together and break the rule.', k: 'res', reply: ['VEX', '...You really mean that. Weird. Fight me anyway.'] }, { t: 'Then it will be me.', k: 'riv', reply: ['VEX', 'We will see.'] }], lose: 'Go on, then. Show me what is at the end of all this.' },
  { w: 14, lv: 10, hp: 2.8, talk: [['wide', 'ARIA', 'The Heart of Aetheria. And Vex, blocking the way. One last time.'], ['close', 'VEX', 'This is it, rookie. Whoever wins this goes to the core. No more games.']],
    ch: [{ t: 'Fly with me instead.', k: 'res', reply: ['VEX', 'You keep saying that.'] }, { t: 'No more games.', k: 'riv', reply: ['VEX', 'Finally.'] }], lose: null }
];
Object.assign(EN, { rival: { nm: 'Vex, Rival Ace', m: ['dart', { c: 0x1f1d2b, e: 0xf43f5e }], w: 118, hp: 520, sp: 2.2, ai: 'hover', f: { k: 'aim', r: 38, s: 6.2, n: 2 }, sc: 3000, cr: 60, cost: 0, elite: 1, rival: 1 } });
// Vex finds you: each meeting happens in its home world once you are a few sectors in (any route, any tier),
// and if you flew past a world without meeting her, the missed meeting catches up with you in the next world you play.
const rivalCol = (w, i) => { try { const n = wg(w).N[i]; if (n && n.c !== undefined) return n.c; } catch (e) { } return i; };
const rivalIdx = R => {
  if (!R || R.mode !== 'expedition' || R.var || R.w >= 16 || (R.spec && R.spec.type === 'B') || R.lv === LV - 1) return -1;
  const S = ST(), i = RIVAL.findIndex((r, k) => S.vex[k] === undefined); if (i < 0) return -1;
  const V0 = RIVAL[i]; if (R.w < V0.w) return -1;
  const col = rivalCol(R.w, R.lv); return col >= (R.w === V0.w ? Math.min(5, V0.lv - 1) : 2) ? i : -1;
};
function rivalTick(R) {
  const i = rivalIdx(R); if (i < 0) return; const V0 = RIVAL[i], S = ST();
  if (S.vex[i] === undefined && !R.rivalOn && R.stage === 'wave' && ((R.wave >= 1 && R.st > 60) || R.st > 420)) {
    R.rivalOn = 1; const panels = V0.talk.map(p => ({ kind: p[0], who: p[1], col: p[1] === 'VEX' ? VEXC : undefined, text: p[2], bi: R.w, nob: 1 }));
    panels[panels.length - 1].choices = V0.ch; panels[panels.length - 1].cid = 'vex' + i;
    const go = () => { const e = mkEnemy('rival', V.W + 80, V.H / 2, { hpm: V0.hp }); e.rv = i; e.hx = V.W * .78; banner('RIVAL: VEX', 'BEAT HER', true); };
    if (SET.story !== 'off' && !G.net) playCut(panels, go); else go();
  }
  for (const e of G.ent.en) { if (e.id !== 'rival' || e.dead) continue; // pilot-like movement: pick a lane, strafe, dash, fire fans
    e.rT = (e.rT | 0) + 1; if (e.rT % 80 === 1) e.ty = clamp((nearP(e.x, e.y) || { y: V.H / 2 }).y + rnd(-140, 140), 70, V.H - 70);
    e.y += ((e.ty || e.y) - e.y) * .06; e.x += (e.hx - e.x) * .04 + Math.sin(e.rT * .05) * 1.2;
    if (e.rT % 150 === 0) { e.hx = V.W * rnd(.55, .85); spark(e.x, e.y, 8, VEXC, 4, 14, 2); }
    if (e.rT % 110 === 55) { const P = nearP(e.x, e.y); if (P) { const a = Math.atan2(P.y - e.y, P.x - e.x); for (let k = -3; k <= 3; k++) ebullet(e.x - 20, e.y, Math.cos(a + k * .12) * 5, Math.sin(a + k * .12) * 5, 'shard'); } }
  }
}
function rivalDown(e) {
  if (e.rv === undefined) return; const i = e.rv, V0 = RIVAL[i], S = ST(); S.vex[i] = 1; const R = G.run;
  SAVE.cores += 500 + i * 400; if (R) R.cores += 500 + i * 400; banner('VEX RETREATS', '+' + (500 + i * 400) + ' CORES', false); SFX.clear();
  if (i === RIVAL.length - 1) { S.ally = S.res >= 3 ? 1 : 0; }
  saveGame();
  const line = i === RIVAL.length - 1 ? (S.ally ? 'You fly like someone worth following. When you go to the first world... I will be on your wing.' : 'Fine. You win. Go to the first world alone, rookie.') : V0.lose;
  if (line && SET.story !== 'off' && !G.net) setTimeout(() => { if (G.run && !G.run.over) playCut([{ kind: 'close', who: 'VEX', col: VEXC, text: line, bi: G.run.w, nob: 1 }], () => { }); }, 500);
}
// ally Vex in the World 17 boss fight: a crimson wingman that strafes the boss
function vexAllyTick(R) {
  if (R.w !== 16 || R.var || R.mode !== 'expedition' || !ST().ally || R.stage !== 'boss' || !R.boss) { R.vexA = null; return; }
  const A = R.vexA || (R.vexA = { x: -60, y: V.H * .3, t: 0 }), P = alive()[0] || { x: 150, y: V.H / 2 }; A.t++;
  if (A.t === 30) { alertMsg('VEX: "I TOLD YOU I WOULD BE ON YOUR WING."'); }
  const tx = P.x + 40, ty = clamp(P.y + (P.y > V.H / 2 ? -110 : 110), 60, V.H - 60); A.x += (tx - A.x) * .05; A.y += (ty - A.y) * .05;
  if (A.t % 9 === 0) { const b = R.boss, a = Math.atan2(b.y - A.y, b.x - A.x); G.ent.pb.push({ x: A.x + 14, y: A.y, vx: Math.cos(a) * 13, vy: Math.sin(a) * 13, r: 4, d: 9 * (G.pdm || 1), k: 'twin', c: VEXC, pierce: 0, hs: [], own: 0, l: 100, home: 0, hm2: 0, blast: 0, chain: 0, crush: 0 }); }
  if (!SET.reduce && A.t % 3 === 0) pcl({ x: A.x - 18, y: A.y + rnd(-2, 2), vx: -3, vy: 0, l: 14, l0: 14, c: VEXC, r: 3, k: 0, fr: .9 });
}
function drawVexAlly(g, t) {
  const R = G.run, A = R && R.vexA; if (!A) return;
  g.save(); g.globalCompositeOperation = 'lighter'; drawGlow(g, A.x, A.y, 34, VEXC, .5); g.restore();
  drawShip2D(g, { x: A.x, y: A.y, cfg: { hull: 'phantom', paint: '#1f1d2b', accent: VEXC, wings: 'delta', engine: 'twin', canopy: 'razor', finish: 'carbon', stripe: true } }, t);
}

// ---------- codex ----------
const CODEX_W = [
  'The old capital, still guarded by an air-defense grid that never got the order to stand down.', 'A ravine swallowed by a living hive. The spores carry the signal from plant to plant.', 'Red dunes and endless mining rigs, still digging for a company that died centuries ago.', 'A nebula so thick that sensors go blind. Things live inside it that have never seen a ship.', 'A black hole that bends light, time and bullets. The signal is loudest at the edge.', 'An armada frozen mid-flight, crews asleep, guns still warm.', 'A moon hollowed out and turned into a single forge for a single weapon.', 'The deepest trench of an ocean world, lit only by things that want you closer.', 'A planet-sized computer that learned to fly by watching pilots like you.', 'A world where every clock was stopped except one, and that one counts down.', 'A ring station drifting far past the old worlds. Its commander never left.', 'Floating islands of crystal that sing the signal back in a thousand notes.', 'A storm the size of a world, and the eye at its centre is alive.', 'Where fleets that answered the signal long ago came to rest. They still transmit.', 'The place every signal seemed to begin. It was not the beginning.', 'A world made of copies: suburbs, schools and theme parks that were never out here. Something is getting reality wrong.', 'The first world. Golden, quiet, waiting. Every signal was trying to lead someone here.'
];
const CHARS = [
  { nm: 'The Pilot', col: '#fde047', un: () => true, tx: 'You. Answered a signal nobody else could decode, in a ship you built yourself in a hangar that smells like coolant.' },
  { nm: 'ARIA', col: '#22d3ee', un: () => true, tx: 'Your ship\'s AI. Calm, curious, and a little too honest. She decodes the signal one world at a time.' },
  { nm: 'Vex', col: VEXC, un: () => Object.keys(ST().vex).length > 0, tx: () => 'A rival ace in a crimson fighter who heard the same signal. ' + (ST().ally ? 'After everything, she flies on your wing.' : ST().vex[3] ? 'She lost the last duel. Where she went after is anyone\'s guess.' : 'She is always one world ahead - or one behind.') },
  { nm: 'The Signal', col: '#67e8f9', un: () => !!SAVE.flags.ending, tx: 'A message stretched across seventeen worlds. Not a weapon. A beacon, looking for someone strong enough to answer it and kind enough to stop.' },
  { nm: 'Aetheria Prime', col: '#fbbf24', un: () => !!SAVE.flags.trueEnd, tx: () => 'The first world, and the source of everything. ' + (ST().end === 'stay' ? 'Its light is kept burning by one pilot who chose to stay.' : ST().end === 'home' ? 'Its light now shines all the way home.' : '') }
];
Object.assign(SCR, {
  scCodex: () => {
    const tab = UI.cxt || 'worlds'; let body = '';
    if (tab === 'worlds') body = WORLDS.map((W, w) => w < SAVE.wu ? '<div class="item" style="align-items:flex-start"><div class="fl"><div class="b sm" style="color:' + W.ac + '">' + (w + 1) + '. ' + W.nm.toUpperCase() + '</div><div class="xs mut">' + W.sub + '</div><div class="sm" style="margin-top:5px;line-height:1.6">' + (CODEX_W[w] || '') + '</div></div></div>' : '<div class="item" style="opacity:.45"><div class="fl"><div class="b sm">' + (w + 1) + '. ???</div><div class="xs mut">Reach this world to unlock its page</div></div></div>').join('');
    else if (tab === 'bosses') body = BOSSES.map((B, w) => w < WORLDS.length && bossBeaten(w) ? '<div class="item" style="align-items:flex-start"><div class="fl"><div class="b sm" style="color:' + B.c + '">' + B.nm.toUpperCase() + '</div><div class="sm" style="margin-top:4px;line-height:1.6">' + (BOSS_INTEL[w] || '') + '</div>' + (STORY[w] ? '<div class="xs mut" style="margin-top:4px">"' + STORY[w][STORY[w].length - 1][2] + '"</div>' : '') + '</div></div>' : '<div class="item" style="opacity:.45"><div class="fl"><div class="b sm">???</div><div class="xs mut">Defeat the World ' + (w + 1) + ' boss</div></div></div>').join('');
    else body = CHARS.map(c => c.un() ? '<div class="item" style="align-items:flex-start"><div class="fl"><div class="b sm" style="color:' + c.col + '">' + c.nm.toUpperCase() + '</div><div class="sm" style="margin-top:4px;line-height:1.6">' + (typeof c.tx === 'function' ? c.tx() : c.tx) + '</div></div></div>' : '<div class="item" style="opacity:.45"><div class="fl"><div class="b sm">???</div><div class="xs mut">Keep flying</div></div></div>').join('') + '<div class="xs mut" style="margin-top:8px">Your choices so far: ' + ST().res + ' kind, ' + ST().riv + ' fierce.</div>';
    return '<div class="card mid"><div class="row sp"><h2>Codex</h2><button class="btn sm" data-act="logs">DATA LOGS</button></div><div class="tabs" style="margin:10px 0">' + [['worlds', 'WORLDS'], ['bosses', 'BOSSES'], ['chars', 'CHARACTERS']].map(t => '<div class="tab' + (tab === t[0] ? ' on' : '') + '" data-act="cxt:' + t[0] + '">' + t[1] + '</div>').join('') + '</div><div class="stack" style="gap:8px;max-height:min(58vh,520px);overflow-y:auto">' + body + '</div><div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="back">BACK</button>' + (SAVE.flags.trueEnd ? '<button class="btn sm gold" data-act="trueend">WATCH TRUE ENDING</button>' : '') + '</div></div>';
  }
});
Object.assign(ACT, {
  codex() { UI.show('scCodex'); },
  cxt(a) { UI.cxt = a[0]; SFX.click(); UI.refresh(); },
  trueend() { UI.hideAll(); const S = ST(); playCut(TRUE_END(!!S.ally), () => UI.show('scCodex'), { music: 16, world: 16 }); }
});
