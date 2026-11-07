// Episode 20: The Blox Fruit Nobody Could Identify. A bright game of islands with its HUD on, until the fruit resets it: the HUD empties, a grey dialog
// from an older build opens, the sea drains into the spot where the fruit fell, the islands turn out to stand on columns and slide into a ring, and the
// first version of the world rises from a studded baseplate. Kai ends on the end of the pier with every NPC in the game bowing to him.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, DAY } from '../engine/stage.js';
import { Batch, surf, paint, crate, barrel, sign } from '../engine/kit.js';
import { dust, sparkles, shaft, clouds, burst, vanisher, atmos } from '../engine/atmos.js';
import { makeIsland, palms, palmTime, scatter, bushGeo, rockGeo, tuftGeo, tuftMat, sailboat, galleon, hut, stall, dock, flagpole, chest, katana, buildSea, fruit, city, greatTemple, seabed, plumes, bowingCrowd, SEABED } from '../engine/isles.js';

let ctx, L, EV;
const W = {};
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const orbit = (p, ang, dist, h) => v3(p.x + Math.sin(ang) * dist, p.y + h, p.z + Math.cos(ang) * dist);

// ---- palettes ----
const TROP = { ...DAY, ...P({ top: '#1673ea', horizon: '#b8efff', haze: '#d4f4ff', sunColor: '#fff0d4', hemiSky: '#e2f4ff', hemiGround: '#e0c88f' }),
  sunI: 3.1, sunDir: v3(0.5, 0.62, 0.62), sunDisc: 1, hemiI: 1.2, amb: 0.24, envI: 0.85, exposure: 1.0, bloom: 0.2, fogNear: 500, fogFar: 2700, saturation: 1.3, contrast: 1.0, bounce: 0.5 };
const MORN = { ...TROP, ...P({ top: '#3f7ad8', horizon: '#ffd7a4', haze: '#ffe4c0', sunColor: '#ffd9a2', hemiSky: '#ffeeda', hemiGround: '#c8a878' }),
  sunI: 3.3, sunDir: v3(0.8, 0.34, 0.5), hemiI: 1.0, envI: 0.72, exposure: 1.03, bloom: 0.32, saturation: 1.28 };
const STRANGE = { ...TROP, ...P({ top: '#25246a', horizon: '#c29be6', haze: '#ab90d8', sunColor: '#efe0ff', hemiSky: '#c9c0f0', hemiGround: '#8878a8' }),
  sunI: 1.9, sunDir: v3(0.45, 0.5, 0.74), sunDisc: 0.5, hemiI: 1.05, envI: 0.7, exposure: 1.04, bloom: 0.3, saturation: 1.2 };
const STORM = { ...STRANGE, ...P({ top: '#171a4c', horizon: '#ee9460', haze: '#a2788e', sunColor: '#ffd2a0', hemiSky: '#b8a8d8', hemiGround: '#88684e' }),
  sunI: 3.0, sunDir: v3(-0.42, 0.34, 0.84), sunDisc: 1, sunSize: 2, hemiI: 1.1, envI: 0.7, exposure: 1.05, bloom: 0.34, saturation: 1.3, fogNear: 600, fogFar: 2900 };
const GOLD = { ...STORM, ...P({ top: '#2436a6', horizon: '#ffc680', haze: '#f6cfa0', sunColor: '#ffe2b4', hemiSky: '#f0dcff', hemiGround: '#b89468' }),
  sunI: 3.3, sunDir: v3(-0.4, 0.42, 0.82), hemiI: 1.15, envI: 0.8, exposure: 1.05, bloom: 0.36, saturation: 1.34, fogNear: 700, fogFar: 3000 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  const throwT = s(10) + 0.85;
  return { bite: s(8) + 0.32, chew: s(8) + 0.6, throwT, splash: throwT + 1.5, inspect: s(6) + 1.3, scan: s(6) + 1.6, unk: s(7) - 0.05,
    open: s(11) + 0.15, gone: s(11) + 2.05, sword: s(12) + 0.1, coins: s(13) + 0.05, lvl: s(14) + 0.05, zero: s(15), toast: s(16) + 0.55, type: s(17) - 0.05,
    drain: s(18) - 0.1, shift: s(19) - 0.25, rise: s(20) - 0.35, realize: s(21), gather: s(22), msg: s(23) + 0.3, welcome: s(24) - 0.1, bow: s(25) + 0.15, aerial: e(25) + 0.1, end: ctx.dur };
}
const seaY = (t) => lerp(0, -128, easeIn(clamp((t - EV.drain) / 4.6)) * 0.6 + easeInOut(clamp((t - EV.drain) / 4.6)) * 0.4);

// ---- the world ----
const OTHERS = [
  { seed: 3, R: 112, top: 12, peak: 64, home: [-520, -300], ang: -2.5, rad: 345 },
  { seed: 5, R: 92, top: 10, peak: 42, home: [430, -420], ang: -0.85, rad: 345 },
  { seed: 8, R: 72, top: 8, peak: 12, home: [760, 120], ang: 0.2, rad: 360 },
  { seed: 11, R: 88, top: 9, peak: 30, home: [-760, 240], ang: 2.95, rad: 360 },
  { seed: 13, R: 62, top: 7, peak: 10, home: [-240, 640], ang: 2.2, rad: 450 },
  { seed: 17, R: 76, top: 9, peak: 26, home: [330, 600], ang: 0.95, rad: 450 },
  { seed: 19, R: 130, top: 14, peak: 92, home: [0, -900], ang: -1.62, rad: 410 },
];

function dressIsland(I, r, n, avoid = () => false) {
  const list = [], bushes = [], rocks = [];
  for (let i = 0; i < n * 8 && list.length < n; i++) { const u = 0.48 + r() * 0.44, a = r() * 6.283, p = I.place(u, a); if (avoid(p)) continue; if (p.y > I.top * 0.9 + 7) continue; list.push({ x: p.x, y: p.y, z: p.z, s: 0.75 + r() * 0.5, ry: r() * 6.283 }); }
  for (let i = 0; i < n * 2; i++) { const p = I.place(0.3 + r() * 0.55, r() * 6.283); if (avoid(p)) continue; bushes.push({ x: p.x, y: p.y + 0.5, z: p.z, s: 1 + r() * 1.3, ry: r() * 6 }); }
  for (let i = 0; i < n * 0.8; i++) { const p = I.place(0.8 + r() * 0.24, r() * 6.283); if (avoid(p)) continue; rocks.push({ x: p.x, y: p.y + 0.1, z: p.z, s: 0.9 + r() * 2.4, ry: r() * 6, rx: r() }); }
  palms(I.group, list);
  scatter(I.group, W.bush, W.bushM, bushes, ['#2f9a3a', '#4cb340', '#1f8a48', '#6cc24a', '#2ca65a']);
  scatter(I.group, W.rock, W.rockM, rocks, ['#8d8378', '#a09482', '#74706c']);
}

function hero(scene) {
  const I = makeIsland({ seed: 20, R: 84, top: 7, peak: 14, segs: 240, rings: 56 }); W.hero = I; scene.add(I.group);
  W.rock = rockGeo(); W.rockM = surf('concrete', '#ffffff', { roughness: 0.9 }).clone(); W.bush = bushGeo(); W.bushM = new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true });
  const a0 = 1.4, P0 = I.place(0.84, a0); W.P0 = P0;
  W.KC = I.place(0.66, 2.05); W.C = W.KC.clone().add(v3(-3.4, 0, -2.6)); W.C.y = I.heightAt(W.C.x, W.C.z);      // Kai, and the fruit a step away
  W.KD = v3(P0.x, 2.76, P0.z + 54); W.SP = I.place(0.9, 2.0); W.ky = Math.atan2(W.C.x - W.KC.x, W.C.z - W.KC.z) + 2.3; W.nSea = v3(Math.cos(2.0), 0, Math.sin(2.0));
  W.S = W.SP.clone().addScaledVector(W.nSea, 62); W.S.y = 0;
  const huts = [[0.56, 0.75, 0.4], [0.6, 1.2, 0.1], [0.5, 0.2, 1.0]], stalls = [[0.74, 0.95, 'FRUIT DEALER', '#e0533a'], [0.74, 1.72, 'BLADES', '#2e7bd6']];
  const taken = [...huts, ...stalls].map(([u, a]) => I.place(u, a));
  const avoid = (p) => p.distanceTo(W.C) < 13 || (Math.abs(p.x - W.KC.x - 4) < 15 && p.z > W.KC.z - 3 && p.z < W.KC.z + 40) || (Math.abs(p.x - P0.x) < 9 && p.z > P0.z - 18) || taken.some((q) => q.distanceTo(p) < 11) || p.distanceTo(W.SP) < 12 || [2.3, 2.42, 2.52, 2.62, 2.72].some((a) => I.place(0.84, a).distanceTo(p) < 12);
  dressIsland(I, rng(77), 86, avoid);
  // the cove: palms close round the stone, grass and flowers underfoot
  const ring = []; for (let i = 0; i < 9; i++) { const a = -0.1 + i * 0.5, q = W.C.clone().add(v3(Math.cos(a + 3.1) * 16, 0, Math.sin(a + 3.1) * 16)); q.y = I.heightAt(q.x, q.z); ring.push({ x: q.x, y: q.y, z: q.z, s: 0.9 + (i % 3) * 0.12, ry: i * 2.1 }); } palms(I.group, ring);
  const r = rng(9), tufts = []; for (let i = 0; i < 2600; i++) { const p = I.place(0.42 + r() * 0.42, 1.0 + r() * 1.9); if (p.y < 2.9) continue; if (Math.abs(p.x - W.C.x) < 1.6 && Math.abs(p.z - W.C.z) < 1.6) continue; tufts.push({ x: p.x, y: p.y - 0.04, z: p.z, s: 0.4 + r() * 0.34, ry: r() * 6 }); }
  const tm = scatter(I.group, tuftGeo(), tuftMat(), tufts); tm.castShadow = false; tm.userData.noAO = true;
  // the village
  huts.forEach(([u, a, ry], i) => { const p = I.place(u, a), h = hut({ wall: ['#a97c50', '#b98d5e', '#94693f'][i], roof: ['#c9a255', '#b89046', '#d4ae60'][i] }); h.position.copy(p); h.position.y -= 0.6; h.rotation.y = ry; I.group.add(h); });
  stalls.forEach(([u, a, txt, c]) => { const p = I.place(u, a), s = stall({ text: txt, color: c }); s.position.copy(p); s.position.y -= 0.1; s.rotation.y = Math.PI / 2 - a; I.group.add(s); });
  const d = dock(62); d.position.set(P0.x, 0.15, P0.z); I.group.add(d);
  for (const k of [[-5, 4], [5, 7]]) { const f = flagpole(k[0] < 0 ? '#e04a35' : '#2e7bd6'); f.position.set(P0.x + k[0], I.heightAt(P0.x + k[0], P0.z - k[1]), P0.z - k[1]); I.group.add(f); }
  const c1 = crate(); c1.position.set(P0.x - 2.4, 2.76, P0.z + 16); I.group.add(c1); const c2 = barrel(); c2.position.set(P0.x + 2.6, 2.76, P0.z + 11); I.group.add(c2);
  W.chest = chest(); W.chest.position.set(W.KD.x + 2.2, 2.76, W.KD.z - 6.2); W.chest.rotation.y = -0.5; I.group.add(W.chest);
  W.boat2 = sailboat({ hull: '#2e6fb0', sail: '#2e7bd6' }); W.boat2.position.set(P0.x - 9, 0, P0.z + 30); W.boat2.rotation.y = 0.15; scene.add(W.boat2);
  // the stone the fruit sits on
  const b = new Batch(), st = surf('cobble', '#b9b09c'), moss = paint('#3a6a30', { roughness: 0.95 });
  b.cyl(st, 1.1, 1.4, 1.5, 0, 0.75, 0, { seg: 8 }); b.cyl(st, 1.5, 1.6, 0.4, 0, 0.2, 0, { seg: 8 }); b.cyl(st, 1.36, 1.2, 0.3, 0, 1.6, 0, { seg: 8 }); b.box(moss, 1.7, 0.1, 1.2, 0.5, 1.72, 0.3, { r: 0.04, ry: 0.5 }); b.box(moss, 1.3, 0.34, 0.5, -1.1, 0.5, 0.6, { r: 0.1, ry: 1 });
  W.ped = new THREE.Group(); W.ped.position.copy(W.C); b.done(W.ped); I.group.add(W.ped);
  scatter(I.group, W.rock, W.rockM, [[-5, -6, 2.4], [6, -7, 3], [-8, 1, 1.6], [2, -9, 2]].map(([x, z, s]) => ({ x: W.C.x + x, y: W.C.y + 0.3, z: W.C.z + z, s, ry: x, rx: z })), ['#8d8378', '#a09482']);
  const glint = new THREE.PointLight('#dff4ff', 0, 16, 1.6); glint.position.copy(W.C).add(v3(0, 3.4, 0)); I.group.add(glint); W.glint = glint;
  W.sh1 = shaft(scene, { from: W.C.clone().add(v3(14, 44, 7)), to: W.C.clone().add(v3(0, 1, 0)), top: 2, bottom: 5, color: '#fff0c8', amount: 0.42 });
  W.sh2 = shaft(scene, { from: W.C.clone().add(v3(22, 40, 3)), to: W.C.clone().add(v3(3, 0, -1)), top: 1.4, bottom: 3.4, color: '#ffe0a8', amount: 0.26 });
}

function archipelago(scene) {
  W.isles = OTHERS.map((o) => {
    const I = makeIsland({ seed: o.seed, R: o.R, top: o.top, peak: o.peak, segs: 110, rings: 30, pos: v3(o.home[0], 0, o.home[1]) });
    dressIsland(I, rng(o.seed * 7), 46); scene.add(I.group);
    I.dest = v3(Math.cos(o.ang) * o.rad, 0, Math.sin(o.ang) * o.rad); I.turn = (o.seed % 2 ? 1 : -1) * 1.1; return I;
  });
  // three small islands that float: this game has always been a little magic
  W.floats = [[-300, 150, -620, 40], [520, 200, -300, 30], [-120, 230, 860, 34]].map(([x, y, z, s], i) => {
    const g = new THREE.Group(), b = new Batch(), rk = surf('concrete', '#8d7f70'), grass = paint('#4fb33a', { roughness: 0.9 });
    const rock = new THREE.Mesh(rockGeo(i + 5).clone().scale(s, s * 1.5, s), W.rockM); rock.position.y = -s * 0.9; rock.castShadow = true; g.add(rock);
    b.cyl(grass, s * 0.86, s * 0.96, 2.4, 0, 0, 0, { seg: 18 }); b.done(g); void rk;
    palms(g, [{ x: s * 0.2, y: 1, z: 0, s: 0.8, ry: 1 }, { x: -s * 0.35, y: 1, z: s * 0.3, s: 0.7, ry: 3 }, { x: 0, y: 1, z: -s * 0.4, s: 0.6, ry: 5 }]);
    g.position.set(x, y, z); g.base = y; scene.add(g); return g;
  });
  W.ship = galleon(); W.ship.position.set(-320, 0, 390); W.ship.rotation.y = 1.95; scene.add(W.ship);
  W.boat = sailboat(); scene.add(W.boat);
}

function firstVersion(scene) {
  W.bed = seabed(scene);
  const keep = (x, z) => {
    if (Math.hypot(x, z) < 150) return false;
    if (Math.hypot(x - W.T.x, z - W.T.z) < 150) return false;
    if (Math.hypot(x - W.ship.position.x, z - W.ship.position.z) < 70) return false;
    if (Math.abs(x - W.KD.x) < 26 && z > 0 && z < W.T.z) return false;       // the processional way from the pier to the temple
    return !W.isles.some((I) => Math.hypot(x - I.dest.x, z - I.dest.z) < I.R * 1.72);
  };
  W.T = v3(W.KD.x, SEABED, W.KD.z + 300);
  W.city = city(scene, { keep, inner: 160, outer: 1500, rings: 30 });
  W.temple = greatTemple({ s: 1.5 }); W.temple.rotation.y = Math.PI; W.temple.position.copy(W.T); scene.add(W.temple);
  const r = rng(31), dustL = [], mist = [];
  for (const { items } of W.city.list) items.forEach((p, i) => { if (i % 2) return; for (let k = 0; k < 2; k++) dustL.push({ x: p.x + (r() - 0.5) * 34, y: SEABED + 3 + r() * 8, z: p.z + (r() - 0.5) * 34, t0: p.d + r() * 1.5, dur: 3.2, size: 20 + r() * 26, rise: 18 + r() * 26 }); });
  for (let i = 0; i < 420; i++) { const a = r() * 6.283, d = 140 + r() * 1100; mist.push({ x: Math.cos(a) * d, y: 0, z: Math.sin(a) * d, t0: r() * 4.2, dur: 2.2, size: 30 + r() * 50, rise: 12 }); }
  W.dustT = plumes(scene, dustL, { color: '#e6d3ac', alpha: 0.42 }); W.mist = plumes(scene, mist, { color: '#ffffff', alpha: 0.28 });
  const trail = []; W.isles.forEach((I) => { for (let i = 0; i < 90; i++) { const k = r(), p = lp3(I.home, I.dest, k), a = r() * 6.283, d = I.R * 1.5; trail.push({ x: p.x + Math.cos(a) * d, y: SEABED + 4, z: p.z + Math.sin(a) * d, t0: k * 4 + r() * 0.5, dur: 2.6, size: 34 + r() * 44, rise: 30 }); } });
  W.trail = plumes(scene, trail, { color: '#d9c49c', alpha: 0.45 });
}

function people(scene) {
  W.kai = makeCharacter({ avatar: 'farm_kai', alti: true, skin: '#f2c79a', caustic: false }); scene.add(W.kai.root);
  const E = W.kai;
  const sw = new THREE.Group(); sw.add(katana()); sw.scale.setScalar(0.62); sw.position.set(0.05, 1.05, -0.66); sw.rotation.z = 0.8; E.torso.add(sw); W.sword = sw; W.swordV = vanisher({ root: sw }, '#ffcf5a');
  W.hand = fruit({ size: 0.56 }); W.hand.position.set(0, -2.28, 0.26); E.arms[1].add(W.hand);
  W.ped2 = fruit({ size: 0.82 }); W.ped2.position.copy(W.C).add(v3(0, 2.75, 0)); scene.add(W.ped2);
  W.fly = fruit({ size: 1.3 }); scene.add(W.fly);
  const tagC = document.createElement('canvas'); tagC.width = 768; tagC.height = 128; W.tagX = tagC.getContext('2d'); W.tagT = new THREE.CanvasTexture(tagC); W.tagT.colorSpace = THREE.SRGBColorSpace;
  W.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tagT, transparent: true, depthWrite: false, toneMapped: false })); W.tag.scale.set(6.4, 1.07, 1); W.tag.position.y = 7.1; E.root.add(W.tag); W.tag.userData.noAO = true; W.tagS = '';
  // the map he carries while searching
  const mp = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.5), new THREE.MeshStandardMaterial({ map: mapTex(), side: THREE.DoubleSide, roughness: 0.9 })); mp.position.set(0, -2.1, 0.7); mp.rotation.x = 1.2; E.arms[0].add(mp); W.map = mp;

  // named extras: procedural, so they render fast; they have faces for the close shots
  const looks = [
    { shirt: '#f4efe4', pants: '#23324e', hair: '#1f1a16', hairStyle: 'short', acc: ['cap'], accColor: '#f4efe4' },
    { shirt: '#c8362e', pants: '#3a2a20', hair: '#6b3a1e', hairStyle: 'bacon' },
    { shirt: '#f1b82d', pants: '#25324d', hair: '#111114', hairStyle: 'short', female: true, },
    { shirt: '#2fa35a', pants: '#6b5238', hair: '#b98a3a', hairStyle: 'ponytail', female: true },
    { shirt: '#2e7bd6', pants: '#e8e4dc', hair: '#2a1c12', hairStyle: 'spiky' },
    { shirt: '#7a3fb0', pants: '#1f2024', hair: '#d8d4cc', hairStyle: 'short' },
    { shirt: '#e8753a', pants: '#25324d', hair: '#7a2f1c', hairStyle: 'bob', female: true },
    { shirt: '#37b8b0', pants: '#3a3f4a', hair: '#111114', hairStyle: 'wavy', female: true },
  ];
  W.npc = []; for (let i = 0; i < 16; i++) { const l = looks[i % looks.length], c = makeCharacter({ ...l, skin: ['#f3cfa8', '#e0ac7c', '#b97e50', '#8a5634'][i % 4], caustic: false }); scene.add(c.root); c.setFace('smile'); W.npc.push(c); }
  // the pier, in two lines, and every other NPC: the beach, the temple stairs, the islands of the ring
  const r = rng(52), list = [], KD = W.KD, face = (x, z) => Math.atan2(KD.x - x, KD.z - z), dl = (x, y, z) => Math.hypot(x - KD.x, z - KD.z) * 0.0022 + r() * 0.12;
  const put = (x, y, z) => list.push({ x, y, z, yaw: face(x, z), d: dl(x, y, z) });
  const I = W.hero; for (let i = 0; i < 300; i++) { const a = 0.55 + r() * 1.75, p = I.place(0.62 + r() * 0.3, a); if (Math.abs(p.x - W.P0.x) < 5 && p.z > W.P0.z - 3) continue; put(p.x, p.y, p.z); }
  for (let i = 0; i < 40; i++) for (let k = 0; k < 3; k++) { const s = i / 40, z = W.T.z - 102 * 1 + 0 - 0, yy = SEABED + s * 157, zz = W.T.z - 102 + s * 89; void z; put(W.T.x + (k - 1) * 12 + (r() - 0.5) * 3, yy, zz); }
  W.isles.forEach((J) => { const c = Math.cos(J.turn), s = Math.sin(J.turn); for (let i = 0; i < 90; i++) { const p = J.place(0.5 + r() * 0.42, r() * 6.283), x = J.dest.x + p.x * c + p.z * s, z = J.dest.z - p.x * s + p.z * c; put(x, p.y, z); } });
  const g = new THREE.Group(); scene.add(g); W.crowdG = g; W.crowd = bowingCrowd(g, list, { shadows: false }); W.crowdN = list.length + W.npc.length;
}

function mapTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384; const x = c.getContext('2d'); x.fillStyle = '#e9d7a8'; x.fillRect(0, 0, 512, 384); x.strokeStyle = '#8a6a3c'; x.lineWidth = 6; x.strokeRect(10, 10, 492, 364);
  x.fillStyle = '#b89a5e'; for (const [a, b, r] of [[140, 130, 54], [340, 90, 36], [380, 260, 62], [150, 290, 30]]) { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }
  x.strokeStyle = '#c0392b'; x.setLineDash([16, 14]); x.lineWidth = 6; x.beginPath(); x.moveTo(60, 340); x.bezierCurveTo(160, 220, 240, 260, 330, 180); x.stroke(); x.setLineDash([]); x.lineWidth = 10; x.beginPath(); x.moveTo(320, 170); x.lineTo(350, 200); x.moveTo(350, 170); x.lineTo(320, 200); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---- where Kai is ----
const beachAt = (k) => W.hero.place(0.84, lerp(2.72, 2.42, k));
const walkIn = (k) => { const a = W.hero.place(0.84, 2.3), b = W.KC, p = lp3(a, b, k); p.y = W.hero.heightAt(p.x, p.z); return p; };
const boatPos = (t) => v3(-42 + t * 8, 0, 232);

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, S = [], add = (name, t0, f) => S.push({ name, t0: () => t0, f, t1: () => 0 });
  const K = () => W.KC, D = () => W.KD;
  add('sail', 0, (u, t) => { const b = boatPos(t); return { pos: v3(b.x + lerp(15, 9, u), 2.6 + Math.sin(t * 1.2) * 0.15, b.z + 17), look: v3(b.x + 2.3, 6.2, b.z), fov: 46, roll: -0.03 }; });
  add('beachwalk', 2.15, (u) => { const k = lerp(0, 0.75, u), p = beachAt(k), q = beachAt(k + 0.1); return { pos: v3(p.x - 9, p.y + 2.6, p.z + 15), look: p.clone().add(v3(1, 2.6, 0)), fov: 44 }; });
  add('morning', s(1) - 0.05, (u) => ({ pos: lp3(v3(W.KC.x + 8, 15, W.KC.z + 30), v3(W.KC.x + 7, 7, W.KC.z + 11.5), easeInOut(u)), look: lp3(v3(W.KC.x - 2, 4, W.KC.z - 3), W.KC.clone().add(v3(-0.6, 3.7, 0)), easeInOut(u)), fov: lerp(46, 34, u) }));
  add('fruit', s(2) - 0.1, (u) => { const c = W.ped2.position, a = lerp(0.3, 0.95, u), d = lerp(11.5, 8.2, easeOut(u)); return { pos: v3(c.x + Math.sin(a) * d, c.y + 0.3 - u * 0.2, c.z + Math.cos(a) * d), look: c.clone().add(v3(0, -0.18, 0)), fov: 30 }; });
  add('nocolor', s(3) - 0.1, (u) => { const k = K(); return { pos: orbit(k, W.ky - 0.6 - u * 0.15, 12.5, 4.2), look: k.clone().add(v3(Math.sin(W.ky) * 1.0, 5.2, Math.cos(W.ky) * 1.0)), fov: 36 }; });
  add('noname', s(4) - 0.1, (u) => { const k = K(); return { pos: orbit(k, W.ky - 0.3 - u * 0.15, 11.5, 2.8), look: k.clone().add(v3(Math.sin(W.ky) * 1.0, 5.2, Math.cos(W.ky) * 1.0)), fov: 38 }; });
  add('inspect', s(6) - 0.15, (u) => { const k = K(); return { pos: orbit(k, W.ky + Math.PI - 0.62 + u * 0.2, 8, 5.4), look: k.clone().add(v3(Math.sin(W.ky) * 2, 3.9, Math.cos(W.ky) * 2)), fov: 38 }; });
  add('unknown', e.unk, (u) => { const k = K(); return { pos: orbit(k, W.ky - 0.4, lerp(12.5, 10.8, u), 3.1), look: k.clone().add(v3(Math.sin(W.ky) * 1.3, 4.7, Math.cos(W.ky) * 1.3)), fov: 38, roll: 0.05 }; });
  add('bite', s(8) - 0.15, (u) => { const k = K(); return { pos: orbit(k, W.ky - 0.45, 12, 4.6), look: k.clone().add(v3(0, 4.6, 0)), fov: 32 }; });
  add('nothing', s(9) - 0.25, (u) => { const k = K(); return { pos: orbit(k, W.ky + 0.3, 14, 3.4), look: k.clone().add(v3(0, 3.1, 0)), fov: 38 }; });
  add('throw', s(10) - 0.15, (u) => { const p = W.SP, n = W.nSea, sd = v3(-n.z, 0, n.x); return { pos: p.clone().addScaledVector(sd, -24).addScaledVector(n, 2).add(v3(0, 3.2, 0)), look: p.clone().addScaledVector(n, 1.4).add(v3(0, 3.4, 0)), fov: 42 }; });
  add('arc', e.throwT + 0.32, (u, t) => { const f = flyAt(t); return { pos: W.SP.clone().addScaledVector(W.nSea, 8).add(v3(-14, 6, 0)).lerp(W.S.clone().add(v3(-46, 26, -62)), easeInOut(u)), look: lp3(f, W.S.clone().add(v3(0, 3, 0)), smooth(0.55, 0.9, u)), fov: lerp(36, 46, u) }; });
  add('inv', s(11) - 0.1, (u) => { const k = D(); return { pos: orbit(k, 0.35 - u * 0.1, lerp(14, 11.5, u), 3.4), look: k.clone().add(v3(0, 5.6, 0)), fov: 40 }; });
  add('sword', s(12) - 0.1, (u) => { const k = D(); return { pos: orbit(k, 0.3 + Math.PI - 0.45 + u * 0.25, 8.4, 5), look: k.clone().add(v3(0, 3.9, 0)), fov: 34 }; });
  add('money', s(13) - 0.1, (u) => { const c = W.chest.position; return { pos: orbit(c, 0.5, lerp(10, 8.4, u), 6), look: c.clone().add(v3(0, 1.4, 0)), fov: 36 }; });
  add('level', s(14) - 0.1, (u) => { const k = D(); return { pos: orbit(k, 0.28, 11, 2.2), look: k.clone().add(v3(0, 5, 0)), fov: 42 }; });
  add('zero', s(15) - 0.05, (u) => { const k = D(); return { pos: orbit(k, 0.5 + u * 0.15, lerp(13, 26, easeOut(u)), lerp(3, 11, u)), look: k.clone().add(v3(0, 3.4, 0)), fov: 40 }; });
  add('notif', s(16) - 0.05, (u) => { const k = D(); return { pos: orbit(k, 0.1 - u * 0.2, lerp(13, 10, u), 1.6), look: k.clone().add(v3(0, 5.5, 0)), fov: 44 }; });
  add('drain', e.drain, (u) => ({ pos: lp3(v3(-240, 120, 470), v3(-280, 190, 520), u), look: lp3(W.S.clone().add(v3(40, -14, -20)), v3(40, -50, 80), u), fov: 50 }));
  add('shift', e.shift + 0.5, (u) => { const k = D(); return { pos: k.clone().add(v3(lerp(-4.5, -3.2, u), 6.5, lerp(-9.5, -8, u))), look: lp3(W.isles[5].group.position.clone().add(v3(0, 6, 0)), W.isles[5].group.position.clone().add(v3(0, 6, 0)), u).lerp(k.clone().add(v3(40, -26, 150)), 0.35), fov: 54 }; });
  add('rise', e.rise + 0.25, (u) => ({ pos: lp3(v3(W.KD.x + 8, SEABED + 34, W.KD.z + 66), v3(W.KD.x - 6, -8, W.KD.z + 30), easeInOut(u)), look: lp3(v3(W.KD.x + 60, SEABED + 70, W.KD.z + 300), v3(W.KD.x, SEABED + 96, W.KD.z + 300), easeInOut(u)), fov: 60 }));
  add('realize', s(21) - 0.1, (u) => { const k = D(); return { pos: orbit(k, 0.3, lerp(10.5, 8.4, u), 2.1), look: k.clone().add(v3(0, 3.6, 0)), fov: 36 }; });
  add('overlook', s(22) - 0.15, (u) => { const k = D(); return { pos: k.clone().add(v3(lerp(-4, -8, u), lerp(7.6, 30, easeInOut(u)), lerp(-10, -34, easeInOut(u)))), look: lp3(k.clone().add(v3(1.5, 6.2, 40)), W.T.clone().add(v3(0, 118, 0)), easeInOut(u)), fov: 54 }; });
  add('welcome', e.welcome - 1.45, (u) => { const k = D(); return { pos: k.clone().add(v3(-1.2, lerp(13, 11.6, u), lerp(-25, -19, u))), look: k.clone().add(v3(0, 6.2, 0)), fov: 44 }; });
  add('bow', s(25) - 0.2, (u) => { const k = D(); return { pos: k.clone().add(v3(1.9, lerp(8.2, 9.4, u), lerp(5.4, 6.4, u))), look: k.clone().add(v3(0, 0.6, -36)), fov: 44 }; });
  add('aerial', e.aerial, (u) => { const k = D(), q = easeInOut(u); return { pos: k.clone().add(v3(lerp(-62, -170, q), lerp(44, 430, q), lerp(-24, -380, q))), look: lp3(k.clone().add(v3(0, 2, 0)), k.clone().add(v3(0, -60, 130)), q), fov: 58 }; });
  S.forEach((x, i) => { const nx = S[i + 1]; x.t0 = (() => { const v = x.t0(); return () => v; })(); x.t1 = nx ? nx.t0 : () => ctx.dur + 1; });
  S.forEach((x, i) => { if (S[i + 1]) { const v = S[i + 1].t0(); x.t1 = () => v; } });
  S[S.length - 1].t1 = () => ctx.dur;
  return S;
}
const handStart = () => W.SP.clone().add(v3(0, 6.4, 0)).addScaledVector(W.nSea, 1);
function flyAt(t) { const k = clamp((t - EV.throwT) / (EV.splash - EV.throwT)), a = handStart(); const p = lp3(a, W.S, k); p.y = lerp(a.y, 0, k) + 34 * 4 * k * (1 - k); return p; }

// ---- the game's screen ----
const F = (px) => `900 ${px}px ITTInter, sans-serif`, MONO = (px) => `700 ${px}px "Courier New", Courier, monospace`;
function hudInit() { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; c.style.cssText = 'position:absolute;inset:0;pointer-events:none;'; ctx.grade.after(c); W.hud = c; W.h2 = c.getContext('2d'); }
function txt(x, s, px, py, o = {}) { x.font = o.font || F(40); x.textAlign = o.align || 'left'; x.textBaseline = 'alphabetic'; x.lineJoin = 'round'; if (o.stroke !== 0) { x.lineWidth = o.stroke ?? 10; x.strokeStyle = o.edge || 'rgba(8,14,30,0.92)'; x.strokeText(s, px, py); } x.fillStyle = o.col || '#ffffff'; x.fillText(s, px, py); }
function rrect(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
const pop = (k) => { const c = clamp(k), o = 1 + 2.2 * Math.pow(c - 1, 3) + 1.2 * Math.pow(c - 1, 2); return c <= 0 ? 0 : o; };
const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
function stats(t, x, lv, cash, alert) {
  const a = 56, b = 150;
  x.fillStyle = 'rgba(10,18,38,0.72)'; rrect(x, a, b, 470, 124, 22); x.fill(); x.strokeStyle = alert ? '#ff4a5a' : '#ffd23f'; x.lineWidth = 6; x.stroke();
  x.fillStyle = alert ? '#ff4a5a' : '#ffd23f'; x.beginPath(); x.arc(a + 62, b + 62, 46, 0, 7); x.fill();
  txt(x, 'LV', a + 62, b + 44, { font: F(22), align: 'center', col: '#141a2c', stroke: 0 }); txt(x, String(Math.round(lv)), a + 62, b + 86, { font: F(lv >= 1000 ? 30 : 44), align: 'center', col: '#141a2c', stroke: 0 });
  const k = lv > 0 ? 1 : 0.02; x.fillStyle = '#26324a'; rrect(x, a + 124, b + 20, 326, 22, 11); x.fill(); x.fillStyle = '#35d07f'; rrect(x, a + 124, b + 20, Math.max(22, 326 * 0.92 * k), 22, 11); x.fill();
  x.fillStyle = '#26324a'; rrect(x, a + 124, b + 50, 326, 16, 8); x.fill(); x.fillStyle = '#3fa8ff'; rrect(x, a + 124, b + 50, Math.max(16, 326 * 0.7 * k), 16, 8); x.fill();
  txt(x, money(cash), a + 124, b + 108, { font: F(36), col: alert ? '#ff5a68' : '#7dff9a', stroke: 7 });
}
function card(x, t, k, rows) {
  const w = 760, h = 470, cx = 540, cy = 520, s = pop(k); if (s <= 0) return; x.save(); x.translate(cx, cy); x.scale(s, s); x.translate(-w / 2, -h / 2);
  x.fillStyle = 'rgba(12,20,44,0.9)'; rrect(x, 0, 0, w, h, 30); x.fill(); x.strokeStyle = '#8fa8d8'; x.lineWidth = 7; x.stroke();
  x.fillStyle = 'rgba(255,255,255,0.08)'; rrect(x, 30, 30, 190, 190, 22); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.32)'; x.lineWidth = 4; x.stroke();
  x.strokeStyle = 'rgba(220,240,255,0.9)'; x.lineWidth = 5; x.beginPath(); x.ellipse(125, 132, 62, 58, 0, 0, 7); x.stroke(); x.beginPath(); x.moveTo(125, 74); x.quadraticCurveTo(128, 58, 146, 52); x.stroke(); x.strokeStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.arc(106, 112, 22, 3.3, 4.6); x.stroke();
  const lab = ['COLOR', 'NAME', 'DESCRIPTION'];
  lab.forEach((l, i) => { const y = i < 2 ? 88 + i * 92 : 304, X = i < 2 ? 250 : 34; const on = rows > i; if (!on) return; txt(x, l, X, y, { font: F(34), col: '#9ec0ff', stroke: 0 }); x.fillStyle = 'rgba(255,255,255,0.22)'; rrect(x, X, y + 16, i < 2 ? 470 : 692, i < 2 ? 28 : 112, 10); x.fill(); if (i === rows - 1 && Math.floor(t * 3) % 2 === 0) { x.fillStyle = '#ffffff'; x.fillRect(X + 12, y + 20, 6, 20); } });
  x.restore();
}
function inspectBar(x, t) {
  const on = t >= EV.inspect, k = pop((t - (L(6).start - 0.05)) / 0.25); if (k <= 0) return;
  x.save(); x.translate(540, 350); x.scale(k, k); const press = on && t < EV.inspect + 0.16 ? 0.92 : 1; x.scale(press, press);
  x.fillStyle = on ? '#ffd23f' : '#2e7bd6'; rrect(x, -190, -56, 380, 112, 28); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 7; x.stroke(); txt(x, 'INSPECT', 0, 22, { font: F(62), align: 'center', col: on ? '#141a2c' : '#fff', stroke: 0 }); x.restore();
  if (t >= EV.scan) { const k2 = clamp((t - EV.scan) / (EV.unk - EV.scan)); x.fillStyle = 'rgba(10,18,38,0.8)'; rrect(x, 190, 392, 700, 40, 20); x.fill(); x.fillStyle = '#c58bff'; rrect(x, 190, 392, Math.max(40, 700 * k2), 40, 20); x.fill(); }
}
const GLY = '#@%&?!/*01XZ';
function unknown(x, t) {
  const k = t - EV.unk, s = pop(k / 0.22), word = 'UNKNOWN'; if (s <= 0) return; let w = '';
  for (let i = 0; i < word.length; i++) w += k > 0.25 + i * 0.05 ? word[i] : GLY[(Math.floor(t * 30) * 7 + i * 5) % GLY.length];
  x.save(); x.translate(540, 480); x.scale(s, s); x.fillStyle = 'rgba(16,6,36,0.92)'; rrect(x, -420, -190, 840, 340, 34); x.fill(); x.strokeStyle = '#c58bff'; x.lineWidth = 9; x.stroke();
  txt(x, 'ITEM', 0, -112, { font: F(44), align: 'center', col: '#9f8ad8', stroke: 0 }); const jx = k < 0.5 ? Math.sin(t * 120) * 7 : 0;
  x.shadowColor = '#b56bff'; x.shadowBlur = 44; txt(x, w, jx, 34, { font: F(136), align: 'center', col: '#e6ccff', stroke: 0 }); x.shadowBlur = 0; x.restore();
}
function slot(x, i, a, b, s) {
  const ic = i % 12; x.fillStyle = 'rgba(255,255,255,0.1)'; rrect(x, a, b, s, s, 16); x.fill(); x.strokeStyle = 'rgba(180,200,255,0.5)'; x.lineWidth = 4; x.stroke();
  return ic;
}
const ICON = [
  (x, c) => { x.strokeStyle = '#dfe8ff'; x.lineWidth = 12; x.beginPath(); x.moveTo(c - 44, c + 44); x.lineTo(c + 44, c - 44); x.stroke(); x.strokeStyle = '#c8362e'; x.lineWidth = 16; x.beginPath(); x.moveTo(c - 54, c + 54); x.lineTo(c - 32, c + 32); x.stroke(); x.strokeStyle = '#ffd23f'; x.lineWidth = 8; x.beginPath(); x.moveTo(c - 44, c + 18); x.lineTo(c - 18, c + 44); x.stroke(); },
  (x, c) => { x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(c, c, 42, 0, 7); x.fill(); x.fillStyle = '#c8982a'; x.font = F(50); x.textAlign = 'center'; x.fillText('$', c, c + 18); },
  (x, c) => { x.fillStyle = '#ff5a68'; rrect(x, c - 26, c - 16, 52, 60, 12); x.fill(); x.fillStyle = '#b8c8e8'; x.fillRect(c - 12, c - 40, 24, 26); },
  (x, c) => { x.fillStyle = '#ff7a2a'; x.beginPath(); x.arc(c, c + 6, 36, 0, 7); x.fill(); x.strokeStyle = '#3a9a3a'; x.lineWidth = 8; x.beginPath(); x.moveTo(c, c - 28); x.lineTo(c + 12, c - 44); x.stroke(); },
  (x, c) => { x.strokeStyle = '#b8c8e8'; x.lineWidth = 8; x.beginPath(); x.arc(c, c, 38, 0, 7); x.stroke(); x.fillStyle = '#ff5a68'; x.beginPath(); x.moveTo(c, c - 28); x.lineTo(c + 11, c + 4); x.lineTo(c - 11, c + 4); x.fill(); },
  (x, c) => { x.fillStyle = '#e9d7a8'; x.fillRect(c - 40, c - 30, 80, 60); x.strokeStyle = '#c0392b'; x.lineWidth = 6; x.beginPath(); x.moveTo(c - 26, c + 14); x.lineTo(c + 22, c - 12); x.stroke(); },
  (x, c) => { x.fillStyle = '#5fe0ff'; x.beginPath(); x.moveTo(c, c - 44); x.lineTo(c + 34, c); x.lineTo(c, c + 44); x.lineTo(c - 34, c); x.fill(); },
  (x, c) => { x.fillStyle = '#9fd0ff'; x.beginPath(); x.ellipse(c - 6, c, 38, 20, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(c + 26, c); x.lineTo(c + 50, c - 18); x.lineTo(c + 50, c + 18); x.fill(); },
  (x, c) => { x.fillStyle = '#c58bff'; x.beginPath(); x.arc(c, c + 6, 34, 0, 7); x.fill(); x.fillStyle = '#7a3fb0'; x.fillRect(c - 3, c - 40, 6, 20); },
  (x, c) => { x.fillStyle = '#8a6a48'; rrect(x, c - 40, c - 24, 80, 54, 10); x.fill(); x.fillStyle = '#ffd23f'; x.fillRect(c - 8, c - 6, 16, 18); },
  (x, c) => { x.strokeStyle = '#ffd23f'; x.lineWidth = 9; x.beginPath(); x.moveTo(c, c - 42); x.lineTo(c, c + 34); x.moveTo(c - 26, c - 16); x.lineTo(c + 26, c - 16); x.moveTo(c - 34, c + 12); x.quadraticCurveTo(c, c + 58, c + 34, c + 12); x.stroke(); },
  (x, c) => { x.fillStyle = '#35d07f'; x.beginPath(); x.moveTo(c, c - 42); x.quadraticCurveTo(c + 42, c, c, c + 42); x.quadraticCurveTo(c - 42, c, c, c - 42); x.fill(); },
];
function inventory(x, t) {
  const k = pop((t - EV.open) / 0.26); if (k <= 0) return; const w = 840, h = 660, sz = 176, gap = 18; x.save(); x.translate(540, 560); x.scale(k * 0.84, k * 0.84); x.translate(-w / 2, -h / 2);
  x.fillStyle = 'rgba(12,20,44,0.9)'; rrect(x, 0, 0, w, h, 30); x.fill(); x.strokeStyle = '#ffd23f'; x.lineWidth = 7; x.stroke(); txt(x, 'INVENTORY', w / 2, 74, { font: F(58), align: 'center', col: '#ffd23f', stroke: 0 });
  for (let i = 0; i < 12; i++) { const a = 24 + (i % 4) * (sz + gap), b = 98 + Math.floor(i / 4) * (sz + gap), gone = EV.gone + [5, 0, 9, 3, 7, 1, 10, 4, 2, 8, 11, 6][i] * 0.1, on = t < gone; slot(x, i, a, b, sz); if (on) { x.save(); x.translate(a, b); ICON[i](x, sz / 2); x.restore(); } else if (t < gone + 0.14) { x.fillStyle = `rgba(255,255,255,${(1 - (t - gone) / 0.14).toFixed(2)})`; rrect(x, a, b, sz, sz, 16); x.fill(); } }
  x.restore();
}
function bigNumber(x, s, y, col, k = 1) { const p = pop(k); x.save(); x.translate(540, y); x.scale(p, p); txt(x, s, 0, 0, { font: F(s.length > 9 ? 112 : 150), align: 'center', col, stroke: 16 }); x.restore(); }
function dialog(x, t, msg, k) {
  const s = clamp(k * 3), w = 860, h = 330, a = 110, b = 300 + (1 - s) * -420; if (s <= 0) return;
  x.fillStyle = '#c3c3c3'; x.fillRect(a, b, w, h); x.fillStyle = '#ffffff'; x.fillRect(a, b, w, 6); x.fillRect(a, b, 6, h); x.fillStyle = '#6e6e6e'; x.fillRect(a, b + h - 6, w, 6); x.fillRect(a + w - 6, b, 6, h);
  x.fillStyle = '#10307e'; x.fillRect(a + 14, b + 14, w - 28, 54); x.fillStyle = '#c3c3c3'; x.fillRect(a + w - 60, b + 22, 38, 38); x.fillStyle = '#000'; x.font = MONO(30); x.textAlign = 'center'; x.fillText('X', a + w - 41, b + 52);
  x.fillStyle = '#ffd23f'; x.beginPath(); x.moveTo(a + 94, b + 106); x.lineTo(a + 150, b + 204); x.lineTo(a + 38, b + 204); x.closePath(); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 5; x.stroke(); x.fillStyle = '#000'; x.font = '900 64px "Courier New", monospace'; x.fillText('!', a + 94, b + 194);
  x.textAlign = 'left'; x.font = '700 54px "Courier New", monospace'; x.fillStyle = '#000'; msg.split('\n').forEach((l, i) => x.fillText(l, a + 176, b + 140 + i * 70));
  if (msg.length && Math.floor(t * 4) % 2 === 0) { const l = msg.split('\n').pop(), lines = msg.split('\n').length; x.fillRect(a + 176 + x.measureText(l).width + 6, b + 100 + (lines - 1) * 70, 26, 46); }
}
function typed(t, s, t0, dur) { const n = Math.floor(clamp((t - t0) / dur) * s.length); return s.slice(0, n); }
function welcome(x, t) {
  const k = clamp((t - EV.welcome) / 0.8); if (k <= 0) return; const fade = 1 - smooth(EV.aerial + 2.2, EV.aerial + 3.2, t); x.save(); x.globalAlpha = Math.min(1, k * 1.6) * fade; const sc = lerp(0.86, 1, easeOut(k));
  x.translate(540, 410); x.scale(sc, sc); x.shadowColor = '#ffb74a'; x.shadowBlur = 52; txt(x, 'WELCOME BACK,', 0, -40, { font: F(96), align: 'center', col: '#fff4cf', stroke: 12, edge: 'rgba(60,24,0,0.86)' }); x.shadowColor = '#b56bff'; txt(x, 'CREATOR', 0, 110, { font: F(172), align: 'center', col: '#ffd23f', stroke: 16, edge: 'rgba(60,24,0,0.9)' }); x.restore();
}

function drawHud(t, n) {
  const x = W.h2; x.clearRect(0, 0, 1080, 1920);
  if (ctx.thumbMode) return;
  const e = EV, game = t < e.drain - 0.15;
  const lv = t < e.lvl ? 2450 : 2450 * (1 - easeOut(clamp((t - e.lvl) / 0.75))), cash = t < e.coins ? 1245900 : 1245900 * (1 - easeOut(clamp((t - e.coins) / 0.8)));
  if (game) {
    const glitch = t > e.drain - 0.5 ? (Math.floor(t * 18) % 2) : 1;
    if (glitch && !['fruit', 'unknown'].includes(n)) stats(t, x, lv, cash, t >= e.zero);
  }
  if (n === 'nocolor' || n === 'noname') card(x, t, (t - (L(3).start - 0.05)) / 0.22, t >= L(5).start - 0.05 ? 3 : t >= L(4).start - 0.05 ? 2 : 1);
  if (n === 'inspect') inspectBar(x, t);
  if (n === 'unknown') unknown(x, t);
  if (n === 'inv') inventory(x, t);
  if (n === 'money') bigNumber(x, money(cash), 560, t > e.coins + 0.8 ? '#ff5a68' : '#7dff9a', (t - e.coins + 0.08) / 0.2);
  if (n === 'level') bigNumber(x, `LV ${Math.round(lv).toLocaleString('en-US')}`, 440, t > e.lvl + 0.75 ? '#ff5a68' : '#ffd23f', (t - e.lvl + 0.08) / 0.2);
  if (n === 'zero') bigNumber(x, '0', 560, '#ff3344', (t - e.zero) / 0.2);
  if (n === 'notif') dialog(x, t, t < e.type ? '' : (() => { const a = 'YOU HAVE UNLOCKED', b = 'THE FIRST VERSION.', d = L(17).end - L(17).start - 0.2, s = typed(t, a + b, e.type, d); return s.length > a.length ? `${a}\n${s.slice(a.length)}` : s; })(), (t - e.toast) / 0.5);
  if (['welcome', 'bow', 'aerial'].includes(n)) welcome(x, t);
}

function renderAt(t) {
  const first = !ctx.sub || ctx.sub.i === 0, sh = shotAt(W.shots, t), n = sh.name, e = EV, E = W.kai;
  // light
  const cove = ['morning', 'fruit', 'nocolor', 'noname', 'inspect', 'unknown', 'bite', 'nothing'].includes(n);
  let env = cove ? MORN : TROP;
  if (t > L(16).start) env = mixP(TROP, STRANGE, smooth(L(16).start, L(17).start + 0.4, t));
  if (t > e.drain - 0.3) env = mixP(STRANGE, STORM, smooth(e.drain - 0.3, e.drain + 1.4, t));
  if (t > e.rise) env = mixP(STORM, GOLD, smooth(e.rise, e.realize + 0.6, t));
  applyEnv(ctx, env);
  palmTime(t);

  // the sea
  const u = W.sea.u, level = seaY(t), drained = t > e.drain + 4.5; W.sea.position.y = level; W.sea.visible = !drained;
  u.uT.value = t; u.uSun.value.copy(env.sunDir); u.uSunC.value.copy(env.sunColor); u.uTop.value.copy(env.top); u.uHor.value.copy(env.horizon); u.uFogC.value.copy(env.haze); u.uFog.value.set(env.fogNear, env.fogFar);
  u.uSwirl.value = smooth(e.drain - 0.2, e.drain + 1.6, t) * 1; u.uFunnel.value = smooth(e.drain, e.drain + 1.8, t) * (1 - smooth(e.drain + 3.4, e.drain + 4.4, t));
  u.uRing.value = t >= e.splash && t < e.drain ? (t - e.splash) * 1.3 : -1; u.uAlpha.value = 1 - smooth(e.drain + 3.6, e.drain + 4.5, t);
  u.uW.value.copy(W.S); u.uDim.value = lerp(1, 0.7, smooth(L(16).start, e.drain, t));
  const low = t > e.drain - 1; W.bed.visible = low; W.dustT.visible = t > e.rise; W.mist.visible = t > e.drain && t < e.drain + 7; W.trail.visible = t > e.shift && t < e.shift + 8;
  W.ship.position.y = Math.max(level, SEABED + 13) + Math.sin(t * 0.9) * 0.3 * (level > -1 ? 1 : 0); W.ship.rotation.z = 0.02 * Math.sin(t * 0.7) + 0.17 * smooth(-100, -112, level); W.ship.rotation.x = 0.09 * smooth(-100, -112, level);
  const bob = Math.sin(t * 1.5) * 0.14, B = boatPos(t); W.boat.position.set(B.x, 1.1 + bob, B.z); W.boat.rotation.set(Math.sin(t * 1.1) * 0.02, Math.PI / 2, Math.sin(t * 1.4) * 0.03); W.boat.visible = n === 'sail' || t < 2.2;
  W.boat2.position.y = Math.max(level, SEABED) + 1.0 + bob * 0.5; W.boat2.rotation.z = 0.2 * smooth(-100, -116, level);
  W.floats.forEach((g, i) => { g.position.y = g.base + Math.sin(t * 0.4 + i * 2) * 3; });

  // the islands slide into their ring
  const sk = easeInOut(clamp((t - e.shift) / 5.2)); W.isles.forEach((I, i) => { const k = easeInOut(clamp((t - e.shift - i * 0.08) / 5)); I.group.position.lerpVectors(I.home, I.dest, k); I.group.position.y = Math.sin(k * Math.PI) * 5; I.group.rotation.y = I.turn * k; });
  // the first version
  const cityOn = t > e.rise - 0.1; W.city.list.forEach((l) => { l.a.visible = l.b.visible = cityOn; }); if (cityOn) W.city.set(t, e.rise - 0.5, 1.9, 120);
  W.city.glowM.color.set('#58f4ff').multiplyScalar((1.2 + 1.2 * smooth(e.welcome, e.welcome + 1, t)) * (0.85 + 0.15 * Math.sin(t * 2.4)));
  const tk = easeOut(clamp((t - e.rise) / 3.4)); W.temple.visible = cityOn; W.temple.position.y = SEABED - 240 * (1 - tk) + Math.sin(t * 34) * 0.4 * (1 - tk) * (tk > 0 ? 1 : 0);
  W.dustT.update(t - e.rise); W.mist.update(t - e.drain); W.trail.update(t - e.shift);

  // the fruit
  const onStone = ['morning', 'fruit'].includes(n), inHand = ['nocolor', 'noname', 'inspect', 'unknown', 'bite', 'nothing'].includes(n) || (n === 'throw' && t < e.throwT);
  W.ped2.visible = onStone; W.ped2.position.y = W.C.y + 2.75 + Math.sin(t * 1.4) * 0.08; W.ped2.rotation.y = t * 0.35; W.ped2.update(t, 1);
  W.hand.visible = inHand; W.hand.bite(t >= e.bite); W.hand.update(t, 1);
  W.fly.visible = t >= e.throwT && t < e.splash && ['throw', 'arc'].includes(n); if (W.fly.visible) { W.fly.position.copy(flyAt(t)); W.fly.rotation.set(t * 5, t * 3, 0); W.fly.update(t, 1.2); }
  W.sh1.visible = W.sh2.visible = cove; W.glint.intensity = onStone ? 40 : 0;
  const a = W.air.list; a.fruitS.position.copy(W.C).add(v3(0, 2.1, 0)); a.fruitS.visible = onStone;
  a.crumbs.position.copy(W.KC).add(v3(1.2, 4.1, 0.6)); a.crumbs.update(t); a.splash.update(t); a.goldB.update(t); a.swB.update(t);

  // Kai
  const k0 = n === 'sail', k1 = n === 'beachwalk', k2 = n === 'morning';
  let p, yaw = 0, st = 'idle';
  if (k0) { p = B.clone().add(v3(2.3, 0.72 + 1.1 + bob, 0)); yaw = 1.05; }
  else if (k1) { const k = (t - 2.15) / (L(1).start - 2.2), a2 = beachAt(lerp(0, 0.8, k)), b2 = beachAt(lerp(0.1, 0.9, k)); p = a2; yaw = Math.atan2(b2.x - a2.x, b2.z - a2.z); st = 'walk'; }
  else if (k2) { const k = clamp((t - L(1).start) / 1.9), c = clamp(k, 0, 1); p = walkIn(c); const q = walkIn(Math.min(1, c + 0.05)); yaw = c < 1 ? Math.atan2(q.x - p.x, q.z - p.z) : Math.atan2(W.C.x - p.x, W.C.z - p.z); st = c < 1 ? 'walk' : 'stop'; }
  else if (cove) { p = W.KC.clone(); yaw = W.ky; st = 'hold'; }
  else if (n === 'throw') { p = W.SP.clone(); yaw = Math.atan2(W.nSea.x, W.nSea.z); st = 'throw'; }
  else if (n === 'arc') { p = W.SP.clone(); yaw = Math.atan2(W.nSea.x, W.nSea.z) + Math.PI; st = 'walk'; p.addScaledVector(W.nSea, -(t - e.throwT) * 3); p.y = W.hero.heightAt(p.x, p.z); }
  else { p = W.KD.clone(); yaw = 0.3; st = 'dock'; if (t > e.welcome - 1.5) yaw = Math.PI; if (t > e.drain && t < e.welcome - 1.5) yaw = 0.05; }
  E.root.position.copy(p); E.root.rotation.y = yaw; E.root.visible = !['fruit'].includes(n);
  const faces = { sail: 'smile', beachwalk: 'focused', morning: 'surprised', nocolor: 'curious', noname: 'suspicious', inspect: 'focused', unknown: 'surprised', bite: 'neutral', nothing: 'neutral', throw: 'bored', arc: 'bored', inv: 'neutral', sword: 'shocked', money: 'shocked', level: 'terrified', zero: 'terrified', notif: 'scared', drain: 'shocked', shift: 'shocked', rise: 'shocked', realize: 'surprised', overlook: 'smile', welcome: 'smile', bow: 'smirk', aerial: 'smirk' };
  let fc = faces[n] || 'neutral'; if (n === 'inv' && t > e.gone + 0.1) fc = 'shocked'; if (n === 'morning' && st !== 'stop') fc = 'focused'; if (n === 'nothing' && t > L(9).end - 0.1) fc = 'bored';
  const chew = (n === 'bite' && t > e.chew) || (n === 'nothing' && t < L(9).end - 0.15);
  E.setFace(fc, { blink: blinkAt(t, 0.3) && !['shocked', 'terrified'].includes(fc), viseme: chew ? (Math.floor(t * 7) % 2 ? 'O' : null) : n === 'bite' && t > e.bite - 0.2 && t < e.bite ? 'A' : null, gaze: n === 'nocolor' ? undefined : undefined });
  const [AL, AR] = E.arms;
  if (st === 'walk') { pose(E, 'walk', t); if (k1) { AL.rotation.x = -1.45; AL.rotation.z = 0.28; } }
  else if (st === 'hold') {
    pose(E, 'idle', t); const raise = (n === 'bite' || n === 'nothing') ? 0 : 1;
    AR.rotation.x = -1.6; AR.rotation.z = -0.12; E.neck.rotation.x = 0.1; E.neck.rotation.y = 0.26;
    if (n === 'inspect') { AL.rotation.x = -1.2 + (t > e.inspect - 0.1 && t < e.inspect + 0.16 ? -0.3 : 0); AL.rotation.z = 0.5; }
    if (n === 'bite') { const k = smooth(L(8).start - 0.1, e.bite - 0.04, t) * (1 - smooth(e.bite + 0.25, e.bite + 0.55, t)); AR.rotation.x = lerp(-1.6, -1.88, k); AR.rotation.z = lerp(-0.12, -0.74, k); E.neck.rotation.y = lerp(0.1, 0.12, k); E.neck.rotation.x = lerp(0, 0.1, k); }
    if (n === 'nothing') { AR.rotation.x = -1.2; AR.rotation.z = -0.3; E.neck.rotation.x = 0.1 * (t > L(9).start ? 1 : 0); E.neck.rotation.y = 0.05 + Math.sin(t * 1.4) * 0.12; }
    void raise;
  } else if (st === 'throw') {
    pose(E, 'idle', t); const wind = smooth(L(10).start - 0.1, e.throwT - 0.1, t), go = smooth(e.throwT - 0.1, e.throwT + 0.08, t);
    AR.rotation.x = lerp(lerp(-0.4, -3.5, wind), -1.1, go); AR.rotation.z = -0.15; E.torso.rotation.y = lerp(-0.55 * wind, 0.5, go); E.torso.rotation.x = go * 0.18;
  } else if (st === 'dock') {
    pose(E, 'idle', t);
    if (['sword'].includes(n)) { E.neck.rotation.y = 0.7; AL.rotation.x = -2.5 * smooth(L(12).start, L(12).start + 0.3, t); AL.rotation.z = 0.4; }
    if (['level', 'zero', 'money'].includes(n)) { AL.rotation.x = -0.5; AR.rotation.x = -0.5; AL.rotation.z = 0.25; AR.rotation.z = -0.25; E.torso.rotation.x = 0.06; }
    if (n === 'notif') { pose(E, 'lookUp', t, { amt: 0.5 }); }
    if (n === 'shift' || n === 'drain' || n === 'rise') { pose(E, 'scared', t, { amt: 0.08 }); E.neck.rotation.y = -0.2; }
    if (n === 'realize') { AL.rotation.x = -0.95; AR.rotation.x = -0.95; AL.rotation.z = 0.3; AR.rotation.z = -0.3; E.neck.rotation.x = 0.3; }
    if (n === 'overlook') { E.neck.rotation.y = 0.1; }
    if (['welcome', 'bow', 'aerial'].includes(n)) { E.neck.rotation.x = -0.12; AL.rotation.z = -0.22; AR.rotation.z = 0.22; }
  } else if (st === 'stop') { pose(E, 'idle', t); E.neck.rotation.x = 0.16; E.neck.rotation.y = 0.15; } else pose(E, 'idle', t);
  // sword, coins, tag
  W.sword.visible = t < e.sword + 0.75; W.swordV.set(clamp((t - e.sword) / 0.62));
  W.chest.setCoins(1 - clamp((t - e.coins) / 0.75));
  W.map.visible = k1;
  const lvT = t < e.lvl ? 2450 : Math.round(2450 * (1 - easeOut(clamp((t - e.lvl) / 0.75)))), tagS = `Kai  Lv. ${lvT}`;
  if (tagS !== W.tagS) { const x = W.tagX; x.clearRect(0, 0, 768, 128); x.font = F(78); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 12; x.lineJoin = 'round'; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(tagS, 384, 64); x.fillStyle = lvT ? '#ffe9a0' : '#ff6a78'; x.fillText(tagS, 384, 64); W.tagT.needsUpdate = true; W.tagS = tagS; }
  W.tag.visible = t < e.drain && !['bite', 'nothing', 'nocolor', 'noname', 'unknown', 'inspect', 'fruit', 'inv', 'zero', 'morning', 'level', 'notif'].includes(n);

  // NPCs: the village early on, then two lines down the pier
  const late = t >= e.welcome - 1.45;
  W.npc.forEach((c, i) => {
    const early = ['inv', 'zero'].includes(n) || (n === 'throw' && i < 3);
    c.root.visible = early ? i < 6 : late;
    if (!c.root.visible) return;
    if (late) {
      const side = i % 2 ? 1 : -1, row = i >> 1, z = W.KD.z - 6.5 - row * 5.4, x = W.KD.x + side * 2.25; c.root.position.set(x, 2.76, z); c.root.rotation.y = Math.atan2(W.KD.x - x, W.KD.z - z);
      pose(c, 'idle', t + i); const k = smooth(0, 0.6, t - e.bow - row * 0.07); c.torso.rotation.x = 1.0 * k; c.neck.rotation.x = 0.1 * k; c.arms[0].rotation.x = -0.28 * k; c.arms[1].rotation.x = -0.28 * k; c.setFace(k > 0.3 ? 'calm' : 'smile');
    } else { const q = W.hero.place(0.76 + (i % 3) * 0.05, 0.9 + i * 0.16); c.root.position.copy(q); c.root.rotation.y = i * 1.3; pose(c, 'idle', t + i); }
  });
  const crowdOn = late; W.crowdG.visible = crowdOn; if (crowdOn) W.crowd.update(t, e.bow);
  W.beam.visible = t > e.welcome - 0.2; W.beam.material.uniforms.amount.value = 0.5 * smooth(e.welcome - 0.2, e.welcome + 1, t); W.beam2.visible = W.beam.visible; W.beam2.material.uniforms.amount.value = W.beam.material.uniforms.amount.value * 0.7;
  a.halo.visible = t > e.realize; a.halo.position.copy(W.KD).add(v3(0, 1, 0)); a.halo.update(t);
  W.air.update(t);

  // camera shake
  const rumble = t > e.drain && t < e.rise + 6.5 ? 0.7 : 0;
  const shk = { throw: t > e.throwT - 0.1 && t < e.throwT + 0.2 ? 0.25 : 0, unknown: t < e.unk + 0.45 ? 0.9 : 0, sword: 0.1, zero: t < e.zero + 0.3 ? 0.8 : 0, drain: 0.5, shift: 0.7, rise: 1.0 }[n] || (n === 'notif' ? 0.12 : 0);
  const wide = { drain: 900, aerial: 900, overlook: 460, rise: 460, shift: 460, sail: 140, zero: 120, arc: 170, bow: 110, welcome: 80 }[n] ?? 70;
  const flash = t >= e.unk && t < e.unk + 0.16 ? 0.7 * (1 - (t - e.unk) / 0.16) : t >= e.drain - 0.05 && t < e.drain + 0.2 ? 0.6 * (1 - (t - e.drain + 0.05) / 0.25) : 0;
  frame(ctx, t, sh, { shake: shk + rumble * 0.2, shadowSpan: wide, flash, flashColor: t < e.drain - 1 ? '#c58bff' : '#fff2dc', black: t > ctx.dur - 0.08 ? 1 : 0 });
  if (first) drawHud(t, n);
  return n;
}

export async function setup() {
  ctx = await initStage('ep20', { look: 'pro', avatars: ['farm_kai'] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'happy', 'surprised', 'shocked', 'scared', 'terrified', 'suspicious', 'focused', 'bored', 'smirk']);
  const { scene, camera } = ctx; camera.far = 6500; camera.updateProjectionMatrix();
  scene.fog.far = 2700;
  hero(scene); archipelago(scene); firstVersion(scene); people(scene);
  W.sea = buildSea(scene, [W.hero, ...W.isles]);
  const list = { fruitS: sparkles(scene, { centre: v3(0, 0, 0), size: 5, height: 4, count: 90, color: '#eaf8ff', pointSize: 0.5 }), crumbs: burst(scene, { count: 60, color: '#dff4ff', dur: 0.8, spread: 0.2, height: 0.2, pointSize: 0.26 }).fire(EV.bite),
    splash: burst(scene, { count: 220, color: '#e9fbff', dur: 1.3, spread: 3, height: 0.6, pointSize: 1.9, pos: W.S, bright: 1.4 }).fire(EV.splash), goldB: burst(scene, { count: 120, color: '#ffcf40', dur: 0.9, spread: 2.2, height: 1.6, pointSize: 0.2, pos: W.chest.position.clone().add(W.chest.parent.position).add(v3(0, 1.8, 0)) }).fire(EV.coins),
    swB: burst(scene, { count: 80, color: '#ffcf5a', dur: 0.9, spread: 0.6, height: 3, pointSize: 0.14, pos: W.KD.clone().add(v3(0, 3, -0.8)) }).fire(EV.sword),
    halo: sparkles(scene, { centre: v3(0, 0, 0), size: 9, height: 7, count: 160, color: '#ffe9a0', pointSize: 0.7 }) };
  W.air = atmos(...Object.values(list), dust(scene, { size: 120, height: 30, centre: W.KC.clone().add(v3(0, 8, 0)), count: 420, color: '#fff0cc', amount: 0.38, pointSize: 0.6 }), clouds(scene, { y: 420, spread: 3400, count: 22, color: '#ffffff', size: 60 }));
  W.air.list = list;
  W.beam = shaft(scene, { from: W.KD.clone().add(v3(0, 460, 0)), to: W.KD.clone(), top: 16, bottom: 7, color: '#ffd77a', amount: 0 });
  W.beam2 = shaft(scene, { from: W.KD.clone().add(v3(0, 460, 0)), to: W.KD.clone(), top: 7, bottom: 3, color: '#9ff0ff', amount: 0 });
  hudInit();
  W.shots = shots();
  void sign; void noise1; void paint; void easeIn; void lp3; void orbit;
  return expose(ctx, renderAt, L(2).start + 1.2, EV);
}
