// The Weight of the Truth (Flower Man remake 6): Plumbwick, where every lie makes you lighter.
//   foundersHall() a round hall under a stained-glass dome: .H .R .glassY(x, z) (the height of the inner glass), .plinth .dais, .ring(t, tHit, x, z)
//   glassPeacock() a house-tall glass bird: .set(t, tHit), .drape(k)   ironBoots(c) paperSlippers(c) diverBelt(c) mitt(c): worn props; each has .set(on)
//   loseBoot(boots) a pair left standing where they came off   plainRoom(o)   courtroom() (.netAt(x, z))   plumbwick() (the street and the roof, .RY)
//   brookYard() (fence along x at z 0, .FH), kitchenSet(), auntSet(), fireLadder(a, b), hallClock() (.set(hours)), rope() (.set(a, b))
import * as THREE from 'three';
import { v3, rng, clamp, lerp } from './core.js';
import { Batch, surf, paint, building, lamp, sign } from './kit.js';
import { canvasTex } from './props.js';
import { chandelier } from './mansion.js';
import { cottage, picket, flowers } from './pastel.js';
import { treeShape } from './forest.js';

const BRASS = () => paint('#c49a45', { metalness: 0.75, roughness: 0.32 });
const flat = (mat, w, d, x, y, z) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); const P = g.attributes.position, uv = g.attributes.uv, sp = mat.userData.span || 8; for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + x) / sp, (P.getZ(i) + z) / sp); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; return m; };

// ---- worn props ----
function partBox(group) { const bx = new THREE.Box3(); group.children.forEach((k) => { if (k.isMesh) { k.geometry.computeBoundingBox(); const b = k.geometry.boundingBox.clone(); b.translate(k.position); bx.union(b); } }); return bx; }
function onFeet(c, make) { const parts = [0, 1].map((i) => { const b = partBox(c.knee[i]), g = new THREE.Group(), sz = b.getSize(v3()); g.position.set((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2); make(g, sz.x, sz.z); c.knee[i].add(g); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g; }); return { parts, set(on) { parts.forEach((g) => { g.visible = on; }); } }; }
export function bootParts(g, w, d) {
  const b = new Batch(), iron = paint('#59616e', { metalness: 0.6, roughness: 0.42 }), dark = paint('#3a404b', { metalness: 0.55, roughness: 0.5 }), brass = BRASS();
  b.box(dark, w * 1.2, 0.3, d * 1.62, 0, -0.1, d * 0.14, { r: 0.08 });
  b.box(iron, w * 1.14, 1.5, d * 1.16, 0, 0.72, 0, { r: 0.16 });
  b.box(iron, w * 1.16, 0.74, d * 0.62, 0, 0.32, d * 0.72, { r: 0.28 });
  b.box(dark, w * 1.24, 0.2, d * 1.24, 0, 1.46, 0, { r: 0.06 });
  for (const y of [0.42, 1.0]) { b.box(brass, w * 1.2, 0.2, d * 1.22, 0, y, 0, { r: 0.05 }); b.box(brass, 0.5, 0.36, 0.14, 0, y, d * 0.64, { r: 0.05 }); }
  const rv = new THREE.SphereGeometry(0.075, 8, 6); for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) b.add(brass, rv.clone(), sx * w * 0.58, 0.28 + i * 0.5, d * 0.18);
  b.done(g);
}
export const ironBoots = (c) => onFeet(c, bootParts);
export function looseBoots(w = 2, d = 2) { const g = new THREE.Group(); for (const [x, ry] of [[-1.3, 0.2], [1.3, -0.25]]) { const q = new THREE.Group(); bootParts(q, w, d); q.position.set(x, 0.25, 0); q.rotation.y = ry; g.add(q); } g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g; }
const paperMat = () => { const t = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#fbf7ec'; x.fillRect(0, 0, w, h); x.strokeStyle = '#d7cfbb'; x.lineWidth = 3; for (const [a, b, c, d] of [[0, 0, 256, 256], [256, 0, 0, 256], [128, 0, 128, 256], [0, 128, 256, 128]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); } }); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }); };
export function slipperParts(g, w, d) {
  const m = paperMat(), pts = [[-0.5, 0], [0.5, 0], [0.56, 0.8], [0.26, 1.34], [0, 1.6], [-0.26, 1.34], [-0.56, 0.8]].map(([x, z]) => new THREE.Vector2(x * w, (z - 0.56) * d)), sh = new THREE.Shape(pts), sole = new THREE.ExtrudeGeometry(sh, { depth: 0.13, bevelEnabled: false }); sole.rotateX(Math.PI / 2); sole.translate(0, 0.02, 0);
  const s = new THREE.Mesh(sole, m); g.add(s);
  const band = new THREE.Mesh(new THREE.BoxGeometry(w * 1.12, 0.46, d * 0.74), m); band.position.set(0, 0.2, d * 0.1); g.add(band);
  const fold = new THREE.Mesh(new THREE.ConeGeometry(w * 0.62, d * 0.9, 4), m); fold.rotation.x = Math.PI / 2; fold.rotation.y = Math.PI / 4; fold.scale.y = 1; fold.position.set(0, 0.2, d * 0.76); g.add(fold);
}
export const paperSlippers = (c) => onFeet(c, slipperParts);
export function lostSlipper(w = 2, d = 2) { const g = new THREE.Group(); slipperParts(g, w, d); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g; }
export function diverBelt(c) {
  const b0 = new THREE.Box3(); c.torso.children.forEach((k) => { if (k.isMesh && k.geometry) { k.geometry.computeBoundingBox(); const q = k.geometry.boundingBox.clone(); q.translate(k.position); b0.union(q); } });
  const sz = b0.getSize(v3()), g = new THREE.Group(), b = new Batch(), web = paint('#2f3946', { roughness: 0.75 }), lead = paint('#6d7480', { metalness: 0.55, roughness: 0.45 }), brass = BRASS(), y = b0.min.y + 0.5, zc = (b0.min.z + b0.max.z) / 2, cx = (b0.min.x + b0.max.x) / 2;
  b.box(web, sz.x * 1.06, 0.62, sz.z * 1.12, cx, y, zc, { r: 0.08 });
  for (let i = -2; i <= 2; i++) if (i !== 0) { b.box(lead, 0.72, 1.0, 0.44, cx + i * sz.x * 0.2, y - 0.03, zc + sz.z * 0.63, { r: 0.1 }); b.box(lead, 0.72, 1.0, 0.44, cx + i * sz.x * 0.2, y - 0.03, zc - sz.z * 0.63, { r: 0.1 }); }
  b.box(brass, 0.98, 0.82, 0.22, cx, y, zc + sz.z * 0.6, { r: 0.06 }); b.box(web, 0.5, 0.3, 0.1, cx, y, zc + sz.z * 0.66, { r: 0.03 }); b.done(g); g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  c.torso.add(g); return { g, set(on) { g.visible = on; } };
}
export function mitt(c, side = 1) {
  const e = c.elbow[side], bx = partBox(e), g = new THREE.Group(), b = new Batch(), lea = paint('#a8622a', { roughness: 0.62 }), dk = paint('#6e3c15', { roughness: 0.7 }), lace = paint('#e6cfa2', { roughness: 0.7 });
  g.position.set((bx.min.x + bx.max.x) / 2, bx.min.y + 0.34, (bx.min.z + bx.max.z) / 2);
  b.box(lea, 2.1, 1.5, 1.5, 0, -0.1, 0, { r: 0.46 }); b.box(dk, 1.5, 1.0, 0.2, 0, -0.12, 0.76, { r: 0.09 });
  for (let i = 0; i < 4; i++) b.box(lea, 0.5, 1.15, 0.72, -0.72 + i * 0.48, -1.06, 0.1, { r: 0.22 });
  b.box(lea, 0.6, 1.0, 0.72, 1.28, -0.42, 0.12, { r: 0.24, rz: -0.45 }); b.box(lace, 1.8, 0.12, 0.12, 0, 0.5, 0.74, { r: 0.04 }); b.box(lace, 1.8, 0.12, 0.12, 0, 0.5, -0.74, { r: 0.04 });
  b.done(g); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); e.add(g); return g;
}

// ---- rope, ladder, clock ----
export function rope(col = '#d9bd86', r = 0.075) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 })), up = v3(0, 1, 0), d = v3(); m.castShadow = true; m.set = (a, b) => { d.copy(b).sub(a); const L = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(up, d.normalize()); }; return m; }
export function fireLadder(a, b0) {
  const g = new THREE.Group(), L = a.distanceTo(b0), b = new Batch(), red = paint('#d8352a', { metalness: 0.3, roughness: 0.4 }), al = paint('#d7dbe0', { metalness: 0.7, roughness: 0.3 });
  for (const s of [-1, 1]) b.box(red, 0.34, L, 0.5, s * 1.9, L / 2, 0, { r: 0.05 });
  for (let y = 1.6; y < L; y += 1.7) b.cyl(al, 0.11, 0.11, 3.8, 0, y, 0, { rz: Math.PI / 2, seg: 8 });
  b.box(paint('#2f3338', { roughness: 0.8 }), 5, 0.3, 2.2, 0, 0.15, 0, { r: 0.1 }); b.done(g); g.position.copy(a);
  g.quaternion.setFromUnitVectors(v3(0, 1, 0), b0.clone().sub(a).normalize()); g.userData.L = L;
  // the rungs face the world, so the ladder needs its broad face turned to the climber: a roll about its own axis
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } }); return g;
}
export function hallClock(R = 5.2) {
  const g = new THREE.Group(), b = new Batch(), brass = BRASS(); b.cyl(brass, R + 0.6, R + 0.6, 0.8, 0, 0, 0, { rx: Math.PI / 2, seg: 48 }); b.done(g);
  const face = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (x, W) => { x.fillStyle = '#fff7e6'; x.fillRect(0, 0, W, W); x.fillStyle = '#312a22'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '900 58px ITTInter, sans-serif'; for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; x.fillText(String(i), W / 2 + Math.sin(a) * 196, W / 2 - Math.cos(a) * 196); } }), roughness: 0.5 })); face.position.z = 0.42; g.add(face);
  const hand = (w, l, c) => { const p = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(w, l, 0.1), paint(c, { roughness: 0.4 })); m.position.y = l / 2 - 0.3; p.add(m); p.position.z = 0.55; g.add(p); return p; };
  const hr = hand(0.42, R * 0.55, '#2b2520'), mn = hand(0.26, R * 0.84, '#a22b20'); g.set = (h) => { hr.rotation.z = -(h / 12) * Math.PI * 2; mn.rotation.z = -h * Math.PI * 2; }; return g;
}

// ---- Founders' Hall ----
const R_H = 34, DRUM = 20;
export function foundersHall(o = {}) {
  const g = new THREE.Group(), b = new Batch(), brass = BRASS(), cream = surf('stucco', '#f5ecd9'), gold = paint('#d9b25a', { metalness: 0.55, roughness: 0.4 }), teal = paint('#2f8f93', { roughness: 0.5 });
  const fl = new THREE.Mesh(new THREE.CircleGeometry(R_H + 2, 96), new THREE.MeshStandardMaterial({ map: canvasTex(2048, 2048, (x, W) => { const c = W / 2; x.fillStyle = '#efe4cc'; x.fillRect(0, 0, W, W); const cols = ['#d8b76f', '#2f8f93', '#c95a6e', '#f1e6cf']; for (let r = 980, j = 0; r > 40; r -= 88, j++) { for (let i = 0; i < 48; i++) { const a0 = (i / 48) * Math.PI * 2, a1 = ((i + 1) / 48) * Math.PI * 2; x.fillStyle = j % 3 === 2 ? cols[(i + j) % 2 ? 0 : 3] : (i + j) % 2 ? '#f6ecd8' : j % 3 ? '#e7d8ba' : cols[1 + (i % 2)]; x.beginPath(); x.arc(c, c, r, a0, a1); x.arc(c, c, r - 84, a1, a0, true); x.closePath(); x.fill(); } } x.strokeStyle = '#b89a5e'; x.lineWidth = 3; for (let r = 980; r > 40; r -= 88) { x.beginPath(); x.arc(c, c, r, 0, 7); x.stroke(); } }), roughness: 0.32 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const wt = canvasTex(2048, 1024, (x, W, H) => { x.fillStyle = '#f6edda'; x.fillRect(0, 0, W, H); const n = 4, bw = W / n; for (let i = 0; i < n; i++) { const c = (i + 0.5) * bw, top = H * 0.16, wd = bw * 0.27; x.fillStyle = '#d0ecff'; x.beginPath(); x.moveTo(c - wd, H * 0.8); x.lineTo(c - wd, top + wd); x.arc(c, top + wd, wd, Math.PI, 0); x.lineTo(c + wd, H * 0.8); x.closePath(); x.fill(); x.save(); x.clip(); const gr = x.createLinearGradient(0, top, 0, H * 0.8); gr.addColorStop(0, '#a9dcff'); gr.addColorStop(1, '#eaf8ff'); x.fillStyle = gr; x.fillRect(c - wd, top, wd * 2, H); x.strokeStyle = '#c49a45'; x.lineWidth = 8; for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(c + k * wd * 0.5, 0); x.lineTo(c + k * wd * 0.5, H); x.stroke(); } for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(c - wd, top + k * H * 0.13); x.lineTo(c + wd, top + k * H * 0.13); x.stroke(); } x.restore(); x.strokeStyle = '#b8924a'; x.lineWidth = 16; x.beginPath(); x.moveTo(c - wd, H * 0.8); x.lineTo(c - wd, top + wd); x.arc(c, top + wd, wd, Math.PI, 0); x.lineTo(c + wd, H * 0.8); x.closePath(); x.stroke(); } x.fillStyle = '#c95a6e'; x.fillRect(0, H * 0.88, W, H * 0.12); x.fillStyle = '#c49a45'; x.fillRect(0, H * 0.865, W, 12); });
  wt.wrapS = THREE.RepeatWrapping; wt.repeat.set(3, 1);
  const wg = new THREE.CylinderGeometry(R_H, R_H, DRUM, 96, 1, true), wm = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ map: wt, side: THREE.BackSide, roughness: 0.7 })); wm.position.y = DRUM / 2; wm.receiveShadow = true; g.add(wm);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, x = Math.sin(a) * (R_H - 0.5), z = Math.cos(a) * (R_H - 0.5); b.box(cream, 1.8, DRUM, 1.0, x, DRUM / 2, z, { ry: a, r: 0.14 }); b.box(gold, 2.4, 1.1, 1.3, x, DRUM - 0.6, z, { ry: a, r: 0.14 }); b.box(paint('#c8b48c', { roughness: 0.6 }), 2.4, 1.3, 1.3, x, 0.65, z, { ry: a, r: 0.1 }); }
  const rib = (pts, r, m, seg) => b.add(m, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 8));
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, pts = []; for (let k = 0; k <= 10; k++) { const e = (k / 10) * (Math.PI / 2) * 0.965, q = R_H - 0.05; pts.push(v3(Math.sin(a) * Math.cos(e) * q, DRUM + Math.sin(e) * q, Math.cos(a) * Math.cos(e) * q)); } rib(pts, i % 2 ? 0.17 : 0.3, brass, 24); }
  const hoop = (e, r, m) => { const q = (R_H - 0.05) * Math.cos(e), t = new THREE.TorusGeometry(q, r, 8, 96); t.rotateX(Math.PI / 2); b.add(m, t, 0, DRUM + Math.sin(e) * (R_H - 0.05), 0); }; for (let k = 0; k <= 7; k++) hoop((k / 7) * (Math.PI / 2) * 0.965, k === 0 ? 0.55 : 0.19, brass);
  b.done(g);
  const paneTex = canvasTex(2048, 1024, (x, W, H) => { x.clearRect(0, 0, W, H); const r = rng(88), cols = ['#ff7f9d', '#ffc857', '#7fe0c9', '#a48bff', '#7ec8ff']; for (let j = 0; j < 8; j++) { const y0 = (j / 8) * H, n = 48; for (let i = 0; i < n; i++) { const petal = (i + j) % 6 === 0 || (i - j + 48) % 6 === 0; x.fillStyle = petal ? cols[(i + j * 2) % cols.length] : (j > 5 ? '#d5f1ff' : '#c4ebff'); x.globalAlpha = petal ? 0.62 : 0.22 + r() * 0.08; x.fillRect((i / n) * W, y0, W / n, H / 8); } } x.globalAlpha = 1; });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R_H, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: paneTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: true })); dome.position.y = DRUM; dome.userData.noAO = true; dome.renderOrder = 2; g.add(dome);
  // a ring that runs out across the glass from where she strikes it
  const rM = new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), rGeo = new THREE.SphereGeometry(R_H - 0.32, 64, 4, 0, Math.PI * 2, 0, 1); const ringMesh = new THREE.Mesh(rGeo, rM); ringMesh.visible = false; ringMesh.position.y = DRUM; ringMesh.renderOrder = 3; ringMesh.userData.noAO = true; g.add(ringMesh);
  { const bm = new Batch(), cols = ['#c9344d', '#2a8a8e', '#e0a932']; for (let i = 0; i < 12; i++) { const a = ((i + 0.5) / 12) * Math.PI * 2 + 0.13, x = Math.sin(a) * (R_H - 1.5), z = Math.cos(a) * (R_H - 1.5), c = paint(cols[i % 3], { roughness: 0.8 }), stripe = paint('#f6e2ad', { roughness: 0.75 }); bm.box(c, 4.2, 13, 0.14, x, 12, z, { ry: a, r: 0.03 }); bm.box(stripe, 4.2, 0.5, 0.2, x, 15.6, z, { ry: a, r: 0.03 }); bm.box(stripe, 4.2, 0.5, 0.2, x, 7.0, z, { ry: a, r: 0.03 }); } bm.done(g); }
  const chs = []; for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i / 4) * Math.PI * 2, c = chandelier({ r: 4.4, drop: 9 }); c.position.set(Math.sin(a) * 23, 33, Math.cos(a) * 23); g.add(c); chs.push(c); }
  // the plinth and the Governor's dais
  { const pb = new Batch(), marble = paint('#f0e7d4', { roughness: 0.35 }), P = o.plinth || v3(0, 0, -6); for (const [r, y0, h] of [[7, 0, 1.3], [5.8, 1.3, 1.3], [4.8, 2.6, 1.4]]) pb.cyl(marble, r, r, h, P.x, y0 + h / 2, P.z, { seg: 48 }); const t = new THREE.TorusGeometry(4.8, 0.16, 8, 48); t.rotateX(Math.PI / 2); pb.add(gold, t, P.x, 4, P.z);
    const D = o.dais || v3(-11, 0, 1); pb.cyl(marble, 4.4, 4.4, 0.7, D.x, 0.35, D.z, { seg: 40 }); pb.cyl(paint('#b83148', { roughness: 0.75 }), 3.5, 3.5, 0.7, D.x, 1.05, D.z, { seg: 40 }); pb.done(g); g.userData.P = P; g.userData.D = D; }
  g.R = R_H; g.H = DRUM; g.chs = chs;
  g.glassY = (x, z) => DRUM + Math.sqrt(Math.max(0, (R_H - 0.4) * (R_H - 0.4) - x * x - z * z));
  g.ring = (t, hit, x, z) => { const d = t - hit; if (d < 0 || d > 1.4) { ringMesh.visible = false; return; } ringMesh.visible = true; const k = d / 1.4; rM.opacity = (1 - k) * 0.55; const yaw = Math.atan2(x, z), tilt = Math.asin(clamp(Math.hypot(x, z) / R_H, 0, 1)); ringMesh.rotation.set(tilt, yaw, 0, 'YXZ'); const span = 0.1 + k * 0.95; ringMesh.geometry.dispose(); ringMesh.geometry = new THREE.SphereGeometry(R_H - 0.32, 64, 2, 0, Math.PI * 2, Math.max(0, span - 0.05), 0.09); };
  return g;
}

// ---- the glass peacock ----
export function glassPeacock() {
  const g = new THREE.Group(), glass = new THREE.MeshStandardMaterial({ color: '#47c7ef', roughness: 0.07, metalness: 0.35, transparent: true, opacity: 0.86, emissive: '#1f7aa0', emissiveIntensity: 0.38 }), bodyG = new THREE.Group(); g.add(bodyG);
  const b = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), glass); b.scale.set(2.2, 3.1, 2.7); b.position.set(0, 5.6, 0.2); bodyG.add(b);
  const nc = new THREE.CatmullRomCurve3([v3(0, 7.5, 1.2), v3(0, 9.8, 1.9), v3(0, 11.6, 2.5), v3(0, 12.8, 3.05)]), n = new THREE.Mesh(new THREE.TubeGeometry(nc, 22, 0.86, 16), glass); bodyG.add(n);
  const h = new THREE.Mesh(new THREE.SphereGeometry(1.08, 24, 18), glass); h.position.set(0, 13.0, 3.3); bodyG.add(h);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.5, 12), new THREE.MeshStandardMaterial({ color: '#f0c548', metalness: 0.5, roughness: 0.3 })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 12.9, 4.8); bodyG.add(beak);
  const eye = new THREE.SphereGeometry(0.2, 12, 10), dk = paint('#14243a', { roughness: 0.2 }); for (const s of [-1, 1]) { const e = new THREE.Mesh(eye, dk); e.position.set(s * 0.92, 13.25, 3.95); bodyG.add(e); }
  for (let i = -2; i <= 2; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 8), glass), bl = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshStandardMaterial({ color: '#ffd24a', metalness: 0.4, roughness: 0.2 })); st.position.set(i * 0.34, 14.7, 3.1 - Math.abs(i) * 0.1); st.rotation.z = -i * 0.16; bl.position.set(i * 0.5, 15.5, 3.1 - Math.abs(i) * 0.1); bodyG.add(st, bl); }
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 2.9, 12), glass); l.position.set(s * 1.1, 1.55, 0.2); bodyG.add(l); const f = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.36, 2.4), glass); f.position.set(s * 1.1, 0.2, 0.7); bodyG.add(f); }
  const tex = canvasTex(256, 768, (x, W, H) => { x.clearRect(0, 0, W, H); const gr = x.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, '#2da6d8'); gr.addColorStop(0.6, '#35d4a8'); gr.addColorStop(1, '#67e9c8'); x.fillStyle = gr; x.beginPath(); x.ellipse(W / 2, H / 2, W * 0.46, H * 0.48, 0, 0, 7); x.fill(); const ey = H * 0.2; for (const [r, c] of [[88, '#f4c84e'], [62, '#ff5f88'], [38, '#1c4bc8'], [16, '#06102e']]) { x.fillStyle = c; x.beginPath(); x.ellipse(W / 2, ey, r, r * 1.3, 0, 0, 7); x.fill(); } x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 3; x.beginPath(); x.moveTo(W / 2, H); x.lineTo(W / 2, ey + 90); x.stroke(); });
  const fM = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.12, metalness: 0.3, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.26 }), fG = new THREE.PlaneGeometry(4.4, 13.5); fG.translate(0, 6.75, 0);
  const R = rng(61), fs = [], N = 33, base = v3(0, 5.2, -1.7); for (let i = 0; i < N; i++) { const a = ((i / (N - 1)) - 0.5) * 2.95, m = new THREE.Mesh(fG, fM), z = -0.05 * (i % 3); m.position.copy(base).add(v3(0, 0, z - 0.2)); m.rotation.z = -a; m.castShadow = false; g.add(m); fs.push({ m, a, p0: m.position.clone(), v: v3((R() - 0.5) * 22 - Math.sin(a) * 3, 8 + R() * 11, -2 - R() * 8), sp: v3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(11) }); }
  const dr = new THREE.Mesh(new THREE.ConeGeometry(11.5, 25, 32, 1), new THREE.MeshStandardMaterial({ color: '#b52b43', roughness: 0.82, side: THREE.DoubleSide })); { const P = dr.geometry.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); const k = 1 + Math.sin(a * 13) * 0.05; P.setX(i, Math.cos(a) * r * k); P.setZ(i, Math.sin(a) * r * k); } dr.geometry.computeVertexNormals(); } dr.geometry.translate(0, 12.5, 0); dr.castShadow = true; g.add(dr);
  g.drape = (k) => { dr.visible = k < 0.98; dr.scale.y = Math.max(0.02, 1 - k); dr.position.y = -k * 0.2; };
  const G = 26, RES = 3.9; g.set = (t, hit) => { const d = t - hit; bodyG.visible = d < 0; for (const f of fs) { if (d < 0) { f.m.position.copy(f.p0); f.m.rotation.set(0, 0, -f.a); f.m.scale.setScalar(1); continue; } const vy = f.v.y, wy = g.position.y + f.p0.y, land = (vy + Math.sqrt(vy * vy + 2 * G * (wy + 0.05))) / G, u = Math.min(d, land); f.m.position.copy(f.p0).addScaledVector(f.v, u); f.m.position.y -= 0.5 * G * u * u; f.m.scale.setScalar(lerp(1, 0.42, clamp(d / 0.5))); if (d < land) f.m.rotation.set(f.sp.x * d, f.sp.y * d, -f.a + f.sp.z * d); else f.m.rotation.set(-Math.PI / 2, 0, f.sp.y * 3); if (d >= land) f.m.position.y = -g.position.y + 0.1 + (f.sp.z * 0.002); } }; g.RES = RES;
  return g;
}

// ---- rooms ----
export function plainRoom(o = {}) {
  const w = o.w ?? 34, d = o.d ?? 26, h = o.h ?? 16, g = new THREE.Group(), b = new Batch(), wallM = o.wallMat || new THREE.MeshStandardMaterial({ color: o.wall || '#ffe9c9', roughness: 0.75 }), trim = paint(o.trim || '#fff8ec', { roughness: 0.5 }), fl = o.floorMat || surf('plank', o.floor || '#b88a55');
  g.add(flat(fl, w, d, 0, 0, 0)); for (const [x, y, z, ww, hh, ry] of [[0, h / 2, -d / 2, w, h, 0], [-w / 2, h / 2, 0, d, h, Math.PI / 2], [w / 2, h / 2, 0, d, h, -Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), wallM); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; g.add(m); }
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: o.ceil || '#fffaf0', roughness: 0.8 })); m.rotation.x = Math.PI / 2; m.position.set(0, h, 0); m.receiveShadow = true; g.add(m); }
  b.box(trim, w, 1.1, 0.34, 0, 0.55, -d / 2 + 0.17, { r: 0.05 }); b.box(trim, w, 0.5, 0.3, 0, h - 0.25, -d / 2 + 0.15, { r: 0.05 }); for (const s of [-1, 1]) b.box(trim, 0.34, 1.1, d, s * (w / 2 - 0.17), 0.55, 0, { r: 0.05 });
  const wx = o.winX ?? 7, wy = o.winY ?? 7.6, ww = o.winW ?? 8, wh = o.winH ?? 6.4; b.box(trim, ww + 0.8, wh + 0.8, 0.3, wx, wy, -d / 2 + 0.15, { r: 0.05 }); b.done(g);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (x, W, H) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#8ccbff'); gr.addColorStop(1, '#e8f8ff'); x.fillStyle = gr; x.fillRect(0, 0, W, H); x.fillStyle = '#7fc76a'; x.fillRect(0, H * 0.74, W, H * 0.26); }) })); pane.position.set(wx, wy, -d / 2 + 0.34); g.add(pane);
  { const b2 = new Batch(); b2.box(trim, 0.22, wh, 0.1, wx, wy, -d / 2 + 0.42, { r: 0.02 }); b2.box(trim, ww, 0.22, 0.1, wx, wy, -d / 2 + 0.42, { r: 0.02 }); const cu = paint(o.curtain || '#ef8ea3', { roughness: 0.8 }); for (const s of [-1, 1]) b2.box(cu, 1.5, wh + 1.2, 0.3, wx + s * (ww / 2 + 0.4), wy - 0.2, -d / 2 + 0.5, { r: 0.1 }); b2.box(BRASS(), ww + 4.2, 0.2, 0.2, wx, wy + wh / 2 + 0.9, -d / 2 + 0.55, { r: 0.05 }); b2.done(g); }
  g.size = { w, d, h }; return g;
}
export function auntSet() {
  const g = plainRoom({ w: 34, d: 26, h: 16, wall: '#d7ecd4', curtain: '#f2c14e', floor: '#c99a66', winX: -8 }), b = new Batch(), wood = surf('plank', '#a86f3f'), top = paint('#fff5e3', { roughness: 0.35 });
  b.box(wood, 16, 3.3, 5.4, 2, 1.65, -2, { r: 0.12 }); b.box(top, 16.8, 0.32, 6.2, 2, 3.45, -2, { r: 0.08 }); b.box(paint('#3f6d84', { metalness: 0.4, roughness: 0.42 }), 3.8, 2.8, 3.8, 4.4, 5.05, -2.4, { r: 0.42 }); b.done(g);
  const soupC = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32), new THREE.MeshStandardMaterial({ color: '#8a9c2c', roughness: 0.3 })); soupC.rotation.x = -Math.PI / 2; soupC.position.set(4.4, 6.5, -2.4); g.add(soupC);
  const r = rng(5), lumps = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: '#c6b24a', roughness: 0.5 }), 12), M = new THREE.Matrix4(); for (let i = 0; i < 12; i++) { const a = r() * 6.28, q = 0.3 + r() * 1.2; M.makeTranslation(4.4 + Math.cos(a) * q, 6.55, -2.4 + Math.sin(a) * q); lumps.setMatrixAt(i, M); } g.add(lumps);
  g.bowl = () => { const q = new THREE.Group(), bb = new Batch(); bb.cyl(paint('#fff8ec', { roughness: 0.35 }), 0.95, 0.6, 0.72, 0, 0, 0, { seg: 24 }); bb.done(q); const s = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), new THREE.MeshStandardMaterial({ color: '#8a9c2c', roughness: 0.3 })); s.rotation.x = -Math.PI / 2; s.position.y = 0.36; q.add(s); return q; };
  g.top = 3.61; return g;
}
export function cerealBox() { const b = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.5, 0.66), [paint('#e83f3a'), paint('#e83f3a'), paint('#ffd24a'), paint('#ffd24a'), new THREE.MeshStandardMaterial({ map: canvasTex(256, 384, (x, W, H) => { x.fillStyle = '#e83f3a'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffd24a'; x.textAlign = 'center'; x.font = '900 60px ITTInter, sans-serif'; x.fillText('HONEY', W / 2, 90); x.fillText('HOOPS', W / 2, 155); for (let i = 0; i < 14; i++) { x.strokeStyle = '#ffcf48'; x.lineWidth = 13; x.beginPath(); x.arc(40 + (i * 53) % 190, 215 + ((i * 41) % 130), 18, 0, 7); x.stroke(); } }), roughness: 0.55 }), paint('#e83f3a')]); b.castShadow = true; return b; }
export function kitchenSet() {
  const g = plainRoom({ w: 34, d: 26, h: 16, wall: '#ffe2a8', curtain: '#61b6d6', floor: '#b98d60', winX: 8 }), b = new Batch(), wood = surf('plank', '#b57f49');
  b.box(wood, 11, 0.42, 6.4, -3, 3.3, 1, { r: 0.1 }); for (const [x, z] of [[-8, -1.6], [2, -1.6], [-8, 3.6], [2, 3.6]]) b.box(wood, 0.6, 3.1, 0.6, x, 1.55, z, { r: 0.08 });
  b.box(paint('#f8f2e7', { roughness: 0.5 }), 12, 3.2, 3, 8.5, 1.6, -11, { r: 0.1 }); b.box(paint('#fffaf0', { roughness: 0.35 }), 12.5, 0.26, 3.4, 8.5, 3.3, -11, { r: 0.06 }); for (let i = 0; i < 3; i++) b.box(paint('#5aa6c4', { roughness: 0.45 }), 3.4, 2.4, 0.15, 4.6 + i * 3.9, 1.7, -9.45, { r: 0.05 });
  b.done(g);
  const milk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.8, 16), paint('#ffffff', { roughness: 0.35 })); milk.position.set(-7, 4.5, 2.8); milk.castShadow = true; g.add(milk);
  const bwl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.52, 0.62, 20), paint('#61b6d6', { roughness: 0.35 })); bwl.position.set(-1.0, 3.82, 2.8); bwl.castShadow = true; g.add(bwl);
  g.top = 3.51; return g;
}

// ---- the courtroom and its net ----
export function courtroom() {
  const g = plainRoom({ w: 40, d: 30, h: 26, wall: '#efe0c8', winX: 12, winW: 7, winH: 12, winY: 13, curtain: '#a92e3e', floor: '#8f5f35' }), b = new Batch(), wood = surf('plank', '#7f4d27'), red = paint('#ae3244', { roughness: 0.75 });
  b.box(wood, 22, 6, 4, 0, 3, -10, { r: 0.12 }); b.box(wood, 23.4, 0.5, 5, 0, 6.2, -10, { r: 0.1 }); b.box(red, 20, 2.5, 0.2, 0, 3.7, -7.92, { r: 0.04 });
  b.box(wood, 6, 11, 1.2, 0, 12, -14, { r: 0.1 }); for (let i = 0; i < 3; i++) { b.box(wood, 30, 2.6, 0.5, 0, 1.6, 2 + i * 6, { r: 0.08 }); b.box(wood, 30, 0.5, 2.8, 0, 1.3, 3.2 + i * 6, { r: 0.08 }); } b.done(g);
  const blobs = []; g.bulge = (list) => { blobs.push(...list); };
  g.netAt = (x, z) => { let y = 19.5; for (const [bx, bz, k = 3.2] of blobs) y += k * Math.exp(-((x - bx) * (x - bx) + (z - bz) * (z - bz)) / 13); return y; };
  const tex = canvasTex(512, 512, (x, W) => { x.clearRect(0, 0, W, W); x.strokeStyle = '#7a5a2c'; x.lineWidth = 11; for (let i = 0; i <= 8; i++) { const p = (i / 8) * W; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, W); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(W, p); x.stroke(); } }); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 4);
  const geo = new THREE.PlaneGeometry(38, 28, 90, 66); geo.rotateX(-Math.PI / 2); const net = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.4, transparent: true, side: THREE.DoubleSide, roughness: 0.8 })); net.userData.noAO = true; net.castShadow = false; g.add(net);
  g.shapeNet = () => { const P = geo.attributes.position; for (let i = 0; i < P.count; i++) P.setY(i, g.netAt(P.getX(i), P.getZ(i))); P.needsUpdate = true; geo.computeVertexNormals(); };
  return g;
}

// ---- Plumbwick: the street (along x, z 0), shop signs, bunting, and the roof at x 0, z -20 ----
const PAST = ['#f4a7b9', '#ffd77f', '#9fe2c7', '#a8cdf8', '#ffb98a', '#d5b8f5', '#f7e39a'];
export function plumbwick() {
  const g = new THREE.Group(), road = surf('cobble', '#c9bfb0'), walk = surf('tile', '#efe6d5'), grass = surf('grass', '#74c95a'); grass.userData.span = 16;
  g.add(flat(grass, 1200, 1200, 0, -0.04, 0)); g.add(flat(road, 360, 30, 0, 0, 0));
  for (const s of [-1, 1]) g.add(flat(walk, 360, 6, 0, 0.12, s * 18));
  const names = ['BOOTS', 'ANCHORS & SONS', 'HONEST BREAD', 'TETHERS', 'IRON & CO', 'WEIGHTS', 'TRUE TEA', 'SOUP'];
  const mk = (x, z, ry, i) => { const fl = 3 + (i % 2), b = building({ seed: 50 + i, floors: fl, wall: PAST[i % PAST.length], style: 'stucco', trim: '#fffaf0', w: 26, d: 18, floorH: 6.8, lit: 0.12 }); b.position.set(x, 0, z); b.rotation.y = ry; g.add(b); const si = sign(names[i % names.length], { w: 16, h: 2.5, bg: PAST[(i + 3) % PAST.length], fg: '#3a2b1e', edge: '#fffaf0', frame: '#6a4a2e' }); si.position.set(x, 8.4, z + Math.cos(ry) * 9.3); si.rotation.y = ry; g.add(si); };
  let k = 0; for (let x = -130; x <= 130; x += 26) { mk(x, -30, 0, k + 1); k++; mk(x, 30, Math.PI, k + 3); }
  for (let x = -120; x <= 120; x += 30) for (const s of [-1, 1]) { const l = lamp({}); l.position.set(x + s * 7, 0.12, s * 16.4); g.add(l); }
  { const b = new Batch(), m = ['#e34b5f', '#ffc53d', '#3fb3b0', '#7f6bd8'].map((c) => paint(c, { roughness: 0.8, side: THREE.DoubleSide })), cord = paint('#f2ead9', { roughness: 0.8 }); for (const X of [-70, -20, 42, 88]) { b.box(cord, 0.09, 0.09, 60, X, 19.2, 0, { r: 0.02 }); for (let i = 0; i < 31; i++) { const z = -29 + i * 1.94, sag = 0.1, tri = new THREE.ConeGeometry(0.72, 1.5, 3); tri.rotateX(0); tri.rotateZ(Math.PI); b.add(m[i % 4], tri, X, 18.3 - sag, z); } } b.done(g); }
  // the roof terrace on the building at x 0, z -20 (three floors): RY is its floor
  const RY = 29.0, b = new Batch(), deck = surf('plank', '#bf9662'), pa = paint('#f6e7cf', { roughness: 0.65 }); b.box(deck, 25, 0.5, 17, 0, RY - 0.25, -30, { r: 0.05 });
  for (const [w, d, x, z] of [[25.6, 0.8, 0, -21.2], [25.6, 0.8, 0, -38.8], [0.8, 17.6, -12.8, -30], [0.8, 17.6, 12.8, -30]]) b.box(pa, w, 2.3, d, x, RY + 1.15, z, { r: 0.1 });
  b.box(surf('brick', '#b4593f'), 2.6, 6, 2.6, -8, RY + 3, -35, { r: 0.1 }); b.box(paint('#6e4c34', { roughness: 0.8 }), 3.2, 0.5, 3.2, -8, RY + 6.1, -35, { r: 0.1 });
  b.box(surf('plank', '#996a3d'), 5.2, 2.4, 3.4, 2, RY + 1.2, -28, { r: 0.08 });
  b.done(g); g.RY = RY; g.seat = v3(2, RY + 2.4, -28);
  const b3 = new Batch(); b3.box(paint('#6e8cae', { roughness: 0.4 }), 1.2, 1.5, 1.2, -4, RY + 0.75, -24, { r: 0.1 }); b3.done(g); flowers(g, [v3(-4, RY + 1.6, -24), v3(-3.8, RY + 1.5, -23.7), v3(-4.3, RY + 1.6, -24.3)], {});
  return g;
}
export function brookYard() {
  const g = new THREE.Group(), grass = surf('grass', '#74c95a'); grass.userData.span = 16; g.add(flat(grass, 800, 800, 0, -0.04, 0));
  const b = new Batch(); picket(b, -40, 40, 0, { h: 3.6 }); b.done(g); g.FH = 3.6;
  const c = cottage({ wall: '#f4c3a0', trim: '#fff8ec', roof: '#c75f53', door: '#3f8f93', shutter: '#3f8f93', seed: 22, w: 24, d: 16, flowers: true, number: 4 }); c.g.position.set(4, 0, -30); g.add(c.g);
  const w = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: '#3f9fd9', roughness: 0.55, metalness: 0.05 })); w.rotation.x = -Math.PI / 2; w.position.set(10, 0.05, 46); w.receiveShadow = true; g.add(w);
  const sm = treeShape ? null : null; const tr = new Batch(), bark = paint('#7b5430', { roughness: 0.9 }), leaf = paint('#59b64f', { roughness: 0.85 }); for (const [x, z, h] of [[-26, -12, 16], [-34, 8, 20], [36, 9, 18], [26, -18, 15]]) { tr.cyl(bark, 0.9, 1.3, h, x, h / 2, z, { seg: 10 }); for (const [dx, dy, r] of [[0, h + 1, 7], [3, h - 2, 5], [-3, h - 2, 5]]) { const s = new THREE.IcosahedronGeometry(r, 2); tr.add(leaf, s, x + dx, dy, z); } } tr.done(g);
  return g;
}
