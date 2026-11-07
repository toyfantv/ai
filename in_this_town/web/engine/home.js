// Modern suburban home kit (Episode 19): furniture and fittings made from bevelled parts. Each builder returns a THREE.Group
// whose origin is on the floor. Front is +z unless noted. All are in the model library (engine/models.js).
import * as THREE from 'three';
import { Batch, surf, paint } from './kit.js';
import { v3, rng } from './core.js';
import { glowSprite } from './props.js';

const glow = (color, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });

// a shelf-sitting pan-and-tilt security camera. .head turns (rotation.y), .led is its red light
export function secCam() {
  const g = new THREE.Group(), b = new Batch(), white = paint('#eceff2', { roughness: 0.35 }), dark = paint('#16181d', { roughness: 0.25, metalness: 0.4 });
  b.cyl(white, 0.62, 0.72, 0.28, 0, 0.14, 0, { seg: 28 }); b.cyl(dark, 0.45, 0.5, 0.06, 0, 0.3, 0, { seg: 24 }); b.done(g);
  const head = new THREE.Group(); head.position.y = 0.34; g.add(head);
  const h = new Batch();
  h.cyl(white, 0.2, 0.3, 0.22, 0, 0.1, 0, { seg: 20 });
  h.add(white, new THREE.SphereGeometry(0.62, 28, 20), 0, 0.74, 0);
  h.cyl(dark, 0.4, 0.42, 0.26, 0, 0.74, 0.5, { seg: 28, rx: Math.PI / 2 });
  h.cyl(paint('#2a3648', { roughness: 0.08, metalness: 0.6 }), 0.26, 0.26, 0.05, 0, 0.74, 0.64, { seg: 24, rx: Math.PI / 2 });
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; h.cyl(paint('#3a2224', { roughness: 0.3 }), 0.035, 0.035, 0.04, Math.cos(a) * 0.33, 0.74 + Math.sin(a) * 0.33, 0.64, { seg: 8, rx: Math.PI / 2 }); }
  h.done(head);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow('#ff2030', 3)); led.position.set(0.3, 1.1, 0.42); head.add(led);
  const halo = glowSprite('#ff2030', 0.9, 0.7); halo.position.copy(led.position); head.add(halo);
  g.head = head; g.led = led; g.halo = halo; return g;
}

// a steel fridge, hollow, door hinged on its left: .door (rotation.y = -1.9 is open), .lightM (its strip), .lamp
export function fridge() {
  const g = new THREE.Group(), b = new Batch(), W = 6.6, H = 11.4, D = 3.6;
  const steel = paint('#c7ccd1', { metalness: 0.75, roughness: 0.34 }), liner = paint('#f2f4f6', { roughness: 0.5 }), glass = paint('#d8e6ee', { roughness: 0.12, transparent: true, opacity: 0.45 });
  b.box(steel, 0.24, H, D, -W / 2 + 0.12, H / 2, 0, { r: 0.05 }); b.box(steel, 0.24, H, D, W / 2 - 0.12, H / 2, 0, { r: 0.05 });
  b.box(steel, W, 0.24, D, 0, H - 0.12, 0, { r: 0.05 }); b.box(paint('#23262b'), W, 0.8, D, 0, 0.4, 0, { r: 0.05 });
  b.box(liner, W - 0.4, H - 1.1, 0.2, 0, H / 2 + 0.3, -D / 2 + 0.1, { r: 0.02 }); b.box(liner, W - 0.4, 0.12, D - 0.1, 0, 0.86, 0, { r: 0.02 });
  for (const s of [-1, 1]) b.box(liner, 0.1, H - 1.1, D - 0.2, s * (W / 2 - 0.3), H / 2 + 0.3, 0, { r: 0.02 });
  for (const y of [3.4, 5.8, 8.2]) b.box(glass, W - 0.6, 0.08, D - 0.4, 0, y, 0, { r: 0.02 });
  b.box(paint('#dfe6ea', { roughness: 0.35, transparent: true, opacity: 0.7 }), W - 0.8, 1.7, D - 0.6, 0, 1.9, 0, { r: 0.08 });
  // what is left: a milk carton on its side, a jar, half a lemon, an empty plate with crumbs
  b.box(paint('#f4f6fb'), 0.9, 0.9, 1.9, 1.6, 3.9, 0, { r: 0.06 }); b.box(paint('#2e7bd6'), 0.92, 0.3, 1.92, 1.6, 3.9, 0, { r: 0.04 });
  b.cyl(paint('#8a3a2a', { roughness: 0.2 }), 0.42, 0.42, 1, -1.8, 6.36, 0.2); b.cyl(paint('#e8e4dc'), 0.45, 0.45, 0.2, -1.8, 6.96, 0.2);
  b.cyl(paint('#f4f4ee'), 1.05, 0.8, 0.12, -0.6, 3.52, 0.2, { seg: 28 }); for (let i = 0; i < 7; i++) b.box(paint('#b98a4e'), 0.1, 0.05, 0.1, -0.9 + (i * 0.31) % 0.9, 3.61, -0.1 + (i * 0.17) % 0.6);
  b.add(paint('#f2d33a', { roughness: 0.5 }), new THREE.SphereGeometry(0.34, 16, 10, 0, 6.3, 0, 1.6), 1.4, 8.26, 0.3);
  b.done(g);
  const lightM = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(W - 1.4, 0.1, 0.3), lightM); strip.position.set(0, H - 0.4, 0.3); g.add(strip);
  const door = new THREE.Group(); door.position.set(-W / 2, 0, D / 2 + 0.02); g.add(door);
  const d = new Batch();
  d.box(steel, W, H - 0.9, 0.5, W / 2, H / 2 + 0.45, 0.26, { r: 0.14 }); d.box(paint('#22262c', { metalness: 0.6, roughness: 0.3 }), 0.24, 3.6, 0.28, W - 0.55, 6.9, 0.62, { r: 0.08 });
  d.box(liner, W - 0.5, H - 1.6, 0.14, W / 2, H / 2 + 0.45, -0.04, { r: 0.04 });
  for (const y of [3.2, 5.8, 8.4]) { d.box(liner, W - 1, 0.1, 0.8, W / 2, y, -0.4, { r: 0.03 }); d.box(liner, W - 1, 0.6, 0.08, W / 2, y + 0.25, -0.78, { r: 0.03 }); }
  d.cyl(paint('#e2502e'), 0.28, 0.28, 1.2, 1.4, 3.9, -0.4); d.cyl(paint('#3a8a4a'), 0.24, 0.24, 1.1, 2.3, 3.85, -0.42); d.done(door);
  const lamp = new THREE.PointLight('#f2f6ff', 0, 40, 1.6); lamp.position.set(0, 7, 3); g.add(lamp);
  g.door = door; g.lightM = lightM; g.lamp = lamp; return g;
}

export function diningChair(o = {}) {
  const g = new THREE.Group(), b = new Batch(), wood = surf('plank', o.wood || '#b98858'), pad = paint(o.pad || '#39424e', { roughness: 0.85 }), leg = paint('#1d2024', { metalness: 0.5, roughness: 0.4 });
  b.box(pad, 3, 0.36, 3, 0, 2.3, 0, { r: 0.14 }); b.box(wood, 3.1, 0.14, 3.1, 0, 2.08, 0, { r: 0.05 });
  for (const x of [-1.3, 1.3]) for (const z of [-1.3, 1.3]) b.box(leg, 0.2, 2.1, 0.2, x, 1.03, z, { r: 0.05 });
  for (const x of [-1.3, 1.3]) b.box(leg, 0.2, 2.5, 0.2, x, 3.4, -1.4, { r: 0.05 });
  b.box(wood, 3, 1.1, 0.2, 0, 4.3, -1.42, { r: 0.08 });
  return b.done(g);
}

export function diningTable(o = {}) {
  const g = new THREE.Group(), b = new Batch(), L = o.l ?? 15, Wd = o.w ?? 6.4, Y = o.h ?? 4.3, wood = surf('plank', '#a97b4f', { roughness: 0.5 }), leg = paint('#1d2024', { metalness: 0.5, roughness: 0.4 });
  b.box(wood, L, 0.34, Wd, 0, Y, 0, { r: 0.08 });
  for (const x of [-L / 2 + 1.6, L / 2 - 1.6]) { b.box(leg, 0.28, Y - 0.2, Wd - 1, x, Y / 2 - 0.05, 0, { r: 0.05 }); b.box(leg, 0.5, 0.2, Wd - 0.6, x, 0.1, 0, { r: 0.05 }); }
  b.box(leg, L - 3.2, 0.2, 0.3, 0, Y - 0.5, 0, { r: 0.05 });
  return b.done(g);
}

// bed: head at -z. .top is the mattress height
export function bed(o = {}) {
  const g = new THREE.Group(), b = new Batch(), W = o.w ?? 8.4, L = o.l ?? 14, wood = surf('plank', '#6f4d36'), cover = paint(o.cover || '#2f5f9e', { roughness: 0.88 }), sheet = paint('#eef1f4', { roughness: 0.85 });
  b.box(wood, W + 0.4, 1.3, L + 0.4, 0, 0.85, 0, { r: 0.1 }); for (const x of [-W / 2, W / 2]) for (const z of [-L / 2, L / 2]) b.box(paint('#2a2118'), 0.4, 0.3, 0.4, x, 0.15, z, { r: 0.05 });
  b.box(sheet, W, 1, L, 0, 1.95, 0, { r: 0.3 });
  b.box(wood, W + 1.4, 6, 0.5, 0, 3, -L / 2 - 0.4, { r: 0.1 }); b.box(surf('stucco', '#54606e'), W - 0.2, 3, 0.3, 0, 4.2, -L / 2 - 0.1, { r: 0.14 });
  for (const x of [-W / 4 - 0.1, W / 4 + 0.1]) b.box(paint('#f6f7f9', { roughness: 0.9 }), W / 2 - 0.4, 0.9, 2.5, x, 2.9, -L / 2 + 1.6, { r: 0.4 });
  if (o.covered !== false) b.box(cover, W + 0.15, 0.5, L * 0.62, 0, 2.5, L * 0.18, { r: 0.22 });
  b.done(g); g.top = 2.45; return g;
}

export function sofa(o = {}) {
  const g = new THREE.Group(), b = new Batch(), W = o.w ?? 14, c = paint(o.color || '#6b7686', { roughness: 0.92 }), c2 = paint(o.cushion || '#e0a73c', { roughness: 0.9 });
  b.box(c, W, 1.5, 4.6, 0, 1.25, 0, { r: 0.3 }); b.box(c, W, 3.4, 1.3, 0, 3, -1.9, { r: 0.4 }); for (const s of [-1, 1]) b.box(c, 1.3, 2.7, 4.8, s * (W / 2 - 0.3), 2, 0, { r: 0.4 });
  for (const x of [-W / 4 + 0.2, W / 4 - 0.2]) { b.box(c, W / 2 - 1.2, 0.8, 3.4, x, 2.3, 0.5, { r: 0.28 }); b.box(c, W / 2 - 1.3, 2.2, 0.9, x, 3.6, -0.95, { r: 0.34 }); }
  b.box(c2, 2, 2, 0.7, -W / 2 + 2.3, 3.5, -0.2, { r: 0.3, rx: -0.2 }); b.box(paint('#b8483a', { roughness: 0.9 }), 1.9, 1.9, 0.7, W / 2 - 2.3, 3.5, -0.1, { r: 0.3, rx: -0.2, ry: 0.2 });
  for (const x of [-W / 2 + 0.7, W / 2 - 0.7]) for (const z of [-1.8, 1.8]) b.box(paint('#1d2024'), 0.3, 0.5, 0.3, x, 0.25, z, { r: 0.05 });
  return b.done(g);
}

export function plant(o = {}) {
  const g = new THREE.Group(), b = new Batch(), r = rng(o.seed || 4), s = o.size ?? 1;
  b.cyl(surf('stucco', o.pot || '#e4dfd4'), 1.1 * s, 0.8 * s, 1.8 * s, 0, 0.9 * s, 0, { seg: 20 }); b.cyl(paint('#3a2c20'), 1 * s, 1 * s, 0.1, 0, 1.76 * s, 0, { seg: 20 });
  const leaf = [paint('#2f7a44', { roughness: 0.55 }), paint('#3e9150', { roughness: 0.55 }), paint('#256238', { roughness: 0.55 })];
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4 + r(), up = 0.35 + r() * 0.75, len = (2.2 + r() * 2.2) * s, gg = new THREE.SphereGeometry(1, 10, 6); gg.scale(0.5 * s, 0.09 * s, len * 0.5); gg.rotateX(-up); gg.rotateY(a);
    b.add(leaf[i % 3], gg, Math.sin(a) * Math.cos(up) * len * 0.5, 2 * s + Math.sin(up) * len * 0.5 + r() * s, Math.cos(a) * Math.cos(up) * len * 0.5);
  }
  return b.done(g);
}

// a big monitor on a stand, keyboard, mouse, tower with coloured fans. Screen faces +z; .screen is where to put a plane
export function pcDesk(o = {}) {
  const g = new THREE.Group(), b = new Batch(), W = o.w ?? 14, wood = surf('plank', '#43352c', { roughness: 0.5 }), blk = paint('#14161b', { roughness: 0.35, metalness: 0.4 });
  b.box(wood, W, 0.3, 5, 0, 4.05, 0, { r: 0.06 }); for (const x of [-W / 2 + 0.6, W / 2 - 0.6]) { b.box(blk, 0.3, 3.9, 4.4, x, 1.95, 0, { r: 0.05 }); }
  b.box(blk, W - 1.4, 0.9, 0.2, 0, 3.4, -2.1, { r: 0.04 });
  b.box(blk, 8.5, 5.3, 0.3, 0, 7.6, -1.2, { r: 0.1 }); b.box(blk, 0.8, 2.6, 0.4, 0, 5.2, -1.5, { r: 0.08 }); b.box(blk, 3, 0.16, 2, 0, 4.28, -1.4, { r: 0.06 });
  b.box(paint('#26282e'), 4.4, 0.18, 1.5, 0, 4.3, 1.3, { r: 0.06 }); for (let r = 0; r < 4; r++) for (let c = 0; c < 13; c++) b.box(paint('#3b3e47', { roughness: 0.4 }), 0.26, 0.08, 0.26, -1.9 + c * 0.32, 4.42, 0.8 + r * 0.32, { r: 0.02 });
  b.box(paint('#1e2026'), 0.6, 0.2, 1, 3.3, 4.3, 1.3, { r: 0.09 });
  b.box(blk, 2.4, 5, 4.6, W / 2 - 1.9, 6.75, -0.2, { r: 0.08 });
  b.done(g);
  const fan = glow('#4fb4ff', 1.2), fan2 = glow('#ff5ad1', 1.2);
  for (const [y, m] of [[7.9, fan], [6.4, fan2]]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 28), m); r.position.set(W / 2 - 1.9, y, 2.12); g.add(r); }
  g.screen = v3(0, 7.6, -1.03); g.screenSize = [8.1, 4.95]; return g;
}

// the outline Roblox Studio draws round a selected part
export function selectionBox(w, h, d, o = {}) {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color || '#2ea8ff').multiplyScalar(2.2), toneMapped: false }), t = o.t ?? 0.2;
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(w + t, t, t), m); e.position.set(0, sy * h / 2, sz * d / 2); g.add(e); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(t, h + t, t), m); e.position.set(sx * w / 2, 0, sz * d / 2); g.add(e); }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(t, t, d + t), m); e.position.set(sx * w / 2, sy * h / 2, 0); g.add(e); }
  g.traverse((c) => { c.userData.noAO = true; });
  return g;
}

// a modern two-volume suburban house, front +z, about 60 wide
export function modernHouse(o = {}) {
  const g = new THREE.Group(), b = new Batch(), white = surf('stucco', '#ece7dd'), wood = surf('plank', '#9c6b43'), dark = paint('#23262c', { metalness: 0.4, roughness: 0.4 }), stone = surf('brick', '#8d8a84');
  const win = new THREE.MeshStandardMaterial({ color: '#27394a', roughness: 0.08, metalness: 0.6, emissive: '#ffcf8a', emissiveIntensity: o.lit ?? 0.15 });
  const glassBox = (w, h, x, y, z) => {
    b.box(dark, w + 0.5, h + 0.5, 0.5, x, y, z, { r: 0.05 }); b.box(win, w, h, 0.3, x, y, z + 0.14, { r: 0.02 });
    const n = Math.max(1, Math.round(w / 5)); for (let i = 1; i < n; i++) b.box(dark, 0.2, h, 0.4, x - w / 2 + i * w / n, y, z + 0.18, { r: 0.02 });
  };
  // ground floor, garage wing, the wood upper storey
  b.box(white, 44, 13, 26, 0, 6.5, 0, { r: 0.12 }); b.box(stone, 20, 13, 0.6, -12, 6.5, 13.1, { r: 0.06 });
  b.box(white, 22, 12, 24, 31, 6, -1, { r: 0.12 });
  b.box(wood, 30, 12, 22, -5, 19, -1, { r: 0.12 });
  for (const [w, d, x, y, z] of [[47, 29, 0, 13.25, 0], [24, 26, 31, 12.25, -1], [33, 25, -5, 25.2, -1]]) { b.box(dark, w, 0.6, d, x, y, z, { r: 0.08 }); b.box(paint('#d9d4ca'), w - 2, 0.3, d - 2, x, y + 0.42, z, { r: 0.05 }); }
  glassBox(15, 8.4, 10, 6.2, 13); glassBox(13, 7, -9, 19.2, 10); glassBox(8, 7, 5.5, 19.2, 10); glassBox(4, 8, -19, 6.4, 13.4);
  // garage door
  b.box(dark, 17.4, 9.6, 0.4, 31, 4.9, 11.1, { r: 0.05 }); for (let i = 0; i < 5; i++) b.box(paint('#e9e7e2', { roughness: 0.4 }), 16.6, 1.6, 0.3, 31, 1.2 + i * 1.8, 11.35, { r: 0.05 });
  // front door, canopy, planters
  b.box(dark, 6.2, 10.2, 0.4, -7, 5.1, 13.45, { r: 0.05 }); b.box(surf('plank', '#5b3a24'), 5.4, 9.6, 0.3, -7, 4.9, 13.7, { r: 0.04 }); b.box(paint('#d9b65a', { metalness: 0.8, roughness: 0.3 }), 0.24, 3, 0.3, -5.1, 4.8, 13.95, { r: 0.05 });
  b.box(dark, 12, 0.5, 6, -7, 10.9, 16, { r: 0.05 });
  for (const x of [-12, -2]) { b.box(surf('concrete', '#b9b5ac'), 2.8, 2.2, 2.8, x, 1.1, 17, { r: 0.1 }); }
  b.done(g);
  for (const x of [-12, -2]) { const p = plant({ size: 0.9, seed: x + 20, pot: '#b9b5ac' }); p.position.set(x, 1.6, 17); g.add(p); }
  const wl = glowSprite('#ffd9a0', 4, 0.5); wl.position.set(-7, 10.2, 15); g.add(wl);
  return g;
}
