// The Door in Her Wall (Flower Man remake 14): when you turn eleven a door grows in your bedroom wall, and behind it is a world built
// from whatever you love most. Walk into someone else's uninvited and it keeps you, as scenery (you turn to wood).
//   kidRoom(o)          a bedroom (snRoom) with wallpaper, a bed on the left wall, a desk, a wall clock (.clock.set(h)), a doorway in the
//                       +x wall, the window in the back wall. o: wall, ink, flower, floor, curtain, quilt, doorX, winX, night window (.npane)
//   magicDoor(o)        a door that grows out of a wall (.grow(k)), opens (.open(k)), glows inside (.glow(k)); .lock (a brass padlock),
//                       .key2 (a second key with a name tag, hidden until shown). The group's origin is the floor at the wall face, facing +z.
//   paperFox(o)         a giant origami fox, crooked ears and all: .pose(t, { run, dive, sleep, freeze })
//   paperCrane() smallFox()   desk-size paper animals
//   paperStars(n, o)    instanced floating paper stars: .update(t), .tint(red, gold)
//   milkRiver(len, w)   a strawberry-milk river (.update(t) scrolls it) with floating strawberries
//   gameBridge(len)     a bridge of board-game boxes over the river (.deckY)
//   blanketFort(o)      a giant patchwork blanket fort over two chairs, with a flag (F + M)
//   woodify(c, U)       turns a character's materials to wood below U.uWoodY.value (world height); U = woodUniforms()
//   wearBeanie(c, col)  a knit beanie with a pom-pom, sitting above the eyes
//   shoebox() cupcake() flowerMeadow() wallClock() sawdust(scene)
import * as THREE from 'three';
import { v3, rng, clamp } from './core.js';
import { Batch, surf, paint } from './kit.js';
import { canvasTex } from './props.js';
import { snRoom } from './shufflenight.js';
import { wallpaper } from './pastel.js';
import { flowerMesh } from './sorrygarden.js';

const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh && !(o.material && o.material.transparent)) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } }); return g; };
const worn = (g) => { g.traverse((o) => { if (o.isMesh) { o.userData.worn = true; o.castShadow = true; } }); return g; };
function partBox(group) { group.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), bx = new THREE.Box3(), tmp = new THREE.Box3(); group.traverse((k) => { if (k.isMesh && !k.userData.worn && !k.userData.face) { k.geometry.computeBoundingBox(); tmp.copy(k.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld)); bx.union(tmp); } }); return bx; }
const label = (text, bg, fg, w = 256, h = 128, font = 54) => canvasTex(w, h, (x, W, H) => { x.fillStyle = bg; x.fillRect(0, 0, W, H); x.fillStyle = fg; x.font = `900 ${font}px ITTInter, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + 2); });
export const paperMat = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.92, metalness: 0, flatShading: true, side: THREE.DoubleSide, ...o });

// ---------------- a kid's bedroom ----------------
export function kidRoom(o = {}) {
  const w = 34, d = 26, h = 15;
  const wallMat = wallpaper(o.wall || '#cfe6ff', o.ink || '#b4d4f7', { flower: o.flower || '#ffffff' });
  const g = snRoom({ w, d, h, wallMat, floor: o.floor || '#c99a66', curtain: o.curtain || '#ffcf4a', winX: o.winX ?? 9, door: { z: 7, w: 5.2, h: 10 } });
  const b = new Batch();
  // the bed along the left wall, head at the back
  const BX = -w / 2 + 4.6, BZ = -3.5, BW = 8, BL = 12.5, wood = surf('plank', o.bedWood || '#d79b5c');
  b.box(wood, BW + 0.4, 1.3, BL + 0.4, BX, 0.85, BZ, { r: 0.12 }); b.box(paint('#f6f4ee', { roughness: 0.85 }), BW, 1.0, BL, BX, 2.0, BZ, { r: 0.35 });
  b.box(wood, BW + 1.0, 5.6, 0.6, BX, 2.8, BZ - BL / 2 - 0.35, { r: 0.14 }); b.box(wood, BW + 1.0, 3.0, 0.6, BX, 1.5, BZ + BL / 2 + 0.35, { r: 0.12 });
  b.box(paint('#ffffff', { roughness: 0.9 }), BW - 1.6, 1.0, 2.4, BX, 2.95, BZ - BL / 2 + 1.7, { r: 0.45 });
  b.box(paint(o.quilt || '#ff8a5c', { roughness: 0.9 }), BW + 0.3, 0.55, BL * 0.62, BX, 2.75, BZ + BL * 0.18, { r: 0.24 });
  g.bed = { x: BX, z: BZ, top: 2.5, w: BW, l: BL };
  // a desk and chair on the right, under nothing, against the right wall's back corner
  const DX = w / 2 - 3.2, DZ = -6.5, top = paint('#ffffff', { roughness: 0.5 });
  b.box(top, 5.2, 0.35, 8.5, DX, 3.2, DZ, { r: 0.08 }); for (const z of [-3.9, 3.9]) b.box(top, 4.6, 3.1, 0.35, DX, 1.55, DZ + z, { r: 0.05 });
  b.cyl(paint(o.lampCol || '#3d8fe0'), 0.5, 0.7, 0.4, DX + 1.2, 3.55, DZ - 3.0, { seg: 14 }); b.cyl(paint(o.lampCol || '#3d8fe0'), 0.12, 0.12, 2.6, DX + 1.2, 4.9, DZ - 3.0, { seg: 8 });
  b.cyl(paint('#fff1d0', { emissive: '#ffd890', emissiveIntensity: 0.6 }), 0.5, 1.0, 1.0, DX + 0.9, 6.3, DZ - 3.0, { seg: 16 });
  g.desk = { x: DX, z: DZ, top: 3.38 };
  const ch = new Batch(), cc = paint(o.chair || '#ff8a5c', { roughness: 0.7 }); ch.box(cc, 3.0, 0.4, 3.0, 0, 2.1, 0, { r: 0.12 }); ch.box(cc, 3.0, 3.2, 0.4, 0, 3.6, 1.35, { r: 0.12 }); for (const x of [-1.2, 1.2]) for (const z of [-1.2, 1.2]) ch.box(paint('#5a5f6a'), 0.25, 2.0, 0.25, x, 1.0, z, { r: 0.05 });
  const cg = ch.done(); cg.position.set(DX - 4.4, 0, DZ); cg.rotation.y = -Math.PI / 2; g.add(cg); g.chair = cg; g.chair.seatY = 2.3;
  // a rug
  { const rug = new THREE.Mesh(new THREE.CircleGeometry(6.5, 40), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (x, W, H) => { for (let i = 8; i > 0; i--) { x.fillStyle = i % 2 ? (o.rugA || '#ffd36a') : (o.rugB || '#ffffff'); x.beginPath(); x.arc(W / 2, H / 2, (i / 8) * W / 2, 0, 7); x.fill(); } }), roughness: 0.95 })); rug.rotation.x = -Math.PI / 2; rug.position.set(2, 0.04, 2.5); rug.receiveShadow = true; g.add(rug); }
  // posters
  b.done(g);
  const clock = wallClock(); clock.position.set(o.clockX ?? -7.6, 10.8, -d / 2 + 0.35); g.add(clock); g.clock = clock;
  if (o.posters) for (const [txt, bg, x, y] of o.posters) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.6), new THREE.MeshStandardMaterial({ map: canvasTex(180, 230, (x2, W, H) => { x2.fillStyle = bg; x2.fillRect(0, 0, W, H); x2.fillStyle = '#ffffff'; x2.font = '900 34px ITTInter, sans-serif'; x2.textAlign = 'center'; txt.split('|').forEach((s, i) => x2.fillText(s, W / 2, 70 + i * 44)); x2.fillStyle = 'rgba(255,255,255,0.4)'; x2.beginPath(); x2.moveTo(W * 0.2, H * 0.92); x2.lineTo(W * 0.5, H * 0.66); x2.lineTo(W * 0.8, H * 0.92); x2.fill(); }), roughness: 0.7 })); p.position.set(x, y, -d / 2 + 0.33); g.add(p); }
  g.size = { w, d, h }; g.backZ = -d / 2; g.doorway = { x: w / 2, z: 7 };
  return shadowAll(g);
}

export function wallClock() {
  const g = new THREE.Group(), b = new Batch();
  b.cyl(paint('#ff6b6b', { roughness: 0.5 }), 1.5, 1.5, 0.3, 0, 0, 0, { seg: 32, rx: Math.PI / 2 }); b.done(g);
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.25, 32), new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(128, 128, (x, W) => { x.fillStyle = '#fffaf0'; x.fillRect(0, 0, W, W); x.fillStyle = '#333'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.fillRect(W / 2 + Math.sin(a) * 50 - 3, W / 2 - Math.cos(a) * 50 - 3, 6, 6); } }) }));
  face.position.z = 0.17; g.add(face);
  const hand = (len, wd, col) => { const p = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.05), paint(col)); m.position.y = len / 2 - 0.1; p.add(m); p.position.z = 0.22; g.add(p); return p; };
  const hh = hand(0.75, 0.14, '#222'), mh = hand(1.05, 0.08, '#222');
  g.set = (hours) => { hh.rotation.z = -(hours % 12) / 12 * Math.PI * 2; mh.rotation.z = -(hours % 1) * Math.PI * 2; };
  g.set(8); return g;
}

// ---------------- the door ----------------
// origin: floor, at the wall face; it stands out of the wall toward +z
export function magicDoor(o = {}) {
  const g = new THREE.Group(), W = o.w ?? 4.6, H = o.h ?? 8.6, col = o.color || '#7fe0c2';
  const grow = new THREE.Group(); g.add(grow);
  const frameM = paint(o.frame || '#fff6e0', { roughness: 0.5, emissive: '#ffe8a0', emissiveIntensity: 0 });
  const fb = new Batch(); fb.box(frameM, 0.6, H + 0.6, 0.7, -W / 2 - 0.3, (H + 0.6) / 2, 0.3, { r: 0.12 }); fb.box(frameM, 0.6, H + 0.6, 0.7, W / 2 + 0.3, (H + 0.6) / 2, 0.3, { r: 0.12 }); fb.box(frameM, W + 1.8, 0.7, 0.8, 0, H + 0.45, 0.3, { r: 0.15 });
  fb.box(frameM, W + 2.2, 0.35, 0.95, 0, H + 0.95, 0.35, { r: 0.12 }); fb.done(grow);
  // the glow inside (a world beyond)
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(256, 480, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, o.in0 || '#ffe6ff'); gr.addColorStop(0.55, o.in1 || '#ff9ad6'); gr.addColorStop(1, o.in2 || '#8a5cff'); x.fillStyle = gr; x.fillRect(0, 0, w, h); const r = rng(3); x.fillStyle = '#fff8d0'; for (let i = 0; i < 26; i++) { const cx = r() * w, cy = r() * h * 0.7, s = 4 + r() * 8; x.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? s * 0.45 : s; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); } }) }));
  inner.position.set(0, H / 2, 0.06); inner.material.color.setScalar(0); inner.userData.noAO = true; grow.add(inner); g.inner = inner;
  // the panel on a hinge at the left edge
  const hinge = new THREE.Group(); hinge.position.set(-W / 2, 0, 0.32); grow.add(hinge); g.hinge = hinge;
  const pm = paint(col, { roughness: 0.45, emissive: '#ffffff', emissiveIntensity: 0 }), trim = paint(o.trim || '#ffffff', { roughness: 0.45 }), brass = paint('#d9a53a', { metalness: 0.85, roughness: 0.28 });
  const pb = new Batch(); pb.box(pm, W, H, 0.38, W / 2, H / 2, 0, { r: 0.08 });
  for (const [y, hh] of [[H * 0.72, H * 0.32], [H * 0.27, H * 0.34]]) pb.box(trim, W * 0.68, hh, 0.12, W / 2, y, 0.2, { r: 0.06 });
  pb.box(pm, W * 0.6, H * 0.3 - 0.4, 0.14, W / 2, H * 0.72, 0.24, { r: 0.05 }); pb.box(pm, W * 0.6, H * 0.32 - 0.4, 0.14, W / 2, H * 0.27, 0.24, { r: 0.05 });
  pb.add(brass, new THREE.SphereGeometry(0.3, 16, 12), W - 0.6, H * 0.47, 0.42); pb.done(hinge);
  // the padlock on a hasp
  const lock = new THREE.Group(), lb = new Batch(); lb.box(brass, 0.75, 0.62, 0.3, 0, 0, 0, { r: 0.1 }); lb.add(brass, new THREE.TorusGeometry(0.24, 0.07, 8, 16, Math.PI), 0, 0.3, 0); lb.box(paint('#3a2a10'), 0.1, 0.22, 0.05, 0, -0.06, 0.16, { r: 0.02 }); lb.done(lock);
  lock.position.set(W - 0.6, H * 0.47 - 0.85, 0.5); hinge.add(lock); g.lock = lock;
  // the second key, with a name tag, on a hook (hidden until the end)
  const key2 = new THREE.Group(), kb = new Batch(), gold = paint('#ffd86a', { metalness: 0.9, roughness: 0.22, emissive: '#ffcf5a', emissiveIntensity: 0.15 });
  kb.add(gold, new THREE.TorusGeometry(0.26, 0.08, 8, 20), 0, 0, 0); kb.box(gold, 0.12, 1.0, 0.1, 0, -0.75, 0, { r: 0.03 }); kb.box(gold, 0.3, 0.12, 0.1, 0.14, -1.05, 0, { r: 0.02 }); kb.box(gold, 0.22, 0.12, 0.1, 0.1, -0.85, 0, { r: 0.02 }); kb.done(key2);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide, map: label(o.keyName || 'FELIX', '#fff7e6', '#e2456a', 256, 128, 64) }));
  tag.position.set(-0.55, -0.55, 0.08); tag.rotation.z = 0.12; key2.add(tag);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 5), paint('#e2456a')); str.position.set(-0.25, -0.12, 0.05); str.rotation.z = 1.0; key2.add(str);
  key2.position.set(W - 1.1, H * 0.76, 0.48); hinge.add(key2); key2.visible = false; g.key2 = key2;
  g.size = { w: W, h: H };
  g.grow = (k) => { const e = clamp(k); grow.scale.set(Math.max(0.001, 0.25 + 0.75 * e), Math.max(0.001, e), Math.max(0.001, e)); grow.visible = e > 0.002; const gl = e > 0 && e < 1 ? 1.2 : 0; frameM.emissiveIntensity = gl * (1 - e) * 2 + (e < 1 ? 0.3 : 0); pm.emissiveIntensity = (e < 1 ? (1 - e) * 0.8 : 0); };
  g.open = (k) => { hinge.rotation.y = -clamp(k) * 1.75; };
  g.glow = (k) => { inner.material.color.setScalar(clamp(k) * 1.15); };
  g.grow(1); g.open(0); g.glow(0);
  return shadowAll(g);
}

// ---------------- paper animals ----------------
// one flat-shaded fold: triangles from a list of points
function folds(tris, cols) {
  const pos = [], col = [];
  tris.forEach((t, i) => { const c = new THREE.Color(cols[i % cols.length]); t.forEach((p) => { pos.push(p[0], p[1], p[2]); col.push(c.r, c.g, c.b); }); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
const foldMat = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0, ...o });
// a giant origami fox, about 10 long (z forward), 7 tall; crooked like a six-year-old's first fold
export function paperFox(o = {}) {
  const g = new THREE.Group(), A = o.col || '#ff9a4a', B = o.col2 || '#ffb878', Cw = '#fff3e0', D = o.col3 || '#e9772f';
  const m = foldMat(); g.mat = m;
  const body = new THREE.Group(); body.position.y = 3.2; g.add(body); g.body = body;
  // the body: a folded tent, ridge on top
  const L = 3.6, Wd = 1.7, Hh = 2.0;
  body.add(new THREE.Mesh(folds([
    [[-Wd, 0, -L], [0, Hh, -L * 0.9], [0, Hh * 1.1, L]], [[-Wd, 0, -L], [0, Hh * 1.1, L], [-Wd * 0.9, 0, L]],
    [[Wd, 0, -L], [0, Hh * 1.1, L], [0, Hh, -L * 0.9]], [[Wd, 0, -L], [Wd * 0.9, 0, L], [0, Hh * 1.1, L]],
    [[-Wd, 0, -L], [-Wd * 0.9, 0, L], [Wd * 0.9, 0, L]], [[-Wd, 0, -L], [Wd * 0.9, 0, L], [Wd, 0, -L]],
    [[-Wd, 0, -L], [Wd, 0, -L], [0, Hh, -L * 0.9]], [[-Wd * 0.9, 0, L], [0, Hh * 1.1, L], [Wd * 0.9, 0, L]],
  ], [A, A, B, B, Cw, Cw, D, D]), m));
  // the head: a pyramid with a long snout, at the front, crooked ears
  const head = new THREE.Group(); head.position.set(0, Hh * 1.05, L + 0.2); body.add(head); g.head = head;
  const sn = [0.15, -0.3, 3.1];
  head.add(new THREE.Mesh(folds([
    [[-1.4, 0.2, 0], [0, 1.4, 0.2], sn], [[0, 1.4, 0.2], [1.4, 0.2, 0], sn], [[1.4, 0.2, 0], [0, -1.0, 0.3], sn], [[0, -1.0, 0.3], [-1.4, 0.2, 0], sn],
    [[-1.4, 0.2, 0], [0, -1.0, 0.3], [0, 1.4, 0.2]], [[1.4, 0.2, 0], [0, 1.4, 0.2], [0, -1.0, 0.3]],
  ], [A, B, Cw, Cw, D, D]), m));
  { const nose = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), paint('#2a1a12', { roughness: 0.5 })); nose.position.set(sn[0], sn[1] + 0.05, sn[2]); head.add(nose); }
  // ears: one straight, one bent over (his first fold)
  const ear = (side, bent) => { const e = new THREE.Mesh(folds([[[-0.55, 0, 0], [0.55, 0, 0], [0.05, 1.7, -0.1]], [[-0.3, 0.05, 0.05], [0.3, 0.05, 0.05], [0.04, 1.1, 0.0]]], [A, Cw]), m); e.position.set(side * 0.75, 1.05, 0.35); e.rotation.z = -side * 0.25; if (bent) { e.rotation.x = 0.9; e.rotation.z = -side * 0.6; } head.add(e); return e; };
  g.ears = [ear(-1, false), ear(1, o.bent !== false)];
  // crayon eyes: two black scribbled ovals, slightly different sizes
  for (const [s, k] of [[-1, 1], [1, 0.8]]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.2 * k, 10, 8), paint('#141414', { roughness: 0.4 })); e.scale.set(1, 1.5, 0.6); e.position.set(s * 0.62, 0.55, 1.15); head.add(e); const hl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffffff' })); hl.position.set(s * 0.6 + 0.05, 0.65, 1.28); head.add(hl); }
  // the tail: a big folded fan behind, white tip
  const tail = new THREE.Group(); tail.position.set(0, Hh * 0.8, -L); body.add(tail); g.tail = tail;
  tail.add(new THREE.Mesh(folds([[[-0.9, 0, 0], [0, 0.6, 0], [-0.4, 1.8, -3.0]], [[0.9, 0, 0], [-0.4, 1.8, -3.0], [0, 0.6, 0]], [[-0.9, 0, 0], [-0.4, 1.8, -3.0], [0.9, 0, 0]], [[-0.4, 1.8, -3.0], [-0.1, 2.6, -4.4], [0.3, 1.9, -3.2]]], [A, B, D, Cw]), m));
  // legs: four folded spikes
  g.legs = [];
  for (const [x, z] of [[-1.1, 2.4], [1.1, 2.4], [-1.1, -2.6], [1.1, -2.6]]) { const p = new THREE.Group(); p.position.set(x, 0.2, z); body.add(p); p.add(new THREE.Mesh(folds([[[-0.45, 0, -0.35], [0.45, 0, -0.35], [0.05, -3.2, 0.1]], [[0.45, 0, -0.35], [0.4, 0, 0.45], [0.05, -3.2, 0.1]], [[0.4, 0, 0.45], [-0.45, 0, -0.35], [0.05, -3.2, 0.1]]], [A, B, D]), m)); g.legs.push(p); }
  g.traverse((q) => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } });
  g.pose = (t, k = {}) => {
    body.position.y = 3.2; body.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0); tail.rotation.set(0, 0, 0); g.legs.forEach((l) => l.rotation.set(0, 0, 0)); body.scale.set(1, 1, 1);
    if (k.sleep) {   // curled up like a kitten: legs tucked, head down on the paws, tail around
      body.position.y = 1.0; g.legs.forEach((l, i) => { l.rotation.x = i < 2 ? -1.45 : 1.45; }); head.rotation.x = 0.45; head.rotation.y = 0.5; tail.rotation.y = 1.3; tail.rotation.x = -0.4;
      body.scale.y = 1 + Math.sin(t * 1.6) * 0.03; return;
    }
    if (k.run) { const ph = t * (k.rate || 11); g.legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * 0.7; }); body.position.y = 3.2 + Math.abs(Math.sin(ph)) * 0.5; tail.rotation.x = Math.sin(ph) * 0.2; }
    if (k.dive) { body.rotation.x = 0.55 * k.dive; g.legs.forEach((l, i) => { l.rotation.x = (i < 2 ? -1.0 : 0.9) * k.dive; }); head.rotation.x = -0.3 * k.dive; tail.rotation.x = -0.5 * k.dive; }
    if (k.snarl) { head.rotation.z = Math.sin(t * 9) * 0.05 * k.snarl; g.ears[0].rotation.x = -0.4 * k.snarl; }
    if (k.tilt) head.rotation.z = k.tilt;
  };
  g.glow = (k) => { m.emissiveIntensity = k; };
  return g;
}
// desk-size paper animals
export function smallFox(s = 0.12, o = {}) { const f = paperFox(o); f.scale.setScalar(s); f.pose(0, {}); return f; }
export function paperCrane(col = '#7fc8ff') {
  const m = foldMat(), A = col, B = new THREE.Color(col).lerp(new THREE.Color('#ffffff'), 0.4).getStyle(), g = new THREE.Group();
  g.add(new THREE.Mesh(folds([
    [[0, 0, -0.6], [0, 0.35, 0], [0, 0, 0.6]], [[0, 0, -0.6], [0, 0, 0.6], [0, -0.25, 0]],
    [[0, 0.1, -0.2], [-1.2, 0.6, 0.0], [0, 0.1, 0.25]], [[0, 0.1, -0.2], [1.2, 0.6, 0.0], [0, 0.1, 0.25]],
    [[0, 0, 0.5], [0, 0.9, 1.0], [0.05, 0.05, 0.3]], [[0, 0, -0.5], [0, 0.6, -1.1], [0.05, 0.05, -0.3]], [[0, 0.9, 1.0], [0, 0.75, 1.3], [0.04, 0.8, 0.95]],
  ], [A, B, A, B, A, B, A]), m));
  g.traverse((q) => { if (q.isMesh) q.castShadow = true; }); return g;
}

// ---------------- her world ----------------
function starGeo() {
  const sh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 2, r = k % 2 ? 0.45 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; k ? sh.lineTo(x, y) : sh.moveTo(x, y); }
  const gg = new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.05, bevelSegments: 1 }); gg.center(); return gg;
}
export function paperStars(n = 70, o = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: '#fff3c4', roughness: 0.8, flatShading: true, emissive: '#ffd77a', emissiveIntensity: 0.55 });
  const im = new THREE.InstancedMesh(starGeo(), mat, n), r = rng(o.seed || 21), data = [];
  const R = o.radius ?? 70, y0 = o.y0 ?? 14, y1 = o.y1 ?? 55, c = o.centre || v3(0, 0, 0);
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = 10 + Math.sqrt(r()) * R; data.push({ p: v3(c.x + Math.cos(a) * d, y0 + r() * (y1 - y0), c.z + Math.sin(a) * d), s: 0.8 + r() * 1.8, ph: r() * 9, sp: 0.3 + r() * 0.5 }); }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = v3(), P = v3();
  im.update = (t) => { data.forEach((d, i) => { P.copy(d.p); P.y += Math.sin(t * 0.6 + d.ph) * 0.6; E.set(Math.sin(t * 0.3 + d.ph) * 0.4, t * d.sp + d.ph, 0.2); Q.setFromEuler(E); S.setScalar(d.s); M.compose(P, Q, S); im.setMatrixAt(i, M); }); im.instanceMatrix.needsUpdate = true; };
  const CR = new THREE.Color('#fff3c4'), RED = new THREE.Color('#ff2a3a'), GOLD = new THREE.Color('#ffc93a'), ER = new THREE.Color('#ffd77a'), ERED = new THREE.Color('#ff2030'), EG = new THREE.Color('#ffb020');
  im.tint = (red = 0, gold = 0) => { mat.color.copy(CR).lerp(RED, red).lerp(GOLD, gold); mat.emissive.copy(ER).lerp(ERED, red).lerp(EG, gold); mat.emissiveIntensity = 0.55 + red * 0.35 + gold * 0.4; };
  im.castShadow = false; im.userData.noAO = true; im.frustumCulled = false; im.update(0); return im;
}
export function milkRiver(len = 160, w = 14) {
  const g = new THREE.Group();
  const tex = canvasTex(256, 512, (x, W, H) => { x.fillStyle = '#ffb3cf'; x.fillRect(0, 0, W, H); const r = rng(11); for (let i = 0; i < 60; i++) { x.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(255,140,180,0.6)'; x.lineWidth = 3 + r() * 6; x.beginPath(); const cx = r() * W, cy = r() * H; x.moveTo(cx, cy); x.bezierCurveTo(cx + 20, cy + 30, cx - 20, cy + 60, cx + 6, cy + 90); x.stroke(); } });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w / 14, len / 28);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.05, emissive: '#ff9fc4', emissiveIntensity: 0.12 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.7; water.receiveShadow = true; g.add(water);
  // soft cream banks
  const bank = paint('#fff0f5', { roughness: 0.6 }), b = new Batch(); for (const s of [-1, 1]) b.box(bank, 1.4, 1.0, len, s * (w / 2 + 0.3), -0.45, 0, { r: 0.45 }); b.done(g);
  // strawberries floating
  const berries = []; const r = rng(5);
  for (let i = 0; i < 14; i++) { const be = new THREE.Group(), bb = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.3, 10), paint('#ff3a55', { roughness: 0.4 })); bb.rotation.x = Math.PI; be.add(bb); const lf = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.3, 6), paint('#4cbf4a')); lf.position.y = 0.72; be.add(lf); be.userData = { x: (r() - 0.5) * (w - 3), z: (r() - 0.5) * len, ph: r() * 7 }; be.traverse((q) => { if (q.isMesh) q.castShadow = true; }); g.add(be); berries.push(be); }
  g.update = (t) => { tex.offset.y = -t * 0.18; berries.forEach((be) => { const z = ((be.userData.z + t * 2.2 + len / 2) % len) - len / 2; be.position.set(be.userData.x, -0.35 + Math.sin(t * 2 + be.userData.ph) * 0.1, z); be.rotation.set(0.3, t * 0.4 + be.userData.ph, 0.2); }); };
  g.update(0); return g;
}
const GAMES = [['DICE DASH', '#ef4f5a'], ['STAR RACE', '#3d8fe0'], ['SNAKE HOP', '#5fbf57'], ['TILE TOWN', '#ffb020'], ['PEG PALS', '#b26be0'], ['MOON MAZE', '#22b6c9'], ['CASTLE CLIMB', '#ff7aa8']];
const gameMats = GAMES.map(([t, c]) => [paint(c, { roughness: 0.6 }), new THREE.MeshStandardMaterial({ roughness: 0.6, map: label(t, c, '#ffffff', 512, 160, 66) })]);
function gameBox(i, w = 5.2, h = 0.9, d = 3.4) {
  const [side, top] = gameMats[i % gameMats.length]; const mats = [side, side, top, paint('#f4efe4'), side, side];
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); m.castShadow = true; m.receiveShadow = true; return m;
}
// a bridge of board-game boxes along x, across a river running along z; the deck is at deckY
export function gameBridge(span = 22) {
  const g = new THREE.Group(), n = Math.ceil(span / 3.2), deckY = 2.2;
  for (let i = 0; i < n; i++) { const x = -span / 2 + 1.6 + i * 3.2, b = gameBox(i + 2, 3.3, 0.9, 5.4); const arch = Math.sin((i + 0.5) / n * Math.PI) * 1.2; b.position.set(x, deckY + arch - 0.45, 0); b.rotation.set(0, (i % 2 ? 0.04 : -0.03), Math.cos((i + 0.5) / n * Math.PI) * -0.12); g.add(b); }
  // pillars: stacks of boxes at both banks and in the middle
  for (const x of [-span / 2 + 1.5, 0, span / 2 - 1.5]) for (let k = 0; k < 3; k++) { const b = gameBox(k * 2 + (x > 0 ? 1 : 0), 4.2, 0.9, 3.0); b.position.set(x + (k % 2 ? 0.2 : -0.15), -0.25 + k * 0.9 + (x === 0 ? -0.7 : 0), 0); b.rotation.y = (k - 1) * 0.12 + Math.PI / 2; g.add(b); }
  g.deckY = (x) => deckY + Math.sin(clamp((x + span / 2) / span) * Math.PI) * 1.2 + 0.05;
  return g;
}
// a giant patchwork blanket fort over two chairs, the opening at +z, a broom flagpole
export function blanketFort(o = {}) {
  const g = new THREE.Group(), W = o.w ?? 14, D = o.d ?? 12, H = o.h ?? 9;
  const quilt = (seed, cols) => { const t = canvasTex(256, 256, (x, w, h) => { const r = rng(seed); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.fillStyle = cols[Math.floor(r() * cols.length)]; x.fillRect(i * 64, j * 64, 64, 64); if (r() < 0.5) { x.fillStyle = 'rgba(255,255,255,0.55)'; for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(i * 64 + 16 + (k % 2) * 32, j * 64 + 16 + Math.floor(k / 2) * 32, 6, 0, 7); x.fill(); } } } x.strokeStyle = 'rgba(255,255,255,0.8)'; x.setLineDash([6, 5]); x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, side: THREE.DoubleSide }); };
  const q1 = quilt(3, ['#ff8fb1', '#ffd36a', '#8fd3ff', '#9be08a', '#c7a4ff']), q2 = quilt(8, ['#ffb070', '#7fe0c2', '#ff8a8a', '#fff1b0', '#9fb4ff']);
  // the roof: two sagging slopes from the ridge
  const slope = (side, mat) => { const geo = new THREE.PlaneGeometry(D + 1.5, Math.hypot(W / 2, H * 0.55) + 0.8, 12, 8), P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, Math.sin((x / (D + 1.5) + 0.5) * Math.PI * 3) * 0.25 + Math.sin((y / 8 + 0.5) * Math.PI) * -0.45); } geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat); const ang = Math.atan2(H * 0.55, W / 2); m.rotation.order = 'YXZ'; m.rotation.y = Math.PI / 2; m.rotation.x = side * (Math.PI / 2 - ang); m.position.set(side * W / 4, H * 0.725, 0); return m; };
  g.add(slope(-1, q1)); g.add(slope(1, q2));
  // hanging side drapes down to the floor
  const drape = (side, mat) => { const geo = new THREE.PlaneGeometry(D + 1.4, H * 0.48, 14, 4), P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, Math.sin(x * 1.3) * 0.3 * (0.5 - y / (H * 0.48))); } geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat); m.rotation.y = side * Math.PI / 2; m.position.set(side * (W / 2 + 0.1), H * 0.24, 0); return m; };
  g.add(drape(-1, q2)); g.add(drape(1, q1));
  // the back closed, the front tied open (two folded flaps)
  { const back = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.4, H * 0.9), q1); back.position.set(0, H * 0.45, -D / 2 - 0.6); g.add(back); }
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.32, H * 0.88), s < 0 ? q2 : q1); f.position.set(s * W * 0.36, H * 0.44, D / 2 + 0.7); f.rotation.y = s * 0.35; g.add(f); const tie = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.12, 6, 12), paint('#ff4f6a')); tie.position.set(s * W * 0.32, H * 0.42, D / 2 + 1.0); g.add(tie); }
  // two chair backs poking up at the ridge ends
  const cw = paint('#c98a4a', { roughness: 0.6 }), cb = new Batch(); for (const z of [-D / 2 - 0.2, D / 2 + 0.3]) { cb.box(cw, 0.5, H * 1.1, 0.5, -1.4, H * 0.55, z, { r: 0.1 }); cb.box(cw, 0.5, H * 1.1, 0.5, 1.4, H * 0.55, z, { r: 0.1 }); cb.box(cw, 3.4, 0.6, 0.5, 0, H * 1.05, z, { r: 0.12 }); } cb.done(g);
  // the flag: F + M on a broom handle
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6, 8), paint('#e8c07a')); pole.position.set(0, H * 1.05 + 3, D / 2 + 0.3); g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6, 8, 2), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.85, map: canvasTex(320, 200, (x, w, h) => { x.fillStyle = '#ffe96a'; x.fillRect(0, 0, w, h); x.fillStyle = '#e2456a'; x.font = '900 104px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.flag || 'F + M', w / 2, h / 2 + 6); }) }));
  flag.position.set(2.15, H * 1.05 + 4.8, D / 2 + 0.3); g.add(flag); g.flag = flag;
  g.update = (t) => { const P = flag.geometry.attributes.position; if (!flag.userData.x0) flag.userData.x0 = Float32Array.from(P.array); const a = flag.userData.x0; for (let i = 0; i < P.count; i++) { const x = a[i * 3]; P.setZ(i, Math.sin(x * 1.6 - t * 5) * 0.22 * (x + 2.1) / 4.2); } P.needsUpdate = true; flag.geometry.computeVertexNormals(); };
  g.size = { w: W, d: D, h: H };
  return shadowAll(g);
}
// pastel paper hills: the ground of her world
export function paperHills(o = {}) {
  const g = new THREE.Group();
  const gr = new THREE.Mesh(new THREE.CircleGeometry(400, 60), new THREE.MeshStandardMaterial({ color: o.ground || '#b9e6a6', roughness: 0.95, map: canvasTex(256, 256, (x, W) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, W); const r = rng(2); for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(${200 + r() * 55},${220 + r() * 35},${200 + r() * 55},0.5)`; x.fillRect(r() * W, r() * W, 3, 3); } }) }));
  gr.material.map.wrapS = gr.material.map.wrapT = THREE.RepeatWrapping; gr.material.map.repeat.set(40, 40);
  gr.rotation.x = -Math.PI / 2; gr.receiveShadow = true; g.add(gr);
  const cols = o.hills || ['#d8b8ff', '#ffc2dc', '#a8e6cf', '#ffe3a3', '#b8d8ff'], r = rng(o.seed || 7);
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = 90 + r() * 120, s = 18 + r() * 30; const h = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), paperMat(cols[i % cols.length])); h.scale.set(s, s * (0.5 + r() * 0.5), s); h.position.set(Math.cos(a) * d, -1, Math.sin(a) * d); h.receiveShadow = true; g.add(h); }
  // paper trees: cone stacks
  for (let i = 0; i < 30; i++) { const a = r() * Math.PI * 2, d = 45 + r() * 60, s = 0.8 + r() * 0.9, t = new THREE.Group(); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(3.4 - k * 0.8, 4, 5), paperMat(['#7fd6a0', '#5fc0b0', '#9be08a'][k])); c.position.y = 4 + k * 2.6; c.castShadow = true; t.add(c); } const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3, 5), paperMat('#c98a5a')); tr.position.y = 1.5; t.add(tr); t.scale.setScalar(s); t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); g.add(t); }
  // a big paper moon
  const moon = new THREE.Mesh(new THREE.CircleGeometry(16, 7), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6d0').multiplyScalar(1.3), fog: false, toneMapped: false })); moon.position.set(-60, 90, -230); g.add(moon); g.moon = moon;
  return g;
}

// ---------------- the gardener's world: flowers (the example) ----------------
export function flowerMeadow(o = {}) {
  const g = new THREE.Group();
  const gr = new THREE.Mesh(new THREE.CircleGeometry(300, 48), surf('grass', '#7cc860')); gr.rotation.x = -Math.PI / 2; gr.receiveShadow = true; g.add(gr);
  const r = rng(o.seed || 4), kinds = ['buttercup', 'thistle'], tints = [null, '#ff8fb1', '#ffd23f', '#ffffff', '#b98cff', '#ff7a5a'];
  for (let i = 0; i < 260; i++) { const a = r() * Math.PI * 2, d = 4 + Math.sqrt(r()) * 70; const f = flowerMesh(kinds[i % 2], 1.6 + r() * 1.6, tints[i % tints.length] || undefined); f.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); f.rotation.y = r() * 6; g.add(f); }
  // round shrubs and a few fruit trees
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = 30 + r() * 60, t = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 5, 7), paint('#8a5a3a')); tr.position.y = 2.5; t.add(tr); const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(4, 1), paint(['#5fbf57', '#4fae5a', '#7cc860'][i % 3], { flatShading: true, roughness: 0.8 })); cr.position.y = 7; t.add(cr); t.traverse((q) => { if (q.isMesh) q.castShadow = true; }); t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); g.add(t); }
  return g;
}

// ---------------- props ----------------
export function shoebox(n = 14) {
  const g = new THREE.Group(), b = new Batch(), card = paint('#7fc8ff', { roughness: 0.8 }), inside = paint('#f4efe4', { roughness: 0.9 });
  b.box(card, 4.2, 0.2, 2.8, 0, 0.1, 0, { r: 0.03 }); for (const s of [-1, 1]) { b.box(card, 4.2, 1.5, 0.15, 0, 0.75, s * 1.35, { r: 0.03 }); b.box(card, 0.15, 1.5, 2.8, s * 2.05, 0.75, 0, { r: 0.03 }); } b.box(inside, 3.9, 0.08, 2.5, 0, 0.22, 0, { r: 0.02 }); b.done(g);
  const r = rng(6), cols = ['#ff9a4a', '#7fc8ff', '#ffd36a', '#ff8fb1', '#9be08a', '#c7a4ff'];
  for (let i = 0; i < n; i++) { const a = i % 3 === 0 ? smallFox(0.1, { col: cols[i % cols.length], col2: '#fff3e0', col3: cols[(i + 2) % cols.length] }) : paperCrane(cols[i % cols.length]); if (i % 3) a.scale.setScalar(0.42); a.position.set(-1.5 + (i % 5) * 0.75 + r() * 0.2, 0.55 + Math.floor(i / 5) * 0.35, -0.8 + (Math.floor(i / 5) % 3) * 0.75); a.rotation.y = r() * 6; g.add(a); }
  return shadowAll(g);
}
export function cupcake() {
  const g = new THREE.Group(), b = new Batch(); b.cyl(paint('#ff8fb1', { roughness: 0.6 }), 0.55, 0.42, 0.6, 0, 0.3, 0, { seg: 16 }); b.add(paint('#fff3f8', { roughness: 0.4 }), new THREE.SphereGeometry(0.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.6, 0); b.cyl(paint('#7fc8ff'), 0.05, 0.05, 0.5, 0, 1.4, 0, { seg: 6 }); b.done(g);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb040').multiplyScalar(2.2) })); fl.scale.set(1, 1.7, 1); fl.position.y = 1.75; fl.userData.noAO = true; g.add(fl); g.flame = fl;
  return shadowAll(g);
}
// wood chips that pop off and fall: const s = sawdust(scene); s.fire(t0, pos, height); s.update(t)
export function sawdust(scene, n = 160) {
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: '#c8935a', roughness: 0.9 }), n), r = rng(17), D = [];
  for (let i = 0; i < n; i++) D.push({ o: v3((r() - 0.5) * 1.6, r(), (r() - 0.5) * 1.0), v: v3((r() - 0.5) * 6, 1 + r() * 4, (r() - 0.5) * 6), sp: v3(r() * 9, r() * 9, r() * 9), s: 0.6 + r() * 1.2, c: r() });
  const col = new THREE.Color(); D.forEach((d, i) => { col.set(d.c < 0.5 ? '#c8935a' : d.c < 0.8 ? '#a8723e' : '#e2b27a'); m.setColorAt(i, col); });
  m.castShadow = true; m.frustumCulled = false; scene.add(m); m.visible = false;
  let t0 = 1e9, P0 = v3(), HH = 4; const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = v3(), P = v3();
  m.fire = (t, pos, h = 4) => { t0 = t; P0.copy(pos); HH = h; return m; };
  m.update = (t) => { const f = t - t0; m.visible = f >= 0 && f < 2.4; if (!m.visible) return; D.forEach((d, i) => { const st = d.o.y * 0.35; const ff = Math.max(0, f - st); P.set(P0.x + d.o.x + d.v.x * ff * 0.5, P0.y + d.o.y * HH + d.v.y * ff - 9.8 * ff * ff, P0.z + d.o.z + d.v.z * ff * 0.5); P.y = Math.max(0.03, P.y); E.set(d.sp.x * ff, d.sp.y * ff, d.sp.z * ff); Q.setFromEuler(E); S.setScalar(d.s * (f < st ? 0 : 1)); M.compose(P, Q, S); m.setMatrixAt(i, M); }); m.instanceMatrix.needsUpdate = true; };
  return m;
}

// ---------------- worn: the beanie ----------------
export function wearBeanie(c, col = '#ffd23f', o = {}) {
  const B = partBox(c.head), g = new THREE.Group(), b = new Batch(), m = surf('stucco', col, { roughness: 0.95 }), cuff = paint(o.cuff || col, { roughness: 0.95 }), w = (B.max.x - B.min.x), d = (B.max.z - B.min.z), h = (B.max.y - B.min.y);
  b.add(m, new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(w * 0.56, h * 0.42, d * 0.58), 0, 0, 0);
  b.cyl(cuff, w * 0.57, w * 0.58, h * 0.16, 0, -h * 0.02, 0, { seg: 22 });
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; b.box(cuff, 0.06, h * 0.15, 0.06, Math.sin(a) * w * 0.585, -h * 0.02, Math.cos(a) * d * 0.59, { r: 0.02 }); }
  b.add(paint(o.pom || '#ffffff', { roughness: 1 }), new THREE.IcosahedronGeometry(w * 0.16, 1), 0, h * 0.44, 0);
  b.done(g); g.position.set((B.min.x + B.max.x) / 2, B.max.y - h * (o.sink ?? 0.12), (B.min.z + B.max.z) / 2 - 0.02); g.scale.y = o.sy ?? 1;
  c.head.add(worn(g)); return g;
}

// ---------------- wood: a character turning to wood from the feet up ----------------
export function woodUniforms() { return { uWoodY: { value: -10 }, uWoodK: { value: 1 } }; }
const WOOD_GLSL = `
  float wh(vec3 p){ return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float wn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(wh(i), wh(i + vec3(1,0,0)), f.x), mix(wh(i + vec3(0,1,0)), wh(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(wh(i + vec3(0,0,1)), wh(i + vec3(1,0,1)), f.x), mix(wh(i + vec3(0,1,1)), wh(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
export function woodify(c, U, o = {}) {
  const done = new Set();
  c.root.traverse((q) => {
    if (!q.isMesh || q.userData.worn || done.has(q)) return;
    if (o.skip && o.skip(q)) return;
    done.add(q);
    const isFace = q === c.faceSheet || (q.material && q.material.transparent && q.material.alphaTest > 0);
    const m = isFace ? q.material : q.material.clone();   // the face sheet's material is per character and setFace swaps its map: patch in place
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (s, r) => {
      if (prev) prev(s, r);
      Object.assign(s.uniforms, U);
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW;').replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vWW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWW; uniform float uWoodY, uWoodK;${WOOD_GLSL}`)
        .replace('#include <map_fragment>', `#include <map_fragment>
        float wEdge = uWoodY + (wn(vWW * 2.3) - 0.5) * 0.35;
        float wK = (1.0 - smoothstep(wEdge - 0.06, wEdge + 0.06, vWW.y)) * uWoodK;
        float gr = sin((vWW.y * 1.4 + wn(vWW * vec3(1.2, 0.4, 1.2)) * 3.0 + (vWW.x + vWW.z) * 0.25) * 9.0) * 0.5 + 0.5;
        vec3 woodC = mix(vec3(0.3, 0.16, 0.07), vec3(0.52, 0.31, 0.14), gr * 0.7 + wn(vWW * 6.0) * 0.3);
        ${isFace ? 'woodC = vec3(0.3, 0.17, 0.08);' : ''}
        float rim = (smoothstep(wEdge - 0.22, wEdge - 0.04, vWW.y) - smoothstep(wEdge - 0.04, wEdge + 0.02, vWW.y)) * uWoodK;
        diffuseColor.rgb = mix(diffuseColor.rgb, woodC, wK);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.66, 0.42), rim * 0.6 * step(0.001, wK));`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance *= (1.0 - wK * 0.92);`);
    };
    const key = (m.customProgramCacheKey ? m.customProgramCacheKey() : '') + '|wood' + (isFace ? 'F' : '');
    m.customProgramCacheKey = () => key;
    m.needsUpdate = true;
    if (!isFace) q.material = m;
  });
  return U;
}
