// Tropical islands kit (Episode 20): islands that stand on tall rock columns once the sea is gone, palms, boats, a galleon, a village,
// a sea you can drain, a glass fruit, and an ancient city of instanced buildings that rise from a studded seabed.
// Everything is seeded; animated parts take t, so a frame depends only on t.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { v3, rng, clamp, lerp, smooth } from './core.js';
import { Batch, surf, paint, sign, crate, barrel } from './kit.js';
import { canvasTex } from './props.js';

export const SEABED = -118;

// ---- value noise ----
const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vn(x, y) {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(hash2(i, j), hash2(i + 1, j), a), lerp(hash2(i, j + 1), hash2(i + 1, j + 1), a), b);
}
const fbm = (x, y) => vn(x, y) * 0.55 + vn(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + vn(x * 4.3 + 1, y * 4.3 + 9) * 0.15;
const col = (h) => new THREE.Color(h);

// ---- the island: one radial mesh from the summit, over the beach, under the sea and down its column to the seabed ----
export function makeIsland(o) {
  const r = rng(o.seed), R = o.R, top = o.top ?? 9, peak = o.peak ?? 0, p1 = r() * 6, p2 = r() * 6, p3 = r() * 6;
  const outline = (a) => R * (1 + 0.11 * Math.sin(3 * a + p1) + 0.06 * Math.sin(5 * a + p2) + 0.025 * Math.sin(11 * a + p3));
  const heightU = (u, x, z) => {
    if (u >= 1) return -(u - 1) * 60;
    if (u >= 0.74) return lerp(2.7, 0, (u - 0.74) / 0.26) + (fbm(x * 0.05, z * 0.05) - 0.5) * 0.3;
    const k = smooth(0.74, 0.22, u), n = (fbm(x * 0.03 + o.seed, z * 0.03) - 0.5) * 6 * smooth(0.74, 0.5, u);
    const crag = peak * Math.exp(-Math.pow(u / 0.34, 2)) * (0.75 + 0.5 * fbm(x * 0.06, z * 0.06 + 4));
    return 2.7 + top * k + n + crag;
  };
  const heightAt = (x, z) => { const a = Math.atan2(z, x), u = Math.hypot(x, z) / outline(a); return heightU(u, x, z); };
  const segs = o.segs ?? 96, us = [];
  const nIn = o.rings ?? 26; for (let i = 0; i <= nIn; i++) us.push(1.24 * Math.pow(i / nIn, 0.8));
  const walls = 18, rows = us.length + walls, pos = [], cl = [], uv = [], idx = [];
  const cSand = col('#e6cd96'), cWet = col('#c8a56c'), cG1 = col('#3a8f36'), cG2 = col('#67aa44'), cRock = col('#8a7d6c'), cShelf = col('#5fb8aa');
  const strata = ['#8d7a64', '#a58c6c', '#6e6560', '#7f6f5f', '#b09270', '#5e5a60'].map(col), coral = col('#c8656e'), c = new THREE.Color();
  for (let i = 0; i < rows; i++) for (let j = 0; j <= segs; j++) {
    const a = (j % segs) / segs * Math.PI * 2, R0 = outline(a); let x, y, z;
    if (i < us.length) {
      const u = us[i]; x = Math.cos(a) * u * R0; z = Math.sin(a) * u * R0; y = heightU(u, x, z);
      if (y > 3.2) { const steep = smooth(top * 0.9 + 3, top * 0.9 + 3 + peak * 0.35 + 3, y); c.copy(cG1).lerp(cG2, fbm(x * 0.05, z * 0.05)).lerp(cRock, peak ? steep : 0); }
      else if (y > 0.5) { c.copy(cSand).lerp(cG1, smooth(2.5, 3.2, y)); }
      else if (y > -0.6) c.copy(cWet); else c.copy(cWet).lerp(cShelf, clamp(-y / 8));
    } else {
      const s = (i - us.length + 1) / walls, ledge = Math.sin(i * 2.4 + a * 3) * 2.2 + (hash2(i, j >> 2) - 0.5) * 3.2;
      const rad = R0 * (1.24 + 0.34 * s * s) + ledge + (fbm(a * 3 + o.seed, s * 5) - 0.5) * R * 0.1;
      x = Math.cos(a) * rad; z = Math.sin(a) * rad; y = lerp(-14.4, SEABED - 4, s);
      c.copy(strata[(i + (j >> 4)) % strata.length]); if (hash2(j >> 1, i) > 0.86 && s < 0.7) c.lerp(coral, 0.7);
    }
    pos.push(x, y, z); cl.push(c.r, c.g, c.b); uv.push(i < us.length ? x / 12 : (j / segs) * R / 3, i < us.length ? z / 12 : y / 12);
    if (i < rows - 1 && j < segs) { const w = segs + 1, A = i * w + j, B = A + 1, C = A + w, D = C + 1; idx.push(A, B, C, B, D, C); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const base = surf('sand', '#ffffff', { roughness: 0.92 }).clone(); base.vertexColors = true; base.color.set('#ffffff');
  const m = new THREE.Mesh(g, base); m.castShadow = true; m.receiveShadow = true;
  const group = new THREE.Group(); group.add(m); if (o.pos) group.position.copy(o.pos);
  return { group, heightAt, outline, R, top, seed: o.seed, home: group.position.clone(), place(u, a) { const x = Math.cos(a) * u * outline(a), z = Math.sin(a) * u * outline(a); return v3(x, heightU(u, x, z), z); } };
}

// ---- palms ----
function tube(pts, r0, r1, radial = 9) {
  const n = pts.length, pos = [], uv = [], idx = [], cur = new THREE.CatmullRomCurve3(pts), M = n * 3;
  for (let i = 0; i <= M; i++) {
    const s = i / M, p = cur.getPoint(s), tn = cur.getTangent(s), ax = v3(1, 0, 0).cross(tn).normalize(), ay = tn.clone().cross(ax).normalize(), rr = lerp(r0, r1, s) * (1 + 0.05 * Math.sin(i * 2.6));
    for (let j = 0; j <= radial; j++) { const a = j / radial * Math.PI * 2, q = p.clone().addScaledVector(ax, Math.cos(a) * rr).addScaledVector(ay, Math.sin(a) * rr); pos.push(q.x, q.y, q.z); uv.push(j / radial, s * 8); }
    if (i < M) for (let j = 0; j < radial; j++) { const A = i * (radial + 1) + j, B = A + 1, C = A + radial + 1, D = C + 1; idx.push(A, B, C, B, D, C); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g.toNonIndexed();
}
let PALM = null;
function palmParts() {
  if (PALM) return PALM;
  const bark = canvasTex(128, 256, (x, w, h) => { x.fillStyle = '#8a6a48'; x.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#6e5236' : '#a58560'; x.fillRect(0, i * 16, w, 7); x.fillStyle = 'rgba(40,26,14,.5)'; x.fillRect(0, i * 16 + 13, w, 3); } });
  bark.wrapS = bark.wrapT = THREE.RepeatWrapping;
  const frond = canvasTex(256, 1024, (x, w, h) => {
    x.clearRect(0, 0, w, h); const r = rng(5);
    for (let i = 0; i < 74; i++) {
      const v = i / 74, y = h * (0.02 + v * 0.96), L = w * 0.5 * Math.sin(Math.PI * Math.pow(v, 0.62)) * (0.84 + r() * 0.18) + 8;
      const g = x.createLinearGradient(w / 2, 0, w / 2 + L, 0); g.addColorStop(0, '#2c8a2e'); g.addColorStop(1, r() < 0.4 ? '#7fd23e' : '#57b83a'); x.strokeStyle = g; x.lineWidth = 12; x.lineCap = 'round';
      for (const s of [-1, 1]) { x.beginPath(); x.moveTo(w / 2, y); x.quadraticCurveTo(w / 2 + s * L * 0.5, y - 16, w / 2 + s * L, y - 36); x.stroke(); }
    }
    x.strokeStyle = '#d6c56a'; x.lineWidth = 7; x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.stroke();
  });
  const tm = new THREE.MeshStandardMaterial({ map: bark, roughness: 0.92 });
  const fm = new THREE.MeshStandardMaterial({ map: frond, side: THREE.DoubleSide, alphaTest: 0.5, roughness: 0.55 });
  const sway = { value: 0 };
  fm.onBeforeCompile = (s) => {
    s.uniforms.uSway = sway;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uSway;').replace('#include <begin_vertex>', `#include <begin_vertex>
      float sw = length(position.xz) * 0.03; transformed.y += sin(uSway * 2.3 + position.x * 0.4 + position.z * 0.3) * sw * 1.6; transformed.x += sin(uSway * 1.7 + position.z * 0.5) * sw;`);
  };
  fm.customProgramCacheKey = () => 'palmfrond';
  const trunks = [[v3(0, 0, 0), v3(0.7, 6, 0.2), v3(2, 13, 0.3), v3(4.4, 19, 0.3)], [v3(0, 0, 0), v3(-0.3, 7, 0.6), v3(0.5, 14, 1.4), v3(1.2, 22, 1.8)]];
  const crown = (top) => {
    const parts = [];
    for (let i = 0; i < 13; i++) {
      const up = i >= 8, n = up ? 5 : 8, a = (i % 8) / n * Math.PI * 2 + (up ? 0.3 : 0), Ln = up ? 8.5 : 12, drop = up ? 0.28 : 0.62, lift = up ? 0.95 : 0.34;
      const g = new THREE.PlaneGeometry(3.4, Ln, 2, 12); g.rotateX(-Math.PI / 2); g.translate(0, 0, -Ln / 2);   // the tip at -z
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const s = -p.getZ(k), f = Math.abs(p.getX(k)) / 1.7; p.setY(k, s * lift - drop * s * s / Ln * 1.5 - f * 0.34); }
      g.rotateY(a + hash2(i, 3) * 0.3); g.translate(top.x, top.y, top.z); g.computeVertexNormals(); parts.push(g);
    }
    return mergeGeometries(parts);
  };
  const nut = (top) => [0, 2.1, 4.2].map((a) => { const g = new THREE.IcosahedronGeometry(0.56, 1).toNonIndexed(); g.deleteAttribute('uv'); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2).fill(0.02), 2)); g.translate(top.x + Math.cos(a) * 0.72, top.y - 0.6, top.z + Math.sin(a) * 0.72); return g; });
  PALM = { tm, fm, sway, kinds: trunks.map((pts) => ({ trunk: mergeGeometries([tube(pts, 0.86, 0.46), ...nut(pts[3])]), crown: crown(pts[3]) })) };
  return PALM;
}
export const palmTime = (t) => { if (PALM) PALM.sway.value = t; };

// list: [{ x, y, z, s, ry }] in the parent's space
export function palms(parent, list) {
  const P = palmParts(), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  P.kinds.forEach((k, ki) => {
    const mine = list.filter((_, i) => i % 2 === ki); if (!mine.length) return;
    const a = new THREE.InstancedMesh(k.trunk, P.tm, mine.length), b = new THREE.InstancedMesh(k.crown, P.fm, mine.length);
    mine.forEach((p, i) => { M.compose(v3(p.x, p.y - 0.2, p.z), q.setFromEuler(e.set(0, p.ry, 0)), v3(p.s, p.s, p.s)); a.setMatrixAt(i, M); b.setMatrixAt(i, M); });
    a.castShadow = b.castShadow = true; a.receiveShadow = b.receiveShadow = true; a.frustumCulled = b.frustumCulled = false; b.userData.noAO = true; parent.add(a, b);
  });
}

// ---- small scatter: bushes, rocks, grass ----
function blob(r, seed, detail = 1, squash = 0.8) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = v3(p.getX(i), p.getY(i), p.getZ(i)), k = 1 + (hash2(Math.round(v.x * 9) + seed, Math.round(v.y * 9 + v.z * 7)) - 0.5) * 0.42; p.setXYZ(i, v.x * k * r, v.y * k * r * squash, v.z * k * r); }
  g.computeVertexNormals(); return g;
}
export function scatter(parent, geo, mat, list, colors) {
  const m = new THREE.InstancedMesh(geo, mat, list.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  list.forEach((p, i) => { M.compose(v3(p.x, p.y, p.z), q.setFromEuler(e.set(p.rx || 0, p.ry || 0, p.rz || 0)), v3(p.s, p.sy || p.s, p.s)); m.setMatrixAt(i, M); if (colors) m.setColorAt(i, c.set(colors[i % colors.length])); });
  m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; if (colors) m.instanceColor.needsUpdate = true; parent.add(m); return m;
}
export const bushGeo = () => mergeGeometries([blob(1.4, 1), blob(1, 2).translate(1.1, 0.1, 0.4), blob(0.9, 3).translate(-0.9, 0, -0.6)].map((g) => g.toNonIndexed()));
export const rockGeo = (s = 4) => blob(1, s, 1, 0.72);
export function tuftGeo() {
  const parts = []; for (let i = 0; i < 3; i++) { const g = new THREE.PlaneGeometry(2.4, 1.5); g.translate(0, 0.75, 0); g.rotateY(i * Math.PI / 3); parts.push(g); } return mergeGeometries(parts);
}
export const tuftMat = () => {
  const t = canvasTex(256, 160, (x, w, h) => { x.clearRect(0, 0, w, h); const r = rng(8); for (let i = 0; i < 60; i++) { const a = r() * w, l = h * (0.45 + r() * 0.55); x.strokeStyle = ['#2f7f2e', '#3f9638', '#5aa83e', '#27702c'][i % 4]; x.lineWidth = 3 + r() * 3; x.beginPath(); x.moveTo(a, h); x.quadraticCurveTo(a + (r() - 0.5) * 20, h - l * 0.6, a + (r() - 0.5) * 44, h - l); x.stroke(); }
    for (let i = 0; i < 9; i++) { x.fillStyle = ['#ff5a7a', '#ffd23f', '#ffffff'][i % 3]; x.beginPath(); x.arc(20 + r() * (w - 40), 20 + r() * 50, 5, 0, 7); x.fill(); } });
  return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 });
};

// ---- boats ----
function hullGeo(L, W, H) {
  const N = 28, Mh = 7, pos = [], uv = [], idx = [], cols = Mh * 2 + 1;
  for (let i = 0; i <= N; i++) {
    const s = i / N, w = W * Math.pow(Math.max(0, 1 - Math.pow(s, 2.6)), 0.75) * (0.86 + 0.14 * Math.sin(Math.min(1, s * 3) * 1.57)) + 0.02, d = H * (1 - 0.28 * s * s), top = H * 0.16 + H * 0.5 * Math.pow(s, 3) + H * 0.3 * Math.pow(1 - s, 3);
    for (let j = -Mh; j <= Mh; j++) { const a = j / Mh * Math.PI / 2; pos.push(Math.sin(a) * w, top - d * Math.pow(Math.cos(a), 0.7), (s - 0.5) * L); uv.push(s * L / 7, (j + Mh) / (2 * Mh) * H / 2); }
    if (i < N) for (let j = 0; j < cols - 1; j++) { const A = i * cols + j, B = A + 1, C = A + cols, D = C + 1; idx.push(A, B, C, B, D, C); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function sailGeo(w, h, belly) {
  const g = new THREE.PlaneGeometry(w, h, 10, 10), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (w / 2), v = p.getY(i) / (h / 2); p.setZ(i, belly * (1 - u * u) * (1 - v * v * 0.7)); }
  g.computeVertexNormals(); return g;
}
const hullMats = (c) => { const m = surf('plank', c, { roughness: 0.7 }).clone(); m.side = THREE.DoubleSide; return m; };

export function sailboat(o = {}) {
  const g = new THREE.Group(), b = new Batch(), wood = surf('plank', '#b9834e'), dark = paint('#3a2a20');
  const hull = new THREE.Mesh(hullGeo(13, 2.6, 2), hullMats(o.hull || '#a05a34')); hull.castShadow = hull.receiveShadow = true; g.add(hull);
  b.box(wood, 3.9, 0.2, 9.4, 0, 0.58, -0.6, { r: 0.04 }); b.box(paint('#f2e9d6'), 5.2, 0.3, 0.3, 0, 0.84, -5.3, { r: 0.05 });
  b.cyl(dark, 0.15, 0.2, 13, 0, 7, -0.6); b.cyl(dark, 0.09, 0.09, 6, 0, 3.6, -3.2, { rx: Math.PI / 2 });
  for (const s of [-1, 1]) { b.box(dark, 0.14, 0.14, 8.2, s * 2.25, 1.1, -0.9, { r: 0.03 }); for (let i = 0; i < 5; i++) b.box(dark, 0.1, 0.42, 0.1, s * 2.25, 0.9, -4.4 + i * 1.8, { r: 0.02 }); }
  b.add(crateMat(), new THREE.BoxGeometry(1.5, 1.2, 1.5), -0.9, 1.2, -3.6);
  b.done(g);
  const tex = canvasTex(512, 640, (x, w, h) => { x.fillStyle = '#fff4dc'; x.fillRect(0, 0, w, h); x.fillStyle = o.sail || '#e04a35'; for (let i = 0; i < 4; i++) x.fillRect(0, i * h / 4, w, h / 8); });
  const sail = new THREE.Mesh(sailGeo(6, 9, 1), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 })); sail.position.set(0, 8, -3.2); sail.rotation.y = Math.PI / 2 + 0.25; sail.castShadow = true; g.add(sail);
  return g;
}
const crateMat = () => surf('plank', '#a9743f');

export function galleon(o = {}) {
  const g = new THREE.Group(), L = 96, W = 13, H = 15, b = new Batch();
  const hullC = o.hull || '#5c3a26', wood = surf('plank', hullC), deck = surf('plank', '#b58a5c'), trim = paint('#d9b65a', { metalness: 0.7, roughness: 0.3 }), dark = paint('#2a1b12'), win = new THREE.MeshStandardMaterial({ color: '#2a1b12', emissive: '#ffb45a', emissiveIntensity: 1.4 });
  const hull = new THREE.Mesh(hullGeo(L, W, H), hullMats(hullC)); hull.castShadow = hull.receiveShadow = true; g.add(hull);
  b.box(deck, W * 1.5, 0.5, L * 0.82, 0, 2.6, -2, { r: 0.05 });
  b.box(wood, W * 1.55, 9, 17, 0, 7, -L * 0.5 + 11, { r: 0.1 }); b.box(wood, W * 1.4, 5.5, 11, 0, 14, -L * 0.5 + 9, { r: 0.1 }); b.box(wood, W * 1.3, 4.5, 11, 0, 5.4, L * 0.3, { r: 0.1 });
  for (const s of [-1, 1]) {
    b.box(trim, 0.3, 0.4, L * 0.74, s * W * 0.97, 3.9, 0, { r: 0.05 });
    for (let i = 0; i < 9; i++) { const z = -26 + i * 7; b.box(dark, 0.3, 1.7, 1.9, s * W * 0.96, 0.8, z, { r: 0.05 }); b.cyl(paint('#191a1e', { metalness: 0.7 }), 0.32, 0.4, 2.3, s * (W * 0.96 + 0.9), 0.8, z, { rz: Math.PI / 2 }); }
    for (let i = 0; i < 4; i++) b.add(win, new THREE.BoxGeometry(0.2, 1.8, 1.7), s * W * 0.78, 7.4, -L * 0.5 + 5 + i * 3.5);
  }
  for (let i = 0; i < 5; i++) b.add(win, new THREE.BoxGeometry(2, 2.2, 0.2), -7.6 + i * 3.8, 8, -L * 0.5 + 2.4);
  b.box(trim, W * 1.6, 0.5, 0.4, 0, 11, -L * 0.5 + 2.4, { r: 0.05 }); b.cyl(wood, 0.5, 1.3, 26, 0, 8, L * 0.5 + 8, { rx: 1.2 });
  const ms = [[-14, 62], [8, 72], [28, 54]], sailT = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#f6ecd6'; x.fillRect(0, 0, w, h); x.fillStyle = o.sail || '#c8362e'; for (let i = 0; i < 6; i++) if (i % 2) x.fillRect(i * w / 6, 0, w / 6, h); x.fillStyle = '#23211f'; x.beginPath(); x.arc(w / 2, h / 2, 74, 0, 7); x.fill(); x.fillStyle = '#f6ecd6'; x.beginPath(); x.arc(w / 2, h / 2, 46, 0, 7); x.fill(); });
  const sm = new THREE.MeshStandardMaterial({ map: sailT, side: THREE.DoubleSide, roughness: 0.82 });
  ms.forEach(([z, h]) => {
    b.cyl(dark, 0.5, 1, h, 0, h / 2 + 2, z);
    [[0.42, 30, 15], [0.68, 24, 12], [0.88, 16, 8]].forEach(([k, w, sh]) => { b.cyl(dark, 0.32, 0.32, w + 3, 0, h * k + sh / 2 + 3, z, { rz: Math.PI / 2 }); const s = new THREE.Mesh(sailGeo(w, sh, 3.4), sm); s.position.set(0, h * k + 2.6, z + 0.6); s.castShadow = true; g.add(s); });
    b.box(wood, 4, 1.4, 4, 0, h * 0.84 + 2, z, { r: 0.1 });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.4), new THREE.MeshStandardMaterial({ color: '#c8362e', side: THREE.DoubleSide })); flag.position.set(3, h + 3, z); g.add(flag);
    for (const sd of [-1, 1]) for (const zz of [-6, 0, 6]) { const a = v3(sd * W * 0.95, 4, z + zz), c2 = v3(0, h * 0.84, z), d = c2.clone().sub(a); const cg = new THREE.CylinderGeometry(0.06, 0.06, d.length(), 4); const m = new THREE.Mesh(cg, dark); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize()); g.add(m); }
  });
  b.done(g); return g;
}

// ---- village ----
export function hut(o = {}) {
  const g = new THREE.Group(), b = new Batch(), wall = surf('plank', o.wall || '#a97c50'), post = paint('#5e3f28'), thatch = surf('shingle', o.roof || '#c9a255', { roughness: 0.95 }), W = o.w ?? 10, D = o.d ?? 9;
  b.box(surf('plank', '#7c5a3c'), W + 3, 0.5, D + 3, 0, 1.6, 0, { r: 0.05 });
  for (const x of [-1, 1]) for (const z of [-1, 1]) { b.cyl(post, 0.34, 0.4, 2, x * (W / 2 + 1), 0.7, z * (D / 2 + 1)); b.cyl(post, 0.24, 0.28, 7, x * W / 2, 5, z * D / 2); }
  b.box(wall, W, 6.4, 0.3, 0, 5, -D / 2, { r: 0.04 }); for (const s of [-1, 1]) b.box(wall, 0.3, 6.4, D, s * W / 2, 5, 0, { r: 0.04 });
  b.box(wall, W * 0.3, 6.4, 0.3, -W * 0.35, 5, D / 2, { r: 0.04 }); b.box(wall, W * 0.3, 6.4, 0.3, W * 0.35, 5, D / 2, { r: 0.04 }); b.box(wall, W * 0.42, 1.4, 0.3, 0, 7.5, D / 2, { r: 0.04 });
  b.box(paint('#2a1c12'), W * 0.42, 5, 0.1, 0, 4.3, D / 2 - 0.1, { r: 0.02 });
  for (let i = 0; i < 4; i++) { const k = 1 - i * 0.24, h = 8.2 + i * 1.9; b.add(thatch, new THREE.ConeGeometry((W + 6) * 0.74 * k, 3.4, 4, 1).toNonIndexed(), 0, h + 1.2, 0, Math.PI / 4); }
  b.done(g); return g;
}
export function stall(o = {}) {
  const g = new THREE.Group(), b = new Batch(), wood = surf('plank', '#9c6e44'), post = paint('#5e3f28');
  b.box(wood, 9, 3.2, 3, 0, 1.6, 0, { r: 0.06 }); b.box(surf('plank', '#c9a26a'), 9.6, 0.26, 3.6, 0, 3.3, 0, { r: 0.04 });
  for (const x of [-4.3, 4.3]) for (const z of [-1.4, 1.4]) b.cyl(post, 0.16, 0.18, 7.6, x, 3.8, z);
  b.done(g);
  const st = canvasTex(512, 256, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#fff4dc' : (o.color || '#e0533a'); x.fillRect(i * w / 8, 0, w / 8, h); } });
  const aw = new THREE.Mesh(sailGeo(10.4, 4.6, 0.5), new THREE.MeshStandardMaterial({ map: st, side: THREE.DoubleSide, roughness: 0.8 })); aw.position.set(0, 7.4, 0.2); aw.rotation.x = -Math.PI / 2 + 0.35; aw.castShadow = true; g.add(aw);
  const fruit = new Batch(); ['#ff5040', '#ffb020', '#7fd23e', '#d25ab4', '#ffe14a'].forEach((c, i) => { for (let k = 0; k < 4; k++) { const m = paint(c, { roughness: 0.35 }); fruit.add(m, new THREE.IcosahedronGeometry(0.42, 2).toNonIndexed(), -3.2 + i * 1.6 + (k % 2) * 0.5, 3.8, -0.6 + (k >> 1) * 0.9); } }); fruit.done(g);
  if (o.text) { const s = sign(o.text, { w: 7, h: 1.5, bg: '#2b1a10', fg: '#ffd98a', frame: '#7a5230' }); s.position.set(0, 9.4, 1.6); s.rotation.x = -0.05; g.add(s); }
  return g;
}
export function dock(len = 46) {
  const g = new THREE.Group(), b = new Batch(), plank = surf('plank', '#b98d5e', { roughness: 0.8 }), post = paint('#5a4030'), rope = paint('#d8c79a');
  plank.userData.span = 5;
  for (let z = 0; z < len; z += 1.5) b.box(plank, 7.4, 0.3, 1.34, Math.sin(z * 9) * 0.1, 2.6, z, { r: 0.05, ry: Math.sin(z * 3) * 0.01 });
  for (const s of [-1, 1]) { b.box(post, 0.5, 0.5, len, s * 3, 2.2, len / 2, { r: 0.08 }); for (let z = 3; z < len; z += 7.5) { b.cyl(post, 0.42, 0.5, 18, s * 3.5, -3.8, z); b.box(rope, 1.1, 0.4, 1.1, s * 3.5, 3, z, { r: 0.18 }); } }
  b.done(g); return g;
}
export const flagpole = (colr = '#e04a35') => {
  const g = new THREE.Group(), b = new Batch(); b.cyl(paint('#5e3f28'), 0.16, 0.24, 16, 0, 8, 0); b.done(g);
  const m = new THREE.Mesh(sailGeo(5, 2.6, 0.3), new THREE.MeshStandardMaterial({ color: colr, side: THREE.DoubleSide, roughness: 0.7 })); m.position.set(2.6, 14.4, 0); g.add(m); return g;
};
export function chest(o = {}) {
  const g = new THREE.Group(), b = new Batch(), wood = surf('plank', '#7a4a26'), gold = paint('#e0b040', { metalness: 0.85, roughness: 0.3 });
  b.box(wood, 3.4, 1.7, 2.2, 0, 0.85, 0, { r: 0.08 }); for (const x of [-1.5, 0, 1.5]) b.box(gold, 0.24, 1.8, 2.3, x, 0.86, 0, { r: 0.04 }); b.box(paint('#3a2412'), 3.1, 0.1, 1.9, 0, 1.62, 0, { r: 0.02 }); b.done(g);
  const lid = new THREE.Group(), l = new Batch(); l.box(wood, 3.4, 0.5, 2.2, 0, 0.25, 1.1, { r: 0.1 }); for (const x of [-1.5, 0, 1.5]) l.box(gold, 0.24, 0.54, 2.3, x, 0.25, 1.1, { r: 0.04 }); l.done(lid); lid.position.set(0, 1.7, -1.1); lid.rotation.x = -1.9; g.add(lid);
  const coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), paint('#ffcf40', { metalness: 0.9, roughness: 0.28 }), o.coins ?? 220), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), r = rng(3), S = [];
  for (let i = 0; i < coins.count; i++) { const x = (r() - 0.5) * 2.9, z = (r() - 0.5) * 1.7, y = 1.7 + 0.8 * (1 - Math.pow(Math.hypot(x / 1.5, z / 0.9), 2)) * r(); S.push({ p: v3(x, Math.max(1.68, y), z), q: new THREE.Quaternion().setFromEuler(e.set(r() * 1.2 - 0.6, r() * 6, r() * 1.2 - 0.6)), k: r() }); }
  coins.castShadow = true; coins.frustumCulled = false; g.add(coins);
  g.setCoins = (v) => { S.forEach((c, i) => { const s = c.k < v ? 1 : 0.0001; M.compose(c.p, c.q, v3(s, s, s)); coins.setMatrixAt(i, M); }); coins.instanceMatrix.needsUpdate = true; };
  g.setCoins(1); return g;
}
export function katana() {
  const g = new THREE.Group(), b = new Batch(), sheath = paint('#1a1a22', { roughness: 0.3, metalness: 0.2 }), band = paint('#d9b65a', { metalness: 0.85, roughness: 0.3 }), wrap = paint('#c8362e', { roughness: 0.6 });
  b.box(sheath, 0.22, 4.6, 0.42, 0, 0, 0, { r: 0.08 }); for (const y of [-2, 1.9]) b.box(band, 0.26, 0.18, 0.46, 0, y, 0, { r: 0.03 });
  b.cyl(band, 0.34, 0.34, 0.09, 0, 2.38, 0); b.box(wrap, 0.2, 1.4, 0.32, 0, 3.12, 0, { r: 0.08 }); b.box(band, 0.22, 0.14, 0.34, 0, 3.86, 0, { r: 0.03 }); b.done(g); return g;
}

// ---- the sea: colour, sun glitter, shore foam, a whirlpool, and a level that can fall ----
export function buildSea(scene, isles, o = {}) {
  const EXT = o.extent ?? 2600;
  const mask = canvasTex(2048, 2048, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'lighter';
    const poly = (I, k) => { x.beginPath(); for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, r = I.outline(a) * k, px = (I.home.x + Math.cos(a) * r) / EXT + 0.5, py = (I.home.z + Math.sin(a) * r) / EXT + 0.5; x[i ? 'lineTo' : 'moveTo'](px * w, py * h); } x.closePath(); x.fill(); };
    x.filter = 'blur(22px)'; x.fillStyle = '#ff0000'; isles.forEach((I) => poly(I, 1.18));
    x.filter = 'blur(5px)'; x.fillStyle = '#00ff00'; isles.forEach((I) => poly(I, 1.0));
    x.filter = 'none';
  });
  mask.colorSpace = THREE.NoColorSpace; mask.flipY = false;
  const u = { uT: { value: 0 }, tMask: { value: mask }, uExt: { value: EXT }, uSun: { value: v3(0, 1, 0) }, uSunC: { value: col('#fff') }, uTop: { value: col('#3a8ee6') }, uHor: { value: col('#c4e8ff') },
    uDeep: { value: col('#0a4f9e') }, uMid: { value: col('#0b8dbc') }, uShal: { value: col('#2fc4b4') }, uFogC: { value: col('#c4e8ff') }, uFog: { value: new THREE.Vector2(400, 2400) },
    uW: { value: v3(0, 0, 0) }, uSwirl: { value: 0 }, uFunnel: { value: 0 }, uRing: { value: -1 }, uRingC: { value: col('#a06bff') }, uAlpha: { value: 1 }, uDim: { value: 1 } };
  const g = new THREE.PlaneGeometry(EXT * 1.7, EXT * 1.7, 420, 420); g.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true,
    vertexShader: `uniform vec3 uW; uniform float uFunnel; varying vec3 vP;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); float r = length(w.xz - uW.xz);
        w.y -= uFunnel * (70.0 / (1.0 + r * r / 900.0) + 18.0 / (1.0 + r * r / 22000.0));
        vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `precision highp float; varying vec3 vP;
      uniform float uT, uExt, uSwirl, uFunnel, uRing, uAlpha, uDim; uniform sampler2D tMask; uniform vec3 uSun, uSunC, uTop, uHor, uDeep, uMid, uShal, uFogC, uW, uRingC; uniform vec2 uFog;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      float hgt(vec2 p){ float t = uT; return vn(p * 0.05 + vec2(t * 0.22, t * 0.1)) * 1.0 + vn(p * 0.13 - vec2(t * 0.3, -t * 0.2)) * 0.5 + vn(p * 0.34 + vec2(-t * 0.5, t * 0.42)) * 0.24 + vn(p * 0.9 + vec2(t * 0.9, t * 0.7)) * 0.08; }
      void main(){
        vec2 p = vP.xz; vec2 d = p - uW.xz; float r = length(d);
        float ang = uSwirl * (260.0 / (r + 40.0)) + uSwirl * uT * 1.4 * (120.0 / (r + 120.0));
        float cs = cos(ang), sn = sin(ang); vec2 q = uW.xz + mat2(cs, -sn, sn, cs) * d;
        float dist = length(cameraPosition - vP), e = 0.5 + dist * 0.004;
        float h0 = hgt(q), hx = hgt(q + vec2(e, 0.0)), hz = hgt(q + vec2(0.0, e));
        float amp = 1.5 * mix(1.0, 0.25, smoothstep(250.0, 1400.0, dist));
        vec3 n = normalize(vec3((h0 - hx) / e * amp, 1.0, (h0 - hz) / e * amp));
        vec3 V = normalize(cameraPosition - vP);
        vec2 muv = p / uExt + 0.5; vec3 mk = texture2D(tMask, muv).rgb;
        float sh = smoothstep(0.02, 0.8, mk.r); float near = mk.g;
        vec3 body = mix(uDeep, uMid, smoothstep(0.0, 0.3, sh)); body = mix(body, uShal, smoothstep(0.3, 0.95, sh));
        float ca = vn(q * 0.22 + uT * 0.35) * vn(q * 0.31 - uT * 0.28); body += uShal * smoothstep(0.26, 0.5, ca) * 0.55 * sh;
        float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);
        vec3 Rf = reflect(-V, n); vec3 skyc = mix(uHor, uTop, pow(clamp(Rf.y, 0.0, 1.0), 0.55));
        vec3 c = mix(body * uDim, skyc, 0.08 + 0.72 * fres);
        float sd = max(dot(Rf, normalize(uSun)), 0.0);
        c += uSunC * (pow(sd, 900.0) * 6.0 + pow(sd, 90.0) * 0.5) * (0.5 + 0.5 * step(0.52, vn(q * 1.6 + uT * 1.2)));
        float lap = sin(uT * 1.1 + near * 16.0 + vn(q * 0.08) * 8.0);
        float foam = smoothstep(0.06, 0.2, near) * (1.0 - smoothstep(0.34, 0.62 + 0.14 * lap, near));
        foam *= smoothstep(0.28, 0.62, vn(q * 0.42 + uT * 0.2) + vn(q * 1.4 - uT * 0.3) * 0.5);
        c = mix(c, vec3(1.0), foam * 0.92);
        if (uFunnel > 0.0 || uSwirl > 0.0) { float st = vn(vec2(atan(q.y - uW.z, q.x - uW.x) * 9.0, r * 0.03 - uT * 2.0)); c = mix(c, vec3(0.92, 0.98, 1.0), smoothstep(0.62, 0.86, st) * smoothstep(320.0, 40.0, r) * clamp(uSwirl * 2.0, 0.0, 0.85)); c += uRingC * smoothstep(90.0, 0.0, r) * clamp(uFunnel, 0.0, 1.0) * 1.6; }
        if (uRing >= 0.0) { float rr = uRing * 62.0, band = exp(-pow((r - rr) / (5.0 + uRing * 1.4), 2.0)) + 0.5 * exp(-pow((r - rr * 0.62) / (3.0 + uRing), 2.0)); c += uRingC * band * 2.2 * exp(-uRing * 0.32); }
        float fk = smoothstep(uFog.x, uFog.y, dist); c = mix(c, uFogC, fk);
        gl_FragColor = vec4(c, uAlpha);
      }` });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 1; scene.add(mesh);
  mesh.u = u; return mesh;
}

// ---- the glass fruit ----
export function fruit(o = {}) {
  const g = new THREE.Group(), N = 112, M = 72, pos = [], uv = [], idx = [];
  const prof = (v) => { const a = v * Math.PI, dip = 0.2 * Math.exp(-Math.pow(v / 0.13, 2)) + 0.1 * Math.exp(-Math.pow((1 - v) / 0.1, 2)); return [Math.sin(a) * (1 + 0.1 * Math.sin(a * 1.0 - 0.6)), Math.cos(a) * (1.02 - dip)]; };
  for (let i = 0; i <= M; i++) for (let j = 0; j <= N; j++) {
    const v = i / M, a = j / N * Math.PI * 2, [rr, y] = prof(v), sw = 1 + 0.045 * Math.sin(a * 7 + v * 9) * Math.sin(v * Math.PI);
    pos.push(Math.cos(a) * rr * sw, y, Math.sin(a) * rr * sw); uv.push(j / N, v);
    if (i < M && j < N) { const A = i * (N + 1) + j, B = A + 1, C = A + N + 1, D = C + 1; idx.push(A, B, C, B, D, C); }
  }
  const make = (bite) => {
    const b = new THREE.BufferGeometry(), p = new Float32Array(pos);
    if (bite) { const c = v3(0.2, 0.26, 0.98), rad = 0.62; for (let i = 0; i < p.length; i += 3) { const q = v3(p[i], p[i + 1], p[i + 2]), d = q.distanceTo(c); if (d < rad) { const dir = q.clone().sub(c).normalize(), ripple = 1 + 0.06 * Math.sin(Math.atan2(dir.y, dir.x) * 9); const w = c.clone().addScaledVector(dir, rad * ripple); w.lerp(q, 0); p[i] = w.x; p[i + 1] = w.y; p[i + 2] = w.z; } } }
    b.setAttribute('position', new THREE.BufferAttribute(p, 3)); b.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); b.setIndex(idx); b.computeVertexNormals(); return b;
  };
  const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 1, thickness: 0.5, ior: 1.32, roughness: 0, metalness: 0, dispersion: 0.4, iridescence: 0.12, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 520], specularIntensity: 1, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.03 });
  const rim = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uK: { value: 1 } },
    vertexShader: 'varying vec3 n, v, p; void main(){ p = position; vec4 m = modelViewMatrix * vec4(position, 1.0); n = normalize(normalMatrix * normal); v = normalize(-m.xyz); gl_Position = projectionMatrix * m; }',
    fragmentShader: `varying vec3 n, v, p; uniform float uT, uK;
      vec3 hue(float h){ return 0.5 + 0.5 * cos(6.2832 * (h + vec3(0.0, 0.33, 0.67))); }
      void main(){ float f = pow(1.0 - abs(dot(normalize(n), normalize(v))), 2.6); vec3 c = mix(vec3(1.0), hue(p.y * 0.45 + p.x * 0.3 + uT * 0.12), 0.72);
        c = mix(vec3(1.0), c, 0.45); gl_FragColor = vec4(c * f * 1.1 * uK, f * uK); }` });
  const whole = make(false), bit = make(true), body = new THREE.Mesh(whole, glass), halo = new THREE.Mesh(whole, rim);
  body.userData.noAO = halo.userData.noAO = true; body.castShadow = false; g.add(body, halo);
  const stem = new THREE.Mesh(tube([v3(0, 0.82, 0), v3(0.02, 1.05, 0), v3(0.12, 1.3, 0.03), v3(0.3, 1.42, 0.05)], 0.07, 0.045, 7), glass); stem.userData.noAO = true; g.add(stem);
  const leafG = new THREE.Shape(); leafG.moveTo(0, 0); leafG.bezierCurveTo(0.22, 0.26, 0.56, 0.3, 0.92, 0.02); leafG.bezierCurveTo(0.54, -0.28, 0.2, -0.22, 0, 0);
  const lg = new THREE.ExtrudeGeometry(leafG, { depth: 0.012, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 }); lg.rotateX(Math.PI / 2 - 0.3); lg.rotateZ(0.32); lg.translate(0.12, 1.24, 0.02);
  const leaf = new THREE.Mesh(lg, glass), leafH = new THREE.Mesh(lg, rim); leaf.userData.noAO = leafH.userData.noAO = true; g.add(leaf, leafH);
  g.scale.setScalar(o.size ?? 0.62);
  g.bite = (on) => { body.geometry = on ? bit : whole; halo.geometry = on ? bit : whole; };
  g.update = (t, k = 1) => { rim.uniforms.uT.value = t; rim.uniforms.uK.value = k; };
  return g;
}

// ---- the ancient city ----
const boxG = (w, h, d, x, y, z, ry = 0, span = 8) => {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); if (ay > 0.5) uv.setXY(i, p.getX(i) / span, p.getZ(i) / span); else if (ax > 0.5) uv.setXY(i, p.getZ(i) / span, p.getY(i) / span); else uv.setXY(i, p.getX(i) / span, p.getY(i) / span); }
  if (ry) g.rotateY(ry); g.translate(x, y, z); return g;
};
const cylG = (rt, rb, h, x, y, z, seg = 10) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg).toNonIndexed(); g.translate(x, y, z); return g; };
const coneG = (r, h, x, y, z, seg = 4, ry = Math.PI / 4) => { const g = new THREE.ConeGeometry(r, h, seg).toNonIndexed(); g.rotateY(ry); g.translate(x, y, z); return g; };
const domeG = (r, x, y, z) => { const g = new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed(); g.translate(x, y, z); return g; };
const glowBand = (w, h, d, y) => [boxG(w + 0.24, h, 0.24, 0, y, d / 2), boxG(w + 0.24, h, 0.24, 0, y, -d / 2), boxG(0.24, h, d + 0.24, w / 2, y, 0), boxG(0.24, h, d + 0.24, -w / 2, y, 0)];

// six kinds of building, each a stone shell and a glowing inlay; heights are studs above their base
function kinds() {
  const K = [], add = (stone, glow) => K.push({ stone: mergeGeometries(stone), glow: mergeGeometries(glow) });
  { // stepped ziggurat
    const s = [], gl = []; let w = 44, y = 0; for (let i = 0; i < 6; i++) { const h = 9; s.push(boxG(w, h, w, 0, y + h / 2, 0)); gl.push(...glowBand(w, 0.8, w, y + h - 1.5)); y += h; w -= 7.2; }
    s.push(boxG(9, 42, 4, 0, 18, 24), boxG(8, 6, 8, 0, y + 3, 0)); for (const x of [-3, 3]) for (const z of [-3, 3]) s.push(cylG(0.7, 0.7, 6, x, y + 9, z, 8)); s.push(boxG(10, 1.6, 10, 0, y + 12.6, 0)); add(s, gl);
  }
  { // tower
    const s = [], gl = []; s.push(boxG(18, 8, 18, 0, 4, 0), boxG(14, 34, 14, 0, 25, 0), boxG(16, 2.4, 16, 0, 42, 0), boxG(10, 22, 10, 0, 54, 0), boxG(12, 2, 12, 0, 65, 0), coneG(9, 14, 0, 73, 0));
    for (const x of [-7.4, 7.4]) for (const z of [-7.4, 7.4]) s.push(boxG(1.6, 34, 1.6, x, 25, z));
    for (let i = 0; i < 4; i++) { gl.push(boxG(14.3, 1.1, 2, 0, 14 + i * 8, 6.4), boxG(14.3, 1.1, 2, 0, 14 + i * 8, -6.4), boxG(2, 1.1, 14.3, 6.4, 14 + i * 8, 0), boxG(2, 1.1, 14.3, -6.4, 14 + i * 8, 0)); } gl.push(...glowBand(10, 1.2, 10, 58)); add(s, gl);
  }
  { // columned temple
    const s = [], gl = []; s.push(boxG(46, 3, 28, 0, 1.5, 0), boxG(42, 3, 24, 0, 4.5, 0)); for (let i = 0; i < 8; i++) for (const z of [-10.5, 10.5]) s.push(cylG(1.2, 1.5, 17, -18.4 + i * 5.25, 14.5, z, 10), boxG(3, 1, 3, -18.4 + i * 5.25, 23.4, z));
    s.push(boxG(32, 16, 15, 0, 14, 0), boxG(44, 2.4, 25, 0, 25, 0), coneG(31.5, 11, 0, 31.6, 0, 4)); gl.push(boxG(33, 1.2, 15.2, 0, 19, 0), boxG(6, 10, 15.4, 0, 12, 0)); s[s.length - 1].scale && 0; add(s, gl);
  }
  { // domed hall
    const s = [], gl = []; s.push(boxG(34, 12, 34, 0, 6, 0), cylG(14, 15, 10, 0, 17, 0, 20), domeG(14, 0, 22, 0), cylG(1.6, 2.2, 8, 0, 39, 0, 8)); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; s.push(cylG(0.8, 0.8, 9, Math.cos(a) * 15.2, 17, Math.sin(a) * 15.2, 6)); } gl.push(cylG(14.2, 14.2, 1, 0, 22.6, 0, 20), ...glowBand(34, 1, 34, 9.5)); add(s, gl);
  }
  { // obelisk
    const s = [], gl = []; s.push(boxG(16, 3, 16, 0, 1.5, 0), boxG(12, 3, 12, 0, 4.5, 0), cylG(2.4, 4.6, 58, 0, 35, 0, 4), coneG(3.4, 7, 0, 67.5, 0, 4, 0)); gl.push(cylG(2.76, 3.02, 1.5, 0, 50, 0, 4), cylG(3.26, 3.56, 1.5, 0, 34, 0, 4), cylG(3.76, 4.06, 1.5, 0, 18, 0, 4)); add(s, gl);
  }
  { // block hall with buttresses, a stud-topped slab of the first version
    const s = [], gl = []; s.push(boxG(36, 20, 24, 0, 10, 0), boxG(40, 2.4, 28, 0, 21, 0), boxG(26, 9, 16, 0, 26.4, 0), boxG(30, 2, 20, 0, 31.8, 0)); for (let i = 0; i < 5; i++) for (const z of [-13.2, 13.2]) s.push(boxG(3, 18, 3, -16 + i * 8, 9, z)); gl.push(...glowBand(36, 1, 24, 15), boxG(8, 12, 24.3, 0, 7, 0)); add(s, gl);
  }
  return K;
}

export function city(scene, o = {}) {
  const r = rng(o.seed || 41), K = kinds(), keep = o.keep || (() => true), per = K.map(() => []), inner = o.inner ?? 150, outer = o.outer ?? 1300;
  const ringsN = o.rings ?? 26;
  for (let i = 0; i < ringsN; i++) {
    const rad = inner + (outer - inner) * Math.pow(i / (ringsN - 1), 0.92), n = Math.floor(rad * 6.283 / (46 + i * 1.7));
    if (i % 5 === 3) continue;                                     // ring roads
    for (let j = 0; j < n; j++) {
      const a = (j + (i % 2) * 0.5) / n * Math.PI * 2 + 0.02 * (r() - 0.5);
      const spoke = Math.abs(((a / (Math.PI / 6)) % 1 + 1) % 1 - 0.5); if (spoke > 0.46) { r(); continue; }                  // the avenues
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad; if (!keep(x, z)) { r(); continue; }
      const k = r() < 0.12 ? 0 : r() < 0.36 ? 1 : r() < 0.3 ? 4 : Math.floor(r() * K.length);
      per[k].push({ x, z, ry: -a + Math.PI / 2 + (r() < 0.5 ? 0 : Math.PI), s: (0.82 + r() * 0.5) * (1 + 0.5 * smooth(outer, inner, rad)), d: rad / outer * 1.6 + r() * 1.1, c: r() });
    }
  }
  const stone = surf('cobble', '#ffffff', { roughness: 0.86 }), stoneM = stone.clone(); stoneM.color.set('#ffffff');
  const P = ['#d8c49a', '#cdb88e', '#e2d3ae', '#b9b3a2', '#9fb4a8', '#c9a97a', '#a8c0c4'], FIRST = ['#c4282b', '#2c64c8', '#3f9a46', '#e0b838'];
  const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#58f4ff').multiplyScalar(2.2) });
  const list = [], M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  K.forEach((kd, i) => {
    const items = per[i]; if (!items.length) return;
    const a = new THREE.InstancedMesh(kd.stone, stoneM, items.length), b = new THREE.InstancedMesh(kd.glow, glowM, items.length);
    items.forEach((p, n) => { a.setColorAt(n, c.set(p.c < 0.14 ? FIRST[n % 4] : P[n % P.length])); });
    a.instanceColor.needsUpdate = true; a.castShadow = true; a.receiveShadow = true; a.frustumCulled = b.frustumCulled = false; scene.add(a, b); list.push({ a, b, items });
  });
  const api = { count: per.reduce((n, l) => n + l.length, 0), glowM, list,
    set(t, t0, dur = 2.6, depth = 110) {
      for (const { a, b, items } of list) {
        items.forEach((p, n) => { const k = clamp((t - t0 - p.d) / dur), e2 = 1 - Math.pow(1 - k, 3), y = SEABED - depth * p.s * (1 - e2) + Math.sin(k * 40) * 0.5 * (1 - k); M.compose(v3(p.x, y, p.z), q.setFromEuler(e.set(0, p.ry, 0)), v3(p.s, p.s, p.s)); a.setMatrixAt(n, M); b.setMatrixAt(n, M); });
        a.instanceMatrix.needsUpdate = true; b.instanceMatrix.needsUpdate = true;
      }
    } };
  api.set(-1e3, 0);
  return api;
}

// a colossal stepped temple, the one a story can stand in front of
export function greatTemple(o = {}) {
  const g = new THREE.Group(), b = new Batch(), st = surf('cobble', o.stone || '#e0cfa6', { roughness: 0.85 }), dk = surf('cobble', '#b59f76'), gold = paint('#ffc94a', { metalness: 0.9, roughness: 0.28 }), S = o.s ?? 1;
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#58f4ff').multiplyScalar(2.4) });
  let w = 130 * S, y = 0; const h = 15 * S;
  for (let i = 0; i < 7; i++) {
    b.box(st, w, h, w, 0, y + h / 2, 0, { r: 0.4 }); b.box(dk, w + 2, 1.6, w + 2, 0, y + h - 0.6, 0, { r: 0.2 });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, s = Math.sin(a), c = Math.cos(a); b.add(glow, new THREE.BoxGeometry(w * 0.9, 1.2, 0.5), s * (w / 2 + 0.1), y + h * 0.45, c * (w / 2 + 0.1), a); }
    for (let k = 0; k < Math.floor(w / 16); k++) for (const sd of [-1, 1]) { const x = -w / 2 + 8 + k * 16; if (Math.abs(x) < 12 * S) continue; b.box(dk, 3, h * 0.72, 2, x, y + h * 0.44, sd * (w / 2 + 0.6), { r: 0.1 }); b.box(dk, 2, h * 0.72, 3, sd * (w / 2 + 0.6), y + h * 0.44, x, { r: 0.1 }); }
    y += h; w -= 17 * S;
  }
  for (let i = 0; i < 44; i++) { const k = i / 44, yy = k * 7 * h, zz = (65 + 3) * S - k * 7 * 8.5 * S; b.box(st, 22 * S, 7 * h / 44 + 0.5, 3.2 * S, 0, yy + 0.8, zz, { r: 0.1 }); }
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const k = i / 6, yy = k * 7 * h, zz = (65 + 3) * S - k * 7 * 8.5 * S; b.box(dk, 3 * S, 7 * S, 6 * S, s * 12.6 * S, yy + 4 * S, zz, { r: 0.2 }); b.add(glow, new THREE.SphereGeometry(1.4 * S, 10, 8).toNonIndexed(), s * 12.6 * S, yy + 9 * S, zz); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; b.cyl(st, 1.6 * S, 2 * S, 16 * S, Math.cos(a) * 13 * S, y + 8 * S, Math.sin(a) * 13 * S, { seg: 12 }); }
  b.box(dk, 34 * S, 2.4 * S, 34 * S, 0, y + 17 * S, 0, { r: 0.2 }); b.add(gold, new THREE.ConeGeometry(20 * S, 22 * S, 4).toNonIndexed(), 0, y + 29 * S, 0, Math.PI / 4);
  b.done(g); g.height = y + 40 * S; return g;
}

// the seabed: a studded baseplate under drifts of sand
export function seabed(scene, ext = 3800) {
  const studs = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#9a9e9e'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(0, 0, w, 3); x.fillRect(0, 0, 3, h); for (const [a, b] of [[64, 64], [192, 64], [64, 192], [192, 192]]) { x.fillStyle = '#7a7e80'; x.beginPath(); x.arc(a + 3, b + 4, 40, 0, 7); x.fill(); x.fillStyle = '#b6babb'; x.beginPath(); x.arc(a, b, 38, 0, 7); x.fill(); x.fillStyle = '#c9cdcd'; x.beginPath(); x.arc(a - 6, b - 8, 22, 0, 7); x.fill(); } });
  studs.wrapS = studs.wrapT = THREE.RepeatWrapping; studs.repeat.set(ext / 26, ext / 26); studs.anisotropy = 8;
  const g = new THREE.PlaneGeometry(ext, ext, 240, 240); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, cl = new Float32Array(p.count * 3), a = col('#9fb0b0'), s = col('#e6d5a2'), w2 = col('#6f8f8a'), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), n = fbm(x * 0.006, z * 0.006), k = smooth(0.46, 0.62, n); p.setY(i, SEABED + k * 7 * fbm(x * 0.02, z * 0.02)); c.copy(a).lerp(s, k).lerp(w2, smooth(0.5, 0.75, fbm(x * 0.012 + 4, z * 0.012)) * 0.4); cl[i * 3] = c.r; cl[i * 3 + 1] = c.g; cl[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: studs, vertexColors: true, roughness: 0.75 })); m.receiveShadow = true; scene.add(m); return m;
}

// clouds of dust or mist: [{ x, y, z, t0, dur, size, rise }]; soft points that live and die by t
export function plumes(scene, list, o = {}) {
  const n = list.length, pos = new Float32Array(n * 3), dat = new Float32Array(n * 4);
  list.forEach((p, i) => { pos.set([p.x, p.y, p.z], i * 3); dat.set([p.t0, p.dur, p.size, p.rise ?? 6], i * 4); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('dat', new THREE.BufferAttribute(dat, 4));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { t: { value: 0 }, color: { value: col(o.color || '#e6d6b0') }, a: { value: o.alpha ?? 0.5 } },
    vertexShader: `attribute vec4 dat; uniform float t; varying float k; varying float sd;
      void main(){ float l = (t - dat.x) / dat.y; k = l; vec3 p = position; float e = clamp(l, 0.0, 1.0); p.y += dat.w * e; sd = fract(position.x * 0.137 + position.z * 0.071);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (l < 0.0 || l > 1.0) ? 0.0 : min(900.0, dat.z * (0.5 + e) * 1000.0 / max(1.0, -mv.z)); }`,
    fragmentShader: `uniform vec3 color; uniform float a; varying float k; varying float sd;
      void main(){ if (k < 0.0 || k > 1.0) discard; float d = length(gl_PointCoord - 0.5), s = smoothstep(0.5, 0.0, d); float f = smoothstep(0.0, 0.14, k) * (1.0 - smoothstep(0.45, 1.0, k)); gl_FragColor = vec4(color * (0.86 + 0.2 * sd), s * s * f * a); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.userData.noAO = true; pts.renderOrder = 3; scene.add(pts);
  pts.update = (t) => { m.uniforms.t.value = t; }; return pts;
}

// NPCs by the hundred that can bow: [{ x, y, z, yaw, d }]; d is the delay before each one bows
export function bowingCrowd(scene, list, o = {}) {
  const n = list.length, parts = {}, r = rng(o.seed || 12);
  const body = (name, w, h, d) => { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ roughness: 0.66 }), n); m.frustumCulled = false; m.castShadow = o.shadows !== false; m.receiveShadow = true; parts[name] = m; scene.add(m); return m; };
  const torso = body('torso', 2, 2, 1), head = body('head', 1.3, 1.3, 1.3), hat = body('hat', 1.44, 0.5, 1.44), legs = body('legs', 1.9, 2, 0.95), armL = body('al', 0.92, 2, 0.92), armR = body('ar', 0.92, 2, 0.92);
  const SK = ['#f3cfa8', '#e0ac7c', '#b97e50', '#8a5634'], SH = ['#e8e4dc', '#2e7bd6', '#d0392b', '#f1b82d', '#2fa35a', '#7a3fb0', '#e8753a', '#37b8b0', '#1f2a44'], PA = ['#25324d', '#6b5238', '#1f2024', '#e8e4dc'], HT = ['#2a1c12', '#111114', '#b98a3a', '#ffffff', '#c8362e', '#1f3a7a'], c = new THREE.Color(), pk = (a) => a[Math.floor(r() * a.length)];
  list.forEach((_, i) => { const s = pk(SK); head.setColorAt(i, c.set(s)); armL.setColorAt(i, c.set(s)); armR.setColorAt(i, c.set(s)); torso.setColorAt(i, c.set(pk(SH))); legs.setColorAt(i, c.set(pk(PA))); hat.setColorAt(i, c.set(pk(HT))); });
  Object.values(parts).forEach((m) => { m.instanceColor.needsUpdate = true; });
  const M = new THREE.Matrix4(), B = new THREE.Matrix4(), Up = new THREE.Matrix4(), T = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = v3(1, 1, 1);
  const at = (mesh, i, base, x, y, z) => { T.makeTranslation(x, y, z); M.multiplyMatrices(base, T); mesh.setMatrixAt(i, M); };
  return { parts, update(t, t0, rise = 0) {
    list.forEach((p, i) => {
      const k = smooth(0, 0.7, t - t0 - p.d), b = k * 1.05 + Math.sin(t * 1.6 + i) * 0.012;
      B.compose(v3(p.x, p.y + rise * (p.up || 0), p.z), q.setFromEuler(e.set(0, p.yaw, 0)), one);
      T.makeTranslation(0, 2, 0); Up.multiplyMatrices(B, T); T.makeRotationX(b); Up.multiply(T);
      at(legs, i, B, 0, 1, 0); at(torso, i, Up, 0, 1, 0); at(head, i, Up, 0, 2.66, 0); at(hat, i, Up, 0, 3.22, 0); at(armL, i, Up, -1.46, 1, 0.02); at(armR, i, Up, 1.46, 1, 0.02);
    });
    Object.values(parts).forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  } };
}
