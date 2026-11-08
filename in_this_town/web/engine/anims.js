// Clip playback for the renderer's rig (one joint per limb): retargeted Mixamo clips and hand-keyed clips, sampled as a
// pure function of time, blended, and applied to any character (procedural or a real avatar).
//
//   await loadAnimSet('sword_set');                       // web/assets/anims/mixamo/sword_set.json (tools/anim_retarget.py)
//   const P = sample('gs_attack', t - t0);                 // a pose: quaternions per part, hips travel and height
//   applyPose(ch, blend(sample('gs_idle', t, { loop: true }), P, k));
//   const g = gripOf(ch, 0); sword.position.copy(g.pos); ...   // or holdProp(ch, 0, sword, P)
//
// A pose: { hips, torso, neck, aR, aL, lR, lL, hR, hL } (THREE.Quaternion; a = arm, l = leg, h = hand relative to its arm;
// R = the character's right = arms[0] / legs[0]), p: [x, z] hips travel and h: hips height, both in leg lengths.
// Hand-keyed clips (KEYED below and keyed() for one-offs) use the same pose: keys in degrees (XYZ Euler) at times in seconds.
import * as THREE from 'three';
import { clamp, lerp, easeInOut } from './core.js';

const BASE = '/web/assets/anims/mixamo/';
export const CLIPS = {};
const PARTS = ['hips', 'torso', 'neck', 'aR', 'aL', 'lR', 'lL', 'hR', 'hL'];

export async function loadAnimSet(name) {
  const r = await fetch(BASE + name + '.json');
  if (!r.ok) throw new Error(`anims: ${name}.json missing: run tools/anim_retarget.py (the Mixamo clips are git-ignored)`);
  const d = await r.json();
  for (const [k, c] of Object.entries(d.clips)) {
    c.frames = c.frames.map((f) => ({ q: Object.fromEntries(PARTS.map((p) => [p, new THREE.Quaternion(...f.q[p])])), p: f.p, h: f.h, rR: f.q.rR, rL: f.q.rL }));
    c.dur = (c.n - 1) / c.fps; CLIPS[k] = c;
  }
  return d;
}

const Q0 = () => new THREE.Quaternion();
export function restPose() { return { ...Object.fromEntries(PARTS.map((p) => [p, Q0()])), p: [0, 0], h: 1 }; }
function lerpPose(a, b, k) {
  const o = { p: [lerp(a.p[0], b.p[0], k), lerp(a.p[1], b.p[1], k)], h: lerp(a.h, b.h, k) };
  for (const p of PARTS) o[p] = a[p].clone().slerp(b[p], k);
  if (a.blade && b.blade) o.blade = a.blade.clone().lerp(b.blade, k).normalize(); else o.blade = (k < 0.5 ? a.blade : b.blade) || null;
  return o;
}
export const blend = (a, b, k) => lerpPose(a, b, clamp(k));

// a Mixamo clip at time t (seconds from its start); { loop, from, to, speed, zero } trims / loops / rescales;
// zero: true subtracts the first frame's hips travel so the clip starts on the character's mark
export function sample(name, t, o = {}) {
  const c = CLIPS[name] || KEYED_CLIPS[name];
  if (!c) throw new Error('anims: no clip ' + name);
  if (c.keys) return sampleKeyed(c, t, o);
  const a = o.from ?? 0, b = Math.min(o.to ?? c.dur, c.dur), len = Math.max(1e-3, b - a);
  let u = t * (o.speed ?? 1);
  u = o.loop ? a + (((u % len) + len) % len) : a + clamp(u, 0, len);
  const x = u * c.fps, i = Math.min(c.n - 1, Math.floor(x)), j = Math.min(c.n - 1, i + 1), k = x - i;
  const F = (f) => ({ ...f.q, p: f.p, h: f.h });
  const P = lerpPose(F(c.frames[i]), F(c.frames[j]), k);
  if (o.zero) { const f0 = c.frames[Math.floor(a * c.fps)]; P.p = [P.p[0] - f0.p[0], P.p[1] - f0.p[1]]; }
  return P;
}

// hand-keyed clips: { keys: [{ t, ease?, hips: [x,y,z] deg, torso, neck, aR, aL, lR, lL, hR, hL, p: [x,z], h, blade: [x,y,z] }] }
// blade: the held sword's direction in character space (+z forward, +y up, -x the character's right); it overrides hR
// a part missing from a key holds its value from the key before (the first key defaults to the rest pose)
const d2r = Math.PI / 180;
const eq = (e) => new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0] * d2r, e[1] * d2r, e[2] * d2r, 'XYZ'));
export function keyed(keys, o = {}) {
  let prev = restPose();
  const ks = keys.map((k) => { const P = { p: k.p ?? prev.p, h: k.h ?? prev.h, blade: k.blade ? new THREE.Vector3(...k.blade).normalize() : (prev.blade || null) }; for (const p of PARTS) P[p] = k[p] ? eq(k[p]) : prev[p].clone(); prev = P; return { t: k.t, ease: k.ease, P }; });
  return { keys: ks, dur: ks[ks.length - 1].t, loop: !!o.loop, src: o.src || 'hand-keyed (Episode 32)' };
}
const EASE = { lin: (x) => x, in: (x) => x * x * x, out: (x) => 1 - (1 - x) ** 3, io: easeInOut, snap: (x) => 1 - (1 - x) ** 5 };
function sampleKeyed(c, t, o) {
  const ks = c.keys; let u = t * (o.speed ?? 1);
  if (o.loop || c.loop) u = ((u % c.dur) + c.dur) % c.dur;
  if (u <= ks[0].t) return lerpPose(ks[0].P, ks[0].P, 0);
  for (let i = 1; i < ks.length; i++) if (u <= ks[i].t) { const a = ks[i - 1], b = ks[i]; return lerpPose(a.P, b.P, (EASE[b.ease] || EASE.io)((u - a.t) / (b.t - a.t))); }
  return lerpPose(ks[ks.length - 1].P, ks[ks.length - 1].P, 0);
}

// put a pose on a character (after ch.reset()); travel scales the clip's hips travel (0 keeps the character on its mark)
export function applyPose(ch, P, o = {}) {
  const H = ch.hipY ?? 2, tr = o.travel ?? 1;
  ch.hips.position.set(P.p[0] * H * tr, H * P.h + (o.lift ?? 0), P.p[1] * H * tr);
  ch.hips.quaternion.copy(P.hips); ch.torso.quaternion.copy(P.torso); ch.neck.quaternion.copy(P.neck);
  ch.arms[0].quaternion.copy(P.aR); ch.arms[1].quaternion.copy(P.aL);
  ch.legs[0].quaternion.copy(P.lR); ch.legs[1].quaternion.copy(P.lL);
  ch._pose = P;
}

// the grip point at the end of an arm: arm-local position (measured once per character from the arm's meshes)
const _b = new THREE.Box3();
export function gripLocal(ch, side) {
  ch._grip ||= [];
  if (!ch._grip[side]) {
    const a = ch.arms[side], q = a.quaternion.clone(); a.quaternion.identity(); a.updateMatrixWorld(true);
    _b.makeEmpty(); for (const o of a.children) if (o.isMesh && o.geometry && !o.userData.armor) { o.geometry.computeBoundingBox(); _b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrix)); }
    ch._grip[side] = new THREE.Vector3((_b.min.x + _b.max.x) / 2, _b.isEmpty() ? -1.6 : _b.min.y + 0.32, (_b.min.z + _b.max.z) / 2 + 0.02);
    a.quaternion.copy(q);
  }
  return ch._grip[side];
}

// hold a prop in a hand: parented to the arm at the grip, turned by the pose's hand rotation then `rot` (the prop's
// own grip: by default a prop built along +z is held like a sword, the blade forward of a hanging fist)
export function holdProp(ch, side, obj, P = ch._pose, rot = null) {
  const a = ch.arms[side], g = gripLocal(ch, side);
  if (obj.parent !== a) a.add(obj);
  obj.position.copy(g);
  if (P && P.blade) {   // hand-keyed: the blade points along P.blade (character space: +z forward, +y up, -x the right)
    ch.root.updateMatrixWorld(true); const rq = new THREE.Quaternion(), aq = new THREE.Quaternion();
    ch.root.getWorldQuaternion(rq); a.getWorldQuaternion(aq);
    const d = P.blade.clone().applyQuaternion(rq).applyQuaternion(aq.invert());
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize());
  } else obj.quaternion.copy(P ? (side ? P.hL : P.hR) : Q0());
  if (rot) obj.quaternion.multiply(rot);
}

// aim an arm at a world point (a second hand on a hilt, a hand on a wall): the arm's own -y toward the point
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), DOWN = new THREE.Vector3(0, -1, 0);
export function aimArm(ch, side, world, amt = 1) {
  const a = ch.arms[side]; a.parent.updateMatrixWorld(true);
  const pw = a.parent.matrixWorld, sh = _v.copy(a.position).applyMatrix4(pw);
  _w.copy(world).sub(sh);
  _q.setFromRotationMatrix(pw).invert(); _w.applyQuaternion(_q).normalize();
  const target = new THREE.Quaternion().setFromUnitVectors(DOWN, _w);
  a.quaternion.slerp(target, amt);
}

// a world point on a held prop (prop-local coordinates), e.g. the blade's tip or the middle of the hilt
export function propPoint(obj, local) { obj.updateMatrixWorld(true); return local.clone().applyMatrix4(obj.matrixWorld); }

// ---------------- hand-keyed sword clips (Episode 32; reusable) ----------------
// Degrees, XYZ Euler on the renderer's rig: arm x < 0 raises the arm forward, z < 0 swings the right arm (arms[0], on -x)
// out to the side; torso y turns the chest. hR is the sword hand relative to its arm (the blade forward of the fist at 0).
const K = {};
const G = { torso: [6, -20, 0], neck: [-4, 18, 0], aR: [-62, -12, 8], aL: [-58, 14, -6], lR: [-16, 0, -4], lL: [14, 0, 4], h: 0.97, blade: [0.3, 0.82, 0.48] };   // the guard
// reach down to the hilt in the stone, grip it (contact at 0.7), pull it free (1.35), lift it before the face
K.pull = keyed([
  { t: 0, torso: [6, 0, 0], neck: [18, 0, 0], aR: [-20, 0, 6], aL: [-14, 0, -6], blade: [0, -1, 0.12] },
  { t: 0.45, torso: [34, 0, 0], neck: [22, 0, 0], aR: [-58, 0, 4], aL: [-50, 0, -4], lR: [-22, 0, 0], lL: [10, 0, 0], h: 0.9 },
  { t: 0.7, ease: 'out', torso: [38, 0, 0], neck: [20, 0, 0], aR: [-62, 0, 2], aL: [-56, 0, -2], lR: [-24, 0, 0], lL: [12, 0, 0], h: 0.88 },
  { t: 1.05, ease: 'in', torso: [26, 0, 0], neck: [10, 0, 0], aR: [-48, 0, 2], aL: [-44, 0, -2], lR: [-14, 0, 0], lL: [8, 0, 0], h: 0.93 },
  { t: 1.35, ease: 'snap', torso: [-8, 0, 0], neck: [-6, 0, 0], aR: [-120, 0, 8], aL: [-112, 0, -8], lR: [0, 0, 0], lL: [0, 0, 0], h: 1, blade: [0, 1, 0.2] },
  { t: 1.9, torso: [0, 0, 0], neck: [4, 0, 0], aR: [-80, 6, 6], aL: [-72, -6, -8], blade: [0.12, 0.95, 0.3] },
]);
K.guard = keyed([{ t: 0, ...G }, { t: 1.2, ...G, torso: [8, -22, 0], h: 0.962 }, { t: 2.4, ...G }], { loop: true });
// look down the blade: the sword upright before the face
K.inspect = keyed([{ t: 0, torso: [2, 0, 0], neck: [-4, 0, 0], aR: [-92, 10, 4], aL: [-8, 0, -6], blade: [0.08, 1, 0.12] }, { t: 2, torso: [3, 0, 0], neck: [-6, 0, 0], aR: [-94, 10, 4], aL: [-8, 0, -6], blade: [0.08, 1, 0.16] }], { loop: true });
// a high block: the blade flat over the head against a downward strike (the lift; contact at 0.32: the knees give)
K.blockHigh = keyed([
  { t: 0, ...G },
  { t: 0.22, ease: 'snap', torso: [-10, -6, 0], neck: [-22, 4, 0], aR: [-160, 0, 28], aL: [-160, 0, -28], lR: [-20, 0, -6], lL: [18, 0, 6], h: 0.96, blade: [1, 0.08, 0.15] },
  { t: 0.32, torso: [-6, -6, 0], neck: [-18, 4, 0], aR: [-152, 0, 30], aL: [-152, 0, -30], lR: [-26, 0, -8], lL: [24, 0, 8], h: 0.9 },
  { t: 0.5, ease: 'out', torso: [4, -6, 0], neck: [-12, 4, 0], aR: [-140, 0, 32], aL: [-140, 0, -32], lR: [-32, 0, -10], lL: [30, 0, 10], h: 0.84, blade: [1, -0.05, 0.2] },
  { t: 0.9, ...G, h: 0.93 },
]);
// a parry to the right: the blade upright, knocked aside at contact (0.2), recovered
K.parry = keyed([
  { t: 0, ...G },
  { t: 0.16, ease: 'snap', torso: [4, 30, 0], neck: [-4, -10, 0], aR: [-80, 0, -30], aL: [-76, 30, -10], lR: [-18, 0, -6], lL: [14, 0, 6], h: 0.95, blade: [-0.35, 0.9, 0.3] },
  { t: 0.24, torso: [2, 38, 0], neck: [-4, -12, 0], aR: [-76, 0, -42], aL: [-74, 36, -14], h: 0.94, blade: [-0.7, 0.62, 0.1] },
  { t: 0.6, ...G },
]);
// an overhead two-handed smash: wind-up behind the head, the drop, contact at 0.55, the blade buried, the pull back up
K.smash = keyed([
  { t: 0, ...G, torso: [4, 10, 0], neck: [0, -8, 0], aR: [-70, 0, 6], aL: [-66, 0, -6], blade: [0, 0.85, 0.5] },
  { t: 0.32, ease: 'out', torso: [-22, 14, 0], neck: [-14, -8, 0], aR: [-196, 0, 14], aL: [-192, 0, -14], lR: [-8, 0, 0], lL: [16, 0, 0], h: 1.0, blade: [0, 0.2, -1] },
  { t: 0.42, torso: [-24, 14, 0], neck: [-14, -8, 0], aR: [-200, 0, 12], aL: [-196, 0, -12], blade: [0, 0.1, -1] },
  { t: 0.55, ease: 'snap', torso: [38, 0, 0], neck: [10, 0, 0], aR: [-62, 0, 6], aL: [-58, 0, -6], lR: [-30, 0, 0], lL: [26, 0, 0], h: 0.86, blade: [0, -0.62, 0.8] },
  { t: 0.85, torso: [42, 0, 0], neck: [12, 0, 0], aR: [-56, 0, 6], aL: [-52, 0, -6], h: 0.85, blade: [0, -0.7, 0.7] },
  { t: 1.3, ...G, torso: [10, 6, 0], neck: [0, -4, 0], aR: [-80, 0, 6], aL: [-76, 0, -6], h: 0.96 },
]);
// a flat swing from the right: wind-up over the right shoulder, contact at 0.47, the follow-through round to the left
K.sweep = keyed([
  { t: 0, ...G },
  { t: 0.3, ease: 'out', torso: [4, 58, 0], neck: [0, -40, 0], aR: [-96, 0, -60], aL: [-100, 40, -10], lR: [10, 0, -4], lL: [-18, 0, 6], h: 0.95, blade: [-0.75, 0.35, -0.55] },
  { t: 0.37, torso: [4, 60, 0], neck: [0, -42, 0], aR: [-98, 0, -62], aL: [-102, 42, -10], blade: [-0.8, 0.3, -0.5] },
  { t: 0.47, ease: 'snap', torso: [8, -30, 0], neck: [0, 18, 0], aR: [-92, -10, 30], aL: [-90, -50, -30], lR: [-20, 0, -6], lL: [14, 0, 6], h: 0.92, blade: [0.25, 0.02, 1] },
  { t: 0.8, ease: 'out', torso: [10, -64, 0], neck: [0, 40, 0], aR: [-80, -30, 50], aL: [-76, -60, -40], lR: [-22, 0, -6], lL: [16, 0, 6], h: 0.92, blade: [0.95, -0.05, -0.2] },
  { t: 1.3, ...G },
]);
// the blade raised high overhead, point up (the swordsman's last strike, held)
K.raise = keyed([
  { t: 0, ...G },
  { t: 0.7, ease: 'out', torso: [-10, 0, 0], neck: [-14, 0, 0], aR: [-172, 0, 10], aL: [-168, 0, -10], lR: [-12, 0, 0], lL: [12, 0, 0], h: 0.98, blade: [0, 1, -0.12] },
  { t: 2, torso: [-12, 0, 0], neck: [-14, 0, 0], aR: [-174, 0, 10], aL: [-170, 0, -10], blade: [0, 1, -0.15] },
]);
// thrown backward by a blow (the episode moves the root along the flight)
K.flung = keyed([
  { t: 0, torso: [-10, 0, 0], neck: [-12, 0, 0], aR: [-60, 0, 10], aL: [-56, 0, -10], h: 0.95, blade: [0.2, 0.8, 0.5] },
  { t: 0.12, ease: 'snap', torso: [-34, 0, 4], neck: [-30, 0, 0], aR: [-140, 0, 40], aL: [-130, 0, -50], lR: [-50, 0, -10], lL: [-20, 0, 10], h: 1.0, blade: [-0.6, 0.7, -0.4] },
  { t: 0.6, torso: [-40, 0, 8], neck: [-24, 0, 6], aR: [-160, 0, 60], aL: [-150, 0, -70], lR: [-70, 0, -14], lL: [-40, 0, 14], h: 1.0, blade: [-0.9, 0.2, -0.3] },
  { t: 1.0, torso: [-30, 0, -6], neck: [-10, 0, 0], aR: [-120, 0, 70], aL: [-110, 0, -70], lR: [-40, 0, -14], lL: [-60, 0, 14], h: 1.0, blade: [-0.9, -0.3, 0.2] },
]);
// lying on the back -> up on one knee, the left hand to the brow (the cut) -> standing, the sword lifted again
K.rise = keyed([
  { t: 0, hips: [-88, 0, 0], neck: [10, 0, 0], aR: [-10, 0, 70], aL: [-10, 0, -60], lR: [10, 0, -10], lL: [30, 0, 10], h: 0.18, blade: [-0.9, 0, 0.4] },
  { t: 0.5, hips: [-40, 0, 0], torso: [40, 0, 0], neck: [20, 0, 0], aR: [-30, 0, 30], aL: [30, 0, -20], lR: [-80, 0, -6], lL: [10, 0, 6], h: 0.4, blade: [-0.3, -0.9, 0.3] },
  { t: 1.0, hips: [0, 0, 0], torso: [24, 0, 0], neck: [6, 0, 0], aR: [-40, 0, 10], aL: [-150, 0, 34], lR: [-88, 0, 0], lL: [80, 0, 0], h: 0.55, blade: [0, -0.95, 0.3] },
  { t: 1.5, torso: [8, 0, 0], neck: [-6, 12, 0], aR: [-36, 0, 10], aL: [-160, 0, 40], lR: [-30, 0, 0], lL: [20, 0, 0], h: 0.9, blade: [0, -0.8, 0.6] },
  { t: 2.1, ...G },
]);
// the slash through the air (frozen time): low right to high left, held at the top
K.rift = keyed([
  { t: 0, ...G },
  { t: 0.35, ease: 'out', torso: [14, 50, 0], neck: [6, -34, 0], aR: [-10, 0, -40], aL: [-20, 40, -10], lR: [12, 0, -6], lL: [-22, 0, 6], h: 0.93, blade: [-0.6, -0.6, -0.45] },
  { t: 0.45, torso: [16, 52, 0], neck: [6, -36, 0], aR: [-8, 0, -42], aL: [-18, 42, -10], blade: [-0.62, -0.6, -0.4] },
  { t: 0.62, ease: 'snap', torso: [-12, -40, 0], neck: [-10, 26, 0], aR: [-170, -20, 40], aL: [-150, -40, -20], lR: [-20, 0, -6], lL: [16, 0, 6], h: 0.97, blade: [0.6, 0.75, 0.3] },
  { t: 1.4, torso: [-14, -44, 0], neck: [-10, 28, 0], aR: [-172, -22, 42], aL: [-152, -42, -20], blade: [0.62, 0.74, 0.25] },
]);
// Episode 32's extra sword clips (the swordsman's chop, rising with the blade low, the leap and landing, a crouch, the blade lowered)
// the swordsman's chop: overhead, the blade comes down level onto a high block (contact 0.55) and is pushed back
K.chop = keyed([
  { t: 0, ...G, torso: [4, 8, 0], neck: [0, -8, 0], aR: [-80, 0, 6], aL: [-76, 0, -6], blade: [0, 0.8, 0.6] },
  { t: 0.36, ease: 'out', torso: [-20, 12, 0], neck: [-12, -8, 0], aR: [-192, 0, 12], aL: [-188, 0, -12], lR: [-8, 0, 0], lL: [18, 0, 0], h: 1.0, blade: [0, 0.3, -1] },
  { t: 0.44, torso: [-22, 12, 0], neck: [-12, -8, 0], aR: [-196, 0, 12], aL: [-192, 0, -12], blade: [0, 0.2, -1] },
  { t: 0.55, ease: 'snap', torso: [24, 0, 0], neck: [6, 0, 0], aR: [-122, 0, 6], aL: [-118, 0, -6], lR: [-28, 0, 0], lL: [24, 0, 0], h: 0.9, blade: [0, -0.12, 1] },
  { t: 0.72, ease: 'out', torso: [14, 0, 0], neck: [2, 0, 0], aR: [-134, 0, 6], aL: [-130, 0, -6], h: 0.92, blade: [0, 0.25, 0.97] },
  { t: 1.25, ...G, torso: [8, 6, 0], aR: [-80, 0, 6], aL: [-76, 0, -6] },
], { src: 'hand-keyed (Episode 32)' });
// standing with the blade low (rising out of the sea)
K.low = keyed([{ t: 0, torso: [4, 0, 0], neck: [-6, 0, 0], aR: [-18, 0, 8], aL: [-8, 0, -8], lR: [0, 0, 0], lL: [0, 0, 0], h: 1, blade: [0.1, -0.55, 0.83] }, { t: 1, torso: [4, 0, 0], neck: [-6, 0, 0], aR: [-18, 0, 8], aL: [-8, 0, -8], h: 1, blade: [0.1, -0.55, 0.83] }]);
// the leap: knees up, the blade drawn back over the shoulder; then the landing crouch
K.leap = keyed([
  { t: 0, torso: [20, 0, 0], neck: [-10, 0, 0], aR: [-30, 0, 10], aL: [-20, 0, -10], lR: [-40, 0, 0], lL: [20, 0, 0], h: 0.8, blade: [0.1, -0.5, 0.85] },
  { t: 0.2, ease: 'out', torso: [-6, 0, 0], neck: [-8, 0, 0], aR: [-160, 0, 14], aL: [-150, 0, -14], lR: [-70, 0, 0], lL: [-30, 0, 0], h: 1, blade: [0, 0.55, -0.83] },
  { t: 0.6, torso: [10, 0, 0], neck: [-4, 0, 0], aR: [-170, 0, 14], aL: [-160, 0, -14], lR: [-50, 0, 0], lL: [-10, 0, 0], h: 1, blade: [0, 0.4, -0.9] },
]);
K.landing = keyed([
  { t: 0, torso: [30, 0, 0], neck: [-14, 0, 0], aR: [-70, 0, 30], aL: [-40, 0, -50], lR: [-70, 0, -6], lL: [40, 0, 6], h: 0.62, blade: [0.6, -0.35, 0.7] },
  { t: 0.45, ...G },
]);
// Rowan crouched at the slab, looking at the hilt (before he reaches for it)
K.crouch = keyed([{ t: 0, torso: [30, 0, 0], neck: [14, 0, 0], aR: [-30, 0, 6], aL: [-20, 0, -6], lR: [-60, 0, 0], lL: [40, 0, 0], h: 0.72, blade: [0, -1, 0.1] }, { t: 1, torso: [32, 0, 0], neck: [16, 0, 0], aR: [-32, 0, 6], aL: [-20, 0, -6], lR: [-60, 0, 0], lL: [40, 0, 0], h: 0.71, blade: [0, -1, 0.1] }], { loop: true });
// the sword lowered at the side (after the fight)
K.lowered = keyed([{ t: 0, torso: [2, 0, 0], neck: [0, 0, 0], aR: [-14, 0, 10], aL: [-4, 0, -6], h: 1, blade: [0.2, -0.6, 0.78] }, { t: 2, torso: [3, 0, 0], neck: [1, 0, 0], aR: [-15, 0, 10], aL: [-4, 0, -6], h: 0.995, blade: [0.2, -0.6, 0.78] }], { loop: true });
// ---------------- hand-keyed magic clips (Episode 33; reusable: no prop) ----------------
// Each strike or cast has its anticipation, contact (the time in the comment) and follow-through.
const H33 = { src: 'hand-keyed (Episode 33)' };
const ST = { torso: [6, -12, 0], neck: [-4, 10, 0], aR: [-70, 0, -14], aL: [-58, 0, 12], lR: [-12, 0, -6], lL: [12, 0, 6], h: 0.97 };   // a caster's ready stance
K.stance = keyed([{ t: 0, ...ST }, { t: 1.3, ...ST, torso: [8, -14, 0], aR: [-74, 0, -14], h: 0.962 }, { t: 2.6, ...ST }], { loop: true, ...H33 });
// one arm up to the sky, then snapped down to point at the ground ahead (the strike lands at 0.75)
K.pointUp = keyed([
  { t: 0, torso: [0, 0, 0], neck: [0, 0, 0], aR: [-10, 0, 4], aL: [-6, 0, -4], h: 1 },
  { t: 0.42, ease: 'out', torso: [-6, 0, 0], neck: [-16, 0, 0], aR: [-176, 0, 6], aL: [-12, 0, -8] },
  { t: 0.62, torso: [-7, 0, 0], neck: [-18, 0, 0], aR: [-178, 0, 6] },
  { t: 0.75, ease: 'snap', torso: [10, 0, 0], neck: [12, 0, 0], aR: [-58, 0, 2], aL: [-14, 0, -10], h: 0.98 },
  { t: 1.4, torso: [8, 0, 0], neck: [10, 0, 0], aR: [-54, 0, 2], aL: [-12, 0, -8] },
], H33);
// a jump backward: dip, push off (0.15), tuck in the air, land (0.55) in a crouch, rise into the stance
K.jumpBack = keyed([
  { t: 0, ...ST },
  { t: 0.15, ease: 'out', torso: [22, 0, 0], neck: [-14, 0, 0], aR: [-30, 0, -20], aL: [-30, 0, 20], lR: [-30, 0, -4], lL: [24, 0, 4], h: 0.84 },
  { t: 0.32, ease: 'out', torso: [-8, 0, 0], neck: [-6, 0, 0], aR: [-110, 0, -40], aL: [-110, 0, 40], lR: [-55, 0, -6], lL: [-30, 0, 6], h: 1 },
  { t: 0.55, ease: 'in', torso: [26, 0, 0], neck: [-18, 0, 0], aR: [-60, 0, -50], aL: [-60, 0, 50], lR: [-42, 0, -10], lL: [30, 0, 10], h: 0.78 },
  { t: 0.95, ...ST },
], H33);
// both hands sweep from low behind to high in front: the wall of fire rises at 0.7
K.summon = keyed([
  { t: 0, ...ST },
  { t: 0.35, ease: 'out', torso: [26, 0, 0], neck: [-10, 0, 0], aR: [24, 0, -26], aL: [24, 0, 26], lR: [-26, 0, -8], lL: [20, 0, 8], h: 0.86 },
  { t: 0.7, ease: 'snap', torso: [-8, 0, 0], neck: [-12, 0, 0], aR: [-128, 0, -32], aL: [-128, 0, 32], lR: [-14, 0, -8], lL: [12, 0, 8], h: 1 },
  { t: 1.4, torso: [-4, 0, 0], neck: [-6, 0, 0], aR: [-112, 0, -28], aL: [-112, 0, 28], h: 0.99 },
], H33);
// an energy blast from the right hand: drawn back to the hip (0.18), thrown at full reach (release 0.28), follow-through, back to the stance
K.throwR = keyed([
  { t: 0, ...ST },
  { t: 0.18, ease: 'out', torso: [4, 32, 0], neck: [-4, -24, 0], aR: [34, 0, -18], aL: [-80, 0, 18], lR: [-6, 0, -6], lL: [16, 0, 6], h: 0.95 },
  { t: 0.28, ease: 'snap', torso: [14, -30, 0], neck: [-6, 22, 0], aR: [-94, -10, 6], aL: [-20, 0, 14], lR: [-30, 0, -6], lL: [22, 0, 6], h: 0.93, p: [0, 0.16] },
  { t: 0.45, ease: 'out', torso: [16, -36, 0], neck: [-6, 26, 0], aR: [-88, -16, 10], aL: [-14, 0, 14], h: 0.93, p: [0, 0.18] },
  { t: 0.75, ...ST, p: [0, 0] },
], H33);
K.throwL = keyed([
  { t: 0, ...ST },
  { t: 0.18, ease: 'out', torso: [4, -32, 0], neck: [-4, 24, 0], aL: [34, 0, 18], aR: [-80, 0, -18], lR: [-16, 0, -6], lL: [8, 0, 6], h: 0.95 },
  { t: 0.28, ease: 'snap', torso: [14, 30, 0], neck: [-6, -22, 0], aL: [-94, 10, -6], aR: [-20, 0, -14], lR: [-28, 0, -6], lL: [24, 0, 6], h: 0.93, p: [0, 0.16] },
  { t: 0.45, ease: 'out', torso: [16, 36, 0], neck: [-6, -26, 0], aL: [-88, 16, -10], aR: [-14, 0, -14], h: 0.93, p: [0, 0.18] },
  { t: 0.75, ...ST, p: [0, 0] },
], H33);
// the left palm raised flat toward the attacker (the episode adds a small push back and forward at each hit)
K.palmBlock = keyed([
  { t: 0, torso: [0, 0, 0], neck: [0, 0, 0], aR: [-10, 0, 4], aL: [-8, 0, -4], h: 1 },
  { t: 0.22, ease: 'out', torso: [-4, 8, 0], neck: [-2, -6, 0], aL: [-96, 0, 8], aR: [-12, 0, 6], h: 1 },
  { t: 2, torso: [-4, 8, 0], neck: [-2, -6, 0], aL: [-97, 0, 8], aR: [-12, 0, 6], h: 1 },
], H33);
// a straight-leg push kick: chamber (0.16), contact (0.3) with the hips driven in, held a beat, retracted
K.pushKick = keyed([
  { t: 0, torso: [4, 0, 0], neck: [-4, 0, 0], aR: [-30, 0, -20], aL: [-30, 0, 20], lR: [-10, 0, 0], lL: [10, 0, 0], h: 0.98 },
  { t: 0.16, ease: 'out', torso: [-6, 0, 0], neck: [6, 0, 0], aR: [-40, 0, -50], aL: [-60, 0, 40], lR: [-55, 0, 0], lL: [8, 0, 0], h: 0.97 },
  { t: 0.3, ease: 'snap', torso: [-26, 0, 0], neck: [18, 0, 0], aR: [-20, 0, -70], aL: [-50, 0, 60], lR: [-92, 0, 0], lL: [6, 0, 0], h: 1, p: [0, 0.32] },
  { t: 0.44, torso: [-24, 0, 0], neck: [16, 0, 0], aR: [-22, 0, -66], aL: [-50, 0, 56], lR: [-86, 0, 0], lL: [6, 0, 0], h: 1, p: [0, 0.34] },
  { t: 0.8, ease: 'io', torso: [4, 0, 0], neck: [-2, 0, 0], aR: [-14, 0, 8], aL: [-12, 0, -8], lR: [0, 0, 0], lL: [0, 0, 0], h: 1, p: [0, 0.2] },
], H33);
// thrown backward off the feet by a blow to the chest (the episode moves the root along the flight)
K.hitFly = keyed([
  { t: 0, torso: [8, 0, 0], neck: [-4, 0, 0], aR: [-70, 0, -14], aL: [-58, 0, 12], h: 0.97 },
  { t: 0.06, ease: 'snap', torso: [38, 0, 0], neck: [30, 0, 0], aR: [-80, 0, -30], aL: [-80, 0, 30], lR: [-40, 0, -6], lL: [-30, 0, 6], h: 1 },
  { t: 0.5, torso: [30, 0, 0], neck: [16, 0, 0], aR: [-120, 0, -50], aL: [-115, 0, 55], lR: [-60, 0, -10], lL: [-45, 0, 10], h: 1 },
], H33);
// skidding on her back, half sitting up, both hands braced on the floor behind her, the heels digging in
K.skid = keyed([
  { t: 0, hips: [-62, 0, 0], torso: [36, 0, 0], neck: [24, 0, 0], aR: [54, 0, -32], aL: [54, 0, 32], lR: [-34, 0, -8], lL: [-46, 0, 8], h: 0.34 },
  { t: 0.5, hips: [-60, 0, 0], torso: [40, 0, 0], neck: [26, 0, 0], aR: [52, 0, -30], aL: [52, 0, 30], lR: [-30, 0, -8], lL: [-40, 0, 8], h: 0.34 },
], H33);
// from the skid: roll onto a knee, a hand pushing on the knee, up with a slump, into the stance
K.struggleUp = keyed([
  { t: 0, hips: [-60, 0, 0], torso: [40, 0, 0], neck: [26, 0, 0], aR: [52, 0, -30], aL: [52, 0, 30], lR: [-30, 0, -8], lL: [-40, 0, 8], h: 0.34 },
  { t: 0.45, hips: [-10, 0, 0], torso: [40, 0, 0], neck: [10, 0, 0], aR: [-30, 0, -20], aL: [-40, 0, 20], lR: [-86, 0, -4], lL: [72, 0, 4], h: 0.5 },
  { t: 0.85, hips: [0, 0, 0], torso: [46, 0, 0], neck: [-8, 0, 0], aR: [-62, 0, -6], aL: [-14, 0, 22], lR: [-80, 0, -4], lL: [70, 0, 4], h: 0.56 },
  { t: 1.35, ease: 'io', hips: [0, 0, 0], torso: [20, 0, 4], neck: [-10, 0, 0], aR: [-40, 0, -6], aL: [-16, 0, 14], lR: [-20, 0, -6], lL: [16, 0, 6], h: 0.9 },
  { t: 1.75, hips: [0, 0, 0], torso: [12, -6, 4], neck: [-6, 6, 0], aR: [-30, 0, -10], aL: [-20, 0, 12], lR: [-10, 0, -6], lL: [10, 0, 6], h: 0.95 },
], H33);
// both hands raised high and open (lifting the arena)
K.raiseBoth = keyed([
  { t: 0, torso: [0, 0, 0], neck: [0, 0, 0], aR: [-12, 0, 6], aL: [-12, 0, -6], h: 1 },
  { t: 0.9, ease: 'out', torso: [-10, 0, 0], neck: [-18, 0, 0], aR: [-158, 0, -24], aL: [-158, 0, 24], h: 1 },
  { t: 3, torso: [-12, 0, 0], neck: [-20, 0, 0], aR: [-162, 0, -26], aL: [-162, 0, 26], h: 1 },
], H33);
// eyes closed, arms a little out from the sides, palms down: gathering
K.gather = keyed([
  { t: 0, ...ST },
  { t: 0.8, ease: 'io', torso: [-2, 0, 0], neck: [8, 0, 0], aR: [-14, 0, -34], aL: [-14, 0, 34], lR: [-8, 0, -6], lL: [8, 0, 6], h: 1 },
  { t: 3, torso: [-4, 0, 0], neck: [6, 0, 0], aR: [-18, 0, -42], aL: [-18, 0, 42], lR: [-8, 0, -6], lL: [8, 0, 6], h: 1.01 },
], H33);
// both arms thrust forward (fire): the push lands at 0.18
K.thrust = keyed([
  { t: 0, torso: [-4, 0, 0], neck: [6, 0, 0], aR: [-18, 0, -42], aL: [-18, 0, 42], h: 1 },
  { t: 0.1, ease: 'out', torso: [-8, 0, 0], neck: [0, 0, 0], aR: [12, 0, -20], aL: [12, 0, 20], lR: [-10, 0, -6], lL: [16, 0, 6], h: 0.96 },
  { t: 0.18, ease: 'snap', torso: [14, 0, 0], neck: [-8, 0, 0], aR: [-88, 0, 8], aL: [-88, 0, -8], lR: [-28, 0, -6], lL: [22, 0, 6], h: 0.93, p: [0, 0.12] },
  { t: 0.8, torso: [16, 0, 0], neck: [-8, 0, 0], aR: [-86, 0, 6], aL: [-86, 0, -6], lR: [-28, 0, -6], lL: [22, 0, 6], h: 0.93, p: [0, 0.12] },
], H33);
// hands spread, fingers to the target (lightning): arcs from both hands
K.spread = keyed([
  { t: 0, torso: [16, 0, 0], neck: [-8, 0, 0], aR: [-86, 0, 6], aL: [-86, 0, -6], lR: [-28, 0, -6], lL: [22, 0, 6], h: 0.93, p: [0, 0.12] },
  { t: 0.12, ease: 'snap', torso: [6, 0, 0], neck: [-10, 0, 0], aR: [-104, 0, -22], aL: [-104, 0, 22], lR: [-24, 0, -6], lL: [20, 0, 6], h: 0.95, p: [0, 0.1] },
  { t: 0.7, torso: [6, 0, 0], neck: [-10, 0, 0], aR: [-106, 0, -24], aL: [-106, 0, 24], lR: [-24, 0, -6], lL: [20, 0, 6], h: 0.95, p: [0, 0.1] },
], H33);
// the shockwave: arms crossed over the chest in a crouch, then flung wide and back with the chest out (release 0.4)
K.release = keyed([
  { t: 0, torso: [6, 0, 0], neck: [-10, 0, 0], aR: [-104, 0, -24], aL: [-104, 0, 24], h: 0.95, p: [0, 0.1] },
  { t: 0.3, ease: 'out', torso: [30, 0, 0], neck: [16, 0, 0], aR: [-80, 0, 52], aL: [-80, 0, -52], lR: [-34, 0, -10], lL: [30, 0, 10], h: 0.8, p: [0, 0.05] },
  { t: 0.4, ease: 'snap', torso: [-16, 0, 0], neck: [-22, 0, 0], aR: [-84, 0, -84], aL: [-84, 0, 84], lR: [-14, 0, -14], lL: [12, 0, 14], h: 1.02, p: [0, 0] },
  { t: 1.2, torso: [-14, 0, 0], neck: [-18, 0, 0], aR: [-80, 0, -80], aL: [-80, 0, 80], lR: [-12, 0, -14], lL: [10, 0, 14], h: 1.0 },
  { t: 2.2, ease: 'io', torso: [8, 0, 0], neck: [6, 0, 0], aR: [-20, 0, -14], aL: [-18, 0, 14], lR: [-8, 0, -6], lL: [8, 0, 6], h: 0.97 },
], H33);
// both forearms crossed before the face (a two-hand shield, bracing against a blast)
K.braceBoth = keyed([
  { t: 0, torso: [6, 0, 0], neck: [6, 0, 0], aR: [-98, 0, 18], aL: [-98, 0, -18], lR: [-20, 0, -6], lL: [18, 0, 6], h: 0.95 },
  { t: 2, torso: [8, 0, 0], neck: [6, 0, 0], aR: [-100, 0, 18], aL: [-100, 0, -18], lR: [-20, 0, -6], lL: [18, 0, 6], h: 0.94 },
], H33);
// a small child, frightened: hands up near the chest, hunched, knees soft
K.cower = keyed([
  { t: 0, torso: [14, 0, 0], neck: [10, 0, 0], aR: [-62, 0, 26], aL: [-62, 0, -26], lR: [-8, 0, -2], lL: [8, 0, 2], h: 0.96 },
  { t: 1.5, torso: [16, 0, 0], neck: [12, 0, 0], aR: [-66, 0, 28], aL: [-64, 0, -28], lR: [-8, 0, -2], lL: [8, 0, 2], h: 0.955 },
  { t: 3, torso: [14, 0, 0], neck: [10, 0, 0], aR: [-62, 0, 26], aL: [-62, 0, -26], lR: [-8, 0, -2], lL: [8, 0, 2], h: 0.96 },
], { loop: true, ...H33 });
export const KEYED_CLIPS = K;
export const KEYED = K;
export { PARTS };
