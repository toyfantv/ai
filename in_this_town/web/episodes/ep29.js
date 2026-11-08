// Episode 29: The Tower With No Ground Floor (Liminal Horror 3/5). Eli has climbed a windowless tower for three hours and the ground keeps getting farther away. Other climbers have stopped: a girl hugging
// her knees asks if it's still Tuesday, a man repaints a platform "same as last time", an old climber gives him chalk: "Keep count, kid." At level fifty: STOP COUNTING; he marks another tally. At seventy
// the platforms stop and so does everyone on them. At ninety, footsteps above, where nobody has climbed. At one hundred, a white door; behind it the same tower hanging upside down, and a boy in Eli's clothes
// climbing toward him. The boy points behind Eli: hundreds of tally marks on the wall, in his chalk: YOU HAVE REACHED THE TOP 416 TIMES. The door slams; "Attempt 417 begins now." The floor disappears.
// An original design (engine/infinitetower.js). The world: the tower's axis is y at the origin; level 99 is at +z; the door wall stands on the roof along x at z 0; the mirrored tower is past it (-z), hung from y = CY.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, NIGHT } from '../engine/stage.js';
import { dust, atmos } from '../engine/atmos.js';
import { canvasTex } from '../engine/props.js';
import { aimArm as aimArm0, applyPose, sample, keyed, KEYED } from '../engine/anims.js';
import { TW, levelPos, levelAngle, radial, along, buildTower, loosePlatform, doorWall, ledge, towerField, curved, chalkStick, paintKit, jointify, DOOR, CANDY } from '../engine/infinitetower.js';
const aimArm = (c, side, p, k = 1) => { c.root.updateMatrixWorld(true); aimArm0(c, side, p, k); };
const lp3 = (a, b, u) => a.clone().lerp(b, u);

let ctx, L, EV;
const W = { eh: v3(0, 6, 0), hand: v3() };
const YT = TW.TOP * TW.DY, HM = 12, CY = 2 * (YT + HM), ZC = -74, YB = YT + 16.5;
const AV = { wren: 'farm_ep29_wren', painter: 'farm_ep29_painter', old: 'farm_ep29_old', runner: 'farm_ep29_runner', hang: 'farm_ep29_hang', kid: 'farm_ep29_kid' };
const SK = { eli: '#f2c9a0', wren: '#f2c9a0', painter: '#8d5524', old: '#f2c9a0', runner: '#f2c9a0', hang: '#c68642', kid: '#f2c9a0' };
const VOID = { ...NIGHT, ...P({ top: '#000000', horizon: '#000000', haze: '#000000', sunColor: '#e9efc4', hemiSky: '#d4dabb', hemiGround: '#3f4735' }), sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 1.15, amb: 0.3, envI: 0.45, exposure: 1.18, bloom: 0.04, fogNear: 130, fogFar: 1150, saturation: 1.02, contrast: 1.06, bounce: 0.1, win: 0, lamp: 0 };

const JUMP = keyed([
  { t: 0, torso: [16, 0, 0], neck: [-10, 0, 0], aR: [-14, 0, 10], aL: [-14, 0, -10], lR: [-32, 0, 0], lL: [-24, 0, 0], h: 0.86 },
  { t: 0.13, ease: 'out', torso: [-8, 0, 0], neck: [-6, 0, 0], aR: [-150, 0, 14], aL: [-140, 0, -14], lR: [-8, 0, 0], lL: [14, 0, 0], h: 1 },
  { t: 0.4, torso: [6, 0, 0], neck: [-8, 0, 0], aR: [-110, 0, 22], aL: [-70, 0, -22], lR: [-68, 0, 0], lL: [-18, 0, 0], h: 0.98 },
  { t: 0.66, torso: [20, 0, 0], neck: [-12, 0, 0], aR: [-42, 0, 28], aL: [-38, 0, -28], lR: [-40, 0, 0], lL: [-22, 0, 0], h: 0.84 },
  { t: 0.84, torso: [4, 0, 0], neck: [-3, 0, 0], aR: [-8, 0, 10], aL: [-8, 0, -10], lR: [-6, 0, 0], lL: [4, 0, 0], h: 0.99 },
], { src: 'hand-keyed (Episode 29): a platform jump' });
KEYED.ep29jump = JUMP;
const FALLING = keyed([
  { t: 0, torso: [-14, 0, 6], neck: [-20, 0, 0], aR: [-170, 0, 34], aL: [-150, 0, -40], lR: [-18, 0, -8], lL: [24, 0, 8], h: 1 },
  { t: 0.7, torso: [-6, 0, -6], neck: [-14, 0, 0], aR: [-140, 0, 52], aL: [-176, 0, -26], lR: [22, 0, -12], lL: [-20, 0, 12], h: 1 },
  { t: 1.4, torso: [-14, 0, 6], neck: [-20, 0, 0], aR: [-170, 0, 34], aL: [-150, 0, -40], lR: [-18, 0, -8], lL: [24, 0, 8], h: 1 },
], { loop: true, src: 'hand-keyed (Episode 29): falling, arms up' });
KEYED.ep29fall = FALLING;

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  const floor = s(26) + 0.6, FALL = floor + 0.95;
  return { STOP: s(9) + 1.72, give: s(5) + 0.52, stroke0: s(8) + 0.1, stroke1: e(8) + 0.12, jumpsAt: [0.6, 2.15, 7.1, 8.6, 9.95, s(4) + 0.55, s(6) + 0.3, s(9) + 0.12, s(11) + 0.2, s(13) + 0.25], door0: s(14) - 0.2, doorAt: s(14) + 1.0, doorOpen: s(15) + 0.08, thru0: s(16) + 0.55, thru1: s(17) + 0.6, boy0: s(18) + 0.05, boyEnd: s(20) - 0.12, point0: s(20) + 0.2, turn0: s(20) + 1.05, step0: s(23), step1: e(23) + 0.05, slam: s(24) + 0.42, floor, FALL, end: ctx.dur, steps90: [0, 1, 2, 3, 4].map((i) => s(11) + 1.15 + i * 0.42) };
}
const tw = (t) => Math.min(t, EV.STOP);
const groundY = (t) => { const s = L(1).start; return -340 - 10 * t - 180 * Math.max(0, t - s - 0.5) ** 1.6; };

// ---- Eli's climb: a list of teleports across cuts and jumps ----
function sched() {
  const s = (i) => L(i).start;
  return [[0, 'at', 7], [0.6, 'j', 7, 8], [2.15, 'j', 8, 9], [7.1, 'j', 9, 10], [8.6, 'j', 10, 11], [9.95, 'j', 11, 12], [s(4) - 0.1, 'at', 25], [s(4) + 0.55, 'j', 25, 26], [s(5) - 0.12, 'at', 38], [s(6) - 0.1, 'at', 49], [s(6) + 0.3, 'j', 49, 50], [s(9) - 0.1, 'at', 69], [s(9) + 0.12, 'j', 69, 70], [s(11) - 0.1, 'at', 89], [s(11) + 0.2, 'j', 89, 90], [s(13) - 0.1, 'at', 99], [s(13) + 0.25, 'j', 99, 100]];
}
const JD = 0.84;
function climbState(t) { let st = { n: 7 }; for (const c of W.sch) { if (t < c[0]) break; if (c[1] === 'at') st = { n: c[2] }; else if (t < c[0] + JD) st = { n: c[2], from: c[2], to: c[3], u: (t - c[0]) / JD }; else st = { n: c[3] }; } return st; }
const SIDE = { 12: -2.6, 26: -3.1, 38: -2.1 };
const landingPt = () => v3(0, YT, 12.5);
function standPos(n, t, o = {}) { if (n >= 100) return landingPt(); return levelPos(n, tw(t), { side: o.side ?? SIDE[n] ?? 0, rad: o.rad ?? 0 }); }

const armLen = (c) => { if (!c._alen) { c.reset(); const r = c.root.rotation.clone(), p = c.root.position.clone(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3().setFromObject(c.arms[0]); c._alen = sh.y - bx.min.y - 0.25; c.root.rotation.copy(r); c.root.position.copy(p); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); return c.arms[side].localToWorld(v3(0, -armLen(c), 0.12)); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.scale.setScalar(c._sc || 1); }
function place(c, p, yaw) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.noBlink ? false : blinkAt(t, ph) && !['shocked', 'terrified'].includes(name), viseme: o.viseme }); }

function people() {
  const mk = (avatar, skin, sc = 1) => { const c = makeCharacter({ avatar, alti: true, skin, caustic: false }); ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c._sc = sc; c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c); return c; };
  W.e = mk('farm_ep38_eli', SK.eli); W.boy = mk('farm_ep38_eli', SK.eli); W.wren = mk(AV.wren, SK.wren); W.painter = mk(AV.painter, SK.painter); W.old = mk(AV.old, SK.old); W.runner = mk(AV.runner, SK.runner); W.hang = mk(AV.hang, SK.hang); W.kid = mk(AV.kid, SK.kid, 0.74);
  W.all = [W.wren, W.painter, W.old, W.runner, W.hang, W.kid];
  W.chalk = chalkStick(); ctx.scene.add(W.chalk);
  W.kit = paintKit(); ctx.scene.add(W.kit); ctx.scene.add(W.kit.roller);
  W.wet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#58b4c4', roughness: 0.12 })); W.wet.rotation.x = -Math.PI / 2; W.wet.userData.noAO = true; ctx.scene.add(W.wet);
}

// a seated figure with knees drawn up, arms round them
function poseWren(t) {
  const c = W.wren, s = (i) => L(i).start, e = (i) => L(i).end, p = levelPos(12, tw(t), { side: 1.9, rad: 0.8 }), n = 12, fw = radial(n).multiplyScalar(1).addScaledVector(along(n), -0.35).normalize();
  place(c, p, Math.atan2(fw.x, fw.z)); const J = c.J, hipDrop = (c.hipY ?? 2) - 0.72; c.hips.position.y -= hipDrop;
  c.legs.forEach((l, i) => { l.rotation.x = -2.05; l.rotation.z = i ? 0.1 : -0.1; c.knee[i].rotation.x = 2.1; }); c.torso.rotation.x = 0.28;
  c.root.updateMatrixWorld(true);
  c.legs.forEach((l, i) => { aimArm(c, i, c.knee[i].getWorldPosition(v3()).add(v3(0, -1.0, 0)).add(fw.clone().multiplyScalar(0.75)), 1); });
  c.neck.rotation.x = -0.36 * smooth(s(3) - 0.6, s(3) - 0.1, t) + 0.3 * (1 - smooth(s(3) - 0.6, s(3) - 0.1, t)); c.neck.rotation.y = -0.45 * smooth(s(3) - 0.6, s(3) - 0.1, t);
  const viseme = t > s(3) && t < e(3) ? visemeAt(L(3).text, s(3), e(3), t) : undefined; face(c, 'nervous', t, 0.7, { viseme });
}
function posePainter(t) {
  const c = W.painter, s = (i) => L(i).start, e = (i) => L(i).end, n = 26, u = tw(t), base = levelPos(n, u, { side: 1.1, rad: -0.6 }), fw = along(n);
  place(c, base, Math.atan2(fw.x, fw.z));
  const hipDrop = (c.hipY ?? 2) - (c.J.thigh + 0.15); c.hips.position.y -= hipDrop * 0.85;
  c.legs.forEach((l, i) => { l.rotation.x = 0.05; c.knee[i].rotation.x = 1.62; l.rotation.z = i ? 0.1 : -0.1; }); c.torso.rotation.x = 0.55;
  const k = Math.sin(t * 2.1) * 0.5 + 0.5, tip = base.clone().add(fw.clone().multiplyScalar(2.2 + k * 1.2)).add(v3(0, 0.27, 0)); const gr = base.clone().add(fw.clone().multiplyScalar(1.15)).add(v3(0, 2.4, 0)).add(radial(n).multiplyScalar(-0.1));
  c.root.updateMatrixWorld(true); aimArm(c, 0, gr, 1); aimArm(c, 1, gr.clone().add(fw.clone().multiplyScalar(-0.3)).add(v3(0, -0.2, 0)), 0.8);
  const r = W.kit.roller, hp = handOf(c, 0); r.position.copy(hp); r.up.set(0, 1, 0); r.lookAt(tip); r.visible = true; W.kit.visible = true; W.kit.position.copy(base.clone().add(along(n).multiplyScalar(-0.6)).add(radial(n).multiplyScalar(1.7)));
  const wlen = 0.8 + clamp((t - (s(4) - 1.2)) / 3) * 3.8, mid = base.clone().add(fw.clone().multiplyScalar(wlen / 2 + 0.6)).add(v3(0, 0.035, 0));
  W.wet.visible = true; W.wet.position.copy(mid); W.wet.scale.set(2.4, wlen, 1); W.wet.rotation.set(-Math.PI / 2, 0, Math.PI / 2 - levelAngle(n) + Math.PI / 2 - Math.PI / 2 + Math.PI / 2);
  c.neck.rotation.x = -0.62; c.neck.rotation.y = 0.3; const viseme = t > s(4) && t < e(4) ? visemeAt(L(4).text, s(4), e(4), t) : undefined; face(c, 'neutral', t, 0.4, { viseme });
}
function poseOld(t) {
  const c = W.old, s = (i) => L(i).start, e = (i) => L(i).end, n = 38, p = levelPos(n, tw(t), { side: 1.7, rad: 0 }), toE = along(n).multiplyScalar(-1);
  place(c, p, Math.atan2(toE.x, toE.z)); pose(c, 'idle', t); c.torso.rotation.x = 0.13; c.root.updateMatrixWorld(true);
  const give = EV.give, kk = smooth(s(5) - 0.05, s(5) + 0.38, t) * (1 - smooth(give + 0.32, give + 0.72, t));
  const eye = W.e.root.position.clone(), mid = p.clone().lerp(eye, 0.5).add(v3(0, 3.5, 0)).add(radial(n).multiplyScalar(0.25));
  W.mid38 = mid; if (kk > 0) aimArm(c, 0, mid.clone().add(toE.clone().multiplyScalar(-0.2)), kk);
  c.neck.rotation.x = -0.05; const viseme = t > s(5) && t < e(5) ? visemeAt(L(5).text, s(5), e(5), t) : undefined; face(c, 'neutral', t, 0.5, { viseme, gaze: 'down' });
  if (t < give) { W.chalk.position.copy(handOf(c, 0)).add(toE.clone().multiplyScalar(0.15)); W.chalk.rotation.set(0, 0, 1.2); W.chalk.visible = kk > 0; }
}
// frozen at level seventy: the moment the tower stops
function poseFrozen(t) {
  const u = tw(t), S = EV.STOP, r = W.runner, h = W.hang, k = W.kid;
  { const t0 = S - 0.42, ju = clamp((u - t0) / JD), a = levelPos(71, u, { side: 1.5 }), b = levelPos(72, u, { side: -1.5 }), q = lp3(a, b, ju); q.y += Math.sin(Math.PI * Math.min(ju, 1)) * 5.2; place(r, q, yawTo(a, b)); applyPose(r, sample('ep29jump', ju * JD)); r.neck.rotation.y = 0.1; face(r, ju >= 0.4 ? 'scared' : 'nervous', t, 0.3, { noBlink: t > S }); }
  { const n = 73, q = levelPos(n, u, { side: 0.6, rad: TW.D / 2 + 0.72 }); q.y -= 5.45; place(h, q, Math.atan2(-radial(n).x, -radial(n).z)); h.root.updateMatrixWorld(true); const top = levelPos(n, u, { side: 0.6, rad: TW.D / 2 - 0.06, up: 0.28 }); h.arms.forEach((_, i) => aimArm(h, i, top.clone().add(along(n).multiplyScalar(i ? 1.0 : -1.0)), 1)); h.legs[0].rotation.x = -0.32; h.legs[1].rotation.x = 0.16; h.neck.rotation.x = -0.1; h.torso.rotation.x = -0.05; face(h, 'scared', t, 0.4, { noBlink: t > S }); }
  { const n = 72, q = levelPos(n, u, { side: -3.2, rad: 2 }); place(k, q, Math.atan2(-along(n).x, -along(n).z) + 0.4); pose(k, 'idle', S); k.arms[0].rotation.z = -1.25; k.arms[1].rotation.z = 1.25; k.legs[1].rotation.x = -0.34; k.torso.rotation.z = 0.08; k.neck.rotation.x = 0.1; face(k, 'neutral', t, 0.2, { noBlink: t > S }); }
}

// ---- Eli ----
function poseEli(t) {
  const c = W.e, s = (i) => L(i).start, e = (i) => L(i).end, EVT = EV, st = climbState(t);
  W.level = st.n;
  W.chalk.visible = W.chalk.visible && t < EVT.give;
  if (t >= EVT.floor) return poseFall(t);
  if (st.from != null) {   // a jump
    const a = standPos(st.from, t), b = standPos(st.to, t), j = st.u, q = lp3(a, b, easeInOut(j)); q.y += Math.sin(Math.PI * j) * 4.6; place(c, q, yawTo(a, b)); applyPose(c, sample('ep29jump', j * JD)); face(c, 'worried', t, 0.3); return;
  }
  const n = st.n, base = standPos(n, t), fw = n < 100 ? along(n) : v3(0, 0, -1);
  if (n < 100) {
    let yaw = Math.atan2(fw.x, fw.z), p = base.clone(), mode = 'idle';
    if (n === 9 && t > s(1) - 0.15 && t < s(2) - 0.05) {   // looks down over the edge
      const R = radial(n); p = levelPos(9, tw(t), { rad: smooth(s(1) - 0.15, s(1) + 0.5, t) * 2.6 }); yaw = Math.atan2(R.x, R.z); place(c, p, yaw); pose(c, 'idle', t); c.torso.rotation.x = 0.22 * smooth(s(1), s(1) + 0.7, t); c.neck.rotation.x = 0.52 * smooth(s(1), s(1) + 0.7, t); face(c, 'worried', t, 0.5, { gaze: 'down' }); return;
    }
    if (n === 50) {   // to the wall, reads, marks another tally
      const u = clamp((t - (s(6) + 1.4)) / 0.9); const R = radial(n); p = levelPos(50, tw(t), { rad: -2.72 * easeInOut(u) }); yaw = lerp(yaw, Math.atan2(-R.x, -R.z), easeInOut(u)); place(c, p, yaw);
      if (u > 0 && u < 1) pose(c, 'walk', t * 0.9); else pose(c, 'idle', t);
      const fin = smooth(EVT.stroke0 - 0.45, EVT.stroke0 - 0.05, t) * (1 - smooth(EVT.stroke1 + 0.35, EVT.stroke1 + 0.75, t));
      if (fin > 0) { const su = clamp((t - EVT.stroke0) / (EVT.stroke1 - EVT.stroke0)); const a = levelAngle(50), off = W.tallyAng; const pt = v3(Math.cos(a + off) * 18.08, 50 * TW.DY + 3.6 + 0.8 * (1 - su) - 0.4 * su + 0.45, Math.sin(a + off) * 18.08); aimArm(c, 0, pt, fin); const h = handOf(c, 0); W.chalk.visible = true; W.chalk.position.copy(h); W.chalk.up.set(0, 1, 0); W.chalk.lookAt(pt); W.chalk.rotateX(Math.PI / 2); W.hand.copy(h); }
      c.neck.rotation.x = -0.2 * (1 - fin * 0.6); face(c, t < s(8) ? 'surprised' : t < EVT.stroke1 ? 'neutral' : 'neutral', t, 0.5, { gaze: fin > 0.5 ? 'down' : undefined }); return;
    }
    place(c, p, yaw); pose(c, 'idle', t);
    if (n === 12) { const wq = W.wren.root.position; c.root.rotation.y = lerp(yaw, yawTo(p, wq), smooth(s(3) - 0.3, s(3) + 0.3, t)); c.neck.rotation.x = 0.3; face(c, 'nervous', t, 0.6); return; }
    if (n === 26) { face(c, 'surprised', t, 0.8, { gaze: 'down' }); c.neck.rotation.x = 0.3; return; }
    if (n === 38) {
      const ky = smooth(s(5) + 0.05, EV.give - 0.1, t), give = EV.give; c.root.rotation.y = yaw; c.root.updateMatrixWorld(true);
      if (W.mid38) { const k2 = ky * (1 - smooth(give + 0.7, give + 1.15, t)); aimArm(c, 0, W.mid38.clone().add(along(n).multiplyScalar(-0.25)), k2); }
      if (t >= give) { const h = handOf(c, 0); W.chalk.visible = true; W.chalk.position.copy(h).add(along(n).multiplyScalar(0.1)); W.chalk.rotation.set(0, 0, 1.2); W.hand.copy(h); }
      face(c, t < give ? 'nervous' : 'surprised', t, 0.7, { gaze: 'down' }); c.neck.rotation.x = 0.16; return;
    }
    if (n === 90) { c.neck.rotation.x = -0.72 * smooth(EVT.steps90[0] - 0.3, EVT.steps90[0] + 0.2, t); c.torso.rotation.x = -0.05; face(c, t < s(12) ? 'surprised' : 'scared', t, 0.6, { gaze: 'up' }); return; }
    if (n === 70) { face(c, t < EVT.STOP ? 'worried' : 'scared', t, 0.7); return; }
    face(c, t < s(3) ? 'neutral' : 'worried', t, 0.4); return;
  }
  // the roof, the door, the far side
  const d = W.wallG.handle, walkU = clamp((t - EVT.door0) / (EVT.doorAt - EVT.door0)), hx = 1.0;
  let p = lp3(landingPt(), v3(hx, YT, 3.0), easeInOut(walkU)), yaw = Math.PI;
  if (t < EVT.thru0) {
    place(c, p, yaw);
    if (walkU > 0 && walkU < 1) pose(c, 'walk', t * 0.95); else pose(c, 'idle', t);
    const o0 = s(15) - 0.34, push = smooth(o0, s(15), t) * (1 - smooth(EVT.doorOpen + 0.26, EVT.doorOpen + 0.7, t));
    if (push > 0) { c.root.updateMatrixWorld(true); aimArm(c, 0, v3(d.x - 2.6, YT + d.y, 0.55), push); }
    face(c, 'nervous', t, 0.6); return;
  }
  const q = clamp((t - EVT.thru0) / (EVT.thru1 - EVT.thru0)), nearP = v3(hx, YT, 3.0), door = v3(0.1, YT, 0), farP = v3(0.35, YT, -5.6);
  const sp = q < 0.42 ? lp3(nearP, door, q / 0.42) : lp3(door, farP, (q - 0.42) / 0.58); yaw = Math.PI;
  let z = sp.z; if (t >= EVT.step0) z = lerp(-5.6, -7.6, easeInOut(clamp((t - EVT.step0) / (EVT.step1 - EVT.step0)))); sp.z = z;
  if (t > EVT.turn0) yaw = lerp(Math.PI, 0.06, easeInOut(clamp((t - EVT.turn0) / 0.7)));
  place(c, sp, yaw);
  if (q > 0 && q < 1) pose(c, 'walk', t * 0.95); else if (t >= EVT.step0 && t < EVT.step1) pose(c, 'walk', -(t - EVT.step0) * 1.0); else pose(c, 'idle', t);
  if (t > s(17) && t < EVT.turn0) c.neck.rotation.x = -0.55 * smooth(s(17), s(17) + 0.5, t);
  if (t > e(25) - 2.6) c.neck.rotation.x = -0.42 * smooth(s(25), s(25) + 0.5, t) * (t < EVT.floor ? 1 : 0.3);
  const fx = t < s(17) ? 'surprised' : t < s(19) ? 'scared' : t < EVT.turn0 ? 'scared' : t < s(23) ? 'terrified' : t < s(25) ? 'shocked' : 'scared';
  face(c, fx, t, 0.7, { noBlink: t > s(22) });
}
function poseFall(t) {
  const c = W.e, e = EV.FALL; W.level = 200; const u = Math.max(0, t - EV.floor);
  if (t < e) { const q = v3(0.35, YT - 26 * u * u, -7.4); place(c, q, 0.06); applyPose(c, sample('ep29fall', u)); c.root.rotation.x = -u * 0.7; face(c, 'terrified', t, 0.3, { noBlink: true }); }
  else { const q = v3(0, W.fy(t), 0); place(c, q, 0.4 + (t - e) * 0.22); applyPose(c, sample('ep29fall', t * 0.8)); c.root.rotation.x = -1.2 + Math.sin(t * 0.6) * 0.25; c.root.rotation.z = 0.25 + (t - e) * 0.3; c.neck.rotation.x = -0.3; face(c, 'terrified', t, 0.3, { noBlink: true }); }
}

// the boy: he walks and jumps on the underside of the mirrored platforms
const BRIDGE = [v3(-16, YB + 10.5, -46), v3(-10.5, YB + 6.8, -34), v3(-5, YB + 3, -22.5), v3(0, YB, -11.2)];
function poseBoy(t) {
  const c = W.boy, s = (i) => L(i).start, e = (i) => L(i).end, E = EV; const n = shotName(t); c.root.visible = t > E.doorOpen - 0.1 && t < E.floor + 1.2 && !['wall', 'tall', 'w416', 'slam', 'pa'].includes(n); if (!c.root.visible) return;
  const dur = E.boyEnd - E.boy0, N = BRIDGE.length - 1, seg = clamp((t - E.boy0) / dur) * N, i = Math.min(N - 1, Math.floor(seg)), f = seg - i;
  const a = BRIDGE[i], b = BRIDGE[i + 1], q = t <= E.boy0 ? BRIDGE[0].clone() : lp3(a, b, easeInOut(f)), yaw = Math.atan2(b.x - a.x, -(b.z - a.z)) || 0;
  const rolling = f > 0.02 && f < 0.98 && t < E.boyEnd && t > E.boy0;
  if (rolling) q.y -= Math.sin(Math.PI * f) * 2.0;    // the arc goes "up" for him, down in the world
  rs(c); c.root.visible = true; c.root.position.copy(q); c.root.rotation.set(Math.PI, yaw, 0);
  if (rolling) applyPose(c, sample('ep29jump', f * JD)); else pose(c, 'idle', 1.0);
  if (t >= E.point0) { c.root.updateMatrixWorld(true); aimArm(c, 0, v3(0.8, YT + 9, 0), smooth(E.point0, E.point0 + 0.5, t)); }
  c.neck.rotation.x = t > E.boyEnd - 0.2 ? 0.0 : 0.1; face(c, 'neutral', 1.1, 0, { noBlink: true });
}

const shotName = (t) => shotAt(W.shots, t).name;
// ---- rig ----
function rig() {
  W.pl = []; for (let i = 0; i < 8; i++) { const l = new THREE.PointLight('#ffffff', 0, 30, 1.6); ctx.scene.add(l); W.pl.push(l); }
  const s = new THREE.SpotLight('#ffffff', 0, 90, 0.7, 0.75, 1.0); s.castShadow = true; s.shadow.mapSize.set(1536, 1536); s.shadow.bias = -0.0006; s.shadow.normalBias = 0.05; ctx.scene.add(s); ctx.scene.add(s.target); W.key = s;
}
const setL = (i, p, col, I, dist) => { const l = W.pl[i]; l.position.copy(p); l.color.set(col); l.intensity = I; l.distance = dist; };
const SICK = '#dfe9bd';
function lights(set, t) {
  W.pl.forEach((l) => { l.intensity = 0; }); W.key.intensity = 0; const fl = 0.97 + noise1(t * 13) * 0.05, key = (p, tg, col, I, ang = 0.7, dist = 90) => { W.key.position.copy(p); W.key.target.position.copy(tg); W.key.color.set(col); W.key.intensity = I; W.key.angle = ang; W.key.distance = dist; };
  const eli = W.e.root.position;
  if (set === 'near') {
    const R = v3(eli.x, 0, eli.z).normalize();
    key(eli.clone().addScaledVector(R, 20).add(v3(0, 24, 0)), eli.clone().add(v3(0, 2.5, 0)), SICK, 300 * fl, 0.6, 100);
    setL(0, eli.clone().addScaledVector(R, 12).add(v3(0, 3, 0)), '#f3efd8', 34, 34); setL(1, eli.clone().addScaledVector(R, -1.0).add(v3(3, 11, 2)), SICK, 34 * fl, 42); setL(2, eli.clone().addScaledVector(R, 6).add(v3(-12, -10, 8)), '#8fa0c9', 46, 62); setL(3, eli.clone().addScaledVector(R, 6).add(v3(12, 16, -8)), SICK, 50, 62);
    if (W.level >= 99) { setL(4, v3(0, YT + 7.5, 8), '#f8f4e6', 42, 34); setL(5, v3(-13, YT + 12, 12), SICK, 28, 44); setL(6, v3(13, YT + 12, 12), SICK, 28, 44); }
  } else if (set === 'far') {
    key(v3(0.5, YT + 22, -22), v3(0.3, YT + 2.5, -3), '#eef0d4', 320 * fl, 0.72, 100);
    setL(0, v3(1, YT + 7, -17), '#eef0d4', 38, 36); setL(1, v3(0, YB - 8, -11), '#c9d4a8', 30, 26);
    [[-14, YT + 42, ZC + 40], [30, YT + 62, ZC + 28], [-34, YT + 92, ZC + 24], [24, YT + 130, ZC + 20], [0, YT + 30, -18]].forEach((a, i) => setL(i + 2, v3(a[0], a[1], a[2]), SICK, 240, 130));
  } else {
    const q = v3(0, W.fy(t), 0);
    setL(0, q.clone().add(v3(8, 14, 8)), SICK, 130, 70); setL(1, q.clone().add(v3(-9, -10, 8)), '#8fa0c9', 70, 58);
  }
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  const C = (n, t, r, sd, h) => levelPos(n, tw(t), { rad: r, side: sd, up: h });
  const eh = () => W.eh, er = () => W.e.root.position;
  add('open', 0, (u, t) => ({ pos: lp3(C(8, t, 17, -11, -2.5), C(8, t, 16, -8, -1), easeInOut(u)), look: lp3(C(8, t, 0, -2, -0.5), C(9, t, 0, -6, -1.5), easeInOut(u)), fov: 66 }));
  add('down', s(1) - 0.1, (u, t) => { const P0 = C(9, t, 7.6, 0.8, 12), L0 = levelPos(9, tw(t), { rad: -6 }); L0.y -= 200; return { pos: P0, look: L0, fov: 66 }; });
  add('edge', s(1) + 1.9, (u) => ({ pos: eh().clone().addScaledVector(radial(9), 6.6 - u * 0.4).add(along(9).multiplyScalar(-2.6)).add(v3(0, -2.2, 0)), look: eh().clone().add(v3(0, -2.0, 0)), fov: 62 }));
  add('void', s(2) - 0.1, (u, t) => { const c = v3(0, 10 * TW.DY, 0), a = 2.45 + u * 0.16; return { pos: v3(Math.cos(a) * 190, 190 - u * 14, Math.sin(a) * 190).add(c), look: c.clone().add(v3(0, -8, 0)), fov: 42 }; });
  add('climb', s(2) + 1.9, (u, t) => ({ pos: lp3(C(11, t, 21, -7, -3), C(11, t, 19, -3, 2), easeInOut(u)), look: C(11, t, 0, 0, 3.6), fov: 64 }));
  add('wren', s(3) - 0.3, (u, t) => ({ pos: lp3(C(12, t, 15.4, -1.2, 3.4), C(12, t, 13.8, -0.7, 3.2), easeOut(u)), look: C(12, t, 0.4, -0.4, 2.9), fov: 54 }));
  add('painter', s(4) - 0.08, (u, t) => ({ pos: lp3(C(26, t, 9.0, 8.6, 3.2), C(26, t, 8.2, 6.6, 2.4), easeInOut(u)), look: C(26, t, 0, 1.5, 2.6), fov: 56 }));
  add('old', s(5) - 0.1, (u, t) => ({ pos: lp3(C(38, t, 12.4, 0.6, 3.6), C(38, t, 11.4, -0.1, 3.3), easeInOut(u)), look: C(38, t, 0, -0.1, 3.5), fov: 60 }));
  add('l50', s(6) - 0.08, (u, t) => ({ pos: lp3(C(50, t, 20, -9, -5), C(50, t, 17, -4, -1), easeInOut(u)), look: C(50, t, -2, 0, 4), fov: 68 }));
  add('wallpan', s(6) + 1.75, (u, t) => { const a = levelAngle(50), r = 34 - u * 5, y = 50 * TW.DY + 5.5; return { pos: v3(Math.cos(a + 0.34 - u * 0.34) * r, y - 2.2, Math.sin(a + 0.34 - u * 0.34) * r), look: v3(Math.cos(a) * 18, y - 1.4, Math.sin(a) * 18), fov: 44 }; });
  add('msg', s(7) - 0.06, (u) => { const a = levelAngle(50), y = 50 * TW.DY + 7.3, r = 37 - u * 2; return { pos: v3(Math.cos(a) * r, y + 1.2, Math.sin(a) * r), look: v3(Math.cos(a) * 18, y - 2.6, Math.sin(a) * 18), fov: 46 }; });
  add('mark', s(8) - 0.08, (u, t) => ({ pos: lp3(C(50, t, 3.0, -5.8, 8.6), C(50, t, 2.6, -5.0, 8.2), u), look: C(50, t, -3.6, -1.0, 3.6), fov: 52 }));
  add('l70', s(9) - 0.08, (u, t) => ({ pos: lp3(C(70, t, 22, -6, 7), C(70, t, 21, -2, 5.5), easeInOut(u)), look: C(70, t, 0, 3, 3.5), fov: 66 }));
  add('stop', s(9) + 1.42, (u, t) => { const c = levelPos(71, tw(t), {}); return { pos: C(71, t, 42, 6, 26), look: c.clone().add(v3(0, 1, 0)), fov: 66 }; });
  add('fr1', s(10) - 0.08, (u, t) => ({ pos: lp3(C(72, t, 13, 4, 8.5), C(72, t, 12, 1, 8), easeInOut(u)), look: W.runner.root.position.clone().add(v3(0, 2.6, 0)), fov: 56 }));
  add('fr2', s(10) + 0.74, (u, t) => ({ pos: lp3(C(73, t, 12.2, 10.6, -2.8), C(73, t, 13.2, 8.8, -2.2), easeInOut(u)), look: C(73, t, 5.2, 0.6, -1.5), fov: 54 }));
  add('l90', s(11) - 0.08, (u, t) => ({ pos: lp3(C(90, t, 20, -8, -6), C(90, t, 17, -5, -3), easeInOut(u)), look: C(90, t, 0, 0, 5.5), fov: 66 }));
  add('above', s(11) + 1.05, (u, t) => ({ pos: lp3(C(90, t, 12.5, -7.5, -1.4), C(90, t, 11.2, -6.6, -1.0), easeInOut(u)), look: lp3(eh().clone().lerp(C(91, t, 0.5, -3, -1), 0.45), eh().clone().lerp(C(92, t, 0, -6, 0), 0.4), easeInOut(u)), fov: 68 }));
  add('eliup', s(12) - 0.08, (u) => { const f = W.e.root.rotation.y + 0.42 - u * 0.12, d = 7.2 - u * 0.5; return { pos: eh().clone().add(v3(Math.sin(f) * d, -1.1 - u * 0.2, Math.cos(f) * d)), look: eh().clone().add(v3(0, -0.9, 0)), fov: 56 }; });
  add('none', s(12) + 1.0, (u, t) => ({ pos: lp3(C(92, t, 20, -5, 6), C(92, t, 19, -1, 10), easeInOut(u)), look: C(92, t, 0, 3, 1), fov: 62 }));
  add('top', s(13) - 0.08, (u, t) => ({ pos: lp3(v3(-34, YT + 6, 74), v3(-27, YT + 15, 66), easeInOut(u)), look: v3(0, YT + 7, 4), fov: 60 }));
  add('door', s(14) - 0.08, (u) => ({ pos: lp3(v3(9, YT + 6.5, 22), v3(6.2, YT + 6.0, 18.5), easeInOut(u)), look: v3(0.1, YT + 3.9, 1.6), fov: 56 }));
  add('openc', s(15) - 0.34, (u) => ({ pos: lp3(v3(7.0, YT + 6.0, 9.1), v3(6.6, YT + 5.9, 8.5), u), look: v3(0.8, YT + 4.4, 0.6), fov: 52 }));
  add('thru', s(16) - 0.08, (u) => ({ pos: lp3(v3(-1.5, YT + 1.8, 12.5), v3(-0.5, YT + 1.5, 5.6), easeInOut(u)), look: v3(0.1, YT + 15, -60), fov: 60 }));
  add('inv', s(17) - 0.08, (u) => ({ pos: lp3(v3(8.2, YT + 1.4, -3.4), v3(7.4, YT + 1.3, -2.8), u), look: v3(-3, YT + 24, -56), fov: 72, roll: lerp(1.15, 0, easeInOut(u)) }));
  add('boy', s(18) - 0.08, (u) => ({ pos: lp3(v3(-17, YT + 6, -5), v3(-15, YT + 6.6, -8), u), look: W.boy.root.position.clone().add(v3(0, -3, 0)), fov: 56 }));
  add('boyc', s(19) - 0.06, (u) => ({ pos: lp3(v3(3.8, YB - 3.9, -7.3), v3(3.0, YB - 3.9, -6.2), easeOut(u)), look: W.boy.root.position.clone().add(v3(0, -3.6, 0)), fov: 54 }));
  add('elir', s(19) + 1.3, (u) => ({ pos: eh().clone().add(v3(1.6, -1.2, -3.8 + u * 0.3)), look: eh().clone().add(v3(0, -0.85, 0)), fov: 54 }));
  add('point', s(20) - 0.08, (u) => ({ pos: lp3(v3(16.6, YT + 7.4, -4.8), v3(16.2, YT + 7.6, -6.6), easeInOut(u)), look: v3(0.3, YT + 4.6, -7.2), fov: 74 }));
  add('wall', s(21) - 0.08, (u) => ({ pos: lp3(v3(0.8, YT + 10, -18), v3(0.8, YT + 22, -26), easeInOut(u)), look: v3(0.4, YT + lerp(14, 27, easeInOut(u)), 0), fov: 62 }));
  add('tall', s(21) + 1.32, (u) => ({ pos: v3(lerp(-9, -2, easeInOut(u)), YT + 18, -8.4), look: v3(lerp(-11, -3, easeInOut(u)), YT + 21, 0), fov: 44 }));
  add('w416', s(22) - 0.08, (u) => ({ pos: lp3(v3(0.2, YT + 13.5, -23.5), v3(0.2, YT + 13.5, -21.5), easeInOut(u)), look: v3(0.1, YT + 11.2, 0), fov: 62 }));
  add('back', s(23) - 0.06, (u) => ({ pos: lp3(v3(15, YT + 4.8, -5.2), v3(14.6, YT + 4.8, -6.2), u), look: v3(0.2, YT + 0.8, -5.6), fov: 62 }));
  add('slam', s(24) - 0.02, (u) => ({ pos: lp3(v3(5.2, YT + 7.8, -18.2), v3(5.2, YT + 7.6, -17.2), u), look: v3(-0.2, YT + 4, -0.2), fov: 54 }));
  add('pa', s(25) - 0.06, (u) => ({ pos: lp3(v3(5.8, YT + 2.4, -1.5), v3(4.6, YT + 2.0, -2.4), easeInOut(u)), look: eh().clone().add(v3(0, -1.7, 0)), fov: 60 }));
  add('flr', s(26) - 0.04, (u, t) => ({ pos: lp3(v3(10, YT + 17, -17), v3(9, YT + 18, -16), u), look: v3(0.4, YT - 4 - u * 12, -7.2), fov: 62 }));
  add('fall', e.FALL, (u, t) => { const q = v3(0, W.fy(t), 0); return { pos: q.clone().add(v3(7 + u * 2, 11 + u * 3, 8 + u * 3)), look: q.clone().add(v3(0, -2.5, 0)), fov: 62 }; });
  add('final', e.FALL + 1.65, (u, t) => { const q = v3(0, W.fy(t), 0); return { pos: q.clone().add(v3(26 + u * 9, 26 + u * 12, 26 + u * 9)), look: q.clone().add(v3(0, -18, 0)), fov: 72 }; });
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}

function renderAt(t) {
  const e = EV, s = (i) => L(i).start, u = tw(t), set = t >= e.FALL ? 'fall' : t >= s(17) - 0.08 ? 'far' : 'near';
  applyEnv(ctx, VOID);
  W.tower.visible = set === 'near'; W.wallG.visible = set !== 'fall'; W.inv.visible = (set === 'near' && t > e.doorOpen - 0.2) || set === 'far'; W.bridge.visible = W.inv.visible && !['wall', 'tall', 'w416', 'slam', 'pa'].includes(shotName(t)); W.ledge.visible = set !== 'fall' && t > e.doorOpen - 0.2; W.field.visible = set === 'fall';
  W.ground.visible = set === 'near' && t < s(3); W.ground.position.y = groundY(t);
  if (W.tower.visible) W.tower.update(u); W.inv.update(u);
  if (W.field.visible) W.field.update(W.fy(t));
  W.ledge.set(t, e.floor);
  W.wallG.hinge.rotation.y = t < e.doorOpen ? 0 : t < e.slam ? 1.62 * easeInOut(clamp((t - e.doorOpen) / 1.3)) : 1.62 * (1 - clamp((t - e.slam) / 0.13));
  // people
  const near = (n) => Math.abs(W.level - n) < 7 && set === 'near';
  W.chalk.visible = false; W.kit.visible = false; W.kit.roller.visible = false; W.wet.visible = false;
  W.level = climbState(t).n; W.tallyNew.visible = t > e.stroke0;
  { const su = clamp((t - e.stroke0) / (e.stroke1 - e.stroke0)); W.tallyNew.scale.y = Math.max(0.02, su); W.tallyNew.position.y = 50 * TW.DY + 3.65 + 0.6 * (1 - su); }
  for (const c of W.all) c.root.visible = false;
  if (near(12)) poseWren(t); if (near(26)) posePainter(t); if (near(38) && W.level === 38) { const pe = standPos(38, t); W.e.root.position.copy(pe); poseOld(t); } if (near(72)) poseFrozen(t);
  poseEli(t); if (t >= e.FALL && W.e.root) { /* placed */ }
  W.e.root.updateMatrixWorld(true); W.eh.copy(W.e.neck.getWorldPosition(v3())).add(v3(0, 0.75, 0));
  poseBoy(t);
  // dust sifting down at level ninety's footsteps
  for (const [i, c] of e.steps90.entries()) { const m = W.sift[i]; m.visible = t > c && t < c + 1.2 && set === 'near'; if (m.visible) { const q = W.siftAt(i, t); m.position.copy(q); m.material.opacity = 0.5 * (1 - (t - c) / 1.2); } }
  W.air.update(t); W.air.list.motes.position.copy(W.e.root.position).add(v3(0, 4, 0));
  lights(set, t);
  if (shotName(t) === 'fr2') { const hp = W.hang.root.position, rr = v3(hp.x, 0, hp.z).normalize(); setL(7, hp.clone().addScaledVector(rr, 8).add(v3(0, 3, 0)).addScaledVector(along(73), 6), '#ffe6c4', 150, 26); }
  ctx.scene.updateMatrixWorld(true);
  let sh = shotAt(W.shots, t), jolt = 0;
  { const dq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgchar'); if (dq) { const q = dq.split(','), c = q[0] === 'e' ? W.e : W[q[0]], hp = new THREE.Vector3(); c.head.getWorldPosition(hp); const f = c.root.rotation.y + (+q[1]) * Math.PI / 180; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * 3.4, +q[2], Math.cos(f) * 3.4)), look: hp.clone().add(v3(0, 0.05, 0)), fov: 40 }; } }
  { const cq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgcam'); if (cq) { const q = cq.split(',').map(Number); sh = { ...sh, pos: v3(q[0], q[1], q[2]), look: v3(q[3], q[4], q[5]), fov: q[6] || 50 }; } }
  if (t > e.STOP && t < e.STOP + 0.28) jolt = 0.5 * (1 - (t - e.STOP) / 0.28); else if (t > e.slam && t < e.slam + 0.22) jolt = 0.6 * (1 - (t - e.slam) / 0.22); else if (t > e.floor && t < e.floor + 0.3) jolt = 0.5;
  frame(ctx, t, sh, { steady: true, shake: jolt, shadowSpan: 40, shadows: false, black: 0 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep29', { look: 'pro', avatars: ['farm_ep38_eli', ...Object.values(AV)] }); L = ctx.L; EV = events(); W.sch = sched();
  await loadAlti(['neutral', 'surprised', 'shocked', 'scared', 'terrified', 'nervous', 'worried', 'sad']);
  const { scene, camera } = ctx; camera.far = 3200; camera.near = 0.12; camera.updateProjectionMatrix();
  W.fy = (t) => -640 - 130 * (t - EV.FALL);
  rig();
  W.tower = buildTower(); scene.add(W.tower);
  W.inv = buildTower({ inverted: true }); W.inv.rotation.x = Math.PI; W.inv.position.set(0, CY, ZC); scene.add(W.inv);
  W.wallG = doorWall(); W.wallG.position.set(0, YT, 0); scene.add(W.wallG);
  W.ledge = ledge(); W.ledge.position.set(0, YT, 0); scene.add(W.ledge);
  W.bridge = new THREE.Group(); BRIDGE.forEach((p, i) => { const m = loosePlatform(CANDY[(7 - i) % 8]); m.rotation.x = Math.PI; m.position.copy(p); W.bridge.add(m); }); scene.add(W.bridge);
  W.field = towerField(); scene.add(W.field);
  { const gc = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#2d332b'; x.fillRect(0, 0, w, h); x.strokeStyle = '#4c5647'; x.lineWidth = 4; for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(w / 2, h / 2, 40 + i * 20, 0, 7); x.stroke(); } }); gc.colorSpace = THREE.SRGBColorSpace; W.ground = new THREE.Mesh(new THREE.CircleGeometry(170, 64), new THREE.MeshBasicMaterial({ map: gc, fog: false })); W.ground.rotation.x = -Math.PI / 2; W.ground.userData.noAO = true; scene.add(W.ground); }
  // the wall at level fifty: the scratched message and the chalk tallies
  { const a = levelAngle(50), yy = 50 * TW.DY;
    const mt = canvasTex(1400, 620, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = '900 248px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = 14; x.strokeStyle = 'rgba(232,226,200,0.55)'; x.fillStyle = '#26221b'; x.strokeText('STOP', w / 2, 170); x.fillText('STOP', w / 2, 170); x.font = '900 192px ITTInter, sans-serif'; x.strokeText('COUNTING.', w / 2, 440); x.fillText('COUNTING.', w / 2, 440); x.globalCompositeOperation = 'destination-out'; x.strokeStyle = 'rgba(0,0,0,0.65)'; x.lineWidth = 3; for (let i = 0; i < 160; i++) { x.beginPath(); const px = (i * 811) % w, py = (i * 397) % h; x.moveTo(px, py); x.lineTo(px + 60 + (i % 5) * 16, py + (i % 11) - 5); x.stroke(); } });
    mt.colorSpace = THREE.SRGBColorSpace; mt.anisotropy = 8; const m = curved(a, yy + 7.3, 8.6 / TW.R, 3.8, mt); scene.add(m);
    W.tallyAng = -0.04;
    const tt = canvasTex(720, 360, (x, w, h) => { x.clearRect(0, 0, w, h); x.lineCap = 'round'; x.strokeStyle = 'rgba(244,240,226,0.95)'; x.lineWidth = 11; const five = (ax) => { for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(ax + i * 30, 60); x.lineTo(ax + i * 30 + 2, 300); x.stroke(); } x.beginPath(); x.moveTo(ax - 18, 250); x.lineTo(ax + 110, 90); x.stroke(); }; five(70); five(280); five(490); });
    tt.colorSpace = THREE.SRGBColorSpace; const tm = curved(a + W.tallyAng + 0.15, yy + 3.75, 4.2 / TW.R, 2.0, tt, { off: 0.07 }); scene.add(tm);
    const nt = canvasTex(64, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = 'rgba(248,244,228,0.98)'; x.fillRect(24, 8, 16, 240); }); nt.colorSpace = THREE.SRGBColorSpace;
    W.tallyNew = curved(a + W.tallyAng + 0.004, yy + 3.65, 0.34 / TW.R, 1.3, nt, { off: 0.09 }); scene.add(W.tallyNew); }
  // falling dust under the footsteps above level ninety
  { const dt = canvasTex(64, 256, (x, w, h) => { x.clearRect(0, 0, w, h); for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(226,224,204,${0.3 + (i % 3) * 0.2})`; x.fillRect((i * 37) % w, (i * 151) % h, 2, 3); } }); dt.colorSpace = THREE.SRGBColorSpace; W.sift = [0, 1, 2, 3, 4].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 8), new THREE.MeshBasicMaterial({ map: dt, transparent: true, depthWrite: false, side: THREE.DoubleSide })); m.userData.noAO = true; scene.add(m); return m; }); W.siftAt = (i, t) => { const c = EV.steps90[i], q = levelPos(91, tw(t), { side: -3 + i * 1.5, rad: (i % 2 ? 1 : -1) * 1.2 }); q.y -= 5.5 + (t - c) * 3; return q; }; }
  people();
  const list = { motes: dust(scene, { size: 40, height: 26, centre: v3(0, 0, 0), count: 170, color: '#e4e4c8', amount: 0.2, pointSize: 0.24 }) };
  W.air = atmos(...Object.values(list)); W.air.list = list;
  W.shots = shots();
  window.__ep29 = { W, THREE, ctx };
  return expose(ctx, renderAt, EV.boyEnd + 0.1, EV);
}
