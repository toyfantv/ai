// Episode 19: Someone Was Living Inside the Walls of Brookhaven. Found footage: three kinds of picture.
//   Jake's phone (bright morning, handheld, REC bar) -> the hallway camera (grey infrared, 12 fps, a time stamp that skips when nothing
//   moves) -> Jake's monitor at dawn, then the house being edited like a place in Studio: blue selection boxes on the walls.
// One house, on one floor: bedroom (north), hall, kitchen and living room (south). The street front is a separate set at EX.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose, nameTag } from '../engine/character.js';
import { loadAlti, blinkAt } from '../engine/altiface.js';
import { CAST } from '../engine/cast.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DAY, NIGHT } from '../engine/stage.js';
import { Batch, surf, paint, sign, lamp, building } from '../engine/kit.js';
import { dust, shaft, clouds, atmos } from '../engine/atmos.js';
import { canvasTex, glowSprite } from '../engine/props.js';
import { model } from '../engine/library.js';
import { treeShape, treeSet, leafTime } from '../engine/forest.js';
import { secCam, fridge, diningChair, diningTable, bed, sofa, plant, pcDesk, selectionBox, modernHouse } from '../engine/home.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

let ctx, L, EV;
const W = {};
const H = 13, EX = v3(3000, 0, 0);
const LENS = v3(2.8, 8.9, -8);              // the hallway camera
const FRIDGE = v3(-8, 0, 40), TABLE = v3(-3, 0, 22), SEAT = v3(-1, 0, 26);
const lp3 = (a, b, u) => a.clone().lerp(b, u);

// ---- palettes ----
const INDAY = { ...DAY, ...P({ top: '#6fb4f0', horizon: '#fff0d8', haze: '#fff0d8', sunColor: '#ffe9c4', hemiSky: '#fff4e4', hemiGround: '#c9a27a' }),
  sunI: 3.6, sunDir: v3(-0.7, 0.5, 0.42), sunDisc: 0, hemiI: 0.85, amb: 0.2, envI: 0.5, exposure: 1.0, bloom: 0.2, fogNear: 400, fogFar: 1400, saturation: 1.22, contrast: 1.02, bounce: 0.35 };
const OUTDAY = { ...DAY, ...P({ top: '#2f86e6', horizon: '#bfe6ff', haze: '#cfeaff', sunColor: '#ffe6bc', hemiSky: '#cfe6ff', hemiGround: '#7f9c5a' }),
  sunI: 2.9, sunDir: v3(-0.55, 0.5, 0.68), sunDisc: 1, hemiI: 1.1, amb: 0.22, envI: 0.8, exposure: 1.0, bloom: 0.22, fogNear: 180, fogFar: 900, saturation: 1.2 };
const DUSKIN = { ...INDAY, ...P({ top: '#20305c', horizon: '#ff9a5a', haze: '#3a3040', sunColor: '#ffb070', hemiSky: '#c8a890', hemiGround: '#5a4438' }),
  sunI: 0.9, sunDir: v3(-0.8, 0.22, 0.4), hemiI: 0.4, amb: 0.1, envI: 0.22, exposure: 1.05, bloom: 0.25, saturation: 1.18, contrast: 1.04, bounce: 0.1 };
const IR = { ...NIGHT, ...P({ top: '#000000', horizon: '#000000', haze: '#050505', sunColor: '#ffffff', hemiSky: '#ffffff', hemiGround: '#9a9a9a' }),
  sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 0.42, amb: 0.14, envI: 0.1, exposure: 1.1, bloom: 0.2, fogNear: 60, fogFar: 220, saturation: 1, bounce: 0, contrast: 1.05 };
const DAWN = { ...INDAY, ...P({ top: '#0d1b3a', horizon: '#34507c', haze: '#0a1224', sunColor: '#9cc0ff', hemiSky: '#7f9ccc', hemiGround: '#2a2f40' }),
  sunI: 0.6, sunDir: v3(-0.7, 0.3, 0.3), hemiI: 0.42, amb: 0.1, envI: 0.25, exposure: 1.08, bloom: 0.3, saturation: 1.2, contrast: 1.04, bounce: 0.08 };
const ENDP = { ...DAWN, hemiI: 0.5, amb: 0.14, envI: 0.3 };
const PLAN = { ...DAWN, ...P({ haze: '#04070e' }), sunI: 0, hemiI: 1.5, amb: 0.5, envI: 0.6, fogNear: 300, fogFar: 2000, exposure: 1.05 };

function events() {
  const v = (i) => L(i).start;
  return { cam: v(6) - 0.15, motion: v(6) + 2.1, wall: v(8) + 0.05, step: v(9) - 0.1, walk: v(10) - 0.3, stop: v(11) + 0.2, go: v(12) - 0.2, skip1: v(13) - 0.28, fopen: v(13) + 0.05,
    skip2: v(14) - 0.22, turn: v(15) + 0.1, freeze: v(15) + 2.3, msg: v(16) + 0.9, stopmsg: v(17), list: v(18) + 0.25, rows: v(19), himself: v(20), owner: v(21), walls: v(22) - 0.1,
    door: v(23), del: v(23) + 0.6, seal: v(23) + 1.9, end: ctx.dur };
}

// ---- the stranger, as the footage saw him: a pure function of footage time ----
function str(t) {
  const e = EV;
  if (t >= e.skip2) return { x: SEAT.x, z: SEAT.z, state: 'sit', yaw: Math.PI };
  if (t >= e.skip1) return { x: -8, z: 34.4, state: 'stand', yaw: 0 };
  if (t >= e.go) { const k = (t - e.go) / (e.skip1 - e.go); return { x: lerp(-0.5, -4, k), z: lerp(0, 20, k), state: 'walk', yaw: -0.15 }; }
  if (t >= e.stop) return { x: 0, z: -18, state: 'stand', yaw: Math.atan2(LENS.x, LENS.z + 18) };
  if (t >= e.walk) { const k = (t - e.walk) / (e.stop - e.walk); return { x: 0, z: lerp(-46.5, -18, k), state: 'walk', yaw: 0 }; }
  const k = clamp((t - e.step) / (e.walk - e.step));
  return { x: 0, z: lerp(-54, -46.5, k), state: k > 0 && k < 1 ? 'walk' : 'stand', yaw: 0 };
}
const feedT = (t) => Math.min(t, EV.freeze);
function hudClock(t) {
  const e = EV, s = 2 + Math.floor(Math.min(t, e.freeze) - e.cam) + (t >= e.go ? 4 : 0) + (t >= e.skip1 ? 11 : 0) + (t >= e.skip2 ? 6 : 0);
  return `03:17:${String(Math.min(59, s)).padStart(2, '0')}`;
}

// the hallway camera's view of what it followed, by footage time
function ptz(t, wide = 1) {
  const e = EV, s = str(t), S = v3(s.x, 4.3, s.z);
  let look, fov;
  if (t < e.wall) { look = v3(-3, 4.2, -46); fov = 58; }
  else if (t < e.step) { const k = easeInOut(clamp((t - e.wall) / (e.step - e.wall))); look = lp3(v3(-3, 4.2, -46), v3(-0.5, 5.3, -50), k); fov = lerp(58, 26, k); }
  else if (t < e.walk) { look = v3(-0.5, 5.3, -50); fov = 26; }
  else if (t < e.stop) { const k = smooth(e.walk, e.walk + 0.4, t), z = smooth(e.stop - 1.1, e.stop, t); look = lp3(v3(-0.5, 5.3, -50), S.clone().add(v3(0, 0.4, 0)), k); fov = lerp(lerp(26, 40, k), 26, z); }
  else if (t < e.go) { look = v3(0, 4.8, -18); fov = 27; }
  else if (t < e.skip1) { look = v3(-1.5, 4.2, 14); fov = 44; }
  else if (t < e.skip2) { look = v3(-7.5, 4.6, 36); fov = 24; }
  else if (t < e.turn) { look = v3(-1.5, 4.4, 24); fov = 30; }
  else { const k = easeInOut(clamp((t - e.turn - 0.5) / 2.0)); look = lp3(v3(-1.5, 4.4, 24), v3(SEAT.x, 4.5, SEAT.z), k); fov = lerp(30, 9, k); }
  return { pos: LENS.clone(), look, fov: fov * wide };
}

// ---- walls ----
function wallHoles(b, m, axis, fixed, a0, a1, holes = [], t = 0.6) {
  const part = (a, c, y0, y1) => {
    if (c - a < 0.01 || y1 - y0 < 0.01) return;
    if (axis === 'x') b.box(m, c - a, y1 - y0, t, (a + c) / 2, (y0 + y1) / 2, fixed, { r: 0.02 });
    else b.box(m, t, y1 - y0, c - a, fixed, (y0 + y1) / 2, (a + c) / 2, { r: 0.02 });
  };
  let at = a0;
  for (const h of [...holes].sort((p, q) => p.a - q.a)) { part(at, h.a, 0, H); part(h.a, h.b, 0, h.y0); part(h.a, h.b, h.y1, H); at = h.b; }
  part(at, a1, 0, H);
}
function frameAt(b, axis, fixed, a, c, y0, y1, n = 2) {
  const dark = paint('#24272d', { metalness: 0.35, roughness: 0.4 }), put = (w, h, d, x, y, z) => (axis === 'x' ? b.box(dark, w, h, d, x, y, z, { r: 0.03 }) : b.box(dark, d, h, w, z, y, x, { r: 0.03 }));
  for (const u of [a, c]) put(0.3, y1 - y0 + 0.3, 0.9, u, (y0 + y1) / 2, fixed);
  for (const y of [y0, y1]) put(c - a + 0.3, 0.3, 0.9, (a + c) / 2, y, fixed);
  for (let i = 1; i < n; i++) put(0.16, y1 - y0, 0.7, a + (c - a) * i / n, (y0 + y1) / 2, fixed);
  const sill = paint('#f2efe8', { roughness: 0.5 });
  if (axis === 'x') b.box(sill, c - a + 1, 0.22, 1.5, (a + c) / 2, y0 - 0.2, fixed, { r: 0.05 }); else b.box(sill, 1.5, 0.22, c - a + 1, fixed, y0 - 0.2, (a + c) / 2, { r: 0.05 });
}
function card(scene, w, h, x, y, z, ry, map) {
  const m = new THREE.MeshBasicMaterial({ map, toneMapped: true }), c = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  c.position.set(x, y, z); c.rotation.y = ry; c.userData.noAO = true; scene.add(c); W.cards.push(c); return c;
}
function outsideTex() {
  return canvasTex(1024, 640, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h * 0.7); g.addColorStop(0, '#7cc2f6'); g.addColorStop(1, '#f6f2e0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c9d4d0'; c.fillRect(120, 250, 300, 170); c.fillStyle = '#6a4a3e'; c.beginPath(); c.moveTo(90, 250); c.lineTo(270, 150); c.lineTo(450, 250); c.fill();
    c.fillStyle = '#e7dcc8'; c.fillRect(640, 280, 300, 140); c.fillStyle = '#4c5a66'; c.fillRect(620, 262, 340, 22);
    c.fillStyle = '#5da04a'; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(i * 42, 400 + (i * 37) % 26, 52, 0, 7); c.fill(); }
    c.fillStyle = '#3f7f3a'; c.fillRect(0, 440, w, 40); c.fillStyle = '#d8cdb8'; for (let i = 0; i < 40; i++) c.fillRect(i * 27, 410, 18, 90); c.fillStyle = '#6fb34f'; c.fillRect(0, 500, w, h);
  });
}

function shell(scene) {
  const home = new THREE.Group(); scene.add(home); W.home = home;
  const b = new Batch(), wall = surf('stucco', '#e8e3d8'), kit = surf('stucco', '#f0ece2'), bedW = surf('stucco', '#a9b8c6'), accent = surf('stucco', '#93a9bc');
  const oak = surf('plank', '#b58a5c', { roughness: 0.55 }), tile = surf('tile', '#cfc8ba', { roughness: 0.35 }), dark = surf('plank', '#7c5a40', { roughness: 0.6 });
  oak.userData.span = 7; tile.userData.span = 9;
  b.box(tile, 48.6, 0.6, 34.6, 0, -0.3, 25, { r: 0.02 }); b.box(oak, 10.6, 0.6, 32, 0, -0.3, -8, { r: 0.02 }); b.box(dark, 32.6, 0.6, 26.6, 0, -0.3, -37, { r: 0.02 });
  // bedroom: the accent wall hides the sliding panel
  wallHoles(b, accent, 'x', -50, -16, 16, [{ a: -3, b: 3, y0: 0, y1: 10.6 }]);
  wallHoles(b, bedW, 'z', 16, -50, -24);
  wallHoles(b, bedW, 'z', -16, -50, -24, [{ a: -34, b: -26, y0: 3.6, y1: 10.4 }]);
  frameAt(b, 'z', -16, -34, -26, 3.6, 10.4);
  wallHoles(b, bedW, 'x', -24, -16, 16, [{ a: -4, b: 4, y0: 0, y1: 10.6 }]);
  for (const x of [-4, 4]) b.box(paint('#f4f1ea'), 0.4, 10.8, 0.9, x, 5.3, -24, { r: 0.05 }); b.box(paint('#f4f1ea'), 8.4, 0.4, 0.9, 0, 10.7, -24, { r: 0.05 });
  // skirting, bedroom
  const sk = paint('#f4f1ea', { roughness: 0.5 });
  for (const [x0, x1, z] of [[-15.7, -4, -24.4], [4, 15.7, -24.4], [-15.7, -3, -49.6], [3, 15.7, -49.6]]) b.box(sk, x1 - x0, 0.7, 0.18, (x0 + x1) / 2, 0.35, z, { r: 0.04 });
  for (const x of [-15.6, 15.6]) b.box(sk, 0.18, 0.7, 25.6, x, 0.35, -37, { r: 0.04 });
  // kitchen and living room
  wallHoles(b, kit, 'x', 8, -24, -5); wallHoles(b, kit, 'x', 8, 5, 24);
  wallHoles(b, kit, 'x', 42, -24, 24, [{ a: 1, b: 13, y0: 6.6, y1: 11 }]); frameAt(b, 'x', 42, 1, 13, 6.6, 11, 3);
  wallHoles(b, kit, 'z', -24, 8, 42, [{ a: 15, b: 29, y0: 3.4, y1: 10.8 }]); frameAt(b, 'z', -24, 15, 29, 3.4, 10.8, 2);
  wallHoles(b, kit, 'z', 24, 8, 42, [{ a: 14, b: 34, y0: 0.6, y1: 11 }]); frameAt(b, 'z', 24, 14, 34, 0.6, 11, 3);
  for (const [x0, x1, z] of [[-23.7, -5, 8.4], [5, 23.7, 8.4]]) b.box(sk, x1 - x0, 0.7, 0.18, (x0 + x1) / 2, 0.35, z, { r: 0.04 });
  b.done(home);
  const tex = outsideTex();
  card(home, 44, 26, -40, 8, 22, Math.PI / 2, tex); card(home, 44, 26, 7, 9, 58, Math.PI, tex); card(home, 50, 26, 40, 8, 24, -Math.PI / 2, tex); card(home, 30, 22, -32, 8, -30, Math.PI / 2, tex);
  // the ceiling, separate: the plan shots look straight down
  const c = new Batch(), cm = paint('#f6f4ee', { roughness: 0.9 });
  c.box(cm, 48.6, 0.5, 34.6, 0, H + 0.25, 25, { r: 0.02 }); c.box(cm, 10.6, 0.5, 32, 0, H + 0.25, -8, { r: 0.02 }); c.box(cm, 32.6, 0.5, 26.6, 0, H + 0.25, -37, { r: 0.02 });
  W.ceil = c.done(); home.add(W.ceil);
  W.down = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff0dc', emissiveIntensity: 2 });
  const dg = new THREE.CylinderGeometry(0.6, 0.6, 0.08, 20);
  for (const [x, z] of [[0, -18], [0, -8], [0, 2], [-14, 34], [0, 34], [14, 18], [14, 32], [-8, -30], [8, -44], [8, -30]]) { const d = new THREE.Mesh(dg, W.down); d.position.set(x, H - 0.02, z); W.ceil.add(d); }
  // Studio's grid, under everything: only the plan shots see it
  const grid = canvasTex(1024, 1024, (x, w, h) => { x.fillStyle = '#0a1120'; x.fillRect(0, 0, w, h); x.strokeStyle = '#1f3858'; x.lineWidth = 3; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, h); x.moveTo(0, i * 128); x.lineTo(w, i * 128); x.stroke(); } });
  grid.wrapS = grid.wrapT = THREE.RepeatWrapping; grid.repeat.set(30, 30);
  W.grid = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshBasicMaterial({ map: grid })); W.grid.rotation.x = -Math.PI / 2; W.grid.position.y = -0.7; W.grid.userData.noAO = true; home.add(W.grid);
}

// the hidden room behind the bedroom wall, and the panel that opens it
function cavity() {
  const g = W.home, b = new Batch(), stud = surf('plank', '#5a4632'), ply = surf('plank', '#241d18'), blk = paint('#1a1a1c');
  b.box(ply, 7, 0.4, 9, 0, -0.2, -54.6, { r: 0.02 }); b.box(ply, 7, 0.4, 9, 0, 10.8, -54.6, { r: 0.02 });
  for (const x of [-3.5, 3.5]) b.box(ply, 0.4, 11, 9, x, 5.5, -54.6, { r: 0.02 }); b.box(ply, 7, 11, 0.4, 0, 5.5, -58.9, { r: 0.02 });
  for (const z of [-52, -55, -58]) for (const x of [-3, 3]) b.box(stud, 0.5, 11, 0.8, x, 5.5, z, { r: 0.03 });
  b.box(paint('#c8b890', { roughness: 0.95 }), 3.6, 0.5, 6, -0.9, 0.3, -55.4, { r: 0.2 }); b.box(paint('#d8d4c8'), 1.8, 0.5, 1.2, -0.9, 0.8, -57.6, { r: 0.2 });   // a mattress and pillow
  for (let i = 0; i < 5; i++) b.cyl(paint(['#b8483a', '#d8b24a', '#7a9a4a'][i % 3], { metalness: 0.6, roughness: 0.3 }), 0.28, 0.28, 0.7, 1.7 + (i % 2) * 0.7, 0.35, -56.4 + i * 0.7);
  b.box(blk, 1.8, 0.1, 1.2, 1.9, 0.08, -52.7, { r: 0.03 });
  b.done(g);
  const m = new Batch(); W.panel = new THREE.Group(); g.add(W.panel); W.panel.position.set(0, 0, -50);
  m.box(surf('stucco', '#93a9bc'), 6, 10.6, 0.5, 0, 5.3, 0, { r: 0.02 }); m.box(paint('#f4f1ea', { roughness: 0.5 }), 6, 0.7, 0.2, 0, 0.35, 0.34, { r: 0.04 }); m.done(W.panel);
  W.cavLight = new THREE.PointLight('#ffffff', 0, 16, 1.5); W.cavLight.position.set(0, 8, -54); g.add(W.cavLight);
}

function bedroom() {
  const g = W.home, b = new Batch();
  const bd = bed({ cover: '#d26a3a' }); bd.position.set(-10, 0, -42.5); g.add(bd);
  W.duvet = new Batch(); W.duvet.box(paint('#d26a3a', { roughness: 0.9 }), 8.5, 1.5, 10, 0, 0, 0, { r: 0.5 }); W.duvet = W.duvet.done(); W.duvet.position.set(-10, 3.05, -40.8); g.add(W.duvet);
  // nightstand, lamp, rug, wardrobe, shelves
  const wood = surf('plank', '#6f4d36'), lampS = paint('#fbe9cf', { roughness: 0.6 });
  b.box(wood, 3, 3, 3, -4.1, 1.5, -48, { r: 0.1 }); b.cyl(paint('#2a2a2e', { metalness: 0.5 }), 0.3, 0.45, 1.3, -4.1, 3.6, -48); b.cyl(lampS, 0.7, 1, 1.2, -4.1, 4.8, -48);
  b.box(paint('#3b4a5e', { roughness: 0.95 }), 13, 0.1, 9, 2, 0.05, -38, { r: 0.04 }); b.box(paint('#d8cfbf', { roughness: 0.95 }), 11.4, 0.12, 7.4, 2, 0.06, -38, { r: 0.04 });
  b.box(wood, 11, 11, 3, 9.8, 5.5, -26, { r: 0.08 }); for (const x of [7.1, 12.6]) b.box(paint('#5e412d'), 5.2, 10.4, 0.2, x, 5.5, -27.6, { r: 0.04 }); for (const x of [9.2, 10.4]) b.box(paint('#d9b65a', { metalness: 0.8, roughness: 0.3 }), 0.14, 1.6, 0.2, x, 5.5, -27.75, { r: 0.04 });
  for (const y of [8.6, 10.4]) { b.box(wood, 8, 0.24, 1.4, 10.6, y, -49.3, { r: 0.04 }); for (let i = 0; i < 9; i++) b.box(paint(['#c43', '#37a', '#ca3', '#4a6', '#d73'][i % 5]), 0.34, 1.3, 1, 7.4 + i * 0.5, y + 0.76, -49.3, { r: 0.04 }); }
  b.done(g);
  // the desk, facing the room
  const dk = pcDesk(); dk.position.set(13.1, 0, -36); dk.rotation.y = -Math.PI / 2; g.add(dk);
  const ch = new Batch(), bl = paint('#1c1e24', { roughness: 0.6 }), rd = paint('#2a7ae0', { roughness: 0.6 });
  ch.box(bl, 3.4, 0.6, 3.4, 0, 2.3, 0, { r: 0.2 }); ch.box(bl, 3.2, 5.2, 0.7, 0, 5, -1.7, { r: 0.28 }); ch.box(rd, 0.5, 4.8, 0.74, -1, 5, -1.7, { r: 0.1 }); ch.box(rd, 0.5, 4.8, 0.74, 1, 5, -1.7, { r: 0.1 });
  ch.cyl(paint('#6a6e76', { metalness: 0.7, roughness: 0.3 }), 0.3, 0.3, 1.7, 0, 1.1, 0); for (let i = 0; i < 5; i++) { const a = i * 1.257; ch.box(bl, 0.3, 0.26, 2, Math.sin(a) * 1, 0.28, Math.cos(a) * 1, { r: 0.06, ry: a }); }
  const cg = ch.done(); cg.position.set(8.4, 0, -36); cg.rotation.y = Math.PI / 2; g.add(cg); W.deskChair = cg;
  // the screen: the feed, with what appears over it on top
  W.rt = new THREE.WebGLRenderTarget(1024, 640, { type: THREE.HalfFloatType, samples: 2 });
  W.uiC = document.createElement('canvas'); W.uiC.width = 1280; W.uiC.height = 800; W.ui = new THREE.CanvasTexture(W.uiC); W.ui.colorSpace = THREE.SRGBColorSpace; W.ui.anisotropy = 8;
  W.screenM = new THREE.ShaderMaterial({ uniforms: { tFeed: { value: W.rt.texture }, tUI: { value: W.ui }, dim: { value: 1 }, tm: { value: 0 } },
    vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 v; uniform sampler2D tFeed, tUI; uniform float dim, tm;
      void main(){ float l = dot(texture2D(tFeed, v).rgb, vec3(0.3, 0.6, 0.1));
        vec3 c = clamp(l * 0.5, 0.0, 1.0) * vec3(0.82, 1.0, 1.0) * dim;
        c *= 0.92 + 0.08 * sin(v.y * 900.0);
        vec4 u = texture2D(tUI, v); c = mix(c, u.rgb, u.a);
        gl_FragColor = vec4(c * 1.25, 1.0); }` });
  const [sw, sh] = dk.screenSize;
  W.monitor = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), W.screenM); W.monitor.position.set(14.1, 7.6, -36); W.monitor.rotation.y = -Math.PI / 2; W.monitor.userData.noAO = true; g.add(W.monitor);
}

async function posters() {
  const load = async (u) => { const t = await new THREE.TextureLoader().loadAsync(u); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const [ll, so] = await Promise.all([load('/web/assets/eggs/llamacorn.jpg'), load('/web/assets/eggs/roblox_song.jpg')]);
  const fam = canvasTex(320, 400, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9fd0ee'); g.addColorStop(1, '#f2e2c0'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#3f7f3a'; c.fillRect(0, 300, w, 100); c.fillStyle = '#ece7dd'; c.fillRect(60, 190, 200, 120); c.fillStyle = '#23262c'; c.fillRect(50, 180, 220, 12); });
  const toy = canvasTex(512, 224, (c, w, h) => { c.fillStyle = '#16161c'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd23f'; c.font = '900 76px ITTInter, sans-serif'; c.textAlign = 'center'; c.fillText('TOY FAN TV', w / 2, 138); });
  const hang = (parent, map, w, h, x, y, z, ry) => {
    const g = new THREE.Group(), b = new Batch(); b.box(paint('#1f2024', { roughness: 0.4 }), w + 0.4, h + 0.4, 0.16, 0, 0, 0, { r: 0.03 }); b.done(g);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.5 })); m.position.z = 0.1; g.add(m);
    g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g;
  };
  W.pics = [hang(W.hallE, fam, 3.2, 4, 4.6, 6.2, -16, -Math.PI / 2), hang(W.hallE, fam, 2.4, 3, 4.6, 5.6, -12.4, -Math.PI / 2)]; hang(W.hallE, ll, 3.4, 4.2, 4.6, 6.2, 0, -Math.PI / 2);
  hang(W.hallW, so, 4, 3.2, -4.6, 6.4, -15, Math.PI / 2); hang(W.home, ll, 4, 5, 15.6, 7.6, -46, -Math.PI / 2); hang(W.home, so, 5, 4, 8, 7.6, 8.4, 0); hang(W.home, toy, 3, 1.3, 15.6, 3.6, -46, -Math.PI / 2);
  hang(W.home, toy, 3, 1.3, -9, 7, 8.4, 0);
}

function kitchen() {
  const g = W.home, b = new Batch(), door = paint('#2f3f4a', { roughness: 0.42 }), top = paint('#efece6', { roughness: 0.2, metalness: 0.05 }), steel = paint('#bfc4c9', { metalness: 0.8, roughness: 0.3 }), wood = surf('plank', '#b58a5c');
  const run = (x0, x1) => {
    const n = Math.round((x1 - x0) / 3.2), w = (x1 - x0) / n;
    b.box(paint('#1f272e'), x1 - x0, 0.5, 3.2, (x0 + x1) / 2, 0.25, 40, { r: 0.03 });
    for (let i = 0; i < n; i++) { const x = x0 + w * (i + 0.5); b.box(door, w - 0.14, 3.3, 3.3, x, 2.15, 40.1, { r: 0.05 }); b.box(steel, 1.2, 0.14, 0.16, x, 3.3, 38.34, { r: 0.04 }); }
    b.box(top, x1 - x0 + 0.1, 0.3, 3.9, (x0 + x1) / 2, 3.95, 40, { r: 0.05 });
  };
  run(-23.6, -11.8); run(-4.2, 23.6);
  const upper = (x0, x1) => { const n = Math.round((x1 - x0) / 3.2), w = (x1 - x0) / n; for (let i = 0; i < n; i++) { const x = x0 + w * (i + 0.5); b.box(wood, w - 0.1, 3.8, 2, x, 9.7, 40.7, { r: 0.05 }); b.box(steel, 0.14, 1, 0.14, x + w / 2 - 0.5, 8.5, 39.64, { r: 0.04 }); } };
  upper(-23.6, -17); upper(-14, -11.8); upper(-4.2, 0.6); upper(13.4, 23.6);
  const tile = surf('tile', '#e2e6e4', { roughness: 0.22 }); tile.userData.span = 2.4;
  for (const [x0, x1] of [[-23.6, -11.8], [-4.2, 0.8], [13.2, 23.6]]) b.box(tile, x1 - x0, 3.6, 0.14, (x0 + x1) / 2, 5.9, 41.6, { r: 0.02 });
  b.box(tile, 12, 2.4, 0.14, 7, 5.3, 41.6, { r: 0.02 });
  // sink, tap, hob, hood
  b.box(steel, 5, 0.1, 2.3, 7, 4.12, 39.8, { r: 0.04 }); b.box(paint('#6f757b', { metalness: 0.6 }), 4.4, 0.1, 1.8, 7, 4.16, 39.8, { r: 0.03 }); b.cyl(steel, 0.12, 0.14, 1.8, 7, 5, 40.9); b.box(steel, 0.2, 0.2, 1.2, 7, 5.9, 40.4, { r: 0.08 });
  b.box(paint('#17181c', { roughness: 0.15 }), 5, 0.1, 2.8, -18.5, 4.14, 39.9, { r: 0.04 }); for (const x of [-19.8, -17.2]) for (const z of [39.2, 40.6]) b.cyl(paint('#3a3c42'), 0.5, 0.5, 0.05, x, 4.2, z, { seg: 20 });
  b.box(steel, 5.4, 1, 3, -15.5 - 3, 8.2, 40.4, { r: 0.08 }); b.box(steel, 2, 4, 1.4, -18.5, 10.9, 41.1, { r: 0.05 });
  b.box(paint('#d84a3a'), 0.9, 1.2, 0.9, 19, 4.7, 40, { r: 0.1 }); b.cyl(paint('#f1ecdf'), 0.5, 0.42, 1.1, 22, 4.65, 40); b.box(wood, 2.6, 0.2, 1.8, -2, 4.2, 40, { r: 0.05 });
  for (const [x, c] of [[-0.9, '#e0a73c'], [-1.8, '#b8483a']]) b.add(paint(c), new THREE.SphereGeometry(0.34, 14, 10), x, 4.56, 40);
  // the living room
  b.box(paint('#6c7a88', { roughness: 0.95 }), 17, 0.1, 13, 13, 0.05, 28, { r: 0.04 }); b.box(paint('#e5dfd2', { roughness: 0.95 }), 15, 0.12, 11, 13, 0.06, 28, { r: 0.04 });
  b.box(wood, 7, 0.3, 3.4, 13, 2, 28, { r: 0.06 }); for (const x of [10, 16]) for (const z of [26.8, 29.2]) b.box(paint('#1d2024'), 0.2, 1.8, 0.2, x, 0.95, z, { r: 0.04 });
  b.box(paint('#17181c', { roughness: 0.2 }), 0.3, 6, 10, 23.4, 7, 12.6 + 7, { r: 0.05 }); b.box(paint('#3a2c20'), 3, 1.8, 11, 22.2, 0.9, 19.6, { r: 0.06 });
  b.done(g);
  const sf = sofa(); sf.position.set(6.4, 0, 27.5); sf.rotation.y = Math.PI / 2; g.add(sf);
  for (const [x, z, s, sd] of [[21.3, 37, 1.2, 4], [-21.4, 11, 1.1, 8], [10, 10.8, 0.9, 12]]) { const p = plant({ size: s, seed: sd }); p.position.set(x, 0, z); g.add(p); }
  const fr = fridge(); fr.position.copy(FRIDGE); fr.rotation.y = Math.PI; g.add(fr); W.fridge = fr;
  fr.door.position.x = 3.3; fr.door.scale.x = -1;    // hinged on the far side, so the hallway camera sees in
  const tb = diningTable({ l: 15, w: 6.4 }); tb.position.copy(TABLE); g.add(tb);
  const cf = (x, z, ry) => { const c = diningChair(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c); return c; };
  cf(-7, 26.4, Math.PI); cf(-1, 26.4, Math.PI); cf(-7, 17.6, 0); cf(-11, 22, Math.PI / 2); cf(4, 26.4, Math.PI); cf(4, 17.6, 0);
  W.heroChair = diningChair({ pad: '#b8483a' }); g.add(W.heroChair);
  // pendant lamps, a bowl, the plate left on the table
  const pb = new Batch(), bk = paint('#1d2024', { metalness: 0.5, roughness: 0.4 }); for (const x of [-7, -3, 1]) { pb.cyl(bk, 0.05, 0.05, 3.4, x, H - 1.7, 22); pb.cyl(bk, 0.3, 1.1, 1, x, H - 3.8, 22, { seg: 20 }); } pb.cyl(paint('#c9b48a'), 1, 0.7, 0.5, 1, 4.72, 22.5, { seg: 22 }); pb.done(g);
  W.pendM = new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd7a0', emissiveIntensity: 2 }); for (const x of [-7, -3, 1]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), W.pendM); m.position.set(x, H - 4.3, 22); g.add(m); }
  const pl = new Batch(); pl.cyl(paint('#f5f3ec'), 1.2, 0.9, 0.12, 0, 0, 0, { seg: 28 }); pl.box(paint('#d8a860', { roughness: 0.7 }), 1.3, 0.16, 1, 0, 0.16, 0, { r: 0.07 }); pl.box(paint('#6aa04a'), 1.3, 0.08, 1, 0, 0.27, 0, { r: 0.03 }); pl.box(paint('#d8a860', { roughness: 0.7 }), 1.3, 0.16, 1, 0, 0.38, 0, { r: 0.07 });
  W.plate = pl.done(); W.plate.position.set(-1, 4.56, 23.4); g.add(W.plate);
  // the sliding window and its curtains
  W.sash = new THREE.Group(); g.add(W.sash); const sb = new Batch();
  for (const [h, d, y, z] of [[7.2, 0.3, 7.1, 15.15], [7.2, 0.3, 7.1, 22.05], [0.3, 7.2, 3.65, 18.6], [0.3, 7.2, 10.55, 18.6]]) sb.box(paint('#24272d', { metalness: 0.35, roughness: 0.4 }), 0.3, h, d, -24, y, z, { r: 0.03 }); sb.box(paint('#cfe0ea', { roughness: 0.08, transparent: true, opacity: 0.22 }), 0.1, 6.6, 6.6, -24, 7.1, 18.6, { r: 0.01 }); sb.done(W.sash);
  W.curt = [15.3, 28.7].map((z) => {
    const geo = new THREE.PlaneGeometry(3.4, 9.4, 14, 16), m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#f4efe4', roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.86 }));
    m.position.set(-23.1, 6.5, z); m.rotation.y = Math.PI / 2; m.userData.noAO = true; m.userData.base = geo.attributes.position.array.slice(); g.add(m); return m;
  });
  const rod = new Batch(); rod.cyl(paint('#24272d', { metalness: 0.5 }), 0.1, 0.1, 18, -23.1, 11.3, 22, { rx: Math.PI / 2 }); rod.done(g);
}

function hall() {
  const g = W.home, wall = surf('stucco', '#e8e3d8');
  W.hallE = new THREE.Group(); W.hallW = new THREE.Group(); g.add(W.hallE); g.add(W.hallW);
  const e = new Batch(), w = new Batch(), sk = paint('#f4f1ea', { roughness: 0.5 }), wood = surf('plank', '#6f4d36');
  e.box(wall, 0.6, H, 32, 5, H / 2, -8, { r: 0.02 }); e.box(sk, 0.18, 0.7, 32, 4.62, 0.35, -8, { r: 0.04 });
  w.box(wall, 0.6, H, 32, -5, H / 2, -8, { r: 0.02 }); w.box(sk, 0.18, 0.7, 32, -4.62, 0.35, -8, { r: 0.04 });
  // the shelf the camera sits on, and a hall table under the pictures
  e.box(wood, 1.7, 0.26, 3.6, 3.9, 7.62, -8, { r: 0.05 }); for (const z of [-9.4, -6.6]) e.box(paint('#1d2024'), 0.8, 0.8, 0.14, 4.3, 7.2, z, { r: 0.03 });
  e.box(wood, 1.9, 0.26, 6.4, 3.6, 3.3, 2.4, { r: 0.05 }); for (const z of [-0.5, 5.3]) e.box(paint('#1d2024'), 1.5, 3.2, 0.16, 3.7, 1.6, z, { r: 0.03 });
  e.box(paint('#ded7c8', { roughness: 0.4 }), 0.9, 1.2, 0.9, 3.5, 4, 1.2, { r: 0.2 }); e.box(paint('#3a2c20'), 1.4, 0.2, 1.8, 3.6, 3.52, 3.6, { r: 0.05 });
  e.done(W.hallE); w.done(W.hallW);
  W.cam = secCam(); W.cam.position.set(4, 7.75, -8); W.cam.head.rotation.y = -Math.PI / 2; W.hallE.add(W.cam);
  const rb = new Batch(); rb.box(paint('#4a5a70', { roughness: 0.95 }), 5.2, 0.08, 24, 0, 0.04, -8, { r: 0.03 }); rb.box(paint('#d9d0be', { roughness: 0.95 }), 4.2, 0.1, 23, 0, 0.05, -8, { r: 0.03 }); rb.done(g);
  // the front door in the west wall, with a side light
  const d = new THREE.Group(); W.hallW.add(d); W.door = d; const b = new Batch(), z0 = -1.5;
  const frameM = paint('#24272d', { metalness: 0.35, roughness: 0.4 });
  b.box(frameM, 0.5, 10.6, 0.4, -4.55, 5.3, z0 - 3.1, { r: 0.04 }); b.box(frameM, 0.5, 10.6, 0.4, -4.55, 5.3, z0 + 3.1, { r: 0.04 }); b.box(frameM, 0.5, 0.4, 6.6, -4.55, 10.6, z0, { r: 0.04 }); b.box(frameM, 0.5, 10.6, 0.4, -4.55, 5.3, z0 - 5.3, { r: 0.04 }); b.box(frameM, 0.5, 0.4, 2.2, -4.55, 10.6, z0 - 4.2, { r: 0.04 });
  b.box(surf('plank', '#5b3a24', { roughness: 0.45 }), 0.3, 10.2, 5.8, -4.6, 5.1, z0, { r: 0.04 });
  for (const [y, h] of [[8, 2.9], [3, 3.6]]) b.box(paint('#6a4630', { roughness: 0.45 }), 0.16, h, 4.2, -4.42, y, z0, { r: 0.04 });
  b.box(paint('#d9b65a', { metalness: 0.85, roughness: 0.28 }), 0.3, 2.6, 0.26, -4.2, 5.2, z0 + 2.2, { r: 0.06 }); b.box(paint('#d9b65a', { metalness: 0.85, roughness: 0.28 }), 0.4, 0.5, 0.5, -4.34, 5.2, z0 + 2.2, { r: 0.06 });
  b.done(d);
  W.sideM = new THREE.MeshBasicMaterial({ color: '#ffffff' }); const sl = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 10), W.sideM); sl.position.set(-4.6, 5.3, z0 - 4.2); sl.rotation.y = Math.PI / 2; sl.userData.noAO = true; d.add(sl);
  const mat = new Batch(); mat.box(paint('#3a342c', { roughness: 0.95 }), 3, 0.14, 5.2, -2.8, 0.07, z0, { r: 0.04 }); W.mat = mat.done(); g.add(W.mat);
  const hook = new Batch(); for (const z of [6, 4.8, 3.6]) hook.box(paint('#d9b65a', { metalness: 0.8, roughness: 0.3 }), 0.5, 0.16, 0.16, -4.5, 7.8, z, { r: 0.04 }); hook.box(paint('#2e5a8a', { roughness: 0.9 }), 0.7, 4.2, 1.4, -4.3, 5.7, 4.8, { r: 0.25 }); hook.done(W.hallW);
  // the door going, cube by cube
  const n = 22 * 40, cs = 0.3, im = new THREE.InstancedMesh(new THREE.BoxGeometry(cs, cs, cs), new THREE.MeshStandardMaterial({ roughness: 0.5, emissive: '#2ea8ff', emissiveIntensity: 0.4 }), n);
  const col = new THREE.Color(), r = rng(19); W.cubes = { im, list: [] };
  for (let j = 0; j < 40; j++) for (let i = 0; i < 22; i++) { const k = j * 22 + i, z = z0 - 5.2 + i * 0.38, y = 0.3 + j * 0.27; W.cubes.list.push({ y, z, k: r(), a: r() * 6.28 }); im.setColorAt(k, col.set(z < z0 - 3.1 ? '#cfe6f4' : r() < 0.5 ? '#5b3a24' : '#6a4630')); }
  im.frustumCulled = false; im.visible = false; W.hallW.add(im);
  W.doorSel = selectionBox(0.7, 10.9, 8.8); W.doorSel.position.set(-4.5, 5.45, z0 - 1.1); W.hallW.add(W.doorSel);
}

// walls that get dragged into place
function sliders() {
  const g = W.home, wm = surf('stucco', '#d9d6d0');
  const mk = (w, h, d, from, to, t0, t1) => {
    const p = new THREE.Group(), b = new Batch(); b.box(wm, w, h, d, 0, 0, 0, { r: 0.04 }); b.done(p); const s = selectionBox(w + 0.1, h + 0.1, d + 0.1); p.add(s); g.add(p);
    const it = { p, s, from, to, t0, t1 }; W.sl.push(it); return it;
  };
  W.sl = []; const y = H / 2, e = EV.walls;
  mk(0.5, H, 12, v3(-15.3, y, -44), v3(-15.3, y, -30), e + 0.05, e + 0.95);
  mk(0.5, H, 18, v3(-23.3, y, 60), v3(-23.3, y, 22), e + 0.3, e + 1.7);
  mk(16, H, 0.5, v3(32, y, 41.3), v3(7, y, 41.3), e + 0.5, e + 1.9);
  mk(0.5, H, 24, v3(23.3, y, 60), v3(23.3, y, 24), e + 0.2, e + 1.6);
  mk(26, H, 0.5, v3(-34, y, 12), v3(-10, y, 12), e + 0.8, e + 2.1);     // a new wall across the kitchen
  W.sealS = mk(11, H, 0.5, v3(-16, y, 8), v3(0, y, 8), e + 1.2, e + 2.4);
  W.sealN = mk(11, H, 0.5, v3(16, y, -23.6), v3(0, y, -23.6), e + 2.4, e + 3.2);
}

function exterior(scene) {
  const g = new THREE.Group(); g.position.copy(EX); scene.add(g); W.ext = g;
  const b = new Batch(), road = paint('#3b3e45', { roughness: 0.93 }), walk = surf('concrete', '#b6b2a8'), grass = surf('grass', '#5da445');
  b.box(grass, 900, 1, 700, 0, -0.5, 0, { r: 0.02 }); b.box(road, 900, 0.1, 26, 0, 0.06, 66, { r: 0.02 });
  for (let x = -440; x < 440; x += 16) b.box(paint('#e6d9a2', { roughness: 0.7 }), 7, 0.04, 0.45, x, 0.13, 66, { r: 0.01 });
  for (const z of [50, 82]) { b.box(walk, 900, 0.5, 6, 0, 0.25, z, { r: 0.05 }); b.box(paint('#8a877e'), 900, 0.56, 0.5, 0, 0.28, z + (z < 60 ? 3 : -3), { r: 0.08 }); }
  b.box(surf('concrete', '#c2beb4'), 18, 0.3, 40, 31, 0.15, 30, { r: 0.05 }); b.box(surf('concrete', '#c9c5ba'), 6, 0.26, 32, -7, 0.13, 32, { r: 0.05 });
  for (const x of [-30, -19, 12, 20]) b.box(paint('#2f7a3c', { roughness: 0.85 }), 9, 2.6, 2.6, x, 1.3, 44, { r: 0.8 });
  b.box(paint('#2a2a2e'), 0.5, 4, 0.5, 8, 2, 47, { r: 0.06 }); b.box(paint('#1b6fd6'), 2.4, 1.4, 1.4, 8, 4.4, 47, { r: 0.3 });
  b.done(g);
  const house = modernHouse({ lit: 0.12 }); g.add(house);
  const car = model('car', { color: '#d9d9de' }); car.position.set(31, 0.3, 32); car.scale.setScalar(1.3); g.add(car);
  const c2 = model('car', { color: '#c0392b' }); c2.position.set(-60, 0.13, 58); c2.rotation.y = Math.PI / 2; c2.scale.setScalar(1.3); g.add(c2);
  const nb = [[-92, '#d6c3a4', '#7a4a3c'], [100, '#a8b8c4', '#3f5560'], [-168, '#c9a0a0', '#54404e'], [172, '#e0ceb0', '#6a3d38']];
  nb.forEach(([x, w, r], i) => { const h = building({ style: 'stucco', wall: w, roofColor: r, floors: 2, floorH: 9, w: 42, d: 24, roof: 'gable', lit: 0, windows: 4, seed: 30 + i }); h.position.set(x, 0, 0); g.add(h); });
  for (const [x, z, yw] of [[-70, 118, Math.PI], [20, 122, Math.PI], [110, 118, Math.PI]]) { const h = building({ style: 'stucco', wall: '#d9cdb8', roofColor: '#4c5a66', floors: 2, floorH: 9, w: 40, d: 24, roof: 'gable', lit: 0, windows: 4, seed: x + 200 }); h.position.set(x, 0, z); h.rotation.y = yw; g.add(h); }
  const st = sign('BROOKHAVEN AVE', { w: 10.5, h: 1.9, bg: '#1b6b3a', fg: '#ffffff', edge: '#ffffff' }); st.position.set(-11.5, 10.6, 52); g.add(st);
  const pb = new Batch(); pb.cyl(paint('#6a6e76', { metalness: 0.7 }), 0.2, 0.26, 11, -11.5, 5.5, 51.7); pb.done(g);
  const l1 = lamp({ height: 15, glow: '#fff2cc' }); l1.position.set(46, 0.5, 49); l1.rotation.y = Math.PI; g.add(l1);
  const shapes = [treeShape({ seed: 21, h: 24, r0: 1.7, r1: 0.8, spread: 13, clumps: 13, cols: ['#2c6a33', '#4f9a3f', '#9ccb55'] }), treeShape({ seed: 22, h: 30, r0: 2, r1: 0.9, spread: 15, clumps: 14, cols: ['#2a6232', '#4a9040', '#8cc050'] })];
  const r = rng(9), list = [];
  for (const [x, z] of [[-46, 24], [58, 34], [-132, 24], [136, 26], [-44, -34], [50, -36]]) list.push({ x, z, s: 1, yaw: r() * 6, shape: list.length % 2 });
  for (let i = 0; i < 26; i++) list.push({ x: -340 + i * 27 + r() * 8, z: -74 - r() * 60, s: 1.1 + r() * 0.4, yaw: r() * 6, shape: i % 2 });
  const set = treeSet(g, shapes, list); void set;
  // someone already at the upstairs window: the first frame's secret
  const fig = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5.6), new THREE.MeshBasicMaterial({ transparent: true, map: canvasTex(128, 256, (c, w, h) => { c.fillStyle = '#0c0c10'; c.beginPath(); c.arc(64, 54, 36, 0, 7); c.fill(); c.fillRect(22, 96, 84, 160); }) }));
  fig.position.set(-11, 18.6, 10.5); fig.userData.noAO = true; g.add(fig); W.fig = fig;
}

function characters(scene) {
  W.jake = makeCharacter({ ...CAST.jake, caustic: false }); W.home.add(W.jake.root); W.tag = nameTag(W.jake, 'Jake');
  W.str = makeCharacter({ ...CAST.stranger, caustic: false }); W.home.add(W.str.root);
  W.sel = new THREE.Group(); W.home.add(W.sel);
  W.eyes = [-1, 1].map((s) => { const e = glowSprite('#ffffff', 0.24, 0.9); e.position.set(s * 0.3, 0.62, 1.08); W.str.neck.add(e); return e; });
  // Jake outside: the same avatar on the street set
  W.jakeOut = makeCharacter({ ...CAST.jake, caustic: false }); W.ext.add(W.jakeOut.root); W.jakeOut.root.position.set(-8, 0.25, 34); nameTag(W.jakeOut, 'Jake');
  void scene;
}

// ---- passes: the camera's own picture ----
const CctvShader = {
  uniforms: { tDiffuse: { value: null }, mono: { value: 1 }, tm: { value: 0 }, tear: { value: 0 }, block: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float mono, tm, tear, block;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv, c = uv - 0.5; float r2 = dot(c * vec2(0.5625, 1.0), c * vec2(0.5625, 1.0));
      uv = 0.5 + c * (1.0 + 0.10 * mono * r2 - 0.012 * mono);
      float band = floor(uv.y * 34.0), rnd = h(vec2(band, floor(tm * 24.0)));
      uv.x += tear * (rnd - 0.5) * 0.34 * step(0.55, h(vec2(band * 1.7, floor(tm * 18.0))));
      if (block > 0.5) { vec2 g = vec2(block / 1080.0, block / 1920.0); uv = (floor(uv / g) + 0.5) * g; }
      vec3 s = texture2D(tDiffuse, uv).rgb;
      float L = dot(s, vec3(0.3, 0.6, 0.1));
      L = clamp((L - 0.03) * 1.18, 0.0, 1.0);
      vec3 ir = L * vec3(0.84, 0.98, 1.0) + vec3(0.012, 0.02, 0.024);
      float n = (h(uv * vec2(907.0, 1693.0) + floor(tm * 30.0)) - 0.5);
      ir += n * (0.05 + 0.05 * (1.0 - L));
      ir *= 0.965 + 0.035 * sin(vUv.y * 1920.0 * 1.57);
      vec3 col = mix(s, ir, mono);
      col += tear * n * 0.5;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

// ---- the overlay: phone bar and camera read-out, drawn fresh for each frame from t ----
function hudInit() {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; c.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  ctx.grade.after(c); W.hud = c; W.h2 = c.getContext('2d');
}
const MONO = '700 42px Consolas, "Courier New", monospace';
function corners(x, a, b, w, h, len, col, lw = 5) {
  x.strokeStyle = col; x.lineWidth = lw;
  for (const [px, py, sx, sy] of [[a, b, 1, 1], [a + w, b, -1, 1], [a, b + h, 1, -1], [a + w, b + h, -1, -1]]) { x.beginPath(); x.moveTo(px + sx * len, py); x.lineTo(px, py); x.lineTo(px, py + sy * len); x.stroke(); }
}
function txt(x, s, px, py, col = '#f2fbff', align = 'left', font = MONO) {
  x.font = font; x.textAlign = align; x.textBaseline = 'alphabetic'; x.lineWidth = 7; x.strokeStyle = 'rgba(0,0,0,0.65)'; x.lineJoin = 'round'; x.strokeText(s, px, py); x.fillStyle = col; x.fillText(s, px, py);
}
const toScreen = (p) => { const q = p.clone().project(ctx.camera); return [(q.x * 0.5 + 0.5) * 1080, (0.5 - q.y * 0.5) * 1920, q.z]; };

function hudPhone(t, n) {
  const x = W.h2; corners(x, 58, 160, 964, 1560, 70, 'rgba(255,255,255,0.8)', 5);
  if (Math.floor(t * 1.6) % 2 === 0) { x.fillStyle = '#ff2a3a'; x.beginPath(); x.arc(112, 226, 17, 0, 7); x.fill(); }
  txt(x, 'REC', 142, 241); const s = Math.floor(t);
  txt(x, `00:${String(s).padStart(2, '0')}`, 1000, 241, '#f2fbff', 'right');
  const late = n === 'place' || n === 'lens', day = n === 'chair' ? 88 + Math.min(2, Math.floor((t - L(2).start + 0.25) / 0.5)) : n === 'window' ? 90 : n === 'fridge' ? 91 : n === 'wake' ? 88 : 87;
  const clock = late ? '9:42 PM' : `7:${String(12 + day - 80).padStart(2, '0')} AM`;
  txt(x, late ? 'DAY 91' : `DAY ${day}`, 112, 300, '#ffe23a'); txt(x, clock, 1000, 300, '#f2fbff', 'right');
}
function hudCam(t, n, label = 'CAM 01  HALLWAY') {
  const x = W.h2; corners(x, 46, 150, 988, 1500, 60, 'rgba(236,250,255,0.75)', 4);
  if (Math.floor(t * 2) % 2 === 0) { x.fillStyle = '#ff2a3a'; x.beginPath(); x.arc(100, 214, 16, 0, 7); x.fill(); }
  txt(x, 'REC', 128, 229); txt(x, n === 'top' ? '03:17:00 AM' : `${hudClock(t)} AM`, 1006, 229, '#f2fbff', 'right');
  txt(x, label, 84, 286, n === 'top' ? '#ff5a66' : '#f2fbff'); txt(x, 'IR', 1006, 286, '#7dffea', 'right');
  const tf = t, e = EV;
  if (n === 'cam1' && t > e.motion && Math.floor(t * 5) % 2 === 0) txt(x, 'MOTION DETECTED', 540, 390, '#ff3344', 'center', '700 58px Consolas, monospace');
  if (['cam2'].includes(n) && t > e.step) track(tf, 'stand');
  if (['cam4', 'cam5', 'cam6', 'cam7', 'cam8'].includes(n)) track(tf, n);
}
function track(t, n) {
  const x = W.h2, s = str(t), sit = s.state === 'sit', a = v3(s.x, sit ? 2.4 : 0, s.z), b = v3(s.x, sit ? 7.4 : 6.5, s.z);
  const [ax, ay, az] = toScreen(a), [bx, by] = toScreen(b); if (az > 1) return;
  const hh = Math.abs(ay - by), cx = (ax + bx) / 2, w = hh * 0.62, top = Math.min(ay, by);
  if (hh < 30 || cx < 0 || cx > 1080) return;
  if (n !== 'cam5') { corners(x, cx - w / 2, top, w, hh, Math.max(16, hh * 0.1), '#ffe23a', 4); txt(x, 'MOTION', cx - w / 2, top - 14, '#ffe23a', 'left', '700 30px Consolas, monospace'); }
  if (n === 'cam5') {   // the empty name plate
    const [px, py] = toScreen(v3(s.x, 6.05, s.z)), pw = 330, ph = 66;
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.strokeStyle = '#ff3344'; x.lineWidth = 5; x.beginPath(); x.roundRect(px - pw / 2, py - ph / 2, pw, ph, 18); x.fill(); x.stroke();
    if (Math.floor(t * 3.2) % 2 === 0) { x.fillStyle = '#ff3344'; x.fillRect(px - 4, py - 22, 8, 44); }
    txt(x, 'USERNAME:', px, py - ph / 2 - 14, '#ff3344', 'center', '700 38px Consolas, monospace');
  }
}

// ---- Jake's screen ----
function drawUI(t) {
  const e = EV, typed = clamp(Math.floor((t - e.msg) / 0.075), 0, 24), list = t >= e.list ? (t >= e.owner ? 3 : t >= e.himself ? 2 : t >= e.rows ? 1 : 0) + 1 : 0, sec = Math.floor(t * 2);
  const key = `${typed}|${list}|${list ? 0 : sec}|${t >= e.freeze}`;
  if (key === W.uiKey) return; W.uiKey = key;
  const x = W.uiC.getContext('2d'), Wd = 1280, Ht = 800; x.clearRect(0, 0, Wd, Ht);
  x.font = '700 40px Consolas, monospace'; x.textAlign = 'left'; x.fillStyle = '#f2fbff';
  if (sec % 2 === 0 || t >= e.freeze) { x.fillStyle = '#ff2a3a'; x.beginPath(); x.arc(52, 52, 15, 0, 7); x.fill(); }
  x.fillStyle = '#f2fbff'; x.fillText(`PLAYBACK  ${hudClock(t)} AM`, 80, 66);
  if (t >= e.msg - 0.15 && !list) {
    x.fillStyle = 'rgba(6,0,2,0.8)'; x.fillRect(0, 0, Wd, Ht); x.fillStyle = '#16060a'; x.strokeStyle = '#ff2a3a'; x.lineWidth = 8; x.beginPath(); x.roundRect(90, 170, 1100, 460, 26); x.fill(); x.stroke();
    x.textAlign = 'center'; x.font = '900 118px ITTInter, sans-serif'; x.fillStyle = '#ff3344';
    x.shadowColor = '#ff2a3a'; x.shadowBlur = 34;
    const msg = 'STOP RECORDING MY HOUSE.', a = msg.slice(0, Math.min(typed, 14)), b = msg.slice(15, Math.max(15, typed));
    x.fillText(a, 640, 350); x.fillText(b, 640, 510); x.shadowBlur = 0;
    if (typed < 24 && sec % 2 === 0) { x.fillStyle = '#ff3344'; const m = typed < 15 ? x.measureText(a) : x.measureText(b); x.fillRect(640 + m.width / 2 + 10, typed < 15 ? 262 : 422, 18, 100); }
  }
  if (list) {
    x.fillStyle = 'rgba(0,0,0,0.72)'; x.fillRect(0, 0, Wd, Ht);
    x.fillStyle = 'rgba(20,24,30,0.96)'; x.beginPath(); x.roundRect(120, 90, 1040, 620, 22); x.fill();
    x.font = '900 62px ITTInter, sans-serif'; x.fillStyle = '#ffffff'; x.textAlign = 'left'; x.fillText('Players', 170, 180); x.textAlign = 'right'; x.fillStyle = list >= 2 ? '#ffe23a' : '#9aa4b0'; x.fillText(list >= 2 ? '2 online' : '', 1110, 180);
    x.fillStyle = '#3a424c'; x.fillRect(170, 212, 940, 4);
    const row = (y, sq, name, col, on) => {
      x.fillStyle = on ? on : 'rgba(255,255,255,0.08)'; x.beginPath(); x.roundRect(160, y, 960, 170, 18); x.fill();
      x.fillStyle = sq; x.beginPath(); x.roundRect(186, y + 25, 120, 120, 16); x.fill();
      x.font = '900 92px ITTInter, sans-serif'; x.textAlign = 'left'; x.fillStyle = col; x.fillText(name, 340, y + 118);
    };
    if (list >= 2) {
      row(246, '#1b6fd6', 'Jake', '#ffffff', list === 3 ? 'rgba(255,226,58,0.28)' : null);
      if (list >= 4) { row(440, '#0c0c10', 'HOMEOWNER', '#ff3344', 'rgba(255,42,58,0.26)'); }
      else { x.fillStyle = 'rgba(255,255,255,0.08)'; x.beginPath(); x.roundRect(160, 440, 960, 170, 18); x.fill(); x.fillStyle = '#39414a'; x.beginPath(); x.roundRect(186, 465, 120, 120, 16); x.fill(); x.fillStyle = '#39414a'; x.fillRect(340, 505, 520, 44); }
    }
  }
  W.ui.needsUpdate = true;
}

// Fridge door, wall panel and so on, by world
const SHOW = (o, v) => { o.visible = v; };
function setChair(i) {
  const c = W.heroChair, at = [[-1, 17.6, 0], [-1.5, 13.6, 2.3], [-7, 11.2, 0.5]][i];
  c.position.set(at[0], 0, at[1]); c.rotation.y = at[2];
}
function lights(o) {
  const l = W.lt;
  for (const k of Object.keys(l)) l[k].intensity = o[k] || 0;
  W.down.emissiveIntensity = o.down ?? 0; W.pendM.emissiveIntensity = o.pend ?? 0;
}
function cardsTo(v, col) { for (const c of W.cards) { c.visible = v > 0; c.material.color.copy(col).multiplyScalar(v); } W.sideM.color.copy(col).multiplyScalar(Math.max(v, 0.03)); }

function sitChar(ch, x, seat, z, yaw, t) { pose(ch, 'sit', t); ch.root.position.set(x, seat - 0.225 * ch.hipY + 0.55, z); ch.root.rotation.y = yaw; }

function houseIR(t) {
  const e = EV, tq = Math.floor(t * 12) / 12, s = str(tq), S = W.str;
  applyEnv(ctx, IR); lights({ ir: 70, ir2: 46, ir3: 46 }); cardsTo(0.05, new THREE.Color('#9fb4c8')); W.grid.visible = false; W.ceil.visible = true;
  W.panel.position.x = -6.2 * smooth(e.wall, e.step - 0.1, tq); W.cavLight.intensity = 1.2 * smooth(e.wall, e.step, tq); W.cam.visible = false;
  S.root.visible = tq >= e.step; W.duvet.visible = true; setChair(0); W.plate.visible = tq >= e.skip2; W.sash.position.z = 0;
  W.sl.forEach((p) => SHOW(p.p, false)); W.doorSel.visible = false; W.cubes.im.visible = false; W.door.visible = true; W.mat.visible = true;
  W.hallE.position.x = 0; W.hallW.position.x = 0;
  W.fridge.door.rotation.y = tq >= e.skip1 && tq < e.skip2 ? 1.9 * smooth(e.fopen, e.fopen + 0.45, tq) : 0;
  const open = tq >= e.fopen && tq < e.skip2; W.fridge.lightM.color.setScalar(open ? 0.7 : 0.15); W.fridge.lamp.intensity = open ? 16 : 0;
  // Jake, asleep
  const J = W.jake; pose(J, 'still', t); J.root.visible = true; J.root.position.set(-10, 3.05, -41.2); J.root.rotation.set(-Math.PI / 2, 0, 0); J.setFace('sleepy', {}); W.tag.visible = false;
  // him
  S.root.rotation.set(0, s.yaw, 0);
  if (s.state === 'sit') { sitChar(S, s.x, 2.48, s.z, s.yaw, tq); S.arms[0].rotation.x = S.arms[1].rotation.x = -1.1; S.neck.rotation.y = 0; }
  else { S.root.position.set(s.x, 0, s.z); pose(S, s.state === 'walk' ? 'walk' : 'still', tq); }
  const look = Math.atan2(LENS.x - s.x, LENS.z - s.z) - s.yaw;
  if (s.state === 'sit') {
    const k = Math.floor(clamp((tq - e.turn) / 0.8) * 8) / 8;
    S.neck.rotation.y = lerp(1.1, look, k); S.neck.rotation.x = -0.2 * k; S.arms[0].rotation.x = S.arms[1].rotation.x = -1.1;
  } else if (tq >= e.stop && tq < e.go) S.neck.rotation.x = -0.45;
  S.setFace('neutral', { gaze: 'forward', blink: false });
  W.eyes.forEach((m) => { m.visible = t >= e.turn + 0.8; });
}

function houseReal(kind, t, n) {
  const e = EV, nightish = kind !== 'day';
  W.cam.visible = true; W.str.root.visible = false; W.duvet.visible = false; W.panel.position.x = 0; W.cavLight.intensity = 0;
  W.fridge.lightM.color.setScalar(0.2); W.fridge.lamp.intensity = 0; W.fridge.door.rotation.y = 0; W.grid.visible = false; W.ceil.visible = true;
  W.jake.root.visible = true; W.jake.root.rotation.set(0, 0, 0);
  W.plate.visible = false; setChair(0); W.sash.position.z = 0;
  if (kind === 'day') { applyEnv(ctx, INDAY); lights({ hallf: 45, bedf: 30, kit: 45 }); cardsTo(1.08, new THREE.Color('#ffffff')); }
  else if (kind === 'dusk') { applyEnv(ctx, DUSKIN); lights({ hallf: 95, kit: 34, bedf: 40, down: 1.6, pend: 1.4 }); cardsTo(0.5, new THREE.Color('#ffb080')); }
  else if (kind === 'dawn') { applyEnv(ctx, DAWN); lights({ desk: 42, bedf: 8, deskRim: 16, hallf: 14, kit: 10, down: 0.1 }); cardsTo(0.42, new THREE.Color('#6f94d0')); }
  else { applyEnv(ctx, n === 'plan' ? PLAN : ENDP); lights({ hallf: n === 'wallmove' ? 16 : 60, desk: n === 'wallmove' ? 42 : 0, bedf: 10, kit: 10, down: 0.9, deskRim: 16 }); cardsTo(0.42, new THREE.Color('#6f94d0')); }
  // the walls
  W.sl.forEach((s) => {
    const k = easeInOut(clamp((t - s.t0) / (s.t1 - s.t0))), go = nightish && t >= s.t0 - 0.2;
    s.p.visible = go; s.p.position.copy(lp3(s.from, s.to, k)); s.s.visible = go && (t < s.t1 + 0.35 || t > e.seal);
  });
  const close = t > e.seal ? clamp((t - e.seal) / (e.end - e.seal)) : 0, ck = Math.pow(close, 1.15);
  if (close > 0) {
    W.sealS.p.position.z = lerp(8, 4.6, ck); W.sealN.p.position.z = lerp(-23.6, -12.6, ck); W.hallE.position.x = -1.5 * ck; W.hallW.position.x = 1.5 * ck;
  } else { W.hallE.position.x = 0; W.hallW.position.x = 0; }
  // the door: selected, then deleted
  const del = t >= e.del; W.door.visible = !del; W.mat.visible = !del; W.doorSel.visible = t >= e.door + 0.05 && !del;
  if (del && t < e.del + 1) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = W.cubes; c.im.visible = true;
    c.list.forEach((p, i) => {
      const a = clamp((t - e.del - p.k * 0.62) / 0.26), s = a >= 1 ? 0 : 1 - a * a;
      m.compose(v3(-4.35 + a * 1.4, p.y + a * Math.sin(p.a) * 0.7, p.z + a * Math.cos(p.a) * 0.7), q, v3(s, s, s)); c.im.setMatrixAt(i, m);
    });
    c.im.instanceMatrix.needsUpdate = true;
  } else W.cubes.im.visible = false;
}

function curtains(t, amt) {
  W.curt.forEach((m, i) => {
    const p = m.geometry.attributes.position, b = m.userData.base;
    for (let k = 0; k < p.count; k++) { const x = b[k * 3], y = b[k * 3 + 1], low = (4.7 - y) / 9.4; p.setZ(k, 0.25 * Math.sin(x * 5 + i) + amt * low * (0.7 + 0.5 * Math.sin(t * 3.1 + y * 0.8 + x * 1.3 + i * 2) + 0.3 * Math.sin(t * 5.3 + x * 2))); }
    p.needsUpdate = true; m.geometry.computeVertexNormals();
  });
}

// the world the footage shows: rendered into the monitor's feed
function renderFeed(t) {
  const { renderer, scene } = ctx, tf = feedT(t);
  houseIR(tf);
  const p = ptz(tf, 1.25), c = W.feedCam; c.position.copy(p.pos); c.fov = p.fov; c.updateProjectionMatrix(); c.lookAt(p.look);
  W.monitor.visible = false; W.ext.visible = false; ctx.sun.castShadow = false;
  renderer.setRenderTarget(W.rt); renderer.clear(); renderer.render(scene, c); renderer.setRenderTarget(null);
  W.monitor.visible = true;
}

// ---- shots ----
const PHONE = ['street', 'selfie', 'wake', 'chair', 'window', 'fridge', 'place', 'lens'];
const CCTV = ['cam1', 'cam2', 'cam4', 'cam5', 'cam6', 'cam7', 'cam8', 'cam9'];
const SCREEN = ['deskface', 'ots', 'react', 'jakeshock', 'msg', 'hands', 'list', 'turn'];
function shots() {
  const ls = (i) => L(i).start, c = 0.08, E = (x, y, z) => EX.clone().add(v3(x, y, z));
  const list = [
    ['street', () => 1.85, (u) => ({ pos: lp3(E(-18, 7, 92), E(-13, 6.8, 83), easeOut(u)), look: E(1, 13, 8), fov: 60 })],
    ['selfie', () => ls(1) - 0.2, (u) => ({ pos: lp3(E(-7.4, 6.1, 43), E(-7.6, 5.9, 41.6), u), look: E(-8, 5.0, 33), fov: 60 })],
    ['wake', () => ls(2) - 0.25, (u, t) => { const z = jakeZ(t); return { pos: v3(1.3, 5.6, z + 12.5), look: v3(0, 3.7, z), fov: 62 }; }],
    ['chair', () => ls(3) - 0.2, (u) => ({ pos: lp3(v3(9.5, 7.8, 10), v3(9, 7.6, 10.4), u), look: v3(-3.5, 2.4, 16), fov: 58 })],
    ['window', () => ls(4) - 0.2, (u) => ({ pos: lp3(v3(-9, 6.5, 13.4), v3(-10, 6.4, 13.6), u), look: v3(-23, 5.8, 21), fov: 60 })],
    ['fridge', () => ls(5) - 0.15, (u) => ({ pos: lp3(v3(-8, 6.9, 38.3), v3(-8, 6.8, 37.9), u), look: v3(-8, 3.8, 29), fov: 70 })],
    ['place', () => ls(5) + 1.75, (u) => ({ pos: lp3(v3(-3.2, 3.2, 3.2), v3(-3.2, 3.4, 1.6), u), look: v3(2.6, 5.4, -8), fov: 62 })],
    ['lens', () => EV.cam, (u) => ({ pos: lp3(v3(-0.6, 8.6, -4.8), v3(0.2, 8.6, -5.4), easeOut(u)), look: v3(3.6, 8.2, -8), fov: 40 })],
    ['cam1', () => ls(7) - 0.1, (u, t) => ptz(t)],
    ['deskface', () => ls(7) + 0.85, (u) => ({ pos: lp3(v3(12.7, 6.9, -41.2), v3(12.5, 6.8, -40.6), u), look: v3(8.6, 4.6, -36), fov: 52 })],
    ['ots', () => EV.wall - 0.05, (u) => ({ pos: lp3(v3(2.6, 8.6, -42.5), v3(4, 8.3, -41.6), easeInOut(u)), look: v3(13.5, 6, -36.5), fov: 62 })],
    ['cam2', () => ls(9) + 1.5, (u, t) => ptz(t)],
    ['react', () => EV.walk, (u) => ({ pos: lp3(v3(12.3, 6.5, -39.4), v3(12.1, 6.4, -39), u), look: v3(8.6, 5, -36), fov: 44 })],
    ['cam4', () => EV.stop, (u, t) => ptz(t)],
    ['cam5', () => EV.go, (u, t) => ptz(t)],
    ['cam6', () => EV.skip1, (u, t) => ptz(t)],
    ['cam7', () => EV.skip2, (u, t) => ptz(t)],
    ['cam8', () => EV.turn, (u, t) => ptz(t)],
    ['cam9', () => ls(16) - 0.1, (u, t) => ptz(t)],
    ['jakeshock', () => EV.stopmsg - 0.1, (u) => ({ pos: lp3(v3(2.6, 8.6, -42.5), v3(4, 8.3, -41.6), easeInOut(u)), look: v3(13.5, 6, -36.5), fov: 62 })],
    ['msg', () => ls(18) - 0.12, (u) => ({ pos: lp3(v3(4.4, 6.5, -36), v3(5.2, 6.5, -36), u), look: v3(14, 5.9, -36), fov: 74 })],
    ['hands', () => EV.rows - 0.15, (u) => ({ pos: lp3(v3(12.7, 6.9, -41.2), v3(12.5, 6.8, -40.6), u), look: v3(8.6, 4.6, -36), fov: 52 })],
    ['list', () => ls(21) + 1.55, (u) => ({ pos: lp3(v3(4.6, 6.5, -36), v3(5.4, 6.5, -36), u), look: v3(14, 5.9, -36), fov: 74 })],
    ['turn', () => EV.walls, (u) => ({ pos: lp3(v3(12.7, 6.9, -41.2), v3(12.5, 6.8, -40.6), u), look: v3(8.6, 4.6, -36), fov: 52 })],
    ['wallmove', () => EV.walls + 0.95, (u) => ({ pos: v3(7, 6.4, -33), look: v3(-15, 5.2, -30.5), fov: 66 })],
    ['plan', () => ls(23) - 0.12, (u) => ({ pos: lp3(v3(0, 118, -6), v3(0, 104, -6), u), look: v3(0, 0, -2), fov: 44 })],
    ['door', () => ls(23) + 1.75, (u) => ({ pos: lp3(v3(3.6, 6.4, 4.5), v3(3.3, 6.3, 4.1), u), look: v3(-4.6, 3.6, -3), fov: 66 })],
    ['cu', () => EV.seal + 0.75, (u) => ({ pos: lp3(v3(-3.3, 5.6, -3.0), v3(-3.4, 5.6, -3.2), u), look: v3(0.4, 3.6, -2.4), fov: 62 })],
    ['trapped', () => ctx.dur - 2.4, (u) => ({ pos: lp3(v3(-0.8, 4.6, 3.6), v3(-0.6, 4.7, 2.8), u), look: v3(0, 3.6, -12), fov: 70 })],
    ['top', () => ctx.dur + 1, (u) => ({ pos: lp3(v3(0.01, 13, -3.6), v3(0.01, 42, -3.6), easeOut(u)), look: v3(0, 0, -2.8), fov: 44 })],
  ];
  let prev = -1;
  return list.map(([name, end, f]) => { const a = prev; prev = end; const t0 = typeof a === 'function' ? a : () => a; return { name, t0, t1: end, f }; });
}
const jakeZ = (t) => lerp(-23, 3, clamp((t - (L(1).start - 0.25)) / (L(2).start - L(1).start)));

function jakeFrame(n, t) {
  const J = W.jake, e = EV; J.root.visible = true; W.tag.visible = false;
  const blink = blinkAt(t, 0.3);
  const seated = ['deskface', 'ots', 'react', 'jakeshock', 'hands', 'turn', 'wallmove'].includes(n);
  if (seated) {
    sitChar(J, 8.9, 2.6, -36, Math.PI / 2, t); J.arms[0].rotation.x = J.arms[1].rotation.x = -1.2;
    const faces = { deskface: 'surprised', ots: 'nervous', react: 'scared', jakeshock: 'shocked', hands: 'scared', turn: 'terrified', wallmove: 'terrified' };
    J.setFace(faces[n], { blink: blink && !['shocked', 'terrified'].includes(faces[n]), gaze: 'forward' });
    if (n === 'turn') J.neck.rotation.y = 1.15 * smooth(EV.walls - 0.75, EV.walls - 0.2, t);
    if (n === 'wallmove') { J.neck.rotation.y = 0.9; J.torso.rotation.x = Math.sin(t * 40) * 0.02; }
    if (n === 'hands') { J.arms[0].rotation.x = -1.2 + Math.sin(t * 16) * 0.12; J.arms[1].rotation.x = -1.2 - Math.sin(t * 13) * 0.12; }
  } else if (n === 'wake') { const z = jakeZ(t); pose(J, 'walk', t); J.root.position.set(0, 0, z); J.root.rotation.y = 0; J.setFace('sleepy', {}); W.tag.visible = true; }
  else if (n === 'chair') J.root.visible = false;
  else if (n === 'window') { pose(J, 'idle', t); J.root.position.set(-18.2, 0, 21); J.root.rotation.y = -Math.PI / 2 - 0.25; J.neck.rotation.y = 0.45; J.setFace('surprised', { blink, gaze: 'forward' }); W.tag.visible = false; }
  else if (n === 'fridge') { pose(J, 'lean', t, { amt: 0.14 }); J.root.position.set(-8, 0, 32.4); J.root.rotation.y = 0; J.setFace('nervous', { blink, gaze: 'forward' }); J.arms[1].rotation.x = -1.4; }
  else if (n === 'place') { pose(J, 'idle', t); J.root.position.set(1.7, 0, -8); J.root.rotation.y = Math.PI / 2; J.setFace('suspicious', { blink }); J.arms[0].rotation.x = -2.5; J.arms[1].rotation.x = -2.5; J.neck.rotation.x = -0.32; W.tag.visible = true; }
  else if (n === 'lens') J.root.visible = false;
  else if (n === 'plan') {
    const k = clamp((t - (EV.walls + 0.95)) / (L(23).start - 0.12 - EV.walls - 0.95)), P3 = [v3(9.4, 0, -36), v3(1, 0, -29), v3(0, 0, -20), v3(0, 0, -6)], i = Math.min(2, Math.floor(k * 3)), f = k * 3 - i, p = lp3(P3[i], P3[i + 1], f);
    pose(J, 'run', t); J.root.position.copy(p); J.root.rotation.y = Math.atan2(P3[i + 1].x - P3[i].x, P3[i + 1].z - P3[i].z); J.setFace('terrified', {}); W.tag.visible = true; W.tag.scale.set(16, 3, 1);
  }
  else if (n === 'door') {
    const k = smooth(L(23).start - 0.1, L(23).start + 0.35, t), hit = t > e.del + 0.1;
    pose(J, hit ? 'scared' : 'run', t); J.root.position.set(lerp(-0.2, -2.0, k), 0, -2.4); J.root.rotation.y = -Math.PI / 2;
    if (!hit) { J.arms[1].rotation.x = -1.6; } J.setFace('terrified', {});
  } else if (n === 'cu' || n === 'trapped' || n === 'top') {
    const look = smooth(EV.seal - 0.2, EV.seal + 0.4, t);
    pose(J, n === 'top' ? 'still' : 'scared', t, { amt: 0.05 }); J.root.position.set(-1.6 + 1.6 * look, 0, -2.4); J.root.rotation.y = n === 'cu' ? -Math.PI / 2 : 0;
    J.setFace(n === 'cu' ? 'shocked' : 'terrified', { gaze: 'forward', blink: false });
  } else J.root.visible = false;
  if (n === 'wallmove') J.root.visible = false;
  if (n !== 'plan') W.tag.scale.set(5.2, 0.975, 1);
}

// ---- the frame ----
function renderAt(t) {
  const sh = shotAt(W.shots, t), n = sh.name, e = EV, first = !ctx.sub || ctx.sub.i === 0;
  const ext = n === 'street' || n === 'selfie', cctv = CCTV.includes(n), top = n === 'top';
  if (SCREEN.includes(n)) { drawUI(t); renderFeed(t); }
  W.ext.visible = ext; W.home.visible = !ext;
  W.air.update(t); leafTime(t, 0.05);
  const cctvPass = W.pass, u = cctvPass.uniforms;
  if (ext) {
    applyEnv(ctx, OUTDAY); lights({});
    const J = W.jakeOut; pose(J, 'wave', t); J.neck.rotation.x = 0; J.root.rotation.y = 0.05; J.setFace('happy', { blink: blinkAt(t, 0.3) });
    J.root.visible = n === 'selfie'; W.fig.visible = n === 'street';
    W.jake.root.visible = false;
  } else if (cctv) { houseIR(t); }
  else {
    const kind = ['wake', 'chair', 'window', 'fridge'].includes(n) ? 'day' : ['place', 'lens'].includes(n) ? 'dusk' : ['deskface', 'ots', 'react', 'jakeshock', 'msg', 'hands', 'list', 'turn'].includes(n) ? 'dawn' : 'end';
    houseReal(kind, t, n); jakeFrame(n, t);
    W.deskChair.visible = !['msg', 'list'].includes(n); W.pics.forEach((g) => { g.visible = n !== 'trapped' && !top; });
    if (n === 'chair') setChair(Math.min(2, Math.max(0, Math.floor((t - L(2).start + 0.25) / 0.55))));
    if (n === 'window') { W.sash.position.z = 7.2; curtains(t, 1.5); } else if (kind === 'day') curtains(t, 0.2);
    if (n === 'fridge') { W.fridge.door.rotation.y = 1.9 * smooth(L(4).start - 0.25, L(4).start + 0.2, t); W.fridge.lightM.color.setScalar(1.2); W.fridge.lamp.intensity = 26; }
    if (n === 'lens' || n === 'place') { const on = t > L(5).start + 2.2; W.cam.led.visible = on && Math.floor(t * 2.4) % 2 === 0; W.cam.halo.visible = W.cam.led.visible; W.cam.head.rotation.y = -Math.PI / 2 - 0.9 * smooth(e.cam - 0.7, e.cam - 0.2, t); }
    if (n === 'plan' || n === 'top') { W.ceil.visible = false; W.grid.visible = true; cardsTo(0, new THREE.Color('#ffffff')); }
    if (n === 'trapped' || top) { const tw = t - e.seal; W.lt.hallf.intensity = (top ? 30 : 60) * (0.85 + 0.15 * noise1(t * 9)); void tw; }
    if (top) { W.cam.head.rotation.y = -Math.PI / 2; }
    W.screenM.uniforms.dim.value = 1;
  }
  // monitor: the shader wants the UI when the feed is off screen too
  W.monitor.visible = !ext;
  // the picture's own trouble
  const bursts = [[e.go - 0.05, e.go + 0.14], [e.cam - 0.28, e.cam + 0.06], [e.wall - 0.05, e.wall + 0.12], [e.skip1 - 0.05, e.skip1 + 0.16], [e.skip2 - 0.05, e.skip2 + 0.16], [L(16).start - 0.3, L(16).start + 0.02], [ctx.dur - 2.4, ctx.dur - 2.28]];
  let tear = 0; for (const [a, b] of bursts) if (t >= a && t < b) tear = 1;
  if (t < 0.36) tear = 1 - t / 0.36;
  if (n === 'cam2' && t > e.step && t < e.step + 0.2) tear = 0.4;
  if (n === 'cam9') tear = Math.max(tear, t > e.freeze + 0.2 ? (Math.floor(t * 9) % 3 === 0 ? 0.25 : 0) : 0);
  const on = cctv || top;
  cctvPass.enabled = on || tear > 0;
  u.mono.value = on ? 1 : 0; u.tm.value = t; u.tear.value = tear; u.block.value = n === 'cam9' ? 3 * smooth(e.turn + 1.2, e.turn + 2.4, t) : 0;
  if (ctx.pro) ctx.pro.grade.uniforms.clarity.value = on ? 0.2 : ctx.pro.grade.uniforms.clarity.value;

  if (first) {
    const x = W.h2; x.clearRect(0, 0, 1080, 1920);
  }
  const shake = { wake: 0.5, chair: 0.35, window: 0.4, fridge: 0.35, place: 0.4, selfie: 0.6, street: 0.35, wallmove: 1.1, plan: 0.2, door: 0.9, cu: 0.5, trapped: 0.5 }[n] || 0;
  const span = ext ? 170 : n === 'plan' ? 120 : 70;
  const rumble = t > e.walls ? 0.25 : 0;
  frame(ctx, t, sh, { shake: top || n === 'plan' ? 0 : shake + rumble * (cctv ? 0 : 1), steady: cctv || top || n === 'plan', shadowSpan: span, shadows: !cctv && !top && !['plan'].includes(n), black: t > ctx.dur - 0.12 ? 1 : 0 });
  if (first) {
    if (PHONE.includes(n)) hudPhone(t, n);
    else if (cctv) hudCam(t, n);
    else if (top) hudCam(t, n, 'CAM 01  HOMEOWNER');
  }
  return n;
}

export async function setup() {
  ctx = await initStage('ep19', { look: 'pro', models: ['car', 'kit_lamp'], avatars: ['farm_jake_blue', 'farm_stranger'] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'happy', 'sleepy', 'nervous', 'surprised', 'scared', 'shocked', 'terrified', 'suspicious']);
  const { scene } = ctx;
  W.cards = [];
  shell(scene); hall(); cavity(); bedroom(); kitchen(); sliders(); exterior(scene); await posters(); characters(scene);
  W.feedCam = new THREE.PerspectiveCamera(60, 1.6, 0.1, 400);
  const pl = (c, d, dist, x, y, z) => { const l = new THREE.PointLight(c, 0, dist, 1.5); l.position.set(x, y, z); W.home.add(l); return l; };
  W.lt = { kit: pl('#fff0dc', 0, 70, 0, 11, 24), hallf: pl('#fff0dc', 0, 40, 0, 11, -8), bedf: pl('#ffe9d0', 0, 44, 0, 11, -37), desk: pl('#9fd8ff', 0, 26, 12.2, 7, -36), deskRim: pl('#ff9a5a', 0, 22, -2, 9, -46),
    ir: pl('#ffffff', 0, 90, 0, 8, -10), ir2: pl('#ffffff', 0, 60, -2, 9, 24), ir3: pl('#ffffff', 0, 50, -1, 9, -43), pend1: pl('#ffd7a0', 0, 40, -3, 8, 22) };
  W.air = atmos(
    dust(scene, { size: 60, height: 12, centre: v3(-6, 6, 24), count: 500, color: '#ffe9c0', amount: 0.32, pointSize: 0.5 }),
    clouds(scene, { parent: W.ext, y: 240, spread: 900, count: 12, color: '#ffffff', size: 26 }),
  );
  hudInit();
  W.pass = new ShaderPass(CctvShader); ctx.composer.addPass(W.pass); W.pass.enabled = false;
  W.shots = shots();
  return expose(ctx, renderAt, EV.turn + 2.4, EV);
}

void Batch; void sign;
