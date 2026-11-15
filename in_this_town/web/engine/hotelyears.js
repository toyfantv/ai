// The Hotel of Every Year (Flower Man remake 3): in Juniper Falls every door of the Almanac Hotel opens onto a different year, and you
// get one stay in your life. Poppy spends hers on 1994, the summer her mom was twelve.
//   almanacStreet()   the hotel's front on a small street (the origin): a tall pastel hotel with a canopy, a sign, lamps, trees, cottages
//   lobby()           the lobby and the corridor of years (local; place it anywhere): checkered floor, green-and-gold walls, the desk
//                     (.desk, .deskBell), the key board, a bench for the waiting guests (.bench), a chandelier; the corridor runs to -z
//                     with doors on both walls (.doors: { year, door, at, side }), each with its own era light leaking out
//   yearDoor(year, col)  a door in a frame with a year plaque: .open(k) swings it; .glow(k) the era light behind
//   meadow()          1994: a summer meadow with a pond (.pond), the oak (.branch: world-local start/end of the hanging branch), a raft
//                     (.raft), cattails, hills and the freestanding way-back door with a little brass bell on top (.exit, .exitBell)
//   porchHome()       Mom's cottage with its porch, steps, a lawn, a picket fence and a gate (.step: where Mom sits)
//   props: kite(cols), brassKey(tag), deskBell(), bracelet(text, cols) + wearBracelet(c, side, text), shoebox(), wearRaincoat(c),
//          wearBadge(c, text)
import * as THREE from 'three';
import { v3, rng, clamp, lerp } from './core.js';
import { Batch, surf, paint, lamp, sign, building } from './kit.js';
import { canvasTex } from './props.js';
import { cottage, picket, flowers } from './pastel.js';

const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh && !(o.material && o.material.transparent)) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } }); return g; };
function flat(mat, w, d, x, y, z) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, uv = g.attributes.uv, sp = mat.userData.span || 8;
  for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + x) / sp, (P.getZ(i) + z) / sp);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; return m;
}
const worn = (g) => { g.traverse((o) => { if (o.isMesh) { o.userData.worn = true; o.castShadow = true; } }); return g; };
function partBox(group, skip = []) { group.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), bx = new THREE.Box3(), tmp = new THREE.Box3(); const under = (k) => { for (let q = k; q && q !== group; q = q.parent) if (skip.includes(q)) return true; return false; }; group.traverse((k) => { if (k.isMesh && !k.userData.worn && k !== group && !under(k)) { k.geometry.computeBoundingBox(); tmp.copy(k.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld)); bx.union(tmp); } }); return bx; }
const atRest = (c, f) => { const r = c.root.rotation.clone(), q = c.arms.map((a) => a.quaternion.clone()), e = (c.elbow || []).map((a) => a.rotation.clone()); c.root.rotation.set(0, 0, 0); c.arms.forEach((a) => a.quaternion.identity()); (c.elbow || []).forEach((a) => a.rotation.set(0, 0, 0)); c.root.updateMatrixWorld(true); const out = f(); c.root.rotation.copy(r); c.arms.forEach((a, i) => a.quaternion.copy(q[i])); (c.elbow || []).forEach((a, i) => a.rotation.copy(e[i])); c.root.updateMatrixWorld(true); return out; };
const torsoBox = (c) => atRest(c, () => partBox(c.torso, [c.head, c.neck, ...(c.arms || []), ...(c.legs || [])].filter(Boolean)));
const headBox = (c) => atRest(c, () => partBox(c.head));
const label = (text, w, h, o = {}) => canvasTex(Math.round(256 * w / h), 256, (x, W, H) => { x.fillStyle = o.bg || '#c9a24a'; x.fillRect(0, 0, W, H); if (o.edge) { x.strokeStyle = o.edge; x.lineWidth = 14; x.strokeRect(10, 10, W - 20, H - 20); } x.fillStyle = o.fg || '#3a2410'; x.textAlign = 'center'; x.textBaseline = 'middle'; let fs = o.fs || 170; x.font = `900 ${fs}px ITTInter, sans-serif`; while (x.measureText(text).width > W * 0.86 && fs > 20) { fs -= 6; x.font = `900 ${fs}px ITTInter, sans-serif`; } x.fillText(text, W / 2, H / 2 + 6); });

// ---------------- worn ----------------
export function wearRaincoat(c, col = '#ffd21f') {   // a glossy yellow coat: a shell over the torso, sleeves on the upper and fore arms, a hood down the back
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.32, metalness: 0.02 }), dark = paint('#1c2a3a', { roughness: 0.4 }), trimM = paint('#f2b700', { roughness: 0.4 });
  const B = torsoBox(c), w = B.max.x - B.min.x, h = B.max.y - B.min.y, d = B.max.z - B.min.z, cx = (B.min.x + B.max.x) / 2, cz = (B.min.z + B.max.z) / 2;
  const g = new THREE.Group(), b = new Batch(), e = 0.09;
  b.box(m, w + e * 2, h * 1.08, d + e * 2, 0, -h * 0.04, 0, { r: 0.14 });
  b.box(trimM, w + e * 2 + 0.04, h * 0.08, d + e * 2 + 0.04, 0, -h * 0.55, 0, { r: 0.06 });   // the hem
  for (let i = 0; i < 4; i++) { b.box(dark, 0.26, 0.12, 0.08, w * 0.12, h * (0.3 - i * 0.22), d / 2 + e + 0.03, { r: 0.03 }); b.box(dark, 0.26, 0.12, 0.08, -w * 0.12, h * (0.3 - i * 0.22), d / 2 + e + 0.03, { r: 0.03 }); }
  b.box(trimM, 0.1, h * 1.0, 0.06, 0, -h * 0.04, d / 2 + e + 0.02, { r: 0.02 });
  for (const s of [-1, 1]) b.box(trimM, w * 0.3, h * 0.12, 0.08, s * w * 0.26, -h * 0.25, d / 2 + e + 0.02, { r: 0.03 });   // pocket flaps
  b.add(m, new THREE.TorusGeometry(Math.min(w, d) * 0.42, 0.22, 8, 16, Math.PI).scale(1.1, 0.8, 1), 0, h * 0.5, -d * 0.22, 0, -1.2, 0);   // the hood, folded down
  b.add(m, new THREE.SphereGeometry(Math.min(w, d) * 0.45, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.05, 0.8, 0.6), 0, h * 0.35, -d / 2 - 0.12, 0, Math.PI, 0);
  b.done(g); g.position.set(cx, (B.min.y + B.max.y) / 2, cz); c.torso.add(worn(g));
  // sleeves: each arm's upper part, and the forearm (under the elbow joint) down to the wrist
  c.arms.forEach((a, i) => {
    const j = c.elbow && c.elbow[i];
    const up = atRest(c, () => partBox(a, j ? [j] : [])), sg = new THREE.Group(), sb = new Batch();
    const uw = up.max.x - up.min.x, ud = up.max.z - up.min.z, uh = up.max.y - up.min.y;
    sb.box(m, uw + 0.16, uh * 0.98, ud + 0.16, 0, 0, 0, { r: 0.1 }); sb.done(sg); sg.position.set((up.min.x + up.max.x) / 2, (up.min.y + up.max.y) / 2 + uh * 0.02, (up.min.z + up.max.z) / 2); a.add(worn(sg));
    if (j) { const lo = atRest(c, () => partBox(j)), fh = lo.max.y - lo.min.y, fg = new THREE.Group(), fb = new Batch();
      fb.box(m, (lo.max.x - lo.min.x) + 0.16, fh * 0.62, (lo.max.z - lo.min.z) + 0.16, 0, 0, 0, { r: 0.1 }); fb.box(trimM, (lo.max.x - lo.min.x) + 0.2, fh * 0.08, (lo.max.z - lo.min.z) + 0.2, 0, -fh * 0.3, 0, { r: 0.04 }); fb.done(fg);
      fg.position.set((lo.min.x + lo.max.x) / 2, lo.max.y - fh * 0.31, (lo.min.z + lo.max.z) / 2); j.add(worn(fg)); }
  });
  return g;
}
export function wearBadge(c, text = '12') {   // a round birthday pin on the chest
  const B = torsoBox(c), g = new THREE.Group(), b = new Batch(), r = (B.max.x - B.min.x) * 0.13;
  b.add(paint('#ff4f7a', { roughness: 0.4 }), new THREE.CylinderGeometry(r * 1.15, r * 1.15, 0.06, 20).rotateX(Math.PI / 2), 0, 0, -0.02);
  b.done(g);
  const f = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshStandardMaterial({ roughness: 0.4, map: canvasTex(128, 128, (x, W, H) => { x.fillStyle = '#fff6d8'; x.beginPath(); x.arc(64, 64, 64, 0, 7); x.fill(); x.fillStyle = '#e2456a'; x.font = '900 72px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 64, 70); }) }));
  f.position.z = 0.02; g.add(f);
  g.position.set(B.min.x + (B.max.x - B.min.x) * 0.25, B.max.y - (B.max.y - B.min.y) * 0.3, B.max.z + 0.16); c.torso.add(worn(g)); return g;
}
// a bead bracelet: a ring of coloured beads with three white letter cubes; wearBracelet puts it round a wrist (arm pivot local)
export function bracelet(text = 'DOT', cols = ['#ff5a8a', '#ffd23f', '#3fb7e8', '#7ad06a', '#b07aff'], R = 0.42) {
  const g = new THREE.Group(), n = 16, letters = text.split(''), bead = new THREE.SphereGeometry(0.11, 10, 8);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const li = i - (n - letters.length) / 2 - n / 2 + letters.length; const m = new THREE.Mesh(bead, paint(cols[i % cols.length], { roughness: 0.25 })); m.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); g.add(m); }
  // the letter cubes at the front (+z)
  letters.forEach((ch, i) => { const a = (i - (letters.length - 1) / 2) * 0.42; const cube = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), [paint('#ffffff'), paint('#ffffff'), paint('#ffffff'), paint('#ffffff'), new THREE.MeshStandardMaterial({ roughness: 0.4, map: canvasTex(64, 64, (x) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#1a2240'; x.font = '900 50px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 32, 35); }) }), paint('#ffffff')]); cube.position.set(Math.sin(a) * (R + 0.04), 0, Math.cos(a) * (R + 0.04)); cube.rotation.y = a; g.add(cube); });
  return shadowAll(g);
}
export function wearBracelet(c, side, text, o = {}) {
  const a = c.arms[side], j = c.elbow && c.elbow[side], par = j || a;
  const bx = atRest(c, () => partBox(par)), rr = Math.max(bx.max.x - bx.min.x, bx.max.z - bx.min.z) * 0.5 + 0.1;
  const g = bracelet(text, o.cols, rr); g.position.set((bx.min.x + bx.max.x) / 2, bx.min.y + (bx.max.y - bx.min.y) * (o.y ?? 0.24), (bx.min.z + bx.max.z) / 2); g.rotation.y = o.ry ?? 0; par.add(worn(g)); return g;
}

// ---------------- props ----------------
export function kite(cols = ['#e8433a', '#ffd23f'], tail = true) {   // diamond kite, nose up, facing +z
  const g = new THREE.Group(), W = 1.7, Hh = 2.6;
  const tri = (a, b, c2, col) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c2], 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, side: THREE.DoubleSide })); m.castShadow = true; g.add(m); };
  const T = [0, Hh * 0.62, 0], Bm = [0, -Hh * 0.38, 0], Lf = [-W / 2, 0, 0], Rt = [W / 2, 0, 0], C = [0, 0, 0.02];
  tri(T, Lf, C, cols[0]); tri(T, C, Rt, cols[1]); tri(Lf, Bm, C, cols[1]); tri(C, Bm, Rt, cols[0]);
  const sb = new Batch(), st = paint('#6a4a2a', { roughness: 0.7 }); sb.cyl(st, 0.03, 0.03, Hh, 0, Hh * 0.12, 0.04, { seg: 5 }); sb.cyl(st, 0.03, 0.03, W, 0, 0, 0.04, { rz: Math.PI / 2, seg: 5 }); sb.done(g);
  if (tail) { const tb = new Batch(); for (let i = 0; i < 5; i++) { const y = -Hh * 0.38 - 0.5 - i * 0.55, x = Math.sin(i * 1.3) * 0.25; tb.cyl(paint('#f4efe4'), 0.02, 0.02, 0.56, x, y + 0.27, 0, { seg: 4 }); tb.add(paint(i % 2 ? cols[0] : cols[1], { roughness: 0.7 }), new THREE.ConeGeometry(0.16, 0.3, 4).rotateZ(Math.PI / 2), x - 0.14, y, 0); tb.add(paint(i % 2 ? cols[0] : cols[1], { roughness: 0.7 }), new THREE.ConeGeometry(0.16, 0.3, 4).rotateZ(-Math.PI / 2), x + 0.14, y, 0); } tb.done(g); }
  return g;
}
export function brassKey(tag = '1994') {
  const g = new THREE.Group(), b = new Batch(), brass = paint('#d9a93a', { metalness: 0.85, roughness: 0.28 });
  b.add(brass, new THREE.TorusGeometry(0.22, 0.06, 8, 16), 0, 0.5, 0); b.cyl(brass, 0.05, 0.05, 0.8, 0, 0, 0, { seg: 8 }); b.box(brass, 0.18, 0.1, 0.06, 0.08, -0.3, 0, { r: 0.02 }); b.box(brass, 0.14, 0.08, 0.06, 0.07, -0.15, 0, { r: 0.02 }); b.done(g);
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.04), new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(128, 180, (x, W, H) => { x.fillStyle = '#7b1f2e'; x.fillRect(0, 0, W, H); x.strokeStyle = '#e8c25a'; x.lineWidth = 6; x.strokeRect(6, 6, W - 12, H - 12); x.fillStyle = '#f6e3a8'; x.font = '900 40px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(tag, W / 2, H / 2 + 6); }) }));
  t.position.set(0.05, 1.05, 0); g.add(t); g.tag = t;
  return shadowAll(g);
}
export function deskBell() {
  const g = new THREE.Group(), b = new Batch(), brass = paint('#e2b04a', { metalness: 0.9, roughness: 0.22 });
  b.cyl(paint('#3a2418', { roughness: 0.4 }), 0.55, 0.6, 0.14, 0, 0.07, 0, { seg: 24 }); b.add(brass, new THREE.SphereGeometry(0.46, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.14, 0); b.cyl(brass, 0.05, 0.05, 0.18, 0, 0.66, 0, { seg: 8 }); b.add(brass, new THREE.SphereGeometry(0.09, 10, 8), 0, 0.76, 0); b.done(g);
  return shadowAll(g);
}
export function shoebox() {
  const g = new THREE.Group(), b = new Batch(), card = paint('#d86a3a', { roughness: 0.8 });
  b.box(card, 2.2, 0.9, 1.4, 0, 0.45, 0, { r: 0.04 }); b.box(paint('#f4ead2', { roughness: 0.9 }), 2.0, 0.08, 1.2, 0, 0.84, 0, { r: 0.02 });
  b.box(paint('#ffd23f'), 0.5, 0.06, 0.4, -0.5, 0.9, 0.1, { r: 0.02 }); b.cyl(paint('#f4efe4'), 0.22, 0.22, 0.2, 0.55, 0.92, -0.2, { seg: 14 });
  b.done(g);
  const lid = new THREE.Group(), lb = new Batch(); lb.box(card, 2.3, 0.18, 1.5, 0, 0, 0, { r: 0.04 }); lb.done(lid); g.add(lid); g.lid = lid;
  g.open = (k) => { lid.position.set(-1.3 * k, 0.95 + 0.4 * Math.sin(k * Math.PI), 0.1); lid.rotation.z = 0.4 * k; };
  g.open(1);
  return shadowAll(g);
}

// ---------------- a door with a year ----------------
export function yearDoor(year, col = '#ffd27a', o = {}) {   // in the door's local frame the opening faces +z; the leaf is hinged on its left (-x)
  const g = new THREE.Group(), b = new Batch(), W = o.w ?? 4.0, Hh = o.h ?? 8.2, frameM = paint(o.frame || '#5a3220', { roughness: 0.45 }), leafM = paint(o.leaf || '#7b3a26', { roughness: 0.4 });
  b.box(frameM, 0.5, Hh + 0.5, 0.7, -W / 2 - 0.25, (Hh + 0.5) / 2, 0, { r: 0.06 }); b.box(frameM, 0.5, Hh + 0.5, 0.7, W / 2 + 0.25, (Hh + 0.5) / 2, 0, { r: 0.06 });
  b.box(frameM, W + 1.0, 0.5, 0.7, 0, Hh + 0.25, 0, { r: 0.06 }); b.done(g);
  // the era light behind the opening: a glowing card that brightens as the leaf opens
  const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(col), toneMapped: false, map: o.view || null });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), glowM); glow.position.set(0, Hh / 2, -0.2); glow.userData.noAO = true; g.add(glow); g.glowM = glowM;
  // the light leaking under the door
  const leak = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, 1.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.2), transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false }));
  leak.rotation.x = -Math.PI / 2; leak.position.set(0, 0.03, 0.85); leak.userData.noAO = true; g.add(leak); g.leak = leak;
  const leaf = new THREE.Group(); leaf.position.set(-W / 2, 0, 0.12); g.add(leaf);
  { const lb = new Batch(); lb.box(leafM, W - 0.06, Hh - 0.06, 0.26, W / 2, Hh / 2, 0, { r: 0.05 }); for (const y of [0.27, 0.66]) lb.box(paint(o.leaf || '#7b3a26', { roughness: 0.3 }), W * 0.66, Hh * 0.26, 0.1, W / 2, Hh * y, 0.15, { r: 0.04 });
    lb.cyl(paint('#e2b04a', { metalness: 0.9, roughness: 0.25 }), 0.17, 0.17, 0.3, W - 0.5, Hh * 0.47, 0.22, { rx: Math.PI / 2, seg: 14 }); lb.done(leaf); }
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.8), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.5, map: label(String(year), 1.9, 0.8, { bg: '#d9a93a', fg: '#3a2410', edge: '#8a5a1a' }) }));
  pl.position.set(W / 2, Hh * 0.82, 0.29); leaf.add(pl); g.plaque = pl;
  g.open = (k) => { leaf.rotation.y = -1.9 * clamp(k); };
  g.glow = (k) => { glowM.color.set(col).multiplyScalar(0.25 + 1.6 * k); leak.material.opacity = 0.35 + 0.5 * k; };
  g.open(0); g.glow(0); g.W = W; g.H = Hh;
  return shadowAll(g);
}
// a little picture of a summer meadow for the 1994 door's light
export function summerView() {
  return canvasTex(256, 512, (x, W, H) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#7cc8ff'); gr.addColorStop(0.55, '#fff2c4'); gr.addColorStop(0.62, '#9fdc6a'); gr.addColorStop(1, '#5fb048'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.fillStyle = '#fffbe8'; x.beginPath(); x.arc(170, 120, 46, 0, 7); x.fill(); x.fillStyle = '#4f9a3a'; x.beginPath(); x.ellipse(60, 300, 70, 46, 0, 0, 7); x.fill(); x.fillStyle = '#e8433a'; x.beginPath(); x.moveTo(190, 190); x.lineTo(205, 215); x.lineTo(190, 245); x.lineTo(175, 215); x.fill(); });
}

// ---------------- the street with the hotel ----------------
export function almanacStreet() {
  const g = new THREE.Group(), b = new Batch(), r = rng(303);
  const grass = surf('grass', '#7ccf5e'); grass.userData.span = 14; g.add(flat(grass, 1400, 1400, 0, -0.05, 0));
  g.add(flat(surf('concrete', '#c9c4bb'), 220, 12, 0, 0.01, 8));          // sidewalk
  g.add(flat(surf('concrete', '#5c6168'), 220, 16, 0, 0.0, 22));           // road
  for (let x = -100; x < 100; x += 8) b.box(paint('#fff6d8'), 4, 0.04, 0.4, x, 0.03, 22, { r: 0.01 });
  // the hotel: five floors, mint stucco with cream trim, lit windows
  const h = building({ style: 'stucco', wall: '#9fd9c9', trim: '#fff4dc', floors: 5, floorH: 7, w: 34, d: 26, lit: 0.55, door: '#7b1f2e', roof: 'flat', windows: 5, seed: 31, shutters: '#e86a7a' });
  h.position.set(0, 0, -11); g.add(h);
  // canopy over the door, brass poles, a red carpet
  b.box(paint('#7b1f2e', { roughness: 0.5 }), 8, 0.5, 6, 0, 7.4, 4.6, { r: 0.12 }); for (const s of [-1, 1]) b.cyl(paint('#d9a93a', { metalness: 0.85, roughness: 0.3 }), 0.12, 0.12, 7.2, s * 3.7, 3.6, 7.2, { seg: 10 });
  b.box(paint('#b8283a', { roughness: 0.9 }), 3.4, 0.06, 7, 0, 0.06, 5.0, { r: 0.02 });
  // the big sign over the canopy and a vertical blade sign
  const s1 = sign('THE ALMANAC HOTEL', { w: 18, h: 2.6, bg: '#7b1f2e', fg: '#ffe2a0', frame: '#d9a93a', edge: '#ffe2a0' }); s1.position.set(0, 10.6, 2.35); g.add(s1);
  const s2 = sign('ANY YEAR\nONE STAY', { w: 6.4, h: 2.6, bg: '#fff4dc', fg: '#7b1f2e', frame: '#d9a93a', edge: '#7b1f2e' }); s2.position.set(-11, 4.2, 2.6); g.add(s2);
  const blade = sign('HOTEL', { w: 9, h: 2.2, bg: '#2a3a7a', fg: '#ffd84a', frame: '#d9a93a', edge: '#ffd84a' }); blade.position.set(16.6, 22, 3.6); blade.rotation.set(0, Math.PI / 2, Math.PI / 2); g.add(blade);
  // a clock over the sign whose hands point every way
  { const ck = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40), new THREE.MeshStandardMaterial({ roughness: 0.4, map: canvasTex(256, 256, (x, W, H) => { x.fillStyle = '#fff8e8'; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill(); x.strokeStyle = '#d9a93a'; x.lineWidth = 12; x.stroke(); x.fillStyle = '#3a2410'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.fillRect(128 + Math.sin(a) * 100 - 4, 128 - Math.cos(a) * 100 - 8, 8, 16); } x.strokeStyle = '#3a2410'; x.lineCap = 'round'; for (const [a, l, w] of [[0.6, 80, 8], [2.4, 60, 10], [4.1, 70, 6], [5.3, 50, 9]]) { x.lineWidth = w; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.sin(a) * l, 128 - Math.cos(a) * l); x.stroke(); } }) }));
    ck.position.set(0, 31.5, 2.1); g.add(ck); b.cyl(paint('#d9a93a', { metalness: 0.85, roughness: 0.3 }), 2.5, 2.5, 0.4, 0, 31.5, 1.9, { rx: Math.PI / 2, seg: 40 }); }
  // lamps, planters, round trees, cottages either side
  for (const x of [-24, 24]) { const l = lamp({ height: 11, color: '#205e66' }); l.position.set(x, 0, 12.5); l.rotation.y = x < 0 ? 0 : Math.PI; g.add(l); }
  for (const x of [-6, 6]) { b.box(paint('#7b1f2e', { roughness: 0.6 }), 1.8, 1.4, 1.8, x, 0.7, 6.6, { r: 0.1 }); b.add(paint('#4fae55', { roughness: 0.85 }), new THREE.IcosahedronGeometry(1.2, 1), x, 2.1, 6.6); }
  const bark = paint('#86603e', { roughness: 0.9 }), leaves = ['#5fbf57', '#7ad06a', '#f6a9c4', '#4fae55'].map((c) => paint(c, { roughness: 0.85 }));
  for (const x of [-34, 34, -58, 58]) { const hh = 8 + r() * 3; b.cyl(bark, 0.5, 0.7, hh, x, hh / 2, 8, { seg: 10 }); const m = leaves[Math.floor(r() * 4)]; for (const [dx, dy, rr] of [[0, hh + 1.2, 3.8], [2, hh - 0.6, 2.8], [-2, hh - 0.3, 2.9]]) b.add(m, new THREE.IcosahedronGeometry(rr, 2), x + dx, dy, 8); }
  ['#f7b9c9', '#fde49a', '#a9d8f5', '#d5c3f6'].forEach((col, i) => { const c = cottage({ wall: col, seed: 40 + i, w: 20, d: 14, flowers: true, number: 11 + i * 2 }); c.g.position.set([-46, 46, -72, 72][i], 0, -6); g.add(c.g); });
  for (let x = -110; x <= 110; x += 22) { const c = cottage({ wall: ['#ffcaa0', '#b4ece2', '#f9cfe2', '#bfe8b2'][Math.abs(x / 22) % 4], seed: 90 + x, w: 20, d: 14, flowers: true, number: 40 + x }); c.g.position.set(x, 0, 48); c.g.rotation.y = Math.PI; g.add(c.g); }
  b.done(g);
  return shadowAll(g);
}

// ---------------- the lobby and the corridor of years ----------------
export const CORR = { w: 12, z0: -16, z1: -80, h: 15 };
export const YEARS = [['L', -26, 1776, '#ffb35a'], ['R', -26, 1888, '#ffd9a0'], ['L', -37, 1925, '#f2e6c8'], ['R', -37, 1969, '#ff7ad8'], ['L', -48, 1994, '#fff1b8'], ['R', -48, 2077, '#5ae8ff'], ['L', -59, 2150, '#7a8cff'], ['R', -59, 1350, '#ff8a4a'], ['L', -70, 3000, '#b6ff6a'], ['R', -70, 1066, '#ffc46a']];
export function lobby() {
  const g = new THREE.Group(), b = new Batch(), r = rng(77);
  const LW = 46, LD = 32, LH = CORR.h + 3, cw = CORR.w;
  // checkered floor (lobby and corridor)
  const check = canvasTex(256, 256, (x, W, H) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#2a3550' : '#f3ead6'; x.fillRect(i * 128, j * 128, 128, 128); } }); check.wrapS = check.wrapT = THREE.RepeatWrapping; check.repeat.set(LW / 6, LD / 6);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(LW, LD), new THREE.MeshStandardMaterial({ map: check, roughness: 0.25, metalness: 0.05 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const c2 = check.clone(); c2.needsUpdate = true; c2.repeat.set(cw / 6, (CORR.z0 - CORR.z1) / 6); const cf = new THREE.Mesh(new THREE.PlaneGeometry(cw, CORR.z0 - CORR.z1), new THREE.MeshStandardMaterial({ map: c2, roughness: 0.25 })); cf.rotation.x = -Math.PI / 2; cf.position.set(0, 0.005, (CORR.z0 + CORR.z1) / 2); cf.receiveShadow = true; g.add(cf);
  // a runner down the corridor
  b.box(paint('#9a2236', { roughness: 0.9 }), 4.4, 0.05, CORR.z0 - CORR.z1 - 2, 0, 0.03, (CORR.z0 + CORR.z1) / 2, { r: 0.01 });
  // walls: green with a gold dado rail
  const wallM = paint('#2f6b55', { roughness: 0.75 }), dado = paint('#d9a93a', { metalness: 0.8, roughness: 0.3 }), wain = paint('#5a3220', { roughness: 0.5 }), cream = paint('#f6ead0', { roughness: 0.6 });
  const T = 0.6;
  // lobby back wall with the corridor mouth
  for (const s of [-1, 1]) { const ww = (LW - cw) / 2; b.box(wallM, ww, LH, T, s * (cw / 2 + ww / 2), LH / 2, -LD / 2, { r: 0.02 }); b.box(wain, ww, 3.6, T + 0.2, s * (cw / 2 + ww / 2), 1.8, -LD / 2 + 0.1, { r: 0.04 }); b.box(dado, ww, 0.3, T + 0.3, s * (cw / 2 + ww / 2), 3.7, -LD / 2 + 0.1, { r: 0.04 }); }
  b.box(wallM, cw, LH - CORR.h, T, 0, CORR.h + (LH - CORR.h) / 2, -LD / 2, { r: 0.02 });
  b.box(cream, cw + 1.4, 0.8, T + 0.4, 0, CORR.h + 0.2, -LD / 2 + 0.1, { r: 0.08 }); for (const s of [-1, 1]) b.box(cream, 0.9, CORR.h, T + 0.4, s * (cw / 2 + 0.3), CORR.h / 2, -LD / 2 + 0.1, { r: 0.08 });
  // side walls
  for (const s of [-1, 1]) { b.box(wallM, T, LH, LD, s * (LW / 2 + T / 2), LH / 2, 0, { r: 0.02 }); b.box(wain, T + 0.2, 3.6, LD, s * (LW / 2 - 0.05), 1.8, 0, { r: 0.04 }); b.box(dado, T + 0.3, 0.3, LD, s * (LW / 2 - 0.05), 3.7, 0, { r: 0.04 }); }
  // ceiling
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(LW + 2, LD + 2), paint('#f6ead0', { roughness: 0.8 })); m.rotation.x = Math.PI / 2; m.position.y = LH; m.receiveShadow = true; g.add(m); }
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(cw + 1, CORR.z0 - CORR.z1 + 1), paint('#f6ead0', { roughness: 0.8 })); m.rotation.x = Math.PI / 2; m.position.set(0, CORR.h, (CORR.z0 + CORR.z1) / 2); g.add(m); }
  // the corridor's walls (with door openings) and its end wall with a round window
  const dw = 4.0, dh = 8.2;
  for (const s of [-1, 1]) {
    const x = s * (cw / 2 + T / 2), zs = YEARS.filter((y) => (y[0] === 'R') === (s > 0)).map((y) => y[1]).sort((a, b2) => b2 - a);
    let zTop = CORR.z0;
    for (const z of zs) { const a = z + dw / 2 + 0.5, len = zTop - a; if (len > 0) b.box(wallM, T, CORR.h, len, x, CORR.h / 2, zTop - len / 2, { r: 0.02 }); b.box(wallM, T, CORR.h - dh - 0.5, dw + 1.0, x, dh + 0.5 + (CORR.h - dh - 0.5) / 2, z, { r: 0.02 }); zTop = z - dw / 2 - 0.5; }
    const len = zTop - CORR.z1; b.box(wallM, T, CORR.h, len, x, CORR.h / 2, zTop - len / 2, { r: 0.02 });
    b.box(wain, 0.2, 3.6, CORR.z0 - CORR.z1, s * (cw / 2 - 0.1), 1.8, (CORR.z0 + CORR.z1) / 2, { r: 0.02 }); b.box(dado, 0.3, 0.3, CORR.z0 - CORR.z1, s * (cw / 2 - 0.1), 3.7, (CORR.z0 + CORR.z1) / 2, { r: 0.02 });
  }
  b.box(wallM, cw + 2, CORR.h, T, 0, CORR.h / 2, CORR.z1 - T / 2, { r: 0.02 });
  { const win = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), new THREE.MeshBasicMaterial({ toneMapped: false, color: new THREE.Color('#ffe9b8').multiplyScalar(1.1) })); win.position.set(0, 9.4, CORR.z1 + 0.05); win.userData.noAO = true; g.add(win); b.cyl(dado, 2.9, 2.9, 0.4, 0, 9.4, CORR.z1 + 0.1, { rx: Math.PI / 2, seg: 40 }); }
  // corridor sconces between the doors
  g.sconces = [];
  for (const s of [-1, 1]) for (let z = -21; z > -78; z -= 11) { b.box(dado, 0.3, 0.9, 0.5, s * (cw / 2 - 0.2), 9.6, z, { r: 0.08 }); const gl = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd89a').multiplyScalar(2.2), toneMapped: false })); gl.position.set(s * (cw / 2 - 0.6), 10.2, z); gl.userData.noAO = true; g.add(gl); }
  // the doors of years
  g.doors = [];
  for (const [sd, z, year, col] of YEARS) {
    const d = yearDoor(year, col, year === 1994 ? { view: summerView() } : {}); const s = sd === 'R' ? 1 : -1;
    d.position.set(s * (cw / 2 + 0.05), 0, z); d.rotation.y = -s * Math.PI / 2; g.add(d);
    // each door's own era light outside it, in the wall's depth (the glow card sits behind the leaf)
    g.doors.push({ year, door: d, side: s, at: v3(s * (cw / 2 - 1.8), 0, z), col });
  }
  // the reception desk (left of the corridor mouth), the bell, the key board behind
  const DX = -13, DZ = -8; g.desk = v3(DX, 0, DZ);
  b.box(wain, 12, 3.2, 2.6, DX, 1.6, DZ, { r: 0.12 }); b.box(paint('#2a1a14', { roughness: 0.3 }), 12.6, 0.3, 3.2, DX, 3.35, DZ, { r: 0.08 });
  for (let i = 0; i < 4; i++) b.box(paint('#6a3a26', { roughness: 0.4 }), 2.4, 2.0, 0.12, DX - 4.2 + i * 2.8, 1.6, DZ + 1.32, { r: 0.05 });
  b.box(dado, 12.2, 0.2, 0.2, DX, 2.9, DZ + 1.35, { r: 0.04 });
  const kb = new Batch(); kb.box(wain, 9, 6, 0.4, 0, 0, 0, { r: 0.08 }); const keyM = paint('#d9a93a', { metalness: 0.85, roughness: 0.3 }), tagM = paint('#7b1f2e', { roughness: 0.6 });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const x = -3.6 + i * 1.44, y = 2.0 - j * 1.4; kb.cyl(keyM, 0.06, 0.06, 0.3, x, y, 0.3, { rx: Math.PI / 2, seg: 6 }); if (!(i === 3 && j === 2)) { kb.box(keyM, 0.08, 0.5, 0.06, x, y - 0.35, 0.36, { r: 0.02 }); kb.box(tagM, 0.4, 0.5, 0.05, x + 0.06, y - 0.75, 0.38, { r: 0.02 }); } }
  const kg = kb.done(); kg.position.set(DX, 8.0, -LD / 2 + 0.6); g.add(kg); g.keyGap = v3(DX - 3.6 + 3 * 1.44, 8.0 + 2.0 - 2 * 1.4, -LD / 2 + 1.0);
  const ks = sign('KEYS  BY  YEAR', { w: 7, h: 1.0, bg: '#2a1a14', fg: '#ffe2a0', frame: '#d9a93a' }); ks.position.set(DX, 11.8, -LD / 2 + 0.6); g.add(ks);
  const bell = deskBell(); bell.position.set(DX + 5.0, 3.5, DZ + 0.9); g.add(bell); g.deskBell = bell;
  { const bk = new Batch(); bk.box(paint('#f4ead2', { roughness: 0.85 }), 2.6, 0.2, 1.8, 0, 0, 0, { r: 0.03 }); bk.box(paint('#7b1f2e'), 1.3, 0.24, 1.8, -0.65, 0.02, 0, { r: 0.03 }); const lg = bk.done(); lg.position.set(DX - 2.2, 3.62, DZ + 0.4); lg.rotation.y = 0.2; g.add(lg); }
  // a sign by the corridor
  const rs = sign('ONE STAY\nPER LIFETIME', { w: 5.4, h: 2.8, bg: '#fff4dc', fg: '#7b1f2e', frame: '#d9a93a', edge: '#7b1f2e' }); rs.position.set(cw / 2 + 4.6, 9.6, -LD / 2 + 0.6); g.add(rs);
  // the waiting bench on the right, facing -x, with suitcases
  const BX = 15; g.bench = v3(BX, 0, -3);
  { const bb = new Batch(), vel = paint('#9a2236', { roughness: 0.85 }); bb.box(vel, 3.0, 1.2, 14, BX + 0.6, 2.2, -3, { r: 0.3 }); bb.box(vel, 1.0, 3.6, 14, BX + 2.0, 3.6, -3, { r: 0.3 }); bb.box(wain, 3.2, 1.6, 14.2, BX + 0.6, 0.8, -3, { r: 0.1 }); bb.done(g); }
  for (const [z, col] of [[-9, '#c47a3a'], [-4.5, '#3f6aa8'], [0.2, '#5a8a4a'], [4.2, '#a84a6a']]) { const sb = new Batch(); sb.box(paint(col, { roughness: 0.6 }), 1.0, 2.2, 1.8, 0, 1.1, 0, { r: 0.15 }); sb.box(dado, 0.2, 0.4, 0.9, 0, 2.4, 0, { r: 0.05 }); const s = sb.done(); s.position.set(BX - 2.4, 0, z); s.rotation.y = r() * 0.4; g.add(s); }
  // potted palms, a rug, a chandelier
  for (const [x, z] of [[-20, -13], [20, -13], [-7.6, -13.5], [7.6, -13.5]]) { b.cyl(paint('#d9a93a', { metalness: 0.7, roughness: 0.35 }), 1.0, 0.8, 1.8, x, 0.9, z, { seg: 16 }); for (let i = 0; i < 6; i++) { const a = i * 1.05; b.box(paint('#3f8a4a', { roughness: 0.8 }), 0.5, 0.12, 3.2, x + Math.sin(a) * 1.2, 3.2, z + Math.cos(a) * 1.2, { ry: a, rx: -0.5, r: 0.04 }); } b.cyl(paint('#6a4a2a'), 0.12, 0.16, 2.0, x, 2.6, z, { seg: 8 }); }
  b.box(paint('#b8283a', { roughness: 0.95 }), 16, 0.05, 10, 0, 0.03, 2, { r: 0.02 }); b.box(paint('#e8c25a', { roughness: 0.9 }), 14.6, 0.06, 8.6, 0, 0.04, 2, { r: 0.02 });
  { const ch = new Batch(); ch.add(dado, new THREE.TorusGeometry(2.4, 0.12, 8, 32).rotateX(Math.PI / 2), 0, 0, 0); ch.cyl(dado, 0.06, 0.06, 3, 0, 1.5, 0, { seg: 6 }); ch.done(g).position.set(0, LH - 3.4, 2);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, gl = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe2a8').multiplyScalar(2.4), toneMapped: false })); gl.position.set(Math.sin(a) * 2.4, LH - 3.1, 2 + Math.cos(a) * 2.4); gl.userData.noAO = true; g.add(gl); } }
  // framed pictures of eras on the lobby walls
  [['1776', '#c9a873', -22.6, 9, 0], ['2150', '#5a7aff', -22.6, 9, -8], ['1969', '#ff7ad8', 22.6, 9, 6]].forEach(([t, col, x, y, z]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(200, 150, (q, W, H) => { q.fillStyle = col; q.fillRect(0, 0, W, H); q.fillStyle = 'rgba(255,255,255,0.85)'; q.font = '900 46px ITTInter, sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(t, W / 2, H / 2 + 3); }) })); p.position.set(x + (x < 0 ? 0.35 : -0.35), y, z); p.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; g.add(p); b.box(dado, 0.2, 3.0, 3.8, x + (x < 0 ? 0.2 : -0.2), y, z, { r: 0.04 }); });
  b.done(g);
  g.size = { LW, LD, LH };
  return shadowAll(g);
}

// ---------------- 1994: the meadow ----------------
export const POND = v3(14, 0, -8), OAK = v3(-8, 0, -6), EXITD = v3(-16, 0, 14);
export function meadow() {
  const g = new THREE.Group(), b = new Batch(), r = rng(1994);
  const grass = surf('grass', '#86d460'); grass.userData.span = 12; g.add(flat(grass, 1600, 1600, 0, -0.02, 0));
  // the pond: a sunk bank and shiny water
  b.cyl(paint('#c9b48a', { roughness: 0.95 }), 15.5, 15.5, 0.12, POND.x, 0.0, POND.z, { seg: 48 });
  const water = new THREE.Mesh(new THREE.CircleGeometry(14.2, 64), new THREE.MeshStandardMaterial({ color: '#2fa6d0', roughness: 0.08, metalness: 0.15, envMapIntensity: 1.2 })); water.rotation.x = -Math.PI / 2; water.position.set(POND.x, 0.1, POND.z); water.receiveShadow = true; water.userData.noAO = true; g.add(water); g.pond = water;
  g.pads = []; for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = 6 + r() * 7; const p = new THREE.Mesh(new THREE.CircleGeometry(0.7 + r() * 0.4, 16, 0.3, 5.8), paint('#4fae55', { roughness: 0.6, side: THREE.DoubleSide })); p.rotation.x = -Math.PI / 2; p.position.set(POND.x + Math.sin(a) * d, 0.14, POND.z + Math.cos(a) * d); g.add(p); g.pads.push(p); }
  for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 14.6 + r() * 1.6; const x = POND.x + Math.sin(a) * d, z = POND.z + Math.cos(a) * d; if ((z > POND.z + 8 && x < POND.x) || x < POND.x - 6) continue; const hh = 2 + r() * 1.6; b.cyl(paint('#5a8a3a', { roughness: 0.8 }), 0.06, 0.08, hh, x, hh / 2, z, { seg: 5 }); b.cyl(paint('#7a4a22', { roughness: 0.8 }), 0.16, 0.16, 0.7, x, hh - 0.2, z, { seg: 8 }); }
  // the oak: a fat trunk, a long low branch reaching out to +x (Dot hangs from it), a big crown
  const bark = surf('plank', '#7a5434'), barkD = paint('#6a4a2e', { roughness: 0.9 });
  b.cyl(barkD, 1.3, 1.8, 13, OAK.x, 6.5, OAK.z, { seg: 14 });
  const BR0 = v3(OAK.x + 0.8, 9.6, OAK.z), BR1 = v3(OAK.x + 10.5, 10.6, OAK.z + 1.2);
  { const len = BR0.distanceTo(BR1), m = BR0.clone().add(BR1).multiplyScalar(0.5), geo = new THREE.CylinderGeometry(0.42, 0.7, len, 10); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), BR1.clone().sub(BR0).normalize())); b.add(barkD, geo, m.x, m.y, m.z); }
  for (const [dx, dy, dz, rx, rz, l] of [[-2, 11, 1, 0.3, 0.8, 7], [0.5, 12.5, -2, -0.6, -0.3, 7], [-1, 12, 2.5, 0.7, 0.2, 6]]) b.cyl(barkD, 0.3, 0.6, l, OAK.x + dx, dy, OAK.z + dz, { rx, rz, seg: 8 });
  g.branch = [BR0, BR1];
  const leafM = [paint('#3f8a3a', { roughness: 0.85 }), paint('#4fa045', { roughness: 0.85 }), paint('#5fb04e', { roughness: 0.85 })];
  for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = r() * 7.5, y = 14 + r() * 5 - d * 0.3; b.add(leafM[i % 3], new THREE.IcosahedronGeometry(2.6 + r() * 1.8, 1), OAK.x + Math.sin(a) * d + 1, y, OAK.z + Math.cos(a) * d * 0.8 - 1); }
  // leaves over the branch's tip (where the kite is caught), kept high so Dot's face stays clear
  for (let i = 0; i < 5; i++) b.add(leafM[(i + 1) % 3], new THREE.IcosahedronGeometry(1.8 + r(), 1), BR1.x - 2.5 + i * 1.1, BR1.y + 2.0 + r() * 0.8, BR1.z - 1.2 + r() * 1.5);
  // the raft (moored at the near bank, or out on the pond: the director moves .raft)
  { const rg = new THREE.Group(), rb = new Batch(), log = paint('#a8743f', { roughness: 0.75 });
    for (let i = 0; i < 7; i++) rb.cyl(log, 0.42, 0.42, 7.2, -2.7 + i * 0.9, 0, 0, { rx: Math.PI / 2, seg: 10 });
    for (const z of [-2.6, 2.6]) rb.box(paint('#7a4a22', { roughness: 0.8 }), 6.8, 0.25, 0.4, 0, 0.45, z, { r: 0.05 });
    rb.cyl(paint('#8a5a30'), 0.14, 0.16, 6.5, 0, 3.4, -1.2, { seg: 8 }); rb.done(rg);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.6), new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, map: canvasTex(128, 144, (x, W, H) => { for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#ff6f8f'; x.fillRect(0, i * H / 6, W, H / 6 + 1); } x.fillStyle = '#2a3a7a'; x.font = '900 34px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('D+P', W / 2, H / 2 + 12); }) }));
    sail.position.set(1.7, 4.4, -1.2); sail.castShadow = true; rg.add(sail); rg.deckY = 0.45; g.add(rg); g.raft = rg; }
  // the way-back door: a freestanding frame in the meadow with a little brass bell on top
  { const d = yearDoor('HOME', '#cfe6ff', { leaf: '#2f6b55', frame: '#d9a93a' }); d.position.copy(EXITD); d.rotation.y = 0.5; g.add(d); g.exit = d;
    const bg = new THREE.Group(), bb = new Batch(), brass = paint('#e2b04a', { metalness: 0.9, roughness: 0.25 }); bb.box(brass, 0.2, 1.2, 0.2, 0, 0.6, 0, { r: 0.05 }); bb.box(brass, 1.4, 0.18, 0.18, 0, 1.2, 0, { r: 0.04 }); bb.done(bg);
    const bell = new THREE.Group(), b2 = new Batch(); b2.add(brass, new THREE.CylinderGeometry(0.22, 0.55, 0.8, 18, 1, true), 0, -0.4, 0); b2.add(brass, new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0, 0); b2.add(paint('#5a3a1a'), new THREE.SphereGeometry(0.12, 8, 6), 0, -0.8, 0); b2.done(bell); bell.position.set(0, 1.15, 0); bg.add(bell);
    bg.position.set(0, d.H + 0.5, 0); d.add(bg); g.exitBell = bell; }
  // hills, a fence, flowers, distant trees
  for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.32, d = 210 + r() * 60; b.add(paint(['#7cc85a', '#6ab84e', '#8fd46a'][i % 3], { roughness: 0.95 }), new THREE.SphereGeometry(60 + r() * 30, 20, 12).scale(1.6, 0.4, 1), Math.sin(a) * d, -6, -Math.cos(a) * d); }
  for (let x = -60; x <= 60; x += 4) { b.box(paint('#f4efe4', { roughness: 0.7 }), 0.3, 2.6, 0.3, x, 1.3, -44, { r: 0.05 }); } b.box(paint('#f4efe4'), 120, 0.25, 0.2, 0, 2.0, -44, { r: 0.04 }); b.box(paint('#f4efe4'), 120, 0.25, 0.2, 0, 1.0, -44, { r: 0.04 });
  const spots = []; for (let i = 0; i < 80; i++) spots.push(v3(-40 + r() * 80, 0, -38 + r() * 70)); flowers(g, spots.filter((p) => p.distanceTo(POND) > 17 && p.distanceTo(OAK) > 4 && p.distanceTo(EXITD) > 4), { seed: 12 });
  for (let i = 0; i < 16; i++) { const x = -90 + i * 12 + r() * 4, z = -60 - r() * 20, hh = 8 + r() * 6; b.cyl(barkD, 0.6, 0.9, hh, x, hh / 2, z, { seg: 8 }); b.add(leafM[i % 3], new THREE.IcosahedronGeometry(4 + r() * 2, 1), x, hh + 2, z); }
  b.done(g);
  return shadowAll(g);
}

// ---------------- Mom's porch ----------------
export function porchHome() {
  const g = new THREE.Group(), b = new Batch(), r = rng(55);
  const grass = surf('grass', '#7ccf5e'); grass.userData.span = 14; g.add(flat(grass, 1400, 1400, 0, -0.05, 0));
  const c = cottage({ wall: '#ffd8a8', seed: 103, w: 24, d: 16, flowers: true, number: 12, door: '#2f6b55', roof: '#5a6f9a' }); g.add(c.g); g.cot = c;
  // the path to the gate, the picket fence, the gate
  g.add(flat(surf('concrete', '#d8d2c6'), 4.2, 22, 0, 0.01, 8 + 4.2 + 11));
  picket(b, -30, -3, 34, {}); picket(b, 3, 30, 34, {});
  g.add(flat(surf('concrete', '#9a9da3'), 400, 12, 0, 0.0, 42));
  // a porch bench to the left of the door (Mom sits here), a hanging plant, the old kite on the wall
  const pz = 16 / 2 + 2.1; g.bench = v3(-3.6, 1.0, pz - 0.6);
  { const bb = new Batch(), w = surf('plank', '#e8e0d0'); bb.box(w, 4.6, 0.3, 1.8, 0, 1.9, 0, { r: 0.06 }); bb.box(w, 4.6, 2.0, 0.25, 0, 3.0, -0.8, { r: 0.06 }); for (const x of [-2.1, 2.1]) bb.box(paint('#ffffff'), 0.25, 1.9, 1.6, x, 0.95, 0, { r: 0.05 }); const q = bb.done(); q.position.copy(g.bench).setY(1.0); g.add(q); g.benchSeatY = 1.0 + 2.05; }
  { const k = kite(['#e8433a', '#ffd23f'], false); k.scale.setScalar(0.9); k.position.set(5.2, 6.4, 16 / 2 + 0.25); k.rotation.z = 0.2; g.add(k); g.oldKite = k; }
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd89a').multiplyScalar(2), toneMapped: false })); lantern.position.set(2.5, 6.9, 16 / 2 + 0.6); lantern.userData.noAO = true; g.add(lantern); g.lantern = lantern;
  // trees and neighbours
  const bark = paint('#86603e', { roughness: 0.9 }), leaves = ['#5fbf57', '#7ad06a', '#4fae55'].map((col) => paint(col, { roughness: 0.85 }));
  for (const [x, z] of [[-24, 18], [24, 22], [-34, -6], [36, -4]]) { const hh = 9 + r() * 3; b.cyl(bark, 0.6, 0.85, hh, x, hh / 2, z, { seg: 10 }); const m = leaves[Math.floor(r() * 3)]; for (const [dx, dy, rr] of [[0, hh + 1.4, 4.4], [2.4, hh - 0.5, 3.2], [-2.4, hh - 0.2, 3.3]]) b.add(m, new THREE.IcosahedronGeometry(rr, 2), x + dx, dy, z); }
  [['#a9d8f5', -52], ['#f7b9c9', 52]].forEach(([col, x], i) => { const cc = cottage({ wall: col, seed: 140 + i, w: 22, d: 15, flowers: true, number: 10 + i * 4 }); cc.g.position.set(x, 0, -2); g.add(cc.g); });
  { const l = lamp({ height: 11, color: '#205e66' }); l.position.set(12, 0, 37); l.rotation.y = Math.PI; g.add(l); }
  b.done(g);
  return shadowAll(g);
}
