// Ponlai's light and grade, brought to the WebGL pro look (Episode 121, LORE-001).
// Ponlai (github.com/HuberyLL/ponlai, MIT, by Hubery; video-farm tools/ponlai.py) renders its island with a physically based sky,
// exponential height fog, auto exposure, local tone mapping and LUT grading. This module adds the same four stages to an
// episode's composer, in Ponlai's order (atmosphere -> exposure -> tone mapping -> colour grade, the order of its skill
// "building-cinematic-stylised-realism"):
//   installPonlai(ctx, { fog: { density, falloff, base }, key, strength, local })
//   ctx.ponlai.set({ shimmer, memory, key, local, warm })   // per frame (all plain numbers: a frame stays a function of t)
//   ctx.ponlai.plate(url, { arc, elev0, elev1, yaw })      // a Ponlai still as the far sky backdrop (no fog on it)
// - Height fog: every fogged material gets an exponential height-fog term (density falls with height), on top of the
//   palette's linear distance fog, so valleys and far fields haze while rooftops and sky stay clear.
// - Auto exposure: each frame meters its own HDR image (log-average luminance, centre weighted) and pulls it partway to
//   a key value. No temporal adaptation: frame ranges render in parallel workers, so a frame may depend only on t.
// - Local tone mapping: the large-scale log luminance (a low-res copy of the frame) is compressed toward the frame's mean
//   while the detail on top of it is kept: the shade stays readable without flattening the sunlit side.
// - LUT grade: a 32^3 3D LUT built from a grading function (split toning: cool shadows, warm highlights; a gentle
//   S-curve; vibrance), plus a second "memory" LUT (warm, soft, faded) blended in for flashbacks.
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

let FOG_PATCHED = false;
function patchHeightFog({ density = 0.012, falloff = 0.03, base = 0 } = {}) {
  if (FOG_PATCHED) return; FOG_PATCHED = true;
  const C = THREE.ShaderChunk, f = (x) => x.toFixed(6);
  C.fog_pars_vertex = C.fog_pars_vertex.replace('varying float vFogDepth;', 'varying float vFogDepth;\n\tvarying vec3 vFogWorld;');
  C.fog_vertex = C.fog_vertex.replace('vFogDepth = - mvPosition.z;', 'vFogDepth = - mvPosition.z;\n\tvFogWorld = ( inverse( viewMatrix ) * mvPosition ).xyz;');
  C.fog_pars_fragment = C.fog_pars_fragment.replace('varying float vFogDepth;', 'varying float vFogDepth;\n\tvarying vec3 vFogWorld;');
  // exponential height fog integrated along the view ray (density a at height base, falling off by e every 1/b)
  C.fog_fragment = C.fog_fragment.replace('gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );', `
	{
		vec3 rd = vFogWorld - cameraPosition; float dist = length( rd );
		float b = ${f(falloff)}, a = ${f(density)};
		float h0 = max( cameraPosition.y - (${f(base)}), 0.0 );
		float dy = rd.y * b;
		float shape = abs( dy ) > 1e-4 ? ( 1.0 - exp( - dy ) ) / dy : 1.0;
		float hf = 1.0 - exp( - a * exp( - h0 * b ) * shape * dist * 0.01 );
		fogFactor = 1.0 - ( 1.0 - fogFactor ) * ( 1.0 - clamp( hf, 0.0, 0.85 ) );
	}
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );`);
}

// ---- the grade LUTs ----
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function lutData(fn, N = 32) {
  const d = new Uint8Array(N * N * N * 4);
  for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) {
    const o = fn(r / (N - 1), g / (N - 1), b / (N - 1)), i = (r + g * N + b * N * N) * 4;
    d[i] = Math.round(Math.min(1, Math.max(0, o[0])) * 255); d[i + 1] = Math.round(Math.min(1, Math.max(0, o[1])) * 255);
    d[i + 2] = Math.round(Math.min(1, Math.max(0, o[2])) * 255); d[i + 3] = 255;
  }
  const t = new THREE.Data3DTexture(d, N, N, N); t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
  t.minFilter = t.magFilter = THREE.LinearFilter; t.unpackAlignment = 1; t.needsUpdate = true; return t;
}
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
// the main look: Ponlai's daylight grade (cool shade, warm sun, held highlights) for a bright vivid summer
function gradeMain(r, g, b) {
  const L = luma(r, g, b), sh = 1 - sm(0.05, 0.5, L), hi = sm(0.45, 0.95, L);
  r += -0.018 * sh + 0.03 * hi; g += 0.004 * sh + 0.012 * hi; b += 0.032 * sh - 0.028 * hi;
  const s = (x) => x + 0.11 * x * (1 - x) * (2 * x - 1) * -1 + 0.0;   // gentle S (lifts mids a hair, holds ends)
  r = s(r); g = s(g); b = s(b);
  const L2 = luma(r, g, b), mx = Math.max(r, g, b), mn = Math.min(r, g, b), chroma = mx - mn;
  const vib = 1 + 0.22 * (1 - Math.min(1, chroma * 2.2));            // vibrance: lift the dull colours more than the vivid ones
  return [L2 + (r - L2) * vib, L2 + (g - L2) * vib, L2 + (b - L2) * vib];
}
// memory: warm, soft, faded blacks, a little less colour
function gradeMemory(r, g, b) {
  let [x, y, z] = gradeMain(r, g, b); const L = luma(x, y, z);
  x = L + (x - L) * 0.78; y = L + (y - L) * 0.78; z = L + (z - L) * 0.78;
  x = 0.06 + x * 0.92 + 0.05; y = 0.05 + y * 0.9 + 0.02; z = 0.04 + z * 0.84 - 0.01;
  return [x, y, z];
}

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
class PonlaiHDRPass extends Pass {
  constructor(renderer, o) {
    super();
    this.mw = 96; this.mh = 170;
    this.meter = new THREE.WebGLRenderTarget(this.mw, this.mh, { type: THREE.FloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.buf = new Float32Array(this.mw * this.mh * 4);
    this.logQ = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: VS,
      fragmentShader: `varying vec2 vUv; uniform sampler2D t;
        void main(){ vec3 c = vec3(0.0);   // a 3x3 box of the full frame per meter texel: a soft base layer
          for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) c += texture2D(t, vUv + vec2(float(i) / 288.0, float(j) / 510.0)).rgb;
          c /= 9.0; float L = dot(c, vec3(0.2126, 0.7152, 0.0722)); gl_FragColor = vec4(log2(max(L, 1e-4)), 0.0, 0.0, 1.0); }` }));
    this.mat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, tBase: { value: this.meter.texture }, ex: { value: 1 }, mean: { value: 0 },
      local: { value: o.local ?? 0.28 }, shimmer: { value: 0 }, time: { value: 0 }, texel: { value: new THREE.Vector2(1 / this.mw, 1 / this.mh) } },
      vertexShader: VS,
      fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse, tBase; uniform float ex, mean, local, shimmer, time; uniform vec2 texel;
        float base(vec2 uv){   // bilinear + a small tent over the low-res log luminance
          vec2 p = uv / texel - 0.5, f = fract(p), i0 = (floor(p) + 0.5) * texel;
          float a = texture2D(tBase, i0).r, b = texture2D(tBase, i0 + vec2(texel.x, 0.0)).r, c = texture2D(tBase, i0 + vec2(0.0, texel.y)).r, d = texture2D(tBase, i0 + texel).r;
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
        void main(){
          vec2 uv = vUv;
          if (shimmer > 0.0) { float k = shimmer * smoothstep(0.62, 0.2, uv.y);   // heat shimmer over the ground (lower frame)
            uv.x += k * 0.0016 * sin(uv.y * 260.0 + time * 9.0) + k * 0.0009 * sin(uv.y * 520.0 - time * 13.0);
            uv.y += k * 0.0008 * sin(uv.x * 300.0 + time * 7.0); }
          vec3 c = texture2D(tDiffuse, uv).rgb * ex;
          float L = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-4), lL = log2(L);
          float B = base(uv) + log2(ex), B2 = mix(B, mean + log2(ex), local);
          c *= exp2(B2 - B);
          gl_FragColor = vec4(c, 1.0); }` });
    this.fs = new FullScreenQuad(this.mat);
    this.key = o.key ?? 0.2; this.strength = o.strength ?? 0.5; this.minEx = o.minEx ?? 0.7; this.maxEx = o.maxEx ?? 1.6;
  }
  render(renderer, writeBuffer, readBuffer) {
    // meter: the frame's log luminance at low res (also the local tone mapping's base layer)
    this.logQ.material.uniforms.t.value = readBuffer.texture;
    renderer.setRenderTarget(this.meter); this.logQ.render(renderer);
    renderer.readRenderTargetPixels(this.meter, 0, 0, this.mw, this.mh, this.buf);
    let sw = 0, s = 0;
    for (let y = 0; y < this.mh; y++) for (let x = 0; x < this.mw; x++) {
      const u = x / (this.mw - 1) - 0.5, v = y / (this.mh - 1) - 0.42, w = 0.35 + Math.exp(-(u * u * 5 + v * v * 3.2));   // centre weighted
      s += this.buf[(y * this.mw + x) * 4] * w; sw += w;
    }
    const mean = s / sw, avg = Math.pow(2, mean);
    const ex = Math.min(this.maxEx, Math.max(this.minEx, Math.pow(this.key / avg, this.strength)));
    this.mat.uniforms.ex.value = ex; this.mat.uniforms.mean.value = mean;
    this.mat.uniforms.tDiffuse.value = readBuffer.texture;
    this.lastEx = ex;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.fs.render(renderer);
  }
}
class PonlaiLUTPass extends Pass {
  constructor() {
    super();
    this.mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: { tDiffuse: { value: null }, lutA: { value: lutData(gradeMain) }, lutB: { value: lutData(gradeMemory) }, memory: { value: 0 }, amount: { value: 1 } },
      vertexShader: 'out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `in vec2 vUv; out vec4 o; uniform sampler2D tDiffuse; uniform highp sampler3D lutA, lutB; uniform float memory, amount;
        void main(){ vec3 c = clamp(texture(tDiffuse, vUv).rgb, 0.0, 1.0); vec3 q = c * (31.0 / 32.0) + 0.5 / 32.0;
          vec3 g = mix(texture(lutA, q).rgb, texture(lutB, q).rgb, memory); o = vec4(mix(c, g, amount), 1.0); }` });
    this.fs = new FullScreenQuad(this.mat);
  }
  render(renderer, writeBuffer, readBuffer) {
    this.mat.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.fs.render(renderer);
  }
}

export function installPonlai(ctx, o = {}) {
  patchHeightFog(o.fog);
  const { composer, renderer } = ctx;
  const hdr = new PonlaiHDRPass(renderer, o), lut = new PonlaiLUTPass();
  const iOut = composer.passes.findIndex((p) => p.constructor.name === 'OutputPass');
  composer.insertPass(hdr, iOut);           // linear HDR, before the tone map
  composer.insertPass(lut, iOut + 2);       // display-referred, right after the tone map
  ctx.ponlai = {
    hdr, lut,
    set(p = {}) {
      hdr.mat.uniforms.shimmer.value = p.shimmer ?? 0; hdr.mat.uniforms.time.value = p.time ?? 0;
      hdr.mat.uniforms.local.value = p.local ?? (o.local ?? 0.28);
      hdr.key = p.key ?? (o.key ?? 0.2); hdr.strength = p.strength ?? (o.strength ?? 0.5); hdr.minEx = p.minEx ?? (o.minEx ?? 0.7); hdr.maxEx = p.maxEx ?? (o.maxEx ?? 1.6);
      lut.mat.uniforms.memory.value = p.memory ?? 0; lut.mat.uniforms.amount.value = p.lut ?? 1;
    },
    // a Ponlai still (tools/ponlai.py) as the far sky: a cylinder band around `centre`, `arc` degrees of it carrying the
    // plate (mirrored round the rest), its horizon row at elevation 0
    plate(tex, { centre = new THREE.Vector3(), radius = 2400, arc = 110, elev0 = -4, elev1 = 38, yaw = 0, horizonV = 0.42, opacity = 1 } = {}) {
      tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.MirroredRepeatWrapping;
      const e0 = elev0 * Math.PI / 180, e1 = elev1 * Math.PI / 180;
      const h0 = Math.tan(e0) * radius, h1 = Math.tan(e1) * radius;
      const g = new THREE.CylinderGeometry(radius, radius, h1 - h0, 96, 1, true);
      g.translate(0, (h0 + h1) / 2, 0);
      const uv = g.attributes.uv, p = g.attributes.position;
      for (let i = 0; i < uv.count; i++) {
        const ang = Math.atan2(p.getX(i), p.getZ(i)) - yaw, a = Math.atan2(Math.sin(ang), Math.cos(ang)) * 180 / Math.PI;   // -180..180
        const el = Math.atan2(p.getY(i), radius);
        // the plate's vertical field: horizonV at elevation 0, its top at elev1
        const v = horizonV + (1 - horizonV) * (el / e1) * (el >= 0 ? 1 : 1);
        uv.setXY(i, 0.5 + a / arc, Math.min(1, Math.max(0, v)));
      }
      const m = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false, transparent: true, opacity, toneMapped: true });
      const mesh = new THREE.Mesh(g, m); mesh.position.copy(centre); mesh.renderOrder = -10; mesh.userData.noAO = true; mesh.frustumCulled = false;
      ctx.scene.add(mesh); return mesh;
    },
  };
  return ctx.ponlai;
}
