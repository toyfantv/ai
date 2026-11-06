// The suspended sky ocean: deformable membrane shader, sky dome, giant hands, eye, silhouette.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { U } from './core.js';

export const OCEAN_Y = 48;
export const HAND_DEPTH = 16;

// Hand shape in "hand units" (scaled per hand). Shared by the GLSL SDF and the mesh.
const PALM = { hx: 10, hy: 11, r: 4 };
const FINGERS = [
  { a: [-7.5, 9], b: [-8.6, 27], r: 2.6 },
  { a: [-2.5, 10], b: [-2.8, 30.5], r: 2.7 },
  { a: [2.5, 10], b: [3.3, 28.5], r: 2.6 },
  { a: [7.2, 8.5], b: [9.4, 23.5], r: 2.3 },
  { a: [9.0, -3], b: [19.5, 8], r: 3.0 },
];
const v2 = (p) => `vec2(${p[0].toFixed(2)}, ${p[1].toFixed(2)})`;
const HAND_GLSL = `
float sdCapsule(vec2 p, vec2 a, vec2 b, float r) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float sdRBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float handSdf(vec2 p) {
  float d = sdRBox(p, vec2(${PALM.hx.toFixed(1)}, ${PALM.hy.toFixed(1)}), ${PALM.r.toFixed(1)});
  ${FINGERS.map((f) => `d = min(d, sdCapsule(p, ${v2(f.a)}, ${v2(f.b)}, ${f.r.toFixed(2)}));`).join('\n  ')}
  return d;
}
uniform vec4 uHand[2];     // cx, cz, angle, scale
uniform float uPress[2];   // 0..1 (negative = still approaching)
uniform float uMirror[2];
vec2 handLocal(vec2 w, int i) {
  vec2 q = w - uHand[i].xy; float a = uHand[i].z;
  vec2 p = vec2(cos(a) * q.x + sin(a) * q.y, -sin(a) * q.x + cos(a) * q.y) / uHand[i].w;
  p.x *= uMirror[i];
  return p;
}
`;

const NOISE_GLSL = `
vec2 hash2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash2(i).x, b = hash2(i + vec2(1, 0)).x, c = hash2(i + vec2(0, 1)).x, d = hash2(i + vec2(1, 1)).x;
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
float voronoiEdge(vec2 x) {
  vec2 n = floor(x), f = fract(x); vec2 mg, mr; float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)); vec2 o = hash2(n + g); vec2 r = g + o - f; float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; } }
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j)); vec2 o = hash2(n + g); vec2 r = g + o - f;
    if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr))); }
  return md;
}
`;

const surfaceVert = `
${HAND_GLSL}
uniform float uTime, uDepth, uRipple;
varying vec3 vWorld; varying float vHand; varying float vHandSdf;
void main() {
  vec3 p = position;
  float disp = 0.0; float hm = 0.0; float sdfMin = 1e3;
  for (int i = 0; i < 2; i++) {
    vec2 hp = handLocal(p.xz, i);
    float sd = handSdf(hp);
    float field = 1.0 - smoothstep(-1.5, 7.0, sd);
    float tent = 0.5 * exp(-dot(hp, hp) / 2025.0);
    float pr = max(uPress[i], 0.0);
    float f = max(field, tent) * pr;
    disp += f; hm = max(hm, field * pr);
    sdfMin = min(sdfMin, mix(1e3, sd * uHand[i].w, step(0.001, pr)));
    // impact ripple rings
    float dist = length(p.xz - uHand[i].xy);
    disp += uRipple * pr * 0.05 * sin(dist * 0.22 - uTime * 5.0) * exp(-dist / 90.0) * smoothstep(20.0, 60.0, dist);
  }
  p.y -= disp * uDepth;
  // gentle swell
  p.y += sin(p.x * 0.05 + uTime * 0.7) * 0.6 + sin(p.z * 0.07 - uTime * 0.5) * 0.5;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz; vHand = hm; vHandSdf = sdfMin;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const surfaceFrag = `
${NOISE_GLSL}
uniform float uTime, uOpacity, uCrackR, uCrackGlow, uHandCrack, uHoleR, uFogNear, uFogFar, uSilStrength, uStill;
uniform vec3 uDeep, uShallow, uLight, uFogColor, uCrackColor;
uniform vec2 uCrackCenter; uniform vec4 uSil;
varying vec3 vWorld; varying float vHand; varying float vHandSdf;
float caustic(vec2 p, float t) {
  vec2 i = p; float c = 1.0; float inten = 0.005;
  for (int n = 0; n < 4; n++) { float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten))); }
  c /= 4.0; c = 1.17 - pow(c, 1.4); return clamp(pow(abs(c), 8.0), 0.0, 1.5);
}
void main() {
  vec2 xz = vWorld.xz;
  float dC = length(xz - uCrackCenter);
  float ang = atan(xz.y - uCrackCenter.y, xz.x - uCrackCenter.x);
  float jag = vnoise(vec2(ang * 6.0, 1.0)) * 0.6 + vnoise(vec2(ang * 17.0, 3.0)) * 0.4;
  if (uHoleR > 0.0 && dC < uHoleR * (0.65 + 0.7 * jag)) discard;

  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (n.y > 0.0) n = -n;
  float t = uTime * (1.0 - uStill);
  // small analytic ripples
  vec2 g = vec2(0.0);
  g += 0.35 * vec2(cos(xz.x * 0.21 + t * 1.3), 0.0);
  g += 0.30 * vec2(0.0, cos(xz.y * 0.17 - t * 1.1));
  g += 0.25 * vec2(cos((xz.x + xz.y) * 0.31 + t * 1.7)) * 0.7;
  n = normalize(n + vec3(g.x, 0.0, g.y) * 0.35);

  vec3 V = normalize(cameraPosition - vWorld);
  float up = clamp(-V.y, 0.0, 1.0);           // looking straight up -> 1
  float fres = pow(1.0 - abs(dot(n, V)), 3.0);
  vec3 col = mix(uShallow, uDeep, 0.35 + 0.65 * fres);
  float cs = caustic(mod(xz * 0.035, 6.2831853) + 3.0, t * 0.45);
  float cs2 = caustic(mod(xz * 0.09 + 1.7, 6.2831853), t * 0.6);
  col += uLight * (cs * 0.55 + cs2 * 0.25) * (0.4 + 0.6 * up);
  col += uLight * 0.25 * pow(max(dot(reflect(-V, n), vec3(0.0, -1.0, 0.0)), 0.0), 6.0);
  // stretched membrane under the hands gets a bright rim
  float edgeBand = smoothstep(0.08, 0.4, vHand) * (1.0 - smoothstep(0.45, 0.85, vHand));
  col += uLight * smoothstep(0.6, 1.0, vHand) * 0.35;
  col = mix(col, col * 0.18, edgeBand * 0.85);
  // silhouette shadow
  vec2 sp = (xz - uSil.xy) / vec2(uSil.z, uSil.w);
  col *= 1.0 - uSilStrength * (1.0 - smoothstep(0.4, 1.0, length(sp + vec2(vnoise(xz * 0.02) * 0.3))));

  float alpha = mix(uOpacity * mix(1.0, 0.3, smoothstep(0.6, 1.0, vHand)), 0.95, edgeBand * 0.8);

  // cracks
  float crack = 0.0;
  if (uCrackGlow > 0.0) {
    vec2 w = xz / 30.0 + vec2(vnoise(xz * 0.03), vnoise(xz * 0.03 + 9.0)) * 0.6;
    float e = voronoiEdge(w);
    float e2 = voronoiEdge(xz / 11.0 + 4.0);
    float mask = 1.0 - smoothstep(uCrackR - 60.0, uCrackR, dC);
    float near = 1.0 - smoothstep(0.0, 120.0, dC);
    crack = (1.0 - smoothstep(0.0, 0.025 + 0.03 * near, e)) * mask;
    crack += (1.0 - smoothstep(0.0, 0.04, e2)) * mask * near * 0.8;
    float rays = 1.0 - smoothstep(0.0, 0.035, abs(fract(ang * 1.4 + vnoise(vec2(dC * 0.02, ang)) * 0.25) - 0.5));
    crack += rays * mask * smoothstep(uCrackR, 0.0, dC) * 0.9;
  }
  if (uHandCrack > 0.0 && vHandSdf < 40.0) {
    float e = voronoiEdge(xz / 7.0);
    float m = (1.0 - smoothstep(0.0, 9.0, abs(vHandSdf - 3.0))) * uHandCrack;
    crack = max(crack, (1.0 - smoothstep(0.0, 0.06, e)) * m);
  }
  crack = clamp(crack, 0.0, 1.0) * max(uCrackGlow, uHandCrack);
  vec3 hot = mix(uCrackColor, vec3(1.0, 0.95, 0.9), crack * crack);
  col = mix(col, hot * 2.2, crack);
  alpha = max(alpha, crack);
  if (uHoleR > 0.0) { float rim = 1.0 - smoothstep(0.0, 10.0, dC - uHoleR * (0.65 + 0.7 * jag)); col += hot * rim * 2.0; alpha = max(alpha, rim); }

  // distance fade into the horizon haze
  float fd = smoothstep(uFogNear, uFogFar, length(vWorld - cameraPosition));
  col = mix(col, uFogColor, fd);
  alpha = mix(alpha, 1.0, fd);
  gl_FragColor = vec4(col, alpha);
}`;

function denseGrid(seg, A, B) {
  // plane in XZ with vertices concentrated near the origin
  const g = new THREE.PlaneGeometry(2, 2, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const f = (u) => A * u + B * Math.sign(u) * Math.pow(Math.abs(u), 7);
  for (let i = 0; i < p.count; i++) p.setXYZ(i, f(p.getX(i)), 0, f(p.getZ(i)));
  g.computeBoundingSphere(); g.boundingSphere.radius = A + B;
  return g;
}

export function buildOcean(scene) {
  const uniforms = {
    uTime: U.uTime, uOpacity: { value: 0.62 }, uDepth: { value: HAND_DEPTH }, uRipple: { value: 0 }, uStill: { value: 0 },
    uDeep: { value: new THREE.Color('#0b4f8a') }, uShallow: { value: new THREE.Color('#3fc1f0') }, uLight: { value: new THREE.Color('#bff4ff') },
    uFogColor: { value: new THREE.Color('#a9dcf2') }, uFogNear: { value: 240 }, uFogFar: { value: 900 },
    uCrackColor: { value: new THREE.Color('#ff3b5c') }, uCrackCenter: { value: new THREE.Vector2(60, -24) },
    uCrackR: { value: 0 }, uCrackGlow: { value: 0 }, uHandCrack: { value: 0 }, uHoleR: { value: 0 },
    uHand: { value: [new THREE.Vector4(50, 40, 0.25, 1.5), new THREE.Vector4(78, 30, -0.35, 1.5)] },
    uPress: { value: [-1, -1] }, uMirror: { value: [1, -1] },
    uSil: { value: new THREE.Vector4(0, 0, 120, 60) }, uSilStrength: { value: 0 },
  };
  const surface = new THREE.Mesh(denseGrid(340, 260, 1400), new THREE.ShaderMaterial({
    uniforms, vertexShader: surfaceVert, fragmentShader: surfaceFrag,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  surface.position.y = OCEAN_Y; surface.frustumCulled = false; surface.renderOrder = 5;
  scene.add(surface);

  // sky dome: horizon haze -> deep water above the surface
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uHaze: uniforms.uFogColor, uDeep: uniforms.uDeep, uLight: uniforms.uLight, uVoid: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w * 0.9999; }',
    fragmentShader: `uniform vec3 uHaze, uDeep, uLight; uniform float uVoid; varying vec3 vDir;
      void main(){ float y = vDir.y; vec3 c = mix(uHaze, uDeep * 0.8, smoothstep(0.02, 0.35, y));
        c += uLight * 0.35 * pow(max(y, 0.0), 10.0); c = mix(c, vec3(0.0), uVoid * smoothstep(0.3, 0.7, y));
        gl_FragColor = vec4(c, 1.0); }`,
  }));
  dome.renderOrder = -10; dome.frustumCulled = false; scene.add(dome);

  // giant hands (meshes that sit inside the membrane bulge)
  const handMat = new THREE.MeshStandardMaterial({ color: '#f2e2dc', roughness: 0.6, emissive: '#ffd8cc', emissiveIntensity: 0.35 });
  const hands = [0, 1].map((i) => {
    const g = new THREE.Group();
    const palm = new THREE.Mesh(new RoundedBoxGeometry(PALM.hx * 2, 3, PALM.hy * 2, 3, 1.4), handMat);
    palm.position.y = 1.5; g.add(palm);
    FINGERS.forEach((f) => {
      const a = new THREE.Vector3(f.a[0], 0, f.a[1]), b = new THREE.Vector3(f.b[0], 0, f.b[1]);
      const len = a.distanceTo(b);
      const c = new THREE.Mesh(new THREE.CapsuleGeometry(f.r, len, 4, 10), handMat);
      c.position.copy(a.clone().add(b).multiplyScalar(0.5)); c.position.y = f.r;
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      g.add(c);
    });
    g.visible = false; scene.add(g);
    return g;
  });

  // dark shape that drifts above the surface
  const sil = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshBasicMaterial({ color: '#050208', transparent: true, opacity: 0 }));
  sil.scale.set(120, 22, 60); sil.renderOrder = 1; scene.add(sil);

  // the eye behind the crack
  const eye = new THREE.Group(); eye.scale.setScalar(0.7);
  const sclera = new THREE.Mesh(new THREE.SphereGeometry(24, 32, 16), new THREE.MeshBasicMaterial({ color: '#f2ece6' }));
  sclera.scale.y = 0.6; eye.add(sclera);
  const iris = new THREE.Mesh(new THREE.CircleGeometry(11, 40), new THREE.MeshBasicMaterial({ color: '#ff6a1a', side: THREE.DoubleSide }));
  iris.rotation.x = Math.PI / 2; iris.position.y = -14.5; eye.add(iris);
  const ring = new THREE.Mesh(new THREE.RingGeometry(10, 11.2, 40), new THREE.MeshBasicMaterial({ color: '#7a1a05', side: THREE.DoubleSide }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -14.55; eye.add(ring);
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(4.5, 32), new THREE.MeshBasicMaterial({ color: '#000000', side: THREE.DoubleSide }));
  pupil.rotation.x = Math.PI / 2; pupil.position.y = -14.6; eye.add(pupil);
  const back = new THREE.Mesh(new THREE.CircleGeometry(160, 40), new THREE.MeshBasicMaterial({ color: '#000000', side: THREE.DoubleSide }));
  back.rotation.x = Math.PI / 2; back.position.y = 12; eye.add(back);
  eye.visible = false; scene.add(eye);

  return {
    surface, dome, uniforms, hands, sil, eye,
    placeHand(i, cx, cz, angle, scale, press) {
      uniforms.uHand.value[i].set(cx, cz, angle, scale);
      uniforms.uPress.value[i] = press;
      const h = hands[i];
      h.visible = press > -0.99;
      h.position.set(cx, OCEAN_Y - HAND_DEPTH * Math.max(press, 0) + 0.3 + Math.max(0, -press) * 45, cz);
      h.rotation.y = -angle;
      h.scale.set(scale * uniforms.uMirror.value[i], scale, scale);
    },
  };
}
