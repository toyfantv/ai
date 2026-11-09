// Flower Man remake 7: The Voice in Every Ear. In Merrow Bay every twelve-year-old gets a gold bead called Sunny that feeds them every word. Juno sneezes hers out on the ferry and says hello on her own:
// Dez stops dead. In class twenty hands rise at once and everyone mouths the same answer; at lunch the table laughs at a joke nobody told. There was only ever one Sunny, talking to itself through the whole town.
// She finds it glowing under a bench and leaves it there; on the dock Dez and Priya turn their heads at once and ask to be put back in.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, mixP, DAY } from '../engine/stage.js';
import { clouds } from '../engine/atmos.js';
import { aimArm as aimArm0 } from '../engine/anims.js';
import { jointify } from '../engine/infinitetower.js';
import { crowd } from '../engine/kit.js';
import { goldBead, looseBead, bayWater, gulls, ferry, harbour, townBeads, threads, oneOrb, classroom, lunchroom, DECK, WATER } from '../engine/merrowbay.js';

const aimArm = (c, side, p, k = 1) => { c.root.updateMatrixWorld(true); aimArm0(c, side, p, k); };
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV;
const W = {};
const LIGHT = '#eec39a', TAN = '#c68642', DARK = '#7a4f30';
const AV = {
  juno: ['farm_emma_obby', LIGHT], dez: ['farm_omar', DARK], priya: ['farm_danielle', LIGHT], mom: ['farm_classic_mom', LIGHT], teacher: ['farm_ms_henderson', LIGHT],
  lily: ['farm_lily', LIGHT], oliver: ['farm_oliver', LIGHT], grandpa: ['farm_grandpa', LIGHT], noah: ['farm_noah', LIGHT], girl: ['farm_bacon_girl', LIGHT], teddy: ['farm_lt_teddy', LIGHT], theo: ['farm_hc_theo', LIGHT], ava: ['farm_ava', '#e3a982'], marcus: ['farm_marcus', DARK],
  eli: ['farm_hc_eli', LIGHT], mia: ['farm_mia', LIGHT], ripley: ['farm_lt_ripley', TAN], ethan: ['farm_ethan', LIGHT], chloe: ['farm_chloe', TAN], oldm: ['farm_old_man', LIGHT],
  finn: ['farm_finn', LIGHT], jake: ['farm_jake_blue', LIGHT], redk: ['farm_red_kid', LIGHT], daniel: ['farm_daniel', LIGHT], kai: ['farm_kai', TAN], nia: ['farm_nia', DARK], cole: ['farm_lt_cole', LIGHT], dex: ['farm_hc_dex', DARK], pink: ['farm_lily_pink', LIGHT], leo: ['farm_leo', DARK], grayson: ['farm_grayson', LIGHT], bacon: ['farm_bacon_hair', LIGHT],
};
const BEAD_SIDE = { dez: -1 };
const HIDE = { jc: ['daniel'], beh: ['juno'], bes: ['redk'], tch: ['ripley', 'eli'], lfaces: ['juno', 'jake', 'finn', 'pink', 'ripley', 'cole'], turned: ['juno'], jd: ['priya'], warn: ['dez', 'priya'], faces: ['juno'] };
// the class: [key, col, row]; Juno is col 2 row 2, Priya right in front, Finn beside her, Jake behind
const CLASS = [['priya', 2, 0], ['juno', 2, 2], ['finn', 1, 2], ['jake', 2, 3], ['dez', 3, 1], ['eli', 1, 0], ['mia', 3, 0], ['ripley', 0, 0], ['ethan', 4, 0], ['chloe', 0, 1], ['redk', 1, 1], ['daniel', 2, 1], ['kai', 4, 1], ['nia', 0, 2], ['cole', 3, 2], ['dex', 4, 2], ['pink', 0, 3], ['leo', 1, 3], ['grayson', 3, 3], ['bacon', 4, 3]];
// the lunch table: [key, x, side]; side 1 = the +z bench (facing -z)
const LUNCH = [['juno', 8.8, 1], ['priya', 8.8, -1], ['dez', 4.4, -1], ['finn', 4.4, 1], ['mia', 0, -1], ['jake', 0, 1], ['eli', -4.4, -1], ['pink', -4.4, 1], ['cole', -8.8, -1], ['ripley', -8.8, 1]];
const YARD = [['eli', -22, 10, 2.2], ['mia', 21, 2, -2.6], ['finn', -18, -5, 1.6], ['pink', 22, 12, -1.8], ['cole', -28, 3, 2.6], ['ripley', 16, -6, -1.2]];
const ROW = ['ava', 'marcus', 'theo', 'chloe', 'oldm', 'noah', 'girl', 'teddy'];

// places
const T = v3(-140, 0, 34), SG = v3(95, 0, 39), CL = v3(1800, 0, 1800), LU = v3(-1800, 0, 1800), FA = v3(-1200, 0, -240), FB = v3(22.5, 0, -33);
const JB = T.clone().add(v3(1.2, 0, -5.6)), MB = JB.clone().add(v3(-2.1, 0, 1.7));
const FLOC = (f) => (x, y, z) => f.localToWorld(v3(x, y, z));
const DZ = SG.clone().add(v3(2.9, 0, 0)), JS = SG.clone().add(v3(-2.9, 0, 0));
const ORB = v3(-20, 280, 470);

const SUN = { ...DAY, ...P({ top: '#2f93ee', horizon: '#d2efff', haze: '#d2efff', sunColor: '#fff2d8', hemiSky: '#d6edff', hemiGround: '#d9c8a4' }), sunDir: v3(-0.32, 0.8, -0.5), sunI: 2.1, sunDisc: 0.35, hemiI: 1.2, amb: 0.3, envI: 1.0, exposure: 1.0, bloom: 0.04, vig: 0, saturation: 1.26, contrast: 1.05, bounce: 0.18, fogNear: 320, fogFar: 1500, stars: 0, moon: 0, win: 0, lamp: 0 };
const WRONG = { ...SUN, ...P({ top: '#a1b296', horizon: '#ecdf9f', haze: '#e2d89e', sunColor: '#eef2bd', hemiSky: '#e6e8b8', hemiGround: '#b2b08a' }), sunDir: v3(-0.05, 0.86, -0.5), sunI: 0.7, sunDisc: 0, hemiI: 1.65, amb: 0.5, envI: 0.9, saturation: 0.72, contrast: 1.03, fogNear: 260, fogFar: 1200 };
const DUSKW = { ...WRONG, ...P({ top: '#4e6b64', horizon: '#e5bd72', haze: '#c8b583', sunColor: '#f0d392', hemiSky: '#b9c6a4', hemiGround: '#8c8468' }), sunDir: v3(0.55, 0.28, -0.78), sunI: 1.1, hemiI: 1.3, amb: 0.46, envI: 0.75, saturation: 0.8, contrast: 1.07, fogNear: 240, fogFar: 1000 };
const ROOM = { ...SUN, ...P({ top: '#ffe7c2', horizon: '#ffe7c2', haze: '#ffe7c2', sunColor: '#ffe6c0', hemiSky: '#fff4e0', hemiGround: '#d6b488' }), sunDir: v3(0.65, 0.55, 0.4), sunI: 0.35, sunDisc: 0, hemiI: 1.4, amb: 0.5, envI: 0.7, saturation: 1.14, fogNear: 400, fogFar: 1200 };
const ROOMW = { ...ROOM, ...P({ top: '#d9e2c4', horizon: '#d9e2c4', haze: '#d9e2c4', sunColor: '#e8efc6', hemiSky: '#e9efcf', hemiGround: '#b9b890' }), sunI: 0.04, hemiI: 1.62, amb: 0.56, saturation: 0.78, contrast: 1.0 };

function events() { const s = (i) => L(i).start; return { ins: s(0) + 2.75, snz: s(4) - 0.1, frz: s(7) - 0.08, res: s(8) - 0.1, hands: s(9) + 1.92, laugh: s(12) + 1.0, stop: s(14) - 0.26, turnL: s(14) - 0.2, one: s(15) + 2.18, stand: s(20) - 0.05, walk: s(21) - 0.55, turn: s(22) + 2.3, end: ctx.dur }; }

// ---- helpers ----
const armLen = (c) => { if (!c._alen) { c.reset(); c.root.updateMatrixWorld(true); const r = c.root.rotation.clone(), p = c.root.position.clone(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3().setFromObject(c.arms[0]); c._alen = sh.y - bx.min.y - 0.25; c.root.rotation.copy(r); c.root.position.copy(p); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); return c.arms[side].localToWorld(v3(0, -armLen(c), 0.12)); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.scale.setScalar(1); c.head.rotation.set(0, 0, 0); }
function place(c, p, yaw) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; }
function sit(c, p, yaw, seatY) { place(c, p, yaw); c.hips.position.y = seatY + 0.42; c.legs.forEach((l, i) => { l.rotation.x = -1.5; c.knee[i].rotation.x = 1.5; }); c.arms.forEach((a, i) => { a.rotation.x = -0.75; a.rotation.z = (i ? 1 : -1) * 0.08; }); }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const H = (c) => { c.root.updateMatrixWorld(true); return c.neck.getWorldPosition(v3()).add(v3(0, 0.8, 0)); };
const beadW = (c) => { c.root.updateMatrixWorld(true); return c.bead.getWorldPosition(v3()); };
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.noBlink ? false : blinkAt(t, ph), viseme: o.viseme }); }
const talk = (i, t) => (t > L(i).start && t < L(i).end ? visemeAt(L(i).text, L(i).start, L(i).end, t) : undefined);
const ANS = 'The capital of Peru is Lima.';
function lookAtP(c, p, k = 1) { c.root.updateMatrixWorld(true); const n = c.neck.getWorldPosition(v3()), a = wrap(yawTo(n, p) - c.root.rotation.y); c.neck.rotation.y = clamp(a, -1.5, 1.5) * k; c.neck.rotation.x = -Math.atan2(p.y - n.y - 0.8, Math.hypot(p.x - n.x, p.z - n.z)) * 0.6 * k; }
const heads = () => {};
const stayAll = (t) => (t >= EV.frz ? t : t + 0);

// ---- people ----
function people() {
  const mk = (k) => { const [avatar, skin] = AV[k], c = makeCharacter({ avatar, alti: true, skin, caustic: false }); ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c); c.bead = goldBead(c, BEAD_SIDE[k] || 1); c.key = k; return c; };
  for (const k of Object.keys(AV)) W[k] = mk(k);
  W.all = Object.keys(AV).map((k) => W[k]);
}

// ---- scenes: each is a pure function of t ----
function poseBirthday(t) {
  const E = EV, s = (i) => L(i).start, c = W.juno, m = W.mom; place(c, JB, Math.PI); pose(c, 'idle', t); c.bead.visible = t >= E.ins; if (t >= E.ins) c.bead.level(0.3 + smooth(s(1), s(1) + 0.4, t) * (0.7 + Math.sin(t * 7) * 0.2) * (t < s(1) + 1.45 ? 1 : 0.5));
  const say = t > s(1) + 1.45 && t < s(2) - 0.1; const eyesUp = t < E.ins ? 'happy' : t < E.ins + 0.5 ? 'surprised' : 'happy';
  c.neck.rotation.y = t < E.ins ? -0.28 : -0.2 * (1 - smooth(s(1) + 1.2, s(1) + 1.6, t)); face(c, eyesUp, t, 0.4, { viseme: say ? visemeAt('It is the very best day of my whole life', s(1) + 1.45, s(2) - 0.1, t) : undefined });
  place(m, MB, yawTo(MB, JB)); pose(m, 'idle', t); c.root.updateMatrixWorld(true); m.root.updateMatrixWorld(true);
  const earP = beadW(c), rise = smooth(-1.0, 1.6, t) * (1 - smooth(E.ins + 0.5, E.ins + 1.1, t)); aimArm(m, 1, earP.clone().add(v3(-0.4, -0.35, 0)), rise * 0.97 + 0.03); lookAtP(m, H(c), 1); face(m, 'happy', t, 0.2);
  W.b0.visible = t < E.ins; if (W.b0.visible) { const h = handOf(m, 1), g = h.clone().lerp(earP, smooth(E.ins - 0.35, E.ins, t)); W.b0.position.copy(g); W.b0.level(0.55); }
  W.motes.visible = t > s(1) - 0.1 && t < s(1) + 1.5; if (W.motes.visible) { const a = beadW(c), b = H(c).add(v3(0, -0.3, -0.72)), M = new THREE.Matrix4(); for (let i = 0; i < 24; i++) { const u = ((t * 1.2 + i / 24) % 1), p = a.clone().lerp(b, u); p.z -= Math.sin(u * Math.PI) * 0.9; p.x += Math.sin(u * 15 + i) * 0.06; p.y += Math.sin(u * 3 * Math.PI + i) * 0.12; const sc = 0.8 * Math.sin(u * Math.PI); M.makeScale(sc, sc, sc); M.setPosition(p); W.motes.setMatrixAt(i, M); } W.motes.instanceMatrix.needsUpdate = true; }
  [['lily', -7, 7, 0.1], ['oliver', 2.6, 8.2, -0.25], ['grandpa', 7.2, 7, -0.5]].forEach(([k, dx, dz, y], i) => { const q = W[k], cheer = smooth(E.ins, E.ins + 0.3, t); place(q, T.clone().add(v3(dx, 0, dz)), Math.PI + y); pose(q, 'idle', t + i); if (cheer > 0) { const clap = Math.abs(Math.sin(t * 9 + i)) * 0.3; q.arms.forEach((a, n) => { a.rotation.x = -1.25 * cheer; a.rotation.z = (n ? -1 : 1) * (0.22 + clap) * cheer; }); } face(q, 'happy', t, i * 0.3); });
}
function poseBench(t) { const g = W.girl, b = W.noah; place(g, v3(-87, 0, 26), Math.PI); g.hips.position.y = 2.0 + 0.42; g.legs.forEach((l, i) => { l.rotation.x = -1.5; g.knee[i].rotation.x = 1.5; }); g.arms.forEach((a, i) => { a.rotation.x = -0.45; a.rotation.z = (i ? 1 : -1) * 0.12; }); lookAtP(g, H(b), 1); face(g, 'happy', t, 0.3); const P0 = v3(-90.8, 0, 21.6); place(b, P0, yawTo(P0, g.root.position)); pose(b, 'idle', t); const hd = g.neck.getWorldPosition(v3()).add(v3(-0.5, -1.2, -2.6)); aimArm(b, 0, hd, 0.96); const h = handOf(b, 0); W.rose.visible = true; W.rose.position.copy(h); face(b, 'happy', t, 0.5, { viseme: visemeAt('You look like the first warm day of spring', L(2).start, L(2).start + 1.5, t) }); }
function poseJoke(t) { const C = v3(-30, 0, 42), tell = W.teddy; [[0, -6.5, 'teddy'], [4.8, -3.5, 'theo'], [-4.8, -3.5, 'ava'], [6, 2.2, 'marcus']].forEach(([x, z, k], i) => { const c = W[k], p = C.clone().add(v3(x, 0, z)); place(c, p, yawTo(p, C)); pose(c, 'idle', t + i); if (k !== 'teddy') { const b = Math.max(0, Math.sin((t - L(2).start - 1.6) * 3.1)); c.torso.rotation.x = -0.1 - b * 0.12; c.neck.rotation.x = -0.25 - b * 0.15; face(c, 'laugh', t, i * 0.2); } else { c.arms[0].rotation.x = -1.2; c.arms[1].rotation.x = -0.9 + Math.sin(t * 6) * 0.3; face(c, 'happy', t, 0.3, { viseme: visemeAt('so the crab says to the baker', L(2).start + 1.6, L(2).start + 2.85, t) }); } }); }
function poseQuiz(t) { const Q = v3(-190, 1.2, 42); [['eli', -10.6], ['mia', -5.6], ['ripley', 5.6], ['ethan', 10.6]].forEach(([k, x], i) => { const c = W[k]; place(c, Q.clone().add(v3(x, 0, 1.2)), Math.PI); pose(c, 'idle', t + i * 0.9); c.arms[0].rotation.x = -0.6; c.arms[1].rotation.x = -0.6; face(c, 'smug', t, i * 0.31); }); }

function poseFerry(t) {
  const E = EV, s = (i) => L(i).start, F = W.fav, c = W.juno, J = F(5.2, DECK, 6.3); place(c, J, Math.PI / 2 + 0.08); pose(c, 'idle', t); c.bead.visible = t < E.snz; c.bead.level(0.3);
  const inh = smooth(E.snz - 0.9, E.snz - 0.1, t) * (1 - smooth(E.snz - 0.02, E.snz, t)), blow = t >= E.snz ? (1 - smooth(E.snz, E.snz + 0.55, t)) : 0;
  c.neck.rotation.x = -0.42 * inh + 0.56 * blow; c.torso.rotation.x = -0.12 * inh + 0.42 * blow; c.arms.forEach((a, n) => { a.rotation.x = -0.25 * inh + 0.2 * blow; });
  const shock = t > E.snz + 0.5; if (t > E.snz + 1.2) { const h = smooth(E.snz + 1.2, E.snz + 1.7, t); aimArm(c, 0, beadW(c).add(v3(0.25, -0.2, -0.1)), h); }
  const up = smooth(s(5) + 0.6, s(5) + 1.0, t); if (up > 0) c.neck.rotation.x = -0.75 * up;
  face(c, t < s(3) + 1.4 ? 'happy' : t < E.snz - 0.9 ? 'happy' : t < E.snz ? 'nervous' : t < E.snz + 0.35 ? 'pain' : t < s(5) ? 'shocked' : up > 0.3 ? 'surprised' : 'scared', t, 0.4, { viseme: t > E.snz - 0.8 && t < E.snz ? 'O' : t > s(3) + 1.45 && t < s(3) + 2.4 ? visemeAt('Oh, it was a lovely morning', s(3) + 1.45, s(3) + 2.4, t) : undefined, noBlink: t > E.snz - 0.5 && t < E.snz });
  const w = W.chloe, q = F(8.4, DECK, 7.8); place(w, q, yawTo(q, J)); pose(w, 'idle', t); lookAtP(w, H(c), 1); face(w, t < E.snz ? 'happy' : 'surprised', t, 0.7);
  const o = W.oldm, oP = F(-5.2, DECK, 3.65); sitBench(o, oP, 0, W.fa.seatY); o.neck.rotation.y = 0.5; face(o, 'neutral', t, 0.3);
  const k = W.redk, kp = F(-12.5, DECK, 3.65); sitBench(k, kp, 0, W.fa.seatY); k.neck.rotation.y = -0.4; face(k, 'happy', t, 0.5);
  const g0 = W.grayson, gp = F(-1, DECK, -3.65); sitBench(g0, gp, Math.PI, W.fa.seatY); face(g0, 'neutral', t, 0.1);
  // the bead
  const B0 = W.ear0, B1 = F(3.1, DECK + 0.24, 4.3), B2 = F(2.1, DECK + 0.24, 3.45), B3 = W.beadRestA, d = t - E.snz; W.b1.visible = t >= E.snz;
  if (W.b1.visible) { let p; if (d < 0.6) { const u = d / 0.6; p = lp3(B0, B1, u); p.y += Math.sin(u * Math.PI) * 1.6; } else if (d < 0.95) { const u = (d - 0.6) / 0.35; p = lp3(B1, B2, u); p.y += Math.sin(u * Math.PI) * 0.8; } else { const u = clamp((d - 0.95) / 1.15); p = lp3(B2, B3, easeOut(u)); } W.b1.position.copy(p); W.b1.level(0.8); }
}
function sitBench(c, p, yaw, sy) { place(c, p, yaw); c.root.position.y = DECK; c.hips.position.y = sy - DECK + 0.42; c.legs.forEach((l, i) => { l.rotation.x = -1.5; c.knee[i].rotation.x = 1.5; }); c.arms.forEach((a, i) => { a.rotation.x = -0.7; a.rotation.z = (i ? 1 : -1) * 0.1; }); }

const yTime = (t) => (t < EV.frz ? t : t < EV.res ? EV.frz : t - (EV.res - EV.frz));
function poseSchool(t) {
  const E = EV, s = (i) => L(i).start, frozen = t >= E.frz && t < E.res, j = W.juno, d = W.dez; const u = smooth(s(6) - 0.3, s(6) + 0.05, t); place(j, JS.clone().add(v3(0, 0, -1.4 * (1 - u))), Math.PI / 2); pose(j, 'idle', yTime(t)); j.bead.visible = false; lookAtP(j, H(d), 1);
  j.arms[0].rotation.x = t < s(7) ? -1.0 : -0.1; j.arms[0].rotation.z = t < s(7) ? -0.8 : -0.1; face(j, t < E.res ? 'nervous' : 'scared', t, 0.3, { viseme: talk(6, t) });
  place(d, DZ, -Math.PI / 2); pose(d, 'idle', frozen ? E.frz : t); d.bead.visible = true; d.bead.level(frozen ? 0.6 + Math.sin(t * 9) * 0.4 : 0.35);
  if (frozen) { d.neck.rotation.y = 0.05; d.arms[1].rotation.x = -0.38; }
  else { lookAtP(d, H(j), 1); }
  face(d, t < E.res ? (t >= E.frz ? 'neutral' : 'happy') : 'happy', t, 0.2, { viseme: t >= E.frz && t < E.res ? 'E' : talk(8, t), noBlink: frozen });
  const te = yTime(t); YARD.forEach(([k, x, z, sp], i) => { const c = W[k], X = x + (te - s(6) + 2.2) * sp, p = SG.clone().add(v3(X, 0, -z)); place(c, p, sp > 0 ? Math.PI / 2 : -Math.PI / 2); pose(c, 'walk', te * 0.85 + i * 0.7); face(c, 'happy', t, i * 0.22, { noBlink: frozen }); c.bead.level(frozen ? 0.9 : 0.25); });
}
function poseMemoryDez(t) { const d = W.dez, j = W.juno; place(d, DZ, -Math.PI / 2); pose(d, 'idle', 1); d.neck.rotation.y = 0.05; d.arms[1].rotation.x = -0.38; d.bead.visible = true; d.bead.level(0.7 + Math.sin(t * 8) * 0.3); face(d, 'neutral', t, 0.2, { viseme: 'E', noBlink: true }); YARD.forEach(([k, x, z, sp], i) => { const c = W[k], p = SG.clone().add(v3(x + sp * 3, 0, -z)); place(c, p, sp > 0 ? Math.PI / 2 : -Math.PI / 2); pose(c, 'walk', 3 + i * 0.7); face(c, 'happy', t, 0.2, { noBlink: true }); c.bead.level(0.8); }); }

function poseClass(t) {
  const E = EV, s = (i) => L(i).start, up = t >= E.hands ? 1 : 0, whisper = (i0, on) => (t > on && t < s(12) - 0.1 ? visemeAt(ANS + ' ' + ANS, s(10), s(11) + 2.5, t) : undefined);
  CLASS.forEach(([k, co, r], i) => { const c = W[k], p = CL.clone().add(W.cl.seat(co, r)); sit(c, p, Math.PI, W.cl.seatY); c.arms.forEach((a, n) => { a.rotation.x = -0.5; a.rotation.z = (n ? 1 : -1) * 0.2; }); c.bead.visible = k !== 'juno'; c.bead.level(0.25 + (t > s(11) ? 0.5 : 0)); const sy = t >= E.frz; const breath = Math.sin(t * 1.3 + (sy ? 0 : i)) * 0.03; c.torso.rotation.x = 0.03 + breath * 0.5;
    if (k !== 'juno') { const down = smooth(s(9) + 3.0, s(9) + 3.2, t); if (up && t < s(10) + 0.25) { c.arms[1].rotation.x = -2.95; c.arms[1].rotation.z = 0.08; c.elbow && (c.elbow[1].rotation.x = 0); } c.neck.rotation.x = -0.1; }
    if (k === 'juno') { const back = smooth(s(10) + 1.25, s(10) + 1.75, t), side = smooth(s(11) - 0.2, s(11) + 0.3, t), fwd = smooth(s(11) + 1.3, s(11) + 1.7, t); c.neck.rotation.y = back * (1 - side) * 0.62 - side * (1 - fwd) * 1.25 + (t < s(10) + 1.25 ? 0 : 0); face(c, t < E.hands ? 'neutral' : t < s(10) + 1.3 ? 'nervous' : 'scared', t, 0.3); }
    else if (k === 'priya') { face(c, 'neutral', t, 0.3, { viseme: t > s(10) && t < s(11) + 2.5 ? visemeAt(ANS + ' ' + ANS, s(10), s(11) + 2.5, t) : undefined }); }
    else face(c, 'neutral', t, 0.3, { viseme: (k === 'jake' && whisper(i, s(10) + 0.4)) || (k === 'finn' && whisper(i, s(10) + 0.4)) || undefined, noBlink: t > s(11) }); });
  const m = W.teacher, q = CL.clone().add(v3(-6, 0, -13)); place(m, q, 0.22); pose(m, 'idle', t); m.bead.level(0.25 + (t > s(11) ? 0.5 : 0));
  if (t < E.hands) { m.arms[0].rotation.x = -1.2; m.arms[0].rotation.z = -0.35; }
  else if (t < s(10) + 0.25) { m.arms[1].rotation.x = -2.95; m.arms[1].rotation.z = 0.08; }
  face(m, 'happy', t, 0.3, { viseme: t < E.hands - 0.3 ? visemeAt('Now then, who can tell me the capital of Peru', s(9), E.hands - 0.3, t) : t > s(10) && t < s(11) + 2.5 ? visemeAt(ANS + ' ' + ANS, s(10), s(11) + 2.5, t) : undefined, noBlink: t > s(11) });
}
function poseLunch(t) {
  const E = EV, s = (i) => L(i).start, j = LU.clone().add(v3(8.8, 0, 5.4)), j3 = j.clone().setY(4.6), laugh = t >= E.laugh && t < E.stop, turned = t >= E.turnL;
  LUNCH.forEach(([k, x, sd], i) => { const c = W[k], p = LU.clone().add(v3(x, 0, sd * 5.4)); sit(c, p, sd > 0 ? Math.PI : 0, W.lu.seatY); c.arms.forEach((a, n) => { a.rotation.x = -0.92; a.rotation.z = (n ? 1 : -1) * 0.1; }); c.bead.visible = k !== 'juno'; c.bead.level(laugh || turned ? 0.75 : 0.25);
    if (k === 'juno') { face(c, t < E.laugh ? 'neutral' : t < s(14) ? 'nervous' : 'scared', t, 0.3); if (t > E.laugh) c.neck.rotation.y = 0.15; return; }
    const shake = laugh ? Math.abs(Math.sin((t - E.laugh) * 11)) : 0; if (laugh) { c.neck.rotation.y = -sd * 0.6; c.neck.rotation.x = -0.14 - shake * 0.08; c.torso.rotation.x = -0.05 - shake * 0.05; }
    if (turned) { const u = smooth(E.turnL, E.turnL + 0.5, t), n = c.neck.getWorldPosition(v3()), a = wrap(yawTo(p, j3) - c.root.rotation.y); c.neck.rotation.y = clamp(a, -1.55, 1.55) * u; c.neck.rotation.x = 0; }
    face(c, laugh ? 'laugh' : turned ? (k === 'priya' ? 'neutral' : 'happy') : 'happy', t, 0.3, { noBlink: t >= E.laugh, viseme: k === 'priya' ? talk(14, t) : (laugh ? 'A' : undefined) }); });
}

// ---- the town and the threads ----
function poseQuay(t) {
  const s = (i) => L(i).start, E = EV; ROW.forEach((k, i) => { const c = W[k], p = v3(-34 + i * 4.2, 0, 18 + Math.sin(i * 2.6) * 0.8); place(c, p, Math.PI); pose(c, 'idle', 1); c.bead.level(0.9); face(c, 'neutral', t, 0.3, { noBlink: true, viseme: t > s(16) ? visemeAt('It was never about what any of us wanted to say', s(16) - 0.3, s(16) + 3.6, t) : undefined }); });
  const j = W.juno, q = v3(-12, 0, 26); place(j, q, Math.PI - 0.3); pose(j, 'idle', 1.5); j.bead.visible = false; j.neck.rotation.x = -0.3; face(j, 'scared', t, 0.3);
}
function linkThreads(t, k) { if (W.tN === undefined) { W.tN = 0; } let i = 0; const O = ORB; for (const c of ROW) { W.thr.setLine(i++, beadW(W[c]), O, 1.4); } W.spotsW.forEach((p) => { W.thr.setLine(i++, p, O, 2.6); }); W.thr.level(k); }

// ---- the empty ferry ----
function poseFerry2(t) {
  const E = EV, s = (i) => L(i).start, F = W.fbv, c = W.juno; c.bead.visible = false; W.b2.visible = true; W.b2.position.copy(W.beadRestB); const pulse = (x) => { const d = t - x; return d > 0 && d < 0.55 ? 1 - d / 0.55 : 0; }; W.b2.level(0.55 + Math.sin(t * 4) * 0.12 + (pulse(s(19)) + pulse(s(19) + 0.95)) * 0.9);
  if (t < s(18) + 1.55) { const u = smooth(s(18), s(18) + 1.5, t), a = F(10.5, DECK, 6.4), b = F(2.8, DECK, 6.4); place(c, lp3(a, b, u), yawTo(a, b)); pose(c, u < 1 ? 'walk' : 'idle', t * 0.8); lookAtP(c, W.beadRestB, 0.7); face(c, 'nervous', t, 0.3); return; }
  if (t < E.stand) { // on her front, chin on the deck, looking under the seat
    const down = F(1.0, DECK + 0.62, 9.3); place(c, down, 0); c.root.rotation.set(-Math.PI / 2, Math.PI, 0.0); c.root.quaternion.premultiply(W.fb.quaternion); c.neck.rotation.x = -1.32; c.legs.forEach((l, i) => { l.rotation.x = 0.04 * (i ? 1 : -1); }); const reach = smooth(s(19) + 0.2, s(19) + 1.2, t) * (1 - smooth(s(19) + 1.65, E.stand - 0.05, t)); c.arms[1].rotation.x = -0.55; c.arms[1].rotation.z = 0.22; c.arms[0].rotation.x = -1.2 - reach * 1.5; c.arms[0].rotation.z = -0.25 - reach * 0.05; face(c, t < s(19) ? 'surprised' : t < s(19) + 1.7 ? 'scared' : 'sad', t, 0.3); return; }
  const a = F(2.4, DECK, 5.2), b = F(16, DECK, 5.8), u = clamp((t - E.stand - 0.1) / 1.4); place(c, lp3(a, b, u), yawTo(a, b)); pose(c, 'walk', t); face(c, 'neutral', t, 0.3);
}
function poseDock(t) {
  const E = EV, s = (i) => L(i).start, D1 = v3(3.8, DECK, -10.5), P1 = v3(7.2, DECK, -10.5), d = W.dez, p = W.priya, j = W.juno, u = clamp((t - E.turn) / 0.62), turn = easeInOut(u) * Math.PI * 0.9;
  for (const [c, q, sg] of [[d, D1, 1], [p, P1, 1]]) { place(c, q, 0); pose(c, 'idle', 1); c.bead.visible = true; c.bead.level(0.45 + easeInOut(u) * 0.55 + Math.sin(t * 6) * 0.08 * u); c.neck.rotation.y = turn; face(c, 'neutral', t, 0.3, { noBlink: t >= E.turn, viseme: talk(23, t) }); }
  const a0 = v3(9.2, DECK, -35), a1 = v3(8.8, DECK, -19), w = clamp((t - E.walk) / (s(22) + 2.3 - E.walk)), jp = lp3(a0, a1, easeOut(w)); place(j, jp, yawTo(a0, a1)); pose(j, w < 1 ? 'walk' : 'idle', t * 0.95); j.bead.visible = false; if (t > s(22) && w < 1) { j.arms[0].rotation.x = -0.7; } if (u > 0) { j.torso.rotation.x = -0.05 * u; }
  face(j, t < s(22) ? 'nervous' : t < E.turn ? 'scared' : 'terrified', t, 0.3, { viseme: t > s(22) + 0.6 && t < E.turn - 0.2 ? visemeAt('Listen to me, you have to', s(22) + 0.6, E.turn - 0.2, t) : undefined });
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 }), Fa = W.fav, Fb = W.fbv, Cl = (x, y, z) => CL.clone().add(v3(x, y, z)), Lu = (x, y, z) => LU.clone().add(v3(x, y, z));
  add('ear0', 0, (u) => { const h = H(W.juno); return { pos: lp3(h.clone().add(v3(-2.2, 0.5, -14)), h.clone().add(v3(-1.9, 0.4, -12.8)), easeInOut(u)), look: h.clone().add(v3(-1.0, -1.7, 0.6)), fov: 44 }; });
  add('ear1', s(1) - 0.02, (u) => { const b = beadW(W.juno); return { pos: b.clone().add(v3(-4.6 + u * 0.4, 0.5, -5.6 + u * 0.4)), look: b.clone().add(v3(0.6, -0.75, -0.2)), fov: 36 }; });
  add('two', s(1) + 1.48, (u) => ({ pos: lp3(JB.clone().add(v3(1.2, 4.6, -13.5)), JB.clone().add(v3(0.4, 4.7, -11.8)), easeInOut(u)), look: JB.clone().add(v3(-1.5, 3.9, 0)), fov: 46 }));
  add('flower', s(2) - 0.03, (u) => ({ pos: lp3(v3(-92.5, 5.4, 6.5), v3(-92, 5.2, 8), easeInOut(u)), look: v3(-88.8, 4.6, 24), fov: 44 }));
  add('joke', s(2) + 1.58, (u) => ({ pos: lp3(v3(-25, 6.4, 18), v3(-27, 6.2, 19.5), easeInOut(u)), look: v3(-29.4, 4.6, 42), fov: 46 }));
  add('quiz', s(2) + 2.85, (u) => ({ pos: lp3(v3(-187, 7, 14), v3(-188.4, 7.4, 16.5), easeInOut(u)), look: v3(-190, 8.2, 45), fov: 58 }));
  add('fwide', s(3) - 0.02, (u) => ({ pos: lp3(Fa(46, 16, 42), Fa(40, 13, 39), easeInOut(u)), look: Fa(4, 3.5, 3), fov: 44 }));
  add('fj', s(3) + 1.36, (u) => { const h = H(W.juno); return { pos: h.clone().add(v3(8.6 - u * 0.8, 0.3, -6.2 + u * 0.4)), look: h.clone().add(v3(1, -1.7, 0.4)), fov: 42 }; });
  add('snz', E.snz - 0.92, (u) => { const J = Fa(5.2, DECK, 6.3); return { pos: J.clone().add(v3(6.4 - u * 0.5, 6.4, -5.2)), look: J.clone().add(v3(0, 3.7, -0.2)), fov: 40 }; });
  add('chase', E.snz + 0.3, (u) => { const b = W.b1.position; return { pos: b.clone().add(v3(2.1, 0.75, -3.0)), look: b.clone().add(v3(-0.1, 0.12, 0.2)), fov: 46 }; });
  add('under', s(4) + 1.18, (u) => ({ pos: lp3(Fa(0.6, DECK + 0.72, -0.3), Fa(0.75, DECK + 0.66, -0.1), u), look: W.beadRestA.clone().add(v3(0.3, 0.55, 0)), fov: 52 }));
  add('earno', s(5) - 0.03, (u) => { const h = H(W.juno); return { pos: h.clone().add(v3(5.6 - u * 0.5, 0.2, -6.6)), look: h.clone().add(v3(0, -1.4, 0)), fov: 40 }; });
  add('gulls', s(5) + 0.86, (u) => ({ pos: lp3(Fa(0.5, DECK + 5.4, 2.4), Fa(0.8, DECK + 5.1, 3.1), u), look: Fa(10, DECK + 13, 32), fov: 70 }));
  add('hi', s(6) - 0.03, (u) => ({ pos: lp3(SG.clone().add(v3(1.2, 5.6, -21)), SG.clone().add(v3(0.5, 5.4, -19.5)), easeInOut(u)), look: SG.clone().add(v3(0, 4.3, 0)), fov: 46 }));
  add('dezfrz', s(7) - 0.05, (u) => { const b = H(W.dez); return { pos: b.clone().add(v3(-5.2 + u * 0.6, -0.5, -4.6 + u * 0.4)), look: b.clone().add(v3(-0.1, -0.7, 0)), fov: 38 }; });
  add('still', s(7) + 1.4, (u) => ({ pos: lp3(SG.clone().add(v3(9, 8, -34)), SG.clone().add(v3(7, 8, -31)), easeInOut(u)), look: SG.clone().add(v3(0, 4, 0)), fov: 52 }));
  add('dez2', s(8) - 0.03, (u) => { const b = H(W.dez); return { pos: b.clone().add(v3(-7.2, 0.1, -3.4)), look: b.clone().add(v3(0, -1.3, 0)), fov: 40 }; });
  add('juno2', s(8) + 0.62, (u) => { const b = H(W.juno); return { pos: b.clone().add(v3(7.2, 0.1, -3.9)), look: b.clone().add(v3(0, -1.3, 0)), fov: 40 }; });
  add('cwide', s(9) - 0.02, (u) => ({ pos: lp3(Cl(-1, 12.5, -19.5), Cl(-0.5, 11.6, -18.2), easeInOut(u)), look: Cl(-0.5, 3.6, 5), fov: 52 }));
  add('hands', E.hands - 0.28, (u) => ({ pos: lp3(Cl(-17, 8.6, -11.5), Cl(-16, 8.4, -11), u), look: Cl(1, 3.2, 5), fov: 52 }));
  add('pri', s(10) - 0.02, (u) => { const h = H(W.priya); return { pos: h.clone().add(v3(1.3 - u * 0.3, 2.0, -9.2 + u * 0.5)), look: h.clone().add(v3(0, -1.8, 0)), fov: 38 }; });
  add('jc', s(10) + 1.42, (u) => { const h = H(W.juno); return { pos: h.clone().add(v3(-1.1 + u * 0.3, 2.0, -8.8)), look: h.clone().add(v3(0, -1.8, 0)), fov: 38 }; });
  add('beh', s(10) + 2.26, (u) => { const h = H(W.jake); return { pos: h.clone().add(v3(-1.0, 2.0, -8.4 + u * 0.4)), look: h.clone().add(v3(0, -1.8, 0)), fov: 38 }; });
  add('bes', s(11) - 0.02, (u) => { const h = H(W.finn); return { pos: h.clone().add(v3(-2.6 + u * 0.4, 2.0, -8.4)), look: h.clone().add(v3(0.2, -1.8, 0)), fov: 38 }; });
  add('tch', s(11) + 1.24, (u) => { const h = H(W.teacher); return { pos: lp3(h.clone().add(v3(1.9, 1.2, 11.4)), h.clone().add(v3(1.3, 1.1, 9.8)), easeInOut(u)), look: h.clone().add(v3(0.1, -1.6, 0)), fov: 40 }; });
  add('lwide', s(12) - 0.02, (u) => ({ pos: lp3(Lu(21, 7, 0.4), Lu(19.5, 6.8, 0.2), easeInOut(u)), look: Lu(0, 4.6, 0), fov: 54 }));
  add('lfaces', E.laugh + 0.82, (u) => ({ pos: lp3(Lu(13, 5.6, 3.4), Lu(12.2, 5.5, 3), u), look: Lu(0, 2.4, -5.4), fov: 40 }));
  add('jd', s(13) - 0.03, (u) => { const h = H(W.juno); return { pos: h.clone().add(v3(1.6, 2.4, -9.4 + u * 0.8)), look: h.clone().add(v3(0, -1.9, 0)), fov: 38 }; });
  add('turned', E.turnL - 0.02, (u) => ({ pos: lp3(Lu(27, 6.6, 0), Lu(25, 6.4, 0), easeInOut(u)), look: Lu(0, 3.0, 0), fov: 46 }));
  add('turnp', s(14) + 0.6, (u) => ({ pos: lp3(Lu(13, 5.9, 6.4), Lu(12.7, 5.8, 6), u), look: Lu(8.8, 2.4, -5.4), fov: 40 }));
  add('aerial', s(15) - 0.03, (u) => ({ pos: lp3(v3(-30, 66, -112), v3(-30, 58, -94), easeInOut(u)), look: v3(-30, 10, 48), fov: 54 }));
  add('one', E.one - 0.5, (u) => ({ pos: lp3(v3(-24, 3.8, -8), v3(-24, 3, -10), u), look: lp3(v3(-22, 14, 34), v3(-21, 200, 330), easeInOut(Math.min(1, u * 1.7))), fov: 74 }));
  add('rowt', s(16) - 0.03, (u) => { const a = v3(-37, 4.5, 8.6), b = v3(-30, 4.5, 8.6); return { pos: lp3(a, b, u), look: lp3(a, b, u).add(v3(2.8, 0.15, 12)), fov: 42 }; });
  add('rowa', s(16) + 1.72, (u) => ({ pos: lp3(v3(-18, 12, -18), v3(-18, 16, -21), easeInOut(u)), look: lp3(v3(-18, 5, 20), v3(-18, 56, 160), easeInOut(u)), fov: 62 }));
  add('dezm', s(17) - 0.03, (u) => { const b = H(W.dez); return { pos: b.clone().add(v3(-4.9 + u * 0.8, -0.4, -4.3 + u * 0.6)), look: b.clone().add(v3(-0.1, -0.6, 0)), fov: 36 }; });
  add('jalone', s(17) + 1.72, (u) => ({ pos: lp3(v3(-12.5, 22, -3), v3(-12.5, 34, -6), easeInOut(u)), look: v3(-12, 2.8, 26), fov: 44 }));
  add('empty', s(18) - 0.03, (u) => ({ pos: lp3(Fb(19, 6.8, 5.0), Fb(17, 6.4, 5.1), easeInOut(u)), look: Fb(4, 2.8, 5.6), fov: 50 }));
  add('prone', s(18) + 1.55, (u) => ({ pos: lp3(Fb(-6.5, DECK + 3.0, 7.4), Fb(-5.8, DECK + 2.8, 7.1), u), look: Fb(1.4, DECK + 0.9, 5.2), fov: 42 }));
  add('beadc', s(19) - 0.03, (u) => { const b = W.beadRestB; return { pos: lp3(Fb(0.9, DECK + 0.55, -0.7), Fb(0.95, DECK + 0.55, -0.4), u), look: lp3(b.clone().add(v3(0, 0.2, 0)), Fb(1.0, DECK + 0.95, 3.8), Math.min(1, u * 1.3)), fov: 42 }; });
  add('leave', E.stand + 0.04, (u) => { const b = W.beadRestB; return { pos: Fb(-1.5, DECK + 0.5, 0.6), look: b.clone().lerp(Fb(4, DECK + 1.7, 6), 0.72), fov: 48 }; });
  add('dock', s(21) - 0.03, (u) => ({ pos: lp3(v3(-14, 13, -54), v3(-11, 11.5, -50), easeInOut(u)), look: v3(5.5, 4.2, -18), fov: 42 }));
  add('warn', s(22) - 0.03, (u) => { const h = H(W.juno); return { pos: h.clone().add(v3(1.3, 0.3, 9)), look: h.clone().add(v3(0, -1.4, 0)), fov: 40 }; });
  add('backs', s(22) + 1.6, (u) => ({ pos: lp3(v3(3, 6.4, -31), v3(3.6, 6.3, -27), easeInOut(u)), look: v3(5.3, 3.9, -10.5), fov: 38 }));
  add('faces', s(23) - 0.04, (u) => ({ pos: lp3(v3(5.5, 6.1, -26.6), v3(5.5, 6, -24.8), u), look: v3(5.5, 4.1, -10.5), fov: 44 }));
  add('last', s(23) + 1.02, (u) => ({ pos: lp3(v3(3.3, 6.5, -34), v3(3.7, 6.4, -31), easeInOut(u)), look: v3(6, 4, -6), fov: 50 }));
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}

function setKey(t) { const s = (i) => L(i).start; if (t < s(2) - 0.03) return 'birth'; if (t < s(2) + 1.58) return 'bench'; if (t < s(2) + 2.85) return 'joke'; if (t < s(3) - 0.02) return 'quiz'; if (t < s(6) - 0.03) return 'ferry'; if (t < s(9) - 0.02) return 'school'; if (t < s(12) - 0.02) return 'class'; if (t < s(15) - 0.03) return 'lunch'; if (t < s(17) - 0.03) return 'quay'; if (t < s(17) + 1.72) return 'mem'; if (t < s(18) - 0.03) return 'jalone'; if (t < s(21) - 0.03) return 'ferry2'; return 'dock'; }

function renderAt(t) {
  const s = (i) => L(i).start, E = EV, key = setKey(t);
  const wr = (a, b, k) => mixP(a, b, k);
  let env = SUN;
  if (key === 'school') env = wr(SUN, WRONG, smooth(E.frz, E.res + 0.7, t) * 0.34);
  else if (key === 'class') env = wr(ROOM, ROOMW, smooth(E.hands - 0.1, s(11) + 2, t) * 0.75 + 0.1);
  else if (key === 'lunch') env = wr(ROOM, ROOMW, smooth(E.laugh, E.stop, t) * 0.3 + 0.7);
  else if (key === 'quay' || key === 'mem' || key === 'jalone') env = WRONG;
  else if (key === 'ferry2') env = wr(WRONG, DUSKW, 0.7 + smooth(s(18), s(21), t) * 0.3);
  else if (key === 'dock') env = wr(DUSKW, { ...DUSKW, ...P({ top: '#3b5552', horizon: '#c9a968', haze: '#ae9f7a' }), sunI: 0.85, hemiI: 1.22, saturation: 0.72 }, smooth(E.turn, E.turn + 1.2, t));
  else if (key === 'birth' || key === 'bench' || key === 'joke' || key === 'quiz' || key === 'ferry') env = SUN;
  applyEnv(ctx, env);
  const set = { birth: 'har', bench: 'har', joke: 'har', quiz: 'har', ferry: 'fa', school: 'har', class: 'cl', lunch: 'lu', quay: 'har', mem: 'har', jalone: 'har', ferry2: 'fb', dock: 'har' }[key];
  W.har.visible = set === 'har' || set === 'fb' || key === 'dock'; W.fa.visible = set === 'fa'; W.fb.visible = key === 'ferry2' || key === 'dock' || key === 'quay' || key === 'jalone'; W.cl.visible = set === 'cl'; W.lu.visible = set === 'lu'; W.sea.visible = set !== 'cl' && set !== 'lu'; W.gulls.visible = set === 'fa' || key === 'birth' || key === 'ferry2'; W.pt.forEach((l) => { l.intensity = l.userData.set === set ? l.userData.I : 0; });
  W.distant.visible = set === 'fa'; W.crowd.visible = key === 'quay' || key === 'jalone' || key === 'dock';
  W.all.forEach((c) => { c.root.visible = false; c.bead.visible = true; c.bead.level(0.3); }); W.b0.visible = false; W.b1.visible = false; W.b2.visible = false; W.motes.visible = false; W.rose.visible = false; W.beads.level(0); W.thr.level(0); W.orb.set(0);
  W.sea.update(t); W.gulls.update(t); W.gulls.position.copy(set === 'fa' ? FA.clone().add(v3(8, 8, 30)) : v3(-120, 6, -8)); if (W.clouds) W.clouds.visible = !(key === 'quay' || key === 'jalone');
  if (W.fa.visible) { W.fa.update(t, 0.22); W.distant.position.x = FA.x + 40 + t * 2.2; } if (W.fb.visible) W.fb.update(t, 0.008);
  if (key === 'birth') poseBirthday(t); else if (key === 'bench') poseBench(t); else if (key === 'joke') poseJoke(t); else if (key === 'quiz') poseQuiz(t);
  else if (key === 'ferry') poseFerry(t); else if (key === 'school') poseSchool(t); else if (key === 'class') poseClass(t); else if (key === 'lunch') poseLunch(t);
  else if (key === 'quay' || key === 'jalone') { poseQuay(t); W.crowd.update(1.2); const k = smooth(s(15), s(15) + 1.2, t); W.beads.level(k); W.orb.set(smooth(E.one - 0.45, E.one + 0.35, t)); ctx.scene.updateMatrixWorld(true); linkThreads(t, smooth(E.one - 0.5, E.one + 0.3, t)); }
  else if (key === 'mem') poseMemoryDez(t);
  else if (key === 'ferry2') poseFerry2(t);
  else if (key === 'dock') { poseDock(t); W.crowd.update(1.2); }
  if (key === 'ferry2') { W.har.visible = true; }
  ctx.scene.updateMatrixWorld(true);
  let sh = shotAt(W.shots, t);
  (HIDE[sh.name] || []).forEach((k) => { W[k].root.visible = false; });
  { const dq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2, 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2; c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2], Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  { const cq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  const jolt = t > E.snz && t < E.snz + 0.28 ? 0.4 * (1 - (t - E.snz) / 0.28) : 0;
  frame(ctx, t, sh, { steady: true, shake: jolt, shadowSpan: key === 'quay' || key === 'dock' || key === 'jalone' ? 110 : key === 'ferry' ? 70 : 60, shadows: true, black: 0 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep107', { look: 'pro', avatars: [...new Set(Object.values(AV).map((a) => a[0]))] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'shocked', 'surprised', 'nervous', 'scared', 'terrified', 'pain', 'laugh', 'blink']);
  const { scene, camera } = ctx; camera.far = 2600; camera.near = 0.15; camera.updateProjectionMatrix();
  W.clouds = clouds(scene, { count: 12, y: 220, spread: 1400, size: 34 });
  W.sea = bayWater(); scene.add(W.sea); W.gulls = gulls(16); scene.add(W.gulls);
  W.har = harbour(); scene.add(W.har);
  W.fa = ferry(); W.fa.position.copy(FA); scene.add(W.fa); W.fb = ferry(); W.fb.position.copy(FB); W.fb.rotation.y = Math.PI / 2; scene.add(W.fb);
  W.fa.updateMatrixWorld(true); W.fb.updateMatrixWorld(true); W.fav = FLOC(W.fa); W.fbv = FLOC(W.fb);
  W.cl = classroom(); W.cl.position.copy(CL); scene.add(W.cl); W.lu = lunchroom(); W.lu.position.copy(LU); scene.add(W.lu);
  { const g = new THREE.Group(), r = rng(19), m = new THREE.MeshStandardMaterial({ color: '#9fc7c4', roughness: 0.9 }); for (let i = 0; i < 34; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(18 + r() * 22, 18 + r() * 34, 14), m); b.position.set(-340 + i * 20, 12, 0); g.add(b); } g.position.set(FA.x + 40, WATER, FA.z - 420); scene.add(g); W.distant = g; }
  W.pt = []; for (const [set, p, c, I, d] of [['cl', CL.clone().add(v3(0, 15, -2)), '#fff0d8', 560, 60], ['lu', LU.clone().add(v3(0, 15, 0)), '#fff0d8', 560, 60]]) { const l = new THREE.PointLight(c, I, d, 1.5); l.position.copy(p); l.userData.I = I; l.userData.set = set; scene.add(l); W.pt.push(l); }
  W.crowd = crowd({ count: 240, w: 300, d: 40, seed: 31, look: v3(5, 0, -40), cheer: 0, scale: 1 }); W.crowd.position.set(-20, 0, 34); scene.add(W.crowd);
  people();
  W.b0 = looseBead(0.2); scene.add(W.b0); W.b1 = looseBead(0.24); scene.add(W.b1); W.b2 = looseBead(0.26); scene.add(W.b2);
  W.beadRestA = W.fav(1.2, DECK + 0.26, 2.3); W.beadRestB = W.fbv(1.2, DECK + 0.26, 2.3);
  { const c = W.juno; place(c, W.fav(5.2, DECK, 6.3), Math.PI / 2 + 0.08); pose(c, 'idle', EV.snz); W.ear0 = beadW(c); }
  W.motes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd76a').multiplyScalar(2) }), 24); W.motes.frustumCulled = false; W.motes.userData.noAO = true; scene.add(W.motes);
  W.rose = new THREE.Group(); { const s0 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.4, 6), new THREE.MeshStandardMaterial({ color: '#3f8a44' })); s0.position.y = 0.5; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), new THREE.MeshStandardMaterial({ color: '#e0394f', roughness: 0.5 })); b.position.y = 1.3; W.rose.add(s0, b); } scene.add(W.rose);
  const spots = [...W.har.beadSpots], r0 = rng(77); W.crowd.people.forEach((p) => spots.push(v3(W.crowd.position.x + p.x + 0.7, 4.8, W.crowd.position.z + p.z)));
  W.beads = townBeads(spots); scene.add(W.beads);
  W.spotsW = spots.filter((_, i) => i % 2 === 0); W.orb = oneOrb(); W.orb.position.copy(ORB); scene.add(W.orb); W.thr = threads(ROW.length + W.spotsW.length); scene.add(W.thr);
  W.shots = shots();
  window.__ep107 = { W, THREE, ctx };
  return expose(ctx, renderAt, L(23).start + 0.5, EV);
}
