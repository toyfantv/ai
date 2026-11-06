// Episode 14 — "You Can Buy Extra Time".
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng, mat, box, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { buildTown } from '../engine/town.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, DAY } from '../engine/stage.js';
import { canvasTex, glowSprite } from '../engine/props.js';

let ctx, L, EV;
const SUN = P({ ...DAY, exposure: 1.0 });
const WHITE = P({ ...DAY, top: '#ffffff', horizon: '#ffffff', haze: '#f6f4ee', sunDisc: 0, hemiSky: '#ffffff', hemiGround: '#d8d4c8', hemiI: 1.4, sunI: 1.4, exposure: 1.0, vig: 0.2, fogNear: 120, fogFar: 600 });
const W = { clocks: [] };
const SHOP = v3(1200, 0, 1200);
const SW = (x, y, z) => SHOP.clone().add(v3(x, y, z));
const MAXC = { skin: '#eec09a', shirt: '#2a5ad8', collar: '#1a4ab0', pants: '#7a7a82', shoes: '#222222', hair: '#141417', hairStyle: 'short' };

const FACE = canvasTex(512, 512, (c, w, h) => {
  c.fillStyle = '#fff8e8'; c.beginPath(); c.arc(256, 256, 248, 0, 7); c.fill();
  c.strokeStyle = '#3a2a1a'; c.lineWidth = 10; c.stroke();
  c.fillStyle = '#3a2a1a'; c.font = '700 54px ITTInter, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const R = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; c.fillText(R[i], 256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190); }
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; c.fillRect(256 + Math.cos(a) * 228 - 2, 256 + Math.sin(a) * 228 - 2, 4, 4); }
});

function makeClock(r, glow = true) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ map: FACE, toneMapped: false })); g.add(face);
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
  ctx.scene.add(g); return g;
}

function makeBird(r) {
  const g = new THREE.Group(); const m = mat(['#3a3a4a', '#5a4a3a', '#ffffff'][Math.floor(r() * 3)]);
  box(0.8, 0.4, 0.4, m, 0, 0, 0, g, false); box(0.3, 0.3, 0.3, m, 0.5, 0.15, 0, g, false);
  const w1 = new THREE.Group(), w2 = new THREE.Group(); g.add(w1); g.add(w2);
  box(0.4, 0.06, 1.0, m, 0, 0, 0.5, w1, false); box(0.4, 0.06, 1.0, m, 0, 0, -0.5, w2, false);
  ctx.scene.add(g); return { g, w1, w2 };
}

function build() {
  W.town = buildTown(ctx.scene, { sign: null, house: false, seed: 14 });
  const r = rng(41);
  // town clock tower in the square
  box(4, 22, 4, mat('#c8b89a'), 0, 11, -18, null);
  const tower = new THREE.Group(); ctx.scene.add(tower);
  box(4, 22, 4, mat('#c8b89a'), 0, 11, -18, tower); box(5, 1, 5, mat('#8a6a4a'), 0, 22.5, -18, tower);
  W.townClock = makeClock(1.6, false); W.townClock.g.position.set(0, 19.5, -15.95); ctx.scene.add(W.townClock.g);
  // shop interior
  const g = new THREE.Group(); g.position.copy(SHOP); ctx.scene.add(g);
  const wall = mat('#5a3a2a', { caustic: false });
  box(30, 0.2, 24, mat('#7a5232', { caustic: false }), 0, 0.06, 0, g, false); box(30, 0.2, 24, mat('#3a2418', { caustic: false }), 0, 10.1, 0, g, false);
  box(30, 10, 0.3, wall, 0, 5, -12, g, false); box(0.3, 10, 24, wall, -15, 5, 0, g, false); box(0.3, 10, 24, wall, 15, 5, 0, g, false); box(30, 10, 0.3, wall, 0, 5, 12, g, false);
  box(12, 3, 2.4, mat('#8a5a2a', { caustic: false }), 0, 1.5, -5, g, false); box(12.4, 0.3, 2.8, mat('#c8a060', { caustic: false }), 0, 3.15, -5, g, false);
  for (let i = 0; i < 26; i++) {
    const c = makeClock(0.7 + r() * 0.9); const wallSel = i % 3;
    if (wallSel === 0) c.g.position.copy(SW(-13 + (i % 9) * 3.2, 4 + (i % 4) * 1.6, -11.8));
    else if (wallSel === 1) { c.g.position.copy(SW(-14.8, 3.5 + (i % 4) * 1.7, -9 + (i % 7) * 3)); c.g.rotation.y = Math.PI / 2; }
    else { c.g.position.copy(SW(14.8, 3.5 + (i % 4) * 1.7, -9 + (i % 7) * 3)); c.g.rotation.y = -Math.PI / 2; }
    c.ph = r() * 600; c.sp = 1 + r() * 4; ctx.scene.add(c.g); W.clocks.push(c);
  }
  // floating clocks (magic)
  W.floaters = []; for (let i = 0; i < 6; i++) { const c = makeClock(0.5); c.base = SW(-6 + i * 2.4, 6.5 + (i % 2), -2 + (i % 3)); ctx.scene.add(c.g); c.ph = r() * 6; W.floaters.push(c); }
  // grandfather clock with pendulum
  box(2, 7, 1.2, mat('#5a2a1a', { caustic: false }), 9, 3.5, -10.8, g, false);
  W.pend = new THREE.Group(); W.pend.position.copy(SW(9, 5.2, -10.1)); ctx.scene.add(W.pend);
  box(0.12, 2.6, 0.12, mat('#d8a83a', { caustic: false }), 0, -1.3, 0, W.pend, false);
  const bob = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), mat('#e8c060', { caustic: false })); bob.position.y = -2.7; W.pend.add(bob);
  // rule plaque + price sign
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.2), new THREE.MeshBasicMaterial({ map: canvasTex(900, 330, (c, w, h) => { c.fillStyle = '#2a1a10'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d8a83a'; c.lineWidth = 14; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#f2d080'; c.textAlign = 'center'; c.font = '900 64px ITTInter, serif'; c.fillText('NEVER BUY MORE', w / 2, 120); c.fillStyle = '#ff5a4a'; c.fillText('THAN 60 MINUTES', w / 2, 220); }) }));
  plaque.position.copy(SW(-6, 7.4, -11.8)); ctx.scene.add(plaque); W.plaquePos = SW(-6, 7.4, -11.8);
  const price = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.4), new THREE.MeshBasicMaterial({ map: canvasTex(700, 220, (c, w, h) => { c.fillStyle = '#f2e6c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a2a1a'; c.textAlign = 'center'; c.font = '900 76px ITTInter, sans-serif'; c.fillText('$1 = 1 MINUTE', w / 2, 140); }) }));
  price.position.copy(SW(-4, 4.1, -3.75)); price.rotation.x = -0.2; ctx.scene.add(price);
  const warm = new THREE.PointLight('#ffcf8a', 120, 40, 1.2); warm.position.copy(SW(0, 9, 0)); ctx.scene.add(warm);
  // $100 bill
  W.bill = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), new THREE.MeshBasicMaterial({ map: canvasTex(400, 175, (c, w, h) => { c.fillStyle = '#9ad08a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a6a3a'; c.lineWidth = 10; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = '#1a4a2a'; c.font = '900 90px ITTInter, sans-serif'; c.textAlign = 'center'; c.fillText('$100', w / 2, 120); }) }));
  W.bill.rotation.x = -Math.PI / 2; ctx.scene.add(W.bill);
  // shopkeeper + Max + old Max
  W.keeper = makeCharacter({ shirt: '#6a3a6a', pants: '#2a2a33', hair: '#d8d8d8', hairStyle: 'shoulder', female: true, caustic: false, scale: 1.05 }); ctx.scene.add(W.keeper.root);
  W.max = makeCharacter(MAXC); ctx.scene.add(W.max.root);
  W.maxHair = mat(MAXC.hair, { caustic: true });
  W.beard = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.3), mat('#e8e8e8')); W.beard.position.set(0, 0.25, 0.62); W.max.neck.add(W.beard);
  W.old = makeCharacter({ ...MAXC, hair: '#e6e6e6', skin: '#e0b28c' }); ctx.scene.add(W.old.root);
  const ob = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.3), mat('#f0f0f0')); ob.position.set(0, 0.2, 0.62); W.old.neck.add(ob);
  W.big = makeClock(1.8); ctx.scene.add(W.big.g);
  // npcs for the montage
  W.kid = makeCharacter({ shirt: '#ffb03a', pants: '#2a3a5a', hair: '#6a4126', hairStyle: 'short' }); ctx.scene.add(W.kid.root);
  W.runner = makeCharacter({ shirt: '#c06aff', pants: '#2a2a33', hair: '#e0b050', hairStyle: 'shoulder', female: true }); ctx.scene.add(W.runner.root);
  W.desk = new THREE.Group(); ctx.scene.add(W.desk); box(3, 0.25, 1.8, mat('#c09060'), 0, 2.6, 0, W.desk); box(0.25, 2.5, 0.25, mat('#555'), 0, 1.25, 0, W.desk);
  W.paper = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshBasicMaterial({ color: '#ffffff' })); W.paper.rotation.x = -Math.PI / 2; W.paper.position.set(0, 2.75, 0); W.desk.add(W.paper);
  W.kidClock = makeClock(0.6); ctx.scene.add(W.kidClock.g);
  // street: cars + birds
  W.cars = ['#d84a4a', '#3a6ad8', '#f2c430', '#3ad0c0'].map((c, i) => ({ g: makeCar(c), lane: i % 2 ? 3.2 : -3.2, x0: -40 + i * 35, dir: i % 2 ? -1 : 1 }));
  W.birds = []; for (let i = 0; i < 18; i++) { const b = makeBird(r); b.base = v3(40 + r() * 50, 9 + r() * 10, -10 + r() * 20); b.ph = r() * 6; W.birds.push(b); }
}

function events() {
  const e = {};
  e.shopIn = L(5).start - 0.05; e.bill = L(6).start + 1.0; e.stop = L(9).start + 0.5; e.white = L(12).start + 0.4; e.old = L(15).start;
  e.back = L(21).start + 0.3; e.black = ctx.dur - 0.2; return e;
}

const SHOTS = [
  { name: 'hook', t0: () => 0, t1: () => L(1).start - 0.05, f: (u) => ({ pos: SW(lerp(3, 1.5, u), lerp(5.5, 6.2, u), lerp(4, 1.5, u)), look: SW(0, 6, -11), fov: 66 }) },
  { name: 'price', t0: () => L(1).start - 0.05, t1: () => L(2).start - 0.05, f: (u) => ({ pos: SW(lerp(2.2, 1.6, u), 5.4, lerp(4.5, 3.2, u)), look: SW(-2, 4.6, -5), fov: 56 }) },
  { name: 'homework', t0: () => L(2).start - 0.05, t1: () => L(2).start + 1.9, f: (u) => ({ pos: v3(31.5, 5, 2.4), look: v3(30, 3.6, 6.8), fov: 58 }) },
  { name: 'late', t0: () => L(2).start + 1.9, t1: () => L(3).start - 0.05, f: (u) => ({ pos: v3(70, 3.5, 12), look: v3(60, 4, 6), fov: 60 }) },
  { name: 'rule', t0: () => L(3).start - 0.05, t1: () => EV.shopIn, f: (u) => ({ pos: SW(-6, lerp(6.2, 7.2, u), lerp(0, -6.5, easeInOut(u))), look: W.plaquePos, fov: 52 }) },
  { name: 'max-enters', t0: () => EV.shopIn, t1: () => L(6).start - 0.05, f: (u) => ({ pos: SW(3.5, 5.2, -4.5), look: SW(0, 3.6, 4), fov: 62 }) },
  { name: 'bill', t0: () => L(6).start - 0.05, t1: () => L(7).start - 0.05, f: (u) => ({ pos: SW(2.8, lerp(5.0, 4.6, u), -3.0), look: SW(0.2, 3.3, -4.2), fov: 48 }) },
  { name: 'terrified', t0: () => L(7).start - 0.05, t1: () => L(8).start - 0.05, f: (u) => ({ pos: SW(0.4, 5.6, lerp(-2.8, -3.4, u)), look: SW(0, 5.6, -7.2), fov: 44 }) },
  { name: 'insist', t0: () => L(8).start - 0.05, t1: () => L(9).start - 0.05, f: (u) => ({ pos: SW(-0.6, 5.2, -6.6), look: SW(0, 4.6, -2.2), fov: 48 }) },
  { name: 'clocks-stop', t0: () => L(9).start - 0.05, t1: () => L(10).start - 0.05, f: (u, t) => (t < EV.stop + 0.2 ? { pos: SW(0, 6, 4), look: SW(0, 6, -11.8), fov: 62 } : { pos: v3(4, 14, 6), look: v3(0, 19.5, -16), fov: 44 }) },
  { name: 'cars', t0: () => L(10).start - 0.05, t1: () => L(11).start - 0.05, f: (u) => ({ pos: v3(lerp(18, 24, u), 2.8, 10), look: v3(40, 2.5, 0), fov: 58 }) },
  { name: 'birds', t0: () => L(11).start - 0.05, t1: () => L(12).start - 0.05, f: (u) => ({ pos: v3(lerp(50, 62, u), 14, lerp(14, 6, u)), look: v3(lerp(64, 72, u), 15, -2), fov: 60 }) },
  { name: 'white', t0: () => L(12).start - 0.05, t1: () => L(13).start - 0.05, f: (u) => ({ pos: v3(60, 3, 12), look: v3(60, lerp(30, 60, u), -80), fov: 72 }) },
  { name: 'smile', t0: () => L(13).start - 0.05, t1: () => L(15).start - 0.05, f: (u) => ({ pos: v3(60.4, 5.2, lerp(-1.5, -2.2, u)), look: v3(60, 5, -6), fov: 44 }) },
  { name: 'someone', t0: () => L(15).start - 0.05, t1: () => L(16).start - 0.05, f: (u) => ({ pos: v3(58.5, 5.6, -8.5), look: v3(60, 4, 14), fov: 56 }) },
  { name: 'old-man', t0: () => L(16).start - 0.05, t1: () => L(17).start - 0.05, f: (u) => { const o = W.old.root.position; return { pos: o.clone().add(v3(3.5, 4.5, -7)), look: o.clone().add(v3(0, 3.6, 0)), fov: 56 }; } },
  { name: 'twins', t0: () => L(17).start - 0.05, t1: () => L(18).start - 0.05, f: (u) => ({ pos: v3(lerp(75, 73, u), 5.2, -2.4), look: v3(60, 4.8, -2.4), fov: 52 }) },
  { name: 'point', t0: () => L(18).start - 0.05, t1: () => L(21).start - 0.05, f: (u) => { const o = W.old.root.position; return { pos: o.clone().add(v3(-1.6, 6.3, -lerp(5.0, 4.2, u))), look: o.clone().add(v3(0, 4.6, 0)), fov: 52 }; } },
  { name: 'backward', t0: () => L(21).start - 0.05, t1: () => L(22).start - 0.05, f: (u) => ({ pos: W.big.g.position.clone().add(v3(0.3, 0.2, -lerp(4.8, 3.8, u))), look: W.big.g.position, fov: 46 }) },
  { name: 'aging', t0: () => L(22).start - 0.05, t1: () => 999, f: (u, t) => { const k = clamp((t - L(22).start) / 4); return { pos: v3(60.1, 5.4, lerp(-2.2, -2.8, k)), look: v3(60, 5.1, -6), fov: lerp(40, 34, k) }; } },
];

function renderAt(t) {
  const ft = Math.min(t, EV.stop);
  applyEnv(ctx, t < EV.white ? SUN : mixP(SUN, WHITE, smooth(EV.white, EV.white + 1.2, t)));
  // clocks tick until the stop
  W.clocks.forEach((c) => c.setTime(c.ph + ft * c.sp));
  W.floaters.forEach((c, i) => { c.setTime(c.ph * 60 + ft * 8); c.g.position.copy(c.base).add(v3(0, Math.sin(ft * 1.2 + c.ph) * 0.4, 0)); c.g.rotation.y = Math.sin(ft * 0.6 + i) * 0.5; });
  W.pend.rotation.z = Math.sin(ft * 3.2) * 0.35;
  W.townClock.setTime(10 * 60 + 9 + ft / 60);
  // cars + birds
  W.cars.forEach((c) => { const x = c.x0 + c.dir * ft * 9; c.g.position.set(((x + 120) % 240) - 120 + 40, 0, c.lane); c.g.rotation.y = c.dir > 0 ? 0 : Math.PI; });
  W.birds.forEach((b) => { b.g.position.copy(b.base).add(v3(Math.sin(ft * 0.5 + b.ph) * 6, Math.sin(ft * 1.3 + b.ph), Math.cos(ft * 0.4 + b.ph) * 4)); const f = Math.sin(ft * 14 + b.ph) * 0.7; b.w1.rotation.x = f; b.w2.rotation.x = -f; b.g.rotation.y = ft * 0.4 + b.ph; });
  // montage npcs
  W.desk.position.set(30, 0, 6); W.kid.root.position.set(30, 0.6, 7.6); W.kid.root.rotation.y = Math.PI; pose(W.kid, 'sit', t); W.kid.setFace('happy' in {} ? 'smile' : 'smile');
  W.kidClock.g.position.set(30, 6.5 + Math.sin(t * 2) * 0.2, 6.2); W.kidClock.setTime(t * 40);
  const rk = clamp((t - L(2).start - 1.9) / 2); W.runner.root.position.set(lerp(66, 54, rk), 0.3, 6); W.runner.root.rotation.y = -Math.PI / 2; pose(W.runner, 'run', t); W.runner.setFace('worried');
  // shopkeeper
  W.keeper.root.position.copy(SW(0, 0, -7.4)); W.keeper.root.rotation.y = 0; pose(W.keeper, t > L(7).start ? 'scared' : 'idle', t); W.keeper.setFace(t > L(7).start ? 'shock' : 'smile');
  // Max
  const M = W.max; const age = smooth(EV.back + 0.3, ctx.dur - 0.6, t);
  if (t < EV.shopIn) { M.root.visible = false; }
  else if (t < EV.stop) { M.root.visible = true; const k = clamp((t - EV.shopIn) / 2.2); M.root.position.copy(SW(0, 0.16, lerp(6, -2.4, easeOut(k)))); M.root.rotation.y = Math.PI; pose(M, k < 1 ? 'walk' : 'idle', t);
    if (t > EV.bill - 0.6 && t < L(9).start) { M.arms[1].rotation.x = -1.2; } M.setFace(t > L(8).start ? 'curious' : 'neutral'); }
  else { M.root.visible = true; M.root.position.set(60, 0.3, -6); M.root.rotation.y = t > EV.old ? 0 : 0.2; pose(M, t > L(17).start ? 'scared' : 'idle', t);
    M.torso.rotation.x += age * 0.35; M.setFace(t < EV.old ? 'smile' : t < L(21).start ? 'worried' : age > 0.4 ? 'shock' : 'scared'); }
  W.maxHair.color.set('#141417').lerp(new THREE.Color('#e8e8e8'), age);
  W.beard.scale.set(1, Math.max(0.001, age), 1); W.beard.visible = age > 0.02;
  W.bill.visible = t > EV.bill - 0.2 && t < EV.stop + 2; W.bill.position.copy(SW(0.2, 3.32, lerp(-3.6, -4.4, clamp((t - EV.bill) / 0.4))));
  // old Max walks in with the giant clock
  const O = W.old; const ok = clamp((t - EV.old) / 3.2);
  O.root.visible = t > EV.old - 0.1; O.root.position.set(60, 0.3, lerp(26, 1.2, easeOut(ok))); O.root.rotation.y = Math.PI; pose(O, ok < 1 ? 'walk' : 'still', t * 0.7);
  O.torso.rotation.x += 0.3; O.arms[0].rotation.x = -1.2; O.arms[1].rotation.x = t > L(18).start + 0.4 ? -1.7 : -1.2; O.setFace(t > L(19).start ? 'creepy' : 'calm');
  W.big.g.visible = O.root.visible; W.big.g.position.copy(O.root.position).add(v3(0, 2.6, -2.0)); W.big.g.rotation.y = Math.PI;
  W.big.setTime(t < EV.back ? 300 : 300 - (t - EV.back) * 240);
  const sh = shotAt(SHOTS, t);
  const inShop = ['hook', 'price', 'rule', 'max-enters', 'bill', 'terrified', 'insist'].includes(sh.name) || (sh.name === 'clocks-stop' && t < EV.stop + 0.2);
  frame(ctx, t, sh, { shake: t > EV.back ? 0.12 + age * 0.2 : 0, shadows: !inShop, flash: Math.max(t < 0.12 ? 1 - t / 0.12 : 0, Math.exp(-Math.max(0, t - EV.stop) * 5) * (t > EV.stop ? 0.4 : 0), Math.exp(-Math.max(0, t - EV.white) * 2) * (t > EV.white ? 0.5 : 0)),
    flashColor: '#ffffff', black: t >= EV.black ? 1 : 0, tint: t > EV.stop && t < EV.white ? 'linear-gradient(rgba(180,190,210,0.12), rgba(180,190,210,0.12))' : null });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep14'); L = ctx.L; EV = events();
  build();
  return expose(ctx, renderAt, L(17).start + 1.0, EV);
}
