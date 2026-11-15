// Flower Man remake 10: The City Where It's Always Noon. In Sunmere it has been noon for four hundred years: the sun never moves, at
// bedtime everyone pulls on a sleep mask, and nobody goes near the Rim, the white wall around the city. Pia notices that balloons always
// pop at the same height, and that Grandpa never takes off his brass key stamped HELM ("Old junk. It opens nothing."). One bedtime she
// slips it off his neck while he snores, finds a round door marked CREW ONLY behind a hedge at the Rim, throws her alarm clock into the
// bushes to draw the guard away and turns the key: no sea of fire, just black sky and a billion stars. Sunmere is a ship and the sun is
// a lamp. Grandpa, mask on his forehead: "Let her go, Tomas. Our world was dying. This ship carries us to a new one." A small green planet
// grows ahead. "We steer it. You'd have had the key tomorrow." "Why tomorrow?" "Because tomorrow, we land." Tomorrow, someone switches off
// the sun for the first time in four hundred years.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, frame, expose, P, DAY, mixP } from '../engine/stage.js';
import { shotAt } from '../engine/stage.js';
import { burst } from '../engine/atmos.js';
import { jointify } from '../engine/infinitetower.js';
import { FARM } from '../engine/farm_cast.js';
import { glowSprite, canvasTex } from '../engine/props.js';
import { sunmere, bedroom, shipModel, planet, fullStars, balloon, alarmClock, brassKey, wearMask, RIM, HATCH, HATCH_R, COTTAGE, PARTY, TOWER } from '../engine/alwaysnoon.js';

const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV, CAP = [];
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
// [avatar, scale, head scale]
const AV = {
  pia: ['farm_lily', 0.8], grandpa: ['farm_grandpa', 1], guard: ['farm_prison_guard', 1],
  t1: ['farm_old_man', 1], t2: ['farm_classic_mom', 1], t3: ['farm_noah', 0.95], k1: ['farm_red_kid', 0.75], k2: ['farm_nia', 0.72],
};
for (const k of ['pia', 'grandpa', 'guard']) if (Q.get(k)) AV[k][0] = Q.get(k);
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';

// the sets: the city at the origin, the bedroom and space far away
const RM = v3(1500, 0, 0), SP = v3(0, 0, 4000);
const at = (o, x, y, z) => o.clone().add(v3(x, y, z));

const NOON = { ...DAY, ...P({ top: '#2f8ee8', horizon: '#d2ecff', haze: '#d8efff', sunColor: '#fff4dc', hemiSky: '#d6ecff', hemiGround: '#c8d89a' }), sunDir: v3(0.22, 0.92, 0.32), sunI: 2.3, sunDisc: 1, sunSize: 1.7, hemiI: 1.1, amb: 0.3, envI: 1.0, exposure: 1.0, bloom: 0.04, vig: 0, saturation: 1.2, contrast: 1.05, bounce: 0.18, fogNear: 260, fogFar: 950, stars: 0, moon: 0, win: 0, lamp: 0 };
const SPACE = { ...NOON, ...P({ top: '#000004', horizon: '#020309', haze: '#000000', sunColor: '#fff0d8', hemiSky: '#8fa6ff', hemiGround: '#1a1a22' }), sunDir: v3(0.3, 0.75, 0.55), sunDisc: 0, sunI: 1.9, hemiI: 0.45, amb: 0.12, envI: 0.3, exposure: 1.05, bloom: 0.12, fogNear: 5000, fogFar: 9000 };
const NIGHTC = { ...NOON, ...P({ top: '#070b26', horizon: '#22356a', haze: '#1a2852', sunColor: '#a8c0ff', hemiSky: '#4a64b0', hemiGround: '#1a1d22' }), sunDisc: 0, sunI: 0.75, hemiI: 0.72, amb: 0.18, envI: 0.4, stars: 1, exposure: 1.18, fogNear: 220, fogFar: 950, bloom: 0.1, lamp: 1.2, win: 1 };
const ROOMENV = { ...NOON, sunI: 0.6, hemiI: 0.95, amb: 0.34, envI: 0.8, exposure: 0.98 };

const capT = (word, after = 0) => { const c = CAP.find((x) => x.start >= after - 0.01 && x.text.toUpperCase().replace(/[“”]/g, '').includes(word)); return c ? c.start : after; };
function events() {
  const s = (i) => L(i).start;
  return {
    bedtime: capT('AT BEDTIME', s(1)), masks: capT('EVERYONE PULLS', s(1)), rim: capT('RIM,', s(2)), balloons: capT('BALLOONS', s(3)), same: capT('THE SAME HEIGHT', s(3)),
    key: capT('HIS BRASS KEY', s(4)), junk: s(5), bed: s(6), slip: capT('SHE SLIPPED', s(6)), neck: capT('HIS NECK', s(6)),
    walk: s(7), hedge: capT('BEHIND A HEDGE', s(7)), door: capT('WAS A ROUND DOOR', s(7)), crew: capT('MARKED CREW', s(7)),
    guard: s(8), throw: capT('SHE THREW', s(8)), ring: capT('CLOCK INTO', s(8)) + 0.15, turn: capT('AND TURNED', s(8)),
    open: s(9) + 0.05, stars: capT('JUST BLACK', s(9)), ship: s(10), lampT: capT('THE SUN WAS', s(10)), tomas: s(11), dying: s(12), carries: capT('THIS SHIP CARRIES', s(12)),
    planet: s(13), steer: s(14), why: s(15), land: s(16), weland: capT('WE LAND', s(16)), off: s(17), offW: capT('THE SUN FOR', s(17)), end: ctx.dur,
  };
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
const talk = (i, t, txt) => (t > L(i).start && t < L(i).end ? visemeAt(txt || L(i).text.replace(/[“”]/g, ''), L(i).start, L(i).end, t) : undefined);
function lookAtP(c, p, k = 1) { c.root.updateMatrixWorld(true); const n = c.neck.getWorldPosition(v3()), a = wrap(yawTo(n, p) - c.root.rotation.y); c.neck.rotation.y = clamp(a, -1.2, 1.2) * k; c.neck.rotation.x = -Math.atan2(p.y - n.y - 0.6 * SC(c), Math.hypot(p.x - n.x, p.z - n.z)) * 0.6 * k; }
function walkTo(c, a, b, t0, t1, t, speed = 1, kind = 'walk', size = 1) { const u = clamp((t - t0) / (t1 - t0)); const p = lp3(a, b, u); place(c, p, yawTo(a, b), size); pose(c, u > 0 && u < 1 ? kind : 'idle', t * speed); return u; }
function walkPath(c, pts, t0, t1, t, size = 1, kind = 'walk', speed = 1) {   // along a polyline at even speed
  const segs = pts.slice(1).map((p, i) => p.distanceTo(pts[i])), tot = segs.reduce((a, b) => a + b, 0); let d = clamp((t - t0) / (t1 - t0)) * tot, i = 0;
  while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
  const u = clamp(d / segs[i]); place(c, lp3(pts[i], pts[i + 1], u), yawTo(pts[i], pts[i + 1]), size); const moving = t > t0 && t < t1; pose(c, moving ? kind : 'idle', t * speed); return moving;
}
const fwd = (c, d = 1) => v3(Math.sin(c.root.rotation.y), 0, Math.cos(c.root.rotation.y)).multiplyScalar(d);
const side = (c, d = 1) => { const f = fwd(c); return v3(f.z, 0, -f.x).multiplyScalar(d); };   // the character's left
const chestOf = (c) => H(c).add(v3(0, -1.55 * SC(c), 0)).add(fwd(c, 0.85 * SC(c)));

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
  W.mask = { grandpa: wearMask(W.grandpa, '#2b2f6a'), t1: wearMask(W.t1, '#7d5cc0'), t2: wearMask(W.t2, '#d9536f'), t3: wearMask(W.t3, '#2f8f6a') };
}
function hideAll() { W.all.forEach((c) => { c.root.visible = false; }); }

// ================= the city =================
function posePlaza(t) {   // L1: the bell rings, the townsfolk pull their masks down
  const E = EV, base = at(v3(0, 0, 0), -2, 0.04, -12);
  const row = [['t1', -3.2, 0.15], ['t2', 0, -0.05], ['t3', 3.2, -0.2]];
  row.forEach(([k, dx, yaw], i) => {
    const c = W[k]; place(c, base.clone().add(v3(dx, 0, Math.abs(dx) * 0.25)), yaw, 1); pose(c, 'idle', t + i);
    const pull = smooth(E.masks + i * 0.18, E.masks + 0.55 + i * 0.18, t);
    W.mask[k].visible = true; W.mask[k].set(pull);
    const up = smooth(E.masks - 0.3 + i * 0.18, E.masks + 0.05 + i * 0.18, t) * (1 - smooth(E.masks + 0.6 + i * 0.18, E.masks + 0.95 + i * 0.18, t));
    if (up > 0) { aimArm(c, 0, H(c).add(side(c, 0.5)).add(fwd(c, 0.4)).add(v3(0, 0.1, 0)), up); aimArm(c, 1, H(c).add(side(c, -0.5)).add(fwd(c, 0.4)).add(v3(0, 0.1, 0)), up); }
    const yawn = t > E.masks + 1.0 + i * 0.2 && t < E.masks + 1.7 + i * 0.2;
    face(c, t < E.bedtime + 0.3 ? 'happy' : pull < 0.5 ? 'neutral' : 'happy', t, 0.3 + i * 0.2, { viseme: yawn ? 'A' : undefined });
    if (t < E.masks) lookAtP(c, TOWER.clone().add(v3(0, 38, 0)), 0.7);
  });
  W.tower.bell.rotation.z = Math.sin((t - E.bedtime) * 6) * 0.35 * smooth(E.bedtime - 0.1, E.bedtime + 0.2, t) * (1 - smooth(E.bedtime + 2.4, E.bedtime + 3.0, t));
}
function poseGuardPatrol(t) {   // L2: the guard by the NO ENTRY sign, on the path to the Rim
  const g = W.guard; walkTo(g, v3(-4, 0, -116), v3(4, 0, -116), L(2).start - 0.5, L(2).end + 0.5, t, 0.8); face(g, 'skeptic', t, 0.3);
}
function poseParty(t) {   // L3: Pia at the party lawn, the kids let their balloons go
  const E = EV, p = W.pia, k1 = W.k1, k2 = W.k2;
  const PP = at(PARTY, 1.5, 0, 2.5); place(p, PP, Math.PI + 0.35, 0.8); pose(p, 'idle', t);
  const up = smooth(L(3).start + 0.2, L(3).start + 0.8, t); lookAtP(p, PP.clone().add(v3(-1, 30, -8)), up * 0.9);
  face(p, t < E.balloons ? 'skeptic' : 'focused', t, 0.4);
  place(k1, at(PARTY, -3.5, 0, 0.5), 0.6, 0.75); pose(k1, 'idle', t); face(k1, 'happy', t, 0.2);
  place(k2, at(PARTY, -1.2, 0, 4.5), Math.PI * 0.85, 0.72); pose(k2, 'idle', t); face(k2, 'happy', t, 0.6);
  // balloons: held, released, rising, popping at the same height
  const POP = 34;
  W.balloons.forEach((b, i) => {
    const holder = i < 3 ? k1 : k2, rel = W.rel[i], hp0 = handOf(holder, i % 2), anchor = holder.root.position.clone();
    aimArm(holder, i % 2, H(holder).add(side(holder, i % 2 ? -0.6 : 0.6)).add(v3(0, 0.9, 0)), t < rel ? 1 : 1 - smooth(rel, rel + 0.5, t));
    const hand = handOf(holder, i % 2);
    const off = v3((i - 2) * 0.9, 3.4 + (i % 2) * 0.5, (i % 3 - 1) * 0.6);
    let pos = hand.clone().add(off);
    if (t > rel) { const u = t - rel; pos = hand.clone().add(off).add(v3(Math.sin(u * 1.3 + i) * 0.8 * u * 0.4, u * 12, 0)); }
    const popT = rel + (POP - (hand.y + off.y)) / 12;
    b.visible = t < popT; b.position.copy(pos); if (pos.y > POP) b.position.y = POP; b.rotation.z = Math.sin(t * 2 + i) * 0.12;
    b.str.visible = true;
    if (W.pops[i]._t !== popT) { W.pops[i].fire(popT); W.pops[i].position.set(pos.x, POP, pos.z); W.pops[i]._t = popT; }
    W.pops[i].position.x = pos.x; W.pops[i].position.z = pos.z; W.pops[i].update(t);
    void anchor; void hp0;
  });
}
function poseYard(t) {   // L4-5: Grandpa in the front yard with his watering can; Pia beside him
  const E = EV, g = W.grandpa, p = W.pia;
  const GP = at(COTTAGE, -3.0, 0, 12.5), PP = at(COTTAGE, 0.4, 0, 14.6);
  place(g, GP, yawTo(GP, PP) - 0.6, 1); pose(g, 'idle', t);
  place(p, PP, yawTo(PP, GP) + 0.95, 0.8); pose(p, 'idle', t);
  // the watering can in his left hand, tipped toward the flowers
  const tip = t < E.junk ? 0.5 + 0.2 * Math.sin(t * 2) : 0;
  aimArm(g, 0, chestOf(g).add(side(g, 1.5)).add(fwd(g, 0.5)).add(v3(0, -1.9, 0)), 1);
  W.can.visible = true; W.can.position.copy(handOf(g, 0)).add(v3(0, -0.55, 0)); W.can.rotation.set(0, g.root.rotation.y + Math.PI / 2, tip);
  W.drops.visible = tip > 0.3; W.drops.position.copy(W.can.position).add(fwd(g, 1.3)).add(v3(0, -0.6, 0)); W.drops.rotation.y = t * 3;
  // the key on his chest
  keyOnChest(g, t);
  const junk = t > E.junk;
  if (junk) { const wv = smooth(E.junk + 0.2, E.junk + 0.5, t); aimArm(g, 1, chestOf(g).add(fwd(g, 0.5)).add(side(g, 0.1)).add(v3(0, -0.2, 0)), wv * 0.9); }
  face(g, junk ? 'skeptic' : 'happy', t, 0.5, { viseme: talk(5, t) }); lookAtP(g, H(p), 0.6);
  // Pia points at the key
  const pt = smooth(E.key - 0.2, E.key + 0.3, t) * (1 - smooth(E.junk + 0.4, E.junk + 0.8, t));
  if (pt > 0) aimArm(p, 1, chestOf(g).add(v3(0, 0.2, 0)), pt * 0.85);
  face(p, junk ? 'skeptic' : 'focused', t, 0.4); lookAtP(p, t > E.junk ? H(g) : chestOf(g), 0.8);
}
function keyOnChest(c, t, lying) {
  const k = W.key; k.visible = true; const ch = chestOf(c);
  if (lying) { k.position.copy(lying); k.rotation.set(-Math.PI / 2, 0, 0); }
  else { k.position.copy(ch); k.rotation.set(0, c.root.rotation.y, Math.sin(t * 1.7) * 0.06); }
  W.cord.visible = true; const top = H(c).add(v3(0, -1.0 * SC(c), 0)).add(fwd(c, 0.35 * SC(c)));
  const kt = k.position.clone().add(v3(0, lying ? 0 : 0.3, 0)); W.cord.position.copy(lp3(kt, top, 0.5)); W.cord.scale.set(1, kt.distanceTo(top), 1); W.cord.lookAt(top); W.cord.rotateX(Math.PI / 2);
  if (lying) W.cord.visible = false;
}

// ================= the bedroom =================
function poseBed(t) {
  const E = EV, g = W.grandpa, p = W.pia, R = W.room;
  const top = RM.clone().add(v3(-6, R.bedTop + 0.5, -5 + 0.2));
  place(g, top, 0, 1); g.root.rotation.set(-Math.PI / 2, 0, 0); pose(g, 'idle', 0); g.root.rotation.set(-Math.PI / 2, 0, 0);
  g.arms.forEach((a, i) => a.quaternion.setFromEuler(new THREE.Euler(0, 0, (i ? -1 : 1) * 0.12)));
  W.mask.grandpa.visible = true; W.mask.grandpa.set(1);
  const snore = Math.sin(t * 2.6); face(g, 'neutral', t, 0.4, { closed: true, viseme: snore > 0.2 ? 'O' : undefined });
  g.root.updateMatrixWorld(true);
  const chest = g.torso.localToWorld(v3(0, 0.3, 0.75));
  const slip = smooth(E.neck - 0.1, E.neck + 0.8, t);
  // Pia tiptoes in from the door side, reaches for the key
  const A = at(RM, 7, 0, 11), B = at(RM, -0.6, 0, -7.6);
  const u = walkTo(p, A, B, L(6).start - 0.2, E.neck - 0.4, t, 0.6, 'walk', 0.8); if (u >= 1) p.root.rotation.y = yawTo(B, at(RM, -6, 0, -7.6));
  face(p, slip > 0.5 ? 'grin' : 'nervous', t, 0.4); lookAtP(p, chest, u >= 1 ? 0.9 : 0.4);
  if (t > E.neck - 0.6) {
    const reach = smooth(E.neck - 0.6, E.neck - 0.1, t);
    const kp = lp3(chest.clone().add(v3(0, 0.12, 0)), H(p).add(fwd(p, 0.9)).add(v3(0, -1.2, 0)), slip);
    aimArm(p, 1, slip > 0 ? kp : lp3(handOf(p, 1), chest, reach), 1);
    W.key.visible = true; W.key.position.copy(slip > 0.02 ? handOf(p, 1).add(v3(0, 0.15, 0)) : chest.clone().add(v3(0, 0.12, 0))); W.key.rotation.set(slip > 0.02 ? 0 : -Math.PI / 2, p.root.rotation.y, 0);
  } else { W.key.visible = true; W.key.position.copy(chest).add(v3(0, 0.12, 0)); W.key.rotation.set(-Math.PI / 2, 0, 0); }
  W.room.alarm.visible = true;
}

// ================= the Rim =================
const PIA_DOOR = v3(0.35, 0, -RIM + 2.0);
const GUARD_POST = v3(2.9, 0, -RIM + 3.0);
const HIDE = v3(-10.4, 0, -RIM + 3.4);
function poseRim(t, mode) {
  const E = EV, p = W.pia, g = W.guard, gp = W.grandpa, R = W.city.rim;
  R.open(smooth(E.open + 0.05, E.open + 0.9, t));
  W.hatchLight.intensity = 60 * smooth(E.open + 0.1, E.open + 0.9, t);
  // the key: in Pia's hand, then in the keyhole
  const kh = R.keyholeWorld();
  // ---- Pia ----
  if (t < E.hedge) { walkTo(p, v3(-42, 0, -RIM + 3.2), v3(-10.6, 0, -RIM + 3.2), E.walk - 0.6, E.hedge + 0.35, t, 0.9, 'walk', 0.8); face(p, 'focused', t, 0.4); lookAtP(p, at(v3(0, 0, 0), 0, 30, -RIM), 0.35); }
  else if (t < E.door + 0.2) { walkTo(p, v3(-10.6, 0, -RIM + 3.2), v3(-3.6, 0, -RIM + 2.6), E.hedge + 0.35, E.door + 0.1, t, 0.9, 'walk', 0.8); face(p, 'focused', t, 0.4); lookAtP(p, HATCH, 0.6 * smooth(E.door - 0.6, E.door, t)); }
  else if (t < E.guard - 0.6) { place(p, v3(-3.6, 0, -RIM + 2.6), lerp(yawTo(v3(-10.6, 0, 0), v3(-3.6, 0, 0)), Math.PI + 0.5, smooth(E.door, E.door + 0.5, t)), 0.8); pose(p, 'idle', t); face(p, t > E.crew ? 'surprised' : 'focused', t, 0.4); lookAtP(p, HATCH.clone().add(v3(0, 2, 0)), 0.8); }
  else if (t < E.throw) { walkTo(p, v3(-3.6, 0, -RIM + 2.6), HIDE, E.guard - 0.6, E.guard + 0.2, t, 1.1, 'walk', 0.8); if (t > E.guard + 0.2) p.root.rotation.y = Math.PI / 2 + 0.25; face(p, 'nervous', t, 0.4); lookAtP(p, H(g), 0.8); }
  else if (t < E.ring + 0.25) { place(p, HIDE, Math.PI / 2 + 0.6, 0.8); pose(p, 'idle', t); const sw = smooth(E.throw + 0.1, E.throw + 0.55, t);
    const wind = smooth(E.throw - 0.2, E.throw + 0.15, t);
    aimArm(p, 1, H(p).add(fwd(p, lerp(-0.6, 1.4, sw))).add(side(p, -0.6)).add(v3(0, lerp(0.8, 1.6, sw), 0)), Math.max(wind, 0.2) * (1 - smooth(E.throw + 0.7, E.throw + 1.0, t)));
    face(p, sw > 0.2 ? 'grin' : 'focused', t, 0.4); lookAtP(p, W.city.bushAt, 0.6); }
  else if (t < E.turn) { walkTo(p, HIDE, PIA_DOOR, E.ring + 0.25, E.turn - 0.05, t, 1.3, 'run', 0.8); face(p, 'focused', t, 0.4); }
  else {
    place(p, PIA_DOOR, Math.PI, 0.8); pose(p, 'idle', t);
    if (t < E.open + 0.6) { aimArm(p, 1, kh.clone().add(v3(0, 0.05, 0.3)), 1); face(p, 'focused', t, 0.4, { noBlink: true }); lookAtP(p, kh, 0.8); }
    else { face(p, t < E.stars ? 'surprised' : t < E.ship + 2.7 ? 'shocked' : 'surprised', t, 0.4, { noBlink: t < E.stars + 0.5 }); lookAtP(p, HATCH.clone().add(v3(0, 0.6, -10)), 0.7); }
  }
  // the key
  if (t < E.turn - 0.05) { W.key.visible = t > E.walk - 0.6 && t < E.throw + 0.2; W.key.position.copy(handOf(p, 0)).add(v3(0, 0.1, 0)); W.key.rotation.set(0, p.root.rotation.y, 0.4); }
  else if (t < E.steer + 1.4) { W.key.visible = true; const ins = smooth(E.turn, E.turn + 0.3, t), turn = smooth(E.turn + 0.35, E.turn + 0.75, t);
    W.key.position.copy(kh).add(v3(0, 0.4, 0.55 * (1 - ins) + 0.12)); W.key.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 * turn);
    if (t > E.open) { R.door.updateMatrixWorld(true); W.key.position.copy(R.door.localToWorld(R.door.keyhole.clone().add(v3(0, 0.0, 0.5)))); W.key.quaternion.copy(R.door.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, -Math.PI / 2))); } }
  // ---- the alarm clock: thrown over the hedge into the bush, ringing ----
  const ck = W.clock; ck.visible = t > E.throw + 0.35 && t < E.turn + 2;
  if (ck.visible) { const u = clamp((t - E.throw - 0.35) / (E.ring - E.throw - 0.35)); const A = handOf(p, 1), B = W.city.bushAt.clone().add(v3(0, 2.7, 0)); const pos = lp3(A, B, u); pos.y += Math.sin(u * Math.PI) * 8; ck.position.copy(pos); ck.rotation.set(u * 9, u * 4, 0);
    if (u >= 1) { const r = t - E.ring; ck.rotation.set(0, -0.6, Math.sin(r * 60) * 0.12); ck.position.x += Math.sin(r * 55) * 0.05; } }
  // ---- the guard ----
  const gIn = v3(13, 0, -RIM + 3.0);
  if (t < E.guard + 0.6) { walkTo(g, gIn, GUARD_POST, E.guard - 1.3, E.guard - 0.1, t, 0.9); if (t > E.guard - 0.1) g.root.rotation.y = lerp(-Math.PI / 2, -Math.PI / 2 + 0.55, smooth(E.guard, E.guard + 0.5, t)); face(g, 'skeptic', t, 0.3); lookAtP(g, HIDE.clone().add(v3(0, 3, 4)), 0.5); }
  else if (t < E.ring + 0.1) { place(g, GUARD_POST, -Math.PI / 2 + 0.55 + Math.sin(t * 0.9) * 0.25, 1); pose(g, 'idle', t); face(g, 'skeptic', t, 0.3); armsCrossed(g); }
  else if (t < E.ship + 1.5) { const away = walkPath(g, [GUARD_POST, v3(10.4, 0, -RIM + 3.4), v3(13.5, 0, -RIM + 9)], E.ring + 0.05, E.ring + 1.6, t, 1, 'walk', 1.0); if (!away && t > E.ring + 2.1) { g.root.rotation.y = yawTo(g.root.position, W.city.bushAt); } face(g, t < E.ring + 0.4 ? 'surprised' : 'skeptic', t, 0.3); lookAtP(g, W.city.bushAt, 0.8); }
  else { // back, and grabs her shoulder
    const back = walkPath(g, [v3(13.5, 0, -RIM + 11), v3(10.4, 0, -RIM + 3.4), v3(2.0, 0, -RIM + 3.0)], E.ship + 1.5, E.tomas - 0.35, t, 1, 'walk', 1.1);
    const letgo = smooth(E.tomas + 0.6, E.tomas + 1.0, t);
    if (!back && t >= E.tomas - 0.35) { const G2 = lp3(v3(2.0, 0, -RIM + 3.0), v3(4.2, 0, -RIM + 3.8), letgo); place(g, G2, yawTo(G2, PIA_DOOR) * (1 - letgo) + letgo * (-Math.PI * 0.75), 1); pose(g, 'idle', t);
      aimArm(g, 0, H(p).add(v3(0, -0.9, 0)).add(side(p, -0.5)), 1 - letgo); face(g, t > E.tomas + 0.3 ? 'nervous' : 'angry', t, 0.3, { viseme: t > E.tomas - 0.3 && t < E.tomas - 0.05 ? 'A' : undefined }); lookAtP(g, letgo > 0.5 ? H(gp) : H(p), 0.7); }
    else { face(g, 'angry', t, 0.3); }
  }
  // Pia turns to the guard when grabbed, then to Grandpa
  if (t > E.lampT + 0.6) {
    const grab = smooth(E.tomas - 0.4, E.tomas - 0.1, t);
    const toG = smooth(E.tomas + 0.1, E.tomas + 0.6, t);
    const gpPos = v3(-2.1, 0, -RIM + 4.4);
    place(p, PIA_DOOR, lerp(Math.PI, yawTo(PIA_DOOR, gpPos), toG), 0.8); pose(p, 'idle', t);
    if (t > E.tomas - 0.4 && t < E.tomas + 0.5) { face(p, 'scared', t, 0.4); lookAtP(p, H(g), 0.45 * grab); }
  }
  // ---- Grandpa: comes round the hedge in his slippers, mask on his forehead ----
  if (t > E.lampT) {
    const gpA = v3(-16, 0, -RIM + 12), gpB = v3(-10.6, 0, -RIM + 4.6), gpC = v3(-2.1, 0, -RIM + 4.4);
    const moving = walkPath(gp, [gpA, gpB, gpC], E.lampT + 0.2, E.tomas + 0.15, t, 1, 'walk', 1.0);
    if (!moving && t > E.tomas) gp.root.rotation.y = yawTo(gpC, PIA_DOOR) + 0.1;
    W.mask.grandpa.visible = true; W.mask.grandpa.set(0);
  }
}
function armsCrossed(c) { const ch = chestOf(c).add(fwd(c, 0.35)); aimArm(c, 0, ch.clone().add(side(c, -0.4)), 1); aimArm(c, 1, ch.clone().add(side(c, 0.4)).add(v3(0, -0.15, 0)), 1); }
function poseTalk(t) {   // L11-16 at the open hatch: Grandpa explains, gives her the key
  const E = EV, p = W.pia, gp = W.grandpa, g = W.guard, R = W.city.rim;
  R.open(1); W.hatchLight.intensity = 60;
  const gpC = v3(-2.1, 0, -RIM + 4.4);
  const ow = smooth(E.carries - 0.4, E.carries, t) * (1 - smooth(E.steer - 0.4, E.steer, t));
  const gpW = lp3(gpC, v3(-1.0, 0, -RIM + 3.4), ow), pW = lp3(PIA_DOOR, v3(0.8, 0, -RIM + 2.1), ow);
  place(gp, gpW, lerp(yawTo(gpC, PIA_DOOR) + 0.1, Math.PI, ow), 1); pose(gp, 'idle', t); W.mask.grandpa.visible = true; W.mask.grandpa.set(0);
  place(p, pW, lerp(yawTo(PIA_DOOR, gpC), Math.PI, ow), 0.8); pose(p, 'idle', t);
  place(g, v3(4.6, 0, -RIM + 4.4), -Math.PI * 0.72, 1); pose(g, 'idle', t); face(g, 'nervous', t, 0.3); lookAtP(g, H(gp), 0.6);
  const outward = t > E.carries - 0.1 && t < E.steer;   // both look out of the hatch
  const gl = [11, 12, 14, 16].find((i) => t > L(i).start && t < L(i).end);
  face(gp, t > E.weland ? 'grin' : t > E.steer ? 'happy' : t < E.dying ? 'focused' : 'sad', t, 0.5, { viseme: gl !== undefined ? talk(gl, t) : undefined });
  face(p, t > E.weland + 0.3 ? 'happy' : t > E.why ? 'skeptic' : outward ? 'surprised' : 'nervous', t, 0.4, { viseme: talk(15, t) });
  if (outward) { lookAtP(gp, HATCH.clone().add(v3(0, 0.5, -8)), 0.9); lookAtP(p, HATCH.clone().add(v3(0, 0.5, -8)), 0.9); }
  else { lookAtP(gp, H(p), 0.85); lookAtP(p, H(gp), 0.85); }
  // a hand on her shoulder while he explains
  const sh = smooth(E.dying + 0.4, E.dying + 0.9, t) * (1 - smooth(E.steer - 0.3, E.steer, t));
  if (sh > 0) aimArm(gp, 1, H(p).add(v3(0, -0.85, 0)).add(side(p, 0.45)), sh * 0.9);
  // the key: he pulls it from the lock and puts it in her hand
  const KH = R.door.localToWorld(R.door.keyhole.clone().add(v3(0, 0, 0.5)));
  const pull = smooth(E.steer + 0.2, E.steer + 0.7, t), give = smooth(E.steer + 1.3, E.steer + 2.2, t);
  const palm = H(p).add(fwd(p, 0.85)).add(v3(0, -1.65, 0)).add(side(p, -0.25));
  if (t > E.steer) {
    const kpos = lp3(KH, lp3(H(gp).add(fwd(gp, 1.0)).add(v3(0, -1.1, 0)), palm.clone().add(v3(0, 0.15, 0)), give), pull);
    W.key.visible = true; W.key.position.copy(kpos); W.key.rotation.set(0, gp.root.rotation.y, 0.3);
    aimArm(gp, 0, kpos.clone().add(v3(0, -0.1, 0)), pull * (1 - smooth(E.why - 0.3, E.why, t)));
    const open = smooth(E.steer + 1.2, E.steer + 1.8, t); if (open > 0) aimArm(p, 1, palm, open);
    if (t > E.steer + 2.2) { W.key.position.copy(handOf(p, 1)).add(v3(0, 0.2, 0)); }
  } else { W.key.visible = true; W.key.position.copy(KH); W.key.quaternion.copy(R.door.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, -Math.PI / 2))); }
}

// ================= space =================
function poseSpace(t) {
  const S = W.ship; S.visible = true; S.position.copy(SP); S.rotation.set(0, 0, Math.sin(t * 0.3) * 0.01);
  const off = W.lampOff; S.setLamp(off);
  W.planet.visible = true;
  const grow = smooth(EV.planet - 0.5, EV.off, t);
  W.planet.position.copy(SP).add(v3(lerp(1700, 1250, grow), 60, -120)); W.planet.rotation.y = t * 0.02;
  W.engines = 1; S.engines.forEach((e, i) => { e.material.opacity = 0.75 + 0.2 * Math.sin(t * 13 + i); });
  S.hatchDot.material.opacity = t > EV.open ? 0.9 : 0;
}

// ================= the flash-forward: the sun goes out =================
function poseFinale(t) {
  const E = EV, p = W.pia, gp = W.grandpa;
  const C0 = v3(-4, 0.04, 14);
  place(p, C0, 0.15, 0.8); pose(p, 'idle', t); place(gp, C0.clone().add(v3(-2.9, 0, -1.4)), 0.3, 1); pose(gp, 'idle', t);
  W.mask.grandpa.visible = true; W.mask.grandpa.set(0);
  const look = C0.clone().add(v3(2, 60, 30));
  const up = smooth(E.off + 0.3, E.off + 1.4, t);
  lookAtP(p, look, up); lookAtP(gp, look, up);
  face(p, t > E.offW + 1.2 ? 'happy' : 'surprised', t, 0.4); face(gp, 'happy', t, 0.6);
  W.key.visible = true; W.key.position.copy(handOf(p, 1)).add(v3(0, 0.2, 0)); W.key.rotation.set(0, p.root.rotation.y, 0.2);
  const row = [['t1', 4.5, 8, -2.6], ['t2', 7.5, 6, -2.9], ['t3', -9, 7, 2.7]];
  row.forEach(([k, x, z, yaw], i) => { const c = W[k]; place(c, v3(x, 0.04, z), yaw, 1); pose(c, 'idle', t); W.mask[k].visible = true; W.mask[k].set(1 - smooth(E.off + 0.6 + i * 0.3, E.off + 1.2 + i * 0.3, t)); lookAtP(c, look, smooth(E.off + 1.0 + i * 0.3, E.off + 1.6, t)); face(c, t > E.offW ? 'surprised' : 'neutral', t, 0.3 + i * 0.2);
    const up2 = smooth(E.off + 0.4 + i * 0.3, E.off + 0.8 + i * 0.3, t) * (1 - smooth(E.off + 1.2 + i * 0.3, E.off + 1.5 + i * 0.3, t)); if (up2 > 0) aimArm(c, 0, H(c).add(side(c, 0.4)).add(fwd(c, 0.3)).add(v3(0, 0.4, 0)), up2); });
}

// ---- shots ----
function camOn(c, dist, ang = 0, dy = 0, lookDy = -0.7, fov = 54) { const h = H(c), a = c.root.rotation.y + ang * Math.PI / 180, s = SC(c); return { pos: h.clone().add(v3(Math.sin(a) * dist, dy, Math.cos(a) * dist)), look: h.clone().add(v3(0, lookDy * s, 0)), fov }; }
function shots() {
  const s = (i) => L(i).start, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  // L0 Sunmere at noon, the clock stuck at twelve
  add('open', 0, (u) => ({ pos: lp3(v3(22, 8, 52), v3(18, 9.5, 44), easeInOut(u)), look: v3(-3, 20, -24), fov: 58 }));
  add('clock', 2.1, (u) => ({ pos: lp3(at(TOWER, 3.5, 25.5, 16), at(TOWER, 2.8, 26.2, 13.5), easeInOut(u)), look: at(TOWER, 0, 28, 4), fov: 40 }));
  // L1 the sun that never moves; bedtime, masks
  add('sun', s(1) - 0.05, (u) => ({ pos: v3(10, 2.0 + u * 0.5, 4), look: v3(10, 2, 4).add(lp3(v3(18, 44, 30), v3(21, 48, 31), u)), fov: 62 }));
  add('masks', E.bedtime - 0.1, (u) => ({ pos: lp3(v3(-1.5, 4.8, 2.0), v3(-1.8, 4.6, 0.2), easeInOut(u)), look: v3(-2, 3.4, -12), fov: 60 }));
  // L2 the Rim
  add('rim', s(2) - 0.05, (u) => ({ pos: lp3(v3(-3, 3.0, -62), v3(-2, 6.5, -70), easeInOut(u)), look: lp3(v3(0, 26, -150), v3(0, 38, -150), easeInOut(u)), fov: 64 }));
  // L3 Pia at the party; the balloons
  add('pia', s(3) - 0.05, (u) => camOn(W.pia, 6.8 - u * 0.4, 22, 0.6, -1.3, 56));
  add('balloons', E.balloons - 0.05, (u) => ({ pos: at(PARTY, 4, 3.5, 30 - u * 2), look: at(PARTY, -1, 22, 0), fov: 58 }));
  // L4 Grandpa's key; L5 "Old junk"
  add('yard', s(4) - 0.05, (u) => ({ pos: at(COTTAGE, -0.8, 4.6, 23.5 - u * 1.0), look: at(COTTAGE, -1.3, 3.3, 13.4), fov: 56 }));
  add('keyc', E.key - 0.05, (u) => { const k = W.key.position.clone(), g = W.grandpa; return { pos: k.clone().add(fwd(g, 4.4 - u * 0.4)).add(side(g, -0.4)).add(v3(0, 0.4, 0)), look: k.clone().add(v3(0, 0.0, 0)), fov: 38 }; });
  add('junk', s(5) - 0.05, (u) => camOn(W.grandpa, 6.0 - u * 0.4, -24, 0.3, -0.9, 54));
  // L6 the bedroom
  add('bed', s(6) - 0.05, (u) => ({ pos: lp3(at(RM, 7, 10.5, 6), at(RM, 6, 10, 5), easeInOut(u)), look: at(RM, -4, 2.4, -6.5), fov: 58 }));
  add('neck', E.neck - 0.45, (u) => { const h = H(W.pia); return { pos: at(RM, -6.5 + u * 0.3, 8.6, 3.2), look: lp3(at(RM, -5.5, 3.0, -8.8), h, 0.45).add(v3(0, -0.8, 0)), fov: 54 }; });
  // L7 along the Rim; behind the hedge; the round door
  add('walk', s(7) - 0.05, (u) => { const h = H(W.pia); return { pos: h.clone().add(v3(6.5 - u * 0.4, -2.0, 4.5)), look: h.clone().add(v3(0, 2.6, -1)), fov: 64 }; });
  add('hedge', E.hedge - 0.05, (u) => { const h = H(W.pia); return { pos: v3(h.x + 3.0, 6.4, -RIM + 9.5), look: h.clone().add(v3(0, -0.4, 0)), fov: 52 }; });
  add('door', E.door - 0.05, (u) => ({ pos: lp3(v3(-6.4, 4.2, -RIM + 5.0), v3(-4.8, 4.6, -RIM + 4.4), easeInOut(u)), look: lp3(v3(-1.8, 3.6, -RIM + 1), v3(0, 5.6, -RIM), easeInOut(u)), fov: 54 }));
  // L8 the guard; the throw; the ring; the key
  add('guard', E.guard - 0.05, (u) => camOn(W.guard, 6.4 - u * 0.3, -18, -0.1, -0.7, 52));
  add('throw', E.throw - 0.08, (u) => camOn(W.pia, 4.6, 8, 0.2, -0.5, 56));
  add('ring', E.ring - 0.3, (u) => ({ pos: v3(17.5, 4.6, -RIM + 19.5), look: v3(11.5, 3.6, -RIM + 6), fov: 54 }));
  add('turn', E.turn - 0.05, (u) => { const k = W.city.rim.keyholeWorld(); return { pos: k.clone().add(v3(3.4 - u * 0.2, 1.4, 1.6)), look: k.clone().add(v3(-0.7, 0.7, 0.6)), fov: 48 }; });
  // L9 the door opens; the stars
  add('hopen', E.open - 0.05, (u) => { const h = H(W.pia); return { pos: v3(2.1, h.y + 0.2, -RIM + 0.6), look: h.clone().add(v3(0, -0.35, 0)), fov: 48 }; });
  add('stars', E.stars - 0.08, (u) => ({ pos: lp3(v3(1.1, 5.4, -RIM + 6.5), v3(0.0, 3.7, -RIM - 0.4), easeInOut(u)), look: v3(-6, 18, -RIM - 120), fov: 56 }));
  // L10 the ship; the lamp; the guard's hand
  add('ship', s(10) - 0.05, (u) => { const k = easeOut(u); return { pos: SP.clone().add(lp3(v3(10, 34, -70), v3(-95, 75, -215), k)), look: SP.clone().add(lp3(v3(0, 31, -46), v3(0, 30, 0), k)), fov: 52 }; });
  add('lamp', E.lampT - 0.05, (u) => ({ pos: SP.clone().add(v3(-34 + u * 4, 56, -58)), look: SP.clone().add(v3(0, W.ship.lampY - 2, 0)), fov: 46 }));
  add('grab', E.tomas - 0.75, (u) => ({ pos: v3(0.4, 3.9, -RIM - 6.5 + u * 0.6), look: v3(0.4, 2.7, -RIM + 3), fov: 42 }));
  // L11 "Let her go, Tomas."
  add('tomas', E.tomas + 0.05, (u) => camOn(W.grandpa, 5.4 - u * 0.4, 14, 0.2, -0.6, 52));
  // L12 Grandpa explains; then the hatch from outside
  add('dying', E.dying - 0.05, (u) => camOn(W.grandpa, 4.8 - u * 0.3, -30, 0.2, -0.6, 52));
  add('outside', E.carries - 0.1, (u) => ({ pos: v3(-0.1, 4.0, -RIM - 9.5 + u * 1.2), look: v3(-0.1, 3.9, -RIM + 3), fov: 40 }));
  // L13 the green planet
  add('planet', s(13) - 0.05, (u) => { const pp = W.planet.position; return { pos: SP.clone().add(v3(140 + u * 60, 60, -60)), look: lp3(SP.clone().add(v3(60, 30, 0)), pp, 0.75), fov: 52 }; });
  // L14 "We steer it..." the key; L15 "Why tomorrow?"; L16 "Because tomorrow, we land."
  add('steer', s(14) - 0.05, (u) => camOn(W.grandpa, 5.4 - u * 0.5, -40, 0.4, -0.9, 56));
  add('why', s(15) - 0.05, (u) => camOn(W.pia, 3.8 - u * 0.3, -10, 0.2, -0.4, 50));
  add('land', s(16) - 0.05, (u) => camOn(W.grandpa, 4.6 - u * 0.3, 18, 0.2, -0.5, 50));
  add('approach', E.weland + 0.35, (u) => ({ pos: SP.clone().add(lp3(v3(-260, 90, 160), v3(-200, 80, 130), u)), look: SP.clone().add(v3(300, 20, -60)), fov: 50 }));
  // L17 the flash-forward: the sun goes out
  add('switch', s(17) - 0.05, (u) => ({ pos: lp3(v3(-2.8, 2.6, 21.5), v3(-3.1, 2.4, 20.3), easeInOut(u)), look: v3(-4.6, 3.5, 12), fov: 58 }));
  add('end', E.offW + 0.3, (u) => ({ pos: lp3(v3(-3.2, 2.6, 21.5), v3(-3.6, 1.6, 20.5), easeInOut(u)), look: lp3(v3(-5, 6.4, 13), v3(-5.5, 9.2, 9), easeInOut(u)), fov: 62 }));
  Sx.sort((a, b) => a.t0() - b.t0());
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
const KEYS = { open: 'plaza', clock: 'plaza', sun: 'plaza', masks: 'plaza', rim: 'patrol', pia: 'party', balloons: 'party', yard: 'yard', keyc: 'yard', junk: 'yard',
  bed: 'bed', neck: 'bed', walk: 'rim', hedge: 'rim', door: 'rim', guard: 'rim', throw: 'rim', ring: 'rim', turn: 'rim', hopen: 'rim', stars: 'rimout', ship: 'space', lamp: 'space',
  grab: 'rim', tomas: 'rim', dying: 'talk', outside: 'talk', planet: 'space', steer: 'talk', give: 'talk', why: 'talk', land: 'talk', approach: 'space', switch: 'finale', end: 'finale' };

function renderAt(t) {
  let sh = shotAt(W.shots, t); const key = KEYS[sh.name];
  const E = EV;
  W.lampOff = 1;
  let env = NOON;
  if (key === 'bed') env = ROOMENV;
  if (key === 'space' || key === 'rimout') env = SPACE;
  if (key === 'finale') { const k = smooth(E.off + 0.2, E.offW + 0.8, t); env = mixP(NOON, NIGHTC, k); W.lampOff = 1 - k; }
  applyEnv(ctx, env);
  const room = key === 'bed' ? 'rm' : key === 'space' ? 'sp' : 'city';
  W.city.visible = room === 'city'; W.room.visible = room === 'rm'; W.ship.visible = room === 'sp'; W.planet.visible = room === 'sp';
  W.backdrop.visible = room === 'city' && key !== 'rimout'; W.hplanet.visible = room === 'city' && key !== 'rimout';
  W.stars.visible = key === 'space' || key === 'rimout'; W.stars.set(t, 1);
  W.pt.forEach((l) => { l.intensity = l.userData.set === room ? l.userData.I : 0; });
  hideAll(); Object.values(W.mask).forEach((m) => { m.visible = false; });
  for (const k of ['key', 'cord', 'can', 'drops', 'clock']) W[k].visible = false;
  W.balloons.forEach((b) => { b.visible = false; }); W.pops.forEach((p) => { p.visible = false; });
  W.city.rim.open(0); W.hatchLight.intensity = 0; W.room.alarm.visible = false;
  W.city.tower.bell.rotation.z = 0; W.finLight.intensity = key === 'finale' ? 90 * smooth(E.off + 0.2, E.offW + 0.8, t) : 0;
  ({ plaza: () => posePlaza(t), patrol: () => poseGuardPatrol(t), party: () => poseParty(t), yard: () => poseYard(t), bed: () => poseBed(t),
    rim: () => poseRim(t), rimout: () => poseRim(t), talk: () => poseTalk(t), space: () => poseSpace(t), finale: () => poseFinale(t) })[key]();
  if (key === 'rimout') { W.hatchLight.intensity = 0; }
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  if (Q.get('dbgpos')) console.error('t', t, sh.name, 'cam', sh.pos.toArray().map((x) => x.toFixed(1)).join(','), W.all.filter((c) => c.root.visible).map((c) => c.key + '@' + c.root.position.toArray().map((x) => x.toFixed(1)).join(',')).join(' | '));
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2 * SC(c), 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * SC(c); c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2] * SC(c), Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  if (ctx.thumbMode) { sh = { ...sh, pos: v3(+(Q.get('tx') || 0.35), +(Q.get('ty') || 4.0), -RIM - +(Q.get('td') || 6.0)), look: v3(0.35, +(Q.get('tl') || 4.6), -RIM + 3), fov: +(Q.get('tf') || 50) }; }
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  if (key === 'space' || key === 'rimout') W.stars.follow({ position: sh.pos });
  W.city.tower.visible = true;
  frame(ctx, t, sh, { steady: t < 2.4 || Q.get('steady') === '1', shake: 0, shadowSpan: room === 'city' ? 80 : 45, shadows: true, black: 0,
    flash: Math.max(0, 1 - Math.abs(t - E.open - 0.5) / 0.3) * 0.25 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep110', { look: 'pro', avatars: [...new Set(Object.values(AV).map((a) => a[0]))] }); L = ctx.L;
  try { CAP = (await (await fetch('/build/ep110/timeline.json')).json()).captions || []; } catch (e) { CAP = []; }
  EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'grin', 'focused', 'shocked', 'surprised', 'nervous', 'scared', 'terrified', 'angry', 'skeptic', 'pain', 'blink']);
  const { scene, camera } = ctx; camera.far = 6000; camera.near = 0.1; camera.updateProjectionMatrix();
  W.city = sunmere(); scene.add(W.city); W.tower = W.city.tower;
  W.room = bedroom(); W.room.position.copy(RM); scene.add(W.room);
  W.room.alarm = alarmClock(); W.room.alarm.position.set(-12.3, 3.0, -9.2); W.room.add(W.room.alarm);
  W.ship = shipModel(); scene.add(W.ship);
  W.planet = planet(200); scene.add(W.planet);
  W.stars = fullStars({ count: 6000, radius: 2400 }); scene.add(W.stars);
  // outside the hatch: black space with stars (so the day sky never shows through the hole) and a far green planet
  W.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(160, 100), new THREE.MeshBasicMaterial({ fog: false, toneMapped: false, map: canvasTex(2048, 1280, (x, Wd, Hd) => { x.fillStyle = '#01020a'; x.fillRect(0, 0, Wd, Hd); const r = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); for (let i = 0; i < 4200; i++) { const b = r(); x.fillStyle = `rgba(255,${235 + b * 20},${210 + b * 45},${0.3 + b * 0.7})`; const sz = b > 0.97 ? 3 : b > 0.8 ? 2 : 1; x.fillRect(r() * Wd, r() * Hd, sz, sz); } }) }));
  W.backdrop.position.set(0, 30, -RIM - 30); scene.add(W.backdrop);
  W.hplanet = planet(5); W.hplanet.position.set(-6, 9, -RIM - 24); scene.add(W.hplanet);
  W.hatchLight = new THREE.PointLight('#a8c4ff', 0, 14, 1.6); W.hatchLight.position.set(0, HATCH.y, -RIM - 0.5); scene.add(W.hatchLight);
  W.key = brassKey(); W.key.scale.setScalar(1.5); scene.add(W.key);
  W.cord = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.8 })); scene.add(W.cord);
  W.clock = alarmClock(); scene.add(W.clock);
  W.can = (() => { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#5fb8a8', metalness: 0.5, roughness: 0.35 }); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.9, 16), m); g.add(b); const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.3, 8), m); sp.position.set(0.7, 0.2, 0); sp.rotation.z = -0.9; g.add(sp); const h = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 16, Math.PI), m); h.position.y = 0.45; g.add(h); g.traverse((o) => { o.castShadow = true; }); return g; })(); scene.add(W.can);
  W.drops = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 60 * 3 }, (_, i) => (i % 3 === 1 ? -Math.random() * 1.6 : (Math.random() - 0.5) * 0.3)), 3)), new THREE.PointsMaterial({ color: '#bfe8ff', size: 0.08 })); scene.add(W.drops);
  const bc = ['#ff4f6a', '#ffd23f', '#5fc8e8', '#7ad06a', '#c9b0f0'];
  W.balloons = bc.map((c) => { const b = balloon(c); scene.add(b); return b; });
  W.rel = [0.25, 0.45, 0.7, 0.95, 1.2].map((d) => L(3).start + d);
  W.pops = bc.map((c, i) => burst(scene, { count: 40, color: c, height: 0.5, spread: 1.6, dur: 0.6, bright: 1.6, pointSize: 0.35, seed: 3 + i }));
  const PL = (c, I, d, set, p) => { const l = new THREE.PointLight(c, I, d, 1.5); if (p) l.position.copy(p); l.userData.I = I; l.userData.set = set; scene.add(l); return l; };
  W.pt = [PL('#fff0d0', 160, 40, 'rm', at(RM, 0, 11, 4)), PL('#ffe2b0', 90, 30, 'rm', at(RM, -8, 8, 6))];
  W.finLight = new THREE.PointLight('#ffd9a0', 0, 30, 1.5); W.finLight.position.set(-2, 7, 20); scene.add(W.finLight);
  people();
  W.shots = shots();
  window.__ep110 = { W, THREE, ctx, L, EV };
  return expose(ctx, renderAt, EV.carries + 0.9, EV);
}
