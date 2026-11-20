// ===== Music: an original, generative Kurdish-style score (no samples, no beeps) =====
// Instruments are physically modelled: a plucked tembûr (Karplus-Strong string), a daf frame drum
// (felt thump + skin slap + jingles) and a soft bowed drone. Melodies walk a maqam with repeated
// motifs and tembûr-style tremolo; menus use maqam Kurd (calm), battles use Hijaz (tense) and speed up
// in the LAST STAND.
const Music = {
  on: true, started: false, gain: null, nextT: 0, step: 0, bar: 0, mode: 'menu', bufs: {}, motif: null, timer: null,
  SCALES: {
    kurd:  [0, 1, 3, 5, 7, 8, 10],   // D Eb F G A Bb C
    hijaz: [0, 1, 4, 5, 7, 8, 10],   // D Eb F# G A Bb C
  },
  ROOT: 146.83, // D3
  start() {
    const ac = Audio2.ac; if (!ac || this.started) return;
    this.started = true;
    this.gain = ac.createGain(); this.gain.gain.value = this.on && !Audio2.muted ? 0.5 : 0; this.gain.connect(Audio2.master);
    // gentle room reverb so the strings breathe
    const conv = ac.createConvolver(), len = ac.sampleRate * 1.8, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    conv.buffer = ir; this.wet = ac.createGain(); this.wet.gain.value = 0.28; conv.connect(this.wet); this.wet.connect(this.gain);
    this.bus = ac.createGain(); this.bus.connect(this.gain); this.bus.connect(conv);
    // drone: two soft detuned saws through a low filter, breathing slowly
    this.drone = [];
    for (const [f, det] of [[this.ROOT / 2, -4], [this.ROOT * 0.75, 3]]) {
      const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; fl.type = 'lowpass'; fl.frequency.value = 380; g.gain.value = 0.022;
      o.connect(fl); fl.connect(g); g.connect(this.bus); o.start(); this.drone.push({ o, fl, g });
    }
    this.nextT = ac.currentTime + 0.2;
    this.timer = setInterval(() => this.schedule(), 90);
  },
  setOn(v) { this.on = v; if (this.gain) this.gain.gain.setTargetAtTime(v && !Audio2.muted ? 0.5 : 0, Audio2.ac.currentTime, 0.3); },
  freq(deg) { // scale degree (can be negative / >7) to Hz
    const sc = this.SCALES[this.mode === 'menu' ? 'kurd' : 'hijaz'], o = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7;
    return this.ROOT * Math.pow(2, o + sc[i] / 12);
  },
  // Karplus-Strong plucked string, cached per pitch
  pluckBuf(f) {
    const key = f.toFixed(1); if (this.bufs[key]) return this.bufs[key];
    const ac = Audio2.ac, sr = ac.sampleRate, len = Math.floor(sr * 1.6), N = Math.max(2, Math.round(sr / f));
    const buf = ac.createBuffer(1, len, sr), out = buf.getChannelData(0), ring = new Float32Array(N);
    let prev = 0; for (let i = 0; i < N; i++) { const r = Math.random() * 2 - 1; prev = prev * 0.5 + r * 0.5; ring[i] = prev; } // slightly dark pick
    for (let i = 0; i < len; i++) { const j = i % N, k = (i + 1) % N; out[i] = ring[j]; ring[j] = 0.4985 * (ring[j] + ring[k]); }
    return (this.bufs[key] = buf);
  },
  pluck(t, deg, vol) {
    const ac = Audio2.ac, s = ac.createBufferSource(), g = ac.createGain(), bp = ac.createBiquadFilter();
    s.buffer = this.pluckBuf(this.freq(deg)); bp.type = 'peaking'; bp.frequency.value = 900; bp.gain.value = 5; bp.Q.value = 1.2; // wooden body
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.5);
    s.connect(bp); bp.connect(g); g.connect(this.bus); s.start(t); s.stop(t + 1.6);
  },
  daf(t, kind, vol) {
    const ac = Audio2.ac;
    if (kind === 'dum') { // deep center stroke
      const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.25);
      g.gain.setValueAtTime(vol * 0.55, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.35); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.4);
    }
    // skin slap / edge "tek" + ring jingles
    const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g2 = ac.createGain();
    n.buffer = Audio2.noiseBuf; f.type = 'bandpass'; f.frequency.value = kind === 'dum' ? 700 : 2600; f.Q.value = kind === 'dum' ? 1 : 2.2;
    g2.gain.setValueAtTime(vol * (kind === 'dum' ? 0.18 : 0.16), t); g2.gain.exponentialRampToValueAtTime(0.0005, t + (kind === 'dum' ? 0.12 : 0.07));
    n.connect(f); f.connect(g2); g2.connect(this.bus); n.start(t, Math.random()); n.stop(t + 0.15);
    const j = ac.createBufferSource(), jf = ac.createBiquadFilter(), jg = ac.createGain();
    j.buffer = Audio2.noiseBuf; jf.type = 'highpass'; jf.frequency.value = 7000; jg.gain.setValueAtTime(vol * 0.05, t); jg.gain.exponentialRampToValueAtTime(0.0005, t + 0.18);
    j.connect(jf); jf.connect(jg); jg.connect(this.bus); j.start(t, Math.random()); j.stop(t + 0.2);
  },
  newMotif() { // a 2-bar phrase: random walk on the maqam, resolving to the root or fifth
    const m = []; let d = pick([0, 2, 4, 7]);
    for (let i = 0; i < 16; i++) {
      const play = i % 2 === 0 ? Math.random() < 0.85 : Math.random() < (this.mode === 'menu' ? 0.2 : 0.45);
      if (play) { d += pick([-2, -1, -1, 1, 1, 2, 0]); d = clamp(d, -3, 10); m.push(d); } else m.push(null);
    }
    m[14] = pick([0, 4, 7]); m[15] = null;
    return m;
  },
  schedule() {
    const ac = Audio2.ac; if (!ac || !this.on || Audio2.muted) { if (ac) this.nextT = ac.currentTime + 0.1; return; }
    const want = typeof state !== 'undefined' && (state === 'battle' || state === 'result') ? 'battle' : 'menu';
    if (want !== this.mode) { this.mode = want; this.motif = null; this.step = 0; }
    const last = typeof B !== 'undefined' && this.mode === 'battle' && (B.lastStand || B.bossAlive);
    const bpm = this.mode === 'menu' ? 74 : last ? 122 : 104, stepDur = 60 / bpm / 2; // eighth notes
    while (this.nextT < ac.currentTime + 0.35) {
      const t = this.nextT, s = this.step % 16;
      if (!this.motif || s === 0 && this.step % 64 === 0) this.motif = this.newMotif();
      // daf: Kurdish 2/4 dance groove (dum . tek tek | dum tek . tek); sparse in menus
      const pat = this.mode === 'menu' ? ['dum', 0, 0, 0, 0, 0, 'tek', 0] : ['dum', 0, 'tek', 'tek', 'dum', 'tek', 0, 'tek'];
      const k = pat[s % 8]; if (k) this.daf(t, k, this.mode === 'menu' ? 0.5 : last ? 0.95 : 0.8);
      // melody with variation: every 4th phrase transposed up a third for lift
      const lift = Math.floor(this.step / 32) % 4 === 3 ? 2 : 0;
      const deg = this.motif[s];
      if (deg != null) {
        this.pluck(t, deg + lift, this.mode === 'menu' ? 0.32 : 0.36);
        if (this.motif[(s + 1) % 16] == null && Math.random() < 0.6) { // tembûr tremolo on held notes
          for (let r = 1; r < 4; r++) this.pluck(t + r * stepDur / 4, deg + lift, 0.13);
        }
      }
      // drone follows the root, slowly breathing
      if (s === 0) for (const dn of this.drone) dn.fl.frequency.setTargetAtTime(this.mode === 'menu' ? 320 : last ? 650 : 480, t, 1.5);
      this.nextT += stepDur; this.step++;
    }
  },
};
