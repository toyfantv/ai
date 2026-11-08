// The old amusement park (Episode 30, an original design): a faded park that runs at night for nobody. Everything here is built in code.
//   ferrisWheel(o) (.update(rot, t, swing), .gondolas), carousel(o) (.update(spin, on), .seatY, .benchLocal), ticketBooth() (.setLit, .setSign),
//   parkArch(), exitGate() (.set(open, lock)), chainFence(len), midwayStall(), teaCups() (.update), swingRide() (.update), coaster() (.update),
//   stringBulbs(), parkLamp(), paSpeakers(), queueRope(), broom(), controlLever(), ticketStub(), balloon(name), bareStrings(), popcornTub(),
//   blueCreature() (an original large, tired, soft blue creature), shoePrints(list), parkGround(), distantTrees().
// Every update is a pure function of its arguments: frames render in parallel workers.
import * as THREE from 'three';
import { Batch, paint, surf } from './kit.js';
import { canvasTex } from './props.js';
import { v3, lerp, clamp, smooth, rng } from './core.js';

const TAU = Math.PI * 2;
const srgb = (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
export const FADED = { peach: '#c99a7f', mint: '#8fb3a0', pink: '#c08f9b', sky: '#7fa2b4', cream: '#d2c6a4', mustard: '#bb9f5c', red: '#a65248', teal: '#4f8381' };
const glow = (col, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), toneMapped: true });

// a paint chip / stain overlay: old enamel
function agedTex(base, o = {}) {
  const t = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h); const r = rng(base.length * 91 + (o.seed || 3));
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${40 + r() * 60},${36 + r() * 50},${28 + r() * 40},${0.02 + r() * 0.05})`; x.fillRect(r() * w, r() * h, 2 + r() * 30, 1 + r() * 12); }
    for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(226,218,196,${0.18 + r() * 0.34})`; const a = r() * w, b = r() * h, s = 2 + r() * 9; x.beginPath(); x.ellipse(a, b, s, s * (0.5 + r()), r() * 3, 0, 7); x.fill(); }
    for (let i = 0; i < 26; i++) { const a = r() * w, g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(60,40,24,0.2)'); g.addColorStop(1, 'rgba(60,40,24,0)'); x.fillStyle = g; x.fillRect(a, r() * 80, 2 + r() * 6, h); }
  }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return srgb(t);
}
const agedCache = new Map();
export function aged(col, o = {}) { const k = col + JSON.stringify(o); if (!agedCache.has(k)) agedCache.set(k, new THREE.MeshStandardMaterial({ map: agedTex(col, o), roughness: o.roughness ?? 0.62, metalness: o.metalness ?? 0.05 })); return agedCache.get(k); }
const stripeTex = (a, b, n = 12, o = {}) => { const t = canvasTex(1024, 256, (x, w, h) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(i * w / n, 0, w / n + 1, h); } const r = rng(7); for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(40,34,26,${0.02 + r() * 0.06})`; x.fillRect(r() * w, r() * h, 2 + r() * 40, 1 + r() * 6); } if (o.drip) for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(50,34,22,0.12)'; x.fillRect(r() * w, 0, 2 + r() * 4, r() * h); } }); t.wrapS = THREE.RepeatWrapping; return srgb(t); };

// bulbs: one instanced mesh; colours per instance, some dead. `.level(k)` for a whole ride
function bulbs(list, size = 0.26) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), list.length); m.userData.noAO = true; m.castShadow = false;
  const M = new THREE.Matrix4(), c = new THREE.Color(), base = [];
  list.forEach((b, i) => { M.makeTranslation(b.p.x, b.p.y, b.p.z); m.setMatrixAt(i, M); c.set(b.c); base.push(c.clone().multiplyScalar(b.dead ? 0.1 : 1.25)); m.setColorAt(i, base[i]); });
  m.instanceColor.needsUpdate = true; m.frustumCulled = false;
  let last = -1; m.level = (k) => { const q = Math.round(k * 64); if (q === last) return; last = q; base.forEach((b, i) => { c.copy(b).multiplyScalar(0.08 + 0.92 * k); m.setColorAt(i, c); }); m.instanceColor.needsUpdate = true; };
  return m;
}
const BULB = ['#ffd9a0', '#ffc7b8', '#d7f0c0', '#ffe8b8', '#f4b8c8'];

// ---- the Ferris wheel ----
function dentedCushion(w, d, h, dents, col) {
  const g = new THREE.PlaneGeometry(w, d, 28, 28); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let y = h; const x = p.getX(i), z = p.getZ(i), edge = Math.min(1, Math.min((w / 2 - Math.abs(x)) / 0.2, (d / 2 - Math.abs(z)) / 0.2)); y *= 0.55 + 0.45 * edge; for (const q of dents) { const r2 = ((x - q[0]) ** 2) / (q[2] ** 2) + ((z - q[1]) ** 2) / (q[3] ** 2); y -= q[4] * Math.exp(-r2 * 1.6); } p.setY(i, y); }
  g.computeVertexNormals();
  const G = new THREE.Group(), top = new THREE.Mesh(g, col); top.receiveShadow = true; top.castShadow = true; G.add(top);
  const side = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.55, d), col); side.position.y = h * 0.27; side.castShadow = true; G.add(side); return G;
}
function gondola(col, trim, idx = 0) {
  const g = new THREE.Group(), b = new Batch(), body = aged(col), tr = aged(trim), steel = paint('#6c7270', { metalness: 0.5, roughness: 0.5 }), dark = paint('#2c302e', { roughness: 0.8 });
  const W = 6.4, D = 4.6, H0 = -8.6, TUB = 2.4;
  // hanger: the two arms from the pivot down to the roof
  b.cyl(steel, 0.22, 0.22, D + 1.2, 0, 0, 0, { rx: Math.PI / 2 });
  b.box(steel, 0.26, 2.0, 0.26, 0, -1.0, D / 2 + 0.2, { r: 0.05 }); b.box(steel, 0.26, 2.0, 0.26, 0, -1.0, -D / 2 - 0.2, { r: 0.05 });
  // roof with a scalloped drip edge
  b.box(body, W + 0.9, 0.34, D + 0.9, 0, -2.1, 0, { r: 0.14 }); b.box(tr, W + 1.1, 0.14, D + 1.1, 0, -2.32, 0, { r: 0.05 });
  for (let i = 0; i < 9; i++) { const x = -W / 2 + i * W / 8; b.cyl(tr, 0.36, 0.36, 0.08, x, -2.42, D / 2 + 0.52, { rx: Math.PI / 2, seg: 10 }); b.cyl(tr, 0.36, 0.36, 0.08, x, -2.42, -D / 2 - 0.52, { rx: Math.PI / 2, seg: 10 }); }
  // corner posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(steel, 0.11, 0.11, 4.2, sx * (W / 2 - 0.1), -4.4, sz * (D / 2 - 0.1), { seg: 8 });
  // the tub: floor, four low walls, each a separate panel, trim rails
  b.box(dark, W, 0.22, D, 0, H0, 0, { r: 0.05 });
  b.box(body, W, TUB, 0.16, 0, H0 + TUB / 2, D / 2, { r: 0.06 }); b.box(body, W, TUB, 0.16, 0, H0 + TUB / 2, -D / 2, { r: 0.06 });
  b.box(body, 0.16, TUB, D, -W / 2, H0 + TUB / 2, 0, { r: 0.06 }); b.box(body, 0.16, TUB, D, W / 2, H0 + TUB / 2, 0, { r: 0.06 });
  b.box(tr, W + 0.14, 0.2, 0.26, 0, H0 + TUB, D / 2, { r: 0.07 }); b.box(tr, W + 0.14, 0.2, 0.26, 0, H0 + TUB, -D / 2, { r: 0.07 }); b.box(tr, 0.26, 0.2, D + 0.14, -W / 2, H0 + TUB, 0, { r: 0.07 }); b.box(tr, 0.26, 0.2, D + 0.14, W / 2, H0 + TUB, 0, { r: 0.07 });
  // benches, facing each other across x, two riders on each
  const seatY = H0 + 1.25;
  for (const sx of [-1, 1]) { b.box(tr, 1.5, 0.2, D - 0.5, sx * 2.2, seatY - 0.15, 0, { r: 0.06 }); b.box(body, 0.2, 1.9, D - 0.5, sx * 2.86, seatY + 0.95, 0, { r: 0.08 }); b.box(steel, 0.16, seatY - H0 - 0.2, 0.16, sx * 2.2, (seatY + H0) / 2, D / 2 - 0.7, { r: 0.04 }); b.box(steel, 0.16, seatY - H0 - 0.2, 0.16, sx * 2.2, (seatY + H0) / 2, -D / 2 + 0.7, { r: 0.04 }); }
  b.done(g);
  // what nobody is sitting on: pressed cushions, and belts closed round waists that aren't there
  const cush = paint('#7d4f49', { roughness: 0.75 }), belt = paint('#c9b98a', { roughness: 0.6 }), buckle = paint('#b9b6a4', { metalness: 0.7, roughness: 0.3 }), bb = new Batch();
  for (const sx of [-1, 1]) {
    const d = [[0, -0.98, 0.55, 0.62, 0.24], [0, 0.98, 0.55, 0.62, 0.24]], c = dentedCushion(1.4, D - 0.7, 0.42, d, cush); c.position.set(sx * 2.2, seatY - 0.05, 0); g.add(c);
    for (const z of [-0.98, 0.98]) {
      const R = 0.8, rg = new THREE.TorusGeometry(R, 0.1, 6, 30); rg.rotateX(Math.PI / 2); rg.scale(0.86, 1, 1); bb.add(belt, rg, sx * 2.0, seatY + 1.1, z);   // a closed loop
      bb.box(buckle, 0.34, 0.26, 0.3, sx * (2.0 - 0.72), seatY + 1.1, z, { r: 0.05 });
      bb.box(belt, 0.5, 0.05, 0.16, sx * 2.6, seatY + 1.08, z - 0.5, { r: 0.02, rz: sx * 0.2 }); bb.box(belt, 0.5, 0.05, 0.16, sx * 2.6, seatY + 1.08, z + 0.5, { r: 0.02, rz: sx * 0.2 });
    }
  }
  bb.done(g); g.userData = { seatY, D, W, H0 }; return g;
}
export function ferrisWheel(o = {}) {
  const R = o.R ?? 30, N = o.n ?? 16, HUB = R + 12, root = new THREE.Group(), steel = aged('#8b8a7c', { metalness: 0.35, roughness: 0.55 }), white = aged('#bdb5a0', { metalness: 0.2 });
  const legs = new Batch(), W = 8.2;
  for (const sz of [-1, 1]) { const z = sz * (W / 2 + 0.4); for (const sx of [-1, 1]) { const a = v3(sx * 19, 0, z), b = v3(0, HUB, z), m = a.clone().lerp(b, 0.5), L = a.distanceTo(b); legs.box(steel, 1.1, L, 1.1, m.x, m.y, m.z, { rz: Math.atan2(sx * 19, HUB) * 1 * (1), r: 0.14 }); for (let k = 1; k < 5; k++) { const y = HUB * k / 5, x = sx * 19 * (1 - k / 5); legs.box(white, 0.3, 0.3, 0.3, x, y, z); } } legs.box(steel, 1.0, 1.0, 1.0, 0, HUB, z); for (let k = 1; k < 5; k++) { const y = HUB * k / 5, x = 19 * (1 - k / 5); legs.box(white, x * 2, 0.3, 0.3, 0, y, z, { r: 0.05 }); } }
  legs.cyl(steel, 1.3, 1.3, W + 3.4, 0, HUB, 0, { rx: Math.PI / 2, seg: 24 });
  legs.box(aged('#4b5c58'), 46, 0.9, 16, 0, 0.45, 0, { r: 0.1 });  // the base slab
  legs.box(aged('#8a7d62'), 14, 1.6, 7.5, 0, 0.8, 10.2, { r: 0.1 });   // the boarding platform
  root.add(legs.done());
  const hub = new THREE.Group(); hub.position.set(0, HUB, 0); root.add(hub);
  const b = new Batch();
  for (const z of [-W / 2, W / 2]) {
    const rim = new THREE.TorusGeometry(R, 0.42, 8, 96); b.add(steel, rim, 0, 0, z); const rim2 = new THREE.TorusGeometry(R - 3.2, 0.26, 6, 96); b.add(white, rim2, 0, 0, z);
    const hz = new THREE.CylinderGeometry(3, 3, 0.8, 24); hz.rotateX(Math.PI / 2); b.add(steel, hz, 0, 0, z);
    for (let i = 0; i < N * 2; i++) { const a = i / (N * 2) * TAU, x = Math.cos(a), y = Math.sin(a); b.box(i % 2 ? white : steel, i % 2 ? 0.22 : 0.34, R - 3, i % 2 ? 0.22 : 0.34, x * (R + 3) / 2, y * (R + 3) / 2, z, { rz: a - Math.PI / 2, r: 0.04 }); if (i % 2 === 0) { const nx = Math.cos(a + TAU / (N * 2) * 2), ny = Math.sin(a + TAU / (N * 2) * 2), mx = (x + nx) / 2 * (R - 1.6), my = (y + ny) / 2 * (R - 1.6), L = Math.hypot((nx - x) * (R - 1.6), (ny - y) * (R - 1.6)); b.box(white, L, 0.2, 0.2, mx, my, z, { rz: Math.atan2(ny - y, nx - x), r: 0.03 }); } }
  }
  for (let i = 0; i < N; i++) { const a = i / N * TAU; b.cyl(steel, 0.3, 0.3, W, Math.cos(a) * R, Math.sin(a) * R, 0, { rx: Math.PI / 2, seg: 10 }); }
  hub.add(b.done());
  // the rim's bulbs
  const r0 = rng(41), bl = []; for (let i = 0; i < 180; i++) { const a = i / 180 * TAU; for (const z of [-W / 2 - 0.1, W / 2 + 0.1]) bl.push({ p: v3(Math.cos(a) * R, Math.sin(a) * R, z + (z > 0 ? 0.4 : -0.4)), c: BULB[i % 5], dead: r0() < 0.2 }); }
  for (let i = 0; i < 16; i++) for (let k = 2; k < 8; k++) { const a = i / 16 * TAU, r = R * k / 8; bl.push({ p: v3(Math.cos(a) * r, Math.sin(a) * r, W / 2 + 0.5), c: BULB[k % 5], dead: r0() < 0.25 }); }
  const lights = bulbs(bl, 0.3); hub.add(lights);
  const cols = [[FADED.peach, FADED.cream], [FADED.mint, FADED.cream], [FADED.pink, FADED.cream], [FADED.sky, FADED.cream], [FADED.mustard, FADED.red]];
  const gs = []; for (let i = 0; i < N; i++) { const c = cols[i % cols.length], g = i < cols.length ? gondola(c[0], c[1], i) : gs[i % cols.length].clone(); root.add(g); gs.push(g); }
  root.update = (rot, t, sw = 1, level = 1) => { hub.rotation.z = rot; lights.level(level); for (let i = 0; i < N; i++) { const a = rot + i / N * TAU, g = gs[i]; g.position.set(Math.cos(a) * R, HUB + Math.sin(a) * R, 0); g.rotation.z = (Math.sin(t * 0.8 + i * 1.7) * 0.03 + 0.02 * Math.sin(i * 3.1)) * sw; } };
  root.gondolas = gs; root.R = R; root.HUB = HUB; root.N = N; root.lights = lights;
  return root;
}

// ---- the carousel ----
function horse(col, mane, saddle) {
  const g = new THREE.Group(), b = new Batch(), m = aged(col, { seed: col.length }), mn = paint(mane), s = aged(saddle), gold = paint('#b59a57', { metalness: 0.5, roughness: 0.4 });
  const cap = (mat, r, L, x, y, z, rx = 0, rz = 0) => { const c = new THREE.CapsuleGeometry(r, L, 5, 12); b.add(mat, c, x, y, z, 0, rx, rz); };
  // z is forward (along the ride); body at y 0 is pole height
  cap(m, 0.62, 1.7, 0, 0, 0, Math.PI / 2 - 0.04);
  cap(m, 0.42, 0.95, 0, 0.92, 1.25, 0.75); cap(m, 0.32, 0.7, 0, 1.52, 2.0, 1.28);
  for (const sx of [-1, 1]) { b.box(m, 0.14, 0.46, 0.2, sx * 0.17, 1.92, 1.42, { rx: -0.2, r: 0.05 }); b.box(paint('#14130f'), 0.09, 0.14, 0.14, sx * 0.3, 1.62, 2.02, { r: 0.03 }); }
  cap(m, 0.15, 1.05, -0.23, -0.95, 1.05, -0.9); cap(m, 0.15, 1.05, 0.23, -0.95, 1.05, 0.6); cap(m, 0.17, 1.15, -0.26, -1.05, -1.0, 0.75); cap(m, 0.17, 1.15, 0.26, -1.05, -1.0, -0.55);
  for (const [x, y, z] of [[-0.23, -1.4, 1.5], [0.23, -1.52, 0.62], [-0.26, -1.65, -1.4], [0.26, -1.68, -0.62]]) b.cyl(paint('#2d2a27'), 0.17, 0.2, 0.22, x, y, z, { seg: 10 });
  b.box(s, 1.28, 0.2, 1.3, 0, 0.62, -0.05, { r: 0.09 }); b.box(gold, 1.34, 0.08, 0.1, 0, 0.62, 0.6, { r: 0.03 }); b.box(gold, 1.34, 0.08, 0.1, 0, 0.62, -0.7, { r: 0.03 }); b.box(s, 1.4, 0.34, 1.0, 0, 0.42, -0.06, { r: 0.05 });
  for (let i = 0; i < 6; i++) b.box(mn, 0.14, 0.42 - i * 0.03, 0.26, 0, 1.68 - i * 0.2, 1.62 - i * 0.22, { rx: 0.5, r: 0.05 });
  cap(mn, 0.15, 0.8, 0, 0.22, -1.56, -0.62); b.done(g); return g;
}
export function carousel(o = {}) {
  const R = o.R ?? 14, root = new THREE.Group(), base = new Batch(), deckY = 1.15, H = 14.5;
  base.cyl(aged('#5b5f54'), R + 1.2, R + 1.5, 0.5, 0, 0.25, 0, { seg: 48 }); for (let i = 0; i < 2; i++) base.cyl(aged('#7b7866'), R + 0.8 - i * 0.2, R + 0.9 - i * 0.2, 0.28, 0, 0.62 + i * 0.25, 0, { seg: 48 });
  root.add(base.done());
  const deck = new THREE.Group(); root.add(deck); const d = new Batch();
  d.cyl(surf('plank', '#9a8461'), R, R, 0.3, 0, deckY, 0, { seg: 48 }); d.cyl(aged(FADED.red), R + 0.08, R + 0.08, 0.34, 0, deckY - 0.04, 0, { seg: 48 });
  d.cyl(aged('#a7a08a'), 2.6, 2.9, H - 1, 0, deckY + (H - 1) / 2, 0, { seg: 16 }); // the centre drum
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; d.box(paint('#7f8f8a', { metalness: 0.75, roughness: 0.16 }), 0.05, 5.3, 1.05, Math.cos(a) * 2.92, deckY + 4.3, -Math.sin(a) * 2.92, { ry: a }); d.box(aged(FADED.cream), 0.1, 5.5, 0.12, Math.cos(a + TAU / 32) * 2.94, deckY + 4.3, -Math.sin(a + TAU / 32) * 2.94, { ry: a, r: 0.03 }); }
  deck.add(d.done());
  // poles and riders
  const brass = paint('#a58d57', { metalness: 0.6, roughness: 0.34 }), pol = new Batch(), hs = [];
  const HC = [[FADED.cream, '#6d5c44', FADED.red], ['#a8a8a2', '#3c3a36', FADED.teal], [FADED.peach, '#5c4634', FADED.sky], ['#7d6a56', '#2e2822', FADED.mint], [FADED.pink, '#efe7d4', FADED.mustard]];
  const addHorse = (a, r, k) => { const p = HC[k % HC.length], h = horse(p[0], p[1], p[2]); h.position.set(Math.cos(a) * r, deckY + 3.5, -Math.sin(a) * r); h.rotation.y = a; deck.add(h); hs.push({ h, ph: k * 1.37 }); pol.cyl(brass, 0.1, 0.1, H - 1.2, Math.cos(a) * r, deckY + (H - 1.2) / 2, -Math.sin(a) * r, { seg: 10 }); pol.cyl(brass, 0.16, 0.16, 0.5, Math.cos(a) * r, deckY + H - 2, -Math.sin(a) * r, { seg: 10 }); };
  for (let i = 2; i < 10; i++) addHorse(i / 11 * TAU, 11.2, i);
  for (let i = 1; i < 7; i++) addHorse(i / 7 * TAU + 0.25, 6.7, i + 3);
  deck.add(pol.done());
  // the bench the creature sits on (at local +x; the ride moves local +z there): wide and deep, it is a big passenger
  const bench = new THREE.Group(); const seatH = 2.15, BW = 8.8, BD = 5.8, BR = 9.6; { const b = new Batch(), wood = aged(FADED.teal), g2 = paint('#b59a57', { metalness: 0.5, roughness: 0.4 }); b.box(wood, BW, 0.4, BD, 0, deckY + seatH - 0.2, 0, { r: 0.14 }); b.box(aged('#7d4f49'), BW - 0.4, 0.26, BD - 0.4, 0, deckY + seatH + 0.13 - 0.14, 0, { r: 0.1 }); b.box(wood, BW + 0.1, 4.4, 0.5, 0, deckY + seatH + 1.8, -BD / 2 - 0.05, { r: 0.18 }); b.box(g2, BW - 0.2, 0.14, 0.14, 0, deckY + seatH + 3.8, -BD / 2 + 0.22, { r: 0.05 }); for (const sx of [-1, 1]) { b.box(wood, 0.5, 2.4, BD + 0.2, sx * BW / 2, deckY + seatH + 0.0, 0, { r: 0.14 }); b.box(g2, 0.6, 0.14, BD - 1, sx * BW / 2, deckY + seatH + 1.26, 0.3, { r: 0.05 }); b.box(wood, 0.5, seatH - 0.2, 0.5, sx * (BW / 2 - 0.3), deckY + (seatH - 0.2) / 2, BD / 2 - 0.4, { r: 0.1 }); b.box(wood, 0.5, seatH - 0.2, 0.5, sx * (BW / 2 - 0.3), deckY + (seatH - 0.2) / 2, -BD / 2 + 0.4, { r: 0.1 }); } b.done(bench); } bench.position.set(BR, 0, 0); deck.add(bench);
  // the canopy: a striped cone and a scalloped valance
  const top = new THREE.Group(); deck.add(top); top.position.y = deckY + H;
  const st = stripeTex(FADED.cream, FADED.red, 24, { drip: true }), cone = new THREE.Mesh(new THREE.ConeGeometry(R + 1.2, 5.4, 48, 1, true), new THREE.MeshStandardMaterial({ map: st, roughness: 0.7, side: THREE.DoubleSide })); cone.position.y = 2.7; cone.castShadow = true; top.add(cone);
  const rb = new Batch(); rb.cyl(aged(FADED.mustard), R + 1.3, R + 1.3, 1.2, 0, -0.5, 0, { seg: 48 }); rb.cyl(paint('#3a3836'), R + 1.26, R + 1.26, 1.26, 0, -0.52, 0, { seg: 48 });
  rb.cyl(aged(FADED.teal), 0.9, 1.5, 1.4, 0, 5.8, 0, { seg: 16 }); rb.cyl(paint('#b59a57', { metalness: 0.5, roughness: 0.4 }), 0.4, 0.6, 0.6, 0, 6.8, 0, { seg: 12 }); const flag = new THREE.SphereGeometry(0.6, 12, 10); rb.add(paint('#b59a57', { metalness: 0.5, roughness: 0.4 }), flag, 0, 7.5, 0);
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, c = new THREE.CylinderGeometry(0.75, 0.75, 0.06, 12, 1, false, 0, Math.PI); c.rotateX(Math.PI / 2); c.rotateZ(Math.PI); rb.add(i % 2 ? aged(FADED.cream) : aged(FADED.red), c, Math.cos(a) * (R + 1.31), -1.12, -Math.sin(a) * (R + 1.31), a + Math.PI / 2); }
  rb.done(top);
  { const uT = srgb(canvasTex(1024, 1024, (x, w, h) => { x.fillStyle = '#7a6a52'; x.fillRect(0, 0, w, h); x.translate(w / 2, h / 2); for (let i = 0; i < 24; i++) { x.rotate(TAU / 24); x.fillStyle = i % 2 ? '#a58b63' : '#6f4d40'; x.beginPath(); x.moveTo(0, 0); x.lineTo(520 * Math.cos(-TAU / 48), 520 * Math.sin(-TAU / 48)); x.lineTo(520 * Math.cos(TAU / 48), 520 * Math.sin(TAU / 48)); x.fill(); } const r = rng(3); x.setTransform(1, 0, 0, 1, 0, 0); for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(30,24,16,${r() * 0.1})`; x.fillRect(r() * w, r() * h, 3 + r() * 30, 1 + r() * 5); } })); const u = new THREE.Mesh(new THREE.CircleGeometry(R + 1.2, 48), new THREE.MeshStandardMaterial({ map: uT, roughness: 0.75 })); u.rotation.x = Math.PI / 2; u.position.y = -1.2; top.add(u); }
  const r0 = rng(81), bl = []; for (let i = 0; i < 96; i++) { const a = i / 96 * TAU; bl.push({ p: v3(Math.cos(a) * (R + 1.42), -0.4, -Math.sin(a) * (R + 1.42)), c: BULB[i % 5], dead: r0() < 0.18 }); bl.push({ p: v3(Math.cos(a) * (R + 0.4), 0.55, -Math.sin(a) * (R + 0.4)), c: BULB[(i + 2) % 5], dead: r0() < 0.22 }); } for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; for (let k = 1; k < 5; k++) { const f = k / 5; bl.push({ p: v3(Math.cos(a) * (R + 1) * f, 5.4 * (1 - f) + 0.05, -Math.sin(a) * (R + 1) * f).multiplyScalar(1).add(v3(0, 0, 0)), c: BULB[k % 5], dead: r0() < 0.2 }); } }
  const lights = bulbs(bl, 0.2); top.add(lights);
  root.update = (spin, level = 1) => { deck.rotation.y = spin; lights.level(level); hs.forEach((q) => { q.h.position.y = deckY + 3.5 + Math.sin(spin * 2.6 + q.ph) * 0.8; }); };
  root.deck = deck; root.bench = bench; root.seatY = deckY + seatH + 0.25; root.benchR = BR; root.deckY = deckY; root.R = R; root.lights = lights;
  return root;
}

// ---- the ticket booth ----
function lightBoxTex(text, col, on) { return srgb(canvasTex(720, 240, (x, w, h) => { x.fillStyle = on ? '#16120e' : '#0d0c0b'; x.fillRect(0, 0, w, h); x.strokeStyle = on ? col : '#2f2a26'; x.lineWidth = 10; x.strokeRect(14, 14, w - 28, h - 28); x.font = '900 158px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = on ? col : '#35302a'; x.fillText(text, w / 2, h / 2 + 8); })); }
export function ticketBooth() {
  const root = new THREE.Group(), b = new Batch(), wood = aged(FADED.mint, { seed: 9 }), trim = aged(FADED.cream), rim = aged(FADED.red), dark = paint('#2b2a26', { roughness: 0.75 }), W = 7, D = 6, H = 9;
  b.box(aged('#6b6556'), W + 1.6, 0.5, D + 1.6, 0, 0.25, 0, { r: 0.1 });
  // walls with a window opening on the two long sides (+z and -z)
  for (const sz of [-1, 1]) { const z = sz * D / 2; b.box(wood, W, 3.2, 0.3, 0, 2.1, z, { r: 0.05 }); b.box(wood, 1.2, 3.6, 0.3, -W / 2 + 0.6, 5.5, z, { r: 0.05 }); b.box(wood, 1.2, 3.6, 0.3, W / 2 - 0.6, 5.5, z, { r: 0.05 }); b.box(wood, W, 1.2, 0.3, 0, 7.9, z, { r: 0.05 }); b.box(trim, W + 0.1, 0.22, 0.4, 0, 3.72, z + sz * 0.08, { r: 0.06 }); b.box(trim, W - 2, 0.16, 0.3, 0, 7.3, z + sz * 0.05, { r: 0.05 }); b.box(trim, 1.8, 0.28, 1.0, 0, 3.92, z + sz * 0.34, { r: 0.06 }); for (let i = 0; i < 5; i++) b.cyl(paint('#b59a57', { metalness: 0.5, roughness: 0.4 }), 0.05, 0.05, 3.4, -1.8 + i * 0.9, 5.5, z + sz * 0.02, { seg: 6 }); for (let i = 0; i < 6; i++) b.box(trim, 0.22, 2.8, 0.1, -W / 2 + 0.7 + i * (W - 1.4) / 5, 2.0, z + sz * 0.16, { r: 0.03 }); }
  for (const sx of [-1, 1]) { b.box(wood, 0.3, 8.8, D, sx * W / 2, 4.4, 0, { r: 0.05 }); b.box(trim, 0.42, 8.8, 0.42, sx * W / 2, 4.4, D / 2, { r: 0.06 }); b.box(trim, 0.42, 8.8, 0.42, sx * W / 2, 4.4, -D / 2, { r: 0.06 }); }
  b.box(dark, W - 0.4, 0.2, D - 0.4, 0, 0.6, 0, { r: 0.03 }); b.box(trim, W, 0.24, D, 0, H - 0.3, 0, { r: 0.08 }); root.add(b.done());
  // inside: a stool, a cash tray, the lit room
  const inr = new Batch(); inr.box(paint('#b6ac8d'), W - 0.4, 8.2, 0.1, 0, 4.6, 0, { r: 0.02 }); inr.cyl(paint('#6e4a3f'), 0.7, 0.7, 0.2, -1.2, 2.5, 0.0); inr.cyl(paint('#454545', { metalness: 0.5 }), 0.1, 0.12, 2.4, -1.2, 1.4, 0); root.add(inr.done());
  const roomMat = new THREE.MeshBasicMaterial({ color: '#332f25' }), rooms = []; for (const sz of [-1, 1]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(W - 2.6, 3.4), roomMat); r.position.set(0, 5.5, sz * (D / 2 - 0.2)); r.rotation.y = sz > 0 ? 0 : Math.PI; r.userData.noAO = true; root.add(r); rooms.push(r); }
  // roof: a striped peak
  const st = stripeTex(FADED.cream, FADED.red, 16), cone = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(W, D) / 2 + 1.6, 3.8, 4, 1, true), new THREE.MeshStandardMaterial({ map: st, roughness: 0.7, side: THREE.DoubleSide })); cone.rotation.y = Math.PI / 4; cone.position.y = H + 1.8; cone.scale.set(1, 1, 0.88); cone.castShadow = true; root.add(cone);
  const r0 = rng(13), bl = []; for (let i = 0; i < 28; i++) { const u = i / 27, x = -W / 2 - 1 + (W + 2) * u; bl.push({ p: v3(x, H - 0.1, D / 2 + 1.0), c: BULB[i % 5], dead: r0() < 0.2 }); bl.push({ p: v3(x, H - 0.1, -D / 2 - 1.0), c: BULB[(i + 1) % 5], dead: r0() < 0.2 }); }
  const lts = bulbs(bl, 0.17); root.add(lts);
  // the sign: a two-sided light box that stands on the peak; the two words are separate faces so they can flicker across
  const sg = new THREE.Group(); sg.position.set(0, H + 5.5, 0); root.add(sg);
  const box = new Batch(); box.box(paint('#27272a', { metalness: 0.4 }), 8.2, 3.0, 0.8, 0, 0, 0, { r: 0.1 }); box.box(aged(FADED.cream), 0.3, 2.3, 0.3, 0, -2.3, 0, { r: 0.05 }); box.done(sg);
  const mk = (tex, sz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 2.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: true })); m.position.z = sz * 0.43; m.rotation.y = sz > 0 ? 0 : Math.PI; m.userData.noAO = true; sg.add(m); return m; };
  const offT = lightBoxTex('CLOSED', '#ff4638', false), clT = lightBoxTex('CLOSED', '#ff5a48', true), opT = lightBoxTex('OPEN', '#7bff98', true);
  const off = [mk(offT, 1), mk(offT, -1)], cl = [mk(clT, 1), mk(clT, -1)], op = [mk(opT, 1), mk(opT, -1)];
  [...off, ...cl, ...op].forEach((m) => { m.renderOrder = 3; }); off.forEach((m) => { m.renderOrder = 2; });
  root.setLit = (k) => { roomMat.color.copy(new THREE.Color('#fff0c4')).multiplyScalar(0.12 + 0.95 * k); lts.level(k); };
  root.setSign = (closed, open) => { off.forEach((m) => { m.material.opacity = 1; }); cl.forEach((m) => { m.material.opacity = closed; m.visible = closed > 0.01; }); op.forEach((m) => { m.material.opacity = open; m.visible = open > 0.01; }); };
  root.signAt = v3(0, H + 5.5, 0); root.W = W; root.D = D; root.setLit(0); root.setSign(0, 0);
  return root;
}

// ---- gates, fence ----
export function chainFence(len, o = {}) {
  const h = o.h ?? 12, g = new THREE.Group(), t = canvasTex(256, 256, (x, w, c) => { x.clearRect(0, 0, w, c); x.strokeStyle = 'rgba(112,118,114,0.92)'; x.lineWidth = 6; for (let i = -1; i < 2; i++) { x.beginPath(); x.moveTo(i * w, 0); x.lineTo(i * w + w, c); x.stroke(); x.beginPath(); x.moveTo(i * w + w, 0); x.lineTo(i * w, c); x.stroke(); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / 0.8, h / 0.8); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.4, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide })); m.position.y = h / 2; m.userData.noAO = true; g.add(m);
  const b = new Batch(), s = paint('#5f6463', { metalness: 0.5, roughness: 0.55 }); const n = Math.round(len / 12); for (let i = 0; i <= n; i++) b.cyl(s, 0.18, 0.2, h + 0.8, -len / 2 + i * len / n, (h + 0.8) / 2, 0.02, { seg: 8 }); b.cyl(s, 0.09, 0.09, len, 0, h, 0.02, { rz: Math.PI / 2, seg: 6 }); b.done(g); return g;
}
export function parkArch(name = 'MERRIWAY PARK') {
  const root = new THREE.Group(), b = new Batch(), col = aged(FADED.cream), rim = aged(FADED.red), stripe = aged(FADED.teal), W = 14, H = 16;
  for (const sx of [-1, 1]) { const x = sx * W / 2; b.box(aged('#6b6556'), 3.6, 1, 3.6, x, 0.5, 0, { r: 0.1 }); b.cyl(col, 1.0, 1.25, H, x, H / 2 + 1, 0, { seg: 16 }); for (let i = 0; i < 5; i++) b.cyl(i % 2 ? rim : stripe, 1.22 - i * 0.03, 1.26 - i * 0.03, 0.4, x, 3 + i * 3.1, 0, { seg: 16 }); b.cyl(rim, 0.3, 1.5, 3, x, H + 2.5, 0, { seg: 12 }); }
  b.box(rim, W + 3, 3.8, 0.8, 0, H - 2.8, 0, { r: 0.22 }); b.box(col, W + 3.3, 0.3, 1, 0, H - 0.9, 0, { r: 0.1 }); b.box(col, W + 3.3, 0.3, 1, 0, H - 4.7, 0, { r: 0.1 }); root.add(b.done());
  const t = srgb(canvasTex(1280, 300, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = '900 170px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#d6c79a'; x.fillText(name, w / 2, h / 2 + 8); x.globalCompositeOperation = 'destination-out'; const r = rng(4); for (let i = 0; i < 130; i++) { x.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.5})`; x.fillRect(r() * w, r() * h, 3 + r() * 26, 1 + r() * 6); } }));
  for (const sz of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(W + 1.6, 3.2), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6, depthWrite: false })); f.position.set(0, H - 2.8, sz * 0.43); f.rotation.y = sz > 0 ? 0 : Math.PI; f.userData.noAO = true; root.add(f); }
  const r0 = rng(23), bl = []; for (let i = 0; i < 44; i++) { const x = -W / 2 - 1.3 + (W + 2.6) * i / 43; for (const z of [-0.52, 0.52]) { bl.push({ p: v3(x, H - 0.75, z), c: BULB[i % 5], dead: r0() < 0.3 }); bl.push({ p: v3(x, H - 4.85, z), c: BULB[(i + 2) % 5], dead: r0() < 0.3 }); } }
  const lts = bulbs(bl, 0.17); root.add(lts); root.level = (k) => lts.level(k);
  // two iron leaves, hinged at the posts
  root.leaves = []; for (const sx of [-1, 1]) { const h = new THREE.Group(); h.position.set(sx * (W / 2 - 1.1), 0, 0); const l = new Batch(), iron = paint('#2f3433', { metalness: 0.5, roughness: 0.5 }); for (let i = 0; i < 9; i++) { const x = -sx * (0.25 + i * 0.68); l.cyl(iron, 0.07, 0.07, 9.4 + Math.sin(i / 8 * Math.PI) * 1.2, x, 5.2 + Math.sin(i / 8 * Math.PI) * 0.6, 0, { seg: 6 }); l.cyl(iron, 0.15, 0.03, 0.5, x, 10.1 + Math.sin(i / 8 * Math.PI) * 1.2, 0, { seg: 6 }); } for (const y of [1.0, 2.2, 8.8]) l.box(iron, 5.8, 0.16, 0.16, -sx * 2.9, y, 0, { r: 0.04 }); l.done(h); root.add(h); root.leaves.push(h); }
  root.set = (o) => { root.leaves.forEach((h, i) => { h.rotation.y = (i ? 1 : -1) * o * 1.75; }); };
  return root;
}
export function exitGate() {
  const root = new THREE.Group(), b = new Batch(), col = aged(FADED.cream), rim = aged(FADED.red), iron = paint('#2f3433', { metalness: 0.5, roughness: 0.5 }), W = 7.6, H = 11;
  for (const sx of [-1, 1]) { const x = sx * W / 2; b.box(aged('#6b6556'), 2.2, 0.8, 2.2, x, 0.4, 0, { r: 0.1 }); b.cyl(col, 0.62, 0.74, H, x, H / 2, 0, { seg: 14 }); b.cyl(rim, 0.74, 0.8, 0.5, x, 3.2, 0, { seg: 14 }); b.cyl(rim, 0.74, 0.8, 0.5, x, 7.2, 0, { seg: 14 }); }
  b.box(rim, W + 2.2, 2.5, 0.6, 0, H + 0.6, 0, { r: 0.16 }); root.add(b.done());
  const t = srgb(canvasTex(512, 180, (x, w, h) => { x.fillStyle = '#a65248'; x.fillRect(0, 0, w, h); x.font = '900 130px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#e9dcb4'; x.fillText('EXIT', w / 2, h / 2 + 6); }));
  for (const sz of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })); f.position.set(0, H + 0.6, sz * 0.33); f.rotation.y = sz > 0 ? 0 : Math.PI; root.add(f); }
  const leaf = new THREE.Group(); leaf.position.set(-W / 2 + 0.62, 0, 0); root.add(leaf); const l = new Batch(); for (let i = 0; i < 10; i++) { const x = 0.42 + i * 0.68; l.cyl(iron, 0.075, 0.075, 8.8, x, 4.7, 0, { seg: 6 }); l.cyl(iron, 0.16, 0.03, 0.5, x, 9.3, 0, { seg: 6 }); } for (const y of [0.9, 4.3, 5.1, 8.5]) l.box(iron, 6.6, 0.16, 0.16, 3.4, y, 0, { r: 0.04 }); l.box(iron, 0.3, 9, 0.3, 6.5, 4.5, 0, { r: 0.05 }); l.done(leaf);
  // the bolt on the far post and a padlock that drops into it
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.5, 8), paint('#c6c0a8', { metalness: 0.7, roughness: 0.3 })); bolt.rotation.z = Math.PI / 2; bolt.position.set(6.0, 4.7, 0.28); leaf.add(bolt);
  const hasp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.26), paint('#403f39', { metalness: 0.5, roughness: 0.5 })); hasp.position.set(W / 2 - 0.58, 4.7, 0.3); root.add(hasp);
  const lock = new THREE.Group(); { const lb = new Batch(); lb.box(paint('#a78a42', { metalness: 0.65, roughness: 0.3 }), 0.72, 0.62, 0.24, 0, -0.26, 0, { r: 0.08 }); const sh = new THREE.TorusGeometry(0.22, 0.05, 6, 16, Math.PI); lb.add(paint('#c6c0a8', { metalness: 0.7, roughness: 0.3 }), sh, 0, 0.04, 0); lb.done(lock); } lock.position.set(W / 2 - 0.58, 4.3, 0.5); root.add(lock);
  root.set = (open, lk) => { leaf.rotation.y = -open * 1.5; bolt.position.x = 6.0 + lk * 1.0; lock.visible = lk > 0.5; lock.position.y = 4.32 - (lk > 0.5 ? (1 - clamp((lk - 0.5) / 0.5)) * -0.4 : 0); };
  root.leaf = leaf; root.W = W; return root;
}

// ---- midway dressing ----
export function midwayStall(name, cols = [FADED.pink, FADED.cream], o = {}) {
  const root = new THREE.Group(), b = new Batch(), a = aged(cols[0]), c = aged(cols[1]), W = o.w ?? 10, D = 6, H = 8;
  b.box(aged('#6b6556'), W + 1, 0.3, D + 1, 0, 0.15, 0, { r: 0.05 }); b.box(a, W, 3.0, 0.24, 0, 1.8, D / 2 - 0.1, { r: 0.05 }); b.box(c, W + 0.2, 0.22, 0.9, 0, 3.4, D / 2 - 0.2, { r: 0.06 }); b.box(a, W, H, 0.24, 0, H / 2 + 0.3, -D / 2, { r: 0.05 }); for (const sx of [-1, 1]) { b.box(a, 0.24, H, D, sx * W / 2, H / 2 + 0.3, 0, { r: 0.05 }); b.box(c, 0.4, H, 0.4, sx * W / 2, H / 2 + 0.3, D / 2, { r: 0.06 }); }
  b.box(aged('#49423b'), W, 0.2, D, 0, H + 0.4, 0, { r: 0.05 }); b.box(paint('#e0d8bc'), W - 0.5, 0.14, 0.14, 0, H - 0.2, D / 2 - 0.3, { r: 0.03 });
  // shelves of prizes nobody won: small plush heads
  const r = rng(name.length * 41); for (const y of [4.0, 5.9]) { b.box(c, W - 0.6, 0.14, 1.1, 0, y, -D / 2 + 0.7, { r: 0.03 }); for (let i = 0; i < 8; i++) { const x = -W / 2 + 1 + i * (W - 2) / 7, tc = paint([FADED.pink, FADED.sky, FADED.mustard, FADED.mint, '#a8a39a'][Math.floor(r() * 5)], { roughness: 0.9 }); const s = new THREE.SphereGeometry(0.42, 10, 8); b.add(tc, s, x, y + 0.5, -D / 2 + 0.7); const e1 = new THREE.SphereGeometry(0.16, 6, 6); b.add(tc, e1, x - 0.3, y + 0.92, -D / 2 + 0.7); const e2 = new THREE.SphereGeometry(0.16, 6, 6); b.add(tc, e2, x + 0.3, y + 0.92, -D / 2 + 0.7); } }
  root.add(b.done());
  const st = stripeTex(cols[0], cols[1], 14), aw = new THREE.Mesh(new THREE.PlaneGeometry(W + 1.4, 3.8), new THREE.MeshStandardMaterial({ map: st, roughness: 0.75, side: THREE.DoubleSide })); aw.rotation.x = -Math.PI / 2 + 0.55; aw.position.set(0, H + 0.4 - 0.05, D / 2 + 1.3); aw.castShadow = true; root.add(aw);
  const sg = srgb(canvasTex(800, 180, (x, w, h) => { x.fillStyle = cols[1]; x.fillRect(0, 0, w, h); x.font = '900 110px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#6e4238'; x.fillText(name, w / 2, h / 2 + 6); const q = rng(12); x.globalCompositeOperation = 'source-atop'; for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(190,180,150,${q() * 0.5})`; x.fillRect(q() * w, q() * h, 2 + q() * 14, 1 + q() * 5); } }));
  const s = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, 2.1), new THREE.MeshStandardMaterial({ map: sg, roughness: 0.6 })); s.position.set(0, H + 1.75, D / 2 + 0.05 - 0.3); root.add(s); const sb = new Batch(); sb.box(aged(cols[0]), W - 0.7, 2.3, 0.2, 0, H + 1.75, D / 2 - 0.42, { r: 0.05 }); sb.done(root);
  const lit = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, H - 3.7), new THREE.MeshBasicMaterial({ color: '#7a6e50', fog: true, transparent: true, opacity: 0.0 })); root.lit = lit; return root;
}
export function parkLamp() {
  const g = new THREE.Group(), b = new Batch(), m = aged('#40514d', { metalness: 0.45 }); b.cyl(m, 0.5, 0.75, 1.3, 0, 0.65, 0, { seg: 10 }); b.cyl(m, 0.14, 0.2, 13, 0, 7, 0, { seg: 8 }); b.cyl(m, 0.26, 0.26, 0.3, 0, 10, 0, { seg: 10 }); b.box(m, 3.6, 0.14, 0.14, 0, 13.4, 0, { r: 0.05 }); for (const sx of [-1, 1]) b.cyl(m, 0.1, 0.62, 0.46, sx * 1.8, 13.3, 0, { seg: 10 }); b.done(g);
  const gm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#d9e6a0').multiplyScalar(1.05) }); for (const sx of [-1, 1]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 8), gm); s.position.set(sx * 1.8, 13.0, 0); s.userData.noAO = true; g.add(s); } g.mat = gm; return g;
}
// string bulbs between points
export function stringBulbs(pairs, sag = 1.4, n = 18) {
  const g = new THREE.Group(), r0 = rng(77), bl = [], wire = new Batch(), wm = paint('#2a2a28');
  for (const [a, b] of pairs) { let pr = null; for (let i = 0; i <= n; i++) { const u = i / n, p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * sag; bl.push({ p: p.clone().add(v3(0, -0.2, 0)), c: BULB[i % 5], dead: r0() < 0.22 }); if (pr) { const m = p.clone().lerp(pr, 0.5), L = p.distanceTo(pr), d = p.clone().sub(pr).normalize(), c = new THREE.CylinderGeometry(0.03, 0.03, L, 4); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d)); wire.add(wm, c, m.x, m.y, m.z); } pr = p; } }
  g.add(wire.done()); const l = bulbs(bl, 0.14); g.add(l); g.level = (k) => l.level(k); return g;
}
export function paSpeakers() {
  const g = new THREE.Group(), b = new Batch(), m = aged('#40514d', { metalness: 0.45 }), h = paint('#a7a497', { roughness: 0.55, metalness: 0.2 }); b.cyl(m, 0.15, 0.24, 16, 0, 8, 0, { seg: 8 });
  for (const [ry, y] of [[0.5, 15.2], [-0.8, 15.2], [2.4, 13.7]]) { const c = new THREE.ConeGeometry(1.05, 1.9, 16, 1, true); c.rotateX(-Math.PI / 2); const q = new THREE.Mesh(c, new THREE.MeshStandardMaterial({ color: '#5d6a64', roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide })); q.rotation.y = ry; q.position.set(Math.sin(ry) * 1.2, y, Math.cos(ry) * 1.2); q.castShadow = true; g.add(q); const blk = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), paint('#121212')); blk.rotation.y = ry; blk.position.set(Math.sin(ry) * 0.42, y, Math.cos(ry) * 0.42); g.add(blk); const rb = new THREE.CylinderGeometry(0.34, 0.34, 0.5, 10); rb.rotateX(Math.PI / 2); b.add(m, rb, Math.sin(ry) * 0.2, y, Math.cos(ry) * 0.2, ry); }
  b.done(g); return g;
}
export function queueRope(pts, name) {
  const g = new THREE.Group(), b = new Batch(), brass = paint('#a58d57', { metalness: 0.6, roughness: 0.34 }), rope = paint('#7d3b38', { roughness: 0.8 });
  pts.forEach((p, i) => { b.cyl(brass, 0.08, 0.1, 3.2, p.x, 1.7, p.z, { seg: 8 }); b.cyl(brass, 0.5, 0.56, 0.16, p.x, 0.1, p.z, { seg: 14 }); const s = new THREE.SphereGeometry(0.16, 8, 6); b.add(brass, s, p.x, 3.34, p.z); if (i) { const a = pts[i - 1], L = a.distanceTo(p); let pr = v3(a.x, 3.05, a.z); for (let k = 1; k <= 10; k++) { const u = k / 10, q = a.clone().lerp(p, u); q.y = 3.05 - Math.sin(u * Math.PI) * 0.7; const m = q.clone().lerp(pr, 0.5), d = q.clone().sub(pr), l = d.length(), c = new THREE.CylinderGeometry(0.06, 0.06, l, 6); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d.normalize())); b.add(rope, c, m.x, m.y, m.z); pr = q; } } });
  b.done(g); return g;
}
export function broom() { const g = new THREE.Group(), b = new Batch(), w = aged('#8a6d48'); b.cyl(w, 0.07, 0.07, 6.2, 0, 3.1, 0, { seg: 8 }); b.box(aged('#463c30'), 1.5, 0.22, 0.4, 0, 0.42, 0, { r: 0.05 }); for (let i = 0; i < 26; i++) b.box(paint('#a89a6e', { roughness: 0.95 }), 0.05, 0.58, 0.05, -0.68 + i * 0.054, 0.14, -0.1 + (i % 3) * 0.1, { r: 0.01 }); b.done(g); return g; }
export function controlLever() { const g = new THREE.Group(), b = new Batch(); b.box(aged(FADED.teal), 2.2, 3.5, 1.4, 0, 1.75, 0, { r: 0.1 }); b.box(paint('#34332e'), 1.9, 0.14, 1.1, 0, 3.55, 0, { r: 0.04 }); b.box(paint('#b42f27', { emissive: '#7a140e', emissiveIntensity: 0.6 }), 0.26, 0.16, 0.26, -0.55, 3.66, 0.2, { r: 0.05 }); b.box(paint('#3fa45a', { emissive: '#176a30', emissiveIntensity: 0.6 }), 0.26, 0.16, 0.26, -0.15, 3.66, 0.2, { r: 0.05 }); b.done(g); const arm = new THREE.Group(); arm.position.set(0.5, 3.6, 0); const a = new Batch(); a.cyl(paint('#c6c0a8', { metalness: 0.7, roughness: 0.3 }), 0.07, 0.07, 1.6, 0, 0.8, 0, { seg: 8 }); const k = new THREE.SphereGeometry(0.2, 10, 8); a.add(paint('#8d2b23', { roughness: 0.4 }), k, 0, 1.66, 0); a.done(arm); g.add(arm); g.arm = arm; return g; }
export function ticketStub() { const t = srgb(canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#c98f96'; x.fillRect(0, 0, w, h); x.strokeStyle = '#7b4a4f'; x.lineWidth = 5; x.strokeRect(8, 8, w - 16, h - 16); x.fillStyle = '#5a2f35'; x.font = '900 46px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ADMIT', w / 2, h / 2 - 16); x.font = '900 34px ITTInter, sans-serif'; x.fillText('ONE', w / 2, h / 2 + 26); })); const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.55), [paint('#c98f96'), paint('#c98f96'), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }), paint('#c98f96'), paint('#c98f96')]); m.castShadow = true; return m; }
export function bareStrings() {
  const g = new THREE.Group(), r = rng(52), mat = new THREE.MeshStandardMaterial({ color: '#d6d1c4', roughness: 0.8 }); g.strands = [];
  for (let i = 0; i < 14; i++) { const pts = [], ang = r() * TAU, sp = 0.2 + r() * 0.6, L = 6 + r() * 3.5; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(v3(Math.cos(ang) * sp * u * 1.6, u * L, Math.sin(ang) * sp * u * 1.6)); } const c = new THREE.CatmullRomCurve3(pts), m = new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.022, 4), mat); g.add(m); g.strands.push(m); const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat); knot.position.copy(pts[8]); g.add(knot); }
  return g;
}
export function popcornTub() { const g = new THREE.Group(), st = stripeTex('#d7d0bb', FADED.red, 12); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.85, 14, 1, true), new THREE.MeshStandardMaterial({ map: st, roughness: 0.7, side: THREE.DoubleSide })); c.castShadow = true; g.add(c); const b = new Batch(), pm = paint('#e9dfb8', { roughness: 0.9 }), r = rng(17); for (let i = 0; i < 26; i++) { const a = r() * TAU, d = r() * 0.34, s = new THREE.IcosahedronGeometry(0.07 + r() * 0.05, 0); b.add(pm, s, Math.cos(a) * d, 0.36 + r() * 0.1, Math.sin(a) * d); } b.done(g); return g; }

// a red balloon; the name is on one side (faces local -z until rotated; the string hangs from the knot at y = 0)
export function balloon(name = 'PIPER') {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const R = 1.5;
  const prof = []; for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI, r = Math.sin(a) * R * (1 + 0.05 * Math.cos(a)), y = R * (1 - Math.cos(a)) * (1 + 0.12 * (1 - i / 28)); prof.push(new THREE.Vector2(Math.max(0.001, r), y + 0.15)); }
  const t = srgb(canvasTex(1024, 512, (x, w, h) => { const G = x.createLinearGradient(0, 0, 0, h); G.addColorStop(0, '#c4241c'); G.addColorStop(1, '#a01a14'); x.fillStyle = G; x.fillRect(0, 0, w, h); x.translate(w * 0.5, h * 0.52); x.scale(1.05, 1); x.font = '900 104px "Comic Sans MS", ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.lineJoin = 'round'; x.strokeStyle = '#fff4e2'; x.fillStyle = '#fff4e2'; x.fillText(name, 0, 0); x.strokeText(name, 0, 0); }));
  const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.28 })); m.castShadow = true; body.add(m);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 10), paint('#a01a14', { roughness: 0.5 })); knot.position.y = 0.04; body.add(knot); g.body = body; g.R = R; g.top = 2 * R * 1.08 + 0.15; return g;
}
// a string between two points, a straight thin cylinder (helium keeps it taut)
export function stringSeg(col = '#e7e1d0') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 5), paint(col, { roughness: 0.85 })); m.castShadow = false; m.userData.noAO = true; m.setEnds = (a, b) => { const d = b.clone().sub(a), L = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize()); }; return m; }

// ---- the rest of the park ----
export function teaCups() { const root = new THREE.Group(), plate = new THREE.Group(); root.add(plate); const b = new Batch(); b.cyl(aged('#5b5f54'), 13.4, 13.6, 0.4, 0, 0.2, 0, { seg: 40 }); root.add(b.done()); const p = new Batch(); p.cyl(aged('#a58e70'), 12.6, 12.6, 0.3, 0, 0.55, 0, { seg: 40 }); plate.add(p.done()); const cups = []; const CC = [FADED.pink, FADED.sky, FADED.mint, FADED.mustard, FADED.peach, FADED.teal]; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, g = new THREE.Group(); g.position.set(Math.cos(a) * 8.2, 0.7, Math.sin(a) * 8.2); const q = new Batch(), m = aged(CC[i]); q.cyl(m, 2.8, 2.2, 2.9, 0, 1.7, 0, { seg: 24 }); q.cyl(paint('#3f3a33'), 2.6, 2.6, 0.1, 0, 3.05, 0, { seg: 24 }); const h = new THREE.TorusGeometry(0.9, 0.16, 8, 18, Math.PI); h.rotateZ(-Math.PI / 2); q.add(aged(FADED.cream), h, 2.7, 1.8, 0); q.done(g); plate.add(g); cups.push(g); } root.update = (a, sp) => { plate.rotation.y = a; cups.forEach((c, i) => { c.rotation.y = a * 2.6 + i; }); }; return root; }
export function swingRide() { const root = new THREE.Group(), b = new Batch(), m = aged(FADED.cream); b.cyl(m, 1.2, 1.9, 24, 0, 12, 0, { seg: 14 }); b.cyl(aged('#5b5f54'), 9, 9.4, 0.6, 0, 0.3, 0, { seg: 32 }); root.add(b.done()); const top = new THREE.Group(); top.position.y = 24; root.add(top); const st = stripeTex(FADED.sky, FADED.cream, 20), c = new THREE.Mesh(new THREE.ConeGeometry(14, 4.4, 40, 1, true), new THREE.MeshStandardMaterial({ map: st, roughness: 0.7, side: THREE.DoubleSide })); c.position.y = 2.2; top.add(c); const r0 = rng(64), bl = []; for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; bl.push({ p: v3(Math.cos(a) * 14.1, -0.05, Math.sin(a) * 14.1), c: BULB[i % 5], dead: r0() < 0.2 }); } const lts = bulbs(bl, 0.18); top.add(lts); const seats = []; const s = new Batch(), ch = new THREE.Group(), cm = aged(FADED.pink); s.box(cm, 1.3, 0.2, 1.2, 0, -11.4, 0, { r: 0.05 }); s.box(cm, 1.3, 1.1, 0.15, 0, -10.9, -0.55, { r: 0.05 }); for (const sx of [-0.6, 0.6]) s.cyl(paint('#95938a', { metalness: 0.5 }), 0.03, 0.03, 11, sx, -5.5, 0, { seg: 4 }); s.done(ch); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, q = i ? ch.clone() : ch, pv = new THREE.Group(); pv.position.set(Math.cos(a) * 12.5, 0, -Math.sin(a) * 12.5); pv.rotation.y = a + Math.PI / 2; pv.add(q); top.add(pv); seats.push(q); } root.update = (a, sp, lv = 1) => { top.rotation.y = a; lts.level(lv); const fl = 0.08 + clamp(sp) * 0.5; seats.forEach((q, i) => { q.rotation.z = fl + Math.sin(a * 2 + i) * 0.02; }); }; return root; }
export function coaster() { const root = new THREE.Group(); const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40, a = u * TAU, r = 42 + Math.sin(a * 3) * 9; pts.push(v3(Math.cos(a) * r, 14 + Math.sin(a * 2 + 0.6) * 11 + Math.sin(a * 5) * 4, Math.sin(a) * r * 0.62)); } const C = new THREE.CatmullRomCurve3(pts, true), m = aged('#a8a292', { metalness: 0.2 }), rail = paint('#7e4b3e', { metalness: 0.4, roughness: 0.4 }), S = 400; const b = new Batch(); for (let i = 0; i < S; i++) { const u = i / S, p = C.getPoint(u), q = C.getPoint(u + 1 / S), d = q.clone().sub(p), L = d.length(); if (i % 12 === 0 && p.y > 1) { b.cyl(m, 0.18, 0.26, p.y, p.x, p.y / 2, p.z, { seg: 6 }); } const g = new THREE.BoxGeometry(0.2, 0.2, L + 0.1), n = v3(-d.z, 0, d.x).normalize().multiplyScalar(0.72); const qt = new THREE.Quaternion().setFromUnitVectors(v3(0, 0, 1), d.clone().normalize()); g.applyQuaternion(qt); const g2 = g.clone(); b.add(rail, g, p.x + n.x, p.y, p.z + n.z); b.add(rail, g2, p.x - n.x, p.y, p.z - n.z); } root.add(b.done()); const train = []; const t = new Batch(), cc = aged(FADED.red); t.box(cc, 2.6, 1.4, 3.6, 0, 1.0, 0, { r: 0.3 }); t.box(paint('#2f2f2c'), 2.2, 0.2, 3.1, 0, 1.75, 0, { r: 0.05 }); const car = t.done(); for (let i = 0; i < 4; i++) { const k = i ? car.clone() : car; root.add(k); train.push(k); } root.update = (u) => { train.forEach((k, i) => { const v = ((u - i * 0.0115) % 1 + 1) % 1, p = C.getPoint(v), q = C.getPoint((v + 0.002) % 1); k.position.copy(p); k.lookAt(q); }); }; return root; }

export function parkGround() {
  const G = new THREE.Group(), paver = surf('cobble', '#8b8a7b', { roughness: 0.74 });
  const b = new Batch(); b.box(paver, 80, 0.2, 90, 0, -0.1, -15, { r: 0.01 }); b.box(surf('concrete', '#5f6159', {}), 300, 0.16, 300, 0, -0.26, -40, { r: 0.01 }); b.box(surf('concrete', '#44453f', {}), 400, 0.2, 120, 0, -0.32, 86, { r: 0.01 });
  G.add(b.done());
  // the painted midway line and flecks of old confetti
  const t = srgb(canvasTex(512, 512, (x, w, h) => { x.clearRect(0, 0, w, h); const r = rng(61); for (let i = 0; i < 620; i++) { x.fillStyle = [FADED.pink, FADED.sky, FADED.mustard, FADED.mint, '#e2dcc6'][Math.floor(r() * 5)]; x.globalAlpha = 0.22 + r() * 0.5; x.save(); x.translate(r() * w, r() * h); x.rotate(r() * 6); x.fillRect(-2, -1, 3 + r() * 6, 2 + r() * 2); x.restore(); } })); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 14);
  const c = new THREE.Mesh(new THREE.PlaneGeometry(80, 90), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.8, depthWrite: false })); c.rotation.x = -Math.PI / 2; c.position.set(0, 0.015, -15); c.receiveShadow = true; c.userData.noAO = true; G.add(c);
  return G;
}
export function distantTrees(n = 120) { const g = new THREE.Group(), r = rng(98), cone = new THREE.ConeGeometry(1, 3, 7), tr = new THREE.InstancedMesh(cone, new THREE.MeshStandardMaterial({ color: '#1f2e29', roughness: 1 }), n), M = new THREE.Matrix4(); for (let i = 0; i < n; i++) { const a = r() * TAU, d = 150 + r() * 80, h = 16 + r() * 18; M.compose(v3(Math.cos(a) * d, h * 1.5 - 1, Math.sin(a) * d - 40), new THREE.Quaternion(), v3(h * 0.45, h, h * 0.45)); tr.setMatrixAt(i, M); } tr.userData.noAO = true; g.add(tr); return g; }

// ---- footprints nobody is making. list: [{ x, z, ry, t0, side }]; prints stay; each starts with a puff ----
export function shoePrints(list) {
  const t = canvasTex(128, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(w / 2, 84, 42, 72, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(w / 2, 206, 32, 40, 0, 0, 7); x.fill(); x.globalCompositeOperation = 'destination-out'; x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 5; for (let y = 22; y < 150; y += 16) { x.beginPath(); x.moveTo(w * 0.2, y); x.lineTo(w * 0.8, y + 5); x.stroke(); } });
  const g = new THREE.PlaneGeometry(0.72, 1.46); g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshBasicMaterial({ map: t, color: '#1c1b18', transparent: true, opacity: 0.74, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), ins = new THREE.InstancedMesh(g, m, list.length); ins.userData.noAO = true; ins.frustumCulled = false; ins.renderOrder = 2;
  const pt = canvasTex(128, 128, (x, w, h) => { const G = x.createRadialGradient(64, 64, 2, 64, 64, 62); G.addColorStop(0, 'rgba(255,255,255,0.8)'); G.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = G; x.fillRect(0, 0, w, h); });
  const pg = new THREE.PlaneGeometry(1.5, 1.5), pm = new THREE.MeshBasicMaterial({ map: pt, color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), puffs = new THREE.InstancedMesh(pg, pm, list.length); puffs.userData.noAO = true; puffs.frustumCulled = false; puffs.renderOrder = 3;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = v3(), P = v3(), C = new THREE.Color(), G = new THREE.Group(); G.add(ins, puffs); puffs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 3), 3);
  G.update = (t, camera) => { list.forEach((p, i) => { const a = t - p.t0, on = a >= 0; const s = on ? Math.min(1, a / 0.05) : 0; E.set(0, p.ry, 0); Q.setFromEuler(E); S.setScalar(Math.max(0.0001, s)); P.set(p.x, 0.035, p.z); M.compose(P, Q, S); ins.setMatrixAt(i, M); const k = on && a < 0.55 ? (1 - a / 0.55) : 0, sz = 0.35 + a * 2.4; P.set(p.x, 0.25 + a * 1.1, p.z); M.compose(P, camera.quaternion, S.setScalar(k > 0 ? sz : 0.0001)); puffs.setMatrixAt(i, M); C.set('#b9b5a0').multiplyScalar(k * 0.22); puffs.setColorAt(i, C); }); ins.instanceMatrix.needsUpdate = true; puffs.instanceMatrix.needsUpdate = true; puffs.instanceColor.needsUpdate = true; };
  return G;
}

// ---- the blue creature (an original design): big, soft, pear-shaped, worn out. Its fur is shells; a patched belly, a lanyard, heavy lids ----
function furTex() { const t = canvasTex(256, 256, (x, w, h) => { const d = x.createImageData(w, h), r = rng(5); for (let i = 0; i < w * h; i++) { const v = r() ** 1.5 * 255; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; } x.putImageData(d, 0, 0); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24, 24); return t; }
function furStripes() { const t = srgb(canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#53799e'; x.fillRect(0, 0, w, h); const r = rng(33); for (let i = 0; i < 3800; i++) { x.strokeStyle = r() < 0.5 ? 'rgba(36,58,90,0.32)' : 'rgba(126,162,190,0.26)'; x.lineWidth = 1 + r() * 2.4; const a = r() * w, b = r() * h; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (r() - 0.5) * 7, b + 5 + r() * 10); x.stroke(); } for (let i = 0; i < 22; i++) { x.fillStyle = `rgba(40,54,70,${0.05 + r() * 0.08})`; x.beginPath(); x.ellipse(r() * w, r() * h, 20 + r() * 50, 14 + r() * 40, r() * 3, 0, 7); x.fill(); } })); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t; }
function creatureFace() {
  const draw = (lid, look = 0) => srgb(canvasTex(768, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h); const cy = 200;
    for (const sx of [-1, 1]) {
      const ex = w / 2 + sx * 150;
      x.fillStyle = 'rgba(30,42,66,0.75)'; x.beginPath(); x.ellipse(ex, cy + 44, 108, 88, 0, 0, 7); x.fill();                                   // the bags under its eyes
      x.fillStyle = '#e8e2c6'; x.beginPath(); x.ellipse(ex, cy, 84, 78, 0, 0, 7); x.fill();
      x.fillStyle = '#23201c'; x.beginPath(); x.ellipse(ex + look * 20, cy + 12, 32, 36, 0, 0, 7); x.fill(); x.fillStyle = '#efe8d6'; x.beginPath(); x.arc(ex + look * 20 - 12, cy - 2, 8, 0, 7); x.fill();
      // a heavy upper lid (top down to y): a slight downward tilt to the outside
      const lidY = cy - 80 + lid * 158; x.fillStyle = '#44648c'; x.save(); x.beginPath(); x.ellipse(ex, cy, 90, 84, 0, 0, 7); x.clip(); x.translate(ex, lidY); x.rotate(sx * 0.14); x.fillRect(-140, -220, 280, 220); x.restore();
      x.strokeStyle = '#1e2a42'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.ellipse(ex, cy, 86, 80, 0, 0.1, Math.PI - 0.1); x.stroke(); x.save(); x.translate(ex, Math.min(lidY, cy + 80)); x.rotate(sx * 0.14); x.beginPath(); x.moveTo(-82, 0); x.lineTo(82, 0); x.stroke(); x.restore();
    }
    x.strokeStyle = '#1b2438'; x.lineWidth = 12; x.lineCap = 'round'; x.beginPath(); x.moveTo(w / 2 - 66, 400); x.quadraticCurveTo(w / 2, 372, w / 2 + 58, 406); x.stroke();                // a small, tired mouth
    x.fillStyle = '#2b3852'; x.beginPath(); x.ellipse(w / 2, 318, 22, 15, 0, 0, 7); x.fill();
  }));
  return { tired: draw(0.42), heavy: draw(0.66), shut: draw(1.0), wide: draw(0.2), tiredL: draw(0.42, -1), tiredR: draw(0.42, 1) };
}
export function blueCreature() {
  const root = new THREE.Group(); root.name = 'creature';
  const furMap = furStripes(), fA = furTex(), base = new THREE.MeshStandardMaterial({ map: furMap, roughness: 0.95 });
  const shell = (i, N) => { const off = 0.03 + i * 0.05, m = new THREE.MeshStandardMaterial({ map: furMap, color: new THREE.Color().setScalar(0.96 + i * 0.02), roughness: 1, alphaMap: fA, alphaTest: 0.16 + i * 0.13, side: THREE.FrontSide }); m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${off.toFixed(3)};`); }; m.customProgramCacheKey = () => 'fur' + i; return m; };
  const shells = [1, 2, 3, 4, 5].map((i) => shell(i, 5));
  const furry = (geo) => { const g = new THREE.Group(), m = new THREE.Mesh(geo, base); m.castShadow = true; m.receiveShadow = true; g.add(m); shells.forEach((s) => { const q = new THREE.Mesh(geo, s); q.userData.noAO = true; q.castShadow = false; g.add(q); }); return g; };
  const cap = (r, L) => new THREE.CapsuleGeometry(r, L, 8, 18);
  // hips (y 2.3 when standing) -> torso -> head; arms from the shoulders; legs from the hips
  const hips = new THREE.Group(); hips.position.y = 2.25; root.add(hips);
  const torso = new THREE.Group(); torso.position.y = 0.2; hips.add(torso);
  const prof = []; for (let i = 0; i <= 26; i++) { const u = i / 26, r = lerp(3.0, 1.75, u ** 1.3) + Math.sin(u * Math.PI) * 0.8; prof.push(new THREE.Vector2(Math.max(0.02, r * Math.sin(Math.min(1, (i + 0.5) / 2.5) * Math.PI / 2) * (i >= 24 ? 1 - (i - 23) * 0.32 : 1)), -0.9 + u * 6.2)); }
  const belly = furry(new THREE.LatheGeometry(prof, 36)); torso.add(belly);
  { const p = new THREE.Mesh(new THREE.SphereGeometry(2.38, 24, 16, Math.PI / 2 - 0.62, 1.24, Math.PI / 2 - 0.5, 1.15), new THREE.MeshStandardMaterial({ roughness: 0.95, map: srgb(canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#7f9bae'; x.fillRect(0, 0, w, h); const r = rng(12); for (let i = 0; i < 2000; i++) { x.strokeStyle = 'rgba(70,92,112,0.25)'; x.lineWidth = 1.5; const a = r() * w, b = r() * h; x.beginPath(); x.moveTo(a, b); x.lineTo(a + r() * 5, b + 8); x.stroke(); } x.strokeStyle = '#2b3347'; x.lineWidth = 10; x.lineCap = 'round'; for (let i = 0; i < 18; i++) { const a = i / 18 * 7; const px = w / 2 + Math.cos(a) * 225, py = h / 2 + Math.sin(a) * 225; x.beginPath(); x.moveTo(px - 16 * Math.cos(a + 0.9), py - 16 * Math.sin(a + 0.9)); x.lineTo(px + 16 * Math.cos(a + 0.9), py + 16 * Math.sin(a + 0.9)); x.stroke(); } })) })); p.position.y = 0.7; p.scale.set(1.17, 1.14, 1.17); p.receiveShadow = true; torso.add(p); }
  const neck = new THREE.Group(); neck.position.y = 5.1; torso.add(neck);
  const headM = new THREE.SphereGeometry(2.1, 28, 20); headM.scale(1.12, 0.92, 1.0); const head = furry(headM); head.position.y = 1.15; neck.add(head);
  // small ears, a little crooked, one sags
  for (const sx of [-1, 1]) { const e = furry(new THREE.SphereGeometry(0.72, 14, 10)); e.position.set(sx * 1.85, 2.75 - (sx > 0 ? 0.2 : 0), -0.2); e.rotation.z = -sx * 0.5; e.scale.set(1, 1.2, 0.5); neck.add(e); }
  // the face is painted on a patch of the head's own shape, so it can't float
  const F = creatureFace(); const faceG = new THREE.SphereGeometry(2.13, 32, 24, Math.PI / 2 - 1.05, 2.1, Math.PI / 2 - 0.82, 1.5); faceG.scale(1.12, 0.92, 1.0);
  const faceM = new THREE.MeshStandardMaterial({ map: F.tired, transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }); const face = new THREE.Mesh(faceG, faceM); face.position.y = 1.15; face.userData.noAO = true; neck.add(face);
  // a worn staff lanyard and badge
  { const l = new THREE.Mesh(new THREE.TorusGeometry(1.92, 0.05, 6, 40), paint('#b73a33', { roughness: 0.7 })); l.rotation.x = Math.PI / 2 - 0.3; l.position.set(0, 4.46, 0.05); torso.add(l); const t = srgb(canvasTex(256, 320, (x, w, h) => { x.fillStyle = '#e8dcb6'; x.fillRect(0, 0, w, h); x.strokeStyle = '#6a3a33'; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16); x.fillStyle = '#6a3a33'; x.font = '900 62px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('STAFF', w / 2, 92); x.fillStyle = '#a65248'; x.fillRect(38, 130, w - 76, 120); x.fillStyle = '#efe7cf'; x.font = '900 46px ITTInter, sans-serif'; x.fillText('SHIFT', w / 2, 192); x.fillText('#1', w / 2, 240); })); const b = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.96, 0.05), [paint('#d2c8a4'), paint('#d2c8a4'), paint('#d2c8a4'), paint('#d2c8a4'), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }), paint('#d2c8a4')]); b.position.set(0, 3.25, 2.42); b.rotation.x = -0.2; torso.add(b); }
  const arms = [], elbow = [], hand = [];
  for (const sx of [-1, 1]) {   // sx -1 is the character's right (+x is its left when it faces +z)
    const sh = new THREE.Group(); sh.position.set(sx * 2.42, 3.85, 0.1); torso.add(sh);
    const up = furry(cap(0.72, 1.7)); up.position.y = -1.12; sh.add(up);
    const el = new THREE.Group(); el.position.y = -2.55; sh.add(el); const fo = furry(cap(0.66, 1.7)); fo.position.y = -1.05; el.add(fo);
    const ha = new THREE.Group(); ha.position.y = -2.4; el.add(ha); const mit = furry(new THREE.SphereGeometry(0.8, 16, 12)); mit.scale.y = 0.85; ha.add(mit);
    for (let f = 0; f < 3; f++) { const q = furry(cap(0.2, 0.6)); q.position.set(sx * (-0.34 + f * 0.34), -0.72, 0.28); q.rotation.x = -0.2; ha.add(q); }
    arms.push(sh); elbow.push(el); hand.push(ha);
  }
  const legs = []; for (const sx of [-1, 1]) { const l = new THREE.Group(); l.position.set(sx * 1.25, -0.4, 0); hips.add(l); const th = furry(cap(0.95, 0.5)); th.position.y = -0.8; l.add(th); const ft = furry(new THREE.SphereGeometry(1.0, 16, 12)); ft.scale.set(0.92, 0.5, 1.5); ft.position.set(0, -1.46, 0.5); l.add(ft); legs.push(l); }
  const api = { root, hips, torso, neck, arms, elbow, hand, legs, face };
  api.hipRest = 2.25;
  api.reset = () => { hips.position.set(0, 2.25, 0); hips.rotation.set(0, 0, 0); torso.rotation.set(0, 0, 0); neck.rotation.set(0, 0, 0); arms.forEach((a) => a.rotation.set(0, 0, 0)); arms[0].quaternion.identity(); arms[1].quaternion.identity(); arms[0].rotation.z = 0.2; arms[1].rotation.z = -0.2; elbow.forEach((a) => a.rotation.set(0, 0, 0)); legs.forEach((l) => l.rotation.set(0, 0, 0)); root.rotation.set(0, 0, 0); };
  api.setFace = (k) => { faceM.map = F[k] || F.tired; faceM.needsUpdate = true; };
  // aim one arm straight at a world point (the arm's rest direction is down): side 0 is its right (-x), side 1 its left
  api.aim = (side, world, k = 1, bend = 0) => { root.updateMatrixWorld(true); const s = arms[side], par = s.parent, o = s.getWorldPosition(v3()), d = par.worldToLocal(world.clone()).sub(s.position).normalize(), q = new THREE.Quaternion().setFromUnitVectors(v3(0, -1, 0), d); s.quaternion.slerp(q, k); elbow[side].rotation.x = -bend; };
  api.handP = (side) => { root.updateMatrixWorld(true); return hand[side].getWorldPosition(v3()); };
  api.reset();
  return api;
}
