// Episode 31: The Mall That Wasn't on Any Map (Liminal Horror 5/5). Sadie walks into a bright, empty shopping mall at 4:45 and it stays 4:45. The exit doors open onto the same mall.
// Here there are a few people, slightly wrong: Dana asks the time ("Still?"), a guard shows her a directory where every spot says YOU ARE HERE. The PA asks everyone to remain where they are, and they leave.
// Then the same people rise toward her on every escalator, motionless, backs to her. They turn. "Your replacement has arrived." Far away, through the doors she came in by, someone in her clothes walks in.
// An original design (engine/mall.js). World: Hall 1 z 0..L, Hall 2 z L..2L (a clone of the same geometry); +z is deeper into the mall; the sunken atrium's escalators rise toward -z.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, NIGHT } from '../engine/stage.js';
import { dust, atmos } from '../engine/atmos.js';
import { aimArm as aimArm0 } from '../engine/anims.js';
import { jointify } from '../engine/infinitetower.js';
import { MALL, mallHall, polishedFloor, floorMirror, automaticDoor, directoryKiosk, clawMachine, arcadeFront, wetSign, mop, bucket, shoppingBag, phoneProp, blockWall, exteriorFacade, escalatorSteps, ESC_LANES, paHorn, mallMats } from '../engine/mall.js';

const aimArm = (c, side, p, k = 1) => { c.root.updateMatrixWorld(true); aimArm0(c, side, p, k); };
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const { L: LL } = MALL;
const Z2 = (z) => z + LL;

let ctx, L, EV;
const W = { eh: v3(0, 5, 0) };
const AV = { sadie: 'farm_ep31_sadie', ivy: 'farm_ep31_ivy', walt: 'farm_ep31_walt', dana: 'farm_ep31_dana', guard: 'farm_ep31_guard', boy: 'farm_ep31_boy', janitor: 'farm_ep31_janitor', teen: 'farm_ep31_teen' };
const SK = { sadie: '#f2c9a0', ivy: '#f2c9a0', walt: '#f2c9a0', dana: '#c68642', guard: '#8d5524', boy: '#f2c9a0', janitor: '#c68642', teen: '#f2c9a0' };

const INSIDE = { ...NIGHT, ...P({ top: '#dfe5cf', horizon: '#dfe5cf', haze: '#e4e6cf', sunColor: '#f4f6e6', hemiSky: '#f6f8ea', hemiGround: '#c3bd9c' }), sunDir: v3(0.05, 1, 0.14), sunI: 0.5, sunDisc: 0, stars: 0, moon: 0, hemiI: 1.42, amb: 0.4, envI: 0.62, exposure: 0.95, bloom: 0.02, fogNear: 150, fogFar: 620, saturation: 0.98, contrast: 1.04, bounce: 0.2, win: 0, lamp: 0 };
const OUTSIDE = { ...INSIDE, ...P({ top: '#a9c1d4', horizon: '#dfe3dc', haze: '#d6dbd2', sunColor: '#fff0da', hemiSky: '#d9e6ee', hemiGround: '#9a968a' }), sunDir: v3(-0.5, 0.75, -0.55), sunI: 1.5, hemiI: 1.15, amb: 0.3, envI: 0.75, exposure: 1.0, fogNear: 260, fogFar: 1100, saturation: 1.02 };

// ---- times ----
function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return { dA0: 1.0, dA1: 3.45, dB0: s(9) + 0.12, dB1: s(12) - 0.15, dB2: s(13) + 0.05, tPA: s(18), freeze: s(18) + 0.12, gone: s(18) + 2.7, lane: [s(25) - 1.9, s(23) - 1.9, s(19) + 0.25, s(24) - 1.9], turn: s(29) + 0.4, dim: s(30) - 0.02, door: s(33) + 0.75, end: ctx.dur };
}
const STAFFV = 0.72, VIS = 0.36;
function drivers() {
  const R = ctx.dur + 1, E = EV;
  const integ = (om) => { const n = Math.ceil(R * 240) + 2, a = new Float32Array(n), h = 1 / 240; let v = 0; for (let i = 0; i < n; i++) { a[i] = v; v += om(i * h) * h; } return (t) => { const x = clamp(t, 0, R) * 240, i = Math.min(n - 2, Math.floor(x)), f = x - i; return a[i] + (a[i + 1] - a[i]) * f; }; };
  W.D = E.lane.map((t0) => integ((t) => STAFFV * smooth(t0, t0 + 0.8, t) * (1 - smooth(E.turn - 0.05, E.turn + 0.25, t))));
  W.Dt = (t) => W.D.map((f) => f(t));
}

// ---- helpers ----
const armLen = (c) => { if (!c._alen) { c.reset(); c.root.updateMatrixWorld(true); const r = c.root.rotation.clone(), p = c.root.position.clone(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3().setFromObject(c.arms[0]); c._alen = sh.y - bx.min.y - 0.25; c.root.rotation.copy(r); c.root.position.copy(p); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); return c.arms[side].localToWorld(v3(0, -armLen(c), 0.12)); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.scale.setScalar(c._sc || 1); }
function place(c, p, yaw) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.noBlink ? false : blinkAt(t, ph) && !['shocked', 'terrified'].includes(name), viseme: o.viseme }); }
const talk = (i, t) => (t > L(i).start && t < L(i).end ? visemeAt(L(i).text, L(i).start, L(i).end, t) : undefined);
function path(keys, t) { if (t <= keys[0][0]) return { p: keys[0][1].clone(), walking: false, yaw: keys[0][2] ?? null }; for (let i = 0; i < keys.length - 1; i++) { const [a, pa, ya] = keys[i], [b, pb, yb] = keys[i + 1]; if (t < b) { if (pa.distanceTo(pb) < 0.01) return { p: pa.clone(), walking: false, yaw: ya ?? null }; const u = clamp((t - a) / (b - a)); return { p: lp3(pa, pb, u), walking: true, yaw: yawTo(pa, pb) }; } } const k = keys[keys.length - 1]; return { p: k[1].clone(), walking: false, yaw: k[2] ?? null }; }
function walker(c, r, t, restYaw, rate = 1) { place(c, r.p, r.yaw ?? restYaw); if (r.walking) pose(c, 'walk', t * rate); else pose(c, 'idle', t); }
const hide = (...cs) => cs.forEach((c) => { c.root.visible = false; });

// a phone in the right hand, screen toward her eyes
function holdPhone(c, k, t) {
  const yw = c.root.rotation.y, fw = v3(Math.sin(yw), 0, Math.cos(yw)), sd = v3(fw.z, 0, -fw.x), rootP = c.root.position;
  const up = rootP.clone().add(v3(0, 2.75, 0)).addScaledVector(fw, 1.5).addScaledVector(sd, 0.3);
  const rest = rootP.clone().add(v3(0, 1.8, 0)).addScaledVector(fw, 0.9).addScaledVector(sd, -1.55);
  const target = lp3(rest, up, k);
  aimArm(c, 0, target, 1); c.root.updateMatrixWorld(true);
  const hp = c.arms[0].localToWorld(v3(0, -armLen(c), 0.1)); const ph = W.phone; ph.visible = true; ph.position.copy(hp); ph.up.set(0, 1, 0);
  ph.lookAt(W.eh.clone().lerp(hp.clone().add(fw), 1 - k * 0.7)); ph.translateY(0.42); ph.translateZ(0.02); ph.scale.setScalar(0.52); ph.updateMatrixWorld(true);
}

// ---- the people ----
function people() {
  const mk = (avatar, skin, sc = 1) => { const c = makeCharacter({ avatar, alti: true, skin, caustic: false }); ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c._sc = sc; c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c); return c; };
  for (const k of Object.keys(AV)) W[k] = mk(AV[k], SK[k], k === 'boy' ? 0.74 : 1);
  W.rep = mk(AV.sadie, SK.sadie); W.rep.faceSheet.visible = false;
  // one posed copy of each extra, for the far figures on the escalators
  W.tpl = ['walt', 'dana', 'guard', 'janitor', 'teen', 'boy'].map((k) => { const c = mk(AV[k], SK[k], k === 'boy' ? 0.74 : 1); place(c, v3(), 0); pose(c, 'idle', 0); c.setFace('neutral', {}); c.root.updateMatrixWorld(true); c.root.visible = false; c._pts = []; return c; });
}
// the far figures: instanced copies of the posed templates, moved by the lanes and turned together
function buildFar() {
  W.far = []; const slots = [[0, 2, 5], [1, 2, 3], [2, 3, 2], [3, 1, 4], [0, 4, 11], [1, 5, 11], [2, 1, 10], [3, 4, 10], [0, 3, 18], [1, 0, 17], [2, 5, 17], [3, 2, 16]];
  // [lane, template, slot behind the front person]
  const byT = new Map(); slots.forEach((s) => { if (!byT.has(s[1])) byT.set(s[1], []); byT.get(s[1]).push(s); });
  for (const [ti, list] of byT) {
    const c = W.tpl[ti], meshes = []; c.root.traverse((m) => { if (m.isMesh && m.visible) meshes.push(m); });
    const inst = meshes.map((m) => { const im = new THREE.InstancedMesh(m.geometry, m.material, list.length); im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; ctx.scene.add(im); return im; });
    W.far.push({ c, list, meshes, inst, rel: meshes.map((m) => { c.root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(c.root.matrixWorld).invert(); return new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld); }) });
  }
}
const _o = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _y = new THREE.Vector3(0, 1, 0), _w = new THREE.Matrix4();
function updFar(t, yaw) {
  const vis = t >= L(25).start - 0.05, Dt = W.Dt(t);
  for (const f of W.far) {
    f.inst.forEach((im, k) => { im.visible = vis; if (!vis) return;
      f.list.forEach((sl, i) => { const [la, , ds] = sl, e = W.lanes[la], d = e.slopeD(-5.8) - 7 * ds * 0.45 + Dt[la], q = e.atRaw(d); _p.set(q.x, q.y, Z2(q.z)); _q.setFromAxisAngle(_y, yaw); _o.compose(_p, _q, f.c._sc === 1 ? _s : _p.clone().set(f.c._sc, f.c._sc, f.c._sc)); _w.multiplyMatrices(_o, f.rel[k]); im.setMatrixAt(i, _w); });
      im.instanceMatrix.needsUpdate = true; });
  }
}
// a hero figure riding a lane; visible once its time comes
function rider(c, lane, tc, yaw, t, faceN = 'neutral') {
  if (t < tc - 0.25) { c.root.visible = false; return; }
  const e = W.lanes[lane], d = e.slopeD(-5.8) + W.D[lane](t) - W.D[lane](tc), q = e.atRaw(d); place(c, v3(q.x, q.y, Z2(q.z)), yaw); pose(c, 'idle', 0.3); c.setFace(faceN, { blink: false });
}
function riders(t, yaw) {
  const s = (i) => L(i).start, E = EV;
  rider(W.janitor, 2, s(20) - 0.6, yaw, t); rider(W.walt, 1, s(23) - 1.2, yaw, t); rider(W.dana, 3, s(24) - 1.2, yaw, t); rider(W.boy, 0, s(25) - 1.2, yaw, t); rider(W.guard, 2, s(25) + 1.5, yaw, t); W.teen.root.visible = false;
}

function poseIvy(t) { const c = W.ivy, s = (i) => L(i).start; if (t < s(1) - 0.05) { place(c, v3(-3.4, 0, -19), 0.75); pose(c, 'idle', t); c.neck.rotation.y = -0.2; const wv = smooth(0.1, 0.6, t); aimArm(c, 0, c.root.position.clone().add(v3(-2.5, 7 + Math.sin(t * 9) * 0.5, 2.5)), wv); face(c, 'smile', t, 0.4); } else if (t >= EV.door - 0.3) { place(c, v3(3.6, 0, LL - 9), 0.1); pose(c, 'idle', t); aimArm(c, 0, c.root.position.clone().add(v3(1.2, 7.4 + Math.sin(t * 8) * 0.5, 3)), 1); face(c, 'smile', t, 0.4); } else hide(c); }

// ---- Sadie ----
function pathSadie() {
  const s = (i) => L(i).start;
  return [[0.25, v3(0.6, 0, -8)], [3.55, v3(0.2, 0, 15), 0], [s(2) - 0.05, v3(0.2, 0, 15), 0], [s(7) + 0.1, v3(-1.2, 0, 66), 0], [s(8), v3(-1.2, 0, 66), 0], [s(8) + 0.02, v3(-19.5, 0, LL - 34)], [s(9) - 0.05, v3(-1, 0, LL - 8), 0], [s(10) + 0.15, v3(-0.4, 0, LL - 8), 0], [s(11) + 0.9, v3(-0.4, 0, Z2(18)), 0], [s(14) + 0.1, v3(-0.4, 0, Z2(18)), Math.PI], [s(15) - 0.2, v3(-0.4, 0, Z2(18.2)), 0], [s(16), v3(-0.4, 0, Z2(18.2)), 0], [s(16) + 0.3, v3(-0.4, 0, Z2(18.2)), 0], [s(17) - 0.05, v3(0.6, 0, Z2(51)), 0.15], [s(19) - 0.04, v3(0.6, 0, Z2(51)), 0.15], [s(19) + 0.02, v3(0, 0, Z2(92.5)), 0], [ctx.dur + 1, v3(0, 0, Z2(92.5)), 0]];
}
function poseSadie(t) {
  const c = W.sadie, s = (i) => L(i).start, E = EV, r = path(W.pp, t);
  const facing = (i) => [t >= s(i), s(i)];
  walker(c, r, t, 0, 0.92);
  let fx = 'neutral', ph = 0;
  if (t < s(1)) fx = 'neutral';
  // the phone, first time
  const ph1 = smooth(s(1) + 0.1, s(1) + 0.55, t) * (1 - smooth(s(2) - 0.02, s(2) + 0.4, t));
  if (t >= s(1) && t < s(2)) { c.neck.rotation.x = 0.28 * ph1; fx = t > s(1) + 2.0 ? 'worried' : 'neutral'; }
  if (t >= s(2) && t < s(7)) { const k = Math.sin((t - s(2)) * 0.9); c.neck.rotation.y = k * 0.34; fx = t > s(5) ? 'worried' : 'neutral'; }
  if (t >= s(7) && t < s(8)) { c.neck.rotation.x = -0.22; c.neck.rotation.y = 0.2; fx = 'nervous'; }
  if (t >= s(9) && t < s(11)) { fx = 'surprised'; c.neck.rotation.x = -0.05; }
  if (t >= s(11) && t < s(12)) { fx = 'worried'; }
  if (t >= s(12) && t < s(14)) { const u = smooth(s(12), s(12) + 0.7, t); c.root.rotation.y = lerp(0, Math.PI, easeInOut(u)); fx = t > s(13) + 0.4 ? 'shocked' : 'scared'; }
  if (t >= s(14) && t < s(17)) { fx = 'nervous'; c.neck.rotation.y = 0.05; }
  if (t >= s(17) && t < s(18)) { fx = 'worried'; c.root.rotation.y = 0.2; c.neck.rotation.x = -0.1; }
  if (t >= s(18) && t < s(19)) { const u = smooth(s(18) + 2.2, s(18) + 3.0, t); c.neck.rotation.x = -0.2 * (1 - u); c.root.rotation.y = lerp(0.2, Math.PI, u); fx = 'scared'; }
  if (t >= s(19)) { c.root.rotation.y = 0; c.neck.rotation.x = 0.28; fx = t < s(20) ? 'nervous' : t < s(25) ? 'scared' : 'scared'; }
  if (t >= s(25) && t < s(26)) { fx = 'terrified'; c.neck.rotation.y = Math.sin(t * 2) * 0.12; }
  let ph2 = 0; if (t >= s(27) - 0.05 && t < s(29) + 0.42) { ph2 = smooth(s(27) - 0.05, s(27) + 0.35, t) * (1 - smooth(s(29) - 0.02, s(29) + 0.4, t)); c.neck.rotation.x = 0.3 * ph2; fx = t < s(28) ? 'scared' : 'shocked'; }
  if (t >= s(29)) { const u = smooth(E.turn + 0.1, E.turn + 0.6, t); c.neck.rotation.x = 0.1 * (1 - u); fx = u > 0.5 ? 'terrified' : 'scared'; }
  if (t >= s(30)) { fx = 'terrified'; }
  // she backs away a step when they turn, then turns round to the far doors
  if (t >= E.turn) { const u = smooth(E.turn, E.turn + 0.8, t), p = c.root.position.clone(); p.z -= u * 2.2; c.root.position.copy(p); }
  if (t >= s(33)) { const u = smooth(s(33) + 0.02, s(33) + 0.7, t); c.root.rotation.y = lerp(0, Math.PI, easeInOut(u)); c.neck.rotation.x = 0; fx = 'terrified'; }
  face(c, fx, t, 0.7, { noBlink: t > E.turn });
  c.root.updateMatrixWorld(true); W.eh.copy(c.neck.getWorldPosition(v3())).add(v3(0, 0.75, 0));
  W.phone.visible = false; if (ph1 > 0.01 && t < s(2) + 0.42) holdPhone(c, ph1, t); else if (ph2 > 0.01) holdPhone(c, ph2, t);
}
function poseRep(t) { const c = W.rep, E = EV, s = L(33).start; if (t < E.door - 0.4) { hide(c); return; } const a = E.door + 0.1, p0 = v3(0.3, 0, LL - 12), p1 = v3(0.3, 0, Z2(13)), u = clamp((t - a) / (ctx.dur - a - 0.1)), p = lp3(p0, p1, u); place(c, p, 0); pose(c, 'walk', t * 0.8); }

// ---- the people of the second mall ----
function poseDana(t) {
  const s = (i) => L(i).start; const c = W.dana, E = EV;
  if (t > E.gone || t < s(13) + 0.3) { if (t < s(20)) hide(c); W.bagL.visible = false; W.bagR.visible = false; if (t >= s(18) + 2.0) { W.bagL.visible = W.bagR.visible = t < s(20); W.bagL.position.set(-1.5, 0.92, Z2(24)); W.bagL.rotation.set(0, 0.3, 0); W.bagR.position.set(1.8, 0.92, Z2(25)); W.bagR.rotation.set(0, -0.2, 0); } return; }
  const p0 = v3(0.3, 0, Z2(29)), p1 = v3(0.3, 0, Z2(25)), stood = t > s(14) + 0.3; const walkAway = t > E.freeze + 0.15; const q = walkAway ? lp3(p1, v3(0.3, 0, Z2(55)), clamp((t - E.freeze - 0.15) / 2.5)) : lp3(p0, p1, smooth(s(13) + 0.4, s(14) + 0.1, t));
  place(c, q, walkAway ? 0 : Math.PI); pose(c, t < s(14) + 0.1 || walkAway ? 'walk' : 'idle', t); c.neck.rotation.x = 0; face(c, 'neutral', t, 0.5, { viseme: talk(14, t) || talk(16, t), noBlink: true });
  const hold = t < E.freeze + 0.1;
  const set = (bag, side) => { c.arms[side].rotation.x = 0.03; const h = handOf(c, side), yaw = c.root.rotation.y; bag.visible = hold; bag.position.copy(h).add(v3(0, -bag.handleY, 0)); bag.rotation.set(0, yaw, 0); };
  set(W.bagR, 0); set(W.bagL, 1);
}
function poseWalt(t) {
  const c = W.walt, s = (i) => L(i).start, E = EV; if (t < s(13) || t >= s(20)) { if (t < s(20)) hide(c); return; }
  const SEAT = v3(4.5, 0, Z2(45)), sw = 0.1;
  place(c, SEAT, -Math.PI / 2);
  const up = smooth(E.freeze + 1.9, E.freeze + 2.4, t);
  c.root.position.x = SEAT.x + 0.2; c.hips.position.y -= (1 - up) * sw;   // sits, then stands
  c.legs.forEach((l, i) => { l.rotation.x = -(1 - up) * 1.5; c.knee[i].rotation.x = (1 - up) * 1.5; });
  c.neck.rotation.y = t < E.freeze ? 0.3 : 0;
  if (up >= 1) { const u = clamp((t - E.freeze - 2.4) / 1.6); c.root.position.x = SEAT.x + 0.2 - u * 1; c.root.position.z = SEAT.z + u * 14; c.root.rotation.y = 0; pose(c, 'walk', t); }
  face(c, 'neutral', t, 0.6, { noBlink: t > E.freeze });
}
function poseBoy(t) { const c = W.boy, s = (i) => L(i).start, E = EV; if (t < s(13) || t >= s(20)) { if (t < s(20)) hide(c); return; } const q = v3(-2.4, 0, Z2(50.5)); place(c, t > E.freeze + 0.7 ? lp3(q, v3(-2.4, 0, Z2(63)), clamp((t - E.freeze - 0.7) / 2)) : q, t > E.freeze + 0.7 ? 0 : -2.3); pose(c, t > E.freeze + 0.7 ? 'walk' : 'idle', t); face(c, 'neutral', t, 0.3, { noBlink: t > E.freeze }); }
function poseJanitor(t) {
  const c = W.janitor, s = (i) => L(i).start, E = EV, A = v3(-7.5, 0, Z2(34)), m = W.mop; if (t < s(13) || t >= s(20)) { if (t < s(20)) { hide(c); m.visible = false; } return; }
  place(c, A, 1.05); pose(c, 'idle', t); const yw = c.root.rotation.y, fw = v3(Math.sin(yw), 0, Math.cos(yw)), sd = v3(fw.z, 0, -fw.x);
  m.visible = true; const stop = t > E.freeze; const sw = stop ? 0.4 : Math.sin(t * 2.5); const head = A.clone().addScaledVector(fw, 2.3).addScaledVector(sd, sw * 1.0);
  const fall = smooth(E.freeze + 0.95, E.freeze + 1.55, t); // the handle is let go and the mop tips over
  const top = head.clone().add(v3(-sd.x * 0.8, 6.2, -sd.z * 0.8)).addScaledVector(fw, -1.2); const dir = top.clone().sub(head).normalize(); const flat = sd.clone().multiplyScalar(-1).add(v3(0, 0.02, 0)).normalize(); dir.lerp(flat, fall * fall).normalize(); m.position.copy(head); m.position.y = 0.0 + fall * 0.08; m.quaternion.setFromUnitVectors(v3(0, 1, 0), dir);
  const grip = head.clone().addScaledVector(dir, 4.6); if (fall < 0.15) { aimArm(c, 0, grip, 1); aimArm(c, 1, head.clone().addScaledVector(dir, 3.9), 1); c.root.position.copy(A).addScaledVector(fw, -0.3).addScaledVector(sd, sw * 0.2); } face(c, 'neutral', t, 0.5, { noBlink: stop });
  if (t > E.freeze + 1.5) { const u = clamp((t - E.freeze - 1.5) / 1.4); place(c, lp3(A, v3(-7.5, 0, Z2(50)), u), 0); pose(c, 'walk', t); face(c, 'neutral', t, 0.5, { noBlink: true }); }
}
function poseGuard(t) { const c = W.guard, s = (i) => L(i).start, E = EV; if (t < s(16) || t >= s(20)) { if (t < s(20)) hide(c); return; } const q = v3(6.5, 0, Z2(55.6)); place(c, q, 2.2); pose(c, 'idle', t); c.neck.rotation.y = 0.15; const reach = smooth(s(17) + 0.0, s(17) + 0.45, t) * (1 - smooth(E.freeze + 0.1, E.freeze + 0.5, t)); if (reach > 0) aimArm(c, 0, W.mapPoint, reach); if (t > E.freeze + 0.7) { const u = clamp((t - E.freeze - 0.7) / 1.8); place(c, v3(lerp(q.x, 2, smooth(0, 0.35, u)), 0, lerp(q.z, Z2(76), smooth(0.35, 1, u))), u < 0.35 ? -Math.PI / 2 : 0); pose(c, 'walk', t); } face(c, 'neutral', t, 0.4, { viseme: talk(17, t), noBlink: true }); }
function poseTeen(t) { const c = W.teen, s = (i) => L(i).start, E = EV; if (t < s(16) || t >= s(20)) { if (t < s(20)) hide(c); return; } const q = v3(18.6, 0, Z2(62)); place(c, q, -2.2); pose(c, 'idle', t); const yw = c.root.rotation.y, fw = v3(Math.sin(yw), 0, Math.cos(yw)); if (t < E.freeze + 0.2) { aimArm(c, 0, W.claw.position.clone().add(v3(0.9, 3.5, 2.1)), 1); aimArm(c, 1, W.claw.position.clone().add(v3(0.1, 3.3, 2.1)), 1); c.neck.rotation.x = 0.2; } else { c.neck.rotation.y = 0.5; } if (t > E.freeze + 0.5) { const u = clamp((t - E.freeze - 0.5) / 1.8); place(c, lp3(q, v3(14, 0, Z2(80)), u), 0); pose(c, 'walk', t); } face(c, 'neutral', t, 0.4, { noBlink: t > E.freeze }); }

// ---- rig, lights ----
function rig() {
  W.pl = []; for (let i = 0; i < 6; i++) { const l = new THREE.PointLight('#ffffff', 0, 30, 1.6); ctx.scene.add(l); W.pl.push(l); }
  const s = new THREE.SpotLight('#ffffff', 0, 90, 0.7, 0.8, 1.0); s.castShadow = true; s.shadow.mapSize.set(1536, 1536); s.shadow.bias = -0.0006; s.shadow.normalBias = 0.05; ctx.scene.add(s); ctx.scene.add(s.target); W.key = s;
}
const FL = '#fbf5d8';
function lights(zone, t, lv) {
  W.pl.forEach((l) => { l.intensity = 0; }); W.key.intensity = 0; const P0 = W.sadie.root.position; const key = (p, tg, I, ang = 0.7) => { W.key.position.copy(p); W.key.target.position.copy(tg); W.key.color.set(FL); W.key.intensity = I * lv; W.key.angle = ang; W.key.distance = 90; };
  if (zone === 'out') return;
  key(P0.clone().add(v3(4, 26, -7)), P0.clone().add(v3(0, 2, 0)), 240, 0.5);
  // a soft bounce near whoever is close (from the floor)
  const s = W.pl; s[0].position.copy(P0).add(v3(-4, 7, 8)); s[0].color.set('#fff2d0'); s[0].intensity = 40 * lv; s[0].distance = 26;
  if (zone === 'well') { s[1].position.set(0, -14, Z2(118)); s[1].color.set(FL); s[1].intensity = 260 * lv; s[1].distance = 60; s[2].position.set(0, 12, Z2(112)); s[2].color.set(FL); s[2].intensity = 180 * lv; s[2].distance = 48; }
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, Sx = [], add = (name, t0, f, zone, set) => Sx.push({ name, zone, set: set || (zone === 'out' ? 'out' : zone), t0: () => t0, f, t1: () => 0 });
  const eh = () => W.eh, sp = () => W.sadie.root.position, H = (c) => c.neck.getWorldPosition(v3()).add(v3(0, 0.75, 0));
  add('open', 0, (u) => ({ pos: lp3(v3(3.0, 4.8, -36), v3(2.6, 4.8, -33), easeInOut(u)), look: v3(-0.4, 5.8, 0), fov: 66 }), 'out');
  add('enter', s(0) + 1.9, (u) => ({ pos: lp3(v3(2.6, 4.2, 30), v3(2.3, 4.2, 27), easeOut(u)), look: v3(0, 5.2, 2), fov: 60 }), 'h1', 'door_a');
  add('phone1', s(1) - 0.06, (u) => { const h = eh(); return { pos: lp3(h.clone().add(v3(-3.4, -1.0, 7)), h.clone().add(v3(-3.0, -0.9, 6.3)), u), look: h.clone().add(v3(0, -0.6, 0)), fov: 52 }; }, 'h1');
  add('phoneI', s(1) + 1.75, () => { const q = W.phone.position, n = W.eh.clone().sub(q).normalize(); return { pos: q.clone().addScaledVector(n, 1.15).add(v3(0.08, 0.36, 0)), look: q.clone().add(v3(0, -0.16, 0)), fov: 54 }; }, 'h1');
  add('wide', s(2) - 0.06, (u) => ({ pos: lp3(v3(0, 5.2, 3), v3(0, 5.2, 6.5), easeOut(u)), look: v3(0, 6.5, 150), fov: 68 }), 'h1');
  add('store', s(3) - 0.06, (u) => ({ pos: lp3(v3(2, 7, 50), v3(2, 7, 58), u), look: v3(30, 5, 82), fov: 60 }), 'h1');
  add('lights', s(4) - 0.06, (u) => ({ pos: lp3(v3(2, 2.4, 48), v3(2.5, 2.3, 53), u), look: v3(2.5, 35, 118), fov: 72 }), 'h1');
  add('bare', s(5) - 0.06, (u) => ({ pos: lp3(v3(-19, 5, 37), v3(-21, 5, 38), easeOut(u)), look: v3(-36, 4, 38), fov: 62 }), 'h1');
  add('nobody', s(6) - 0.06, (u) => ({ pos: lp3(v3(-7, 11, 33), v3(-3, 11.5, 37), u), look: v3(3, 3, 76), fov: 66 }), 'h1');
  add('nomusic', s(7) - 0.06, (u) => { const h = eh(); return { pos: lp3(h.clone().add(v3(2.8, -0.9, 7.2)), h.clone().add(v3(2.5, -0.9, 6.5)), u), look: h.clone().add(v3(-0.1, -0.75, 0)), fov: 54 }; }, 'h1');
  add('toexit', s(8) - 0.06, (u) => { const p = sp(); return { pos: v3(-23, 5, lerp(LL - 43, LL - 12, u)), look: p.clone().add(v3(2.2, 3.2, 4)), fov: 66 }; }, 'h1');
  add('door', s(9) - 0.06, (u) => ({ pos: lp3(v3(-2.5, 3.6, LL - 21), v3(-2.2, 3.5, LL - 18), u), look: v3(0, 5.4, LL), fov: 62 }), 'h1', 'door_b');
  add('reveal', s(10) - 0.06, (u) => ({ pos: lp3(v3(-1.4, 6.0, LL - 25), v3(-1.0, 5.8, LL - 20), easeInOut(u)), look: v3(0, 8.0, LL + 80), fov: 62 }), 'h1', 'door_b');
  add('same', s(11) - 0.06, (u) => ({ pos: lp3(v3(0, 5.2, Z2(3)), v3(0, 5.2, Z2(6.5)), easeOut(u)), look: v3(0, 6.5, Z2(150)), fov: 68 }), 'h2');
  add('turn', s(12) - 0.06, (u) => { const h = eh(); return { pos: lp3(h.clone().add(v3(-3.2, -0.8, 7.5)), h.clone().add(v3(-2.8, -0.8, 7.1)), u), look: h.clone().add(v3(0, -0.7, 0)), fov: 52 }; }, 'h2');
  add('gone', s(13) - 0.06, (u) => ({ pos: lp3(v3(1.2, 4.6, Z2(13)), v3(1.0, 4.6, Z2(11.5)), easeInOut(u)), look: v3(0, 5.8, Z2(0)), fov: 62 }), 'h2');
  add('dana', s(14) - 0.06, (u) => { const h = H(W.dana); return { pos: lp3(h.clone().add(v3(-3.2, -0.6, -6.8)), h.clone().add(v3(-2.8, -0.6, -6.2)), u), look: h.clone().add(v3(0.5, -1.0, 0)), fov: 52 }; }, 'h2');
  add('reply', s(15) - 0.06, (u) => { const h = eh(); return { pos: lp3(h.clone().add(v3(1.8, -0.7, 6.0)), h.clone().add(v3(1.5, -0.7, 5.5)), u), look: h.clone().add(v3(0, -0.7, 0)), fov: 52 }; }, 'h2');
  add('still', s(16) - 0.06, (u) => { const h = H(W.dana); return { pos: lp3(h.clone().add(v3(-2.2, -0.65, -5)), h.clone().add(v3(-1.9, -0.65, -4.2)), u), look: h.clone().add(v3(0.4, -0.75, 0)), fov: 50 }; }, 'h2');
  add('map1', s(17) - 0.06, (u) => ({ pos: lp3(v3(-1.5, 5.2, Z2(41)), v3(-1.2, 5.2, Z2(42)), u), look: v3(5, 5.2, Z2(57.5)), fov: 62 }), 'h2');
  add('map2', s(17) + 1.0, (u) => { const f = W.dir.position; return { pos: lp3(v3(f.x, 6.3, f.z - 10), v3(f.x, 6.3, f.z - 9), u), look: v3(f.x, 5.0, f.z), fov: 58 }; }, 'h2');
  add('pa', s(18) - 0.06, (u) => ({ pos: lp3(v3(-1.2, 13, Z2(44)), v3(-1, 12.5, Z2(45.5)), u), look: v3(3.8, 16.8, Z2(49)), fov: 48 }), 'h2');
  add('jfreeze', s(18) + 0.85, (u) => ({ pos: lp3(v3(-0.5, 4.0, Z2(28)), v3(-1, 4.0, Z2(28.6)), u), look: v3(-7.5, 3.2, Z2(35.5)), fov: 58 }), 'h2');
  add('wfreeze', s(18) + 1.9, (u) => ({ pos: lp3(v3(-1.6, 4.4, Z2(38.5)), v3(-1.2, 4.4, Z2(39.5)), u), look: v3(3.6, 3.3, Z2(45)), fov: 56 }), 'h2');
  add('emptied', s(18) + 2.75, (u) => { const p = sp(); return { pos: lp3(v3(-4, 9.6, Z2(62)), v3(-3.6, 9.9, Z2(61)), u), look: v3(1, 2.6, Z2(30)), fov: 62 }; }, 'h2');
  add('well', s(19) - 0.06, (u) => ({ pos: lp3(v3(-3, 7.2, Z2(82)), v3(-2.6, 7.0, Z2(84)), u), look: v3(5, 6, Z2(128)), fov: 66 }), 'well');
  add('rise', s(20) - 0.06, (u) => ({ pos: lp3(v3(3.5, 0.9, Z2(91)), v3(3.5, 0.95, Z2(92)), u), look: v3(3.5, 0.5, Z2(107.5)), fov: 30 }), 'well');
  add('still2', s(21) - 0.06, (u) => { const q = W.janitor.root.position; return { pos: lp3(q.clone().add(v3(4.0, 3.8, 6.4)), q.clone().add(v3(3.8, 3.8, 5.4)), u), look: q.clone().add(v3(-1, 4.1, -0.5)), fov: 54 }; }, 'well');
  add('backw', s(22) - 0.06, (u) => { const q = W.janitor.root.position; return { pos: lp3(q.clone().add(v3(-0.8, 6.4, -4.9)), q.clone().add(v3(-0.7, 6.2, -4.1)), u), look: q.clone().add(v3(0.2, 4.0, 0)), fov: 56 }; }, 'well');
  add('ano1', s(23) - 0.06, (u) => ({ pos: lp3(v3(-3.5, 0.9, Z2(91)), v3(-3.5, 0.95, Z2(92)), u), look: v3(-3.5, 0.5, Z2(107.5)), fov: 30 }), 'well');
  add('ano2', s(24) - 0.06, (u) => ({ pos: lp3(v3(10.5, 0.9, Z2(91)), v3(10.5, 0.95, Z2(92)), u), look: v3(10.5, 0.5, Z2(107.5)), fov: 30 }), 'well');
  add('all', s(25) - 0.06, (u) => ({ pos: lp3(v3(-2.5, 32, Z2(68)), v3(-1.5, 33, Z2(71)), easeInOut(u)), look: v3(0, -22, Z2(112)), fov: 60 }), 'well');
  add('pa2', s(26) - 0.06, (u) => { const h = eh(); return { pos: lp3(h.clone().add(v3(-3.5, -1.2, 8.4)), h.clone().add(v3(-3.1, -1.1, 7.6)), u), look: h.clone().add(v3(0, -0.9, 0)), fov: 54 }; }, 'well');
  add('phone2', s(27) - 0.06, (u) => { const h = eh(); return { pos: lp3(h.clone().add(v3(3.2, -1.1, 6.2)), h.clone().add(v3(2.8, -1.0, 5.6)), u), look: h.clone().add(v3(0, -0.9, 0)), fov: 54 }; }, 'well');
  add('phoneI2', s(28) - 0.06, () => { const q = W.phone.position, n = W.eh.clone().sub(q).normalize(); return { pos: q.clone().addScaledVector(n, 1.15).add(v3(-0.08, 0.36, 0)), look: q.clone().add(v3(0, -0.16, 0)), fov: 54 }; }, 'well');
  add('turnback', s(29) - 0.06, (u) => ({ pos: lp3(v3(4.8, 3.4, Z2(87.5)), v3(4.5, 3.5, Z2(88.3)), u), look: v3(3, 3.2, Z2(106)), fov: 56 }), 'well');
  add('stare', s(29) + 1.75, (u) => { const q = W.janitor.root.position; return { pos: q.clone().add(v3(0.8 - u * 0.2, 5.0, -9 + u * 1.2)), look: q.clone().add(v3(0, 4.2, 0)), fov: 46 }; }, 'well');
  add('dim', s(30) - 0.06, (u) => ({ pos: lp3(v3(-3, 7.2, Z2(79)), v3(-2.7, 7.4, Z2(80)), u), look: v3(2, 7.5, Z2(128)), fov: 66 }), 'well');
  add('sadcu', s(31) - 0.06, (u) => { const h = eh(); return { pos: lp3(h.clone().add(v3(-1.6, -0.5, 5.4)), h.clone().add(v3(-1.4, -0.5, 4.9)), u), look: h.clone().add(v3(0.2, -0.45, 0)), fov: 50 }; }, 'well');
  add('faces', s(32) - 0.06, (u) => ({ pos: lp3(v3(0, 9, Z2(84)), v3(0, 9, Z2(85.2)), u), look: v3(0, 1.5, Z2(104)), fov: 54 }), 'well');
  add('turnround', s(33) - 0.06, (u) => { const h = eh(); return { pos: lp3(h.clone().add(v3(1.5, -0.5, 5.2)), h.clone().add(v3(1.3, -0.5, 4.6)), u), look: h.clone().add(v3(0, -0.45, 0)), fov: 52 }; }, 'well', 'h2f');
  add('far', s(33) + 0.75, (u) => ({ pos: lp3(v3(-2.2, 5.0, Z2(38)), v3(-2.0, 5.0, Z2(36)), u), look: v3(1, 5.6, Z2(4)), fov: 40 }), 'h2', 'h2f');
  add('final', s(33) + 2.1, (u) => ({ pos: lp3(v3(-1.1, 6.0, Z2(95.5)), v3(-1.0, 6.0, Z2(94.5)), easeInOut(u)), look: v3(1, 5.0, Z2(0)), fov: 44 }), 'h2', 'h2f');
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
const shotName = (t) => shotAt(W.shots, t).name;
const zoneOf = (nm) => W.shots.find((q) => q.name === nm);

function sceneSet(setName, t) {
  const E = EV, hall1On = ['out', 'h1', 'door_a', 'door_b'].includes(setName), hall2On = ['door_b', 'h2', 'well', 'h2f'].includes(setName);
  W.hall1.visible = hall1On; W.hall2.visible = hall2On; W.ext.visible = setName === 'out' || setName === 'door_a' || setName === 'h2f'; W.ext.position.z = setName === 'h2f' ? LL : 0;
  W.blocks.visible = ['h2', 'well'].includes(setName) && t < L(33).start - 0.2;
  // the doors
  W.doorA.visible = hall1On; W.doorB.visible = true; W.doorC.visible = hall2On;
}

function renderAt(t) {
  const E = EV, s = (i) => L(i).start, sh0 = shotAt(W.shots, t), Z = zoneOf(sh0.name), zone = Z.zone;
  applyEnv(ctx, zone === 'out' ? OUTSIDE : INSIDE);
  sceneSet(Z.set, t);
  const panelK = t < E.dim ? 1 : lerp(1, 0.32, smooth(E.dim, E.dim + 0.7, t)), lv = panelK * (0.97 + noise1(t * 9) * 0.03);
  mallMats().panel.color.setRGB(1.4 * lv, 1.45 * lv, 1.32 * lv); mallMats().shopGlow.color.setRGB(1.25 * lv, 1.15 * lv, 0.95 * lv);
  W.doorA.set(smooth(E.dA0, E.dA0 + 0.65, t) * (1 - smooth(E.dA1, E.dA1 + 0.7, t)));
  W.doorB.set(smooth(E.dB0, E.dB0 + 0.65, t) * (1 - smooth(E.dB1, E.dB1 + 0.6, t)) + smooth(E.dB2, E.dB2 + 0.7, t) * (1 - smooth(s(18), s(19) - 0.1, t)) + smooth(E.door - 0.35, E.door + 0.3, t));
  W.steps1.visible = W.hall1.visible; W.steps2.visible = W.hall2.visible; W.steps2.update(W.Dt(t));
  const turnYaw = t < E.turn ? 0 : Math.PI * easeInOut(smooth(E.turn, E.turn + 0.5, t));
  poseIvy(t); poseSadie(t); poseRep(t);
  if (t < s(20)) { poseDana(t); poseWalt(t); poseBoy(t); poseJanitor(t); poseGuard(t); poseTeen(t); }
  else { W.bagL.visible = W.bagR.visible = W.mop.visible = false; riders(t, turnYaw); }
  W.claw.visible = true; updFar(t, turnYaw);
  lights(zone === 'h1' || zone === 'h2' || zone === 'well' ? zone : 'out', t, lv);
  W.air.update(t);
  ctx.scene.updateMatrixWorld(true);
  let sh = shotAt(W.shots, t);
  { const dq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgchar'); if (dq) { const ql = dq.split(';'), q = ql[Math.round(t * 100) % ql.length].split(','), c = W[q[0]], hp = c.head.getWorldPosition(v3()), ry = c.root.rotation.y, f = ry + (+q[1]) * Math.PI / 180, dist = 3.4; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +q[2], Math.cos(f) * dist)), look: hp.clone().add(v3(0, 0.05, 0)), fov: 40 }; } }
  { const cq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgcam'); if (cq) { const ql = cq.split(';'), q = ql[Math.round(t * 100) % ql.length].split(',').map(Number); sh = { ...sh, pos: v3(q[0], q[1], q[2]), look: v3(q[3], q[4], q[5]), fov: q[6] || 50 }; } }
  W.mirror.U.uReflK.value = zone === 'out' ? 0 : 1;
  if (zone !== 'out') W.mirror.render(sh.pos, sh.look, sh.fov || 60, [W.hall1.floor, W.hall2.floor]);
  frame(ctx, t, sh, { steady: true, shake: 0, shadowSpan: 44, shadows: true, black: 0 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep31', { look: 'pro', avatars: Object.values(AV) }); L = ctx.L; EV = events(); drivers();
  await loadAlti(['neutral', 'smile', 'surprised', 'shocked', 'scared', 'terrified', 'nervous', 'worried']);
  const { scene, camera } = ctx; camera.far = 1600; camera.near = 0.2; camera.updateProjectionMatrix();
  rig();
  mallMats();
  const fm = polishedFloor(); W.mirror = floorMirror(ctx, fm, { w: 540, h: 960 });
  W.hall1 = mallHall({ floorMat: fm, arcade: true }); scene.add(W.hall1);
  W.hall2 = W.hall1.clone(); W.hall2.floor = W.hall2.children.find((c) => c.geometry === W.hall1.floor.geometry); W.hall2.position.z = LL; scene.add(W.hall2);
  const ar = arcadeFront(); W.hall1.add(ar); const ar2 = ar.clone(); W.hall2.add(ar2);
  W.ext = exteriorFacade(); scene.add(W.ext);
  W.doorA = automaticDoor(); W.doorA.position.z = 0.9; scene.add(W.doorA);
  W.doorB = automaticDoor(); W.doorB.position.z = LL; scene.add(W.doorB);
  W.doorC = automaticDoor(); W.doorC.position.z = 2 * LL; scene.add(W.doorC);
  W.blocks = blockWall(); W.blocks.position.z = LL - 1.5; scene.add(W.blocks);
  W.lanes = ESC_LANES(); W.steps1 = escalatorSteps(W.lanes); W.hall1.add(W.steps1); W.steps2 = escalatorSteps(W.lanes); W.hall2.add(W.steps2);
  W.phone = phoneProp(); scene.add(W.phone); W.phone.visible = false;
  W.dir = directoryKiosk(); W.dir.position.set(7.5, 0, Z2(58)); W.dir.rotation.y = Math.PI; scene.add(W.dir);
  W.mapPoint = v3(9.4, 7.2, Z2(57.5));
  W.bagR = shoppingBag('#d6a79b'); W.bagL = shoppingBag('#a8c3bf'); scene.add(W.bagR); scene.add(W.bagL);
  W.mop = mop(); W.mop.visible = false; scene.add(W.mop); W.bucket = bucket(); W.bucket.position.set(-11, 0, Z2(33)); scene.add(W.bucket); W.wet = wetSign(); W.wet.position.set(-5.5, 0, Z2(38)); W.wet.rotation.y = 0.5; scene.add(W.wet);
  W.claw = clawMachine(); W.claw.position.set(19.5, 0, Z2(64)); scene.add(W.claw); const c2 = clawMachine(); c2.position.set(19.5, 0, Z2(71)); scene.add(c2);
  W.horn = paHorn(); W.horn.position.set(3.8, 17.2, Z2(49)); scene.add(W.horn);
  people(); buildFar(); W.pp = pathSadie();
  W.air = atmos(dust(scene, { size: 90, height: 24, centre: v3(0, 0, Z2(40)), count: 90, color: '#f4f0d8', amount: 0.06, pointSize: 0.12 }));
  W.shots = shots();
  window.__ep31 = { W, THREE, ctx };
  return expose(ctx, renderAt, L(33).end + 1.0, EV);
}
