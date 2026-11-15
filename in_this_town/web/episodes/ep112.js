// Flower Man remake 12: The Ink Fountains. In Quillhaven, fountains of ink burst from the ground and wake whatever is near. Only a kid with
// a glowing gold heart can seal one, and every open fountain eats a star. Arlo is that kid; Wren kicks anything that moves; Checkers, a living
// picnic blanket, fears everything. Every night Arlo seals one, but the stars keep vanishing and every morning his hands are inky. A rumor:
// a black knight stands by every fountain before it opens. At three a.m. they follow him home, into Arlo's room. The floor cracks, Wren yanks
// off the helmet: empty. On the pillow, a jar with Arlo's heart in it: his own ink had been sneaking out while he slept. He takes his heart
// back, the three hold on, gold light fills the room, every star comes back. Next morning: one tiny drop of ink on his thumb.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DAY } from '../engine/stage.js';
import { sparkles, burst } from '../engine/atmos.js';
import { glowSprite } from '../engine/props.js';
import { jointify } from '../engine/infinitetower.js';
import { WIN, mailbox } from '../engine/pastel.js';
import { FARM } from '../engine/farm_cast.js';
import { nightStreet, arloRoom, inkFountain, wearHeart, inkJar, checkersBlanket, trashCritter, armorUp, inkDrops, starField, inkHands, thumbDrop, goldHeart } from '../engine/inkfountains.js';

// aimArm for scaled characters: the parent's world matrix carries the body's scale, so take its rotation by decomposing it
const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV;
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const AV = { arlo: ['farm_hc_dex', 0.88], wren: ['farm_chloe', 0.88] };
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';

// places: the street at the origin, Arlo's room far away
const RM = v3(1500, 0, 1500), rm = (x, y, z) => RM.clone().add(v3(x, y, z));
const F1 = v3(-40, 0, 4), F2 = v3(58, 0, -3), F3 = v3(95, 0, 9);

const NIGHTST = { ...DAY, ...P({ top: '#0a1334', horizon: '#26356c', haze: '#1a2550', sunColor: '#a9bcff', hemiSky: '#5068b8', hemiGround: '#262a40' }), sunDir: v3(-0.4, 0.75, -0.5), sunI: 0.6, sunDisc: 0, sunSize: 1, hemiI: 1.05, amb: 0.24, envI: 0.6, exposure: 1.18, bloom: 0.06, vig: 0, saturation: 1.15, contrast: 1.06, bounce: 0.15, fogNear: 150, fogFar: 760, stars: 0, moon: 1, win: 1.2, lamp: 2.6 };
const ROOMN = { ...NIGHTST, ...P({ hemiSky: '#5a6cb8', hemiGround: '#3a2c3a', sunColor: '#9fb4ff' }), sunDir: v3(-0.15, 0.55, -0.82), sunI: 0.9, hemiI: 0.95, amb: 0.3, envI: 0.45, exposure: 1.2, fogNear: 300, fogFar: 1500 };
const ROOMD = { ...DAY, ...P({ top: '#7cc4ff', horizon: '#ffe9c8', haze: '#ffe9c8', sunColor: '#ffe2b0', hemiSky: '#fff3e0', hemiGround: '#d9b98e' }), sunDir: v3(0.15, 0.5, -0.85), sunI: 2.0, sunDisc: 0, hemiI: 1.4, amb: 0.45, envI: 0.8, exposure: 1.02, bloom: 0.03, vig: 0, saturation: 1.15, contrast: 1.05, bounce: 0.2, fogNear: 400, fogFar: 1500, stars: 0, moon: 0, win: 0, lamp: 0 };

function events() { const s = (i) => L(i).start; return { burst1: 1.05, wake: s(0) + 3.1, eat: s(1) + 3.7, kick: s(3) + 1.25, eep: s(4) + 1.6, seal0: s(5) + 0.35, seal1: s(5) + 2.4, burst3: s(6) + 2.5, crack: s(10) + 0.1, yank: s(10) + 1.55, empty: s(10) + 2.55, lid: s(14) + 0.25, fly0: s(14) + 0.55, fly1: s(14) + 1.35, hold: s(14) + 1.95, starsOn: s(15) + 0.25, end: ctx.dur }; }

// ---- helpers (from Remake 11) ----
const armLen = (c) => { if (!c._alen) { c.reset(); const r = c.root.rotation.clone(), p = c.root.position.clone(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3(); c.arms[0].traverse((o) => { if (o.isMesh && !o.userData.worn) bx.expandByObject(o); }); c._alen = sh.y - bx.min.y - 0.12 * (c.spec.scale || 1); c.root.rotation.copy(r); c.root.position.copy(p); c.root.updateMatrixWorld(true); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.arms[side].localToWorld(v3(0, -armLen(c) / s, 0.1)); };
const shoulderOf = (c, side) => { c.root.updateMatrixWorld(true); return c.arms[side].getWorldPosition(v3()); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.scale.set(1, 1, 1); c.head.rotation.set(0, 0, 0); c.arms.forEach((a) => a.quaternion.identity()); c.legs.forEach((l) => l.rotation.set(0, 0, 0)); c.hips.position.y = c.hipY ?? 2; c.torso.rotation.set(0, 0, 0); c.neck.rotation.set(0, 0, 0); }
function place(c, p, yaw) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; }
const HY = (c) => (c.hipY ?? 2) * (c.spec.scale || 1);
function sitAt(c, p, yaw, seatY, o = {}) { place(c, p, yaw); c.root.position.y = 0; c.hips.position.y = (c.hipY ?? 2) + (seatY - HY(c) + 0.12 * (c.spec.scale || 1)) / (c.spec.scale || 1); c.legs.forEach((l, i) => { l.rotation.x = -1.5; if (c.knee) c.knee[i].rotation.x = o.straight ? 0 : 1.5; }); c.arms.forEach((a, i) => { a.rotation.x = -0.6; a.rotation.z = (i ? 1 : -1) * 0.1; }); }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const H = (c) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.neck.getWorldPosition(v3()).add(v3(0, 0.8 * s, 0)); };
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.closed ? true : o.noBlink ? false : blinkAt(t, ph), viseme: o.viseme, gaze: o.gaze }); }
const talk = (i, t, txt) => (t > L(i).start && t < L(i).end ? visemeAt(txt || L(i).text, L(i).start, L(i).end, t) : undefined);
function lookAtP(c, p, k = 1) { c.root.updateMatrixWorld(true); const n = c.neck.getWorldPosition(v3()), a = wrap(yawTo(n, p) - c.root.rotation.y); c.neck.rotation.y = clamp(a, -1.3, 1.3) * k; c.neck.rotation.x = -Math.atan2(p.y - n.y - 0.6, Math.hypot(p.x - n.x, p.z - n.z)) * 0.6 * k; }
function walkTo(c, a, b, t0, t1, t, speed = 1) { const u = clamp((t - t0) / (t1 - t0)); place(c, lp3(a, b, u), yawTo(a, b)); pose(c, u > 0 && u < 1 ? 'walk' : 'idle', t * speed); return u; }
function kneel(c, p, yaw, k = 1) { place(c, p, yaw); pose(c, 'idle', 0); const s = c.spec.scale || 1; c.legs[0].rotation.x = -1.5 * k; c.legs[1].rotation.x = 0.15 * k; if (c.knee) { c.knee[0].rotation.x = 1.5 * k; c.knee[1].rotation.x = 1.55 * k; } c.hips.position.y = (c.hipY ?? 2) - 0.95 * k * (c.hipY ?? 2) / 2.3 / 1; c.torso.rotation.x = 0.12 * k; void s; }

// ---- the heart's glow over the story ----
function heartK(t) { const E = EV, s = (i) => L(i).start;
  if (t < s(5) + 4.2) return 1; if (t < s(6)) return 0.62;   // the inky morning: dimmer
  if (t < E.fly1) return t < s(9) + 1.2 ? 0.32 : 0;           // the stakeout: faint; in the room: gone (it's in the jar)
  return 1; }
// the stars left in the sky
function starsK(t) { const E = EV, s = (i) => L(i).start;
  if (t < E.eat - 0.4) return 0.8;
  if (t < s(5)) return lerp(0.8, 0.7, smooth(E.eat - 0.4, E.eat + 1.6, t));
  if (t < s(6)) return lerp(0.7, 0.18, smooth(s(5) + 2.4, s(5) + 3.9, t));
  if (t < s(8)) return lerp(0.18, 0.1, smooth(E.burst3, E.burst3 + 1.2, t));
  if (t < E.starsOn) return 0.06;
  return lerp(0.06, 1.0, smooth(E.starsOn, E.starsOn + 1.9, t)); }

// ---- people ----
function people() {
  for (const [k, [avatar, scale]] of Object.entries(AV)) {
    const c = makeCharacter({ avatar, alti: true, skin: skinOf(avatar), caustic: false, scale });
    ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c.key = k;
    c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c);
    W[k] = c;
  }
  wearHeart(W.arlo); W.arloInk = inkHands(W.arlo); thumbDrop(W.arlo, 1);
  const kn = makeCharacter({ skin: '#222', shirt: '#222', pants: '#222', shoes: '#222', hair: '#222', hairStyle: 'short', scale: 1.18, caustic: false });
  ctx.scene.add(kn.root); armorUp(kn); kn.key = 'knight'; kn.root.visible = false; W.knight = kn; armLen(kn);
  W.chk = checkersBlanket(); ctx.scene.add(W.chk); W.chk.visible = false;
  W.can = trashCritter(); ctx.scene.add(W.can); W.can.visible = false;
  W.mail = mailbox({ color: '#3d78c9' }); ctx.scene.add(W.mail); W.mail.visible = false;
  { const ew = new THREE.MeshStandardMaterial({ color: '#fff7d0', emissive: '#ffe58a', emissiveIntensity: 0.5, roughness: 0.3 }), pb = new THREE.MeshStandardMaterial({ color: '#111' }); W.mailEyes = [];
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), ew); e.scale.set(0.2, 0.26, 0.12); e.position.set(s * 0.3, 4.15, 1.1); W.mail.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), pb); p.position.set(s * 0.3, 4.1, 1.22); W.mail.add(p); W.mailEyes.push(e, p); } }
  W.all = [W.arlo, W.wren, W.knight];
}

// ---- scenes: each a pure function of t ----
function knightStreetAt(t) {   // L8: the knight shuffles past the hedge along the road, left to right
  const s = (i) => L(i).start, u = clamp((t - (s(8) - 0.6)) / 4.8);
  return { pos: v3(lerp(-25, -2, u), 0, 10.2), yaw: Math.PI / 2 };
}
function poseKnightWalk(t, p, yaw, sp = 0.62) { const k = W.knight; place(k, p, yaw); pose(k, 'walk', t * sp); k.torso.rotation.x = 0.1; k.neck.rotation.x = 0.12; k.arms.forEach((a, i) => { a.rotation.x *= 0.5; a.rotation.z = (i ? 1 : -1) * 0.12; }); k.helmet.visible = true; k.hollow.visible = false; }
function knightHand(p, yaw, side) { const sd = side ? 1 : -1, s = 1.18; return v3(p.x + Math.cos(yaw) * sd * 1.5 * s, 1.15 * s, p.z - Math.sin(yaw) * sd * 1.5 * s); }

function poseOpen(t) {   // F1 bursts in the road; the trash can and the mailbox wake up
  const E = EV, k = smooth(E.burst1, E.burst1 + 0.9, t);
  W.f1.position.copy(F1); W.f1.set(t, k * (1 + 0.04 * Math.sin(t * 3))); W.f1L.intensity = 90 * k;
  if (W.b1) { W.b1.update(t); }
  const c = W.can; c.visible = true; c.position.set(-45.5, 0.3, 10.5); c.rotation.y = 0.6; const wake = smooth(E.wake - 0.2, E.wake + 0.2, t), hop = Math.max(0, Math.sin((t - E.wake) * 7)) * 0.9 * smooth(E.wake + 0.3, E.wake + 0.6, t);
  c.pose(t, { eyes: wake, open: wake * (0.25 + 0.25 * Math.max(0, Math.sin(t * 9))), hop, roll: Math.sin(t * 7) * 0.05 * wake });
  const m = W.mail; m.visible = true; m.position.set(-49.5, 0.3, 12.4); m.rotation.y = 0.5; const wk2 = smooth(E.wake + 0.35, E.wake + 0.6, t); W.mailEyes.forEach((e) => { e.visible = wk2 > 0.05; }); m.position.y = 0.3 + Math.max(0, Math.sin((t - E.wake) * 8 + 1)) * 0.6 * wk2; m.rotation.z = Math.sin(t * 8) * 0.06 * wk2;
}
function poseHeartIntro(t) {   // L1: Arlo walks toward F1, heart glowing; then the sky over the fountain
  const s = (i) => L(i).start, a = W.arlo, p0 = v3(-58, 0.3, 13), p1 = v3(-50, 0.3, 9.5);
  walkTo(a, p0, p1, s(1) - 0.3, s(1) + 2.6, t, 1.0); face(a, 'focused', t, 0.3); lookAtP(a, F1.clone().add(v3(0, 5, 0)), 0.6);
  W.f1.position.copy(F1); W.f1.set(t, 1); W.f1L.intensity = 90;
  const c = W.can; c.visible = true; c.position.set(-45.5, 0.3, 10.5); c.rotation.y = 0.9; c.pose(t, { eyes: 1, open: 0.3 + 0.2 * Math.max(0, Math.sin(t * 9)), hop: Math.max(0, Math.sin(t * 7)) * 0.6 });
}
function poseArloHero(t) { const s = (i) => L(i).start, a = W.arlo, p = v3(-50, 0.3, 9.5); place(a, p, yawTo(p, F1) - 0.15); pose(a, 'idle', t); face(a, 'smug', t, 0.3); lookAtP(a, F1.clone().add(v3(0, 6, 0)), 0.5); a.arms[1].rotation.x = -0.25; W.f1.position.copy(F1); W.f1.set(t, 1); W.f1L.intensity = 90; void s; }
function poseKick(t) {
  const E = EV, s = (i) => L(i).start, w = W.wren, c = W.can, a = W.arlo;
  const W0 = v3(-49, 0.3, 15.0), CAN = v3(-46, 0.3, 13.6);
  const run = clamp((t - s(3) + 0.1) / 1.25); place(w, lp3(W0.clone().add(v3(-5.5, 0, 1.2)), W0, easeOut(run)), yawTo(W0, CAN)); pose(w, run < 1 ? 'run' : 'idle', t * 1.1);
  const kk = smooth(E.kick - 0.3, E.kick - 0.05, t) * (1 - smooth(E.kick + 0.35, E.kick + 0.75, t));
  if (kk > 0) { w.legs[1].rotation.x = -1.7 * kk; w.legs[0].rotation.x = 0.15 * kk; w.torso.rotation.x = -0.3 * kk; w.arms.forEach((ar, i) => { ar.rotation.x = -0.6 * kk; ar.rotation.z = (i ? 1 : -1) * 0.7 * kk; }); }
  face(w, t < E.kick + 0.1 ? 'angry' : 'smug', t, 0.5, { noBlink: kk > 0.3 });
  // the can: hopping at her, then launched
  const f = t - E.kick; c.visible = true;
  if (f < 0) { c.position.copy(CAN); c.rotation.set(0, yawTo(CAN, W0), 0); c.pose(t, { eyes: 1, open: 0.5 + 0.3 * Math.max(0, Math.sin(t * 12)), hop: Math.max(0, Math.sin(t * 8)) * 0.7 }); }
  else { const d = v3(Math.sin(yawTo(W0, CAN)), 0, Math.cos(yawTo(W0, CAN))); c.position.copy(CAN).addScaledVector(d, f * 16).add(v3(0, f * 14 - 0.5 * 26 * f * f, 0)); c.position.y = Math.max(0.3, c.position.y); c.rotation.set(f * 9, yawTo(CAN, W0), f * 4); c.pose(t, { eyes: 1, open: 0.9, hop: 0 }); }
  place(a, v3(-53.5, 0.3, 11.0), 0.9); pose(a, 'idle', t); face(a, t > E.kick ? 'grin' : 'surprised', t, 0.3); lookAtP(a, c.position.clone().add(v3(0, 2, 0)), 0.8);
  W.f1.position.copy(F1); W.f1.set(t, 1); W.f1L.intensity = 90;
}
function poseCheckers(t) {
  const E = EV, s = (i) => L(i).start, a = W.arlo, ch = W.chk, w = W.wren;
  const A = v3(-53, 0.3, 11.4); place(a, A, Math.PI - 0.35); pose(a, 'idle', t); face(a, 'happy', t, 0.3);
  // Checkers drifts in, sees the fountain, eeps and ducks behind Arlo
  const hide = smooth(E.eep - 0.1, E.eep + 0.6, t), C0 = v3(-56.5, 0, 14.5), C1 = A.clone().add(v3(-1.6, -0.3, 2.6));
  ch.visible = true; ch.position.copy(lp3(C0, C1, hide)); ch.rotation.y = lerp(0.6, 0.9, hide); ch.scale.setScalar(0.92);
  ch.pose(t, { tremble: 0.4 + hide * 1.2, open: t > E.eep && t < E.eep + 0.6 ? 0.85 : 0.18, look: hide > 0.5 ? [0.8, 0.1] : [0.6, 0.3], wide: 0.4 + hide, worry: 0.5, armL: 0.3 + hide * 1.2, armR: 0.3 + hide * 1.4, armLx: -hide * 0.9, armRx: -hide * 0.9 });
  lookAtP(a, ch.position.clone().add(v3(0, 2.6, 0)), 0.7);
  place(w, v3(-49.5, 0.3, 14.2), Math.PI + 0.5); pose(w, 'idle', t); face(w, 'smirk', t, 0.5); lookAtP(w, ch.position.clone().add(v3(0, 2.6, 0)), 0.7);
  W.f1.position.copy(F1); W.f1.set(t, 1); W.f1L.intensity = 90;
}
function poseSeal(t) {   // F2: Arlo's palms on the column; the gold spreads; it shrinks away
  const E = EV, s = (i) => L(i).start, a = W.arlo, w = W.wren, ch = W.chk;
  const sk = smooth(E.seal0, E.seal1, t), k = 1 - smooth(E.seal0 + 0.8, E.seal1 + 0.3, t);
  W.f2.position.copy(F2); W.f2.seal(sk); W.f2.set(t, k); W.f2L.intensity = 90 * k * (1 - sk); W.sealL.position.copy(F2).add(v3(0, 3, 2)); W.sealL.intensity = 260 * sk * (k > 0.02 ? 1 : 0) + 120 * smooth(E.seal1 - 0.2, E.seal1 + 0.1, t) * (1 - smooth(E.seal1 + 0.2, E.seal1 + 1.0, t));
  const A = F2.clone().add(v3(0, 0.3, 4.4)); place(a, A, Math.PI); pose(a, 'idle', t); a.torso.rotation.x = 0.15;
  const tgt = F2.clone().add(v3(0, 3.0, 1.2 + 1.2 * (1 - k))); aimArm(a, 0, tgt.clone().add(v3(0.7, 0, 0)), smooth(E.seal0 - 0.4, E.seal0, t)); aimArm(a, 1, tgt.clone().add(v3(-0.7, 0, 0)), smooth(E.seal0 - 0.4, E.seal0, t));
  face(a, 'focused', t, 0.3); a.neck.rotation.x = 0.1;
  place(w, A.clone().add(v3(4.2, 0, 3.2)), Math.PI + 0.3); pose(w, 'idle', t); face(w, sk > 0.5 ? 'happy' : 'focused', t, 0.5); lookAtP(w, F2.clone().add(v3(0, 4, 0)), 0.7);
  ch.visible = true; ch.position.copy(A.clone().add(v3(6.6, -0.3, 1.8))); ch.rotation.y = Math.PI + 0.9; ch.scale.setScalar(0.92); ch.pose(t, { tremble: 0.7, open: 0.15, look: [0.3, 0.4], wide: 0.6, worry: 0.6, armL: 0.5, armR: 0.5 });
  if (W.goldSp) { W.goldSp.visible = sk > 0.05; W.goldSp.position.copy(F2); W.goldSp.update(t); }
}
function poseSky(t) { /* only sky: nothing posed */ W.f2.visible = false; }
function poseMorning(t, final = false) {   // Arlo sitting up in bed, looking at his hands
  const s = (i) => L(i).start, a = W.arlo, R = W.room, bedTop = R.bedTop, B = R.bedAt.clone().add(RM);
  sitAt(a, B.clone().add(v3(0, 0, -2.4)), 0, bedTop + 0.05, { straight: true });
  const look = final ? smooth(s(16) + 1.2, s(16) + 1.8, t) : smooth(s(5) + 4.0, s(5) + 4.6, t);
  const hp = H(a).add(final ? v3(0, -0.9, 1.7) : v3(0, -1.7, 1.9));
  if (!final) aimArm(a, 0, hp.clone().add(v3(0.35, 0, 0)), look * 0.9); aimArm(a, 1, hp.clone().add(v3(-0.35, 0, 0)), look * 0.9);
  a.neck.rotation.x = 0.42 * look;
  W.arloInk.set(final ? 0 : 1); a.drop.visible = final;
  face(a, final ? (look > 0.5 ? 'surprised' : 'sleepy') : (look > 0.5 ? 'nervous' : 'sleepy'), t, 0.3);
  if (final) {   // Wren asleep on the beanbag, Checkers folded over the desk chair
    const w = W.wren, bb = R.beanbag.clone().add(RM); sitAt(w, bb.clone().setY(0).add(v3(0.5, 0, 0.4)), 1.0, bb.y - 0.35); w.torso.rotation.x = -0.35; w.neck.rotation.x = -0.1; w.neck.rotation.z = 0.3; face(w, 'sleepy', t, 0.5, { closed: true });
    const ch = W.chk; ch.visible = true; ch.position.copy(rm(-12, 2.75, 1.2)); ch.rotation.y = 0.6; ch.scale.setScalar(0.8); ch.pose(t, { tremble: 0, blink: true, open: 0.05, squash: 1, hover: 0, armL: 1.3, armR: 1.3, worry: 0 });
  }
}
function poseRumor(t) {   // the knight by a lamp, a fountain bursting beside him
  const E = EV, s = (i) => L(i).start, k = W.knight, KP = v3(89.5, 0.3, 13.5);
  place(k, KP, -2.4); pose(k, 'still', t); k.helmet.visible = true; k.hollow.visible = false; k.neck.rotation.x = 0.25; k.neck.rotation.y = -0.3 * smooth(E.burst3 - 0.4, E.burst3, t);
  const kk = smooth(E.burst3, E.burst3 + 0.9, t); W.f3.position.copy(F3); W.f3.set(t, kk); W.f3L.intensity = 110 * kk; if (W.b3) W.b3.update(t);
  aimArm(k, 1, F3.clone().add(v3(0, 4.5, 0)), smooth(E.burst3 - 1.2, E.burst3 - 0.4, t) * 0.7);
  k.helmet.slit.material.color.setScalar(0).add(new THREE.Color('#b46cff').multiplyScalar(0.6 + 1.2 * kk));
  W.drops.update(t, (tb, r) => (tb > s(6) ? knightHand(KP, -2.4, r > 0.5 ? 1 : 0) : null));
}
function poseTonight(t) {   // in front of the hedge: Wren, fist into palm
  const s = (i) => L(i).start, w = W.wren, a = W.arlo, ch = W.chk;
  const WP = v3(-14, 0.3, 15.2); place(w, WP, Math.PI - 0.15); pose(w, 'idle', t);
  const pm = H(w).add(v3(0.1, -1.6, -1.0).applyAxisAngle(v3(0, 1, 0), w.root.rotation.y - Math.PI)); const pn = Math.max(0, Math.sin((t - s(7)) * 9)) * 0.15;
  aimArm(w, 0, pm.clone().add(v3(0.25, 0, 0)), 1); aimArm(w, 1, pm.clone().add(v3(-0.4, 0.2 + pn, 0)), 1);
  face(w, 'smug', t, 0.5, { viseme: talk(7, t) }); w.neck.rotation.x = -0.05;
  place(a, WP.clone().add(v3(-3.3, 0, 1.4)), Math.PI + 0.35); pose(a, 'idle', t); face(a, 'focused', t, 0.3); lookAtP(a, H(w), 0.8);
  ch.visible = true; ch.position.copy(WP.clone().add(v3(3.4, -0.3, 1.6))); ch.rotation.y = Math.PI - 0.45; ch.scale.setScalar(0.88); ch.pose(t, { tremble: 1.0, open: 0.2, look: [-0.6, 0.2], wide: 0.7, worry: 0.7, armL: 0.6, armR: 0.6 });
}
function poseHedge(t) {   // behind the hedge, peeking; the knight shuffles past dripping
  const s = (i) => L(i).start, w = W.wren, a = W.arlo, ch = W.chk, kp = knightStreetAt(t);
  poseKnightWalk(t, kp.pos.clone().add(v3(0, 0.3, 0)), kp.yaw);
  W.drops.update(t, (tb, r) => { if (tb < s(8) - 0.6) return null; const q = knightStreetAt(tb); return knightHand(q.pos, q.yaw, r > 0.5 ? 1 : 0); });
  const kh = H(W.knight);
  const peek = (c, x, ph, yaw) => { place(c, v3(x, 0.3, 21.8), yaw); pose(c, 'idle', t + ph); c.root.position.y = -0.35; c.torso.rotation.x = 0.25; c.arms.forEach((ar) => { ar.rotation.x = -1.4; }); lookAtP(c, kh, 1); };
  peek(a, -13.6, 0, Math.PI); face(a, 'nervous', t, 0.3);
  peek(w, -10.6, 1, Math.PI - 0.1); face(w, 'suspicious', t, 0.6);
  ch.visible = true; ch.position.set(-16.6, 0.1, 21.6); ch.rotation.y = Math.PI + 0.1; ch.scale.setScalar(0.9); ch.pose(t, { tremble: 1.4, open: 0.12, look: [-0.3 + clamp((kh.x + 14) / 20, -1, 1) * -0.6, -0.2], wide: 0.9, worry: 0.8, armL: 1.1, armR: 1.1, armLx: -1.0, armRx: -1.0 });
}
function poseDrip(t) { const s = (i) => L(i).start, kp = knightStreetAt(t); poseKnightWalk(t, kp.pos.clone().add(v3(0, 0.3, 0)), kp.yaw); W.drops.update(t, (tb, r) => { if (tb < s(8) - 0.6) return null; const q = knightStreetAt(tb); return knightHand(q.pos, q.yaw, r > 0.5 ? 1 : 0); }); }
function poseFollow(t) {   // up Arlo's path and in through his own front door
  const s = (i) => L(i).start, k = W.knight, hs = W.street.house, a = W.arlo, w = W.wren, ch = W.chk;
  const D0 = v3(10, 0.3, -16), D1 = v3(10, 1.3, -27.6), u = clamp((t - s(9) + 0.3) / 1.9);
  poseKnightWalk(t, lp3(D0, D1, u), Math.PI);
  hs.door.rotation.y = -1.6 * smooth(s(9) + 0.3, s(9) + 0.9, t);
  W.drops.update(t, (tb, r) => (tb > s(9) - 0.3 ? knightHand(lp3(D0, D1, clamp((tb - s(9) + 0.3) / 1.9)), Math.PI, r > 0.5 ? 1 : 0) : null));
  const T0 = v3(10, 0.3, 4), go = clamp((t - s(9)) / 2.2);
  walkTo(a, T0.clone().add(v3(-1.5, 0, 0)), T0.clone().add(v3(-1.0, 0, -5)), s(9), s(9) + 2.2, t, 0.9); face(a, t > s(9) + 0.8 ? 'shocked' : 'nervous', t, 0.3); lookAtP(a, hs.g.position.clone().add(v3(0, 8, 0)), 0.6);
  walkTo(w, T0.clone().add(v3(2.2, 0, 1)), T0.clone().add(v3(2.4, 0, -4)), s(9) + 0.1, s(9) + 2.3, t, 0.9); face(w, 'suspicious', t, 0.6);
  ch.visible = true; ch.position.copy(T0.clone().add(v3(0.6, -0.3, 3.5 - go * 4))); ch.rotation.y = Math.PI; ch.scale.setScalar(0.88); ch.pose(t, { tremble: 1.2, open: 0.12, look: [0, 0.4], wide: 0.8, worry: 0.8, armL: 0.7, armR: 0.7 });
}
// ---- the room ----
const KR = () => rm(5.5, 0, 0.6);   // the knight's spot, facing the bed (-x)
function poseRoomBase(t) {   // the knight in the middle of the room, the crack, the fountain
  const E = EV, s = (i) => L(i).start, k = W.knight, R = W.room;
  const cr = smooth(E.crack - 0.2, E.crack + 0.8, t); R.crack.set(t < E.fly1 ? cr : 1 - smooth(E.hold, E.hold + 2.6, t), smooth(E.hold, E.hold + 1.5, t));
  const rise = smooth(E.yank + 0.3, E.empty + 1.3, t), shrink = 1 - smooth(E.hold + 0.2, E.hold + 2.4, t), fk = Math.min(rise, shrink) * (0.92 + 0.08 * Math.sin(t * 2));
  W.fr.position.copy(R.mid).add(RM).add(v3(0, 0, 0.8)); W.fr.seal(0.5 * smooth(E.hold, E.hold + 1.2, t)); W.fr.set(t, fk); W.frL.position.copy(W.fr.position).add(v3(0, 3, 0)); W.frL.intensity = 70 * fk * (1 - smooth(E.hold, E.hold + 1.2, t)) + 40 * cr * (t < E.hold ? 1 : 0);
  // the knight stands still; the helmet comes off on the yank; it all slumps into ink at the seal
  const slump = smooth(E.hold + 0.6, E.hold + 2.8, t);
  place(k, KR(), -Math.PI / 2); pose(k, 'still', t); k.neck.rotation.x = 0.15; k.root.scale.set(1, 1 - slump * 0.85, 1); k.root.position.y = -slump * 0.4; k.root.visible = slump < 0.97;
  const off = t >= E.yank; k.helmet.visible = !off; k.hollow.visible = off; k.hollow.wisp.material.opacity = 0.8 * (1 - slump);
  k.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * 0.1; a.rotation.x = 0.05; });
  W.drops.update(t, (tb, r) => (tb > s(9) && tb < E.hold ? knightHand(KR(), -Math.PI / 2, r > 0.5 ? 1 : 0) : null));
  return { k, R };
}
function poseRoomDoor(t) {   // L9 end: from inside, the knight in the room, the three in the doorway
  const s = (i) => L(i).start, a = W.arlo, w = W.wren, ch = W.chk, R = W.room, D = R.door.clone().add(RM);
  poseRoomBase(t);
  const step = smooth(s(9) + 1.2, s(9) + 2.3, t);
  place(a, D.clone().add(v3(1.6 - step * 2.4, 0, -0.6)), -Math.PI / 2 - 0.2); pose(a, step > 0 && step < 1 ? 'walk' : 'idle', t * 0.8); face(a, 'shocked', t, 0.3); lookAtP(a, H(W.knight), 0.8);
  place(w, D.clone().add(v3(2.6, 0, 1.6)), -Math.PI / 2 - 0.4); pose(w, 'idle', t); face(w, 'suspicious', t, 0.6); lookAtP(w, H(W.knight), 0.8);
  ch.visible = true; ch.position.copy(D.clone().add(v3(3.4, -0.3, -1.6))); ch.rotation.y = -Math.PI / 2; ch.scale.setScalar(0.88); ch.pose(t, { tremble: 1.4, open: 0.3, look: [0.2, 0.3], wide: 0.9, worry: 0.9, armL: 1.2, armR: 1.2, armLx: -1.1, armRx: -1.1 });
}
function poseRoomYank(t) {   // L10: the crack; Wren leaps at his back and yanks the helmet off
  const E = EV, s = (i) => L(i).start, a = W.arlo, w = W.wren, ch = W.chk, R = W.room;
  const { k } = poseRoomBase(t);
  const kh = H(k);
  // Wren: from beside the door to his back (+x side), a hop, both hands up on the helmet, then it's in her hands
  const W0 = rm(12.5, 0, 3.4), W1 = KR().clone().add(v3(2.2, 0, 0.35)), go = smooth(s(10) + 0.2, E.yank - 0.25, t);
  place(w, lp3(W0, W1, go), -Math.PI / 2); pose(w, go > 0.02 && go < 0.98 ? 'run' : 'idle', t * 1.1);
  const hop = Math.max(0, Math.sin(clamp((t - (E.yank - 0.35)) / 0.7) * Math.PI)) * 1.3; w.root.position.y += hop;
  const reach = smooth(E.yank - 0.45, E.yank - 0.15, t);
  const hg = t < E.yank ? kh.clone().add(v3(0, 0.1, 0)) : kh.clone().add(v3(1.0, 0.6 + smooth(E.yank, E.yank + 0.4, t) * 0.5, 0)).lerp(H(w).add(v3(-0.9, -0.6, 0)), smooth(E.yank + 0.2, E.yank + 0.9, t));
  if (reach > 0) { aimArm(w, 0, hg.clone().add(v3(0, 0, 0.55)), reach); aimArm(w, 1, hg.clone().add(v3(0, 0, -0.55)), reach); }
  W.helm.visible = t >= E.yank; if (W.helm.visible) { W.helm.position.copy(hg).add(v3(0, -0.7, 0)); W.helm.rotation.set(0, -Math.PI / 2 + smooth(E.yank, E.yank + 0.6, t) * 0.8, -smooth(E.yank, E.yank + 0.6, t) * 0.6); W.helm.scale.setScalar(1.18); }
  face(w, t < E.yank ? 'angry' : t < E.empty ? 'shocked' : 'scared', t, 0.6, { noBlink: t > E.yank && t < E.empty + 0.6 });
  place(a, rm(11.4, 0, 6.2), -Math.PI / 2 - 0.3); pose(a, 'idle', t); face(a, t < E.empty ? 'nervous' : 'shocked', t, 0.3); lookAtP(a, kh, 0.9);
  ch.visible = true; ch.position.copy(rm(14.2, -0.3, 8.0)); ch.rotation.y = -Math.PI / 2 - 0.3; ch.scale.setScalar(0.88); ch.pose(t, { tremble: 1.6, open: t > E.empty ? 0.8 : 0.3, look: [0.2, 0.3], wide: 1, worry: 0.9, armL: 1.3, armR: 1.3, armLx: -1.2, armRx: -1.2 });
}
function poseRoomJar(t) {   // L11-12: the jar on the pillow; Arlo, chest dark, looks at his inky hands
  const E = EV, s = (i) => L(i).start, a = W.arlo, w = W.wren, ch = W.chk, R = W.room;
  poseRoomBase(t);
  const jp = R.pillow.clone().add(RM); W.jar.visible = true; W.jar.position.copy(jp).add(v3(0, -0.1, 0.2)); W.jar.lid.position.y = 1.85; W.jar.lid.rotation.set(0, 0, 0); W.jar.heart.visible = true; W.jar.heart.position.y = 0.95 + Math.sin(t * 2.2) * 0.06; W.jar.heart.rotation.y = Math.sin(t * 0.9) * 0.6; W.jar.heart.set(0.3, t, 1);
  W.jarL.position.copy(jp).add(v3(0, 1.2, 0.8)); W.jarL.intensity = 10 * (0.8 + 0.4 * Math.sin(t * 23) * Math.sin(t * 7.3));
  // Arlo by the foot of the bed
  const AP = rm(-4.6, 0, 4.4), see = smooth(s(12) + 0.2, s(12) + 0.7, t);
  place(a, AP, t < s(12) ? -Math.PI / 2 - 0.35 : -Math.PI / 2 + 0.5); pose(a, 'idle', t);
  if (t < s(12)) { lookAtP(a, jp, 0.9); face(a, 'shocked', t, 0.3); }
  else { const hp = H(a).add(v3(0, -1.7, 0).add(v3(Math.sin(a.root.rotation.y), 0, Math.cos(a.root.rotation.y)).multiplyScalar(1.8))); aimArm(a, 0, hp.clone().add(v3(0.3, 0, 0.3)), see * 0.9); aimArm(a, 1, hp.clone().add(v3(-0.3, 0, -0.3)), see * 0.9); a.neck.rotation.x = 0.45 * see; face(a, see > 0.5 ? 'sad' : 'shocked', t, 0.3); }
  W.arloInk.set(t > s(12) ? 1 : 0.6);
  place(w, rm(1.0, 0, 7.6), -Math.PI / 2 - 0.7); pose(w, 'idle', t); W.helm.visible = true; aimArm(w, 0, H(w).add(v3(-0.9, -2.0, 0.6)), 1); W.helm.position.copy(handOf(w, 0)).add(v3(-0.2, -0.55, 0)); W.helm.rotation.set(0.3, -1.2, 0); W.helm.scale.setScalar(1.18); lookAtP(w, t < s(12) ? jp : H(a), 0.8); face(w, 'sad', t, 0.6);
  ch.visible = true; ch.position.copy(rm(-1.6, -0.3, 9.2)); ch.rotation.y = -Math.PI + 0.7; ch.scale.setScalar(0.88); ch.pose(t, { tremble: 0.8, open: 0.15, look: [-0.4, 0.2], wide: 0.6, worry: 0.9, armL: 0.6, armR: 0.6 });
}
function posePlease(t) {   // L13: Checkers begs
  const s = (i) => L(i).start, a = W.arlo, ch = W.chk, w = W.wren;
  poseRoomBase(t);
  const AP = rm(-6.4, 0, 6.4); place(a, AP, -Math.PI / 2 + 0.9); pose(a, 'idle', t); face(a, 'sad', t, 0.3); W.arloInk.set(1);
  const CP = rm(-1.4, -0.3, 8.6); ch.visible = true; ch.position.copy(CP); ch.rotation.y = yawTo(CP, AP) - 0.5; place(a, AP, yawTo(AP, CP)); pose(a, 'idle', t); ch.scale.setScalar(0.92);
  const v = talk(13, t), op = v ? { A: 0.9, E: 0.6, O: 0.8, U: 0.5, W: 0.5, M: 0.05, F: 0.25, L: 0.4, X: 0.1 }[v] ?? 0.5 : 0.1;
  ch.pose(t, { tremble: 0.9, open: op, look: [0, 0.3], wide: 0.7, worry: 1, armL: 0.9, armR: 0.9, armLx: -0.8, armRx: -0.8 });
  lookAtP(a, ch.position.clone().add(v3(0, 2.6, 0)), 0.8);
  place(w, rm(1.0, 0, 7.6), -Math.PI / 2 - 0.7); pose(w, 'idle', t); face(w, 'sad', t, 0.6); lookAtP(w, H(a), 0.8); W.helm.visible = true; aimArm(w, 0, H(w).add(v3(-0.9, -2.0, 0.6)), 1); W.helm.position.copy(handOf(w, 0)).add(v3(-0.2, -0.55, 0)); W.helm.rotation.set(0.3, -1.2, 0); W.helm.scale.setScalar(1.18);
}
function poseHome(t) {   // L14a: the lid comes off, the heart flies home
  const E = EV, s = (i) => L(i).start, a = W.arlo, R = W.room;
  poseRoomBase(t);
  const jp = R.pillow.clone().add(RM), AP = rm(-6.0, 0, -8.4);
  place(a, AP, yawTo(AP, jp)); pose(a, 'idle', t); W.arloInk.set(1);
  const lidU = smooth(E.lid - 0.15, E.lid + 0.25, t);
  W.jar.visible = true; W.jar.position.copy(jp).add(v3(0, -0.1, 0.2)); W.jar.lid.position.set(-lidU * 1.2, 1.85 + lidU * 0.9, lidU * 0.4); W.jar.lid.rotation.z = lidU * 1.2;
  aimArm(a, 0, W.jar.position.clone().add(v3(0, 2.4 + lidU * 0.8, 0)), 1 - smooth(E.fly0, E.fly0 + 0.4, t)); aimArm(a, 1, W.jar.position.clone().add(v3(0.3, 1.0, 0)), 1 - smooth(E.fly0, E.fly0 + 0.4, t));
  const fu = smooth(E.fly0, E.fly1, t); a.root.updateMatrixWorld(true); const chest = a.heart.getWorldPosition(v3());
  const from = W.jar.position.clone().add(v3(0, 0.95, 0)), mid = from.clone().lerp(chest, 0.5).add(v3(0, 1.6, 0));
  const hp = from.clone().multiplyScalar((1 - fu) * (1 - fu)).add(mid.clone().multiplyScalar(2 * fu * (1 - fu))).add(chest.clone().multiplyScalar(fu * fu));
  W.jar.heart.visible = fu <= 0.001; W.jar.heart.set(0.55, t, 1);
  W.flyH.visible = fu > 0.001 && fu < 0.999; W.flyH.position.copy(hp); W.flyH.rotation.y = t * 8; W.flyH.set(1, t);
  W.trail.visible = W.flyH.visible; if (W.trail.visible) { W.trail.position.copy(hp); W.trail.update(t); }
  W.jarL.position.copy(hp).add(v3(0, 0.6, 0.6)); W.jarL.intensity = 40 + 60 * fu;
  face(a, fu > 0.95 ? 'surprised' : 'focused', t, 0.3); lookAtP(a, fu > 0.9 ? H(a).add(v3(0, -2, 2)) : hp, 0.9);
  const w = W.wren, ch = W.chk; place(w, rm(1.0, 0, 7.6), -Math.PI / 2 - 0.9); pose(w, 'idle', t); face(w, 'surprised', t, 0.6); lookAtP(w, hp, 0.8); W.helm.visible = false;
  ch.visible = true; ch.position.copy(rm(-1.6, -0.3, 8.4)); ch.rotation.y = -Math.PI + 0.4; ch.scale.setScalar(0.88); ch.pose(t, { tremble: 0.5, open: 0.4, look: [-0.3, 0.6], wide: 0.9, worry: 0.4, armL: 0.6, armR: 0.6 });
}
function poseHold(t) {   // L14b: palms on the fountain, the friends hold on, gold light fills the room
  const E = EV, s = (i) => L(i).start, a = W.arlo, w = W.wren, ch = W.chk;
  poseRoomBase(t);
  const fp = W.fr.position, AP = fp.clone().add(v3(3.6, 0, 0.0));
  kneel(a, AP, -Math.PI / 2, 1); W.arloInk.set(1 - smooth(E.hold + 0.5, E.hold + 2.4, t));
  const tg = fp.clone().add(v3(1.1 + 1.0 * (1 - W.fr.k), 2.3, 0)); aimArm(a, 0, tg.clone().add(v3(0, 0, -0.6)), 1); aimArm(a, 1, tg.clone().add(v3(0, 0, 0.6)), 1);
  face(a, 'focused', t, 0.3); a.neck.rotation.x = -0.05;
  const go = smooth(E.hold - 0.2, E.hold + 0.6, t), WP = AP.clone().add(v3(2.8, 0, -1.3));
  place(w, WP, -Math.PI / 2 - 0.25); pose(w, 'idle', t); w.torso.rotation.x = 0.15; aimArm(w, 1, shoulderOf(a, 0).add(v3(0, 0.25, 0)), go); face(w, 'focused', t, 0.6); lookAtP(w, fp.clone().add(v3(0, 3, 0)), 0.7);
  const CP = WP.clone().add(v3(2.6, -0.3, 1.9)); ch.visible = true; ch.position.copy(CP); ch.rotation.y = -Math.PI / 2 - 0.35; ch.scale.setScalar(0.9);
  ch.pose(t, { tremble: 0.6 * (1 - go), open: 0.15, look: [0, 0.3], wide: 0.6, worry: 0.5 * (1 - smooth(E.hold + 1.5, E.hold + 2.5, t)), armL: 1.45 * go, armLx: -0.55 * go, armR: 0.4 });
  const g = smooth(E.hold, E.hold + 1.6, t) * (1 - 0.35 * smooth(E.hold + 2.6, E.hold + 3.6, t));
  W.sealL.position.copy(fp).add(v3(1.5, 3.5, 2)); W.sealL.intensity = 170 * g; W.goldSp.visible = g > 0.05; W.goldSp.position.copy(fp); W.goldSp.update(t);
  return g;
}
function poseStarsBack(t) {   // L15: the house from the street; the sky refills
  const hs = W.street.house; hs.door.rotation.y = 0;
  hs.mats; // the room's gold still in the window
}
function poseThumb(t) { poseMorning(t, true); }

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  // the street, the first fountain
  add('open', 0, (u) => ({ pos: lp3(v3(-14, 19, 14), v3(-17, 17.5, 13), easeInOut(u)), look: lp3(v3(-40, 5, 3), v3(-41, 6.5, 3), u), fov: 50 }));
  add('wake', s(0) + 2.35, (u) => ({ pos: lp3(v3(-38.0, 3.8, 18.0), v3(-38.8, 3.6, 17.6), easeInOut(u)), look: v3(-45.5, 2.4, 10.5), fov: 54 }));
  add('heart', s(1) - 0.04, (u) => ({ pos: lp3(v3(-44, 4.2, 18.5), v3(-44.6, 4.0, 17), easeInOut(u)), look: lp3(v3(-55, 3.6, 11.5), v3(-52, 3.6, 10.2), u), fov: 46 }));
  add('eat', s(1) + 2.95, (u) => ({ pos: v3(-30, 4.2, 16.8), look: lp3(v3(-40, 7, 4), v3(-44, 40, -30), easeInOut(clamp(u * 1.25))), fov: 58 }));
  add('arlo', s(2) - 0.04, (u) => { const a = W.arlo, h = H(a), y = a.root.rotation.y + 0.35, f = v3(Math.sin(y), 0, Math.cos(y)); return { pos: h.clone().addScaledVector(f, 6.8 - u * 0.6).add(v3(0, -1.5, 0)), look: h.clone().add(v3(0, -1.2, 0)), fov: 52 }; });
  add('kick', s(3) - 0.04, (u) => ({ pos: lp3(v3(-48.5, 4.2, 0.5), v3(-47.5, 4.4, 1.2), u), look: v3(-48.5, 3.2, 14), fov: 54 }));
  add('checkers', s(4) - 0.04, (u) => ({ pos: lp3(v3(-55.5, 4.0, 1.5), v3(-55, 4.0, 2.8), easeInOut(u)), look: v3(-53.5, 3.0, 13), fov: 52 }));
  add('seal', s(5) - 0.04, (u) => ({ pos: lp3(F2.clone().add(v3(-9.5, 5.2, 11)), F2.clone().add(v3(-8.5, 4.8, 10)), easeInOut(u)), look: F2.clone().add(v3(0.5, 3.4, 2.5)), fov: 52 }));
  add('sky', s(5) + 2.95, (u) => ({ pos: v3(70, 3.0, 17.2), look: lp3(v3(64, 14, -10), v3(60, 52, -40), easeInOut(u)), fov: 60 }));
  add('morning', s(5) + 4.15, (u) => { const h = H(W.arlo); return { pos: h.clone().add(v3(2.6 - u * 0.4, -1.3, 6.0 - u * 0.6)), look: h.clone().add(v3(0, -1.1, 0)), fov: 50 }; });
  // the rumor
  add('rumor', s(6) - 0.04, (u) => ({ pos: lp3(v3(74, 5.0, 2), v3(78, 4.6, 4), easeInOut(u)), look: v3(91, 4.6, 12), fov: 50 }));
  add('burst3', s(6) + 2.3, (u) => ({ pos: lp3(v3(83, 2.6, -3), v3(82.4, 2.4, -3.8), u), look: v3(92.5, 6.0, 11), fov: 56 }));
  add('tonight', s(7) - 0.04, (u) => { const h = H(W.wren); return { pos: h.clone().add(v3(-2.4 + u * 0.4, -1.3, -10.6 + u * 0.6)), look: h.clone().add(v3(-0.9, -1.6, 0)), fov: 56 }; });
  add('hedge', s(8) - 0.04, (u, t) => { const kx = knightStreetAt(t).pos.x; return { pos: v3(-13 + (kx + 13) * 0.4, 4.4, 0.5), look: v3(-12.5 + (kx + 12.5) * 0.5, 3.6, 15), fov: 54 }; });
  add('drip', s(8) + 2.55, (u, t) => { const kp = knightStreetAt(t).pos; return { pos: kp.clone().add(v3(4.6, 1.3, -4.6)), look: kp.clone().add(v3(0, 1.9, 0)), fov: 54 }; });
  add('follow', s(9) - 0.04, (u) => ({ pos: lp3(v3(4.5, 4.4, 13), v3(5, 4.6, 11.5), easeInOut(u)), look: v3(10, 5.5, -18), fov: 52 }));
  add('doorway', s(9) + 1.4, (u) => ({ pos: lp3(rm(13.5, 6.2, 13.0), rm(12.8, 6.0, 12.4), easeInOut(u)), look: rm(6, 4.0, 0.8), fov: 56 }));
  // the room
  add('crack', s(10) - 0.04, (u) => ({ pos: lp3(rm(-3.5, 7.5, 11.5), rm(-2.6, 7.0, 10.6), easeInOut(u)), look: rm(6.5, 2.6, 2), fov: 54 }));
  add('yank', s(10) + 1.05, (u) => ({ pos: lp3(rm(4.0, 5.4, 16.5), rm(4.6, 5.6, 15.8), easeInOut(u)), look: rm(7.2, 4.4, 0.8), fov: 54 }));
  add('empty', s(10) + 2.4, (u) => { const k = H(W.knight); return { pos: k.clone().add(v3(-6.4 + u * 0.4, 1.3, 2.0)), look: k.clone().add(v3(0, -1.3, 0)), fov: 54 }; });
  add('jar', s(11) - 0.04, (u) => { const j = W.room.pillow.clone().add(RM); return { pos: lp3(j.clone().add(v3(5.5, 2.4, 6.0)), j.clone().add(v3(3.4, 1.4, 3.8)), easeInOut(u)), look: j.clone().add(v3(0, 0.6, 0.2)), fov: 46 }; });
  add('chest', s(11) + 2.85, (u) => { const a = W.arlo, h = H(a), y = a.root.rotation.y - 0.3, f = v3(Math.sin(y), 0, Math.cos(y)); return { pos: h.clone().addScaledVector(f, 6.0 - u * 0.5).add(v3(0, -1.3, 0)), look: h.clone().add(v3(0, -1.6, 0)), fov: 50 }; });
  add('inky', s(12) - 0.04, (u) => { const h = H(W.arlo); return { pos: h.clone().add(v3(-5.6 + u * 0.4, -0.2, 3.6)), look: h.clone().add(v3(0.4, -1.8, 0.5)), fov: 52 }; });
  add('please', s(13) - 0.04, (u) => ({ pos: lp3(rm(-7.8, 4.6, 1.2), rm(-7.4, 4.4, 1.8), easeInOut(u)), look: rm(-1.6, 2.6, 8.0), fov: 52 }));
  add('home', s(14) - 0.04, (u) => ({ pos: lp3(rm(-9.0, 6.2, 4.2), rm(-9.0, 6.0, 3.4), easeInOut(u)), look: rm(-9.0, 4.0, -8.4), fov: 58 }));
  add('hold', E.hold - 0.12, (u) => ({ pos: lp3(rm(6.5, 6.4, 17.5), rm(7.0, 6.2, 16.5), easeInOut(u)), look: rm(10.5, 3.2, 4.0), fov: 54 }));
  // outside
  add('stars', s(15) - 0.04, (u) => ({ pos: v3(20, 3.2, 12), look: lp3(v3(12, 10, -28), v3(8, 46, -60), easeInOut(clamp(u * 1.15))), fov: 60 }));
  add('morning2', s(16) - 0.04, (u) => ({ pos: lp3(rm(7.0, 6.0, 19.0), rm(6.2, 5.8, 18.0), easeInOut(u)), look: rm(-6.5, 3.0, 3.5), fov: 56 }));
  add('thumb', s(16) + 1.6, (u) => { const a = W.arlo; a.root.updateMatrixWorld(true); const d = a.drop.getWorldPosition(v3()); return { pos: d.clone().add(v3(0.9 - u * 0.2, 0.3, 4.4 - u * 0.6)), look: d.clone().add(v3(-0.2, -0.6, 0)), fov: 44 }; });
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}

const KEYS = { open: 'open', wake: 'open', heart: 'heart', eat: 'heart', arlo: 'arlo', kick: 'kick', checkers: 'checkers', seal: 'seal', sky: 'sky', morning: 'morning',
  rumor: 'rumor', burst3: 'rumor', tonight: 'tonight', hedge: 'hedge', drip: 'drip', follow: 'follow', doorway: 'rdoor', crack: 'ryank', yank: 'ryank', empty: 'ryank',
  jar: 'rjar', chest: 'rjar', inky: 'rjar', please: 'please', home: 'home', hold: 'hold', stars: 'stars', morning2: 'thumb', thumb: 'thumb' };
const SET = { open: 'st', heart: 'st', arlo: 'st', kick: 'st', checkers: 'st', seal: 'st', sky: 'st', rumor: 'st', tonight: 'st', hedge: 'st', drip: 'st', follow: 'st', stars: 'st',
  morning: 'rd', thumb: 'rd', rdoor: 'rn', ryank: 'rn', rjar: 'rn', please: 'rn', home: 'rn', hold: 'rn' };

function renderAt(t) {
  let sh = shotAt(W.shots, t); const key = KEYS[sh.name], set = SET[key];
  let env = set === 'st' ? NIGHTST : set === 'rn' ? ROOMN : ROOMD;
  applyEnv(ctx, env);
  const night = set !== 'rd';
  WIN.emissiveIntensity = night ? 1.1 : 0; W.street.houses.forEach((c) => { c.lampM.emissiveIntensity = night ? 2.2 : 0; });
  W.street.visible = set === 'st'; W.room.visible = set !== 'st';
  W.pt.forEach((l) => { l.intensity = l.userData.set === set ? l.userData.I : 0; });
  W.all.forEach((c) => { c.root.visible = false; }); [W.chk, W.can, W.mail, W.jar, W.helm, W.flyH, W.trail, W.goldSp].forEach((o) => { if (o) o.visible = false; });
  [W.f1, W.f2, W.f3, W.fr].forEach((f) => { f.visible = false; }); [W.f1L, W.f2L, W.f3L, W.frL, W.sealL, W.jarL, W.heartL].forEach((l) => { l.intensity = 0; });
  W.drops.update(t, null); W.room.crack.set(0); W.street.house.door.rotation.y = 0;
  W.arloInk.set(0); W.arlo.drop.visible = false; W.knight.root.scale.set(1, 1, 1);
  const tt = { open: () => poseOpen(t), heart: () => poseHeartIntro(t), arlo: () => poseArloHero(t), kick: () => poseKick(t), checkers: () => poseCheckers(t), seal: () => poseSeal(t), sky: () => poseSky(t),
    morning: () => poseMorning(t), rumor: () => poseRumor(t), tonight: () => poseTonight(t), hedge: () => poseHedge(t), drip: () => poseDrip(t), follow: () => poseFollow(t),
    rdoor: () => poseRoomDoor(t), ryank: () => poseRoomYank(t), rjar: () => poseRoomJar(t), please: () => posePlease(t), home: () => poseHome(t), hold: () => poseHold(t), stars: () => poseStarsBack(t), thumb: () => poseThumb(t) }[key];
  tt();
  // Arlo's heart and its light
  if (W.arlo.root.visible) { const hk = heartK(t); W.arlo.heart.set(hk, t); W.arlo.root.updateMatrixWorld(true); W.heartL.position.copy(W.arlo.heart.getWorldPosition(v3())).add(v3(0, 0.4, 1.2)); W.heartL.intensity = 18 * hk; }
  // stars: in the sky outside, and through the window at night
  W.stars.visible = night; W.stars.set(starsK(t), t);
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2, 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * (c.spec.scale || 1); c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2], Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  W.stars.follow({ position: sh.pos });
  frame(ctx, t, sh, { steady: t < 2.4 || Q.get('steady') === '1', shake: 0, shadowSpan: set === 'st' ? 80 : 45, shadows: true, black: 0 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep112', { look: 'pro', avatars: [...new Set(Object.values(AV).map((a) => a[0]))] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'smirk', 'grin', 'focused', 'shocked', 'surprised', 'nervous', 'scared', 'angry', 'sleepy', 'suspicious', 'blink']);
  const { scene, camera } = ctx; camera.far = 2600; camera.near = 0.1; camera.updateProjectionMatrix();
  W.street = nightStreet(); scene.add(W.street);
  W.room = arloRoom(); W.room.position.copy(RM); scene.add(W.room);
  W.f1 = inkFountain({ r: 2.2, h: 11, seed: 3 }); scene.add(W.f1);
  W.f2 = inkFountain({ r: 2.0, h: 9, seed: 7 }); scene.add(W.f2);
  W.f3 = inkFountain({ r: 2.3, h: 12, seed: 11 }); scene.add(W.f3);
  W.fr = inkFountain({ r: 1.5, h: 7.5, seed: 5 }); scene.add(W.fr);
  W.stars = starField({ count: 1100, radius: 1800 }); scene.add(W.stars);
  const PL = (c, I, d, set, p) => { const l = new THREE.PointLight(c, I, d, 1.5); if (p) l.position.copy(p); l.userData.I = I; l.userData.set = set; scene.add(l); return l; };
  W.pt = [];
  for (const [x, z] of [[-39, 15.9], [-39, -15.9], [-7, 15.9], [25, -15.9], [57, 15.9], [57, -15.9], [89, 15.9], [-71, 15.9]]) W.pt.push(PL('#ffcf8a', 140, 46, 'st', v3(x + 1.55, 11, z)));
  W.pt.push(PL('#ffd9a0', 70, 30, 'rn', rm(-6.3, 6.4, -10.4)), PL('#ffe9c8', 160, 60, 'rd', rm(2, 13, 4)), PL('#9fb4ff', 40, 40, 'rn', rm(-1, 9, -6)));
  W.f1L = PL('#9a5cff', 0, 34, 'x', F1.clone().add(v3(0, 4, 0))); W.f2L = PL('#9a5cff', 0, 30, 'x', F2.clone().add(v3(0, 4, 0))); W.f3L = PL('#9a5cff', 0, 34, 'x', F3.clone().add(v3(0, 5, 0)));
  W.frL = PL('#9a5cff', 0, 28, 'x'); W.sealL = PL('#ffc04a', 0, 40, 'x'); W.jarL = PL('#ffc04a', 0, 12, 'x'); W.heartL = PL('#ffc04a', 0, 12, 'x');
  W.b1 = burst(scene, { pos: F1, color: '#b57cff', count: 120, spread: 2.5, height: 3, dur: 1.6, bright: 1.6, seed: 4 }).fire(EV.burst1);
  W.b3 = burst(scene, { pos: F3, color: '#b57cff', count: 120, spread: 2.5, height: 3, dur: 1.6, bright: 1.6, seed: 6 }).fire(EV.burst3);
  W.goldSp = sparkles(scene, { count: 160, color: '#ffd36a', size: 9, height: 8, centre: v3(0, 4, 0), pointSize: 0.45 }); W.goldSp.visible = false;
  W.trail = sparkles(scene, { count: 60, color: '#ffd36a', size: 1.6, height: 1.6, pointSize: 0.4 }); W.trail.visible = false;
  people();
  W.drops = inkDrops(scene, 26, { period: 0.42 });
  W.jar = inkJar(); scene.add(W.jar); W.jar.visible = false;
  W.helm = (await import('../engine/inkfountains.js')).knightHelmet(); scene.add(W.helm); W.helm.visible = false;
  W.flyH = goldHeart(0.7); scene.add(W.flyH); W.flyH.visible = false;
  W.shots = shots();
  window.__ep112 = { W, THREE, ctx, L };
  void glowSprite; void rng;
  return expose(ctx, renderAt, L(12).start + 1.2, EV);
}
