// Flower Man remake 8: The Smallest Kid. In Fernbrook every thank-you said to your face makes you one inch taller: crossing guards duck
// under streetlights, greedy people stay pocket-sized. Milo is thirteen and needs a stool to reach the fountain; everyone calls him
// selfish, even his best friend June. But the school has a Phantom (tyres pumped overnight, lost homework returned with a note). June
// spots bike grease on his fingers, follows him behind the gym and finds him fixing the new girl's bike chain: "It's you! You're the
// Phantom!" His grandpa said help that waits for a thank-you is just shopping, so Milo helps unseen and stays small. "Please don't tell
// anyone." June doesn't tell: she hangs a giant photo over the front doors. Nadia thanks him first; then a whole hallway does, and he
// grows past the principal until his head bumps the lights. He kneels down to June: "You told them. Thank you, June." She grows one inch.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DAY } from '../engine/stage.js';
import { sparkles, burst } from '../engine/atmos.js';
import { lamp } from '../engine/kit.js';
import { jointify } from '../engine/infinitetower.js';
import { FARM } from '../engine/farm_cast.js';
import { ladder } from '../engine/dontpicture.js';
import { fernStreet, schoolHall, HALL, gymBack, GYM, bike, stopPaddle, moneyBag, homework, wrench, pump, appleBasket, toolbox, greaseOn, stickyNote } from '../engine/smallestkid.js';

const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV, CAP = [];
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const AV = {
  milo: ['farm_noah', 1], june: ['farm_danielle', 0.86], nadia: ['farm_nia', 0.86], granny: ['farm_grandma', 1], helper: ['farm_young_kid', 0.8],
  guard: ['farm_police_sergeant', 1.9], greedy: ['farm_bacon_dad_suit', 0.36], grandpa: ['farm_grandpa', 1], principal: ['farm_principal', 1.02],
  c1: ['farm_lily', 0.78], c2: ['farm_sam', 0.8],
  flat: ['farm_red_kid', 0.84], hw: ['farm_oliver', 0.84], k1: ['farm_jake_blue', 0.86], k2: ['farm_lily_pink', 0.84], k3: ['farm_zoe', 0.84], k4: ['farm_leo', 0.86],
  k5: ['farm_kai', 0.86], k6: ['farm_ava', 0.84], k7: ['farm_ethan', 0.86], k8: ['farm_emma_obby', 0.84], k9: ['farm_daniel', 0.86], k10: ['farm_hc_eli', 0.86],
};
for (const k of ['milo', 'june', 'nadia']) if (Q.get(k)) AV[k][0] = Q.get(k);
const LINEUP = Q.get('lineup') ? Q.get('lineup').split(',') : null;
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';

// the sets, far apart
const ST = v3(-1500, 0, 0), HL = v3(1500, 0, 0), GY = v3(0, 0, 1500);
const at = (o, x, y, z) => o.clone().add(v3(x, y, z));
const SW = 0.3;   // sidewalk top

const SUN = { ...DAY, ...P({ top: '#2f93ee', horizon: '#d2efff', haze: '#d2efff', sunColor: '#fff2d8', hemiSky: '#d6edff', hemiGround: '#cfe0a4' }), sunDir: v3(0.45, 0.78, 0.5), sunI: 2.2, sunDisc: 0, hemiI: 1.15, amb: 0.3, envI: 1.0, exposure: 1.0, bloom: 0.03, vig: 0, saturation: 1.22, contrast: 1.05, bounce: 0.18, fogNear: 260, fogFar: 1000, stars: 0, moon: 0, win: 0, lamp: 0 };
const DAWN = { ...SUN, ...P({ top: '#6f8fd8', horizon: '#ffc9a8', haze: '#ffd6c0', sunColor: '#ffc89a', hemiSky: '#d8d0ff', hemiGround: '#b8a890' }), sunDir: v3(-0.8, 0.32, 0.5), sunI: 1.9, hemiI: 0.95, exposure: 1.02, saturation: 1.18 };
const DUSK = { ...SUN, ...P({ top: '#5a6fd0', horizon: '#ffb070', haze: '#ffc090', sunColor: '#ffb070', hemiSky: '#ffd8b0', hemiGround: '#a89070' }), sunDir: v3(-0.7, 0.28, 0.45), sunI: 2.0, hemiI: 1.0, exposure: 1.04, saturation: 1.12, win: 0.6, lamp: 1 };
const HALLE = { ...SUN, ...P({ top: '#fff1dc', horizon: '#fff1dc', haze: '#fff1dc', sunColor: '#fff4e2', hemiSky: '#fffaf0', hemiGround: '#d8c4a0' }), sunDir: v3(0.18, 1, 0.22), sunI: 1.1, hemiI: 1.0, amb: 0.3, envI: 0.65, exposure: 0.82, saturation: 1.2, fogNear: 400, fogFar: 1400 };
const HALLEVE = { ...HALLE, ...P({ sunColor: '#ffbe7a', hemiSky: '#ffd9b0', hemiGround: '#a08060' }), sunDir: v3(0.05, 0.5, -0.86), sunI: 1.3, hemiI: 0.85, amb: 0.3, exposure: 1.02 };

const capT = (word, after = 0) => { const c = CAP.find((x) => x.start >= after - 0.01 && x.text.toUpperCase().includes(word)); return c ? c.start : after; };
function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return { pop0: capT('INCH TALLER') + 0.2, duck: s(1) + 0.5, greedy: capT('STREETLIGHTS', s(1)) + 0.55, pump: capT('TIRES', s(4)), hw: capT('LOST HOMEWORK', s(4)) - 0.15,
    grease: capT('GREASE', s(5)) - 0.05, fix: capT('HE WAS FIXING', s(6)) - 0.1, chain: capT('BIKE CHAIN', s(6)) + 0.3, you: s(7), phantom: capT('PHANTOM', s(7)),
    flash: s(8), unseen: s(9), please: s(10), didnt: s(11), hung: capT('SHE HUNG', s(11)), enter: e(11) - 0.7, nadia: s(12),
    inch: capT('ONE INCH', s(13)) + 0.15, flat: capT('FLAT-TIRE', s(13)) + 0.15, hwk: capT('HOMEWORK KID', s(13)) + 0.2, line: capT('WHOLE HALLWAY', s(13)) - 0.4,
    princ: s(14) - 0.05, bump: capT('THE LIGHTS', s(14)) - 0.35, kneel: s(15) + 0.05, told: s(16), tyj: capT('THANK YOU, JUNE', s(16)), jgrow: s(17) + 0.7, end: ctx.dur };
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
const talk = (i, t, txt) => (t > L(i).start && t < L(i).end ? visemeAt(txt || L(i).text, L(i).start, L(i).end, t) : undefined);
const say = (txt, t0, t1, t) => (t > t0 && t < t1 ? visemeAt(txt, t0, t1, t) : undefined);
function lookAtP(c, p, k = 1) { c.root.updateMatrixWorld(true); const n = c.neck.getWorldPosition(v3()), a = wrap(yawTo(n, p) - c.root.rotation.y); c.neck.rotation.y = clamp(a, -1.2, 1.2) * k; c.neck.rotation.x = -Math.atan2(p.y - n.y - 0.6 * SC(c), Math.hypot(p.x - n.x, p.z - n.z)) * 0.6 * k; }
function walkTo(c, a, b, t0, t1, t, speed = 1, kind = 'walk', size = 1) { const u = clamp((t - t0) / (t1 - t0)); place(c, lp3(a, b, u), yawTo(a, b), size); pose(c, u > 0 && u < 1 ? kind : 'idle', t * speed); return u; }
const fwd = (c, d = 1) => v3(Math.sin(c.root.rotation.y), 0, Math.cos(c.root.rotation.y)).multiplyScalar(d);
const side = (c, d = 1) => { const f = fwd(c); return v3(f.z, 0, -f.x).multiplyScalar(d); };   // the character's left
function kneel(c, k) {   // sit back on the heels, lean forward
  const h0 = c.hipY ?? 2; c.hips.position.y = lerp(h0, h0 * 0.36, k);
  c.legs.forEach((l, i) => { l.rotation.x = -1.3 * k; if (c.knee) c.knee[i].rotation.x = 2.45 * k; });
}
const popK = (t, t0, d = 0.28) => { const u = clamp((t - t0) / d); return u <= 0 ? 0 : u >= 1 ? 1 : easeOut(u) + Math.sin(u * Math.PI) * 0.25; };

// ---- people ----
function people() {
  for (const [k, [avatar, scale]] of Object.entries(AV)) {
    const c = makeCharacter({ avatar, alti: true, skin: skinOf(avatar), caustic: false, scale });
    ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c.key = k;
    c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c);
    W[k] = c;
  }
  W.all = Object.keys(AV).map((k) => W[k]);
  W.kids = ['flat', 'hw', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k10'].map((k) => W[k]);
  W.grease = greaseOn(W.milo, 0, armLen(W.milo)); W.grease2 = greaseOn(W.milo, 1, armLen(W.milo));
  // Milo's standing height at size 1
  { const c = W.milo; place(c, v3(0, 0, 0), 0); c.root.updateMatrixWorld(true); const bx = new THREE.Box3(); c.root.traverse((o) => { if (o.isMesh && !o.userData.worn) bx.expandByObject(o); }); W.miloH = bx.max.y; c.root.visible = false; }
}
function hideAll() { W.all.forEach((c) => { c.root.visible = false; }); }

// Milo's size by time (1 = a grown-up's avatar scale; the other kids are ~0.85)
const TINY = 0.48;
function miloSize(t) {
  const E = EV; let k = TINY;
  if (t < E.inch) return k;
  k += 0.035 * popK(t, E.inch);
  if (t >= E.flat) k += 0.09 * popK(t, E.flat);
  if (t >= E.hwk) k += 0.1 * popK(t, E.hwk);
  if (t >= E.line) { const n = Math.min(6, Math.floor((t - E.line) / 0.24) + 1); for (let i = 0; i < n; i++) k += 0.055 * popK(t, E.line + i * 0.24, 0.2); }
  if (t >= E.princ) k += (W.kMax - 1.07) * 0.62 * smooth(E.princ, E.princ + 1.2, t);
  if (t >= E.bump - 0.9) k += (W.kMax - k) * smooth(E.bump - 0.9, E.bump, t);
  return Math.min(k, W.kMax);
}

// ================= the street =================
const GATE = at(ST, 8, SW, -15.4);
function poseGate(t) {
  const E = EV, g = W.granny, h = W.helper;
  const GP = GATE.clone(), HP = at(ST, 11.4, SW, -14.6);
  place(g, GP, yawTo(GP, HP) - 0.45); pose(g, 'idle', t); face(g, t > 1.4 ? 'happy' : 'neutral', t, 0.5, { viseme: say('Oh, thank you, dear!', 1.5, 2.6, t) }); lookAtP(g, H(h), 0.8);
  const hs = 0.8 * (1 + 0.045 * popK(t, E.pop0)) / 0.8; place(h, HP, yawTo(HP, GP) + 0.5, hs); pose(h, 'idle', t);
  const give = smooth(0.4, 1.3, t); const bagP = lp3(H(h).add(v3(-0.3, -2.6, 0.7)), H(g).add(v3(0.5, -2.9, 0.6)), give);
  W.bag.visible = true; W.bag.position.copy(bagP); W.bag.rotation.y = 0.3;
  if (give < 1) { aimArm(h, 0, bagP.clone().add(v3(0, 0.4, 0)), 1); aimArm(h, 1, bagP.clone().add(v3(0.3, 0.4, -0.2)), 1); }
  aimArm(g, 1, bagP.clone().add(v3(0, 0.4, 0)), smooth(0.9, 1.3, t));
  const p = t > E.pop0 ? 1 : 0; face(h, p ? (t > E.pop0 + 0.5 ? 'grin' : 'surprised') : 'happy', t, 0.3); if (p && t < E.pop0 + 1.2) { h.neck.rotation.x = 0.5; aimArm(h, 0, H(h).add(v3(-0.9, -1.6, 0.9)), 0.8); aimArm(h, 1, H(h).add(v3(0.9, -1.6, 0.9)), 0.8); } else if (p) lookAtP(h, H(g), 0.8);
  W.popS.position.copy(HP); W.popS.update(t);
}
const XL = at(ST, 36, 0.3, -18);   // the crossing lamp
function poseGuard(t) {
  const E = EV, s = (i) => L(i).start, g = W.guard;
  const A = at(ST, 29, SW, -15.6), B = at(ST, 40, SW, -15.6);
  const u = walkTo(g, A, B, s(1) - 0.3, s(1) + 1.6, t, 0.8);
  const dk = smooth(-6.4, -3.6, g.root.position.x - ST.x - 36) * (1 - smooth(1.6, 4.2, g.root.position.x - ST.x - 36));
  g.torso.rotation.x = 0.38 * dk; g.neck.rotation.x = 0.05 * dk; g.hips.position.y -= 0.25 * dk;
  if (u >= 1) { g.root.rotation.y = lerp(Math.PI / 2, 0, smooth(s(1) + 1.6, s(1) + 2.1, t)); aimArm(g, 1, H(g).add(v3(0.8, 1.4, 1.2)), smooth(s(1) + 1.7, s(1) + 2.2, t)); }
  face(g, dk > 0.3 ? 'nervous' : 'happy', t, 0.4);
  if (u < 1 && dk < 0.2) lookAtP(g, at(ST, 40, 3, 0), 0.4);
  const hp = handOf(g, 1); W.paddle.visible = true; W.paddle.position.copy(hp).add(v3(0, -1.0, 0)); W.paddle.rotation.set(0, g.root.rotation.y, 0); W.paddle.scale.setScalar(1.15);
  // two kids crossing on the zebra
  const kc = [W.c1, W.c2]; kc.forEach((c, i) => { walkTo(c, at(ST, 38.5 + i * 2.6, 0.06, 9 + i), at(ST, 38.5 + i * 2.6, 0.06, -9 + i), s(1) + 1.9 + i * 0.2, s(1) + 5.5, t, 1, 'walk', 1); face(c, 'happy', t, i * 0.4); });
  W.xlamp.visible = true;
}
function poseGreedy(t) {
  const E = EV, c = W.greedy, P0 = at(ST, 16.6, SW, -12.4);
  place(c, P0, 0.2); pose(c, 'idle', t); face(c, t < E.greedy + 0.9 ? 'smug' : 'angry', t, 0.4); lookAtP(c, at(ST, 17.4, 1.5, -6.6), 0.7);
  const bp = H(c).add(fwd(c, 0.55)).add(v3(0, -1.05, 0)); W.bag2.visible = true; W.bag2.position.copy(bp).add(v3(0, -0.25, 0)); W.bag2.scale.setScalar(0.42); W.bag2.rotation.y = 0.5;
  aimArm(c, 0, bp.clone().add(side(c, 0.12)), 1); aimArm(c, 1, bp.clone().add(side(c, -0.12)), 1);
}
// the flashback: Grandpa and little Milo leave apples on a porch and tiptoe away
function poseFlash(t) {
  const s = (i) => L(i).start, g = W.grandpa, m = W.milo;
  const A = at(ST, 13.5, 0, -24.0), B = at(ST, 19.5, 0, -23.2);
  const go = s(8) + 0.1;
  if (t < go) { place(g, A, -2.6); pose(g, 'idle', t); g.torso.rotation.x = 0.45 * smooth(s(8) - 0.2, s(8) + 0.5, t) * (1 - smooth(s(8) + 0.9, go, t)); place(m, A.clone().add(v3(1.6, 0, 0.6)), -2.4, 0.4); pose(m, 'idle', t); }
  else { const u = clamp((t - go) / 2.6); place(g, lp3(A, B, u), yawTo(A, B), 1); pose(g, 'walk', t * 0.55); g.torso.rotation.x = 0.18; place(m, lp3(A, B, u).add(v3(0.4, 0, 1.6)), yawTo(A, B), 0.4); pose(m, 'walk', t * 0.7); m.torso.rotation.x = 0.15; g.neck.rotation.y = -0.9; m.neck.rotation.y = -0.6; }
  face(g, t > go ? 'grin' : 'happy', t, 0.5); face(m, 'grin', t, 0.2);
  W.apples.visible = true; W.apples.position.copy(at(ST, 11.2, 0, -25.6));
}

// ================= the hallway =================
const FT = () => W.hall.fountain;
function hallCrowdWalkers(t, list) { list.forEach(([c, a, b, t0, t1]) => { walkTo(c, a, b, t0, t1, t, 1); face(c, 'happy', t, 0.3); }); }
function poseFountain(t) {
  const s = (i) => L(i).start, m = W.milo, F = FT(), st = W.hall.stool;
  const SP = at(HL, st.position.x, 0, st.position.z);
  const climb = smooth(s(2) - 0.2, s(2) + 0.6, t);
  const p = lp3(at(HL, st.position.x + 1.8, 0, st.position.z + 0.4), SP.clone().add(v3(0, st.top, 0)), climb);
  place(m, p, -Math.PI / 2, TINY); pose(m, climb > 0 && climb < 1 ? 'walk' : 'idle', t);
  const drink = smooth(s(2) + 0.7, s(2) + 1.1, t) * (1 - smooth(s(2) + 2.0, s(2) + 2.35, t));
  m.torso.rotation.x = 0.55 * drink; m.neck.rotation.x = 0.2 * drink; aimArm(m, 0, at(HL, F.spout.x + 0.6, F.spout.y - 0.2, F.spout.z + 0.6), drink * 0.9);
  face(m, drink > 0.5 ? 'happy' : 'neutral', t, 0.4, { closed: drink > 0.7 });
  if (t > s(2) + 2.2) { m.root.rotation.y = lerp(-Math.PI / 2, -3.5, smooth(s(2) + 2.2, s(2) + 2.6, t)); face(m, 'happy', t, 0.4); }
  W.hall.fountain && (W.ftArc.visible = drink > 0.3);
  // a tall kid waits behind him, others pass
  const k = W.k4, KP = at(HL, -5.8, 0, -14.8); place(k, KP, yawTo(KP, SP) + 0.3); pose(k, 'idle', t); face(k, 'bored', t, 0.6); lookAtP(k, H(m), 0.8); k.legs[1].rotation.x = -Math.max(0, Math.sin(t * 9)) * 0.15;
  hallCrowdWalkers(t, [[W.k6, at(HL, 5.5, 0, -40), at(HL, 4.5, 0, -8), s(2) - 1, s(2) + 6]]);
}
function poseWhisper(t) {
  const s = (i) => L(i).start, m = W.milo, j = W.june;
  const k1 = W.k1, k2 = W.k2, A = at(HL, 3.0, 0, -12.8), B = at(HL, 4.6, 0, -14.8);
  const MP = lp3(at(HL, -1.0, 0, -3), at(HL, -1.2, 0, -12.5), clamp((t - s(3) + 0.3) / 4.6));
  place(m, MP, Math.PI, TINY); pose(m, 'walk', t * 1.1); face(m, 'neutral', t, 0.3); lookAtP(m, H(j), 0.6);
  place(j, MP.clone().add(v3(-2.0, 0, 0.6)), Math.PI); pose(j, 'walk', t * 1.0); face(j, t > s(3) + 1.8 ? 'skeptic' : 'neutral', t, 0.5);
  if (t > s(3) + 1.8) { j.neck.rotation.y = 0; lookAtP(j, H(k1), 0.5); }
  place(k1, A, -0.9); pose(k1, 'idle', t); face(k1, 'smug', t, 0.4, { viseme: say('so selfish', s(3) + 0.3, s(3) + 1.3, t) }); lookAtP(k1, H(m), 0.8); aimArm(k1, 1, H(k1).add(v3(-1.5, -0.6, -0.2)), 0.85);
  place(k2, B, -0.7); pose(k2, 'idle', t); face(k2, 'skeptic', t, 0.2); lookAtP(k2, H(k1), 0.6); k2.neck.rotation.z = 0.2;
}
function poseHomework(t) {
  const E = EV, c = W.hw, LK = W.hall.lockers.filter((l) => l.s > 0).reduce((a, b) => (Math.abs(b.z + 8) < Math.abs(a.z + 8) ? b : a));
  const front = at(HL, LK.x + (LK.s < 0 ? 2.5 : -2.5), 0, LK.z + 0.4); const pk = smooth(E.hw + 0.4, E.hw + 1.1, t); place(c, front, lerp(Math.PI / 2 + 0.2, -0.75, smooth(E.hw + 0.9, E.hw + 1.5, t))); pose(c, 'idle', t);
  const onLocker = at(HL, LK.x - LK.s * 0.78, 5.4, LK.z), held = H(c).add(fwd(c, 1.3)).add(v3(0, -1.3, 0));
  W.hwSheet.visible = true; W.hwSheet.position.copy(lp3(onLocker, held, pk)); W.hwSheet.rotation.set(0, lerp(-LK.s * Math.PI / 2, c.root.rotation.y + Math.PI, pk), 0);
  aimArm(c, 1, W.hwSheet.position.clone().add(side(c, -0.3)), smooth(E.hw, E.hw + 0.4, t)); if (pk > 0.5) aimArm(c, 0, W.hwSheet.position.clone().add(side(c, 0.3)), pk);
  face(c, pk > 0.6 ? 'grin' : 'surprised', t, 0.3); lookAtP(c, W.hwSheet.position, 0.8);
  W.hwLock = LK;
}
function poseGrease(t) {
  const E = EV, m = W.milo, j = W.june, MP = at(HL, -5.0, 0, -30), JP = at(HL, -2.2, 0, -28.4);
  place(m, MP, yawTo(MP, JP), TINY); pose(m, 'idle', t); face(m, 'happy', t, 0.3); lookAtP(m, H(j), 0.7);
  aimArm(m, 0, H(m).add(fwd(m, 0.9)).add(v3(0, -1.3, 0)).add(side(m, 0.45)), 0.9);
  place(j, JP, yawTo(JP, MP) + 0.2); pose(j, 'idle', t); const k = t > E.grease + 0.3;
  face(j, k ? 'skeptic' : 'neutral', t, 0.5, { noBlink: k }); lookAtP(j, k ? handOf(m, 0) : H(m), 0.9);
  W.grease.visible = true; W.grease2.visible = true;
}
// ---- the evening: Milo alone in the long empty hallway ----
function poseUnseen(t) {
  const s = (i) => L(i).start, m = W.milo, A = at(HL, 3.2, 0, -66), B = at(HL, 6.6, 0, -50);
  const u = walkTo(m, A, B, s(9) - 0.1, s(9) + 1.9, t, 1.0, 'walk', TINY); face(m, 'focused', t, 0.4);
  W.tbox.visible = true; W.tbox.scale.setScalar(0.5); W.tbox.position.copy(handOf(m, 1)).add(v3(0, -0.2, 0)); W.tbox.rotation.y = m.root.rotation.y;
  aimArm(m, 1, H(m).add(side(m, -0.35)).add(v3(0, -1.5, 0)), 0.5);
  if (u >= 1) { m.root.rotation.y = Math.PI / 2; const k = smooth(s(9) + 1.95, s(9) + 2.3, t); aimArm(m, 0, at(HL, HALL.w / 2 - 1.5, 2.2, B.z - HL.z + 0.2), k); W.note2.visible = true; W.note2.position.copy(handOf(m, 0)); W.note2.rotation.set(0, -Math.PI / 2, 0); W.note2.scale.setScalar(0.5); }
}
// ---- the banner morning, Nadia, the line ----
const KIDLINE = [['flat', -5.2, 1.6], ['hw', 5.2, -2.6], ['k1', -5.6, -6.0], ['k2', 5.4, -8.8], ['k3', -5.2, -11.6], ['k5', 5.6, -13.4], ['k6', -5.6, -16.2], ['k7', 5.2, -20.6], ['k8', -5.4, -21.4], ['k9', 5.6, -25.2], ['k10', -5.6, -27.0]];
function crowd(t, cheer = 0) {
  const m = W.milo;
  KIDLINE.forEach(([k, x, z], i) => { const c = W[k], P0 = at(HL, x, 0, z); place(c, P0, x < 0 ? Math.PI / 2 - 0.25 : -Math.PI / 2 + 0.25); pose(c, 'idle', t + i); lookAtP(c, H(m), 0.7);
    const passed = m.root.position.z < P0.z + 1.2; const ch = cheer * (passed ? 1 : 0.4);
    if (ch > 0.2) { const up = Math.sin(t * 7 + i) * 0.3; aimArm(c, i % 2, H(c).add(v3(0, 1.4 + up, 0)).add(side(c, i % 2 ? -0.8 : 0.8)), ch); }
    face(c, passed ? 'grin' : 'happy', t, i * 0.37); });
}
const MPATH = () => { const E = EV; return [[E.enter - 0.2, 10.5], [E.nadia - 0.25, 5.8], [E.inch + 0.4, 5.8], [E.flat + 0.6, 1.4], [E.hwk + 0.4, -2.4], [E.line, -6], [E.princ, -15.5], [E.bump, -25.6], [E.bump + 0.45, -26.6]]; };
function miloZ(t) { const p = MPATH(); if (t <= p[0][0]) return p[0][1]; for (let i = 1; i < p.length; i++) if (t <= p[i][0]) return lerp(p[i - 1][1], p[i][1], clamp((t - p[i - 1][0]) / (p[i][0] - p[i - 1][0]))); return p[p.length - 1][1]; }
function miloMoving(t) { const p = MPATH(); for (let i = 1; i < p.length; i++) if (t > p[i - 1][0] && t < p[i][0]) return Math.abs(p[i][1] - p[i - 1][1]) > 0.5; return false; }
function poseBanner(t) {
  const E = EV, j = W.june, ld = W.ladder; ld.visible = true; ld.position.copy(at(HL, -5.6, 0, HALL.front - 1.4)); ld.rotation.set(-0.12, 0.25, 0);
  const JP = at(HL, -3.4, 0, HALL.front - 4.4); const down = smooth(E.hung + 0.8, E.hung + 1.6, t);
  place(j, JP, Math.PI - 0.6); pose(j, 'idle', t); face(j, t > E.hung + 1.2 ? 'grin' : 'smug', t, 0.4); lookAtP(j, at(HL, 0, 11, HALL.front), 0.7 * (1 - down)); if (down > 0.5) lookAtP(j, at(HL, 4, 5, -6), 0.7);
  aimArm(j, 1, H(j).add(v3(1.0, 1.3, -0.8)), 0.6 * (1 - down));
  if (t > E.enter - 0.4) { const m = W.milo; place(m, at(HL, 0, 0, miloZ(t)), Math.PI, TINY); pose(m, miloMoving(t) ? 'walk' : 'idle', t); face(m, 'surprised', t, 0.3); lookAtP(m, at(HL, 0, 11, HALL.front), 0.6); }
  crowd(t, 0);
}
function poseNadia(t) {
  const E = EV, m = W.milo, n = W.nadia, MZ = miloZ(t);
  place(m, at(HL, 0, 0, MZ), Math.PI, miloSize(t)); pose(m, miloMoving(t) ? 'walk' : 'idle', t); face(m, t > E.inch ? 'surprised' : 'nervous', t, 0.3, { noBlink: t > E.inch && t < E.inch + 0.6 }); lookAtP(m, H(n), 0.8);
  const NP = at(HL, 0.4, 0, 3.0); place(n, NP, yawTo(NP, m.root.position)); pose(n, 'idle', t); face(n, 'happy', t, 0.5, { viseme: talk(12, t) }); lookAtP(n, H(m), 0.9);
  n.torso.rotation.x = 0.12;
  if (t > E.inch - 0.2) { place(n, NP.clone().add(v3(2.8, 0, -0.6)), yawTo(NP, m.root.position) - 0.4); pose(n, 'idle', t); face(n, 'grin', t, 0.5); lookAtP(n, H(m), 0.9); }
  crowd(t, smooth(E.inch, E.inch + 0.5, t) * 0.6);
  W.pop.position.copy(m.root.position); W.pop.update(t);
  // the thank-yous
  const fl = W.flat, hw = W.hw;
  face(fl, 'grin', t, 0.2, { viseme: say('Thanks, Milo!', E.flat - 0.15, E.flat + 0.6, t) }); face(hw, 'grin', t, 0.4, { viseme: say('Thank you!', E.hwk - 0.15, E.hwk + 0.45, t) });
  if (t > E.flat - 0.3 && t < E.flat + 1.0) aimArm(fl, 1, H(fl).add(v3(0, 1.8, 0)).add(side(fl, -0.9)), 0.8);
  if (t > E.hwk - 0.3 && t < E.hwk + 1.0) { W.hwSheet.visible = true; aimArm(hw, 0, H(hw).add(v3(-1.0, -0.8, 0.6)), 0.8); W.hwSheet.position.copy(handOf(hw, 0)).add(v3(0, 0.3, 0)); W.hwSheet.rotation.set(0, hw.root.rotation.y, 0); }
}
function poseLine(t) {
  const E = EV, m = W.milo, sz = miloSize(t), MZ = miloZ(t);
  place(m, at(HL, 0, 0, MZ), Math.PI, sz); pose(m, miloMoving(t) ? 'walk' : 'idle', t * (0.6 + 0.4 / Math.max(1, sz)));
  face(m, t > E.princ + 0.6 ? 'happy' : 'surprised', t, 0.3);
  crowd(t, 1);
  if (t > E.princ - 0.3) { const pr = W.principal, PP = at(HL, -3.4, 0, -17.6); place(pr, PP, Math.PI / 2 - 0.5); pose(pr, 'idle', t); lookAtP(pr, H(m), 1);
  face(pr, t > E.princ + 0.4 ? 'shocked' : 'surprised', t, 0.6, { noBlink: t > E.princ + 0.4 }); }
  // the bump
  const li = W.hall.lights.reduce((a, b) => (Math.abs(b.position.z + 26) < Math.abs(a.position.z + 26) ? b : a));
  W.hall.lights.forEach((l) => l.swing(0));
  if (t > E.bump) { const f = t - E.bump; li.swing(Math.sin(f * 9) * 0.35 * Math.exp(-f * 1.4)); }
  if (t > E.bump - 0.05 && t < E.kneel) { const k = smooth(E.bump, E.bump + 0.25, t) * (1 - smooth(E.bump + 1.2, E.bump + 1.5, t)); m.neck.rotation.x = 0.35 * smooth(E.bump, E.bump + 0.25, t); m.torso.rotation.x = 0.12 * smooth(E.bump, E.bump + 0.3, t); aimArm(m, 1, H(m).add(v3(0.3, 0.6, 0)), k); face(m, 'pain', t, 0.3, { closed: t < E.bump + 0.6 }); }
  if (t > E.bump + 1.5) face(m, 'grin', t, 0.3);
  const j = W.june, JP = at(HL, -0.6, 0, -33.6); place(j, JP, 0.05, juneSize(t)); pose(j, 'idle', t); face(j, t > E.princ ? 'shocked' : 'happy', t, 0.5); lookAtP(j, H(m), 0.9);
}
const juneSize = (t) => 1 + 0.06 * (t >= EV.jgrow ? popK(t, EV.jgrow, 0.35) : 0);
function poseKneel(t) {
  const E = EV, m = W.milo, j = W.june, MZ = miloZ(t), sz = W.kMax;
  place(m, at(HL, 0, 0, MZ), Math.PI, sz); pose(m, 'idle', t);
  const k = smooth(E.kneel, E.kneel + 1.4, t); kneel(m, k); m.torso.rotation.x = 0.62 * k; m.neck.rotation.x = -0.25 * k;
  aimArm(m, 0, at(HL, -2.6, 0.6, MZ - 2.6), k * 0.8); aimArm(m, 1, at(HL, 2.6, 0.6, MZ - 2.6), k * 0.8);
  const JP = at(HL, -0.6, 0, -33.6); place(j, JP, 0.05, juneSize(t)); pose(j, 'idle', t); lookAtP(j, H(m), 0.95);
  face(m, t > E.tyj ? 'happy' : 'grin', t, 0.3, { viseme: talk(16, t) });
  const g = t >= E.jgrow; face(j, g ? (t > E.jgrow + 0.6 ? 'grin' : 'surprised') : t > E.told ? 'happy' : 'nervous', t, 0.5, { noBlink: g && t < E.jgrow + 0.6 });
  if (g && t < E.jgrow + 1.4) { j.neck.rotation.x = 0.45 * smooth(E.jgrow, E.jgrow + 0.25, t) * (1 - smooth(E.jgrow + 0.9, E.jgrow + 1.3, t)); }
  if (t > E.jgrow + 1.4) { const kk = smooth(E.jgrow + 1.4, E.jgrow + 1.8, t); aimArm(j, 0, H(j).add(v3(-0.9, 1.3, 0.2)), kk); aimArm(j, 1, H(j).add(v3(0.9, 1.3, 0.2)), kk); }
  W.popJ.position.copy(JP); W.popJ.update(t);
  crowd(t, 1);
  W.hall.lights.forEach((l) => l.swing(0)); const li = W.hall.lights.reduce((a, b) => (Math.abs(b.position.z + 26) < Math.abs(a.position.z + 26) ? b : a)); if (li) { const f = t - E.bump; li.swing(Math.sin(f * 9) * 0.35 * Math.exp(-f * 1.4)); }
  const pr = W.principal, PP = at(HL, 4.0, 0, -15.6); place(pr, PP, Math.PI + 0.5); pose(pr, 'idle', t); lookAtP(pr, H(m), 1); face(pr, 'happy', t, 0.6);
}

// ================= behind the gym =================
const BK = () => at(GY, W.gym.rack.x0 + W.gym.rack.dx * 3, 0, W.gym.rack.z + 2.4);
function poseDawn(t) {
  const E = EV; W.bikes.forEach((b, i) => { b.visible = true; b.tires(smooth(E.pump + i * 0.35, E.pump + 0.9 + i * 0.35, t)); });
  W.pumpP.visible = true;
}
function poseGym(t, mode) {
  const E = EV, s = (i) => L(i).start, m = W.milo, j = W.june, B = W.bikes[1];
  W.bikes.forEach((b) => { b.visible = true; b.tires(1); });
  B.chainOn(t > E.chain ? 1 : 0);
  // Milo kneels at the pink bike's chain
  const MP = B.position.clone().add(v3(0.2, 0, 3.0));
  place(m, MP, Math.PI + 0.25, TINY); pose(m, 'idle', t); kneel(m, 0.85); m.torso.rotation.x = 0.18;
  W.grease.visible = true; W.grease2.visible = true;
  const work = mode === 'fix' || (mode === 'follow' && t > E.fix - 0.6);
  const chainP = B.position.clone().add(v3(-0.3, 0.75, 0.3));
  if (work) { const ph = Math.sin(t * 9) * 0.12; aimArm(m, 1, chainP.clone().add(v3(0.3, ph, 0.2)), 1); aimArm(m, 0, chainP.clone().add(v3(-0.4, -ph, 0.25)), 1); face(m, 'focused', t, 0.4); lookAtP(m, chainP, 0.45);
    W.wrench.visible = true; W.wrench.position.copy(handOf(m, 1)); W.wrench.rotation.set(0.5, m.root.rotation.y, 0.6 + ph); W.wrench.scale.setScalar(0.7); }
  // the note into the basket
  const nt = E.chain + 0.5;
  if (mode === 'fix' && t > nt) { const u = smooth(nt, nt + 0.6, t); const bp = B.basket.getWorldPosition(v3()).add(v3(0, 0.6, 0)); aimArm(m, 0, lp3(H(m).add(fwd(m, 0.6)), bp, u), 1); W.note.visible = true; W.note.position.copy(handOf(m, 0)); W.note.rotation.set(-0.3, m.root.rotation.y, 0); W.note.scale.setScalar(0.6); face(m, 'happy', t, 0.4); lookAtP(m, bp, 0.9); }
  // June: peeking around the corner, then stepping out
  const corner = at(GY, GYM.corner + 1.5, 0, GYM.wallZ + 1.0);
  if (mode === 'follow') { place(j, corner, yawTo(corner, m.root.position)); pose(j, 'idle', t); j.torso.rotation.z = 0.18; j.torso.rotation.x = 0.1; face(j, t > E.fix ? 'surprised' : 'skeptic', t, 0.5); lookAtP(j, H(m), 0.9); }
  if (mode === 'caught' || mode === 'please' || mode === 'didnt') {
    const JP = at(GY, MP.x - GY.x + 4.6, 0, MP.z - GY.z + 2.2);
    const st = mode === 'caught' ? smooth(s(7) - 0.5, s(7) + 0.2, t) : 1;
    place(j, lp3(corner, JP, st), yawTo(JP, m.root.position)); pose(j, st > 0 && st < 1 ? 'walk' : 'idle', t);
    lookAtP(j, H(m), 0.9);
    if (mode === 'caught') { face(j, 'shocked', t, 0.5, { viseme: talk(7, t) }); aimArm(j, 1, H(m), smooth(s(7), s(7) + 0.3, t) * 0.95); }
    if (mode === 'please') { face(j, 'nervous', t, 0.5); }
    if (mode === 'didnt') { const nod = Math.sin((t - s(11)) * 8) * 0.18 * smooth(s(11) + 0.2, s(11) + 0.4, t) * (1 - smooth(s(11) + 1.2, s(11) + 1.4, t)); face(j, 'smug', t, 0.5); j.neck.rotation.x += nod; }
    // Milo turns, stands up
    const up = mode === 'caught' ? smooth(E.phantom - 0.3, E.phantom + 0.3, t) : 1;
    place(m, MP, lerp(Math.PI + 0.25, yawTo(MP, j.root.position), smooth(s(7) + 0.1, s(7) + 0.6, t)), TINY); pose(m, 'idle', t); kneel(m, 0.85 * (1 - up)); m.torso.rotation.x = 0.35 * (1 - up);
    lookAtP(m, H(j), 0.9);
    if (mode === 'caught') { face(m, 'shocked', t, 0.3, { noBlink: true }); const fall = clamp((t - s(7) - 0.15) / 0.4); W.wrench.visible = true; const hp = handOf(m, 1); W.wrench.position.copy(hp).setY(lerp(hp.y, 0.1, fall * fall)); W.wrench.rotation.set(0.5 + fall * 1.2, m.root.rotation.y, lerp(0.6, Math.PI / 2, fall)); W.wrench.scale.setScalar(0.7); }
    if (mode === 'please') { face(m, 'sad', t, 0.4, { viseme: talk(10, t) }); aimArm(m, 0, H(m).add(fwd(m, 0.7)).add(v3(0, -0.6, 0)).add(side(m, -0.15)), 0.8); aimArm(m, 1, H(m).add(fwd(m, 0.7)).add(v3(0, -0.6, 0)).add(side(m, 0.15)), 0.8); }
    if (mode === 'didnt') { face(m, 'happy', t, 0.4); }
    W.note.visible = false;
  }
}

// ---- shots ----
// a camera on a character: dist away at ang degrees from its facing (+ = its left), dy above the head point, looking lookDy below it
function camOn(c, dist, ang = 0, dy = 0, lookDy = -0.7, fov = 54) { const h = H(c), a = c.root.rotation.y + ang * Math.PI / 180, s = SC(c); return { pos: h.clone().add(v3(Math.sin(a) * dist, dy, Math.cos(a) * dist)), look: h.clone().add(v3(0, lookDy * s, 0)), fov }; }
// a two-shot from the side of the line a-b (sgn picks the side), bias moves the camera toward b's front
function two(a, b, dist, sgn = 1, dy = 0.4, fov = 58, bias = 0) { const ha = H(a), hb = H(b), mid = lp3(ha, hb, 0.5), d = hb.clone().sub(ha).setY(0).normalize(), pp = v3(d.z, 0, -d.x).multiplyScalar(sgn); return { pos: mid.clone().add(pp.multiplyScalar(dist)).add(d.multiplyScalar(-bias)).add(v3(0, dy, 0)), look: mid.clone().add(v3(0, -0.9, 0)), fov }; }
function shots() {
  const s = (i) => L(i).start, e = (i) => L(i).end, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  // L0 the rule: a boy carries a granny's groceries; one thank-you, one inch
  add('gate', 0, (u) => two(W.granny, W.helper, 8.4, -1, 0.3, 54));
  add('pop', 2.4, (u) => camOn(W.helper, 6.0 - u * 0.5, 28, 0.3, -0.8, 54));
  // L1 the giant guard ducks; the pocket-sized greedy man
  add('guard', s(1) - 0.05, (u) => { const p = W.guard.root.position; return { pos: v3(p.x - 2.0, 3.6, p.z + 19.0), look: v3(p.x + 0.8, 8.4, p.z), fov: 64 }; });
  add('greedy', E.greedy - 0.25, (u) => ({ pos: at(ST, 17.4 + u * 0.3, 1.5, -6.6 + u * 0.3), look: at(ST, 16.9, 1.3, -12.6), fov: 52 }));
  // L2 the stool at the fountain
  add('fountain', s(2) - 0.05, (u) => ({ pos: at(HL, -2.8 - u * 0.3, 3.8, -27.2 + u * 0.4), look: at(HL, -6.6, 2.5, -18.6), fov: 56 }));
  add('sip', s(2) + 2.15, (u) => { const h = H(W.milo); return { pos: h.clone().add(v3(1.9, 0.3, -3.6 + u * 0.3)), look: h.clone().add(v3(0, -0.5, 0)), fov: 50 }; });
  // L3 whispers; June believes it
  add('whisper', s(3) - 0.05, (u) => ({ pos: lp3(at(HL, 1.6, 4.8, -22.5), at(HL, 1.2, 4.6, -21.5), easeInOut(u)), look: at(HL, 0.4, 2.6, -8.5), fov: 64 }));
  add('believe', capT('EVEN HIS', s(3)) - 0.05, (u) => camOn(W.june, 5.2 - u * 0.3, -14, 0.1, -0.8, 54));
  // L4 the Phantom: tyres pumped at dawn; homework back with a note
  add('dawn', s(4) - 0.05, (u) => ({ pos: lp3(at(GY, 2.0, 2.6, 9.0), at(GY, 1.0, 2.4, 7.6), easeInOut(u)), look: at(GY, -2.5, 1.2, -4.0), fov: 54 }));
  add('hwfind', E.hw - 0.2, (u) => ({ pos: at(HL, 1.4, 4.6, -1.4 - u * 0.4), look: at(HL, 6.6, 3.6, -8.2), fov: 54 }));
  // L5 the grease
  add('hand', s(5) - 0.05, (u) => camOn(W.milo, 4.0 - u * 0.3, -38, 0.5, -1.0, 50));
  add('sus', E.grease + 0.25, (u) => camOn(W.june, 5.0 - u * 0.4, 22, 0.1, -0.85, 52));
  // L6 behind the gym
  add('follow', s(6) - 0.05, (u) => camOn(W.june, 6.4 - u * 0.4, 25, 0.4, -0.9, 56));
  add('fix', E.fix - 0.05, (u) => { const b = W.bikes[1].position, h = H(W.milo); return { pos: b.clone().add(v3(-3.3 + u * 0.3, 1.7, 0.1)), look: h.clone().add(v3(0.4, -0.35, -0.3)), fov: 54 }; });
  // L7 caught
  add('caught', s(7) - 0.12, (u) => camOn(W.june, 5.2 - u * 0.4, -45, 0.5, -0.9, 54));
  add('froze', E.phantom - 0.1, (u) => camOn(W.milo, 3.8 - u * 0.3, 12, 0.3, -0.5, 52));
  // L8 the flashback
  add('flash', s(8) - 0.05, (u) => ({ pos: lp3(at(ST, 29.5, 5.2, -16.5), at(ST, 28.8, 5.0, -17.0), easeInOut(u)), look: at(ST, 15.5, 3.4, -24.0), fov: 58 }));
  add('shh', s(8) + 2.3, (u) => camOn(W.grandpa, 11.0 - u * 0.5, -30, 0.4, -1.4, 58));
  // L9 unseen
  add('unseen', s(9) - 0.05, (u) => ({ pos: lp3(at(HL, -4.0, 9.8, -34), at(HL, -3.4, 9.4, -36), easeInOut(u)), look: at(HL, 5.2, 1.2, -58), fov: 56 }));
  // L10 please
  add('please', s(10) - 0.05, (u) => camOn(W.milo, 4.4 - u * 0.4, 18, 0.5, -0.6, 52));
  // L11 June didn't tell; the banner
  add('didnt', s(11) - 0.05, (u) => camOn(W.june, 5.2 - u * 0.3, -22, 0.8, -0.9, 54));
  add('banner', E.hung - 0.1, (u) => ({ pos: lp3(at(HL, 0.6, 5.4, -5.5), at(HL, 0.4, 5.8, -4.0), easeInOut(u)), look: at(HL, -0.2, 8.8, HALL.front), fov: 62 }));
  // L12 Nadia
  add('nadia', s(12) - 0.25, (u) => camOn(W.nadia, 5.0, -12, -1.0, -0.7, 54));
  // L13 one inch, the line
  add('inch', E.inch - 0.2, (u) => camOn(W.milo, 5.6 - u * 0.4, 16, 0.8, -0.5, 54));
  add('flat', E.flat - 0.25, (u) => camOn(W.flat, 6.6 - u * 0.4, 34, 0.6, -0.9, 58));
  add('line', E.hwk - 0.25, (u) => { const h = H(W.milo); return { pos: v3(HL.x + 1.4, 5.2 + u * 1.2, h.z - 9.5), look: v3(HL.x, h.y - 0.6, h.z), fov: 62 }; });
  // L14 the principal; the bump
  add('princ', E.princ, (u) => ({ pos: lp3(at(HL, -2.0, 4.4, -32.5), at(HL, -1.8, 4.8, -33.5), easeInOut(u)), look: lp3(at(HL, -1.4, 5.8, -17.0), at(HL, -1.0, 7.6, -19.0), easeInOut(u)), fov: 64 }));
  add('bump', E.bump - 0.65, (u) => ({ pos: at(HL, 6.8, 5.0, -36.0), look: at(HL, 0.0, 10.8, -26.0), fov: 64 }));
  // L15 he kneels
  add('kneel', s(15) - 0.05, (u) => ({ pos: lp3(at(HL, 7.6, 4.8, -41.0), at(HL, 7.2, 4.8, -40.0), easeInOut(u)), look: at(HL, -0.4, 5.0, -29.0), fov: 62 }));
  // L16 "You told them. Thank you, June."
  add('told', s(16) - 0.05, (u) => { const h = H(W.milo); return { pos: h.clone().add(v3(-3.0 + u * 0.3, -0.7, -6.2)), look: h.clone().add(v3(0, -0.6, 0)), fov: 54 }; });
  add('juneface', E.tyj + 0.7, (u) => camOn(W.june, 5.0 - u * 0.3, 14, 0.4, -0.8, 54));
  // L17 June grows; the end
  add('final', E.jgrow + 1.2, (u) => ({ pos: lp3(at(HL, 3.6, 4.4, -43.0), at(HL, 3.4, 4.8, -45.0), easeInOut(u)), look: at(HL, -0.2, 6.6, -27.5), fov: 64 }));
  Sx.sort((a, b) => a.t0() - b.t0());
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
const KEYS = { gate: 'gate', pop: 'gate', guard: 'guard', greedy: 'greedy', fountain: 'fountain', sip: 'fountain', whisper: 'whisper', believe: 'whisper', dawn: 'dawn', hwfind: 'homework',
  hand: 'grease', sus: 'grease', follow: 'follow', fix: 'fix', caught: 'caught', froze: 'caught', flash: 'flash', shh: 'flash', unseen: 'unseen', please: 'please', didnt: 'didnt',
  banner: 'banner', nadia: 'nadia', inch: 'nadia', flat: 'nadia', line: 'line', princ: 'line', bump: 'line', kneel: 'kneel', told: 'kneel', juneface: 'kneel', final: 'kneel' };
const SET = { gate: 'st', guard: 'st', greedy: 'st', fountain: 'hl', whisper: 'hl', dawn: 'gyd', homework: 'hl', grease: 'hl', follow: 'gy', fix: 'gy', caught: 'gy', flash: 'stf', unseen: 'hle',
  please: 'gy', didnt: 'gy', banner: 'hl', nadia: 'hl', line: 'hl', kneel: 'hl' };

function renderAt(t) {
  let sh = shotAt(W.shots, t); let key = KEYS[sh.name], set = SET[key];
  if (LINEUP) { key = 'lineup'; set = 'gy'; }
  const env = { st: SUN, stf: DUSK, hl: HALLE, hle: HALLEVE, gy: SUN, gyd: DAWN }[set];
  applyEnv(ctx, env);
  const room = set.slice(0, 2);
  W.street.visible = room === 'st'; W.hall.visible = room === 'hl'; W.gym.visible = room === 'gy';
  W.pt.forEach((l) => { l.intensity = l.userData.set === room ? l.userData.I * (set === 'hle' ? 0.45 : 1) : 0; });
  hideAll(); W.pop.visible = false; W.popJ.visible = false; W.popS.visible = false;
  for (const k of ['bag', 'bag2', 'paddle', 'xlamp', 'apples', 'hwSheet', 'tbox', 'note', 'note2', 'wrench', 'pumpP', 'ladder', 'ftArc']) W[k].visible = false;
  W.bikes.forEach((b) => { b.visible = room === 'gy'; }); W.grease.visible = false; W.grease2.visible = false;
  W.hall.lights.forEach((l) => l.swing(0)); W.hall.banner.visible = t > EV.hung - 0.3;
  if (LINEUP) poseLineup(t);
  else ({ gate: () => poseGate(t), guard: () => poseGuard(t), greedy: () => poseGreedy(t), fountain: () => poseFountain(t), whisper: () => poseWhisper(t), dawn: () => poseDawn(t),
    homework: () => poseHomework(t), grease: () => poseGrease(t), follow: () => poseGym(t, 'follow'), fix: () => poseGym(t, 'fix'), caught: () => poseGym(t, 'caught'), flash: () => poseFlash(t),
    unseen: () => poseUnseen(t), please: () => poseGym(t, 'please'), didnt: () => poseGym(t, 'didnt'), banner: () => poseBanner(t), nadia: () => poseNadia(t), line: () => poseLine(t), kneel: () => poseKneel(t) })[key]();
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  if (Q.get('dbgpos')) console.error('t', t, sh.name, 'cam', sh.pos.toArray().map((x) => x.toFixed(1)).join(','), W.all.filter((c) => c.root.visible).map((c) => c.key + '@' + c.root.position.toArray().map((x) => x.toFixed(1)).join(',') + ' s' + c.root.scale.x.toFixed(2)).join(' | '));
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2 * SC(c), 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * SC(c); c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2] * SC(c), Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  if (LINEUP) { const i = Math.floor(t) % LINEUP.length, x = (i - (LINEUP.length - 1) / 2) * 4.2, hh = H(W['L' + i]); sh = { name: 'lineup', pos: v3(hh.x + (t % 1 > 0.5 ? 3.2 : 0), hh.y + 0.3, hh.z + 5.5), look: v3(hh.x, hh.y - 0.6, hh.z), fov: 50 }; }
  if (ctx.thumbMode) sh = { ...sh, pos: at(HL, 7.4, 4.4, -42.5), look: at(HL, -0.4, 6.6, -28.5), fov: 64 };
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  const mem = set === 'stf';
  frame(ctx, t, sh, { steady: t < 2.4 || Q.get('steady') === '1', shake: 0, shadowSpan: room === 'st' ? 70 : 50, shadows: true, black: 0, tint: mem ? 'rgba(255,190,120,0.16)' : undefined, vig: mem ? 0.28 : 0,
    flash: Math.max(0, 1 - Math.abs(t - L(8).start + 0.02) / 0.18) * 0.5 + Math.max(0, 1 - Math.abs(t - L(9).start + 0.02) / 0.18) * 0.35, flashColor: '#fff2e0' });
  return sh.name;
}
function poseLineup(t) {
  const n = LINEUP.length; LINEUP.forEach((k, i) => { const c = W['L' + i]; place(c, at(GY, (i - (n - 1) / 2) * 4.2, 0, 8), 0); pose(c, 'idle', 0); face(c, t % 1 > 0.5 ? 'happy' : 'surprised', 0, 0, { noBlink: true }); });
}

export async function setup() {
  const avs = [...new Set([...Object.values(AV).map((a) => a[0]), ...(LINEUP || [])])];
  ctx = await initStage('ep108', { look: 'pro', avatars: avs }); L = ctx.L;
  try { CAP = (await (await fetch('/build/ep108/timeline.json')).json()).captions || []; } catch (e) { CAP = []; }
  EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'smirk', 'grin', 'focused', 'shocked', 'surprised', 'nervous', 'scared', 'angry', 'skeptic', 'suspicious', 'bored', 'pain', 'blink']);
  const { scene, camera } = ctx; camera.far = 2600; camera.near = 0.1; camera.updateProjectionMatrix();
  W.street = fernStreet(); W.street.position.copy(ST); scene.add(W.street);
  W.hall = schoolHall(); W.hall.position.copy(HL); scene.add(W.hall);
  W.gym = gymBack(); W.gym.position.copy(GY); scene.add(W.gym);
  W.xlamp = lamp({ height: 12, color: '#3a5a7a' }); W.xlamp.position.copy(XL); W.xlamp.rotation.y = -Math.PI / 2; scene.add(W.xlamp);
  // props
  W.bag = new THREE.Group(); { const bb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.75), new THREE.MeshStandardMaterial({ color: '#c8a070', roughness: 0.95 })); bb.castShadow = true; W.bag.add(bb); for (let i = 0; i < 4; i++) { const lf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 5), new THREE.MeshStandardMaterial({ color: i % 2 ? '#5fbf57' : '#ffb020', roughness: 0.8 })); lf.position.set(-0.3 + i * 0.2, 0.85, (i % 2) * 0.15 - 0.07); lf.rotation.z = (i - 1.5) * 0.2; W.bag.add(lf); } } scene.add(W.bag);
  W.paddle = stopPaddle(); scene.add(W.paddle);
  W.bag2 = moneyBag(); scene.add(W.bag2);
  W.apples = appleBasket(); scene.add(W.apples);
  W.hwSheet = homework(); scene.add(W.hwSheet);
  W.tbox = toolbox(); scene.add(W.tbox);
  W.note = stickyNote('WELCOME TO|FERNBROOK!', '#ffe45a'); scene.add(W.note);
  W.note2 = stickyNote('FOUND IT!', '#9fe0ff'); scene.add(W.note2);
  W.wrench = wrench(); scene.add(W.wrench);
  W.ladder = ladder(8.5); scene.add(W.ladder);
  W.ftArc = W.hall.children.find((o) => o.arc) ? W.hall.children.find((o) => o.arc).arc : new THREE.Group();
  // bikes in the rack
  W.bikes = [bike({ col: '#5b8de0' }), bike({ col: '#ff8fb1', basket: true }), bike({ col: '#8fd16a' })];
  W.bikes.forEach((b, i) => { b.position.copy(at(GY, W.gym.rack.x0 + W.gym.rack.dx * (1 + i * 1.6), 0, W.gym.rack.z + 0.2)); b.rotation.y = Math.PI / 2 + (i === 1 ? 0 : 0.05); b.scale.setScalar(0.92); scene.add(b); });
  W.bikes[1].rotation.y = -Math.PI / 2;
  W.pumpP = pump(); W.pumpP.position.copy(at(GY, W.gym.rack.x0 + W.gym.rack.dx * 2.0, 0, W.gym.rack.z + 1.6)); W.pumpP.rotation.z = 0.25; scene.add(W.pumpP);
  W.pop = burst(scene, { count: 90, color: '#ffe27a', height: 5, spread: 2.2, dur: 1.2, bright: 1.5, pointSize: 0.55 });
  W.popJ = burst(scene, { count: 110, color: '#ffe27a', height: 5, spread: 2.0, dur: 1.4, bright: 1.5, pointSize: 0.55, seed: 9 });
  const PL = (c, I, d, set, p) => { const l = new THREE.PointLight(c, I, d, 1.5); if (p) l.position.copy(p); l.userData.I = I; l.userData.set = set; scene.add(l); return l; };
  W.pt = [PL('#fff4e0', 220, 46, 'hl', at(HL, 0, 11, 2)), PL('#fff4e0', 220, 46, 'hl', at(HL, 0, 11, -16)), PL('#fff4e0', 220, 46, 'hl', at(HL, 0, 11, -32)), PL('#fff4e0', 160, 46, 'hl', at(HL, 0, 11, -56))];
  if (LINEUP) LINEUP.forEach((k, i) => { const c = makeCharacter({ avatar: k, alti: true, skin: skinOf(k), caustic: false, scale: 0.86 }); scene.add(c.root); jointify(c); W['L' + i] = c; });
  people();
  W.kMax = (HALL.h - 1.2 - 0.05) / W.miloH;
  W.pop.fire(EV.inch); W.popJ.fire(EV.jgrow);
  W.popS = burst(scene, { count: 70, color: '#ffe27a', height: 4, spread: 1.8, dur: 1.1, bright: 1.5, pointSize: 0.5, seed: 3 }); W.popS.fire(EV.pop0);
  W.shots = shots();
  // the giant photo: Milo fixing the bike, rendered once into a texture
  {
    const rt = new THREE.WebGLRenderTarget(1024, 512, { type: THREE.HalfFloatType }); const cam = new THREE.PerspectiveCamera(40, 2, 0.1, 400);
    applyEnv(ctx, SUN); W.street.visible = false; W.hall.visible = false; W.gym.visible = true; hideAll(); W.bikes.forEach((b) => { b.visible = true; b.tires(1); });
    poseGym(EV.fix + 0.4, 'fix'); W.june.root.visible = false; ctx.scene.updateMatrixWorld(true);
    const h = H(W.milo); cam.position.copy(h.clone().add(v3(3.4, 0.9, 3.6))); cam.lookAt(h.clone().add(v3(-1.2, -0.7, -1.2))); ctx.sun.target.position.copy(h); ctx.sun.position.copy(h).add(v3(60, 110, 70)); ctx.sun.target.updateMatrixWorld();
    ctx.renderer.setRenderTarget(rt); ctx.renderer.render(scene, cam); ctx.renderer.setRenderTarget(null);
    W.hall.banner.setPhoto(rt.texture); W.photoRT = rt;
  }
  window.__ep108 = { W, THREE, ctx, L, EV };
  return expose(ctx, renderAt, L(16).start + 0.3, EV);
}
