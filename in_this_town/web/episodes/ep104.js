// Flower Man remake 4: The Sloth Bite. In Copper Hollow whichever animal bites you first gives you its power: gecko kids walk up walls,
// skunk kids win every argument, and pet shops cost more than mansions. Hazel was bitten at three, by a sloth, so the whole school calls her
// Slowpoke (even her little brother Bo, a parrot kid). Yet near her dodgeballs drift like soap bubbles and the lunch clock crawls. Zane, bitten
// by a hare, zips through lunch snatching cookies and phones, then grabs Hazel's sketchbook: "Come get it, Slowpoke!" She glares, and his laugh
// stretches like taffy: to a sloth the world rushes, so her power is making things slow. She keeps staring; Zane hangs mid-leap; she takes
// everything back, turns him toward the fountain and blinks. He sprints full speed into the water. "Take your time." Now everyone studies
// their shoes when she walks by.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, frame, expose, P, DAY } from '../engine/stage.js';
import { shotAt } from '../engine/stage.js';
import { jointify } from '../engine/infinitetower.js';
import { FARM } from '../engine/farm_cast.js';
import { hollowStreet, pettingZoo, courtyard, sloth, bird, sketchbook, cookie, phone, dodgeball, speedLines, slowBubble, gazeRipples, splash, stinkCloud, sparkle, SHOP, FOUNT } from '../engine/slothbite.js';

const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV, CAP = [];
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const LINEUP = Q.get('lineup') ? Q.get('lineup').split(',') : null;
// [avatar, scale, head scale]
const AV = {
  hazel: ['farm_ep39_sophie_b', 0.8], tod: ['farm_ep39_sophie_b', 0.5, 1.3], zane: ['farm_kai', 0.84], bo: ['farm_ep31_boy', 0.6, 1.15],
  gecko: ['farm_grayson', 0.78], skunk: ['farm_ep30_boy', 0.78], nora: ['farm_ep35_nora', 0.78], rosa: ['farm_red_kid', 0.74],
  keeper: ['farm_grandpa', 1], oldman: ['farm_old_man', 1],
  k1: ['farm_mia', 0.8], k2: ['farm_ep31_sadie', 0.8], k3: ['farm_ep31_teen', 0.82], k4: ['farm_memory_girl', 0.78], k5: ['farm_ep29_kid', 0.76],
};
for (const k of Object.keys(AV)) if (Q.get(k)) AV[k][0] = Q.get(k);
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';

const ZP = v3(0, 0, -900), SC = v3(900, 0, 0), LU = v3(0, 0, -1800);   // the zoo memory, the school courtyard, lineup
const at = (o, x, y, z) => o.clone().add(v3(x, y, z));

const SUNNY = { ...DAY, ...P({ top: '#2f93ee', horizon: '#d2efff', haze: '#d8f0ff', sunColor: '#fff3dc', hemiSky: '#d6edff', hemiGround: '#d4dfa4' }), sunDir: v3(0.35, 0.8, 0.5), sunI: 2.2, sunDisc: 0, hemiI: 1.12, amb: 0.3, envI: 1.0, exposure: 1.0, bloom: 0.03, vig: 0, saturation: 1.2, contrast: 1.05, bounce: 0.18, fogNear: 300, fogFar: 1100, stars: 0, moon: 0, win: 0, lamp: 0 };
const YARD = { ...SUNNY, sunDir: v3(-0.45, 0.78, 0.55) };
const MEMORY = { ...SUNNY, ...P({ top: '#7fb8e8', horizon: '#ffe8c4', haze: '#fbe6c8', sunColor: '#ffe6b8', hemiSky: '#f4e6cc', hemiGround: '#c8b07a' }), sunDir: v3(0.4, 0.75, 0.55), sunI: 2.0, hemiI: 1.15, saturation: 0.78, contrast: 1.04, exposure: 1.04 };
const SLOW = { ...YARD, ...P({ top: '#3f8fd8', horizon: '#c8f4ee', haze: '#c8f0ea', sunColor: '#e8fff8', hemiSky: '#cfeff0', hemiGround: '#a8c8a8' }), sunI: 2.0, saturation: 0.9, contrast: 1.07, exposure: 1.0 };

const capT = (word, after = 0) => { const c = CAP.find((x) => x.start >= after - 0.01 && x.text.toUpperCase().replace(/[“”"]/g, '').includes(word)); return c ? c.start : after; };
function events() {
  const s = (i) => L(i).start;
  const E = {
    open: s(0), power: capT('ITS POWER', s(0)), gecko: s(1), skunk: capT('WALLS. SKUNK', s(1)) + 0.5, argue: capT('EVERY ARGUMENT', s(1)),
    shops: s(2), mansions: capT('THAN MANSIONS', s(2)), three: s(3), slothw: capT('A SLOTH', s(3)),
    school: s(4), slow1: capT('HER SLOWPOKE', s(4)), brother: s(5), parrot: capT('A PARROT', s(5)), bo: s(6),
    yet: s(7), dodge: capT('DODGEBALLS', s(7)), clock: capT('BUBBLES, AND', s(7)) + 0.6,
    zane: s(8), hare: capT('A HARE', s(8)), faster: capT('AND NOBODY', s(8)), zip: s(9), snatch: capT('SNATCHING', s(9)), grab: s(10), taunt: s(11),
    laughed: s(12), glared: capT('HAZEL GLARED', s(12)), taffy: capT('EVER, AND HIS', s(12)) + 0.35,
    real: s(13), rushes: capT('THE WORLD RUSHES', s(13)), power2: capT("HER POWER WASN'T", s(13)), making: capT('SLOW. IT WAS', s(13)) + 0.35,
    kept: s(14), hung: capT('ZANE HUNG', s(14)), stroll: s(15), took: capT('TOOK EVERYTHING', s(15)),
    turned: s(16), fount: capT('THE FOUNTAIN', s(16)), blink: capT('AND BLINKED', s(16)) + 0.25,
    sprint: s(17), water: capT('STRAIGHT INTO', s(17)), take: s(18), nobody: s(19), walks: capT('NOW. WHEN HAZEL', s(19)), shoes: capT('BY, EVERYONE', s(19)), end: ctx.dur,
  };
  E.U0 = E.sprint - 0.1;           // Zane snaps back to normal speed
  E.splash = E.U0 + 1.45;
  return E;
}

// ---- helpers ----
const SCa = (c) => (c.spec.scale || 1) * c.root.scale.x;
const armLen = (c) => { if (!c._alen) { c.reset(); const r = c.root.rotation.clone(), p = c.root.position.clone(), s0 = c.root.scale.x; c.root.scale.setScalar(1); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3(); c.arms[0].traverse((o) => { if (o.isMesh && !o.userData.worn) bx.expandByObject(o); }); c._alen = sh.y - bx.min.y - 0.12 * (c.spec.scale || 1); c.root.rotation.copy(r); c.root.position.copy(p); c.root.scale.setScalar(s0); c.root.updateMatrixWorld(true); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.arms[side].localToWorld(v3(0, -armLen(c) / s, 0.1)); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.scale.set(1, 1, 1); c.head.rotation.set(0, 0, 0); c.arms.forEach((a) => a.quaternion.identity()); c.legs.forEach((l) => l.rotation.set(0, 0, 0)); c.hips.position.y = c.hipY ?? 2; c.torso.rotation.set(0, 0, 0); c.neck.rotation.set(0, 0, 0); }
function place(c, p, yaw, size = 1) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; c.root.scale.setScalar(size); }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const H = (c) => { c.root.updateMatrixWorld(true); return c.neck.getWorldPosition(v3()).add(v3(0, 0.8 * SCa(c), 0)); };
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.closed ? true : o.noBlink ? false : blinkAt(t, ph), viseme: o.viseme, gaze: o.gaze }); }
const talk = (i, t, txt) => (t > L(i).start && t < L(i).end ? visemeAt(txt || L(i).text.replace(/[“”]/g, ''), L(i).start, L(i).end, t) : undefined);
function lookAtP(c, p, k = 1) { c.root.updateMatrixWorld(true); const n = c.neck.getWorldPosition(v3()), a = wrap(yawTo(n, p) - c.root.rotation.y); c.neck.rotation.y = clamp(a, -1.2, 1.2) * k; c.neck.rotation.x = -Math.atan2(p.y - n.y - 0.6 * SCa(c), Math.hypot(p.x - n.x, p.z - n.z)) * 0.6 * k; }
function walkTo(c, a, b, t0, t1, t, speed = 1, kind = 'walk', size = 1) { const u = clamp((t - t0) / (t1 - t0)); const p = lp3(a, b, u); place(c, p, yawTo(a, b), size); pose(c, u > 0 && u < 1 ? kind : 'idle', t * speed); return u; }
const fwd = (c, d = 1) => v3(Math.sin(c.root.rotation.y), 0, Math.cos(c.root.rotation.y)).multiplyScalar(d);
const side = (c, d = 1) => { const f = fwd(c); return v3(f.z, 0, -f.x).multiplyScalar(d); };   // the character's left
const chestOf = (c) => H(c).add(v3(0, -1.55 * SCa(c), 0)).add(fwd(c, 0.85 * SCa(c)));
const sz = (k) => AV[k][1];
function sitOn(c, p, yaw, size, seatY) { place(c, p, yaw, size); pose(c, 'sit', 0); c.root.updateMatrixWorld(true); const hy = c.hips.getWorldPosition(v3()).y; c.root.position.y += seatY + 0.55 * SCa(c) - hy; }
function stand(k, p, yaw, t, ex = 'happy', ph = 0.3) { const c = W[k]; place(c, p, yaw, sz(k)); pose(c, 'idle', t + ph * 3); face(c, ex, t, ph); return c; }
function laughBob(c, t, amp = 1) { c.torso.rotation.x += Math.abs(Math.sin(t * 9)) * 0.12 * amp; c.neck.rotation.x -= Math.abs(Math.sin(t * 9)) * 0.1 * amp; }
function pointAt(c, side, p, k = 1) { aimArm(c, side, p, k); }
function holdAt(obj, c, side, off = v3(0, 0, 0)) { obj.visible = true; obj.position.copy(handOf(c, side)).add(off); }

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
}
function hideAll() { W.all.forEach((c) => { c.root.visible = false; }); }

// ================= the street =================
const SH = (x, y, z) => v3(SHOP.x + x, y, SHOP.z + z);
function poseTown(t) {   // L0: the street; a falcon on the keeper's glove nips the rich kid's finger, a sparkle
  const E = EV, kp = W.keeper, r = W.rosa;
  const glove = W.street.perch.clone(); W.falcon.visible = true; W.falcon.position.copy(glove); W.falcon.rotation.y = -1.9;
  const RP = SH(7.6, 0, 2.6); place(r, RP, yawTo(RP, glove.clone().setY(0)) + 0.25, sz('rosa')); pose(r, 'idle', t);
  const peck = E.power + 0.1, pk = Math.max(0, 1 - Math.abs(t - peck) / 0.25);
  const fing = glove.clone().add(v3(-0.7, 0.7, 0.5)); aimArm(r, 1, fing, smooth(E.open + 1.8, E.open + 2.6, t));
  W.falcon.set(t, { flap: t > peck ? Math.max(0, 1 - (t - peck) * 1.5) : 0.1, beak: pk, tilt: pk * 0.4 });
  W.falcon.head.rotation.x += pk * 0.7;
  W.spark.position.copy(handOf(r, 1)); W.spark.set(clamp((t - peck) / 0.9));
  face(r, t > peck + 0.3 ? 'grin' : t > peck ? 'shocked' : 'nervous', t, 0.3); lookAtP(r, handOf(r, 1), 0.6); void kp;
  // passers-by on the far sidewalk
  const u = (t * 0.06) % 1; place(W.oldman, v3(-30 + u * 12, 0, 8.5), Math.PI / 2, 1); pose(W.oldman, 'walk', t * 0.8); face(W.oldman, 'happy', t, 0.6);
  geckoWall(t);
}
const WALL = () => W.street.wall;
function geckoWall(t) {   // the gecko kid strolling up the apartment block's face (feet on the wall, head up)
  const c = W.gecko, E = EV, y = 9 + Math.max(0, t - E.open + 2) * 1.1;
  place(c, v3(WALL().x - 2.5, y, WALL().z + 0.75 * sz('gecko')), Math.PI, sz('gecko')); pose(c, 'idle', t);
  const cl = Math.sin(t * 4.2);   // a lizard climb: opposite hand and foot reach together
  aimArm(c, 0, H(c).add(side(c, 1.6)).add(v3(0, 1.4 + cl * 0.7, 0)).add(fwd(c, 0.5)), 1); aimArm(c, 1, H(c).add(side(c, -1.6)).add(v3(0, 1.4 - cl * 0.7, 0)).add(fwd(c, 0.5)), 1);
  c.legs[0].rotation.z = -0.45; c.legs[1].rotation.z = 0.45; c.legs[0].rotation.x = -0.35 - cl * 0.35; c.legs[1].rotation.x = -0.35 + cl * 0.35; c.knee[0].rotation.x = 0.5; c.knee[1].rotation.x = 0.5;
  c.neck.rotation.y = 1.15; c.neck.rotation.x = 0.1; face(c, 'smug', t, 0.5);
}
function poseGecko(t) { geckoWall(t); const c = W.gecko; c.root.position.y = 9.0 + (t - EV.gecko) * 1.25; place2(c); }
function place2(c) { c.root.updateMatrixWorld(true); }
function poseSkunk(t) {   // L1b: the skunk kid wins the argument: a green cloud, Nora gags and backs off
  const E = EV, s = W.skunk, n = W.nora;
  const SP = v3(-5.6, 0, 6.2), NP0 = v3(-1.8, 0, 6.6), back = smooth(E.argue - 0.2, E.argue + 0.9, t), NP = lp3(NP0, v3(-0.7, 0, 8.6), back);
  place(s, SP, yawTo(SP, NP0) - 0.9, sz('skunk')); pose(s, 'idle', t); face(s, t > E.argue ? 'smug' : 'smirk', t, 0.4, { viseme: t < E.skunk + 0.7 ? visemeAt('nope wrong', E.skunk - 0.3, E.skunk + 0.6, t) : undefined });
  aimArm(s, 0, H(s).add(fwd(s, 1.5)).add(side(s, 1.3)).add(v3(0, -0.6, 0)), 0.8);   // a shrug
  place(n, NP, yawTo(NP, SP) + 0.8, sz('nora')); pose(n, back > 0.05 && back < 0.95 ? 'walk' : 'idle', t);
  face(n, t > E.argue - 0.3 ? 'pain' : 'angry', t, 0.3, { viseme: t < E.skunk ? visemeAt('but i said', E.skunk - 1.0, E.skunk - 0.1, t) : undefined });
  if (t > E.argue - 0.4) aimArm(n, 1, H(n).add(fwd(n, 1.3)).add(v3(Math.sin(t * 16) * 0.4, -0.4, 0)), smooth(E.argue - 0.4, E.argue - 0.1, t));   // fanning the smell
  lookAtP(s, H(n), 0.6); lookAtP(n, t > E.argue - 0.3 ? v3(-3.7, 3.9, 18) : H(s), 0.8);
  W.stink.position.copy(SP); W.stink.set(t, smooth(E.skunk - 0.2, E.skunk + 0.6, t), NP0.clone().sub(SP).normalize());
}
function poseShop(t) {   // L2: the window: the price boards; the old man's jaw drops; the falcon on its perch inside
  const E = EV, o = W.oldman, OP = SH(-11.6, 0, 3.6); place(o, OP, yawTo(OP, W.street.board.clone().setY(0)) + 0.3, 1); pose(o, 'idle', t);
  face(o, t > E.mansions - 0.1 ? 'shocked' : 'surprised', t, 0.5); lookAtP(o, t > E.mansions - 0.1 ? SH(-1.5, 6.0, 12) : W.street.board.clone().add(v3(0, -0.3, 0)), 0.9);
  if (t > E.mansions) aimArm(o, 1, H(o).add(v3(0, -0.5, 0)).add(fwd(o, 0.8)), smooth(E.mansions, E.mansions + 0.3, t));   // hand to the cheek
  W.falcon.visible = true; W.falcon.position.copy(W.street.perch); W.falcon.rotation.y = -0.4; W.falcon.set(t, { tilt: Math.sin(t * 1.3) * 0.2 });
}
// ================= the zoo memory =================
const BR = (u) => { const b = W.zoo.branch; return at(ZP, lerp(b.x0, b.x1, u), b.y, b.z); };
function poseZoo(t, name) {   // L3: toddler Hazel reaches up; the sloth takes an age to bite her finger. L13: the world rushes past the sloth
  const E = EV, sl = W.sloth, tod = W.tod;
  sl.visible = true; const grip = BR(0.62); sl.position.copy(grip); sl.rotation.y = 0.15;
  if (name === 'rush') {   // the sloth hangs, blinking slowly, while kids race round the pen in fast-forward
    sl.set(t * 0.4, { blink: (t % 3) < 0.7, nod: 0.25, turn: Math.sin(t * 0.3) * 0.2 });
    [['k5', 0], ['k4', 2.1], ['skunk', 4.2]].forEach(([k, ph]) => { const a = t * 3.2 + ph, p = at(ZP, Math.cos(a) * 6 - 0.5, 0, Math.sin(a) * 3.5 + 3); const c = W[k]; place(c, p, a + Math.PI, sz(k)); pose(c, 'run', t * 3); face(c, 'laugh', t, ph); });
    return;
  }
  const bite = E.slothw + 0.05, u = smooth(E.three, bite, t);
  sl.set(t, { reach: 0, nod: 0.3 + u * 0.25, turn: -0.3 * u, bite: Math.max(0, 1 - Math.abs(t - bite) / 0.5) });
  // the toddler on tiptoes under the branch, her finger up
  const TP = at(ZP, grip.x - ZP.x + 1.5, 0, grip.z - ZP.z + 1.7); place(tod, TP, yawTo(TP, grip.clone().setY(0)), sz('tod')); pose(tod, 'idle', t);
  const mouth = sl.mouthWorld(); const reachK = smooth(E.three + 0.2, E.three + 0.9, t);
  aimArm(tod, 1, mouth.clone().add(v3(0, -0.2, 0.2)), reachK); tod.root.position.y += reachK * 0.12;
  face(tod, t > bite + 0.15 ? 'shocked' : 'happy', t, 0.3); lookAtP(tod, mouth, 0.9);
  W.spark.position.copy(handOf(tod, 1)); W.spark.set(clamp((t - bite) / 1.6));
  // a grown-up in the background, phone out
  stand('keeper', at(ZP, 7, 0, 7), yawTo(at(ZP, 7, 0, 7), TP), t, t > bite ? 'shocked' : 'happy', 0.5); lookAtP(W.keeper, H(tod), 0.6);
}
// ================= the courtyard =================
const C = (x, y, z) => at(SC, x, y, z);
const FC = () => C(0, 0, 0);
const BENCH = () => C(W.yard.bench.x, 0, W.yard.bench.z);
const HZ = () => C(4, 0, 15.6);            // Hazel stands up here, facing Zane
const ZT = () => C(-4.2, 0, 10.6);         // Zane taunts from here
const ZL = () => C(-6.2, 0, 10.9);         // ... and is frozen here, mid-leap
const HS = () => ZL().add(v3(2.4, 0, 2.0));   // Hazel's spot beside the frozen Zane
const DIR = () => FC().sub(ZL()).setY(0).normalize();
const takeCam = () => { const w = ZW(), d = HS().sub(w).setY(0).normalize(), sd = v3(-d.z, 0, d.x); return w.clone().add(d.multiplyScalar(3.2)).add(sd.multiplyScalar(2.6)).add(v3(0, 4.8, 0)); };
const ZW = () => ZL().add(DIR().multiplyScalar(ZL().distanceTo(FC()) - 4.3));   // where he lands in the basin
const TABLE = (i) => { const tb = W.yard.tables[i]; return C(tb.x, 0, tb.z); };
const LUNCH = [['k1', -2.6], ['k2', 0.2], ['k5', 2.8]];   // kids on table 0's front bench (facing +z)
function lunchKids(t, o = {}) {
  LUNCH.forEach(([k, dx], i) => { const c = W[k]; sitOn(c, TABLE(0).add(v3(dx, 0, -2.6)), 0, sz(k), 1.3); face(c, o.face ? o.face(i) : 'happy', t, 0.3 + i * 0.5); if (o.look) lookAtP(c, o.look, 0.7); });
}
function lootHome(i) { const tb = TABLE(0); return tb.add(v3(-3 + i * 1.5, 2.45, -0.4)); }
function yardCommon(t) { W.yard.setJets(t); W.yard.clock.set(13, (t * 0.9) % 60); }
function crowd(t, ex, look, o = {}) {   // standing onlookers round the courtyard
  const spots = o.spots || [['k3', C(-12, 0, 17), 0], ['k4', C(-9.5, 0, 19.5), 1], ['gecko', C(13, 0, 9.5), 2], ['nora', C(11, 0, 6.5), 3], ['rosa', C(-13, 0, 13.5), 4]];
  spots.forEach(([k, p, i]) => { const c = W[k]; place(c, p, yawTo(p, look) + (o.yawOff || 0), sz(k)); pose(c, 'idle', t + i); face(c, typeof ex === 'function' ? ex(i) : ex, t, 0.3 + i * 0.4); lookAtP(c, look.clone().setY(H(c).y), 0.5);
    if (o.laugh) { laughBob(c, t + i * 0.2, o.laugh); } if (o.point && i % 2 === 0) pointAt(c, 1, look.clone().add(v3(0, 3, 0)), 0.9); });
}
function poseSchool(t) {   // L4: Hazel crosses the courtyard with her sketchbook; kids point and laugh
  const E = EV, h = W.hazel; yardCommon(t);
  const A = C(28, 0, 34), B = C(10, 0, 27);
  walkTo(h, A, B, E.school - 0.6, E.brother + 0.8, t, 1, 'walk', sz('hazel')); face(h, 'bored', t, 0.3);
  holdBook(h, t, 'hug');
  crowd(t, 'laugh', H(h), { laugh: 1, point: true, spots: [['k3', C(13.5, 0, 26.5), 0], ['k4', C(16.5, 0, 25), 1], ['gecko', C(22.5, 0, 25.5), 2], ['nora', C(25, 0, 27), 3]] });
}
function holdBook(h, t, how) {   // the sketchbook in Hazel's hands: 'hug' at the chest, 'draw' on the lap / in front
  const ch = chestOf(h);
  if (how === 'hug') { const p = ch.clone().add(fwd(h, 0.35)).add(v3(0, -0.4, 0)); aimArm(h, 0, p.clone().add(side(h, 0.45)), 1); aimArm(h, 1, p.clone().add(side(h, -0.45)), 1); W.book.visible = true; W.book.position.copy(p).add(fwd(h, 0.25)); W.book.rotation.set(0, h.root.rotation.y, 0); }
  else { const p = ch.clone().add(fwd(h, 1.0)).add(v3(0, -1.1, 0)); aimArm(h, 0, p.clone().add(side(h, 0.5)), 1); aimArm(h, 1, p.clone().add(side(h, -0.4)).add(v3(Math.sin(t * 7) * 0.12, Math.cos(t * 9) * 0.08, 0)), 1); W.book.visible = true; W.book.position.copy(p).add(v3(0, 0.15, 0)); W.book.rotation.set(-1.0, h.root.rotation.y, 0, 'YXZ'); }
}
const BO = () => C(3.3, FOUNT.rimH, 4.7);   // Bo stands on the fountain rim
function poseBo(t) {   // L5-6: Bo on the fountain rim, the parrot on his shoulder: "Slowpoke! Slowpoke!"
  const E = EV, b = W.bo, h = W.hazel; yardCommon(t);
  const A = C(10, 0, 27), B = C(10.5, 0, 12);
  walkTo(h, A, B, E.brother - 0.2, E.bo + 2.4, t, 1, 'walk', sz('hazel')); h.root.rotation.y = yawTo(A, B); face(h, t > E.bo ? 'bored' : 'neutral', t, 0.3); holdBook(h, t, 'hug'); lookAtP(h, H(b), t > E.bo ? 0.5 : 0.2);
  place(b, BO(), yawTo(BO(), H(h).setY(0)) , sz('bo')); pose(b, 'idle', t); const yelling = t > E.bo && t < L(6).end + 0.2;
  face(b, yelling ? 'laugh' : 'grin', t, 0.4, { viseme: talk(6, t) });
  if (yelling) { const fl = Math.sin(t * 16) * 0.5; b.arms[0].rotation.z -= 1.1 + fl; b.arms[1].rotation.z += 1.1 + fl; b.root.position.y += Math.abs(Math.sin(t * 8)) * 0.18; }
  else pointAt(b, 1, H(h), smooth(E.parrot - 0.2, E.parrot + 0.2, t));
  lookAtP(b, H(h), 0.6);
  // the parrot on his left shoulder
  b.root.updateMatrixWorld(true); const sh = H(b).add(side(b, 0.95 * SCa(b))).add(v3(0, -1.15 * SCa(b), 0)).add(fwd(b, -0.1));
  W.parrot.visible = true; W.parrot.position.copy(sh); W.parrot.rotation.y = b.root.rotation.y + 0.3; W.parrot.scale.setScalar(0.55);
  W.parrot.set(t, { flap: yelling ? 1 : 0, beak: yelling ? Math.abs(Math.sin(t * 11)) : (t > E.parrot && t < E.parrot + 0.5 ? 0.8 : 0), tilt: yelling ? 0 : 0.3 });
}
function poseDodge(t) {   // L7a: a dodgeball drifts at Hazel like a soap bubble; she steps aside, bored
  const E = EV, h = W.hazel, k = W.k3, Cc = W.yard.court; yardCommon(t);
  const HP0 = C(Cc.x - 7, 0, Cc.z), KP = C(Cc.x + 6.5, 0, Cc.z + 0.5); const step = smooth(E.dodge + 1.4, E.dodge + 2.0, t);
  place(h, lp3(HP0, HP0.clone().add(v3(0, 0, 1.9)), step), Math.PI / 2 - 0.1, sz('hazel')); pose(h, step > 0.05 && step < 0.95 ? 'walk' : 'idle', t); face(h, 'bored', t, 0.3);
  place(k, KP, -Math.PI / 2 + 0.15, sz('k3')); pose(k, 'idle', t); const thr = E.dodge - 0.5;
  aimArm(k, 1, H(k).add(fwd(k, 1.6)).add(v3(0, t < thr ? 1.2 : -0.6, 0)), 1); face(k, t > thr + 1 ? 'shocked' : 'focused', t, 0.4); lookAtP(k, W.ball.position, 0.7);
  // the ball: thrown hard, then floating
  const a = handOf(k, 1).add(fwd(k, 0.6)), b = H(h).add(v3(0, -0.9, 0)).add(v3(-6, 0, 0));
  const u = t < thr ? 0 : clamp((t - thr) / 2.6); const pB = lp3(a, b, u); pB.y += Math.sin(u * Math.PI) * 0.6 + Math.sin(t * 2.3) * 0.12;
  W.ball.visible = true; W.ball.position.copy(pB); const wob = 1 + Math.sin(t * 5.1) * 0.06; W.ball.scale.set(wob, 2 - wob, wob); W.ball.rotation.y = t * 0.3;
  lookAtP(h, pB, 0.6);
  [['k4', C(Cc.x - 3, 0, Cc.z - 7.5)], ['k5', C(Cc.x + 1, 0, Cc.z - 8.0)]].forEach(([kk, p], i) => { const c = W[kk]; place(c, p, yawTo(p, pB), sz(kk)); pose(c, 'idle', t + i); face(c, 'bored', t, 0.3 + i); lookAtP(c, pB, 0.5); });
}
function poseClock(t) { yardCommon(t); const E = EV, sec = 13 * 60 + (t - E.clock) * 0.35; W.yard.clock.set(13 + (sec % 60) / 60 * 0.02, sec % 60);
  lunchKids(t, { face: (i) => ['sleepy', 'bored', 'sleepy'][i] }); LUNCH.forEach(([k], i) => { const c = W[k]; c.neck.rotation.x = -0.45; if (i !== 1) { aimArm(c, 1, H(c).add(fwd(c, 0.6)).add(v3(0, -0.7, 0)), 0.8); } });
  const h = W.hazel; place(h, C(-9, 0, -12), Math.PI + 0.2, sz('hazel')); pose(h, 'idle', t); face(h, 'focused', t, 0.4); lookAtP(h, C(0, 20, -25), 0.9); }
// --- Zane ---
const zT = (t) => { const E = EV, S0 = E.taffy, F0 = E.kept, U0 = E.U0, k1 = 0.02, k2 = 0.004;   // Zane's own clock: real, stretched, nearly stopped, real again
  if (t < S0) return t; const a = S0 + (Math.min(t, F0) - S0) * k1; if (t < F0) return a; const b = a + (Math.min(t, U0) - F0) * k2; if (t < U0) return b; return b + (t - U0); };
function poseZaneIntro(t, name) {   // L8: Zane by the school door; he crouches, then rockets round the fountain
  const E = EV, z = W.zane; yardCommon(t);
  const ZD = C(-4, 0, -22.5);
  if (t < E.hare + 0.45) { place(z, ZD, 0.35, sz('zane')); pose(z, 'idle', t); const crouch = smooth(E.hare - 0.1, E.hare + 0.35, t); z.hips.position.y -= crouch * 0.5; z.torso.rotation.x += crouch * 0.5; z.legs.forEach((l) => { l.rotation.x -= crouch * 0.4; }); face(z, crouch > 0.3 ? 'focused' : 'smug', t, 0.3); lookAtP(z, C(-5, 5, -8), 0.5); aimArm(z, 0, H(z).add(v3(0, -1.2, 0)).add(side(z, 1.2)).add(fwd(z, -0.3)), 0.6); W.lines.set(0);
    if (t > E.hare + 0.3) { W.lines.set(1, z.root.position, fwd(z), 4); } return; }
  // the loop: 2.3 laps round the fountain at r = 11 in under two seconds
  const u = (t - E.hare - 0.45) / 1.9; const a = -1.9 + u * Math.PI * 2 * 0.9, R = 10.5; const p = FC().add(v3(Math.cos(a) * R, 0, Math.sin(a) * R));
  const dir = v3(-Math.sin(a), 0, Math.cos(a)); place(z, p, Math.atan2(dir.x, dir.z), sz('zane')); pose(z, 'run', t * 2.2); z.torso.rotation.x += 0.25; face(z, 'grin', t, 0.3);
  W.lines.set(1, p, dir, 7);
  lunchKids(t, { look: H(z) });
}
const LOOTN = 5;
function poseLunch(t) {   // L9: he zips along table 0 snatching cookies and phones, stops grinning with the loot
  const E = EV, z = W.zane; yardCommon(t);
  const A = TABLE(0).add(v3(-14, 0, 2.2)), B = TABLE(0).add(v3(2.6, 0, 2.8)), t0 = E.zip + 0.15, t1 = E.snatch + 0.4;
  const u = clamp((t - t0) / (t1 - t0)), p = lp3(A, B, easeInOut(u));
  place(z, p, Math.PI / 2, sz('zane')); pose(z, u > 0 && u < 1 ? 'run' : 'idle', t * (u < 1 ? 2.4 : 1)); if (u > 0 && u < 1) z.torso.rotation.x += 0.25;
  W.lines.set(u > 0.02 && u < 0.98 ? 1 : 0, p, v3(1, 0, 0), 6);
  if (u >= 1) { z.root.rotation.y = yawTo(p, C(-17, 0, 20)) ; face(z, 'grin', t, 0.3); lookAtP(z, C(-17, 5, 22), 0.4); }
  else face(z, 'grin', t, 0.3);
  lunchKids(t, { face: (i) => (p.x > TABLE(0).x + LUNCH[i][1] - 0.5 ? 'shocked' : 'happy'), look: u < 1 ? TABLE(0).add(v3(0, 2.6, 0)) : H(z) });
  W.loot.forEach((o, i) => { const kidI = i % 3, c = W[LUNCH[kidI][0]]; const gone = p.x > TABLE(0).x + LUNCH[kidI][1] - 0.8;
    if (!gone) { aimArm(c, 1, chestOf(c).add(fwd(c, 1.2)).add(v3(0, 0.3, 0)), 0.9); holdAt(o, c, 1, v3(0, 0.25 + Math.floor(i / 3) * 0.3, 0.3)); o.rotation.set(i % 2 ? 0 : -0.4, 0, 0); }
    else lootOnZane(o, i, t); });
  LUNCH.forEach(([k, dx], i) => { const c = W[k]; if (p.x > TABLE(0).x + dx - 0.8) { aimArm(c, 1, chestOf(c).add(fwd(c, 1.2)).add(v3(0, 0.3, 0)), 0.9); } });
}
function lootOnZane(o, i, t, k = 1) {   // the loot stacked on Zane's left hand
  const z = W.zane, h = handOf(z, 0); o.visible = true; o.position.copy(h).add(v3(0, 0.1 + i * 0.11, 0)).add(fwd(z, 0.2)); o.rotation.set(Math.PI / 2 * (i < 3 ? 0 : 1) * 0, z.root.rotation.y + i, 0);
}
function poseGrab(t) {   // L10: Hazel draws on her bench; a gust, and the sketchbook is gone
  const E = EV, h = W.hazel, z = W.zane; yardCommon(t);
  sitOn(h, BENCH(), Math.PI, sz('hazel'), W.yard.bench.seatY); const g = E.grab + 0.75;
  if (t < g) { holdBook(h, t, 'draw'); face(h, 'happy', t, 0.3); lookAtP(h, W.book.position, 0.8); W.lines.set(0); }
  else { const ch = chestOf(h).add(fwd(h, 0.8)).add(v3(0, -1.8, 0)); aimArm(h, 0, ch.clone().add(side(h, 0.5)), 1 - smooth(g + 0.6, g + 1.1, t) * 0.3); aimArm(h, 1, ch.clone().add(side(h, -0.4)), 1 - smooth(g + 0.6, g + 1.1, t) * 0.3);
    face(h, 'shocked', t, 0.3); lookAtP(h, ch, 0.8 - smooth(g + 0.5, g + 1.0, t) * 0.5);
    const u = clamp((t - g) / 0.35), p = lp3(BENCH().add(v3(-1.5, 0, -2.6)), ZT(), u); W.lines.set(u < 1 ? 1 : 0, p, ZT().sub(BENCH()).setY(0).normalize(), 6);
    if (u < 1) { place(z, p, yawTo(BENCH(), ZT()), sz('zane')); pose(z, 'run', t * 2.4); holdAt(W.book, z, 1, v3(0, 0.3, 0)); } }
}
function poseTaunt(t, name) {   // L11-12: Zane waves the sketchbook, "Come get it, Slowpoke!"; the courtyard laughs; Hazel stands and glares; his laugh stretches
  const E = EV, h = W.hazel, z = W.zane, zt = zT(t); yardCommon(t);
  // Hazel: on the bench until the laugh, then up on her feet, glaring
  const up = smooth(E.laughed + 0.2, E.laughed + 0.9, t);
  if (up < 0.5) { sitOn(h, BENCH(), Math.PI, sz('hazel'), W.yard.bench.seatY); h.root.rotation.y = yawTo(BENCH(), ZT()); }
  else { place(h, lp3(BENCH().add(v3(0, 0, -1.0)), HZ(), up), yawTo(HZ(), ZT()), sz('hazel')); pose(h, 'idle', t); }
  face(h, t > E.making ? 'smirk' : t > E.real ? 'surprised' : t > E.glared ? 'fury' : t > E.laughed ? 'angry' : 'shocked', t, 0.3, { noBlink: t > E.glared && t < E.real }); lookAtP(h, H(z), 0.9);
  if (t > E.glared) { h.torso.rotation.x += 0.08; aimArm(h, 0, chestOf(h).add(side(h, 1.0)).add(v3(0, -1.6, 0)), 0.6); aimArm(h, 1, chestOf(h).add(side(h, -1.0)).add(v3(0, -1.6, 0)), 0.6); }
  zanePose(t, zt);
  crowd(t, t > E.glared + 0.6 ? 'shocked' : 'laugh', H(z), { laugh: t > E.laughed && t < E.glared + 0.6 ? 1 : 0 });
  lunchKids(t, { face: () => (t > E.glared + 0.6 ? 'surprised' : t > E.laughed ? 'laugh' : 'happy'), look: H(z) }); if (t > E.laughed && t < E.glared + 0.6) LUNCH.forEach(([k], i) => laughBob(W[k], t + i * 0.3, 0.7));
  W.loot.forEach((o, i) => lootOnZane(o, i, t));
  // the slow effect: gaze rings from Hazel's eyes, a teal bubble round Zane
  const sk = smooth(E.glared + 0.2, E.taffy + 0.3, t); W.bub.position.copy(H(z).add(v3(0, -2.2, 0))); W.bub.set(sk, t, 5.2);
  W.rip.set(sk, t, H(h).add(fwd(h, 0.5)), H(z).add(v3(0, -0.4, 0)));
}
function zanePose(t, zt) {   // Zane at ZT, taunting; from the stretch on, a leap away to -x frozen near its top (his own clock zt)
  const E = EV, z = W.zane, LP = E.taffy - 0.2, lu = clamp((zt - LP) / 0.7);
  const base = lp3(ZT(), ZL(), lu); base.y = Math.sin(lu * Math.PI) * 1.5;
  const h = W.hazel;
  if (lu <= 0) { place(z, ZT(), yawTo(ZT(), HZ()) - 0.25, sz('zane')); pose(z, 'idle', zt); }
  else { place(z, base, lerp(yawTo(ZT(), HZ()) - 0.25, -Math.PI / 2 - 0.35, smooth(0, 0.3, lu)), sz('zane')); pose(z, 'run', LP * 2 + (zt - LP) * 2.2);
    z.legs[0].rotation.x = -0.9; z.legs[1].rotation.x = 0.7; z.knee[1].rotation.x = 1.1; z.torso.rotation.x += 0.12; }
  const laughing = t > E.taunt && zt > E.taunt;
  face(z, t > E.laughed - 0.2 ? 'laugh' : 'smug', zt, 0.3, { viseme: talk(11, t), noBlink: t > E.taffy });
  if (lu <= 0 && t > E.laughed) laughBob(z, zt, 0.8);
  // the sketchbook up in his right hand while taunting; at his chest during the leap
  const raise = lu > 0 ? 0 : smooth(E.taunt - 0.1, E.taunt + 0.3, t);
  if (raise > 0) aimArm(z, 1, H(z).add(side(z, -1.4)).add(v3(0, 2.6, 0)), raise);
  else aimArm(z, 1, chestOf(z).add(fwd(z, 0.3)).add(side(z, -1.3)).add(v3(0, -0.8, 0)), 1);
  aimArm(z, 0, chestOf(z).add(fwd(z, 0.7)).add(side(z, 1.0)).add(v3(0, -1.5, 0)), 1);
  W.book.visible = true; if (lu > 0) W.book.position.copy(chestOf(z)).add(side(z, -1.5)).add(v3(0, -0.7, 0)); else W.book.position.copy(handOf(z, 1)).add(v3(0, 0.45, 0)); W.book.rotation.set(0, z.root.rotation.y, raise ? 0.2 : 0);
  lookAtP(z, H(h), lu > 0 ? 0.3 : 0.6);
}
function poseFreeze(t, name) {   // L14-16: Zane hangs mid-leap; Hazel strolls over, takes everything back, turns him toward the fountain and blinks
  const E = EV, h = W.hazel, z = W.zane, zt = zT(t); yardCommon(t);
  const turnK = smooth(E.turned + 0.25, E.fount + 0.5, t);
  zanePose(t, zt);
  if (turnK > 0) { z.root.rotation.y = lerp(z.root.rotation.y, z.root.rotation.y + wrap(yawTo(ZL(), FC()) - z.root.rotation.y), turnK); }
  // items: on him while frozen; floating loose round him; flying home once she takes them
  const tookK = smooth(E.took, E.took + 0.9, t);
  W.loot.forEach((o, i) => { const fl = H(z).add(v3(Math.cos(i * 1.3) * 1.6, -1.3 + Math.sin(i * 2.1) * 0.9, Math.sin(i * 1.3) * 1.6)).add(v3(0, Math.sin(t * 0.4 + i) * 0.05, 0));
    o.visible = true; o.position.copy(lp3(fl, lootHome(i), easeInOut(clamp(tookK * 1.4 - i * 0.08)))); o.rotation.set(t * 0.05 + i, i, 0.2); });
  const bookK = smooth(E.took - 0.5, E.took + 0.1, t);
  // Hazel: at HZ, then the stroll
  const sA = HZ(), sB = HS(); const su = smooth(E.stroll - 0.1, E.took - 0.2, t);
  const hp = lp3(sA, sB, su); place(h, hp, su > 0 && su < 1 ? yawTo(sA, sB) : yawTo(hp, H(z).setY(0)), sz('hazel')); pose(h, su > 0.02 && su < 0.98 ? 'walk' : 'idle', t * 0.7);
  face(h, t > E.blink - 0.05 && t < E.blink + 0.18 ? 'blink' : t > E.stroll ? 'smug' : 'focused', t, 0.3, { noBlink: true }); lookAtP(h, H(z), 0.8);
  if (bookK > 0 && bookK < 1) { aimArm(h, 1, W.book.position, bookK); }
  if (t > E.took + 0.1 && t < E.turned + 0.25) holdBook(h, t, 'hug');
  if (t > E.took + 0.1) { if (t >= E.turned + 0.25) { const push = smooth(E.turned + 0.1, E.turned + 0.4, t) * (1 - smooth(E.fount + 0.6, E.fount + 1.0, t)); aimArm(h, 0, H(z).add(v3(0, -1.6, 0)).add(side(z, 0.8)), push); aimArm(h, 1, H(z).add(v3(0, -1.6, 0)).add(side(z, -0.8)), push);
        const p = chestOf(h).add(v3(0, -0.6, 0)); W.book.visible = true; W.book.position.copy(chestOf(h)).add(side(h, 1.0)).add(fwd(h, -0.6)).add(v3(0, -0.9, 0)); W.book.rotation.set(0, h.root.rotation.y + Math.PI / 2, 0); void p; }
      else { /* hugging, set by holdBook */ } }
  else if (bookK >= 1) { W.book.position.copy(handOf(h, 1)).add(v3(0, 0.4, 0)); }
  W.bub.position.copy(H(z).add(v3(0, -2.2, 0))); W.bub.set(1 - smooth(E.blink, E.blink + 0.3, t), t, 5.2);
  W.rip.set(name === 'stare' ? 1 : 0.5 * (1 - smooth(E.blink - 0.4, E.blink, t)), t, H(h).add(fwd(h, 0.5)), H(z).add(v3(0, -0.4, 0)));
  crowd(t, (i) => (i % 2 ? 'shocked' : 'surprised'), H(z), { spots: [['k3', C(-14, 0, 17), 0], ['k4', C(-11.5, 0, 20), 1], ['gecko', C(-15, 0, 6.5), 2], ['rosa', C(9, 0, 23), 4]] });
  lunchKids(t, { face: () => 'shocked', look: H(z) });
}
function poseDive(t, name) {   // L17-19: he snaps back to speed, sprints, trips on the rim and dives into the basin; sits there dizzy
  const E = EV, h = W.hazel, z = W.zane; yardCommon(t);
  const u = t - E.U0, d = DIR(), rim = ZL().add(d.clone().multiplyScalar(ZL().distanceTo(FC()) - FOUNT.R - 0.6)), yawF = yawTo(ZL(), FC());
  if (u < 0.25) { const p = ZL(); p.y = lerp(1.45, 0, easeOut(u / 0.25)); place(z, p, yawF, sz('zane')); pose(z, 'run', t * 2.6); face(z, 'laugh', t, 0.3, { noBlink: true }); }
  else if (u < 1.0) { const k = (u - 0.25) / 0.75, p = lp3(ZL(), rim, k); place(z, p, yawF, sz('zane')); pose(z, 'run', t * 2.8); z.torso.rotation.x += 0.3; face(z, 'laugh', t, 0.3); W.lines.set(1, p, d, 6); }
  else if (u < 1.5) { const k = (u - 1.0) / 0.5, p = lp3(rim, ZW(), k); p.y = FOUNT.rimH * 0.6 + Math.sin(k * Math.PI) * 1.6 - k * 0.9; place(z, p, yawF, sz('zane')); pose(z, 'run', t * 2); z.root.rotation.x = 0; z.torso.rotation.x += 0.4 + k * 0.9;
    z.arms.forEach((a) => a.rotation.x -= 2.6 * k); face(z, 'shocked', t, 0.3, { noBlink: true }); }
  else { sitInWater(z, t); }
  if (u >= 1.0) W.lines.set(0);
  W.spl.set(E.splash, t, ZW().setY(SC.y + FOUNT.waterY));
  // Hazel: beside where he hung, the sketchbook hugged; turns to the camera for her line; then walks off
  if (t < E.nobody) { place(h, HS(), yawTo(HS(), ZW()), sz('hazel')); pose(h, 'idle', t); holdBook(h, t, 'hug'); face(h, t > E.take - 0.2 ? 'smug' : t > E.splash ? 'smirk' : 'focused', t, 0.4, { viseme: talk(18, t) }); lookAtP(h, t > E.take - 0.3 ? takeCam() : H(z), 0.7); }
  else { const A = HS(), B = C(10, 0, 34); walkTo(h, A, B, E.nobody + 0.1, E.end + 1.5, t, 1, 'walk', sz('hazel')); holdBook(h, t, 'hug'); face(h, 'smug', t, 0.4); lookAtP(h, h.root.position.clone().add(v3(0.6, 5.0, 9.0)), 0.3); }
  const after = t > E.splash + 0.3;
  if (t < E.nobody) { crowd(t, after ? 'laugh' : 'shocked', H(z), { laugh: after ? 0.8 : 0, spots: [['k3', C(-14, 0, 17), 0], ['k4', C(-11.5, 0, 20), 1], ['gecko', C(-15, 0, 6.5), 2], ['rosa', C(-1, 0, 19), 4]] }); lunchKids(t, { face: () => (after ? 'laugh' : 'shocked'), look: H(z) }); }
  else shoes(t);
  W.loot.forEach((o, i) => { o.visible = true; o.position.copy(lootHome(i)); o.rotation.set(i % 2 ? Math.PI / 2 : 0, i, 0); });
}
function sitInWater(z, t) {   // in the basin at ZW, facing along the tangent (legs clear of the rim), dizzy, dripping
  const E = EV, p = ZW(), rad = p.clone().sub(FC()).setY(0).normalize(), tang = v3(-rad.z, 0, rad.x);
  sitOn(z, p, Math.atan2(tang.x, tang.z), sz('zane'), FOUNT.waterY - 0.35); face(z, 'dizzy', t, 0.3, { noBlink: true });
  z.neck.rotation.z = Math.sin(t * 2.2) * 0.15; aimArm(z, 0, H(z).add(v3(0, 1.0, 0)).add(side(z, 0.9)), 0.5 + Math.sin(t * 3) * 0.1);
  W.drips.visible = true; W.drips.position.copy(H(z)).add(v3(0, 0.6, 0)); W.drips.children.forEach((d, i) => { const u = (t * 1.3 + i / 6) % 1; d.position.set(Math.sin(i * 2.4) * 0.8, -u * 3.2, Math.cos(i * 2.4) * 0.8); d.visible = u < 0.95; });
}
function shoes(t) {   // L19: as Hazel walks by, everyone studies their shoes
  const E = EV, h = W.hazel, hp = H(h);
  [['k3', C(4, 0, 27), 0], ['k4', C(16, 0, 28), 1], ['gecko', C(3, 0, 31.5), 2], ['nora', C(16.5, 0, 32), 3], ['rosa', C(18, 0, 24.5), 4], ['k1', C(-4.5, 0, 22.5), 5]].forEach(([k, p, i]) => {
    const c = W[k]; place(c, p, yawTo(p, hp) * 0.6 + yawTo(p, C(10, 0, 30)) * 0.4, sz(k)); pose(c, 'idle', t + i); const down = smooth(E.shoes - 0.6 + i * 0.12, E.shoes + i * 0.12, t);
    face(c, down > 0.5 ? 'nervous' : 'neutral', t, 0.3 + i * 0.3); c.neck.rotation.x = 0.5 * down; if (down < 0.5) lookAtP(c, hp, 0.5); });
  const b = W.bo; const BP = C(12.5, 0, 25.5); place(b, BP, yawTo(BP, hp), sz('bo')); pose(b, 'idle', t); face(b, 'nervous', t, 0.5); b.neck.rotation.x = 0.5 * smooth(E.shoes - 0.3, E.shoes + 0.2, t);
  b.root.updateMatrixWorld(true); W.parrot.visible = true; W.parrot.position.copy(H(b).add(side(b, 0.95 * SCa(b))).add(v3(0, -1.0 * SCa(b), 0))); W.parrot.rotation.y = b.root.rotation.y; W.parrot.scale.setScalar(0.55); W.parrot.set(t, { tilt: 0.5 }); W.parrot.head.rotation.x += 0.5;
  // Zane still sitting in the fountain behind
  sitInWater(W.zane, t);
}

// ---- shots ----
function camOn(c, dist, ang = 0, dy = 0, lookDy = -0.7, fov = 54) { const h = H(c), a = c.root.rotation.y + ang * Math.PI / 180, s = SCa(c); return { pos: h.clone().add(v3(Math.sin(a) * dist, dy, Math.cos(a) * dist)), look: h.clone().add(v3(0, lookDy * s, 0)), fov }; }
function shots() {
  const s = (i) => L(i).start, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  // L0 the town; the falcon nip
  add('town', 0, (u) => ({ pos: lp3(v3(19, 5.6, 34), v3(17, 6.0, 29), easeInOut(u)), look: v3(4, 6.5, -2), fov: 58 }));
  add('falcon', E.power - 1.15, (u) => ({ pos: SH(10.0 + u * 0.4, 4.0, 12.5 - u * 0.8), look: SH(9.8, 3.6, 2.4), fov: 54 }));
  // L1 a gecko kid on the wall; a skunk kid wins
  add('gecko', s(1) - 0.05, (u) => { const y = 9.0 + u * 1.9; return { pos: v3(WALL().x + 7.0, y + 2.5, WALL().z + 6.5), look: v3(WALL().x - 2.5, y + 2.2, WALL().z + 0.8), fov: 54 }; });
  add('skunk', E.skunk - 0.05, (u) => ({ pos: v3(-3.7 + u * 0.3, 3.9, 18.8 - u * 1.2), look: v3(-3.6, 2.7, 6.6), fov: 56 }));
  // L2 the price boards, the old man's jaw drops
  add('shop', s(2) - 0.05, (u) => { const k = easeInOut(clamp(u * 1.4 - 0.2)); return { pos: lp3(SH(-7.4, 5.4, 6.2), SH(-2.0, 6.0, 12.5), k), look: lp3(SH(-7.2, 5.0, 0.3), SH(-10.2, 4.6, 1.8), k), fov: 50 }; });
  // L3 the memory: the toddler and the sloth
  add('zoo', s(3) - 0.05, (u) => { const g = BR(0.62); return { pos: g.clone().add(v3(2.5 + u * 0.5, -4.2, 12.0 - u * 1.0)), look: g.clone().add(v3(0.9, -2.0, 0.9)), fov: 52 }; });
  // L4 the courtyard: Hazel, the kids laugh; L5-6 Bo
  add('school', s(4) - 0.05, (u) => { const h = H(W.hazel); return { pos: h.clone().add(v3(-9.5, 1.0, 2.5)), look: h.clone().add(v3(1.0, -1.2, -0.6)), fov: 58 }; });
  add('bo', s(5) - 0.05, (u) => { const b = H(W.bo); return { pos: b.clone().add(v3(2.8 - u * 0.4, -0.2, 7.8 - u * 0.6)), look: b.clone().add(v3(0.2, -1.0, 0)), fov: 52 }; });
  add('bo2', s(6) - 0.05, (u) => camOn(W.bo, 5.6 - u * 0.5, 14, 0.2, -0.6, 50));
  // L7 the dodgeball, the clock
  add('dodge', s(7) - 0.05, (u) => { const Cc = W.yard.court, hp = C(Cc.x - 7, 0, Cc.z + 0.9), kp = C(Cc.x + 6.5, 0, Cc.z + 0.5); return { pos: kp.clone().add(v3(3.0 - u * 1.5, 5.0, 3.2)), look: hp.clone().add(v3(0, 3.6, 0)), fov: 46 }; });
  add('clock', E.clock, (u) => ({ pos: C(-3 + u * 0.6, 18.4, -13.0 + u * 1.2), look: C(0, 19.4, -25.4), fov: 48 }));
  add('sleepy', E.clock + 0.95, (u) => { const m = TABLE(0); return { pos: m.clone().add(v3(1.2 - u * 0.5, 7.0, 11.0)), look: m.clone().add(v3(0, 2.8, -2.6)), fov: 56 }; });
  // L8 Zane; L9 lunch; L10 the grab; L11 the taunt
  add('zane', s(8) - 0.05, (u) => { const z = H(W.zane); return { pos: z.clone().add(v3(1.4, -0.5, 8.4 - u * 0.8)), look: z.clone().add(v3(0, -1.6, 0)), fov: 54 }; });
  add('loop', E.hare + 0.45, (u) => ({ pos: C(1 + u * 1.5, 15, 33), look: C(0, 1.5, 0), fov: 58 }));
  add('lunch', s(9) - 0.05, (u) => { const m = TABLE(0); return { pos: m.clone().add(v3(9.0 - u * 2.0, 4.6, 8.0)), look: m.clone().add(v3(-1.0, 3.0, 1.0)), fov: 58 }; });
  add('grab', s(10) - 0.05, (u) => { const b = BENCH(); return { pos: b.clone().add(v3(6.5 - u * 0.5, 4.6, -8.5 + u * 0.6)), look: b.clone().add(v3(0, 2.6, -0.8)), fov: 56 }; });
  add('taunt', s(11) - 0.05, (u) => { const z = H(W.zane), hz = H(W.hazel); const dir = hz.clone().sub(z).setY(0).normalize(); return { pos: z.clone().add(dir.multiplyScalar(6.4 - u * 0.5)).add(v3(-dir.z, 0, dir.x).multiplyScalar(1.5)).add(v3(0, -0.5, 0)), look: z.clone().add(v3(0, -0.9, 0)), fov: 54 }; });
  // L12 the laugh; the glare; the stretched laugh
  add('laughed', s(12) - 0.05, (u) => ({ pos: C(-2 + u * 1.0, 9.0, 34), look: C(-1, 3.6, 12), fov: 56 }));
  add('glare', E.glared - 0.05, (u) => { const h = H(W.hazel), z = H(W.zane), dir = z.clone().sub(h).setY(0).normalize(); return { pos: h.clone().add(dir.multiplyScalar(6.4 - u * 1.6)).add(v3(0, -0.2, 0)).add(v3(dir.z, 0, -dir.x).multiplyScalar(0.8)), look: h.clone().add(v3(0, -0.5, 0)), fov: 50 }; });
  add('taffy', E.taffy - 0.05, (u) => { const z = H(W.zane), h = H(W.hazel), dir = h.clone().sub(z).setY(0).normalize(); const a = -1.6 + 0.35 - u * 0.5; void dir; const d = v3(Math.sin(a), 0, Math.cos(a)); return { pos: z.clone().add(d.multiplyScalar(9.0)).add(v3(0, -0.6, 0)), look: z.clone().add(v3(0, -1.4, 0)), fov: 54 }; });
  // L13 the sloth's world rushes past; Hazel understands
  add('rush', s(13) - 0.05, (u) => { const g = BR(0.62); return { pos: g.clone().add(v3(3.0, -3.0, 17.0 - u * 1.5)), look: g.clone().add(v3(0, -3.4, 2.0)), fov: 56 }; });
  add('real', E.power2 - 0.05, (u) => { const h = H(W.hazel), z = H(W.zane), dir = z.clone().sub(h).setY(0).normalize(); return { pos: h.clone().add(dir.multiplyScalar(5.8 - u * 1.0)).add(v3(-dir.z, 0, dir.x).multiplyScalar(1.2)).add(v3(0, -0.4, 0)), look: h.clone().add(v3(0, -0.6, 0)), fov: 50 }; });
  // L14 she keeps staring; Zane hangs mid-leap
  add('stare', s(14) - 0.05, (u) => { const h = H(W.hazel), z = H(W.zane), dir = z.clone().sub(h).setY(0).normalize(); return { pos: h.clone().add(dir.multiplyScalar(4.8)).add(v3(dir.z, 0, -dir.x).multiplyScalar(1.4)).add(v3(0, -1.0, 0)), look: h.clone().add(v3(0, -0.3, 0)), fov: 48 }; });
  add('hung', E.hung - 0.05, (u) => { const z = H(W.zane).add(v3(0, -1.6, 0)), a = -0.4 + u * 1.0, R = 11.5; return { pos: z.clone().add(v3(Math.sin(a - 1.6) * R, 1.0, Math.cos(a - 1.6) * R)), look: z, fov: 54 }; });
  // L15 the stroll; everything back. L16 the turn; the blink
  add('stroll', s(15) - 0.05, (u) => { const z = ZL(); return { pos: z.clone().add(v3(-9.0 + u * 1.0, 5.0, 4.0)), look: z.clone().add(v3(1.2, 3.4, 1.0)), fov: 56 }; });
  add('took', E.took - 0.05, (u) => { const m = ZL().add(v3(1.2, 0, 1.0)); return { pos: m.clone().add(v3(-1.5 + u, 6.0, 12.5)), look: m.clone().add(v3(0, 3.2, 0)), fov: 58 }; });
  add('turn', s(16) - 0.05, (u) => { const z = ZL(), d = DIR(); return { pos: z.clone().add(d.clone().multiplyScalar(8.6)).add(v3(-d.z, 0, d.x).multiplyScalar(-2.4)).add(v3(0, 4.8, 0)), look: z.clone().add(v3(0.6, 3.6, 0.6)), fov: 54 }; });
  add('blink', E.blink - 0.35, (u) => { const h = H(W.hazel), z = H(W.zane), dir = z.clone().sub(h).setY(0).normalize(); void dir; return camOn(W.hazel, 6.0, -42, 1.0, -0.4, 42); });
  // L17 the sprint and the splash; Zane in the water
  add('sprint', E.U0 - 0.05, (u) => { const z = ZL(), w = ZW(), m = z.clone().add(w).multiplyScalar(0.5), d = DIR(); return { pos: m.clone().add(v3(-d.z, 0, d.x).multiplyScalar(-15.5)).add(v3(0, 10.0, 0)).add(d.clone().multiplyScalar(-1.0)), look: lp3(z, w, 0.25 + 0.5 * u).add(v3(0, 2.4, 0)), fov: 54 }; });
  add('soaked', E.splash + 0.75, (u) => { const w = ZW(), o = w.clone().sub(FC()).setY(0).normalize(); return { pos: w.clone().add(o.multiplyScalar(7.5)).add(v3(0, 4.8 - u * 0.4, 0)), look: w.clone().add(v3(0, 2.4, 0)), fov: 52 }; });
  // L18 "Take your time." L19 the walk; everyone studies their shoes
  add('take', s(18) - 0.25, (u) => { const h = H(W.hazel), w = ZW(), d = h.clone().sub(w).setY(0).normalize(), sd = v3(-d.z, 0, d.x); const p = takeCam(); void d; void sd; return { pos: p, look: h.clone().add(v3(0, -0.8, 0)), fov: 50 }; });
  add('walk', s(19) - 0.05, (u) => { const h = H(W.hazel); const p = h.clone().add(v3(-1.2, 0.4, 8.5)); return { pos: p, look: h.clone().add(v3(0, -1.0, 0)), fov: 56 }; });
  add('shoes', E.shoes - 0.05, (u) => ({ pos: C(9.5 + u, 7.0, 46), look: C(9.5, 3.0, 26), fov: 58 }));
  add('end', E.shoes + 1.5, (u) => { const k = easeInOut(u); return { pos: C(lerp(8, 4, k), lerp(8, 18, k), lerp(44, 46, k)), look: C(lerp(8, 1, k), lerp(3, 2, k), lerp(26, 6, k)), fov: 58 }; });
  Sx.sort((a, b) => a.t0() - b.t0());
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
const KEYS = { town: 'town', falcon: 'town', gecko: 'gecko', skunk: 'skunk', shop: 'shop', zoo: 'zoo', school: 'school', bo: 'bo', bo2: 'bo', dodge: 'dodge', clock: 'clock', sleepy: 'clock',
  zane: 'zintro', loop: 'zintro', lunch: 'lunch', grab: 'grab', taunt: 'taunt', laughed: 'taunt', glare: 'taunt', taffy: 'taunt', rush: 'rush', real: 'taunt',
  stare: 'freeze', hung: 'freeze', stroll: 'freeze', took: 'freeze', turn: 'freeze', blink: 'freeze', sprint: 'dive', soaked: 'dive', take: 'dive', walk: 'dive', shoes: 'dive', end: 'dive' };
const SETOF = { town: 'street', gecko: 'street', skunk: 'street', shop: 'street', zoo: 'zoo', rush: 'zoo', lineup: 'street' };

function renderAt(t) {
  let sh = shotAt(W.shots, t); let key = KEYS[sh.name];
  const E = EV;
  if (LINEUP) key = 'lineup';
  if (ctx.thumbMode) key = 'thumb';
  const set = key === 'thumb' ? 'yard' : SETOF[key] || 'yard';
  const slowK = (key === 'taunt' || key === 'freeze') ? smooth(E.glared + 0.3, E.taffy + 0.3, t) * (1 - smooth(E.blink, E.blink + 0.4, t)) : key === 'thumb' ? 1 : 0;
  const env = key === 'zoo' ? MEMORY : key === 'rush' ? { ...MEMORY, saturation: 1.0 } : set === 'yard' ? (slowK > 0.5 ? SLOW : YARD) : SUNNY;
  applyEnv(ctx, env);
  W.street.visible = set === 'street'; W.zoo.visible = set === 'zoo'; W.yard.visible = set === 'yard';
  hideAll();
  for (const k of ['falcon', 'parrot', 'sloth', 'book', 'ball', 'drips']) W[k].visible = false;
  W.loot.forEach((o) => { o.visible = false; }); W.lines.set(0); W.bub.set(0, t); W.rip.set(0, t, v3(0, 0, 0), v3(0, 0, 1)); W.spl.visible = false; W.stink.set(t, 0); W.spark.set(0);
  W.book.rotation.set(0, 0, 0); W.parrot.scale.setScalar(1);
  if (key === 'lineup') poseLineup(t);
  else if (key === 'thumb') poseThumb(t);
  else ({ town: () => poseTown(t), gecko: () => poseGecko(t), skunk: () => poseSkunk(t), shop: () => poseShop(t), zoo: () => poseZoo(t, 'zoo'), rush: () => poseZoo(t, 'rush'),
    school: () => poseSchool(t), bo: () => poseBo(t), dodge: () => poseDodge(t), clock: () => poseClock(t), zintro: () => poseZaneIntro(t, sh.name), lunch: () => poseLunch(t),
    grab: () => poseGrab(t), taunt: () => poseTaunt(t, sh.name), freeze: () => poseFreeze(t, sh.name), dive: () => poseDive(t, sh.name) })[key]();
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  if (key === 'lineup') { const n = LINEUP.length, i = Math.floor(t) % n, hh = H(W['L' + i]), fr = t % 1; const ang = fr < 0.34 ? 0 : fr < 0.67 ? 0.7 : -0.7; sh = { name: 'lineup', pos: hh.clone().add(v3(Math.sin(ang) * 4.2, 0.2, Math.cos(ang) * 4.2)), look: hh.clone().add(v3(0, -0.5, 0)), fov: 46 }; }
  if (Q.get('dbgpos')) console.error('t', t, sh.name, 'cam', sh.pos.toArray().map((x) => x.toFixed(1)).join(','), W.all.filter((c) => c.root.visible).map((c) => c.key + '@' + c.root.position.toArray().map((x) => x.toFixed(1)).join(',')).join(' | '));
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2 * SCa(c), 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * SCa(c); c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2] * SCa(c), Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  if (ctx.thumbMode) { const h = H(W.hazel); sh = { ...sh, name: 'thumb', pos: h.clone().add(v3(+(Q.get('tx') || 1.6), +(Q.get('ty') || 0.4), +(Q.get('td') || 8.6))), look: h.clone().add(v3(+(Q.get('tlx') || -1.2), +(Q.get('tl') || 1.0), 0)), fov: +(Q.get('tf') || 54) }; }
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  const tint = slowK > 0.01 ? `linear-gradient(rgba(90,230,210,${(0.07 * slowK).toFixed(3)}), rgba(90,230,210,${(0.07 * slowK).toFixed(3)}))` : undefined;
  frame(ctx, t, sh, { steady: t < 2.4 || Q.get('steady') === '1', shake: 0, shadowSpan: set === 'street' ? 80 : 60, shadows: true, black: 0, tint,
    flash: Math.max(0, 1 - Math.abs(t - E.splash - 0.05) / 0.18) * 0.3 + Math.max(0, 1 - Math.abs(t - E.three) / 0.2) * 0.4 + Math.max(0, 1 - Math.abs(t - E.real) / 0.2) * 0.4 + Math.max(0, 1 - Math.abs(t - E.school) / 0.15) * 0.25, flashColor: '#fff4e0' });
  return sh.name;
}
function poseThumb(t) {   // Hazel glaring past the camera, Zane frozen mid-leap behind her in the teal bubble, cookies hanging in the air
  const E = EV, h = W.hazel, z = W.zane; yardCommon(10);
  zanePose(E.kept + 1, zT(E.kept + 1)); W.bub.position.copy(H(z).add(v3(0, -2.2, 0))); W.bub.set(1, 3, 5.2);
  W.loot.forEach((o, i) => { o.visible = true; o.position.copy(H(z).add(v3(Math.cos(i * 1.3) * 2.6, -1.6 + Math.sin(i * 2.1) * 1.2, Math.sin(i * 1.3) * 1.4))); o.rotation.set(i, i, 0.2); });
  place(h, ZL().add(v3(3.6, 0, 6.2)), 0, sz('hazel')); h.root.rotation.y = 0.05; pose(h, 'idle', 0);
  holdBook(h, 0, 'hug'); face(h, 'focused', 0, 0, { noBlink: true }); lookAtP(h, H(h).add(v3(1.6, 0.4, 8.6)), 0.7);
}
function poseLineup(t) {
  const n = LINEUP.length; LINEUP.forEach((k, i) => { const c = W['L' + i]; place(c, at(LU, (i - (n - 1) / 2) * 4.2, 0, 0), 0); pose(c, 'idle', 0); face(c, t % 1 > 0.5 ? 'happy' : 'surprised', 0, 0, { noBlink: true }); });
}

export async function setup() {
  const avs = [...new Set([...Object.values(AV).map((a) => a[0]), ...(LINEUP || [])])];
  ctx = await initStage('ep104', { look: 'pro', avatars: avs }); L = ctx.L;
  try { CAP = (await (await fetch('/build/ep104/timeline.json')).json()).captions || []; } catch (e) { CAP = []; }
  EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'smirk', 'grin', 'focused', 'shocked', 'surprised', 'nervous', 'scared', 'laugh', 'bored', 'sleepy', 'angry', 'fury', 'pain', 'dizzy', 'blink']);
  const { scene, camera } = ctx; camera.far = 3000; camera.near = 0.1; camera.updateProjectionMatrix();
  W.street = hollowStreet(); scene.add(W.street);
  W.zoo = pettingZoo(); W.zoo.position.copy(ZP); scene.add(W.zoo);
  W.yard = courtyard(); W.yard.position.copy(SC); scene.add(W.yard);
  W.sloth = sloth(); scene.add(W.sloth);
  W.parrot = bird({ crest: true }); scene.add(W.parrot);
  W.falcon = bird({ cols: ['#8a6a4a', '#5a4030', '#f0e2c8', '#4a3424'], headCol: '#6a5038', beakCol: '#e8c040', hook: true, belly: '#f0e2c8' }); W.falcon.scale.setScalar(0.85); scene.add(W.falcon);
  W.book = sketchbook(); scene.add(W.book);
  W.loot = [cookie(), phone('#ff5a8a'), cookie(), phone('#3fb7e8'), cookie()]; W.loot.forEach((o) => scene.add(o));
  W.ball = dodgeball(); scene.add(W.ball);
  W.lines = speedLines(); scene.add(W.lines); W.bub = slowBubble(); scene.add(W.bub); W.rip = gazeRipples(); scene.add(W.rip);
  W.spl = splash(); scene.add(W.spl); W.stink = stinkCloud(); scene.add(W.stink); W.spark = sparkle(); scene.add(W.spark);
  W.drips = new THREE.Group(); for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), new THREE.MeshStandardMaterial({ color: '#dff6ff', roughness: 0.1, transparent: true, opacity: 0.85 })); W.drips.add(d); } scene.add(W.drips);
  people();
  if (LINEUP) LINEUP.forEach((a, i) => { const c = makeCharacter({ avatar: a, alti: true, skin: skinOf(a), caustic: false, scale: 0.86 }); scene.add(c.root); jointify(c); c.key = 'L' + i; W['L' + i] = c; W.all.push(c); });
  W.shots = shots();
  window.__ep104 = { W, THREE, ctx, L, EV };
  return expose(ctx, renderAt, EV.kept + 1, EV);
}
