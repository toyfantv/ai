// Flower Man remake 5: The Most Common Name. In Pebble Creek your last name is your superpower: Gardners grow pumpkins in a blink, Taylors
// sew suits in a sneeze. Ezra Wilson's name is one of the most common around and no Wilson ever found their power, so Brock Steele (who bends
// lamp posts) calls him No-Power and dumps him in trash cans. Yet when a goose chased him and he yelled "Dad!", Dad was right there; lost in a
// corn maze, he whispered it and Dad tapped his shoulder (Dad is the principal, always around). Behind the arcade Brock knots a stop sign:
// "No teachers. No friends. No power." Ezra whispers "Dad?" and, poof, Dad appears between them in a frilly apron, a pancake still flipping.
// Wilson means Will's son: a son in real trouble can always call his dad. "Mister Steele. My office, Monday, six a.m. Bring your grandma."
// Brock yells "DAD!": nothing, Steele isn't a son's name. Now he waves every morning: "Morning, Ezra. Tell your dad hi!"
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, frame, expose, P, DAY } from '../engine/stage.js';
import { shotAt } from '../engine/stage.js';
import { burst } from '../engine/atmos.js';
import { jointify } from '../engine/infinitetower.js';
import { FARM } from '../engine/farm_cast.js';
import { speedLines, sparkle } from '../engine/slothbite.js';
import { pebbleStreet, parkSet, cornMaze, alley, goose, fryingPan, pancake, whistle, coffeeMug, wilsonSign, poofCloud, wearFrillyApron, wearBunnySlippers, SCHOOL, PARK, CORN, ALLEY } from '../engine/commonname.js';

const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
// side 0 = the avatar's LEFT arm here (character.js keeps the right arm in arms[0])
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[1 - side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV, CAP = [];
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const LINEUP = Q.get('lineup') ? Q.get('lineup').split(',') : null;
// [avatar, scale, head scale]
const AV = {
  ezra: ['farm_finn', 0.7], dad: ['farm_bacon_dad_suit', 1.0], brock: ['farm_ep32_rowan', 0.92],
  gard: ['farm_gardener', 0.98], tailor: ['farm_ep28_waistcoat', 1.0],
  k1: ['farm_young_kid', 0.72], k2: ['farm_lily_pink', 0.74], k3: ['farm_ep37_brother', 0.72], k4: ['farm_mia', 0.76], k5: ['farm_ep31_ivy', 0.76],
};
for (const k of Object.keys(AV)) if (Q.get(k)) AV[k][0] = Q.get(k);
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';

const PK = v3(0, 0, -900), CM = v3(900, 0, 0), AL = v3(0, 0, 900), LU = v3(0, 0, -1800);   // the park, the corn maze, the alley, lineup
const at = (o, x, y, z) => o.clone().add(v3(x, y, z));

const SUNNY = { ...DAY, ...P({ top: '#2f93ee', horizon: '#d2efff', haze: '#d8f0ff', sunColor: '#fff3dc', hemiSky: '#d6edff', hemiGround: '#d4dfa4' }), sunDir: v3(0.3, 0.8, 0.55), sunI: 2.2, sunDisc: 0, hemiI: 1.12, amb: 0.3, envI: 1.0, exposure: 1.0, bloom: 0.03, vig: 0, saturation: 1.2, contrast: 1.05, bounce: 0.18, fogNear: 300, fogFar: 1100, stars: 0, moon: 0, win: 0, lamp: 0 };
const MORNING = { ...SUNNY, ...P({ horizon: '#e4f2ff', sunColor: '#fff0d4' }), sunDir: v3(-0.4, 0.62, 0.65) };
const MEMORY = { ...SUNNY, ...P({ top: '#7fb8e8', horizon: '#ffe8c4', haze: '#fbe6c8', sunColor: '#ffe6b8', hemiSky: '#f4e6cc', hemiGround: '#c8b07a' }), sunDir: v3(0.4, 0.75, 0.55), sunI: 2.0, hemiI: 1.15, saturation: 0.82, contrast: 1.04, exposure: 1.04 };
const GOLD = { ...MEMORY, ...P({ top: '#6fa8e0', horizon: '#ffd9a0', haze: '#f6d8a8', sunColor: '#ffd9a0' }), sunDir: v3(-0.6, 0.45, 0.6), saturation: 0.86 };
const ALLEYP = { ...SUNNY, ...P({ top: '#4f8fd8', horizon: '#ffe0b8', haze: '#f2dcc0', sunColor: '#ffe2b8', hemiSky: '#e8e0f0', hemiGround: '#b0a090' }), sunDir: v3(0.45, 0.72, 0.6), sunI: 2.0, hemiI: 1.2, amb: 0.34, saturation: 1.12, exposure: 1.02 };

const capT = (word, after = 0) => { const c = CAP.find((x) => x.start >= after - 0.01 && x.text.toUpperCase().replace(/[“”"]/g, '').includes(word)); return c ? c.start : after; };
function events() {
  const s = (i) => L(i).start;
  const E = {
    open: s(0), garden: s(1), blink: capT('A BLINK', s(1)), tailor: capT('TAYLORS', s(1)), sneeze: capT('A SNEEZE', s(1)),
    ezra: s(2), power: capT('NO WILSON', s(2)), brock: s(3), posts: capT('WHO BENT LAMP', s(3)), called: capT('CALLED HIM', s(3)), dumped: capT('DUMPED', s(3)),
    goose: s(4), yell: s(5), there: s(6), passing: s(7), corn: s(8), whisp: capT('MAZE, EZRA', s(8)) + 0.6, tap: capT('AND DAD TAPPED', s(8)),
    principal: s(9), alley: s(10), knot: capT('A STOP SIGN', s(10)), taunt: s(11), whisper: s(12), poof: s(13), apron: capT('APRON', s(13)),
    means: s(14), son: capT('A SON IN', s(14)), office: s(15), cheat: s(16), nope: s(17), dadyell: s(18), nothing: s(19), now: s(20), morning: s(21), end: ctx.dur,
  };
  E.land = L(13).end + 0.05;   // the pancake lands back in the pan
  return E;
}

// ---- helpers ----
const SCa = (c) => (c.spec.scale || 1) * c.root.scale.x;
const armLen = (c) => { if (!c._alen) { c.reset(); const r = c.root.rotation.clone(), p = c.root.position.clone(), s0 = c.root.scale.x; c.root.scale.setScalar(1); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3(); c.arms[0].traverse((o) => { if (o.isMesh && !o.userData.worn) bx.expandByObject(o); }); c._alen = sh.y - bx.min.y - 0.12 * (c.spec.scale || 1); c.root.rotation.copy(r); c.root.position.copy(p); c.root.scale.setScalar(s0); c.root.updateMatrixWorld(true); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.arms[1 - side].localToWorld(v3(0, -armLen(c) / s, 0.1)); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.scale.set(1, 1, 1); c.head.rotation.set(0, 0, 0); c.arms.forEach((a) => a.quaternion.identity()); c.legs.forEach((l) => l.rotation.set(0, 0, 0)); c.hips.position.y = c.hipY ?? 2; c.torso.rotation.set(0, 0, 0); c.neck.rotation.set(0, 0, 0); }
function place(c, p, yaw, size = 1) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; c.root.scale.setScalar(size); }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const H = (c) => { c.root.updateMatrixWorld(true); return c.neck.getWorldPosition(v3()).add(v3(0, 0.8 * SCa(c), 0)); };
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.closed ? true : o.noBlink ? false : blinkAt(t, ph), viseme: o.viseme, gaze: o.gaze }); }
const talk = (i, t, txt) => (t > L(i).start && t < L(i).end ? visemeAt(txt || L(i).text.replace(/[“”]/g, ''), L(i).start, L(i).end, t) : undefined);
function lookAtP(c, p, k = 1) { c.root.updateMatrixWorld(true); const n = c.neck.getWorldPosition(v3()), a = wrap(yawTo(n, p) - c.root.rotation.y); c.neck.rotation.y = clamp(a, -1.2, 1.2) * k; c.neck.rotation.x = Math.min(0.12, -Math.atan2(p.y - n.y - 0.6 * SCa(c), Math.hypot(p.x - n.x, p.z - n.z)) * 0.6 * k); }
function walkTo(c, a, b, t0, t1, t, speed = 1, kind = 'walk', size = 1) { const u = clamp((t - t0) / (t1 - t0)); const p = lp3(a, b, u); place(c, p, yawTo(a, b), size); pose(c, u > 0 && u < 1 ? kind : 'idle', t * speed); return u; }
const fwd = (c, d = 1) => v3(Math.sin(c.root.rotation.y), 0, Math.cos(c.root.rotation.y)).multiplyScalar(d);
const side = (c, d = 1) => { const f = fwd(c); return v3(f.z, 0, -f.x).multiplyScalar(d); };   // the character's left
const chestOf = (c) => H(c).add(v3(0, -1.55 * SCa(c), 0)).add(fwd(c, 0.85 * SCa(c)));
const sz = (k) => AV[k][1];
function stand(k, p, yaw, t, ex = 'happy', ph = 0.3, o = {}) { const c = W[k]; place(c, p, yaw, sz(k)); pose(c, 'idle', t + ph * 3); face(c, ex, t, ph, o); return c; }
function laughBob(c, t, amp = 1) { c.torso.rotation.x += Math.abs(Math.sin(t * 9)) * 0.12 * amp; c.neck.rotation.x -= Math.abs(Math.sin(t * 9)) * 0.1 * amp; }
function shrug(c, k) { if (k <= 0) return; aimArm(c, 0, chestOf(c).add(side(c, 1.5 * SCa(c))).add(fwd(c, 0.6 * SCa(c))).add(v3(0, -0.4 * SCa(c), 0)), k); aimArm(c, 1, chestOf(c).add(side(c, -1.5 * SCa(c))).add(fwd(c, 0.6 * SCa(c))).add(v3(0, -0.4 * SCa(c), 0)), k); c.neck.rotation.z += 0.12 * k; }
function costume(on) { W.apron.visible = on; W.slippers.forEach((s) => { s.visible = on; }); }

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
  rs(W.dad); W.apron = wearFrillyApron(W.dad); W.slippers = wearBunnySlippers(W.dad); costume(false);
}
function hideAll() { W.all.forEach((c) => { c.root.visible = false; }); }

// ================= the town =================
const SX = SCHOOL.x;
function poseTown(t) {   // L0: the welcome sign, the street; a couple of neighbours out
  const E = EV; void E;
  const u = (t * 0.08) % 1; place(W.k1, v3(-70 + u * 9, 0, 10.5), Math.PI / 2, sz('k1')); pose(W.k1, 'walk', t); face(W.k1, 'happy', t, 0.4);
  stand('gard', v3(-46.5, 0, -17.5), -1.25, t, 'happy', 0.5);
}
function poseGarden(t) {   // L1a: the gardener snaps her fingers at a seedling; it balloons into a giant pumpkin
  const E = EV, g = W.gard, P0 = v3(-55.6, 0, -16.4), pk = v3(-51, 0, -19); place(g, P0, yawTo(P0, v3(-49.5, 0, -3)) + 0.55, sz('gard')); pose(g, 'idle', t);
  const snap = E.blink - 0.15, k = smooth(E.blink - 0.05, E.blink + 0.55, t);
  W.street.pumpkin.grow(easeOut(k) + Math.sin(clamp((t - E.blink) / 0.8) * Math.PI * 3) * 0.05 * (1 - clamp((t - E.blink) / 0.8)));
  aimArm(g, 1, H(g).add(fwd(g, 1.4)).add(side(g, -0.6)).add(v3(0, t < snap ? -0.4 : 0.2, 0)), smooth(E.garden + 0.2, E.garden + 0.6, t));
  face(g, t > E.blink + 0.1 ? 'grin' : 'focused', t, 0.4); lookAtP(g, t > E.blink ? pk.clone().add(v3(0, 4, 0)) : pk.clone().add(v3(0, 1, 0)), 0.8);
  W.spark.position.copy(pk).add(v3(0, 1.5, 0)); W.spark.set(clamp((t - E.blink) / 0.9));
}
function poseTailor(t) {   // L1b: the tailor sneezes; fabric whirls onto the mannequin as a suit
  const E = EV, c = W.tailor, P0 = v3(-9.4, 0, -10.0), M = W.street.mannequin.position; place(c, P0, yawTo(P0, v3(-5.4, 0, 1.6)) + 0.25, sz('tailor')); pose(c, 'idle', t);
  const pre = smooth(E.sneeze - 0.7, E.sneeze - 0.1, t), post = smooth(E.sneeze - 0.1, E.sneeze + 0.05, t) * (1 - smooth(E.sneeze + 0.3, E.sneeze + 0.9, t));
  c.neck.rotation.x = -0.3 * pre * (1 - post) + 0.12 * post; c.torso.rotation.x = -0.1 * pre * (1 - post) + 0.12 * post;
  face(c, t > E.sneeze + 0.6 ? 'smug' : t > E.sneeze - 0.1 ? 'blink' : pre > 0.2 ? 'surprised' : 'neutral', t, 0.4, { noBlink: t > E.sneeze - 0.8 && t < E.sneeze + 0.6 });
  aimArm(c, 1, H(c).add(fwd(c, 0.8)).add(v3(0, -0.6, 0)), pre * (1 - post) * 0.8);
  if (t > E.sneeze + 0.5) aimArm(c, 0, M.clone().add(v3(0, 3.6, 0)), smooth(E.sneeze + 0.5, E.sneeze + 0.9, t));
  W.street.mannequin.suit(clamp((t - E.sneeze) / 0.7), t);
}
const EZW = (x) => v3(x, 0, -10.2);
function poseEzra(t, name) {   // L2: Ezra walks past the WILSON mailbox; then tries for a power: strains, nothing, a shrug
  const E = EV, e = W.ezra;
  if (name === 'ezra') { walkTo(e, EZW(24.5), EZW(33.5), E.ezra - 0.3, E.power - 0.1, t, 1, 'walk', sz('ezra')); face(e, 'neutral', t, 0.3); lookAtP(e, e.root.position.clone().add(v3(4, 3.2, 6)), 0.4); return; }
  const p = EZW(33.5); place(e, p, 0.25, sz('ezra')); pose(e, 'idle', t);
  const strain = smooth(E.power + 0.1, E.power + 0.5, t) * (1 - smooth(E.power + 1.7, E.power + 2.0, t)), sh = smooth(E.power + 1.9, E.power + 2.2, t);
  if (strain > 0) { const q = Math.sin(t * 40) * 0.03; e.hips.position.y -= 0.3 * strain; e.legs.forEach((l, i) => { l.rotation.x -= 0.25 * strain; l.rotation.z = (i ? 1 : -1) * 0.18 * strain; }); e.knee.forEach((k) => { k.rotation.x = 0.4 * strain; });
    aimArm(e, 0, H(e).add(side(e, 2.2 * SCa(e))).add(v3(q, -0.5 * SCa(e), 0)), strain); aimArm(e, 1, H(e).add(side(e, -2.2 * SCa(e))).add(v3(-q, -0.5 * SCa(e), 0)), strain); e.root.position.x += q; }
  shrug(e, sh);
  face(e, sh > 0.3 ? 'sad' : strain > 0.3 ? 'pain' : 'focused', t, 0.3, { noBlink: strain > 0.3 });
  lookAtP(e, p.clone().add(v3(1.5, 3.2, 9)), 0.5);
  stand('k1', v3(40.5, 0, -9.8), -1.6, t, 'laugh', 0.6); laughBob(W.k1, t, sh); lookAtP(W.k1, H(e), 0.6);
}
// the school forecourt: the lamp post Brock bends, the trash can he parks Ezra in
const LPOST = () => W.street.lampPost.position.clone(), CAN = () => W.street.can.position.clone();
const BRB = () => v3(SX - 14.8, 0, -14.6);    // Brock beside the lamp post (it is on his left, +x)
const BRY = 0.45;                              // he faces the road
const EZ0 = () => v3(SX - 16.0, 0, -11.6);    // Ezra in front of him, to his right
const BR2 = BRB;                               // he throws from where he stands
function kidsForecourt(t, ex, look, o = {}) {
  const spots = o.spots || [['k2', v3(SX - 22, 0, -21), 0], ['k3', v3(SX - 8, 0, -22), 1], ['k4', v3(SX - 3.5, 0, -19), 2], ['k5', v3(SX - 26, 0, -15.5), 3]];
  spots.forEach(([k, p, i]) => { const c = W[k]; place(c, p, yawTo(p, look) + (o.yawOff || 0), sz(k)); pose(c, 'idle', t + i); face(c, typeof ex === 'function' ? ex(i) : ex, t, 0.3 + i * 0.4); lookAtP(c, look.clone().setY(H(c).y), 0.5);
    if (o.laugh) laughBob(c, t + i * 0.2, o.laugh); if (o.point && i % 2 === 0) aimArm(c, 1, look.clone().add(v3(0, 1, 0)), 0.9); });
}
function poseBrock(t, name) {   // L3: Brock leans on the lamp post and bends it over; then lifts Ezra into the trash can
  const E = EV, b = W.brock, e = W.ezra, S = W.street;
  const bendK = easeInOut(smooth(E.posts + 0.05, E.posts + 0.9, t)); S.lampPost.set(bendK);
  const LP = LPOST(), lift0 = E.called + 0.35, lift1 = E.dumped + 0.15, drop = E.dumped + 0.4;
  if (t < E.called - 0.1) {
    place(b, BRB(), BRY, sz('brock')); pose(b, 'idle', t);
    const mid = LP.clone().add(v3(0, 4.0 * (1 - bendK) + 3.4 * bendK, 0)); aimArm(b, 0, mid, smooth(E.brock + 0.3, E.posts, t));
    face(b, bendK > 0.3 ? 'grin' : 'smug', t, 0.3); lookAtP(b, t > E.posts + 0.6 ? H(e) : mid, 0.45);
    place(e, EZ0(), yawTo(EZ0(), v3(SX - 9, 0, 2)), sz('ezra')); pose(e, 'idle', t); face(e, bendK > 0.2 ? 'shocked' : 'nervous', t, 0.3); lookAtP(e, LP.clone().add(v3(0, 6, 0)), 0.7);
  } else {
    const u = clamp((t - (E.called - 0.1)) / 0.4); place(b, BRB(), lerp(BRY, yawTo(BRB(), lp3(EZ0(), CAN(), 0.4)), easeInOut(u)) , sz('brock')); pose(b, 'idle', t);
    // Ezra's flight: from EZ0, up and over, down into the can
    const k = smooth(lift0, lift1, t), dk = smooth(lift1, drop, t);
    const top = CAN().add(v3(0, S.canTop + 0.35, 0)), up = lp3(EZ0(), top, easeInOut(k)); up.y = lerp(0, top.y, easeOut(k)) + Math.sin(k * Math.PI) * 1.2; const ep = k < 1 ? up : lp3(top, CAN().add(v3(0, 1.35, 0)), easeOut(dk));
    place(e, ep, k <= 0 ? yawTo(EZ0(), BRB()) : k < 1 ? yawTo(EZ0(), CAN()) + Math.PI : yawTo(CAN(), v3(SX - 9, 0, 3)), sz('ezra'));
    if (k > 0 && dk < 1) { pose(e, 'run', t * 1.6); e.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 22 + i * 3) * 0.7; }); aimArm(e, 0, H(e).add(side(e, 1.6)).add(v3(0, 1.0 + Math.sin(t * 20) * 0.5, 0)), 1); aimArm(e, 1, H(e).add(side(e, -1.6)).add(v3(0, 1.0 + Math.cos(t * 19) * 0.5, 0)), 1); face(e, 'terrified', t, 0.3, { noBlink: true }); }
    else if (k <= 0) { pose(e, 'idle', t); face(e, 'scared', t, 0.3); lookAtP(e, H(b), 0.8); }
    else { pose(e, 'idle', t); aimArm(e, 0, H(e).add(side(e, 1.3)).add(v3(0, 1.4, 0)), 1); aimArm(e, 1, H(e).add(side(e, -1.3)).add(v3(0, 1.2, 0)), 1); face(e, 'sad', t, 0.3); lookAtP(e, H(e).add(v3(0, 0, 0)).add(fwd(e, 4)).add(v3(0, -1, 0)), 0.5); }
    if (k < 0.3) { const ch = H(e).add(v3(0, -1.3 * SCa(e), 0)); const g = smooth(lift0 - 0.3, lift0, t); aimArm(b, 0, ch.clone().add(side(b, 0.5)), g); aimArm(b, 1, ch.clone().add(side(b, -0.5)), g); }
    else if (k < 1) { const th = 1 - smooth(0.3, 1, k); aimArm(b, 0, H(b).add(fwd(b, 1.6)).add(side(b, 0.6)).add(v3(0, 1.0, 0)), th); aimArm(b, 1, H(b).add(fwd(b, 1.6)).add(side(b, -0.6)).add(v3(0, 1.0, 0)), th); }
    face(b, t > drop ? 'laugh' : 'grin', t, 0.3); if (t > drop) { laughBob(b, t, 1); aimArm(b, 1, H(b).add(fwd(b, 1.2)).add(side(b, -0.8)).add(v3(0, -0.6, 0)), 0.6); } lookAtP(b, H(e), 0.6);
    W.lines.set(0);
  }
  kidsForecourt(t, t > E.dumped + 0.3 ? 'laugh' : 'surprised', name === 'dump' ? CAN().add(v3(0, 3.5, 0)) : LP.clone().add(v3(0, 6, 0)), { laugh: t > E.dumped + 0.3 ? 1 : 0, point: t > E.dumped + 0.3 });
}
// ================= the park memory =================
const PATH = (z) => at(PK, 0, 0, z);
function poseGoose(t, name) {   // L4-5: a goose chases Ezra down the path, he yells "Dad!"; L6-7: Dad there, holding the goose like a baby
  const E = EV, e = W.ezra, d = W.dad, G = W.goose;
  if (name === 'goose' || name === 'yell') {
    const u = (t - E.goose) / (E.there - E.goose), ez = PATH(lerp(-24, -2, u)), gz = PATH(lerp(-30, -5.5, u) - Math.sin(t * 5) * 0.4);
    place(e, ez, 0, sz('ezra')); pose(e, 'run', t * 1.3); e.torso.rotation.x -= 0.1; face(e, t > E.yell - 0.05 ? 'scream' : 'terrified', t, 0.3, { noBlink: true, viseme: talk(5, t, 'dad') });
    lookAtP(e, H(e).add(v3(0, 0.6, 6)), 0.7); if (t < E.yell - 0.4) e.neck.rotation.y = 0.45 * Math.sin(t * 3);
    if (t > E.yell - 0.1) { aimArm(e, 0, H(e).add(side(e, 2.2)).add(v3(0, 1.6, 0)), 0.9); aimArm(e, 1, H(e).add(side(e, -2.2)).add(v3(0, 1.6, 0)), 0.9); }
    G.visible = true; G.position.copy(gz); G.rotation.set(0, 0, 0); G.scale.setScalar(1.0); G.set(t, { run: 1, reach: 0.9, flap: 0.8, honk: Math.abs(Math.sin(t * 6)) > 0.6 ? 1 : 0 });
    W.lines.set(1, ez, v3(0, 0, 1), 3, 0.7);
    return;
  }
  // Dad holding the goose like a baby; Ezra peeking out beside him
  const DP = PATH(1.6).add(v3(0.9, 0, 0)), EP = PATH(-0.4).add(v3(-2.2, 0, 0));
  place(d, DP, -0.15, sz('dad')); pose(d, 'idle', t); place(e, EP, 0.35, sz('ezra')); pose(e, 'idle', t);
  const cr = chestOf(d).add(fwd(d, 0.45)).add(side(d, 0.5)).add(v3(0, -1.15, 0));
  G.visible = true; G.scale.setScalar(0.62); G.position.copy(cr).add(v3(0, -1.0 * 0.62, 0)); G.rotation.set(0, d.root.rotation.y + Math.PI / 2 - 0.35, 0);
  G.set(t, { cradle: true, honk: t > E.there + 0.4 && t < E.there + 1.0 ? Math.abs(Math.sin(t * 9)) : 0, reach: 0.15 });
  aimArm(d, 0, cr.clone().add(side(d, 0.7)).add(v3(0, -0.3, 0)), 1); aimArm(d, 1, cr.clone().add(side(d, -0.9)).add(v3(0, 0.2, 0)), 1);
  if (t > E.passing + 0.2 && t < E.corn) d.root.rotation.y += 0;
  face(d, 'smug', t, 0.5, { viseme: talk(7, t) }); lookAtP(d, t > E.there + 0.3 ? H(d).add(v3(2.6, 0.2, 10)) : H(e), 0.6);
  face(e, t > E.passing ? 'surprised' : 'nervous', t, 0.3); lookAtP(e, H(d), 0.8);
  aimArm(e, 1, chestOf(d).add(side(d, 1.0)).add(v3(0, -1.4, 0)), 0.6);
}
// ================= the corn maze memory =================
const CZ = (x, z) => at(CM, x, 0, z);
function poseCorn(t, name) {   // L8: Ezra lost in the corn, whispers "Dad?"; Dad steps out of a side row behind him and taps his shoulder
  const E = EV, e = W.ezra, d = W.dad;
  const EP = CZ(-0.4, 3.2), turn = smooth(E.tap + 0.05, E.tap + 0.5, t);
  place(e, EP, lerp(0.1, -2.4, turn), sz('ezra')); pose(e, 'idle', t);
  const w = Math.max(0, 1 - Math.abs(t - E.whisp - 0.2) / 0.45);
  face(e, t > E.tap + 0.25 ? 'happy' : t > E.tap ? 'surprised' : 'nervous', t, 0.3, { viseme: t > E.whisp - 0.1 && t < E.whisp + 0.5 ? visemeAt('dad', E.whisp - 0.1, E.whisp + 0.5, t) : undefined });
  if (t < E.tap) { aimArm(e, 0, chestOf(e).add(fwd(e, 0.3)).add(side(e, 0.2)), 0.8); aimArm(e, 1, chestOf(e).add(fwd(e, 0.3)).add(side(e, -0.2)), 0.8); lookAtP(e, EP.clone().add(v3(Math.sin(t * 0.9) * 4, 3.0, 6)), 0.6); }
  else lookAtP(e, H(d), 0.9);
  void w;
  const DA = CZ(9.5, -3.5), DB = CZ(1.7, 1.4), dk = smooth(E.tap - 1.6, E.tap - 0.15, t);
  if (dk <= 0) { d.root.visible = false; return; }
  const dp = lp3(DA, DB, easeOut(dk)); place(d, dp, dk < 1 ? yawTo(DA, DB) : yawTo(DB, EP) + 0.4, sz('dad')); pose(d, dk < 0.98 ? 'walk' : 'idle', t);
  if (t > E.tap - 0.3) aimArm(d, 1, H(e).add(v3(0, -0.85 * SCa(e), 0)).add(side(e, -0.75 * SCa(e))), smooth(E.tap - 0.3, E.tap, t) * (1 - smooth(E.tap + 0.6, E.tap + 1.0, t)));
  face(d, 'happy', t, 0.6); lookAtP(d, H(e), 0.4);
}
// ================= the principal =================
function posePrincipal(t) {   // L9: Dad on the school steps with a whistle, waving the kids in
  const E = EV, d = W.dad, DP = v3(SX + 1.0, 1.26, SCHOOL.front + 2.0);
  place(d, DP, 0.15, sz('dad')); pose(d, 'idle', t); face(d, 'happy', t, 0.5); lookAtP(d, v3(SX - 6, 4, -14), 0.5);
  aimArm(d, 1, H(d).add(side(d, -2.6)).add(fwd(d, 0.4)).add(v3(0, 1.2 + Math.sin(t * 7) * 0.4, 0)), 1);
  W.whistle.visible = true; W.whistle.position.copy(chestOf(d)).add(v3(0, 0.25, 0.15)); W.whistle.rotation.y = d.root.rotation.y;
  [['k2', v3(SX - 8, 0, -22), v3(SX - 2, 0, -36)], ['k3', v3(SX + 6, 0, -18), v3(SX + 2, 0, -36)], ['k4', v3(SX - 12, 0, -16), v3(SX - 4, 0, -32)]].forEach(([k, a, b], i) => { const c = W[k]; walkTo(c, a, b, E.principal - 1 - i * 0.6, E.principal + 5, t, 1, 'walk', sz(k)); face(c, 'happy', t, 0.3 + i * 0.4); });
}
// ================= the alley =================
const A = (x, z) => at(AL, x, 0, z);
const EZA = () => A(-2.4, -5.4), BRA = () => A(4.2, -1.6), DA = () => A(0.9, -3.4);
function poseAlley(t, name) {   // L10-19: Brock corners Ezra, knots the stop sign, taunts; "Dad?"; poof: Dad in an apron with a pancake; the talk; "DAD!"; nothing
  const E = EV, e = W.ezra, b = W.brock, d = W.dad, S = W.alley;
  // the stop sign: Brock ties it while staring at Ezra
  const kn = easeInOut(smooth(E.knot - 0.5, E.knot + 0.5, t)); S.stop.set(kn);
  // Ezra: backs up to the wall, then pressed there
  const back = smooth(E.alley - 0.2, E.alley + 2.2, t), EP = lp3(A(-0.6, 1.6), EZA(), easeOut(back));
  place(e, EP, yawTo(EP, A(-0.4, 8)), sz('ezra')); pose(e, back > 0.02 && back < 0.95 ? 'walk' : 'idle', t * 0.8);
  if (back > 0.02 && back < 0.95) e.root.rotation.y += 0;   // walking backward: the legs still swing
  // Brock: follows him in, stops at BRA
  const bu = smooth(E.alley - 0.2, E.alley + 2.0, t), BP = lp3(A(6.0, 6.0), BRA(), easeOut(bu));
  const poofK = clamp((t - E.poof) / 0.6);
  place(b, BP, yawTo(BP, t > E.poof + 0.3 ? DA() : EZA()), sz('brock')); pose(b, bu > 0.02 && bu < 0.95 ? 'walk' : 'idle', t);
  const Ssign = S.stop.position.clone().add(S.position);
  if (t > E.knot - 0.9 && t < E.knot + 0.9) { S.stop.updateMatrixWorld(true); const mid = S.stop.curve.getPoint(0.45).applyMatrix4(S.stop.matrixWorld); aimArm(b, 1, mid, smooth(E.knot - 0.9, E.knot - 0.6, t) * (1 - smooth(E.knot + 0.6, E.knot + 0.9, t))); }
  // Ezra's face and arms
  const dadHere = t > E.poof + 0.15;
  if (!dadHere) {
    face(e, t > E.whisper - 0.1 ? 'scared' : t > E.knot ? 'terrified' : 'nervous', t, 0.3, { viseme: talk(12, t, 'dad'), closed: t > E.whisper - 0.15 && t < E.poof + 0.1 });
    lookAtP(e, t > E.knot - 0.3 && t < E.knot + 0.8 ? Ssign.clone().add(v3(0, 5, 0)) : H(b), 0.7);
    if (t > E.taunt) { aimArm(e, 0, chestOf(e).add(fwd(e, 0.4)).add(side(e, 0.3)).add(v3(0, 0.3, 0)), 0.8); aimArm(e, 1, chestOf(e).add(fwd(e, 0.4)).add(side(e, -0.3)).add(v3(0, 0.3, 0)), 0.8); }
  } else {
    const nope = t > E.nope - 0.1 && t < E.dadyell;
    face(e, t > E.son ? 'happy' : t > E.means ? 'surprised' : 'shocked', t, 0.3, { viseme: talk(17, t) });
    if (nope) { face(e, 'smug', t, 0.3, { viseme: talk(17, t) }); shrug(e, smooth(E.nope, E.nope + 0.3, t)); }
    lookAtP(e, nope ? H(b) : t > E.cheat - 0.2 && t < E.nope ? H(b) : t > E.land ? H(d) : W.cake.position, 0.8);
    if (t > E.nothing + 0.3) { face(e, 'smug', t, 0.3); lookAtP(e, H(b), 0.6); }
  }
  // Brock's lines and faces
  if (t < E.poof) { face(b, t > E.taunt ? 'smug' : 'grin', t, 0.3, { viseme: talk(11, t) }); lookAtP(b, H(e), 0.8); if (t > E.taunt) { b.torso.rotation.x += 0.18; b.neck.rotation.x += -0.1; aimArm(b, 0, H(e).add(v3(0, -0.6, 0)), smooth(E.taunt + 1.2, E.taunt + 1.6, t) * 0.9); } }
  else if (t < E.cheat - 0.1) { face(b, t > E.office ? 'scared' : 'shocked', t, 0.3); lookAtP(b, H(d), 0.9); b.torso.rotation.x -= 0.12 * smooth(E.poof, E.poof + 0.4, t); }
  else if (t < E.dadyell - 0.05) { face(b, 'angry', t, 0.3, { viseme: talk(16, t) }); lookAtP(b, t < E.nope ? H(d) : H(e), 0.8); if (t < E.nope + 0.2) { aimArm(b, 1, H(d).add(v3(0, -0.5, 0)), 0.8); } }
  else if (t < E.nothing) { b.root.rotation.y = lerp(b.root.rotation.y, yawTo(BP, A(4.5, 12)), smooth(E.dadyell - 0.05, E.dadyell + 0.25, t)); face(b, 'scream', t, 0.3, { viseme: talk(18, t, 'dad'), noBlink: true }); b.neck.rotation.x = -0.3; b.torso.rotation.x -= 0.1; aimArm(b, 0, H(b).add(side(b, 2.4)).add(v3(0, 1.4, 0)), 1); aimArm(b, 1, H(b).add(side(b, -2.4)).add(v3(0, 1.4, 0)), 1); }
  else { const wt = t - E.nothing; face(b, wt > 1.2 ? 'sad' : 'nervous', t, 0.3); lookAtP(b, H(b).add(v3(Math.sin(wt * 2.4) * 6, 1.5, 4)), 0.8); }
  // Dad: appears in a puff between them, apron and bunny slippers, a pancake flipping over the pan
  if (t > E.poof + 0.05) {
    costume(true); const dp = DA(); const turnB = smooth(E.means + 2.0, E.office - 0.05, t);
    const yE = yawTo(dp, A(-6.5, 6.5)), yB = yawTo(dp, BRA()) - 0.6;
    place(d, dp, lerp(yE, yB, turnB), sz('dad')); pose(d, 'idle', t);
    const pop = clamp((t - E.poof - 0.05) / 0.25); d.root.scale.setScalar(sz('dad') * lerp(0.7, 1, easeOut(pop))); d.root.position.y += (1 - pop) * 0.6;
    // the pan in his right hand, held out front at waist height
    const hp = H(d).add(fwd(d, 0.6)).add(side(d, 1.8)).add(v3(0, -2.3, 0));
    aimArm(d, 0, hp, 1); const hand = handOf(d, 0);
    W.pan.visible = true; W.pan.position.copy(hand); W.pan.rotation.set(0, d.root.rotation.y + 1.25, 0);
    W.pan.updateMatrixWorld(true); const pc = W.pan.localToWorld(W.pan.centre.clone());
    // the pancake: flips until it lands at E.land
    const ft = t - E.poof, land = E.land - E.poof; W.cake.visible = true;
    if (ft < land) { const per = 1.05, ph = (ft % per) / per, hgt = Math.sin(ph * Math.PI) * 3.2; W.cake.position.copy(pc).add(v3(0, 0.1 + hgt, 0)); W.cake.rotation.set(ph * Math.PI * 2 * (Math.floor(ft / per) % 2 ? -1 : 1), 0, 0.2); }
    else { W.cake.position.copy(pc).add(v3(0, 0.08, 0)); W.cake.rotation.set(0, 0, 0); }
    // left hand: the spatula point at Brock for his line; a hand on Ezra's shoulder on "a son"
    if (t > E.son - 0.2 && t < E.office) aimArm(d, 1, H(e).add(v3(0, -0.85 * SCa(e), 0)).add(side(e, -0.6 * SCa(e))), smooth(E.son - 0.2, E.son + 0.3, t) * (1 - smooth(E.office - 0.4, E.office, t)));
    if (t > E.office && t < E.cheat) aimArm(d, 1, H(b).add(v3(0, -0.4, 0)), smooth(E.office + 0.1, E.office + 0.5, t) * 0.85);
    const lookP = t < E.poof + 0.9 ? H(d).add(v3(-3, 0.4, 6)) : t < E.land ? W.cake.position : t < E.land + 0.6 ? A(5, 0.5) : t < E.means + 2.0 ? H(e) : t < E.nothing + 0.4 ? H(b) : H(e);
    lookAtP(d, lookP, t < E.land ? 0.35 : t > E.office - 0.1 && t < E.cheat ? 0.1 : 0.6);
    face(d, t > E.nothing + 0.4 ? 'smug' : t > E.office ? 'focused' : t > E.son ? 'happy' : t < E.land ? 'surprised' : 'shocked', t, 0.5, { viseme: talk(15, t) });
  } else { costume(false); }
  W.poof.position.copy(DA()).add(v3(0, 0.5, 0)); W.poof.set(clamp((t - E.poof + 0.05) / 1.1));
  W.burst.update(t);
  // the name sign over their heads: WILSON -> WIL SON -> WILL'S SON
  const sk = t < E.means - 0.1 ? -1 : smooth(E.means + 0.1, E.means + 0.6, t) + smooth(E.means + 0.9, E.means + 1.4, t) - (1 - smooth(E.means - 0.1, E.means + 0.1, t));
  W.nameSign.show(sk); W.nameSign.visible = t > E.means - 0.1 && t < E.office - 0.1; W.nameSign.position.copy(lp3(H(e), H(d), 0.5)).add(v3(0, 3.4, 0));
  // L19: nothing. Dad and Ezra walk off toward the street; a paper bag tumbles past Brock
  if (t > E.nothing + 0.2) {
    const k = smooth(E.nothing + 0.3, E.end, t), A0 = DA(), A1 = A(-3.5, 4.5);
    if (name === 'nothing') { place(d, lp3(A0, A1, k), yawTo(A0, A1), sz('dad')); pose(d, 'walk', t); face(d, 'happy', t, 0.5); const ep = lp3(EZA(), A1.clone().add(v3(-2.2, 0, -0.6)), k); place(e, ep, yawTo(EZA(), A1), sz('ezra')); pose(e, 'walk', t); face(e, 'happy', t, 0.3);
      const hand = handOf(d, 0); W.pan.position.copy(hand); W.pan.rotation.set(0, d.root.rotation.y + 1.25, 0); W.pan.updateMatrixWorld(true); W.cake.position.copy(W.pan.localToWorld(W.pan.centre.clone())).add(v3(0, 0.08, 0)); }
    W.bag.visible = true; const bu2 = (t - E.nothing) / 2.2; W.bag.position.copy(A(lerp(-9, 9, bu2), 0, 4.5)).add(v3(0, 0.45 + Math.abs(Math.sin(bu2 * 9)) * 0.9, 0)); W.bag.rotation.set(bu2 * 9, bu2 * 4, bu2 * 6);
  }
}
// ================= the ending: next morning =================
function poseMorning(t, name) {   // L20-21: Ezra walks to school; Brock (by his own bent lamp post) waves very politely; Dad on the steps with a mug
  const E = EV, e = W.ezra, b = W.brock, d = W.dad;
  W.street.lampPost.set(1);
  const A0 = v3(SX - 22, 0, -12.0), A1 = v3(SX + 1, 0, -14.5); walkTo(e, A0, A1, E.now - 0.4, E.end + 1.2, t, 1, 'walk', sz('ezra')); face(e, 'happy', t, 0.3); lookAtP(e, H(b), 0.6);
  const BP = v3(SX - 9.0, 0, -18.5); place(b, BP, yawTo(BP, e.root.position), sz('brock')); pose(b, 'idle', t);
  const wv = smooth(E.now + 0.2, E.now + 0.6, t); aimArm(b, 1, H(b).add(side(b, -1.9)).add(fwd(b, 0.3)).add(v3(0, 1.0 + Math.sin(t * 8) * 0.25, 0)), wv);
  aimArm(b, 0, chestOf(b).add(side(b, 0.5)).add(fwd(b, 0.2)).add(v3(0, -1.6, 0)), 0.5);
  face(b, 'nervous', t, 0.3, { viseme: talk(21, t) }); b.torso.rotation.x += 0.1 * smooth(E.morning, E.morning + 0.4, t);
  lookAtP(b, H(e), 0.8);
  const DP = v3(SX + 1.0, 1.26, SCHOOL.front + 2.0); place(d, DP, yawTo(DP, BP) + 0.2, sz('dad')); pose(d, 'idle', t); face(d, 'smug', t, 0.5); lookAtP(d, H(b), 0.6);
  aimArm(d, 1, chestOf(d).add(fwd(d, 0.9)).add(side(d, -0.6)).add(v3(0, 0.2 + 0.5 * smooth(E.morning + 1.0, E.morning + 1.4, t), 0)), 1);
  W.mug.visible = true; W.mug.position.copy(handOf(d, 1)).add(v3(0, -0.2, 0)); W.mug.rotation.y = d.root.rotation.y;
  kidsForecourt(t, 'happy', H(b), { spots: [['k2', v3(SX - 4, 0, -24), 0], ['k4', v3(SX + 5, 0, -20), 2]] });
}

// ---- shots ----
function camOn(c, dist, ang = 0, dy = 0, lookDy = -0.7, fov = 54) { const h = H(c), a = c.root.rotation.y + ang * Math.PI / 180, s = SCa(c); return { pos: h.clone().add(v3(Math.sin(a) * dist, dy, Math.cos(a) * dist)), look: h.clone().add(v3(0, lookDy * s, 0)), fov }; }
function shots() {
  const s = (i) => L(i).start, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  // L0-1: the town, the pumpkin, the suit
  add('town', 0, (u) => ({ pos: lp3(v3(-95, 5.6, 27), v3(-94, 5.8, 24.5), easeInOut(u)), look: v3(-80, 4.8, 9), fov: 54 }));
  add('garden', s(1) - 0.05, (u) => ({ pos: v3(-50.5 + u * 0.4, 4.6, -3.5 - u * 0.8), look: v3(-52.8, 3.4, -17.8), fov: 54 }));
  add('tailor', E.tailor - 0.05, (u) => ({ pos: v3(-5.6 + u * 0.4, 3.9, 2.0 - u * 0.8), look: v3(-7.0, 3.6, -10.6), fov: 52 }));
  // L2: Ezra; his try
  add('ezra', s(2) - 0.05, (u) => { const h = H(W.ezra); return { pos: h.clone().add(v3(8.2, 0.6, 7.0)), look: h.clone().add(v3(0.8, -1.2, 0)), fov: 52 }; });
  add('try', E.power - 0.05, (u) => camOn(W.ezra, 8.4 - u * 0.8, 8, 0.4, -1.0, 50));
  // L3: Brock bends the lamp post; Ezra in the trash can
  add('brock', s(3) - 0.05, (u) => ({ pos: v3(SX - 10.6 - u * 0.5, 4.6, -4.2), look: v3(SX - 14.2, 4.4, -14.6), fov: 56 }));
  add('dump', E.called - 0.05, (u) => ({ pos: v3(SX - 11.0 - u * 0.5, 4.6, -3.2), look: v3(SX - 16.4, 3.0, -12.8), fov: 56 }));
  // L4-7: the goose; Dad with the goose
  add('goose', s(4) - 0.05, (u) => { const z = H(W.ezra).z; return { pos: v3(PK.x + 1.6, 3.0, z + 7.6), look: v3(PK.x - 0.2, 2.2, z - 2.0), fov: 54 }; });
  add('yell', s(5) - 0.05, (u) => camOn(W.ezra, 6.4, 8, 0.2, -0.9, 50));
  add('there', s(6) - 0.05, (u) => { const m = PATH(0.8); return { pos: m.clone().add(v3(1.6 - u * 0.4, 5.0, 13.5 - u * 1.0)), look: m.clone().add(v3(-0.4, 3.6, 0)), fov: 50 }; });
  add('passing', s(7) - 0.05, (u) => camOn(W.dad, 8.6 - u * 0.4, 12, 0.0, -1.2, 48));
  // L8: the corn maze
  add('corn', s(8) - 0.05, (u) => ({ pos: CZ(0.4, 15.5 - u * 2.0).add(v3(0, 4.2, 0)), look: CZ(0.2, 1.0).add(v3(0, 3.0, 0)), fov: 54 }));
  add('tap', E.tap - 0.4, (u) => ({ pos: CZ(-0.6, 11.5 - u * 0.5).add(v3(0, 4.4, 0)), look: CZ(0.6, 2.2).add(v3(0, 3.4, 0)), fov: 54 }));
  // L9: the principal
  add('principal', s(9) - 0.05, (u) => ({ pos: v3(SX - 2.0 + u * 0.6, 4.6, SCHOOL.front + 15 - u * 1.2), look: v3(SX + 2.0, 4.6, SCHOOL.front + 1), fov: 56 }));
  // L10-11: the alley; the knot; the taunt
  add('alley', s(10) - 0.05, (u) => ({ pos: A(-3.0, 17 - u * 2.5).add(v3(0, 7.0, 0)), look: A(1.0, -3.0).add(v3(0, 3.2, 0)), fov: 56 }));
  add('knot', E.knot - 0.75, (u) => { const c = camOn(W.brock, 8.0 - u * 0.4, 38, 0.6, 0.2, 58); return c; });
  add('taunt', s(11) - 0.05, (u) => { const h = H(W.brock); return { pos: A(-3.8, -3.1).add(v3(0, 3.8, 0)), look: h.clone().add(v3(0, -0.8, 0)), fov: 50 }; });
  add('whisper', s(12) - 0.25, (u) => camOn(W.ezra, 4.4, -35, 0.2, -0.5, 46));
  // L13-14: poof; the pancake; the name
  add('poof', s(13) - 0.05, (u) => ({ pos: A(-9.0 + u * 0.6, 2.2).add(v3(0, 5.6, 0)), look: A(1.0, -3.4).add(v3(0, 3.4, 0)), fov: 58 }));
  add('pancake', E.apron - 0.1, (u) => camOn(W.dad, 8.5 - u * 0.6, 0, 1.0, -0.4, 56));
  add('means', s(14) - 0.05, (u) => ({ pos: A(-8.0 + u * 0.4, 3.0).add(v3(0, 5.0, 0)), look: A(-0.6, -4.3).add(v3(0, 5.4, 0)), fov: 60 }));
  add('son', E.son - 0.05, (u) => ({ pos: A(-5.0, 5.2 - u * 0.4).add(v3(0, 4.6, 0)), look: A(-0.7, -4.4).add(v3(0, 4.4, 0)), fov: 58 }));
  // L15-19: the office line; cheating; nope; DAD!; nothing
  add('office', s(15) - 0.05, (u) => camOn(W.dad, 8.0 - u * 0.4, -4, -0.2, -0.5, 54));
  add('cheat', s(16) - 0.05, (u) => camOn(W.brock, 7.0, 40, 0.3, -0.6, 52));
  add('nope', s(17) - 0.05, (u) => camOn(W.ezra, 6.2, -20, 0.5, -0.6, 50));
  add('dadyell', s(18) - 0.05, (u) => { const h = H(W.brock); return { pos: h.clone().add(v3(0.6, -1.2, 6.5 - u * 0.6)), look: h.clone().add(v3(0, 0.0, 0)), fov: 60 }; });
  add('nothing', s(19) - 0.05, (u) => ({ pos: A(-1.5, 17 - u * 1.0).add(v3(0, 5.5, 0)), look: A(1.8, -2.0).add(v3(0, 3.0, 0)), fov: 56 }));
  // L20-21: next morning
  add('waves', s(20) - 0.05, (u) => ({ pos: v3(SX - 12.5 + u * 0.8, 4.2, -3.0), look: v3(SX - 10.0, 3.4, -17.0), fov: 58 }));
  add('morning', s(21) - 0.05, (u) => camOn(W.brock, 8.5 - u * 0.5, 32, 0.4, -0.6, 52));
  Sx.sort((a, b) => a.t0() - b.t0());
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
const KEYS = { town: 'town', garden: 'garden', tailor: 'tailor', ezra: 'ezra', try: 'ezra', brock: 'brock', dump: 'brock', goose: 'goose', yell: 'goose', there: 'goose', passing: 'goose',
  corn: 'corn', tap: 'corn', principal: 'principal', alley: 'alley', knot: 'alley', taunt: 'alley', whisper: 'alley', poof: 'alley', pancake: 'alley', means: 'alley', son: 'alley',
  office: 'alley', cheat: 'alley', nope: 'alley', dadyell: 'alley', nothing: 'alley', waves: 'morning', morning: 'morning' };
const SETOF = { goose: 'park', corn: 'corn', alley: 'alley' };

function renderAt(t) {
  let sh = shotAt(W.shots, t); let key = KEYS[sh.name];
  const E = EV;
  if (LINEUP) key = 'lineup';
  if (ctx.thumbMode) key = 'thumb';
  const set = key === 'thumb' ? 'alley' : key === 'lineup' ? 'street' : SETOF[key] || 'street';
  const env = set === 'park' ? MEMORY : set === 'corn' ? GOLD : set === 'alley' ? ALLEYP : key === 'morning' ? MORNING : SUNNY;
  applyEnv(ctx, env);
  W.street.visible = set === 'street'; W.park.visible = set === 'park'; W.corn.visible = set === 'corn'; W.alley.visible = set === 'alley';
  hideAll();
  for (const k of ['goose', 'pan', 'cake', 'whistle', 'mug', 'bag', 'nameSign']) W[k].visible = false;
  W.lines.set(0); W.spark.set(0); W.poof.set(0); costume(false);
  W.street.pumpkin.grow(t < E.blink ? 0 : 1); W.street.mannequin.suit(t < E.sneeze ? 0 : 1); W.street.lampPost.set(t < E.posts ? 0 : 1); W.alley.stop.set(t < E.knot ? 0 : 1);
  W.street.update(t);
  if (key === 'lineup') poseLineup(t);
  else if (key === 'thumb') poseThumb(t);
  else ({ town: () => poseTown(t), garden: () => poseGarden(t), tailor: () => poseTailor(t), ezra: () => poseEzra(t, sh.name), brock: () => poseBrock(t, sh.name), goose: () => poseGoose(t, sh.name),
    corn: () => poseCorn(t, sh.name), principal: () => posePrincipal(t), alley: () => poseAlley(t, sh.name), morning: () => poseMorning(t, sh.name) })[key]();
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  if (key === 'lineup') { const n = LINEUP.length, i = Math.floor(t) % n, hh = H(W['L' + i]), fr = t % 1; const ang = fr < 0.34 ? 0 : fr < 0.67 ? 0.7 : -0.7; sh = { name: 'lineup', pos: hh.clone().add(v3(Math.sin(ang) * 4.2, 0.2, Math.cos(ang) * 4.2)), look: hh.clone().add(v3(0, -0.5, 0)), fov: 46 }; }
  if (Q.get('dbgpos')) console.error('t', t, sh.name, 'cam', sh.pos.toArray().map((x) => x.toFixed(1)).join(','), W.all.filter((c) => c.root.visible).map((c) => c.key + '@' + c.root.position.toArray().map((x) => x.toFixed(1)).join(',')).join(' | '));
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2 * SCa(c), 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * SCa(c); c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2] * SCa(c), Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  if (ctx.thumbMode) { const d = H(W.dad); sh = { ...sh, name: 'thumb', pos: d.clone().add(v3(+(Q.get('tx') || -1.2), +(Q.get('ty') || 0.6), +(Q.get('td') || 11))), look: d.clone().add(v3(+(Q.get('tlx') || 1.4), +(Q.get('tl') || -0.8), 0)), fov: +(Q.get('tf') || 62) }; }
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  if (W.nameSign.visible) W.nameSign.lookAt(sh.pos);
  frame(ctx, t, sh, { steady: t < 3.4 || Q.get('steady') === '1', shake: Math.max(0, 1 - Math.abs(t - E.poof - 0.1) / 0.35) * 0.6, shadowSpan: set === 'street' ? 80 : 60, shadows: true, black: 0,
    flash: Math.max(0, 1 - Math.abs(t - E.poof - 0.08) / 0.2) * 0.7 + Math.max(0, 1 - Math.abs(t - E.goose) / 0.2) * 0.35 + Math.max(0, 1 - Math.abs(t - E.corn) / 0.2) * 0.3 + Math.max(0, 1 - Math.abs(t - E.blink - 0.1) / 0.15) * 0.18, flashColor: '#fff4e0' });
  return sh.name;
}
function poseThumb(t) {   // Dad popping out of the sparkle cloud between Ezra and Brock, the pancake high over the pan
  const E = EV; poseAlley(E.poof + 0.9, 'poof'); W.poof.set(0.35); W.burst.update(E.poof + 0.3);
  const d = W.dad; face(d, 'surprised', 0, 0, { noBlink: true }); face(W.ezra, 'shocked', 0, 0, { noBlink: true }); face(W.brock, 'shocked', 0, 0, { noBlink: true });
  W.alley.stop.set(1);
  W.pan.updateMatrixWorld(true); const pc = W.pan.localToWorld(W.pan.centre.clone()); W.cake.position.copy(pc).add(v3(0, 0.9, 0)); W.cake.rotation.set(0.5, 0, 0.2);
}
function poseLineup(t) {
  const n = LINEUP.length; LINEUP.forEach((k, i) => { const c = W['L' + i]; place(c, at(LU, (i - (n - 1) / 2) * 4.2, 0, 0), 0); pose(c, 'idle', 0); face(c, t % 1 > 0.5 ? 'happy' : 'surprised', 0, 0, { noBlink: true }); });
}

export async function setup() {
  const avs = [...new Set([...Object.values(AV).map((a) => a[0]), ...(LINEUP || [])])];
  ctx = await initStage('ep105', { look: 'pro', avatars: avs }); L = ctx.L;
  try { CAP = (await (await fetch('/build/ep105/timeline.json')).json()).captions || []; } catch (e) { CAP = []; }
  EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'smirk', 'grin', 'focused', 'shocked', 'surprised', 'nervous', 'scared', 'terrified', 'scream', 'laugh', 'angry', 'pain', 'blink']);
  const { scene, camera } = ctx; camera.far = 3000; camera.near = 0.1; camera.updateProjectionMatrix();
  W.street = pebbleStreet(); scene.add(W.street);
  W.park = parkSet(); W.park.position.copy(PK); scene.add(W.park);
  W.corn = cornMaze(); W.corn.position.copy(CM); scene.add(W.corn);
  W.alley = alley(); W.alley.position.copy(AL); scene.add(W.alley);
  W.street.lampPost.position.set(SX - 12.45, 0, -15.7); W.street.lampPost.rotation.y = 0; W.street.can.position.set(SX - 17.8, 0, -12.6);
  W.alley.stop.position.set(4.7, 0, -3.6);
  W.goose = goose(); scene.add(W.goose);
  W.pan = fryingPan(); scene.add(W.pan); W.cake = pancake(); scene.add(W.cake);
  W.whistle = whistle(); scene.add(W.whistle); W.mug = coffeeMug(); scene.add(W.mug);
  W.nameSign = wilsonSign(); scene.add(W.nameSign); W.poof = poofCloud(); scene.add(W.poof);
  W.burst = burst(scene, { count: 120, color: '#ffe27a', pos: at(AL, 0.9, 0.5, -3.4), spread: 2.2, height: 6, dur: 1.4 }); W.burst.fire(EV.poof);
  W.bag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.6), new THREE.MeshStandardMaterial({ color: '#c8a070', roughness: 0.9 })); W.bag.castShadow = true; scene.add(W.bag);
  W.lines = speedLines(); scene.add(W.lines); W.spark = sparkle(); scene.add(W.spark);
  people();
  if (LINEUP) LINEUP.forEach((a, i) => { const c = makeCharacter({ avatar: a, alti: true, skin: skinOf(a), caustic: false, scale: 0.86 }); scene.add(c.root); jointify(c); c.key = 'L' + i; W['L' + i] = c; W.all.push(c); });
  W.shots = shots();
  window.__ep105 = { W, THREE, ctx, L, EV };
  return expose(ctx, renderAt, EV.poof + 0.9, EV);
}
