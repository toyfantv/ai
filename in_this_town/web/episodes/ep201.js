// LIM-001 "Now Serving 4,812" (script: video-farm stories/scripts/LIM-001_now_serving_4812.md). Backrooms / liminal, ~18 s, a loop.
// Wren has waited in an endless pale-green waiting room since she was nine, holding ticket 4813. The board finally calls 4813,
// and every still person in the room stands up holding the same ticket. The board clicks back; they all sit; "Close one."
// The last shot matches frame 0 (her hand, her ticket, the board), so the replay has no seam.
// Look: the Ponlai finish (engine/ponlook.js): height fog, metered exposure, local tone mapping, shadow contrast, a 32^3 grade.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DAY } from '../engine/stage.js';
import { dust } from '../engine/atmos.js';
import { jointify } from '../engine/infinitetower.js';
import { FARM } from '../engine/farm_cast.js';
import { model } from '../engine/library.js';
import { M, HALL, waitingHall, chairRows, ledBoard, frostedDoor, ticket, dispenser, scarf, needles, mop, patch } from '../engine/waitroom.js';
import { installPonlai, heightFog } from '../engine/ponlook.js';

const _DOWN = new THREE.Vector3(0, -1, 0), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3();
function aimArm(c, side, world, k = 1) { c.root.updateMatrixWorld(true); const a = c.arms[side], pw = a.parent.matrixWorld, sh = a.position.clone().applyMatrix4(pw); pw.decompose(_pp, _pq, _ps); const d = world.clone().sub(sh).applyQuaternion(_pq.clone().invert()).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(_DOWN, d), k); }
const lp3 = (a, b, u) => a.clone().lerp(b, u);
let ctx, L, EV;
const W = {};
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
// the five: [avatar, scale]
const AV = { wren: ['farm_ep35_girl', 0.9], old: ['farm_old_man', 1], knit: ['farm_ep35_nora', 0.97], jan: ['farm_ep31_janitor', 1], kid: ['farm_ep31_boy', 0.72] };
const LINEUP = Q.get('lineup') ? Q.get('lineup').split(',') : null;
const skinOf = (av) => (FARM[av.replace(/^farm_/, '')] || {}).skin || '#f2c79a';

// the hall: front wall at z = 0 (door + board), chairs in rows every 6 back along +z, an aisle down the middle
const ROWZ = (i) => 10 + i * 6, AISLE = 2.6, GAP = 1.95;
const DOORP = v3(0, 0, 0), BOARD = v3(0, HALL.boardY, 0.35);
const ROOM = { ...DAY, ...P({ top: '#eef3ea', horizon: '#dfeadf', haze: '#cfe0d2', sunColor: '#f6fff2', hemiSky: '#f4f8ef', hemiGround: '#d8d0b8' }),
  sunDir: v3(0.1, 1, 0.32), sunI: 1.55, sunDisc: 0, hemiI: 1.15, amb: 0.34, envI: 0.75, exposure: 1.0, bloom: 0.03, vig: 0, saturation: 1.06, contrast: 1.0,
  clarity: 0.3, bounce: 0.28, fogNear: 70, fogFar: 290, stars: 0, moon: 0, win: 0, lamp: 0 };

// ---- helpers (Remakes 11-14) ----
const armLen = (c) => { if (!c._alen) { c.reset(); const r = c.root.rotation.clone(), p = c.root.position.clone(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3(); c.arms[0].traverse((o) => { if (o.isMesh && !o.userData.worn) bx.expandByObject(o); }); c._alen = sh.y - bx.min.y - 0.12 * (c.spec.scale || 1); c.root.rotation.copy(r); c.root.position.copy(p); c.root.updateMatrixWorld(true); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.arms[side].localToWorld(v3(0, -armLen(c) / s, 0.1)); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.scale.set(1, 1, 1); c.head.rotation.set(0, 0, 0); c.arms.forEach((a) => a.quaternion.identity()); c.legs.forEach((l) => l.rotation.set(0, 0, 0)); c.hips.position.y = c.hipY ?? 2; c.torso.rotation.set(0, 0, 0); c.neck.rotation.set(0, 0, 0); }
function place(c, p, yaw) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; }
const HY = (c) => (c.hipY ?? 2) * (c.spec.scale || 1);
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const H = (c) => { c.root.updateMatrixWorld(true); const s = c.spec.scale || 1; return c.neck.getWorldPosition(v3()).add(v3(0, 0.8 * s, 0)); };
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.closed ? true : o.noBlink ? false : blinkAt(t, ph), viseme: o.viseme, gaze: o.gaze }); }
const talk = (i, t) => (t > L(i).start && t < L(i).end ? visemeAt(L(i).text, L(i).start, L(i).end, t) : undefined);
function lookAtP(c, p, k = 1) { c.root.updateMatrixWorld(true); const n = c.neck.getWorldPosition(v3()), a = wrap(yawTo(n, p) - c.root.rotation.y); c.neck.rotation.y = clamp(a, -1.2, 1.2) * k; c.neck.rotation.x = clamp(-Math.atan2(p.y - n.y - 0.6, Math.hypot(p.x - n.x, p.z - n.z)) * 0.6, -0.5, 0.12) * k; }
const fwd = (c, d = 1) => v3(Math.sin(c.root.rotation.y), 0, Math.cos(c.root.rotation.y)).multiplyScalar(d);
const sideOf = (c, d = 1) => { const f = fwd(c); return v3(f.z, 0, -f.x).multiplyScalar(d); };   // the character's left

// sit (k = 0) to stand (k = 1), on a chair whose seat is at (seat.x, seat.z) facing -z
function seatPose(c, seat, k, seatY) {
  const s = c.spec.scale || 1, yaw = Math.PI;
  const P0 = v3(seat.x, 0, seat.z - 0.15), P1 = v3(seat.x, 0, seat.z - 1.25);
  place(c, lp3(P0, P1, k), yaw);
  const e = 1 - k;
  const dh = (seatY - HY(c) + 0.1 * s) / s;      // hips drop onto the seat
  c.hips.position.y = (c.hipY ?? 2) + dh * e;
  c.legs.forEach((l, i) => { l.rotation.x = -1.5 * e; if (c.knee) c.knee[i].rotation.x = 1.5 * e; });
  c.torso.rotation.x = 0.28 * Math.sin(Math.PI * k) * (k < 1 ? 1 : 0);   // lean forward on the way up
}

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  const ding = e(3) + 0.3, rise = ding + 0.95, ins = rise + 0.72, half = ins + 4 * 0.34, click = half + 0.32;
  return { k2: s(2) + 0.02, k2b: 0, ding, rise, ins, half, click, sit: click + 0.36, close: s(4) - 0.1, end: e(4) + 0.02,
    thunk: s(2) + 2.3, vend: s(2) + 2.3 };
}
// the board: 4812, the flip to 4813 at the ding, back at the click
function boardNum(t) {
  const E = EV;
  if (t >= E.ding && t < E.click) { W.board.set(4813, { flip: t < E.ding + 0.07 ? 3 : -1 }); return 4813; }
  W.board.set(4812, { flip: t >= E.click && t < E.click + 0.07 ? 3 : -1 }); return 4812;
}
const standK = (t) => { const E = EV; const up = smooth(E.rise, E.rise + 0.42, t), down = smooth(E.sit, E.sit + 0.4, t); return up * (1 - down); };

// ---- people ----
function people() {
  for (const [k, [avatar, scale]] of Object.entries(AV)) {
    const c = makeCharacter({ avatar, alti: true, skin: skinOf(avatar), caustic: false, scale });
    ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c.key = k;
    c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c);
    W[k] = c;
  }
  W.all = Object.keys(AV).map((k) => W[k]);
  // a ticket each, creased differently
  W.tk = {}; Object.keys(AV).forEach((k, i) => { const t = ticket(4813, 3 + i * 5); ctx.scene.add(t); W.tk[k] = t; });
}
// the ticket in a hand, facing a point (the camera, or the board)
function holdTicket(c, key, faceTo, { side = 0, off = v3(), scale = 1, roll = 0 } = {}) {
  const tk = W.tk[key]; tk.visible = true; const hp0 = handOf(c, side), hp = hp0.clone().add(off).add(faceTo.clone().sub(hp0).normalize().multiplyScalar(0.38));
  tk.position.copy(hp); tk.lookAt(faceTo); tk.rotateZ(roll); tk.scale.setScalar(scale * (c.spec.scale || 1));
  return tk;
}

// ---- the room's people, every shot (they all exist all the time; only the camera changes) ----
function stage(t, camPos) {
  const E = EV, sk = standK(t), seatY = W.chairs.seatY;
  const look = (c) => lookAtP(c, BOARD, 0.8);
  // Wren: front row, aisle seat; the backpack on her lap; the ticket in her right hand (arms[0])
  { const c = W.wren, st = W.seat.wren; const k = t >= E.half - 0.05 && t < E.click ? sk * 0.62 : sk; seatPose(c, st, k, seatY);
    const e = 1 - k;
    face(c, t >= E.ding && t < E.sit + 0.3 ? 'surprised' : 'neutral', t, 0.15, { noBlink: t >= E.ding && t < E.ding + 0.6 });
    lookAtP(c, BOARD, 0.75);
    const hand = H(c).add(v3(1.2, -0.95, -1.55)).add(v3(0, 0.6 * k, -0.3 * k));
    // turning the ticket over in her fingers during the push-in
    const turn = t > L(1).start && t < L(1).end ? Math.sin((t - L(1).start) * 3.2) * 0.9 : 0;
    aimArm(c, 0, hand, 1); aimArm(c, 1, H(c).add(v3(-0.55, -2.2 + 0.9 * k, -1.1)), 1);
    const tgt = camPos ? camPos : BOARD; holdTicket(c, 'wren', tgt, { side: 0, off: v3(0, 0.42, 0), roll: turn * 0.25, scale: W.tkScale || 1 });
    if (turn) W.tk.wren.rotateY(turn);
    const bp = W.backpack; bp.visible = true; bp.rotation.set(-0.12, Math.PI, 0);
    bp.position.set(st.x + 1.25, 0.02, st.z - 0.9); bp.rotation.set(0, Math.PI * 0.85, 0);   // on the floor by her chair, the aisle side
    void e;
  }
  // the old man: next seat in, upright; at the end he leans toward her without looking
  { const c = W.old, st = W.seat.old; seatPose(c, st, sk, seatY);
    const lean = smooth(E.close - 0.35, E.close + 0.1, t);
    c.torso.rotation.z = -0.13 * lean; c.root.position.x += 0.12 * lean;
    face(c, t > E.close - 0.2 ? 'smug' : 'neutral', t, 0.55, { viseme: talk(4, t) });
    lookAtP(c, t > E.close - 0.4 ? v3(-1, 5.2, -2) : BOARD, 0.7);
    aimArm(c, 0, H(c).add(v3(0.5, -2.5, -1.3 + 0.9 * sk)), 1); aimArm(c, 1, H(c).add(v3(-0.5 - 0.4 * sk, -2.5 + 0.75 * sk, -1.3 - 0.5 * sk)), 1);   // the ticket in his left hand, away from Wren
    if (sk > 0.02) holdTicket(c, 'old', camPos || BOARD, { side: 1, off: v3(0, -0.15, 0) });
  }
  // the knitter: second row, aisle seat across; needles click; the scarf runs off her lap into the aisle and away
  { const c = W.knit, st = W.seat.knit; seatPose(c, st, sk, seatY);
    face(c, t >= E.ding && t < E.sit + 0.3 ? 'surprised' : 'neutral', t, 0.7, {}); lookAtP(c, v3(st.x, 2.5, st.z - 3), 0.7 * (1 - sk)); if (sk > 0) lookAtP(c, BOARD, 0.8 * sk);
    const ph = t * 6.5, lap = v3(st.x, seatY + 1.25 + 0.75 * sk, st.z - 1.25 - 0.5 * sk);
    aimArm(c, 0, lap.clone().add(v3(-0.32, Math.sin(ph) * 0.08, 0)), 1); aimArm(c, 1, lap.clone().add(v3(0.32, -Math.sin(ph) * 0.08, 0)), 1);
    W.needles.visible = sk < 0.05; W.needles.position.copy(lap).add(v3(0, 0.02, -0.1)); W.needles.rotation.set(0.3, Math.sin(ph) * 0.15, 0);
    if (sk > 0.02) holdTicket(c, 'knit', camPos || BOARD, { side: 0, off: v3(0, -0.15, 0) }); else W.tk.knit.visible = false;
  }
  // the kid: legs swinging, staring up at the board, unblinking
  { const c = W.kid, st = W.seat.kid; seatPose(c, st, sk, seatY);
    if (sk < 0.02) { const sw = Math.sin(t * 4.2); c.legs[0].rotation.x += sw * 0.28; c.legs[1].rotation.x -= sw * 0.28; if (c.knee) { c.knee[0].rotation.x += sw * 0.2; c.knee[1].rotation.x -= sw * 0.2; } }
    face(c, t >= E.ding && t < E.sit + 0.3 ? 'surprised' : 'neutral', t, 0, { noBlink: true }); lookAtP(c, BOARD, 1.0);
    aimArm(c, 0, H(c).add(v3(0.4 + 0.3 * sk, -2.0 + 0.7 * sk, -0.6 - 0.6 * sk)), 1); aimArm(c, 1, H(c).add(v3(-0.4, -2.0, -0.6)), 1);
    if (sk > 0.02) holdTicket(c, 'kid', camPos || BOARD, { side: 0, off: v3(0, -0.2, 0) }); else W.tk.kid.visible = false;
  }
  // the janitor: mopping a dry floor in the aisle; straightens with his ticket; bends back to it
  { const c = W.jan, P0 = W.janP; place(c, P0, -Math.PI / 2 + 0.25); pose(c, 'idle', t);
    const mk = 1 - sk, ph = Math.sin(t * 2.6);
    c.torso.rotation.x = 0.3 * mk; c.hips.position.y -= 0.15 * mk;
    face(c, t >= E.ding && t < E.sit + 0.3 ? 'surprised' : 'neutral', t, 0.4, {}); lookAtP(c, sk > 0.1 ? BOARD : v3(P0.x - 3.0, 0, P0.z + ph * 1.2), 0.8);
    const head = v3(P0.x - 2.6 + 0.0, 0.25, P0.z + ph * 1.1);   // the mop head on the floor
    const mp = W.mop; mp.visible = true;
    if (sk < 0.5) {
      const top = H(c).add(v3(-0.3, -1.9, 0)); const dir = top.clone().sub(head).normalize();
      mp.position.copy(head).add(v3(0, -0.2, 0)); mp.quaternion.setFromUnitVectors(v3(0, 1, 0), dir);
      aimArm(c, 0, head.clone().lerp(top, 0.82), 1); aimArm(c, 1, head.clone().lerp(top, 0.62), 1);
      W.tk.jan.visible = false;
    } else {
      mp.position.set(P0.x - 0.6, 0, P0.z + 1.1); mp.quaternion.setFromUnitVectors(v3(0, 1, 0), v3(0.12, 1, -0.05).normalize());
      aimArm(c, 1, mp.position.clone().add(v3(0, 4.4, 0)), 1);
      aimArm(c, 0, H(c).add(v3(0, -1.75 + 0.2 * sk, 0)).add(fwd(c, 1.4)).add(sideOf(c, -0.6)), 1);
      holdTicket(c, 'jan', camPos || BOARD, { side: 0, off: v3(0, -0.15, 0) });
    }
  }
}

// ---- shots ----
// frame 0 and the last shot: over Wren's shoulder, her hand and ticket sharp under the board
const OPEN = () => ({ pos: W.openCam.pos.clone(), look: W.openCam.look.clone(), fov: W.openCam.fov });
function shots() {
  const s = (i) => L(i).start, e = (i) => L(i).end, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  const cap = (w, after) => { const c = ctx.TL.captions.find((x) => x.start >= after - 0.01 && x.text.toUpperCase().includes(w)); return c ? c.start : after; };
  add('open', 0, OPEN);
  add('wren', s(1) - 0.05, (u) => ({ pos: lp3(v3(1.2, 5.6, 2.6), v3(0.6, 5.4, 4.0), easeInOut(u)), look: v3(-2.8, 2.7, 10.2), fov: 56 }));
  add('knit', s(2) - 0.05, (u) => ({ pos: lp3(v3(1.3, 4.3, 11.6), v3(1.35, 4.2, 12.0), u), look: v3(2.4, 3.4, 16.5), fov: 58 }));
  add('mop', cap('LEAVES', s(2)) - 0.08, (u) => ({ pos: lp3(v3(-7.8, 4.6, 19.1), v3(-7.4, 4.5, 19.2), u), look: v3(-0.4, 2.6, 19.8), fov: 56 }));
  add('kid', cap('NOBODY GETS', s(2) + 1.5) - 0.08, (u) => { const k = W.kid, h = H(k); return { pos: h.clone().add(v3(-0.6 - 0.2 * u, -0.5, -4.9 + 0.3 * u)), look: h.clone().add(v3(0, -1.0, 0)), fov: 56 }; });
  add('door', s(3) - 0.05, (u) => ({ pos: lp3(v3(0, 1.4, 7.4), v3(0, 1.5, 6.4), easeInOut(u)), look: v3(0, 6.9, 0), fov: 62 }));
  add('ding', e(3) + 0.08, (u) => ({ pos: v3(0, 9.4, 13.0 - 0.6 * u), look: v3(0, 10.8, 0), fov: 52 }));
  add('rise', E.rise - 0.1, (u) => ({ pos: lp3(v3(-0.6, 8.8, 1.4), v3(-0.7, 8.6, 1.8), u), look: v3(-2.0, 3.4, 14), fov: 66 }));
  ['knit', 'jan', 'kid', 'old'].forEach((k, i) => add('h_' + k, E.ins + i * 0.34, () => W.insCam[k]));
  add('half', E.half, (u) => { const c = W.wren, h = H(c); return { pos: v3(-1.3, 4.6, 4.5 - 0.25 * u), look: h.clone().add(v3(-0.5, -0.6, 0)), fov: 60 }; });
  add('click', E.click - 0.08, (u) => ({ pos: v3(0, 9.4, 12.6 - 0.3 * u), look: v3(0, 10.8, 0), fov: 52 }));
  add('sit', E.sit, (u) => ({ pos: lp3(v3(-0.7, 8.6, 1.8), v3(-0.8, 8.5, 2.1), u), look: v3(-2.0, 3.4, 14), fov: 66 }));
  add('close', E.close - 0.25, (u) => ({ pos: lp3(v3(-3.4, 4.6, 0.8), v3(-3.5, 4.55, 1.4), u), look: v3(-4.4, 3.6, 10), fov: 60 }));
  add('end', E.end, OPEN);
  Sx.sort((a, b) => a.t0() - b.t0());
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}

function renderAt(t) {
  let sh = shotAt(W.shots, t);
  applyEnv(ctx, ROOM);
  W.hall.flick(t); W.dust.update(t);
  boardNum(t);
  W.all.forEach((c) => { c.root.visible = true; });
  Object.values(W.tk).forEach((x) => { x.visible = false; });
  if (LINEUP) { poseLineup(t); }
  else {
    // inserts need the ticket facing their own camera: pose once with the hand, then place the camera off the ticket
    const ins = sh.name.startsWith('h_') ? sh.name.slice(2) : null;
    W.tkScale = 1;
    stage(t, null);
    if (ins) {
      ctx.scene.updateMatrixWorld(true);
      const c = W[ins], tk = W.tk[ins], tp = tk.position.clone(), out = tp.clone().sub(H(c)).setY(0).normalize();
      void out; const cam = tp.clone().add(fwd(c, ins === 'kid' ? 2.4 : 3.0)).add(sideOf(c, ins === 'kid' || ins === 'old' ? 0.5 : -0.4)).add(v3(0, ins === 'kid' ? 0.7 : 0.25, 0));
      W.insCam[ins] = { pos: cam, look: tp.clone().add(v3(0, 0.12, 0)), fov: 46 };
      stage(t, cam); ctx.scene.updateMatrixWorld(true); W.insCam[ins].look = W.tk[ins].position.clone().add(v3(0, ins === 'old' ? 0.75 : 0.45, 0)); W.insCam[ins].fov = 50;
    } else if (sh.name === 'open' || sh.name === 'end' || sh.name === 'half' || sh.name === 'wren') {
      stage(t, sh.name === 'wren' || sh.name === 'half' ? null : sh.pos);
    }
  }
  ctx.scene.updateMatrixWorld(true);
  sh = shotAt(W.shots, t);
  { const dq = Q.get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2, 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2 * (c.spec.scale || 1); sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2], Math.cos(f) * dist)), look: hp.clone().add(v3(0, +(one[3] || 0), 0)), fov: 40 }; } }
  if (LINEUP) { const i = Math.floor(t) % LINEUP.length, x = (i - (LINEUP.length - 1) / 2) * 4.2, hh = H(W['L' + i]); sh = { name: 'lineup', pos: v3(x + (t % 1 > 0.5 ? 3.2 : 0), hh.y + 0.3, 30.5), look: v3(hh.x, hh.y - 0.6, hh.z), fov: 50 }; }
  if (ctx.thumbMode) sh = { ...sh, ...OPEN(0) };
  { const cq = Q.get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  frame(ctx, t, sh, { steady: true, shake: 0, shadowSpan: 36, shadows: true, black: 0, captionsOff: L(4).end + 0.02 });
  return sh.name;
}
function poseLineup(t) {
  const n = LINEUP.length; LINEUP.forEach((k, i) => { const c = W['L' + i]; place(c, v3((i - (n - 1) / 2) * 4.2, 0, 25), 0); pose(c, 'idle', 0); face(c, t % 1 > 0.5 ? 'happy' : 'neutral', 0, 0, { noBlink: true }); });
  W.all.forEach((c) => { c.root.visible = false; });
}

export async function setup() {
  const avs = [...new Set([...Object.values(AV).map((a) => a[0]), ...(LINEUP || [])])];
  const pf = ['pf_seminar_chair', 'pf_vending_machine', 'pf_mop_trolley', 'pf_floor_plant', 'pf_fire_extinguisher', 'pf_waste_bin', 'pf_pupil_backpack', 'pf_sanitiser'];
  ctx = await initStage('ep201', { look: 'pro', avatars: avs, models: pf }); L = ctx.L;
  EV = events();
  await loadAlti(['neutral', 'surprised', 'smug', 'happy', 'blink']);
  const { scene, camera } = ctx; camera.far = 900; camera.near = 0.05; camera.updateProjectionMatrix();
  // the set
  W.hall = waitingHall(); scene.add(W.hall);
  const rows = [];
  for (let i = 0; i < 44; i++) { rows.push({ x0: -AISLE, n: 5, z: ROWZ(i), dir: -1 }); rows.push({ x0: AISLE, n: 5, z: ROWZ(i), dir: 1 }); }
  W.chairs = chairRows(scene, rows, { gap: GAP });
  const seat = (r, side, i) => W.chairs.seats[r * 2 + (side > 0 ? 1 : 0)][i];
  W.seat = { wren: seat(0, -1, 0), old: seat(0, -1, 2), knit: seat(1, 1, 0), kid: seat(1, -1, 2) };
  W.janP = v3(0.3, 0, 19.6);
  W.board = ledBoard(); W.board.position.copy(BOARD); scene.add(W.board);
  W.door = frostedDoor(); W.door.position.set(0, 0, 0.12); scene.add(W.door);
  W.disp = dispenser(); W.disp.position.set(5.6, 0, 3.4); W.disp.rotation.y = -0.4; scene.add(W.disp);
  const prop = (n, h, x, z, ry = 0) => { const m = model(n, { parent: scene, height: h }); m.position.set(x, 0, z); m.rotation.y = ry; return m; };
  prop('pf_vending_machine', 1.9 * M, 12.6, 58, -Math.PI / 2);
  W.vglow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.2), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#e9f6ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.5 })); W.vglow.position.set(11.0, 3.8, 58); W.vglow.rotation.y = -Math.PI / 2; scene.add(W.vglow);
  prop('pf_floor_plant', 1.5 * M, -12.4, 3.0, 0.4); prop('pf_floor_plant', 1.5 * M, 12.4, 3.0, -0.6);
  prop('pf_waste_bin', 0.58 * M, 7.2, 3.6, -0.3);
  { const fe = prop('pf_fire_extinguisher', 0.55 * M, -14.4, 6.5, Math.PI / 2); fe.position.y = 2.2; }
  { const sn = prop('pf_sanitiser', 0.53 * M, 8.4, 0.5, 0); sn.position.y = 3.2; }
  prop('pf_mop_trolley', 1.02 * M, -0.3, 26.5, 0.3);
  W.backpack = model('pf_pupil_backpack', { parent: scene, height: 0.46 * M * 0.92 });
  { const p = patch(), k = 1 / W.backpack.scale.x; p.scale.setScalar(k * 0.8); p.position.set(0, 0.24, 0.16); W.backpack.add(p); }
  // the scarf: from the knitter's lap down into the aisle and away down the hall, past where it should end
  { const k = W.seat.knit, pts = [v3(k.x - 0.1, W.chairs.seatY + 1.1, k.z - 1.3), v3(k.x - 0.6, W.chairs.seatY + 0.2, k.z - 1.6), v3(k.x - 1.3, 0.05, k.z - 1.4), v3(0.9, 0.04, k.z + 1.5)];
    for (let z = k.z + 6, i = 0; z < 270; z += 8, i++) pts.push(v3(0.5 + Math.sin(i * 1.3) * 0.5, 0.04, z));
    W.scarf = scarf(pts); scene.add(W.scarf); }
  W.needles = needles(); scene.add(W.needles);
  W.mop = mop(); scene.add(W.mop);
  W.dust = dust(scene, { count: 420, color: '#f4f8ec', size: 28, height: 12, centre: v3(0, 6, 14), pointSize: 0.5, amount: 0.25 });
  // lights: the ceiling key is the stage's 'sun' (straight down, shadows); local lights for the door, the LED spill, the vending machine
  const PL = (c, I, d, p) => { const l = new THREE.PointLight(c, I, d, 1.6); l.position.copy(p); scene.add(l); return l; };
  W.pt = [PL('#fff8ec', 180, 26, v3(0, 4.2, -1.2)), PL('#ff3018', 16, 10, v3(0, 8.6, 1.0)), PL('#e6f4ff', 60, 16, v3(10.5, 4, 58)),
    PL('#f4fff0', 140, 30, v3(0, 12.5, 12)), PL('#f4fff0', 90, 30, v3(-6, 12.5, 26))];
  if (LINEUP) LINEUP.forEach((k, i) => { const c = makeCharacter({ avatar: k, alti: true, skin: skinOf(k), caustic: false, scale: 0.9 }); scene.add(c.root); jointify(c); W['L' + i] = c; });
  people();
  W.insCam = {}; for (const k of ['knit', 'jan', 'kid', 'old']) W.insCam[k] = { pos: v3(0, 5, 5), look: v3(0, 4, 10), fov: 40 };
  // frame 0 (and the last shot): her seated ticket sharp under the board
  { stage(0, null); ctx.scene.updateMatrixWorld(true); const T = W.tk.wren.position.clone();
    const pos = T.clone().add(v3(0.55, -0.15, 3.3)), look = T.clone().lerp(BOARD, 0.3).add(v3(-0.25, 0, 0)); W.openCam = { pos, look, fov: 60 }; console.warn('T', T.toArray().map((x) => x.toFixed(2)).join(','), 'H', H(W.wren).toArray().map((x) => x.toFixed(2)).join(','), 'S', H(W.wren).clone().add(v3(0, -1.3, 0)).toArray().map((x) => x.toFixed(2)).join(',')); }
  W.shots = shots();
  // the Ponlai finish: mint height fog that swallows the far hall, metered exposure, local tone, shadow contrast, the grade
  W.hf = heightFog(scene, { colour: '#cfe2d4', density: 0.0075, top: 3.0, falloff: 0.11 });
  W.pl = installPonlai(ctx, { key: 0.2, strength: 0.5, maxEV: 0.6,
    localTone: { hinge: 0.2, high: 0.3, low: 0.16, width: 110 }, shadowContrast: { pivot: 0.05, slope: 0.1 },
    lut: { white: [0.99, 1.0, 0.985], shadows: { tint: [-0.006, 0.004, 0.01], sat: 0.92 }, mids: { tint: [0, 0.004, -0.002], sat: 1.02 }, highs: { tint: [0.012, 0.008, -0.006], sat: 0.95 },
      contrast: 0.12, bands: [{ hue: 135, width: 40, chroma: -0.12, rotate: 6 }, { hue: 2, width: 22, chroma: 0.25, bright: 0.04 }, { hue: 28, width: 18, chroma: 0.08 }] } });
  window.__ep201 = { W, THREE, ctx, L, EV };
  return expose(ctx, renderAt, 0, EV);
}
