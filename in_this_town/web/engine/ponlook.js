// The Ponlai finish: the cinematic stylised-realism post chain of Ponlai (HuberyLL/ponlai, MIT; checkout D:\Claude\ext\ponlai,
// skill skills/building-cinematic-stylised-realism, look-parameters.md), ported to this renderer's WebGL pipeline.
// It sits on top of the pro look (engine/look.js) and keeps Ponlai's layer order: atmosphere (height fog), exposure,
// local tone mapping, shadow contrast, tone curve (the pro look's Neutral), then the colour grade (a 32^3 lookup table).
//
//   const pl = installPonlai(ctx, { key: 0.2, strength: 0.55, fog: { colour, density, top, falloff }, lut: { ... } });
//   pl.set({ ... })   // any field, per shot or per palette
//
// Every frame is still a pure function of t: the meter reads the frame being rendered (no adaptation over time, which would
// differ between parallel render workers); `strength` < 1 only partly corrects toward the key, so a frame never pumps.
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { LUTPass } from 'three/addons/postprocessing/LUTPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const PONLAI = {
  key: 0.18, strength: 0.5, maxEV: 0.7, highlight: 4.0,                      // exposure: key value, partial correction, clamp, meter's highlight limit
  localTone: { hinge: 0.18, high: 0.28, low: 0.18, width: 90 },               // large regions drawn toward each other, texture contrast kept
  shadowContrast: { pivot: 0.06, slope: 0.12 },                               // below the pivot, each stop darker loses a further fraction of a stop
};

// ---- atmosphere: exponential height fog, patched into every material's fog chunk (density falls with height) ----
export function heightFog(scene, { colour = '#cfe3d6', density = 0.012, top = 4, falloff = 0.08, far = 600 } = {}) {
  const U = { hfColour: { value: new THREE.Color(colour) }, hfDensity: { value: density }, hfTop: { value: top }, hfFalloff: { value: falloff } };
  THREE.ShaderChunk.fog_pars_vertex = '#ifdef USE_FOG\n varying float vFogDepth; varying vec3 vFogWorld;\n#endif';
  THREE.ShaderChunk.fog_vertex = `#ifdef USE_FOG
    vFogDepth = - mvPosition.z;
    vec4 fogWP = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      fogWP = instanceMatrix * fogWP;
    #endif
    vFogWorld = (modelMatrix * fogWP).xyz;
  #endif`;
  THREE.ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
    uniform vec3 fogColor; varying float vFogDepth; varying vec3 vFogWorld;
    uniform float fogNear; uniform float fogFar;
    uniform vec3 hfColour; uniform float hfDensity, hfTop, hfFalloff;
  #endif`;
  // distance fog (the palette's) plus height fog integrated along the view ray: Ponlai's haze layer, simplified
  THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    vec3 ro = cameraPosition; float len = length(vFogWorld - ro);
    float y0 = ro.y, y1 = vFogWorld.y, ym = 0.5 * (y0 + y1);
    float d0 = exp(-max(y0 - hfTop, 0.0) * hfFalloff), d1 = exp(-max(y1 - hfTop, 0.0) * hfFalloff), dm = exp(-max(ym - hfTop, 0.0) * hfFalloff);
    float hf = 1.0 - exp(-hfDensity * len * (d0 + 4.0 * dm + d1) / 6.0);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, hfColour, clamp(hf, 0.0, 1.0));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
  #endif`;
  // the uniforms travel with every material that has fog
  const add = (sh) => { Object.assign(sh.uniforms, U); };
  scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach((m) => hook(m, add)); });
  return { U, hookAll: () => scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach((m) => hook(m, add)); }), far };
}
function hook(m, add) {
  if (m.userData.__hf || m.isShaderMaterial && !m.fog) return;
  m.userData.__hf = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) { if (prev) prev.call(this, sh, r); add(sh); };
  m.customProgramCacheKey = ((pk) => () => (pk ? pk.call(m) : '') + '|hf')(m.customProgramCacheKey);
  m.needsUpdate = true;
}

// ---- the HDR pass: exposure, local tone mapping, shadow contrast (linear light, before the tone curve) ----
const HDRShader = {
  uniforms: { tDiffuse: { value: null }, px: { value: new THREE.Vector2() }, ev: { value: 1 }, hinge: { value: 0.18 }, high: { value: 0.3 },
    low: { value: 0.2 }, width: { value: 90 }, pivot: { value: 0.06 }, slope: { value: 0.12 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform vec2 px; uniform float ev, hinge, high, low, width, pivot, slope;
    float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
    void main(){
      vec4 s = texture2D(tDiffuse, vUv); vec3 c = s.rgb * ev; float L = max(luma(c), 1e-5);
      // the large-scale base: log luminance averaged over two rings (a cheap stand-in for Ponlai's blurred pyramid)
      float b = 0.0, w = 0.0;
      for (int i = 0; i < 16; i++) { float a = float(i) * 0.3927; float r = (i % 2 == 0) ? width : width * 0.5;
        vec2 o = px * r * vec2(cos(a), sin(a)); float l = max(luma(texture2D(tDiffuse, vUv + o).rgb * ev), 1e-5); b += log2(l); w += 1.0; }
      b = b / w * 0.75 + log2(L) * 0.25;
      float h = log2(hinge);
      // the base moves toward the hinge: highlights by 'high', shadows by 'low' (in stops); the detail (L / base) stays
      float nb = b > h ? b - (b - h) * high : b + (h - b) * low;
      float g = exp2(nb - b);
      // shadow contrast: under the pivot, each stop darker darkens by 'slope' of a stop more
      float lp = log2(L * g), pv = log2(pivot);
      if (lp < pv) g *= exp2(-(pv - lp) * slope);
      gl_FragColor = vec4(c * g, s.a);
    }`,
};

// the meter: log-average of the frame's luminance on a small grid, centre-weighted, each sample capped at the highlight limit
const MeterShader = {
  uniforms: { t: { value: null } },
  vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `varying vec2 v; uniform sampler2D t;
    void main(){ vec3 a = vec3(0.0);
      for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) a += texture2D(t, v + (vec2(float(i), float(j)) - 1.5) / vec2(64.0, 112.0)).rgb;
      gl_FragColor = vec4(a / 16.0, 1.0); }`,
};

// ---- the grade: a 32^3 table built in code (white balance, zone tints and saturation, hue bands, a lightness S-curve) ----
export function buildLut({ white = [1, 1, 1], shadows = { tint: [0, 0, 0], sat: 1 }, mids = { tint: [0, 0, 0], sat: 1 }, highs = { tint: [0, 0, 0], sat: 1 },
  contrast = 0.0, bands = [] } = {}, N = 32) {
  const data = new Uint8Array(N * N * N * 4);
  const c = new THREE.Color(), hsl = {};
  for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) {
    let R = r / (N - 1), G = g / (N - 1), B = b / (N - 1);
    R *= white[0]; G *= white[1]; B *= white[2];
    let L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    const ws = Math.max(0, 1 - L / 0.45) ** 2, wh = Math.max(0, (L - 0.55) / 0.45) ** 2, wm = Math.max(0, 1 - ws - wh);
    const sat = shadows.sat * ws + mids.sat * wm + highs.sat * wh;
    R = L + (R - L) * sat; G = L + (G - L) * sat; B = L + (B - L) * sat;
    const tint = [0, 1, 2].map((k) => shadows.tint[k] * ws + mids.tint[k] * wm + highs.tint[k] * wh);
    R += tint[0]; G += tint[1]; B += tint[2];
    // hue bands: scale chroma, rotate hue, brighten, for one hue range (degrees, soft edges)
    if (bands.length) {
      c.setRGB(Math.min(1, Math.max(0, R)), Math.min(1, Math.max(0, G)), Math.min(1, Math.max(0, B)), THREE.SRGBColorSpace);
      c.getHSL(hsl, THREE.SRGBColorSpace);
      let { h, s, l } = hsl; const hd = h * 360;
      for (const bd of bands) {
        let d = Math.abs(((hd - bd.hue + 540) % 360) - 180); const k = Math.max(0, 1 - d / bd.width) * Math.min(1, s * 4);
        if (k <= 0) continue;
        s *= 1 + (bd.chroma ?? 0) * k; h = (h + (bd.rotate ?? 0) * k / 360 + 1) % 1; l += (bd.bright ?? 0) * k * (1 - l);
      }
      c.setHSL(h, Math.min(1, s), Math.min(1, Math.max(0, l)), THREE.SRGBColorSpace);
      const o = c.getRGB({}, THREE.SRGBColorSpace); R = o.r; G = o.g; B = o.b;
    }
    // a gentle S on lightness around 0.45
    if (contrast) { L = 0.2126 * R + 0.7152 * G + 0.0722 * B; const nl = L + contrast * (L - 0.45) * (1 - Math.abs(L - 0.45) * 2) * 2; const k = L > 1e-4 ? nl / L : 1; R *= k; G *= k; B *= k; }
    const i = 4 * (r + g * N + b * N * N);
    data[i] = Math.round(Math.min(1, Math.max(0, R)) * 255); data[i + 1] = Math.round(Math.min(1, Math.max(0, G)) * 255);
    data[i + 2] = Math.round(Math.min(1, Math.max(0, B)) * 255); data[i + 3] = 255;
  }
  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RGBAFormat; tex.type = THREE.UnsignedByteType; tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.ClampToEdgeWrapping; tex.unpackAlignment = 1; tex.needsUpdate = true;
  return tex;
}

export function installPonlai(ctx, o = {}) {
  const { renderer, composer } = ctx;
  const cfg = { ...PONLAI, ...o, localTone: { ...PONLAI.localTone, ...(o.localTone || {}) }, shadowContrast: { ...PONLAI.shadowContrast, ...(o.shadowContrast || {}) } };
  const pr = window.devicePixelRatio, W = 1080 * pr, H = 1920 * pr;
  const hdr = new ShaderPass(HDRShader); hdr.uniforms.px.value.set(1 / W, 1 / H);
  // before the OutputPass (the tone curve), so the exposure and local tone work in linear light
  const outIdx = composer.passes.findIndex((p) => p.constructor && p.constructor.name === 'OutputPass');
  composer.insertPass(hdr, outIdx >= 0 ? outIdx : composer.passes.length - 1);
  const lut = new LUTPass({ lut: o.lut ? buildLut(o.lut) : null, intensity: o.lutIntensity ?? 1 });
  if (o.lut) composer.addPass(lut);
  // the meter: the HDR input drawn down to 16 x 28, read back
  const mrt = new THREE.WebGLRenderTarget(16, 28, { type: THREE.FloatType, depthBuffer: false });
  const mq = new FullScreenQuad(new THREE.ShaderMaterial(MeterShader)), buf = new Float32Array(16 * 28 * 4);
  const meter = (tex) => {
    mq.material.uniforms.t.value = tex;
    const prev = renderer.getRenderTarget(), tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
    renderer.setRenderTarget(mrt); mq.render(renderer); renderer.readRenderTargetPixels(mrt, 0, 0, 16, 28, buf); renderer.setRenderTarget(prev); renderer.toneMapping = tm;
    let s = 0, w = 0;
    for (let y = 0; y < 28; y++) for (let x = 0; x < 16; x++) {
      const i = 4 * (x + y * 16), L = 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
      const cx = (x + 0.5) / 16 - 0.5, cy = (y + 0.5) / 28 - 0.5, wt = Math.exp(-(cx * cx * 6 + cy * cy * 4));
      s += Math.log2(Math.min(Math.max(L, 1e-4), cfg.key * cfg.highlight)) * wt; w += wt;
    }
    return Math.pow(2, s / w);
  };
  // the pass meters its input each frame, then sets ev
  const render0 = hdr.render.bind(hdr);
  hdr.render = (r, wb, rb, dt, mask) => {
    const avg = meter(rb.texture) * renderer.toneMappingExposure;
    const ev = Math.pow(cfg.key / Math.max(avg, 1e-4), cfg.strength);
    hdr.uniforms.ev.value = Math.min(Math.pow(2, cfg.maxEV), Math.max(Math.pow(2, -cfg.maxEV), ev));
    pl.lastEV = Math.log2(hdr.uniforms.ev.value); pl.lastAvg = avg;
    render0(r, wb, rb, dt, mask);
  };
  const apply = () => {
    hdr.uniforms.hinge.value = cfg.localTone.hinge; hdr.uniforms.high.value = cfg.localTone.high; hdr.uniforms.low.value = cfg.localTone.low;
    hdr.uniforms.width.value = cfg.localTone.width * pr; hdr.uniforms.pivot.value = cfg.shadowContrast.pivot; hdr.uniforms.slope.value = cfg.shadowContrast.slope;
  };
  apply();
  const pl = { cfg, hdr, lut, set(n) { Object.assign(cfg, n); if (n.localTone) cfg.localTone = { ...cfg.localTone, ...n.localTone }; if (n.shadowContrast) cfg.shadowContrast = { ...cfg.shadowContrast, ...n.shadowContrast }; apply(); } };
  ctx.ponlai = pl;
  return pl;
}
