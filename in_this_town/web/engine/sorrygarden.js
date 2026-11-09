// The Sorry Garden (Flower Man remake 1): flowers that grow on skin, and the town of Larkspur.
//   flowerGeo('dahlia' | 'buttercup' | 'thistle') a unit bloom, +y is outward; flowerMesh(kind, size, tint) one bloom
//   skinBlooms(c, { count, kind, size, seed, face }) blooms on the outermost surface of a posed-at-rest character: .apply((item, i) => scale)
//   petalDust(scene, [{ t, p, n, wind, cols }]) crumbling petals, a pure function of t: .update(t)
//   greenhouse() (.setBroken(0/1), .setBoards(0/1), .front), breadCart() (.spin(a)), gardenBench() (.seatY), sickBed() (.top), ruthRoom(), larkspur(scene)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { v3, rng, clamp, lerp } from './core.js';
import { Batch, surf, paint } from './kit.js';
import { canvasTex } from './props.js';
import { cottage, picket, mailbox, flowers, wallpaper, WIN } from './pastel.js';
import { treeShape } from './forest.js';

// ---- blooms ----
const C = (h) => new THREE.Color(h);
function petal(len, wid, curl, a, b, seg = 4) {
  const pos = [], col = [], idx = [], c = new THREE.Color();
  for (let i = 0; i <= seg; i++) { const u = i / seg, w = wid * Math.pow(Math.sin(Math.PI * Math.min(0.98, u * 0.92 + 0.04)), 0.55); for (let j = -1; j <= 1; j++) { pos.push(u * len, curl * u * u + Math.abs(j) * wid * 0.22, j * w * 0.5); c.copy(a).lerp(b, Math.pow(u, 0.7) * (j === 0 ? 0.82 : 1)); col.push(c.r, c.g, c.b); } }
  for (let i = 0; i < seg; i++) for (let j = 0; j < 2; j++) { const p = i * 3 + j; idx.push(p, p + 1, p + 3, p + 1, p + 4, p + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function ring(out, n, geo, tilt, y, ph = 0) { for (let i = 0; i < n; i++) { const g = geo.clone(); g.rotateZ(tilt); g.rotateY(ph + (i / n) * Math.PI * 2); g.translate(0, y, 0); out.push(g); } }
function colored(g, col) { const c = C(col), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }
const CACHE = {};
export function flowerGeo(kind) {
  if (CACHE[kind]) return CACHE[kind];
  const out = [];
  if (kind === 'dahlia') {
    const a = C('#06030a'), b = C('#3b1852');
    const rings = [[14, 0.5, 0.2, 0.14, 0.03], [12, 0.42, 0.19, 0.42, 0.06], [10, 0.33, 0.16, 0.72, 0.1], [8, 0.24, 0.13, 1.02, 0.14], [6, 0.15, 0.1, 1.3, 0.18]];
    rings.forEach(([n, len, w, tilt, y], k) => ring(out, n, petal(len, w, 0.05, a, k === 0 ? C('#4a1d66') : b), tilt, y, k * 0.31));
  } else if (kind === 'buttercup') {
    ring(out, 5, petal(0.46, 0.46, 0.14, C('#f7b500'), C('#ffe83d')), 0.32, 0.02);
    out.push(colored(new THREE.IcosahedronGeometry(0.1, 1), '#e8930a').translate(0, 0.1, 0));
  } else if (kind === 'thistle') {
    out.push(colored(new THREE.IcosahedronGeometry(0.2, 2).scale(1, 0.85, 1), '#3f7f3c').translate(0, 0.12, 0));
    const r = rng(4), sp = petal(0.4, 0.05, 0.02, C('#7a2fc4'), C('#e091ff'), 2);
    for (let i = 0; i < 46; i++) { const g = sp.clone(), ph = r() * 6.28, el = 0.45 + r() * 1.1; g.rotateZ(el); g.rotateY(ph); g.translate(0, 0.24, 0); out.push(g); }
    const lf = petal(0.42, 0.14, -0.06, C('#2c5e2c'), C('#5ca24a'), 3); ring(out, 6, lf, 0.05, 0.0);
  }
  const clean = out.map((g) => { const k = g.index ? g.toNonIndexed() : g; for (const n of Object.keys(k.attributes)) if (!['position', 'normal', 'color'].includes(n)) k.deleteAttribute(n); return k; });
  return (CACHE[kind] = mergeGeometries(clean, false));
}
const bloomMat = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.roughness ?? 0.55, side: THREE.DoubleSide, ...o });
export function flowerMesh(kind, size = 1, tint) { const m = new THREE.Mesh(flowerGeo(kind), bloomMat(tint ? { color: tint } : {})); m.scale.setScalar(size); m.castShadow = true; m.userData.base = size; return m; }

// Rest-pose blooms on the character's outermost surface. Parented to each mesh, so every pose carries them.
export function skinBlooms(c, o = {}) {
  const r = rng(o.seed ?? 5), kinds = o.kinds || [[o.kind || 'dahlia', 1]], count = o.count ?? 200, sizeA = o.size?.[0] ?? 0.4, sizeB = o.size?.[1] ?? 0.72;
  c.root.updateMatrixWorld(true);
  const meshes = []; c.root.traverse((m) => { if (m.isMesh && m !== c.faceSheet && m.visible && m.geometry?.attributes?.position && !m.isInstancedMesh && !(m.material?.transparent)) meshes.push(m); });
  // per-triangle area table
  const tris = []; let total = 0; const a = v3(), b = v3(), d = v3(), e1 = v3(), e2 = v3();
  for (const m of meshes) { const g = m.geometry, P = g.attributes.position, I = g.index; const n = I ? I.count / 3 : P.count / 3; for (let i = 0; i < n; i++) { const ia = I ? I.getX(i * 3) : i * 3, ib = I ? I.getX(i * 3 + 1) : i * 3 + 1, ic = I ? I.getX(i * 3 + 2) : i * 3 + 2; a.fromBufferAttribute(P, ia); b.fromBufferAttribute(P, ib); d.fromBufferAttribute(P, ic); e1.subVectors(b, a); e2.subVectors(d, a); const ar = e1.cross(e2).length() * 0.5; if (ar < 1e-6) continue; total += ar; tris.push({ m, ia, ib, ic, cum: total }); } }
  const pick = (x) => { let lo = 0, hi = tris.length - 1; while (lo < hi) { const q = (lo + hi) >> 1; if (tris[q].cum < x) lo = q + 1; else hi = q; } return tris[lo]; };
  const hb = new THREE.Box3(); (c.headParts || []).forEach((m) => hb.expandByObject(m));
  const hc = hb.getCenter(v3()), hs = hb.getSize(v3());
  const ray = new THREE.Raycaster(); const items = [], want = [];
  let tries = 0;
  while (want.length < count && tries++ < count * 40) {
    const T = pick(r() * total), g = T.m.geometry, P = g.attributes.position;
    a.fromBufferAttribute(P, T.ia); b.fromBufferAttribute(P, T.ib); d.fromBufferAttribute(P, T.ic);
    let u = r(), v = r(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const p = a.clone().addScaledVector(e1.subVectors(b, a), u).addScaledVector(e2.subVectors(d, a), v), n = e1.clone().cross(e2).normalize();
    const pw = p.clone().applyMatrix4(T.m.matrixWorld), nw = n.clone().transformDirection(T.m.matrixWorld);
    // keep the face clear (eyes and mouth stay readable)
    if (!hb.isEmpty() && pw.y > hb.min.y - 0.15) {
      if (o.head === false) continue;
      if (nw.z > 0.18 && Math.abs(pw.x - hc.x) < hs.x * (o.faceX ?? 0.44) && pw.y < hb.max.y - hs.y * (o.faceTop ?? 0.07)) continue;
      if (o.faceSide != null && Math.abs(nw.x) > 0.5 && pw.z > hc.z - hs.z * o.faceSide) continue;
    }
    if (nw.y < -0.6) continue;   // soles, under the hem
    if (o.skip && o.skip(pw, nw)) continue;
    ray.set(pw.clone().addScaledVector(nw, 2.4), nw.clone().negate()); ray.far = 2.6;
    const hit = ray.intersectObjects(meshes, false)[0]; if (!hit || hit.distance < 2.4 - 0.08) continue;
    if (want.some((q) => q.pw.distanceToSquared(pw) < (o.gap ?? 0.09))) continue;
    let kx = r(), kind = kinds[0][0], acc = 0; const tot = kinds.reduce((s, q) => s + q[1], 0); for (const [nm, w] of kinds) { acc += w / tot; if (kx <= acc) { kind = nm; break; } }
    want.push({ m: T.m, kind, p, n, pw, s: lerp(sizeA, sizeB, r()), ph: r() * 6.28, y: pw.y });
  }
  // one instanced mesh per (part, kind)
  const groups = new Map();
  for (const w of want) { const k = w.m.uuid + w.kind; if (!groups.has(k)) groups.set(k, { m: w.m, kind: w.kind, list: [] }); groups.get(k).list.push(w); }
  const up = v3(0, 1, 0), mat = bloomMat(), col = new THREE.Color();
  for (const G of groups.values()) {
    const im = new THREE.InstancedMesh(flowerGeo(G.kind), mat, G.list.length); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; G.m.add(im); G.im = im;
    // undo the part's own scale so a bloom has one size everywhere
    G.list.forEach((w, i) => { w.im = im; w.i = i; w.q = new THREE.Quaternion().setFromUnitVectors(up, w.n).multiply(new THREE.Quaternion().setFromAxisAngle(up, w.ph)); w.last = -1; const v = 0.82 + r() * 0.32; im.setColorAt(i, col.setRGB(v, v * (0.92 + r() * 0.12), v)); items.push(w); });
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }
  const M = new THREE.Matrix4(), S = v3(), P0 = v3(); const dirty = new Set();
  const set = { items, apply(fn) { dirty.clear(); items.forEach((w, i) => { const k = Math.max(0, fn(w, i)); if (Math.abs(k - w.last) < 1e-3) return; w.last = k; const sz = w.s * k; M.compose(P0.copy(w.p).addScaledVector(w.n, 0.02), w.q, S.set(sz, sz, sz)); w.im.setMatrixAt(w.i, M); dirty.add(w.im); }); dirty.forEach((im) => { im.instanceMatrix.needsUpdate = true; }); },
    worldOf(w, out = v3()) { return out.copy(w.p).applyMatrix4(w.m.matrixWorld); } };
  set.apply(() => 0);
  return set;
}
// a pop with a little overshoot, 0..1 over `d` seconds
export const popK = (t, t0, d = 0.32) => { if (t <= t0) return 0; const u = clamp((t - t0) / d); const s = 1.9; const x = u - 1; return 1 + (s + 1) * x * x * x + s * x * x; };

// crumbling flowers: little dark flakes carried off on the wind
export function petalDust(scene, evs, o = {}) {
  const r = rng(o.seed ?? 11), all = [];
  for (const e of evs) { const n = e.n ?? 40, cols = e.cols || ['#2a1036', '#54206a', '#7b2f96', '#16081e']; for (let i = 0; i < n; i++) all.push({ t: e.t + r() * (e.spread ?? 0.35), p: e.p.clone().add(v3((r() - 0.5) * (e.r ?? 0.5), (r() - 0.5) * (e.r ?? 0.5), (r() - 0.5) * (e.r ?? 0.5))), v: v3((r() - 0.3) * 1.8, 0.4 + r() * 1.9, (r() - 0.5) * 1.8), wind: (e.wind || v3(4, 0.7, 1)).clone().multiplyScalar(0.7 + r() * 0.6), s: (e.size ?? 0.2) * (0.5 + r()), spin: v3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(11), c: cols[Math.floor(r() * cols.length)], life: (e.life ?? 2.6) * (0.65 + r() * 0.5), floor: e.floor ?? -50 }); }
  const g = new THREE.PlaneGeometry(1, 0.62); const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), Math.max(1, all.length)); im.frustumCulled = false; im.userData.noAO = true; scene.add(im);
  const col = new THREE.Color(); all.forEach((a, i) => im.setColorAt(i, col.set(a.c))); if (im.instanceColor) im.instanceColor.needsUpdate = true;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = v3(), S = v3(), hide = new THREE.Matrix4().makeScale(0, 0, 0);
  im.update = (t) => { all.forEach((a, i) => { const d = t - a.t; if (d < 0 || d > a.life) { im.setMatrixAt(i, hide); return; } const f = 1 - Math.exp(-d * 1.1); P.copy(a.p).addScaledVector(a.v, d * Math.exp(-d * 0.9)).addScaledVector(a.wind, d * f); P.y = Math.max(a.floor, P.y - 0.25 * d * d); E.set(a.spin.x * d, a.spin.y * d, a.spin.z * d); Q.setFromEuler(E); const k = a.s * (1 - Math.pow(d / a.life, 3)); M.compose(P, Q, S.set(k, k, k)); im.setMatrixAt(i, M); }); im.instanceMatrix.needsUpdate = true; };
  return im;
}

// ---- props ----
const GLASS = () => new THREE.MeshStandardMaterial({ color: '#d3efe9', roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, emissive: '#7fb6ac', emissiveIntensity: 0.1 });
// the end at +z is the wall the cart goes through; W wide, L long, walls H high
export function greenhouse(o = {}) {
  const W = o.W ?? 15, L = o.L ?? 22, H = o.H ?? 6.4, RISE = 3.6, g = new THREE.Group(), b = new Batch(), iron = paint('#f4f1e6', { roughness: 0.45, metalness: 0.25 }), glass = GLASS(), r = rng(9);
  b.box(surf('brick', '#c98a70'), W + 0.6, 1.1, L + 0.6, 0, 0.55, 0, { r: 0.06 });
  // floor, path, benches
  b.box(surf('plank', '#a78a66'), W - 0.6, 0.1, L - 0.6, 0, 0.1, 0, { r: 0.02 });
  for (const s of [-1, 1]) { b.box(surf('plank', '#8e6e4c'), 2.8, 0.26, L - 3, s * (W / 2 - 2), 2.4, -0.2, { r: 0.05 }); for (let z = -L / 2 + 2.4; z < L / 2 - 1; z += 4.2) { b.box(iron, 0.22, 2.4, 0.22, s * (W / 2 - 0.9), 1.2, z, { r: 0.03 }); b.box(iron, 0.22, 2.4, 0.22, s * (W / 2 - 3.1), 1.2, z, { r: 0.03 }); } }
  // withered plants on the benches
  const pot = paint('#c0683e', { roughness: 0.8 }), dead = paint('#6b5a3c', { roughness: 0.95 }), dead2 = paint('#57482f', { roughness: 0.95 });
  for (const s of [-1, 1]) for (let z = -L / 2 + 2; z < L / 2 - 2; z += 1.95) { const x = s * (W / 2 - 2) + (r() - 0.5) * 0.9; b.cyl(pot, 0.5, 0.36, 0.8, x, 2.95, z, { seg: 10 }); const n = 3 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const a = r() * 6.28, tilt = 0.25 + r() * 0.5, h = 0.9 + r() * 0.7; b.cyl(i % 2 ? dead : dead2, 0.02, 0.05, h, x + Math.cos(a) * 0.32, 3.35 + h * 0.42, z + Math.sin(a) * 0.32, { rz: Math.cos(a) * -tilt, rx: Math.sin(a) * tilt, seg: 5 }); } }
  // frame
  const nx = 5, nz = 6, top = 1.1 + H;
  const post = (x, y0, y1, z) => b.box(iron, 0.26, y1 - y0, 0.26, x, (y0 + y1) / 2, z, { r: 0.04 });
  for (let i = 0; i <= nz; i++) { const z = -L / 2 + (i / nz) * L; for (const s of [-1, 1]) post(s * W / 2, 1.1, top, z); }
  b.box(iron, 0.3, 0.3, L, -W / 2, top, 0, { r: 0.04 }); b.box(iron, 0.3, 0.3, L, W / 2, top, 0, { r: 0.04 }); b.box(iron, 0.34, 0.34, L + 0.6, 0, top + RISE, 0, { r: 0.05 });
  const slope = Math.hypot(W / 2, RISE), ang = Math.atan2(RISE, W / 2);
  for (let i = 0; i <= nz; i++) { const z = -L / 2 + (i / nz) * L; for (const s of [-1, 1]) b.box(iron, slope, 0.2, 0.2, s * W / 4, top + RISE / 2, z, { rz: -s * ang, r: 0.03 }); }
  for (const s of [-1, 1]) { b.box(glass, 0.06, H, L, s * W / 2, 1.1 + H / 2, 0, { r: 0.01 }); b.box(glass, slope, 0.06, L, s * W / 4, top + RISE / 2, 0, { rz: -s * ang, r: 0.01 }); }
  // the back gable
  { const sh = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, RISE)]); for (const z of [-L / 2, L / 2]) { const gg = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }); b.add(glass, gg, 0, top, z - 0.03); } b.box(glass, W, H, 0.06, 0, 1.1 + H / 2, -L / 2, { r: 0.01 }); }
  for (let i = 0; i <= nx; i++) { const x = -W / 2 + (i / nx) * W; post(x, 1.1, top, -L / 2); post(x, 1.1, top, L / 2); }
  for (const y of [1.1 + H * 0.5]) { b.box(iron, W, 0.2, 0.2, 0, y, -L / 2, { r: 0.03 }); }
  // the front wall: its panes are separate, so the cart can take some out. The two rails across the middle are separate too.
  b.done(g);
  const front = new THREE.Group(); g.add(front); front.position.z = L / 2; const panes = [], pw = W / nx, rows = 2, ph = H / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < nx; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(pw - 0.1, ph - 0.1, 0.06), glass); m.position.set(-W / 2 + (i + 0.5) * pw, 1.1 + (j + 0.5) * ph, 0); m.userData.hit = (Math.abs(i - 2) <= 1 && j === 0) || (i === 2 && j === 1); front.add(m); panes.push(m); }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, 0.2), iron); rail.position.set(0, 1.1 + H / 2, 0); front.add(rail);
  const midPosts = panes.filter((m) => m.userData.hit);
  // a board patch for the week after
  const bb = new Batch(), bm = surf('plank', '#b08a5e'); [[-2.6, 2.1], [-1.2, 2.6], [0.4, 2.3], [1.9, 2.5]].forEach(([x, h], i) => bb.box(bm, 1.3, h + 2, 0.14, x, 2.2 + i * 0.03, 0.18, { rz: (i % 2 ? 0.03 : -0.04), r: 0.03 })); bb.box(bm, 7.4, 0.5, 0.14, 0, 3.1, 0.3, { rz: 0.03, r: 0.03 }); bb.box(bm, 7.4, 0.5, 0.14, 0, 1.5, 0.3, { rz: -0.04, r: 0.03 });
  const boards = bb.done(); boards.visible = false; front.add(boards);
  g.setBroken = (on) => { midPosts.forEach((m) => { m.visible = !on; }); rail.visible = !on; };
  g.setBoards = (on) => { boards.visible = !!on; };
  g.front = front; g.size = { W, L, H, top };
  return g;
}
export function breadCart() {
  const g = new THREE.Group(), body = new THREE.Group(), b = new Batch(), red = paint('#d2382e', { roughness: 0.4 }), cream = paint('#fff4dc', { roughness: 0.5 }), wood = surf('plank', '#b98a56');
  // length along z; the push bar is at -z
  b.box(red, 3.8, 1.5, 5.6, 0, 2.2, 0, { r: 0.1 }); b.box(cream, 3.95, 0.18, 5.75, 0, 2.95, 0, { r: 0.05 }); b.box(cream, 3.9, 0.3, 5.7, 0, 1.55, 0, { r: 0.05 });
  b.box(wood, 3.4, 0.5, 5.2, 0, 3.1, 0, { r: 0.05 });
  for (const s of [-1, 1]) { b.box(cream, 0.2, 2.6, 0.2, s * 1.75, 4.3, -2.6, { r: 0.04 }); b.box(cream, 0.2, 2.6, 0.2, s * 1.75, 4.3, 2.6, { r: 0.04 }); }
  for (let i = 0; i < 8; i++) { const x = -1.75 + (i + 0.5) * 3.5 / 8; b.box(paint(i % 2 ? '#fff4dc' : '#e8453a', { roughness: 0.55 }), 3.5 / 8 + 0.02, 0.12, 6.0, x, 5.65, 0, { r: 0.03 }); }
  for (const s of [-1, 1]) b.box(paint('#3a2c20'), 0.2, 0.2, 2.2, s * 1.5, 3.1, -3.6, { r: 0.05 });
  b.cyl(paint('#3a2c20'), 0.15, 0.15, 3.2, 0, 3.1, -4.7, { rz: Math.PI / 2, seg: 10 });
  const loaf = paint('#d99a4c', { roughness: 0.75 }), loaf2 = paint('#b9772f', { roughness: 0.75 });
  for (let i = 0; i < 12; i++) { const x = -1.1 + (i % 3) * 1.1, z = -1.8 + Math.floor(i / 3) * 1.25; b.add(i % 2 ? loaf : loaf2, new THREE.SphereGeometry(0.55, 10, 8).scale(1, 0.62, 1.5), x, 3.55, z, i * 0.6); }
  b.done(body); g.add(body); g.body = body;
  const wheels = []; for (const z of [-2, 2]) for (const s of [-1, 1]) { const w = new THREE.Group(), wb = new Batch(); wb.cyl(paint('#2f2f36', { roughness: 0.8 }), 0.75, 0.75, 0.32, 0, 0, 0, { rz: Math.PI / 2, seg: 18 }); wb.cyl(paint('#f3d36a', { roughness: 0.4, metalness: 0.4 }), 0.4, 0.4, 0.38, 0, 0, 0, { rz: Math.PI / 2, seg: 12 }); for (let i = 0; i < 4; i++) wb.box(paint('#f3d36a'), 0.1, 1.2, 0.1, s * 0.2, 0, 0, { rx: i * Math.PI / 4, r: 0.02 }); wb.done(w); w.position.set(s * 2.0, 0.75, z); g.add(w); wheels.push(w); }
  g.spin = (a) => wheels.forEach((w) => { w.rotation.x = a; });
  g.castShadow = true; return g;
}
export function loafMesh() { const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 9).scale(1, 0.62, 1.5), paint('#d6974a', { roughness: 0.75 })); m.castShadow = true; return m; }
export function gardenBench() { const g = new THREE.Group(), b = new Batch(), w = surf('plank', '#a56a3f'), iron = paint('#3d4d44', { roughness: 0.5, metalness: 0.4 }); const Y = 1.25; for (let i = 0; i < 4; i++) b.box(w, 8, 0.14, 0.42, 0, Y, -0.72 + i * 0.48, { r: 0.04 }); for (let i = 0; i < 3; i++) b.box(w, 8, 0.42, 0.14, 0, Y + 1.0 + i * 0.6, -1.1, { rx: -0.1, r: 0.04 }); for (const s of [-1, 1]) { b.box(iron, 0.2, Y, 1.9, s * 3.6, Y / 2, 0, { r: 0.05 }); b.box(iron, 0.2, 3.3, 0.2, s * 3.6, 1.8, -1.15, { rx: -0.1, r: 0.04 }); } b.done(g); g.seatY = Y + 0.07; return g; }
export function cakeTable() { const g = new THREE.Group(), b = new Batch(); b.box(surf('plank', '#e9d8bd'), 5, 0.2, 3, 0, 2.6, 0, { r: 0.05 }); for (const [x, z] of [[-2.2, -1.2], [2.2, -1.2], [-2.2, 1.2], [2.2, 1.2]]) b.box(paint('#ffffff'), 0.16, 2.6, 0.16, x, 1.3, z, { r: 0.03 }); b.box(paint('#ffd0e4', { roughness: 0.7 }), 5.2, 0.5, 3.2, 0, 2.45, 0, { r: 0.05 }); b.cyl(paint('#ffffff'), 1.0, 1.0, 0.12, 0, 2.78, 0, { seg: 24 }); b.cyl(paint('#ff9fc0', { roughness: 0.5 }), 0.8, 0.8, 0.7, 0, 3.15, 0, { seg: 24 }); b.cyl(paint('#fff2d2', { roughness: 0.5 }), 0.82, 0.82, 0.12, 0, 3.52, 0, { seg: 24 }); for (let i = 0; i < 5; i++) { const a = i * 1.26; b.cyl(paint(['#6ec1ff', '#ffd24a', '#ff6fa0'][i % 3]), 0.05, 0.05, 0.42, Math.cos(a) * 0.5, 3.75, Math.sin(a) * 0.5, { seg: 6 }); b.add(new THREE.MeshStandardMaterial({ color: '#ffb84a', emissive: '#ff9a2a', emissiveIntensity: 1.2 }), new THREE.SphereGeometry(0.07, 8, 6).scale(1, 1.5, 1), Math.cos(a) * 0.5, 4.03, Math.sin(a) * 0.5); } b.done(g); return g; }
export function partyHat() { const m = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.1, 18), new THREE.MeshStandardMaterial({ color: '#58b0ff', roughness: 0.5 })); m.castShadow = true; return m; }
export function sickBed() { const g = new THREE.Group(), b = new Batch(), w = surf('plank', '#a06a44'), top = 2.5; b.box(w, 7.6, 1.2, 12, 0, 1.0, 0, { r: 0.08 }); b.box(paint('#fff7ea', { roughness: 0.85 }), 7.2, 0.9, 11.6, 0, 2.05, 0, { r: 0.25 }); b.box(w, 7.6, 7.4, 0.6, 0, 3.7, -6, { r: 0.15 }); b.box(w, 7.6, 3.4, 0.5, 0, 1.7, 6, { r: 0.12 }); for (const x of [-1.9, 1.9]) b.box(paint('#ffffff', { roughness: 0.95 }), 3.3, 1.5, 1.8, x, 3.25, -4.7, { rx: 0.5, r: 0.6 }); b.box(paint('#ffffff', { roughness: 0.95 }), 6.8, 1.9, 1.5, 0, 3.6, -5.2, { rx: 0.35, r: 0.6 }); b.done(g); g.top = top; return g; }
// the quilt that goes over her legs
export function quilt() { const b = new Batch(), m = paint('#c97a8e', { roughness: 0.9 }); b.box(m, 7.5, 1.2, 7.2, 0, 2.95, 1.9, { r: 0.5 }); for (let i = 0; i < 6; i++) b.box(paint('#fff0d8', { roughness: 0.9 }), 7.52, 0.06, 0.1, 0, 3.56, -1.3 + i * 1.3, { r: 0.01 }); b.box(paint('#e8a4b5', { roughness: 0.85 }), 7.6, 0.4, 1.2, 0, 3.44, -1.5, { r: 0.18 }); return b.done(); }

// Ruth's room, centred on the origin. +z is the door side; the bed's head is at -z.
export function ruthRoom() {
  const g = new THREE.Group(), b = new Batch(), wp = wallpaper('#f7dfae', '#ecc98a', { flower: '#fff4da' }), fl = surf('plank', '#b98a5e'), tr = paint('#fff7ea', { roughness: 0.5 }), RW = 28, RD = 26, H = 14;
  b.box(fl, RW, 0.4, RD, 0, -0.2, 0, { r: 0.02 }); b.box(paint('#f2e6cf'), RW, 0.4, RD, 0, H + 0.2, 0, { r: 0.02 });
  for (const s of [-1, 1]) b.box(wp, 0.4, H, RD, s * RW / 2, H / 2, 0, { r: 0.02 });
  b.box(wp, RW, H, 0.4, 0, H / 2, -RD / 2, { r: 0.02 }); b.box(wp, RW, H, 0.4, 0, H / 2, RD / 2, { r: 0.02 });
  for (const s of [-1, 1]) { b.box(tr, 0.2, 0.9, RD, s * (RW / 2 - 0.3), 0.45, 0, { r: 0.04 }); b.box(tr, RW, 0.9, 0.2, 0, 0.45, s * (RD / 2 - 0.3), { r: 0.04 }); }
  // window on the +x wall, curtains
  const wx = RW / 2 - 0.3; b.box(tr, 0.3, 7.6, 7.6, wx, 7, -2, { r: 0.08 }); b.add(new THREE.MeshStandardMaterial({ color: '#fff6df', emissive: '#ffe9b8', emissiveIntensity: 1.1 }), new THREE.BoxGeometry(0.1, 6.8, 6.8), wx - 0.2, 7, -2); for (const s of [-1, 1]) b.box(paint('#d9798f', { roughness: 0.9 }), 0.4, 8.6, 1.6, wx - 0.5, 7, -2 + s * 4.1, { r: 0.2 });
  b.box(tr, 0.3, 0.2, 6.8, wx - 0.25, 7, -2, { r: 0.03 }); b.box(tr, 0.3, 6.8, 0.2, wx - 0.25, 7, -2, { r: 0.03 });
  // bedside table with a vase of bright flowers
  b.box(surf('plank', '#8e5e3c'), 3, 3, 3, -8.5, 1.5, -8.5, { r: 0.1 }); b.cyl(paint('#6ec1ff', { roughness: 0.25 }), 0.5, 0.36, 1.3, -8.5, 3.65, -8.5, { seg: 16 });
  for (let i = 0; i < 7; i++) { const a = i * 0.9, x = -8.5 + Math.cos(a) * 0.5, z = -8.5 + Math.sin(a) * 0.5; b.cyl(paint('#4f9a4a'), 0.04, 0.05, 1.7, x, 4.7, z, { seg: 5 }); b.add(paint(['#ff6fa0', '#ffd24a', '#ffffff'][i % 3], { roughness: 0.6 }), new THREE.IcosahedronGeometry(0.34, 1), x, 5.6, z); }
  // framed pictures, a chest
  for (const [z, c] of [[-6, '#7ac0e8'], [5, '#e88f7a']]) { b.box(paint('#9c6a3a'), 0.2, 3.4, 4.2, -RW / 2 + 0.4, 7.8, z, { r: 0.06 }); b.box(paint(c), 0.1, 2.8, 3.6, -RW / 2 + 0.55, 7.8, z, { r: 0.02 }); }
  b.box(surf('plank', '#7e5234'), 7, 3.6, 3.2, 8.2, 1.8, 10.5, { r: 0.12 });
  b.done(g); g.size = { RW, RD, H }; return g;
}

// ---- the town ----
export const ST = 4;   // the street stands above Mr. Hollis's yard
export const GH = v3(-6, 0, -4), HOUSE = v3(20, 0, -9), BENCH = v3(10, 0, 15);
const RAMP_X = [-10.5, -1.5];
export const laneY = (z) => (z >= 30 ? ST : z <= 14 ? 0 : ((z - 14) / 16) * ST);
function surfPlane(mat, x0, x1, z0, z1, y) { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); const P = g.attributes.position, uv = g.attributes.uv, sp = mat.userData.span || 8; for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + (x0 + x1) / 2) / sp, (P.getZ(i) + (z0 + z1) / 2) / sp); const m = new THREE.Mesh(g, mat); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; return m; }
function signBoard(text, w, h, bg, fg) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: canvasTex(1024, Math.round(1024 * h / w), (x, W, H) => { x.fillStyle = bg; x.fillRect(0, 0, W, H); x.strokeStyle = fg; x.lineWidth = 14; x.strokeRect(18, 18, W - 36, H - 36); x.fillStyle = fg; x.font = `900 ${Math.round(H * 0.56)}px ITTInter, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H * 0.53); }), roughness: 0.6 })); return m; }

export function larkspur(scene) {
  const W = {}, Y = ST, grass = surf('grass', '#74c95a'), dry = surf('grass', '#b4ab6a'), stone = surf('cobble', '#c8bfae'), road = surf('cobble', '#d9cfc0');
  grass.userData.span = 16; dry.userData.span = 14;
  for (const [a, b, c, d] of [[-420, 420, 30, 420], [-420, -34, -40, 30], [34, 420, -40, 30], [-420, 420, -420, -40]]) scene.add(surfPlane(grass, a, b, c, d, Y));
  scene.add(surfPlane(dry, -34, 34, -40, 30, 0));
  const b = new Batch();
  // the walls round the low yard; the gap in the z = 30 wall is the lane
  b.box(stone, 68, Y, 0.8, 0, Y / 2, -40, { r: 0.05 }); for (const s of [-1, 1]) b.box(stone, 0.8, Y, 70, s * 34, Y / 2, -5, { r: 0.05 });
  b.box(stone, 23.5, Y, 0.8, -22.25, Y / 2, 30, { r: 0.05 }); b.box(stone, 35.5, Y, 0.8, 16.25, Y / 2, 30, { r: 0.05 });
  // the lane: a wedge of cobbles
  { const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(16, 0), new THREE.Vector2(16, Y)]), g = new THREE.ExtrudeGeometry(sh, { depth: 9, bevelEnabled: false }); g.rotateY(-Math.PI / 2); b.add(road, g, RAMP_X[1], 0, 14); }
  b.box(road, 9, 0.04, 24, -6, 0.0, 2, { r: 0.01 });   // flat at the foot of the lane
  // low walls on each side of the lane
  for (const x of [RAMP_X[0] - 0.4, RAMP_X[1] + 0.4]) b.box(stone, 0.7, 1.4, 16.6, x, 2.7, 22, { rx: -Math.atan2(Y, 16), r: 0.1 });
  // road and pavements on the top level
  b.box(road, 840, 0.04, 12, 0, Y, 42, { r: 0.01 }); for (const z of [34, 50]) b.box(surf('tile', '#efe7d6'), 840, 0.08, 4, 0, Y, z, { r: 0.02 });
  // his fence, with its gate at the top of the lane
  { const yard = new THREE.Group(); scene.add(yard); b.done(yard); const fg = new THREE.Group(), fb = new Batch(), fm = paint('#6d675f', { roughness: 0.7 }); fg.position.y = Y; for (const [x0, x1] of [[-34, -11], [-1, 34]]) picket(fb, x0, x1, 31, { mat: fm, h: 3.2 }); fb.done(fg); scene.add(fg); }
  W.gate = new THREE.Group(); { const g = new Batch(), iron = paint('#3b3a40', { roughness: 0.5, metalness: 0.5 }); for (const s of [-1, 1]) g.box(stone, 1.1, 5, 1.1, -6 + s * 5.6, Y + 2.5, 31, { r: 0.1 }); g.done(W.gate); scene.add(W.gate); }
  W.gateL = new THREE.Group(); W.gateR = new THREE.Group(); for (const [grp, x, s] of [[W.gateL, -11.0, 1], [W.gateR, -1.0, -1]]) { const g = new Batch(), iron = paint('#3b3a40', { roughness: 0.5, metalness: 0.5 }); g.box(iron, 4.9, 0.18, 0.18, s * 2.5, 3.5, 0, { r: 0.03 }); g.box(iron, 4.9, 0.18, 0.18, s * 2.5, 0.8, 0, { r: 0.03 }); for (let i = 0; i < 8; i++) g.box(iron, 0.12, 3.2, 0.12, s * (0.3 + i * 0.64), 2.15, 0, { r: 0.02 }); g.done(grp); grp.position.set(x, Y, 31); grp.rotation.y = s * -1.35; scene.add(grp); }
  // Mr. Hollis's house: the only colourless one
  const hs = cottage({ wall: '#8f97a0', trim: '#c9c6bd', roof: '#4c4f58', door: '#3a3f4a', shutter: '#6c7078', seed: 17, flowers: false, w: 24, d: 16, number: 7 }); hs.g.position.copy(HOUSE); scene.add(hs.g); W.house = hs;
  W.gh = greenhouse(); W.gh.position.copy(GH); scene.add(W.gh);
  W.bench = gardenBench(); W.bench.position.copy(BENCH); scene.add(W.bench);
  // the street
  const street = new THREE.Group(); street.position.y = Y; scene.add(street); const yb = new Batch();
  const south = [-96, -66, -36, -6, 24, 54, 84, 114], cols = ['#ffc2d6', '#a9dcff', '#c6f0a8', '#ffe28a', '#d9c2ff', '#ffc99a', '#a8f0e0', '#ffb3b3'];
  south.forEach((x, i) => { const bak = x === -36, c = cottage({ wall: bak ? '#ffe6b0' : cols[i], seed: 30 + i, door: bak ? '#d2382e' : undefined, trim: '#fffaf2' }); c.g.position.set(x, 0, 68); c.g.rotation.y = Math.PI; street.add(c.g); picket(yb, x - 12, x - 3, 53.3, {}); picket(yb, x + 3, x + 12, 53.3, {}); if (bak) { W.bakery = c; } });
  for (const [x, i] of [[-90, 1], [-58, 2], [58, 3], [90, 4], [-122, 5], [122, 6]]) { const c = cottage({ wall: cols[i], seed: 60 + i, trim: '#fffaf2' }); c.g.position.set(x, 0, 8); street.add(c.g); picket(yb, x - 12, x - 3, 28.8, {}); picket(yb, x + 3, x + 12, 28.8, {}); }
  yb.done(street);
  // the bakery's front
  { const a = new Batch(); for (let i = 0; i < 12; i++) a.box(paint(i % 2 ? '#fff4dc' : '#e8453a', { roughness: 0.55 }), 16 / 12 + 0.02, 0.14, 4.2, -36 - 8 + (i + 0.5) * 16 / 12, 9.2, 57.8, { rx: 0.42, r: 0.03 }); a.box(paint('#f7d9a0'), 16, 0.12, 0.4, -36, 8.3, 55.8, { r: 0.04 }); a.done(street); const s = signBoard('BAKERY', 12, 2.6, '#fff4dc', '#b5352a'); s.position.set(-36, 11.2, 58.9); s.rotation.y = Math.PI; street.add(s); }
  // flower beds along the pavements and fences
  { const r = rng(21), sp = []; for (const x0 of south) for (let i = 0; i < 16; i++) { const left = i % 2 ? -1 : 1; sp.push(v3(x0 + left * (4.5 + r() * 7.5), 0, 54.3 + r() * 1.5)); } for (let x = -130; x < 130; x += 1.6) if (Math.abs(x + 6) > 13 && r() < 0.8) sp.push(v3(x, 0, 32 - 0.9 + r() * 0.3)); flowers(street, sp, { seed: 8 }); }
  // blossom and green trees
  { const pink = treeShape({ seed: 7, h: 14, r0: 1.1, r1: 0.55, spread: 10, clumps: 12, detail: 2, cols: ['#c75e88', '#f09bbd', '#ffd9e6'] }), green = treeShape({ seed: 12, h: 16, r0: 1.3, r1: 0.6, spread: 11, clumps: 12, detail: 2, cols: ['#3a8f3f', '#6cc452', '#b4e36a'] }), bark = surf('plank', '#7a5a42'), leaf = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
    const P = (sh, x, z, y, s = 1) => { const t = new THREE.Mesh(sh.bark, bark), l = new THREE.Mesh(sh.leaves, leaf); for (const m of [t, l]) { m.position.set(x, y, z); m.scale.setScalar(s); m.rotation.y = x * 0.37; m.castShadow = true; m.receiveShadow = true; scene.add(m); } };
    for (const x of [-81, -51, -21, 39, 69, 99, -111, 129]) P(pink, x, 53, Y, 0.95); for (const x of [-44, 16, 76, -72, 46, 106]) P(green, x, 80, Y, 1.25); for (const [x, z] of [[-42, 12], [42, 16], [-44, 26], [46, 28]]) P(pink, x, z, Y, 1);
    // the dark hedge of old trees behind his house
    const dk = treeShape({ seed: 3, h: 15, r0: 1.3, r1: 0.6, spread: 10, clumps: 10, detail: 2, cols: ['#1f3b2c', '#2f5a3c', '#47784a'] }); for (const [x, z] of [[-26, -34], [-12, -36], [4, -36], [20, -34], [34, -36], [-30, -18]]) P(dk, x, z, 0, 1.2); }
  W.hemi = null; return W;
}
