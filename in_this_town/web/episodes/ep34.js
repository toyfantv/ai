// Episode 34: The Soldiers Who Never Missed (In This Town, action 3/3). At 2 AM the masked soldiers of an abandoned training
// facility wake. Eli finds the place from an empty industrial district (Atlanta94275 walks away under a streetlight). Inside,
// hundreds of soldiers stand like targets in a range (Gregy_dinosour among them, his framed board a target stand). The lights
// turn red, a PA voice resumes the training session, every target turns toward him, gunfire: Eli dives behind a concrete
// barrier, sparks and dust burst off it, he grabs a training rifle and fires back; one soldier falls, another; every fallen one
// glitches back into existence. He sprints down a side corridor, kicks open a steel door: the control room. A giant screen of
// identical sessions, all with Eli. "FINAL TEST: ELIMINATE THE ORIGINAL." The soldiers stop firing; every mask turns to the
// screen. The original isn't him: it's the person watching. The control room's camera turns toward the viewer.
// World: the hall runs along -z from the entrance wall (z = 12); the soldiers' ranks fill z = -34 .. -194; a line of concrete
// barriers at z = -20. The side corridor leaves the left wall (x = -15) at z = -16 and runs to the control room's door wall at
// x = -38; the control room is x -56 .. -38, its giant screen on the back wall facing +x. The street outside is at x + EXT.
// No impact frames in this episode (the user: impact frames only in melee): gunfire reads through flashes, recoil, tracers,
// sparks, dust, hit reactions. Clips: engine/anims.js (hand-keyed Episode 34 tactical clips, Mixamo magic_set reactions).
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng } from '../engine/core.js';
import { makeCharacter, pose, nameTag } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P } from '../engine/stage.js';
import { loadAnimSet, sample, blend, applyPose, aimArm } from '../engine/anims.js';
import { glow } from '../engine/arena.js';
import { vanisher } from '../engine/atmos.js';
import { crate, barrel } from '../engine/kit.js';
import { paSpeaker } from '../engine/hospital.js';
import { installActionFX } from '../engine/actionfx.js';
import { trainingRifle, soldierGear, syncRanks, muzzleFlashes, flashK, tracers, eventParticles, bulletHoles, smokeHaze, jerseyBarrier, steelDoor, wallClock, trainingHall, controlRoom, feedWall, industrialDistrict, holdRifle, bloodFX } from '../engine/tactical.js';
import { canvasTex } from '../engine/props.js';

let ctx, L;
const W = {};
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const ESKIN = '#f2c9a0', SSKIN = '#e6c3a0';
const EXT = v3(1200, 0, 0);          // the street is built far away from the hall
const VIEW = v3(3000, 0, 0);         // the viewer's room (the alt feed)
const FRONT = -34, ROWS = 30, COLS = 7, DX = 4.0, DZ = 5.5;   // the ranks
const BAR = { z: -20, xs: [-10.8, -3, 4.8, 11.6], len: 4.2, top: 3.08 };
const KN = v3(-3, 0, -16.6);         // Eli's kneel spot behind the barrier
const DOORX = -38, ZC = -16;         // the control room's door wall and the corridor's centre line
const CRATE = v3(-0.6, 0, -16.2);

// ---- palettes (indoor: the "sky" is never seen; it sets the haze and the fill) ----
const HALL = P({ top: '#0b0d12', horizon: '#14171d', haze: '#101217', sunColor: '#c4cedb', sunI: 1.05, sunDir: v3(0.22, 0.93, 0.3),
  sunDisc: 0, sunSize: 1, stars: 0, moon: 0, hemiSky: '#8a94a6', hemiGround: '#3c3d44', hemiI: 1.45, amb: 0.3, caus: '#ffffff', causI: 0,
  exposure: 1.28, vig: 0, win: 0, lamp: 0, fogNear: 70, fogFar: 240, bloom: 0.04, envI: 0.45, saturation: 1.02, contrast: 1.06, bounce: 0.16 });
const RED = { ...HALL, ...P({ haze: '#1c0907', sunColor: '#ff7a64', sunI: 0.95, hemiSky: '#c0574a', hemiGround: '#3c1c1a', hemiI: 1.55, amb: 0.3, exposure: 1.32, fogNear: 60, fogFar: 210 }), saturation: 1.06, contrast: 1.08 };
const STREET = P({ top: '#04060d', horizon: '#18202e', haze: '#151a24', sunColor: '#a8b8de', sunI: 0.75, sunDir: v3(-0.4, 0.72, -0.5),
  sunDisc: 0, sunSize: 1, stars: 0.45, moon: 1, hemiSky: '#56658a', hemiGround: '#2c2622', hemiI: 1.2, amb: 0.22, caus: '#ffffff', causI: 0,
  exposure: 1.3, vig: 0, win: 0, lamp: 3.0, fogNear: 60, fogFar: 330, bloom: 0.05, envI: 0.45, saturation: 1.04, contrast: 1.06, bounce: 0.14 });
const ROOM = { ...HALL, ...P({ haze: '#06080c', sunColor: '#9fb2d0', sunI: 0.35, hemiSky: '#5c6c8c', hemiGround: '#1c1e24', hemiI: 1.15, amb: 0.22, exposure: 1.32 }) };
const VIEWENV = { ...STREET, ...P({ sunI: 0.15, hemiI: 0.45, amb: 0.12, lamp: 0, stars: 0, moon: 0 }) };
const ROOMRED = { ...ROOM, ...P({ hemiSky: '#a04c48', hemiGround: '#2a1416' }) };

// ---- timing ----
const T = {};
function events() {
  const s = (i) => L(i).start;
  Object.assign(T, {
    clock: s(0) + 0.75, wake: s(0) + 3.6, ext0: s(2) - 0.35, ext1: s(3) - 0.15, in0: s(3) - 0.15, in1: s(3) + 2.7,
    red0: s(4) + 0.15, red1: s(4) + 1.3, pa: s(5), gturn: s(6) + 0.05, turn: s(6) + 0.5, raise: s(6) + 1.15,
    fire0: s(7) + 0.12, run0: s(8) + 0.0, grab: s(10) + 0.15, pop1: s(11) - 0.05, hitA: s(12) + 0.18, hitB: s(13) + 0.16,
    down1: s(14) - 0.02, mout: s(14) + 0.35, min: s(14) + 1.15, rack2: s(14) + 1.45, pop2: s(14) + 1.75, hitC: s(14) + 2.2,
    backA: s(14) + 0.35, backB: s(14) + 0.85, backC: s(14) + 2.7, spr0: s(15) - 0.3, kick: s(16) + 0.02, walkIn0: s(17) - 0.25,
    sq0: s(21) + 0.1, msg: s(21) + 0.35, stop: s(23) + 0.2, masks: s(24) + 0.15, closer: s(25) + 0.05, orig: s(26) + 0.1, view: s(27) + 0.05,
    cam0: s(28) + 0.35, end: ctx.dur,
  });
  T.dive0 = T.run0 + 0.72; T.land = T.dive0 + 0.55; T.knee = T.dive0 + 0.95;
  T.kc = T.kick + 0.32; T.spr1 = T.kick - 0.05;
  return { ...T };
}
// volley bursts: [start, end, period]; the soldiers fire in perfect sync on these times
function bursts() {
  const s = (i) => L(i).start;
  return [[T.fire0, T.knee + 0.2, 0.15], [T.knee + 0.2, s(10) + 0.05, 0.15], [s(10) + 0.3, T.pop1, 0.3], [T.pop1 + 0.35, T.down1 + 0.4, 0.25],
    [T.down1 + 0.4, T.spr0, 0.16], [T.spr0, T.kick - 0.2, 0.12], [T.kick + 0.2, T.stop, 0.2]];
}

// ---- clips ----
const S_ = (name, t, o = {}) => sample(name, t, o);
function seq(list, t, bl = 0.12) {
  let i = 0; for (let k = 0; k < list.length; k++) if (t >= list[k][0]) i = k;
  const cur = list[i][1](t); if (i === 0) return cur;
  const k = (t - list[i][0]) / (list[i][2] ?? bl); return k >= 1 ? cur : blend(list[i - 1][1](t), cur, easeInOut(clamp(k)));
}
const clip = (name, t0, o = {}) => (t) => S_(name, t - t0, o);
const idleP = (t) => S_('kneel', 0);

// ---- Eli ----
const D0 = v3(-1.6, 0, -10.6), DL = v3(-2.7, 0, -15.3);
function eliRoot(t) {
  let p = v3(0, 0, 9), ry = Math.PI, rx = 0, y = 0;
  if (t < T.in0) {   // outside, walking toward the facility (the street at EXT)
    const k = clamp((t - T.ext0) / (T.ext1 - T.ext0));
    return { p: EXT.clone().add(v3(1.5, 0, lerp(-138, -166, k))), ry: Math.PI, rx: 0, out: true };
  }
  if (t >= T.in0) { const k = smooth(T.in0, T.in1, t); p.set(lerp(0.4, 0, k), 0, lerp(11, -4, k)); }
  if (t >= T.run0) { const k = clamp((t - T.run0) / (T.dive0 - T.run0)); p = lp3(v3(0, 0, -4), D0, k * (0.6 + 0.4 * k)); ry = Math.PI + 0.12; }
  if (t >= T.dive0) {
    const u = clamp((t - T.dive0) / 0.55); p = lp3(D0, DL, easeOut(u)); y = 1.7 * Math.sin(Math.PI * u) * (1 - 0.25 * u); rx = 1.35 * Math.sin(Math.PI * clamp(u / 1.0)) ;
    if (t >= T.land) { const k = easeOut(clamp((t - T.land) / 0.4)); p = lp3(DL, KN, k); y = 0; rx = 0; }
    ry = Math.PI;
  }
  if (t >= T.spr0) {
    // up and away along the barrier line, into the corridor, to the door
    const a = T.spr0 + 0.25, b = T.spr1, path = [KN, v3(-8, 0, -16.2), v3(-14, 0, ZC), v3(DOORX + 1.7, 0, ZC)];
    const segL = [5.0, 6.0, 22.3], tot = segL.reduce((x, y) => x + y, 0), u = smooth(a - 0.05, b, t) * 0.15 + clamp((t - a) / (b - a)) * 0.85;
    let d = u * tot, i = 0; while (i < 2 && d > segL[i]) { d -= segL[i]; i++; }
    p = lp3(path[i], path[i + 1], clamp(d / segL[i])); ry = t < a ? Math.PI : -Math.PI / 2 - (i === 0 ? 0.25 : 0);
  }
  if (t >= T.kick) { p = v3(DOORX + 1.7, 0, ZC); ry = -Math.PI / 2; }
  if (t >= T.kc + 0.4) { const k = smooth(T.kc + 0.4, T.walkIn0 + 1.9, t); p = v3(lerp(DOORX + 1.2, -45.5, k), 0, ZC); }
  if (t >= T.closer) { const k = smooth(T.closer, T.closer + 1.4, t); p = v3(lerp(-45.5, -49.5, k), 0, ZC); }
  return { p: p.setY(y), ry, rx };
}
const eliWalking = (t) => (t > T.ext0 && t < T.ext1) || (t > T.in0 + 0.1 && t < T.in1 - 0.2) || (t > T.kc + 0.55 && t < T.walkIn0 + 1.75) || (t > T.closer + 0.1 && t < T.closer + 1.3);
const eliRunning = (t) => (t > T.run0 && t < T.dive0) || (t > T.spr0 + 0.25 && t < T.spr1);
function eliPose(t) {
  return seq([
    [0, idleP],
    [T.dive0 - 0.05, clip('dive', T.dive0), 0.06],
    [T.land + 0.25, clip('slap', T.land + 0.25), 0.15],
    [T.land + 1.3, (t) => S_('kneel', t, { loop: true }), 0.3],
    [T.pop1, clip('kneelUp', T.pop1), 0.06],
    [T.down1, clip('kneelDown', T.down1), 0.06],
    [T.down1 + 0.3, (t) => S_('kneel', t, { loop: true }), 0.15],
    [T.pop2, clip('kneelUp', T.pop2), 0.06],
    [T.spr0, (t) => S_('kneelDown', 0.25 - clamp(t - T.spr0, 0, 0.25)), 0.05],
    [T.kick - 0.02, clip('doorKick', T.kick), 0.05],
    [T.kick + 0.85, (t) => S_('kneel', 0), 99],
  ], t);
}
// where Eli aims: the soldier he fires at (his own target list), else down the hall
function eliAim(t) {
  if (t < T.hitA + 0.05) return W.frontPos[W.A].clone().add(v3(0, 3.4, 0));
  if (t < T.hitB + 0.05) return lp3(W.frontPos[W.A], W.frontPos[W.B], smooth(T.hitA + 0.15, T.hitB - 0.45, t)).add(v3(0, 3.4, 0));
  if (t < T.pop2) return W.frontPos[W.B].clone().add(v3(0, 3.4, 0));
  return W.frontPos[W.C].clone().add(v3(0, 3.4, 0));
}
function eliShots() {
  const a = [], add = (t0, n, dt) => { for (let i = 0; i < n; i++) a.push(t0 + i * dt); };
  add(T.pop1 + 0.3, 5, 0.12); add(T.hitA - 0.12, 2, 0.12); add(T.hitB - 0.36, 4, 0.12); add(T.hitC - 0.36, 4, 0.12);
  return a.filter((x, i, arr) => arr.indexOf(x) === i).sort((x, y) => x - y);
}

// ---- the soldiers' sync pose (every soldier in the hall, a pure function of t) ----
// ry: they face away (-z) until the turn; head bowed until 2 AM; rifles low, raised for the volleys; lowered at the stop; and at
// the end every head turns to the lens of the hall's CCTV (the screen)
function syncState(t) {
  const st = { ry: 0, bow: 0, aimK: 0, down: 1, rec: 0, look: 0 };
  st.bow = 1 - smooth(T.wake, T.wake + 0.28, t);
  st.ry = t < T.turn ? Math.PI : 0; if (t >= T.turn) st.ry = Math.PI * (1 - easeInOut(clamp((t - T.turn) / 0.32)));
  st.aimK = smooth(T.raise, T.raise + 0.35, t) * (1 - smooth(T.stop, T.stop + 0.45, t));
  st.down = 1 - st.aimK;
  for (const v of W.VOL) { const d = t - v; if (d >= 0 && d < 0.12) st.rec = Math.max(st.rec, d < 0.02 ? d / 0.02 : Math.exp(-(d - 0.02) * 30)); }
  st.look = smooth(T.masks, T.masks + 0.5, t);
  return st;
}
// the target point the hall's soldiers fire at, as seen from the rank's centre (parallel fire), with per-volley jitter
const hh = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function hallAim(t) {
  let base;
  if (t < T.run0) base = v3(0, 3.2, -4);
  else if (t < T.knee) base = eliRoot(t - 0.25).p.clone().setY(2.6);
  else if (t < T.spr0) base = v3(KN.x, BAR.top + 0.2, BAR.z + 0.6);
  else if (t < T.kick) base = eliRoot(t - 0.3).p.clone().setY(2.4);
  else base = v3(KN.x, BAR.top + 0.2, BAR.z + 0.6);
  const i = Math.floor(t * 50);
  return base.add(v3((hh(i) - 0.5) * 3.2, (hh(i + 7) - 0.5) * 1.6, 0));
}
function poseSoldier(c, t, st, origin, aimPt, o = {}) {
  c.reset(); c.root.position.copy(origin); c.root.rotation.set(0, st.ry + (o.dry || 0), 0);
  pose(c, 'still', t);
  c.neck.rotation.x = 0.55 * st.bow;
  c.root.updateMatrixWorld(true);
  if (!c.rifle) return null;
  const r = holdRifle(c, c.rifle, aimPt, { k: 1, down: st.down, recoil: st.rec, blade: 0.5 });
  if (st.look > 0 && o.lookAt) { c.root.updateMatrixWorld(true); const hp = c.neck.getWorldPosition(v3(0, 0, 0)), d = o.lookAt.clone().sub(hp); const yaw = Math.atan2(d.x, d.z) - (st.ry + (o.dry || 0)); c.neck.rotation.y = lerp(c.neck.rotation.y, Math.atan2(Math.sin(yaw), Math.cos(yaw)) - c.torso.rotation.y, st.look); c.neck.rotation.x = lerp(c.neck.rotation.x, -0.12, st.look); }
  return r;
}

// ---- set ----
function world() {
  const { scene } = ctx;
  W.hall = trainingHall({ z1: -200, xd: DOORX, zc: ZC }); scene.add(W.hall);
  W.barriers = BAR.xs.map((x) => { const b = jerseyBarrier({ len: BAR.len }); b.position.set(x, 0, BAR.z); scene.add(b); return b; });
  W.crate = crate({ size: 1.6, color: '#5c6a46' }); W.crate.position.copy(CRATE); scene.add(W.crate);
  // clutter: crates, barrels, a fallen target stand, dust
  [[11, -6, 2.2], [12.4, -9, 1.8], [-12.5, 4, 2.4], [-11.8, 1.5, 1.6], [12.5, 6, 2.4]].forEach(([x, z, s], i) => { const c = crate({ size: s, color: ['#6a5a3c', '#5c6a46', '#4f5a62'][i % 3] }); c.position.set(x, 0, z); c.rotation.y = i * 0.4; scene.add(c); });
  [[-12.6, -8], [13, -2]].forEach(([x, z]) => { const b = barrel({ height: 3.2, color: '#5a3a2a' }); b.position.set(x, 0, z); scene.add(b); });
  W.clock = wallClock({ r: 1.5 }); W.clock.position.set(-14.85, 8.6, -60); W.clock.rotation.y = Math.PI / 2; scene.add(W.clock);
  W.pa = paSpeaker(); W.pa.position.set(-13.6, 10.2, 2); W.pa.rotation.z = -Math.PI / 2 + 0.3; W.pa.rotation.y = 0; scene.add(W.pa);
  W.smoke = smokeHaze(scene, { centre: v3(0, 3.5, -40), size: v3(28, 6, 80), count: 260, pointSize: 9, amount: 0.12, color: '#6a5e60' });
  W.smoke2 = smokeHaze(scene, { centre: v3(-26, 3, ZC), size: v3(22, 5, 5), count: 70, pointSize: 6, amount: 0.1, color: '#5e5456', seed: 4 });
  W.door = steelDoor({ w: 4.2, h: 7.2 }); W.door.position.set(DOORX, 0, ZC - 2.1); W.door.rotation.y = -Math.PI / 2; scene.add(W.door);
  W.room = controlRoom({ x0: DOORX, x1: -56, zA: -27, zB: -5, door: { z: ZC, w: 4.2, h: 7.2 } }); scene.add(W.room);
  // the street outside (far away), the viewer's room (farther)
  W.ext = industrialDistrict({ facZ: -175 }); W.ext.group.position.copy(EXT); scene.add(W.ext.group);
  W.viewRoom = viewerRoom(); W.viewRoom.position.copy(VIEW); scene.add(W.viewRoom);
  // lights: a fill and a rim that follow the subject, the volley light, Eli's muzzle light, the screen's light, sodium lamps outside
  W.fill = new THREE.PointLight('#ffffff', 0, 26, 1.6); W.rim = new THREE.PointLight('#ffffff', 0, 28, 1.4);
  W.volL = new THREE.PointLight('#ffb070', 0, 40, 1.4); W.eliL = new THREE.PointLight('#ffc080', 0, 16, 1.6);
  W.scrL = new THREE.PointLight('#9cc4ff', 0, 30, 1.2); W.beaconL = [0, 1].map(() => new THREE.PointLight('#ff2a18', 0, 30, 1.4));
  W.lampL = [0, 1, 2].map(() => new THREE.PointLight('#ffb35a', 0, 34, 1.5));
  [W.fill, W.rim, W.volL, W.eliL, W.scrL, ...W.beaconL, ...W.lampL].forEach((l) => scene.add(l));
  W.beaconG = W.hall.beacons.map((p) => { const g = glow(new THREE.Color('#ff3020'), 2.2, 0); g.position.copy(p); scene.add(g); return g; });
}
// the viewer: a dark bedroom lit by a phone, seen from the phone's front camera (rendered into the alt feed)
function viewerRoom() {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: '#2a2e3a', roughness: 0.9 }), bed = new THREE.MeshStandardMaterial({ color: '#3a3f55', roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(30, 16, 0.5), wall); back.position.set(0, 8, -6); g.add(back);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(30, 0.5, 30), wall); fl.position.set(0, -0.25, 0); g.add(fl);
  const b = new THREE.Mesh(new THREE.BoxGeometry(9, 1.6, 6), bed); b.position.set(0, 1.4, -3); g.add(b);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 2), new THREE.MeshStandardMaterial({ color: '#c8c6d4', roughness: 0.9 })); pillow.position.set(0, 2.6, -5); pillow.rotation.x = -0.4; g.add(pillow);
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshStandardMaterial({ color: '#4a3a5a', roughness: 0.8 })); poster.position.set(-6, 9, -5.7); g.add(poster);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshBasicMaterial({ color: '#1a2440' })); win.position.set(7, 9, -5.7); g.add(win);
  g.traverse((m) => { if (m.isMesh) m.receiveShadow = true; });
  return g;
}

// ---- people ----
function people() {
  const mk = (avatar, skin, o = {}) => { const c = makeCharacter({ avatar, alti: true, skin, caustic: false, ...o }); ctx.scene.add(c.root); c.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return c; };
  W.eli = mk('farm_ep34_eli', ESKIN); W.eli.root.rotation.order = 'YXZ';
  W.eli.rifle = trainingRifle({}); ctx.scene.add(W.eli.rifle);
  W.eliF = mk('farm_ep34_eli', ESKIN); W.eliF.rifle = trainingRifle({}); ctx.scene.add(W.eliF.rifle);   // Eli in the hall's feed (drawn only into it)
  W.atl = makeCharacter({ avatar: 'farm_ep32_atlanta' }); ctx.scene.add(W.atl.root); W.atl.root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  W.tagA = nameTag(W.atl, 'Atlanta94275', { width: 4.4, y: 6.6 });
  W.gregy = makeCharacter({ avatar: 'farm_ep34_gregy' }); ctx.scene.add(W.gregy.root); W.gregy.root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  W.tagG = nameTag(W.gregy, 'Gregy_dinosour', { width: 4.6, y: 6.4 });
  // the soldiers: a template for the ranks (instanced), one for the doorway squad, and the front rank one by one
  const soldier = (num) => { const c = mk('farm_ep34_soldier_a', SSKIN); if (c.faceSheet) c.faceSheet.visible = false; c.root.updateMatrixWorld(true); c.gear = soldierGear(c, { number: num }); c.rifle = trainingRifle({ body: '#2c2f33', trim: '#55595e', tip: '#ff6a1a' }); ctx.scene.add(c.rifle); return c; };
  W.tpl = soldier(7); W.tplB = soldier(12);
  W.front = []; W.frontPos = [];
  for (let c = 0; c < COLS; c++) { const x = (c - (COLS - 1) / 2) * DX; W.frontPos.push(v3(x, 0, FRONT)); }
  W.G = 3;                       // Gregy's place in the front rank (the centre)
  W.A = 2; W.B = 4; W.C = 1;     // the soldiers Eli hits (left of centre, right of centre, far left)
  for (let c = 0; c < COLS; c++) W.front.push(c === W.G ? null : soldier(100 + c));
  // replacements for the three who fall (they glitch in where the fallen were)
  W.rep = [W.A, W.B, W.C].map((c, i) => soldier(200 + i));
  W.vanF = {}; W.vanR = {};
  [W.A, W.B, W.C].forEach((c, i) => { W.vanF[c] = vanisher(W.front[c], '#ff2a1a'); W.vanR[c] = vanisher(W.rep[i], '#ff2a1a'); });
  // the ranks behind: staggered rows
  const places = []; for (let r = 1; r < ROWS; r++) for (let c = 0; c < COLS; c++) places.push({ x: (c - (COLS - 1) / 2) * DX + (r % 2 ? DX / 2 : 0) - (r % 2 ? DX / 4 : 0), z: FRONT - r * DZ });
  W.ranks = syncRanks(ctx.scene, W.tpl, places, { extra: [W.tpl.rifle] }); W.rankPlaces = places;
  const sq = [[-31.5, -17.6], [-31.5, -14.4], [-28, -16], [-24.5, -17.6], [-24.5, -14.4]];
  W.squad = syncRanks(ctx.scene, W.tplB, sq.map(([x, z]) => ({ x, z })), { extra: [W.tplB.rifle] }); W.squadPlaces = sq.map(([x, z]) => v3(x, 0, z));
  W.vanSq = vanisher(W.tplB, '#ff2a1a');
  W.tpl.root.position.set(0, -500, 0); W.tplB.root.position.set(0, -500, 0);
  // the faces' faint fringe pixels read as rings round the eyes in close-ups: cut them
  if (W.eli.faceSheet) { W.eli.faceSheet.material.alphaTest = 0.35; W.eli.faceSheet.material.needsUpdate = true; }
}

// ---- the volleys: muzzles, tracers and the hits (made once, so every worker agrees) ----
const WALLS = (o, d) => {   // the nearest surface a ray from o along d meets: { t, n }
  let best = { t: 1e9, n: v3(0, 1, 0) };
  const pl = (axis, val, n) => { const den = d[axis]; if (Math.abs(den) < 1e-6) return; const t = (val - o[axis]) / den; if (t > 0.05 && t < best.t) { const p = o.clone().addScaledVector(d, t); if (axis !== 'y' && (p.y < 0 || p.y > 13)) return; best = { t, n }; } };
  pl('y', 0, v3(0, 1, 0)); pl('x', 15, v3(-1, 0, 0)); pl('x', -15, v3(1, 0, 0)); pl('z', 12, v3(0, 0, -1));
  // the corridor mouth: a ray into the opening carries on to the corridor's walls (approximate: let it hit the far wall)
  for (const bx of BAR.xs) {   // the barriers as boxes (a narrower top)
    for (const [y0, y1, hz] of [[0, 1.95, 0.85], [1.95, BAR.top, 0.38]]) {
      const lo = v3(bx - BAR.len / 2, y0, BAR.z - hz), hi = v3(bx + BAR.len / 2, y1, BAR.z + hz);
      let t0 = -1e9, t1 = 1e9, n = null;
      for (const ax of ['x', 'y', 'z']) { if (Math.abs(d[ax]) < 1e-9) { if (o[ax] < lo[ax] || o[ax] > hi[ax]) { t0 = 1e9; break; } continue; }
        let a = (lo[ax] - o[ax]) / d[ax], b = (hi[ax] - o[ax]) / d[ax]; let na = v3(0, 0, 0); na[ax] = -Math.sign(d[ax]); if (a > b) [a, b] = [b, a]; if (a > t0) { t0 = a; n = na; } t1 = Math.min(t1, b); }
      if (t0 < t1 && t0 > 0.05 && t0 < best.t && n) best = { t: t0, n };
    }
  }
  const cb = { lo: v3(CRATE.x - 0.8, 0, CRATE.z - 0.8), hi: v3(CRATE.x + 0.8, 1.6, CRATE.z + 0.8) };
  return best;
};
function buildVolleys() {
  W.VOL = []; for (const [a, b, dt] of bursts()) for (let x = a; x < b - 1e-6; x += dt) W.VOL.push(+x.toFixed(4));
  const tr = [], sparks = [], dusts = [], chips = [], holes = [];
  const shooters = [];   // [ { kind: 'front', c } | { kind: 'rank', i } ]
  for (let c = 0; c < COLS; c++) if (c !== W.G) shooters.push({ kind: 'front', c });
  for (let i = 0; i < COLS * 2; i++) shooters.push({ kind: 'rank', i });
  W.VOL.forEach((v, vi) => {
    const st = syncState(v + 1e-4), aim = hallAim(v);
    // the rank template at the rank's centre
    const r = poseSoldier(W.tpl, v, st, v3(0, 0, 0), aim.clone().sub(v3(0, 0, FRONT)));
    const inRoom = v > T.kick + 0.2, every = inRoom ? 3 : 1;
    shooters.forEach((s, si) => {
      if ((si + vi) % every) return;
      let mz, dir;
      if (s.kind === 'front') {
        if (!frontAlive(s.c, v)) return;
        const rr = poseSoldier(W.front[s.c], v, st, W.frontPos[s.c], aim); mz = rr.muzzle; dir = rr.dir;
      } else { const p = W.rankPlaces[s.i]; mz = r.muzzle.clone().add(v3(p.x, 0, p.z)); dir = r.dir.clone(); }
      const jit = v3(hh(vi * 13 + si) - 0.5, hh(vi * 7 + si * 3) - 0.5, 0).multiplyScalar(0.06); const d = dir.clone().add(jit).normalize();
      const hit = WALLS(mz, d), hp = mz.clone().addScaledVector(d, hit.t), tHit = v + hit.t / 260;
      tr.push({ t: v, a: mz, b: hp });
      const ev = { t: tHit, p: hp, n: hit.n };
      sparks.push(ev); if (si % 2 === 0) dusts.push(ev); if (si % 3 === 0) chips.push(ev); if (si % 2 === 1 && hit.n.y < 0.5) holes.push(ev);
    });
  });
  // Eli's shots: tracers to the plate of the soldier he hits (or past), sparks on the plate, brass out of his rifle
  W.ESH = eliShots(); const brass = [], etr = [], esp = [], blood = [];
  W.ESH.forEach((v, i) => {
    renderPoseOnly(v); const rr = W.eliMz; const aim = eliAim(v), hitNow = [T.hitA, T.hitB, T.hitC].some((h) => Math.abs(h - v) < 0.07);
    const d = aim.clone().sub(rr.muzzle).normalize(); if (!hitNow) d.add(v3((hh(i * 3) - 0.5) * 0.05, 0.02 + hh(i * 5) * 0.03, 0)).normalize();
    const end = hitNow ? aim.clone() : rr.muzzle.clone().addScaledVector(d, 60);
    etr.push({ t: v, a: rr.muzzle, b: end, speed: 320 });
    if (hitNow) esp.push({ t: v + 0.05, p: aim.clone().add(v3(0, 0, 0.4)), n: v3(0, 0.3, 1) });
    // toon blood: a burst out of the wound on the deciding shot (and a smaller one on the shot before), bleeding, a pool
    const hc = [[T.hitA, W.A], [T.hitB, W.B], [T.hitC, W.C]].find(([h]) => v > h - 0.2 && v < h + 0.07);
    if (hc) {
      const [h, ci] = hc, last = Math.abs(h - v) < 0.07, end = backT(ci) + 0.15, ch = W.front[ci];
      const live = (t) => (t >= fallT(ci) && t < end ? ch.torso.getWorldPosition(v3(0, 0, 0)) : null);
      blood.push({ t: v + 0.04, p: W.frontPos[ci].clone().add(v3(0, 3.5, 0.35)), dir: d.clone(), n: last ? 64 : 22, power: last ? 1.1 : 0.75, end,
        pool: last ? { at: live, r: 1.7 } : null, drip: last ? (t) => { const q = live(t); return q && q.add(v3(0, 0.4, 0)); } : null });
    }
    brass.push({ t: v + 0.02, p: W.eli.rifle.localToWorld(v3(0.2, 0.35, 0.3)), n: W.eli.rifle.localToWorld(v3(1, 0.6, -0.2)).sub(W.eli.rifle.localToWorld(v3(0, 0, 0))).normalize() });
  });
  W.tr = tracers(ctx.scene, [...tr, ...etr], { len: 3.4 });
  W.spk = eventParticles(ctx.scene, [...sparks, ...esp], { kind: 'spark', per: 9, seed: 3 });
  W.dst = eventParticles(ctx.scene, dusts, { kind: 'dust', per: 3, seed: 5, amount: 0.42 });
  W.chp = eventParticles(ctx.scene, chips, { kind: 'chip', per: 5, seed: 7 });
  W.brs = eventParticles(ctx.scene, brass, { kind: 'brass', per: 1, seed: 9 });
  W.holes = bulletHoles(ctx.scene, holes.filter((_, i) => i % 2 === 0));
  W.plate = eventParticles(ctx.scene, esp, { kind: 'chip', per: 14, seed: 13, color: '#d9d4c8', speed: 5 });
  W.blood = bloodFX(ctx.scene, blood, { seed: 21 });
  W.flash = muzzleFlashes(ctx.scene, COLS + W.rankPlaces.length + W.squadPlaces.length + 4);
}

// ---- who is standing in the front rank ----
const fallT = (c) => (c === W.A ? T.hitA : c === W.B ? T.hitB : c === W.C ? T.hitC : 1e9);
const backT = (c) => (c === W.A ? T.backA : c === W.B ? T.backB : c === W.C ? T.backC : 1e9);
function frontAlive(c, t) { return t < fallT(c) || t >= backT(c) + 0.45; }

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, S = [], add = (name, t0, f) => S.push({ name, t0: () => t0, f, t1: () => 0 });
  const E = (t) => eliRoot(t).p;
  // 2 AM: the clock, then the ranks waking (steady)
  add('clock', 0, (u) => ({ pos: lp3(v3(-8.0, 8.2, -55.6), v3(-8.6, 8.2, -56.2), easeInOut(u)), look: v3(-14.8, 8.4, -60), fov: 42 }));
  add('wake', s(0) + 1.75, (u) => ({ pos: lp3(v3(6, 3.0, -197), v3(4.5, 3.6, -191), easeInOut(u)), look: v3(-1, 4.2, -150), fov: 50 }));
  add('mask', s(1) - 0.05, (u) => { const p = v3(W.rankPlaces[COLS * 14 + 3].x, 0, W.rankPlaces[COLS * 14 + 3].z); return { pos: p.clone().add(v3(1.0, lerp(6.0, 5.8, u), lerp(-3.9, -3.5, easeInOut(u)))), look: p.clone().add(v3(0, 4.3, 0)), fov: 56 }; });
  // the industrial district (Atlanta94275 walking away under a streetlight), the gate
  add('street', s(2) - 0.05, (u) => ({ pos: EXT.clone().add(lp3(v3(-4, 5.0, -124), v3(-3, 5.4, -134), easeInOut(u))), look: EXT.clone().add(v3(0, 3.0, -170)), fov: 52 }));
  add('gate', s(2) + 2.15, (u, t) => { const p = E(t); return { pos: p.clone().add(v3(lerp(-5.5, -4.6, u), 2.2, lerp(9.5, 8.4, u))), look: p.clone().add(v3(0, 4.6, -6)), fov: 52 }; });
  // inside: the targets standing still; the lights go red; the PA; the turn
  add('targets', s(3) - 0.1, (u, t) => { const p = E(t); return { pos: p.clone().add(v3(3.2, 5.4, 6.5)).lerp(v3(3.0, 5.2, 0), 0), look: v3(0, 3.6, -40), fov: 52 }; });
  add('red', s(4) - 0.05, (u) => ({ pos: lp3(v3(10.5, 2.0, -12), v3(9.8, 2.6, -16), easeInOut(u)), look: v3(-2, 6.5, -70), fov: 56 }));
  add('pa', s(5) - 0.05, (u, t) => { const p = E(t); return { pos: p.clone().add(v3(lerp(-3.4, -3.0, u), 1.4, lerp(-6.2, -5.6, u))), look: p.clone().add(v3(-0.8, 5.0, 0)), fov: 58 }; });
  add('turn', s(6) - 0.05, (u, t) => { const p = E(t); return { pos: p.clone().add(v3(lerp(2.8, 2.2, u), 4.6, lerp(7.2, 6.4, u))), look: v3(0, 3.6, -36), fov: 50 }; });
  // gunfire: the long line of soldiers firing in sync (low, down the ranks), the dive (side-on), the cover (an orbit)
  add('volley', s(7) - 0.06, (u) => ({ pos: lp3(v3(13.2, 1.4, -27), v3(12.6, 1.8, -24.5), easeOut(u)), look: v3(-3, 4.0, -60), fov: 56 }));
  add('dive', s(8) - 0.08, (u, t) => { const p = E(t); return { pos: v3(12.6, 3.6, lerp(-8.5, -13.0, easeInOut(u))), look: v3(p.x * 0.5, 2.4, lerp(p.z, -12.5, 0.4)), fov: 58 }; });
  add('cover', s(9) - 0.05, (u) => { const a = lerp(0.95, 0.15, easeInOut(u)); return { pos: v3(KN.x + Math.sin(a) * 11.5, lerp(5.2, 6.0, u), KN.z + Math.cos(a) * 11.5), look: v3(KN.x, 2.5, KN.z - 1.6), fov: 56 }; });
  add('face', s(9) + 2.55, (u) => ({ pos: lp3(v3(KN.x + 0.9, 3.7, KN.z - 2.4), v3(KN.x + 0.6, 3.7, KN.z - 2.4), u), look: v3(KN.x + 0.1, 2.9, KN.z), fov: 68 }));
  add('grab', s(10) - 0.05, (u) => ({ pos: lp3(v3(KN.x + 9.2, 4.6, KN.z + 2.6), v3(KN.x + 8.6, 4.5, KN.z + 2.2), u), look: v3(KN.x + 1.2, 2.2, KN.z - 0.2), fov: 50 }));
  // he fires back: one moving shot from behind and above him, down the hall to the front rank (both in the 9:16 frame)
  add('fire', s(11) - 0.06, (u) => { const k = easeInOut(u); return { pos: v3(lerp(KN.x + 2.0, KN.x + 1.5, k), lerp(4.6, 4.4, k), lerp(KN.z + 3.8, KN.z + 3.2, k)), look: v3(lerp(KN.x + 1.6, -0.5, k), 3.8, -34), fov: 60 }; });
  // the kills: a lateral track along the front rank, soldier A falls, then B (full bodies, the blood readable)
  add('fall', s(12) - 0.05, (u, t) => { const k = easeInOut(smooth(T.hitA + 0.35, T.hitB - 0.2, t)); return { pos: v3(lerp(-5.6, 4.8, k), 3.8, -21.2), look: v3(lerp(-4.0, 3.6, k), 2.6, -35), fov: 62 }; });
  // the fallen glitch back; he reloads behind the barrier (low, side-on to him, the front rank behind)
  add('appear', s(14) - 0.06, (u) => ({ pos: lp3(v3(KN.x - 1.4, 4.0, KN.z + 4.6), v3(KN.x - 0.8, 4.2, KN.z + 4.0), u), look: v3(KN.x + 0.8, 3.0, -32), fov: 58 }));
  // the sprint: a side tracking shot with speed lines, then backing up the corridor ahead of him; the kick, side-on
  add('sprint', T.spr0 + 0.15, (u, t) => { const p = E(t); return { pos: v3(p.x - 8.5, 4.0, -18.8), look: v3(p.x, 2.8, p.z), fov: 60 }; });
  add('corridor', T.spr0 + 0.15 + 0.95, (u, t) => { const p = E(t); return { pos: v3(Math.max(p.x - 9.5, DOORX + 3.6), 3.8, ZC + 0.6), look: v3(p.x, 3.0, ZC), fov: 58 }; });
  add('kick', T.kick - 0.12, (u, t) => ({ pos: v3(lerp(DOORX + 9.5, DOORX + 8.8, u), 3.8, ZC + 1.9), look: v3(DOORX, 3.4, ZC - 0.4), fov: 58 }));
  // the control room: in through the door (from inside), the giant screen, the feeds
  add('room', s(17) - 0.05, (u, t) => ({ pos: lp3(v3(-52, 4.6, -9.5), v3(-51.2, 4.4, -10.2), u), look: v3(DOORX - 2, 3.6, ZC), fov: 54 }));
  add('screen', s(18) - 0.05, (u, t) => ({ pos: lp3(v3(-39.8, 4.6, -11.2), v3(-41.0, 4.6, -12.0), easeInOut(u)), look: v3(-56, 5.2, -16.5), fov: 60 }));
  add('feeds', s(19) - 0.05, (u) => ({ pos: lp3(v3(-44.5, 5.4, -14.5), v3(-48.5, 5.6, -15.4), easeInOut(u)), look: v3(-56, 5.6, -16), fov: 56 }));
  add('eliTile', s(20) - 0.05, (u) => ({ pos: lp3(v3(-50.5, 5.6, -16.0), v3(-52.2, 5.6, -16.0), easeOut(u)), look: v3(-56, 5.6, -16), fov: 50 }));
  // the message; Eli lit red; the soldiers in the corridor stop; every mask turns to the screen
  add('msg', s(21) - 0.05, (u) => ({ pos: lp3(v3(-41.5, 4.4, -11.6), v3(-42.5, 4.4, -12.4), u), look: v3(-56, 5.0, -16.6), fov: 60 }));
  add('eliRed', s(22) + 1.6, (u, t) => { const p = E(t); return { pos: p.clone().add(v3(-5.6, 4.5, lerp(1.9, 1.6, u))), look: p.clone().add(v3(0, 4.0, 0)), fov: 48 }; });
  add('stop', s(23) - 0.05, (u) => ({ pos: lp3(v3(-50.5, 4.6, -18.5), v3(-50.0, 4.6, -18.2), u), look: v3(-30, 3.6, -16), fov: 46 }));
  add('masks', s(24) - 0.05, (u) => ({ pos: lp3(v3(-44.5, 4.6, -16.4), v3(-43.6, 4.6, -16.3), easeInOut(u)), look: v3(-28, 4.6, -16), fov: 44 }));
  // closer: over his shoulder to the screen; the original: the viewer's tile fills the screen
  add('closer', s(25) - 0.05, (u, t) => { const p = E(t); return { pos: p.clone().add(v3(4.6, 4.8, 2.4)), look: v3(-56, 5.6, -16), fov: 52 }; });
  add('orig', s(26) - 0.05, (u) => ({ pos: lp3(v3(-46.5, 5.6, -12.6), v3(-48.6, 5.6, -13.4), easeInOut(u)), look: v3(-56, 5.6, -16), fov: 54 }));
  add('viewer', s(27) - 0.05, (u) => ({ pos: lp3(v3(-51.2, 5.6, -14.2), v3(-53.0, 5.6, -15.2), easeOut(u)), look: v3(-56, 5.6, -16), fov: 52 }));
  // the control room's camera turns toward the viewer: it ends looking straight into us
  add('cam', s(28) - 0.05, (u) => { const c = W.camPos; return { pos: c.clone().add(lp3(v3(-6.0, -3.0, -4.6), v3(-2.6, -1.0, -1.8), easeInOut(clamp(u * 1.05)))), look: c.clone().add(v3(0, -0.85, 0)), fov: lerp(46, 34, easeInOut(u)) }; });
  S.forEach((x, i) => { if (S[i + 1]) { const v = S[i + 1].t0(); x.t1 = () => v; } });
  S[S.length - 1].t1 = () => ctx.dur + 1;
  return S;
}

// speed lines (engine/actionfx.js): no impact frames in this episode
function fxAt(t, n, cam) {
  const o = { focus: 0, streak: 0, impact: 0, cx: 0.5, cy: 0.45, angle: 0 };
  const scr = (p) => { const q = p.clone().project(cam); return [clamp(q.x * 0.5 + 0.5), clamp(0.5 - q.y * 0.5)]; };
  if (n === 'dive') { o.streak = 0.7 * smooth(T.dive0 - 0.1, T.dive0 + 0.05, t) * (1 - smooth(T.land, T.land + 0.25, t)); o.angle = 0; }
  if (n === 'sprint' || n === 'corridor') { o.streak = 0.75; o.angle = 0; }
  if (n === 'kick') { const k = smooth(T.kc - 0.06, T.kc, t) * (1 - smooth(T.kc + 0.05, T.kc + 0.35, t)); if (k > 0) { o.focus = 0.6 * k; [o.cx, o.cy] = scr(v3(DOORX, 3.2, ZC)); } }
  return o;
}

// ---- faces ----
const lastAt = (list, t) => { let v = list[0][1]; for (const [k, x] of list) if (t >= k) v = x; return v; };
const NOBLINK = ['shocked', 'scared', 'surprised'];
function face(c, name, t, ph = 0.3, o = {}) { if (!c.setFace) return; c.setFace(name, { blink: o.closed || (blinkAt(t, ph) && !NOBLINK.includes(name)), viseme: o.viseme, gaze: o.gaze }); }
function eliFace(t) {
  return lastAt([[0, 'neutral'], [T.ext0, 'curious'], [T.in0, 'curious'], [L(3).start + 1.0, 'nervous'], [T.red0, 'surprised'], [T.pa + 0.3, 'nervous'], [T.gturn, 'scared'],
    [T.fire0, 'shocked'], [T.land + 0.4, 'scared'], [L(9).start + 2.2, 'angry'], [T.pop1, 'angry'], [T.backA, 'shocked'], [T.min, 'angry'], [T.spr0, 'angry'],
    [T.walkIn0, 'curious'], [L(19).start + 0.5, 'nervous'], [L(20).start, 'shocked'], [T.msg, 'scared'], [T.stop, 'nervous'], [T.masks, 'scared'], [T.closer, 'suspicious'], [T.orig, 'shocked']], t);
}
function setLights(t, focus, k = 1, col = '#ffffff', rimCol = '#a9b4ff') {
  const f = W.fill, r = W.rim;
  f.position.copy(focus).add(W.camSide.clone().multiplyScalar(4)).add(v3(0, 4.5, 0)); f.intensity = 34 * k; f.color.set(col);
  r.position.copy(focus).add(W.camSide.clone().multiplyScalar(-5)).add(v3(0, 6, 0)); r.intensity = 52 * k; r.color.set(rimCol);
}

// ---- a frame ----
function renderAt(t) {
  let sh = shotAt(W.shots, t); const n = sh.name, e = T;
  { const cq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgcam'); if (cq) { const q = cq.split(',').map(Number); sh = { ...sh, pos: v3(q[0], q[1], q[2]), look: v3(q[3], q[4], q[5]), fov: q[6] }; } }
  const outside = n === 'street' || n === 'gate';
  const inRoom = ['room', 'screen', 'feeds', 'eliTile', 'msg', 'eliRed', 'stop', 'masks', 'closer', 'orig', 'viewer', 'cam'].includes(n);
  const red = smooth(e.red0, e.red1, t);
  W.env = outside ? STREET : inRoom ? (t >= e.msg && t < e.masks + 2 ? ROOMRED : ROOM) : red > 0.5 ? RED : HALL; applyEnv(ctx, W.env);
  // ---- the hall's lights: cold fixtures (a few dead, one flickering) -> red, ring by ring from the far end ----
  W.hall.lights(1 - red, red, t);
  W.beaconG.forEach((g, i) => { const p = W.hall.beacons[i], ring = smooth(e.red0 + clamp((-p.z - 0) / 200, 0, 1) * 0.6 * 0, e.red0 + 0.3, t); g.material.opacity = 0.55 * ring * (0.55 + 0.45 * Math.max(0, Math.sin(t * 7.5 + i))); });
  W.smoke.update(t, smooth(e.fire0, e.fire0 + 2.5, t) * 0.9 + 0.25, null); W.smoke2.update(t, 0.4 + 0.6 * smooth(e.spr0, e.kick, t));
  W.clock.set(t < e.clock ? 1 : 2, t < e.clock ? 59 : 0, t < e.clock ? 58 + t / e.clock * 1.9 : (t - e.clock));
  // ---- Eli ----
  const el = W.eli, er = eliRoot(t), EP = eliPose(t);
  el.reset(); el.root.position.copy(er.p); el.root.rotation.set(er.rx, er.ry, 0);
  let eliMz = null;
  if (eliWalking(t)) pose(el, 'walk', t * 1.05);
  else if (eliRunning(t)) pose(el, 'run', t * 1.0);
  else if (t < e.run0 && t >= e.in1) { pose(el, 'idle', t); if (t > e.gturn) { el.torso.rotation.x = -0.06; } }
  else if (t >= e.kick + 0.85) pose(el, t > e.closer + 1.4 || t < e.closer ? 'idle' : 'walk', t);
  else applyPose(el, EP, { travel: t >= e.kick && t < e.kick + 0.85 ? 1 : 0 });
  if (t >= e.dive0 && t < e.land) el.root.position.y = er.p.y;
  // looking about: up at the PA, the lights
  if (n === 'pa') { el.neck.rotation.x = -0.45; el.neck.rotation.y = -0.3; }
  if (n === 'red') el.neck.rotation.x = -0.35;
  // the left hand slapped on the barrier's top as he lands
  const onBar = v3(KN.x - 0.6, BAR.top + 0.05, BAR.z + 0.4);
  if (t >= e.land + 0.25 && t < e.land + 1.3) { el.root.updateMatrixWorld(true); aimArm(el, 1, onBar, smooth(e.land + 0.25, e.land + 0.35, t) * (1 - smooth(e.land + 1.0, e.land + 1.3, t))); }
  // the rifle: on the crate until he grabs it; low while kneeling; aimed when he pops up; carried low in the sprint
  const R = el.rifle, has = t >= e.grab + 0.32;
  R.visible = t >= e.in0 && !outside;
  if (!has) {
    if (R.parent !== ctx.scene) ctx.scene.add(R);
    R.position.copy(CRATE).add(v3(0.1, 1.7, 0.1)); R.rotation.set(0, Math.PI / 2 + 0.25, Math.PI / 2); R.mag.position.copy(R.magRest);
    if (t >= e.grab - 0.1) { el.root.updateMatrixWorld(true); aimArm(el, 0, CRATE.clone().add(v3(0.1, 1.9, 0.1)), smooth(e.grab - 0.1, e.grab + 0.25, t)); el.torso.rotation.x += 0.15 * smooth(e.grab - 0.1, e.grab + 0.2, t); }
  } else if (t < e.kick + 0.85 || t >= e.kick + 0.85) {
    const popped = (t >= e.pop1 + 0.15 && t < e.down1) || (t >= e.pop2 + 0.15 && t < e.spr0);
    let rec = 0; for (const v of W.ESH) { const d = t - v; if (d >= 0 && d < 0.14) rec = Math.max(rec, d < 0.02 ? d / 0.02 : Math.exp(-(d - 0.02) * 26)); }
    const aim = popped ? eliAim(t) : t >= e.kick ? el.root.position.clone().add(v3(-6, 1.5, 0)) : el.root.position.clone().add(v3(t >= e.spr0 ? -6 : 0, 1.5, t >= e.spr0 ? 0 : -6));
    // the reload: the left hand to the magazine, the old one drops, a new one from the vest, slapped in, the handle racked
    let leftAt = null, leftK = 1;
    R.mag.position.copy(R.magRest); R.mag.visible = true;
    const k0 = smooth(e.grab + 0.32, e.grab + 0.8, t);
    const res = holdRifle(el, R, aim, { k: k0, down: popped ? 0 : 0.85, recoil: rec, blade: popped ? 0.55 : 0.3, shoulder: popped ? 1.15 : 0.9 });
    if (t >= e.grab + 0.9 && t < e.grab + 1.35) { leftAt = R.localToWorld(v3(0.25, 0.35, 0.2)); leftK = 1; }   // racking the handle
    if (t >= e.mout - 0.15 && t < e.rack2 + 0.3) {
      const out = smooth(e.mout, e.mout + 0.2, t);
      if (t < e.min - 0.45) { R.mag.position.copy(R.magRest).add(v3(0, -out * 1.4, 0)); R.mag.visible = out < 0.95; leftAt = R.localToWorld(R.magRest.clone()); }
      else if (t < e.min) { const k = smooth(e.min - 0.45, e.min - 0.2, t); R.mag.visible = false; leftAt = el.torso.localToWorld(v3(0.6, 0.6, 0.6)).lerp(R.localToWorld(R.magRest.clone().add(v3(0, -0.6, 0))), k); }
      else { R.mag.visible = true; const k = smooth(e.min, e.min + 0.12, t); R.mag.position.copy(R.magRest).add(v3(0, -0.5 * (1 - k), 0)); leftAt = R.localToWorld(R.mag.position.clone()); }
      if (t >= e.rack2 - 0.05) leftAt = R.localToWorld(v3(0.25, 0.35, 0.2));
    }
    if (leftAt) { aimArm(el, 1, leftAt, leftK); }
    eliMz = res;
    if (t >= e.kick - 0.05 && t < e.kick + 0.7) { R.visible = true; }
  }
  W.eliMz = eliMz;
  const eliMuz = eliMz ? eliMz.muzzle : null;
  face(el, eliFace(t), t, 0.3);
  el.root.visible = true;
  // ---- the door ----
  const da = t < e.kc ? 0 : -1.9 * easeOut(clamp((t - e.kc) / 0.32)) + 0.18 * Math.sin(clamp((t - e.kc - 0.32) / 0.6) * Math.PI) * Math.exp(-(t - e.kc) * 2);
  W.door.set(da);
  // ---- the soldiers ----
  const st = syncState(t), aim = hallAim(t);
  const camLens = W.feedCam.position.clone();
  const r = poseSoldier(W.tpl, t, st, v3(0, 0, 0), aim.clone().sub(v3(0, 0, FRONT)), { lookAt: camLens.clone().sub(v3(0, 0, FRONT)) });
  W.ranks.update();
  const fk = flashK(W.VOL, t);
  let fi = 0;
  W.flash.clear();
  // ranks
  W.rankPlaces.forEach((p, i) => { if (fk > 0) W.flash.set(fi, r.muzzle.clone().add(v3(p.x, 0, p.z)), r.dir, fk, 0.95); fi++; });
  // the front rank, one by one (Gregy at the centre)
  W.front.forEach((c, ci) => {
    if (!c) return;
    const fallen = t >= fallT(ci), back = backT(ci);
    const vis = !(fallen && t >= back + 0.45);
    c.root.visible = vis; c.rifle.visible = vis;
    if (!vis) { fi++; return; }
    if (fallen) {
      const tt = t - fallT(ci); c.reset(); c.root.position.copy(W.frontPos[ci]); c.root.rotation.set(0, 0, 0);
      applyPose(c, S_('shotDown', tt), { travel: 1 });
      c.root.updateMatrixWorld(true); holdRifle(c, c.rifle, c.root.position.clone().add(v3(0, 6, 4)), { k: 1 - smooth(0, 0.2, tt), down: 1 });
      if (tt > 0.25) { c.rifle.position.copy(W.frontPos[ci]).add(v3(1.2, 0.18, 1.0)); c.rifle.rotation.set(0, 0.6, Math.PI / 2); }
      W.vanF[ci].set(smooth(back - 0.15, back + 0.45, t));
    } else {
      const rr = poseSoldier(c, t, st, W.frontPos[ci], aim, { lookAt: camLens });
      if (fk > 0) W.flash.set(fi, rr.muzzle, rr.dir, fk, 0.95);
      if (W.vanF[ci]) W.vanF[ci].set(0);
    }
    fi++;
  });
  // the replacements glitch in where the fallen lay
  [W.A, W.B, W.C].forEach((ci, i) => {
    const c = W.rep[i], b = backT(ci), vis = t >= b;
    c.root.visible = vis; c.rifle.visible = vis; if (!vis) return;
    const rr = poseSoldier(c, t, st, W.frontPos[ci], aim, { lookAt: camLens });
    W.vanR[ci].set(1 - smooth(b, b + 0.55, t));
    if (fk > 0 && t > b + 0.6) W.flash.set(fi, rr.muzzle, rr.dir, fk, 0.95); fi++;
  });
  // Gregy: a target that turns first; he holds no rifle
  { const g = W.gregy; g.reset(); g.root.position.copy(W.frontPos[W.G]); const ry = t < e.gturn ? Math.PI : Math.PI * (1 - easeInOut(clamp((t - e.gturn) / 0.3)));
    g.root.rotation.set(0, ry, 0); pose(g, 'still', t); g.neck.rotation.x = 0.4 * st.bow;
    if (st.look > 0) g.neck.rotation.y = 0.25 * st.look; }
  // the doorway squad: appears in the corridor behind Eli, rifles on him; stops; every mask turns to the screen
  const sqOn = t >= e.sq0;
  W.squad.visible = sqOn; W.tplB.root.visible = false;
  if (sqOn) {
    const sst = { ...st, ry: -Math.PI / 2, bow: 0 };
    const sc = v3(-28, 0, ZC), aimB = eliRoot(t).p.clone().add(v3(0, 3.4, 0)).sub(sc);
    const scr = v3(-56, 5.4, -16).sub(sc);
    poseSoldier(W.tplB, t, sst, v3(0, 0, 0), aimB, { lookAt: scr });
    W.vanSq.set(1 - smooth(e.sq0, e.sq0 + 0.7, t));
    W.squad.update();
  }
  W.flash.end();
  W.volL.position.set(0, 6, FRONT - 6); W.volL.intensity = fk * 260 * (inRoom ? 0 : 1);
  // Eli's flashes
  let ef = 0; if (eliMuz) { ef = flashK(W.ESH, t); if (ef > 0) W.flash.set(W.flash.count - 1, eliMuz, W.eliMz.dir, ef, 1.1); W.flash.end(); }
  W.eliL.position.copy(eliMuz || v3(0, -50, 0)); W.eliL.intensity = ef * 90;
  // ---- effects ----
  W.tr.update(t); W.spk.update(t); W.dst.update(t, red > 0.5 ? new THREE.Color('#d4a8a0') : null); W.chp.update(t); W.brs.update(t); W.holes.update(t); W.plate.update(t); W.blood.update(t);
  // ---- outside: Atlanta94275 walks away under a streetlight ----
  W.atl.root.visible = outside;
  if (outside) { const a = W.atl, k = clamp((t - e.ext0) / 5); a.reset(); a.root.position.copy(EXT).add(v3(-6.0, 0, lerp(-152, -163, k))); a.root.rotation.set(0, Math.PI, 0); pose(a, 'walk', t * 0.9); }
  W.gregy.root.visible = !outside;
  // the lamps nearest the street shot
  W.ext.lamps.slice(5, 8).forEach((p, i) => { W.lampL[i].position.copy(p).add(EXT); W.lampL[i].intensity = outside ? 260 : 0; });
  // ---- the feeds (the giant screen) ----
  const scrOn = inRoom || n === 'kick';
  if (scrOn) renderFeeds(t, st, W.env);
  W.room.screen.material = W.wall; W.room.monM.color.set(t >= e.msg && t < e.orig ? '#5a1612' : '#2b3b48');
  W.scrL.position.set(-53.5, 5.6, -16); W.scrL.intensity = scrOn ? (t >= e.msg && t < e.masks + 2 ? 120 : 90) : 0; W.scrL.color.set(t >= e.msg && t < e.masks + 2 ? '#ff6050' : '#9cc4ff');
  // ---- the security camera: watches the screen, then turns to the viewer (our lens) ----
  { const c = W.room.cam, k = easeInOut(smooth(e.cam0, e.cam0 + 2.4, t)); const toScr = Math.atan2(-56 - W.camPos.x, -16 - W.camPos.z);
    const camP = sh.pos, toUs = Math.atan2(camP.x - W.camPos.x, camP.z - W.camPos.z), pitchUs = Math.atan2(-(camP.y - (W.camPos.y - 0.85)), Math.hypot(camP.x - W.camPos.x, camP.z - W.camPos.z));
    const toDoor = Math.atan2(DOORX - W.camPos.x, ZC - W.camPos.z); const yaw = n === 'cam' ? lerp(toDoor, W.usYaw, k) : toScr; c.aim(yaw, n === 'cam' ? lerp(0.35, W.usPitch, k) : 0.35, t >= e.cam0 ? 0.5 + 0.5 * (Math.sin(t * 6) > 0 ? 1 : 0) : 0.6); void toUs; void pitchUs; }
  // ---- name tags readable at 9:16: Roblox's stay the same size on screen ----
  for (const [tag, ch, base] of [[W.tagA, W.atl, 4.4], [W.tagG, W.gregy, 4.6]]) { const d = sh.pos.distanceTo(ch.root.position); const w = Math.max(base, d * 0.085); tag.scale.set(w, w * 96 / 512, 1); tag.position.y = 6.1 + w * 0.1; }
  // ---- lights on the subject ----
  const focus = ['street', 'gate'].includes(n) ? er.p.clone() : ['volley', 'red', 'wake', 'clock'].includes(n) ? v3(0, 0, -36) : n === 'mask' ? v3(W.rankPlaces[COLS * 14 + 3].x, 0, W.rankPlaces[COLS * 14 + 3].z) : n === 'fall' ? v3(sh.look.x, 0, -33) : n === 'stop' || n === 'masks' ? v3(-29, 0, ZC) : n === 'cam' ? W.camPos.clone().add(v3(0, -4, 0)) : er.p.clone();
  W.camSide = v3(sh.pos.x - focus.x, 0, sh.pos.z - focus.z).normalize();
  const fcol = outside ? '#ffd9a8' : inRoom ? (t >= e.msg && t < e.masks + 2 ? '#ffb0a0' : '#c8dcff') : red > 0.5 ? '#ffb4a4' : '#e8eef8';
  const rcol = outside ? '#8fa4d8' : red > 0.5 && !inRoom ? '#ff4a36' : '#8ea6ff';
  setLights(t, focus, ['wake', 'clock', 'red', 'volley'].includes(n) ? 0.55 : 1, fcol, rcol);
  // two red beacon lights that sweep near the camera once the lights are red
  W.beaconL.forEach((l, i) => { l.position.set(i ? 12 : -12, 8.4, clamp(sh.pos.z - 6 - i * 10, -190, 8)); l.intensity = !inRoom && !outside ? red * 120 * (0.45 + 0.55 * Math.max(0, Math.sin(t * 7.5 + i * 2))) : 0; });
  const near = ['face', 'eliRed', 'cam'].includes(n) ? 0.08 : 0.2; if (ctx.camera.near !== near) { ctx.camera.near = near; ctx.camera.updateProjectionMatrix(); }
  const steady = t < e.fire0;
  let shake = 0; const kick = (c, s2) => { const d = t - c; if (d >= 0 && d < 0.5) shake = Math.max(shake, s2 * Math.exp(-d * 9)); };
  if (fk > 0 && !inRoom && !['face'].includes(n)) shake = Math.max(shake, 0.25);
  kick(e.kc, 1.4); kick(e.land, 0.9); kick(e.hitA, 0.3); kick(e.hitB, 0.3);
  const black = n === 'cam' ? smooth(e.end - 0.25, e.end - 0.05, t) : 0;
  if (!(typeof location !== 'undefined' && location.search.includes('feedeli'))) { W.eliF.root.visible = false; W.eliF.rifle.visible = false; } W.tpl.root.visible = false; W.tplB.root.visible = false; W.tpl.rifle.visible = false; W.tplB.rifle.visible = false;
  frame(ctx, t, sh, { steady, shake: steady ? 0 : shake, shadowSpan: ['wake', 'volley', 'red', 'targets', 'street'].includes(n) ? 90 : 40, black, shadows: true });
  W.fx.set(t, fxAt(t, n, ctx.camera));
  return n;
}

// the feeds: the hall seen from its CCTV (with a second Eli behind the barrier), and the viewer's room from a phone's camera
function renderFeeds(t, st, env) {
  const { renderer, scene } = ctx;
  // the feed's Eli: behind the barrier, popping up to fire on a loop
  const f = W.eliF; f.root.visible = true; f.rifle.visible = true;
  const lt = (t % 2.6), up = lt > 0.8 && lt < 2.0;
  f.reset(); f.root.position.copy(KN); f.root.rotation.set(0, Math.PI, 0); applyPose(f, S_(up ? 'kneelUp' : 'kneel', up ? lt - 0.8 : lt, { loop: !up }), { travel: 0 });
  f.root.updateMatrixWorld(true); holdRifle(f, f.rifle, W.frontPos[W.A].clone().add(v3(0, 3.4, 0)), { down: up ? 0 : 0.85, blade: up ? 0.55 : 0.3 });
  face(f, 'angry', t, 0.4);
  const vis = []; for (const o of [W.eli.root, W.eli.rifle]) { vis.push(o.visible); o.visible = false; }
  const fogN = scene.fog.near; scene.fog.near = 90;
  applyEnv(ctx, RED); W.volL.position.set(0, 6, FRONT - 6); W.volL.intensity = flashK(W.VOL, t) * 260;
  const prevBg = scene.background; scene.background = new THREE.Color('#120606');
  renderer.setRenderTarget(W.feedRT); renderer.clear(); renderer.render(scene, W.feedCam); renderer.setRenderTarget(null);
  if (t >= T.orig - 0.2) { applyEnv(ctx, VIEWENV); W.phone.visible = false; renderer.setRenderTarget(W.altRT); renderer.clear(); renderer.render(scene, W.altCam); renderer.setRenderTarget(null); W.phone.visible = true; }
  scene.background = prevBg; scene.fog.near = fogN; applyEnv(ctx, env);
  [W.eli.root, W.eli.rifle].forEach((o, i) => { o.visible = vis[i]; });
  if (!(typeof location !== 'undefined' && location.search.includes('feedeli'))) { f.root.visible = false; f.rifle.visible = false; }
  const e = T;
  W.wall.set({ t, k: 1, red: smooth(e.msg, e.msg + 0.2, t) * (1 - smooth(e.masks + 1.6, e.masks + 2.2, t)) * 0.75, msg: smooth(e.msg + 0.1, e.msg + 0.3, t) * (1 - smooth(e.masks + 1.6, e.masks + 2.0, t)) + smooth(e.view + 0.6, e.view + 0.9, t),
    focus: n2f(t), altK: t >= e.orig ? 1 : 0 });
  W.wall.uniforms.over.value = t >= e.orig ? W.labels2 : W.labels;
  W.wall.uniforms.msgT.value = t >= e.view ? W.msg2 : W.msg1;
}
function n2f(t) { const e = T; return Math.max(0.9 * easeInOut(smooth(L(20).start, L(20).start + 1.0, t)) * (1 - smooth(e.msg - 0.2, e.msg + 0.1, t)), easeInOut(smooth(e.view, e.view + 1.1, t))); }

export async function setup() {
  ctx = await initStage('ep34', { look: 'pro', avatars: ['farm_ep34_eli', 'farm_ep34_soldier_a', 'farm_ep34_gregy', 'farm_ep32_atlanta'] }); L = ctx.L;
  const EV = events();
  await loadAnimSet('magic_set');
  await loadAlti(['neutral', 'curious', 'nervous', 'surprised', 'scared', 'shocked', 'angry', 'suspicious', 'sad']);
  const { camera } = ctx; camera.far = 3000; camera.near = 0.2; camera.updateProjectionMatrix();
  W.camSide = v3(0, 0, 1);
  world(); people();
  // the CCTV feed of the hall, the viewer's room (the alt feed), the wall of feeds
  W.feedRT = new THREE.WebGLRenderTarget(960, 540, { type: THREE.HalfFloatType, samples: 2 });
  W.feedCam = new THREE.PerspectiveCamera(62, 16 / 9, 0.2, 400); W.feedCam.position.set(-12.0, 8.5, -26.5); W.feedCam.lookAt(-3, 2.8, -17.0); W.feedCam.updateMatrixWorld(true);
  W.altRT = new THREE.WebGLRenderTarget(640, 360, { type: THREE.HalfFloatType, samples: 2 });
  W.altCam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 200);
  W.viewer = makeCharacter({ shirt: '#2a2d3a', sleeves: '#2a2d3a', pants: '#20222b', hair: '#1a1410', hairStyle: 'short', hood: true, skin: '#d8b090', alti: true });
  W.viewer.root.position.copy(VIEW).add(v3(0, 0.9, -1.6)); ctx.scene.add(W.viewer.root); pose(W.viewer, 'sit', 0); W.viewer.arms.forEach((a) => { a.rotation.x = -1.35; a.rotation.z = a.position.x > 0 ? -0.35 : 0.35; });
  if (W.viewer.setFace) W.viewer.setFace('neutral');
  W.viewer.root.updateMatrixWorld(true); const vh = W.viewer.neck.getWorldPosition(v3(0, 0, 0)).add(v3(0, 0.9, 0));
  W.altCam.position.copy(vh).add(v3(0, -0.4, 11.0)); W.altCam.lookAt(vh.clone().add(v3(0, -0.4, 0))); W.altCam.updateMatrixWorld(true);
  W.phone = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.8, 0.12), new THREE.MeshBasicMaterial({ color: '#cfe4ff' })); W.phone.position.copy(vh).add(v3(0, -1.2, 2.0)); W.phone.rotation.x = -0.3; ctx.scene.add(W.phone);
  W.phoneL = new THREE.PointLight('#bcd6ff', 22, 9, 1.6); W.phoneL.position.copy(vh).add(v3(0, -0.6, 1.8)); ctx.scene.add(W.phoneL);
  W.moonL = new THREE.PointLight('#6f86c8', 40, 16, 1.4); W.moonL.position.copy(vh).add(v3(5, 3, -1)); ctx.scene.add(W.moonL);
  W.wall = feedWall(W.feedRT.texture, { cols: 8, rows: 6, gain: 2.4 }); W.wall.uniforms.alt.value = W.altRT.texture; W.wall.set({ focusTile: [3, 2] });
  W.labels = labelTex(false); W.labels2 = labelTex(true); W.msg1 = msgTex('FINAL TEST:', 'ELIMINATE THE ORIGINAL'); W.msg2 = msgTex('ORIGINAL', 'LOCATED', true);
  W.room.screen.material = W.wall;
  W.camPos = W.room.cam.getWorldPosition(v3(0, 0, 0));
  W.fx = installActionFX(ctx);
  buildVolleys();
  W.shots = shots();
  // where the camera ends: the final shot's last position (the lens turns to it)
  { const sh = W.shots[W.shots.length - 1].f(1, ctx.dur); const d = sh.pos.clone().sub(W.camPos.clone().add(v3(0, -0.82, 0))); W.usYaw = Math.atan2(d.x, d.z); W.usPitch = -Math.atan2(d.y, Math.hypot(d.x, d.z)); }
  return expose(ctx, renderAt, L(9).start + 1.4, { ...EV, vol: W.VOL, esh: W.ESH });
}
// pose Eli for time t without drawing (setup: the muzzle at each of his shots)
function renderPoseOnly(t) {
  const el = W.eli, er = eliRoot(t); el.reset(); el.root.position.copy(er.p); el.root.rotation.set(er.rx, er.ry, 0); applyPose(el, eliPose(t), { travel: 0 });
  el.root.updateMatrixWorld(true);
  const popped = (t >= T.pop1 + 0.15 && t < T.down1) || (t >= T.pop2 + 0.15 && t < T.spr0);
  W.eliMz = holdRifle(el, el.rifle, popped ? eliAim(t) : el.root.position.clone().add(v3(0, 1.5, -6)), { down: popped ? 0 : 0.85, blade: popped ? 0.55 : 0.3, shoulder: popped ? 1.15 : 0.9 });
}
// the labels over the wall of feeds: a grid of session numbers ("SESSION 0417 / ELI"), later "COPY" and one "ORIGINAL"
function labelTex(copies) {
  const t = canvasTex(2048, 1100, (x, w, h) => {
    x.clearRect(0, 0, w, h); const cw = w / 8, ch = h / 6;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) {
      const n = 412 + r * 8 + c, orig = copies && c === 3 && r === 2;
      x.fillStyle = orig ? 'rgba(180,20,16,0.85)' : 'rgba(0,0,0,0.55)'; x.fillRect(c * cw + 8, r * ch + 8, cw * 0.62, 34);
      x.fillStyle = orig ? '#ffffff' : copies ? '#ff8a7a' : '#d8e6ff'; x.font = '800 24px ITTInter, sans-serif'; x.textBaseline = 'middle';
      x.fillText(orig ? 'ORIGINAL' : copies ? `COPY ${String(n).padStart(4, '0')}` : `SESSION ${String(n).padStart(4, '0')}`, c * cw + 16, r * ch + 26);
      x.fillStyle = 'rgba(255,40,30,0.9)'; x.beginPath(); x.arc(c * cw + cw - 22, r * ch + 24, 7, 0, 7); x.fill();
      x.fillStyle = '#ffffff'; x.font = '700 20px ITTInter, sans-serif'; x.fillText('REC', c * cw + cw - 70, r * ch + 25);
    }
  });
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = true; return t;
}
function msgTex(a, b, small = false) {
  const t = canvasTex(2048, 1100, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    const y0 = small ? h * 0.06 : h * 0.26, bh = small ? h * 0.2 : h * 0.48;
    x.fillStyle = 'rgba(12,0,0,0.88)'; x.fillRect(0, y0, w, bh);
    x.fillStyle = '#ff2a1a'; x.fillRect(0, y0, w, 10); x.fillRect(0, y0 + bh - 10, w, 10);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffffff';
    x.font = `900 ${small ? 96 : 104}px ITTInter, sans-serif`; if (!small) x.fillText(a, w / 2, y0 + bh * 0.3);
    if (!small) { x.fillStyle = '#ff4a3a'; x.font = '900 104px ITTInter, sans-serif'; const [b1, ...b2] = b.split(' '); x.fillText(b1, w / 2, y0 + bh * 0.58); x.fillText(b2.join(' '), w / 2, y0 + bh * 0.82); }
    else { x.fillStyle = '#ff4a3a'; x.font = '900 96px ITTInter, sans-serif'; x.fillText(a + ' ' + b, w / 2, y0 + bh * 0.5); x.fillStyle = 'rgba(12,0,0,0.88)'; }
  });
  t.colorSpace = THREE.SRGBColorSpace; return t;
}
