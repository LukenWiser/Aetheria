// ================= UI: jukebox =================
Object.assign(SCR, {
  scJuke: () => {
    const T = jbTracks(), cur = T.find(x => x.i === music.jbx);
    return '<div class="card mid"><div class="row sp"><h2>Jukebox</h2><span class="xs mut">' + T.filter(x => x.ok).length + '/' + T.length + ' TRACKS</span></div>' +
      '<div class="item" style="margin:10px 0;flex-direction:column;align-items:stretch"><div class="row sp"><div><div class="xs mut b" style="letter-spacing:.14em">NOW PLAYING</div><div class="b" style="color:' + (cur ? cur.c : 'var(--mut)') + '">' + (cur ? cur.nm.toUpperCase() : '- NOTHING -') + '</div></div><button class="btn sm' + (cur ? ' warn' : ' off') + '" data-act="jbstop">STOP</button></div><canvas id="jbViz" style="position:static;display:block;width:100%;height:56px;margin-top:8px;inset:auto;z-index:auto;pointer-events:none"></canvas>' +
      '<div class="seg" style="margin-top:8px">' + JBL.map(l => '<button data-act="jblv:' + l[1] + '" class="' + ((music.jbl < 0 ? 2 : music.jbl) === l[1] ? 'on' : '') + '">' + l[0] + '</button>').join('') + '</div><div class="xs mut" style="margin-top:6px">Every track has five layers. Pick how intense you want it - in battle the game does this for you.</div></div>' +
      '<div class="grid2 jbg">' + T.map(x => x.ok ? '<div class="opt' + (music.jbx === x.i ? ' sel' : '') + '" data-act="jbplay:' + x.i + '"><b style="color:' + x.c + '">' + (music.jbx === x.i ? '▶ ' : '') + x.nm + '</b><span>' + x.sub + '</span></div>' : '<div class="opt" style="opacity:.4;cursor:default"><b>???</b><span>' + x.sub + ' - locked</span></div>').join('') + '</div>' +
      '<div class="row sp" style="margin-top:14px"><button class="btn sm" data-act="jbback">BACK</button><span class="xs mut">Music volume: Settings > Audio</span></div></div>';
  }
});
Object.assign(ACT, {
  juke() { UI.show('scJuke'); setTimeout(jbViz, 60); },
  jbplay(a) { jbPlay(+a[0]); UI.refresh(); setTimeout(jbViz, 60); },
  jblv(a) { music.jbl = +a[0]; STEMS.lv = -1; SFX.click(); UI.refresh(); setTimeout(jbViz, 60); },
  jbstop() { jbStop(); UI.refresh(); setTimeout(jbViz, 60); },
  jbback() { jbStop(); cancelAnimationFrame(jbRaf); UI.back(); }
});
