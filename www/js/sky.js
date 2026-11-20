// ===== Living sky & weather =====
const SKY_KEYS = [
  [0.00, '#060a1c', '#18213e'], [0.19, '#141a3e', '#40365c'], [0.25, '#2f4a8c', '#f09a62'],
  [0.32, '#4682c8', '#d6e4ec'], [0.50, '#3b84d8', '#bfe0f6'], [0.66, '#4a7cc0', '#efd6a2'],
  [0.74, '#2a3878', '#f08446'], [0.81, '#141a46', '#5c3456'], [1.00, '#060a1c', '#18213e'],
];
const GRADE_KEYS = [
  [0.00, [105, 120, 175]], [0.20, [130, 125, 170]], [0.27, [255, 205, 170]], [0.34, [255, 245, 235]],
  [0.50, [255, 255, 255]], [0.66, [255, 238, 210]], [0.74, [255, 170, 120]], [0.80, [150, 130, 180]], [1.0, [105, 120, 175]],
];
const WEATHER_PRESETS = {
  clear: { cloud: 0.12, rain: 0, storm: 0, dust: 0, wind: 0.15 },
  cloudy: { cloud: 0.65, rain: 0, storm: 0, dust: 0, wind: 0.35 },
  rain: { cloud: 0.85, rain: 0.7, storm: 0, dust: 0, wind: 0.4 },
  storm: { cloud: 1, rain: 1, storm: 1, dust: 0, wind: 0.95 },
  dust: { cloud: 0.2, rain: 0, storm: 0, dust: 1, wind: 0.9 },
};
const WEATHER_NEXT = { clear: ['cloudy', 'dust'], cloudy: ['clear', 'rain', 'dust'], rain: ['cloudy', 'storm'], storm: ['rain'], dust: ['clear', 'cloudy'] };

function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mixRGB(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
const rgbStr = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function keyLerp(keys, t, idx) {
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i][0] && t <= keys[i + 1][0]) {
      const k = (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
      const a = typeof keys[i][idx] === 'string' ? hex2rgb(keys[i][idx]) : keys[i][idx];
      const b = typeof keys[i + 1][idx] === 'string' ? hex2rgb(keys[i + 1][idx]) : keys[i + 1][idx];
      return mixRGB(a, b, k);
    }
  }
  return [0, 0, 0];
}

const Sky = {
  time: 0.3, timeSpeed: 1 / 900, weather: 'clear', cur: { ...WEATHER_PRESETS.clear }, tgt: { ...WEATHER_PRESETS.clear },
  windDir: -1, wind: 0, gust: 0, flash: 0, bolt: null, boltT: 0, nextBolt: 5, dynamic: false, nextChange: 60,
  stars: [], clouds: [], drops: [], splashes: [], dustMotes: [], cloudTex: [], lights: [],
  init() {
    this.stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random() * 0.6, s: rand(0.6, 2), p: rand(0, 6) }));
    // procedural cloud textures: light & dark variants
    for (let v = 0; v < 8; v++) {
      const dark = v >= 4;
      const c = document.createElement('canvas'); c.width = 420; c.height = 200;
      const g = c.getContext('2d');
      const n = 22 + (v % 4) * 4;
      for (let i = 0; i < n; i++) {
        const x = 60 + Math.random() * 300, cy = 110 - Math.max(0, 70 - Math.abs(x - 210) * 0.6);
        const y = cy + Math.random() * 40, r = 22 + Math.random() * 34;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const col = dark ? '150,155,168' : '255,255,255';
        gr.addColorStop(0, `rgba(${col},0.55)`); gr.addColorStop(0.5, `rgba(${col},0.35)`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      g.globalCompositeOperation = 'source-atop';
      const sh = g.createLinearGradient(0, 40, 0, 190);
      sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, dark ? 'rgba(50,54,66,0.7)' : 'rgba(165,172,190,0.45)');
      g.fillStyle = sh; g.fillRect(0, 0, 420, 200);
      this.cloudTex.push(c);
    }
    this.clouds = Array.from({ length: 22 }, (_, i) => this._newCloud(Math.random() * 1.4));
  },
  _newCloud(x) { const depth = rand(0.25, 1); return { x, y: rand(30, 330) * (1.2 - depth * 0.4), depth, s: rand(0.6, 1.5) * (0.5 + depth * 0.6), v: (Math.random() * 4) | 0, o: Math.random() }; },
  set(time, weather, dynamic) {
    this.time = time; this.weather = weather; this.dynamic = !!dynamic;
    this.cur = { ...WEATHER_PRESETS[weather] }; this.tgt = { ...WEATHER_PRESETS[weather] };
    this.windDir = Math.random() < 0.6 ? -1 : 1; this.nextChange = rand(45, 80);
    this.drops.length = 0; this.splashes.length = 0;
  },
  changeWeather(w) { this.weather = w; this.tgt = { ...WEATHER_PRESETS[w] }; if (Math.random() < 0.35) this.windDir *= -1; },
  isWet() { return this.cur.rain > 0.3; },
  night() { const t = this.time; const d = Math.min(Math.abs(t - 0), Math.abs(t - 1)); return clamp(1 - (d - 0.17) / 0.1, 0, 1); },
  update(dt, camX) {
    this.time = (this.time + dt * this.timeSpeed) % 1;
    for (const k in this.cur) this.cur[k] = lerp(this.cur[k], this.tgt[k], Math.min(1, dt * 0.15));
    if (this.dynamic) { this.nextChange -= dt; if (this.nextChange < 0) { this.nextChange = rand(50, 90); this.changeWeather(pick(WEATHER_NEXT[this.weather])); } }
    const t = performance.now() / 1000;
    this.gust = Math.sin(t * 0.37) * 0.5 + Math.sin(t * 1.13) * 0.3 + Math.sin(t * 2.9) * 0.2;
    this.wind = this.windDir * this.cur.wind * (0.75 + 0.35 * this.gust);
    // clouds
    for (const c of this.clouds) {
      c.x += (this.wind * 0.02 + this.windDir * 0.003) * c.depth * dt;
      if (c.x > 1.3) c.x = -0.35; if (c.x < -0.35) c.x = 1.3;
    }
    // rain
    const rainAmt = this.cur.rain;
    const want = (rainAmt * 380) | 0;
    const ang = this.wind * 0.55;
    while (this.drops.length < want) this.drops.push({ x: rand(-200, VW + 200), y: rand(-H, 0), v: rand(900, 1300), l: rand(14, 26) });
    if (this.drops.length > want) this.drops.length = want;
    for (const d of this.drops) {
      d.y += d.v * dt; d.x += d.v * ang * dt;
      const gy = GROUND + rand(-10, 120);
      if (d.y > gy) {
        if (this.splashes.length < 160 && Math.random() < 0.5) this.splashes.push({ x: d.x, y: gy, t: 0 });
        d.y = rand(-120, -10); d.x = rand(-200, VW + 200);
      }
    }
    for (let i = this.splashes.length - 1; i >= 0; i--) { const s = this.splashes[i]; s.t += dt; if (s.t > 0.25) this.splashes.splice(i, 1); }
    // dust motes
    const wantD = (this.cur.dust * 160) | 0;
    while (this.dustMotes.length < wantD) this.dustMotes.push({ x: rand(0, VW), y: rand(150, H), v: rand(0.6, 1.4), s: rand(1, 3), big: Math.random() < 0.08 });
    if (this.dustMotes.length > wantD) this.dustMotes.length = wantD;
    for (const m of this.dustMotes) {
      m.x += this.wind * 700 * m.v * dt; m.y += Math.sin(t * 2 + m.x * 0.01) * 20 * dt;
      if (m.x < -200) m.x = VW + 150; if (m.x > VW + 200) m.x = -150;
    }
    // lightning
    this.flash = Math.max(0, this.flash - dt * 2.5); this.boltT -= dt;
    if (this.cur.storm > 0.5) {
      this.nextBolt -= dt;
      if (this.nextBolt < 0) {
        this.nextBolt = rand(4, 11);
        const x0 = rand(100, VW - 100); const pts = [[x0, 0]]; let x = x0, y = 0;
        while (y < 520) { y += rand(30, 70); x += rand(-60, 60); pts.push([x, y]); }
        this.bolt = pts; this.boltT = 0.25; this.flash = 1;
        setTimeout(() => Audio2.play('thunder', 0.8), rand(200, 1400));
      }
    }
    this.ambT = (this.ambT || 0) - dt;
    if (this.ambT <= 0) { this.ambT = 0.3; Audio2.ambience(this.cur.rain, Math.abs(this.wind)); }
  },
  skyColors() {
    let top = keyLerp(SKY_KEYS, this.time, 1), bot = keyLerp(SKY_KEYS, this.time, 2);
    const n = this.night();
    const gray = this.cur.cloud * 0.55 + this.cur.storm * 0.35;
    top = mixRGB(top, n > 0.5 ? [20, 22, 30] : [100, 108, 120], gray * 0.8);
    bot = mixRGB(bot, n > 0.5 ? [36, 38, 48] : [150, 155, 162], gray * 0.8);
    top = mixRGB(top, [150, 112, 70], this.cur.dust * 0.6); bot = mixRGB(bot, [215, 170, 110], this.cur.dust * 0.7);
    return [top, bot];
  },
  drawBack(camX) {
    const [top, bot] = this.skyColors();
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, rgbStr(top)); g.addColorStop(1, rgbStr(bot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, H);
    const n = this.night(), t = performance.now() / 1000;
    // stars
    const starA = n * (1 - this.cur.cloud * 0.9) * (1 - this.cur.dust);
    if (starA > 0.02) {
      ctx.fillStyle = '#fff';
      for (const s of this.stars) {
        ctx.globalAlpha = starA * (0.55 + 0.45 * Math.sin(t * 2 + s.p));
        ctx.fillRect(((s.x * VW - camX * 0.02) % VW + VW) % VW, s.y * H, s.s, s.s);
      }
      ctx.globalAlpha = 1;
    }
    // sun rises in the east (right, behind the Mongol camp) and sets in the west (left, behind Erbil)
    const sunP = (this.time - 0.23) / 0.54; this.sunPos = null;
    if (sunP > -0.05 && sunP < 1.05) {
      const sx = lerp(VW * 1.02, -VW * 0.02, sunP), sy = GROUND - 40 - Math.sin(Math.PI * clamp(sunP, 0, 1)) * 520;
      const hide = 1 - this.cur.cloud * 0.6 - this.cur.storm * 0.4 - this.cur.dust * 0.3;
      const low = 1 - Math.sin(Math.PI * clamp(sunP, 0, 1));
      this.sunPos = [sx, sy, Math.max(0, hide)];
      const col = mixRGB([255, 250, 225], [255, 140, 60], low);
      const gr = ctx.createRadialGradient(sx, sy, 10, sx, sy, 260);
      gr.addColorStop(0, rgbStr(col, 0.55 * hide)); gr.addColorStop(1, rgbStr(col, 0));
      ctx.fillStyle = gr; ctx.fillRect(sx - 260, sy - 260, 520, 520);
      ctx.fillStyle = rgbStr(col, clamp(hide + 0.2, 0, 1)); ctx.beginPath(); ctx.arc(sx, sy, 34, 0, 7); ctx.fill();
    }
    const moonP = ((this.time + 0.5) % 1 - 0.23) / 0.54;
    if (moonP > -0.05 && moonP < 1.05) {
      const mx = lerp(VW * 1.02, -VW * 0.02, moonP), my = GROUND - 60 - Math.sin(Math.PI * clamp(moonP, 0, 1)) * 480;
      const a = clamp(n * 1.3, 0, 1) * (1 - this.cur.cloud * 0.7);
      const gr = ctx.createRadialGradient(mx, my, 5, mx, my, 140);
      gr.addColorStop(0, `rgba(200,215,255,${0.35 * a})`); gr.addColorStop(1, 'rgba(200,215,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(mx - 140, my - 140, 280, 280);
      ctx.fillStyle = `rgba(235,238,250,${a})`; ctx.beginPath(); ctx.arc(mx, my, 24, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(190,195,215,${a * 0.6})`; ctx.beginPath(); ctx.arc(mx - 7, my - 5, 6, 0, 7); ctx.arc(mx + 8, my + 6, 4, 0, 7); ctx.fill();
    }
    // lightning bolt (behind clouds front layer)
    if (this.boltT > 0 && this.bolt) {
      ctx.strokeStyle = `rgba(230,235,255,${this.boltT * 4})`; ctx.lineWidth = 3; ctx.beginPath();
      this.bolt.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    }
    this.drawClouds(camX, false);
  },
  drawClouds(camX, front) {
    const cover = this.cur.cloud, storm = this.cur.storm;
    const count = Math.round(4 + cover * 18);
    for (let i = 0; i < count && i < this.clouds.length; i++) {
      const c = this.clouds[i];
      if ((c.depth > 0.8) !== front) continue;
      const tex = this.cloudTex[c.v + (storm > 0.4 || (cover > 0.8 && i % 2) ? 4 : 0)];
      const w = 420 * c.s * (1 + cover * 0.6), h = 200 * c.s * (1 + cover * 0.4);
      const x = c.x * (VW + 500) - 250 - camX * 0.05 * c.depth;
      ctx.globalAlpha = clamp(0.35 + cover * 0.6, 0, 0.95) * (0.6 + c.depth * 0.4);
      ctx.drawImage(tex, x - w / 2, c.y - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
  },
  // weather that sits in front of the world, plus color grading and night lighting
  drawFront(camX) {
    this.drawClouds(camX, true);
    // rain streaks
    if (this.drops.length) {
      const ang = this.wind * 0.55;
      ctx.strokeStyle = this.night() > 0.5 ? 'rgba(170,185,220,0.35)' : 'rgba(200,210,230,0.45)'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (const d of this.drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - ang * d.l, d.y - d.l); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(210,220,240,0.5)'; ctx.beginPath();
      for (const s of this.splashes) { const r = 2 + s.t * 30; ctx.moveTo(s.x - r, s.y); ctx.quadraticCurveTo(s.x, s.y - r * 0.8, s.x + r, s.y); }
      ctx.stroke();
    }
    // dust storm
    if (this.cur.dust > 0.02) {
      const d = this.cur.dust;
      ctx.fillStyle = `rgba(190,145,85,${0.32 * d})`; ctx.fillRect(0, 0, VW, H);
      for (const m of this.dustMotes) {
        if (m.big) { if (!this.haze) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(170,125,70,0.9)'); gr.addColorStop(1, 'rgba(170,125,70,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); this.haze = c; } const s = 220 * m.s; ctx.globalAlpha = 0.35 * d; ctx.drawImage(this.haze, m.x - s / 2, m.y - s / 2, s, s * 0.6); ctx.globalAlpha = 1; }
        else { ctx.fillStyle = `rgba(120,85,45,${0.5 * d})`; ctx.fillRect(m.x, m.y, m.s * 6, m.s * 0.8); }
      }
    }
    // ground mist at dawn / in rain
    const mist = Math.max(clamp(1 - Math.abs(this.time - 0.27) / 0.06, 0, 1) * 0.5, this.cur.rain * 0.3);
    if (mist > 0.01) {
      const g = ctx.createLinearGradient(0, GROUND - 160, 0, GROUND + 40);
      g.addColorStop(0, 'rgba(225,228,235,0)'); g.addColorStop(1, `rgba(225,228,235,${mist * 0.5})`);
      ctx.fillStyle = g; ctx.fillRect(0, GROUND - 160, VW, 200);
    }
    // color grade
    let grade = keyLerp(GRADE_KEYS, this.time, 1);
    grade = mixRGB(grade, [150, 158, 175], this.cur.storm * 0.5 + this.cur.cloud * 0.15);
    grade = mixRGB(grade, [235, 200, 150], this.cur.dust * 0.5);
    if (grade[0] + grade[1] + grade[2] < 760) {
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgbStr(grade); ctx.fillRect(0, 0, VW, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    // night darkness with light holes
    const dark = this.night() * 0.42 + this.cur.storm * 0.12;
    if (dark > 0.02) this.drawDarkness(dark, camX);
    // fire glows
    ctx.globalCompositeOperation = 'lighter';
    for (const L of this.lights) {
      const x = L.x - camX; if (x < -L.r || x > VW + L.r) continue;
      blob(GLOW, x, L.y, L.r * 0.55, Math.min(0.6, L.i * (0.15 + dark * 0.6)) * (FX.ok && FX.enabled ? 0.6 : 1));
    }
    ctx.globalCompositeOperation = 'source-over';
    if (this.flash > 0) { ctx.fillStyle = `rgba(235,240,255,${this.flash * 0.45})`; ctx.fillRect(0, 0, VW, H); }
  },
  drawDarkness(dark, camX) {
    if (!this.darkCv) { this.darkCv = document.createElement('canvas'); this.dctx = this.darkCv.getContext('2d'); }
    const sc = 0.25, w = Math.ceil(VW * sc), h = Math.ceil(H * sc);
    if (this.darkCv.width !== w) { this.darkCv.width = w; this.darkCv.height = h; }
    const d = this.dctx;
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, w, h);
    d.fillStyle = `rgba(8,12,34,${dark})`; d.fillRect(0, 0, w, h);
    d.globalCompositeOperation = 'destination-out';
    for (const L of this.lights) {
      const x = (L.x - camX) * sc, y = L.y * sc, r = L.r * sc;
      if (x < -r || x > w + r) continue;
      d.globalAlpha = clamp(L.i, 0, 1); d.drawImage(HOLE, x - r, y - r, r * 2, r * 2); d.globalAlpha = 1;
    }
    ctx.drawImage(this.darkCv, 0, 0, VW, H);
  },
};
