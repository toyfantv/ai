// The renderer's own models. Episodes reach them through engine/library.js: model('package_box').
// Each builder takes one options object and returns the model; the catalogue is web/assets/models/index.json.
import { building, skyline, crowd, crate, barrel, lamp, sign, Batch, surf, paint } from './kit.js';
import { treeShape, treeSet, heroOak } from './forest.js';
import * as THREE from 'three';
import { v3, rng, mat, box, wallRects, lerp } from './core.js';
import { makeHouse, makeTree, mergeGroup, buildHeroHouse, buildTown } from './town.js';
import { makeLeg, footAt, makeEye, canvasTex, glowSprite } from './props.js';
import { secCam, fridge, diningChair, diningTable, bed, sofa, plant, pcDesk, selectionBox, modernHouse } from './home.js';

// ---------- Episode 17 ----------
// The black package: four walls that fold out (open(angle)), a lid, a RETURN ADDRESS label.
export function makeBox(parent) {
  const g = new THREE.Group(); if (parent) parent.add(g);
  const out = mat('#17171d', { caustic: false }), inn = mat('#3a3038', { caustic: false }), gold = mat('#a98a4a', { caustic: false });
  box(2, 0.06, 2, inn, 0, 0.03, 0, g);
  const P4 = [[0, 1, 'x', 1], [0, -1, 'x', -1], [1, 0, 'z', -1], [-1, 0, 'z', 1]].map(([x, z, ax, sg]) => {
    const p = new THREE.Group(); p.position.set(x, 0, z); g.add(p);
    const side = ax === 'z';
    box(side ? 0.05 : 2, 1.7, side ? 2 : 0.05, out, 0, 0.85, 0, p);
    box(side ? 0.02 : 1.96, 1.66, side ? 1.96 : 0.02, inn, side ? -sg * -0.035 * -1 : 0, 0.85, side ? 0 : -sg * 0.035, p);
    return { p, ax, sg };
  });
  // the label: no return address
  const lab = canvasTex(512, 320, (c, w, h) => {
    c.fillStyle = '#efe7d4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a2420'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#2a2420'; c.font = '900 42px ITTInter, sans-serif'; c.textAlign = 'left'; c.fillText('RETURN ADDRESS:', 34, 74);
    c.fillRect(34, 138, w - 68, 5); c.fillRect(34, 206, w - 68, 5); c.fillRect(34, 274, w - 68, 5);
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshStandardMaterial({ map: lab, roughness: 0.8 }));
  label.position.set(0, 0.92, 0.035); P4[0].p.add(label);
  const lid = new THREE.Group(); lid.position.y = 1.7; g.add(lid);
  box(2.14, 0.22, 2.14, out, 0, 0.11, 0, lid);
  box(0.16, 0.24, 2.16, gold, 0, 0.11, 0, lid); box(2.16, 0.24, 0.16, gold, 0, 0.11, 0, lid);
  return { g, lid, open(a) { P4.forEach(({ p, ax, sg }) => { p.rotation[ax] = sg * a; }); } };
}

// A house as a model: no roof, ceiling, hedge or lights.
export function cutaway(house) {
  for (const c of [...house.group.children]) {
    if (c.isLight) { c.intensity = 0; c.visible = false; continue; }
    const p = c.position, gp = c.geometry && c.geometry.parameters;
    if (!gp) continue;
    if (gp.radialSegments || (p.y > 13.6 && gp.height < 1)) house.group.remove(c);
    else if (p.z > 11 && p.y < 1) house.group.remove(c);   // hedge
  }
  return house;
}

// The sky as a box: two pairs of flaps with the night printed inside, walls, a lit room beyond. C is the centre, A the half size.
export function cardboardSky(scene, C, A) {
  const W = {};
  const night = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#0d1540'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { const a = 0.3 + 0.7 * Math.abs(Math.sin(i * 12.9898)); c.fillStyle = `rgba(255,255,255,${a})`; const s = 1 + (i % 3); c.fillRect(Math.abs(Math.sin(i * 78.233)) * w, Math.abs(Math.sin(i * 39.425)) * h, s, s); }
    // the sky is printed on cardboard: bare kraft at the edges
    c.strokeStyle = '#b98a5a'; c.lineWidth = 46; c.strokeRect(0, 0, w, h);
  });
  night.anisotropy = 16;
  const nightM = new THREE.MeshBasicMaterial({ map: night, fog: false, side: THREE.DoubleSide, toneMapped: false });
  const card = new THREE.MeshBasicMaterial({ color: '#b98a5a', fog: false, toneMapped: false });
  const flap = (ax, sg, y) => {
    const p = new THREE.Group(); p.position.copy(C); p.position.y = y; p.position[ax] += sg * A; scene.add(p);
    const m = new THREE.Mesh(new THREE.BoxGeometry(ax === 'x' ? A : 2 * A, 16, ax === 'x' ? 2 * A : A), [card, card, card, nightM, card, card]);
    m.position[ax] = -sg * A / 2; p.add(m);
    return { p, ax, sg };
  };
  W.flaps = [flap('x', 1, C.y + 18), flap('x', -1, C.y + 18), flap('z', 1, C.y), flap('z', -1, C.y)];
  W.tape = new THREE.Mesh(new THREE.PlaneGeometry(10, 2 * A), new THREE.MeshBasicMaterial({ color: '#ffe2b0', fog: false, transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide }));
  W.tape.rotation.x = Math.PI / 2; W.tape.position.copy(C); W.tape.position.y = C.y + 9; scene.add(W.tape);
  // the box's walls keep the rest of the giant out of the night
  W.walls = new THREE.Group(); scene.add(W.walls);
  const wm = new THREE.MeshBasicMaterial({ color: '#141c4c', fog: false, side: THREE.DoubleSide });
  const wall = (x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * A, C.y + 60), wm); m.position.set(x, (C.y - 60) / 2, z); m.rotation.y = ry; W.walls.add(m); };
  wall(C.x, C.z - A, 0); wall(C.x + A, C.z, Math.PI / 2); wall(C.x - A, C.z, Math.PI / 2);
  const beyond = canvasTex(1024, 1024, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.62); g.addColorStop(0, '#fff2d8'); g.addColorStop(0.45, '#f0c48c'); g.addColorStop(1, '#a8703f'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  W.beyond = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), new THREE.MeshBasicMaterial({ map: beyond, fog: false, side: THREE.DoubleSide, toneMapped: false }));
  W.beyond.rotation.x = Math.PI / 2; W.beyond.position.set(C.x, 3400, C.z); scene.add(W.beyond);
  return W;
}

// ---------- copied from finished episodes (they keep their own code, so their renders can't change) ----------
let FACE = null;
const clockFace = () => FACE || (FACE = canvasTex(512, 512, (c, w, h) => {
  c.fillStyle = '#fff8e8'; c.beginPath(); c.arc(256, 256, 248, 0, 7); c.fill();
  c.strokeStyle = '#3a2a1a'; c.lineWidth = 10; c.stroke();
  c.fillStyle = '#3a2a1a'; c.font = '700 54px ITTInter, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const R = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; c.fillText(R[i], 256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190); }
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; c.fillRect(256 + Math.cos(a) * 228 - 2, 256 + Math.sin(a) * 228 - 2, 4, 4); }
}));

function makeClock(r, glow = true) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ map: clockFace(), toneMapped: false })); g.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.08, 8, 40), new THREE.MeshStandardMaterial({ color: '#d8a83a', metalness: 0.7, roughness: 0.3, emissive: '#5a3a00', emissiveIntensity: 0.5 })); g.add(rim);
  const hm = new THREE.MeshBasicMaterial({ color: '#1a1410' });
  const hour = new THREE.Group(), min = new THREE.Group(); g.add(hour); g.add(min);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(r * 0.08, r * 0.5, 0.02), hm); hb.position.set(0, r * 0.22, 0.03); hour.add(hb);
  const mb = new THREE.Mesh(new THREE.BoxGeometry(r * 0.05, r * 0.78, 0.02), hm); mb.position.set(0, r * 0.36, 0.05); min.add(mb);
  if (glow) { const gl = glowSprite('#ffd27a', r * 4, 0.35); gl.position.z = -0.1; g.add(gl); }
  return { g, setTime(minutes) { min.rotation.z = -(minutes / 60) * Math.PI * 2; hour.rotation.z = -(minutes / 720) * Math.PI * 2; } };
}

function makeCar(color) {
  const g = new THREE.Group();
  box(5.2, 1.4, 2.6, mat(color), 0, 1.1, 0, g); box(3, 1.2, 2.3, mat(color), -0.3, 2.3, 0, g);
  box(2.9, 1.0, 2.35, new THREE.MeshStandardMaterial({ color: '#9fd2ff', roughness: 0.1 }), -0.3, 2.3, 0, g, false).scale.set(1.02, 0.85, 1.02);
  for (const [x, z] of [[-1.7, 1.2], [1.7, 1.2], [-1.7, -1.2], [1.7, -1.2]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 14), mat('#1a1a1a')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.6, z); g.add(w); }
  return g;
}

function makeBird(r) {
  const g = new THREE.Group(); const m = mat(['#3a3a4a', '#5a4a3a', '#ffffff'][Math.floor(r() * 3)]);
  box(0.8, 0.4, 0.4, m, 0, 0, 0, g, false); box(0.3, 0.3, 0.3, m, 0.5, 0.15, 0, g, false);
  const w1 = new THREE.Group(), w2 = new THREE.Group(); g.add(w1); g.add(w2);
  box(0.4, 0.06, 1.0, m, 0, 0, 0.5, w1, false); box(0.4, 0.06, 1.0, m, 0, 0, -0.5, w2, false);
  return { g, w1, w2 };
}

function makeTrainCar(len) {
  const g = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({ color: '#d8dde6', metalness: 0.85, roughness: 0.25 });
  box(len, 7, 6, silver, 0, 4.5, 0, g); box(len, 0.6, 6.2, mat('#7a8090'), 0, 1.0, 0, g);
  const win = new THREE.MeshBasicMaterial({ color: '#ffe6a8' });
  for (let x = -len / 2 + 3; x < len / 2 - 2; x += 3.2) for (const s of [-1, 1]) box(2.2, 2.0, 0.1, win, x, 5.4, s * 3.06, g, false);
  for (const s of [-1, 1]) box(len, 0.25, 0.1, mat('#6a8aff'), 0, 3.6, s * 3.06, g, false);
  for (const x of [-len / 2 + 3, len / 2 - 3]) for (const z of [-2, 2]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 16), mat('#2a2a30')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.9, z); g.add(w); }
  return g;
}

let STAR_TEX = null;
const starTex = () => STAR_TEX || (STAR_TEX = canvasTex(128, 128, (c, w, h) => {
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(0.3, 'rgba(255,210,90,0.55)'); g.addColorStop(1, 'rgba(255,190,60,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = '#fffbe0'; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? 12 : 30; c.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
  c.closePath(); c.fill();
}));

function makeStar(size, color = '#ffe7a0') {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size); return s;
}

function makeJar() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 20), new THREE.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.35, roughness: 0.05 }));
  g.add(glass);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.2, 20), mat('#c09040', { caustic: false })); lid.position.y = 0.72; g.add(lid);
  for (let i = 0; i < 5; i++) { const s = makeStar(0.55); s.position.set((Math.random() - 0.5) * 0.5, -0.4 + i * 0.18, (Math.random() - 0.5) * 0.5); g.add(s); }
  g.add(glowSprite('#ffd060', 3.2, 0.6));
  return g;
}

function faceTex(kind) {
  return canvasTex(256, 256, (c, w, h) => {
    const ink = '#3a2a4a'; c.lineCap = 'round';
    const eye = (x) => {
      if (kind === 'sleep') { c.strokeStyle = ink; c.lineWidth = 9; c.beginPath(); c.arc(x, 120, 16, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
      else if (kind === 'open' || kind === 'mouth') { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, 112, 26, 32, 0, 0, 7); c.fill(); c.fillStyle = kind === 'mouth' ? '#ff2a5a' : ink; c.beginPath(); c.arc(x, 116, kind === 'mouth' ? 9 : 15, 0, 7); c.fill(); }
      else { c.fillStyle = ink; c.beginPath(); c.ellipse(x, 116, 12, 17, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 4, 110, 4, 0, 7); c.fill(); }
    };
    eye(88); eye(168);
    c.fillStyle = 'rgba(255,120,160,0.45)'; c.beginPath(); c.ellipse(60, 150, 18, 10, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(196, 150, 18, 10, 0, 0, 7); c.fill();
    if (kind === 'eat') { c.fillStyle = ink; c.beginPath(); c.ellipse(128, 168, 22, 26, 0, 0, 7); c.fill(); }
    else if (kind === 'mouth') { c.fillStyle = '#1a0610'; c.beginPath(); c.ellipse(128, 190, 80, 50, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(66 + i * 18, 150); c.lineTo(75 + i * 18, 168); c.lineTo(84 + i * 18, 150); c.fill(); } }
    else if (kind !== 'sleep') { c.strokeStyle = ink; c.lineWidth = 7; c.beginPath(); c.arc(128, 150, 16, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
    else { c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); c.arc(128, 160, 8, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); }
  });
}

let FACES = null;
const cloudFaces = () => FACES || (FACES = { sleep: faceTex('sleep'), happy: faceTex('happy'), eat: faceTex('eat'), open: faceTex('open'), mouth: faceTex('mouth') });
function makeCloud(size, color, seed) {
  const FACES = cloudFaces();
  const r = rng(seed); const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, emissive: color, emissiveIntensity: 0.18, fog: true });
  const geo = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(geo, m); const a = (i / 9) * Math.PI * 2;
    s.position.set(Math.cos(a) * 1.1 * (0.6 + r() * 0.5), (r() - 0.3) * 0.6 + (i % 3 === 0 ? 0.5 : 0), Math.sin(a) * 0.5 * r());
    s.scale.setScalar(0.75 + r() * 0.45); s.castShadow = true; g.add(s);
  }
  const core = new THREE.Mesh(geo, m); core.scale.set(1.4, 1.1, 1.0); g.add(core);
  const face = new THREE.Sprite(new THREE.SpriteMaterial({ map: FACES.happy, transparent: true, toneMapped: false }));
  face.scale.set(1.5, 1.5, 1); face.position.set(0, 0.1, 1.25); g.add(face);
  g.scale.setScalar(size);
  return { g, face, m, setFace(k) { face.material.map = FACES[k]; } };
}

function makeWalkerHouse(r, idx = 0) {
  const legMat = mat('#2b2233', { roughness: 0.5 });
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const tmp = new THREE.Group(); makeHouse(tmp, 0, 0, 0, r, r() > 0.5 ? 2 : 1);
  const hg = new THREE.Group(); mergeGroup(tmp, hg); hg.position.y = 0; body.add(hg);
  const legs = []; const hips = [];
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    legs.push(makeLeg(root, 9.5, 13, 0.5, legMat)); hips.push({ local: v3(s * 6.6, 0.4, -4.5 + k * 3), s, k });
  }
  return { root, body, legs, hips, idx };
}

function updateWalker(wk, pos, yaw, dist, bodyH, stride = 6, lift = 3, reach = 9, folded = 0) {
  wk.root.position.set(0, 0, 0);
  const fwd = v3(Math.sin(yaw), 0, Math.cos(yaw)); const side = v3(fwd.z, 0, -fwd.x);
  const ph = dist / stride;
  const bob = Math.sin(ph * Math.PI * 4) * 0.35 * (1 - folded);
  const h = lerp(bodyH, 0.6, folded) + bob;
  wk.body.position.set(pos.x, h, pos.z); wk.body.rotation.y = yaw;
  wk.body.updateMatrixWorld();
  wk.hips.forEach((hp, i) => {
    const hip = hp.local.clone().applyMatrix4(wk.body.matrixWorld);
    const out = side.clone().multiplyScalar(hp.s);
    const base = hip.clone().add(out.clone().multiplyScalar(reach * (1 - folded * 0.7))).add(fwd.clone().multiplyScalar((hp.k - 1.5) * 1.2)).setY(0);
    const phase = ph + ((hp.k + (hp.s > 0 ? 1 : 0)) % 2) * 0.5;
    const foot = folded > 0.99 ? hip.clone().add(out.clone().multiplyScalar(1.5)).setY(0.3) : footAt(base, fwd, phase, stride * (1 - folded), lift * (1 - folded));
    wk.legs[i].update(hip, foot, out);
  });
}

function makeStillHouse() {
  const g = new THREE.Group();
  const Wd = 15, D = 12, H = 13, T = 0.4; const c = mat('#d9d2e8'), roofM = mat('#4a3a5a');
  wallRects(Wd, H, [{ x0: -1.8, x1: 1.8, y0: 0, y1: 6 }]).forEach((q) => box(q.x1 - q.x0, q.y1 - q.y0, T, c, (q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, D / 2, g));
  box(Wd, H, T, c, 0, H / 2, -D / 2, g); box(T, H, D, c, -Wd / 2, H / 2, 0, g); box(T, H, D, c, Wd / 2, H / 2, 0, g);
  const dark = new THREE.MeshBasicMaterial({ color: '#030205' });
  box(Wd - 1, H - 0.6, D - 1, dark, 0, H / 2, 0, g, false).material.side = THREE.BackSide;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), roofM); roof.geometry.rotateY(Math.PI / 4); roof.geometry.translate(0, 0.5, 0);
  roof.scale.set((Wd + 2) / Math.SQRT2, 7, (D + 2) / Math.SQRT2); roof.position.y = H; roof.castShadow = true; g.add(roof);
  for (const x of [-5, 5]) box(2.6, 2.6, 0.2, new THREE.MeshBasicMaterial({ color: '#1a1420' }), x, 8.5, D / 2 + 0.15, g, false);
  box(5, 0.4, 3, mat('#cfcfd6'), 0, 0.2, D / 2 + 1.5, g);
  const pivot = new THREE.Group(); pivot.position.set(-1.8, 0, D / 2 + 0.05); g.add(pivot);
  box(3.6, 6, 0.3, mat('#5a1f2a'), 1.8, 3, 0, pivot); box(0.3, 0.3, 0.5, mat('#e8c24a'), 3.2, 3, 0.3, pivot);
  const porch = glowSprite('#ffcf80', 6, 0.9); porch.position.set(2.8, 6.8, D / 2 + 0.6); g.add(porch);
  const eye = makeEye(4.2, '#ffb020'); eye.group.position.set(0, 3.6, D / 2 - 4.6); g.add(eye.group);
  const eyeLight = new THREE.PointLight('#ffb040', 0, 60, 1.5); eyeLight.position.set(0, 4, D / 2 + 3); g.add(eyeLight);
  return { g, pivot, eye, eyeLight, doorPos: v3(0, 3, D / 2) };
}

const inGroup = (fn2) => { const g = new THREE.Group(); fn2(g); return g; };

// ---------- Episode 18 ----------
// The town's stone clock tower, 112 studs to the ball. .clock is the clock: .clock.setTime(minutes)
export function makeClockTower() {
  const g = new THREE.Group();
  const b = new Batch(), stone = surf('brick', '#a8957c'), trim = paint('#e6dcc4', { roughness: 0.55 }), dark = paint('#3b3e47', { metalness: 0.4, roughness: 0.5 }), gold = paint('#d9a83a', { metalness: 0.75, roughness: 0.32 });
  b.box(surf('concrete', '#8a8478'), 34, 2.4, 34, 0, 1.2, 0, { r: 0.2 }); b.box(surf('concrete', '#938d80'), 28, 2.4, 28, 0, 3.6, 0, { r: 0.2 });
  b.box(stone, 21, 62, 21, 0, 35, 0, { r: 0.2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(surf('brick', '#8f7c66'), 3.2, 66, 3.2, sx * 10.2, 37, sz * 10.2, { r: 0.2 });
  for (const y of [16, 30, 42, 66]) b.box(trim, 23.4, 1, 23.4, 0, y, 0, { r: 0.14 });
  for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const s = Math.sin(ry), c = Math.cos(ry), at = (u, y, o) => [c * u + s * (10.6 + o), y, -s * u + c * (10.6 + o)];
    for (const y of [10, 23, 36]) for (const u of [-4.4, 4.4]) { b.box(trim, 3.2, 6.6, 0.4, ...at(u, y, 0), { ry, r: 0.08 }); b.box(paint('#2a3a4a', { roughness: 0.2, metalness: 0.3 }), 2.4, 5.8, 0.2, ...at(u, y, 0.2), { ry, r: 0.02 }); b.box(trim, 3.8, 0.34, 0.8, ...at(u, y - 3.5, 0.2), { ry, r: 0.06 }); }
    b.box(dark, 18.6, 18.6, 0.6, ...at(0, 54, 0), { ry, r: 0.1 });
    for (const u of [-5, 0, 5]) b.box(trim, 1.8, 7, 0.5, ...at(u, 72, 0), { ry, r: 0.1 });
  }
  b.box(stone, 22, 13, 22, 0, 73, 0, { r: 0.2 }); b.box(trim, 25, 1.2, 25, 0, 80, 0, { r: 0.18 });
  const roof = new THREE.ConeGeometry(17, 26, 4, 1); roof.rotateY(Math.PI / 4);
  b.add(surf('shingle', '#2a5a58'), roof, 0, 93.4, 0); b.cyl(gold, 0.3, 0.5, 6, 0, 108, 0); b.done(g);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 12), gold); ball.position.y = 111; g.add(ball);
  const ck = makeClock(8.4, false); ck.g.position.set(0, 54, 11.0); g.add(ck.g); g.clock = ck;
  return g;
}

// name -> builder. o.parent, when given, receives the model.
const put = (o, m) => { if (o.parent) o.parent.add(m.isObject3D ? m : m.g || m.root); return m; };
export const BUILD = {
  kit_building: (o) => put(o, building(o)),
  security_cam: (o) => put(o, secCam()),
  home_fridge: (o) => put(o, fridge()),
  dining_chair: (o) => put(o, diningChair(o)),
  dining_table: (o) => put(o, diningTable(o)),
  home_bed: (o) => put(o, bed(o)),
  home_sofa: (o) => put(o, sofa(o)),
  potted_plant: (o) => put(o, plant(o)),
  pc_desk: (o) => put(o, pcDesk(o)),
  selection_box: (o) => put(o, selectionBox(o.w || 4, o.h || 4, o.d || 4, o)),
  modern_house: (o) => put(o, modernHouse(o)),
  kit_skyline: (o) => skyline(o),
  kit_crowd: (o) => crowd(o),
  kit_crate: (o) => put(o, crate(o)),
  kit_barrel: (o) => put(o, barrel(o)),
  kit_lamp: (o) => put(o, lamp(o)),
  kit_sign: (o) => put(o, sign(o.text || 'SIGN', o)),
  package_box: (o) => makeBox(o.parent),
  hero_house: (o) => buildHeroHouse(o.parent, o.x || 0, o.z || 0),
  model_house: (o) => cutaway(buildHeroHouse(o.parent, o.x || 0, o.z || 0)),
  cardboard_sky: (o) => cardboardSky(o.parent, o.centre || v3(0, 300, 0), o.size || 520),
  town: (o) => buildTown(o.parent, o),
  suburban_house: (o) => put(o, inGroup((g) => makeHouse(g, 0, 0, o.facing || 0, rng(o.seed || 1), o.floors || 2))),
  tree: (o) => put(o, inGroup((g) => makeTree(g, 0, 0, rng(o.seed || 1)))),
  car: (o) => put(o, makeCar(o.color || '#c0392b')),
  train_car: (o) => put(o, makeTrainCar(o.length || 24)),
  bird: (o) => put(o, makeBird(rng(o.seed || 1))),
  clock: (o) => put(o, makeClock(o.radius || 2, o.glow !== false)),
  star: (o) => put(o, makeStar(o.size || 2, o.color)),
  star_jar: (o) => put(o, makeJar()),
  living_cloud: (o) => put(o, makeCloud(o.size || 6, o.color || '#ffffff', o.seed || 1)),
  // .walk(pos, yaw, distance walked, body height): call it each frame; the legs follow
  walking_house: (o) => {
    const w = put(o, makeWalkerHouse(rng(o.seed || 1)));
    w.walk = (pos, yaw = 0, dist = 0, bodyH = 13) => updateWalker(w, pos, yaw, dist, bodyH);
    w.walk(o.pos || v3(0, 0, 0));
    return w;
  },
  watching_house: (o) => put(o, makeStillHouse()),
  clock_tower: (o) => put(o, makeClockTower()),
  // a forest tree with real bark and rustling leaves: treeShape's options (h, r0, spread, clumps, cols...), o.parent required.
  // Many trees: treeSet(parent, shapes, list) instances them, and .pose() leans them (see ep18.js)
  forest_tree: (o) => treeSet(o.parent, [treeShape(o)], [{ x: o.x || 0, z: o.z || 0, s: o.s || 1, yaw: o.yaw || 0, shape: 0 }]),
  // the enormous oak with a face in the bark: .glow(0..1) lights it, .group holds it
  hero_oak: (o) => heroOak(o.parent, { pos: o.pos || v3(0, 0, 0) }),
};
