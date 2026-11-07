// Shared helpers: math, seeded random, shared uniforms, caustic patch.
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

// hash-based smooth noise usable as pure function of t (for camera shake etc.)
export function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const h = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

// Uniforms shared by every patched material and the ocean.
export const U = {
  skinGlow: 0,   // pro look: skin keeps a little of its own colour, so coloured light can't turn faces green or orange
  uTime: { value: 0 },
  uCausticColor: { value: new THREE.Color(0.35, 0.75, 1.0) },
  uCausticStrength: { value: 0.35 },
  // world dissolve (glitch-erase everything patched, outward from a point, sparing a radius)
  uDissolve: { value: 0 },
  uDissolveCenter: { value: new THREE.Vector3() },
  uDissolveKeep: { value: 6 },
};

const CAUSTIC_GLSL = /* glsl */`
uniform float uTime;
uniform vec3 uCausticColor;
uniform float uCausticStrength;
uniform float uDissolve; uniform vec3 uDissolveCenter; uniform float uDissolveKeep;
varying vec3 vCWorld;
float dHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float causticAt(vec2 p, float t) {
  // cheap animated caustic web (iterated sin warp)
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.5);
}
`;

export function patchCaustics(mat, scale = 0.09) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = U.uTime;
    shader.uniforms.uCausticColor = U.uCausticColor;
    shader.uniforms.uCausticStrength = U.uCausticStrength;
    shader.uniforms.uDissolve = U.uDissolve; shader.uniforms.uDissolveCenter = U.uDissolveCenter; shader.uniforms.uDissolveKeep = U.uDissolveKeep;
    shader.vertexShader = 'varying vec3 vCWorld;\n' + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n vCWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = CAUSTIC_GLSL + shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       if (uDissolve > 0.0) {
         float dd = length(vCWorld.xz - uDissolveCenter.xz);
         float reach = uDissolve * 900.0;
         float h = dHash(floor(vCWorld * 0.6));
         if (dd > uDissolveKeep && dd < reach + h * 40.0 - 20.0 + uDissolveKeep) discard;
         float edge = 1.0 - smoothstep(0.0, 30.0, abs(dd - reach - uDissolveKeep));
         if (dd > uDissolveKeep) gl_FragColor.rgb = mix(gl_FragColor.rgb, h > 0.5 ? vec3(0.1, 1.0, 1.0) : vec3(1.0, 0.1, 0.9), edge * step(0.35, h));
       }
       if (uCausticStrength > 0.001) {
       vec2 cp = vec2(vCWorld.x + vCWorld.y * 0.45, vCWorld.z - vCWorld.y * 0.3) * ${scale.toFixed(3)};
       float cst = causticAt(mod(cp, 6.2831853) * 1.0 + 7.0, uTime * 0.55);
       gl_FragColor.rgb += uCausticColor * cst * uCausticStrength;
       }
      `);
  };
  mat.customProgramCacheKey = () => 'caustic' + scale;
  return mat;
}

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (matCache.has(key)) return matCache.get(key);
  const { caustic = true, ...rest } = opts;
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.0, ...rest });
  if (caustic) patchCaustics(m);
  matCache.set(key, m);
  return m;
}

export function box(w, h, d, material, x = 0, y = 0, z = 0, parent = null, shadows = true) {
  const m = new THREE.Mesh(BOX_GEO(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = shadows; m.receiveShadow = shadows;
  if (parent) parent.add(m);
  return m;
}

const boxGeoCache = new Map();
function BOX_GEO(w, h, d) {
  const k = `${w}|${h}|${d}`;
  if (!boxGeoCache.has(k)) boxGeoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return boxGeoCache.get(k);
}

// Split a w x h wall (local x in [-w/2,w/2], y in [0,h]) into boxes around rectangular holes.
// holes: [{x0,x1,y0,y1}] in the same local coords.
export function wallRects(w, h, holes) {
  const xs = new Set([-w / 2, w / 2]);
  const ys = new Set([0, h]);
  holes.forEach((o) => { xs.add(o.x0); xs.add(o.x1); ys.add(o.y0); ys.add(o.y1); });
  const X = [...xs].sort((a, b) => a - b), Y = [...ys].sort((a, b) => a - b);
  const rects = [];
  for (let i = 0; i < X.length - 1; i++) {
    let run = null;
    for (let j = 0; j < Y.length - 1; j++) {
      const cx = (X[i] + X[i + 1]) / 2, cy = (Y[j] + Y[j + 1]) / 2;
      const inHole = holes.some((o) => cx > o.x0 && cx < o.x1 && cy > o.y0 && cy < o.y1);
      if (!inHole) {
        if (run) run.y1 = Y[j + 1]; else run = { x0: X[i], x1: X[i + 1], y0: Y[j], y1: Y[j + 1] };
      } else if (run) { rects.push(run); run = null; }
    }
    if (run) rects.push(run);
  }
  return rects;
}
