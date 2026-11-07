// AltiWyre's cartoon faces on real Roblox avatars: expressions, blinks and lip sync.
// Images: tools/alti_pack.py -> assets/faces/alti/. Every image is one feature on a full 700 px face, so layers stack.
//
//   await loadAlti(['neutral', 'scared', 'shocked']);              // in setup, before makeCharacter: what the episode uses
//   const ch = makeCharacter({ avatar: 'daniel', alti: true, skin: '#f2c79a' });
//   ch.setFace('scared', { blink: blinkAt(t, 0.3), viseme: visemeAt(text, t0, t1, t), gaze: 'left' });
//
// spec.alti: true, or { lashes: true, y: 0, size: 1 } to tune the fit. The head's own texture is replaced with plain skin, so
// none of the avatar's face shows under the Alti face (no double faces). Presets are the video-farm's (docs/faces there).
import * as THREE from 'three';
import { U } from './core.js';

const BASE = '/web/assets/faces/alti/';
let IDX = null;
const IMG = new Map(), TEX = new Map();
const ALIAS = { smile: 'happy', worried: 'nervous', curious: 'surprised', shock: 'shocked', panic: 'terrified', fear: 'scared', frown: 'sad' };

const layersOf = (name, o = {}) => {
  name = ALIAS[name] || name;
  if (IDX.faces[name]) return [IDX.faces[name]];
  const p = IDX.presets[name] || IDX.presets.neutral;
  if (p.face) return [IDX.faces[p.face]];
  const out = [], gaze = o.gaze || p.gaze || 'forward', closed = o.blink ? (p.closed || 1) : p.closed;
  if (p.extra) out.push(IDX.extras[p.extra]);
  if (closed) { const c = IDX.closed[closed]; out.push(c.L, c.R); } else {
    const e = IDX.eyes[p.eyes || 1];
    out.push(e.L[gaze] ?? e.L.forward, e.R[gaze] ?? e.R.forward);
  }
  if (p.brows) { const b = IDX.brows[p.brows]; out.push(b.L, b.R); }
  const set = IDX.talk[p.talk || 'a'];
  if (o.viseme && set[o.viseme]) out.push(set[o.viseme]);
  else if (typeof p.mouth === 'string') out.push(IDX.speech[p.mouth]);
  else if (p.mouth) out.push(IDX.mouths[p.mouth]);
  return out.filter(Boolean);
};

// Loads what the named presets need, with their blinks and both complete talk sets.
export async function loadAlti(presets = ['neutral']) {
  if (!IDX) IDX = await (await fetch(BASE + 'index.json')).json();
  const want = new Set();
  for (const n of presets) {
    layersOf(n).forEach((i) => want.add(i)); layersOf(n, { blink: true }).forEach((i) => want.add(i));
    for (const v of ['A', 'CH', 'F', 'L', 'O', 'R', 'S', 'TH', 'W']) layersOf(n, { viseme: v }).forEach((i) => want.add(i));
  }
  await Promise.all([...want].filter((i) => !IMG.has(i)).map((i) => new Promise((ok, no) => {
    const m = new Image(); m.onload = () => { IMG.set(i, m); ok(); }; m.onerror = () => no(new Error('alti image ' + i)); m.src = `${BASE}${i}.png`;
  })));
}

function texFor(ids) {
  const k = ids.join();
  if (!TEX.has(k)) {
    const c = document.createElement('canvas'); c.width = c.height = 700;
    const x = c.getContext('2d');
    for (const i of ids) { const m = IMG.get(i); if (!m) throw new Error(`alti image ${i} not loaded: name its preset in loadAlti()`); x.drawImage(m, 0, 0); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    TEX.set(k, t);
  }
  return TEX.get(k);
}

// A sheet that follows the head's own front surface, found by casting rays at it (once per avatar). Its UVs put the pack's
// features at Roblox proportions: eyes across 72% of the head, the eye line a little above the middle.
function faceSheet(headGeos, o) {
  const heads = new THREE.Group(), box = new THREE.Box3();
  for (const g of headGeos) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); heads.add(m); g.computeBoundingBox(); box.union(g.boundingBox); }
  heads.updateMatrixWorld(true);
  const W = box.max.x - box.min.x, H = box.max.y - box.min.y, cx = (box.min.x + box.max.x) / 2, cy = (box.min.y + box.max.y) / 2;
  const px = (W * 0.7 * (o.size ?? 1)) / 417, N = 28, pos = [], uv = [], idx = [], ray = new THREE.Raycaster(), dir = new THREE.Vector3(0, 0, -1), from = new THREE.Vector3();
  const zs = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = box.min.x + 0.02 * W + (W * 0.96 * i) / N, y = box.min.y + 0.02 * H + (H * 0.96 * j) / N;
    ray.set(from.set(x, y, box.max.z + 1), dir);
    const hit = ray.intersectObject(heads, true)[0];
    zs.push(hit ? hit.point.z : null);
    pos.push(x, y, 0);
    uv.push(0, 1 - (400 / 700 + (cy + H * (o.y ?? -0.12) - y) / px / 700));
  }
  const rim = Math.min(...zs.filter((z) => z !== null));
  zs.forEach((z, i) => { pos[i * 3 + 2] = (z ?? rim) + 0.012; });
  // across each row, u follows the distance along the surface, so features wrap round the head instead of stretching at its sides
  const R = N + 1, mid = N / 2;
  for (let j = 0; j < R; j++) {
    const at = (i) => (j * R + i) * 3;
    uv[(j * R + mid) * 2] = 0.5;
    for (const dir of [-1, 1]) {
      let s = 0;
      for (let i = mid + dir; i >= 0 && i <= N; i += dir) {
        s += Math.hypot(pos[at(i)] - pos[at(i - dir)], pos[at(i) + 2] - pos[at(i - dir) + 2]);
        uv[(j * R + i) * 2] = 0.5 + (dir * s) / px / 700;
      }
    }
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  roundNormals(g, box);
  return g;
}

// Roblox's default head has sculpted eye sockets that show as rings under a drawn-on face: shade it as a smooth rounded box.
function roundNormals(g, box) {
  const c = box.getCenter(new THREE.Vector3()), h = box.getSize(new THREE.Vector3()).multiplyScalar(0.5), p = g.attributes.position, n = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set((p.getX(i) - c.x) / h.x, (p.getY(i) - c.y) / h.y, (p.getZ(i) - c.z) / h.z);
    v.set(v.x ** 3 / h.x, v.y ** 3 / h.y, v.z ** 3 / h.z).normalize();
    n[i * 3] = v.x; n[i * 3 + 1] = v.y; n[i * 3 + 2] = v.z;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
}

// Called by makeAvatarCharacter. headParts: its head meshes with the head's own skin texture; the rest (hair, hats) stay.
export function attachAlti(ch, headParts, spec, cache) {
  const o = spec.alti === true ? {} : spec.alti;
  const skin = new THREE.MeshStandardMaterial({ color: spec.skin || '#f2c79a', roughness: 0.75, emissive: spec.skin || '#f2c79a', emissiveIntensity: U.skinGlow });
  if (!cache.sheet) {
    cache.sheet = faceSheet(headParts.map((m) => m.geometry), o);
    const box = new THREE.Box3(); headParts.forEach((m) => { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); });
    cache.heads = headParts.map((m) => { const g = m.geometry.clone(); roundNormals(g, box); return g; });
  }
  headParts.forEach((m, i) => { m.material = skin; m.geometry = cache.heads[i]; });
  const mat = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.03, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    emissive: '#ffffff', emissiveIntensity: U.skinGlow * 0.8 });
  const sheet = new THREE.Mesh(cache.sheet, mat); sheet.userData.noAO = true; sheet.renderOrder = 2; ch.head.add(sheet);
  let key = '';
  ch.setFace = function setFace(expr, f = {}) {
    this.expr = expr;
    const ids = layersOf(expr, f), k = ids.join();
    if (k === key) return;
    key = k; mat.map = mat.emissiveMap = texFor(ids); mat.needsUpdate = true;
  };
  ch.faceSheet = sheet;
  ch.setFace('neutral');
}

// A short blink every few seconds, a pure function of t.
export function blinkAt(t, phase = 0) {
  const p = t + phase * 3.7, n = Math.floor(p / 3.7), at = (Math.sin(n * 12.9898 + phase * 78.233) * 43758.5453 % 1 + 1) % 1 * 2.6;
  return p - n * 3.7 > at && p - n * 3.7 < at + 0.12;
}

// The talk mouth for a spoken line at time t: its letters spread evenly over the line, closed between words.
export function visemeAt(text, t0, t1, t) {
  if (t < t0 || t >= t1) return null;
  const s = text.toLowerCase().replace(/[^a-z' ]/g, ''), i = Math.floor(((t - t0) / (t1 - t0)) * s.length), two = s.slice(i, i + 2), c = s[i];
  if (c === ' ' || c === "'") return null;
  if (two === 'th') return 'TH'; if (two === 'ch' || two === 'sh' || c === 'j') return 'CH';
  if ('aei'.includes(c)) return 'A'; if ('ou'.includes(c)) return 'O'; if ('wq'.includes(c)) return 'W';
  if ('fv'.includes(c)) return 'F'; if (c === 'l') return 'L'; if (c === 'r') return 'R';
  if ('mbp'.includes(c)) return null;
  return 'S';
}

// a whole face as a canvas (Episode 23: a photograph's face): the preset must be loaded with loadAlti()
export const altiCanvas = (name, o = {}) => texFor(layersOf(name, o)).image;
