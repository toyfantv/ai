// Flower Man remake 11: Shuffle Night. In Dappleford everyone's age is shuffled overnight every ten years. Rudy and Oskar, twelve,
// seal a pact with their secret handshake: whatever age they get, they stay best friends. Oskar practises being grown-up.
// Rudy wakes up two; Mom is nine, crying under the cookie jar; his sister is forty and has grounded everyone. The doorbell rings:
// an old man with a cane and a game controller does the handshake with one shaky pinky. It's Oskar, seventy-eight, and he keeps the pact.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, mixP, DAY } from '../engine/stage.js';
import { clouds, sparkles } from '../engine/atmos.js';
import { aimArm as aimArm0 } from '../engine/anims.js';
import { jointify } from '../engine/infinitetower.js';
import { kitchenSet } from '../engine/lighterlies.js';
import { FARM } from '../engine/farm_cast.js';
import { street, bedroom, houseRoom, cane, controller, mug, newspaper, stroller, spoon, peaBowl, briefcase, walker, blanket,
  wearTie, wearApron, wearDiaper, wearScarf, wearMustache, wearCap, wearShades } from '../engine/shufflenight.js';

// aimArm for scaled characters: the parent's world matrix carries the body's scale, so take its rotation by decomposing it
const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
void aimArm0;
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV;
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
// [avatar, scale, head scale]
const AV = {
  rudy: ['farm_young_kid', 0.8], baby: ['farm_young_kid', 0.5, 1.34], oskar: ['farm_lt_cole', 0.8], old: ['farm_grandpa', 1.0],
  momkid: ['farm_classic_mom', 0.64, 1.08], sister: ['farm_ms_henderson', 1.0], fennick: ['farm_red_kid', 0.6, 1.08],
  four: ['farm_lily', 0.5, 1.15], forty: ['farm_bacon_dad_suit', 1.0], ninety: ['farm_grandma', 0.94],
  ex1: ['farm_nia', 1.0], ex2: ['farm_ethan', 0.98], ex3: ['farm_grandma_june', 0.94], ex4: ['farm_chloe', 0.8], ex5: ['farm_bacon_hair', 1.0],
};
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';

// places
const BR = v3(1500, 0, 1500), HR = v3(-1500, 0, 1500), OK = v3(1500, 0, -1500);
const br = (x, y, z) => BR.clone().add(v3(x, y, z)), hr = (x, y, z) => HR.clone().add(v3(x, y, z)), ok = (x, y, z) => OK.clone().add(v3(x, y, z));

const SUNNY = { ...DAY, ...P({ top: '#2d8ff0', horizon: '#cdeeff', haze: '#cdeeff', sunColor: '#fff3dc', hemiSky: '#d6edff', hemiGround: '#cfe0a8' }), sunDir: v3(-0.35, 0.78, 0.52), sunI: 2.0, sunDisc: 0.3, hemiI: 1.2, amb: 0.32, envI: 1.0, exposure: 1.0, bloom: 0.03, vig: 0, saturation: 1.24, contrast: 1.05, bounce: 0.2, fogNear: 260, fogFar: 1300, stars: 0, moon: 0, win: 0, lamp: 0 };
const ROOM = { ...SUNNY, ...P({ top: '#fff0d6', horizon: '#fff0d6', haze: '#fff0d6', sunColor: '#ffe9c4', hemiSky: '#fff6e6', hemiGround: '#e2c69a' }), sunDir: v3(0.75, 0.55, 0.35), sunI: 1.5, sunDisc: 0, hemiI: 1.5, amb: 0.5, envI: 0.75, saturation: 1.18, fogNear: 400, fogFar: 1300 };
const NITE = { ...ROOM, ...P({ top: '#1a2450', horizon: '#2a3768', haze: '#1c2550', sunColor: '#9fb4ff', hemiSky: '#4a5fa8', hemiGround: '#2a2238' }), sunDir: v3(-0.3, 0.7, -0.6), sunI: 0.05, hemiI: 0.5, amb: 0.12, envI: 0.3, exposure: 1.05, saturation: 1.1, contrast: 1.06 };

function events() { const s = (i) => L(i).start, e = (i) => L(i).end; return { hs: s(4) + 1.9, sip: s(5) + 1.45, shades: s(6) + 0.15, popup: s(7) + 0.5, bell: s(11) + 0.05, open: s(11) + 0.45, pinky: s(12) + 0.5, slideGo: s(2) + 2.5, end: ctx.dur, e15: e(15) }; }

// ---- helpers ----
const armLen = (c) => { if (!c._alen) { c.reset(); const r = c.root.rotation.clone(), p = c.root.position.clone(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3().setFromObject(c.arms[0]); c._alen = sh.y - bx.min.y - 0.12 * (c.spec.scale || 1); c.root.rotation.copy(r); c.root.position.copy(p); c.root.updateMatrixWorld(true); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.arms[side].localToWorld(v3(0, -armLen(c) / s, 0.1)); };
const shoulderOf = (c, side) => { c.root.updateMatrixWorld(true); return c.arms[side].getWorldPosition(v3()); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.head.rotation.set(0, 0, 0); c.arms.forEach((a) => a.quaternion.identity()); Object.values(c.worn || {}).forEach((g) => { g.visible = false; }); }
function place(c, p, yaw) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; }
const HY = (c) => c.hipY * (c.spec.scale || 1);   // the hips' height in world units
function sitAt(c, p, yaw, seatY, o = {}) { place(c, p, yaw); c.root.position.y = 0; c.hips.position.y = c.hipY + (seatY - HY(c) + 0.12 * (c.spec.scale || 1)) / (c.spec.scale || 1); c.legs.forEach((l, i) => { l.rotation.x = -1.5; if (c.knee) c.knee[i].rotation.x = o.straight ? 0 : 1.5; }); c.arms.forEach((a, i) => { a.rotation.x = -0.6; a.rotation.z = (i ? 1 : -1) * 0.1; }); }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const H = (c) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.neck.getWorldPosition(v3()).add(v3(0, 0.8 * s * (c.headK || 1), 0)); };
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.noBlink ? false : blinkAt(t, ph), viseme: o.viseme, gaze: o.gaze }); }
const talk = (i, t, txt) => (t > L(i).start && t < L(i).end ? visemeAt(txt || L(i).text, L(i).start, L(i).end, t) : undefined);
function lookAtP(c, p, k = 1) { c.root.updateMatrixWorld(true); const n = c.neck.getWorldPosition(v3()), a = wrap(yawTo(n, p) - c.root.rotation.y); c.neck.rotation.y = clamp(a, -1.3, 1.3) * k; c.neck.rotation.x = -Math.atan2(p.y - n.y - 0.6, Math.hypot(p.x - n.x, p.z - n.z)) * 0.6 * k; }
function hold(o, c, side, off = v3(0, 0, 0)) { o.visible = true; const h = handOf(c, side); o.position.copy(h).add(off); }
function walkTo(c, a, b, t0, t1, t, speed = 1) { const u = clamp((t - t0) / (t1 - t0)); place(c, lp3(a, b, u), yawTo(a, b)); pose(c, u > 0 && u < 1 ? 'walk' : 'idle', t * speed); return u; }

// ---- people ----
function people() {
  for (const [k, [avatar, scale, headK]] of Object.entries(AV)) {
    const c = makeCharacter({ avatar, alti: true, skin: skinOf(avatar), caustic: false, scale });
    ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c.key = k; c.headK = headK || 1;
    if (headK) c.head.scale.setScalar(headK);
    c.worn = {}; c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c);
    W[k] = c;
  }
  W.all = Object.keys(AV).map((k) => W[k]);
  const wr = (c, name, g) => { c.worn[name] = g; g.visible = false; };
  wr(W.oskar, 'tie', wearTie(W.oskar)); wr(W.oskar, 'shades', wearShades(W.oskar));
  wr(W.baby, 'diaper', wearDiaper(W.baby)); wr(W.momkid, 'apron', wearApron(W.momkid));
  wr(W.old, 'scarf', wearScarf(W.old, '#f3c43a')); wr(W.old, 'stache', wearMustache(W.old, { y: Q.get('sy') ? +Q.get('sy') : 0.33 }));
  wr(W.fennick, 'cap', wearCap(W.fennick, '#7c7f86')); wr(W.fennick, 'stache', wearMustache(W.fennick, { y: 0.33 }));
}
const wearOn = (c, ...names) => names.forEach((n) => { c.worn[n].visible = true; });

// ---- scenes: each a pure function of t ----
const EX = [['ex1', -60, -15.5, 1, 0.2], ['ex2', -10, 15.5, -1, 0.8], ['ex3', 30, -14.5, 1, 1.5], ['ex4', 64, 15, -1, 2.2], ['ex5', 90, -15.5, -1, 0.5]];
function poseStreetExtras(t, list = EX) { list.forEach(([k, x, z, dir, ph], i) => { const c = W[k], X = x + dir * (t * 3.2); place(c, v3(X, 0.3, z), dir > 0 ? Math.PI / 2 : -Math.PI / 2); pose(c, 'walk', t * 0.9 + ph); face(c, 'happy', t, ph); }); }

function poseTrio(t) {
  const s = (i) => L(i).start, Z = 15.2;
  const f = W.four, a = W.forty, n = W.ninety;
  place(f, v3(4.5, 0.3, Z), Math.PI); pose(f, 'idle', t); f.arms[0].rotation.x = -0.15; hold(W.brief, f, 0, v3(0, -0.55, 0)); W.brief.rotation.set(0, Math.PI / 2, 0); face(f, 'smug', t, 0.2); f.neck.rotation.y = 0.15;
  place(a, v3(0, 0.3, Z + 0.4), Math.PI); pose(a, 'idle', t + 1); a.arms[1].rotation.x = -1.0; a.arms[1].rotation.z = 0.4; face(a, 'happy', t, 0.5); hold(W.mugA, a, 1, v3(0, 0.15, 0));
  place(n, v3(-4.5, 0.3, Z + 0.9), Math.PI); pose(n, 'idle', t + 2); n.torso.rotation.x = 0.18; n.neck.rotation.x = -0.15; W.walker.visible = true; W.walker.position.set(-4.5, 0.3, Z - 0.6); W.walker.rotation.y = 0; aimArm(n, 0, v3(-3.4, 3.5, Z - 0.6), 1); aimArm(n, 1, v3(-5.6, 3.5, Z - 0.6), 1); face(n, 'happy', t, 0.8);
  void s;
}
function poseSlide(t) {
  const E = EV, sl = W.street.slide, fk = W.fennick; sl.updateMatrixWorld(true); wearOn(fk, 'cap', 'stache');
  W.caneF.visible = true; W.caneF.position.copy(sl.localToWorld(v3(12.6, 0.12, 2.6))); W.caneF.rotation.set(0, 0.6, Math.PI / 2);
  if (t < E.slideGo) {   // running across the sand toward the ladder, cane left behind
    const a = sl.localToWorld(v3(14, 0, 9)), b = sl.localToWorld(v3(-2.2, 0, 2.5)); walkTo(fk, a, b, L(2).start - 0.2, E.slideGo + 0.4, t, 1.6); pose(fk, 'run', t * 0.85); face(fk, 'laugh', t, 0.2);
    return;
  }
  const u = clamp((t - E.slideGo - 0.15) / 1.25), p = sl.path(easeIn2(u));
  place(fk, sl.localToWorld(p), yawTo(sl.localToWorld(v3(0, 0, 0)), sl.localToWorld(v3(1, 0, 0))));
  fk.root.position.y = sl.localToWorld(p).y; fk.hips.position.y = fk.hipY * 0.55; fk.legs.forEach((l) => { l.rotation.x = -1.45; }); fk.knee.forEach((k) => { k.rotation.x = 0.1; });
  fk.torso.rotation.x = -0.25; fk.arms.forEach((a, i) => { a.rotation.x = -2.8; a.rotation.z = (i ? 1 : -1) * 0.35; }); face(fk, 'laugh', t, 0.2);
}
const pw = (x, K) => { if (x <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (x <= K[i][0]) { const u = (x - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); return lerp(K[i - 1][1], K[i][1], u * u * (3 - 2 * u)); } return K[K.length - 1][1]; };
const easeIn2 = (u) => u * u * (0.6 + 0.4 * u);
function poseBoys(t) {
  const s = (i) => L(i).start, r = W.rudy, o = W.oskar, x0 = -30 + (t - s(3)) * 3.4;
  place(r, v3(x0, 0.3, -14.2), Math.PI / 2); pose(r, 'walk', t); place(o, v3(x0 - 0.3, 0.3, -17.2), Math.PI / 2); pose(o, 'walk', t + 0.4);
  lookAtP(r, H(o), 0.8); lookAtP(o, H(r), 0.8); face(r, 'happy', t, 0.3); face(o, t > s(3) + 1.6 ? 'laugh' : 'grin', t, 0.6);
  // a fist bump at the end of the line
  const fb = smooth(s(4) - 1.0, s(4) - 0.6, t) * (1 - smooth(s(4) - 0.25, s(4) - 0.05, t));
  if (fb > 0) { const m = lp3(shoulderOf(r, 1), shoulderOf(o, 0), 0.5).add(v3(1.4, -0.4, 0)); aimArm(r, 1, m.clone().add(v3(0, 0, -0.2)), fb); aimArm(o, 0, m.clone().add(v3(0, 0, 0.2)), fb); }
}

// the secret handshake (arms are straight, so the bodies are placed for the hands to meet): a's arm sa and b's arm sb, both on the same side of the pair
// move c sideways until its straight arm `side` ends at M
function reachPlace(c, side, M, frac = 0.97) {
  const al = armLen(c) * frac;
  for (let i = 0; i < 4; i++) { const sh = shoulderOf(c, side), dy = sh.y - M.y; const h = Math.sqrt(Math.max(0.01, al * al - dy * dy)), hv = v3(sh.x - M.x, 0, sh.z - M.z), hd = hv.length(); if (Math.abs(hd - h) < 0.01) break; c.root.position.add(hv.normalize().multiplyScalar(h - hd)); c.root.updateMatrixWorld(true); }
}
function handshake(a, sa, b, sb, M, t0, t, amp = 1) {
  const u = t - t0, reach = smooth(-0.35, 0.15, u), hook = smooth(0.55, 0.85, u), wig = u > 1.0 ? Math.sin((u - 1.0) * 16) * 0.07 * amp * (1 - smooth(2.1, 2.4, u)) : 0;
  const m = M.clone().add(v3(0, hook * 0.1 * amp + wig, 0));
  aimArm(a, sa, m, reach); aimArm(b, sb, m, reach); W.M = m; return m;
}
function posePact(t) {
  const E = EV, s = (i) => L(i).start, r = W.rudy, o = W.oskar, R0 = br(1.2, 0, 3.2);
  const turn = smooth(E.hs - 0.55, E.hs - 0.1, t), yR = lerp(Math.PI / 2 + 0.5, Math.PI / 2, turn), yO = lerp(Math.PI / 2 - 0.35, -Math.PI / 2, turn);
  place(r, R0, yR); pose(r, 'idle', t); place(o, R0.clone().add(v3(3.4 - 1.5 * turn, 0, -0.04)), yO); pose(o, 'idle', t + 1);
  const playing = t < E.hs - 0.55;
  if (playing) { for (const [c, cc] of [[r, W.padR], [o, W.padO]]) { c.arms.forEach((a, i) => { a.rotation.x = -1.05; a.rotation.z = (i ? 1 : -1) * -0.32; }); c.neck.rotation.x = -0.05; const h = handOf(c, 0).lerp(handOf(c, 1), 0.5); cc.visible = true; cc.position.copy(h).add(v3(0, 0.1, 0)); cc.rotation.set(0.4, c.root.rotation.y, 0); } }
  else {
    place(r, R0, Math.PI / 2); pose(r, 'idle', t); place(o, R0.clone().add(v3(1.9, 0, -0.04)), -Math.PI / 2); pose(o, 'idle', t + 1);
    const al = armLen(r), sR = shoulderOf(r, 0), M = sR.clone().add(v3(0.64 * al, -0.766 * al, 0)); reachPlace(o, 1, M);
    handshake(r, 0, o, 1, M, E.hs, t); lookAtP(r, H(o), 0.7); lookAtP(o, H(r), 0.7);
  }
  face(r, playing ? 'focused' : t > s(4) + 4.1 ? 'happy' : 'grin', t, 0.3); face(o, playing ? 'focused' : t > s(4) + 4.1 ? 'happy' : 'grin', t, 0.7);
  W.bed.screen.set(t * 0.4, !playing);
}
function poseGrownup(t) {
  const E = EV, s = (i) => L(i).start, o = W.oskar, P0 = ok(5.2, 0, 2.4);
  place(o, P0, 0); pose(o, 'idle', t); wearOn(o, 'tie');
  // the paper in the left hand (upside down), the mug in the right
  const sipU = smooth(E.sip - 0.35, E.sip, t) * (1 - smooth(E.sip + 0.6, E.sip + 0.95, t));
  const paperAt = P0.clone().add(v3(0.75, 2.2, 1.65));
  aimArm(o, 1, paperAt.clone().add(v3(0.5, -0.4, -0.2)), 1); W.paper.visible = true; W.paper.position.copy(paperAt); W.paper.rotation.set(-0.15, 0, 0);
  const mouth = H(o).add(v3(-0.12, -0.35, 0.55)), rest = P0.clone().add(v3(-1.15, 2.6, 1.45));
  const mg = lp3(rest, mouth, sipU); aimArm(o, 0, mg, 1); W.mugO.visible = true; W.mugO.position.copy(mg).add(v3(0, -0.36, 0)); W.mugO.rotation.set(-sipU * 0.9, 0, 0);
  const cool = t >= E.shades; if (cool) { wearOn(o, 'shades'); }
  const nod = t > s(6) ? Math.sin((t - s(6)) * 6) * 0.04 : 0; o.neck.rotation.x = -0.05 + nod;
  face(o, t < E.sip ? 'focused' : t < E.sip + 1.0 ? 'Blegh!' : cool ? 'smug' : 'neutral', t, 0.4, { viseme: talk(6, t), noBlink: cool });
}

function poseWake(t) {
  const E = EV, s = (i) => L(i).start, b = W.baby, B0 = W.bed.bedAt.clone().add(BR), top = W.bed.bedTop;
  const up = smooth(E.popup - 0.2, E.popup + 0.25, t), at = B0.clone().add(v3(0, 0, -2.6));
  sitAt(b, at, 0, top + 0.05, { straight: true }); wearOn(b, 'diaper'); b.torso.rotation.x = lerp(-1.3, 0, up); b.root.position.y = 0;
  if (up < 1) b.hips.position.y -= (1 - up) * 0.2;
  const look = smooth(s(7) + 1.5, s(7) + 1.8, t), mama = t >= s(8);
  b.arms.forEach((a, i) => { a.rotation.x = lerp(-0.2, -1.55, look); a.rotation.z = (i ? 1 : -1) * lerp(0.15, -0.28, look); });
  if (look > 0) b.neck.rotation.x = 0.45 * look * (1 - smooth(s(8) - 0.15, s(8), t));
  if (mama) { b.arms.forEach((a, i) => { a.rotation.x = -2.6; a.rotation.z = (i ? 1 : -1) * 0.5; }); b.neck.rotation.x = -0.2; }
  face(b, t < E.popup ? 'sleepy' : t < s(7) + 1.6 ? 'surprised' : mama ? 'scream' : 'shocked', t, 0.3, { viseme: talk(8, t, 'Maaama'), noBlink: mama });
  // the quilt slides off as he sits up
  W.bed.quilt.position.z = BR.z - up * 1.4;
}
function poseKitchen(t) {
  const s = (i) => L(i).start, m = W.momkid, b = W.baby, room = W.house, jar = room.jar;
  // Mom, nine, reaching up at the fridge for the jar, crying
  const MP = hr(-1.6, 0, -8.6); place(m, MP, Math.PI); m.root.rotation.y = 0.15 + Math.PI * 0; pose(m, 'idle', t); wearOn(m, 'apron');
  m.root.rotation.y = Math.PI; m.root.rotation.y = 0;   // face the fridge (-z): yaw pi
  m.root.rotation.y = Math.PI;
  const jw = jar.getWorldPosition(v3()).add(v3(0, 1, 0)), str = Math.sin(t * 7) * 0.08;
  aimArm(m, 0, jw.clone().add(v3(0.6, str, 0)), 1); aimArm(m, 1, jw.clone().add(v3(-0.6, -str, 0)), 1); m.neck.rotation.x = -0.45;
  m.root.position.y = Math.max(0, Math.sin(t * 7.5)) * 0.25;   // little jumps
  face(m, 'cry', t, 0.3);
  // the toddler on the floor watching
  const BP = hr(-6.6, 0, -4.2); sitAt(b, BP, 0.9, 0.05, { straight: true }); wearOn(b, 'diaper'); lookAtP(b, H(m), 1); face(b, 'nervous', t, 0.5);
  b.arms.forEach((a, i) => { a.rotation.x = -0.5; a.rotation.z = (i ? 1 : -1) * 0.2; });
  void s;
}
function poseSister(t) {
  const s = (i) => L(i).start, st = W.sister, m = W.momkid, b = W.baby, room = W.house, step = HR.clone().add(room.step);
  // the two of them on the bottom stair, sulking
  sitAt(m, step.clone().add(v3(1.3, 0, 0.2)), 0.12, room.stepY + 0.02); wearOn(m, 'apron'); m.arms.forEach((a, i) => { a.rotation.x = -1.05; a.rotation.z = (i ? 1 : -1) * -0.42; }); m.neck.rotation.x = 0.2; face(m, 'sad', t, 0.4);
  sitAt(b, step.clone().add(v3(-1.3, 0, 0.35)), 0.12, room.stepY + 0.02, { straight: true }); wearOn(b, 'diaper'); b.arms.forEach((a, i) => { a.rotation.x = -0.6; a.rotation.z = (i ? 1 : -1) * 0.1; }); b.neck.rotation.x = 0.15; face(b, 'sad', t, 0.6);
  const SP = step.clone().add(v3(4.4 * 0.55, 0, 6.6 * 0.55)).setY(0); place(st, SP, yawTo(SP, step) + 0.15); pose(st, 'idle', t);
  // hands on hips, then the finger
  const pt = smooth(s(10) + 1.1, s(10) + 1.4, t);
  st.arms.forEach((a, i) => { a.rotation.x = 0.3; a.rotation.z = (i ? 1 : -1) * 0.75; });
  if (pt > 0) aimArm(st, 0, step.clone().add(v3(0, 3.2, 0)), pt);
  st.torso.rotation.x = 0.12; lookAtP(st, step.clone().add(v3(0, 2, 0)), 1);
  face(st, pt > 0.3 ? 'fury' : 'angry', t, 0.2, { viseme: pt > 0.3 && t < s(10) + 2.7 ? visemeAt('Grounded all of you', s(10) + 1.45, s(10) + 2.6, t) : undefined });
}
function poseDoor(t) {
  const E = EV, s = (i) => L(i).start, room = W.house, st = W.sister, b = W.baby, o = W.old;
  const op = smooth(E.open, E.open + 0.7, t); room.door.rotation.y = -1.5 * op;
  // the sister opens the door and steps back out of the way
  const S0 = hr(21.6, 0, 0.8), S1 = hr(17.4, 0, 4.6), back = smooth(s(11) + 1.25, s(11) + 2.0, t);
  place(st, lp3(S0, S1, back), back > 0.02 && back < 0.98 ? Math.PI / 2 + 1.0 : Math.PI / 2 + back * 0.4); pose(st, back > 0.02 && back < 0.98 ? 'walk' : 'idle', t);
  if (back < 0.02) { room.door.updateMatrixWorld(true); const knob = room.door.localToWorld(v3(-0.5, 5, room.D.w - 0.8)); aimArm(st, 0, knob, smooth(E.bell, E.open, t)); }
  face(st, back > 0.5 ? 'surprised' : 'neutral', t, 0.4); if (back > 0.5) lookAtP(st, H(o), 0.8);
  // the toddler on the mat
  const T0 = hr(20.2, 0, -1.6); sitAt(b, T0, Math.PI / 2 - 0.15, 0.08, { straight: true }); wearOn(b, 'diaper'); b.arms.forEach((a, i) => { a.rotation.x = -0.5; a.rotation.z = (i ? 1 : -1) * 0.25; });
  lookAtP(b, H(o), 1); face(b, t < s(11) + 2.2 ? 'surprised' : 'nervous', t, 0.5);
  // the old man on the porch
  const O0 = hr(28.6, 0.6, -3.0); place(o, O0, -Math.PI / 2); pose(o, 'idle', t); wearOn(o, 'scarf'); o.torso.rotation.x = 0.22; o.neck.rotation.x = 0.25;
  aimArm(o, 0, O0.clone().add(v3(-1.0, 0.7, 1.15)), 1); hold(W.caneO, o, 0, v3(0, 0.1, 0)); W.caneO.rotation.set(0, -Math.PI / 2 + Math.PI, 0); W.caneO.position.y += 0.05;
  aimArm(o, 1, O0.clone().add(v3(-1.6, 2.7, -0.8)), 1); hold(W.padOld, o, 1, v3(0, 0.08, 0)); W.padOld.rotation.set(-0.5, -Math.PI / 2, 0);
  lookAtP(o, H(b), 0.9); face(o, 'happy', t, 0.6);
}
// the handshake on the hall floor: the old man stoops, one pinky down to the toddler's hand
function posePinky(t) {
  const E = EV, s = (i) => L(i).start, room = W.house, b = W.baby, o = W.old, st = W.sister;
  room.door.rotation.y = -1.5;
  const T0 = hr(20.2, 0, -1.6); sitAt(b, T0, Math.PI / 2, 0.08, { straight: true }); wearOn(b, 'diaper');
  // the toddler's left hand up and forward; the old man stoops and is placed so his right pinky meets it
  const ab = armLen(b), sB = shoulderOf(b, 0), M = sB.clone().add(v3(0.72 * ab, 0.6 * ab, 0));
  const O0 = hr(22.6, 0, -1.6); place(o, O0, -Math.PI / 2); pose(o, 'idle', t); wearOn(o, 'scarf');
  const rel = smooth(s(13) - 0.5, s(13) + 0.2, t), bendK = smooth(E.pinky - 0.7, E.pinky - 0.15, t) * (1 - rel);
  o.torso.rotation.x = 0.12 + 0.6 * bendK; if (o.knee) o.knee.forEach((k) => { k.rotation.x = 0.9 * bendK; }); o.legs.forEach((l) => { l.rotation.x = -0.75 * bendK; }); o.hips.position.y = o.hipY - 0.55 * bendK;
  o.neck.rotation.x = -0.25 * bendK;
  { const keep = o.root.position.clone(); reachPlace(o, 1, M); const want = o.root.position.clone(); o.root.position.copy(want.lerp(hr(23.6, 0, -1.8), rel)); o.root.updateMatrixWorld(true); }
  W.caneO.visible = true; W.caneO.position.copy(o.root.position.clone().add(v3(0.2, 3.62, -1.9))); W.caneO.rotation.set(0, Math.PI / 2, -0.06);
  aimArm(o, 0, o.root.position.clone().add(v3(-0.6, 2.2, -1.5)), 1); hold(W.padOld, o, 0, v3(0, 0.08, 0)); W.padOld.rotation.set(-0.5, -Math.PI / 2, 0);
  const shake = Math.sin(t * 34) * 0.02;
  if (rel < 1) { handshake(b, 0, o, 1, M.clone().add(v3(0, shake, 0)), E.pinky, t, 0.45); if (rel > 0) { b.arms[0].quaternion.slerp(new THREE.Quaternion(), rel); o.arms[1].quaternion.slerp(new THREE.Quaternion(), rel); } }
  lookAtP(o, H(b), 1); lookAtP(b, H(o), 1);
  const lit = t > s(13) - 0.05;
  face(b, lit ? 'happy' : t > E.pinky + 0.9 ? 'surprised' : 'nervous', t, 0.5); face(o, lit ? 'happy' : 'smirk', t, 0.6);
  place(st, hr(17.6, 0, -6.4), Math.PI / 2 - 0.5); pose(st, 'idle', t); lookAtP(st, H(o), 0.8); face(st, 'surprised', t, 0.3);
}
function poseStroller(t) {
  const s = (i) => L(i).start, o = W.old, b = W.baby, x = -40 + (t - s(14)) * 2.6, P0 = v3(x, 0.3, -14.8);
  W.str.visible = true; W.str.position.copy(P0.clone().add(v3(3.6, 0, 0))); W.str.rotation.y = Math.PI / 2; W.str.updateMatrixWorld(true);
  place(o, P0, Math.PI / 2); pose(o, 'walk', t * 0.55); wearOn(o, 'scarf'); o.torso.rotation.x = 0.28; o.neck.rotation.x = -0.12;
  const hd = W.str.localToWorld(W.str.handle.clone()); aimArm(o, 0, hd.clone().add(v3(0, 0, -0.7)), 1); aimArm(o, 1, hd.clone().add(v3(0, 0, 0.7)), 1);
  W.caneO.visible = true; W.caneO.position.copy(hd.clone().add(v3(0.0, 0.05, 1.2))); W.caneO.rotation.set(0, -Math.PI / 2, 0);
  const seat = W.str.localToWorld(W.str.seat.clone()); sitAt(b, seat.clone().setY(0), -Math.PI / 2 + Math.PI, seat.y, { straight: true }); b.root.rotation.y = Math.PI / 2; wearOn(b, 'diaper'); b.arms.forEach((a, i) => { a.rotation.x = -1.9; a.rotation.z = (i ? 1 : -1) * 0.35; });
  face(b, 'laugh', t, 0.3); face(o, 'happy', t, 0.5); lookAtP(o, H(b), 0.6);
  poseStreetExtras(t, [['ex3', 20, -15.4, -1, 1.5], ['ex4', -10, 15, 1, 2.2]]);
}
function posePeas(t) {
  const s = (i) => L(i).start, o = W.old, b = W.baby, hc = W.house.highChair, t0 = s(14) + 3.55;
  hc.updateMatrixWorld(true); const seat = hc.localToWorld(v3(0, hc.seatY, -0.1));
  sitAt(b, seat.clone().setY(0), 0, seat.y, { straight: true }); wearOn(b, 'diaper'); b.arms.forEach((a, i) => { a.rotation.x = -1.1; a.rotation.z = (i ? 1 : -1) * 0.1; });
  const O0 = hr(-1.6, 0, 5.6); place(o, O0, yawTo(O0, seat) ); pose(o, 'idle', t); wearOn(o, 'scarf'); o.torso.rotation.x = 0.2;
  // the spoon flies loops, then lands in his mouth
  const u = clamp((t - t0) / 1.7), mouth = H(b).add(v3(0, -0.55 * 0.5 * 1.34, 0.55));
  const loop = v3(Math.sin(u * 9) * 1.4 * (1 - u), Math.cos(u * 9) * 0.8 * (1 - u) + 1.2 * (1 - u), 1.6 * (1 - u));
  const sp = mouth.clone().add(loop); aimArm(o, 0, sp, 1); W.spoon.visible = true; W.spoon.position.copy(handOf(o, 0)); W.spoon.lookAt(sp.clone().add(v3(0, 0, 0)).lerp(mouth, 0.5)); W.spoon.position.lerp(sp, 0.9);
  W.bowl.visible = true; W.bowl.position.copy(hc.localToWorld(hc.tray.clone()).add(v3(1.0, 0, 0.5)));
  lookAtP(b, sp, 1); lookAtP(o, H(b), 1); face(b, u > 0.85 ? 'happy' : 'surprised', t, 0.3, { viseme: u > 0.75 ? 'O' : undefined }); face(o, 'grin', t, 0.5, { viseme: u < 0.8 ? ['O', 'A', 'O', 'W'][Math.floor(t * 8) % 4] : undefined });
}
function poseChew(t) {
  const s = (i) => L(i).start, o = W.old, b = W.baby, cr = W.bed.crib; cr.visible = true; cr.drop(1); W.bed.chair.visible = true; W.bed.bed.visible = false; W.bed.quilt.visible = false;
  cr.updateMatrixWorld(true); const seat = cr.localToWorld(v3(0, cr.top, -0.6));
  sitAt(b, seat.clone().setY(0), 0, seat.y, { straight: true }); wearOn(b, 'diaper');
  const mouth = H(b).add(v3(0, -0.45, 0.42)), ch = Math.sin(t * 10) * 0.06;
  aimArm(b, 0, mouth.clone().add(v3(-0.25, -0.2 + ch, 0.4)), 1); aimArm(b, 1, mouth.clone().add(v3(0.25, -0.2 + ch, 0.4)), 1); W.padB.visible = true; W.padB.position.copy(mouth.clone().add(v3(0, -0.16 + ch, 0.38))); W.padB.rotation.set(1.2, 0, 0);
  face(b, 'happy', t, 0.3);
  const C = W.bed.chair; C.position.copy(br(-1.4, 0, -4.4)); C.rotation.y = Math.PI / 2 + 0.25; C.updateMatrixWorld(true);
  sitAt(o, C.position.clone(), C.rotation.y, C.seatY + 0.2); wearOn(o, 'scarf');
  o.arms.forEach((a, i) => { a.rotation.x = -1.1; a.rotation.z = (i ? 1 : -1) * -0.3; }); const hp = handOf(o, 0).lerp(handOf(o, 1), 0.5); W.padOld.visible = true; W.padOld.position.copy(hp).add(v3(0, 0.12, 0)); W.padOld.rotation.set(0.5, C.rotation.y, 0);
  o.neck.rotation.y = -0.15; face(o, 'focused', t, 0.6);
  W.bed.screen.set(t * 0.4, false);
}
function poseTuck(t) {
  const E = EV, s = (i) => L(i).start, o = W.old, b = W.baby, cr = W.bed.crib; cr.visible = true; cr.drop(1); W.bed.chair.visible = true; W.bed.bed.visible = false; W.bed.quilt.visible = false;
  const C = W.bed.chair; C.position.copy(br(-1.4, 0, -4.4)); C.rotation.y = Math.PI / 2 + 0.25;
  cr.updateMatrixWorld(true);
  // lying on his back, head at -z
  const lie = cr.localToWorld(v3(0, cr.top + 0.05, -0.2)); place(b, lie, 0); wearOn(b, 'diaper'); b.root.rotation.set(-Math.PI / 2, 0, 0); b.root.position.copy(lie).add(v3(0, 0.55, -1.6));
  b.arms.forEach((a, i) => { a.rotation.x = -0.25; a.rotation.z = (i ? 1 : -1) * 0.15; });
  const k = smooth(s(15) - 0.2, s(15) + 1.5, t);
  W.blanket.visible = true; W.blanket.position.copy(cr.localToWorld(v3(0, cr.top + 0.95, lerp(2.4, 0.9, k)))); W.blanket.rotation.y = 0;
  face(b, t < s(15) + 1.2 ? 'sleepy' : 'EyesClosed1', t, 0.3);
  // the old man at the lowered side
  const O0 = cr.localToWorld(v3(cr.W / 2 + 2.2, 0, 0.3)); place(o, O0, -Math.PI / 2); pose(o, 'idle', t * 0.6); wearOn(o, 'scarf'); o.torso.rotation.x = 0.42 - 0.12 * smooth(s(15) + 2.4, s(15) + 3.0, t); o.neck.rotation.x = 0.3;
  const edge = W.blanket.position.clone().add(v3(0, 0.3, -2.25));
  if (t < s(15) + 2.2) { aimArm(o, 0, edge.clone().add(v3(0.4, 0.05, 0.6)), 1); aimArm(o, 1, edge.clone().add(v3(0.4, 0.05, -0.6)), 1); }
  else { const pat = Math.max(0, Math.sin((t - s(15)) * 5)) * 0.12; aimArm(o, 0, edge.clone().add(v3(0.6, 0.25 + pat, 0.3)), 1); o.arms[1].rotation.x = -0.4; }
  lookAtP(o, H(b), 1); face(o, 'happy', t, 0.6, { viseme: talk(15, t) });
  W.bed.screen.set(0, true);
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  const sl = () => W.street.slide;
  // the street
  add('open', 0, (u) => ({ pos: lp3(v3(-46, 24, 34), v3(-38, 19, 30), easeInOut(u)), look: lp3(v3(30, 6, -4), v3(32, 7, -2), u), fov: 52 }));
  add('banner', 2.35, (u) => ({ pos: lp3(v3(-16, 9.0, 3), v3(-11, 9.8, 2.4), easeInOut(u)), look: v3(40, 12.6, 0), fov: 46 }));
  add('trio', s(1) - 0.04, (u) => ({ pos: lp3(v3(-1, 6.2, -9), v3(0, 6.0, -7.4), easeInOut(u)), look: v3(0, 2.6, 15), fov: 50 }));
  add('four', s(1) + 2.15, (u, t) => { const x = pw(t - s(1), [[2.15, 5.0], [2.45, 4.6], [3.0, 4.3], [3.3, 0], [3.65, -0.3], [3.95, -4.6], [4.9, -5.0]]); return { pos: v3(x + 0.4, 3.4 + (4.5 - x) * 0.12, 6.4), look: v3(x, 2.2 + (4.5 - x) * 0.16, 15.5), fov: 46 }; });
  add('run', s(2) - 0.03, (u) => ({ pos: lp3(v3(12, 5.5, -18), v3(10, 5.0, -19.5), u), look: v3(-6, 2.6, -36), fov: 50 }));
  add('slide', E.slideGo + 0.05, (u) => ({ pos: lp3(v3(5.5, 3.4, -23.5), v3(5.0, 3.1, -24.2), u), look: v3(-2, 3.4, -35), fov: 50 }));
  add('boys', s(3) - 0.03, (u) => { const x0 = -30 + (s(3) + u * 1.6 - s(3)) * 3.4; return { pos: v3(x0 + 12.5, 4.4, -14.4), look: v3(x0 + 0.6, 3.0, -15.7), fov: 46 }; });
  add('boys2', s(3) + 1.65, (u) => { const T = s(3) + 1.65 + u * (s(4) - s(3) - 1.65), x0 = -30 + (T - s(3)) * 3.4; return { pos: v3(x0 + 6.5, 4.2, -7.5), look: v3(x0 + 0.3, 3.0, -15.7), fov: 48 }; });
  // the pact, night, Rudy's room
  add('pactw', s(4) - 0.03, (u) => ({ pos: lp3(br(-2.5, 8.2, 17.5), br(-1.2, 7.4, 15.5), easeInOut(u)), look: br(5, 3.4, 0), fov: 52 }));
  add('hands', E.hs - 0.1, (u) => { const M = W.M || br(2.2, 2.0, 4.4); return { pos: lp3(M.clone().add(v3(0.6, 1.0, 8.2)), M.clone().add(v3(0.4, 0.9, 7.2)), u), look: M.clone().add(v3(0, 0.45, 0)), fov: 46 }; });
  add('pactf', s(4) + 4.1, (u) => ({ pos: lp3(br(3.4, 4.4, 12.5), br(3.2, 4.2, 11.2), easeInOut(u)), look: br(3.2, 3.3, 3.1), fov: 46 }));
  // grown-up practice
  add('paper', s(5) - 0.03, (u) => ({ pos: lp3(ok(8.5, 5.0, 14.5), ok(7.6, 4.7, 12.6), easeInOut(u)), look: ok(5.2, 3.0, 2.4), fov: 46 }));
  add('sip', E.sip - 0.45, (u) => { const h = H(W.oskar); return { pos: h.clone().add(v3(2.6 - u * 0.4, 0.2, 5.2)), look: h.clone().add(v3(0, -0.8, 0)), fov: 42 }; });
  add('cool', s(6) - 0.03, (u) => ({ pos: lp3(ok(4.4, 2.4, 10.5), ok(4.6, 2.6, 9.4), easeInOut(u)), look: ok(5.2, 3.4, 2.4), fov: 50 }));
  // morning: the toddler
  add('wake', s(7) - 0.03, (u) => ({ pos: lp3(br(4, 9.5, 12), br(2.5, 8.4, 9.8), easeInOut(u)), look: br(-11, 2.6, -5), fov: 50 }));
  add('tiny', s(7) + 1.55, (u) => { const h = H(W.baby); return { pos: h.clone().add(v3(0.8, 0.9, -2.5)), look: h.clone().add(v3(-0.05, -0.75, 1.6)), fov: 50 }; });
  add('mama', s(8) - 0.05, (u) => { const h = H(W.baby); return { pos: h.clone().add(v3(0.6, 0.6, 5.6 - u * 0.6)), look: h.clone().add(v3(0, -0.6, 0)), fov: 46 }; });
  add('two', s(9) - 0.03, (u) => ({ pos: lp3(br(-11, 15, 6), br(-11, 16.5, 7.5), easeOut(u)), look: br(-11, 1.5, -4.5), fov: 50 }));
  add('mom', s(9) + 1.12, (u) => ({ pos: lp3(hr(-3.4, 1.6, -0.8), hr(-3.0, 1.8, -2.0), easeInOut(u)), look: hr(-1.5, 6.0, -10), fov: 58 }));
  add('sister', s(10) - 0.03, (u) => { const h = H(W.sister); return { pos: lp3(h.clone().add(v3(-3.4, -0.9, -7.4)), h.clone().add(v3(-3.0, -0.9, -6.6)), u), look: h.clone().add(v3(0, -1.1, 0)), fov: 46 }; });
  add('grounded', s(10) + 1.95, (u) => ({ pos: lp3(hr(-11.5, 5.0, 11.0), hr(-12.2, 4.8, 10.4), easeInOut(u)), look: hr(-20, 2.6, 9.6), fov: 52 }));
  // the door
  add('bell', s(11) - 0.03, (u) => ({ pos: lp3(hr(10, 6.2, 9.5), hr(11, 6.0, 8.6), easeInOut(u)), look: hr(23, 4.4, -2.2), fov: 50 }));
  add('reveal', s(11) + 1.3, (u) => ({ pos: lp3(hr(18.6, 1.4, -0.6), hr(19.2, 1.3, -0.9), u), look: lp3(hr(28.6, 3.0, -3.2), hr(28.6, 5.2, -3.0), easeInOut(u)), fov: 54 }));
  add('oldman', s(11) + 2.85, (u) => ({ pos: lp3(hr(19.4, 5.4, 2.2), hr(20.6, 5.2, 1.4), easeInOut(u)), look: hr(28.6, 4.0, -3), fov: 46 }));
  add('pinky', s(12) - 0.03, (u) => { const M = W.M || hr(21, 2, -0.4); return { pos: lp3(M.clone().add(v3(-1.0, 0.9, 9.6)), M.clone().add(v3(-0.5, 0.8, 8.6)), u), look: M.clone().add(v3(0.8, -0.3, 0)), fov: 46 }; });
  add('babyf', s(13) - 0.04, (u) => { const h = H(W.baby); return { pos: h.clone().add(v3(2.0, 0.7, 2.6 - u * 0.3)), look: h.clone().add(v3(0.2, -0.3, 0)), fov: 46 }; });
  add('oldf', s(13) + 0.85, (u) => { const h = H(W.old); return { pos: h.clone().add(v3(-7.6 + u * 0.5, -1.4, 2.8)), look: h.clone().add(v3(0, -1.3, 0)), fov: 46 }; });
  // he kept the pact
  add('stroll', s(14) - 0.03, (u) => { const x = -40 + (s(14) + u * 1.9 - s(14)) * 2.6; return { pos: v3(x + 12, 5.2, -3.5), look: v3(x + 1.0, 2.8, -14.8), fov: 50 }; });
  add('stroll2', s(14) + 1.9, (u) => { const x = -40 + (s(14) + 1.9 + u * 1.65 - s(14)) * 2.6; return { pos: v3(x - 3, 4.2, -6.5), look: v3(x + 3, 3.0, -14.8), fov: 46 }; });
  add('peas', s(14) + 3.55, (u) => ({ pos: lp3(hr(-9.4, 7.6, 13.0), hr(-8.8, 7.3, 12.3), easeInOut(u)), look: hr(-2.9, 5.0, 4.2), fov: 50 }));
  add('chew', s(14) + 5.7, (u) => ({ pos: lp3(br(1.8, 8.6, -1.4), br(1.2, 8.3, -1.8), easeInOut(u)), look: br(-7.6, 3.4, -5.6), fov: 46 }));
  // the tuck-in
  add('tuck', s(15) - 0.04, (u) => ({ pos: lp3(br(-2.0, 9.5, 3.5), br(-2.6, 9.0, 2.8), easeInOut(u)), look: br(-7.2, 3.0, -6.2), fov: 48 }));
  add('whisper', s(15) + 3.3, (u) => { const h = H(W.old); return { pos: h.clone().add(v3(-4.6, 0.5, 3.4 - u * 0.4)), look: h.clone().add(v3(-0.2, -0.8, 0)), fov: 46 }; });
  add('end', s(15) + 5.45, (u) => ({ pos: lp3(br(1, 7, 8), br(4, 9.5, 13), easeOut(u)), look: lp3(br(-6.5, 3.8, -6), br(-6, 3.6, -5), u), fov: 50 }));
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}

const KEYS = { open: 'street', banner: 'street', trio: 'trio', four: 'trio', run: 'slide', slide: 'slide', boys: 'boys', boys2: 'boys', pactw: 'pact', hands: 'pact', pactf: 'pact', paper: 'grown', sip: 'grown', cool: 'grown',
  wake: 'wake', tiny: 'wake', mama: 'wake', two: 'wake', mom: 'kitchen', sister: 'sister', grounded: 'sister', bell: 'door', reveal: 'door', oldman: 'door', pinky: 'pinky', pinkyc: 'pinky', babyf: 'pinky', oldf: 'pinky',
  stroll: 'stroll', stroll2: 'stroll', peas: 'peas', chew: 'chew', tuck: 'tuck', whisper: 'tuck', end: 'tuck' };

function renderAt(t) {
  let sh = shotAt(W.shots, t); const key = KEYS[sh.name];
  const set = { street: 'st', trio: 'st', slide: 'st', boys: 'st', stroll: 'st', pact: 'br', wake: 'br', chew: 'br', tuck: 'br', grown: 'ok', kitchen: 'hr', sister: 'hr', door: 'hr', pinky: 'hr', peas: 'hr' }[key];
  const night = key === 'pact' || key === 'tuck';
  let env = set === 'st' ? SUNNY : night ? NITE : ROOM;
  if (key === 'chew') env = mixP(ROOM, { ...ROOM, ...P({ sunColor: '#ffc98a', hemiSky: '#ffe2c0' }) }, 0.6);
  applyEnv(ctx, env);
  W.street.visible = set === 'st' || set === 'hr'; W.bed.visible = set === 'br'; W.house.visible = set === 'hr'; W.kit.visible = set === 'ok';
  W.street.position.y = set === 'hr' ? -500 : 0;
  W.bed.pane.visible = !night; W.bed.npane.visible = night; W.bed.crib.visible = false; W.bed.chair.visible = false; W.bed.bed.visible = true; W.bed.quilt.visible = true; W.bed.quilt.position.copy(BR); W.bed.nightlight.visible = night;
  W.pt.forEach((l) => { const on = l.userData.set === set && (l.userData.night === undefined || l.userData.night === night); l.intensity = on ? l.userData.I : 0; });
  W.all.forEach((c) => { c.root.visible = false; }); W.house.highChair.visible = key === 'peas'; W.props.forEach((p) => { p.visible = false; }); W.house.door.rotation.y = 0;
  if (W.clouds) W.clouds.visible = set === 'st';
  W.dust.visible = set === 'br' && night;
  const tt = { street: () => poseStreetExtras(t), trio: () => { poseTrio(t); poseStreetExtras(t, [['ex1', -40, -15.5, 1, 0.2], ['ex5', 40, -15.5, -1, 0.5]]); }, slide: () => poseSlide(t), boys: () => { poseBoys(t); poseStreetExtras(t, [['ex2', 20, 15.5, -1, 0.8], ['ex4', -50, 15, 1, 2.2]]); },
    pact: () => posePact(t), grown: () => poseGrownup(t), wake: () => poseWake(t), kitchen: () => poseKitchen(t), sister: () => poseSister(t), door: () => poseDoor(t), pinky: () => posePinky(t),
    stroll: () => poseStroller(t), peas: () => posePeas(t), chew: () => poseChew(t), tuck: () => poseTuck(t) }[key];
  tt();
  if (key === 'street' && W.spark) { W.spark.visible = true; W.spark.update(t); } else if (W.spark) W.spark.visible = false;
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2, 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * (c.spec.scale || 1) * (c.headK || 1); c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2], Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  frame(ctx, t, sh, { steady: t < 2.35 || Q.get('steady') === '1', shake: 0, shadowSpan: set === 'st' ? 80 : 45, shadows: true, black: 0 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep111', { look: 'pro', avatars: [...new Set(Object.values(AV).map((a) => a[0]))] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'smirk', 'grin', 'laugh', 'focused', 'shocked', 'surprised', 'nervous', 'scream', 'cry', 'angry', 'fury', 'sleepy', 'Blegh!', 'EyesClosed1', 'blink']);
  const { scene, camera } = ctx; camera.far = 2600; camera.near = 0.1; camera.updateProjectionMatrix();
  W.clouds = clouds(scene, { count: 14, y: 200, spread: 1200, size: 34 });
  W.street = street(); scene.add(W.street);
  W.bed = bedroom(); W.bed.position.copy(BR); scene.add(W.bed);
  W.house = houseRoom(); W.house.position.copy(HR); scene.add(W.house);
  W.kit = kitchenSet(); W.kit.position.copy(OK); scene.add(W.kit);
  W.pt = [];
  for (const [set, p, c, I, d, night] of [['br', br(0, 13, 2), '#fff0d8', 380, 60, false], ['br', br(-4.3, 6.5, -10.5), '#ffbf70', 120, 40, true], ['br', br(15, 5, 1.5), '#8fc8ff', 70, 30, true], ['br', br(-14, 2.2, -12), '#ffb060', 30, 18, true],
    ['hr', hr(-8, 13, 2), '#fff0d8', 420, 70], ['hr', hr(14, 13, 0), '#fff0d8', 300, 60], ['ok', ok(0, 13, 0), '#fff0d8', 480, 60]]) {
    const l = new THREE.PointLight(c, I, d, 1.5); l.position.copy(p); l.userData.I = I; l.userData.set = set; if (night !== undefined) l.userData.night = night; scene.add(l); W.pt.push(l);
  }
  people();
  W.props = [];
  const P_ = (o) => { scene.add(o); W.props.push(o); o.visible = false; return o; };
  W.brief = P_(briefcase()); W.mugA = P_(mug()); W.mugO = P_(mug()); W.walker = P_(walker()); W.caneF = P_(cane()); W.caneO = P_(cane());
  W.padR = P_(controller('#ef4f5a')); W.padO = P_(controller('#3d8fe0')); W.padOld = P_(controller('#3d8fe0')); W.padB = P_(controller('#ef4f5a'));
  W.paper = P_(newspaper()); W.str = P_(stroller()); W.spoon = P_(spoon()); W.bowl = P_(peaBowl()); W.blanket = P_(blanket());
  W.dust = new THREE.Group(); scene.add(W.dust);
  W.shots = shots();
  window.__ep111 = { W, THREE, ctx, L };
  return expose(ctx, renderAt, L(12).start + 1.3, EV);
}
