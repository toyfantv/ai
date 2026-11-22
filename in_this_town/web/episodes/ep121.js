// LORE-001 (episode 121): We Lie Down When the Shadow Comes. Every day at noon a wing-shaped shadow crosses a farming village and
// everyone lies flat: anyone still standing "goes up for the view". Weddings are flat, haircuts crooked, babies drop before they walk.
// Today it stops over Wren's house and stays. Mom presses Pip flat; Mrs. Lee says her husband screamed all the way up; Wren remembers
// him waving. A burnt feather longer than the front door drops into the road, the shadow grows, coming down, and Wren looks up:
// a vast bird, its feathers burning, holding the sun off the town. Mr. Lee wasn't screaming, he was calling. Its feet open in the
// street, low enough to reach. "Stay down!" ... I stand up. One, two... up.
// The village is Polyfork low-poly models (engine/shadowtown.js, credits in web/assets/polyfork/LICENCE.md); the light is the
// Ponlai approach (engine/ponlaifx.js: height fog, auto exposure, local tone mapping, LUT grade, heat shimmer, a Ponlai cloud plate).
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DAY } from '../engine/stage.js';
import { jointify } from '../engine/infinitetower.js';
import { FARM } from '../engine/farm_cast.js';
import { wearApron } from '../engine/shufflenight.js';
import { Batch, surf, paint, sign } from '../engine/kit.js';
import { installPonlai } from '../engine/ponlaifx.js';
import { loadPF, village, birdUnder, talon, smoke, dustPuff, strawHat, flatCap, nightcap, pitchfork, scissors, veil, weddingArch, chair, thermos, plates, pillow, lawnSign,
  FH, PORCH, ABARA, CLOCK, GREEN, SHOPS, WELL, leadZ, CHORD, SPAN } from '../engine/shadowtown.js';

const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV, CAP = [];
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';
const AV = { wren: ['farm_lily', 0.82], pip: ['farm_ethan', 0.6], mom: ['farm_classic_mom', 0.95], mrslee: ['farm_grandma', 0.9], mrlee: ['farm_old_man', 0.92], abara: ['farm_grandpa', 0.92],
  bride: ['farm_lily_pink', 0.88], groom: ['farm_bacon_dad_suit', 0.95], officiant: ['farm_principal', 0.92], barber: ['farm_city_man', 0.95], customer: ['farm_jake', 0.9], toddler: ['farm_young_kid', 0.45],
  e0: ['farm_gardener', 0.92], e1: ['farm_fisherman', 0.95], e2: ['farm_baker', 0.9], e3: ['farm_nia_florist', 0.9], e4: ['farm_lumber_joe', 0.97], e5: ['farm_cowboy', 0.95],
  e6: ['farm_barista', 0.92], e7: ['farm_old_school_kid', 0.8], e8: ['farm_city_woman', 0.92], e9: ['farm_marcus', 0.95], e10: ['farm_emma', 0.88], e11: ['farm_daniel', 0.93] };
const EX = ['e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10', 'e11'];

// the noon sun, high and a little south-east; the bird is up this ray from its shadow
const SD = v3(0.25, 0.93, 0.27).normalize();
// where the giant sun disc sits in the climax: just past the bird's trailing edge (south), so it spills round the wing
const SUNV = v3(0.35, 0.62, 0.7).normalize();
const NOON = { ...DAY, ...P({ top: '#3d8fe6', horizon: '#d6ecff', haze: '#e6eef0', sunColor: '#fff3dc', hemiSky: '#d8ecff', hemiGround: '#b59a5a' }), sunDir: SD, sunI: 3.8, sunDisc: 1, hemiI: 0.6, amb: 0.06, envI: 0.15,
  exposure: 1.0, bloom: 0.04, vig: 0, saturation: 1.16, contrast: 1.06, bounce: 0.12, fogNear: 340, fogFar: 2000, stars: 0, moon: 0, win: 0, lamp: 0 };
const HOT = { ...NOON, ...P({ top: '#4a86cc', horizon: '#f4e2bc', haze: '#f1e4c6', sunColor: '#fff0d0', hemiSky: '#e4e2d4', hemiGround: '#a8874e' }), hemiI: 0.55, envI: 0.13, saturation: 1.12 };
const GOLD = { ...NOON, ...P({ top: '#5a7fc0', horizon: '#ffd9a0', haze: '#f6d2a8', sunColor: '#ffe2b8', hemiSky: '#ffe0c0', hemiGround: '#7a5a42' }), sunI: 3.8, hemiI: 0.8, amb: 0.1, envI: 0.25, exposure: 1.02, bloom: 0.14, saturation: 1.1, fogNear: 300, fogFar: 1700 };
const ROOM = { ...NOON, ...P({ top: '#8fb8d8', horizon: '#d8e4ea', haze: '#d8e4ea', hemiSky: '#e8eef2', hemiGround: '#a89a88' }), sunI: 0.1, hemiI: 0.9, amb: 0.35, envI: 0.8, fogNear: 500, fogFar: 1800 };
const mixE = (a, b, k) => { if (k <= 0) return a; if (k >= 1) return b; const o = { ...a }; for (const key of Object.keys(b)) { const x = a[key], y = b[key]; if (typeof x === 'number' && typeof y === 'number') o[key] = lerp(x, y, k); else if (x && x.isColor) o[key] = x.clone().lerp(y, k); else if (x && x.isVector3) o[key] = x.clone().lerp(y, k); } return o; };

const capT = (word, after = 0) => { const c = CAP.find((x) => x.start >= after - 0.01 && x.text.toUpperCase().includes(word)); return c ? c.start : after; };
function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return { open: 0, rise: s(1) + 0.7, wed: s(2), barber: capT('HAIRCUTS', s(2)) - 0.15, halt: s(3) + 1.7, glare: e(4) - 0.6, noon: s(5) + 0.15, cross: capT('TEN', s(5)) - 0.35,
    getup: s(6) + 0.2, drop7: capT('DROP', s(7)) - 0.05, kites: s(8), heat: s(9), fan: capT('MOM', s(9)) - 0.1, step: s(10), flat: s(11) + 2.3, one: s(11), two: s(11) + 1.54,
    still: capT('STILL', s(12)) - 0.3, pool: s(13), whisper: s(14), one13: s(15) + 0.1, rows: s(15) + 1.2, faces: s(16), abara: s(17), edge: s(18), mrslee: s(19), mem1: s(20), gust: s(20) + 0.45,
    hers: s(21), mem2: s(22), drop23: capT('DROPS', s(23)) + 0.25, door: s(24), tips: s(25), grow: s(26) + 0.3, down: capT('COMING', s(26)), flatter: s(27), pip: s(28), dunno: s(29),
    roll: s(30) + 0.3, pov: e(30) + 0.05, pov2: e(30) + 2.9, gold: s(31), sunfill: s(32), burn: s(33), mem3: s(34), mem4: s(35), feet: s(36) - 0.35, open36: capT('OPEN', s(36)) - 0.2,
    stay: s(37), town: s(38), stand: s(39) + 0.05, reach: s(40), up: s(40) + 2.31, end: ctx.dur };
}

// ---- helpers (from Remakes 11-14) ----
const armLen = (c) => { if (!c._alen) { c.reset(); const r = c.root.rotation.clone(), p = c.root.position.clone(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3(); c.arms[0].traverse((o) => { if (o.isMesh && !o.userData.worn) bx.expandByObject(o); }); c._alen = sh.y - bx.min.y - 0.12 * (c.spec.scale || 1); c.root.rotation.copy(r); c.root.position.copy(p); c.root.updateMatrixWorld(true); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.arms[side].localToWorld(v3(0, -armLen(c) / s, 0.1)); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.quaternion.identity(); c.root.scale.set(1, 1, 1); c.head.rotation.set(0, 0, 0); c.arms.forEach((a) => a.quaternion.identity()); c.legs.forEach((l) => l.rotation.set(0, 0, 0)); c.hips.position.y = c.hipY ?? 2; c.torso.rotation.set(0, 0, 0); c.neck.rotation.set(0, 0, 0); }
function place(c, p, yaw) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; }
const HY = (c) => (c.hipY ?? 2) * (c.spec.scale || 1);
function sitAt(c, p, yaw, seatY) { place(c, p, yaw); c.root.position.y = p.y; c.hips.position.y = (c.hipY ?? 2) + (seatY - p.y - HY(c) + 0.12 * (c.spec.scale || 1)) / (c.spec.scale || 1); c.legs.forEach((l, i) => { l.rotation.x = -1.5; if (c.knee) c.knee[i].rotation.x = 1.5; }); c.arms.forEach((a, i) => { a.rotation.x = -0.6; a.rotation.z = (i ? 1 : -1) * 0.1; }); }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const H = (c) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.neck.getWorldPosition(v3()).add(v3(0, 0.8 * s, 0)); };
// the head's centre and facing in any pose (lying included)
const HC = (c) => { c.root.updateMatrixWorld(true); return c.neck.localToWorld(v3(0, 0.8, 0)); };
const FD = (c) => { c.root.updateMatrixWorld(true); return c.head.getWorldDirection(v3()); };
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.closed ? true : o.noBlink ? false : blinkAt(t, ph), viseme: o.viseme, gaze: o.gaze }); }
const talk = (i, t, txt) => (t > L(i).start && t < L(i).end ? visemeAt(txt || L(i).text, L(i).start, L(i).end, t) : undefined);
function lookAtP(c, p, k = 1) { c.root.updateMatrixWorld(true); const n = c.neck.getWorldPosition(v3()), a = wrap(yawTo(n, p) - c.root.rotation.y); c.neck.rotation.y = clamp(a, -1.2, 1.2) * k; c.neck.rotation.x = -Math.atan2(p.y - n.y - 0.6, Math.hypot(p.x - n.x, p.z - n.z)) * 0.6 * k; }
function walkTo(c, a, b, t0, t1, t, speed = 1, kind = 'walk') { const u = clamp((t - t0) / (t1 - t0)); place(c, lp3(a, b, u), yawTo(a, b)); pose(c, u > 0 && u < 1 ? kind : 'idle', t * speed); return u; }
const fwdY = (yaw, d = 1) => v3(Math.sin(yaw) * d, 0, Math.cos(yaw) * d);

// ---- lying flat: q = Qy(yaw) Qx(pi/2) Qy(roll); roll 0 = face down, pi = on the back. The feet stay put, the body falls forward
// (a plank flop) and is lifted onto the surface by its own bounding box, so nothing sinks into boards or road.
const QY = (a) => new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), a), QX = (a) => new THREE.Quaternion().setFromAxisAngle(v3(1, 0, 0), a);
const _bx = new THREE.Box3();
function lie(c, ctr, yaw, o = {}) {
  const k = clamp(o.k ?? 1), roll = o.roll ?? 0, len = HY(c) * 1.42, y0 = o.y ?? ctr.y;
  rs(c); c.root.visible = true;
  const feet = ctr.clone().sub(fwdY(yaw, len * 0.5)); feet.y = y0;
  const flat = QY(yaw).multiply(QX(Math.PI / 2)).multiply(QY(roll));
  c.root.position.copy(feet); c.root.quaternion.copy(QY(yaw)).slerp(flat, k);
  const au = (o.armsUp ?? (roll < 1.5 ? 1 : 0.3)) * k;
  c.arms.forEach((a, i) => { a.rotation.x = -2.75 * au; a.rotation.z = (i ? 1 : -1) * (0.42 * au + 0.06); });
  c.legs.forEach((l, i) => { l.rotation.z = (i ? 1 : -1) * 0.06 * k; });
  if (o.turn) c.neck.rotation.y = o.turn * k;
  c.root.updateMatrixWorld(true); _bx.setFromObject(c.root); c.root.position.y += y0 - _bx.min.y;
}
// turn a lying head to face a point (picks the side that faces it)
function turnTo(c, p, amt = 1.2) {
  let best = 0, bd = -2; for (const s of [-1, 1]) { c.neck.rotation.y = s * amt; const d = FD(c).dot(p.clone().sub(HC(c)).normalize()); if (d > bd) { bd = d; best = s; } }
  c.neck.rotation.y = best * amt; c.root.updateMatrixWorld(true);
}
// a standing figure lifted up off the ground (arms up, legs dangling)
function rising(c, p, yaw, h, t, wave = 0) {
  place(c, p.clone().add(v3(0, h, 0)), yaw); pose(c, 'idle', t);
  c.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 3 + i * 2) * 0.25; });
  const w = Math.sin(t * 9) * 0.5 * wave;
  c.arms.forEach((a, i) => { a.rotation.x = -2.6 - (i ? w : 0); a.rotation.z = (i ? 1 : -1) * (0.55 + (i ? w * 0.6 : 0)); });
}

// ---- the shadow: where its body is (a ground point) and its size, per shot ----
const HALT = v3(FH.x, 0, -8);       // it stops with its body over our house (centre a little toward the road)
const MEM = v3(-100, 0, -4);        // last spring, over Mr. Lee
const AWAY = v3(0, 0, 4000);
function shadowFor(key, t) {
  const E = EV, s = (i) => L(i).start;
  switch (key) {
    case 'open': return v3(-40, 0, 75 + 70 * (1.75 - t));
    case 'rise': return v3(-40, 0, 20);
    case 'wed': return v3(GREEN.x, 0, GREEN.z - 40);
    case 'roof': return v3(HALT.x, 0, lerp(HALT.z + 430, HALT.z, easeOut(clamp((t - s(3) + 0.25) / 1.95))));
    case 'cross': return v3(-10, 0, lerp(620, -760, clamp((t - E.cross) / 2.6)));
    case 'getup': return v3(-30, 0, -260 - 70 * (t - s(6)));
    case 'toddler': return v3(GREEN.x, 0, GREEN.z + 4 + 75 + 60 * (E.drop7 + 0.15 - t));
    case 'clock': case 'kites': case 'heat': return AWAY;
    case 'step': case 'flat': { const tf = E.flat, z0 = 24 + 75; return v3(HALT.x, 0, t < tf ? z0 + 62 * (tf - t) : lerp(z0, HALT.z, easeOut(clamp((t - tf) / 2.6)))); }
    case 'mem': return MEM;
    default: return HALT;
  }
}
const growK = (t) => 1 + 0.35 * smooth(EV.grow, EV.grow + 2.8, t);
// the leading (north) edge of the halted shadow at x: the smoke line
const edgeZ = (x, c = HALT, k = 1) => { const u = Math.min(1, Math.abs(x - c.x) / (SPAN / 2 * k)); return c.z + leadZ(u) * k; };

// ---- places on the porch (boards at PORCH.top) and in the yard ----
const PY = PORCH.top;
const WX = 186.5, PX = 181.6;   // where Wren and Pip sit on the porch edge (clear of the step, x 170.5-179.5)
const SPOT = { wren: v3(WX, PY, 24.6), pip: v3(PX, PY, 24.2), mom: v3(175, PY, 24.8), mrslee: v3(190.5, 0, 13.2) };
const FOOT = [{ p: v3(184, 0, -21), yaw: 0.05 }, { p: v3(214, 0, -16), yaw: -0.14 }];
const FEATHER = v3(140, 0, 6);
// the town lying in the road and on the green (centre, yaw)
const ROWS = [];
{ const R = rng(31); const xs = [62, 74, 87, 99, 111, 250, 263, -96, -84, -70, -150, -132];
  xs.forEach((x, i) => ROWS.push({ k: EX[i], p: v3(x + (R() - 0.5) * 3, 0, (i % 2 ? -1 : 1) * (2.5 + R() * 3.5)), yaw: (i % 3 === 0 ? 0 : i % 3 === 1 ? Math.PI : Math.PI / 2) + (R() - 0.5) * 0.5 })); }

// ---- people ----
function people() {
  for (const [k, [avatar, scale]] of Object.entries(AV)) {
    const c = makeCharacter({ avatar, alti: true, skin: skinOf(avatar), caustic: false, scale });
    ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c.key = k;
    c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c);
    W[k] = c;
  }
  const onHead = (c, g, y = -0.05, o = {}) => { rs(c); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const bx = new THREE.Box3(); c.head.traverse((m) => { if (m.isMesh && !m.userData.worn) bx.expandByObject(m); }); const top = c.head.worldToLocal(v3(0, bx.max.y, 0)).y; g.position.set(o.x || 0, top + y, o.z || 0); g.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0); g.scale.setScalar((o.s || 1) / (c.spec.scale || 1)); g.traverse((m) => { m.userData.worn = true; if (m.isMesh) m.castShadow = true; }); c.head.add(g); return g; };
  W.hatPip = onHead(W.pip, strawHat(), -0.35, { s: 0.95 });
  W.capLee = onHead(W.mrlee, flatCap(), -0.25, { z: 0.1, s: 1.05 });
  W.ncap = onHead(W.abara, nightcap(), -0.5, { s: 0.9 });
  W.veil = veil(); W.veil.scale.setScalar(0.55 / (W.bride.spec.scale || 1)); onHead(W.bride, W.veil, -0.4, { z: -0.7, rx: 0.15, s: 0.55 });
  wearApron(W.mom);
  W.all = Object.keys(AV).map((k) => W[k]);
}
function hideAll() { W.all.forEach((c) => { c.root.visible = false; }); }

// porch family, lying (k 0..1 for the flop), heads toward the road (yaw PI)
function porchFamily(t, o = {}) {
  const E = EV, k = o.k ?? 1;
  lie(W.wren, SPOT.wren, Math.PI, { k, roll: o.roll ?? 0 });
  lie(W.pip, SPOT.pip, Math.PI, { k });
  lie(W.mom, SPOT.mom, Math.PI, { k: o.kMom ?? k });
  void E;
}
function townLying(t, o = {}) {
  ROWS.forEach((r, i) => {
    if (o.skip && o.skip.includes(r.k)) return;
    const c = W[r.k]; lie(c, r.p, r.yaw, { k: 1, armsUp: i % 2 ? 1 : 0.8 }); if (i % 3 === 1) c.neck.rotation.y = 1.1;
    face(c, 'neutral', t, i * 0.3, { closed: true });
  });
  W.fork.visible = true; W.V.dog.scale.set(3.4 * 1.15, 3.4 * 1.15 * 0.42, 3.4 * 1.15 * 1.1);
}

// ---- L0: the open: the shadow edge sweeps the street; everyone drops ----
function poseOpen(t) {
  const c0 = shadowFor('open', t);
  ['e0', 'e1', 'e2', 'e3', 'e8', 'e9'].forEach((k, i) => {
    const c = W[k], p = v3(-74 + i * 7.5, 0, -6 + (i % 3) * 5.5), yaw = Math.PI + (i % 2 ? 0.3 : -0.25);
    const td = 1.75 - (p.z + 6 - leadZ(Math.abs(p.x - c0.x) / (SPAN / 2)) - 75) / 70;   // the edge is 6 units off them
    const kk = smooth(td - 0.05, td + 0.3, t);
    lie(c, p, yaw, { k: kk }); if (kk < 0.05) { place(c, p, yaw); pose(c, i % 2 ? 'walk' : 'idle', t + i); }
    face(c, kk > 0.4 ? 'neutral' : 'neutral', t, i * 0.3, { closed: kk > 0.6 });
  });
}
// ---- L1: a man who stayed standing goes up ----
function poseRise(t) {
  const E = EV, c = W.e5, p = v3(-40, 0, 2), h = 60 * easeIn(clamp((t - E.rise) / 2.2));
  rising(c, p, 0.4, h, t, 0); face(c, h > 1 ? 'shocked' : 'nervous', t, 0.2, { noBlink: h > 1 });
  ['e0', 'e1', 'e2'].forEach((k, i) => { lie(W[k], v3(-52 + i * 13, 0, -4 + i * 3), 0.3 + i, { k: 1 }); face(W[k], 'neutral', t, i, { closed: true }); });
}
// ---- L2: a flat wedding; a flat haircut ----
function poseWed(t) {
  const G = GREEN, R = W.arch.position;
  lie(W.bride, v3(G.x - 2.6, 0, G.z + 3), Math.PI, { k: 1, armsUp: 0.3 }); turnTo(W.bride, HC(W.groom).add(v3(0, 0, 0)));
  lie(W.groom, v3(G.x + 2.6, 0, G.z + 3), Math.PI, { k: 1, armsUp: 0.3 }); turnTo(W.groom, HC(W.bride));
  face(W.bride, 'happy', t, 0.2); face(W.groom, 'smirk', t, 0.6);
  aimArm(W.groom, 1, HC(W.bride).add(v3(0.6, -0.4, 1.2)), 1);
  lie(W.officiant, v3(G.x, 0, R.z - 4.5), 0, { k: 1, armsUp: 0.2 }); turnTo(W.officiant, HC(W.bride)); face(W.officiant, 'neutral', t, 0.5, { viseme: visemeAt('do you take this woman', L(2).start, L(2).start + 1.4, t) });
  ['e8', 'e10', 'e6'].forEach((k, i) => { lie(W[k], v3(G.x - 10 + i * 10, 0, G.z + 10 + (i % 2) * 2), Math.PI + (i - 1) * 0.3, { k: 1 }); face(W[k], 'happy', t, i, { closed: i === 1 }); });
}
function poseBarber(t) {
  const B = W.barberRoom.position, c = W.customer, b = W.barber;
  lie(c, v3(B.x, 0.4, B.z + 1), -Math.PI / 2, { k: 1, armsUp: 0 }); c.neck.rotation.y = 0.9; face(c, 'nervous', t, 0.4);
  lie(b, v3(B.x - 1.2, 0.4, B.z - 4.6), -Math.PI / 2 + 0.25, { k: 1, armsUp: 0 }); turnTo(b, HC(c)); face(b, 'focused', t, 0.2);
  const hp = HC(c).add(v3(-0.6, 0.6, 0)); aimArm(b, 1, hp.clone().add(v3(Math.sin(t * 14) * 0.3, 0.3, 0)), 1);
  W.sciss.visible = true; W.sciss.position.copy(handOf(b, 1)); W.sciss.rotation.set(Math.PI / 2, 0, Math.sin(t * 28) * 0.4);
}
// ---- L5-L9: ordinary noons ----
function poseCross(t) {
  townLying(t, {}); W.fork.visible = false; W.V.dog.scale.setScalar(3.4 * 1.15);
}
function poseGetUp(t) {
  const E = EV;
  [['e1', v3(-50, 0, 3), Math.PI], ['e2', v3(-44, 0, -4), 0.4], ['e9', v3(-38, 0, 2), -2.6]].forEach(([k, p, yaw], i) => {
    const kk = 1 - smooth(E.getup + i * 0.35, E.getup + i * 0.35 + 0.7, t), c = W[k];
    lie(c, p, yaw, { k: kk }); if (kk < 0.02) { place(c, p.clone().add(fwdY(yaw, -HY(c) * 0.71)), yaw); pose(c, 'idle', t + i); if (i === 1) { aimArm(c, 1, H(c).add(v3(1.5, 3, 0.5)), smooth(E.getup + 1.4, E.getup + 1.7, t)); } }
    face(c, i === 1 ? 'grin' : 'happy', t, i);
  });
}
function poseToddler(t) {
  const E = EV, G = GREEN, tod = W.toddler, ad = W.e3, p = v3(G.x + 18, 0, G.z - 12);
  W.blanket.visible = true; W.blanket.position.set(p.x, 0.06, p.z);
  const kt = smooth(E.drop7, E.drop7 + 0.22, t);
  if (kt <= 0) { sitAt(tod, p, -0.4, 0.06 + 0.5); face(tod, 'happy', t, 0.1); } else { lie(tod, p.clone().add(v3(0, 0.08, 0)), -0.4, { k: kt }); face(tod, 'neutral', t, 0.2, { closed: kt > 0.8 }); }
  const ka = smooth(E.drop7 + 0.55, E.drop7 + 0.95, t), pa = v3(G.x + 23, 0, G.z - 8);
  lie(ad, pa, -1.0, { k: ka }); if (ka < 0.02) { place(ad, pa.clone().add(fwdY(-1.0, -HY(ad) * 0.71)), -1.0); pose(ad, 'idle', t); lookAtP(ad, HC(tod), 0.7); }
  face(ad, ka > 0 ? 'nervous' : 'happy', t, 0.5);
}
function poseKites(t) {
  const c = W.e7, p = v3(SHOPS.x + 4, 0, SHOPS.z + 23); place(c, p, Math.PI); pose(c, 'idle', t); lookAtP(c, W.nokite.position.clone().add(v3(0, 3, 0)), 0.8); face(c, 'sad', t, 0.3);
}
function poseHeat(t) {
  const E = EV, m = W.mom; place(m, v3(176, PY, 22.6), Math.PI - 0.2); pose(m, 'idle', t);
  const k = smooth(E.fan - 0.2, E.fan + 0.2, t); aimArm(m, 0, H(m).add(v3(-0.4 + Math.sin(t * 13) * 0.35, -0.25, -0.9)), k);
  face(m, 'neutral', t, 0.4, { closed: k > 0 && Math.sin(t * 2) > 0.6 });
  // Wren and Pip by the well, squinting in the heat
  place(W.wren, v3(WELL.x + 7.5, 0, WELL.z - 5.0), Math.PI * 0.85); pose(W.wren, 'idle', t); face(W.wren, 'nervous', t, 0.3); aimArm(W.wren, 1, H(W.wren).add(v3(0.3, 0.5, -0.9)), 1);
  place(W.pip, v3(WELL.x + 3.0, 0, WELL.z - 6.5), Math.PI * 0.95); pose(W.pip, 'idle', t); face(W.pip, 'sad', t, 0.6);
}
// ---- L10-L12: today ----
function poseStep(t) {
  sitAt(W.wren, v3(WX, 0, 19.8), Math.PI, PY); sitAt(W.pip, v3(PX, 0, 19.8), Math.PI, PY);
  face(W.wren, 'happy', t, 0.3); lookAtP(W.wren, HC(W.pip), 0.7); face(W.pip, 'happy', t, 0.7); lookAtP(W.pip, HC(W.wren), 0.6);
  place(W.mom, v3(175, PY, 26), Math.PI + 0.3); pose(W.mom, 'idle', t); face(W.mom, 'neutral', t, 0.1);
}
function poseFlat(t) {
  const E = EV, k = smooth(E.flat - 0.05, E.flat + 0.28, t), kp = smooth(E.flat + 0.05, E.flat + 0.38, t);
  if (k <= 0) { sitAt(W.wren, v3(WX, 0, 19.8), Math.PI, PY); } else lie(W.wren, lp3(v3(WX, PY, 21.6), SPOT.wren, k), Math.PI, { k, y: PY });
  if (kp <= 0) { sitAt(W.pip, v3(PX, 0, 19.8), Math.PI, PY); } else lie(W.pip, lp3(v3(PX, PY, 21.2), SPOT.pip, kp), Math.PI, { k: kp, y: PY });
  // she counts on her fingers over his head
  if (k <= 0) { const f = t > E.two ? 2 : t > E.one ? 1 : 0; aimArm(W.wren, 1, HC(W.pip).add(v3(0.4, 0.6 + f * 0.25, -1.0)), smooth(E.one - 0.3, E.one, t)); lookAtP(W.wren, HC(W.pip), 0.7); lookAtP(W.pip, HC(W.wren), 0.5); }
  face(W.wren, k > 0.5 ? 'neutral' : 'focused', t, 0.3, { closed: k > 0.7 && k < 1 }); face(W.pip, kp > 0.5 ? 'nervous' : 'happy', t, 0.6);
  const km = smooth(E.flat + 0.18, E.flat + 0.5, t);
  if (km <= 0) { place(W.mom, v3(175, PY, 26), Math.PI + 0.3); pose(W.mom, 'idle', t); } else lie(W.mom, SPOT.mom, Math.PI, { k: km }); face(W.mom, 'nervous', t, 0.1);
  if (k >= 1) turnTo(W.wren, HC(W.pip)); if (kp >= 1) turnTo(W.pip, HC(W.wren));
}
function porchHold(t, o = {}) {
  porchFamily(t, o);
  if (!o.noTurn) { turnTo(W.wren, HC(W.pip)); turnTo(W.pip, HC(W.wren)); turnTo(W.mom, HC(W.pip)); }
  face(W.wren, o.wf || 'neutral', t, 0.3); face(W.pip, o.pf || 'nervous', t, 0.6); face(W.mom, o.mf || 'nervous', t, 0.1, { viseme: o.mv });
  lie(W.mrslee, SPOT.mrslee, 0, { k: 1, armsUp: 0.6 }); turnTo(W.mrslee, HC(W.wren)); face(W.mrslee, 'neutral', t, 0.5, { closed: true, viseme: o.lv });
}
function poseAbara(t) {
  const A = ABARA, c = W.abara; lie(c, v3(A.x, 0.8, A.z + 3), 0.4, { k: 1, roll: Math.PI, armsUp: 0, y: 0.05 });
  face(c, 'neutral', t, 0.1, { closed: true, viseme: Math.sin(t * 1.6) > 0.3 ? 'O' : undefined });
  W.ab.visible = true;
}
// ---- L20-22, 34-35: last spring (memory) ----
function poseMem(t, which) {
  const E = EV, c = W.mrlee, p = v3(MEM.x + 4, 0, 2);
  ['e6', 'e7', 'e10'].forEach((k, i) => { lie(W[k], v3(MEM.x - 9 + i * 8, 0, -5 + (i % 2) * 7), Math.PI + (i - 1) * 0.4, { k: 1 }); face(W[k], 'neutral', t, i, { closed: true }); });
  if (which === 1) {   // he stands up to catch his hat
    const kk = 1 - smooth(E.gust + 0.35, E.gust + 1.2, t), u = clamp((t - E.gust) / 3.2);
    W.capFly.visible = t >= E.gust; W.capFly.position.copy(p).add(v3(-2 + u * 10, 1.5 + u * 13 + Math.sin(u * 9) * 1.2, u * 3)); W.capFly.rotation.set(u * 7, u * 11, u * 3);
    lie(c, p, Math.PI / 2, { k: kk }); if (kk < 0.02) { place(c, p.clone().add(fwdY(Math.PI / 2, -HY(c) * 0.71)), Math.PI / 2); pose(c, 'idle', t); aimArm(c, 1, W.capFly.position, smooth(E.gust + 1.1, E.gust + 1.5, t)); lookAtP(c, W.capFly.position, 0.8); }
    face(c, kk > 0.5 ? 'neutral' : 'surprised', t, 0.2, { closed: kk > 0.9 });
    W.capLee.visible = t < E.gust;
  } else {
    const h = which === 2 ? 8 + 55 * easeIn(clamp((t - L(22).start + 0.6) / 3.2)) : which === 3 ? 70 + (t - L(34).start) * 4 : 150;
    rising(c, p.clone().add(fwdY(Math.PI / 2, -HY(c) * 0.71)), which === 3 ? -0.66 : 0.2, h, t, 1);
    W.capLee.visible = false;
    face(c, which === 3 ? 'happy' : 'happy', t, 0.2, { viseme: which === 3 ? (Math.sin(t * 7) > 0 ? 'O' : 'A') : undefined });
    if (which === 4) EX.slice(0, 5).forEach((k, i) => { rising(W[k], v3(MEM.x - 30 + i * 16, 0, -20 + (i % 2) * 18), i * 1.3, 120 + i * 17 + Math.sin(t + i) * 3, t + i, 1); face(W[k], 'happy', t, i); });
  }
}
// ---- the climax ----
function poseClimax(t, key) {
  const E = EV;
  const roll = key === 'roll' ? Math.PI * easeInOut(clamp((t - E.roll) / 0.9)) : Math.PI;
  porchFamily(t, { roll: key === 'stand' || key === 'reach' ? Math.PI : roll });
  turnTo(W.pip, HC(W.wren)); turnTo(W.mom, HC(W.pip));
  face(W.pip, 'scared', t, 0.6, { closed: true }); face(W.mom, key === 'stay' ? 'scared' : 'nervous', t, 0.1, { closed: key !== 'stay', viseme: talk(37, t) });
  aimArm(W.mom, 0, HC(W.pip).add(v3(0.3, 0.5, 2.2)), 1);
  lie(W.mrslee, SPOT.mrslee, 0, { k: 1, armsUp: 0.6 }); turnTo(W.mrslee, HC(W.wren)); face(W.mrslee, 'neutral', t, 0.5, { closed: true });
  const w = W.wren;
  if (key === 'stand' || key === 'reach') {
    const ks = key === 'stand' ? smooth(E.stand, E.stand + 0.75, t) : 1;
    lie(w, SPOT.wren, Math.PI, { k: 1 - ks, roll: Math.PI });
    if (ks >= 1) { place(w, SPOT.wren.clone().add(fwdY(Math.PI, -HY(w) * 0.71)), Math.PI); pose(w, 'idle', t); lookAtP(w, W.feet[0].tipW, 0.8); }
    if (key === 'reach') aimArm(w, 1, W.feet[0].tipW, smooth(E.reach - 0.2, E.reach + 0.6, t));
    if (key === 'stand' && ks < 1) aimArm(W.mom, 0, HC(w).add(v3(0, 0.3, 1.5)), 1);
    if (key !== 'stand' || ks >= 1) aimArm(W.mom, 0, v3(SPOT.wren.x, PY + 2.5, SPOT.wren.z), 1);
    face(w, 'focused', t, 0.4);
  } else face(w, key === 'roll' ? 'nervous' : 'surprised', t, 0.4, { noBlink: key !== 'roll' });
  if (key === 'flatter') { aimArm(W.mom, 0, HC(W.pip).add(v3(0.5, 0.6, 1.6)), 1); face(W.mom, 'scared', t, 0.1, { viseme: talk(27, t) }); }
  if (key === 'pip' || key === 'dunno' || key === 'flatter') { lie(w, SPOT.wren, Math.PI, { k: 1 }); turnTo(w, HC(W.pip)); face(w, 'nervous', t, 0.3, { viseme: undefined }); face(W.pip, 'scared', t, 0.6, { viseme: talk(28, t) }); }
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = (i) => L(i).end, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  const faceShot = (c, d, up = 0.2, fov = 46, side = 0, dl = -0.5) => { const h = HC(c), f = FD(c), sd = v3(f.z, 0, -f.x).normalize(); return { pos: h.clone().add(f.clone().multiplyScalar(d)).add(sd.multiplyScalar(side)).add(v3(0, up, 0)), look: h.clone().add(v3(0, dl, 0)), fov }; };
  // L0 the open: a high street, the edge sweeping toward us, everyone drops
  add('open', 0, (u) => ({ pos: lp3(v3(-8, 16, 16), v3(-10, 15, 14), easeInOut(u)), look: v3(-58, 0, 0), fov: 60 }));
  // L1 one stayed standing
  add('rise', s(1) - 0.04, (u) => ({ pos: v3(-31, 1.2, 16), look: lp3(v3(-40, 5, 2), v3(-40, 26, 0), easeIn(clamp((u - 0.25) / 0.75))), fov: 60 }));
  // L2 the wedding, the barber
  add('wed', s(2) - 0.04, (u) => ({ pos: lp3(v3(GREEN.x + 1, 24, GREEN.z + 22), v3(GREEN.x, 20, GREEN.z + 18), easeInOut(u)), look: v3(GREEN.x, 0, GREEN.z + 1), fov: 56 }));
  add('barber', E.barber, (u) => { const B = W.barberRoom.position; return { pos: lp3(v3(B.x + 8, 13, B.z + 9), v3(B.x + 7, 12, B.z + 8), easeInOut(u)), look: v3(B.x - 1, 0.5, B.z - 1.5), fov: 56 }; });
  // L3 today it stopped over our house (top down)
  add('roof', s(3) - 0.04, (u) => ({ pos: lp3(v3(FH.x - 4, 210, 44), v3(FH.x - 4, 250, 50), easeInOut(u)), look: v3(FH.x - 4, 0, 14), fov: 52 }));
  // L4 nobody knows what it wants: a tilt up past the porch roof into the glare
  add('tilt', s(4) - 0.04, (u) => ({ pos: v3(186, 2.2, 6), look: lp3(v3(176, 2, 24), v3(176, 60, 70), easeInOut(clamp(u * 1.15))), fov: 62 }));
  // L5 noon; ten breaths then gone
  add('clock', s(5) - 0.04, (u) => { const b = W.V.clock.position; return { pos: lp3(b.clone().add(v3(30, -6, 6)), b.clone().add(v3(25, -5, 4)), u), look: b.clone().add(v3(0, -4, 0)), fov: 46 }; });
  add('cross', E.cross, (u) => ({ pos: lp3(v3(-20, 120, 160), v3(10, 132, 150), easeInOut(u)), look: v3(-10, 0, -10), fov: 62 }));
  // L6 going up for the view
  add('getup', s(6) - 0.04, (u) => ({ pos: lp3(v3(-44, 5.5, 22), v3(-44, 5.8, 19), easeInOut(u)), look: v3(-44, 3.5, -1), fov: 64 }));
  // L7 babies drop first
  add('toddler', s(7) - 0.04, (u) => { const p = v3(GREEN.x + 20, 0, GREEN.z - 10); return { pos: lp3(p.clone().add(v3(-6, 4.2, -9)), p.clone().add(v3(-5, 3.6, -8)), easeInOut(u)), look: p.clone().add(v3(1, 0.6, 1)), fov: 62 }; });
  // L8 no kites
  add('kites', s(8) - 0.04, (u) => ({ pos: lp3(v3(SHOPS.x + 4, 6, SHOPS.z + 36), v3(SHOPS.x + 5, 6.4, SHOPS.z + 33), easeInOut(u)), look: v3(SHOPS.x + 11, 5.5, SHOPS.z + 16), fov: 60 }));
  // L9 hotter (shimmer over the road), Mom fanning on the porch
  add('heat', s(9) - 0.04, (u) => ({ pos: lp3(v3(WELL.x - 14, 2.0, WELL.z - 30), v3(WELL.x - 12, 2.2, WELL.z - 27), easeInOut(u)), look: v3(WELL.x + 4, 3.0, WELL.z - 2), fov: 54 }));
  add('fan', E.fan, (u) => ({ pos: lp3(v3(172, 8.4, 8), v3(173, 8.2, 10), easeInOut(u)), look: v3(176, 6.4, 22.6), fov: 56 }));
  // L10 Pip; I count for him
  add('step', s(10) - 0.04, (u) => ({ pos: lp3(v3(184, 5.0, 4.5), v3(184, 4.8, 7.0), easeInOut(u)), look: v3(184, 3.4, 20), fov: 62 }));
  // L11 one, two, flat
  add('flat', s(11) - 0.04, (u, t) => ({ pos: lp3(v3(184, 4.4, 10.5), v3(184, 6.5, 13.5), smooth(E.flat - 0.1, E.flat + 1.0, t)), look: v3(184, 2.2, 22), fov: 64 }));
  // L12 ten breaths ... still here (her cheek on the boards), then the street under the halted shadow
  add('cheek', s(12) - 0.04, (u) => { const h = HC(W.wren); return { pos: h.clone().add(v3(-2.3 + u * 0.2, 2.5, -0.3)), look: h.clone().add(v3(0, -0.2, 0)), fov: 54 }; });
  add('halt', E.still, (u) => ({ pos: lp3(v3(120, 9, -22), v3(126, 10, -20), easeInOut(u)), look: v3(170, 3, 12), fov: 62 }));
  // L13 the whole town fits inside its shade
  add('pool', s(13) - 0.04, (u) => ({ pos: lp3(v3(60, 260, 330), v3(40, 420, 470), easeInOut(u)), look: v3(20, 0, 0), fov: 60 }));
  // L14 if you look up, you go up (Mom whispers)
  add('whisper', s(14) - 0.04, () => faceShot(W.mom, 4.4, 0.3, 54, -1.2, -0.4));
  // L15 one o'clock; the town in the road
  add('one', s(15) - 0.04, (u) => { const b = W.V.clock.position; return { pos: lp3(b.clone().add(v3(28, -5, -5)), b.clone().add(v3(24, -4.5, -4)), u), look: b.clone().add(v3(0, -4, 0)), fov: 46 }; });
  add('rows', E.rows, (u) => ({ pos: lp3(v3(130, 5, 9), v3(128, 5.4, 7), easeInOut(u)), look: v3(70, 0.5, -1), fov: 58 }));
  // L16 faces down, nobody moves
  add('faces', s(16) - 0.04, () => faceShot(W.mom, 4.6, 0.35, 54, 1.4, -0.4));
  // L17 Mr. Abara since Tuesday
  add('abara', s(17) - 0.04, (u) => ({ pos: lp3(v3(ABARA.x + 12, 7, ABARA.z - 4), v3(ABARA.x + 9, 6, ABARA.z - 2), easeInOut(u)), look: v3(ABARA.x + 1, 1, ABARA.z + 4), fov: 58 }));
  // L18 past the edge, the grass smokes
  add('edge', s(18) - 0.04, (u) => { const x = 40 + u * 16; return { pos: v3(x - 16, 6.5, edgeZ(x) + 26), look: v3(x + 6, 3, edgeZ(x + 6) - 12), fov: 60 }; });
  // L19 Mrs. Lee: don't look, child
  add('mrslee', s(19) - 0.04, (u) => { const h = HC(W.mrslee); return { pos: h.clone().add(v3(-4.0 + u * 0.4, 2.0, 1.6)), look: h.clone().add(v3(0, -0.3, 0)), fov: 56 }; });
  // L20 last spring (memory): he stood up to catch his hat
  add('mem1', s(20) - 0.04, (u) => ({ pos: lp3(v3(MEM.x - 4, 4.2, 15), v3(MEM.x - 3, 5.2, 13), easeInOut(u)), look: v3(MEM.x + 4, 4.5, 1), fov: 62 }));
  // L21 she says he screamed
  add('hers', s(21) - 0.04, (u) => { const h = HC(W.mrslee); return { pos: h.clone().add(v3(-3.4 + u * 0.3, 1.6, 1.4)), look: h.clone().add(v3(0, -0.3, 0)), fov: 52 }; });
  // L22 I was there. He was waving (memory, looking up from the road)
  add('mem2', s(22) - 0.04, (u, t) => { const h = HC(W.mrlee); return { pos: v3(MEM.x - 8, 1.0, 16), look: h.clone().lerp(v3(MEM.x, 6, 2), 0.2), fov: 56 }; });
  // L23 something drops into the road
  add('drop', s(23) - 0.04, (u) => ({ pos: lp3(v3(196, 4.6, 25), v3(195, 4.8, 24), easeInOut(u)), look: v3(150, 4, 4), fov: 60 }));
  // L24 a feather, longer than our front door
  add('door', s(24) - 0.04, (u) => ({ pos: lp3(v3(108, 7, -4), v3(104, 8, -7), easeInOut(u)), look: v3(165, 5, 20), fov: 60 }));
  // L25 its tips are burnt
  add('tips', s(25) - 0.04, (u) => { const p = W.tipW; return { pos: p.clone().add(v3(-5 + u * 1.2, 3.2, -7.5 + u)), look: p.clone().add(v3(0, 0.6, 0)), fov: 50 }; });
  // L26 the shadow grows: the wheat flattens in a ring; coming down
  add('grow', s(26) - 0.04, (u, t) => ({ pos: lp3(v3(310, 46, 120), v3(300, 40, 108), easeInOut(u)), look: v3(190, 4, 20), fov: 60, roll: 0 }));
  // L27 flatter, Pip
  add('flatter', s(27) - 0.04, () => { const h = HC(W.pip); return { pos: h.clone().add(v3(-3.0, 7.5, -7.5)), look: h.clone().add(v3(-3.0, -0.6, 1.2)), fov: 60 }; });
  // L28 is it hungry?
  add('pip', s(28) - 0.04, () => { const h = HC(W.pip); return { pos: h.clone().add(v3(2.1, 2.2, -0.4)), look: h.clone().add(v3(0, -0.2, 0)), fov: 52 }; });
  // L29 I don't know
  add('dunno', s(29) - 0.04, () => { const h = HC(W.wren); return { pos: h.clone().add(v3(-2.2, 2.4, -0.4)), look: h.clone().add(v3(0, -0.2, 0)), fov: 52 }; });
  // L30 so I look up: she rolls onto her back; then her view up (5.7 s, no words)
  add('roll', s(30) - 0.04, () => { const h = HC(W.wren); return { pos: h.clone().add(v3(0.3, 4.6, 2.4)), look: h.clone().add(v3(0, -0.2, 0)), fov: 50 }; });
  add('pov', E.pov, (u) => { const h = HC(W.wren); return { pos: h.clone().add(v3(0, 0.3, 0)), look: h.clone().add(lp3(v3(0, 10, -8), v3(6, 30, 2), easeInOut(u))), fov: lerp(66, 74, u), roll: 0.25 * (1 - u) }; });
  add('pov2', E.pov2, (u) => { const h = HC(W.wren); return { pos: h.clone().add(v3(0, 0.3, 0)), look: h.clone().add(lp3(v3(6, 30, 6), SUNV.clone().multiplyScalar(30), easeInOut(u))), fov: lerp(76, 84, u) }; });
  // L31 it isn't hunting us (her face, gold)
  add('gold', s(31) - 0.04, (u) => { const h = HC(W.wren); return { pos: h.clone().add(v3(0.4, 3.4 - u * 0.4, 1.9)), look: h.clone().add(v3(0, -0.2, 0)), fov: 50 }; });
  // L32 behind it, the sun fills half the sky
  add('sunfill', s(32) - 0.04, (u) => ({ pos: lp3(v3(165, 2.5, -14), v3(166, 2.2, -16), easeInOut(u)), look: v3(165, 2.5, -14).add(SUNV.clone().multiplyScalar(100)).add(v3(-10, lerp(-38, -22, u), 0)), fov: 76 }));
  // L33 its feathers are burning
  add('burn', s(33) - 0.04, (u) => { const b = W.bird.position, tp = W.bird.localToWorld(W.bird.tipPoints[W.burnTip].clone()); return { pos: v3(tp.x - 30, 3, tp.z - 40), look: tp.clone().add(v3(u * 20, 0, 10)), fov: 52 }; });
  // L34 Mr. Lee wasn't screaming; L35 he was calling us (memory)
  add('mem3', s(34) - 0.04, (u) => { const h = HC(W.mrlee); return { pos: h.clone().add(v3(-7, -5, 9)), look: h.clone().add(v3(0, -0.6, 0)), fov: 44 }; });
  add('mem4', s(35) - 0.04, (u) => ({ pos: v3(MEM.x - 10, 2, 40), look: lp3(v3(MEM.x - 2, 120, -4), v3(MEM.x, 150, -6), easeInOut(u)), fov: 58 }));
  // L36 its feet are open, low enough to reach
  add('feet', E.feet, (u) => ({ pos: lp3(v3(204, 3.5, 14), v3(203, 3.2, 12), easeInOut(u)), look: lp3(v3(186, 30, -12), v3(186, 5, -10), easeInOut(clamp(u * 1.4))), fov: 66 }));
  // L37 stay down!
  add('stay', s(37) - 0.04, () => faceShot(W.mom, 4.0, 0.4, 54, 1.0, -0.4));
  // L38 when the shadow comes, we lie down (the town, the feet in the street)
  add('town', s(38) - 0.04, (u) => ({ pos: lp3(v3(110, 70, 70), v3(120, 64, 62), easeInOut(u)), look: v3(170, 0, 0), fov: 62 }));
  // L39 I stand up
  add('stand', s(39) - 0.04, (u) => ({ pos: lp3(v3(WX - 4, PY + 2.2, 13), v3(WX - 4, PY + 2.0, 12), easeInOut(u)), look: v3(WX, PY + 4.2, 25), fov: 62 }));
  // L40 one, two... up (her hand and the claw)
  add('reach', s(40) - 0.04, (u) => ({ pos: lp3(v3(195, PY + 5.5, 36), v3(194, PY + 5.2, 34), easeInOut(u)), look: v3(185, PY + 3.4, 17), fov: 60 }));
  Sx.sort((a, b) => a.t0() - b.t0());
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
const MEMKEYS = { mem1: 1, mem2: 2, mem3: 3, mem4: 4 };
const CLIMAX = ['flatter', 'pip', 'dunno', 'roll', 'pov', 'pov2', 'gold', 'sunfill', 'burn', 'feet', 'stay', 'town', 'stand', 'reach'];
const SEEBIRD = ['pov', 'pov2', 'gold', 'sunfill', 'burn', 'mem4', 'feet', 'stay', 'stand', 'reach'];

function renderAt(t) {
  const E = EV; let sh = shotAt(W.shots, t); const key = sh.name;
  const mem = MEMKEYS[key];
  const climax = CLIMAX.includes(key) && t > E.pov - 0.01;
  // light: noon; hotter under the halted shadow; gold from the look up
  let env = NOON;
  if (['heat', 'fan'].includes(key)) env = HOT;
  if (t >= L(12).start && !mem && key !== 'barber') env = mixE(HOT, GOLD, smooth(E.pov - 0.1, E.pov + 1.6, t) * (climax ? 1 : 0));
  if (key === 'barber') env = ROOM;
  if (mem) env = NOON;
  applyEnv(ctx, env);
  // the shadow
  const inShade = !['clock', 'kites', 'heat', 'fan', 'barber', 'getup', 'step'].includes(key);
  const sc = shadowFor(mem ? 'mem' : ['clock', 'one'].includes(key) ? (key === 'one' ? 'halt' : 'clock') : key, t);
  W.V.occ.place(sc.x, sc.z, SD, t > E.grow && !mem ? growK(t) : 1);
  // sets
  W.V.root.visible = key !== 'barber'; W.barberRoom.visible = key === 'barber';
  W.plate.visible = key !== 'barber'; W.plateGold.visible = climax; W.plate.material.opacity = climax ? 0 : 0.6;
  hideAll(); W.sciss.visible = false; W.blanket.visible = false; W.ab.visible = false; W.capFly.visible = false; W.fork.visible = false; W.capLee.visible = true;
  W.V.dog.scale.setScalar(3.4 * 1.15);
  W.arch.visible = key === 'wed';
  W.feather.visible = t >= E.drop23 - 1.2 && !mem; W.char.visible = t >= E.drop23 && !mem; W.featherFx.forEach((f) => f.set(t, 0));
  W.feet.forEach((f) => { f.visible = false; });
  W.bird.visible = SEEBIRD.includes(key); W.sunDisc.visible = climax && key !== 'mem4' || key === 'mem4'; W.embers.set(t, climax ? 1 : 0);
  W.V.clock.setTime(key === 'one' ? 13 + Math.min(0.02, (t - L(15).start) * 0.01) : key === 'clock' ? 12 + clamp(t - L(5).start - 0.4, 0, 1) * 0.004 : 12.1);
  // the wheat: wind, and the downdraught ring when it grows
  const kr = smooth(E.grow, E.grow + 2.6, t) * (mem ? 0 : 1);
  W.V.wheat.setWind(t, kr > 0 ? { c: HALT, r0: lerp(40, 260, kr), r1: lerp(60, 300, kr), k: kr } : null);
  // smoke at the edge (from L18), the scorched strip
  const ks = smooth(E.edge - 0.5, E.edge + 2, t) * (mem ? 0 : 1); W.edgeSmoke.set(t, ks * 0.9); W.scorch.material.opacity = ks * 0.7; W.scorch.visible = ks > 0;
  // the feet: down from the sky into the street, then open
  if (t >= E.feet - 0.01 && CLIMAX.includes(key) && !mem) {
    const kd = easeOut(clamp((t - E.feet) / 2.0)), ko = easeInOut(clamp((t - E.open36) / 1.6));
    W.feet.forEach((f, i) => { f.visible = true; f.position.copy(FOOT[i].p).add(v3(0, lerp(220, 0.3, kd), 0)); f.rotation.y = FOOT[i].yaw; f.open(ko); f.updateMatrixWorld(true); f.tipW = f.localToWorld(v3(0, 4, 31)); });
  }
  // people and props, by shot
  const P0 = {
    open: () => poseOpen(t), rise: () => poseRise(t), wed: () => poseWed(t), barber: () => poseBarber(t),
    roof: () => { porchHold(t); townLying(t); }, tilt: () => { porchHold(t); townLying(t); },
    clock: () => {}, cross: () => poseCross(t), getup: () => poseGetUp(t), toddler: () => poseToddler(t), kites: () => poseKites(t), heat: () => poseHeat(t), fan: () => poseHeat(t),
    step: () => { poseStep(t); }, flat: () => poseFlat(t), cheek: () => porchHold(t, { wf: 'nervous' }), halt: () => { porchHold(t); townLying(t); }, pool: () => { porchHold(t); townLying(t); },
    whisper: () => porchHold(t, { mv: talk(14, t, 'look up go up'), mf: 'nervous' }), one: () => {}, rows: () => { porchHold(t); townLying(t); },
    faces: () => porchHold(t, { mv: talk(16, t), mf: 'angry' }), abara: () => { poseAbara(t); townLying(t); }, edge: () => { townLying(t); },
    mrslee: () => porchHold(t, { lv: talk(19, t) }), hers: () => porchHold(t, { wf: 'sad' }),
    drop: () => { porchHold(t); townLying(t); }, door: () => { porchHold(t); townLying(t); }, tips: () => { porchHold(t); townLying(t); }, grow: () => { porchHold(t); townLying(t); },
  };
  if (mem) poseMem(t, mem);
  else if (P0[key]) P0[key]();
  else { poseClimax(t, key); townLying(t); }
  if (key === 'cross' || key === 'getup' || key === 'toddler' || key === 'kites' || key === 'heat' || key === 'fan' || key === 'step' || key === 'open' || key === 'rise' || key === 'wed') W.V.dog.scale.setScalar(3.4 * 1.15);
  // the feather: falls, lands with a thud and dust
  { const u = clamp((t - (E.drop23 - 1.2)) / 1.2), f = W.feather; f.position.copy(FEATHER).add(v3(0, (1 - easeIn(u)) * 70, 0)); f.rotation.set(0, Math.PI / 2 + 0.12 + (1 - u) * 1.6, (1 - u) * 0.5); W.dust.set(E.drop23, t); }
  // the sun: a disc behind the bird filling half the sky
  if (W.sunDisc.visible) { const cp = ctx.camera.position; W.sunDisc.position.copy(cp).add(SUNV.clone().multiplyScalar(1500)); W.sunDisc.lookAt(cp); W.sunHalo.material.opacity = 0.9; }
  W.bird.burn(climax ? 0.6 + 0.4 * smooth(E.burn - 0.5, E.burn + 1.5, t) : 0.5);
  W.burnLight.intensity = climax ? 5000 : 0;
  // Ponlai: heat shimmer on the hot shots, the memory LUT for last spring
  ctx.ponlai.set({ shimmer: ['heat', 'fan'].includes(key) ? 1 : key === 'halt' || key === 'edge' ? 0.5 : climax ? 0.35 : 0, time: t, memory: mem ? 1 : 0, local: climax ? 0.36 : 0.28, key: climax ? 0.18 : 0.2, maxEx: climax ? 1.6 : inShade ? 1.08 : 1.6, minEx: 0.75 });
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  W.plate.position.set(ctx.camera.position.x, 0, ctx.camera.position.z); W.plateGold.position.copy(W.plate.position);
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = HC(c), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * (c.spec.scale || 1); c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2], Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  // thumbnail: the 'behind it' shot (the house under the burning wing, a foot beside it), shot as it plays
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  const wide = ['pool', 'cross', 'roof', 'town', 'open', 'grow'].includes(key) ? 520 : ['halt', 'rows', 'edge', 'door', 'drop', 'sunfill', 'feet', 'wed'].includes(key) ? 160 : 70;
  const black = t > E.up + 0.3 ? 1 : 0;
  frame(ctx, t, sh, { steady: t < 2.6 || ['roof', 'pool', 'pov', 'pov2'].includes(key), shake: key === 'grow' ? 0.3 * smooth(E.down - 0.3, E.down, t) : key === 'feet' ? 0.5 * Math.max(0, 1 - Math.abs(t - E.feet - 2.0) * 2) : 0,
    shadowSpan: wide, shadows: true, black, flash: key === 'tilt' ? 0.75 * smooth(L(4).end - 0.9, L(4).end, t) : 0, flashColor: '#fff6e0' });
  return sh.name;
}

function barberRoom() {
  const g = new THREE.Group(), b = new Batch(), wall = paint('#7fb8c9', { roughness: 0.85 }), trim = paint('#f4efe6', { roughness: 0.6 });
  b.box(surf('tile', '#ece6da', { roughness: 0.5 }), 36, 0.4, 28, 0, 0.2, 0);
  b.box(wall, 36, 16, 0.6, 0, 8, -14); b.box(wall, 0.6, 16, 28, -18, 8, 0); b.box(wall, 0.6, 16, 28, 18, 8, 0);
  b.box(trim, 36, 0.8, 0.8, 0, 0.8, -13.6);
  b.box(paint('#cfdbe2', { metalness: 0.9, roughness: 0.06 }), 14, 6.5, 0.2, -2, 8.5, -13.6);
  b.box(paint('#b8323a', { roughness: 0.5 }), 3.4, 1.0, 3.2, -2, 3.0, -9); b.box(paint('#b8323a', { roughness: 0.5 }), 3.4, 3.6, 0.8, -2, 5.0, -10.4);
  b.cyl(paint('#9aa0a6', { metalness: 0.8, roughness: 0.3 }), 0.4, 1.2, 2.4, -2, 1.3, -9);
  for (let i = 0; i < 6; i++) b.cyl(paint(i % 2 ? '#ffffff' : (i % 4 ? '#c8102e' : '#1d4fa0')), 0.45, 0.45, 1.0, 14, 3 + i, -13.2);
  b.done(g);
  const s = sign('HAIRCUTS', { w: 9, h: 2.2, bg: '#fffaf0', fg: '#c8102e', frame: '#2a3a5a' }); s.position.set(8, 12.4, -13.5); g.add(s);
  const L1 = new THREE.PointLight('#fff2dc', 420, 50, 1.5); L1.position.set(4, 13, 4); g.add(L1);
  // hair tufts on the floor
  const tuft = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 6, 4), paint('#3a2a1c'), 40); const R = rng(9), M = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) { M.makeScale(1, 0.25, 1.6).setPosition(-2 + (R() - 0.5) * 5, 0.45, 1 + (R() - 0.5) * 4); tuft.setMatrixAt(i, M); } g.add(tuft);
  return g;
}

export async function setup() {
  ctx = await initStage('ep121', { look: 'pro', avatars: [...new Set(Object.values(AV).map((a) => a[0]))] }); L = ctx.L;
  try { CAP = (await (await fetch('/build/ep121/timeline.json')).json()).captions || []; } catch (e) { CAP = []; }
  EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'smirk', 'grin', 'focused', 'shocked', 'surprised', 'nervous', 'scared', 'angry', 'blink']);
  await loadPF();
  const { scene, camera } = ctx; camera.far = 2600; camera.near = 0.1; camera.updateProjectionMatrix();
  installPonlai(ctx, { fog: { density: 0.010, falloff: 0.035 }, key: 0.2, strength: 0.5, local: 0.28 });
  // the village (Polyfork), the wing shadow
  W.V = village(scene);
  if (Q.get('showocc')) W.V.occ.children[0].material = new THREE.MeshBasicMaterial({ color: '#ff0000', side: THREE.DoubleSide });
  // Ponlai cloud bands on the horizon: noon, and golden for the look up
  const tl = new THREE.TextureLoader();
  const [tn, tg] = await Promise.all([tl.loadAsync('/web/assets/ponlai/lore_noon_band.png'), tl.loadAsync('/web/assets/ponlai/lore_gold_band.png')]);
  W.plate = ctx.ponlai.plate(tn, { radius: 1700, arc: 44, elev0: -0.6, elev1: 6.2, horizonV: 0.083, opacity: 0.6 }); W.plate.material.color.setRGB(1.35, 1.3, 1.2);
  W.plateGold = ctx.ponlai.plate(tg, { radius: 1690, arc: 44, elev0: -0.6, elev1: 6.2, horizonV: 0.082, opacity: 0.95 }); W.plateGold.material.color.setRGB(1.25, 0.95, 0.7);
  // props in the town
  W.arch = weddingArch(); W.arch.position.set(GREEN.x, 0, GREEN.z - 6); scene.add(W.arch);
  for (let i = 0; i < 6; i++) { const ch = chair(); ch.position.set(GREEN.x - 8 + (i % 3) * 8, 0, GREEN.z + 18 + Math.floor(i / 3) * 5); ch.rotation.set(i % 2 ? Math.PI / 2 : 0, Math.PI, 0); if (i % 2) ch.position.y = 1.1; W.arch.add(ch); ch.position.sub(W.arch.position); }
  W.blanket = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 6), paint('#ff8fb1', { roughness: 0.95 })); W.blanket.receiveShadow = true; scene.add(W.blanket);
  W.nokite = lawnSign('NO KITES'); W.nokite.position.set(SHOPS.x + 11, 0, SHOPS.z + 19); scene.add(W.nokite);
  W.V.dog.position.set(50, 0, -9);
  W.fork = pitchfork(); W.fork.position.set(56, 0.15, 6); W.fork.rotation.set(Math.PI / 2, 0, 1.2); scene.add(W.fork);
  // Mr. Abara's camp: pillow, thermos, a stack of plates, a sign
  W.ab = new THREE.Group(); { const A = ABARA; const pl = pillow(); pl.position.set(A.x + 1.6, 0.5, A.z + 6.0); W.ab.add(pl); const th = thermos(); th.position.set(A.x + 5, 0, A.z + 2); W.ab.add(th); const pt = plates(); pt.position.set(A.x + 5.2, 0, A.z + 4.4); W.ab.add(pt);
    const sg = lawnSign('SINCE TUESDAY'); sg.position.set(A.x - 4, 0, A.z - 4); sg.rotation.y = 0.5; W.ab.add(sg); } scene.add(W.ab);
  W.barberRoom = barberRoom(); W.barberRoom.position.set(0, 0, -4200); scene.add(W.barberRoom);
  W.sciss = scissors(); scene.add(W.sciss);
  W.capFly = flatCap(); W.capFly.scale.setScalar(1.0); scene.add(W.capFly);
  // the feather (Polyfork) and its burnt tip: smoke and embers
  W.feather = W.V.feather; W.feather.position.copy(FEATHER); W.feather.rotation.set(0, Math.PI / 2 + 0.12, 0); W.feather.updateMatrixWorld(true);
  { const bx = new THREE.Box3().setFromObject(W.feather); W.tipW = v3(bx.max.x - 2, 0.8, (bx.min.z + bx.max.z) / 2); }
  W.featherFx = [];
  { const ch = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), new THREE.MeshStandardMaterial({ color: '#140d09', roughness: 1, emissive: '#ff5a1a', emissiveIntensity: 0.0 })); ch.scale.set(3.2, 0.45, 2.0); ch.position.copy(W.tipW).setY(0.6); ch.castShadow = true; W.char = ch; scene.add(ch); }
  W.tipSmoke = smoke(scene, { sources: [v3(0, 0, 0)], count: 70, rise: 3, life: 3.5, size: 0.9, color: '#6b625c', jitter: 1.5, seed: 4 });
  W.dust = dustPuff(scene, { len: 30, wid: 5, count: 220, color: '#c9a77c' }); W.dust.position.copy(FEATHER);
  // the bird: underside, burning rims, embers; the sun disc; the feet
  W.bird = birdUnder({ span: SPAN * 1.35 }); W.bird.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  W.bird.position.set(HALT.x + SD.x / SD.y * 250, 250, HALT.z + SD.z / SD.y * 250); scene.add(W.bird);
  W.burnTip = W.bird.tipPoints.reduce((bi, p, i, a) => (p.x > a[bi].x ? i : bi), 0);
  W.birdEmbers = smoke(W.bird, { sources: W.bird.tipPoints, count: 420, rise: -7, life: 4, size: 3.2, color: '#ff7a2a', additive: true, jitter: 6, seed: 7 });
  W.birdSmoke = smoke(W.bird, { sources: W.bird.tipPoints.filter((_, i) => i % 2 === 0), count: 260, rise: 7, life: 5, size: 9, color: '#4a3c36', jitter: 8, seed: 8 });
  W.embers = smoke(scene, { sources: [...Array(30)].map((_, i) => v3(120 + (i % 10) * 9, 70 + (i % 3) * 20, -30 + Math.floor(i / 10) * 25)), count: 300, rise: -8, life: 8, size: 0.7, color: '#ffae5a', additive: true, jitter: 30, seed: 12 });
  { const set0 = W.embers.set; W.embers.set = (t, a) => { set0(t, a); W.birdEmbers.set(t, a > 0 ? 1 : 0.6); W.birdSmoke.set(t, a > 0 ? 0.8 : 0.5); W.tipSmoke.set(t, t > EV.drop23 + 0.4 ? 0.9 : 0); }; }
  W.tipSmoke.position.copy(W.tipW);
  W.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(900, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(10, 9.4, 8), fog: false, depthWrite: false, toneMapped: true }));
  W.sunDisc.renderOrder = -5; W.sunDisc.userData.noAO = true; W.sunDisc.frustumCulled = false; scene.add(W.sunDisc);
  { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 40, 128, 128, 128); gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(0.5, 'rgba(255,170,90,0.35)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    const tx = new THREE.CanvasTexture(c); W.sunHalo = new THREE.Mesh(new THREE.CircleGeometry(1500, 64), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.6, 1.3, 1.0) }));
    W.sunHalo.position.z = -1; W.sunHalo.renderOrder = -6; W.sunDisc.add(W.sunHalo); }
  W.burnLight = new THREE.PointLight('#ff8a3a', 0, 700, 1.2); W.burnLight.position.set(HALT.x, 120, HALT.z + 20); scene.add(W.burnLight);
  W.feet = [talon(), talon()]; W.feet.forEach((f) => { f.visible = false; scene.add(f); });
  // the smoke line just outside the leading edge, and the scorched strip under it
  { const src = []; for (let x = -200; x <= 150; x += 6) src.push(v3(x, 0.3, edgeZ(x) - 4)); W.edgeSmoke = smoke(scene, { sources: src, count: 700, rise: 4.5, life: 4.5, size: 2.0, color: '#8f8a84', jitter: 4, seed: 21 });
    const n = src.length, sc = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14), new THREE.MeshStandardMaterial({ color: '#2b2118', roughness: 1, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), n * 2);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(v3(1, 0, 0), -Math.PI / 2), R = rng(3);
    src.forEach((p, i) => { for (let j = 0; j < 2; j++) { M.compose(v3(p.x + (R() - 0.5) * 6, 0.07, p.z - 1 + (R() - 0.5) * 4), q, v3(4 + R() * 3, 3 + R() * 3, 1)); sc.setMatrixAt(i * 2 + j, M); } });
    sc.receiveShadow = true; sc.userData.noAO = true; scene.add(sc); W.scorch = sc; }
  people();
  W.shots = shots();
  window.__ep121 = { W, THREE, ctx, L, EV };
  return expose(ctx, renderAt, 101.5, EV);
}
