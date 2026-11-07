// Episode 25: We Survived 99 Nights, But the Forest Wouldn't Let Us Leave. Night 99 in a dark pine forest: a survival camp round a
// campfire, frost and falling snow, creatures' eyes in the trees. A glowing gate opens at the end of the path; ONE PLAYER STILL MISSING.
// Noah's team list is full, but a small child in an old red jacket sits by the fire. The gate starts to iris shut; Noah runs back, takes
// his hand, and they leap through as it vanishes, into a bright town in the sun, where the dark forest dissolves off the map behind them.
// World: the camp at the origin (fire at C), the gate at G down a path to -z; the town far off at TW (its own little forest at its edge).
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, DAY, NIGHT } from '../engine/stage.js';
import { Batch, surf, paint, lamp } from '../engine/kit.js';
import { dust, sparkles, burst, leaves, clouds, atmos } from '../engine/atmos.js';
import { glowSprite } from '../engine/props.js';
import { treeShape, treeSet, leafTime } from '../engine/forest.js';
import { bushGeo, rockGeo } from '../engine/isles.js';
import { cottage, PASTEL } from '../engine/pastel.js';
import { campfire, tent, logSeat, woodPile, axeStump, lantern, cookPot, bedroll, supplyCrate, pines, exitGate, beast, snow } from '../engine/camp.js';

let ctx, L, EV;
const W = {};
const C = v3(0, 0, 0), G = v3(0, 0, -38), TW = v3(3000, 0, 0);
const GATE_Z = -26.5, SEAT = v3(-2.7, 0, -2.9), BS = 0.7, ARM = 2.1;
const lp3 = (a, b, u) => a.clone().lerp(b, u);

// ---- palettes ----
const NIGHT99 = { ...NIGHT, ...P({ top: '#050a16', horizon: '#14263a', haze: '#0b1622', sunColor: '#b8c8ff', hemiSky: '#3e5478', hemiGround: '#221e18' }),
  sunI: 0.5, sunDir: v3(-0.45, 0.75, -0.35), sunDisc: 0, stars: 1, moon: 1, hemiI: 1.0, amb: 0.2, envI: 0.65, exposure: 1.12, bloom: 0.08,
  fogNear: 26, fogFar: 150, win: 0, lamp: 0, saturation: 1.12, contrast: 1.08, bounce: 0.2 };
const HIGH = { ...NIGHT99, fogNear: 120, fogFar: 520, hemiI: 1.2 };
const SUNNY = { ...DAY, ...P({ top: '#3f8ef0', horizon: '#d8f0ff', haze: '#cfe6ff', sunColor: '#fff0d4', hemiSky: '#d2e8ff', hemiGround: '#7a9a5a' }),
  sunI: 2.6, sunDir: v3(0.55, 0.62, 0.55), sunDisc: 1, hemiI: 0.95, amb: 0.15, envI: 0.95, exposure: 1.0, bloom: 0.12, fogNear: 260, fogFar: 1300, saturation: 1.16, contrast: 1.05, bounce: 0.3 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return {
    flip: 0.35, glimpse: 0.4, form: s(1) + 0.2, walk: s(6) - 0.1, arrive: s(7) - 0.05, msg: s(7) - 0.05, turn: s(10) + 0.2,
    look: s(15) + 0.25, close: s(18) + 0.1, run: s(21) - 0.05, grab: s(22) + 0.5, rise: s(22) + 0.75, sprint: s(23) - 0.15,
    leap: s(24) + 0.55, through: s(24) + 1.05, vanish: s(24) + 1.25, town: s(25) - 0.1, notify: s(28) + 0.35, erase: s(30) + 0.5, end: ctx.dur,
  };
}
// the gate: opens at L1, starts to iris shut at L18, closes as they pass
const gateOpen = (t) => smooth(EV.glimpse, EV.form + 1.4, t) * 0.25 + smooth(EV.form, EV.form + 1.4, t) * 0.75;
const gateClose = (t) => t < EV.close ? 0 : t < EV.through ? 0.55 * smooth(EV.close, EV.close + 2.2, t) + 0.2 * clamp((t - EV.sprint) / (EV.through - EV.sprint)) : 0.75 + 0.25 * smooth(EV.through, EV.through + 0.55, t);

// ---- Noah's and the child's paths: pure functions of t ----
function noahAt(t) {
  const e = EV;
  if (t < e.walk) return { p: v3(2.2, 0, -10.5), yaw: Math.PI, st: 'idle' };
  if (t < e.arrive + 0.6) { const k = clamp((t - e.walk) / (e.arrive + 0.6 - e.walk)); return { p: v3(lerp(2.2, 0.6, k), 0, lerp(-10.5, GATE_Z, easeInOut(k))), yaw: Math.PI, st: k < 1 ? 'walk' : 'idle' }; }
  if (t < e.run) return { p: v3(0.6, 0, GATE_Z), yaw: Math.PI, st: 'idle' };
  if (t < e.grab) { const k = clamp((t - e.run) / (e.grab - 0.15 - e.run)), stop = SEAT.clone().add(v3(1.55, 0, -1.6));
    return { p: lp3(v3(0.6, 0, GATE_Z), stop, easeInOut(k) * 0.15 + k * 0.85), yaw: 0.12, st: k < 1 ? 'run' : 'idle' }; }
  if (t < e.sprint) return { p: SEAT.clone().add(v3(1.55, 0, -1.6)), yaw: 0.12, st: 'idle' };
  // the sprint back down the path and the leap
  const z0 = SEAT.z - 1.6, k = clamp((t - e.sprint) / (e.through - e.sprint)), z = lerp(z0, G.z - 2.0, k);
  return { p: v3(lerp(SEAT.x + 1.55, 0.9, smooth(0, 0.35, k)), 0, z), yaw: Math.PI, st: 'run', k };
}

// ---- the forest set ----
function forest() {
  const g = new THREE.Group(); ctx.scene.add(g); W.forest = g;
  const b = new Batch(), r = rng(25);
  b.box(surf('grass', '#2b3d28', { roughness: 1 }), 900, 0.4, 900, 0, -0.2, -60, { r: 0.02 });
  // the clearing: packed earth with frost; the path to the gate
  const dirt = surf('sand', '#4a3c2e', { roughness: 1 });
  b.add(dirt, new THREE.CylinderGeometry(15, 16, 0.2, 40), 0, 0.02, 0);
  for (let z = -4; z > G.z - 2; z -= 3.2) b.box(dirt, 5.4 + r() * 1.2, 0.16, 3.6, (r() - 0.5) * 0.6, 0.03, z, { r: 0.05, ry: (r() - 0.5) * 0.2 });
  b.add(dirt, new THREE.CylinderGeometry(9, 10, 0.18, 30), G.x, 0.03, G.z + 2);
  b.done(g);
  // frost and snow drifts: flattened white blobs on the ground
  const snowM = new THREE.MeshStandardMaterial({ color: '#dfe8f2', roughness: 0.85, flatShading: true });
  const drifts = []; for (let i = 0; i < 420; i++) { const a = r() * Math.PI * 2, d = 6 + Math.sqrt(r()) * 120, x = Math.cos(a) * d, z = Math.sin(a) * d - 20;
    if (Math.hypot(x, z) < 12.5 || (Math.abs(x) < 4.5 && z < 0 && z > G.z - 6)) continue; drifts.push({ x, z, s: 0.8 + r() * 2.2 }); }
  const dm = new THREE.InstancedMesh(rockGeo(3), snowM, drifts.length), MM = new THREE.Matrix4(), q = new THREE.Quaternion();
  drifts.forEach((d, i) => { MM.compose(v3(d.x, -0.15, d.z), q.setFromEuler(new THREE.Euler(0, r() * 6, 0)), v3(d.s * 1.6, d.s * 0.22, d.s)); dm.setMatrixAt(i, MM); });
  dm.receiveShadow = true; g.add(dm);
  // rocks, bushes, ferns, fallen logs
  const rockM = new THREE.MeshStandardMaterial({ color: '#5c5e60', roughness: 0.95, flatShading: true });
  const rocks = []; for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, d = 13 + r() * 70, x = Math.cos(a) * d, z = Math.sin(a) * d - 15; if (Math.abs(x) < 4.5 && z < 0 && z > G.z - 6) continue; rocks.push({ x, z, s: 0.5 + r() * 1.4 }); }
  const rm = new THREE.InstancedMesh(rockGeo(5), rockM, rocks.length); rocks.forEach((d, i) => { MM.compose(v3(d.x, d.s * 0.2, d.z), q.setFromEuler(new THREE.Euler(r(), r() * 6, 0)), v3(d.s, d.s * 0.7, d.s)); rm.setMatrixAt(i, MM); });
  rm.castShadow = rm.receiveShadow = true; g.add(rm);
  const bushM = new THREE.MeshStandardMaterial({ color: '#203a24', roughness: 0.9, flatShading: true });
  const bushes = []; for (let i = 0; i < 160; i++) { const a = r() * Math.PI * 2, d = 14 + r() * 80, x = Math.cos(a) * d, z = Math.sin(a) * d - 15; if (Math.abs(x) < 5 && z < 0 && z > G.z - 6) continue; bushes.push({ x, z, s: 0.6 + r() * 0.8 }); }
  const bm = new THREE.InstancedMesh(bushGeo(), bushM, bushes.length); bushes.forEach((d, i) => { MM.compose(v3(d.x, 0.5 * d.s, d.z), q.setFromEuler(new THREE.Euler(0, r() * 6, 0)), v3(d.s, d.s * 0.8, d.s)); bm.setMatrixAt(i, MM); });
  bm.castShadow = bm.receiveShadow = true; g.add(bm);
  // pines: a ring round the clearing, both sides of the path, the gate between two big ones, and the endless forest
  const list = [];
  const ok = (x, z) => Math.hypot(x, z) > 15.5 && !(Math.abs(x) < 7.5 && z < -8 && z > G.z - 3) && Math.hypot(x - G.x, z - G.z - 1) > 9.5;
  for (let i = 0; i < 1400 && list.length < 520; i++) { const a = r() * Math.PI * 2, d = 15 + Math.pow(r(), 0.7) * 230, x = Math.cos(a) * d, z = Math.sin(a) * d - 30;
    if (!ok(x, z)) continue; if (list.some((t) => Math.abs(t.x - x) < 4.2 && Math.abs(t.z - z) < 4.2)) continue; list.push({ x, z, s: 0.75 + r() * 0.55, yaw: r() * 6, shape: Math.floor(r() * 2) }); }
  for (const s of [-1, 1]) list.push({ x: G.x + s * 10.5, z: G.z - 0.5, s: 1.45, yaw: 1.2 + s, shape: s > 0 ? 1 : 0 });
  W.pines = pines(g, list); W.pineList = list;
  // a few leafy trees mixed in, dark
  const shapes = [treeShape({ seed: 4, h: 13, r0: 1.0, r1: 0.5, spread: 8, clumps: 12, cols: ['#0f2416', '#1e4426', '#3a6a36'] })];
  const lt = []; for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 20 + r() * 80, x = Math.cos(a) * d, z = Math.sin(a) * d - 25; if (!ok(x, z) || list.some((t) => Math.hypot(t.x - x, t.z - z) < 6)) continue; lt.push({ x, z, s: 1 + r() * 0.4, yaw: r() * 6, shape: 0 }); }
  W.leafy = treeSet(ctx.scene, shapes, lt);
  // creatures round the camp, deep in the trees
  W.beasts = [[-20.5, 4, 1.2], [-19, -7.5, 0], [20, -1.5, 0], [21.5, 5, 0], [-13, -36, 1.0], [11, -44, -0.6]].map(([x, z, yaw], i) => { const w = beast({ pos: v3(x, 0, z), yaw: Math.atan2(-x, -z), seed: i + 1, size: 1.15 }); g.add(w); return w; });
}

function camp() {
  const g = new THREE.Group(); ctx.scene.add(g); W.camp = g;
  W.fire = campfire({ seed: 25, intensity: 170, distance: 70 }); W.fire.position.copy(C); g.add(W.fire);
  const t1 = tent({ color: '#4f6a3a' }); t1.position.set(-9.5, 0, 4.5); t1.rotation.y = 2.1; g.add(t1);
  const t2 = tent({ color: '#8a5a32', w: 5.2, d: 6.4, h: 4.0 }); t2.position.set(8.5, 0, 6.5); t2.rotation.y = -2.3; g.add(t2);
  const t3 = tent({ color: '#3a5466', w: 5, d: 6, h: 3.8 }); t3.position.set(1.0, 0, 11.5); t3.rotation.y = Math.PI + 0.1; g.add(t3);
  const s1 = logSeat(5.2, 3); s1.position.set(SEAT.x + 0.3, 0, SEAT.z - 0.1); s1.rotation.y = 0.75; g.add(s1); W.seatLog = s1;
  const s2 = logSeat(5, 4); s2.position.set(3.6, 0, 2.2); s2.rotation.y = 2.3; g.add(s2);
  const s3 = logSeat(4.4, 5); s3.position.set(-3.6, 0, 3.6); s3.rotation.y = -0.6; g.add(s3);
  const wp = woodPile(4); wp.position.set(11.5, 0, -2.5); wp.rotation.y = 0.4; g.add(wp);
  const ax = axeStump(5); ax.position.set(9.0, 0, -5.5); g.add(ax);
  const pot = cookPot(); pot.position.set(0, 0, 0); pot.rotation.y = 0.3; g.add(pot); pot.visible = false;
  const b1 = bedroll('#7a3a32'); b1.position.set(-6.5, 0, 9.5); b1.rotation.y = 0.5; g.add(b1);
  const cr = supplyCrate(); cr.position.set(-11, 0, -3.5); cr.rotation.y = 0.6; g.add(cr);
  const cr2 = supplyCrate(); cr2.position.set(-11.2, 1.6, -3.6); cr2.rotation.y = 0.9; cr2.scale.setScalar(0.7); g.add(cr2);
  W.lanterns = [];
  for (const [x, y, z] of [[-11, 2.7, -3.2], [5.0, 0, -8.5], [-4.8, 0, -9.0]]) { const l = lantern({ intensity: 10 }); l.position.set(x, y, z); g.add(l); W.lanterns.push(l); }
  // lantern posts along the path (dim, the camp's edge)
  const b = new Batch(), pole = paint('#4a3624', { roughness: 0.85 });
  for (const [x, z] of [[5.0, -8.5], [-4.8, -9.0]]) { b.cyl(pole, 0.12, 0.15, 3.2, x, 1.6, z); b.box(pole, 1.0, 0.14, 0.14, x + (x > 0 ? -0.4 : 0.4), 3.15, z, { r: 0.04 }); }
  b.done(g);
  W.lanterns[1].position.set(4.6, 1.55, -8.5); W.lanterns[2].position.set(-4.4, 1.55, -9.0);
  // the gate
  W.gate = exitGate({ pos: G, radius: 5.0, light: 22, bright: 0.85 }); ctx.scene.add(W.gate);
}

// ---- the town in the sun, its own strip of dark forest at the edge ----
function town() {
  const g = new THREE.Group(); g.position.copy(TW); ctx.scene.add(g); W.town = g;
  const b = new Batch(), r = rng(52);
  b.box(surf('grass', '#7cc858'), 1400, 0.2, 1400, 0, -0.1, 0, { r: 0.02 });
  b.box(paint('#5d616b', { roughness: 0.92 }), 1400, 0.14, 14, 0, 0.06, 22, { r: 0.02 });
  for (let x = -600; x < 600; x += 9) b.box(paint('#f3e6b0', { roughness: 0.7 }), 4, 0.05, 0.36, x, 0.14, 22, { r: 0.02 });
  for (const s of [-1, 1]) b.box(surf('concrete', '#ebe5dc'), 1400, 0.36, 5, 0, 0.18, 22 + s * 9.5, { r: 0.04 });
  // the square where they land: cobbles, a fountain, benches, planters
  b.add(surf('cobble', '#d8cdbc'), new THREE.CylinderGeometry(18, 18, 0.3, 48), 0, 0.12, -2);
  b.cyl(paint('#e8e2d8'), 3.6, 4.0, 1.2, -14, 0.6, -12, { seg: 28 }); b.cyl(paint('#e8e2d8'), 0.5, 0.6, 3.6, -14, 1.8, -12); b.cyl(paint('#e8e2d8'), 1.6, 1.2, 0.4, -14, 3.6, -12, { seg: 20 });
  const water = new THREE.Mesh(new THREE.CircleGeometry(3.4, 28), new THREE.MeshStandardMaterial({ color: '#5ab8f0', roughness: 0.08, metalness: 0.3, emissive: '#103a5a', emissiveIntensity: 0.3 })); water.rotation.x = -Math.PI / 2; water.position.set(-14, 1.05, -12); g.add(water);
  const fl = ['#ff5fa2', '#ffd23a', '#b06bff', '#ff4a4a', '#ffffff', '#ff9a3a'];
  for (const [x, z] of [[12, -14], [16, 6], [-18, 8]]) { b.box(surf('brick', '#b07a5a'), 5, 1.2, 2.4, x, 0.6, z, { r: 0.1 }); for (let i = 0; i < 10; i++) b.add(paint(fl[i % 6], { roughness: 0.7 }), new THREE.IcosahedronGeometry(0.42, 0), x - 2 + i * 0.45, 1.4 + (i % 2) * 0.2, z + (r() - 0.5) * 1.4); }
  b.done(g);
  // cottages round the square and along the road
  let k = 0;
  for (const [x, z, ry] of [[52, -6, -Math.PI / 2], [-54, -2, Math.PI / 2], [-60, 52, Math.PI], [-30, 52, Math.PI], [0, 54, Math.PI], [30, 52, Math.PI], [60, 50, Math.PI]]) {
    const c = cottage({ seed: 120 + k, wall: PASTEL[k % PASTEL.length], porch: true }); c.g.position.set(x, 0, z); c.g.rotation.y = ry; g.add(c.g); k++; }
  for (let x = -90; x <= 90; x += 30) { const lm = lamp({ height: 12 }); lm.position.set(x + 6, 0, 13); lm.rotation.y = Math.PI / 2; g.add(lm); }
  // a poster easter egg on the noticeboard by the fountain: TOY FAN TV
  const nb = new THREE.Group(); nb.position.set(-4, 0, -17); nb.rotation.y = 0.25; g.add(nb);
  const nbb = new Batch(); for (const s of [-1, 1]) nbb.box(paint('#6a4a2c'), 0.3, 4.4, 0.3, s * 1.8, 2.2, 0, { r: 0.05 }); nbb.box(paint('#8a6a44'), 4.2, 2.6, 0.2, 0, 3.0, 0, { r: 0.06 }); nbb.done(nb);
  const pc = document.createElement('canvas'); pc.width = 512; pc.height = 300; { const x = pc.getContext('2d'); x.fillStyle = '#ff3a5a'; x.fillRect(0, 0, 512, 300); x.fillStyle = '#ffd23a'; x.font = '900 92px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('TOY FAN', 256, 130); x.fillStyle = '#ffffff'; x.fillText('TV', 256, 240); }
  const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace;
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.1), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.8 })); poster.position.set(0, 3.0, 0.12); nb.add(poster);
  // bright round trees
  const shapes = [treeShape({ seed: 3, h: 10, r0: 0.9, r1: 0.5, spread: 7.5, clumps: 12, cols: ['#2f6a33', '#4f9a3f', '#9fd06a'] })];
  const lt = []; for (let x = -120; x <= 120; x += 20) { lt.push({ x: TW.x + x + r() * 5, z: 36 + r() * 3, s: 1.1, yaw: r() * 6, shape: 0 }); if (Math.abs(x) > 40) lt.push({ x: TW.x + x + r() * 5, z: -18 - r() * 3, s: 1.1, yaw: r() * 6, shape: 0 }); }
  W.townTrees = treeSet(ctx.scene, shapes, lt);
  // the forest beyond the town: dark pines on a slope behind the houses, the ones that vanish
  const fb = new Batch(), white = paint('#ffffff'); for (let x = -70; x <= 70; x += 2.4) fb.box(white, 0.3, 2.2, 0.3, x, 1.1, -24, { r: 0.06 }); for (const y of [0.8, 1.6]) fb.box(white, 140, 0.3, 0.2, 0, y, -24, { r: 0.05 }); fb.done(g);
  const fl2 = []; for (let i = 0; i < 1500 && fl2.length < 280; i++) { const x = (r() - 0.5) * 520, z = -46 - r() * 170; if (fl2.some((t) => Math.abs(t.x - x) < 5 && Math.abs(t.z - z) < 5)) continue; fl2.push({ x, z, s: 0.95 + r() * 0.6, yaw: r() * 6, shape: Math.floor(r() * 2) }); }
  const darkLeaf = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, color: '#5a6a62' });
  W.edge = pines(g, fl2, { leaf: darkLeaf }); W.edgeList = fl2;
  const dg = new THREE.Mesh(new THREE.PlaneGeometry(560, 180), new THREE.MeshStandardMaterial({ color: '#1e3020', roughness: 1 })); dg.rotation.x = -Math.PI / 2; dg.position.set(0, 0.05, -130); g.add(dg); W.edgeGround = dg;
  W.meadow = new THREE.Mesh(new THREE.PlaneGeometry(560, 180), new THREE.MeshStandardMaterial({ color: '#8ad060', roughness: 0.95 })); W.meadow.rotation.x = -Math.PI / 2; W.meadow.position.set(0, 0.04, -130); g.add(W.meadow);
}

// ---- people ----
function people() {
  const sc = ctx.scene;
  W.noah = makeCharacter({ avatar: 'farm_noah', alti: true, skin: '#f2c79a', caustic: false }); sc.add(W.noah.root);
  W.kid = makeCharacter({ avatar: 'farm_red_kid', alti: true, skin: '#eebb8e', caustic: false }); W.kid.root.scale.setScalar(BS); sc.add(W.kid.root);
  boldFace(W.noah); boldFace(W.kid);
}
// faces read in every close-up: the face sheet's dark lines bold and dark (Episodes 23-24)
function boldFace(ch) {
  const m = ch.faceSheet.material; m.emissiveIntensity *= 0.55;
  ch.head.children.forEach((k) => { if (k.isMesh && k !== ch.faceSheet && k.material.emissive && !k.material.map && k.material.emissiveIntensity > 0) k.material.emissiveIntensity *= 0.65; });
  const done = new WeakSet(), orig = ch.setFace.bind(ch);
  ch.setFace = function (expr, f) {
    orig(expr, f); const t = m.map; if (!t || done.has(t)) return; done.add(t);
    const cv = t.image, x = cv.getContext('2d'), W2 = cv.width, H2 = cv.height, img = x.getImageData(0, 0, W2, H2), d = img.data, n = W2 * H2, dark = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const a = d[i * 4 + 3], l = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255; const r0 = d[i * 4], g0 = d[i * 4 + 1], pink = r0 > 170 && r0 - g0 > 45; if (a > 40 && l < 0.86 && !pink) dark[i] = 1; }
    const out = new Uint8Array(n);
    for (let yy = 0; yy < H2; yy++) for (let xx = 0; xx < W2; xx++) { if (!dark[yy * W2 + xx]) continue; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = xx + dx, Y = yy + dy; if (X >= 0 && Y >= 0 && X < W2 && Y < H2) out[Y * W2 + X] = 1; } }
    for (let i = 0; i < n; i++) if (out[i]) { const k = i * 4, a = d[k + 3] / 255; d[k] = Math.round(18 + d[k] * 0.12 * a); d[k + 1] = Math.round(14 + d[k + 1] * 0.12 * a); d[k + 2] = Math.round(16 + d[k + 2] * 0.12 * a); d[k + 3] = Math.max(d[k + 3], 235); }
    x.putImageData(img, 0, 0); t.needsUpdate = true;
  };
}

// ---- lights ----
function rig() {
  const s = new THREE.SpotLight('#ffffff', 0, 60, 0.42, 0.6, 1.4); s.castShadow = false; ctx.scene.add(s); ctx.scene.add(s.target); W.key = s;
  W.rim = new THREE.PointLight('#9fdcff', 0, 30, 1.6); ctx.scene.add(W.rim);
}
const keyFrom = (face, cam, side = 1) => { const d = cam.clone().sub(face); d.y = 0; d.normalize(); return face.clone().add(v3(d.x * 7 - d.z * 4 * side, 5, d.z * 7 + d.x * 4 * side)); };
function lights(set, t, cam, face, o = {}) {
  W.key.intensity = 0; W.rim.intensity = 0;
  if (set === 'night' && face) {
    // a soft warm key from the camera side (firelight on faces), a cool rim when the gate is behind
    W.key.position.copy(keyFrom(face, cam, o.side ?? 1)); W.key.target.position.copy(face); W.key.color.set(o.keyColor || '#ffc890'); W.key.intensity = o.key ?? 26; W.key.distance = 30;
    if (o.rim) { W.rim.position.copy(o.rim); W.rim.color.set(o.rimColor || '#9fdcff'); W.rim.intensity = o.rimI ?? 30; W.rim.distance = 14; }
  }
  if (set === 'town' && face) { W.key.position.copy(keyFrom(face, cam)); W.key.target.position.copy(face); W.key.color.set('#fff2e2'); W.key.intensity = 30; W.key.distance = 40; }
}

// ---- HUD ----
const F = (px, w = 900) => `${w} ${px}px ITTInter, sans-serif`;
function hudInit() { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; c.style.cssText = 'position:absolute;inset:0;pointer-events:none;'; ctx.grade.after(c); W.hud = c; W.h2 = c.getContext('2d'); }
const pop = (k) => { const c = clamp(k); return c <= 0 ? 0 : 1 + 2.2 * Math.pow(c - 1, 3) + 1.2 * Math.pow(c - 1, 2); };
function rr(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
function card(x, cx, cy, w, h, k, draw, o = {}) {
  if (k <= 0) return; x.save(); x.translate(cx, cy); x.scale(k, k);
  x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 30; x.fillStyle = o.bg || 'rgba(14,18,26,0.9)'; rr(x, -w / 2, -h / 2, w, h, 28); x.fill(); x.shadowBlur = 0;
  if (o.edge) { x.strokeStyle = o.edge; x.lineWidth = 6; x.stroke(); }
  draw(x, w, h); x.restore();
}
function moon(c, x, y, s) { c.save(); c.fillStyle = '#e8eeff'; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(x + s * 0.45, y - s * 0.3, s * 0.85, 0, 7); c.fill(); c.restore(); }
function tick(c, x, y, s, col = '#3ad86a') { c.save(); c.strokeStyle = col; c.lineWidth = s * 0.28; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x - s * 0.5, y); c.lineTo(x - s * 0.1, y + s * 0.4); c.lineTo(x + s * 0.55, y - s * 0.45); c.stroke(); c.restore(); }
function drawHud(t, n) {
  const x = W.h2; x.clearRect(0, 0, 1080, 1920); if (ctx.thumbMode) return;
  const e = EV, s = (i) => L(i).start;
  x.textBaseline = 'middle';
  if (n === 'hook' || n === 'gate') {   // the night counter: 98 flips to 99
    const k = clamp((t - 0.05) / 0.25), night = t < e.flip ? 98 : 99, f = t > e.flip && t < e.flip + 0.25 ? 1 + 0.25 * Math.sin((t - e.flip) / 0.25 * Math.PI) : 1;
    x.save(); x.globalAlpha = k; x.translate(540, 250); x.scale(f, f);
    x.fillStyle = 'rgba(10,14,24,0.82)'; rr(x, -250, -70, 500, 140, 70); x.fill(); x.strokeStyle = 'rgba(160,190,255,0.55)'; x.lineWidth = 4; x.stroke();
    moon(x, -170, 0, 40); x.textAlign = 'left'; x.fillStyle = '#ffffff'; x.font = F(76); x.fillText(`NIGHT ${night}`, -110, 4);
    x.restore();
  }
  if (n === 'missing') {   // the gate's message, red
    const k = pop((t - e.msg - 0.1) / 0.28), full = 'ONE PLAYER STILL MISSING', nch = Math.floor(clamp((t - e.msg - 0.2) / 1.0) * full.length);
    card(x, 540, 330, 940, 220, k, (c, w, h) => {
      c.fillStyle = '#ff4a4a'; c.beginPath(); c.moveTo(-w / 2 + 70, -h / 2 + 40); c.lineTo(-w / 2 + 112, -h / 2 + 112); c.lineTo(-w / 2 + 28, -h / 2 + 112); c.closePath(); c.fill();
      c.fillStyle = '#1a0a0a'; c.font = F(52); c.textAlign = 'center'; c.fillText('!', -w / 2 + 70, -h / 2 + 88);
      c.textAlign = 'left'; c.fillStyle = '#ff8a8a'; c.font = F(30); c.fillText('EXIT GATE', -w / 2 + 140, -h / 2 + 62);
      c.fillStyle = '#ffffff'; c.font = F(54); c.textAlign = 'center'; c.fillText(full.slice(0, nch), 40, 40);
    }, { bg: 'rgba(40,8,10,0.92)', edge: '#ff4a4a' });
  }
  if (n === 'team') {   // the team list: everyone ticked
    const k = pop((t - s(8) - 0.1) / 0.28);
    const team = [['Noah', '#5ad05a', 'AT THE GATE'], ['AvaSurvives', '#ff8ac0', 'ESCAPED'], ['Leo_2011', '#5ab0ff', 'ESCAPED'], ['MaxTheBuilder', '#ffb03a', 'ESCAPED']];
    card(x, 540, 400, 820, 470, k, (c, w, h) => {
      c.fillStyle = '#1e2a3e'; rr(c, -w / 2, -h / 2, w, 86, 28); c.fill(); c.fillRect(-w / 2, -h / 2 + 50, w, 36);
      c.textAlign = 'left'; c.fillStyle = '#ffffff'; c.font = F(40); c.fillText('TEAM', -w / 2 + 36, -h / 2 + 46); c.textAlign = 'right'; c.fillStyle = '#7dffa0'; c.fillText('4 / 4', w / 2 - 36, -h / 2 + 46);
      team.forEach(([nm, col, st], i) => { const ti = s(8) + 0.25 + i * 0.22, a = clamp((t - ti) / 0.15); if (a <= 0) return; const y = -h / 2 + 145 + i * 86;
        c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.arc(-w / 2 + 70, y, 28, 0, 7); c.fill();
        c.textAlign = 'left'; c.fillStyle = '#ffffff'; c.font = F(42); c.fillText(nm, -w / 2 + 120, y - 4); c.fillStyle = '#9aa6bc'; c.font = F(24, 700); c.fillText(st, -w / 2 + 120, y + 30);
        const tk = clamp((t - ti - 0.3 - (i === 0 ? 0.0 : 0)) / 0.2); if (tk > 0) tick(c, w / 2 - 70, y, 44 * pop(tk)); c.globalAlpha = 1; });
    });
  }
  if (n === 'notify') {   // the server's notification
    const k = pop((t - e.notify) / 0.3), full = ['THE FIRST PLAYER HAS', 'FINALLY ESCAPED.'], tot = full.join('').length;
    const nch = Math.floor(clamp((t - s(29) + 0.05) / Math.max(0.8, L(29).end - s(29) - 0.2)) * tot);
    card(x, 540, 340, 920, 280, k, (c, w, h) => {
      c.fillStyle = '#ffd36a'; c.beginPath(); c.arc(-w / 2 + 74, -h / 2 + 66, 26, 0, 7); c.fill(); c.fillStyle = '#3a2a08'; c.font = F(34); c.textAlign = 'center'; c.fillText('1', -w / 2 + 74, -h / 2 + 68);
      c.textAlign = 'left'; c.fillStyle = '#ffd36a'; c.font = F(30); c.fillText('SERVER NOTIFICATION', -w / 2 + 120, -h / 2 + 66);
      c.fillStyle = '#ffffff'; c.font = F(52); c.textAlign = 'center';
      if (t < s(29) - 0.05) { for (let i = 0; i < 3; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * (Math.sin(t * 9 - i) > 0)})`; c.beginPath(); c.arc(-30 + i * 30, 30, 9, 0, 7); c.fill(); } }
      else { let left = nch; full.forEach((ln, i) => { const sh = ln.slice(0, Math.max(0, left)); left -= ln.length; c.fillText(sh, 0, 12 + i * 66); }); }
    }, { bg: 'rgba(14,30,60,0.92)', edge: '#ffd36a' });
  }
  if (n === 'vanish') {   // the map: the forest is erased
    const k = pop((t - s(30) + 0.1) / 0.3), er = smooth(e.erase, e.erase + 2.0, t);
    card(x, 790, 300, 440, 440, k, (c, w, h) => {
      c.save(); rr(c, -w / 2 + 20, -h / 2 + 70, w - 40, h - 90, 18); c.clip();
      c.fillStyle = '#8fd46a'; c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = '#6f7a86'; c.fillRect(-w / 2, 70, w, 22); c.fillStyle = '#e8e0d4'; for (const [px, py] of [[-120, 120], [-40, 128], [40, 120], [120, 128], [-90, 40], [90, 40]]) c.fillRect(px - 16, py - 14, 32, 28);
      c.fillStyle = '#ffffff'; c.font = F(26); c.textAlign = 'center'; c.fillText('TOWN', 0, 165);
      // the forest region, dissolving from the top in blocks
      const rr2 = rng(7); for (let i = 0; i < 12; i++) for (let j = 0; j < 7; j++) { const bx = -w / 2 + 20 + i * 34, by = -h / 2 + 70 + j * 30, gone = rr2() * 0.6 + j / 7 * 0.4 < er;
        if (!gone) { c.fillStyle = (i + j) % 2 ? '#1d3a24' : '#183020'; c.fillRect(bx, by, 35, 31); } else if (er < 1 && rr2() < 0.4) { c.fillStyle = 'rgba(255,240,160,0.6)'; c.fillRect(bx + 8, by + 8, 14, 14); } }
      c.globalAlpha = 1 - er; c.fillStyle = '#ffffff'; c.font = F(28); c.fillText('THE FOREST', 0, -h / 2 + 175); c.globalAlpha = 1;
      c.fillStyle = '#ff4a6a'; c.beginPath(); c.arc(20, 92, 11, 0, 7); c.fill();
      c.restore();
      c.textAlign = 'left'; c.fillStyle = '#ffffff'; c.font = F(30); c.fillText('MAP', -w / 2 + 30, -h / 2 + 40);
    }, { bg: 'rgba(14,18,26,0.88)' });
  }
}

// ---- helpers ----
function faceOf(c, name, t, ph, o = {}) { c.setFace(name, { blink: o.blink !== false && blinkAt(t, ph) && !['shocked', 'surprised', 'terrified'].includes(name), gaze: o.gaze, viseme: o.viseme }); }
const hand = (c, i) => { c.root.updateMatrixWorld(true); return c.arms[i].localToWorld(v3(0, -ARM, 0.05)); };
const headOf = (c, y = 4.6) => c.root.position.clone().add(v3(0, y * c.root.scale.y, 0));
function kidSit(K, t) {
  K.root.position.set(SEAT.x, 0.62, SEAT.z); K.root.rotation.y = Math.PI - 0.45; pose(K, 'sit', t);
  K.arms[0].rotation.x = -1.05; K.arms[1].rotation.x = -1.05; K.arms[0].rotation.z = 0.32; K.arms[1].rotation.z = -0.32;
  K.legs[0].rotation.x = -1.25; K.legs[1].rotation.x = -1.25;
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, S = [], add = (name, t0, f) => S.push({ name, t0: () => t0, f, t1: () => 0 });
  add('hook', 0, (u) => ({ pos: v3(lerp(4.4, 4.2, u), 5.3, lerp(-3.0, -3.6, u)), look: v3(0.6, 5.0, G.z), fov: 58 }));
  add('gate', s(1) - 0.1, (u) => ({ pos: v3(lerp(-7.5, -6.5, u), lerp(1.6, 1.9, u), lerp(G.z + 19, G.z + 16.5, u)), look: v3(G.x, 7.2, G.z), fov: 66 }));
  add('survived', s(2) - 0.1, (u) => ({ pos: v3(lerp(-1.8, -1.6, u), 4.9, lerp(-17.6, -17.1, u)), look: v3(2.0, 4.3, -10.6), fov: 56 }));
  add('creatures', s(3) - 0.1, (u) => ({ pos: v3(-2.5, 3.3, -2.5), look: v3(20.5, 2.9, lerp(-1.0, 4.0, u)), fov: 34 }));
  add('freezing', s(4) - 0.1, (u) => ({ pos: v3(lerp(4.6, 4.2, u), 4.4, lerp(-17.2, -16.4, u)), look: v3(1.6, 3.9, -10.5), fov: 60 }));
  add('darkness', s(5) - 0.1, (u) => ({ pos: lp3(v3(18, 44, 36), v3(42, 82, 66), easeInOut(u)), look: v3(0, 0, -16), fov: 60 }));
  add('approach', s(6) - 0.1, (u, t) => { const p = noahAt(t).p; return { pos: p.clone().add(v3(1.6, 5.4, 9.5)), look: p.clone().add(v3(-0.3, 4.6, -12)), fov: 60 }; });
  add('missing', s(7) - 0.1, (u) => ({ pos: v3(lerp(-2.4, -2.0, u), 4.3, lerp(GATE_Z - 7.0, GATE_Z - 6.4, u)), look: v3(0.6, 3.6, GATE_Z), fov: 64 }));
  add('team', s(8) - 0.1, (u) => ({ pos: v3(lerp(3.2, 2.9, u), 4.4, lerp(GATE_Z - 8.0, GATE_Z - 7.4, u)), look: v3(0.6, 3.3, GATE_Z), fov: 62 }));
  add('strange', s(10) - 0.1, (u) => ({ pos: v3(lerp(-3.4, -3.0, u), 4.5, lerp(GATE_Z - 6.4, GATE_Z - 6.0, u)), look: v3(0.6, 4.0, GATE_Z), fov: 58 }));
  add('fire', s(11) - 0.1, (u) => ({ pos: v3(0.8, 5.0, lerp(GATE_Z + 1.0, GATE_Z + 6, easeOut(u))), look: v3(-0.6, 1.6, 0), fov: 26 }));
  add('figure', s(12) - 0.1, (u, t) => { const k = easeInOut(u); return { pos: lp3(v3(-0.4, 3.6, -16), v3(-1.6, 2.6, -9.2), k), look: lp3(v3(-1.2, 1.6, -1.5), SEAT.clone().add(v3(0, 1.9, 0)), k), fov: 50 }; });
  add('never', s(14) - 0.1, (u) => ({ pos: v3(lerp(-1.5, -1.3, u), 4.6, lerp(GATE_Z + 5.6, GATE_Z + 5.0, u)), look: v3(0.6, 4.25, GATE_Z), fov: 52 }));
  add('lookup', s(15) - 0.1, (u) => ({ pos: SEAT.clone().add(v3(lerp(0.6, 0.45, u), 2.5, lerp(-5.2, -4.6, u))), look: SEAT.clone().add(v3(0.05, 2.3, 0)), fov: 52 }));
  add('hesitate', s(17) - 0.1, (u) => ({ pos: v3(lerp(-2.6, -2.2, u), 4.3, lerp(GATE_Z + 6.8, GATE_Z + 6.0, u)), look: v3(0.6, 4.0, GATE_Z), fov: 60 }));
  add('closing', s(18) - 0.1, (u) => ({ pos: v3(lerp(3.6, 3.2, u), 3.6, lerp(GATE_Z + 9, GATE_Z + 7.6, u)), look: v3(G.x, 6.0, G.z), fov: 62 }));
  add('choice', s(19) - 0.1, (u) => ({ pos: v3(lerp(-1.4, -1.0, u), 4.5, lerp(GATE_Z + 6.4, GATE_Z + 5.4, u)), look: v3(0.6, 4.2, GATE_Z), fov: lerp(58, 48, easeInOut(u)) }));
  add('run', s(21) - 0.1, (u, t) => { const p = noahAt(t).p; return { pos: p.clone().add(v3(-2.2, 3.8, 9.5)), look: p.clone().add(v3(0, 3.6, 0)), fov: 62 }; });
  add('grab', s(22) - 0.1, (u) => ({ pos: v3(lerp(-8.6, -8.2, u), 3.4, lerp(-10.6, -10.1, u)), look: v3(-1.9, 2.5, -3.6), fov: 50 }));
  add('sprint', s(23) - 0.1, (u, t) => { const p = noahAt(t).p; return { pos: v3(p.x + 9.0, 3.6, p.z + 0.4), look: v3(p.x + 0.2, 2.7, p.z + 1.0), fov: 58 }; });
  add('jump', s(24) - 0.1, (u, t) => { const p = noahAt(Math.min(t, EV.through)).p; return { pos: v3(p.x + 1.8, 3.4, Math.max(p.z + 7.5, G.z + 6.5)), look: v3(0.4, 4.8, G.z), fov: 68 }; });
  add('town', e.town, (u) => ({ pos: TW.clone().add(v3(lerp(3.0, 2.2, u), lerp(4.6, 4.3, u), lerp(-15, -13.5, u))), look: TW.clone().add(v3(-0.2, 3.6, 0)), fov: 64 }));
  add('smile', s(26) - 0.1, (u) => ({ pos: TW.clone().add(v3(lerp(-3.7, -3.6, u), 3.0, lerp(-5.6, -5.0, u))), look: TW.clone().add(v3(-1.4, 2.7, 0.3)), fov: 52 }));
  add('notify', s(28) - 0.1, (u) => ({ pos: TW.clone().add(v3(lerp(-3.5, -3.0, u), 3.4, lerp(-13, -12, u))), look: TW.clone().add(v3(0, 3.6, 0)), fov: 66 }));
  add('vanish', s(30) - 0.1, (u) => ({ pos: TW.clone().add(v3(lerp(0.6, 1.0, u), lerp(3.0, 3.6, u), lerp(13, 17, u))), look: TW.clone().add(v3(0, lerp(5.2, 6.6, u), -30)), fov: 64 }));
  S.forEach((x, i) => { if (S[i + 1]) { const v = S[i + 1].t0(); x.t1 = () => v; } });
  S[S.length - 1].t1 = () => ctx.dur + 1;
  return S;
}

// ---- a frame ----
function renderAt(t) {
  const first = !ctx.sub || ctx.sub.i === 0, sh = shotAt(W.shots, t), n = sh.name, e = EV, s = (i) => L(i).start;
  const townShots = ['town', 'smile', 'notify', 'vanish'], set = townShots.includes(n) ? 'town' : 'night';
  applyEnv(ctx, set === 'town' ? SUNNY : n === 'darkness' ? HIGH : NIGHT99);
  W.forest.visible = W.camp.visible = W.gate.visible = set === 'night'; W.town.visible = set === 'town';
  W.pines.visible = set === 'night'; W.edge.visible = set === 'town';
  for (const gg of W.leafy.groups) gg.bark.visible = gg.leaves.visible = set === 'night';
  for (const gg of W.townTrees.groups) gg.bark.visible = gg.leaves.visible = set === 'town';
  const N = W.noah, K = W.kid, [NL, NR] = N.arms, [KL, KR] = K.arms;
  N.root.visible = true; K.root.visible = true; N.root.rotation.set(0, 0, 0); K.root.rotation.set(0, 0, 0); N.root.position.set(0, -100, 0); K.root.position.set(0, -100, 0);
  pose(N, 'idle', t); pose(K, 'idle', t + 1.3);
  // the gate and the fire
  const gO = gateOpen(t), gC = gateClose(t); W.gate.set({ open: gO, close: gC, t }); W.gate.visible = set === 'night' && t < e.town;
  W.fire.update(t); W.fire.level(1); W.lanterns.forEach((l, i) => { l.light.intensity = 10 * (1 + 0.06 * Math.sin(t * 7 + i)); });
  W.beasts.forEach((b) => b.update(t));
  let face = null, lo = {};
  const nf = (expr, o = {}) => faceOf(N, expr, t, 0.3, o);
  const kf = (expr, o = {}) => faceOf(K, expr, t, 0.8, o);

  // ---- Noah ----
  const na = noahAt(t);
  if (set === 'night') {
    N.root.position.copy(na.p); N.root.rotation.y = na.yaw; pose(N, na.st, na.st === 'run' ? t * 1.15 : t);
  }
  if (n === 'hook') { N.neck.rotation.x = -0.05; nf(t > e.glimpse + 0.4 ? 'surprised' : 'neutral'); }
  if (n === 'gate') { N.root.visible = true; nf('surprised'); }
  if (n === 'survived') { N.root.rotation.y = Math.PI - 0.5; N.neck.rotation.y = 0.2; nf(t > s(2) + 0.6 ? 'happy' : 'neutral'); face = headOf(N); lo = { rim: G.clone().add(v3(0, 6, 8)), rimI: 26, key: 20 }; }
  if (n === 'creatures') { /* Noah out of shot */ }
  if (n === 'approach') { nf('neutral'); }
  if (n === 'missing') { N.root.rotation.y = Math.PI; nf(t > e.msg + 0.4 ? 'shocked' : 'surprised'); face = headOf(N); lo = { keyColor: '#cfefff', key: 18, side: -1 }; }
  if (n === 'team') { N.root.rotation.y = Math.PI - 0.35; NL.rotation.x = -1.35; NL.rotation.z = 0.35; N.neck.rotation.x = 0.28; N.neck.rotation.y = -0.1; nf(t > s(9) ? 'skeptic' : 'neutral'); face = headOf(N); lo = { keyColor: '#cfefff', key: 20 }; }
  if (n === 'strange') { const k = smooth(e.turn, e.turn + 0.8, t); N.root.rotation.y = Math.PI - 0.75 * k; N.neck.rotation.y = -0.55 * k; nf(k > 0.5 ? 'suspicious' : 'neutral'); face = headOf(N); lo = { keyColor: '#cfefff', key: 20 }; }
  if (['fire', 'figure', 'lookup'].includes(n)) { N.root.rotation.y = 0; }
  if (n === 'never' || n === 'hesitate' || n === 'choice') {
    N.root.rotation.y = 0.15; nf(n === 'never' ? 'skeptic' : n === 'hesitate' ? 'nervous' : 'worried'); face = headOf(N);
    if (n === 'hesitate') { const g2 = smooth(s(17) + 0.3, s(17) + 0.9, t); N.neck.rotation.y = lerp(0, 0.9, g2) * (1 - smooth(L(17).end, L(17).end + 0.4, t)); }
    if (n === 'choice') { const look2 = t < s(20) - 0.1 ? 0.95 : -0.15; N.neck.rotation.y = lerp(N.neck.rotation.y, look2, 1); N.root.rotation.y = 0.15; if (t > s(20) + 0.3) nf('focused'); }
    lo = { rim: v3(0.6, 6, GATE_Z - 6), rimI: 34, key: n === 'choice' ? 24 : 20 };
  }
  if (n === 'closing') { N.root.rotation.y = Math.PI; nf('shocked'); }
  if (n === 'run') { nf('focused'); face = headOf(N); lo = { key: 18 }; }

  // ---- the child ----
  K.root.visible = set === 'town' || ['fire', 'figure', 'lookup', 'never', 'hesitate', 'run', 'grab', 'sprint', 'jump', 'closing', 'choice'].includes(n);
  if (set === 'night' && t < e.grab) {
    kidSit(K, t);
    const lk = smooth(e.look, e.look + 0.5, t); K.neck.rotation.x = lerp(0.42, -0.32, lk); K.torso.rotation.x = lerp(0.25, 0.05, lk);
    const ln = L(16); kf(t > ln.start - 0.1 ? 'sad' : 'sad', { viseme: visemeAt(ln.text, ln.start + 0.03, ln.end - 0.03, t), blink: true });
    if (n === 'lookup') face = headOf(K, 4.2);
    if (n === 'run') kf('scared');
  }
  // grab: Noah reaches, the child takes his hand and stands
  if (n === 'grab' || (set === 'night' && t >= e.grab)) {
    const reach = smooth(e.grab - 0.45, e.grab, t), up = smooth(e.rise - 0.1, e.rise + 0.55, t);
    N.root.position.copy(SEAT).add(v3(1.55, 0, -1.6)); N.root.rotation.y = -0.95 + Math.PI * 0; N.root.rotation.y = Math.atan2(SEAT.x - N.root.position.x, SEAT.z - N.root.position.z) - 0.25;
    pose(N, 'idle', t); NR.rotation.x = -1.15 * reach; NR.rotation.z = -0.1 * reach; nf(t > e.grab ? 'focused' : 'worried'); face = headOf(N);
    if (t < e.sprint) {
      kidSit(K, t); K.neck.rotation.x = -0.3;
      const H0 = K.hipY ?? 2, sitY = K.hips.position.y; K.hips.position.y = lerp(sitY, H0, easeInOut(up)); K.root.position.y = lerp(0.62, 0, easeInOut(up));
      const leg = lerp(-1.25, 0, easeInOut(up)); K.legs[0].rotation.x = leg; K.legs[1].rotation.x = leg; K.arms[1].rotation.x = lerp(-1.05, 0, up); K.arms[1].rotation.z = lerp(-0.32, 0, up);
      K.root.rotation.y = lerp(Math.PI - 0.45, N.root.rotation.y + Math.PI, up * 0.6);
      KL.rotation.x = lerp(-1.05, -1.5, reach); KL.rotation.z = lerp(0.32, 0, reach);
      if (reach >= 1) { const hn = hand(N, 1), hk = hand(K, 0); const d = hn.clone().sub(hk); K.root.position.x += d.x * up; K.root.position.z += d.z * up; NR.rotation.x = -1.15 + 0.25 * up; }
      kf(t > e.grab ? 'surprised' : 'sad');
    }
  }
  // the sprint and the leap: hand in hand, Noah in front
  if (set === 'night' && t >= e.sprint) {
    const k = na.k ?? 0, air = smooth(e.leap, e.leap + 0.25, t) * (1 - smooth(e.through - 0.1, e.through + 0.2, t));
    N.root.position.copy(na.p); N.root.position.y += 1.6 * Math.sin(clamp((t - e.leap) / (e.through + 0.15 - e.leap)) * Math.PI) * (t > e.leap ? 1 : 0); N.root.rotation.y = Math.PI; pose(N, 'run', t * 1.2);
    pose(K, 'run', t * 1.35 + 0.8); K.root.rotation.y = Math.PI;
    NR.rotation.x = 0.85; NR.rotation.z = -0.3; KL.rotation.x = -1.35; KL.rotation.z = 0; KR.rotation.x = 0.4 + Math.sin(t * 16) * 0.4;
    K.root.position.copy(N.root.position); K.root.position.y = N.root.position.y * 0.9; const hn = hand(N, 1), hk = hand(K, 0); K.root.position.x += hn.x - hk.x; K.root.position.z += hn.z - hk.z;
    if (air > 0) { N.legs[0].rotation.x = -0.9; N.legs[1].rotation.x = 0.5; K.legs[0].rotation.x = -0.9; K.legs[1].rotation.x = 0.6; N.arms[0].rotation.x = -2.2; }
    nf('focused'); kf('scared'); void k;
    N.root.visible = K.root.visible = t < e.through + 0.05;
  }

  // ---- the town ----
  if (set === 'town') {
    const land = smooth(e.town, e.town + 0.5, t);
    N.root.position.copy(TW).add(v3(0.9, 0, 0)); N.root.rotation.y = Math.PI - 0.15; pose(N, 'idle', t);
    K.root.position.copy(TW).add(v3(-1.3, 0, 0.3)); K.root.rotation.y = Math.PI - 0.3; pose(K, 'idle', t + 1);
    N.neck.rotation.x = -0.05; nf(n === 'town' ? (t < s(25) + 1.4 ? 'surprised' : 'happy') : 'happy');
    const ty = L(27); kf(n === 'town' ? 'surprised' : 'cute', { viseme: visemeAt(ty.text, ty.start + 0.03, ty.end - 0.03, t) });
    if (n === 'town') { N.neck.rotation.y = 0.5 * Math.sin((t - s(25)) * 1.4); K.root.rotation.y = Math.PI - 0.3 - 0.4 * (1 - land); }
    if (n === 'smile') { K.root.rotation.y = Math.PI + 0.35; K.neck.rotation.x = -0.28; K.neck.rotation.y = 0.2; face = headOf(K, 4.2); N.root.rotation.y = Math.PI - 0.7; }
    if (n === 'notify') { N.neck.rotation.x = -0.3; K.neck.rotation.x = -0.4; nf('surprised'); }
    if (n === 'vanish') {   // they face us, hand in hand, the forest going behind them
      N.root.rotation.y = -0.2; K.root.rotation.y = 0.25; N.arms[0].rotation.x = -0.25; K.arms[1].rotation.x = -0.4; K.arms[1].rotation.z = -0.25; N.arms[0].rotation.z = 0.25;
      nf('happy'); kf('happy');
    }
    if (face == null && n !== 'smile') face = headOf(N);
  }
  // the edge forest dissolves off the map in a wave from the left, sparkles rising where it goes
  const er = (tr) => clamp((t - e.erase - 0.3 - (tr.x + 260) / 520 * 2.4 - (tr.z + 46) / -170 * 0.4) / 0.8);
  if (set === 'town') { W.edge.vanish((tr) => er(tr)); const gone = smooth(e.erase + 0.3, e.erase + 2.6, t); W.edgeGround.material.opacity = 1 - gone; W.edgeGround.material.transparent = gone > 0; W.edgeGround.visible = gone < 0.999; }

  if (n === 'creatures') { N.root.visible = false; K.root.visible = false; }
  if (n === 'darkness') { K.root.visible = false; }
  lights(set, t, sh.pos, face, lo);
  // air
  W.air.update(t); const A = W.air.list;
  A.snowfall.visible = set === 'night'; A.snowWide.visible = n === 'darkness'; A.motes.visible = set === 'night';
  A.gateSpark.visible = set === 'night' && gO > 0.05 && t < e.town; A.closeIn.visible = A.closeIn.visible && set === 'night';
  A.pollen.visible = set === 'town'; A.erase.visible = set === 'town' && t > e.erase; A.rise.visible = n === 'vanish' && t > e.erase + 0.4;
  A.clouds.visible = set === 'town';
  leafTime(t, 0.04);
  const fl = n === 'jump' && t >= e.through - 0.1 ? (t < e.through ? 0.35 * smooth(e.through - 0.1, e.through, t) : 0.4 + 0.3 * smooth(e.through, e.through + 0.5, t)) : n === 'town' && t < e.town + 0.45 ? 0.45 * (1 - clamp((t - e.town) / 0.45)) : 0;
  const shake = n === 'closing' ? 0.25 : n === 'sprint' ? 0.35 : n === 'jump' ? 0.3 * (1 - smooth(e.through, e.through + 0.2, t)) : 0;
  { const cq = new URLSearchParams(location.search).get('cam'); if (cq) { const q = cq.split(',').map(Number); sh.pos = v3(q[0], q[1], q[2]); sh.look = v3(q[3], q[4], q[5]); sh.fov = q[6]; } }
  frame(ctx, t, sh, { shake, shadowSpan: ['darkness', 'vanish', 'gate'].includes(n) ? 110 : 45, flash: fl, flashColor: '#fff6e0',
    steady: ['hook', 'gate', 'survived', 'creatures', 'freezing', 'fire', 'figure', 'lookup', 'smile', 'never', 'missing', 'team'].includes(n) });
  if (first) drawHud(t, n);
  return n;
}

export async function setup() {
  ctx = await initStage('ep25', { look: 'pro', avatars: ['farm_noah', 'farm_red_kid'] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'happy', 'surprised', 'skeptic', 'shocked', 'suspicious', 'nervous', 'worried', 'focused', 'sad', 'scared', 'cute']);
  const { scene, camera } = ctx; camera.far = 3000; camera.near = 0.15; camera.updateProjectionMatrix();
  ctx.cap.style.webkitTextStroke = '22px #000'; ctx.cap.style.textShadow = '0 10px 0 rgba(0,0,0,0.6), 0 0 26px rgba(0,0,0,0.9), 0 0 54px rgba(0,0,0,0.6)';
  rig(); forest(); camp(); town(); people();
  const list = {
    snowfall: snow(scene, { centre: v3(0, 14, -16), size: 70, height: 28, count: 2200, amount: 0.7, pointSize: 0.9 }),
    snowWide: snow(scene, { centre: v3(10, 40, 0), size: 160, height: 80, count: 2500, amount: 0.5, pointSize: 1.4, seed: 4 }),
    motes: dust(scene, { size: 60, height: 14, centre: v3(0, 5, -14), count: 260, color: '#ffb070', amount: 0.25, pointSize: 0.35 }),
    gateSpark: sparkles(scene, { centre: G.clone().add(v3(0, 6, 1.5)), size: 12, height: 12, count: 220, color: '#bff0ff', pointSize: 0.28 }),
    closeIn: burst(scene, { count: 220, color: '#bff0ff', dur: 1.2, spread: 7, height: 9, pointSize: 0.32, bright: 1.3, pos: G.clone().add(v3(0, 1, 0.5)), seed: 7 }),
    pollen: dust(scene, { size: 80, height: 16, centre: TW.clone().add(v3(0, 6, -6)), count: 400, color: '#fff4c8', amount: 0.35, pointSize: 0.4 }),
    erase: sparkles(scene, { centre: TW.clone().add(v3(0, 14, -110)), size: 420, height: 40, count: 1600, color: '#d8ffd0', pointSize: 0.9 }),
    rise: leaves(scene, { count: 220, size: 120, height: 40, centre: TW.clone().add(v3(0, 18, -60)), colors: ['#ffffff', '#fff4b0', '#d8ffe0'], speed: -0.6 }),
    clouds: clouds(scene, { count: 18, y: 190, spread: 1500, size: 34, color: '#ffffff', drift: 0.8, seed: 5 }),
  };
  list.clouds.position.x = TW.x; list.closeIn.fire(EV.through + 0.4);
  W.air = atmos(...Object.values(list)); W.air.list = list;
  hudInit(); W.shots = shots();
  void easeIn; void noise1; void mixP; void glowSprite;
  return expose(ctx, renderAt, EV.sprint + 1.0, EV);
}
