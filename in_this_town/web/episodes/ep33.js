// Episode 33: The Last Magic Duel at Midnight (In This Town, action 2/3). Every midnight two people are summoned to an
// abandoned arena; only one may leave. Last night's winner (Salinger80) limps out of the gate as Quinn is summoned. The seats
// are empty but whisper her name. A girl in a white cloak waits across the arena. The bell rings: lightning at Quinn's feet,
// she jumps back and raises a wall of fire; the stranger walks through it, blocks three energy blasts with one hand, vanishes,
// reappears behind her and kicks her across the arena. Quinn skids, rises with a cut on her cheek. The stranger lifts the whole
// arena into a black void. Quinn closes her eyes and unleashes fire, lightning and a violet shockwave; the cloak dissolves into
// glowing particles: a terrified little girl. "Please don't win." Shadows fill the seats, a voice names the next champion,
// and every shadow turns toward Quinn.
// The world: the arena floor is a circle of radius 22 at y = 0 with the gate toward +z; Quinn enters from +z and fights facing -z,
// is kicked back across the floor toward -z, and ends near z = -9 facing +z. When the arena lifts, the OUTSIDE world moves down
// (the arena stays at the origin, so cameras and effects keep their coordinates).
// Clips: engine/anims.js (the hand-keyed magic clips + the Mixamo magic_set); set and magic: engine/arena.js.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, noise1, rng } from '../engine/core.js';
import { makeCharacter, pose, nameTag } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P } from '../engine/stage.js';
import { loadAnimSet, sample, blend, applyPose, aimArm } from '../engine/anims.js';
import { bolt, flashAt } from '../engine/ruins.js';
import { magicArena, arenaGround, voidRocks, fallingRocks, fireWall, energyOrb, runeShield, shardBurst, shockwave, sigil, beam, decal, arcBolt, fireStream, driftParticles, shadowCrowd, teleportFx, cloak, glow, sparksField } from '../engine/arena.js';
import { dust } from '../engine/atmos.js';
import { installActionFX } from '../engine/actionfx.js';

let ctx, L;
const W = {};
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const QSKIN = '#f3c9a4', GSKIN = '#f6d3b8', SSKIN = '#e8bd94';
const GS = 0.8;   // the girl's scale

// ---- palettes: midnight (a cold moon, readable), the void (black around, the arena lit by its braziers and the magic) ----
const MOON = P({ top: '#0b0f2a', horizon: '#2c2a58', haze: '#1e1d3c', sunColor: '#c6d0ff', sunI: 1.55, sunDir: v3(-0.35, 0.78, -0.52),
  sunDisc: 0, sunSize: 1, stars: 0.8, moon: 1, hemiSky: '#6f74b8', hemiGround: '#2a2436', hemiI: 1.25, amb: 0.22, caus: '#ffffff', causI: 0,
  exposure: 1.22, vig: 0, win: 0, lamp: 0, fogNear: 90, fogFar: 520, bloom: 0.03, envI: 0.5, saturation: 1.08, contrast: 1.06, bounce: 0.16 });
const VOID = P({ top: '#030309', horizon: '#120c26', haze: '#0b0818', sunColor: '#c8c0ff', sunI: 1.35, sunDir: v3(-0.3, 0.82, -0.48),
  sunDisc: 0, sunSize: 1, stars: 0.35, moon: 0, hemiSky: '#5c58a0', hemiGround: '#1e1830', hemiI: 1.15, amb: 0.2, caus: '#ffffff', causI: 0,
  exposure: 1.24, vig: 0, win: 0, lamp: 0, fogNear: 120, fogFar: 600, bloom: 0.03, envI: 0.42, saturation: 1.1, contrast: 1.08, bounce: 0.14 });
const VOIDWIDE = { ...VOID, ...P({ horizon: '#2a1c58', haze: '#1c1440', hemiSky: '#8a84d0', hemiGround: '#5a4890', hemiI: 2.1, amb: 0.4, exposure: 1.35 }) };
const DREAD = { ...VOID, ...P({ hemiSky: '#4a4680', haze: '#08060f' }), saturation: 0.92, exposure: 1.18 };

// ---- timing ----
const T = {};
let HOLDS = [];
const hs = (t) => { let a = t; for (const [c, h] of HOLDS) a -= clamp(t - c, 0, h); return a; };
function events() {
  const s = (i) => L(i).start;
  Object.assign(T, {
    mid: s(0) + 3.0, sal0: s(1) - 0.6, sal1: s(3) + 1.0, sum: s(2) + 0.2, in0: s(3) - 0.2, in1: s(4) + 0.9,
    bell: s(6) + 0.15, pt: s(7) - 0.05, wall0: s(8) + 0.95, w0: s(8) + 1.45, w1: s(10) + 0.2,
    th1: s(10) + 0.15, th2: s(10) + 1.05, th3: s(10) + 1.85, pb: s(10) + 0.7, van: s(12) + 0.3, app: s(13) + 0.12,
    rise: s(14) + 0.05, walk2a: s(14) + 0.3, walk2b: s(16) - 0.25, raise: s(16) + 0.1, lift0: s(17) + 0.05,
    close: s(18) + 0.15, unl: s(19) + 0.05, fire: s(20) + 0.02, lt: s(20) + 0.5, rel: s(20) + 1.4, dis: s(21) + 0.12,
    girl: s(22), fill: s(25) + 0.05, ann: s(26), turn: s(27) + 0.05, end: ctx.dur,
  });
  T.strike = T.pt + 0.75; T.jb = s(8) + 0.0; T.land1 = T.jb + 0.55;
  T.rise1 = T.wall0 + 0.7; T.thr = [T.th1, T.th2, T.th3]; T.hit = T.thr.map((x) => x + 0.28 + 0.75);
  T.kick = T.app + 0.18; T.kc = T.kick + 0.3; T.land = T.kc + 0.5; T.skidEnd = T.land + 1.0;
  T.lift1 = T.lift0 + 2.6; T.void = T.lift0 + 1.4;
  T.fireC = T.fire + 0.18; T.ltC = T.lt + 0.12; T.shk = T.rel + 0.4;
  T.leave = T.ann + 1.2;
  return { ...T };
}

// ---- clips ----
const S_ = (name, t, o = {}) => sample(name, t, o);
function seq(list, t, bl = 0.12) {
  let i = 0; for (let k = 0; k < list.length; k++) if (t >= list[k][0]) i = k;
  const cur = list[i][1](t); if (i === 0) return cur;
  const k = (t - list[i][0]) / (list[i][2] ?? bl); return k >= 1 ? cur : blend(list[i - 1][1](t), cur, easeInOut(clamp(k)));
}
const clip = (name, t0, o = {}) => (t) => S_(name, t - t0, o);
const clipH = (name, t0, o = {}) => (t) => S_(name, hs(t) - hs(t0), o);   // a clip that pauses at the hit-stops

// ---- Quinn ----
const QZ0 = 13, QZ1 = 16.5, QZF = -9;   // where she stands to fight, after the jump back, where the skid ends
function quinnRoot(t) {
  const p = v3(-1.5, 0, 40); let ry = Math.PI, rx = 0;
  if (t >= T.in0) { const k = clamp((t - T.in0) / (T.in1 - T.in0)); p.set(lerp(-1.5, 0, k), 0, lerp(40, QZ0, k)); }
  if (t >= T.jb) { const u = smooth(T.jb + 0.15, T.land1, t); p.z = lerp(QZ0, QZ1, u); p.y = 1.5 * Math.sin(Math.PI * clamp((t - T.jb - 0.15) / 0.4)); }
  if (t >= T.app) ry = Math.PI - Math.PI * easeInOut(smooth(T.app + 0.02, T.kc - 0.04, t));   // she spins round to face the stranger behind her
  if (t >= T.kc) {
    const tt = hs(t) - hs(T.kc), u = clamp(tt / (T.land - T.kc - 0.08));
    p.set(0, 0.4 + 1.9 * Math.sin(Math.PI * u) * (1 - u * 0.3), lerp(QZ1, 6, easeOut(u))); ry = 0; rx = -0.35 * Math.sin(Math.PI * u);
    if (t >= T.land) { const k = clamp((t - T.land) / (T.skidEnd - T.land)); p.set(0, 0, lerp(6, QZF, 1 - (1 - k) * (1 - k))); rx = 0; }
  }
  if (t >= T.skidEnd) p.set(0, 0, QZF);
  return { p, ry, rx };
}
function quinnPose(t) {
  return seq([
    [0, (t) => S_('stance', t, { loop: true })],
    [T.sum - 0.1, (t) => blend(S_('stance', t, { loop: true }), S_('react_body', (t - T.sum) * 0.8, { zero: true }), 0.55), 0.2],
    [T.sum + 1.0, (t) => S_('stance', t, { loop: true }), 0.3],
    [T.bell, (t) => blend(S_('stance', t, { loop: true }), S_('react_body', (t - T.bell) * 0.9, { zero: true }), 0.45), 0.1],
    [T.bell + 0.9, (t) => S_('stance', t, { loop: true }), 0.3],
    [T.strike - 0.02, (t) => S_('react_body', hs(t) - hs(T.strike), { zero: true, speed: 1.2 }), 0.05],
    [T.jb, clip('jumpBack', T.jb), 0.1],
    [T.wall0, clip('summon', T.wall0), 0.1],
    [T.wall0 + 1.6, (t) => S_('stance', t, { loop: true }), 0.35],
    [T.th1 - 0.02, clipH('throwR', T.th1), 0.08],
    [T.th2 - 0.02, clipH('throwL', T.th2), 0.08],
    [T.th3 - 0.02, clipH('throwR', T.th3), 0.08],
    [T.th3 + 0.8, (t) => S_('stance', t, { loop: true }), 0.25],
    [T.kc, (t) => S_('hitFly', hs(t) - hs(T.kc)), 0.03],
    [T.land - 0.05, (t) => S_('skid', t - T.land), 0.08],
    [T.rise, clip('struggleUp', T.rise, { speed: 0.95 }), 0.15],
    [T.rise + 1.95, (t) => S_('stance', t, { loop: true }), 0.4],
    [T.close - 0.2, clip('gather', T.close - 0.2), 0.3],
    [T.fire - 0.1, clipH('thrust', T.fire - 0.1), 0.06],
    [T.lt, clipH('spread', T.lt), 0.06],
    [T.rel, clipH('release', T.rel), 0.06],
    [T.rel + 2.4, (t) => S_('stance', t, { loop: true }), 0.6],
  ], t);
}

// ---- the stranger (the girl in the cloak) ----
const SZ0 = -8, SZW = 11;   // where she waits, where her walk through the fire ends
function strangerRoot(t) {
  const p = v3(0, 0, SZ0); let ry = 0;
  if (t >= T.w0) p.z = lerp(SZ0, SZW, clamp((t - T.w0) / (T.w1 - T.w0)));
  if (t >= T.app) { p.set(0, 0, 20.2); ry = Math.PI; }
  if (t >= T.walk2a) { const k = smooth(T.walk2a, T.walk2b, t); p.set(0, 0, lerp(20.2, 8, k)); ry = Math.PI; }
  if (t >= T.shk) { const k = easeOut(clamp((hs(t) - hs(T.shk)) / 0.7)); p.z = 8 + 1.6 * k; }
  return { p, ry };
}
const walking2 = (t) => t > T.walk2a + 0.05 && t < T.walk2b - 0.05;
const walking1 = (t) => t > T.w0 + 0.05 && t < T.w1 - 0.05;
function strangerPose(t) {
  return seq([
    [0, (t) => S_('palmBlock', 0)],
    [T.pt, clip('pointUp', T.pt), 0.1],
    [T.pt + 1.6, (t) => S_('palmBlock', 0), 0.4],
    [T.pb, clip('palmBlock', T.pb), 0.08],
    [T.van, (t) => S_('palmBlock', 0), 0.2],
    [T.app, clipH('pushKick', T.app + 0.18 - 0.0), 0.04],
    [T.app + 1.2, (t) => S_('palmBlock', 0), 0.3],
    [T.raise, clip('raiseBoth', T.raise), 0.2],
    [T.fire - 0.45, (t) => S_('braceBoth', t - T.fire), 0.25],
    [T.shk, (t) => S_('react_big', (hs(t) - hs(T.shk)) * 1.15, { zero: true }), 0.04],
    [T.shk + 1.3, (t) => S_('cower', t - T.shk, { loop: true }), 0.6],
  ], t);
}

// ---- Salinger80 (limps out; later a shadow in the front row) ----
const SALZ0 = 29, SALZ1 = 47;
function salRoot(t) { const k = clamp((t - T.sal0) / (T.sal1 - T.sal0)); return v3(2.6, 0, lerp(SALZ0, SALZ1, k)); }

// ---- set ----
function world() {
  const { scene } = ctx;
  W.arena = magicArena({}); scene.add(W.arena.group);
  W.outside = new THREE.Group(); scene.add(W.outside);
  W.ground = arenaGround({ hole: 57 }); W.outside.add(W.ground);
  W.rocksFall = fallingRocks(scene, { R: 54 });
  W.voidRocks = voidRocks(scene, { count: 150, r0: 80, spread: 220 });
  W.mist = dust(scene, { centre: v3(0, 6, 0), size: 90, height: 14, count: 600, color: '#c7b8ff', amount: 0.32, pointSize: 1.2 });
  // the summoning beams and the sigil under Quinn
  W.beamQ = beam({ r: 1.5, h: 60 }); scene.add(W.beamQ); W.sigQ = sigil({ size: 5 }); scene.add(W.sigQ);
  W.sigBig = sigil({ size: 16, color: '#9a6bff' }); scene.add(W.sigBig);
  W.skySig = sigil({ size: 70, color: '#8a5cff' }); W.skySig.rotation.x = Math.PI / 2; W.skySig.position.set(0, 64, 0); scene.add(W.skySig);
  // lightning from the sky to Quinn's feet; its scorch and sparks
  W.bolt = bolt({ seed: 5, h: 70 }); scene.add(W.bolt);
  { let lo = null; W.bolt.traverse((m) => { if (!m.isMesh) return; const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) if (!lo || p.getY(i) < lo.y) lo = v3(p.getX(i), p.getY(i), p.getZ(i)); }); W.boltTip = lo; }
  W.scorch = decal('scorch', { seed: 4 }); W.scorch.scale.set(3.4, 3.4, 1); scene.add(W.scorch);
  W.sparks = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => shardBurst(scene, { count: 90, seed: 40 + i, color: i < 2 ? '#e8f0ff' : '#d9b8ff', speed: 7, dur: 0.75, size: 0.14 }));
  W.debris = [0, 1, 2, 3].map((i) => shardBurst(scene, { count: 45, seed: 60 + i, color: '#8a8494', bright: 0.5, speed: 6, dur: 1.2, size: 0.16, gravity: 18 }));
  // the wall of fire between them
  W.fire = fireWall({ len: 17, h: 6 }); W.fire.position.set(0, 0, 8.8); scene.add(W.fire);
  // three orbs and their deflected flights; the rune shield on the stranger's palm
  W.orbs = [0, 1, 2].map((i) => { const o = energyOrb({ r: i === 2 ? 0.55 : 0.42 }); scene.add(o); o.addTrailTo(scene); return o; });
  W.shield = runeShield({ size: 1.15 }); scene.add(W.shield);
  W.shield2 = runeShield({ size: 3.2 }); scene.add(W.shield2);
  // the teleport, the kick's impact ring, the skid's marks and dust
  W.tpA = teleportFx(); W.tpB = teleportFx(); scene.add(W.tpA, W.tpB);
  W.kickRing = shockwave({ color: '#e6dcff' }); scene.add(W.kickRing);
  W.skid = decal('skid', { seed: 2 }); scene.add(W.skid);
  W.crack = decal('crack', { seed: 7 }); W.crack.scale.set(6, 6, 1); scene.add(W.crack);
  W.bigCrack = decal('crack', { seed: 11 }); W.bigCrack.scale.set(26, 26, 1); scene.add(W.bigCrack);
  W.dustK = [0, 1, 2].map((i) => shardBurst(scene, { count: 110, seed: 80 + i, color: '#7c7688', bright: 0.4, speed: 3.5, dur: 1.3, size: 0.55, gravity: 2, up: 1.2 }));
  W.handSparks = sparksField({ count: 160, color: '#ffd9a8', w: 0.6, h: 0.5, d: 0.6, rise: 2, size: 0.07 }); scene.add(W.handSparks);
  // Quinn's power: aura motes, the fire stream, two arcs, the shockwave
  W.aura = sparksField({ count: 320, color: '#c69bff', w: 3.6, h: 6.5, d: 3.6, rise: 3.6, size: 0.1 }); scene.add(W.aura);
  W.stream = fireStream({}); scene.add(W.stream);
  W.arcs = [arcBolt({}), arcBolt({}), arcBolt({ r: 0.04 })]; W.arcs.forEach((a) => scene.add(a));
  W.shock = shockwave({}); scene.add(W.shock);
  W.qGlow = glow(new THREE.Color('#b98cff'), 3, 0); scene.add(W.qGlow);
  W.qLight = new THREE.PointLight('#b98cff', 0, 16, 1.5); scene.add(W.qLight);
  W.sLight = new THREE.PointLight('#dfe9ff', 0, 12, 1.6); scene.add(W.sLight);
  W.underGlow = glow(new THREE.Color('#8f62ff'), 150, 0); W.underGlow.position.set(0, -34, 0); scene.add(W.underGlow);
  W.underLight = new THREE.PointLight('#a585ff', 0, 260, 1.0); W.underLight.position.set(0, -45, 0); scene.add(W.underLight);
  W.chunks = shardBurst(scene, { count: 160, seed: 99, color: '#9a94a8', bright: 0.45, speed: 22, dur: 2.2, size: 0.6, gravity: 12, up: 4 });
}

// ---- people ----
function people() {
  const mk = (avatar, skin, o = {}) => { const c = makeCharacter({ avatar, alti: true, skin, caustic: false, ...o }); ctx.scene.add(c.root); c.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return c; };
  W.q = mk('farm_ep33_quinn', QSKIN);
  W.g = mk('farm_ep33_girl', GSKIN, { scale: GS });
  W.sal = mk('farm_ep33_salinger', SSKIN);
  W.cloak = cloak(W.g, { seed: 6 });
  W.tagS = nameTag(W.sal, 'Salinger80', { width: 3.4, y: 6.2 });
  // the faces' faint fringe pixels read as rings round the eyes in close-ups: cut them
  for (const c of [W.q, W.g, W.sal]) if (c.faceSheet) { c.faceSheet.material.alphaTest = 0.35; c.faceSheet.material.needsUpdate = true; }
  for (const c of [W.q, W.g]) if (c.headParts) { const b = new THREE.Box3(); c.headParts.forEach((m) => { m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrix)); }); const ctr = b.getCenter(v3(0, 0, 0));
    for (const m of [...c.head.children]) if (m.isMesh && m !== c.faceSheet && !c.headParts.includes(m) && !m.userData.cloak) { m.position.sub(ctr).multiplyScalar(1.06).add(ctr); m.scale.multiplyScalar(1.06); } }
  W.cut = cheekCut(W.q);
  // Salinger as a shadow (the end): a second copy, darkened, seated in the front row, his tag above
  W.salS = mk('farm_ep33_salinger', SSKIN); W.tagS2 = nameTag(W.salS, 'Salinger80', { width: 3.4, y: 6.2 });
  W.salS.root.traverse((o) => { if (o.isMesh && o !== W.salS.faceSheet && o.material && o.material.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.28); if (o.material.emissive) o.material.emissive.set('#1a1030'); } });
}
// a small cut on Quinn's left cheek and a trickle that runs down from it
function cheekCut(ch) {
  const mk = (draw, w, h) => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -4 })); m.renderOrder = 4; m.userData.noAO = true; return m; };
  const cut = mk((x) => { x.lineCap = 'round'; x.strokeStyle = '#7a0d0a'; x.lineWidth = 9; x.beginPath(); x.moveTo(34, 70); x.lineTo(94, 52); x.stroke(); x.strokeStyle = '#c0201a'; x.lineWidth = 4; x.beginPath(); x.moveTo(38, 68); x.lineTo(90, 54); x.stroke(); });
  const drip = mk((x) => { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#b0160f'); g.addColorStop(1, '#7a0b08'); x.fillStyle = g; x.beginPath(); x.moveTo(58, 0); x.lineTo(70, 0); x.lineTo(68, 110); x.quadraticCurveTo(64, 128, 60, 110); x.closePath(); x.fill(); });
  const fs = ch.faceSheet; fs.geometry.computeBoundingBox(); const bb = fs.geometry.boundingBox, w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  // her left cheek is +x on the face (she faces +z)
  cut.scale.set(w * 0.24, w * 0.24, 1); cut.position.set(bb.min.x + w * 0.74, bb.min.y + h * 0.42, bb.max.z + 0.012);
  drip.geometry.translate(0, -0.5, 0); drip.scale.set(w * 0.05, 0.001, 1); drip.position.set(bb.min.x + w * 0.735, bb.min.y + h * 0.41, bb.max.z + 0.013);
  fs.add(cut); fs.add(drip); cut.visible = drip.visible = false;
  return { cut, drip, len: h * 0.28, w };
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, S = [], add = (name, t0, f) => S.push({ name, t0: () => t0, f, t1: () => 0 });
  const Qp = (t) => quinnRoot(t).p, Sp = (t) => strangerRoot(t).p;
  // the arena at midnight (steady), the clock reaching twelve
  add('open', 0, (u) => ({ pos: lp3(v3(-52, 44, 118), v3(-40, 38, 100), easeInOut(u)), look: v3(0, 8, 6), fov: 50 }));
  add('clock', 2.35, (u) => ({ pos: lp3(v3(0, 13.5, 4), v3(0, 15.2, 8.5), easeInOut(u)), look: v3(0, 19.4, 24), fov: 40 }));
  // last night's winner limps out; Quinn is summoned
  add('leave', s(1) - 0.05, (u, t) => { const p = salRoot(t); return { pos: p.clone().add(v3(-2.6, 4.4, lerp(7.6, 7.0, u))), look: p.clone().add(v3(0, 3.6, 0)), fov: 56 }; });
  add('summon', s(2) - 0.08, (u) => ({ pos: lp3(v3(-6.2, 3.0, 47.5), v3(-5.6, 3.6, 46.2), easeOut(u)), look: v3(-1.4, 3.8, 40.5), fov: 58 }));
  add('hands', s(2) + 1.15, (u) => ({ pos: lp3(v3(1.4, 4.6, 33.4), v3(1.0, 4.6, 34.2), u), look: v3(-1.5, 3.7, 40), fov: 54 }));
  // into the arena, the empty seats, the whispers
  add('enter', s(3) - 0.05, (u, t) => { const p = Qp(t); return { pos: v3(3.5, 2.2, lerp(12, 14, u)), look: p.clone().add(v3(0, 3.6, 0)), fov: 54 }; });
  add('seats', s(3) + 1.3, (u) => { const a = lerp(-2.2, -1.2, easeInOut(u)); return { pos: v3(Math.cos(a) * 6, 4.5, 12 + Math.sin(a) * 6), look: v3(Math.cos(a) * 40, 13, 12 + Math.sin(a) * 40), fov: 60 }; });
  add('whisper', s(4) - 0.05, (u, t) => { const p = Qp(t), a = lerp(0.5, -0.4, easeInOut(u)); return { pos: p.clone().add(v3(Math.sin(a) * 6.4, 2.3, -Math.cos(a) * 6.4)), look: p.clone().add(v3(0, 3.7, 0)), fov: 56 }; });
  add('across', s(5) - 0.08, (u) => ({ pos: lp3(v3(2.6, 5.4, QZ0 + 5.6), v3(2.2, 5.3, QZ0 + 4.6), u), look: v3(0, 3.2, SZ0), fov: 46 }));
  add('cloak', s(5) + 1.25, (u) => ({ pos: lp3(v3(1.6, 3.2, SZ0 + 7.4), v3(1.3, 3.5, SZ0 + 6.0), easeInOut(u)), look: v3(0, 3.6, SZ0), fov: 50 }));
  add('bell', s(6) - 0.06, (u) => ({ pos: lp3(v3(-3.4, 12.5, 15.5), v3(-3.0, 12.8, 16.2), u), look: v3(0, 15.6, 26), fov: 46 }));
  // lightning at her feet
  // the fight, wide: both fighters head to feet, long moving shots (orbits, a low push-in, a whip pan, a tracking dolly)
  add('duelA', T.pt - 0.1, (u, t) => { const q = quinnRoot(t).p.clone().setY(0), k = easeInOut(u); return { pos: q.clone().add(v3(lerp(3.6, 2.2, k), lerp(7.6, 6.8, k), lerp(9.4, 9.0, k))), look: v3(0, 1.4, q.z - 11), fov: 72 }; });
  add('duelB', s(9) - 0.1, (u, t) => wide(t, { az: lerp(-0.55, -0.2, easeInOut(u)), el: 0.12, fov: 52, k: lerp(1.15, 1.02, u) }));
  add('duelC', s(10) - 0.06, (u, t) => wide(t, { az: lerp(0.5, 0.15, easeInOut(u)) - 0.75 * easeInOut(smooth(T.th3 + 0.55, T.th3 + 0.75, t)), el: lerp(0.06, 0.12, u), fov: 52 }));
  add('duelD', s(12) - 0.08, (u, t) => wide(t, { az: lerp(-0.6, -0.95, easeInOut(u)), el: lerp(0.12, 0.02, u), fov: 54, k: lerp(1.45, 1.32, easeOut(u)) }));
  add('fly', T.kc + 0.2, (u, t) => { const p = Qp(t); return { pos: v3(12, 4.4, p.z + 1.5), look: p.clone().add(v3(0, 2.0, 0)), fov: 52 }; });
  // three energy blasts, the one-hand block
  // reappears behind her: the kick
  add('getup', s(14) - 0.05, (u) => ({ pos: lp3(v3(2.6, 3.0, QZF + 9.5), v3(2.2, 3.8, QZF + 8.4), easeInOut(u)), look: v3(0, 2.6, QZF), fov: 56 }));
  add('cut', s(15) - 0.05, (u) => ({ pos: lp3(v3(1.5, 4.9, QZF + 4.6), v3(1.3, 4.85, QZF + 4.1), u), look: v3(0.2, 4.3, QZF), fov: 46 }));
  // the stranger raises both hands; the arena lifts into the sky
  add('raise', s(16) - 0.08, (u) => ({ pos: lp3(v3(-3.2, 2.0, 8 - 9.0), v3(-2.8, 1.8, 8 - 9.8), u), look: v3(0, 4.2, 8), fov: 56 }));
  add('lift', s(17) - 0.05, (u) => ({ pos: lp3(v3(74, 24, -74), v3(88, 18, -88), easeInOut(u)), look: v3(0, lerp(3, -4, u), 0), fov: 52 }));
  add('void', s(17) + 1.45, (u) => ({ pos: lp3(v3(-62, 8, 92), v3(-72, 16, 104), easeInOut(u)), look: v3(0, -10, 0), fov: 52 }));
  // she closes her eyes and unleashes everything
  add('eyes', s(18) - 0.06, (u) => ({ pos: lp3(v3(1.2, 4.9, QZF + 4.6), v3(1.1, 4.9, QZF + 4.2), u), look: v3(0, 4.3, QZF), fov: 46 }));
  add('power', s(19) - 0.05, (u) => { const a = lerp(-0.6, 0.5, easeInOut(u)); return { pos: v3(Math.sin(a) * 10.5, lerp(1.6, 2.6, u), QZF + Math.cos(a) * 10.5), look: v3(0, 3.6, QZF), fov: 56 }; });
  add('duelE', T.fire - 0.08, (u) => ({ pos: lp3(v3(5.5, 7.4, -22.0), v3(4.2, 6.6, -21.0), easeInOut(u)), look: v3(0, 3.0, -0.5), fov: 56 }));
  add('shock', T.rel - 0.12, (u) => ({ pos: lp3(v3(10, 18, -46), v3(16, 30, -66), easeOut(u)), look: v3(0, lerp(5, 2, u), 0), fov: 56 }));
  // the cloak dissolves; a little girl
  add('dissolve', s(21) - 0.06, (u) => ({ pos: lp3(v3(-3.4, 3.6, 9.6 + 8.2), v3(-3.0, 3.8, 9.6 + 7.4), u), look: v3(0, 3.0, 9.6), fov: 54 }));
  add('girl', s(22) - 0.06, (u) => ({ pos: lp3(v3(1.6, 3.0, 9.6 - 7.4), v3(1.3, 3.1, 9.6 - 6.6), u), look: v3(0, 2.8, 9.6), fov: 52 }));
  add('terrified', s(23) - 0.06, (u) => ({ pos: lp3(v3(0.8, 3.7, 9.6 - 4.4), v3(0.7, 3.7, 9.6 - 4.0), u), look: v3(0, 3.4, 9.6), fov: 46 }));
  add('quinnR', s(24) + 1.0, (u) => ({ pos: lp3(v3(-1.3, 4.9, QZF + 4.6), v3(-1.2, 4.9, QZF + 4.2), u), look: v3(0, 4.3, QZF), fov: 48 }));
  // the seats fill with shadows; Salinger among them; the announcement; every shadow turns
  add('fill', s(25) - 0.06, (u) => ({ pos: lp3(v3(1.8, 4.4, QZF - 5.5), v3(2.4, 6.6, QZF - 7.5), easeInOut(u)), look: v3(lerp(-10, 14, easeInOut(u)), 11, 30), fov: 62 }));
  add('salinger', s(25) + 1.35, (u) => { const c = W.salSeat; const o = v3(-c.x, 0, -c.z).normalize(); return { pos: c.clone().addScaledVector(o, lerp(9.5, 8.6, u)).add(v3(0, 3.4, 0)), look: c.clone().add(v3(0, 3.0, 0)), fov: 54 }; });
  add('announce', s(26) - 0.06, (u) => ({ pos: lp3(v3(2.0, 2.6, QZF + 9.0), v3(1.8, 2.2, QZF + 10.0), u), look: v3(0, 5.0, QZF), fov: 58 }));
  add('turn', s(27) - 0.06, (u) => ({ pos: lp3(v3(-30, 26, 26), v3(-34, 30, 30), u), look: v3(4, 9, -16), fov: 58 }));
  add('final', s(27) + 1.75, (u) => ({ pos: lp3(v3(0, 9, 14), v3(0, 34, 42), easeInOut(clamp(u * 1.05))), look: lp3(v3(0, 3, QZF), v3(0, 6, QZF), u), fov: 56 }));
  S.forEach((x, i) => { if (S[i + 1]) { const v = S[i + 1].t0(); x.t1 = () => v; } });
  S[S.length - 1].t1 = () => ctx.dur + 1;
  return S;
}

// a wide two-shot of the fighters: both fit head to feet in the 9:16 frame from azimuth az (0 = from +x), elevation el
function wide(t, o = {}) {
  const gone = t >= T.van + 0.12 && t < T.app;
  const a = quinnRoot(t).p.clone().setY(0), b = strangerRoot(gone ? T.van : t).p.clone().setY(0), m = a.clone().lerp(b, 0.5);
  const az = o.az ?? 0.4, el = o.el ?? 0.1, fov = o.fov ?? 52, dir = v3(Math.cos(az), 0, Math.sin(az));
  const vf = fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * 1080 / 1920);
  const ab = b.clone().sub(a), perp = Math.abs(ab.x * dir.z - ab.z * dir.x);
  const near = Math.max(a.clone().sub(m).dot(dir), b.clone().sub(m).dot(dir), 0);
  const d = Math.max((o.H ?? 10) / 2 / Math.tan(vf) + near, (perp / 2 + 1.9) / Math.tan(hf)) * (o.k ?? 1.12);
  const look = m.clone().add(v3(0, o.ly ?? 3.4, 0));
  const pos = look.clone().addScaledVector(dir, d * Math.cos(el)).add(v3(0, d * Math.sin(el), 0)); pos.y = Math.max(pos.y, 0.8);
  const r = Math.hypot(pos.x, pos.z); if (r > 23.2) pos.y = Math.max(pos.y, 1.5 + Math.max(0, r - 24.6) / 2.25 * 1.45 + 3.2);
  return { pos, look, fov };
}
// speed lines and impact frames (engine/actionfx.js): a pure function of the frame's time
function fxAt(t, n, cam) {
  const e = T, o = { focus: 0, streak: 0, impact: 0, cx: 0.5, cy: 0.45 };
  const bump = (c, a, b) => smooth(c - a, c, t) * (1 - smooth(c, c + b, t));
  const scr = (p) => { const q = p.clone().project(cam); return [clamp(q.x * 0.5 + 0.5), clamp(0.5 - q.y * 0.5)]; };
  const hits = [[e.strike, v3(0.3, 1.0, QZ0 - 1.6)], ...e.hit.map((h) => [h, W.shieldPos || v3(0.55, 3.9, SZW + 1.6)]), [e.kc, v3(0, 2.6, QZ1 + 0.6)], [e.fireC, v3(0, 3.6, 5.6)], [e.ltC, v3(0, 3.6, 5.6)], [e.shk, quinnRoot(e.shk).p.clone().add(v3(0, 3, 0))]];
  for (const [c, p] of hits) { const k = bump(c, 0.12, 0.32) * 0.75; if (k > o.focus) { o.focus = k; [o.cx, o.cy] = scr(p); } }
  if (t >= e.app - 0.1 && t < e.kc) { const k = 0.55 * smooth(e.app - 0.1, e.app + 0.1, t); if (k > o.focus) { o.focus = k; [o.cx, o.cy] = scr(v3(0, 3.4, 18.5)); } }
  if (n === 'fly') o.streak = 0.85 * (1 - smooth(e.skidEnd - 0.3, e.skidEnd, t));
  if (n === 'duelC') o.streak = Math.max(o.streak, bump(e.th3 + 0.68, 0.12, 0.14));   // the whip pan
  if (n === 'lift') o.streak = 0.35 * smooth(e.lift0, e.lift0 + 0.5, t);
  o.angle = n === 'lift' ? Math.PI / 2 : 0;
  // impact frames: only the two strikes that decide the duel (the kick, the shockwave)
  for (const [c, p] of [[e.kc, v3(0, 2.6, QZ1 + 0.6)], [e.shk, quinnRoot(e.shk).p.clone().add(v3(0, 3, 0))]]) { const d = t - c; if (d >= 0 && d < 0.1) { o.impact = d < 0.034 ? 1 : d < 0.067 ? 2 : 1; [o.cx, o.cy] = scr(p); } }
  o.streak = clamp(o.streak);
  return o;
}

// ---- a frame ----
const lastAt = (list, t) => { let v = list[0][1]; for (const [k, x] of list) if (t >= k) v = x; return v; };
const NOBLINK = ['shocked', 'scared', 'terrified', 'surprised'];
function face(c, name, t, ph = 0.3, o = {}) { if (!c.setFace) return; const bare = name.replace(/^lash:/, ''); c.setFace(name, { blink: o.closed || (blinkAt(t, ph) && !NOBLINK.includes(bare)), viseme: o.viseme, gaze: o.gaze }); }
function quinnFace(t) {
  return lastAt([[0, 'lash:neutral'], [T.sum, 'lash:surprised'], [T.sum + 1.3, 'lash:nervous'], [T.in1 - 0.6, 'lash:nervous'], [L(4).start + 0.2, 'lash:scared'], [L(5).start + 0.6, 'lash:suspicious'],
    [T.bell, 'lash:surprised'], [T.bell + 0.8, 'lash:suspicious'], [T.strike, 'lash:shocked'], [T.wall0, 'lash:angry'], [T.th1 - 0.2, 'lash:angry'], [T.hit[2] + 0.2, 'lash:shocked'],
    [T.van + 0.3, 'lash:nervous'], [T.app, 'lash:surprised'], [T.kc, 'lash:terrified'], [T.skidEnd, 'lash:sad'], [T.rise + 1.3, 'lash:angry'], [L(15).start + 0.3, 'lash:sad'], [L(15).start + 1.7, 'lash:angry'],
    [T.lift0, 'lash:shocked'], [T.close, 'lash:neutral'], [T.fire - 0.2, 'lash:angry'], [T.shk + 0.7, 'lash:surprised'], [L(22).start, 'lash:shocked'], [L(24).start + 1.0, 'lash:sad'], [T.fill, 'lash:scared'], [T.turn, 'lash:terrified']], t);
}
function setLights(t, focus, k = 1) {
  const f = W.fill, r = W.rim;
  f.position.copy(focus).add(W.camSide.clone().multiplyScalar(4)).add(v3(0, 4.5, 0)); f.intensity = 38 * k; f.distance = 24; f.color.set('#e8e6ff');
  r.position.copy(focus).add(W.camSide.clone().multiplyScalar(-5)).add(v3(0, 6, 0)); r.intensity = 55 * k; r.color.set('#a9b4ff'); r.distance = 26;
}

function renderAt(t) {
  let sh = shotAt(W.shots, t); const n = sh.name, e = T;
  { const cq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgcam'); if (cq) { const q = cq.split(',').map(Number); sh = { ...sh, pos: v3(q[0], q[1], q[2]), look: v3(q[3], q[4], q[5]), fov: q[6] }; } }
  const lift = easeInOut(smooth(e.lift0, e.lift1, t)), inVoid = t >= e.void;
  applyEnv(ctx, t >= e.fill ? DREAD : (n === 'lift' || n === 'void') ? (t >= e.void ? VOIDWIDE : { ...MOON, ...P({ hemiGround: '#4a4070', hemiI: 1.8, amb: 0.35, exposure: 1.32 }) }) : inVoid ? VOID : MOON);
  // ---- the world ----
  const A = W.arena; A.update(t, { brazier: inVoid ? 26 : 18, runes: 0.22 + 0.5 * smooth(e.lift0, e.lift0 + 1, t) * (1 - 0.6 * smooth(e.shk + 1, e.shk + 3, t)) + 0.6 * smooth(e.ann, e.ann + 0.4, t) });
  A.clock.set(lerp(23.97, 24.0, smooth(0, e.mid, t)));
  const ring = t >= e.bell ? Math.exp(-(t - e.bell) * 1.6) : 0; A.bell.set(0.32 * Math.sin((t - e.bell) * 5.5) * ring, ring);
  W.outside.position.y = -lift * 140; W.outside.visible = W.outside.position.y > -130;
  A.under.visible = t >= e.lift0 - 0.1;
  { const k = smooth(e.lift0 + 0.3, e.lift0 + 1.5, t) * (['lift', 'void', 'shock', 'turn', 'final'].includes(n) ? 1 : 0); W.underGlow.material.opacity = 0.32 * k; W.underLight.intensity = 9000 * k; }
  W.rocksFall.set(t - e.lift0 - 0.2); W.rocksFall.position.y = 0;
  W.voidRocks.visible = t >= e.lift0 + 0.8; W.voidRocks.update(t); W.voidRocks.position.y = lerp(-160, 0, smooth(e.lift0, e.lift1 + 1.5, t));
  W.mist.update(t);
  // ---- Quinn ----
  const q = W.q, qr = quinnRoot(t), QP = quinnPose(t);
  q.root.visible = t >= e.sum - 0.05;
  q.reset(); q.root.position.copy(qr.p); q.root.rotation.set(qr.rx, qr.ry, 0);
  const walkIn = t > e.in0 + 0.05 && t < e.in1 - 0.05;
  if (walkIn) { pose(q, 'walk', (t - e.in0) * 1.05); q.neck.rotation.y = n === 'enter' ? 0.25 * Math.sin((t - e.in0) * 1.4) : 0; }
  else applyPose(q, QP, { travel: 0 });
  if (t >= e.land - 0.05 && t < e.rise) q.root.position.y = 0;
  if (n === 'whisper') { q.neck.rotation.y = 0.55 * Math.sin((t - L(4).start) * 2.0); q.neck.rotation.x = -0.15; }
  if (n === 'seats' || n === 'fill') q.neck.rotation.x = -0.2;
  // the hand to the cheek (the cut), the eyes closed while she gathers
  if (false) { q.root.updateMatrixWorld(true); const ck = q.faceSheet.localToWorld(v3(0, 0, 0)).add(v3(0.75, -0.55, 0.45)); aimArm(q, 1, ck, 0.7 * smooth(L(15).start + 0.9, L(15).start + 1.2, t) * (1 - smooth(L(15).start + 1.5, L(15).start + 1.8, t))); }
  const closed = t >= e.close && t < e.fire - 0.15;
  face(q, quinnFace(t), t, 0.3, { closed });
  W.cut.cut.visible = t >= e.kc + 0.05; W.cut.drip.visible = t >= L(15).start; W.cut.drip.scale.y = Math.max(0.001, W.cut.len * smooth(L(15).start, L(15).start + 1.6, t));
  // ---- the stranger / the girl ----
  const g = W.g, sr = strangerRoot(t), SP = strangerPose(t);
  const gone = t >= e.van + 0.12 && t < e.app;   // between the vanish and the reappearance
  g.root.visible = !gone && t >= 0.0 && t < e.leave + 0.4;
  g.reset(); g.root.position.copy(sr.p); g.root.rotation.set(0, sr.ry, 0);
  if (walking1(t) || walking2(t)) pose(g, 'walk', (t - (walking1(t) ? e.w0 : e.walk2a)) * 1.0, { amt: 0.7 });
  else if (t < e.pt || (t > e.pt + 1.7 && t < e.pb)) pose(g, 'idle', t);
  else applyPose(g, SP, { travel: t >= e.app && t < e.app + 1.2 ? 1 : 0 });
  // each orb pushes the palm back a little, and she pushes it away
  if (t >= e.pb && t < e.van) { g.root.updateMatrixWorld(true); aimArm(g, 1, W.shieldPos || strangerRoot(e.hit[0]).p.clone().add(v3(0.55, 3.9, 1.6)), smooth(e.pb, e.pb + 0.2, t)); }
  if (t >= e.pb && t < e.van) { let push = 0; for (const h of e.hit) { const d = t - h; if (d > -0.02 && d < 0.5) push = Math.max(push, d < 0.05 ? d / 0.05 : Math.exp(-(d - 0.05) * 7)); } g.arms[1].rotation.x += 0.35 * push; g.torso.rotation.x -= 0.08 * push; }
  if (t >= e.ann) { g.root.position.y += 0; }
  const cloaked = t < e.dis + 1.6;
  W.cloak.wear(cloaked); W.cloak.update(0.6); W.cloak.dissolveU.uDis.value = smooth(e.dis, e.dis + 1.6, t);
  if (!cloaked) { const gf = t < L(23).start ? 'lash:scared' : 'lash:terrified'; face(g, gf, t, 0.6, { viseme: visemeAt(L(24).text, L(24).start, L(24).end, t) }); g.torso.rotation.z = 0.02 * Math.sin(t * 31); }
  // she leaves (only one is allowed to): she fades into light while the voice speaks
  if (t >= e.leave) { const k = smooth(e.leave, e.leave + 0.4, t); g.root.scale.setScalar(1 - 0.0 * k); }
  // ---- Salinger ----
  const sal = W.sal; sal.root.visible = t < e.sal1 + 0.5;
  if (sal.root.visible) { sal.reset(); const p = salRoot(t); sal.root.position.copy(p); sal.root.rotation.set(0, 0.0, 0.04 * Math.sin((t - e.sal0) * 4.4)); pose(sal, 'walk', (t - e.sal0) * 0.62, { amt: 0.8 });
    sal.torso.rotation.z += 0.12; sal.torso.rotation.x += 0.18; sal.root.position.y = 0; sal.root.position.y -= 0.12 * Math.abs(Math.sin((t - e.sal0) * 2.0));
    sal.root.updateMatrixWorld(true); aimArm(sal, 1, sal.root.localToWorld(v3(1.0, 2.7, 0.6)), 0.85);   // a hand pressed to his side
    if (n === 'leave') sal.neck.rotation.y = 0.7 * smooth(L(1).start + 0.6, L(1).start + 1.2, t) * (1 - smooth(L(1).start + 1.8, L(1).start + 2.3, t));
    face(sal, t < L(1).start + 0.6 ? 'sad' : 'nervous', t, 0.5); }
  const ss = W.salS; ss.root.visible = t >= e.fill + 0.4; if (ss.root.visible) { ss.reset(); ss.root.position.copy(W.salSeat).add(v3(0, -0.1, 0)); ss.root.rotation.set(0, W.salYaw, 0); pose(ss, 'sit', t); face(ss, t >= e.turn ? 'scared' : 'sad', t, 0.4); ss.neck.rotation.y = t >= e.turn ? lerp(0, W.salTurn, smooth(e.turn + 0.2, e.turn + 1, t)) : 0; }
  // ---- effects ----
  // the summoning beam and sigil under Quinn
  const bk = smooth(e.sum - 0.15, e.sum + 0.1, t) * (1 - smooth(e.sum + 0.9, e.sum + 1.8, t));
  W.beamQ.position.set(-1.5, 0, 40); W.beamQ.set(bk); W.sigQ.position.set(-1.5, 0.06, 40); W.sigQ.set(bk * 1.1, t);
  // the lightning strike
  const fl = flashAt([[e.strike, 1]], t); W.bolt.position.set(0.3 - W.boltTip.x, -W.boltTip.y, QZ0 - 1.6 - W.boltTip.z); W.bolt.set(fl);
  W.scorch.position.set(0.3, 0.05, QZ0 - 1.6); W.scorch.set(smooth(e.strike, e.strike + 0.15, t) * (t < e.lift0 + 2 ? 1 : 0.6));
  // the fire wall: rises, parts round the walker, falls
  const wk = smooth(e.rise1 - 0.15, e.rise1 + 0.45, t) * (1 - smooth(e.w1 - 0.3, e.w1 + 0.9, t));
  const sw = strangerRoot(t).p, partK = smooth(4.2, 1.2, Math.abs(sw.z - W.fire.position.z));
  W.fire.set(wk, t, [sw.x, partK * 0.85], 24);
  // orbs: thrown from the hand, flying, hitting the shield at the palm, then deflected (they burst on the tiers / in the air)
  const palm = () => { g.root.updateMatrixWorld(true); return g.arms[1].localToWorld(v3(0, -1.9, 0.6)); };
  const hand = (side) => { q.root.updateMatrixWorld(true); return q.arms[side].localToWorld(v3(0, -1.9, 0.4)); };
  const DEF = [v3(-0.75, 0.45, -0.5), v3(0.8, 0.4, -0.45), v3(-0.25, 0.95, -0.2)];
  const shieldAt = W.shieldPos || (W.shieldPos = (() => { const sp = strangerRoot(e.hit[0]).p; return sp.clone().add(v3(0.55, 3.9, 1.6)); })());
  W.orbs.forEach((o, i) => {
    const t0 = e.thr[i] + 0.28, h = e.hit[i], src = W.orbSrc[i];
    if (t < t0 - 0.1 || t > h + 0.9) { o.place(v3(0, -50, 0), [], 0, t); return; }
    const at = (tt) => (tt < t0 ? hand(i === 1 ? 1 : 0) : tt < h ? lp3(src, shieldAt, easeIn(clamp((tt - t0) / (h - t0))) * 0.35 + clamp((tt - t0) / (h - t0)) * 0.65) : shieldAt.clone().addScaledVector(DEF[i], (tt - h) * 24));
    const trail = []; for (let k = 1; k <= 10; k++) { const tt = t - k * 0.018; if (tt > t0) trail.push(at(tt)); }
    const grow = t < t0 ? smooth(t0 - 0.12, t0, t) * 0.7 : 1, dieK = t > h + 0.35 ? 0 : 1;
    o.place(at(t), trail, grow * dieK * (i === 2 ? 1.25 : 1), t);
  });
  // the shield on the palm: opens before the first hit, flares at each, closes on the vanish
  const hitK = e.hit.reduce((m, h) => Math.max(m, t >= h && t < h + 0.4 ? Math.exp(-(t - h) * 9) : 0), 0);
  const shOpen = smooth(e.pb + 0.1, e.pb + 0.4, t) * (1 - smooth(e.van - 0.25, e.van, t));
  W.shield.position.copy(shieldAt); W.shield.lookAt(shieldAt.clone().add(v3(0, 0, 1))); W.shield.set(shOpen, t, hitK);
  // the big shield before the shockwave (both hands)
  const s2 = smooth(e.fire - 0.3, e.fire, t) * (1 - smooth(e.shk - 0.02, e.shk + 0.12, t)); W.shield2.position.set(0, 3.6, 8 - 2.2); W.shield2.lookAt(v3(0, 3.6, -20)); W.shield2.set(s2, t, flashAt([[e.fireC, 0.6], [e.ltC, 0.8]], t));
  // sparks at each contact: the strike, the three hits, the kick, the landing
  const C = [[e.strike, 0, v3(0.3, 0.3, QZ0 - 1.6)], [e.hit[0], 2, shieldAt], [e.hit[1], 3, shieldAt], [e.hit[2], 4, shieldAt], [e.kc, 5, v3(0, 2.4, QZ1 + 0.6)], [e.land, 6, v3(0, 0.4, 6)]];
  C.forEach(([c, i, p]) => { const sp = W.sparks[i]; sp.fire(c); sp.update(t); sp.position.copy(p); });
  // the deflected orbs burst against the tiers: debris and dust
  W.deflectHits.forEach((d, i) => { const db = W.debris[i]; db.fire(d.t); db.update(t); db.position.copy(d.p); const sp = W.sparks[i === 2 ? 7 : 1]; if (i !== 2 || true) { sp.fire(d.t); sp.update(t); sp.position.copy(d.p); } });
  // the teleport: out by the wall of fire, in behind Quinn
  W.tpA.position.copy(strangerRoot(e.van).p); W.tpA.set(t - e.van); W.tpB.position.set(0, 0, 20.2); W.tpB.set(t - e.app + 0.04);
  W.kickRing.position.set(0, 0.05, QZ1 + 0.4); W.kickRing.set(hs(t) - hs(e.kc), 5, 0.45);
  // the skid: the marks and the dust; sparks at her hands
  const skK = t >= e.land ? 1 : 0, skZ = quinnRoot(Math.min(t, e.skidEnd)).p.z;
  W.skid.visible = skK > 0 && t < e.lift0 + 3; if (W.skid.visible) { const z0 = 6.4; W.skid.scale.set(2.0, Math.max(0.01, z0 - skZ), 1); W.skid.position.set(0, 0.05, (z0 + skZ) / 2 + 0.6); W.skid.set(0.85); }
  W.dustK[0].fire(e.land); W.dustK[0].update(t); W.dustK[0].position.set(0, 0, 6);
  W.dustK[1].fire(e.skidEnd - 0.2); W.dustK[1].update(t); W.dustK[1].position.set(0, 0, QZF + 0.6);
  W.crack.position.set(0, 0.05, 6); W.crack.set(smooth(e.land, e.land + 0.1, t) * 0.9);
  const skidding = t >= e.land && t < e.skidEnd; W.handSparks.position.set(0, 0.2, quinnRoot(t).p.z - 1.0); W.handSparks.update(t, skidding ? 1 - smooth(e.skidEnd - 0.4, e.skidEnd, t) : 0);
  // the lift: a ground quake, then rocks; the stranger's palms glow
  const raiseK = smooth(e.raise + 0.4, e.raise + 1.2, t) * (1 - smooth(e.lift1, e.lift1 + 1, t));
  W.sLight.position.copy(sr.p).add(v3(0, 7, 0)); W.sLight.intensity = 40 * raiseK + 18 * s2;
  // Quinn's aura and power
  const auraK = smooth(e.close, e.unl + 1.5, t) * (1 - smooth(e.shk + 0.6, e.shk + 2.4, t));
  W.aura.position.copy(qr.p).add(v3(0, 0, 0)); W.aura.update(t, auraK);
  W.sigBig.position.set(qr.p.x, 0.07, qr.p.z); W.sigBig.set(auraK * 0.9, t);
  W.qGlow.position.copy(qr.p).add(v3(0, 3.2, 0)); W.qGlow.material.opacity = 0.18 * auraK; W.qGlow.scale.setScalar(5 + 2 * auraK);
  W.qLight.position.copy(qr.p).add(v3(0, 4, 1.5)); W.qLight.intensity = 34 * auraK + 120 * flashAt([[e.shk, 1]], t);
  // fire: a stream from both hands to the big shield
  const fk = smooth(e.fireC - 0.05, e.fireC + 0.08, t) * (1 - smooth(e.lt - 0.05, e.lt + 0.1, t));
  W.stream.set(hand(0).lerp(hand(1), 0.5), v3(0, 3.6, 8 - 2.4), fk, t);
  // lightning: arcs from each hand to the shield, re-drawn 24 times a second
  const lk = t >= e.ltC && t < e.rel + 0.25 ? 1 - 0.4 * ((t * 24) % 1) : 0, seed = Math.floor(t * 24);
  W.arcs[0].set(hand(0), v3(-0.6, 3.8, 8 - 2.3), lk, seed); W.arcs[1].set(hand(1), v3(0.6, 3.5, 8 - 2.3), lk, seed + 7); W.arcs[2].set(hand(0), v3(1.4, 4.4, 8 - 2.4), lk * 0.6, seed + 13);
  // the shockwave from Quinn across the floating arena; the floor cracks under her; chunks fly from the tiers
  W.shock.position.set(qr.p.x, 0, qr.p.z); W.shock.set(hs(t) - hs(e.shk), 75, 1.6);
  W.bigCrack.position.set(qr.p.x, 0.05, qr.p.z); W.bigCrack.set(smooth(e.shk, e.shk + 0.2, t) * 0.85);
  W.chunks.fire(e.shk + 0.5); W.chunks.update(t); W.chunks.position.set(0, 3, 30); if (n !== 'shock') W.chunks.visible = false;
  // the cloak's particles (sampled from the cloak at the moment it begins to go)
  W.cloakP.set(t - e.dis);
  // the shadow spectators
  const yawTo = (s, x, z) => Math.atan2(x - s.x, z - s.z);
  W.crowd.set({
    fill: (i) => { const s = W.seats[i]; return smooth(e.fill + s.row * 0.11 + W.jit[i] * 0.55, e.fill + s.row * 0.11 + W.jit[i] * 0.55 + 0.5, t); },
    yaw: (i) => { const s = W.seats[i], k = smooth(e.turn + W.ang[i] * 0.9, e.turn + W.ang[i] * 0.9 + 0.45, t); const a0 = yawTo(s, 0, 9.6), a1 = yawTo(s, qr.p.x, qr.p.z); let d = a1 - a0; d = Math.atan2(Math.sin(d), Math.cos(d)); return a0 + d * k; },
    eyes: (i) => smooth(e.turn + W.ang[i] * 0.9 + 0.2, e.turn + W.ang[i] * 0.9 + 0.3, t),
  }, t);
  // the announcement: the sky sigil and the floor runes flare
  W.skySig.set(smooth(e.ann, e.ann + 0.4, t) * (0.7 + 0.3 * Math.sin(t * 5)), t * 0.3);
  // ---- impact frames: a short flash and a kick of the camera at each contact ----
  let flash = 0, shake = 0, fcol = '#ffffff';
  const imp = (c, f, s2_, col) => { const d = t - c; if (d >= 0 && d < 0.5) { flash = Math.max(flash, f * Math.exp(-d * 26)); shake = Math.max(shake, s2_ * Math.exp(-d * 8)); if (col) fcol = col; } };
  imp(e.strike, 0.28, 1.5, '#e8ecff'); e.hit.forEach((h, i) => imp(h, i === 2 ? 0.16 : 0.1, 0.8)); imp(e.kc, 0.0, 2.2, '#ffffff'); imp(e.land, 0, 1.4); imp(e.bell, 0, 0.5);
  imp(e.shk, 0.12, 2.0, '#d9b8ff'); imp(e.fireC, 0, 0.6); imp(e.ltC, 0.12, 0.8, '#dcd6ff');
  if (t >= e.lift0 && t < e.lift1) shake = Math.max(shake, 0.9 * Math.sin(Math.PI * smooth(e.lift0, e.lift1, t)));
  if (t >= e.tpFlash && t < e.tpFlash + 0.2) flash = Math.max(flash, 0.08);
  // ---- lights on the subject ----
  const focus = ['duelA', 'duelB', 'duelC', 'duelD'].includes(n) ? qr.p.clone().lerp(sr.p, 0.5) : ['leave'].includes(n) ? salRoot(t) : ['point', 'cloak', 'through', 'block', 'raise', 'dissolve', 'girl', 'terrified'].includes(n) ? sr.p.clone() : n === 'salinger' ? W.salSeat.clone() : qr.p.clone();
  W.camSide = v3(sh.pos.x - focus.x, 0, sh.pos.z - focus.z).normalize();
  setLights(t, focus, ['open', 'lift', 'void', 'shock', 'turn', 'final', 'fill'].includes(n) ? 0.4 : 1);
  W.fill.position.y = focus.y + 4.5;
  const near = ['cut', 'eyes', 'terrified', 'quinnR', 'hands'].includes(n) ? 0.06 : 0.2; if (ctx.camera.near !== near) { ctx.camera.near = near; ctx.camera.updateProjectionMatrix(); }
  const steady = t < e.bell;
  frame(ctx, t, sh, { steady, shake: steady ? 0 : shake, shadowSpan: ['open', 'lift', 'void', 'shock', 'turn', 'final', 'fill', 'seats'].includes(n) ? 90 : 34, flash, flashColor: fcol, shadows: true });
  W.fx.set(t, fxAt(t, n, ctx.camera));
  return n;
}

export async function setup() {
  ctx = await initStage('ep33', { look: 'pro', avatars: ['farm_ep33_quinn', 'farm_ep33_girl', 'farm_ep33_salinger'] }); L = ctx.L;
  const EV = events();
  HOLDS = [[T.strike, 0.04], [T.hit[0], 0.03], [T.hit[1], 0.03], [T.hit[2], 0.05], [T.kc, 0.09], [T.shk, 0.07]];
  T.tpFlash = T.app;
  await loadAnimSet('magic_set');
  await loadAlti(['neutral', 'sad', 'nervous', 'scared', 'lash:neutral', 'lash:surprised', 'lash:nervous', 'lash:scared', 'lash:suspicious', 'lash:shocked', 'lash:angry', 'lash:terrified', 'lash:sad']);
  const { camera } = ctx; camera.far = 3000; camera.near = 0.2; camera.updateProjectionMatrix();
  W.fill = new THREE.PointLight('#ffffff', 0, 24, 1.6); W.rim = new THREE.PointLight('#ffffff', 0, 26, 1.4); [W.fill, W.rim].forEach((l) => ctx.scene.add(l));
  W.camSide = v3(0, 0, 1);
  world(); people();
  W.fx = installActionFX(ctx);
  // the spectators' seats (Salinger's is the front-row seat nearest to his angle) and their timing jitter
  const seats = W.arena.seats, r = rng(7);
  let best = 0, bd = 1e9; seats.forEach((s, i) => { if (s.row !== 0) return; const d = Math.hypot(s.x - 23.5, s.z - (-11)); if (d < bd) { bd = d; best = i; } });
  W.salSeat = v3(seats[best].x, seats[best].y, seats[best].z); W.salYaw = Math.atan2(-seats[best].x, -seats[best].z);
  W.salTurn = 0;
  W.seats = seats.filter((s, i) => i !== best); W.jit = W.seats.map(() => r()); W.ang = W.seats.map((s) => (Math.atan2(s.z, s.x) / Math.PI + 1) / 2);
  W.crowd = shadowCrowd(W.seats); ctx.scene.add(W.crowd);
  // where the orbs leave the hands: from the pose at release (pure functions of t, so every worker agrees)
  W.orbSrc = T.thr.map((t0, i) => { renderPoseOnly(t0 + 0.28); W.q.root.updateMatrixWorld(true); return W.q.arms[i === 1 ? 1 : 0].localToWorld(v3(0, -1.9, 0.4)); });
  // the deflected orbs' bursts on the tiers and in the air
  W.shieldPos = null;
  const sp = strangerRoot(T.hit[0]).p, sh0 = sp.clone().add(v3(0.55, 3.9, 1.6));
  W.deflectHits = [[v3(-0.75, 0.45, -0.5), 0.36], [v3(0.8, 0.4, -0.45), 0.38], [v3(-0.25, 0.95, -0.2), 0.32]].map(([d, dt], i) => ({ t: T.hit[i] + dt, p: sh0.clone().addScaledVector(d, dt * 24) }));
  // the cloak's particles: sampled from the cloak as it is when it starts to dissolve
  renderPoseOnly(T.dis); W.g.root.updateMatrixWorld(true);
  W.cloakP = driftParticles(W.cloak.surfacePoints(1100), { dur: 2.6, size: 0.055, c1: '#c9b48a', c2: '#6a4aa8', wind: v3(0, 0.4, 0.6) }); ctx.scene.add(W.cloakP);
  W.shots = shots();
  void noise1;
  return expose(ctx, renderAt, L(23).start + 0.7, EV);
}
// pose the characters for time t without drawing (used in setup to sample points)
function renderPoseOnly(t) {
  const q = W.q, qr = quinnRoot(t); q.reset(); q.root.position.copy(qr.p); q.root.rotation.set(qr.rx, qr.ry, 0); applyPose(q, quinnPose(t), { travel: 0 });
  const g = W.g, sr = strangerRoot(t); g.reset(); g.root.position.copy(sr.p); g.root.rotation.set(0, sr.ry, 0); applyPose(g, strangerPose(t), { travel: 0 }); W.cloak.update(0.6);
}
