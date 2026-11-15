// The Ink Fountains (Flower Man remake 12): Quillhaven, where fountains of ink burst from the ground and wake whatever is near.
//   nightStreet()   a street of cottages, lamps, trees, hedges and a QUILLHAVEN sign (.house = Arlo's cottage, .hedge, .lamps)
//   arloRoom()      Arlo's bedroom, open to +z: a real window hole in the back wall (the sky shows through), a doorway in the +x wall,
//                   bed (.bedAt, .bedTop, .pillow), desk, beanbag, chair, shelves, posters; .crack (the floor decal, .set(k))
//   inkFountain(o)  a glossy black geyser: lumpy pool, wobbling column, crown splashes, a cracked glowing ring; .set(t, k), .seal(s)
//   goldHeart()     an extruded glowing heart with a glow sprite; .set(k, t).  wearHeart(c) puts one on a character's chest
//   inkJar()        a glass jar with a lid (.lid) and a heart inside (.heart)
//   checkersBlanket() Checkers, a living gingham picnic blanket: .pose(t, { tremble, open, look, blink, armL, armR, hover })
//   trashCritter()  a trash can that woke up: eyes, a lid that chomps; .pose(t, { open, eyes, hop })
//   armorUp(c)      turns a procedural character into the black knight (glossy plates, a helmet on the neck: c.helmet; c.hollow)
//   knightHelmet()  a loose copy of the helmet (for Wren's hand)
//   inkDrops(parent, n) drops that fall from a moving point and leave splats: .update(t, src(t) -> Vector3 | null)
//   starField(o)    a dome of stars around the camera: .set(keep 0..1, t), .follow(camera)
//   inkHands(c)     glossy ink on both hands (.set(k)); thumbDrop(c) one small drop on the right hand
import * as THREE from 'three';
import { v3, rng, clamp, smooth } from './core.js';
import { Batch, surf, paint, lamp, sign } from './kit.js';
import { canvasTex, glowSprite } from './props.js';
import { cottage, picket, flowers } from './pastel.js';

const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } }); return g; };
function flat(mat, w, d, x, y, z) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, uv = g.attributes.uv, sp = mat.userData.span || 8;
  for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + x) / sp, (P.getZ(i) + z) / sp);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; return m;
}
export const inkMat = (o = {}) => new THREE.MeshPhysicalMaterial({ color: '#07060d', roughness: 0.09, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, emissive: o.emissive || '#3a1468', emissiveIntensity: o.ei ?? 0.16 });

// ---------------- the street ----------------
export function nightStreet() {
  const g = new THREE.Group(), b = new Batch(), r = rng(112);
  const grass = surf('grass', '#4f9a52'); grass.userData.span = 14;
  g.add(flat(grass, 1400, 1400, 0, -0.05, 0));
  g.add(flat(surf('concrete', '#555b66'), 460, 22, 0, 0.02, 0));
  for (const s of [-1, 1]) { b.box(surf('tile', '#c9c3ba'), 460, 0.3, 7, 0, 0.15, s * 15, { r: 0.05 }); b.box(paint('#a9a297'), 460, 0.36, 0.5, 0, 0.18, s * 11.4, { r: 0.08 }); }
  for (let x = -220; x < 220; x += 8) b.box(paint('#f3e7b8', { roughness: 0.5 }), 4, 0.04, 0.4, x, 0.06, 0, { r: 0.02 });
  const COLS = ['#f2b5c4', '#9fd0f2', '#b9e4ac', '#fbe08e', '#cbb8f2', '#ffc596', '#a9e6dc', '#f6c9de'];
  g.lamps = []; g.houses = [];
  let k = 0;
  for (let x = -150; x <= 150; x += 32) for (const s of [-1, 1]) {
    const own = s < 0 && x === 10;   // Arlo's cottage: north side, number 12
    const c = cottage({ wall: own ? '#9fc8f2' : COLS[k % COLS.length], seed: 60 + k, w: 22, d: 15, flowers: true, number: own ? 12 : 30 + k, door: own ? '#e2b13a' : undefined });
    c.g.position.set(x, 0, s * 36); c.g.rotation.y = s > 0 ? Math.PI : 0; g.add(c.g); g.houses.push(c); if (own) g.house = c; k++;
    if (Math.abs(x + 12) < 14 && s > 0) { /* the hedge goes here instead of a fence */ } else picket(b, x - 14, x + 14, s * 19.2, { h: 2.6 });
    const l = lamp({ height: 12, color: '#2c3a4a' }); l.position.set(x + 15, 0.3, s * 17.6); l.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(l);
    g.lamps.push(v3(x + 15 + (s > 0 ? 0 : 0), 11.5, s * 17.6 - s * 1.55));
  }
  // the hedge the three hide behind (south side, x -26..2)
  { const hm = [paint('#2f7a3c', { roughness: 0.9 }), paint('#3c8a46', { roughness: 0.9 }), paint('#286b35', { roughness: 0.9 })];
    b.box(hm[0], 28, 2.4, 2.6, -12, 1.2, 19.4, { r: 0.8 });
    for (let x = -25; x <= 1; x += 1.6) for (let j = 0; j < 2; j++) b.add(hm[(Math.floor(x) + j) & 1 ? 1 : 2], new THREE.IcosahedronGeometry(1.05 + r() * 0.3, 1), x + r() * 0.6, 1.9 + r() * 0.4, 19.4 + (j ? 0.7 : -0.7));
    g.hedge = v3(-12, 0, 19.4); }
  // round trees between the houses
  const bark = paint('#6d4c33', { roughness: 0.9 }), leaves = ['#3f8d47', '#4f9d52', '#2f7d45', '#5aa65a'].map((c) => paint(c, { roughness: 0.85 }));
  for (let x = -166; x <= 166; x += 32) for (const s of [-1, 1]) { const h = 8 + r() * 4, lx = x + (r() - 0.5) * 3, lz = s * (26 + r() * 3); b.cyl(bark, 0.6, 0.9, h, lx, h / 2, lz, { seg: 10 }); const m = leaves[Math.floor(r() * 4)]; for (const [dx, dy, rr] of [[0, h + 1.5, 4.6], [2.4, h - 0.6, 3.2], [-2.4, h - 0.3, 3.4]]) b.add(m, new THREE.IcosahedronGeometry(rr, 2), lx + dx, dy, lz); }
  // the town sign
  { const ts = sign('QUILLHAVEN\nMIND THE FOUNTAINS', { w: 10, h: 4.8, bg: '#253a6a', fg: '#ffe6a0', frame: '#ffe6a0' }); ts.position.set(-58, 5.4, -19.5); g.add(ts); for (const x of [-62.5, -53.5]) b.box(paint('#e9e2d4'), 0.4, 5.2, 0.4, x, 2.6, -19.8, { r: 0.05 }); }
  // a path from the road to Arlo's door
  b.box(surf('tile', '#bdb6aa'), 3.6, 0.2, 14, 10, 0.1, -24.5, { r: 0.05 });
  b.done(g);
  const spots = []; for (let x = -150; x <= 150; x += 6) for (const s of [-1, 1]) if (!(s > 0 && Math.abs(x + 12) < 15) && !(s < 0 && Math.abs(x - 10) < 3)) spots.push(v3(x + r() * 3, 0.5, s * 20.4));
  flowers(g, spots, {});
  return shadowAll(g);
}

// ---------------- Arlo's room ----------------
export function arloRoom() {
  const w = 36, d = 28, h = 15, T = 0.6, g = new THREE.Group(), b = new Batch();
  const wallM = paint('#8fb4d8', { roughness: 0.85 }), trim = paint('#f6f1e6', { roughness: 0.5 }), fl = surf('plank', '#a87a52');
  g.add(flat(fl, w, d, 0, 0, 0));
  // back wall with a window hole: x wx +- ww/2, y wy +- wh/2
  const wx = -1, wy = 8, ww = 8, wh = 6.4, Z = -d / 2 - T / 2;
  b.box(wallM, (wx - ww / 2) + w / 2 + T, h, T, (-w / 2 - T + wx - ww / 2) / 2, h / 2, Z, { r: 0.02 });
  b.box(wallM, w / 2 + T - (wx + ww / 2), h, T, (wx + ww / 2 + w / 2 + T) / 2, h / 2, Z, { r: 0.02 });
  b.box(wallM, ww, wy - wh / 2, T, wx, (wy - wh / 2) / 2, Z, { r: 0.02 });
  b.box(wallM, ww, h - wy - wh / 2, T, wx, (h + wy + wh / 2) / 2, Z, { r: 0.02 });
  // the outer face behind (so a camera looking through sees thickness), frame, sill, mullions, curtains
  for (const [x, y, ww2, hh] of [[wx - ww / 2 - 0.2, wy, 0.4, wh + 0.8], [wx + ww / 2 + 0.2, wy, 0.4, wh + 0.8], [wx, wy + wh / 2 + 0.2, ww + 0.8, 0.4], [wx, wy - wh / 2 - 0.2, ww + 0.8, 0.4]]) b.box(trim, ww2, hh, T + 0.3, x, y, Z, { r: 0.05 });
  b.box(trim, ww + 1.6, 0.35, 1.2, wx, wy - wh / 2 - 0.45, -d / 2 + 0.5, { r: 0.05 });
  b.box(trim, 0.2, wh, 0.2, wx, wy, Z, { r: 0.03 }); b.box(trim, ww, 0.2, 0.2, wx, wy, Z, { r: 0.03 });
  { const cu = paint('#e9b949', { roughness: 0.9 }); for (const s of [-1, 1]) b.box(cu, 1.6, wh + 1.8, 0.4, wx + s * (ww / 2 + 0.7), wy - 0.2, -d / 2 + 0.6, { r: 0.15 }); b.box(paint('#9b7a3a', { metalness: 0.6, roughness: 0.35 }), ww + 4.4, 0.18, 0.18, wx, wy + wh / 2 + 1.0, -d / 2 + 0.65, { r: 0.05 }); }
  // left wall, right wall with a doorway at z dz
  b.box(wallM, T, h, d, -w / 2 - T / 2, h / 2, 0, { r: 0.02 });
  const dz = 6, dw = 5.4, dh = 10.4, z0 = dz - dw / 2, z1 = dz + dw / 2, X = w / 2 + T / 2;
  b.box(wallM, T, h, z0 + d / 2, X, h / 2, (-d / 2 + z0) / 2, { r: 0.02 }); b.box(wallM, T, h, d / 2 - z1, X, h / 2, (z1 + d / 2) / 2, { r: 0.02 }); b.box(wallM, T, h - dh, dw, X, dh + (h - dh) / 2, dz, { r: 0.02 });
  for (const zz of [z0 - 0.2, z1 + 0.2]) b.box(trim, T + 0.5, dh + 0.3, 0.5, X, (dh + 0.3) / 2, zz, { r: 0.06 }); b.box(trim, T + 0.5, 0.5, dw + 0.9, X, dh + 0.3, dz, { r: 0.06 });
  // the landing beyond the doorway (dim), so the doorway isn't a void
  g.add(flat(surf('plank', '#8a6444'), 14, 14, X + 7, 0, dz)); b.box(paint('#6f8fb2', { roughness: 0.85 }), T, h, 14, X + 12, h / 2, dz, { r: 0.02 }); b.box(paint('#6f8fb2', { roughness: 0.85 }), 12, h, T, X + 6, h / 2, dz - 7, { r: 0.02 });
  b.box(trim, w, 0.9, 0.3, 0, 0.45, -d / 2 + 0.15, { r: 0.04 }); b.box(trim, 0.3, 0.9, d, -w / 2 + 0.15, 0.45, 0, { r: 0.04 });
  // ceiling
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(w + 2, d + 2), paint('#eef0f2', { roughness: 0.85 })); m.rotation.x = Math.PI / 2; m.position.y = h; m.castShadow = true; g.add(m); }
  // the bed against the left wall, head at -z
  const B0 = v3(-12, 0, -3.5), BW = 8.4, BL = 14, wood = surf('plank', '#5d4636'), sheet = paint('#eef0f6', { roughness: 0.85 });
  const bed = new Batch(); bed.box(wood, BW + 0.4, 1.4, BL + 0.4, 0, 0.9, 0, { r: 0.12 }); bed.box(sheet, BW, 1.1, BL, 0, 2.15, 0, { r: 0.35 });
  bed.box(wood, BW + 1.2, 6.0, 0.6, 0, 3.0, -BL / 2 - 0.4, { r: 0.14 }); bed.box(wood, BW + 1.2, 3.0, 0.6, 0, 1.5, BL / 2 + 0.4, { r: 0.12 });
  const bg = bed.done(); bg.position.copy(B0); g.add(bg); g.bed = bg; g.bedTop = 2.7; g.bedAt = B0.clone(); g.bedL = BL; g.bedW = BW;
  const pil = new Batch(); pil.box(paint('#ffffff', { roughness: 0.9 }), BW - 2.0, 1.0, 2.6, 0, 3.2, -BL / 2 + 1.8, { r: 0.45 }); const pg = pil.done(); pg.position.copy(B0); g.add(pg); g.pillow = B0.clone().add(v3(0, 3.7, -BL / 2 + 1.8));
  // the quilt: navy with little gold stars
  { const tex = canvasTex(256, 256, (x, W, H) => { x.fillStyle = '#26386e'; x.fillRect(0, 0, W, H); x.fillStyle = '#f2c94c'; const q = rng(7); for (let i = 0; i < 26; i++) { const cx = q() * W, cy = q() * H, s = 5 + q() * 5; x.beginPath(); for (let j = 0; j < 10; j++) { const a = j / 10 * Math.PI * 2 - Math.PI / 2, rr = j % 2 ? s * 0.45 : s; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); } });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 3);
    const qm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }), q = new Batch(); q.box(qm, BW + 0.4, 0.6, BL * 0.62, 0, 2.95, BL * 0.18, { r: 0.25 }); const qg = q.done(); qg.position.copy(B0); g.add(qg); g.quilt = qg; }
  // nightstand + lamp (by the bed head), the desk and chair (right back), a bookshelf, the beanbag (right front), a rug
  b.box(surf('plank', '#d9c2a0'), 3, 3, 2.4, -6.3, 1.5, -11.6, { r: 0.1 }); b.cyl(paint('#3d8fe0'), 0.45, 0.65, 1.5, -6.3, 3.75, -11.6, { seg: 14 });
  b.cyl(paint('#fff1d0', { emissive: '#ffd890', emissiveIntensity: 0.7 }), 0.7, 1.15, 1.3, -6.3, 5.1, -11.6, { seg: 18 }); g.lampAt = v3(-6.3, 5.3, -11.6);
  { const D = v3(11.5, 0, -11.2), dk = surf('plank', '#e6d6bd'); b.box(dk, 9, 0.4, 3.6, D.x, 3.6, D.z, { r: 0.08 }); for (const x of [-4.1, 4.1]) b.box(paint('#ffffff'), 0.5, 3.4, 3.2, D.x + x, 1.7, D.z, { r: 0.06 });
    for (let i = 0; i < 6; i++) b.box(paint(['#ef4f5a', '#3d8fe0', '#ffd23f', '#5fbf57', '#b26be0', '#ff8a5c'][i], { roughness: 0.6 }), 0.45, 1.6 + (i % 3) * 0.25, 1.5, D.x - 3.6 + i * 0.5, 4.6 + (i % 3) * 0.12, D.z - 0.6, { r: 0.05 });
    b.add(paint('#4aa3df', { roughness: 0.35 }), new THREE.SphereGeometry(0.85, 22, 14), D.x + 2.2, 5.2, D.z - 0.2); b.cyl(paint('#c49a45', { metalness: 0.6, roughness: 0.3 }), 0.5, 0.6, 0.35, D.x + 2.2, 3.98, D.z - 0.2);
    // chair
    const cm = paint('#e2456a', { roughness: 0.6 }); b.box(cm, 3.2, 0.5, 3.0, D.x - 1, 2.3, D.z + 3.4, { r: 0.12 }); b.box(cm, 3.2, 3.2, 0.5, D.x - 1, 4.0, D.z + 4.8, { r: 0.12 }); for (const [x, z] of [[-1.3, 2.2], [1.3, 2.2], [-1.3, 4.6], [1.3, 4.6]]) b.cyl(paint('#2f3640'), 0.12, 0.12, 2.1, D.x - 1 + x, 1.05, D.z + z, { seg: 8 });
    g.chairSeat = v3(D.x - 1, 2.55, D.z + 3.4); }
  { const bs = v3(17.2, 0, -5.5), sm = surf('plank', '#f2efe8'); for (let i = 0; i < 4; i++) b.box(sm, 2.4, 0.35, 7, bs.x, 0.2 + i * 3.2, bs.z, { r: 0.05 }); b.box(sm, 2.4, 10, 0.35, bs.x, 5, bs.z - 3.5, { r: 0.05 }); b.box(sm, 2.4, 10, 0.35, bs.x, 5, bs.z + 3.5, { r: 0.05 });
    const q = rng(3); for (let i = 0; i < 3; i++) for (let j = 0; j < 9; j++) if (q() > 0.2) b.box(paint(['#ef4f5a', '#3d8fe0', '#ffd23f', '#5fbf57', '#f3f3f3', '#26386e'][Math.floor(q() * 6)], { roughness: 0.6 }), 1.6, 1.8 + q() * 0.7, 0.5, bs.x, 0.4 + i * 3.2 + 1.0, bs.z - 3 + j * 0.68, { r: 0.04 }); }
  { const bb = new Batch(); bb.add(paint('#8a5cc8', { roughness: 0.95 }), new THREE.SphereGeometry(2.6, 28, 18).scale(1, 0.62, 1), 0, 1.6, 0); bb.add(paint('#8a5cc8', { roughness: 0.95 }), new THREE.SphereGeometry(1.9, 24, 14).scale(1, 0.9, 0.7), 0, 2.8, -1.4); const bgb = bb.done(); bgb.position.set(-3.5, 0, 10); g.add(bgb); g.beanbag = v3(-3.5, 2.5, 9.5); }
  { const rug = new THREE.Mesh(new THREE.CircleGeometry(7.2, 48), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (x, W, H) => { for (let i = 8; i > 0; i--) { x.fillStyle = i % 2 ? '#c94b4b' : '#f1d9a6'; x.beginPath(); x.arc(W / 2, H / 2, (i / 8) * W / 2, 0, 7); x.fill(); } }), roughness: 0.95 })); rug.rotation.x = -Math.PI / 2; rug.position.set(5.5, 0.03, 4.5); rug.receiveShadow = true; g.add(rug); g.rug = rug; }
  // posters: a star chart and a pennant
  { const p = new THREE.Mesh(new THREE.PlaneGeometry(5, 6.2), new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(256, 318, (x, W, H) => { x.fillStyle = '#121c46'; x.fillRect(0, 0, W, H); const q = rng(21), pts = []; for (let i = 0; i < 16; i++) pts.push([20 + q() * (W - 40), 40 + q() * (H - 90)]); x.strokeStyle = '#8fb0ff'; x.lineWidth = 2; x.beginPath(); pts.slice(0, 7).forEach(([a, c], i) => (i ? x.lineTo(a, c) : x.moveTo(a, c))); x.stroke(); x.fillStyle = '#fff3b0'; pts.forEach(([a, c]) => { x.beginPath(); x.arc(a, c, 4, 0, 7); x.fill(); }); x.font = '900 28px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('100 STARS', W / 2, H - 22); }) })); p.position.set(9.5, 8.6, -d / 2 + 0.02); g.add(p); }
  { const p = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.2), new THREE.MeshStandardMaterial({ roughness: 0.6, transparent: true, map: canvasTex(512, 200, (x, W, H) => { x.fillStyle = '#e8a33a'; x.beginPath(); x.moveTo(0, 0); x.lineTo(W, H / 2); x.lineTo(0, H); x.fill(); x.fillStyle = '#26386e'; x.font = '900 46px ITTInter, sans-serif'; x.fillText('COMETS', 30, H / 2 + 16); }) })); p.position.set(-w / 2 + 0.02, 10.5, 5); p.rotation.y = Math.PI / 2; g.add(p); }
  b.done(g);
  // the crack in the floor at the room's middle (5.5, 4.5)
  const crack = crackDecal(7.5); crack.position.set(5.5, 0.05, 4.5); g.add(crack); g.crack = crack; g.mid = v3(5.5, 0, 4.5);
  g.size = { w, d, h }; g.door = v3(X, 0, dz); g.win = v3(wx, wy, -d / 2);
  return shadowAll(g);
}

// a disc of glowing violet cracks; .set(k): 0 hidden, 1 full
function crackDecal(R = 6, seed = 5) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'), q = rng(seed);
  x.clearRect(0, 0, 512, 512); x.lineCap = 'round'; x.lineJoin = 'round';
  const branch = (px, py, a, len, wdt, depth) => { let X = px, Y = py; x.beginPath(); x.moveTo(X, Y); const n = 6; for (let i = 0; i < n; i++) { a += (q() - 0.5) * 0.9; X += Math.cos(a) * len / n; Y += Math.sin(a) * len / n; x.lineTo(X, Y); } x.lineWidth = wdt; x.stroke(); if (depth > 0) for (let j = 0; j < 2; j++) if (q() > 0.35) branch(X, Y, a + (q() - 0.5) * 1.6, len * 0.55, wdt * 0.6, depth - 1); };
  for (const [col, lw, blur] of [['rgba(170,90,255,0.55)', 3.2, 14], ['rgba(230,200,255,1)', 1, 0]]) { x.strokeStyle = col; x.shadowColor = '#b46cff'; x.shadowBlur = blur; const q0 = rng(seed); const save = q; void save; for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2 + q0() * 0.4; branch(256 + Math.cos(a) * 30, 256 + Math.sin(a) * 30, a, 120 + q0() * 90, 9 * lw / 3.2, 2); } }
  x.shadowBlur = 0; const gr = x.createRadialGradient(256, 256, 10, 256, 256, 80); gr.addColorStop(0, 'rgba(10,6,20,0.95)'); gr.addColorStop(1, 'rgba(10,6,20,0)'); x.fillStyle = gr; x.beginPath(); x.arc(256, 256, 80, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.6, 1.4, 1.9), polygonOffset: true, polygonOffsetFactor: -3 });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(R, 48), m); mesh.rotation.x = -Math.PI / 2; mesh.userData.noAO = true;
  mesh.set = (k, gold = 0) => { mesh.visible = k > 0.01; mesh.scale.setScalar(0.25 + 0.75 * clamp(k)); m.opacity = clamp(k * 1.4); m.color.setRGB(1.6 + gold * 0.9, 1.4 + gold * 0.4, 1.9 - gold * 1.4); };
  return mesh;
}

// ---------------- the fountain ----------------
export function inkFountain(o = {}) {
  const g = new THREE.Group(), R = o.r ?? 2.2, H = o.h ?? 10, q = rng(o.seed ?? 3);
  const m = inkMat(); g.mat = m;
  // the pool: a lumpy flat blob
  const sh = new THREE.Shape(); const N = 40, rr = []; for (let i = 0; i < N; i++) rr.push(1 + (q() - 0.5) * 0.35);
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2, r0 = rr[i % N] * R * 1.9; i ? sh.lineTo(Math.cos(a) * r0, Math.sin(a) * r0) : sh.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); }
  const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.3, bevelSegments: 4, curveSegments: 6 }); pg.rotateX(-Math.PI / 2);
  const pool = new THREE.Mesh(pg, m); pool.position.y = 0.04; pool.receiveShadow = true; g.add(pool);
  const ring = crackDecal(R * 3.6, (o.seed ?? 3) + 2); ring.position.y = 0.05; g.add(ring); g.ring = ring;
  // the column: a wobbling open tube, rebuilt each frame
  const cg = new THREE.CylinderGeometry(1, 1, 1, 30, 40, true); cg.translate(0, 0.5, 0); const base = cg.attributes.position.array.slice();
  const col = new THREE.Mesh(cg, m); col.castShadow = true; g.add(col);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), m); crown.castShadow = true; g.add(crown);
  // crown splashes and rising droplets
  const NS = 22, spl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), m, NS); spl.castShadow = true; spl.frustumCulled = false; g.add(spl);
  const sd = []; for (let i = 0; i < NS; i++) sd.push({ a: q() * Math.PI * 2, v: 1.6 + q() * 2.6, up: 2 + q() * 4, ph: q(), s: 0.18 + q() * 0.22, P: 1.0 + q() * 0.5 });
  const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion();
  const prof = (v) => 0.5 + 0.5 * Math.pow(1 - v, 2.2) + 0.08 * Math.sin(v * 20);
  g.k = 1; g.sealK = 0;
  g.set = (t, k = 1) => {
    g.visible = k > 0.005; if (!g.visible) return; g.k = k;
    const h = H * k, rk = R * Math.pow(k, 0.6), P = cg.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2], a = Math.atan2(bz, bx), v = by;
      const wob = 1 + 0.13 * Math.sin(a * 3 + t * 6.5 - v * 11) + 0.07 * Math.sin(a * 5 - t * 9 + v * 17) + 0.05 * Math.sin(v * 30 - t * 14);
      const r0 = rk * prof(v) * wob * (v > 0.97 ? 0.75 : 1);
      P.setXYZ(i, Math.cos(a) * r0 + Math.sin(t * 2.1 + v * 3) * 0.12 * v * rk, v * h, Math.sin(a) * r0 + Math.cos(t * 1.7 + v * 2.6) * 0.12 * v * rk);
    }
    P.needsUpdate = true; cg.computeVertexNormals(); cg.computeBoundingSphere();
    crown.position.set(Math.sin(t * 2.1 + 3) * 0.12 * rk, h, Math.cos(t * 1.7 + 2.6) * 0.12 * rk); crown.scale.set(rk * 0.95 * (1 + 0.1 * Math.sin(t * 7)), rk * 0.8 * (1 + 0.12 * Math.sin(t * 8 + 1)), rk * 0.95);
    pool.scale.set(0.35 + 0.65 * k, 1, 0.35 + 0.65 * k); ring.set(k * (1 - g.sealK * 0.5), g.sealK);
    for (let i = 0; i < NS; i++) { const d = sd[i], u = ((t / d.P + d.ph) % 1), tt = u * d.P * 1.25; const x = Math.cos(d.a) * d.v * tt * k, z = Math.sin(d.a) * d.v * tt * k, y = h + d.up * tt * k - 9.8 * tt * tt * 0.9;
      const s = d.s * rk * (1 - u * 0.5) * (y > 0.1 ? 1 : 0); M4.compose(v3(x, Math.max(0.05, y), z), Q0, v3(s, s * 1.2, s)); spl.setMatrixAt(i, M4); }
    spl.instanceMatrix.needsUpdate = true;
  };
  // the seal: violet sheen turns gold
  g.seal = (s) => { g.sealK = s; m.emissive.set('#3a1468').lerp(new THREE.Color('#ffcc33'), s); m.emissiveIntensity = 0.16 + s * 3.4; };
  g.R = R; g.H = H;
  return g;
}

// ---------------- hearts and the jar ----------------
export function goldHeart(size = 1) {
  const s = new THREE.Shape(); s.moveTo(0, -0.55); s.bezierCurveTo(-0.95, 0.05, -0.55, 0.85, 0, 0.38); s.bezierCurveTo(0.55, 0.85, 0.95, 0.05, 0, -0.55);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 3, curveSegments: 20 }); geo.center();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffd35a', emissive: '#ffb020', emissiveIntensity: 2, roughness: 0.3, metalness: 0.2 });
  const g = new THREE.Group(), h = new THREE.Mesh(geo, mat); h.scale.setScalar(size); h.userData.noAO = true; g.add(h);
  const glow = glowSprite('#ffc34a', 3.2 * size, 0.7); g.add(glow); g.mesh = h; g.mat = mat; g.glow = glow;
  g.set = (k, t = 0, flick = 0) => { const f = 1 + 0.12 * Math.sin(t * 5) + flick * (0.5 * Math.sin(t * 23) * Math.sin(t * 7.3)); g.visible = k > 0.005; mat.emissiveIntensity = (0.15 + 2.6 * k) * f; mat.color.set('#ffd35a').multiplyScalar(0.35 + 0.65 * Math.min(1, k * 1.5)); glow.material.opacity = Math.min(0.85, 0.8 * k * f); glow.scale.setScalar(size * (1.4 + 2.4 * k) * (1 + 0.06 * Math.sin(t * 5))); };
  return g;
}
const torsoBox = (c) => { const r = c.root.rotation.clone(); c.root.rotation.set(0, 0, 0); c.root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(c.torso.matrixWorld).invert(), bx = new THREE.Box3(), tmp = new THREE.Box3(), skip = [c.neck, c.head, ...c.arms, ...c.legs]; const under = (k) => { for (let p = k; p && p !== c.torso; p = p.parent) if (skip.includes(p)) return true; return false; }; c.torso.traverse((k) => { if (k.isMesh && !k.userData.worn && !under(k)) { k.geometry.computeBoundingBox(); tmp.copy(k.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld)); bx.union(tmp); } }); c.root.rotation.copy(r); c.root.updateMatrixWorld(true); return bx; };
export function wearHeart(c) {
  const B = torsoBox(c), w = B.max.x - B.min.x, hh = goldHeart(w * 0.17);
  hh.traverse((o) => { o.userData.worn = true; }); hh.position.set(B.min.x + w * 0.62, B.min.y + (B.max.y - B.min.y) * 0.68, B.max.z + 0.05); c.torso.add(hh); c.heart = hh;
  return hh;
}
export function inkJar() {
  const g = new THREE.Group(), b = new Batch();
  const glass = new THREE.MeshPhysicalMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 1.7, 32, 1, true), glass); body.position.y = 0.95; body.renderOrder = 2; g.add(body);
  b.cyl(new THREE.MeshPhysicalMaterial({ color: '#cfe6f2', transparent: true, opacity: 0.5, roughness: 0.1 }), 0.78, 0.78, 0.12, 0, 0.1, 0, { seg: 32 });
  b.cyl(paint('#c9a54a', { metalness: 0.8, roughness: 0.3 }), 0.66, 0.7, 0.16, 0, 1.82, 0, { seg: 28 });   // the rim
  b.done(g);
  const lid = new THREE.Group(), lb = new Batch(); lb.cyl(paint('#c9a54a', { metalness: 0.85, roughness: 0.28 }), 0.82, 0.82, 0.3, 0, 0.15, 0, { seg: 30 }); lb.add(paint('#c9a54a', { metalness: 0.85, roughness: 0.28 }), new THREE.SphereGeometry(0.2, 12, 8), 0, 0.38, 0); lb.done(lid); lid.position.y = 1.85; g.add(lid); g.lid = lid;
  const heart = goldHeart(0.55); heart.position.y = 0.95; g.add(heart); g.heart = heart;
  return g;
}

// ---------------- Checkers ----------------
function gingham() {
  return canvasTex(256, 256, (x, W, H) => { x.fillStyle = '#fbf6ee'; x.fillRect(0, 0, W, H); const n = 8, s = W / n; x.fillStyle = 'rgba(214,52,60,0.55)'; for (let i = 0; i < n; i += 2) { x.fillRect(i * s, 0, s, H); x.fillRect(0, i * s, W, s); } x.fillStyle = 'rgba(150,20,30,0.35)'; for (let i = 0; i < n; i += 2) for (let j = 0; j < n; j += 2) x.fillRect(i * s, j * s, s, s); });
}
export function checkersBlanket() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const tex = gingham(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 3);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, side: THREE.DoubleSide });
  const pts = []; const prof = [[0.001, 3.3], [0.55, 3.22], [0.95, 3.0], [1.22, 2.6], [1.36, 2.1], [1.42, 1.6], [1.52, 1.1], [1.75, 0.6], [2.05, 0.18], [2.2, 0.0]];
  // a smooth profile
  for (let i = 0; i <= 40; i++) { const u = i / 40 * (prof.length - 1), a = Math.floor(u), f = u - a, p0 = prof[Math.min(a, prof.length - 1)], p1 = prof[Math.min(a + 1, prof.length - 1)]; pts.push(new THREE.Vector2(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f)); }
  const geo = new THREE.LatheGeometry(pts, 48); const base = geo.attributes.position.array.slice();
  const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; mesh.receiveShadow = true; body.add(mesh);
  // eyes, pupils, lids, mouth
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }), black = new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.25 });
  const eyes = [], pupils = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), white); e.scale.set(0.3, 0.42, 0.16); e.position.set(s * 0.42, 2.45, 1.2); body.add(e); eyes.push(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), black); p.scale.set(0.13, 0.17, 0.08); p.position.set(s * 0.42, 2.42, 1.33); body.add(p); pupils.push(p); }
  const brows = []; for (const s of [-1, 1]) { const br = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.06), black); br.position.set(s * 0.44, 2.98, 1.12); body.add(br); brows.push(br); }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: '#3a0d14', roughness: 0.6 })); mouth.scale.set(0.22, 0.1, 0.06); mouth.position.set(0, 1.95, 1.36); body.add(mouth);
  // two corner flaps for hands
  const arms = [];
  for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * 1.4, 1.75, 0.1); body.add(piv); const f = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.5, 4, 1), m); f.scale.set(1, 1, 0.3); f.position.y = -0.7; f.rotation.y = Math.PI / 4; f.castShadow = true; piv.add(f); arms.push(piv); }
  g.body = body; g.arms = arms; g.eyes = eyes;
  g.pose = (t, o = {}) => {
    const tr = o.tremble ?? 0.3, P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2], a = Math.atan2(z, x), lo = clamp((1.3 - y) / 1.3);
      const rip = lo * (0.14 * Math.sin(a * 6 + t * 5) + 0.07 * Math.sin(a * 11 - t * 7)), yr = lo * 0.12 * Math.sin(a * 5 + t * 4.2);
      const rr = Math.hypot(x, z), k = rr > 1e-4 ? (rr + rip) / rr : 1; P.setXYZ(i, x * k, y + yr, z * k); }
    P.needsUpdate = true; geo.computeVertexNormals();
    const hov = o.hover ?? 0.35; body.position.set(Math.sin(t * 41) * 0.03 * tr, hov + Math.sin(t * 2.4) * 0.12, Math.cos(t * 37) * 0.02 * tr);
    body.rotation.z = Math.sin(t * 33) * 0.02 * tr; body.scale.set(1, 1 - (o.squash ?? 0) * 0.25, 1);
    const [lx, ly] = o.look || [0, 0], bl = o.blink ? 0.12 : 1, wide = 1 + (o.wide ?? 0.2) * 0.25;
    eyes.forEach((e, i) => { e.scale.set(0.3 * wide, 0.42 * bl * wide, 0.16); pupils[i].position.set((i ? 1 : -1) * 0.42 + lx * 0.11, 2.42 + ly * 0.12, 1.33); pupils[i].visible = !o.blink; });
    brows.forEach((br, i) => { br.rotation.z = (i ? -1 : 1) * (o.worry ?? 0.35); br.position.y = 2.98 + (o.worry ?? 0.35) * 0.12; });
    const op = o.open ?? 0.1; mouth.scale.set(0.22 - op * 0.05, 0.06 + op * 0.3, 0.06);
    arms.forEach((a, i) => { a.rotation.set(0, 0, 0); a.rotation.z = (i ? 1 : -1) * (o[i ? 'armR' : 'armL'] ?? 0.25); a.rotation.x = o[i ? 'armRx' : 'armLx'] ?? 0; });
  };
  g.pose(0);
  return g;
}

// ---------------- the trash can that woke up ----------------
export function trashCritter() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const b = new Batch();
  const met = paint('#6f8f86', { metalness: 0.6, roughness: 0.4 }), dark = paint('#2e3a36', { metalness: 0.5, roughness: 0.5 });
  b.cyl(met, 1.25, 1.05, 3.4, 0, 1.7, 0, { seg: 28 }); for (const y of [0.4, 1.7, 3.0]) b.cyl(dark, 1.22 + (y - 1.7) * 0.06, 1.22 + (y - 1.7) * 0.06, 0.14, 0, y, 0, { seg: 28 });
  b.cyl(paint('#140f12', { roughness: 0.7 }), 1.16, 1.16, 0.1, 0, 3.36, 0, { seg: 28 });
  for (const s of [-1, 1]) b.box(dark, 0.2, 0.25, 0.8, s * 1.32, 2.7, 0, { r: 0.08 });
  b.done(body);
  // eyes on the front, under the lid
  const ew = new THREE.MeshStandardMaterial({ color: '#fff7d0', emissive: '#ffe58a', emissiveIntensity: 0.6, roughness: 0.3 }), pb = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.3 });
  const eyes = []; for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), ew); e.scale.set(0.3, 0.36, 0.2); e.position.set(s * 0.42, 2.55, 1.12); body.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), pb); p.position.set(s * 0.42, 2.5, 1.3); body.add(p); eyes.push([e, p]); }
  // the lid, hinged at the back, with teeth
  const lid = new THREE.Group(); lid.position.set(0, 3.42, -1.25); body.add(lid);
  { const lb = new Batch(); lb.cyl(met, 1.35, 1.35, 0.22, 0, 0.1, 1.25, { seg: 28 }); lb.cyl(dark, 0.18, 0.18, 0.5, 0, 0.45, 1.25, { seg: 10 }); lb.box(dark, 0.9, 0.18, 0.18, 0, 0.72, 1.25, { r: 0.06 });
    for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.36; lb.add(paint('#f5f2e8', { roughness: 0.4 }), new THREE.ConeGeometry(0.13, 0.32, 6), Math.sin(a) * 1.1, -0.12, 1.25 + Math.cos(a) * 1.1, 0, Math.PI, 0); }
    lb.done(lid); }
  g.body = body; g.lid = lid;
  g.pose = (t, o = {}) => { const op = o.open ?? 0, ey = o.eyes ?? 1; lid.rotation.x = -op * 0.9; eyes.forEach(([e, p]) => { e.visible = p.visible = ey > 0.05; e.scale.set(0.3, 0.36 * ey, 0.2); }); const hp = o.hop ?? 0; body.position.y = hp; body.rotation.x = o.tilt ?? 0; body.rotation.z = o.roll ?? 0; };
  return shadowAll(g);
}

// ---------------- the black knight ----------------
const ARMOR = () => new THREE.MeshPhysicalMaterial({ color: '#16151d', metalness: 0.85, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.15 });
export function knightHelmet(m = ARMOR()) {
  const g = new THREE.Group(), b = new Batch(), trimM = paint('#4a3a6a', { metalness: 0.8, roughness: 0.35 });
  b.box(m, 1.62, 1.6, 1.56, 0, 0.72, 0, { r: 0.32 });
  b.box(trimM, 1.66, 0.16, 1.6, 0, 0.0, 0, { r: 0.06 });
  b.box(m, 0.22, 0.5, 1.5, 0, 1.6, -0.02, { r: 0.1 });   // crest
  b.box(paint('#050409', { roughness: 0.9 }), 1.15, 0.13, 0.12, 0, 0.82, 0.77, { r: 0.04 });   // visor slit
  b.box(paint('#050409', { roughness: 0.9 }), 0.12, 0.5, 0.12, 0, 0.5, 0.77, { r: 0.04 });
  for (const s of [-1, 1]) for (const y of [0.3, 1.1]) b.add(trimM, new THREE.SphereGeometry(0.07, 8, 6), s * 0.82, y, 0.5);
  b.done(g);
  const slit = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.07), new THREE.MeshBasicMaterial({ color: new THREE.Color('#b46cff').multiplyScalar(1.6), toneMapped: false })); slit.position.set(0, 0.82, 0.835); slit.userData.noAO = true; g.add(slit); g.slit = slit;
  return shadowAll(g);
}
export function armorUp(c) {
  const m = ARMOR(), trimM = paint('#4a3a6a', { metalness: 0.8, roughness: 0.35 });
  c.root.traverse((o) => { if (o.isMesh) { o.material = m; o.castShadow = true; } });
  c.neck.children.forEach((o) => { o.visible = false; });
  const helm = knightHelmet(m); helm.position.y = 0.0; c.neck.add(helm); c.helmet = helm;
  // plates: chest, belt, pauldrons, gauntlets, greaves
  const tb = new Batch(); tb.box(m, 2.2, 1.6, 0.3, 0, 1.15, 0.55, { r: 0.12 }); tb.box(trimM, 0.18, 1.5, 0.34, 0, 1.15, 0.6, { r: 0.05 }); tb.box(trimM, 2.15, 0.3, 1.2, 0, 0.12, 0, { r: 0.08 }); const tg = tb.done(); c.torso.add(tg);
  c.arms.forEach((a) => { const ab = new Batch(); ab.box(m, 1.35, 0.55, 1.35, 0, 0.12, 0, { r: 0.22 }); ab.box(m, 1.2, 0.35, 1.2, 0, -0.32, 0, { r: 0.12 }); ab.box(trimM, 1.08, 0.5, 1.08, 0, -1.45, 0, { r: 0.1 }); ab.done(a); });
  c.legs.forEach((l) => { const lb = new Batch(); lb.box(m, 1.12, 0.6, 1.14, 0, -1.0, 0.05, { r: 0.12 }); lb.box(trimM, 1.1, 0.14, 1.26, 0, -1.55, 0.08, { r: 0.04 }); lb.done(l); });
  // the hollow: what shows when the helmet comes off
  const hol = new THREE.Group(), hb = new Batch(); hb.box(m, 1.5, 0.35, 1.2, 0, 0.18, 0, { r: 0.12 }); hb.done(hol);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: '#030206' })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.37; hol.add(hole);
  const wisp = glowSprite('#b07cff', 2.4, 0.8); wisp.position.y = 0.6; hol.add(wisp); hol.wisp = wisp;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.07, 8, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color('#b46cff').multiplyScalar(2.2), toneMapped: false })); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.38; rim.userData.noAO = true; hol.add(rim);
  hol.visible = false; c.neck.add(hol); c.hollow = hol;
  c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  c.armor = m;
  return c;
}

// ---------------- drops ----------------
export function inkDrops(parent, n = 24, o = {}) {
  const m = inkMat({ ei: 0.12 }), P = o.period ?? 0.55, life = o.splat ?? 6;
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), m, n * 2); drops.frustumCulled = false; drops.castShadow = false; parent.add(drops);
  const q = rng(o.seed ?? 9), ph = []; for (let i = 0; i < n; i++) ph.push([q() * P * n, q()]);
  const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), Z = v3(0, -999, 0);
  drops.update = (t, src, t0 = -1e9, t1 = 1e9) => {
    let j = 0;
    for (let i = 0; i < n; i++) {
      const per = P * n, born = Math.floor((t - ph[i][0]) / per) * per + ph[i][0];
      for (const b0 of [born, born - per]) {   // the falling drop and the splat it left
        const age = t - b0, s0 = src && b0 >= t0 && b0 <= t1 ? src(b0, ph[i][1]) : null;
        if (!s0 || age < 0) { M4.compose(Z, Q0, v3(0.001, 0.001, 0.001)); drops.setMatrixAt(j++, M4); continue; }
        const y = s0.y - 0.5 * 30 * age * age, sz = (o.size ?? 0.11) * (0.7 + ph[i][1] * 0.6);
        if (y > 0.05) M4.compose(v3(s0.x, y, s0.z), Q0, v3(sz, sz * 1.5, sz));
        else if (age < life + 1) M4.compose(v3(s0.x, 0.06, s0.z), Q0, v3(sz * 2.6, 0.03, sz * 2.6));
        else M4.compose(Z, Q0, v3(0.001, 0.001, 0.001));
        drops.setMatrixAt(j++, M4);
      }
    }
    drops.instanceMatrix.needsUpdate = true;
  };
  return drops;
}

// ---------------- the stars ----------------
export function starField(o = {}) {
  const n = o.count ?? 1100, q = rng(o.seed ?? 12), pos = new Float32Array(n * 3), rank = new Float32Array(n), sz = new Float32Array(n), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) { let x, y, z; do { x = q() * 2 - 1; y = q(); z = q() * 2 - 1; } while (x * x + y * y + z * z > 1 || y < 0.04); const l = Math.hypot(x, y, z); pos.set([x / l, y / l, z / l], i * 3); rank[i] = q(); sz[i] = q() < 0.08 ? 2.2 + q() * 1.4 : 0.8 + q() * 1.1; ph[i] = q() * 6.28; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('rank', new THREE.BufferAttribute(rank, 1)); g.setAttribute('sz', new THREE.BufferAttribute(sz, 1)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { keep: { value: 1 }, t: { value: 0 }, R: { value: o.radius ?? 1800 }, color: { value: new THREE.Color('#fff6dc') }, px: { value: o.px ?? 3.4 } },
    vertexShader: `attribute float rank, sz, ph; uniform float keep, t, R, px; varying float a;
      void main(){ vec4 mv = modelViewMatrix * vec4(position * R, 1.0); gl_Position = projectionMatrix * mv;
        float on = smoothstep(rank, rank + 0.012, keep); float pop = exp(-pow((keep - rank) / 0.01, 2.0)) * step(rank, keep);
        a = on * (0.75 + 0.25 * sin(t * (1.3 + sz) + ph)) + pop * 1.5;
        gl_PointSize = px * sz * (1.0 + pop * 1.8); }`,
    fragmentShader: `uniform vec3 color; varying float a; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q); float s = smoothstep(0.5, 0.0, d); s = s * s + 0.6 * smoothstep(0.08, 0.0, min(abs(q.x), abs(q.y))) * smoothstep(0.5, 0.15, d); if (a * s < 0.01) discard; gl_FragColor = vec4(color * 1.8, a * s); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -1; p.userData.noAO = true;
  p.set = (keep, t) => { m.uniforms.keep.value = keep; m.uniforms.t.value = t; };
  p.follow = (cam) => { p.position.copy(cam.position); };
  return p;
}

// ---------------- ink on the hands ----------------
// a glossy coat over each hand (the last ~0.55 of each arm), measured from the arm's own box
export function inkHands(c) {
  const m = inkMat({ ei: 0.08 }), list = [];
  c.arms.forEach((a, i) => {
    const r = c.root.rotation.clone(); c.root.rotation.set(0, 0, 0); c.root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(a.matrixWorld).invert(), bx = new THREE.Box3(), tmp = new THREE.Box3();
    a.traverse((k) => { if (k.isMesh && !k.userData.worn) { k.geometry.computeBoundingBox(); tmp.copy(k.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld)); bx.union(tmp); } });
    c.root.rotation.copy(r); c.root.updateMatrixWorld(true);
    const w = bx.max.x - bx.min.x, d = bx.max.z - bx.min.z, hh = Math.min(0.62, (bx.max.y - bx.min.y) * 0.24);
    const g = new THREE.Group(), b = new Batch(); b.box(m, w + 0.05, hh, d + 0.05, 0, 0, 0, { r: Math.min(w, d) * 0.3 });
    const q = rng(30 + i); for (let j = 0; j < 4; j++) b.add(m, new THREE.SphereGeometry(0.07 + q() * 0.05, 8, 6), (q() - 0.5) * w, hh / 2 + 0.02 + q() * 0.08, (q() - 0.5) * d);   // splotches up the wrist
    b.done(g); g.position.set((bx.min.x + bx.max.x) / 2, bx.min.y + hh / 2 - 0.02, (bx.min.z + bx.max.z) / 2); g.traverse((o) => { o.userData.worn = true; o.castShadow = true; }); g.visible = false; a.add(g); list.push(g);
    g.handBox = bx;
  });
  c.ink = list;
  return { set: (k) => list.forEach((g) => { g.visible = k > 0.01; g.scale.set(1, Math.max(0.01, k), 1); }), list };
}
// one small drop on the side of a hand (Arlo's "thumb")
export function thumbDrop(c, side = 1) {
  const a = c.arms[side], bx = (c.ink && c.ink[side] && c.ink[side].handBox) || new THREE.Box3(v3(-0.5, -2, -0.5), v3(0.5, 0, 0.5));
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), inkMat({ ei: 0.1 })); d.scale.set(1, 1.15, 0.6);
  d.position.set(side ? bx.min.x + 0.2 : bx.max.x - 0.2, bx.min.y + 0.35, bx.max.z + 0.05); d.userData.worn = true; d.visible = false; a.add(d); c.drop = d;
  return d;
}
