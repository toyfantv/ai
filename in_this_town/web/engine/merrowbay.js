// The Voice in Every Ear (Flower Man remake 7): Merrow Bay, a bright harbour town where a gold bead in your ear feeds you every word.
//   goldBead(c, side)  a bead on a character's head: .set(on), .level(k)      looseBead()  the bead on its own
//   bayWater()  the sea at y = WATER: .update(t, k)            ferry(name)  deck at world y = DECK: .benches [{x, z}], .seatY
//   harbour()  quay along x, sea at z < 0, dock at x 0..11, school at x ~ 86: .birthday .plaza .quiz .schoolGate (points), .beadSpots (world points for the reveal)
//   classroom() (.seat(col, row), .seatY, .deskTop), lunchroom() (.seatY, .top), oneOrb() (.set(k)), threads(N) (.set(i, a, b), .level(k))
import * as THREE from 'three';
import { v3, rng, clamp } from './core.js';
import { Batch, surf, paint, lamp, sign } from './kit.js';
import { canvasTex, glowSprite } from './props.js';

export const WATER = -6, DECK = 0.5;
const GOLD = () => paint('#f5c23a', { metalness: 0.85, roughness: 0.22, emissive: '#b97a10', emissiveIntensity: 0.5 });
const WHITE = () => paint('#fbfaf3', { roughness: 0.5 });
const TEAL = () => paint('#14a3a8', { roughness: 0.45 });
const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } }); return g; };
const flat = (mat, w, d, x, y, z) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); const P = g.attributes.position, uv = g.attributes.uv, sp = mat.userData.span || 8; for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + x) / sp, (P.getZ(i) + z) / sp); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; return m; };

// ---- the bead ----
function beadMesh(r = 0.2) {
  const g = new THREE.Group(), m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), GOLD().clone());
  const hl = new THREE.Mesh(new THREE.SphereGeometry(r * 0.32, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4c8').multiplyScalar(1.4) })); hl.position.set(r * 0.42, r * 0.5, r * 0.55); hl.userData.noAO = true;
  const halo = glowSprite('#ffc94a', r * 7, 0.26); halo.userData.noAO = true; g.add(m, hl, halo); g.halo = halo; g.core = m; return g;
}
export function looseBead(r = 0.26) { const g = beadMesh(r); g.level = (k) => { g.halo.material.opacity = 0.34 * k; }; return g; }
export function goldBead(c, side = 1) {
  const hb = new THREE.Box3(); c.root.updateMatrixWorld(true); c.headParts.forEach((q) => hb.expandByObject(q));
  const cen = hb.getCenter(v3()), sz = hb.getSize(v3()), g = beadMesh(0.19), P = c.head.worldToLocal(v3(cen.x + side * sz.x * 0.5, hb.min.y + sz.y * 0.42, cen.z)); g.position.copy(P); c.head.add(g);
  g.level = (k) => { g.halo.material.opacity = 0.34 * k; g.halo.scale.setScalar(1.0 + k * 1.0); g.core.material.emissiveIntensity = 0.5 + k * 0.5; };
  g.set = (on) => { g.visible = on; }; g.level(0.3); return g;
}

// ---- the sea: two scrolled ripple layers on a lit surface, so it follows the sky when the light goes wrong ----
export function bayWater() {
  const g = new THREE.Group();
  const nrm = (() => { const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N), r = rng(5), W = []; for (let i = 0; i < 26; i++) W.push([1 + Math.floor(r() * 7), Math.floor(r() * 9) - 4, r() * 6.28, 0.5 + r() * 0.6]); const hAt = (u, v) => W.reduce((s, [a, b, p, k]) => s + Math.sin((u * a + v * b) * 6.283 + p) * k / (a + Math.abs(b) + 1), 0); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const u = i / N, v = j / N, e = 1 / N, dx = (hAt(u + e, v) - hAt(u - e, v)) * 16, dy = (hAt(u, v + e) - hAt(u, v - e)) * 16, k = (j * N + i) * 4; im.data[k] = 128 + clamp(dx, -1, 1) * 127; im.data[k + 1] = 128 + clamp(dy, -1, 1) * 127; im.data[k + 2] = 255; im.data[k + 3] = 255; } x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; })();
  const mk = (rep, op, col) => { const t = nrm.clone(); t.needsUpdate = true; t.repeat.set(rep, rep); const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.2, metalness: 0.12, normalMap: t, normalScale: new THREE.Vector2(0.7, 0.7), transparent: op < 1, opacity: op, envMapIntensity: 1.1 }), q = new THREE.PlaneGeometry(5200, 5200); q.rotateX(-Math.PI / 2); const me = new THREE.Mesh(q, m); me.receiveShadow = false; me.userData.noAO = true; me.position.y = WATER + (op < 1 ? 0.04 : 0); g.add(me); return m; };
  const A = mk(170, 1, '#149dbf'), B = mk(420, 0.42, '#1fb7c9');
  g.update = (t) => { A.normalMap.offset.set(t * 0.012, t * 0.008); B.normalMap.offset.set(-t * 0.03, t * 0.021); };
  return g;
}

// ---- gulls ----
export function gulls(n = 14, seed = 4) {
  const g = new THREE.Group(), r = rng(seed), m = paint('#fbfbf5', { roughness: 0.7, side: THREE.DoubleSide }), list = [];
  for (let i = 0; i < n; i++) { const b = new THREE.Group(); const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.8, 4, 8), m); body.rotation.x = Math.PI / 2; const wing = (s) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), m); w.geometry.rotateX(-Math.PI / 2); w.geometry.translate(s * 0.8, 0, 0); return w; }; const a = wing(1), c = wing(-1); b.add(body, a, c); g.add(b); list.push({ b, a, c, R: 8 + r() * 26, y: 8 + r() * 14, w: (0.25 + r() * 0.3) * (r() < 0.5 ? -1 : 1), ph: r() * 6.28, f: 5 + r() * 3 }); }
  g.update = (t) => { for (const q of list) { const an = q.ph + t * q.w; q.b.position.set(Math.cos(an) * q.R, q.y + Math.sin(t * 0.7 + q.ph) * 1.2, Math.sin(an) * q.R); q.b.rotation.y = -an + (q.w > 0 ? 0 : Math.PI); const fl = Math.sin(t * q.f + q.ph) * 0.5; q.a.rotation.z = fl; q.c.rotation.z = -fl; } };
  return g;
}

// ---- the ferry: long along x, bow +x, deck at world y = DECK when the group sits at y = 0 ----
export function ferry(name = 'MERROW QUEEN') {
  const g = new THREE.Group(), b = new Batch(), hull = WHITE(), teal = TEAL(), plank = surf('plank', '#d3a56b'), red = paint('#e0483a', { roughness: 0.45 }), yellow = paint('#f6c844', { roughness: 0.42 }), steel = paint('#3a4552', { metalness: 0.55, roughness: 0.4 }), L = 56, W0 = 20, D = DECK;
  b.box(hull, L, 6.2, W0, 0, D - 3.2, 0, { r: 1.4 }); b.box(teal, L + 0.4, 1.2, W0 + 0.4, 0, D - 2.6, 0, { r: 0.4 }); b.box(red, L + 0.3, 1.3, W0 + 0.3, 0, D - 5.6, 0, { r: 0.4 }); b.box(hull, 12, 6.2, 12, L / 2 + 3, D - 3.2, 0, { r: 1.4, ry: Math.PI / 4 });
  g.add(flat(plank, L - 1, W0 - 1, 0, D + 0.02, 0));
  for (const s of [-1, 1]) { for (let x = -26; x <= 26; x += 4) b.cyl(steel, 0.09, 0.09, 3.0, x, D + 1.5, s * (W0 / 2 - 0.4), { seg: 8 }); for (const y of [D + 1.5, D + 3]) b.cyl(WHITE(), 0.11, 0.11, 53, 0, y, s * (W0 / 2 - 0.4), { rz: Math.PI / 2, seg: 8 }); }
  // the canopy on posts, striped trim
  for (const z of [-7.6, 7.6]) for (let x = -22; x <= 22; x += 11) b.cyl(WHITE(), 0.22, 0.24, 11.5, x, D + 5.75, z, { seg: 10 });
  b.box(WHITE(), 50, 0.5, 17, 0, D + 11.7, 0, { r: 0.2 }); for (let i = -6; i <= 6; i++) for (const s of [-1, 1]) b.box(i % 2 ? yellow : teal, 3.8, 1.0, 0.2, i * 3.85, D + 11.1, s * 8.55, { r: 0.05 });
  // the benches: two long rows of separate seats on thin legs, open underneath
  const benches = [], seatH = 1.75;
  for (const [z, ry] of [[-2.2, 0], [2.2, 1]]) for (let x = -18; x <= 18; x += 9.2) { const s = 8.2; b.box(yellow, s, 0.26, 2.3, x, D + seatH, z + (ry ? 0.12 : -0.12), { r: 0.08 }); b.box(yellow, s, 1.9, 0.26, x, D + seatH + 1.1, ry ? z - 0.92 : z + 0.92, { r: 0.08 }); for (const lx of [-3.6, 3.6]) { b.cyl(steel, 0.11, 0.11, seatH, x + lx, D + seatH / 2, z, { seg: 8 }); b.box(steel, 0.2, 0.14, 2.0, x + lx, D + seatH - 0.1, z, { r: 0.03 }); } benches.push({ x, z, ry }); }
  // wheelhouse at the stern end, funnel, lifebuoys, name
  b.box(WHITE(), 9, 7.5, 13, -21.5, D + 3.75, 0, { r: 0.4 }); b.box(TEAL(), 9.4, 0.8, 13.4, -21.5, D + 7.6, 0, { r: 0.2 }); b.cyl(red, 1.8, 2.1, 7, -22, D + 14.8, 0); b.cyl(steel, 1.9, 1.9, 1.1, -22, D + 18.3, 0);
  for (const z of [-3, 0, 3]) b.box(paint('#2b4b63', { roughness: 0.12, metalness: 0.2 }), 0.2, 2.4, 2.2, -16.95, D + 5, z, { r: 0.04 });
  b.done(g);
  for (const [x, z, ry] of [[-8, W0 / 2 - 0.2, 0], [11, W0 / 2 - 0.2, 0], [-8, -W0 / 2 + 0.2, Math.PI], [11, -W0 / 2 + 0.2, Math.PI]]) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.27, 10, 22), new THREE.MeshStandardMaterial({ color: '#f25d48', roughness: 0.5 })); m.position.set(x, D + 2.2, z + (ry ? -0.3 : 0.3)); m.castShadow = true; g.add(m); }
  for (const s of [-1, 1]) { const p = sign(name, { w: 15, h: 2, bg: '#fbfaf3', fg: '#0f7c86', frame: '#fbfaf3' }); p.position.set(4, D - 1.5, s * (W0 / 2 + 0.25)); if (s < 0) p.rotation.y = Math.PI; g.add(p); }
  // foam along the hull
  const foam = canvasTex(512, 64, (x, w, h) => { x.clearRect(0, 0, w, h); const r = rng(8); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.5})`; const px = r() * w, py = Math.pow(r(), 1.8) * h; x.beginPath(); x.arc(px, py, 1 + r() * 4.5, 0, 6.3); x.fill(); } }); foam.wrapS = THREE.RepeatWrapping; foam.colorSpace = THREE.SRGBColorSpace;
  const fm = new THREE.MeshBasicMaterial({ map: foam, transparent: true, opacity: 0.8, depthWrite: false }); g.foam = [-1, 1].map((s) => { const q = new THREE.Mesh(new THREE.PlaneGeometry(66, 4.5), fm); q.rotation.x = -Math.PI / 2; q.position.set(1, WATER + 0.12, s * (W0 / 2 + 2.1)); if (s < 0) q.rotation.z = Math.PI; q.userData.noAO = true; g.add(q); return q; });
  g.update = (t, v) => { foam.offset.x = t * v; }; g.foamK = (k) => { fm.opacity = 0.8 * k; };
  g.benches = benches; g.seatY = D + seatH + 0.13; g.deck = D; shadowAll(g); return g;
}

// ---- Merrow Bay: pastel terraces on a hill above a stone quay ----
const PAST = ['#f7c8c0', '#ffe39c', '#a9dfd8', '#f8b786', '#bcd8f5', '#d8c8f0', '#f3a7a0', '#fff1cf', '#9ed3b5'];
function house(b, x, y0, z, w, h, col, r, shop) {
  const wall = surf('stucco', col), trim = WHITE(), glass = paint('#2f5270', { roughness: 0.12, metalness: 0.25 }), roof = surf('shingle', ['#c9593f', '#b84a42', '#3f7f8a', '#d0713f'][Math.floor(r() * 4)]), d = 14, f = -d / 2;
  b.box(wall, w, h, d, x, y0 + h / 2, z, { r: 0.12 });
  const rh = 5 + r() * 2.5, sl = Math.hypot(w / 2 + 0.6, rh); for (const s of [-1, 1]) b.box(roof, sl, 0.5, d + 1.4, x + s * (w / 4 + 0.15), y0 + h + rh / 2, z, { r: 0.08, rz: -s * Math.atan2(rh, w / 2 + 0.6) });
  { const sh = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rh - 0.2)]), gg = new THREE.ShapeGeometry(sh); b.add(wall, gg, x, y0 + h, z + f - 0.01, Math.PI); }
  const cols = Math.max(2, Math.round(w / 5.6)), floors = Math.floor((h - (shop ? 8 : 3)) / 7);
  for (let fl = 0; fl < floors; fl++) for (let c = 0; c < cols; c++) { const wx = x + (c - (cols - 1) / 2) * (w / cols), wy = y0 + (shop ? 10.5 : 5) + fl * 7; b.box(trim, 3.1, 4.4, 0.3, wx, wy, z + f - 0.08, { r: 0.05 }); b.box(glass, 2.5, 3.8, 0.12, wx, wy, z + f - 0.24, { r: 0.02 }); b.box(trim, 0.16, 3.8, 0.1, wx, wy, z + f - 0.32, { r: 0.02 }); b.box(trim, 2.5, 0.16, 0.1, wx, wy, z + f - 0.32, { r: 0.02 }); b.box(paint('#a86a3f'), 3.4, 0.5, 0.9, wx, wy - 2.6, z + f - 0.5, { r: 0.08 }); for (let k = -2; k <= 2; k++) b.box(paint(['#e84f6a', '#ffd34d', '#ff8fbd'][Math.floor(r() * 3)], { roughness: 0.8 }), 0.5, 0.5, 0.5, wx + k * 0.6, wy - 2.15, z + f - 0.55, { r: 0.2 }); }
  if (shop) { const awn = [TEAL(), paint('#f25d48'), paint('#f6c844')][Math.floor(r() * 3)]; b.box(glass, w - 5, 5.4, 0.14, x - 1, y0 + 3.9, z + f - 0.1, { r: 0.04 }); b.box(paint('#6d4a2d'), 3.1, 6.4, 0.2, x + w / 2 - 2.6, y0 + 3.2, z + f - 0.12, { r: 0.05 }); for (let i = 0; i < Math.floor(w / 2); i++) b.box(i % 2 ? WHITE() : awn, 2, 0.26, 3.2, x - w / 2 + 1 + i * 2, y0 + 7.8, z + f - 1.6, { rx: 0.42, r: 0.06 }); }
  else { b.box(paint(['#2f6f8f', '#c7493f', '#3d8b63'][Math.floor(r() * 3)]), 3, 6.3, 0.22, x, y0 + 3.15, z + f - 0.12, { r: 0.05 }); b.box(trim, 3.8, 0.4, 0.6, x, y0 + 6.5, z + f - 0.2, { r: 0.05 }); }
}
export function harbour() {
  const g = new THREE.Group(), b = new Batch(), r = rng(21), stone = surf('cobble', '#d9cdb9'), edge = paint('#b7ab98', { roughness: 0.8 }), plank = surf('plank', '#c49662'), piling = paint('#5f4630', { roughness: 0.85 });
  g.add(flat(stone, 420, 60, 0, 0, 30)); b.box(edge, 420, 8, 2, 0, -4, -0.4, { r: 0.2 }); b.box(edge, 420, 0.5, 1.6, 0, 0.18, 0.6, { r: 0.1 });
  // back terrace and two rows higher up the hill
  const spots = [];
  const row = (z, y0, sh, x0, x1) => { for (let x = x0; x < x1;) { const w = 15 + r() * 8, h = 18 + r() * 10; house(b, x + w / 2, y0, z, w, h, PAST[Math.floor(r() * PAST.length)], r, sh); for (let i = 0; i < 6; i++) spots.push(v3(x + r() * w, y0 + 5 + r() * (h - 8), z - 7.6)); x += w + 0.1; } };
  row(67, 0, true, -210, 60); row(67, 0, false, 134, 210); b.box(surf('grass', '#7cc86a'), 430, 26, 40, 0, 12, 92, { r: 1 }); row(96, 25, false, -212, 212); b.box(surf('grass', '#74c066'), 430, 30, 40, 0, 28, 118, { r: 1 }); row(124, 43, false, -212, 212);
  // the dock
  g.add(flat(plank, 11, 66, 5.5, 0.32, -33)); b.box(plank, 11, 0.5, 66, 5.5, 0.06, -33, { r: 0.08 });
  for (let z = -4; z >= -64; z -= 7.5) for (const x of [0.6, 10.4]) { b.cyl(piling, 0.5, 0.55, 11, x, -2.6, z, { seg: 10 }); b.cyl(paint('#f6c844'), 0.56, 0.56, 0.4, x, 2.3, z, { seg: 10 }); }
  // lamps, bunting posts, a fountain on the plaza
  g.add(...[-120, -96, -72, -50, -26, 26, 50, 74, 112, 136].map((x) => { const l = lamp({ height: 12, color: '#205e66' }); l.position.set(x, 0, 6); return l; }));
  { const P = v3(-62, 0, 40), w = surf('stucco', '#e9dfca'); b.cyl(w, 8, 8.4, 1.4, P.x, 0.7, P.z, { seg: 40 }); b.cyl(paint('#27b9c9', { roughness: 0.15 }), 7.3, 7.3, 0.1, P.x, 1.32, P.z, { seg: 40 }); b.cyl(w, 1.1, 1.6, 4.6, P.x, 3.2, P.z, { seg: 18 }); b.cyl(GOLD(), 2.2, 1.4, 0.7, P.x, 5.7, P.z, { seg: 24 }); }
  // the café table for the joke, the park bench for the flowers
  { const wood = paint('#a86f3f', { roughness: 0.6 }); for (const [x, z] of [[-30, 42], [-96, 44]]) { b.cyl(WHITE(), 3.1, 3.1, 0.2, x, 3.4, z, { seg: 28 }); b.cyl(paint('#3a4552'), 0.2, 0.3, 3.4, x, 1.7, z, { seg: 10 }); } b.box(wood, 10, 0.4, 2.6, -88, 1.75, 26, { r: 0.1 }); b.box(wood, 10, 2.2, 0.4, -88, 3.1, 27.3, { r: 0.1 }); for (const x of [-92, -84]) b.box(paint('#2e3a42', { metalness: 0.5 }), 0.5, 1.75, 2.4, x, 0.87, 26, { r: 0.05 }); }
  // the birthday table with its cake, bunting overhead
  { const T = v3(-140, 0, 34), cloth = paint('#fdf6e3', { roughness: 0.75 }); b.box(cloth, 13, 0.3, 6.2, T.x, 3.55, T.z, { r: 0.1 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(paint('#c98a56'), 0.2, 0.2, 3.5, T.x + sx * 5.6, 1.75, T.z + sz * 2.4, { seg: 8 }); b.cyl(paint('#ffd9e5', { roughness: 0.55 }), 2.2, 2.3, 1.7, T.x - 2, 4.55, T.z, { seg: 32 }); b.cyl(paint('#fff6e8', { roughness: 0.55 }), 2.32, 2.32, 0.3, T.x - 2, 5.4, T.z, { seg: 32 }); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; b.cyl(paint(['#ff6b6b', '#49c6e5', '#ffd34d'][i % 3], { roughness: 0.4 }), 0.07, 0.07, 0.8, T.x - 2 + Math.cos(a) * 1.5, 5.95, T.z + Math.sin(a) * 1.5, { seg: 6 }); } for (const [dx, c, h] of [[3, '#49c6e5', 1.1], [4.4, '#ff8fbd', 0.9]]) b.box(paint(c), 1.2, h, 1.2, T.x + dx, 3.7 + h / 2, T.z - 0.4, { r: 0.1 }); g.birthday = T; }
  g.flames = (() => { const T = g.birthday, m = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.32, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc35a').multiplyScalar(1.5) }), 12), M = new THREE.Matrix4(); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; M.setPosition(T.x - 2 + Math.cos(a) * 1.5, 6.54, T.z + Math.sin(a) * 1.5); m.setMatrixAt(i, M); } m.userData.noAO = true; return m; })(); g.add(g.flames);
  // the quiz stage: two desks, nine columns of TIE on a board, a trophy sawn in half
  { const Q = v3(-190, 0, 42), wood = paint('#3a68a8', { roughness: 0.5 }), wood2 = paint('#d8483f', { roughness: 0.5 }), floor = surf('plank', '#c49662'); b.box(floor, 40, 1.2, 18, Q.x, 0.6, Q.z, { r: 0.1 }); b.box(wood, 9, 3.6, 2, Q.x - 8, 3.0, Q.z - 2, { r: 0.12 }); b.box(wood2, 9, 3.6, 2, Q.x + 8, 3.0, Q.z - 2, { r: 0.12 }); b.cyl(paint('#6f4a2c'), 1.2, 1.5, 3.2, Q.x, 2.8, Q.z - 3, { seg: 20 }); g.quiz = Q; }
  { const Q = g.quiz, bd = sign('QUIZ FINAL\nYEAR 9:  TIE', { w: 24, h: 10, bg: '#0f3b57', fg: '#ffe48a', frame: '#f6c844' }); bd.position.set(Q.x, 12, Q.z + 9.1); bd.rotation.y = Math.PI; g.add(bd); const t = new THREE.Group(), bt = new Batch(); for (const s of [-1, 1]) { bt.box(GOLD(), 1.0, 0.4, 2.2, s * 0.9, 4.65, 0, { r: 0.05 }); bt.box(GOLD(), 0.5, 1.4, 0.9, s * 0.9, 5.4, 0, { r: 0.05 }); bt.cyl(GOLD(), 1.0, 0.5, 2.0, s * 0.9, 7.0, 0, { seg: 18 }); } bt.done(t); t.position.set(Q.x, 0, Q.z - 3); g.add(t); }
  // the school at the east end of the quay
  { const S = v3(95, 0, 58), brick = surf('brick', '#d26a4e'), trim = WHITE(), steps = paint('#dcd3c2', { roughness: 0.8 }), glass = paint('#2f5270', { roughness: 0.12, metalness: 0.25 }); b.box(brick, 78, 30, 22, S.x, 15, S.z + 10, { r: 0.2 }); b.box(trim, 79, 1.2, 23, S.x, 30.5, S.z + 10, { r: 0.2 }); for (const fy of [9, 21]) for (let x = -34; x <= 34; x += 8.4) if (!(fy === 9 && Math.abs(x) < 8)) { b.box(trim, 5.6, 7.2, 0.3, S.x + x, fy, S.z - 1.1, { r: 0.05 }); b.box(glass, 4.8, 6.4, 0.14, S.x + x, fy, S.z - 1.3, { r: 0.02 }); b.box(trim, 0.2, 6.4, 0.1, S.x + x, fy, S.z - 1.4, { r: 0.02 }); } for (let i = 0; i < 5; i++) b.box(steps, 22 - i * 0.6, 0.55, 2, S.x, 0.28 + i * 0.55, S.z - 9 + i * 1.75, { r: 0.05 }); b.box(steps, 21, 3, 3, S.x, 1.5, S.z - 0.6, { r: 0.05 }); b.box(paint('#2f6f8f'), 9, 11, 0.3, S.x, 8.4, S.z - 1.15, { r: 0.05 }); g.schoolGate = S.clone().add(v3(0, 0, -19)); const pl = sign('MERROW BAY SCHOOL', { w: 26, h: 3.6, bg: '#fbfaf3', fg: '#0f7c86', frame: '#14a3a8' }); pl.position.set(S.x, 16.4, S.z - 1.45); pl.rotation.y = Math.PI; g.add(pl); for (const sx of [-1, 1]) { b.cyl(paint('#205e66', { metalness: 0.4 }), 0.5, 0.5, 8, S.x + sx * 13, 4, S.z - 14, { seg: 12 }); b.cyl(paint('#f6c844'), 0.8, 0.8, 0.8, S.x + sx * 13, 8.4, S.z - 14, { seg: 12 }); } }
  b.done(g);
  // bunting across the quay
  { const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7 }), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.6, 0, 0, 0.6, 0, 0, 0, -1.3, 0], 3)); geo.computeVertexNormals(); const pts = []; for (let k = 0; k < 16; k++) { const A = v3(-150 + k * 22, 12.2, 6), B = v3(-150 + k * 22 + 11, 16, 62); for (let i = 1; i < 15; i++) { const u = i / 15, p = A.clone().lerp(B, u); p.y -= Math.sin(u * Math.PI) * 2.6; pts.push(p); } } const im = new THREE.InstancedMesh(geo, m, pts.length), M = new THREE.Matrix4(), c = new THREE.Color(), cols = ['#f25d48', '#f6c844', '#14a3a8', '#fbfaf3', '#ff8fbd']; pts.forEach((p, i) => { M.makeRotationY(1.37); M.setPosition(p); im.setMatrixAt(i, M); im.setColorAt(i, c.set(cols[i % 5])); }); im.userData.noAO = true; g.add(im); }
  g.beadSpots = spots; shadowAll(g); return g;
}

// the gold points of everyone in town, for the reveal
export function townBeads(list) { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.62, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc94a').multiplyScalar(2.6), transparent: true }), list.length), M = new THREE.Matrix4(); list.forEach((p, i) => { M.setPosition(p); m.setMatrixAt(i, M); }); m.frustumCulled = false; m.userData.noAO = true; m.level = (k) => { m.material.opacity = k; m.visible = k > 0.01; }; return m; }

// one thread of gold per listener, all ending at the same point
export function threads(N) { const m = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc94a').multiplyScalar(1.2), transparent: true, opacity: 0.45, depthWrite: false }), N), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), up = v3(0, 1, 0), d = v3(), C = v3(), S = v3(); m.frustumCulled = false; m.userData.noAO = true; m.setLine = (i, a, b, w = 1) => { d.copy(b).sub(a); const L = d.length(); C.copy(a).addScaledVector(d, 0.5); Q.setFromUnitVectors(up, d.normalize()); S.set(w, L, w); M.compose(C, Q, S); m.setMatrixAt(i, M); }; m.level = (k) => { m.material.opacity = 0.5 * k; m.visible = k > 0.01; m.instanceMatrix.needsUpdate = true; }; return m; }

// the one Sunny: a great gold bead where the sun should be
export function oneOrb() { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.SphereGeometry(78, 40, 28), new THREE.MeshStandardMaterial({ color: '#f5c23a', metalness: 0.7, roughness: 0.3, emissive: '#d08a18', emissiveIntensity: 0.75 })); m.userData.noAO = true; const h = glowSprite('#ffc94a', 420, 0.22); h.userData.noAO = true; const hl = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6d0').multiplyScalar(1.3) })); hl.position.set(-26, 36, -62); hl.userData.noAO = true; g.add(m, h, hl); g.set = (k) => { g.visible = k > 0.01; g.scale.setScalar(0.5 + 0.5 * k); h.material.opacity = 0.22 * k; }; return g; }

// ---- a bright classroom: board at z -d/2 (students face -z), windows on the +x wall ----
function winWall(b, g, x, d, h, n, y, wh, ww, sky) { const trim = WHITE(), glassT = sky; for (let i = 0; i < n; i++) { const z = (i - (n - 1) / 2) * (d / n); b.box(trim, 0.4, wh + 0.9, ww + 0.9, x, y, z, { r: 0.05 }); const p = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), glassT); p.position.set(x - Math.sign(x) * 0.25, y, z); p.rotation.y = -Math.sign(x) * Math.PI / 2; p.userData.noAO = true; g.add(p); b.box(trim, 0.16, wh, 0.2, x - Math.sign(x) * 0.34, y, z, { r: 0.02 }); b.box(trim, 0.16, 0.2, ww, x - Math.sign(x) * 0.34, y, z, { r: 0.02 }); } }
const skyPane = () => new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (x, W, H) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6db8ee'); gr.addColorStop(0.72, '#d9f1ff'); gr.addColorStop(0.73, '#2cb0c6'); gr.addColorStop(1, '#1b90b0'); x.fillStyle = gr; x.fillRect(0, 0, W, H); }) });
function room(w, d, h, o) { const g = new THREE.Group(), b = new Batch(), wall = new THREE.MeshStandardMaterial({ color: o.wall, roughness: 0.78 }), under = new THREE.MeshStandardMaterial({ color: o.dado, roughness: 0.7 }), fl = surf(o.floorKind || 'tile', o.floor); g.add(flat(fl, w, d, 0, 0, 0)); for (const [x, z, ww, ry] of [[0, -d / 2, w, 0], [0, d / 2, w, Math.PI], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, -Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, h), wall); m.position.set(x, h / 2, z); m.rotation.y = ry; m.receiveShadow = true; g.add(m); const q = new THREE.Mesh(new THREE.PlaneGeometry(ww, 3.4), under); q.position.set(x * 0.999, 1.7, z * 0.999); q.rotation.y = ry; g.add(q); } { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: '#fbf8ef', roughness: 0.85 })); m.rotation.x = Math.PI / 2; m.position.y = h; g.add(m); } return { g, b }; }
export function classroom() {
  const W0 = 46, D0 = 42, H0 = 17, { g, b } = room(W0, D0, H0, { wall: '#fff3cf', dado: '#7fd0c4', floor: '#d9c7a6' }), wood = paint('#d4a463', { roughness: 0.55 }), frame = paint('#2f8f96', { metalness: 0.3, roughness: 0.45 }), chair = paint('#f26d55', { roughness: 0.5 }), seatH = 1.2, deskTop = 3.0, COL = [-14, -7, 0, 7, 14], ROW = [-5, 2, 9, 16];
  for (const x of COL) for (const z of ROW) { b.box(wood, 5.2, 0.24, 3, x, deskTop, z - 2.3, { r: 0.06 }); for (const sx of [-1, 1]) { b.cyl(frame, 0.09, 0.09, deskTop, x + sx * 2.3, deskTop / 2, z - 3.5, { seg: 6 }); b.cyl(frame, 0.09, 0.09, deskTop, x + sx * 2.3, deskTop / 2, z - 1.1, { seg: 6 }); } b.box(chair, 2.7, 0.22, 2.3, x, seatH, z, { r: 0.06 }); b.box(chair, 2.7, 2.2, 0.2, x, seatH + 1.5, z + 1.2, { r: 0.06 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(frame, 0.08, 0.08, seatH, x + sx * 1.15, seatH / 2, z + sz * 0.95, { seg: 6 }); b.box(paint(['#ffffff', '#ffe39c', '#bcd8f5'][(x + z + 40) % 3 | 0], { roughness: 0.8 }), 1.8, 0.1, 1.3, x + 0.8, deskTop + 0.17, z - 2.5, { r: 0.02, ry: 0.15 }); }
  winWall(b, g, W0 / 2, D0, H0, 4, 9.6, 8.6, 7.2, skyPane());
  b.box(paint('#fff8e6'), 34, 12, 0.3, 0, 9.4, -D0 / 2 + 0.2, { r: 0.1 }); b.box(paint('#21543f', { roughness: 0.85 }), 32, 10, 0.2, 0, 9.4, -D0 / 2 + 0.42, { r: 0.05 }); b.box(paint('#d4a463'), 32, 0.3, 0.7, 0, 4.2, -D0 / 2 + 0.7, { r: 0.05 }); b.box(wood, 11, 0.4, 4.5, 11, 3.8, -D0 / 2 + 7.5, { r: 0.1 }); b.box(paint('#a86f3f'), 10.5, 3.6, 4, 11, 1.8, -D0 / 2 + 7.5, { r: 0.1 });
  b.cyl(paint('#2f8f96'), 0.9, 1.1, 0.3, 7.4, 4.15, -D0 / 2 + 7.5, { seg: 16 }); b.cyl(paint('#c49a45', { metalness: 0.7 }), 0.1, 0.1, 1.2, 7.4, 4.8, -D0 / 2 + 7.5, { seg: 8 });
  { const m = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16), new THREE.MeshStandardMaterial({ map: canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#2a7fc7'; x.fillRect(0, 0, w, h); x.fillStyle = '#6fbf6a'; const r = rng(6); for (let i = 0; i < 14; i++) { x.beginPath(); x.ellipse(r() * w, r() * h, 10 + r() * 24, 7 + r() * 16, r() * 3, 0, 6.3); x.fill(); } }), roughness: 0.4 })); m.position.set(7.4, 6.2, -D0 / 2 + 7.5); m.castShadow = true; g.add(m); }
  for (const x of [-13, 0, 13]) for (const z of [-12, 4]) b.box(paint('#ffffff', { emissive: '#fff4d8', emissiveIntensity: 1.1 }), 7, 0.24, 2, x, H0 - 0.2, z, { r: 0.05 });
  b.done(g);
  const brd = new THREE.Mesh(new THREE.PlaneGeometry(31, 9.2), new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(1240, 368, (x, w, h) => { x.fillStyle = '#21543f'; x.fillRect(0, 0, w, h); x.fillStyle = '#f4f2e6'; x.font = '900 72px ITTInter, sans-serif'; x.textBaseline = 'middle'; x.fillText('CAPITAL OF PERU?', 80, 90); x.font = '700 42px ITTInter, sans-serif'; x.fillStyle = '#ffe58f'; x.fillText('Geography, Monday', 84, 180); x.strokeStyle = '#f4f2e6'; x.lineWidth = 6; x.beginPath(); x.moveTo(930, 40); x.bezierCurveTo(1040, 60, 1110, 130, 1130, 200); x.bezierCurveTo(1100, 250, 1050, 330, 1000, 340); x.bezierCurveTo(960, 280, 900, 150, 930, 40); x.stroke(); x.fillStyle = '#ffd34d'; x.beginPath(); x.arc(980, 200, 11, 0, 6.3); x.fill(); }) })); brd.position.set(0, 9.4, -D0 / 2 + 0.56); brd.userData.noAO = true; g.add(brd);
  shadowAll(g); g.seat = (c, r) => v3(COL[c], 0, ROW[r]); g.seatY = seatH + 0.11; g.deskTop = deskTop + 0.12; g.W = W0; g.D = D0; g.H = H0; return g;
}

// ---- the lunch room: one long table along x, windows on the -z wall ----
export function lunchroom() {
  const W0 = 60, D0 = 34, H0 = 17, { g, b } = room(W0, D0, H0, { wall: '#ffe9d9', dado: '#f5a58f', floor: '#efe4cf', floorKind: 'tile' }), top = paint('#fbfaf3', { roughness: 0.38 }), steel = paint('#3a8f96', { metalness: 0.4, roughness: 0.4 }), bn = paint('#f6c844', { roughness: 0.45 }), L = 34, seatH = 1.25, topY = 2.95;
  b.box(top, L, 0.26, 7, 0, topY, 0, { r: 0.1 }); for (const x of [-15, 0, 15]) { b.box(steel, 0.5, topY, 0.5, x, topY / 2, 0, { r: 0.05 }); b.box(steel, 0.3, 0.3, 11.6, x, 0.6, 0, { r: 0.05 }); } for (const s of [-1, 1]) b.box(bn, L, 0.26, 2.3, 0, seatH, s * 5.4, { r: 0.08 }); for (const s of [-1, 1]) for (const x of [-15, 0, 15]) b.box(steel, 0.3, seatH, 0.3, x, seatH / 2, s * 5.4, { r: 0.05 });
  const r = rng(12); for (let i = 0; i < 12; i++) { const x = -14.4 + i * 2.62 * (i % 2 ? 1 : 1), s = i % 2 ? 1 : -1; const X = -13.6 + Math.floor(i / 2) * 5.4; b.box(paint(['#ff9c7a', '#7fd0c4', '#ffd34d'][i % 3], { roughness: 0.5 }), 3.2, 0.14, 2.1, X, topY + 0.2, s * 2.2, { r: 0.04 }); b.box(paint('#d98a4a', { roughness: 0.7 }), 1.5, 0.45, 1, X - 0.4, topY + 0.5, s * 2.2, { r: 0.18 }); b.box(paint('#9ed36a', { roughness: 0.7 }), 0.75, 0.32, 0.75, X + 0.9, topY + 0.44, s * 2.2, { r: 0.14 }); b.box(paint('#fff', { roughness: 0.6 }), 0.5, 0.9, 0.5, X + 1.1, topY + 0.65, s * 1.3, { r: 0.05 }); }
  { const counter = paint('#c9d6dc', { metalness: 0.55, roughness: 0.3 }); b.box(counter, 26, 4, 3, -8, 2, D0 / 2 - 2, { r: 0.1 }); b.box(paint('#ffffff'), 26, 0.3, 4, -8, 4.1, D0 / 2 - 2, { r: 0.05 }); }
  winWall(b, g, -W0 / 2, D0, H0, 3, 9.6, 8.6, 8, skyPane());
  for (const z of [-D0 / 2 + 8, D0 / 2 - 10]) for (const x of [-18, 0, 18]) b.box(paint('#ffffff', { emissive: '#fff4d8', emissiveIntensity: 1.1 }), 9, 0.24, 2, x, H0 - 0.2, z, { r: 0.05 });
  b.done(g); shadowAll(g); g.seatY = seatH + 0.11; g.topY = topY + 0.13; g.W = W0; g.D = D0; g.H = H0; return g;
}
