// Shuffle Night (Flower Man remake 11): Dappleford, where every ten years everyone's age is shuffled overnight.
//   street()      the bright street: pastel cottages, picket fences, trees, lamps, a SHUFFLE NIGHT banner and a playground (.slide)
//   snRoom(o)     a room open to +z: floor, back / left / right walls (o.door = { z, w, h } cuts a doorway in the +x wall), ceiling, window
//   bedroom()     Rudy's room: big bed, toy shelf, posters, TV on a stand (.screen), lamp; .crib (hidden until the shuffle), .chair
//   houseRoom()   the kitchen and front hall: counters, fridge, the cookie jar up high, high chair, the bottom stair, the front door (.door) and porch
//   props: cane() controller(col) cookieJar() mug() newspaper() stroller() highChair() spoon() peaBowl() briefcase() walker() crib() blanket()
//   worn:  wearTie(c) wearApron(c) wearDiaper(c) wearScarf(c, col) wearMustache(c) wearCap(c, col) wearShades(c): each returns the group (.visible)
import * as THREE from 'three';
import { v3, rng } from './core.js';
import { Batch, surf, paint, lamp, sign } from './kit.js';
import { canvasTex } from './props.js';
import { cottage, picket, flowers, PASTEL } from './pastel.js';

const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } }); return g; };
function flat(mat, w, d, x, y, z) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, uv = g.attributes.uv, sp = mat.userData.span || 8;
  for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + x) / sp, (P.getZ(i) + z) / sp);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; return m;
}
const WHITE = () => paint('#fffaf2', { roughness: 0.5 });

// ---------------- the street ----------------
export function street() {
  const g = new THREE.Group(), b = new Batch(), r = rng(111);
  const grass = surf('grass', '#7ccf5e'); grass.userData.span = 14;
  g.add(flat(grass, 1400, 1400, 0, -0.05, 0));
  g.add(flat(surf('concrete', '#8d9096'), 460, 22, 0, 0.02, 0));
  for (const s of [-1, 1]) { b.box(surf('tile', '#ece4d6'), 460, 0.3, 7, 0, 0.15, s * 15, { r: 0.05 }); b.box(paint('#d7cfc0'), 460, 0.36, 0.5, 0, 0.18, s * 11.4, { r: 0.08 }); }
  for (let x = -220; x < 220; x += 8) b.box(paint('#fff6d8', { roughness: 0.5 }), 4, 0.04, 0.4, x, 0.06, 0, { r: 0.02 });
  // cottages both sides, a gap on the north side for the playground
  const COLS = ['#f7b9c9', '#a9d8f5', '#bfe8b2', '#fde49a', '#d5c3f6', '#ffcaa0', '#b4ece2', '#f9cfe2'];
  let k = 0;
  for (let x = -150; x <= 150; x += 32) for (const s of [-1, 1]) {
    if (s < 0 && Math.abs(x - 2) < 20) { k++; continue; }
    const c = cottage({ wall: COLS[k % COLS.length], seed: 30 + k, w: 22, d: 15, flowers: true, number: 10 + k }); c.g.position.set(x, 0, s * 36); c.g.rotation.y = s > 0 ? Math.PI : 0; g.add(c.g); k++;
    picket(b, x - 14, x + 14, s * 19.2, { h: 2.6 });
    const l = lamp({ height: 12, color: '#3a5a7a' }); l.position.set(x + 15, 0.3, s * 17.6); l.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(l);
  }
  // round blossom and green trees between the houses
  const bark = paint('#86603e', { roughness: 0.9 }), leaves = ['#5fbf57', '#7ad06a', '#f6a9c4', '#4fae55'].map((c) => paint(c, { roughness: 0.85 }));
  for (let x = -166; x <= 166; x += 32) for (const s of [-1, 1]) { const h = 8 + r() * 4, lx = x + (r() - 0.5) * 3, lz = s * (26 + r() * 3); b.cyl(bark, 0.6, 0.9, h, lx, h / 2, lz, { seg: 10 }); const m = leaves[Math.floor(r() * 4)]; for (const [dx, dy, rr] of [[0, h + 1.5, 4.6], [2.4, h - 0.6, 3.2], [-2.4, h - 0.3, 3.4]]) b.add(m, new THREE.IcosahedronGeometry(rr, 2), lx + dx, dy, lz); }
  // the banner across the street
  { for (const s of [-1, 1]) { b.cyl(paint('#e8e1d4', { metalness: 0.3 }), 0.3, 0.38, 17, 40, 8.5, s * 12.5, { seg: 12 }); }
    const bn = sign('SHUFFLE NIGHT  •  FRIDAY', { w: 26, h: 3.6, bg: '#ffd84a', fg: '#e2456a', edge: '#ffffff', frame: '#e2456a' }); bn.position.set(40, 14.6, 0); bn.rotation.y = Math.PI / 2; g.add(bn); g.banner = bn;
    const bn2 = sign('SHUFFLE NIGHT  •  FRIDAY', { w: 26, h: 3.6, bg: '#ffd84a', fg: '#e2456a', edge: '#ffffff', frame: '#e2456a' }); bn2.position.set(39.5, 14.6, 0); bn2.rotation.y = -Math.PI / 2; g.add(bn2); }
  // the town sign
  { const ts = sign('DAPPLEFORD\nPOP. ALL AGES', { w: 9, h: 4.6, bg: '#2f8f6a', fg: '#ffffff', frame: '#ffffff' }); ts.position.set(-60, 5.2, -19.5); g.add(ts); for (const x of [-64, -56]) b.box(WHITE(), 0.4, 5, 0.4, x, 2.5, -19.8, { r: 0.05 }); }
  // the playground in the gap on the north side (centre x 2, z -36)
  const PG = v3(2, 0, -38); g.add(flat(surf('sand', '#f1d9a6'), 30, 24, PG.x, 0.04, PG.z));
  b.box(paint('#e9e2d2', { roughness: 0.8 }), 30.6, 0.5, 0.6, PG.x, 0.25, PG.z + 12.1, { r: 0.1 });
  const sl = slide(); sl.position.set(PG.x - 4, 0, PG.z - 4); sl.rotation.y = -Math.PI / 2; g.add(sl); g.slide = sl;
  const sw = swings(); sw.position.set(PG.x + 8, 0, PG.z - 4); g.add(sw); g.swings = sw;
  { const bench = new Batch(), w = surf('plank', '#c9824a'); bench.box(w, 6, 0.3, 1.6, 0, 1.5, 0, { r: 0.06 }); bench.box(w, 6, 1.2, 0.3, 0, 2.4, -0.7, { r: 0.06 }); for (const x of [-2.6, 2.6]) bench.box(paint('#3b4a5c'), 0.3, 1.5, 1.4, x, 0.75, 0, { r: 0.05 }); const bb = bench.done(); bb.position.set(PG.x + 10, 0, PG.z + 7); bb.rotation.y = Math.PI; g.add(bb); }
  b.done(g);
  // flower beds along the fences
  const spots = []; for (let x = -150; x <= 150; x += 6) for (const s of [-1, 1]) if (!(s < 0 && Math.abs(x - 2) < 20)) spots.push(v3(x + r() * 3, 0.5, s * 20.4));
  flowers(g, spots, {});
  g.PG = PG; return shadowAll(g);
}

export function slide() {
  const g = new THREE.Group(), b = new Batch(), red = paint('#ef4f5a', { roughness: 0.4 }), yel = paint('#ffd23f', { roughness: 0.35, metalness: 0.1 }), blu = paint('#3d8fe0', { roughness: 0.4 });
  const H = 6; // platform height
  for (const x of [-1.6, 1.6]) for (const z of [-1.6, 1.6]) b.box(blu, 0.4, H + 3, 0.4, x, (H + 3) / 2, z, { r: 0.08 });
  b.box(red, 3.8, 0.4, 3.8, 0, H, 0, { r: 0.08 });
  for (const s of [-1, 1]) b.box(yel, 3.6, 0.3, 0.3, 0, H + 2.4, s * 1.6, { r: 0.06 });
  b.box(yel, 0.3, 0.3, 3.6, -1.6, H + 2.4, 0, { r: 0.06 });
  // ladder at -x
  for (const z of [-0.9, 0.9]) b.box(blu, 0.3, H + 0.6, 0.3, -2.6, (H + 0.6) / 2, z, { r: 0.06, rz: -0.18 });
  for (let i = 1; i < 6; i++) b.box(yel, 0.3, 0.2, 1.9, -2.6 + i * 0.18, i * 1.0, 0, { r: 0.05 });
  // the chute down +x: from (1.9, H) to (10, 0.8)
  const L = Math.hypot(8.1, H - 0.8), a = Math.atan2(H - 0.8, 8.1);
  b.box(yel, L, 0.25, 2.4, 1.9 + 4.05, (H + 0.8) / 2, 0, { rz: -a, r: 0.08 });
  for (const s of [-1, 1]) b.box(yel, L, 0.8, 0.25, 1.9 + 4.05, (H + 0.8) / 2 + 0.4, s * 1.25, { rz: -a, r: 0.08 });
  b.box(yel, 2, 0.25, 2.4, 10.8, 0.8, 0, { r: 0.08 });
  b.done(g);
  g.H = H; g.path = (u) => (u < 0.86 ? v3(1.9 + 8.1 * (u / 0.86), H - (H - 0.8) * (u / 0.86) + 0.13, 0) : v3(10 + (u - 0.86) / 0.14 * 1.4, 0.93, 0)); g.slope = a;
  return g;
}
export function swings() {
  const g = new THREE.Group(), b = new Batch(), m = paint('#3d8fe0', { roughness: 0.4 }), s = paint('#ef4f5a', { roughness: 0.5 });
  for (const x of [-5, 5]) { b.box(m, 0.35, 9.4, 0.35, x, 4.5, -2.2, { rx: 0.25, r: 0.08 }); b.box(m, 0.35, 9.4, 0.35, x, 4.5, 2.2, { rx: -0.25, r: 0.08 }); }
  b.box(m, 10.4, 0.4, 0.4, 0, 9, 0, { r: 0.1 });
  for (const x of [-2.4, 2.4]) { for (const z of [-0.5, 0.5]) b.box(paint('#9aa3ad', { metalness: 0.6 }), 0.08, 6.4, 0.08, x + z * 1.6, 5.8, 0, { r: 0.02 }); b.box(s, 2, 0.25, 0.9, x, 2.6, 0, { r: 0.06 }); }
  return b.done(g);
}

// ---------------- rooms ----------------
export function snRoom(o = {}) {
  const w = o.w ?? 34, d = o.d ?? 26, h = o.h ?? 15, g = new THREE.Group(), b = new Batch();
  const wallM = o.wallMat || paint(o.wall || '#ffe9c9', { roughness: 0.8 }), trim = paint(o.trim || '#fffaf0', { roughness: 0.5 }), fl = o.floorMat || surf('plank', o.floor || '#c79a64');
  g.add(flat(fl, w, d, 0, 0, 0));
  const T = 0.6;
  b.box(wallM, w + T * 2, h, T, 0, h / 2, -d / 2 - T / 2, { r: 0.02 });
  b.box(wallM, T, h, d, -w / 2 - T / 2, h / 2, 0, { r: 0.02 });
  if (o.door) {   // a doorway in the +x wall at z = door.z
    const { z, w: dw, h: dh } = o.door, z0 = z - dw / 2, z1 = z + dw / 2;
    b.box(wallM, T, h, z0 + d / 2, w / 2 + T / 2, h / 2, (-d / 2 + z0) / 2, { r: 0.02 });
    b.box(wallM, T, h, d / 2 - z1, w / 2 + T / 2, h / 2, (z1 + d / 2) / 2, { r: 0.02 });
    b.box(wallM, T, h - dh, dw, w / 2 + T / 2, dh + (h - dh) / 2, z, { r: 0.02 });
    for (const zz of [z0 - 0.2, z1 + 0.2]) b.box(trim, T + 0.5, dh + 0.3, 0.5, w / 2 + T / 2, (dh + 0.3) / 2, zz, { r: 0.06 });
    b.box(trim, T + 0.5, 0.5, dw + 0.9, w / 2 + T / 2, dh + 0.3, z, { r: 0.06 });
  } else b.box(wallM, T, h, d, w / 2 + T / 2, h / 2, 0, { r: 0.02 });
  // skirting and cornice
  b.box(trim, w, 0.9, 0.3, 0, 0.45, -d / 2 + 0.15, { r: 0.04 }); b.box(trim, w, 0.45, 0.3, 0, h - 0.23, -d / 2 + 0.15, { r: 0.04 });
  b.box(trim, 0.3, 0.9, d, -w / 2 + 0.15, 0.45, 0, { r: 0.04 });
  if (!o.door) b.box(trim, 0.3, 0.9, d, w / 2 - 0.15, 0.45, 0, { r: 0.04 });
  // the window in the back wall
  const wx = o.winX ?? 7, wy = o.winY ?? 7.4, ww = o.winW ?? 7.5, wh = o.winH ?? 5.8;
  b.box(trim, ww + 0.8, wh + 0.8, 0.3, wx, wy, -d / 2 + 0.15, { r: 0.05 }); b.box(trim, ww + 1.4, 0.35, 0.9, wx, wy - wh / 2 - 0.45, -d / 2 + 0.4, { r: 0.05 });
  b.done(g);
  const night = o.night;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(256, 256, (x, W, H) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#79c3ff'); gr.addColorStop(1, '#dff4ff'); x.fillStyle = gr; x.fillRect(0, 0, W, H); x.fillStyle = '#ffffff'; for (const [cx, cy, s] of [[60, 60, 26], [90, 52, 30], [180, 90, 22]]) { x.beginPath(); x.arc(cx, cy, s, 0, 7); x.fill(); } x.fillStyle = '#7fd06a'; x.fillRect(0, H * 0.78, W, H * 0.22); }) }));
  pane.material.color.setScalar(0.85); pane.position.set(wx, wy, -d / 2 + 0.33); g.add(pane); g.pane = pane;
  const npane = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(256, 256, (x, W, H) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d1640'); gr.addColorStop(1, '#2b3d7a'); x.fillStyle = gr; x.fillRect(0, 0, W, H); x.fillStyle = '#fffbe0'; const r = rng(4); for (let i = 0; i < 40; i++) x.fillRect(r() * W, r() * H * 0.7, 2, 2); x.beginPath(); x.arc(190, 60, 22, 0, 7); x.fill(); x.fillStyle = '#16204a'; x.fillRect(0, H * 0.8, W, H * 0.2); }) }));
  npane.position.copy(pane.position); npane.position.z += 0.01; npane.visible = false; g.add(npane); g.npane = npane;
  { const b2 = new Batch(); b2.box(trim, 0.22, wh, 0.12, wx, wy, -d / 2 + 0.42, { r: 0.02 }); b2.box(trim, ww, 0.22, 0.12, wx, wy, -d / 2 + 0.42, { r: 0.02 }); const cu = paint(o.curtain || '#ef8ea3', { roughness: 0.85 }); for (const s of [-1, 1]) b2.box(cu, 1.4, wh + 1.4, 0.35, wx + s * (ww / 2 + 0.5), wy - 0.1, -d / 2 + 0.55, { r: 0.12 }); b2.box(paint('#c49a45', { metalness: 0.7, roughness: 0.3 }), ww + 4, 0.18, 0.18, wx, wy + wh / 2 + 0.95, -d / 2 + 0.6, { r: 0.05 }); b2.done(g); }
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(w + 2, d + 2), paint(o.ceil || '#fffaf0', { roughness: 0.85 })); m.rotation.x = Math.PI / 2; m.position.y = h; m.castShadow = true; m.receiveShadow = true; g.add(m); }
  g.size = { w, d, h }; return g;
}

function stripes(c1, c2, n = 8) { return canvasTex(256, 256, (x, W, H) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? c2 : c1; x.fillRect(0, (i * H) / n, W, H / n + 1); } }); }
function poster(draw, w, h) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: canvasTex(256, Math.round(256 * h / w), draw), roughness: 0.6 })); m.receiveShadow = true; return m; }

// the TV picture: a bright cartoon racing game, or paused
export function gameScreen() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 180; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const draw = (k, paused) => {
    const x = c.getContext('2d'), W = 320, H = 180, o = (k * 140) % 80;
    const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5ec8ff'); sky.addColorStop(1, '#d8f4ff'); x.fillStyle = sky; x.fillRect(0, 0, W, H);
    x.fillStyle = '#67d05a'; x.fillRect(0, H * 0.55, W, H); x.fillStyle = '#6a6d78'; x.beginPath(); x.moveTo(W * 0.42, H * 0.55); x.lineTo(W * 0.58, H * 0.55); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    x.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { const y = H * 0.56 + ((i * 20 + o) % 80) * (H * 0.44 / 80); const s = (y - H * 0.55) / (H * 0.45); x.fillRect(W / 2 - 2 - s * 3, y, 4 + s * 6, 3 + s * 8); }
    x.fillStyle = '#ff4f6a'; x.fillRect(W * 0.44, H * 0.74, W * 0.12, H * 0.13); x.fillStyle = '#ffd23f'; x.fillRect(W * 0.46, H * 0.7, W * 0.08, H * 0.06);
    x.fillStyle = '#ffffff'; x.font = '900 18px sans-serif'; x.fillText('LAP 2/3', 10, 22);
    if (paused) { x.fillStyle = 'rgba(20,20,60,0.55)'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffffff'; x.font = '900 30px sans-serif'; x.textAlign = 'center'; x.fillText('PAUSED', W / 2, H / 2 + 10); x.textAlign = 'left'; }
    t.needsUpdate = true;
  };
  draw(0, false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.userData.noAO = true;
  let last = ''; m.set = (k, paused) => { const key = (paused ? 'p' : Math.floor(k * 12)); if (key !== last) { last = key; draw(Math.floor(k * 12) / 12, paused); } };
  return m;
}

export function bedroom() {
  const g = snRoom({ w: 36, d: 28, h: 15, wall: '#cfe8ff', curtain: '#ffcf4a', floor: '#c99a66', winX: -6 }), b = new Batch();
  // wall stripes and posters
  { const p = poster((x, W, H) => { x.fillStyle = '#ff6b6b'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; x.font = '900 46px sans-serif'; x.textAlign = 'center'; x.fillText('RACE', W / 2, H * 0.3); x.fillText('KINGS', W / 2, H * 0.52); x.fillStyle = '#ffd23f'; x.fillRect(W * 0.2, H * 0.66, W * 0.6, H * 0.18); }, 4, 5.4); p.position.set(6, 8.6, -13.68); g.add(p); }
  { const p = poster((x, W, H) => { x.fillStyle = '#2f5fd0'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffd23f'; for (let i = 0; i < 18; i++) { x.beginPath(); x.arc((i * 53) % W, (i * 97) % H, 6, 0, 7); x.fill(); } x.fillStyle = '#fff'; x.font = '900 40px sans-serif'; x.textAlign = 'center'; x.fillText('SPACE', W / 2, H / 2); }, 4.4, 3.4); p.position.set(12.5, 9.6, -13.68); g.add(p); }
  // the big bed against the left wall, head at -z
  const B0 = v3(-11, 0, -4), W = 9, L = 15, wood = surf('plank', '#d79b5c'), cover = paint('#ff8a5c', { roughness: 0.9 }), sheet = paint('#f6f4ee', { roughness: 0.85 });
  const bed = new Batch(); bed.box(wood, W + 0.4, 1.4, L + 0.4, 0, 0.9, 0, { r: 0.12 }); bed.box(sheet, W, 1.1, L, 0, 2.15, 0, { r: 0.35 });
  bed.box(wood, W + 1.2, 6.2, 0.6, 0, 3.1, -L / 2 - 0.4, { r: 0.14 }); bed.box(wood, W + 1.2, 3.2, 0.6, 0, 1.6, L / 2 + 0.4, { r: 0.12 });
  bed.box(paint('#ffffff', { roughness: 0.9 }), W - 1.6, 1.1, 2.6, 0, 3.1, -L / 2 + 1.7, { r: 0.45 });
  const bg = bed.done(); bg.position.copy(B0); g.add(bg); g.bed = bg; g.bedTop = 2.7; g.bedAt = B0.clone(); g.bedL = L; g.bedW = W;
  const quilt = new Batch(); quilt.box(cover, W + 0.3, 0.6, L * 0.62, 0, 2.95, L * 0.18, { r: 0.25 }); for (let i = 0; i < 5; i++) quilt.box(paint('#ffd36a', { roughness: 0.9 }), W + 0.32, 0.06, 0.5, 0, 3.27, -0.8 + i * 1.8, { r: 0.02 }); const qg = quilt.done(); qg.position.copy(B0); g.add(qg); g.quilt = qg;
  // toy shelf on the back wall, right
  { const S = v3(13, 0, -12.6), sh = surf('plank', '#f2f2f2'); b.box(sh, 8, 0.4, 2.2, S.x, 3.2, S.z, { r: 0.05 }); b.box(sh, 8, 0.4, 2.2, S.x, 6.0, S.z, { r: 0.05 }); for (const x of [-3.8, 3.8]) b.box(sh, 0.4, 6.4, 2.2, S.x + x, 3.2, S.z, { r: 0.05 }); b.box(sh, 8, 0.4, 2.2, S.x, 0.2, S.z, { r: 0.05 });
    const cols = ['#ef4f5a', '#3d8fe0', '#ffd23f', '#5fbf57', '#b26be0']; for (let i = 0; i < 5; i++) b.box(paint(cols[i], { roughness: 0.5 }), 1.1, 1.3 + (i % 2) * 0.4, 1.1, S.x - 2.8 + i * 1.4, 4.1 + (i % 2) * 0.2, S.z, { r: 0.18 }); b.cyl(paint('#ff8a5c'), 0.9, 0.9, 1.8, S.x - 2, 1.3, S.z, { seg: 18 }); b.box(paint('#3d8fe0'), 2.2, 1.2, 1.4, S.x + 1.6, 1.0, S.z, { r: 0.3 }); }
  // rug
  { const rug = new THREE.Mesh(new THREE.CircleGeometry(7.5, 40), new THREE.MeshStandardMaterial({ map: stripes('#8fd3ff', '#ffffff', 10), roughness: 0.95 })); rug.rotation.x = -Math.PI / 2; rug.position.set(3, 0.04, 2); rug.receiveShadow = true; g.add(rug); }
  // the TV on a low stand against the right wall, screen facing -x
  const TV = v3(17.2, 0, 1.5); b.box(surf('plank', '#ffffff'), 2.6, 2.6, 8, TV.x - 0.5, 1.3, TV.z, { r: 0.1 }); b.box(paint('#1b1d22', { roughness: 0.35 }), 0.5, 4.2, 7.0, TV.x - 0.6, 5.1, TV.z, { r: 0.1 }); b.box(paint('#2a2d33'), 0.6, 0.6, 1.6, TV.x - 0.6, 2.9, TV.z, { r: 0.05 });
  b.box(paint('#f4f4f4', { roughness: 0.3 }), 1.4, 0.5, 2.4, TV.x - 0.6, 2.85, TV.z + 2.8, { r: 0.1 });   // the console
  const scr = gameScreen(); scr.scale.set(6.6, 3.8, 1); scr.rotation.y = -Math.PI / 2; scr.position.set(TV.x - 0.87, 5.1, TV.z); g.add(scr); g.screen = scr; g.tv = TV;
  // a lamp on a bedside table
  { const T = v3(-17, 0, -13); b.box(surf('plank', '#ffffff'), 3, 3, 2.4, -4.3, 1.5, -12.4, { r: 0.1 }); b.cyl(paint('#ffd23f'), 0.5, 0.7, 1.6, -4.3, 3.8, -12.4, { seg: 14 }); b.cyl(paint('#fff1d0', { emissive: '#ffd890', emissiveIntensity: 0.6 }), 0.7, 1.2, 1.4, -4.3, 5.2, -12.4, { seg: 18 }); g.lampAt = v3(-4.3, 5.6, -12.4); void T; }
  // the armchair beside the crib spot (for old Oskar), facing the TV
  const ch = new Batch(), cc = paint('#7a5fc4', { roughness: 0.9 }); ch.box(cc, 4.2, 1.6, 4.0, 0, 1.4, 0, { r: 0.4 }); ch.box(cc, 4.2, 4.4, 1.0, 0, 2.8, -1.8, { r: 0.4 }); for (const s of [-1, 1]) ch.box(cc, 0.9, 2.8, 4.0, s * 2.1, 2.0, 0, { r: 0.35 }); for (const x of [-1.8, 1.8]) for (const z of [-1.6, 1.6]) ch.box(paint('#3a2c20'), 0.3, 0.6, 0.3, x, 0.3, z, { r: 0.05 });
  const cg = ch.done(); g.add(cg); g.chair = cg; g.chair.seatY = 2.2; cg.visible = false;
  b.done(g);
  const cr = crib(); cr.position.set(-8, 0, -6); g.add(cr); g.crib = cr; cr.visible = false;
  const nl = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc46a').multiplyScalar(2.2) })); nl.position.set(-14.5, 1.6, -13.4); nl.userData.noAO = true; g.add(nl); g.nightlight = nl;
  return shadowAll(g);
}

export function crib() {
  const g = new THREE.Group(), b = new Batch(), w = paint('#ffffff', { roughness: 0.45 }), pink = paint('#9fd6ff', { roughness: 0.9 }), W = 5.2, L = 8, top = 2.6, rail = 5.6;
  b.box(w, W + 0.4, 0.5, L + 0.4, 0, top - 0.5, 0, { r: 0.1 }); b.box(pink, W, 0.7, L, 0, top - 0.05, 0, { r: 0.25 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(w, 0.45, rail + 0.6, 0.45, sx * (W / 2 + 0.2), (rail + 0.6) / 2, sz * (L / 2 + 0.2), { r: 0.1 });
  const nb = new Batch();
  for (const s of [-1, 1]) { const q = s > 0 ? nb : b; q.box(w, 0.3, 0.4, L - 0.6, s * (W / 2 + 0.2), rail, 0, { r: 0.08 }); q.box(w, 0.3, 0.3, L - 0.6, s * (W / 2 + 0.2), top - 0.1, 0, { r: 0.06 }); for (let i = 0; i < 11; i++) q.box(w, 0.16, rail - top, 0.16, s * (W / 2 + 0.2), (rail + top) / 2, -L / 2 + 0.4 + i * (L - 0.8) / 10, { r: 0.04 }); }
  const side = nb.done(); g.add(side); g.drop = (k) => { side.position.y = -2.1 * k; };   // the near side slides down, as a drop-side crib's does
  for (const s of [-1, 1]) { b.box(w, W + 0.4, 0.4, 0.3, 0, rail, s * (L / 2 + 0.2), { r: 0.08 }); b.box(w, W + 0.4, rail - top, 0.25, 0, (rail + top) / 2, s * (L / 2 + 0.2), { r: 0.06 }); }
  b.box(paint('#ffffff', { roughness: 0.9 }), 3, 0.6, 1.6, 0, top + 0.55, -L / 2 + 1.2, { r: 0.28 });
  b.done(g);
  // a mobile over it
  const mob = new THREE.Group(); mob.position.set(0, 9.2, 0); const cols = ['#ffd23f', '#ef4f5a', '#5fbf57', '#3d8fe0']; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), paint(cols[i], { roughness: 0.5 })); s.position.set(Math.cos(a) * 1.4, -1.2, Math.sin(a) * 1.4); mob.add(s); } { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), paint('#ffffff')); bar.position.set(0, 2, 0); mob.add(bar); }
  g.add(mob); g.mobile = mob;
  g.top = top + 0.3; g.rail = rail; g.W = W; g.L = L; return g;
}
export function blanket() { const b = new Batch(); b.box(paint('#ffd36a', { roughness: 0.92 }), 4.9, 0.36, 4.6, 0, 0, 0, { r: 0.16 }); for (let i = 0; i < 4; i++) b.box(paint('#ffffff', { roughness: 0.9 }), 4.92, 0.05, 0.3, 0, 0.18, -1.6 + i * 1.07, { r: 0.02 }); return b.done(); }

// the kitchen and the front hall: one long room open to +z; the front door is in the +x wall at z -2, the porch outside it
export function houseRoom() {
  const D = { z: -3, w: 5.4, h: 10.2 };
  const g = snRoom({ w: 50, d: 28, h: 15, wall: '#fff0b8', curtain: '#5fc0e8', floor: '#d8a76c', winX: -14, door: D, trim: '#ffffff' }), b = new Batch(), r = rng(9);
  const cab = paint('#7fd0c4', { roughness: 0.55 }), top = paint('#fffaf2', { roughness: 0.3 }), wood = surf('plank', '#c99060');
  // counters along the back wall, left half
  b.box(cab, 20, 3.4, 3.2, -14, 1.7, -12.4, { r: 0.12 }); b.box(top, 20.6, 0.3, 3.6, -14, 3.55, -12.3, { r: 0.08 });
  for (let i = 0; i < 6; i++) { b.box(paint('#9fe0d6', { roughness: 0.5 }), 3, 2.6, 0.12, -22.5 + i * 3.4, 1.8, -10.77, { r: 0.05 }); b.box(paint('#e8eef2', { metalness: 0.7, roughness: 0.3 }), 0.8, 0.16, 0.2, -22.5 + i * 3.4, 2.7, -10.68, { r: 0.04 }); }
  b.box(cab, 12, 3.4, 1.8, -18, 10.8, -13.1, { r: 0.12 }); // upper cabinets
  for (let i = 0; i < 3; i++) b.box(paint('#9fe0d6', { roughness: 0.5 }), 3.6, 3.0, 0.12, -22 + i * 4, 10.8, -12.15, { r: 0.05 });
  // the fridge and the tall shelf with the cookie jar on it
  const FR = v3(-1.2, 0, -11.8); b.box(paint('#f3f5f7', { metalness: 0.3, roughness: 0.3 }), 5.2, 11, 4, FR.x, 5.5, FR.z, { r: 0.35 }); b.box(paint('#c9d2da', { metalness: 0.6, roughness: 0.3 }), 0.25, 3.2, 0.3, FR.x + 2.0, 7.5, FR.z + 2.1, { r: 0.08 }); b.box(paint('#c9d2da', { metalness: 0.6, roughness: 0.3 }), 0.25, 2.2, 0.3, FR.x + 2.0, 3.4, FR.z + 2.1, { r: 0.08 }); b.box(paint('#e1e6ea'), 5.0, 0.12, 0.1, FR.x, 5.2, FR.z + 2.02, { r: 0.02 });
  // magnets and a kid's drawing on the fridge
  { const p = poster((x, W, H) => { x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.strokeStyle = '#ef4f5a'; x.lineWidth = 8; x.beginPath(); x.arc(W * 0.35, H * 0.4, 30, 0, 7); x.stroke(); x.strokeStyle = '#3d8fe0'; x.beginPath(); x.arc(W * 0.68, H * 0.42, 34, 0, 7); x.stroke(); x.fillStyle = '#333'; x.font = '900 30px sans-serif'; x.fillText('ME + MOM', 30, H - 20); }, 2.2, 2.6); p.position.set(FR.x - 0.7, 7.8, FR.z + 2.06); g.add(p); }
  const SH = v3(-1.2, 12.0, -12.4); b.box(wood, 6.4, 0.35, 2.6, SH.x, SH.y, SH.z, { r: 0.06 }); for (const x of [-2.6, 2.6]) b.box(paint('#ffffff'), 0.3, 0.9, 1.8, SH.x + x, SH.y - 0.6, SH.z - 0.2, { r: 0.05 });
  const jar = cookieJar(); jar.position.set(SH.x, SH.y + 0.18, SH.z + 0.2); g.add(jar); g.jar = jar;
  // the table in the middle
  const TB = v3(-12, 0, 1); b.box(wood, 10, 0.4, 6, TB.x, 3.6, TB.z, { r: 0.1 }); for (const [x, z] of [[-4.4, -2.4], [4.4, -2.4], [-4.4, 2.4], [4.4, 2.4]]) b.box(paint('#ffffff'), 0.4, 3.4, 0.4, TB.x + x, 1.7, TB.z + z, { r: 0.08 });
  b.add(paint('#ef4f5a', { roughness: 0.4 }), new THREE.CylinderGeometry(0.9, 0.7, 0.9, 18), TB.x - 2, 4.25, TB.z); for (let i = 0; i < 5; i++) b.add(paint(['#ffd23f', '#ef4f5a', '#5fbf57'][i % 3], { roughness: 0.5 }), new THREE.SphereGeometry(0.4, 12, 8), TB.x - 2 + Math.cos(i * 1.3) * 0.45, 4.85, TB.z + Math.sin(i * 1.3) * 0.45);
  g.table = TB;
  // the bottom stair, by the left wall (the grounded step)
  const ST = v3(-21, 0, 8); for (let i = 0; i < 4; i++) b.box(surf('plank', '#a8774a'), 6, 1.1 * (i + 1), 2.2, ST.x, 0.55 * (i + 1), ST.z - i * 2.2 - 1.1 + 2.2, { r: 0.08 });
  b.box(paint('#ffffff'), 0.3, 5, 0.3, ST.x + 3, 2.5, ST.z + 1.1, { r: 0.06 });
  g.step = v3(ST.x, 1.1, ST.z + 1.1); g.stepY = 1.1;
  // a coat rack and a mat by the door; the door itself, hinged at its -z edge, opening inward (+x into the room is outward... it swings into the room)
  b.box(paint('#e45a7a', { roughness: 0.9 }), 3.6, 0.1, 5.2, 21, 0.06, D.z, { r: 0.04 });
  for (let i = 0; i < 3; i++) b.box(paint(['#ffd23f', '#3d8fe0', '#ef4f5a'][i], { roughness: 0.85 }), 1.2, 2.6, 0.9, 24.4, 9 - (i % 2) * 0.4, -8.5 + i * 1.4, { r: 0.3 });
  b.box(wood, 0.5, 0.4, 6, 24.6, 10.3, -7, { r: 0.05 });
  // pictures
  { const p = poster((x, W, H) => { x.fillStyle = '#ffe3ef'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffb347'; x.beginPath(); x.arc(W / 2, H * 0.45, 50, 0, 7); x.fill(); x.fillStyle = '#5fbf57'; x.fillRect(0, H * 0.7, W, H * 0.3); }, 4, 3); p.position.set(10, 8.5, -13.68); g.add(p); }
  b.done(g);
  const dg = new THREE.Group(); dg.position.set(25.3, 0, D.z - D.w / 2 + 0.1); g.add(dg); g.door = dg;
  { const d2 = new Batch(); d2.box(paint('#e2456a', { roughness: 0.4 }), 0.4, D.h - 0.1, D.w - 0.2, 0, (D.h - 0.1) / 2, (D.w - 0.2) / 2, { r: 0.06 }); for (const [y, h] of [[2.8, 3.2], [7.2, 3.2]]) d2.box(paint('#c73a5c', { roughness: 0.45 }), 0.5, h, D.w - 1.4, 0, y, (D.w - 0.2) / 2, { r: 0.08 }); d2.add(paint('#e8c25a', { metalness: 0.8, roughness: 0.3 }), new THREE.SphereGeometry(0.28, 12, 8), -0.4, 5, D.w - 0.8); d2.done(dg); }
  // the porch outside: boards, steps, posts, bushes, a lawn and the street's sky
  const P = new Batch(), deck = surf('plank', '#d9c3a0'); P.box(deck, 16, 0.6, 18, 34, 0.3, D.z, { r: 0.06 }); for (let i = 0; i < 2; i++) P.box(deck, 3, 0.3 + i * 0, 18, 43.5 + i * 2.8, 0.15, D.z, { r: 0.05 });
  for (const z of [-11, 5]) P.box(paint('#ffffff'), 0.6, 12, 0.6, 41.5, 6, D.z + z + 3, { r: 0.08 });
  P.box(paint('#ffffff'), 0.6, 0.5, 18, 41.5, 12, D.z, { r: 0.06 });
  const grass = surf('grass', '#7ccf5e'); grass.userData.span = 14; g.add(flat(grass, 300, 300, 120, -0.04, D.z));
  for (const [x, z, s] of [[30, -14, 2.6], [30, 9, 2.4], [50, -18, 3.2], [52, 16, 3]]) P.add(paint('#4fae55', { roughness: 0.85 }), new THREE.IcosahedronGeometry(s, 2), x, s * 0.75, z);
  { const c = cottage({ wall: '#a9d8f5', seed: 77, w: 22, d: 15, flowers: true, number: 23 }); c.g.position.set(96, 0, D.z + 4); c.g.rotation.y = -Math.PI / 2; g.add(c.g); }
  { const z0 = D.z - D.w / 2 - 0.45, z1 = D.z + D.w / 2 + 0.45, wm = paint('#fffaf2'), X = 25.35 + 0.6;   // the outer face of the wall, with the doorway left open
    P.box(wm, 0.4, 12, z0 + 17, X, 6, (z0 - 17) / 2, { r: 0.02 }); P.box(wm, 0.4, 12, 17 - z1, X, 6, (z1 + 17) / 2, { r: 0.02 }); P.box(wm, 0.4, 12 - D.h - 0.5, z1 - z0, X, (12 + D.h + 0.5) / 2, D.z, { r: 0.02 }); }
  P.done(g);
  // the doorbell button outside, and its plate
  g.bell = v3(26.0, 5.4, D.z + D.w / 2 + 0.9);
  g.D = D; g.porch = v3(31.5, 0.6, D.z);
  const hc = highChair(); hc.position.set(-4, 0, 3); g.add(hc); g.highChair = hc;
  return shadowAll(g);
}

// ---------------- props ----------------
export function cookieJar() { const g = new THREE.Group(), b = new Batch(); b.cyl(paint('#f7e2c2', { roughness: 0.25 }), 1.0, 1.1, 2.0, 0, 1.0, 0, { seg: 22 }); b.cyl(paint('#e9a15a', { roughness: 0.35 }), 1.05, 1.05, 0.35, 0, 2.15, 0, { seg: 22 }); b.add(paint('#e9a15a'), new THREE.SphereGeometry(0.32, 12, 8), 0, 2.45, 0); for (let i = 0; i < 5; i++) b.add(paint('#8a5a2e', { roughness: 0.8 }), new THREE.CylinderGeometry(0.42, 0.42, 0.12, 14), Math.cos(i) * 0.3, 1.0 + i * 0.12, 1.02, 0, Math.PI / 2); b.done(g); const lab = poster((x, W, H) => { x.fillStyle = '#ef4f5a'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; x.font = '900 70px sans-serif'; x.textAlign = 'center'; x.fillText('COOKIES', W / 2, H * 0.68); }, 1.6, 0.55); lab.position.set(0, 1.3, 1.12); g.add(lab); return shadowAll(g); }
export function cane() { const b = new Batch(), m = paint('#7a4a26', { roughness: 0.5 }); b.cyl(m, 0.09, 0.1, 3.6, 0, -1.8, 0, { seg: 10 }); const tor = new THREE.TorusGeometry(0.32, 0.09, 8, 16, Math.PI); b.add(m, tor, 0.32, 0, 0); b.cyl(paint('#222'), 0.12, 0.12, 0.2, 0, -3.6, 0, { seg: 10 }); return shadowAll(b.done()); }
export function controller(col = '#2f3640') { const g = new THREE.Group(), b = new Batch(), m = paint(col, { roughness: 0.35 }); b.box(m, 1.5, 0.32, 0.8, 0, 0, 0, { r: 0.14 }); for (const s of [-1, 1]) b.box(m, 0.55, 0.34, 0.75, s * 0.68, 0, 0.3, { r: 0.2 }); for (const [x, c] of [[0.42, '#ef4f5a'], [0.6, '#5fbf57'], [0.5, '#3d8fe0']]) b.cyl(paint(c), 0.08, 0.08, 0.1, x, 0.18, -0.08 + (x === 0.6 ? 0.1 : 0), { seg: 10 }); b.box(paint('#111'), 0.36, 0.06, 0.12, -0.45, 0.18, -0.05, { r: 0.02 }); b.box(paint('#111'), 0.12, 0.06, 0.36, -0.45, 0.18, -0.05, { r: 0.02 }); b.done(g); return shadowAll(g); }
export function mug() { const b = new Batch(); b.cyl(paint('#3d8fe0', { roughness: 0.3 }), 0.34, 0.3, 0.7, 0, 0.35, 0, { seg: 16 }); b.add(paint('#3d8fe0', { roughness: 0.3 }), new THREE.TorusGeometry(0.2, 0.06, 6, 12), 0.36, 0.38, 0, 0, 0, 0); b.cyl(paint('#4a2a14', { roughness: 0.2 }), 0.3, 0.3, 0.04, 0, 0.66, 0, { seg: 16 }); return shadowAll(b.done()); }
export function newspaper() {
  const tex = canvasTex(512, 360, (x, W, H) => { x.fillStyle = '#f2efe6'; x.fillRect(0, 0, W, H); x.fillStyle = '#222'; x.font = '900 46px serif'; x.textAlign = 'center'; x.fillText('THE DAPPLEFORD DAILY', W / 2, 54); x.fillRect(20, 66, W - 40, 4); x.font = '900 38px sans-serif'; x.fillText('SHUFFLE TONIGHT!', W / 2, 116); x.fillStyle = '#aaa'; for (let i = 0; i < 10; i++) { x.fillRect(24, 140 + i * 20, 220, 9); x.fillRect(268, 140 + i * 20, 220, 9); } });
  tex.center.set(0.5, 0.5); tex.rotation = Math.PI;   // upside down: Oskar holds it wrong
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.0), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 })); m.castShadow = true; return m;
}
export function spoon() { const b = new Batch(), m = paint('#d9dde2', { metalness: 0.8, roughness: 0.25 }); b.box(m, 0.1, 0.06, 1.3, 0, 0, -0.4, { r: 0.02 }); b.add(m, new THREE.SphereGeometry(0.2, 10, 6).scale(1, 0.4, 1.3), 0, 0, 0.35); b.add(paint('#6cc04a', { roughness: 0.6 }), new THREE.SphereGeometry(0.1, 8, 6), 0, 0.07, 0.35); b.add(paint('#6cc04a', { roughness: 0.6 }), new THREE.SphereGeometry(0.09, 8, 6), 0.08, 0.07, 0.42); return shadowAll(b.done()); }
export function peaBowl() { const b = new Batch(); b.cyl(paint('#ffd23f', { roughness: 0.35 }), 0.8, 0.5, 0.55, 0, 0.28, 0, { seg: 18 }); b.cyl(paint('#6cc04a', { roughness: 0.6 }), 0.72, 0.72, 0.05, 0, 0.5, 0, { seg: 18 }); return shadowAll(b.done()); }
export function briefcase() { const b = new Batch(), m = paint('#6b3f22', { roughness: 0.5 }); b.box(m, 1.8, 1.3, 0.5, 0, 0, 0, { r: 0.1 }); b.add(paint('#d8b04a', { metalness: 0.8 }), new THREE.TorusGeometry(0.28, 0.06, 6, 12, Math.PI), 0, 0.65, 0); return shadowAll(b.done()); }
export function walker() { const b = new Batch(), m = paint('#c9d2da', { metalness: 0.7, roughness: 0.3 }); for (const x of [-1.1, 1.1]) for (const z of [-0.7, 0.7]) b.cyl(m, 0.08, 0.08, 3.2, x, 1.6, z, { seg: 8 }); for (const x of [-1.1, 1.1]) b.cyl(m, 0.09, 0.09, 1.5, x, 3.2, 0, { seg: 8, rx: Math.PI / 2 }); b.cyl(m, 0.08, 0.08, 2.2, 0, 2.6, -0.7, { seg: 8, rz: Math.PI / 2 }); for (const x of [-1.1, 1.1]) b.add(paint('#c8e23a', { roughness: 0.9 }), new THREE.SphereGeometry(0.3, 10, 8), x, 0.3, 0.7); return shadowAll(b.done()); }
export function highChair() { const g = new THREE.Group(), b = new Batch(), w = paint('#ffffff', { roughness: 0.4 }), c = paint('#ff8a5c', { roughness: 0.6 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(w, 0.3, 4.4, 0.3, sx * 1.2, 2.2, sz * 1.2, { r: 0.06, rx: -sz * 0.08, rz: sx * 0.08 }); b.box(c, 2.4, 0.4, 2.2, 0, 4.4, 0, { r: 0.12 }); b.box(c, 2.4, 2.6, 0.35, 0, 5.6, -1.0, { r: 0.12 }); for (const s of [-1, 1]) b.box(w, 0.3, 0.9, 2.0, s * 1.3, 5.0, 0, { r: 0.08 }); b.box(w, 3.0, 0.25, 1.6, 0, 5.5, 1.5, { r: 0.1 }); b.done(g); g.seatY = 4.6; g.tray = v3(0, 5.65, 1.5); return shadowAll(g); }
export function stroller() { const g = new THREE.Group(), b = new Batch(), f = paint('#2f3640', { metalness: 0.5, roughness: 0.4 }), c = paint('#3fb7a8', { roughness: 0.75 }); b.box(c, 2.6, 1.6, 3.4, 0, 3.0, 0, { r: 0.35 }); b.box(c, 2.6, 2.6, 0.5, 0, 4.1, -1.5, { r: 0.2 }); const hood = new THREE.SphereGeometry(1.6, 18, 10, 0, Math.PI, 0, Math.PI / 2); hood.scale(0.85, 0.9, 1); b.add(paint('#ffd23f', { roughness: 0.7, side: THREE.DoubleSide }), hood, 0, 4.6, -1.4, Math.PI / 2, 0, -Math.PI / 2); for (const s of [-1, 1]) { b.box(f, 0.14, 0.14, 4.6, s * 1.3, 1.6, 0, { r: 0.04 }); b.box(f, 0.14, 3.4, 0.14, s * 1.3, 3.8, -2.6, { r: 0.04, rx: -0.42 }); } b.box(f, 2.8, 0.18, 0.18, 0, 5.3, -3.3, { r: 0.06 }); for (const s of [-1, 1]) for (const z of [-1.9, 1.9]) b.add(paint('#1b1d22', { roughness: 0.7 }), new THREE.TorusGeometry(0.6, 0.18, 8, 18), s * 1.45, 0.78, z, Math.PI / 2, 0, 0); b.done(g); g.seat = v3(0, 3.4, 0.3); g.handle = v3(0, 5.3, -3.3); return shadowAll(g); }

// ---------------- worn ----------------
function partBox(group, skip = []) { group.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), bx = new THREE.Box3(), tmp = new THREE.Box3(); const under = (k) => { for (let q = k; q && q !== group; q = q.parent) if (skip.includes(q)) return true; return false; }; group.traverse((k) => { if (k.isMesh && !k.userData.worn && k !== group && !under(k)) { k.geometry.computeBoundingBox(); tmp.copy(k.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld)); bx.union(tmp); } }); return bx; }
const worn = (g) => { g.traverse((o) => { if (o.isMesh) { o.userData.worn = true; o.castShadow = true; } }); return g; };
const torsoBox = (c) => { const r = c.root.rotation.clone(); c.root.rotation.set(0, 0, 0); const b = partBox(c.torso, [c.head, c.neck, ...(c.arms || []), ...(c.legs || [])].filter(Boolean)); c.root.rotation.copy(r); return b; };
const headBox = (c) => partBox(c.head);
export function wearTie(c, col = '#ef4f5a') { const B = torsoBox(c), g = new THREE.Group(), b = new Batch(), m = paint(col, { roughness: 0.5 }), h = B.max.y - B.min.y; b.box(m, 0.42, 0.36, 0.16, 0, 0, 0, { r: 0.06 }); b.box(m, 0.44, h * 0.62, 0.12, 0, -h * 0.33, -0.02, { r: 0.08 }); b.box(paint('#ffffff', { roughness: 0.6 }), 1.1, 0.3, 0.14, 0, 0.12, -0.04, { r: 0.06 }); b.done(g); g.position.set((B.min.x + B.max.x) / 2, B.max.y - 0.62, B.max.z + 0.05); c.torso.add(worn(g)); return g; }
export function wearApron(c) { const B = torsoBox(c), g = new THREE.Group(), b = new Batch(), m = paint('#ff8fb1', { roughness: 0.8 }), w = (B.max.x - B.min.x) * 1.1, h = B.max.y - B.min.y; b.box(m, w * 0.8, h * 0.62, 0.12, 0, -h * 0.25, 0, { r: 0.05 }); b.box(m, w * 1.12, h * 1.05, 0.12, 0, -h * 1.05, 0.02, { r: 0.06 }); b.box(paint('#ffffff', { roughness: 0.8 }), w * 0.5, h * 0.25, 0.14, 0, -h * 0.85, 0.06, { r: 0.05 }); b.done(g); g.position.set((B.min.x + B.max.x) / 2, B.max.y - 0.15, B.max.z + 0.06); c.torso.add(worn(g)); return g; }
export function wearDiaper(c) { const B = torsoBox(c), g = new THREE.Group(), b = new Batch(), w = (B.max.x - B.min.x) * 1.08, d = (B.max.z - B.min.z) * 1.18, h = (B.max.y - B.min.y) * 0.34; b.box(paint('#ffffff', { roughness: 0.9 }), w, h, d, 0, 0, 0, { r: Math.min(w, h, d) * 0.3 }); for (const s of [-1, 1]) b.box(paint('#9fd6ff', { roughness: 0.7 }), 0.36, 0.3, 0.08, s * w * 0.32, h * 0.18, d / 2 + 0.02, { r: 0.04 }); b.done(g); g.position.set((B.min.x + B.max.x) / 2, B.min.y + h * 0.42, (B.min.z + B.max.z) / 2); c.torso.add(worn(g)); return g; }
export function wearScarf(c, col = '#f3c43a') { const B = torsoBox(c), g = new THREE.Group(), b = new Batch(), m = paint(col, { roughness: 0.92 }), w = (B.max.x - B.min.x), d = (B.max.z - B.min.z); b.box(m, w * 0.72, 0.5, d * 1.08, 0, 0, 0, { r: 0.22 }); b.box(m, 0.5, 1.8, 0.24, w * 0.18, -1.0, d / 2 + 0.08, { r: 0.12, rz: 0.08 }); for (let i = 0; i < 3; i++) b.box(paint('#e2456a', { roughness: 0.9 }), 0.52, 0.12, 0.26, w * 0.18 + 0.02, -0.5 - i * 0.5, d / 2 + 0.1, { r: 0.03 }); b.done(g); g.position.set((B.min.x + B.max.x) / 2, B.max.y - 0.05, (B.min.z + B.max.z) / 2); c.torso.add(worn(g)); return g; }
export function wearMustache(c, o = {}) { const B = headBox(c), g = new THREE.Group(), b = new Batch(), m = paint('#f1efe9', { roughness: 0.95 }), w = (B.max.x - B.min.x); for (const s of [-1, 1]) b.add(m, new THREE.SphereGeometry(1, 14, 10).scale(w * 0.2, w * 0.075, w * 0.08), s * w * 0.15, 0, 0, 0, 0, s * 0.22); b.done(g); g.position.set((B.min.x + B.max.x) / 2, B.min.y + (B.max.y - B.min.y) * (o.y ?? 0.36), B.max.z + (o.z ?? 0.02)); c.head.add(worn(g)); return g; }
export function wearCap(c, col = '#7c7f86') { const B = headBox(c), g = new THREE.Group(), b = new Batch(), m = surf('stucco', col, { roughness: 0.9 }), w = (B.max.x - B.min.x), d = (B.max.z - B.min.z); b.box(m, w * 1.06, w * 0.28, d * 1.06, 0, 0, 0, { r: w * 0.12 }); b.box(m, w * 0.9, 0.12, d * 0.5, 0, -w * 0.1, d * 0.62, { r: 0.05, rx: 0.12 }); b.done(g); g.position.set((B.min.x + B.max.x) / 2, B.max.y - w * 0.06, (B.min.z + B.max.z) / 2 - 0.05); c.head.add(worn(g)); return g; }
export function wearShades(c) { const B = headBox(c), g = new THREE.Group(), b = new Batch(), m = paint('#15171c', { roughness: 0.15, metalness: 0.4 }), w = (B.max.x - B.min.x); for (const s of [-1, 1]) b.box(m, w * 0.36, w * 0.2, 0.08, s * w * 0.21, 0, 0, { r: 0.05 }); b.box(m, w * 0.92, 0.07, 0.08, 0, w * 0.08, 0, { r: 0.02 }); b.done(g); g.position.set((B.min.x + B.max.x) / 2, B.min.y + (B.max.y - B.min.y) * 0.56, B.max.z + 0.06); c.head.add(worn(g)); return g; }
export { PASTEL };
