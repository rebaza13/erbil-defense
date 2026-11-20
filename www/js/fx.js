// ===== FX: WebGL post-processing over the 2D canvas =====
// The game draws into the 2D canvas as before; each frame that image is uploaded to WebGL and run through:
//   bright-pass -> separable blur (quarter res) = BLOOM,
//   heat-haze distortion above fires, shockwave ripples from explosions, chromatic split on heavy hits,
//   time-of-day / weather color grade, god-ray glow from the sun, lightning flash, vignette, film grain.
// If WebGL is missing the plain 2D canvas is shown, so the game always works.
const FX = {
  ok: false, enabled: true, heat: [], shocks: [], gl: null,
  init() {
    try {
      const c = document.createElement('canvas'); c.id = 'fx';
      c.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;display:block';
      const gl = c.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
      if (!gl) return;
      document.body.insertBefore(c, document.getElementById('rotate'));
      this.c = c; this.gl = gl;
      const vs = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }';
      this.pBright = this.prog(vs, `precision mediump float; varying vec2 uv; uniform sampler2D t; uniform float th;
        void main(){ vec3 c = texture2D(t, uv).rgb; float l = max(c.r, max(c.g, c.b));
          float w = smoothstep(th, th + 0.25, l); gl_FragColor = vec4(c * w * 0.6, 1.); }`);
      this.pBlur = this.prog(vs, `precision mediump float; varying vec2 uv; uniform sampler2D t; uniform vec2 d;
        void main(){ vec3 s = texture2D(t, uv).rgb * 0.227;
          s += (texture2D(t, uv + d * 1.385).rgb + texture2D(t, uv - d * 1.385).rgb) * 0.316;
          s += (texture2D(t, uv + d * 3.231).rgb + texture2D(t, uv - d * 3.231).rgb) * 0.070;
          gl_FragColor = vec4(s, 1.); }`);
      this.pFinal = this.prog(vs, `precision mediump float; varying vec2 uv;
        uniform sampler2D t; uniform sampler2D bl; uniform vec2 res; uniform float time, shake, flash, night, wet, dust, storm, bloomK, hitK, danger, slow;
        uniform vec3 heat[8]; uniform vec4 shock[4]; uniform vec3 sun; uniform vec3 tint;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 q = uv; float asp = res.x / res.y;
          // heat haze: wobble pixels above fires
          for (int i = 0; i < 8; i++) { vec3 h = heat[i]; if (h.z <= 0.) continue;
            vec2 dd = (q - h.xy) * vec2(asp, 1.); float above = clamp((q.y - h.y) * 6. + 0.3, 0., 1.);
            float f = h.z * exp(-dot(dd, dd) * 110.) * above;
            q.x += sin(q.y * 140. - time * 9. + h.x * 30.) * 0.0016 * f; q.y += cos(q.x * 120. + time * 7.) * 0.0008 * f; }
          // shockwave rings from explosions
          for (int i = 0; i < 4; i++) { vec4 s = shock[i]; if (s.w <= 0.) continue;
            vec2 dd = (q - s.xy) * vec2(asp, 1.); float r = length(dd); float ring = s.w * exp(-pow((r - s.z) * 28., 2.));
            q -= normalize(dd + 1e-5) / vec2(asp, 1.) * ring * 0.02; }
          // rain running down the lens
          if (wet > 0.3) { vec2 cell = floor(vec2(q.x * 26., q.y * 9. + time * 0.6 * (0.5 + hash(floor(vec2(q.x * 26., 0.)))))); float h = hash(cell);
            if (h > 0.93) { vec2 f = fract(vec2(q.x * 26., q.y * 9. + time * 0.6 * (0.5 + hash(floor(vec2(q.x * 26., 0.)))))) - 0.5;
              float dr = smoothstep(0.25, 0.0, length(f * vec2(1., 1.8))); q += f * dr * 0.012 * (wet - 0.3); } }
          // chromatic split on heavy impacts
          float ca = 0.00035 * min(shake, 10.) + 0.0025 * hitK;
          vec3 col = vec3(texture2D(t, q + vec2(ca, 0.)).r, texture2D(t, q).g, texture2D(t, q - vec2(ca, 0.)).b);
          // bloom
          vec3 b = texture2D(bl, q).rgb;
          col += b * bloomK;
          // sun glow / god rays (radial falloff from the sun position)
          if (sun.z > 0.) { vec2 sd = (q - sun.xy) * vec2(asp, 1.); float g = exp(-length(sd) * 2.4) * sun.z;
            float rays = 0.75 + 0.25 * sin(atan(sd.y, sd.x) * 18. + time * 0.3); col += vec3(1., 0.78, 0.45) * g * rays * 0.2; }
          // grade: warm day, cool night, grey wet, ochre dust
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(col, vec3(lum), 0.25 * wet + 0.15 * storm);
          col *= tint;
          col = mix(col, col * vec3(1.08, 0.95, 0.75), dust * 0.45);
          col = mix(col, col * vec3(0.85, 0.92, 1.12), night * 0.35); col *= 1. + night * 0.12;
          // gentle S-curve contrast
          col = clamp(col, 0., 1.); col = col * col * (3. - 2. * col) * 0.35 + col * 0.65;
          // lightning
          col += vec3(0.75, 0.8, 1.) * flash * 0.35;
          // slow motion: drained colour, warm highlight
          if (slow > 0.) { float l2 = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(col, vec3(l2) * vec3(1.15, 1.0, 0.8), slow * 0.55); }
          // citadel in danger: red pulse at the edges
          vec2 vv = uv - 0.5; float edge = smoothstep(0.18, 0.5, dot(vv, vv) * 1.6);
          col = mix(col, vec3(0.75, 0.05, 0.02), edge * danger * (0.25 + 0.15 * sin(time * 5.)));
          // vignette + film grain
          vec2 v = uv - 0.5; col *= 1. - dot(v, v) * (0.5 + night * 0.25);
          col += (hash(uv * res + time * 60.) - 0.5) * 0.035;
          gl_FragColor = vec4(col, 1.); }`);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      this.src = this.tex(); this.ok = true;
      this.resize();
      addEventListener('resize', () => this.resize());
      c.addEventListener('webglcontextlost', e => { e.preventDefault(); this.ok = false; cv.style.opacity = 1; });
      cv.style.opacity = 0; // the 2D canvas still receives input, the GL canvas shows the picture
    } catch (e) { console.warn('FX disabled', e); this.ok = false; }
  },
  prog(vs, fs) {
    const gl = this.gl, p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i), nm = a.name.replace('[0]', ''); p.u[nm] = gl.getUniformLocation(p, a.name); }
    return p;
  },
  tex() {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  },
  target(w, h) {
    const gl = this.gl, t = this.tex();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { t, f, w, h };
  },
  resize() {
    if (!this.gl) return;
    this.c.width = cv.width; this.c.height = cv.height;
    this.c.style.width = cv.style.width; this.c.style.height = cv.style.height;
    const w = Math.max(16, cv.width >> 2), h = Math.max(16, cv.height >> 2);
    this.A = this.target(w, h); this.Bt = this.target(w, h);
  },
  // world-space helpers called by the game
  shock(wx, y, strength = 1) { if (this.shocks.length < 4) this.shocks.push({ x: wx, y, r: 0, s: strength, t: 0 }); },
  update(dt) { for (let i = this.shocks.length - 1; i >= 0; i--) { const s = this.shocks[i]; s.t += dt; if (s.t > 0.7) this.shocks.splice(i, 1); } },
  draw(info) {
    if (!this.ok || !this.enabled) { if (this.c && this.c.style.display !== 'none') { this.c.style.display = 'none'; cv.style.opacity = 1; } return false; }
    if (this.c.style.display === 'none') { this.c.style.display = 'block'; cv.style.opacity = 0; }
    const gl = this.gl, time = performance.now() / 1000;
    if (this.c.width !== cv.width) this.resize();
    gl.disable(gl.BLEND); gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null); // re-bind quad
    if (!this.quad) { this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // upload the 2D frame (canvas pixels are flipped relative to GL)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    // bright pass -> A
    const A = this.A, Bt = this.Bt;
    gl.bindFramebuffer(gl.FRAMEBUFFER, A.f); gl.viewport(0, 0, A.w, A.h);
    gl.useProgram(this.pBright); gl.uniform1i(this.pBright.u.t, 0); gl.uniform1f(this.pBright.u.th, info.night > 0.5 ? 0.7 : 0.8);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // blur A -> B (h), B -> A (v), twice for a wide glow
    gl.useProgram(this.pBlur); gl.uniform1i(this.pBlur.u.t, 0);
    for (let k = 0; k < 2; k++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, Bt.f); gl.bindTexture(gl.TEXTURE_2D, A.t); gl.uniform2f(this.pBlur.u.d, (1 + k) / A.w, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.f); gl.bindTexture(gl.TEXTURE_2D, Bt.t); gl.uniform2f(this.pBlur.u.d, 0, (1 + k) / A.h); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // final composite to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.c.width, this.c.height);
    const P = this.pFinal, u = P.u; gl.useProgram(P);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.src); gl.uniform1i(u.t, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, A.t); gl.uniform1i(u.bl, 1);
    gl.uniform2f(u.res, this.c.width, this.c.height); gl.uniform1f(u.time, time);
    gl.uniform1f(u.shake, info.shake || 0); gl.uniform1f(u.flash, info.flash || 0); gl.uniform1f(u.night, info.night || 0);
    gl.uniform1f(u.wet, info.wet || 0); gl.uniform1f(u.dust, info.dust || 0); gl.uniform1f(u.storm, info.storm || 0);
    gl.uniform1f(u.bloomK, info.bloom == null ? 0.9 : info.bloom); gl.uniform1f(u.hitK, info.hit || 0);
    gl.uniform1f(u.danger, info.danger || 0); gl.uniform1f(u.slow, info.slow || 0);
    gl.uniform3fv(u.tint, info.tint || [1, 1, 1]);
    gl.uniform3fv(u.sun, info.sun || [0, 0, 0]);
    const hv = new Float32Array(24), heat = info.heat || [];
    for (let i = 0; i < Math.min(8, heat.length); i++) { hv[i * 3] = heat[i][0]; hv[i * 3 + 1] = heat[i][1]; hv[i * 3 + 2] = heat[i][2]; }
    gl.uniform3fv(u.heat, hv);
    const sv = new Float32Array(16), sh = info.shocks || [];
    for (let i = 0; i < Math.min(4, sh.length); i++) { sv[i * 4] = sh[i][0]; sv[i * 4 + 1] = sh[i][1]; sv[i * 4 + 2] = sh[i][2]; sv[i * 4 + 3] = sh[i][3]; }
    gl.uniform4fv(u.shock, sv);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.activeTexture(gl.TEXTURE0);
    return true;
  },
};
