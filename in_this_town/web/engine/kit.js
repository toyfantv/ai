// Detail kit: what turns boxes into a set. Tiling surfaces, bevelled parts batched into few meshes, and ready buildings,
// skylines and crowds. Detail comes from layers: trims, ledges, frames, signs. Everything is seeded, so a frame depends only on t.
//   const b = new Batch();  b.box(surf('brick', '#b5653f'), 10, 8, 10, 0, 4, 0);  scene.add(b.done());
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { v3, rng } from './core.js';

// ---- surfaces: a grey height map drawn once per kind; the material's colour tints it ----
const S = 512;
function draw(kind) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), r = rng(kind.length * 977 + 5);
  const grey = (v) => { const g = Math.round(v * 255); return `rgb(${g},${g},${g})`; };
  const grain = (n, a, sz = 2) => { for (let i = 0; i < n; i++) { x.fillStyle = grey(r() < 0.5 ? 0.3 : 1); x.globalAlpha = a * r(); x.fillRect(r() * S, r() * S, sz, sz); } x.globalAlpha = 1; };
  x.fillStyle = grey(0.86); x.fillRect(0, 0, S, S);
  if (kind === 'brick') {
    const rows = 16, h = S / rows, w = S / 6; x.fillStyle = grey(0.42); x.fillRect(0, 0, S, S);
    for (let j = 0; j < rows; j++) for (let i = -1; i < 7; i++) {
      x.fillStyle = grey(0.76 + r() * 0.2); x.fillRect(i * w + (j % 2) * w / 2 + 2, j * h + 2, w - 4, h - 4);
    }
    grain(5000, 0.12);
  } else if (kind === 'tile') {
    const n = 4, w = S / n; x.fillStyle = grey(0.5); x.fillRect(0, 0, S, S);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { x.fillStyle = grey(0.9 + r() * 0.1); x.fillRect(i * w + 3, j * w + 3, w - 6, w - 6); }
  } else if (kind === 'plank') {
    const n = 6, w = S / n;
    for (let i = 0; i < n; i++) {
      x.fillStyle = grey(0.72 + r() * 0.22); x.fillRect(i * w, 0, w - 3, S);
      for (let k = 0; k < 26; k++) { x.strokeStyle = grey(0.55 + r() * 0.2); x.globalAlpha = 0.35; x.beginPath(); const px = i * w + r() * w; x.moveTo(px, 0); x.bezierCurveTo(px + 5, S / 3, px - 5, S / 2, px, S); x.stroke(); }
      x.globalAlpha = 1; x.fillStyle = grey(0.3); x.fillRect(i * w + w - 3, 0, 3, S);
    }
  } else if (kind === 'grass') {
    x.fillStyle = grey(0.7); x.fillRect(0, 0, S, S);
    for (let i = 0; i < 9000; i++) { x.strokeStyle = grey(0.45 + r() * 0.55); x.lineWidth = 1 + r() * 1.6; x.globalAlpha = 0.5; const a = r() * S, b = r() * S, d = (r() - 0.5) * 8; x.beginPath(); x.moveTo(a, b); x.lineTo(a + d, b - 8 - r() * 12); x.stroke(); }
    x.globalAlpha = 1;
  } else if (kind === 'cobble') {
    x.fillStyle = grey(0.5); x.fillRect(0, 0, S, S);
    const n = 9, w = S / n;   // uneven set stones: no two the same size, so they don't read as dots
    for (let j = 0; j < n; j++) { let u = -r() * w; while (u < S) { const sw = w * (0.7 + r() * 0.9), sh = w * (0.82 + r() * 0.14), y = (j + 0.5) * w + (r() - 0.5) * w * 0.1; x.fillStyle = grey(0.66 + r() * 0.26); x.beginPath(); x.roundRect(u + 2, y - sh / 2, sw - 4, sh, w * 0.2); x.fill(); u += sw; } }
    grain(9000, 0.1);
  } else if (kind === 'sand') { grain(30000, 0.2, 2); grain(3000, 0.25, 4); }
  else if (kind === 'stucco') { grain(16000, 0.13, 3); }
  else if (kind === 'concrete') {
    grain(14000, 0.12, 2); x.fillStyle = grey(0.5); x.fillRect(0, 0, S, 3); x.fillRect(0, 0, 3, S);
  } else if (kind === 'corrugated') {
    for (let i = 0; i < 32; i++) { const g = x.createLinearGradient(i * 16, 0, i * 16 + 16, 0); g.addColorStop(0, grey(0.6)); g.addColorStop(0.5, grey(1)); g.addColorStop(1, grey(0.6)); x.fillStyle = g; x.fillRect(i * 16, 0, 16, S); }
  } else if (kind === 'shingle') {
    const rows = 12, h = S / rows, w = S / 10; x.fillStyle = grey(0.35); x.fillRect(0, 0, S, S);
    for (let j = 0; j < rows; j++) for (let i = -1; i < 11; i++) { x.fillStyle = grey(0.7 + r() * 0.28); x.fillRect(i * w + (j % 2) * w / 2 + 1, j * h, w - 2, h - 3); }
  } else if (kind === 'siding') {   // lap siding (Episode 23): horizontal boards, each with a shadow line under its lip
    const n = 10, h = S / n;
    for (let j = 0; j < n; j++) { const g = x.createLinearGradient(0, j * h, 0, (j + 1) * h); g.addColorStop(0, grey(0.98)); g.addColorStop(0.82, grey(0.86)); g.addColorStop(0.9, grey(0.62)); g.addColorStop(1, grey(0.42)); x.fillStyle = g; x.fillRect(0, j * h, S, h); }
    grain(6000, 0.06);
  } else if (kind === 'hazard') {
    x.fillStyle = '#f2c21a'; x.fillRect(0, 0, S, S); x.fillStyle = '#17171b';
    for (let i = -2; i < 6; i += 2) { x.beginPath(); x.moveTo(i * 64 * 2, S); x.lineTo((i + 1) * 128, S); x.lineTo((i + 1) * 128 + S, 0); x.lineTo(i * 128 + S, 0); x.fill(); }
  } else if (kind === 'facade') {
    x.fillStyle = grey(0.82); x.fillRect(0, 0, S, S); const n = 8, w = S / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { x.fillStyle = r() < 0.2 ? '#fff0b4' : `rgb(${40 + r() * 30},${80 + r() * 40},${130 + r() * 50})`; x.fillRect(i * w + w * 0.2, j * w + w * 0.14, w * 0.6, w * 0.68); }
  }
  return c;
}
function normalFrom(canvas, strength) {
  const d = canvas.getContext('2d').getImageData(0, 0, S, S).data, o = document.createElement('canvas');
  o.width = o.height = S; const x = o.getContext('2d'), im = x.createImageData(S, S);
  const h = (i, j) => d[((((j + S) % S) * S + ((i + S) % S)) * 4)] / 255;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = (h(i - 1, j) - h(i + 1, j)) * strength, dy = (h(i, j - 1) - h(i, j + 1)) * strength, l = 1 / Math.hypot(dx, dy, 1), k = (j * S + i) * 4;
    im.data[k] = (dx * l * 0.5 + 0.5) * 255; im.data[k + 1] = (-dy * l * 0.5 + 0.5) * 255; im.data[k + 2] = (l * 0.5 + 0.5) * 255; im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0); return o;
}
const SPAN = { grass: 12, cobble: 7, brick: 9, tile: 8, plank: 7, sand: 14, stucco: 10, concrete: 12, corrugated: 9, shingle: 8, siding: 6, hazard: 4, facade: 40 };
const ROUGH = { tile: 0.28, hazard: 0.6, corrugated: 0.5 };
const tex = new Map(), mats = new Map();
function maps(kind) {
  if (!tex.has(kind)) {
    const c = draw(kind), wrap = (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
    const map = wrap(new THREE.CanvasTexture(c)); map.colorSpace = THREE.SRGBColorSpace;
    tex.set(kind, { map, normalMap: wrap(new THREE.CanvasTexture(normalFrom(c, 3))) });
  }
  return tex.get(kind);
}
// a tiling material; UVs are in world units, so bricks stay brick-sized on any wall
export function surf(kind, color = '#ffffff', o = {}) {
  const k = `${kind}|${color}|${JSON.stringify(o)}`;
  if (!mats.has(k)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: ROUGH[kind] ?? 0.82, metalness: 0, ...maps(kind), normalScale: new THREE.Vector2(0.7, 0.7), ...o });
    m.userData.span = SPAN[kind]; mats.set(k, m);
  }
  return mats.get(k);
}
const plainCache = new Map();
export function paint(color, o = {}) {
  const k = `${color}|${JSON.stringify(o)}`;
  if (!plainCache.has(k)) plainCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o }));
  return plainCache.get(k);
}

function worldUV(g, span) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / span, p.getZ(i) / span);
    else if (ax >= az) uv.setXY(i, p.getZ(i) / span, p.getY(i) / span);
    else uv.setXY(i, p.getX(i) / span, p.getY(i) / span);
  }
  return g;
}

// Collects parts and merges them per material: a detailed building is a few draw calls, not hundreds.
export class Batch {
  constructor() { this.parts = new Map(); this.m = new THREE.Matrix4(); }
  add(mat, g, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
    if (g.index) g = g.toNonIndexed();
    g.applyMatrix4(this.m.compose(v3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), v3(1, 1, 1)));
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
    return this;
  }
  // a bevelled box, centred at x, y, z; r is the edge radius
  box(mat, w, h, d, x = 0, y = 0, z = 0, o = {}) {
    const r = Math.min(o.r ?? 0.1, w / 2.2, h / 2.2, d / 2.2);
    const g = new RoundedBoxGeometry(w, h, d, 2, r);
    return this.add(mat, worldUV(g, mat.userData.span || 8), x, y, z, o.ry || 0, o.rx || 0, o.rz || 0);
  }
  cyl(mat, rt, rb, h, x = 0, y = 0, z = 0, o = {}) {
    return this.add(mat, new THREE.CylinderGeometry(rt, rb, h, o.seg || 16), x, y, z, o.ry || 0, o.rx || 0, o.rz || 0);
  }
  done(group = new THREE.Group()) {
    for (const [mat, list] of this.parts) {
      const m = new THREE.Mesh(mergeGeometries(list, false), mat);
      m.castShadow = !mat.transparent; m.receiveShadow = true; group.add(m);
      list.forEach((g) => g.dispose());
    }
    this.parts.clear();
    return group;
  }
}

// ---- signs ----
export function sign(text, o = {}) {
  const w = o.w ?? 10, h = o.h ?? 2.4, c = document.createElement('canvas');
  c.width = 1024; c.height = Math.round(1024 * h / w);
  const x = c.getContext('2d'); x.fillStyle = o.bg || '#1d2233'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = o.edge || o.fg || '#f4e7c4'; x.lineWidth = c.height * 0.035; x.strokeRect(c.height * 0.06, c.height * 0.06, c.width - c.height * 0.12, c.height - c.height * 0.12);
  x.fillStyle = o.fg || '#f4e7c4'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = String(text).split('\n'); let size = c.height * (lines.length > 1 ? 0.33 : 0.52);
  x.font = `900 ${size}px ITTInter, sans-serif`;
  const widest = Math.max(...lines.map((l) => x.measureText(l).width));
  if (widest > c.width * 0.88) { size *= c.width * 0.88 / widest; x.font = `900 ${size}px ITTInter, sans-serif`; }
  lines.forEach((l, i) => x.fillText(l, c.width / 2, c.height / 2 + (i - (lines.length - 1) / 2) * size * 1.15));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const g = new THREE.Group(), b = new Batch();
  b.box(paint(o.frame || '#2b2f3a', { metalness: 0.3 }), w + 0.3, h + 0.3, 0.3, 0, 0, -0.1); b.done(g);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
  face.position.z = 0.06; face.receiveShadow = true; g.add(face);
  return g;
}

// ---- small props ----
export function crate(o = {}) {
  const s = o.size ?? 2.4, m = surf('plank', o.color || '#a9743f'), f = paint('#6d4522', { roughness: 0.8 }), b = new Batch();
  b.box(m, s, s, s, 0, s / 2, 0, { r: 0.05 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(f, 0.26, s + 0.04, 0.26, sx * (s / 2 - 0.1), s / 2, sz * (s / 2 - 0.1), { r: 0.04 });
  for (const y of [0.13, s - 0.13]) for (const z of [-1, 1]) { b.box(f, s + 0.04, 0.26, 0.26, 0, y, z * (s / 2 - 0.1), { r: 0.04 }); b.box(f, 0.26, 0.26, s + 0.04, z * (s / 2 - 0.1), y, 0, { r: 0.04 }); }
  return b.done();
}
export function barrel(o = {}) {
  const h = o.height ?? 3.2, r = h * 0.3, b = new Batch(), m = paint(o.color || '#8a5a30', { roughness: 0.7 }), band = paint('#3a3d44', { metalness: 0.7, roughness: 0.4 });
  b.cyl(m, r * 0.86, r, h / 2, 0, h * 0.75); b.cyl(m, r, r * 0.86, h / 2, 0, h * 0.25);
  for (const y of [0.2, 0.5, 0.8]) b.cyl(band, r * (y === 0.5 ? 1.03 : 0.96), r * (y === 0.5 ? 1.03 : 0.96), 0.14, 0, h * y);
  return b.done();
}
export function lamp(o = {}) {
  const h = o.height ?? 13, g = new THREE.Group(), b = new Batch(), m = paint(o.color || '#23262e', { metalness: 0.5, roughness: 0.45 });
  b.cyl(m, 0.4, 0.55, 0.9, 0, 0.45); b.cyl(m, 0.13, 0.2, h, 0, h / 2); b.cyl(m, 0.24, 0.24, 0.25, 0, h * 0.42);
  b.box(m, 1.8, 0.14, 0.14, 0.8, h, 0, { r: 0.05 }); b.cyl(m, 0.1, 0.52, 0.42, 1.55, h - 0.2);
  b.done(g);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(o.glow || '#ffe2a8').multiplyScalar(o.on === false ? 0.5 : 3) }));
  glow.position.set(1.55, h - 0.5, 0); glow.userData.noAO = true; g.add(glow);
  return g;
}

// ---- a building with its layers ----
//   style: 'brick' | 'stucco' | 'concrete'; floors, w, d, wall, trim, roof ('flat' | 'gable'), lit (0-1), name (a shop sign)
export function building(o = {}) {
  const r = rng(o.seed || 1), floors = o.floors ?? 3, fh = o.floorH ?? 7, w = o.w ?? 24, d = o.d ?? 18, H = floors * fh + 1.2;
  const wall = surf(o.style || 'brick', o.wall || '#b86b4b'), trim = paint(o.trim || '#efe6d6', { roughness: 0.55 }), dark = paint(o.dark || '#2f3440', { roughness: 0.5 });
  const b = new Batch(), lit = o.lit ?? 0.25;
  const glass = new THREE.MeshStandardMaterial({ color: '#4d7ea8', roughness: 0.08, metalness: 0.4 });
  const litGlass = new THREE.MeshStandardMaterial({ color: '#3b3020', emissive: '#ffd58a', emissiveIntensity: 1.6, roughness: 0.3 });
  b.box(wall, w, H, d, 0, H / 2, 0, { r: 0.15 });
  b.box(paint(o.plinth || '#6f6a66', { roughness: 0.8 }), w + 0.5, 1.2, d + 0.5, 0, 0.6, 0, { r: 0.12 });   // plinth
  for (let f = 1; f < floors; f++) b.box(trim, w + 0.35, 0.34, d + 0.35, 0, 1.2 + f * fh, 0, { r: 0.1 });     // floor bands
  b.box(trim, w + 0.9, 0.5, d + 0.9, 0, H + 0.1, 0, { r: 0.14 }); b.box(trim, w + 1.5, 0.3, d + 1.5, 0, H + 0.5, 0, { r: 0.1 });   // cornice
  // windows on each face: frame, sill, lintel, mullions, shutters
  const face = (ry, half, span, count, ground) => {
    const c = Math.cos(ry), s = Math.sin(ry), at = (u, y, out) => [c * u + s * (half + out), y, -s * u + c * (half + out)];
    for (let f = 0; f < floors; f++) for (let i = 0; i < count; i++) {
      const u = (i + 0.5 - count / 2) * (span / count), y = 1.2 + f * fh + fh * 0.52;
      if (ground && f === 0 && Math.abs(u) < span / count * 0.6) continue;   // the door goes here
      const ww = Math.min(3.2, span / count * 0.56), wh = fh * 0.56;
      b.box(trim, ww + 0.5, wh + 0.5, 0.3, ...at(u, y, 0.05), { ry, r: 0.06 });
      b.box(r() < lit ? litGlass : glass, ww, wh, 0.1, ...at(u, y, 0.2), { ry, r: 0.02 });
      b.box(trim, 0.14, wh, 0.16, ...at(u, y, 0.26), { ry, r: 0.03 }); b.box(trim, ww, 0.14, 0.16, ...at(u, y + wh * 0.12, 0.26), { ry, r: 0.03 });
      b.box(trim, ww + 0.9, 0.22, 0.6, ...at(u, y - wh / 2 - 0.3, 0.3), { ry, r: 0.06 });   // sill
      b.box(dark, ww + 0.8, 0.26, 0.42, ...at(u, y + wh / 2 + 0.34, 0.22), { ry, r: 0.06 });   // lintel
      if (o.shutters) for (const sd of [-1, 1]) b.box(paint(o.shutters, { roughness: 0.6 }), ww * 0.42, wh + 0.1, 0.14, ...at(u + sd * (ww / 2 + ww * 0.27), y, 0.2), { ry, r: 0.03 });
    }
  };
  const nx = o.windows ?? Math.max(2, Math.round(w / 6)), nz = Math.max(2, Math.round(d / 6));
  face(0, d / 2, w, nx, true); face(Math.PI, d / 2, w, nx); face(Math.PI / 2, w / 2, d, nz); face(-Math.PI / 2, w / 2, d, nz);
  // door: frame, panels, step, handle
  const dz = d / 2, dh = Math.min(5.6, fh * 0.8);
  b.box(trim, 4.2, dh + 0.5, 0.4, 0, 1.2 + dh / 2, dz + 0.05, { r: 0.06 });
  b.box(paint(o.door || '#5a2e2a', { roughness: 0.45 }), 3.4, dh, 0.2, 0, 1.2 + dh / 2, dz + 0.22, { r: 0.04 });
  for (const y of [0.32, 0.72]) b.box(paint(o.door || '#5a2e2a', { roughness: 0.35 }), 2.5, dh * 0.3, 0.1, 0, 1.2 + dh * y, dz + 0.34, { r: 0.03 });
  b.cyl(paint('#d8b24a', { metalness: 0.9, roughness: 0.3 }), 0.13, 0.13, 0.3, 1.25, 1.2 + dh * 0.47, dz + 0.42, { rx: Math.PI / 2 });
  b.box(paint('#a9a49c', { roughness: 0.85 }), 5.4, 0.42, 2.4, 0, 0.21, dz + 1.2, { r: 0.08 }); b.box(paint('#a9a49c', { roughness: 0.85 }), 4.8, 0.42, 1.2, 0, 0.63, dz + 0.65, { r: 0.08 });
  // roof
  if (o.roof === 'gable') {
    const rm = surf('shingle', o.roofColor || '#7d3f35'), rise = w * 0.26, len = Math.hypot(w / 2 + 1, rise), ang = Math.atan2(rise, w / 2 + 1);
    for (const s of [-1, 1]) b.box(rm, len, 0.5, d + 2, s * (w / 4 + 0.5), H + 0.65 + rise / 2, 0, { rz: -s * ang, r: 0.08 });
    b.add(wall, new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rise)]), { depth: d - 0.2, bevelEnabled: false }), 0, H + 0.65, -d / 2 + 0.1);
    b.box(surf('brick', '#8c5040'), 2.2, rise + 3, 2.2, w * 0.24, H + rise * 0.8, -d * 0.2, { r: 0.08 });
    b.box(trim, 2.7, 0.3, 2.7, w * 0.24, H + rise * 1.3 + 1.5, -d * 0.2, { r: 0.08 });
  } else {
    b.box(paint('#5b5f66', { roughness: 0.9 }), w - 0.8, 0.3, d - 0.8, 0, H + 0.42, 0, { r: 0.05 });
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const x = (r() - 0.5) * (w - 8), z = (r() - 0.5) * (d - 8), mm = paint('#b9bcc2', { metalness: 0.6, roughness: 0.45 });
      b.box(mm, 3, 1.8, 2.2, x, H + 1.5, z, { r: 0.1 }); b.cyl(paint('#3a3d44', { metalness: 0.6 }), 0.7, 0.7, 0.12, x, H + 2.45, z); b.cyl(mm, 0.14, 0.14, 2.6, x + 2.4, H + 1.8, z);
    }
  }
  const g = b.done();
  if (o.name) { const s = sign(o.name, { w: Math.min(w * 0.6, 14), h: 2.2, bg: o.signBg, fg: o.signFg }); s.position.set(0, 1.2 + fh + 0.1, d / 2 + 0.34); if (floors === 1) s.position.y = H - 1.2; g.add(s); }
  return g;
}

// ---- scale: instanced towers and crowds ----
export function skyline(o = {}) {
  const r = rng(o.seed || 5), n = o.count ?? 160, W = o.spread ?? 700, gap = o.gap ?? 90;
  const cols = o.colors || ['#d9dee6', '#c9b8a4', '#a8bcd0', '#e4d2bd', '#b4b9c2'];
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: maps('facade').map, roughness: 0.42, metalness: 0.1 }), n);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    let x, z; do { x = (r() - 0.5) * W; z = (r() - 0.5) * W; } while (Math.hypot(x, z) < gap);
    const h = (o.minH ?? 40) + Math.pow(r(), 2.4) * (o.maxH ?? 240), w = 16 + r() * 22;
    M.compose(v3(x, h / 2, z), q, v3(w, h, w * (0.8 + r() * 0.4))); im.setMatrixAt(i, M); im.setColorAt(i, c.set(cols[Math.floor(r() * cols.length)]));
  }
  im.castShadow = false; im.receiveShadow = false; im.frustumCulled = false;
  if (o.parent) o.parent.add(im);
  return im;
}

// JavaScript-built extras: blocky people as five instanced meshes, so a crowd of hundreds costs about the same as one
// avatar. Use it for crowds and unnamed extras; named characters keep their cast model.
//   const c = crowd({ count: 400, layout: 'ring', radius: 30, look: v3(0, 0, 0) });  c.update(t) makes them shift and wave
const SKIN = ['#f3cfa8', '#e0ac7c', '#b97e50', '#8a5634', '#5c3a24'];
const SHIRT = ['#d0392b', '#2e7bd6', '#2fa35a', '#f1b82d', '#8e44ad', '#e8e4dc', '#22252e', '#e8753a', '#37b8b0', '#d65d9b'];
const LEGS = ['#25324d', '#3a3f4a', '#6b5238', '#1f2024', '#55708f'];
const HAIR = ['#2a1c12', '#5b3a1e', '#111114', '#b98a3a', '#7a2f1c'];
export function crowd(o = {}) {
  const r = rng(o.seed || 9), n = o.count ?? 200, s = o.scale ?? 1, parts = {};
  const body = (name, w, h, d) => {
    const m = new THREE.InstancedMesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * 0.12), new THREE.MeshStandardMaterial({ roughness: 0.68 }), n);
    m.castShadow = o.shadows !== false; m.receiveShadow = true; m.frustumCulled = false; parts[name] = m; return m;
  };
  const torso = body('torso', 2, 2, 1), head = body('head', 1.25, 1.25, 1.25), hair = body('hair', 1.34, 0.56, 1.34), legs = body('legs', 1.9, 2, 0.95), armL = body('armL', 0.92, 2, 0.92), armR = body('armR', 0.92, 2, 0.92);
  const people = [], c = new THREE.Color(), pick = (a) => a[Math.floor(r() * a.length)];
  for (let i = 0; i < n; i++) {
    let x, z;
    if (o.layout === 'ring') { const a = r() * Math.PI * 2, d = (o.radius ?? 30) + r() * (o.depth ?? 16); x = Math.cos(a) * d; z = Math.sin(a) * d; }
    else if (o.layout === 'rows') { const per = o.perRow ?? 20; x = (i % per - per / 2) * 3.2 + (r() - 0.5) * 0.6; z = Math.floor(i / per) * 3.6 + (r() - 0.5) * 0.6; }
    else { x = (r() - 0.5) * (o.w ?? 60); z = (r() - 0.5) * (o.d ?? 40); }
    const lookAt = o.look || v3(0, 0, 500), yaw = Math.atan2(lookAt.x - x, lookAt.z - z) + (r() - 0.5) * 0.5;
    people.push({ x, z, yaw, ph: r() * 9, up: r() < (o.cheer ?? 0.2), sc: s * (0.92 + r() * 0.16) });
    const skin = pick(SKIN); head.setColorAt(i, c.set(skin)); armL.setColorAt(i, c.set(skin)); armR.setColorAt(i, c.set(skin));
    torso.setColorAt(i, c.set(pick(SHIRT))); legs.setColorAt(i, c.set(pick(LEGS))); hair.setColorAt(i, c.set(pick(HAIR)));
  }
  const g = new THREE.Group(); Object.values(parts).forEach((m) => g.add(m));
  const M = new THREE.Matrix4(), P = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = v3(1, 1, 1);
  const at = (mesh, i, base, x, y, z, rx = 0) => { M.compose(v3(x, y, z), q.setFromEuler(e.set(rx, 0, 0)), one); mesh.setMatrixAt(i, P.multiplyMatrices(base, M)); };
  const B = new THREE.Matrix4();
  g.update = (t) => {
    people.forEach((p, i) => {
      const bob = Math.abs(Math.sin(t * 2.4 + p.ph)) * 0.12, sway = Math.sin(t * 1.3 + p.ph) * 0.05;
      B.compose(v3(p.x, bob * p.sc, p.z), q.setFromEuler(e.set(0, p.yaw + sway, 0)), v3(p.sc, p.sc, p.sc));
      at(legs, i, B, 0, 1, 0); at(torso, i, B, 0, 3, 0); at(head, i, B, 0, 4.66, 0); at(hair, i, B, 0, 5.18, 0);
      const wave = p.up ? Math.PI * 0.86 + Math.sin(t * 7 + p.ph) * 0.3 : Math.sin(t * 1.7 + p.ph) * 0.1;
      at(armL, i, B, -1.46, 3 + (p.up ? 1.5 : 0), 0, 0); at(armR, i, B, 1.46, 3 + (p.up ? 1.6 : 0), 0, p.up ? wave - Math.PI : wave);
    });
    Object.values(parts).forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  };
  g.update(0);
  Object.values(parts).forEach((m) => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  if (o.parent) o.parent.add(g);
  return g;
}
