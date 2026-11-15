// Flower Man remake 2: The Town That Erased Its Names. In Gullhaven no name lasts longer than one year: every spring everyone picks a new
// one, chalked on a slate (this year the mayor is Pudding; last year he was Captain Socks), and the founder's name is chiseled off the
// fountain. The morning after, a man in a tall hat knocks on every door: "Any Hargreaves here?" Every door shuts fast. Tilly loves her
// name (her great-great-grandma's), so she keeps it and tells Mom she's Brenda ("Brenda? Really?"). Next morning the tall hat is on her
// doorstep: "Matilda Hargreave?" "That's me!" Mom drops the teapot. His ledger: a century ago the first Matilda bought the whole harbor on
// credit, and instead of paying made the town change names every year: Gullhaven was hiding from one bill. "With interest, you owe us the
// town. Three times." Tilly licks her thumb, wipes her slate clean: "Sorry, mister. Wrong house. I'm Brenda." And she shuts the door.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, frame, expose, P, DAY } from '../engine/stage.js';
import { shotAt } from '../engine/stage.js';
import { jointify } from '../engine/infinitetower.js';
import { FARM } from '../engine/farm_cast.js';
import { Batch, paint, surf } from '../engine/kit.js';
import { gullhaven, hargreaveHome, wearSlate, topHat, wearHatBig, wearSash, ledger, billScroll, teapot, chalk, hammer, chisel, QZ, FOUNT, PODIUM, STALL } from '../engine/erasednames.js';
import { quill } from '../engine/birchpost.js';

const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV, CAP = [];
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const LINEUP = Q.get('lineup') ? Q.get('lineup').split(',') : null;
// [avatar, scale, head scale]
const AV = {
  tilly: ['farm_bacon_girl', 0.78], mom: ['farm_classic_mom', 1], coll: ['farm_bacon_dad_suit', 1.06], mayor: ['farm_hc_mayor_harmon', 1.02],
  founder: ['farm_ms_henderson', 1], n1: ['farm_old_man', 1], n2: ['farm_nia_florist', 1], n3: ['farm_lumber_joe', 1], n4: ['farm_omar', 0.98], k1: ['farm_young_kid', 0.72],
};
for (const k of Object.keys(AV)) if (Q.get(k)) AV[k][0] = Q.get(k);
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';

const HS = v3(1500, 0, 0), LU = v3(-1500, 0, 0);   // Tilly's home; the lineup stage
const at = (o, x, y, z) => o.clone().add(v3(x, y, z));

const SUNNY = { ...DAY, ...P({ top: '#2f93ee', horizon: '#d2efff', haze: '#d8f0ff', sunColor: '#fff3dc', hemiSky: '#d6edff', hemiGround: '#d4dfa4' }), sunDir: v3(0.35, 0.8, 0.5), sunI: 2.2, sunDisc: 0, hemiI: 1.12, amb: 0.3, envI: 1.0, exposure: 1.0, bloom: 0.03, vig: 0, saturation: 1.2, contrast: 1.05, bounce: 0.18, fogNear: 300, fogFar: 1100, stars: 0, moon: 0, win: 0, lamp: 0 };
const MORN = { ...SUNNY, ...P({ top: '#4a9be8', horizon: '#ffe2c4', haze: '#ffe8d0', sunColor: '#ffe6c4', hemiSky: '#e4ecff', hemiGround: '#d8cfa0' }), sunDir: v3(0.7, 0.45, 0.5), sunI: 2.0, hemiI: 1.1, exposure: 1.02, fogNear: 160, fogFar: 800 };
const ROOM = { ...SUNNY, ...P({ top: '#ffe7c2', horizon: '#ffe7c2', haze: '#ffe7c2', sunColor: '#ffe6c0', hemiSky: '#fff4e0', hemiGround: '#d6b488' }), sunDir: v3(0.65, 0.55, 0.4), sunI: 0.4, hemiI: 1.35, amb: 0.48, envI: 0.75, saturation: 1.14, fogNear: 400, fogFar: 1200 };
const SEPIA = { ...SUNNY, ...P({ top: '#c9a873', horizon: '#f0dcb4', haze: '#ead4ac', sunColor: '#ffe0b0', hemiSky: '#f4dfb8', hemiGround: '#b89a6a' }), sunI: 2.0, hemiI: 1.15, saturation: 0.32, contrast: 1.1, exposure: 1.02 };

const capT = (word, after = 0) => { const c = CAP.find((x) => x.start >= after - 0.01 && x.text.toUpperCase().replace(/[“”]/g, '').includes(word)); return c ? c.start : after; };
function events() {
  const s = (i) => L(i).start;
  return {
    year: capT('THAN ONE YEAR', s(0)), chalked: capT('ONE, CHALKED', s(1)), pudding: capT('IS PUDDING', s(2)), socks: capT('LAST YEAR', s(2)),
    founder: capT("THE FOUNDER'S", s(3)), chisel: capT('CHISELED OFF', s(3)), tall: capT('A MAN IN A', s(4)), knock: capT('TALL HAT KNOCKS', s(4)), every: capT('EVERY DOOR.', s(4)),
    ask: s(5), shut: s(6), tilly: s(7), grandma: capT('NAME. IT WAS', s(7)), kept: s(8), brenda: capT('AND TOLD MOM', s(8)), really: s(9),
    morning: s(10), doorstep: capT('ON HER DOORSTEP', s(10)), reads: s(11), me: s(12), drop: s(13), ledger: s(14), century: capT('A CENTURY AGO', s(14)), harbor: capT('THE WHOLE HARBOR', s(14)),
    paying: s(15), made: capT('SHE MADE THE TOWN', s(15)), custom: s(16), hiding: capT('GULLHAVEN WAS HIDING', s(16)), interest: s(17), three: capT('TOWN. THREE', s(17)),
    lick: s(18), wipe: capT('AND WIPED', s(18)), sorry: s(19), imb: capT("I'M BRENDA", s(19)), shutE: s(20), end: ctx.dur,
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
const mouthOf = (c) => H(c).add(v3(0, -0.45 * SC(c), 0)).add(fwd(c, 0.75 * SC(c)));

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
  // the slates
  W.sl = { n1: wearSlate(W.n1, 'BIG TED'), n2: wearSlate(W.n2, 'DAISY'), n3: wearSlate(W.n3, 'SPUD'), n4: wearSlate(W.n4, 'ZIGGY'), k1: wearSlate(W.k1, 'ROCKET'), mayor: wearSlate(W.mayor, 'PUDDING', { y: 0.42 }) };
  W.slT = wearSlate(W.tilly, 'TILLY'); W.slB = wearSlate(W.tilly, 'BRENDA'); W.slB.visible = false; W.slB.cord.visible = false;
  W.slM = wearSlate(W.mom, 'JUNE');
  W.hat = topHat(W.coll); W.bigHat = wearHatBig(W.founder); W.sash = wearSash(W.mayor);
  // the founder in stone, on the fountain's plinth
  const st = makeCharacter({ avatar: AV.founder[0], alti: false, skin: '#d6d0c2', caustic: false, scale: 1.15 }); ctx.scene.add(st.root); jointify(st);
  const stone = new THREE.MeshStandardMaterial({ color: '#d9d3c5', roughness: 0.92 });
  st.root.traverse((o) => { if (o.isMesh) { o.material = stone; o.castShadow = true; o.receiveShadow = true; } });
  W.statue = st; wearHatBig(st).traverse((o) => { if (o.isMesh) o.material = stone; });
  // a stone ledger under the statue's arm
  W.stoneBook = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.3), stone); W.stoneBook.castShadow = true; ctx.scene.add(W.stoneBook);
}
function hideAll() { W.all.forEach((c) => { c.root.visible = false; }); }
function slates(on) { for (const s of Object.values(W.sl)) { s.visible = on; s.cord.visible = on; } }

// ================= the plaza =================
const CROWD = [['n1', -6.5, 9.5, 0.4], ['n3', -2.6, 11.5, 0.1], ['k1', 0.8, 10.8, -0.2], ['n4', 5.6, 9.6, -0.5]];
function poseCrowd(t, o = {}) {
  CROWD.forEach(([k, x, z, yaw], i) => { const c = W[k]; place(c, v3(x, 0, z), yaw + (o.yaw || 0), AV[k][1]); pose(c, 'idle', t + i * 0.7);
    face(c, i % 2 ? 'happy' : 'grin', t, 0.2 + i * 0.3); if (o.look) lookAtP(c, o.look, 0.6);
    // chat: a gesture now and then
    const g = Math.sin(t * 1.3 + i * 2.1); if (g > 0.6) aimArm(c, i % 2, H(c).add(fwd(c, 1.2)).add(side(c, i % 2 ? -0.8 : 0.8)).add(v3(0, -1.2, 0)), (g - 0.6) * 1.8); });
}
function poseHarbor(t) {   // L0: a bright harbour morning, Name Day
  poseCrowd(t);
  const n2 = W.n2; place(n2, at(STALL, 0, 0, -2.6), 0, 1); pose(n2, 'idle', t); face(n2, 'happy', t, 0.5);
  const m = W.mayor; place(m, at(PODIUM, 0.6, 1.7, 0.4), 0.15, AV.mayor[1]); pose(m, 'idle', t); face(m, 'neutral', t, 0.4); W.sl.mayor.set('CAPTAIN SOCKS');
}
function poseStall(t) {   // L1: Daisy wipes PEG and chalks DAISY
  const E = EV, n2 = W.n2, s = W.sl.n2; place(n2, at(STALL, 0, 0, -2.6), 0, 1); pose(n2, 'idle', t);
  const w0 = L(1).start + 0.3, w1 = w0 + 1.3, c0 = E.chalked - 0.2, c1 = c0 + 1.4;
  const wipe = smooth(w0, w1, t), wr = smooth(c0, c1, t);
  if (t < c0) s.set('PEG', { write: 1, wipe }); else s.set('DAISY', { write: wr, old: 'PEG' });
  const sp = s.getWorldPosition(v3());
  if (t > w0 - 0.3 && t < w1 + 0.2) { const u = (t - w0) / (w1 - w0); aimArm(n2, 0, sp.clone().add(side(n2, lerp(0.6, -0.7, clamp(u)))).add(fwd(n2, 0.3)).add(v3(0, Math.sin(u * 18) * 0.12, 0)), smooth(w0 - 0.3, w0, t) * (1 - smooth(w1, w1 + 0.2, t))); }
  if (t > c0 - 0.3) { const u = clamp((t - c0) / (c1 - c0)); aimArm(n2, 1, sp.clone().add(side(n2, lerp(0.6, -0.6, u))).add(fwd(n2, 0.3)).add(v3(0, Math.sin(u * 30) * 0.12, 0)), smooth(c0 - 0.3, c0, t) * (1 - smooth(c1, c1 + 0.3, t)));
    W.chalk.visible = t < c1 + 0.2; W.chalk.position.copy(handOf(n2, 1)).add(fwd(n2, 0.1)); W.chalk.rotation.set(0.3, 0, 0.6); }
  face(n2, t < c0 ? 'focused' : wr < 1 ? 'focused' : 'grin', t, 0.5); lookAtP(n2, sp.clone().add(v3(0, -0.6, 0)), 0.5 * (t < c1 ? 1 : 0));
  // customers by the table
  place(W.n4, at(STALL, -4.2, 0, 3.2), Math.PI - 0.5, AV.n4[1]); pose(W.n4, 'idle', t); face(W.n4, 'happy', t, 0.6); lookAtP(W.n4, H(n2), 0.6);
  place(W.k1, at(STALL, 3.6, 0, 3.4), Math.PI + 0.6, AV.k1[1]); pose(W.k1, 'idle', t); face(W.k1, 'grin', t, 0.2); lookAtP(W.k1, H(n2), 0.6);
}
function poseMayor(t) {   // L2: Pudding (grumpy), the old poster
  const E = EV, m = W.mayor, s = W.sl.mayor; place(m, at(PODIUM, 0.6, 1.7, 0.4), 0.1, AV.mayor[1]); pose(m, 'idle', t);
  const c0 = L(2).start - 0.3, c1 = E.pudding - 0.15, wr = smooth(c0, c1, t);
  s.set('PUDDING', { write: wr, old: 'CAPTAIN SOCKS' });
  const sp = s.getWorldPosition(v3());
  if (t < c1 + 0.3) { const u = clamp((t - c0) / (c1 - c0)); aimArm(m, 1, sp.clone().add(side(m, lerp(0.7, -0.7, u))).add(fwd(m, 0.35)).add(v3(0, Math.sin(u * 30) * 0.15, 0)), 1 - smooth(c1, c1 + 0.3, t)); W.chalk.visible = true; W.chalk.position.copy(handOf(m, 1)).add(fwd(m, 0.1)); W.chalk.rotation.set(0.3, 0, 0.6); }
  face(m, t < c1 ? 'skeptic' : 'angry', t, 0.4, {}); lookAtP(m, t < c1 ? sp.clone().add(v3(0, -0.5, 0)) : at(PODIUM, 0.6, 5, 20), 0.6);
  // a sigh: shoulders and arms drop
  if (t > c1 + 0.3 && t < E.socks) aimArm(m, 0, H(m).add(side(m, 1.2)).add(v3(0, -2.6, 0)).add(fwd(m, 0.4)), 0.5);
  W.city.patch.visible = t > E.socks + 0.5; W.city.patch.position.y = 0.9 + 0.4 * (1 - smooth(E.socks + 0.5, E.socks + 0.7, t));
  poseCrowd(t, { yaw: 0, look: H(m) });
  CROWD.forEach(([k], i) => { const c = W[k]; c.root.position.copy(at(PODIUM, -10 + i * 2.6, 0, 9 + (i % 2) * 1.5)); c.root.rotation.y = Math.PI + (i - 1.5) * 0.15; lookAtP(c, H(m), 0.7); face(c, t > E.pudding ? 'grin' : 'happy', t, 0.2 + i * 0.3); });
  const n2 = W.n2; place(n2, at(STALL, 0, 0, -2.6), 0, 1); pose(n2, 'idle', t); face(n2, 'happy', t, 0.5);
}
function poseFount(t) {   // L3: the fountain, the plaque
  poseCrowd(t, {}); CROWD.forEach(([k], i) => { const c = W[k]; c.root.position.copy(v3(-14 + i * 7, 0, 14 + (i % 2) * 3)); });
  W.city.plaque.material.map = W.city.plaqueTex[3];
}
// ---- the collector's round (the morning after) ----
const COT = 2, COTS_SLAM = [1, 3, 4];
function cotP(i, x, y, z) { return W.city.cots[i].toW(x, y, z); }
function poseMorning(t) {   // L4-6: the collector walks in, knocks, asks; every door shuts
  const E = EV, cl = W.coll, cot = W.city.cots[COT];
  slates(false);
  const yaw = cot.yaw;
  const back = smooth(E.every - 0.1, E.every + 0.4, t), porch = lp3(cotP(COT, -0.6, 1.0, 9.9), cotP(COT, -3.0, 1.0, 10.4), back), door = cotP(COT, 0, 1.0, 7.5), oldAt = cotP(COT, 0.0, 1.0, 9.2);
  if (t < E.knock - 0.2) {   // walking up from the quay
    const A = v3(-8, 0, 18), B = cotP(COT, 1.6, 0, 16.5); const u = walkTo(cl, A, B, L(4).start - 0.6, E.knock - 0.2, t, 0.9, 'walk', AV.coll[1]); void u;
    face(cl, 'smug', t, 0.4); W.led.visible = true; W.led.open(0); W.led.position.copy(handOf(cl, 0)).add(v3(0, 0.6, 0)).add(fwd(cl, 0.25)); W.led.rotation.set(Math.PI / 2, cl.root.rotation.y, 0); W.led.scale.setScalar(0.8);
    aimArm(cl, 0, chestOf(cl).add(side(cl, 0.9)).add(v3(0, -0.5, 0)), 0.8);
  } else {
    place(cl, porch, lerp(yaw + Math.PI, yaw + 0.6, back), AV.coll[1]); pose(cl, 'idle', t);
    const kn = t < E.every; if (kn) { const ph = (t - E.knock) * 3.2; const tap = Math.max(0, Math.sin(ph * Math.PI)) * 0.25; aimArm(cl, 1, door.clone().add(v3(0, 5.2, 0)).add(fwd(cl, -0.6 * 0 - tap)), smooth(E.knock - 0.2, E.knock, t)); }
    aimArm(cl, 0, chestOf(cl).add(side(cl, 0.9)).add(v3(0, -0.5, 0)), 0.8);
    W.led.visible = true; W.led.open(0); W.led.scale.setScalar(0.8); W.led.position.copy(handOf(cl, 0)).add(v3(0, 0.6, 0)).add(fwd(cl, 0.25)); W.led.rotation.set(Math.PI / 2, cl.root.rotation.y, 0);
    face(cl, t > E.ask && t < E.shut ? 'smug' : 'happy', t, 0.4, { viseme: talk(5, t) });
    if (t > E.ask - 0.4) lookAtP(cl, H(W.n1), 0.7);
  }
  W.hat.rotation.x = -0.06;
  // the doors: the knocked one opens after the knock; the others stand ajar and slam on "every door shuts fast"
  const opened = smooth(E.every - 0.1, E.every + 0.4, t) * (1 - smooth(E.shut + 0.42, E.shut + 0.6, t));
  cot.door.rotation.y = 1.75 * opened;
  COTS_SLAM.forEach((i, j) => { const tS = E.shut + 0.75 + j * 0.22; W.city.cots[i].door.rotation.y = 1.3 * (1 - smooth(tS, tS + 0.14, t)) * smooth(E.knock, E.knock + 0.5, t); });
  // the old neighbour in the doorway
  if (opened > 0.3 && t < E.shut + 0.42) { const n1 = W.n1; place(n1, oldAt, yaw - 0.75, 1); pose(n1, 'idle', t); lookAtP(n1, H(cl), 0.6);
    const shake = t > E.shut - 0.05 ? Math.sin((t - E.shut) * 16) * 0.45 * (1 - smooth(E.shut + 0.4, E.shut + 0.5, t)) : 0; n1.neck.rotation.y += shake;
    face(n1, t > E.shut - 0.1 ? 'nervous' : 'surprised', t, 0.3); }
}
// ---- the flashback (sepia): the first Matilda ----
const DESK = v3(10, 0, 24);
function poseFlash(t) {
  const E = EV, f = W.founder, cl = W.coll; slates(false); W.statue.root.visible = false; W.stoneBook.visible = false;
  W.desk.visible = true; W.desk.position.copy(DESK);
  W.city.plaque.material.map = W.city.plaqueTex[t < E.paying ? 0 : t < E.made ? (t < E.paying + 0.6 ? 0 : t < E.paying + 0.9 ? 1 : t < E.paying + 1.15 ? 2 : 3) : 3];
  if (t < E.harbor) {   // signing the IOU at the desk on the quay, the tall hat beside her
    place(f, at(DESK, 0, 0, -2.4), 0, 1); pose(f, 'idle', t); face(f, 'smug', t, 0.4); lookAtP(f, at(DESK, 0, 3.6, 0.4), 0.7);
    const u = clamp((t - E.century - 0.2) / 1.6); aimArm(f, 1, at(DESK, lerp(-0.6, 0.8, u), 3.9 + Math.abs(Math.sin(u * 20)) * 0.12, 0.2), 1);
    W.quill.visible = true; W.quill.position.copy(handOf(f, 1)).add(v3(0, 0.3, 0)); W.quill.rotation.set(0.2, 0, -0.4);
    place(cl, at(DESK, 3.4, 0, -0.6), -Math.PI / 2 - 0.5, AV.coll[1]); pose(cl, 'idle', t); face(cl, 'happy', t, 0.4); lookAtP(cl, H(f), 0.7);
    aimArm(cl, 0, chestOf(cl).add(side(cl, 0.9)).add(v3(0, -0.5, 0)), 0.8);
    W.led.visible = true; W.led.open(0); W.led.scale.setScalar(0.8); W.led.position.copy(handOf(cl, 0)).add(v3(0, 0.6, 0)).add(fwd(cl, 0.25)); W.led.rotation.set(Math.PI / 2, cl.root.rotation.y, 0);
  } else if (t < E.paying) {   // the whole harbour: she spreads her arms at it
    place(f, v3(12, 0, 29.5), 0.2, 1); pose(f, 'idle', t); const k = smooth(E.harbor, E.harbor + 0.5, t);
    aimArm(f, 0, H(f).add(side(f, -2)).add(fwd(f, 0.6)).add(v3(0, 0.6, 0)), k); aimArm(f, 1, H(f).add(side(f, 2)).add(fwd(f, 0.6)).add(v3(0, 0.6, 0)), k);
    face(f, 'grin', t, 0.4); f.root.rotation.y = 0.2 + Math.sin((t - E.harbor) * 1.2) * 0.2 * k;
  } else if (t < E.made) {   // she chisels her own name off the plaque
    const pz = FOUNT.z + 12.6; place(f, v3(FOUNT.x - 0.6, 0, pz), Math.PI + 0.2, 1); pose(f, 'idle', t); face(f, 'focused', t, 0.4); lookAtP(f, v3(FOUNT.x, 2.0, FOUNT.z + 10.9), 0.6);
    const ch = v3(FOUNT.x - 0.8 + smooth(E.paying + 0.2, E.made - 0.2, t) * 1.6, 2.05, FOUNT.z + 11.15);
    aimArm(f, 0, ch, 1); const hit = Math.abs(Math.sin((t - E.paying) * 9)); aimArm(f, 1, ch.clone().add(v3(0.35, 0.5 + hit * 0.6, 0.6)), 1);
    W.chisel.visible = true; W.chisel.position.copy(ch).add(v3(-0.1, 0, 0.25)); W.chisel.rotation.set(-1.2, 0, 0.2);
    W.hammer.visible = true; W.hammer.position.copy(handOf(f, 1)).add(v3(0, 0.3, 0)); W.hammer.rotation.set(-0.6 - hit * 0.5, 0, 0.3);
  } else {   // the town wipes its slates, she conducts
    place(f, v3(-4.2, 0, 18.0), 0.35, 1); pose(f, 'idle', t); face(f, 'grin', t, 0.4);
    const cond = Math.sin((t - E.made) * 6); aimArm(f, 1, H(f).add(side(f, 1.4)).add(fwd(f, 0.8)).add(v3(0, 0.8 + cond * 0.4, 0)), 1);
    W.chalk.visible = true; W.chalk.position.copy(handOf(f, 1)); W.chalk.rotation.set(0, 0, 0.5);
    const row = [['n1', -5.4], ['n2', -1.8], ['n3', 1.8], ['n4', 5.4]];
    row.forEach(([k, x], i) => { const c = W[k]; place(c, v3(x, 0, 12.4 - Math.abs(x) * 0.12), -x * 0.03, AV[k][1]); pose(c, 'idle', t + i); const s = W.sl[k]; s.visible = true; s.cord.visible = true;
      const w = smooth(E.made + 0.2 + i * 0.15, E.made + 1.3 + i * 0.15, t); s.set(['OTTO', 'MAE', 'GUS', 'BEA'][i], { write: 1, wipe: w });
      const sp = s.getWorldPosition(v3()); if (w > 0 && w < 1) aimArm(c, 0, sp.clone().add(side(c, lerp(0.6, -0.6, w))).add(fwd(c, 0.3)).add(v3(0, Math.sin(t * 22 + i) * 0.1, 0)), 1);
      face(c, w > 0.5 ? 'nervous' : 'neutral', t, 0.3 + i * 0.2); lookAtP(c, H(f), 0.5); });
  }
}

// ================= Tilly's home =================
const TD = () => at(HS, 19.0, 0, -2.0);           // Tilly in the doorway
const CD = () => at(HS, 23.4, 0.6, -1.6);         // the collector on the porch
const MD = () => at(HS, 11.0, 0, -1.0);           // Mom in the hall
function poseHome(t) {   // L7: Tilly with her slate under the portrait; L8b-9: the kitchen, Brenda
  const E = EV, ti = W.tilly, mo = W.mom;
  if (t < E.kept) {
    const P0 = at(HS, -16, 0, -6.8); place(ti, P0, Math.PI / 2 + 0.3, AV.tilly[1]); pose(ti, 'idle', t);
    const up = t > E.grandma; face(ti, up ? 'happy' : 'grin', t, 0.4);
    if (up) lookAtP(ti, at(HS, -19.6, 6.4, -4), 0.55 * smooth(E.grandma, E.grandma + 0.5, t));
    // she pats her slate proudly
    return;
  }
  // the kitchen: Mom at the stove, Tilly wearing BRENDA
  const MP = at(HS, 1.8, 0, -7.2), TP = at(HS, 0.6, 0, -2.8);
  const turn = smooth(E.brenda + 0.3, E.brenda + 0.8, t);
  place(mo, MP, lerp(Math.PI - 0.2, yawTo(MP, TP), turn), 1); pose(mo, 'idle', t);
  if (turn < 0.6) { const st = at(HS, 1.3, 4.6, -10.7).add(v3(Math.sin(t * 5) * 0.25, 0, Math.cos(t * 5) * 0.25)); aimArm(mo, 1, st, 1 - turn); }
  else { aimArm(mo, 0, chestOf(mo).add(side(mo, 1.0)).add(v3(0, -0.6, 0)), 0.7); aimArm(mo, 1, chestOf(mo).add(side(mo, -1.0)).add(v3(0, -0.6, 0)), 0.7); }
  face(mo, t > E.really ? 'skeptic' : turn > 0.5 ? 'surprised' : 'happy', t, 0.4, { viseme: talk(9, t) }); lookAtP(mo, turn > 0.3 ? H(ti) : at(HS, 1.3, 4, -10.7), 0.8);
  place(ti, TP, yawTo(TP, MP), AV.tilly[1]); pose(ti, 'idle', t); face(ti, t > E.really ? 'grin' : 'happy', t, 0.4); lookAtP(ti, H(mo), 0.8);
  W.slT.visible = false; W.slT.cord.visible = false; W.slB.visible = true; W.slB.cord.visible = true;
  // hands behind her back (the real slate hidden there)
  for (const s of [0, 1]) aimArm(ti, s, ti.root.position.clone().add(v3(0, 2.0 * SC(ti), 0)).add(fwd(ti, -0.9)).add(side(ti, s ? -0.25 : 0.25)), 0.85);
  W.mom.visible = true;
}
function poseLine(t) {   // L8a: everyone queues at the stall for new slates; Tilly slips away with hers
  const E = EV, ti = W.tilly;
  const q = [['n1', -2.4], ['n3', 0.4], ['n4', 3.0]]; q.forEach(([k, x], i) => { const c = W[k]; place(c, at(STALL, x, 0, 3.0 + i * 0.3), Math.PI + (i - 1) * 0.2, AV[k][1]); pose(c, 'idle', t + i); face(c, 'neutral', t, 0.3 + i * 0.2); });
  const n2 = W.n2; place(n2, at(STALL, 0, 0, -2.6), 0, 1); pose(n2, 'idle', t); face(n2, 'happy', t, 0.5);
  const A = at(STALL, 5.2, 0, 4.8), B = at(STALL, 6.8, 0, 11.5); walkTo(ti, A, B, E.kept + 0.15, E.brenda + 0.2, t, 0.9, 'walk', AV.tilly[1]);
  face(ti, 'grin', t, 0.4); lookAtP(ti, at(STALL, 7.6, 4.6, 20), 0.5);
  const sp = W.slT.getWorldPosition(v3()); aimArm(ti, 0, sp.clone().add(fwd(ti, 0.25)).add(side(ti, 0.3)), 0.9); aimArm(ti, 1, sp.clone().add(fwd(ti, 0.25)).add(side(ti, -0.3)), 0.9);
}
let shardT = -1;
function poseStep(t) {   // L10-20 at the front door (the next morning)
  const E = EV, ti = W.tilly, cl = W.coll, mo = W.mom, R = W.home;
  // the door: knocked, opened, slammed at the end
  const op = smooth(E.morning + 0.9, E.morning + 1.5, t) * (1 - smooth(E.shutE + 0.35, E.shutE + 0.52, t));
  R.door.rotation.y = -1.5 * op;
  const ccd = CD(), tdd = TD();
  // ---- the collector ----
  const bump = smooth(E.shutE + 0.5, E.shutE + 0.6, t) * (1 - smooth(E.shutE + 0.9, E.shutE + 1.6, t));
  const turnOut = smooth(E.shutE + 1.15, E.shutE + 1.6, t);
  place(cl, ccd.clone().add(v3(bump * 0.25, 0, 0)), -Math.PI / 2 + turnOut * 2.6, AV.coll[1]); pose(cl, 'idle', t);
  W.hat.rotation.x = -0.06 - bump * 0.5;
  const ledOpen = t > E.reads - 0.6 && t < E.custom + 0.4 ? smooth(E.reads - 0.6, E.reads - 0.1, t) : t > E.shutE + 1.6 ? smooth(E.shutE + 1.7, E.shutE + 2.1, t) : 0;
  const lp = chestOf(cl).add(fwd(cl, 0.75)).add(v3(0, -0.45, 0));
  W.led.visible = !(t > E.custom + 0.4 && t < E.shutE + 1.6); W.led.scale.setScalar(0.8); W.led.open(ledOpen);
  if (ledOpen > 0.01) { W.led.position.copy(lp).add(side(cl, 0.55)); W.led.rotation.set(0, cl.root.rotation.y + Math.PI / 2, -0.35); aimArm(cl, 0, lp.clone().add(side(cl, 0.9)), 1); aimArm(cl, 1, lp.clone().add(side(cl, -0.2)), 1); }
  else { aimArm(cl, 0, chestOf(cl).add(side(cl, 0.9)).add(v3(0, -0.5, 0)), 0.8); W.led.position.copy(handOf(cl, 0)).add(v3(0, 0.6, 0)).add(fwd(cl, 0.25)); W.led.rotation.set(Math.PI / 2, cl.root.rotation.y, 0); }
  // the knock
  if (t < E.morning + 0.9) { const ph = (t - E.morning) * 3.4, tap = Math.max(0, Math.sin(ph * Math.PI)) * 0.25; aimArm(cl, 1, at(HS, 20.9, 5.6, -0.6).add(v3(tap, 0, 0)), smooth(E.morning - 0.1, E.morning + 0.1, t)); }
  // the bill: out on "it wasn't a custom", unrolled down the steps on "hiding", held through "with interest"
  const billOn = t > E.custom + 0.4 && t < E.shutE + 0.3;
  W.bill.visible = billOn;
  if (billOn) { const hp = chestOf(cl).add(fwd(cl, 0.6)).add(v3(0, -0.2, 0)); aimArm(cl, 1, hp.clone().add(side(cl, -0.25)), 1); aimArm(cl, 0, hp.clone().add(side(cl, 0.5)), 1);
    W.bill.position.copy(hp); W.bill.rotation.set(-0.28, cl.root.rotation.y, 0); W.bill.unroll(smooth(E.hiding - 0.3, E.hiding + 0.9, t) * 0.9 + 0.1 * smooth(E.custom + 0.4, E.custom + 0.8, t)); }
  const cline = [11, 17].find((i) => t > L(i).start && t < L(i).end);
  face(cl, t > E.shutE + 1.6 ? 'skeptic' : t > E.shutE + 0.45 ? 'shocked' : t > E.sorry ? 'surprised' : t > E.lick ? 'skeptic' : t > E.drop ? 'smug' : t > E.me ? 'grin' : 'smug', t, 0.4, { viseme: cline !== undefined ? talk(cline, t) : t > E.shutE + 1.75 && t < E.shutE + 2.9 ? visemeAt('Hmm Brenda', E.shutE + 1.75, E.shutE + 2.9, t) : undefined });
  if (t < E.shutE + 0.4) lookAtP(cl, H(ti), 0.7); else if (t > E.shutE + 1.6) lookAtP(cl, lp.clone(), 0.6);
  // ---- Tilly ----
  const toCam = t > E.sorry ? 0.0 : 0;
  place(ti, tdd, Math.PI / 2 + toCam, AV.tilly[1]); pose(ti, 'idle', t);
  const shutPush = smooth(E.shutE + 0.15, E.shutE + 0.45, t);
  if (t > E.shutE) { aimArm(ti, 1, at(HS, 20.0, 4.0, -0.4), shutPush * (1 - smooth(E.shutE + 0.6, E.shutE + 0.9, t))); }
  W.slT.visible = true; W.slT.cord.visible = true; W.slB.visible = false; W.slB.cord.visible = false;
  const wipeK = smooth(E.wipe + 0.1, E.wipe + 1.0, t); W.slT.set('TILLY', { write: 1, wipe: wipeK });
  const lick = smooth(E.lick + 0.2, E.lick + 0.45, t) * (1 - smooth(E.lick + 0.75, E.lick + 0.95, t));
  if (lick > 0) aimArm(ti, 1, mouthOf(ti).add(side(ti, -0.32)).add(v3(0, -0.12, 0)), lick);
  if (t > E.wipe - 0.1 && t < E.wipe + 1.2) { const sp = W.slT.getWorldPosition(v3()), u = clamp((t - E.wipe - 0.1) / 0.9); aimArm(ti, 1, sp.clone().add(side(ti, lerp(0.55, -0.6, u))).add(fwd(ti, 0.2)).add(v3(0, Math.sin(u * 16) * 0.1, 0)), smooth(E.wipe - 0.1, E.wipe + 0.1, t) * (1 - smooth(E.wipe + 1.0, E.wipe + 1.2, t))); }
  if (t > E.me && t < E.drop + 0.4) { const sp = W.slT.getWorldPosition(v3()); aimArm(ti, 0, sp.clone().add(fwd(ti, 0.3)).add(side(ti, 0.2)), smooth(E.me, E.me + 0.2, t) * (1 - smooth(E.drop, E.drop + 0.4, t))); }
  const tline = [12, 19].find((i) => t > L(i).start && t < L(i).end);
  face(ti, t > E.shutE ? 'grin' : t > E.sorry ? 'happy' : t > E.lick ? 'smug' : t > E.interest ? 'nervous' : t > E.ledger ? 'surprised' : t > E.me ? 'grin' : t > E.reads ? 'happy' : 'surprised', t, 0.4, { viseme: tline !== undefined ? talk(tline, t) : undefined });
  lookAtP(ti, t > E.wipe && t < E.wipe + 1.0 ? W.slT.getWorldPosition(v3()) : H(cl), 0.8);
  // ---- Mom: in the hall with the teapot; drops it; then right behind Tilly ----
  const md = MD(); const come = smooth(E.custom - 0.2, E.custom + 0.8, t);
  place(mo, lp3(md, at(HS, 15.5, 0, -3.6), come), Math.PI / 2 - 0.2 * (1 - come), 1); pose(mo, come > 0 && come < 1 ? 'walk' : 'idle', t);
  W.slM.visible = true;
  const drop = E.drop + 0.35;
  if (t < drop) { const tp = chestOf(mo).add(fwd(mo, 0.55)).add(v3(0, -0.7, 0)); aimArm(mo, 0, tp.clone().add(side(mo, 0.5)), 1); aimArm(mo, 1, tp.clone().add(side(mo, -0.5)), 1); W.pot.visible = true; W.pot.position.copy(tp).add(v3(0, -0.4, 0)); W.pot.rotation.set(0, mo.root.rotation.y + Math.PI / 2, 0); W.potFrom = W.pot.position.clone(); }
  else { const u = t - drop, y0 = W.potFrom ? W.potFrom.y : 3; const yy = y0 - 16 * u * u; W.pot.visible = yy > 0.4; W.pot.position.copy(W.potFrom || md).setY(Math.max(0.4, yy)); W.pot.rotation.z = u * 5;
    const hitT = drop + Math.sqrt(Math.max(0, (y0 - 0.4) / 16)); W.shards.forEach((s, i) => { const d = t - hitT; s.visible = d > 0 && t < E.custom + 0.4; if (d > 0) { const a = i * 2.39, sp2 = 2 + (i % 4); s.position.copy(W.potFrom || md).setY(0.4).add(v3(Math.cos(a) * sp2 * Math.min(d, 0.5), Math.max(0.08, 3.2 * d - 9 * d * d) * (d < 0.4 ? 1 : 0) + 0.08, Math.sin(a) * sp2 * Math.min(d, 0.5))); s.rotation.set(d * 9 + i, i, 0); } }); shardT = hitT;
    const hands = smooth(drop, drop + 0.25, t) * (1 - come); aimArm(mo, 0, H(mo).add(side(mo, 1.4)).add(v3(0, -0.6, 0)), hands); aimArm(mo, 1, H(mo).add(side(mo, -1.4)).add(v3(0, -0.6, 0)), hands); }
  face(mo, t > E.shutE + 0.7 ? 'happy' : t > E.drop ? 'shocked' : 'happy', t, 0.5); lookAtP(mo, t > E.shutE + 0.7 ? H(ti) : H(cl), 0.6);
  if (t > E.shutE + 0.6) { mo.root.position.copy(at(HS, 16.8, 0, -4.2)); mo.root.rotation.y = yawTo(mo.root.position, tdd); lookAtP(mo, H(ti), 0.7); }
}

// ---- shots ----
function camOn(c, dist, ang = 0, dy = 0, lookDy = -0.7, fov = 54) { const h = H(c), a = c.root.rotation.y + ang * Math.PI / 180, s = SC(c); return { pos: h.clone().add(v3(Math.sin(a) * dist, dy, Math.cos(a) * dist)), look: h.clone().add(v3(0, lookDy * s, 0)), fov }; }
function shots() {
  const s = (i) => L(i).start, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  // L0 the harbour on Name Day; the slates
  add('open', 0, (u) => ({ pos: lp3(v3(6, 24, 76), v3(5, 22, 66), easeInOut(u)), look: v3(-2, 2, -6), fov: 54 }));
  add('slates', E.year - 0.05, (u) => ({ pos: lp3(v3(4, 6.0, 26), v3(-3, 6.0, 25), easeInOut(u)), look: lp3(v3(1, 3.8, 10), v3(-3, 3.8, 10), easeInOut(u)), fov: 56 }));
  // L1 the stall: Daisy wipes PEG, chalks DAISY
  add('stall', s(1) - 0.05, (u) => ({ pos: at(STALL, 2.0 - u * 0.8, 5.6, 15 - u * 1.5), look: at(STALL, 0, 4.0, -1.5), fov: 52 }));

  // L2 the mayor is Pudding; the old poster
  add('mayor', s(2) - 0.05, (u) => camOn(W.mayor, 13 - u * 1.0, 8, 0.2, -2.0, 52));
  add('socks', E.socks - 0.05, (u) => { const k = smooth(0.55, 1, u); return { pos: at(PODIUM, 2.6, lerp(1.8, 4.5, k), lerp(14, 20, k)), look: lp3(at(PODIUM, 2.6, 1.0, 3.6), H(W.mayor).add(v3(0, -1.8, 0)), k), fov: 50 }; });
  // L3 the fountain, the founder, the plaque
  add('fount', s(3) - 0.05, (u) => ({ pos: lp3(v3(9, 4.0, 26), v3(6, 5.0, 22), easeInOut(u)), look: v3(0, 7.2, -4), fov: 58 }));
  add('plaque', E.founder - 0.05, (u) => ({ pos: lp3(v3(1.6, 3.2, FOUNT.z + 18), v3(0.5, 2.4, FOUNT.z + 14.6), easeOut(u)), look: v3(0, 2.1, FOUNT.z + 10.9), fov: 44 }));
  // L4 the morning after: the tall hat walks in, knocks
  add('morning', s(4) - 0.05, (u) => ({ pos: lp3(v3(10, 16, 30), v3(8, 14, 26), easeInOut(u)), look: v3(-10, 3, -10), fov: 56 }));
  add('tall', E.tall - 0.05, (u) => { const c = W.coll, h = H(c); return { pos: h.clone().add(fwd(c, 9.5)).add(side(c, -2)).add(v3(0, -3.2, 0)), look: h.clone().add(v3(0, -1.2, 0)), fov: 56 }; });
  add('knock', E.knock - 0.05, (u) => ({ pos: cotP(COT, 4.5 - u * 0.4, 6.4, 19.5), look: cotP(COT, -0.4, 5.2, 8.6), fov: 54 }));
  add('row', E.every - 0.05, (u) => ({ pos: lp3(v3(-26, 7, -4), v3(-24, 7.4, -7), easeInOut(u)), look: v3(-28, 4.2, -38), fov: 56 }));
  // L5 "Any Hargreaves here?"; L6 every door shuts fast
  add('ask', s(5) - 0.05, (u) => ({ pos: cotP(COT, 1.5 - u * 0.3, 6.2, 18.5 - u * 0.5), look: cotP(COT, -2.0, 5.6, 10.0), fov: 52 }));
  add('slam', E.shut + 0.3, (u) => ({ pos: cotP(COT, 3.0, 6.0, 19.5), look: cotP(COT, 0, 5.0, 8.0), fov: 54 }));
  add('doors', E.shut + 0.7, (u) => ({ pos: lp3(v3(8, 7.6, 2), v3(6, 7.6, 0), u), look: v3(-12, 4, -40), fov: 58 }));
  // L7 Tilly loved her name; the portrait
  add('tilly', s(7) - 0.05, (u) => camOn(W.tilly, 8.5 - u * 0.6, 0, 0.6, -1.2, 54));
  add('portrait', E.grandma - 0.05, (u) => camOn(W.tilly, 7.8 - u * 0.4, -22, 1.4, 0.4, 56));
  // L8 she kept it; Brenda; L9 "Brenda? Really?"
  add('kept', s(8) - 0.05, (u) => ({ pos: at(STALL, 8.5, 5.0, 24 - u * 2), look: H(W.tilly).add(v3(0, -1.2, 0)), fov: 54 }));
  add('kitchen', E.brenda - 0.05, (u) => ({ pos: lp3(at(HS, 13.5, 5.4, -4.4), at(HS, 12.6, 5.3, -4.6), easeInOut(u)), look: at(HS, 1.2, 3.4, -5.0), fov: 58 }));
  add('really', s(9) - 0.05, (u) => camOn(W.mom, 7.5 - u * 0.4, 18, 0.2, -1.0, 52));
  // L10 next morning: the knock, the door, the tall hat on the doorstep
  add('knock2', s(10) - 0.05, (u) => ({ pos: lp3(at(HS, 33, 6.6, 7.5), at(HS, 31.5, 6.4, 6.4), easeInOut(u)), look: at(HS, 21.6, 5.2, -1.6), fov: 54 }));
  add('loom', E.doorstep - 0.05, (u) => ({ pos: at(HS, 16.9 - u * 0.3, 3.2, -3.9), look: H(W.coll).add(v3(0, -0.8, 0)), fov: 56 }));
  // L11 "Matilda Hargreave?"; L12 "That's me!"; L13 the teapot
  add('reads', s(11) - 0.05, (u) => ({ pos: at(HS, 15.0 - u * 0.4, 6.0, 1.2), look: H(W.coll).add(v3(0, -1.2, 0)), fov: 52 }));
  add('me', s(12) - 0.05, (u) => ({ pos: at(HS, 22.6 - u * 0.2, 5.0, -3.6), look: H(W.tilly).add(v3(0, -0.7, 0)), fov: 50 }));
  add('drop', s(13) - 0.05, (u) => ({ pos: at(HS, 15.6 - u * 0.4, 5.2, 4.2), look: at(HS, 11.2, 3.0, -1.0), fov: 56 }));
  // L14 the ledger; the flashback
  add('ledger', s(14) - 0.05, (u) => { const p = W.led.getWorldPosition(v3()), c = W.coll; return { pos: p.clone().add(fwd(c, -0.9)).add(side(c, 1.2)).add(v3(0, 2.6 - u * 0.3, 0)), look: p.clone().add(fwd(c, 0.2)), fov: 46 }; });
  add('century', E.century - 0.05, (u) => ({ pos: lp3(at(DESK, 2.5, 6.5, 13), at(DESK, 1.8, 6.2, 11.5), easeInOut(u)), look: at(DESK, 1.2, 4.0, -1.2), fov: 56 }));
  add('harbor', E.harbor - 0.05, (u) => ({ pos: lp3(v3(12, 4.4, 40), v3(12, 4.4, 38.5), easeOut(u)), look: v3(12, 5.0, 29.5), fov: 56 }));
  // L15 she chisels her name off; the town wipes its slates
  add('chiselF', s(15) - 0.05, (u) => ({ pos: v3(FOUNT.x - 6.5, 4.4, FOUNT.z + 10.0 + u * 0.4), look: v3(FOUNT.x - 0.4, 3.6, FOUNT.z + 11.0), fov: 54 }));
  add('wipeAll', E.made - 0.05, (u) => ({ pos: lp3(v3(-1.5, 7, 33), v3(-2, 6.6, 31), easeInOut(u)), look: v3(-3, 4, 13), fov: 56 }));
  // L16 not a custom: the bill; hiding from one bill
  add('custom', s(16) - 0.05, (u) => ({ pos: at(HS, 15.2 - u * 0.4, 6.2, 2.6), look: at(HS, 21.5, 5.0, -1.8), fov: 56 }));
  add('hiding', E.hiding - 0.1, (u) => ({ pos: lp3(at(HS, 29.5, 7.5, 6.5), at(HS, 30.2, 7.8, 7.2), easeOut(u)), look: at(HS, 23, 4, -1.6), fov: 56 }));
  // L17 "With interest..."
  add('interest', s(17) - 0.05, (u) => ({ pos: at(HS, 15.0, 5.8, -0.6 - u * 0.3), look: H(W.coll).add(v3(0, -0.8, 0)), fov: 52 }));
  // L18 the thumb, the wipe; L19 "Wrong house. I'm Brenda."
  add('lick', s(18) - 0.05, (u) => ({ pos: at(HS, 22.4, 4.8, -4.4 + u * 0.2), look: H(W.tilly).add(v3(0, -0.8, 0)), fov: 50 }));
  add('wipe', E.wipe - 0.05, (u) => { const sp = W.slT.getWorldPosition(v3()); return { pos: sp.clone().add(v3(2.7 - u * 0.2, 0.7, -0.9)), look: sp.clone(), fov: 44 }; });
  add('sorry', s(19) - 0.05, (u) => ({ pos: at(HS, 26.5 - u * 0.4, 5.6, -5.5), look: H(W.tilly).add(v3(0, -0.75, 0)), fov: 50 }));
  // L20 she shuts the door; the tall hat left blinking
  add('shut', s(20) - 0.05, (u) => ({ pos: at(HS, 33, 7, 10), look: at(HS, 21.5, 5.0, -1.8), fov: 52 }));
  add('blink', E.shutE + 1.1, (u) => ({ pos: at(HS, 32.5 - u * 0.6, 6.8, 1.5), look: H(W.coll).add(v3(0, -1.0, 0)), fov: 50 }));
  Sx.sort((a, b) => a.t0() - b.t0());
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
const KEYS = { open: 'harbor', slates: 'harbor', stall: 'stall', write: 'stall', mayor: 'mayor', socks: 'mayor', fount: 'fount', plaque: 'fount',
  morning: 'morning', tall: 'morning', knock: 'morning', row: 'morning', ask: 'morning', slam: 'morning', doors: 'morning',
  tilly: 'home', portrait: 'home', kept: 'line', kitchen: 'home', really: 'home',
  knock2: 'step', loom: 'step', reads: 'step', me: 'step', drop: 'step', ledger: 'step', century: 'flash', harbor: 'flash', chiselF: 'flash', wipeAll: 'flash',
  custom: 'step', hiding: 'step', interest: 'step', lick: 'step', wipe: 'step', sorry: 'step', shut: 'step', blink: 'step' };

function renderAt(t) {
  let sh = shotAt(W.shots, t); let key = KEYS[sh.name];
  const E = EV;
  if (LINEUP) key = 'lineup';
  const set = key === 'home' || key === 'step' ? 'home' : key === 'lineup' ? 'lu' : 'city';
  const env = key === 'flash' ? SEPIA : key === 'morning' || key === 'step' ? (set === 'home' && (sh.name === 'drop' || sh.name === 'ledger') ? MORN : MORN) : set === 'home' ? ROOM : SUNNY;
  applyEnv(ctx, set === 'home' && key === 'step' && ['drop'].includes(sh.name) ? { ...ROOM, ...{} } : env);
  W.city.visible = set === 'city' || set === 'lu'; W.home.visible = set === 'home';
  W.pt.forEach((l) => { l.intensity = l.userData.set === set ? l.userData.I : 0; });
  hideAll(); slates(true); W.slT.visible = true; W.slT.cord.visible = true; W.slB.visible = false; W.slB.cord.visible = false; W.slM.visible = true;
  for (const k of ['chalk', 'led', 'bill', 'pot', 'quill', 'hammer', 'chisel', 'desk']) W[k].visible = false; W.shards.forEach((s) => { s.visible = false; });
  W.city.patch.visible = false; W.city.plaque.material.map = W.city.plaqueTex[3]; W.city.cots.forEach((c) => { c.door.rotation.y = 0; });
  W.sl.mayor.set('PUDDING'); W.sl.n2.set('DAISY'); ['n1', 'n3', 'n4', 'k1'].forEach((k, i) => W.sl[k].set(['BIG TED', 'SPUD', 'ZIGGY', 'ROCKET'][i])); W.slT.set('TILLY'); W.hat.rotation.x = -0.06;
  // the statue on its plinth, pointing out to sea, a book under its arm
  { const st = W.statue; place(st, W.city.statueAt, 0.1, 1); pose(st, 'idle', 0); aimArm(st, 1, H(st).add(fwd(st, 3)).add(side(st, -0.6)).add(v3(0, 1.4, 0)), 1); aimArm(st, 0, chestOf(st).add(side(st, 1.0)).add(v3(0, -0.4, 0)), 0.8); st.root.updateMatrixWorld(true); W.stoneBook.visible = true; W.stoneBook.position.copy(handOf(st, 0)).add(v3(0, 0.7, 0)); W.stoneBook.rotation.y = st.root.rotation.y; st.root.visible = set === 'city'; }
  W.city.water.update(t); W.city.boats.forEach((b, i) => { b.position.y = b.userData.base.y + Math.sin(t * 1.1 + i * 1.7) * 0.18; b.rotation.z = Math.sin(t * 0.9 + i) * 0.03; });
  W.city.jets.forEach((j, i) => { j.scale.y = 1 + Math.sin(t * 9 + i) * 0.06; });
  if (key === 'lineup') poseLineup(t);
  else ({ harbor: () => poseHarbor(t), stall: () => poseStall(t), mayor: () => poseMayor(t), fount: () => poseFount(t), morning: () => poseMorning(t),
    home: () => poseHome(t), line: () => poseLine(t), step: () => poseStep(t), flash: () => poseFlash(t) })[key]();
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  if (key === 'lineup') { const n = LINEUP.length, i = Math.floor(t) % n, hh = H(W['L' + i]), fr = t % 1; const ang = fr < 0.34 ? 0 : fr < 0.67 ? 0.7 : -0.7; sh = { name: 'lineup', pos: hh.clone().add(v3(Math.sin(ang) * 4.2, 0.2, Math.cos(ang) * 4.2)), look: hh.clone().add(v3(0, -0.5, 0)), fov: 46 }; }
  if (Q.get('dbgpos')) console.error('t', t, sh.name, 'cam', sh.pos.toArray().map((x) => x.toFixed(1)).join(','), W.all.filter((c) => c.root.visible).map((c) => c.key + '@' + c.root.position.toArray().map((x) => x.toFixed(1)).join(',')).join(' | '));
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2 * SC(c), 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * SC(c); c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2] * SC(c), Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  if (ctx.thumbMode) { sh = { ...sh, pos: at(HS, +(Q.get('tx') || 26.2), +(Q.get('ty') || 5.8), +(Q.get('td') || -5.6)), look: H(W.tilly).add(v3(0, +(Q.get('tl') || 0.6), 0)), fov: +(Q.get('tf') || 54) }; }
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  frame(ctx, t, sh, { steady: t < 2.4 || Q.get('steady') === '1', shake: 0, shadowSpan: set === 'city' ? 80 : 45, shadows: true, black: 0, flash: key === 'flash' ? Math.max(0, 1 - Math.abs(t - E.century) / 0.18) * 0.35 + Math.max(0, 1 - Math.abs(t - E.custom) / 0.18) * 0 : Math.max(0, 1 - Math.abs(t - E.custom) / 0.18) * 0.3, flashColor: '#fff4e0' });
  return sh.name;
}
function poseLineup(t) {
  const n = LINEUP.length; LINEUP.forEach((k, i) => { const c = W['L' + i]; place(c, at(LU, (i - (n - 1) / 2) * 4.2, 0, 0), 0); pose(c, 'idle', 0); face(c, t % 1 > 0.5 ? 'happy' : 'surprised', 0, 0, { noBlink: true }); });
}

export async function setup() {
  const avs = [...new Set([...Object.values(AV).map((a) => a[0]), ...(LINEUP || [])])];
  ctx = await initStage('ep102', { look: 'pro', avatars: avs }); L = ctx.L;
  try { CAP = (await (await fetch('/build/ep102/timeline.json')).json()).captions || []; } catch (e) { CAP = []; }
  EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smug', 'grin', 'focused', 'shocked', 'surprised', 'nervous', 'scared', 'angry', 'skeptic', 'blink']);
  const { scene, camera } = ctx; camera.far = 3000; camera.near = 0.1; camera.updateProjectionMatrix();
  W.city = gullhaven(); scene.add(W.city);
  W.home = hargreaveHome(); W.home.position.copy(HS); scene.add(W.home);
  W.chalk = chalk(); scene.add(W.chalk);
  W.led = ledger(); scene.add(W.led);
  W.bill = billScroll(); scene.add(W.bill);
  W.pot = teapot(); scene.add(W.pot);
  W.shards = Array.from({ length: 10 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22 + (i % 3) * 0.08, 0.06, 0.16 + (i % 2) * 0.1), paint(i % 3 ? '#f6f1e6' : '#3f7fd0', { roughness: 0.25 })); m.castShadow = true; scene.add(m); return m; });
  W.quill = quill(); scene.add(W.quill);
  W.hammer = hammer(); scene.add(W.hammer); W.chisel = chisel(); scene.add(W.chisel);
  W.desk = (() => { const g = new THREE.Group(), b = new Batch(), w = surf('plank', '#8a5a34'); b.box(w, 4.6, 0.3, 2.6, 0, 3.4, 0, { r: 0.06 }); for (const [x, z] of [[-2, -1], [2, -1], [-2, 1], [2, 1]]) b.box(paint('#5a3a22'), 0.3, 3.4, 0.3, x, 1.7, z, { r: 0.05 });
    b.box(paint('#f4ead2', { roughness: 0.85 }), 1.6, 0.04, 2.0, 0.2, 3.58, 0.1, { r: 0.01 }); b.done(g); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g; })(); scene.add(W.desk);
  const PL = (c, I, d, set, p) => { const l = new THREE.PointLight(c, I, d, 1.5); if (p) l.position.copy(p); l.userData.I = I; l.userData.set = set; scene.add(l); return l; };
  W.pt = [PL('#fff0d0', 150, 40, 'home', at(HS, 0, 12, 4)), PL('#ffe2b0', 80, 30, 'home', at(HS, 14, 10, 2)), PL('#ffe8c8', 70, 26, 'home', at(HS, -12, 10, 2))];
  people();
  if (LINEUP) LINEUP.forEach((a, i) => { const c = makeCharacter({ avatar: a, alti: true, skin: skinOf(a), caustic: false, scale: 1 }); scene.add(c.root); jointify(c); c.key = 'L' + i; W['L' + i] = c; W.all.push(c); });
  W.shots = shots();
  window.__ep102 = { W, THREE, ctx, L, EV };
  return expose(ctx, renderAt, EV.me - 0.25, EV);
}
