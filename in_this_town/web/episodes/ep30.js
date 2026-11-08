// Episode 30: The Amusement Park That Never Opens (Liminal Horror 4/5). Piper has watched the rides run every night with nobody inside. One evening the gates are open. An old man hands her a ticket: "You're late."
// No guests, every ride running, a sweeper on clean ground, a seller holding bare strings. On the carousel, a large tired blue creature with a red balloon points at the Ferris wheel: every seat is taken by nobody.
// The music stops. "One guest remains." The workers put down their tools and leave; the creature gives Piper the balloon and walks out, and the gate locks. Her name is on the balloon. "Thank you for taking the final shift."
// Every ride stops, hundreds of invisible footsteps come, and the booth goes from CLOSED to OPEN. An original design (engine/amusement.js). The world: +z is the street, the midway runs to -z.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, noise1, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, NIGHT } from '../engine/stage.js';
import { dust, atmos } from '../engine/atmos.js';
import { aimArm as aimArm0 } from '../engine/anims.js';
import { jointify } from '../engine/infinitetower.js';
import { ferrisWheel, carousel, ticketBooth, parkArch, exitGate, chainFence, midwayStall, parkLamp, stringBulbs, paSpeakers, queueRope, broom, controlLever, ticketStub, bareStrings, popcornTub, balloon, stringSeg, teaCups, swingRide, coaster, parkGround, distantTrees, shoePrints, blueCreature, FADED } from '../engine/amusement.js';
const aimArm = (c, side, p, k = 1) => { c.root.updateMatrixWorld(true); aimArm0(c, side, p, k); };
const lp3 = (a, b, u) => a.clone().lerp(b, u);

let ctx, L, EV;
const W = { eh: v3(0, 5, 0), ch: v3(0, 8, 0) };
const WHEEL = v3(-36, 0, -78), WRY = 0.4, CAR = v3(0, 0, -36), BOOTH = v3(0, 0, 14), ARCH = v3(-14, 0, 26), EXIT = v3(13, 0, 26), PA = v3(9.5, 0, -13);
const THETA_F = -Math.PI / 2 - 0.24;   // where the bench stops: just past the front of the carousel, Piper's side
const AV = { piper: 'farm_ep30_piper', theo: 'farm_ep30_theo', ticket: 'farm_ep30_ticket', seller: 'farm_ep30_seller', sweeper: 'farm_ep30_sweeper', operator: 'farm_ep30_operator', boy: 'farm_ep30_boy' };
const SK = { piper: '#f2c9a0', theo: '#8d5524', ticket: '#f2c9a0', seller: '#c68642', sweeper: '#8d5524', operator: '#f2c9a0', boy: '#f2c9a0' };
const PARK = { ...NIGHT, ...P({ top: '#0b1517', horizon: '#34463f', haze: '#2a3a36', sunColor: '#c9d6c2', hemiSky: '#a9c0ac', hemiGround: '#46443a' }), sunDir: v3(-0.45, 0.75, 0.5), sunI: 0.55, sunDisc: 0, stars: 0, moon: 0, hemiI: 1.55, amb: 0.42, envI: 0.75, exposure: 1.18, bloom: 0.05, fogNear: 85, fogFar: 340, saturation: 1.05, contrast: 1.05, bounce: 0.14, win: 0, lamp: 0 };

// ---- times ----
function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  const flip = s(26) + 2.05;
  return { rides: s(1) + 0.15, boothOn: s(4) + 0.4, tk: s(7) + 1.0, late: s(8), pull: s(17) - 0.28, stopCar: s(17) + 0.04, tools: s(19) - 0.1, workers: s(19) + 0.55, stand: s(19) + 1.0, give: s(20) + 1.15, slam: s(21) + 3.3, flip, stopAll: s(24) + 0.05, printsAt: s(25) - 0.1, end: ctx.dur };
}
// integrate a speed profile once, so a frame is a pure function of t
function integ(om, end) { const n = Math.ceil(end * 240) + 2, a = new Float32Array(n), h = 1 / 240; let v = 0; for (let i = 0; i < n; i++) { a[i] = v; v += om(i * h) * h; } return (t) => { const x = clamp(t, 0, end) * 240, i = Math.min(n - 2, Math.floor(x)), f = x - i; return a[i] + (a[i + 1] - a[i]) * f; }; }
function drivers() {
  const s = (i) => L(i).start, E = EV, R = ctx.dur + 1;
  const up = (t) => smooth(E.rides, E.rides + 1.3, t), down = (t) => 1 - smooth(E.stopAll, E.stopAll + 0.9, t);
  W.wheelRot = integ((t) => 0.1 * up(t) * down(t), R);
  W.teaRot = integ((t) => 0.55 * up(t) * down(t), R);
  W.swingRot = integ((t) => 1.1 * up(t) * down(t), R);
  W.coasterU = integ((t) => 0.05 * up(t) * down(t), R);
  const om = (t) => 0.62 * up(t) * lerp(1, 0.26, smooth(s(10), s(11) + 0.4, t)) * (1 - smooth(E.stopCar, E.stopCar + 1.25, t));
  const I = integ(om, R), total = I(R);
  W.spin = (t) => THETA_F + total - I(t);   // the deck turns toward lower angles; it ends at THETA_F
  W.spd = (t) => up(t) * down(t);
  W.level = (t) => smooth(E.rides, E.rides + 0.5, t) * (0.72 + 0.28 * (noise1(t * 7) * 0.5 + 0.5)) * (1 - 0.9 * smooth(E.stopAll, E.stopAll + 1.1, t));
  // the gondola at the bottom of the wheel when the shot comes
  const rs = W.wheelRot(s(15)), N = 16; let best = 0, bv = 9; for (let i = 0; i < N; i++) { const a = ((rs + i / N * Math.PI * 2 + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), d = Math.min(a, Math.PI * 2 - a); if (d < bv) { bv = d; best = i; } } W.hero = best;
}
function gondolaAt(i, t) { const a = W.wheelRot(t) + i / 16 * Math.PI * 2, x = Math.cos(a) * 30, y = 42 + Math.sin(a) * 30, c = Math.cos(WRY), s = Math.sin(WRY); return v3(WHEEL.x + x * c, y, WHEEL.z - x * s); }
const wheelDirs = () => ({ x: v3(Math.cos(WRY), 0, -Math.sin(WRY)), z: v3(Math.sin(WRY), 0, Math.cos(WRY)) });

// ---- helpers ----
const armLen = (c) => { if (!c._alen) { c.reset(); c.root.updateMatrixWorld(true); const r = c.root.rotation.clone(), p = c.root.position.clone(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3().setFromObject(c.arms[0]); c._alen = sh.y - bx.min.y - 0.25; c.root.rotation.copy(r); c.root.position.copy(p); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); return c.arms[side].localToWorld(v3(0, -armLen(c), 0.12)); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.scale.setScalar(c._sc || 1); }
function place(c, p, yaw) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.noBlink ? false : blinkAt(t, ph) && !['shocked', 'terrified'].includes(name), viseme: o.viseme }); }
const talk = (c, i, t) => (t > L(i).start && t < L(i).end ? visemeAt(L(i).text, L(i).start, L(i).end, t) : undefined);
// a walk along timed points: { p, walking, yaw }
function path(keys, t) { if (t <= keys[0][0]) return { p: keys[0][1].clone(), walking: false, yaw: keys[0][2] ?? null }; for (let i = 0; i < keys.length - 1; i++) { const [a, pa, ya] = keys[i], [b, pb, yb] = keys[i + 1]; if (t < b) { if (pa.distanceTo(pb) < 0.01) return { p: pa.clone(), walking: false, yaw: ya ?? null }; const u = clamp((t - a) / (b - a)), q = lp3(pa, pb, smooth(0, 1, u) * 0.3 + u * 0.7); return { p: q, walking: true, yaw: yawTo(pa, pb) }; } } const k = keys[keys.length - 1]; return { p: k[1].clone(), walking: false, yaw: k[2] ?? null }; }
function walker(c, r, t, restYaw, rate = 1) { place(c, r.p, r.yaw ?? restYaw); if (r.walking) pose(c, 'walk', t * rate); else pose(c, 'idle', t); }

// ---- the people ----
function people() {
  const mk = (avatar, skin, sc = 1) => { const c = makeCharacter({ avatar, alti: true, skin, caustic: false }); ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c._sc = sc; c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c); return c; };
  for (const k of Object.keys(AV)) W[k] = mk(AV[k], SK[k], k === 'boy' ? 0.74 : 1);
  // the boy's fringe would cross his eyes: lift the hair a little
  W.boy.head && W.boy.neck.traverse((o) => { if (o.isMesh && /hair/i.test(o.name || o.material?.name || '')) { o.position.y += 0.22; } });
  { const c = W.theo, box = new THREE.Box3(); c.headParts.forEach((m) => { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); }); const cz = (box.min.z + box.max.z) / 2, top = box.min.y + (box.max.y - box.min.y) * 0.8; c.head.traverse((m) => { if (m.isMesh && !c.headParts.includes(m) && m !== c.faceSheet) { const g = m.geometry.clone(), q = g.attributes.position; for (let i = 0; i < q.count; i++) if (q.getZ(i) > cz - 0.05 && q.getY(i) < top) q.setY(i, top + (q.getY(i) - top) * 0.1); q.needsUpdate = true; g.computeVertexNormals(); m.geometry = g; } }); }
  W.staff = [W.ticket, W.seller, W.sweeper, W.operator, W.boy];
}
const ROUTE = (a) => [a, ...(a.z > 15 ? [] : [v3(7.5, 0, 7), v3(7.8, 0, 18)]), v3(13, 0, 22), v3(13, 0, 66)];
function staffRoute(a, t0) { let tt = t0, p = a; const k = [[t0, a]], pts = ROUTE(a); for (let i = 1; i < pts.length; i++) { tt += pts[i - 1].distanceTo(pts[i]) / 7.2; k.push([tt, pts[i]]); } return k; }
function poseTheo(t) { const c = W.theo; if (t > L(6).start - 0.1) { c.root.visible = false; return; } place(c, v3(2.0, 0, 27.7), Math.PI + 0.1); pose(c, 'idle', t); c.neck.rotation.y = t > L(5).start - 0.2 ? -0.55 : 0; face(c, 'nervous', t, 0.7, { viseme: talk(c, 5, t) }); }
function poseTicket(t) {
  const c = W.ticket, s = (i) => L(i).start, S0 = v3(-10.2, 0, 19.5), r = t > EV.workers + 0.2 ? path(staffRoute(S0, EV.workers + 0.3), t) : { p: S0, walking: false, yaw: null };
  if (t < s(6) - 0.1) { c.root.visible = false; return; }
  walker(c, r, t, -Math.PI / 2 - 0.15, 0.95);
  if (!r.walking && r.p.distanceTo(S0) < 0.1) { c.neck.rotation.x = 0.28; const giving = smooth(s(7) - 0.05, s(7) + 0.4, t) * (1 - smooth(EV.tk + 0.2, EV.tk + 0.65, t)); if (giving > 0) aimArm(c, 0, W.tkMid, giving); c.arms[1].rotation.x = -0.25; }
  face(c, 'neutral', t, 0.45, { viseme: talk(c, 8, t) });
}
const SWEEP = v3(-7, 0, 3);
function poseSweeper(t) {
  const c = W.sweeper; if (t < L(6).start) { c.root.visible = false; W.broom.visible = false; return; }
  const E = EV, k = smooth(E.tools + 0.05, E.workers - 0.05, t), gone = t > E.workers + 0.15, st = gone ? path(staffRoute(v3(-7, 0, 3), E.workers + 0.2), t) : { p: SWEEP, walking: false, yaw: null };
  walker(c, st, t, 1.0, 0.95); W.broom.visible = true; const yaw = 1.0, fw = v3(Math.sin(yaw), 0, Math.cos(yaw)), sd = v3(fw.z, 0, -fw.x);
  if (gone) { W.broom.position.set(SWEEP.x + fw.x * 2.4, 0.13, SWEEP.z + fw.z * 2.4); W.broom.quaternion.setFromUnitVectors(v3(0, 1, 0), sd.clone().multiplyScalar(-1)); face(c, 'neutral', t, 0.5); return; }
  const sw = Math.sin(t * 3.0), base = SWEEP.clone().addScaledVector(fw, 3.2 - k * 0.8).addScaledVector(sd, sw * 0.8 * (1 - k)), low = k;
  c.torso.rotation.x = 0.1 + k * 0.72; if (k > 0) { const drop = k * 1.5; c.hips.position.y -= drop; c.legs.forEach((l, i) => { l.rotation.x = -k * 1.2; c.knee[i].rotation.x = k * 2.0; }); }
  const gripU = v3(0, 4.6 - k * 3.4, 0).add(SWEEP).addScaledVector(fw, 1.45 + k * 0.6).addScaledVector(sd, sw * 0.3 * (1 - k) - 0.25); aimArm(c, 0, gripU, 1); const H = handOf(c, 0);
  const d = H.clone().sub(base), flat = d.clone().lerp(sd.clone().multiplyScalar(-3.6).add(v3(0, 0.02, 0)), k * k).normalize(); W.broom.position.copy(base); W.broom.position.y = 0.13 * k; W.broom.quaternion.setFromUnitVectors(v3(0, 1, 0), flat);
  const g2 = base.clone().addScaledVector(flat, 3.4); aimArm(c, 1, g2, 1 - k * 0.4); c.neck.rotation.x = 0.2; face(c, 'neutral', t, 0.5);
}
const SELLER = v3(6, 0, -2);
function poseSeller(t) {
  const c = W.seller; if (t < L(6).start) { c.root.visible = false; W.bare.visible = false; return; }
  const E = EV, gone = t > E.workers + 0.05, st = gone ? path(staffRoute(SELLER, E.workers + 0.1), t) : { p: SELLER, walking: false, yaw: null };
  walker(c, st, t, -1.15, 0.95);
  if (!gone) { const a = c.root.position.clone().add(v3(-1.3, 4.5, -1.6)); aimArm(c, 0, a, 1); c.neck.rotation.y = t > L(9).end ? -0.25 : 0; W.handS = handOf(c, 0); }
  // she lets go; the strings rise away with nothing on them
  const lift = Math.max(0, t - (E.tools + 0.7)); W.bare.visible = lift < 4; W.bare.position.copy(W.handS).add(v3(0, lift * lift * 1.8, 0)); W.bare.rotation.y = lift * 0.5;
  face(c, 'neutral', t, 0.5, { viseme: talk(c, 10, t), noBlink: true });
}
const OP = v3(9, 0, -17.5), OPY = Math.atan2(-9, -18.5);
function poseOperator(t) {
  const c = W.operator; if (t < L(9).start - 0.1) { c.root.visible = false; return; }
  const E = EV, gone = t > E.workers + 0.25, st = gone ? path(staffRoute(OP, E.workers + 0.3), t) : { p: OP, walking: false, yaw: null };
  walker(c, st, t, OPY, 0.95);
  const pu = smooth(E.pull, E.pull + 0.3, t); W.lever.arm.rotation.z = lerp(-0.45, 0.5, pu);
  if (!gone) { W.lever.updateMatrixWorld(true); const K = W.lever.arm.localToWorld(v3(0, 1.66, 0)); aimArm(c, 0, K, 1); c.neck.rotation.x = 0.1; }
  face(c, 'smile', t, 0.2, { noBlink: true });
}
const BOY = v3(-5.2, 0, -15.5);
function poseBoy(t) {
  const c = W.boy; if (t < L(9).start) { c.root.visible = false; return; }
  const E = EV, gone = t > E.workers + 0.4, st = gone ? path(staffRoute(BOY, E.workers + 0.45), t) : { p: BOY, walking: false, yaw: null };
  walker(c, st, t, 2.5, 1.1);
  if (!gone) { const tn = smooth(L(14).start - 0.45, L(14).start, t); c.root.rotation.y = lerp(2.5, 0.75, tn); c.neck.rotation.y = 0; c.neck.rotation.x = -0.32 * tn; }
  face(c, 'neutral', t, 0.3, { viseme: talk(c, 14, t) });
}

// ---- Piper ----
function pathPiper() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return [[s(6) - 0.1, v3(-14, 0, 48)], [s(7) - 0.15, v3(-13.25, 0, 19.6), Math.PI / 2], [s(9) + 0.05, v3(-13.25, 0, 19.6), Math.PI / 2], [s(10) - 0.15, v3(1.3, 0, -1.6), Math.PI / 2], [s(11) - 0.05, v3(1.3, 0, -1.6), Math.PI / 2], [s(11) + 1.6, v3(0.5, 0, -13.5), Math.PI], [s(21) + 0.2, v3(0.5, 0, -13.5), Math.PI], [s(21) + 1.9, v3(1.2, 0, -5), Math.PI], [s(21) + 1.92, v3(10.4, 0, 16)], [s(22) - 0.1, v3(10.4, 0, 22.6), Math.PI], [s(24) - 0.1, v3(10.4, 0, 22.6), Math.PI], [s(24) + 0.9, v3(1.8, 0, 9), Math.PI], [ctx.dur + 1, v3(1.8, 0, 9), Math.PI]];
}
function posePiper(t) {
  const c = W.piper, s = (i) => L(i).start, e = (i) => L(i).end, E = EV;
  if (t < s(6) - 0.1) { place(c, v3(-1.6, 0, 27.7), Math.PI - 0.1); pose(c, 'idle', t); const li = smooth(s(5) - 0.4, s(5), t); c.root.rotation.y += li * 0.12; face(c, 'neutral', t, 0.6); }
  else {
    const r = path(W.pp, t); walker(c, r, t, Math.PI, 0.92);
    let fx = 'neutral', yaw = c.root.rotation.y;
    if (t > s(7) - 0.05 && t < E.tk + 0.65) { const a = smooth(s(7) + 0.3, E.tk, t) * (1 - smooth(E.tk + 0.25, E.tk + 0.65, t)); if (a > 0) aimArm(c, 0, W.tkMid, a); c.neck.rotation.x = 0.15; fx = 'surprised'; }
    if (t > s(8) && t < s(9)) fx = 'worried';
    if (t > s(9) && t < s(10)) { c.neck.rotation.y = Math.sin((t - s(9)) * 1.9) * 0.4; fx = 'worried'; }
    if (t > s(10) - 0.2 && t < s(11)) { fx = 'nervous'; }
    if (t >= s(11) && t < s(13)) { c.neck.rotation.x = -0.1; fx = t < s(12) ? 'surprised' : 'nervous'; }
    if (t >= s(14) - 0.45 && t < s(15) + 0.2) { c.root.rotation.y += smooth(s(14) - 0.45, s(14) - 0.05, t) * (1 - smooth(s(15) - 0.2, s(15) + 0.2, t)) * 1.05; }
    if (t >= s(13) && t < s(17)) { const q = smooth(s(14) - 0.2, s(14) + 0.3, t), wy = smooth(s(14) + 0.5, s(15), t); c.neck.rotation.y = q * 0.75 * (1 - wy) + wy * 0.8; c.neck.rotation.x = -0.1 - wy * 0.55; fx = t < s(15) ? 'worried' : t < s(17) ? 'scared' : 'worried'; }
    if (t >= s(17) && t < s(20)) { const a = smooth(s(18) - 0.1, s(18) + 0.3, t) * (1 - smooth(s(19) + 0.5, s(19) + 1.0, t)); c.neck.rotation.y = a * -0.5; c.neck.rotation.x = -0.6 * a; fx = t < s(19) ? 'scared' : 'nervous'; }
    if (t >= s(20) && t < s(21)) { c.neck.rotation.x = -0.45 * (1 - smooth(s(20), E.give, t)) - 0.15; fx = 'nervous'; }
    if (t > s(21)) fx = t < s(22) ? 'scared' : t < s(23) ? 'shocked' : t < s(25) ? 'scared' : 'terrified';
    if (t > s(22) - 0.1 && t < s(23)) { c.neck.rotation.x = -0.5; }
    if (t > s(23) && t < s(24)) { c.neck.rotation.x = -0.5; c.neck.rotation.y = 0.45; }
    // holding the balloon's string
    if (t > E.give - 0.3) { c.root.updateMatrixWorld(true); const yw = c.root.rotation.y, fw = v3(Math.sin(yw), 0, Math.cos(yw)), sd = v3(fw.z, 0, -fw.x), k = smooth(E.give - 0.3, E.give + 0.05, t); const hold = c.root.position.clone().add(v3(0, 3.3, 0)).addScaledVector(fw, 1.1).addScaledVector(sd, -2.1); aimArm(c, 0, t < E.give + 0.4 ? W.giveMid : hold, Math.min(1, k + 0.0)); }
    if (t > E.printsAt + 0.5) { c.torso.rotation.x = -0.04; c.arms[1].rotation.x = -0.35; }
    face(c, fx, t, 0.7, { noBlink: t > s(25) });
  }
  c.root.updateMatrixWorld(true); W.eh.copy(c.neck.getWorldPosition(v3())).add(v3(0, 0.75, 0));
}
const BALLOON_UP = 3.2;
function poseCreature(t) {
  const cr = W.cr, s = (i) => L(i).start, e = (i) => L(i).end, E = EV, th = W.spin(t), R = cr.root; cr.reset(); R.visible = t > s(10) + 0.5;
  const seat = v3(Math.cos(th) * 9.6, W.car.seatY, -Math.sin(th) * 9.6).add(CAR);
  const hipSit = W.car.seatY + 0.74, fw = v3(Math.sin(th), 0, Math.cos(th));
  const standU = clamp((t - E.stand) / 1.15), tAt = E.give - 0.65, leave = s(21) + 0.15;
  let pHand = null;
  if (t < E.stand) {
    // on the bench; it sits a little forward so its back rests on the backrest
    const p = seat.clone().addScaledVector(fw, 0.42); R.position.set(p.x, 0, p.z); R.rotation.y = th; R.scale.setScalar(0.92);
    cr.hips.position.y = hipSit / 0.92; cr.legs.forEach((l) => { l.rotation.x = -1.42; }); cr.torso.rotation.x = 0.1 + Math.sin(t * 0.8) * 0.012; cr.neck.rotation.x = 0.26;
    // turn toward Piper: the head and shoulders, slowly, and they stay on her as the deck carries it round
    const look = smooth(s(13) - 0.1, s(13) + 1.5, t), pp = W.piper.root.position.clone().add(v3(0, 5.2, 0)), bodyYaw = th, want = Math.atan2(pp.x - p.x, pp.z - p.z), dy = ((want - bodyYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    cr.torso.rotation.y = look * clamp(dy, -0.6, 0.6); cr.neck.rotation.y = look * clamp(dy * 0.85, -1.1, 1.1); cr.neck.rotation.x = 0.26 - look * 0.14;
    // the balloon arm: its right hand, resting up on the armrest side
    R.updateMatrixWorld(true); const grip = p.clone().add(v3(0, 3.3, 0)).addScaledVector(fw, 2.4).addScaledVector(v3(fw.z, 0, -fw.x), 4.8); cr.aim(1, grip, 1, 0.55);
    // the other arm comes up and points at the wheel, and keeps pointing as the deck turns
    const ptK = smooth(s(13) + 1.0, s(13) + 2.0, t) * (1 - smooth(E.tools - 0.6, E.tools, t)); if (ptK > 0) cr.aim(0, v3(WHEEL.x + 8, 36, WHEEL.z), ptK);
    cr.setFace(blinkAt(t * 0.5, 0.3) ? 'shut' : look > 0.5 ? 'heavy' : 'tired'); pHand = cr.handP(1);
  } else if (t < tAt) {
    // standing up: forward off the seat onto the deck, then the cut carries it to her
    const u = standU, p = seat.clone().addScaledVector(fw, 0.42 + easeInOut(u) * 5.6); R.position.set(p.x, 0, p.z); R.rotation.y = th; R.scale.setScalar(0.92);
    const hip0 = hipSit / 0.92, hip1 = (W.car.deckY + 2.25) / 0.92; cr.hips.position.y = lerp(hip0, hip1, easeInOut(u)) + Math.sin(u * Math.PI) * 0.12; cr.legs.forEach((l, i) => { l.rotation.x = lerp(-1.42, i ? 0.1 : -0.06, easeInOut(u)); }); cr.torso.rotation.x = 0.1 + Math.sin(u * Math.PI) * 0.55 + u * 0.14; cr.neck.rotation.x = 0.1; R.updateMatrixWorld(true); const grip = p.clone().add(v3(0, 4.4, 0)).addScaledVector(fw, 3.0).addScaledVector(v3(fw.z, 0, -fw.x), 3.0); cr.aim(1, grip, 1, 0.6); cr.setFace('heavy'); pHand = cr.handP(1);
  } else if (t < leave + 0.05) {
    // in front of her, holding it out; the string changes hands; it lets its arm fall and stands a moment
    const a = v3(0.3, 0, -19.3), b = W.creatureStand, u = clamp((t - tAt) / 0.5), p = lp3(a, b, easeOut(u)), yaw = yawTo(p, W.piper.root.position); R.position.set(p.x, 0, p.z); R.rotation.y = yaw; R.scale.setScalar(0.92);
    const walking = u < 1; if (walking) { cr.legs[0].rotation.x = Math.sin(t * 5) * 0.32; cr.legs[1].rotation.x = -Math.sin(t * 5) * 0.32; }
    cr.torso.rotation.x = 0.12; R.updateMatrixWorld(true);
    const out = smooth(E.give - 0.6, E.give, t), back = smooth(E.give + 0.3, E.give + 0.9, t); const ht = W.giveMid.clone(); cr.aim(1, ht, 1 - back * 0.85, 0.05); cr.neck.rotation.x = 0.28; cr.setFace(blinkAt(t, 0.5) ? 'shut' : 'heavy'); if (t < E.give) pHand = cr.handP(1);
  } else {
    // it walks away, slowly, first up the midway and then out of the gate (the cut skips the plaza)
    const t1 = s(21) + 2.0, inFar = t >= t1 + 0.02; let p, yaw;
    if (!inFar) { const u = clamp((t - leave) / (t1 - leave)), A = v3(-5.9, 0, -14.5), B = v3(-4.8, 0, -7.5); if (u < 0.34) { p = lp3(W.creatureStand, A, u / 0.34); yaw = yawTo(W.creatureStand, A); } else { p = lp3(A, B, (u - 0.34) / 0.66); yaw = lerp(yawTo(W.creatureStand, A), yawTo(A, B), smooth(0.34, 0.5, u)); } }
    else { const u = clamp((t - (t1 + 0.02)) / (E.slam - 0.35 - t1)); p = lp3(v3(13, 0, 16), v3(13, 0, 33.5), u); yaw = 0; if (t > E.slam + 0.1) R.visible = false; }
    R.position.set(p.x, 0, p.z); R.rotation.y = yaw; R.scale.setScalar(0.92); const w = Math.sin(t * 4.2); cr.legs[0].rotation.x = w * 0.32; cr.legs[1].rotation.x = -w * 0.32; cr.hips.rotation.z = w * 0.05; cr.torso.rotation.x = 0.2; cr.neck.rotation.x = 0.36; cr.arms[0].rotation.x = -w * 0.22; cr.arms[1].rotation.x = w * 0.22; cr.setFace('heavy');
  }
  R.updateMatrixWorld(true); W.ch.copy(cr.neck.getWorldPosition(v3())).add(v3(0, 1.6, 0)); if (pHand) W.hand0 = pHand;
}
function poseBalloon(t) {
  const B = W.bal, E = EV, s = (i) => L(i).start, sway = v3(Math.sin(t * 0.9) * 0.45, 0, Math.sin(t * 0.67 + 1) * 0.4);
  let a; if (t < s(11) - 0.3) { B.visible = false; W.str.visible = false; return; } B.visible = true; W.str.visible = true;
  if (t < E.give) a = W.hand0.clone(); else a = handOf(W.piper, 0).add(v3(0, 0.05, 0));
  const top = a.clone().add(v3(0.1, BALLOON_UP, 0)).add(sway); B.position.copy(top); W.str.setEnds(a, top.clone().add(v3(0, 0.02, 0)));
  // the name turns round to her on that line, so it reads on "her name"
  const rev = smooth(s(22) + 0.1, s(22) + 1.4, t), camBack = t >= s(22) - 0.1; W.balRev = camBack ? rev : 0;
}

// ---- rig, lights ----
function rig() {
  W.pl = []; for (let i = 0; i < 8; i++) { const l = new THREE.PointLight('#ffffff', 0, 30, 1.6); ctx.scene.add(l); W.pl.push(l); }
  const s = new THREE.SpotLight('#ffffff', 0, 90, 0.7, 0.75, 1.0); s.castShadow = true; s.shadow.mapSize.set(1536, 1536); s.shadow.bias = -0.0006; s.shadow.normalBias = 0.05; ctx.scene.add(s); ctx.scene.add(s.target); W.key = s;
}
const setL = (i, p, col, I, dist) => { const l = W.pl[i]; l.position.copy(p); l.color.set(col); l.intensity = I; l.distance = dist; };
const SICK = '#d6e6a8', WARM = '#ffd7a2';
function lights(zone, t) {
  W.pl.forEach((l) => { l.intensity = 0; }); W.key.intensity = 0; const fl = 0.97 + noise1(t * 11) * 0.05, lv = W.level(t), key = (p, tg, col, I, ang = 0.7, dist = 90) => { W.key.position.copy(p); W.key.target.position.copy(tg); W.key.color.set(col); W.key.intensity = I * fl; W.key.angle = ang; W.key.distance = dist; }, P0 = W.piper.root.position;
  const lit = t >= EV.boothOn ? 1 : 0;
  // the booth is the one practical that stays on
  setL(0, BOOTH.clone().add(v3(0, 9, -7)), WARM, 120 * lit, 34); setL(1, BOOTH.clone().add(v3(0, 9, 7)), WARM, 110 * lit, 34);
  if (zone === 'street') { key(v3(-2, 22, 40), v3(0, 3, 27), '#b9c8b5', 260, 0.6); setL(2, v3(0, 4, 36), '#8ba0b2', 34, 22); setL(3, v3(0, 12, 8), SICK, 80, 50); }
  else if (zone === 'gate') { key(v3(-14, 22, 13), v3(-13, 3, 20), SICK, 300, 0.65); setL(2, v3(-14, 5, 28), '#9fb0a6', 46, 26); setL(3, v3(-4, 8, 14), WARM, 60, 28); setL(4, v3(-14, 13, 26), WARM, 60 * lv, 26); }
  else if (zone === 'midway') { key(P0.clone().add(v3(5, 21, -8)), P0.clone().add(v3(0, 3, 0)), SICK, 320, 0.65); setL(2, v3(-11, 12, 2), SICK, 90, 34); setL(3, v3(11, 12, -6), SICK, 90, 34); setL(4, P0.clone().add(v3(-4, 7, 7)), '#ffe0c0', 70, 22); setL(5, CAR.clone().add(v3(0, 9, 16)), WARM, 130 * lv + 20, 44); }
  else if (zone === 'carousel') { key(P0.clone().add(v3(-8, 22, 7)), P0.clone().add(v3(0, 4, -8)), SICK, 300, 0.75); setL(2, CAR.clone().add(v3(0, 8, 0)), WARM, 240 * lv + 16, 34); setL(3, CAR.clone().add(v3(15, 7, 15)), WARM, 150 * lv + 14, 42); setL(4, CAR.clone().add(v3(-15, 7, 15)), WARM, 150 * lv + 14, 42); setL(5, P0.clone().add(v3(4, 7, 9)), '#ffe0c0', 90, 26); setL(6, v3(-2, 11, -14), SICK, 70, 30); setL(7, W.ch.clone().add(v3(4, 3, 9)), '#dfe9ff', 54, 26); }
  else if (zone === 'wheel') { const g = gondolaAt(W.hero, t); key(g.clone().add(v3(6, 18, 18)), g.clone().add(v3(0, -5, 0)), SICK, 260, 0.6); setL(2, g.clone().add(v3(0, -3, 8)), WARM, 110, 20); setL(3, g.clone().add(v3(-7, -2, 3)), '#e1b6ff', 40, 18); setL(4, g.clone().add(v3(7, -2, 3)), '#b6e1ff', 40, 18); setL(5, WHEEL.clone().add(v3(0, 42, 12)), WARM, 200 * lv, 70); setL(6, WHEEL.clone().add(v3(0, 6, 24)), SICK, 90, 40); }
  else if (zone === 'exit') { key(v3(16, 22, 14), v3(13, 3, 26), SICK, 300, 0.65); setL(2, v3(13, 6, 34), '#9fb0a6', 60, 30); setL(3, v3(6, 7, 18), WARM, 70, 26); setL(4, P0.clone().add(v3(-3, 7, -4)), '#ffe0c0', 70, 22); }
  else if (zone === 'booth') { key(P0.clone().add(v3(-6, 18, -9)), P0.clone().add(v3(0, 3, 0)), '#b9c8b5', 220, 0.55); setL(2, BOOTH.clone().add(v3(1, 7, -5.5)), WARM, 150, 24); setL(3, P0.clone().add(v3(3, 6, -9)), '#cfe0d0', 56, 26); }
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, Sx = [], add = (name, t0, f, zone) => Sx.push({ name, zone, t0: () => t0, f, t1: () => 0 });
  const eh = () => W.eh, ch = () => W.ch, pr = () => W.piper.root.position, H = (c) => c.neck.getWorldPosition(v3()).add(v3(0, 0.75, 0));
  const dd = wheelDirs();
  add('open', 0, (u) => ({ pos: lp3(v3(1.2, 6.2, 47), v3(0.8, 6.1, 41.5), easeInOut(u)), look: v3(0.5, 7.2, 4), fov: 50 }), 'street');
  add('won', s(1) - 0.06, (u) => ({ pos: lp3(v3(-22, 2.4, -46), v3(-21, 3.2, -43), easeOut(u)), look: v3(-36, 50, -78), fov: 74 }), 'wheel');
  add('wheel', s(2) - 0.06, (u) => ({ pos: lp3(v3(-26, 3.5, -30), v3(-23, 4.5, -32), easeInOut(u)), look: v3(-35, 42 + u * 4, -78), fov: 72 }), 'midway');
  add('car', s(3) - 0.06, (u) => ({ pos: lp3(v3(8.5, 5.6, -8), v3(5, 5.2, -9), easeInOut(u)), look: v3(0, 8.8, -36), fov: 66 }), 'carousel');
  add('booth', s(4) - 0.06, (u) => ({ pos: lp3(v3(-7.5, 3.2, 24.2), v3(-5.2, 3.8, 24.4), easeInOut(u)), look: v3(0, 9.2, 14), fov: 66 }), 'gate');
  add('theo', s(5) - 0.06, (u) => ({ pos: lp3(v3(8.4, 4.3, 18.2), v3(7.2, 4.1, 18.9), easeInOut(u)), look: v3(0.3, 3.2, 27.6), fov: 56 }), 'street');
  add('gate', s(6) - 0.08, (u) => ({ pos: lp3(v3(-3.5, 4.8, 1.5), v3(-4.2, 4.6, 3.2), easeInOut(u)), look: v3(-13.4, 8.0, 30), fov: 62 }), 'gate');
  add('hand', s(7) - 0.08, (u) => ({ pos: lp3(v3(-11.5, 5.0, 11.5), v3(-11.6, 4.7, 12.6), easeInOut(u)), look: v3(-12.1, 3.3, 19.5), fov: 56 }), 'gate');
  add('late', s(8) - 0.06, (u) => { const h = H(W.ticket); return { pos: lp3(h.clone().add(v3(-3.8, -1.0, 3.6)), h.clone().add(v3(-3.4, -1.0, 3.3)), u), look: h.clone().add(v3(0, -0.7, 0)), fov: 46 }; }, 'gate');
  add('mid', s(9) - 0.06, (u) => { const q = pr(); return { pos: lp3(v3(2.2, 4.4, -3), v3(1.6, 4.4, -3.6), u), look: q.clone().add(v3(0, 2.6, 0)), fov: 58 }; }, 'midway');
  add('rides', s(9) + 1.35, (u) => ({ pos: lp3(v3(11, 3.8, -13), v3(12, 4.0, -15.5), easeInOut(u)), look: v3(38, 11 + u * 2, -44), fov: 66 }), 'midway');
  add('seller', s(10) - 0.08, (u) => ({ pos: lp3(v3(0.7, 3.4, 1.9), v3(1.1, 3.5, 1.3), u), look: v3(5.9, 5.3, -2.2), fov: 62 }), 'midway');
  add('rev', s(11) - 0.06, (u) => ({ pos: lp3(v3(5.2, 5.4, -6.5), v3(4.6, 5.3, -9.2), easeInOut(u)), look: v3(-0.5, 7.4, -30), fov: 64 }), 'carousel');
  add('cr1', s(11) + 1.75, (u) => { const c = ch(); return { pos: lp3(v3(-6.4, 5.4, -9.8), v3(-5.4, 5.4, -11.0), easeInOut(u)), look: c.clone().add(v3(0, -3.0, 0)), fov: 52 }; }, 'carousel');
  add('bal', s(12) - 0.05, (u) => { const b = W.bal.position; return { pos: b.clone().add(v3(-3.4 + u * 0.8, -1.2 - u * 0.3, 10.2)), look: b.clone().add(v3(-2.6, -1.6, 0)), fov: 56 }; }, 'carousel');
  add('turn', s(13) - 0.06, (u) => { const c = ch(); return { pos: lp3(c.clone().add(v3(2.4, -1.2, 20)), c.clone().add(v3(1.6, -1.2, 18.5)), u), look: c.clone().add(v3(0.6, -1.4, 0)), fov: 50 }; }, 'carousel');
  add('point', s(13) + 1.5, (u) => ({ pos: lp3(v3(5.2, 3.2, -7.2), v3(4.2, 3.4, -7.8), easeInOut(u)), look: v3(-4, 12, -36), fov: 72 }), 'carousel');
  add('boy', s(14) - 0.06, (u) => ({ pos: lp3(v3(-1.6, 3.8, -2.2), v3(-1.8, 3.7, -3.0), u), look: v3(-2.3, 2.6, -14.5), fov: 58 }), 'carousel');
  add('seat', s(15) - 0.06, (u, t) => { const g = gondolaAt(W.hero, t), { x, z } = dd; return { pos: g.clone().addScaledVector(x, -5.6 + u * 0.5).addScaledVector(z, 0.9 - u * 0.5).add(v3(0, -3.6, 0)), look: g.clone().addScaledVector(x, 2.2).add(v3(0, -7.9, 0)), fov: 52 }; }, 'wheel');
  add('seat2', s(16) - 0.06, (u, t) => { const g = gondolaAt(W.hero, t), { x, z } = dd; return { pos: g.clone().addScaledVector(x, 5.6 - u * 0.5).addScaledVector(z, -0.9 + u * 0.5).add(v3(0, -3.6, 0)), look: g.clone().addScaledVector(x, -2.2).add(v3(0, -7.9, 0)), fov: 52 }; }, 'wheel');
  add('stop', s(17) - 0.06, (u) => ({ pos: lp3(v3(2.8, 4.7, -22.0), v3(3.3, 4.6, -22.0), u), look: v3(8.4, 3.7, -18.0), fov: 58 }), 'carousel');
  add('pa', s(18) - 0.06, (u) => ({ pos: lp3(v3(3.2, 7.6, -8.2), v3(3.8, 7.9, -8.8), u), look: v3(9.3, 14.6, -13.2), fov: 44 }), 'carousel');
  add('tools', s(19) - 0.06, (u) => ({ pos: lp3(v3(-2.2, 2.2, 10.5), v3(-2.8, 2.3, 9.8), u), look: v3(-4.2, 1.8, 4.5), fov: 62 }), 'midway');
  add('file', s(19) + 0.95, (u) => ({ pos: lp3(v3(-9, 21, -3), v3(-8, 22, -2), u), look: v3(5.5, 1.4, 6), fov: 64 }), 'midway');
  add('stand', s(20) - 0.08, (u) => { const c = ch(); const r = W.cr.root.rotation.y, f = v3(Math.sin(r), 0, Math.cos(r)), sd = v3(f.z, 0, -f.x); return { pos: c.clone().addScaledVector(f, 13 - u).addScaledVector(sd, 3.4).add(v3(0, -3.6, 0)), look: c.clone().add(v3(0, -3.6, 0)), fov: 62 }; }, 'carousel');
  add('give', s(20) + 0.7, (u) => ({ pos: lp3(v3(17, 4.6, -16.3), v3(16.2, 4.6, -16.4), u), look: v3(0.8, 4.6, -16.5), fov: 58 }), 'carousel');
  add('givec', s(21) - 0.28, (u) => ({ pos: lp3(v3(6.6, 4.8, -21.2), v3(6.2, 4.8, -21.0), u), look: v3(1.6, 5.6, -13.5), fov: 62 }), 'carousel');
  add('leave', s(21) + 0.65, (u) => { const q = pr(); return { pos: lp3(v3(-1.8, 5.2, 7.5), v3(-1.8, 5.1, 6.4), u), look: v3(-1.9, 3.6, -10), fov: 62 }; }, 'midway');
  add('exit', s(21) + 2.02, (u) => ({ pos: lp3(v3(6.5, 5.6, 8.5), v3(7.2, 5.2, 9.5), u), look: v3(13.0, 5.2, 26), fov: 58 }), 'exit');
  add('lock', e.slam - 0.32, (u) => ({ pos: lp3(v3(14.8, 5.2, 31.2), v3(15.0, 5.1, 30.6), u), look: v3(15.2, 3.9, 26.3), fov: 54 }), 'exit');
  add('name', s(22) - 0.06, (u) => { const b = W.bal.position.clone(); return { pos: b.clone().add(v3(0, 0.3, -6.2 + u * 0.8)), look: b.clone().add(v3(0, 0.2, 0)), fov: 60 }; }, 'exit');
  add('name2', s(22) + 1.5, (u) => { const b = W.bal.position.clone(), h = eh(); return { pos: h.clone().add(v3(0.6, 0.4, -10.6 + u * 0.4)), look: h.clone().add(v3(1.7, -0.3, 0)), fov: 62 }; }, 'exit');
  add('look', s(23) - 0.06, (u) => { const h = eh(); return { pos: h.clone().add(v3(-1.4, -1.5, -9.8 + u * 0.4)), look: h.clone().add(v3(0.9, -0.2, 0)), fov: 64 }; }, 'exit');
  add('pa2', s(23) + 1.15, (u) => ({ pos: lp3(v3(12.6, 5.5, 20.6), v3(12.8, 5.9, 19.6), u), look: v3(-30, 42, -78), fov: 56 }), 'exit');
  add('off', s(24) - 0.05, (u) => ({ pos: lp3(v3(7, 4.2, -8), v3(5.5, 4.4, -10), u), look: v3(-24, 26, -74), fov: 72 }), 'midway');
  add('prints', s(25) - 0.05, (u) => ({ pos: lp3(v3(5.2, 3.0, 7.4), v3(4.8, 2.9, 6.2), easeInOut(u)), look: v3(-1.5, 0.4, -14), fov: 60 }), 'booth');
  add('fr', s(25) + 1.3, (u) => { const h = eh(); return { pos: h.clone().add(v3(0.8, -0.65, -7.2 + u * 0.8)), look: h.clone().add(v3(0, -1.3, 0)), fov: 56 }; }, 'booth');
  add('sign', s(26) - 0.04, (u) => ({ pos: lp3(v3(-3.2, 4.4, -2.5), v3(-2.2, 5.0, -0.9), easeInOut(u)), look: v3(0, 13.4, 14), fov: 44 }), 'booth');
  add('final', e.flip + 0.75, (u) => ({ pos: lp3(v3(1.9, 2.9, -2.6), v3(1.8, 2.8, -1.6), easeInOut(u)), look: v3(2.7, 8.0, 14), fov: 66 }), 'booth');
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
const shotName = (t) => shotAt(W.shots, t).name;
const zoneOf = (nm) => { const x = W.shots.find((q) => q.name === nm); return x ? x.zone : 'midway'; };

function renderAt(t) {
  const E = EV, s = (i) => L(i).start;
  applyEnv(ctx, PARK);
  const lv = W.level(t);
  W.wheel.update(W.wheelRot(t), t, W.spd(t) * 0.8 + 0.4, lv); W.car.update(W.spin(t), lv); W.tea.update(W.teaRot(t)); W.swing.update(W.swingRot(t), W.spd(t), lv); W.coast.update(W.coasterU(t));
  W.arch.level(lv); W.arch.set(t < s(5) + 3 ? 0 : 1); W.exit.set(t < E.slam ? 1 : 1 - clamp((t - E.slam) / 0.14), t > E.slam + 0.3 ? clamp((t - E.slam - 0.3) / 0.25) : 0);
  W.lampMat.forEach((m) => {}); W.bulbs.level(lv * 0.9);
  // booth: lights on, with a stutter; the sign goes CLOSED; at the end, OPEN
  const bk = t < E.boothOn ? 0 : (t < E.boothOn + 0.25 ? (Math.sin(t * 70) > 0 ? 1 : 0.15) : 1); W.booth.setLit(bk);
  let cl = t < E.boothOn + 0.1 ? 0 : (t < E.boothOn + 0.35 ? (Math.sin(t * 60) > 0 ? 1 : 0.2) : 1), op = 0;
  if (t >= E.flip) { const a = t - E.flip; cl = a < 0.08 ? 0 : 0; op = a < 0.34 ? (Math.sin(a * 62) > -0.2 ? 1 : 0.1) : 1; } W.booth.setSign(cl, op);
  poseTheo(t); poseTicket(t); poseSeller(t); poseSweeper(t); poseOperator(t); poseBoy(t);
  // the pink ticket passes from hand to hand
  W.tkm.visible = t > s(7) - 0.05 && t < s(9) + 0.3; if (W.tkm.visible) { const a = t < E.tk ? handOf(W.ticket, 0) : handOf(W.piper, 0); W.tkm.position.copy(a).add(v3((t < E.tk ? -0.8 : 0.8) * (1 - smooth(E.tk + 0.2, E.tk + 0.6, t)), -0.05, 0.04)); W.tkm.rotation.set(0.4, 0.3, 0.1); }
  if (t > s(21) + 1.95) W.staff.forEach((c) => { c.root.visible = false; });
  posePiper(t); poseCreature(t); poseBalloon(t);
  W.prints.update(t, ctx.camera);
  W.air.update(t);
  const sh0 = shotAt(W.shots, t); lights(zoneOf(sh0.name), t);
  ctx.scene.updateMatrixWorld(true);
  let sh = shotAt(W.shots, t), jolt = 0;
  { const dq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgchar'); if (dq) { const q = dq.split(','), c = q[0] === 'cr' ? W.cr : W[q[0]], hp = new THREE.Vector3(); if (q[0] === 'cr') c.neck.getWorldPosition(hp).add(v3(0, 1.1, 0)); else c.head.getWorldPosition(hp); const ry = (q[0] === 'cr' ? c.root.rotation.y : c.root.rotation.y), f = ry + (+q[1]) * Math.PI / 180, dist = q[0] === 'cr' ? 8 : 3.4; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +q[2], Math.cos(f) * dist)), look: hp.clone().add(v3(0, 0.05, 0)), fov: 40 }; } }
  { const cq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgcam'); if (cq) { const q = cq.split(',').map(Number); sh = { ...sh, pos: v3(q[0], q[1], q[2]), look: v3(q[3], q[4], q[5]), fov: q[6] || 50 }; } }
  { const B = W.bal, d = sh.pos.clone().sub(B.position), away = Math.atan2(d.x, d.z); B.body.rotation.y = away + (W.balRev || 0) * Math.PI + Math.sin(t * 0.7) * 0.12 * (1 - 0.5 * (W.balRev || 0)); }
  if (t > E.slam && t < E.slam + 0.2) jolt = 0.45 * (1 - (t - E.slam) / 0.2);
  frame(ctx, t, sh, { steady: true, shake: jolt, shadowSpan: 46, shadows: true, black: 0 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep30', { look: 'pro', avatars: Object.values(AV) }); L = ctx.L; EV = events(); drivers();
  await loadAlti(['neutral', 'smile', 'surprised', 'shocked', 'scared', 'terrified', 'nervous', 'worried']);
  const { scene, camera } = ctx; camera.far = 1600; camera.near = 0.2; camera.updateProjectionMatrix();
  rig();
  scene.add(parkGround()); scene.add(distantTrees());
  W.wheel = ferrisWheel(); W.wheel.position.copy(WHEEL); W.wheel.rotation.y = WRY; scene.add(W.wheel);
  W.car = carousel(); W.car.position.copy(CAR); scene.add(W.car);
  W.booth = ticketBooth(); W.booth.position.copy(BOOTH); scene.add(W.booth);
  W.arch = parkArch(); W.arch.position.copy(ARCH); scene.add(W.arch);
  W.exit = exitGate(); W.exit.position.copy(EXIT); scene.add(W.exit);
  // fence: from the far side, to the arch, between arch and exit, and on
  for (const [a, b] of [[-140, -22], [-6, 8.5], [17.5, 140]]) { const f = chainFence(b - a); f.position.set((a + b) / 2, 0, 26); scene.add(f); }
  const STALLS = [[-17, 8, 'RING TOSS', [FADED.pink, FADED.cream]], [-17, -5, 'POPCORN', [FADED.mustard, FADED.cream]], [17, 8, 'PRIZES', [FADED.sky, FADED.cream]], [17, -5, 'LUCKY DUCKS', [FADED.mint, FADED.cream]]];
  for (const [x, z, n, c] of STALLS) { const st = midwayStall(n, c); st.position.set(x, 0, z); st.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(st); }
  W.lampMat = []; const LZ = [7, -6]; const pts = []; for (const z of LZ) for (const x of [-11, 11]) { const l = parkLamp(); l.position.set(x, 0, z); scene.add(l); W.lampMat.push(l.mat); } for (const z of LZ) pts.push([v3(-11, 13.4, z), v3(11, 13.4, z)]); for (let i = 0; i < 1; i++) for (const x of [-11, 11]) pts.push([v3(x, 13.4, LZ[i]), v3(x, 13.4, LZ[i + 1])]);
  W.bulbs = stringBulbs(pts); scene.add(W.bulbs);
  W.tea = teaCups(); W.tea.position.set(32, 0, -24); scene.add(W.tea);
  W.swing = swingRide(); W.swing.position.set(46, 0, -68); scene.add(W.swing);
  W.coast = coaster(); W.coast.position.set(44, 0, -130); scene.add(W.coast);
  const pa = paSpeakers(); pa.position.copy(PA); scene.add(pa);
  scene.add(queueRope([v3(-9, 0, -13), v3(-17, 0, -18), v3(-25, 0, -26), v3(-30, 0, -40)]));
  W.lever = controlLever(); W.lever.position.copy(OP).add(v3(Math.sin(OPY) * 2, 0, Math.cos(OPY) * 2)); W.lever.rotation.y = OPY + Math.PI; scene.add(W.lever);
  W.broom = broom(); scene.add(W.broom);
  W.bare = bareStrings(); scene.add(W.bare); W.handS = v3();
  W.tkm = ticketStub(); scene.add(W.tkm); W.tkMid = v3(-11.75, 3.9, 19.5);
  W.bal = balloon('PIPER'); scene.add(W.bal); W.str = stringSeg(); scene.add(W.str); W.hand0 = v3(); W.nameYaw = 0;
  W.cr = blueCreature(); scene.add(W.cr.root); W.creatureStand = v3(0.4, 0, -19.6); W.giveMid = v3(0.45, 4.75, -16.3);
  people(); W.pp = pathPiper();
  // a tub someone is holding, in the hero gondola
  { const g = W.wheel.gondolas[W.hero], tub = popcornTub(); tub.position.set(1.7, g.userData.seatY + 1.1, 1.0); tub.rotation.z = -0.32; g.add(tub); }
  // hundreds of feet: walkers converge on Piper from the midway and round the booth
  { const r = rng(306), P0 = v3(1.8, 0, 9), list = [], t0 = L(25).start - 0.1, END = ctx.dur - 0.5; for (let w = 0; w < 66; w++) { const a = Math.PI * 0.18 + r() * Math.PI * 1.1 + Math.PI * 0.3, d = 15 + r() * 46, p0 = w >= 58 ? v3(-5 + (w - 58) * 1.7, 0, -14 - r() * 7) : v3(P0.x + Math.cos(a) * d * 0.72, 0, P0.z - Math.abs(Math.sin(a) * d)), stop = 3.8 + r() * 6.5, dir = p0.clone().sub(P0).normalize(), end = P0.clone().addScaledVector(dir, stop), L1 = p0.distanceTo(end), sp = 5.6 + r() * 1.8, step = 1.42 + r() * 0.3, n = Math.floor(L1 / step), head = Math.atan2(-dir.x, -dir.z), side = v3(-dir.z, 0, dir.x), tStart = t0 + r() * 0.6; for (let i = 0; i <= n; i++) { const tt = tStart + i * step / sp; if (tt > END) break; const q = p0.clone().lerp(end, i / n).addScaledVector(side, (i % 2 ? 1 : -1) * 0.4); list.push({ x: q.x, z: q.z, ry: head, t0: tt, side: i % 2 }); } } W.prints = shoePrints(list); scene.add(W.prints); W.printN = list.length; }
  const list = { motes: dust(scene, { size: 90, height: 30, centre: v3(0, 0, -6), count: 220, color: '#e4e4c8', amount: 0.14, pointSize: 0.2 }) };
  W.air = atmos(...Object.values(list));
  W.shots = shots();
  window.__ep30 = { W, THREE, ctx };
  return expose(ctx, renderAt, L(26).end + 1.2, EV);
}
