// Episode 38: The Recording From Tomorrow (Psychological Horror 4/5). Eli finds a video on his computer, TOMORROW_3AM: a hotel hallway, a door opens, Eli walks out, covered in
// dust and crying; it cuts to black. Next morning: "YOUR ROOM IS READY", a hotel address; he deletes it. That night his bedroom door turns into a hotel door, ROOM 013, and the
// wallpaper and carpet of the hotel creep out from it. The computer plays the video again: now it shows Eli in his bedroom, watching the computer. A taped porter steps out of the
// closet behind him (scare 1). He turns: nothing. On the screen the figure is closer, then closer again, until its face fills the recording (scare 2). "Stop watching." He slams
// the laptop shut; three slow knocks from inside; the bedroom door starts to open. It ends before anything comes through. All designs are original.
// The world: the bedroom at the origin (door and closet at z -12, desk at z +9.5), the corridor of the recording at HX along +z. "Footage" shots are the same scene through the tape pass.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, NIGHT } from '../engine/stage.js';
import { Batch, paint } from '../engine/kit.js';
import { dust, atmos } from '../engine/atmos.js';
import { canvasTex } from '../engine/props.js';
import { doorLeaf, plate } from '../engine/hotel.js';
import { aimArm as aimArm0, applyPose, sample, loadAnimSet } from '../engine/anims.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { bedroom, laptop, hotelHall, tapeHead, TapeShader, ROOM } from '../engine/cursedtape.js';
const aimArm = (c, side, p, k = 1) => { c.root.updateMatrixWorld(true); aimArm0(c, side, p, k); };

let ctx, L, EV;
const W = { eh: v3(), hand: v3(), fh: v3() };
const HX = v3(1000, 0, 0), lp3 = (a, b, u) => a.clone().lerp(b, u);
const ESKIN = '#f2c9a0';
const FEED_POS = v3(7.6, 9.9, 11.3), FEED_LOOK = v3(-1.6, 1.2, 0.6);

const ROOMN = { ...NIGHT, ...P({ top: '#05070e', horizon: '#080b14', haze: '#090c15', sunColor: '#a8bcdc', hemiSky: '#8092b8', hemiGround: '#3a342c' }), sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 0.95, amb: 0.2, envI: 0.42, exposure: 1.3, bloom: 0.03, fogNear: 200, fogFar: 600, saturation: 1.02, contrast: 1.06, bounce: 0.12, win: 0, lamp: 0 };
const MORN = { ...ROOMN, ...P({ top: '#bcd4ee', horizon: '#e8e2d6', haze: '#e8e2d6', sunColor: '#fff0da', hemiSky: '#f2ecde', hemiGround: '#a8957e' }), hemiI: 1.25, amb: 0.3, envI: 0.75, exposure: 1.0, bloom: 0.02, contrast: 1.04 };
const HOTELP = { ...ROOMN, ...P({ hemiSky: '#c4b08c', hemiGround: '#4a3020', haze: '#1a120c' }), hemiI: 0.95, amb: 0.24, envI: 0.34, exposure: 1.28, bloom: 0.03, fogNear: 60, fogFar: 180, saturation: 0.96 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  const TS = s(28) + 0.32;
  const k1 = e(29) + 0.16;
  return { click: s(2) + 0.42, feed0: s(3) - 0.2, doorOpen: s(4) - 0.05, out: s(5) - 0.05, cut: e(8) + 0.05, morn: s(9) - 0.06, night: s(13) - 0.05, swap: s(13) + 1.1, dig: [s(14) + 0.08, s(14) + 0.42, s(14) + 0.76], back0: s(16), back1: e(16) + 0.12, lit: s(17) + 0.05, S1: e(20) + 0.3, turn: s(21) + 0.3, look: s(23) + 0.05, S2: e(26) + 0.06, TS, knocks: [k1, k1 + 0.6, k1 + 1.22], opn: s(30) + 0.3, end: ctx.dur };
}

// ---- creeping hotel: radius in studs by time; the steps land on the flickers ----
function creepR(t) {
  const e = EV, s = (i) => L(i).start; let r = 0;
  for (const [a, R] of [[e.swap - 0.04, 2.5], [s(14) + 0.1, 4.5], [s(16), 7.0], [s(18), 10], [e.S1, 13.5], [s(24), 18], [s(26), 23], [e.S2, 30], [e.TS + 0.5, 36], [s(30), 46]]) r = lerp(r, R, smooth(a, a + 0.28, t));
  return r;
}
function flick(t) {
  const e = EV, s = (i) => L(i).start;
  const dips = [e.swap, s(16) - 0.05, s(18) - 0.1, s(24), s(26) + 0.5];
  for (const d of dips) if (t > d - 0.13 && t < d + 0.13) return Math.abs(t - d) < 0.07 ? 0.08 : 0.45;
  if (t > e.TS) return 0.62 * (0.85 + 0.15 * noise1(t * 17));
  return 1;
}

// ---- sets ----
function sets() {
  const { scene } = ctx, R = ROOM;
  W.U = { value: 0 }; W.room = bedroom(W.U); scene.add(W.room);
  // what's behind the bedroom door: a warm landing in the morning, black at night
  const dX = (R.dx0 + R.dx1) / 2;
  W.sky = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshBasicMaterial({ color: '#0e1830' })); W.sky.position.set(-13.2, 6.4, 0); W.sky.rotation.y = Math.PI / 2; W.sky.userData.noAO = true; W.room.add(W.sky);
  W.land = new THREE.Group(); const lb = new Batch(), lw = paint('#c7b18a', { roughness: 0.9 }); lb.box(paint('#6c5240', { roughness: 0.7 }), 22, 0.4, 13, dX - 2, -0.2, -19, { r: 0.02 }); lb.box(lw, 22, 12, 0.5, dX - 2, 6, -25.2, { r: 0.01 }); lb.box(lw, 0.5, 12, 13, dX + 9, 6, -19, { r: 0.01 }); lb.box(lw, 0.5, 12, 13, dX - 13, 6, -19, { r: 0.01 }); lb.box(paint('#e9e3d4'), 22, 0.4, 13, dX - 2, 12, -19, { r: 0.02 }); lb.done(W.land); W.room.add(W.land);
  W.black = new THREE.Mesh(new THREE.PlaneGeometry(R.dx1 - R.dx0, R.dh), new THREE.MeshBasicMaterial({ color: '#000000' })); W.black.position.set(dX, R.dh / 2, -12.5); W.black.userData.noAO = true; W.room.add(W.black);
  W.closetBlack = new THREE.Mesh(new THREE.PlaneGeometry(5, 8.7), new THREE.MeshBasicMaterial({ color: '#000000' })); W.closetBlack.position.set(-6.3, 4.35, -13.6); W.closetBlack.userData.noAO = true; W.room.add(W.closetBlack);
  // the warm light that slips round the door at the end
  const spillT = canvasTex(256, 512, (x, w, h) => { x.clearRect(0, 0, w, h); const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,190,110,0.9)'); g.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  W.spill = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 7), new THREE.MeshBasicMaterial({ map: spillT, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); W.spill.rotation.x = -Math.PI / 2; W.spill.position.set(dX, 0.09, -8.5); W.spill.userData.noAO = true; W.room.add(W.spill);
  // the door hangs from x1 (hinge), so the free edge is at x0 and it opens into the room
  W.doorG = new THREE.Group(); W.doorG.position.set(R.dx1, 0, -12.1); W.room.add(W.doorG);
  W.plain = new THREE.Group(); { const l = doorLeaf({ w: R.dx1 - R.dx0, h: R.dh - 0.05, color: '#d2ccbe', trim: '#ebe6da', rows: 2 }); l.rotation.y = Math.PI; W.plain.add(l); const sign = canvasTex(256, 340, (x, w, h) => { x.fillStyle = '#f2d04a'; x.fillRect(0, 0, w, h); x.fillStyle = '#1b1b1f'; x.font = '900 70px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('ELI', w / 2, 96); x.font = '800 44px ITTInter, sans-serif'; x.fillText('KNOCK', w / 2, 200); x.fillText('FIRST', w / 2, 260); }); sign.colorSpace = THREE.SRGBColorSpace; const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.8 })); p.position.set(-2.3, 6.5, 0.24); W.plain.add(p); } W.doorG.add(W.plain);
  W.hdoor = new THREE.Group(); { const l = doorLeaf({ w: R.dx1 - R.dx0, h: R.dh - 0.05, color: '#3c1e12', trim: '#4f2a1a' }); l.rotation.y = Math.PI; W.hdoor.add(l); const b = new Batch(); b.cyl(paint('#c89a42', { metalness: 0.9, roughness: 0.25 }), 0.14, 0.14, 0.08, -2.3, 5.5, 0.22, { rx: Math.PI / 2 }); b.cyl(paint('#0a0a0c'), 0.07, 0.07, 0.09, -2.3, 5.5, 0.23, { rx: Math.PI / 2 }); b.done(W.hdoor);
    W.roomBar = plate('ROOM', { w: 1.7, h: 0.48 }); W.roomBar.position.set(-2.3, 7.65, 0.24); W.hdoor.add(W.roomBar);
    W.dig = ['0', '1', '3'].map((n, i) => { const m = plate(n, { w: 0.62, h: 0.86, glow: 0.3 }); m.material.transparent = true; m.position.set(-2.3 + (i - 1) * 0.72, 6.75, 0.24); W.hdoor.add(m); return m; }); W.roomBar.material.transparent = true; } W.doorG.add(W.hdoor);
  W.lap = laptop(); W.lap.position.set(0, 4.0, 8.25); W.lap.rotation.y = Math.PI; W.room.add(W.lap);
  W.hotel = hotelHall(); W.hotel.position.copy(HX); scene.add(W.hotel);
  W.lblack = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ color: '#000000' }));
  // the numbered doors of the corridor; door 013 is the one that opens
  W.hd = []; W.hotel.doorZ.forEach((d, k) => [1, -1].forEach((s) => { const n = s > 0 ? 9 + 4 * k : 11 + 4 * k, g = new THREE.Group(); g.position.set(s * 8.15, 0, d + s * 2.4); const l = doorLeaf({ w: 4.8, h: 9.2, color: '#3c1e12', trim: '#4f2a1a' }); l.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(l); W.hotel.add(g); W.hd.push({ g, n, s, d }); const p = plate(String(n).padStart(3, '0'), { w: 1.3, h: 0.5 }); p.position.set(s * 7.95, 7.5, d - s * 3.5); p.rotation.y = -s * Math.PI / 2; W.hotel.add(p); }));
  W.d013 = W.hd.find((d) => d.n === 13); W.d013r = W.d013.g;
  const dz = W.d013.d, in013 = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 9.6), new THREE.MeshBasicMaterial({ color: '#030202' })); in013.position.set(8.9 + 1.5, 4.8, dz); in013.rotation.y = -Math.PI / 2; W.hotel.add(in013);
}

// ---- people ----
function people() {
  const mk = (avatar, skin) => { const c = makeCharacter({ avatar, alti: true, skin, caustic: false }); ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); c.root.visible = false; return c; };
  W.e = mk('farm_ep38_eli', ESKIN); W.ed = mk('farm_ep38_eli', ESKIN); W.mom = mk('farm_classic_mom'); W.maid = mk('farm_grandma_june'); W.fig = mk('farm_ep38_porter', '#cfc9bb');
  for (const c of [W.e, W.ed, W.mom, W.maid, W.fig]) { c.reset(); c.root.updateMatrixWorld(true); armLen(c); }
  // the dusty Eli: same avatar, the outfit greyed with plaster, a smear of white over him
  W.ed.root.traverse((o) => { if (o.isMesh && o.material && o !== W.ed.faceSheet) { const m = (Array.isArray(o.material) ? o.material : [o.material]).map((x) => { const c = x.clone(); c.color.multiplyScalar(0.92).lerp(new THREE.Color('#c9c3b4'), 0.5); return c; }); o.material = Array.isArray(o.material) ? m : m[0]; } });
  // the porter: his own head parts come off, a taped one goes on
  const bx = new THREE.Box3(); W.fig.headParts.forEach((m) => { m.geometry.computeBoundingBox(); bx.union(m.geometry.boundingBox); });
  W.fig.neck.traverse((o) => { if (o.isMesh) o.visible = false; });
  W.fh2 = v3(0, 6, 3); W.toC = v3(0.7, 0, 0.7); W.ehd = v3(0, 6, 0); W.fh = tapeHead(bx); W.fig.neck.add(W.fh); W.fh.traverse((o) => { o.visible = true; });
  W.bk = new THREE.Group(); const bb = new Batch(); bb.box(paint('#8e7147', { roughness: 0.85 }), 2.6, 1.3, 1.9, 0, 0, 0, { r: 0.12 }); ['#b34b3c', '#5a7ea3', '#e4dfd2', '#d4a64c'].forEach((c, i) => bb.box(paint(c, { roughness: 0.95 }), 0.9, 0.4, 0.8, -0.8 + i * 0.5, 0.7 + (i % 2) * 0.12, (i % 2) * 0.4 - 0.2, { r: 0.14 })); bb.done(W.bk); W.bk.visible = false; ctx.scene.add(W.bk);
}
function armLen(c) { if (!c._alen) { c.reset(); const r = c.root.rotation.clone(), p = c.root.position.clone(), s = c.root.scale.x; c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.scale.setScalar(1); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3().setFromObject(c.arms[0]); c._alen = sh.y - bx.min.y - 0.25; c.root.rotation.copy(r); c.root.position.copy(p); c.root.scale.setScalar(s); } return c._alen; }
const handOf = (c, side) => { c.root.updateMatrixWorld(true); return c.arms[side].localToWorld(v3(0, -armLen(c), 0.12)); };
function place(c, p, yaw) { c.root.visible = true; c.reset(); c.root.position.copy(p); c.root.rotation.set(0, yaw, 0); c.root.scale.setScalar(1); }
function sitOn(c, p, yaw, y, t) { place(c, p, yaw); pose(c, 'sit', t); const hy = c.hips.position.y; c.root.position.y = y - (hy - 0.55); }
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.noBlink ? false : blinkAt(t, ph) && !['shocked', 'terrified'].includes(name), viseme: o.viseme, gaze: o.gaze }); }

// ---- Eli ----
function poseEli(t, n, feed) {
  const e = EV, s = (i) => L(i).start, E = W.e, lapY = 4.0; W.phone.visible = false;
  if (t < e.morn) {   // at the desk, hands on the laptop
    sitOn(E, v3(0, 0, 6.25), 0, 2.32, t);
    const press = t > e.click - 0.1 && t < e.click + 0.09 ? 0.09 : 0;
    aimArm(E, 0, v3(-0.32, lapY + 0.16 - press, 7.78), 1); aimArm(E, 1, v3(1.0, lapY + 0.2, 8.45), 1);
    E.neck.rotation.x = -0.02; const fx = t < s(1) ? 'neutral' : t < s(5) ? 'surprised' : t < s(6) ? 'shocked' : t < e.cut ? 'scared' : 'nervous';
    face(E, fx, t, 0.3); return;
  }
  if (t < e.night) {   // on the edge of his bed, the phone in his hands
    sitOn(E, v3(5.2, 0, -1.6), -Math.PI / 2, 2.58, t);
    const head = E.root.position.clone().add(v3(-0.5, 2.9, 0)), hand = head.clone().add(v3(-1.4, -1.25, 0.2));
    holdPhone(E, hand, head);
    if (t > s(12) - 0.25) { const pt = scrPt(0.5, 0.17, 0.08), k = smooth(s(12) - 0.25, s(12), t) * (1 - smooth(s(12) + 0.7, s(12) + 1.1, t)); aimArm(E, 1, pt, k); }
    E.neck.rotation.x = 0.26; E.neck.rotation.y = 0.05; face(E, t < s(10) ? 'neutral' : t < s(12) + 0.3 ? 'nervous' : 'frown', t, 0.5); return;
  }
  // the night: he starts mid room, facing the door
  const zb = lerp(1.1, 5.0, easeInOut(clamp((t - e.back0) / (e.back1 - e.back0)))), zSlam = t >= e.TS - 0.55 ? lerp(5.0, 6.35, easeInOut(clamp((t - (e.TS - 0.55)) / 0.45))) : 5.0, zAfter = t > e.TS + 0.9 ? lerp(6.35, 5.45, easeInOut(clamp((t - e.TS - 0.9) / 0.5))) : 6.35, z = t < e.TS - 0.55 ? zb : t <= e.TS + 0.9 ? zSlam : zAfter;
  let yaw = Math.PI; if (t > e.lit + 0.25) yaw = lerp(Math.PI, 0, easeInOut(clamp((t - e.lit - 0.25) / 0.55)));
  if (t > e.turn) yaw = lerp(0, Math.PI - 0.05, easeOut(clamp((t - e.turn) / 0.28))); if (t > e.look) yaw = lerp(Math.PI - 0.05, 0.02, easeInOut(clamp((t - e.look) / 0.6)));
  if (t > e.opn - 0.2) yaw = lerp(0.02, Math.PI, easeInOut(clamp((t - e.opn + 0.2) / 0.75)));
  place(E, v3(0, 0, z), yaw);
  if (t >= e.back0 && t < e.back1) pose(E, 'walk', -(t - e.back0) * 1.4); else pose(E, 'idle', t);
  if (t >= e.TS - 0.55 && t < e.TS + 1.0) {   // the lunge: leans in and pushes the lid down with his right hand; the left braces on the desk
    const k = easeInOut(clamp((t - e.TS + 0.55) / 0.32)) * (1 - smooth(e.TS + 0.72, e.TS + 1.0, t)); E.torso.rotation.x = 0.68 * k; E.neck.rotation.x = -0.34 * k; W.lap.updateMatrixWorld(true);
    const top = W.lap.top().add(v3(-0.25, 0.03, 0)); aimArm(E, 0, top, k); aimArm(E, 1, v3(1.7, 4.02, 7.25), k);
  }
  E.neck.rotation.y = 0; const blinkStop = t > e.S1 - 0.1 && t < e.TS + 1.4;
  const fx = t < e.swap ? 'surprised' : t < e.back0 ? 'nervous' : t < e.turn ? 'scared' : t < e.look ? 'terrified' : t < e.S2 ? 'scared' : 'terrified';
  face(E, fx, t, 0.3, { noBlink: blinkStop });
}

// ---- the figure, seen only in the recording ----
function stageOf(t) { const e = EV, s = (i) => L(i).start; if (t < e.S1) return -1; if (t < s(24) - 0.1) return 0; if (t < s(25) - 0.1) return 1; return 2; }
const STAGE = [{ p: v3(-6.2, 0, -8.8) }, { p: v3(-4.6, 0, -1.2) }, { p: v3(-2.7, 0, 3.6) }];
function poseFig(t) {
  const F = W.fig, e = EV, s = (i) => L(i).start, i = stageOf(t); F.root.visible = i >= 0; if (i < 0) return;
  const qt = Math.floor(t * 12), jit = (k) => noise1(qt * 7.3 + k) * 0.05, p = STAGE[i].p.clone().add(v3(jit(1), 0, jit(9)));
  const to = v3(0, 0, 5).sub(p), yaw = Math.atan2(to.x, to.z); place(F, p, yaw); pose(F, 'idle', 0.4);
  if (i === 2 && t < EV.S2) { aimArm(F, 0, v3(-0.35, 5.3, 4.7), 0.92 + jit(4) * 2); }
  const cam = FEED_POS, hp = F.neck.getWorldPosition(v3()), toC = Math.atan2(cam.x - hp.x, cam.z - hp.z) - yaw, turnK = t < s(26) ? 0 : t < e.S2 ? (Math.floor(smooth(s(26) + 0.15, e.S2 - 0.1, t) * 5 + 0.0001) / 5) : 1, fix = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  F.neck.rotation.y = lerp(i === 0 ? 0.3 : 0.08, fix(toC) * 0.9, turnK); F.neck.rotation.z = (i === 1 ? -0.34 : 0.0) + (i === 0 ? 0.2 : 0); F.torso.rotation.x = 0.06;
  const mo = t > e.S2 ? (t > s(27) && t < L(27).end ? 0.55 + 0.45 * Math.abs(Math.sin((t - s(27)) * 9)) : 0.42) : 0.09;
  W.fh.set({ gaze: t > e.S2 ? [0, 0] : [0.5 * turnK, -0.2], mouth: mo });
}

// ---- phone (the message) ----
function makePhone() {
  const g = new THREE.Group(), b = new Batch(); b.box(paint('#1b1d22', { roughness: 0.35, metalness: 0.5 }), 0.92, 1.86, 0.1, 0, 0, 0, { r: 0.04 }); b.box(paint('#d8d4cc', { roughness: 0.6 }), 0.98, 1.92, 0.08, 0, 0, -0.03, { r: 0.12 }); b.done(g);
  const cv = document.createElement('canvas'); cv.width = 900; cv.height = 1800; W.pUI = cv; W.pX = cv.getContext('2d'); W.pT = new THREE.CanvasTexture(cv); W.pT.colorSpace = THREE.SRGBColorSpace; W.pT.anisotropy = 8;
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.72), new THREE.MeshBasicMaterial({ map: W.pT, toneMapped: false })); s.position.z = 0.052; s.userData.noAO = true; g.add(s); g.visible = false; ctx.scene.add(g); W.phone = g;
}
function holdPhone(c, handAt, faceTo) { aimArm(c, 0, handAt, 1); c.root.updateMatrixWorld(true); const hp = c.arms[0].localToWorld(v3(0, -armLen(c), 0.1)), ph = W.phone; ph.visible = true; ph.position.copy(hp); ph.up.set(0, 1, 0); ph.lookAt(faceTo); ph.translateY(0.95); ph.translateZ(-0.18); ph.updateMatrixWorld(true); return hp; }
const scrPt = (u, v, d = 0) => W.phone.localToWorld(v3((u - 0.5) * 0.86, (v - 0.5) * 1.72, 0.052 + d));
function phoneUI(t) {
  const e = EV, s = (i) => L(i).start, st = t < s(10) - 0.15 ? 0 : t < s(11) - 0.1 ? 1 : t < s(12) + 0.5 ? 2 : 3; if (W.pK === st) return; W.pK = st;
  const x = W.pX, w = 900, h = 1800; x.fillStyle = '#10131a'; x.fillRect(0, 0, w, h); x.textAlign = 'left';
  x.fillStyle = '#c8cfdc'; x.font = '700 56px ITTInter, sans-serif'; x.fillText('8:14', 70, 120); x.textAlign = 'right'; x.fillText('98%', w - 70, 120); x.textAlign = 'center';
  if (st === 3) { x.fillStyle = '#6e7788'; x.font = '700 58px ITTInter, sans-serif'; x.fillText('No messages', w / 2, h / 2); W.pT.needsUpdate = true; return; }
  x.fillStyle = '#8f98a8'; x.font = '700 50px ITTInter, sans-serif'; x.fillText('Unknown number', w / 2, 300);
  if (st > 0) { x.fillStyle = '#20252f'; x.beginPath(); x.roundRect(60, 400, w - 120, 280, 44); x.fill(); x.fillStyle = '#ffffff'; x.font = '900 86px ITTInter, sans-serif'; x.fillText('YOUR ROOM', w / 2, 515); x.fillText('IS READY.', w / 2, 628); }
  if (st > 1) { x.fillStyle = '#d8d4cc'; x.beginPath(); x.roundRect(60, 730, w - 120, 620, 40); x.fill(); x.fillStyle = '#2a2a30'; x.font = '900 70px ITTInter, sans-serif'; x.fillText('HOTEL HOLLIS', w / 2, 850); x.fillStyle = '#5a4a3a'; x.font = '700 50px ITTInter, sans-serif'; x.fillText('13 Vacancy Road', w / 2, 935); x.strokeStyle = '#9c8a70'; x.lineWidth = 6; x.strokeRect(120, 990, w - 240, 290); x.beginPath(); x.moveTo(120, 1120); x.lineTo(w - 120, 1090); x.moveTo(470, 990); x.lineTo(450, 1280); x.stroke(); x.fillStyle = '#b01c1c'; x.beginPath(); x.arc(470, 1110, 26, 0, 7); x.fill(); }
  x.fillStyle = '#b02a2a'; x.beginPath(); x.roundRect(250, 1500, 400, 130, 66); x.fill(); x.fillStyle = '#ffffff'; x.font = '900 72px ITTInter, sans-serif'; x.fillText('Delete', w / 2, 1588); W.pT.needsUpdate = true;
}

// ---- the laptop's screen ----
function lapUI(t) {
  const e = EV, s = (i) => L(i).start, st = t < e.click ? 0 : t < e.feed0 ? 1 : 2, cur = t < s(1) ? 0 : smooth(s(1), s(1) + 1.0, t), key = st + '_' + Math.round(cur * 30); if (W.lapK === key) return; W.lapK = key;
  const x = W.lap.uiX, w = 1280, h = 800; if (st === 2) { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); W.lap.uiTex.needsUpdate = true; return; }
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1d2a44'); g.addColorStop(1, '#101626'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = '#e8e6df'; x.beginPath(); x.roundRect(160, 110, 960, 560, 16); x.fill(); x.fillStyle = '#2e3644'; x.fillRect(160, 110, 960, 56); x.fillStyle = '#e8e6df'; x.font = '700 28px ITTInter, sans-serif'; x.textAlign = 'left'; x.fillText('Downloads', 186, 148);
  if (st === 1) { x.fillStyle = '#000'; x.fillRect(172, 176, 936, 484); x.fillStyle = '#d8d4cc'; x.font = '700 30px Consolas, monospace'; x.fillText('LOADING TOMORROW_3AM...', 190, 640); W.lap.uiTex.needsUpdate = true; return; }
  const ico = (y, nm, dt, on) => { x.textAlign = 'center'; if (on) { x.fillStyle = '#c6d6f0'; x.fillRect(340, y - 110, 600, 300); } x.fillStyle = '#b01c1c'; x.fillRect(600, y - 92, 80, 80); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(626, y - 72); x.lineTo(626, y - 32); x.lineTo(660, y - 52); x.fill(); x.fillStyle = '#1a1c22'; x.font = '900 64px ITTInter, sans-serif'; x.fillText(nm, 640, y + 62); x.fillStyle = on ? '#b01c1c' : '#646a76'; x.font = '700 38px ITTInter, sans-serif'; x.fillText(dt, 640, y + 122); x.textAlign = 'left'; };
  ico(330, 'TOMORROW_3AM', 'tomorrow, 3:00 AM', cur > 0.6);
  const cx = lerp(900, 560, cur), cy = lerp(620, 342, cur); x.fillStyle = '#ffffff'; x.strokeStyle = '#000'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx, cy + 58); x.lineTo(cx + 14, cy + 44); x.lineTo(cx + 26, cy + 72); x.lineTo(cx + 38, cy + 66); x.lineTo(cx + 26, cy + 40); x.lineTo(cx + 46, cy + 40); x.closePath(); x.fill(); x.stroke(); W.lap.uiTex.needsUpdate = true;
}

// ---- rig ----
function rig() {
  W.pl = []; for (let i = 0; i < 9; i++) { const l = new THREE.PointLight('#ffffff', 0, 30, 1.6); ctx.scene.add(l); W.pl.push(l); }
  const s = new THREE.SpotLight('#ffffff', 0, 70, 0.55, 0.75, 1.2); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0006; s.shadow.normalBias = 0.04; ctx.scene.add(s); ctx.scene.add(s.target); W.key = s;
}
const setL = (i, p, col, I, dist) => { const l = W.pl[i]; l.position.copy(p); l.color.set(col); l.intensity = I; l.distance = dist; };
function lightSet(set, t) {
  W.pl.forEach((l) => { l.intensity = 0; }); W.key.intensity = 0; const e = EV, f = flick(t), key = (p, tg, col, I, ang = 0.6, dist = 70) => { W.key.position.copy(p); W.key.target.position.copy(tg); W.key.color.set(col); W.key.intensity = I; W.key.angle = ang; W.key.distance = dist; };
  if (set === 'hotel') { const z = [14, 30, 46, 62, 78]; z.forEach((zz, i) => { setL(i, HX.clone().add(v3(4, 9.5, zz)), '#ffc98a', 42, 30); setL(i + 4 < 9 ? i + 4 : 8, HX.clone().add(v3(-4, 9.5, zz)), '#ffc98a', 34, 30); }); key(HX.clone().add(v3(-14, 18, 10)), HX.clone().add(v3(4, 3, 24)), '#ffd8ae', 380, 0.7, 70); return; }
  if (set === 'morn') { setL(0, v3(-8, 9, 1), '#fff0d8', 58, 34); setL(1, v3(6, 9, 3), '#fff0d8', 30, 30); setL(2, v3(4.0, 8, -18), '#fff0d8', 34, 20); key(v3(-30, 19, 2), v3(1, 2, 0), '#ffe8c8', 900, 0.46, 80); return; }
  key(v3(-34, 18, -2), v3(1, 3, 0), '#9fb4dc', 620 * Math.max(0.5, f), 0.42, 80);      // moonlight through the window
  setL(0, v3(4.0, 5.9, 9.2), '#ffb56a', 26 * f, 22);                                    // desk lamp
  const on = t < e.cut || (t > e.lit && t < e.TS), scr = v3(0, 5.2, 8.6);
  setL(1, scr, '#bcd4ff', on ? 16 * (t > e.S2 ? 1.25 : 1) * (0.92 + noise1(t * 11) * 0.12) : 0, 18);                  // the laptop
  setL(2, v3(-6, 8, 6), '#7f95c6', 26 * f, 30); setL(3, v3(7, 8, -7), '#7f95c6', 22 * f, 30); setL(4, v3(2.5, 8.5, -7.5), '#7f95c6', 44 * f, 24);
  if (t > e.TS) setL(5, v3(1.2, 8.0, 6.4), '#a4b8e2', 46, 13);
  if (t > e.TS) { const seam = e.knocks.reduce((a, c) => a + (t > c - 0.02 && t < c + 0.26 ? 1 - (t - c) / 0.26 : 0), 0); if (seam > 0) setL(8, v3(0, 4.42, 7.25), '#cfe0ff', 11 * seam, 6); }
  if (t > e.opn - 0.2) { const k = easeInOut(clamp((t - e.opn) / 2.4)); setL(6, v3(4.1, 2.4, -9.4), '#ffbe78', 26 * k, 14); setL(7, v3(4.1, 8, -11), '#ffbe78', 8 * k, 12); }
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 }), H = (x, y, z) => HX.clone().add(v3(x, y, z));
  add('open', 0, (u) => ({ pos: lp3(v3(-3.3, 7.6, 0.9), v3(-2.7, 7.4, 1.6), easeInOut(u)), look: v3(0.1, 4.6, 8.8), fov: 48 }));
  add('file', s(1) - 0.15, (u) => ({ pos: lp3(v3(0.35, 5.1, 6.0), v3(0.25, 5.05, 6.4), easeInOut(u)), look: v3(0.05, 5.0, 9.3), fov: 46 }));
  add('click', s(2) - 0.12, (u) => ({ pos: lp3(v3(-1.9, 8.3, 7.0), v3(-1.75, 8.1, 7.1), u), look: v3(-0.25, 4.2, 8.0), fov: 42 }));
  add('f_long', e.feed0, (u) => ({ pos: H(-4.6, 8.3, 5), look: H(2.8, 3.4, 30), fov: 58 }));
  add('f_door', s(4) - 0.1, (u) => ({ pos: H(-4.6, 8.3, 5), look: H(6.5, 3.8, 26), fov: lerp(32, 28, u) }));
  add('f_out', s(5) - 0.1, (u) => ({ pos: H(-4.6, 8.3, 5), look: lp3(H(6.5, 3.6, 26), W.ehd.clone().add(v3(0, -0.8, 0)), easeInOut(smooth(0.2, 1, u))), fov: lerp(34, 40, u) }));
  add('react1', s(6) + 0.1, (u) => ({ pos: W.eh.clone().add(v3(-3.6, 1.5, 3.9 - u * 0.3)), look: W.eh.clone().add(v3(0.1, -0.9, 0)), fov: 44 }));
  add('f_cry', s(7) - 0.06, (u) => ({ pos: H(-4.6, 8.3, 5), look: W.ehd.clone().add(v3(0, -1.35, 0)), fov: lerp(24, 20, u) }));
  add('after', e.cut, (u, t) => ({ pos: W.eh.clone().add(v3(3.0, 0.4, 2.2 - u * 0.3)), look: W.eh.clone().add(v3(0, -1.1, 0)), fov: 44 }));
  add('morn', e.morn, (u) => ({ pos: lp3(v3(-6.6, 7.0, 9.2), v3(-6.0, 6.8, 8.6), easeInOut(u)), look: v3(6.4, 2.6, -7.8), fov: 58 }));
  const ph = (d, uu = 0.5, vv = 0.5) => (u) => { const p = scrPt(uu, vv, d + (1 - u) * 0.3), q = scrPt(0.5, vv); return { pos: p, look: q, fov: 36 }; };
  add('ph_msg', s(10) - 0.15, (u) => ph(2.15, 0.5, 0.62)(u)); add('ph_addr', s(11) - 0.1, (u) => ph(1.9, 0.5, 0.4)(u));
  add('ph_del', s(12) - 0.3, (u) => ph(2.5, 0.5, 0.42)(u));
  add('doornight', e.night, (u) => ({ pos: lp3(v3(-3.2, 8.2, 6.8), v3(-3.0, 8.1, 5.6), easeInOut(u)), look: v3(2.6, 3.4, -12), fov: 56 }));
  add('digits', s(14) - 0.05, (u) => ({ pos: lp3(v3(4.3, 7.0, -4.6), v3(4.2, 6.9, -5.8), easeInOut(u)), look: v3(4.05, 5.95, -12), fov: 42 }));
  add('room013', s(15) - 0.08, (u) => ({ pos: lp3(v3(1.5, 5.6, -2.8), v3(1.6, 5.6, -3.6), easeInOut(u)), look: v3(3.8, 5.0, -12), fov: 48 }));
  add('backs', s(16) - 0.03, (u) => ({ pos: lp3(v3(-9.0, 7.2, 11.5), v3(-8.8, 7.1, 11.2), u), look: v3(3.9, 3.0, -3.8), fov: 62 }));
  add('lit', e.lit - 0.04, (u) => ({ pos: lp3(v3(-5.2, 6.6, 3.6), v3(-4.9, 6.5, 4.0), u), look: v3(0.2, 3.4, 8.4), fov: 46 }));
  add('lapfeed', s(18) - 0.08, (u) => ({ pos: lp3(v3(1.2, 6.1, 3.3), v3(0.55, 5.45, 5.75), easeInOut(u)), look: v3(0, 5.15, 9.3), fov: 44 }));
  add('f_room', s(19) - 0.1, (u) => ({ pos: FEED_POS, look: FEED_LOOK, fov: 58 }));
  add('f_closet', s(20) + 0.65, (u) => ({ pos: FEED_POS, look: lp3(FEED_LOOK, v3(-4, 3.4, -6.5), easeInOut(u)), fov: lerp(58, 44, easeInOut(u)) }));
  add('f_s1', e.S1, (u, t) => { const k = easeOut(clamp((t - e.S1) / 0.1)); return { pos: FEED_POS, look: lp3(v3(-4, 3.4, -6.5), v3(-4.6, 4.4, -7.0), k), fov: lerp(44, 34, k) }; });
  add('turn', e.turn, (u) => ({ pos: lp3(v3(-4.2, 5.6, -0.6), v3(-4.0, 5.5, -0.1), u), look: W.eh.clone().add(v3(0, -1.2, 0)), fov: 46 }));
  add('nothing', s(22) - 0.14, (u) => ({ pos: lp3(v3(-3.0, 6.4, 8.8), v3(-2.3, 6.2, 8.2), easeInOut(u)), look: v3(-3.6, 3.3, -11.5), fov: 44 }));
  add('lookback', e.look - 0.05, (u) => ({ pos: W.eh.clone().add(v3(-2.4, 0.5, 3.2)), look: W.eh.clone().add(v3(0.1, -1.05, 0)), fov: 44 }));
  add('f_c1', s(24) - 0.1, (u) => ({ pos: FEED_POS, look: v3(-2.6, 0.8, 1.0), fov: 56 }));
  add('eli_b', s(25) - 0.32, (u) => ({ pos: W.eh.clone().add(v3(2.4, 0.5, 3.3 - u * 0.2)), look: W.eh.clone().add(v3(0, -1.0, 0)), fov: 42 }));
  add('f_c2', s(25) - 0.1, (u) => ({ pos: FEED_POS, look: v3(-1.3, 2.4, 3.6), fov: 44 }));
  add('f_turn', s(26) - 0.08, (u) => ({ pos: FEED_POS, look: v3(-2.1, lerp(2.4, 4.4, easeInOut(u)), 3.6), fov: lerp(42, 28, easeInOut(u)) }));
  add('S2', e.S2, (u, t) => { const d = W.toC.clone(), k = easeOut(clamp((t - e.S2) / 0.09)), dist = lerp(3.8, 3.05, k); return { pos: W.fh2.clone().addScaledVector(d, dist).add(v3(0, 0.05, 0)), look: W.fh2.clone().add(v3(0, -0.25, 0)), fov: 46 }; });
  add('lunge', e.TS - 0.5, (u) => ({ pos: lp3(v3(-5.4, 6.7, 3.9), v3(-5.1, 6.6, 4.2), u), look: v3(-0.2, 4.6, 7.9), fov: 52 }));
  add('dark', e.TS + 0.5, (u) => ({ pos: lp3(v3(4.9, 6.7, 6.3), v3(4.5, 6.5, 6.6), easeInOut(u)), look: v3(0, 3.4, 8.6), fov: 52 }));
  add('eli_k', e.knocks[1] - 0.22, (u) => ({ pos: W.eh.clone().add(v3(-0.85, 0.2, 3.5)), look: W.eh.clone().add(v3(0, -0.9, 0)), fov: 40 }));
  add('dark2', e.knocks[2] - 0.24, (u) => ({ pos: v3(3.7, 6.1, 6.9), look: v3(0, 3.4, 8.6), fov: 44 }));
  add('final', s(30) - 0.08, (u) => ({ pos: lp3(v3(-2.9, 6.1, 11.0), v3(-2.5, 5.8, 9.8), easeInOut(u)), look: lp3(v3(3.5, 3.2, -10), v3(4.8, 3.4, -12), easeInOut(u)), fov: 60 }));
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
const lerpV = (p, y, k) => v3(p.x, y, p.z).lerp(FEED_POS, k * 0.0).add(v3(0, 0, 0));
const FOOT = ['f_long', 'f_door', 'f_out', 'f_cry', 'f_room', 'f_closet', 'f_s1', 'f_c1', 'f_c2', 'f_turn', 'S2'], HOTEL = ['f_long', 'f_door', 'f_out', 'f_cry'], LAPS = ['open', 'file', 'click', 'lit', 'lapfeed', 'lookback', 'eli_b', 'after', 'backs', 'turn', 'lunge'];

// ---- the tape HUD and the recording's feed ----
function hudInit() { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; c.style.cssText = 'position:absolute;inset:0;pointer-events:none;'; ctx.grade.after(c); W.hud = c; W.h2 = c.getContext('2d'); }
function hud(t, n) {
  const x = W.h2; x.clearRect(0, 0, 1080, 1920); if (!FOOT.includes(n)) return;
  const f = '700 46px Consolas, "Courier New", monospace', tx = (s, a, b, c = '#f2f2ea', al = 'left') => { x.font = f; x.textAlign = al; x.lineWidth = 7; x.strokeStyle = 'rgba(0,0,0,0.7)'; x.lineJoin = 'round'; x.strokeText(s, a, b); x.fillStyle = c; x.fillText(s, a, b); };
  const hot = HOTEL.includes(n), T0 = hot ? 3 : 30 + Math.floor(t * 0.1), sec = hot ? Math.floor((t - EV.feed0) * 1 + 14) : Math.floor(t - L(19).start + 41);
  tx('TOMORROW_3AM', 66, 150); tx('▶ PLAY', 1014, 150, '#d8d8cc', 'right'); tx(`NOV 09  03:00:${String(sec % 60).padStart(2, '0')} AM`, 66, 214); void T0;
  x.fillStyle = 'rgba(30,30,30,0.9)'; x.fillRect(66, 244, 948, 7); x.fillStyle = '#d42424'; const fr = clamp(hot ? (t - EV.feed0) / (EV.cut - EV.feed0) : (t - L(19).start) / (EV.S2 - L(19).start)); x.fillRect(66, 244, 948 * fr, 7);
}
function renderFeed(t, cam, showFig) { const { renderer, scene } = ctx, f0 = W.fig.root.visible, fh = W.fh.visible; W.fig.root.visible = showFig; W.fh.visible = true; const v = W.lap.visible; W.lap.scr.visible = false; cam.updateMatrixWorld(true); renderer.setRenderTarget(W.feedRT); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(null); W.fig.root.visible = f0; W.fh.visible = fh; W.lap.scr.visible = true; void v; }

// ---- a frame ----
function renderAt(t) {
  const sh0 = shotAt(W.shots, t), n = sh0.name, e = EV, s = (i) => L(i).start, foot = FOOT.includes(n), hot = HOTEL.includes(n);
  const set = hot ? 'hotel' : t >= e.morn && t < e.night ? 'morn' : 'room';
  applyEnv(ctx, set === 'hotel' ? HOTELP : set === 'morn' ? MORN : ROOMN);
  W.room.visible = set !== 'hotel'; W.room.chair.position.set(t < e.morn ? 0 : -8.4, 0, t < e.morn ? 6.25 : 7.6); W.room.chair.rotation.y = t < e.morn ? 0 : 0.7; W.hotel.visible = set === 'hotel';
  W.U.value = creepR(t); W.sky.material.color.set(set === 'morn' ? '#dbe7f6' : '#0e1830');
  const morn = set === 'morn'; W.land.visible = morn; W.black.visible = !morn;
  // the bedroom door
  W.hdoor.visible = t >= e.swap; W.plain.visible = !W.hdoor.visible; W.dig.forEach((d, i) => { const k = t >= e.swap ? smooth(e.dig[i], e.dig[i] + 0.2, t) : 0; d.material.opacity = k; d.scale.setScalar(lerp(1.4, 1, easeOut(k))); }); W.roomBar.material.opacity = smooth(e.dig[0] - 0.2, e.dig[0] + 0.1, t);
  W.doorG.rotation.y = morn ? 1.18 : t > e.opn ? 0.46 * easeInOut(clamp((t - e.opn) / 3.3)) : 0;
  W.spill.material.opacity = t > e.opn ? 0.55 * smooth(e.opn, e.opn + 2.0, t) : 0; W.black.position.z = t > e.opn ? -12.6 : -12.5;
  // the laptop
  const slamA = t < e.TS - 0.22 ? 1 : 1 - clamp((t - (e.TS - 0.22)) / 0.22), kn = e.knocks.reduce((a, c) => a + (t > c && t < c + 0.2 ? Math.sin((t - c) * Math.PI * 5) * (1 - (t - c) / 0.2) : 0), 0);
  W.lap.setLid(slamA + Math.max(0, kn) * 0.012); lapUI(t);
  const feedOn = t > e.lit && t < e.TS, screenOn = t < e.cut || feedOn, m = W.lap.screenM.uniforms;
  m.k.value = screenOn ? (feedOn ? 1 : 0.9) : 0; m.feedK.value = feedOn ? 1 : 0; m.tm.value = t; m.tear.value = (t > e.S1 && t < e.S1 + 0.22) || (t > e.S2 && t < e.S2 + 0.25) ? 0.5 : 0.04;
  // people
  poseEli(t, n, foot); W.e.root.visible = n !== 'S2'; W.e.root.updateMatrixWorld(true); W.eh.copy(W.e.neck.getWorldPosition(v3())).add(v3(0, 0.75, 0));
  W.ed.root.visible = false; W.mom.root.visible = false; W.maid.root.visible = false; W.bk.visible = false; W.fig.root.visible = false;
  if (hot) {
    W.e.root.visible = false; W.phone.visible = false;
    const u = clamp((t - e.out - 0.15) / (s(7) - 0.25 - e.out)), a = HX.clone().add(v3(7.2, 0, 26)), b = HX.clone().add(v3(1.3, 0, 12.8)), p = lp3(a, b, easeInOut(u)), d = b.clone().sub(a);
    if (t >= e.out) { place(W.ed, p, u < 1 ? Math.atan2(d.x, d.z) : Math.atan2(-5.9, -7.8)); if (u < 1) pose(W.ed, 'walk', t * 0.72); else pose(W.ed, 'idle', t); W.ed.torso.rotation.x = 0.06; if (t >= s(7) - 0.4) W.ed.neck.rotation.x = -0.42 * smooth(s(7) - 0.4, s(7), t); W.ed.torso.rotation.z = Math.sin(t * 2.3) * 0.03; W.ed.setFace(t < s(6) ? 'scared' : 'cry', {}); W.ed.root.updateMatrixWorld(true); W.ehd = W.ed.neck.getWorldPosition(v3()).add(v3(0, 0.75, 0)); if (W.air.list.ds) W.air.list.ds.position.copy(p); }
    else W.ehd = HX.clone().add(v3(6.5, 3.6, 26));
    W.air.list.ds.visible = t >= e.out; W.d013r.rotation.y = -1.3 * easeInOut(clamp((t - e.doorOpen) / 1.9));
    place(W.maid, HX.clone().add(v3(-5.8, 0, 66)), -Math.PI / 2 - 0.2); pose(W.maid, 'idle', 1.2); W.maid.neck.rotation.y = -0.05; face(W.maid, 'neutral', 1.2, 0, { noBlink: true });
  } else {
    W.ehd = W.ehd || v3(); W.air.list.ds.visible = false;
    if (morn) { place(W.mom, v3(3.9, 0, -12.1 - 1.1), Math.PI * 0.05); const wu = clamp((t - e.morn - 1.3) / 1.0); if (wu > 0) { place(W.mom, v3(lerp(3.9, -3.5, easeInOut(wu)), 0, -14.4), -Math.PI / 2); pose(W.mom, 'walk', t * 0.8); } else pose(W.mom, 'idle', t); aimArm(W.mom, 0, W.mom.root.position.clone().add(v3(-1.0, 3.2, 1.1).applyAxisAngle(v3(0, 1, 0), W.mom.root.rotation.y)), 1); aimArm(W.mom, 1, W.mom.root.position.clone().add(v3(1.0, 3.2, 1.1).applyAxisAngle(v3(0, 1, 0), W.mom.root.rotation.y)), 1); const hl = handOf(W.mom, 0), hr = handOf(W.mom, 1); W.bk.visible = true; W.bk.position.copy(hl).lerp(hr, 0.5).add(v3(0, 0.15, 0)); W.bk.rotation.y = W.mom.root.rotation.y; face(W.mom, 'happy', t, 0.2); phoneUI(t); }
  }
  // the figure exists only on the tape: visible in footage shots
  if (!hot && !morn && stageOf(t) >= 0) { poseFig(t); W.fig.root.updateMatrixWorld(true); W.fh2 = W.fh.getWorldPosition(v3()); W.toC = FEED_POS.clone().sub(W.fh2).setY(0).normalize(); W.fig.root.visible = foot; }
  // render targets
  if (feedOn && LAPS.includes(n) && (!ctx.sub || ctx.sub.i === 0)) {
    const c = W.feedCam; c.position.copy(FEED_POS); c.fov = 42; const inS2 = t >= e.S2 && W.fh2; if (inS2) { c.position.copy(W.fh2).addScaledVector(W.toC, 1.9); c.lookAt(W.fh2); } else c.lookAt(v3(-0.7, 3.6, 2)); c.updateProjectionMatrix();
    applyEnv(ctx, ROOMN); lightSet('room', t); W.U.value = creepR(t); renderFeed(t, c, stageOf(t) >= 0);
  }
  lightSet(set, t);
  W.air.update(t); if (W.air.list.room) W.air.list.room.position.set(0, 0, 0);
  ctx.scene.updateMatrixWorld(true);
  const sh = shotAt(W.shots, t);
  // the tape pass
  W.pass.enabled = foot; const tear = (t > e.S1 && t < e.S1 + 0.3) ? 0.85 * (1 - (t - e.S1) / 0.3) : (t > e.S2 && t < e.S2 + 0.34) ? 1 - (t - e.S2) / 0.34 : (n === 'f_c1' && t < s(24) + 0.12) || (n === 'f_c2' && t < s(25) + 0.12) ? 0.55 : Math.max(0, noise1(t * 3.1) - 0.62) * 0.8;
  const un = W.pass.uniforms; un.tm.value = t; un.tear.value = tear; un.roll.value = (t > e.S2 && t < e.S2 + 0.09) ? 0.2 : (n === 'f_c1' && t < s(24) + 0.05) || (t > e.S1 && t < e.S1 + 0.05) ? 0.1 : 0; un.wash.value = (t > e.S1 && t < e.S1 + 0.035) ? 0.75 : (t > e.S2 && t < e.S2 + 0.05) ? 0.8 : 0;
  hud(t, n);
  const jolt = n === 'f_s1' ? Math.max(0, 1 - (t - e.S1) / 0.25) : n === 'S2' ? Math.max(0, 1 - (t - e.S2) / 0.3) : n === 'lunge' && t > e.TS ? Math.max(0, 1 - (t - e.TS) / 0.22) * 0.7 : 0;
  const black = (t >= e.cut - 0.001 && t < e.cut + 0.42) ? 1 : 0;
  frame(ctx, t, sh, { steady: true, shake: jolt * 1.5, shadowSpan: 40, shadows: false, black });
  return n;
}

export async function setup() {
  ctx = await initStage('ep38', { look: 'pro', avatars: ['farm_ep38_eli', 'farm_ep38_porter', 'farm_classic_mom', 'farm_grandma_june'] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'surprised', 'shocked', 'scared', 'terrified', 'nervous', 'happy', 'sad', 'cry']);
  await loadAnimSet('contest_set');
  const { scene, camera } = ctx; camera.far = 3000; camera.near = 0.08; camera.updateProjectionMatrix();
  rig(); sets(); people(); makePhone(); hudInit();
  W.feedCam = new THREE.PerspectiveCamera(42, 1.6, 0.15, 400); W.feedRT = new THREE.WebGLRenderTarget(960, 600, { type: THREE.HalfFloatType, samples: 2 }); W.lap.screenM.uniforms.feed.value = W.feedRT.texture;
  W.pass = new ShaderPass(TapeShader); ctx.composer.addPass(W.pass); W.pass.enabled = false;
  const list = { room: dust(scene, { size: 26, height: 11, centre: v3(0, 5.5, 0), count: 220, color: '#d9d4c4', amount: 0.12, pointSize: 0.26 }), ds: dust(scene, { size: 4, height: 6.5, centre: v3(0, 3.2, 0), count: 280, color: '#ddd6c6', amount: 0.42, pointSize: 0.2 }) };
  W.air = atmos(...Object.values(list)); W.air.list = list;
  W.shots = shots(); void applyPose; void sample; void visemeAt;
  window.__ep38 = { W, THREE, ctx };
  return expose(ctx, renderAt, EV.S2 + 0.7, EV);
}
