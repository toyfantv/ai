// Episode 22: The Dress That Won Every Competition. A glamorous fashion-show game: a runway hall in silver light (catwalk, LED screen,
// truss and moving heads, red-velvet risers, a judges' desk) and a pink backstage lounge with a wall of bulb mirrors. One mirror slides
// away to show a silver gown on a dress form. In it Bella can't lose: every round, every outfit, first place. Then the game stops
// pretending: the contestants freeze, the screen picks its winner forever, the gown cinches, and the only person left in the seats is
// wearing Bella's original outfit.
// Sets share the world: the hall at the origin (runway along +z), the lounge at LX.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, NIGHT } from '../engine/stage.js';
import { Batch, surf, paint, crowd } from '../engine/kit.js';
import { dust, shaft, burst, sparkles, atmos } from '../engine/atmos.js';
import { canvasTex, glowSprite } from '../engine/props.js';
import { sofa, plant } from '../engine/home.js';
import { sparkleTex, gownGeo, shapeGown, gownMat, dressForm, starPaddle } from '../engine/runway.js';

let ctx, L, EV;
const W = {};
const LX = v3(700, 0, 0);
const RT = 1.6, RW = 5, RZ0 = -6, RZ1 = 66;          // runway top, half width, start and end
const SZ = -26, ST = 1.6;                             // stage back wall, stage top
const END = 58, MID = 40;                             // Bella's marks on the runway
const SPEC = { s: -1, r: 3, z: 34 };                  // the one seat that stays taken
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const tmpC = new THREE.Color();
const ARM = 2.2;

// ---- palettes ----
const HALL = { ...NIGHT, ...P({ top: '#05060c', horizon: '#090b16', haze: '#080a14', sunColor: '#dfe6ff', hemiSky: '#b9c6e8', hemiGround: '#251c2a' }),
  sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 0.62, amb: 0.14, envI: 0.42, exposure: 1.16, bloom: 0.3, fogNear: 120, fogFar: 520, saturation: 1.14, contrast: 1.04, bounce: 0.12 };
const COLD = { ...HALL, ...P({ haze: '#05070e', hemiSky: '#8ea6ff', hemiGround: '#14141e' }), hemiI: 0.5, amb: 0.1, envI: 0.32, exposure: 1.12, saturation: 0.88, contrast: 1.08 };
const DARK = { ...COLD, ...P({ haze: '#020205', hemiSky: '#5a6a9a' }), hemiI: 0.24, amb: 0.06, envI: 0.16, exposure: 1.26, saturation: 0.95 };
const LOUNGE = { ...NIGHT, ...P({ top: '#1a0f16', horizon: '#2a1820', haze: '#24141c', sunColor: '#ffffff', hemiSky: '#ffe2ee', hemiGround: '#6a3a4c' }),
  sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 1.0, amb: 0.2, envI: 0.6, exposure: 1.1, bloom: 0.26, fogNear: 120, fogFar: 400, saturation: 1.16, contrast: 1.02, bounce: 0.25 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return { slide: s(2) + 2.3, swap: s(5) + 1.05, silent: s(5) + 1.9, j1: s(8) + 0.35, j2: s(8) + 0.75, j3: s(8) + 1.15, conf1: s(9) + 0.1, conf2: s(11) + 0.05,
    outfits: s(12), freeze: s(14) + 0.95, glitch: s(16) + 0.9, forever: s(17) - 0.1, menu: s(18) + 0.3, click: s(19) - 0.35, gone: s(19) + 0.55, tight: s(20) + 0.6,
    spot: s(21) + 0.45, count: s(23) - 0.05, turn: s(24) + 0.25, spec: s(28) - 0.2, clap: s(28) + 1.4, end: ctx.dur };
}
const walkZ = (t, t0, z0, z1, v = 7.6) => Math.min(z1, z0 + Math.max(0, t - t0) * v);

function velvet(base) { const m = paint(base, { roughness: 0.82 }); return m; }

// ---- the runway hall ----
function hall() {
  const g = new THREE.Group(); ctx.scene.add(g); W.hall = g;
  const b = new Batch(), floor = paint('#0c0d14', { roughness: 0.22, metalness: 0.35 }), black = paint('#08080c', { roughness: 0.6 }), chrome = paint('#c9ced8', { metalness: 0.95, roughness: 0.18 }),
    white = paint('#e8ebf2', { roughness: 0.16, metalness: 0.25 }), trim = paint('#a7adbb', { metalness: 0.9, roughness: 0.25 }), gold = paint('#c9a24a', { metalness: 0.9, roughness: 0.3 });
  b.box(floor, 200, 0.4, 200, 0, -0.2, 20, { r: 0.02 });
  // the catwalk: white lacquer top on a mirrored plinth, chrome lips
  b.box(white, RW * 2, 0.3, RZ1 - RZ0, 0, RT - 0.15, (RZ0 + RZ1) / 2, { r: 0.05 });
  b.box(paint('#1a1c26', { roughness: 0.15, metalness: 0.6 }), RW * 2 - 0.2, RT - 0.3, RZ1 - RZ0 - 0.2, 0, (RT - 0.3) / 2, (RZ0 + RZ1) / 2, { r: 0.04 });
  for (const s of [-1, 1]) b.box(chrome, 0.2, 0.2, RZ1 - RZ0, s * RW, RT + 0.02, (RZ0 + RZ1) / 2, { r: 0.05 });
  b.box(chrome, RW * 2 + 0.2, 0.2, 0.2, 0, RT + 0.02, RZ1, { r: 0.05 });
  // a pattern of inlaid squares down the catwalk
  for (let z = RZ0 + 3; z < RZ1; z += 6) b.box(paint('#b7bfd2', { metalness: 0.9, roughness: 0.12 }), 2.2, 0.04, 2.2, 0, RT + 0.01, z, { r: 0.02, ry: Math.PI / 4 });
  // the end platform, round
  b.cyl(white, 7.2, 7.2, 0.3, 0, RT - 0.15, RZ1 - 2, { seg: 48 }); b.cyl(paint('#1a1c26', { metalness: 0.6, roughness: 0.15 }), 7.0, 7.0, RT - 0.3, 0, (RT - 0.3) / 2, RZ1 - 2, { seg: 48 });
  b.cyl(chrome, 7.3, 7.3, 0.16, 0, RT + 0.02, RZ1 - 2, { seg: 48 });
  // the stage, its stairs and the back wall
  b.box(paint('#14151d', { roughness: 0.18, metalness: 0.5 }), 50, ST, -SZ + RZ0 + 2, 0, ST / 2, (SZ + RZ0 + 2) / 2, { r: 0.05 });
  b.box(black, 70, 40, 1, 0, 20, SZ - 0.5, { r: 0.05 });
  for (let i = 0; i < 9; i++) b.box(paint('#1c1e2a', { roughness: 0.5 }), 3.2, 40, 0.6, -28 + i * 7, 20, SZ + 0.2, { r: 0.1 });
  // truss: two towers and a header, with diagonals
  const truss = (x0, y0, z0, x1, y1, z1) => { const a = v3(x0, y0, z0), c = v3(x1, y1, z1), len = a.distanceTo(c), m = a.clone().add(c).multiplyScalar(0.5), d = c.clone().sub(a).normalize();
    const geo = new THREE.CylinderGeometry(0.16, 0.16, len, 8); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d)); b.add(chrome, geo, m.x, m.y, m.z); };
  for (const sx of [-25, 25]) { for (const dx of [-1, 1]) for (const dz of [-1, 1]) truss(sx + dx, 0, SZ + 3 + dz, sx + dx, 34, SZ + 3 + dz); for (let y = 0; y < 34; y += 2.5) { truss(sx - 1, y, SZ + 2, sx + 1, y + 2.5, SZ + 2); truss(sx - 1, y, SZ + 4, sx + 1, y + 2.5, SZ + 4); truss(sx - 1, y, SZ + 2, sx - 1, y + 2.5, SZ + 4); truss(sx + 1, y, SZ + 4, sx + 1, y + 2.5, SZ + 2); } }
  for (const dy of [33, 35]) for (const dz of [-1, 1]) truss(-26, dy, SZ + 3 + dz, 26, dy, SZ + 3 + dz);
  for (let x = -24; x < 24; x += 2.5) { truss(x, 33, SZ + 2, x + 2.5, 35, SZ + 2); truss(x, 33, SZ + 4, x + 2.5, 35, SZ + 4); }
  // a lighting bar over the runway
  for (const z of [16, 40]) { for (const dy of [30, 31.6]) truss(-16, dy, z, 16, dy, z); for (let x = -16; x < 16; x += 2) truss(x, 30, z, x + 2, 31.6, z); }
  // the judges' desk on the left, near the end
  b.box(paint('#151620', { roughness: 0.2, metalness: 0.5 }), 3, 3.4, 15, -16, 1.7, 56, { r: 0.12 }); b.box(white, 3.6, 0.3, 15.6, -16, 3.55, 56, { r: 0.1 });
  b.box(gold, 0.12, 0.16, 15.4, -14.45, 2.9, 56, { r: 0.04 });
  for (const z of [51.5, 56, 60.5]) { b.cyl(paint('#e8eef8', { roughness: 0.05, metalness: 0.1, }), 0.22, 0.18, 0.6, -16.4, 4.0, z + 1.2); b.box(paint('#2a2c36'), 0.5, 0.06, 0.8, -16.6, 3.73, z - 0.8, { r: 0.02 }); }
  // the podium at the end of the stage (winners)
  b.done(g);
  // desk sign
  const ds = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.6), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 136, (x, w, h) => { x.fillStyle = '#0a0b12'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8ecff'; x.font = '900 92px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#9fb4ff'; x.shadowBlur = 20; x.fillText('J U D G E S', w / 2, h / 2 + 4); }), color: new THREE.Color(1.5, 1.5, 1.6) }));
  ds.position.set(-14.47, 1.9, 56); ds.rotation.y = Math.PI / 2; ds.userData.noAO = true; g.add(ds);
  // LED edges of the runway and the end disc
  W.ledM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, RZ1 - RZ0 - 7), W.ledM); m.position.set(s * (RW + 0.08), RT - 0.4, (RZ0 + RZ1 - 7) / 2); m.userData.noAO = true; g.add(m); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7.25, 0.07, 6, 80), W.ledM); ring.rotation.x = Math.PI / 2; ring.position.set(0, RT - 0.4, RZ1 - 2); ring.userData.noAO = true; g.add(ring);
  const st = new THREE.Mesh(new THREE.BoxGeometry(50, 0.12, 0.12), W.ledM); st.position.set(0, ST - 0.3, RZ0 + 2.06); st.userData.noAO = true; g.add(st);
  // the LED screen
  const c = document.createElement('canvas'); c.width = 1024; c.height = 576; W.scr = c; W.scrX = c.getContext('2d'); W.scrT = new THREE.CanvasTexture(c); W.scrT.colorSpace = THREE.SRGBColorSpace;
  W.scrM = new THREE.MeshBasicMaterial({ map: W.scrT, color: new THREE.Color(1.25, 1.25, 1.25) });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(40, 22.5), W.scrM); scr.position.set(0, 17, SZ + 0.6); scr.userData.noAO = true; g.add(scr);
  const sb = new Batch(); sb.box(paint('#0d0e14', { metalness: 0.6, roughness: 0.3 }), 41.4, 23.9, 0.6, 0, 17, SZ + 0.25, { r: 0.12 }); sb.done(g);
  // moving heads on the header, and their beams
  W.heads = []; const hb = new Batch();
  for (let i = 0; i < 8; i++) { const x = -21 + i * 6; hb.box(paint('#16171e', { metalness: 0.5 }), 1.4, 0.6, 1.4, x, 32.4, SZ + 3, { r: 0.1 }); }
  hb.done(g);
  for (let i = 0; i < 8; i++) { const x = -21 + i * 6, from = v3(x, 31.6, SZ + 3); const beam = shaft(ctx.scene, { from, to: v3(x * 0.4, 0, 20), top: 0.35, bottom: 4.6, color: i % 2 ? '#dfe7ff' : '#c9d6ff', amount: 0.11 }); g.add(beam); W.heads.push({ from, beam, i }); }
  for (const z of [16, 40]) for (const x of [-12, -4, 4, 12]) { const from = v3(x, 29.6, z); const beam = shaft(ctx.scene, { from, to: v3(x * 0.2, RT, z + 6), top: 0.3, bottom: 3.6, color: '#eef2ff', amount: 0.07 }); g.add(beam); W.heads.push({ from, beam, i: W.heads.length, bar: true }); }
  // the spotlight cone for the end
  W.spotBeam = shaft(ctx.scene, { from: v3(0, 31, MID + 2), to: v3(0, RT, MID), top: 0.4, bottom: 4.2, color: '#ffffff', amount: 0 }); g.add(W.spotBeam);
  W.specBeam = shaft(ctx.scene, { from: v3(-6, 31, 40), to: v3(-12 - 3 * 3.6, 3 * 1.3 + 2, SPEC.z), top: 0.3, bottom: 3.2, color: '#ffd6e8', amount: 0 }); g.add(W.specBeam);
  // camera flashes in the seats
  W.flashes = []; const r = rng(77);
  for (let i = 0; i < 26; i++) { const s = i % 2 ? 1 : -1, row = Math.floor(r() * 6); const sp = glowSprite('#ffffff', 5, 0); sp.material = sp.material.clone(); sp.position.set(s * (12 + row * 3.6) - s * 0.5, row * 1.3 + 4.6, 4 + r() * 60); sp.userData.noAO = true; g.add(sp); W.flashes.push({ sp, ph: r() * 10, rate: 0.6 + r() * 1.2 }); }
}

// red-velvet risers on both sides, and the seated crowd (instanced, so hundreds cost little)
function seating() {
  const g = W.hall, b = new Batch(), riser = paint('#14131a', { roughness: 0.4, metalness: 0.2 }), lip = paint('#b9bfcc', { metalness: 0.9, roughness: 0.25 });
  for (const s of [-1, 1]) for (let r = 0; r < 6; r++) { const x = s * (12 + r * 3.6), h = r * 1.3 + 0.01, cut = s < 0 && r <= 2, z1 = cut ? 47.5 : 69, zc = (-1 + z1) / 2, len = z1 + 1; if (r) b.box(riser, 3.6, h, len, x, h / 2, zc, { r: 0.04 }); b.box(lip, 0.12, 0.08, len, x - s * 1.8, h + 0.02, zc, { r: 0.02 }); }
  b.done(g);
  const seats = [], zs = []; for (let z = 4; z <= 64; z += 3) zs.push(z);
  for (const s of [-1, 1]) for (let r = 0; r < 6; r++) for (const z of zs) if (!(s < 0 && r <= 2 && z >= 48)) seats.push({ s, r, z, x: s * (12 + r * 3.6) + s * 0.4, y: r * 1.3 });
  W.seats = seats;
  const n = seats.length, M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = v3(1, 1, 1);
  const inst = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; g.add(m); return m; };
  const RB = (w, h, d) => { const k = new THREE.BoxGeometry(w, h, d); return k; };
  const base = inst(RB(2.4, 1.2, 2), velvet('#7a0f22')), back = inst(RB(2.4, 2.8, 0.4), velvet('#6a0c1d')), arm = inst(RB(0.3, 0.3, 2.1), paint('#c9a24a', { metalness: 0.85, roughness: 0.3 })), leg = inst(RB(2.2, 0.2, 0.2), paint('#22222a', { metalness: 0.6 }));
  seats.forEach((p, i) => {
    const yaw = p.s > 0 ? -Math.PI / 2 : Math.PI / 2; q.setFromEuler(e.set(0, yaw, 0));
    const at = (mesh, lx, ly, lz) => { const o = v3(lx, ly, lz).applyQuaternion(q); M.compose(v3(p.x + o.x, p.y + o.y, p.z + o.z), q, one); mesh.setMatrixAt(i, M); };
    at(base, 0, 0.8, 0); at(back, 0, 1.6, -1.2); at(arm, 1.35, 1.65, 0); at(leg, 0, 0.12, 0.6);
  });
  // seated people: hips on the cushion (1.4), back against the seat back
  const SK = ['#f3cfa8', '#e0ac7c', '#b97e50', '#8a5634', '#5c3a24'], SH = ['#d0392b', '#2e7bd6', '#2fa35a', '#f1b82d', '#8e44ad', '#e8e4dc', '#22252e', '#e8753a', '#37b8b0', '#d65d9b', '#c0c4cc', '#ff7eb6'], LG = ['#25324d', '#3a3f4a', '#6b5238', '#1f2024', '#55708f', '#e8e4dc'], HR = ['#2a1c12', '#5b3a1e', '#111114', '#b98a3a', '#7a2f1c', '#d8d0c0'];
  const r = rng(12), people = [];
  seats.forEach((p, i) => { if (p.s === SPEC.s && p.r === SPEC.r && p.z === SPEC.z) return; if (r() < 0.12) return; people.push({ ...p, i, ph: r() * 9, cheer: r() < 0.3, sc: 0.95 + r() * 0.08, long: r() < 0.45 }); });
  const k = people.length, RBX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const part = (geo) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.66 }), k); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; g.add(m); return m; };
  const torso = part(RBX(2, 2, 1)), head = part(RBX(1.25, 1.25, 1.25)), hair = part(RBX(1.36, 0.5, 1.36)), hairB = part(RBX(1.36, 1.5, 0.4)), thigh = part(RBX(1.9, 0.9, 1.95)), shin = part(RBX(1.9, 1.75, 0.9)), aL = part(RBX(0.9, 2, 0.9)), aR = part(RBX(0.9, 2, 0.9));
  const c = new THREE.Color(), pick = (a) => a[Math.floor(r() * a.length)];
  people.forEach((p, i) => { const sk = pick(SK); head.setColorAt(i, c.set(sk)); aL.setColorAt(i, c.set(sk)); aR.setColorAt(i, c.set(sk)); torso.setColorAt(i, c.set(pick(SH))); const lg = pick(LG); thigh.setColorAt(i, c.set(lg)); shin.setColorAt(i, c.set(lg)); const h = pick(HR); hair.setColorAt(i, c.set(h)); hairB.setColorAt(i, c.set(h)); });
  [torso, head, hair, hairB, thigh, shin, aL, aR].forEach((m) => { m.instanceColor.needsUpdate = true; });
  const B = new THREE.Matrix4(), Q = new THREE.Matrix4();
  const put = (mesh, i, x, y, z, rx = 0, rz = 0, py = 0) => { M.compose(v3(x, y, z), q.setFromEuler(e.set(rx, 0, rz)), one); if (py) { Q.makeTranslation(0, py, 0); M.multiply(Q); } mesh.setMatrixAt(i, B.clone().multiply(M)); };
  W.crowdG = [torso, head, hair, hairB, thigh, shin, aL, aR];
  W.crowd = (t, mode) => {
    people.forEach((p, i) => {
      const yaw = (p.s > 0 ? -Math.PI / 2 : Math.PI / 2) + (mode === 'look' ? 0 : Math.sin(t * 0.7 + p.ph) * 0.06);
      B.compose(v3(p.x, p.y, p.z), q.setFromEuler(e.set(0, yaw, 0)), v3(p.sc, p.sc, p.sc));
      const bounce = mode === 'cheer' && p.cheer ? Math.abs(Math.sin(t * 7 + p.ph)) * 0.25 : 0;
      put(torso, i, 0, 2.4 + bounce, -0.35); put(head, i, 0, 4.05 + bounce, -0.35); put(hair, i, 0, 4.55 + bounce, -0.38);
      if (p.long) put(hairB, i, 0, 3.7 + bounce, -0.85); else put(hairB, i, 0, -50, 0);
      put(thigh, i, 0, 1.85, 0.62); put(shin, i, 0, 0.88, 1.1);
      let rx = -0.25, rz = 0.06;
      if (mode === 'clap') { rx = -1.05; rz = 0.32 + 0.16 * Math.sin(t * 15 + p.ph); }
      if (mode === 'cheer') { rx = p.cheer ? -2.9 + Math.sin(t * 8 + p.ph) * 0.25 : -1.05; rz = p.cheer ? 0.12 : 0.32 + 0.16 * Math.sin(t * 15 + p.ph); }
      put(aL, i, -1.46, 3.3 + bounce, -0.35, rx, -rz, -1); put(aR, i, 1.46, 3.3 + bounce, -0.35, rx, rz, -1);
    });
    W.crowdG.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  };
  W.crowd(0, 'idle');
}

// ---- backstage: the lounge with the mirror wall ----
function lounge() {
  const g = new THREE.Group(); g.position.copy(LX); ctx.scene.add(g); W.lng = g;
  const b = new Batch(), tile = surf('tile', '#f4e4ec', { roughness: 0.22 }), wall = paint('#f6dce6', { roughness: 0.7 }), panel = paint('#efc8d8', { roughness: 0.55 }), gold = paint('#d9b062', { metalness: 0.9, roughness: 0.28 }),
    white = paint('#fbf6f8', { roughness: 0.35 }), mirror = new THREE.MeshStandardMaterial({ color: '#e8ecf4', metalness: 1, roughness: 0.03, envMapIntensity: 1 });
  W.mirrorM = mirror; W.cubeRT = new THREE.WebGLCubeRenderTarget(512, { type: THREE.HalfFloatType }); W.cubeCam = new THREE.CubeCamera(0.5, 200, W.cubeRT); W.cubeCam.position.copy(LX).add(v3(0, 6.5, -2)); ctx.scene.add(W.cubeCam);
  tile.userData.span = 6;
  const WX = 24, WZ0 = -16, WZ1 = 22, H = 16;
  b.box(tile, WX * 2, 0.4, WZ1 - WZ0, 0, -0.2, (WZ0 + WZ1) / 2, { r: 0.02 });
  b.box(paint('#f0d0dc', { roughness: 0.9 }), WX * 2, 0.4, WZ1 - WZ0, 0, H + 0.2, (WZ0 + WZ1) / 2, { r: 0.02 });
  // side walls with wainscot panels
  for (const s of [-1, 1]) { b.box(wall, 0.6, H, WZ1 - WZ0, s * (WX + 0.3), H / 2, (WZ0 + WZ1) / 2, { r: 0.01 }); b.box(panel, 0.3, 4, WZ1 - WZ0, s * (WX - 0.05), 2, (WZ0 + WZ1) / 2, { r: 0.02 }); b.box(gold, 0.4, 0.16, WZ1 - WZ0, s * (WX - 0.1), 4.05, (WZ0 + WZ1) / 2, { r: 0.04 }); for (let z = WZ0 + 3; z < WZ1; z += 5) b.box(gold, 0.36, 2.6, 3.4, s * (WX - 0.12), 2, z, { r: 0.04 }); }
  b.box(wall, WX * 2, H, 0.6, 0, H / 2, WZ1 + 0.3, { r: 0.01 });
  // the mirror wall: five mirrors with bulb frames; the middle one has a hole behind it (the alcove)
  const MZ = WZ0, MW = 5.6, MH = 7.4, MY = 7.8;
  b.box(wall, WX - MW / 2 - 0.4, H, 0.6, -(WX + MW / 2 + 0.4) / 2, H / 2, MZ - 0.3, { r: 0.01 }); b.box(wall, WX - MW / 2 - 0.4, H, 0.6, (WX + MW / 2 + 0.4) / 2, H / 2, MZ - 0.3, { r: 0.01 });
  b.box(wall, MW + 0.8, H - (MY + MH / 2 + 0.6), 0.6, 0, (H + MY + MH / 2 + 0.6) / 2, MZ - 0.3, { r: 0.01 }); b.box(wall, MW + 0.8, MY - MH / 2 - 0.6 - 0, 0.6, 0, (MY - MH / 2 - 0.6) / 2, MZ - 0.3, { r: 0.01 });
  // the vanity counter
  b.box(white, WX * 2 - 2, 0.35, 3, 0, 3.4, MZ + 1.5, { r: 0.08 }); b.box(paint('#e6b8ca', { roughness: 0.5 }), WX * 2 - 2, 3.2, 2.6, 0, 1.6, MZ + 1.3, { r: 0.08 });
  for (let x = -21; x <= 21; x += 3.5) b.box(gold, 0.1, 0.1, 0.5, x, 2.2, MZ + 2.62, { r: 0.03 });
  const bulbs = []; const mx = [-16, -8, 0, 8, 16];
  for (const x of mx) {
    if (x !== 0) { const mm = new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), mirror); mm.position.set(x, MY, MZ + 0.02); g.add(mm); }
    for (const [w, h, y, xx] of [[MW + 1.2, 0.5, MY + MH / 2 + 0.25, x], [MW + 1.2, 0.5, MY - MH / 2 - 0.25, x], [0.5, MH, MY, x - MW / 2 - 0.35], [0.5, MH, MY, x + MW / 2 + 0.35]]) b.box(gold, w, h, 0.3, xx, y, MZ + 0.12, { r: 0.08 });
    for (let i = 0; i < 6; i++) { bulbs.push(v3(x - MW / 2 + 0.3 + i * (MW - 0.6) / 5, MY + MH / 2 + 0.25, MZ + 0.42)); }
    for (let i = 0; i < 5; i++) { const y = MY - MH / 2 + 0.6 + i * (MH - 1.2) / 4; bulbs.push(v3(x - MW / 2 - 0.35, y, MZ + 0.42), v3(x + MW / 2 + 0.35, y, MZ + 0.42)); }
    // makeup: bottles, a brush cup, a palette
    const r = rng(x + 40);
    for (let i = 0; i < 4; i++) b.cyl(paint(['#ff8fb8', '#ffffff', '#c9a24a', '#9a7cff', '#ffd1a8'][i % 5], { roughness: 0.2, metalness: 0.2 }), 0.18, 0.22, 0.5 + r() * 0.5, x - 2 + i * 0.6 + r() * 0.2, 3.85 + r() * 0.1, MZ + 1.2 + r() * 0.6);
    b.box(paint('#222'), 1.4, 0.1, 0.9, x + 1.8, 3.62, MZ + 1.8, { r: 0.04 }); b.cyl(paint('#e8e0f0', { roughness: 0.3 }), 0.25, 0.22, 0.7, x + 2.4, 3.92, MZ + 1.0);
    // a stool
    b.cyl(velvet('#ff9cc4'), 1.0, 1.0, 0.5, x, 2.45, MZ + 5.2, { seg: 24 }); b.cyl(gold, 0.14, 0.2, 2.2, x, 1.1, MZ + 5.2); b.cyl(gold, 0.9, 0.9, 0.12, x, 0.06, MZ + 5.2, { seg: 24 });
  }
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.9, 2.5) }), bulbs.length), Mx = new THREE.Matrix4();
  bulbs.forEach((p, i) => { Mx.makeTranslation(p.x, p.y, p.z); bm.setMatrixAt(i, Mx); }); bm.userData.noAO = true; g.add(bm);
  W.bulbs = bulbs;
  // the sliding middle mirror (its own group so it can move)
  W.slider = new THREE.Group(); W.slider.position.set(0, MY, MZ + 0.05); g.add(W.slider);
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), mirror); W.slider.add(sm);
  W.crackLine = new THREE.Mesh(new THREE.PlaneGeometry(0.05, MH), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3.4), transparent: true, opacity: 0 })); W.crackLine.position.set(MW / 2 - 0.05, 0, 0.02); W.slider.add(W.crackLine);
  // the alcove behind it
  const ab = new Batch(), dark = paint('#1a1c26', { roughness: 0.4, metalness: 0.3 }), al = paint('#2a2e3e', { roughness: 0.5 });
  ab.box(al, MW + 0.8, 0.3, 9, 0, MY - MH / 2 - 0.45, MZ - 4.8, { r: 0.02 }); ab.box(al, MW + 0.8, 0.3, 9, 0, MY + MH / 2 + 0.45, MZ - 4.8, { r: 0.02 });
  for (const s of [-1, 1]) ab.box(al, 0.3, MH + 1.2, 9, s * (MW / 2 + 0.55), MY, MZ - 4.8, { r: 0.02 }); ab.box(dark, MW + 0.8, MH + 1.2, 0.3, 0, MY, MZ - 9.2, { r: 0.02 });
  ab.done(g);
  // the floor behind the mirror is the counter's height: the form stands on a mirrored plinth
  const fb = new Batch(); fb.cyl(paint('#e8ecf6', { metalness: 0.95, roughness: 0.12 }), 1.6, 1.8, 0.4, 0, MY - MH / 2 - 0.1, MZ - 4.6, { seg: 32 }); fb.cyl(paint('#c9ced8', { metalness: 0.95, roughness: 0.2 }), 0.12, 0.12, 2, 0, MY - MH / 2 + 0.9, MZ - 4.6); fb.done(g);
  W.formAt = v3(0, MY - MH / 2 + 0.1, MZ - 4.6);
  // clothing racks on the left, shoe shelves, a neon sign
  const rk = new Batch(), chrome = paint('#d8dce6', { metalness: 0.95, roughness: 0.2 }), r = rng(9);
  for (const z of [-6, 6]) { const x = -WX + 3; rk.cyl(chrome, 0.1, 0.1, 9, x, 6.2, z, { rx: Math.PI / 2 }); for (const q of [-4.5, 4.5]) { rk.cyl(chrome, 0.1, 0.1, 6.2, x, 3.1, z + q); rk.box(chrome, 1.8, 0.12, 0.12, x, 0.06, z + q, { r: 0.04 }); }
    for (let i = 0; i < 12; i++) { const zz = z - 4 + i * 0.7, col = ['#ff6fa8', '#ffffff', '#c9a24a', '#7c5cff', '#2e2e3a', '#ff3b5c', '#9fd8ff', '#ffd1e0'][Math.floor(r() * 8)]; rk.box(paint(col, { roughness: 0.75 }), 2.2 + r() * 0.4, 3.2 + r() * 1.4, 0.24, x, 4.3 - r() * 0.5, zz, { r: 0.08 }); } }
  rk.box(white, 1.6, 7, 10, WX - 1.2, 3.5, -9, { r: 0.08 }); for (let y = 1; y < 7; y += 1.5) { rk.box(gold, 1.7, 0.1, 10.1, WX - 1.2, y, -9, { r: 0.03 }); for (let i = 0; i < 6; i++) rk.box(paint(['#ff4f8a', '#111', '#ffffff', '#c9a24a', '#9a7cff'][(i + y) % 5 | 0], { roughness: 0.3, metalness: 0.2 }), 0.9, 0.5, 0.6, WX - 1.2, y + 0.32, -13.2 + i * 1.6, { r: 0.12 }); }
  rk.done(g);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = 'italic 900 150px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ff4fa0'; x.shadowBlur = 34; x.lineWidth = 10; x.strokeStyle = '#ff7ab8'; x.strokeText('DRESS TO WIN', w / 2, h / 2 + 6); x.fillStyle = '#ffe6f2'; x.fillText('DRESS TO WIN', w / 2, h / 2 + 6); }), transparent: true, depthWrite: false, color: new THREE.Color(1.8, 1.6, 1.7) }));
  neon.position.set(-WX + 0.35, 11.5, 0); neon.rotation.y = Math.PI / 2; neon.userData.noAO = true; g.add(neon);
  // the lounge: sofas, plants, a ring light, a long mirror, a round rug
  const so = sofa({ w: 12, color: '#ff9cc4', cushion: '#ffffff' }); so.position.set(14, 0, 12); so.rotation.y = -Math.PI / 2 - 0.3; g.add(so);
  const so2 = sofa({ w: 10, color: '#f4f0f6', cushion: '#ff9cc4' }); so2.position.set(8, 0, 19.5); so2.rotation.y = Math.PI; g.add(so2);
  for (const [x, z, sd] of [[-20, 18, 3], [20, -2, 5], [21, 19, 7]]) { const p = plant({ seed: sd, size: 1.2 }); p.position.set(x, 0, z); g.add(p); }
  const rb = new Batch(); rb.cyl(paint('#2a2a33', { metalness: 0.6 }), 0.1, 0.1, 9, 18, 4.5, 3); rb.cyl(paint('#2a2a33', { metalness: 0.6 }), 1, 1, 0.1, 18, 0.05, 3, { seg: 20 }); rb.done(g);
  const ringL = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.18, 10, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })); ringL.position.set(18, 9.4, 3); ringL.rotation.y = -0.9; ringL.userData.noAO = true; g.add(ringL);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#fff5f9'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8a8c4'; for (let i = 0; i < 8; i++) { x.lineWidth = 6; x.beginPath(); x.arc(256, 256, 30 + i * 28, 0, 7); x.stroke(); } }), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.03, 3); rug.receiveShadow = true; g.add(rug);
  // a chandelier: crystal drops around rings
  const ch = new THREE.Group(); ch.position.set(0, 14.5, 3); g.add(ch);
  const cr = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.2, roughness: 0.05, emissive: '#ffe8f4', emissiveIntensity: 0.7 }), 150), Mc = new THREE.Matrix4();
  for (let i = 0; i < 150; i++) { const ring = i % 3, a = i * 0.41 + ring, rad = 1.2 + ring * 1.0; Mc.makeTranslation(Math.cos(a) * rad, -0.6 - ring * 0.7 - (i % 5) * 0.2, Math.sin(a) * rad); cr.setMatrixAt(i, Mc); } cr.userData.noAO = true; ch.add(cr);
  for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(1.2 + k, 0.06, 6, 48), gold); t.rotation.x = Math.PI / 2; t.position.y = -0.4 - k * 0.7; ch.add(t); }
  const cg = glowSprite('#ffe6f2', 9, 0.5); cg.position.set(0, -1.2, 0); cg.userData.noAO = true; ch.add(cg);
  // ceiling downlights
  for (let x = -16; x <= 16; x += 8) for (const z of [-8, 14]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.4, 2.3) })); d.rotation.x = Math.PI / 2; d.position.set(x, H - 0.02, z); d.userData.noAO = true; g.add(d); }
  b.done(g);
  // the lobby's other players
  W.lcrowd = crowd({ count: 16, w: 30, d: 8, look: v3(0, 0, -6), cheer: 0, seed: 21 }); W.lcrowd.position.set(LX.x, 0, LX.z + 13); ctx.scene.add(W.lcrowd);
}

// ---- people ----
function people() {
  const sc = ctx.scene;
  W.pink = makeCharacter({ avatar: 'farm_bella_a', alti: true, skin: '#f2c79a', caustic: false }); sc.add(W.pink.root);
  W.silver = makeCharacter({ avatar: 'farm_silver_a', alti: true, skin: '#f2c79a', caustic: false }); sc.add(W.silver.root);
  W.rivals = [['farm_rival_red', '#f6d2b0'], ['farm_rival_gold', '#8e5a3a'], ['farm_rival_blue', '#d9a77c']].map(([a, s]) => { const c = makeCharacter({ avatar: a, alti: true, skin: s, caustic: false }); sc.add(c.root); return c; });
  W.judges = ['farm_rich_dominus', 'farm_grandma', 'farm_john'].map((a) => { const c = makeCharacter({ avatar: a, caustic: false }); sc.add(c.root); return c; });
  // the gown on Bella (on her hips, so it follows the walk), and the one on the dress form
  const H0 = W.silver.hipY ?? 2, sp = sparkleTex(); sp.wrapS = sp.wrapT = THREE.RepeatWrapping; W.sp = sp;
  W.gTop = 0.62; W.gH0 = H0;
  W.gown = gownGeo(); shapeGown(W.gown, W.gTop, H0, 0); W.gownM = gownMat(sp);
  const gm = new THREE.Mesh(W.gown, W.gownM); gm.castShadow = true; gm.receiveShadow = true; W.silver.hips.add(gm); W.gownMesh = gm;
  W.bands = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.6, 3.4), transparent: true, opacity: 0 })); m.rotation.x = Math.PI / 2; m.userData.noAO = true; W.silver.hips.add(m); return m; });
  W.glitter = sparkles(sc, { parent: W.silver.root, centre: v3(0, 3, 0), size: 2.6, height: 5, count: 70, color: '#ffffff', pointSize: 0.16 });
  // the dress form
  const df = dressForm({ hipY: H0, top: W.gTop, sparkle: sp }); df.g.position.copy(W.formAt); W.lng.add(df.g); W.form = df.g; W.formGeo = df.geo; W.formM = df.mat;
  const form = df.g;
  W.formGlit = sparkles(sc, { parent: form, centre: v3(0, H0, 0), size: 3.2, height: 5.5, count: 120, color: '#eef4ff', pointSize: 0.2 });
  // judges' star paddles
  W.paddles = W.judges.map(() => starPaddle(ARM));
  W.judges.forEach((j, i) => j.arms[1].add(W.paddles[i]));
}

// ---- lights ----
function rig() {
  W.pl = []; for (let i = 0; i < 9; i++) { const l = new THREE.PointLight('#ffffff', 0, 40, 1.5); ctx.scene.add(l); W.pl.push(l); }
  const spot = (c) => { const s = new THREE.SpotLight(c, 0, 80, 0.4, 0.55, 1.2); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0008; s.shadow.normalBias = 0.04; ctx.scene.add(s); ctx.scene.add(s.target); return s; };
  W.key = spot('#eef2ff'); W.spec = spot('#ffe0ee'); W.spec.castShadow = false;
}
function lightSet(set, t, focus) {
  const pl = W.pl, off = (i) => { for (let k = i; k < pl.length; k++) pl[k].intensity = 0; };
  W.key.intensity = 0; W.spec.intensity = 0;
  const fr = smooth(EV.freeze, EV.freeze + 0.5, t), dk = smooth(EV.spot - 0.3, EV.spot, t);
  if (set === 'hall') {
    const warm = tmpC.set('#e6ecff');
    // washes along the runway, the screen's glow, rims from behind
    for (let i = 0; i < 5; i++) { const l = pl[i]; l.position.set(i % 2 ? 9 : -9, 14, 4 + i * 14); l.color.copy(warm).lerp(tmpC.set('#8ea6ff'), fr); l.intensity = lerp(lerp(150, 110, fr), 4, dk); l.distance = 48; }
    pl[5].position.set(0, 14, SZ + 10); pl[5].color.copy(W.scrGlow || warm); pl[5].intensity = lerp(240, 120, dk); pl[5].distance = 60;
    pl[6].position.set(focus.x, focus.y + 8, focus.z - 7); pl[6].color.set('#cfdcff'); pl[6].intensity = lerp(70, 30, dk); pl[6].distance = 20;   // rim
    pl[7].position.set(-16, 10, 56); pl[7].color.set('#ffe6d0'); pl[7].intensity = lerp(60, 0, dk); pl[7].distance = 22;            // the judges
    pl[8].position.set(0, 9, -10); pl[8].color.set('#dfe6ff'); pl[8].intensity = lerp(90, 0, dk); pl[8].distance = 30;               // the stage line-up
    W.key.position.set(focus.x + 7, 26, focus.z + 16); W.key.target.position.copy(focus); W.key.color.set('#f4f6ff'); W.key.intensity = lerp(lerp(900, 700, fr), 0, dk); W.key.distance = 70; W.key.angle = 0.3;
    if (t >= EV.spot - 0.3) { W.key.position.set(MID === focus.z ? 0 : focus.x, 31, focus.z + 2); W.key.target.position.copy(focus); W.key.angle = 0.12; W.key.penumbra = 0.35; W.key.intensity = 1500 * smooth(EV.spot, EV.spot + 0.08, t); }
    else W.key.penumbra = 0.55;
    if (dk > 0) for (let i = 0; i < 5; i++) { const l = pl[i]; l.position.set(i % 2 ? 21 : -21, 13, 8 + i * 12); l.color.set('#6c7cc0'); l.intensity = lerp(l.intensity, 110, dk); l.distance = 34; }
    if (dk > 0) { const p = specPos(); pl[7].position.set(p.x + 5, p.y + 8, p.z + 2); pl[7].color.set('#d6cce8'); pl[7].intensity = 26 * dk; pl[7].distance = 14; }
    if (t >= EV.spec - 0.1) { const p = specPos(); W.spec.position.set(-6, 31, 40); W.spec.target.position.set(p.x, p.y + 3, p.z); W.spec.angle = 0.1; W.spec.penumbra = 0.6; W.spec.intensity = 420 * smooth(EV.spec, EV.spec + 0.5, t); }
  } else if (set === 'lounge' || set === 'alcove') {
    const o = LX;
    pl[0].position.set(o.x - 8, 11, o.z - 10); pl[0].color.set('#ffe6d6'); pl[0].intensity = 90; pl[0].distance = 30;
    pl[1].position.set(o.x + 8, 11, o.z - 10); pl[1].color.set('#ffe6d6'); pl[1].intensity = 90; pl[1].distance = 30;
    pl[2].position.set(o.x, 12, o.z + 4); pl[2].color.set('#ffd6e8'); pl[2].intensity = 110; pl[2].distance = 34;            // the chandelier
    pl[3].position.set(o.x - 18, 10, o.z); pl[3].color.set('#ff6fb0'); pl[3].intensity = 50; pl[3].distance = 22;             // the neon
    const op = smooth(EV.slide - 0.2, EV.slide + 1.2, t);
    pl[4].position.set(o.x, 8, o.z - 18.5); pl[4].color.set('#d8e4ff'); pl[4].intensity = 45 * op + (set === 'alcove' ? 25 : 0); pl[4].distance = 22;  // the alcove
    pl[5].position.set(o.x + 18, 9.4, o.z + 3); pl[5].color.set('#ffffff'); pl[5].intensity = 60; pl[5].distance = 26;         // the ring light
    off(6);
    W.key.position.set(o.x + 9, 15, o.z + 14); W.key.target.position.copy(focus); W.key.color.set('#fff0f4'); W.key.intensity = 520; W.key.distance = 60; W.key.angle = 0.42;
    if (set === 'alcove') { W.key.position.set(o.x + 2.5, 12, o.z - 9); W.key.target.position.set(o.x, 7, o.z - 20.6); W.key.color.set('#e6ecff'); W.key.intensity = 190; W.key.angle = 0.42; }
  } else off(0);
}
const specPos = () => { const p = W.seats.find((s) => s.s === SPEC.s && s.r === SPEC.r && s.z === SPEC.z); return v3(p.x, p.y, p.z); };

// ---- the screen ----
const F = (px, w = 900) => `${w} ${px}px ITTInter, sans-serif`;
function screenDraw(t, mode) {
  const x = W.scrX, w = 1024, h = 576, e = EV;
  const bg = (a, b) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, w, h); };
  const txt = (s, y, px, col, glow) => { x.font = F(px); x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = glow || col; x.shadowBlur = 24; x.fillStyle = col; x.fillText(s, w / 2, y); x.shadowBlur = 0; };
  const stars = (y, n, k) => { x.font = F(86); x.textAlign = 'center'; for (let i = 0; i < 5; i++) { x.fillStyle = i < n && k > i / 5 ? '#ffd23f' : 'rgba(255,255,255,0.18)'; x.fillText('★', w / 2 + (i - 2) * 110, y); } };
  let glow = '#cfd8ff';
  if (mode === 'lose') {
    bg('#14182a', '#05060c'); const n = Math.min(20, 1 + Math.floor(clamp((t - L(0).start) / (L(0).end - L(0).start - 0.2)) * 19.99));
    txt(`COMPETITION #${n}`, 120, 64, '#cfd8ff'); txt('RESULTS', 210, 46, '#8a94b8');
    const rows = [['1', 'xXStarGirlXx'], ['2', 'GoldenJay'], ['3', 'BlueBunny_09']]; x.font = F(40); x.textAlign = 'left';
    rows.forEach(([a, b], i) => { x.fillStyle = 'rgba(255,255,255,0.07)'; x.fillRect(220, 260 + i * 62, 584, 52); x.fillStyle = '#ffd23f'; x.fillText(a, 244, 288 + i * 62); x.fillStyle = '#e8ecff'; x.fillText(b, 300, 288 + i * 62); });
    x.fillStyle = 'rgba(255,40,70,0.22)'; x.fillRect(220, 470, 584, 56); x.fillStyle = '#ff4466'; x.fillText('20', 236, 500); x.fillText('Bella', 300, 500); x.textAlign = 'right'; x.fillText('LAST', 790, 500);
    glow = '#9fb0ff';
  } else if (mode === 'theme') {
    bg('#1a1030', '#06040e'); const k = smooth(L(6).start + 0.2, L(6).start + 0.9, t);
    x.globalAlpha = k; x.strokeStyle = '#e6d3ff'; x.lineWidth = 9; x.shadowColor = '#c58bff'; x.shadowBlur = 30; x.beginPath(); const cy = 170; x.moveTo(380, cy + 70); x.lineTo(400, cy - 30); x.lineTo(460, cy + 20); x.lineTo(512, cy - 60); x.lineTo(564, cy + 20); x.lineTo(624, cy - 30); x.lineTo(644, cy + 70); x.closePath(); x.stroke(); x.shadowBlur = 0;
    txt('THEME', 300, 40, '#b9a6e8'); txt('FUTURE ROYALTY', 390, 54, '#f2e6ff', '#c58bff'); x.globalAlpha = 1; glow = '#c58bff';
  } else if (mode === 'score' || mode === 'win' || mode === 'win2') {
    bg('#1a1a24', '#06060a');
    if (mode === 'score') { txt('JUDGES', 140, 48, '#cfd8ff'); stars(300, 5, smooth(e.j1, e.j3 + 0.3, t) * 1.01); txt('Bella', 440, 64, '#ffffff'); }
    else { txt(mode === 'win2' ? 'ROUND 2' : 'WINNER', 120, 48, '#cfd8ff'); txt('1ST PLACE', 280, 120, '#ffd23f', '#ffb000'); txt('Bella', 420, 70, '#ffffff'); glow = '#ffcf6a'; }
  } else if (mode === 'round') {
    bg('#101426', '#05060c'); txt('ROUND 2', 230, 120, '#e8ecff'); txt('THEME: FUTURE ROYALTY', 360, 40, '#b9a6e8');
  } else if (mode === 'wins') {
    bg('#1a1a24', '#06060a'); const k = clamp((t - e.outfits) / (L(12).end - e.outfits)), n = 3 + Math.floor(Math.pow(k, 1.6) * 96);
    txt(`ROUND ${n}`, 110, 52, '#cfd8ff'); txt('1ST PLACE', 270, 120, '#ffd23f', '#ffb000'); txt('Bella', 410, 70, '#ffffff'); glow = '#ffcf6a';
  } else if (mode === 'frozen') {
    bg('#1a1a24', '#06060a'); txt('1ST PLACE', 270, 120, '#ffd23f', '#ffb000'); txt('Bella', 410, 70, '#ffffff');
    const g = smooth(e.glitch - 0.3, e.glitch, t); if (g > 0) { const r = rng(Math.floor(t * 30)); for (let i = 0; i < 18 * g; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,40,70,0.5)' : 'rgba(200,220,255,0.4)'; x.fillRect(0, r() * h, w, 4 + r() * 20); } }
  } else if (mode === 'forever') {
    bg('#1c0408', '#050102'); const r = rng(Math.floor(t * 24)), j = (r() - 0.5) * 10 * (1 - smooth(e.forever, e.forever + 1.2, t));
    x.save(); x.translate(j, 0); txt('WINNER', 150, 104, '#ff3344', '#ff0022'); txt('SELECTED', 280, 104, '#ff3344', '#ff0022'); txt('FOREVER', 410, 104, '#ffffff', '#ff2244'); x.restore();
    for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(255,60,80,0.18)'; x.fillRect(0, r() * h, w, 2 + r() * 6); } glow = '#ff2a44';
  } else if (mode === 'count') {
    bg('#06060a', '#000'); const n = Math.max(1, 10 - Math.floor(Math.max(0, t - e.count) / 0.9));
    txt('NEXT ROUND BEGINS IN', 150, 48, '#cfd8ff'); txt(String(n), 350, 230, '#ff3344', '#ff0022'); glow = '#ff2a44';
  } else if (mode === 'dark') { bg('#020203', '#000'); txt(String(Math.max(1, 10 - Math.floor(Math.max(0, t - e.count) / 0.9))), 350, 230, 'rgba(255,51,68,0.85)', '#ff0022'); glow = '#5a0010'; }
  // scanlines
  x.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < h; y += 4) x.fillRect(0, y, w, 1);
  W.scrT.needsUpdate = true; W.scrGlow = tmpC.set(glow).clone();
}

// ---- HUD ----
function hudInit() { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; c.style.cssText = 'position:absolute;inset:0;pointer-events:none;'; ctx.grade.after(c); W.hud = c; W.h2 = c.getContext('2d'); }
const pop = (k) => { const c = clamp(k), o = 1 + 2.2 * Math.pow(c - 1, 3) + 1.2 * Math.pow(c - 1, 2); return c <= 0 ? 0 : o; };
function rr(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
function chip(x, label, value, col, y = 96, x0 = 52) {
  x.font = F(24); const lw = x.measureText(label).width; x.font = F(36); const vw = Math.max(x.measureText('00').width, x.measureText(value).width), w = lw + vw + 66;
  x.fillStyle = 'rgba(10,10,18,0.8)'; rr(x, x0, y, w, 62, 31); x.fill(); x.strokeStyle = col; x.lineWidth = 4; x.stroke();
  x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = F(24); x.fillStyle = '#c9d0ea'; x.fillText(label, x0 + 26, y + 32); x.font = F(36); x.fillStyle = col; x.fillText(value, x0 + 40 + lw, y + 33); x.textBaseline = 'alphabetic';
  return w;
}
function toast(x, t, t0, line1, line2, col) {
  const k = pop((t - t0) / 0.26); if (k <= 0) return;
  x.save(); x.translate(540, 420); x.scale(k, k); x.fillStyle = 'rgba(16,12,6,0.9)'; rr(x, -410, -110, 820, 220, 34); x.fill(); x.strokeStyle = col; x.lineWidth = 8; x.stroke();
  x.textAlign = 'center'; x.fillStyle = col; x.font = F(92); x.fillText(line1, 0, 10); x.fillStyle = '#ffffff'; x.font = F(44); x.fillText(line2, 0, 72); x.restore();
}
function menu(x, t) {
  const e = EV, k = pop((t - e.menu) / 0.25); if (k <= 0) return;
  x.fillStyle = `rgba(0,0,0,${0.45 * clamp((t - e.menu) / 0.2)})`; x.fillRect(0, 0, 1080, 1920);
  x.save(); x.translate(540, 560); x.scale(k, k);
  x.fillStyle = 'rgba(28,30,38,0.96)'; rr(x, -440, -330, 880, 600, 30); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 3; x.stroke();
  x.textAlign = 'left'; x.font = F(40); x.fillStyle = '#ffffff'; x.fillText('Players', -390, -258); x.fillStyle = '#9aa0b4'; x.fillText('Settings', -170, -258); x.fillText('Help', 70, -258);
  x.fillStyle = '#3c3f4c'; x.fillRect(-440, -226, 880, 3);
  x.font = F(36); x.fillStyle = '#e8ecff'; x.fillText('Bella', -330, -150); x.fillStyle = '#5a5e70'; x.beginPath(); x.arc(-375, -162, 26, 0, 7); x.fill();
  // the buttons
  const gone = smooth(e.gone - 0.05, e.gone + 0.35, t), r = rng(Math.floor(t * 30));
  const btn = (bx, label, col, alpha = 1, jit = 0) => { x.globalAlpha = alpha; x.fillStyle = col; rr(x, bx + jit, 120, 250, 96, 18); x.fill(); x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.font = F(36); x.fillText(label, bx + 125 + jit, 182); x.globalAlpha = 1; x.textAlign = 'left'; };
  btn(-400, 'Reset', '#3c3f4c'); btn(-125, 'Resume', '#3c3f4c');
  if (gone < 1) { btn(150, 'Leave', '#e8364e', 1 - gone, gone > 0 ? (r() - 0.5) * 40 : 0); if (gone > 0) for (let i = 0; i < 6; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,60,80,0.8)' : 'rgba(255,255,255,0.6)'; x.fillRect(150 + r() * 250, 120 + r() * 96, 20 + r() * 80, 4 + r() * 10); } }
  else { x.setLineDash([12, 10]); x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 4; rr(x, 150, 120, 250, 96, 18); x.stroke(); x.setLineDash([]); }
  // the cursor: moves to Leave, clicks
  const m = smooth(e.menu + 0.3, e.click, t), cx = lerp(-60, 270, m), cy = lerp(-20, 172, m), press = t > e.click && t < e.click + 0.14 ? 0.85 : 1;
  x.save(); x.translate(cx, cy); x.scale(press, press); x.fillStyle = '#ffffff'; x.strokeStyle = '#000'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 54); x.lineTo(14, 42); x.lineTo(24, 64); x.lineTo(34, 59); x.lineTo(24, 38); x.lineTo(42, 38); x.closePath(); x.fill(); x.stroke(); x.restore();
  x.restore();
}
function drawHud(t, n) {
  const x = W.h2; x.clearRect(0, 0, 1080, 1920); if (ctx.thumbMode) return;
  const e = EV;
  if (n === 'open') { const k = clamp((t - L(0).start) / (L(0).end - L(0).start - 0.2)); const w = chip(x, 'COMPETITIONS', String(Math.min(20, 1 + Math.floor(k * 19.99))), '#cfd8ff'); chip(x, 'WINS', '0', '#ff4466', 96, 52 + w + 16); }
  if (n === 'lose') { const w = chip(x, 'COMPETITIONS', '20', '#cfd8ff'); chip(x, 'WINS', '0', '#ff4466', 96, 52 + w + 16); }
  if (n === 'first') toast(x, t, e.conf1 + 0.1, '1ST PLACE', 'WINS: 1', '#ffd23f');
  if (n === 'round2') chip(x, 'WINS', t > e.conf2 ? '2' : '1', '#ffd23f');
  if (n === 'outfits' || n === 'loved') { const k = clamp((t - e.outfits) / (L(12).end - e.outfits)), w = n === 'loved' ? 99 : 3 + Math.floor(Math.pow(k, 1.6) * 96); chip(x, 'WINS', String(w), '#ffd23f'); }
  if (n === 'menu') menu(x, t);
}

// ---- helpers for hands and walks ----
function modelWalk(c, t, amp = 0.45) { pose(c, 'walk', t); const [Lg, Rg] = c.legs, [A, B] = c.arms; Lg.rotation.x *= amp; Rg.rotation.x *= amp; A.rotation.x *= 0.6; B.rotation.x *= 0.6; A.rotation.z = -0.19; B.rotation.z = 0.19; c.torso.rotation.y = Math.sin(t * 7.5) * 0.06; }
function faceOf(c, name, t, ph, o = {}) { c.setFace(name, { blink: o.blink !== false && blinkAt(t, ph) && !['shocked', 'terrified', 'gasp'].includes(name), viseme: o.viseme }); }
const OUTFITS = ['#ffd27a', '#ff5a7a', '#7fa8ff', '#2b2b36', '#b48cff', '#ffffff', '#7affc8'];
function tintSilver(col) {
  if (!W.tintMats) { W.tintMats = []; W.silver.root.traverse((o) => { if (o.isMesh && o.material && !o.material.isMeshBasicMaterial && o !== W.gownMesh && /torso|leg|foot/i.test(o.material.name || '')) { o.material = o.material.clone(); W.tintMats.push({ m: o.material, c: o.material.color.clone() }); } }); }
  W.tintMats.forEach(({ m, c }) => m.color.copy(c).multiply(tmpC.set(col)));
  W.gownM.color.set('#c9cfdc').multiply(tmpC.set(col));
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, S = [], add = (name, t0, f) => S.push({ name, t0: () => t0, f, t1: () => 0 });
  add('open', 0, (u, t) => { const z = walkZ(t, 0, 24, 44, 6.4); return { pos: v3(lerp(-2.6, -1.8, u), lerp(7.4, 7.0, u), z + lerp(14.5, 13, u)), look: v3(0, 6.2, z - 3), fov: 58 }; });
  add('lose', s(1) - 0.1, (u) => ({ pos: lp3(v3(1.8, 6.0, END + 10.5), v3(1.3, 6.0, END + 9.2), easeOut(u)), look: v3(0, 5.6, END), fov: 54 }));
  add('vanity', s(2) - 0.1, (u) => ({ pos: LX.clone().add(lp3(v3(3.4, 7.8, -2.6), v3(2.4, 7.6, -3.8), easeInOut(u))), look: LX.clone().add(v3(-0.4, lerp(6.0, 7.0, easeInOut(u)), -14)), fov: 56 }));
  add('dress', s(3) - 0.1, (u) => ({ pos: LX.clone().add(lp3(v3(0.4, 8.4, -9), v3(0.2, 8.0, -12), easeOut(u))), look: LX.clone().add(v3(0, 7.0, -20.6)), fov: 46 }));
  add('diamonds', s(4) - 0.1, (u) => ({ pos: LX.clone().add(v3(lerp(-1.6, 1.2, u), 7.4, -14.2)), look: LX.clone().add(v3(0, 6.6, -20.6)), fov: 30 }));
  add('change', s(5) - 0.1, (u) => ({ pos: LX.clone().add(lp3(v3(0.6, 5.6, 9.5), v3(0.4, 5.4, 8.4), u)), look: LX.clone().add(v3(0, 4.6, -2)), fov: 56 }));
  add('silent', e.silent, (u) => ({ pos: LX.clone().add(lp3(v3(-4.2, 8.4, -12.5), v3(-3.6, 8.2, -13.4), u)), look: LX.clone().add(v3(0.5, 4.0, 6)), fov: 60 }));
  add('theme', s(6) - 0.1, (u) => ({ pos: lp3(v3(-2, 12, 96), v3(-1, 10.5, 86), easeOut(u)), look: v3(0, 13, -10), fov: 58 }));
  add('enter', s(7) - 0.1, (u, t) => { const z = walkZ(t, s(7) + 0.2, -12, 10); return { pos: v3(1.2, 5.2, z + 17), look: v3(0, 8.6, z), fov: 62 }; });
  add('judges', s(8) - 0.1, (u) => ({ pos: lp3(v3(-3.5, 7.2, 45.5), v3(-4.2, 7.0, 46.5), u), look: v3(-18, 5.4, 56.2), fov: 54 }));
  add('first', s(9) - 0.1, (u) => ({ pos: lp3(v3(1.4, 5.4, END + 13), v3(1.0, 5.6, END + 11.5), easeOut(u)), look: v3(0, 6.4, END), fov: 56 }));
  add('round2', s(10) - 0.1, (u, t) => { const z = walkZ(t, s(10), 20, END, 9); return { pos: v3(3.2, 6.0, z + 12), look: v3(0, 5.8, z), fov: 56 }; });
  add('outfits', s(12) - 0.1, (u) => { const a = lerp(-0.35, 0.35, u); return { pos: v3(Math.sin(a) * 11, 5.4, END + Math.cos(a) * 11), look: v3(0, 5.8, END), fov: 52 }; });
  add('loved', s(13) - 0.1, (u) => ({ pos: lp3(v3(-2.2, 5.8, END + 8.6), v3(-1.8, 5.8, END + 7.6), u), look: v3(0, 6.3, END), fov: 50 }));
  add('freeze', s(14) - 0.1, (u) => ({ pos: lp3(v3(1.2, 7.2, 14), v3(0.8, 7.0, 12.5), u), look: v3(-2.2, 5.6, -9.5), fov: 60 }));
  add('faces', s(15) - 0.1, (u) => ({ pos: v3(lerp(-9.6, 5.2, easeInOut(u)), 7.8, 1.5), look: v3(lerp(-9, 4.6, easeInOut(u)), 6.0, -9.5), fov: 44 }));
  add('screen', s(16) - 0.1, (u) => ({ pos: lp3(v3(4, 4.4, MID + 12), v3(3, 5.4, MID + 9), easeOut(u)), look: v3(0, 13, SZ), fov: 60 }));
  add('forever', e.forever - 0.05, (u) => ({ pos: lp3(v3(0, 15, 26), v3(0, 16, 20), easeOut(u)), look: v3(0, 16.6, SZ), fov: 58 }));
  add('menu', s(18) - 0.1, (u) => ({ pos: lp3(v3(0.8, 5.0, MID + 11), v3(0.6, 5.2, MID + 10), u), look: v3(0, 7.2, MID), fov: 52 }));
  add('tight', s(20) - 0.1, (u) => ({ pos: lp3(v3(2.6, 4.6, MID + 10.5), v3(1.6, 4.8, MID + 8.6), easeOut(u)), look: v3(0, 4.9, MID), fov: 56 }));
  add('spot', s(21) - 0.1, (u) => ({ pos: lp3(v3(0, 19, MID + 30), v3(0, 17, MID + 25), easeOut(u)), look: v3(0, 4, MID), fov: 50 }));
  add('count', s(23) - 0.1, (u) => ({ pos: lp3(v3(-1.8, 6.2, MID + 9.5), v3(-1.6, 6.3, MID + 8.5), u), look: v3(-1.0, 10, SZ + 20), fov: 62 }));
  add('audience', s(24) - 0.1, (u) => ({ pos: lp3(v3(-4.6, 6.4, MID + 8), v3(-4.0, 6.4, MID + 7), u), look: v3(0, 5.8, MID), fov: 52 }));
  add('empty', s(25) - 0.1, (u) => { const a = lerp(-0.4, 0.5, easeInOut(u)); return { pos: v3(1, 7.6, 30), look: v3(30, 6.0, 30 + Math.sin(a) * 34), fov: 60 }; });
  add('one', s(26) - 0.1, (u) => { const p = specPos(); return { pos: lp3(v3(-1, 8.6, p.z + 7), v3(-3.5, 8.6, p.z + 5), easeInOut(u)), look: p.clone().add(v3(0, 3.6, 0)), fov: 52 }; });
  add('reveal', s(27) - 0.1, (u) => { const p = specPos(); return { pos: lp3(v3(p.x + 16, p.y + 4.8, p.z + 5), v3(p.x + 10.5, p.y + 4.0, p.z + 3.6), easeInOut(u)), look: p.clone().add(v3(0, 3.7, 0)), fov: lerp(46, 44, u) }; });
  S.forEach((x, i) => { if (S[i + 1]) { const v = S[i + 1].t0(); x.t1 = () => v; } });
  S[S.length - 1].t1 = () => ctx.dur + 1;
  return S;
}

// ---- a frame ----
function renderAt(t) {
  const first = !ctx.sub || ctx.sub.i === 0, sh = shotAt(W.shots, t), n = sh.name, e = EV, s = (i) => L(i).start;
  const loungeShots = ['vanity', 'dress', 'diamonds', 'change', 'silent'];
  const set = loungeShots.includes(n) ? (n === 'dress' || n === 'diamonds' ? 'alcove' : 'lounge') : 'hall';
  const pal = set !== 'hall' ? LOUNGE : t >= e.spot ? DARK : t >= e.freeze ? mixP(HALL, COLD, smooth(e.freeze, e.freeze + 0.6, t)) : HALL;
  applyEnv(ctx, pal);
  W.hall.visible = set === 'hall'; W.lng.visible = W.lcrowd.visible = set !== 'hall';
  const P = W.pink, Sv = W.silver, R = W.rivals, J = W.judges;
  [P, Sv, ...R, ...J].forEach((c) => { c.root.visible = false; c.root.rotation.set(0, 0, 0); c.root.position.set(0, -100, 0); });
  W.glitter.visible = false; W.bands.forEach((b) => { b.material.opacity = 0; });
  let focus = v3(0, 5, END), tight = 0;

  // ---- the hall ----
  if (set === 'hall') {
    const mode = n === 'open' || n === 'lose' ? 'lose' : n === 'theme' || n === 'enter' ? 'theme' : n === 'judges' ? 'score' : n === 'first' ? 'win' : n === 'round2' ? (t < e.conf2 - 0.6 ? 'round' : 'win2') : n === 'outfits' || n === 'loved' ? 'wins'
      : n === 'freeze' || n === 'faces' || (n === 'screen' && t < e.forever - 0.1) ? 'frozen' : n === 'screen' || n === 'forever' || n === 'menu' || n === 'tight' ? 'forever' : n === 'spot' ? (t < e.spot ? 'forever' : 'dark') : n === 'count' ? 'count' : 'dark';
    if (first) screenDraw(t, mode);
    // LEDs, beams, flashes
    const fr = smooth(e.freeze, e.freeze + 0.5, t), dk = smooth(e.spot - 0.3, e.spot, t), red = smooth(e.forever - 0.2, e.forever + 0.4, t) * (1 - dk);
    W.ledM.color.copy(tmpC.set('#dfe6ff').lerp(tmpC.clone().set('#ff2244'), red)).multiplyScalar(lerp(2.4, 0.15, dk));
    W.scrM.color.setScalar(lerp(1.25, 0.9, dk));
    W.heads.forEach(({ from, beam, i, bar }) => { const sw = t < e.freeze ? t : e.freeze, a = Math.sin(sw * 0.6 + i * 1.3) * 0.5, to = bar ? v3(from.x * 0.3 + Math.sin(sw * 0.8 + i) * 4, RT, from.z + 6 + Math.cos(sw * 0.7 + i) * 6) : v3(from.x * 0.4 + Math.sin(a) * 14, 0, 18 + Math.cos(sw * 0.5 + i) * 16);
      beam.quaternion.setFromUnitVectors(v3(0, -1, 0), to.sub(from).normalize()); beam.material.uniforms.amount.value = (bar ? 0.06 : 0.1) * (1 - dk) * (1 - 0.4 * fr); beam.material.uniforms.color.value.copy(tmpC.set('#dfe7ff').lerp(tmpC.clone().set('#ff3355'), red * 0.7)); });
    W.spotBeam.material.uniforms.amount.value = 0.34 * smooth(e.spot, e.spot + 0.08, t);
    W.specBeam.material.uniforms.amount.value = 0.13 * smooth(e.spec, e.spec + 0.5, t);
    W.flashes.forEach(({ sp, ph, rate }) => { const on = t < e.freeze && ['enter', 'first', 'round2', 'outfits', 'loved', 'open'].includes(n); const f = (t * rate + ph) % 1; sp.material.opacity = on && f < 0.06 ? 0.9 : 0; });
    // the crowd
    const cmode = t >= e.freeze ? 'idle' : ['first', 'loved'].includes(n) || (n === 'round2' && t > e.conf2) || n === 'outfits' ? 'cheer' : ['enter', 'judges', 'round2'].includes(n) ? 'clap' : 'idle';
    W.crowd(Math.min(t, e.freeze), cmode);
    W.crowdG.forEach((m) => { m.visible = !['audience', 'empty', 'one', 'reveal'].includes(n) && !(n === 'count' && t > s(24) - 0.2); });

    // Bella on the runway
    const B = n === 'open' || n === 'lose' ? P : Sv; B.root.visible = true;
    const bp = B.root.position; let walking = false;
    if (n === 'open') { const z = walkZ(t, 0, 24, 44, 6.4); bp.set(0, RT, z); walking = z < 44; }
    else if (n === 'lose') bp.set(0, RT, END);
    else if (n === 'theme') { bp.set(0, RT, -14); }
    else if (n === 'enter') { const z = walkZ(t, s(7) + 0.2, -12, 10); bp.set(0, RT, z); walking = true; }
    else if (n === 'judges') { const z = walkZ(t, s(7) + 0.2, -12, 54, 7.6); bp.set(0, RT, Math.min(z, 54)); walking = z < 54; }
    else if (n === 'first' || n === 'outfits' || n === 'loved') bp.set(0, RT, END);
    else if (n === 'round2') { const z = walkZ(t, s(10), 20, END, 9); bp.set(0, RT, z); walking = z < END; }
    else bp.set(0, RT, MID);
    B.root.rotation.y = 0;
    if (walking) { if (B === Sv) modelWalk(B, t); else pose(B, 'walk', t); }
    else pose(B, 'idle', t);
    focus = bp.clone().add(v3(0, 3, 0));
    if (B === P) {
      faceOf(P, n === 'lose' ? 'nervous' : 'nervous', t, 0.3);
      if (n === 'lose') { P.neck.rotation.x = 0.22; P.torso.rotation.x = 0.06; }
    } else {
      W.glitter.visible = true; let face = 'happy';
      if (n === 'theme' || n === 'enter') face = 'smug';
      if (n === 'judges') face = 'surprised';
      if (n === 'first' || n === 'round2' || n === 'outfits') { face = 'laugh'; if (!walking) { const [A, Bm] = Sv.arms; Bm.rotation.z = 2.5 + Math.sin(t * 8) * 0.2; A.rotation.z = -0.5; A.rotation.x = -0.2; } }
      if (n === 'loved') { face = 'grin'; Sv.arms[1].rotation.z = 2.6 + Math.sin(t * 9) * 0.35; Sv.arms[0].rotation.z = -0.2; }
      if (['freeze', 'faces'].includes(n)) face = 'nervous';
      if (n === 'screen' || n === 'forever') { face = t > e.forever ? 'shocked' : 'suspicious'; Sv.root.rotation.y = Math.PI; Sv.neck.rotation.x = -0.35; }
      if (n === 'menu') face = 'nervous';
      if (n === 'tight') { face = t > e.tight ? 'shocked' : 'scared'; tight = smooth(e.tight, e.tight + 1.6, t); Sv.torso.rotation.x = -0.05 * tight; Sv.arms.forEach((a, i) => { a.rotation.x = -0.25 * tight; a.rotation.z = (i ? 0.19 : -0.19) + (i ? 0.08 : -0.08) * tight; }); }
      if (n === 'spot') { face = 'scared'; tight = 1; Sv.neck.rotation.x = -0.45 * smooth(e.spot, e.spot + 0.4, t); }
      if (n === 'count') { face = 'terrified'; tight = 1; Sv.root.rotation.y = Math.PI; Sv.neck.rotation.x = -0.3; }
      if (n === 'audience') { face = t > e.turn + 0.3 ? 'shocked' : 'scared'; tight = 1; Sv.root.rotation.y = lerp(0, -0.95, smooth(e.turn, e.turn + 0.6, t)); Sv.neck.rotation.y = -0.25 * smooth(e.turn, e.turn + 0.6, t); }
      if (['empty', 'one', 'reveal'].includes(n)) { face = 'shocked'; tight = 1; Sv.root.rotation.y = -1.2; }
      if (n === 'first' || n === 'outfits') { if (!walking) Sv.root.rotation.y = Math.sin(t * 2) * 0.15; }
      faceOf(Sv, face, t, 0.3);
      // the outfit cycle
      if (n === 'outfits') { const k = Math.floor((t - e.outfits) / 0.42); tintSilver(OUTFITS[((k % OUTFITS.length) + OUTFITS.length) % OUTFITS.length]); } else tintSilver('#ffffff');
      // arms clear of the gown
      if (!walking && !['first', 'round2', 'outfits', 'loved', 'tight'].includes(n)) { Sv.arms[0].rotation.z = Math.min(Sv.arms[0].rotation.z, -0.19); Sv.arms[1].rotation.z = Math.max(Sv.arms[1].rotation.z, 0.19); }
    }
    // the rivals, posed on the stage, then frozen
    if (['theme', 'freeze', 'faces', 'screen', 'enter'].includes(n) || (n === 'first' && false)) {
      const tf = Math.min(t, e.freeze), xs = [-9, -4.5, 4.5];
      R.forEach((c, i) => { c.root.visible = true; c.root.position.set(n === 'enter' ? xs[i] * 1.6 : xs[i], ST, -9 - (i === 1 ? 1 : 0)); c.root.rotation.y = (i - 1) * -0.18 + (n === 'enter' ? 0.3 * Math.sign(xs[i]) : 0);
        pose(c, 'idle', tf + i); const [A, Bm] = c.arms, ph = tf * 1.6 + i * 2;
        if (i === 0) { A.rotation.z = -0.6 - 0.1 * Math.sin(ph); A.rotation.x = -0.3; Bm.rotation.z = 1.2 + 0.25 * Math.sin(ph); Bm.rotation.x = -0.3; }
        else if (i === 1) { A.rotation.z = -0.55; Bm.rotation.z = 0.55; c.torso.rotation.y = 0.2 * Math.sin(ph * 0.7); }
        else { Bm.rotation.x = -1.4 - 0.2 * Math.sin(ph); Bm.rotation.z = 0.2; A.rotation.z = -0.5; c.neck.rotation.z = 0.12 * Math.sin(ph); }
        const frz = t >= e.freeze; faceOf(c, frz ? ['grin', 'smug', 'happy'][i] : ['grin', 'smug', 'happy'][i], tf, 0.7 + i, { blink: !frz });
      });
    }
    // the judges with their paddles
    W.paddles.forEach((p) => { p.visible = false; });
    if (['judges', 'first', 'enter', 'round2', 'loved', 'outfits', 'open', 'lose'].includes(n)) {
      J.forEach((c, i) => { c.root.visible = true; c.root.position.set(-18.4, 0, 51.5 + i * 4.5); c.root.rotation.y = Math.PI / 2 + (n === 'judges' ? 0.15 : 0.3); pose(c, 'idle', t + i * 2);
        const up = n === 'judges' ? smooth([e.j1, e.j2, e.j3][i] - 0.25, [e.j1, e.j2, e.j3][i], t) : n === 'first' ? 1 : 0;
        if (up > 0) { W.paddles[i].visible = true; c.arms[1].rotation.x = lerp(0, -2.75, up); c.arms[1].rotation.z = 0.12; }
      });
    }
    // the spectator in the seat: always there, lit only at the end
    const p = specPos(), sp = P;
    if (B !== P) {
      sp.root.visible = true; pose(sp, 'sit', t); sp.root.rotation.y = Math.PI / 2;
      const hy = sp.hips.position.y; sp.root.position.set(p.x - 0.42, p.y + 1.4 - (hy - 0.5) + 0.02, p.z);
      faceOf(sp, t >= e.clap ? 'smug' : 'neutral', t, 0.9);
      if (t >= e.clap - 0.6) { const k = smooth(e.clap - 0.6, e.clap, t), c = t > e.clap ? Math.pow(Math.abs(Math.sin((t - e.clap) * Math.PI / 0.62)), 0.5) : 0; const [A, Bm] = sp.arms;
        A.rotation.x = lerp(-0.9, -1.25, k); Bm.rotation.x = lerp(-0.9, -1.25, k); A.rotation.z = lerp(0, 0.36 + 0.22 * (1 - c), k); Bm.rotation.z = -A.rotation.z; }
      sp.neck.rotation.x = 0.05;
    }
  }

  // ---- the lounge ----
  if (set !== 'hall') {
    const o = LX, slide = smooth(e.slide, e.slide + 1.3, t);
    W.slider.position.x = -6.4 * easeInOut(slide); W.crackLine.material.opacity = smooth(e.slide - 0.5, e.slide, t) * (1 - slide);
    W.lcrowd.visible = n === 'silent' || n === 'change';
    W.lcrowd.update(n === 'silent' ? 0.5 : t);
    const fk = 0; W.gownM.color.set('#9aa1b2');
    shapeGown(W.formGeo, W.gTop, W.gH0, fk, t);
    if (n === 'vanity') {
      P.root.visible = true; const up = smooth(e.slide + 0.3, e.slide + 1.2, t);
      pose(P, 'sit', t); const hy = P.hips.position.y;
      P.root.position.set(o.x, lerp(2.7 - (hy - 0.5), 0, up), o.z - 10.6 - 0.2 * up + 1.9 * up); P.root.rotation.y = Math.PI;
      if (up > 0) { pose(P, 'idle', t); P.root.position.y = 0; P.root.position.z = o.z - 8.4; }
      faceOf(P, t > e.slide ? 'surprised' : 'sad', t, 0.3); if (t < e.slide) { P.neck.rotation.x = 0.3; P.arms[0].rotation.x = -0.75; P.arms[1].rotation.x = -0.75; }
      focus = P.root.position.clone().add(v3(0, 4, 0));
    }
    if (n === 'change') {
      const k = clamp((t - (e.swap - 0.7)) / 1.4), spin = easeInOut(k) * Math.PI * 4, swapped = t >= e.swap;
      const B = swapped ? Sv : P; B.root.visible = true; B.root.position.set(o.x, 0, o.z - 2); B.root.rotation.y = spin; pose(B, 'idle', t);
      if (B === Sv) { W.glitter.visible = true; Sv.arms[0].rotation.z = -0.13 - 0.5 * (1 - k); Sv.arms[1].rotation.z = 0.13 + 0.5 * (1 - k); } else { P.arms[0].rotation.z = -0.4 * k; P.arms[1].rotation.z = 0.4 * k; }
      faceOf(B, swapped ? 'smug' : 'surprised', t, 0.3);
      focus = v3(o.x, 4, o.z - 2);
    }
    if (n === 'silent') {
      Sv.root.visible = true; Sv.root.position.set(o.x, 0, o.z - 2); Sv.root.rotation.y = 0; pose(Sv, 'idle', t); W.glitter.visible = true; faceOf(Sv, 'smug', t, 0.3);
      Sv.arms[0].rotation.z = -0.19; Sv.arms[1].rotation.z = 0.19;
      R.forEach((c, i) => { c.root.visible = true; c.root.position.set(o.x + [-5.5, 0.5, 6][i], 0, o.z + 7 + (i === 1 ? 1.5 : 0)); c.root.rotation.y = Math.PI + [0.4, 0, -0.45][i]; pose(c, 'idle', 0.4); faceOf(c, ['shocked', 'surprised', 'shocked'][i], t, 0.6 + i, { blink: false }); });
      focus = v3(o.x, 4, o.z - 2);
    }
    if (n === 'dress' || n === 'diamonds') focus = o.clone().add(v3(0, 6, -20.6));
  }
  // the gown: shape, sparkle drift, bands
  W.sp.offset.set((t * 0.05) % 1, (t * 0.031) % 1);
  shapeGown(W.gown, W.gTop, W.gH0, tight, t);
  if (tight > 0) W.bands.forEach((b, i) => { const y = [0.2, -0.7, -1.5][i], k = clamp(tight * 1.3 - i * 0.15), r = lerp(1.7, [1.13, 1.17, 1.2][i], easeOut(k)); b.position.y = y; b.scale.set(r, r * lerp(0.62, 0.8, (0.62 - y) / (0.62 + W.gH0)), 1); b.material.opacity = 0.9 * clamp(k * 3) * (0.75 + 0.25 * Math.sin(t * 9 + i)); });
  W.gownM.emissiveIntensity = 0.42 + 0.7 * tight * (0.6 + 0.4 * Math.sin(t * 7));

  lightSet(set, t, focus);
  if (set !== 'hall' && !W.mirrorDone) { W.mirrorDone = true; const hid = []; ctx.scene.traverse((o) => { if (o.isMesh && o.material === W.mirrorM && o.visible) { o.visible = false; hid.push(o); } });
    const cv = [P, Sv, ...R, ...J].map((c) => c.root.visible); [P, Sv, ...R, ...J].forEach((c) => { c.root.visible = false; }); const lv = W.lcrowd.visible; W.lcrowd.visible = true; const sx = W.slider.position.x; W.slider.position.x = 0;
    W.cubeCam.update(ctx.renderer, ctx.scene); hid.forEach((o) => { o.visible = true; }); [P, Sv, ...R, ...J].forEach((c, i) => { c.root.visible = cv[i]; }); W.lcrowd.visible = lv; W.slider.position.x = sx; W.mirrorM.envMap = W.cubeRT.texture; W.mirrorM.needsUpdate = true; }
  W.air.update(t);
  const a = W.air.list; a.haze.visible = set === 'hall'; a.motes.visible = set !== 'hall'; a.conf1.visible = a.conf1.visible && set === 'hall'; a.conf2.visible = a.conf2.visible && set === 'hall';
  a.formG.visible = set !== 'hall'; a.swirl.visible = n === 'change';
  // flashes and shake
  const fl = t >= e.swap - 0.03 && t < e.swap + 0.2 && n === 'change' ? 0.42 * (1 - (t - e.swap + 0.03) / 0.23) : 0;
  const gl = t >= e.forever - 0.1 && t < e.forever + 0.15 ? 0.3 : 0;
  const so = t >= e.spot && t < e.spot + 0.12 ? 0.22 : 0;
  const shake = n === 'forever' && t < e.forever + 0.5 ? 0.3 : n === 'tight' ? 0.12 * tight : 0;
  { const cq = new URLSearchParams(location.search).get('cam'); if (cq) { const q = cq.split(',').map(Number); sh.pos = v3(q[0], q[1], q[2]); sh.look = v3(q[3], q[4], q[5]); sh.fov = q[6]; } }
  frame(ctx, t, sh, { shake, shadowSpan: 80, shadows: false, flash: Math.max(fl, gl, so), flashColor: gl ? '#ff2a44' : '#ffffff', steady: ['faces', 'reveal'].includes(n) });
  if (first) drawHud(t, n);
  return n;
}

export async function setup() {
  ctx = await initStage('ep22', { look: 'pro', avatars: ['farm_bella_a', 'farm_silver_a', 'farm_rival_red', 'farm_rival_gold', 'farm_rival_blue', 'farm_rich_dominus', 'farm_grandma', 'farm_john'] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'nervous', 'surprised', 'shocked', 'scared', 'terrified', 'smug', 'laugh', 'grin', 'suspicious']);
  const { scene, camera } = ctx; camera.far = 3000; camera.near = 0.3; camera.updateProjectionMatrix();
  // captions: a heavier outline and a dark halo, for the bright screen and spotlights behind them
  ctx.cap.style.webkitTextStroke = '24px #000'; ctx.cap.style.textShadow = '0 10px 0 rgba(0,0,0,0.6), 0 0 26px rgba(0,0,0,0.9), 0 0 54px rgba(0,0,0,0.65)';
  rig(); hall(); seating(); lounge(); people();
  const list = {
    haze: dust(scene, { size: 90, height: 30, centre: v3(0, 14, 24), count: 700, color: '#dfe6ff', amount: 0.22, pointSize: 0.7 }),
    motes: dust(scene, { size: 40, height: 14, centre: LX.clone().add(v3(0, 7, 0)), count: 300, color: '#ffe6f2', amount: 0.3, pointSize: 0.45 }),
    formG: sparkles(scene, { centre: LX.clone().add(v3(0, 6.5, -20)), size: 4.6, height: 7, count: 70, color: '#e6eeff', pointSize: 0.26 }),
    swirl: sparkles(scene, { centre: LX.clone().add(v3(0, 3.2, -2)), size: 4.4, height: 6.2, count: 260, color: '#ffffff', pointSize: 0.34 }),
    conf1: burst(scene, { count: 260, color: '#ffd23f', dur: 2.6, spread: 12, height: 18, pointSize: 2.6, bright: 1.6, pos: v3(0, 4, END) }).fire(EV.conf1),
    conf2: burst(scene, { count: 260, color: '#e6ecff', dur: 2.4, spread: 12, height: 18, pointSize: 2.6, bright: 1.8, pos: v3(0, 4, END), seed: 9 }).fire(EV.conf2),
  };
  W.air = atmos(...Object.values(list)); W.air.list = list;
  hudInit(); W.shots = shots();
  void surf; void glowSprite; void noise1;
  return expose(ctx, renderAt, L(17).start + 0.5, EV);
}
