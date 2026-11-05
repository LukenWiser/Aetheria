// ================= BOOT =================
function boot() {
  layout(); initInput(); initUI();
  try { if (window.THREE) { R3 = init3D(); layout(); R3.setView('menu'); } } catch (e) { console.error('3D init failed, using 2D fallback:', e); R3 = null; }
  buildBackdrop(0);
  G.scene = 'ui'; UI.show(SAVE.tut ? 'scMenu' : 'scTut');
  try { if ((SET.intro !== false && !navigator.webdriver) || window.__intro) introPlay(); } catch (e) { console.warn('intro', e); INTRO.on = false; }
  requestAnimationFrame(frame);
}
window.AET = {
  G, SET, V, UI, ACT, IN, update, render, beginRun, finishRun, spawnBoss, mkEnemy, killEnemy, hurt, fireP, layout, exitToMenu, startLevel, startMode,
  get SAVE() { return SAVE; }, get R3() { return R3; }, get ok3d() { return !!(R3 && R3.on); },
  step(n) { for (let i = 0; i < n; i++) update(); render(); },
  CARDS, ABIL, WEVO, useAbility, offerCards, pickCard, rollCards, graze, rankFor, buyWup, buyWevo, wupPrice, wevoPrice, hurtPod, breakPod, podOf, ramCheck, updEB, updPB, killBoss, nextStage, hurtEnemy,
  startDaily, dailyInfo, DMODS, dayKey, ACH, achScan, mkStation, stnHit, STN_X, slotInfo, switchSlot, deleteSlot, exportCode, importCode, setKey, keyLabel, KB, KDEF, applyKeys, hintFor, unlockHull, padNav, navEls, navMove, navAct, toast, variantFinish, checkUnlocks, genWave,
  musTap() { audio(); if (AC.state !== 'running') AC.resume(); const a = AC.createAnalyser(); a.fftSize = 2048; musG.connect(a); const buf = new Float32Array(a.fftSize); return () => { a.getFloatTimeDomainData(buf); let s = 0, pk = 0; for (const v of buf) { s += v * v; pk = Math.max(pk, Math.abs(v)); } return { rms: Math.sqrt(s / buf.length), pk, st: AC.state }; }; },
  __nameOk: nameOk, NET, netInit, netSetName, netAddFriend, netAccept, netCreateRoom, netJoinRoom, netStart, netQuick, netSendEmote,
  CR, startCrash, crashIntro, startCBoss, packCode, unpackCode, glitchSpreading, isCorrupt, newLevel, newCBoss,
  chCode, chParse, startChallenge, randChal, coopDead, PERF, ghDec, PADA, padLabel,
  SFX, jbPlay, jbStop, jbTracks, STEMS, get sfxG() { return sfxG; }, get AC() { return AC; },
  ST, RIVAL, TRUE_END, cutPick, rivalTick,
  PS, missions, addXP, LOGS, mastery, COS, progAfter, medalAt,
  IN2, SECW, EVENTS, ALT_NODE, RIFTS, GMODS, GAL, startGallery, riftsFound, bossBeaten, retroOff, startEvent, superGo, tryParry, chargeShot, fireSec, goldRoll, combatTick,
  photoSnap, photoExit, GLITCH_W, glitchCtx, MAPS, levelSpec, enemyThumb, INTEL, BOSS_INTEL, worldEnemies, bstCount, BG3D_W, bgPlanetTex, audio, playCut, endCut, cutNext, cutSkip, STORY, ENDING, bossPanels, endingPanels, storyDue, CUT, music, mTheme, mv, drawBossArt,
  get SLOT() { return SLOT; }, BR, brNextOf, TFX, LV2, BP, bpTier, shopToday, own2, equip, COS2, CLIP, clipSave, clipAll, hyReg, HYB_FV: FV, BS, DS, DR, bTick, startRaid, raidOn, GXS, GXV, gxMissions, gxPlay, gxJump, N2, lbSubmit, lbLoad, cloudUp, cloudDown, cloudPeek, chSend, inboxCount, chPlayInbox, netOn,
  defs: { WORLDS, EN, BOSSES, WPN, PARTS, UPG }
};
boot();
