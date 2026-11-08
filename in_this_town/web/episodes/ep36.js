// Episode 36: The Last Contestant (Psychological Horror 2/5). Grayson's TV switches on by itself: a smiling host congratulates him, he's
// been selected; survive five minutes and he can go home. His bedroom walls fall flat: the room was a set on the floor of an enormous empty
// mall turned arena (thousands of empty seats, a countdown on a hanging scoreboard). "Release the hunters": three masked figures walk out of a
// dark tunnel. He runs; gunfire shatters the shop windows behind him; he slides under a closing security gate (the first hunter slides
// through after him, exactly the same way), grabs a scaffold pipe and strikes the hunter across the mask. It cracks: inside is a TV screen
// showing Grayson's own face. The second hunter tackles him; he kicks it away through a shop window and sprints for the exit as the host
// counts down. He smashes through the last door and collapses on his own bedroom floor; the TV applauds: "You've won!" Outside, every house
// on his street is empty, every window holds a TV, every TV shows him. "Now, let's see how long you survive as the hunter": in the window
// glass his reflection wears the hunter's mask, and every TV on the street shows him masked.
// World: the bedroom set at the origin (x -9..9, z -7.5..7.5, floor y 0) on the arena floor; the corridor at CO (+z along the corridor);
// the host's studio at HS; the street (end) round the bedroom, its ground at y -12 (the bedroom is upstairs).
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, NIGHT, DAY } from '../engine/stage.js';
import { Batch, surf, paint, lamp } from '../engine/kit.js';
import { dust, atmos } from '../engine/atmos.js';
import { canvasTex } from '../engine/props.js';
import { sample, applyPose, aimArm as aimArm0 } from '../engine/anims.js';
import { installActionFX, weaponTrail } from '../engine/actionfx.js';
import { trainingRifle, holdRifle, muzzleFlashes, flashK, tracers, eventParticles, smokeHaze, bloodFX } from '../engine/tactical.js';
import { wallpaper } from '../engine/pastel.js';
import { bed as homeBed, pcDesk, plant } from '../engine/home.js';
import { fluorPanel, vinyl } from '../engine/hospital.js';
import { screenMat, flatTV, seatBanks, mallRing, jumbotron, countdownDraw, rollGate, glassShatter, hunterHelmet, metalPipe, tvHouse, studioSet, shopSign, shopWindowMat } from '../engine/gameshow.js';

const aimArm = (c, side, p, k = 1) => { c.root.updateMatrixWorld(true); aimArm0(c, side, p, k); };
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), DOWN = new THREE.Vector3(0, -1, 0);
function aimLeg(c, side, world, amt = 1) { c.root.updateMatrixWorld(true); const a = c.legs[side]; a.parent.updateMatrixWorld(true); const pw = a.parent.matrixWorld; _v.copy(a.position).applyMatrix4(pw); _w.copy(world).sub(_v); _q.setFromRotationMatrix(pw).invert(); _w.applyQuaternion(_q).normalize(); a.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(DOWN, _w), amt); }

let ctx, L, T;
const W = {};
const CO = v3(1000, 0, 0), HS = v3(0, 0, -3000);
const C = (x, y, z) => CO.clone().add(v3(x, y, z)), Hs = (x, y, z) => HS.clone().add(v3(x, y, z));
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const GSKIN = '#eac09a';
const BX = 9, BZ = 7.5, BH = 10;                 // the bedroom: outer faces x ±9, z ±7.5, walls 10 high (inner faces 0.4 in)
const GSEAT = v3(-5.0, 0, -0.9);                 // Grayson on the foot of his bed, facing the TV (-z)
const TVP = v3(0, 5.2, -6.35);                   // the bedroom TV's screen centre
const GWIN = v3(6.5, 0, 0);                      // Grayson at the window (faces +x)
const DOORZ0 = -6.2, DOORZ1 = -2.6;              // the bedroom door in the west wall (hinge at z -6.2)

// ---- palettes ----
const BEDN = { ...NIGHT, ...P({ top: '#060912', horizon: '#121a2c', haze: '#0e1422', sunColor: '#a8bcdc', hemiSky: '#5a6a94', hemiGround: '#221e28' }),
  sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 0.62, amb: 0.12, envI: 0.3, exposure: 1.16, bloom: 0.04, fogNear: 300, fogFar: 900, saturation: 1.0, contrast: 1.07, bounce: 0.1, win: 0, lamp: 0 };
const ARENA = { ...NIGHT, ...P({ top: '#0a0c14', horizon: '#1a1d2a', haze: '#1a1c26', sunColor: '#fff2dc', hemiSky: '#c8d2ea', hemiGround: '#4a4450' }),
  sunI: 1.2, sunDir: v3(0.25, 0.9, 0.35), sunDisc: 0, stars: 0, moon: 0, hemiI: 1.05, amb: 0.2, envI: 0.6, exposure: 1.08, bloom: 0.05, fogNear: 120, fogFar: 420, saturation: 1.08, contrast: 1.08, bounce: 0.22, win: 0, lamp: 0 };
const ARENA_DARK = { ...ARENA, sunI: 0, hemiI: 0.45, amb: 0.08, exposure: 1.1 };
const CORR = { ...NIGHT, ...P({ top: '#0a0c12', horizon: '#14161e', haze: '#12141a', sunColor: '#e8f0ff', hemiSky: '#a8b4cc', hemiGround: '#3a3632' }),
  sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 0.85, amb: 0.17, envI: 0.45, exposure: 1.1, bloom: 0.05, fogNear: 60, fogFar: 260, saturation: 1.05, contrast: 1.08, bounce: 0.18, win: 0, lamp: 0 };
const STUDIO = { ...DAY, ...P({ top: '#1a0a30', horizon: '#3a1a5a', haze: '#2a1a40', sunColor: '#fff0dc', hemiSky: '#f2e2ff', hemiGround: '#5a3a6a' }),
  sunI: 1.6, sunDir: v3(0.2, 0.8, 0.6), sunDisc: 0, stars: 0, moon: 0, hemiI: 1.0, amb: 0.25, envI: 0.7, exposure: 1.05, bloom: 0.05, fogNear: 200, fogFar: 800, saturation: 1.1, contrast: 1.06, bounce: 0.2, win: 0, lamp: 0 };
const STREETN = { ...NIGHT, ...P({ top: '#04070f', horizon: '#141c30', haze: '#0e1422', sunColor: '#a8bcdc', hemiSky: '#56688a', hemiGround: '#1a1a18' }),
  sunI: 0.45, sunDir: v3(0.6, 0.7, -0.4), sunDisc: 0, stars: 0.7, moon: 1, hemiI: 0.6, amb: 0.11, envI: 0.28, exposure: 1.18, bloom: 0.05, fogNear: 120, fogFar: 520, saturation: 1.0, contrast: 1.08, bounce: 0.06, win: 0, lamp: 0 };

// ---- timing ----
function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  const T = { tvOn: 0.12, wall: e(3) + 0.46, cd: s(7) + 0.35, gate: s(10) - 0.15, out: s(10) + 0.2, hstop: s(10) + 2.3, run: s(11) + 0.04,
    cor: s(12), vG: 16, z0: 48, grab: 28.95, turn: 29.3, wind: s(15) + 0.12, c1: s(15) + 0.78, crack: s(16) + 0.05, open: s(17) + 0.15, faceOn: s(18) - 0.12,
    gturn: s(19) - 0.5, lunge: s(19) - 0.42, c2: s(19) + 0.3, c3: s(20) + 0.38, door: s(22) + 0.25, bed: s(22) + 0.5, fall: s(23) + 0.25,
    clap: s(24), won: s(25), look: s(26) + 0.05, blinds: s(26) + 0.5, tvWave: s(28) + 0.1, mask: s(31) + 0.85, end: ctx.dur };
  T.slam = T.wall + 0.52; T.ceil = T.wall;
  T.sS = T.cor + (96.2 - T.z0) / T.vG; T.sE = T.sS + 0.9;           // Grayson's slide under the gate (z 96.2 -> 103.4)
  T.h1S = T.sS + 0.56; T.h1E = T.h1S + 0.9;                           // the first hunter slides the same way, 0.56 s behind
  T.land = T.c2 + 0.4; T.rise2 = T.c3 - 0.45; T.crash = T.c3 + 0.4; T.up = T.c3 + 0.3; T.spr = T.c3 + 0.95;
  T.ten = s(21) + 0.1; T.nine = s(21) + 1.0; T.eight = s(21) + 1.7;
  return T;
}
// the countdown on the scoreboards (seconds left)
function secAt(t) {
  if (t < T.cd + 2.3) return 300;
  if (t < T.ten) return Math.max(11, 300 - 289 * Math.pow((t - T.cd - 2.3) / (T.ten - T.cd - 2.3), 1.35));
  if (t < T.nine) return 10; if (t < T.eight) return 9; if (t < T.door) return 8; return 7;
}
// the roll-down gate's bottom edge (corridor local z 100)
const gateY = (t) => t < 25.6 ? 12.5 : t < 27.0 ? lerp(12.5, 3.0, (t - 25.6) / 1.4) : t < 27.85 ? lerp(3.0, 1.6, (t - 27.0) / 0.85) : t < 28.35 ? lerp(1.6, 0, (t - 27.85) / 0.5) : 0;

// ---------------- sets ----------------
function bedroom() {
  const g = new THREE.Group(); ctx.scene.add(g); W.room = g;
  const fb = new Batch();
  fb.box(surf('plank', '#7a5a40', { roughness: 0.55 }), BX * 2, 0.3, BZ * 2, 0, -0.15, 0, { r: 0.02 });
  fb.box(paint('#3f4a6a', { roughness: 0.95 }), 9, 0.06, 6.5, -0.5, 0.03, 0.6, { r: 0.03 });   // a rug
  // the dresser and the TV (on the north side, free-standing: it stays when the walls fall)
  fb.box(surf('plank', '#4a3628', { roughness: 0.5 }), 7.2, 3.0, 2.2, 0, 1.5, -6.0, { r: 0.08 });
  for (const x of [-1.8, 1.8]) fb.box(paint('#2a1e16'), 3.0, 0.08, 0.06, x, 1.5, -4.88, { r: 0.01 });
  fb.box(paint('#c9a46a', { metalness: 0.7 }), 0.6, 0.12, 0.12, -1.8, 2.2, -4.86, { r: 0.04 }); fb.box(paint('#c9a46a', { metalness: 0.7 }), 0.6, 0.12, 0.12, 1.8, 2.2, -4.86, { r: 0.04 });
  fb.box(paint('#22242a'), 1.4, 0.5, 0.9, 2.8, 3.25, -5.6, { r: 0.1 });   // a game console
  fb.done(g);
  W.bed = homeBed({ w: 5.4, l: 8.4, cover: '#2c4c7a' }); W.bed.position.set(-5.0, 0, 2.4); W.bed.rotation.y = Math.PI; g.add(W.bed);
  const desk = pcDesk({ w: 8.6 }); desk.position.set(4.2, 0, 4.5); desk.rotation.y = Math.PI; g.add(desk);
  const pl = plant(); pl.position.set(7.4, 0, -6.0); pl.scale.setScalar(0.8); g.add(pl);
  W.tvM = screenMat({ lines: 0.08 }); W.tv = flatTV(W.tvM); W.tv.position.copy(TVP); g.add(W.tv);
  // the four walls: wallpaper inside, plywood flats with braces outside (it was always a set); each hinged at its base's outer edge
  const wp = wallpaper('#c9d3e0', '#b3bfd0'), ply = surf('plank', '#b0915f', { roughness: 0.75 }), brace = paint('#8a6a40', { roughness: 0.8 }), trim = paint('#eae6dc', { roughness: 0.5 });
  const stencil = canvasTex(512, 160, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = 'rgba(30,24,18,0.75)'; x.font = '900 78px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('SET 36-B', w / 2, 70); x.font = '700 40px ITTInter, sans-serif'; x.fillText('BEDROOM  -  THIS SIDE OUT', w / 2, 132); });
  stencil.colorSpace = THREE.SRGBColorSpace;
  const mkWall = (len, holes) => {   // a wall along local x, inner face toward +z (local), base at y 0, outer face at z 0
    const b = new Batch(); const pieces = [[-len / 2, len / 2, 0, BH]];
    let segs = pieces;
    for (const [x0, x1, y0, y1] of holes) { const out = []; for (const [a, c, b0, b1] of segs) { if (x1 <= a || x0 >= c) { out.push([a, c, b0, b1]); continue; } if (x0 > a) out.push([a, x0, b0, b1]); if (x1 < c) out.push([x1, c, b0, b1]); out.push([Math.max(a, x0), Math.min(c, x1), b0, y0]); out.push([Math.max(a, x0), Math.min(c, x1), y1, b1]); } segs = out.filter(([a, c, b0, b1]) => c - a > 0.01 && b1 - b0 > 0.01); }
    for (const [a, c, b0, b1] of segs) { b.box(wp, c - a, b1 - b0, 0.2, (a + c) / 2, (b0 + b1) / 2, 0.3, { r: 0.0 }); b.box(ply, c - a, b1 - b0, 0.2, (a + c) / 2, (b0 + b1) / 2, 0.1, { r: 0.0 }); }
    b.box(trim, len, 0.6, 0.12, 0, 0.3, 0.44, { r: 0.02 });   // skirting
    for (let x = -len / 2 + 1.5; x < len / 2; x += 4.5) if (!holes.some(([h0, h1]) => x > h0 - 0.4 && x < h1 + 0.4)) b.box(brace, 0.4, BH * 0.95, 0.5, x, BH * 0.48, -0.25, { r: 0.03 });   // the flats' braces
    b.box(brace, len, 0.4, 0.4, 0, holes.length ? BH * 0.86 : BH * 0.3, -0.25, { r: 0.03 });
    const grp = b.done(); const st = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.9), new THREE.MeshStandardMaterial({ map: stencil, transparent: true, roughness: 0.8 })); st.position.set(len * 0.18, 6.4, -0.01); st.rotation.y = Math.PI; grp.add(st);
    return grp;
  };
  W.walls = [];
  const wall = (pos, ry, len, holes, fall) => { const pv = new THREE.Group(); pv.position.copy(pos); g.add(pv); const inner = new THREE.Group(); inner.rotation.y = ry; pv.add(inner); inner.add(mkWall(len, holes)); W.walls.push({ pv, inner, fall }); return inner; };
  const north = wall(v3(0, 0, -BZ), 0, BX * 2, [], { ax: 'x', s: -1 });
  const south = wall(v3(0, 0, BZ), Math.PI, BX * 2, [], { ax: 'x', s: 1 });
  const east = wall(v3(BX, 0, 0), -Math.PI / 2, BZ * 2, [[-2.2, 2.2, 3.0, 7.4]], { ax: 'z', s: -1 });
  const west = wall(v3(-BX, 0, 0), Math.PI / 2, BZ * 2, [[-DOORZ1, -DOORZ0, 0, 7.6]], { ax: 'z', s: 1 });
  // posters on the inner faces (original): a band, a racing car, a planet
  const poster = (parent, draw, x, y, w, h) => { const t = canvasTex(256, 340, draw); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); m.position.set(x, y, 0.42); parent.add(m); };
  poster(south, (x, w, h) => { x.fillStyle = '#16213a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff5a3a'; x.beginPath(); x.arc(w / 2, 140, 80, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '900 40px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('NOVA FIVE', w / 2, 290); }, -3, 6.6, 2.6, 3.4);
  poster(south, (x, w, h) => { x.fillStyle = '#f2d24a'; x.fillRect(0, 0, w, h); x.fillStyle = '#c0392b'; x.fillRect(30, 160, 196, 60); x.fillStyle = '#1a1a1a'; x.beginPath(); x.arc(70, 230, 26, 0, 7); x.arc(186, 230, 26, 0, 7); x.fill(); x.font = '900 36px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('TURBO', w / 2, 80); }, 3, 6.4, 2.4, 3.2);
  poster(west, (x, w, h) => { x.fillStyle = '#0c1430'; x.fillRect(0, 0, w, h); x.fillStyle = '#7ab0ff'; x.beginPath(); x.arc(w / 2, h / 2, 90, 0, 7); x.fill(); x.strokeStyle = '#e8d8a8'; x.lineWidth = 8; x.beginPath(); x.ellipse(w / 2, h / 2, 130, 30, -0.3, 0, 7); x.stroke(); }, -3.0, 6.4, 2.6, 3.4);
  // the window (east wall): frame, glass, blinds (closed until the end)
  const wf = new Batch(); for (const z of [-2.35, 2.35]) wf.box(trim, 0.5, 4.8, 0.3, BX - 0.45, 5.2, z, { r: 0.04 }); wf.box(trim, 0.7, 0.3, 5.0, BX - 0.45, 2.9, 0, { r: 0.04 }); wf.box(trim, 0.5, 0.3, 5.0, BX - 0.45, 7.5, 0, { r: 0.04 });
  W.winFrame = wf.done(); east.parent.parent.add(W.winFrame); W.winFrame.position.set(-BX, 0, 0); W.winFrame.parent.remove(W.winFrame); east.add(W.winFrame); W.winFrame.rotation.y = Math.PI / 2; W.winFrame.position.set(0, 0, -BX);
  W.glass = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshStandardMaterial({ color: '#9fb4c8', transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0.4, depthWrite: false })); W.glass.position.set(BX - 0.3, 5.2, 0); W.glass.rotation.y = -Math.PI / 2; g.add(W.glass);
  W.blinds = new THREE.Group(); const sl = new Batch(); for (let k = 0; k < 15; k++) sl.box(paint('#e4e0d6', { roughness: 0.7 }), 0.06, 0.28, 4.4, 0, -k * 0.29, 0, { r: 0.02, rz: 0.25 }); sl.done(W.blinds);
  W.blinds.position.set(BX - 0.55, 7.25, 0); g.add(W.blinds);
  // the door (west wall), hinge at z DOORZ0, leaf to DOORZ1; it opens inward (+x)
  const db = new Batch(); db.box(paint('#e6e0d6', { roughness: 0.45 }), 0.25, 7.5, DOORZ1 - DOORZ0, 0, 3.75, (DOORZ1 - DOORZ0) / 2, { r: 0.04 }); db.box(paint('#c9a46a', { metalness: 0.8, roughness: 0.3 }), 0.4, 0.2, 0.2, 0.2, 3.6, DOORZ1 - DOORZ0 - 0.4, { r: 0.06 });
  W.door = db.done(); W.door.position.set(-BX + 0.42, 0, DOORZ0); g.add(W.door);
  W.doorLight = new THREE.Mesh(new THREE.PlaneGeometry(DOORZ1 - DOORZ0, 7.6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(1.6), transparent: true, opacity: 0 })); W.doorLight.position.set(-BX - 0.2, 3.8, (DOORZ0 + DOORZ1) / 2); W.doorLight.rotation.y = Math.PI / 2; W.doorLight.userData.noAO = true; g.add(W.doorLight);
  // the ceiling (a flat lifted away on cables)
  const cb = new Batch(); cb.box(paint('#e8e6e0', { roughness: 0.8 }), BX * 2 + 0.2, 0.4, BZ * 2 + 0.2, 0, 0, 0, { r: 0.02 }); cb.box(paint('#d8d4cc'), 2.2, 0.3, 2.2, 0, -0.3, 0, { r: 0.4 });
  for (const [x, z] of [[-8, -6.5], [8, -6.5], [-8, 6.5], [8, 6.5]]) cb.cyl(paint('#1a1a1e', { metalness: 0.6 }), 0.05, 0.05, 60, x, 30.2, z, { seg: 5 });
  W.ceil = cb.done(); W.ceil.position.y = BH + 0.2; g.add(W.ceil);
  // the house facade outside the east wall (only at the end, seen from the street): siding round the window, down to the street
  const fc = new Batch(), sid = surf('siding', '#7d8ea6'), H0 = -12;
  fc.box(sid, 0.4, BH - H0 + 2, BZ * 2 + 8, BX + 0.6, (BH + 2 + H0) / 2, -0, { r: 0.0 });
  W.facade = fc.done(); g.add(W.facade);
  // cut the window hole out of the facade by building it as pieces instead
  W.facade.clear(); const fp = new Batch(); const zA = -BZ - 4, zB = BZ + 4;
  fp.box(sid, 0.4, 3.0 - H0, zB - zA, BX + 0.6, (3.0 + H0) / 2, 0); fp.box(sid, 0.4, BH + 2 - 7.4, zB - zA, BX + 0.6, (BH + 2 + 7.4) / 2, 0);
  fp.box(sid, 0.4, 4.4, -2.2 - zA, BX + 0.6, 5.2, (zA - 2.2) / 2); fp.box(sid, 0.4, 4.4, zB - 2.2, BX + 0.6, 5.2, (zB + 2.2) / 2);
  fp.box(paint('#2a2d36'), 3, 0.6, zB - zA + 2, BX + 1.4, BH + 2.2, 0, { r: 0.1, rz: -0.35 });
  for (const z of [-2.7, 2.7]) fp.box(paint('#3a3f4a'), 0.3, 4.8, 0.7, BX + 0.85, 5.2, z, { r: 0.04 });
  fp.done(W.facade);
}

function arena() {
  const g = new THREE.Group(); ctx.scene.add(g); W.arena = g;
  const b = new Batch();
  b.box(surf('tile', '#cfc9be', { roughness: 0.18 }), 300, 0.4, 300, 0, -0.5, 0, { r: 0.0 });
  b.box(paint('#b0243a', { roughness: 0.4 }), 52, 0.05, 0.8, 0, -0.28, 0, {}); b.box(paint('#b0243a', { roughness: 0.4 }), 0.8, 0.05, 52, 0, -0.28, 0, {});
  b.cyl(paint('#e0b040', { roughness: 0.4, metalness: 0.4 }), 20, 20, 0.06, 0, -0.27, 0, { seg: 64 }); b.cyl(surf('tile', '#cfc9be', { roughness: 0.18 }), 19.2, 19.2, 0.08, 0, -0.26, 0, { seg: 64 });
  // tunnel mouths: the hunters' gate (-z) and the way out (+z)
  const dark = paint('#08090c', { roughness: 0.95 }), steel = paint('#3a3d44', { metalness: 0.6, roughness: 0.4 });
  for (const s of [-1, 1]) { b.box(dark, 14, 14, 30, 0, 7, s * 52, {}); b.box(steel, 1.2, 14, 1.2, -7.2, 7, s * 26.5, { r: 0.1 }); b.box(steel, 1.2, 14, 1.2, 7.2, 7, s * 26.5, { r: 0.1 }); b.box(steel, 15.6, 1.4, 1.4, 0, 13.6, s * 26.5, { r: 0.1 }); }
  b.done(g);
  W.seats = seatBanks({ gaps: { '+z': 7.6, '-z': 7.6 }, gapRows: 7 }); g.add(W.seats);
  W.mall = mallRing({ r: 64, h: 58 }); g.add(W.mall);
  W.cdCanvas = document.createElement('canvas'); W.cdCanvas.width = 1024; W.cdCanvas.height = 552; W.cdTex = new THREE.CanvasTexture(W.cdCanvas); W.cdTex.colorSpace = THREE.SRGBColorSpace;
  W.jumboM = screenMat({ ui: W.cdTex, rt: W.hostRT, lines: 0.05 }); W.jumbo = jumbotron(W.jumboM); W.jumbo.position.set(0, 34, 0); g.add(W.jumbo);
  // the hunters' gate shutter (rises), a red light and fog inside
  W.hgate = rollGate({ w: 14, h: 13 }); W.hgate.position.set(0, 0, -27.4); g.add(W.hgate);
  W.fog = smokeHaze(ctx.scene, { centre: v3(0, 3, -34), size: v3(14, 6, 14), count: 160, color: '#5a2028', amount: 0.32, pointSize: 9 });
  W.exitSign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2), shopSign('EXIT', { fg: '#7dff9a', bg: '#08140c', glow: 0.9 })); W.exitSign.position.set(0, 15, 25.6); W.exitSign.rotation.y = Math.PI; g.add(W.exitSign);
  // truss rigs with spotlights (beams as faint cones)
  const tb = new Batch(), truss = paint('#2a2c31', { metalness: 0.7, roughness: 0.35 });
  for (const s of [-1, 1]) { tb.box(truss, 70, 1.0, 1.0, 0, 46, s * 18, { r: 0.05 }); tb.box(truss, 1.0, 1.0, 70, s * 18, 46.2, 0, { r: 0.05 }); }
  tb.done(g);
  W.beams = [];
  const beamM = new THREE.MeshBasicMaterial({ color: '#fff2d8', transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const [x, z] of []) { const len = Math.hypot(x, 46, z); const cg = new THREE.ConeGeometry(4.4, len, 24, 1, true).translate(0, -len / 2, 0); const m = new THREE.Mesh(cg, beamM); m.position.set(x, 46, z); m.lookAt(0, 0, 0); m.rotateX(-Math.PI / 2); m.userData.noAO = true; g.add(m); W.beams.push(m); }
}

function corridor() {
  const g = new THREE.Group(); g.position.copy(CO); ctx.scene.add(g); W.corr = g;
  const b = new Batch(), H = 16, wall = surf('concrete', '#3a3c44', { roughness: 0.8 }), frame = paint('#2a2c32', { metalness: 0.6, roughness: 0.35 });
  b.box(vinyl('#c9c3b6'), 26, 0.4, 150, 0, -0.2, 95, { r: 0.0 });
  b.box(paint('#1a1c22'), 26, 0.6, 150, 0, H + 0.3, 95, {});
  for (let z = 25; z < 170; z += 8) b.box(paint('#2a2c34', { metalness: 0.4 }), 26, 0.6, 0.6, 0, H - 0.3, z, {});
  // shop bays both sides: glass fronts at x ±10 (the panes are separate meshes so they can shatter), frames, signs, interiors
  W.panes = []; let k = 0;
  for (const side of [-1, 1]) for (let z = 26; z < 156; z += 10) {
    const x = side * 10;
    b.box(frame, 0.5, 11, 0.5, x, 5.5, z - 5, { r: 0.04 }); b.box(frame, 0.5, 0.6, 10, x, 0.3, z, { r: 0.04 }); b.box(frame, 0.5, 0.5, 10, x, 10.4, z, { r: 0.04 });
    b.box(wall, 0.5, H - 11, 10, x, 11 + (H - 11) / 2, z, { r: 0.0 });
    const lit = (k * 7 % 5) !== 0 && !(side === 1 && z === 126), interior = shopWindowMat(k * 3 + 11, lit);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 10), interior); back.position.set(side * 18, 5.3, z); back.rotation.y = -side * Math.PI / 2; g.add(back);
    b.box(paint(lit ? '#d8d2c4' : '#2a2b30', { roughness: 0.6 }), 8, 0.3, 9.6, side * 14, 0.05, z, {}); b.box(paint(lit ? '#ece6da' : '#1c1d22'), 8, 0.3, 9.6, side * 14, 11.0, z, {});
    for (const zz of [z - 4.9, z + 4.9]) b.box(paint(lit ? '#e6e0d4' : '#202126'), 8, 11, 0.3, side * 14, 5.5, zz, {});
    if (lit) { for (let s = 0; s < 3; s++) b.box(paint('#7a6248'), 1.2, 0.2, 8.4, side * 16.5, 2.5 + s * 2.6, z, {}); }
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.6), shopSign(['MOONBEAN', 'PIXEL PLAZA', 'KICKS & CO', 'TOY ATTIC', 'LUMEN', 'SODA STOP', 'GADGET HUT', 'NOVA BOOKS', 'GLOW NAILS', 'BURGER BAY', 'ARC CADE', 'PETAL & PINE', 'SPIN RECORDS'][k % 13], { glow: lit ? 0.75 : 0.12 }));
    sg.position.set(x - side * 0.3, 12.6, z); sg.rotation.y = -side * Math.PI / 2; g.add(sg);
    const open = side === 1 && z === 126;   // the dark shop the second hunter waits in: its door stands open
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 9.6), new THREE.MeshStandardMaterial({ color: '#a8c0d0', transparent: true, opacity: 0.16, roughness: 0.03, metalness: 0.5, depthWrite: false, side: THREE.DoubleSide }));
    pane.position.set(x, 5.4, z); pane.rotation.y = Math.PI / 2; pane.userData.noAO = true; if (!open) g.add(pane);
    W.panes.push({ side, z, x, mesh: open ? null : pane, lit, t: 1e9 });
    k++;
  }
  // the second hunter's dark doorway (x +10, z 124..128)
  b.box(paint('#050506'), 0.2, 8, 3.4, 10.1, 4, 126, {});
  // the security gate (z 100), the construction stop beyond it (a pallet of scaffold pipes, barriers, a scaffold tower)
  W.gate = rollGate({ w: 20, h: 12.6 }); W.gate.position.set(0, 0, 100); g.add(W.gate);
  b.box(surf('plank', '#a07a50', { roughness: 0.8 }), 3.2, 0.5, 4.6, 6.6, 0.25, 111.2, { r: 0.03 });
  for (let i = 0; i < 9; i++) b.cyl(paint('#8e959c', { metalness: 0.85, roughness: 0.32 }), 0.13, 0.13, 4.4, 5.4 + (i % 5) * 0.55, 0.65 + Math.floor(i / 5) * 0.26, 111.2, { rx: Math.PI / 2, seg: 10 });
  for (const [x, z] of [[8.6, 106], [8.6, 116]]) { b.box(surf('hazard', '#e8b923'), 0.5, 2.4, 3, x, 1.2, z, { r: 0.05 }); }
  const sc = paint('#c8641e', { metalness: 0.5, roughness: 0.5 }); for (const x of [-8.5, -6.0]) for (const z of [104, 107]) b.cyl(sc, 0.12, 0.12, 12, x, 6, z, { seg: 8 }); for (const y of [3, 6.5, 10]) { b.box(sc, 2.7, 0.18, 0.18, -7.25, y, 104, {}); b.box(sc, 2.7, 0.18, 0.18, -7.25, y, 107, {}); b.box(surf('plank', '#9a7650'), 2.8, 0.2, 3.4, -7.25, y + 0.2, 105.5, {}); }
  // the end wall with the exit doors (z 150)
  b.box(wall, 26, H, 1, 0, H / 2, 150.6, {});
  b.done(g);
  W.exitDoors = [];
  for (const s of [-1, 1]) { const db = new Batch(); db.box(paint('#5a6068', { metalness: 0.5, roughness: 0.4 }), 3.6, 8.6, 0.3, -s * 1.8, 4.3, 0, { r: 0.04 }); db.box(paint('#c9cfd4', { metalness: 0.85 }), 3.0, 0.3, 0.3, -s * 1.8, 4.2, -0.3, { r: 0.08 }); db.box(paint('#a8c4d8', { roughness: 0.05, metalness: 0.4 }), 1.4, 2.2, 0.32, -s * 1.8, 6.4, 0, { r: 0.02 });
    const d = db.done(); d.position.set(s * 3.6, 0, 150.05); g.add(d); W.exitDoors.push({ d, s }); }
  W.exitLight = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 8.6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(2.2) })); W.exitLight.position.set(0, 4.3, 151.2); W.exitLight.rotation.y = Math.PI; W.exitLight.userData.noAO = true; g.add(W.exitLight);
  const ex = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.0), shopSign('EXIT', { fg: '#7dff9a', bg: '#08140c', glow: 1.0 })); ex.position.set(0, 10.2, 150.0); ex.rotation.y = Math.PI; g.add(ex);
  // the hanging countdown over the corridor (both faces)
  W.tmCanvas = document.createElement('canvas'); W.tmCanvas.width = 512; W.tmCanvas.height = 256; W.tmTex = new THREE.CanvasTexture(W.tmCanvas); W.tmTex.colorSpace = THREE.SRGBColorSpace;
  const tmM = screenMat({ ui: W.tmTex, lines: 0.04 }); const tb = new Batch(); tb.box(paint('#101116', { metalness: 0.5 }), 8.4, 4.4, 1.0, 0, 0, 0, { r: 0.15 }); for (const x of [-3, 3]) tb.cyl(paint('#2a2c31', { metalness: 0.7 }), 0.06, 0.06, 4, x, 4.2, 0, { seg: 5 });
  W.timer = tb.done(); for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 3.9), tmM); m.position.z = s * 0.52; m.rotation.y = s < 0 ? Math.PI : 0; m.userData.noAO = true; W.timer.add(m); }
  W.timer.position.set(0, 11.2, 134); g.add(W.timer);
  // ceiling panels (some dead) along the corridor
  W.panels = []; for (let z = 30; z < 150; z += 12) { const f = fluorPanel(3.0, 7.0, { tint: '#f2f6ff', gain: 1.2 }); f.position.set(0, H - 0.6, z); g.add(f); W.panels.push({ f, z, dead: (z / 12 | 0) % 4 === 1 }); }
}

function studio() {
  const g = studioSet(); g.position.copy(HS); ctx.scene.add(g); W.studio = g;
  // confetti for the win (instanced quads, pure function of t)
  const n = 260, r = rng(31), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.28, 0.18), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: true }), n); im.frustumCulled = false;
  const cols = ['#ffd34a', '#ff3a4a', '#4ad0ff', '#ffffff', '#b46aff'];
  const C0 = []; for (let i = 0; i < n; i++) { C0.push({ x: (r() - 0.5) * 30, z: -6 + r() * 26, y0: 18 + r() * 6, sp: 2.5 + r() * 2, ph: r() * 6.28, d: r() * 1.5 }); im.setColorAt(i, new THREE.Color(cols[i % 5])); }
  im.update = (t, t0) => { C0.forEach((c, i) => { const dt = t - t0 - c.d; const y = dt < 0 ? -50 : c.y0 - c.sp * dt; E.set(dt * 3 + c.ph, dt * 2, c.ph); Q.setFromEuler(E); M.compose(v3(c.x + Math.sin(dt * 2 + c.ph) * 0.8, Math.max(y, 0.1), c.z), Q, v3(1, 1, 1)); im.setMatrixAt(i, M); }); im.instanceMatrix.needsUpdate = true; };
  g.add(im); W.confetti = im;
}

function street() {
  const g = new THREE.Group(); ctx.scene.add(g); W.street = g;
  const b = new Batch(), Y = -12;
  b.box(surf('grass', '#2f4a2a', { roughness: 0.95 }), 300, 0.4, 300, 40, Y - 0.2, 0, {});
  b.box(new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.85 }), 14, 0.3, 300, 30, Y + 0.02, 0, {});
  for (let z = -140; z < 140; z += 10) b.box(paint('#d8c86a', { roughness: 0.6 }), 0.3, 0.04, 4.4, 30, Y + 0.2, z, {});
  for (const x of [21.5, 38.5]) b.box(surf('concrete', '#8a867e'), 3, 0.5, 300, x, Y + 0.1, 0, {});
  b.box(surf('concrete', '#6e6b66'), 22, 0.4, 300, 8, Y - 0.05, 0, {});   // our side's yards
  b.done(g);
  W.tvMats = []; W.houses = [];
  const cols = ['#8a96a8', '#a89a86', '#9aa88e', '#a48e9a', '#8ea4a8', '#b0a48a'];
  [-66, -44, -22, 0, 22, 44, 66].forEach((z, i) => { const m = screenMat({ rt: W.streetRT, lines: 0.1 }); m.uniforms.k.value = 0; W.tvMats.push(m);
    const h = tvHouse({ seed: i + 3, wall: cols[i % cols.length], tvMat: m }); h.position.set(46, Y, z); g.add(h); W.houses.push(h); });
  W.lamps = []; for (const z of [-50, -10, 30, 70]) { const lm = lamp({ height: 14 }); lm.position.set(39.5, Y, z); lm.rotation.y = Math.PI; g.add(lm); W.lamps.push(v3(38, Y + 13.6, z)); }
  for (const [z, s] of [[-30, 2], [52, 5], [12, 8]]) { /* trees by the sidewalk */ const tb = new Batch(); tb.cyl(paint('#3a2a20'), 0.5, 0.7, 8, 0, 4, 0, { seg: 8 }); tb.add(paint('#1e3a22', { roughness: 0.95 }), new THREE.IcosahedronGeometry(4.6, 1), 0, 10, 0); const tr = tb.done(); tr.position.set(41.5, Y, z); tr.scale.setScalar(0.9 + s * 0.04); g.add(tr); }
}

// ---------------- characters ----------------
const AUD = ['farm_ep28_pearls', 'farm_ep28_tophat', 'farm_ep28_ruby', 'farm_mia', 'farm_noah', 'farm_john', 'farm_maya', 'farm_kai', 'farm_grandma_june', 'farm_beanie_guy', 'farm_oliver', 'farm_lily_pink'];
const LASH = new Set(['farm_ep28_pearls', 'farm_ep28_ruby', 'farm_mia', 'farm_maya', 'farm_grandma_june', 'farm_lily_pink']);
function people() {
  const mk = (avatar, o = {}) => { const c = makeCharacter({ avatar, alti: true, skin: o.skin, caustic: false }); ctx.scene.add(c.root); c.root.rotation.order = 'YXZ'; if (o.lash) c.faceStyle = (x) => 'lash:' + x; c.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); c.root.visible = false; return c; };
  W.g = mk('farm_grayson', { skin: GSKIN });
  W.host = mk('farm_ep36_host_c');
  W.h = ['farm_ep36_hunter_a', 'farm_ep36_hunter_b', 'farm_ep36_hunter_c'].map((a, i) => { const c = mk(a); c.reset(); c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0); c.root.updateMatrixWorld(true); c.helm = hunterHelmet(c, { number: i + 1 }); return c; });
  // Grayson masked (the TVs at the end) and his masked reflection in the window glass
  W.gm = mk('farm_grayson', { skin: GSKIN }); W.gm.reset(); W.gm.root.position.set(0, 0, 0); W.gm.root.rotation.set(0, 0, 0); W.gm.root.updateMatrixWorld(true); W.gm.helm = hunterHelmet(W.gm, { number: 4 });
  W.gr = mk('farm_grayson', { skin: GSKIN }); W.gr.reset(); W.gr.root.position.set(0, 0, 0); W.gr.root.rotation.set(0, 0, 0); W.gr.root.updateMatrixWorld(true); W.gr.helm = hunterHelmet(W.gr, { number: 4 });
  W.gr.root.traverse((m) => { if (m.isMesh) { const ms = Array.isArray(m.material) ? m.material : [m.material]; const cl = ms.map((x) => { const y = x.clone(); y.transparent = true; y.opacity = 0.42; y.depthWrite = false; if (y.color) y.color.multiplyScalar(0.7); return y; }); m.material = Array.isArray(m.material) ? cl : cl[0]; m.castShadow = false; m.renderOrder = 4; } });
  W.aud = AUD.map((a) => mk(a, { lash: LASH.has(a) }));
  for (const c of [W.g, W.host, ...W.h, ...W.aud]) { c.reset(); c.root.rotation.set(0, 0, 0); c.root.updateMatrixWorld(true); const bx = new THREE.Box3().setFromObject(c.root); c.tall = bx.max.y - bx.min.y; }
  // rifles for the first and third hunters (black, no orange tip)
  W.rifles = [0, 2].map(() => { const r = trainingRifle({ body: '#141518', trim: '#1d1e22', tip: '#141518' }); ctx.scene.add(r); r.visible = false; return r; });
  W.pipe = metalPipe(); ctx.scene.add(W.pipe); W.pipe.visible = false;
}
const ALL = () => [W.g, W.gm, W.gr, W.host, ...W.h, ...W.aud];
const hideAll = () => { ALL().forEach((c) => { c.root.visible = false; }); W.rifles.forEach((r) => { r.visible = false; }); W.pipe.visible = false; };
function face(c, name, t, ph = 0.3, o = {}) { if (!c.setFace) return; const nm = c.faceStyle ? c.faceStyle(name) : name; c.setFace(nm, { blink: o.noBlink ? false : blinkAt(t, ph) && !['shocked', 'terrified', 'surprised'].includes(name), viseme: o.viseme, gaze: o.gaze }); }
function place(c, p, yaw, rx = 0) { c.root.visible = true; c.reset(); c.root.position.copy(p); c.root.rotation.set(rx, yaw, 0); c.root.scale.setScalar(1); }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
function sitOn(c, p, yaw, y, t) { place(c, p, yaw); pose(c, 'sit', t); const hy = c.hips.position.y; c.root.position.y = y - (hy - 0.55); }
const fwd = (yaw) => v3(Math.sin(yaw), 0, Math.cos(yaw));
const rightOf = (yaw) => v3(-Math.cos(yaw), 0, Math.sin(yaw));   // a character's right side (facing +z, the right arm is on -x)
const head = (c) => c.neck.getWorldPosition(v3()).add(v3(0, 0.75, 0));

// ---------------- the speed edit round the two melee strikes that decide the fight (Episode 33's impact sequences) ----------------
const SPD = () => [
  { c: T.c1, wind: 0.6, snap: 0.13, slow: 0.42, fast: 2.3, rec: 1.3, at: () => C(3.75, 5.0, 106.7) },
  { c: T.c3, wind: 0.55, snap: 0.12, slow: 0.42, fast: 2.3, rec: 1.3, at: () => W.kickAt || C(2.4, 2.4, 108) },
];
const HOLDF = 5, IMPSEQ = ['w', 'w', 'b', 'b', 'w'];
let MAP = null;
function buildMap() {
  const dt = 1 / 2400;
  MAP = SPD().map((p) => {
    const v0 = p.c - p.wind, pts = []; let v = v0, x = v0, ph = 0, cv = 0, tEnd = 0;
    for (let guard = 0; guard < 2400 * 8; guard++) {
      pts.push(x); let sp = 1;
      if (ph === 0) { sp = lerp(1, p.slow, clamp((v - v0) / 0.12)); if (x >= p.c - p.snap) ph = 1; }
      if (ph === 1) { sp = p.fast; if (x + sp * dt >= p.c) { x = p.c; cv = v + dt; ph = 2; } }
      if (ph === 2) { sp = 0; if (v >= cv + HOLDF / 60) { ph = 3; tEnd = v + 0.12; } }
      if (ph === 3) { sp = 1; if (v >= tEnd) ph = 4; }
      if (ph === 4) { const gap = v - x; sp = 1 + (p.rec - 1) * clamp(gap / 0.06); if (gap < 0.0015) break; }
      if (ph !== 2) x += sp * dt; v += dt;
    }
    return { ...p, v0, v1: v, dt, pts, cv };
  });
}
function remap(v) { if (!MAP) return v; for (const m of MAP) { if (v < m.v0 || v >= m.v1) continue; const f = (v - m.v0) / m.dt, i = Math.floor(f), a = m.pts[Math.min(i, m.pts.length - 1)], b = m.pts[Math.min(i + 1, m.pts.length - 1)]; return a + (b - a) * (f - i); } return v; }
function held(v) { if (!MAP) return null; for (const m of MAP) { const k = Math.floor((v - m.cv) * 60 + 1e-4); if (k >= 0 && k < HOLDF) return { m, k }; } return null; }
function unmap(s) { let a = s - 2, b = s + 2; for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (remap(m) < s) a = m; else b = m; } return b; }

// ---------------- the corridor choreography (pure functions of t) ----------------
const zG = (t) => T.z0 + T.vG * (t - T.cor);
function slideZ(t, t0) { const tau = clamp(t - t0, 0, 0.9); return 96.2 + 16 * tau - 0.5 * (16 / 0.9) * tau * tau; }
// the pipe swing: angle phi round Grayson's chest (0 ahead, + toward his right), elevation el
function swing(t) {
  if (t < T.turn) return null;
  const k1 = smooth(T.turn, T.turn + 0.35, t), wnd = smooth(T.wind, T.c1 - 0.2, t), sn = clamp((t - (T.c1 - 0.2)) / 0.2), ft = smooth(T.c1, T.c1 + 0.3, t), lw = smooth(T.c1 + 0.6, T.c1 + 1.4, t);
  let phi = lerp(0.6, 1.0, k1), el = lerp(0.3, 0.95, k1);
  if (t >= T.wind) { phi = lerp(1.0, 2.25, easeInOut(wnd)); el = lerp(0.95, 0.35, wnd); }
  if (t >= T.c1 - 0.2) { phi = lerp(2.25, -0.14, easeIn(sn)); el = lerp(0.35, 0.08, sn); }
  if (t >= T.c1) { phi = lerp(-0.14, -1.55, easeOut(ft)); el = 0.08; }
  if (t >= T.c1 + 0.6) { phi = lerp(-1.55, -0.35, easeInOut(lw)); el = lerp(0.08, -0.75, lw); }
  return { phi, el };
}
const GSTR = () => C(4.2, 0, 110.2);   // where Grayson stands with the pipe (facing -z)
function pipeAt(t, gp, yaw) {
  const s = swing(t); if (!s) return null;
  const f = fwd(yaw), r = rightOf(yaw), chest = gp.clone().add(v3(0, 4.25, 0));
  const dir = f.clone().multiplyScalar(Math.cos(s.phi)).addScaledVector(r, Math.sin(s.phi)).multiplyScalar(Math.cos(s.el)).add(v3(0, Math.sin(s.el), 0)).normalize();
  const hand = chest.clone().addScaledVector(f.clone().multiplyScalar(Math.cos(s.phi)).addScaledVector(r, Math.sin(s.phi)), 1.25).add(v3(0, -0.15, 0));
  return { hand, dir, tip: hand.clone().addScaledVector(dir, 4.0), s };
}
// Grayson's state in the corridor: root position, yaw, pose name, root pitch
function gCorr(t) {
  const G2 = GSTR();
  if (t < T.sS) return { p: C(0, 0, zG(t)), yaw: 0, mode: 'run' };
  if (t < T.sE + 0.4) { const z = slideZ(t, T.sS), k = smooth(T.sE, T.sE + 0.4, t); return { p: C(0, 0.25 * (1 - k), z), yaw: 0, mode: 'slide', rx: lerp(-1.12, 0, easeOut(k)) * (t < T.sS + 0.12 ? smooth(T.sS, T.sS + 0.12, t) : 1) }; }
  const a = C(0, 0, 103.4), pre = C(4.2, 0, 109.0);
  if (t < T.grab) { const k = smooth(T.sE + 0.4, T.grab, t); return { p: lp3(a, pre, easeInOut(k)), yaw: Math.atan2(pre.x - a.x, pre.z - a.z), mode: 'run' }; }
  if (t < T.turn) { const k = smooth(T.grab, T.grab + 0.2, t); return { p: lp3(pre, G2, k), yaw: lerp(Math.atan2(4.2, 6.6), Math.PI / 2 + 0.2, k), mode: 'grab' }; }
  if (t < T.gturn) { const back = smooth(T.c1 + 0.5, T.faceOn, t); const p = lp3(G2, C(4.0, 0, 111.6), easeInOut(back)); return { p, yaw: lerp(Math.PI / 2 + 0.2, Math.PI, smooth(T.turn, T.turn + 0.35, t)), mode: 'strike' }; }
  // he turns to run for the exit and is tackled
  const d2 = W.d2, gp = C(4.0, 0, 111.6), psi = Math.atan2(-d2.x, -d2.z);
  if (t < T.c2) return { p: gp, yaw: lerp(Math.PI, psi + 2 * Math.PI * 0 , easeInOut(smooth(T.gturn, T.gturn + 0.3, t))), mode: 'turn' };
  const lay = C(4.0, 0, 111.6).addScaledVector(d2, 2.8);
  if (t < T.up) { const k = easeOut(smooth(T.c2, T.land, t)); return { p: lp3(gp, lay, k).setY(lerp(0, 0.5, k)), yaw: psi, mode: 'down', rx: lerp(0, -Math.PI / 2 + 0.42, easeIn(smooth(T.c2, T.land, t))) }; }
  if (t < T.spr) { const k = smooth(T.up, T.spr, t); return { p: lay.clone().setY(lerp(0.5, 0, k)), yaw: lerp(psi, 0, easeInOut(k)), mode: 'rise', rx: lerp(-Math.PI / 2 + 0.42, 0, easeInOut(k)) }; }
  const door = C(0, 0, 148.6), k = clamp((t - T.spr) / (T.door - T.spr));
  return { p: lp3(lay, door, k), yaw: Math.atan2(door.x - lay.x, door.z - lay.z), mode: 'run' };
}
// hunter i in the corridor
function hCorr(i, t) {
  if (i === 0) {
    if (t < T.h1S) return { p: C(-1.8, 0, zG(t) - 9), yaw: 0, mode: 'run' };
    if (t < T.h1E + 0.5) { const z = slideZ(t, T.h1S), k = smooth(T.h1E, T.h1E + 0.5, t); return { p: C(-1.8, 0.2 * (1 - k), z), yaw: 0, mode: 'slide', rx: lerp(-1.32, 0, k) * smooth(T.h1S, T.h1S + 0.1, t) }; }
    const a = C(-1.8, 0, 103.4), b = C(3.75, 0, 106.65), k = smooth(T.h1E + 0.5, T.c1 - 0.1, t);
    const p = lp3(a, b, k); let yaw = Math.atan2(b.x - a.x, b.z - a.z);
    if (t >= T.c1) { const s = smooth(T.c1, T.c1 + 0.35, t), back = smooth(T.c1 + 0.9, T.crack + 0.6, t); p.add(v3(-1.1 * s * (1 - back * 0.6), 0, -0.6 * s)); yaw = lerp(yaw, yaw - 0.9, s * (1 - back)) ; }
    if (t >= T.c1 + 1.0) yaw = lerp(yaw, yawTo(p, gCorr(t).p), smooth(T.c1 + 1.0, T.open, t));
    const bk = smooth(T.faceOn + 0.8, T.c3 - 0.3, t); if (bk > 0) p.lerp(C(0.4, 0, 102.4), easeInOut(bk));
    return { p, yaw, mode: t < T.c1 - 0.1 ? 'walk' : 'stand' };
  }
  if (i === 2) { const z = Math.min(zG(t) - 14, 97.2); return { p: C(1.8, 0, z), yaw: 0, mode: zG(t) - 14 < 97.2 ? 'run' : 'stand' }; }
  // the second hunter: in the dark doorway, then the lunge, the tackle, kneeling on him, kicked through the glass
  const door = C(11.4, 0, 126), d2 = W.d2, gp = C(4.0, 0, 111.6);
  if (t < T.lunge) return { p: door, yaw: -Math.PI / 2 - 0.3, mode: 'stand' };
  const hit = gp.clone().addScaledVector(d2, -1.3);
  if (t < T.c2) { const k = (t - T.lunge) / (T.c2 - T.lunge); return { p: lp3(door, hit, k), yaw: Math.atan2(d2.x, d2.z), mode: 'lunge', rx: 0.9 * smooth(T.c2 - 0.3, T.c2, t) }; }
  const lay = gp.clone().addScaledVector(d2, 2.8), knee = lay.clone().addScaledVector(d2, 0.9);
  if (t < T.c3) { const k = easeOut(smooth(T.c2, T.land, t)); return { p: lp3(hit, knee, k), yaw: Math.atan2(d2.x, d2.z), mode: t < T.land ? 'lunge' : 'kneel', rx: lerp(0.9, 0, smooth(T.land - 0.1, T.land + 0.2, t)), rise: smooth(T.rise2, T.c3, t) }; }
  const kd = v3(0.6, 0, 0.8).normalize(), far = knee.clone().addScaledVector(kd, 12.5), u = clamp((t - T.c3) / (T.crash - T.c3));
  if (t < T.crash + 0.5) { const p = lp3(knee, far, easeOut(u)); p.y = Math.sin(Math.PI * Math.min(1, u)) * 2.2 + (t > T.crash ? -1.5 * smooth(T.crash, T.crash + 0.4, t) : 0); return { p: t > T.crash ? far.clone().add(v3(0.8, Math.max(0, 1.0 - 4 * (t - T.crash)), 0.4)) : p, yaw: Math.atan2(-kd.x, -kd.z), mode: 'flung', rx: -1.1 * easeOut(Math.min(1, u * 1.4)) }; }
  return { p: far.clone().add(v3(1.2, 0.5, 0.6)), yaw: Math.atan2(-kd.x, -kd.z), mode: 'down', rx: -Math.PI / 2 + 0.05 };
}

// ---------------- render targets ----------------
function renderRT(rt, cam) { const { renderer, scene } = ctx; renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(null); }
const SETS = ['room', 'arena', 'corr', 'studio', 'street'];
function only(...ks) { for (const k of SETS) W[k].visible = ks.includes(k); }

// ---- lights ----
function rig() {
  W.pl = []; for (let i = 0; i < 10; i++) { const l = new THREE.PointLight('#ffffff', 0, 30, 1.6); ctx.scene.add(l); W.pl.push(l); }
  W.key = new THREE.SpotLight('#ffffff', 0, 80, 0.7, 0.7, 1.2); W.key.castShadow = true; W.key.shadow.mapSize.set(1024, 1024); W.key.shadow.bias = -0.0006; W.key.shadow.normalBias = 0.04; ctx.scene.add(W.key); ctx.scene.add(W.key.target);
}
const setL = (i, p, col, I, dist) => { const l = W.pl[i]; l.position.copy(p); l.color.set(col); l.intensity = I; l.distance = dist; };
function lightSet(set, t, focus = v3(), o = {}) {
  W.pl.forEach((l) => { l.intensity = 0; }); W.key.intensity = 0;
  const key = (p, tgt, col, I, ang = 0.7, dist = 60) => { W.key.position.copy(p); W.key.target.position.copy(tgt); W.key.color.set(col); W.key.intensity = I; W.key.angle = ang; W.key.distance = dist; };
  if (set === 'room') {   // night: a cold moon key through the blinds, the TV's flicker, a dim fill
    const tvI = o.tv ?? 0; setL(0, TVP.clone().add(v3(0, 0, 2.2)), '#9ec4ff', 20 * tvI * (0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 5.3)), 22);
    setL(1, v3(-2, 9.0, 4), '#5a6aa0', 7, 30); setL(2, v3(0.5, 6.5, -1.0), '#ffc890', o.lampI ?? 9, 15);
    key(v3(14, 11, 2), v3(focus.x, 3, focus.z), '#a8bcec', o.moon ?? 70, 0.6, 50);
    if (o.door) setL(3, v3(-BX - 1.5, 4, (DOORZ0 + DOORZ1) / 2), '#ffffff', 120 * o.door, 26);
  } else if (set === 'arena') {
    const on = o.on ?? 1;
    key(v3(-14, 44, 18), v3(focus.x, 2, focus.z), '#fff0d8', 900 * on, 0.32, 120);
    setL(0, v3(0, 30, 0), '#cfe0ff', 160 * on, 70); setL(1, v3(18, 24, 18), '#ffe2c0', 90 * on, 60); setL(2, v3(-18, 24, -18), '#ffe2c0', 90 * on, 60);
    setL(3, v3(0, 6, -34), '#ff2a30', o.red ?? 0, 30); setL(4, focus.clone().add(v3(6, 8, 8)), '#f2f0ff', 30 * on, 26);
    setL(5, v3(0, 22, 0), '#ff3a4a', 18 * on, 40);   // the jumbotron's red rim spill
  } else if (set === 'corr') {
    const fz = focus.z - CO.z;
    W.panels.forEach((p) => { const on = !p.dead || (Math.sin(t * 37 + p.z) > 0.6); p.f.level?.(on ? 1 : 0.05); });
    let i = 0; for (const p of W.panels) { if (Math.abs(p.z - fz) < 30 && i < 5 && !p.dead) { setL(i, C(0, 14.4, p.z), '#eef4ff', 34, 24); i++; } }
    setL(6, C(-14, 5, fz + 4), '#ffe6c0', 18, 18); setL(7, C(14, 5, fz - 4), '#ffe6c0', 18, 18);
    if (fz > 130) setL(8, C(0, 5, 149), '#ffffff', 60, 26);
    key(C(-4, 15, fz - 9), v3(focus.x, 3, focus.z), '#f2f6ff', 260, 0.55, 50);
  } else if (set === 'studio') {
    key(Hs(6, 14, 14), Hs(0, 4, 0), '#fff2e0', 520, 0.45, 60); setL(0, Hs(-8, 9, 8), '#ffd6f0', 60, 30); setL(1, Hs(0, 8, -6), '#b48aff', 40, 26); setL(2, Hs(0, 9, 18), '#ffe8c8', 70, 30);
  } else if (set === 'street') {
    W.lamps.forEach((p, i) => setL(i, p, '#ffcf8a', 60, 30));
    setL(5, v3(6.5, 6, 0), '#9ec4ff', 6 * (o.tv ?? 0), 14);
    key(v3(70, 20, -30), v3(focus.x, focus.y, focus.z), '#a8bcdc', 60, 0.5, 120);
  }
}

// ---------------- shots ----------------
function shots() {
  const s = (i) => L(i).start, e = T, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  const gh = () => W.gHead || v3(-4.2, 5, -1.4);
  // the bedroom
  add('open', 0, (u) => ({ pos: lp3(v3(-1.5, 6.8, 5.5), v3(-1.6, 6.7, 5.0), u), look: v3(-3.2, 4.0, -4.0), fov: 68 }));
  add('tvon', s(1) - 0.05, (u) => ({ pos: lp3(v3(-8.0, 7.4, 1.2), v3(-7.7, 7.2, 0.6), u), look: v3(-0.3, 5.0, -6.2), fov: 46 }));
  add('host', s(2) - 0.05, (u) => ({ pos: lp3(v3(0, 5.2, -1.2), v3(0, 5.2, -2.0), u), look: TVP.clone(), fov: 52 }));
  add('survive', s(3) - 0.05, (u) => ({ pos: lp3(v3(-1.6, 5.7, -5.6), v3(-2.2, 5.5, -4.7), easeInOut(u)), look: v3(-4.2, 4.3, -1.6), fov: 56 }));
  add('collapse', e.wall - 0.02, (u, t) => { const k = easeInOut(smooth(e.wall + 0.15, e.wall + 1.9, t)); return { pos: lp3(v3(6.0, 6.2, -1.2), v3(15, 23, -17), k), look: lp3(v3(-3.5, 4.0, -1.5), v3(-2.0, 2.5, 0.5), k), fov: 62 }; });
  add('mall', s(5) - 0.05, (u) => { const k = easeInOut(u); return { pos: lp3(v3(-2, 8, 19), v3(-6, 30, 46), k), look: lp3(v3(-2.5, 4, -1), v3(0, 10, -10), k), fov: 64 }; });
  add('seats', s(6) - 0.05, (u) => { const a = lerp(0.35, 1.35, easeInOut(u)); return { pos: v3(0, 8, -10), look: v3(Math.sin(a) * 40, 14 + 4 * u, -10 - Math.cos(a) * 40), fov: 66 }; });
  add('cdUp', s(7) - 0.05, (u) => { const k = easeInOut(u); return { pos: v3(1.4, 2.6, 26), look: lp3(v3(-1.6, 4.6, -3), v3(0, 33, 8.5), k), fov: 62 }; });
  add('five', s(8) - 0.04, (u) => ({ pos: lp3(v3(0, 31, 26), v3(0, 32, 22), easeOut(u)), look: v3(0, 34, 8.5), fov: 42 }));
  add('release', s(9) - 0.05, (u) => ({ pos: lp3(v3(2, 6, 40), v3(1.6, 7, 36), u), look: v3(0, 30, 8.5), fov: 42 }));
  add('emerge', s(10) - 0.05, (u) => ({ pos: lp3(v3(2.2, 4.6, -10.5), v3(1.8, 4.3, -11.6), u), look: v3(-0.5, 4.2, -26), fov: 58 }));
  add('ran', s(11) - 0.05, (u, t) => { const gz = W.gArena ? W.gArena.z : 0; return { pos: v3(16, 4.8, gz + 2), look: v3(0, 3.6, gz - 1.5), fov: 62 }; });
  // the corridor
  add('corr1', s(12) - 0.02, (u, t) => { const z = zG(t); return { pos: C(2.6, 4.6, z + 17), look: C(0, 3.8, z - 3), fov: 60 }; });
  add('corr2', s(12) + 1.15, (u, t) => { const z = zG(t); return { pos: C(-7.2, 4.0, z + 2.5), look: C(3, 4.0, z - 4.5), fov: 62 }; });
  add('slide', s(13) - 0.04, (u, t) => ({ pos: lp3(C(-2.6, 1.3, 107), C(-2.9, 1.5, 108), u), look: C(0, 1.6, 99), fov: 64 }));
  add('grab', s(14) - 0.02, (u) => ({ pos: lp3(C(-3.4, 4.6, 117), C(-3.0, 4.4, 116), u), look: C(3.4, 3.0, 108.5), fov: 62 }));
  add('strike', s(15) - 0.02, (u, t) => { const a = lerp(-1.32, -1.62, easeInOut(u)), m = C(3.9, 0, 108.4); return { pos: m.clone().add(v3(Math.cos(a) * -12.8, 4.2, Math.sin(a) * -12.8)), look: m.clone().add(v3(0, 3.3, 0)), fov: 56 }; });
  add('crack', s(16) - 0.06, (u, t) => { const hp = W.h1Head || C(3.75, 5.2, 106.7), f = W.h1Fwd || v3(0, 0, 1), r = v3(-f.z, 0, f.x); return { pos: hp.clone().addScaledVector(f, lerp(3.6, 3.0, u)).addScaledVector(r, 0.9).add(v3(0, 0.2, 0)), look: hp.clone(), fov: 42 }; });
  add('screen', s(17) - 0.05, (u, t) => { const hp = W.h1Head || C(3.75, 5.2, 106.7), gp = W.gHead || C(4, 5, 111.5); const back = gp.clone().add(v3(-1.4, 0.6, 2.2)); return { pos: lp3(back, back.clone().lerp(hp, 0.25), easeInOut(u)), look: hp.clone(), fov: 46 }; });
  add('face', e.faceOn, (u, t) => { const hp = W.h1Head || C(3.75, 5.2, 106.7), k = easeOut(clamp((t - e.faceOn) / 0.22)); const dir = W.h1Fwd || v3(0, 0, 1); return { pos: hp.clone().addScaledVector(dir, lerp(4.6, 3.3, k)).add(v3(0, 0.1, 0)), look: hp.clone(), fov: 44 }; });
  add('tackle', s(19) - 0.42, (u, t) => ({ pos: lp3(C(-9.6, 5.6, 117.5), C(-9.0, 5.0, 116.0), u), look: C(3.0, 1.8, 110.0), fov: 62 }));
  add('kick', s(20) - 0.05, (u, t) => { const lay = C(4.0, 0, 111.6).addScaledVector(W.d2, 2.8), pp = v3(-W.d2.z, 0, W.d2.x); return { pos: lay.clone().addScaledVector(W.d2, lerp(7.4, 7.0, u)).addScaledVector(pp, -2.4).add(v3(0, lerp(6.8, 6.4, u), 0)), look: lay.clone().addScaledVector(W.d2, 1.4).add(v3(0, 1.0, 0)), fov: 68 }; });
  add('escape', e.spr - 0.08, (u, t) => { const gp = W.gCorr || C(2, 0, 112); return { pos: v3(gp.x * 0.5 + CO.x * 0.5 - 1.5, 4.0, gp.z + 13), look: gp.clone().add(v3(0, 3.2, 0)), fov: 60 }; });
  add('ten', s(21) - 0.05, (u, t) => { const gp = W.gCorr || C(0, 0, 125); return { pos: C(2.6, 3.6, 146.5), look: lp3(gp.clone().add(v3(0, 6.0, 0)), C(0, 8, 134), 0.35), fov: 58 }; });
  add('nine', s(21) + 1.0, (u, t) => { const gp = W.gCorr || C(0, 0, 135); return { pos: C(-7.0, 4.2, 0).setZ(gp.z + 1.5), look: gp.clone().add(v3(0, 3.6, 1.5)), fov: 60 }; });
  add('door', s(22) - 0.1, (u, t) => ({ pos: C(1.6, 5.0, 137 + 2 * u), look: C(0, 4.4, 150), fov: 56 }));
  // home again
  add('floor', e.bed, (u, t) => ({ pos: lp3(v3(6.0, 7.6, 1.4), v3(3.0, 5.8, -1.2), easeOut(u)), look: v3(-3.2, 0.4, -3.6), fov: 60 }));
  add('applaud', s(24) - 0.05, (u) => ({ pos: lp3(v3(0, 5.2, -1.6), v3(0, 5.2, -2.3), u), look: TVP.clone(), fov: 50 }));
  add('won', s(25) - 0.05, (u) => ({ pos: lp3(v3(-6.8, 3.0, -0.9), v3(-6.5, 3.2, -1.4), u), look: v3(-1.5, 2.4, -6.4), fov: 60 }));
  add('look', s(26) - 0.05, (u) => ({ pos: lp3(v3(-1.5, 6.0, -2.6), v3(-1.0, 6.0, -2.4), u), look: v3(8.6, 5.0, 0.3), fov: 58 }));
  add('outside', s(27) - 0.05, (u) => ({ pos: lp3(v3(4.6, 6.6, -2.2), v3(5.4, 6.4, -1.8), easeInOut(u)), look: v3(46, -4, 3), fov: 52 }));
  add('windows', s(28) - 0.05, (u) => ({ pos: lp3(v3(8.2, 5.6, 0.4), v3(8.6, 5.4, 0.2), u), look: lp3(v3(46, -3.5, -14), v3(46, -3.5, 10), easeInOut(u)), fov: 46 }));
  add('showed', s(29) - 0.05, (u) => { const k = easeInOut(u); return { pos: lp3(v3(41, -6.4, 0.6), v3(43.4, -6.6, 0.4), k), look: v3(46, -6.9, 0.3), fov: 40 }; });
  add('smiled', s(30) - 0.05, (u) => ({ pos: lp3(v3(0, 5.2, -2.0), v3(0, 5.2, -2.8), easeInOut(u)), look: TVP.clone(), fov: 46 }));
  add('hunter', s(31) - 0.05, (u, t) => { const k = easeInOut(clamp((t - s(31)) / 4.2)); return { pos: lp3(v3(1.6, 6.5, -4.6), v3(3.0, 6.2, -3.6), k), look: lp3(v3(8.6, 5.3, 1.0), v3(8.8, 5.3, 0.9), k), fov: lerp(52, 44, k) }; });
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } });
  Sx[Sx.length - 1].t1 = () => ctx.dur + 1;
  return Sx;
}
const SET = {};
for (const n of ['open', 'tvon', 'host', 'survive', 'collapse']) SET[n] = 'room';
for (const n of ['mall', 'seats', 'cdUp', 'five', 'release', 'emerge', 'ran']) SET[n] = 'arena';
for (const n of ['corr1', 'corr2', 'slide', 'grab', 'strike', 'crack', 'screen', 'face', 'tackle', 'kick', 'escape', 'ten', 'nine', 'door']) SET[n] = 'corr';
for (const n of ['floor', 'applaud', 'won', 'look', 'smiled']) SET[n] = 'home';
for (const n of ['outside', 'windows', 'showed', 'hunter']) SET[n] = 'end';

// ---------------- the host's feed (studio render target) ----------------
function renderHost(t, mode) {
  const H = W.host, cam = W.hostCam;
  const sav = { arena: W.arena.visible, corr: W.corr.visible, room: W.room.visible, street: W.street.visible };
  only('studio');
  place(H, Hs(0, 0.95, 0), 0); pose(H, 'idle', t);
  const line = [0, 3, 9, 21, 25, 31].map((i) => L(i)).find((l) => t >= l.start - 0.05 && t < l.end + 0.1);
  const vis = line ? visemeAt(line.text, line.start, line.end, t) : undefined;
  let fx = 'happy';
  if (t < T.tvOn + 2.6) { aimArm(H, 0, Hs(-2.0 - 0.25 * Math.sin(t * 9), 8.2, 1.4), 0.9); }   // a wave
  if (mode === 'won') { aimArm(H, 0, Hs(-2.4, 9.8, 0.6), 1); aimArm(H, 1, Hs(2.4, 9.8, 0.6), 1); }
  if (mode === 'smile') { fx = 'smile'; H.neck.rotation.z = 0.08 * smooth(T.end - 6, T.end - 4, t); }
  face(H, fx, t, 0.4, { viseme: vis, noBlink: mode === 'smile' });
  W.aud.forEach((c, i) => {
    const s = W.studio.seats[i]; const p = Hs(s.x, 0, s.z); sitOn(c, p, Math.PI, s.y + 0.4 + HS.y, t + i);
    const clap = mode === 'clap' || mode === 'won' ? 1 : 0, ph = Math.sin(t * 15 + i * 1.7);
    if (clap) { const ch = c.torso.localToWorld(v3(0, 1.3, 1.4)); aimArm(c, 0, ch.clone().add(v3(0.25 + 0.3 * ph, 0, 0)), 0.9); aimArm(c, 1, ch.clone().add(v3(-0.25 - 0.3 * ph, 0, 0)), 0.9); }
    face(c, clap ? 'happy' : 'neutral', t, i * 0.37);
  });
  W.confetti.update(t, T.won);
  if (mode === 'clap') { cam.position.copy(Hs(0, 6.8, 3.0)); cam.lookAt(Hs(0, 3.4, 17)); cam.fov = 46; }
  else if (mode === 'smile') { cam.position.copy(Hs(0, 6.0, 5.6 - smooth(T.end - 6, T.end, t) * 1.2)); cam.lookAt(Hs(0, 5.95, 0)); cam.fov = 30; }
  else if (mode === 'won') { cam.position.copy(Hs(0, 6.0, 12)); cam.lookAt(Hs(0, 5.6, 0)); cam.fov = 40; }
  else { cam.position.copy(Hs(0.4, 5.9, 9.5)); cam.lookAt(Hs(0.2, 5.3, 0)); cam.fov = 32; }
  cam.aspect = 16 / 9; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  const env = ctx.env; applyEnv(ctx, STUDIO); lightSet('studio', t);
  const sc = ctx.sun.castShadow; ctx.sun.castShadow = false; ctx.scene.updateMatrixWorld(true);
  renderRT(W.hostRT, cam);
  ctx.sun.castShadow = sc; applyEnv(ctx, env);
  H.root.visible = false; W.aud.forEach((c) => { c.root.visible = false; });
  W.arena.visible = sav.arena; W.corr.visible = sav.corr; W.room.visible = sav.room; W.street.visible = sav.street; W.studio.visible = false;
}
// Grayson's own face, live (inside the hunter's mask)
function renderFace(t) {
  const G = W.g, hp = head(G), f = fwd(G.root.rotation.y), cam = W.faceCam;
  cam.position.copy(hp).addScaledVector(f, 3.0).add(v3(0, 0.1, 0)); cam.lookAt(hp.clone().add(v3(0, -0.05, 0))); cam.fov = 40; cam.aspect = 4 / 3; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  const vis = W.h.map((c) => c.root.visible); W.h.forEach((c) => { c.root.visible = false; }); W.pipe.visible && (W.pipe.visible = true);
  const pl = W.pl[9]; pl.position.copy(cam.position); pl.color.set('#dfe8ff'); pl.intensity = 14; pl.distance = 8;
  renderRT(W.faceRT, cam); pl.intensity = 0;
  W.h.forEach((c, i) => { c.root.visible = vis[i]; });
}
// the street's TVs: Grayson at his window, seen from across the street (masked after T.mask)
function renderStreetFeed(t) {
  const cam = W.streetCam; cam.position.set(45.2, -1.6, 4.0); cam.lookAt(8.4, 4.3, 0); cam.fov = 12; cam.aspect = 16 / 9; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  const masked = t >= T.mask, G = W.g, M = W.gm;
  if (masked) { M.root.visible = true; M.reset(); M.root.position.copy(G.root.position); M.root.rotation.copy(G.root.rotation); M.neck.rotation.copy(G.neck.rotation); M.arms[0].quaternion.copy(G.arms[0].quaternion); M.arms[1].quaternion.copy(G.arms[1].quaternion); G.root.visible = false; }
  const gv = W.gr.root.visible; W.gr.root.visible = false;
  renderRT(W.streetRT, cam);
  if (masked) { M.root.visible = false; G.root.visible = true; } W.gr.root.visible = gv;
}

// ---------------- a frame ----------------
function renderAt(v) {
  const vN = ctx.sub && ctx.pro ? v + ctx.pro.shutter * ctx.sub.i / ctx.sub.N : v, hold = held(vN);
  const t = hold ? hold.m.c : remap(v);
  const sh0 = shotAt(W.shots, t), n = sh0.name, set = SET[n], e = T, s = (i) => L(i).start;
  hideAll();
  let pal = BEDN, focus = v3(), shake = 0, flash = 0, steady = false, span = 40, shadows = true, lo = {}, fxo = { focus: 0, streak: 0, cx: 0.5, cy: 0.45 };
  const G = W.g;
  W.fog.visible = false; W.gTrail.visible = false;
  // ================= the bedroom (opening) =================
  if (set === 'room') {
    only('room', 'arena'); W.facade.visible = false; W.blinds.visible = true; W.blinds.scale.y = 1;
    const fall = easeIn(smooth(e.wall, e.slam, t)), bounce = t > e.slam ? Math.exp(-(t - e.slam) * 9) * Math.sin((t - e.slam) * 40) * 0.03 : 0;
    W.walls.forEach((w) => { const a = (Math.PI / 2 - 0.004) * fall * w.fall.s - bounce * w.fall.s; w.pv.rotation.set(0, 0, 0); if (w.fall.ax === 'x') w.pv.rotation.x = a; else w.pv.rotation.z = a; });
    W.ceil.position.y = BH + 0.2 + 46 * easeIn(smooth(e.wall, e.wall + 1.6, t));
    W.door.rotation.y = 0; W.doorLight.material.opacity = 0; { const up = fall < 0.2; W.blinds.visible = up; W.glass.visible = up; W.door.visible = up; }
    const lit = smooth(e.wall + 0.05, e.wall + 0.35, t);
    pal = lit > 0 ? ARENA : BEDN;
    // Grayson on the end of his bed, the TV in front of him; at the collapse he jumps up and spins round
    if (t < e.wall + 0.1) { sitOn(G, GSEAT, Math.PI, 2.45, t); G.torso.rotation.x = 0.12; G.neck.rotation.x = -0.05; face(G, t < 1.0 ? 'surprised' : t < s(3) ? 'nervous' : 'scared', t, 0.3); }
    else { const k = easeInOut(smooth(e.wall + 0.1, e.wall + 1.2, t)), p = v3(-1.6, 0, -3.0); place(G, lp3(GSEAT, p, k), Math.PI + 0.9 * smooth(e.wall + 0.6, e.wall + 1.3, t) - 1.5 * smooth(e.wall + 1.3, e.wall + 2.0, t)); pose(G, 'scared', t); face(G, 'terrified', t); }
    focus = G.root.position.clone();
    const tvOn = smooth(e.tvOn, e.tvOn + 0.12, t);
    W.tvM.uniforms.rtK.value = tvOn; W.tvM.uniforms.uiK.value = 0; W.tvM.uniforms.noise.value = t < e.tvOn + 0.35 ? 0.85 * (1 - smooth(e.tvOn + 0.1, e.tvOn + 0.35, t)) * tvOn : 0.03; W.tvM.uniforms.k.value = 1.3 * tvOn; W.tvM.uniforms.t.value = t;
    if (tvOn > 0) renderHost(t, 'talk');
    lo = { tv: tvOn * (1 - lit), moon: 70 * (1 - lit) };
    if (lit > 0) { lightSet('arena', t, focus, { on: lit }); W.pl[0].intensity += 10 * tvOn; } else lightSet('room', t, focus, lo);
    steady = t < e.wall; span = 40;
    shake = t > e.slam - 0.05 ? 1.2 * Math.exp(-(t - e.slam) * 5) : 0;
    W.dustK = t > e.slam ? Math.exp(-(t - e.slam) * 1.2) : 0;
    W.jumboM.uniforms.rtK.value = 0; drawCD(t);
  }
  // ================= the arena =================
  if (set === 'arena') {
    only('room', 'arena'); W.facade.visible = false; pal = ARENA; W.blinds.visible = W.glass.visible = W.door.visible = false;
    W.walls.forEach((w) => { w.pv.rotation.set(0, 0, 0); if (w.fall.ax === 'x') w.pv.rotation.x = (Math.PI / 2 - 0.004) * w.fall.s; else w.pv.rotation.z = (Math.PI / 2 - 0.004) * w.fall.s; });
    W.ceil.position.y = 80; W.tvM.uniforms.k.value = 0.9; W.tvM.uniforms.rtK.value = 0; W.tvM.uniforms.noise.value = 0.6; W.tvM.uniforms.t.value = t;
    // Grayson stands in the ruins of his room, looks round, up at the board, then runs for the far tunnel
    let gp = v3(-1.6, 0, -3.0), gyaw = Math.PI;
    if (t < e.run) {
      const look = n === 'seats' ? -0.6 + 1.2 * smooth(s(6), s(6) + 2.2, t) : 0;
      place(G, gp, Math.PI - 0.6 + 0.3 * Math.sin(t * 0.7)); pose(G, n === 'cdUp' || n === 'five' || n === 'release' ? 'lookUp' : 'scared', t, { amt: 0.75 }); G.neck.rotation.y += look;
      if (t > e.gate) { G.root.rotation.y = Math.PI; pose(G, 'scared', t); G.root.position.z = gp.z + 1.2 * smooth(e.out, e.hstop, t); }
      face(G, n === 'mall' || n === 'seats' ? 'shocked' : t > e.out ? 'terrified' : 'scared', t, 0.3);
    } else {
      const k = t - e.run, z = -0.8 + (k < 0.3 ? 0 : (k - 0.3) * 13), turn = smooth(e.run, e.run + 0.3, t);
      gp = v3(lerp(-1.6, -1.2, smooth(e.run, e.run + 0.8, t)), Math.abs(z) > 7.6 && Math.abs(z) < 17.4 ? 0.42 : 0, z); gyaw = lerp(Math.PI, 0, easeInOut(turn));
      place(G, gp, gyaw); pose(G, k < 0.3 ? 'scared' : 'run', t); face(G, 'terrified', t);
    }
    W.gArena = G.root.position.clone();
    // the hunters' gate opens; three masked figures walk out in step, rifles low; at the run they break into a run
    W.hgate.set(lerp(0, 12.6, easeInOut(smooth(e.gate, e.gate + 1.3, t))));
    const red = smooth(e.gate, e.gate + 0.5, t); W.fog.visible = red > 0; W.fog.update(t, red);
    if (t > e.gate) W.h.forEach((c, i) => {
      const x = (i - 1) * 4, z0 = -36, z1 = -19, k = smooth(e.out + i * 0.0, e.hstop, t); let p = v3(x, 0, lerp(z0, z1, k)), mode = k < 1 ? 'walk' : 'still';
      if (t > e.run + 0.2 && i !== 1) { p = v3(i === 0 ? -5 : 5.5, 0, z1 + (t - e.run - 0.2) * 14); if (Math.abs(p.z) > 7.6 && Math.abs(p.z) < 17.4) p.y = 0.42; p.x = lerp(x, p.x, smooth(e.run + 0.2, e.run + 0.8, t)); mode = 'run'; }
      place(c, p, 0); pose(c, mode, t * (mode === 'walk' ? 0.8 : 1));   // in perfect step: one clock for all three
      if (i !== 1) { const r = W.rifles[i === 0 ? 0 : 1]; r.visible = true; c.root.updateMatrixWorld(true); holdRifle(c, r, p.clone().add(v3(0, 1.5, 8)), { down: 0.85, blade: 0.35 }); }
      else { aimArm(c, 0, p.clone().add(v3(-0.9, 1.4, 0.4)), 0.4); }
    });
    W.jumboM.uniforms.rtK.value = n === 'release' || (t >= s(9) - 0.1 && t < s(10)) ? 1 : 0; W.jumboM.uniforms.uiK.value = 1 - W.jumboM.uniforms.rtK.value;
    if (W.jumboM.uniforms.rtK.value > 0) renderHost(t, 'talk');
    drawCD(t);
    focus = n === 'emerge' ? v3(0, 0, -16) : G.root.position.clone();
    lightSet('arena', t, focus, { red: 160 * red });
    span = n === 'mall' ? 90 : n === 'emerge' ? 50 : 40;
    steady = ['mall', 'five'].includes(n);
  }
  // ================= the corridor =================
  if (set === 'corr') {
    only('corr'); pal = CORR;
    W.gate.set(gateY(t));
    const gs = gCorr(t); place(G, gs.p, gs.yaw, gs.rx || 0); W.gCorr = gs.p.clone();
    let gfx = 'terrified';
    if (gs.mode === 'run') pose(G, 'run', t * 1.05);
    else if (gs.mode === 'slide') { G.reset(); G.torso.rotation.x = 0.35; G.neck.rotation.x = 0.5; G.legs[0].rotation.x = -0.12; G.legs[1].rotation.x = 0.1; G.root.updateMatrixWorld(true); aimArm(G, 0, gs.p.clone().add(v3(-1.2, 0, -2.2)), 0.9); aimArm(G, 1, gs.p.clone().add(v3(1.5, 3, 1.5)), 0.7); }
    else if (gs.mode === 'grab') { pose(G, 'idle', t); const k = smooth(e.grab, e.grab + 0.18, t) * (1 - smooth(e.turn - 0.1, e.turn + 0.1, t)); G.torso.rotation.x = 0.55 * k; G.hips.position.y -= 0.7 * k; aimArm(G, 0, C(6.0, 1.0, 111.2), k); aimArm(G, 1, C(6.4, 1.0, 112.4), k); gfx = 'angry'; }
    else if (gs.mode === 'strike' || gs.mode === 'turn') { pose(G, 'idle', t); gfx = t < e.c1 + 0.4 ? 'angry' : t < e.faceOn ? 'scared' : 'terrified'; }
    else if (gs.mode === 'down') { G.reset(); G.torso.rotation.x = -0.2; G.neck.rotation.x = 0.35; G.root.updateMatrixWorld(true); aimArm(G, 0, gs.p.clone().addScaledVector(W.d2, 2.4).add(v3(0.9, 0, 0)), 0.8); aimArm(G, 1, gs.p.clone().addScaledVector(W.d2, 2.4).add(v3(-1.1, 0, 0)), 0.8);
      const ch = smooth(e.rise2 - 0.05, e.c3 - 0.12, t) * (1 - smooth(e.c3 + 0.15, e.up, t)), kk = smooth(e.c3 - 0.12, e.c3, t) * (1 - smooth(e.c3 + 0.15, e.up, t));
      G.legs[0].rotation.x = -1.7 * ch + 0.9 * kk; G.legs[1].rotation.x = -0.15; gfx = t < e.c3 ? 'scared' : 'angry'; }
    else if (gs.mode === 'rise') { pose(G, 'scared', t); gfx = 'terrified'; }
    face(G, gfx, t, 0.3);
    G.root.updateMatrixWorld(true);
    // the pipe in both hands (picked up off the pallet; dropped at the tackle)
    W.pipe.visible = t >= e.grab + 0.12 && t < e.c2 + 1.5;
    if (W.pipe.visible) {
      if (t < e.c2) {
        if (t < e.turn) { const hp = G.arms[0].localToWorld(v3(0, -G.tall * 0.3, 0.1)); W.pipe.position.copy(hp); W.pipe.up.set(0, 1, 0); W.pipe.lookAt(hp.clone().add(v3(0.1, -0.2, 1))); }
        else { const pa = pipeAt(t, gs.p, gs.yaw); aimArm(G, 0, pa.hand, 1); aimArm(G, 1, pa.hand.clone().addScaledVector(pa.dir, 0.55), 1); G.torso.rotation.y = 0.3 * clamp(pa.s.phi, -1.5, 1.5); G.root.updateMatrixWorld(true);
          aimArm(G, 0, pa.hand, 1); aimArm(G, 1, pa.hand.clone().addScaledVector(pa.dir, 0.55), 1);
          W.pipe.position.copy(pa.hand).addScaledVector(pa.dir, -0.25); W.pipe.up.set(0, 1, 0); W.pipe.lookAt(pa.hand.clone().addScaledVector(pa.dir, 3)); }
      } else { const k = smooth(e.c2, e.c2 + 0.6, t), p0 = C(4.0, 3.6, 110.2), p1 = C(5.6, 0.15, 113.0); W.pipe.position.copy(lp3(p0, p1, easeIn(k))); W.pipe.position.y = lerp(3.6, 0.15, easeIn(k)) + Math.max(0, Math.sin((t - e.c2 - 0.6) * 18) * 0.4 * Math.exp(-(t - e.c2 - 0.6) * 6)) * (t > e.c2 + 0.6 ? 1 : 0); W.pipe.rotation.set(0, 0.5 + 3 * k, Math.PI / 2 * k); }
    }
    // the hunters
    W.h.forEach((c, i) => {
      const hs = hCorr(i, t); if (i === 1 && t < e.lunge - 1.6) { c.root.visible = false; return; }
      place(c, hs.p, hs.yaw, hs.rx || 0);
      if (hs.mode === 'run' || hs.mode === 'walk') pose(c, hs.mode, t * (hs.mode === 'walk' ? 0.9 : 1.05));
      else if (hs.mode === 'slide') { c.reset(); c.torso.rotation.x = 0.25; c.neck.rotation.x = 0.4; c.root.updateMatrixWorld(true); }
      else if (hs.mode === 'lunge') { pose(c, 'run', t * 1.2); c.torso.rotation.x = 0.4; c.root.updateMatrixWorld(true); aimArm(c, 0, hs.p.clone().addScaledVector(W.d2, 3).add(v3(0, 3.2, 0)), 0.9); aimArm(c, 1, hs.p.clone().addScaledVector(W.d2, 3).add(v3(0, 3.6, 0)), 0.9); }
      else if (hs.mode === 'kneel') { applyPose(c, sample('kneel', t), { travel: 0 }); c.torso.rotation.x += 0.35 * (hs.rise || 0); c.root.updateMatrixWorld(true); const g2 = head(G); aimArm(c, 0, g2.clone().add(v3(0.4, -0.6, 0)), 0.85); aimArm(c, 1, g2.clone().add(v3(-0.4, -0.6, 0)), 0.85); }
      else if (hs.mode === 'flung') { c.reset(); c.torso.rotation.x = -0.3; c.neck.rotation.x = -0.5; c.arms[0].rotation.x = -2.2; c.arms[1].rotation.x = -2.0; c.legs[0].rotation.x = -0.6; }
      else if (hs.mode === 'down') { c.reset(); c.arms[0].rotation.z = 0.8; c.arms[1].rotation.z = -0.8; }
      else { pose(c, 'still', t); if (i === 0 && t >= e.c1) { const k = smooth(e.c1, e.c1 + 0.18, t) * (1 - smooth(e.c1 + 0.9, e.crack + 0.4, t)); c.neck.rotation.y = -0.95 * k; c.neck.rotation.z = 0.3 * k; c.torso.rotation.z = 0.15 * k; c.neck.rotation.z += t > e.open ? 0.22 * smooth(e.open, e.faceOn, t) : 0; } }
      if (i !== 1) { const r = W.rifles[i === 0 ? 0 : 1]; const firing = t < e.sS + 0.7; if ((i === 0 && t < e.h1S) || i === 2) { r.visible = true; c.root.updateMatrixWorld(true); const sht = W.shotAim(i, t); const res = holdRifle(c, r, sht ? sht.aim : hs.p.clone().add(v3(0, 4, 20)), { down: firing ? 0 : 0.85, recoil: sht ? sht.rec : 0, blade: 0.5 }); c._mz = res; } else if (i === 0) { r.visible = t < e.h1S + 0.4; if (r.visible) { r.position.copy(hs.p).add(v3(-1.2, 0.2, 1.6)); r.rotation.set(0, 0.3, Math.PI / 2); } } }
    });
    // the hunter's mask: cracked at the strike, cracks spread on "It cracked", the faceplate falls away, then the screen shows Grayson's face
    const H1 = W.h[0], hm = H1.helm; hm.crack(t < e.c1 ? 0 : t < e.crack ? 0.3 : lerp(0.3, 1, smooth(e.crack, e.crack + 0.35, t))); hm.open(t, e.open);
    const scrOn = t >= e.open;
    if (scrOn) { hm.screen.material = W.faceScrM; W.faceScrM.uniforms.t.value = t; W.faceScrM.uniforms.rtK.value = t >= e.faceOn ? 1 : 0; W.faceScrM.uniforms.noise.value = t >= e.faceOn ? (t < e.faceOn + 0.12 ? 0.6 : 0.06) : 0.85; W.faceScrM.uniforms.k.value = 1.35; }
    else hm.screen.material = W.blackM;
    ctx.scene.updateMatrixWorld(true);
    W.h1Head = new THREE.Box3().setFromObject(hm.helmet).getCenter(v3()); W.h1Fwd = v3(0, 0, 1).applyQuaternion(H1.head.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize(); W.gHead = head(G);
    if (scrOn && t >= e.faceOn && ['face', 'screen', 'tackle'].includes(n)) renderFace(t);
    // gunfire, glass, blood
    const fk = []; W.SHOTS.forEach((sh2, j) => { const k = flashK([sh2.t], t); if (k > 0) fk.push([j, k]); });
    W.flash.clear(); fk.forEach(([j, k], q) => { const sh2 = W.SHOTS[j]; W.flash.set(q, sh2.muzzle, sh2.dir, k, 1.0); }); W.flash.end();
    W.trc.update(t); W.spk.update(t); W.shards.update(t); W.blood.update(t);
    W.panes.forEach((p) => { if (p.mesh) p.mesh.visible = t < p.t; });
    // the exit doors burst open
    const dk = easeOut(smooth(e.door - 0.03, e.door + 0.22, t)); W.exitDoors.forEach(({ d, s: sd }) => { d.rotation.y = sd * 1.7 * dk; });
    W.exitLight.visible = true;
    drawTimer(t);
    // speed lines / focus lines (impact sequences handle the two deciding hits)
    const scr = (p) => { const q = p.clone().project(ctx.camera); return [clamp(q.x * 0.5 + 0.5), clamp(0.5 - q.y * 0.5)]; };
    const bump = (c0, a, b) => smooth(c0 - a, c0, t) * (1 - smooth(c0, c0 + b, t));
    if (['corr1', 'corr2', 'escape', 'nine'].includes(n)) fxo.streak = n === 'corr2' || n === 'nine' ? 0.55 : 0.35;
    if (n === 'corr2' || n === 'nine') fxo.angle = 0;
    if (n === 'slide') fxo.streak = 0.45 * bump(e.sS + 0.25, 0.3, 0.4);
    W.lastShotName = n;
    const k2 = bump(e.c2, 0.15, 0.35) * 0.8; if (k2 > 0) { fxo.focus = k2; ctx.camera.updateMatrixWorld(); }
    focus = gs.p.clone();
    if (['crack', 'screen', 'face'].includes(n)) focus = H1.root.position.clone();
    lightSet('corr', t, focus);
    shake = Math.max(Math.exp(-Math.max(0, t - e.c2) * 7) * (t >= e.c2 ? 1.6 : 0), t >= e.faceOn && t < e.faceOn + 0.5 ? 1.4 * (1 - (t - e.faceOn) / 0.5) : 0, t >= e.crash && t < e.crash + 0.4 ? 0.8 : 0, t > e.door - 0.05 && t < e.door + 0.3 ? 1.0 : 0);
    const fl = fk.reduce((a, [, k]) => Math.max(a, k), 0); if (fl > 0) { W.pl[9].position.copy(W.SHOTS[fk[0][0]].muzzle); W.pl[9].color.set('#ffc070'); W.pl[9].intensity = 40 * fl; W.pl[9].distance = 18; }
    flash = t > e.door + 0.05 ? 0.7 * smooth(e.door + 0.05, e.door + 0.22, t) : 0;
    span = 36;
    // the pipe's trail
    if (t > e.c1 - 0.25 && t < e.c1 + 0.3) { const smp = []; for (let i = 0; i <= 10; i++) { const tt = t - i / 60, pa = pipeAt(tt, gCorr(tt).p, gCorr(tt).yaw); if (pa) smp.push({ base: pa.hand.clone().addScaledVector(pa.dir, 1.2), tip: pa.tip, root: gCorr(tt).p }); } if (smp.length) { W.gTrail.set(smp); } }
    W.scrFn = scr;
  }
  // ================= home again (the bedroom, intact; the street outside) =================
  if (set === 'home' || set === 'end') {
    only('room', 'street'); W.facade.visible = true; W.blinds.visible = W.glass.visible = W.door.visible = true; pal = set === 'end' ? STREETN : BEDN;
    W.walls.forEach((w) => { w.pv.rotation.set(0, 0, 0); }); W.ceil.position.y = BH + 0.2;
    const bl = smooth(e.blinds, e.blinds + 0.7, t); W.blinds.scale.y = lerp(1, 0.12, easeInOut(bl)); W.blinds.position.y = 7.25;
    const dop = easeOut(smooth(e.bed, e.bed + 0.25, t)); W.door.rotation.y = -1.75 * dop * (1 - 0.35 * smooth(e.bed + 1.5, e.bed + 2.5, t));
    const dl = (1 - smooth(e.bed + 0.1, e.bed + 1.0, t)) * dop; W.doorLight.material.opacity = dl;
    // Grayson stumbles in, collapses, lies panting; gets up; goes to the window
    const din = v3(-7.4, 0, (DOORZ0 + DOORZ1) / 2), fl1 = v3(-0.4, 0, -3.6);
    const Y0 = Math.PI / 2 - 0.1;
    if (t < e.fall) { const k = smooth(e.bed, e.fall, t); place(G, lp3(din, fl1, easeOut(k)), Y0); pose(G, 'run', t * 0.7); G.torso.rotation.x = 0.4 + 0.3 * k; face(G, 'terrified', t); }
    else if (t < e.look) { const k = easeIn(smooth(e.fall, e.fall + 0.5, t)), r2 = smooth(e.clap + 0.3, e.won + 0.4, t); place(G, fl1, Y0, -lerp(0, Math.PI / 2 - 0.08, k) * (1 - r2)); G.root.position.y = 0.55 * k * (1 - r2); G.reset(); G.arms[0].rotation.z = 1.1 * k * (1 - r2); G.arms[1].rotation.z = -1.0 * k * (1 - r2); G.neck.rotation.x = -0.2 * k; G.torso.rotation.x = 0.05 * Math.sin(t * 6) * k;
      if (r2 > 0.5) { G.root.rotation.x = 0; sitOn(G, fl1.clone().add(v3(-2.4, 0, 0)), Y0, 0.05, t); G.neck.rotation.y = 0.85 * smooth(e.clap + 0.6, e.won, t); }
      face(G, t < e.clap ? 'terrified' : t < e.won ? 'surprised' : 'shocked', t, 0.3); }
    else { const k = smooth(e.look, e.blinds, t); const a = v3(-3.0, 0, 2.6); place(G, lp3(a, GWIN, easeInOut(k)), k < 0.95 ? yawTo(a, GWIN) : Math.PI / 2); pose(G, k < 0.95 ? 'walk' : 'idle', t);
      if (t > e.blinds - 0.35 && t < e.blinds + 0.8) aimArm(G, 1, v3(8.4, lerp(6.6, 7.3, bl), 1.0), smooth(e.blinds - 0.35, e.blinds - 0.1, t) * (1 - smooth(e.blinds + 0.6, e.blinds + 0.8, t)));
      const fxx = t < s(28) ? 'nervous' : t < s(30) ? 'scared' : t < e.mask ? 'terrified' : 'terrified'; face(G, fxx, t, 0.3);
      if (t > e.mask - 0.6) { const k2 = smooth(e.mask - 0.6, e.mask, t); G.neck.rotation.x = 0.06 * k2; }
    }
    // the reflection: in the window glass, the masked Grayson looks back (from the host's last line)
    const rk = smooth(e.mask - 0.3, e.mask + 0.4, t);
    if (rk > 0 && set === 'end') { const R = W.gr; R.root.visible = true; R.reset(); R.root.position.set(2 * (BX - 0.3) - G.root.position.x, 0, G.root.position.z); R.root.rotation.set(0, -G.root.rotation.y, 0); R.neck.rotation.y = -G.neck.rotation.y; R.root.traverse((m) => { if (m.isMesh && m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((mm) => { mm.opacity = 0.42 * rk; }); }); }
    // the TV: static applause, the host's win, the smile
    const mode = t < e.clap ? 'talk' : t < e.won ? 'clap' : t < s(30) ? 'won' : 'smile';
    W.tvM.uniforms.rtK.value = 1; W.tvM.uniforms.noise.value = 0.03; W.tvM.uniforms.k.value = 1.3; W.tvM.uniforms.t.value = t;
    if (set === 'home' || n === 'hunter') renderHost(t, mode);
    // the street's TVs light window by window, then all show him; masked from the host's last line
    W.tvMats.forEach((m, i) => { m.uniforms.k.value = 1.25 * smooth(e.tvWave + i * 0.18, e.tvWave + i * 0.18 + 0.12, t); m.uniforms.t.value = t + i; m.uniforms.noise.value = t > e.mask - 0.1 && t < e.mask + 0.25 ? 0.7 : 0.04; });
    if (t > e.tvWave - 0.2 && set === 'end') { lightSet('street', t, v3(40, -6, 0), { tv: 1 }); renderStreetFeed(t); }
    focus = G.root.position.clone();
    if (set === 'end') lightSet('street', t, n === 'showed' ? v3(46, -6, 0) : v3(20, -2, 0), { tv: 1 });
    else { lightSet('room', t, focus, { tv: 1, door: dl }); setL(4, v3(-2.0, 4.5, -1.8), '#ffd8b0', 16, 11); }
    if (set === 'end') { W.pl[6].position.copy(TVP).add(v3(0, 0, 2)); W.pl[6].color.set('#9ec4ff'); W.pl[6].intensity = 16; W.pl[6].distance = 22; W.pl[7].position.set(6.4, 9, -3); W.pl[7].color.set('#6a7ab0'); W.pl[7].intensity = 9; W.pl[7].distance = 18; }
    steady = !['floor'].includes(n); span = set === 'end' ? 70 : 30;
    shake = n === 'floor' ? 0.6 * Math.exp(-Math.max(0, t - e.bed) * 3) + (t > e.fall && t < e.fall + 0.35 ? 0.6 : 0) : 0;
    flash = t < e.bed + 0.25 ? 0.7 * (1 - smooth(e.bed, e.bed + 0.25, t)) : 0;
    if (t > e.mask - 0.1 && t < e.mask + 0.2) shake = Math.max(shake, 0.5);
  }
  applyEnv(ctx, pal);
  W.air.update(t); W.air.list.dust.visible = set === 'room' || set === 'arena'; W.air.list.dust.material && (W.air.list.dust.material.opacity = 1);
  W.blood.mesh.visible = set === 'corr'; W.blood.line.visible = set === 'corr';
  ctx.scene.updateMatrixWorld(true);
  const sh = shotAt(W.shots, t);
  const dc = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgcam');
  const dq = dc ? dc.split(',').map(Number) : null, shx = dq ? { ...sh, pos: v3(dq[0], dq[1], dq[2]), look: v3(dq[3], dq[4], dq[5]), fov: dq[6] || 40 } : sh;
  const near = ['crack', 'face', 'host', 'applaud', 'smiled', 'showed'].includes(n) ? 0.08 : 0.2; if (ctx.camera.near !== near) { ctx.camera.near = near; ctx.camera.updateProjectionMatrix(); }
  // impact frames: silhouettes on the contact
  let sil = null;
  if (hold) {
    flash = 0; sil = IMPSEQ[hold.k];
    const keep = new Set([G.root, ...W.h.map((c) => c.root), W.pipe, W.gTrail]);
    W.hid = ctx.scene.children.filter((o) => o.visible && !keep.has(o) && !o.isLight && !o.isCamera); W.hid.forEach((o) => { o.visible = false; });
    ctx.scene.overrideMaterial = sil === 'w' ? W.silW : W.silB;
    ctx.scene.background?.set?.(sil === 'w' ? '#000000' : '#5d5968'); W.fogSave = [ctx.scene.fog.near, ctx.scene.fog.far]; ctx.scene.fog.near = 1e5; ctx.scene.fog.far = 2e5;
  }
  frame(ctx, t, shx, { capT: v, steady: steady || !!dq, shake: dq ? 0 : shake, shadowSpan: span, shadows, flash, flashColor: '#ffffff' });
  if (sil) {
    W.hid.forEach((o) => { o.visible = true; }); ctx.scene.overrideMaterial = null; ctx.scene.fog.near = W.fogSave[0]; ctx.scene.fog.far = W.fogSave[1];
    const q = hold.m.at().project(ctx.camera);
    W.fx.set(vN, { focus: 1, cx: clamp(q.x * 0.5 + 0.5), cy: clamp(0.5 - q.y * 0.5), color: sil === 'w' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)', inner: 0.4, seed: hold.k * 7 });
  } else {
    if (set === 'corr') { const bump = (c0, a, b) => smooth(c0 - a, c0, t) * (1 - smooth(c0, c0 + b, t)); for (const [c0, p] of [[e.c1, C(3.75, 5.0, 106.7)], [e.c3, W.kickAt], [e.c2, C(4, 4, 111)]]) { const k = bump(c0, 0.12, 0.3) * 0.75; if (k > fxo.focus) { fxo.focus = k; const q = p.clone().project(ctx.camera); fxo.cx = clamp(q.x * 0.5 + 0.5); fxo.cy = clamp(0.5 - q.y * 0.5); } } }
    W.fx.set(v, fxo);
  }
  return n;
}
function drawCD(t) { const sec = Math.round(secAt(t)), key = sec + (t < T.cd ? 'x' : ''); if (W.cdLast === key) return; W.cdLast = key; countdownDraw(W.cdCanvas.getContext('2d'), 1024, 552, t < T.cd ? 0 : sec, { label: t < T.cd ? '' : 'SURVIVE', bar: t < T.cd ? null : sec / 300 }); if (t < T.cd) { const x = W.cdCanvas.getContext('2d'); x.fillStyle = '#07080c'; x.fillRect(0, 0, 1024, 552); } W.cdTex.needsUpdate = true; }
function drawTimer(t) { const sec = Math.round(secAt(t)); if (W.tmLast === sec) return; W.tmLast = sec; countdownDraw(W.tmCanvas.getContext('2d'), 512, 256, sec, {}); W.tmTex.needsUpdate = true; }

// ---------------- gunfire, glass, blood (made once in setup so every worker agrees) ----------------
function gunfire() {
  const shots = [], r = rng(5);
  for (let t = T.cor + 0.12, j = 0; t < T.sS - 0.15; t += 0.155, j++) shots.push({ t: +t.toFixed(4), i: j % 2 ? 2 : 0 });
  // aims: just behind Grayson, into the shop glass on alternating sides, at chest to head height
  W.shotAim = (i, t) => { const sh = shots.filter((s) => s.i === i && t >= s.t - 0.25 && t < s.t + 0.12).pop(); if (!sh) return null; return { aim: sh.hit, rec: Math.max(0, 1 - Math.abs(t - sh.t) / 0.08) }; };
  shots.forEach((s, j) => { const side = j % 4 < 2 ? -1 : 1, z = zG(s.t) - 3.5 - r() * 3; s.hit = C(side * 10, 3.5 + r() * 4.5, z); s.side = side; });
  // pose the shooter at each shot to read the muzzle
  for (const s of shots) {
    const c = W.h[s.i], hs = hCorr(s.i, s.t); place(c, hs.p, hs.yaw); pose(c, 'run', s.t * 1.05); c.root.updateMatrixWorld(true);
    const res = holdRifle(c, W.rifles[s.i === 0 ? 0 : 1], s.hit, { down: 0, blade: 0.5 }); s.muzzle = res.muzzle.clone(); s.dir = s.hit.clone().sub(s.muzzle).normalize();
  }
  W.SHOTS = shots;
  // which pane each shot hits: the first hit shatters it
  const shatter = [], sparks = [];
  for (const s of shots) {
    const lz = s.hit.z - CO.z, pane = W.panes.find((p) => p.side === s.side && Math.abs(p.z - lz) < 5);
    const arrive = s.t + s.muzzle.distanceTo(s.hit) / 260;
    if (pane && pane.mesh && pane.t > 1e8) { pane.t = arrive; shatter.push({ t: arrive, c: C(pane.x, 5.4, pane.z), n: v3(-s.side, 0, 0), w: 9.5, h: 9.6, p: s.hit.clone(), push: s.dir.clone().multiplyScalar(3), power: 1 }); }
    else sparks.push({ t: arrive, p: s.hit.clone().add(v3(s.side * 6, 0, 0)), n: v3(-s.side, 0.3, 0) });
  }
  // the kick sends the second hunter through a pane on the right (x +10)
  const kd = v3(0.6, 0, 0.8).normalize(), knee = C(4.0, 0, 111.6).addScaledVector(W.d2, 3.7), far = knee.clone().addScaledVector(kd, 12.5);
  const kpane = W.panes.find((p) => p.side === 1 && Math.abs(p.z - (far.z - CO.z)) < 5);
  if (kpane && kpane.mesh) { kpane.t = T.crash - 0.05; shatter.push({ t: T.crash - 0.05, c: C(kpane.x, 5.4, kpane.z), n: v3(1, 0, 0), w: 9.5, h: 9.6, p: C(10, 2.6, far.z - CO.z), push: kd.clone().multiplyScalar(4), power: 1.3 }); }
  W.shards = glassShatter(ctx.scene, shatter, { per: 60 });
  W.trc = tracers(ctx.scene, shots.map((s) => ({ t: s.t, a: s.muzzle, b: s.hit })), { len: 3.4 });
  W.spk = eventParticles(ctx.scene, sparks, { kind: 'spark', per: 9, seed: 3 });
  W.flash = muzzleFlashes(ctx.scene, 8);
  // toon blood: a flying shard cuts Grayson's arm as the glass beside him bursts; the second hunter's crash through the window
  const cut = shatter.find((x) => x.t > T.cor + 1.0 && x.t < T.sS - 0.4) || shatter[2];
  const gArm = (t) => C(0.6, 4.4, zG(t));
  W.blood = bloodFX(ctx.scene, [{ t: cut ? cut.t + 0.05 : T.cor + 1.4, p: gArm(cut ? cut.t + 0.05 : T.cor + 1.4), dir: v3(0.5, 0.2, -1), n: 16, power: 0.55, end: T.door + 0.4 }], { seed: 21, color: '#a00012', size: 0.6 });
  W.events = { shots: shots.map((s) => s.t), glass: shatter.map((s) => s.t) };
}

export async function setup() {
  ctx = await initStage('ep36', { look: 'pro', avatars: ['farm_grayson', 'farm_ep36_host_c', 'farm_ep36_hunter_a', 'farm_ep36_hunter_b', 'farm_ep36_hunter_c', ...AUD] }); L = ctx.L; T = events();
  buildMap();
  const FX = ['neutral', 'surprised', 'shocked', 'scared', 'terrified', 'nervous', 'happy', 'smile', 'angry', 'focused'];
  await loadAlti([...FX, ...FX.map((x) => 'lash:' + x)]);
  const { scene, camera } = ctx; camera.far = 5000; camera.near = 0.2; camera.updateProjectionMatrix();
  W.hostRT = new THREE.WebGLRenderTarget(960, 540, { type: THREE.HalfFloatType, samples: 4 });
  W.faceRT = new THREE.WebGLRenderTarget(640, 480, { type: THREE.HalfFloatType, samples: 4 });
  W.streetRT = new THREE.WebGLRenderTarget(960, 540, { type: THREE.HalfFloatType, samples: 4 });
  W.hostCam = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 400); W.faceCam = new THREE.PerspectiveCamera(40, 4 / 3, 0.05, 200); W.streetCam = new THREE.PerspectiveCamera(26, 16 / 9, 0.5, 900);
  W.faceScrM = screenMat({ rt: W.faceRT, lines: 0.16 }); W.blackM = new THREE.MeshBasicMaterial({ color: '#050506' });
  rig(); bedroom(); arena(); corridor(); studio(); street(); people();
  W.tvM.uniforms.rt.value = W.hostRT.texture;
  // the tackle line: from the second hunter's doorway to where Grayson stands
  W.d2 = C(4.0, 0, 111.6).sub(C(11.4, 0, 126)).setY(0).normalize();
  W.kickAt = C(4.0, 0, 111.6).addScaledVector(W.d2, 3.7).add(v3(0, 2.2, 0));
  gunfire();
  W.fx = installActionFX(ctx);
  W.gTrail = weaponTrail({ color: '#dfe8ff', gain: 1.1 }); scene.add(W.gTrail);
  W.silW = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, toneMapped: false }); W.silB = new THREE.MeshBasicMaterial({ color: '#000000', fog: false, toneMapped: false });
  const list = { dust: dust(scene, { size: 40, height: 14, centre: v3(0, 6, 0), count: 360, color: '#f2ead8', amount: 0.16, pointSize: 0.34 }) };
  W.air = atmos(...Object.values(list)); W.air.list = list;
  W.shots = shots();
  window.__ep36 = { W, THREE, ctx, T };
  void noise1; void DAY; void surf; void sample;
  const EV = { ...T, end: ctx.dur };
  const EVV = Object.fromEntries(Object.entries(EV).map(([k, x]) => [k, typeof x === 'number' ? +unmap(x).toFixed(4) : x]));
  EVV.shots = W.events.shots.map((x) => +unmap(x).toFixed(4)); EVV.glass = W.events.glass.map((x) => +unmap(x).toFixed(4));
  return expose(ctx, renderAt, unmap(T.faceOn + 0.45), EVV);
}
