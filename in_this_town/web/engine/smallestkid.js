// The Smallest Kid (Flower Man remake 8): in Fernbrook every thank-you said to your face makes you one inch taller.
//   fernStreet()      a bright street of pastel cottages (no banners), a zebra crossing at x 40 (.cross), a town sign, lamps (.lamps)
//   schoolHall()      Fernbrook Middle's main hallway along z: lockers both sides (x = +-HALL.w / 2), classroom doors, a water fountain
//                     with a step stool (.fountain, .stool), hanging ceiling lights (.lights[i].swing(a)), the glass front doors at
//                     z = HALL.front, a banner frame over them (.banner: set its photo with .setPhoto(texture)); the ceiling at HALL.h
//   gymBack()         behind the gym: a brick wall along x at z = -8, asphalt, a yellow bike rack (.rack), a corner at x = GYM.corner
//   bike(o)           a kid's bike: .tires(k) 0 flat .. 1 pumped, .chainOn(k), o.basket; the group origin is the ground under the bottom bracket
//   props: stepStool() waterFountain() stopPaddle() moneyBag() stickyNote(text) homework() wrench() pump() appleBasket() toolbox() greaseOn(c, side)
import * as THREE from 'three';
import { v3, rng } from './core.js';
import { Batch, surf, paint, lamp, sign } from './kit.js';
import { canvasTex } from './props.js';
import { cottage, picket, flowers } from './pastel.js';

const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh && !(o.material && o.material.transparent)) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } }); return g; };
function flat(mat, w, d, x, y, z) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, uv = g.attributes.uv, sp = mat.userData.span || 8;
  for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + x) / sp, (P.getZ(i) + z) / sp);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; return m;
}
const text = (lines, bg, fg, W = 512, H = 256, font = 90, o = {}) => canvasTex(W, H, (x, w, h) => {
  x.fillStyle = bg; x.fillRect(0, 0, w, h); if (o.border) { x.strokeStyle = o.border; x.lineWidth = o.bw || 14; x.strokeRect(o.bw / 2 || 7, o.bw / 2 || 7, w - (o.bw || 14), h - (o.bw || 14)); }
  x.fillStyle = fg; x.font = `900 ${font}px ITTInter, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const L = lines.split('|'); L.forEach((s, i) => x.fillText(s, w / 2, h / 2 + (i - (L.length - 1) / 2) * font * 1.08));
});
const plane = (tex, w, h, o = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: o.rough ?? 0.7, side: o.double ? THREE.DoubleSide : THREE.FrontSide, transparent: !!o.transparent })); m.receiveShadow = true; return m; };

// ---------------- the street ----------------
export function fernStreet() {
  const g = new THREE.Group(), b = new Batch(), r = rng(808);
  const grass = surf('grass', '#7ccf5e'); grass.userData.span = 14;
  g.add(flat(grass, 1400, 1400, 0, -0.05, 0));
  g.add(flat(surf('concrete', '#8d9096'), 460, 22, 0, 0.02, 0));
  for (const s of [-1, 1]) { b.box(surf('tile', '#ece4d6'), 460, 0.3, 7, 0, 0.15, s * 15, { r: 0.05 }); b.box(paint('#d7cfc0'), 460, 0.36, 0.5, 0, 0.18, s * 11.4, { r: 0.08 }); }
  for (let x = -220; x < 220; x += 8) if (Math.abs(x - 40) > 8) b.box(paint('#fff6d8', { roughness: 0.5 }), 4, 0.04, 0.4, x, 0.06, 0, { r: 0.02 });
  // the zebra crossing at x 40
  for (let z = -10; z <= 10; z += 2.2) b.box(paint('#fbfbf6', { roughness: 0.5 }), 6, 0.05, 1.3, 40, 0.06, z, { r: 0.02 });
  g.cross = v3(40, 0, 0);
  const COLS = ['#f7b9c9', '#a9d8f5', '#bfe8b2', '#fde49a', '#d5c3f6', '#ffcaa0', '#b4ece2', '#f9cfe2'];
  let k = 0; g.lamps = [];
  for (let x = -150; x <= 150; x += 32) for (const s of [-1, 1]) {
    const c = cottage({ wall: COLS[(k + 3) % COLS.length], seed: 60 + k, w: 22, d: 15, flowers: true, number: 20 + k }); c.g.position.set(x, 0, s * 36); c.g.rotation.y = s > 0 ? Math.PI : 0; g.add(c.g); k++;
    picket(b, x - 14, x + 14, s * 19.2, { h: 2.6, gate: true });
    const l = lamp({ height: 12, color: '#3a5a7a' }); l.position.set(x + 15, 0.3, s * 17.6); l.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(l); g.lamps.push(l);
  }
  const bark = paint('#86603e', { roughness: 0.9 }), leaves = ['#5fbf57', '#7ad06a', '#f6a9c4', '#4fae55'].map((c) => paint(c, { roughness: 0.85 }));
  for (let x = -166; x <= 166; x += 32) for (const s of [-1, 1]) { const h = 8 + r() * 4, lx = x + (r() - 0.5) * 3, lz = s * (26 + r() * 3); b.cyl(bark, 0.6, 0.9, h, lx, h / 2, lz, { seg: 10 }); const m = leaves[Math.floor(r() * 4)]; for (const [dx, dy, rr] of [[0, h + 1.5, 4.6], [2.4, h - 0.6, 3.2], [-2.4, h - 0.3, 3.4]]) b.add(m, new THREE.IcosahedronGeometry(rr, 2), lx + dx, dy, lz); }
  // crossing signs, a hydrant
  for (const s of [-1, 1]) { b.cyl(paint('#d9dde2', { metalness: 0.5 }), 0.15, 0.15, 7, 46, 3.5, s * 13, { seg: 8 }); const sg = sign('SCHOOL|CROSSING', { w: 2.8, h: 2.8, bg: '#ffd84a', fg: '#1b1d22', frame: '#1b1d22' }); sg.position.set(46, 7.4, s * 13 + 0.2); g.add(sg); }
  { const hy = new Batch(), red = paint('#e8433a', { roughness: 0.45 }); hy.cyl(red, 0.55, 0.6, 2.0, 0, 1.0, 0, { seg: 14 }); hy.add(red, new THREE.SphereGeometry(0.58, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 2.0, 0); hy.cyl(red, 0.2, 0.2, 1.6, 0, 1.3, 0, { seg: 8, rz: Math.PI / 2 }); hy.cyl(paint('#c8352d'), 0.75, 0.75, 0.25, 0, 0.12, 0, { seg: 14 }); const h = hy.done(); h.position.set(18, 0.3, -13.6); g.add(h); g.hydrant = h; }
  { const ts = sign('FERNBROOK|EVERY INCH EARNED', { w: 9, h: 4.6, bg: '#2f6fb0', fg: '#ffffff', frame: '#ffffff' }); ts.position.set(-60, 5.2, -19.5); g.add(ts); for (const x of [-64, -56]) b.box(paint('#fffaf2'), 0.4, 5, 0.4, x, 2.5, -19.8, { r: 0.05 }); }
  b.done(g);
  const spots = []; for (let x = -150; x <= 150; x += 6) for (const s of [-1, 1]) spots.push(v3(x + r() * 3, 0.5, s * 20.4));
  flowers(g, spots, {});
  return shadowAll(g);
}

// ---------------- the school hallway ----------------
export const HALL = { w: 20, h: 13.5, front: 12, back: -86 };
export function schoolHall() {
  const g = new THREE.Group(), b = new Batch(), r = rng(88), { w, h, front, back } = HALL, L = front - back, cz = (front + back) / 2;
  const tile = surf('tile', '#ece6da'); tile.userData.span = 5;
  g.add(flat(tile, w, L, 0, 0, cz));
  b.box(paint('#3fa7b8', { roughness: 0.35 }), 2.2, 0.03, L, 0, 0.02, cz, { r: 0.01 });   // a teal stripe down the middle
  const wallM = paint('#f6efe2', { roughness: 0.85 }), trim = paint('#3fa7b8', { roughness: 0.5 });
  for (const s of [-1, 1]) { b.box(wallM, 0.6, h, L, s * (w / 2 + 0.3), h / 2, cz, { r: 0.02 }); b.box(trim, 0.2, 0.9, L, s * (w / 2 - 0.05), 0.45, cz, { r: 0.03 }); b.box(trim, 0.2, 0.4, L, s * (w / 2 - 0.05), 9.0, cz, { r: 0.03 }); }
  // the ceiling: acoustic tiles with a grid
  b.box(paint('#fbf8f2', { roughness: 0.95 }), w + 1, 0.4, L, 0, h + 0.2, cz, { r: 0.02 });
  for (let z = back; z <= front; z += 4) b.box(paint('#d8d2c6'), w, 0.06, 0.12, 0, h - 0.02, z, { r: 0.01 });
  for (const x of [-6, -2, 2, 6]) b.box(paint('#d8d2c6'), 0.12, 0.06, L, x, h - 0.02, cz, { r: 0.01 });
  // the back wall: tall bright windows
  b.box(wallM, w + 1, h, 0.6, 0, h / 2, back - 0.3, { r: 0.02 });
  { const sky = new THREE.Mesh(new THREE.PlaneGeometry(w - 3, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#d8f0ff').multiplyScalar(1.5) })); sky.position.set(0, 6.5, back + 0.05); sky.userData.noAO = true; g.add(sky); for (let x = -7.5; x <= 7.5; x += 5) b.box(paint('#ffffff'), 0.3, 8.2, 0.3, x, 6.5, back + 0.2, { r: 0.05 }); b.box(paint('#ffffff'), w - 2.6, 0.4, 0.4, 0, 2.4, back + 0.25, { r: 0.05 }); b.box(paint('#ffffff'), w - 2.6, 0.4, 0.4, 0, 10.6, back + 0.25, { r: 0.05 }); }
  // the front wall with glass double doors
  for (const s of [-1, 1]) b.box(wallM, (w - 9) / 2, h, 0.6, s * (w / 2 - (w - 9) / 4), h / 2, front + 0.3, { r: 0.02 });
  b.box(wallM, 9.2, h - 9, 0.6, 0, 9 + (h - 9) / 2, front + 0.3, { r: 0.02 });
  { const out = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ color: new THREE.Color('#f3fbff').multiplyScalar(1.7) })); out.position.set(0, 4.5, front + 1.2); out.rotation.y = Math.PI; out.userData.noAO = true; g.add(out); }
  const frameM = paint('#2f5f7a', { metalness: 0.4, roughness: 0.35 });
  b.box(frameM, 9.4, 0.4, 0.5, 0, 9.0, front + 0.05, { r: 0.05 }); for (const x of [-4.5, 0, 4.5]) b.box(frameM, 0.35, 9, 0.5, x, 4.5, front + 0.05, { r: 0.05 });
  for (const x of [-2.25, 2.25]) { b.box(frameM, 0.18, 0.4, 0.6, x + (x < 0 ? 1.6 : -1.6), 4.2, front - 0.2, { r: 0.05 }); b.box(paint('#c9ced3', { metalness: 0.7, roughness: 0.3 }), 3.6, 0.22, 0.35, x, 4.0, front - 0.15, { r: 0.08 }); }
  { const gl = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ color: '#cfe8f5', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.25 })); gl.position.set(0, 4.5, front + 0.02); gl.rotation.y = Math.PI; g.add(gl); }
  // the banner frame over the doors (its photo set later)
  { const bn = new THREE.Group(); const back2 = plane(text('MEET THE PHANTOM', '#ffd84a', '#e2456a', 1024, 120, 92), 11, 1.3); back2.position.set(0, 1.75, 0); bn.add(back2);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.4), paint('#ffffff', { roughness: 0.8 })); card.position.set(0, -0.2, -0.02); bn.add(card);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); photo.position.set(-2.1, -0.6, 0.02); photo.userData.noAO = true; bn.add(photo);
    const cap = plane(text('FIXED YOUR BIKE?|FOUND YOUR HOMEWORK?|THANK HIM TO|HIS FACE!', '#ffffff', '#2f5f7a', 512, 512, 62), 3.8, 3.4); cap.position.set(3.4, -0.6, 0.02); bn.add(cap);
    bn.setPhoto = (tex) => { photo.material.map = tex; photo.material.needsUpdate = true; };
    bn.position.set(0, h - 2.95, front - 0.05); bn.rotation.y = Math.PI; g.add(bn); g.banner = bn; }
  // lockers, broken up by classroom doors and the fountain nook
  const LCOL = ['#3fa7b8', '#ff8a5c', '#ffd23f', '#5b8de0', '#8fd16a'], vent = paint('#2b3138', { roughness: 0.7 }), handle = paint('#c9ced3', { metalness: 0.8, roughness: 0.3 });
  g.doors = []; g.lockers = []; let n = 101;
  const gap = (s, z) => (s < 0 && z > -24 && z < -15) || (z > -4 && z < 4) || (z > -50 && z < -42) || (z > -72 && z < -64) || z > front - 2.5 || z < back + 2;
  for (const s of [-1, 1]) {
    for (let z = front - 3; z > back + 1; z -= 2.4) {
      if (gap(s, z)) continue;
      const col = LCOL[Math.floor((z + 200) / 12) % LCOL.length], m = paint(col, { roughness: 0.4, metalness: 0.15 }), x = s * (w / 2 - 0.75);
      b.box(m, 1.3, 8.2, 2.3, x, 4.4, z, { r: 0.05 });
      for (let k = 0; k < 4; k++) b.box(vent, 0.06, 0.12, 1.2, x - s * 0.66, 7.4 - k * 0.3, z, { r: 0.02 });
      b.box(handle, 0.16, 0.9, 0.18, x - s * 0.7, 4.4, z + 0.8, { r: 0.05 });
      const lab = plane(text(String(n), '#f4f1ea', '#1b1d22', 128, 64, 46), 0.7, 0.35); lab.position.set(x - s * 0.67, 6.4, z); lab.rotation.y = -s * Math.PI / 2; g.add(lab);
      g.lockers.push({ n, s, z, x }); n++;
    }
    b.box(paint('#2b3138'), 1.4, 0.3, Math.abs(back - front) - 2, s * (w / 2 - 0.75), 0.15, cz, { r: 0.02 });
  }
  // classroom doors (wood with a window) at the gaps
  for (const s of [-1, 1]) for (const z of [0, -46, -68]) {
    const x = s * (w / 2 - 0.05); b.box(paint('#2f5f7a'), 0.3, 9.2, 4.6, x, 4.6, z, { r: 0.05 }); b.box(surf('plank', '#c98d55'), 0.32, 8.4, 3.8, x - s * 0.06, 4.3, z, { r: 0.05 });
    b.box(paint('#bfe3f5', { roughness: 0.1, metalness: 0.2 }), 0.34, 2.2, 1.4, x - s * 0.08, 6.0, z + 0.6, { r: 0.03 }); b.box(handle, 0.3, 0.2, 0.6, x - s * 0.3, 4.2, z - 1.3, { r: 0.05 });
    const pl = plane(text(`ROOM ${s < 0 ? 1 : 2}${Math.abs(z / 2) + 10}`, '#2f5f7a', '#ffffff', 256, 96, 52), 2.2, 0.8); pl.position.set(x - s * 0.2, 9.8, z); pl.rotation.y = -s * Math.PI / 2; g.add(pl);
  }
  // the fountain nook on the left wall (z -15..-24): a fountain, a step stool, posters
  const F = v3(-w / 2 + 0.9, 0, -19.5); const ft = waterFountain(); ft.position.copy(F); ft.rotation.y = Math.PI / 2; g.add(ft); g.fountain = { pos: F.clone(), spout: v3(F.x + 0.9, 3.45, F.z), top: 3.2 };
  const st = stepStool(); st.position.set(F.x + 2.1, 0, F.z); st.rotation.y = Math.PI / 2; g.add(st); g.stool = st; g.stool.top = 1.25;
  for (const [txt, bg, z] of [['BE|KIND', '#ff8a5c', -16.2], ['HELP|OUT!', '#5b8de0', -22.8]]) { const p = plane(text(txt, bg, '#ffffff', 256, 320, 70), 2.4, 3.0); p.position.set(-w / 2 + 0.02, 7.6, z); p.rotation.y = Math.PI / 2; g.add(p); }
  // pennants and a school clock
  { const pen = new Batch(); for (let z = front - 6; z > back + 4; z -= 9) for (const s of [-1, 1]) { const c = LCOL[Math.floor(r() * LCOL.length)]; pen.add(paint(c, { roughness: 0.8, side: THREE.DoubleSide }), new THREE.ConeGeometry(0.5, 1.6, 3).rotateZ(Math.PI), s * (w / 2 - 0.4), 10.4, z, 0, 0, s * 0.2); } pen.done(g); }
  { const ck = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 24), new THREE.MeshStandardMaterial({ map: text('12', '#ffffff', '#1b1d22', 128, 128, 40), roughness: 0.4 })); ck.rotation.z = Math.PI / 2; ck.position.set(w / 2 - 0.2, 10.6, -30); g.add(ck); }
  // hanging ceiling lights (each can swing)
  g.lights = [];
  const lm = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4dc', emissiveIntensity: 1.6, roughness: 0.5 }), rod = paint('#c9ced3', { metalness: 0.7, roughness: 0.3 });
  for (let z = front - 6; z > back + 3; z -= 8) {
    const pv = new THREE.Group(); pv.position.set(0, h, z);
    const lb = new Batch(); for (const x of [-1.6, 1.6]) lb.cyl(rod, 0.05, 0.05, 0.9, x, -0.45, 0, { seg: 6 }); lb.box(paint('#e9ecef', { metalness: 0.3, roughness: 0.4 }), 4.4, 0.3, 1.3, 0, -1.0, 0, { r: 0.06 }); lb.done(pv);
    const tube = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.08, 1.0), lm); tube.position.y = -1.17; tube.userData.noAO = true; pv.add(tube);
    pv.swing = (a) => { pv.rotation.x = a; }; pv.lowY = h - 1.2; g.add(pv); g.lights.push(pv);
  }
  b.done(g);
  return shadowAll(g);
}

// ---------------- behind the gym ----------------
export const GYM = { wallZ: -8, corner: 22 };
export function gymBack() {
  const g = new THREE.Group(), b = new Batch(), r = rng(5);
  const grass = surf('grass', '#77c95a'); grass.userData.span = 14; g.add(flat(grass, 900, 900, 0, -0.06, 0));
  g.add(flat(surf('concrete', '#9a9ea4'), 70, 40, -6, 0.01, 10));
  const brick = surf('brick', '#c8664a'); b.box(brick, 56, 24, 1.4, -6, 12, GYM.wallZ - 0.7, { r: 0.05 });
  b.box(brick, 1.4, 24, 40, GYM.corner, 12, GYM.wallZ - 20, { r: 0.05 });
  b.box(paint('#e8e1d4'), 57, 1.0, 1.8, -6, 24.2, GYM.wallZ - 0.7, { r: 0.05 });
  // a mural strip and a GYM sign, a back door, a basketball hoop
  const gy = plane(text('FERNBROOK FALCONS', '#2f5f7a', '#ffd84a', 1024, 128, 86), 18, 2.25); gy.position.set(-10, 16, GYM.wallZ + 0.02); g.add(gy);
  b.box(paint('#2f5f7a'), 5.4, 9.4, 0.3, -24, 4.7, GYM.wallZ + 0.1, { r: 0.05 }); b.box(paint('#9fb8c6', { metalness: 0.5, roughness: 0.3 }), 4.6, 8.8, 0.32, -24, 4.4, GYM.wallZ + 0.12, { r: 0.05 });
  b.box(paint('#ffffff'), 6, 3.6, 0.3, 8, 12.5, GYM.wallZ + 0.15, { r: 0.05 }); b.box(paint('#e2456a'), 2, 1.4, 0.32, 8, 12, GYM.wallZ + 0.16, { r: 0.05 });
  b.add(paint('#ff7a1a', { metalness: 0.4 }), new THREE.TorusGeometry(0.9, 0.08, 6, 20).rotateX(Math.PI / 2), 8, 11, GYM.wallZ + 1.3);
  // the bike rack: a yellow wave of tubes
  const rackM = paint('#ffd23f', { metalness: 0.3, roughness: 0.35 });
  for (let i = 0; i < 6; i++) { const x = -10 + i * 3.2; b.add(rackM, new THREE.TorusGeometry(1.25, 0.1, 8, 20, Math.PI), x, 0, -4.2, 0, 0, 0); }
  b.cyl(rackM, 0.1, 0.1, 17, -2, 0.12, -4.2, { seg: 8, rz: Math.PI / 2 });
  g.rack = { x0: -10, dx: 3.2, z: -4.2 };
  // a dumpster, a fence along the far side, a tree
  b.box(paint('#3f8a5a', { roughness: 0.5 }), 7, 4, 4, -36, 2.2, GYM.wallZ + 2.6, { r: 0.1 }); b.box(paint('#2f6f48'), 7.2, 0.4, 4.2, -36, 4.3, GYM.wallZ + 2.6, { r: 0.08 });
  for (let x = -50; x <= 40; x += 6) b.cyl(paint('#b9bec4', { metalness: 0.6, roughness: 0.4 }), 0.1, 0.1, 6, x, 3, 30, { seg: 6 });
  { const fm = new THREE.Mesh(new THREE.PlaneGeometry(90, 5.4), new THREE.MeshStandardMaterial({ map: canvasTex(256, 64, (x, W, H) => { x.clearRect(0, 0, W, H); x.strokeStyle = '#b9bec4'; x.lineWidth = 1.5; for (let i = -64; i < W + 64; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke(); x.beginPath(); x.moveTo(i + H, 0); x.lineTo(i, H); x.stroke(); } }), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide })); fm.material.map.wrapS = THREE.RepeatWrapping; fm.material.map.repeat.set(12, 1); fm.position.set(-5, 3, 30); g.add(fm); }
  const bark = paint('#86603e', { roughness: 0.9 }), leaf = paint('#5fbf57', { roughness: 0.85 });
  for (const [x, z] of [[36, 6], [-44, 22], [30, 26]]) { b.cyl(bark, 0.7, 1.0, 10, x, 5, z, { seg: 10 }); for (const [dx, dy, rr] of [[0, 11.5, 5], [2.6, 9.6, 3.6], [-2.6, 9.8, 3.8]]) b.add(leaf, new THREE.IcosahedronGeometry(rr, 2), x + dx, dy, z); }
  b.done(g);
  return shadowAll(g);
}

// ---------------- a kid's bike ----------------
export function bike(o = {}) {
  const g = new THREE.Group(), b = new Batch(), fr = paint(o.col || '#ff8fb1', { metalness: 0.35, roughness: 0.35 }), dark = paint('#22252b', { roughness: 0.6 }), chrome = paint('#c9ced3', { metalness: 0.8, roughness: 0.25 });
  const R = 1.05, WB = 3.3, rearX = -WB / 2, frontX = WB / 2;
  const tube = (a, c, rad = 0.09, m = fr) => { const d = c.clone().sub(a), L = d.length(), geo = new THREE.CylinderGeometry(rad, rad, L, 8); const q = new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d.normalize()); geo.applyQuaternion(q); const mid = a.clone().add(c).multiplyScalar(0.5); b.add(m, geo, mid.x, mid.y, mid.z); };
  const BB = v3(0, 0.75, 0), seatT = v3(-0.55, 2.35, 0), headT = v3(1.15, 2.25, 0), RH = v3(rearX, R, 0), FH = v3(frontX, R, 0);
  tube(BB, seatT); tube(BB, headT, 0.1); tube(seatT, headT.clone().add(v3(-0.05, -0.15, 0))); tube(BB, RH); tube(seatT, RH);
  tube(headT, FH.clone().add(v3(-0.05, 0, 0)), 0.08, chrome); tube(headT, headT.clone().add(v3(-0.1, 0.55, 0)), 0.07, chrome);
  tube(headT.clone().add(v3(-0.25, 0.6, -0.75)), headT.clone().add(v3(-0.25, 0.6, 0.75)), 0.07, chrome);
  for (const s of [-1, 1]) b.cyl(dark, 0.13, 0.13, 0.45, headT.x - 0.25, headT.y + 0.6, s * 0.85, { seg: 8, rx: Math.PI / 2 });
  tube(seatT, seatT.clone().add(v3(-0.05, 0.4, 0)), 0.07, chrome); b.box(dark, 1.0, 0.22, 0.48, seatT.x - 0.1, seatT.y + 0.5, 0, { r: 0.1 });
  b.cyl(chrome, 0.42, 0.42, 0.06, BB.x, BB.y, 0.22, { seg: 20, rx: Math.PI / 2 });
  for (const s of [-1, 1]) { b.box(chrome, 0.08, 0.6, 0.08, BB.x + 0.0, BB.y + s * 0.3, s * 0.32, { r: 0.02 }); b.box(dark, 0.45, 0.1, 0.25, BB.x, BB.y + s * 0.58, s * 0.4, { r: 0.03 }); }
  b.done(g);
  // wheels: tyre (squashes when flat), rim, spokes, hub
  g.wheels = [];
  for (const cx of [rearX, frontX]) {
    const w = new THREE.Group(); w.position.set(cx, R, 0);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(R - 0.12, 0.13, 10, 32), paint('#1b1d22', { roughness: 0.75 })); w.add(tyre);
    const wb = new Batch(); wb.add(chrome, new THREE.TorusGeometry(R - 0.26, 0.04, 6, 32)); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; wb.cyl(chrome, 0.015, 0.015, R - 0.3, Math.cos(a) * (R - 0.3) / 2, Math.sin(a) * (R - 0.3) / 2, 0, { seg: 4, rz: a - Math.PI / 2 }); } wb.cyl(chrome, 0.1, 0.1, 0.3, 0, 0, 0, { seg: 10, rx: Math.PI / 2 }); wb.done(w);
    w.tyre = tyre; g.add(w); g.wheels.push(w);
  }
  // the chain: a loop from the chainring to the rear hub (and a broken end that hangs)
  const chainM = paint('#3a3d44', { metalness: 0.6, roughness: 0.4 });
  const chain = new THREE.Group(); { const cb = new Batch(); const top = [v3(BB.x, BB.y + 0.42, 0.22), v3(rearX, R + 0.18, 0.22)], bot = [v3(BB.x, BB.y - 0.42, 0.22), v3(rearX, R - 0.18, 0.22)]; for (const [a, c] of [top, bot]) { const d = c.clone().sub(a), L = d.length(), geo = new THREE.CylinderGeometry(0.045, 0.045, L, 6); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d.normalize())); const mid = a.clone().add(c).multiplyScalar(0.5); cb.add(chainM, geo, mid.x, mid.y, mid.z); } cb.done(chain); } g.add(chain);
  const broken = new THREE.Group(); { const cb = new Batch(); for (let k = 0; k < 8; k++) cb.cyl(chainM, 0.045, 0.045, 0.22, BB.x - 0.25 - k * 0.04, BB.y - 0.2 - k * 0.2, 0.24, { seg: 6, rz: 0.2 }); cb.done(broken); } g.add(broken);
  g.chainOn = (k) => { chain.visible = k >= 0.5; broken.visible = k < 0.5; };
  g.chainOn(1);
  if (o.basket) { const bk = new Batch(), wk = paint('#d8b27a', { roughness: 0.95 }); bk.box(wk, 1.2, 0.08, 1.2, 0, 0, 0, { r: 0.03 }); for (const s of [-1, 1]) { bk.box(wk, 1.2, 0.9, 0.08, 0, 0.45, s * 0.6, { r: 0.03 }); bk.box(wk, 0.08, 0.9, 1.2, s * 0.6, 0.45, 0, { r: 0.03 }); } const bg = bk.done(); bg.position.set(headT.x + 0.55, headT.y + 0.25, 0); g.add(bg); g.basket = bg; }
  g.tires = (k) => { for (const w of g.wheels) { const sq = 0.62 + 0.38 * k; w.tyre.scale.set(1 + (1 - k) * 0.08, sq, 1 + (1 - k) * 0.25); w.tyre.position.y = -(1 - sq) * (R - 0.12); } };
  g.tires(1); g.dims = { R, WB, BB, seat: seatT.clone().add(v3(-0.1, 0.6, 0)), bar: headT.clone().add(v3(-0.25, 0.6, 0)) };
  return shadowAll(g);
}

// ---------------- props ----------------
export function stepStool() { const b = new Batch(), m = paint('#ff8a5c', { roughness: 0.5 }); b.box(m, 2.0, 0.3, 1.6, 0, 1.1, 0, { r: 0.08 }); b.box(m, 2.0, 0.25, 1.0, 0, 0.55, 0.7, { r: 0.06 }); for (const x of [-0.85, 0.85]) b.box(m, 0.25, 1.1, 1.6, x, 0.55, 0.1, { r: 0.05 }); return shadowAll(b.done()); }
export function waterFountain() { const g = new THREE.Group(), b = new Batch(), st = paint('#d9dde2', { metalness: 0.75, roughness: 0.25 }); b.box(st, 2.6, 0.9, 1.8, 0, 3.0, 0.9, { r: 0.12 }); b.box(st, 2.6, 2.0, 0.3, 0, 3.2, 0.1, { r: 0.05 }); b.box(paint('#9aa3ab', { metalness: 0.8, roughness: 0.3 }), 2.0, 0.1, 1.2, 0, 3.47, 1.0, { r: 0.04 }); b.cyl(st, 0.08, 0.08, 0.35, 0, 3.6, 0.9, { seg: 8 }); b.box(paint('#2b3138'), 0.6, 0.3, 0.2, 0.9, 3.0, 1.82, { r: 0.04 }); b.done(g); const arc = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.7, roughness: 0.05 })); arc.position.set(0, 3.75, 1.18); g.add(arc); g.arc = arc; return shadowAll(g); }
export function stopPaddle() { const g = new THREE.Group(), b = new Batch(); b.cyl(paint('#d9dde2', { metalness: 0.5 }), 0.07, 0.07, 3.4, 0, 1.7, 0, { seg: 8 }); b.done(g); const s = new THREE.Mesh(new THREE.CircleGeometry(0.95, 8), new THREE.MeshStandardMaterial({ map: text('STOP', '#e8433a', '#ffffff', 256, 256, 86, { border: '#ffffff', bw: 16 }), roughness: 0.5, side: THREE.DoubleSide })); s.position.y = 3.9; s.rotation.z = Math.PI / 8; s.material.map.center.set(0.5, 0.5); s.material.map.rotation = -Math.PI / 8; g.add(s); return shadowAll(g); }
export function moneyBag() { const g = new THREE.Group(), b = new Batch(), m = paint('#c9a46a', { roughness: 0.9 }); b.add(m, new THREE.SphereGeometry(0.6, 14, 10).scale(1, 1.05, 1), 0, 0.6, 0); b.cyl(m, 0.18, 0.32, 0.35, 0, 1.3, 0, { seg: 10 }); b.add(paint('#7a5a2a'), new THREE.TorusGeometry(0.2, 0.05, 6, 12).rotateX(Math.PI / 2), 0, 1.18, 0); b.done(g); const d = plane(text('$', '#c9a46a', '#2f7a3a', 128, 128, 110), 0.6, 0.6, { transparent: false }); d.position.set(0, 0.62, 0.61); g.add(d); return shadowAll(g); }
export function stickyNote(txt = 'FOUND IT!', col = '#ffe45a') { const m = plane(text(txt, col, '#2b3138', 256, 256, 52), 0.75, 0.75, { double: true }); m.castShadow = false; return m; }
export function homework() { const g = new THREE.Group(); const sh = plane(canvasTex(256, 330, (x, W, H) => { x.fillStyle = '#fbfbf6'; x.fillRect(0, 0, W, H); x.strokeStyle = '#9fc4e8'; x.lineWidth = 2; for (let y = 50; y < H; y += 22) { x.beginPath(); x.moveTo(10, y); x.lineTo(W - 10, y); x.stroke(); } x.strokeStyle = '#ef6a6a'; x.beginPath(); x.moveTo(34, 0); x.lineTo(34, H); x.stroke(); x.fillStyle = '#2b3138'; x.font = '700 26px ITTInter, sans-serif'; x.fillText('MATH HOMEWORK', 44, 36); x.font = '400 22px ITTInter, sans-serif'; for (let i = 0; i < 9; i++) x.fillText(`${i + 1})  ${3 + i} x ${7 - (i % 4)} = ${(3 + i) * (7 - (i % 4))}`, 44, 88 + i * 22); }), 1.3, 1.67, { double: true }); g.add(sh); const n = stickyNote('FOUND|THIS!'); n.position.set(0.35, 0.55, 0.02); n.rotation.z = -0.15; n.scale.setScalar(0.85); g.add(n); return g; }
export function wrench() { const g = new THREE.Group(), b = new Batch(), m = paint('#c9ced3', { metalness: 0.85, roughness: 0.25 }); b.box(m, 0.12, 0.9, 0.05, 0, 0, 0, { r: 0.02 }); b.add(m, new THREE.TorusGeometry(0.13, 0.05, 6, 12, Math.PI * 1.4).rotateZ(-0.7 * 1), 0, 0.5, 0); b.box(paint('#e8433a', { roughness: 0.5 }), 0.16, 0.45, 0.09, 0, -0.25, 0, { r: 0.04 }); b.done(g); return shadowAll(g); }
export function pump() { const g = new THREE.Group(), b = new Batch(); b.cyl(paint('#3d8fe0', { roughness: 0.4 }), 0.2, 0.2, 2.4, 0, 1.4, 0, { seg: 12 }); b.box(paint('#2b3138'), 1.2, 0.12, 0.4, 0, 0.1, 0, { r: 0.04 }); b.cyl(paint('#2b3138'), 0.06, 0.06, 1.2, 0, 2.8, 0, { seg: 6, rz: Math.PI / 2 }); b.done(g); return shadowAll(g); }
export function appleBasket() { const g = new THREE.Group(), b = new Batch(), wk = paint('#c8935a', { roughness: 0.95 }); b.cyl(wk, 0.75, 0.55, 0.7, 0, 0.35, 0, { seg: 14 }); b.add(wk, new THREE.TorusGeometry(0.62, 0.05, 6, 16, Math.PI), 0, 0.7, 0); const r = rng(3); for (let i = 0; i < 7; i++) b.add(paint(i % 3 ? '#e8433a' : '#8fd16a', { roughness: 0.45 }), new THREE.SphereGeometry(0.22, 10, 8), (r() - 0.5) * 0.8, 0.78 + r() * 0.12, (r() - 0.5) * 0.8); b.done(g); return shadowAll(g); }
export function toolbox() { const g = new THREE.Group(), b = new Batch(); b.box(paint('#e8433a', { roughness: 0.45 }), 1.2, 0.55, 0.6, 0, 0.28, 0, { r: 0.06 }); b.add(paint('#2b3138'), new THREE.TorusGeometry(0.25, 0.04, 6, 12, Math.PI), 0, 0.56, 0); b.done(g); return shadowAll(g); }
// grease smudges on a hand: small dark blobs in the arm's space near its end
export function greaseOn(c, side, armLen) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#1d1b1a', roughness: 0.35, metalness: 0.2 }), r = rng(side + 7), s = c.spec.scale || 1;
  for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.17 + r() * 0.07, 8, 6), m); d.scale.set(1, 0.45, 1); d.position.set((r() - 0.5) * 0.45, -armLen / s + 0.15 + r() * 0.35, 0.22 + r() * 0.05); d.userData.worn = true; g.add(d); }
  c.arms[side].add(g); return g;
}
