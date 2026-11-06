// Episode 9 — "The Sun Never Sets".
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng, mat, box, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { buildTown, mergeGroup } from '../engine/town.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, DAY } from '../engine/stage.js';
import { canvasTex, glowSprite } from '../engine/props.js';

let ctx, L, EV;
const BULB = v3(330, 760, 420);           // where the "sun" hangs
const SUNDIR = BULB.clone().normalize();
const NOON = P({ ...DAY, sunDir: SUNDIR, sunDisc: 0, top: '#2f86ec', horizon: '#bfe6ff', haze: '#cfeaff', sunI: 2.5, exposure: 0.98, fogNear: 260, fogFar: 900 });
const BLACK = P({ ...NOON, top: '#000004', horizon: '#03040c', haze: '#03040c', stars: 1, sunI: 0.15, hemiI: 0.2, hemiSky: '#20244a', exposure: 1.1, vig: 0.5 });
const ROOM = P({ ...NOON, top: '#2a1e16', horizon: '#3a2a1e', haze: '#3a2a1e', sunI: 2.2, sunColor: '#ffe6b0', hemiSky: '#ffd9a0', hemiGround: '#3a2a20', hemiI: 0.8,
  exposure: 1.0, vig: 0.45, fogNear: 6000, fogFar: 14000 });
const W = {};

function build() {
  W.town = buildTown(ctx.scene, { sign: null, house: false, ground: 1300, seed: 9 });
  const g = new THREE.Group();
  // tallest building with a clock stuck at noon
  const T = v3(-34, 0, -36);
  box(26, 84, 26, mat('#cfd8e6'), T.x, 42, T.z, g);
  for (let y = 6; y < 82; y += 6) for (const s of [-1, 1]) {
    box(26.2, 2.2, 0.4, mat('#7fb6e8', { roughness: 0.2 }), T.x, y, T.z + s * 13.05, g);
    box(0.4, 2.2, 26.2, mat('#7fb6e8', { roughness: 0.2 }), T.x + s * 13.05, y, T.z, g);
  }
  box(27, 1.2, 27, mat('#9aa6b8'), T.x, 84.6, T.z, g);
  for (const s of [-1, 1]) { box(27, 1.6, 0.4, mat('#5a6270'), T.x, 86, T.z + s * 13.3, g); box(0.4, 1.6, 27, mat('#5a6270'), T.x + s * 13.3, 86, T.z, g); }
  box(4, 5, 4, mat('#9aa6b8'), T.x - 8, 87.5, T.z - 8, g);
  mergeGroup(g, ctx.scene);
  W.tower = T;
  const clock = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshBasicMaterial({ map: canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(256, 256, 250, 0, 7); c.fill(); c.lineWidth = 16; c.strokeStyle = '#2a2a3a'; c.stroke();
    c.fillStyle = '#2a2a3a'; c.font = '900 64px ITTInter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; c.fillText(String(i), 256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190); }
    c.lineCap = 'round'; c.lineWidth = 18; c.beginPath(); c.moveTo(256, 256); c.lineTo(256, 96); c.stroke(); c.lineWidth = 24; c.beginPath(); c.moveTo(256, 256); c.lineTo(256, 130); c.stroke();
    c.beginPath(); c.arc(256, 256, 16, 0, 7); c.fill(); }) }));
  clock.position.set(T.x, 70, T.z + 13.3); ctx.scene.add(clock);
  // the bulb ("sun")
  const bulb = new THREE.Group(); bulb.position.copy(BULB); ctx.scene.add(bulb);
  W.glass = new THREE.Mesh(new THREE.SphereGeometry(62, 48, 32), new THREE.MeshBasicMaterial({ color: '#fff6dc', fog: false, transparent: true, opacity: 0.8, depthWrite: false }));
  W.glass.scale.y = 1.15; bulb.add(W.glass);
  W.parts = [];
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(30, 42, 40, 32), new THREE.MeshBasicMaterial({ color: '#fff1cc', fog: false })); neck.position.y = 76; bulb.add(neck); W.parts.push(neck);
  const baseM = new THREE.MeshStandardMaterial({ color: '#b8bcc4', metalness: 0.8, roughness: 0.3, fog: false });
  for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(31, 31, 6, 32), baseM); r.position.y = 100 + i * 7; bulb.add(r); W.parts.push(r); }
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(14, 22, 10, 24), new THREE.MeshStandardMaterial({ color: '#333', fog: false })); tip.position.y = 145; bulb.add(tip); W.parts.push(tip);
  W.fil = new THREE.Mesh(new THREE.TorusKnotGeometry(14, 1.5, 120, 8, 2, 7), new THREE.MeshBasicMaterial({ color: '#ff9a2a', fog: false })); W.fil.position.y = 6; bulb.add(W.fil);
  W.cord = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1, 12), new THREE.MeshStandardMaterial({ color: '#1a1a1a', fog: false }));
  W.cord.scale.y = 1400 - (BULB.y + 150); W.cord.position.y = 150 + W.cord.scale.y / 2; bulb.add(W.cord);
  W.halo = glowSprite('#fff2c8', 900, 0.95); W.halo.material.fog = false; bulb.add(W.halo);
  W.halo2 = glowSprite('#ffffff', 300, 1); W.halo2.material.fog = false; bulb.add(W.halo2);
  W.bulb = bulb;
  // the giant behind the sun (blackout only)
  const giant = makeCharacter({ shirt: '#000', pants: '#000', skin: '#000', hair: '#000', shoes: '#000' });
  const dark = new THREE.MeshBasicMaterial({ color: '#1c1f36', fog: false });
  giant.root.traverse((o) => { if (o.isMesh) o.material = dark; });
  giant.root.scale.setScalar(260); giant.root.position.copy(SUNDIR.clone().multiplyScalar(1500)).setY(-200); giant.root.lookAt(0, -200, 0);
  ctx.scene.add(giant.root); W.giant = giant;
  W.giantEyes = [-1, 1].map((s) => { const e = glowSprite('#ffe9a0', 26, 1); e.material.fog = false; giant.neck.add(e); e.position.set(s * 0.3, 0.75, 0.7); e.scale.setScalar(0.5); return e; });
  // the room around the table (hidden until the reveal)
  const room = new THREE.Group(); ctx.scene.add(room); W.room = room;
  const wood = new THREE.MeshStandardMaterial({ map: canvasTex(1024, 1024, (c, w, h) => { c.fillStyle = '#8a5a36'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, y, w, 4); for (let k = 0; k < 40; k++) { c.fillStyle = 'rgba(60,30,10,0.15)'; c.fillRect(Math.random() * w, y + Math.random() * 60, 80 + Math.random() * 200, 2); } } }), roughness: 0.7 });
  wood.map.wrapS = wood.map.wrapT = THREE.RepeatWrapping; wood.map.repeat.set(4, 4);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3200, 70, 2600), wood); top.position.y = -36; top.receiveShadow = true; room.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(120, 1500, 120, new THREE.MeshStandardMaterial({ color: '#6a4228' }), sx * 1450, -821, sz * 1150, room, false);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), new THREE.MeshStandardMaterial({ color: '#5a3a46' })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1570; room.add(floor);
  const paper = new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#d8c8a0'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 64) { c.fillStyle = '#c4b088'; c.fillRect(x, 0, 24, h); } }), side: THREE.DoubleSide });
  paper.map.wrapS = paper.map.wrapT = THREE.RepeatWrapping; paper.map.repeat.set(12, 4);
  for (const [x, z, ry] of [[0, -5200, 0], [0, 5200, Math.PI], [-5200, 0, Math.PI / 2], [5200, 0, -Math.PI / 2]]) {
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(10400, 3000), paper); wl.position.set(x, -70, z); wl.rotation.y = ry; room.add(wl);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10400, 10400), new THREE.MeshStandardMaterial({ color: '#efe6d8', side: THREE.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 1400; room.add(ceil);
  for (let i = -4; i <= 4; i++) box(10400, 60, 120, new THREE.MeshStandardMaterial({ color: '#8a6040' }), 0, 1370, i * 1100, room, false);
  // scale cues on the table: a mug and a pencil
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(190, 170, 420, 48), new THREE.MeshStandardMaterial({ color: '#d84a4a', roughness: 0.4 })); mug.position.set(980, 210, -760); room.add(mug);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(110, 32, 16, 32), mug.material); handle.position.set(1180, 220, -760); room.add(handle);
  const pencil = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 1400, 6), new THREE.MeshStandardMaterial({ color: '#f2c430' })); pencil.rotation.z = Math.PI / 2; pencil.rotation.y = 0.4; pencil.position.set(-200, 28, 1000); room.add(pencil);
  // the giant hand (blocky)
  const hand = new THREE.Group(); ctx.scene.add(hand); W.hand = hand;
  const skin = new THREE.MeshStandardMaterial({ color: '#f2c8a2', roughness: 0.6, fog: false });
  const palm = new THREE.Mesh(new THREE.BoxGeometry(220, 260, 90), skin); hand.add(palm);
  [-80, -27, 27, 80].forEach((x, i) => { const f = new THREE.Mesh(new THREE.BoxGeometry(48, 200 - Math.abs(i - 1.5) * 25, 70), skin); f.position.set(x, -230 + Math.abs(i - 1.5) * 12, 10); f.rotation.x = 0.25; hand.add(f); });
  const th = new THREE.Mesh(new THREE.BoxGeometry(60, 170, 70), skin); th.position.set(150, -70, 20); th.rotation.z = 0.7; hand.add(th);
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(270, 900, 140), new THREE.MeshStandardMaterial({ color: '#3a6ad8', fog: false })); sleeve.position.y = 560; hand.add(sleeve);
  // Lucas + telescope
  W.lucas = makeCharacter({ skin: '#eec09a', shirt: '#ff8a2a', pocket: '#f07a1a', hood: true, pants: '#2a4f9a', shoes: '#ffffff', hair: '#1a1410', hairStyle: 'short' });
  ctx.scene.add(W.lucas.root);
  const tel = new THREE.Group(); ctx.scene.add(tel); W.tel = tel;
  const tm = mat('#2a2e3a');
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 4.2, 16), tm); tube.rotation.x = Math.PI / 2; tube.position.z = 0.6; const tubeG = new THREE.Group(); tubeG.add(tube); tubeG.position.y = 4.3; tel.add(tubeG); W.tube = tubeG;
  for (let i = 0; i < 3; i++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.6, 6), tm); const a = i * 2.09; lg.position.set(Math.cos(a) * 0.8, 2.1, Math.sin(a) * 0.8); lg.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2); tel.add(lg); }
  // park residents
  W.npcs = [];
  for (let i = 0; i < 6; i++) {
    const c = makeCharacter({ shirt: ['#ff6a6a', '#6ad06a', '#ffb03a', '#c06aff', '#3ad0c0', '#ffffff'][i], pants: '#2a3a5a', hair: ['#1a1a1a', '#6a4126', '#e0b050'][i % 3], hairStyle: i % 2 ? 'short' : 'shoulder', female: i % 2 === 0 });
    c.root.position.set(-10 + i * 4, 0.35, 8 + (i % 2) * 3); c.root.rotation.y = 0.5 - i * 0.2; ctx.scene.add(c.root); W.npcs.push(c);
  }
}

function events() {
  const e = {};
  e.blink1 = L(5).start + 0.35; e.blink2 = L(9).start + 0.5; e.morning = L(12).start - 0.05;
  e.scope = L(14).start + 0.2; e.room = L(17).start + 0.2; e.flicker = L(18).start + 0.3; e.hand = L(19).start;
  e.reveal = L(21).start + 0.4; e.black = ctx.dur - 0.2; return e;
}

const ROOF = () => v3(W.tower.x + 5, 85.2, W.tower.z + 6);
const SHOTS = [
  { name: 'hook', t0: () => 0, t1: () => L(1).start - 0.05, f: (u) => ({ pos: v3(lerp(40, 30, u), lerp(5, 8, u), lerp(80, 66, u)), look: v3(lerp(20, 60, u), lerp(6, 260, easeInOut(u)), lerp(-60, 200, easeInOut(u))), fov: 70 }) },
  { name: 'clock', t0: () => L(1).start - 0.05, t1: () => L(2).start - 0.05, f: (u) => ({ pos: v3(W.tower.x + lerp(2, 0, u), 64, W.tower.z + lerp(48, 40, u)), look: v3(W.tower.x, 70, W.tower.z), fov: 44 }) },
  { name: 'blue-sky', t0: () => L(2).start - 0.05, t1: () => L(3).start - 0.05, f: (u) => ({ pos: v3(10, 3, 30), look: v3(lerp(-40, 20, u), 90, -200), fov: 72 }) },
  { name: 'park', t0: () => L(3).start - 0.05, t1: () => L(4).start - 0.05, f: (u) => ({ pos: v3(lerp(0, 4, u), 5.5, 26), look: v3(0, 4, 8), fov: 58 }) },
  { name: 'lucas', t0: () => L(4).start - 0.05, t1: () => L(5).start - 0.05, f: (u) => ({ pos: v3(64, 4.2, lerp(15, 13, u)), look: v3(60, 5.6, 6), fov: 52 }) },
  { name: 'blink', t0: () => L(5).start - 0.05, t1: () => L(7).start - 0.05, f: (u) => ({ pos: v3(60, 5.2, 6), look: BULB.clone(), fov: lerp(30, 24, u) }) },
  { name: 'imagined', t0: () => L(7).start - 0.05, t1: () => L(8).start - 0.05, f: (u) => ({ pos: v3(60.4, 5.6, lerp(9.6, 9.0, u)), look: v3(60, 5.4, 6), fov: 42 }) },
  { name: 'again', t0: () => L(8).start - 0.05, t1: () => L(10).start - 0.05, f: (u) => ({ pos: v3(lerp(80, 70, u), 3, lerp(40, 30, u)), look: v3(60, 60, -60), fov: 74 }) },
  { name: 'stars-giant', t0: () => L(10).start - 0.05, t1: () => EV.morning, f: (u) => ({ pos: v3(58, 3.5, 10), look: SUNDIR.clone().multiplyScalar(1000).add(v3(0, lerp(-300, -100, easeInOut(u)), 0)), fov: lerp(80, 70, u) }) },
  { name: 'climb', t0: () => EV.morning, t1: () => L(13).start - 0.05, f: (u) => { const a = 0.3 + u * 0.8; const R = ROOF(); return { pos: v3(R.x + Math.cos(a) * 60, lerp(70, 100, u), R.z + Math.sin(a) * 60), look: R, fov: 60 }; } },
  { name: 'telescope', t0: () => L(13).start - 0.05, t1: () => EV.scope, f: (u) => { const R = ROOF(); return { pos: R.clone().add(v3(-4, 3.2, -5)), look: R.clone().add(SUNDIR.clone().multiplyScalar(30)), fov: 62 }; } },
  { name: 'scope-view', t0: () => EV.scope, t1: () => EV.room, f: (u, t) => { const R = ROOF(); const p = R.clone().add(v3(0, 4.3, 1)); return { pos: p, look: BULB.clone().add(v3(0, lerp(-10, 60, smooth(L(16).start, L(17).start, t)), 0)), fov: lerp(17, 13, u) }; } },
  { name: 'ceiling', t0: () => EV.room, t1: () => L(18).start - 0.05, f: (u) => { const R = ROOF(); return { pos: R.clone().add(v3(0, 4.3, 1)), look: BULB.clone().add(v3(0, lerp(150, 640, easeInOut(u)), 0)), fov: lerp(30, 50, u) }; } },
  { name: 'flicker', t0: () => L(18).start - 0.05, t1: () => L(19).start - 0.05, f: (u) => { const R = ROOF(); return { pos: R.clone().add(v3(-14, 3, -16)), look: R.clone().add(v3(14, 18, 16)), fov: 70 }; } },
  { name: 'hand', t0: () => L(19).start - 0.05, t1: () => L(21).start - 0.05, f: (u) => ({ pos: v3(lerp(200, 230, u), lerp(18, 30, u), lerp(380, 420, u)), look: v3(70, lerp(300, 240, u), -60), fov: 70 }) },
  { name: 'reveal', t0: () => L(21).start - 0.05, t1: () => 999, f: (u, t) => { const k = easeInOut(clamp((t - L(21).start + 0.05) / 4.6)); return { pos: v3(lerp(120, 3600, k), lerp(40, 900, k), lerp(180, 3800, k)), look: v3(lerp(60, 0, k), lerp(160, 80, k), lerp(-40, 0, k)), fov: lerp(74, 62, k) }; } },
];

function renderAt(t) {
  const blink1 = t > EV.blink1 && t < EV.blink1 + 0.22;
  const black = t > EV.blink2 && t < EV.morning;
  const roomK = smooth(EV.room, EV.room + 1.2, t);
  let env = NOON;
  if (blink1) env = mixP(NOON, BLACK, 0.85);
  if (black) env = BLACK;
  if (roomK > 0) env = mixP(NOON, ROOM, roomK);
  const fl = t > EV.flicker && t < EV.flicker + 1.4 ? (noise1(t * 30) > 0.1 ? 1 : 0.15) : 1;
  env = { ...env, sunI: env.sunI * fl, hemiI: env.hemiI * (0.5 + 0.5 * fl) };
  applyEnv(ctx, env);
  const lit = !(blink1 || black) && fl > 0.5;
  W.glass.material.color.set(lit ? '#fff6dc' : '#5a564a'); W.fil.material.color.set(lit ? '#ff9a2a' : '#3a2a1a');
  W.halo.visible = lit; W.halo2.visible = lit; W.halo.material.opacity = lerp(0.95, 0.45, roomK);
  W.cord.visible = t > L(16).start; W.parts.forEach((m) => { m.visible = t > EV.scope - 0.1; });
  W.fil.visible = t > EV.scope - 0.1;
  W.giant.root.visible = black && t > L(10).start - 0.4;
  W.room.visible = roomK > 0.01;
  ctx.sky.mesh.visible = roomK < 0.99;
  // hand comes down from above
  const hk = smooth(EV.hand - 0.3, EV.hand + 2.6, t);
  W.hand.visible = hk > 0;
  W.hand.position.set(lerp(120, 70, hk), lerp(1500, 330, easeOut(hk)) + Math.sin(t * 1.5) * 6, lerp(-40, -60, hk)); W.hand.rotation.set(0.15, -0.4, 0.05);
  // Lucas
  const Lc = W.lucas;
  if (t < EV.morning) {
    Lc.root.position.set(60, 0.3, 6); Lc.root.rotation.y = Math.atan2(BULB.x - 60, BULB.z - 6);
    pose(Lc, 'lookUp', t, { amt: 0.6 }); Lc.arms[1].rotation.x = -2.6; Lc.arms[1].rotation.z = 0.5;
    if (t > L(7).start - 0.05 && t < L(8).start) { Lc.root.rotation.y = 0.1; pose(Lc, 'idle', t); Lc.arms[0].rotation.x = -2.4; Lc.arms[1].rotation.x = -2.4; }
    Lc.setFace(t < L(5).start ? 'curious' : t < L(9).start ? 'confused' : 'shock');
  } else {
    const R = ROOF();
    const climb = clamp((t - EV.morning) / 2.4);
    Lc.root.position.set(R.x - 9 + climb * 8.5, 85.2, R.z - 8 + climb * 6.5);
    Lc.root.rotation.y = climb < 1 ? 0.9 : Math.atan2(BULB.x - R.x, BULB.z - R.z);
    pose(Lc, climb < 1 ? 'walk' : t > EV.hand ? 'scared' : 'handsToWindow', t, { amt: 0.4 }); Lc.setFace(t < EV.scope ? 'curious' : t < EV.room ? 'wonder' : 'shock');
  }
  const R = ROOF(); W.tel.position.set(R.x + 0.4, 85.2, R.z + 1.0); W.tel.visible = t > EV.morning;
  W.tube.lookAt(BULB); W.tube.rotation.order = 'YXZ';
  W.npcs.forEach((c, i) => { pose(c, i % 2 ? 'wave' : 'lookUp', t + i, { amt: 0.3 }); c.setFace(['smile', 'wonder', 'smile'][i % 3]); c.root.visible = t < EV.morning; });
  const sh = shotAt(SHOTS, t);
  const scope = sh.name === 'scope-view';
  const shake = sh.name === 'hand' ? 0.35 : sh.name === 'reveal' ? 0.2 * (1 - clamp((t - EV.reveal) / 2)) : 0;
  frame(ctx, t, sh, { shake, flash: Math.max(t < 0.12 ? 1 - t / 0.12 : 0, Math.exp(-Math.max(0, t - EV.blink2) * 5) * (t > EV.blink2 && t < EV.blink2 + 1 ? 0.0 : 0)),
    black: t >= EV.black ? 1 : 0, shadows: true,
    tint: scope ? 'radial-gradient(circle at 50% 42%, rgba(0,0,0,0) 0, rgba(0,0,0,0) 46%, rgba(0,0,0,1) 47.5%)' : null });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep09'); L = ctx.L; EV = events();
  build();
  ['curious', 'confused', 'shock', 'wonder'].forEach((f) => W.lucas.setFace(f));
  return expose(ctx, renderAt, L(19).start + 2.0, EV);
}
