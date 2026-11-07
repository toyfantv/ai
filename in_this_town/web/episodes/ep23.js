// Episode 23: My Adopt Me Pet Remembered a Deleted Player. A warm pastel neighbourhood at golden hour, cherry blossoms, picket fences:
// Lily adopts a tiny golden dragon from the pet shop, but it won't go into her house. Every evening it flies across town to an empty plot
// with an old mailbox and sits there until midnight. She follows it; it drops a golden key; the plot draws a house in light and the house
// comes back, full of a little girl's things, every photo with her face rubbed out. A friend request, accepted: the faces return, the dragon
// jumps for joy, the girl says thank you from the doorway, waves, and the house fades. Lily hugs the dragon in a ring of golden light.
// Sets share the world: the street along x (z = 0), Lily's house at x = 0, the plot at PX, the pet shop at SX.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt, altiCanvas } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, DAY, NIGHT } from '../engine/stage.js';
import { Batch, surf, paint, crowd, lamp } from '../engine/kit.js';
import { dust, shaft, burst, sparkles, clouds, leaves, vanisher, atmos } from '../engine/atmos.js';
import { canvasTex, glowSprite } from '../engine/props.js';
import { sofa, plant } from '../engine/home.js';
import { treeShape, treeSet } from '../engine/forest.js';
import { bushGeo, tuftGeo, tuftMat } from '../engine/isles.js';
import { goldenDragon, goldenKey, goldenEgg } from '../engine/pets.js';
import { cottage, picket, mailbox, flowers, framedPhoto, holeyWall, wallpaper, revealUniforms, revealMat, WIN, PASTEL } from '../engine/pastel.js';

let ctx, L, EV;
const W = {};
const PX = 256, HZ = -34, SX = v3(-900, 0, 0);       // the plot, the house row, the pet shop
const LIL = 0;                                        // Lily's house x
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const tmpC = new THREE.Color();
const SP = (x, y, z) => SX.clone().add(v3(x, y, z));
const PL = (x, y, z) => v3(PX + x, y, HZ + z);        // plot / forgotten house coordinates (house centre)

// ---- palettes ----
const GOLD = { ...DAY, ...P({ top: '#8a8fe0', horizon: '#ffcfa0', haze: '#f7cdb8', sunColor: '#ffd6a8', hemiSky: '#ffe2ec', hemiGround: '#8a9a6a' }),
  sunI: 2.5, sunDir: v3(-0.62, 0.36, 0.5), sunDisc: 1, sunSize: 1.6, hemiI: 0.95, amb: 0.16, envI: 0.9, exposure: 1.02, bloom: 0.2, fogNear: 260, fogFar: 900, saturation: 1.12, contrast: 1.04, bounce: 0.3, lamp: 0.2, win: 0.15 };
const DUSK2 = { ...GOLD, ...P({ top: '#3a3a8a', horizon: '#ff9f8a', haze: '#c890a8', sunColor: '#ffb48a', hemiSky: '#c8a8e0', hemiGround: '#4a4a52' }),
  sunI: 1.3, sunDir: v3(-0.7, 0.14, 0.4), sunSize: 1.9, hemiI: 0.95, amb: 0.16, envI: 0.75, exposure: 1.08, lamp: 2.2, win: 1.0, saturation: 1.1 };
const NIGHT23 = { ...NIGHT, ...P({ top: '#0b1236', horizon: '#2a2f6a', haze: '#1c2250', sunColor: '#b8c8ff', hemiSky: '#5a6ab0', hemiGround: '#1a2030' }),
  sunI: 0.75, sunDir: v3(0.4, 0.62, -0.5), stars: 1, moon: 1, hemiI: 1.15, amb: 0.22, envI: 0.75, exposure: 1.2, bloom: 0.28, lamp: 3.0, win: 1.6, fogNear: 200, fogFar: 700, saturation: 1.08, contrast: 1.03, bounce: 0.2 };
const SHOP = { ...DAY, ...P({ top: '#ffe8f2', horizon: '#fff4e8', haze: '#fff0f4', sunColor: '#fff4e6', hemiSky: '#fff2f6', hemiGround: '#c8a0b8' }),
  sunI: 0, sunDisc: 0, hemiI: 0.8, amb: 0.16, envI: 0.55, exposure: 0.84, bloom: 0.2, fogNear: 200, fogFar: 600, saturation: 1.12, contrast: 1.02, bounce: 0.3 };
const ROOM = { ...NIGHT23, ...P({ haze: '#1a1830', hemiSky: '#ffd8b8', hemiGround: '#5a3a30' }), sunI: 0.25, hemiI: 0.62, amb: 0.14, envI: 0.45, exposure: 1.18, stars: 1, saturation: 1.1 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return {
    crack: s(0) + 0.35, hatch: s(0) + 1.05, toast: s(0) + 1.75, flyoff: s(3) - 0.2, land: s(6) + 1.2, keydrop: s(9) + 1.15, keyland: s(9) + 1.6,
    grab: s(10) + 0.55, outline: s(11) + 0.15, reveal: s(12) - 0.1, notif: s(16) + 1.0, accept: s(18) + 0.1, faces: s(19) + 0.2, jump: s(20) + 0.1,
    msg: s(21) + 0.5, girl: s(23) + 1.15, wave: s(24) - 0.1, fade: s(25) - 0.1, hug: e(25) + 0.35, end: ctx.dur,
  };
}

// ---- the neighbourhood ----
function town() {
  const g = new THREE.Group(); ctx.scene.add(g); W.town = g;
  const b = new Batch();
  b.box(surf('grass', '#8fcf6a'), 1500, 0.2, 520, 160, -0.1, 0, { r: 0.02 });
  b.box(paint('#5f636d', { roughness: 0.93 }), 1500, 0.14, 16, 160, 0.07, 0, { r: 0.02 });
  for (let x = -560; x < 880; x += 9) b.box(paint('#f3e6b0', { roughness: 0.7 }), 4, 0.05, 0.36, x, 0.15, 0, { r: 0.02 });
  for (const s of [-1, 1]) { b.box(paint('#d8d2c8', { roughness: 0.8 }), 1500, 0.45, 0.6, 160, 0.22, s * 8.3, { r: 0.08 }); b.box(surf('concrete', '#ebe5dc'), 1500, 0.36, 4, 160, 0.18, s * 10.6, { r: 0.04 }); }
  W.lampGlows = []; W.lampPos = [];
  const shapes = [treeShape({ seed: 3, h: 9, r0: 0.8, r1: 0.45, spread: 7, clumps: 11, cols: ['#c2507e', '#f08cb8', '#ffd2e6'] }), treeShape({ seed: 8, h: 10, r0: 0.9, r1: 0.5, spread: 7.5, clumps: 12, cols: ['#2f6a33', '#4f9a3f', '#9fd06a'] }),
    treeShape({ seed: 5, h: 8, r0: 0.75, r1: 0.42, spread: 6.5, clumps: 10, cols: ['#d0607e', '#ff9ec4', '#fff0f6'] })];
  const trees = [], spots = [], bushes = [], r = rng(23);
  W.houses = [];
  let k = 0;
  for (let x = -128; x <= 448; x += 32) for (const side of [-1, 1]) {
    const z = side * 34, plot = side < 0 && x === PX;
    if (!plot) {
      const lily = side < 0 && x === LIL;
      const c = cottage({ seed: 40 + k, wall: lily ? '#dccbf6' : PASTEL[(k * 3 + (side > 0 ? 1 : 0)) % PASTEL.length], door: lily ? '#d9536f' : undefined, porch: true });
      c.g.position.set(x, 0, z); c.g.rotation.y = side < 0 ? 0 : Math.PI; g.add(c.g); W.houses.push({ x, side, c }); if (lily) W.lilyHouse = c;
      k++;
      // fence with a gate, path, driveway, mailbox, flowers along the front
      const fz = side * 15.2;
      picket(b, x - 14, x + 7.2, fz, { gap: [x - 2.2, x + 2.2] });
      b.box(surf('cobble', '#d8cfc0'), 3.6, 0.16, 6.2, x, 0.08, side * 18.4, { r: 0.04 });
      b.box(surf('concrete', '#dcd6cc'), 6, 0.14, 22, x + 11, 0.07, side * 23.5, { r: 0.04 });
      const mb = mailbox({ color: ['#4a7fc0', '#d9536f', '#3f8f6a', '#e8c04a'][k % 4], name: lily ? 'LILY' : ' ' }); mb.position.set(x + 5, 0, side * 13.4); mb.rotation.y = side < 0 ? 0 : Math.PI; g.add(mb);
      for (let i = 0; i < 16; i++) spots.push({ x: x - 10 + (i % 8) * 0.95 + (i > 7 ? 13.5 : 0) + r() * 0.3, z: side * (26.6 - 0.9 * Math.floor((i % 8) / 4)) + (r() - 0.5) * 0.3 });
      bushes.push([x - 13, side * 27.5, 1.3], [x + 13, side * 27.5, 1.2], [x - 12.8, side * 16.5, 0.9]);
    }
    trees.push({ x: x + 16 + (r() - 0.5) * 2, z: side * (plot ? 19 : 17.5) + (r() - 0.5) * 2, s: 1 + r() * 0.3, yaw: r() * 6, shape: plot ? 1 : (k + (side > 0 ? 1 : 0)) % 3 });
    if (r() < 0.6) trees.push({ x: x - 7 + r() * 4, z: side * (50 + r() * 6), s: 1.1 + r() * 0.3, yaw: r() * 6, shape: Math.floor(r() * 3) });
    // street lamps
    const lm = lamp({ height: 13 }); lm.position.set(x + 16, 0, side * 11); lm.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2; g.add(lm);
    lm.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial) W.lampGlows.push(o.material); });
    W.lampPos.push(v3(x + 16, 12.5, side * 9.5));
  }
  // far rows: trees and hills behind the houses
  for (let i = 0; i < 70; i++) { const side = i % 2 ? 1 : -1; trees.push({ x: -200 + r() * 720, z: side * (75 + r() * 60), s: 1.3 + r() * 0.8, yaw: r() * 6, shape: Math.floor(r() * 3) }); }
  W.trees = treeSet(ctx.scene, shapes, trees);
  flowers(g, spots, { seed: 3 });
  const bm = new THREE.InstancedMesh(bushGeo(), new THREE.MeshStandardMaterial({ color: '#4f9a4a', roughness: 0.85, flatShading: true }), bushes.length), M = new THREE.Matrix4(), q = new THREE.Quaternion();
  bushes.forEach(([x, z, s], i) => { M.compose(v3(x, 0.6 * s, z), q, v3(s, s, s)); bm.setMatrixAt(i, M); }); bm.castShadow = true; bm.receiveShadow = true; g.add(bm);
  for (const [x, z, h] of [[-300, -260, 60], [120, -300, 80], [520, -280, 70], [-200, 300, 70], [300, 320, 90]]) { const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), surf('grass', '#7fbf63')); hill.scale.set(h * 2.6, h, h * 1.6); hill.position.set(x, -h * 0.35, z); hill.receiveShadow = true; g.add(hill); }
  // the empty plot: long grass, wild flowers, stones, a broken fence, the old mailbox
  const tm = tuftMat(), tufts = new THREE.InstancedMesh(tuftGeo(), tm, 150);
  for (let i = 0; i < 150; i++) { const x = PX - 15 + r() * 30, z = HZ - 13 + r() * 31; const s = 0.6 + r() * 0.6; M.compose(v3(x, 0, z), q.setFromEuler(new THREE.Euler(0, r() * 6, 0)), v3(s, s * (0.8 + r() * 0.6), s)); tufts.setMatrixAt(i, M); }
  tufts.receiveShadow = true; g.add(tufts); W.tufts = tufts;
  const pb = new Batch(), wood = surf('plank', '#b0a08c');
  for (const [x, rz, h] of [[-14, 0.25, 2.4], [-13.4, 0.5, 1.6], [-12.7, -0.15, 2.2], [9.5, -0.35, 2.0], [10.2, 0.6, 1.4], [12.4, 0.1, 2.3]]) pb.box(wood, 0.36, h, 0.14, PX + x, h / 2 - 0.1, -15.1, { rz, r: 0.04 });
  for (const [x, z, s] of [[-6, -20, 0.7], [5, -27, 0.9], [-9, -38, 1.1], [8, -44, 0.8], [-2, -31, 0.5]]) pb.box(surf('cobble', '#b8b0a4'), s * 1.4, s * 0.6, s, PX + x, s * 0.2, z, { r: 0.2, ry: x });
  pb.done(g);
  const dand = []; for (let i = 0; i < 70; i++) dand.push({ x: PX - 14 + r() * 28, z: HZ - 12 + r() * 30 });
  flowers(g, dand, { seed: 9, colors: ['#fff4b0', '#ffffff', '#ffd24a', '#c8b0ff'] });
  W.oldBox = mailbox({ old: true }); W.oldBox.position.set(PX + 4.2, 0, -13.6); g.add(W.oldBox);
  b.done(g);
  // parked cars along the kerb would break the pastel calm: the street stays clear, a few bikes instead
  const bk = new Batch(), fr = paint('#4ab0c8', { metalness: 0.5, roughness: 0.35 }), tire = paint('#1e2026', { roughness: 0.8 });
  for (const [x, z] of [[LIL + 8, -27], [PX + 40, 26]]) { bk.add(tire, new THREE.TorusGeometry(0.75, 0.12, 8, 24), x - 1.2, 0.85, z, Math.PI / 2); bk.add(tire, new THREE.TorusGeometry(0.75, 0.12, 8, 24), x + 1.2, 0.85, z, Math.PI / 2); bk.box(fr, 2.4, 0.14, 0.14, x, 1.4, z, { r: 0.05, rz: 0.1 }); bk.box(fr, 0.14, 1.2, 0.14, x - 0.3, 1.2, z, { r: 0.05 }); bk.box(paint('#2a2a2a'), 0.8, 0.18, 0.4, x - 0.4, 1.9, z, { r: 0.08 }); }
  bk.done(g);
}

// ---- the forgotten house: its outside (revealed, then gone), its outline, and its furnished inside ----
function forgotten() {
  W.revU = revealUniforms(); W.revU.uH0.value = 0; W.revU.uH1.value = 22;
  const c = cottage({ seed: 77, wall: '#fde7a8', door: '#e07a8a', roof: '#a0604a', own: true, number: 0 });
  c.mats.forEach((m) => revealMat(m, W.revU));
  c.g.position.set(PX, 0, HZ); ctx.scene.add(c.g); W.fh = c;
  c.g.traverse((o) => { if (o.isMesh && !c.mats.includes(o.material)) { o.material = o.material.clone(); revealMat(o.material, W.revU); c.mats.push(o.material); } });
  // the outline: glowing tubes along every edge, drawn in order
  const om = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd36a').multiplyScalar(3.2), transparent: true });
  W.outline = new THREE.Group(); W.outline.position.copy(c.g.position); ctx.scene.add(W.outline);
  W.edges = c.edges.map(([a, b2], i) => {
    const len = a.distanceTo(b2), m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 6), om); m.userData.noAO = true;
    m.quaternion.setFromUnitVectors(v3(0, 1, 0), b2.clone().sub(a).normalize()); W.outline.add(m);
    return { m, a, b: b2, len, i };
  });
  W.outlineM = om;
  // a glowing frame on the ground round the whole plot
  W.plotRing = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.32, 4, 1), om); void W.plotRing;
  const pr = []; const corners = [[-15, -12], [15, -12], [15, 19.5], [-15, 19.5]];
  for (let i = 0; i < 4; i++) { const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4]; pr.push({ a: v3(x0, 0.2, z0), b: v3(x1, 0.2, z1) }); }
  W.plotEdges = pr.map(({ a, b: b2 }) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 0.3), om); m.userData.noAO = true; W.outline.add(m); return { m, a, b: b2 }; });
  // the inside
  const g = new THREE.Group(); g.position.copy(c.g.position); ctx.scene.add(g); W.inside = g; g.visible = false;
  const b = new Batch(), wp = wallpaper('#fdeacc', '#f6d6a8', { flower: '#ffffff' }), floor = surf('plank', '#c89a6a'), trim = paint('#fffaf2', { roughness: 0.5 }), Wd = 22, Dd = 16, B = 1, H = 9;
  const own = (m) => { const k = m.clone(); revealMat(k, W.revU2 || (W.revU2 = revealUniforms())); return k; };
  W.inMats = [];
  const O = (m) => { const k = own(m); W.inMats.push(k); return k; };
  const wpM = O(wp), flM = O(floor), trM = O(trim);
  b.box(flM, Wd - 0.6, 0.3, Dd - 0.6, 0, B - 0.1, 0, { r: 0.02 });
  b.box(O(paint('#fff6ea', { roughness: 0.9 })), Wd - 0.6, 0.3, Dd - 0.6, 0, B + H + 0.1, 0, { r: 0.02 });
  for (let x = -8; x <= 8; x += 4) b.box(O(surf('plank', '#d8b890')), 0.6, 0.6, Dd - 0.6, x, B + H - 0.25, 0, { r: 0.05 });
  const T = 0.3;
  // front wall (z = +Dd/2) with the door and two windows; back wall with two; side walls with two each
  const hole = (u, y, w, h) => ({ u, y, w, h });
  holeyWall(b, wpM, Wd - 0.6, H, [hole(0, 3.2, 3.2, 6.4), hole(-7.04, 4.68, 3.0, 3.6), hole(7.04, 4.68, 3.0, 3.6)], (u, y, w, h) => b.box(wpM, w, h, T, u, B + y, Dd / 2 - 0.45, { r: 0.01 }));
  holeyWall(b, wpM, Wd - 0.6, H, [hole(-7.04, 4.68, 3.0, 3.6), hole(7.04, 4.68, 3.0, 3.6)], (u, y, w, h) => b.box(wpM, w, h, T, u, B + y, -Dd / 2 + 0.45, { r: 0.01 }));
  for (const s of [-1, 1]) holeyWall(b, wpM, Dd - 0.6, H, [hole(-3.52, 4.68, 2.4, 3.2), hole(3.52, 4.68, 2.4, 3.2)], (u, y, w, h) => b.box(wpM, T, h, w, s * (Wd / 2 - 0.45), B + y, u, { r: 0.01 }));
  // skirting, chair rail, window frames and curtains
  const curt = O(paint('#ffb8c8', { roughness: 0.9 }));
  for (const [x, z, ry, ww] of [[-7.04, Dd / 2 - 0.65, 0, 3.0], [7.04, Dd / 2 - 0.65, 0, 3.0], [-7.04, -Dd / 2 + 0.65, 0, 3.0], [7.04, -Dd / 2 + 0.65, 0, 3.0], [-Wd / 2 + 0.65, -3.52, Math.PI / 2, 2.4], [-Wd / 2 + 0.65, 3.52, Math.PI / 2, 2.4], [Wd / 2 - 0.65, -3.52, Math.PI / 2, 2.4], [Wd / 2 - 0.65, 3.52, Math.PI / 2, 2.4]]) {
    const c2 = Math.cos(ry), s2 = Math.sin(ry);
    b.box(trM, ww + 0.5, 0.3, 0.4, x, B + 2.7, z, { ry, r: 0.04 }); b.box(trM, ww + 0.5, 0.25, 0.3, x, B + 6.6, z, { ry, r: 0.04 });
    for (const sd of [-1, 1]) b.box(curt, 0.9, 5.6, 0.25, x + c2 * sd * (ww / 2 + 0.55), B + 4.3, z - s2 * sd * (ww / 2 + 0.55), { ry, r: 0.2 });
    b.cyl(O(paint('#d9b24a', { metalness: 0.8, roughness: 0.3 })), 0.08, 0.08, ww + 3, x, B + 7.2, z, { rz: Math.PI / 2, ry, seg: 8 });
  }
  for (const s of [-1, 1]) { b.box(trM, Wd - 0.8, 0.5, 0.2, 0, B + 0.25, s * (Dd / 2 - 0.62), { r: 0.04 }); b.box(trM, 0.2, 0.5, Dd - 0.8, s * (Wd / 2 - 0.62), B + 0.25, 0, { r: 0.04 }); }
  // the door leaf, open into the room
  b.box(O(paint('#e07a8a', { roughness: 0.4 })), 0.22, 6.4, 3.2, -1.6 + 0.12, B + 3.2, Dd / 2 - 0.45 - 1.6, { r: 0.04 });
  // rug, sofa, armchair, coffee table and tea set, toy chest, teddy, blocks, a dollhouse, a rocking horse, a bookcase, a floor lamp, a fireplace
  const rug = new THREE.Mesh(new THREE.CircleGeometry(4.6, 48), O(new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#f7d6e0'; x.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { x.strokeStyle = i % 2 ? '#e8a8c0' : '#fff2f6'; x.lineWidth = 12; x.beginPath(); x.arc(256, 256, 24 + i * 26, 0, 7); x.stroke(); } }), roughness: 1 })));
  rug.rotation.x = -Math.PI / 2; rug.position.set(-1, B + 0.08, 1.2); rug.receiveShadow = true; g.add(rug);
  const sf = sofa({ w: 9, color: '#b8d8f0', cushion: '#ffd27a' }); sf.position.set(-5.5, B, -5.2); sf.scale.setScalar(0.85); g.add(sf);
  b.box(O(surf('plank', '#a87a50')), 4.2, 0.3, 2.4, -3.4, B + 1.5, -0.6, { r: 0.08 }); for (const [x, z] of [[-5.2, -1.6], [-1.6, -1.6], [-5.2, 0.4], [-1.6, 0.4]]) b.box(O(paint('#8a5a3a')), 0.25, 1.4, 0.25, x, B + 0.7, z, { r: 0.05 });
  const tea = O(paint('#ffffff', { roughness: 0.2 })), pinkM = O(paint('#ff9ec4', { roughness: 0.3 }));
  b.cyl(tea, 0.32, 0.28, 0.5, -3.8, B + 1.9, -0.6); b.cyl(pinkM, 0.08, 0.06, 0.3, -3.45, B + 1.95, -0.6, { rz: -0.8 }); for (const [x, z] of [[-2.6, -1.1], [-2.6, -0.1], [-4.8, -0.2]]) { b.cyl(tea, 0.22, 0.16, 0.2, x, B + 1.75, z); b.cyl(pinkM, 0.34, 0.34, 0.04, x, B + 1.66, z, { seg: 20 }); }
  // toy chest, open, toys spilling
  const chestM = O(surf('plank', '#e8a0b8'));
  b.box(chestM, 3.6, 2.0, 2.2, 6.8, B + 1.0, -5.6, { r: 0.12 }); b.box(chestM, 3.6, 0.3, 2.2, 6.8, B + 2.6, -6.8, { rx: -1.2, r: 0.1 });
  const toy = (c) => O(paint(c, { roughness: 0.45 }));
  b.cyl(toy('#ff5a5a'), 0.5, 0.5, 0.5, 6.0, B + 2.1, -5.4); b.box(toy('#5ab0ff'), 0.8, 0.8, 0.8, 7.4, B + 2.2, -5.5, { r: 0.1, ry: 0.4 });
  const r = rng(41);
  for (let i = 0; i < 9; i++) { const x = 3 + r() * 4, z = -2.5 + r() * 3.5; b.box(toy(['#ff6f8a', '#ffd24a', '#5ab0ff', '#7ad07a', '#c890ff'][i % 5]), 0.8, 0.8, 0.8, x, B + 0.4 + (i === 8 ? 0.8 : 0), z, { r: 0.08, ry: r() * 2 }); }
  // the teddy bear on the sofa arm
  const bear = O(paint('#c48a5a', { roughness: 0.95 })), bearL = O(paint('#ecc8a0', { roughness: 0.95 }));
  const tb = (gx, gy, gz) => { b.add(bear, new THREE.SphereGeometry(0.75, 16, 12), gx, gy, gz); b.add(bear, new THREE.SphereGeometry(0.55, 16, 12), gx, gy + 1.0, gz); for (const s of [-1, 1]) { b.add(bear, new THREE.SphereGeometry(0.22, 10, 8), gx + s * 0.4, gy + 1.45, gz); b.add(bear, new THREE.SphereGeometry(0.28, 10, 8), gx + s * 0.6, gy - 0.4, gz + 0.3); b.add(bear, new THREE.SphereGeometry(0.24, 10, 8), gx + s * 0.75, gy + 0.2, gz + 0.1); } b.add(bearL, new THREE.SphereGeometry(0.22, 10, 8), gx, gy + 0.9, gz + 0.45); b.add(bearL, new THREE.SphereGeometry(0.42, 12, 10), gx, gy, gz + 0.45); };
  tb(-7.2, B + 2.3, -5.4);
  // dollhouse on a low table, rocking horse, bookcase
  b.box(O(paint('#ffffff')), 3.4, 1.6, 2.2, -8.4, B + 0.8, 2.6, { r: 0.08 });
  b.box(O(surf('siding', '#bfe0f7')), 2.6, 2.0, 1.6, -8.4, B + 2.6, 2.6, { r: 0.05 }); b.add(O(paint('#ff8fb8')), new THREE.ConeGeometry(1.9, 1.2, 4), -8.4, B + 4.2, 2.6, Math.PI / 4);
  b.box(O(paint('#ffd27a')), 0.5, 0.9, 0.05, -8.4, B + 2.1, 3.42, { r: 0.02 });
  const horse = O(paint('#f4f0e8', { roughness: 0.5 })), rocker = O(paint('#c86a5a', { roughness: 0.5 }));
  b.box(horse, 2.4, 1.0, 0.9, 5.6, B + 2.2, 3.6, { r: 0.4 }); b.box(horse, 0.8, 1.4, 0.7, 6.7, B + 3.0, 3.6, { r: 0.3, rz: -0.3 }); b.box(horse, 1.0, 0.6, 0.6, 7.2, B + 3.5, 3.6, { r: 0.25 });
  for (const x of [4.8, 6.4]) for (const s of [-1, 1]) b.box(horse, 0.25, 1.2, 0.25, x, B + 1.4, 3.6 + s * 0.3, { r: 0.08, rz: x < 5.5 ? 0.2 : -0.2 });
  b.add(rocker, new THREE.TorusGeometry(2.4, 0.12, 6, 24, 1.3), 5.6, B + 2.6, 3.3, 0, 0, -Math.PI / 2 - 0.65); b.add(rocker, new THREE.TorusGeometry(2.4, 0.12, 6, 24, 1.3), 5.6, B + 2.6, 3.9, 0, 0, -Math.PI / 2 - 0.65);
  b.box(O(surf('plank', '#b8865a')), 0.9, 7, 4.4, -Wd / 2 + 1.05, B + 3.5, -3.8 + 7.3, { r: 0.06 });
  for (let y = 0.8; y < 7; y += 1.6) { b.box(O(surf('plank', '#a07448')), 1.0, 0.16, 4.4, -Wd / 2 + 1.1, B + y, 3.5, { r: 0.03 }); for (let i = 0; i < 7; i++) b.box(toy(['#d9536f', '#4a7fc0', '#f2c94c', '#7ad07a', '#c890ff', '#ff9e5a'][(i + Math.round(y)) % 6]), 0.7, 1.0 + r() * 0.3, 0.42, -Wd / 2 + 1.15, B + y + 0.62, 1.7 + i * 0.55, { r: 0.04 }); }
  // the fireplace on the right wall with photos on its mantel
  const fstone = O(surf('brick', '#d8b8a8'));
  b.box(fstone, 1.2, 5.2, 5.6, Wd / 2 - 1.1, B + 2.6, 0, { r: 0.08 }); b.box(O(paint('#2a1c18')), 0.4, 2.4, 2.8, Wd / 2 - 1.55, B + 1.3, 0, { r: 0.05 });
  b.box(O(surf('plank', '#fffaf2')), 1.9, 0.35, 6.4, Wd / 2 - 1.3, B + 5.35, 0, { r: 0.06 });
  // a floor lamp and a side table
  b.cyl(O(paint('#3a3030', { metalness: 0.6 })), 0.08, 0.08, 6.6, 8.6, B + 3.3, 5.4); b.cyl(O(paint('#3a3030', { metalness: 0.6 })), 0.7, 0.7, 0.12, 8.6, B + 0.06, 5.4, { seg: 20 });
  W.shadeM = O(new THREE.MeshStandardMaterial({ color: '#ffe2b0', emissive: '#ffb860', emissiveIntensity: 1.4, roughness: 0.8, side: THREE.DoubleSide }));
  b.cyl(W.shadeM, 0.7, 1.2, 1.4, 8.6, B + 6.8, 5.4, { seg: 24 });
  b.done(g);
  // the photographs: three on the back wall, two on the mantel, one on the wall by the door
  const face = altiCanvas('happy');
  W.photos = [];
  for (const [kind, x, y, z, ry, w, fr] of [['dragon', -1.8, 6.0, -Dd / 2 + 0.68, 0, 2.6, '#d9b24a'], ['house', 1.8, 6.4, -Dd / 2 + 0.68, 0, 2.2, '#b8864a'], ['swing', -3.0, 1.7, 0.3, 0, 1.2, '#ffffff'],
    ['cake', Wd / 2 - 1.55, B + 6.5, -1.6, -Math.PI / 2, 1.3, '#ff9ec4'], ['shop', Wd / 2 - 1.55, B + 6.4, 1.6, -Math.PI / 2, 1.2, '#d9b24a'], ['swing', 3.6, 6.2, -Dd / 2 + 0.68, 0, 1.8, '#ffffff']]) {
    const p = framedPhoto(kind, face, { w, frame: fr }); p.position.set(x, kind === 'swing' && w < 1.3 ? B + 1.95 : y, z); p.rotation.y = ry; if (kind === 'swing' && w < 1.3) { p.position.set(-2.4, B + 2.3, -0.9); p.rotation.x = -0.2; }
    g.add(p); W.photos.push(p);
  }
  // the glow outside the door (her light), the moonlit windows
  W.doorGlow = glowSprite('#ffd27a', 14, 0); W.doorGlow.position.set(0, B + 3.4, Dd / 2 + 1.4); W.doorGlow.userData.noAO = true; g.add(W.doorGlow);
  W.inside.userData.mats = W.inMats;
}

// ---- the pet shop ----
function shop() {
  const g = new THREE.Group(); g.position.copy(SX); ctx.scene.add(g); W.shop = g;
  const b = new Batch(), WX = 22, Z0 = -14, Z1 = 16, H = 14;
  const tile = surf('tile', '#ffe8ef', { roughness: 0.25 }); tile.userData.span = 6;
  b.box(tile, WX * 2, 0.4, Z1 - Z0, 0, -0.2, (Z0 + Z1) / 2, { r: 0.02 });
  b.box(paint('#fff6fa', { roughness: 0.9 }), WX * 2, 0.4, Z1 - Z0, 0, H + 0.2, (Z0 + Z1) / 2, { r: 0.02 });
  const mint = wallpaper('#d8f4ea', '#bfe8d8', { flower: '#ffffff' }), pinkW = paint('#ffd0e0', { roughness: 0.6 }), trim = paint('#ffffff', { roughness: 0.4 }), wood = surf('plank', '#e8c8a0');
  b.box(mint, WX * 2, H, 0.6, 0, H / 2, Z0 - 0.3, { r: 0.01 });
  for (const s of [-1, 1]) b.box(mint, 0.6, H, Z1 - Z0, s * (WX + 0.3), H / 2, (Z0 + Z1) / 2, { r: 0.01 });
  b.box(pinkW, WX * 2, 3.6, 0.3, 0, 1.8, Z0 + 0.15, { r: 0.02 }); for (const s of [-1, 1]) b.box(pinkW, 0.3, 3.6, Z1 - Z0, s * (WX - 0.15), 1.8, (Z0 + Z1) / 2, { r: 0.02 });
  b.box(trim, WX * 2, 0.3, 0.4, 0, 3.7, Z0 + 0.3, { r: 0.04 });
  // egg shelves on the back wall: three tiers, eggs on little cushions
  const eggCols = ['#7ad0ff', '#ff8fb8', '#b9f28a', '#c8a8ff', '#ffd24a', '#ffb07a', '#8affd8'], r = rng(11);
  for (const sx of [-12, 12]) for (let tier = 0; tier < 3; tier++) {
    const y = 4.8 + tier * 3;
    b.box(wood, 14, 0.35, 2.4, sx, y, Z0 + 1.4, { r: 0.06 }); b.box(trim, 14.2, 0.2, 0.2, sx, y + 0.1, Z0 + 2.6, { r: 0.04 });
    for (let i = 0; i < 6; i++) { const ex = sx - 5.6 + i * 2.25; b.cyl(paint('#ffffff', { roughness: 0.9 }), 0.6, 0.7, 0.3, ex, y + 0.32, Z0 + 1.4, { seg: 16 });
      const eg = new THREE.SphereGeometry(0.55, 16, 12); eg.scale(1, 1.32, 1); b.add(paint(eggCols[(i + tier * 2 + (sx > 0 ? 3 : 0)) % eggCols.length], { roughness: 0.3, metalness: 0.15 }), eg, ex, y + 1.1, Z0 + 1.4);
      for (let k = 0; k < 3; k++) b.add(paint('#ffffff', { roughness: 0.3 }), new THREE.SphereGeometry(0.13, 8, 6), ex + (r() - 0.5) * 0.6, y + 0.9 + r() * 0.6, Z0 + 1.88); }
  }
  // the counter with a register, a bell, a paw sign
  b.box(paint('#ff9ec4', { roughness: 0.5 }), 12, 3.8, 3, 13, 1.9, 8, { r: 0.15 }); b.box(trim, 12.6, 0.35, 3.6, 13, 3.95, 8, { r: 0.1 });
  b.box(paint('#2e2e3a', { roughness: 0.4 }), 2, 1.4, 1.6, 15, 4.8, 8, { r: 0.12 }); b.box(paint('#9ad8ff', { roughness: 0.2 }), 1.6, 0.9, 0.1, 15, 5.3, 8.8, { r: 0.05 });
  b.cyl(paint('#d9b24a', { metalness: 0.9, roughness: 0.25 }), 0.5, 0.6, 0.4, 10.5, 4.3, 8.6, { seg: 16 });
  // pet beds and bowls, balls and a cat tree on the left
  for (const [x, z, c] of [[-14, 6, '#7ad0ff'], [-9, 9, '#ffd24a'], [-15, 11, '#c8a8ff']]) { b.cyl(paint(c, { roughness: 0.9 }), 1.8, 1.9, 0.9, x, 0.45, z, { seg: 28 }); b.cyl(paint('#ffffff', { roughness: 0.95 }), 1.4, 1.4, 0.4, x, 0.75, z, { seg: 28 }); }
  for (const [x, z, c] of [[-11, 4, '#ff5a5a'], [-7, 6.4, '#5ab0ff'], [-12.5, 13, '#7ad07a']]) b.add(paint(c, { roughness: 0.4 }), new THREE.SphereGeometry(0.45, 16, 12), x, 0.45, z);
  b.cyl(paint('#d8c0a8', { roughness: 0.95 }), 0.5, 0.5, 9, -18, 4.5, 2); for (const [y, s] of [[3, 2.6], [6, 2.0], [9, 1.6]]) b.cyl(paint('#ff9ec4', { roughness: 0.9 }), s, s, 0.5, -18, y, 2, { seg: 24 });
  // the golden egg's display: a round plinth with a velvet cushion, gold posts and rope
  b.cyl(paint('#ffffff', { roughness: 0.3, metalness: 0.1 }), 2.2, 2.5, 3, 0, 1.5, 0, { seg: 40 }); b.cyl(paint('#d9b24a', { metalness: 0.9, roughness: 0.25 }), 2.35, 2.35, 0.2, 0, 3.05, 0, { seg: 40 });
  b.cyl(paint('#c83a6a', { roughness: 0.85 }), 1.3, 1.5, 0.6, 0, 3.4, 0, { seg: 32 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5; b.cyl(paint('#d9b24a', { metalness: 0.9, roughness: 0.25 }), 0.12, 0.16, 3.2, Math.cos(a) * 4.4, 1.6, Math.sin(a) * 4.4); b.add(paint('#d9b24a', { metalness: 0.9, roughness: 0.25 }), new THREE.SphereGeometry(0.22, 12, 8), Math.cos(a) * 4.4, 3.3, Math.sin(a) * 4.4); }
  for (let i = 0; i < 6; i++) { if (i === 1) continue; const a = i / 6 * Math.PI * 2 + 0.5, a2 = (i + 1) / 6 * Math.PI * 2 + 0.5; const p = v3(Math.cos(a) * 4.4, 2.9, Math.sin(a) * 4.4), q2 = v3(Math.cos(a2) * 4.4, 2.9, Math.sin(a2) * 4.4); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, p.distanceTo(q2), 6), paint('#c83a6a')); m.position.copy(p).lerp(q2, 0.5); m.position.y -= 0.25; m.quaternion.setFromUnitVectors(v3(0, 1, 0), q2.clone().sub(p).normalize()); m.castShadow = true; g.add(m); }
  // the shop window on the front wall side (+x): daylight
  b.box(trim, 0.4, 9, 16, WX - 0.1, 7, 2, { r: 0.05 });
  b.done(g);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(15, 8.4), new THREE.MeshBasicMaterial({ map: canvasTex(512, 288, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#bfe6ff'); gr.addColorStop(0.7, '#fff2e0'); gr.addColorStop(1, '#a8e08a'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,190,220,0.8)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(40 + i * 90, 200, 50, 0, 7); x.fill(); } }), color: new THREE.Color(1.6, 1.6, 1.6) }));
  win.position.set(WX - 0.32, 7, 2); win.rotation.y = -Math.PI / 2; win.userData.noAO = true; g.add(win);
  // the sign: PET SHOP with paws
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(16, 3.6), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 230, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#ff6fa8'; x.beginPath(); x.roundRect(10, 10, w - 20, h - 20, 60); x.fill(); x.strokeStyle = '#ffffff'; x.lineWidth = 12; x.stroke();
    x.font = '900 140px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffffff'; x.fillText('PET SHOP', w / 2, h / 2 + 8);
    for (const px of [90, w - 90]) { x.fillStyle = '#fff2a8'; x.beginPath(); x.ellipse(px, 128, 30, 26, 0, 0, 7); x.fill(); for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(px - 33 + i * 22, 82 - (i === 1 || i === 2 ? 12 : 0), 11, 0, 7); x.fill(); } } }), transparent: true, color: new THREE.Color(1.3, 1.3, 1.3) }));
  sg.position.set(0, 11.4, Z0 + 0.05); sg.userData.noAO = true; g.add(sg);
  // pendant lamps, plants
  W.shopLampM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2d6').multiplyScalar(2.6) });
  for (const x of [-12, 0, 12]) for (const z of [-4, 8]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 6), paint('#555')); c.position.set(x, H - 1.5, z); g.add(c); const sh = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.9, 24, 1, true), paint('#ffffff', { side: THREE.DoubleSide })); sh.position.set(x, H - 3.2, z); g.add(sh); const bl = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), W.shopLampM); bl.position.set(x, H - 3.5, z); bl.userData.noAO = true; g.add(bl); }
  for (const [x, z, sd] of [[-19, -11, 3], [19, -11, 5], [19, 14, 8]]) { const p = plant({ seed: sd, size: 1.1 }); p.position.set(x, 0, z); g.add(p); }
  // the golden egg and two shoppers
  W.egg = goldenEgg(); W.egg.position.set(0, 3.7, 0); g.add(W.egg);
  W.shoppers = crowd({ count: 3, w: 10, d: 4, look: v3(0, 0, -20), cheer: 0, seed: 31, scale: 1.0 }); W.shoppers.position.copy(SP(-11, 0, 9)); ctx.scene.add(W.shoppers);
}

// ---- people and the pet ----
function people() {
  const sc = ctx.scene;
  W.lily = makeCharacter({ avatar: 'farm_lily_pink', alti: true, skin: '#f2c79a', caustic: false }); sc.add(W.lily.root);
  W.girl = makeCharacter({ avatar: 'farm_memory_girl', alti: true, skin: '#f1c9a0', caustic: false, scale: 0.84 }); sc.add(W.girl.root);
  W.girl.setFace('happy'); W.girlV = vanisher(W.girl, '#ffd36a');   // the vanisher clones the face material: set her face first (it stays)
  W.drag = goldenDragon(); sc.add(W.drag.g);
  W.key = goldenKey({ size: 1.5 }); sc.add(W.key);
  W.dragGlit = sparkles(sc, { parent: W.drag.g, centre: v3(0, 1.4, 0), size: 2.6, height: 2.6, count: 40, color: '#ffe08a', pointSize: 0.12 });
  W.girlGlow = glowSprite('#ffd36a', 9, 0); W.girlGlow.userData.noAO = true; sc.add(W.girlGlow);
}

// ---- lights ----
function rig() {
  W.pl = []; for (let i = 0; i < 9; i++) { const l = new THREE.PointLight('#ffffff', 0, 40, 1.6); ctx.scene.add(l); W.pl.push(l); }
  const s = new THREE.SpotLight('#ffffff', 0, 90, 0.5, 0.5, 1.2); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0008; s.shadow.normalBias = 0.04; ctx.scene.add(s); ctx.scene.add(s.target); W.key3 = s;
}
function lightSet(set, t, focus, night) {
  const pl = W.pl; pl.forEach((l) => { l.intensity = 0; }); W.key3.intensity = 0;
  if (set === 'shop') {
    const o = SX;
    pl[0].position.set(o.x - 12, 10, o.z + 2); pl[0].color.set('#fff0e0'); pl[0].intensity = 70; pl[0].distance = 34;
    pl[1].position.set(o.x + 12, 10, o.z + 2); pl[1].color.set('#fff0e0'); pl[1].intensity = 70; pl[1].distance = 34;
    pl[2].position.set(o.x + 16, 7, o.z + 2); pl[2].color.set('#fff6ea'); pl[2].intensity = 80; pl[2].distance = 30;      // the window
    pl[3].position.set(o.x, 6.5, o.z); pl[3].color.set('#ffd27a'); pl[3].intensity = 70 * (1 + smooth(EV.crack, EV.hatch, t) * 2 * (1 - smooth(EV.hatch + 0.3, EV.hatch + 1.8, t))); pl[3].distance = 14;   // the egg
    pl[4].position.set(focus.x - 3, focus.y + 4, focus.z - 6); pl[4].color.set('#ffd6e8'); pl[4].intensity = 50; pl[4].distance = 16;   // a rim
    W.key3.position.set(o.x + 10, 13, o.z + 14); W.key3.target.position.copy(focus); W.key3.color.set('#fff4ea'); W.key3.intensity = 360; W.key3.angle = 0.42; W.key3.distance = 60;
  } else if (set === 'room') {
    const o = PL(0, 0, 0), op = 1 - smooth(EV.fade, EV.fade + 1.4, t);
    pl[0].position.copy(PL(8.6, 7.4, 5.4)); pl[0].color.set('#ffc27a'); pl[0].intensity = 110 * op; pl[0].distance = 26;     // the floor lamp
    pl[1].position.copy(PL(9.4, 2.4, 0)); pl[1].color.set('#ff9a50'); pl[1].intensity = 0; pl[1].distance = 14;
    pl[2].position.copy(PL(-6, 8, 0)); pl[2].color.set('#ffe6cc'); pl[2].intensity = 70 * op; pl[2].distance = 30;            // ceiling
    pl[3].position.copy(PL(0, 4.6, 10)); pl[3].color.set('#ffcf6a'); pl[3].intensity = (60 + 260 * smooth(EV.girl - 0.6, EV.girl, t) * (1 - smooth(EV.fade - 0.2, EV.fade + 0.6, t))) * 1; pl[3].distance = 24;   // her light at the door
    pl[4].position.copy(PL(-9, 7, -9)); pl[4].color.set('#9fb4ff'); pl[4].intensity = 40 * op; pl[4].distance = 22;          // moon through the back window
    pl[5].position.set(focus.x + 2, focus.y + 3, focus.z + 4); pl[5].color.set('#ffe0c0'); pl[5].intensity = 34; pl[5].distance = 12;   // a soft fill on faces
    W.key3.position.copy(PL(-6, 9.6, 7)); W.key3.target.position.copy(focus); W.key3.color.set('#ffe2c0'); W.key3.intensity = 260 * op; W.key3.angle = 0.5; W.key3.distance = 40;
    void o;
  } else {
    // outdoors: the sun does the key; at night the street lamps near the camera, the porch lamps, the magic
    const lamps = W.lampPos.filter((p) => Math.abs(p.x - focus.x) < 60 && Math.abs(p.z - focus.z) < 40).slice(0, 3);
    lamps.forEach((p, i) => { pl[i].position.copy(p); pl[i].color.set('#ffcf8a'); pl[i].intensity = 160 * night; pl[i].distance = 30; });
    const mg = W.magic || 0;
    pl[3].position.copy(PL(0, 7, 2)); pl[3].color.set('#ffcf6a'); pl[3].intensity = 300 * mg; pl[3].distance = 40;
    pl[4].position.set(focus.x + 1.5, focus.y + 2.5, focus.z + 3); pl[4].color.set('#ffe0b8'); pl[4].intensity = 26 * night; pl[4].distance = 10;   // a face fill
    if (W.hugLight) { pl[5].position.set(focus.x + 2, focus.y + 3.5, focus.z + 4); pl[5].color.set('#ffc860'); pl[5].intensity = 30 * W.hugLight; pl[5].distance = 14; }
    if (night > 0.35) { W.key3.position.set(focus.x - 10, 22, focus.z + 14); W.key3.target.position.copy(focus); W.key3.color.set('#c8d4ff'); W.key3.intensity = 340 * night; W.key3.angle = 0.35; W.key3.distance = 80; }
  }
}

// ---- HUD ----
const F = (px, w = 900) => `${w} ${px}px ITTInter, sans-serif`;
function hudInit() { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; c.style.cssText = 'position:absolute;inset:0;pointer-events:none;'; ctx.grade.after(c); W.hud = c; W.h2 = c.getContext('2d'); }
const pop = (k) => { const c = clamp(k); return c <= 0 ? 0 : 1 + 2.2 * Math.pow(c - 1, 3) + 1.2 * Math.pow(c - 1, 2); };
function rr(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
function card(x, cx, cy, w, h, k, draw) {
  if (k <= 0) return; x.save(); x.translate(cx, cy); x.scale(k, k);
  x.shadowColor = 'rgba(0,0,0,0.35)'; x.shadowBlur = 30; x.fillStyle = 'rgba(255,255,255,0.97)'; rr(x, -w / 2, -h / 2, w, h, 34); x.fill(); x.shadowBlur = 0;
  draw(x, w, h); x.restore();
}
function drawHud(t, n) {
  const x = W.h2; x.clearRect(0, 0, 1080, 1920); if (ctx.thumbMode) return;
  const e = EV, s = (i) => L(i).start;
  x.textBaseline = 'middle';
  if (n === 'adopt') {   // an adoption card: NEW PET
    const k = pop((t - e.toast) / 0.28);
    card(x, 540, 360, 760, 230, k, (c, w, h) => {
      const g = c.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#ffb63a'); g.addColorStop(1, '#ff6fa8'); c.fillStyle = g; rr(c, -w / 2, -h / 2, w, 70, 34); c.fill(); c.fillRect(-w / 2, -h / 2 + 40, w, 30);
      c.fillStyle = '#ffffff'; c.font = F(42); c.textAlign = 'center'; c.fillText('NEW PET!', 0, -h / 2 + 37);
      c.fillStyle = '#3a2a3a'; c.font = F(54); c.fillText('Golden Dragon', 40, 18); c.font = F(32); c.fillStyle = '#e09a1a'; c.fillText('★ LEGENDARY', 40, 74);
      c.fillStyle = '#ffd36a'; c.beginPath(); c.arc(-270, 40, 52, 0, 7); c.fill(); c.font = F(56); c.fillStyle = '#ffffff'; c.fillText('🐉', -270, 44);
    });
  }
  if (n === 'wait') {    // a clock pill: the evening passing
    const k = clamp((t - s(4) + 0.3) / (L(4).end - s(4) + 0.5)), mins = Math.round(lerp(19 * 60, 24 * 60, easeInOut(k)) / 5) * 5, hh = Math.floor(mins / 60) % 24, mm = mins % 60;
    const h12 = hh % 12 === 0 ? 12 : hh % 12, txt = `${h12}:${String(mm).padStart(2, '0')} ${hh >= 12 && hh < 24 ? 'PM' : 'AM'}`;
    x.fillStyle = 'rgba(20,18,40,0.82)'; rr(x, 340, 250, 400, 96, 48); x.fill(); x.strokeStyle = '#ffd36a'; x.lineWidth = 5; x.stroke();
    x.fillStyle = '#ffd36a'; x.font = F(40); x.textAlign = 'left'; x.fillText(hh >= 21 || hh < 5 ? '☾' : '☀', 378, 300); x.fillStyle = '#ffffff'; x.font = F(54); x.textAlign = 'center'; x.fillText(txt, 572, 300);
  }
  if (n === 'notify') {  // the friend request, then accepted
    const k = pop((t - e.notif) / 0.3), acc = t >= e.accept;
    card(x, 540, 330, 860, 330, k, (c, w, h) => {
      c.textAlign = 'left'; c.fillStyle = '#7a7f96'; c.font = F(30); c.fillText('FRIEND REQUEST', -w / 2 + 210, -h / 2 + 62);
      c.fillStyle = '#d6d9e2'; rr(c, -w / 2 + 40, -h / 2 + 40, 140, 140, 70); c.fill(); c.fillStyle = '#a8adbb'; c.beginPath(); c.arc(-w / 2 + 110, -h / 2 + 95, 30, 0, 7); c.fill(); c.fillRect(-w / 2 + 70, -h / 2 + 130, 80, 40);
      c.fillStyle = '#ffffff'; c.font = F(52); c.textAlign = 'center'; c.fillText('?', -w / 2 + 110, -h / 2 + 98);
      c.textAlign = 'left'; c.fillStyle = '#20232e'; c.font = F(46); c.fillText('FROM UNKNOWN PLAYER', -w / 2 + 210, -h / 2 + 122);
      if (!acc) {
        c.fillStyle = '#20b45a'; rr(c, -w / 2 + 210, h / 2 - 110, 280, 80, 22); c.fill(); c.fillStyle = '#ffffff'; c.font = F(38); c.textAlign = 'center'; c.fillText('Accept', -w / 2 + 350, h / 2 - 70);
        c.fillStyle = '#e4e6ec'; rr(c, -w / 2 + 510, h / 2 - 110, 280, 80, 22); c.fill(); c.fillStyle = '#5a5f70'; c.fillText('Decline', -w / 2 + 650, h / 2 - 70);
        // a finger moves to Accept and taps
        const m = smooth(e.notif + 0.5, e.accept - 0.05, t), fx = lerp(120, -w / 2 + 360, m), fy = lerp(240, h / 2 - 60, m), pr = t > e.accept - 0.18 ? 0.86 : 1;
        if (t > e.notif + 0.4) { c.save(); c.translate(fx, fy); c.scale(pr, pr); c.fillStyle = 'rgba(255,255,255,0.95)'; c.strokeStyle = '#20232e'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 30, 0, 7); c.fill(); c.stroke(); c.restore(); }
      } else {
        const q = smooth(e.accept, e.accept + 0.25, t);
        c.globalAlpha = q; c.fillStyle = '#20b45a'; rr(c, -w / 2 + 210, h / 2 - 110, 580, 80, 22); c.fill(); c.fillStyle = '#ffffff'; c.font = F(38); c.textAlign = 'center'; c.fillText('✓  Friends', -w / 2 + 500, h / 2 - 70); c.globalAlpha = 1;
      }
    });
  }
  if (n === 'message') { // a chat message, typed out
    const k = pop((t - e.msg) / 0.3), full = 'THANK YOU FOR REMEMBERING ME.', nch = Math.floor(clamp((t - s(22) + 0.1) / Math.max(0.6, L(22).end - s(22) - 0.1)) * full.length);
    card(x, 540, 300, 880, 270, k, (c, w, h) => {
      c.fillStyle = '#d6d9e2'; rr(c, -w / 2 + 36, -h / 2 + 36, 96, 96, 48); c.fill(); c.fillStyle = '#ffffff'; c.font = F(44); c.textAlign = 'center'; c.fillText('?', -w / 2 + 84, -h / 2 + 86);
      c.textAlign = 'left'; c.fillStyle = '#7a7f96'; c.font = F(30); c.fillText('UNKNOWN PLAYER', -w / 2 + 156, -h / 2 + 66);
      c.fillStyle = '#e9f3ff'; rr(c, -w / 2 + 150, -h / 2 + 100, w - 190, 120, 26); c.fill();
      c.fillStyle = '#20232e'; c.font = F(36); const shown = t < s(22) - 0.1 ? '' : full.slice(0, nch);
      if (!shown) { for (let i = 0; i < 3; i++) { c.fillStyle = `rgba(32,35,46,${0.3 + 0.5 * (Math.sin(t * 9 - i) > 0)})`; c.beginPath(); c.arc(-w / 2 + 196 + i * 30, -h / 2 + 160, 9, 0, 7); c.fill(); } }
      else c.fillText(shown, -w / 2 + 178, -h / 2 + 162);
    });
  }
}

// ---- helpers ----
function faceOf(c, name, t, ph, o = {}) { c.setFace(name, { blink: o.blink !== false && blinkAt(t, ph) && !['shocked', 'surprised', 'gasp'].includes(name), viseme: o.viseme, gaze: o.gaze }); }
const flightPath = new THREE.CatmullRomCurve3([v3(LIL + 1.5, 6.5, HZ + 12.5), v3(LIL + 8, 14, HZ + 18), v3(LIL + 30, 26, -6), v3(LIL + 70, 30, 0), v3(LIL + 110, 28, -2)]);
const lateFlight = new THREE.CatmullRomCurve3([v3(PX - 40, 16, -4), v3(PX - 14, 10, -8), v3(PX + 1, 4, -15), v3(PX + 2.3, 0, -15.9)]);
function putDragon(p, yaw) { W.drag.g.position.copy(p); W.drag.g.rotation.set(0, yaw, 0); }
function yawTo(from, to) { return Math.atan2(to.x - from.x, to.z - from.z); }
// holding the dragon at the chest: arms forward under it
function holdPose(c, t, k = 1) { const [A, B] = c.arms; A.rotation.x = lerp(A.rotation.x, -1.15, k); B.rotation.x = lerp(B.rotation.x, -1.15, k); A.rotation.z = lerp(A.rotation.z, 0.32, k); B.rotation.z = lerp(B.rotation.z, -0.32, k); void t; }

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, S = [], add = (name, t0, f) => S.push({ name, t0: () => t0, f, t1: () => 0 });
  add('hatch', 0, (u) => ({ pos: SP(lerp(3.0, 2.2, u), lerp(5.8, 5.4, u), lerp(11.5, 10.0, easeOut(u))), look: SP(0, 4.6, 0), fov: 54 }));
  add('adopt', e.hatch + 0.55, (u) => ({ pos: SP(lerp(2.4, 1.6, u), 5.0, lerp(16.0, 15.0, u)), look: SP(0, 4.0, 5), fov: 60 }));
  add('home', s(1) - 0.1, (u) => ({ pos: v3(lerp(LIL + 6, LIL + 4.5, u), lerp(6.8, 6.4, u), lerp(-4, -6, u)), look: v3(LIL, 6.2, HZ + 10), fov: 60 }));
  add('refuse', s(2) - 0.1, (u) => ({ pos: v3(LIL - lerp(8.5, 7.5, u), 5.2, HZ + lerp(25, 23.5, u)), look: v3(LIL + 0.4, 4.0, HZ + 10.8), fov: 58 }));
  add('fly', s(3) - 0.15, (u, t) => { const k = clamp((t - e.flyoff) / (s(4) - 0.1 - e.flyoff)), p = flightPath.getPointAt(Math.min(1, easeInOut(k) * 0.98 + 0.01)); return { pos: p.clone().add(v3(-8 + 2 * u, 6 + 1.5 * u, 9 - 1.5 * u)), look: p.clone().add(v3(2, -2.5, -2)), fov: 60 }; });
  add('wait', s(4) - 0.1, (u) => ({ pos: PL(lerp(10.5, 9.6, u), 3.0, lerp(19.6, 19.1, u)), look: PL(1.8, 2.0, 16.8), fov: 62 }));
  add('follow', s(5) - 0.1, (u, t) => { const x = runX(t); return { pos: v3(x + 14, 4.6, -2.5), look: v3(x + 3.5, 5.6, -10.6), fov: 62 }; });
  add('land', s(6) - 0.1, (u) => ({ pos: PL(lerp(-1.5, -0.6, u), lerp(2.6, 2.2, u), lerp(25.8, 24.6, u)), look: PL(3.2, 1.8, 18.4), fov: 54 }));
  add('nohouse', s(7) - 0.1, (u) => ({ pos: lp3(PL(-9, 10, 35), PL(-6, 7, 31), easeInOut(u)), look: lp3(PL(-1, 3.2, 20), PL(0, 2.5, 10), easeInOut(u)), fov: 62 }));
  add('key', s(9) - 0.1, (u) => ({ pos: PL(lerp(-0.8, -0.3, u), lerp(2.6, 2.3, u), lerp(25.0, 24.4, u)), look: PL(1.9, 0.9, 19.4), fov: 50 }));
  add('pick', s(10) - 0.1, (u) => ({ pos: W.keyTo.clone().add(v3(lerp(-6.8, -6.0, u), lerp(3.4, 4.2, easeInOut(u)), lerp(6.6, 6.0, u))), look: W.keyTo.clone().add(v3(1.2, lerp(1.8, 3.2, easeInOut(u)), 0.4)), fov: 60 }));
  add('outline', s(11) - 0.1, (u) => ({ pos: lp3(PL(4, 17, 43), PL(3, 14, 39), easeOut(u)), look: PL(0, 4.5, 0), fov: 62 }));
  add('reveal', s(12) - 0.15, (u) => ({ pos: lp3(PL(6.5, 2.6, 31.5), PL(5.2, 2.8, 29.8), u), look: PL(0, lerp(7, 9.5, u), 0), fov: 68 }));
  add('inside', s(13) - 0.1, (u) => ({ pos: PL(lerp(6.5, 1.5, easeInOut(u)), lerp(6.4, 5.6, u), lerp(6.4, 5.2, u)), look: PL(lerp(-4, -1, easeInOut(u)), 3.0, -4), fov: 62 }));
  add('photos', s(14) - 0.1, (u) => ({ pos: PL(lerp(-2.5, 2.0, easeInOut(u)), 6.2, 0.5), look: PL(lerp(-1.6, 1.6, easeInOut(u)), 6.0, -8), fov: 52 }));
  add('erased', s(15) - 0.1, (u) => ({ pos: PL(-1.8, 6.1, lerp(-1.4, -2.6, easeOut(u))), look: PL(-1.8, 6.0, -8), fov: 46 }));
  add('notify', s(16) - 0.1, (u) => ({ pos: PL(lerp(-0.1, -0.5, u), 5.6, lerp(7.1, 6.6, u)), look: PL(-0.4, 4.9, 1.5), fov: 68 }));
  add('faces', s(19) - 0.1, (u) => ({ pos: PL(lerp(2.0, -2.0, easeInOut(u)), 6.2, 0.2), look: PL(lerp(1.4, -1.4, easeInOut(u)), 6.0, -8), fov: 56 }));
  add('jump', s(20) - 0.1, (u) => ({ pos: PL(lerp(6.2, 5.6, u), 4.8, 6.7), look: PL(0.2, 3.2, 2.0), fov: 64 }));
  add('message', s(21) - 0.1, (u) => ({ pos: PL(lerp(0.5, 0.2, u), 5.6, lerp(7.0, 6.6, u)), look: PL(-0.5, 4.9, 1.5), fov: 66 }));
  add('doorway', s(23) - 0.1, (u) => ({ pos: lp3(PL(-1.2, 4.7, -5.4), PL(-0.9, 4.5, -4.2), easeInOut(u)), look: PL(0, 3.8, 8.4), fov: 52 }));
  add('wave', s(24) - 0.15, (u) => ({ pos: PL(lerp(0.5, 0.3, u), 3.9, lerp(-2.2, -1.2, u)), look: PL(0, 3.1, 8.6), fov: 46 }));
  add('fade', s(25) - 0.1, (u) => ({ pos: lp3(PL(5.5, 7.5, 12.5), PL(7.5, 9.5, 16.5), easeOut(u)), look: PL(0, 3.4, 1.5), fov: 64 }));
  add('hug', e.hug, (u) => { const a = lerp(0.35, -0.2, easeInOut(u)), d = lerp(9.0, 10.5, u); return { pos: PL(Math.sin(a) * d, lerp(5.0, 5.6, u), 1.5 + Math.cos(a) * d), look: PL(0, 3.5, 1.5), fov: 60 }; });
  S.forEach((x, i) => { if (S[i + 1]) { const v = S[i + 1].t0(); x.t1 = () => v; } });
  S[S.length - 1].t1 = () => ctx.dur + 1;
  return S;
}
const runX = (t) => PX - 70 + (t - L(5).start + 0.1) * 13;

// ---- a frame ----
function renderAt(t) {
  const first = !ctx.sub || ctx.sub.i === 0, sh = shotAt(W.shots, t), n = sh.name, e = EV, s = (i) => L(i).start;
  const shopShots = ['hatch', 'adopt'], roomShots = ['inside', 'photos', 'erased', 'notify', 'faces', 'jump', 'message', 'doorway', 'wave'];
  const set = shopShots.includes(n) ? 'shop' : roomShots.includes(n) ? 'room' : 'out';
  // the sky's time: golden hour, dusk while she follows, night from the outline on; the waiting shot runs the evening forward
  let night = 0, pal;
  if (set === 'shop') pal = SHOP;
  else if (set === 'room') { pal = n === 'wave' || n === 'doorway' ? ROOM : ROOM; night = 1; }
  else if (n === 'wait') { const k = smooth(s(4) - 0.05, L(4).end + 0.35, t); pal = k < 0.5 ? mixP(GOLD, DUSK2, k * 2) : mixP(DUSK2, NIGHT23, (k - 0.5) * 2); night = smooth(0.3, 0.9, k); }
  else if (['home', 'refuse', 'fly'].includes(n)) pal = GOLD;
  else if (['follow', 'land', 'nohouse', 'key', 'pick'].includes(n)) { const k = smooth(s(5), s(11), t); pal = mixP(DUSK2, NIGHT23, k * 0.75); night = 0.35 + 0.5 * k; }
  else { pal = NIGHT23; night = 1; }
  applyEnv(ctx, pal);
  W.shop.visible = W.shoppers.visible = set === 'shop'; W.town.visible = set !== 'shop'; W.trees.groups.forEach((g2) => { g2.bark.visible = g2.leaves.visible = set !== 'shop'; });
  W.lampGlows.forEach((m) => m.color.set('#ffe2a8').multiplyScalar(lerp(0.5, 3.2, night)));
  W.houses.forEach(({ c }) => { c.lampM.emissiveIntensity = 2.2 * night; });
  WIN.emissiveIntensity = lerp(0.05, 1.5, night);
  const Ly = W.lily, Dg = W.drag, Gi = W.girl;
  [Ly, Gi].forEach((c) => { c.root.visible = false; c.root.rotation.set(0, 0, 0); c.root.position.set(0, -100, 0); });
  Dg.g.visible = true; Dg.g.scale.setScalar(1); W.key.visible = false; W.girlGlow.material.opacity = 0; W.hugLight = 0; W.magic = 0;
  let focus = v3(0, 4, 0);
  const talk = (i) => ({ viseme: undefined, i });   // Lily has no lines: no lip sync (the narrator speaks)
  void talk;

  // the forgotten house: outline, reveal, inside, fade
  const outK = smooth(e.outline, e.outline + 2.0, t), revK = smooth(e.reveal, s(13) - 0.15, t), fadeK = smooth(e.fade, e.fade + 1.6, t);
  const showHouse = t >= e.reveal && set === 'out' && fadeK < 1;
  W.fh.g.visible = showHouse && n !== 'fade'; W.revU.uLevel.value = revK; W.revU.uMode.value = 0;
  W.outline.visible = set === 'out' && t >= e.outline && t < e.reveal + 2.6;
  if (W.outline.visible) {
    const total = W.edges.length, fadeOut = 1 - smooth(e.reveal + 1.2, e.reveal + 2.4, t);
    W.edges.forEach((d) => { const k = clamp(outK * total * 0.55 - d.i * 0.55 * (total - 2) / total * 0.9); const m = d.m; m.visible = k > 0.001; if (!m.visible) return; const p = d.a.clone().lerp(d.b, k / 2); m.position.copy(p); m.scale.set(1, d.len * k, 1); });
    W.plotEdges.forEach((d) => { const m = d.m, k = clamp(outK * 1.6), len = d.a.distanceTo(d.b); m.position.copy(d.a.clone().lerp(d.b, k / 2)); m.scale.set(len * k, 1, 1); m.rotation.y = Math.atan2(-(d.b.z - d.a.z), d.b.x - d.a.x); });
    W.outlineM.opacity = fadeOut * (0.85 + 0.15 * Math.sin(t * 12));
  }
  W.inside.visible = set === 'room' || n === 'fade';
  W.revU2.uMode.value = 1; W.revU2.uLevel.value = 1 - fadeK; W.revU2.uH0.value = 0; W.revU2.uH1.value = 12;
  W.photos.forEach((p, i) => p.setFace(smooth(e.faces + i * 0.18, e.faces + i * 0.18 + 0.8, t)));
  W.doorGlow.material.opacity = 0.55 * smooth(e.girl - 0.6, e.girl, t) * (1 - fadeK);
  W.shadeM.emissiveIntensity = 1.4 * (1 - fadeK);

  // ---- the pet shop ----
  if (set === 'shop') {
    const egg = W.egg, crack = smooth(e.crack, e.hatch, t), op = smooth(e.hatch, e.hatch + 0.35, t);
    egg.visible = t < e.hatch + 1.2; egg.rotation.z = Math.sin(t * 40) * 0.06 * crack * (1 - op);
    egg.userData.top.position.set(op * 0.5, 0.9 + op * 1.6, 0); egg.userData.top.rotation.z = -op * 1.4; egg.userData.mat.emissiveIntensity = 0.12 + crack * 0.6;
    W.shoppers.update(t);
    if (n === 'hatch') {
      // the dragon pops out of the egg and hovers, wings open
      const up = smooth(e.hatch - 0.05, e.hatch + 0.5, t);
      if (t < e.hatch - 0.05) Dg.g.visible = false;
      putDragon(SP(0, 3.4 + up * 1.4, 0), 0.25);
      Dg.g.scale.setScalar(lerp(0.6, 1, up));
      Dg.pose({ t, mode: up > 0.6 ? 'hover' : 'sit', mood: up > 0.3 ? 'excited' : 'open', mouth: up > 0.2 && up < 0.95 ? 0.8 : 0, flap: up });
      focus = SP(0, 4.5, 0);
    } else {
      Dg.g.scale.setScalar(1);
      Ly.root.visible = true; Ly.root.position.copy(SP(0, 0, 5.0)); pose(Ly, 'idle', t); faceOf(Ly, 'happy', t, 0.3);
      holdPose(Ly, t); Ly.neck.rotation.x = 0.12;
      // in her arms, at her chest
      const k = smooth(e.hatch + 0.55, e.hatch + 1.0, t);
      putDragon(SP(0, (Ly.hipY ?? 2.2) - 0.15 + 0.04 * Math.sin(t * 3), 5.0 + 1.05), 0.15); Dg.g.scale.setScalar(0.7);
      Dg.pose({ t, mode: 'held', mood: t > e.toast ? 'happy' : 'excited', mouth: t > e.toast && t < e.toast + 0.6 ? 0.6 : 0 }); void k;
      focus = SP(0, 5, -2);
    }
  }

  // ---- the street and the plot ----
  if (set === 'out') {
    Dg.g.scale.setScalar(1);
    if (n === 'home') {
      // Lily walks up her path at golden hour, the dragon fluttering beside her
      const z = lerp(HZ + 20, HZ + 13.5, smooth(s(1) - 0.1, L(1).end + 0.4, t));
      Ly.root.visible = true; Ly.root.position.set(LIL - 0.6, 0, z); Ly.root.rotation.y = Math.PI; pose(Ly, z > HZ + 13.6 ? 'walk' : 'idle', t); faceOf(Ly, 'happy', t, 0.3);
      putDragon(v3(LIL + 2.2, 3.4, z + 0.8), Math.PI - 0.3); Dg.pose({ t, mode: 'hover', mood: 'open', headYaw: 0.4 });
      focus = v3(LIL, 4, z);
    }
    if (n === 'refuse') {
      // the door is open; Lily waves it in from the porch; it hovers on the steps and shakes its head
      W.lilyHouse.door.rotation.y = -1.3;
      Ly.root.visible = true; Ly.root.position.set(LIL - 1.2, 1.0, HZ + 9.4); Ly.root.rotation.y = 0.35; pose(Ly, 'idle', t);
      const bk = smooth(s(2) + 0.2, L(2).end + 0.3, t);
      Ly.arms[1].rotation.x = -1.2 + Math.sin(t * 7) * 0.25 * (1 - bk); Ly.arms[1].rotation.z = 0.5; faceOf(Ly, bk > 0.5 ? 'sad' : 'happy', t, 0.3);
      const shake = Math.sin(t * 11) * 0.5 * smooth(s(2), s(2) + 0.3, t);
      putDragon(v3(LIL + 1.6, 3.0, HZ + 13.2 + bk * 1.2), Math.PI + 0.1); Dg.pose({ t, mode: 'hover', mood: 'sad', headYaw: shake, flap: 1 });
      focus = v3(LIL, 4, HZ + 11);
    } else W.lilyHouse.door.rotation.y = 0;
    if (n === 'fly') {
      const k = clamp((t - e.flyoff) / (s(4) - 0.1 - e.flyoff)), u = Math.min(1, easeInOut(k) * 0.98 + 0.01), p = flightPath.getPointAt(u), tg = flightPath.getTangentAt(u);
      putDragon(p, Math.atan2(tg.x, tg.z)); Dg.pose({ t, mode: 'fly', mood: 'open' });
      Dg.g.rotation.x = -Math.asin(clamp(tg.y, -0.6, 0.6)) * 0.6;
      focus = p;
    }
    if (n === 'wait') {
      // on the empty plot, beside the old mailbox, until midnight
      putDragon(PL(2.3, 0, 18.1), Math.PI - 0.05); Dg.pose({ t, mode: 'sit', mood: smooth(s(4), L(4).end, t) > 0.6 ? 'sleepy' : 'open', headPitch: -0.15, gaze: [0, -0.5] });
      focus = PL(2, 2, 18);
    }
    if (n === 'follow') {
      const x = runX(t); Ly.root.visible = true; Ly.root.position.set(x, 0.36, -10.6); Ly.root.rotation.y = Math.PI / 2; pose(Ly, 'run', t); faceOf(Ly, 'surprised', t, 0.3); Ly.neck.rotation.x = -0.4;
      putDragon(v3(x + 6.5 + Math.sin(t * 1.3) * 0.5, 6.2 + Math.sin(t * 2) * 0.4, -10.4), Math.PI / 2); Dg.pose({ t, mode: 'fly', mood: 'open' });
      focus = v3(x, 4, -10.6);
    }
    if (n === 'land') {
      const k = smooth(s(6) - 0.1, e.land, t), p = lateFlight.getPointAt(Math.min(1, 0.55 + 0.45 * k));
      const sat = t >= e.land; putDragon(sat ? PL(2.3, 0, 18.1) : p, sat ? Math.PI - 0.05 : Math.PI - 0.6 * (1 - k));
      Dg.pose({ t, mode: sat ? 'sit' : 'hover', mood: 'open', flap: sat ? clamp(1 - (t - e.land) * 2) : 1, headYaw: sat ? -0.5 * smooth(e.land + 0.2, e.land + 0.6, t) : 0 });
      focus = PL(2.3, 1, 18);
    }
    if (['nohouse', 'key', 'pick', 'outline', 'reveal'].includes(n)) {
      // Lily on the lawn in front of the plot, the dragon beside the mailbox
      const lx = PL(-0.6, 0, 20.2);
      Ly.root.visible = true; Ly.root.position.copy(lx); Ly.root.rotation.y = Math.PI; pose(Ly, 'idle', t);
      if (n === 'nohouse') { const a = smooth(s(7), s(8), t); Ly.root.rotation.y = Math.PI + Math.sin(a * Math.PI * 2) * 0.5; faceOf(Ly, 'confused', t, 0.3); Ly.root.position.copy(lp3(PL(-1.5, 0.36, 26), lx, smooth(s(7) - 0.1, s(7) + 0.9, t))); if (t < s(7) + 0.9) pose(Ly, 'walk', t); }
      const dp = PL(2.3, 0, 18.1);
      putDragon(dp, Math.PI - 0.6); Dg.pose({ t, mode: 'sit', mood: 'open', headYaw: 0.4, gaze: [-0.5, 0] });
      if (n === 'key') {
        // in its mouth, then dropped into the grass in front of it
        Dg.pose({ t, mode: 'sit', mood: t > e.keydrop + 0.3 ? 'happy' : 'open', mouth: t > e.keydrop - 0.15 ? 0.9 : 0.2, headPitch: 0.25, headYaw: 0.3 });
        W.key.visible = true; W.key.userData.mat.emissiveIntensity = 0.7 + 0.5 * Math.max(0, Math.sin(t * 5));
        if (t < e.keydrop) { Dg.g.updateMatrixWorld(true); const m = Dg.mouthAt(); W.key.position.copy(m).add(W.keyTo.clone().sub(W.keyFrom).setY(0).setLength(0.45)).add(v3(0, -0.1, 0)); W.key.rotation.set(0, 0.6, Math.PI / 2); }
        else { const k = clamp((t - e.keydrop) / (e.keyland - e.keydrop)), m0 = W.keyFrom || (W.keyFrom = (() => { const save = t; void save; return null; })()); void m0;
          const from = W.keyFrom, to = W.keyTo, bounce = t > e.keyland ? Math.abs(Math.sin((t - e.keyland) * 10)) * 0.25 * Math.exp(-(t - e.keyland) * 6) : 0;
          W.key.position.copy(lp3(from, to, k * k)).add(v3(0, bounce, 0)); W.key.rotation.set(Math.PI / 2 - 0.1, 0.6, k * 2.4); }
        Ly.root.visible = false;   // she is off camera: the insert is the dragon and the key
        focus = PL(1.6, 1, 19);
      }
      if (n === 'pick' || n === 'outline' || n === 'reveal') {
        // she steps up, bends and picks it up, then holds it up to look at it
        const g0 = e.grab, bend = n === 'pick' ? smooth(s(10) - 0.1, g0, t) * (1 - smooth(g0 + 0.15, g0 + 0.75, t)) : 0, held = t >= g0;
        Ly.root.position.set(W.keyTo.x + 1.5, 0, W.keyTo.z + 0.5); Ly.root.rotation.y = n === 'pick' ? Math.atan2(-1.5, -0.5) : Math.PI - 0.15;   // faces the key, then the plot
        if (bend > 0) { Ly.torso.rotation.x = 0.95 * bend; Ly.hips.position.y = (Ly.hipY ?? 2.2) - 0.75 * bend; Ly.legs.forEach((l) => { l.rotation.x = -0.55 * bend; }); Ly.arms[1].rotation.x = -0.6 * bend; Ly.neck.rotation.x = 0.35 * bend; }
        if (held) {
          const up = smooth(g0 + 0.2, g0 + 0.8, t);
          if (n === 'pick' && up < 1) Ly.arms[1].rotation.x = lerp(-0.6 * bend, -1.5, up); else Ly.arms[1].rotation.x = -1.5;
          Ly.arms[1].rotation.z = 0.3;
          Ly.root.updateMatrixWorld(true); const hand = v3(0, -2.0, 0.15); Ly.arms[1].localToWorld(hand); W.key.visible = true; W.key.position.copy(hand); W.key.rotation.set(0.3, Ly.root.rotation.y, 0);
        } else { W.key.visible = true; W.key.position.copy(W.keyTo); W.key.rotation.set(Math.PI / 2 - 0.1, 0.6, 2.4); }
        faceOf(Ly, n === 'reveal' ? 'surprised' : held ? 'surprised' : 'neutral', t, 0.3); if (n !== 'pick') Ly.neck.rotation.x = -0.35;
        Dg.pose({ t, mode: 'sit', mood: n === 'reveal' ? 'excited' : 'happy', headPitch: -0.3, headYaw: 0.25 });
        W.key.userData.mat.emissiveIntensity = 0.25 + 1.6 * smooth(e.outline - 0.4, e.outline + 0.3, t) * (1 - smooth(e.reveal + 1.0, e.reveal + 2.0, t));
        focus = PL(0, 3, 20);
      }
      W.magic = smooth(e.outline, e.outline + 1, t) * 0.8;
    }
    if (n === 'fade' || n === 'hug') {
      // the room dissolves round them; then Lily on the grass hugs the dragon in a ring of golden light
      const c = PL(0, 0, 1.5);
      Ly.root.visible = true; Ly.root.position.copy(n === 'fade' ? PL(-0.6, 1.0 * (1 - fadeK), 1.5) : c); Ly.root.rotation.y = n === 'fade' ? 0.3 : 0.15; pose(Ly, 'idle', t);
      if (n === 'fade') { faceOf(Ly, 'surprised', t, 0.3); Ly.neck.rotation.x = -0.25; putDragon(PL(1.6, 1.0 * (1 - fadeK), 2.8), -0.6); Dg.pose({ t, mode: 'sit', mood: 'happy', headPitch: -0.4 }); }
      else {
        const k = smooth(e.hug, e.hug + 0.7, t);
        holdPose(Ly, t, k); Ly.arms[0].rotation.z = lerp(Ly.arms[0].rotation.z, 0.55, k); Ly.arms[1].rotation.z = lerp(Ly.arms[1].rotation.z, -0.55, k);
        faceOf(Ly, 'happy', t, 0.3); Ly.neck.rotation.x = 0.28; Ly.neck.rotation.z = 0.14;
        Ly.root.updateMatrixWorld(true);
        const chest = v3(0, (Ly.hipY ?? 2.2) - 0.15, 1.05).applyMatrix4(Ly.root.matrixWorld); Dg.g.scale.setScalar(lerp(1, 0.7, k));
        putDragon(lp3(PL(1.6, 0, 2.8), chest, k), lerp(-0.6, Ly.root.rotation.y + 0.15, k));   // held from behind, both faces to camera
        Dg.pose({ t, mode: k > 0.5 ? 'held' : 'sit', mood: 'happy', headPitch: -0.1, tilt: -0.25 * k });
        W.hugLight = smooth(e.hug, e.hug + 1.2, t);
      }
      W.magic = 0.5 + 0.5 * fadeK;
      focus = PL(0, 3.4, 1.5);
    }
    // golden light round the hug, the outline ring on the grass
    W.ring.visible = n === 'hug'; if (W.ring.visible) { const k = smooth(e.hug, e.hug + 1.2, t); W.ring.scale.setScalar(lerp(1.5, 5.2, k)); W.ring.material.opacity = 0.8 * k; W.ring.rotation.z = t * 0.3; }
  }

  // ---- inside the forgotten house ----
  if (set === 'room') {
    const ly = PL(-0.6, 1.0, 1.5);
    Ly.root.visible = true; Ly.root.position.copy(ly); Ly.root.rotation.y = Math.PI; pose(Ly, 'idle', t);
    let lf = 'surprised';
    if (n === 'inside') { const k = smooth(s(13) - 0.1, L(13).end, t); Ly.root.position.copy(lp3(PL(0, 1.0, 6.8), ly, k)); if (k < 1) pose(Ly, 'walk', t); Ly.root.rotation.y = Math.PI - 0.3; lf = 'surprised'; }
    if (n === 'photos' || n === 'erased') lf = 'sad';
    if (n === 'notify' || n === 'message') { Ly.root.rotation.y = 0.15; holdPose(Ly, t, 0.55); Ly.arms[0].rotation.x = -0.4; Ly.neck.rotation.x = 0.28; lf = n === 'message' ? (t > s(22) + 0.5 ? 'happy' : 'surprised') : t > e.accept ? 'happy' : t > e.notif ? 'surprised' : 'sad'; }
    if (n === 'faces') lf = 'happy';
    if (n === 'jump') { Ly.root.rotation.y = 0.9; lf = 'laugh'; }
    if (n === 'doorway' || n === 'wave') { Ly.root.position.copy(PL(-2.6, 1.0, 3.0)); Ly.root.rotation.y = 0.44; lf = n === 'wave' ? 'happy' : 'surprised'; }
    faceOf(Ly, lf, t, 0.3);
    // the dragon on the rug
    const dp = n === 'doorway' || n === 'wave' ? PL(1.9, 1.0, 4.4) : PL(1.6, 1.0, 2.8);
    if (n === 'jump') { const h = ((t - e.jump) / 0.55) % 1; putDragon(dp, -0.4 + Math.sin(t * 2) * 0.3); Dg.pose({ t, mode: 'hop', hop: t >= e.jump ? h : 0, mood: 'excited', mouth: 0.8 * Math.sin(Math.PI * h) }); W.dragGlit.visible = true; }
    else { putDragon(dp, n === 'doorway' || n === 'wave' ? 0.05 : -0.6); Dg.pose({ t, mode: 'sit', mood: n === 'photos' || n === 'erased' ? 'sad' : ['faces', 'doorway', 'wave', 'message'].includes(n) ? 'happy' : 'open', headPitch: n === 'doorway' || n === 'wave' ? -0.2 : 0 }); }
    // the girl in the doorway: there for a moment, then gone
    if (n === 'doorway' || n === 'wave') {
      const inK = smooth(e.girl - 0.5, e.girl + 0.2, t);
      Gi.root.visible = inK > 0; Gi.root.position.copy(PL(0, 1.0, 8.55)); Gi.root.rotation.y = Math.PI; pose(Gi, n === 'wave' && t > e.wave ? 'wave' : 'idle', t);
      if (n === 'wave') { Gi.arms[1].rotation.x = 0; Gi.arms[1].rotation.z = 2.6 + Math.sin(t * 9) * 0.35; Gi.neck.rotation.x = 0.05; }
      W.girlV.set(1 - inK);
      W.girlGlow.position.copy(PL(0, 4.0, 9.6)); W.girlGlow.material.opacity = 0.4 * inK;
    }
    focus = n === 'doorway' || n === 'wave' ? PL(0, 3.2, 8.4) : n === 'jump' ? PL(1.6, 2, 2.8) : PL(-0.6, 4.4, 1.5);
  }
  W.dragGlit.visible = (set === 'room' && n === 'jump') || n === 'hatch' || n === 'hug' || n === 'reveal';

  lightSet(set === 'out' ? 'out' : set, t, focus, night);
  // air
  W.air.update(t); const A = W.air.list;
  A.motes.visible = set === 'shop'; A.roomDust.visible = set === 'room'; A.petals.visible = set === 'out' && ['home', 'refuse', 'fly', 'follow', 'nohouse'].includes(n);
  A.flies.visible = set === 'out' && night > 0.5; A.pollen.visible = set === 'out' && night < 0.4; A.clouds.visible = set === 'out';
  A.hatchB.visible = A.hatchB.visible && set === 'shop'; A.keyB.visible = A.keyB.visible && n === 'key';
  A.houseG.visible = set === 'out' && (n === 'reveal' || n === 'outline'); A.fadeG.visible = n === 'fade' || n === 'hug'; A.hugG.visible = n === 'hug';
  W.trees && (leafT(t));
  // flashes and shake
  const fl = n === 'hatch' && t >= e.hatch - 0.02 && t < e.hatch + 0.2 ? 0.45 * (1 - (t - e.hatch + 0.02) / 0.22) : n === 'faces' && t >= e.faces && t < e.faces + 0.25 ? 0.18 * (1 - (t - e.faces) / 0.25) : 0;
  const shake = n === 'hatch' ? 0.25 * smooth(e.crack, e.hatch, t) * (1 - smooth(e.hatch, e.hatch + 0.3, t)) : 0;
  { const cq = new URLSearchParams(location.search).get('cam'); if (cq) { const q = cq.split(',').map(Number); sh.pos = v3(q[0], q[1], q[2]); sh.look = v3(q[3], q[4], q[5]); sh.fov = q[6]; } }
  frame(ctx, t, sh, { shake, shadowSpan: n === 'outline' || n === 'fly' ? 90 : 45, flash: fl, flashColor: '#fff2c8', steady: ['photos', 'faces', 'erased'].includes(n) });
  if (first) drawHud(t, n);
  return n;
}
let leafT = () => {};

export async function setup() {
  ctx = await initStage('ep23', { look: 'pro', avatars: ['farm_lily_pink', 'farm_memory_girl'] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'surprised', 'confused', 'laugh', 'shocked']);
  const { scene, camera } = ctx; camera.far = 3000; camera.near = 0.2; camera.updateProjectionMatrix();
  ctx.cap.style.webkitTextStroke = '22px #000'; ctx.cap.style.textShadow = '0 10px 0 rgba(0,0,0,0.6), 0 0 26px rgba(0,0,0,0.9), 0 0 54px rgba(0,0,0,0.6)';
  rig(); town(); forgotten(); shop(); people();
  W.ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd36a').multiplyScalar(2.4), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  W.ring.rotation.x = -Math.PI / 2; W.ring.position.copy(PL(0, 0.25, 1.5)); W.ring.userData.noAO = true; scene.add(W.ring);
  const { leafTime } = await import('../engine/forest.js'); leafT = (t) => leafTime(t, 0.06);
  const list = {
    motes: dust(scene, { size: 40, height: 12, centre: SX.clone().add(v3(0, 6, 2)), count: 260, color: '#fff2d8', amount: 0.32, pointSize: 0.42 }),
    roomDust: dust(scene, { size: 20, height: 9, centre: PL(0, 5.5, 0), count: 260, color: '#ffe6b8', amount: 0.36, pointSize: 0.38 }),
    petals: leaves(scene, { count: 320, size: 120, height: 30, centre: v3(60, 15, -8), colors: ['#ffb8d6', '#ffd2e6', '#ff9ec4', '#fff0f6'], speed: 0.8 }),
    flies: sparkles(scene, { centre: PL(0, 3, 14), size: 34, height: 6, count: 70, color: '#e8ff9a', pointSize: 0.12 }),
    pollen: dust(scene, { size: 120, height: 20, centre: v3(60, 8, -10), count: 500, color: '#fff0c0', amount: 0.4, pointSize: 0.5 }),
    clouds: clouds(scene, { count: 14, y: 190, spread: 1100, size: 30, color: '#ffe0e8', drift: 0.8 }),
    hatchB: burst(scene, { count: 220, color: '#ffd36a', dur: 1.8, spread: 1.2, height: 2, pointSize: 1.2, bright: 2.2, pos: SP(0, 4, 0) }),
    keyB: burst(scene, { count: 70, color: '#ffe08a', dur: 1.2, spread: 0.4, height: 0.6, pointSize: 0.6, bright: 2.4, pos: PL(1.2, 0.2, 19.6), seed: 4 }),
    houseG: sparkles(scene, { centre: PL(0, 7, 0), size: 26, height: 16, count: 260, color: '#ffe08a', pointSize: 0.3 }),
    fadeG: sparkles(scene, { centre: PL(0, 6, 0), size: 26, height: 14, count: 420, color: '#ffd36a', pointSize: 0.34 }),
    hugG: sparkles(scene, { centre: PL(0, 3, 1.5), size: 8, height: 7, count: 160, color: '#fff0b0', pointSize: 0.22 }),
  };
  list.hatchB.fire(EV.hatch); list.keyB.fire(EV.keyland);
  W.air = atmos(...Object.values(list)); W.air.list = list;
  // where the key leaves the mouth and lands: posed once, so every worker agrees
  putDragon(PL(2.3, 0, 18.1), Math.PI - 0.6); W.drag.pose({ t: EV.keydrop, mode: 'sit', mood: 'open', mouth: 0.9, headPitch: 0.25, headYaw: 0.3 }); W.drag.g.updateMatrixWorld(true);
  W.keyFrom = W.drag.mouthAt(); W.keyTo = v3(W.keyFrom.x - 0.3, 0.32, W.keyFrom.z + 1.4);   // in front of it, on top of the grass list.keyB.position.copy(W.keyTo);
  hudInit(); W.shots = shots();
  void shaft; void plant; void easeOut; void visemeAt;
  return expose(ctx, renderAt, EV.hug + 1.2, EV);
}
