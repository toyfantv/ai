// Flower Man remake 14: The Door in Her Wall. When you turn eleven a door grows in your bedroom wall, and behind it is a world built from
// whatever you love most; walk into someone else's uninvited and it keeps you, as scenery (you turn to wood). Felix folds paper animals;
// his best friend Mae keeps every one. Mae turns eleven first (a mint-green door, a brass padlock) and stays in longer every night: "Not
// yet, Felix. Stay out." Felix's birthday: no door. One night her door hangs open and he slips in: paper stars, a strawberry milk river,
// a board-game bridge. His sneakers creak: wood, climbing. The stars turn red and his very first paper foxes dive at him. He hides behind
// their blanket fort, by a wooden boy in his own yellow beanie: Mae built this world from what she loved most, them. "I'm not a burglar!
// This is my fort!" The foxes freeze, the wood crumbles like sawdust, and Mae runs up: "Your door was never coming. So I was building
// you half of mine." Now her door has a second key with his name on it.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DAY } from '../engine/stage.js';
import { sparkles, burst } from '../engine/atmos.js';
import { jointify } from '../engine/infinitetower.js';
import { FARM } from '../engine/farm_cast.js';
import { partyHat } from '../engine/sorrygarden.js';
import { kidRoom, magicDoor, paperFox, smallFox, paperCrane, paperStars, milkRiver, gameBridge, blanketFort, paperHills, flowerMeadow, shoebox, cupcake, sawdust, wearBeanie, woodify, woodUniforms } from '../engine/doorwall.js';

const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV, CAP = [];
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const AV = { felix: ['farm_ethan', 0.86], mae: ['farm_zoe', 0.84], kid: ['farm_lily', 0.78], robber: ['farm_robber_balaclava', 1], statue: ['farm_ethan', 0.86] };
const LINEUP = Q.get('lineup') ? Q.get('lineup').split(',') : null;
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';

// places: her world at the origin; the rooms and the meadow far away
const RA = v3(1500, 0, 0), RF = v3(1500, 0, 400), RM = v3(1500, 0, 800), MD = v3(-1500, 0, 0);
const at = (o, x, y, z) => o.clone().add(v3(x, y, z));
const DOORX = -3, BACK = -13;

const SUN = { ...DAY, ...P({ top: '#2f93ee', horizon: '#d2efff', haze: '#d2efff', sunColor: '#fff2d8', hemiSky: '#d6edff', hemiGround: '#cfe0a4' }), sunDir: v3(0.4, 0.78, 0.45), sunI: 2.2, sunDisc: 0, hemiI: 1.15, amb: 0.3, envI: 1.0, exposure: 1.0, bloom: 0.03, vig: 0, saturation: 1.22, contrast: 1.05, bounce: 0.18, fogNear: 220, fogFar: 900, stars: 0, moon: 0, win: 0, lamp: 0 };
const ROOM = { ...SUN, ...P({ top: '#ffe7c2', horizon: '#ffe7c2', haze: '#ffe7c2', sunColor: '#ffe6c0', hemiSky: '#fff4e0', hemiGround: '#d6b488' }), sunDir: v3(0.65, 0.55, 0.4), sunI: 0.35, hemiI: 1.4, amb: 0.5, envI: 0.7, saturation: 1.14, fogNear: 400, fogFar: 1200 };
const ROOMN = { ...ROOM, ...P({ top: '#0a1334', horizon: '#26356c', haze: '#1a2550', hemiSky: '#6a7cc8', hemiGround: '#3a2c3a', sunColor: '#9fb4ff' }), sunI: 0.25, hemiI: 0.95, amb: 0.3, envI: 0.45, exposure: 1.2, bloom: 0.05, saturation: 1.15 };
// her world: a lilac-pink sky; later red; later gold
const WORLD = { ...SUN, ...P({ top: '#6d4fd8', horizon: '#ffb8e0', haze: '#f6c4ec', sunColor: '#fff0e6', hemiSky: '#e8d4ff', hemiGround: '#bfe6b0' }), sunDir: v3(-0.35, 0.7, 0.55), sunI: 1.9, hemiI: 1.15, amb: 0.32, envI: 0.9, exposure: 1.02, bloom: 0.05, saturation: 1.18, contrast: 1.05, fogNear: 140, fogFar: 520 };
const WRED = { ...WORLD, ...P({ top: '#4a1030', horizon: '#ff6a6a', haze: '#e88a9a', sunColor: '#ffb0a0', hemiSky: '#ffb0c0', hemiGround: '#a07a8a' }), sunI: 1.7, hemiI: 1.05, exposure: 1.0 };
const WGOLD = { ...WORLD, ...P({ top: '#6d4fd8', horizon: '#ffd98a', haze: '#ffe0b8', sunColor: '#fff0c8', hemiSky: '#fff0d0', hemiGround: '#c8e6a8' }), sunI: 2.0, exposure: 1.04 };
const mixE = (a, b, k) => { if (k <= 0) return a; if (k >= 1) return b; const o = { ...a }; for (const key of Object.keys(b)) { const x = a[key], y = b[key]; if (typeof x === 'number' && typeof y === 'number') o[key] = lerp(x, y, k); else if (x && x.isColor) o[key] = x.clone().lerp(y, k); else if (x && x.isVector3) o[key] = x.clone().lerp(y, k); } return o; };

const capT = (word, after = 0) => { const c = CAP.find((x) => x.start >= after - 0.01 && x.text.toUpperCase().includes(word)); return c ? c.start : after; };
function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return { grow0: s(0) + 1.4, open1: s(1) - 0.3, sneak: s(2) + 0.2, woodR: capT('SCENERY', s(2)) + 0.2, fox: s(3) + 1.6, box: capT('MAE', s(3)),
    grow4: capT('MINT', s(4)) - 0.5, enter5: s(5) + 0.1, push: capT('SLIPPED', s(8)) - 0.6, creak: s(10) + 0.85, red: s(11) + 0.1, dive: capT('PAPER FOXES', s(11)) - 0.3,
    run: s(12) - 0.1, hide: s(12) + 1.7, statue: capT('WOODEN', s(12)), shout: s(14), freeze: s(15) + 0.05, crumble: capT('WOOD', s(15)) - 0.1, gold: s(15) + 0.6,
    maeRun: s(16) - 1.5, key: s(17) + 1.0, end: ctx.dur };
}

// ---- helpers (from Remakes 11-13) ----
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
function walkTo(c, a, b, t0, t1, t, speed = 1, kind = 'walk') { const u = clamp((t - t0) / (t1 - t0)); place(c, lp3(a, b, u), yawTo(a, b)); pose(c, u > 0 && u < 1 ? kind : 'idle', t * speed); return u; }
const fwd = (c, d = 1) => v3(Math.sin(c.root.rotation.y), 0, Math.cos(c.root.rotation.y)).multiplyScalar(d);
const crouch = (c, k) => { const s = c.spec.scale || 1; c.hips.position.y -= 0.9 * k / 1; c.legs.forEach((l) => { l.rotation.x = -0.9 * k; }); if (c.knee) c.knee.forEach((q) => { q.rotation.x = 1.6 * k; }); c.torso.rotation.x = 0.25 * k; void s; };

// ---- people ----
function people() {
  for (const [k, [avatar, scale]] of Object.entries(AV)) {
    const c = makeCharacter({ avatar, alti: true, skin: skinOf(avatar), caustic: false, scale });
    ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c.key = k;
    c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c);
    W[k] = c;
  }
  W.beanie = wearBeanie(W.felix, '#ffd23f', { cuff: '#ffc21a', pom: '#ffffff' });
  W.sbeanie = wearBeanie(W.statue, '#ffd23f', { cuff: '#ffc21a', pom: '#ffffff' });
  W.WU = woodify(W.felix, woodUniforms()); W.SU = woodify(W.statue, woodUniforms()); W.SU.uWoodY.value = 999; W.RU = woodify(W.robber, woodUniforms());
  W.hats = {}; for (const k of ['felix', 'mae', 'kid']) { const h = partyHat(); const c = W[k]; c.root.updateMatrixWorld(true); const bx = new THREE.Box3(); c.head.traverse((o) => { if (o.isMesh && !o.userData.worn) bx.expandByObject(o); }); const top = c.head.worldToLocal(v3(0, bx.max.y, 0)).y; h.position.set(0.25, top - 0.05, 0); h.rotation.z = -0.2; h.scale.setScalar(0.85 / (c.spec.scale || 1)); h.traverse((o) => { o.userData.worn = true; }); c.head.add(h); h.visible = false; W.hats[k] = h; }
  W.all = Object.keys(AV).map((k) => W[k]);
}
function hideAll() { W.all.forEach((c) => { c.root.visible = false; }); Object.values(W.hats).forEach((h) => { h.visible = false; }); W.beanie.visible = true; }

// wood level on Felix, in metres above his feet
function woodLevel(t) {
  const E = EV, s = (i) => L(i).start, c = W.felix, hy = HY(c), sc = c.spec.scale || 1;
  const knee = hy * 0.55, waist = hy + 0.2 * sc, chest = hy + 1.5 * sc;
  if (t < E.creak) return -5;
  if (t < s(11)) return lerp(-0.2, knee, smooth(E.creak, L(10).end, t));
  if (t < s(12)) return lerp(knee, waist, smooth(s(11), L(11).end, t));
  if (t < s(13)) return lerp(waist, waist + 0.5 * sc, smooth(s(12), L(12).end, t));
  if (t < E.crumble) return lerp(waist + 0.5 * sc, chest, smooth(s(13), s(13) + 2.5, t));
  return lerp(chest, -1, smooth(E.crumble, E.crumble + 0.7, t));
}

// ---- L0: a kid's birthday: the door grows ----
function poseGrow(t) {
  const E = EV, c = W.kid, P0 = at(RA, 0.6, 0, -7.4); place(c, P0, 0.32); pose(c, 'idle', t); W.hats.kid.visible = true;
  const g = smooth(E.grow0, E.grow0 + 1.3, t); W.dA.grow(g); W.dA.glow(g >= 1 ? 0.4 : 0); W.dA.open(0);
  lookAtP(c, at(RA, DOORX, 5 + 3 * g, BACK), 0.55); face(c, g > 0.3 ? 'surprised' : 'happy', t, 0.3, { noBlink: g > 0.3 && g < 1 });
  W.sparkA.visible = g > 0 && g < 1.2; W.sparkA.update(t);
}
// ---- L1-2: the meadow: her world of flowers; the burglar ----
const MDOOR = at(MD, -10, 0, -6);
function poseMeadow(t, burglar = false) {
  const E = EV, s = (i) => L(i).start, c = W.kid;
  W.dM.open(1); W.dM.glow(1);
  const P0 = at(MD, -8, 0, -3), P1 = at(MD, -1, 0, 3);
  if (!burglar) { const u = walkTo(c, P0, P1, s(1) - 0.2, s(1) + 2.0, t, 1.0); if (u >= 1) { place(c, P1, 0.5); pose(c, 'idle', t); const k = smooth(s(1) + 2.0, s(1) + 2.5, t); aimArm(c, 0, H(c).add(v3(-1.6, 1.8, 0.5)), k); aimArm(c, 1, H(c).add(v3(1.6, 1.8, 0.5)), k); c.root.rotation.y += Math.sin((t - s(1)) * 3) * 0.3 * k; } face(c, 'grin', t, 0.3); W.hats.kid.visible = false; }
  else {
    // the kid watering flowers, the burglar sneaking in behind; he turns to wood mid-step
    const KP = at(MD, 3, 0, 2); place(c, KP, -2.2); pose(c, 'idle', t);
    const wk = smooth(E.woodR, E.woodR + 0.8, t);
    face(c, wk > 0.5 ? 'smug' : 'happy', t, 0.3); if (wk > 0.5) lookAtP(c, H(W.robber), 0.8);
    const r = W.robber, R0 = at(MD, -10, 0, -4.5), R1 = at(MD, -4, 0, -1.8), u = clamp((t - E.sneak) / (E.woodR - E.sneak + 0.4));
    place(r, lp3(R0, R1, Math.min(u, 0.999)), yawTo(R0, R1)); const ph = (t - E.sneak) * 4.5 * (1 - wk);
    const frz = wk >= 0.02 ? E.woodR * 4.5 - E.sneak * 4.5 : ph;
    const p2 = wk > 0 ? frz : ph; r.legs[0].rotation.x = Math.sin(p2) * 0.45; r.legs[1].rotation.x = -Math.sin(p2) * 0.45; r.torso.rotation.x = 0.3; r.hips.position.y -= 0.3;
    { const f = fwd(r), sd = v3(f.z, 0, -f.x); aimArm(r, 0, H(r).add(f.clone().multiplyScalar(0.6)).add(sd.multiplyScalar(-1.4)).add(v3(0, -1.5, 0)), 1); } aimArm(r, 1, H(r).sub(fwd(r, 1.6)).add(v3(0, -2.2, 0)), 1);
    face(r, wk > 0.05 ? 'shocked' : 'smirk', t, 0.5, { noBlink: wk > 0.05 }); lookAtP(r, at(MD, 6, 3, 6), 0.5);
    W.RU.uWoodY.value = lerp(-0.5, 9, wk);
    W.sack.visible = true; r.root.updateMatrixWorld(true); W.sack.position.copy(handOf(r, 1)).add(v3(0, -0.4, 0)).sub(fwd(r, 0.5));
    W.bird.visible = wk > 0.9; if (W.bird.visible) { W.bird.position.copy(H(r)).add(v3(0, 1.45, 0)); W.bird.rotation.y = 1.2 + Math.sin(t * 2) * 0.3; }
  }
  W.butter.visible = true; W.butter.update(t);
}
// ---- L3: Felix folds; Mae keeps them in a shoebox ----
function poseFold(t) {
  const E = EV, R = W.rF, c = W.felix, D = R.desk, CP = at(RF, D.x - 5.3, 0, D.z);
  sitAt(c, CP, Math.PI / 2, R.chair.seatY); c.torso.rotation.x = 0.2; lookAtP(c, at(RF, D.x - 2.1, D.top, D.z), 0.9);
  const ph = t * 5; const hp = at(RF, D.x - 2.1, D.top + 0.6, D.z);
  aimArm(c, 0, hp.clone().add(v3(0, Math.sin(ph) * 0.2, 0.45)), 1); aimArm(c, 1, hp.clone().add(v3(0, -Math.sin(ph) * 0.2, -0.45)), 1);
  face(c, 'focused', t, 0.3);
  const k = smooth(E.fox - 0.6, E.fox, t); W.paperSq.visible = k < 1; W.paperSq.position.copy(hp).add(v3(0, -0.3, 0)); W.paperSq.rotation.set(Math.sin(ph) * 0.4, ph * 0.2, 0); W.paperSq.scale.setScalar(1 - k * 0.5);
  W.deskFox.visible = k > 0; W.deskFox.position.copy(hp).add(v3(0, -0.55, 0)); W.deskFox.scale.setScalar(0.12 * Math.max(0.01, easeOut(k))); W.deskFox.rotation.y = -Math.PI / 2 + 0.4;
  W.deskCranes.visible = true;
}
function poseBox(t) {
  const E = EV, R = W.rM, c = W.mae, B = R.bed, SP = at(RM, B.x + B.w / 2 - 0.4, 0, B.z + 2.5);
  sitAt(c, SP, Math.PI / 2, B.top + 0.1); face(c, 'happy', t, 0.4);
  const bx = W.box; bx.visible = true; bx.position.copy(SP).add(v3(1.9, B.top + 0.65, 0)); bx.rotation.y = Math.PI / 2; bx.scale.setScalar(0.7);
  const u = smooth(E.box + 0.2, E.box + 1.2, t), from = H(c).add(v3(1.2, -0.8, 0.9)), to = bx.position.clone().add(v3(0, 0.9, 0.2)), fp = lp3(from, to, u);
  W.handFox.visible = u < 1; W.handFox.position.copy(fp); W.handFox.rotation.set(0, -Math.PI / 2, 0);
  aimArm(c, 1, fp, 1); aimArm(c, 0, bx.position.clone().add(v3(-0.4, 0.4, -1.0)), 1); lookAtP(c, fp, 0.8);
}
// ---- L4-6: Mae's door ----
function poseMaeDoor(t) {
  const E = EV, c = W.mae, P0 = at(RM, 0.6, 0, -7.4); place(c, P0, 0.32); pose(c, 'idle', t); W.hats.mae.visible = true;
  const g = smooth(E.grow4, E.grow4 + 1.3, t); W.dD.grow(g); W.dD.glow(g >= 1 ? 0.35 : 0); W.dD.open(0); W.dD.lock.visible = true;
  lookAtP(c, at(RM, DOORX, 4.5 + 2.5 * g, BACK), 0.85); face(c, g > 0.2 ? 'surprised' : 'happy', t, 0.3, { noBlink: g > 0.2 && g < 1 });
  if (g >= 1) { const k = smooth(E.grow4 + 1.4, E.grow4 + 1.9, t); aimArm(c, 0, H(c).add(v3(-0.5, 0.5, 1.6)), k * 0.8); aimArm(c, 1, H(c).add(v3(0.5, 0.5, 1.6)), k * 0.8); face(c, 'grin', t, 0.3); }
  W.sparkM.visible = g > 0 && g < 1.2; W.sparkM.update(t);
  W.cake.visible = true;
}
function poseNights(t) {   // a time-lapse: she goes in; the clock spins; the window turns to day
  const E = EV, s = (i) => L(i).start, e = (i) => L(i).end, c = W.mae;
  W.dD.grow(1); W.dD.lock.visible = false;
  const u = clamp((t - s(5)) / (e(5) - s(5) + 0.1));
  W.rM.clock.set(20 + u * 12);
  const A = at(RM, 3, 0, -4), B = at(RM, DOORX + 0.2, 0, BACK + 1.0);
  const w = walkTo(c, A, B, s(5) - 0.15, s(5) + 0.8, t, 1.2); face(c, 'happy', t, 0.3);
  W.dD.open(smooth(s(5) + 0.3, s(5) + 0.7, t) * (1 - smooth(s(5) + 1.25, s(5) + 1.55, t)) + smooth(e(5) - 0.4, e(5), t) * 0.25); W.dD.glow(0.4 + W.dD.hinge.rotation.y * -0.4);
  c.root.visible = w < 0.999 || t < s(5) + 1.2; if (w >= 0.999) { c.root.position.z -= smooth(s(5) + 0.8, s(5) + 1.2, t) * 1.2; }
  W.rM.npane.visible = u < 0.7; return u;
}
function poseNotYet(t) {
  const s = (i) => L(i).start, c = W.mae, f = W.felix, MP = at(RM, 0.4, 0, -6.5), FP = at(RM, 9.5, 0, 3.0);
  W.dD.grow(1); W.dD.open(0.2); W.dD.glow(0.8); W.dD.lock.visible = false;
  place(c, MP, yawTo(MP, FP)); pose(c, 'idle', t); face(c, 'serious' in {} ? 'serious' : 'focused', t, 0.3, { viseme: talk(6, t) });
  const k = smooth(s(6) - 0.1, s(6) + 0.3, t); { const f = fwd(c), sd = v3(f.z, 0, -f.x); aimArm(c, 0, H(c).add(f.clone().multiplyScalar(1.5)).add(sd.multiplyScalar(-1.3)).add(v3(0, -1.0, 0)), k); } lookAtP(c, H(f), 0.9);
  place(f, FP, yawTo(FP, MP)); pose(f, 'idle', t); face(f, t > s(6) + 1.0 ? 'sad' : 'neutral', t, 0.6); lookAtP(f, H(c), 0.9); W.WU.uWoodY.value = -5;
}
// ---- L7: Felix's birthday ----
function poseNoDoor(t) {
  const R = W.rF, c = W.felix, P0 = at(RF, -1.0, 0, -4.5); sitAt(c, P0, Math.PI, 0.55); c.torso.rotation.x = 0.1; W.hats.felix.visible = true; W.beanie.visible = false;
  const cu = W.cup; cu.visible = true; cu.position.copy(P0).add(v3(1.0, 0.0, -2.6)); cu.scale.setScalar(0.85);
  lookAtP(c, at(RF, DOORX, 6, BACK), 0.6); face(c, 'sad', t, 0.4); aimArm(c, 0, at(RF, -1.0, 1.6, -7), 0.6); aimArm(c, 1, at(RF, -1.0, 1.6, -7), 0.6);
  W.WU.uWoodY.value = -5; void R;
}
// ---- L8: night, her door hangs open ----
function poseSlip(t) {
  const E = EV, s = (i) => L(i).start, c = W.felix;
  W.dD.grow(1); W.dD.lock.visible = false; const op = 0.22 + 0.6 * smooth(E.push, E.push + 0.5, t); W.dD.open(op); W.dD.glow(1.0);
  const A = at(RM, 15.5, 0, 6.5), B = at(RM, 2.0, 0, -4.5), Cc = at(RM, DOORX + 0.6, 0, BACK + 1.4);
  let u = walkTo(c, A, B, s(8) - 0.2, E.push - 0.3, t, 0.7); if (u >= 1) { u = walkTo(c, B, Cc, E.push - 0.3, E.push + 0.9, t, 0.9); }
  c.torso.rotation.x = 0.15; face(c, t > E.push ? 'surprised' : 'nervous', t, 0.3); lookAtP(c, at(RM, DOORX, 5, BACK), 0.6);
  if (t > E.push - 0.6) aimArm(c, 1, at(RM, DOORX + 1.6, 4.5, BACK + 1.0), smooth(E.push - 0.6, E.push - 0.2, t));
  c.root.visible = t < E.push + 1.0; W.WU.uWoodY.value = -5;
}

// ---- her world ----
const WDOOR = v3(-30, 0, 12), RIVX = 0;
const deck = (x) => (Math.abs(x) <= 11 ? W.bridge.deckY(x) : 0);
const onDeck = (p) => { p.y = deck(p.x - RIVX) + 0.0; return p; };
const OUT = v3(41, 0, 3), FORT = v3(26, 0, -4), STAT = v3(20.6, 0, 7.6), HIDE = v3(24.6, 0, 8.4);
function felixWorld(t) {
  const E = EV, s = (i) => L(i).start, e = (i) => L(i).end, c = W.felix;
  const P0 = v3(-28, 0, 12), P1 = v3(-12.5, 0, 1.5), P2 = v3(-2, 0, 0.6), P3 = v3(3.5, 0, 0.4), P4 = v3(13.5, 0, 1.0);
  let p, yaw, kind = 'idle';
  if (t < s(9) + 0.2) { p = P0.clone(); yaw = yawTo(P0, P1); }
  else if (t < e(9) + 0.1) { const u = clamp((t - s(9) - 0.2) / (e(9) - s(9) - 0.1)); p = u < 0.6 ? lp3(P0, P1, u / 0.6) : lp3(P1, P2, (u - 0.6) / 0.4); yaw = yawTo(P0, P2); kind = 'walk'; }
  else if (t < E.creak + 0.3) { const u = clamp((t - e(9) - 0.1) / (E.creak - e(9) + 0.2)); p = lp3(P2, P3, easeOut(u)); yaw = yawTo(P2, P3); kind = u < 0.95 ? 'walk' : 'idle'; }
  else if (t < E.run) { p = P3.clone(); yaw = yawTo(P2, P3) - smooth(E.dive - 0.3, E.dive + 0.6, t) * 1.2; }
  else if (t < E.hide) { const u = clamp((t - E.run) / (E.hide - E.run)); const via = lp3(P4, HIDE, 0.5).add(v3(2.5, 0, 3)); p = u < 0.4 ? lp3(P3, P4, u / 0.4) : lp3(P4, HIDE, (u - 0.4) / 0.6); void via; yaw = u < 0.4 ? yawTo(P3, P4) : yawTo(P4, HIDE); kind = 'run'; }
  else if (t < s(14) - 0.3) { p = HIDE.clone(); yaw = Math.PI * 0.15; }
  else { const u = smooth(s(14) - 0.6, s(14) + 0.2, t); p = lp3(HIDE, OUT, u); yaw = lerp(Math.PI * 0.15, yawTo(OUT, v3(24, 0, -16)) + Math.PI * 2, u); kind = u > 0 && u < 1 ? 'walk' : 'idle'; }
  onDeck(p); place(c, p, yaw); pose(c, kind, t * (kind === 'run' ? 1.3 : 1));
  W.WU.uWoodY.value = p.y + woodLevel(t);
  // stiff legs once the wood is past the knees
  if (woodLevel(t) > HY(c) * 0.5 && kind !== 'idle') c.legs.forEach((l) => { l.rotation.x *= 0.45; });
  return c;
}
function foxAt(i, t) {   // where each fox is, by time
  const E = EV, s = (i2) => L(i2).start;
  const sky = [v3(-6, 52, -70), v3(16, 58, -78), v3(36, 50, -66)], land = [v3(4, 0, -16), v3(14, 0, -22), v3(30, 0, -18)], prowl = [v3(10, 0, -12), v3(20, 0, -17), v3(34, 0, -12)];
  const pounce = [v3(14, 7, -6), v3(24, 9, -9), v3(34, 7, -3)];
  const f = W.foxes[i]; let p, yaw, k = {};
  const d0 = E.dive + i * 0.25, d1 = d0 + 1.3;
  if (t < d0) { p = sky[i].clone(); yaw = yawTo(sky[i], land[i]); k.dive = 1; }
  else if (t < d1) { const u = clamp((t - d0) / (d1 - d0)); p = lp3(sky[i], land[i], easeInOut(u)); p.y = lerp(sky[i].y, 0, 1 - Math.pow(1 - u, 2)); yaw = yawTo(sky[i], land[i]); k.dive = 1 - smooth(0.75, 1, u); }
  else if (t < s(14) + 0.9) { const u = smooth(d1, s(14) + 0.9, t); p = lp3(land[i], prowl[i], u); const tgt = W.felix.root.position; yaw = yawTo(p, tgt); k.run = u > 0 && u < 1 ? 1 : 0; k.rate = 6; k.snarl = 1; }
  else if (t < E.freeze) { const u = smooth(s(14) + 0.9, E.freeze, t); p = lp3(prowl[i], pounce[i], u); p.y = Math.sin(u * Math.PI * 0.62) * pounce[i].y * 1.3; yaw = yawTo(prowl[i], pounce[i]); k.dive = u * 0.8; }
  else { p = pounce[i].clone(); p.y = Math.sin(Math.PI * 0.62) * pounce[i].y * 1.3; yaw = yawTo(prowl[i], pounce[i]); k.dive = 0.8; }
  f.position.copy(p); f.rotation.y = yaw; f.pose(t >= E.freeze ? E.freeze : t, k);
  f.visible = true; return f;
}
function sleepFoxes(t) { const spots = [[v3(6, 0, -10), 1.0], [v3(9, 0, -18), 2.2], [v3(14, 0, -11), -0.6]]; W.foxes.forEach((f, i) => { f.visible = true; f.position.copy(spots[i][0]); f.rotation.y = spots[i][1]; f.pose(t + i, { sleep: 1 }); f.glow(0); }); }
function worldBase(t, red = 0, gold = 0) {
  W.stars.update(t); W.stars.tint(red, gold); W.river.update(t); W.fort.update(t);
  W.dW.grow(1); W.dW.open(1); W.dW.glow(1);
  W.statue.root.visible = true; place(W.statue, STAT, 0.25); pose(W.statue, 'idle', 0); face(W.statue, 'happy', 0, 0, { noBlink: true }); W.statue.arms[1].rotation.z = 0.2; aimArm(W.statue, 0, H(W.statue).add(v3(-1.0, 1.6, 0.5)), 1);
  W.plinth.visible = true;
}
function poseArrive(t) { worldBase(t); felixWorld(t); const c = W.felix; face(c, 'surprised', t, 0.3); lookAtP(c, v3(0, 22, -30), 0.5); c.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * 0.35; }); }
function poseCreak(t) {
  const E = EV; worldBase(t); const c = felixWorld(t); const k = smooth(E.creak - 0.1, E.creak + 0.4, t);
  face(c, k > 0.5 ? 'scared' : 'happy', t, 0.3, { noBlink: k > 0.5 }); c.neck.rotation.x = 0.55 * k; c.torso.rotation.x = 0.2 * k;
  if (k > 0.5) { aimArm(c, 0, H(c).add(v3(-0.6, -1.0, 1.2)), k); aimArm(c, 1, H(c).add(v3(0.6, -1.0, 1.2)), k); }
}
function poseFoxes(t) {
  const E = EV, s = (i) => L(i).start; const red = smooth(E.red, E.red + 1.2, t); worldBase(t, red, 0);
  const c = felixWorld(t); face(c, t > E.dive ? 'scared' : 'nervous', t, 0.3, { noBlink: t > E.dive }); lookAtP(c, t > E.dive ? v3(14, 14, -24) : v3(0, 30, -20), 0.8);
  if (t > E.dive + 0.2) { aimArm(c, 0, H(c).add(v3(-0.7, 0.5, 1.0)), 0.8); aimArm(c, 1, H(c).add(v3(0.7, 0.5, 1.0)), 0.8); }
  W.foxes.forEach((f, i) => foxAt(i, t)); void s;
}
function poseHide(t) {
  const E = EV, s = (i) => L(i).start; worldBase(t, 1, 0); W.foxes.forEach((f, i) => foxAt(i, t));
  const c = felixWorld(t); const hid = t >= E.hide;
  if (hid) { crouch(c, 0.55); face(c, t > E.statue + 0.3 ? 'shocked' : 'scared', t, 0.3, { noBlink: t > E.statue + 0.3 }); lookAtP(c, t > E.statue - 0.2 ? H(W.statue) : v3(30, 6, -16), 0.9); aimArm(c, 0, H(c).add(v3(-0.5, -0.6, 1.0)), 0.7); }
  else face(c, 'scared', t, 0.3, { noBlink: true });
  void s;
}
function poseThem(t) {
  const E = EV, s = (i) => L(i).start; worldBase(t, 1, 0); W.foxes.forEach((f, i) => foxAt(i, t));
  const c = felixWorld(t); crouch(c, 0.45 * (1 - smooth(s(13) + 1.8, s(13) + 2.6, t))); lookAtP(c, t < s(13) + 1.4 ? H(W.statue) : at(FORT, 0, 13, 6), 0.9);
  face(c, t > s(13) + 2.4 ? 'focused' : 'surprised', t, 0.3);
}
function poseShout(t) {
  const E = EV, s = (i) => L(i).start; worldBase(t, 1, 0); W.foxes.forEach((f, i) => foxAt(i, t));
  const c = felixWorld(t); face(c, 'angry', t, 0.3, { viseme: talk(14, t) }); lookAtP(c, v3(24, 6, -14), 0.8);
  const k = smooth(s(14) + 0.1, s(14) + 0.4, t); aimArm(c, 1, H(c).add(fwd(c, 1.4)).add(v3(0, 1.2, 0)), k); c.torso.rotation.x = -0.08;
}
function poseFreeze(t) {
  const E = EV; const gold = smooth(E.gold, E.gold + 1.0, t); worldBase(t, 1 - gold, gold); W.foxes.forEach((f, i) => { foxAt(i, t); f.glow(gold * 0.25); });
  const c = felixWorld(t); const cr = smooth(E.crumble, E.crumble + 0.7, t); face(c, cr > 0.5 ? 'grin' : 'surprised', t, 0.3); lookAtP(c, v3(24, 8, -10), 0.6 * (1 - cr));
  if (cr > 0.6) { c.neck.rotation.x = 0.35; aimArm(c, 0, H(c).add(v3(-1.4, -0.8, 0.8)), 0.7); aimArm(c, 1, H(c).add(v3(1.4, -0.8, 0.8)), 0.7); }
  W.dust.update(t);
}
function poseMae(t) {
  const E = EV, s = (i) => L(i).start; worldBase(t, 0, 1); sleepFoxes(t);
  const c = W.felix, FP = OUT.clone(); place(c, FP, 0); W.WU.uWoodY.value = -5;
  const m = W.mae, A = v3(-11, 0, 0.8), B = v3(11, 0, 0.6), Cc = v3(37.4, 0, 6.2);
  let u = walkTo(m, A, B, E.maeRun, E.maeRun + 1.4, t, 1.4, 'run'); if (u >= 1) u = walkTo(m, B, Cc, E.maeRun + 1.4, s(16) + 0.5, t, 1.4, 'run');
  onDeck(m.root.position);
  const arrived = t >= s(16) + 0.5; if (arrived) { place(m, Cc, yawTo(Cc, FP)); pose(m, 'idle', t); m.torso.rotation.x = 0.06 + Math.max(0, Math.sin(t * 6)) * 0.04 * (1 - smooth(s(16) + 0.5, s(16) + 2, t)); }
  face(m, arrived ? 'happy' : 'nervous', t, 0.3, { viseme: talk(16, t) }); if (arrived) lookAtP(m, H(c), 0.9);
  c.root.rotation.y = yawTo(FP, m.root.position); pose(c, 'idle', t); face(c, t > s(16) + 2.5 ? 'happy' : 'surprised', t, 0.6); lookAtP(c, H(m), 0.9);
}
// ---- L17: the second key ----
function poseKey(t) {
  const E = EV, s = (i) => L(i).start, m = W.mae, f = W.felix;
  W.dD.grow(1); W.dD.open(0); W.dD.glow(0); W.dD.lock.visible = true; W.dD.key2.visible = true; W.dD.key2.rotation.z = Math.sin(t * 2.2) * 0.08;
  const MP = at(RM, DOORX - 3.4, 0, BACK + 4.2), FP = at(RM, DOORX + 3.6, 0, BACK + 4.4);
  place(m, MP, 0.55); pose(m, 'idle', t); face(m, 'grin', t, 0.4); lookAtP(m, H(f), 0.7);
  place(f, FP, -0.5); pose(f, 'idle', t); face(f, 'grin', t, 0.3); lookAtP(f, at(RM, DOORX + 1.2, 5.5, BACK), 0.7 * (1 - smooth(s(17) + 2.0, s(17) + 2.5, t)));
  W.WU.uWoodY.value = -5;
  const k = smooth(E.key + 0.6, E.key + 1.2, t); if (k > 0) aimArm(f, 1, at(RM, DOORX + 1.2, 5.2, BACK + 1.2), k);
  W.rM.npane.visible = false;
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = (i) => L(i).end, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  // L0 the door grows (kid room)
  add('grow', 0, (u) => ({ pos: (() => { const h = H(W.kid); return h.clone().add(v3(2.6 - u * 0.3, 0.5, 6.8 - u * 0.6)); })(), look: H(W.kid).add(v3(-1.6, -0.5, -3)), fov: 58 }));
  // L1 behind it: the meadow
  add('meadow', s(1) - 0.04, (u) => { const h = H(W.kid); return { pos: h.clone().add(v3(2.4 - u * 0.6, 0.6, 8.0 - u * 0.8)), look: h.clone().add(v3(-1.4, -0.4, -3)), fov: 62 }; });
  // L2 the burglar
  add('sneak', s(2) - 0.04, (u) => { const h = H(W.robber); return { pos: h.clone().add(v3(5.0 - u * 0.6, 0.4, 4.6 + u * 0.4)), look: h.clone().add(v3(-0.4, -1.2, 0)), fov: 62 }; });
  add('scenery', E.woodR - 0.1, (u) => { const r = W.robber, h = H(r), f = fwd(r), sd = v3(f.z, 0, -f.x); return { pos: h.clone().add(f.clone().multiplyScalar(7.0 - u * 0.6)).add(sd.multiplyScalar(1.2)).add(v3(0, 0.4, 0)), look: h.clone().add(v3(0, -1.6, 0)), fov: 62 }; });
  // L3 folding, the shoebox
  add('fold', s(3) - 0.04, (u) => { const h = H(W.felix); return { pos: h.clone().add(v3(3.8, 0.7, 1.6 - u * 0.3)), look: h.clone().add(v3(0.6, -0.9, 0)), fov: 62 }; });
  add('box', E.box - 0.3, (u) => { const h = H(W.mae); return { pos: h.clone().add(v3(4.0 - u * 0.3, 1.7, 5.4)), look: h.clone().add(v3(0.6, -1.0, 0)), fov: 62 }; });
  // L4 Mae's door grows
  add('maedoor', s(4) - 0.04, (u) => ({ pos: (() => { const h = H(W.mae); return h.clone().add(v3(2.6 - u * 0.3, 0.5, 6.8 - u * 0.6)); })(), look: H(W.mae).add(v3(-1.6, -0.5, -3)), fov: 58 }));
  add('lock', E.grow4 + 1.45, (u) => ({ pos: lp3(at(RM, DOORX - 3.2, 4.8, BACK + 6.0), at(RM, DOORX - 2.8, 4.7, BACK + 5.4), easeInOut(u)), look: at(RM, DOORX + 1.0, 4.0, BACK), fov: 56 }));
  // L5 nights
  add('nights', s(5) - 0.04, (u) => ({ pos: lp3(at(RM, 6, 7.0, 6.5), at(RM, 5.4, 7.0, 5.8), easeInOut(u)), look: at(RM, -5.2, 6.6, -11), fov: 62 }));
  // L6 not yet
  add('notyet', s(6) - 0.04, (u) => { const h = H(W.mae); return { pos: h.clone().add(v3(6.6 - u * 0.4, 0.9, 6.2 - u * 0.3)), look: h.clone().add(v3(0.4, -0.9, 0)), fov: 58 }; });
  // L7 no door
  add('nodoor', s(7) - 0.04, (u) => ({ pos: lp3(at(RF, 3.2, 4.4, 2.2), at(RF, 2.8, 4.4, 1.4), easeInOut(u)), look: at(RF, -2.6, 4.2, -11), fov: 56 }));
  add('sad', s(7) + 0.95, (u) => { const h = H(W.felix); return { pos: h.clone().add(v3(1.2, 0.4, -4.8 + u * 0.3)), look: h.clone().add(v3(0, -0.7, 0)), fov: 62 }; });
  // L8 the door hangs open
  add('slip', s(8) - 0.04, (u) => { const h = H(W.felix); return { pos: at(RM, -9.5, 6.4, 7.5 - u), look: lp3(h, at(RM, DOORX, 4.8, BACK), 0.2), fov: 66 }; });
  add('push', E.push - 0.5, (u) => { const h = H(W.felix); return { pos: h.clone().add(v3(4.4 - u * 0.4, 0.5, 3.4)), look: h.clone().add(v3(-0.8, -0.6, -1.0)), fov: 62 }; });
  // L9 her world
  add('world', s(9) - 0.04, (u) => ({ pos: lp3(v3(-38, 9, 30), v3(-36, 13, 26), easeInOut(u)), look: lp3(v3(-12, 6, -2), v3(-4, 10, -6), easeInOut(u)), fov: 62 }));
  add('awe', s(9) + 1.95, (u) => { const h = H(W.felix); return { pos: h.clone().add(v3(4.6 - u * 0.6, 0.3, 4.6)), look: h.clone().add(v3(-0.5, 0.0, 0)), fov: 60 }; });
  // L10 the sneakers creak
  add('feet', s(10) - 0.04, (u) => { const p = W.felix.root.position; return { pos: p.clone().add(v3(3.4, 1.0, 3.2 - u * 0.4)), look: p.clone().add(v3(0, 0.8, 0)), fov: 52 }; });
  add('scared', s(10) + 1.75, (u) => { const h = H(W.felix); return { pos: h.clone().add(v3(4.4, -1.4, 4.0 - u * 0.4)), look: h.clone().add(v3(0, -1.3, 0)), fov: 64 }; });
  // L11 red stars, foxes dive
  add('red', s(11) - 0.04, (u) => { const h = H(W.felix); return { pos: h.clone().add(v3(5.5, -1.6, 5.0)), look: h.clone().add(v3(-2, 4.5 + u * 1.5, -6)), fov: 66 }; });
  add('dive', E.dive + 0.35, (u) => ({ pos: lp3(v3(-6, 4, 14), v3(-6, 4.6, 12), easeInOut(u)), look: lp3(v3(10, 12, -26), v3(12, 4, -14), easeInOut(u)), fov: 66 }));
  // L12 run, hide, the statue
  add('run', s(12) - 0.04, (u) => { const p = W.felix.root.position; return { pos: p.clone().add(v3(-4, 5.5, 12)), look: p.clone().add(v3(1.5, 2.6, -1)), fov: 62 }; });
  add('statue', E.statue - 0.25, (u) => ({ pos: lp3(v3(21.4, 5.0, 19.5), v3(21.8, 4.7, 17.8), easeInOut(u)), look: v3(22.4, 4.2, 7.6), fov: 56 }));
  // L13 them
  add('beanie', s(13) - 0.04, (u) => { const h = H(W.statue); return { pos: h.clone().add(v3(1.6 + u * 0.4, 0.4, 4.8 - u * 0.4)), look: h.clone().add(v3(0, -0.3, 0)), fov: 54 }; });
  add('flag', s(13) + 1.45, (u) => ({ pos: lp3(v3(15, 6, 22), v3(16, 7.5, 20), easeInOut(u)), look: lp3(v3(25, 8, 2), v3(26, 13, 2), easeInOut(u)), fov: 62 }));
  // L14 the shout
  add('shout', s(14) - 0.04, (u) => { const c = W.felix, h = H(c), f = fwd(c), sd = v3(f.z, 0, -f.x); return { pos: h.clone().add(f.clone().multiplyScalar(5.6 - u * 0.5)).add(sd.multiplyScalar(1.4)).add(v3(0, 0.1, 0)), look: h.clone().add(v3(0, -0.8, 0)), fov: 64 }; });
  // L15 froze, crumbled
  add('froze', s(15) - 0.04, (u) => ({ pos: lp3(v3(42, 10, 18), v3(40, 9.5, 16), easeInOut(u)), look: v3(24, 6, -6), fov: 64 }));
  add('crumble', E.crumble - 0.15, (u) => { const c = W.felix, p = c.root.position, f = fwd(c), sd = v3(f.z, 0, -f.x); return { pos: p.clone().add(f.clone().multiplyScalar(6.4 - u * 0.6)).add(sd.multiplyScalar(-1.6)).add(v3(0, 3.6, 0)), look: p.clone().add(v3(0, 2.4, 0)), fov: 62 }; });
  // L16 Mae
  add('maerun', s(16) - 0.95, (u) => ({ pos: lp3(v3(36, 6.5, 14), v3(35, 6.3, 12.5), easeInOut(u)), look: lp3(v3(10, 4, 0), v3(26, 4, 6), easeInOut(u)), fov: 60 }));
  add('half', s(16) + 1.6, (u) => { const m = W.mae, h = H(m), f = fwd(m), sd = v3(f.z, 0, -f.x); return { pos: h.clone().add(f.clone().multiplyScalar(5.2 - u * 0.4)).add(sd.multiplyScalar(1.7)).add(v3(0, 0.5, 0)), look: h.clone().add(v3(0, -0.9, 0)), fov: 62 }; });
  // L17 the key
  add('key', s(17) - 0.04, (u) => ({ pos: lp3(at(RM, DOORX + 1.8, 6.6, BACK + 4.2), at(RM, DOORX + 1.6, 6.5, BACK + 3.6), easeInOut(u)), look: at(RM, DOORX + 0.8, 6.0, BACK + 0.8), fov: 44 }));
  add('end', s(17) + 1.6, (u) => ({ pos: lp3(at(RM, DOORX + 0.6, 6.4, BACK + 15), at(RM, DOORX + 0.4, 6.8, BACK + 17.5), easeInOut(u)), look: at(RM, DOORX + 0.2, 4.8, BACK + 1), fov: 62 }));
  Sx.sort((a, b) => a.t0() - b.t0());
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
const KEYS = { grow: 'grow', meadow: 'meadow', sneak: 'sneak', scenery: 'sneak', fold: 'fold', box: 'box', maedoor: 'maedoor', lock: 'maedoor', nights: 'nights', notyet: 'notyet', nodoor: 'nodoor', sad: 'nodoor',
  slip: 'slip', push: 'slip', world: 'arrive', awe: 'arrive', feet: 'creak', scared: 'creak', red: 'foxes', dive: 'foxes', run: 'hide', statue: 'hide', beanie: 'them', flag: 'them', shout: 'shout', froze: 'freeze', crumble: 'freeze', maerun: 'mae', half: 'mae', key: 'key', end: 'key' };
const SET = { grow: 'ra', meadow: 'md', sneak: 'md', fold: 'rf', box: 'rm', maedoor: 'rm', nights: 'rmn', notyet: 'rmn', nodoor: 'rf', slip: 'rmn', arrive: 'w', creak: 'w', foxes: 'w', hide: 'w', them: 'w', shout: 'w', freeze: 'w', mae: 'w', key: 'rm' };

function worldEnv(t, key) {
  const E = EV; if (key === 'arrive' || key === 'creak') return WORLD;
  if (key === 'foxes') return mixE(WORLD, WRED, smooth(E.red, E.red + 1.2, t));
  if (key === 'freeze') return mixE(WRED, WGOLD, smooth(E.gold, E.gold + 1.0, t));
  if (key === 'mae') return WGOLD; return WRED;
}
function renderAt(t) {
  let sh = shotAt(W.shots, t); let key = KEYS[sh.name], set = SET[key];
  if (LINEUP) { key = 'lineup'; set = 'md'; }
  const env = set === 'w' ? worldEnv(t, key) : { ra: ROOM, rf: ROOM, rm: ROOM, rmn: ROOMN, md: SUN }[set];
  applyEnv(ctx, env);
  const room = set === 'rmn' ? 'rm' : set;
  W.rA.visible = room === 'ra'; W.rF.visible = room === 'rf'; W.rM.visible = room === 'rm'; W.md.visible = set === 'md'; W.world.visible = set === 'w';
  W.pt.forEach((l) => { l.intensity = l.userData.set === set ? l.userData.I : 0; });
  W.rM.npane.visible = set === 'rmn'; W.rF.npane.visible = false; W.rA.npane.visible = false;
  hideAll(); W.foxes.forEach((f) => { f.visible = false; f.glow(0); }); W.sack.visible = false; W.bird.visible = false; W.box.visible = false; W.handFox.visible = false; W.paperSq.visible = false; W.deskFox.visible = false; W.deskCranes.visible = false;
  W.cup.visible = false; W.cake.visible = false; W.plinth.visible = false; W.butter.visible = false; W.sparkA.visible = false; W.sparkM.visible = false;
  W.dD.key2.visible = false; W.dD.lock.visible = true; W.RU.uWoodY.value = -5; W.WU.uWoodY.value = -5;
  if (LINEUP) { poseLineup(t); }
  else ({ grow: () => poseGrow(t), meadow: () => poseMeadow(t, false), sneak: () => poseMeadow(t, true), fold: () => poseFold(t), box: () => poseBox(t), maedoor: () => poseMaeDoor(t), nights: () => poseNights(t), notyet: () => poseNotYet(t),
    nodoor: () => poseNoDoor(t), slip: () => poseSlip(t), arrive: () => poseArrive(t), creak: () => poseCreak(t), foxes: () => poseFoxes(t), hide: () => poseHide(t), them: () => poseThem(t), shout: () => poseShout(t), freeze: () => poseFreeze(t),
    mae: () => poseMae(t), key: () => poseKey(t) })[key]();
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2, 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * (c.spec.scale || 1); c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2], Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  if (LINEUP) { const i = Math.floor(t) % LINEUP.length, x = (i - (LINEUP.length - 1) / 2) * 4.2, hh = H(W['L' + i]); sh = { name: 'lineup', pos: at(MD, x + (t % 1 > 0.5 ? 3.2 : 0), hh.y + 0.3, 5.5), look: v3(hh.x, hh.y - 0.6, hh.z), fov: 50 }; }
  if (ctx.thumbMode) sh = { ...sh, pos: v3(15.2, 3.4, 19.5), look: v3(23.6, 8.2, 2), fov: 62 };
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  frame(ctx, t, sh, { steady: t < 2.4 || Q.get('steady') === '1', shake: 0, shadowSpan: set === 'w' ? 80 : set === 'md' ? 60 : 40, shadows: true, black: 0, flash: set === 'w' ? Math.max(0, 1 - (t - L(9).start + 0.05) / 0.35) * (t > L(9).start - 0.05 ? 0.85 : 0) : 0, flashColor: '#fff4fb' });
  return sh.name;
}
function poseLineup(t) {
  const n = LINEUP.length; LINEUP.forEach((k, i) => { const c = W['L' + i]; place(c, at(MD, (i - (n - 1) / 2) * 4.2, 0, 0), 0); pose(c, 'idle', 0); face(c, t % 1 > 0.5 ? 'happy' : 'surprised', 0, 0, { noBlink: true }); });
}

export async function setup() {
  const avs = [...new Set([...Object.values(AV).map((a) => a[0]), ...(LINEUP || [])])];
  ctx = await initStage('ep114', { look: 'pro', avatars: avs }); L = ctx.L;
  try { CAP = (await (await fetch('/build/ep114/timeline.json')).json()).captions || []; } catch (e) { CAP = []; }
  EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'smirk', 'grin', 'focused', 'shocked', 'surprised', 'nervous', 'scared', 'angry', 'blink']);
  const { scene, camera } = ctx; camera.far = 2600; camera.near = 0.1; camera.updateProjectionMatrix();
  // rooms
  W.rA = kidRoom({ wall: '#fff0c4', ink: '#ffe08a', flower: '#ffffff', quilt: '#5fbf57', curtain: '#7fc8ff', posters: [['FLOWER|POWER', '#ff8fb1', -11, 9.6]] }); W.rA.position.copy(RA); scene.add(W.rA);
  W.rF = kidRoom({ wall: '#cfe6ff', ink: '#b4d4f7', quilt: '#3d8fe0', curtain: '#ffcf4a', lampCol: '#ff8a5c', posters: [['FOLD|IT!', '#ff9a4a', -9.5, 9.6], ['PAPER|ZOO', '#5fbf57', 0.5, 9.6]] }); W.rF.position.copy(RF); scene.add(W.rF);
  W.rM = kidRoom({ wall: '#e8dcff', ink: '#d4c2ff', flower: '#fff6d0', quilt: '#ff8fb1', curtain: '#7fe0c2', chair: '#7fe0c2', lampCol: '#b26be0', rugA: '#7fe0c2', posters: [['STAR|GAZER', '#6d4fd8', -11, 9.6]] }); W.rM.position.copy(RM); scene.add(W.rM);
  W.dA = magicDoor({ color: '#ffb36a', in0: '#fff8c0', in1: '#9be08a', in2: '#5fbf57' }); W.dA.position.copy(at(RA, DOORX, 0, BACK)); scene.add(W.dA);
  W.dD = magicDoor({ color: '#7fe0c2', keyName: 'FELIX' }); W.dD.position.copy(at(RM, DOORX, 0, BACK)); scene.add(W.dD);
  W.sparkA = sparkles(scene, { count: 120, color: '#fff2b0', size: 6, height: 9, centre: at(RA, DOORX, 4.5, BACK + 1), pointSize: 0.45 });
  W.sparkM = sparkles(scene, { count: 120, color: '#c8fff0', size: 6, height: 9, centre: at(RM, DOORX, 4.5, BACK + 1), pointSize: 0.45 });
  // the meadow
  W.md = flowerMeadow(); W.md.position.copy(MD); scene.add(W.md);
  W.dM = magicDoor({ color: '#ffb36a', in0: '#fff2d6', in1: '#fff0c4', in2: '#ffe08a' }); W.dM.position.copy(MDOOR); W.dM.rotation.y = 0.5; W.md.add(W.dM); W.dM.position.sub(MD);
  W.butter = sparkles(scene, { count: 60, color: '#ffffff', size: 30, height: 6, centre: at(MD, 0, 2, 0), pointSize: 0.6 });
  // her world
  W.world = new THREE.Group(); scene.add(W.world);
  W.world.add(paperHills());
  W.stars = paperStars(90, { radius: 90, y0: 14, y1: 60 }); W.world.add(W.stars);
  W.river = milkRiver(260, 14); W.river.position.set(RIVX, 0, 0); W.world.add(W.river);
  W.bridge = gameBridge(22); W.bridge.position.set(RIVX, 0, 0.5); W.world.add(W.bridge);
  W.fort = blanketFort(); W.fort.position.copy(FORT); W.fort.rotation.y = 0; W.world.add(W.fort);
  W.dW = magicDoor({ color: '#7fe0c2', in0: '#fff4e0', in1: '#ffe0c0', in2: '#e8dcff' }); W.dW.position.copy(WDOOR); W.dW.rotation.y = -Math.PI / 2 + 0.6; W.world.add(W.dW); W.dW.lock.visible = false;
  { const pl = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 3.2), new THREE.MeshStandardMaterial({ color: '#ff8fb1', roughness: 0.6 })); b.position.y = -0.2; b.castShadow = b.receiveShadow = true; pl.add(b); pl.position.copy(STAT); W.world.add(pl); W.plinth = pl; }
  W.foxes = [paperFox({ col: '#ff9a4a', col2: '#ffb878', col3: '#e9772f' }), paperFox({ col: '#ffd36a', col2: '#ffe6a0', col3: '#e8b23a', bent: false }), paperFox({ col: '#ff8fb1', col2: '#ffc2d6', col3: '#e86a94' })];
  W.foxes.forEach((f) => { f.scale.setScalar(1.25); scene.add(f); f.visible = false; });
  // props
  W.box = shoebox(); scene.add(W.box); W.box.visible = false;
  W.handFox = smallFox(0.1, { col: '#ff9a4a' }); scene.add(W.handFox);
  W.deskFox = smallFox(0.12, { col: '#ff9a4a' }); scene.add(W.deskFox);
  W.paperSq = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({ color: '#ff9a4a', roughness: 0.9, side: THREE.DoubleSide })); scene.add(W.paperSq);
  W.deskCranes = new THREE.Group(); { const D = W.rF.desk; [['#7fc8ff', 1.2, -2.6], ['#ffd36a', 0.4, 2.4], ['#ff8fb1', 1.5, 1.4], ['#9be08a', -0.6, -1.4]].forEach(([c, x, z], i) => { const cr = i === 3 ? smallFox(0.09, { col: '#9be08a' }) : paperCrane(c); if (i !== 3) cr.scale.setScalar(0.5); cr.position.copy(at(RF, D.x + x, D.top + 0.4, D.z + z)); cr.rotation.y = i * 1.3; W.deskCranes.add(cr); }); } scene.add(W.deskCranes);
  W.cup = cupcake(); scene.add(W.cup);
  W.cake = cupcake(); W.cake.scale.setScalar(1.6); W.cake.position.copy(at(RM, W.rM.desk.x - 0.5, W.rM.desk.top, W.rM.desk.z + 2)); scene.add(W.cake);
  W.sack = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), new THREE.MeshStandardMaterial({ color: '#d8c8a8', roughness: 0.95 })); W.sack.scale.set(1, 1.25, 1); W.sack.castShadow = true; scene.add(W.sack);
  W.bird = new THREE.Group(); { const bd = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshStandardMaterial({ color: '#4fa8ff', roughness: 0.6 })); bd.scale.set(1, 0.9, 1.3); W.bird.add(bd); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), bd.material); hd.position.set(0, 0.28, 0.3); W.bird.add(hd); const bk = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), new THREE.MeshStandardMaterial({ color: '#ffb020' })); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.28, 0.55); W.bird.add(bk); } scene.add(W.bird);
  W.dust = sawdust(scene, 180);
  const PL = (c, I, d, set, p) => { const l = new THREE.PointLight(c, I, d, 1.5); if (p) l.position.copy(p); l.userData.I = I; l.userData.set = set; scene.add(l); return l; };
  W.pt = [PL('#fff0d8', 520, 60, 'ra', at(RA, 0, 14, 0)), PL('#fff0d8', 520, 60, 'rf', at(RF, 0, 14, 0)), PL('#fff0d8', 520, 60, 'rm', at(RM, 0, 14, 0)),
    PL('#ffd9a0', 150, 40, 'rmn', at(RM, 12, 9, -6)), PL('#c8fff0', 220, 30, 'rmn', at(RM, DOORX, 5, BACK + 2.5)), PL('#9fb4ff', 70, 40, 'rmn', at(RM, 0, 12, 4)),
    PL('#ffb0e8', 260, 70, 'w', v3(-10, 20, 20)), PL('#9fd8ff', 200, 70, 'w', v3(30, 18, 20))];
  if (LINEUP) LINEUP.forEach((k, i) => { const c = makeCharacter({ avatar: k, alti: true, skin: skinOf(k), caustic: false, scale: 0.86 }); scene.add(c.root); jointify(c); W['L' + i] = c; });
  people();
  W.dust.fire(EV.crumble + 0.05, OUT, 3.2);
  W.shots = shots();
  window.__ep114 = { W, THREE, ctx, L, EV };
  return expose(ctx, renderAt, L(13).start + 0.5, EV);
}
