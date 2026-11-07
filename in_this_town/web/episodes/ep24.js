// Episode 24: The Seed That Grew a Whole New Server. A bright Grow-a-Garden town of plots, a seed stall and players; Oliver digs up
// a tiny blue cube seed nobody knows, plants it, and a spiral staircase of glowing cubes grows out of the soil, past the clouds, to a
// floating island of blue glass gardens: SERVER ZERO. A giant white tree carries every player's name, some glowing, some faded; his
// own appears, a branch grows, a glowing seed drops into his hand with a message. Back home, every empty plot in town bursts into bloom.
// World: the town on the ground around the origin (his plot at x = 0, z = 0), the stairs at HP, the island centred at IC (top ~398).
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, DAY } from '../engine/stage.js';
import { Batch, surf, paint, crowd, lamp } from '../engine/kit.js';
import { dust, sparkles, clouds, leaves, burst, atmos } from '../engine/atmos.js';
import { glowSprite } from '../engine/props.js';
import { treeShape, treeSet, nameAtlas, namePatches, heroPatch, carveWord, leafTime, barkMat } from '../engine/forest.js';
import { bushGeo } from '../engine/isles.js';
import { cottage, PASTEL, WIN } from '../engine/pastel.js';
import { cubeSeed, cubeStairs, gardenPlot, seedStall, wateringCan, wheelbarrow, scarecrow, floatingIsland, glassField, nameTree, bloomField, cubeMat } from '../engine/garden.js';

let ctx, L, EV;
const W = {};
const HP = v3(0, 0, 4.4);                 // the hole, and the stairs' axis
const IC = v3(0, 398, -46), IR = 44;      // the island's centre (top at y = 398 on its rim)
const TOP = 398, NST = 360;
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const islandY = (x, z) => { const lx = x - IC.x, lz = z - IC.z, d = Math.min(1, Math.hypot(lx, lz) / IR); return TOP + 0.9 * (1 - d * d) + 0.25 * Math.sin(lx * 0.3) * Math.cos(lz * 0.27); };
const TP = () => v3(0, islandY(0, -60) - 0.35, -60);   // the name tree's base

// ---- palettes ----
const GDAY = { ...DAY, ...P({ top: '#3b8ff0', horizon: '#d6f0ff', haze: '#cfe8ff', sunColor: '#fff1d6', hemiSky: '#d2e9ff', hemiGround: '#7a9a5a' }),
  sunI: 2.5, sunDir: v3(0.85, 0.7, 0.2), sunDisc: 1, hemiI: 0.92, amb: 0.15, envI: 0.9, exposure: 1.0, bloom: 0.16, fogNear: 320, fogFar: 1500, saturation: 1.16, contrast: 1.05, bounce: 0.3 };
const SKY = { ...GDAY, ...P({ top: '#2a63d8', horizon: '#ffe4c8', haze: '#e6ecff', sunColor: '#fff0dc', hemiSky: '#dae4ff', hemiGround: '#7a8ab0' }),
  sunI: 2.4, sunDir: v3(0.5, 0.62, 0.6), hemiI: 0.95, envI: 0.95, exposure: 1.0, bloom: 0.15, fogNear: 600, fogFar: 2800, saturation: 1.14, contrast: 1.05 };
const GOLDEN = { ...GDAY, ...P({ top: '#4f78e0', horizon: '#ffd2a2', haze: '#ffdcbc', sunColor: '#ffd8a4', hemiSky: '#ffe4cc', hemiGround: '#8a8a5a' }),
  sunI: 2.5, sunDir: v3(0.8, 0.42, 0.42), sunSize: 1.4, exposure: 1.02, saturation: 1.2, bloom: 0.14 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return {
    lift: s(0) + 2.0, find: s(0) + 1.2, plant: s(4) + 0.7, sprout: s(5) + 1.45, top: e(6) + 0.1,
    arrive: s(8) + 1.2, sign: s(13) - 0.1, name: s(19) + 0.55, branch: s(20) + 0.1, drop: s(21) + 0.35, catch: s(21) + 1.15,
    msg: s(22) + 0.45, ret: s(24) - 0.1, bloom: s(24) + 1.1, end: ctx.dur,
  };
}
const growH = (t) => TOP + 6 > 0 ? (TOP + 6) * Math.pow(smooth(EV.sprout, EV.top, t), 1.25) : 0;

// ---- the town of plots ----
function town() {
  const g = new THREE.Group(); ctx.scene.add(g); W.town = g;
  const b = new Batch(), r = rng(24);
  b.box(surf('grass', '#7ccb58'), 1600, 0.2, 1200, 0, -0.1, -100, { r: 0.02 });
  // dirt paths between the plots, a road with pavements in front
  const path = surf('sand', '#d9bd86', { roughness: 0.95 });
  for (let x = -112; x <= 112; x += 32) b.box(path, 8, 0.12, 150, x + 16 === 128 ? x : x - 16 + 32 - 16, 0.02, -40, { r: 0.02 });
  for (let z = 16; z >= -112; z -= 32) b.box(path, 236, 0.12, 8, 0, 0.03, z, { r: 0.02 });
  b.box(paint('#5d616b', { roughness: 0.92 }), 1600, 0.14, 12, 0, 0.06, 30, { r: 0.02 });
  for (let x = -600; x < 600; x += 9) b.box(paint('#f3e6b0', { roughness: 0.7 }), 4, 0.05, 0.36, x, 0.14, 30, { r: 0.02 });
  for (const s of [-1, 1]) b.box(surf('concrete', '#ebe5dc'), 1600, 0.36, 4, 0, 0.18, 30 + s * 8, { r: 0.04 });
  // plots: ours (front row, x = 0) keeps its back rows of crops and a bare front; the rest are mixed farms or empty
  W.plots = []; W.empty = [];
  const xs = [-96, -64, -32, 0, 32, 64, 96], zs = [0, -32, -64, -96];
  const emptySet = new Set(['-64,0', '32,0', '96,0', '-96,-32', '-32,-32', '64,-32', '0,-64', '-64,-64', '96,-64', '32,-64', '-96,-96', '-32,-96', '64,-96', '0,-96', '32,-32']);
  for (const z of zs) for (const x of xs) {
    const ours = x === 0 && z === 0, empty = !ours && emptySet.has(`${x},${z}`);
    gardenPlot(b, x, z, { w: 24, d: 24, kind: empty ? 'empty' : 'mixed', seed: Math.abs(x * 7 + z * 3) % 6, skip: ours ? (j, k) => k > -4 : null });
    (empty ? W.empty : W.plots).push({ x, z });
  }
  // our plot's props: a scarecrow, a watering can, a wheelbarrow, a little sign
  const sc = scarecrow(); sc.position.set(-9.2, 0.45, -1.5); sc.rotation.y = 0.3; g.add(sc);
  const wc = wateringCan(); wc.position.set(8.4, 0.45, 1.5); wc.rotation.y = -0.6; g.add(wc);
  const wb = wheelbarrow(); wb.position.set(16.8, 0, 8); wb.rotation.y = -1.2; g.add(wb);
  b.cyl(paint('#6e4a2c'), 0.12, 0.12, 2.4, 10.5, 1.2, 12.6); b.box(surf('plank', '#d8b884'), 2.6, 1.1, 0.16, 10.5, 2.4, 12.75, { r: 0.04 });
  // hedges and flower boxes along the road, lamps
  const hm = new THREE.InstancedMesh(bushGeo(), new THREE.MeshStandardMaterial({ color: '#3f8f3c', roughness: 0.85, flatShading: true }), 90), M = new THREE.Matrix4(), q = new THREE.Quaternion();
  let hi = 0; for (let x = -150; x < 150; x += 3.4) { if (hi >= 90) break; if (Math.abs(x + 16) < 7) continue; M.compose(v3(x, 0.8, 21.5), q, v3(1.1, 0.9, 0.8)); hm.setMatrixAt(hi++, M); }
  hm.count = hi; hm.castShadow = true; hm.receiveShadow = true; g.add(hm);
  for (let x = -128; x <= 128; x += 32) { const lm = lamp({ height: 12 }); lm.position.set(x + 9, 0, 23.5); lm.rotation.y = Math.PI / 2; g.add(lm); }
  // the seed stall on the path by our plot, its front towards the plots
  W.stall = seedStall(); W.stall.position.set(-17.5, 0, 21.5); W.stall.rotation.y = Math.PI; g.add(W.stall);
  // cottages across the road and behind the farms
  W.houses = []; let k = 0;
  for (let x = -150; x <= 150; x += 30) { const c = cottage({ seed: 60 + k, wall: PASTEL[k % PASTEL.length], porch: true }); c.g.position.set(x, 0, 62); c.g.rotation.y = Math.PI; g.add(c.g); W.houses.push(c); k++; }
  for (let x = -135; x <= 135; x += 30) { const c = cottage({ seed: 90 + k, wall: PASTEL[(k * 3) % PASTEL.length], porch: true }); c.g.position.set(x, 0, -150); g.add(c.g); W.houses.push(c); k++; }
  // trees round the farms and along the streets
  const shapes = [treeShape({ seed: 3, h: 10, r0: 0.9, r1: 0.5, spread: 7.5, clumps: 12, cols: ['#2f6a33', '#4f9a3f', '#9fd06a'] }), treeShape({ seed: 7, h: 12, r0: 1.0, r1: 0.5, spread: 8, clumps: 12, cols: ['#2a5a2e', '#468a3a', '#8cc85a'] })];
  const list = [];
  for (let x = -150; x <= 150; x += 22) { list.push({ x: x + r() * 6, z: 44 + r() * 4, s: 1 + r() * 0.3, yaw: r() * 6, shape: Math.floor(r() * 2) }); list.push({ x: x + r() * 6, z: -126 - r() * 6, s: 1.1 + r() * 0.3, yaw: r() * 6, shape: Math.floor(r() * 2) }); }
  for (let z = -110; z <= 10; z += 20) for (const x of [-136, 136]) list.push({ x: x + (r() - 0.5) * 6, z, s: 1.2 + r() * 0.3, yaw: r() * 6, shape: Math.floor(r() * 2) });
  for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, d = 230 + r() * 250; list.push({ x: Math.cos(a) * d, z: -60 + Math.sin(a) * d, s: 1.4 + r(), yaw: r() * 6, shape: Math.floor(r() * 2) }); }
  W.trees = treeSet(ctx.scene, shapes, list); W.treeList = list;
  for (const [x, z, h] of [[-420, -500, 90], [120, -560, 120], [520, -420, 100], [-500, 200, 80], [420, 320, 110]]) { const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), surf('grass', '#74b85c')); hill.scale.set(h * 2.6, h, h * 1.6); hill.position.set(x, -h * 0.35, z); hill.receiveShadow = true; g.add(hill); }
  b.done(g);
  // the hole: a dark dug patch with a ring of loose soil
  const hb = new Batch(), loose = surf('sand', '#6a4630', { roughness: 1 });
  hb.add(loose, new THREE.TorusGeometry(0.75, 0.22, 8, 20), HP.x, 0.5, HP.z, 0, Math.PI / 2, 0);
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; hb.add(loose, new THREE.SphereGeometry(0.22 + (i % 3) * 0.06, 8, 6), HP.x + Math.cos(a) * 1.1, 0.48, HP.z + Math.sin(a) * 1.0); }
  W.hole = hb.done(); g.add(W.hole);
  const holeIn = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 1 })); holeIn.rotation.x = -Math.PI / 2; holeIn.position.set(HP.x, 0.47, HP.z); g.add(holeIn); W.holeIn = holeIn;
  W.mound = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), surf('sand', '#6a4630', { roughness: 1 })); W.mound.scale.set(1, 0.35, 1); W.mound.position.set(HP.x, 0.45, HP.z); g.add(W.mound);
  // players around the farms (JS-built extras), standing on the paths
  W.extras = [];
  for (const [x, z, n, lx, lz] of [[-48, 16, 2, -48, 0], [16, -16, 2, 32, -16], [-16, -48, 3, -32, -48], [48, -80, 2, 64, -80], [80, 16, 2, 80, 0], [-80, -16, 2, -96, -16]]) {
    const c = crowd({ count: n, w: 4, d: 2.5, look: v3(lx, 0, lz), cheer: 0, seed: Math.abs(x + z) + 3 }); c.position.set(x, 0.05, z); ctx.scene.add(c); W.extras.push(c);
  }
  // the players who gather round Oliver on the path (the chat shot)
  W.gather = crowd({ count: 6, w: 12, d: 3, look: v3(0, 0, -6), cheer: 0.2, seed: 77 }); W.gather.position.set(-6, 0.05, 20.2); ctx.scene.add(W.gather);
  // bloom: flowers on every empty plot and the bare front of ours, blossom puffs on the trees
  const spots = [];
  for (const p of W.empty) for (let i = 0; i < 9; i++) for (let j = 0; j < 8; j++) spots.push({ x: p.x - 10 + i * 2.5 + (r() - 0.5) * 1.2, z: p.z - 9.5 + j * 2.7 + (r() - 0.5) * 1.2, y: 0.45 });
  for (let i = 0; i < 46; i++) { let x, z; do { x = (r() - 0.5) * 22; z = -1.5 + r() * 13; } while (Math.hypot(x - HP.x, z - HP.z) < 1.8 || (x > 3.4 && x < 7.4 && z > 7 && z < 11.5)); spots.push({ x, z, y: 0.45 }); }
  for (let x = -150; x < 150; x += 1.6) spots.push({ x: x + (r() - 0.5) * 0.6, z: 19.6 + (r() - 0.5) * 0.4, y: 0.05 });
  W.bloom = bloomField(ctx.scene, spots, { seed: 9, speed: 28, centre: HP.clone() });
  const bl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffb8d8', roughness: 0.7, flatShading: true }), list.length * 6), bc = new THREE.Color();
  W.blossoms = list.flatMap((t, i) => [0, 1, 2, 3, 4, 5].map((k2) => ({ x: t.x + Math.cos(k2 * 1.05 + i) * (k2 > 3 ? 1.2 : 3.4) * t.s, y: (k2 > 3 ? 14.5 : 11 + (k2 % 2) * 2.5) * t.s, z: t.z + Math.sin(k2 * 1.05 + i) * (k2 > 3 ? 1.2 : 3.4) * t.s, s: (2.4 + (k2 % 3) * 0.6) * t.s, c: ['#ffb8d8', '#ffffff', '#ff8ac0', '#ffe08a', '#ffd0e8', '#ff9ec8'][(i + k2) % 6] })));
  {
    const cp = [], cols = ['#ff5fa2', '#ffd23a', '#b06bff', '#ff4a4a', '#ffffff', '#ff9a3a', '#5fb8ff', '#ff8ad8'], rc = rng(91);
    const inPlot = (x, z) => Math.abs(z - 2) < 1e9 && [-96, -64, -32, 0, 32, 64, 96].some((px) => Math.abs(x - px) < 13) && [0, -32, -64, -96].some((pz) => Math.abs(z - pz) < 13);
    for (const p of W.empty) for (let i = 0; i < 21; i++) for (let j = 0; j < 21; j++) cp.push({ x: p.x - 10.5 + i * 1.05 + (rc() - 0.5) * 0.4, y: 0.5, z: p.z - 10.5 + j * 1.05 + (rc() - 0.5) * 0.4, s: 0.36 + rc() * 0.22 });
    for (let i = 0; i < 16000; i++) { const x = (rc() - 0.5) * 420, z = -230 + rc() * 400;
      if (inPlot(x, z) || Math.abs(z - 30) < 11 || (z > 50 && z < 74 && Math.abs(x) < 165) || (z < -138 && z > -162 && Math.abs(x) < 150) || (Math.abs(x) < 125 && z < 18 && z > -112)) continue;
      cp.push({ x, y: 0.15, z, s: 0.9 + rc() * 0.9 }); }
    const cm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0).scale(1, 0.55, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, flatShading: true, emissive: '#331a22', emissiveIntensity: 0.25 }), cp.length);
    cp.forEach((p, i) => { p.d = Math.hypot(p.x - HP.x, p.z - HP.z); cm.setColorAt(i, bc.set(cols[Math.floor(rc() * cols.length)])); });
    cm.frustumCulled = false; cm.receiveShadow = true; ctx.scene.add(cm); W.carpet = cp; W.carpetMesh = cm;
  }
  W.blossoms.forEach((p, i) => bl.setColorAt(i, bc.set(p.c))); bl.frustumCulled = false; bl.castShadow = true; ctx.scene.add(bl); W.blossomMesh = bl;
}

// ---- the island: glass gardens, path, sign, lamps, a pond, the name tree ----
function island() {
  const isl = floatingIsland({ R: IR, depth: 86, seed: 24, falls: [[0.35, 6], [2.5, 4], [3.6, 7], [5.3, 3.5]] });
  isl.position.copy(IC); ctx.scene.add(isl); W.isl = isl;
  const g = new THREE.Group(); ctx.scene.add(g); W.islG = g;
  const b = new Batch(), r = rng(31), Y = islandY;
  const stone = surf('cobble', '#e8e2d8'), white = paint('#f4f0ea', { roughness: 0.6 });
  // the path from the stairs to the tree, and a ring round the tree
  for (let z = -2; z > -48; z -= 2) b.box(stone, 4.6, 0.3, 2.1, 0, Y(0, z) + 0.02, z, { r: 0.08 });
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, x = Math.cos(a) * 13, z = -60 + Math.sin(a) * 13; b.box(stone, 2.6, 0.3, 2.2, x, Y(x, z) + 0.02, z, { r: 0.08, ry: -a }); }
  // the bridge from the top step onto the rim
  b.box(cubeMat({ glow: 1.1 }), 3.2, 0.5, 3.4, 0, TOP - 0.25, -1.4, { r: 0.08 });
  // garden beds: white stone kerbs, rows each side of the path
  const beds = [];
  for (const sx of [-1, 1]) for (let z = -8; z > -44; z -= 9) { const x = sx * 10, w = 11, d = 7; beds.push({ x, z, w, d });
    for (const s of [-1, 1]) { b.box(white, w, 0.6, 0.5, x, Y(x, z + s * d / 2) + 0.2, z + s * d / 2, { r: 0.12 }); b.box(white, 0.5, 0.6, d, x + s * w / 2, Y(x + s * w / 2, z) + 0.2, z, { r: 0.12 }); }
    b.box(surf('sand', '#5a4a6a', { roughness: 1 }), w - 0.6, 0.3, d - 0.6, x, Y(x, z) + 0.05, z, { r: 0.05 }); }
  // path lamps: white posts with glass orbs
  W.orbs = [];
  const orbM = new THREE.MeshStandardMaterial({ color: '#c8f2ff', emissive: '#5fc8ff', emissiveIntensity: 2.2, roughness: 0.1 });
  for (let z = -4; z > -46; z -= 7) for (const s of [-1, 1]) { const x = s * 3.4, y = Y(x, z); b.cyl(white, 0.16, 0.22, 3.6, x, y + 1.8, z); b.cyl(white, 0.34, 0.34, 0.2, x, y + 3.65, z, { seg: 12 }); const o = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), orbM); o.position.set(x, y + 4.1, z); o.userData.noAO = true; g.add(o); }
  // a glass arch over the path
  const arch = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.28, 10, 40, Math.PI), cubeMat({ glow: 0.9 })); arch.position.set(0, Y(0, -31), -31); g.add(arch);
  const arch2 = arch.clone(); arch2.position.z = -33; g.add(arch2);
  // the pond, with glass lily pads
  const pond = new THREE.Mesh(new THREE.CircleGeometry(6.5, 40), new THREE.MeshStandardMaterial({ color: '#4ab8ff', emissive: '#1a6ad8', emissiveIntensity: 0.5, roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.88 }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(-24, Y(-24, -24) + 0.12, -24); g.add(pond); W.pond = pond;
  for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28, x = -24 + Math.cos(a) * 7, z = -24 + Math.sin(a) * 7; b.add(white, new THREE.SphereGeometry(0.8 + r() * 0.4, 8, 6).scale(1, 0.5, 1), x, Y(x, z) + 0.1, z); }
  // the wooden sign: two posts, a plank board with SERVER ZERO painted on (faces the arrival)
  W.signPos = v3(8.5, Y(8.5, -21.6), -21.6);
  const sgn = new THREE.Group(); sgn.position.copy(W.signPos); sgn.rotation.y = -0.25; g.add(sgn);
  const sb = new Batch(), wood = surf('plank', '#9a6a3c'), dark = paint('#5a3a1e', { roughness: 0.85 });
  for (const s of [-1, 1]) sb.box(dark, 0.4, 5.4, 0.4, s * 2.4, 2.7, 0, { r: 0.08 });
  sb.box(wood, 6.2, 2.2, 0.35, 0, 4.1, 0.15, { r: 0.12, rz: 0.03 }); sb.done(sgn);
  const st = document.createElement('canvas'); st.width = 1024; st.height = 360; { const x = st.getContext('2d');
    x.fillStyle = '#a8763f'; x.fillRect(0, 0, 1024, 360); const rr = rng(4);
    for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(${90 + rr() * 30},${55 + rr() * 20},${25},0.35)`; x.lineWidth = 2 + rr() * 3; x.beginPath(); const y = rr() * 360; x.moveTo(0, y); x.bezierCurveTo(300, y + (rr() - 0.5) * 20, 700, y + (rr() - 0.5) * 20, 1024, y + (rr() - 0.5) * 10); x.stroke(); }
    x.fillStyle = 'rgba(60,35,15,0.5)'; x.fillRect(0, 118, 1024, 5); x.fillRect(0, 238, 1024, 5);
    x.font = '900 150px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(40,22,8,0.55)'; x.fillText('SERVER ZERO', 518, 190); x.fillStyle = '#fff2d2'; x.fillText('SERVER ZERO', 512, 184); }
  const stx = new THREE.CanvasTexture(st); stx.colorSpace = THREE.SRGBColorSpace; stx.anisotropy = 8;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 2.0), new THREE.MeshStandardMaterial({ map: stx, roughness: 0.75 })); face.position.set(0, 4.1, 0.34); face.rotation.z = 0.03; face.receiveShadow = true; sgn.add(face);
  b.done(g);
  // glass plants: in the beds, and over the rest of the island
  const plants = [], kinds = ['tulip', 'crystal', 'mush', 'fern', 'bell', 'tulip', 'crystal', 'fern'];
  for (const bd of beds) for (let i = 0; i < 22; i++) { const x = bd.x + (r() - 0.5) * (bd.w - 1.6), z = bd.z + (r() - 0.5) * (bd.d - 1.6); plants.push({ x, z, y: Y(x, z) + 0.15, kind: kinds[Math.floor(r() * kinds.length)], s: 0.8 + r() * 0.7, ry: r() * 6 }); }
  for (let i = 0; i < 900 && plants.length < 760; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (IR - 3), x = IC.x + Math.cos(a) * d, z = IC.z + Math.sin(a) * d;
    if (Math.abs(x) < 4.5 && z > -50) continue;
    if (Math.hypot(x, z + 60) < 16 || Math.hypot(x + 24, z + 24) < 8.5 || Math.hypot(x - W.signPos.x, z - W.signPos.z) < 4) continue;
    if (beds.some((bd) => Math.abs(x - bd.x) < bd.w / 2 + 1 && Math.abs(z - bd.z) < bd.d / 2 + 1)) continue;
    const kind = r() < 0.12 ? 'tree' : r() < 0.15 ? 'hedge' : kinds[Math.floor(r() * kinds.length)];
    plants.push({ x, z, y: Y(x, z), kind, s: kind === 'tree' ? 1 + r() * 0.8 : 0.9 + r() * 0.9, ry: r() * 6 });
  }
  W.glass = glassField(g, plants);
  // the tree
  const tr = nameTree({ seed: 24, h: 44, r0: 6, r1: 2.8, spread: 30, clumps: 34, flare: 3.2 });
  tr.g.position.copy(TP()); ctx.scene.add(tr.g); W.tree = tr;
  const ra = rng(55);
  const NAMES = ['xXBlazeXx', 'PixelPanda', 'Noob_Master22', 'SkyBuilder', 'CoolKid_07', 'LunaStar', 'BaconHair99', 'GardenGuru', 'TurboTom', 'MiaPlays',
    'KaiTheGreat', 'ZoeyBloxx', 'JakeyJ', 'LilyPetals', 'DanTheMan', 'FrostByte', 'EmmaRuns', 'NoahNights', 'BellaBlush', 'ToyFanTV', 'RobloxRacer', 'QueenSlay',
    'GhostlyGabe', 'SunnySide', 'MoonWalker8', 'DinoDude', 'StarSeeker', 'OceanEyes', 'RedRover', 'BlueJay77', 'GoldenGoose', 'Nova_X', 'Pixel_Pete', 'Sprout_Sam', 'Willow_W', 'Finn_Flash'];
  const atlas = nameAtlas(NAMES); W.atlas = atlas;
  const mk = (n, on, yLo, yHi, avoid) => { const out = []; let guard = 0; while (out.length < n && guard++ < n * 20) {
    const y = yLo + ra() * (yHi - yLo), a = (ra() - 0.5) * Math.PI * 2;
    if (avoid && Math.abs(a) < 0.62 && y > 5.0 && y < 13.6) continue;
    out.push({ y, a, r: tr.radius(y) + 0.04, cell: atlas.cells[NAMES[Math.floor(ra() * NAMES.length)]], on: on() }); } return out; };
  W.namesLit = namePatches(ctx.scene, atlas, mk(330, () => -3 - ra() * 4, 2.2, 34, true), { arc: 0.3, color: '#7fd8ff', bright: 2.2 });
  W.namesFade = namePatches(ctx.scene, atlas, mk(110, () => -3 - ra() * 4, 2.2, 30, true), { arc: 0.3, color: '#9fe4ff', bright: 2.2 });
  W.namesDark = namePatches(ctx.scene, atlas, mk(150, () => 1e9, 2.2, 34, true), { arc: 0.3, color: '#7fd8ff', bright: 2.2 });
  tr.g.updateMatrixWorld(true);
  for (const set of [W.namesLit, W.namesFade, W.namesDark]) { set.list.forEach((p, i) => set.place(p, i, tr.g.matrixWorld)); set.done(); }
  // OLIVER: carved, and lit letter by letter
  const ny = 8.0, nh = 1.7, R1 = tr.radius(ny + nh / 2) + 0.08, R0 = tr.radius(ny - nh / 2) + 0.08;
  W.oname = heroPatch(tr.g, { r: R1, r2: R0, y: ny, a: 0, arc: 0.95, h: nh, px: 2048, draw(c, gl, s, w, h) {
    if (s.k <= 0) return;
    c.save(); c.beginPath(); c.rect(0, 0, w * (0.05 + 0.95 * s.k), h); c.clip(); carveWord(c, 'OLIVER', w / 2, h / 2, w * 0.86, h * 0.7, rng(9), 'rgba(10,30,70,0.9)'); c.restore();
    const off = document.createElement('canvas'); off.width = w; off.height = h; const o = off.getContext('2d');
    carveWord(o, 'OLIVER', w / 2, h / 2, w * 0.86, h * 0.7, rng(9), '#ffffff'); o.globalCompositeOperation = 'source-in'; o.fillStyle = '#4fd2ff'; o.fillRect(0, 0, w, h);
    gl.save(); gl.beginPath(); gl.rect(0, 0, w * (0.05 + 0.95 * s.k), h); gl.clip();
    gl.filter = 'blur(30px)'; gl.globalAlpha = 1; gl.drawImage(off, 0, 0); gl.drawImage(off, 0, 0); gl.filter = 'blur(8px)'; gl.drawImage(off, 0, 0); gl.filter = 'none'; gl.drawImage(off, 0, 0);
    gl.restore(); } });
  W.oname.set({ k: 0 });
  W.nameY = ny;
  // the branch that grows out of the trunk over his name, with a glowing bud
  const by = 12.4, br = tr.radius(by), bg = new THREE.Group(); bg.position.set(0.6, by, br - 0.6); tr.g.add(bg); W.branch = bg;
  const curve = new THREE.CatmullRomCurve3([v3(0, 0, 0), v3(1.4, 0.6, 0.5), v3(2.9, 1.2, 0.8), v3(4.0, 1.4, 0.7)]);
  const brM = new THREE.MeshStandardMaterial({ color: '#e9edf6', roughness: 0.85 }); const bm = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.28, 8), brM); bm.castShadow = true; bg.add(bm);
  const twig = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(2.2, 0.9, 0.7), v3(2.7, 1.6, 1.2), v3(2.6, 2.3, 1.6)]), 10, 0.12, 6), brM); bg.add(twig);
  const lfM = new THREE.MeshStandardMaterial({ color: '#a8eaff', emissive: '#3aa0ff', emissiveIntensity: 0.9, roughness: 0.1, flatShading: true, transparent: true, opacity: 0.9 });
  for (const [x, y, z, s] of [[2.6, 2.4, 1.6, 0.55], [1.8, 1.4, 1.0, 0.45], [3.3, 1.1, 0.2, 0.5], [1.2, 0.4, 0.8, 0.4]]) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), lfM); l.position.set(x, y, z); l.scale.set(1, 0.4, 1.3); bg.add(l); }
  W.bud = glowSprite('#7fdcff', 2.4, 0); W.bud.position.set(4.0, 1.0, 0.7); W.bud.userData.noAO = true; bg.add(W.bud);
  bg.updateMatrixWorld(true); W.budWorld = v3(4.0, 1.0, 0.7); bg.localToWorld(W.budWorld);
}

// ---- Oliver, the seeds, the trowel ----
function people() {
  const sc = ctx.scene;
  W.ol = makeCharacter({ avatar: 'farm_oliver', alti: true, skin: '#f2c79a', caustic: false }); sc.add(W.ol.root);
  boldFace(W.ol);
  W.seed = cubeSeed({ size: 0.5 }); sc.add(W.seed);
  W.seedGlow = glowSprite('#5fc0ff', 2.2, 0.7); W.seedGlow.userData.noAO = true; W.seed.add(W.seedGlow);
  W.seed2 = cubeSeed({ size: 0.42, sprout: true, glow: 2.0 }); sc.add(W.seed2);
  W.seed2Glow = glowSprite('#9fe8ff', 2.6, 0.8); W.seed2Glow.userData.noAO = true; W.seed2.add(W.seed2Glow);
  // the trowel in his right hand
  const tw = new THREE.Group(), tb = new Batch();
  tb.cyl(paint('#c8463a', { roughness: 0.5 }), 0.11, 0.13, 0.9, 0, 0.45, 0); tb.cyl(paint('#b8bcc4', { metalness: 0.8, roughness: 0.3 }), 0.05, 0.05, 0.3, 0, 1.0, 0);
  tb.add(paint('#c8ccd4', { metalness: 0.85, roughness: 0.25 }), new THREE.ConeGeometry(0.34, 1.0, 4, 1).scale(1, 1, 0.25), 0, 1.6, 0, Math.PI / 4);
  tb.done(tw); tw.rotation.set(Math.PI / 2 + 0.4, 0, 0); tw.position.set(0, -2.0, 0.15); W.ol.arms[1].add(tw); W.trowel = tw;
}
// the face reads in every close-up: the face sheet's dark lines are made bold and dark (Episode 23's fix)
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
  W.pl = []; for (let i = 0; i < 8; i++) { const l = new THREE.PointLight('#ffffff', 0, 40, 1.6); ctx.scene.add(l); W.pl.push(l); }
  const s = new THREE.SpotLight('#ffffff', 0, 90, 0.5, 0.5, 1.2); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0008; s.shadow.normalBias = 0.04; ctx.scene.add(s); ctx.scene.add(s.target); W.key = s;
}
// the face key sits on the camera's side, a little to one side and above, so it never backlights the hair
const keyFrom = (face, cam) => { const d = cam.clone().sub(face); d.y = 0; d.normalize(); return face.clone().add(v3(d.x * 8 - d.z * 4, 6, d.z * 8 + d.x * 4)); };
function lights(set, t, focus, face) {
  const pl = W.pl; pl.forEach((l) => { l.intensity = 0; }); W.key.intensity = 0;
  const e = EV;
  if (set === 'garden' || set === 'return') {
    // the seed's own blue glow, a soft warm face key from the camera side
    const sp = W.seed.visible ? W.seed.getWorldPosition(v3(0, 0, 0)) : null;
    if (sp) { pl[0].position.copy(sp).add(v3(0, 0.5, 0.3)); pl[0].color.set('#4fb0ff'); pl[0].intensity = 22; pl[0].distance = 7; }
    if (face) { W.key.position.copy(keyFrom(face, focus)); W.key.target.position.copy(face); W.key.color.set('#fff2e2'); W.key.intensity = 45; W.key.angle = 0.32; W.key.distance = 40; }
    if (set === 'return' && W.seed2.visible) { const q = W.seed2.getWorldPosition(v3(0, 0, 0)); pl[1].position.copy(q).add(v3(0, 0.6, 0.4)); pl[1].color.set('#8fe0ff'); pl[1].intensity = 26; pl[1].distance = 8; }
    const H = growH(t);
    if (H > 0.5) { pl[2].position.set(HP.x, Math.min(H, 30) * 0.5 + 2, HP.z); pl[2].color.set('#4fb8ff'); pl[2].intensity = 260 * clamp(H / 10); pl[2].distance = 45; }
  } else {
    // the island: blue glows in the beds, a light on the trunk's names, a warm key on Oliver's face
    const blues = [v3(-10, 0, -12), v3(10, 0, -21), v3(-10, 0, -30), v3(10, 0, -39)];
    blues.forEach((b2, i) => { pl[i].position.set(b2.x, islandY(b2.x, b2.z) + 2.5, b2.z); pl[i].color.set('#3f9cff'); pl[i].intensity = 60; pl[i].distance = 16; });
    pl[4].position.copy(TP()).add(v3(0, 10.5, 8.2)); pl[4].color.set('#6fd0ff'); pl[4].intensity = 40 + 80 * smooth(e.name - 0.2, e.name + 0.8, t); pl[4].distance = 11;
    if (W.seed2.visible) { const q = W.seed2.getWorldPosition(v3(0, 0, 0)); pl[5].position.copy(q).add(v3(0, 0.5, 0.5)); pl[5].color.set('#8fe0ff'); pl[5].intensity = 30; pl[5].distance = 8; }
    if (face) { W.key.position.copy(keyFrom(face, focus)); W.key.target.position.copy(face); W.key.color.set('#fff0e0'); W.key.intensity = 40; W.key.angle = 0.3; W.key.distance = 40; }
  }
  void focus;
}

// ---- HUD ----
const F = (px, w = 900) => `${w} ${px}px ITTInter, sans-serif`;
function hudInit() { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; c.style.cssText = 'position:absolute;inset:0;pointer-events:none;'; ctx.grade.after(c); W.hud = c; W.h2 = c.getContext('2d'); }
const pop = (k) => { const c = clamp(k); return c <= 0 ? 0 : 1 + 2.2 * Math.pow(c - 1, 3) + 1.2 * Math.pow(c - 1, 2); };
function rr(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
function card(x, cx, cy, w, h, k, draw, o = {}) {
  if (k <= 0) return; x.save(); x.translate(cx, cy); x.scale(k, k);
  x.shadowColor = 'rgba(0,0,0,0.4)'; x.shadowBlur = 30; x.fillStyle = o.bg || 'rgba(255,255,255,0.97)'; rr(x, -w / 2, -h / 2, w, h, 30); x.fill(); x.shadowBlur = 0;
  if (o.edge) { x.strokeStyle = o.edge; x.lineWidth = 6; x.stroke(); }
  draw(x, w, h); x.restore();
}
function cubeIcon(c, x, y, s) {
  c.save(); c.translate(x, y);
  const g = c.createLinearGradient(-s, -s, s, s); g.addColorStop(0, '#5fc8ff'); g.addColorStop(1, '#1650c8'); c.fillStyle = g; rr(c, -s, -s, 2 * s, 2 * s, s * 0.18); c.fill();
  c.strokeStyle = '#dff8ff'; c.lineWidth = s * 0.16; c.stroke(); c.restore();
}
function drawHud(t, n) {
  const x = W.h2; x.clearRect(0, 0, 1080, 1920); if (ctx.thumbMode) return;
  const e = EV, s = (i) => L(i).start;
  x.textBaseline = 'middle';
  if (n === 'dig' && t > e.lift + 0.15) {   // the item toast
    const k = pop((t - e.lift - 0.15) / 0.28);
    card(x, 540, 330, 700, 190, k, (c, w, h) => {
      cubeIcon(c, -w / 2 + 95, 0, 52);
      c.textAlign = 'left'; c.fillStyle = '#6a7090'; c.font = F(30); c.fillText('NEW ITEM', -w / 2 + 180, -40);
      c.fillStyle = '#20232e'; c.font = F(56); c.fillText('??? Seed', -w / 2 + 180, 20);
      c.fillStyle = '#9aa0b8'; c.font = F(28, 700); c.fillText('Rarity: ???', -w / 2 + 180, 66);
    });
  }
  if (n === 'shop') {   // the seed shop's list, searched: nothing
    const k = pop((t - s(1) + 0.05) / 0.28);
    card(x, 540, 420, 900, 520, k, (c, w, h) => {
      c.fillStyle = '#2fb85a'; rr(c, -w / 2, -h / 2, w, 92, 30); c.fill(); c.fillRect(-w / 2, -h / 2 + 50, w, 42);
      c.fillStyle = '#ffffff'; c.font = F(50); c.textAlign = 'center'; c.fillText('SEED SHOP', 0, -h / 2 + 48);
      const seeds = [['Carrot', '#ff8a1e', '10'], ['Strawberry', '#ff3a5a', '50'], ['Blueberry', '#4a5ae8', '400'], ['Tomato', '#e8321e', '800'], ['Corn', '#ffd84a', '1.3K'], ['Pumpkin', '#ff8c1a', '3K']];
      seeds.forEach(([nm, col, pr], i) => { const cx = -w / 2 + 155 + (i % 3) * 295, cy = -h / 2 + 175 + Math.floor(i / 3) * 150;
        c.fillStyle = '#f2f4f8'; rr(c, cx - 130, cy - 60, 260, 125, 20); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(cx - 72, cy, 34, 0, 7); c.fill();
        c.textAlign = 'left'; c.fillStyle = '#20232e'; c.font = F(28); c.fillText(nm, cx - 28, cy - 18); c.fillStyle = '#20a050'; c.font = F(28); c.fillText('$' + pr, cx - 28, cy + 22); });
      const q = smooth(s(1) + 0.15, s(1) + 0.65, t), txt = 'blue cube'.slice(0, Math.round(q * 9));
      c.fillStyle = '#eef0f5'; rr(c, -w / 2 + 30, h / 2 - 110, w - 60, 80, 40); c.fill();
      c.textAlign = 'left'; c.fillStyle = '#8a90a8'; c.font = F(32, 700); c.fillText('Search:', -w / 2 + 70, h / 2 - 70); c.fillStyle = '#20232e'; c.font = F(36); c.fillText(txt + (Math.sin(t * 12) > 0 && q < 1 ? '|' : ''), -w / 2 + 200, h / 2 - 70);
      if (t > s(1) + 0.75) { c.textAlign = 'right'; c.fillStyle = '#e04a4a'; c.font = F(32); c.fillText('0 results', w / 2 - 66, h / 2 - 70); }
    });
  }
  if (n === 'chat') {   // the server's chat
    const msgs = [['MiaPlays', '#ff6fa8', 'what seed is that??'], ['GardenGuru', '#5ad05a', 'never seen that before'], ['xXBlazeXx', '#ffb03a', 'its not in the shop'], ['BaconHair99', '#5ab0ff', 'idk lol']];
    const k = clamp((t - s(2) + 0.1) / 0.2);
    x.globalAlpha = k; x.fillStyle = 'rgba(16,20,32,0.7)'; rr(x, 40, 200, 840, 330, 26); x.fill(); x.globalAlpha = 1;
    msgs.forEach(([nm, col, m], i) => { const ti = s(2) + 0.05 + i * 0.5, a = clamp((t - ti) / 0.15); if (a <= 0) return;
      x.globalAlpha = a; x.textAlign = 'left'; x.font = F(38); x.fillStyle = col; x.fillText(`${nm}:`, 74, 262 + i * 74); const wn = x.measureText(`${nm}: `).width;
      x.fillStyle = '#ffffff'; x.font = F(38, 700); x.fillText(m, 74 + wn, 262 + i * 74); x.globalAlpha = 1; });
  }
  if (n === 'grow') {   // five minutes, in a second
    const k = pop((t - s(5) + 0.1) / 0.25), q = clamp((t - s(5) - 0.1) / (e.sprout - s(5) - 0.35)), secs = Math.max(0, Math.round(300 * (1 - easeInOut(q)))), ready = t > e.sprout - 0.2;
    card(x, 540, 330, 520, 130, k, (c, w, h) => {
      c.fillStyle = ready ? '#2fb85a' : '#3a6ad8'; c.beginPath(); c.arc(-w / 2 + 70, 0, 38, 0, 7); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.beginPath(); c.arc(-w / 2 + 70, 0, 22, 0, 7); c.stroke(); c.beginPath(); c.moveTo(-w / 2 + 70, 0); c.lineTo(-w / 2 + 70 + 12 * Math.sin(t * 20), -12 * Math.cos(t * 20)); c.stroke();
      c.textAlign = 'center'; c.fillStyle = '#20232e'; c.font = F(64); c.fillText(ready ? 'READY!' : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 40, 4);
    });
  }
  if (n === 'alone') {   // the player list
    const k = pop((t - s(11) - 0.1) / 0.28);
    card(x, 540, 330, 620, 230, k, (c, w, h) => {
      c.fillStyle = '#20232e'; rr(c, -w / 2, -h / 2, w, 76, 30); c.fill(); c.fillRect(-w / 2, -h / 2 + 40, w, 36);
      c.textAlign = 'left'; c.fillStyle = '#ffffff'; c.font = F(36); c.fillText('PLAYERS', -w / 2 + 34, -h / 2 + 40); c.textAlign = 'right'; c.fillText('1 / 1', w / 2 - 34, -h / 2 + 40);
      c.fillStyle = '#ffd36a'; c.beginPath(); c.arc(-w / 2 + 80, 40, 38, 0, 7); c.fill(); c.fillStyle = '#3fa04a'; c.fillRect(-w / 2 + 52, 52, 56, 26);
      c.textAlign = 'left'; c.fillStyle = '#20232e'; c.font = F(48); c.fillText('Oliver', -w / 2 + 140, 40);
      c.fillStyle = '#2fd060'; c.beginPath(); c.arc(w / 2 - 60, 40, 14, 0, 7); c.fill();
    });
  }
  if (n === 'message') {   // the tree's message, typed out
    const k = pop((t - e.msg) / 0.3), full = ['PLANT THIS WHERE SOMEONE', 'HAS FORGOTTEN TO GROW.'], tot = full.join('').length;
    const nch = Math.floor(clamp((t - s(23) + 0.05) / Math.max(0.8, L(23).end - s(23) - 0.2)) * tot);
    card(x, 540, 330, 900, 260, k, (c, w, h) => {
      cubeIcon(c, -w / 2 + 80, -h / 2 + 64, 26);
      c.textAlign = 'left'; c.fillStyle = '#8fe0ff'; c.font = F(30); c.fillText('SERVER ZERO', -w / 2 + 130, -h / 2 + 64);
      c.fillStyle = '#ffffff'; c.font = F(46); c.textAlign = 'center';
      if (t < s(23) - 0.05) { for (let i = 0; i < 3; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * (Math.sin(t * 9 - i) > 0)})`; c.beginPath(); c.arc(-30 + i * 30, 30, 9, 0, 7); c.fill(); } }
      else { let left = nch; full.forEach((ln, i) => { const sh = ln.slice(0, Math.max(0, left)); left -= ln.length; c.fillText(sh, 0, 6 + i * 62); }); }
    }, { bg: 'rgba(12,28,70,0.9)', edge: '#6fd8ff' });
  }
}

// ---- helpers ----
function faceOf(c, name, t, ph, o = {}) { c.setFace(name, { blink: o.blink !== false && blinkAt(t, ph) && !['shocked', 'surprised'].includes(name), gaze: o.gaze }); }
function handPos(ch) { ch.root.updateMatrixWorld(true); const h = v3(0, -2.0, 0.15); ch.arms[1].localToWorld(h); return h; }
// holding something up in the right hand, in front of the chest
function holdOut(ch, k = 1, up = -1.35) { const A = ch.arms[1]; A.rotation.x = lerp(A.rotation.x, up, k); A.rotation.z = lerp(A.rotation.z, 0.25, k); }
function crouch(ch, k) { if (k <= 0) return; const H0 = ch.hipY ?? 2.2; ch.torso.rotation.x = 0.55 * k; ch.hips.position.y = H0 - 0.95 * k; ch.legs.forEach((l, i) => { l.rotation.x = -1.05 * k; l.rotation.z = (i ? -1 : 1) * 0.12 * k; }); ch.neck.rotation.x = -0.25 * k; }

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, S = [], add = (name, t0, f) => S.push({ name, t0: () => t0, f, t1: () => 0 });
  const St = W.stairs;
  add('macro', 0, (u) => ({ pos: HP.clone().add(v3(lerp(3.0, 2.6, u), lerp(2.4, 2.1, u), lerp(1.4, 1.0, u))), look: HP.clone().add(v3(-0.4, 0.9, -0.8)), fov: 50 }));
  add('dig', s(0) + 1.55, (u) => ({ pos: v3(lerp(2.6, 2.0, u), lerp(4.4, 4.7, u), lerp(12.0, 11.0, u)), look: v3(0.2, 2.9, 2.8), fov: 58 }));
  add('shop', s(1) - 0.1, (u) => ({ pos: v3(lerp(-11.6, -12.4, u), 5.6, lerp(6.2, 7.0, u)), look: v3(-15.5, 4.6, 18.5), fov: 66 }));
  add('chat', s(2) - 0.1, (u) => ({ pos: v3(lerp(0.5, -0.5, u), lerp(10.5, 10.0, u), lerp(4.0, 5.0, u)), look: v3(-6.5, 3.6, 17.5), fov: 64 }));
  add('cube', s(3) - 0.1, (u, t) => { const h = W.handAt || v3(-6, 4, 16); return { pos: h.clone().add(v3(lerp(0.9, 0.7, u), lerp(0.6, 0.8, u), lerp(-2.6, -2.2, u))), look: h.clone().add(v3(0.1, 0.75, 0.3)), fov: 40 }; });
  add('plant', s(4) - 0.1, (u) => ({ pos: v3(lerp(5.4, 4.6, u), lerp(2.6, 2.4, u), lerp(9.0, 8.4, u)), look: v3(0.4, 1.4, 3.6), fov: 56 }));
  add('grow', s(5) - 0.1, (u, t) => { const k = smooth(e.sprout, e.sprout + 1.6, t); return { pos: v3(lerp(-3, -4.5, u), lerp(3.6, 2.6, k), lerp(30, 32, u)), look: v3(lerp(5.5, 3, k), lerp(4.0, 15, k), 5.5), fov: lerp(54, 72, k) }; });
  add('rise', s(6) - 0.1, (u, t) => { const H = Math.min(growH(t), TOP), a = 0.9 + u * 0.9, cy = Math.max(12, H - 34); return { pos: HP.clone().add(v3(Math.cos(a) * 34, cy, Math.sin(a) * 34)), look: HP.clone().add(v3(0, H + 6, 0)), fov: 70 }; });
  add('climb', s(7) - 0.1, (u, t) => { const k = climbK(t), p = St.at(k), a = St.angle(k) + 0.8; return { pos: HP.clone().add(v3(Math.cos(a) * 14, p.y - HP.y + 2.2, Math.sin(a) * 14)), look: p.clone().add(v3(0, 3.2, 0)), fov: 62 }; });
  add('arrive', s(8) - 0.1, (u) => ({ pos: lp3(v3(58, 404, 36), v3(50, 410, 26), easeOut(u)), look: v3(0, 402, -30), fov: 64 }));
  add('gardens', s(9) - 0.1, (u) => ({ pos: lp3(v3(3.4, 405.5, 9), v3(2.6, 410, 4), easeInOut(u)), look: v3(-1, 399, -26), fov: 66 }));
  add('glass', s(10) - 0.1, (u) => ({ pos: v3(lerp(12.5, 11.5, u), lerp(402.4, 402.0, u), lerp(-2.6, -3.2, u)), look: v3(4.6, 400.9, -8.2), fov: 60 }));
  add('alone', s(11) - 0.1, (u) => ({ pos: lp3(v3(-30, 436, 30), v3(-26, 440, 24), u), look: v3(0, 398, -26), fov: 64 }));
  add('sign', s(12) - 0.1, (u) => ({ pos: lp3(W.signPos.clone().add(v3(-11.5, 6.2, 15)), W.signPos.clone().add(v3(-9.5, 5.6, 11.5)), easeOut(u)), look: W.signPos.clone().add(v3(-2.6, 2.8, 0)), fov: 62 }));
  add('explore', s(14) - 0.1, (u, t) => { const z = walkZ(t); return { pos: v3(lerp(-1.2, -0.8, u), islandY(0, z) + 3.0, z - 8), look: v3(0, islandY(0, z) + 3.5, z), fov: 60 }; });
  add('tree', s(15) - 0.1, (u) => { const tp = TP(); return { pos: lp3(tp.clone().add(v3(-15, 6, 52)), tp.clone().add(v3(-12, 5, 45)), easeOut(u)), look: tp.clone().add(v3(0, lerp(19, 23, u), 0)), fov: 70 }; });
  add('names', s(16) - 0.1, (u) => { const tp = TP(), a = lerp(-0.85, -0.25, easeInOut(u)), y = lerp(16, 9, u), rr2 = W.tree.radius(y) + 7.5; return { pos: tp.clone().add(v3(Math.sin(a) * rr2, y + 0.5, Math.cos(a) * rr2)), look: tp.clone().add(v3(Math.sin(a + 0.15) * 2, y + 0.6, Math.cos(a + 0.15) * 2)), fov: 58 }; });
  add('faded', s(18) - 0.1, (u) => { const tp = TP(), a = lerp(0.9, 1.25, u), y = lerp(20, 22, u), rr2 = W.tree.radius(y) + 6.5; return { pos: tp.clone().add(v3(Math.sin(a) * rr2, y - 1.2, Math.cos(a) * rr2)), look: tp.clone().add(v3(Math.sin(a - 0.1) * 2, y + 0.4, Math.cos(a - 0.1) * 2)), fov: 56 }; });
  add('ownname', s(19) - 0.1, (u) => { const tp = TP(); return { pos: tp.clone().add(v3(lerp(-3.6, -3.0, u), W.nameY - 0.4, lerp(23, 21, u))), look: tp.clone().add(v3(0, W.nameY - 0.6, 5.5)), fov: 52 }; });
  add('branch', s(20) - 0.1, (u) => { const tp = TP(); return { pos: tp.clone().add(v3(lerp(2.8, 2.4, u), lerp(3.4, 3.0, u), lerp(20, 19, u))), look: tp.clone().add(v3(0.8, lerp(10.5, 12, u), 7)), fov: 62 }; });
  add('seed', s(21) - 0.1, (u) => { const tp = TP(); return { pos: tp.clone().add(v3(lerp(4.4, 4.0, u), lerp(2.6, 3.0, u), lerp(6.4, 6.9, u))), look: tp.clone().add(v3(1.9, lerp(6.0, 5.0, u), 12.2)), fov: 70 }; });
  add('message', s(22) - 0.1, (u) => { const tp = TP(); return { pos: tp.clone().add(v3(lerp(1.8, 1.5, u), lerp(5.6, 5.4, u), lerp(7.2, 7.8, u))), look: tp.clone().add(v3(0.9, 5.3, 13)), fov: 64 }; });
  add('return', e.ret, (u) => ({ pos: v3(lerp(13, 12, u), lerp(4.4, 4.0, u), lerp(21, 19.5, u)), look: v3(3.5, lerp(5.5, 3.6, easeOut(u)), 6), fov: 62 }));
  add('bloom', s(24) + 1.85, (u) => ({ pos: v3(lerp(44, 41, u), lerp(1.7, 2.3, u), lerp(14.5, 13.5, u)), look: v3(30, 1.4, -1), fov: 62 }));
  add('aerial', L(24).end + 0.45, (u) => ({ pos: lp3(v3(70, 70, 120), v3(110, 170, 200), easeInOut(u)), look: v3(0, 0, -40), fov: 60 }));
  S.forEach((x, i) => { if (S[i + 1]) { const v = S[i + 1].t0(); x.t1 = () => v; } });
  S[S.length - 1].t1 = () => ctx.dur + 1;
  return S;
}
// climbing: steps per second; in the climb shot he is up in the sky, in the arrival shot at the top
const climbK = (t) => { const s7 = L(7).start, s8 = L(8).start; if (t < s8 - 0.1) return 150 + (t - s7 + 0.1) * 3.0; return Math.min(NST, NST - 3.6 + (t - s8 + 0.1) * 3.0); };
const walkZ = (t) => lerp(-20, -28, smooth(L(14).start - 0.1, L(15).start, t));

// ---- a frame ----
function renderAt(t) {
  const first = !ctx.sub || ctx.sub.i === 0, sh = shotAt(W.shots, t), n = sh.name, e = EV, s = (i) => L(i).start;
  const groundShots = ['macro', 'dig', 'shop', 'chat', 'cube', 'plant', 'grow'], retShots = ['return', 'bloom', 'aerial'];
  const set = groundShots.includes(n) ? 'garden' : retShots.includes(n) ? 'return' : n === 'rise' || n === 'climb' ? 'sky' : 'island';
  // the sky: day in the garden, the high sky above the clouds, golden on the way home
  let pal;
  if (set === 'garden') pal = GDAY;
  else if (set === 'return') pal = GOLDEN;
  else if (set === 'sky') { const cy = sh.pos.y; pal = mixP(GDAY, SKY, smooth(90, 260, cy)); }
  else pal = SKY;
  applyEnv(ctx, pal);
  const Ol = W.ol, St = W.stairs;
  Ol.root.visible = true; Ol.root.rotation.set(0, 0, 0); Ol.root.position.set(0, -100, 0); pose(Ol, 'idle', t);
  W.trowel.visible = false; W.seed.visible = false; W.seed2.visible = false; W.handAt = null;
  W.gather.visible = n === 'chat' || n === 'shop'; W.extras.forEach((c) => { c.visible = set !== 'island'; });
  W.mound.visible = t > e.plant + 0.25 && t < e.sprout; W.holeIn.visible = t < e.plant + 0.25;
  // the stairs: grow from the sprout, stand, then dissolve on the way home
  const fade = smooth(e.ret + 0.3, e.ret + 2.0, t);
  St.update(t, growH(t), fade); St.g.visible = t > e.sprout - 0.1 && fade < 1;
  let face = null;

  // ---- the garden ----
  if (n === 'macro') {
    // the trowel scrapes; a blue cube shows in the soil, glowing
    W.seed.visible = true; W.seed.position.copy(HP).add(v3(0, lerp(0.42, 0.62, smooth(e.find - 0.2, e.find + 0.4, t)), 0)); W.seed.rotation.set(0.3, 0.6 + t * 0.2, 0.15);
    Ol.root.position.copy(HP).add(v3(0, 0.45, -3.0)); crouch(Ol, 1); W.trowel.visible = true;
    Ol.arms[1].rotation.x = -0.9 + Math.sin(t * 7.5) * 0.28 * (1 - smooth(e.find - 0.1, e.find + 0.2, t)); Ol.arms[1].rotation.z = 0.1; Ol.arms[0].rotation.x = -0.4;
    faceOf(Ol, t > e.find ? 'surprised' : 'neutral', t, 0.3);
  }
  if (n === 'dig') {
    // he lifts it out of the soil and holds it up
    Ol.root.position.copy(HP).add(v3(0, 0.45, -3.0)); const up = smooth(e.lift - 0.3, e.lift + 0.5, t); crouch(Ol, 1 - up);
    W.trowel.visible = t < e.lift - 0.2; if (W.trowel.visible) Ol.arms[1].rotation.x = -0.9;
    if (t >= e.lift - 0.3) { holdOut(Ol, up, lerp(-0.9, -1.45, up)); Ol.neck.rotation.x = 0.18 * up; }
    W.seed.visible = true; const h = handPos(Ol); W.seed.position.copy(t < e.lift - 0.3 ? HP.clone().add(v3(0, 0.62, 0)) : lp3(HP.clone().add(v3(0, 0.62, 0)), h.clone().add(v3(0, 0.5, 0.05)), up)); W.seed.rotation.set(0.3, 0.6 + t * 0.8, 0.15);
    faceOf(Ol, 'surprised', t, 0.3); face = Ol.root.position.clone().add(v3(0, 4.6, 0));
  }
  if (n === 'shop' || n === 'chat' || n === 'cube') {
    // on the path by the seed stall, holding it out; the players gather
    Ol.root.position.set(-6.5, 0.05, 15.6); Ol.root.rotation.y = n === 'shop' ? Math.PI - 0.5 : Math.PI - 0.15; holdOut(Ol, 1);
    Ol.neck.rotation.x = n === 'cube' ? 0.3 : 0.12; if (n === 'shop') { Ol.neck.rotation.y = -0.35; }
    faceOf(Ol, n === 'chat' ? 'confused' : n === 'cube' ? 'surprised' : 'neutral', t, 0.3);
    W.seed.visible = true; const h = handPos(Ol); W.handAt = h; W.seed.position.copy(h).add(v3(0, 0.5 + 0.06 * Math.sin(t * 3), 0.05)); W.seed.rotation.set(0.25, t * 0.9, 0.2);
    face = Ol.root.position.clone().add(v3(0, 4.6, 0));
    if (n === 'shop') { Ol.root.position.set(-14.6, 0.05, 14.8); Ol.root.rotation.y = Math.PI - 0.3; Ol.neck.rotation.y = 0; const h2 = handPos(Ol); W.handAt = h2; W.seed.position.copy(h2).add(v3(0, 0.5, 0.05)); face = Ol.root.position.clone().add(v3(0, 4.6, 0)); }
  }
  if (n === 'plant') {
    // he kneels at the hole, sets the cube in and pats the soil over it
    Ol.root.position.copy(HP).add(v3(-0.4, 0.45, -2.9)); Ol.root.rotation.y = 0.15; const k = smooth(s(4) - 0.1, s(4) + 0.35, t); crouch(Ol, k);
    const reach = smooth(s(4) + 0.1, e.plant, t), pat = t > e.plant + 0.25 ? Math.max(0, Math.sin((t - e.plant) * 11)) * 0.18 : 0;
    Ol.arms[1].rotation.x = lerp(-1.35, -0.85, reach) + pat; Ol.arms[1].rotation.z = 0.1; Ol.arms[0].rotation.x = -0.5 + pat;
    const h = handPos(Ol); W.seed.visible = t < e.plant + 0.25;
    W.seed.position.copy(t < e.plant ? h.clone().add(v3(0, 0.45, 0.05)) : lp3(h.clone().add(v3(0, 0.45, 0.05)), HP.clone().add(v3(0, 0.25, 0)), smooth(e.plant, e.plant + 0.25, t))); W.seed.rotation.set(0.2, t * 0.7, 0.1);
    faceOf(Ol, t > e.plant + 0.3 ? 'happy' : 'neutral', t, 0.3); face = Ol.root.position.clone().add(v3(0, 3.6, 0.6));
  }
  if (n === 'grow') {
    // he waits, the timer runs; then the soil bursts and the stairs spiral up: he steps back, staring up
    const back = smooth(e.sprout - 0.1, e.sprout + 0.7, t);
    Ol.root.position.copy(lp3(v3(7.4, 0.45, 5.6), v3(9.6, 0.45, 6.9), back)); Ol.root.rotation.y = -Math.PI / 2 - 0.25;
    if (back > 0 && back < 1) pose(Ol, 'walk', t);
    Ol.neck.rotation.x = lerp(0.25, -0.55, smooth(e.sprout, e.sprout + 1.2, t));
    faceOf(Ol, t > e.sprout + 0.1 ? 'shocked' : 'neutral', t, 0.3); face = Ol.root.position.clone().add(v3(0, 4.6, 0));
  }
  if (n === 'rise') { Ol.root.position.set(9.6, 0.45, 6.9); Ol.root.rotation.y = -Math.PI / 2 - 0.25; Ol.neck.rotation.x = -0.6; faceOf(Ol, 'shocked', t, 0.3); }
  if (n === 'climb' || n === 'arrive') {
    // up the spiral, step by step, then onto the island
    const k = climbK(t), onIsland = k >= NST && n === 'arrive';
    if (!onIsland || t < e.arrive) {
      const p = St.at(Math.min(k, NST)); Ol.root.position.copy(p); Ol.root.rotation.y = -St.angle(Math.min(k, NST)); pose(Ol, 'walk', t * 1.3);
    }
    if (n === 'arrive' && k >= NST) {   // walking onto the rim
      const u = smooth(e.arrive - 0.35, s(9) + 0.2, t), z = lerp(-0.1, -5.5, u); Ol.root.position.set(0, Math.max(TOP, islandY(0, z)), z); Ol.root.rotation.y = Math.PI; pose(Ol, 'walk', t * 1.3);
    }
    Ol.neck.rotation.x = n === 'climb' ? -0.12 : -0.05; faceOf(Ol, n === 'arrive' ? 'surprised' : 'happy', t, 0.3);
    face = Ol.root.position.clone().add(v3(0, 4.6, 0));
  }

  // ---- the island ----
  if (n === 'gardens') { const z = lerp(-5.5, -10.5, smooth(s(9) - 0.1, L(9).end + 0.3, t)); Ol.root.position.set(0.4, islandY(0.4, z), z); Ol.root.rotation.y = Math.PI; pose(Ol, 'walk', t); faceOf(Ol, 'surprised', t, 0.3); }
  if (n === 'glass') {
    Ol.root.position.set(3.0, islandY(3.0, -8.4), -8.4); Ol.root.rotation.y = 1.0; Ol.neck.rotation.x = 0.22; holdOut(Ol, 0.6, -0.9);
    faceOf(Ol, 'surprised', t, 0.3); face = Ol.root.position.clone().add(v3(0, 4.6, 0));
  }
  if (n === 'alone') { Ol.root.position.set(0.3, islandY(0.3, -15), -15); Ol.root.rotation.y = lerp(Math.PI * 0.5, Math.PI * 1.6, smooth(s(11), L(11).end + 0.3, t)); faceOf(Ol, 'confused', t, 0.3); }
  if (n === 'sign') {
    const p = v3(1.9, 0, -16.6); Ol.root.position.set(p.x, islandY(p.x, p.z), p.z); Ol.root.rotation.y = Math.atan2(W.signPos.x - p.x, W.signPos.z - p.z); Ol.neck.rotation.x = -0.12;
    faceOf(Ol, t > e.sign ? 'surprised' : 'neutral', t, 0.3); face = Ol.root.position.clone().add(v3(0, 4.6, 0));
  }
  if (n === 'explore') { const z = walkZ(t); Ol.root.position.set(0, islandY(0, z), z); Ol.root.rotation.y = Math.PI; pose(Ol, 'walk', t); Ol.neck.rotation.y = 0.35 * Math.sin(t * 1.2); faceOf(Ol, 'happy', t, 0.3); face = Ol.root.position.clone().add(v3(0, 4.6, 0)); }
  const tp = TP(), stand = tp.clone().add(v3(0.9, 0, 13)); stand.y = islandY(stand.x, stand.z);
  if (n === 'tree') { const z = lerp(-34, stand.z, smooth(s(15) - 0.1, L(15).end, t)); Ol.root.position.set(lerp(0, stand.x, smooth(s(15), L(15).end, t)), islandY(0, z), z); Ol.root.rotation.y = Math.PI; pose(Ol, z < stand.z - 0.05 ? 'idle' : 'walk', t); Ol.neck.rotation.x = -0.5; faceOf(Ol, 'surprised', t, 0.3); }
  if (['names', 'faded', 'ownname', 'branch', 'seed', 'message'].includes(n)) {
    Ol.root.position.copy(stand); Ol.root.rotation.y = Math.PI + 0.12; Ol.neck.rotation.x = n === 'branch' ? -0.45 : n === 'ownname' ? -0.08 : 0;
    let fx = 'neutral';
    if (n === 'ownname') fx = t > e.name + 0.4 ? 'shocked' : 'surprised';
    if (n === 'branch') fx = 'surprised';
    if (n === 'seed' || n === 'message') {
      const reach = smooth(e.drop - 0.4, e.drop + 0.2, t); holdOut(Ol, reach, -1.25); Ol.neck.rotation.x = 0.35 * reach;
      fx = t > e.catch ? 'happy' : 'surprised'; if (n === 'message') { fx = t > s(23) + 0.6 ? 'happy' : 'surprised'; Ol.neck.rotation.x = 0.3; }
      const h = handPos(Ol); W.handAt = h; W.seed2.visible = t > e.drop - 0.05;
      const land = h.clone().add(v3(0, 0.45, 0.05)), k = clamp((t - e.drop) / (e.catch - e.drop));
      if (k < 1) { const p = lp3(W.budWorld, land, k * k); p.y += Math.sin(k * Math.PI) * 0.8; W.seed2.position.copy(p); W.seed2.rotation.set(k * 3, k * 5, 0); }
      else { W.seed2.position.copy(land).add(v3(0, 0.05 * Math.sin(t * 3), 0)); W.seed2.rotation.set(0, t * 0.8, 0); }
    }
    faceOf(Ol, fx, t, 0.3); face = Ol.root.position.clone().add(v3(0, 4.6, 0));
  }
  // the tree's state: names glow; a set fades; his name burns in; the branch grows
  const nk = smooth(e.name, e.name + 1.2, t); W.oname.set({ k: Math.round(nk * 20) / 20 }); W.oname.intensity(2.2 + 0.5 * Math.sin(t * 4) * nk);
  for (const st of [W.namesLit, W.namesFade, W.namesDark]) st.U.uT.value = t;
  W.namesFade.U.uDim.value = smooth(s(18) - 0.1, L(18).end + 0.2, t);
  const bk = smooth(e.branch, e.branch + 1.6, t); W.branch.scale.setScalar(Math.max(0.001, bk)); W.branch.visible = bk > 0;
  W.bud.material.opacity = 0.9 * bk * (1 - smooth(e.drop, e.drop + 0.3, t));

  // ---- home again ----
  if (n === 'return') {
    // he steps off the last stairs, which melt into light behind him; the seed glows in his hand
    const k = clamp((t - e.ret) / 1.4), step = lerp(5, 0, k), p = St.at(step), off = smooth(e.ret + 1.3, e.ret + 2.0, t);
    Ol.root.position.copy(lp3(p, v3(6.0, 0.45, 9.6), off)); Ol.root.rotation.y = off > 0.5 ? Math.PI + 0.8 : -St.angle(step) + Math.PI; pose(Ol, k < 1 || (off > 0 && off < 1) ? 'walk' : 'idle', t);
    holdOut(Ol, 1, -1.2); faceOf(Ol, 'happy', t, 0.3);
    const h = handPos(Ol); W.seed2.visible = true; W.seed2.position.copy(h).add(v3(0, 0.45, 0.05)); W.seed2.rotation.set(0, t, 0);
    face = Ol.root.position.clone().add(v3(0, 4.6, 0)); sh.look = lp3(sh.look, Ol.root.position.clone().add(v3(0, 3.4, 0)), 0.75);
  }
  if (n === 'bloom' || n === 'aerial') {
    Ol.root.position.set(6.0, 0.45, 9.6); Ol.root.rotation.y = Math.PI + 1.2; holdOut(Ol, 1, -1.9); Ol.arms[0].rotation.x = -0.4; faceOf(Ol, 'laugh', t, 0.3);
    const h = handPos(Ol); W.seed2.visible = true; W.seed2.position.copy(h).add(v3(0, 0.45, 0.05)); W.seed2.rotation.set(0, t, 0);
  }
  W.bloom.t0 = e.bloom; W.bloom.update(t);
  { // blossoms on the trees, with the same wave
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = v3(0, 0, 0), sc = v3(1, 1, 1);
    const dt = t - e.bloom, wr = Math.max(0, 28 * dt + 5 * dt * dt);
    if (t > e.bloom) { W.carpet.forEach((c2, i) => { const k = clamp((wr - c2.d) / 14), z = k <= 0 ? 0.0001 : c2.s * Math.min(1, k * 1.2); M.compose(p.set(c2.x, c2.y, c2.z), q, sc.setScalar(z)); W.carpetMesh.setMatrixAt(i, M); }); W.carpetMesh.instanceMatrix.needsUpdate = true; }
    W.carpetMesh.visible = t > e.bloom;
    W.blossoms.forEach((b2, i) => { const d = Math.hypot(b2.x - HP.x, b2.z - HP.z), k = clamp((wr - d) / 22), z = k <= 0 ? 0.0001 : b2.s * (k < 1 ? k * 1.15 : 1); M.compose(p.set(b2.x, b2.y, b2.z), q, sc.setScalar(z)); W.blossomMesh.setMatrixAt(i, M); });
    W.blossomMesh.instanceMatrix.needsUpdate = true; W.blossomMesh.visible = t > e.bloom;
  }
  W.ring.visible = set === 'return' && t > e.bloom; if (W.ring.visible) { const rad = (t - e.bloom) * 28; W.ring.scale.setScalar(Math.max(0.1, 28 * (t - e.bloom) + 5 * (t - e.bloom) ** 2)); W.ring.material.opacity = 0.75 * (1 - smooth(4, 7, t - e.bloom)); }

  if (n === 'cube') { const s2 = shotAt(W.shots, t); sh.pos = s2.pos; sh.look = s2.look; }
  if (n === 'seed' && W.handAt) sh.look = lp3(Ol.root.position.clone().add(v3(0, 4.4, 0)), W.handAt.clone().add(v3(0, 0.6, 0)), 0.55);   // these follow the hand, placed above
  lights(set, t, sh.pos, face);
  // air
  W.air.update(t); const A = W.air.list; W.isl.update(t); W.glass.update(t);
  A.pollen.visible = set === 'garden' || set === 'return'; A.butter.visible = set === 'garden' || set === 'return';
  A.blueMotes.visible = set === 'island'; A.islandSpark.visible = set === 'island'; A.digB.visible = A.digB.visible && n === 'macro';
  A.sproutB.visible = A.sproutB.visible && (n === 'grow'); A.stairSpark.visible = n === 'grow' || n === 'rise' || n === 'climb';
  A.treeSpark.visible = set === 'island' && ['tree', 'names', 'faded', 'ownname', 'branch', 'seed', 'message'].includes(n);
  A.petals.visible = n === 'bloom' || n === 'aerial'; A.fadeSpark.visible = n === 'return';
  A.clouds.visible = true; A.cloudSea.visible = true;
  leafT(t);
  const fl = n === 'grow' && t >= e.sprout && t < e.sprout + 0.25 ? 0.18 * (1 - (t - e.sprout) / 0.25) : n === 'ownname' && t >= e.name && t < e.name + 0.2 ? 0.15 * (1 - (t - e.name) / 0.2) : 0;
  const shake = n === 'grow' ? 0.22 * smooth(e.sprout - 0.05, e.sprout + 0.1, t) * (1 - smooth(e.sprout + 0.4, e.sprout + 1.4, t)) : 0;
  { const cq = new URLSearchParams(location.search).get('cam'); if (cq) { const q = cq.split(',').map(Number); sh.pos = v3(q[0], q[1], q[2]); sh.look = v3(q[3], q[4], q[5]); sh.fov = q[6]; } }
  frame(ctx, t, sh, { shake, shadowSpan: ['arrive', 'alone', 'aerial', 'rise', 'tree'].includes(n) ? 110 : 45, flash: fl, flashColor: '#bfeaff', steady: ['macro', 'dig', 'shop', 'chat', 'cube', 'plant', 'names', 'faded'].includes(n) || (n === 'grow' && t < e.sprout - 0.05) });
  if (first) drawHud(t, n);
  return n;
}
let leafT = () => {};

export async function setup() {
  ctx = await initStage('ep24', { look: 'pro', avatars: ['farm_oliver'] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'happy', 'surprised', 'confused', 'shocked', 'laugh']);
  const { scene, camera } = ctx; camera.far = 4000; camera.near = 0.15; camera.updateProjectionMatrix();
  ctx.cap.style.webkitTextStroke = '22px #000'; ctx.cap.style.textShadow = '0 10px 0 rgba(0,0,0,0.6), 0 0 26px rgba(0,0,0,0.9), 0 0 54px rgba(0,0,0,0.6)';
  rig(); town(); island(); people();
  W.stairs = cubeStairs({ centre: HP, steps: NST, radius: 4.2, top: TOP, turn: 0.32, thetaEnd: -Math.PI / 2 }); scene.add(W.stairs.g);
  W.ring = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2b0').multiplyScalar(2.2), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  W.ring.rotation.x = -Math.PI / 2; W.ring.position.set(HP.x, 0.7, HP.z); W.ring.userData.noAO = true; scene.add(W.ring);
  leafT = (t) => leafTime(t, 0.05);
  const list = {
    pollen: dust(scene, { size: 90, height: 18, centre: v3(0, 7, 4), count: 500, color: '#fff4c8', amount: 0.42, pointSize: 0.45 }),
    butter: sparkles(scene, { centre: v3(0, 3, 4), size: 40, height: 6, count: 60, color: '#ffe8a0', pointSize: 0.14 }),
    digB: burst(scene, { count: 80, color: '#8a6040', dur: 1.0, spread: 0.6, height: 0.3, pointSize: 0.9, bright: 0.6, pos: HP.clone().add(v3(0, 0.5, 0)), seed: 3 }),
    sproutB: burst(scene, { count: 260, color: '#6fd0ff', dur: 1.8, spread: 2.2, height: 1.5, pointSize: 1.4, bright: 2.4, pos: HP.clone().add(v3(0, 0.5, 0)), seed: 6 }),
    stairSpark: sparkles(scene, { centre: HP.clone().add(v3(0, 200, 0)), size: 16, height: 400, count: 900, color: '#8fe0ff', pointSize: 0.3 }),
    blueMotes: dust(scene, { size: 90, height: 24, centre: IC.clone().add(v3(0, 10, 0)), count: 700, color: '#9fe2ff', amount: 0.5, pointSize: 0.4 }),
    islandSpark: sparkles(scene, { centre: IC.clone().add(v3(0, 4, 0)), size: 80, height: 8, count: 260, color: '#bfeeff', pointSize: 0.2 }),
    treeSpark: sparkles(scene, { centre: TP().add(v3(0, 18, 0)), size: 40, height: 36, count: 300, color: '#9fe8ff', pointSize: 0.26 }),
    petals: leaves(scene, { count: 500, size: 160, height: 50, centre: v3(10, 22, -30), colors: ['#ffb8d6', '#ffd2e6', '#ff9ec4', '#fff0f6', '#ffe08a'], speed: 0.9 }),
    fadeSpark: sparkles(scene, { centre: HP.clone().add(v3(0, 18, 0)), size: 14, height: 36, count: 400, color: '#bfeeff', pointSize: 0.34 }),
    clouds: clouds(scene, { count: 22, y: 215, spread: 1600, size: 36, color: '#ffffff', drift: 0.8, seed: 5 }),
    cloudSea: clouds(scene, { count: 46, y: 250, spread: 1300, size: 44, color: '#fbfcff', drift: 0.5, seed: 9 }),
  };
  list.digB.fire(EV.find - 0.15); list.sproutB.fire(EV.sprout);
  W.air = atmos(...Object.values(list)); W.air.list = list;
  hudInit(); W.shots = shots();
  void WIN; void glowSprite; void rng;
  return expose(ctx, renderAt, EV.catch + 2.5, EV);
}
