// Episode 39's set: a wet stone tunnel that keeps getting smaller, the hillside it opens from, and the search team's kit. All original; everything is seeded.
//   const T = voiceTunnel();  scene.add(T);  T.pt(s, lat, h)   // a point s studs in (the mouth is s 0 at z 0, deeper is -z), lat studs right of the centre line, h above the floor
// The tunnel's faces point inward, so a camera outside it sees straight through the near wall: that is how a tight space gets a wide shot.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, v3, smooth, clamp, lerp } from './core.js';
import { Batch, surf, paint } from './kit.js';
import { canvasTex } from './props.js';

// ---- seeded value noise ----
function makeNoise(seed = 3, size = 256) {
  const r = rng(seed), T = new Float32Array(size * size); for (let i = 0; i < T.length; i++) T[i] = r();
  const at = (x, y) => T[((y & (size - 1)) << 8 >>> 0) % T.length + (x & (size - 1))];
  const sm = (u) => u * u * (3 - 2 * u);
  const n = (x, y, per = 0) => { const px = per || size, X = Math.floor(x), Y = Math.floor(y), fx = sm(x - X), fy = sm(y - Y), w = (a) => ((a % px) + px) % px; const a = at(w(X), w(Y) & (size - 1)), b = at(w(X + 1), w(Y) & (size - 1)), c = at(w(X), w(Y + 1) & (size - 1)), d = at(w(X + 1), w(Y + 1) & (size - 1)); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  return { n, fbm: (x, y, o = 4) => { let s = 0, a = 0.5, f = 1, t = 0; for (let i = 0; i < o; i++) { s += a * n(x * f, y * f); t += a; a *= 0.5; f *= 2.02; } return s / t; } };
}
const N = makeNoise(39);
const keys = (K, s) => { if (s <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) { const [a, x] = K[i], [b, y] = K[i + 1]; if (s < b) return lerp(x, y, smooth(a, b, s)); } return K[K.length - 1][1]; };

// ---- wet stone: colour, relief and a roughness map where water runs down the walls ----
let MAPS = null;
function rockMaps() {
  if (MAPS) return MAPS;
  const S = 512, n = makeNoise(5), H = new Float32Array(S * S), W = new Float32Array(S * S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = (i / S) * 8, y = (j / S) * 8, cr = Math.abs(n.fbm(x * 0.6 + 3, y * 0.6, 3) - 0.5) * 2;
    H[j * S + i] = 0.5 * n.fbm(x, y, 5) + 0.5 * Math.min(1, cr * 3.2);
    W[j * S + i] = Math.pow(n.fbm(x * 2.2 + 9, y * 0.22, 3), 2.4) * 2.6;
  }
  const out = (f) => { const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), im = x.createImageData(S, S); for (let k = 0; k < S * S; k++) { const v = f(k); im.data[k * 4] = v[0]; im.data[k * 4 + 1] = v[1]; im.data[k * 4 + 2] = v[2]; im.data[k * 4 + 3] = 255; } x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const map = out((k) => { const h = H[k], w = clamp(W[k]), v = (0.42 + h * 0.62) * (1 - w * 0.5); return [v * 255, v * 247, v * 234]; }); map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = out((k) => { const i = k % S, j = (k - i) / S, h = (a, b) => H[(((b + S) % S) * S) + ((a + S) % S)], dx = (h(i - 1, j) - h(i + 1, j)) * 5.5, dy = (h(i, j - 1) - h(i, j + 1)) * 5.5, l = 1 / Math.hypot(dx, dy, 1); return [(dx * l * 0.5 + 0.5) * 255, (-dy * l * 0.5 + 0.5) * 255, (l * 0.5 + 0.5) * 255]; });
  const roughnessMap = out((k) => { const r = lerp(0.82, 0.42, clamp(W[k])) * 255; return [r, r, r]; });
  return (MAPS = { map, normalMap, roughnessMap });
}

export function voiceTunnel(o = {}) {
  const LEN = o.len ?? 152, g = new THREE.Group();
  const HK = [[0, 11.5], [12, 10.5], [24, 8.2], [36, 5.8], [60, 5.1], [76, 3.7], [92, 3.4], [114, 3.3], [124, 3.8], [136, 5.2], [152, 5.4]];
  const WK = [[0, 15], [12, 13], [24, 9.5], [36, 7.2], [60, 6.6], [76, 5.4], [92, 5.0], [114, 4.8], [124, 5.6], [136, 8], [152, 9]];
  const hgt = (s) => keys(HK, s), wid = (s) => keys(WK, s);
  const cx = (s) => 2.0 * Math.sin(s * 0.052) * smooth(8, 34, s) + 0.9 * Math.sin(s * 0.13 + 1) * smooth(20, 44, s), fy = (s) => -0.03 * Math.max(0, s - 6) + 0.5 * Math.sin(s * 0.07) * smooth(10, 30, s);
  g.hgt = hgt; g.wid = wid; g.len = LEN;
  g.pt = (s, lat = 0, h = 0) => v3(cx(s) + lat, fy(s) + h, -s);
  g.floor = (s) => fy(s);
  g.slope = (s) => Math.atan2(fy(s + 0.5) - fy(s - 0.5), 1);
  g.yawIn = (s) => Math.PI + Math.atan2(cx(s + 0.5) - cx(s - 0.5), 1);   // facing deeper
  const R = 64, RING = (a, s) => {   // a cross-section: a flattened arch with a nearly flat floor
    const c = Math.cos(a), sn = Math.sin(a), W = wid(s), H = hgt(s), lo = sn < 0;
    const amp = Math.min(W, H) * (lo ? 0.018 : 0.075), n = (N.fbm(s * 0.16 + 7, a * 2.1 + 3, 4) - 0.5) * 2 + 0.35 * (N.fbm(s * 0.7, a * 6, 2) - 0.5) * 2;
    const x = (W / 2) * Math.sign(c) * Math.pow(Math.abs(c), 0.72), y = H / 2 + (H / 2) * Math.sign(sn) * Math.pow(Math.abs(sn), lo ? 0.5 : 0.9), k = 1 + n * amp / Math.max(1, Math.hypot(x, y - H / 2));
    return [x * k, H / 2 + (y - H / 2) * k];
  };
  const STEP = 0.32, rings = Math.ceil(LEN / STEP), pos = [], uv = [], col = [], idx = [];
  for (let j = 0; j <= rings; j++) {
    const s = -3 + j * STEP;
    for (let i = 0; i <= R; i++) {
      const a = (i / R) * Math.PI * 2 - Math.PI / 2, [x, y] = RING(a, Math.max(0, s));
      pos.push(cx(Math.max(0, s)) + x, fy(Math.max(0, s)) + y, -s); uv.push(s / 7, (i / R) * (wid(Math.max(0, s)) + hgt(Math.max(0, s))) / 3.5);
      const dk = 0.62 + 0.42 * N.fbm(s * 0.09 + 21, a * 1.4, 3), floorD = Math.sin(a) < -0.7 ? 0.78 : 1; col.push(dk * floorD, dk * floorD * 0.97, dk * floorD * 0.92);
    }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < R; i++) { const a = j * (R + 1) + i, b = a + R + 1, c = a + 1, d = b + 1; idx.push(a, c, b, c, d, b); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals(); geo.computeTangents?.();
  const M = rockMaps();
  const mat = new THREE.MeshStandardMaterial({ color: '#8f8778', vertexColors: true, ...M, roughness: 1, metalness: 0, normalScale: new THREE.Vector2(0.75, 0.75), envMapIntensity: 0.28 });
  // in daylight the sky light has no way in, so the rock falls away to black a little past the lip
  g.day = { value: 0 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDay = g.day;
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying float vZ;\nvoid main() {\n  vZ = position.z;');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying float vZ; uniform float uDay;\nvoid main() {').replace('#include <opaque_fragment>', 'outgoingLight *= mix(1.0, exp(-max(0.0, -vZ - 3.0) * 0.16), uDay);\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => 'ep39-rock';
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.frustumCulled = false; g.add(m); g.rock = m;
  // ---- standing water on the floor ----
  const pud = srgbMask(); const pm = new THREE.MeshStandardMaterial({ color: '#10141a', roughness: 0.06, metalness: 0.2, alphaMap: pud, transparent: true, depthWrite: false, envMapIntensity: 1.2 });
  const r = rng(77); g.puddles = [];
  for (let i = 0; i < 46; i++) { const s = 5 + r() * 138, W = wid(s), sz = 1.2 + r() * 2.2; const p = new THREE.Mesh(new THREE.PlaneGeometry(sz * Math.min(1.6, W / 3), sz), pm); p.rotation.x = -Math.PI / 2; p.rotation.z = r() * 3; p.position.copy(g.pt(s, (r() - 0.5) * W * 0.45, 0.075)); p.userData.noAO = true; p.renderOrder = 1; g.add(p); }
  // ---- loose stones along the walls, old timber sets near the mouth, the search team's rope and glow sticks ----
  const st = new Batch(), rk = paint('#5e5a52', { roughness: 0.62 }); const r2 = rng(9);
  for (let i = 0; i < 230; i++) { const s = 2 + r2() * 145, W = wid(s), side = r2() < 0.5 ? -1 : 1, lat = side * W * (0.3 + r2() * 0.13), sc = (0.1 + r2() * 0.34) * Math.min(1.1, W / 6); const ge = new THREE.DodecahedronGeometry(sc, 0); ge.scale(1, 0.6, 0.8 + r2() * 0.5); ge.rotateY(r2() * 3); const p = g.pt(s, lat, sc * 0.3); st.add(rk, ge, p.x, p.y, p.z); }
  const tim = surf('plank', '#574432', { roughness: 0.92 });
  for (const s of [5.5, 15.5, 25.5]) { const W = wid(s) * 0.86, H = hgt(s) * 0.82, p = g.pt(s); st.box(tim, 0.7, H, 0.7, p.x - W / 2 + 0.3, p.y + H / 2, p.z, { r: 0.08 }); st.box(tim, 0.7, H, 0.7, p.x + W / 2 - 0.3, p.y + H / 2, p.z, { r: 0.08 }); st.box(tim, W + 0.4, 0.8, 0.8, p.x, p.y + H, p.z, { r: 0.08 }); }
  st.done(g);
  g.addRope = (a, b, sag = 0.3, col = '#c8631b') => { const n = 24, ps = []; for (let i = 0; i <= n; i++) { const u = i / n, p = a.clone().lerp(b, u); p.y -= sag * Math.sin(Math.PI * u); ps.push(p); } const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ps), 40, 0.05, 6), new THREE.MeshStandardMaterial({ color: col, roughness: 0.75 })); t.castShadow = false; t.receiveShadow = true; g.add(t); return t; };
  const lat = (s) => wid(s) * 0.4, H0 = (s) => Math.min(3.4, hgt(s) * 0.55);
  for (let s = 3; s < 62; s += 9) g.addRope(g.pt(s, lat(s), H0(s)), g.pt(s + 9, lat(s + 9), H0(s + 9)));
  const ank = paint('#8d9196', { metalness: 0.7, roughness: 0.35 }); const ab = new Batch(); for (let s = 3; s < 72; s += 9) { const p = g.pt(s, lat(s) + 0.1, H0(s)); ab.box(ank, 0.16, 0.28, 0.1, p.x, p.y, p.z, { r: 0.02 }); } ab.done(g);
  g.sticks = [];
  const gsMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7dffa6').multiplyScalar(1.15) });
  [10, 21, 31, 43, 54, 66, 80, 93, 105].forEach((s, i) => { const p = g.pt(s, (i % 2 ? -1 : 1) * wid(s) * 0.27, 0.12); const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.5, 3, 8), gsMat); c.position.copy(p); c.rotation.set(Math.PI / 2, 0, 0.5 + i); g.add(c); g.sticks.push({ s, p: p.clone().add(v3(0, 0.45, 0)) }); });
  return g;
}
function srgbMask() { const r = rng(4); return canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.filter = 'blur(10px)'; x.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse(w * (0.3 + r() * 0.4), h * (0.3 + r() * 0.4), 30 + r() * 44, 22 + r() * 34, r() * 3, 0, 7); x.fill(); } x.filter = 'none'; }); }

// the falling drops and their rings: instanced, a pure function of t
export function drips(T, n = 150) {
  const g = new THREE.Group(), r = rng(21), ge = new THREE.SphereGeometry(0.05, 6, 5); ge.scale(1, 2.6, 1);
  const dm = new THREE.InstancedMesh(ge, new THREE.MeshStandardMaterial({ color: '#b8cde0', roughness: 0.08, metalness: 0.1, envMapIntensity: 1.5 }), n);
  const rg = new THREE.RingGeometry(0.1, 0.13, 18); rg.rotateX(-Math.PI / 2); const rm = new THREE.InstancedMesh(rg, new THREE.MeshBasicMaterial({ color: '#a9c2d6', transparent: true, opacity: 0.32, depthWrite: false }), n);
  dm.frustumCulled = rm.frustumCulled = false; g.add(dm, rm);
  const D = []; for (let i = 0; i < n; i++) { const s = 8 + r() * 135, w = T.wid(s) * 0.34 * (r() * 2 - 1), h = T.hgt(s) * 0.93, p = 1.4 + r() * 2.2, ph = r() * p; D.push({ p0: T.pt(s, w, h), f: T.pt(s, w, 0.09), h, per: p, ph }); }
  const M = new THREE.Matrix4(), sc = v3(), q = new THREE.Quaternion(), P = v3();
  g.update = (t) => D.forEach((d, i) => { const a = ((t + d.ph) % d.per) - 0.3, tf = Math.sqrt(d.h * 2 / 60); if (a > 0 && a < tf) { P.copy(d.p0); P.y -= 30 * a * a; M.compose(P, q, sc.set(1, 1, 1)); } else M.makeScale(0, 0, 0); dm.setMatrixAt(i, M); const b = a - tf; if (b > 0 && b < 0.55) { M.compose(d.f, q, sc.setScalar(0.4 + b * 5)); } else M.makeScale(0, 0, 0); rm.setMatrixAt(i, M); }), g.update(0);
  const u = g.update; g.update = (t) => { u(t); dm.instanceMatrix.needsUpdate = true; rm.instanceMatrix.needsUpdate = true; };
  return g;
}

// the hillside the tunnel opens from: a rock face radiating out of the mouth's own outline, and the clearing in front of it
export function hillside(T) {
  const g = new THREE.Group(), R = 72, Q = 40, pos = [], uv = [], col = [], idx = [], W0 = T.wid(0) + 0.5, H0 = T.hgt(0) + 0.4;
  const n2 = makeNoise(17);
  for (let j = 0; j <= Q; j++) for (let i = 0; i <= R; i++) {
    const a = (i / R) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), u = j / Q, d = u * u * 240 + u * 10, lump = (n2.fbm(c * 3 + 7 + u * 3, s * 3 + 3 + u * 6, 4) - 0.5) * (1.2 + d * 0.22);
    const bx = (W0 / 2) * Math.sign(c) * Math.pow(Math.abs(c), 0.72), by = H0 / 2 + (H0 / 2) * Math.sign(s) * Math.pow(Math.abs(s), s < 0 ? 0.5 : 0.9);
    const rx = bx + c * (d + lump), ry = by + s * (d * 0.8 + lump * 0.6);
    pos.push(rx, ry, -d * 0.2 + lump * 0.8 - 0.05); uv.push(c * (2 + d / 9), s * (2 + d / 9));
    const v = 0.62 + 0.5 * n2.fbm(c * 9 + u * 9, s * 9, 3); col.push(v, v * 0.97, v * 0.9);
  }
  for (let j = 0; j < Q; j++) for (let i = 0; i < R; i++) { const a = j * (R + 1) + i, b = a + R + 1, c = a + 1, d = b + 1; idx.push(a, b, c, c, b, d); }
  const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); ge.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); ge.setIndex(idx); ge.computeVertexNormals();
  const M = rockMaps(); const rock = new THREE.Mesh(ge, new THREE.MeshStandardMaterial({ color: '#8d8878', vertexColors: true, map: M.map, normalMap: M.normalMap, roughness: 0.82, envMapIntensity: 0.7 })); rock.receiveShadow = true; rock.castShadow = false; g.add(rock);
  const b = new Batch(); b.box(surf('grass', '#4a5a38', { roughness: 1 }), 620, 0.4, 420, 0, -0.2, 210, { r: 0.02 }); b.box(paint('#4c4136', { roughness: 0.96 }), 14, 0.08, 62, 0, 0.03, 32, { r: 0.02 }); b.done(g);
  return g;
}

// ---- the search team's kit ----
export function floodTripod(o = {}) {
  const g = new THREE.Group(), b = new Batch(), fr = paint('#23262c', { metalness: 0.6, roughness: 0.42 }), h = o.h ?? 8.4;
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.4; b.cyl(fr, 0.07, 0.09, h * 1.02, Math.cos(a) * 1.0, h * 0.48, Math.sin(a) * 1.0, { rx: Math.sin(a) * 0.24, rz: -Math.cos(a) * 0.24, seg: 8 }); }
  b.cyl(fr, 0.09, 0.09, 1.0, 0, h + 0.2, 0, { seg: 8 });
  b.box(paint('#d8a51c', { roughness: 0.5 }), 2.5, 1.6, 0.46, 0, h + 1.2, 0, { r: 0.08 });
  b.done(g);
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.25), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4d8').multiplyScalar(0.92) })); lens.position.set(0, h + 1.2, 0.24); lens.userData.noAO = true; g.add(lens); g.lens = lens;
  return g;
}
export function cautionTape(a, b) {
  const g = new THREE.Group(), len = a.distanceTo(b), t = canvasTex(1024, 64, (x, w, h) => { x.fillStyle = '#e8c018'; x.fillRect(0, 0, w, h); x.fillStyle = '#17171b'; x.font = '900 46px ITTInter, sans-serif'; for (let i = 0; i < 5; i++) x.fillText('SEARCH AREA', 12 + i * 208, 49); }); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.x = len / 18;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.36, 18, 1), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, side: THREE.DoubleSide })); const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i) / len + 0.5; p.setY(i, p.getY(i) - Math.sin(Math.PI * u) * 0.34); } m.geometry.computeVertexNormals(); m.position.copy(a).lerp(b, 0.5); m.rotation.y = Math.atan2(a.z - b.z, b.x - a.x); m.receiveShadow = true; g.add(m); return g;
}
export function tapePost() { const b = new Batch(); b.cyl(paint('#d8611a', { roughness: 0.6 }), 0.09, 0.1, 3.9, 0, 1.95, 0, { seg: 10 }); b.cyl(paint('#2a2b2f', { roughness: 0.7 }), 0.46, 0.5, 0.12, 0, 0.06, 0, { seg: 14 }); return b.done(); }
export function rescueRadio() {
  const b = new Batch(), bd = paint('#1e2126', { roughness: 0.48 }), gr = paint('#3a3e45', { roughness: 0.6 }); b.box(bd, 0.62, 1.16, 0.28, 0, 0, 0, { r: 0.07 }); b.box(gr, 0.46, 0.44, 0.03, 0, -0.26, 0.15, { r: 0.012 }); b.cyl(bd, 0.05, 0.05, 1.0, 0.18, 1.04, 0, { seg: 8 });
  const g = b.done(); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb24a').multiplyScalar(0.9) })); scr.position.set(0, 0.26, 0.145); scr.userData.noAO = true; g.add(scr); g.led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#35ff66' })); g.led.position.set(-0.2, 0.5, 0.15); g.led.userData.noAO = true; g.add(g.led); g.scr = scr; return g;
}
export function rescueTruck(o = {}) {
  const g = new THREE.Group(), b = new Batch(), red = paint(o.color ?? '#b2281e', { roughness: 0.34, metalness: 0.15 }), blk = paint('#17181c', { roughness: 0.6 }), gl = paint('#2a3a48', { roughness: 0.12, metalness: 0.3 }), wh = paint('#e8e6df', { roughness: 0.4 });
  b.box(red, 7, 3.4, 15, 0, 3.9, 0, { r: 0.35 }); b.box(wh, 7.06, 0.8, 15.05, 0, 3.4, 0, { r: 0.04 }); b.box(gl, 6.2, 1.4, 0.1, 0, 5.0, 7.5, { r: 0.05 }); b.box(gl, 0.1, 1.2, 2.4, 3.52, 5.0, 5.0, { r: 0.04 }); b.box(gl, 0.1, 1.2, 2.4, -3.52, 5.0, 5.0, { r: 0.04 });
  for (const [x, z] of [[-3.4, 4.6], [3.4, 4.6], [-3.4, -4.6], [3.4, -4.6]]) b.cyl(blk, 1.25, 1.25, 0.9, x, 1.25, z, { rz: Math.PI / 2, seg: 18 });
  b.box(blk, 7.2, 0.9, 0.5, 0, 1.9, 7.6, { r: 0.08 }); b.box(blk, 5.6, 0.4, 0.7, 0, 5.85, 3, { r: 0.1 });
  b.box(paint('#ff5a3a', { emissive: '#ff3a1a', emissiveIntensity: 0.4 }), 2.4, 0.32, 0.5, -1.6, 6.15, 3, { r: 0.08 }); b.box(paint('#4a8aff', { emissive: '#2a6aff', emissiveIntensity: 0.4 }), 2.4, 0.32, 0.5, 1.6, 6.15, 3, { r: 0.08 });
  b.done(g);
  const t = canvasTex(512, 96, (x, w, h) => { x.fillStyle = '#e8e6df'; x.fillRect(0, 0, w, h); x.fillStyle = '#17171b'; x.font = '900 62px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('SEARCH + RESCUE', w / 2, 70); }); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.76), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 })); s.position.set(3.54, 3.4, -1); s.rotation.y = Math.PI / 2; g.add(s);
  return g;
}
export function campTable() {
  const g = new THREE.Group(), b = new Batch(), m = paint('#8d9196', { metalness: 0.5, roughness: 0.4 }); b.box(paint('#d9d5c8', { roughness: 0.7 }), 7, 0.2, 3.4, 0, 3.0, 0, { r: 0.05 }); for (const [x, z] of [[-3.2, -1.4], [3.2, -1.4], [-3.2, 1.4], [3.2, 1.4]]) b.cyl(m, 0.08, 0.08, 3, x, 1.5, z, { seg: 8 }); b.done(g);
  const t = canvasTex(512, 360, (x, w, h) => { x.fillStyle = '#ded8c2'; x.fillRect(0, 0, w, h); x.strokeStyle = '#8a7a56'; x.lineWidth = 2; for (let i = 0; i < 16; i++) { x.beginPath(); x.ellipse(w * 0.52, h * 0.48, 40 + i * 22, 26 + i * 15, 0.4, 0, 7); x.stroke(); } x.strokeStyle = '#c0211a'; x.lineWidth = 7; x.setLineDash([16, 10]); x.beginPath(); x.moveTo(60, 330); x.bezierCurveTo(180, 240, 240, 190, 270, 170); x.stroke(); }); t.colorSpace = THREE.SRGBColorSpace;
  const mp = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.5), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })); mp.rotation.x = -Math.PI / 2; mp.position.set(-0.8, 3.12, 0); g.add(mp);
  return g;
}

// pale faces pushing out of the rock and the eyes behind them, for "dozens of voices"
export function wallFaces(T, canvases, o = {}) {
  const g = new THREE.Group(), r = rng(o.seed ?? 8), n = o.n ?? 34, mats = canvases.map((c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.04, roughness: 0.7, depthWrite: false, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.28 }); });
  const skin = new THREE.MeshStandardMaterial({ color: '#b4ab9e', roughness: 0.58, emissive: '#5a544c', emissiveIntensity: 0.34 }), head = new RoundedBoxGeometry(1.25, 1.25, 0.9, 3, 0.26), face = new THREE.PlaneGeometry(1.32, 1.32);
  const F = [];
  for (let i = 0; i < n; i++) {
    const s = (o.s0 ?? 92) + r() * (o.span ?? 44), W = T.wid(s), H = T.hgt(s), a = -0.4 + r() * (Math.PI + 0.8), lat = Math.cos(a) * W * 0.46, h = H * 0.5 + Math.sin(a) * H * 0.44, p = T.pt(s, lat, h), root = new THREE.Group(), sc = 0.5 + r() * 0.42;
    root.position.copy(p); root.scale.setScalar(sc); const hm = new THREE.Mesh(head, skin); root.add(hm); const fm = new THREE.Mesh(face, mats[i % mats.length]); fm.position.z = 0.47; fm.userData.noAO = true; root.add(fm);
    const toward = T.pt(s - 6, 0, H * 0.45); root.lookAt(toward); root.rotateZ((r() - 0.5) * 0.7); g.add(root); F.push({ root, fm, p0: p.clone(), d: toward.clone().sub(p).normalize(), ph: r() * 7, k: i % mats.length });
  }
  g.update = (t, k) => F.forEach((f) => { const out = (0.1 + 0.42 * (0.5 + 0.5 * Math.sin(t * 7 + f.ph))) * k; f.root.position.copy(f.p0).addScaledVector(f.d, out); f.fm.material = mats[(Math.floor(t * 11 + f.ph) % 2) * 1 + (f.k % 2) * 2 < mats.length ? (Math.floor(t * 11 + f.ph) % 2) + (f.k % 2) * 2 : 0]; f.root.visible = k > 0.02; });
  return g;
}
