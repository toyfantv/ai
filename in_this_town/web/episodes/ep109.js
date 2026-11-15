// Flower Man remake 9: The Postman of the Birch Woods. In Birchwater nobody says a real name aloud (the barber is just Snips), because a
// postman made of bark lives in the birches: a real name he hears, he writes on a postcard and posts, and the town forgets that person.
// Kit's sister goes by Sparrow. One Sunday a bakery van rolls down the hill at their baby brother's trike; Sparrow gets there first, and
// Mom screams "Marigold!". In the birches a quill scratches; Mom's face goes blank: "Who are you? Put my baby down!" Only Kit remembers:
// he was mowing in ear defenders. That night he follows the scratching into the woods, where thousands of postcards hang between the
// trees and the newest says Marigold. He grabs it and a cold twig hand closes on his wrist: "What is posted, stays posted." "Then post a
// different name." Kit writes his own name (Elliot) on a fresh card and feeds hers to the lantern; the postman tips his cap. At sunrise
// Mom is braiding Sparrow's hair: "Oh! Are you lost, sweetheart?" Kit lives in the treehouse now; Sparrow leaves him cocoa every night.
// She doesn't know why. He never tells her.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DAY } from '../engine/stage.js';
import { burst, leaves, dust } from '../engine/atmos.js';
import { jointify } from '../engine/infinitetower.js';
import { FARM } from '../engine/farm_cast.js';
import { flashlightProp } from '../engine/folklore.js';
import { glowSprite } from '../engine/props.js';
import { leafTime } from '../engine/forest.js';
import { birchwater, nightWoods, kitchen, postman, postcard, van, trike, mower, quill, thermos, mugOf, wafflePlate, wearEarDefenders, wearNameTag, hY, hSlope, HOUSE, TREE } from '../engine/birchpost.js';

const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV, CAP = [];
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
// [avatar, scale, head scale]
const AV = {
  kit: ['farm_finn', 0.8], sparrow: ['farm_ep39_sophie_b', 0.9], mom: ['farm_ep31_dana', 1], baby: ['farm_young_kid', 0.42, 1.38],
  barber: ['farm_baker', 1], t1: ['farm_gardener', 1], t2: ['farm_nia', 0.95], t3: ['farm_lumber_joe', 1],
};
for (const k of ['kit', 'sparrow', 'mom']) if (Q.get(k)) AV[k][0] = Q.get(k);
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';

// the sets, far apart
const BW = v3(-1500, 0, 0), WD = v3(1500, 0, 0), KT = v3(0, 0, 1500);
const at = (o, x, y, z) => o.clone().add(v3(x, y, z));
const SW = 0.3;   // sidewalk top

const SUN = { ...DAY, ...P({ top: '#3f95e8', horizon: '#d8efff', haze: '#d8efff', sunColor: '#fff0d0', hemiSky: '#d6ecff', hemiGround: '#d0c28a' }), sunDir: v3(0.5, 0.72, 0.45), sunI: 2.2, sunDisc: 0, hemiI: 1.12, amb: 0.3, envI: 1.0, exposure: 1.0, bloom: 0.03, vig: 0, saturation: 1.2, contrast: 1.05, bounce: 0.18, fogNear: 300, fogFar: 1100, stars: 0, moon: 0, win: 0, lamp: 0 };
const NIGHTW = { ...SUN, ...P({ top: '#0a1230', horizon: '#1d2c5a', haze: '#18244a', sunColor: '#9fb6ff', hemiSky: '#3a4f96', hemiGround: '#1a1d22' }), sunDir: v3(-0.35, 0.8, -0.45), sunI: 0.75, hemiI: 0.62, amb: 0.16, envI: 0.35, exposure: 1.18, saturation: 1.1, contrast: 1.06, fogNear: 30, fogFar: 190, stars: 1, moon: 1, bloom: 0.08 };
const MORN = { ...SUN, ...P({ top: '#ffe6c8', horizon: '#ffe6c8', haze: '#ffe6c8', sunColor: '#ffd29a', hemiSky: '#fff2de', hemiGround: '#d8b890' }), sunDir: v3(0.8, 0.5, 0.3), sunI: 0.9, hemiI: 1.0, amb: 0.32, envI: 0.6, exposure: 0.92, saturation: 1.18, fogNear: 400, fogFar: 1400 };
const DUSKY = { ...SUN, ...P({ top: '#4d55b8', horizon: '#ffad78', haze: '#ffbc90', sunColor: '#ffb070', hemiSky: '#ffcfb0', hemiGround: '#8a7a6a' }), sunDir: v3(-0.75, 0.24, 0.55), sunI: 1.9, hemiI: 0.95, amb: 0.24, exposure: 1.02, saturation: 1.14, fogNear: 220, fogFar: 900, win: 0.8, lamp: 1 };

const capT = (word, after = 0) => { const c = CAP.find((x) => x.start >= after - 0.01 && x.text.toUpperCase().replace(/[“”]/g, '').includes(word)); return c ? c.start : after; };
function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  const scoop = s(6) + 0.5;
  return { vanGo: capT('A VAN ROLLED', s(5)) - 0.2, trikeShot: capT('BABY BROTHER', s(5)) - 0.65, run0: s(6) - 0.4, scoop, vanPass: scoop + 0.42, safe: s(6) + 1.0,
    scream: s(7), quill: capT('A QUILL', s(8)) - 0.05, cold: s(9), put: capT('PUT MY BABY', s(9)), take: s(9) + 1.0, kitPull: s(10) + 0.35, mowing: capT("HE'D BEEN", s(10)),
    night: s(11), reveal: s(12), newest: capT('THE NEWEST', s(12)), grab: s(13) + 0.25, hand: capT('A COLD HAND', s(13)), loom: capT('ON HIS WRIST', s(13)) + 0.1,
    pm: s(14), kline: s(15), write2: s(16), feed: capT('CARD, AND FED', s(16)) - 0.2, flare: capT('TO THE LANTERN', s(16)) + 0.15, tip: s(17) + 0.15,
    dawn: s(18), enter: capT('MOM WAS', s(18)) + 0.3, lost: s(19), blank: s(19) + 1.3, cocoa: s(20), place: capT('SPARROW LEAVES', s(20)), end1: s(21), endW: capT('HE NEVER', s(21)), end: ctx.dur };
}

// ---- helpers ----
const SC = (c) => (c.spec.scale || 1) * c.root.scale.x;
const armLen = (c) => { if (!c._alen) { c.reset(); const r = c.root.rotation.clone(), p = c.root.position.clone(), s0 = c.root.scale.x; c.root.scale.setScalar(1); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3(); c.arms[0].traverse((o) => { if (o.isMesh && !o.userData.worn) bx.expandByObject(o); }); c._alen = sh.y - bx.min.y - 0.12 * (c.spec.scale || 1); c.root.rotation.copy(r); c.root.position.copy(p); c.root.scale.setScalar(s0); c.root.updateMatrixWorld(true); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.arms[side].localToWorld(v3(0, -armLen(c) / s, 0.1)); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.scale.set(1, 1, 1); c.head.rotation.set(0, 0, 0); c.arms.forEach((a) => a.quaternion.identity()); c.legs.forEach((l) => l.rotation.set(0, 0, 0)); c.hips.position.y = c.hipY ?? 2; c.torso.rotation.set(0, 0, 0); c.neck.rotation.set(0, 0, 0); }
function place(c, p, yaw, size = 1) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; c.root.scale.setScalar(size); }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const H = (c) => { c.root.updateMatrixWorld(true); return c.neck.getWorldPosition(v3()).add(v3(0, 0.8 * SC(c), 0)); };
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.closed ? true : o.noBlink ? false : blinkAt(t, ph), viseme: o.viseme, gaze: o.gaze }); }
const talk = (i, t, txt) => (t > L(i).start && t < L(i).end ? visemeAt(txt || L(i).text.replace(/[“”]/g, ''), L(i).start, L(i).end, t) : undefined);
function lookAtP(c, p, k = 1) { c.root.updateMatrixWorld(true); const n = c.neck.getWorldPosition(v3()), a = wrap(yawTo(n, p) - c.root.rotation.y); c.neck.rotation.y = clamp(a, -1.2, 1.2) * k; c.neck.rotation.x = -Math.atan2(p.y - n.y - 0.6 * SC(c), Math.hypot(p.x - n.x, p.z - n.z)) * 0.6 * k; }
function walkTo(c, a, b, t0, t1, t, speed = 1, kind = 'walk', size = 1) { const u = clamp((t - t0) / (t1 - t0)); const p = lp3(a, b, u); place(c, p, yawTo(a, b), size); pose(c, u > 0 && u < 1 ? kind : 'idle', t * speed); return u; }
const fwd = (c, d = 1) => v3(Math.sin(c.root.rotation.y), 0, Math.cos(c.root.rotation.y)).multiplyScalar(d);
const side = (c, d = 1) => { const f = fwd(c); return v3(f.z, 0, -f.x).multiplyScalar(d); };   // the character's left
function kneel(c, k) { const h0 = c.hipY ?? 2; c.hips.position.y = lerp(h0, h0 * 0.36, k); c.legs.forEach((l, i) => { l.rotation.x = -1.3 * k; if (c.knee) c.knee[i].rotation.x = 2.45 * k; }); }
function sitOn(c, seatP, yaw, size) { place(c, v3(0, 0, 0), yaw, size); pose(c, 'sit', 0); c.root.updateMatrixWorld(true); const hp = c.hips.getWorldPosition(v3()); c.root.position.copy(seatP).add(v3(0, -(hp.y - 0.42 * SC(c)), 0)); }
const bob = (t, f = 1) => Math.sin(t * f);

// ---- people ----
function people() {
  for (const [k, [avatar, scale, hs]] of Object.entries(AV)) {
    const c = makeCharacter({ avatar, alti: true, skin: skinOf(avatar), caustic: false, scale });
    ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c.key = k;
    c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c);
    if (hs) c.head.scale.setScalar(hs);
    W[k] = c;
  }
  W.all = Object.keys(AV).map((k) => W[k]);
  W.tags = { kit: wearNameTag(W.kit, 'KIT'), sparrow: wearNameTag(W.sparrow, 'SPARROW', { band: '#2f8f6a' }), barber: wearNameTag(W.barber, 'SNIPS', { band: '#2f5aa8' }), t1: wearNameTag(W.t1, 'PEPPER'), t2: wearNameTag(W.t2, 'No. 12', { band: '#7d5cc0' }), t3: wearNameTag(W.t3, 'CAPTAIN', { band: '#e08a3a' }) };
  W.ear = wearEarDefenders(W.kit);
}
function hideAll() { W.all.forEach((c) => { c.root.visible = false; }); }
const PM = () => W.pm;

// ================= Birchwater (day) =================
const VZ = -5;   // the van's lane
function vanX(t) {   // the van's centre x by time: creeps, then rolls downhill; past the trike it drifts to a stop
  const E = EV, x0 = -78, v = 34, tau = 0.6, t0 = E.vanGo;
  if (t < t0) return x0;
  const u = t - t0, x = x0 + v * (u - tau * (1 - Math.exp(-u / tau)));
  const tb = E.vanPass + 0.4; if (t < tb) return x;
  const xb = x0 + v * ((tb - t0) - tau * (1 - Math.exp(-(tb - t0) / tau))), w = t - tb; return xb + v * Math.min(w, 1.2) - v * 0.5 * Math.min(w, 1.2) ** 2 / 1.2;
}
function poseVan(t) {
  const x = vanX(t), V = W.van; V.visible = true;
  const sl = hSlope(x + 1.5);   // the front axle's height decides the pitch
  V.position.copy(at(BW, x, hY(x), VZ + (t > EV.vanPass + 0.4 ? -3 * smooth(EV.vanPass + 0.4, EV.vanPass + 1.6, t) : 0)));
  V.rotation.set(0, 0, -Math.atan(sl)); V.roll(x);
}
const TRK = at(BW, 24.6, 0, -6.2);
function poseTrike(t, carried) {
  const E = EV, T = W.trike, b = W.baby; T.visible = true;
  let p = TRK.clone(), yaw = 0.75, rx = 0;
  if (t < E.vanGo + 1.2) { const u = smooth(E.vanGo - 2.2, E.vanGo + 1.2, t); p = lp3(at(BW, 25.5, 0, -19), TRK, u); yaw = lerp(0.1, 0.75, u); }
  if (t > E.vanPass) { const f = t - E.vanPass; p = TRK.clone().add(v3(Math.min(f, 0.9) * 30 - Math.max(0, f - 0.9) * 0, Math.max(0, 6 * f - 12 * f * f), 0)); if (f > 0.5) p.y = 0; rx = Math.min(f, 0.6) * 9; yaw = 0.75 + Math.min(f, 0.6) * 5; }
  T.position.copy(p); T.rotation.set(rx, yaw, 0);
  if (!carried) { sitOn(b, p.clone().add(v3(Math.sin(yaw) * -0.45, W.trike.seatY, Math.cos(yaw) * -0.45)), yaw, 0.42); const hb = T.bar.clone().applyAxisAngle(v3(0, 1, 0), yaw).add(p); aimArm(b, 0, hb, 0.9); aimArm(b, 1, hb, 0.9); b.legs.forEach((l, i) => { l.rotation.x = -1.2 + Math.sin(t * 6 + i * Math.PI) * 0.35; }); face(b, 'happy', t, 0.2, { viseme: t > E.trikeShot + 0.3 && t < E.trikeShot + 1.3 ? visemeAt('vroom vroom', E.trikeShot + 0.3, E.trikeShot + 1.3, t) : undefined }); }
}
function poseWalk(t) {   // L0: Kit and Sparrow walk west on the north sidewalk; townsfolk
  const k = W.kit, s = W.sparrow;
  const A = at(BW, 48, SW, -11.6), B = at(BW, 39, SW, -11.6);
  walkTo(k, A, B, -0.2, 3.8, t, 0.95, 'walk', 0.8); face(k, 'happy', t, 0.2); lookAtP(k, H(s), 0.5);
  walkTo(s, A.clone().add(v3(0.3, 0, -2.6)), B.clone().add(v3(0.3, 0, -2.6)), -0.2, 3.8, t, 0.9, 'walk', 0.9); face(s, 'happy', t, 0.6, { viseme: t > 1.2 && t < 2.4 ? visemeAt('look, its pepper', 1.2, 2.4, t) : undefined }); lookAtP(s, H(k), 0.4);
  const t1 = W.t1; walkTo(t1, at(BW, 28, SW, -13.6), at(BW, 40, SW, -13.6), -0.5, 4.5, t, 0.9); face(t1, 'happy', t, 0.4); if (t > 1.6) { lookAtP(t1, H(k), 0.8); aimArm(t1, 1, H(t1).add(v3(0, 1.6, 0)).add(side(t1, -0.6)), smooth(1.6, 2.0, t) * (1 - smooth(2.8, 3.2, t))); }
  const t2 = W.t2; place(t2, at(BW, 33.6, SW, -14.4), Math.PI / 2 + 0.3); pose(t2, 'idle', t); face(t2, 'happy', t, 0.1); lookAtP(t2, H(k), 0.6);
  const t3 = W.t3; walkTo(t3, at(BW, 52, SW, 12.6), at(BW, 36, SW, 12.6), -0.5, 6, t, 0.8); face(t3, 'happy', t, 0.7);
  for (const q of ['kit', 'sparrow', 't1', 't2', 't3']) W.tags[q].visible = true;
}
function poseBarber(t) {
  const s = (i) => L(i).start, c = W.barber, P0 = at(BW, -2.6, SW + 0.02, 21.6);
  place(c, P0, Math.PI - 0.15); pose(c, 'idle', t); face(c, 'grin', t, 0.4);
  const sn = Math.sin(t * 16) * 0.5 + 0.5, hp = H(c).add(fwd(c, 0.9)).add(side(c, -1.0)).add(v3(0, -0.4, 0));
  aimArm(c, 1, hp, 1); W.scissors.visible = true; W.scissors.position.copy(handOf(c, 1)).add(v3(0, 0.25, 0)); W.scissors.rotation.set(0, c.root.rotation.y, 0.4); W.scissors.blades.forEach((bl, i) => { bl.rotation.z = (i ? 1 : -1) * (0.08 + 0.32 * sn); });
  aimArm(c, 0, H(c).add(fwd(c, 0.8)).add(side(c, 0.5)).add(v3(0, -1.8, 0)), 0.5);
  W.tags.barber.visible = true;
  // a customer walks out, fresh haircut, touching his head
  const cu = W.t3; walkTo(cu, at(BW, 1.4, SW, 22.6), at(BW, 6, SW, 13.6), s(1) + 0.3, s(1) + 2.6, t, 0.9); face(cu, 'grin', t, 0.3); aimArm(cu, 0, H(cu).add(v3(0, 0.3, 0)).add(side(cu, 0.4)), 0.85); W.tags.t3.visible = true;
}
function poseYard(t, o = {}) {   // the Sunday yard: Sparrow on the lawn, Kit mowing, the baby on his trike
  const E = EV, s = (i) => L(i).start, k = W.kit, sp = W.sparrow;
  // Kit mows along x on the west lawn, back and forth
  const mx = -6 + Math.sin(t * 0.5) * 4, mz = -24.5, dir = Math.cos(t * 0.5) >= 0 ? 1 : -1;
  const pull = o.kit ? smooth(E.kitPull, E.kitPull + 0.5, t) : 0;
  const KP = at(BW, mx, 0, mz), kyaw = lerp(dir > 0 ? Math.PI / 2 : -Math.PI / 2, yawTo(KP, at(BW, 18, 0, -15)), pull);
  place(k, KP, kyaw, 0.8); pose(k, pull < 0.5 ? 'walk' : 'idle', t * 0.7);
  const MWp = KP.clone().add(fwd(k, 3.4).multiplyScalar(1 - pull * 0.3)); W.mower.visible = true; W.mower.position.copy(MWp.setY(0)); W.mower.rotation.y = lerp(dir > 0 ? Math.PI / 2 : -Math.PI / 2, kyaw, pull) ;
  const grip = W.mower.grip.clone().applyAxisAngle(v3(0, 1, 0), W.mower.rotation.y).add(W.mower.position);
  if (pull < 0.6) { aimArm(k, 0, grip.clone().add(side(k, 0.35)), 1); aimArm(k, 1, grip.clone().add(side(k, -0.35)), 1); face(k, 'focused', t, 0.3); }
  else { const lift = smooth(E.kitPull + 0.2, E.kitPull + 0.6, t); aimArm(k, 1, H(k).add(side(k, -0.55)).add(v3(0, -0.2, 0)), lift); face(k, t > E.mowing - 0.4 ? 'surprised' : 'skeptic', t, 0.4); lookAtP(k, at(BW, 19, 4, -15), 0.7); W.ear.rotation.z = -0.55 * lift; W.ear.position.x = W.earX - 0.12 * lift; }
  if (!o.kit) { W.ear.rotation.z = 0; W.ear.position.x = W.earX; }
  // Sparrow
  if (!o.save) {
    const SP = at(BW, 15.5, 0, -21.5); place(sp, SP, yawTo(SP, TRK) - 0.2, 0.9); pose(sp, 'idle', t); face(sp, 'happy', t, 0.5); lookAtP(sp, H(W.baby), 0.7);
    if (t > s(4) - 0.2 && t < s(4) + 1.6) { aimArm(sp, 1, H(sp).add(v3(0, 1.4, 0)).add(side(sp, -0.7)).add(fwd(sp, 0.4)), smooth(s(4) - 0.2, s(4) + 0.2, t)); }
  }
  W.tags.sparrow.visible = false; W.tags.kit.visible = false;
}
function poseSave(t) {   // L6: Sparrow sprints, scoops the baby, dives clear; the van takes the trike
  const E = EV, sp = W.sparrow, b = W.baby;
  const A = at(BW, 15.5, 0, -21.5), B = TRK.clone().add(v3(-0.8, 0, -1.2)), C = at(BW, 20.8, 0, -15.2);
  let carried = t > E.scoop;
  if (t < E.run0) { place(sp, A, yawTo(A, TRK), 0.9); pose(sp, 'idle', t); face(sp, 'shocked', t, 0.5, { noBlink: true }); lookAtP(sp, at(BW, -40, 8, VZ), 0.7); }
  else if (t < E.scoop) { walkTo(sp, A, B, E.run0, E.scoop, t, 1.2, 'run', 0.9); face(sp, 'terrified', t, 0.5, { noBlink: true }); }
  else { const u = smooth(E.scoop + 0.08, E.scoop + 0.55, t); place(sp, lp3(B, C, u), yawTo(B, C), 0.9); pose(sp, u < 1 ? 'run' : 'idle', t * 1.3); kneel(sp, smooth(E.scoop + 0.45, E.scoop + 0.75, t) * 0.9); sp.torso.rotation.x = 0.3 * u; face(sp, u < 1 ? 'terrified' : 'scared', t, 0.5, { noBlink: u < 1 }); if (u >= 1) { sp.root.rotation.y = lerp(yawTo(B, C), yawTo(C, at(BW, 24, 0, -5)), smooth(E.scoop + 0.6, E.scoop + 1.1, t)); lookAtP(sp, W.van.position, 0.5); } }
  poseTrike(t, carried);
  if (carried) holdBaby(sp, t, 0.9);
  if (t < E.scoop) face(b, t > E.vanGo + 1.6 ? 'surprised' : 'happy', t, 0.2);
}
function holdBaby(c, t, s = 1) {   // the baby on a hip, held against the chest
  const b = W.baby, ch = H(c).add(fwd(c, 0.75 * SC(c))).add(v3(0, -1.75 * SC(c), 0)).add(side(c, -0.3 * SC(c)));
  place(b, ch.clone().add(v3(0, -1.2, 0)), c.root.rotation.y + Math.PI * 0.85, 0.42); pose(b, 'sit', 0); b.root.updateMatrixWorld(true);
  const hp = b.hips.getWorldPosition(v3()); b.root.position.add(ch.clone().sub(hp)); b.root.rotation.x = -0.2;
  aimArm(c, 0, ch.clone().add(side(c, 0.5)).add(v3(0, -0.2, 0)), 1); aimArm(c, 1, ch.clone().add(side(c, -0.5)).add(v3(0, 0.6, 0)), 1);
  aimArm(b, 0, H(c).add(v3(0, -0.6, 0)), 0.8); aimArm(b, 1, H(c).add(v3(0, -0.6, 0)), 0.8); lookAtP(b, H(c), 0.5);
}
function poseScream(t) {   // L7: Mom on the porch
  const m = W.mom, P0 = at(BW, HOUSE.x + 2.4, 1.0, HOUSE.z + 11.6);
  place(m, P0, yawTo(P0, at(BW, 21, 0, -15)), 1); pose(m, 'idle', t);
  const k = smooth(L(7).start - 0.25, L(7).start + 0.1, t); m.torso.rotation.x = -0.12 * k;
  aimArm(m, 0, H(m).add(fwd(m, 0.5)).add(side(m, -1.9)).add(v3(0, -1.3, 0)), k); aimArm(m, 1, H(m).add(fwd(m, 0.5)).add(side(m, 1.9)).add(v3(0, -1.3, 0)), k);
  face(m, 'terrified', t, 0.5, { noBlink: true, viseme: talk(7, t, 'mariigoold') || (t > L(7).start ? 'A' : undefined) });
}
function poseCold(t) {   // L9: Mom on the lawn, blank, then takes the baby from a stranger
  const E = EV, m = W.mom, sp = W.sparrow, SPp = at(BW, 20.8, 0, -15.2);
  place(sp, SPp, yawTo(SPp, at(BW, 17.0, 0, -18.6)), 0.9); pose(sp, 'idle', t);
  const kn = 1 - smooth(E.cold - 0.2, E.cold + 0.6, t); kneel(sp, kn * 0.9);
  const MP = at(BW, 16.6, 0, -18.4); place(m, lp3(MP.clone().add(v3(-4, 0, -6)), MP, smooth(E.cold - 1.6, E.cold - 0.2, t)), yawTo(MP, SPp), 1);
  pose(m, t < E.cold - 0.2 ? 'run' : 'idle', t); lookAtP(m, H(sp), 0.9);
  const took = t > E.take; const back = smooth(E.take + 0.1, E.take + 0.7, t);
  if (took) { m.root.position.add(v3(-1.0, 0, -1.4).multiplyScalar(back)); holdBaby(m, t, 1); face(W.baby, 'nervous', t, 0.2); }
  else { holdBaby(sp, t, 0.9); aimArm(m, 0, H(sp).add(v3(0.3, -1.5, 0)), smooth(E.cold + 0.4, E.take, t)); aimArm(m, 1, H(sp).add(v3(-0.3, -1.5, 0)), smooth(E.cold + 0.4, E.take, t)); face(W.baby, 'happy', t, 0.2); }
  const blankK = t > E.cold + 0.2;
  face(m, !blankK ? 'happy' : t < E.cold + 0.7 ? 'neutral' : 'angry', t, 0.5, { viseme: talk(9, t), noBlink: t > E.cold && t < E.cold + 0.7 });
  face(sp, t < E.cold + 0.4 ? 'happy' : t < E.put ? 'surprised' : 'shocked', t, 0.4, { noBlink: t > E.put });
  if (t > E.put + 0.4) { aimArm(sp, 1, H(m).add(v3(0, -0.6, 0)), smooth(E.put + 0.4, E.put + 0.9, t) * 0.8); lookAtP(sp, H(m), 0.9); }
}
function postmanEdge(t, o = {}) {   // L8: at the edge of the woods, writing MARIGOLD
  const pm = PM(), E = EV; pm.visible = true; const P0 = at(BW, 55, 0, -31); pm.position.copy(P0); pm.rotation.set(0, -Math.PI / 2 - 0.35, 0);
  pm.updateMatrixWorld(true);
  const chest = v3(0, 7.0, 3.0).applyMatrix4(pm.matrixWorld), card = W.card1;
  card.visible = true; card.position.copy(chest); card.rotation.set(-1.15, pm.rotation.y, 0, 'YXZ');
  const k = clamp((t - E.quill) / 1.5); card.write('MARIGOLD', k);
  const nib = chest.clone().add(v3(0, 0.1, 0)).add(v3(Math.cos(pm.rotation.y), 0, -Math.sin(pm.rotation.y)).multiplyScalar(-0.62 + k * 1.2)).add(v3(0, Math.sin(t * 30) * 0.03, 0));
  pm.set(t, { handL: chest.clone().add(v3(0, -0.35, 0)), handR: nib.clone().add(v3(0, 0.25, 0)), headPitch: 0.55, headYaw: 0.12, grip: { L: 0.5, R: 0.9 }, glow: 1, lean: 0.12 });
  W.quill.visible = true; W.quill.position.copy(pm.handPos[1]).add(v3(0, -0.1, 0)); W.quill.lookAt(nib); W.quill.rotateX(-Math.PI / 2); W.quill.position.copy(nib).add(v3(0, 0.02, 0)); W.quill.rotation.set(-0.6, pm.rotation.y, 0.3);
}
function poseTreehouse(t) {   // L20-21: dusk, the backyard
  const E = EV, sp = W.sparrow, k = W.kit, T = W.town.tree, TP = at(BW, TREE.x, 0, TREE.z);
  const foot = TP.clone().add(T.ladderFoot), HP = at(BW, TREE.x + 6, 0, TREE.z + 28);
  const u = smooth(E.cocoa - 0.3, E.place - 0.4, t);
  const SP = lp3(HP, foot.clone().add(v3(0.4, 0, 2.6)), u);
  place(sp, SP, yawTo(HP, foot), 0.9); pose(sp, u > 0 && u < 1 ? 'walk' : 'idle', t);
  const bend = smooth(E.place - 0.4, E.place + 0.2, t) * (1 - smooth(E.place + 0.9, E.place + 1.4, t));
  sp.torso.rotation.x = 0.7 * bend; kneel(sp, bend * 0.5);
  const putP = foot.clone().add(v3(0.2, 0, 0.8)), carry = t < E.place + 0.1;
  const hand = handOf(sp, 1);
  W.mug.visible = true; W.therm.visible = true;
  if (carry) { aimArm(sp, 1, H(sp).add(fwd(sp, 0.9)).add(v3(0, -1.7 - bend * 0.8, 0)).add(side(sp, -0.3)), 1); W.mug.position.copy(handOf(sp, 1)).add(v3(0, -0.3, 0)); W.therm.position.copy(W.mug.position).add(side(sp, 0.55)).add(v3(0, -0.5, 0)); W.therm.scale.setScalar(0.7); aimArm(sp, 0, W.therm.position.clone().add(v3(0, 0.6, 0)), 1); }
  else { W.mug.position.copy(putP); W.therm.position.copy(putP).add(v3(-0.9, 0, 0.2)); W.therm.scale.setScalar(0.7); }
  void hand;
  const look = t > E.place + 0.7; face(sp, look ? 'nervous' : 'happy', t, 0.5); if (look) { lookAtP(sp, TP.clone().add(v3(0, T.deckY + 3, T.doorZ)), 0.9); }
  W.steam.position.copy(W.mug.position).add(v3(0, 0.9, 0));
  // Kit at the treehouse door
  const KP = TP.clone().add(v3(0.4, T.deckY, T.doorZ + 1.2)); place(k, KP, 0.15, 0.8); pose(k, 'idle', t); face(k, t > E.endW ? 'happy' : 'sad', t, 0.4); lookAtP(k, H(sp), 0.8);
  if (t > E.end1) { aimArm(k, 1, H(k).add(v3(0, 1.2, 0)).add(side(k, -0.6)).add(fwd(k, 0.5)), smooth(E.end1 + 0.8, E.end1 + 1.2, t) * (1 - smooth(E.end - 1.0, E.end - 0.6, t)) * 0); }
  if (t > E.end1 + 0.4) { const back = smooth(E.end1 + 0.6, E.end - 0.2, t); place(sp, lp3(foot.clone().add(v3(0.4, 0, 2.6)), HP, back * 0.5), yawTo(foot, HP), 0.9); pose(sp, back > 0 && back < 0.95 ? 'walk' : 'idle', t); if (t > E.endW) { sp.root.rotation.y = lerp(yawTo(foot, HP), yawTo(HP, foot), smooth(E.endW, E.endW + 0.6, t)); face(sp, 'nervous', t, 0.5); lookAtP(sp, H(k), 0.8); } else face(sp, 'neutral', t, 0.5); }
  T.light.intensity = 40;
}

// ================= the woods (night) =================
const KIT_IN = () => at(WD, 0.6, 0, 7.5);
function flash(c, t, target, on = 1) {   // Kit's flashlight in his right hand, aimed at target
  aimArm(c, 1, target, 0.9); const hp = handOf(c, 1); const F = W.flash; F.visible = on > 0; F.position.copy(hp); F.lookAt(target);
  W.beam.visible = on > 0; W.beam.position.copy(hp); W.beam.target.position.copy(target); W.beam.target.updateMatrixWorld(); W.beam.intensity = 520 * on;
  W.cone.visible = on > 0; W.cone.position.copy(hp); W.cone.lookAt(target); W.cone.material.opacity = 0.06 * on;
}
function poseWoodsIntro(t) {   // L2-3: the postman walks, listens, writes a name, posts it
  const E = EV, s = (i) => L(i).start, pm = PM(); pm.visible = true;
  const A = at(WD, -13, 0, -2), B = at(WD, -3.2, 0, 3.6), u = clamp((t - s(2) + 0.2) / 3.3);
  const p = lp3(A, B, u); pm.position.copy(p); pm.rotation.set(0, yawTo(A, B), 0);
  if (t < s(3)) { pm.set(t, { walk: u < 1 ? t * 4.2 : null, lean: 0.08, headYaw: Math.sin(t * 0.8) * 0.2, glow: 0.8 }); return; }
  // listen: a twig hand cupped by the head, head tilted toward the town
  const li = smooth(s(3) - 0.2, s(3) + 0.4, t) * (1 - smooth(s(3) + 1.5, s(3) + 1.9, t));
  pm.rotation.y = lerp(yawTo(A, B), yawTo(A, B) + 0.9, smooth(s(3), s(3) + 0.8, t));
  pm.updateMatrixWorld(true);
  const headW = pm.headWorld(), sideL = v3(Math.cos(pm.rotation.y), 0, -Math.sin(pm.rotation.y));
  const chest = v3(0, 7.0, 3.0).applyMatrix4(pm.matrixWorld);
  const wr = smooth(s(3) + 1.6, s(3) + 2.0, t), k = clamp((t - s(3) - 1.9) / 0.9);
  const card = W.card0; card.visible = wr > 0.1; card.position.copy(chest); card.rotation.set(-1.15, pm.rotation.y, 0, 'YXZ'); card.write('Ned', k);
  const drop = smooth(s(3) + 3.0, s(3) + 3.6, t);
  if (drop > 0) { const sat = v3(1.05, 5.9, 0.6).applyMatrix4(pm.matrixWorld); card.position.lerp(sat, drop); card.rotation.x = lerp(-0.5, -1.4, drop); card.scale.setScalar(1 - drop * 0.4); }
  const nib = chest.clone().add(v3(0, 0.1, 0)).add(sideL.clone().multiplyScalar(0.5 - k * 0.9)).add(v3(0, Math.sin(t * 30) * 0.03, 0));
  pm.set(t, { handL: li > 0.05 ? headW.clone().add(sideL.clone().multiplyScalar(1.3)).add(v3(0, 0.1, 0)).lerp(chest.clone().add(v3(0, -0.35, 0)), wr) : (wr > 0 ? chest.clone().add(v3(0, -0.35, 0)) : null),
    handR: wr > 0 ? nib.clone().add(v3(0, 0.25, 0)) : null, headRoll: -0.35 * li, headYaw: 0.5 * li, headPitch: 0.5 * wr, glow: 0.8 + li, grip: { L: li > 0.5 ? 0.2 : 0.5, R: 0.9 }, lean: 0.06 + 0.08 * wr });
  if (wr > 0.1 && drop < 0.9) { W.quill.visible = true; W.quill.position.copy(nib); W.quill.rotation.set(-0.6, pm.rotation.y, 0.3); }
}
function poseWoodsKit(t, mode) {
  const E = EV, s = (i) => L(i).start, k = W.kit, pm = PM(), N = W.woods.newest.clone().add(WD);
  W.lanternOn = true;
  const card = W.card1; card.visible = true; card.write('MARIGOLD', 1);
  const KP = v3(N.x - 1.2, 0, N.z + 3.4);   // where Kit stands under the newest card
  if (mode === 'path') {   // L11: up the path with the flashlight
    const A = at(WD, 0.4, 0, 46), B = at(WD, 0.6, 0, 16), u = walkTo(k, A, B, s(11) - 0.3, s(12) + 0.9, t, 0.8, 'walk', 0.8);
    face(k, 'scared', t, 0.3); flash(k, t, k.root.position.clone().add(fwd(k, 12)).add(v3(Math.sin(t * 1.3) * 3, 2.5 + Math.sin(t * 0.9), 0)));
    card.position.copy(N); card.rotation.set(0, 0, 0); pm.visible = false; void u; return;
  }
  if (mode === 'reveal') {
    const A = at(WD, 0.6, 0, 16), u = smooth(s(12) - 0.2, E.newest - 0.3, t); place(k, lp3(A, KP, u), yawTo(A, KP), 0.8); pose(k, u > 0 && u < 1 ? 'walk' : 'idle', t * 0.8);
    const look = lp3(at(WD, -14, 12, -18), N, smooth(E.newest - 0.8, E.newest, t)); lookAtP(k, look, 0.9); face(k, t < E.newest ? 'surprised' : 'shocked', t, 0.3, { noBlink: t > E.newest });
    flash(k, t, look); card.position.copy(N); card.rotation.set(0, 0, 0.05); pm.visible = false; return;
  }
  // from the grab on: Kit under the string; the postman comes up behind him (from his left)
  place(k, KP, yawTo(KP, N), 0.8); pose(k, 'idle', t); k.root.updateMatrixWorld(true);
  const reach = smooth(E.grab - 0.3, E.grab + 0.4, t);
  const held = t > E.grab + 0.45;
  const handTgt = held ? H(k).add(fwd(k, 0.9)).add(v3(0, 0.7 - smooth(E.loom, E.loom + 0.8, t) * 2.3, 0)).add(side(k, -0.2)) : lp3(H(k).add(fwd(k, 0.5)).add(v3(0, -1.2, 0)), N.clone().add(v3(0, 0.25, 0)), reach);
  const PP = KP.clone().add(side(k, 3.2)).add(fwd(k, -1.4));
  const come = smooth(E.hand - 1.4, E.hand - 0.2, t);
  pm.visible = t > E.hand - 1.6; pm.position.copy(lp3(PP.clone().add(side(k, 6)).add(fwd(k, -4)), PP, come)); pm.rotation.set(0, yawTo(PP, KP) - 0.1, 0);
  const gripK = smooth(E.hand - 0.15, E.hand + 0.15, t);
  if (mode === 'grab' || mode === 'pm' || mode === 'kline') {
    aimArm(k, 1, handTgt, 1); const hp = handOf(k, 1);
    if (held) { card.position.copy(hp).add(v3(0, 0.45, 0)).add(fwd(k, 0.1)); card.rotation.set(0, k.root.rotation.y, 0); } else { card.position.copy(N); card.rotation.set(0, 0, 0.05); }
    const fear = t > E.hand; face(k, mode === 'kline' ? (t > s(15) + 0.25 ? 'angry' : 'focused') : fear ? 'terrified' : held ? 'happy' : 'focused', t, 0.3, { noBlink: fear && mode !== 'kline', viseme: talk(15, t) });
    lookAtP(k, fear ? pm.headWorld() : N, fear ? 0.95 : 0.8);
    if (fear) { k.torso.rotation.x = -0.12; }
    const spk = mode === 'pm' && t > s(14) && t < L(14).end ? 0.35 + 0.65 * Math.abs(Math.sin((t - s(14)) * 11)) * (Math.sin((t - s(14)) * 2.7) > -0.6 ? 1 : 0.1) : 0;
    pm.set(t, { walk: come > 0 && come < 1 ? t * 4 : null, handL: gripK > 0 ? hp.clone().add(v3(0, 0.1, 0)) : null, grip: { L: gripK, R: 0.2 }, headPitch: 0.62, headYaw: 0.15, mouth: spk, glow: mode === 'pm' ? 1.6 : 1.0, lean: 0.16 });
    flash(k, t, handTgt.clone().add(fwd(k, 4)).add(v3(0, mode === 'kline' ? -2.5 : 3, 0)), 0.5);
    return;
  }
  if (mode === 'write') {   // L16: at the stump: writes ELLIOT on a fresh card, then feeds Marigold's card to the lantern
    const D = W.woods.desk.clone().add(WD), LT = W.woods.lanternTop.clone().add(WD);
    const toDesk = smooth(s(16) - 0.4, s(16) + 0.3, t), atLamp = smooth(E.feed - 0.5, E.feed + 0.1, t);
    const KD = D.clone().setY(0).add(v3(1.6, 0, 2.6)), KL = LT.clone().setY(0).add(v3(-1.4, 0, 2.4));
    const Kp = lp3(lp3(KP, KD, toDesk), KL, atLamp); place(k, Kp, atLamp > 0.5 ? yawTo(KL, LT) : yawTo(KD, D), 0.8); pose(k, (toDesk > 0 && toDesk < 1) || (atLamp > 0 && atLamp < 1) ? 'walk' : 'idle', t);
    const c2 = W.card2; c2.visible = true; const wk = clamp((t - s(16) - 0.35) / 1.4);
    c2.position.copy(D).add(v3(0.1, 0.06, 0.4)); c2.rotation.set(-Math.PI / 2, 0, 0.15); c2.write('', 0, { second: 'Elliot', k2: wk });
    if (atLamp < 0.5) { const nib = c2.position.clone().add(v3(-0.55 + wk * 1.1, 0.05, 0.2 + Math.sin(t * 28) * 0.03)); aimArm(k, 1, nib.clone().add(v3(0, 0.2, 0)), 1); W.quill.visible = true; W.quill.position.copy(nib); W.quill.rotation.set(0.5, 0.4, -0.3);
      aimArm(k, 0, D.clone().add(v3(-0.6, 0.2, 0.3)), 1); card.position.copy(handOf(k, 0)).add(v3(0, 0.1, 0)); card.rotation.set(-1.2, 0.3, 0); face(k, 'focused', t, 0.3); lookAtP(k, c2.position, 0.9); }
    else { const into = smooth(E.flare - 0.35, E.flare, t); const cp = lp3(H(k).add(fwd(k, 1.2)).add(v3(0, -0.6, 0)), LT.clone().add(v3(0, -0.5, 0)), into); aimArm(k, 1, cp.clone().add(v3(0, -0.2, 0)), 1);
      card.position.copy(cp); card.rotation.set(0, k.root.rotation.y + Math.PI, 0.3); const burn = clamp((t - E.flare) / 0.7); card.write('MARIGOLD', 1, { burn }); card.scale.setScalar(1 - smooth(E.flare + 0.3, E.flare + 0.9, t)); card.visible = card.scale.x > 0.02;
      face(k, t > E.flare + 0.1 ? 'surprised' : 'focused', t, 0.3); lookAtP(k, LT, 0.8); }
    W.flare.update(t); W.lanternBoost = Math.max(0, 1 - Math.abs(t - E.flare - 0.2) / 0.6);
    // the postman lets go, straightens up and watches
    const PPw = KP.clone().add(side(k, 3.2)).add(fwd(k, -1.4)); pm.visible = true; pm.position.copy(PPw); pm.rotation.set(0, yawTo(PPw, Kp), 0);
    pm.set(t, { headPitch: 0.45, headYaw: 0, glow: 1.0 + W.lanternBoost, grip: { L: 0.2, R: 0.2 }, lean: 0.08 });
    return;
  }
  if (mode === 'tip') {   // L17: the postman tips his cap; Kit holds up his own card
    const LT = W.woods.lanternTop.clone().add(WD), KL = LT.clone().setY(0).add(v3(-1.4, 0, 2.4));
    const PPw = KP.clone().add(side(k, 3.2)).add(fwd(k, -1.4)); pm.visible = true; pm.position.copy(PPw);
    place(k, KL, yawTo(KL, PPw), 0.8); pose(k, 'idle', t); face(k, t > E.tip + 0.6 ? 'happy' : 'nervous', t, 0.3); lookAtP(k, pm.headWorld(), 0.9);
    pm.rotation.set(0, yawTo(PPw, KL), 0); pm.updateMatrixWorld(true);
    const tip = smooth(E.tip, E.tip + 0.35, t) * (1 - smooth(E.tip + 0.9, E.tip + 1.25, t));
    const capP = pm.headWorld().add(v3(0, 1.0, 0)).add(v3(Math.sin(pm.rotation.y), 0, Math.cos(pm.rotation.y)).multiplyScalar(0.8));
    const c2 = W.card2; c2.visible = true; c2.write('', 0, { second: 'Elliot', k2: 1 });
    pm.set(t, { handR: tip > 0.02 ? lp3(pm.position.clone().add(v3(0, 5.5, 0)), capP, Math.min(1, tip * 1.4)) : null, cap: tip, headPitch: 0.5 + 0.2 * tip, glow: 1.0, grip: { L: 0.7, R: 0.6 },
      handL: v3(0, 7.2, 1.6).applyMatrix4(pm.matrixWorld) });
    c2.position.copy(pm.handPos[0]).add(v3(0, 0.3, 0)); c2.rotation.set(0, pm.rotation.y, 0);
    W.flare.update(t); W.lanternBoost = 0;
  }
}

// ================= the kitchen =================
function poseKitchen(t) {
  const E = EV, s = (i) => L(i).start, sp = W.sparrow, m = W.mom, b = W.baby, k = W.kit, R = W.kit2, TB = R.table.clone().add(KT);
  const ch0 = R.chairs[0]; const seat = KT.clone().add(ch0.position).add(v3(0, 2.48, 0));
  sitOn(sp, seat, 0, 0.9); face(sp, 'happy', t, 0.4); sp.root.updateMatrixWorld(true);
  aimArm(sp, 1, TB.clone().add(v3(-2 + 0.2, 4.2, 0.4 + Math.sin(t * 2) * 0.1)), 0.9); aimArm(sp, 0, TB.clone().add(v3(-2 - 0.9, 3.9, 0.2)), 0.7);
  W.fork.visible = true; W.fork.position.copy(handOf(sp, 1)); W.fork.rotation.set(0.8, 0, 0);
  // Mom behind her, braiding
  const MP = seat.clone().setY(0).add(v3(0.2, 0, -2.6)); place(m, MP, 0.05, 1); pose(m, 'idle', t);
  const hb = H(sp).add(v3(0, -0.3, -0.9)); const w1 = Math.sin(t * 5) * 0.25;
  aimArm(m, 0, hb.clone().add(v3(0.4, w1, 0)), 1); aimArm(m, 1, hb.clone().add(v3(-0.4, -w1, 0)), 1);
  W.braid.visible = true; W.braid.position.copy(hb).add(v3(0, -0.4, -0.15)); W.braid.scale.y = 0.6 + 0.4 * smooth(s(18), s(19), t);
  // the baby in the high chair
  const hc = R.highChair; sitOn(b, KT.clone().add(hc.position).add(v3(0, hc.seatY, 0)), -Math.PI / 2, 0.42); face(b, 'happy', t, 0.2); aimArm(b, 0, H(b).add(v3(-1, 0.8, 0.3)), 0.7 * (0.5 + 0.5 * Math.sin(t * 4)));
  // Kit at the back door
  const D0 = KT.clone().add(v3(21, 0, R.doorZ)), D1 = KT.clone().add(v3(14.5, 0, R.doorZ + 0.4));
  const u = walkTo(k, D0, D1, E.enter - 0.2, E.enter + 1.1, t, 0.8, 'walk', 0.8); if (u >= 1) k.root.rotation.y = yawTo(D1, TB); R.door.rotation.y = -1.4 * smooth(E.enter - 0.5, E.enter, t);
  face(k, t > E.blank + 0.5 ? 'sad' : 'nervous', t, 0.3); lookAtP(k, t > E.blank ? H(sp) : H(m), 0.8);
  if (t > E.enter + 0.6 && t < E.lost) { face(k, 'happy', t, 0.3); }
  if (t > E.lost - 0.3) {
    lookAtP(m, H(k), 0.95); face(m, 'happy', t, 0.5, { viseme: talk(19, t) }); W.braid.scale.y = 1;
    if (t > E.blank) { lookAtP(sp, H(k), 0.9); face(sp, 'neutral', t, 0.5); }
    if (t > s(19) + 0.2) { aimArm(m, 1, H(m).add(fwd(m, 1.0)).add(side(m, -0.9)).add(v3(0, -2.2, 0)), 0.6); }
  } else { lookAtP(m, hb, 0.7); face(m, 'happy', t, 0.5); }
}

// ---- shots ----
function camOn(c, dist, ang = 0, dy = 0, lookDy = -0.7, fov = 54) { const h = H(c), a = c.root.rotation.y + ang * Math.PI / 180, s = SC(c); return { pos: h.clone().add(v3(Math.sin(a) * dist, dy, Math.cos(a) * dist)), look: h.clone().add(v3(0, lookDy * s, 0)), fov }; }
function two(a, b, dist, sgn = 1, dy = 0.4, fov = 58, bias = 0) { const ha = H(a), hb = H(b), mid = lp3(ha, hb, 0.5), d = hb.clone().sub(ha).setY(0).normalize(), pp = v3(d.z, 0, -d.x).multiplyScalar(sgn); return { pos: mid.clone().add(pp.multiplyScalar(dist)).add(d.multiplyScalar(-bias)).add(v3(0, dy, 0)), look: mid.clone().add(v3(0, -0.9, 0)), fov }; }
function shots() {
  const s = (i) => L(i).start, e = (i) => L(i).end, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  // L0 Birchwater: name tags
  add('walk', 0, (u) => ({ pos: lp3(at(BW, 31.5, 4.4, -8.4), at(BW, 30.5, 4.2, -8.6), u), look: at(BW, 41.0, 3.2, -12.8), fov: 54 }));
  // L1 Snips
  add('barber', s(1) - 0.05, (u) => ({ pos: lp3(at(BW, -3.0, 4.6, 9.0), at(BW, -3.4, 4.8, 10.2), easeInOut(u)), look: at(BW, -5.5, 5.6, 22.5), fov: 58 }));
  // L2-3 the postman in the birches
  add('woods', s(2) - 0.05, (u) => ({ pos: lp3(at(WD, 6.0, 3.0, 24), at(WD, 4.6, 3.6, 19.5), easeInOut(u)), look: at(WD, -6, 7.2, 0), fov: 50 }));
  add('listen', s(3) - 0.05, (u) => { const h = PM().headWorld(); return { pos: h.clone().add(v3(4.2 - u * 0.4, -0.9, 6.0)), look: h.clone().add(v3(0, -0.8, 0)), fov: 50 }; });
  add('ned', s(3) + 1.75, (u) => { const c = W.card0.position, y = PM().rotation.y, f = v3(Math.sin(y), 0, Math.cos(y)); return { pos: c.clone().add(f.multiplyScalar(2.6 - u * 0.3)).add(v3(0, 3.0, 0)), look: c.clone().add(v3(0, 0.2, 0)), fov: 46 }; });
  // L4 the Sunday yard
  add('yard', s(4) - 0.05, (u) => ({ pos: lp3(at(BW, 23.5, 4.4, -11.5), at(BW, 22.5, 4.2, -12.5), u), look: at(BW, 14.5, 3.2, -22.5), fov: 60 }));
  // L5 the van on the hill; the trike in the road
  add('hill', s(5) - 0.05, (u) => { const x = vanX(Math.max(EV.vanGo, s(5) + u * 1.7)); return { pos: at(BW, -44, hY(-44) + 3.4, 9), look: at(BW, x + 2, hY(x) + 2.6, VZ), fov: 46 }; });
  add('trike', E.trikeShot, (u) => ({ pos: lp3(at(BW, 27.8, 3.6, -3.2), at(BW, 27.4, 3.5, -3.6), u), look: at(BW, 24.4, 1.8, -6.4), fov: 44 }));
  // L6 the save
  add('save', E.run0 - 0.05, (u) => ({ pos: lp3(at(BW, 27.5, 6.5, -26), at(BW, 27, 6.2, -25), u), look: at(BW, 21, 1.6, -10), fov: 62 }));
  add('safe', E.safe - 0.1, (u) => camOn(W.sparrow, 7.5 - u * 0.5, 20, 1.2, -1.6, 54));
  // L7 the scream
  add('scream', s(7) - 0.12, (u) => camOn(W.mom, 7.0 - u * 1.2, 18, -0.2, -0.8, 54));
  // L8 the quill at the woods' edge
  add('edge', s(8) - 0.05, (u) => ({ pos: lp3(at(BW, 28, 4.2, -26), at(BW, 29.5, 4.4, -26.6), u), look: at(BW, 55, 8.2, -31), fov: 44 }));
  add('quill', E.quill, (u) => { const c = W.card1.position, y = PM().rotation.y, f = v3(Math.sin(y), 0, Math.cos(y)); return { pos: c.clone().add(f.multiplyScalar(2.6 - u * 0.3)).add(v3(0, 3.0, 0)), look: c.clone().add(v3(0, 0.2, 0)), fov: 44 }; });
  // L9 Mom goes cold
  add('cold', s(9) - 0.08, (u) => camOn(W.mom, 6.4 - u * 0.4, -24, 0.2, -0.8, 54));
  add('put', E.put - 0.05, (u) => camOn(W.mom, 7.6 - u * 0.4, -35, -1.0, -1.2, 60));
  // L10 Kit remembers
  add('kit', s(10) - 0.05, (u) => (() => { const h = H(W.kit), d = at(BW, 19, 0, -15).sub(h).setY(0).normalize(); return { pos: h.clone().add(d.multiplyScalar(6.2 - u * 0.5)).add(side(W.kit, 0)).add(v3(0, -0.3, 0)), look: h.clone().add(v3(0, -0.9, 0)), fov: 56 }; })());
  add('ears', E.mowing - 0.05, (u) => camOn(W.kit, 4.6 - u * 0.3, 52, 0.4, -0.6, 50));
  // L11 the path at night
  add('path', s(11) - 0.05, (u) => { const h = H(W.kit); return { pos: h.clone().add(v3(1.4, 0.4, -7.5 + u * 0.4)), look: h.clone().add(v3(0, -0.4, 0)), fov: 56 }; });
  // L12 the postcards
  add('reveal', s(12) - 0.05, (u) => ({ pos: lp3(at(WD, -9, 5.0, 19), at(WD, -7.6, 5.4, 19.6), easeInOut(u)), look: lp3(at(WD, 0, 7.5, -6), at(WD, -3, 9.0, -14), easeInOut(u)), fov: 60 }));
  add('newest', E.newest - 0.1, (u) => { const N = W.woods.newest.clone().add(WD), h = H(W.kit); return { pos: N.clone().add(v3(3.4 - u * 0.3, -0.4, 5.4)), look: lp3(N, h, 0.5).add(v3(0, -0.3, 0)), fov: 52 }; });
  // L13 the grab, the hand
  add('grab', s(13) - 0.05, (u) => { const N = W.woods.newest.clone().add(WD), h = H(W.kit); return { pos: N.clone().add(v3(3.6, -0.6, 5.2 - u * 0.5)), look: lp3(N, h, 0.5).add(v3(0, -0.3, 0)), fov: 52 }; });
  add('wrist', E.hand - 0.1, (u) => { const hp = handOf(W.kit, 1); return { pos: hp.clone().add(v3(2.4, 0.4, 2.0 - u * 0.2)), look: hp.clone().add(v3(-0.3, 0.1, 0)), fov: 46 }; });
  add('loom', E.loom, (u) => { const h = H(W.kit), f = fwd(W.kit); return { pos: h.clone().add(f.clone().multiplyScalar(5.4)).add(side(W.kit, -1.6)).add(v3(0, -1.2, 0)), look: lp3(h, PM().headWorld(), 0.62), fov: 62 }; });
  // L14 the postman speaks (low, past Kit)
  add('pm', s(14) - 0.05, (u) => { const ph = PM().headWorld(), h = H(W.kit), d = h.clone().sub(ph).setY(0).normalize(); return { pos: h.clone().add(d.multiplyScalar(2.2)).add(side(W.kit, -1.4)).add(v3(0, -0.6 + u * 0.2, 0)), look: ph.clone().add(v3(0, -1.0, 0)), fov: 56 }; });
  // L15 Kit answers
  add('kline', s(15) - 0.05, (u) => (() => { const h = H(W.kit), d = PM().headWorld().sub(h).setY(0).normalize().add(fwd(W.kit, 1.3)).normalize(); return { pos: h.clone().add(d.multiplyScalar(7.0 - u * 0.4)).add(v3(0, -0.6, 0)), look: h.clone().add(v3(0, -0.7, 0)), fov: 54 }; })());
  // L16 he writes his own name; Marigold's card into the lantern
  add('write', s(16) - 0.05, (u) => { const c = W.card2.position; return { pos: c.clone().add(v3(2.0, 3.0, 3.2)), look: c.clone().add(v3(0.4, 0.6, 0)), fov: 46 }; });
  add('burn', E.feed - 0.05, (u) => { const LT = W.woods.lanternTop.clone().add(WD); return { pos: LT.clone().add(v3(4.2 - u * 0.3, 0.8, -2.1)), look: lp3(LT, H(W.kit), 0.6).add(v3(0, -0.4, 0)), fov: 56 }; });
  // L17 he tips his cap
  add('tip', s(17) - 0.05, (u) => { const P0 = PM().position, K = W.kit.root.position, mid = lp3(P0, K, 0.5), d = K.clone().sub(P0).setY(0).normalize(); return { pos: mid.clone().add(v3(d.z, 0, -d.x).multiplyScalar(-15)).add(v3(0, 5.6, 0)), look: mid.clone().add(v3(0, 5.4, 0)), fov: 56 }; });
  // L18-19 the kitchen at sunrise
  add('kitchen', s(18) - 0.05, (u) => ({ pos: lp3(at(KT, 3.5, 8.4, 10.5), at(KT, 2.8, 8.0, 9.4), easeInOut(u)), look: at(KT, -2.0, 4.6, -1.4), fov: 56 }));
  add('lost', E.lost - 0.08, (u) => camOn(W.mom, 5.6 - u * 0.3, 72, 1.4, -1.0, 54));
  add('blank', E.blank, (u) => camOn(W.sparrow, 4.8, 50, 0.6, -0.7, 50));
  add('kitsad', e(19) - 0.25, (u) => camOn(W.kit, 4.8 - u * 0.3, 0, 0.6, -0.6, 50));
  // L20-21 the treehouse at dusk
  add('tree', s(20) - 0.05, (u) => ({ pos: lp3(at(BW, TREE.x + 17, 6.0, TREE.z + 30), at(BW, TREE.x + 15, 7.0, TREE.z + 28), easeInOut(u)), look: at(BW, TREE.x + 0.5, 9.5, TREE.z + 4), fov: 60 }));
  add('cocoa', E.place - 0.15, (u) => camOn(W.sparrow, 5.6 - u * 0.4, 28, 1.0, -1.4, 52));
  add('door', s(21) - 0.05, (u) => camOn(W.kit, 5.4 - u * 0.4, 10, -0.4, -0.5, 52));
  add('end', E.endW + 0.3, (u) => ({ pos: lp3(at(BW, TREE.x + 13, 9, TREE.z + 34), at(BW, TREE.x + 11, 13, TREE.z + 31), easeInOut(u)), look: at(BW, TREE.x + 2, 9.0, TREE.z + 6), fov: 60 }));
  Sx.sort((a, b) => a.t0() - b.t0());
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
const KEYS = { walk: 'walk', barber: 'barber', woods: 'wintro', listen: 'wintro', ned: 'wintro', yard: 'yard', hill: 'hill', trike: 'hill', save: 'save', safe: 'save', scream: 'scream',
  edge: 'edge', quill: 'edge', cold: 'cold', put: 'cold', kit: 'kit', ears: 'kit', path: 'path', reveal: 'reveal', newest: 'reveal', grab: 'grab', wrist: 'grab', loom: 'grab', pm: 'pm', kline: 'kline',
  write: 'write', burn: 'write', tip: 'tip', kitchen: 'kitchen', lost: 'kitchen', blank: 'kitchen', kitsad: 'kitchen', tree: 'tree', cocoa: 'tree', door: 'tree', end: 'tree' };
const SET = { walk: 'bw', barber: 'bw', wintro: 'wd', yard: 'bw', hill: 'bw', save: 'bw', scream: 'bw', edge: 'bw', cold: 'bw', kit: 'bw', path: 'wd', reveal: 'wd', grab: 'wd', pm: 'wd', kline: 'wd', write: 'wd', tip: 'wd', kitchen: 'kt', tree: 'bwd' };

function renderAt(t) {
  let sh = shotAt(W.shots, t); const key = KEYS[sh.name], set = SET[key];
  applyEnv(ctx, { bw: SUN, bwd: DUSKY, wd: NIGHTW, kt: MORN }[set]);
  const room = set.slice(0, 2);
  W.town.visible = room === 'bw'; W.woods.visible = room === 'wd'; W.kit2.visible = room === 'kt';
  W.pt.forEach((l) => { l.intensity = l.userData.set === room ? l.userData.I : 0; });
  hideAll(); PM().visible = false;
  for (const k of ['van', 'trike', 'mower', 'quill', 'scissors', 'card0', 'card1', 'card2', 'flash', 'cone', 'mug', 'therm', 'fork', 'braid', 'plate']) W[k].visible = false;
  W.beam.visible = false; W.beam.intensity = 0; Object.values(W.tags).forEach((g) => { g.visible = false; });
  W.card0.scale.setScalar(1); W.card1.scale.setScalar(1); W.lanternBoost = 0; W.ear.visible = key === 'yard' || key === 'hill' || key === 'save' || key === 'cold' || key === 'kit';
  W.pmLight.intensity = room === 'wd' ? 40 : 18; W.pmLight.color.set(room === 'wd' ? '#b8c8ff' : '#fff2e0');
  leafTime(t, 0.04); W.leaves.update(t); W.leaves.visible = room === 'bw';
  W.town.pole.material.map.offset.y = -t * 0.35;
  ({ walk: () => poseWalk(t), barber: () => poseBarber(t), wintro: () => poseWoodsIntro(t), yard: () => { poseTrike(t); poseYard(t); poseVan(t); },
    hill: () => { poseTrike(t); poseYard(t); poseVan(t); }, save: () => { poseYard(t, { save: 1 }); poseSave(t); poseVan(t); },
    scream: () => { poseScream(t); poseVan(t); }, edge: () => postmanEdge(t), cold: () => { poseCold(t); poseYard(t, { save: 1 }); }, kit: () => { poseYard(t, { kit: 1, save: 1 }); poseCold(t); },
    path: () => poseWoodsKit(t, 'path'), reveal: () => poseWoodsKit(t, 'reveal'), grab: () => poseWoodsKit(t, 'grab'), pm: () => poseWoodsKit(t, 'pm'), kline: () => poseWoodsKit(t, 'kline'),
    write: () => poseWoodsKit(t, 'write'), tip: () => poseWoodsKit(t, 'tip'), kitchen: () => poseKitchen(t), tree: () => poseTreehouse(t) })[key]();
  if (room === 'kt') { W.plate.visible = true; }
  if (room === 'wd') { W.woods.strings.set(t); const ln = W.woods.lantern; ln.glass.material.emissiveIntensity = 1.8 + W.lanternBoost * 6; ln.glass.material.emissive.set(W.lanternBoost > 0.05 ? '#5fc8ff' : '#ffa040'); if (ln.light) { ln.light.intensity = 36 + W.lanternBoost * 220; ln.light.color.set(W.lanternBoost > 0.05 ? '#7fd0ff' : '#ffb060'); } }
  W.flare.update(t);
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  if (Q.get('dbgpos')) console.error('t', t, sh.name, 'cam', sh.pos.toArray().map((x) => x.toFixed(1)).join(','), W.all.filter((c) => c.root.visible).map((c) => c.key + '@' + c.root.position.toArray().map((x) => x.toFixed(1)).join(',')).join(' | '));
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2 * SC(c), 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * SC(c); c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2] * SC(c), Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  if (ctx.thumbMode) { const ph = PM().headWorld(), h = H(W.kit), d = h.clone().sub(ph).setY(0).normalize(); sh = { ...sh, pos: h.clone().add(d.multiplyScalar(+(Q.get('td') || 3.2))).add(side(W.kit, +(Q.get('ts') || -1.6))).add(v3(0, -0.8, 0)), look: ph.clone().add(v3(0, +(Q.get('tl') || 1.2), 0)), fov: +(Q.get('tf') || 64) }; }
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  const E = EV;
  frame(ctx, t, sh, { steady: t < 2.4 || Q.get('steady') === '1', shake: Math.max(0, 1 - Math.abs(t - E.vanPass) / 0.35) * 0.8, shadowSpan: room === 'bw' ? 70 : 45, shadows: true, black: 0,
    flash: Math.max(0, 1 - Math.abs(t - E.flare - 0.15) / 0.25) * 0.35 + Math.max(0, 1 - Math.abs(t - E.cold - 0.25) / 0.2) * 0.25, flashColor: t > E.write2 ? '#bfe8ff' : '#ffffff' });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep109', { look: 'pro', avatars: [...new Set(Object.values(AV).map((a) => a[0]))] }); L = ctx.L;
  try { CAP = (await (await fetch('/build/ep109/timeline.json')).json()).captions || []; } catch (e) { CAP = []; }
  EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'grin', 'focused', 'shocked', 'surprised', 'nervous', 'scared', 'terrified', 'angry', 'skeptic', 'pain', 'blink']);
  const { scene, camera } = ctx; camera.far = 2600; camera.near = 0.1; camera.updateProjectionMatrix();
  W.town = birchwater(); W.town.position.copy(BW); scene.add(W.town);
  W.woods = nightWoods(); W.woods.position.copy(WD); scene.add(W.woods);
  W.kit2 = kitchen(); W.kit2.position.copy(KT); scene.add(W.kit2);
  W.pm = postman(); scene.add(W.pm); W.pmLight = new THREE.PointLight('#b8c8ff', 40, 14, 1.4); W.pmLight.position.set(0, 10.4, 4.5); W.pm.add(W.pmLight);
  W.van = van(); scene.add(W.van); W.trike = trike(); scene.add(W.trike); W.mower = mower(); scene.add(W.mower);
  W.quill = quill(); scene.add(W.quill);
  W.card0 = postcard({ w: 1.5 }); scene.add(W.card0); W.card1 = postcard({ w: 1.5, glow: 0.25 }); scene.add(W.card1); W.card2 = postcard({ w: 1.5 }); scene.add(W.card2);
  W.mug = mugOf('#ffd23f'); scene.add(W.mug); W.therm = thermos(); scene.add(W.therm);
  W.plate = wafflePlate(); W.plate.position.copy(at(KT, -2.0, 3.84, 1.0)); scene.add(W.plate);
  W.fork = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 1.0), new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 0.8, roughness: 0.3 })); scene.add(W.fork);
  // scissors: two blades on a pivot
  W.scissors = new THREE.Group(); W.scissors.blades = [0, 1].map((i) => { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.04), new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 0.9, roughness: 0.2 })); m.position.y = 0.4; g.add(m); const r = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 12), new THREE.MeshStandardMaterial({ color: i ? '#e8433a' : '#2f5aa8' })); r.position.y = -0.2; g.add(r); W.scissors.add(g); return g; }); scene.add(W.scissors);
  // the braid: a chain of beads down Sparrow's back
  W.braid = new THREE.Group(); for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.2 - i * 0.012, 10, 8).scale(1, 1.3, 1), new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.7 })); m.position.set((i % 2 ? 0.05 : -0.05), -i * 0.3, 0); W.braid.add(m); } scene.add(W.braid);
  // flashlight, beam, glow cone
  W.flash = flashlightProp(); W.flash.scale.setScalar(0.6); scene.add(W.flash);
  W.beam = new THREE.SpotLight('#fff1d0', 0, 60, 0.42, 0.55, 1.3); W.beam.castShadow = false; scene.add(W.beam); scene.add(W.beam.target);
  { const g = new THREE.ConeGeometry(2.2, 14, 24, 1, true); g.translate(0, -7, 0); g.rotateX(-Math.PI / 2); W.cone = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#fff4d8', transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); W.cone.userData.noAO = true; scene.add(W.cone); }
  W.flare = burst(scene, { count: 140, color: '#7fd0ff', height: 1.5, spread: 1.0, dur: 1.3, bright: 2.2, pointSize: 0.5, seed: 4 });
  W.leaves = leaves(scene, { count: 220, size: 90, height: 30, centre: at(BW, 18, 15, -18), colors: ['#e2a62a', '#ffd45a', '#c98a1e', '#f0b840'], speed: 0.6 });
  W.steam = glowSprite('#ffffff', 0.8, 0.0); scene.add(W.steam);
  const PL = (c, I, d, set, p) => { const l = new THREE.PointLight(c, I, d, 1.5); if (p) l.position.copy(p); l.userData.I = I; l.userData.set = set; scene.add(l); return l; };
  W.pt = [PL('#ffe2b8', 180, 40, 'kt', at(KT, -2, 11, 4)), PL('#ffd09a', 120, 34, 'kt', at(KT, 12, 9, -4)), PL('#8fa8ff', 60, 70, 'wd', at(WD, -10, 22, -20))];
  people();
  W.earX = W.ear.position.x;
  W.flare.position.copy(W.woods.lanternTop.clone().add(WD).add(v3(0, -0.6, 0))); W.flare.fire(EV.flare);
  W.shots = shots();
  window.__ep109 = { W, THREE, ctx, L, EV };
  return expose(ctx, renderAt, EV.pm + 0.9, EV);
}
