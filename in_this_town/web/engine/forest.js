// Forest kit: stylised trees that hold up from a macro on the bark to a whole town of them, and names carved in trunks.
//   const trees = treeSet(scene, list);                 instanced trunks and crowns; trees.lean(fn) bends them at a target
//   const names = namePatches(scene, atlas, list);      every carved name in one instanced mesh; glows, waves and swaps by uniform
//   const oak = heroOak(scene, { pos });                the enormous oak: boughs, roots, knots that form a face
//   const p = heroPatch(trunk, { draw });               one carving redrawn from a canvas: scratches, timers
// Everything is seeded, and shaders move from uniforms, so a frame depends only on t.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { v3, rng, lerp } from './core.js';

// ---- bark: 2048 px, deep vertical fissures; the height map also makes the normals ----
let BARK = null;
function barkMaps() {
  if (BARK) return BARK;
  const S = 1024, h = new Float32Array(S * S), r = rng(77);
  const add = (cx, cy, rx, ry, a) => {
    const x0 = Math.floor(cx - rx * 2), x1 = Math.ceil(cx + rx * 2), y0 = Math.floor(cy - ry * 2), y1 = Math.ceil(cy + ry * 2);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
      if (d < 4) h[((y + S) % S) * S + ((x + S) % S)] += a * Math.exp(-d * 1.6);
    }
  };
  for (let i = 0; i < 2600; i++) add(r() * S, r() * S, 7 + r() * 14, 60 + r() * 110, 0.2 + r() * 0.3);   // bark plates, tall and overlapping
  for (let i = 0; i < 9000; i++) add(r() * S, r() * S, 1.5 + r() * 3.5, 2.5 + r() * 8, (r() - 0.5) * 0.34);       // grain
  let lo = 1e9, hi = -1e9; for (const v of h) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), im = x.createImageData(S, S);
  const n = document.createElement('canvas'); n.width = n.height = S; const nx = n.getContext('2d'), nm = nx.createImageData(S, S);
  const H = (i, j) => (h[((j + S) % S) * S + ((i + S) % S)] - lo) / (hi - lo);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const v = H(i, j), k = (j * S + i) * 4;
    const g = 92 + 163 * Math.pow(Math.min(1, v * 1.5), 1.25);
    im.data[k] = g; im.data[k + 1] = g * 0.97; im.data[k + 2] = g * 0.92; im.data[k + 3] = 255;
    const dx = (H(i - 1, j) - H(i + 1, j)) * 7, dy = (H(i, j - 1) - H(i, j + 1)) * 7, l = 1 / Math.hypot(dx, dy, 1);
    nm.data[k] = (dx * l * 0.5 + 0.5) * 255; nm.data[k + 1] = (-dy * l * 0.5 + 0.5) * 255; nm.data[k + 2] = (l * 0.5 + 0.5) * 255; nm.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0); nx.putImageData(nm, 0, 0);
  const wrap = (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const map = wrap(new THREE.CanvasTexture(c)); map.colorSpace = THREE.SRGBColorSpace;
  BARK = { map, normalMap: wrap(new THREE.CanvasTexture(n)) };
  return BARK;
}
const barkMats = new Map();
export function barkMat(color = '#6a5240') {
  if (!barkMats.has(color)) barkMats.set(color, new THREE.MeshStandardMaterial({ color, vertexColors: true, roughness: 0.92, ...barkMaps(), normalScale: new THREE.Vector2(1.1, 1.1) }));
  return barkMats.get(color);
}

// A tapered column with root flare. Above the roots it stays round, so carvings sit on it.
export function trunkGeo({ h = 20, r0 = 2, r1 = 1, flare = 1.2, root = 0.07, seed = 1, rings = 28, seg = 28, span = 7, lean = 0 }) {
  const r = rng(seed * 13 + 1), ph = r() * 6, lobes = 5 + Math.floor(r() * 3);
  const pos = [], uv = [], col = [], idx = [], circ = Math.max(1, Math.round(Math.PI * 2 * r0 / span));
  const moss = new THREE.Color('#7f8f4a'), base = new THREE.Color('#ffffff'), c = new THREE.Color();
  for (let j = 0; j <= rings; j++) {
    const v = Math.pow(j / rings, 1.5), y = v * h;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2, wave = Math.exp(-y / (h * root * 1.3));
      const rad = radiusAt({ h, r0, r1, flare, root }, y) * (1 + wave * (0.22 * Math.sin(a * lobes + ph) + 0.1 * Math.sin(a * (lobes + 3) + ph * 2)));
      pos.push(Math.sin(a) * rad + lean * v * v * h, y, Math.cos(a) * rad);
      uv.push((i / seg) * circ, y / span);
      const m = Math.max(0, (1 - y / (h * 0.32))) * (0.55 + 0.45 * Math.sin(a + ph));
      c.copy(base).lerp(moss, Math.min(0.85, m)); col.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + seg + 1; idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  // the seam column shares a position: average its normals so the trunk has no visible line
  const n = g.attributes.normal;
  for (let j = 0; j <= rings; j++) {
    const a = j * (seg + 1), b = a + seg, x = (n.getX(a) + n.getX(b)) / 2, y = (n.getY(a) + n.getY(b)) / 2, z = (n.getZ(a) + n.getZ(b)) / 2;
    n.setXYZ(a, x, y, z); n.setXYZ(b, x, y, z);
  }
  return g;
}
export const radiusAt = ({ h, r0, r1, flare, root = 0.07 }, y) => lerp(r0, r1, Math.pow(y / h, 0.75)) + flare * Math.exp(-y / (h * root));

// a tapered bough along points
function tube(pts, ra, rb, seed = 1, seg = 9, span = 7) {
  const curve = new THREE.CatmullRomCurve3(pts), n = Math.max(6, Math.round(curve.getLength() / 2.5)), fr = curve.computeFrenetFrames(n, false);
  const pos = [], uv = [], col = [], idx = [];
  const len = curve.getLength();
  for (let j = 0; j <= n; j++) {
    const p = curve.getPointAt(j / n), R = lerp(ra, rb, Math.pow(j / n, 0.8));
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2, N = fr.normals[j], B = fr.binormals[j], cs = Math.cos(a) * R, sn = Math.sin(a) * R;
      pos.push(p.x + N.x * cs + B.x * sn, p.y + N.y * cs + B.y * sn, p.z + N.z * cs + B.z * sn);
      uv.push(i / seg * Math.max(1, Math.round(R * 6 / span)), (j / n) * len / span); col.push(1, 1, 1);
    }
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + seg + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// one lumpy, faceted clump of leaves with colour baked in: light on top, deep underneath
function clump(cx, cy, cz, rad, r, detail, cols) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, col = new Float32Array(p.count * 3);
  const s1 = r() * 40, c = new THREE.Color(), dk = new THREE.Color(cols[0]), md = new THREE.Color(cols[1]), lt = new THREE.Color(cols[2]);
  const sq = 0.72 + r() * 0.16;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.2 * Math.sin(x * 3.1 + s1) * Math.cos(y * 2.7 + s1) + 0.13 * Math.sin(z * 4.3 + y * 3.3 + s1);
    p.setXYZ(i, cx + x * rad * k, cy + y * rad * k * sq, cz + z * rad * k);
    const u = y * 0.5 + 0.5;
    if (u < 0.5) c.copy(dk).lerp(md, u * 2); else c.copy(md).lerp(lt, (u - 0.5) * 2);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv');
  return g;
}

const LEAF_UNIFORMS = { uLeafT: { value: 0 }, uRustle: { value: 0 }, uLitC: { value: v3(0, 0, 0) }, uLitR: { value: -1 }, uLitCol: { value: new THREE.Color('#ff3d7e') }, uLitI: { value: 1.2 } };
export const leafLight = (c, r, col, i = 1.2) => { LEAF_UNIFORMS.uLitC.value.copy(c); LEAF_UNIFORMS.uLitR.value = r; if (col) LEAF_UNIFORMS.uLitCol.value.set(col); LEAF_UNIFORMS.uLitI.value = i; };
export const leafTime = (t, rustle) => { LEAF_UNIFORMS.uLeafT.value = t; LEAF_UNIFORMS.uRustle.value = rustle; };
const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.82 });
leafMat.onBeforeCompile = (s) => {
  Object.assign(s.uniforms, LEAF_UNIFORMS);
  s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLW; uniform vec3 uLitC, uLitCol; uniform float uLitR, uLitI;').replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    if (uLitR >= 0.0) { float lk = smoothstep(0.0, 40.0, uLitR - distance(vLW.xz, uLitC.xz)); totalEmissiveRadiance += uLitCol * lk * uLitI * (0.2 + 0.8 * clamp((46.0 - vLW.y) / 34.0, 0.0, 1.0)); diffuseColor.rgb *= 1.0 - 0.8 * lk; }`);
  s.vertexShader = s.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
    #ifdef USE_INSTANCING
      vLW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
    #else
      vLW = (modelMatrix * vec4(transformed, 1.0)).xyz;
    #endif`);
  s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uLeafT, uRustle; varying vec3 vLW;').replace('#include <begin_vertex>', `#include <begin_vertex>
    #ifdef USE_INSTANCING
      float lph = dot(instanceMatrix[3].xyz, vec3(0.13, 0.0, 0.17));
      transformed += vec3(sin(uLeafT * 3.1 + lph + position.y * 0.5), 0.5 * sin(uLeafT * 2.3 + lph * 1.7 + position.x * 0.4), cos(uLeafT * 2.7 + lph + position.x * 0.5)) * (0.1 + uRustle);
    #endif`);
};

// a tree shape: trunk and boughs as one geometry, its crown as another, both with origin at the root
export function treeShape({ span = 7, seed = 1, h = 20, r0 = 2, r1 = 0.9, spread = 13, clumps = 13, detail = 2, cols = ['#14351f', '#2c6a33', '#6db04a'], flare = 1, root = 0.07 }) {
  const r = rng(seed * 31 + 7), parts = [trunkGeo({ h, r0, r1, flare, root, seed, span })], crown = [];
  const nb = 4 + Math.floor(r() * 3), ends = [];
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + r() * 0.8, y0 = h * (0.62 + r() * 0.3), d = spread * (0.55 + r() * 0.35), up = h * (0.28 + r() * 0.24);
    const e = v3(Math.cos(a) * d, y0 + up, Math.sin(a) * d);
    ends.push(e);
    parts.push(tube([v3(0, y0 - 1, 0), v3(Math.cos(a) * d * 0.45, y0 + up * 0.28, Math.sin(a) * d * 0.45), e], r1 * 0.72, 0.16, seed + i));
  }
  for (let i = 0; i < clumps; i++) {
    const e = ends[i % nb], top = i >= nb * 2;
    const x = top ? (r() - 0.5) * spread * 0.9 : e.x + (r() - 0.5) * spread * 0.5, z = top ? (r() - 0.5) * spread * 0.9 : e.z + (r() - 0.5) * spread * 0.5;
    const y = top ? h * 1.32 + r() * h * 0.22 : e.y + (r() - 0.3) * h * 0.14;
    crown.push(clump(x, y, z, spread * (0.36 + r() * 0.26), r, detail, cols));
  }
  const bark = mergeGeometries(parts.map((g) => g.toNonIndexed ? (g.index ? g.toNonIndexed() : g) : g), false);
  const leaves = mergeGeometries(crown.map((g) => g.index ? g.toNonIndexed() : g), false);
  leaves.computeVertexNormals();
  return { bark, leaves, h, r0, r1, flare, pivot: h * 0.72, geo: { h, r0, r1, flare, root } };
}

// list: [{ x, z, s, yaw, shape }]; shapes: from treeShape. lean(fn): fn(tree) -> { angle, dir } each frame, or null
export function treeSet(scene, shapes, list, o = {}) {
  const groups = shapes.map((sh, k) => {
    const items = list.filter((t) => t.shape === k), n = Math.max(1, items.length);
    const bark = new THREE.InstancedMesh(sh.bark, o.bark || barkMat(), n), leaves = new THREE.InstancedMesh(sh.leaves, leafMat, n);
    for (const m of [bark, leaves]) { m.castShadow = o.shadows !== false; m.receiveShadow = true; m.frustumCulled = false; m.count = items.length; scene.add(m); }
    const c = new THREE.Color();
    items.forEach((t, i) => { const v = 0.82 + ((t.x * 12.9 + t.z * 7.3) % 1 + 1) % 1 * 0.3; leaves.setColorAt(i, c.setRGB(v, v, v * 0.92)); });
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    return { sh, items, bark, leaves };
  });
  const M = new THREE.Matrix4(), B = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), A = new THREE.Matrix4(), ax = v3(0, 0, 0), s = v3(1, 1, 1);
  const P1 = new THREE.Matrix4(), P2 = new THREE.Matrix4(), R = new THREE.Matrix4();
  const set = {
    groups,
    baseMatrix(t, lean, out) {   // trunk: base transform with its lean
      q.setFromEuler(e.set(0, t.yaw, 0)); s.setScalar(t.s); out.compose(v3(t.x, 0, t.z), q, s);
      if (lean && lean.angle) { ax.set(lean.dir.z, 0, -lean.dir.x).normalize(); out.premultiply(A.makeTranslation(-t.x, 0, -t.z)).premultiply(R.makeRotationAxis(ax, lean.angle)).premultiply(A.makeTranslation(t.x, 0, t.z)); }
      return out;
    },
    pose(fn) {
      for (const g of groups) {
        g.items.forEach((t, i) => {
          const l = fn ? fn(t) : null;
          set.baseMatrix(t, l, B); g.bark.setMatrixAt(i, B);
          if (l && l.angle) {   // the crown bends further than the trunk, from the top of the trunk
            const py = g.sh.pivot * t.s;
            ax.set(l.dir.z, 0, -l.dir.x).normalize();
            const top = v3(0, g.sh.pivot, 0).applyMatrix4(B);
            M.copy(B).premultiply(P1.makeTranslation(-top.x, -top.y, -top.z)).premultiply(R.makeRotationAxis(ax, l.angle * 0.9)).premultiply(P2.makeTranslation(top.x, top.y, top.z));
            g.leaves.setMatrixAt(i, M); void py;
          } else g.leaves.setMatrixAt(i, B);
        });
        g.bark.instanceMatrix.needsUpdate = true; g.leaves.instanceMatrix.needsUpdate = true;
      }
    },
  };
  set.pose(null);
  return set;
}

// ---- the oak ----
export function heroOak(scene, o = {}) {
  const pos = o.pos || v3(0, 0, 0), g = new THREE.Group(); g.position.copy(pos); if (o.yaw) g.rotation.y = o.yaw; scene.add(g);
  const r = rng(o.seed || 41), H = 58, R0 = 11, R1 = 6, geo = { h: H, r0: R0, r1: R1, flare: 8, root: 0.05 };
  const parts = [trunkGeo({ ...geo, seed: 5, rings: 46, seg: 64, span: 5 })], crown = [], ends = [];
  const cols = ['#0d2a1a', '#21552c', '#5fa043'];
  for (let i = 0; i < 11; i++) {    // main boughs, each forking
    const a = (i / 11) * Math.PI * 2 + r() * 0.35, y0 = H * (0.66 + r() * 0.3), d = 34 + r() * 30, up = 14 + r() * 26;
    const m1 = v3(Math.cos(a) * d * 0.42, y0 + up * 0.25, Math.sin(a) * d * 0.42), e = v3(Math.cos(a) * d, y0 + up, Math.sin(a) * d);
    parts.push(tube([v3(0, y0 - 5, 0), m1, e], 4.2 - r(), 0.8, 20 + i, 12, 9));
    for (let k = 0; k < 3; k++) {
      const a2 = a + (r() - 0.5) * 1.7, f = v3(e.x + Math.cos(a2) * 18, e.y + 2 + r() * 16, e.z + Math.sin(a2) * 18);
      parts.push(tube([m1.clone().lerp(e, 0.55 + k * 0.15), e.clone().lerp(f, 0.5).add(v3(0, 3, 0)), f], 1.5, 0.22, 40 + i * 3 + k, 8, 9));
      ends.push(f);
    }
  }
  for (let i = 0; i < 10; i++) {   // roots that run along the ground; they stay out of the path (+z)
    const a = (i / 10) * Math.PI * 2 + 0.3 + r() * 0.3, d = 24 + r() * 16;
    parts.push(tube([v3(Math.sin(a) * 9, 3.4, Math.cos(a) * 9), v3(Math.sin(a) * (d * 0.55), 1.2, Math.cos(a) * (d * 0.55)), v3(Math.sin(a + 0.2) * d, -0.5, Math.cos(a + 0.2) * d)], 2.9, 0.35, 70 + i, 10, 9));
  }
  for (const e of ends) for (let k = 0; k < 2; k++) crown.push(clump(e.x + (r() - 0.5) * 16, e.y + (r() - 0.3) * 8, e.z + (r() - 0.5) * 16, 12 + r() * 9, r, 2, cols));
  for (let i = 0; i < 24; i++) { const a = r() * 6.28, d = r() * 40; crown.push(clump(Math.cos(a) * d, H + 34 + r() * 22, Math.sin(a) * d, 13 + r() * 10, r, 2, cols)); }
  const bark = new THREE.Mesh(mergeGeometries(parts.map((p) => p.toNonIndexed()), false), barkMat('#5c4636'));
  bark.castShadow = bark.receiveShadow = true; g.add(bark);
  const lg = mergeGeometries(crown.map((p) => (p.index ? p.toNonIndexed() : p)), false); lg.computeVertexNormals();
  const leaves = new THREE.InstancedMesh(lg, leafMat, 1); leaves.setMatrixAt(0, new THREE.Matrix4()); leaves.castShadow = leaves.receiveShadow = true; leaves.frustumCulled = false; g.add(leaves);

  // the face: three knots with something lit behind them
  const c = document.createElement('canvas'); c.width = c.height = 128;
  { const x = c.getContext('2d'), d = x.createRadialGradient(64, 70, 2, 64, 64, 64); d.addColorStop(0, '#fff'); d.addColorStop(0.28, '#9a9a9a'); d.addColorStop(0.7, '#262626'); d.addColorStop(1, '#000'); x.fillStyle = d; x.fillRect(0, 0, 128, 128); }
  const glowM = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const dark = new THREE.MeshStandardMaterial({ color: '#0b0a08', roughness: 1 });
  const rimM = barkMat('#6e533e');
  const knot = (y, a, rx, ry, tilt) => {
    const k = new THREE.Group(), rad = radiusAt(geo, y), arr = new THREE.Group();
    k.position.set(Math.sin(a) * rad, y, Math.cos(a) * rad); k.rotation.y = a; k.rotation.z = 0; arr.rotation.z = tilt; k.add(arr);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 10, 36), rimM); ring.scale.set(rx, ry, 1.6); ring.castShadow = true;
    const hole = new THREE.Mesh(new THREE.CircleGeometry(1, 32), dark); hole.scale.set(rx * 0.98, ry * 0.98, 1); hole.position.z = 0.12;
    const fire = new THREE.Mesh(new THREE.CircleGeometry(1, 32), glowM.clone()); fire.scale.set(rx * 0.95, ry * 0.92, 1); fire.position.z = 0.2; fire.userData.noAO = true;
    ring.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ring.geometry.attributes.position.count * 3).fill(1), 3));
    arr.add(ring, hole, fire); g.add(k); return fire;
  };
  const face = { mouth: knot(21, 0, 3.1, 1.25, 0), eyes: [knot(30, -0.3, 1.7, 0.62, 0.3), knot(30, 0.3, 1.7, 0.62, -0.3)] };
  const glow = (k) => { for (const f of [face.mouth, ...face.eyes]) { f.material.color.set('#7dffb0').multiplyScalar(k * 2.6); f.visible = k > 0.01; } };
  glow(0);
  return { group: g, geo, bark, leaves, face, glow, top: H };
}

// a clump of moss on a trunk, for hiding part of a carving: returns meshes that can fall one by one
export function mossPad(parent, r, y, a, w = 2.6, h = 1.7, seed = 3) {
  const rn = rng(seed), bits = [], cols = ['#1d3018', '#2e4a22', '#4a6a30'];
  const n = 5;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1) - 0.5) * w * 0.9, ang = a + u / r, ps = [];
    for (let k = 0; k < 9; k++) { const dy = (rn() - 0.5) * h, du = (rn() - 0.5) * w * 0.34; ps.push(clump(du, dy, 0, 0.26 + rn() * 0.26, rn, 2, cols)); }
    const g = mergeGeometries(ps.map((p) => (p.index ? p.toNonIndexed() : p)), false); g.scale(1, 1, 0.34); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
    m.position.set(Math.sin(ang) * (r + 0.12), y, Math.cos(ang) * (r + 0.12)); m.rotation.y = ang; m.castShadow = m.receiveShadow = true;
    parent.add(m); bits.push({ m, home: m.position.clone(), ang, seed: rn() });
  }
  return bits;
}

// ---- names in bark ----
// A carved word: letters a little uneven, as if cut by hand. R = the cut, G = a slash through it, B = a soft halo.
const CW = 1024, CH = 256;
export function nameAtlas(names) {
  const cols = 2, rows = Math.ceil(names.length / cols);
  const c = document.createElement('canvas'); c.width = CW * cols; c.height = CH * rows;
  const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  const cells = {};
  names.forEach((nm, i) => {
    const cx = (i % cols) * CW, cy = Math.floor(i / cols) * CH, r = rng(i * 91 + 11), slash = nm[0] === '~', word = slash ? nm.slice(1) : nm;
    const m = document.createElement('canvas'); m.width = CW; m.height = CH; const g = m.getContext('2d');
    carveWord(g, word, CW / 2, CH / 2, CW * 0.92, CH * 0.74, r, '#fff');
    const h = document.createElement('canvas'); h.width = CW; h.height = CH; const hx = h.getContext('2d');
    hx.filter = 'blur(22px)'; hx.drawImage(m, 0, 0); hx.filter = 'blur(9px)'; hx.globalAlpha = 0.8; hx.drawImage(m, 0, 0); hx.globalAlpha = 1; hx.filter = 'none';
    const s = document.createElement('canvas'); s.width = CW; s.height = CH; const sx = s.getContext('2d');
    if (slash) {
      sx.strokeStyle = '#fff'; sx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { sx.lineWidth = 11 + r() * 8; sx.beginPath(); sx.moveTo(CW * 0.05, CH * (0.5 + (r() - 0.5) * 0.5)); sx.lineTo(CW * 0.95, CH * (0.5 + (r() - 0.5) * 0.5)); sx.stroke(); }
    }
    x.globalCompositeOperation = 'lighter';
    const tint = (src, col) => { const q = document.createElement('canvas'); q.width = CW; q.height = CH; const qx = q.getContext('2d'); qx.drawImage(src, 0, 0); qx.globalCompositeOperation = 'source-in'; qx.fillStyle = col; qx.fillRect(0, 0, CW, CH); x.drawImage(q, cx, cy); };
    tint(m, '#f00'); tint(s, '#0f0'); tint(h, '#00f');
    x.globalCompositeOperation = 'source-over';
    cells[nm] = i;
  });
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.generateMipmaps = true;
  return { tex: t, cells, cols, rows };
}
export function carveWord(g, word, cx, cy, maxW, H, r, fill) {
  g.textBaseline = 'middle'; g.fillStyle = fill;
  let size = H; g.font = `900 ${size}px ITTInter, sans-serif`;
  const gap = size * 0.06, width = () => [...word].reduce((a, ch) => a + g.measureText(ch).width + gap, -gap);
  if (width() > maxW) { size *= maxW / width(); g.font = `900 ${size}px ITTInter, sans-serif`; }
  let x = cx - width() / 2;
  for (const ch of word) {
    const w = g.measureText(ch).width;
    g.save(); g.translate(x + w / 2, cy + (r() - 0.5) * size * 0.1); g.rotate((r() - 0.5) * 0.12); g.textAlign = 'center'; g.fillText(ch, 0, 0); g.restore();
    x += w + size * 0.06;
  }
}

// every carving in one mesh. list: [{ m: Matrix4 (trunk base), y, r, a (angle round the trunk), name, on, dead }]
// uniforms: uT; uDim (all out); uWave (radius of a re-lighting wave); uAlt* (a word that replaces every name, spreading from a centre)
export function namePatches(scene, atlas, list, o = {}) {
  const arc = o.arc ?? 1.95, g = new THREE.CylinderGeometry(1, 1, 1, 22, 1, true, -arc / 2, arc);
  const mesh = new THREE.InstancedMesh(g, null, list.length);
  const cell = new Float32Array(list.length * 2), on = new Float32Array(list.length), dead = new Float32Array(list.length);
  list.forEach((p, i) => { cell[i * 2] = p.cell % atlas.cols; cell[i * 2 + 1] = Math.floor(p.cell / atlas.cols); on[i] = p.on ?? 0; dead[i] = p.dead ? 1 : 0; });
  g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 2)); g.setAttribute('aOn', new THREE.InstancedBufferAttribute(on, 1)); g.setAttribute('aDead', new THREE.InstancedBufferAttribute(dead, 1));
  const U = { atlas: { value: atlas.tex }, grid: { value: new THREE.Vector2(atlas.cols, atlas.rows) }, uT: { value: 0 }, uDim: { value: 0 }, uFlare: { value: 0 },
    uCentre: { value: v3(0, 0, 0) }, uWave: { value: 1e6 }, uAltR: { value: -1 }, uAltCell: { value: new THREE.Vector2(0, 0) }, uAltColor: { value: new THREE.Color('#ff3d6e') },
    uColor: { value: new THREE.Color(o.color || '#6dffb2') }, uHot: { value: new THREE.Color('#f4fff0') }, uBright: { value: o.bright ?? 2.6 } };
  mesh.material = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, side: THREE.FrontSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: `attribute vec2 aCell; attribute float aOn, aDead; varying vec2 vUv; varying vec2 vCell; varying float vOn, vDead, vDist, vAlt;
      uniform vec3 uCentre; uniform float uAltR;
      void main(){ vUv = uv; vCell = aCell; vOn = aOn; vDead = aDead;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vDist = distance(w.xz, uCentre.xz);
        vec4 mv = viewMatrix * w; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vUv; varying vec2 vCell; varying float vOn, vDead, vDist;
      uniform sampler2D atlas; uniform vec2 grid, uAltCell; uniform float uT, uDim, uWave, uAltR, uBright, uFlare; uniform vec3 uColor, uHot, uAltColor;
      vec3 cellAt(vec2 c){ return texture2D(atlas, vec2((c.x + vUv.x) / grid.x, 1.0 - (c.y + 1.0 - vUv.y) / grid.y)).rgb; }
      void main(){
        float alt = uAltR < 0.0 ? 0.0 : smoothstep(0.0, 14.0, uAltR - vDist);
        vec3 a = mix(cellAt(vCell), cellAt(uAltCell), step(0.5, alt));
        float dead = vDead * (1.0 - step(0.5, alt));
        float lit = smoothstep(vOn, vOn + 0.45, uT) * (0.82 + 0.18 * sin(uT * 3.0 + vOn * 9.0));
        float flare = 1.0 + 1.6 * exp(-max(0.0, uT - vOn) * 2.0);
        float relit = smoothstep(0.0, 18.0, uWave - vDist);
        lit *= mix(1.0 - uDim, 1.0, relit) * (1.0 - dead * 0.97);
        vec3 col = mix(uColor, uAltColor, step(0.5, alt));
        float core = smoothstep(0.35, 0.6, a.r);
        vec3 glow = (col * (core * 1.0 + a.b * 0.55) + uHot * core * core * 0.5) * uBright * flare * lit;
        vec3 slash = vec3(1.0, 0.12, 0.05) * smoothstep(0.3, 0.7, a.g) * dead * 1.5 * (1.0 - uDim * 0.7);
        float cut = max(core * 0.92, smoothstep(0.3, 0.7, a.g) * dead * 0.9);
        vec3 ember = vec3(0.34, 0.1, 0.04) * core * dead * 0.5;
        gl_FragColor = vec4(glow + slash + ember, cut); }` });
  mesh.userData.noAO = true; mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.castShadow = false;
  const M = new THREE.Matrix4(), L = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const set = {
    mesh, U, list,
    place(p, i, base) {
      const w = p.r * 1.045, hh = p.r * arc / 4 * (p.tall ?? 1);
      L.compose(v3(0, p.y, 0), q.setFromEuler(e.set(0, p.a, 0)), v3(w, hh, w));
      mesh.setMatrixAt(i, M.multiplyMatrices(base, L));
    },
    done() { mesh.instanceMatrix.needsUpdate = true; },
  };
  scene.add(mesh);
  return set;
}

// One carving on a big trunk, painted from canvases: `draw(carve, glow, state)` repaints when state's key changes.
// carve = dark cuts with alpha, glow = what shines. Sits at radius r round the trunk's axis, facing angle a.
export function heroPatch(parent, o) {
  const { r, r2 = r, y, a = 0, arc = 2.6, h = 3, px = 4096 } = o, W = px, H = Math.round(px * h / (r * arc));
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const carve = mk(), glow = mk(), cx = carve.getContext('2d'), gx = glow.getContext('2d');
  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const tc = tex(carve), tg = tex(glow);
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: { tc: { value: tc }, tg: { value: tg }, uI: { value: 1 } },
    vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 v; uniform sampler2D tc, tg; uniform float uI;
      void main(){ vec4 c = texture2D(tc, v); vec3 g = texture2D(tg, v).rgb;
        gl_FragColor = vec4(c.rgb * c.a * 0.2 + g * uI, c.a); }` });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r2, h, 48, 1, true, a - arc / 2, arc), m);
  mesh.position.y = y; mesh.userData.noAO = true; mesh.renderOrder = 3; parent.add(mesh);
  let key = null;
  return { mesh, W, H, set(state) {
    const k = JSON.stringify(state); if (k === key) return; key = k;
    cx.clearRect(0, 0, W, H); gx.fillStyle = '#000'; gx.fillRect(0, 0, W, H);
    o.draw(cx, gx, state, W, H); tc.needsUpdate = true; tg.needsUpdate = true;
  }, intensity(i) { m.uniforms.uI.value = i; } };
}

// a soft pool of lamp light on the ground, as a card
let POOL = null;
export function lightPool(parent, x, y, z, size, color, amount = 0.35) {
  if (!POOL) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), d = g.createRadialGradient(64, 64, 2, 64, 64, 64); d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.4, 'rgba(255,255,255,0.4)'); d.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = d; g.fillRect(0, 0, 128, 128); POOL = new THREE.CanvasTexture(c); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: POOL, color, transparent: true, opacity: amount, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.userData.noAO = true; m.renderOrder = 1; parent.add(m); return m;
}
