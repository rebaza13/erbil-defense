// ===== Core: canvas, assets, input, audio, helpers =====
const H = 900;                 // logical view height
const WW = 2700;               // world width (short: both sides stay in view)
const GROUND = 688;            // ground line y (HUD starts at 772)
const CASTLE_FRONT = 800;      // enemies stop here to hit the gate
const SPAWN_X = 2480;
const CAMP_FRONT = 2170;       // the Mongol camp palisade: Kurds attack it here

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let DPR = 1, SCALE = 1, VW = 1600;

function resize() {
  // render at most ~1600px wide: big phones render far fewer pixels, still sharp
  DPR = Math.min(window.devicePixelRatio || 1, 1.5, 1600 / innerWidth);
  cv.width = Math.round(innerWidth * DPR);
  cv.height = Math.round(innerHeight * DPR);
  cv.style.width = innerWidth + 'px';
  cv.style.height = innerHeight + 'px';
  SCALE = cv.height / H;
  VW = cv.width / SCALE;
}
addEventListener('resize', resize);
resize();

// ---------- math ----------
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const pick = arr => arr[(Math.random() * arr.length) | 0];

// ---------- assets ----------
const IMG = {};
function loadAssets(onProgress) {
  const list = window.ASSET_LIST;
  const names = Object.keys(list);
  let done = 0;
  return Promise.all(names.map(n => new Promise(res => {
    const im = new Image();
    im.onload = im.onerror = () => { done++; onProgress && onProgress(done / names.length); res(); };
    im.src = 'assets/' + list[n].f;
    IMG[n] = im;
  })));
}

// Pre-scaled sprite cache: downscaling a big image every frame is the #1 cost on phones.
const SIZED = new Map(); let sizedCount = 0;
function sized(im, w, h) {
  if (!im || !im.width) return im;
  const px = w * SCALE * DPR0(), key = im;
  if (px > 520 || px >= im.width * 0.8) return im;          // large or near-native: draw directly
  const bucket = Math.max(8, Math.ceil(px / 12) * 12);      // 12px buckets
  let m = SIZED.get(key); if (!m) { m = new Map(); SIZED.set(key, m); }
  let c = m.get(bucket);
  if (!c) {
    if (sizedCount > 1500) return im;
    c = document.createElement('canvas');
    c.width = bucket; c.height = Math.max(1, Math.round(bucket * im.height / im.width));
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height);
    m.set(bucket, c); sizedCount++;
  }
  return c;
}
function DPR0() { return 1; }
// pre-rendered radial blobs (replaces per-frame createRadialGradient)
function radialSprite(stops, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}
const GLOW = radialSprite([[0, 'rgba(255,160,70,0.55)'], [1, 'rgba(255,120,40,0)']]);
const HOLE = radialSprite([[0, 'rgba(0,0,0,1)'], [0.5, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']], 64);
const FLAME = radialSprite([[0, 'rgba(255,245,180,1)'], [0.35, 'rgba(255,150,40,0.85)'], [1, 'rgba(200,40,0,0)']], 64);
function blob(c, x, y, r, a = 1) { if (a <= 0.01) return; ctx.globalAlpha = a; ctx.drawImage(c, x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
// Draw sprite `name` scaled to height h (or width if byW) at x,y with anchor (ax,ay) in 0..1, rotation r, flip
function spr(name, x, y, h, r = 0, flip = 1, ax = 0.5, ay = 0.5, alpha = 1, byW = false) {
  let im = IMG[name];
  if (!im || !im.width) return;
  const s = byW ? h / im.width : h / im.height;
  const w = im.width * s, hh = im.height * s;
  im = sized(im, w, hh);
  ctx.save();
  ctx.translate(x, y);
  if (r) ctx.rotate(r);
  if (flip !== 1) ctx.scale(flip, 1);
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  ctx.drawImage(im, -w * ax, -hh * ay, w, hh);
  ctx.restore();
}

// ---------- input ----------
const input = { down: false, x: 0, y: 0, sx: 0, sy: 0, handlers: [] };
function toLogical(e) { return { x: e.clientX * DPR / SCALE, y: e.clientY * DPR / SCALE }; }
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  const p = toLogical(e);
  Object.assign(input, { down: true, x: p.x, y: p.y, sx: p.x, sy: p.y });
  Audio2.unlock();
  if (window.onPointer) onPointer('down', p.x, p.y);
});
cv.addEventListener('pointermove', e => {
  const p = toLogical(e);
  input.x = p.x; input.y = p.y;
  if (window.onPointer) onPointer('move', p.x, p.y);
});
const upH = e => {
  if (!input.down) return;
  input.down = false;
  const p = toLogical(e);
  if (window.onPointer) onPointer('up', p.x, p.y);
};
cv.addEventListener('pointerup', upH);
cv.addEventListener('pointercancel', upH);
addEventListener('keydown', e => { if (window.onKey) onKey(e.key); });
cv.addEventListener('wheel', e => { e.preventDefault(); if (window.onWheel) onWheel(Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY); }, { passive: false });

// ---------- audio (fully synthesized, no files) ----------
const Audio2 = {
  ac: null, master: null, muted: false, rainNode: null, windNode: null,
  unlock() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); if (typeof Music !== 'undefined') Music.start(); return; }
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ac.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ac.destination);
      const len = this.ac.sampleRate * 2;
      this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // long, seamlessly looping ambience bed (a 2s loop was audible as a pulsing 'glitch' in the wind)
      const sr = this.ac.sampleRate, L = sr * 9, X = sr * 1, raw = new Float32Array(L + X);
      let b0 = 0, b1 = 0; for (let i = 0; i < L + X; i++) { const w = Math.random() * 2 - 1; b0 = 0.99 * b0 + w * 0.1; b1 = 0.6 * b1 + w * 0.4; raw[i] = b0 * 0.7 + b1 * 0.5; }
      this.ambBuf = this.ac.createBuffer(1, L, sr); const ab = this.ambBuf.getChannelData(0);
      for (let i = 0; i < L; i++) { if (i < X) { const a = i / X; ab[i] = raw[i] * Math.sqrt(a) + raw[L + i] * Math.sqrt(1 - a); } else ab[i] = raw[i]; }
    } catch (e) { this.ac = null; }
    if (this.ac && typeof Music !== 'undefined') Music.start();
  },
  _noise(dur, freq, q, vol, type = 'bandpass', t0 = 0) {
    if (!this.ac || this.muted) return;
    const t = this.ac.currentTime + t0;
    const src = this.ac.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  },
  _tone(f0, f1, dur, vol, type = 'sine', t0 = 0) {
    if (!this.ac || this.muted) return;
    const t = this.ac.currentTime + t0;
    const o = this.ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    const g = this.ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  // swept-filter noise burst: the basis of every realistic effect (no musical tones)
  _sweep(dur, f0, f1, q, vol, type = 'bandpass', t0 = 0, attack = 0.005) {
    if (!this.ac || this.muted) return;
    const t = this.ac.currentTime + t0;
    const src = this.ac.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ac.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = this.ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  },
  _thump(f, dur, vol, t0 = 0) { // very low body thump (felt more than heard)
    if (!this.ac || this.muted) return;
    const t = this.ac.currentTime + t0, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  last: {},
  play(name, vol = 1) {
    if (!this.ac || this.muted) return;
    const now = this.ac.currentTime;                    // limit repeats so volleys don't machine-gun
    if (this.last[name] && now - this.last[name] < 0.05) return; this.last[name] = now;
    const v = vol * rand(0.8, 1.1);
    switch (name) {
      case 'bow': this._sweep(0.28, rand(1800, 2600), 500, 1.2, 0.07 * v); break;                    // arrow whoosh
      case 'ballista': this._sweep(0.12, 900, 200, 0.8, 0.5 * v, 'lowpass'); this._thump(70, 0.25, 0.35 * v); this._sweep(0.45, 1400, 300, 1.5, 0.18 * v, 'bandpass', 0.03); break;
      case 'hit': this._sweep(0.12, 700, 150, 0.9, 0.3 * v, 'lowpass'); break;                       // body impact
      case 'clang': this._sweep(0.22, 4200, 3000, 12, 0.22 * v); this._sweep(0.15, 6200, 5200, 14, 0.12 * v); break; // metal on metal
      case 'thud': this._sweep(0.25, 400, 80, 0.7, 0.45 * v, 'lowpass'); this._thump(55, 0.2, 0.25 * v); break;
      case 'crash': this._sweep(0.7, 1800, 120, 0.6, 0.55 * v, 'lowpass'); this._thump(45, 0.5, 0.4 * v); this._sweep(0.5, 3000, 900, 2, 0.12 * v, 'bandpass', 0.05); break;
      case 'fire': this._sweep(0.9, 600, 2500, 0.5, 0.22 * v, 'bandpass', 0, 0.08); break;
      case 'hiss': this._sweep(0.8, 5000, 3000, 0.8, 0.1 * v, 'highpass'); break;
      case 'horn': { // distant war horn: filtered, breathy, no clean tone
        if (!this.ac) break; const t = now, o = this.ac.createOscillator(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(92, t); o.frequency.linearRampToValueAtTime(98, t + 0.3); o.frequency.linearRampToValueAtTime(90, t + 1.6);
        f.type = 'lowpass'; f.frequency.value = 420; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.13 * v, t + 0.25); g.gain.linearRampToValueAtTime(0.0001, t + 1.8);
        o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + 1.9);
        this._sweep(1.6, 500, 300, 1, 0.05 * v, 'bandpass', 0, 0.2); break; }
      case 'drum': this._thump(85, 0.35, 0.5 * v); this._sweep(0.12, 900, 200, 1, 0.15 * v, 'lowpass'); this._thump(85, 0.35, 0.4 * v, 0.42); break;
      case 'thunder': this._sweep(2.8, 300, 40, 0.5, 0.9 * v, 'lowpass', 0, 0.05); this._sweep(0.35, 1500, 200, 0.5, 0.3 * v, 'lowpass'); break;
      case 'deploy': this._sweep(0.1, 600, 300, 1, 0.12 * v, 'lowpass'); this._sweep(0.1, 600, 300, 1, 0.1 * v, 'lowpass', 0.14); break; // boots
      case 'click': this._sweep(0.04, 2500, 1500, 2, 0.06 * v); break;
      case 'win': for (let i = 0; i < 3; i++) this._thump(90, 0.4, 0.45, i * 0.45); this.play('horn', 1); break;
      case 'lose': this._sweep(2.5, 800, 60, 0.5, 0.5, 'lowpass'); this._thump(40, 1.2, 0.4); break;
    }
  },
  // looping ambience driven by weather intensity
  ambience(rain, wind) {
    if (!this.ac) return;
    const mk = () => {
      const src = this.ac.createBufferSource(); src.buffer = this.ambBuf || this.noiseBuf; src.loop = true; src.playbackRate.value = rand(0.92, 1.08);
      const f = this.ac.createBiquadFilter(); const g = this.ac.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.master); src.start();
      return { f, g };
    };
    if (!this.rainNode) { this.rainNode = mk(); this.rainNode.f.type = 'highpass'; this.rainNode.f.frequency.value = 2500; }
    if (!this.windNode) { this.windNode = mk(); this.windNode.f.type = 'bandpass'; this.windNode.f.frequency.value = 350; this.windNode.f.Q.value = 0.6; }
    const t = this.ac.currentTime;
    this.rainNode.g.gain.setTargetAtTime(this.muted ? 0 : rain * 0.12, t, 0.5);
    // smooth gusts: slow targets, no per-tick jumps
    const gust = 0.75 + 0.25 * Math.sin(t * 0.23) * Math.sin(t * 0.61 + 1);
    this.windNode.g.gain.setTargetAtTime(this.muted ? 0 : Math.min(1, wind) * 0.09 * gust, t, 1.6);
    this.windNode.f.frequency.setTargetAtTime(260 + Math.min(1, wind) * 260 * gust, t, 2.0);
    if (!this.bedNode) { this.bedNode = mk(); this.bedNode.f.type = 'lowpass'; this.bedNode.f.frequency.value = 260; }
    this.bedNode.g.gain.setTargetAtTime(this.muted ? 0 : (this.battle || 0) * 0.07, t, 1.0);
  },
};

// ---------- save ----------
const Save = {
  data: { unlocked: 1, best: 0, story: false, deck: null, skills: null, diff: 'medium', lang: 'en', music: true },
  load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem('erbil_save') || '{}')); } catch (e) { } },
  save() { try { localStorage.setItem('erbil_save', JSON.stringify(this.data)); } catch (e) { } },
};
Save.load();

// ---------- UI drawing helpers ----------
const FONT = 'Georgia, "Noto Naskh Arabic", "Noto Sans Arabic", "Segoe UI", Tahoma, "Times New Roman", serif';
function text(str, x, y, size, color = '#f3e6c4', align = 'center', bold = true, shadow = true) {
  if (typeof tr === 'function') str = tr(str);
  ctx.direction = typeof LANG !== 'undefined' && LANG.cur === 'ckb' ? 'rtl' : 'ltr';
  ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (shadow) { ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText(str, x + 2, y + 2); }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}
function wrapText(str, x, y, maxW, size, lineH, color, align = 'center') {
  if (typeof tr === 'function') str = tr(str);
  ctx.font = 'bold ' + size + 'px ' + FONT;
  const lines = [];
  for (const para of str.split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    lines.push(line);
  }
  lines.forEach((l, i) => text(l, x, y + i * lineH, size, color, align));
  return lines.length;
}
function panel(x, y, w, h, r = 14, fill = 'rgba(30,20,12,0.82)', stroke = '#b8913f') {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke();
}
function inRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }
function button(r, label, size = 30, active = true) {
  panel(r.x, r.y, r.w, r.h, 12, active ? 'rgba(92,52,24,0.92)' : 'rgba(60,50,40,0.7)', active ? '#e2b85a' : '#776');
  text(label, r.x + r.w / 2, r.y + r.h / 2 + 1, size, active ? '#fbe9bf' : '#aaa');
}
