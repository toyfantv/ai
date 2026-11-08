// Episode 32: The Sword That Could Cut Through Time (In This Town, action 1/3). Rowan pulls a black sword out of the ruins of a storm
// island; every clock stops; the ocean splits and an armoured swordsman with a glowing white blade rises from it. Three strikes: blocked,
// the ground shattered, Rowan sent through a stone wall. The island freezes; only Rowan moves. He cuts a glowing crack in time, sees every
// attack before it lands, dodges, counters and strikes the swordsman across the chest. The armour shatters: nobody inside. A voice from
// the empty helmet; in the blade Rowan sees himself wearing the armour; beneath the island thousands of black swords wake.
// The world: the island plateau at y = 4 (the fight at the origin, the shore toward +z), the split runs along x = 0 from z 58 out to
// the horizon, the clock tower west, the dock east; the cavern for the last shot at CAV.
// Clips: anims.js (Mixamo sword sets retargeted by tools/anim_retarget.py + the hand-keyed sword clips); props: blades.js; set: ruins.js.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, noise1 } from '../engine/core.js';
import { makeCharacter, pose, nameTag } from '../engine/character.js';
import { loadAlti, blinkAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P } from '../engine/stage.js';
import { Batch } from '../engine/kit.js';
import { burst, clouds } from '../engine/atmos.js';
import { dock, sailboat } from '../engine/isles.js';
import { loadAnimSet, sample, blend, keyed, applyPose, holdProp, aimArm, propPoint, KEYED } from '../engine/anims.js';
import { blackSword, whiteBlade, armorSuit, swordField } from '../engine/blades.js';
import { installActionFX, weaponTrail } from '../engine/actionfx.js';
import { stormIsland, courtyard, column, arch, lowWall, rubble, clockTower, postClock, brickWall, crater, stormSea, rain, bolt, flashAt, timeCrack, cavern } from '../engine/ruins.js';

let ctx, L, EV;
const W = {};
const TOP = 4, WALLZ = -6, CAV = v3(0, -700, 0);
const SLAB = v3(-4.6, TOP, 1.0), RSL = v3(-4.6, TOP, -0.85);     // the slab with the sword in it, where Rowan crouches
const R0 = v3(0, TOP, 0), RL = v3(0, TOP, -16.3), RF = v3(-0.8, TOP, -15.7);   // RF: where Rowan ends the fight                 // Rowan in the first fight; where he lands behind the wall
const ATL = v3(-15, TOP, 9), DOCK = v3(38, 0, 44), ZZ = v3(38, 2.75, 64);
const SKIN = '#e9b994', SZ = 104;   // SZ: where the swordsman rises, out in the split
const lp3 = (a, b, u) => a.clone().lerp(b, u);

// ---- palettes ----
const STORM = P({ top: '#161b22', horizon: '#3b444f', haze: '#2b323b', sunColor: '#c4cfe2', sunI: 1.25, sunDir: v3(-0.45, 0.72, -0.52),
  sunDisc: 0, sunSize: 1, stars: 0, moon: 0, hemiSky: '#6c7888', hemiGround: '#24272a', hemiI: 0.85, amb: 0.12, caus: '#ffffff', causI: 0,
  exposure: 1.12, vig: 0, win: 0, lamp: 0, fogNear: 70, fogFar: 520, bloom: 0.03, envI: 0.38, saturation: 1.05, contrast: 1.08, bounce: 0.14 });
const FROZEN = { ...STORM, ...P({ top: '#1a1726', horizon: '#3e3a52', haze: '#2c2a3a', sunColor: '#c8c0e6', hemiSky: '#7a72a0', hemiGround: '#24222c' }), saturation: 0.42, contrast: 1.12, exposure: 1.1 };
const SIGHT = { ...STORM, ...P({ hemiSky: '#6e7090', haze: '#2b2f3e' }), saturation: 0.95 };
const CAVE = P({ top: '#05040a', horizon: '#0b0912', haze: '#0b0912', sunColor: '#8c7cff', sunI: 0.35, sunDir: v3(0.3, 0.9, 0.2), sunDisc: 0, sunSize: 1, stars: 0, moon: 0,
  hemiSky: '#4a3c78', hemiGround: '#120e1a', hemiI: 0.9, amb: 0.1, caus: '#ffffff', causI: 0, exposure: 1.35, vig: 0, win: 0, lamp: 0, fogNear: 60, fogFar: 260, bloom: 0.03, envI: 0.25, saturation: 1.0, contrast: 1.1, bounce: 0.05 });

// ---- timing ----
const T = {};
function events() {
  const s = (i) => L(i).start;
  Object.assign(T, {
    pull: s(2) - 0.35, touch: s(2) + 0.35, free: s(2) + 0.73, clock: s(2) + 0.35,
    split0: s(5) + 0.05, split1: s(5) + 2.4, rise0: s(6) + 0.05, rise1: s(6) + 1.75, leap0: s(6) + 2.0, land: s(7) + 0.75,
    C1: s(8) + 0.45, C2: s(9) + 0.6, C3: s(10) + 0.5, rise: s(11) + 0.2, walk0: s(10) + 1.6, walk1: s(12) - 0.4, raise: s(12) + 0.25,
    FRZ: s(13) + 0.45, look: s(16) + 0.05, rift: s(16) + 2.65, RES: s(18) + 0.05,
    C4: s(18) + 1.5, C5: s(19) + 0.35, C6: s(20) + 0.3, C7: s(21) + 0.85, SH: s(22) + 0.12,
    armor: s(27) + 1.1, cave: s(29) - 0.05, end: ctx.dur,
  });
  T.wall = T.C3 + 0.28; T.landR = T.C3 + 0.72; T.crack = T.rift + 0.63; T.leap2 = T.RES + 0.05; T.land2 = T.RES + 0.65;
  return { ...T };
}
// world time: stops while the island is frozen
const tw = (t) => (t < T.FRZ ? t : t < T.RES ? T.FRZ : t - (T.RES - T.FRZ));
// hit-stop: the action holds a few frames at each contact (blade on blade, blade on chest)
let HOLDS = [];
const hs = (t) => { let a = t; for (const [c, h] of HOLDS) a -= clamp(t - c, 0, h); return a; };
const ct = (c, off) => (t) => hs(t) - (hs(c) - off);   // a clip's time, with its contact at real time c

// ---- clips made for this episode (on top of anims.js) ----
const G = { torso: [6, -20, 0], neck: [-4, 18, 0], aR: [-62, -12, 8], aL: [-58, 14, -6], lR: [-16, 0, -4], lL: [14, 0, 4], h: 0.97, blade: [0.3, 0.82, 0.48] };
const EXTRA = {};
function clips() {
  // chop, low, leap, landing, crouch and lowered now live in engine/anims.js (KEYED), for Episodes 33-34
  Object.assign(KEYED, EXTRA);
}
const S_ = (name, t, o = {}) => sample(name, t, o);

// sequences: [[t0, (t) => pose], ...]; consecutive poses blend over bl seconds
function seq(list, t, bl = 0.1) {
  let i = 0; for (let k = 0; k < list.length; k++) if (t >= list[k][0]) i = k;
  const cur = list[i][1](t); if (i === 0) return cur;
  const k = (t - list[i][0]) / (list[i][2] ?? bl); return k >= 1 ? cur : blend(list[i - 1][1](t), cur, easeInOut(clamp(k)));
}
const clip = (name, t0, o = {}) => (t) => S_(name, t - t0, o);
const clipC = (name, c, off, o = {}) => (t) => S_(name, ct(c, off)(t), o);

// ---- Rowan ----
function rowanPose(t) {
  return seq([
    [0, (t) => S_('crouch', t)],
    [T.pull, clip('pull', T.pull + 0.0)],
    [T.pull + 1.9, (t) => S_('inspect', t - T.pull - 1.9)],
    [L(4).start, (t) => S_('guard', t), 0.25],
    [T.C1 - 0.34, clipC('blockHigh', T.C1, 0.32), 0.06],
    [T.C1 + 0.6, (t) => S_('guard', t), 0.2],
    [T.C2 - 0.34, clipC('blockHigh', T.C2, 0.32), 0.06],
    [T.C2 + 0.6, (t) => S_('guard', t), 0.2],
    [T.C3 - 0.22, clipC('parry', T.C3, 0.2), 0.05],
    [T.C3 + 0.03, (t) => S_('flung', (hs(t) - hs(T.C3)) * 1.5), 0.05],
    [T.landR, () => S_('rise', 0), 0.05],
    [T.rise, clip('rise', T.rise)],
    [T.rise + 2.1, (t) => S_('guard', t)],
    [T.look, (t) => S_('inspect', t - T.look), 0.35],
    [T.rift, clip('rift', T.rift), 0.15],
    [T.RES - 0.5, (t) => S_('guard', t), 0.3],
    [T.C4 - 0.32, clip('dodge_back', T.C4 - 0.32, { speed: 1.3 }), 0.1],
    [T.C4 + 0.45, (t) => S_('guard', t), 0.2],
    [T.C5 - 0.32, clip('dodge_right', T.C5 - 0.32, { speed: 1.25 }), 0.08],
    [T.C5 + 0.4, (t) => S_('guard', t), 0.12],
    [T.C6 - 0.22, clipC('parry', T.C6, 0.2), 0.06],
    [T.C6 + 0.3, (t) => S_('guard', t), 0.1],
    [T.C7 - 0.5, clipC('sweep', T.C7, 0.47), 0.08],
    [T.C7 + 0.9, (t) => S_('guard', t), 0.35],
    [T.SH + 1.5, (t) => S_('gs_idle', t, { loop: true }), 0.5],
    [L(27).start - 0.1, (t) => S_('inspect', t - L(27).start), 0.45],
  ], t);
}
function rowanRoot(t) {
  const p = R0.clone(); let ry = 0, rx = 0;
  if (t < L(4).start - 0.1) p.copy(RSL);
  if (t >= T.C2) p.y -= 0.18 * smooth(T.C2, T.C2 + 0.12, t);
  if (t >= T.C3 + 0.03) {
    const tf = T.C3 + 0.03, u = clamp((t - tf) / (T.landR - tf));
    const z = lerp(0, -15.2, u), y = TOP + 2.6 * Math.sin(Math.PI * u) - 0.18 * (1 - u);
    p.set(0, y, z); rx = -0.5 * Math.sin(Math.PI * u);
    if (t >= T.landR) { const k = easeOut(clamp((t - T.landR) / 0.5)); p.set(0, TOP, lerp(-15.2, RL.z, k)); rx = 0; }
  }
  if (t >= T.rise) p.copy(RL);
  // the second fight: a step back from the sweep, a step to his right from the smash, the lunge
  if (t >= T.RES) {
    const back = easeOut(smooth(T.C4 - 0.3, T.C4 + 0.12, t)) * 1.5, side = easeOut(smooth(T.C5 - 0.3, T.C5 + 0.08, t)) * 1.7, lunge = easeOut(smooth(T.C7 - 0.45, T.C7 - 0.02, t));
    p.set(-side + lunge * 0.9, TOP, RL.z - back + lunge * 2.1);
    const s = swordsRoot(t).p; ry = Math.atan2(s.x - p.x, s.z - p.z);
  }
  return { p, ry, rx };
}

// ---- the swordsman ----
function swordsPose(t) {
  return seq([
    [0, (t) => S_('low', t)],
    [T.leap0 - 0.05, clip('leap', T.leap0 - 0.05), 0.05],
    [T.land, clip('landing', T.land), 0.03],
    [T.C1 - 0.6, clipC('chop', T.C1, 0.55), 0.08],
    [T.C1 + 0.7, (t) => S_('guard', t + 0.7), 0.2],
    [T.C2 - 0.6, clipC('chop', T.C2, 0.55), 0.08],
    [T.C2 + 0.7, (t) => S_('guard', t + 0.7), 0.2],
    [T.C3 - 0.5, clipC('sweep', T.C3, 0.47), 0.08],
    [T.C3 + 0.85, (t) => S_('guard', t + 0.7), 0.3],
    [T.raise, clip('raise', T.raise), 0.2],
    [T.leap2, (t) => S_('leap', (t - T.leap2) * 1.0 + 0.1), 0.08],
    [T.land2, clip('landing', T.land2), 0.03],
    [T.C4 - 0.5, clipC('sweep', T.C4, 0.47), 0.08],
    [T.C4 + 0.6, (t) => S_('guard', t), 0.15],
    [T.C5 - 0.55, clipC('smash', T.C5, 0.55), 0.08],
    [T.C5 + 0.32, (t) => S_('guard', t), 0.12],
    [T.C6 - 0.5, clipC('sweep', T.C6, 0.47), 0.06],
    [T.C6 + 0.12, (t) => S_('guard', t), 0.25],
    [T.C7, (t) => S_('react_big', hs(t) - hs(T.C7), { zero: true }), 0.04],
  ], t);
}
function swordsRoot(t) {
  const fy = W.sea.floorY(0, SZ), p = v3(0, fy - 7, SZ); let ry = Math.PI;
  if (t >= T.rise0) p.y = lerp(fy - 7, fy, easeOut(smooth(T.rise0, T.rise1, t)));
  if (t >= T.leap0) { const u = clamp((t - T.leap0) / (T.land - T.leap0)); p.set(0, lerp(fy, TOP, u) + 38 * Math.sin(Math.PI * u) * (1 - 0.15 * u), lerp(SZ, 7.8, easeInOut(u))); }
  if (t >= T.land) p.set(0, TOP, lerp(7.8, 4.9, easeInOut(smooth(T.C1 - 0.75, T.C1 - 0.35, t))));
  if (t >= T.C2 - 0.8) p.z = lerp(4.9, 4.5, smooth(T.C2 - 0.8, T.C2 - 0.4, t));
  if (t >= T.walk0) { const k = smooth(T.walk0, T.walk1, t); p.z = lerp(4.5, WALLZ + 2.4, k); }
  if (t >= T.leap2) { const u = clamp((t - T.leap2) / (T.land2 - T.leap2)); p.set(0, TOP + 5.4 * Math.sin(Math.PI * u), lerp(WALLZ + 2.4, -11.6, easeInOut(u))); }
  if (t >= T.land2) p.set(0, TOP, -11.6 - 0.6 * smooth(T.C4 - 0.55, T.C4 - 0.25, t) - 0.7 * smooth(T.C5 - 0.6, T.C5 - 0.3, t));
  return { p, ry };
}
const walking = (t) => t > T.walk0 + 0.05 && t < T.walk1 - 0.05;

// ---- set ----
function world() {
  const { scene } = ctx;
  W.isle = stormIsland({}); scene.add(W.isle.group);
  const yard = courtyard({ size: 46 }); yard.position.set(0, TOP, -4); scene.add(yard);
  W.sea = stormSea(scene, { cx: 0, z0: 60, hw: 24 });
  // ruins: broken columns in two rows, arches, low walls, the fallen column, rubble; the slab with the sword
  const g = new THREE.Group(); scene.add(g);
  const b2 = new Batch(); [[-11, 4, 8.5], [-11, -6, 5.2], [-11, -16, 11], [11, 4, 6.2], [11, -6, 9.8], [11, -16, 4.4], [-18, 14, 3.4], [16, 15, 7.4], [-24, -2, 6], [22, -4, 3.1]].forEach(([x, z, h], i) => column(b2, x, TOP, z, h, { seed: i + 1, capital: h > 9 }));
  column(b2, 8, TOP, 18, 8, { fallen: true, ry: 0.4 }); column(b2, -20, TOP, -22, 7, { fallen: true, ry: -1.1 });
  arch(b2, 0, TOP, -28, { w: 6.4, h: 7.4 }); arch(b2, -26, TOP, 12, { ry: 1.2, broken: true }); arch(b2, 25, TOP, -14, { ry: -1.3 });
  lowWall(b2, -30, TOP, -8, 14, { ry: 1.45, seed: 3 }); lowWall(b2, 16, TOP, -26, 12, { ry: 0.3, seed: 5 }); lowWall(b2, -8, TOP, 24, 9, { ry: -0.15, seed: 8 });
  b2.done(g);
  const slabM = new THREE.MeshStandardMaterial({ color: '#4e4b47', roughness: 0.9 }), slab = new THREE.Group();
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.7), slabM); s1.position.y = 0.45; slab.add(s1);
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 1.35), slabM); s2.position.y = 1.07; slab.add(s2);
  slab.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); slab.position.copy(SLAB); scene.add(slab); W.slab = slab;
  const rl = []; for (let i = 0; i < 70; i++) { const a = noise1(i * 3.1) * 9, d = 12 + Math.abs(noise1(i * 1.7 + 4)) * 26; const x = Math.cos(a) * d, z = Math.sin(a) * d - 4; if (Math.abs(x) < 6 && z < 12 && z > -24) continue; rl.push([x, TOP, z, 0.25 + Math.abs(noise1(i * 2.3)) * 0.7]); }
  rubble(scene, rl);
  W.tower = clockTower({}); W.tower.position.set(-20, TOP, -13); W.tower.rotation.y = 0.55; scene.add(W.tower);
  W.wall = brickWall({ x0: -6.5, x1: 6.5, z: WALLZ, y0: TOP, h: 4.7 }); scene.add(W.wall);
  W.crater = crater({}); scene.add(W.crater);
  // the dock and the boat on the east shore; the post clock at the dock's head
  const d = dock(30); d.position.copy(DOCK); scene.add(d); W.dock = d;
  const boat = sailboat({ hull: '#4a3a30', sail: '#5a2a26' }); boat.position.set(DOCK.x + 9.5, -0.6, DOCK.z + 27); boat.rotation.set(0.05, 0.1, 0.06); scene.add(boat); W.boat = boat;
  W.pclock = postClock(); W.pclock.position.set(DOCK.x - 2.6, 2.75, DOCK.z + 14); W.pclock.rotation.y = -0.5; scene.add(W.pclock);
  W.clouds = clouds(scene, { color: '#2a3038', count: 30, y: 120, size: 34, spread: 1000, seed: 9 });
  W.rain = rain(scene, { count: 5600, size: 64, height: 44 });
  W.bolts = [bolt({ seed: 3 }), bolt({ seed: 8, h: 200 }), bolt({ seed: 13 })];
  W.bolts[0].position.set(-60, 0, 240); W.bolts[1].position.set(90, 0, 300); W.bolts[2].position.set(-30, 0, -160);
  W.bolts.forEach((x) => scene.add(x));
  W.crack = timeCrack({ len: 4.4 }); scene.add(W.crack);
  // sparks (blade on blade), dust (landings)
  W.sparks = [0, 1, 2, 3, 4, 5].map((i) => burst(scene, { count: 110, seed: 11 + i, color: '#ffd9a0', bright: 1.5, dur: 0.55, spread: 0.3, height: 0.3, pointSize: 0.22 }));
  W.dust = [0, 1, 2].map((i) => burst(scene, { count: 120, seed: 31 + i, color: '#6e6a66', bright: 0.32, dur: 1.2, spread: 4, height: 0.4, pointSize: 0.8 }));
  // the cavern and the sword field
  W.cave = new THREE.Group(); W.cave.position.copy(CAV); scene.add(W.cave);
  const cv = cavern({ R: 110 }); W.cave.add(cv);
  W.field = swordField(scene, { count: 2600, radius: 105, floor: (x, z) => cv.floorY(x, z), parent: W.cave, color: '#c9b6ff' });
  W.caveL = new THREE.PointLight('#8c6cff', 0, 220, 1.1); W.caveL.position.set(0, 18, 0); W.cave.add(W.caveL);
}

// ---- people ----
function people() {
  const mk = (avatar) => { const c = makeCharacter({ avatar, alti: true, skin: SKIN, caustic: false }); ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return c; };
  W.r = mk('farm_ep32_rowan'); W.sw = blackSword(); W.sw.setGlow(0);
  // the swordsman: armour on a body that isn't there (the same proportions as Rowan's)
  const hideBody = (c) => { c.root.traverse((o) => { if (o.isMesh && !o.userData.armor) o.visible = false; }); if (c.faceSheet) c.faceSheet.visible = false; };
  W.s = makeCharacter({ avatar: 'farm_ep32_rowan', alti: true, skin: SKIN, caustic: false }); ctx.scene.add(W.s.root);
  W.suit = armorSuit(W.s, { seed: 32 }); hideBody(W.s); W.wb = whiteBlade(); W.wb.setGlow(0.55);
  W.wbL = new THREE.PointLight('#cfe0ff', 0, 9, 2.0); W.wb.add(W.wbL); W.wbL.position.set(0, 0, 2.6);
  // the helmet that falls (a copy of the swordsman's)
  const tb = W.s.torsoBox; W.slashM = new THREE.MeshBasicMaterial({ color: '#f2eeff', transparent: true, depthWrite: false, fog: false });
  W.slash = new THREE.Mesh(new THREE.PlaneGeometry((tb.max.x - tb.min.x) * 1.25, 0.09), W.slashM); W.slash.position.set((tb.min.x + tb.max.x) / 2, tb.max.y - (tb.max.y - tb.min.y) * 0.32, tb.max.z + 0.3); W.slash.rotation.z = -0.5; W.slash.userData.noAO = true; W.s.torso.add(W.slash);
  W.helm = W.suit.helm.clone(true); W.helm.visible = false; ctx.scene.add(W.helm);
  // the preview of the next attack: the same armour as a cold, see-through ghost
  W.g = makeCharacter({ avatar: 'farm_ep32_rowan', alti: true, skin: SKIN, caustic: false }); ctx.scene.add(W.g.root);
  const gs = armorSuit(W.g, { seed: 32 }); hideBody(W.g); W.gb = whiteBlade();
  W.ghostM = new THREE.MeshBasicMaterial({ color: '#8fe6ff', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  [W.g.root, W.gb].forEach((r) => r.traverse((o) => { if (o.isMesh) { o.material = W.ghostM; o.castShadow = false; o.userData.noAO = true; } }));
  W.gsuit = gs;
  // Rowan in the armour (the end)
  W.ra = makeCharacter({ avatar: 'farm_ep32_rowan', alti: true, skin: SKIN, caustic: false }); ctx.scene.add(W.ra.root);
  W.rasuit = armorSuit(W.ra, { seed: 32 }); hideBody(W.ra); W.rasw = blackSword();
  // the side characters
  W.atl = mk('farm_ep32_atlanta'); W.zz = mk('farm_ep32_zzeekkee');
  W.tagA = nameTag(W.atl, 'Atlanta94275', { width: 3.6, y: 6.1 }); W.tagZ = nameTag(W.zz, 'Zzeekkee26', { width: 3.3, y: 6.1 });
  // the cut above Rowan's right eyebrow (his right: -x), on the face
  W.cut = cutDecal(W.r);
  // the face sheets' faint fringe pixels read as rings round the eyes in close-ups: cut them
  for (const c of [W.r, W.ra, W.atl, W.zz]) if (c.faceSheet) { c.faceSheet.material.alphaTest = 0.35; c.faceSheet.material.needsUpdate = true; }
}
function cutDecal(ch) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
  x.lineCap = 'round'; x.strokeStyle = '#7a0d0a'; x.lineWidth = 9; x.beginPath(); x.moveTo(30, 62); x.lineTo(96, 40); x.stroke();
  x.strokeStyle = '#c0201a'; x.lineWidth = 4; x.beginPath(); x.moveTo(34, 60); x.lineTo(92, 42); x.stroke();
  x.fillStyle = '#a3140f'; x.beginPath(); x.ellipse(70, 58, 3.5, 5, 0, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -4 }));
  const fs = ch.faceSheet; fs.geometry.computeBoundingBox(); const bb = fs.geometry.boundingBox, w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  m.scale.set(w * 0.2, w * 0.2, 1); m.position.set(bb.min.x + w * 0.31, bb.min.y + h * 0.7, bb.max.z + 0.012); m.renderOrder = 4; m.userData.noAO = true;
  fs.add(m); m.visible = false; return m;
}

// roll a held sword about its own axis so its flat (+y) faces a world point
function rollToward(obj, world) {
  obj.updateMatrixWorld(true);
  const q = new THREE.Quaternion(); obj.getWorldQuaternion(q);
  const ax = v3(0, 0, 1).applyQuaternion(q), up = v3(0, 1, 0).applyQuaternion(q), p = v3(); obj.getWorldPosition(p);
  const want = world.clone().sub(p); want.addScaledVector(ax, -want.dot(ax)).normalize();
  const cur = up.addScaledVector(ax, -up.dot(ax)).normalize();
  let a = Math.acos(clamp(cur.dot(want), -1, 1)); if (cur.clone().cross(want).dot(ax) < 0) a = -a;
  obj.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 0, 1), a));
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, S = [], add = (name, t0, f) => S.push({ name, t0: () => t0, f, t1: () => 0 });
  const R = (x, y, z) => R0.clone().add(v3(x, y, z)), Q = (x, y, z) => RL.clone().add(v3(x, y, z));
  const fy = () => W.sea.floorY(0, SZ);
  // (the second fight's frame of reference: Rowan backs off from RL, the swordsman lands at z -11.6 and steps in)
  const M = (x, y, z) => v3(-0.8 + x, TOP + y, -15.0 + z), F = (x, y, z) => RF.clone().add(v3(x, y, z));
  // A fight is shot WIDE (the user, 2026-11-07): both fighters head to feet in the vertical frame, few cuts, the camera moving
  // (orbits, a low push-in, whip pans) like action anime; close shots of a determined face only as short inserts.
  // the island under the storm (steady), Rowan at the slab
  add('open', 0, (u) => ({ pos: lp3(v3(70, 46, 120), v3(52, 34, 92), easeInOut(u)), look: v3(-4, 5, -2), fov: 52 }));
  add('found', 2.4, (u) => ({ pos: lp3(RSL.clone().add(v3(-7.6, 3.6, 8.4)), RSL.clone().add(v3(-4.6, 3.4, 5.2)), easeInOut(u)), look: lp3(SLAB.clone().add(v3(0.3, 3.0, -0.9)), SLAB.clone().add(v3(0, 3.0, 0)), u), fov: 54 }));
  add('touch', T.pull + 0.15, (u) => ({ pos: lp3(SLAB.clone().add(v3(4.6, 3.0, 6.4)), SLAB.clone().add(v3(5.0, 4.2, 7.6)), easeOut(u)), look: lp3(SLAB.clone().add(v3(0, 3.4, -0.6)), SLAB.clone().add(v3(0, 4.2, -1.2)), easeOut(u)), fov: 54 }));
  add('clock', T.free + 0.15, (u) => { const f = W.tower.localToWorld(W.tower.facePos.clone()); const n = v3(Math.sin(0.55), 0, Math.cos(0.55)); return { pos: f.clone().addScaledVector(n, lerp(10, 8.2, u)).add(v3(0, -1.2, 0)), look: f, fov: 34 }; });
  add('dockclock', s(2) + 1.9, (u) => ({ pos: lp3(ZZ.clone().add(v3(-4.6, 3.2, -8.6)), ZZ.clone().add(v3(-4.2, 3.3, -8.0)), u), look: ZZ.clone().add(v3(-1.4, 4.6, -2)), fov: 56 }));
  add('whisper', s(3) - 0.1, (u) => ({ pos: lp3(RSL.clone().add(v3(1.8, 4.4, 6.4)), RSL.clone().add(v3(1.3, 4.3, 5.2)), easeInOut(u)), look: RSL.clone().add(v3(0, 3.5, 0)), fov: 54 }));
  add('coming', s(4) - 0.05, (u) => ({ pos: lp3(R(3.4, 6.0, -8.6), R(2.4, 5.8, -6.4), easeInOut(u)), look: R(-1.0, 3.6, 40), fov: 56 }));
  // the ocean splits; the boat hand stares; the swordsman rises out of the trench
  add('split', s(5) - 0.05, (u) => ({ pos: lp3(v3(-8, 14, 46), v3(-6, 19, 50), easeOut(u)), look: v3(0, -14, 130), fov: 62 }));
  add('stare', s(5) + 0.85, (u) => ({ pos: lp3(ZZ.clone().add(v3(-3.6, 4.0, 6.4)), ZZ.clone().add(v3(-3.0, 4.0, 5.4)), u), look: ZZ.clone().add(v3(0, 3.4, 0)), fov: 56 }));
  add('rise', s(6) - 0.05, (u) => ({ pos: lp3(v3(6, fy() + 1.6, SZ - 22), v3(3.2, fy() + 2.4, SZ - 13), easeInOut(u)), look: v3(0, fy() + lerp(6, 4.8, u), SZ), fov: 58 }));
  // the leap (tracked wide, low) and the first fight: one wide orbit through the block, a face insert, a high wide through the
  // smash and the third strike (a whip pan between them), Rowan flung through the wall (tracked from the side)
  add('leap', T.leap0 - 0.05, (u, t) => { const s2 = swordsRoot(t).p; return { pos: s2.clone().add(v3(12, 0.5 - 4 * u, 17 - 9 * u)), look: s2.clone().add(v3(0, 3.0, -7)), fov: 62 }; });
  add('duel1', T.land + 0.1, (u, t) => wide(t, { az: lerp(0.3, 0.7, easeInOut(u)), el: lerp(-0.05, 0.06, u), fov: 52 }));
  add('strain', T.C1 + 0.55, (u) => ({ pos: lp3(R(2.6, 5.9, 3.6), R(2.2, 5.8, 3.0), u), look: R(0, 5.2, 0.4), fov: 54 }));
  add('duel1b', T.C1 + 1.35, (u, t) => wide(t, { az: -0.3 + 0.15 * u + 0.75 * easeInOut(smooth(T.C2 + 0.5, T.C2 + 0.72, t)), el: lerp(0.2, 0.06, easeOut(u)), fov: 54 }));
  add('flung', T.C3 + 0.08, (u, t) => { const p = rowanRoot(t).p; return { pos: v3(9.4, 10.5, p.z + 5.0), look: p.clone().add(v3(0, 1.6, -2.0)), fov: 64 }; });
  add('getup', T.landR + 0.12, (u) => ({ pos: lp3(Q(-4.2, 5.2, 8.0), Q(-3.8, 4.4, 7.2), easeInOut(u)), look: lp3(Q(0, 1.0, 0), Q(0, 2.8, 0), easeInOut(u)), fov: 58 }));
  add('cut', s(11) + 1.55, (u) => ({ pos: lp3(Q(-0.7, 5.0, 2.5), Q(-0.65, 4.95, 2.2), u), look: Q(0.05, 4.75, 0), fov: 46 }));
  add('raise', s(12) - 0.1, (u, t) => { const sp = swordsRoot(t).p; return { pos: sp.clone().add(lp3(v3(8.8, 1.0, 1.2), v3(8.0, 0.8, 0.4), u)), look: sp.clone().add(v3(0, 4.6, -1.2)), fov: 56 }; });
  // the island freezes
  add('freeze', T.FRZ - 0.45, (u) => ({ pos: lp3(v3(26, 22, -40), v3(22, 20, -36), easeInOut(u)), look: v3(0, 6, -8), fov: 58 }));
  add('stopA', s(14) - 0.1, (u) => { const a = lerp(-0.6, 0.15, easeInOut(u)), c = W.atl.root.position; return { pos: c.clone().add(v3(Math.sin(a) * 9.6, 4.0, Math.cos(a) * 9.6)), look: c.clone().add(v3(0, 3.0, 0)), fov: 54 }; });
  add('stopZ', s(14) + 0.6, (u) => ({ pos: lp3(ZZ.clone().add(v3(2.6, 4.2, -5.0)), ZZ.clone().add(v3(2.2, 4.1, -4.4)), u), look: ZZ.clone().add(v3(-3, 3.2, 6)), fov: 56 }));
  add('look', s(15) - 0.1, (u) => { const a = lerp(-0.75, -0.3, easeInOut(u)); return { pos: Q(Math.sin(a) * 7.4, 4.4, Math.cos(a) * 7.4), look: Q(0, 3.3, 0.4), fov: 54 }; });
  add('swing', T.rift - 0.25, (u) => ({ pos: lp3(Q(-8.6, 3.8, 9.2), Q(-7.4, 4.0, 8.0), easeOut(u)), look: Q(0.2, 3.8, 1.4), fov: 58 }));
  add('crack', s(17) - 0.15, (u) => ({ pos: lp3(Q(-3.6, 4.4, -9.4), Q(-2.4, 4.8, -7.0), easeInOut(u)), look: Q(0.6, 4.4, 2.4), fov: 56 }));
  // the second fight: the swordsman leaps in (wide, the ghost of his next move), Rowan's eyes, one wide moving shot through the
  // dodge and the counter (a whip pan), the chest strike from low as the camera pushes in, the armour bursting
  add('ghost', T.RES - 0.1, (u, t) => wide(t, { az: lerp(0.1, 0.45, easeInOut(u)), el: lerp(0.32, 0.2, u), fov: 54, k: 1.12 }));
  add('eyes', T.C4 + 0.5, (u, t) => { const r = rowanRoot(t).p, sp = swordsRoot(t).p, d = sp.clone().sub(r).setY(0).normalize(), sd = v3(d.z, 0, -d.x);
    return { pos: r.clone().add(v3(0, 5.0, 0)).addScaledVector(d, lerp(3.6, 3.3, u)).addScaledVector(sd, 1.5), look: r.clone().add(v3(0, 4.75, 0)), fov: 48 }; });
  add('duel2', T.C4 + 1.2, (u, t) => wide(t, { az: lerp(0.25, -0.05, u) - 0.9 * easeInOut(smooth(T.C5 + 0.28, T.C5 + 0.48, t)), el: 0.06, fov: 54 }));
  add('strike', T.C7 - 0.55, (u, t) => wide(t, { az: lerp(0.15, 0.4, u), el: -0.1, fov: 56, k: lerp(1.3, 1.02, easeOut(u)) }));
  add('shatter', T.C7 + 0.55, (u) => ({ pos: lp3(M(8.4, 4.0, 10.0), M(7.2, 3.6, 8.6), u), look: M(0.6, 3.0, 2.4), fov: 56 }));
  add('nobody', s(23) - 0.05, (u) => ({ pos: lp3(M(2.2, 1.6, 9.6), M(1.8, 1.3, 8.0), easeInOut(u)), look: M(0.4, 1.4, 0), fov: 56 }));
  add('dark', s(24) - 0.08, (u) => { const h = W.helmRest || M(0, 0.5, 3); return { pos: h.clone().add(lp3(v3(0.6, 1.9, 3.2), v3(0.08, 0.7, 1.0), easeInOut(u))), look: h.clone().add(v3(0, 0.25, 0)), fov: 46 }; });
  add('helmet', s(25) - 0.1, (u) => { const h = W.helmRest || M(0, 0.5, 3); return { pos: lp3(h.clone().add(v3(1.6, 0.8, 3.4)), h.clone().add(v3(1.1, 0.9, 2.6)), easeInOut(u)), look: lp3(h.clone().add(v3(-0.4, 0.8, -2)), RF.clone().add(v3(0, 4, 0)), 0.5), fov: 58 }; });
  add('lookblade', s(27) - 0.1, (u) => ({ pos: lp3(F(1.6, 5.0, 5.6), F(1.0, 5.0, 4.2), u), look: F(0, 4.6, 0.6), fov: 54 }));
  add('reflect', T.armor, (u) => W.reflectCam(u));
  add('armored', s(28) - 0.08, (u) => ({ pos: lp3(F(1.8, 4.8, 7.0), F(5.6, 6.8, 13.5), easeInOut(u)), look: F(0, 3.4, 0), fov: 54 }));
  // beneath the island
  add('field', T.cave, (u) => ({ pos: CAV.clone().add(lp3(v3(0.5, 4.2, 9), v3(0, 24, 76), easeInOut(clamp(u * 1.08)))), look: CAV.clone().add(lp3(v3(0, 3.2, -6), v3(0, 1, -16), u)), fov: 58 }));
  S.forEach((x, i) => { if (S[i + 1]) { const v = S[i + 1].t0(); x.t1 = () => v; } });
  S[S.length - 1].t1 = () => ctx.dur + 1;
  return S;
}

// ---- a frame ----
const faceOf = (c, name, t, ph = 0.3) => c.setFace && c.setFace(name, { blink: blinkAt(t, ph) && !['shocked', 'scared', 'pain', 'terrified'].includes(name) });
const lastAt = (list, t) => { let v = list[0][1]; for (const [k, x] of list) if (t >= k) v = x; return v; };
function rowanFace(t) {
  return lastAt([[0, 'focused'], [T.touch + 0.1, 'surprised'], [T.free + 0.4, 'neutral'], [L(3).start + 0.3, 'scared'], [L(4).start + 0.4, 'nervous'], [T.split0 + 0.4, 'shocked'], [T.leap0, 'scared'],
    [T.C1 - 0.4, 'angry'], [T.C1 + 0.05, 'pain'], [T.C1 + 0.6, 'angry'], [T.C2 + 0.02, 'pain'], [T.C2 + 0.7, 'scared'], [T.C3, 'pain'], [T.rise + 1.6, 'angry'], [T.FRZ + 0.2, 'surprised'],
    [L(15).start, 'lookleft'], [L(15).start + 0.45, 'lookright'], [T.look, 'focused'], [T.rift - 0.2, 'angry'], [T.crack + 0.2, 'surprised'], [T.RES, 'focused'], [T.C7 - 0.4, 'angry'], [T.SH + 0.1, 'shocked'],
    [L(24).start, 'scared'], [L(26).start, 'shocked'], [L(27).start, 'nervous']], t);
}
function setLights(t, focus, set, flash) {
  const k = W.key, f = W.fill, rim = W.rim;
  k.intensity = 0; f.intensity = 0; rim.intensity = 0; W.flashL.intensity = 0; W.caveL.intensity = 0;
  if (set === 'cave') { W.caveL.intensity = 380 * (0.35 + 0.65 * smooth(T.cave, T.cave + 3, t)); W.field.wake(t - T.cave - 0.2, 24); return; }
  // a cool soft fill from the camera side, a rim from behind (the storm light), the lightning on top
  f.position.copy(focus).add(v3(2.5, 4.5, 6)); f.intensity = (set === 'frozen' ? 26 : 30) * (['dark', 'helmet'].includes(ctx.shotName2) ? 0.15 : 1); f.color.set(set === 'frozen' ? '#d8d0ff' : '#e6ecf8'); f.distance = 22;
  rim.position.copy(focus).add(v3(-3, 6, -7)); rim.intensity = 60 * (['dark', 'helmet'].includes(ctx.shotName2) ? 0.3 : 1); rim.color.set(set === 'frozen' ? '#a89cff' : '#9fc4ff'); rim.distance = 26;
  W.flashL.intensity = flash * 4.5;
}

// The wide two-shot: frames both fighters head to feet (and a raised blade) in the 9:16 frame from azimuth az (radians round the
// pair; 0 = from +x) and elevation el; the distance comes from the fov and the pair's spread across the view. k > 1 backs off.
const COLS = [[-11, 4], [-11, -6], [-11, -16], [11, 4], [11, -6], [11, -16], [-18, 14], [16, 15], [-24, -2], [22, -4], [-20, -13]];   // standing columns + the clock tower
// distance from point c to the segment p-q in the ground plane
const segDist = (p, q, c) => { const dx = q.x - p.x, dz = q.z - p.z, l = dx * dx + dz * dz || 1, k = clamp(((c[0] - p.x) * dx + (c[1] - p.z) * dz) / l); return Math.hypot(p.x + dx * k - c[0], p.z + dz * k - c[1]); };
function wide(t, o = {}) {
  let az = o.az ?? 0.6;
  for (let i = 0; i < 8; i++) { const r = wide1(t, { ...o, az }); if (!COLS.some((c) => segDist(r.pos, r.look, c) < 1.9)) return r; az += 0.22; }
  return wide1(t, o);
}
function wide1(t, o = {}) {
  const a = rowanRoot(t).p, b = swordsRoot(t).p, m = a.clone().lerp(b, 0.5); m.y = TOP;
  const az = o.az ?? 0.6, el = o.el ?? 0.1, fov = o.fov ?? 52, dir = v3(Math.cos(az), 0, Math.sin(az));
  const vf = fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * 1080 / 1920);
  const ab = b.clone().sub(a), perp = Math.abs(ab.x * dir.z - ab.z * dir.x);
  const near = Math.max(a.clone().sub(m).dot(dir), b.clone().sub(m).dot(dir), 0);   // the nearer fighter must fit too
  const d = Math.max((o.H ?? 10.2) / 2 / Math.tan(vf) + near, (perp / 2 + 1.9) / Math.tan(hf)) * (o.k ?? 1.08);
  const look = m.clone().add(v3(0, o.ly ?? 4.1, 0));
  const pos = look.clone().addScaledVector(dir, d * Math.cos(el)).add(v3(0, d * Math.sin(el), 0)); pos.y = Math.max(pos.y, TOP + 0.7);
  return { pos, look, fov };
}
// the blades' base and tip at an earlier time (for the trails): pose the rig at that time and read the sword
function segR(tau) {
  const r = W.r, rr = rowanRoot(tau), P = rowanPose(tau);
  r.reset(); r.root.position.copy(rr.p); r.root.rotation.set(rr.rx, rr.ry, 0); applyPose(r, P, { travel: 0 }); holdProp(r, 0, W.sw, P);
  return { base: propPoint(W.sw, v3(0, 0, 2.6)), tip: propPoint(W.sw, W.sw.tip), root: rr.p.clone() };
}
function segS(tau) {
  if (walking(tau) || tau < T.land) return null;
  const sc = W.s, sr = swordsRoot(tau);
  if (tau >= T.land2) sr.ry = Math.atan2(rowanRoot(tau).p.x - sr.p.x, rowanRoot(tau).p.z - sr.p.z);
  sc.reset(); sc.root.position.copy(sr.p); sc.root.rotation.set(0, sr.ry, 0); applyPose(sc, swordsPose(tau), { travel: tau >= T.C7 ? 0.6 : 0 }); holdProp(sc, 0, W.wb, sc._pose);
  return { base: propPoint(W.wb, v3(0, 0, 2.8)), tip: propPoint(W.wb, W.wb.tip), root: sr.p.clone() };
}
// speed lines and impact frames: a pure function of the frame's time
function fxAt(t, n, cam) {
  const e = T, o = { focus: 0, streak: 0, impact: 0, cx: 0.5, cy: 0.45 };
  const bump = (c, a, b) => smooth(c - a, c, t) * (1 - smooth(c, c + b, t));
  const scr = (p) => { const q = p.clone().project(cam); return [clamp(q.x * 0.5 + 0.5), clamp(0.5 - q.y * 0.5)]; };
  const C = [[e.C1, 0], [e.C2, 1], [e.C3, 2], [e.C6, 3], [e.C7, 4], [e.C5, 5]];
  for (const [c, i] of C) { const k = bump(c, 0.12, 0.32) * 0.9; if (k > o.focus) { o.focus = k * 0.8; [o.cx, o.cy] = scr(contactPoint(i, c)); } }
  if (t >= e.leap0 && t < e.land + 0.2) { o.focus = Math.max(o.focus, 0.65 * smooth(e.leap0, e.leap0 + 0.2, t)); [o.cx, o.cy] = scr(swordsRoot(t).p.clone().add(v3(0, 3, 0))); }
  if (t >= e.leap2 - 0.05 && t < e.land2 + 0.2) { const k = 0.6 * bump(e.land2, 0.6, 0.25); if (k > o.focus) { o.focus = k; [o.cx, o.cy] = scr(swordsRoot(t).p.clone().add(v3(0, 3, 0))); } }
  if (n === 'flung') o.streak = 0.85 * (1 - smooth(e.landR - 0.15, e.landR + 0.1, t));
  if (n === 'duel1b') o.streak = Math.max(o.streak, bump(e.C2 + 0.61, 0.12, 0.14));       // the whip pan
  if (n === 'duel2') o.streak = Math.max(o.streak, bump(e.C5 + 0.38, 0.12, 0.14));
  if (n === 'swing' || n === 'crack') { const k = 0.5 * bump(e.rift + 0.62, 0.2, 0.6); if (k > o.focus) { o.focus = k; o.color = 'rgba(205,190,255,0.55)'; [o.cx, o.cy] = scr(RL.clone().add(v3(0.4, 4.6, 2.4))); } }
  // impact frames: the two strikes that decide each fight (the throw through the wall, the cut across the chest)
  for (const c of [e.C3, e.C7]) { const d = t - c; if (d >= 0 && d < 0.1) { o.impact = d < 0.034 ? 1 : d < 0.067 ? 2 : 1; [o.cx, o.cy] = scr(contactPoint(c === e.C3 ? 2 : 4, c)); } }
  o.streak = clamp(o.streak); o.angle = 0;
  return o;
}

function renderAt(t) {
  let sh = shotAt(W.shots, t); const n = sh.name, e = T;
  const w = tw(t), frozen = t >= e.FRZ && t < e.RES, cave = n === 'field';
  const freezeK = smooth(e.FRZ, e.FRZ + 0.35, t) * (1 - smooth(e.RES - 0.1, e.RES + 0.3, t));
  const set = cave ? 'cave' : freezeK > 0.5 ? 'frozen' : 'storm';
  applyEnv(ctx, cave ? CAVE : freezeK > 0.5 ? FROZEN : t >= e.RES && t < e.SH ? SIGHT : STORM);
  // lightning: world time (a bolt hangs in the sky while the island is frozen)
  const FL = [[2.9, 0.55], [4.25, 0.8], [11.5, 0.7], [13.8, 0.6], [17.2, 0.4], [21.9, 0.45], [27.55, 0.9], [e.FRZ - 0.08, 1.0], [44.9, 0.5], [57.3, 0.95], [58.5, 0.4]];
  const fl = cave ? 0 : flashAt(FL, w) * (frozen ? 0.35 : 1);
  W.bolts[0].set(cave ? 0 : flashAt([[4.25, 1], [11.5, 1], [57.3, 1]], w)); W.bolts[1].set(cave ? 0 : flashAt([[27.55, 1], [e.FRZ - 0.08, 1], [44.9, 1]], w)); W.bolts[2].set(cave ? 0 : flashAt([[2.9, 1], [21.9, 1], [17.2, 1], [58.5, 1]], w));
  if (!cave && fl > 0) { const su = ctx.sky.uniforms, c = new THREE.Color('#b8b6d8'); su.uTop.value.lerp(c, fl * 0.35); su.uHorizon.value.lerp(c, fl * 0.45); ctx.scene.fog.color.lerp(c, fl * 0.25); ctx.scene.background.copy(ctx.scene.fog.color); }
  // the world
  const island = !cave;
  W.isle.group.visible = island; W.sea.visible = island; W.cave.visible = cave;
  ctx.scene.children.forEach((o) => { if (o.userData.isle) o.visible = island; });
  const split = smooth(e.split0, e.split1, t);
  W.sea.update(w, split, fl);
  W.clouds.update(w * 3); W.clouds.visible = island;
  W.tower.set(Math.min(t, e.clock) + 37230); W.pclock.set(Math.min(t, e.clock) + 37230 + 1800);
  W.wall.set(t, e.wall, v3(0, TOP + 3.0, WALLZ), v3(0, 0, -1), 1.9, TOP);
  W.crater.position.set(R0.x, TOP, R0.z + 0.2); W.crater.set(t, e.C2);
  // ---- sword trails: the blades' past positions (the real poses below overwrite these) ----
  const trailOn = !cave && t >= e.free + 0.25 && t < e.SH && !(t > e.C3 && t < e.rise + 1.2), sR = [], sS = [];
  if (trailOn) for (let i = 1; i <= 10; i++) { const tau = t - i / 60; sR[i] = segR(tau); sS[i] = segS(tau); }
  // ---- Rowan ----
  const r = W.r, ra = W.ra, armor = t >= e.armor && !cave;
  r.root.visible = !armor && !cave && n !== 'open'; ra.root.visible = armor;
  const RC = armor ? ra : r, rr = rowanRoot(t), RP = rowanPose(t);
  RC.reset(); RC.root.position.copy(rr.p); RC.root.rotation.set(rr.rx, rr.ry, 0);
  applyPose(RC, RP, { travel: 0 });
  if (n === 'look' && t < L(16).start) { RC.neck.rotation.y = 0.5 * Math.sin((t - L(15).start) * 4.2); }
  if (t >= e.landR && t < e.rise) RC.hips.position.y = RC.hipY * 0.18;
  const sword = armor ? W.rasw : W.sw;
  if (t < e.touch) { // the sword stands in the slab, point down
    if (W.sw.parent !== ctx.scene) ctx.scene.add(W.sw);
    W.sw.position.copy(SLAB).add(v3(0, 1.25 + 2.5, 0)); W.sw.quaternion.setFromUnitVectors(v3(0, 0, 1), v3(0, -1, 0)); W.sw.rotateZ(0.6);
  } else {
    holdProp(RC, 0, sword, RP);
    if (t < e.free) {   // still in the stone: the blade only slides up out of it
      const k = smooth(e.touch + 0.1, e.free, t), stuck = SLAB.clone().add(v3(0, 1.25 + 2.5 + k * 0.7, 0));
      ctx.scene.attach(sword); sword.position.copy(stuck); sword.quaternion.setFromUnitVectors(v3(0, 0, 1), v3(0, -1, 0)); sword.rotateZ(0.6);
      aimArm(RC, 0, stuck.clone().add(v3(0, 0.25, 0))); aimArm(RC, 1, stuck.clone().add(v3(0, 0.75, 0)));
    } else if (!/dodge|react/.test(n) && !(t > e.SH + 1.3 && t < L(27).start - 0.1)) aimArm(RC, 1, propPoint(sword, sword.hilt2), 0.85);
  }
  W.sw.setGlow(t > e.look ? 0.4 + 0.6 * smooth(e.rift + 0.4, e.rift + 0.65, t) * (1 - smooth(e.crack + 1, e.crack + 3, t)) : 0);
  if (!armor) faceOf(r, rowanFace(t), t, 0.3);
  W.cut.visible = t >= e.C3 + 0.1;
  // the slash across the swordsman's chest: a bright line that cools to a glowing crack
  const sk = t >= e.C7 ? Math.exp(-(t - e.C7) * 3) : 0; W.slash.visible = t >= e.C7 && t < e.SH; W.slashM.opacity = 0.35 + 0.65 * sk; W.slashM.color.set(sk > 0.4 ? '#f2eeff' : '#9a7cff');
  // ---- the swordsman (and his ghost) ----
  const s = W.s, sr = swordsRoot(t), shattered = t >= e.SH;
  s.root.visible = t >= e.rise0 - 0.2 && !cave && t < e.armor;
  if (t >= e.land2) sr.ry = Math.atan2(rr.p.x - sr.p.x, rr.p.z - sr.p.z);
  s.reset(); s.root.position.copy(sr.p); s.root.rotation.set(0, sr.ry, 0);
  if (walking(t)) { pose(s, 'walk', (t - e.walk0) * 0.8); s._pose = { blade: v3(0.1, -0.5, 0.85) }; s.hips.position.x = 0; s.hips.position.z = 0; }
  else applyPose(s, swordsPose(shattered ? Math.min(t, e.SH) : t), { travel: t >= e.C7 ? 0.6 : 0 });
  holdProp(s, 0, W.wb, s._pose); if (!walking(t)) aimArm(s, 1, propPoint(W.wb, W.wb.hilt2), 0.85);
  W.wb.visible = !shattered || t < e.SH + 0.05; W.wbL.intensity = s.root.visible && W.wb.visible ? 3.2 : 0;
  W.suit.wind(w, frozen ? 0 : 1);
  W.suit.visible(true);
  if (shattered) {
    W.suit.shatter(Math.min((t - e.SH) * 0.75, 1.25), { gravity: 26, power: 6.5, floor: TOP, centre: sr.p.clone().add(v3(0, 3, 0)) }); W.suit.helm.visible = false; W.suit.cape.visible = t < e.SH + 0.2;
    // the helmet drops straight down, hits the ground, rolls a little toward the camera side
    const d = t - e.SH, h0 = sr.p.clone().add(v3(0, 4.9, 0)), land = sr.p.clone().add(v3(0.6, 0.48, 1.4));
    W.helmRest = land;
    const u = clamp(d / 0.55), bounce = d > 0.55 ? Math.abs(Math.sin((d - 0.55) * 7)) * Math.exp(-(d - 0.55) * 5) * 0.4 : 0;
    W.helm.visible = true; W.helm.position.copy(lp3(h0, land, u)); W.helm.position.y = lerp(h0.y, land.y, easeIn(u)) + bounce;
    W.helm.rotation.set(-0.4 * u + (d > 0.55 ? -0.35 * smooth(0.55, 1.2, d) : 0), 0.3, 0.2 * u + 0.9 * smooth(0.55, 1.3, d));
    W.helm.scale.copy(W.suit.helm.scale);
  } else { W.suit.shatter(0); W.helm.visible = false; }
  W.helm.visible = W.helm.visible && !cave && t < e.armor + 2;
  // ghost: the swordsman's next move, 0.45 s early
  const gv = t >= e.RES && t < e.C6 + 0.2 && ['ghost', 'duel2'].includes(n);
  W.g.root.visible = gv; W.gb.visible = gv;
  if (gv) {
    const ta = t + 0.45, g = W.g, gr = swordsRoot(ta); g.reset(); g.root.position.copy(gr.p); g.root.rotation.set(0, gr.ry, 0); applyPose(g, swordsPose(ta), { travel: 0 }); holdProp(g, 0, W.gb, g._pose); aimArm(g, 1, propPoint(W.gb, W.gb.hilt2), 0.85);
    W.ghostM.opacity = 0.16 + 0.08 * Math.sin(t * 20);
  }
  // Rowan in the armour: the reflection in the blade
  if (armor) { W.rasuit.wind(w, 1); faceOf(ra, 'neutral', t); }
  W.reflectCam = (u) => {
    const fc = ra.head.localToWorld(v3(0, 0.4, 0.2)); rollToward(W.rasw, fc);
    const Pm = propPoint(W.rasw, v3(0, 0.16, 0.42 + 1.5)), side = v3(Math.cos(ra.root.rotation.y), 0, -Math.sin(ra.root.rotation.y));
    // seen from in front of the blade's flat: the dark helmet close, its edges caught by a cold key (Rowan's own face is gone)
    W.key.position.copy(RF).add(v3(-2.2, 7.0, 3.2)); W.key.color.set('#cfdcff'); W.key.intensity = 60; W.key.distance = 9;
    return { pos: lp3(RF.clone().add(v3(-1.3, 5.3, 4.8)), RF.clone().add(v3(-1.1, 5.2, 4.1)), easeInOut(u)), look: RF.clone().add(v3(0, 4.75, 0)), fov: 50 };
  };
  // ---- the side characters ----
  const A = W.atl, Z = W.zz, aw = Math.min(w, e.FRZ);
  A.reset(); A.root.visible = island && t < e.armor;
  const ap = ATL.clone().add(v3(Math.sin(aw * 0.35) * 2.2, 0, Math.cos(aw * 0.28) * 1.6 - 1.0)); A.root.position.copy(ap); A.root.rotation.set(0, -0.7 + Math.sin(aw * 0.35) * 0.6, 0);
  pose(A, 'walk', aw * 0.62); A.neck.rotation.y = 0.4 * Math.sin(aw * 0.9); A.neck.rotation.x = 0.25;
  faceOf(A, t < e.split0 ? 'focused' : 'shocked', t >= e.FRZ ? e.FRZ : t, 0.6);
  Z.reset(); Z.root.visible = island && t < e.armor; Z.root.position.copy(ZZ); Z.root.rotation.set(0, lerp(-2.57, -0.63, smooth(e.split0, e.split0 + 0.8, Math.min(t, e.FRZ))), 0);
  pose(Z, t < e.split0 ? 'idle' : 'scared', Math.min(t, e.FRZ), { amt: 0.1 }); if (t < e.split0) Z.neck.rotation.x = -0.3 * smooth(e.clock, e.clock + 0.6, t);
  faceOf(Z, t < e.clock + 0.5 ? 'neutral' : t < e.split0 ? 'surprised' : 'terrified', Math.min(t, e.FRZ), 0.8);
  // ---- effects ----
  if (trailOn) {
    sR[0] = { base: propPoint(W.sw, v3(0, 0, 2.6)), tip: propPoint(W.sw, W.sw.tip), root: rr.p.clone() };
    sS[0] = walking(t) ? null : { base: propPoint(W.wb, v3(0, 0, 2.8)), tip: propPoint(W.wb, W.wb.tip), root: sr.p.clone() };
    W.trR.set(sR); if (sS.every(Boolean) && sS.length === 11) W.trS.set(sS); else W.trS.visible = false;
    W.trR.visible = W.trR.visible && r.root.visible; W.trS.visible = W.trS.visible && W.s.root.visible;
  } else { W.trR.visible = false; W.trS.visible = false; }
  W.rain.visible = island; W.rain.centre.copy(sh.pos).add(sh.look.clone().sub(sh.pos).normalize().multiplyScalar(18)); W.rain.centre.y = Math.max(TOP - 2, sh.pos.y - 20); W.rain.update(w);
  const hit = (c) => t >= c && t < c + 0.7;
  const C = [[e.C1, 0], [e.C2, 1], [e.C3, 2], [e.C6, 3], [e.C7, 4], [e.C5, 5]];
  C.forEach(([c, i]) => { const sp = W.sparks[i]; sp.fire(c); sp.update(t); if (hit(c)) sp.position.copy(W.sparkAt[i] ||= contactPoint(i, c)); sp.visible = sp.visible && island; });
  W.dust[0].fire(e.land); W.dust[0].position.set(0, TOP, 7.8); W.dust[1].fire(e.C2); W.dust[1].position.set(0, TOP, 0.2); W.dust[2].fire(e.landR); W.dust[2].position.copy(RL);
  W.dust.forEach((d) => { d.update(t); d.visible = d.visible && island; });
  // the crack in time: opens where the black blade cut, stays while the world is frozen, fades as time resumes
  const ck = smooth(e.crack, e.crack + 0.5, t) * (1 - smooth(e.RES + 0.2, e.RES + 1.2, t));
  W.crack.position.copy(RL).add(v3(0.4, 4.6, 2.4)); W.crack.rotation.set(0, 0.15, 0.1); W.crack.set(ck, t);
  // impact frames: a short white flash and a kick at each contact
  let flash = 0, shake = 0;
  for (const [c] of C.slice(0, 5)) { const d = t - c; if (d >= 0 && d < 0.4) { flash = Math.max(flash, 0.22 * Math.exp(-d * 28)); shake = Math.max(shake, 1.6 * Math.exp(-d * 9)); } }
  if (t >= e.land && t < e.land + 0.4) shake = Math.max(shake, 1.8 * Math.exp(-(t - e.land) * 8));
  if (t >= e.wall && t < e.wall + 0.6) shake = Math.max(shake, 1.4 * Math.exp(-(t - e.wall) * 8));
  if (t >= e.SH && t < e.SH + 0.3) flash = Math.max(flash, 0.15 * Math.exp(-(t - e.SH) * 20));
  // focus (the key light follows it)
  const focus = cave ? CAV.clone() : ['hunter', 'stopA'].includes(n) ? A.root.position.clone() : ['dockclock', 'stare', 'stopZ'].includes(n) ? ZZ.clone() : n.startsWith('rise') ? sr.p.clone() : RC.root.position.clone().lerp(sr.p, ['leap', 'duel1', 'duel1b', 'raise', 'ghost', 'duel2', 'strike'].includes(n) ? 0.5 : 0);
  ctx.shotName2 = n; setLights(t, focus, set, fl);
  if (n === 'reflect') { ctx.scene.updateMatrixWorld(true); sh = shotAt(W.shots, t); }   // the reflect shot reads this frame's pose
  const near = ['reflect', 'blade', 'dark'].includes(n) ? 0.03 : 0.2; if (ctx.camera.near !== near) { ctx.camera.near = near; ctx.camera.updateProjectionMatrix(); }
  const steady = t < e.leap0;
  frame(ctx, t, sh, { steady, shake: steady ? 0 : shake, shadowSpan: n === 'open' || n === 'freeze' ? 90 : n === 'split' || n.startsWith('rise') ? 70 : 34, flash, flashColor: '#ffffff', shadows: !cave });
  W.fx.set(t, cave ? {} : fxAt(t, n, ctx.camera));
  return n;
}
// where the blades meet: from the two roots at the contact time (pure functions of time, so every worker agrees)
function contactPoint(i, c) {
  const r = rowanRoot(c).p, sp = swordsRoot(c).p, dir = sp.clone().sub(r).setY(0).normalize();
  if (i === 0 || i === 1) return r.clone().add(v3(0, 5.6, 0)).addScaledVector(dir, 0.9);
  if (i === 2) return r.clone().add(v3(0, 3.4, 0)).addScaledVector(dir, 1.3);
  if (i === 4) return sp.clone().add(v3(0, 3.7, 0)).addScaledVector(dir, -0.7);
  if (i === 5) return sp.clone().add(v3(0, 0.15, 0)).addScaledVector(dir, -4.2);
  return r.clone().lerp(sp, 0.5).add(v3(0, 4.2, 0));
}

export async function setup() {
  ctx = await initStage('ep32', { look: 'pro', avatars: ['farm_ep32_rowan', 'farm_ep32_atlanta', 'farm_ep32_zzeekkee'] }); L = ctx.L;
  EV = events();
  HOLDS = [[T.C1, 0.05], [T.C2, 0.06], [T.C3, 0.05], [T.C6, 0.04], [T.C7, 0.09]];
  await loadAnimSet('sword_set');
  clips();
  await loadAlti(['neutral', 'focused', 'surprised', 'scared', 'nervous', 'shocked', 'angry', 'pain', 'lookleft', 'lookright', 'terrified']);
  const { camera } = ctx; camera.far = 3000; camera.near = 0.2; camera.updateProjectionMatrix();
  W.key = new THREE.PointLight('#ffffff', 0, 30, 1.6); W.fill = new THREE.PointLight('#ffffff', 0, 22, 1.6); W.rim = new THREE.PointLight('#ffffff', 0, 26, 1.4);
  W.flashL = new THREE.DirectionalLight('#c8c4ff', 0); W.flashL.position.set(-60, 200, 240);
  [W.key, W.fill, W.rim, W.flashL].forEach((l) => ctx.scene.add(l));
  world(); people();
  W.fx = installActionFX(ctx);
  W.trR = weaponTrail({ color: '#a98cff', gain: 1.2 }); W.trS = weaponTrail({ color: '#9fcbff', gain: 0.9 }); ctx.scene.add(W.trR, W.trS);
  W.sparkAt = []; W.reflectCam = () => ({ pos: v3(0, 10, 10), look: v3(0, 0, 0), fov: 50 });
  W.shots = shots();
  void noise1;
  return expose(ctx, renderAt, L(27).start + 2.2, EV);
}
