// Episode 18: The Trees Started Calling Everyone by Name. The first episode in the pro look.
// One town: the avenue and clock tower (acts 1), the park and its oak (act 2), Daniel's tree (act 3), the houses beyond
// the park and Danielle's bedroom (the end). The twist is in the carving: moss hides the last two letters of DANIELLE.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose, nameTag } from '../engine/character.js';
import { loadAlti, blinkAt } from '../engine/altiface.js';
import { CAST } from '../engine/cast.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DUSK, NIGHT } from '../engine/stage.js';
import { Batch, surf, paint, sign, lamp, building } from '../engine/kit.js';
import { dust, shaft, clouds, leaves, burst, vanisher, atmos } from '../engine/atmos.js';
import { canvasTex, glowSprite } from '../engine/props.js';
import { model } from '../engine/library.js';
import { leafLight, treeShape, treeSet, heroOak, nameAtlas, namePatches, heroPatch, mossPad, radiusAt, lightPool, leafTime, carveWord, barkMat } from '../engine/forest.js';

let ctx, L, EV;
const W = {};
const CLOCK = v3(0, 0, -210), OAK = v3(112, 0, -14), DT = v3(240, 0, 14), HOUSE = v3(450, 0, -40), BR = v3(3000, 0, 0);
const PATH_Z = 30, A_DAN = -0.42;
const rad = (a, R, y = 0) => v3(DT.x + Math.sin(a) * R, y, DT.z + Math.cos(a) * R);   // round Daniel's tree
const B = (x, y, z) => v3(BR.x + x, y, BR.z + z);                                     // in the bedroom

// ---- palettes: gold dusk, green dusk, dark forest, the town at night ----
const GOLD = { ...DUSK, ...P({ top: '#1d5270', horizon: '#ffc471', haze: '#b4b27c', sunColor: '#ffcf96', hemiSky: '#a8dacb', hemiGround: '#4c6e3c' }),
  sunI: 2.7, sunDir: v3(0.6, 0.4, 0.75), sunDisc: 1, sunSize: 1.5, stars: 0, moon: 0, hemiI: 1.25, amb: 0.25, fogNear: 110, fogFar: 680, exposure: 1.08, bloom: 0.22, lamp: 2.4, win: 1.4, envI: 0.85, saturation: 1.18 };
const PARK = { ...GOLD, ...P({ top: '#123f58', horizon: '#ffb96a', haze: '#55806a', sunColor: '#ffd8a0', hemiSky: '#b4cfd0', hemiGround: '#50583c' }),
  sunI: 2.2, sunDir: v3(0.8, 0.3, 0.55), sunDisc: 0, hemiI: 1.15, fogNear: 50, fogFar: 340, envI: 0.85, bloom: 0.25, lamp: 3, saturation: 1.14 };
const DEEP = { ...NIGHT, ...P({ top: '#081f38', horizon: '#2f7a82', haze: '#2a7078', sunColor: '#c8dcff', hemiSky: '#8ab0d8', hemiGround: '#3a4438' }),
  sunI: 2.3, sunDir: v3(-0.35, 0.72, 0.6), hemiI: 2.2, amb: 0.5, stars: 0.6, moon: 1, fogNear: 34, fogFar: 260, exposure: 1.25, bloom: 0.28, lamp: 3, win: 1.4, envI: 1.4, saturation: 1.16 };
const TOWN = { ...DEEP, ...P({ top: '#0a2240', horizon: '#3f6f92', haze: '#26506a', sunColor: '#c8dcff', hemiSky: '#8ab0d8', hemiGround: '#343c3c' }),
  sunI: 0.9, hemiI: 1.2, amb: 0.3, exposure: 1.1, sunDir: v3(-0.3, 0.7, 0.7), fogNear: 260, fogFar: 1300, stars: 1, envI: 0.8 };
const ROOM = { ...GOLD, ...P({ top: '#000000', horizon: '#000000', haze: '#2a1a26', sunColor: '#ffe4d0', hemiSky: '#ffd9e6', hemiGround: '#a87a8a' }),
  sunI: 0.5, sunDir: v3(0.2, 0.9, 0.3), sunDisc: 0, hemiI: 1.2, amb: 0.3, fogNear: 400, fogFar: 900, envI: 0.5, bloom: 0.18, saturation: 1.14 };

function events() {
  const v = (i) => L(i).start;
  const e = { strike: 0.55, wave: 1.0, marcus: v(2) + 0.35, olivia: v(2) + 1.65, v1: v(3) - 0.1, v2: v(3) + 0.32, v3: v(3) + 0.74, v4: v(3) + 1.16,
    oakname: v(5) - 0.05, six: v(8) + 0.5, run: v(9) - 0.05, found: v(13), timerOn: v(14) + 0.15, t59: v(15), scratch: v(16) - 0.1, stop: v(17) + 0.05,
    hush: v(18) - 0.05, relight: v(19), wrong: v(20) - 0.1, moss: v(21) + 0.15, lele: v(22) + 0.5, sister: v(23), calling: v(24), bend: v(24) + 0.3, end: ctx.dur };
  return e;
}

// ---- Daniel's path: a pure function of t ----
function dan(t) {
  const hop = smooth(EV.found + 0.25, EV.found + 0.95, t), back = smooth(EV.hush + 0.2, EV.hush + 1.0, t);
  const walk = clamp((t - (L(4).start - 0.15)) / (L(5).start + 0.1 - (L(4).start - 0.15)));
  const run = clamp((t - EV.run) / (EV.found + 0.3 - EV.run));
  let x = lerp(58, 100, walk) + (232 - 100) * Math.pow(run, 1.08), z = PATH_Z;
  const stand = rad(A_DAN, lerp(6.55, 9.6, back));
  x = lerp(x, stand.x, hop); z = lerp(z, stand.z, hop);
  let state = t < L(5).start + 0.1 ? 'walk' : t < EV.run ? 'stop' : t < EV.found + 0.8 ? 'run' : 'tree';
  return { x, z, state };
}

// ---- the set ----
function pathGround(b) {
  const cob = surf('cobble', '#7f7a6a', { roughness: 0.9 }); cob.userData.span = 3.2;
  b.box(surf('grass', '#3f7a3c'), 3400, 1, 3400, 900, -0.5, 0, { r: 0.02 });
  // the avenue, with curbs, lines and crossings
  b.box(paint('#3a3d45', { roughness: 0.94 }), 22, 0.1, 520, 0, 0.06, 30, { r: 0.02 });
  for (let z = -190; z < 280; z += 15) b.box(paint('#e8d9a0', { roughness: 0.7 }), 0.45, 0.04, 6.5, 0, 0.13, z, { r: 0.01 });
  for (const s of [-1, 1]) {
    b.box(surf('tile', '#a9a79e'), 10, 0.6, 520, s * 16, 0.3, 30, { r: 0.08 });
    b.box(paint('#807d76', { roughness: 0.8 }), 0.5, 0.7, 520, s * 11.1, 0.34, 30, { r: 0.1 });
  }
  for (let i = 0; i < 9; i++) b.box(paint('#ded8c2'), 2.2, 0.04, 8, -9 + i * 2.25, 0.13, 112, { r: 0.01 });
  // the plaza round the clock tower
  b.cyl(surf('tile', '#b1aca0'), 62, 62, 0.5, CLOCK.x, 0.3, CLOCK.z, { seg: 48 });
  // the park path
  b.box(cob, 280, 0.3, 11, 150, 0.16, PATH_Z, { r: 0.1 });
  for (const s of [-1, 1]) b.box(paint('#5f5d55', { roughness: 0.9 }), 280, 0.42, 0.55, 150, 0.2, PATH_Z + s * 5.6, { r: 0.1 });
  b.box(cob, 11, 0.3, 22, 240, 0.16, PATH_Z - 10, { r: 0.1 });
}

function clockTower(scene) {
  const g = new THREE.Group(); g.position.copy(CLOCK); scene.add(g);
  const b = new Batch(), stone = surf('brick', '#a8957c'), trim = paint('#e6dcc4', { roughness: 0.55 }), dark = paint('#3b3e47', { metalness: 0.4, roughness: 0.5 }), gold = paint('#d9a83a', { metalness: 0.75, roughness: 0.32 });
  b.box(surf('concrete', '#8a8478'), 34, 2.4, 34, 0, 1.2, 0, { r: 0.2 }); b.box(surf('concrete', '#938d80'), 28, 2.4, 28, 0, 3.6, 0, { r: 0.2 });
  b.box(stone, 21, 62, 21, 0, 35, 0, { r: 0.2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(surf('brick', '#8f7c66'), 3.2, 66, 3.2, sx * 10.2, 37, sz * 10.2, { r: 0.2 });
  for (const y of [16, 30, 42, 66]) { b.box(trim, 23.4, 1, 23.4, 0, y, 0, { r: 0.14 }); }
  for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const s = Math.sin(ry), c = Math.cos(ry), at = (u, y, o) => [c * u + s * (10.6 + o), y, -s * u + c * (10.6 + o)];
    for (const y of [10, 23, 36]) for (const u of [-4.4, 4.4]) { b.box(trim, 3.2, 6.6, 0.4, ...at(u, y, 0), { ry, r: 0.08 }); b.box(paint('#2a3a4a', { roughness: 0.2, metalness: 0.3 }), 2.4, 5.8, 0.2, ...at(u, y, 0.2), { ry, r: 0.02 }); b.box(trim, 3.8, 0.34, 0.8, ...at(u, y - 3.5, 0.2), { ry, r: 0.06 }); }
    b.box(dark, 18.6, 18.6, 0.6, ...at(0, 54, 0), { ry, r: 0.1 });
    for (const u of [-5, 0, 5]) { b.box(trim, 1.8, 7, 0.5, ...at(u, 72, 0), { ry, r: 0.1 }); }
  }
  b.box(stone, 22, 13, 22, 0, 73, 0, { r: 0.2 }); b.box(trim, 25, 1.2, 25, 0, 80, 0, { r: 0.18 });
  const roof = new THREE.ConeGeometry(17, 26, 4, 1); roof.rotateY(Math.PI / 4);
  b.add(surf('shingle', '#2a5a58'), roof, 0, 93.4, 0); b.cyl(gold, 0.3, 0.5, 6, 0, 108, 0); b.done(g);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 12), gold); ball.position.y = 111; g.add(ball);
  const ck = model('clock', { radius: 8.4, glow: false }); ck.g.position.set(0, 54, 11.0); g.add(ck.g);
  W.clock = ck;
  W.clockLight = new THREE.PointLight('#ffe0a8', 0, 80, 1.6); W.clockLight.position.set(0, 52, 30); g.add(W.clockLight);
}

function fence(b) {
  const iron = paint('#1e2a2a', { metalness: 0.5, roughness: 0.5 });
  for (const [z0, z1] of [[-230, 18], [42, 260]]) {
    for (let z = z0; z < z1; z += 1.8) b.box(iron, 0.22, 6.6, 0.22, 22, 3.3, z, { r: 0.05 });
    for (const y of [1.2, 5.6]) b.box(iron, 0.2, 0.34, z1 - z0, 22, y, (z0 + z1) / 2, { r: 0.05 });
    for (let z = z0; z < z1; z += 16) { b.box(paint('#6b665c', { roughness: 0.85 }), 1.4, 7.8, 1.4, 22, 3.9, z, { r: 0.14 }); b.box(paint('#88826f'), 1.9, 0.5, 1.9, 22, 8, z, { r: 0.1 }); }
  }
}

function bench(b, x, z, ry) {
  const c = Math.cos(ry), s = Math.sin(ry), at = (u, y, v) => [x + c * u + s * v, y, z - s * u + c * v];
  const wood = surf('plank', '#8a5a34'), iron = paint('#22262c', { metalness: 0.5, roughness: 0.45 });
  for (const v of [-0.55, 0, 0.55]) b.box(wood, 6, 0.2, 0.46, ...at(0, 1.9, v), { ry, r: 0.05 });
  for (const y of [2.6, 3.2]) b.box(wood, 6, 0.46, 0.18, ...at(0, y, -0.9), { ry, r: 0.05 });
  for (const u of [-2.5, 2.5]) { b.box(iron, 0.24, 2, 1.8, ...at(u, 1, 0), { ry, r: 0.05 }); b.box(iron, 0.24, 1.8, 0.24, ...at(u, 2.7, -0.95), { ry, r: 0.05 }); }
}

function noticeBoard(scene, tex) {
  const g = new THREE.Group(); g.position.set(46, 0, PATH_Z - 7.2); scene.add(g);
  const b = new Batch(), wood = surf('plank', '#70482a');
  for (const x of [-4, 4]) b.box(wood, 0.6, 9, 0.6, x, 4.5, 0, { r: 0.08 });
  b.box(paint('#3a2a1c'), 8.6, 5.2, 0.3, 0, 6, 0, { r: 0.06 });
  b.box(surf('shingle', '#3a4a3a'), 9.8, 0.4, 2, 0, 9.1, 0.1, { r: 0.08 }); b.done(g);
  const card = (w, h, map, x, y, r) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.75 })); m.position.set(x, y, 0.18); m.rotation.z = r; g.add(m); };
  card(2.2, 2.8, tex.llama, -2.7, 6.2, 0.03); card(2.5, 2, tex.song, 0.1, 6.8, -0.02); card(1.8, 0.7, tex.card, 0.2, 4.6, 0.02); card(1.7, 2.3, tex.missing, 2.8, 6, -0.04);
}

function neighbourhood(scene) {
  const r = rng(61), wall = ['#d7b48c', '#c9a0a0', '#9fb4b0', '#c4b88a', '#b49ab8', '#d0c0a0'], roofs = ['#6a3d38', '#3f5560', '#54404e', '#3c5a48'];
  const places = [];
  for (let gx = 300; gx < 980; gx += 44) for (let gz = -520; gz < 480; gz += 40) {
    if (Math.abs(gx - HOUSE.x) < 34 && Math.abs(gz - HOUSE.z) < 30) continue;
    if (Math.abs(((gz + 520) % 160) - 150) < 16) continue;     // a street every fourth row
    places.push({ x: gx + (r() - 0.5) * 6, z: gz + (r() - 0.5) * 4, w: 15 + r() * 7, d: 13 + r() * 5, h: 9 + (r() < 0.5 ? 7 : 0), yaw: Math.floor(r() * 4) * Math.PI / 2 });
  }
  const n = places.length, body = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), surf('stucco', '#ffffff'), n);
  const roofG = new THREE.ConeGeometry(0.72, 1, 4, 1); roofG.rotateY(Math.PI / 4);
  const roof = new THREE.InstancedMesh(roofG, surf('shingle', '#ffffff'), n);
  const winM = new THREE.MeshStandardMaterial({ color: '#2a2418', emissive: '#ffcf80', emissiveIntensity: 2.0 });
  const win = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), winM, n * 2);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  places.forEach((p, i) => {
    q.setFromAxisAngle(v3(0, 1, 0), p.yaw);
    body.setMatrixAt(i, M.compose(v3(p.x, p.h / 2, p.z), q, v3(p.w, p.h, p.d))); body.setColorAt(i, c.set(wall[i % wall.length]));
    roof.setMatrixAt(i, M.compose(v3(p.x, p.h + 3.2, p.z), q, v3(p.w * 1.1, 6.4, p.d * 1.1))); roof.setColorAt(i, c.set(roofs[i % roofs.length]));
    for (const s of [0, 1]) { const off = v3((s ? 1 : -1) * p.w * 0.24, p.h * 0.62, p.d / 2 + 0.05).applyQuaternion(q); win.setMatrixAt(i * 2 + s, M.compose(v3(p.x + off.x, off.y, p.z + off.z), q, r() < 0.7 ? v3(2.6, 3, 0.2) : v3(0, 0, 0))); }
  });
  for (const m of [body, roof]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); m.instanceColor.needsUpdate = true; }
  win.frustumCulled = false; scene.add(win);
  // streets between the blocks
  const sb = new Batch();
  for (let gz = -520 + 150 - 4; gz < 480; gz += 160) sb.box(paint('#3a3d45', { roughness: 0.94 }), 760, 0.1, 18, 640, 0.07, gz, { r: 0.02 });
  sb.box(paint('#3a3d45', { roughness: 0.94 }), 18, 0.1, 1000, 288, 0.07, -20, { r: 0.02 });
  sb.done(scene);
}

function heroHouse(scene) {
  const g = building({ style: 'stucco', wall: '#efd9b8', trim: '#fff4e0', floors: 2, floorH: 8, w: 30, d: 22, roof: 'gable', roofColor: '#74404a', shutters: '#7a3f55', door: '#7a3f55', lit: 0, windows: 4, seed: 4 });
  g.position.copy(HOUSE); scene.add(g);
  // her window: warm, curtains, a small figure
  const tex = canvasTex(256, 320, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe2a0'); gr.addColorStop(1, '#ff9f8a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff7f9a'; c.fillRect(0, 0, 46, h); c.fillRect(w - 46, 0, 46, h);
    c.fillStyle = '#23151f'; c.fillRect(100, 150, 56, 90); c.fillRect(106, 240, 20, 80); c.fillRect(130, 240, 20, 80); c.fillRect(82, 158, 18, 62); c.fillRect(156, 158, 18, 62);
    c.beginPath(); c.roundRect(98, 92, 60, 58, 14); c.fill(); c.fillRect(84, 96, 15, 46); c.fillRect(157, 96, 15, 46);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.3), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.9, 1.75, 1.6) }));
  W.herWin = m; m.userData.noAO = true;
  m.position.copy(HOUSE).add(v3(-4.9, 1.2 + 8 + 4.16, 11 + 0.34)); scene.add(m);
  const halo = glowSprite('#ffc27a', 26, 0.45); halo.position.copy(m.position).add(v3(0, 0, 0.6)); scene.add(halo);
  const pool = lightPool(scene, HOUSE.x - 4.9, 0.2, HOUSE.z + 20, 30, '#ffb878', 0.3);
  const porch = new THREE.PointLight('#ffc98a', 120, 70, 1.6); porch.position.copy(HOUSE).add(v3(-4, 12, 18)); scene.add(porch);
  W.houseLight = porch; void pool;
  // mailbox and path
  const b = new Batch();
  b.box(surf('cobble', '#9a9484'), 7, 0.24, 26, HOUSE.x, 0.14, HOUSE.z + 24, { r: 0.06 });
  b.box(paint('#6d4522'), 0.4, 3.6, 0.4, HOUSE.x + 7, 1.8, HOUSE.z + 32, { r: 0.05 }); b.box(paint('#d85a7a'), 1.8, 1.2, 1, HOUSE.x + 7, 3.9, HOUSE.z + 32, { r: 0.2 }); b.done(scene);
}

function bedroom(scene, tex) {
  const g = new THREE.Group(); g.position.copy(BR); scene.add(g); W.room = g;
  const b = new Batch(), wall = surf('stucco', '#f2c6cf'), wood = surf('plank', '#b98658'), white = paint('#fff6ee', { roughness: 0.5 }), pink = paint('#f07aa0', { roughness: 0.75 });
  b.box(wood, 30, 0.6, 26, 0, -0.3, 0, { r: 0.02 }); b.box(paint('#fbe6e6', { roughness: 0.8 }), 30, 0.5, 26, 0, 12.3, 0, { r: 0.02 });
  b.box(wall, 0.6, 12.2, 26, -14, 6, 0, { r: 0.02 }); b.box(wall, 0.6, 12.2, 26, 14, 6, 0, { r: 0.02 }); b.box(wall, 30, 12.2, 0.6, 0, 6, 13, { r: 0.02 });
  // the back wall, with a window opening at x 1.5..7.5, y 3.2..9.6
  const wz = -9, x0 = 0.8, x1 = 8.2, y0 = 3.1, y1 = 9.7;
  b.box(wall, 14.8 + x0, 12.2, 0.6, (-14 + x0) / 2 - 0.0, 6, wz, { r: 0.02 }); b.box(wall, 14 - x1, 12.2, 0.6, (14 + x1) / 2, 6, wz, { r: 0.02 });
  b.box(wall, x1 - x0, y0, 0.6, (x0 + x1) / 2, y0 / 2, wz, { r: 0.02 }); b.box(wall, x1 - x0, 12.2 - y1, 0.6, (x0 + x1) / 2, (12.2 + y1) / 2, wz, { r: 0.02 });
  for (const x of [x0, x1, (x0 + x1) / 2]) b.box(white, 0.3, y1 - y0 + 0.3, 0.8, x, (y0 + y1) / 2, wz, { r: 0.05 });
  for (const y of [y0, y1, (y0 + y1) / 2]) b.box(white, x1 - x0 + 0.3, 0.3, 0.8, (x0 + x1) / 2, y, wz, { r: 0.05 });
  b.box(white, x1 - x0 + 1.4, 0.3, 1.4, (x0 + x1) / 2, y0 - 0.15, wz + 0.5, { r: 0.08 });
  for (const s of [x0 - 1, x1 + 1]) b.box(pink, 1.6, y1 - y0 + 1.8, 0.4, s, (y0 + y1) / 2, wz + 0.6, { r: 0.12 });
  b.box(paint('#d98fa6'), 12, 0.4, 0.5, (x0 + x1) / 2, y1 + 1.1, wz + 0.6, { r: 0.1 });
  b.box(white, 29, 0.9, 0.3, 0, 0.45, wz + 0.42, { r: 0.05 });   // skirting
  // the door, with her name on it
  const dx = -3.2; b.box(white, 5.2, 9.4, 0.5, dx, 4.7, wz + 0.25, { r: 0.08 }); b.box(paint('#ffd6e2', { roughness: 0.5 }), 4.4, 8.8, 0.3, dx, 4.4, wz + 0.45, { r: 0.05 });
  for (const y of [2.6, 6.4]) b.box(paint('#ffc2d4', { roughness: 0.45 }), 3.2, 2.8, 0.14, dx, y, wz + 0.62, { r: 0.04 });
  b.cyl(paint('#d8b24a', { metalness: 0.9, roughness: 0.3 }), 0.2, 0.2, 0.3, dx + 1.7, 4.2, wz + 0.74, { rx: Math.PI / 2 });
  // the bed
  b.box(wood, 8, 1.8, 13, 9.4, 1.1, 2, { r: 0.1 }); b.box(paint('#fff4f4', { roughness: 0.8 }), 7.6, 1.2, 12.6, 9.4, 2.4, 2, { r: 0.3 });
  b.box(pink, 7.9, 0.7, 8.6, 9.4, 3, 4, { r: 0.3 }); b.box(paint('#ffd1dd', { roughness: 0.85 }), 5.6, 1.1, 3, 9.4, 3.3, -2.6, { r: 0.45 }); b.box(wood, 8.2, 5.6, 0.6, 9.4, 2.8, -4.6, { r: 0.1 });
  // shelf, toys, rug
  b.box(wood, 7, 0.3, 1.5, -9.5, 8.7, 12, { r: 0.05 });
  b.cyl(paint('#f4b6c8', { roughness: 0.9 }), 7, 7, 0.14, -1, 0.08, -1, { seg: 40 }); b.cyl(paint('#fbdbe4', { roughness: 0.9 }), 5, 5, 0.16, -1, 0.09, -1, { seg: 40 });
  b.box(wood, 3.8, 3, 3.4, 12, 1.5, -6.2, { r: 0.1 });
  b.done(g);
  // door plate
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 1.25), new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(768, 260, (c, w, h) => {
    c.fillStyle = '#fff4c8'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 44); c.fill(); c.lineWidth = 10; c.strokeStyle = '#e8507a'; c.stroke();
    c.fillStyle = '#d8285e'; c.font = '900 118px ITTInter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DANIELLE', w / 2, h / 2 + 6);
  }) }));
  plate.position.set(dx, 7.7, wz + 0.74); g.add(plate);
  const card = (w, h, map, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.7 })); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); };
  card(3, 3.8, tex.llama, 13.66, 7.2, -1, -Math.PI / 2); card(3.4, 2.7, tex.song, 13.66, 7.4, 3.6, -Math.PI / 2); card(1.6, 0.7, tex.card, -8.4, 7.4, wz + 0.32, 0); card(2.6, 3.2, tex.llama, -9, 4.0, wz + 0.32, 0);
  // outside: the nearest tree, lit with her name
  const out = canvasTex(640, 640, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0c2a3a'); gr.addColorStop(1, '#1d6a60'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#0e2a22'; c.beginPath(); c.ellipse(120, 70, 300, 170, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(560, 60, 230, 120, 0, 0, 7); c.fill();
    c.fillStyle = '#2a1e18'; c.beginPath(); c.moveTo(150, h); c.quadraticCurveTo(250, 340, 390, 140); c.lineTo(540, 170); c.quadraticCurveTo(440, 380, 470, h); c.fill();
    c.save(); c.translate(322, 410); c.rotate(-0.1); c.shadowColor = '#ff3d6e'; c.shadowBlur = 42; c.fillStyle = '#ff9db8'; c.font = '900 44px ITTInter, sans-serif'; c.textAlign = 'center'; c.fillText('DANIELLE', 0, 0); c.fillText('DANIELLE', 0, 0); c.restore();
  });
  W.outside = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshBasicMaterial({ map: out, toneMapped: true, color: new THREE.Color(1.5, 1.5, 1.5) }));
  W.outside.position.set((x0 + x1) / 2, 6.4, wz - 3); g.add(W.outside);
  // light: a warm lamp on a nightstand, and what comes in from outside
  W.roomLamp = new THREE.PointLight('#ffd8b8', 70, 48, 1.5); W.roomLamp.position.set(10, 9, -2); g.add(W.roomLamp);
  W.roomFill = new THREE.PointLight('#ffe8e0', 40, 40, 1.4); W.roomFill.position.set(-5, 9, 7); g.add(W.roomFill);
  W.roomOut = new THREE.PointLight('#ff4d7e', 0, 40, 1.5); W.roomOut.position.set(4.5, 6, -7.5); g.add(W.roomOut);
  const bear = new Batch(), fur = paint('#c98b4e', { roughness: 0.95 });
  bear.box(fur, 1.5, 1.7, 1.1, 0, 0.95, 0, { r: 0.4 }); bear.box(fur, 1.3, 1.2, 1.1, 0, 2.3, 0, { r: 0.45 }); for (const s of [-1, 1]) { bear.box(fur, 0.5, 0.5, 0.3, s * 0.5, 3, 0, { r: 0.2 }); bear.box(fur, 0.5, 1.1, 0.55, s * 1, 1.3, 0.1, { r: 0.2 }); }
  const bg = bear.done(); bg.position.set(9.6, 3.2, -1.2); bg.rotation.y = -0.5; g.add(bg);
}

// ---- trees and names ----
const NAMES = ['MARCUS', 'OLIVIA', 'ETHAN', 'GRACE', 'NOAH', 'SOFIA', 'LIAM', 'MAYA', 'OWEN', 'CHLOE', 'JACK', 'ZOE', 'HENRY', 'RUBY', 'LEO', 'EMMA', 'AIDEN', 'NORA', 'CALEB', 'IVY', 'LUCAS', 'MIA', 'ELI', 'ANNA'];
const DEAD = ['~PETER', '~LUCY', '~SAM', '~JADE', '~TOM', '~ROSE', '~BEN', '~KATE', '~ADAM', '~ELLA'];

function forest(scene) {
  const rn = rng(18), shapes = [
    treeShape({ seed: 1, h: 22, r0: 2.2, r1: 0.95, spread: 13, clumps: 15 }),
    treeShape({ seed: 2, h: 26, r0: 2.4, r1: 1.0, spread: 14, clumps: 16, cols: ['#123021', '#245e30', '#5fa23f'] }),
    treeShape({ seed: 3, h: 19, r0: 2.0, r1: 0.9, spread: 12, clumps: 13, cols: ['#1a3a1e', '#3a7330', '#8ab54a'] }),
  ];
  const far = [
    treeShape({ seed: 4, h: 22, r0: 2.2, r1: 1, spread: 13, clumps: 7, detail: 1 }),
    treeShape({ seed: 5, h: 26, r0: 2.4, r1: 1, spread: 14, clumps: 8, detail: 1, cols: ['#123021', '#245e30', '#5fa23f'] }),
  ];
  const near = [], list = [], patches = [];
  const atlas = nameAtlas([...NAMES, ...DEAD, 'DANIELLE', 'WRONG NAME']); W.atlas = atlas;
  const tree = (x, z, s, shape, o = {}) => { const t = { x, z, s, yaw: rn() * 6.28, shape, ...o }; near.push(t); return t; };
  const carve = (t, a, y, name, on, dead) => { const sh = shapes[t.shape], yl = y / t.s; patches.push({ t, a: a - t.yaw, y: yl, r: radiusAt(sh.geo, yl) + 0.02, cell: atlas.cells[name], on, dead }); };
  // the avenue. Named trees first: the people below stand by them
  for (const s of [-1, 1]) for (let z = -103; z <= 250; z += 19) {
    if (s > 0 && z > 12 && z < 48) continue;
    const t = tree(s * 14.2, z, 1, (Math.abs(z) + (s > 0 ? 1 : 0)) % 3);
    t.on = W.wave0 + Math.hypot(t.x - CLOCK.x, z - CLOCK.z) * 0.0055;
    const nm = s < 0 && z === 11 ? 'MARCUS' : s < 0 && z === 30 ? 'OLIVIA' : NAMES[(near.length * 5) % NAMES.length];
    carve(t, s > 0 ? -Math.PI / 2 : Math.PI / 2, 5.4, nm, t.on);
  }
  // the avenue of the park path, on both sides: dead names in one stretch, burning ones in the next
  let k = 0;
  for (let x = 126; x <= 222; x += 13.5) for (const side of [-1, 1]) {
    const z = PATH_Z + side * 9.2 + (rn() - 0.5) * 1.2, t = tree(x + (rn() - 0.5) * 3, z, 1.5, k % 3), face = side < 0 ? 0 : Math.PI;
    const dead = x > 150 && x < 186 && side < 0;
    carve(t, face, 6.2, dead ? DEAD[k % DEAD.length] : NAMES[(k * 7 + 3) % NAMES.length], 2, dead);
    carve(t, face, 4.5, dead ? DEAD[(k + 3) % DEAD.length] : NAMES[(k * 3 + 11) % NAMES.length], 2, dead);
    k++;
  }
  // a ring round his tree, every trunk facing it: what he sees when they all light
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + rn() * 0.12, d = 25 + (i % 3) * 8 + rn() * 3, x = DT.x + Math.sin(a) * d, z = DT.z + Math.cos(a) * d;
    if (Math.abs(z - PATH_Z) < 8.5 || (z < PATH_Z && Math.abs(x - 240) < 7)) continue;
    const t = tree(x, z, 1.55, i % 3), face = Math.atan2(DT.x - x, DT.z - z);
    carve(t, face, 6.2, NAMES[(i * 5 + 2) % NAMES.length], 2); carve(t, face, 4.5, NAMES[(i * 7 + 9) % NAMES.length], 2);
  }
  // the rest of the park
  for (let i = 0; i < 300; i++) {
    const x = 30 + rn() * 262, z = -240 + rn() * 500;
    if (Math.abs(z - PATH_Z) < 14 || Math.hypot(x - OAK.x, z - OAK.z) < 46 || Math.hypot(x - DT.x, z - DT.z) < 46 || (z > PATH_Z - 34 && z < PATH_Z && Math.abs(x - 240) < 12)) continue;
    const t = tree(x, z, 0.95 + rn() * 0.55, i % 3), towards = Math.atan2(150 - x, PATH_Z - z);
    const d = rn() < 0.28;
    carve(t, towards + (rn() - 0.5) * 0.7, 4.8 + rn() * 2, d ? DEAD[i % DEAD.length] : NAMES[i % NAMES.length], 2, d);
  }
  W.trees = treeSet(scene, shapes, near);
  // the town beyond the park
  const farList = [];
  for (let i = 0; i < 380; i++) {
    const x = 290 + rn() * 700, z = -540 + rn() * 1040;
    if (Math.hypot(x - HOUSE.x, z - HOUSE.z - 40) < 95) continue;
    farList.push({ x, z, s: 0.8 + rn() * 0.35, yaw: rn() * 6.28, shape: i % 2 });
  }
  // the ring round her house, close enough to read
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + rn() * 0.15, d = 44 + rn() * 22;
    if (Math.abs(Math.atan2(Math.cos(a), Math.sin(a) - 0.0)) < 0.52) continue;   // the view in from the street stays open
    farList.push({ x: HOUSE.x + Math.cos(a) * d, z: HOUSE.z + Math.sin(a) * d + 10, s: 1.1, yaw: 0, shape: i % 2, ring: true });
  }
  W.town = treeSet(scene, far, farList, { });
  W.townList = farList;
  farList.forEach((t) => {
    const sh = far[t.shape], yl = 5.6, towards = Math.atan2(HOUSE.x - t.x, HOUSE.z + 60 - t.z);
    patches.push({ t, town: true, a: towards - t.yaw, y: yl, r: radiusAt(sh.geo, yl) + 0.02, cell: atlas.cells.DANIELLE, on: 1e9, tall: 1.2 });
  });
  W.nameSet = namePatches(scene, atlas, patches);
  W.patches = patches;
  W.placeNames = (lean) => {
    const m = new THREE.Matrix4();
    patches.forEach((p, i) => { const set = p.town ? W.town : W.trees; set.baseMatrix(p.t, lean ? lean(p.t) : null, m); W.nameSet.place(p, i, m); });
    W.nameSet.done();
  };
  W.placeNames(null);
}

// the tree with his name on it
function danielTree(scene) {
  const sh = treeShape({ seed: 9, h: 46, r0: 4.9, r1: 2.3, flare: 2.6, spread: 26, clumps: 20, root: 0.04, span: 4, cols: ['#0e2c1c', '#22592e', '#5f9f41'] });
  const set = treeSet(scene, [sh], [{ x: DT.x, z: DT.z, s: 1, yaw: 0, shape: 0 }]);
  const g = new THREE.Group(); g.position.copy(DT); scene.add(g); W.dtree = g;
  const Y = 5.25, R1 = radiusAt(sh.geo, Y + 1.3) + 0.17, R0 = radiusAt(sh.geo, Y - 1.3) + 0.17, ARC = 2.5;
  const A0 = -0.85, A1 = 0.55, nL = 8;   // the word; moss hides its last two letters
  const uOf = (a) => (a + ARC / 2) / ARC;
  const r = rng(404), strokes = [];
  for (let i = 0; i < 22; i++) strokes.push({ u: lerp(uOf(A0) - 0.008, uOf(A0 + (A1 - A0) * 6 / 8) - 0.05, (i * 0.618) % 1), v: 0.2 + r() * 0.14, len: 0.34 + r() * 0.26, tilt: 0.035 + r() * 0.03, w: 9 + r() * 8 });
  const letters = 'DANIELLE';
  W.dpatch = heroPatch(g, { r: R1, r2: R0, y: Y, a: 0, arc: ARC, h: 2.6, px: 4096, draw(c, gl, s, w, h) {
    const rr = rng(9), cy = h * 0.5, adv = (uOf(A1) - uOf(A0)) * w / nL, size = adv * 1.32;
    c.font = gl.font = `900 ${size}px ITTInter, sans-serif`; c.textAlign = gl.textAlign = 'center'; c.textBaseline = gl.textBaseline = 'middle';
    [...letters].forEach((ch, i) => {
      const x = uOf(A0) * w + adv * (i + 0.5), y = cy + (rr() - 0.5) * size * 0.08, rot = (rr() - 0.5) * 0.1, le = i >= 6;
      c.save(); c.translate(x, y); c.rotate(rot);
      c.fillStyle = 'rgba(8,5,3,0.96)'; c.fillText(ch, 0, 0); c.restore();
      const k = le ? s.le : Math.max(s.lit, s.ash);
      if (k > 0.002) {
        gl.save(); gl.translate(x, y); gl.rotate(rot);
        const col = le ? [255, 74, 128] : [110, 255, 178];
        gl.shadowColor = `rgba(${col},${0.9 * k})`; gl.shadowBlur = 60; gl.fillStyle = `rgba(${col.map((v) => Math.round(v * k))},1)`; gl.fillText(ch, 0, 0);
        gl.shadowBlur = 0; gl.fillStyle = `rgba(${(le ? [255, 150, 185] : [245, 255, 240]).map((v) => Math.round(v * k * (le ? 1 : 0.8)))},1)`; gl.font = `900 ${size * 0.97}px ITTInter, sans-serif`; gl.fillText(ch, 0, 0); gl.restore();
      }
    });
    for (let i = 0; i < s.scr; i++) {
      const q = strokes[i], x = q.u * w, y0 = q.v * h;
      c.strokeStyle = 'rgba(214,176,130,0.9)'; gl.strokeStyle = 'rgba(96,70,46,1)'; c.lineCap = gl.lineCap = 'round'; c.lineWidth = gl.lineWidth = q.w;
      for (const x2 of [c, gl]) { x2.beginPath(); x2.moveTo(x, y0); x2.lineTo(x + q.tilt * w, y0 + q.len * h); x2.stroke(); }
    }
  } });
  W.tpatch = heroPatch(g, { r: R1 + 0.01, r2: R0 + 0.01, y: Y, a: 0.93, arc: 0.44, h: 1.0, px: 1024, draw(c, gl, s, w, h) {
    c.font = gl.font = `900 ${h * 0.6}px ITTInter, sans-serif`; c.textAlign = gl.textAlign = 'center'; c.textBaseline = gl.textBaseline = 'middle';
    c.fillStyle = 'rgba(8,5,3,0.95)'; c.fillText(s.txt, w / 2, h / 2);
    const k = s.k;
    gl.shadowColor = `rgba(255,50,40,${k})`; gl.shadowBlur = 40; gl.fillStyle = `rgba(${Math.round(255 * k)},${Math.round(70 * k)},${Math.round(50 * k)},1)`; gl.fillText(s.txt, w / 2, h / 2);
    gl.shadowBlur = 0; gl.fillStyle = `rgba(${Math.round(255 * k)},${Math.round(205 * k)},${Math.round(180 * k)},1)`; gl.font = `900 ${h * 0.585}px ITTInter, sans-serif`; gl.fillText(s.txt, w / 2, h / 2);
  } });
  W.moss = mossPad(g, (R1 + R0) / 2 + 0.02, Y, (A0 + (A1 - A0) * 7 / 8), 1.5, 1.75);
  W.housePink = new THREE.PointLight('#ff3d7e', 0, 110, 1.6); W.housePink.position.set(HOUSE.x - 4, 20, HOUSE.z + 42); scene.add(W.housePink);
  W.dlight = new THREE.PointLight('#6dffb2', 0, 22, 1.5); W.dlight.position.copy(rad(0.05, 8.4, 5.4)); scene.add(W.dlight);
  W.chips = burst(scene, { count: 70, color: '#d9b080', bright: 1.1, height: 1.2, spread: 2.4, dur: 0.7, seed: 8, pos: rad(-0.24, 5.2, 4.8), pointSize: 0.55 });
}

function oakPatch() {
  const g = W.oak.geo, y = 13, h = 6.2, r1 = radiusAt(g, y + h / 2) + 0.42, r0 = radiusAt(g, y - h / 2) + 0.42;
  W.opatch = heroPatch(W.oak.group, { r: r1, r2: r0, y, a: 0, arc: 1.45, h, px: 2048, draw(c, gl, s, w, h2) {
    const word = (txt, cy, size, col, k, seed) => {
      const m = document.createElement('canvas'); m.width = w; m.height = h2; const x = m.getContext('2d');
      carveWord(c, txt, w / 2, cy, w * 0.86, size, rng(seed), 'rgba(8,5,3,0.95)');
      if (k < 0.01) return;
      gl.save(); gl.shadowColor = `rgba(${col},${k})`; gl.shadowBlur = 50; carveWord(gl, txt, w / 2, cy, w * 0.86, size, rng(seed), `rgb(${col.map((v) => Math.round(v * k))})`);
      gl.shadowBlur = 0; carveWord(gl, txt, w / 2, cy, w * 0.86, size * 0.97, rng(seed), `rgb(${[245, 255, 240].map((v) => Math.round(v * k * 0.8))})`); gl.restore(); void x;
    };
    word('DANIEL', h2 * 0.3, h2 * 0.36, [110, 255, 178], s.name, 3);
    if (s.six > 0) word(s.txt, h2 * 0.74, h2 * 0.38, [255, 70, 50], s.six, 5);
  } });
}

async function loadTex(url) { const t = await new THREE.TextureLoader().loadAsync(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

async function build() {
  const { scene } = ctx;
  W.wave0 = 1.0;
  const tex = { llama: await loadTex('/web/assets/eggs/llamacorn.jpg'), song: await loadTex('/web/assets/eggs/roblox_song.jpg'),
    card: canvasTex(512, 224, (c, w, h) => { c.fillStyle = '#16161c'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd23f'; c.font = '900 76px ITTInter, sans-serif'; c.textAlign = 'center'; c.fillText('TOY FAN TV', w / 2, 138); }),
    missing: canvasTex(340, 460, (c, w, h) => { c.fillStyle = '#f2ecd8'; c.fillRect(0, 0, w, h); c.fillStyle = '#b3121b'; c.font = '900 64px ITTInter, sans-serif'; c.textAlign = 'center'; c.fillText('MISSING', w / 2, 76); c.fillStyle = '#c9c0a8'; c.fillRect(70, 110, 200, 200); c.fillStyle = '#333'; c.font = '900 46px ITTInter, sans-serif'; c.fillText('MARCUS', w / 2, 370); c.font = '900 28px ITTInter, sans-serif'; c.fillText('SEEN NEAR THE TREES', w / 2, 420); }) };
  const b = new Batch(); pathGround(b); fence(b);
  bench(b, 70, PATH_Z - 8.4, 0); bench(b, 92, PATH_Z + 8.4, Math.PI); bench(b, 150, PATH_Z - 6.9, 0);
  b.done(scene);
  // shops along the avenue
  const shops = [
    { style: 'brick', wall: '#a8553e', floors: 3, name: 'BAKERY', shutters: '#2f5d50', signBg: '#2f5d50', lit: 0.5 },
    { style: 'stucco', wall: '#e0b98a', floors: 2, name: 'BOOKS', signBg: '#3a2a1c', roof: 'gable', lit: 0.45, shutters: '#3d5a80' },
    { style: 'brick', wall: '#6a7f90', floors: 4, name: 'HOTEL', trim: '#f4efe6', signBg: '#7d2e2e', lit: 0.5 },
    { style: 'stucco', wall: '#c98a66', floors: 3, name: 'RECORDS', signBg: '#222a40', lit: 0.5 },
    { style: 'brick', wall: '#8a6a4a', floors: 2, name: 'DINER', signBg: '#a02a2a', lit: 0.7 },
  ];
  for (let i = 0; i < 16; i++) {
    const d = shops[i % 5], bd = building({ ...d, seed: i + 3, w: 28, d: 20 });
    bd.position.set(-35, 0, -170 + i * 30); bd.rotation.y = Math.PI / 2; scene.add(bd);
  }
  for (let i = 0; i < 10; i++) { const bd = building({ style: 'brick', wall: ['#7f6a5a', '#6f7a84', '#8a5a48'][i % 3], floors: 5 + i % 3, w: 30, d: 24, lit: 0.45, seed: 40 + i }); bd.position.set(-72, 0, -220 + i * 48); bd.rotation.y = Math.PI / 2; scene.add(bd); }
  clockTower(scene);
  for (const [z, c] of [[-120, '#c0392b'], [-40, '#2e6db0'], [62, '#d9a83a'], [150, '#3a8a5a']]) { const car = model('car', { color: c }); car.position.set(-8.6, 0.13, z); car.rotation.y = Math.PI / 2; car.scale.setScalar(1.25); scene.add(car); }
  // lamps: the avenue and the park
  const lamps = (x, z, ry, col) => { const l = lamp({ height: 13, glow: col }); l.position.set(x, 0.5, z); l.rotation.y = ry; scene.add(l); lightPool(scene, x + Math.cos(ry) * 1.55, 0.72, z - Math.sin(ry) * 1.55, 22, col, 0.2); const s = glowSprite(col, 5, 0.5); s.position.set(x + Math.cos(ry) * 1.55, 13.2, z - Math.sin(ry) * 1.55); scene.add(s); };
  for (let z = -160; z <= 240; z += 38) { lamps(-12, z, 0, '#ffd898'); lamps(12, z + 19, Math.PI, '#ffd898'); }
  for (let x = 40; x <= 230; x += 34) lamps(x, PATH_Z + (x % 68 < 34 ? -6.6 : 6.6), x % 68 < 34 ? Math.PI / 2 : -Math.PI / 2, '#d8ffc0');
  // park gate
  const gate = sign('OAKHOLLOW PARK', { w: 19, h: 2.8, bg: '#16302a', fg: '#e8e0b8', edge: '#d9a83a' }); gate.position.set(22.4, 11, PATH_Z); gate.rotation.y = Math.PI / 2; scene.add(gate);
  const gb = new Batch(); for (const z of [-11, 11]) gb.box(surf('brick', '#7a6a58'), 2.4, 13, 2.4, 22, 6.5, PATH_Z + z, { r: 0.14 }); gb.done(scene);
  noticeBoard(scene, tex);
  // ground cover beside the paths
  groundCover(scene);
  neighbourhood(scene); heroHouse(scene); bedroom(scene, tex);
  forest(scene);
  W.oak = heroOak(scene, { pos: OAK }); oakPatch(); danielTree(scene);
  W.oakLight = new THREE.PointLight('#6dffb2', 0, 60, 1.5); W.oakLight.position.copy(OAK).add(v3(0, 16, 24)); scene.add(W.oakLight);

  // people
  const CH = (spec, tag) => { const c = makeCharacter({ caustic: false, ...spec }); scene.add(c.root); c.tag = tag ? nameTag(c, tag) : null; c.vanish = vanisher(c); c.poof = burst(scene, { seed: spec.shirt.charCodeAt(2), count: 110 }); return c; };
  W.marcus = CH({ skin: '#b97e50', shirt: '#e0553a', pants: '#2d3b55', shoes: '#f0f0f0', hair: '#141416', hairStyle: 'short', acc: ['cap:#20344e'], accent: '#ffd23f' }, 'MARCUS');
  W.olivia = CH({ skin: '#f3cfa8', shirt: '#f2b92c', pants: '#3a5a9a', shoes: '#ffffff', hair: '#7a2f1c', hairStyle: 'long', female: true }, 'OLIVIA');
  W.pal = CH({ skin: '#8a5634', shirt: '#2fa39a', pocket: '#288a82', hood: true, pants: '#2b2b33', shoes: '#ffffff', hair: '#111114', hairStyle: 'spiky' }, 'NOAH');
  W.line = [
    CH({ skin: '#f3cfa8', shirt: '#8e44ad', pants: '#25324d', shoes: '#222', hair: '#b98a3a', hairStyle: 'short' }, 'ETHAN'),
    CH({ skin: '#e0ac7c', shirt: '#2e7bd6', pants: '#6b5238', shoes: '#eee', hair: '#2a1c12', hairStyle: 'ponytail', female: true }, 'GRACE'),
    CH({ skin: '#5c3a24', shirt: '#e8e4dc', pants: '#1f2024', shoes: '#c33', hair: '#111114', hairStyle: 'bob', female: true }, 'SOFIA'),
    CH({ skin: '#f3cfa8', shirt: '#d65d9b', pants: '#55708f', shoes: '#fff', hair: '#5b3a1e', hairStyle: 'short' }, 'LIAM'),
  ];
  W.line.forEach((c, i) => { c.root.position.set(13, 0.6, -36 + i * 21); c.root.rotation.y = -Math.PI / 2 + 0.3; });
  W.marcus.root.position.set(-12.9, 0.6, 16.4); W.olivia.root.position.set(-12.9, 0.6, 35.4); W.pal.root.position.set(-15.9, 0.6, 18);
  W.bag = new Batch(); W.bag.box(paint('#e8e4dc'), 1, 1.3, 0.5, 0, 0.65, 0, { r: 0.1 }); W.bag = W.bag.done(); scene.add(W.bag);
  W.dan = makeCharacter({ ...CAST.daniel, caustic: false }); scene.add(W.dan.root); W.danTag = nameTag(W.dan, 'DANIEL');
  W.sis = makeCharacter({ ...CAST.danielle, caustic: false }); W.room.add(W.sis.root); W.sis.root.position.set(2.1, 0.02, 0.5);

  // air
  W.air = atmos(
    clouds(scene, { y: 300, spread: 1700, count: 18, color: '#6f97a8', size: 30 }),
    dust(scene, { size: 240, height: 34, centre: v3(150, 14, 30), count: 1200, color: '#c8ff9a', amount: 0.6, pointSize: 1.3 }),
    dust(scene, { size: 130, height: 26, centre: v3(-2, 12, 20), count: 600, color: '#ffe0a0', amount: 0.4, seed: 9 }),
    leaves(scene, { size: 240, height: 40, centre: v3(150, 20, 30), count: 700 }),
    leaves(scene, { size: 110, height: 30, centre: v3(0, 16, 10), count: 260, seed: 4 }),
    ...[W.marcus, W.olivia, ...W.line].map((c) => c.poof), W.chips,
  );
  W.spray = [];
  for (const [x, z] of [[70, -30], [150, -20], [205, 0]]) W.spray.push(shaft(scene, { from: v3(x + 34, 80, z + 20), to: v3(x, 0, z + 30), top: 7, bottom: 16, color: '#e8ffb0', amount: 0.09 }));
  W.marcus.poof.position.copy(W.marcus.root.position); W.olivia.poof.position.copy(W.olivia.root.position); W.line.forEach((c) => c.poof.position.copy(c.root.position));
  W.marcus.poof.fire(EV.marcus + 0.2); W.olivia.poof.fire(EV.olivia + 0.2); [EV.v1, EV.v2, EV.v3, EV.v4].forEach((e, i) => W.line[i].poof.fire(e + 0.1));
  W.chips.fire(1e9);
}

function groundCover(scene) {
  const r = rng(6), blade = new THREE.ConeGeometry(0.11, 0.95, 4, 1); blade.translate(0, 0.47, 0);
  const tuft = [];
  for (let i = 0; i < 5; i++) { const g = blade.clone(); g.rotateZ((i - 2) * 0.22); g.rotateY(i * 1.3); g.translate((i - 2) * 0.12, 0, ((i * 7) % 5 - 2) * 0.12); tuft.push(g.toNonIndexed()); }
  const geo = THREE.BufferGeometryUtils ? null : null; void geo;
  const n = 12000, im = new THREE.InstancedMesh(mergeTuft(tuft), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), n);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = 26 + r() * 250, side = r() < 0.5 ? -1 : 1, z = PATH_Z + side * (6.4 + Math.pow(r(), 1.5) * 34);
    q.setFromAxisAngle(v3(0, 1, 0), r() * 6.28); const s = Math.hypot(x - DT.x, z - DT.z) < 13 ? 0.001 : 0.8 + r() * 1.2;
    M.compose(v3(x, 0, z), q, v3(s, s * (0.8 + r() * 0.6), s)); im.setMatrixAt(i, M); im.setColorAt(i, c.set(['#3f8a3c', '#2f7a3c', '#5aa244', '#2a6a36'][i % 4]));
  }
  im.instanceColor.needsUpdate = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
  // bushes, rocks and mushrooms
  const bushG = new THREE.IcosahedronGeometry(1, 1), bush = new THREE.InstancedMesh(bushG, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.85 }), 170);
  const rock = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), surf('concrete', '#7f8a80', { flatShading: true }), 70);
  for (let i = 0; i < 170; i++) {
    const x = 30 + r() * 250, z = PATH_Z + (r() < 0.5 ? -1 : 1) * (9 + r() * 46), s = 1.6 + r() * 2.2; q.setFromAxisAngle(v3(0, 1, 0), r() * 6.28);
    if (Math.hypot(x - DT.x, z - DT.z) < 20 || Math.hypot(x - 104, z - 40) < 14) { M.compose(v3(0, -50, 0), q, v3(0, 0, 0)); bush.setMatrixAt(i, M); bush.setColorAt(i, c.set('#000')); continue; }
    M.compose(v3(x, s * 0.5, z), q, v3(s * 1.3, s * 0.85, s * 1.2)); bush.setMatrixAt(i, M); bush.setColorAt(i, c.set(['#2c6a33', '#245a2c', '#3f7f38'][i % 3]));
  }
  for (let i = 0; i < 70; i++) { const x = 30 + r() * 250, z = PATH_Z + (r() < 0.5 ? -1 : 1) * (7 + r() * 40), s = 0.5 + r() * 1.3; q.setFromAxisAngle(v3(0.3, 1, 0.2).normalize(), r() * 6.28); M.compose(v3(x, s * 0.34, z), q, v3(s * 1.2, s * 0.7, s)); rock.setMatrixAt(i, M); }
  bush.instanceColor.needsUpdate = true;
  for (const m of [bush, rock]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
}
function mergeTuft(list) {
  const pos = []; for (const g of list) pos.push(...g.attributes.position.array);
  const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); b.computeVertexNormals(); return b;
}

// ---- shots ----
const lp3 = (a, b, u) => a.clone().lerp(b, u);
function shots() {
  const ls = (i) => L(i).start, le = (i) => L(i).end, c = 0.08;
  const D = (t, y = 0) => { const d = dan(t); return v3(d.x, y, d.z); };
  const list = [
    ['clock', () => 1.75, (u) => ({ pos: lp3(v3(9, 6, -112), v3(9, 6.5, -124), easeOut(u)), look: v3(0, 47, -199), fov: 46 })],
    ['avenue', () => 3.25, (u) => ({ pos: lp3(v3(-3, 5.4, 62), v3(-3, 7, 34), u), look: v3(-2, 9, -120), fov: 62 })],
    ['bark', () => ls(1) - c, (u) => ({ pos: lp3(v3(-4.5, 5.7, 12.6), v3(-5.6, 5.5, 11.6), easeInOut(u)), look: v3(-12.6, 5.4, 11), fov: 44 })],
    ['prank', () => ls(2) - c, (u) => ({ pos: lp3(v3(-6.6, 4.4, 3.4), v3(-7.2, 4.3, 5), u), look: v3(-13.6, 4.2, 16), fov: 56 })],
    ['marcus', () => EV.olivia - 0.45, (u) => ({ pos: lp3(v3(-6, 4.9, 22.5), v3(-6.6, 4.8, 21.6), u), look: v3(-13, 3.2, 15), fov: 60 })],
    ['olivia', () => ls(3) - 0.3, (u) => ({ pos: lp3(v3(-5.8, 4.9, 41), v3(-6.4, 4.8, 40), u), look: v3(-13.2, 3.2, 34), fov: 60 })],
    ['onebyone', () => ls(4) - c, (u) => ({ pos: lp3(v3(-6, 8.5, 46), v3(-5, 8, 38), u), look: v3(12, 3.5, -16), fov: 60 })],
    ['walk', () => ls(4) + 2.9, (u, t) => { const p = D(t); return { pos: p.clone().add(v3(lerp(11, 9, u), 4.2, 7.5)), look: p.clone().add(v3(1, 4, 0)), fov: 50 }; }],
    ['oakup', () => ls(5) - c, (u) => ({ pos: lp3(v3(97, 3.5, 43), v3(98.5, 3.5, 41), u), look: v3(112, 34, -14), fov: 78 })],
    ['oakname', () => ls(6) - c, (u) => ({ pos: lp3(v3(OAK.x + 3, 13, 22), v3(OAK.x + 1.5, 14, 17), easeOut(u)), look: v3(OAK.x, 17, OAK.z + 8), fov: 62 })],
    ['froze', () => ls(7) - c, (u) => ({ pos: lp3(v3(101.8, 5.3, 19.6), v3(101.6, 5.2, 20.8), u), look: v3(100, 3.9, 30), fov: 52 })],
    ['over', () => ls(8) - c, (u) => ({ pos: lp3(v3(96.5, 4.5, 34.6), v3(96, 4.4, 35.4), u), look: v3(OAK.x - 2, 34, OAK.z), fov: 72 })],
    ['six', () => ls(9) - c, (u) => ({ pos: lp3(v3(OAK.x + 1.5, 11, 17), v3(OAK.x + 0.5, 11, 13), easeInOut(u)), look: v3(OAK.x, 10.5, OAK.z + 8), fov: 56 })],
    ['bolt', () => ls(10) + 0.6, (u, t) => { const p = D(t); return { pos: p.clone().add(v3(lerp(9, 11, u), 1.5, 3.4)), look: p.clone().add(v3(0, 3.2, 0)), fov: 62 }; }],
    ['runpass', () => ls(11) - c, (u, t) => { const p = D(t); return { pos: p.clone().add(v3(-8.5, 4.3, 3.6)), look: p.clone().add(v3(9, 3.8, -5.4)), fov: 58 }; }],
    ['crossed', () => ls(12) - c, (u) => ({ pos: lp3(v3(155, 6, 32.4), v3(173, 6, 32.4), u), look: lp3(v3(158, 5.3, 22), v3(176, 5.3, 22), u), fov: 62 })],
    ['glowing', () => ls(13) - c, (u) => ({ pos: lp3(v3(203, 6, 33), v3(209, 6, 32.5), u), look: lp3(v3(205, 5, 22), v3(209, 5, 22), u), fov: 62 })],
    ['found', () => ls(14) - c, (u, t) => ({ pos: lp3(v3(232, 5.8, 38), v3(232.6, 5.7, 36.6), u), look: rad(-0.02, 4.6, 4.2), fov: 54 })],
    ['timer', () => ls(16) - c, (u) => { const k = easeInOut(smooth(0.3, 0.72, u)), a = lerp(-0.1, 0.95, k); return { pos: rad(a, lerp(23, 13.5, k), 5.5), look: rad(a, 4.6, 4.5), fov: 44 }; }],
    ['scratch', () => ls(16) + 1.3, (u) => ({ pos: rad(lerp(0.3, 0.38, u), 15, 6), look: rad(-0.3, 5, 4.2), fov: 50 })],
    ['stop', () => ls(18) - c, (u) => { const k = smooth(0.34, 0.7, u), a = lerp(-0.2, 0.95, k); return { pos: rad(a, lerp(16, 13.5, k), 5.45), look: rad(a, 4.6, 4.5), fov: 44 }; }],
    ['silent', () => ls(19) - c, (u) => ({ pos: lp3(rad(-1.15, 20, 4.2), rad(-1.1, 18.5, 4.2), u), look: rad(-0.42, 7, 6.5), fov: 60 })],
    ['ignite', () => ls(20) - c, (u) => { const k = easeInOut(u), a = lerp(-0.1, -0.75, k); return { pos: rad(a, 5.9, lerp(4.4, 5.2, k)), look: rad(a + 0.1, 30, 7.5), fov: 72 }; }],
    ['wrong', () => ls(21) - c, (u) => { const a = A_DAN; return { pos: rad(a + 0.03, lerp(5.6, 5.3, u), 4.3), look: rad(a, 10, 4.4), fov: 72 }; }],
    ['down', () => ls(22) - c, (u) => ({ pos: rad(-0.05, 21, 6.2), look: rad(-0.3, 5, 4.6), fov: 46 })],
    ['reveal', () => ls(23) - c, (u) => ({ pos: lp3(rad(-0.15, 25, 5.5), rad(-0.15, 23, 5.4), easeOut(u)), look: rad(-0.15, 4.6, 4.5), fov: 40 })],
    ['sister', () => ls(24) - c, (u) => ({ pos: lp3(B(0.6, 4.6, 9), B(0.6, 4.6, 8), u), look: B(0.3, 3.2, -8), fov: 62 })],
    ['town', () => ctx.dur + 1, (u) => {
      const k = easeInOut(clamp(u * 1.02)), a = v3(HOUSE.x - 60, 120, HOUSE.z + 300), b = v3(HOUSE.x + 5, 13, HOUSE.z + 62);
      return { pos: lp3(a, b, k), look: lp3(v3(HOUSE.x, 14, HOUSE.z - 10), v3(HOUSE.x + 1, 12.5, HOUSE.z + 11), k), fov: lerp(46, 40, k) };
    }],
  ];
  let prev = -1;
  return list.map(([name, end, f]) => { const a = prev; prev = end; const t0 = typeof a === 'function' ? a : () => a; return { name, t0, t1: end, f }; });
}

const faceFor = (t) => (t < EV.oakname ? 'neutral' : t < EV.run ? 'scared' : t < EV.found ? 'worried' : t < EV.scratch ? 'scared' : t < EV.hush ? 'worried' : t < EV.relight ? 'worried' : t < EV.wrong ? 'scared' : 'shock');

// ---- the frame ----
function renderAt(t) {
  const sh = shotAt(W.shots, t), n = sh.name;
  const park = ['walk', 'oakup', 'oakname', 'froze', 'over', 'six'].includes(n), deep = ['bolt', 'runpass', 'crossed', 'glowing', 'found', 'timer', 'scratch', 'stop', 'silent', 'ignite', 'wrong', 'down', 'reveal'].includes(n);
  const room = n === 'sister', end = n === 'town';
  applyEnv(ctx, room ? ROOM : end ? TOWN : deep ? DEEP : park ? PARK : GOLD);
  W.air.update(t);
  const whisper = t > EV.wave && t < EV.hush ? 1 : t > EV.relight ? 1.6 : 0;
  leafTime(t, (n === 'silent' ? 0 : 0.12 * whisper) + (end ? 0.2 : 0));

  // the clock
  const strike = easeOut(clamp((t - EV.strike) / 0.12));
  W.clock.setTime(lerp(359, 360, strike));
  W.clockLight.intensity = n === 'clock' ? 900 : 0;

  // carved names
  const U = W.nameSet.U; U.uT.value = t;
  const hush = smooth(EV.hush, EV.hush + 0.35, t);
  U.uDim.value = t > EV.relight + 3 ? 0 : hush;
  U.uCentre.value.set(DT.x, 0, DT.z);
  U.uWave.value = t < EV.relight ? -30 : (t - EV.relight) * 95;
  U.uAltR.value = -1;
  if (t >= EV.wrong && t < EV.moss + 1) { U.uAltR.value = (t - EV.wrong) * 320; const c = W.atlas.cells['WRONG NAME']; U.uAltCell.value.set(c % W.atlas.cols, Math.floor(c / W.atlas.cols)); U.uAltColor.value.set('#ff3344'); }
  if (t >= EV.calling) {
    U.uCentre.value.set(HOUSE.x, 0, HOUSE.z); U.uAltR.value = (t - EV.calling) * 170; const c = W.atlas.cells.DANIELLE; U.uAltCell.value.set(c % W.atlas.cols, Math.floor(c / W.atlas.cols)); U.uAltColor.value.set('#ff3d7e');
  }
  W.nameSet.mesh.visible = !room;
  W.housePink.intensity = end ? 2600 * smooth(EV.calling, EV.calling + 1.5, t) : 0;
  leafLight(HOUSE, end ? (t - EV.calling) * 170 : -1, '#ff2f70', 0.34);

  // the trees bend toward her house
  if (end) {
    const lean = (tr) => {
      const dx = HOUSE.x - tr.x, dz = HOUSE.z - tr.z, d = Math.hypot(dx, dz) || 1, k = smooth(EV.bend + d / 300, EV.bend + d / 300 + 1.5, t);
      return { angle: k * (tr.ring ? 0.26 : 0.2), dir: v3(dx / d, 0, dz / d) };
    };
    W.town.pose(lean); W.trees.pose(lean); W.placeNames(lean); W.bent = true;
  } else if (W.bent) { W.town.pose(null); W.trees.pose(null); W.placeNames(null); W.bent = false; }

  // the oak
  const oakOn = ['oakname', 'six', 'over', 'froze'].includes(n);
  const speak = (a, b) => smooth(a, a + 0.15, t) * (1 - smooth(b, b + 0.3, t));
  const talk = Math.max(speak(L(5).start, L(5).end), speak(L(8).start, L(8).end));
  W.oak.glow(n === 'bolt' ? 0 : 0.25 * smooth(EV.oakname, EV.oakname + 0.4, t) + 0.75 * talk * (0.8 + 0.2 * Math.sin(t * 19)));
  const nameK = smooth(EV.oakname, EV.oakname + 0.5, t);
  const sixLeft = 360 - Math.floor(Math.max(0, t - (L(8).end + 0.1)));
  W.opatch.set({ name: Math.round(nameK * 20) / 20, six: Math.round(smooth(EV.six, EV.six + 0.3, t) * 10) / 10, txt: `${Math.floor(sixLeft / 60)}:${String(sixLeft % 60).padStart(2, '0')}` });
  W.oakLight.intensity = oakOn ? 260 * nameK : 0;

  // the carving on his tree
  const scrK = clamp((t - EV.scratch) / (EV.stop - EV.scratch));
  const lit = 1 - scrK;
  const leK = smooth(EV.lele, EV.lele + 0.6, t);
  W.dpatch.set({ scr: Math.floor(scrK * 22), lit: Math.round(lit * 12) / 12, le: Math.round(leK * 12) / 12, ash: t > EV.scratch ? 0.4 : 0 });
  const timerOn = smooth(EV.timerOn, EV.timerOn + 0.3, t), secs = 59 - Math.floor(clamp(t - EV.t59, 0, EV.stop - EV.t59));
  const timerK = timerOn * (t > EV.stop ? (t > EV.stop + 0.25 ? 0.6 : (Math.floor(t * 12) % 2 ? 0.25 : 1)) : 1);
  W.tpatch.set({ txt: `00:${String(t < EV.t59 ? 59 : secs).padStart(2, '0')}`, k: Math.round(timerK * 10) / 10 }); W.tpatch.mesh.visible = timerOn > 0;
  W.dlight.intensity = deep ? lit * 26 + leK * 12 : 0; W.dlight.color.set(leK > 0.2 ? '#ff4d80' : '#6dffb2');

  // moss comes away as he looks down
  W.moss.forEach((b, i) => {
    const f = clamp(t - (EV.moss + i * 0.09)), y = b.home.y - f * f * 7.0 * (1 + b.seed * 0.3), floorY = 0.5;
    b.m.position.set(b.home.x + Math.sin(b.ang) * f * 1.4, Math.max(floorY, y), b.home.z + Math.cos(b.ang) * f * 1.4);
    b.m.rotation.x = f * 1.6; b.m.scale.y = y < floorY ? 0.6 : 1;
  });

  // Danielle's room, what her window does
  W.room.visible = room; W.sis.setFace(t < EV.sister + 0.6 ? 'curious' : 'scared', { blink: blinkAt(t, 0.7) }); pose(W.sis, 'idle', t);
  W.sis.neck.rotation.y = -lerp(0, 2.6, smooth(EV.sister + 0.35, EV.sister + 0.75, t)) * 0 - 0.15;
  W.sis.root.rotation.y = Math.PI - 2.5 * smooth(EV.sister + 0.3, EV.sister + 0.8, t) * 0 - lerp(0, 2.3, smooth(EV.sister + 0.3, EV.sister + 0.85, t));
  W.roomOut.intensity = room ? 90 * smooth(EV.sister + 0.2, EV.sister + 1, t) : 0;

  // the people
  const P2 = (c, name, face, tv, yaw) => {
    const on = ['avenue', 'prank', 'marcus', 'olivia', 'onebyone'].includes(n);
    const v = clamp((t - tv) / 0.75);
    c.root.visible = on && v < 1; c.vanish.set(v); c.setFace(t > tv - 0.4 ? 'scared' : face); pose(c, t > tv - 0.4 ? 'scared' : name, t); c.root.rotation.y = yaw;
    c.tag.visible = v < 0.4;
  };
  P2(W.marcus, 'point', 'smile', EV.marcus, Math.PI + 0.35);
  P2(W.pal, 'idle', 'smile', 1e9, Math.PI + 0.1);
  if (n === 'marcus') W.pal.setFace('shock');
  P2(W.olivia, 'idle', 'curious', EV.olivia, Math.PI + 0.5);
  [EV.v1, EV.v2, EV.v3, EV.v4].forEach((e, i) => P2(W.line[i], 'idle', 'worried', e, -Math.PI / 2 + 0.3));
  W.bag.visible = t > EV.olivia + 0.6 && n === 'olivia'; W.bag.position.set(-12.7, 0.62, 34.4);

  // Daniel
  const E = W.dan, d = dan(t); E.root.position.set(d.x, d.state === 'tree' ? 0.15 : 0.31, d.z);
  E.root.visible = !room && !end && !['clock', 'avenue', 'bark', 'prank', 'marcus', 'olivia', 'onebyone', 'oakname', 'six', 'crossed', 'glowing', 'timer', 'reveal', 'stop', 'ignite'].includes(n);
  W.danTag.visible = n === 'walk' || n === 'oakup';
  E.setFace(faceFor(t), { blink: blinkAt(t, 0.3) && faceFor(t) !== 'shock', viseme: d.state === 'run' ? (Math.floor(t * 5) % 2 ? 'O' : 'A') : null });   // he pants as he runs
  const toOak = Math.atan2(OAK.x - d.x, OAK.z - d.z), toTree = Math.atan2(DT.x - d.x, DT.z - d.z);
  if (d.state === 'walk') { pose(E, 'walk', t); E.root.rotation.y = Math.PI / 2 + (Math.PI / 2 + 0.25) * smooth(L(5).start - 0.3, L(5).start + 0.1, t); }
  else if (d.state === 'stop') { pose(E, 'lookUp', t, { amt: 0.5 }); E.root.rotation.y = toOak; E.neck.rotation.x = -0.28; E.arms[0].rotation.z = -0.3; E.arms[1].rotation.z = 0.3; }
  else if (d.state === 'run') { pose(E, 'run', t); E.root.rotation.y = lerp(Math.PI / 2, toTree, smooth(EV.found + 0.25, EV.found + 0.7, t)); }
  else {
    E.root.rotation.y = toTree;
    if (t > EV.scratch - 0.2 && t < EV.stop + 0.15) {
      pose(E, 'still', t); const q = t * 15;
      E.arms[0].rotation.x = -1.65 + Math.sin(q) * 0.42; E.arms[1].rotation.x = -1.65 - Math.sin(q) * 0.42; E.arms[0].rotation.z = 0.3; E.arms[1].rotation.z = -0.3;
      E.torso.rotation.x = 0.12; E.torso.rotation.y = Math.sin(q * 0.5) * 0.08; E.neck.rotation.x = 0;
    } else if (t > EV.moss - 0.1) { pose(E, 'lean', t, { amt: 0.15 }); E.neck.rotation.x = 0.1 + 0.55 * smooth(EV.moss - 0.1, EV.moss + 0.25, t); }
    else if (t > EV.hush) { pose(E, 'idle', t); E.torso.rotation.x = Math.sin(t * 5) * 0.03 + 0.05; E.neck.rotation.x = 0.05; }
    else { pose(E, 'idle', t); E.neck.rotation.x = 0.02; }
  }
  W.chips.visible = t > EV.scratch && t < EV.stop + 0.3;
  if (t > EV.scratch && t < EV.stop) W.chips.fire(EV.scratch + Math.floor((t - EV.scratch) / 0.32) * 0.32);

  const shake = n === 'clock' ? 0.45 * Math.exp(-Math.max(0, t - EV.strike) * 4) * (t > EV.strike ? 1 : 0) : n === 'bolt' ? 0.5 : n === 'scratch' ? 0.35 : n === 'wrong' ? 0.4 : n === 'runpass' ? 0.25 : 0;
  const wide = ['avenue', 'onebyone', 'ignite'].includes(n) ? 140 : end ? 340 : n === 'oakup' || n === 'over' ? 120 : 70;
  frame(ctx, t, sh, { shake, shadowSpan: wide, shadows: !room });
  return n;
}

export async function setup() {
  ctx = await initStage('ep18', { look: 'pro', models: ['clock', 'kit_lamp', 'car'], avatars: ['farm_daniel', 'farm_danielle'] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'scared', 'worried', 'shocked', 'curious']);
  await build();
  W.shots = shots();
  const api = expose(ctx, renderAt, EV.wrong + 0.8, EV);
  return api;
}

void noise1; void sign; void barkMat;
