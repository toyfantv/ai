// Flower Man remake 3: The Hotel of Every Year. In Juniper Falls every door of the Almanac Hotel opens onto a different year, and you get
// one stay in your life, so people save it till they're gray. Mom never laughed; she only smiled about one friend, Poppy, who vanished
// the summer they were twelve. On her twelfth birthday Poppy (named after her) puts on her yellow raincoat and asks for 1994. The old
// bellhop: "One summer. When the bell rings, come home. Never say who you are." Behind the door a girl hangs from an oak, tangled in her
// kite: Mom, at twelve ("Help! I'm Dot!" "Uh... Poppy."). Kites, a raft, Dot laughing till she hiccups; then it hits her: Mom's lost
// friend was her. The last evening the bell on the way-back door rings; Dot ties a DOT bracelet on her wrist ("Will I see you again?"
// "Every single day."). At home Mom sits on the porch holding a bracelet that spells POPPY; she sees the raincoat, then the DOT bracelet,
// and laughs, hiccups and all. "It was you?" "Told you. Every single day."
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, frame, expose, P, DAY } from '../engine/stage.js';
import { shotAt } from '../engine/stage.js';
import { jointify } from '../engine/infinitetower.js';
import { FARM } from '../engine/farm_cast.js';
import { paint } from '../engine/kit.js';
import { almanacStreet, lobby, meadow, porchHome, kite, brassKey, bracelet, wearBracelet, wearRaincoat, wearBadge, shoebox, CORR, POND, OAK, EXITD } from '../engine/hotelyears.js';

const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV, CAP = [];
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const LINEUP = Q.get('lineup') ? Q.get('lineup').split(',') : null;
// [avatar, scale, head scale]
const AV = {
  poppy: ['farm_ep33_girl', 0.78], dot: ['farm_charlotte', 0.74, 1.12], mom: ['farm_charlotte', 1], bell: ['farm_elevator_operator', 1],
  g1: ['farm_grandma', 1], g2: ['farm_grandpa', 1], g3: ['farm_old_man', 1], g4: ['farm_grandma_june', 1],
};
for (const k of Object.keys(AV)) if (Q.get(k)) AV[k][0] = Q.get(k);
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';

const LB = v3(800, 0, 0), MW = v3(-800, 0, 0), HM = v3(0, 0, 800), LU = v3(0, 0, -1600);   // lobby, the 1994 meadow, home, lineup
const at = (o, x, y, z) => o.clone().add(v3(x, y, z));

const SUNNY = { ...DAY, ...P({ top: '#2f93ee', horizon: '#d2efff', haze: '#d8f0ff', sunColor: '#fff3dc', hemiSky: '#d6edff', hemiGround: '#d4dfa4' }), sunDir: v3(0.35, 0.8, 0.5), sunI: 2.2, sunDisc: 0, hemiI: 1.12, amb: 0.3, envI: 1.0, exposure: 1.0, bloom: 0.03, vig: 0, saturation: 1.2, contrast: 1.05, bounce: 0.18, fogNear: 300, fogFar: 1100, stars: 0, moon: 0, win: 0, lamp: 0 };
const SUMMER = { ...SUNNY, ...P({ top: '#3a9cf0', horizon: '#e8f6ff', haze: '#eef8ff', sunColor: '#fff0c8', hemiSky: '#e0f0ff', hemiGround: '#cfe0a0' }), sunDir: v3(0.45, 0.75, 0.55), sunI: 2.3, saturation: 1.22, fogNear: 260, fogFar: 1000 };
const ROOM = { ...SUNNY, ...P({ top: '#ffe2b8', horizon: '#ffe2b8', haze: '#ffe2b8', sunColor: '#ffe0b0', hemiSky: '#fff0d8', hemiGround: '#c89a6a' }), sunDir: v3(0.3, 0.9, 0.3), sunI: 0.35, hemiI: 1.15, amb: 0.42, envI: 0.7, saturation: 1.12, exposure: 1.02, fogNear: 400, fogFar: 1200 };
const SEPIA = { ...SUMMER, ...P({ top: '#c9a873', horizon: '#f0dcb4', haze: '#ead4ac', sunColor: '#ffe0b0', hemiSky: '#f4dfb8', hemiGround: '#b89a6a' }), sunI: 2.0, hemiI: 1.15, saturation: 0.35, contrast: 1.08, exposure: 1.03 };
const EVE = { ...SUNNY, ...P({ top: '#4f6fc8', horizon: '#ffb987', haze: '#ffc8a0', sunColor: '#ffbf80', hemiSky: '#c8c8ff', hemiGround: '#c89a70' }), sunDir: v3(0.85, 0.32, 0.4), sunI: 2.0, hemiI: 1.05, amb: 0.32, exposure: 1.04, saturation: 1.18, fogNear: 200, fogFar: 900 };
const PORCHEVE = { ...EVE, ...P({ top: '#3e5cb0', horizon: '#ffad80', haze: '#f4b896', sunColor: '#ffb070', hemiSky: '#c0c4ff', hemiGround: '#c49470' }), sunDir: v3(-0.6, 0.35, 0.7), sunI: 1.9, exposure: 1.05 };

const capT = (word, after = 0) => { const c = CAP.find((x) => x.start >= after - 0.01 && x.text.toUpperCase().replace(/[“”"]/g, '').includes(word)); return c ? c.start : after; };
function events() {
  const s = (i) => L(i).start;
  return {
    every: capT('EVERY DOOR', s(0)), diff: capT('DIFFERENT YEAR', s(0)), stay: s(1), save: capT('SO PEOPLE', s(1)), gray: capT("GRAY", s(1)),
    never: s(2), smiled: capT('SHE ONLY SMILED', s(2)), poppy: s(3), summer: capT('SUMMER THEY', s(3)),
    bday: s(4), wore: capT('POPPY WORE', s(4)), asked: capT('RAINCOAT AND ASKED', s(4)), bell: s(5), rings: capT('WHEN THE BELL', s(5)), home: capT('COME HOME', s(5)), sayw: capT('NEVER SAY', s(5)),
    behind: s(6), hung: capT('A GIRL HUNG', s(6)), tangled: capT('TANGLED', s(6)), mom12: s(7), help: s(8), uh: s(9),
    kites: s(10), raft: capT('BUILT A RAFT', s(10)), laughed: capT('AND DOT LAUGHED', s(10)), hic: capT('SHE HICCUPED', s(10)),
    hit: s(11), lost: capT("MOM'S LOST", s(11)), last: s(12), rang: capT('THE BELL RANG', s(12)), tied: capT('DOT TIED', s(12)), wrist: capT('ON HER WRIST', s(12)),
    again: s(13), every2: s(14), athome: s(15), holding: capT('PORCH HOLDING', s(15)), spelled: capT('THAT SPELLED', s(15)),
    saw: s(16), dotbr: capT('THEN THE DOT', s(16)), laugh: s(17), hiccups: capT('HICCUPS AND', s(17)), wasyou: s(18), told: s(19), end: ctx.dur,
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
const fwd = (c, d = 1) => v3(Math.sin(c.root.rotation.y), 0, Math.cos(c.root.rotation.y)).multiplyScalar(d);
const side = (c, d = 1) => { const f = fwd(c); return v3(f.z, 0, -f.x).multiplyScalar(d); };   // the character's left
const chestOf = (c) => H(c).add(v3(0, -1.55 * SC(c), 0)).add(fwd(c, 0.85 * SC(c)));
const sz = (k) => AV[k][1];
// hiccups: short upward jolts at the given times
const hicK = (t, times) => times.reduce((s, h) => s + (t > h ? Math.exp(-(t - h) * 14) * (t - h < 0.3 ? 1 : 0) : 0), 0);
function hiccup(c, t, times) { const k = hicK(t, times); c.root.position.y += k * 0.22 * SC(c); c.torso.rotation.x -= k * 0.12; c.neck.rotation.x -= k * 0.15; }
function sitOn(c, p, yaw, size, seatY) {   // sit with the hips on a seat at seatY
  place(c, p, yaw, size); pose(c, 'sit', 0); c.root.updateMatrixWorld(true);
  const hy = c.hips.getWorldPosition(v3()).y; c.root.position.y += seatY + 0.55 * SC(c) - hy;
}

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
  W.coat = wearRaincoat(W.poppy); W.badge = wearBadge(W.poppy, '12');
  W.brDot = wearBracelet(W.poppy, 0, 'DOT');            // on Poppy's left wrist once Dot ties it
  W.brPop = wearBracelet(W.dot, 1, 'POPPY', { cols: ['#3fb7e8', '#ffd23f', '#ff5a8a', '#7ad06a'] });   // Dot wears the one with her friend's name
  // Mom's old bracelet in her hand
  W.momBr = bracelet('POPPY', ['#b8a090', '#c9b48a', '#a89880', '#c0a8a0'], 0.36); ctx.scene.add(W.momBr);
  // the kite string looped round Dot
  W.loop = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 5, 28), paint('#f4efe4', { roughness: 0.8 })); W.loop.userData.worn = true; W.dot.torso.add(W.loop);
  { const tb = (() => { W.dot.root.updateMatrixWorld(true); const b = new THREE.Box3(); W.dot.torso.children.forEach((m) => { if (m.isMesh) b.expandByObject(m); }); return b; })(); void tb; }
  W.loop.scale.set(1.05, 1.0, 0.75); W.loop.rotation.x = Math.PI / 2 + 0.25; W.loop.position.set(0, 0.6, 0);
}
function hideAll() { W.all.forEach((c) => { c.root.visible = false; }); }
function coat(on) { W.coat.visible = on; W.coat.traverse(() => {}); W.poppy.arms.forEach((a) => a.traverse((o) => { if (o.userData.worn && o !== W.brDot && !isUnder(o, W.brDot)) o.visible = on; })); (W.poppy.elbow || []).forEach((j) => j.traverse((o) => { if (o.userData.worn && !isUnder(o, W.brDot)) o.visible = on; })); }
const isUnder = (o, g) => { for (let q = o; q; q = q.parent) if (q === g) return true; return false; };
function showBr(g, k) { g.visible = k > 0.01; g.scale.setScalar(Math.max(0.01, k)); }

// ================= the street (opening) =================
function poseStreet(t) {
  const A = v3(-26, 0, 9.5), B = v3(-1.5, 0, 9.0);
  walkTo(W.g3, A, B, -0.5, 6, t, 0.8, 'walk', sz('g3')); face(W.g3, 'happy', t, 0.3);
  walkTo(W.g1, at(A, -2.6, 0, 1.4), at(B, -2.4, 0, 1.6), -0.5, 6, t, 0.8, 'walk', sz('g1')); face(W.g1, 'happy', t, 0.6);
  lookAtP(W.g1, H(W.g3), 0.5); lookAtP(W.g3, v3(0, 12, 0), 0.4);
}
// ================= the lobby and corridor =================
const DESK = () => at(LB, -13, 0, -8);
const BELLP = () => at(LB, -13, 0, -10.6);
function poseCorr(t) {
  // doors along the corridor crack open one after another
  W.lob.doors.forEach((d, i) => { const k = smooth(EV.every + 0.2 + i * 0.25, EV.every + 1.2 + i * 0.25, t) * 0.32; d.door.open(d.year === 1994 ? k * 0.2 : k); d.door.glow(0.3 + k * 1.5); });
}
function poseQueue(t) {   // L1: the gray-haired guests wait on the bench; one checks in at the desk
  const L1 = W.lob.bench, seatY = 2.8;
  [['g1', -6.6], ['g2', -2.4], ['g4', 1.8]].forEach(([k, z], i) => { sitOn(W[k], at(LB, L1.x, 0, z), -Math.PI / 2, sz(k), seatY); face(W[k], i === 1 ? 'sleepy' : 'happy', t, 0.3 + i * 0.4); lookAtP(W[k], at(LB, -8, 6, -6), 0.5); });
  const g3 = W.g3; place(g3, at(DESK(), 4.6, 0, 3.8), Math.PI - 0.5, sz('g3')); pose(g3, 'idle', t); face(g3, 'happy', t, 0.5); lookAtP(g3, H(W.bell), 0.7);
  poseBell(t, { stamp: true, look: H(g3) });
  // the guests on the bench nod off; one checks his watch
  W.g2.neck.rotation.x += 0.25 * Math.sin(t * 0.8) ** 2;
}
function poseBell(t, o = {}) {
  const b = W.bell; place(b, BELLP(), 0, sz('bell')); pose(b, 'idle', t);
  if (o.stamp) { const ph = (t * 1.6) % 1, up = Math.max(0, Math.sin(ph * Math.PI)); aimArm(b, 1, at(DESK(), -1.6, 3.8 + up * 1.2, 0.4), 1); }
  face(b, o.face || 'neutral', t, 0.4, { viseme: o.viseme }); if (o.look) lookAtP(b, o.look, 0.7);
}
function poseDesk(t) {   // L4-5: Poppy at the desk; the bell; the key
  const E = EV, p = W.poppy;
  const A = at(LB, 2, 0, 14), B = at(LB, -6.6, 0, -4.7);
  const u = walkTo(p, A, B, E.bday - 0.3, E.wore + 1.2, t, 1.1, 'walk', sz('poppy'));
  if (u >= 1) { place(p, B, yawTo(B, at(LB, -3.8, 0, -12.4)) - 0.35, sz('poppy')); pose(p, 'idle', t); }
  const ding = E.asked + 0.9;   // she slaps the bell
  const bellP = W.lob.deskBell.getWorldPosition(v3()).add(v3(0, 0.75, 0));
  if (u >= 1 && t > ding - 0.5 && t < ding + 0.4) aimArm(p, 1, bellP.clone().add(v3(0, 0.6 * (1 - smooth(ding - 0.3, ding, t)), 0)), smooth(ding - 0.5, ding - 0.3, t) * (1 - smooth(ding + 0.2, ding + 0.4, t)));
  // the key: the bellhop holds it out on "one summer", she takes it on "come home"
  const bk = W.bell, give = smooth(E.bell - 0.2, E.bell + 0.4, t), take = t > E.home;
  poseBell(t, { face: t > E.sayw ? 'focused' : t > E.bell ? 'happy' : 'neutral', viseme: talk(5, t), look: H(p) });
  if (t > E.bell - 0.4) {
    const kp = lp3(at(DESK(), 4.4, 4.2, 0.2), at(DESK(), 5.2, 4.5, 1.8), give);
    if (!take) { aimArm(bk, 1, kp, give); W.key.position.copy(handOf(bk, 1)).add(v3(0, 0.2, 0.2)); }
    else { aimArm(p, 0, chestOf(p).add(fwd(p, 0.8)).add(side(p, 0.3)).add(v3(0, 0.1, 0)), 1); W.key.position.copy(handOf(p, 0)).add(v3(0, 0.3, 0.15)); }
    W.key.visible = true; W.key.rotation.set(0, 0, 0.15); W.key.scale.setScalar(0.9);
    // a raised finger on "never say who you are"
    if (t > E.sayw) aimArm(bk, 0, H(bk).add(fwd(bk, 1.4)).add(side(bk, 0.8)).add(v3(0, 0.4, 0)), smooth(E.sayw, E.sayw + 0.3, t));
  }
  face(p, t > E.sayw ? 'nervous' : t > E.bell ? 'surprised' : t > E.asked ? 'grin' : 'happy', t, 0.3);
  if (u >= 1) lookAtP(p, H(bk), 0.8); else lookAtP(p, at(LB, -13, 6, -10), 0.4);
  // bench guests in the background
  [['g1', -6.6], ['g4', 1.8]].forEach(([k, z], i) => { sitOn(W[k], at(LB, W.lob.bench.x, 0, z), -Math.PI / 2, sz(k), 2.8); face(W[k], 'happy', t, 0.3 + i); lookAtP(W[k], H(p), 0.6); });
}
const D94 = () => W.lob.doors.find((d) => d.year === 1994);
function poseDoor(t) {   // L6a: she turns the key; the door swings open on 1994's summer light
  const E = EV, p = W.poppy, d = D94(); poseCorr(t);
  const P0 = at(LB, -2.8, 0, -47.0), yaw = -Math.PI / 2 - 0.15;
  place(p, P0, yaw, sz('poppy')); pose(p, 'idle', t);
  const kh = at(LB, -5.6, 4.0, -46.3); const op = smooth(E.behind + 0.35, E.behind + 1.1, t);
  aimArm(p, 0, kh, 1 - smooth(E.behind + 0.5, E.behind + 0.8, t)); W.key.visible = t < E.behind + 0.6; W.key.position.copy(handOf(p, 0)); W.key.rotation.set(0, Math.PI / 2, (t - E.behind) * 3);
  d.door.open(op); d.door.glow(0.4 + op * 1.6);
  face(p, op > 0.4 ? 'surprised' : 'focused', t, 0.4); lookAtP(p, at(LB, -7, 4.6, -48), 0.6);
  W.lamp94.intensity = 30 + op * 260;
}
// ================= 1994: the meadow =================
const BRANCH = (u) => W.mead.branch[0].clone().lerp(W.mead.branch[1], u).add(MW);
function hang(c, gripU, t, kick = 1) {   // hang by both hands from the oak's branch
  const g = BRANCH(gripU); place(c, v3(g.x, 0, g.z + 0.15), 0.25, sz('dot')); pose(c, 'idle', t);
  for (let it = 0; it < 2; it++) { aimArm(c, 0, g.clone().add(side(c, 0.45)), 1); aimArm(c, 1, g.clone().add(side(c, -0.45)), 1); const hy = (handOf(c, 0).y + handOf(c, 1).y) / 2; c.root.position.y += g.y - 0.15 - hy; }
  c.legs[0].rotation.x = Math.sin(t * 3.1) * 0.35 * kick; c.legs[1].rotation.x = -Math.sin(t * 3.1 + 0.6) * 0.3 * kick; c.root.rotation.z = Math.sin(t * 1.6) * 0.04;
}
function kiteInTree(on) {
  W.k1.visible = on; if (!on) { W.str.visible = false; return; }
  const tip = W.mead.branch[1].clone().add(MW); W.k1.position.copy(tip).add(v3(-0.6, 0.9, 0.6)); W.k1.rotation.set(0.2, 0.3, 0.9);
}
function stringTo(a, b) { const m = W.str; m.visible = true; const d = b.clone().sub(a), len = d.length(); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(1, len, 1); m.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize()); }
function poseOak(t) {   // L6b-L9: Dot hangs from the oak, tangled; Poppy comes from the door and stands under her
  const E = EV, d = W.dot, p = W.poppy; W.loop.visible = true;
  hang(d, 0.62, t, t > E.help ? 1.6 : 1);
  kiteInTree(true); if (t < E.uh - 0.1) stringTo(W.k1.position.clone().add(v3(0, -0.6, 0)), handOf(d, 1));
  face(d, t > E.uh ? 'grin' : t > E.help ? 'happy' : t > E.mom12 ? 'nervous' : 'focused', t, 0.4, { viseme: talk(8, t) });
  // Poppy: out of the door, across the grass, under the branch looking up
  const A = at(MW, EXITD.x + 1.2, 0, EXITD.z - 1.0), B = BRANCH(0.62).setY(0).add(v3(-2.0, 0, 3.6)); W.mead.raft.position.set(POND.x + 2, 0.1, POND.z + 10);
  const u = walkTo(p, A, B, E.behind + 1.2, E.tangled + 1.0, t, 1.0, 'walk', sz('poppy'));
  if (u >= 1) { place(p, B, yawTo(B, BRANCH(0.62)) + 0.1, sz('poppy')); pose(p, 'idle', t); }
  face(p, t > E.uh ? 'nervous' : t > E.mom12 ? 'shocked' : 'surprised', t, 0.3, { viseme: talk(9, t) });
  lookAtP(p, H(d), 0.9); lookAtP(d, H(p), t > E.help - 0.3 ? 0.7 : 0.3);
  W.mead.exit.open(1 - smooth(E.behind + 1.6, E.behind + 2.4, t)); W.mead.exit.glow(1 - smooth(E.behind + 1.6, E.behind + 2.4, t));
}
const RAFTP = () => at(MW, POND.x - 3.5, 0, POND.z + 5.0);
function poseFun(t, name) {   // L10: kites; the raft; Dot laughing till she hiccups
  const E = EV, d = W.dot, p = W.poppy; W.loop.visible = false; kiteInTree(false);
  const hics = [E.hic + 0.15, E.hic + 0.75, E.hic + 1.35];
  if (name === 'kites') {   // running toward the camera, two kites high behind them
    const z0 = 4 + (t - E.kites) * 4.5; [[d, -2.6, 'dot'], [p, 2.2, 'poppy']].forEach(([c, x, k], i) => { place(c, at(MW, -26 + x, 0, z0 + i * 0.8), Math.PI * 0 + 0.05, sz(k)); pose(c, 'run', t + i * 0.3); face(c, i ? 'laugh' : 'grin', t, 0.3 + i * 0.4); aimArm(c, 1, H(c).add(v3(0, 2.4, -2.5)), 0.85); lookAtP(c, at(MW, -26, 6, z0 + 14), 0.4); });
    // the kites
    [[W.k1, d, -6], [W.k2, p, 5]].forEach(([k, c, x], i) => { k.visible = true; k.position.copy(at(MW, -26 + x + Math.sin(t * 1.3 + i) * 1.4, 19 + Math.sin(t * 1.9 + i * 2) * 1.2, z0 - 18)); k.rotation.set(-0.3, 0, Math.sin(t * 2 + i) * 0.3); });
    stringTo(handOf(d, 1), W.k1.position.clone().add(v3(0, -0.5, 0)));
  } else if (name === 'raft') {   // both on the raft out on the pond
    const rp = at(MW, POND.x - 1, 0, POND.z + 1.5), bob = Math.sin(t * 2.2) * 0.08; W.mead.raft.position.copy(rp).sub(MW).setY(0.1 + bob); W.mead.raft.rotation.set(Math.sin(t * 1.7) * 0.03, 0.4, Math.sin(t * 1.3) * 0.03);
    const deck = 0.1 + bob + 0.55;
    place(d, at(rp, -1.4, deck, 0.6), 0.25, sz('dot')); pose(d, 'idle', t); place(p, at(rp, 1.6, deck, 0.9), -0.15, sz('poppy')); pose(p, 'idle', t);
    aimArm(d, 1, H(d).add(side(d, -1.6)).add(v3(0, 1.4, 0)), 0.9); d.arms[1].rotation.z += Math.sin(t * 9) * 0.2; face(d, 'laugh', t, 0.3); face(p, 'grin', t, 0.6);
    lookAtP(d, at(rp, 0, 4, 14), 0.4); lookAtP(p, H(d), 0.6);
  } else {   // 'hiccup' / 'hit' / 'her': on the bank, Dot laughing, then the realization
    const DP = at(MW, -4, 0, 10), PP = at(MW, -0.6, 0, 11.2); W.mead.raft.position.set(POND.x + 2, 0.1, POND.z + 10);
    place(d, DP, yawTo(DP, PP) - 0.5, sz('dot')); pose(d, 'idle', t); place(p, PP, yawTo(PP, DP) + 0.5, sz('poppy')); pose(p, 'idle', t);
    const laughing = t < E.lost + 1.2;
    face(d, laughing ? 'laugh' : 'happy', t, 0.3); hiccup(d, t, hics.concat([E.hit + 0.3, E.hit + 1.1]));
    if (laughing) { aimArm(d, 0, chestOf(d).add(v3(0, -0.5, 0)).add(side(d, -0.2)), 0.8); aimArm(d, 1, chestOf(d).add(v3(0, -0.5, 0)).add(side(d, 0.2)), 0.8); }
    const real = smooth(E.hit + 0.2, E.hit + 0.8, t);
    face(p, t > E.lost ? 'shocked' : real > 0.5 ? 'surprised' : 'laugh', t, 0.5); lookAtP(p, t > E.hit + 0.4 ? H(d) : H(d), 0.7); lookAtP(d, H(p), 0.5);
    if (t > E.lost) { p.neck.rotation.x += 0.05; }
  }
}
function poseEve(t) {   // L12-14 at the way-back door at sunset: the bell, the bracelet, goodbye
  const E = EV, d = W.dot, p = W.poppy; W.loop.visible = false; kiteInTree(false);
  const ex = W.mead.exit, ring = t > E.rang - 0.1 ? Math.sin((t - E.rang) * 18) * Math.exp(-(t - E.rang) * 0.9) * 0.6 : 0;
  W.mead.exitBell.rotation.z = ring;
  const glow = smooth(E.rang - 0.1, E.rang + 0.6, t); ex.glow(0.2 + glow * 0.8);
  const door = at(MW, EXITD.x, 0, EXITD.z), fy = 0.5, f = v3(Math.sin(fy), 0, Math.cos(fy));
  const PP = door.clone().add(f.clone().multiplyScalar(4.4)).add(v3(Math.cos(fy), 0, -Math.sin(fy)).multiplyScalar(-1.2));
  const DP = PP.clone().add(v3(Math.cos(fy), 0, -Math.sin(fy)).multiplyScalar(3.2)).add(f.clone().multiplyScalar(0.6));
  const leave = smooth(E.every2 + 1.12, E.every2 + 2.3, t);
  const CAM = PP.clone().add(DP).multiplyScalar(0.5).add(f.clone().multiplyScalar(9)), blendY = (a, b) => a + wrap(b - a) * 0.4; W.eveCam = CAM;
  place(p, lp3(PP, door.clone().add(f.clone().multiplyScalar(0.4)), leave * 0.7), leave > 0 ? fy + Math.PI : blendY(yawTo(PP, DP), yawTo(PP, CAM)), sz('poppy')); pose(p, leave > 0 && leave < 1 ? 'walk' : 'idle', t);
  place(d, DP, blendY(yawTo(DP, PP), yawTo(DP, CAM)), sz('dot')); pose(d, 'idle', t);
  ex.open(smooth(E.every2 + 0.5, E.every2 + 1.3, t));
  // the tie: Poppy holds out her left wrist; Dot's hands work the knot; the DOT bracelet grows on
  const tie0 = E.tied - 0.1, tie1 = E.wrist + 0.9, ty = smooth(tie0 - 0.4, tie0, t) * (1 - smooth(tie1, tie1 + 0.4, t));
  const wp = chestOf(p).add(fwd(p, 1.2)).add(side(p, -0.1)).add(v3(0, -0.6, 0));
  if (ty > 0) { aimArm(p, 0, wp, ty); const hw = handOf(p, 0); aimArm(d, 0, hw.clone().add(side(d, 0.25)).add(v3(0, Math.sin(t * 14) * 0.08, 0)), ty); aimArm(d, 1, hw.clone().add(side(d, -0.25)).add(v3(0, -Math.sin(t * 14) * 0.08, 0)), ty); }
  showBr(W.brDot, smooth(tie0 + 0.2, tie0 + 1.0, t));
  // Poppy waves back from the doorway
  if (leave > 0.6) aimArm(p, 1, H(p).add(side(p, -1.0)).add(v3(0, 1.0, 0)), smooth(E.every2 + 1.8, E.every2 + 2.2, t));
  face(d, t > E.again ? 'sad' : t > E.rang ? 'nervous' : 'happy', t, 0.4, { viseme: talk(13, t) });
  face(p, t > E.every2 ? 'happy' : t > E.rang ? 'sad' : 'happy', t, 0.3, { viseme: talk(14, t) });
  lookAtP(p, ty > 0.5 && t < E.wrist + 0.4 ? handOf(p, 0) : H(d), 0.8); lookAtP(d, ty > 0.5 && t < E.wrist + 0.4 ? handOf(p, 0) : H(p), 0.8);
}
function poseMemory(t) {   // L3 (sepia): young Dot on the raft waving; a girl in a yellow raincoat walks away through the door; gone
  const E = EV, d = W.dot, p = W.poppy; W.loop.visible = false; kiteInTree(false);
  const rp = at(MW, POND.x - 9, 0, POND.z + 6), bob = Math.sin(t * 2.2) * 0.06; W.mead.raft.position.copy(rp).sub(MW).setY(0.1 + bob); W.mead.raft.rotation.set(0, -0.6, 0);
  place(d, at(rp, 0, 0.65 + bob, 0.5), -0.9, sz('dot')); pose(d, 'idle', t); aimArm(d, 1, H(d).add(side(d, -0.8)).add(v3(0, 1.6, 0)).add(fwd(d, 0.6)), 1); d.arms[1].rotation.z += Math.sin(t * 8) * 0.25; face(d, 'happy', t, 0.3);
  const A = at(MW, 7, 0, 5.5), B = at(MW, -1, 0, 10);
  walkTo(p, A, B, E.poppy - 0.6, E.summer + 1.2, t, 1, 'walk', sz('poppy')); p.root.visible = t < E.summer + 0.25; face(p, 'neutral', t, 0.3);
  lookAtP(d, H(p), 0.6);
}
// ================= home: the porch =================
const BENCH = () => W.home.bench.clone().add(HM);
function poseHome1(t) {   // L2: Mom on the porch bench, not laughing at Poppy's silly dance on the lawn; she smiles at the old kite on the wall
  const E = EV, m = W.mom, p = W.poppy; coat(false); W.badge.visible = false;
  sitOn(m, BENCH().add(v3(-0.4, 0, 0)), 0, sz('mom'), W.home.benchSeatY);
  const kiteP = W.home.oldKite.getWorldPosition(v3());
  const smile = t > E.smiled + 0.2;
  face(m, smile ? 'happy' : 'bored', t, 0.4); lookAtP(m, smile ? kiteP : H(p), 0.8);
  const PP = at(HM, 0.8, 0, 15.6); place(p, PP, yawTo(PP, at(HM, -0.7, 0, 25)) - 0.3, sz('poppy')); pose(p, 'idle', t);
  if (!smile) { const wig = Math.sin(t * 7); aimArm(p, 0, H(p).add(side(p, 1.6)).add(v3(0, 0.8 + wig * 0.6, 0)), 1); aimArm(p, 1, H(p).add(side(p, -1.6)).add(v3(0, 0.8 - wig * 0.6, 0)), 1); p.root.rotation.y += Math.sin(t * 3.5) * 0.25; }
  face(p, smile ? 'surprised' : 'blep', t, 0.3); lookAtP(p, smile ? kiteP : H(m), 0.7);
}
const MOMSEAT = () => BENCH().add(v3(-0.6, 0, 0));
const PSTAND = () => at(HM, -0.4, 1.0, 10.9);    // Poppy on the porch, beside the bench
function poseHome2(t) {   // L15-19: evening; Mom with the shoebox and the POPPY bracelet; Poppy comes up the path; the laugh
  const E = EV, m = W.mom, p = W.poppy; coat(true); W.badge.visible = true; showBr(W.brDot, 1);
  sitOn(m, MOMSEAT(), 0, sz('mom'), W.home.benchSeatY);
  W.box.visible = true; W.box.position.copy(at(HM, -7.4, 0, 10.6)).setY(HM.y + 1.0); W.box.rotation.y = 0.3;
  // the bracelet in her hands
  const hp = chestOf(m).add(fwd(m, 1.0)).add(v3(0, -0.5, 0)); const lift = smooth(E.dotbr - 0.2, E.dotbr + 0.4, t);
  aimArm(m, 0, hp.clone().add(side(m, 0.35)), 1 - lift * 0.5); aimArm(m, 1, hp.clone().add(side(m, -0.35)), 1 - lift * 0.5);
  W.momBr.visible = true; W.momBr.position.copy(handOf(m, 0).add(handOf(m, 1)).multiplyScalar(0.5)).add(v3(0, 0.55, 0)).add(fwd(m, 0.35)); W.momBr.rotation.set(0.25, m.root.rotation.y, 0);
  // Poppy: up the path to the foot of the steps, the wrist; then up onto the porch beside Mom
  const A = at(HM, 0.4, 0, 33), B = at(HM, 0.2, 0, 15.0), C = PSTAND();
  const u = walkTo(p, A, B, E.athome + 0.2, E.saw + 0.7, t, 1.0, 'walk', sz('poppy'));
  const up = smooth(E.laugh + 0.3, E.wasyou - 0.1, t);
  if (u >= 1) {
    const pos = lp3(B, C, up); pos.y = HM.y + clamp((15.0 - pos.z + HM.z) / 3.0) * 1.0;
    place(p, pos, up > 0 && up < 1 ? yawTo(B, C) : (up >= 1 ? yawTo(pos, at(HM, -1.2, 0, 16)) : yawTo(pos, H(m)) + 0.2), sz('poppy')); pose(p, up > 0 && up < 1 ? 'walk' : 'idle', t);
    const raise = smooth(E.dotbr - 0.3, E.dotbr + 0.2, t) * (1 - smooth(E.laugh + 0.1, E.laugh + 0.4, t));
    aimArm(p, 0, chestOf(p).add(fwd(p, 1.0)).add(side(p, 0.4)).add(v3(0, 0.6, 0)), raise);
  }
  const hics = [E.hiccups + 0.1, E.hiccups + 0.7, E.wasyou + 1.1, E.told + 0.4];
  face(m, t > E.laugh ? 'laugh' : t > E.dotbr + 0.3 ? 'shocked' : t > E.saw + 0.3 ? 'surprised' : 'neutral', t, 0.4);
  if (t > E.wasyou && t < L(18).end) face(m, 'happy', t, 0.4, { viseme: talk(18, t) });
  hiccup(m, t, hics);
  lookAtP(m, t < E.saw - 0.2 ? W.momBr.position : t > E.dotbr && t < E.laugh ? handOf(p, 0) : H(p), 0.8);
  face(p, t > E.laugh ? 'grin' : 'happy', t, 0.3, { viseme: talk(19, t) }); lookAtP(p, H(m), up >= 1 ? 0.45 : 0.8);
}

// ---- shots ----
function camOn(c, dist, ang = 0, dy = 0, lookDy = -0.7, fov = 54) { const h = H(c), a = c.root.rotation.y + ang * Math.PI / 180, s = SC(c); return { pos: h.clone().add(v3(Math.sin(a) * dist, dy, Math.cos(a) * dist)), look: h.clone().add(v3(0, lookDy * s, 0)), fov }; }
function shots() {
  const s = (i) => L(i).start, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  // L0 the hotel; the corridor of years
  add('street', 0, (u) => ({ pos: lp3(v3(2, 5.0, 36), v3(2, 6.0, 31), easeInOut(u)), look: v3(0, 16, 0), fov: 60 }));
  add('corr', E.every - 0.05, (u) => ({ pos: at(LB, 0.8, lerp(6.2, 6.6, u), lerp(-17, -24, easeInOut(u))), look: at(LB, -0.4, 5.0, -70), fov: 56 }));
  // L1 one stay; the gray-haired guests wait
  add('queue', s(1) - 0.05, (u) => ({ pos: at(LB, lerp(3.5, 4.5, u), 5.6, lerp(7, 5.5, u)), look: at(LB, 12, 3.8, -2.6), fov: 56 }));
  add('gray', E.gray - 0.25, (u) => ({ pos: at(LB, 2.4 + u * 0.5, 6.4, -1.8), look: at(LB, 14.5, 6.0, -2.4), fov: 54 }));
  // L2 Mom never laughed; L3 the memory (sepia)
  add('mom', s(2) - 0.05, (u) => ({ pos: at(HM, lerp(-0.4, -1.0, u), 5.4, 25), look: at(HM, -1.6, 4.0, 12.5), fov: 54 }));
  add('smile', E.smiled - 0.05, (u) => camOn(W.mom, 8.2 - u * 0.6, 24, 0.4, -0.9, 52));
  add('memory', s(3) - 0.05, (u) => ({ pos: lp3(at(MW, 13, 5.2, 17), at(MW, 12, 5.0, 16), easeInOut(u)), look: at(MW, 2.5, 3.0, 2.5), fov: 56 }));
  // L4 her twelfth birthday: the raincoat, the lobby, the bell
  add('bday', s(4) - 0.05, (u) => { const c = W.poppy, h = H(c); return { pos: h.clone().add(fwd(c, 8.5)).add(side(c, 1.4)).add(v3(0, 0.4, 0)), look: h.clone().add(v3(0, -1.1, 0)), fov: 54 }; });
  add('ask', E.asked - 0.05, (u) => ({ pos: at(LB, lerp(-3.6, -4.0, u), 4.8, -12.4), look: H(W.poppy).add(v3(0, -0.6, 0)), fov: 52 }));
  // L5 the bellhop's rule
  add('rule', s(5) - 0.05, (u) => ({ pos: at(LB, lerp(-11.2, -11.6, u), 6.4, 0.6), look: H(W.bell).add(v3(0, -1.0, 0)), fov: 50 }));
  add('key', E.rings - 0.05, (u) => { const k = W.key.getWorldPosition(v3()); return { pos: k.clone().add(v3(2.4 - u * 0.3, 0.6, 3.6)), look: k.clone().add(v3(0, 0.2, 0)), fov: 46 }; });
  add('never', E.sayw - 0.1, (u) => ({ pos: at(LB, -14.4 + u * 0.3, 7.0, -2.0), look: H(W.bell).add(v3(0, -0.8, 0)), fov: 48 }));
  // L6 behind the door: the corridor; the meadow; the oak, tangled
  add('door', s(6) - 0.05, (u) => ({ pos: at(LB, lerp(3.0, 2.4, u), 5.0, -40.2), look: at(LB, -4.6, 4.0, -47.6), fov: 54 }));
  add('oak', E.hung - 0.05, (u) => ({ pos: lp3(at(MW, 10, 5.0, 20), at(MW, 8.5, 5.4, 18.5), easeOut(u)), look: at(MW, -2, 6.4, -4.8), fov: 56 }));
  add('tangled', E.tangled - 0.05, (u) => { const h = H(W.dot); return { pos: h.clone().add(v3(1.6, -0.4, 9.0 - u * 0.6)), look: h.clone().add(v3(0, -0.4, 0)), fov: 54 }; });
  // L7 it was Mom, at twelve; L8 "Help! I'm Dot!"; L9 "Uh... Poppy."
  add('mom12', s(7) - 0.05, (u) => { const h = H(W.dot); return { pos: h.clone().add(v3(0.6, -0.6, 7.0 - u * 1.0)), look: h.clone().add(v3(0, -0.4, 0)), fov: 50 }; });
  add('help', s(8) - 0.05, (u) => { const h = H(W.dot); return { pos: h.clone().add(v3(-2.2, -2.2, 7.6)), look: h.clone().add(v3(0, -0.9, 0)), fov: 52 }; });
  add('uh', s(9) - 0.05, (u) => camOn(W.poppy, 7.2 - u * 0.4, 8, -0.4, -0.3, 52));
  // L10 kites, the raft, the hiccups
  add('kites', s(10) - 0.05, (u) => { const m = W.dot.root.position.clone().add(W.poppy.root.position).multiplyScalar(0.5); return { pos: m.clone().add(v3(1.5, 3.2, 13)), look: m.clone().add(v3(0, 7.5, -6)), fov: 62 }; });
  add('raft', E.raft - 0.05, (u) => { const rp = at(MW, POND.x - 1, 0, POND.z + 1.5); return { pos: rp.clone().add(v3(-3 + u * 0.8, 4.6, 12.5)), look: rp.clone().add(v3(0, 3.2, 0)), fov: 54 }; });
  add('hiccup', E.laughed - 0.05, (u) => { const m = H(W.dot).add(H(W.poppy)).multiplyScalar(0.5); return { pos: m.clone().add(v3(0.6 - u * 0.4, 0.4, 11.5)), look: m.clone().add(v3(0, -1.2, 0)), fov: 54 }; });
  // L11 then it hit her
  add('hit', s(11) - 0.05, (u) => { const c = W.poppy, h = H(c); return { pos: h.clone().add(fwd(c, lerp(8.0, 5.8, easeInOut(u)))).add(side(c, 0.8)).add(v3(0, 0.1, 0)), look: h.clone().add(v3(0, -0.5, 0)), fov: 50 }; });
  add('her', E.lost - 0.05, (u) => { const c = W.poppy, h = H(c); return { pos: h.clone().add(fwd(c, 6.0)).add(side(c, 2.2 - u * 0.6)).add(v3(0, -0.3, 0)), look: h.clone().add(v3(0, -0.4, 0)), fov: 46 }; });
  // L12 the last evening; the bell rang; the bracelet
  add('last', s(12) - 0.05, (u) => ({ pos: lp3(at(MW, EXITD.x + 16, 6.5, EXITD.z + 22), at(MW, EXITD.x + 14, 6.0, EXITD.z + 19), easeInOut(u)), look: at(MW, EXITD.x + 1, 5.0, EXITD.z + 2), fov: 56 }));
  add('rang', E.rang - 0.05, (u) => { const b = W.mead.exitBell.getWorldPosition(v3()); return { pos: b.clone().add(v3(2.2, -1.6, 5.6 - u * 0.5)), look: b.clone().add(v3(0, -1.2, 0)), fov: 50 }; });
  add('tie', E.tied - 0.05, (u) => { const a = H(W.poppy), b = H(W.dot), m = a.clone().add(b).multiplyScalar(0.5), f = v3(Math.sin(0.5), 0, Math.cos(0.5)); return { pos: m.clone().add(f.multiplyScalar(9.0 - u * 0.5)).add(v3(0, 0.2, 0)), look: m.clone().add(v3(0, -1.2, 0)), fov: 52 }; });
  add('wrist', E.wrist - 0.05, (u) => { const w = handOf(W.poppy, 0), f = v3(Math.sin(0.5), 0, Math.cos(0.5)); return { pos: w.clone().add(f.multiplyScalar(2.8 - u * 0.2)).add(v3(0, 1.2, 0)), look: w.clone().add(v3(0, 0.3, 0)), fov: 46 }; });
  // L13 "Will I see you again?"; L14 "Every single day."
  const toward = (c, d) => { const h = H(c), o = c === W.dot ? W.poppy : W.dot, dir = (W.eveCam || h.clone().add(v3(0, 0, 9))).clone().sub(h).setY(0).normalize().add(H(o).sub(h).setY(0).normalize()).normalize(); return { pos: h.clone().add(dir.multiplyScalar(d)).add(v3(0, 0.1, 0)), look: h.clone().add(v3(0, -0.5, 0)), fov: 50 }; };
  add('again', s(13) - 0.05, (u) => toward(W.dot, 7.4 - u * 0.4));
  add('every2', s(14) - 0.05, (u) => toward(W.poppy, 7.0 - u * 0.4));
  add('through', s(14) + 1.05, (u) => ({ pos: at(MW, EXITD.x + 9.5, 5.2, EXITD.z + 12), look: at(MW, EXITD.x, 4.4, EXITD.z), fov: 54 }));
  // L15 at home, the porch, the bracelet; L16 the raincoat, the DOT bracelet
  add('porch', s(15) - 0.05, (u) => ({ pos: lp3(at(HM, 2.0, 6.0, 26), at(HM, 1.2, 5.8, 23), easeInOut(u)), look: at(HM, -3.6, 4.6, 10.4), fov: 54 }));
  add('momBr', E.holding - 0.05, (u) => { const b = W.momBr.position.clone(); return { pos: b.clone().add(v3(0.4, 2.0, 5.6 - u * 0.4)), look: b.clone().add(v3(0, 0.9, 0)), fov: 44 }; });
  add('saw', s(16) - 0.05, (u) => camOn(W.mom, 8.6 - u * 0.6, 26, 0.0, -0.9, 52));
  add('dotbr', E.dotbr - 0.05, (u) => { const w = handOf(W.poppy, 0), m = H(W.mom); const p = W.poppy; return { pos: w.clone().add(w.clone().sub(m).setY(0).normalize().multiplyScalar(2.6)).add(side(p, -1.6)).add(v3(0, 0.5, 0)), look: lp3(w, m, 0.35), fov: 50 }; });
  add('laugh', s(17) - 0.05, (u) => ({ pos: at(HM, lerp(0.0, -0.6, u), 5.6, 20.5), look: at(HM, -3.0, 4.6, 10.4), fov: 52 }));
  add('wasyou', s(18) - 0.05, (u) => camOn(W.mom, 7.8 - u * 0.4, 24, 0.2, -0.8, 50));
  add('told', s(19) - 0.05, (u) => ({ pos: at(HM, 0.2 - u * 0.2, 6.0, 16.4), look: H(W.poppy).add(v3(0, -0.6, 0)), fov: 46 }));
  add('end', s(19) + 1.6, (u) => { const k = easeInOut(u); return { pos: at(HM, lerp(-1.0, -0.6, k), lerp(5.4, 8.0, k), lerp(20, 25, k)), look: at(HM, -1.8, lerp(4.4, 7.4, k), 10.4), fov: 54 }; });
  Sx.sort((a, b) => a.t0() - b.t0());
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
const KEYS = { street: 'street', corr: 'corr', queue: 'queue', gray: 'queue', mom: 'home1', smile: 'home1', memory: 'memory', bday: 'desk', ask: 'desk', rule: 'desk', key: 'desk', never: 'desk',
  door: 'door', oak: 'oak', tangled: 'oak', mom12: 'oak', help: 'oak', uh: 'oak', kites: 'fun', raft: 'fun', hiccup: 'fun', hit: 'fun', her: 'fun',
  last: 'eve', rang: 'eve', tie: 'eve', wrist: 'eve', again: 'eve', every2: 'eve', through: 'eve', porch: 'home2', momBr: 'home2', saw: 'home2', dotbr: 'home2', laugh: 'home2', wasyou: 'home2', told: 'home2', end: 'home2' };
const SETOF = { street: 'street', corr: 'lobby', queue: 'lobby', desk: 'lobby', door: 'lobby', home1: 'home', home2: 'home', memory: 'meadow', oak: 'meadow', fun: 'meadow', eve: 'meadow', lineup: 'lu' };

function renderAt(t) {
  let sh = shotAt(W.shots, t); let key = KEYS[sh.name];
  const E = EV;
  if (LINEUP) key = 'lineup';
  if (ctx.thumbMode) key = 'thumb';
  const set = key === 'thumb' ? 'lobby' : SETOF[key];
  const env = key === 'memory' ? SEPIA : key === 'eve' ? EVE : key === 'home2' ? PORCHEVE : set === 'lobby' ? ROOM : set === 'meadow' ? SUMMER : SUNNY;
  applyEnv(ctx, env);
  W.street.visible = set === 'street' || set === 'lu'; W.lob.visible = set === 'lobby'; W.mead.visible = set === 'meadow'; W.home.visible = set === 'home';
  W.pt.forEach((l) => { l.intensity = l.userData.set === set ? l.userData.I : 0; });
  hideAll(); coat(true); W.badge.visible = true; showBr(W.brDot, 0); W.brPop.visible = true; W.loop.visible = false;
  for (const k of ['key', 'momBr', 'box', 'k1', 'k2', 'str']) W[k].visible = false;
  W.lob.doors.forEach((d) => { d.door.open(0); d.door.glow(0.3); }); W.lamp94.intensity = 0;
  W.mead.exit.open(0); W.mead.exit.glow(0.15); W.mead.exitBell.rotation.z = 0; W.mead.raft.position.set(POND.x - 10, 0.1, POND.z + 9); W.mead.raft.rotation.set(0, -0.3, 0);
  W.mead.pads.forEach((p, i) => { p.position.y = 0.14 + Math.sin(t * 1.4 + i) * 0.02; });
  W.home.lantern.material.color.set('#ffd89a').multiplyScalar(key === 'home2' ? 2.4 : 0.6);
  if (key === 'lineup') poseLineup(t);
  else if (key === 'thumb') poseThumb(t);
  else ({ street: () => poseStreet(t), corr: () => poseCorr(t), queue: () => poseQueue(t), home1: () => poseHome1(t), memory: () => poseMemory(t), desk: () => poseDesk(t),
    door: () => poseDoor(t), oak: () => poseOak(t), fun: () => poseFun(t, sh.name), eve: () => poseEve(t), home2: () => poseHome2(t) })[key]();
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  if (key === 'lineup') { const n = LINEUP.length, i = Math.floor(t) % n, hh = H(W['L' + i]), fr = t % 1; const ang = fr < 0.34 ? 0 : fr < 0.67 ? 0.7 : -0.7; sh = { name: 'lineup', pos: hh.clone().add(v3(Math.sin(ang) * 4.2, 0.2, Math.cos(ang) * 4.2)), look: hh.clone().add(v3(0, -0.5, 0)), fov: 46 }; }
  if (Q.get('dbgpos')) console.error('t', t, sh.name, 'cam', sh.pos.toArray().map((x) => x.toFixed(1)).join(','), W.all.filter((c) => c.root.visible).map((c) => c.key + '@' + c.root.position.toArray().map((x) => x.toFixed(1)).join(',')).join(' | '));
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2 * SC(c), 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * SC(c); c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2] * SC(c), Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  if (ctx.thumbMode) { const h = H(W.poppy); sh = { ...sh, name: 'thumb', pos: h.clone().add(v3(+(Q.get('tx') || 7.5), +(Q.get('ty') || 0.4), +(Q.get('td') || -1.0))), look: h.clone().add(v3(+(Q.get('tlx') || -1.0), +(Q.get('tl') || 1.4), 0)), fov: +(Q.get('tf') || 50) }; }
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  frame(ctx, t, sh, { steady: t < 2.4 || Q.get('steady') === '1', shake: 0, shadowSpan: set === 'street' ? 90 : set === 'lobby' ? 60 : 50, shadows: true, black: 0,
    flash: Math.max(0, 1 - Math.abs(t - E.summer - 0.25) / 0.2) * 0.35 + Math.max(0, 1 - Math.abs(t - E.hung) / 0.2) * 0.5, flashColor: '#fff4e0' });
  return sh.name;
}
function poseThumb(t) {   // Poppy in her raincoat at the open 1994 door, the key in her hand, summer light on her
  const p = W.poppy, d = D94(); poseCorr(t);
  const P0 = at(LB, -3.3, 0, -46.2); place(p, P0, Math.PI / 2 + 0.55, sz('poppy')); pose(p, 'idle', t);
  d.door.open(0.95); d.door.glow(1.8); W.lamp94.intensity = 300;
  aimArm(p, 1, chestOf(p).add(fwd(p, 0.9)).add(side(p, -0.5)).add(v3(0, 0.5, 0)), 1); W.key.visible = true; W.key.position.copy(handOf(p, 1)).add(v3(0, 0.4, 0)); W.key.rotation.set(0, 0.6, 0.1);
  face(p, 'happy', t, 0, { noBlink: true }); lookAtP(p, H(p).add(v3(8, 0.3, 1)), 0.6);
}
function poseLineup(t) {
  const n = LINEUP.length; LINEUP.forEach((k, i) => { const c = W['L' + i]; place(c, at(LU, (i - (n - 1) / 2) * 4.2, 0, 0), 0); pose(c, 'idle', 0); face(c, t % 1 > 0.5 ? 'happy' : 'surprised', 0, 0, { noBlink: true }); });
}

export async function setup() {
  const avs = [...new Set([...Object.values(AV).map((a) => a[0]), ...(LINEUP || [])])];
  ctx = await initStage('ep103', { look: 'pro', avatars: avs }); L = ctx.L;
  try { CAP = (await (await fetch('/build/ep103/timeline.json')).json()).captions || []; } catch (e) { CAP = []; }
  EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'grin', 'focused', 'shocked', 'surprised', 'nervous', 'scared', 'laugh', 'bored', 'blep', 'sleepy', 'skeptic', 'blink']);
  const { scene, camera } = ctx; camera.far = 3000; camera.near = 0.1; camera.updateProjectionMatrix();
  W.street = almanacStreet(); scene.add(W.street);
  W.lob = lobby(); W.lob.position.copy(LB); scene.add(W.lob);
  W.mead = meadow(); W.mead.position.copy(MW); scene.add(W.mead);
  W.home = porchHome(); W.home.position.copy(HM); scene.add(W.home);
  W.key = brassKey('1994'); scene.add(W.key);
  W.box = shoebox(); scene.add(W.box);
  W.k1 = kite(['#e8433a', '#ffd23f']); scene.add(W.k1); W.k2 = kite(['#3fb7e8', '#ffffff']); scene.add(W.k2);
  W.str = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 5), paint('#f4efe4', { roughness: 0.8 })); scene.add(W.str);
  const PL = (c, I, d, set, p) => { const l = new THREE.PointLight(c, I, d, 1.5); if (p) l.position.copy(p); l.userData.I = I; l.userData.set = set; scene.add(l); return l; };
  W.pt = [PL('#ffe2b0', 180, 50, 'lobby', at(LB, 0, 13, 2)), PL('#ffd8a0', 120, 34, 'lobby', at(LB, -12, 11, -2)), PL('#ffd8a0', 90, 30, 'lobby', at(LB, 0, 11, -30)), PL('#ffd8a0', 90, 30, 'lobby', at(LB, 0, 11, -58)),
    PL('#ffc890', 70, 26, 'home', at(HM, 2.5, 7.5, 11))];
  W.lamp94 = new THREE.PointLight('#fff0c0', 0, 26, 1.5); W.lamp94.position.copy(at(LB, -4.6, 5, -48)); scene.add(W.lamp94);
  people();
  if (LINEUP) LINEUP.forEach((a, i) => { const c = makeCharacter({ avatar: a, alti: true, skin: skinOf(a), caustic: false, scale: 1 }); scene.add(c.root); jointify(c); c.key = 'L' + i; W['L' + i] = c; W.all.push(c); });
  W.shots = shots();
  window.__ep103 = { W, THREE, ctx, L, EV };
  return expose(ctx, renderAt, EV.behind + 0.2, EV);
}
