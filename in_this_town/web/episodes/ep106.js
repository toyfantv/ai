// Flower Man remake 6: The Weight of the Truth. In Plumbwick every lie makes you lighter. Hattie Moss has never told one; her little brother Pip lies before breakfast.
// On Founders' Day a baseball smashes the Governor's glass peacock and the glove is on Pip's hand. One more lie and no belt could hold him, so Hattie says she did it: her first lie ever.
// The floor lets go, she rings off the dome, and four hours later the fire brigade fetches her down. Now she needs iron boots to cross the street; at sunset she takes them off and lies about the dishes, and Pip holds the rope.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DAY } from '../engine/stage.js';
import { clouds } from '../engine/atmos.js';
import { aimArm as aimArm0 } from '../engine/anims.js';
import { jointify } from '../engine/infinitetower.js';
import { glassShatter } from '../engine/gameshow.js';
import { foundersHall, glassPeacock, ironBoots, paperSlippers, diverBelt, mitt, rope, fireLadder, hallClock, auntSet, kitchenSet, courtroom, plumbwick, brookYard, cerealBox, looseBoots, lostSlipper } from '../engine/lighterlies.js';

const aimArm = (c, side, p, k = 1) => { c.root.updateMatrixWorld(true); aimArm0(c, side, p, k); };
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV;
const W = {};
const T = v3(800, 0, 0), YD = v3(-800, 0, 0), A = v3(0, 0, 800), K = v3(0, 0, -800), CR = v3(800, 0, 800);
const PL = v3(0, 0, -6), DAIS = v3(-11, 0, 1.4), HOME = { pip: v3(2, 0, 11), hat: v3(-2.4, 0, 12.6) }, LAUNCH = v3(1.9, 0, 8), GOV_END = v3(1.9, 0, 5.0);
const LIGHT = '#eec39a', TAN = '#c68642', DARK = '#7a4f30';
const AV = {
  hattie: ['farm_ep39_sophie_b', '#e8b48c'], pip: ['farm_red_kid', '#f2c79a'], gov: ['farm_rival_gold', '#8e5a3a'], mom: ['farm_classic_mom', LIGHT], auntie: ['farm_grandma', '#e8c4a4'], nephew: ['farm_daniel', LIGHT],
  cough: ['farm_hc_dex', DARK], judge: ['farm_hc_mayor_harmon', LIGHT], bailiff: ['farm_noob_cop', '#f6d84a'], n1: ['farm_suit_candidate', LIGHT], n2: ['farm_beanie_guy', DARK], n3: ['farm_skater_boi', LIGHT],
  kid1: ['farm_young_kid', LIGHT], kid2: ['farm_oliver', LIGHT], kid3: ['farm_lily_pink', LIGHT], f1: ['farm_hr_manager', LIGHT], f2: ['farm_ms_henderson', LIGHT], f3: ['farm_kai', TAN], holder: ['farm_jake', LIGHT], boy: ['farm_finn', LIGHT],
  c1: ['farm_mia', LIGHT], c2: ['farm_nia', DARK], c3: ['farm_omar', DARK], c4: ['farm_hc_maya', TAN], c5: ['farm_lily', LIGHT], c6: ['farm_zoe', LIGHT], c7: ['farm_leo', LIGHT], c8: ['farm_sam', LIGHT], c9: ['farm_ethan', LIGHT], c10: ['farm_noah', LIGHT], c11: ['farm_ava', '#e3a982'], c12: ['farm_jake_blue', LIGHT],
  w1: ['farm_ep39_worker_b', LIGHT], w2: ['farm_ep39_rescue_c', TAN], w3: ['farm_ep39_rescue_a', DARK],
};
const SCALE = { pip: 0.74, kid1: 0.72, kid2: 0.72, kid3: 0.72, boy: 0.78, hattie: 0.92 };
const BOOTED = ['pip', 'gov', 'mom', 'auntie', 'nephew', 'cough', 'kid1', 'kid2', 'kid3', 'f1', 'f2', 'f3', 'holder', 'boy', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'];

const SUN = { ...DAY, ...P({ top: '#3f9cf0', horizon: '#d6f0ff', haze: '#d4ecff', sunColor: '#fff1d6', hemiSky: '#d6edff', hemiGround: '#d6c49a' }), sunDir: v3(0.3, 0.86, 0.42), sunI: 2.0, sunDisc: 0.4, hemiI: 1.2, amb: 0.3, envI: 1.0, exposure: 1.0, bloom: 0.04, vig: 0, saturation: 1.22, contrast: 1.05, bounce: 0.18, fogNear: 300, fogFar: 1200, stars: 0, moon: 0, win: 0, lamp: 0 };
const ROOM = { ...SUN, ...P({ top: '#ffe7c2', horizon: '#ffe7c2', haze: '#ffe7c2', sunColor: '#ffe6c0', hemiSky: '#fff2dc', hemiGround: '#c8a070' }), sunDir: v3(0.6, 0.6, 0.6), sunI: 0.12, sunDisc: 0, hemiI: 1.35, amb: 0.5, envI: 0.7, saturation: 1.1, fogNear: 400, fogFar: 1200 };
const SET = { ...SUN, ...P({ top: '#7a6fc4', horizon: '#ffb36b', haze: '#ffc48a', sunColor: '#ffbf85', hemiSky: '#ffd9b4', hemiGround: '#b98a66' }), sunDir: v3(0.86, 0.2, 0.46), sunI: 2.2, sunDisc: 1.0, hemiI: 1.25, amb: 0.32, envI: 0.9, saturation: 1.24, contrast: 1.04, bloom: 0.03, fogNear: 220, fogFar: 900 };

function events() { const s = (i) => L(i).start; return { drape: s(8) + 1.5, ball: s(9) + 0.62, smash: s(9) + 1.28, court: s(3) + 2.08, belt: s(7) + 0.08, jolt: s(6) + 0.55, lift: s(16) + 0.32, go: s(17) + 0.24, hit: s(17) + 2.12, stepIn: s(14) - 0.42, unb: s(20) + 2.45, cough: s(2) + 0.35, risec: s(2) + 0.85, end: ctx.dur }; }

// ---- helpers ----
const armLen = (c) => { if (!c._alen) { c.reset(); c.root.updateMatrixWorld(true); const r = c.root.rotation.clone(), p = c.root.position.clone(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3().setFromObject(c.arms[0]); c._alen = sh.y - bx.min.y - 0.25; c.root.rotation.copy(r); c.root.position.copy(p); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); return c.arms[side].localToWorld(v3(0, -armLen(c), 0.12)); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.scale.setScalar(c._sc || 1); }
function place(c, p, yaw) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.position.y += (c._foot || 0); c.root.rotation.y = yaw; }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.noBlink ? false : blinkAt(t, ph), viseme: o.viseme }); }
const talk = (i, t) => (t > L(i).start && t < L(i).end ? visemeAt(L(i).text, L(i).start, L(i).end, t) : undefined);
const H = (c) => c.neck.getWorldPosition(v3()).add(v3(0, 0.8, 0));
function drift(c, t, k = 1, ph = 0) { c.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * k * (0.62 + Math.sin(t * 1.9 + ph + i) * 0.14); a.rotation.x = Math.sin(t * 1.4 + ph + i * 2) * 0.16 * k; }); c.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 1.7 + ph + i * 3) * 0.2 * k; }); c.knee?.forEach((q, i) => { q.rotation.x = (0.24 + Math.sin(t * 1.7 + ph + i * 3 + 1) * 0.12) * k; }); }
function walkTo(c, a, b, t0, t1, t, sp = 1, hold) { const u = clamp((t - t0) / (t1 - t0)); const p = lp3(a, b, u), mv = u > 0 && u < 1; place(c, p, mv ? yawTo(a, b) : (hold ?? yawTo(a, b))); pose(c, mv ? 'walk' : 'idle', t * sp); return mv; }
const anyVisible = () => {};

// ---- people ----
function people() {
  const mk = (k) => { const [avatar, skin] = AV[k], c = makeCharacter({ avatar, alti: true, skin, caustic: false }); ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c._sc = SCALE[k] || 1; c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c); return c; };
  for (const k of Object.keys(AV)) W[k] = mk(k);
  W.all = Object.keys(AV).map((k) => W[k]);
  for (const k of BOOTED) { W[k].boots = ironBoots(W[k]); W[k]._foot = 0.28 * (SCALE[k] || 1); }
  W.hattie.slip = paperSlippers(W.hattie); W.hattie.boots = ironBoots(W.hattie); W.hattie._foot = 0.1;
  W.belt = diverBelt(W.pip); W.mittG = mitt(W.pip, 1);
  { const c = W.hattie; c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0); c.root.updateMatrixWorld(true); W.hatH = new THREE.Box3().setFromObject(c.root).max.y; }
  { const m = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.1, 8, 16), new THREE.MeshStandardMaterial({ color: '#d9bd86', roughness: 0.85 })); m.rotation.x = Math.PI / 2; W.knot = m; const b = new THREE.Box3(); W.hattie.knee[0].children.forEach((k) => { if (k.isMesh) { k.geometry.computeBoundingBox(); const q = k.geometry.boundingBox.clone(); q.translate(k.position); b.union(q); } }); m.position.set((b.min.x + b.max.x) / 2, b.min.y + 0.7, (b.min.z + b.max.z) / 2); W.knotAt = m.position.clone(); W.hattie.knee[0].add(m); m.visible = false; }
}

// ---- a street of Plumbwick ----
function poseIntro(t) {
  const c = W.boy, u = smooth(0.25, 2.5, t), p = v3(1, 0.12 + 0.3 + u * 1.5, 3).add(T); place(c, p, 0.25); drift(c, t, 0.75, 1); c.neck.rotation.x = 0.16; face(c, t < 1 ? 'smug' : 'nervous', t, 0.2);
  const wob = (t) => Math.sin(t * 0.8) * 0.3;
  place(W.f1, T.clone().add(v3(-12, 12.5 + wob(t), -1.5)), 0.5); drift(W.f1, t, 1, 2); face(W.f1, 'nervous', t, 0.4); place(W.holder, T.clone().add(v3(-11, 0.12, 2)), 2.6); pose(W.holder, 'idle', t); W.holder.neck.rotation.x = -0.5; face(W.holder, 'neutral', t, 0.3);
  place(W.f2, T.clone().add(v3(16, 8.6 - wob(t + 1), 2.2)), -0.5); drift(W.f2, t, 1, 4); face(W.f2, 'surprised', t, 0.55);
  place(W.f3, T.clone().add(v3(5, 16.2 + wob(t + 2), -3)), 0.1); drift(W.f3, t, 1, 7); face(W.f3, 'smug', t, 0.1);
  { const a = handOf(W.f1, 0), b = handOf(W.holder, 0); aimArm(W.holder, 0, W.f1.root.position.clone().add(v3(0, 2, 0)), 1); b.copy(handOf(W.holder, 0)); W.r1.visible = true; W.r1.set(a, b); }
}

function poseAunt(t) {
  const s = (i) => L(i).start, c = W.nephew, a = W.auntie, rise = smooth(s(1) + 1.75, s(1) + 2.35, t), N = A.clone().add(v3(-3.4, rise * 0.95, 3.6)), AU = A.clone().add(v3(3.6, 0, 3.6));
  place(c, N, 1.0); pose(c, 'idle', t); if (rise > 0.02) drift(c, t * 0.6, rise * 0.5, 3); const pt = c.root.position.clone().add(v3(1.5, 3.6, 2.2)); aimArm(c, 1, pt, 1); const hb = handOf(c, 1); W.bowl.visible = true; W.bowl.position.copy(hb).add(v3(0, 0.55, 0)); const taste = smooth(s(1) + 0.15, s(1) + 0.6, t) * (1 - smooth(s(1) + 1.3, s(1) + 1.7, t)); aimArm(c, 0, H(c).add(v3(0.5, -0.7, 2.2)), taste * 0.95 + (1 - taste) * 0.35); W.spoon.visible = true; const hs = handOf(c, 0); W.spoon.position.copy(hs); W.spoon.lookAt(hb.clone().lerp(H(c), taste));
  c.neck.rotation.x = 0.04; face(c, t < s(1) + 1.15 ? 'neutral' : t < s(1) + 1.7 ? 'nervous' : 'happy', t, 0.3, { viseme: t > s(1) + 1.7 && t < s(2) - 0.3 && Math.sin(t * 13) > 0 ? 'A' : undefined });
  place(a, AU, -1.05); pose(a, 'idle', t); aimArm(a, 0, a.root.position.clone().add(v3(-2.2, 4.2, 2.0)), 0.4); face(a, 'happy', t, 0.5);
}

function poseYard(t) {
  const s = (i) => L(i).start, E = EV, c = W.cough, u = clamp((t - E.risec) / (s(3) - 0.05 - E.risec)), y = smooth(0, 0.55, u) * 5.6, z = -5.5 + smooth(0.42, 1, u) * 12.5, p = YD.clone().add(v3(-1, y, z));
  place(c, p, 0.62); pose(c, 'idle', t); const air = smooth(0, 0.25, u); if (air > 0.02) drift(c, t, air * 0.6, 2);
  aimArm(c, 0, H(c).add(v3(-0.75, 0.25, 0.8)), 1 - smooth(0.55, 0.9, u) * 0.4); W.phone.visible = true; { const h = handOf(c, 0); W.phone.position.copy(h); W.phone.lookAt(H(c)); }
  const ck = t > E.cough && t < E.risec ? Math.abs(Math.sin((t - E.cough) * 15)) : 0; c.torso.rotation.x = ck * 0.18; c.neck.rotation.x = ck * 0.2; aimArm(c, 1, c.root.position.clone().add(v3(2.1, 3.0, 1.8)), 1); { const h = handOf(c, 1); W.rod.visible = true; W.rod.position.copy(h); W.rod.rotation.set(-0.95, 0.32, 0); }
  face(c, ck > 0.3 ? 'pain' : u > 0.1 ? 'surprised' : 'smug', t, 0.3, { viseme: ck > 0.6 ? 'O' : undefined });
}

function poseKids(t) {
  const s = (i) => L(i).start, u = t - s(3), k = [W.kid1, W.kid2, W.kid3]; k.forEach((c, i) => { const x = -13 + u * 2.4 + i * 3.8, z = 2.5 + (i % 2) * 1.4; place(c, T.clone().add(v3(x, 0, z)), Math.PI / 2 + (i === 1 ? -0.12 : 0.1)); pose(c, 'walk', t * 0.62 + i * 0.5); face(c, i === 1 ? 'nervous' : 'happy', t, 0.3 + i * 0.2); });
}

const CF = [[-8, -3, -0.3], [1, 2.2, 0.2], [9, -4.2, 0.4]];
function poseCourt(t) {
  const s = (i) => L(i).start;
  place(W.judge, CR.clone().add(v3(0, 3.3, -12.5)), 0); pose(W.judge, 'idle', t); face(W.judge, 'neutral', t, 0.2); W.judge.neck.rotation.x = -0.35;
  place(W.bailiff, CR.clone().add(v3(-3, 0, 4)), Math.PI * 0.9); pose(W.bailiff, 'idle', t); W.bailiff.neck.rotation.x = -0.55; face(W.bailiff, 'neutral', t, 0.5);
  [W.n1, W.n2, W.n3].forEach((c, i) => { const [x, z, ry] = CF[i], top = W.court.netAt(x, z), y = top - 6.25 + Math.sin(t * 2 + i) * 0.07; place(c, CR.clone().add(v3(x, y, z)), 0.5 + ry); drift(c, t, 0.9, i * 3); c.neck.rotation.x = 0.38; face(c, i === 1 ? 'smug' : 'nervous', t, 0.2 + i * 0.25); });
}

function hatFeet(mode) { const c = W.hattie; c.slip.set(mode === 'slip'); c.boots.set(mode === 'boots'); c._foot = mode === 'boots' ? 0.28 * 0.92 : 0.1; }
function poseStreetHat(t) {
  const s = (i) => L(i).start, c = W.hattie; hatFeet('slip'); const u = t - s(4), x = -9 + u * 2.6, p = T.clone().add(v3(x, 0.12, -6.8)); place(c, p, Math.PI / 2 + 0.15); pose(c, 'walk', t * 0.92); c.neck.rotation.y = 0.2; face(c, 'happy', t, 0.3);
  const g = W.holder; place(g, T.clone().add(v3(9 - u * 0.9, 0.12, -8.8)), -Math.PI / 2 + 0.3); pose(g, 'walk', t * 0.7); face(g, 'happy', t, 0.5); const mm = W.f2; place(mm, T.clone().add(v3(6, 9.4 + Math.sin(t) * 0.3, -4)), -0.4); drift(mm, t, 1, 2); face(mm, 'nervous', t, 0.5);
}

function poseKitchen(t) {
  const s = (i) => L(i).start, E = EV, c = W.pip, base = 4.2 + Math.sin(t * 2) * 0.12 + smooth(E.jolt, E.jolt + 0.35, t) * 1.5, fall = smooth(E.belt + 0.05, E.belt + 0.85, t), y = lerp(base, 0.75 + Math.sin(t * 2.5) * 0.06, fall), p = K.clone().add(v3(5.2, y, 1.2)); place(c, p, -Math.PI / 2 + 0.55); drift(c, t, 1 - fall * 0.55, 1);
  c.neck.rotation.x = 0.06; W.belt.set(t >= E.belt); W.mittG.visible = false;
  if (t < s(7)) { aimArm(c, 0, H(c).add(v3(-1.3, 0.1, 1.1)), smooth(s(6) - 0.5, s(6), t)); W.brush.visible = true; { const h = handOf(c, 0); W.brush.position.copy(h); W.brush.quaternion.setFromUnitVectors(v3(0, 1, 0), H(c).sub(h).normalize()); } }
  else { W.brush.visible = false; const k = smooth(s(7) + 1.0, s(7) + 2.2, t), p1 = K.clone().add(v3(1.55, 4.7, 1.1)); if (k > 0) aimArm(c, 0, p1, k); }
  face(c, t < s(6) ? 'smug' : t < s(6) + 1.0 ? 'laugh' : t < s(7) + 0.8 ? 'surprised' : 'nervous', t, 0.3, { viseme: talk(6, t) });
  const m = W.mom, mp = K.clone().add(v3(8.2, 0, 3.0)); place(m, mp, -2.1); pose(m, 'idle', t); const bk = smooth(E.belt - 0.5, E.belt, t) * (1 - smooth(E.belt + 0.85, E.belt + 1.3, t));
  if (t < E.belt - 0.5) { aimArm(m, 0, c.root.position.clone().add(v3(0, 0.3, 0.6)), 1); m.neck.rotation.x = -0.32; } else aimArm(m, 0, c.root.position.clone().add(v3(0, 2.6, 1.0)), bk); face(m, t < s(7) ? 'nervous' : 'neutral', t, 0.4);
  const h = W.hattie; hatFeet('slip'); place(h, K.clone().add(v3(-11, 0, 1.5)), Math.PI / 2 + 0.5); pose(h, 'idle', t); h.neck.rotation.y = -0.1; face(h, t > s(6) + 0.3 && t < s(7) + 0.5 ? 'suspicious' : 'happy', t, 0.3);
}

// ---- the hall ----
const CROWD = [['c1', -14, 16], ['c2', -9.5, 15.4], ['c3', -4.8, 16.6], ['c4', 7.5, 16.3], ['c5', 13, 15.6], ['c6', 18.5, 15.5], ['c7', -17, 21], ['c8', -11.5, 21.4], ['c9', -6, 21.2], ['c10', 0.2, 21.6], ['c11', 6, 21.2], ['c12', 12, 21.5]];
function poseCrowd(t) {
  const s = (i) => L(i).start, E = EV, up = smooth(E.go - 0.2, E.go + 0.5, t), lookLaunch = up;
  CROWD.forEach(([k, x, z], i) => { const c = W[k]; place(c, v3(x, 0, z), Math.PI + Math.sin(i * 7) * 0.2); pose(c, 'idle', t + i); const b0 = v3(LAUNCH.x, 0, LAUNCH.z), yawL = yawTo(c.root.position, b0); const lookBack = t > E.smash + 0.2 ? yawTo(c.root.position, GOV_END) : Math.PI; c.root.rotation.y = lerp(c.root.rotation.y, lookBack, 0.5);
    if (t > E.drape + 0.2 && t < E.smash) { c.arms.forEach((a, n) => { a.rotation.x = -2.5 + Math.sin(t * 8 + i + n) * 0.32; a.rotation.z = (n ? 1 : -1) * 0.16; }); }
    c.neck.rotation.x = -0.75 * up - (t < E.smash ? 0.22 : 0); face(c, t < E.smash ? 'happy' : t < E.go ? 'shocked' : 'surprised', t, i * 0.13);
  });
}
function hatP(t) {
  const E = EV, s = (i) => L(i).start, Ypin = W.pinY, pos = v3(LAUNCH.x, 0, LAUNCH.z);
  if (t < E.go) return pos.setY(smooth(E.lift, E.lift + 1.1, t) * 0.75);
  if (t < E.hit) { const u = (t - E.go) / (E.hit - E.go); return pos.setY(lerp(0.75, Ypin, Math.pow(u, 1.55))); }
  const d = t - E.hit, b = Math.abs(Math.sin(d * 4.2)) * Math.exp(-d * 2.2) * 3.0; return pos.setY(Ypin - b);
}
function poseHattie(t) {
  const c = W.hattie, E = EV, s = (i) => L(i).start;
  hatFeet('slip');
  if (t < E.stepIn) { const q = HOME.hat.clone(); place(c, q, Math.PI + 0.1); pose(c, 'idle', t); c.neck.rotation.x = t < E.smash ? -0.28 : -0.05; if (t > s(11) && t < s(13)) { c.neck.rotation.y = -0.55; } if (t > E.smash && t < E.smash + 0.8) { c.arms.forEach((a, n) => { a.rotation.x = -0.55; a.rotation.z = (n ? 1 : -1) * 0.16; }); } face(c, t < E.smash ? 'happy' : t < s(11) ? 'shocked' : t < s(13) ? 'nervous' : 'scared', t, 0.3); return; }
  if (t < E.lift) { walkTo(c, HOME.hat, LAUNCH, E.stepIn, E.stepIn + 0.44, t, 2.0, Math.PI); const yl = t > E.stepIn + 0.2 ? Math.PI : yawTo(HOME.hat, LAUNCH); c.root.rotation.y = yl; if (t > s(14) + 0.2 && t < s(15)) { aimArm(c, 0, c.root.position.clone().add(v3(-0.3, 4.8, -3)), 1); c.torso.rotation.x = 0.14; } face(c, t < s(15) - 0.05 ? 'fury' : 'shocked', t, 0.3, { viseme: talk(14, t) }); return; }
  const p = hatP(t); place(c, p, Math.PI); c.root.rotation.y = Math.PI + (t > E.go ? Math.sin(t * 2.4) * 0.14 : 0);
  if (t < E.go) { drift(c, t, 0.65 * smooth(E.lift, E.lift + 0.5, t), 1); face(c, 'shocked', t, 0.3); }
  else if (t < s(18)) { const fly = 1; c.arms.forEach((a, n) => { a.rotation.z = (n ? 1 : -1) * (1.08 + Math.sin(t * 13 + n * 2) * 0.1); a.rotation.x = 0.1; }); c.legs.forEach((l, n) => { l.rotation.x = Math.sin(t * 9 + n * 3) * 0.26; }); c.knee.forEach((k) => { k.rotation.x = 0.3; }); c.neck.rotation.x = -0.12; face(c, t < E.hit ? 'scared' : t < E.hit + 0.5 ? 'pain' : 'shocked', t, 0.3); }
  else { c.root.rotation.y = Math.PI - 0.55; drift(c, t, 0.45, 1); aimArm(c, 0, c.root.position.clone().add(v3(0.9, 4.3, -1.7)), 0.9); aimArm(c, 1, c.root.position.clone().add(v3(-0.9, 4.2, -1.7)), 0.9); c.neck.rotation.x = 0.14; face(c, 'sleepy', t, 0.3); }
  c.slip.parts[1].visible = t < E.lift + 0.15;
}
function poseHallKids(t) {
  const c = W.pip, E = EV, s = (i) => L(i).start, nv = t > s(11) && t < E.go + 0.5 ? Math.sin(t * 28) * 0.02 : 0, P0 = HOME.pip.clone().add(v3(nv, 0, 0)), g = W.mittG; g.visible = true; W.belt.set(true);
  place(c, P0, Math.PI); pose(c, 'idle', t);
  c.arms[0].rotation.x = t < s(11) ? -0.05 : -0.05; c.arms[0].rotation.z = -0.22; c.arms[1].rotation.z = 0.24;
  const up = t >= E.go ? smooth(E.go - 0.1, E.go + 0.4, t) : 0; c.neck.rotation.x = t < E.stepIn ? -0.32 : up > 0 ? -0.95 * up : -0.1;
  if (t > s(11) - 0.2 && t < s(13)) { const b = smooth(s(11) + 1.0, s(11) + 1.55, t); aimArm(c, 1, c.root.position.clone().add(v3(1.9, 1.5, 0.6)), 0.15 * (1 - b) + 0.5 * b); }
  face(c, t < E.smash ? 'smug' : t < s(11) ? 'shocked' : t < E.stepIn ? 'terrified' : t < E.go ? 'shocked' : 'cry', t, 0.3);
  if (t > E.go + 0.3 && t < s(18)) { c.root.rotation.y = Math.PI + (t - E.go) * 0.0; }
}
function poseGov(t) {
  const c = W.gov, E = EV, s = (i) => L(i).start, D = DAIS.clone().add(v3(0, 1.4, 0)), mid = v3(-6, 0, 4.3); c.root.visible = false;
  if (t < E.smash + 0.75) { place(c, D, 0.75); pose(c, 'idle', t); W.boots0 = 0; const cord = PL.clone().add(v3(-6.5, 11, 1)); const pull = smooth(E.drape - 0.5, E.drape - 0.25, t) * (1 - smooth(E.drape + 0.4, E.drape + 0.7, t)); aimArm(c, 1, cord, pull); aimArm(c, 0, c.root.position.clone().add(v3(-2.8, 5.5, 2.3)), smooth(s(8) + 0.2, s(8) + 0.5, t) * (1 - smooth(E.drape + 0.8, E.drape + 1.1, t))); c.neck.rotation.y = 0.15; face(c, t < E.smash ? 'happy' : 'shocked', t, 0.2, { viseme: t > s(8) + 0.2 && t < E.drape && Math.sin(t * 12) > 0 ? 'E' : undefined }); return; }
  if (t < s(11) + 0.35) { const u = clamp((t - (E.smash + 0.75)) / 0.55), yy = u < 0.55 ? 1.4 : 0, p = lp3(D, mid, u); p.y = yy * (1 - smooth(0.2, 0.55, u)); place(c, p, lp3(D, mid, 0.01).z ? yawTo(D, mid) : 0); pose(c, u < 1 ? 'walk' : 'idle', t * 1.3); if (u >= 1) { c.root.rotation.y = 0.2; c.torso.rotation.x = 0.1; aimArm(c, 0, c.root.position.clone().add(v3(-1.2, 4.6, 3)), 1); aimArm(c, 1, c.root.position.clone().add(v3(1.2, 4.6, 3)), Math.abs(Math.sin(t * 7))); } face(c, 'fury', t, 0.2, { viseme: talk(10, t) }); return; }
  const w = walkTo(c, mid, GOV_END, s(11) + 0.35, s(12) + 1.6, t, 1.1, 0); if (!w) { c.root.rotation.y = 0; } c.root.rotation.y = 0.04;
  if (t > s(13) && t < E.go) { c.torso.rotation.x = 0.3 * (1 - smooth(E.stepIn, E.stepIn + 0.4, t)); }
  if (t > s(15)) c.neck.rotation.x = -0.9 * smooth(E.go - 0.15, E.go + 0.5, t);
  face(c, t < s(13) ? 'fury' : t < E.stepIn ? 'fury' : t < s(15) ? 'shocked' : 'surprised', t, 0.2, { viseme: talk(13, t) });
}
function poseBrigade(t) {
  const s = (i) => L(i).start, u = smooth(s(18), s(18) + 2.2, t), B = W.ladA.clone().lerp(W.ladB, lerp(0.36, 0.84, u)), n = v3(W.ladDir.x, 0, W.ladDir.z).normalize().multiplyScalar(-1.25), c = W.w1, p = B.clone().add(n); place(c, p, yawTo(p, B)); pose(c, 'idle', t); c.legs[0].rotation.x = -0.34; c.legs[1].rotation.x = 0.1; const hA = B.clone().add(v3(1.4, 3.5, 0)), hB = B.clone().add(v3(-1.4, 4.2, 0)); aimArm(c, 0, hA, 1); aimArm(c, 1, hB, 1); face(c, 'neutral', t, 0.5);
  for (const [k, x, z] of [['w2', 13.8, 11.7], ['w3', 9.0, 12.2]]) { const q = W[k]; place(q, v3(x, 0, z), yawTo(v3(x, 0, z), W.ladA)); pose(q, 'idle', t); aimArm(q, 0, W.ladA.clone().add(v3(k === 'w2' ? 0.4 : -0.4, 4.3, 0)), 1); q.neck.rotation.x = -0.55; face(q, 'neutral', t, 0.4); }
}

function poseWalkHome(t) {
  const s = (i) => L(i).start, u = t - s(19), c = W.hattie; hatFeet('boots'); const clomp = Math.abs(Math.sin(t * 2.6)); const p = T.clone().add(v3(-2 + u * 1.4, 0, -2.2)); place(c, p, Math.PI / 2 + 0.25); pose(c, 'walk', t * 0.55); face(c, 'neutral', t, 0.3); c.root.position.y += Math.sin(t * 3.0) * 0.05;
  const b = W.pip; b.root.visible = true; W.belt.set(false); W.mittG.visible = false; place(b, T.clone().add(v3(-4.6 + u * 1.4, 0, 1.7)), Math.PI / 2 + 0.2); pose(b, 'walk', t * 0.8); b.neck.rotation.y = -0.45; face(b, 'happy', t, 0.3);
}
function poseRoof(t) {
  const s = (i) => L(i).start, E = EV, c = W.hattie, RY = W.town.RY, ST = T.clone().add(v3(2, RY, -25.5)); W.belt.set(false); W.mittG.visible = false;
  hatFeet(t < E.unb ? 'boots' : 'none'); W.ropeR.visible = W.knot.visible = t >= E.unb - 0.2;
  W.oldBoots.visible = t >= E.unb; const lift = smooth(E.unb + 0.2, E.unb + 4.8, t) * 10, up = smooth(E.unb + 0.2, E.unb + 1.1, t), legs = smooth(E.unb + 0.7, E.unb + 1.2, t), p = ST.clone().add(v3(lift * 0.26, lift, lift * 0.12)); place(c, p, Math.PI * 0.55); c.hips.position.y = c.hips.position.y * legs + (2.4 + 0.42) * (1 - legs);
  c.legs.forEach((l, i) => { l.rotation.x = -1.5 * (1 - legs) + Math.sin(t * 1.5 + i * 2) * 0.16 * legs; c.knee[i].rotation.x = 1.5 * (1 - legs) + 0.18 * legs; });
  const ub = smooth(s(20) + 0.1, s(20) + 0.6, t) * (1 - smooth(E.unb - 0.25, E.unb + 0.15, t));
  if (ub > 0) { const f = v3(Math.sin(Math.PI * 0.55), 0, Math.cos(Math.PI * 0.55)), side = v3(Math.cos(Math.PI * 0.55), 0, -Math.sin(Math.PI * 0.55)), wig = Math.sin(t * 15) * 0.2; c.torso.rotation.x = 0.62 * ub; c.neck.rotation.x = 0.36 * ub; for (const n of [0, 1]) aimArm(c, n, c.root.position.clone().addScaledVector(f, 1.9).addScaledVector(side, n ? 1.2 + wig : -1.2 + wig).add(v3(0, 2.0, 0)), ub); }
  if (up > 0.7) drift(c, t, up * 0.72, 2);
  c.neck.rotation.y = 0; if (t > E.unb) c.neck.rotation.x = -0.18;
  const talkP = t > s(20) + 1.9 && t < E.unb; face(c, t < s(20) + 1.8 ? 'neutral' : t < E.unb + 0.3 ? 'smug' : 'happy', t, 0.3, { viseme: talkP && Math.sin(t * 12) > 0 ? 'A' : undefined });
  const b = W.pip, PP = T.clone().add(v3(7.5, RY, -23.4)); place(b, PP, -2.75); pose(b, 'idle', t); const pull = t >= E.unb - 0.2; if (pull) { const a0 = W.hattie.knee[0].localToWorld(W.knotAt.clone()); W.hattie.root.updateMatrixWorld(true); const q = PP.clone().add(v3(Math.sin(-2.75) * 1.0 - 0.45, 2.15, Math.cos(-2.75) * 1.0)); aimArm(b, 0, q.clone().add(v3(0.2, 0, 0)), 1); aimArm(b, 1, q.clone().add(v3(-0.2, 0.42, 0)), 1); b.torso.rotation.x = -0.12 * up; b.neck.rotation.x = -0.55; b.neck.rotation.y = -0.1; W.ropeR.set(q, W.hattie.knee[0].localToWorld(W.knotAt.clone())); } else { b.neck.rotation.x = -0.05; }
  face(b, pull ? 'happy' : 'neutral', t, 0.5);
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 }), Tv = (x, y, z) => T.clone().add(v3(x, y, z)), Yv = (x, y, z) => YD.clone().add(v3(x, y, z)), Av = (x, y, z) => A.clone().add(v3(x, y, z)), Kv = (x, y, z) => K.clone().add(v3(x, y, z)), Cv = (x, y, z) => CR.clone().add(v3(x, y, z));
  add('kid', 0, (u) => ({ pos: lp3(Tv(3, 3, 17.5), Tv(2.4, 2.8, 15.4), easeInOut(u)), look: Tv(1.2, 3.8, 3), fov: 46 }));
  add('sky', 1.7, (u) => ({ pos: lp3(Tv(-2, 1.3, 13), Tv(-1.5, 1.4, 12), u), look: Tv(3.5, 11.6, -2), fov: 66 }));
  add('soup', s(1) - 0.03, (u) => ({ pos: lp3(Av(0, 5.2, 24), Av(-0.4, 5, 22), easeInOut(u)), look: Av(0, 3.4, 3), fov: 44 }));
  add('heels', s(1) + 1.95, (u) => ({ pos: lp3(Av(-2.2, 0.75, 13), Av(-2.4, 0.75, 12.2), u), look: Av(-3.3, 1.55, 3.6), fov: 30 }));
  add('cough', s(2) - 0.03, (u, t) => { const c = W.cough.root.position; return { pos: lp3(Yv(12.5, 3.0, 13), Yv(12, 4.2, 13.5), easeInOut(u)), look: c.clone().add(v3(0, 1.4, 0)), fov: 46 }; });
  add('over', s(2) + 1.45, (u, t) => { const c = W.cough.root.position; return { pos: Yv(-10.5, 1.5, 17), look: c.clone().add(v3(0, 1.6, 0)), fov: 62 }; });
  add('boots', s(3) - 0.03, (u, t) => { const c = W.kid1.root.position; return { pos: c.clone().add(v3(-3.4 + u * 2.2, 0.75, 7.2)), look: c.clone().add(v3(0.6, 1.0, 0)), fov: 32 }; });
  add('kids', s(3) + 1.0, (u, t) => ({ pos: lp3(Tv(3, 2.6, 21), Tv(3.6, 2.5, 19.4), u), look: Tv(-4, 3.6, 3), fov: 52 }));
  add('court', E.court, (u) => ({ pos: lp3(Cv(2.2, 3.8, 14), Cv(2.4, 3.4, 14), u), look: lp3(Cv(0, 8, -12), Cv(1, 18.5, -1), easeInOut(Math.min(1, u * 1.5))), fov: 62 }));
  add('walk', s(4) - 0.03, (u, t) => { const c = W.hattie.root.position; return { pos: c.clone().add(v3(14 - u * 2, 3.2, 6.5)), look: c.clone().add(v3(0.9, 3.5, 0)), fov: 42 }; });
  add('paper', s(4) + 2.28, (u, t) => { const c = W.hattie.root.position; return { pos: c.clone().add(v3(5.4 - u, 1.0, 3.3)), look: c.clone().add(v3(0.5, 0.75, 0)), fov: 38 }; });
  add('kit0', s(5) - 0.03, (u) => ({ pos: lp3(Kv(3, 5.8, 20), Kv(3.4, 5.6, 18), easeInOut(u)), look: Kv(4.2, 4.6, 1), fov: 56 }));
  add('kit1', s(6) - 0.03, (u) => { const h = H(W.pip); return { pos: h.clone().add(v3(0.1 + u * 0.3, -0.8, 7.4 - u * 0.4)), look: h.clone().add(v3(-0.2, -0.7, 0)), fov: 38 }; });
  add('kit2', s(7) - 0.03, (u) => ({ pos: lp3(Kv(6, 4.4, 16.5), Kv(5.2, 4.2, 15), easeInOut(u)), look: Kv(3.8, 3.6, 1), fov: 44 }));
  add('hall0', s(8) - 0.04, (u) => ({ pos: lp3(v3(-6, 11, 31), v3(-4, 12.5, 29), easeInOut(u)), look: v3(-2.5, 11, -6), fov: 66 }));
  add('gov', s(8) + 1.05, (u) => { const h = H(W.gov); return { pos: h.clone().add(v3(1.8, -1.4, 10 - u * 0.8)), look: h.clone().add(v3(1.2, -1.1, 0)), fov: 42 }; });
  add('bird', E.drape + 0.35, (u) => ({ pos: lp3(v3(5.6, 2.2, 15.2), v3(4.6, 2.6, 13.4), easeInOut(u)), look: v3(-0.5, 12.6, -6), fov: 66 }));
  add('ball', E.ball, (u, t) => { const p = W.ball.position; return { pos: p.clone().add(v3(1.5, 0.3, 5.0)), look: p.clone().lerp(v3(0, 10.6, -6), 0.72).add(v3(0, -1.4, 0)), fov: 54 }; });
  add('smash', E.smash, (u) => ({ pos: lp3(v3(8.4, 4.4, 10.2), v3(9.2, 5, 11.4), easeOut(u)), look: v3(0, 6.2, -4), fov: 66 }));
  add('rage', s(10) - 0.2, (u) => { const h = H(W.gov); return { pos: h.clone().add(v3(1.4 - u * 0.6, -0.9, 8.4 - u * 0.8)), look: h.clone().add(v3(0, -1.2, 0)), fov: 42 }; });
  add('rows', s(10) + 1.25, (u) => ({ pos: lp3(v3(-9, 3.8, 5.4), v3(-7.2, 3.8, 5.4), u), look: v3(1.2, 3.3, 13), fov: 50 }));
  add('glove', s(11) - 0.03, (u) => { const h = handOf(W.pip, 1), hd = H(W.pip); return { pos: h.clone().add(v3(-1.4 + u * 0.5, 1.4, -7.2 + u * 0.8)), look: h.clone().add(v3(0, -1.4, 0)), fov: 34 }; });
  add('pipf', s(11) + 1.42, (u) => { const h = H(W.pip); return { pos: h.clone().add(v3(1.2, -1.2, -7.2 + u * 0.8)), look: h.clone().add(v3(0, -0.9, 0)), fov: 38 }; });
  add('dome', s(12) + 0.72, (u) => ({ pos: lp3(v3(3.3, 1.6, 15.2), v3(3.0, 1.5, 15), u), look: lp3(v3(1.2, 26, 3.4), v3(0.3, 46, -0.8), easeInOut(u)), fov: 72 }));
  add('feet', s(12) + 2.3, (u) => { const c = W.pip.root.position; return { pos: c.clone().add(v3(3 + u * 1.2, 1.1, -5.2)), look: c.clone().add(v3(0, 2.1, 0)), fov: 42 }; });
  add('ask', s(13) - 0.03, (u) => { const g = H(W.gov), p = H(W.pip); return { pos: p.clone().add(v3(2.3 - u * 0.25, 0.9, 5.6 - u * 0.5)), look: g.clone().add(v3(0, -2.1, 0)), fov: 50 }; });
  add('step', E.stepIn + 0.02, (u) => ({ pos: lp3(v3(19.5, 4.6, 7.8), v3(18.5, 4.6, 8), u), look: v3(2, 2.4, 8), fov: 42 }));
  add('lie', s(14) + 0.1, (u) => { const h = H(W.hattie); return { pos: h.clone().add(v3(-1.6, -1.0, -8.2 + u * 0.9)), look: h.clone().add(v3(0.15, -1.1, 0)), fov: 38 }; });
  add('gshock', s(15) - 0.08, (u) => { const h = H(W.gov); return { pos: h.clone().add(v3(1.4 + u * 0.4, -1.1, 7.8 - u * 0.5)), look: h.clone().add(v3(0, -1, 0)), fov: 40 }; });
  add('first', s(15) + 0.62, (u) => { const h = H(W.hattie); return { pos: h.clone().add(v3(-0.5, -0.8, -8.2 + u * 0.9)), look: h.clone().add(v3(0, -0.9, 0)), fov: 38 }; });
  add('float', s(16) - 0.03, (u) => { const c = W.hattie.root.position; return { pos: v3(c.x + 5.6, 1.5, c.z - 11 + u * 0.5), look: v3(c.x, 2.7 + c.y * 0.3, c.z), fov: 44 }; });
  add('launch', E.go - 0.06, (u, t) => { const c = W.hattie.root.position; return { pos: v3(LAUNCH.x + 7.2, 1.2, LAUNCH.z - 8), look: v3(c.x, Math.min(c.y + 3.5, 26), c.z), fov: 70 }; });
  add('climb', E.go + 0.95, (u, t) => { const c = W.hattie.root.position; return { pos: v3(c.x + 9.5, Math.max(14, c.y - 3), c.z - 12.5), look: c.clone().add(v3(0, 3.0, 0)), fov: 56 }; });
  add('above', E.go + 1.5, (u, t) => { const c = W.hattie.root.position; return { pos: v3(-2.4, 50.2, 2.8), look: v3(c.x, c.y, c.z), fov: 66 }; });
  add('hit', E.hit - 0.05, (u, t) => { const c = W.hattie.root.position; return { pos: v3(c.x + 3.4, c.y - 2.4, c.z - 9.5), look: c.clone().add(v3(0, 4.4, 0)), fov: 60 }; });
  add('crowdup', E.hit + 0.62, (u) => ({ pos: lp3(v3(2.8, 1.2, 4.0), v3(3.4, 1.2, 3.8), u), look: v3(2.8, 3.6, 12), fov: 58 }));
  add('lad', s(18) - 0.04, (u) => ({ pos: lp3(v3(-3, 1.6, 3), v3(-3.2, 1.7, 2.2), u), look: v3(4, 30, 10), fov: 74 }));
  add('clock', s(18) + 1.1, (u) => ({ pos: lp3(v3(-10, 13.6, 1.2), v3(-11.2, 13.6, 1.4), u), look: v3(-32, 13.6, 3.9), fov: 34 }));
  add('bored', s(18) + 1.68, (u) => { const h = H(W.hattie); return { pos: h.clone().add(v3(3.6 - u * 0.5, -2.2, -7.4)), look: h.clone().add(v3(0, -0.8, 0)), fov: 44 }; });
  add('clank', s(19) - 0.04, (u) => { const c = W.hattie.root.position; return { pos: c.clone().add(v3(3.2 + u, 1.1, 7.2)), look: c.clone().add(v3(0.8, 1.5, 0)), fov: 36 }; });
  add('pair', s(19) + 1.28, (u) => { const c = W.hattie.root.position; return { pos: c.clone().add(v3(8.2 - u * 0.8, 3.4, 11.8)), look: c.clone().add(v3(0, 3.1, 1.2)), fov: 42 }; });
  const ry = W.town.RY;
  add('roof0', s(20) - 0.05, (u) => ({ pos: lp3(Tv(12.2, ry + 5.2, -24), Tv(11.4, ry + 4.6, -24.3), easeInOut(u)), look: Tv(2.6, ry + 3.2, -26), fov: 50 }));
  add('buckle', s(20) + 1.12, (u) => { const c = W.hattie.root.position; return { pos: c.clone().add(v3(5.8 + u * 0.5, 2.2, 2.6)), look: c.clone().add(v3(1.3, 1.6, -0.4)), fov: 40 }; });
  add('swear', s(20) + 1.9, (u) => { const h = H(W.hattie); return { pos: h.clone().add(v3(5.4, -0.6, 3.6 - u * 0.4)), look: h.clone().add(v3(0, -1.9, 0)), fov: 40 }; });
  add('rise', E.unb + 0.14, (u) => { const h = H(W.hattie); return { pos: lp3(Tv(7.2, ry + 2.5, -27.9), Tv(6.9, ry + 3.1, -27.7), easeInOut(u)), look: h.clone().add(v3(0, -1.5, 0)), fov: 62 }; });
  add('rope', s(21) - 0.03, (u) => { const h = H(W.pip); return { pos: lp3(Tv(5.6, ry + 3.6, -35.5), Tv(5.9, ry + 3.8, -34.5), easeInOut(u)), look: h.clone().add(v3(0, -2.6, 0)), fov: 56 }; });
  add('last', s(21) + 1.25, (u) => ({ pos: lp3(Tv(-14, ry + 8, -31.5), Tv(-23, ry + 11, -34.5), easeInOut(u)), look: lp3(Tv(7, ry + 3.5, -23.5), Tv(8.2, ry + 4.2, -23.5), easeInOut(u)), fov: 56 }));
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}

function setKey(t) { const s = (i) => L(i).start, E = EV; if (t < s(1) - 0.04) return 'intro'; if (t < s(2) - 0.04) return 'aunt'; if (t < s(3) - 0.04) return 'yard'; if (t < E.court) return 'kids'; if (t < s(4) - 0.04) return 'court'; if (t < s(5) - 0.04) return 'street'; if (t < s(8) - 0.05) return 'kitchen'; if (t < s(19) - 0.05) return 'hall'; if (t < s(20) - 0.06) return 'walk'; return 'roof'; }

function renderAt(t) {
  const s = (i) => L(i).start, E = EV, key = setKey(t);
  applyEnv(ctx, key === 'roof' ? SET : (key === 'aunt' || key === 'kitchen' || key === 'court') ? ROOM : SUN);
  const onSet = { intro: 'town', aunt: 'aunt', yard: 'yard', kids: 'town', court: 'court', street: 'town', kitchen: 'kit', hall: 'hall', walk: 'town', roof: 'town' }[key];
  ['town', 'aunt', 'yard', 'court', 'kit', 'hall'].forEach((k) => { W[k].visible = k === onSet; }); W.pl.forEach((l) => { l.intensity = l.userData.set === onSet ? l.userData.I : 0; });
  W.all.forEach((c) => { c.root.visible = false; }); W.r1.visible = false; W.bowl.visible = false; W.spoon.visible = false; W.phone.visible = false; W.rod.visible = false; W.brush.visible = false; W.ball.visible = false; W.oldBoots.visible = false; W.ropeR.visible = false; W.knot.visible = false; W.lost.visible = false; W.lad.visible = false; W.box.visible = key === 'kitchen'; W.shards.visible = key === 'hall'; W.confetti.visible = key === 'hall' && t > E.drape - 0.1 && t < E.smash + 2.6;
  if (key === 'hall' || key === 'kitchen' || key === 'street') W.belt.set(false);
  if (key === 'intro') poseIntro(t); else if (key === 'aunt') poseAunt(t); else if (key === 'yard') poseYard(t); else if (key === 'kids') poseKids(t); else if (key === 'court') poseCourt(t); else if (key === 'street') poseStreetHat(t); else if (key === 'kitchen') poseKitchen(t); else if (key === 'walk') poseWalkHome(t);
  else if (key === 'roof') poseRoof(t);
  else {
    W.peacock.set(t, E.smash); W.peacock.drape(smooth(E.drape, E.drape + 0.55, t)); W.shards.update(t); W.confetti.update(t); W.hall.ring(t, E.hit, LAUNCH.x, LAUNCH.z); W.clock.set(9 + 4 * smooth(s(18) + 1.15, s(18) + 1.7, t));
    if (t > E.ball && t <= E.smash) { const u = (t - E.ball) / (E.smash - E.ball), a = v3(1.4, 6, 15), b = v3(0, 10.7, -4.6), p = lp3(a, b, u); p.y += Math.sin(u * Math.PI) * 2.4; W.ball.position.copy(p); W.ball.rotation.set(t * 22, t * 9, 0); W.ball.visible = true; }
    if (t >= E.lift + 0.15) { W.lost.visible = true; }
    poseCrowd(t); poseHallKids(t); poseGov(t); poseHattie(t);
    if (t >= s(18) - 0.3) { W.lad.visible = true; poseBrigade(t); }
    // the crowd and the leads clear the view for the shots that stand among them
  }
  W.ball.visible && (W.ball.material.needsUpdate = false);
  ctx.scene.updateMatrixWorld(true);
  let sh = shotAt(W.shots, t);
  // the Governor stands where the reverse angles of Hattie and Pip are shot from
  if (key === 'hall' && ['rows', 'lie', 'first', 'float', 'launch', 'glove', 'pipf', 'feet', 'crowdup', 'lad'].includes(sh.name)) W.gov.root.visible = false;
  if (key === 'roof' && ['roof0', 'buckle', 'swear'].includes(sh.name)) W.pip.root.visible = false;
  { const dq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2, 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2; c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2], Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  { const cq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  const jolt = (t > E.smash && t < E.smash + 0.3 ? 0.55 * (1 - (t - E.smash) / 0.3) : 0) + (t > E.hit && t < E.hit + 0.3 ? 0.5 * (1 - (t - E.hit) / 0.3) : 0);
  frame(ctx, t, sh, { steady: true, shake: jolt, shadowSpan: key === 'hall' ? 62 : key === 'roof' ? 70 : 54, shadows: true, black: 0 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep106', { look: 'pro', avatars: [...new Set(Object.values(AV).map((a) => a[0]))] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smirk', 'smug', 'cry', 'shocked', 'surprised', 'nervous', 'scared', 'terrified', 'pain', 'fury', 'laugh', 'blink', 'sleepy', 'suspicious']);
  const { scene, camera } = ctx; camera.far = 1800; camera.near = 0.2; camera.updateProjectionMatrix();
  clouds(scene, { count: 14, y: 200, spread: 1200, size: 30 });
  W.hall = foundersHall({ plinth: PL, dais: DAIS }); scene.add(W.hall);
  W.peacock = glassPeacock(); W.peacock.position.copy(PL).add(v3(0, 4, 0)); W.hall.add(W.peacock);
  W.town = plumbwick(); W.town.position.copy(T); scene.add(W.town);
  W.yard = brookYard(); W.yard.position.copy(YD); scene.add(W.yard);
  W.aunt = auntSet(); W.aunt.position.copy(A); scene.add(W.aunt);
  W.kit = kitchenSet(); W.kit.position.copy(K); scene.add(W.kit);
  W.court = courtroom(); W.court.position.copy(CR); scene.add(W.court);
  W.court.bulge(CF.map(([x, z]) => [x, z, 3.4])); W.court.shapeNet();
  W.pl = []; for (const [set, p, c, I, d] of [['aunt', A.clone().add(v3(0, 13, 8)), '#fff0d8', 340, 44], ['kit', K.clone().add(v3(2, 13, 8)), '#fff0d8', 340, 44], ['court', CR.clone().add(v3(0, 16, 6)), '#ffe9cc', 520, 60]]) { const l = new THREE.PointLight(c, I, d, 1.5); l.position.copy(p); l.userData.I = I; l.userData.set = set; scene.add(l); W.pl.push(l); }
  W.clock = hallClock(5.0); { const a = 277 * Math.PI / 180; W.clock.position.set(Math.sin(a) * 32.4, 13.6, Math.cos(a) * 32.4); W.clock.rotation.y = a + Math.PI; } W.hall.add(W.clock);
  W.shards = glassShatter(scene, [{ t: EV.smash, c: v3(0, 11, -5), n: v3(0, 0.2, 1), w: 11, h: 11, p: v3(0, 10.6, -4.6), power: 0.7 }, { t: EV.smash + 0.02, c: v3(0, 11, -8), n: v3(0, 0.3, -1), w: 14, h: 13, power: 0.9 }], { per: 150, floor: 0.08, seed: 9 });
  { const r = rng(44), N = 380, a = []; for (let i = 0; i < N; i++) a.push({ x: (r() - 0.5) * 48, z: (r() - 0.5) * 42 + 6, y: 22 + r() * 18, sp: 5 + r() * 5, w: r() * 6.28, c: i % 4 }); const cols = ['#e34b5f', '#ffc53d', '#3fb3b0', '#7f6bd8'], im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.42, 0.26), new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide }), N); a.forEach((q, i) => im.setColorAt(i, new THREE.Color(cols[q.c]))); im.frustumCulled = false; im.userData.noAO = true; const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P0 = v3(), S0 = v3(1, 1, 1); im.update = (t) => { const d = Math.max(0, t - EV.drape); a.forEach((q, i) => { P0.set(q.x + Math.sin(d * 1.4 + q.w) * 1.1, Math.max(0.05, q.y - q.sp * d), q.z + Math.cos(d * 1.1 + q.w) * 1.1); E.set(d * 5 + q.w, d * 3, q.w); Q.setFromEuler(E); M.compose(P0, Q, S0); im.setMatrixAt(i, M); }); im.instanceMatrix.needsUpdate = true; }; scene.add(im); W.confetti = im; }
  people();
  W.pinY = W.hall.glassY(LAUNCH.x, LAUNCH.z) - W.hatH - 0.35; EV.hatH = W.hatH;
  W.ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fbf8ef'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#d6332e'; x.lineWidth = 4; x.setLineDash([8, 7]); for (const q of [62, 196]) { x.beginPath(); x.moveTo(q - 40, 0); x.bezierCurveTo(q + 40, 45, q + 40, 83, q - 40, 128); x.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), roughness: 0.55 })); W.ball.castShadow = true; scene.add(W.ball);
  W.r1 = rope(); scene.add(W.r1); W.ropeR = rope(); scene.add(W.ropeR);
  W.bowl = W.aunt.bowl(); scene.add(W.bowl); W.spoon = new THREE.Group(); { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), new THREE.MeshStandardMaterial({ color: '#d7dbe0', metalness: 0.7, roughness: 0.3 })); m.rotation.x = Math.PI / 2; m.position.z = 0.6; const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshStandardMaterial({ color: '#d7dbe0', metalness: 0.7, roughness: 0.3 })); b.scale.set(1, 0.5, 1.3); b.position.z = 1.3; W.spoon.add(m, b); } scene.add(W.spoon);
  W.phone = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.92, 0.1), new THREE.MeshStandardMaterial({ color: '#1f2733', roughness: 0.3 })); scene.add(W.phone);
  W.rod = new THREE.Group(); { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 9, 8), new THREE.MeshStandardMaterial({ color: '#6c4426', roughness: 0.5 })); m.position.y = 4.4; const n = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.28, 16), new THREE.MeshStandardMaterial({ color: '#d7dbe0', metalness: 0.6, roughness: 0.35 })); n.position.set(0.2, 0.7, 0); n.rotation.z = Math.PI / 2; W.rod.add(m, n); } scene.add(W.rod);
  W.brush = new THREE.Group(); { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 0.1), new THREE.MeshStandardMaterial({ color: '#2da6d8', roughness: 0.35 })); m.position.y = 0.85; const b = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.2), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 })); b.position.set(0, 1.45, 0.14); W.brush.add(m, b); } scene.add(W.brush);
  W.box = cerealBox(); W.box.position.copy(K).add(v3(1.55, W.kit.top + 1.25, 1.1)); W.box.rotation.y = 0.4; scene.add(W.box);
  W.oldBoots = looseBoots(2, 2); W.oldBoots.position.copy(T).add(v3(2 + Math.sin(Math.PI * 0.55) * 2.3, W.town.RY + 0.03, -25.5 + Math.cos(Math.PI * 0.55) * 2.3)); W.oldBoots.rotation.y = Math.PI * 0.55; scene.add(W.oldBoots);
  W.lost = lostSlipper(1.84, 1.84); W.lost.position.set(LAUNCH.x - 0.9, 0.04, LAUNCH.z); W.lost.rotation.y = Math.PI; W.hall.add(W.lost);
  W.ladA = v3(11.5, 0, 13.5); W.ladB = v3(3, 45, 10); W.lad = fireLadder(W.ladA, W.ladB); W.ladDir = W.ladB.clone().sub(W.ladA).normalize(); W.hall.add(W.lad);
  W.shots = shots();
  window.__ep106 = { W, THREE, ctx };
  return expose(ctx, renderAt, L(17).start + 0.95, EV);
}
