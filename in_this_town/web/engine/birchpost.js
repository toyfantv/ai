// The Postman of the Birch Woods (Flower Man remake 9): in Birchwater nobody says a real name aloud, because a postman made of bark
// lives in the birches; a name he hears, he writes on a postcard and posts, and the town forgets that person.
//   birchMat()            white birch bark (black lenticels, dark patches), a repeating canvas map
//   grove(parent, list)   instanced birches with golden crowns: list [{ x, z, s, yaw, shape }]; .groups as forest.js treeSet
//   hY(x)                 the hill of Birchwater's street: flat for x > -30, rising west
//   birchwater()          the town set: the street over the hill (road, kerbs, lane marks), Kit's cottage (.house) with a lawn and a
//                         driveway, the shops across the road (the SNIPS barbershop with a spinning pole .pole), birches, the woods to
//                         the east, the backyard treehouse (.tree: .deckY, .door, .ladderFoot)
//   nightWoods()          the birch woods at night: a clearing with a lantern post (.lantern, .lanternTop), a path in from +z,
//                         postcards strung between the trunks (.strings), the newest string (.newest: a point where a card hangs)
//   kitchen()             the sunrise kitchen: snRoom with a back door in the +x wall (.door), a table (.table), chairs, counter, fridge
//   postman()             our creature: a tall bark-skinned postman in a navy coat and cap, satchel, twig hands; .set(t, o) poses him
//   postcard(o)           one card: .write(text, k, o) redraws it (k: how much of the text is written, o.strike crosses it out)
//   van(o), trike(), mower(), quill(), thermos(), mugOf(), wafflePlate(), wearEarDefenders(c), wearNameTag(c, text)
import * as THREE from 'three';
import { v3, rng, clamp, lerp } from './core.js';
import { Batch, surf, paint, sign } from './kit.js';
import { canvasTex, glowSprite } from './props.js';
import { cottage, picket, mailbox } from './pastel.js';
import { treeShape, treeSet } from './forest.js';
import { snRoom, highChair } from './shufflenight.js';
import { diningChair } from './home.js';
import { lantern } from './camp.js';
import { ik } from './folklore.js';

const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh && !(o.material && o.material.transparent)) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } }); return g; };
const UP = v3(0, 1, 0);

// ---------------- birch bark ----------------
let BIRCH = null;
export function birchMat() {
  if (BIRCH) return BIRCH;
  const tex = canvasTex(512, 1024, (x, w, h) => {
    const r = rng(19);
    x.fillStyle = '#efebe1'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 380; i++) { x.fillStyle = `rgba(${150 + r() * 40},${140 + r() * 30},${120 + r() * 30},${0.05 + r() * 0.12})`; x.fillRect(r() * w, r() * h, 2 + r() * 8, 20 + r() * 90); }
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,252,245,${0.2 + r() * 0.3})`; x.fillRect(r() * w, r() * h, 6 + r() * 30, 1 + r() * 2); }
    for (let i = 0; i < 300; i++) {   // lenticels: dark horizontal dashes
      const y = r() * h, x0 = r() * w, len = 8 + r() * 58, th = 1.5 + r() * 4.5; x.fillStyle = `rgba(28,24,22,${0.55 + r() * 0.45})`;
      for (const dx of [0, -w, w]) { x.beginPath(); x.ellipse(x0 + dx, y, len / 2, th / 2, 0, 0, 7); x.fill(); }
    }
    for (let i = 0; i < 26; i++) {   // dark patches, ragged
      const cx = r() * w, cy = r() * h, s = 10 + r() * 34; x.fillStyle = 'rgba(30,26,24,0.92)';
      for (let k = 0; k < 7; k++) for (const dx of [0, -w, w]) { x.beginPath(); x.ellipse(cx + dx + (r() - 0.5) * s, cy + (r() - 0.5) * s * 0.5, s * (0.3 + r() * 0.5), s * (0.12 + r() * 0.2), (r() - 0.5) * 0.4, 0, 7); x.fill(); }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  BIRCH = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82 });
  return BIRCH;
}
const SHAPES = [];
function birchShapes() {
  if (SHAPES.length) return SHAPES;
  const gold = [['#9a6410', '#d99a22', '#ffd45a'], ['#a8700f', '#e8b02a', '#ffe27a'], ['#8f5a12', '#cf8a20', '#f7c04a']];
  for (let i = 0; i < 4; i++) SHAPES.push(treeShape({ seed: 40 + i * 7, h: 30 + i * 3, r0: 0.75 + (i % 2) * 0.15, r1: 0.3, flare: 0.3, root: 0.05, spread: 6.5 + i * 0.6, clumps: 8 + i, detail: 1, cols: gold[i % 3], span: 5 }));
  return SHAPES;
}
export function grove(parent, list) { return treeSet(parent, birchShapes(), list, { bark: birchMat() }); }
// scatter birches in a region, skipping where skip(x, z) is true
export function scatter(list, o) {
  const r = rng(o.seed || 7);
  for (let x = o.x0; x <= o.x1; x += o.step) for (let z = o.z0; z <= o.z1; z += o.step) {
    const px = x + (r() - 0.5) * o.step * 0.8, pz = z + (r() - 0.5) * o.step * 0.8;
    if (o.skip && o.skip(px, pz)) continue;
    list.push({ x: px, z: pz, s: (o.s ?? 1) * (0.8 + r() * 0.45), yaw: r() * 6.28, shape: Math.floor(r() * 4) });
  }
  return list;
}
// a single birch trunk as a plain mesh (for the treehouse): cylinder with tiled bark UVs
function trunkMesh(r0, r1, h) {
  const g = new THREE.CylinderGeometry(r1, r0, h, 24, 8); const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(Math.PI * 2 * r0 / 5)), uv.getY(i) * h / 5);
  g.translate(0, h / 2, 0); const m = new THREE.Mesh(g, birchMat()); m.castShadow = true; m.receiveShadow = true; return m;
}

// ---------------- the hill ----------------
export function hY(x) { const d = -30 - x; return d <= 0 ? 0 : d < 20 ? 0.16 * d * d / 40 : 0.16 * (d - 10); }
export const hSlope = (x) => (hY(x - 0.5) - hY(x + 0.5));   // rise per unit going west (positive on the hill)
function slopeStrip(mat, x0, x1, z0, z1, y = 0, seg = 160) {
  const w = x1 - x0, d = z1 - z0, g = new THREE.PlaneGeometry(w, d, seg, 1); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const P = g.attributes.position, uv = g.attributes.uv, sp = mat.userData.span || 8;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); P.setY(i, y + hY(x)); uv.setXY(i, x / sp, z / sp); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m;
}

// ---------------- props ----------------
export function van(o = {}) {
  const g = new THREE.Group(), body = new THREE.Group(), b = new Batch(), col = paint(o.color || '#7fd3c3', { roughness: 0.35, metalness: 0.15 });
  const dark = paint('#24282e', { roughness: 0.5 }), glass = new THREE.MeshStandardMaterial({ color: '#1d2a36', roughness: 0.05, metalness: 0.7 }), chrome = paint('#d9dde2', { metalness: 0.8, roughness: 0.25 });
  // +x is the front. box van: cargo box, cab, bonnet
  b.box(col, 7.4, 4.6, 4.6, -1.2, 3.2, 0, { r: 0.35 }); b.box(col, 2.8, 3.4, 4.5, 3.4, 2.6, 0, { r: 0.4 }); b.box(col, 1.4, 1.6, 4.4, 5.1, 1.8, 0, { r: 0.35 });
  b.box(glass, 1.4, 1.5, 4.0, 4.25, 3.55, 0, { r: 0.2, rz: -0.35 }); for (const s of [-1, 1]) b.box(glass, 1.6, 1.3, 0.1, 3.3, 3.5, s * 2.26, { r: 0.05 });
  b.box(dark, 0.3, 0.9, 4.6, 5.85, 1.3, 0, { r: 0.1 }); b.box(dark, 9.4, 0.5, 4.5, -0.1, 1.05, 0, { r: 0.15 });
  for (const s of [-1, 1]) { b.box(paint('#fff6c8', { emissive: '#fff0b0', emissiveIntensity: 0.4 }), 0.12, 0.5, 0.8, 5.82, 2.2, s * 1.6, { r: 0.08 }); b.box(chrome, 0.2, 0.25, 0.6, 3.6, 3.0, s * 2.45, { r: 0.05 }); }
  b.box(paint('#ff6b5a', { emissive: '#ff3020', emissiveIntensity: 0.3 }), 0.12, 0.7, 0.4, -4.95, 2.4, 1.9, { r: 0.05 }); b.box(paint('#ff6b5a', { emissive: '#ff3020', emissiveIntensity: 0.3 }), 0.12, 0.7, 0.4, -4.95, 2.4, -1.9, { r: 0.05 });
  b.done(body); g.add(body);
  for (const s of [-1, 1]) { const p = sign(o.text || 'CRUMBS BAKERY', { w: 6.2, h: 1.6, bg: '#fff7e6', fg: '#d9536f', edge: '#d9536f' }); p.position.set(-1.2, 3.6, s * 2.33); p.rotation.y = s > 0 ? 0 : Math.PI; body.add(p); }
  g.wheels = [];
  for (const [x, z] of [[-3.4, 2.1], [-3.4, -2.1], [3.6, 2.1], [3.6, -2.1]]) {
    const w = new THREE.Group(), wb = new Batch(); wb.cyl(dark, 0.9, 0.9, 0.6, 0, 0, 0, { rx: Math.PI / 2, seg: 20 }); wb.cyl(chrome, 0.45, 0.45, 0.64, 0, 0, 0, { rx: Math.PI / 2, seg: 12 }); wb.box(dark, 0.2, 0.7, 0.66, 0, 0.1, 0, { r: 0.05 }); wb.done(w);
    w.position.set(x, 0.9, z); g.add(w); g.wheels.push(w);
  }
  g.roll = (d) => g.wheels.forEach((w) => { w.rotation.z = -d / 0.9; });
  return shadowAll(g);
}
export function trike() {
  const g = new THREE.Group(), b = new Batch(), red = paint('#e8433a', { roughness: 0.35, metalness: 0.2 }), dark = paint('#26282c', { roughness: 0.6 }), wh = paint('#f4f4f0', { roughness: 0.5 });
  // +z is the front
  b.cyl(dark, 0.62, 0.62, 0.22, 0, 0.62, 1.2, { rz: Math.PI / 2, seg: 18 }); b.cyl(wh, 0.25, 0.25, 0.26, 0, 0.62, 1.2, { rz: Math.PI / 2 });
  for (const s of [-1, 1]) { b.cyl(dark, 0.38, 0.38, 0.18, s * 0.75, 0.38, -0.7, { rz: Math.PI / 2, seg: 14 }); }
  b.cyl(red, 0.07, 0.07, 1.5, 0, 0.38, -0.7, { rz: Math.PI / 2 });
  b.cyl(red, 0.08, 0.08, 2.1, 0, 0.75, 0.25, { rx: Math.PI / 2 - 0.35 }); b.cyl(red, 0.08, 0.08, 1.5, 0, 1.25, 1.05, { rx: -0.25 });
  b.box(red, 0.8, 0.18, 0.9, 0, 1.0, -0.45, { r: 0.08 }); b.box(red, 0.75, 0.6, 0.15, 0, 1.3, -0.9, { r: 0.07 });
  b.cyl(wh, 0.07, 0.07, 1.3, 0, 1.95, 1.2, { rz: Math.PI / 2 }); for (const s of [-1, 1]) b.cyl(paint('#3fb7ff'), 0.1, 0.1, 0.3, s * 0.68, 1.95, 1.2, { rz: Math.PI / 2 });
  b.done(g); g.seatY = 1.1; g.seat = v3(0, 1.1, -0.45); g.bar = v3(0, 1.95, 1.2);
  return shadowAll(g);
}
export function mower() {
  const g = new THREE.Group(), b = new Batch(), grn = paint('#3fa34d', { roughness: 0.4, metalness: 0.2 }), dark = paint('#2a2c30', { roughness: 0.6 }), chrome = paint('#cfd3d8', { metalness: 0.8, roughness: 0.3 });
  // +z is the front; the handle rises behind (-z)
  b.box(grn, 2.0, 0.7, 2.2, 0, 0.75, 0, { r: 0.2 }); b.cyl(grn, 0.6, 0.7, 0.5, 0, 1.3, 0.1, { seg: 16 }); b.cyl(dark, 0.3, 0.3, 0.3, 0, 1.6, 0.1);
  for (const [x, z] of [[-1.05, 0.8], [1.05, 0.8], [-1.05, -0.8], [1.05, -0.8]]) b.cyl(dark, 0.38, 0.38, 0.25, x, 0.38, z, { rz: Math.PI / 2, seg: 14 });
  for (const s of [-1, 1]) b.cyl(chrome, 0.06, 0.06, 3.2, s * 0.8, 1.9, -1.9, { rx: 0.85 });
  b.cyl(paint('#1d1f22', { roughness: 0.8 }), 0.12, 0.12, 1.9, 0, 3.0, -3.0, { rz: Math.PI / 2 });
  b.box(paint('#9b9b9b'), 1.2, 1.0, 1.0, 0, 1.1, -1.6, { r: 0.2 });   // the grass bag
  b.done(g); g.grip = v3(0, 3.0, -3.0); return shadowAll(g);
}
export function quill() {
  const g = new THREE.Group();
  const vane = new THREE.Shape(); vane.moveTo(0, 0); vane.quadraticCurveTo(0.32, 0.6, 0.12, 2.1); vane.quadraticCurveTo(0.02, 2.3, -0.06, 2.1); vane.quadraticCurveTo(-0.24, 0.9, 0, 0);
  const vm = new THREE.Mesh(new THREE.ShapeGeometry(vane), new THREE.MeshStandardMaterial({ color: '#1b1d24', roughness: 0.5, side: THREE.DoubleSide, metalness: 0.2 })); vm.position.y = 0.35; g.add(vm);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 2.5, 6), paint('#e8e0cc')); shaft.position.y = 1.2; g.add(shaft);
  const nib = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.28, 6), paint('#c9a34a', { metalness: 0.8, roughness: 0.3 })); nib.rotation.x = Math.PI; nib.position.y = -0.1; g.add(nib);
  g.tip = v3(0, -0.24, 0); return g;   // origin near the nib; the feather points +y
}
export function thermos() { const b = new Batch(); b.cyl(paint('#d9536f', { roughness: 0.35, metalness: 0.3 }), 0.42, 0.42, 1.9, 0, 0.95, 0, { seg: 18 }); b.cyl(paint('#f4f0e8', { roughness: 0.4 }), 0.44, 0.44, 0.45, 0, 2.05, 0, { seg: 18 }); return shadowAll(b.done()); }
export function mugOf(col = '#ffd23f') { const b = new Batch(); b.cyl(paint(col, { roughness: 0.35 }), 0.36, 0.32, 0.75, 0, 0.38, 0, { seg: 16 }); b.add(paint(col, { roughness: 0.35 }), new THREE.TorusGeometry(0.2, 0.06, 6, 12), 0.4, 0.4, 0, 0, 0, 0); b.cyl(paint('#5a3220', { roughness: 0.3 }), 0.31, 0.31, 0.04, 0, 0.72, 0, { seg: 16 }); return shadowAll(b.done()); }
export function wafflePlate() {
  const g = new THREE.Group(), b = new Batch(); b.cyl(paint('#ffffff', { roughness: 0.3 }), 1.3, 1.1, 0.12, 0, 0.06, 0, { seg: 28 });
  const wt = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#e0a24a'; x.fillRect(0, 0, w, h); x.fillStyle = '#b8742a'; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) x.fillRect(6 + i * 20, 6 + j * 20, 14, 14); });
  const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.6 });
  for (let k = 0; k < 2; k++) b.box(wm, 1.4, 0.22, 1.4, 0.05 * k, 0.24 + k * 0.22, -0.04 * k, { r: 0.06, ry: k * 0.5 });
  b.box(paint('#fff3b0', { roughness: 0.4 }), 0.38, 0.12, 0.3, 0, 0.62, 0, { r: 0.04 });
  return shadowAll(b.done(g));
}

// ---------------- worn props ----------------
function partBox(group, skip = []) { group.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), bx = new THREE.Box3(), tmp = new THREE.Box3(); const under = (k) => { for (let q = k; q && q !== group; q = q.parent) if (skip.includes(q)) return true; return false; }; group.traverse((k) => { if (k.isMesh && !k.userData.worn && k !== group && !under(k)) { k.geometry.computeBoundingBox(); tmp.copy(k.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld)); bx.union(tmp); } }); return bx; }
const worn = (g) => { g.traverse((o) => { if (o.isMesh) { o.userData.worn = true; o.castShadow = true; } }); return g; };
const torsoBox = (c) => { const r = c.root.rotation.clone(); c.root.rotation.set(0, 0, 0); const b = partBox(c.torso, [c.head, c.neck, ...(c.arms || []), ...(c.legs || [])].filter(Boolean)); c.root.rotation.copy(r); return b; };
const headBox = (c) => { const r = c.root.rotation.clone(); c.root.rotation.set(0, 0, 0); const b = partBox(c.head); c.root.rotation.copy(r); return b; };
export function wearEarDefenders(c, col = '#e8433a') {
  const B = headBox(c), g = new THREE.Group(), b = new Batch(), m = paint(col, { roughness: 0.35 }), dk = paint('#25272b', { roughness: 0.6 });
  const w = B.max.x - B.min.x, hh = B.max.y - B.min.y, cy = B.min.y + hh * 0.5, cz = (B.min.z + B.max.z) / 2;
  for (const s of [-1, 1]) { b.cyl(m, w * 0.24, w * 0.24, w * 0.18, s * (w / 2 + w * 0.07), 0, 0, { rz: Math.PI / 2, seg: 20 }); b.cyl(dk, w * 0.2, w * 0.2, w * 0.06, s * (w / 2 - 0.01), 0, 0, { rz: Math.PI / 2, seg: 20 }); }
  const arc = new THREE.TorusGeometry(w / 2 + w * 0.1, w * 0.045, 8, 28, Math.PI); b.add(dk, arc, 0, 0, 0);
  b.done(g); g.position.set((B.min.x + B.max.x) / 2, cy, cz); g.scale.y = (hh * 0.62) / (w / 2 + w * 0.1); g.children.forEach(() => {}); c.head.add(worn(g));
  return g;
}
export function wearNameTag(c, text, o = {}) {
  const B = torsoBox(c), w = (B.max.x - B.min.x) * 0.36, h = w * 0.68;
  const tex = canvasTex(256, 174, (x, W, H) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); x.fillStyle = o.band || '#e23b3b'; x.fillRect(0, 0, W, 56); x.fillRect(0, H - 14, W, 14);
    x.fillStyle = '#ffffff'; x.font = '900 34px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('HELLO, I\'M', W / 2, 29);
    x.fillStyle = '#1a2a6a'; let fs = 68; x.font = `700 ${fs}px "Comic Sans MS", "Segoe Print", cursive`; while (x.measureText(text).width > W - 20 && fs > 30) { fs -= 4; x.font = `700 ${fs}px "Comic Sans MS", "Segoe Print", cursive`; }
    x.fillText(text, W / 2, 56 + (H - 70) / 2 + 4);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  m.position.set((B.min.x + B.max.x) / 2 + (B.max.x - B.min.x) * (o.side ?? 0.2), B.max.y - (B.max.y - B.min.y) * (o.y ?? 0.3), B.max.z + 0.04); c.torso.add(worn(m)); return m;
}

// ---------------- postcards ----------------
const NAMES = ['Otto', 'Beatrix', 'Rolf', 'Imogen', 'Cass', 'Hollis', 'Dot', 'Ferris', 'Agnes', 'Bram', 'Lettie', 'Ned', 'Ottilie', 'Ruben', 'Wynn', 'Mabel'];
function cardDraw(x, W, H, o = {}) {
  x.fillStyle = o.paper || '#f4ead2'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(120,90,60,0.35)'; x.lineWidth = 3; x.strokeRect(6, 6, W - 12, H - 12);
  // the stamp: a birch leaf
  x.fillStyle = '#d9536f'; x.fillRect(W - 78, 14, 60, 72); x.fillStyle = '#f4ead2'; x.fillRect(W - 72, 20, 48, 60); x.fillStyle = '#d99a22'; x.beginPath(); x.ellipse(W - 48, 50, 12, 22, 0.3, 0, 7); x.fill();
  x.strokeStyle = 'rgba(80,60,40,0.4)'; x.lineWidth = 2; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(30, H - 40 - i * 26); x.lineTo(W * 0.62, H - 40 - i * 26); x.stroke(); }
}
function inkName(x, W, H, text, k = 1, o = {}) {
  if (k <= 0) return;
  const fs = o.size || 74; x.font = `700 ${fs}px "Segoe Script", "Brush Script MT", "Comic Sans MS", cursive`; x.textBaseline = 'middle'; x.textAlign = 'left';
  const tw = x.measureText(text).width, x0 = (W - Math.min(tw, W - 40)) / 2 - 20, y = o.y ?? H * 0.42;
  x.save(); x.beginPath(); x.rect(0, 0, x0 + tw * clamp(k) + 2, H); x.clip(); x.fillStyle = o.ink || '#1b2a5a'; x.fillText(text, x0, y, W - 60); x.restore();
  if (o.strike > 0) { x.strokeStyle = o.ink || '#1b2a5a'; x.lineWidth = 9; x.lineCap = 'round'; for (let i = 0; i < 2; i++) { const e = clamp(o.strike * 2 - i); if (e <= 0) continue; x.beginPath(); x.moveTo(x0 - 10, y + (i ? 10 : -6)); x.lineTo(x0 - 10 + (Math.min(tw, W - 60) + 20) * e, y + (i ? -8 : 8)); x.stroke(); } }
}
export function postcard(o = {}) {
  const W = 512, H = 340, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, side: THREE.DoubleSide, emissive: '#fff3d0', emissiveMap: tex, emissiveIntensity: o.glow ?? 0 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w ?? 1.5, (o.w ?? 1.5) * H / W), mat); m.castShadow = true;
  let key = '';
  m.write = (text, k = 1, oo = {}) => {
    const kk = `${text}|${k.toFixed(3)}|${(oo.strike || 0).toFixed(3)}|${oo.second || ''}|${(oo.k2 ?? 1).toFixed(3)}|${oo.burn || 0}`; if (kk === key) return; key = kk;
    cardDraw(x, W, H, o); inkName(x, W, H, text, k, { strike: oo.strike, y: oo.second ? H * 0.3 : H * 0.42 });
    if (oo.second) inkName(x, W, H, oo.second, oo.k2 ?? 1, { y: H * 0.62, size: 80, ink: '#14204a' });
    if (oo.burn) { const g = x.createRadialGradient(W / 2, H, 10, W / 2, H, W * 0.9 * oo.burn + 1); g.addColorStop(0, 'rgba(10,8,8,1)'); g.addColorStop(0.7, 'rgba(40,20,10,0.9)'); g.addColorStop(1, 'rgba(60,30,10,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    tex.needsUpdate = true;
  };
  m.write(o.text || '', o.text ? 1 : 0); return m;
}
// a sagging string from a to b with n cards hung along it: instanced, one texture per variant
const CARD_VARIANTS = [];
function cardVariants() {
  if (CARD_VARIANTS.length) return CARD_VARIANTS;
  const r = rng(3);
  for (let i = 0; i < 8; i++) {
    const tex = canvasTex(256, 170, (x, W, H) => { cardDraw(x, W, H, { paper: ['#f4ead2', '#efe4cc', '#f6eedc', '#e9dfc4'][i % 4] }); inkName(x, W, H, NAMES[(i * 2 + Math.floor(r() * 2)) % NAMES.length], 1, { size: 40 }); });
    CARD_VARIANTS.push(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, side: THREE.DoubleSide, emissive: '#fff1c8', emissiveMap: tex, emissiveIntensity: 0.22 }));
  }
  return CARD_VARIANTS;
}
export function strings(parent, list, o = {}) {
  // list: [[a, b, n]] world (parent-local) points; returns { curves }
  const r = rng(o.seed || 11), vars = cardVariants(), per = vars.map(() => []), rope = paint('#c9b48a', { roughness: 0.9 }), pin = paint('#7a5a3a', { roughness: 0.7 });
  const geo = new THREE.PlaneGeometry(1.2, 0.8); geo.translate(0, -0.42, 0);
  const curves = [];
  for (const [a, b, n] of list) {
    const mid = a.clone().lerp(b, 0.5); mid.y -= a.distanceTo(b) * 0.07;
    const cv = new THREE.QuadraticBezierCurve3(a, mid, b); curves.push(cv);
    const t = new THREE.Mesh(new THREE.TubeGeometry(cv, 24, 0.035, 5, false), rope); t.castShadow = false; parent.add(t);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5 + (r() - 0.5) * 0.4) / n, p = cv.getPoint(u), tg = cv.getTangent(u);
      per[Math.floor(r() * vars.length)].push({ p, yaw: Math.atan2(tg.x, tg.z) - Math.PI / 2 + (r() - 0.5) * 0.5, roll: (r() - 0.5) * 0.25, ph: r() * 6 });
    }
  }
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = v3(1, 1, 1);
  const meshes = per.map((items, k) => { const im = new THREE.InstancedMesh(geo, vars[k], Math.max(1, items.length)); im.count = items.length; im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; parent.add(im); return { im, items }; });
  const pinM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), pin, per.reduce((a, l) => a + l.length, 0)); pinM.frustumCulled = false; parent.add(pinM);
  const set = (t) => { let pi = 0; for (const { im, items } of meshes) { items.forEach((c, i) => { q.setFromEuler(e.set(Math.sin(t * 1.3 + c.ph) * 0.12, c.yaw + Math.sin(t * 0.9 + c.ph) * 0.08, c.roll)); M.compose(c.p, q, s); im.setMatrixAt(i, M); M.compose(c.p.clone().add(v3(0, -0.05, 0)), q, s); pinM.setMatrixAt(pi++, M); }); im.instanceMatrix.needsUpdate = true; } pinM.instanceMatrix.needsUpdate = true; };
  set(0);
  return { curves, set };
}

// ---------------- the town ----------------
export const HOUSE = v3(4, 0, -44);    // Kit's cottage, front toward +z (its front wall at z = -36)
export const TREE = v3(-4, 0, -88);    // the treehouse birch in the backyard
export function birchwater() {
  const g = new THREE.Group(), b = new Batch(), r = rng(91);
  const grass = surf('grass', '#86c95a'); grass.userData.span = 14;
  g.add(slopeStrip(grass, -700, 700, -700, -15.2, -0.05, 280)); g.add(slopeStrip(grass, -700, 700, 15.2, 700, -0.05, 280));
  g.add(slopeStrip(surf('concrete', '#7f8389'), -700, 700, -10, 10, 0.02, 280));
  for (const s of [-1, 1]) { g.add(slopeStrip(surf('tile', '#e7dfd0'), -700, 700, s > 0 ? 10 : -15.2, s > 0 ? 15.2 : -10, 0.3, 280)); }
  for (const s of [-1, 1]) for (let x = -400; x < 400; x += 4) { const y = hY(x + 2); b.box(paint('#d2c9b8'), 4.02, 0.36, 0.4, x + 2, y + 0.18, s * 10.05, { r: 0.06, rz: Math.atan(hSlope(x + 2)) }); }
  for (let x = -400; x < 400; x += 9) { const y = hY(x + 2); b.box(paint('#fff2c8', { roughness: 0.5 }), 4.2, 0.05, 0.4, x + 2, y + 0.05, 0, { r: 0.02, rz: Math.atan(hSlope(x + 2)) }); }
  // Kit's cottage, lawn, driveway, a picket fence, the mailbox
  const house = cottage({ wall: '#bfe0f7', door: '#d9536f', roof: '#5a6fa0', seed: 12, w: 22, d: 16, flowers: true, number: 9 });
  house.g.position.copy(HOUSE); g.add(house.g); g.house = house;
  g.add(slopeStrip(surf('concrete', '#c9c4ba'), 21, 29, -44, -15.2, 0.06, 4));
  picket(b, -16, 18, -15.6, { h: 2.4, gap: [-1, 2] });
  { const mb = mailbox({ color: '#4a7fc0' }); mb.position.set(31.5, 0.3, -13.4); mb.rotation.y = Math.PI; g.add(mb); }
  for (const [x, z, s, c] of [[-10, -36, 1.2, '#ff8fb1'], [16, -35, 1, '#ffd23f'], [-12, -18, 0.9, '#b07aff']]) { b.add(paint('#4f9a4a', { roughness: 0.85 }), new THREE.IcosahedronGeometry(1.4 * s, 1), x, 1.0 * s, z); for (let i = 0; i < 5; i++) b.add(paint(c, { roughness: 0.6 }), new THREE.IcosahedronGeometry(0.35, 0), x + (r() - 0.5) * 2 * s, 1.6 * s + r() * 0.4, z + (r() - 0.5) * 2 * s); }
  // neighbours west (up the hill) and the shops across the road
  for (const [x, col, n] of [[-46, '#fde7a8', 7], [-82, '#cdeec4', 5], [-118, '#f7c6d4', 3]]) { const c = cottage({ wall: col, seed: 30 + n, w: 20, d: 15, number: n }); c.g.position.set(x, hY(x) , -44); g.add(c.g); }
  const SH = [['SNIPS', 'BARBER', '#e9f1ff', '#2f5aa8', -6], ['CRUMBS', 'BAKERY', '#ffe9ef', '#d9536f', 14], ['NO. 9', 'POST', '#fff4d6', '#c0392b', 32]];
  g.shops = {};
  for (const [nm, kind, wall, acc, x] of SH) {
    const z = 30, w = 16, d = 14, h = 11;
    b.box(surf('stucco', wall), w, h, d, x, h / 2, z, { r: 0.1 }); b.box(paint(acc), w + 0.6, 1.0, d + 0.6, x, h + 0.2, z, { r: 0.1 });
    b.box(new THREE.MeshStandardMaterial({ color: '#2b3a4a', roughness: 0.06, metalness: 0.6, emissive: '#ffd9a0', emissiveIntensity: 0.12 }), w * 0.42, 4.6, 0.2, x - w * 0.18, 3.6, z - d / 2 - 0.05, { r: 0.05 });
    b.box(paint('#5a3a2a', { roughness: 0.6 }), 3.0, 6.6, 0.2, x + w * 0.24, 3.3, z - d / 2 - 0.05, { r: 0.05 });
    for (let i = 0; i < 6; i++) b.box(paint(i % 2 ? '#ffffff' : acc, { roughness: 0.7 }), w * 0.92 / 6, 0.2, 3.2, x - w * 0.46 + (i + 0.5) * w * 0.92 / 6, 7.6, z - d / 2 - 1.5, { r: 0.04, rx: -0.35 });
    const sg = sign(`${nm}  ${kind}`, { w: w * 0.8, h: 2.0, bg: acc, fg: '#ffffff', edge: '#ffffff' }); sg.position.set(x, 9.3, z - d / 2 - 0.16); sg.rotation.y = Math.PI; g.add(sg);
    g.shops[nm] = v3(x, 0, z - d / 2);
  }
  // the barber's pole: a striped cylinder whose map scrolls
  { const pt = canvasTex(64, 256, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); for (let i = -4; i < 8; i++) { x.fillStyle = i % 2 ? '#e8433a' : '#2f5aa8'; x.beginPath(); x.moveTo(0, i * 48); x.lineTo(w, i * 48 - 40); x.lineTo(w, i * 48 - 16); x.lineTo(0, i * 48 + 24); x.fill(); } }); pt.wrapT = THREE.RepeatWrapping;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.2, 20), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.25 })); pole.position.set(-6 - 8 + 1.2, 5.2, 23 - 0.5); g.add(pole); g.pole = pole;
    b.cyl(paint('#d9dde2', { metalness: 0.8, roughness: 0.3 }), 0.5, 0.5, 0.3, -12.8, 6.95, 22.5); b.cyl(paint('#d9dde2', { metalness: 0.8, roughness: 0.3 }), 0.5, 0.5, 0.3, -12.8, 3.45, 22.5); }
  // the birches: along the street, the woods to the east, and behind the houses
  const list = [];
  for (let x = -160; x < 44; x += 13) { if (Math.abs(x - 4) < 16 || Math.abs(x - 25) < 6) continue; list.push({ x: x + r() * 3, z: -19 - r() * 2, s: 0.9 + r() * 0.3, yaw: r() * 6, shape: Math.floor(r() * 4) }); }
  for (let x = -150; x < 60; x += 15) if (x < -18 || x > 44) list.push({ x: x + r() * 3, z: 19.5 + r() * 1.5, s: 0.85 + r() * 0.3, yaw: r() * 6, shape: Math.floor(r() * 4) });
  scatter(list, { x0: 46, x1: 200, z0: -170, z1: -18, step: 8.5, seed: 4, skip: (x, z) => Math.hypot(x - 55, z + 31) < 5 || Math.hypot(x - 44, z + 26) < 4 });
  scatter(list, { x0: 40, x1: 200, z0: 18, z1: 120, step: 10, seed: 6 });
  scatter(list, { x0: -160, x1: 44, z0: -190, z1: -64, step: 11, seed: 8, skip: (x, z) => Math.hypot(x - TREE.x, z - TREE.z) < 22 || (Math.abs(x - HOUSE.x) < 18 && z > -66) });
  scatter(list, { x0: -200, x1: 40, z0: 50, z1: 160, step: 13, seed: 9 });
  list.forEach((t) => { t.y = hY(t.x); });
  g.trees = grove(g, list); for (const gr of g.trees.groups) { gr.items.forEach((t, i) => {}); }
  // lift trees on the hill: rebuild their matrices with a y offset
  { const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = v3(1, 1, 1);
    for (const gr of g.trees.groups) { gr.items.forEach((t, i) => { q.setFromEuler(e.set(0, t.yaw, 0)); s.setScalar(t.s); M.compose(v3(t.x, hY(t.x), t.z), q, s); gr.bark.setMatrixAt(i, M); gr.leaves.setMatrixAt(i, M); }); gr.bark.instanceMatrix.needsUpdate = true; gr.leaves.instanceMatrix.needsUpdate = true; } }
  // the treehouse: one big birch, a deck, a little plank house with a door to +z, a ladder down the front
  { const T = new THREE.Group(); T.position.copy(TREE); g.add(T); g.tree = T;
    const tr = trunkMesh(2.2, 1.3, 46); T.add(tr);
    const tb = new Batch(), plank = surf('plank', '#b07a48'), roofM = surf('shingle', '#c0503a'), trim = paint('#fff4e0', { roughness: 0.5 });
    const DY = 13; tb.box(plank, 14, 0.6, 12, 0, DY, 1, { r: 0.08 }); for (const [x, z] of [[-6, 6], [6, 6], [-6, -4], [6, -4]]) tb.box(surf('plank', '#8a5a34'), 0.5, DY, 0.5, x, DY / 2, z, { r: 0.05 });
    // the house on the deck: walls with a door gap at the front
    const HW = 9, HD = 7, HH = 6, y0 = DY + 0.3;
    tb.box(plank, HW, HH, 0.4, 0, y0 + HH / 2, -HD / 2 + 0.5, { r: 0.05 }); for (const s of [-1, 1]) tb.box(plank, 0.4, HH, HD, s * HW / 2, y0 + HH / 2, 0.5, { r: 0.05 });
    tb.box(plank, (HW - 3) / 2, HH, 0.4, -HW / 4 - 0.75, y0 + HH / 2, HD / 2 + 0.5, { r: 0.05 }); tb.box(plank, (HW - 3) / 2, HH, 0.4, HW / 4 + 0.75, y0 + HH / 2, HD / 2 + 0.5, { r: 0.05 });
    tb.box(plank, 3, HH - 4.8, 0.4, 0, y0 + 4.8 + (HH - 4.8) / 2, HD / 2 + 0.5, { r: 0.05 });
    tb.box(new THREE.MeshStandardMaterial({ color: '#ffd890', emissive: '#ffb860', emissiveIntensity: 0.9, roughness: 0.4 }), 1.8, 1.6, 0.1, -2.9, y0 + 3.4, HD / 2 + 0.72, { r: 0.03 });
    tb.box(trim, 2.2, 2.0, 0.12, -2.9, y0 + 3.4, HD / 2 + 0.68, { r: 0.03 });
    for (const s of [-1, 1]) tb.box(roofM, HW / 2 / Math.cos(0.55) + 0.9, 0.35, HD + 1.6, s * HW / 4, y0 + HH + HW / 4 * Math.tan(0.55) - 0.1, 0.5, { rz: -s * 0.55, r: 0.05 });
    { const tri = new THREE.Shape([new THREE.Vector2(-HW / 2, 0), new THREE.Vector2(HW / 2, 0), new THREE.Vector2(0, HW / 2 * Math.tan(0.55))]); const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.4, bevelEnabled: false }); for (const z of [-HD / 2 + 0.3, HD / 2 + 0.3]) tb.add(plank, tg.clone(), 0, y0 + HH, z); }
    for (let x = -6.6; x <= 6.6; x += 0.9) { if (Math.abs(x) < 1.6) continue; tb.box(trim, 0.16, 1.6, 0.16, x, DY + 1.1, 6.8, { r: 0.03 }); } tb.box(trim, 13.4, 0.2, 0.25, 0, DY + 1.9, 6.8, { r: 0.04 });
    // the ladder from the deck's front gap to the ground
    const LZ = 7.6, lw = surf('plank', '#9a6a3e'); for (const s of [-1, 1]) tb.box(lw, 0.3, DY + 2.2, 0.3, s * 1.0, (DY + 2.2) / 2, LZ, { r: 0.05, rx: -0.12 }); for (let y = 1; y < DY + 1.5; y += 1.3) tb.box(lw, 2.2, 0.22, 0.32, 0, y, LZ + (DY + 2.2) / 2 * Math.tan(0.12) - y * Math.tan(0.12), { r: 0.04 });
    tb.done(T); T.deckY = DY + 0.3; T.doorZ = HD / 2 + 0.5; T.ladderFoot = v3(0, 0, LZ + 1.4); T.bunting = true;
    const wl = new THREE.PointLight('#ffb860', 0, 18, 1.6); wl.position.set(0, y0 + 3.4, 2); T.add(wl); T.light = wl;
    // a string of lights across the deck rail
    for (let i = 0; i < 9; i++) { const s = glowSprite('#ffd27a', 0.9, 0.9); s.position.set(-6.4 + i * 1.6, DY + 2.2 - Math.sin(i / 8 * Math.PI) * 0.4, 6.9); T.add(s); }
    shadowAll(T);
  }
  b.done(g);
  return shadowAll(g);
}

// ---------------- the night woods ----------------
export function nightWoods() {
  const g = new THREE.Group(), b = new Batch(), r = rng(57);
  const ground = surf('grass', '#3d5a34'); ground.userData.span = 12;
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), ground); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; g.add(m); }
  // fallen leaves: instanced flecks on the ground
  { const n = 5000, im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 0.32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 70; q.setFromEuler(new THREE.Euler(0, r() * 6.28, 0)); M.compose(v3(Math.cos(a) * d, 0.03 + r() * 0.03, Math.sin(a) * d - 10), q, v3(1, 1, 1)); im.setMatrixAt(i, M); im.setColorAt(i, c.set(['#c98a1e', '#e0a830', '#a86a18', '#d8b04a'][i % 4])); }
    im.receiveShadow = true; g.add(im); }
  // the path in from +z, a clearing at the origin
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 70), surf('concrete', '#6b5a44')); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.02, 40); m.receiveShadow = true; g.add(m); }
  const list = [];
  scatter(list, { x0: -120, x1: 120, z0: -130, z1: 110, step: 7.5, seed: 13, skip: (x, z) => Math.hypot(x, z) < 15 || (Math.abs(x) < 5 && z > 0) });
  g.trees = grove(g, list); g.treeList = list;
  // strings of postcards between nearby trunks, around and behind the clearing
  const near = list.filter((t) => Math.hypot(t.x, t.z) < 62 && t.z < 14);
  const pairs = [];
  for (const t of near) { let best = null, bd = 1e9; for (const u of near) { if (u === t) continue; const d = Math.hypot(u.x - t.x, u.z - t.z); if (d > 5.5 && d < 12 && d < bd && !pairs.some((p) => (p[0] === u && p[1] === t))) { bd = d; best = u; } } if (best) pairs.push([t, best]); }
  const L = [];
  pairs.forEach(([a, c], i) => { for (let k = 0; k < 2; k++) { const y = 6 + k * 3.6 + r() * 2; L.push([v3(a.x, y, a.z), v3(c.x, y + (r() - 0.5) * 1.2, c.z), Math.round(Math.hypot(a.x - c.x, a.z - c.z) / 1.35)]); } });
  // the newest string: low, across the clearing's back edge, near the lantern
  g.NEW = { a: v3(-6.5, 5.0, -10.5), b: v3(6.5, 5.6, -11.5) }; L.push([g.NEW.a, g.NEW.b, 7]);
  g.strings = strings(g, L, { seed: 21 });
  g.newest = g.strings.curves[g.strings.curves.length - 1].getPoint(0.62);   // where the Marigold card hangs (a gap there)
  // posts at the newest string's ends (so it hangs from something)
  for (const p of [g.NEW.a, g.NEW.b]) b.cyl(surf('plank', '#6a4a30'), 0.25, 0.3, p.y + 0.6, p.x, (p.y + 0.6) / 2, p.z, { seg: 10 });
  // the lantern post in the clearing
  { const LP = v3(3.2, 0, -5.5); b.box(surf('plank', '#5a3e28'), 0.5, 3.9, 0.5, LP.x, 1.95, LP.z, { r: 0.06 }); b.box(surf('plank', '#5a3e28'), 1.6, 0.35, 0.5, LP.x - 0.5, 3.8, LP.z, { r: 0.05 });
    const ln = lantern({ glow: 1.8, intensity: 36 }); ln.scale.setScalar(1.6); ln.position.set(LP.x, 3.95, LP.z); g.add(ln); g.lantern = ln; g.lanternTop = v3(LP.x, 3.95 + 1.0, LP.z); g.lanternP = LP;
    if (ln.light) { ln.light.distance = 40; ln.light.decay = 1.4; } }
  // a writing desk: a stump with an ink pot and a stack of blank cards
  { const D = v3(-4.5, 0, -6); b.cyl(birchMat(), 1.3, 1.5, 3.2, D.x, 1.6, D.z, { seg: 18 }); b.cyl(paint('#e8dcc0', { roughness: 0.9 }), 1.25, 1.25, 0.08, D.x, 3.24, D.z, { seg: 18 }); b.cyl(paint('#1b2235', { roughness: 0.2 }), 0.22, 0.26, 0.4, D.x + 0.5, 3.48, D.z + 0.2, { seg: 12 });
    for (let i = 0; i < 6; i++) b.box(paint('#f4ead2', { roughness: 0.8 }), 1.2, 0.04, 0.8, D.x - 0.35, 3.3 + i * 0.05, D.z - 0.1, { r: 0.01, ry: (i - 3) * 0.06 }); g.desk = D.clone().setY(3.3); }
  b.done(g);
  return shadowAll(g);
}

// ---------------- the kitchen ----------------
export function kitchen() {
  const D = { z: 5, w: 5.4, h: 10 };
  const g = snRoom({ w: 36, d: 28, h: 14, wall: '#fff0d6', curtain: '#7fc8e8', floor: '#d6a56a', winX: -7, winW: 9, winH: 6, door: D, trim: '#ffffff' }), b = new Batch();
  const cab = paint('#9fd6c4', { roughness: 0.55 }), top = paint('#fffaf2', { roughness: 0.3 }), wood = surf('plank', '#c99060');
  b.box(cab, 22, 3.4, 3.2, -6, 1.7, -12.4, { r: 0.12 }); b.box(top, 22.6, 0.3, 3.6, -6, 3.55, -12.3, { r: 0.08 });
  for (let i = 0; i < 6; i++) b.box(paint('#b8e6d6', { roughness: 0.5 }), 3.1, 2.6, 0.12, -15.6 + i * 3.6, 1.8, -10.77, { r: 0.05 });
  b.box(paint('#f3f5f7', { metalness: 0.3, roughness: 0.3 }), 5, 11, 4, 11, 5.5, -11.6, { r: 0.35 }); b.box(paint('#c9d2da', { metalness: 0.6 }), 0.25, 3, 0.3, 12.9, 7.5, -9.5, { r: 0.08 });
  b.box(paint('#40444a', { metalness: 0.5, roughness: 0.4 }), 4.2, 0.2, 3.0, 1.5, 3.8, -12.3, { r: 0.05 });
  for (const x of [0.6, 2.4]) b.cyl(paint('#2a2c30'), 0.6, 0.6, 0.08, x, 3.95, -12.0, { seg: 16 });
  b.cyl(paint('#c0392b', { roughness: 0.3 }), 0.8, 0.7, 0.9, 1.5, 4.4, -12.0, { seg: 16 });
  // the table
  const TB = v3(-2, 0, 2); b.box(wood, 11, 0.4, 6.4, TB.x, 3.6, TB.z, { r: 0.1 }); for (const [x, z] of [[-4.8, -2.6], [4.8, -2.6], [-4.8, 2.6], [4.8, 2.6]]) b.box(paint('#ffffff'), 0.4, 3.4, 0.4, TB.x + x, 1.7, TB.z + z, { r: 0.08 });
  b.box(paint('#ffe3a8', { roughness: 0.8 }), 9.5, 0.05, 2.0, TB.x, 3.82, TB.z, { r: 0.02 });
  g.table = TB; g.topY = 3.8;
  // pictures on the back wall: a family drawing with four figures
  { const p = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.8), new THREE.MeshStandardMaterial({ roughness: 0.7, map: canvasTex(256, 200, (x, W, H) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); x.fillStyle = '#7fc8ff'; x.fillRect(0, 0, W, H * 0.55); x.fillStyle = '#7fd06a'; x.fillRect(0, H * 0.75, W, H); const cols = ['#d9536f', '#ffd23f', '#3d8fe0', '#e8433a']; [60, 110, 160, 200].forEach((cx, i) => { const s = i === 3 ? 0.6 : 1; x.fillStyle = cols[i]; x.fillRect(cx - 10 * s, H * 0.75 - 70 * s, 20 * s, 50 * s); x.beginPath(); x.arc(cx, H * 0.75 - 82 * s, 12 * s, 0, 7); x.fill(); }); }) }));
    p.position.set(9.5 - 21 + 21, 9, -13.68); p.position.x = 3.5; g.add(p); }
  b.done(g);
  const dg = new THREE.Group(); dg.position.set(18.3, 0, D.z - D.w / 2 + 0.1); g.add(dg); { const db = new Batch(); db.box(paint('#7fb8d8', { roughness: 0.5 }), 0.3, D.h - 0.2, D.w - 0.2, 0, (D.h - 0.2) / 2, (D.w - 0.2) / 2, { r: 0.05 }); db.box(new THREE.MeshStandardMaterial({ color: '#ffe8c0', emissive: '#ffd090', emissiveIntensity: 0.6 }), 0.32, 2.6, 2.2, 0, 7, (D.w - 0.2) / 2, { r: 0.04 }); db.done(dg); } g.door = dg; g.doorZ = D.z;
  // what's outside the back door: bright morning
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe4b0').multiplyScalar(1.3), toneMapped: false })); m.position.set(22, 6, D.z); m.rotation.y = -Math.PI / 2; g.add(m); }
  const hc = highChair(); hc.position.set(TB.x + 7.2, 0, TB.z + 0.2); hc.rotation.y = -Math.PI / 2; g.add(hc); g.highChair = hc;
  const chairs = [];
  for (const [x, z, ry] of [[-2, -1.6, 0], [-5, 5.6, Math.PI], [1.5, 5.6, Math.PI], [-9.4, 2, Math.PI / 2]]) { const c = diningChair({ color: '#ffffff' }); c.position.set(TB.x + x + 2, 0, z); c.rotation.y = ry; g.add(c); chairs.push(c); }
  g.chairs = chairs;
  return shadowAll(g);
}

// ---------------- the postman ----------------
// Rest pose: stands at the origin facing +z, about 11.6 tall. o: { walk (phase, radians), stride, lean, headYaw, headPitch, headRoll,
//   handL, handR (world targets, or null = hang), grip { L, R } 0..1, cap (0..1 tipped), mouth (0..1), eyes (0..1 open), glow }
export function postman() {
  const root = new THREE.Group(), bark = birchMat();
  const navy = paint('#1f2f5a', { roughness: 0.6 }), navyD = paint('#16213f', { roughness: 0.7 }), brass = paint('#d4a84a', { metalness: 0.85, roughness: 0.3 }), leather = paint('#7a4a26', { roughness: 0.55 }), black = paint('#0c0b0b', { roughness: 0.9 });
  const P = { hip: 5.7, sh: 8.9, shW: 1.08, neck: 9.3, head: 10.55, L1: 2.95, L2: 2.95, A1: 2.9, A2: 2.9 };
  const body = new THREE.Group(); root.add(body);
  // torso (bark) under a navy coat with a flared hem, brass buttons, collar
  { const bb = new Batch();
    bb.cyl(bark, 0.62, 0.55, 3.8, 0, P.hip + 1.8, 0, { seg: 16 });
    const coat = new THREE.LatheGeometry([[0.0, -0.1], [1.25, 0], [1.05, 0.9], [0.86, 2.0], [0.92, 3.2], [1.02, 3.5], [0.5, 3.75], [0.0, 3.8]].map(([x, y]) => new THREE.Vector2(x, y)), 22); bb.add(navy, coat, 0, P.hip - 0.4, 0);
    for (let i = 0; i < 4; i++) bb.add(brass, new THREE.SphereGeometry(0.1, 10, 8), 0.0, P.hip + 0.6 + i * 0.75, 0.92 - i * 0.02);
    bb.box(navyD, 1.9, 0.5, 1.5, 0, P.sh + 0.05, 0, { r: 0.22 });
    for (const s of [-1, 1]) bb.box(brass, 0.4, 0.12, 0.5, s * 0.95, P.sh + 0.32, 0, { r: 0.04 });
    // the satchel on its strap, postcards peeking out
    bb.box(leather, 0.25, 4.6, 0.12, 0.05, P.hip + 1.7, 0.95, { r: 0.04, rz: -0.55 });
    bb.box(leather, 1.8, 1.5, 0.7, 1.05, P.hip - 0.2, 0.55, { r: 0.18, ry: -0.3 });
    bb.box(paint('#5e3618', { roughness: 0.6 }), 1.82, 0.7, 0.74, 1.05, P.hip + 0.25, 0.58, { r: 0.12, ry: -0.3 });
    for (let i = 0; i < 4; i++) bb.box(paint('#f4ead2', { roughness: 0.8 }), 1.0, 0.7, 0.04, 0.8 + i * 0.16, P.hip + 0.65, 0.42 + i * 0.05, { r: 0.02, ry: -0.3, rz: (i - 1.5) * 0.12 });
    bb.done(body); }
  // neck and head
  const neck = new THREE.Group(); neck.position.y = P.neck; body.add(neck);
  { const nb = new Batch(); nb.cyl(bark, 0.28, 0.36, 1.3, 0, 0.45, 0, { seg: 12 }); nb.done(neck); }
  const head = new THREE.Group(); head.position.y = P.head - P.neck; neck.add(head);
  { const hb = new Batch(); hb.add(bark, new THREE.SphereGeometry(1, 28, 20).scale(0.78, 1.12, 0.74), 0, 0, 0);
    // knotted brow ridges and eye hollows (dark knots), a long crack of a mouth is a separate mesh
    for (const s of [-1, 1]) { hb.add(black, new THREE.SphereGeometry(1, 18, 12).scale(0.2, 0.3, 0.08), s * 0.3, 0.12, 0.69, 0, 0, s * 0.18); hb.add(bark, new THREE.SphereGeometry(1, 12, 8).scale(0.3, 0.08, 0.12), s * 0.3, 0.48, 0.66, 0, 0, -s * 0.25); }
    hb.add(black, new THREE.SphereGeometry(1, 10, 6).scale(0.05, 0.22, 0.05), 0.0, -0.18, 0.74);
    for (let i = 0; i < 7; i++) hb.add(black, new THREE.SphereGeometry(1, 8, 6).scale(0.14 + (i % 3) * 0.05, 0.03, 0.04), (i % 2 ? 0.35 : -0.38) + (i - 3) * 0.02, 0.7 - i * 0.22, 0.6 - Math.abs(i - 3) * 0.04);
    hb.done(head); }
  const glints = []; for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc65a').multiplyScalar(3), toneMapped: false })); m.position.set(s * 0.3, 0.14, 0.78); m.userData.noAO = true; head.add(m); glints.push(m); }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8).scale(0.3, 0.05, 0.06), black); mouth.position.set(0, -0.48, 0.66); head.add(mouth);
  // the cap: crown, band, peak, badge
  const cap = new THREE.Group(); cap.position.set(0, 0.9, 0); head.add(cap);
  { const cb = new Batch(); cb.cyl(navy, 0.86, 0.78, 0.62, 0, 0.3, 0, { seg: 22 }); cb.cyl(navyD, 0.8, 0.8, 0.2, 0, 0.08, 0, { seg: 22 }); cb.box(paint('#0f1424', { roughness: 0.3 }), 1.1, 0.08, 0.7, 0, -0.02, 0.85, { r: 0.04, rx: 0.18 }); cb.box(brass, 0.36, 0.3, 0.06, 0, 0.3, 0.84, { r: 0.05 }); cb.done(cap); }
  // limbs: segments in root space, set each frame
  const seg = (m, a, c) => { m.position.copy(a).add(c).multiplyScalar(0.5); m.scale.y = Math.max(0.02, a.distanceTo(c)); m.quaternion.setFromUnitVectors(UP, c.clone().sub(a).normalize()); };
  const tube = (mat, r0, r1) => { const g = new THREE.CylinderGeometry(r1, r0, 1, 12); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * 0.6); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; root.add(m); return m; };
  const legs = [0, 1].map(() => ({ a: tube(bark, 0.32, 0.26), b: tube(bark, 0.26, 0.18), knee: new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), bark), foot: new THREE.Group() }));
  legs.forEach((l) => { root.add(l.knee); root.add(l.foot); const fb = new Batch(); for (let k = 0; k < 4; k++) fb.add(bark, new THREE.ConeGeometry(0.16, 1.2, 6).rotateX(Math.PI / 2).translate(0, 0.1, 0.5), 0, 0, 0, (k - 1.5) * 0.4); fb.add(bark, new THREE.SphereGeometry(0.3, 10, 8), 0, 0.15, 0); fb.done(l.foot); });
  const arms = [0, 1].map(() => ({ a: tube(navy, 0.3, 0.26), b: tube(bark, 0.2, 0.14), elbow: new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), bark), hand: new THREE.Group(), fingers: [] }));
  arms.forEach((A) => { root.add(A.elbow); root.add(A.hand); A.hand.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8).scale(1, 1.2, 0.7), bark));
    for (let k = 0; k < 5; k++) { const f = new THREE.Group(), th = k === 4; f.position.set(th ? 0.2 : (k - 1.5) * 0.11, -0.15, th ? 0.1 : 0); f.rotation.z = th ? 0.9 : (k - 1.5) * 0.06; const m = new THREE.Mesh(new THREE.ConeGeometry(0.06, th ? 0.6 : 1.0, 6), bark); m.position.y = th ? -0.3 : -0.5; m.rotation.x = Math.PI; f.add(m); A.hand.add(f); A.fingers.push(f); } });
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const st = { arms, legs, cap, head, neck, body, P };
  root.handPos = [v3(), v3()];
  root.set = (t, o = {}) => {
    root.updateMatrixWorld(true);
    const ph = o.walk ?? null, str = o.stride ?? 0.9, lean = o.lean ?? 0.04;
    const bob = ph !== null ? Math.abs(Math.sin(ph)) * 0.18 : 0;
    body.position.y = (o.crouch ?? 0) * -1.6 + bob; body.rotation.x = lean; body.rotation.y = o.twist ?? 0;
    neck.rotation.set(o.headPitch ?? 0, o.headYaw ?? 0, o.headRoll ?? 0); head.rotation.set(0, 0, 0);
    // eyes, mouth
    const eo = o.eyes ?? 1; glints.forEach((gm) => { gm.scale.setScalar(Math.max(0.01, eo)); gm.material.color.set('#ffc65a').multiplyScalar(2.2 + (o.glow ?? 0.8) * 2); });
    mouth.scale.set(1, 1 + (o.mouth ?? 0) * 3.2, 1);
    // the cap tips forward and lifts
    const ck = o.cap ?? 0; cap.position.set(0, 0.9 + ck * 0.5, ck * 0.35); cap.rotation.x = ck * 0.45;
    body.updateMatrixWorld(true);
    // legs: hips in body space -> root space
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1, hip = v3(s * 0.45, P.hip - 0.2, 0).applyMatrix4(body.matrix);
      const sw = ph !== null ? Math.sin(ph + i * Math.PI) : 0, lift = ph !== null ? Math.max(0, Math.cos(ph + i * Math.PI)) * 0.7 : 0;
      const foot = v3(s * 0.55, lift, sw * str + (o.footZ ?? 0)); if (o.kneel && i === 0) { foot.set(s * 0.55, 0.3, -2.2); }
      const r = ik(hip, foot, P.L1, P.L2, v3(0, 0, 1));
      const l = legs[i]; seg(l.a, hip, r.mid); seg(l.b, r.mid, r.end); l.knee.position.copy(r.mid); l.foot.position.copy(r.end).setY(Math.max(0, r.end.y - 0.15)); l.foot.rotation.y = s * 0.15;
    }
    // arms: shoulders in body space; targets world -> root
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1, sh = v3(s * P.shW, P.sh, 0).applyMatrix4(body.matrix), A = arms[i];
      const tw = i ? o.handR : o.handL;
      let tgt;
      if (tw) tgt = root.worldToLocal(tw.clone());
      else { const swing = ph !== null ? Math.sin(ph + (i ? 0 : Math.PI)) * 0.8 : 0; tgt = sh.clone().add(v3(s * 0.35, -(P.A1 + P.A2) * 0.92, 0.35 + swing)); }
      const r = ik(sh, tgt, P.A1, P.A2, o.pole ? o.pole[i] : v3(s * 0.4, -0.3, -1));
      seg(A.a, sh, r.mid); seg(A.b, r.mid, r.end); A.elbow.position.copy(r.mid);
      A.hand.position.copy(r.end); A.hand.quaternion.setFromUnitVectors(v3(0, -1, 0), r.end.clone().sub(r.mid).normalize());
      const gk = o.grip ? (i ? o.grip.R : o.grip.L) ?? 0 : 0.2; A.fingers.forEach((f, k) => { f.rotation.x = (k === 4 ? 0.3 : 0.15) + gk * (k === 4 ? 0.9 : 1.6); });
      root.handPos[i].copy(A.hand.position).applyMatrix4(root.matrixWorld);
    }
  };
  root.st = st; root.set(0);
  root.headWorld = () => { root.updateMatrixWorld(true); return head.getWorldPosition(v3()); };
  return root;
}
