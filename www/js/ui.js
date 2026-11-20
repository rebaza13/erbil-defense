// ===== Screens, HUD, input routing, main loop =====
let state = 'loading', loadP = 0, storyIdx = 0, storyList = null, storyNext = null, selMission = null, codexSide = 1, paused = false, powerSel = null;
let resultWin = false, uiT = 0, fade = 0;
const hud = { cards: [], ammo: [], powers: [], pause: null, aimBtn: null };

function coverImage(name, alpha = 1) {
  const im = IMG[name]; if (!im) return;
  const s = Math.max(VW / im.width, H / im.height), w = im.width * s, h = im.height * s;
  ctx.globalAlpha = alpha; ctx.drawImage(im, (VW - w) / 2, (H - h) / 2, w, h); ctx.globalAlpha = 1;
}

// ---------------- Title ----------------
let titleBtns = [];
function drawTitle() {
  // live sky behind the menu art edges
  Sky.update(1 / 60, 0); Sky.drawBack(0);
  coverImage('menu_art');
  const t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, VW, H);
  drawKurdFlag(VW / 2 - 470, 60, 120, 130, t, 1);
  text('QELAY HEWLÊR', VW / 2, 150, 92, '#f6d58a');
  text('Defenders of the Erbil Citadel  ·  1258', VW / 2, 228, 32, '#f3e6c4', 'center', false);
  const bw = 380, bx = VW / 2 - bw / 2;
  titleBtns = [
    { r: { x: bx, y: 420, w: bw, h: 78 }, label: 'Campaign', go: () => { if (!Save.data.story) startStory('prologue', 'map'); else state = 'map'; } },
    { r: { x: bx, y: 512, w: bw, h: 78 }, label: 'The Story', go: () => startStory('prologue', 'title') },
    { r: { x: bx, y: 604, w: bw, h: 78 }, label: 'Armies', go: () => { state = 'codex'; } },
    { r: { x: bx, y: 696, w: bw / 3 - 6, h: 64 }, label: Audio2.muted ? 'Sound: Off' : 'Sound: On', go: () => { Audio2.muted = !Audio2.muted; Music.setOn(Music.on); } },
    { r: { x: bx + bw / 3, y: 696, w: bw / 3 - 6, h: 64 }, label: Music.on ? 'Music: On' : 'Music: Off', go: () => { Music.setOn(!Music.on); Save.data.music = Music.on; Save.save(); } },
    { r: { x: bx, y: 772, w: bw, h: 56 }, label: LANG.cur === 'ckb' ? 'زمان: کوردی' : 'Language: English', go: () => setLang(LANG.cur === 'ckb' ? 'en' : 'ckb') },
    { r: { x: bx + bw * 2 / 3, y: 696, w: bw / 3, h: 64 }, label: FX.enabled && FX.ok ? 'Effects: On' : 'Effects: Off', go: () => { FX.enabled = !FX.enabled; cv.style.opacity = FX.enabled && FX.ok ? 0 : 1; Save.data.fx = FX.enabled; Save.save(); } },
  ];
  titleBtns.forEach(b => button(b.r, b.label, b.r.w < 200 ? 21 : b.r.w < 300 ? 26 : 34));
  text('Beta 0.1 · art generated with Google Flow', VW / 2, H - 16, 16, 'rgba(255,240,210,0.7)', 'center', false);
  // drifting embers
  for (let i = 0; i < 30; i++) { const x = (i * 137 + t * 40 * (1 + i % 3)) % VW, y = H - ((t * 30 * (1 + i % 4) + i * 61) % H); ctx.fillStyle = `rgba(255,170,80,${0.4 + 0.3 * Math.sin(t + i)})`; ctx.fillRect(x, y, 3, 3); }
}

// ---------------- Story ----------------
function startStory(key, next) { storyList = STORY[key]; storyIdx = 0; storyNext = next; state = 'story'; uiT = 0; }
function drawStory() {
  coverImage(storyNext === 'title' && storyList === STORY.epilogue ? 'menu_art' : 'menu_art', 1);
  ctx.fillStyle = 'rgba(10,6,2,0.72)'; ctx.fillRect(0, 0, VW, H);
  const a = clamp(uiT * 2, 0, 1);
  ctx.globalAlpha = a;
  panel(VW / 2 - 640, 230, 1280, 380, 20, 'rgba(40,26,14,0.85)');
  wrapText(storyList[storyIdx], VW / 2, 310, 1180, 36, 54, '#f3e6c4');
  ctx.globalAlpha = 1;
  text(`${storyIdx + 1} / ${storyList.length}   ·   tap to continue`, VW / 2, 680, 24, '#c9b48a', 'center', false);
}
function storyTap() {
  storyIdx++; uiT = 0; Audio2.play('click');
  if (storyIdx >= storyList.length) { if (storyList === STORY.prologue) { Save.data.story = true; Save.save(); } state = storyNext; }
}

// ---------------- Campaign map ----------------
let mapNodes = [], mapBtns = [];
function drawMap() {
  coverImage('map_parchment');
  const im = IMG.map_parchment, s = Math.max(VW / im.width, H / im.height), ox = (VW - im.width * s) / 2, oy = (H - im.height * s) / 2;
  const t = performance.now() / 1000;
  text('The Siege of Erbil', VW / 2, 52, 50, '#3a220c', 'center', true, false);
  mapNodes = MISSIONS.map(m => ({ m, x: ox + m.mx * im.width * s, y: oy + m.my * im.height * s }));
  // path line
  ctx.setLineDash([10, 10]); ctx.strokeStyle = 'rgba(120,20,10,0.6)'; ctx.lineWidth = 4; ctx.beginPath();
  mapNodes.forEach((n, i) => i ? ctx.lineTo(n.x, n.y) : ctx.moveTo(n.x, n.y)); ctx.stroke(); ctx.setLineDash([]);
  for (const n of mapNodes) {
    const unlocked = n.m.id < Save.data.unlocked || (n.m.endless && Save.data.unlocked > 1);
    const r = 34 + (selMission === n.m ? Math.sin(t * 5) * 4 : 0);
    ctx.fillStyle = unlocked ? (n.m.id < Save.data.unlocked - 1 ? '#3b6b2a' : '#a8321e') : 'rgba(80,70,60,0.7)';
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 7); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#2a1608'; ctx.stroke();
    text(n.m.endless ? '∞' : String(n.m.id + 1), n.x, n.y + 2, 30, '#fff3d0');
    text(n.m.name, n.x, n.y + 54, 22, unlocked ? '#2a1608' : '#6a5a4a', 'center', true, false);
  }
  mapBtns = [{ r: { x: 24, y: 24, w: 150, h: 60 }, label: '◀ Back', go: () => { state = 'title'; selMission = null; } }];
  if (selMission) {
    const m = selMission, pw = 620, px = VW - pw - 30;
    panel(px, 120, pw, 560, 18, 'rgba(40,24,10,0.92)');
    text(m.name, px + pw / 2, 170, 36, '#f6d58a');
    const tod = m.time < 0.2 || m.time > 0.85 ? 'Night' : m.time < 0.35 ? 'Dawn' : m.time < 0.68 ? 'Day' : 'Dusk';
    text(`${m.endless ? 'Endless waves' : m.waves + ' waves'}  ·  ${tod}  ·  ${m.weather}${m.dynamicWeather ? ' (changing)' : ''}`, px + pw / 2, 215, 22, '#d9c49a', 'center', false);
    wrapText(m.brief, px + pw / 2, 270, pw - 60, 26, 38, '#f3e6c4');
    // enemy preview
    const pool = m.pool || M_ROSTER;
    pool.slice(0, 10).forEach((k, i) => spr(UNITS[k].portrait, px + 50 + i * 58, 560, 54, 0, 1, 0.5, 0.5));
    if (m.endless) text(`Best: wave ${Save.data.best}`, px + pw / 2, 610, 22, '#d9c49a', 'center', false);
    mapBtns.push({ r: { x: px + pw / 2 - 150, y: 610 + (m.endless ? 10 : 0), w: 300, h: 60 }, label: 'Prepare ▶', go: () => openPrep(m) });
  }
  mapBtns.forEach(b => button(b.r, b.label, 28));
}
function mapTap(x, y) {
  for (const b of mapBtns) if (inRect(x, y, b.r)) { Audio2.play('click'); return b.go(); }
  for (const n of mapNodes) {
    const unlocked = n.m.id < Save.data.unlocked || (n.m.endless && Save.data.unlocked > 1);
    if (dist(x, y, n.x, n.y) < 44 && unlocked) { selMission = n.m; Audio2.play('click'); return; }
  }
}

// ---------------- Codex ----------------
let codexBtns = [];
function drawCodex() {
  coverImage('menu_art', 1); ctx.fillStyle = 'rgba(15,9,4,0.85)'; ctx.fillRect(0, 0, VW, H);
  text(codexSide === 1 ? 'Defenders of Erbil' : 'The Army of Hulagu', VW / 2, 60, 46, '#f6d58a');
  const list = codexSide === 1 ? K_ROSTER : M_ROSTER.concat(['m_boss']);
  const cols = 2, cw = Math.min(780, (VW - 80) / 2), ch = 128;
  list.forEach((k, i) => {
    const d = UNITS[k], c = i % cols, r = (i / cols) | 0, x = VW / 2 - cw + c * cw + 10, y = 110 + r * ch;
    if (y > H - 60) return;
    panel(x, y, cw - 20, ch - 12, 12, 'rgba(50,32,16,0.8)', '#7a5a2a');
    spr(d.portrait, x + 58, y + ch / 2 - 6, 96);
    text(d.name + (d.cost ? `  (${d.cost})` : ''), x + 120, y + 26, 24, '#f6d58a', 'left');
    const stats = `HP ${d.hp}  DMG ${d.dmg}  ${d.proj ? 'RANGE ' + d.range : d.siege ? 'SIEGE' : 'MELEE'}  ${['LIGHT', 'MEDIUM', 'HEAVY', 'ENGINE'][d.armor]}`;
    text(stats, x + 120, y + 56, 17, '#d9c49a', 'left', false);
    if (d.desc) wrapText(d.desc, x + 120 + (cw - 160) / 2, y + 86, cw - 160, 17, 20, '#efe2c2');
  });
  codexBtns = [
    { r: { x: 24, y: 24, w: 150, h: 60 }, label: '◀ Back', go: () => { state = 'title'; } },
    { r: { x: VW - 254, y: 24, w: 230, h: 60 }, label: codexSide === 1 ? 'Mongols ▶' : '◀ Kurds', go: () => { codexSide *= -1; } },
  ];
  codexBtns.forEach(b => button(b.r, b.label, 26));
}

// ---------------- Prepare: choose 6 troops + 2 skills ----------------
let prepMission = null, prepDeck = [], prepSkills = [], prepInfo = null, prepBtns = [], prepCards = [];
function openPrep(m) {
  prepMission = m; state = 'prep';
  prepDeck = (Save.data.deck || ['k_spear', 'k_sword', 'k_archer', 'k_guard', 'k_axe', 'k_horse']).filter(k => UNITS[k]).slice(0, DECK_MAX);
  prepSkills = (Save.data.skills || ['storm', 'horn']).filter(k => SKILLS[k]).slice(0, SKILL_MAX);
  prepInfo = null;
}
function drawPrep() {
  prepCards = [];
  coverImage('menu_art', 1); ctx.fillStyle = 'rgba(15,9,4,0.86)'; ctx.fillRect(0, 0, VW, H);
  text('Prepare the Garrison', VW / 2, 50, 44, '#f6d58a');
  text(prepMission.name, VW / 2, 92, 22, '#d9c49a', 'center', false);
  // difficulty
  ['easy', 'medium', 'hard'].forEach((k, i) => {
    const r = { x: VW - 40 - (3 - i) * 128, y: 24, w: 120, h: 52 }, sel = (Save.data.diff || 'medium') === k;
    panel(r.x, r.y, r.w, r.h, 10, sel ? (k === 'hard' ? 'rgba(150,40,20,0.95)' : k === 'easy' ? 'rgba(40,110,40,0.95)' : 'rgba(150,100,20,0.95)') : 'rgba(45,30,16,0.9)', sel ? '#ffe27a' : '#6a4a22');
    text(DIFFS[k].name, r.x + r.w / 2, r.y + 27, 22, sel ? '#fff' : '#bba');
    prepCards.push({ kind: 'diff', k, r });
  });
  // troops: 5 x 2
  const tx0 = 40, cw = Math.min(150, (VW * 0.6 - 60) / 5), ch = 170;
  text(`TROOPS  ${prepDeck.length} / ${DECK_MAX}`, tx0 + cw * 2.5, 140, 24, '#f3e6c4');
  K_ROSTER.forEach((k, i) => {
    const d = UNITS[k], x = tx0 + (i % 5) * cw, y = 165 + ((i / 5) | 0) * (ch + 12), sel = prepDeck.indexOf(k);
    panel(x + 4, y, cw - 8, ch, 12, sel >= 0 ? 'rgba(110,70,20,0.96)' : 'rgba(45,30,16,0.92)', sel >= 0 ? '#ffd27a' : '#6a4a22');
    spr(d.portrait, x + cw / 2, y + 62, 92);
    text(d.name, x + cw / 2, y + 122, 15, '#f6e2b0', 'center', true, false);
    text(`cost ${d.cost}   HP ${d.hp}`, x + cw / 2, y + 146, 14, '#cdb88a', 'center', false);
    if (sel >= 0) { ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(x + cw - 22, y + 20, 15, 0, 7); ctx.fill(); text(String(sel + 1), x + cw - 22, y + 21, 17, '#fff'); }
    prepCards.push({ kind: 'unit', k, r: { x: x + 4, y, w: cw - 8, h: ch } });
  });
  // skills: 3 x 2
  const sx0 = VW * 0.62 + 10, sw = Math.min(170, (VW - sx0 - 40) / 3), shh = 170;
  text(`SKILLS  ${prepSkills.length} / ${SKILL_MAX}   (charged by XÎRET from kills)`, sx0 + sw * 1.5, 140, 20, '#f3e6c4');
  SKILL_LIST.forEach((k, i) => {
    const d = SKILLS[k], x = sx0 + (i % 3) * sw, y = 165 + ((i / 3) | 0) * (shh + 12), sel = prepSkills.indexOf(k);
    panel(x + 4, y, sw - 8, shh, 12, sel >= 0 ? 'rgba(120,85,15,0.96)' : 'rgba(45,30,16,0.92)', sel >= 0 ? '#ffe27a' : '#6a4a22');
    spr(d.icon, x + sw / 2, y + 60, 80);
    text(d.name, x + sw / 2, y + 122, 15, '#f6e2b0', 'center', true, false);
    text(`${d.cost} xîret`, x + sw / 2, y + 146, 14, '#e8c860', 'center', false);
    if (sel >= 0) { ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.arc(x + sw - 22, y + 20, 15, 0, 7); ctx.fill(); text('✓', x + sw - 22, y + 21, 17, '#fff'); }
    prepCards.push({ kind: 'skill', k, r: { x: x + 4, y, w: sw - 8, h: shh } });
  });
  // info line
  panel(40, 545, VW - 80, 110, 12, 'rgba(35,22,12,0.92)');
  if (prepInfo) {
    const d = prepInfo.kind === 'unit' ? UNITS[prepInfo.k] : SKILLS[prepInfo.k];
    text(d.name, 70, 575, 24, '#f6d58a', 'left');
    wrapText(tr(d.desc || '') + (prepInfo.kind === 'unit' && COUNTER_TXT[prepInfo.k] ? '   ' + tr(COUNTER_TXT[prepInfo.k]) : ''), VW / 2, 618, VW - 160, 20, 26, '#efe2c2');
  } else wrapText('Tap troops to choose up to 6 for the battle, and 2 skills. Skills are not on a timer: kill Mongols to fill XÎRET, then unleash them.', VW / 2, 590, VW - 160, 22, 30, '#efe2c2');
  const ok = prepDeck.length > 0;
  prepBtns = [
    { r: { x: 40, y: 690, w: 200, h: 70 }, label: '◀ Map', go: () => { state = 'map'; } },
    { r: { x: VW - 360, y: 680, w: 320, h: 84 }, label: ok ? 'To Battle!' : 'Pick troops', go: () => { if (!ok) return; Save.data.deck = prepDeck.slice(); Save.data.skills = prepSkills.slice(); Save.save(); startBattle(prepMission); } },
  ];
  prepBtns.forEach(b => button(b.r, b.label, b.label === 'To Battle!' ? 36 : 28));
  // chosen army preview
  prepDeck.forEach((k, i) => spr(UNITS[k].portrait, 300 + i * 74, 725, 64));
  prepSkills.forEach((k, i) => spr(SKILLS[k].icon, 300 + DECK_MAX * 74 + 30 + i * 74, 725, 58));
}
function prepTap(x, y) {
  for (const b of prepBtns) if (inRect(x, y, b.r)) { Audio2.play('click'); return b.go(); }
  for (const c of prepCards) if (inRect(x, y, c.r)) {
    Audio2.play('click');
    if (c.kind === 'diff') { Save.data.diff = c.k; Save.save(); return; }
    prepInfo = c;
    const list = c.kind === 'unit' ? prepDeck : prepSkills, max = c.kind === 'unit' ? DECK_MAX : SKILL_MAX;
    const i = list.indexOf(c.k);
    if (i >= 0) list.splice(i, 1);
    else if (list.length < max) list.push(c.k);
    else { list.shift(); list.push(c.k); }   // full: replace the oldest pick
    return;
  }
}

// ---------------- Battle start / end ----------------
function startBattle(m) { battleInit(m); state = 'battle'; paused = false; powerSel = null; selMission = null; Audio2.play('drum'); }
function endBattle(win) {
  resultWin = win;
  setTimeout(() => { state = 'result'; uiT = 0; }, 1600);
  Audio2.play(win ? 'win' : 'lose');
  if (win && !B.mission.endless) { Save.data.unlocked = Math.max(Save.data.unlocked, B.mission.id + 2); Save.save(); }
  if (B.mission.endless) { Save.data.best = Math.max(Save.data.best, B.wave - 1); Save.save(); }
}

// ---------------- HUD ----------------
function drawHUD() {
  const t = performance.now() / 1000;
  // castle HP
  panel(16, 14, 430, 54, 10);
  { const k = kurdFlagTex(); ctx.drawImage(k, 30, 26, 48, 32); }
  const hpF = B.castleHP / B.castleMax;
  ctx.fillStyle = '#2a1a10'; ctx.fillRect(96, 30, 330, 22);
  ctx.fillStyle = hpF > 0.5 ? '#6cbf4a' : hpF > 0.25 ? '#e0a830' : '#d8432a'; ctx.fillRect(96, 30, 330 * hpF, 22);
  text(`Citadel ${Math.ceil(B.castleHP)}`, 261, 41, 18, '#fff');
  // wave info
  const m = B.mission, cx = VW / 2;
  panel(cx - 230, 14, 460, 64, 10);
  text((m.endless ? `Wave ${B.wave}` : `Wave ${B.wave} / ${m.waves}`) + `  ·  ${DIFF().name}`, cx, 36, 24, '#f6d58a');
  const wf = B.phase === 'wave' ? clamp(B.waveT / B.waveDur, 0, 1) : 0;
  ctx.fillStyle = '#2a1a10'; ctx.fillRect(cx - 200, 56, 400, 10);
  ctx.fillStyle = B.lastStand ? '#ff7a3a' : '#c9a24a'; ctx.fillRect(cx - 200, 56, 400 * wf, 10);
  drawMinimap();
  if (B.phase === 'break') text(`Next wave in ${Math.ceil(B.breakT)}`, cx, 128, 22, '#f3e6c4');
  // kills, weather, pause
  const tod = Sky.time < 0.2 || Sky.time > 0.84 ? 'Night' : Sky.time < 0.33 ? 'Dawn' : Sky.time < 0.68 ? 'Day' : 'Dusk';
  // enemy base HP (mirrors the citadel)
  const cpx = VW - 96 - 12 - 430, cf = B.campHP / B.campMax;
  panel(cpx, 14, 430, 54, 10);
  ctx.fillStyle = '#2a1a10'; ctx.fillRect(cpx + 16, 30, 330, 22);
  ctx.fillStyle = (B.campHit || 0) > 0 ? '#ffb070' : '#b8402c'; ctx.fillRect(cpx + 16 + 330 * (1 - cf), 30, 330 * cf, 22);
  text(`Mongol Camp ${Math.ceil(B.campHP)}`, cpx + 181, 41, 18, '#fff');
  spr('m_tug_banner', cpx + 390, 41, 44, 0, 1, 0.5, 0.5, 1);
  text(`☠ ${B.kills}   ${tod} · ${Sky.weather}   wind ${Sky.wind < -0.05 ? '←' : Sky.wind > 0.05 ? '→' : '·'}${Math.abs(Sky.wind * 10).toFixed(0)}`, cpx + 215, 86, 17, '#f3e6c4');
  const wrF = B.wrath / B.wrathMax;
  ctx.fillStyle = '#1a0f08'; ctx.fillRect(cpx + 16, 104, 330, 12);
  ctx.fillStyle = wrF > 0.3 ? `rgb(200,${(60 + Math.sin(t * 6) * 30) | 0},40)` : '#8a3a2a'; ctx.fillRect(cpx + 17, 105, 328 * wrF, 10);
  text(`KHAN'S WRATH ${Math.floor(B.wrath)}`, cpx + 181, 128, 13, '#ffb090');
  if (B.mDrumT > 0) text('Mongol war drums: +25%', cpx + 181, 146, 15, '#ff8a6a');
  hud.follow = { x: 16, y: 78, w: 170, h: 44 };
  panel(hud.follow.x, hud.follow.y, hud.follow.w, hud.follow.h, 10, B.follow ? 'rgba(120,80,20,0.95)' : 'rgba(40,28,16,0.85)', B.follow ? '#ffd27a' : '#7a5a2a');
  text(B.follow ? '◉ Auto camera' : '○ Auto camera', hud.follow.x + hud.follow.w / 2, hud.follow.y + 23, 17, B.follow ? '#fff3c0' : '#c9b48a');
  hud.pause = { x: VW - 96, y: 14, w: 80, h: 54 }; button(hud.pause, 'II', 28);

  // bottom bar
  const by = H - 128;
  ctx.fillStyle = 'rgba(25,15,8,0.82)'; ctx.fillRect(0, by, VW, 128);
  ctx.fillStyle = '#b8913f'; ctx.fillRect(0, by, VW, 3);
  // Berxwedan (deploy resource) bar
  const nC = B.deck.length, cw = Math.min(118, (VW - 560) / Math.max(1, nC)), ch = 92;
  const rx = 16, rw = cw * nC, ry = by + 10;
  ctx.fillStyle = '#1a0f08'; ctx.fillRect(rx, ry, rw, 18);
  const pip = rw / B.resMax;
  for (let i = 0; i < B.resMax; i++) {
    const f = clamp(B.res - i, 0, 1);
    ctx.fillStyle = B.lastStand ? `rgb(${230},${(110 + Math.sin(t * 8) * 30) | 0},40)` : '#c0392b';
    ctx.fillRect(rx + i * pip + 2, ry + 2, (pip - 4) * f, 14);
  }
  text(`BERXWEDAN ${Math.floor(B.res)}${B.lastStand ? '   ×1.5 LAST STAND' : ''}`, rx + rw / 2, ry + 9, 15, '#fff');
  // army orders
  hud.orders = [['defend', '⛨ Defend'], ['hold', '■ Hold'], ['attack', '⚔ Attack'], ['rush', '» Rush! 15']].map(([k, label], i) => {
    const r = { x: rx + i * 128, y: by - 56, w: 120, h: 46 }, sel = B.order === k;
    panel(r.x, r.y, r.w, r.h, 10, sel ? (k === 'attack' ? 'rgba(150,50,20,0.95)' : k === 'defend' ? 'rgba(30,90,50,0.95)' : 'rgba(110,90,30,0.95)') : 'rgba(40,28,16,0.85)', sel ? '#ffe27a' : '#7a5a2a');
    text(label, r.x + r.w / 2, r.y + 24, 18, sel ? '#fff' : '#c9b48a');
    return { k, r };
  });
  // unit cards (the 6 chosen before battle)
  hud.cards = B.deck.map((k, i) => ({ k, r: { x: rx + i * cw + 2, y: by + 32, w: cw - 4, h: ch } }));
  for (const c of hud.cards) {
    const d = UNITS[c.k], ok = B.res >= d.cost;
    panel(c.r.x, c.r.y, c.r.w, c.r.h, 8, ok ? 'rgba(70,45,20,0.95)' : 'rgba(40,32,26,0.95)', ok ? '#d6a94a' : '#5a4a3a');
    ctx.globalAlpha = ok ? 1 : 0.4; spr(d.portrait, c.r.x + c.r.w / 2, c.r.y + 38, Math.min(68, c.r.w - 6)); ctx.globalAlpha = 1;
    // partial fill shows how close you are to affording it
    if (!ok) { ctx.fillStyle = 'rgba(214,169,74,0.25)'; const f = clamp(B.res / d.cost, 0, 1); ctx.fillRect(c.r.x + 3, c.r.y + c.r.h - 4 - (c.r.h - 8) * f, c.r.w - 6, (c.r.h - 8) * f); }
    ctx.fillStyle = '#7a1f12'; ctx.beginPath(); ctx.arc(c.r.x + 15, c.r.y + 15, 13, 0, 7); ctx.fill();
    text(String(d.cost), c.r.x + 15, c.r.y + 16, 17, '#fff');
    text(shortName(d.name), c.r.x + c.r.w / 2, c.r.y + ch - 12, fitSize(shortName(d.name), c.r.w - 6, 14), ok ? '#f3e6c4' : '#887', 'center', true, false);
  }
  // ballista ammo (cooldowns) + the 2 chosen skills (paid with XÎRET from kills)
  const aw = 86, gap = 6, nS = B.skills.length;
  const ax0 = VW - 16 - (3 + nS) * (aw + gap) - 14;
  hud.ammo = []; hud.powers = [];
  ['spear', 'fire', 'stone'].forEach((k, i) => {
    const r = { x: ax0 + i * (aw + gap), y: by + 14, w: aw, h: 104 }, def = AMMO[k], sel = B.ammo === k;
    panel(r.x, r.y, r.w, r.h, 10, sel ? 'rgba(120,70,20,0.95)' : 'rgba(55,35,18,0.95)', sel ? '#ffd27a' : '#8a6a3a');
    spr(def.icon, r.x + r.w / 2, r.y + 42, 56);
    const cd = B.cds[k], afford = B.zeal >= def.cost;
    if (!afford) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(r.x, r.y, r.w, r.h); }
    if (cd > 0) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(r.x, r.y + r.h * (1 - cd / def.cd), r.w, r.h * cd / def.cd); text(Math.ceil(cd) + 's', r.x + r.w / 2, r.y + 44, 22, '#fff'); }
    text(String(def.cost), r.x + r.w - 16, r.y + 16, 15, afford ? '#ffe27a' : '#a66');
    text(shortName(def.name), r.x + r.w / 2, r.y + 88, fitSize(shortName(def.name), r.w - 6, 14), '#f3e6c4', 'center', true, false);
    hud.ammo.push({ k, r });
  });
  const sx0 = ax0 + 3 * (aw + gap) + 14;
  // XÎRET bar over the skill buttons
  const zx = ax0, zw = sx0 + nS * (aw + gap) - gap - ax0, zf = B.zeal / B.zealMax;
  ctx.fillStyle = '#1a0f08'; ctx.fillRect(zx, by - 26, zw, 20);
  const zg = ctx.createLinearGradient(zx, 0, zx + zw, 0); zg.addColorStop(0, '#b07a1a'); zg.addColorStop(1, '#ffd34a');
  ctx.fillStyle = zg; ctx.fillRect(zx + 2, by - 24, (zw - 4) * zf, 16);
  for (const k of B.skills) { const m = SKILLS[k].cost / B.zealMax; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(zx + 2 + (zw - 4) * m - 1, by - 26, 2, 20); }
  text(`XÎRET ${Math.floor(B.zeal)}  (from kills)`, zx + zw / 2, by - 16, 14, '#fff');
  B.skills.forEach((k, i) => {
    const r = { x: sx0 + i * (aw + gap), y: by + 14, w: aw, h: 104 }, def = SKILLS[k], ok = canCast(k), sel = powerSel === k;
    panel(r.x, r.y, r.w, r.h, 10, sel ? 'rgba(140,90,20,0.95)' : ok ? 'rgba(90,60,15,0.95)' : 'rgba(45,35,25,0.95)', sel ? '#fff0a0' : ok ? '#ffd34a' : '#6a5a3a');
    ctx.globalAlpha = ok ? 1 : 0.45; spr(def.icon, r.x + r.w / 2, r.y + 40, 54); ctx.globalAlpha = 1;
    if (ok) { ctx.strokeStyle = `rgba(255,220,90,${0.5 + Math.sin(t * 6) * 0.3})`; ctx.lineWidth = 3; ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4); }
    text(String(def.cost), r.x + r.w - 16, r.y + 16, 15, ok ? '#ffe27a' : '#998');
    text(shortName(def.name), r.x + r.w / 2, r.y + 88, fitSize(shortName(def.name), r.w - 6, 14), '#f3e6c4', 'center', true, false);
    hud.powers.push({ k, r });
  });
  // ballista off-screen: show return button
  const px = castle.pivotX - B.camX;
  hud.aimBtn = null;
  if (px < -20 || px > VW) { hud.aimBtn = { x: 16, y: by - 130, w: 170, h: 60 }; button(hud.aimBtn, '◀ Citadel', 24); }
  if (B.camX < WW - VW - 40) { hud.campBtn = { x: VW - 186, y: by - 80, w: 170, h: 60 }; button(hud.campBtn, 'Camp ▶', 24); } else hud.campBtn = null;
  if (powerSel) text(`Tap the battlefield: ${SKILLS[powerSel].name}`, VW / 2, by - 50, 26, '#ffd27a');
  // banner
  if (B.bannerT > 0 && B.banner) {
    const a = clamp(B.bannerT, 0, 1);
    ctx.globalAlpha = a; panel(VW / 2 - 380, 150, 760, 80, 14, 'rgba(60,20,10,0.85)', '#e2b85a');
    text(B.banner, VW / 2, 191, 34, '#ffe2a0'); ctx.globalAlpha = 1;
  }
  if (B.wave <= 1 && B.phase !== 'won' && B.waveT < 14 && Save.data.unlocked <= 1) {
    text('Touch the sky or the citadel and PULL BACK like a slingshot to fire  ·  tap cards to send troops  ·  drag the open field to look around', VW / 2, by - 30, 20, '#fff3d0');
  }
}

let pauseBtns = [];
function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VW, H);
  panel(VW / 2 - 260, 180, 520, 540, 20);
  text('Paused', VW / 2, 240, 48, '#f6d58a');
  const bx = VW / 2 - 190, bw = 380;
  pauseBtns = [
    { r: { x: bx, y: 300, w: bw, h: 70 }, label: 'Resume', go: () => { paused = false; } },
    { r: { x: bx, y: 385, w: bw, h: 70 }, label: `Speed: ${B.speed}x`, go: () => { B.speed = B.speed === 1 ? 2 : 1; } },
    { r: { x: bx, y: 470, w: bw, h: 70 }, label: 'Restart', go: () => startBattle(B.mission) },
    { r: { x: bx, y: 555, w: bw, h: 70 }, label: 'Retreat to Map', go: () => { paused = false; state = 'map'; } },
    { r: { x: bx, y: 640, w: bw, h: 50 }, label: 'Change army', go: () => { paused = false; openPrep(B.mission); } },
  ];
  pauseBtns.forEach(b => button(b.r, b.label, 30));
}
let resultBtns = [];
function drawResult() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, VW, H);
  panel(VW / 2 - 380, 160, 760, 560, 20);
  text(resultWin ? 'The Citadel Stands!' : 'The Gate Has Fallen', VW / 2, 240, 54, resultWin ? '#f6d58a' : '#ff8a6a');
  const m = B.mission;
  wrapText(resultWin ? (B.campHP <= 0 ? 'The Mongol camp is in flames and Hulagu’s men flee into the plain. Erbil breathes again.' : m.id === 5 ? 'Noyan Kara-Tümen\'s great assault is broken. For one more season, the mound does not kneel.' : 'The Mongols pull back to their camp, dragging their dead. They will return.')
    : 'Smoke over the mound. But the story of Erbil is not over - rally the garrison and try again.', VW / 2, 320, 640, 28, 40, '#f3e6c4');
  text(`Waves survived: ${resultWin ? B.wave : B.wave - 1}    Enemies slain: ${B.kills}`, VW / 2, 470, 26, '#d9c49a');
  const bx = VW / 2 - 300;
  resultBtns = [
    { r: { x: bx, y: 560, w: 280, h: 72 }, label: resultWin ? 'Continue' : 'Try Again', go: () => { if (resultWin) { if (m.id === 5) startStory('epilogue', 'map'); else state = 'map'; } else openPrep(m); } },
    { r: { x: bx + 320, y: 560, w: 280, h: 72 }, label: 'Map', go: () => { state = 'map'; } },
  ];
  resultBtns.forEach(b => button(b.r, b.label, 30));
}

// ---------------- Input ----------------
let panStart = null, lastPanX = 0, lastPanT = 0, miniDrag = false;
function camGlide(x) { B.follow = false; B.camV = 0; B.camT = clamp(x, 0, WW - VW); }
window.onPointer = (type, x, y) => {
  if (state === 'loading') return;
  if (type === 'down') {
    if (state === 'title') { for (const b of titleBtns) if (inRect(x, y, b.r)) { Audio2.play('click'); b.go(); } return; }
    if (state === 'story') return storyTap();
    if (state === 'map') return mapTap(x, y);
    if (state === 'prep') return prepTap(x, y);
    if (state === 'codex') { for (const b of codexBtns) if (inRect(x, y, b.r)) { Audio2.play('click'); b.go(); } return; }
    if (state === 'result') { for (const b of resultBtns) if (inRect(x, y, b.r)) { Audio2.play('click'); b.go(); } return; }
    if (state === 'battle') {
      if (paused) { for (const b of pauseBtns) if (inRect(x, y, b.r)) { Audio2.play('click'); b.go(); } return; }
      if (inRect(x, y, hud.pause)) { paused = true; Audio2.play('click'); return; }
      if (hud.follow && inRect(x, y, hud.follow)) { B.follow = !B.follow; B.camV = 0; Audio2.play('click'); return; }
      if (hud.aimBtn && inRect(x, y, hud.aimBtn)) { camGlide(0); return; }
      if (hud.campBtn && inRect(x, y, hud.campBtn)) { camGlide(WW - VW); return; }
      for (const c of hud.cards) if (inRect(x, y, c.r)) { deploy(c.k); return; }
      for (const o of hud.orders || []) if (inRect(x, y, o.r)) { setOrder(o.k); return; }
      for (const a of hud.ammo) if (inRect(x, y, a.r)) { B.ammo = a.k; powerSel = null; Audio2.play('click'); return; }
      for (const p of hud.powers) if (inRect(x, y, p.r)) {
        if (!canCast(p.k)) { Audio2.play('click'); return; }
        if (SKILLS[p.k].target) { powerSel = powerSel === p.k ? null : p.k; Audio2.play('click'); }
        else castSkill(p.k);
        return;
      }
      if (B.mini && inRect(x, y, B.mini)) { miniDrag = true; camGlide((x - B.mini.x) / B.mini.w * WW - VW / 2); return; }
      if (y > H - 158) return;
      if (powerSel) { castSkill(powerSel, x + B.camX); powerSel = null; return; }
      if (canStartAim(x, y) && B.phase !== 'won' && B.phase !== 'lost') { B.aiming = true; B.aimSX = B.aimX = x; B.aimSY = B.aimY = y; return; }
      panStart = { x, cam: B.camX }; B.camV = 0; B.follow = false; B.camT = B.camX; lastPanX = x; lastPanT = performance.now();
    }
  } else if (type === 'move') {
    if (state !== 'battle') return;
    if (B.aiming) { B.aimX = x; B.aimY = y; return; }
    if (miniDrag && B.mini) { B.camT = clamp((x - B.mini.x) / B.mini.w * WW - VW / 2, 0, WW - VW); return; }
    if (panStart) {
      B.camT = clamp(panStart.cam - (x - panStart.x) * 1.15, 0, WW - VW);
      const now = performance.now(), dtp = (now - lastPanT) / 1000;
      if (dtp > 0.004) { const v = -(x - lastPanX) / dtp * 1.15; B.camV = B.camV * 0.4 + v * 0.6; lastPanX = x; lastPanT = now; }
    }
  } else if (type === 'up') {
    if (B.aiming) { B.aiming = false; fireAmmo(x, y); }
    if (panStart && performance.now() - lastPanT > 90) B.camV = 0;   // held still before release: no fling
    B.camV = clamp(B.camV, -2600, 2600);
    panStart = null; miniDrag = false;
  }
};
function setOrder(k) {
  if (k === 'rush') { // every infantryman sprints at the enemy (costs XÎRET)
    if (B.zeal < 15) { showBanner('Not enough XÎRET - kill more Mongols', 1.2); return; }
    B.zeal -= 15; Audio2.play('horn', 0.9); showBanner('RUSH!', 1.2); B.order = 'attack';
    for (const u of B.units) if (u.side === 1 && !u.d.horse && !u.d.proj && !u.d.support && !u.d.siege) { u.rushing = 3.2; u.holdX = null; }
    return;
  }
  B.order = k; Audio2.play(k === 'attack' ? 'horn' : 'drum', 0.5);
  for (const u of B.units) if (u.side === 1) u.holdX = k === 'hold' ? u.x : null;
  showBanner(k === 'attack' ? 'Advance!' : k === 'defend' ? 'Fall back to the gate!' : 'Hold the line!', 1.2);
}
window.onWheel = d => { if (state === 'battle' && !paused) { B.follow = false; B.camV = 0; B.camT = clamp(B.camT + d * 1.2, 0, WW - VW); } };
window.onKey = k => {
  if (state !== 'battle') return;
  const n = parseInt(k); if (n >= 1 && n <= B.deck.length) deploy(B.deck[n - 1]);
  if (k === 'q' && B.skills[0]) castSkill(B.skills[0], B.camX + VW * 0.6);
  if (k === 'e' && B.skills[1]) castSkill(B.skills[1], B.camX + VW * 0.6);
  if (k === 'ArrowLeft' || k === 'a') { B.follow = false; B.camV = -900; }
  if (k === 'ArrowRight' || k === 'd') { B.follow = false; B.camV = 900; }
  if (k === 'f') B.follow = !B.follow;
  if (k === 'z') setOrder('defend'); if (k === 'x') setOrder('hold'); if (k === 'c') setOrder('attack');
  if (k === 'Escape' || k === 'p') paused = !paused;
};

// ---------------- Main loop ----------------
let lastT = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; uiT += dt;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.clearRect(0, 0, VW, H);
  try {
    if (state === 'loading') {
      ctx.fillStyle = '#1a120a'; ctx.fillRect(0, 0, VW, H);
      text('QELAY HEWLÊR', VW / 2, H / 2 - 60, 64, '#f6d58a');
      ctx.fillStyle = '#3a2a18'; ctx.fillRect(VW / 2 - 300, H / 2 + 20, 600, 16);
      ctx.fillStyle = '#c9a24a'; ctx.fillRect(VW / 2 - 300, H / 2 + 20, 600 * loadP, 16);
    } else if (state === 'title') drawTitle();
    else if (state === 'story') drawStory();
    else if (state === 'map') drawMap();
    else if (state === 'codex') drawCodex();
    else if (state === 'prep') drawPrep();
    else if (state === 'battle' || state === 'result') {
      if (state === 'battle' && !paused) { const sp = B.speed || 1; for (let i = 0; i < sp; i++) updateBattle(dt); }
      drawBattle(); drawHUD();
      if (paused) drawPause();
      if (state === 'result') drawResult();
    }
    postFX(dt);
  } catch (e) { console.error(e); window.__lastError = String(e.stack || e); }
  requestAnimationFrame(frame);
}
function postFX(dt) {
  if (!FX.ok) return;
  FX.update(dt);
  const inB = state === 'battle' || state === 'result', cam = inB ? B.camX : 0, heat = [];
  if (inB) for (const f of B.fires) { const x = (f.x - cam) / VW; if (x < -0.1 || x > 1.1) continue; heat.push([x, 1 - (f.y - 10) / H, clamp(f.t / f.max * 2, 0, 1) * Math.min(1.6, f.r / 45)]); if (heat.length >= 8) break; }
  const sp = Sky.sunPos;
  FX.draw({ shake: inB ? B.shake : 0, flash: Sky.flash, night: Sky.night(), wet: Sky.cur.rain, dust: Sky.cur.dust, storm: Sky.cur.storm,
    hit: inB ? B.hitK || 0 : 0, heat, danger: inB && B.phase !== 'won' ? clamp((0.35 - B.castleHP / B.castleMax) / 0.35, 0, 1) : 0, slow: inB ? clamp((B.slowT || 0) * 2, 0, 1) : 0, shocks: FX.shocks.map(s => [(s.x - cam) / VW, 1 - s.y / H, s.t * 0.7, s.s * (1 - s.t / 0.7)]),
    sun: sp && inB ? [sp[0] / VW, 1 - sp[1] / H, sp[2]] : [0, 0, 0], bloom: 0.5 + Sky.night() * 0.2, tint: [1.03, 1.0, 0.96] });
}
Sky.init();
FX.init();
setLang(Save.data.lang || 'en');
Music.on = Save.data.music !== false;
if (Save.data.fx === false) { FX.enabled = false; cv.style.opacity = 1; }
requestAnimationFrame(frame);
loadAssets(p => loadP = p).then(() => { state = 'title'; Sky.set(0.72, 'cloudy', true); });
