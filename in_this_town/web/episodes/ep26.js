// Episode 26: The Obby That Changed Every Time I Failed. A bright candy-coloured ten-stage obby floating over the clouds. Emma fails,
// and the course changes: the platforms slide, the walls dissolve, and by attempt ten the whole course floats in space. Under the start
// platform: THE LEVEL LEARNS FROM YOU. She waits; the course moves by itself, lasers spin, platforms vanish, the finish runs away.
// Holographic copies of her show the jumps it predicts. She jumps backward instead: the course freezes (bullet time), UNPREDICTABLE
// ACTION DETECTED, a hidden path of light builds under her to a glowing door, and behind it a round room of ~2,000 screens, each a
// player trying to escape. The screens turn toward her, she sits in the control chair, NEW LEVEL DESIGNER SELECTED.
// World: the course from the start pad at the origin down -z; the hidden path and the door at +z; the screen room far away at SR.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DAY, NIGHT } from '../engine/stage.js';
import { Batch, surf, paint } from '../engine/kit.js';
import { dust, sparkles, burst, clouds, atmos } from '../engine/atmos.js';
import { glowSprite } from '../engine/props.js';
import { edgeMat, obbyPlatform as platform, canvasSign, laserCross, controlChair } from '../engine/obby.js';

let ctx, L, EV;
const W = {};
const SR = v3(5000, 0, 0);            // the screen room
const DOOR = v3(0, -1, 38);           // the glowing door at the end of the hidden path
const PATH_Y = -1;
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const jumpAt = (a, b, k, h) => lp3(a, b, k).add(v3(0, 4 * h * k * (1 - k), 0));

// ---- palettes ----
const OBBY = { ...DAY, ...P({ top: '#2b86ff', horizon: '#b4e0ff', haze: '#9fd2ff', sunColor: '#fff4e2', hemiSky: '#cfe8ff', hemiGround: '#9ab8d8' }),
  sunI: 2.7, sunDir: v3(0.45, 0.78, 0.35), sunDisc: 1, hemiI: 1.0, amb: 0.16, envI: 0.95, exposure: 1.0, bloom: 0.08, fogNear: 260, fogFar: 1600,
  saturation: 1.22, contrast: 1.06, bounce: 0.3 };
const SPACE = { ...NIGHT, ...P({ top: '#05041a', horizon: '#120c34', haze: '#0a0820', sunColor: '#f2eeff', hemiSky: '#6a58c0', hemiGround: '#22183a' }),
  sunI: 2.0, sunDir: v3(-0.55, 0.62, 0.4), sunDisc: 0, stars: 1, moon: 0, hemiI: 1.25, amb: 0.24, envI: 0.75, exposure: 1.12, bloom: 0.09,
  fogNear: 2000, fogFar: 6000, win: 0, lamp: 0, saturation: 1.2, contrast: 1.1, bounce: 0.25 };
const ROOM = { ...NIGHT, ...P({ top: '#04050c', horizon: '#070a18', haze: '#05070f', sunColor: '#cfe6ff', hemiSky: '#3a4a8a', hemiGround: '#140e24' }),
  sunI: 0.35, sunDir: v3(0.2, 0.9, 0.3), sunDisc: 0, stars: 0, moon: 0, hemiI: 0.85, amb: 0.2, envI: 0.55, exposure: 1.12, bloom: 0.1,
  fogNear: 400, fogFar: 2000, win: 0, lamp: 0, saturation: 1.18, contrast: 1.08, bounce: 0.2 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return {
    hop: s(1) + 0.15, fail: s(2) + 0.45, moved: s(3) + 0.15, beam: s(4) - 0.15, walls: s(4) + 0.35, slip: e(4) - 0.05,
    space: s(5) + 0.35, sit: s(6) - 0.1, peek: s(7) + 0.4, stand: s(9) - 0.05, auto: s(11) + 0.1, lasers: s(12) - 0.05, vanish: s(13),
    recede: s(14), realize: s(15) + 0.2, ghosts: s(16) - 0.1, smirk: s(18) + 0.4, back: s(19) + 0.2, freeze: s(20) + 0.05,
    detect: s(22) - 0.05, path: s(23) + 0.15, land: s(23) + 0.85, follow: s(24) + 0.05, open: s(24) + 1.0, enter: s(25) - 0.1,
    turn: s(27) + 0.2, sitDown: s(28) - 0.35, rise: s(28) + 0.5, illum: s(28) + 0.2, end: ctx.dur,
  };
}
// course time: everything on the course stops at the freeze
const ct = (t) => Math.min(t, EV.freeze);

// ---- the course ----
const COLS = ['#ff4757', '#ff9f1a', '#ffd32a', '#2ed573', '#18dcff', '#3d7bff', '#a55eea', '#ff5fcf', '#7bed9f'];
// platforms: base layout A, layout B after the first fail; y is the top surface
const PLAT = [
  { k: 'p1', a: [0, 0, -13], b: [-3.2, 0.4, -13.5], w: 5, d: 5, c: 0 },
  { k: 'p2', a: [2.5, 0.6, -21], b: [5.8, 1.4, -22], w: 4.4, d: 4.4, c: 1 },
  { k: 'p3', a: [-2, 1.2, -29], b: [-4.6, 2.3, -30.5], w: 4.4, d: 4.4, c: 2, ry: 0.4 },
  { k: 'cp2', a: [0, 1.2, -38.5], b: [0, 1.2, -38.5], w: 9, d: 8, c: 3, num: 2 },
  { k: 'cp3', a: [0, 1.2, -65], b: [0, 1.2, -65], w: 9, d: 8, c: 4, num: 3 },
  { k: 'p4', a: [4, 2.0, -91], b: [4, 2.0, -91], w: 4, d: 4, c: 7 },
  { k: 'p5', a: [-3, 2.8, -99], b: [-3, 2.8, -99], w: 4, d: 4, c: 8 },
  { k: 'p6', a: [2, 3.6, -107], b: [2, 3.6, -107], w: 4, d: 4, c: 5 },
];
const BEAM = { y: 1.2, z0: -42.5, z1: -59.5 };
const DISC = v3(0, 1.2, -78);

function course() {
  const g = new THREE.Group(); ctx.scene.add(g); W.course = g;
  // the start pad: a spawn pad with a checker top
  const b = new Batch();
  b.box(paint('#eef2f8', { roughness: 0.4 }), 16, 2, 14, 0, -1, 0, { r: 0.3 });
  b.box(paint('#232846', { roughness: 0.5 }), 16.4, 0.5, 14.4, 0, -1.9, 0, { r: 0.2 });
  for (let i = 0; i < 8; i++) for (let j = 0; j < 7; j++) if ((i + j) % 2) b.box(paint('#d6dde8', { roughness: 0.35 }), 2, 0.06, 2, -7 + i * 2, 0.02, -6 + j * 2, { r: 0.02 });
  b.box(paint('#9aa4b4', { roughness: 0.3, metalness: 0.4 }), 5.5, 0.25, 5.5, 0, 0.1, 1.5, { r: 0.1 });   // the spawn plate
  b.done(g);
  const spawn = canvasSign('SPAWN', 5, 5, { bg: '#5d6878', fg: '#ffffff', px: 190, glow: 0.05 }); spawn.rotation.x = -Math.PI / 2; spawn.position.set(0, 0.24, 1.5); g.add(spawn);
  W.startEdge = edgeMat('#ff4757'); for (const [x, z, ww, dd] of [[0, 7, 16, 0.18], [0, -7, 16, 0.18], [8, 0, 0.18, 14], [-8, 0, 0.18, 14]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.18, dd), W.startEdge); m.position.set(x, -0.15, z); g.add(m); }
  // the message underneath, only lit once she looks (in space)
  const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 512; const x = cv.getContext('2d');
  x.fillStyle = '#ff3a6a'; x.font = '900 150px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('THE LEVEL', 1024, 150); x.fillText('LEARNS FROM YOU.', 1024, 350);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  W.msgMat = new THREE.MeshBasicMaterial({ map: tx, transparent: true, color: '#ff8aa8', opacity: 0, depthWrite: false });
  W.msg = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), W.msgMat); W.msg.rotation.y = Math.PI; W.msg.position.set(0, -3.25, -7.32); W.msg.userData.noAO = true; g.add(W.msg);
  { const hb = new Batch(), dk = paint('#151a30', { roughness: 0.5, metalness: 0.3 }); hb.box(dk, 7.2, 2.0, 0.4, 0, -3.25, -7.05, { r: 0.12 }); for (const sx of [-1, 1]) hb.box(paint('#5a6078', { roughness: 0.4, metalness: 0.6 }), 0.14, 0.5, 0.14, sx * 3.0, -2.1, -7.05, { r: 0.04 }); hb.done(g); }
  // a sign: the obby's name
  const sn = canvasSign('10 STAGE\nOBBY', 6, 4, { bg: '#ffd32a', fg: '#1a1a2e', edge: '#ff4757', px: 200, glow: 0.12 }); sn.position.set(9.6, 4.6, -3.5); sn.rotation.y = -0.55; g.add(sn); W.nameSign = sn;
  const pb = new Batch(); pb.cyl(paint('#3d7bff', { roughness: 0.4 }), 0.2, 0.2, 5, 9.6, 0.5, -3.5); pb.box(paint('#3d7bff'), 1.4, 0.4, 1.4, 9.6, -1.8, -3.5); pb.done(g);
  // platforms
  W.plats = PLAT.map((p) => { const m = platform(p.w, p.d, COLS[p.c], { num: p.num }); g.add(m); return { ...p, m }; });
  // the beam with its walls
  const bm = platform(2.4, BEAM.z0 - BEAM.z1, '#ff5fcf', { h: 1.2 }); bm.position.set(0, BEAM.y, (BEAM.z0 + BEAM.z1) / 2); g.add(bm); W.beam = bm;
  W.walls = [];
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
    const wg = new THREE.Group(), col = (i + (sx > 0)) % 2 ? '#3d7bff' : '#a55eea', wb = new Batch();
    wb.box(paint(col, { roughness: 0.35 }), 0.7, 7.5, 4.1, 0, 3.75, 0, { r: 0.15 });
    wb.box(paint('#ffffff', { roughness: 0.3 }), 0.76, 0.35, 4.16, 0, 5.6, 0, { r: 0.08 }); wb.box(paint('#ffffff', { roughness: 0.3 }), 0.76, 0.35, 4.16, 0, 2.0, 0, { r: 0.08 });
    wb.done(wg); wg.position.set(sx * 1.75, BEAM.y - 0.2, BEAM.z0 - 2.1 - i * 4.2); g.add(wg); W.walls.push({ g: wg, i, sx });
  }
  // the spinner disc
  const dg = new THREE.Group(), db = new Batch(); db.add(paint('#a55eea', { roughness: 0.4 }), new THREE.CylinderGeometry(7, 7, 1.6, 48), 0, -0.92, 0);
  db.add(paint('#c79bff', { roughness: 0.3 }), new THREE.CylinderGeometry(6.6, 6.6, 0.26, 48), 0, -0.06, 0); db.cyl(paint('#2a2a3a', { roughness: 0.3, metalness: 0.5 }), 0.7, 0.9, 1.6, 0, 0.8, 0, { seg: 20 });
  db.done(dg); dg.position.copy(DISC); g.add(dg); W.disc = dg;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6.95, 0.1, 6, 64), edgeMat('#a55eea')); ring.rotation.x = Math.PI / 2; ring.position.y = -0.2; dg.add(ring); W.discEdge = ring.material;
  // the day spinner: a striped bar
  W.bar = new THREE.Group(); const bb = new Batch(); bb.box(surf('hazard', '#ffffff'), 12.5, 0.6, 0.6, 0, 0, 0, { r: 0.2 }); bb.done(W.bar); W.bar.position.set(DISC.x, DISC.y + 1.2, DISC.z); g.add(W.bar);
  // the finish: a checker pad, an arch and a flag
  const fg = new THREE.Group(), fb = new Batch();
  fb.box(paint('#ffffff', { roughness: 0.35 }), 11, 1.6, 10, 0, -0.92, 0, { r: 0.25 });
  for (let i = 0; i < 11; i++) for (let j = 0; j < 10; j++) if ((i + j) % 2) fb.box(paint('#1a1a2e', { roughness: 0.4 }), 1, 0.05, 1, -5 + i, 0.02, -4.5 + j, { r: 0.01 });
  for (const sx of [-1, 1]) fb.box(paint('#ffd32a', { roughness: 0.35 }), 0.8, 8, 0.8, sx * 4.6, 4, 0, { r: 0.2 });
  fb.done(fg);
  const fs = canvasSign('FINISH', 10.4, 2.2, { bg: '#ff4757', fg: '#ffffff', edge: '#ffd32a', px: 170, glow: 0.25 }); fs.position.set(0, 8.6, 0.42); fg.add(fs);
  const fs2 = fs.clone(); fs2.rotation.y = Math.PI; fs2.position.z = -0.42; fg.add(fs2);
  const fp = new THREE.Mesh(new THREE.BoxGeometry(10.4, 2.2, 0.7), paint('#ff4757')); fp.position.set(0, 8.6, 0); fg.add(fp);
  W.finish = fg; fg.userData.edge = edgeMat('#ffd32a'); g.add(fg);
  // trophy on the finish pad
  const tr = new Batch(), gold = paint('#ffc93a', { roughness: 0.25, metalness: 0.6 }); tr.cyl(gold, 0.9, 1.1, 0.5, 0, 0.25, -2); tr.cyl(gold, 0.25, 0.3, 1.2, 0, 1.1, -2); tr.add(gold, new THREE.SphereGeometry(1.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0, 2.6, -2, 0, Math.PI); tr.done(fg);
  // scenery: other obby stages floating round the course, trusses and coins
  const r = rng(26), deco = new Batch();
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1, x = side * (22 + r() * 60), z = 10 - r() * 170, y = -18 + r() * 40, w = 3 + r() * 6;
    const col = COLS[Math.floor(r() * COLS.length)];
    deco.box(paint(col, { roughness: 0.4 }), w, 1.4, 2 + r() * 5, x, y, z, { r: 0.25, ry: r() * 2 });
    if (r() < 0.25) deco.box(paint('#ffffff', { roughness: 0.4 }), 0.5, 4 + r() * 6, 0.5, x, y + 3, z, { r: 0.1 });
  }
  for (let i = 0; i < 8; i++) { const x = (i % 2 ? 1 : -1) * (12 + r() * 10), z = -20 - i * 18, y = -6 + r() * 6; for (let k = 0; k < 6; k++) deco.box(paint('#9aa4b4', { roughness: 0.35, metalness: 0.4 }), 1.6, 0.18, 0.18, x, y + k * 1.1, z, { r: 0.05 }); for (const sx of [-0.75, 0.75]) deco.box(paint('#9aa4b4', { roughness: 0.35, metalness: 0.4 }), 0.18, 6.4, 0.18, x + sx, y + 2.8, z, { r: 0.05 }); }
  W.deco = deco.done(new THREE.Group()); g.add(W.deco);
  // coins over the gaps
  W.coins = []; const coinM = paint('#ffc93a', { roughness: 0.25, metalness: 0.7, emissive: '#5a3a00', emissiveIntensity: 0.3 });
  for (const [x, y, z] of [[1.2, 3.4, -17], [0.3, 4.0, -25], [-1, 4.4, -33.5], [2, 4.6, -86], [0.5, 5.4, -95], [-0.5, 6.2, -103]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 24), coinM); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); g.add(m); W.coins.push(m);
  }
  // kill bricks: red strips on the checkpoints' far side
  W.kill = []; const killM = new THREE.MeshStandardMaterial({ color: '#ff2a3a', emissive: '#ff1a2a', emissiveIntensity: 0.45, roughness: 0.4 });
  for (const z of [-70.8]) { const m = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 0.9), killM); m.position.set(0, 1.25, z); g.add(m); W.kill.push(m); }
}

function lasers() {
  W.lasers = [];
  const a = laserCross(2, 6.6); a.position.set(DISC.x, DISC.y + 1.3, DISC.z); a.rotation.x = -Math.PI / 2; W.course.add(a); W.lasers.push({ g: a, sp: 1.6 });
  const b2 = laserCross(2, 5.2); b2.position.set(0, BEAM.y + 3.2, -50.5); W.course.add(b2); W.lasers.push({ g: b2, sp: -1.25 });
  const c = laserCross(3, 6.0); c.position.set(0.5, 6.6, -99); W.course.add(c); W.lasers.push({ g: c, sp: 1.1 });
  const d = laserCross(2, 4.6); d.position.set(-1.5, 4.6, -25); W.course.add(d); W.lasers.push({ g: d, sp: -1.5 });
}

// ---- space: stars, a ringed planet, nebulae ----
function space() {
  const g = new THREE.Group(); ctx.scene.add(g); W.space = g;
  const r = rng(9), n = 5000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), cc = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), R = 2600;
    pos[i * 3] = Math.cos(a) * s * R; pos[i * 3 + 1] = u * R; pos[i * 3 + 2] = Math.sin(a) * s * R;
    cc.set(['#ffffff', '#cfe0ff', '#ffe6c8', '#e0d0ff'][i % 4]).multiplyScalar(0.5 + r() * 0.6); col.set([cc.r, cc.g, cc.b], i * 3);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  W.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, depthWrite: false }));
  W.stars.userData.noAO = true; W.stars.frustumCulled = false; g.add(W.stars);
  // the planet: banded, lit by the key; its ring
  const pc = document.createElement('canvas'); pc.width = 1024; pc.height = 512; const x = pc.getContext('2d');
  const bands = ['#5a2a8a', '#8a3aa0', '#d0609a', '#ff9a6a', '#ffc98a', '#c0508a', '#6a2a90', '#3a2070'];
  for (let i = 0; i < 64; i++) { x.fillStyle = bands[Math.floor((Math.sin(i * 0.7) * 0.5 + 0.5) * bands.length) % bands.length]; x.globalAlpha = 0.85; x.fillRect(0, i * 8, 1024, 9); }
  x.globalAlpha = 1; for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.08})`; x.fillRect(r() * 1024, r() * 512, 40 + r() * 160, 2 + r() * 4); }
  const ptx = new THREE.CanvasTexture(pc); ptx.colorSpace = THREE.SRGBColorSpace;
  const planet = new THREE.Mesh(new THREE.SphereGeometry(260, 64, 32), new THREE.MeshStandardMaterial({ map: ptx, roughness: 0.9, emissive: '#2a1040', emissiveIntensity: 0.35, fog: false }));
  planet.position.set(-820, 180, -1500); planet.rotation.z = 0.35; g.add(planet); W.planet = planet;
  const rc = document.createElement('canvas'); rc.width = 512; rc.height = 8; const rx = rc.getContext('2d');
  for (let i = 0; i < 512; i++) { rx.fillStyle = `rgba(${220 - i * 0.1},${190 - i * 0.2},${255},${(0.25 + 0.5 * Math.abs(Math.sin(i * 0.09))) * (i > 40 && i < 490 ? 1 : 0)})`; rx.fillRect(i, 0, 1, 8); }
  const rt = new THREE.CanvasTexture(rc); rt.colorSpace = THREE.SRGBColorSpace;
  const rg = new THREE.RingGeometry(330, 560, 128, 1), uv = rg.attributes.uv, p = rg.attributes.position;
  for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i), p.getY(i)); uv.setXY(i, (d - 330) / 230, 0.5); }
  const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ map: rt, transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false, opacity: 0.85 }));
  ring.position.copy(planet.position); ring.rotation.set(-1.25, 0.2, 0.35); g.add(ring);
  // a small moon
  const moon = new THREE.Mesh(new THREE.SphereGeometry(45, 32, 16), new THREE.MeshStandardMaterial({ color: '#b8c4e8', roughness: 1, fog: false })); moon.position.set(700, 420, -1300); g.add(moon);
  // nebulae
  const neb = (c1, c2) => { const c = document.createElement('canvas'); c.width = c.height = 256; const k = c.getContext('2d'); const gr = k.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, c1); gr.addColorStop(0.45, c2); gr.addColorStop(1, 'rgba(0,0,0,0)'); k.fillStyle = gr; k.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  for (const [px, py, pz, s, c1, c2, o] of [[600, 300, -1900, 1400, 'rgba(120,60,255,0.6)', 'rgba(60,20,140,0.3)', 0.45], [-1500, -200, -900, 1600, 'rgba(255,60,160,0.5)', 'rgba(120,20,90,0.25)', 0.35],
    [1400, -500, 400, 1500, 'rgba(40,160,255,0.5)', 'rgba(20,60,140,0.25)', 0.35], [-400, 900, 1600, 1500, 'rgba(255,120,80,0.4)', 'rgba(120,40,40,0.2)', 0.3], [0, -1200, -600, 1800, 'rgba(90,40,200,0.5)', 'rgba(30,10,80,0.25)', 0.4]]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: neb(c1, c2), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sp.position.set(px, py, pz); sp.scale.setScalar(s); sp.userData.noAO = true; g.add(sp);
  }
  // drifting asteroids far out
  const am = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#6a6280', roughness: 1, flatShading: true }), 60), M = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < 60; i++) { const a = r() * Math.PI * 2, d = 160 + r() * 260; M.compose(v3(Math.cos(a) * d, -60 + r() * 140, Math.sin(a) * d - 60), q.setFromEuler(new THREE.Euler(r() * 6, r() * 6, 0)), v3(1, 1, 1).multiplyScalar(2 + r() * 9)); am.setMatrixAt(i, M); }
  g.add(am);
}

// ---- the hidden path and the door ----
function pathAndDoor() {
  const g = new THREE.Group(); ctx.scene.add(g); W.pathG = g;
  W.tiles = []; const tm = new THREE.MeshStandardMaterial({ color: '#dff8ff', emissive: '#5ad8ff', emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.1 });
  const em = new THREE.MeshBasicMaterial({ color: '#8ff0ff' }), r = rng(31);
  for (let i = 0; i < 13; i++) {
    const tg = new THREE.Group(), z = 9.6 + i * 2.35;
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 2.2), tm); b.position.y = -0.2; b.castShadow = b.receiveShadow = true; tg.add(b);
    for (const [x, zz, w, d] of [[0, 1.12, 2.6, 0.08], [0, -1.12, 2.6, 0.08], [1.32, 0, 0.08, 2.2], [-1.32, 0, 0.08, 2.2]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), em); m.position.set(x, 0.01, zz); tg.add(m); }
    tg.position.set(0, PATH_Y, z); g.add(tg);
    W.tiles.push({ g: tg, home: v3(0, PATH_Y, z), from: v3((r() - 0.5) * 30, PATH_Y - 10 - r() * 14, z + (r() - 0.5) * 16), spin: (r() - 0.5) * 6, d: i * 0.07 });
  }
  // the door: a frame of light on a floating slab
  const dg = new THREE.Group(); dg.position.copy(DOOR); g.add(dg); W.doorG = dg;
  const b = new Batch(); b.box(paint('#1c2240', { roughness: 0.35, metalness: 0.4 }), 9, 0.6, 6, 0, -0.3, 1.4, { r: 0.15 });
  for (const sx of [-1, 1]) b.box(paint('#2a3060', { roughness: 0.3, metalness: 0.5 }), 1.0, 9.5, 1.0, sx * 2.8, 4.75, 0, { r: 0.18 });
  b.box(paint('#2a3060', { roughness: 0.3, metalness: 0.5 }), 6.6, 1.0, 1.0, 0, 9.5, 0, { r: 0.18 }); b.done(dg);
  const fm = new THREE.MeshBasicMaterial({ color: '#9ff4ff' });
  for (const [x, y, w, h] of [[-2.25, 4.5, 0.12, 9], [2.25, 4.5, 0.12, 9], [0, 9.0, 4.6, 0.12]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), fm); m.position.set(x, y, -0.52); dg.add(m); }
  W.doorLight = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 8.9), new THREE.MeshBasicMaterial({ color: '#bff6ff' })); W.doorLight.position.set(0, 4.5, 0.05); dg.add(W.doorLight);
  W.leaves = [-1, 1].map((sx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8.9, 0.3), new THREE.MeshStandardMaterial({ color: '#3a4280', roughness: 0.3, metalness: 0.6, emissive: '#1a2a6a', emissiveIntensity: 0.4 })); m.position.set(sx * 1.1, 4.5, -0.1); dg.add(m); return { m, sx }; });
  W.doorPt = new THREE.PointLight('#9fefff', 0, 26, 1.6); W.doorPt.position.set(0, 4.5, -3); dg.add(W.doorPt);
  dg.rotation.y = 0;   // its face toward -z, where she comes from
  dg.scale.z = -1;
}

// ---- the screen room ----
const TILES = 16;
function tileTex(k) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160; const x = c.getContext('2d'), r = rng(100 + k);
  const skies = [['#5ab8ff', '#cfefff'], ['#160a3a', '#4a2a8a'], ['#ff8a5a', '#ffd9a0'], ['#0a3a2a', '#2a8a5a'], ['#2a0a1a', '#8a1a3a'], ['#3a8aff', '#a0e0ff']];
  const sk = skies[k % skies.length], gr = x.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, sk[0]); gr.addColorStop(1, sk[1]); x.fillStyle = gr; x.fillRect(0, 0, 256, 160);
  if (k % 6 === 1 || k % 6 === 4) for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(r() * 256, r() * 120, 2, 2); }
  // lava or void below
  x.fillStyle = k % 3 === 0 ? '#ff4a2a' : k % 3 === 1 ? '#1a0a2a' : '#2a9aff'; x.fillRect(0, 138, 256, 22);
  // platforms
  for (let i = 0; i < 5; i++) { x.fillStyle = COLS[(k + i * 3) % COLS.length]; const px = 10 + i * 50 + r() * 10, py = 70 + r() * 50; x.fillRect(px, py, 30 + r() * 14, 9); }
  // a laser, a wall or a door
  const kind = k % 4;
  if (kind === 0) { x.strokeStyle = '#ff3355'; x.lineWidth = 3; x.beginPath(); x.moveTo(120 + 50 * Math.cos(k), 80 + 50 * Math.sin(k)); x.lineTo(120 - 50 * Math.cos(k), 80 - 50 * Math.sin(k)); x.stroke(); }
  if (kind === 1) { x.fillStyle = '#8a5aff'; x.fillRect(150, 30, 16, 100); }
  if (kind === 2) { x.fillStyle = '#ffffff'; x.fillRect(208, 70, 30, 48); x.fillStyle = '#1a1a2e'; x.font = '900 12px ITTInter'; x.fillText('EXIT', 210, 64); }
  // the player: a blocky figure, mid-jump, falling or pushing on a wall
  const sh = ['#ff4757', '#2ed573', '#3d7bff', '#ffd32a', '#ff5fcf', '#18dcff', '#ffffff', '#ff9f1a'][k % 8], px = 60 + r() * 110, py = kind === 3 ? 100 : 50 + r() * 30;
  x.save(); x.translate(px, py); x.rotate(kind === 3 ? 0.9 : (r() - 0.5) * 0.4);
  x.fillStyle = '#3a3a4a'; x.fillRect(-7, 12, 6, 16); x.fillRect(1, 12, 6, 16); x.fillStyle = sh; x.fillRect(-8, -4, 16, 17); x.fillRect(-13, -4, 5, 14); x.fillRect(8, -4, 5, 14);
  x.fillStyle = '#f2c79a'; x.fillRect(-6, -16, 12, 12); x.fillStyle = '#1a1a2e'; x.fillRect(-3, -12, 2, 2); x.fillRect(2, -12, 2, 2); x.restore();
  // the HUD of their game
  const names = ['Pixel_Max', 'xXNoobSlayerXx', 'luna_09', 'BuilderBob22', 'ToyFanTV', 'kaykay_2012', 'Obby_King', 'StarJumper', 'mochi_bun', 'Zane_RBX', 'coolkid5050', 'RileyPlays', 'Neo_Guest', 'blox_bea', 'TheRealDev', 'jumpman77'];
  x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 0, 256, 22); x.fillStyle = '#ffffff'; x.font = '700 14px ITTInter, sans-serif'; x.fillText(names[k], 6, 16);
  x.fillStyle = '#ff6a6a'; x.textAlign = 'right'; x.fillText(`ATTEMPT ${17 + Math.floor(r() * 900)}`, 250, 16);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function room() {
  const g = new THREE.Group(); g.position.copy(SR); ctx.scene.add(g); W.room = g;
  const b = new Batch();
  // floor: dark polished panels with cyan lines, a stepped dais in the middle
  b.add(paint('#0e1220', { roughness: 0.28, metalness: 0.5 }), new THREE.CylinderGeometry(40, 40, 0.4, 72), 0, -0.2, 0);
  b.add(paint('#161c30', { roughness: 0.3, metalness: 0.5 }), new THREE.CylinderGeometry(7, 7.4, 0.5, 48), 0, 0.25, 0);
  b.add(paint('#1c2440', { roughness: 0.3, metalness: 0.5 }), new THREE.CylinderGeometry(4.6, 4.8, 0.4, 40), 0, 0.7, 0);
  // the wall behind the screens and the ceiling ring
  b.add(new THREE.MeshStandardMaterial({ color: '#0a0d18', roughness: 0.8, side: THREE.BackSide }), new THREE.CylinderGeometry(46, 40, 70, 64, 1, true), 0, 35, 0);
  b.add(paint('#0c1020', { roughness: 0.6 }), new THREE.CylinderGeometry(46, 46, 0.6, 64), 0, 70, 0);
  // catwalk ring
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; b.box(paint('#1e2438', { roughness: 0.4, metalness: 0.5 }), 3.4, 0.2, 2.6, Math.cos(a) * 21.5, 0.1, Math.sin(a) * 21.5, { r: 0.05, ry: -a }); }
  b.done(g);
  const glow = new THREE.MeshBasicMaterial({ color: '#4ad8ff' });
  for (const [rad, y] of [[7.25, 0.52], [4.75, 0.92], [12, 0.02], [20, 0.02], [30, 0.02]]) { const m = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.05, 4, 96), glow); m.rotation.x = Math.PI / 2; m.position.y = y; g.add(m); }
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 22), glow); m.position.set(Math.cos(a) * 19, 0.03, Math.sin(a) * 19); m.rotation.y = -a + Math.PI / 2; g.add(m); }
  // the screens: ~2,000, in tiers; each a tile of a player trying to escape
  const cols = 64, rows = 30, list = [], r = rng(61);
  for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) {
    const a = (c + (row % 2) * 0.5) / cols * Math.PI * 2, rad = 25 + row * 0.42, y = 2.4 + row * 1.85;
    if (Math.abs(Math.sin(a / 2 - Math.PI / 4 * 0)) < 0 && row < 6) continue;
    const doorGap = Math.abs(((a - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.16 && row < 6;   // the doorway at +z
    if (doorGap) continue;
    list.push({ p: v3(Math.cos(a) * rad, y, Math.sin(a) * rad), a, row, tile: Math.floor(r() * TILES), yaw0: (r() - 0.5) * 1.9, pitch0: (r() - 0.5) * 0.8, roll0: (r() - 0.5) * 0.3, ph: r() });
  }
  W.screens = list;
  const geo = new THREE.PlaneGeometry(2.3, 1.44), bez = new THREE.BoxGeometry(2.5, 1.62, 0.14);
  W.scrMesh = []; for (let k = 0; k < TILES; k++) {
    const mine = list.filter((s) => s.tile === k), m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: tileTex(k), toneMapped: true }), mine.length);
    m.userData.list = mine; m.userData.noAO = true; m.frustumCulled = false; g.add(m); W.scrMesh.push(m);
  }
  W.bezel = new THREE.InstancedMesh(bez, new THREE.MeshStandardMaterial({ color: '#1a1e2c', roughness: 0.35, metalness: 0.6 }), list.length); W.bezel.frustumCulled = false; g.add(W.bezel);
  // the doorway (light at +z)
  const dl = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 8.9), new THREE.MeshBasicMaterial({ color: '#bff6ff' })); dl.position.set(0, 4.45, 25.2); dl.rotation.y = Math.PI; g.add(dl);
  for (const [x, y, w, h] of [[-2.3, 4.5, 0.14, 9.1], [2.3, 4.5, 0.14, 9.1], [0, 9.05, 4.7, 0.14]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.2), new THREE.MeshBasicMaterial({ color: '#9ff4ff' })); m.position.set(x, y, 25.1); g.add(m); }
  // the control chair on a pedestal (engine/obby.js)
  const ch = controlChair(); g.add(ch); W.chair = ch; ch.position.set(0, 0.9, 0); W.holo = ch.holo; W.chairSeatY = ch.seatY;
  // lights: screen glow from the walls, cyan and magenta
  W.roomLights = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3, l = new THREE.PointLight(i % 2 ? '#ff5adf' : '#4adfff', 30, 40, 1.4); l.position.set(Math.cos(a) * 16, 9, Math.sin(a) * 16); g.add(l); W.roomLights.push(l); }
}
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Qb = new THREE.Quaternion(), E = new THREE.Euler(), S1 = v3(1, 1, 1), CO = new THREE.Color(), OBJ = new THREE.Object3D();
function updateScreens(t, focus) {
  const e = EV, counts = new Array(TILES).fill(0);
  W.screens.forEach((s, i) => {
    // their own random facing, swinging gently; after the turn, each faces her
    const sw = Math.sin(t * 0.4 + s.ph * 9) * 0.05;
    OBJ.position.copy(s.p); OBJ.lookAt(0, s.p.y * 0.55, 0); OBJ.rotateY(s.yaw0 + sw); OBJ.rotateX(s.pitch0); OBJ.rotateZ(s.roll0); Q.copy(OBJ.quaternion);
    const delay = (1 - Math.cos(s.a - Math.PI / 2)) * 0.35 + s.row * 0.022 + s.ph * 0.15, k = easeInOut(smooth(e.turn + delay, e.turn + delay + 0.7, t));
    if (k > 0) { OBJ.position.copy(s.p); OBJ.lookAt(focus); Qb.copy(OBJ.quaternion); Q.slerp(Qb, k); }
    const ill = smooth(e.illum + s.row * 0.06 + s.ph * 0.3, e.illum + s.row * 0.06 + s.ph * 0.3 + 0.35, t);
    const flick = 0.92 + 0.08 * Math.sin(t * 7 + s.ph * 40);
    const br = (0.55 + 0.2 * k + 0.45 * ill) * flick;
    M4.compose(s.p, Q, S1);
    const m = W.scrMesh[s.tile], j = counts[s.tile]++;
    m.setMatrixAt(j, M4); m.setColorAt(j, CO.setRGB(br, br, br * (1 + 0.1 * ill)));
    OBJ.position.copy(s.p); OBJ.quaternion.copy(Q); OBJ.translateZ(-0.09); OBJ.updateMatrix(); W.bezel.setMatrixAt(i, OBJ.matrix);
  });
  W.scrMesh.forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  W.bezel.instanceMatrix.needsUpdate = true;
}

// ---- people ----
function people() {
  W.emma = makeCharacter({ avatar: 'farm_emma_obby', alti: true, skin: '#f2c79a', caustic: false }); ctx.scene.add(W.emma.root);
  softFace(W.emma);
  // holographic copies: the jumps the course predicts
  const gm = new THREE.MeshStandardMaterial({ color: '#8fefff', emissive: '#3ad0ff', emissiveIntensity: 0.8, transparent: true, opacity: 0.32, depthWrite: false, roughness: 0.4 });
  W.ghosts = [0, 1, 2].map(() => { const c = makeCharacter({ avatar: 'farm_emma_obby', alti: true, skin: '#f2c79a', caustic: false }); c.setFace('lash:neutral'); c.root.traverse((o) => { if (o.isMesh) { o.material = gm; o.castShadow = false; o.userData.noAO = true; } }); ctx.scene.add(c.root); return c; });
  // the predicted arcs: dotted lines
  W.dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#8ff0ff', transparent: true, opacity: 0.85 }), 3 * 22); W.dots.userData.noAO = true; W.dots.frustumCulled = false; ctx.scene.add(W.dots);
}
// keep her face from washing out under the key: the face sheet a touch less emissive
function softFace(ch) { const m = ch.faceSheet.material; m.emissiveIntensity *= 0.6; ch.head.children.forEach((k) => { if (k.isMesh && k !== ch.faceSheet && k.material.emissive && !k.material.map && k.material.emissiveIntensity > 0) k.material.emissiveIntensity *= 0.7; }); }

// ---- lights ----
function rig() {
  const s = new THREE.SpotLight('#ffffff', 0, 60, 0.42, 0.6, 1.4); s.castShadow = false; ctx.scene.add(s); ctx.scene.add(s.target); W.key = s;
  W.rim = new THREE.PointLight('#9fdcff', 0, 30, 1.6); ctx.scene.add(W.rim);
}
const keyFrom = (face, cam, side = 1) => { const d = cam.clone().sub(face); d.y = 0; d.normalize(); return face.clone().add(v3(d.x * 7 - d.z * 4 * side, 5, d.z * 7 + d.x * 4 * side)); };
function lights(t, cam, face, o = {}) {
  W.key.intensity = 0; W.rim.intensity = 0;
  if (!face) return;
  W.key.position.copy(keyFrom(face, cam, o.side ?? 1)); W.key.target.position.copy(face); W.key.color.set(o.keyColor || '#fff2e6'); W.key.intensity = o.key ?? 18; W.key.distance = 30;
  if (o.rim) { W.rim.position.copy(o.rim); W.rim.color.set(o.rimColor || '#9fdcff'); W.rim.intensity = o.rimI ?? 26; W.rim.distance = 16; }
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
function attemptAt(t) {
  const e = EV;
  if (t < e.fail + 1.0) return 1; if (t < e.slip + 0.6) return 2; if (t < e.space) return 3;
  return Math.min(10, 3 + Math.floor(clamp((t - e.space) / 0.9) * 7.99));
}
function drawHud(t, n) {
  const x = W.h2; x.clearRect(0, 0, 1080, 1920); if (ctx.thumbMode) return;
  const e = EV, s = (i) => L(i).start;
  x.textBaseline = 'middle';
  if (['hook', 'easy', 'fail', 'moved', 'walls', 'space'].includes(n)) {   // the obby's own HUD: stage and attempts
    const a = attemptAt(t), bump = [e.fail + 1.0, e.slip + 0.6].some((b) => t > b && t < b + 0.25) || (n === 'space' && t < e.space + 0.95 && t > e.space) ? 1.12 : 1;
    const k = clamp((t - 0.05) / 0.25);
    x.save(); x.globalAlpha = k; x.translate(540, 250);
    x.fillStyle = 'rgba(18,22,40,0.85)'; rr(x, -330, -62, 660, 124, 62); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 4; x.stroke();
    x.textAlign = 'left'; x.fillStyle = '#ffd32a'; x.font = F(54); x.fillText('STAGE 1/10', -290, 4);
    x.save(); x.translate(170, 4); x.scale(bump, bump); x.textAlign = 'center'; x.fillStyle = a >= 10 ? '#ff5a7a' : '#ffffff'; x.font = F(46); x.fillText(`ATTEMPT ${a}`, 0, 0); x.restore();
    x.restore();
  }
  if (n === 'quit') {   // the leave menu, the cursor on Leave
    const k = pop((t - s(6) - 0.1) / 0.28);
    card(x, 540, 360, 820, 330, k, (c, w, h) => {
      c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.font = F(52); c.fillText('Leave Game?', 0, -h / 2 + 70);
      c.fillStyle = '#b8c0d0'; c.font = F(30, 700); c.fillText('Stage 1 of 10 · 10 attempts', 0, -h / 2 + 130);
      c.fillStyle = '#ff4757'; rr(c, -w / 2 + 50, h / 2 - 130, 330, 96, 20); c.fill(); c.fillStyle = '#e8ecf4'; rr(c, w / 2 - 380, h / 2 - 130, 330, 96, 20); c.fill();
      c.fillStyle = '#ffffff'; c.font = F(44); c.fillText('Leave', -w / 2 + 215, h / 2 - 80); c.fillStyle = '#1a1e2c'; c.fillText('Resume', w / 2 - 215, h / 2 - 80);
      const mv = smooth(s(6) + 0.3, s(6) + 1.0, t), cx2 = lerp(120, -w / 2 + 250, mv), cy2 = lerp(140, h / 2 - 70, mv);
      c.save(); c.translate(cx2, cy2); c.fillStyle = '#ffffff'; c.strokeStyle = '#000000'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 52); c.lineTo(13, 40); c.lineTo(24, 62); c.lineTo(33, 57); c.lineTo(22, 36); c.lineTo(40, 36); c.closePath(); c.fill(); c.stroke(); c.restore();
    }, { bg: 'rgba(20,24,38,0.94)' });
  }
  if (n === 'froze' && t > e.detect) {   // the course's own message
    const k = pop((t - e.detect) / 0.28), full = 'UNPREDICTABLE', full2 = 'ACTION DETECTED', tot = full.length + full2.length;
    const nch = Math.floor(clamp((t - e.detect - 0.1) / Math.max(0.8, L(22).end - e.detect - 0.3)) * tot);
    card(x, 540, 330, 900, 250, k, (c, w, h) => {
      c.fillStyle = '#5ae4ff'; c.font = F(28); c.textAlign = 'left'; c.fillText('⚠ SYSTEM', -w / 2 + 40, -h / 2 + 46);
      c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.font = F(64); c.fillText(full.slice(0, nch), 0, -6); c.fillStyle = '#9ff4ff'; c.fillText(full2.slice(0, Math.max(0, nch - full.length)), 0, 70);
    }, { bg: 'rgba(8,26,44,0.92)', edge: '#5ae4ff' });
  }
  if (n === 'designer' && t > s(28) - 0.05) {   // the last message
    const k = pop((t - s(28) + 0.05) / 0.3), lines = ['NEW LEVEL DESIGNER', 'SELECTED'], tot = lines.join('').length;
    const nch = Math.floor(clamp((t - s(28)) / Math.max(0.9, L(28).end - s(28) - 0.2)) * tot);
    card(x, 540, 320, 920, 260, k, (c, w, h) => {
      c.fillStyle = '#ffd36a'; c.font = F(28); c.textAlign = 'left'; c.fillText('★ ACCESS GRANTED', -w / 2 + 40, -h / 2 + 46);
      c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.font = F(62); let left = nch; lines.forEach((ln, i) => { c.fillStyle = i ? '#ffd36a' : '#ffffff'; c.fillText(ln.slice(0, Math.max(0, left)), 0, -4 + i * 72); left -= ln.length; });
    }, { bg: 'rgba(30,22,8,0.9)', edge: '#ffd36a' });
  }
}

// ---- Emma: where she is, a pure function of t ----
const START = v3(0, 0, -4.5);
function platPos(p, t) {   // a platform's top centre at t
  const e = EV, tc = ct(t);
  const mv = p.k === 'p2' ? smooth(e.fail + 0.12, e.fail + 0.45, tc) : smooth(e.moved, e.moved + 1.1, tc);
  const a = v3(...p.a), b = v3(...p.b), q = lp3(a, b, easeOut(mv));
  if (tc > e.auto) { const k = smooth(e.auto, e.auto + 0.8, tc), i = PLAT.indexOf(p) + 1;
    q.x += Math.sin(tc * (1.1 + i * 0.13) + i) * 2.4 * k * (p.k.startsWith('cp') ? 0.2 : 1); q.y += Math.sin(tc * (1.5 + i * 0.1) + i * 2) * 1.0 * k; q.z += Math.cos(tc * 0.9 + i) * 1.2 * k * (p.k.startsWith('cp') ? 0.2 : 1); }
  return q;
}
function emmaAt(t) {
  const e = EV;
  if (t < e.hop) return { p: v3(0, 0, -5.4), yaw: Math.PI, st: 'idle' };
  if (t < e.hop + 0.75) { const k = (t - e.hop) / 0.75; return { p: jumpAt(v3(0, 0, -5.4), v3(-0.2, 0, -12.6), k, 2.6), yaw: Math.PI, st: 'jump', k }; }
  if (t < e.fail) return { p: v3(-0.2, 0, -12.6), yaw: Math.PI, st: 'idle' };
  if (t < e.fail + 2.4) {   // the jump to p2, which slides away: she drops through where it was
    const k = (t - e.fail) / 0.7, a = v3(-0.2, 0, -12.6), b = v3(2.4, 0.6, -20.5);
    if (k < 1) return { p: jumpAt(a, b, k, 2.4), yaw: Math.PI - 0.3, st: 'jump', k };
    const ft = t - e.fail - 0.7; return { p: b.clone().add(v3(0.4 * ft, -0.5 * 30 * ft * ft - 4 * ft, -1.2 * ft)), yaw: Math.PI - 0.3, st: 'fall', ft };
  }
  if (t < e.beam) return { p: START.clone(), yaw: Math.PI, st: 'idle' };
  if (t < e.space - 0.3) {   // the beam run; the walls go; she slips off
    const z = lerp(BEAM.z0 - 0.5, BEAM.z1 + 4, clamp((t - e.beam) / (e.slip - e.beam + 0.6)));
    if (t < e.slip) return { p: v3(Math.sin((t - e.walls) * 6) * 0.15 * smooth(e.walls + 0.4, e.slip, t), BEAM.y, z), yaw: Math.PI, st: 'run' };
    const ft = t - e.slip; return { p: v3(0.4 + 3 * ft, BEAM.y - 0.5 * 30 * ft * ft, z - 1.5 * ft), yaw: Math.PI, st: 'fall', ft };
  }
  if (t < e.sit) return { p: v3(0, 0, -5.2), yaw: Math.PI, st: 'idle' };
  if (t < e.stand) return { p: v3(0, 0.22, -6.15), yaw: Math.PI, st: 'sit' };
  if (t < e.back) return { p: v3(0, 0, -5.0), yaw: Math.PI, st: 'stand' };
  if (t < e.path + 0.45) {   // the backward jump, frozen at the freeze
    const tf = Math.min(t, e.freeze), k = clamp((tf - e.back) / 2.0);
    return { p: jumpAt(v3(0, 0, -5.0), v3(0, -6, 22), k, 5.5), yaw: Math.PI, st: 'back', k };
  }
  if (t < e.follow) {   // dropping onto the first tile
    const f = backFrozen(), k = clamp((t - e.path - 0.45) / 0.35), land = v3(0, PATH_Y, f.z);
    return { p: lp3(f, land, easeIn(k)), yaw: Math.PI, st: k < 1 ? 'back' : 'land', k: 1, land: t - e.path - 0.8 };
  }
  if (t < e.enter) { const z0 = backFrozen().z, k = clamp((t - e.follow) / (e.enter - 0.25 - e.follow)); return { p: v3(0, PATH_Y, lerp(z0, DOOR.z + 0.4, k)), yaw: 0, st: k < 1 ? 'run' : 'idle' }; }
  // the screen room (local coordinates, then offset by SR)
  if (t < L(26).start + 0.2) { const k = clamp((t - e.enter) / (L(26).start + 0.2 - e.enter)); return { p: SR.clone().add(v3(0, 0, lerp(24, 9, easeOut(k)))), yaw: Math.PI, st: k < 1 ? 'walk' : 'idle', room: true }; }
  if (t < e.turn - 0.3) return { p: SR.clone().add(v3(0, 0, 9)), yaw: Math.PI, st: 'idle', room: true };
  if (t < e.sitDown) { const k = clamp((t - e.turn + 0.3) / 1.3); return { p: SR.clone().add(v3(0, lerp(0, 0.9, smooth(0.6, 1, k)), lerp(9, 2.6, easeInOut(k)))), yaw: Math.PI + Math.PI * smooth(0.55, 1, k), st: k < 1 ? 'walk' : 'idle', room: true }; }
  return { p: SR.clone().add(v3(0, 0.9, 2.6)), yaw: 0, st: 'sitdown', k: clamp((t - e.sitDown) / 0.7), room: true };
}
const backFrozen = () => jumpAt(v3(0, 0, -5.0), v3(0, -6, 22), clamp((EV.freeze - EV.back) / 2.0), 5.5);

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, S = [], add = (name, t0, f) => S.push({ name, t0: () => t0, f, t1: () => 0 });
  add('hook', 0, (u) => ({ pos: v3(lerp(4.6, 4.2, u), 6.0, lerp(5.5, 4.8, u)), look: v3(-0.4, 2.2, -14), fov: 62 }));
  add('easy', s(1) - 0.6, (u) => ({ pos: v3(15.5, 5.0, lerp(-7.5, -9.5, u)), look: v3(0, 2.4, -9.4), fov: 60 }));
  add('fail', s(2) - 0.1, (u) => ({ pos: v3(lerp(-11, -11.5, u), lerp(8, 8.6, u), lerp(-6.5, -6, u)), look: v3(1.5, lerp(2.6, -1.0, u), -17), fov: 62 }));
  add('moved', s(3) - 0.1, (u) => ({ pos: v3(lerp(17, 15.5, u), lerp(14, 13, u), lerp(-6, -9, u)), look: v3(0, 0, -24), fov: 58 }));
  add('walls', s(4) - 0.1, (u, t) => { const p = emmaAt(Math.min(t, e.slip)).p; return { pos: v3(2.4, BEAM.y + 7.2, p.z + 9.5), look: v3(0, BEAM.y + 1, p.z - 8), fov: 64 }; });
  add('space', s(5) - 0.1, (u) => { const k = easeInOut(clamp(u * 1.15)); return { pos: lp3(v3(3.2, 5.0, 3.8), v3(18, 20, 34), k), look: lp3(v3(-0.4, 2.8, -14), v3(0, 0, -50), k), fov: 64 }; });
  add('quit', s(6) - 0.1, (u) => ({ pos: v3(lerp(1.8, 1.5, u), 3.0, lerp(-13.4, -12.8, u)), look: v3(0, 2.6, -6.2), fov: 60 }));
  add('notice', s(7) - 0.1, (u) => ({ pos: v3(lerp(2.0, 1.4, u), lerp(-0.2, -0.5, u), lerp(-18.5, -17.8, u)), look: v3(0, -3.6, -6.5), fov: 70 }));
  add('message', s(8) - 0.1, (u) => ({ pos: v3(lerp(0.4, 0, u), -2.4, lerp(-20, -18.5, u)), look: v3(0, -2.9, -7.3), fov: 54 }));
  add('stopped', s(9) - 0.1, (u) => ({ pos: v3(lerp(-1.8, -1.4, u), 4.0, lerp(-14.8, -14.0, u)), look: v3(0, 3.0, -5.0), fov: 58 }));
  add('moving', s(11) - 0.1, (u) => ({ pos: v3(lerp(5, 4.4, u), lerp(6.4, 7.0, u), lerp(1.5, 0.5, u)), look: v3(0, 1.2, -38), fov: 60 }));
  add('lasers', s(12) - 0.1, (u) => ({ pos: v3(lerp(13, 11.5, u), lerp(8, 9, u), lerp(-61, -63, u)), look: v3(0, 2.5, -90), fov: 62 }));
  add('farther', s(14) - 0.1, (u, t) => { const fz = W.finish.position.z; return { pos: v3(1.6, 4.8, -1.5), look: v3(0, 4.5, fz * 0.92), fov: lerp(24, 20, u) }; });
  add('realize', s(15) - 0.1, (u) => ({ pos: v3(lerp(0.9, 0.7, u), 4.4, lerp(-12.0, -11.4, u)), look: v3(0, 4.15, -5.0), fov: 50 }));
  add('jumping', s(16) - 0.1, (u) => ({ pos: v3(lerp(23, 22, u), 8, lerp(-6, -8, u)), look: v3(1, 2.6, -12), fov: 58 }));
  add('predict', s(17) - 0.1, (u) => ({ pos: v3(lerp(-3.2, -2.6, u), 5.6, lerp(4.5, 3.6, u)), look: v3(0, 2.6, -13), fov: 62 }));
  add('unexpected', s(18) - 0.1, (u) => ({ pos: v3(lerp(-1.6, -1.2, u), 4.1, lerp(-12.6, -12.0, u)), look: v3(0, 3.5, -5.0), fov: 56 }));
  add('backward', s(19) - 0.1, (u, t) => { const p = emmaAt(t).p; return { pos: v3(19, 5.0, lerp(1.0, p.z * 0.6 + 1, 0.6)), look: v3(0, Math.max(2.4, p.y + 2.4), p.z * 0.75), fov: 62 }; });
  add('froze', s(20) - 0.1, (u) => { const f = backFrozen(), a = lerp(-0.5, 0.65, easeInOut(u)), R = 11.5; return { pos: f.clone().add(v3(Math.sin(a) * R, 2.2 + 1.0 * u, -Math.cos(a) * R)), look: f.clone().add(v3(0, 2.4, 0)), fov: 60 }; });
  add('path', s(23) - 0.1, (u) => { const f = backFrozen(); return { pos: v3(lerp(12.5, 11.5, u), PATH_Y + 3.4, f.z - 2.5), look: v3(0, PATH_Y + 2.2, f.z + 0.9), fov: 62 }; });
  add('door', s(24) - 0.1, (u, t) => { const p = emmaAt(t).p; return { pos: v3(lerp(3.2, 2.4, u), PATH_Y + 4.6, Math.min(p.z - 8.5, DOOR.z - 9)), look: v3(0, PATH_Y + 4.2, DOOR.z), fov: 62 }; });
  add('screens', e.enter, (u) => { const k = easeInOut(u); return { pos: SR.clone().add(lp3(v3(1.5, 4.2, 30.5), v3(3, 9, 30), k)), look: SR.clone().add(lp3(v3(0, 5.5, 0), v3(0, 22, -10), k)), fov: 70 }; });
  add('players', s(26) - 0.1, (u) => { const a = lerp(-1.95, -1.55, u); return { pos: SR.clone().add(v3(Math.cos(a) * 13, 9.5, Math.sin(a) * 13)), look: SR.clone().add(v3(Math.cos(a - 0.55) * 30, 13.5, Math.sin(a - 0.55) * 30)), fov: 46 }; });
  add('turned', s(27) - 0.1, (u) => ({ pos: SR.clone().add(v3(lerp(6.5, 5.5, u), lerp(3.2, 3.6, u), lerp(17, 15.5, u))), look: SR.clone().add(v3(-1, 9, -8)), fov: 70 }));
  add('designer', s(28) - 0.15, (u, t) => { const k = smooth(EV.rise + 0.4, ctx.dur, t); return { pos: SR.clone().add(lp3(v3(1.2, 5.0, 10.8), v3(4.5, 13, 27), easeInOut(k))), look: SR.clone().add(lp3(v3(0, 4.8, 1.5), v3(0, 11, -2), easeInOut(k))), fov: lerp(60, 72, easeInOut(k)) }; });
  S.forEach((x, i) => { if (S[i + 1]) { const v = S[i + 1].t0(); x.t1 = () => v; } });
  S[S.length - 1].t1 = () => ctx.dur + 1;
  return S;
}

// ---- helpers ----
function faceOf(c, name, t, ph, o = {}) { const nm = name.includes(':') ? name : 'lash:' + name; c.setFace(nm, { blink: o.blink !== false && blinkAt(t, ph) && !['shocked', 'surprised', 'terrified'].includes(name), gaze: o.gaze }); }
const headOf = (c, y = 4.6) => c.root.position.clone().add(v3(0, y * c.root.scale.y, 0));
function jumpPose(ch, k, t) {
  const [Lg, Rg] = ch.legs, [AL, AR] = ch.arms; const up = Math.sin(clamp(k) * Math.PI);
  Lg.rotation.x = -0.9 * up - 0.1; Rg.rotation.x = 0.5 * up; AL.rotation.x = -2.4 * up - 0.3; AR.rotation.x = -2.1 * up - 0.3; AL.rotation.z = 0.25; AR.rotation.z = -0.25; ch.torso.rotation.x = 0.12 * up;
}

// ---- a frame ----
function renderAt(t) {
  const first = !ctx.sub || ctx.sub.i === 0, sh = shotAt(W.shots, t), n = sh.name, e = EV, s = (i) => L(i).start;
  const roomShots = ['screens', 'players', 'turned', 'designer'];
  const set = roomShots.includes(n) ? 'room' : t < e.space ? 'obby' : 'space';
  applyEnv(ctx, set === 'room' ? ROOM : set === 'space' ? SPACE : OBBY);
  const inSpace = set === 'space', tc = ct(t);
  W.course.visible = set !== 'room'; W.space.visible = inSpace; W.room.visible = set === 'room'; W.pathG.visible = inSpace && t > e.path - 0.2;
  W.deco.visible = set === 'obby';
  // ---- the course ----
  const edgeI = inSpace ? 1.4 : 0.25;
  W.plats.forEach((p) => {
    const q = platPos(p, t); p.m.position.copy(q); p.m.rotation.y = (p.ry || 0) * smooth(e.moved, e.moved + 1.1, tc) + (tc > e.auto && !p.k.startsWith('cp') ? Math.sin(tc * 0.8 + q.x) * 0.25 * smooth(e.auto, e.auto + 0.8, tc) : 0);
    p.m.userData.edge.emissiveIntensity = edgeI;
    // vanishing: three platforms pop out, one after another
    const vi = ['p4', 'p5', 'p6'].indexOf(p.k), vk = vi >= 0 ? smooth(e.vanish + vi * 0.3, e.vanish + vi * 0.3 + 0.22, tc) : 0;
    p.m.scale.setScalar(Math.max(0.001, 1 - vk)); p.m.visible = vk < 0.999;
  });
  W.startEdge.emissiveIntensity = edgeI; W.discEdge.material && (W.discEdge.material.emissiveIntensity = edgeI); W.finish.userData.edge.emissiveIntensity = edgeI;
  W.beam.userData.edge.emissiveIntensity = edgeI;
  W.walls.forEach((w) => { const d = e.walls + w.i * 0.18 + (w.sx > 0 ? 0.09 : 0), k = smooth(d, d + 0.3, t); w.g.scale.set(Math.max(0.001, 1 - k), Math.max(0.001, 1 - k * 0.6), Math.max(0.001, 1 - k)); w.g.visible = k < 0.999; });
  W.disc.rotation.y = tc * 0.25; W.bar.visible = set === 'obby'; W.bar.rotation.y = t * 1.8;
  W.coins.forEach((c, i) => { c.rotation.z = t * 2.4 + i; c.position.y += 0; c.visible = set === 'obby' && n !== 'walls'; });
  // the finish runs away
  const rec = smooth(e.recede, e.recede + 2.6, tc); W.finish.position.set(0, 3.6 + 2 * rec, -116 - 150 * easeInOut(rec)); W.finish.rotation.y = 0;
  // lasers spin up at line 12
  const lk = smooth(e.lasers, e.lasers + 0.35, tc);
  W.lasers.forEach((l, i) => { l.g.visible = inSpace; l.g.beams.scale.setScalar(Math.max(0.001, lk)); l.g.beams.visible = lk > 0.001; l.g.beams.rotation.z = (tc - e.lasers) * l.sp * (1 + 0.5 * smooth(e.lasers, e.recede, tc)) + i; });
  W.msgMat.opacity = inSpace ? 0.55 + 0.45 * smooth(e.peek, e.peek + 0.6, t) * (0.85 + 0.15 * Math.sin(t * 6)) : 0;
  // ---- Emma ----
  const E1 = W.emma, [AL, AR] = E1.arms, em = emmaAt(t);
  E1.root.visible = true; E1.root.rotation.set(0, 0, 0); E1.root.position.copy(em.p); E1.root.rotation.y = em.yaw;
  let face = null, lo = {}, ex = 'neutral', gaze;
  const st = em.st;
  if (st === 'idle') pose(E1, 'idle', t);
  if (st === 'walk' || st === 'run') pose(E1, st, st === 'run' ? t * 1.1 : t);
  if (st === 'jump') { pose(E1, 'idle', t); jumpPose(E1, em.k, t); }
  if (st === 'fall') { pose(E1, 'scared', t); E1.root.rotation.x = -em.ft * 3.2; E1.legs[0].rotation.x = 0.5 * Math.sin(t * 20); E1.legs[1].rotation.x = -0.5 * Math.sin(t * 20); ex = 'shocked'; }
  if (st === 'sit') {   // on the front edge, legs over the drop
    pose(E1, 'sit', t); AL.rotation.x = -0.35; AR.rotation.x = -0.35; AL.rotation.z = -0.3; AR.rotation.z = 0.3;
    const pk = smooth(e.peek, e.peek + 0.6, t); E1.torso.rotation.x = 0.1 + 0.42 * pk; E1.neck.rotation.x = 0.15 + 0.45 * pk; E1.legs[0].rotation.x = -1.35; E1.legs[1].rotation.x = -1.25;
    ex = pk > 0.5 ? 'surprised' : 'sad';
  }
  if (st === 'stand') {   // arms folded, waiting; she taps her foot
    pose(E1, 'idle', t); AL.rotation.x = -1.3; AR.rotation.x = -1.2; AL.rotation.z = 0.62; AR.rotation.z = -0.62;
    if (t > s(10) && t < e.auto) E1.legs[1].rotation.x = -0.18 * Math.max(0, Math.sin(t * 9));
    ex = t < s(10) ? 'suspicious' : t < e.realize ? 'smug' : t < e.realize + 0.5 ? 'surprised' : t < e.smirk ? 'focused' : 'smug';
    if (t > e.realize && t < e.realize + 1.6) { AL.rotation.x = lerp(-1.25, -0.2, smooth(e.realize, e.realize + 0.3, t)); AR.rotation.x = lerp(-1.3, -0.2, smooth(e.realize, e.realize + 0.3, t)); AL.rotation.z = -0.1; AR.rotation.z = 0.1; }
    if (t >= e.realize + 1.6) { AL.rotation.x = -0.2; AR.rotation.x = -0.2; AL.rotation.z = -0.1; AR.rotation.z = 0.1; }
    if (t > e.smirk) { const c = smooth(e.smirk, e.smirk + 0.4, t); E1.legs[0].rotation.x = -0.25 * c; E1.legs[1].rotation.x = 0.2 * c; E1.torso.rotation.x = 0.12 * c; AL.rotation.x = -0.2 - 0.5 * c; AR.rotation.x = -0.2 - 0.5 * c; }
  }
  if (st === 'back') {   // a backward leap: arms thrown forward, knees up; frozen mid-air at the freeze
    pose(E1, 'idle', t); const k = em.k; E1.torso.rotation.x = -0.35 * Math.sin(k * Math.PI); E1.legs[0].rotation.x = -1.1; E1.legs[1].rotation.x = -0.6; AL.rotation.x = -0.7; AR.rotation.x = -0.5; AL.rotation.z = -1.1; AR.rotation.z = 1.1;
    E1.root.rotation.x = -0.25 * Math.sin(k * Math.PI);
    ex = t < e.freeze ? 'happy' : t < e.detect ? 'surprised' : 'shocked';
    gaze = t > e.freeze + 0.4 && t < e.path ? (Math.sin(t * 2.2) > 0 ? 'left' : 'right') : undefined;
  }
  if (st === 'land') { pose(E1, 'idle', t); const c = 1 - smooth(0, 0.35, em.land); E1.hips.position.y -= 0.35 * c * (E1.hipY ?? 2) / 2; E1.legs[0].rotation.x = -0.4 * c; E1.legs[1].rotation.x = -0.4 * c; ex = 'surprised'; }
  if (st === 'sitdown') {
    const k = easeInOut(em.k); pose(E1, k > 0.5 ? 'sit' : 'idle', t);
    const H0 = E1.hipY ?? 2, sitH = H0 - 1.55 * (H0 / 2);
    E1.hips.position.y = lerp(H0, sitH, k); E1.legs[0].rotation.x = E1.legs[1].rotation.x = lerp(0, -1.45, k);
    E1.root.position.set(SR.x, 0.9 + W.chairSeatY - sitH + 0.02 + W.chair.position.y - 0.9 - (k < 1 ? (1 - k) * 0.0 : 0), SR.z + lerp(2.6, 0.55, k));
    AL.rotation.x = AR.rotation.x = -0.9 * k; AL.rotation.z = -0.25 * k; AR.rotation.z = 0.25 * k;
    ex = t < e.illum + 0.6 ? 'surprised' : 'smile';
  }
  // per shot: faces and key lights
  if (n === 'hook') { ex = 'happy'; E1.neck.rotation.y = 0.15; face = headOf(E1); lo = { key: 12 }; }
  if (n === 'easy') { ex = t > e.hop + 0.8 ? 'smile' : 'happy'; face = headOf(E1); lo = { key: 12 }; }
  if (n === 'fail') { if (st === 'jump') ex = em.k > 0.4 ? 'shocked' : 'happy'; }
  if (n === 'moved') { E1.neck.rotation.x = 0.2; ex = 'nervous'; }
  if (n === 'walls') { ex = t > e.walls + 0.3 ? 'scared' : 'focused'; }
  if (n === 'space') { E1.neck.rotation.y = -0.2 * smooth(e.space, e.space + 1, t); ex = t > e.space ? 'shocked' : 'nervous'; }
  if (n === 'quit') { face = headOf(E1, 3.4); lo = { key: 22, rim: v3(-3, 6, 1), rimColor: '#c7a0ff' }; }
  if (n === 'notice' || n === 'message') { face = headOf(E1, 3.4); lo = { key: 14 }; }
  if (n === 'stopped') { face = headOf(E1); lo = { key: 20, rim: v3(3, 7, 2), rimColor: '#c7a0ff', rimI: 22 }; }
  if (n === 'moving' || n === 'lasers' || n === 'farther') { if (n !== 'lasers') E1.neck.rotation.x = 0.05; }
  if (n === 'realize') { face = headOf(E1); lo = { key: 22, rim: v3(-3, 7, 2), rimColor: '#9fdcff', rimI: 24 }; }
  if (n === 'unexpected') { face = headOf(E1); lo = { key: 22, rim: v3(3, 7, 2), rimColor: '#ff9fd0', rimI: 22 }; }
  if (n === 'froze') { face = headOf(E1, 3.6); lo = { key: 20, keyColor: '#e6f8ff', rim: backFrozen().add(v3(0, 6, 5)), rimColor: '#5ae4ff', rimI: 30 }; }
  if (n === 'path') { E1.neck.rotation.x = 0.35; face = headOf(E1); lo = { key: 14, keyColor: '#e6f8ff' }; }
  if (n === 'door') { ex = 'focused'; }
  if (n === 'screens' || n === 'players') { E1.neck.rotation.x = -0.35; ex = 'surprised'; }
  if (n === 'turned') { E1.neck.rotation.x = -0.25; E1.neck.rotation.y = 0.4 * Math.sin((t - s(27)) * 1.6); ex = t > e.turn + 0.6 ? 'shocked' : 'surprised'; face = headOf(E1); lo = { key: 14, keyColor: '#cfefff' }; }
  if (n === 'designer') { face = headOf(E1, 3.6); lo = { key: 22, keyColor: '#fff0dc', rim: SR.clone().add(v3(0, 8, -6)), rimColor: '#5ae4ff', rimI: 34 }; }
  faceOf(E1, ex, t, 0.3, { gaze, blink: st !== 'back' || t > e.freeze + 0.3 });
  if (em.room !== true && set === 'room') E1.root.visible = false;
  if (em.room === true && set !== 'room') E1.root.visible = false;
  // ---- the ghosts: three predicted jumps toward the moving platforms ----
  const gOn = inSpace && t > e.ghosts && t < e.freeze + 0.05 && n !== 'unexpected';
  const tgt = [platPos(W.plats[0], t), platPos(W.plats[1], t), platPos(W.plats[2], t)];
  let di = 0; const M = new THREE.Matrix4();
  W.ghosts.forEach((G, i) => {
    G.root.visible = gOn; if (!gOn) return;
    const per = 1.5, ph = ((tc - e.ghosts - i * 0.35) / per), k = ph - Math.floor(ph), a = START.clone().add(v3((i - 1) * 1.8, 0, -2.4)), b = tgt[i].clone();
    const fade = smooth(e.ghosts, e.ghosts + 0.4, t);
    // before the backward jump they loop; at the jump they all leap forward together (wrong)
    let kk = k; if (tc > e.back - 0.05) kk = clamp((tc - e.back) / 0.9);
    G.root.position.copy(ph < 0 && tc < e.back - 0.05 ? a : jumpAt(a, b, kk, 3.0)); G.root.rotation.set(0, Math.PI, 0); pose(G, 'idle', t); jumpPose(G, kk, t);
    G.root.traverse((o) => { if (o.isMesh) o.material.opacity = 0.32 * fade; });
    for (let j = 0; j < 22; j++) { const p = jumpAt(a, b, j / 21, 3.0); p.y += 2.0; M.makeTranslation(p.x, p.y, p.z); W.dots.setMatrixAt(di++, M); }
  });
  W.dots.visible = gOn; W.dots.count = di; W.dots.instanceMatrix.needsUpdate = true; W.dots.material.opacity = 0.75 * smooth(e.ghosts, e.ghosts + 0.4, t);
  // ---- the hidden path and the door ----
  W.tiles.forEach((T, i) => { const k = easeOut(smooth(e.path + T.d, e.path + T.d + 0.55, t)); T.g.position.copy(lp3(T.from, T.home, k)); T.g.rotation.set(T.spin * (1 - k), T.spin * 0.6 * (1 - k), 0); T.g.scale.setScalar(Math.max(0.001, k)); T.g.visible = k > 0.001; });
  const op = smooth(e.open, e.open + 0.8, t); W.leaves.forEach((l) => { l.m.position.x = l.sx * (1.1 + 2.0 * op); }); W.doorPt.intensity = 10 + 40 * op; W.doorLight.material.color.set('#bff6ff').multiplyScalar(0.6 + 0.4 * op);
  // ---- the room ----
  if (set === 'room') {
    const head = SR.clone().add(v3(0, 4.6 + 0.9 + 2.0 * smooth(e.rise, e.rise + 2.4, t), 2.2));
    updateScreens(t, n === 'designer' ? SR.clone().add(v3(0, 5.5 + 2.0 * smooth(e.rise, e.rise + 2.4, t), 1)) : E1.root.position.clone().add(v3(0, 4.4, 0)));
    const up = smooth(e.rise, e.rise + 2.4, t); W.chair.position.y = 0.9 + 2.0 * up; if (st === 'sitdown') E1.root.position.y += 2.0 * up;
    W.holo.forEach((h, i) => { h.material.opacity = 0.35 + 0.5 * smooth(e.sitDown + 0.4, e.sitDown + 0.9, t) * (0.9 + 0.1 * Math.sin(t * 8 + i)); });
    W.roomLights.forEach((l, i) => { l.intensity = 22 + 26 * smooth(e.illum, e.illum + 1.5, t) + 3 * Math.sin(t * 3 + i); });
    void head;
  }
  if (n === 'lasers' || n === 'moving' || n === 'farther' || n === 'jumping' || n === 'predict') { /* Emma watches from the start pad */ }
  lights(t, sh.pos, face, lo);
  // ---- air ----
  W.air.update(set === 'space' ? tc : t); const A = W.air.list;
  A.clouds.visible = A.cloudsLow.visible = set === 'obby'; A.confetti.visible = set === 'obby';
  A.motes.visible = inSpace; A.spark.visible = inSpace && t > e.path - 0.1; A.roomDust.visible = set === 'room'; A.roomSpark.visible = set === 'room' && t > e.illum;
  A.respawn.visible = A.respawn.visible && set === 'obby';
  // flashes: the glitch into space, the freeze, the path
  const glitch = n === 'space' ? 0.55 * (1 - clamp(Math.abs(t - e.space) / 0.22)) : 0;
  const frz = n === 'froze' ? 0.4 * (1 - clamp((t - e.freeze) / 0.3)) * (t >= e.freeze ? 1 : 0) : 0;
  const shake = n === 'lasers' ? 0.12 : n === 'space' && Math.abs(t - e.space) < 0.4 ? 0.5 : 0;
  const tint = n === 'froze' && t > e.freeze ? 'linear-gradient(rgba(60,190,255,0.10), rgba(60,190,255,0.10))' : undefined;
  { const cq = new URLSearchParams(location.search).get('cam'); if (cq) { const q = cq.split(',').map(Number); sh.pos = v3(q[0], q[1], q[2]); sh.look = v3(q[3], q[4], q[5]); sh.fov = q[6]; } }
  frame(ctx, t, sh, { shake, shadowSpan: ['moved', 'space', 'moving', 'lasers', 'screens', 'designer'].includes(n) ? 90 : 40, flash: Math.max(glitch, frz), flashColor: glitch ? '#d0a0ff' : '#bff4ff', tint,
    steady: !['walls', 'door', 'fail'].includes(n) });
  if (first) drawHud(t, n);
  return n;
}

export async function setup() {
  ctx = await initStage('ep26', { look: 'pro', avatars: ['farm_emma_obby'] }); L = ctx.L; EV = events();
  const EX = ['neutral', 'happy', 'smile', 'surprised', 'shocked', 'nervous', 'scared', 'sad', 'suspicious', 'smug', 'focused'];
  await loadAlti([...EX, ...EX.map((x) => 'lash:' + x)]);
  const { scene, camera } = ctx; camera.far = 6000; camera.near = 0.15; camera.updateProjectionMatrix();
  ctx.cap.style.webkitTextStroke = '22px #000'; ctx.cap.style.textShadow = '0 10px 0 rgba(0,0,0,0.6), 0 0 26px rgba(0,0,0,0.9), 0 0 54px rgba(0,0,0,0.6)';
  rig(); course(); lasers(); space(); pathAndDoor(); room(); people();
  const list = {
    clouds: clouds(scene, { count: 22, y: 60, spread: 900, size: 30, color: '#ffffff', drift: 0.7, seed: 5 }),
    cloudsLow: clouds(scene, { count: 16, y: -95, spread: 800, size: 36, color: '#f2f8ff', drift: 0.5, seed: 8 }),
    confetti: sparkles(scene, { centre: v3(0, 4, -40), size: 70, height: 16, count: 260, color: '#fff2a8', pointSize: 0.45 }),
    motes: dust(scene, { size: 80, height: 30, centre: v3(0, 4, -30), count: 500, color: '#c8b8ff', amount: 0.35, pointSize: 0.45 }),
    spark: sparkles(scene, { centre: v3(0, 1, 24), size: 14, height: 10, count: 260, color: '#bff4ff', pointSize: 0.32 }),
    roomDust: dust(scene, { size: 50, height: 30, centre: SR.clone().add(v3(0, 12, 0)), count: 600, color: '#9fe8ff', amount: 0.3, pointSize: 0.4 }),
    roomSpark: sparkles(scene, { centre: SR.clone().add(v3(0, 6, 1)), size: 10, height: 8, count: 160, color: '#ffe8a8', pointSize: 0.3 }),
    respawn: burst(scene, { count: 160, color: '#ffffff', dur: 0.9, spread: 2, height: 5, pointSize: 0.3, bright: 1.2, pos: START.clone(), seed: 3 }),
  };
  list.respawn.fire(EV.beam - 0.6);
  W.air = atmos(...Object.values(list)); W.air.list = list;
  hudInit(); W.shots = shots();
  void noise1; void glowSprite;
  return expose(ctx, renderAt, EV.ghosts + 1.0, EV);
}
