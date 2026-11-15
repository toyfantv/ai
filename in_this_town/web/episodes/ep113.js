// Flower Man remake 13: Don't Picture Him. In Bramblewick your daydreams float over your head in a bubble, and when two hundred people
// picture one thing it comes true. Tess's bubble is always full of monsters, but nobody may picture Mister Stilts (ten feet of green stilts
// and a hundred blinking eyes): a counter on the clock tower counts who does. Bored in class, Tess pictures him: one. The mayor shouts
// "Do not picture Mister Stilts!"; by lunch it's forty, everyone blames Tess, Mom makes her wear a laundry basket. The mayor gets louder
// (billboards, pizza boxes, a blimp): one fifty, one ninety-nine. The pizza guy reads his own box and up pop the eyes: nobody can read
// "don't picture him" without picturing him. Tess climbs her roof with a megaphone: "Whatever you do, don't picture Mister Stilts in a
// sparkly tutu!" Two hundred: he stands in the square in a tutu, tap-dances past the mayor, who faints. Now he does birthday parties, and
// every night a long green finger taps Tess's window: he needs new moves.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DAY } from '../engine/stage.js';
import { sparkles, burst } from '../engine/atmos.js';
import { jointify } from '../engine/infinitetower.js';
import { WIN } from '../engine/pastel.js';
import { FARM } from '../engine/farm_cast.js';
import { classroom, lunchroom } from '../engine/merrowbay.js';
import { houseRoom, snRoom } from '../engine/shufflenight.js';
import { canvasTex } from '../engine/props.js';
import { partyHat } from '../engine/sorrygarden.js';
import { bramblewick, stilts, bubble, pizzaBox, blimp, megaphone, wearBasket, dreamscape, TOWER, HOUSE, PODIUM, DONUT, BILL } from '../engine/dontpicture.js';

const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV, CAP = [];
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const AV = { tess: ['farm_maya', 0.86], mom: ['farm_classic_mom', 1], mayor: ['farm_hc_mayor_harmon', 1], teacher: ['farm_ms_henderson', 1], pizza: ['farm_marcus', 1],
  k1: ['farm_red_kid', 0.84], k2: ['farm_zoe', 0.84], k3: ['farm_leo', 0.84], k4: ['farm_nia', 0.84], k5: ['farm_ethan', 0.84],
  t1: ['farm_city_man', 1], t2: ['farm_city_woman', 1], t3: ['farm_gardener', 1], t4: ['farm_old_man', 1], t5: ['farm_skater_boi', 1], t6: ['farm_baker', 1], t7: ['farm_grandma', 1], t8: ['farm_lumber_joe', 1] };
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';
const KIDS = ['k1', 'k2', 'k3', 'k4', 'k5'], TOWN = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'];

// places: the square at the origin; the rooms far away
const CL = v3(1500, 0, 0), LU = v3(1500, 0, 300), KI = v3(1500, 0, 600), BR = v3(1500, 0, 900), DR = v3(-1500, 0, 0);
const at = (o, x, y, z) => o.clone().add(v3(x, y, z));

const SUN = { ...DAY, ...P({ top: '#2f93ee', horizon: '#d2efff', haze: '#d2efff', sunColor: '#fff2d8', hemiSky: '#d6edff', hemiGround: '#d9c8a4' }), sunDir: v3(0.4, 0.78, 0.45), sunI: 2.2, sunDisc: 0, hemiI: 1.15, amb: 0.3, envI: 1.0, exposure: 1.0, bloom: 0.03, vig: 0, saturation: 1.22, contrast: 1.05, bounce: 0.18, fogNear: 320, fogFar: 1500, stars: 0, moon: 0, win: 0, lamp: 0 };
const ROOM = { ...SUN, ...P({ top: '#ffe7c2', horizon: '#ffe7c2', haze: '#ffe7c2', sunColor: '#ffe6c0', hemiSky: '#fff4e0', hemiGround: '#d6b488' }), sunDir: v3(0.65, 0.55, 0.4), sunI: 0.35, sunDisc: 0, hemiI: 1.4, amb: 0.5, envI: 0.7, saturation: 1.14, fogNear: 400, fogFar: 1200 };
const DREAM = { ...SUN, ...P({ top: '#1a0b3a', horizon: '#6a2a8a', haze: '#3a1a5e', sunColor: '#ffb0f0', hemiSky: '#9a6cff', hemiGround: '#3a1a5e' }), sunDir: v3(-0.5, 0.6, -0.6), sunI: 1.6, hemiI: 0.9, amb: 0.25, envI: 0.5, exposure: 1.1, saturation: 1.2, contrast: 1.08, fogNear: 60, fogFar: 260 };
const NIGHT = { ...SUN, ...P({ top: '#0a1334', horizon: '#26356c', haze: '#1a2550', sunColor: '#a9bcff', hemiSky: '#5068b8', hemiGround: '#262a40' }), sunDir: v3(-0.4, 0.75, 0.5), sunI: 0.7, hemiI: 1.05, amb: 0.26, envI: 0.6, exposure: 1.18, bloom: 0.05, saturation: 1.15, contrast: 1.06, fogNear: 150, fogFar: 760, stars: 1, moon: 1 };
const ROOMN = { ...NIGHT, ...P({ hemiSky: '#5a6cb8', hemiGround: '#3a2c3a', sunColor: '#9fb4ff' }), sunI: 0.3, hemiI: 1.0, amb: 0.32, envI: 0.45, exposure: 1.2, fogNear: 300, fogFar: 1500 };

const capT = (word, after = 0) => { const c = CAP.find((x) => x.start >= after - 0.01 && x.text.toUpperCase().includes(word)); return c ? c.start : after; };
function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return { swap1: s(1) + 1.0, drop: s(1) + 2.45, there: capT('THERE', s(5)), click: s(6) + 0.02, one: s(6) + 0.85, scream: s(6) + 0.95,
    forty: s(8) + 0.05, blamed: capT('EVERYONE', s(8)), mom: capT('MOM', s(8)), bill: s(9) + 1.1, box: capT('PIZZA', s(9)) + 0.55, blimp: capT('BLIMP', s(9)) - 0.15,
    c150: s(10), c199: capT('NINETY', s(10)) - 0.35, read: s(11) + 0.6, eyes: capT('POPPED', s(11)) - 0.15, door: s(12) - 0.25, climb0: s(13) + 0.1, climb1: e(13) + 0.3,
    swap: capT('SPARKLY', s(14)) - 0.1, two: s(15) + 0.02, appear: capT('IN THE', s(15)) - 0.1, faint: s(16) + 1.45, tap: s(18) + 0.4, end: ctx.dur };
}

// ---- helpers (from Remakes 11-12) ----
const armLen = (c) => { if (!c._alen) { c.reset(); const r = c.root.rotation.clone(), p = c.root.position.clone(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3(); c.arms[0].traverse((o) => { if (o.isMesh && !o.userData.worn) bx.expandByObject(o); }); c._alen = sh.y - bx.min.y - 0.12 * (c.spec.scale || 1); c.root.rotation.copy(r); c.root.position.copy(p); c.root.updateMatrixWorld(true); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.arms[side].localToWorld(v3(0, -armLen(c) / s, 0.1)); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.scale.set(1, 1, 1); c.head.rotation.set(0, 0, 0); c.arms.forEach((a) => a.quaternion.identity()); c.legs.forEach((l) => l.rotation.set(0, 0, 0)); c.hips.position.y = c.hipY ?? 2; c.torso.rotation.set(0, 0, 0); c.neck.rotation.set(0, 0, 0); }
function place(c, p, yaw) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; }
const HY = (c) => (c.hipY ?? 2) * (c.spec.scale || 1);
function sitAt(c, p, yaw, seatY) { place(c, p, yaw); c.root.position.y = p.y; c.hips.position.y = (c.hipY ?? 2) + (seatY - p.y - HY(c) + 0.12 * (c.spec.scale || 1)) / (c.spec.scale || 1); c.legs.forEach((l, i) => { l.rotation.x = -1.5; if (c.knee) c.knee[i].rotation.x = 1.5; }); c.arms.forEach((a, i) => { a.rotation.x = -0.6; a.rotation.z = (i ? 1 : -1) * 0.1; }); }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const H = (c) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.neck.getWorldPosition(v3()).add(v3(0, 0.8 * s, 0)); };
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.closed ? true : o.noBlink ? false : blinkAt(t, ph), viseme: o.viseme, gaze: o.gaze }); }
const talk = (i, t, txt) => (t > L(i).start && t < L(i).end ? visemeAt(txt || L(i).text, L(i).start, L(i).end, t) : undefined);
function lookAtP(c, p, k = 1) { c.root.updateMatrixWorld(true); const n = c.neck.getWorldPosition(v3()), a = wrap(yawTo(n, p) - c.root.rotation.y); c.neck.rotation.y = clamp(a, -1.2, 1.2) * k; c.neck.rotation.x = -Math.atan2(p.y - n.y - 0.6, Math.hypot(p.x - n.x, p.z - n.z)) * 0.6 * k; }
function walkTo(c, a, b, t0, t1, t, speed = 1) { const u = clamp((t - t0) / (t1 - t0)); place(c, lp3(a, b, u), yawTo(a, b)); pose(c, u > 0 && u < 1 ? 'walk' : 'idle', t * speed); return u; }
const fwd = (c, d = 1) => v3(Math.sin(c.root.rotation.y), 0, Math.cos(c.root.rotation.y)).multiplyScalar(d);

// ---- the bubbles ----
const popK = (t, t0, d = 0.35) => clamp((t - t0) / d);
function bub(key, kind, k, t, o = {}) {   // a character's daydream over the head
  const c = W[key], b = W.bub[key]; if (!c || !b || k <= 0.002 || !c.root.visible) return;
  const s = c.spec.scale || 1, h = H(c); b.position.copy(h).add(v3(o.dx ?? 0.5 * s, 0.8 * s + 3.0 * (o.sz ?? 1), 0)); if (o.off) b.position.add(o.off); b.show(kind); b.set(k, t + (o.ph ?? 0)); b.scale.multiplyScalar(o.sz ?? 1); W.liveB.push(b);
}
function freeBub(i, p, kind, k, t, sz = 1) { const b = W.fb[i]; b.position.copy(p); b.show(kind); b.set(k, t + i); b.scale.multiplyScalar(sz); W.liveB.push(b); }

// ---- the counter ----
function cnt(t) {
  const E = EV, s = (i) => L(i).start;
  if (t < E.click) return 0; if (t < s(7) + 0.3) return 1;
  if (t < E.forty) return Math.round(lerp(1, 40, smooth(s(7) + 0.3, E.forty, t)));
  if (t < s(9)) return 40; if (t < E.c150) return Math.round(lerp(40, 120, clamp((t - s(9)) / (E.c150 - s(9)))));
  if (t < E.c199) return Math.round(lerp(150, 199, smooth(E.c150 + 0.2, E.c199, t)) );
  if (t < E.two) return 199; return 200;
}

// ---- people ----
function people() {
  for (const [k, [avatar, scale]] of Object.entries(AV)) {
    const c = makeCharacter({ avatar, alti: true, skin: skinOf(avatar), caustic: false, scale });
    ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c.key = k;
    c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c);
    W[k] = c;
  }
  W.basket = wearBasket(W.tess);
  W.bub = {}; for (const k of Object.keys(AV)) { W.bub[k] = bubble('donut'); ctx.scene.add(W.bub[k]); }
  W.fb = []; for (let i = 0; i < 10; i++) { const b = bubble('stilts', { r: 2.4 }); ctx.scene.add(b); W.fb.push(b); }
  W.hats = []; for (const k of [...KIDS, 'tess']) { const h = partyHat(); const c = W[k]; c.root.updateMatrixWorld(true); const bx = new THREE.Box3(); c.head.traverse((o) => { if (o.isMesh && !o.userData.worn) bx.expandByObject(o); }); const top = c.head.worldToLocal(v3(0, bx.max.y, 0)).y; h.position.set(0, top - 0.1, 0); h.scale.setScalar(0.9 / (c.spec.scale || 1)); h.traverse((o) => { o.userData.worn = true; }); c.head.add(h); h.visible = false; W.hats.push(h); }
  W.all = Object.keys(AV).map((k) => W[k]);
}
function hideAll() { W.all.forEach((c) => { c.root.visible = false; }); W.basket.visible = false; W.hats.forEach((h) => { h.visible = false; }); }

// ---- the square, before: people strolling, daydreaming ----
const STROLL = { t1: [v3(-16, 0, 10), v3(-4, 0, -16)], t2: [v3(14, 0, 14), v3(4, 0, -10)], t3: [v3(-8, 0, 22), v3(10, 0, 22)], t4: [v3(20, 0, -4), v3(10, 0, -24)], t5: [v3(-22, 0, -2), v3(-12, 0, 14)], t6: [v3(6, 0, 28), v3(-6, 0, 30)], t7: [v3(-18, 0, -20), v3(-6, 0, -26)], t8: [v3(22, 0, 26), v3(16, 0, 10)] };
const DAYKIND = { t1: 'car', t2: 'pie', t3: 'kitten', t4: 'fish', t5: 'burger', t6: 'pie', t7: 'kitten', t8: 'fish' };
function poseStroll(t, kindOf) {
  TOWN.forEach((k, i) => { const [a, b] = STROLL[k], c = W[k]; walkTo(c, a, b, -1, 9, t, 0.9 + i * 0.03); face(c, ['happy', 'neutral', 'happy', 'smug', 'grin', 'happy', 'neutral', 'smirk'][i], t, i * 0.4); bub(k, kindOf(k, i), 1, t, { ph: i }); });
}
function poseOpen(t) { poseStroll(t, (k) => DAYKIND[k]); }
function poseRule(t) {   // everyone looks up; the bubbles turn to donuts one by one; a giant donut drops
  const E = EV;
  TOWN.forEach((k, i) => { const [a, b] = STROLL[k], c = W[k], u = clamp((L(1).start + 1) / 10), p = lp3(a, b, u); place(c, p, yawTo(p, DONUT)); pose(c, 'idle', t + i);
    const sw = E.swap1 + i * 0.12, k2 = t < sw ? DAYKIND[k] : 'donut'; face(c, t > E.drop + 0.2 ? 'surprised' : 'happy', t, i * 0.3); if (t > E.drop - 0.6) lookAtP(c, DONUT.clone().add(v3(0, 3, 0)), 0.8);
    const pk = t < sw ? 1 : t < sw + 0.18 ? 1 - (t - sw) / 0.18 : popK(t, sw + 0.18), gone = 1 - popK(t, E.drop + 0.1 + i * 0.03, 0.15);
    bub(k, k2, Math.min(pk, gone), t, { ph: i }); });
  const dn = W.sq.donut, f = t - E.drop; dn.position.copy(DONUT);
  if (f < 0) { const fall = 1.0, q = clamp(-f / fall); dn.position.y = 70 * q * q; dn.visible = -f < fall; } else { dn.visible = true; const sq = Math.max(0, Math.sin(f * 18) * Math.exp(-f * 6)); dn.scale.set(1 + sq * 0.2, 1 - sq * 0.35, 1 + sq * 0.2); }
  if (W.dust) W.dust.update(t);
}
function poseTessWalk(t) {   // Tess crosses the square, her bubble full of monsters
  const s = (i) => L(i).start, c = W.tess, A = v3(10, 0, 18), B = v3(-2, 0, 4);
  walkTo(c, A, B, s(2) - 0.5, s(3) + 0.2, t, 1.1); face(c, 'happy', t, 0.3);
  const kinds = ['dino', 'blob', 'dino']; const kk = kinds[Math.floor(clamp((t - s(2)) / 1.0, 0, 2.99))];
  bub('tess', kk, popK(t, s(2) - 0.4), t, { sz: 1.05 });
  ['t3', 't6'].forEach((k, i) => { const c2 = W[k], p = [v3(-10, 0, 8), v3(16, 0, 2)][i]; place(c2, p, yawTo(p, c.root.position)); pose(c2, 'idle', t + i); face(c2, 'happy', t, i); bub(k, ['pie', 'fish'][i], 1, t, { ph: i }); });
}
function poseDream(t) {   // where he lives: a purple nothing; his eyes open
  const s = (i) => L(i).start, m = W.mon; m.visible = true; m.position.copy(DR).add(v3(0, 0, 0)); m.rotation.y = 0.15;
  m.tutu.visible = false; m.shoes.visible = false;
  m.eyeOpen = smooth(s(3) + 0.3, s(3) + 1.6, t); m.eyes.forEach((e, i) => { e.open = clamp((t - s(3) - 0.2 - (i % 17) * 0.06) / 0.25); });
  m.pose(t, { arms: 'creep', armK: smooth(s(3), s(3) + 2, t), lean: 0.12 }); m.lookDir(v3(0.1, -0.15, 1));
  W.dream.visible = true; W.dream.update(t);
}
function poseTower() { /* the counter shows it */ }
// ---- the classroom ----
function poseClass(t, scared = 0) {
  const E = EV, s = (i) => L(i).start, R = W.cl, seat = (c, r) => R.seat(c, r).add(CL);
  const c = W.tess, P0 = seat(2, 1); sitAt(c, P0, Math.PI, R.seatY); c.torso.rotation.x = 0.12 - 0.2 * scared; c.neck.rotation.z = 0.22 * (1 - scared); c.neck.rotation.x = -0.05;
  aimArm(c, 0, at(P0, 0.9, R.deskTop + 0.2, -2.0), 1); aimArm(c, 1, at(P0, -0.9, R.deskTop + 0.2, -2.0), 1);
  face(c, scared > 0.5 ? 'nervous' : t > E.there + 0.4 ? 'smirk' : 'sleepy', t, 0.3);
  bub('tess', 'stilts', popK(t, E.there), t, { sz: 1.1 });
  const ks = [['k1', 1, 1], ['k2', 3, 1], ['k3', 0, 0], ['k4', 1, 2], ['k5', 3, 2]];
  ks.forEach(([k, col, row], i) => { const q = W[k], p = seat(col, row); const away = p.clone().sub(P0).setY(0).normalize(); sitAt(q, p.clone().add(away.multiplyScalar(0.8 * scared)), Math.PI, R.seatY);
    if (scared > 0) { q.torso.rotation.x = -0.3 * scared; aimArm(q, 0, H(q).add(v3(0.6, -0.3, -1.2)), scared); aimArm(q, 1, H(q).add(v3(-0.6, -0.3, -1.2)), scared); lookAtP(q, W.bub.tess.position, scared); face(q, ['shocked', 'scared', 'shocked', 'scared', 'shocked'][i], t, i, { noBlink: true }); }
    else { lookAtP(q, at(CL, 0, 8, -20), 0.6); face(q, ['neutral', 'focused', 'sleepy', 'neutral', 'focused'][i], t, i * 0.4); aimArm(q, 0, at(p, 0.9, R.deskTop + 0.2, -2.0), 1); aimArm(q, 1, at(p, -0.9, R.deskTop + 0.2, -2.0), 1); } });
  const te = W.teacher, TP = at(CL, -8, 0, -14); place(te, TP, Math.PI * 0.1); pose(te, scared > 0 ? 'scared' : 'idle', t);
  if (scared <= 0) { aimArm(te, 1, at(CL, -5, 11, -21), 1); face(te, 'focused', t, 0.6); lookAtP(te, at(CL, 0, 4, 2), 0.5); } else { face(te, 'shocked', t, 0.6, { noBlink: true }); lookAtP(te, W.bub.tess.position, 0.9); }
}
// ---- the mayor ----
function poseMayor(t, shout = true) {
  const s = (i) => L(i).start, m = W.mayor, MP = at(PODIUM, 0, 0.6, -1.8); place(m, MP, 0); pose(m, 'idle', t);
  const k = smooth(s(7) - 0.2, s(7) + 0.2, t); aimArm(m, 1, H(m).add(v3(-0.6, 0.6 + Math.sin(t * 7) * 0.25, 3)), k); aimArm(m, 0, at(MP, 1.0, 4.5, 1.5), 0.8);
  m.torso.rotation.x = 0.1; face(m, 'angry', t, 0.5, { viseme: shout ? talk(7, t) : undefined });
  bub('mayor', 'stilts', popK(t, s(7) + 0.9), t, { dx: -1.0 });
}
// ---- lunch ----
function poseLunch(t) {
  const R = W.lu, c = W.tess, TP = at(LU, 13, 0, 5.4); sitAt(c, TP, Math.PI, R.seatY); aimArm(c, 0, at(TP, 0.7, R.topY + 0.2, -2.2), 1); aimArm(c, 1, at(TP, -0.7, R.topY + 0.2, -2.2), 1); c.torso.rotation.x = 0.12; face(c, 'sad', t, 0.3); lookAtP(c, at(LU, -8, 4, 0), 0.7);
  bub('tess', 'kitten', 1, t, { sz: 1.0 });
  const ks = [['k1', -12, 5.4, Math.PI], ['k2', -8, 5.4, Math.PI], ['k3', -10, -5.4, 0], ['k4', -6, -5.4, 0], ['k5', -14, -5.4, 0]];
  ks.forEach(([k, x, z, y], i) => { const q = W[k], p = at(LU, x, 0, z); sitAt(q, p, y, R.seatY); q.torso.rotation.x = 0.05; lookAtP(q, H(c), 0.9); face(q, ['suspicious', 'angry', 'suspicious', 'smug', 'angry'][i], t, i * 0.3); aimArm(q, i % 2, at(p, 0, R.topY + 0.3, z > 0 ? -2 : 2), 0.8); });
}
// ---- the kitchen: Mom and the laundry basket ----
function poseBasket(t) {
  const E = EV, c = W.tess, m = W.mom, TP = at(KI, -4, 0, 7), MP = at(KI, -1.6, 0, 4.4);
  place(c, TP, 0.15); pose(c, 'idle', t); face(c, t > E.mom + 1.3 ? 'sad' : 'nervous', t, 0.3); c.neck.rotation.x = 0.05;
  place(m, MP, 0.1); pose(m, 'idle', t); face(m, 'focused', t, 0.6);
  // the basket: up in Mom's hands, down onto Tess's head
  W.basket.visible = false; c.root.updateMatrixWorld(true); const wp = W.basket.getWorldPosition(v3());
  const u = smooth(E.mom + 0.2, E.mom + 1.3, t), from = H(m).add(v3(0, 1.4, 1.6)), arc = lp3(from, wp, u).add(v3(0, Math.sin(u * Math.PI) * 0.8, 0));
  W.bw.visible = u < 1; if (W.bw.visible) { W.bw.position.copy(arc); W.bw.rotation.set(0, c.root.rotation.y, 0); W.bw.scale.setScalar(c.spec.scale || 1); }
  W.basket.visible = u >= 1;
  aimArm(m, 0, arc.clone().add(v3(0.8, 0, 0)), 1); aimArm(m, 1, arc.clone().add(v3(-0.8, 0, 0)), 1);
  if (u >= 1) face(m, 'smug', t, 0.6);
  bub('tess', 'stilts', 1 - popK(t, E.mom + 1.25, 0.12), t, { sz: 0.95 });
}
// ---- the warnings ----
function poseBill(t) {   // townsfolk read the billboard; the eyes pop up over them
  const E = EV; [['t1', v3(18, 0, 19)], ['t2', v3(22, 0, 15)], ['t4', v3(15, 0, 15)]].forEach(([k, p], i) => { const c = W[k]; place(c, p, yawTo(p, BILL)); pose(c, 'idle', t + i); lookAtP(c, BILL.clone().add(v3(0, 9.5, 0)), 0.9); face(c, t > E.bill + i * 0.25 ? 'nervous' : 'neutral', t, i); bub(k, 'stilts', popK(t, E.bill + i * 0.25), t, { ph: i }); });
}
function poseBox(t) {   // a stack of warning boxes on the pizza counter, the top one opening
  const E = EV, pz = W.pizza, PP = W.sq.pizzaAt.clone().add(v3(-3.2, 0, 2.2)); place(pz, PP, -Math.PI / 2 - 0.4); pose(pz, 'idle', t); face(pz, 'happy', t, 0.4);
  W.boxes.forEach((b, i) => { b.visible = true; b.position.copy(PP).add(v3(-2.6, 3.2 + i * 0.44, -1.2)); b.rotation.y = 0.5 - 1.15; b.lid.rotation.x = 0; });
  W.table.visible = true; W.table.position.copy(PP).add(v3(-2.6, 0, -1.2));
}
function poseBlimp(t) { const s = (i) => L(i).start; W.blimp.visible = true; W.blimp.position.set(lerp(-30, -14, clamp((t - s(9)) / 4)), 46, -40); W.blimp.rotation.y = 0; }
function poseEmpty(t) { /* an empty square; only the counter climbs */ }
// ---- the porch: the pizza guy reads his own box ----
const DOOR = at(HOUSE, -3.5, 0.6, -7);
function posePorch(t) {
  const E = EV, s = (i) => L(i).start, pz = W.pizza, P0 = at(DOOR, 1.6, 0, -9), P1 = at(DOOR, 0.9, 0, -2.4);
  const u = walkTo(pz, P0, P1, s(11) - 1.2, s(11) + 0.5, t, 1.0); if (u >= 1) { place(pz, P1, Math.PI - 0.6); pose(pz, 'idle', t); }
  pz.root.position.y = lerp(0, 0.6, smooth(0.6, 0.85, u));
  const bx = W.boxes[0]; bx.visible = true; const read = smooth(E.read, E.read + 0.5, t) * (1 - smooth(E.eyes + 0.05, E.eyes + 0.35, t)), drop = smooth(E.eyes + 0.05, E.eyes + 0.35, t);
  pz.root.updateMatrixWorld(true); const f = fwd(pz), hp = H(pz).add(f.clone().multiplyScalar(1.7 - drop * 0.4)).add(v3(0, -2.3 + read * 0.4 - drop * 1.0, 0));
  bx.position.copy(hp).add(v3(0, -0.2, 0)); bx.rotation.set(-read * 0.9, pz.root.rotation.y + Math.PI, 0); bx.lid.rotation.x = 0;
  aimArm(pz, 0, hp.clone().add(f.clone().cross(v3(0, 1, 0)).multiplyScalar(-1.1)), 1); aimArm(pz, 1, hp.clone().add(f.clone().cross(v3(0, 1, 0)).multiplyScalar(1.1)), 1);
  pz.neck.rotation.x = 0.35 * read; face(pz, t > E.eyes + 0.3 ? 'shocked' : read > 0.5 ? 'focused' : 'happy', t, 0.4, { noBlink: t > E.eyes });
  bub('pizza', 'stilts', popK(t, E.eyes), t, { dx: 0, sz: 0.85, off: fwd(pz, 2.0).add(v3(0, -1.6, 0)) });
}
function poseDoorTess(t) {   // the door opens: Tess in her basket, and the eyes over the pizza guy
  const E = EV, s = (i) => L(i).start; posePorch(t);
  W.sq.house.door.rotation.y = 1.7 * smooth(E.door, E.door + 0.6, t);
  const c = W.tess, TP = at(DOOR, 0, 0, -0.35); place(c, TP, Math.PI); W.sq.house.doorway.visible = true; pose(c, 'idle', t); W.basket.visible = true;
  const r = smooth(s(12) + 1.0, s(12) + 1.6, t); face(c, r > 0.5 ? 'surprised' : 'nervous', t, 0.3, { noBlink: r > 0.3 && r < 0.9 }); lookAtP(c, W.bub.pizza.position.y > 0 ? H(W.pizza).add(v3(0, 3.5, 0)) : H(W.pizza), 0.8);
}
const ROOFB = [v3(-18, 15, -28), v3(-15, 12, -2), v3(-13, 11, 18), v3(18, 16, -26), v3(15, 13, 0), v3(13, 11, 20), v3(-7, 21, -40), v3(8, 20, -42)];
function poseRoofBubbles(t, kindAt) { ROOFB.forEach((p, i) => freeBub(i, p.clone().add(v3(0, Math.sin(t * 1.3 + i) * 0.3, 0)), kindAt(i), 1, t)); }
function poseClimb(t) {   // up the ladder, the megaphone hooked on her arm
  const E = EV, c = W.tess, hs = W.sq.house, base = at(HOUSE, 8.0, 0, -7 - 2.4), tilt = hs.ladderTilt;
  const u = smooth(E.climb0, E.climb1, t), y = u * (hs.roofY + 0.2), along = v3(0, Math.cos(tilt), Math.sin(tilt));
  const onTop = u >= 0.999;
  if (!onTop) { const p = base.clone().add(along.clone().multiplyScalar(y / Math.cos(tilt))).add(v3(0, 0, -1.0)); place(c, p, 0); pose(c, 'idle', t); const ph = t * 7; c.legs[0].rotation.x = -0.5 - Math.max(0, Math.sin(ph)) * 0.6; c.legs[1].rotation.x = -0.5 - Math.max(0, -Math.sin(ph)) * 0.6; c.arms[0].rotation.x = -2.6 + Math.sin(ph) * 0.3; c.arms[1].rotation.x = -2.6 - Math.sin(ph) * 0.3; c.neck.rotation.x = -0.3; }
  else { place(c, at(HOUSE, 6.0, hs.roofY, -4.5), Math.PI); pose(c, 'idle', t); }
  W.basket.visible = true; face(c, 'focused', t, 0.3);
  const mg = W.mega; mg.visible = true; c.root.updateMatrixWorld(true); mg.position.copy(handOf(c, 1)).add(v3(0, -0.3, 0)); mg.rotation.set(Math.PI / 2, 0, 0);
}
function poseShout(t, wide = false) {
  const E = EV, s = (i) => L(i).start, c = W.tess, hs = W.sq.house, TP = at(HOUSE, 1.5, hs.roofY, -5.2);
  place(c, TP, Math.PI); pose(c, 'idle', t); W.basket.visible = true; c.torso.rotation.x = -0.08; c.neck.rotation.x = -0.12;
  const mg = W.mega; mg.visible = true; const f = fwd(c), side = v3(f.z, 0, -f.x), mouth = H(c).add(v3(0, -0.8, 0)).add(f.clone().multiplyScalar(0.6)).add(side.clone().multiplyScalar(-0.6));
  mg.position.copy(mouth); mg.lookAt(mouth.clone().add(f).add(v3(0, 0.12, 0)));
  aimArm(c, 1, mouth.clone().add(f.clone().multiplyScalar(0.3)).add(v3(-0.1, -0.35, 0)), 1);
  if (t < s(14) + 0.2) aimArm(c, 0, H(c).add(v3(0, 1.5, 0)).add(f.clone().multiplyScalar(0.6)), 0.0); else { aimArm(c, 0, H(c).add(v3(1.6, 1.4 + Math.sin(t * 6) * 0.3, 0)).add(f.clone().multiplyScalar(0.8)), 0.9); }
  face(c, 'grin', t, 0.3, { viseme: talk(14, t) });
  bub('tess', 'tutu', popK(t, E.swap), t, { sz: 1.0, dx: -1.2 });
  poseRoofBubbles(t, (i) => (t > E.swap + 0.15 * i ? 'tutu' : 'stilts'));
}
// ---- he arrives ----
const MON = v3(0, 0, 10);
function poseAppear(t) {
  const E = EV, m = W.mon; m.visible = true; m.position.copy(MON); m.rotation.y = 0; m.tutu.visible = true; m.shoes.visible = true;
  const k = popK(t, E.appear, 0.45); m.scale.setScalar(Math.max(0.001, k < 1 ? k * 1.08 : 1)); m.eyeOpen = 1; m.eyes.forEach((e) => { e.open = 1; });
  m.pose(t, { arms: 'creep', armK: 0.4, bow: 0.05 }); m.look(at(MON, 0, 6, 20));
  if (W.pop) W.pop.update(t); if (W.glit) { W.glit.visible = true; W.glit.position.copy(MON); W.glit.update(t); }
  // townsfolk peek out of the shops, frozen
  [['t1', v3(-34, 0, 2), 'shocked'], ['t2', v3(-33, 0, -24), 'scared'], ['t5', v3(33, 0, 4), 'shocked'], ['t6', v3(34, 0, 24), 'surprised'], ['t7', v3(-33, 0, 24), 'shocked'], ['t8', v3(33, 0, -22), 'scared']].forEach(([k, p, fc], i) => { const c = W[k]; place(c, p, yawTo(p, MON)); pose(c, 'idle', t); c.root.position.y = 0; face(c, fc, t, i, { noBlink: true }); lookAtP(c, at(MON, 0, 9, 0), 0.9); bub(k, 'tutu', 1, t, { ph: i }); });
  const mm = W.mayor, MP = at(PODIUM, 0, 0.6, -1.8); place(mm, MP, 0); pose(mm, 'idle', t); face(mm, 'shocked', t, 0.5, { noBlink: true }); lookAtP(mm, at(MON, 0, 9, 0), 0.9);
}
function poseDance(t) {   // he tap-dances along the front of the podium; the mayor faints
  const E = EV, s = (i) => L(i).start, m = W.mon; m.visible = true; m.tutu.visible = true; m.shoes.visible = true; m.scale.setScalar(1); m.eyeOpen = 1; m.eyes.forEach((e) => { e.open = 1; });
  const u = clamp((t - s(16) + 0.2) / 3.0), x = lerp(-14, 9, u), spin = smooth(E.faint - 0.5, E.faint + 0.3, t);
  m.position.set(x, 0, -22); m.rotation.y = Math.PI / 2 + spin * Math.PI * 2 - 0.5;
  m.pose(t, { tap: 1, arms: 'wide', tapRate: 10 }); m.look(at(PODIUM, 0, 5, 0));
  const mm = W.mayor, MP = v3(5, 0, -27), fk = smooth(E.faint, E.faint + 0.55, t); place(mm, MP, Math.PI * 0.05); pose(mm, 'idle', t);
  mm.root.rotation.x = -fk * 1.5; mm.root.position.y = fk * 0.55; mm.root.position.z = MP.z - fk * 0.2;
  if (fk > 0) { mm.arms[0].rotation.z = -0.6 * fk; mm.arms[1].rotation.z = 0.6 * fk; }
  face(mm, fk > 0.4 ? 'sleepy' : 'shocked', t, 0.5, { closed: fk > 0.4, noBlink: fk <= 0.4 }); if (fk < 0.4) lookAtP(mm, H2(m), 0.9);
  [['t1', v3(-20, 0, -8)], ['t5', v3(16, 0, -8)], ['t2', v3(-8, 0, -6)], ['t6', v3(6, 0, -5)]].forEach(([k, p], i) => { const c = W[k]; place(c, p, yawTo(p, m.position)); pose(c, 'idle', t + i); face(c, t > E.faint + 0.4 ? 'grin' : 'surprised', t, i); lookAtP(c, at(m.position, 0, 8, 0), 0.8); });
}
const H2 = (m) => { m.updateMatrixWorld(true); return m.head.getWorldPosition(v3()); };
// ---- birthday party ----
const PARTY = v3(16, 0, 22);
function poseParty(t) {
  const s = (i) => L(i).start, m = W.mon; W.sq.party.visible = true; W.sq.party.position.copy(PARTY);
  m.visible = true; m.tutu.visible = true; m.shoes.visible = true; m.scale.setScalar(1); m.eyeOpen = 1; m.eyes.forEach((e) => { e.open = 1; });
  m.position.copy(PARTY).add(v3(-9, 0, 1)); m.rotation.y = Math.PI / 2 - 0.2 + Math.sin(t * 1.6) * 0.5; m.pose(t, { tap: 0.8, arms: 'up', armK: 0.8 + Math.sin(t * 4) * 0.2, tapRate: 8 }); m.look(at(PARTY, 0, 3, 8));
  const spots = [[-5, 4.5], [-2, 5.5], [2, 5.4], [5, 4.6], [-7.5, 6.5]];
  KIDS.forEach((k, i) => { const c = W[k], p = PARTY.clone().add(v3(spots[i][0], 0, spots[i][1])); place(c, p, yawTo(p, m.position) * 0.6 + Math.PI * 0.4 * 0); c.root.rotation.y = yawTo(p, m.position); pose(c, 'idle', t + i); const j = Math.max(0, Math.sin(t * 7 + i * 1.3)); c.root.position.y = j * 0.5; c.arms[0].rotation.z = -2.5 - j * 0.3; c.arms[1].rotation.z = 2.5 + j * 0.3; face(c, ['grin', 'happy', 'grin', 'happy', 'grin'][i], t, i); lookAtP(c, H2(m), 0.7); W.hats[i].visible = true; });
  const c = W.tess, TP = PARTY.clone().add(v3(-7, 0, 9)); place(c, TP, yawTo(TP, m.position)); pose(c, 'idle', t); W.hats[5].visible = true; face(c, 'grin', t, 0.3); aimArm(c, 1, H(c).add(v3(0, 2, 0)), 0.9); c.arms[1].rotation.z += Math.sin(t * 8) * 0.2;
}
// ---- night: a long green finger at Tess's window ----
function poseNightOut(t) {
  const E = EV, m = W.mon; m.visible = true; m.tutu.visible = true; m.shoes.visible = true; m.scale.setScalar(1); m.eyeOpen = 1; m.eyes.forEach((e) => { e.open = 1; });
  const win = at(HOUSE, -4.5, 11.0, -7.4); m.position.copy(at(HOUSE, -2.6, 0, -13.2)); m.rotation.y = yawTo(m.position, win) + 0.25;
  const tk = Math.max(0, Math.sin((t - E.tap) * 11)) * (t > E.tap ? 1 : 0);
  m.pose(t, { reach: win.clone().add(v3(0.4, 0.2 + tk * 0.0, -0.3 - 0.35 * tk)), tapK: tk, bow: 0.18, headTilt: 0.2 }); m.look(win);
  W.sq.house.upWin.material.emissiveIntensity = 1.6;
}
function poseNightIn(t) {
  const E = EV, s = (i) => L(i).start, R = W.br, c = W.tess, WX = R.winX, WZ = -R.size.d / 2;
  const TP = at(BR, WX + 3.2, 0, WZ + 3.0); place(c, TP, yawTo(TP, at(BR, -6, 0, 5))); pose(c, 'idle', t); face(c, 'grin', t, 0.3);
  lookAtP(c, at(BR, WX, 7.6, WZ - 1), 0.75 * (1 - smooth(s(18) + 2.3, s(18) + 2.7, t)));
  const up = smooth(s(18) + 2.6, s(18) + 3.1, t); if (up > 0) { aimArm(c, 0, H(c).add(v3(-0.8, 2.2, 0.3)), up); aimArm(c, 1, H(c).add(v3(0.8, 2.2, 0.3)), up); c.root.rotation.y += Math.sin(t * 6) * 0.25 * up; }
  bub('tess', 'tutu', popK(t, s(18) + 2.4), t, { sz: 0.9, dx: -1.0 });
  // him outside, stooped to the window, tapping the glass
  const m = W.mon; m.visible = true; m.tutu.visible = true; m.shoes.visible = true; m.scale.setScalar(1); m.eyeOpen = 1; m.eyes.forEach((e) => { e.open = 1; });
  m.position.copy(at(BR, WX + 0.6, -5.6, WZ - 3.0)); m.rotation.y = 0.05;
  const tk = Math.max(0, Math.sin((t - E.tap) * 11)) * (t > E.tap ? 1 : 0) * (1 - smooth(s(18) + 2.4, s(18) + 2.8, t));
  m.pose(t, { reach: at(BR, WX - 0.4, 7.4, WZ - 0.25 + 0.0 - 0.3 * (1 - tk)), tapK: tk, bow: 0.12 }); m.look(H(c));
}

// ---- Tess's bedroom at night: a real window hole in the back wall (z = -12), x -3.75..3.75, y 4.5..10.3 ----
function nightRoom() {
  const g = new THREE.Group(), w = 30, d = 24, h = 15, wall = new THREE.MeshStandardMaterial({ color: '#d7c9ff', roughness: 0.8 }), trim = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.5 });
  const bx = (m, sx, sy, sz, x, y, z) => { const q = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); q.position.set(x, y, z); q.castShadow = q.receiveShadow = true; g.add(q); return q; };
  bx(new THREE.MeshStandardMaterial({ color: '#c99a66', roughness: 0.7 }), w, 0.2, d, 0, -0.1, 0);
  const Z = -d / 2 - 0.3; bx(wall, (w - 7.5) / 2, h, 0.6, -(w + 7.5) / 4, h / 2, Z); bx(wall, (w - 7.5) / 2, h, 0.6, (w + 7.5) / 4, h / 2, Z); bx(wall, 7.5, 4.5, 0.6, 0, 2.25, Z); bx(wall, 7.5, h - 10.3, 0.6, 0, (h + 10.3) / 2, Z);
  bx(wall, 0.6, h, d, -w / 2 - 0.3, h / 2, 0); bx(wall, 0.6, h, d, w / 2 + 0.3, h / 2, 0); bx(new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.85 }), w, 0.3, d, 0, h + 0.15, 0);
  bx(trim, 8.3, 0.4, 0.9, 0, 4.3, Z + 0.3); bx(trim, 8.3, 0.4, 0.8, 0, 10.5, Z + 0.2); bx(trim, 0.4, 6.2, 0.8, -3.95, 7.4, Z + 0.2); bx(trim, 0.4, 6.2, 0.8, 3.95, 7.4, Z + 0.2); bx(trim, 0.18, 5.8, 0.2, 0, 7.4, Z - 0.1); bx(trim, 7.5, 0.18, 0.2, 0, 7.4, Z - 0.1);
  const cu = new THREE.MeshStandardMaterial({ color: '#ffcf4a', roughness: 0.85 }); bx(cu, 1.4, 7.2, 0.35, -4.9, 7.3, Z + 0.7); bx(cu, 1.4, 7.2, 0.35, 4.9, 7.3, Z + 0.7);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 5.8), new THREE.MeshStandardMaterial({ color: '#bcd6ff', transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.2 })); gl.position.set(0, 7.4, Z); gl.userData.noAO = true; g.add(gl);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(140, 90), new THREE.MeshBasicMaterial({ fog: false, map: canvasTex(512, 340, (x, W2, H2) => { const gr = x.createLinearGradient(0, 0, 0, H2); gr.addColorStop(0, '#0a1334'); gr.addColorStop(1, '#2b3d7a'); x.fillStyle = gr; x.fillRect(0, 0, W2, H2); const r = rng(9); x.fillStyle = '#fffbe0'; for (let i = 0; i < 160; i++) x.fillRect(r() * W2, r() * H2 * 0.8, 1.5, 1.5); x.beginPath(); x.arc(W2 * 0.7, H2 * 0.25, 22, 0, 7); x.fill(); }) })); sky.position.set(0, 10, -60); sky.userData.noAO = true; g.add(sky);
  const bed = bx(new THREE.MeshStandardMaterial({ color: '#ff8a5c', roughness: 0.9 }), 8, 2.4, 13, -10, 1.2, -3); bx(new THREE.MeshStandardMaterial({ color: '#d79b5c', roughness: 0.6 }), 8.6, 5.5, 0.6, -10, 2.75, -9.8); bx(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), 5, 1, 2.4, -10, 2.9, -8); void bed;
  const ll = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc46a').multiplyScalar(2) })); ll.position.set(10, 5, -10); ll.userData.noAO = true; g.add(ll);
  bx(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), 3, 3, 2.4, 10, 1.5, -10);
  g.winX = 0; g.size = { w, d, h }; return g;
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  add('open', 0, (u) => ({ pos: lp3(v3(9, 7.5, 34), v3(8, 7.0, 31), easeInOut(u)), look: lp3(v3(-1, 8, -16), v3(-1, 8.5, -20), u), fov: 58 }));
  add('heads', 1.9, (u) => { const h = H(W.t3); return { pos: h.clone().add(v3(-5.5 + u * 0.6, 0.6, 9.5)), look: h.clone().add(v3(1.0, 1.3, 0)), fov: 54 }; });
  add('rule', s(1) - 0.04, (u) => ({ pos: lp3(v3(5, 4.5, 16), v3(4, 4.8, 14), easeInOut(u)), look: lp3(v3(-10, 7.5, -6), v3(-12, 8.5, -10), u), fov: 60 }));
  add('drop', E.drop - 0.75, (u) => ({ pos: lp3(v3(-9, 10, 4), v3(-10, 9.5, 2), u), look: DONUT.clone().add(v3(0, 4.5, 0)), fov: 56 }));
  add('tess', s(2) - 0.04, (u, t) => { const h = H(W.tess); return { pos: h.clone().add(v3(-2.2, -0.3, -11.0)), look: h.clone().add(v3(0.2, 0.5, 0)), fov: 62 }; });
  add('dream', s(3) - 0.04, (u) => ({ pos: lp3(at(DR, 2, 2.8, 19), at(DR, 1.6, 3.4, 16), easeInOut(u)), look: at(DR, 0, 6.2, 0), fov: 52 }));
  add('eyes', s(3) + 1.95, (u) => { const h = H2(W.mon); return { pos: h.clone().add(v3(0.5, -0.3, 5.6 - u * 0.8)), look: h.clone().add(v3(0, -0.3, 0)), fov: 50 }; });
  add('tower', s(4) - 0.04, (u) => ({ pos: lp3(v3(10, 4, -14), v3(9, 3.6, -16), easeInOut(u)), look: lp3(at(TOWER, 0, 12, 5), at(TOWER, 0, 22, 5), easeInOut(u)), fov: 54 }));
  add('class', s(5) - 0.04, (u) => ({ pos: lp3(at(CL, 9, 7.5, 18), at(CL, 7.5, 7.0, 15), easeInOut(u)), look: at(CL, 0, 4.5, 2), fov: 56 }));
  add('daydream', s(5) + 1.7, (u) => { const h = H(W.tess); return { pos: h.clone().add(v3(1.4 - u * 0.3, 1.5, -4.4)), look: h.clone().add(v3(-0.1, 1.15, 0)), fov: 66 }; });
  add('click', s(6) - 0.04, (u) => ({ pos: at(W.sq.counterAt, 0.6, -4.5, 21 - u * 1.5), look: W.sq.counterAt.clone().add(v3(0, -3.6, 0)), fov: 50 }));
  add('scream', E.scream - 0.1, (u) => { const h = H(W.tess); return { pos: h.clone().add(v3(-2.4 + u * 0.3, 1.7, -4.6 + u * 0.3)), look: h.clone().add(v3(0.2, 1.3, 0)), fov: 68 }; });
  add('mayor', s(7) - 0.04, (u) => { const h = H(W.mayor); return { pos: h.clone().add(v3(-3.0 + u * 0.4, 0.6, 7.0 - u * 0.6)), look: h.clone().add(v3(0, -0.9, 0)), fov: 54 }; });
  add('forty', s(8) - 0.04, (u) => ({ pos: at(W.sq.counterAt, -0.6, -4.5, 21 - u * 1.5), look: W.sq.counterAt.clone().add(v3(0, -3.6, 0)), fov: 50 }));
  add('lunch', E.blamed - 0.2, (u) => ({ pos: lp3(at(LU, -1, 5.0, 2.5), at(LU, 0, 4.9, 2.6), easeInOut(u)), look: at(LU, 13, 3.0, 5.4), fov: 44 }));
  add('basket', E.mom - 0.25, (u) => { const h = H(W.tess); return { pos: h.clone().add(v3(3.4, 0.8, 9.5 - u * 0.6)), look: h.clone().add(v3(-0.4, 0.4, -1.6)), fov: 58 }; });
  add('bill', s(9) - 0.04, (u) => ({ pos: lp3(v3(12, 4, 32), v3(13, 4.4, 30), u), look: BILL.clone().add(v3(-1, 6.5, -4)), fov: 58 }));
  add('box', E.box - 0.3, (u) => { const b = W.boxes[2].position; return { pos: b.clone().add(v3(-2.6 + u * 0.3, 4.6, 3.8 - u * 0.4)), look: b.clone().add(v3(0, -0.6, 0)), fov: 50 }; });
  add('blimp', E.blimp, (u) => ({ pos: v3(4, 3, 4), look: lp3(v3(-16, 30, -40), v3(-12, 40, -40), easeInOut(u)), fov: 58 }));
  add('c150', s(10) - 0.04, (u) => ({ pos: lp3(v3(2, 3.2, 26), v3(1.5, 3.8, 23), easeInOut(u)), look: at(TOWER, 0, 16, 0), fov: 54 }));
  add('c199', E.c199 - 0.05, (u) => ({ pos: at(W.sq.counterAt, 0.4, -4.5, 21 - u * 1.5), look: W.sq.counterAt.clone().add(v3(0, -3.6, 0)), fov: 50 }));
  add('porch', s(11) - 0.04, (u) => { const p = W.pizza.root.position; return { pos: p.clone().add(v3(7.5, 4.6, -1.0 - u * 0.5)), look: p.clone().add(v3(0, 3.4, 0.6)), fov: 56 }; });
  add('popeyes', E.eyes - 0.35, (u) => { const h = H(W.pizza); return { pos: h.clone().add(v3(5.6, 0.2, -6.6 + u * 0.5)), look: h.clone().add(v3(-0.3, -0.1, 0)), fov: 68 }; });
  add('realize', s(12) - 0.04, (u) => { const h = H(W.tess); return { pos: h.clone().add(v3(-4.4, 0.4, -7.0 + u * 0.6)), look: h.clone().add(v3(0.6, 0.6, 0)), fov: 58 }; });
  add('rooftops', s(12) + 1.6, (u) => ({ pos: lp3(v3(-2, 8, 30), v3(-1, 10, 27), easeInOut(u)), look: v3(0, 15, -14), fov: 62 }));
  add('climb', s(13) - 0.04, (u) => ({ pos: lp3(at(HOUSE, -4, 7, -24), at(HOUSE, -3, 12, -22), easeInOut(u)), look: lp3(at(HOUSE, 6, 6, -7), at(HOUSE, 6, 15, -7), easeInOut(u)), fov: 58 }));
  add('shout', s(14) - 0.04, (u) => { const h = H(W.tess); return { pos: h.clone().add(v3(-2.6 + u * 0.4, 0.2, -6.8 + u * 0.6)), look: h.clone().add(v3(0.2, -0.6, 0)), fov: 58 }; });
  add('change', E.swap - 0.3, (u) => ({ pos: lp3(at(HOUSE, 9.0, 27.5, 8), at(HOUSE, 8.0, 27.0, 5), easeInOut(u)), look: v3(0, 13, -24), fov: 62 }));
  add('two', s(15) - 0.04, (u) => ({ pos: at(W.sq.counterAt, 0, -4.5, 21 - u * 1.5), look: W.sq.counterAt.clone().add(v3(0, -3.6, 0)), fov: 50 }));
  add('appear', E.appear - 0.3, (u) => ({ pos: lp3(at(MON, 2.4, 2.4, 17), at(MON, 2.0, 2.2, 14.5), easeInOut(u)), look: at(MON, 0, 6.0, 0), fov: 60 }));
  add('crowd', s(15) + 3.4, (u) => ({ pos: lp3(v3(-24, 6.5, 22), v3(-22, 6.5, 19), easeInOut(u)), look: at(MON, 0, 6, -2), fov: 60 }));
  add('dance', s(16) - 0.04, (u) => ({ pos: lp3(v3(10, 5.0, -2), v3(15, 5.0, -4), easeInOut(u)), look: lp3(v3(-8, 5.2, -24), v3(4, 4.8, -25), easeInOut(u)), fov: 60 }));
  add('party', s(17) - 0.04, (u) => ({ pos: lp3(at(PARTY, -1, 6.0, 25), at(PARTY, -2, 5.8, 22), easeInOut(u)), look: at(PARTY, -5, 5.2, 2.5), fov: 60 }));
  add('night', s(18) - 0.04, (u) => ({ pos: lp3(at(HOUSE, -17, 5.0, -20), at(HOUSE, -16, 5.4, -18.5), easeInOut(u)), look: at(HOUSE, -3.5, 8.5, -9), fov: 58 }));
  add('window', s(18) + 2.15, (u) => ({ pos: lp3(at(BR, -6.4, 4.8, 5.6), at(BR, -5.8, 4.8, 4.6), easeInOut(u)), look: at(BR, 0.6, 4.7, -8.5), fov: 62 }));
  Sx.sort((a, b) => a.t0() - b.t0());
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}

const KEYS = { open: 'open', heads: 'open', rule: 'rule', drop: 'rule', tess: 'tess', dream: 'dream', eyes: 'dream', tower: 'tower', class: 'class', daydream: 'class', click: 'counter', scream: 'scream',
  mayor: 'mayor', forty: 'counter', lunch: 'lunch', basket: 'basket', bill: 'bill', box: 'box', blimp: 'blimp', c150: 'empty', c199: 'counter', porch: 'porch', popeyes: 'porch', realize: 'door', rooftops: 'rooftops',
  climb: 'climb', shout: 'shout', change: 'shout', two: 'counter', appear: 'appear', crowd: 'appear', dance: 'dance', party: 'party', night: 'nightout', window: 'nightin' };
const SET = { open: 'sq', rule: 'sq', tess: 'sq', dream: 'dr', tower: 'sq', class: 'cl', counter: 'sq', scream: 'cl', mayor: 'sq', lunch: 'lu', basket: 'ki', bill: 'sq', box: 'sq', blimp: 'sq', empty: 'sq', porch: 'sq', door: 'sq', rooftops: 'sq',
  climb: 'sq', shout: 'sq', appear: 'sq', dance: 'sq', party: 'sq', nightout: 'sqn', nightin: 'br' };

function renderAt(t) {
  let sh = shotAt(W.shots, t); const key = KEYS[sh.name], set = SET[key];
  const env = { sq: SUN, cl: ROOM, lu: ROOM, ki: ROOM, dr: DREAM, sqn: NIGHT, br: ROOMN }[set];
  applyEnv(ctx, env);
  const E = EV, s = (i) => L(i).start, night = set === 'sqn' || set === 'br';
  W.sq.visible = set === 'sq' || set === 'sqn'; W.cl.visible = set === 'cl'; W.lu.visible = set === 'lu'; W.ki.visible = set === 'ki'; W.br.visible = set === 'br'; W.dream.visible = set === 'dr';
  W.pt.forEach((l) => { l.intensity = l.userData.set === set ? l.userData.I : 0; });
  WIN.emissiveIntensity = night ? 1.1 : 0; W.sq.lamps.forEach((l) => { l.children.forEach((q) => { if (q.material && q.material.isMeshBasicMaterial) q.material.color.set('#ffe2a8').multiplyScalar(night ? 3 : 0.9); }); }); W.sq.house.upWin.material.emissiveIntensity = 0;
  hideAll(); W.liveB = []; Object.values(W.bub).forEach((b) => { b.visible = false; }); W.fb.forEach((b) => { b.visible = false; });
  W.mon.visible = false; W.mon.scale.setScalar(1); W.bw.visible = false; W.mega.visible = false; W.blimp.visible = t > E.blimp - 0.2 && set === 'sq' && t < s(15); W.boxes.forEach((b) => { b.visible = false; }); W.table.visible = false; if (W.glit) W.glit.visible = false;
  // the warnings go up after the mayor; the donut stays once it lands
  W.sq.banner.visible = t > s(7) - 0.5 && t < s(17); W.sq.podium.visible = t > s(7) - 0.5 && t < s(17); W.sq.billboard.visible = t > s(9) - 0.3; W.sq.posters.forEach((p) => { p.visible = t > s(9) - 0.3; });
  W.sq.donut.visible = t > E.drop - 1.2; W.sq.donut.position.copy(DONUT); W.sq.donut.scale.setScalar(1); W.sq.party.visible = false; W.sq.house.door.rotation.y = 0;
  W.sq.counter.set(cnt(t), t > E.two && t < E.two + 1.6 ? (Math.floor((t - E.two) * 6) % 2 ? 0 : 1) : 0);
  if (night) { W.blimp.visible = false; }
  if (blimpOn(t, set)) poseBlimp(t);
  const tt = { open: () => poseOpen(t), rule: () => poseRule(t), tess: () => poseTessWalk(t), dream: () => poseDream(t), tower: () => poseTower(t), class: () => poseClass(t, 0), counter: () => {}, scream: () => poseClass(t, smooth(E.scream - 0.1, E.scream + 0.3, t)),
    mayor: () => poseMayor(t), lunch: () => poseLunch(t), basket: () => poseBasket(t), bill: () => poseBill(t), box: () => poseBox(t), blimp: () => { poseBill(t); }, empty: () => poseEmpty(t), porch: () => posePorch(t), door: () => poseDoorTess(t),
    rooftops: () => { poseDoorTess(t); poseRoofBubbles(t, () => 'stilts'); }, climb: () => { poseClimb(t); poseRoofBubbles(t, () => 'stilts'); }, shout: () => poseShout(t), appear: () => poseAppear(t), dance: () => poseDance(t), party: () => poseParty(t), nightout: () => poseNightOut(t), nightin: () => poseNightIn(t) }[key];
  tt();
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2, 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * (c.spec.scale || 1); c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2], Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  if (ctx.thumbMode) sh = { ...sh, pos: at(MON, 3, 5, 19), look: at(MON, 0, 10.2, 0), fov: 62 };   // thumbnail: his face below the title
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  W.liveB.forEach((b) => b.face(sh.pos));
  frame(ctx, t, sh, { steady: t < 2.4 || Q.get('steady') === '1', shake: 0, shadowSpan: set === 'sq' || set === 'sqn' ? 90 : 50, shadows: true, black: 0 });
  return sh.name;
}
const blimpOn = (t, set) => set === 'sq' && t > EV.blimp - 0.2 && t < L(15).start;

export async function setup() {
  ctx = await initStage('ep113', { look: 'pro', avatars: [...new Set(Object.values(AV).map((a) => a[0]))] }); L = ctx.L;
  try { CAP = (await (await fetch('/build/ep113/timeline.json')).json()).captions || []; } catch (e) { CAP = []; }
  EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'smirk', 'grin', 'focused', 'shocked', 'surprised', 'nervous', 'scared', 'angry', 'sleepy', 'suspicious', 'blink']);
  const { scene, camera } = ctx; camera.far = 2600; camera.near = 0.1; camera.updateProjectionMatrix();
  W.sq = bramblewick(); scene.add(W.sq);
  W.cl = classroom(); W.cl.position.copy(CL); scene.add(W.cl);
  { const brd = new THREE.Mesh(new THREE.PlaneGeometry(31, 9.2), new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(1240, 368, (x, w, h) => { x.fillStyle = '#21543f'; x.fillRect(0, 0, w, h); x.fillStyle = '#f4f2e6'; x.font = '900 72px ITTInter, sans-serif'; x.textBaseline = 'middle'; x.fillText('LONG DIVISION', 80, 90); x.font = '700 58px ITTInter, sans-serif'; x.fillStyle = '#ffe58f'; x.fillText('846 ÷ 6 = ?', 84, 200); x.fillText('912 ÷ 8 = ?', 84, 290); x.fillStyle = '#f4f2e6'; x.font = '700 44px ITTInter, sans-serif'; x.fillText('Math, Monday', 820, 300); }) })); brd.position.copy(CL).add(v3(0, 9.4, -21 + 0.6)); brd.userData.noAO = true; scene.add(brd); W.cl.add(brd); brd.position.set(0, 9.4, -21 + 0.6); }
  W.lu = lunchroom(); W.lu.position.copy(LU); scene.add(W.lu);
  W.ki = houseRoom(); W.ki.position.copy(KI); scene.add(W.ki); if (W.ki.highChair) W.ki.highChair.visible = false;
  W.br = nightRoom(); W.br.position.copy(BR); scene.add(W.br);
  W.dream = dreamscape(); W.dream.position.copy(DR); scene.add(W.dream);
  W.mon = stilts(); scene.add(W.mon); W.mon.visible = false;
  const PL = (c, I, d, set, p) => { const l = new THREE.PointLight(c, I, d, 1.5); if (p) l.position.copy(p); l.userData.I = I; l.userData.set = set; scene.add(l); return l; };
  W.pt = [PL('#fff0d8', 560, 60, 'cl', at(CL, 0, 15, -2)), PL('#fff0d8', 560, 60, 'lu', at(LU, 0, 15, 0)), PL('#fff0d8', 420, 60, 'ki', at(KI, -4, 13, 6)), PL('#ffd9a0', 160, 40, 'br', at(BR, 9, 9, -6)), PL('#9fb4ff', 60, 40, 'br', at(BR, 0, 9, -16)), PL('#ffd9a0', 120, 30, 'br', at(BR, -3, 6.5, -1)),
    PL('#ff9ae6', 320, 60, 'dr', at(DR, -8, 10, 10)), PL('#7ad0ff', 260, 60, 'dr', at(DR, 9, 12, -6)), PL('#ffcf7a', 220, 40, 'sqn', at(HOUSE, -4.5, 11, -10)), PL('#ffcf8a', 140, 40, 'sqn', v3(-24, 11, 36)), PL('#ffcf8a', 140, 40, 'sqn', v3(24, 11, 36))];
  W.pop = burst(scene, { pos: MON.clone().add(v3(0, 1, 0)), color: '#ff8ad8', count: 160, spread: 6, height: 10, dur: 1.6, bright: 1.6, seed: 4 }).fire(0); W.glit = sparkles(scene, { count: 140, color: '#ffd6f4', size: 10, height: 12, centre: v3(0, 5, 0), pointSize: 0.5 }); W.glit.visible = false;
  people();
  W.bw = W.basket.clone(); W.bw.traverse((o) => { o.userData.worn = false; }); scene.add(W.bw); W.bw.visible = false;
  W.mega = megaphone(); scene.add(W.mega); W.mega.visible = false;
  W.blimp = blimp(); scene.add(W.blimp); W.blimp.visible = false;
  W.boxes = [pizzaBox(), pizzaBox(), pizzaBox()]; W.boxes.forEach((b) => { scene.add(b); b.visible = false; });
  { const tb = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#c9824a', roughness: 0.6 }); const top = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 3.2), m); top.position.y = 3.0; tb.add(top); for (const [x, z] of [[-2.2, -1.3], [2.2, -1.3], [-2.2, 1.3], [2.2, 1.3]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), m); l.position.set(x, 1.5, z); tb.add(l); } tb.rotation.y = 0.5; tb.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(tb); W.table = tb; tb.visible = false; }
  W.pop.fire(EV.appear);
  W.shots = shots();
  window.__ep113 = { W, THREE, ctx, L, EV };
  return expose(ctx, renderAt, EV.appear + 1.6, EV);
}
