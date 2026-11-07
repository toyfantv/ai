// Real Roblox avatars: load an OBJ/MTL downloaded by tools/roblox_avatar.py, split it onto the same
// rig the procedural characters use (hips, torso, neck, two arms, two legs), so pose(), walk cycles,
// head turns and anything episodes attach to ch.neck / ch.torso keep working unchanged.
//
// Splitting: OBJ groups named after Roblox body parts (Head, UpperTorso, LeftUpperArm, Left Leg, ...)
// go to that bone whole. Everything else (accessories, layered clothing, a single merged mesh) is
// cut per triangle by where its corners sit: above the neck -> head, outside the shoulders -> arm, below
// the hips -> leg, otherwise torso. Hats and hair whose centre is above the neck follow the head whole.
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { patchCaustics } from './core.js';

const BASE = '/web/assets/avatars/';
const REG = new Map();   // key -> template

const PART_RE = [
  ['head', /^(head|face)$/],
  ['torso', /^(uppertorso|lowertorso|torso|humanoidrootpart|rootpart)$/],
  ['arm', /^(left|right)(upperarm|lowerarm|hand|arm)$/],
  ['leg', /^(left|right)(upperleg|lowerleg|foot|leg)$/],
];
function partOf(name) {
  const n = String(name || '').toLowerCase().replace(/[\s_]+/g, '').replace(/\d+$/, '');
  for (const [cat, re] of PART_RE) if (re.test(n)) return cat;
  return null;
}

// Load the avatars listed in web/assets/avatars/index.json (written by the fetch tool).
// Missing index -> no avatars, everyone stays procedural. The farm library (farm_*) is opt-in: an episode loads only the
// ones it names (initStage(ep, { avatars: [...] })); 'all' is for the check pages.
export async function loadAvatars(want = []) {
  let idx = {};
  try { const r = await fetch(BASE + 'index.json'); if (r.ok) idx = await r.json(); } catch { /* none */ }
  if (new URLSearchParams(location.search).get('avatars') === '0') idx = {};
  if (want !== 'all') idx = Object.fromEntries(Object.entries(idx).filter(([k]) => !k.startsWith('farm_') || want.includes(k)));
  await Promise.all(Object.entries(idx).map(async ([key, rel]) => {
    try { REG.set(key, await loadOne(key, BASE + rel)); } catch (e) { console.error(`avatar ${key} failed to load: ${e.message}`); }
  }));
  return [...REG.keys()];
}
export const hasAvatar = (key) => !!key && REG.has(key);

async function loadOne(key, url) {
  const info = await (await fetch(url)).json();
  const dir = url.slice(0, url.lastIndexOf('/') + 1);
  const mtl = await new MTLLoader().setPath(dir).loadAsync(info.mtl || 'model.mtl');
  mtl.preload();
  const obj = await new OBJLoader().setMaterials(mtl).setPath(dir).loadAsync(info.obj || 'model.obj');
  return buildTemplate(info, obj);
}

// ---------- template: normalised, split geometry ----------
function buildTemplate(info, obj) {
  // orient to face +Z, feet on y = 0, centred, optional target height
  const xf = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(info.yaw || 0));
  const meshes = [];
  obj.updateMatrixWorld(true);
  obj.traverse((m) => { if (m.isMesh) meshes.push(m); });
  if (!meshes.length) throw new Error('OBJ has no meshes');
  const box = new THREE.Box3();
  const geos = meshes.map((m) => {
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld).applyMatrix4(xf);
    g.computeBoundingBox(); box.union(g.boundingBox);
    return g;
  });
  // body box from named parts when present (accessories don't stretch it)
  const bodyBox = new THREE.Box3();
  meshes.forEach((m, i) => { if (partOf(m.name)) bodyBox.union(geos[i].boundingBox); });
  const ref = bodyBox.isEmpty() ? box : bodyBox;
  const H = ref.max.y - ref.min.y;
  const s = info.height ? info.height / H : 1;
  const ctr = ref.getCenter(new THREE.Vector3());
  const norm = new THREE.Matrix4().makeScale(s, s, s).multiply(new THREE.Matrix4().makeTranslation(-ctr.x, -ref.min.y, -ctr.z));
  geos.forEach((g) => { g.applyMatrix4(norm); g.computeBoundingBox(); });

  // landmarks
  const nb = { head: new THREE.Box3(), torso: new THREE.Box3(), arm: new THREE.Box3(), leg: new THREE.Box3() };
  meshes.forEach((m, i) => { const c = partOf(m.name); if (c) nb[c].union(geos[i].boundingBox); });
  const h = H * s, wFull = (ref.max.x - ref.min.x) * s;
  const lm = {
    hipY: !nb.leg.isEmpty() ? nb.leg.max.y : h * 0.38,
    neckY: !nb.head.isEmpty() ? nb.head.min.y : h * 0.765,
    shoulderX: !nb.torso.isEmpty() ? nb.torso.max.x : (!nb.arm.isEmpty() ? Math.min(Math.abs(nb.arm.min.x), nb.arm.max.x) : wFull * 0.25),
    ...(info.landmarks || {}),
  };
  const headOnly = new Set(info.head_only || []);

  // per-region, per-material triangle soup
  const regions = { head: new Map(), torso: new Map(), arm0: new Map(), arm1: new Map(), leg0: new Map(), leg1: new Map() };
  const sideKey = (base, x) => base + (x < 0 ? 0 : 1);   // index 0 = -X side, like the procedural rig
  const regionAt = (x, y) => {
    if (y >= lm.neckY) return 'head';
    if (Math.abs(x) > lm.shoulderX) return sideKey('arm', x);
    if (y < lm.hipY) return sideKey('leg', x);
    return 'torso';
  };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  meshes.forEach((m, i) => {
    const g = geos[i];
    const cat = headOnly.has(m.name) ? 'head' : partOf(m.name);
    const gc = g.boundingBox.getCenter(new THREE.Vector3());
    const whole = cat === 'head' || cat === 'torso' ? cat
      : cat ? sideKey(cat, gc.x)
      : gc.y >= lm.neckY ? 'head' : null;   // hats, hair, faces: follow the head as one piece
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const groups = g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
    const P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv;
    for (const gr of groups) {
      const mt = mats[gr.materialIndex ?? 0] || mats[0];
      for (let v = gr.start; v < gr.start + gr.count; v += 3) {
        let rs = [whole];
        if (!whole) {
          // a triangle straddling a joint goes to every region it touches, so bending opens no gap
          a.fromBufferAttribute(P, v); b.fromBufferAttribute(P, v + 1); c.fromBufferAttribute(P, v + 2);
          rs = [...new Set([regionAt(a.x, a.y), regionAt(b.x, b.y), regionAt(c.x, c.y)])];
        }
        for (const r of rs) {
          const map = regions[r];
          if (!map.has(mt)) map.set(mt, { p: [], n: [], uv: [] });
          const dst = map.get(mt);
          for (let k = 0; k < 3; k++) {
            dst.p.push(P.getX(v + k), P.getY(v + k), P.getZ(v + k));
            if (N) dst.n.push(N.getX(v + k), N.getY(v + k), N.getZ(v + k));
            if (UV) dst.uv.push(UV.getX(v + k), UV.getY(v + k));
          }
        }
      }
    }
  });

  // joint pivots (absolute, normalised space)
  const regionBox = (r) => { const bx = new THREE.Box3(); for (const d of regions[r].values()) for (let k = 0; k < d.p.length; k += 3) bx.expandByPoint(a.set(d.p[k], d.p[k + 1], d.p[k + 2])); return bx; };
  const piv = { hips: new THREE.Vector3(0, lm.hipY, 0), neck: new THREE.Vector3(0, lm.neckY, 0) };
  for (const sd of [0, 1]) {
    const ab = regionBox('arm' + sd), lb = regionBox('leg' + sd), sgn = sd ? 1 : -1;
    const armTop = ab.isEmpty() ? lm.neckY : ab.max.y;
    piv['arm' + sd] = new THREE.Vector3(ab.isEmpty() ? sgn * lm.shoulderX * 1.5 : (ab.min.x + ab.max.x) / 2, Math.min(armTop, lm.neckY) - 0.2 * (h / 5.3), 0);
    piv['leg' + sd] = new THREE.Vector3(lb.isEmpty() ? sgn * lm.shoulderX * 0.5 : (lb.min.x + lb.max.x) / 2, lm.hipY, 0);
  }
  const pivotFor = { head: piv.neck, torso: piv.hips, arm0: piv.arm0, arm1: piv.arm1, leg0: piv.leg0, leg1: piv.leg1 };
  const parts = {};
  for (const [r, map] of Object.entries(regions)) {
    parts[r] = [];
    for (const [mt, d] of map) {
      if (!d.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3));
      if (d.n.length === d.p.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(d.n, 3)); else g.computeVertexNormals();
      if (d.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
      g.translate(-pivotFor[r].x, -pivotFor[r].y, -pivotFor[r].z);
      parts[r].push({ geometry: g, material: mt });
    }
  }
  return { info, lm, piv, parts, height: h, mats: new Map() };
}

// MTL gives Phong materials; swap for the scene's standard material (same roughness as mat()).
function standard(T, src, caustic) {
  const k = src.uuid + (caustic ? 'c' : '');
  if (T.mats.has(k)) return T.mats.get(k);
  const m = new THREE.MeshStandardMaterial({
    color: src.color ? src.color.clone() : new THREE.Color(1, 1, 1), map: src.map || null, alphaMap: src.alphaMap || null,
    transparent: !!src.transparent || src.opacity < 1, opacity: src.opacity ?? 1, alphaTest: src.map ? 0.02 : 0,
    roughness: 0.75, metalness: 0, side: THREE.FrontSide,
  });
  if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.anisotropy = 4; }
  if (m.transparent) m.depthWrite = m.opacity > 0.5;
  if (caustic) patchCaustics(m);
  T.mats.set(k, m);
  return m;
}

// ---------- character instance (same shape as makeCharacter's result) ----------
export function makeAvatarCharacter(spec) {
  const T = REG.get(spec.avatar);
  const caustic = spec.caustic !== false;
  const root = new THREE.Group();
  const scaleG = new THREE.Group(); scaleG.scale.setScalar(spec.scale || 1); root.add(scaleG);
  const { piv } = T;
  const hips = new THREE.Group(); hips.position.copy(piv.hips); scaleG.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const neck = new THREE.Group(); neck.position.copy(piv.neck).sub(piv.hips); torso.add(neck);
  const head = new THREE.Group(); neck.add(head);
  const add = (r, parent) => T.parts[r].forEach(({ geometry, material }) => {
    const m = new THREE.Mesh(geometry, standard(T, material, caustic));
    m.castShadow = true; m.receiveShadow = true; parent.add(m);
  });
  add('torso', torso); add('head', head);
  const arms = [0, 1].map((sd) => { const g = new THREE.Group(); g.position.copy(piv['arm' + sd]).sub(piv.hips); torso.add(g); add('arm' + sd, g); return g; });
  const legs = [0, 1].map((sd) => { const g = new THREE.Group(); g.position.copy(piv['leg' + sd]).sub(piv.hips); hips.add(g); add('leg' + sd, g); return g; });
  const hipY = piv.hips.y;
  return {
    root, hips, torso, neck, head, legs, arms, spec, lid: null, expr: 'neutral', hipY, avatar: spec.avatar,
    // A real avatar keeps its own Roblox face; expressions are remembered so episode logic still reads them.
    setFace(expr) { this.expr = expr; },
    reset() {
      hips.position.y = hipY; hips.rotation.set(0, 0, 0); torso.rotation.set(0, 0, 0); neck.rotation.set(0, 0, 0);
      legs.forEach((l) => l.rotation.set(0, 0, 0)); arms.forEach((a2) => a2.rotation.set(0, 0, 0));
    },
  };
}

export function avatarInfo(key) { const T = REG.get(key); return T && { landmarks: T.lm, height: T.height, info: T.info }; }
