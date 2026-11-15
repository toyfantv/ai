// The City Where It's Always Noon (Flower Man remake 10): Sunmere, where the sun has hung at noon for four hundred years, everyone
// sleeps in a mask, and nobody goes near the Rim, the white wall around the city. The city is a ship and the sun is a lamp.
//   sunmere()        the city set (centre at the origin): a paved plaza, pastel buildings and cottages, the clock tower stuck at noon
//                    (.tower, .bell), the party lawn, Grandpa's cottage, the Rim (RIM radius, a ring of white panels; the panel at -z
//                    has the round hatch: .hatch with .open(k)), the hedge in front of it and the bushes the clock lands in
//   bedroom()        Grandpa's bedroom at noon: snRoom + bed (.bed, .bedTop), quilt (.quilt), nightstand (.stand), sun shaft
//   shipModel()      the ship seen from space: a long white hull, the Rim ring and a glass dome over a tiny city, the lamp-sun on a
//                    chain (.lamp, .lampLight, .setLamp(k)), engines (.engines glow), the hatch light (.hatchDot)
//   planet(r)        a small green world with cloud bands and an atmosphere glow
//   fullStars(o)     a whole sphere of stars that follows the camera (.follow(cam), .set(t))
//   balloon(col), alarmClock(), brassKey(), wearMask(c, col) (.set(k): 0 on the forehead, 1 over the eyes), hedge(), bush()
import * as THREE from 'three';
import { v3, rng, clamp, lerp } from './core.js';
import { Batch, surf, paint, building, lamp, sign } from './kit.js';
import { canvasTex, glowSprite } from './props.js';
import { cottage, picket, flowers } from './pastel.js';
import { snRoom } from './shufflenight.js';
import { bed } from './home.js';

const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh && !(o.material && o.material.transparent)) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } }); return g; };
export const RIM = 150;               // the Rim's inner radius
export const HATCH = v3(0, 3.4, -RIM); // the hatch centre (the Rim panel facing +z)
export const HATCH_R = 2.3;

function flat(mat, w, d, x, y, z) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, uv = g.attributes.uv, sp = mat.userData.span || 8;
  for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + x) / sp, (P.getZ(i) + z) / sp);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; return m;
}

// ---------------- the Rim ----------------
let RIMTEX = null;
function rimMat() {
  if (RIMTEX) return RIMTEX;
  const tex = canvasTex(512, 512, (x, W, H) => {
    x.fillStyle = '#f4f2ec'; x.fillRect(0, 0, W, H);
    const r = rng(7); for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(200,195,185,${0.04 + r() * 0.06})`; x.fillRect(r() * W, r() * H, 4 + r() * 30, 2 + r() * 8); }
    x.strokeStyle = 'rgba(150,150,155,0.55)'; x.lineWidth = 3; x.strokeRect(2, 2, W - 4, H - 4);
    x.strokeStyle = 'rgba(150,150,155,0.3)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke();
    x.fillStyle = 'rgba(130,130,140,0.55)'; for (const [cx, cy] of [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14], [W / 2, 14], [W / 2, H - 14]]) { x.beginPath(); x.arc(cx, cy, 4, 0, 7); x.fill(); }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  RIMTEX = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.05 });
  RIMTEX.userData.span = 9;
  return RIMTEX;
}
function uvWorld(g, span) { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / span, p.getY(i) / span); return g; }
// one Rim panel: inner face at z = 0 facing +z, outer at -T; o.hole cuts the round hatch
function rimPanel(w, h, o = {}) {
  const T = 1.6, s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  if (o.hole) { const hp = new THREE.Path(); hp.absarc(0, HATCH.y, HATCH_R, 0, Math.PI * 2, true); s.holes.push(hp); }
  const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 40 }); g.translate(0, 0, -T);
  uvWorld(g, 9);
  const m = new THREE.Mesh(g, [rimMat(), paint('#3b4048', { metalness: 0.6, roughness: 0.5 })]);
  // the extrude's side groups: 0 = caps (inner and outer), 1 = sides; give the outer cap the hull colour by a second mesh behind it
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function rimWall(o = {}) {
  const g = new THREE.Group(), N = o.n ?? 72, H = o.h ?? 80, w = 2 * RIM * Math.tan(Math.PI / N) + 0.05;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;   // a = 0 at -z
    const p = rimPanel(w, H, { hole: i === 0 }); p.position.set(Math.sin(a) * RIM, 0, -Math.cos(a) * RIM); p.rotation.y = -a; g.add(p);
  }
  const det = new THREE.Group(); det.position.set(0, 0, -RIM); g.add(det); g.det = det;   // hatch details, in the hatch panel's frame
  // a dark hull skin just outside the hatch panel (seen from outside the hatch)
  { const s = new THREE.Shape(); s.moveTo(-40, -10); s.lineTo(40, -10); s.lineTo(40, 40); s.lineTo(-40, 40); const hp = new THREE.Path(); hp.absarc(0, HATCH.y, HATCH_R, 0, Math.PI * 2, true); s.holes.push(hp);
    const sk = new THREE.Mesh(new THREE.ShapeGeometry(s, 48), new THREE.MeshStandardMaterial({ color: '#4a525e', roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide }));
    sk.position.set(0, 0, -1.65); det.add(sk); g.skin = sk;
    const rv = new Batch(), rm = paint('#7a8492', { metalness: 0.8, roughness: 0.35 });
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; rv.cyl(rm, 0.1, 0.1, 0.12, Math.cos(a) * (HATCH_R + 0.55), HATCH.y + Math.sin(a) * (HATCH_R + 0.55), -1.7, { rx: Math.PI / 2, seg: 8 }); }
    rv.add(rm, new THREE.TorusGeometry(HATCH_R + 0.25, 0.2, 10, 48), 0, HATCH.y, -1.7); rv.done(det);
  }
  const ring = new Batch(), steel = paint('#5fb8a8', { metalness: 0.55, roughness: 0.35 }), brass = paint('#d6a94a', { metalness: 0.9, roughness: 0.28 });
  ring.add(steel, new THREE.TorusGeometry(HATCH_R + 0.2, 0.3, 12, 56), 0, HATCH.y, 0.15);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ring.cyl(brass, 0.09, 0.09, 0.2, Math.cos(a) * (HATCH_R + 0.2), HATCH.y + Math.sin(a) * (HATCH_R + 0.2), 0.42, { rx: Math.PI / 2, seg: 8 }); }
  ring.box(paint('#4a5058', { roughness: 0.6 }), 3.2, 0.4, 1.0, 0, HATCH.y - HATCH_R - 0.55, 0.45, { r: 0.08 });
  ring.done(det);
  const door = new THREE.Group(); door.position.set(-HATCH_R - 0.15, HATCH.y, 0.2); det.add(door);   // hinge on the left (-x)
  { const b = new Batch(); b.cyl(steel, HATCH_R + 0.05, HATCH_R + 0.05, 0.35, HATCH_R + 0.15, 0, 0.1, { rx: Math.PI / 2, seg: 48 });
    b.add(paint('#4f9e90', { metalness: 0.55, roughness: 0.4 }), new THREE.TorusGeometry(HATCH_R - 0.45, 0.12, 8, 40), HATCH_R + 0.15, 0, 0.3);
    b.add(brass, new THREE.TorusGeometry(0.75, 0.09, 8, 28), HATCH_R + 0.15, 0, 0.5); for (let i = 0; i < 3; i++) b.box(brass, 1.5, 0.12, 0.1, HATCH_R + 0.15, 0, 0.5, { rz: (i / 3) * Math.PI, r: 0.03 });
    b.cyl(brass, 0.18, 0.18, 0.3, HATCH_R + 0.15, 0, 0.45, { rx: Math.PI / 2, seg: 12 });
    b.cyl(brass, 0.32, 0.32, 0.1, HATCH_R + 0.15 + 1.1, -1.05, 0.33, { rx: Math.PI / 2, seg: 20 });
    b.done(door);
    const kh = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), paint('#111111')); kh.position.set(HATCH_R + 0.15 + 1.1, -1.0, 0.39); door.add(kh);
    const ks = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.2), paint('#111111')); ks.position.set(HATCH_R + 0.15 + 1.1, -1.12, 0.39); door.add(ks);
    door.keyhole = v3(HATCH_R + 0.15 + 1.1, -1.05, 0.42);
  }
  g.door = door;
  g.keyholeWorld = () => { door.updateMatrixWorld(true); return door.localToWorld(door.keyhole.clone()); };
  g.open = (k) => { door.position.x = -HATCH_R - 0.15 - (2 * HATCH_R + 0.7) * clamp(k); };   // the hatch slides aside along the wall
  const warn = sign('CREW ONLY', { w: 7, h: 1.5, bg: '#ffd23f', fg: '#1d2233', edge: '#1d2233', frame: '#3b4048' }); warn.position.set(0, HATCH.y + HATCH_R + 1.4, 0.2); det.add(warn); g.warn = warn;
  shadowAll(g);
  return g;
}

// ---------------- props ----------------
export function hedge(len = 18, h = 3.6, seed = 3) {
  const b = new Batch(), r = rng(seed), m = paint('#3f8a3c', { roughness: 0.9 }), m2 = paint('#4fa046', { roughness: 0.9 });
  b.box(m, len, h, 2.2, 0, h / 2, 0, { r: 0.7 });
  for (let i = 0; i < len * 2.2; i++) b.add(r() < 0.5 ? m : m2, new THREE.SphereGeometry(0.55 + r() * 0.4, 8, 6), (r() - 0.5) * len, 0.6 + r() * (h - 0.6), (r() - 0.5) * 2.4);
  return shadowAll(b.done());
}
export function bush(seed = 5, s = 1) { const b = new Batch(), r = rng(seed); for (let i = 0; i < 9; i++) b.add(paint(r() < 0.5 ? '#3f8a3c' : '#5aa84a', { roughness: 0.9 }), new THREE.SphereGeometry((0.9 + r() * 0.8) * s, 10, 8), (r() - 0.5) * 3 * s, (0.8 + r() * 1.2) * s, (r() - 0.5) * 3 * s); return shadowAll(b.done()); }
export function balloon(col = '#ff4f6a') {
  const g = new THREE.Group(), b = new Batch(), m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.18, metalness: 0.05 });
  b.add(m, new THREE.SphereGeometry(0.75, 20, 16).scale(1, 1.18, 1), 0, 0, 0); b.add(m, new THREE.ConeGeometry(0.14, 0.24, 10), 0, -0.92, 0, 0, Math.PI, 0); b.done(g);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 3.2, 4), paint('#ffffff')); str.position.y = -2.65; g.add(str); g.str = str;
  shadowAll(g); return g;
}
export function alarmClock() {
  const g = new THREE.Group(), b = new Batch(), red = paint('#e8433a', { roughness: 0.3, metalness: 0.3 }), brass = paint('#d6a94a', { metalness: 0.9, roughness: 0.3 });
  b.cyl(red, 0.55, 0.55, 0.36, 0, 0.65, 0, { rx: Math.PI / 2, seg: 24 });
  for (const s of [-1, 1]) { b.add(brass, new THREE.SphereGeometry(0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), s * 0.34, 1.12, 0, 0, 0, -s * 0.5); b.cyl(brass, 0.04, 0.04, 0.4, s * 0.32, 0.18, 0, { rz: s * 0.4, seg: 6 }); }
  b.cyl(brass, 0.04, 0.04, 0.26, 0, 1.25, 0, { seg: 6 }); b.done(g);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.46, 24), new THREE.MeshStandardMaterial({ roughness: 0.4, map: canvasTex(128, 128, (x, W, H) => { x.fillStyle = '#fffaf0'; x.fillRect(0, 0, W, H); x.strokeStyle = '#222'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(64, 64); x.lineTo(64, 22); x.moveTo(64, 64); x.lineTo(64, 30); x.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.fillStyle = '#222'; x.fillRect(64 + Math.sin(a) * 52 - 3, 64 - Math.cos(a) * 52 - 3, 6, 6); } }) }));
  face.position.set(0, 0.65, 0.19); g.add(face);
  return shadowAll(g);
}
export function brassKey() {
  const g = new THREE.Group(), b = new Batch(), brass = paint('#d9a842', { metalness: 0.92, roughness: 0.26 });
  b.add(brass, new THREE.TorusGeometry(0.2, 0.055, 8, 20), 0, 0.28, 0); b.cyl(brass, 0.045, 0.045, 0.62, 0, -0.18, 0, { seg: 8 });
  b.box(brass, 0.16, 0.08, 0.05, 0.08, -0.38, 0, { r: 0.01 }); b.box(brass, 0.12, 0.07, 0.05, 0.06, -0.24, 0, { r: 0.01 }); b.done(g);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.21), new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.35, map: canvasTex(256, 120, (x, W, H) => { x.fillStyle = '#c8962e'; x.fillRect(0, 0, W, H); x.fillStyle = '#5a3a10'; x.font = '900 86px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('HELM', W / 2, H / 2 + 4); }) }));
  tag.position.set(0, -0.02, 0.07); g.add(tag);
  return shadowAll(g);
}
// a sleep mask: a padded band over the head; .set(k) 0 = pushed up on the forehead, 1 = over the eyes
const headBox = (c) => { const r = c.root.rotation.clone(), p = c.root.position.clone(), s = c.root.scale.clone(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.scale.setScalar(1); c.root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(c.head.matrixWorld).invert(), bx = new THREE.Box3(), tmp = new THREE.Box3(); c.head.traverse((k) => { if (k.isMesh && !k.userData.worn) { k.geometry.computeBoundingBox(); tmp.copy(k.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld)); bx.union(tmp); } }); c.root.rotation.copy(r); c.root.position.copy(p); c.root.scale.copy(s); c.root.updateMatrixWorld(true); return bx; };
export function wearMask(c, col = '#2b2f6a', o = {}) {
  const B = headBox(c), g = new THREE.Group(), b = new Batch(), m = paint(col, { roughness: 0.85 }), w = B.max.x - B.min.x, d = B.max.z - B.min.z, hh = B.max.y - B.min.y;
  const fw = (o.faceW ?? 0.9) * w;
  b.box(m, fw, hh * 0.24, 0.24, 0, 0, 0, { r: 0.1 });   // the eye pad
  b.box(paint('#1d1f3a', { roughness: 0.9 }), w * 1.04, hh * 0.08, d * 1.02, 0, 0, -d / 2 + 0.05, { r: 0.04 });   // the strap
  b.add(paint('#ffd23f', { roughness: 0.6 }), new THREE.SphereGeometry(0.07, 6, 6).scale(1, 1, 0.4), -fw * 0.2, hh * 0.04, 0.13);
  b.add(paint('#ffd23f', { roughness: 0.6 }), new THREE.SphereGeometry(0.06, 6, 6).scale(1, 1, 0.4), fw * 0.25, -hh * 0.03, 0.13);
  b.done(g); g.traverse((k) => { if (k.isMesh) { k.userData.worn = true; k.castShadow = true; } });
  const yEyes = B.min.y + hh * (o.eyeY ?? 0.56), yUp = B.min.y + hh * (o.upY ?? 0.86), z = B.max.z + 0.04;
  g.set = (k) => { g.position.set((B.min.x + B.max.x) / 2, lerp(yUp, yEyes, k), z + 0.02 * (1 - k)); g.rotation.x = -0.25 * (1 - k); };
  g.set(1); c.head.add(g); return g;
}

// ---------------- the clock tower ----------------
function clockFace() {
  return canvasTex(512, 512, (x, W, H) => {
    x.fillStyle = '#fff8e6'; x.beginPath(); x.arc(W / 2, H / 2, W / 2 - 6, 0, 7); x.fill();
    x.strokeStyle = '#2b2f3a'; x.lineWidth = 14; x.stroke();
    x.fillStyle = '#2b2f3a'; x.font = '900 60px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; x.fillText(String(i), W / 2 + Math.sin(a) * 196, H / 2 - Math.cos(a) * 196); }
    x.lineCap = 'round'; x.lineWidth = 22; x.beginPath(); x.moveTo(W / 2, H / 2); x.lineTo(W / 2, H / 2 - 120); x.stroke();
    x.lineWidth = 12; x.beginPath(); x.moveTo(W / 2, H / 2); x.lineTo(W / 2, H / 2 - 170); x.stroke();
    x.fillStyle = '#d6a94a'; x.beginPath(); x.arc(W / 2, H / 2, 18, 0, 7); x.fill();
  });
}
export function clockTower() {
  const g = new THREE.Group(), b = new Batch(), wall = surf('brick', '#d98a6a'), trim = paint('#fff4e0', { roughness: 0.5 }), roof = surf('shingle', '#3f6aa8');
  b.box(wall, 8, 34, 8, 0, 17, 0, { r: 0.1 }); b.box(trim, 9, 0.8, 9, 0, 22, 0, { r: 0.1 }); b.box(trim, 9.4, 1, 9.4, 0, 34.2, 0, { r: 0.12 });
  // belfry: four posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(trim, 1, 6, 1, sx * 3.5, 37.5, sz * 3.5, { r: 0.08 });
  b.box(trim, 9, 0.8, 9, 0, 40.8, 0, { r: 0.1 });
  b.add(roof, new THREE.ConeGeometry(6.8, 8, 4), 0, 45.2, 0, Math.PI / 4);
  b.box(paint('#5a2e2a', { roughness: 0.45 }), 3, 5, 0.3, 0, 2.5, 4.05, { r: 0.05 });
  b.done(g);
  const bell = new THREE.Group(); bell.position.set(0, 40, 0); g.add(bell);
  { const bb = new Batch(); bb.add(paint('#d6a94a', { metalness: 0.92, roughness: 0.28 }), new THREE.CylinderGeometry(0.9, 2.0, 3, 24, 1, true), 0, -1.8, 0); bb.add(paint('#d6a94a', { metalness: 0.92, roughness: 0.28 }), new THREE.SphereGeometry(0.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, -0.3, 0); bb.done(bell); bell.children.forEach((m) => { m.material.side = THREE.DoubleSide; }); }
  g.bell = bell;
  for (const [ry, x, z] of [[0, 0, 4.06], [Math.PI / 2, 4.06, 0], [Math.PI, 0, -4.06], [-Math.PI / 2, -4.06, 0]]) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshStandardMaterial({ map: clockFace(), roughness: 0.4 })); f.position.set(x, 28, z); f.rotation.y = ry; g.add(f);
  }
  g.face = v3(0, 28, 4.1);
  return shadowAll(g);
}

// ---------------- the city ----------------
export const COTTAGE = v3(-34, 0, 52);   // Grandpa's cottage, front toward +z (front wall at z = 60)
export const PARTY = v3(38, 0, 46);      // the party lawn
export const TOWER = v3(-4, 0, -26);
export function sunmere() {
  const g = new THREE.Group(), r = rng(31);
  // ground: grass disc to the Rim, the paved plaza, paths
  const grass = surf('grass', '#7cc860'), pave = surf('cobble', '#e6d7bf'), path = surf('cobble', '#d8c7aa');
  { const m = new THREE.Mesh(new THREE.CircleGeometry(RIM - 0.5, 96).rotateX(-Math.PI / 2), grass); const P = m.geometry.attributes.position, uv = m.geometry.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / 8, P.getZ(i) / 8); m.receiveShadow = true; g.add(m); }
  { const m = new THREE.Mesh(new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2), pave); const P = m.geometry.attributes.position, uv = m.geometry.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / 6, P.getZ(i) / 6); m.position.y = 0.04; m.receiveShadow = true; g.add(m); }
  g.add(flat(path, 7, 120, 0, 0.03, -88));   // the path to the Rim
  g.add(flat(path, 7, 60, -14, 0.03, 50)); g.add(flat(path, 70, 7, 4, 0.035, 64));
  // the fountain in the plaza
  { const b = new Batch(), st = paint('#f1e7d6', { roughness: 0.5 }); b.cyl(st, 7, 7.4, 1.4, 6, 0.7, 4, { seg: 40 }); b.cyl(st, 1, 1.3, 4, 6, 2, 4, { seg: 16 }); b.cyl(st, 2.6, 1.2, 0.6, 6, 4.1, 4, { seg: 24 }); b.done(g);
    const w = new THREE.Mesh(new THREE.CircleGeometry(6.5, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5fc8e8', roughness: 0.08, metalness: 0.2 })); w.position.set(6, 1.25, 4); g.add(w); }
  // the clock tower
  const tw = clockTower(); tw.position.copy(TOWER); g.add(tw); g.tower = tw;
  // buildings in a ring around the plaza (none on the path to the Rim, x ~ 0, z < 0)
  const cols = ['#f7a6b8', '#8fd0f0', '#ffd27a', '#a8e0a0', '#c9b0f0', '#ffb48a', '#9ee6da', '#f7c6d4'];
  const ring = [[-40, -14, 0.6], [-30, -52, 0.4], [32, -42, -0.5], [44, -6, -1.2], [-52, 20, 1.3], [58, 18, -1.5], [22, -78, -0.3], [-26, -86, 0.3], [-70, -40, 1.0], [72, -50, -1.0]];
  ring.forEach(([x, z, ry], i) => { const bd = building({ seed: 10 + i, floors: 2 + (i % 3), w: 18 + (i % 2) * 6, d: 16, style: i % 3 === 0 ? 'stucco' : i % 3 === 1 ? 'brick' : 'stucco', wall: cols[i % cols.length], trim: '#fffaf0', roof: i % 2 ? 'gable' : 'flat', roofColor: ['#3f6aa8', '#d9536f', '#3f8f6a'][i % 3], shutters: ['#ffffff', '#3f6aa8', '#d9536f'][i % 3], lit: 0 }); bd.position.set(x, 0, z); bd.rotation.y = ry; g.add(bd); });
  // cottages, Grandpa's first
  const home = cottage({ seed: 4, wall: '#bfe0f7', roof: '#d9536f', door: '#ffd23f', w: 20, d: 14, h: 8.5, porch: true }).g; home.position.copy(COTTAGE); g.add(home); g.home = home;
  [[-6, 54, '#fde7a8'], [22, 84, '#cdeec4'], [-62, 70, '#f7c6d4'], [66, 66, '#dccbf6'], [-84, 0, '#ffd3b0'], [90, -10, '#c4efe8']].forEach(([x, z, c], i) => { const h = cottage({ seed: 20 + i, wall: c, w: 18, d: 13 }).g; h.position.set(x, 0, z); h.rotation.y = Math.atan2(-x, -z) + Math.PI; g.add(h); });
  { const b = new Batch(); picket(b, COTTAGE.x - 12, COTTAGE.x + 12, COTTAGE.z + 15, { h: 2.2 }); b.done(g); }
  flowers(g, [[COTTAGE.x - 7, COTTAGE.z + 9], [COTTAGE.x + 7, COTTAGE.z + 9], [COTTAGE.x - 4, COTTAGE.z + 10.5], [COTTAGE.x + 5, COTTAGE.z + 10.5]], { seed: 3 });
  // round trees
  const tm = paint('#4fa046', { roughness: 0.85 }), tm2 = paint('#69b84f', { roughness: 0.85 }), trunk = paint('#7a4f2e', { roughness: 0.9 });
  { const b = new Batch(); for (let i = 0; i < 60; i++) { let a, d; do { a = r() * Math.PI * 2; d = 34 + r() * 105; } while ((Math.abs(Math.sin(a) * d) < 12 && Math.cos(a) < 0) || (Math.hypot(Math.sin(a) * d - PARTY.x, -Math.cos(a) * d - PARTY.z) < 18) || Math.hypot(Math.sin(a) * d - COTTAGE.x, -Math.cos(a) * d - COTTAGE.z) < 22); const x = Math.sin(a) * d, z = -Math.cos(a) * d, s = 0.8 + r() * 0.7; b.cyl(trunk, 0.4 * s, 0.6 * s, 5 * s, x, 2.5 * s, z, { seg: 8 }); b.add(r() < 0.5 ? tm : tm2, new THREE.IcosahedronGeometry(3.4 * s, 1), x, 7 * s, z); b.add(tm2, new THREE.IcosahedronGeometry(2.4 * s, 1), x + 1.4 * s, 8.6 * s, z + 0.6 * s); } b.done(g); }
  // lamps along the plaza
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2, l = lamp({ height: 10, color: '#2f3a4a', on: false }); l.position.set(Math.cos(a) * 31, 0, Math.sin(a) * 31); l.rotation.y = -a; g.add(l); }
  // the party lawn: a table, bunting
  { const b = new Batch(), wd = paint('#ffffff', { roughness: 0.5 }), cl = paint('#ff8fb1', { roughness: 0.8 }); b.box(cl, 8, 0.3, 3.6, PARTY.x, 2.7, PARTY.z - 4, { r: 0.08 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(wd, 0.3, 2.6, 0.3, PARTY.x + sx * 3.6, 1.3, PARTY.z - 4 + sz * 1.5, { r: 0.05 });
    b.cyl(paint('#fff4e0'), 1.0, 1.0, 1.0, PARTY.x - 1.5, 3.35, PARTY.z - 4, { seg: 24 }); b.cyl(paint('#ff6f8a'), 1.05, 1.05, 0.25, PARTY.x - 1.5, 3.9, PARTY.z - 4, { seg: 24 });
    for (let i = 0; i < 5; i++) b.cyl(paint(['#ffd23f', '#5fc8e8', '#a8e0a0'][i % 3]), 0.06, 0.06, 0.5, PARTY.x - 1.9 + i * 0.2, 4.2, PARTY.z - 4, { seg: 6 });
    b.done(g);
    const bun = canvasTex(512, 64, (x, W, H) => { const cc = ['#ff4f6a', '#ffd23f', '#5fc8e8', '#7ad06a', '#c9b0f0']; for (let i = 0; i < 16; i++) { x.fillStyle = cc[i % cc.length]; x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 32, 0); x.lineTo(i * 32 + 16, 56); x.fill(); } });
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(16, 2), new THREE.MeshStandardMaterial({ map: bun, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 })); bm.position.set(PARTY.x, 8, PARTY.z - 7.5); g.add(bm);
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 9, 8), paint('#ffffff')); p.position.set(PARTY.x + sx * 8.2, 4.5, PARTY.z - 7.5); p.castShadow = true; g.add(p); }
  }
  // the Rim, the hedge in front of the hatch, the bushes to the east
  const rim = rimWall(); g.add(rim); g.rim = rim;
  const hd = hedge(18, 3.4); hd.position.set(0, 0, -RIM + 6.5); g.add(hd); g.hedge = hd;
  const bs = bush(8, 1.2); bs.position.set(15, 0, -RIM + 12); g.add(bs); g.bushAt = v3(15, 1.2, -RIM + 12);
  const bs2 = bush(9, 1.0); bs2.position.set(-16, 0, -RIM + 9); g.add(bs2);
  // a NO ENTRY sign on the path
  const ne = sign('THE RIM\nNO ENTRY', { w: 5, h: 2.6, bg: '#e8433a', fg: '#ffffff', edge: '#ffffff' }); ne.position.set(5.5, 3.6, -RIM + 28); g.add(ne);
  { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.2, 8), paint('#d9dde2', { metalness: 0.6 })); p.position.set(5.5, 1.4, -RIM + 27.9); p.castShadow = true; g.add(p); }
  shadowAll(g);
  return g;
}

// ---------------- Grandpa's bedroom ----------------
export function bedroom() {
  const g = snRoom({ w: 30, d: 24, h: 13, wall: '#fde7c4', floor: '#b88a5a', curtain: '#5fb8a8', winX: 6, winY: 7, winW: 8, winH: 6 });
  const bd = bed({ w: 8.4, l: 13, cover: '#5fb8a8', covered: false }); bd.position.set(-6, 0, -5); g.add(bd); g.bed = bd; g.bedTop = 2.45;
  const q = new Batch(); q.box(paint('#ffb48a', { roughness: 0.92 }), 8.8, 1.3, 6.0, 0, 0, 0, { r: 0.5 }); for (let i = 0; i < 3; i++) q.box(paint('#ff8f6a', { roughness: 0.92 }), 8.85, 0.2, 0.5, 0, 0.3, -2 + i * 2, { r: 0.08 });
  const quilt = q.done(); quilt.position.set(-6, 3.05, -5 - 0.1); g.add(quilt); g.quilt = quilt;
  const ns = new Batch(); ns.box(surf('plank', '#8a5a3a'), 3, 3, 3, 0, 1.5, 0, { r: 0.1 }); const stand = ns.done(); stand.position.set(-12.3, 0, -9.2); g.add(stand); g.stand = stand;
  // a rug, a wardrobe, a picture
  { const rug = new THREE.Mesh(new THREE.CircleGeometry(5, 40).rotateX(-Math.PI / 2), paint('#d9536f', { roughness: 0.95 })); rug.position.set(4, 0.03, 3); rug.receiveShadow = true; g.add(rug); }
  { const b = new Batch(); b.box(surf('plank', '#a0704a'), 6, 10, 3, 11.5, 5, -10, { r: 0.12 }); b.box(paint('#d6a94a', { metalness: 0.8 }), 0.2, 0.8, 0.2, 11.2, 5, -8.4, { r: 0.05 }); b.box(paint('#d6a94a', { metalness: 0.8 }), 0.2, 0.8, 0.2, 11.8, 5, -8.4, { r: 0.05 }); b.done(g); }
  // the bright noon window light
  const sp = new THREE.SpotLight('#fff1c8', 900, 60, 0.5, 0.6, 1.3); sp.position.set(6, 14, -24); sp.target.position.set(-5, 2, -2); sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); g.add(sp); g.add(sp.target); g.spot = sp;
  return shadowAll(g);
}

// ---------------- space ----------------
let STARMAT = null;
export function fullStars(o = {}) {
  const n = o.count ?? 5000, q = rng(o.seed ?? 21), pos = new Float32Array(n * 3), sz = new Float32Array(n), ph = new Float32Array(n), col = new Float32Array(n * 3);
  const tints = [[1, 0.97, 0.9], [0.8, 0.88, 1], [1, 0.85, 0.7], [1, 1, 1]];
  for (let i = 0; i < n; i++) { let x, y, z, l; do { x = q() * 2 - 1; y = q() * 2 - 1; z = q() * 2 - 1; l = x * x + y * y + z * z; } while (l > 1 || l < 0.01); l = Math.sqrt(l); pos.set([x / l, y / l, z / l], i * 3); const r = q(); sz[i] = r < 0.03 ? 2.6 + q() * 1.6 : r < 0.2 ? 1.4 + q() : 0.6 + q() * 0.7; ph[i] = q() * 6.28; col.set(tints[Math.floor(q() * 4)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('sz', new THREE.BufferAttribute(sz, 1)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1)); g.setAttribute('col', new THREE.BufferAttribute(col, 3));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, R: { value: o.radius ?? 2000 }, px: { value: o.px ?? 3.0 }, k: { value: 1 } },
    vertexShader: `attribute float sz, ph; attribute vec3 col; uniform float t, R, px, k; varying float a; varying vec3 c;
      void main(){ vec4 mv = modelViewMatrix * vec4(position * R, 1.0); gl_Position = projectionMatrix * mv; c = col;
        a = k * (0.8 + 0.2 * sin(t * (1.1 + sz) + ph)); gl_PointSize = px * sz; }`,
    fragmentShader: `varying float a; varying vec3 c; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q); float s = smoothstep(0.5, 0.0, d); s = s * s; if (a * s < 0.01) discard; gl_FragColor = vec4(c * 1.6, a * s); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -1; p.userData.noAO = true;
  p.set = (t, k = 1) => { m.uniforms.t.value = t; m.uniforms.k.value = k; };
  p.follow = (cam) => { p.position.copy(cam.position); };
  // a soft band of milky way
  return p;
}
export function planet(r = 160) {
  const g = new THREE.Group();
  const tex = canvasTex(1024, 512, (x, W, H) => {
    const q = rng(77); x.fillStyle = '#2f7fc8'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) { const cx = q() * W, cy = H * 0.15 + q() * H * 0.7, s = 30 + q() * 120; x.fillStyle = q() < 0.7 ? '#4fb04a' : '#7ccf5a'; x.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, rr = s * (0.6 + q() * 0.5); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.6); } x.fill(); }
    x.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 70; i++) { const cy = q() * H, cx = q() * W; x.beginPath(); x.ellipse(cx, cy, 30 + q() * 90, 6 + q() * 10, 0, 0, 7); x.fill(); }
    x.fillStyle = '#f2f6fa'; x.fillRect(0, 0, W, 18); x.fillRect(0, H - 18, W, 18);
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, emissive: '#183018', emissiveIntensity: 0.15 })); g.add(m); g.ball = m;
  const atm = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 64, 48), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 n; varying vec3 v; void main(){ float f = pow(1.0 - abs(dot(n, v)), 3.0); gl_FragColor = vec4(vec3(0.45,0.85,1.0) * f * 1.6, f); }' }));
  atm.userData.noAO = true; g.add(atm);
  return g;
}
// the ship: hull along x (bow at +x), the Rim ring + glass dome on top, a tiny city inside, the lamp-sun on a chain
export function shipModel() {
  const g = new THREE.Group(), b = new Batch(), hull = paint('#e9ecf0', { roughness: 0.45, metalness: 0.2 }), dark = paint('#3b4048', { metalness: 0.6, roughness: 0.45 }), teal = paint('#5fb8a8', { metalness: 0.5, roughness: 0.35 });
  // the hull: a long lathe body
  const prof = []; for (let i = 0; i <= 24; i++) { const u = i / 24, x = -110 + u * 220, rr = 30 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.02)), 0.55) + 4; prof.push(new THREE.Vector2(Math.max(2, rr), x)); }
  const lg = new THREE.LatheGeometry(prof, 48); lg.rotateZ(-Math.PI / 2); b.add(hull, lg, 0, 0, 0);
  // panel rings
  for (let i = 0; i < 9; i++) b.add(dark, new THREE.TorusGeometry(31.5 - Math.abs(i - 4) * 2.2, 0.35, 6, 48), -80 + i * 20, 0, 0, Math.PI / 2);
  // fins and engines at the stern (-x)
  for (const s of [-1, 1]) { b.box(hull, 30, 2, 22, -96, s * 6, s * 30, { rx: s * 0.4, r: 0.8 }); b.box(teal, 10, 2.4, 6, -106, s * 8, s * 38, { rx: s * 0.4, r: 0.6 }); }
  b.box(hull, 30, 24, 2, -96, -26, 0, { r: 0.8 });
  const eng = []; for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, y = Math.sin(a) * 14, z = Math.cos(a) * 14; b.cyl(dark, 6, 8, 14, -116, y, z, { rz: Math.PI / 2, seg: 24 }); eng.push(v3(-124, y, z)); }
  // the deck and the Rim ring on top
  const DY = 30;   // deck height
  b.cyl(hull, 48, 44, 8, 0, DY - 4, 0, { seg: 64 });
  b.add(paint('#f4f2ec', { roughness: 0.5 }), new THREE.CylinderGeometry(46, 46, 9, 72, 1, true), 0, DY + 4.5, 0);
  b.add(teal, new THREE.TorusGeometry(46, 0.8, 8, 72), 0, DY + 9, 0, 0, Math.PI / 2);
  // portholes along the hull
  b.done(g);
  // the tiny city on the deck: grass, plaza, little blocks
  const deck = new THREE.Mesh(new THREE.CircleGeometry(45.5, 72).rotateX(-Math.PI / 2), paint('#7cc860', { roughness: 0.85 })); deck.position.y = DY + 0.05; g.add(deck);
  { const q = rng(5), n = 260, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), n), M = new THREE.Matrix4(), c = new THREE.Color(), cols = ['#f7a6b8', '#8fd0f0', '#ffd27a', '#a8e0a0', '#c9b0f0', '#ffb48a', '#ffffff', '#3f8a3c'];
    for (let i = 0; i < n; i++) { let x, z; do { x = (q() - 0.5) * 84; z = (q() - 0.5) * 84; } while (Math.hypot(x, z) > 41 || Math.hypot(x, z) < 6); const tree = q() < 0.3, h = tree ? 2.4 : 1.5 + q() * 4.5, w = tree ? 1.6 : 2 + q() * 3; M.compose(v3(x, DY + h / 2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, q() * 3, 0)), v3(w, h, w)); im.setMatrixAt(i, M); im.setColorAt(i, c.set(tree ? '#3f8a3c' : cols[Math.floor(q() * 7)])); }
    im.castShadow = true; im.receiveShadow = true; g.add(im); }
  { const t = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7, 1.4), paint('#d98a6a')); t.position.set(-1, DY + 3.5, -4); g.add(t); }
  // the glass dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(46, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  dome.scale.y = 0.62; dome.position.y = DY + 9; dome.userData.noAO = true; g.add(dome); g.dome = dome;
  // dome ribs
  { const rb = new Batch(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const pts = []; for (let k = 0; k <= 16; k++) { const th = k / 16 * Math.PI / 2; pts.push(v3(Math.cos(a) * 46 * Math.cos(th), DY + 9 + 46 * 0.62 * Math.sin(th), Math.sin(a) * 46 * Math.cos(th))); } rb.add(paint('#dfe6ee', { metalness: 0.6, roughness: 0.3 }), new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.35, 6, false)); } rb.done(g); }
  // the lamp-sun on its chain
  const top = DY + 9 + 46 * 0.62, LY = DY + 9 + 18;
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, top - LY, 8), paint('#3b4048', { metalness: 0.7 })); chain.position.y = (top + LY) / 2 + 2; g.add(chain);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.6, 2, 16), paint('#3b4048', { metalness: 0.7, roughness: 0.4 })); cap.position.y = LY + 3.6; g.add(cap);
  const lampM = new THREE.MeshStandardMaterial({ color: '#fff4c8', emissive: '#ffd27a', emissiveIntensity: 4 });
  const lp = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 16), lampM); lp.position.y = LY; lp.userData.noAO = true; g.add(lp);
  const glow = glowSprite('#ffe6a0', 26, 0.8); glow.position.y = LY; g.add(glow);
  const ll = new THREE.PointLight('#ffe6b0', 2600, 120, 1.6); ll.position.y = LY; ll.castShadow = false; g.add(ll);
  g.lamp = lp; g.lampLight = ll; g.lampGlow = glow; g.lampY = LY; g.deckY = DY;
  g.setLamp = (k) => { lampM.emissiveIntensity = 4 * k + 0.05; ll.intensity = 2600 * k; glow.material.opacity = 0.8 * k; };
  // engines
  g.engines = eng.map((p) => { const s = glowSprite('#7fd0ff', 22, 0.9); s.position.copy(p); g.add(s); return s; });
  // the hatch: a tiny warm light on the Rim facing -x... (the hatch faces the city's -z, which is the model's -z)
  const hd = glowSprite('#ffe6a0', 3, 0.0); hd.position.set(0, DY + 1.2, -46.8); g.add(hd); g.hatchDot = hd;
  g.hatchPos = v3(0, DY + 1.2, -46.8);
  // portholes: a row of lit windows along the hull side
  { const q = rng(9), n = 80, im = new THREE.InstancedMesh(new THREE.CircleGeometry(0.9, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd89a').multiplyScalar(1.6) }), n), M = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const x = -80 + (i % 40) * 4, side = i < 40 ? 1 : -1, y = (q() - 0.5) * 6; const rr = 30 * Math.pow(Math.sin(Math.PI * Math.min(1, ((x + 110) / 220) * 1.15 + 0.02)), 0.55) + 4.2; M.compose(v3(x, y, side * Math.sqrt(Math.max(0, rr * rr - y * y))), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, side > 0 ? 0 : Math.PI, 0)), v3(1, 1, 1)); im.setMatrixAt(i, M); }
    im.userData.noAO = true; g.add(im); }
  shadowAll(g);
  return g;
}
