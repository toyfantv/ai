// Episode 15 — "The 3:33 AM Train".
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng, mat, box, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { CAST } from '../engine/cast.js';
import { makeHouse, makeTree, mergeGroup } from '../engine/town.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, NIGHT, DAY } from '../engine/stage.js';
import { canvasTex, glowSprite } from '../engine/props.js';

let ctx, L, EV;
const NITE = P({ ...NIGHT, sunI: 1.1, hemiI: 0.85, exposure: 1.2, top: '#060a26', horizon: '#1a2250', haze: '#121a40', win: 1.5, lamp: 2.6 });
const SPACE = P({ ...NIGHT, top: '#050010', horizon: '#1a0a3a', haze: '#0a0520', stars: 2.0, moon: 0, sunI: 0.6, hemiSky: '#7a6aff', hemiI: 0.8, exposure: 1.2, fogNear: 4000, fogFar: 9000 });
const ALT = P({ ...DAY, top: '#ffb070', horizon: '#ffe0b0', haze: '#ffd8b0', sunColor: '#ffd8a0', sunDir: v3(0.7, 0.25, 0.4), exposure: 1.05, vig: 0.3 });
const W = {};
const GRACE = { ...CAST.grace, caustic: false };
const IN = v3(0, 600, 0);     // carriage interior origin (floor at IN.y)
const IW = (x, y, z) => IN.clone().add(v3(x, y, z));

function makeCar(len) {
  const g = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({ color: '#d8dde6', metalness: 0.85, roughness: 0.25 });
  box(len, 7, 6, silver, 0, 4.5, 0, g); box(len, 0.6, 6.2, mat('#7a8090'), 0, 1.0, 0, g);
  const win = new THREE.MeshBasicMaterial({ color: '#ffe6a8' });
  for (let x = -len / 2 + 3; x < len / 2 - 2; x += 3.2) for (const s of [-1, 1]) box(2.2, 2.0, 0.1, win, x, 5.4, s * 3.06, g, false);
  for (const s of [-1, 1]) box(len, 0.25, 0.1, mat('#6a8aff'), 0, 3.6, s * 3.06, g, false);
  for (const x of [-len / 2 + 3, len / 2 - 3]) for (const z of [-2, 2]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 16), mat('#2a2a30')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.9, z); g.add(w); }
  return g;
}

function build() {
  const r = rng(15);
  // ground, platform, tracks, small town behind the station
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), mat('#3a5a3a')); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ctx.scene.add(ground); W.ground = ground;
  const st = new THREE.Group();
  box(140, 1.2, 10, mat('#b0aaa0'), 0, 0.6, -8, st); box(140, 0.2, 0.6, mat('#f2d03a'), 0, 1.25, -3.4, st);
  for (const z of [1.5, 4.5]) box(900, 0.35, 0.35, mat('#8a8a90'), 0, 0.35, z, st);
  for (let x = -440; x < 440; x += 2.4) box(0.6, 0.2, 5, mat('#5a3a2a'), x, 0.1, 3, st);
  box(30, 8, 8, mat('#c8a07a'), -20, 4, -17, st); box(32, 1, 10, mat('#8a3a3a'), -20, 8.5, -17, st);
  for (let i = 0; i < 10; i++) makeHouse(st, -120 + i * 26, -48, 0, r, r() > 0.5 ? 2 : 1);
  for (let i = 0; i < 16; i++) makeTree(st, -150 + i * 20, -30 + (i % 2) * 6, r);
  box(60, 0.1, 10, mat('#5d626b'), 30, 0.05, -24, st);
  mergeGroup(st, ctx.scene); W.station = ctx.scene.children[ctx.scene.children.length - 1];
  W.stationGroup = st;
  // lamps along the platform
  W.lamps = [];
  for (let x = -40; x <= 40; x += 20) { const p = box(0.3, 7, 0.3, mat('#3a3f4a'), x, 4.7, -11, null); ctx.scene.add(p); const gl = glowSprite('#ffd27a', 7, 0.8); gl.position.set(x, 8.4, -11); ctx.scene.add(gl); const pl = new THREE.PointLight('#ffd27a', 30, 26, 1.4); pl.position.set(x, 8, -10); ctx.scene.add(pl); W.lamps.push(p, gl, pl); }
  // station clock + warning sign + bus stop sign
  W.clockFace = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(256, 256, 244, 0, 7); c.fill(); c.lineWidth = 16; c.strokeStyle = '#1a1a2a'; c.stroke(); c.fillStyle = '#1a1a2a'; c.font = '900 56px ITTInter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; c.fillText(String(i), 256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190); }
    c.lineCap = 'round'; const hand = (a, l, wd) => { c.lineWidth = wd; c.beginPath(); c.moveTo(256, 256); c.lineTo(256 + Math.cos(a) * l, 256 + Math.sin(a) * l); c.stroke(); };
    hand(((3 + 33 / 60) / 12) * Math.PI * 2 - Math.PI / 2, 120, 22); hand((33 / 60) * Math.PI * 2 - Math.PI / 2, 180, 14); c.fillStyle = '#c0121c'; c.beginPath(); c.arc(256, 256, 14, 0, 7); c.fill(); });
  const clk = new THREE.Mesh(new THREE.CircleGeometry(2, 40), new THREE.MeshBasicMaterial({ map: W.clockFace, toneMapped: false })); clk.position.set(-4, 7.6, -12.4); ctx.scene.add(clk); W.clockPos = v3(-4, 7.6, -12.4);
  box(0.3, 6, 0.3, mat('#3a3f4a'), -4, 4.2, -12.6, null).visible = false;
  const warn = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.2), new THREE.MeshBasicMaterial({ map: canvasTex(800, 350, (c, w, h) => { c.fillStyle = '#1a1a22'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ff3a2a'; c.lineWidth = 12; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '900 72px ITTInter, sans-serif'; c.fillText('DO NOT BOARD', w / 2, 140); c.fillStyle = '#ff4a3a'; c.fillText('THE 3:33 TRAIN', w / 2, 250); }) }));
  warn.position.set(14, 5.2, -12.4); ctx.scene.add(warn); W.warnPos = v3(14, 5.2, -12.4);
  // bus
  W.bus = new THREE.Group(); ctx.scene.add(W.bus);
  box(12, 5, 3.4, mat('#f2c430'), 0, 3, 0, W.bus); box(11, 1.6, 3.5, new THREE.MeshBasicMaterial({ color: '#2a3a4a' }), 0, 4.0, 0, W.bus, false);
  for (const s of [-1, 1]) { const tl = glowSprite('#ff2a2a', 2, 1); tl.position.set(-6.1, 1.6, s * 1.3); W.bus.add(tl); }
  // the silver train (3 cars)
  W.train = new THREE.Group(); ctx.scene.add(W.train);
  for (let i = 0; i < 3; i++) { const c = makeCar(30); c.position.x = -i * 31; W.train.add(c); }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 12, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#d8dde6', metalness: 0.85, roughness: 0.25 })); nose.rotation.y = Math.PI / 2; nose.scale.set(1, 1.1, 1.6); nose.position.set(15, 4.5, 0); W.train.add(nose);
  W.head = glowSprite('#fff4d0', 26, 1); W.head.position.set(20, 4.5, 0); W.train.add(W.head);
  W.trainDoor = [box(1.4, 5, 0.2, mat('#b8bec8'), 6.3, 3.5, -3.12, W.train), box(1.4, 5, 0.2, mat('#b8bec8'), 7.7, 3.5, -3.12, W.train)];
  W.doorLight = new THREE.PointLight('#ffe0a0', 0, 18, 1.4); W.doorLight.position.set(7, 4.5, -4); W.train.add(W.doorLight);
  // star streaks for travel
  const N = 1400; W.streak = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: '#dfe6ff', size: 1.4, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  W.streak.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); W.sd = Array.from({ length: N }, () => ({ y: (r() - 0.3) * 400, z: (r() - 0.5) * 800, x0: r() * 2000 }));
  W.streak.frustumCulled = false; ctx.scene.add(W.streak);
  W.neb = [0, 1, 2].map((i) => { const s = glowSprite(['#7a3aff', '#ff3aa0', '#3a8aff'][i], 900, 0.35); s.material.fog = false; ctx.scene.add(s); return s; });
  // carriage interior (high above the world)
  const ig = new THREE.Group(); ig.position.copy(IN); ctx.scene.add(ig);
  const wallM = mat('#e6e2da', { caustic: false });
  box(40, 0.2, 7, mat('#4a4a5a', { caustic: false }), 0, -0.1, 0, ig, false); box(40, 0.2, 7, mat('#f2f0ea', { caustic: false }), 0, 7.1, 0, ig, false);
  for (const s of [-1, 1]) {
    for (let x = -20; x < 20; x += 3.2) { box(1.0, 7, 0.2, wallM, x, 3.5, s * 3.5, ig, false); box(2.2, 2.6, 0.2, wallM, x + 1.6, 1.3, s * 3.5, ig, false); box(2.2, 2.4, 0.2, wallM, x + 1.6, 5.8, s * 3.5, ig, false); }
  }
  box(0.2, 7, 7, wallM, -20, 3.5, 0, ig, false); box(0.2, 7, 7, wallM, 20, 3.5, 0, ig, false);
  W.inDoorL = box(1.4, 4.4, 0.15, mat('#b8bec8', { caustic: false }), -0.7, 2.4, -3.38, ig, false); W.inDoorR = box(1.4, 4.4, 0.15, mat('#b8bec8', { caustic: false }), 0.7, 2.4, -3.38, ig, false);
  for (let x = -16; x <= 16; x += 8) { const l = new THREE.PointLight('#ffe8c0', 22, 14, 1.3); l.position.set(x, 6.6, 0); ig.add(l); }
  W.led = { c: document.createElement('canvas') }; W.led.c.width = 1024; W.led.c.height = 128; W.led.t = new THREE.CanvasTexture(W.led.c);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(8, 1), new THREE.MeshBasicMaterial({ map: W.led.t, toneMapped: false })); led.position.set(0, 6.4, 3.3); led.rotation.y = Math.PI; ig.add(led); W.ledPos = IW(0, 6.4, 3.3);
  // passengers (all Grace)
  W.pass = [];
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1, x = -16 + Math.floor(i / 2) * 6;
    box(2, 1.4, 1.8, mat('#6a3a8a', { caustic: false }), x, 0.9, side * 2.2, ig, false);
    const p = makeCharacter(GRACE); p.root.position.copy(IW(x, 0.2, side * 2.2)); p.root.rotation.y = side > 0 ? Math.PI : 0; ctx.scene.add(p.root); p.ph = i; W.pass.push(p);
  }
  // alternate platform outside the door at arrival
  const alt = new THREE.Group(); alt.position.copy(IW(0, 0, -6)); ctx.scene.add(alt); W.alt = alt;
  box(40, 0.4, 10, mat('#e8dcc8', { caustic: false }), 0, -0.2, -2, alt, false);
  for (let i = 0; i < 6; i++) box(1.2, 3 + (i % 2), 1.2, mat(['#ffb0c0', '#ffd08a'][i % 2], { caustic: false }), -12 + i * 5, 1.6, -6, alt, false);
  W.altLight = new THREE.PointLight('#ffd8a0', 0, 30, 1.2); W.altLight.position.copy(IW(0, 5, -8)); ctx.scene.add(W.altLight);
  // Grace + the other Grace + photograph (rendered family)
  W.grace = makeCharacter(GRACE); ctx.scene.add(W.grace.root);
  W.other = makeCharacter({ ...GRACE, shirt: '#e6c8a8', collar: '#d0b090' }); ctx.scene.add(W.other.root);
  const studio = new THREE.Scene(); studio.background = new THREE.Color('#f6e2c8');
  studio.add(new THREE.HemisphereLight('#fff', '#c8a888', 1.5)); const sl = new THREE.DirectionalLight('#fff', 1.4); sl.position.set(2, 6, 8); studio.add(sl);
  const fam = [makeCharacter({ ...GRACE, shirt: '#e6c8a8' }), makeCharacter({ shirt: '#3a6a4a', pants: '#2a2a33', hair: '#2a1a10', hairStyle: 'short', scale: 1.15, caustic: false }),
    makeCharacter({ shirt: '#c84a6a', pants: '#2a2a44', hair: '#a06030', hairStyle: 'shoulder', female: true, scale: 1.1, caustic: false }), makeCharacter({ shirt: '#4a9ad8', pants: '#2a3a5a', hair: '#a06030', hairStyle: 'short', scale: 0.8, caustic: false })];
  [[0, 0], [-2.6, -0.4], [2.6, -0.4], [1.3, 1.2]].forEach(([x, z], i) => { fam[i].root.position.set(x, 0, z); studio.add(fam[i].root); pose(fam[i], 'idle', 0); fam[i].setFace('smile'); });
  fam[0].arms[0].rotation.z = -0.4; fam[1].arms[1].rotation.z = 0.5;
  const scam = new THREE.PerspectiveCamera(36, 1.3, 0.1, 100); scam.position.set(0, 3.4, 15); scam.lookAt(0, 3.0, 0);
  W.photoRT = new THREE.WebGLRenderTarget(520, 400); W.photoRT.texture.colorSpace = THREE.SRGBColorSpace; W.studio = { studio, scam };
  W.photo = new THREE.Group(); ctx.scene.add(W.photo);
  box(1.9, 1.5, 0.08, mat('#8a5a3a', { caustic: false }), 0, 0, -0.03, W.photo, false);
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.3), new THREE.MeshBasicMaterial({ map: W.photoRT.texture, toneMapped: false })); pm.position.z = 0.02; W.photo.add(pm);
}

function drawLed(t) {
  const c = W.led.c.getContext('2d'); c.fillStyle = '#060606'; c.fillRect(0, 0, 1024, 128);
  c.fillStyle = '#ffae2a'; c.shadowColor = '#ff8a00'; c.shadowBlur = 16; c.font = '900 70px ITTInter, monospace'; c.textBaseline = 'middle';
  const msg = 'FINAL STOP  •  THE LIFE YOU DIDN’T CHOOSE  •  ';
  const w = c.measureText(msg).width; const x = 1024 - ((t * 260) % (w + 1024));
  c.fillText(msg + msg, x, 66); W.led.t.needsUpdate = true;
}

function events() {
  const e = {};
  e.bus = L(3).start; e.arrive = L(4).start; e.stopT = L(6).start + 1.8; e.doors = L(7).start + 0.2; e.board = L(9).start + 0.2; e.move = L(10).start + 0.2;
  e.space = L(11).start + 1.6; e.wake = L(13).start + 0.7; e.ann = L(15).start + 0.4; e.halt = L(17).start + 0.2; e.open2 = L(18).start + 0.3;
  e.black = ctx.dur - 0.2; return e;
}

function trainX(t) {
  if (t < EV.arrive) return -600 + t * 0;         // hidden far down the track (hook uses its own pass)
  if (t < EV.stopT) { const k = easeOut(clamp((t - EV.arrive) / (EV.stopT - EV.arrive))); return lerp(-330, 0, k); }
  if (t < EV.move) return 0;
  return easeIn(clamp((t - EV.move) / 3)) * 400;
}

const SHOTS = [
  { name: 'hook', t0: () => 0, t1: () => L(1).start - 0.05, f: (u) => ({ pos: v3(36, 3.5, 14), look: v3(lerp(-40, 10, u), 5, 3), fov: 60 }) },
  { name: 'tracks', t0: () => L(1).start - 0.05, t1: () => L(2).start - 0.05, f: (u) => ({ pos: v3(lerp(10, 0, u), 2.5, 3), look: v3(-300, 2, 3), fov: 54 }) },
  { name: 'warn', t0: () => L(2).start - 0.05, t1: () => L(3).start - 0.05, f: (u) => ({ pos: W.warnPos.clone().add(v3(lerp(-1, 0, u), -0.6, lerp(7, 5, u))), look: W.warnPos, fov: 48 }) },
  { name: 'bus', t0: () => L(3).start - 0.05, t1: () => L(4).start - 0.05, f: (u) => ({ pos: v3(lerp(33, 34, u), 4.4, -4), look: v3(40, 2.8, -21), fov: 68 }) },
  { name: 'approach', t0: () => L(4).start - 0.05, t1: () => L(5).start - 0.05, f: (u) => ({ pos: v3(6, 3.6, -12.5), look: v3(-60, 4, 3), fov: 58 }) },
  { name: 'clock', t0: () => L(5).start - 0.05, t1: () => L(6).start - 0.05, f: (u) => ({ pos: W.clockPos.clone().add(v3(0.4, -0.6, lerp(6, 4.6, u))), look: W.clockPos, fov: 44 }) },
  { name: 'stops', t0: () => L(6).start - 0.05, t1: () => L(7).start - 0.05, f: (u) => ({ pos: v3(26, 3.5, -10.5), look: v3(-4, 4, 0), fov: 62 }) },
  { name: 'doors', t0: () => L(7).start - 0.05, t1: () => L(8).start - 0.05, f: (u) => ({ pos: v3(9.5, 4.6, lerp(-14, -12, u)), look: v3(7, 4, -3), fov: 54 }) },
  { name: 'asleep', t0: () => L(8).start - 0.05, t1: () => L(9).start - 0.05, f: (u) => ({ pos: IW(lerp(7, 5, u), 5.4, -0.6), look: IW(-12, 2.8, 0.8), fov: 60 }) },
  { name: 'board', t0: () => L(9).start - 0.05, t1: () => L(10).start - 0.05, f: (u) => ({ pos: v3(7.5, 5, -17), look: v3(7, 3.4, -3), fov: 56 }) },
  { name: 'moving', t0: () => L(10).start - 0.05, t1: () => L(11).start - 0.05, f: (u) => ({ pos: v3(-30, 4, -14), look: v3(20, 4, 0), fov: 66 }) },
  { name: 'look-out', t0: () => L(11).start - 0.05, t1: () => EV.space, f: (u) => ({ pos: IW(-2.4, 4.6, 0.8), look: IW(-0.5, 4.2, 6), fov: 60 }) },
  { name: 'stars', t0: () => EV.space, t1: () => L(13).start - 0.05, f: (u, t) => { const tx = W.train.position; return { pos: tx.clone().add(v3(lerp(-20, 30, u), lerp(8, 14, u), 34)), look: tx.clone().add(v3(-20, 3, 0)), fov: 66 }; } },
  { name: 'wake', t0: () => L(13).start - 0.05, t1: () => L(14).start - 0.05, f: (u) => ({ pos: IW(lerp(4, 2, u), 4.8, -1.3), look: IW(-14, 3.6, 1.8), fov: 58 }) },
  { name: 'all-grace', t0: () => L(14).start - 0.05, t1: () => L(15).start - 0.05, f: (u) => { const p = W.pass[4].root.position; return { pos: p.clone().add(v3(0.3, 3.7, lerp(2.9, 2.5, u))), look: p.clone().add(v3(0, 3.3, 0)), fov: 52 }; } },
  { name: 'announce', t0: () => L(15).start - 0.05, t1: () => L(17).start - 0.05, f: (u) => ({ pos: IW(lerp(0.3, 0.1, u), 5.0, lerp(-1.2, -0.4, u)), look: W.ledPos, fov: 46 }) },
  { name: 'halt', t0: () => L(17).start - 0.05, t1: () => L(18).start - 0.05, f: (u) => ({ pos: IW(4, 6.2, 0), look: IW(-14, 3.6, 0), fov: 66 }) },
  { name: 'open2', t0: () => L(18).start - 0.05, t1: () => L(19).start - 0.05, f: (u) => ({ pos: IW(-0.6, 5.4, 2.0), look: IW(0, 3.6, -6), fov: 62 }) },
  { name: 'other', t0: () => L(19).start - 0.05, t1: () => L(20).start - 0.05, f: (u) => ({ pos: IW(0.2, 4.8, lerp(0.8, -0.8, u)), look: IW(0, 4.4, -7.5), fov: 52 }) },
  { name: 'photo', t0: () => L(20).start - 0.05, t1: () => 999, f: (u, t) => { const k = clamp((t - L(20).start) / 3.5); const p = W.photo.getWorldPosition(new THREE.Vector3()); return { pos: p.clone().add(v3(0, 0.25, lerp(4.4, 2.3, easeOut(k)))), look: p, fov: 42 }; } },
];

function renderAt(t) {
  const inSpace = t > EV.space && t < EV.halt;
  const arrived = t > EV.halt;
  let env = NITE; if (t > EV.move + 1.2) env = mixP(NITE, SPACE, smooth(EV.move + 1.2, EV.space, t)); if (arrived) env = mixP(SPACE, ALT, smooth(EV.open2 - 0.2, EV.open2 + 0.8, t));
  applyEnv(ctx, env);
  const worldVis = t < EV.space - 0.3;
  W.stationGroup.visible = false; ctx.scene.children.forEach(() => {});
  W.ground.visible = worldVis; W.lamps.forEach((o) => { o.visible = worldVis; });
  ctx.scene.traverse((o) => { if (o.isMesh && o.geometry && o.userData.station) o.visible = worldVis; });
  // train
  let tx = trainX(t);
  if (t < L(1).start - 0.05) tx = lerp(-160, 40, t / (L(1).start - 0.05));      // hook: glide past
  W.train.position.set(tx, 0, 3);
  if (inSpace || (t > EV.space - 0.3 && t < EV.halt)) W.train.position.set(0, 200, 0);
  const dk = smooth(EV.doors, EV.doors + 0.8, t) * (t < EV.move ? 1 : 1 - smooth(EV.move - 0.6, EV.move, t));
  W.trainDoor[0].position.x = 6.3 - dk * 1.4; W.trainDoor[1].position.x = 7.7 + dk * 1.4; W.doorLight.intensity = dk * 60;
  W.head.material.opacity = 1;
  // streaks + nebula in space
  const pos = W.streak.geometry.attributes.position.array;
  W.sd.forEach((d, i) => { pos[i * 3] = 1000 - ((d.x0 + t * 900) % 2000); pos[i * 3 + 1] = 200 + d.y; pos[i * 3 + 2] = d.z; });
  W.streak.geometry.attributes.position.needsUpdate = true; W.streak.visible = inSpace;
  W.neb.forEach((n, i) => { n.visible = inSpace; n.position.set(-600 + i * 500 - ((t * 80) % 400), 420 + i * 60, -700); });
  // bus leaves
  W.bus.position.set(40 + Math.max(0, t - EV.bus) * 5, 0, -24); W.bus.visible = t > EV.bus - 1 && t < L(4).start + 2;
  // Grace
  const G = W.grace; G.root.visible = true;
  if (t < EV.board) {
    G.root.position.set(t < L(4).start ? 35 : (t > L(7).start - 0.1 ? 4.6 : 7), 1.2, t < L(4).start ? -15 : -9.5); G.root.rotation.y = t < L(4).start ? Math.PI - 0.5 : Math.PI;
    if (t > L(4).start - 0.05 && t < EV.stopT) G.root.rotation.y = -Math.PI / 2;
    pose(G, t < L(4).start ? 'wave' : 'idle', t); G.setFace(t < L(4).start ? 'worried' : t < EV.doors ? 'curious' : 'wonder');
  } else if (t < EV.board + 1.4 && !inSpace) { const k = clamp((t - EV.board) / 1.4); G.root.position.set(7, 1.2, lerp(-9.5, -3.6, k)); G.root.rotation.y = 0; pose(G, 'walk', t); G.setFace('curious'); }
  else { G.root.position.copy(IW(-2.6, 0.2, 1.0)); G.root.rotation.y = t > L(17).start ? Math.PI : 0; pose(G, t > EV.wake ? 'scared' : 'idle', t); G.setFace(t < L(11).start + 0.5 ? 'curious' : t < EV.wake ? 'wonder' : t < L(19).start ? 'scared' : 'shock'); }
  // passengers
  W.pass.forEach((p) => { pose(p, 'sit', t + p.ph); const awake = t > EV.wake; p.neck.rotation.x = awake ? 0 : 0.5; p.setFace(awake ? (t > L(14).start ? 'creepy' : 'neutral') : 'calm'); if (awake) p.neck.rotation.y = 0.0; });
  // interior doors + LED + alt world
  const d2 = smooth(EV.open2, EV.open2 + 0.8, t);
  W.inDoorL.position.x = -0.7 - d2 * 1.4; W.inDoorR.position.x = 0.7 + d2 * 1.4;
  drawLed(t);
  W.alt.visible = arrived; W.altLight.intensity = d2 * 120;
  // the other Grace with the photograph
  const O = W.other; O.root.visible = t > EV.open2 - 0.2;
  O.root.position.copy(IW(0, 0.2, -7.5)); O.root.rotation.y = 0; pose(O, 'still', t); O.arms[0].rotation.x = -1.3; O.arms[1].rotation.x = -1.3; O.setFace('calm');
  W.photo.visible = O.root.visible; W.photo.position.copy(IW(0, 3.1, -6.3)); W.photo.rotation.set(-0.12, 0, 0);
  if (W.photo.visible) { ctx.renderer.setRenderTarget(W.photoRT); ctx.renderer.render(W.studio.studio, W.studio.scam); ctx.renderer.setRenderTarget(null); }
  const sh = shotAt(SHOTS, t);
  const indoor = ['asleep', 'look-out', 'wake', 'all-grace', 'announce', 'halt', 'open2', 'other', 'photo'].includes(sh.name);
  frame(ctx, t, sh, { shake: sh.name === 'moving' || sh.name === 'halt' ? 0.2 : sh.name === 'stars' ? 0.08 : 0, shadows: !indoor && !inSpace,
    flash: Math.max(t < 0.12 ? 1 - t / 0.12 : 0, Math.exp(-Math.max(0, t - EV.open2) * 4) * (t > EV.open2 ? 0.5 : 0)), flashColor: '#fff0d0', black: t >= EV.black ? 1 : 0 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep15'); L = ctx.L; EV = events();
  build();
  // tag station meshes so they can hide when the town disappears
  const before = new Set(); ctx.scene.children.forEach((o) => { if (o.isMesh && o.position.y < 100 && o !== W.ground) o.userData.station = true; });
  return expose(ctx, renderAt, L(12).start + 1.5, EV);
}
