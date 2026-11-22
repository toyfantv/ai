// Episode 121 (LORE-001, "We Lie Down When the Shadow Comes"): a farming village where a wing-shaped shadow crosses at noon.
// The buildings, trees, crops, well, clock tower, farm dog and the giant feather are Polyfork low-poly models
// (web/assets/polyfork/, credits in its LICENCE.md: CC BY 4.0 for re-hosted meshes); the wing shadow, the bird's
// underside, the talons, porch, interiors, smoke and embers are built here in code.
//   await loadPF(PF_IDS); const V = village(scene);  V.occ (the shadow caster), V.porch, V.wheat.setWind(t, ring)...
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Batch, surf, paint, sign } from './kit.js';
import { v3, rng, clamp, smooth, lerp } from './core.js';

export const S = 3.4;   // scene units per metre for the Polyfork models (a 1.75 m person = a 6 unit avatar)
const PF = new Map();
export const PF_IDS = ['gabled-farmhouse-c7534f', 'red-barn-d41683', 'stone-well-b2dfcd', 'wheat-crop-7e08e6', 'wooden-fence-section-d72055',
  'apple-tree-ef0ba0', 'plum-tree-565179', 'hay-bale-079e8c', 'sunflower-80ce15', 'farm-dog-723730', 'scarecrow-334079', 'windpump-tower-1633a9',
  'flower-bed-708e73', 'wooden-crate-e46521', 'water-trough-df3ced', 'garden-rock-7f5d60', 'berry-bush-ee4812', 'thatched-cottage-0e63f5',
  'two-story-house-40f6dc', 'oak-tree-50ee7c', 'lamp-post-c9e409', 'market-stall-94937d', 'barrel-aadc94', 'stone-chapel-03e774',
  'clock-tower-752081', 'fallen-bird-feather-ffbc11', 'one-storey-shop-row-83c958', 'hanging-shop-sign-18d2b0'];
export async function loadPF(ids = PF_IDS) {
  await Promise.all(ids.map(async (id) => {
    const g = await new GLTFLoader().loadAsync(`/web/assets/polyfork/${id}.glb`);
    g.scene.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    PF.set(id, g.scene);
  }));
}
export function pf(id, { x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1, parent } = {}) {
  const m = PF.get(id).clone(true); m.scale.setScalar(S * s); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  if (parent) parent.add(m); return m;
}
export const pfBox = (id) => new THREE.Box3().setFromObject(PF.get(id));   // native metres
// many copies as instanced meshes; .setPose(fn) re-places them per frame (fn(p, i, baseMatrix) -> Matrix4)
export function pfMany(id, list, parent) {
  const src = PF.get(id); src.updateMatrixWorld(true); const g = new THREE.Group(), meshes = [];
  src.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const M = new THREE.Matrix4(), q = new THREE.Quaternion();
  const ims = meshes.map((m) => { const im = new THREE.InstancedMesh(m.geometry, m.material, list.length); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.userData.local = m.matrixWorld.clone(); g.add(im); return im; });
  const base = list.map((p) => new THREE.Matrix4().compose(v3(p.x, p.y || 0, p.z), q.setFromEuler(new THREE.Euler(p.rx || 0, p.ry || 0, p.rz || 0)).clone(), v3(1, 1, 1).multiplyScalar(S * (p.s || 1))));
  g.list = list; g.base = base;
  g.setPose = (fn) => { list.forEach((p, i) => { const B = fn ? fn(p, i, base[i]) : base[i]; ims.forEach((im) => { M.multiplyMatrices(B, im.userData.local); im.setMatrixAt(i, M); }); }); ims.forEach((im) => { im.instanceMatrix.needsUpdate = true; }); };
  g.setPose(); if (parent) parent.add(g); return g;
}

// ---------------- the village ----------------
export const ROAD = { x0: -240, x1: 330, w: 18 };
export const FH = v3(175, 0, 40);           // the farmhouse (front faces -z, toward the road)
export const PORCH = { x: 175, z0: 19, z1: 30.5, w: 30, top: 1.4 };   // porch boards: x +-w/2, z0 (front edge) .. z1 (house wall)
export const ABARA = v3(132, 0, 24);        // Mr. Abara's lawn (his cottage behind it)
export const CLOCK = v3(-206, 0, -30);      // the clock tower
export const GREEN = v3(-112, 0, 34);       // the village green (the wedding)
export const SHOPS = v3(-46, 0, -33);       // the shop row (barber, toys)
export const WELL = v3(20, 0, 16);
export const OCC_H = 110;                    // the shadow caster's height (invisible; casts the wing shadow only)

function ground(parent) {
  const b = new Batch();
  // dry gold fields to the horizon, the green village, the dirt road
  const fld = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), surf('grass', '#c8a94e', { roughness: 0.95 }));
  fld.rotation.x = -Math.PI / 2; fld.position.y = -0.05; fld.receiveShadow = true; parent.add(fld);
  const vg = new THREE.Mesh(new THREE.PlaneGeometry(480, 140), surf('grass', '#7fae49', { roughness: 0.95 }));
  vg.rotation.x = -Math.PI / 2; vg.position.set(-20, 0.0, 0); vg.receiveShadow = true; parent.add(vg);
  const fy = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), surf('grass', '#86b24c', { roughness: 0.95 }));   // farmyard
  fy.rotation.x = -Math.PI / 2; fy.position.set(FH.x - 10, 0.01, 38); fy.receiveShadow = true; parent.add(fy);
  const rd = new THREE.Mesh(new THREE.PlaneGeometry(ROAD.x1 - ROAD.x0, ROAD.w), surf('sand', '#c79a68', { roughness: 0.97 }));
  rd.rotation.x = -Math.PI / 2; rd.position.set((ROAD.x0 + ROAD.x1) / 2, 0.04, 0); rd.receiveShadow = true; parent.add(rd);
  // wheel ruts
  for (const z of [-3.2, 3.2]) b.box(paint('#a97f55', { roughness: 1 }), ROAD.x1 - ROAD.x0, 0.04, 1.3, (ROAD.x0 + ROAD.x1) / 2, 0.07, z, { r: 0.01 });
  b.done(parent);
}

// a porch on the farmhouse front: boards, a step, posts, a rail and a roof
function porch(parent) {
  const g = new THREE.Group(), b = new Batch(), wood = surf('plank', '#c9a27a', { roughness: 0.8 }), dark = paint('#7b5236', { roughness: 0.7 }), P = PORCH;
  const cz = (P.z0 + P.z1) / 2, d = P.z1 - P.z0;
  b.box(wood, P.w, 0.4, d, P.x, P.top - 0.2, cz, { r: 0.04 });
  b.box(dark, P.w, P.top - 0.4, d - 0.6, P.x, (P.top - 0.4) / 2, cz + 0.3, { r: 0.02 });
  b.box(wood, 9, 0.35, 2.2, P.x, P.top / 2 - 0.18, P.z0 - 1.1, { r: 0.04 });   // the step
  for (const sx of [-1, 1]) { b.box(dark, 0.7, 3.6, 0.7, P.x + sx * (P.w / 2 - 0.5), P.top + 1.8, P.z0 + 0.4, { r: 0.08 }); b.box(dark, 0.4, 1.0, d - 1, P.x + sx * (P.w / 2 - 0.3), P.top + 2.6, cz, { r: 0.04 }); }
  b.box(dark, 0.4, 0.35, d - 1, P.x - P.w / 2 + 0.3, P.top + 3.1, cz); b.box(dark, 0.4, 0.35, d - 1, P.x + P.w / 2 - 0.3, P.top + 3.1, cz);
  // an open deck (no roof): Wren has to be able to look straight up
  // the front door (2 m = 6.8 units: the feather's yardstick) and a window either side, on the house wall
  b.box(paint('#5e7f9a', { roughness: 0.6 }), 4.0, 7.0, 0.4, P.x, P.top + 3.5, P.z1 - 0.1, { r: 0.06 });
  b.box(paint('#3f2a1c'), 4.8, 7.6, 0.25, P.x, P.top + 3.7, P.z1 + 0.05, { r: 0.04 });
  b.box(paint('#e8c95a', { metalness: 0.6, roughness: 0.3 }), 0.35, 0.35, 0.3, P.x + 1.4, P.top + 3.4, P.z1 - 0.4);
  b.done(g); parent.add(g);
  return g;
}

// trees, fences, crops, props: everything static, instanced
function scatter(parent, R) {
  const trees = [], rocks = [], bushes = [], fences = [], flowers = [], sun = [], hay = [];
  // trees behind the houses and round the fields
  for (let i = 0; i < 46; i++) { const x = -240 + R() * 520, side = R() < 0.5 ? -1 : 1; const z = side * (62 + R() * 40); trees.push({ x, z, ry: R() * 6.3, s: 0.9 + R() * 0.5, k: R() < 0.33 ? 'oak-tree-50ee7c' : R() < 0.5 ? 'apple-tree-ef0ba0' : 'plum-tree-565179' }); }
  for (let i = 0; i < 14; i++) trees.push({ x: -230 + i * 34 + R() * 8, z: (i % 2 ? -1 : 1) * (46 + R() * 6), ry: R() * 6, s: 1, k: 'apple-tree-ef0ba0' });
  const byK = {}; trees.forEach((t) => { (byK[t.k] = byK[t.k] || []).push(t); }); for (const k of Object.keys(byK)) pfMany(k, byK[k], parent);
  for (let i = 0; i < 70; i++) rocks.push({ x: -240 + R() * 540, z: (R() < 0.5 ? -1 : 1) * (12 + R() * 40), ry: R() * 6, s: 0.6 + R() * 0.8 });
  pfMany('garden-rock-7f5d60', rocks.filter((p) => Math.abs(p.z) > 11), parent);
  for (let i = 0; i < 40; i++) bushes.push({ x: -230 + R() * 500, z: (R() < 0.5 ? -1 : 1) * (40 + R() * 10), ry: R() * 6, s: 1.2 });
  pfMany('berry-bush-ee4812', bushes, parent);
  // a fence along the fields east of the farm, and Mr. Abara's front fence
  for (let z = -56; z <= 110; z += 6.8) fences.push({ x: 205, z, ry: Math.PI / 2 });
  for (let x = ABARA.x - 20; x <= ABARA.x + 14; x += 6.8) fences.push({ x, z: 12.5, ry: 0 });
  pfMany('wooden-fence-section-d72055', fences, parent);
  for (let i = 0; i < 18; i++) flowers.push({ x: -200 + i * 22 + R() * 4, z: (i % 2 ? 1 : -1) * 15.5, ry: 0, s: 1 });
  pfMany('flower-bed-708e73', flowers, parent);
  for (let i = 0; i < 10; i++) sun.push({ x: FH.x - 15 - (i % 2) * 1.4, z: 33 + i * 2.6, ry: -Math.PI / 2, s: 1.05 });
  pfMany('sunflower-80ce15', sun, parent);
  for (let i = 0; i < 9; i++) hay.push({ x: 230 + R() * 80, z: -30 + R() * 120, ry: R() * 6, s: 1.3 });
  pfMany('hay-bale-079e8c', hay, parent);
}

// wheat fields: instanced Polyfork wheat, with wind and a downdraught ring (setWind)
function wheat(parent, R) {
  const list = [];
  const field = (x0, x1, z0, z1, step) => { for (let x = x0; x < x1; x += step) for (let z = z0; z < z1; z += step) list.push({ x: x + (R() - 0.5) * step * 0.8, z: z + (R() - 0.5) * step * 0.8, ry: R() * 6.3, s: 1.05 + R() * 0.35 }); };
  field(208, 330, -60, 110, 3.1);        // east of the farm (the porch looks across it)
  field(120, 204, 56, 110, 3.1);         // behind the farmhouse
  field(-200, 120, -112, -64, 3.6);      // north of the village
  const w = pfMany('wheat-crop-7e08e6', list, parent);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), ax = v3();
  // t: time; ring: { c: Vector3, r0, r1, k } flattens the stalks outward in a ring (the downdraught)
  w.setWind = (t, ring) => {
    w.setPose((p, i, B) => {
      let tilt = 0.06 * Math.sin(t * 1.7 + p.x * 0.11 + p.z * 0.07), dir = 0.6;
      if (ring && ring.k > 0) {
        const dx = p.x - ring.c.x, dz = p.z - ring.c.z, d = Math.hypot(dx, dz);
        const band = smooth(ring.r0 - 30, ring.r0, d) * (1 - smooth(ring.r1, ring.r1 + 40, d));
        if (band > 0) { tilt = lerp(tilt, 1.25, band * ring.k); dir = Math.atan2(dx, dz); }
      }
      if (Math.abs(tilt) < 1e-4) return B;
      ax.set(Math.cos(dir), 0, -Math.sin(dir));   // tip away from the ring centre
      q.setFromAxisAngle(ax, tilt); M.copy(B); const pos = v3().setFromMatrixPosition(B);
      const R0 = new THREE.Matrix4().makeRotationFromQuaternion(q); M.copy(R0).multiply(B.clone().setPosition(0, 0, 0)).setPosition(pos);
      return M;
    });
  };
  return w;
}

// a house row along the road, with the shops, the green, the church and the clock tower
function buildings(parent, R) {
  const H = [];
  const add = (id, x, z, ry, s = 1) => { H.push(pf(id, { x, z, ry, s, parent })); };
  // north side faces +z (ry 0), south side faces -z (ry PI); model fronts face +z
  const north = [[-168, 'two-story-house-40f6dc'], [-134, 'thatched-cottage-0e63f5'], [-100, 'gabled-farmhouse-c7534f'], [8, 'thatched-cottage-0e63f5'], [44, 'two-story-house-40f6dc'], [80, 'gabled-farmhouse-c7534f'], [116, 'thatched-cottage-0e63f5'], [150, 'two-story-house-40f6dc']];
  north.forEach(([x, id]) => add(id, x, -31 - R() * 3, 0));
  const south = [[-168, 'thatched-cottage-0e63f5'], [-62, 'two-story-house-40f6dc'], [-26, 'thatched-cottage-0e63f5'], [44, 'gabled-farmhouse-c7534f'], [80, 'thatched-cottage-0e63f5'], [ABARA.x, 'thatched-cottage-0e63f5']];
  south.forEach(([x, id]) => add(id, x, x === ABARA.x ? 44 : 31 + R() * 3, Math.PI));
  add('gabled-farmhouse-c7534f', FH.x, FH.z, Math.PI, 1.05);   // the narrator's farmhouse
  add('red-barn-d41683', FH.x + 4, 78, Math.PI * 0.5, 1);
  add('windpump-tower-1633a9', FH.x + 24, 58, 0.4, 1);
  add('one-storey-shop-row-83c958', SHOPS.x, SHOPS.z, 0, 1);
  add('stone-chapel-03e774', -226, 0, Math.PI / 2, 1.1);
  add('clock-tower-752081', CLOCK.x, CLOCK.z, Math.PI / 2, 1);
  add('stone-well-b2dfcd', WELL.x, WELL.z, 0.3, 1.25);
  add('market-stall-94937d', -6, -18, 0.1, 1); add('barrel-aadc94', -12, -17, 0, 1); add('wooden-crate-e46521', 0, -16, 0.4, 1.2);
  add('water-trough-df3ced', 60, 12.5, 0, 1.1); add('scarecrow-334079', 250, 30, -1.2, 1.4);
  for (const x of [-150, -80, -10, 60, 128]) add('lamp-post-c9e409', x, -11.5, 0, 1.3);
  // shop signs: BARBER and TOYS hanging off the row
  const sb = sign('BARBER', { w: 9, h: 2.4, bg: '#f4efe6', fg: '#c8102e', frame: '#2a3a5a' }); sb.position.set(SHOPS.x - 11, 13.5, SHOPS.z + 15.6); parent.add(sb);
  const st = sign('TOYS', { w: 8, h: 2.4, bg: '#ffd23f', fg: '#1d4fa0', frame: '#7b5236' }); st.position.set(SHOPS.x + 11, 13.5, SHOPS.z + 15.6); parent.add(st);
  return H;
}

// the church clock face: a canvas dial over the tower's own (setTime(h) moves the hands)
function clockFace(parent) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const draw = (h) => {
    x.clearRect(0, 0, 512, 512); x.fillStyle = '#f6efdc'; x.beginPath(); x.arc(256, 256, 240, 0, 7); x.fill();
    x.lineWidth = 16; x.strokeStyle = '#2b2622'; x.stroke(); x.fillStyle = '#2b2622'; x.font = '700 52px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const R = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    R.forEach((s, i) => { const a = i / 12 * Math.PI * 2; x.save(); x.translate(256 + Math.sin(a) * 190, 256 - Math.cos(a) * 190); x.font = '700 40px Georgia, serif'; x.fillText(s, 0, 0); x.restore(); });
    const hand = (a, len, w) => { x.save(); x.translate(256, 256); x.rotate(a); x.fillStyle = '#1b1714'; x.beginPath(); x.moveTo(-w, 20); x.lineTo(0, -len); x.lineTo(w, 20); x.fill(); x.restore(); };
    hand((h % 12) / 12 * Math.PI * 2, 120, 12); hand((h % 1) * Math.PI * 2, 175, 8);
    x.fillStyle = '#b8892e'; x.beginPath(); x.arc(256, 256, 14, 0, 7); x.fill(); tex.needsUpdate = true;
  };
  draw(12);
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.receiveShadow = true; parent.add(m);
  let last = 12; m.setTime = (h) => { if (Math.abs(h - last) > 1e-3) { draw(h); last = h; } };
  return m;
}

// the wing-shaped shadow caster: never drawn, only in the sun's shadow map
export const CHORD = 300, SPAN = 900;
// the leading edge's z offset (toward -z, the head) at |x| = u * half span, as wingShape draws it
export const leadZ = (u, chord = CHORD) => -chord * 0.25 + chord * 0.18 * u * u - (u < 0.15 ? chord * 0.3 * (1 - u / 0.15) : 0);
export function wingShape(span = SPAN, chord = CHORD) {
  const s = new THREE.Shape(), half = span / 2, pts = [];
  // body nose (-z = head, north), along the leading edge to each tip, fingered primaries, trailing edge, tail fan
  const le = (u) => -chord * 0.25 + chord * 0.18 * u * u;          // leading edge z at |x| = u * half (leadZ adds the head bump)
  const te = (u) => chord * 0.55 - chord * 0.35 * u;               // trailing edge
  pts.push([0, -chord * 0.85]);
  for (let i = 1; i <= 20; i++) { const u = i / 20; pts.push([u * half, le(u) - (u < 0.15 ? chord * 0.3 * (1 - u / 0.15) : 0)]); }
  for (let f = 0; f < 6; f++) {   // the primaries: six fingers at the tip
    const u0 = 1 - f * 0.055, u1 = u0 - 0.03;
    pts.push([u0 * half, te(u0) - chord * 0.05]); pts.push([u0 * half - 8, te(u0) + chord * 0.1]); pts.push([u1 * half, te(u1) - chord * 0.02]);
  }
  for (let i = 12; i >= 1; i--) { const u = 0.62 * i / 12; pts.push([u * half, te(u) + Math.sin(u * 40) * 4]); }
  pts.push([chord * 0.32, chord * 0.75]); pts.push([chord * 0.5, chord * 1.25]); pts.push([chord * 0.2, chord * 1.2]); pts.push([0, chord * 1.3]);
  const all = [...pts, ...pts.slice(1, -1).reverse().map(([a, b]) => [-a, b])];
  s.moveTo(all[0][0], -all[0][1]); for (let i = 1; i < all.length; i++) s.lineTo(all[i][0], -all[i][1]);
  return s;
}
function occluder(parent) {
  const g = new THREE.ShapeGeometry(wingShape(), 4); g.rotateX(-Math.PI / 2);   // shape y -> world -z (head north)
  const m = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = false; mesh.userData.noAO = true; mesh.frustumCulled = false;
  const grp = new THREE.Group(); grp.add(mesh); parent.add(grp);
  // place(groundX, groundZ, sunDir, scale): put the shadow's centre (the body) at a ground point
  grp.place = (gx, gz, sd, k = 1) => { const d = sd.clone().normalize(); grp.position.set(gx + d.x / d.y * OCC_H, OCC_H, gz + d.z / d.y * OCC_H); grp.scale.set(k, 1, k); };
  return grp;
}

export function village(scene) {
  const R = rng(121), root = new THREE.Group(); scene.add(root);
  ground(root);
  const V = { root };
  V.buildings = buildings(root, R);
  V.porch = porch(root);
  scatter(root, R);
  V.wheat = wheat(root, R);
  V.clock = clockFace(root);
  // the clock tower's dial: on the face toward the street (+x after the tower's quarter turn)
  { const b = new THREE.Box3().setFromObject(V.buildings.find((m) => m.position.equals(v3(CLOCK.x, 0, CLOCK.z)))); V.clockBox = b;
    V.clock.position.set(b.max.x + 0.08, b.min.y + (b.max.y - b.min.y) * 0.576, CLOCK.z); V.clock.rotation.y = Math.PI / 2; V.clock.scale.setScalar(Math.min(b.max.z - b.min.z, 12) * 0.36); }
  V.occ = occluder(root);
  V.dog = pf('farm-dog-723730', { x: 70, z: 3, ry: 1.2, s: 1.15, parent: root });
  V.feather = pf('fallen-bird-feather-ffbc11', { x: 150, y: 0, z: 3, ry: Math.PI / 2 + 0.12, parent: root });
  return V;
}

// ---------------- the bird: only its underside, the wing edge and the talons are ever seen ----------------
function featherGeo(len, wid) {   // a flat vane with a rachis ridge, tip at +y
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(wid * 0.62, len * 0.25, wid * 0.5, len * 0.78); sh.quadraticCurveTo(wid * 0.25, len * 1.02, 0, len);
  sh.quadraticCurveTo(-wid * 0.3, len * 0.96, -wid * 0.48, len * 0.74); sh.quadraticCurveTo(-wid * 0.6, len * 0.24, 0, 0);
  const g = new THREE.ShapeGeometry(sh, 6); return g;
}
// span along x, the body at the origin, the underside facing -y
export function birdUnder(o = {}) {
  const g = new THREE.Group(), span = o.span ?? 1400, R = rng(7);
  const vane = featherGeo(1, 1), mBody = new THREE.MeshStandardMaterial({ color: '#7a6a5c', roughness: 0.92, side: THREE.DoubleSide, vertexColors: false });
  const rows = [];   // [count, length, width, innerU, outerU, chordPos, angle spread]
  const coverts = [], prim = [];
  const add = (list, x, z, len, wid, ang, col) => list.push({ x, z, len, wid, ang, col });
  const half = span / 2;
  for (const side of [-1, 1]) {
    // coverts: short rows near the leading edge
    for (let r = 0; r < 4; r++) for (let i = 0; i < 70; i++) { const u = i / 70; if (u > 0.92) continue; const x = side * (40 + u * (half - 60)); add(coverts, x, -60 + r * 34 + u * 30, 70 - r * 6, 22, Math.PI + side * (0.05 + u * 0.1), r); }
    // secondaries along the trailing edge: long barn-plank feathers pointing back (+z)
    for (let i = 0; i < 44; i++) { const u = i / 44; const x = side * (50 + u * half * 0.66); add(prim, x, 40 + u * 20, 150 - u * 20, 34, side * (0.05 + u * 0.12), 4); }
    // primaries: the long fingered feathers at the tip, fanned outward
    for (let i = 0; i < 10; i++) { const u = i / 9; const x = side * (half * 0.68 + u * half * 0.24); add(prim, x, 20 - u * 40, 230 + u * 50, 40, side * (0.35 + u * 0.75), 5); }
  }
  const pal = ['#6f5f52', '#7d6b5b', '#86776a', '#5f5045', '#8a7865', '#4d413a'];
  const mk = (list) => {
    const im = new THREE.InstancedMesh(vane, mBody, list.length); const M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    list.forEach((f, i) => {
      // the vane lies in the xz plane, base at (x, z), pointing back (+z) and outward by ang, seen from below
      q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, -f.ang, 'XYZ'));
      M.compose(v3(f.x, -0.5 - R() * 2, f.z), q, v3(f.wid, f.len, 1)); im.setMatrixAt(i, M);
      c.set(pal[(f.col + Math.floor(R() * 3)) % pal.length]).multiplyScalar(0.9 + R() * 0.25); im.setColorAt(i, c);
    });
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; return im;
  };
  g.add(mk(coverts)); g.add(mk(prim));
  // a solid underside behind the feathers (no gaps to the sky)
  const under = new THREE.Mesh(new THREE.ShapeGeometry(wingShape(span * 0.98, CHORD * span / SPAN * 0.95), 4), new THREE.MeshStandardMaterial({ color: '#57493f', roughness: 0.95, side: THREE.DoubleSide }));
  under.rotation.x = -Math.PI / 2; under.position.y = 1.5; g.add(under);
  // burning rims: the primary tips glow and smoke
  const tips = prim.filter((f) => f.len > 170 || f.col === 4);
  const ember = new THREE.InstancedMesh(vane, new THREE.MeshStandardMaterial({ color: '#2a160c', emissive: '#ff4a00', emissiveIntensity: 1.0, roughness: 0.9, side: THREE.DoubleSide }), tips.length);
  { const M = new THREE.Matrix4(), q = new THREE.Quaternion(); tips.forEach((f, i) => { q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, -f.ang, 'XYZ')); const d = v3(Math.sin(f.ang), 0, Math.cos(f.ang)).multiplyScalar(f.len * 0.8); M.compose(v3(f.x + d.x, -3, f.z + d.z), q, v3(f.wid * 0.9, f.len * 0.25, 1)); ember.setMatrixAt(i, M); }); }
  ember.frustumCulled = false; ember.userData.noAO = true; g.add(ember); g.ember = ember;
  g.tipPoints = tips.map((f) => { const d = v3(Math.sin(f.ang), 0, Math.cos(f.ang)).multiplyScalar(f.len); return v3(f.x + d.x, -3, f.z + d.z); });
  g.burn = (k) => { ember.material.emissiveIntensity = 0.35 + 0.9 * k; };
  return g;
}

function taperTube(curve, r0, r1, seg = 24, rad = 10) {
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position, n = seg + 1;
  for (let i = 0; i < n; i++) { const u = i / seg, pt = curve.getPointAt(u), r = lerp(r0, r1, Math.pow(u, 1.2)); for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; const v = v3(p.getX(k), p.getY(k), p.getZ(k)).sub(pt).multiplyScalar(r).add(pt); p.setXYZ(k, v.x, v.y, v.z); } }
  g.computeVertexNormals(); return g;
}
// one foot: three toes forward (+z), one back, a scaly tarsus going up; .open(k) uncurls the toes into a cupped hand
export function talon() {
  const g = new THREE.Group(), skin = new THREE.MeshStandardMaterial({ color: '#c8ad72', roughness: 0.75 }), claw = new THREE.MeshStandardMaterial({ color: '#2b2420', roughness: 0.35, metalness: 0.1 });
  const tars = new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3([v3(0, 4, -2), v3(0, 60, -6), v3(0, 160, -10), v3(0, 320, -12)]), 7, 11), skin); tars.castShadow = true; g.add(tars);
  const knuckle = new THREE.Mesh(new THREE.SphereGeometry(8.5, 20, 14), skin); knuckle.position.set(0, 4, -1); knuckle.scale.set(1.2, 0.8, 1.1); knuckle.castShadow = true; g.add(knuckle);
  const toes = [];
  [[-0.5, 1], [0, 1.1], [0.5, 1], [Math.PI, 0.75]].forEach(([yaw, L]) => {
    const pivot = new THREE.Group(); pivot.position.set(0, 3, -1); pivot.rotation.y = yaw; g.add(pivot);
    const seg = []; let parent = pivot;
    for (let s = 0; s < 3; s++) {
      const j = new THREE.Group(); j.position.z = s === 0 ? 4 : 9 * L; parent.add(j);
      const m = new THREE.Mesh(taperTube(new THREE.LineCurve3(v3(0, 0, 0), v3(0, 0, 9.5 * L)), 2.5 - s * 0.45, 2.1 - s * 0.45, 4, 10), skin); m.castShadow = true; j.add(m);
      // scale rings
      for (let r = 0; r < 3; r++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4 - s * 0.45, 0.3, 6, 14), skin); ring.position.z = 2 + r * 3 * L; j.add(ring); }
      seg.push(j); parent = j;
    }
    const tip = new THREE.Mesh(taperTube(new THREE.QuadraticBezierCurve3(v3(0, 0, 0), v3(0, 0, 9 * L), v3(0, -7, 13 * L)), 1.8, 0.12, 16, 10), claw); tip.position.z = 9 * L; tip.castShadow = true; parent.add(tip);
    toes.push({ pivot, seg });
  });
  g.open = (k) => { toes.forEach(({ pivot, seg }, i) => { pivot.rotation.x = lerp(0.5, -0.08, k); seg.forEach((j, s) => { j.rotation.x = lerp(0.75 + s * 0.15, 0.12 - (i === 3 ? 0 : 0.05 * s), k); }); }); };
  g.open(0); return g;
}

// soft smoke and ember particles that are pure functions of t
export function smoke(scene, o = {}) {
  const n = o.count ?? 220, R = rng(o.seed || 11), pos = new Float32Array(n * 3), seed = new Float32Array(n);
  const src = o.sources || [v3(0, 0, 0)];
  for (let i = 0; i < n; i++) { const s = src[i % src.length]; pos[i * 3] = s.x + (R() - 0.5) * (o.jitter ?? 2); pos[i * 3 + 1] = s.y; pos[i * 3 + 2] = s.z + (R() - 0.5) * (o.jitter ?? 2); seed[i] = R(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { t: { value: 0 }, amount: { value: 0 }, rise: { value: o.rise ?? 6 }, life: { value: o.life ?? 3 }, size: { value: o.size ?? 4 }, drift: { value: o.drift ?? v3(1, 0, 0) }, color: { value: new THREE.Color(o.color || '#8a8580') }, px: { value: 1 } },
    vertexShader: `attribute float seed; uniform float t, rise, life, size, px; uniform vec3 drift; varying float a; varying float s2;
      void main(){ float age = fract(t / life + seed); vec3 p = position + vec3(0.0, age * rise * life, 0.0) + drift * age * life;
        p.x += sin(t * 0.7 + seed * 50.0) * age * 1.5; p.z += cos(t * 0.6 + seed * 31.0) * age * 1.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; s2 = seed;
        gl_PointSize = min(size * (0.6 + age * 1.6) * 700.0 / max(1.0, -mv.z) * px, 260.0);
        a = smoothstep(0.0, 0.15, age) * (1.0 - smoothstep(0.55, 1.0, age)); }`,
    fragmentShader: `uniform vec3 color; uniform float amount; varying float a; varying float s2;
      void main(){ float d = length(gl_PointCoord - 0.5); float k = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(color * (0.85 + s2 * 0.3), k * a * amount); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.userData.noAO = true; scene.add(p);
  p.set = (t, amount) => { m.uniforms.t.value = t; m.uniforms.amount.value = amount; p.visible = amount > 0.001; };
  return p;
}

// a dust puff (the feather landing, the talons settling): .set(t0, t)
export function dustPuff(scene, o = {}) {
  const n = o.count ?? 160, R = rng(o.seed || 3), pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = R() * 6.283, sp = 6 + R() * 16; pos.set([(R() - 0.5) * (o.len ?? 20), 0.3, (R() - 0.5) * (o.wid ?? 4)], i * 3); vel.set([Math.cos(a) * sp, 2 + R() * 7, Math.sin(a) * sp * 0.7], i * 3); seed[i] = R(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('vel', new THREE.BufferAttribute(vel, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { life: { value: -1 }, color: { value: new THREE.Color(o.color || '#c9a77c') } },
    vertexShader: `attribute vec3 vel; attribute float seed; uniform float life; varying float a;
      void main(){ float k = clamp(life / 3.0, 0.0, 1.0); vec3 p = position + vel * (1.0 - exp(-life * 1.6)) / 1.6; p.y += life * 0.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = min((3.0 + seed * 4.0) * (1.0 + life) * 600.0 / max(1.0, -mv.z), 300.0);
        a = step(0.0, life) * (1.0 - smoothstep(0.3, 1.0, k)) * 0.55; }`,
    fragmentShader: `uniform vec3 color; varying float a; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(color, smoothstep(0.5, 0.0, d) * a); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.userData.noAO = true; scene.add(p);
  p.set = (t0, t) => { m.uniforms.life.value = t - t0; p.visible = t >= t0 && t < t0 + 3.2; };
  return p;
}

// ---------------- props ----------------
export function strawHat(col = '#e3c272') {
  const b = new Batch(), m = paint(col, { roughness: 0.9 }), band = paint('#c8102e', { roughness: 0.7 });
  b.cyl(m, 1.55, 1.6, 0.12, 0, 0, 0, { seg: 28 }); b.cyl(m, 0.78, 0.86, 0.9, 0, 0.45, 0, { seg: 22 }); b.cyl(band, 0.87, 0.88, 0.26, 0, 0.2, 0, { seg: 22 });
  return b.done();
}
export function flatCap(col = '#7c7f86') { const b = new Batch(), m = paint(col, { roughness: 0.9 }); b.cyl(m, 0.8, 0.85, 0.42, 0, 0.21, 0, { seg: 22 }); b.box(m, 1.3, 0.12, 0.7, 0, 0.06, 0.75, { r: 0.05 }); return b.done(); }
export function nightcap() { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.2, 18, 1, true), paint('#3f6fd8', { roughness: 0.9, side: THREE.DoubleSide })); c.position.y = 1.0; c.rotation.z = -0.5; g.add(c); const p = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), paint('#ffffff')); p.position.set(0.95, 1.8, 0); g.add(p); return g; }
export function pitchfork() { const b = new Batch(), w = paint('#a07850', { roughness: 0.7 }), s = paint('#9aa0a6', { metalness: 0.7, roughness: 0.35 }); b.cyl(w, 0.12, 0.12, 6.5, 0, 0, 0, { seg: 8 }); b.box(s, 1.2, 0.14, 0.14, 0, 3.3, 0); for (const x of [-0.5, -0.17, 0.17, 0.5]) b.cyl(s, 0.05, 0.03, 1.6, x, 4.1, 0, { seg: 6 }); return b.done(); }
export function scissors() { const b = new Batch(), s = paint('#cfd4da', { metalness: 0.8, roughness: 0.25 }), h = paint('#d23a3a'); b.box(s, 0.14, 1.4, 0.05, -0.08, 0.7, 0, { rz: 0.12 }); b.box(s, 0.14, 1.4, 0.05, 0.08, 0.7, 0.03, { rz: -0.12 }); b.add(h, new THREE.TorusGeometry(0.22, 0.06, 6, 12), -0.25, -0.15, 0); b.add(h, new THREE.TorusGeometry(0.22, 0.06, 6, 12), 0.25, -0.15, 0); return b.done(); }
export function veil() { const g = new THREE.PlaneGeometry(5, 8, 10, 14); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 1.3 + y * 0.7) * 0.08); p.setX(i, x * (0.55 + 0.45 * (y + 4) / 8)); } g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, transparent: true, opacity: 0.88, side: THREE.DoubleSide })); m.receiveShadow = true; return m; }
export function weddingArch() { const b = new Batch(), w = paint('#f4efe6', { roughness: 0.6 }), fl = [paint('#ff8fb1'), paint('#ffffff'), paint('#ffd36a')]; b.cyl(w, 0.22, 0.22, 9, -4.5, 4.5, 0); b.cyl(w, 0.22, 0.22, 9, 4.5, 4.5, 0); b.add(w, new THREE.TorusGeometry(4.5, 0.22, 8, 24, Math.PI), 0, 9, 0); const R = rng(4); for (let i = 0; i < 40; i++) { const a = R() * Math.PI, side = R() < 0.4; const x = side ? (R() < 0.5 ? -4.5 : 4.5) : Math.cos(a) * 4.5, y = side ? R() * 9 : 9 + Math.sin(a) * 4.5; b.add(fl[i % 3], new THREE.SphereGeometry(0.42, 8, 6), x, y, (R() - 0.5) * 0.4); } return b.done(); }
export function chair(col = '#f4efe6') { const b = new Batch(), m = paint(col, { roughness: 0.6 }); b.box(m, 2.2, 0.25, 2.2, 0, 2.2, 0); for (const x of [-0.95, 0.95]) for (const z of [-0.95, 0.95]) b.box(m, 0.22, 2.2, 0.22, x, 1.1, z); b.box(m, 2.2, 2.4, 0.22, 0, 3.4, -1.0); return b.done(); }
export function bucket(fill = 0.25) { const g = new THREE.Group(), b = new Batch(), w = paint('#8a6a48', { roughness: 0.8 }), hoop = paint('#5b5f66', { metalness: 0.6, roughness: 0.4 }); b.add(w, new THREE.CylinderGeometry(1.25, 1.0, 2.0, 18, 1, true), 0, 1, 0); b.cyl(w, 1.0, 1.0, 0.15, 0, 0.08, 0, { seg: 18 }); b.add(hoop, new THREE.TorusGeometry(1.2, 0.07, 6, 20), 0, 1.6, 0, 0, Math.PI / 2); b.add(hoop, new THREE.TorusGeometry(1.06, 0.07, 6, 20), 0, 0.4, 0, 0, Math.PI / 2); b.add(hoop, new THREE.TorusGeometry(1.25, 0.06, 6, 20, Math.PI), 0, 2.0, 0); b.done(g); const wat = new THREE.Mesh(new THREE.CircleGeometry(1.03 + 0.2 * fill, 24), new THREE.MeshStandardMaterial({ color: '#4a8fb0', roughness: 0.08, metalness: 0.2 })); wat.rotation.x = -Math.PI / 2; wat.position.y = 0.18 + fill * 1.8; g.add(wat); return g; }
export function thermos() { const b = new Batch(); b.cyl(paint('#2f7a4a', { roughness: 0.4 }), 0.42, 0.42, 1.8, 0, 0.9, 0); b.cyl(paint('#c9ced4', { metalness: 0.7, roughness: 0.3 }), 0.44, 0.44, 0.4, 0, 1.95, 0); return b.done(); }
export function plates() { const b = new Batch(); for (let i = 0; i < 5; i++) b.cyl(paint('#f6f3ec', { roughness: 0.3 }), 0.95, 0.75, 0.14, (i % 2) * 0.05, 0.08 + i * 0.16, 0, { seg: 22 }); return b.done(); }
export function pillow() { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), paint('#f4f1ea', { roughness: 0.95 })); m.scale.set(2.0, 0.55, 1.3); m.castShadow = m.receiveShadow = true; return m; }
export function lawnSign(text) { const g = new THREE.Group(); const s = sign(text, { w: 5.5, h: 2.2, bg: '#fffaf0', fg: '#2b2622', frame: '#7b5236' }); s.position.y = 3.6; g.add(s); const b = new Batch(); b.box(paint('#7b5236'), 0.3, 3.4, 0.3, 0, 1.4, -0.15); b.done(g); return g; }
