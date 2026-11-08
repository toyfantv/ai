// Episode 35: The Girl Who Never Blinked (Psychological Horror 1/5). Nora keeps seeing a girl with a fixed smile who never blinks: across her
// street, then outside her classroom. The school's security cameras never show the girl: every recording shows Nora herself standing where the
// girl stood, smiling at herself. At 3 AM her phone rings (MOM) while her mother sleeps beside her; a whisper; a knock on her third-floor window;
// the curtain, nothing; her phone camera opens by itself and shows the girl right behind her. The room is empty (her mother too). A photograph
// arrives: two little girls holding hands, Nora and one with no face: "YOU PROMISED WE'D SWITCH BACK."
// Sets share the world: the street at the origin (road along x, Nora's apartment block on +z, houses across on -z), the school at SC (classroom
// x -15..15, z -13..13; the hallway x 15..29), the security office at SO, the apartment entry at AE, Nora's bedroom at AB, the photo yard at PH.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, NIGHT, DAY } from '../engine/stage.js';
import { Batch, surf, paint, lamp } from '../engine/kit.js';
import { dust, atmos } from '../engine/atmos.js';
import { canvasTex } from '../engine/props.js';
import { aimArm as aimArm0 } from '../engine/anims.js';
const aimArm = (c, side, p, k = 1) => { c.root.updateMatrixWorld(true); aimArm0(c, side, p, k); };   // the body may have moved this frame
import { cottage, picket, mailbox, wallpaper } from '../engine/pastel.js';
import { building } from '../engine/kit.js';
import { model } from '../engine/library.js';
import { fluorPanel, vinyl, ceilingTile, wallPaint } from '../engine/hospital.js';
import { bed as homeBed, plant } from '../engine/home.js';
import { panelDoor } from '../engine/mansion.js';

let ctx, L, EV;
const W = {};
const SC = v3(1000, 0, 0), SO = v3(2000, 0, 0), AE = v3(3000, 0, 0), AB = v3(3000, 0, 100), PH = v3(4000, 0, 0);
const at = (o) => (x, y, z) => o.clone().add(v3(x, y, z));
const S = at(SC), O = at(SO), E = at(AE), B = at(AB), Y = at(PH);
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const GS = v3(3.5, 0.25, -11.0);              // where the girl stands across the street (on the south sidewalk, under the lamp)
const NW = v3(-5.6, 18.84, 17.0);             // Nora's third-floor window on the block's front face (z 17)
const GH = S(19.4, 0, 8.3);                   // the girl in the school hallway, facing the classroom door's window
const DOORZ = 6.4, DOORW = 4.4;               // the classroom door: hinge at z 6.4, leaf to z 10.8, in the wall x 15
const ND = S(6, 0, 1.5);                      // Nora's desk seat (she faces -z, the board)
const BEDTOP = 2.45, BX = 0, BZ = -3.0;       // the bed in Nora's room (head at -z), its mattress top
const WIN_X = 11.6;                           // the bedroom window wall (x)
const NWIN = B(8.0, 0, -1.4);                 // Nora a step back from the bedroom window, facing +x (phone held up)
const NCUR = B(9.4, 0, -1.4);                 // Nora at the curtain
const GBEHIND = B(5.3, 0, -0.65);
const NH = B(2.6, 5.4, -5.3);                 // Nora's head, sitting up in bed             // where the girl stands behind her (only on the phone's screen)

// ---- palettes ----
const STREET = { ...DAY, ...P({ top: '#5f97d6', horizon: '#f2cfa4', haze: '#e9c9a2', sunColor: '#ffd9a8', hemiSky: '#bcd6f2', hemiGround: '#8a7a5a' }),
  sunI: 1.9, sunDir: v3(-0.62, 0.42, 0.5), sunDisc: 0.4, stars: 0, moon: 0, hemiI: 0.95, amb: 0.2, envI: 0.75, exposure: 1.02, bloom: 0.03, fogNear: 160, fogFar: 700, saturation: 1.12, contrast: 1.06, bounce: 0.22, win: 0, lamp: 0 };
const STREETN = { ...NIGHT, ...P({ top: '#04070f', horizon: '#141c30', haze: '#0e1422', sunColor: '#a8bcdc', hemiSky: '#56688a', hemiGround: '#1a1a18' }),
  sunI: 0.5, sunDir: v3(0.4, 0.75, -0.5), sunDisc: 0, stars: 0.7, moon: 1, hemiI: 0.6, amb: 0.1, envI: 0.25, exposure: 1.18, bloom: 0.05, fogNear: 90, fogFar: 520, saturation: 1.0, contrast: 1.08, bounce: 0.06, win: 0, lamp: 0 };
const ROOMD = { ...DAY, ...P({ top: '#cfd8e0', horizon: '#e8e6e0', haze: '#e6e2da', sunColor: '#fff2dc', hemiSky: '#eef2f6', hemiGround: '#b8ab98' }),
  sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 0.95, amb: 0.22, envI: 0.6, exposure: 1.0, bloom: 0.02, fogNear: 200, fogFar: 900, saturation: 1.04, contrast: 1.05, bounce: 0.22, win: 0, lamp: 0 };
const HALLP = { ...ROOMD, ...P({ hemiSky: '#eef6ea', hemiGround: '#a8b0a0', haze: '#e4e8e0' }), hemiI: 0.8, amb: 0.18, exposure: 0.8, saturation: 0.98 };
const OFFICE = { ...NIGHT, ...P({ top: '#10141c', horizon: '#141a24', haze: '#121820', sunColor: '#a8bcdc', hemiSky: '#8a9ab8', hemiGround: '#2a2a30' }),
  sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 0.7, amb: 0.16, envI: 0.35, exposure: 1.08, bloom: 0.04, fogNear: 200, fogFar: 600, saturation: 1.0, contrast: 1.07, bounce: 0.14, win: 0, lamp: 0 };
const APT = { ...OFFICE, ...P({ hemiSky: '#6e7ea6', hemiGround: '#2a2630' }), hemiI: 0.62, amb: 0.13, envI: 0.3, exposure: 1.12 };
const BEDN = { ...OFFICE, ...P({ hemiSky: '#5c6c96', hemiGround: '#24222c' }), hemiI: 0.6, amb: 0.12, envI: 0.28, exposure: 1.14, saturation: 0.96 };
const YARD = { ...DAY, ...P({ top: '#5f9be0', horizon: '#bcd8f0', haze: '#cfe0ee', sunColor: '#fff0d4', hemiSky: '#dbe8f4', hemiGround: '#8a9a5a' }),
  sunI: 2.1, sunDir: v3(0.5, 0.7, 0.6), sunDisc: 0, hemiI: 1.0, amb: 0.22, envI: 0.8, exposure: 1.02, bloom: 0, fogNear: 200, fogFar: 900, win: 0, lamp: 0 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  const k1 = e(15) + 0.48;
  return { stop: 1.75, turn: 1.55, write: s(2), glance: s(2) + 1.75, ofTurn: s(7) + 1.7, bolt: s(10) + 0.25, chain: s(10) + 1.35, look: s(10) + 2.1,
    ring: s(11) + 0.75, sit: s(12) - 0.05, raise: s(14) + 0.05, tap: s(14) + 0.35,
    knock1: k1, knock2: k1 + 0.27, knock3: k1 + 0.54, knock4: s(16) + 1.25, knock5: s(16) + 1.5,
    pull: s(18) + 0.25, pullEnd: e(18) + 0.35, camOn: s(20) + 0.45, girl: s(21) - 0.2, spin: s(22) + 0.05, buzz: s(24) + 0.05, photo: s(25) + 0.2, words: s(29) + 0.35, end: ctx.dur };
}

// ---- the street (Brookhaven-style suburb) ----
function street() {
  const g = new THREE.Group(); ctx.scene.add(g); W.street = g;
  const b = new Batch(), asphalt = new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.82 }), side = surf('concrete', '#c9c4ba'), curb = paint('#d8d4cc', { roughness: 0.8 }), gr = surf('grass', '#6aa04a', { roughness: 0.95 });
  b.box(gr, 900, 0.4, 900, 0, -0.45, 0, { r: 0.02 });
  b.box(asphalt, 400, 0.3, 16, 0, -0.1, 0, { r: 0.02 });
  for (let x = -190; x < 190; x += 10) b.box(paint('#e9d27a', { roughness: 0.6 }), 4.6, 0.04, 0.32, x, 0.06, 0, { r: 0.01 });
  for (const s of [-1, 1]) { b.box(side, 400, 0.5, 6, 0, 0.0, s * 11, { r: 0.04 }); b.box(curb, 400, 0.56, 0.5, 0, 0.02, s * 8.2, { r: 0.08 });
    for (let x = -190; x < 190; x += 6) b.box(paint('#a9a49a'), 0.08, 0.02, 6, x, 0.26, s * 11, { r: 0.0 }); }
  // the apartment block (four floors, warm brick) on +z, its front facing the street; a lit lobby door
  const blk = building({ floors: 4, floorH: 7, w: 28, d: 18, wall: '#b77b5c', trim: '#efe4d2', dark: '#3a3540', lit: 0.0, shutters: null, door: '#3d4a5a' });
  blk.position.set(0, 0, 26); blk.rotation.y = Math.PI; g.add(blk);
  for (const x of [-24, 24]) { const nb = building({ floors: 3, floorH: 7, w: 18, d: 16, wall: x < 0 ? '#9fb3c4' : '#d8c49a', trim: '#f2ece0', lit: 0.0, seed: x < 0 ? 3 : 5 }); nb.position.set(x, 0, 25); nb.rotation.y = Math.PI; g.add(nb); }
  // Nora's window: curtains drawn behind the glass, a faint warm night light at 3 AM
  W.noraWin = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.8), new THREE.MeshBasicMaterial({ map: canvasTex(128, 160, (x, w, h) => { const gr2 = x.createLinearGradient(0, 0, 0, h); gr2.addColorStop(0, '#5a3a3a'); gr2.addColorStop(1, '#8a5a48'); x.fillStyle = gr2; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 9; i++) x.fillRect(i * 14 + 4, 0, 5, h); x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(w / 2 - 2, 0, 4, h); }) }));
  W.noraWin.position.set(NW.x, NW.y, NW.z - 0.35); W.noraWin.rotation.y = Math.PI; W.noraWin.userData.noAO = true; g.add(W.noraWin);
  // across the street: lawns, picket fences, three pastel houses, mailboxes, trees
  picket(b, -60, -8, -15.2, { gap: [-35.5, -32.5] }); picket(b, -2, 60, -15.2, { gap: [28.5, 31.5] });
  b.box(surf('concrete', '#d4cfc4'), 3, 0.3, 16, -34, 0.0, -22, { r: 0.04 }); b.box(surf('concrete', '#d4cfc4'), 3, 0.3, 16, 30, 0.0, -22, { r: 0.04 }); b.box(surf('concrete', '#d4cfc4'), 6, 0.3, 16, -5, 0.0, -22, { r: 0.04 });
  b.done(g);
  W.houses = [];
  for (const [x, wall, roof, seed] of [[-34, '#f4d7df', '#6b4f5a', 3], [-2, '#d6ead9', '#4f5f6b', 7], [32, '#f6e6c4', '#7a5a46', 11]]) {
    const hh = cottage({ seed, wall, roof, w: 24, d: 16, h: 9, porch: true }).g; hh.position.set(x, 0, -38); g.add(hh); W.houses.push(hh); }
  for (const [x, c] of [[-31, '#c0392b'], [1.5, '#4a7fc0'], [26.5, '#2f8a5a']]) { const mb = mailbox({ color: c }); mb.position.set(x, 0.25, -14.0); g.add(mb); }
  for (const [x, z, sd] of [[-48, -24, 2], [20, -25, 5], [46, -26, 8], [-16, -26, 12], [-38, 19, 4], [36, 19, 9]]) { const tr = model('tree', { parent: g, seed: sd }); tr.position.set(x, 0, z); tr.scale.setScalar(1.6); }
  // streetlamps (the girl's lamp at x 6 on the south side)
  W.lamps = [];
  for (const [x, z, ry] of [[6.5, -13.6, Math.PI / 2], [-30, -13.6, Math.PI / 2], [40, -13.6, Math.PI / 2], [-14, 13.6, -Math.PI / 2], [22, 13.6, -Math.PI / 2]]) {
    const lm = lamp({ height: 15 }); lm.position.set(x, 0.25, z); lm.rotation.y = ry; g.add(lm); W.lamps.push({ lm, head: v3(x, 15.0, z + (z < 0 ? 1.55 : -1.55)) }); }
  // parked cars along the kerbs
  for (const [x, z, c, ry] of [[-22, -6.0, '#8fb8d8', 0], [26, 6.0, '#e8e2d6', Math.PI], [-44, 6.0, '#c06a4a', Math.PI]]) { const car = model('car', { parent: g, color: c }); car.scale.setScalar(2.1); car.position.set(x, 0.05, z); car.rotation.y = ry; }
  // hedges and planters along the block
  const hb = new Batch(); for (const x of [-12, -8, 8, 12]) hb.box(paint('#3f6e3a', { roughness: 0.9 }), 3.2, 2.0, 2.4, x, 1.2, 15.6, { r: 0.8 }); hb.done(g);
  // the street's security camera on the block's corner (it sees both sidewalks)
  W.streetCam = model('security_cam', { parent: g }); (W.streetCam.g || W.streetCam).position.set(13.6, 12.2, 16.6); W.streetCam.aim?.(Math.PI + 0.6, -0.35, true);
}

// ---- the school: classroom and hallway ----
function school() {
  const g = new THREE.Group(); g.position.copy(SC); ctx.scene.add(g); W.school = g;
  const b = new Batch(), H = 12, wall = wallPaint('#e9e2cf'), floor = vinyl('#cfc8b6'), ceil = ceilingTile('#eeeeea'), trim = paint('#7d6a55', { roughness: 0.5 }), wood = surf('plank', '#c9a27a', { roughness: 0.5 }), metal = paint('#5c6168', { metalness: 0.6, roughness: 0.4 });
  b.box(floor, 31, 0.4, 27, 0, -0.2, 0, { r: 0.02 }); b.box(ceil, 31, 0.3, 27, 0, H + 0.15, 0, { r: 0.02 });
  b.box(wall, 31, H, 0.4, 0, H / 2, -13.2, { r: 0.01 }); b.box(wall, 31, H, 0.4, 0, H / 2, 13.2, { r: 0.01 });
  // left wall (x -15) with three windows (y 3.6..9.4)
  const lw = (z, y, d, h) => b.box(wall, 0.4, h, d, -15.2, y, z, { r: 0.01 });
  lw(0, 1.8, 26.4, 3.6); lw(0, 10.7, 26.4, 2.6); for (const z of [-13.2 + 0.0, -4.4, 4.4, 13.2]) lw(z, 6.5, 2.6, 5.8);
  // right wall (x 15) with the door hole z 6.4..10.8, height 8.6
  const rw = (z, y, d, h) => b.box(wall, 0.4, h, d, 15.2, y, z, { r: 0.01 });
  rw(-3.4, H / 2, 19.6, H); rw(12.0, H / 2, 2.4, H); rw(8.6, 10.3, 4.4, 3.4);
  b.box(trim, 0.6, 0.6, 5.2, 15.2, 8.9, 8.6, { r: 0.05 }); for (const z of [6.2, 11.0]) b.box(trim, 0.6, 8.6, 0.4, 15.2, 4.3, z, { r: 0.05 });
  // skirting
  for (const [x, z, w, d] of [[0, -12.95, 30, 0.2], [0, 12.95, 30, 0.2], [-14.95, 0, 0.2, 26]]) b.box(trim, w, 0.6, d, x, 0.3, z, { r: 0.04 });
  // windows: frames, sills, blinds half down; daylight beyond
  for (const z of [-8.8, 0, 8.8]) { b.box(paint('#f2efe6'), 0.5, 0.4, 6.4, -14.9, 3.5, z, { r: 0.05 }); b.box(paint('#f2efe6'), 0.5, 0.3, 6.4, -14.9, 9.45, z, { r: 0.05 }); b.box(paint('#f2efe6'), 0.4, 5.8, 0.3, -14.95, 6.5, z, { r: 0.04 });
    for (let k = 0; k < 9; k++) b.box(paint('#ece6d6', { roughness: 0.7 }), 0.06, 0.16, 6.0, -14.7, 9.2 - k * 0.3, z, { r: 0.02, rz: 0.5 }); }
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshBasicMaterial({ map: canvasTex(256, 96, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#a9d2f2'); gr.addColorStop(0.6, '#e6f0f4'); gr.addColorStop(0.62, '#6f9a5a'); gr.addColorStop(1, '#4f7a42'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = '#3f6a3a'; for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(i * 24 + 6, h * 0.6, 12 + (i % 3) * 4, 0, 7); x.fill(); } }) }));
  sky.position.set(-17.5, 6.5, 0); sky.rotation.y = Math.PI / 2; sky.userData.noAO = true; g.add(sky);
  // whiteboard with the lesson, the teacher's desk, a clock, posters
  b.box(paint('#9a9ea4', { metalness: 0.5 }), 17.4, 6.4, 0.3, -2, 6.4, -12.95, { r: 0.05 }); b.box(paint('#f6f7f4', { roughness: 0.25 }), 17, 6.0, 0.1, -2, 6.4, -12.78, { r: 0.02 });
  b.box(paint('#9a9ea4', { metalness: 0.5 }), 17, 0.3, 0.7, -2, 3.3, -12.6, { r: 0.05 });
  b.box(wood, 7, 0.35, 3.4, -9, 3.6, -9.2, { r: 0.05 }); b.box(paint('#7a5a3e'), 6.6, 3.4, 3.0, -9, 1.75, -9.2, { r: 0.05 });
  b.box(paint('#3a6ea8'), 1.2, 0.9, 0.9, -10.6, 4.25, -9.4, { r: 0.08 }); b.box(paint('#e8e2d0'), 1.6, 0.25, 1.2, -8.0, 3.9, -9.0, { r: 0.03 });
  // student desks (3 x 3) and chairs: top at y 4.1, chair seat at 2.45
  W.seats = [];
  for (const z of [-4.6, 1.5, 7.6]) for (const x of [-8, -1, 6]) {
    b.box(wood, 4.6, 0.25, 3.0, x, 4.1, z - 2.0, { r: 0.05 }); b.box(metal, 4.2, 1.4, 0.12, x, 3.3, z - 3.3, { r: 0.02 });
    for (const dx of [-2.0, 2.0]) for (const dz of [-3.3, -0.7]) b.box(metal, 0.18, 4.0, 0.18, x + dx, 2.0, z + dz, { r: 0.04 });
    const seat = paint(['#3a6ea8', '#d9734a', '#4a9a6a'][(x + 8) / 7 % 3 | 0], { roughness: 0.6 });
    b.box(seat, 2.6, 0.3, 2.4, x, 2.3, z + 0.3, { r: 0.1 }); b.box(seat, 2.6, 2.6, 0.3, x, 3.75, z + 1.55, { r: 0.1, rx: -0.08 });
    for (const dx of [-1.1, 1.1]) for (const dz of [-0.8, 1.3]) b.box(metal, 0.14, 2.2, 0.14, x + dx, 1.1, z + 0.3 + dz * 0.9, { r: 0.03 });
    b.box(paint('#f2efe4'), 1.6, 0.06, 2.0, x - 0.6, 4.26, z - 2.1, { r: 0.01, ry: 0.15 });
    W.seats.push(S(x, 0, z)); }
  // backpacks by a few desks
  for (const [x, z, c] of [[-10.6, -4, '#c0392b'], [3.4, 2.4, '#2a6a8a'], [-3.6, 8.2, '#8a5aa0']]) b.box(paint(c, { roughness: 0.8 }), 1.4, 1.8, 0.9, x, 0.9, z, { r: 0.35 });
  // posters (original): a planet chart, a reading poster, a world map
  b.done(g);
  const poster = (draw, x, y, z, ry, w, h) => { const t = canvasTex(256, 340, draw); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); };
  poster((x, w, h) => { x.fillStyle = '#1a2440'; x.fillRect(0, 0, w, h); const c = ['#f2c14a', '#e0844a', '#4a8ad9', '#d94a4a', '#e8b46a', '#c9b07a']; c.forEach((cc, i) => { x.fillStyle = cc; x.beginPath(); x.arc(40 + (i % 2) * 120 + 30, 40 + i * 48, 10 + i * 3, 0, 7); x.fill(); }); x.fillStyle = '#fff'; x.font = '700 26px ITTInter, sans-serif'; x.fillText('PLANETS', 64, 330); }, 5, 7.2, -12.9, 0, 3.0, 4.0);
  poster((x, w, h) => { x.fillStyle = '#f6e7c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#c0392b'; x.font = '900 46px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('READ', w / 2, 120); x.fillStyle = '#2a4a6a'; x.font = '700 30px ITTInter, sans-serif'; x.fillText('every day', w / 2, 170); x.fillStyle = '#4a8a5a'; x.fillRect(60, 210, 136, 90); }, 10.5, 7.2, -12.9, 0, 3.0, 4.0);
  poster((x, w, h) => { x.fillStyle = '#9fc9e6'; x.fillRect(0, 0, w, h); x.fillStyle = '#7aa85a'; for (let i = 0; i < 7; i++) { x.beginPath(); x.ellipse(30 + i * 34, 80 + (i % 3) * 70, 26, 40, i, 0, 7); x.fill(); } }, -14.95, 6.6, 9.9, Math.PI / 2, 4.6, 3.4);
  // the lesson on the board
  const bt = canvasTex(1024, 360, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#1d3a7a'; x.font = '700 64px ITTInter, sans-serif'; x.fillText('Unit 4: The Water Cycle', 40, 90); x.fillStyle = '#2a2a2a'; x.font = '500 46px ITTInter, sans-serif';
    x.fillText('1. Evaporation', 60, 170); x.fillText('2. Condensation', 60, 235); x.fillText('3. Precipitation', 60, 300); x.strokeStyle = '#c0392b'; x.lineWidth = 6; x.beginPath(); x.arc(780, 220, 90, 0.3, 5.6); x.stroke(); });
  bt.colorSpace = THREE.SRGBColorSpace; const bm = new THREE.Mesh(new THREE.PlaneGeometry(15, 5.3), new THREE.MeshBasicMaterial({ map: bt, transparent: true, color: new THREE.Color('#ffffff').multiplyScalar(0.85) })); bm.position.set(-2, 6.4, -12.7); bm.userData.noAO = true; g.add(bm);
  const clk = model('clock', { parent: g, radius: 1.0, glow: false }); (clk.g || clk).position.set(9, 10.4, -12.9); clk.setTime?.(8 * 60 + 14);
  // the door: a light wood leaf with a big window (the glass is clear), shut
  const db = new Batch(), leafM = surf('plank', '#b98a5e', { roughness: 0.45 });
  const wx0 = 1.2, wx1 = 2.8, wy0 = 3.9, wy1 = 6.9;   // the window hole in the leaf (leaf-local x along the leaf, y up)
  db.box(leafM, DOORW, wy0, 0.3, DOORW / 2, wy0 / 2, 0, { r: 0.03 }); db.box(leafM, DOORW, 8.5 - wy1, 0.3, DOORW / 2, (8.5 + wy1) / 2, 0, { r: 0.03 });
  db.box(leafM, wx0, wy1 - wy0, 0.3, wx0 / 2, (wy0 + wy1) / 2, 0, { r: 0.02 }); db.box(leafM, DOORW - wx1, wy1 - wy0, 0.3, (DOORW + wx1) / 2, (wy0 + wy1) / 2, 0, { r: 0.02 });
  for (const s of [-1, 1]) { db.box(paint('#c9cfcc', { metalness: 0.85, roughness: 0.3 }), 0.9, 0.16, 0.16, DOORW - 0.75, 4.1, s * 0.3, { r: 0.06 }); }
  const door = db.done(); door.position.set(15.2, 0, DOORZ); door.rotation.y = -Math.PI / 2; g.add(door); W.cdoor = door;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0, wy1 - wy0), new THREE.MeshStandardMaterial({ color: '#cfe0e6', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.12, depthWrite: false }));
  glass.position.set(15.2, (wy0 + wy1) / 2, DOORZ + (wx0 + wx1) / 2); glass.rotation.y = Math.PI / 2; g.add(glass);
  W.doorWin = S(15.2, (wy0 + wy1) / 2, DOORZ + (wx0 + wx1) / 2);
  const plate = canvasTex(256, 110, (x, w, h) => { x.fillStyle = '#2a4a6a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '900 70px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('214', w / 2, 82); }); plate.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.4 })); pm.position.set(15.45, 7.8, 12.6); pm.rotation.y = Math.PI / 2; g.add(pm);
  // fluorescent panels
  W.cpanels = []; for (const x of [-8, 0, 8]) for (const z of [-6, 4]) { const f = fluorPanel(3.4, 6.4, { tint: '#fff8ec', gain: 1.25 }); f.position.set(x, H - 0.1, z); g.add(f); W.cpanels.push(f); }
  // ---- the hallway (x 15..29, z -30..30): lockers on the far wall, panels, a bulletin board, polished floor ----
  const hb = new Batch(), hf = vinyl('#d8d2c4'), hw = wallPaint('#e6e8dc');
  hb.box(hf, 14.6, 0.4, 62, 22.2, -0.2, 0, { r: 0.02 }); hb.box(ceilingTile('#efefe9'), 14.6, 0.3, 62, 22.2, H + 0.15, 0, { r: 0.02 });
  hb.box(hw, 0.4, H, 62, 29.6, H / 2, 0, { r: 0.01 }); hb.box(hw, 0.4, H, 41, 15.6, H / 2, -10.5 - 0.0 - 10, { r: 0.01 });
  hb.box(hw, 0.4, H, 18.6, 15.6, H / 2, 21.0, { r: 0.01 }); hb.box(hw, 14.6, H, 0.4, 22.2, H / 2, -31, { r: 0.01 }); hb.box(hw, 14.6, H, 0.4, 22.2, H / 2, 31, { r: 0.01 });
  const lockC = paint('#3f6aa8', { metalness: 0.45, roughness: 0.4 }), lockD = paint('#2f5288', { metalness: 0.4, roughness: 0.45 });
  for (let z = -29; z < 29; z += 1.9) { hb.box(lockC, 1.8, 7.4, 1.8, 28.5, 3.9, z + 0.95, { r: 0.03 }); for (let k = 0; k < 4; k++) hb.box(lockD, 0.06, 0.08, 1.1, 27.58, 6.6 - k * 0.2, z + 0.95, { r: 0.0 }); hb.box(paint('#c9cfd4', { metalness: 0.8 }), 0.1, 0.5, 0.18, 27.56, 4.2, z + 1.55, { r: 0.03 }); }
  hb.box(paint('#2a3a5a'), 1.8, 0.5, 58, 28.5, 0.25, 0, { r: 0.02 });
  hb.box(paint('#a07a50', { roughness: 0.8 }), 0.2, 4.2, 8.0, 15.85, 6.2, -6, { r: 0.04 }); hb.box(paint('#c9a46a', { roughness: 0.9 }), 0.1, 3.8, 7.6, 15.95, 6.2, -6, { r: 0.02 });
  for (const [z, y, c] of [[-8.6, 7, '#f2e6a0'], [-6.4, 6.6, '#a8d8f0'], [-4.2, 7.2, '#f4b6c8'], [-7.6, 5.0, '#c8f0b0'], [-5.0, 5.2, '#ffffff']]) hb.box(paint(c, { roughness: 0.9 }), 0.06, 1.4, 1.6, 16.05, y, z, { r: 0.01, rx: (z % 2) * 0.05 });
  hb.done(g);
  W.hpanels = []; for (let z = -26; z <= 26; z += 8) { const f = fluorPanel(3.0, 6.0, { tint: '#f4fbf0', gain: 1.3 }); f.position.set(22.2, H - 0.1, z); g.add(f); W.hpanels.push(f); }
  W.hallCam = model('security_cam', { parent: g }); (W.hallCam.g || W.hallCam).position.set(28.9, 11.2, -24); W.hallCam.aim?.(-0.6, -0.3, true);
}

// ---- the school security office ----
function office() {
  const g = new THREE.Group(); g.position.copy(SO); ctx.scene.add(g); W.office = g;
  const b = new Batch(), H = 10, wall = wallPaint('#46536a'), floor = vinyl('#5a5a5e'), trim = paint('#2a2f38');
  b.box(floor, 22, 0.4, 18, 0, -0.2, 0, { r: 0.02 }); b.box(ceilingTile('#c8c8c4'), 22, 0.3, 18, 0, H + 0.15, 0, { r: 0.02 });
  b.box(wall, 22, H, 0.4, 0, H / 2, -9, { r: 0.01 }); b.box(wall, 0.4, H, 18, -11, H / 2, 0, { r: 0.01 }); b.box(wall, 0.4, H, 18, 11, H / 2, 0, { r: 0.01 }); b.box(wall, 22, H, 0.4, 0, H / 2, 9, { r: 0.01 });
  // desk along the back wall, keyboard, mug, a radio, a binder
  const desk = paint('#3a3c42', { roughness: 0.5 }); b.box(desk, 16, 0.35, 4.2, 0, 3.7, -6.6, { r: 0.05 }); b.box(paint('#26282c'), 15.6, 3.5, 3.8, 0, 1.75, -6.8, { r: 0.05 });
  b.box(paint('#1c1d20'), 3.6, 0.15, 1.2, 0.4, 3.95, -5.4, { r: 0.04 }); b.box(paint('#1c1d20'), 0.5, 0.15, 0.8, 2.8, 3.95, -5.3, { r: 0.1 });
  b.cyl(paint('#e8e2d6'), 0.32, 0.28, 0.75, -3.6, 4.25, -5.6, { seg: 14 }); b.box(paint('#202226'), 0.6, 1.3, 0.4, 5.6, 4.5, -6.4, { r: 0.08 }); b.box(paint('#a83a3a'), 2.0, 0.3, 1.5, -5.6, 4.0, -6.2, { r: 0.04 });
  // a monitor bank above the desk (2 x 3), the main monitor on the desk
  W.monPos = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const x = (c - 1) * 4.9, y = 6.4 + r * 2.85; b.box(paint('#111216'), 4.6, 2.65, 0.3, x, y, -8.65, { r: 0.06 }); W.monPos.push(v3(x, y, -8.48)); }
  b.box(paint('#111216'), 6.0, 3.5, 0.3, 0, 6.0, -7.6, { r: 0.06 }); b.box(paint('#2a2c30'), 0.5, 2.0, 0.4, 0, 4.7, -7.8, { r: 0.05 });
  // a filing cabinet, a corkboard with notices, blinds on a dark window
  b.box(paint('#7a8088', { metalness: 0.5 }), 3, 5.5, 3, -9.2, 2.75, 4.5, { r: 0.05 }); for (let k = 0; k < 4; k++) b.box(paint('#5a6068'), 2.4, 0.12, 0.1, -7.65, 1.0 + k * 1.3, 4.5, { r: 0.02 });
  b.box(paint('#a07a50'), 0.2, 3.6, 6, 10.75, 6, 2, { r: 0.04 }); for (const [z, y, c] of [[0.4, 6.8, '#f2e6a0'], [2.2, 6.2, '#ffffff'], [3.8, 6.9, '#a8d8f0']]) b.box(paint(c), 0.06, 1.3, 1.2, 10.6, y, z, { r: 0.01 });
  b.box(paint('#0c1018'), 0.1, 4, 6, -10.75, 6.2, -3, { r: 0.01 }); for (let k = 0; k < 12; k++) b.box(paint('#c8c4b8', { roughness: 0.6 }), 0.08, 0.14, 6.0, -10.6, 8.0 - k * 0.32, -3, { r: 0.02, rz: 0.4 });
  // the officer's chair
  const ch = paint('#1e2026', { roughness: 0.6 }); b.box(ch, 3.0, 0.5, 2.8, -1.4, 2.35, -3.4, { r: 0.15 }); b.box(ch, 3.0, 3.6, 0.5, -1.4, 4.3, -2.0, { r: 0.15 }); b.cyl(paint('#2a2c30', { metalness: 0.6 }), 0.18, 0.18, 2.0, -1.4, 1.1, -3.4); b.cyl(paint('#2a2c30'), 1.4, 1.4, 0.2, -1.4, 0.12, -3.4, { seg: 5 });
  b.done(g);
  W.ofChairSeat = O(-1.4, 2.6, -3.4);
}

// ---- Nora's apartment: the entry door with its locks, her bedroom ----
function apartment() {
  const g = new THREE.Group(); g.position.copy(AE); ctx.scene.add(g); W.entry = g;
  const b = new Batch(), H = 11, wall = wallpaper('#d9d0c2', '#cdc2b0', { flower: '#e8e0d2' }), floor = surf('plank', '#7a5a42', { roughness: 0.5 }), trim = paint('#f2ece2', { roughness: 0.5 });
  b.box(floor, 20, 0.4, 20, 0, -0.2, 0, { r: 0.02 }); b.box(paint('#e8e4dc'), 20, 0.3, 20, 0, H + 0.15, 0, { r: 0.02 });
  // the door wall (z -6) with the door hole x -2.2..2.2, height 8.8
  b.box(wall, 7.8, H, 0.4, -6.1, H / 2, -6.2, { r: 0.01 }); b.box(wall, 7.8, H, 0.4, 6.1, H / 2, -6.2, { r: 0.01 }); b.box(wall, 4.4, 2.2, 0.4, 0, 9.9, -6.2, { r: 0.01 });
  b.box(wall, 0.4, H, 20, -10, H / 2, 0, { r: 0.01 }); b.box(wall, 0.4, H, 20, 10, H / 2, 0, { r: 0.01 });
  for (const s of [-1, 1]) b.box(trim, 0.5, 9.0, 0.5, s * 2.45, 4.5, -5.95, { r: 0.05 }); b.box(trim, 5.4, 0.5, 0.5, 0, 9.05, -5.95, { r: 0.05 });
  b.box(trim, 20, 0.6, 0.2, 0, 0.3, -5.95, { r: 0.04 });
  // a console table with keys and a bowl, a coat hook with a coat, framed photos (Nora and her mother)
  b.box(surf('plank', '#5a3a2a'), 5, 0.3, 1.8, -6.2, 3.6, -5.0, { r: 0.05 }); for (const x of [-8.4, -4.0]) b.box(paint('#3a2a20'), 0.25, 3.5, 0.25, x, 1.75, -5.0, { r: 0.04 });
  b.cyl(paint('#c9a46a', { metalness: 0.6 }), 0.7, 0.45, 0.4, -6.6, 3.95, -5.0, { seg: 18 }); b.box(paint('#d8b24a', { metalness: 0.9 }), 0.5, 0.06, 0.25, -5.4, 3.8, -4.9, { r: 0.02, ry: 0.4 });
  for (const x of [5.0, 7.2]) b.box(paint('#3a3a40', { metalness: 0.6 }), 0.2, 0.2, 0.6, x, 7.2, -5.8, { r: 0.05 }); b.box(paint('#6a4a3a', { roughness: 0.9 }), 2.0, 4.2, 0.8, 5.0, 5.0, -5.5, { r: 0.4 });
  b.done(g);
  const dr = panelDoor({ w: 4.4, h: 8.8, color: '#e6e0d6', trim: '#d6cfc2' }); dr.position.set(-2.2, 0, -6.15); g.add(dr); W.fdoor = dr;
  // the locks (on the door's inside face, z -5.95): a deadbolt with a thumb turn, a chain on a slide track
  const lb = new Batch(), brass = paint('#c9a24a', { metalness: 0.9, roughness: 0.3 });
  lb.box(brass, 0.9, 1.4, 0.12, 1.55, 5.6, -5.92, { r: 0.08 }); lb.box(brass, 0.32, 1.3, 0.12, -1.45 + 0.0, 6.6, -5.92, { r: 0.04 }); lb.box(brass, 0.3, 0.6, 0.2, 2.45 + 0.35, 6.6, -5.9, { r: 0.05 });
  lb.box(brass, 1.8, 0.3, 0.14, 1.9, 6.6, -5.92, { r: 0.05 }); lb.done(g);
  W.thumb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), brass); W.thumb.position.set(1.55, 5.6, -5.75); g.add(W.thumb);
  // the chain: a run of links from the frame to a knob that slides in the track (track on the door, y 6.6, x 1.0..2.8)
  W.chainLinks = []; const linkG = new THREE.TorusGeometry(0.11, 0.035, 6, 10);
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(linkG, brass); g.add(m); W.chainLinks.push(m); }
  W.chainKnob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), brass); g.add(W.chainKnob);
  // a small hall lamp on the table
  const lbb = new Batch(); lbb.cyl(paint('#e8dcc4'), 0.5, 0.7, 1.2, -8.2, 4.35, -5.0, { seg: 16 }); lbb.cyl(paint('#f6ead0', { side: THREE.DoubleSide }), 0.6, 1.0, 1.0, -8.2, 5.4, -5.0, { seg: 20 }); lbb.done(g);
  for (const [x, y, w, h, kind] of [[6.6, 3.6, 2.0, 1.6, 0]]) { void x; void y; void w; void h; void kind; }
  bedroom();
}

function bedroom() {
  const g = new THREE.Group(); g.position.copy(AB); ctx.scene.add(g); W.bed = g;
  const b = new Batch(), H = 11, wp = wallpaper('#b7c2d6', '#a6b2c8', { flower: '#c8d0e0' }), floor = surf('plank', '#6e5038', { roughness: 0.5 }), trim = paint('#eef0f4', { roughness: 0.5 });
  b.box(floor, 24.4, 0.4, 24.4, 0, -0.2, 0, { r: 0.02 }); b.box(paint('#dfe2ea'), 24.4, 0.3, 24.4, 0, H + 0.15, 0, { r: 0.02 });
  b.box(wp, 24, H, 0.4, 0, H / 2, -12.2, { r: 0.01 }); b.box(wp, 24, H, 0.4, 0, H / 2, 12.2, { r: 0.01 }); b.box(wp, 0.4, H, 24, -12.2, H / 2, 0, { r: 0.01 });
  // the window wall (x 12) with the hole z -4.4..1.6, y 3.4..9.6
  const ww = (z, y, d, h) => b.box(wp, 0.4, h, d, 12.2, y, z, { r: 0.01 });
  ww(-8.3, H / 2, 7.8, H); ww(6.9, H / 2, 10.6, H); ww(-1.4, 1.7, 6.0, 3.4); ww(-1.4, 10.3, 6.0, 1.4);
  b.box(trim, 0.9, 0.35, 6.8, 11.85, 3.3, -1.4, { r: 0.05 }); b.box(trim, 0.5, 0.4, 6.6, 11.95, 9.75, -1.4, { r: 0.05 }); for (const z of [-4.55, 1.75]) b.box(trim, 0.5, 6.6, 0.4, 11.95, 6.5, z, { r: 0.05 });
  b.box(trim, 0.2, 6.2, 0.18, 12.05, 6.5, -1.4, { r: 0.03 }); b.box(trim, 0.2, 0.18, 6.0, 12.05, 6.5, -1.4, { r: 0.03 });
  for (const [x, z, w, d] of [[0, -11.95, 24, 0.2], [0, 11.95, 24, 0.2], [-11.95, 0, 0.2, 24]]) b.box(trim, w, 0.6, d, x, 0.3, z, { r: 0.04 });
  // the bed (double): head at -z against the back wall; nightstands; an alarm clock; a lamp (off)
  const bd = homeBed({ w: 10.6, l: 14, covered: false }); bd.position.set(BX, 0, BZ - 1.0 + 0.0); g.add(bd); W.bedTop = bd.top;
  const ns = surf('plank', '#5a3e2c');
  for (const x of [-7.9, 7.9]) { b.box(ns, 3.4, 3.4, 3.0, x, 1.7, -8.6, { r: 0.08 }); b.box(paint('#3e2a1e'), 2.8, 0.1, 0.1, x, 2.4, -7.1, { r: 0.02 }); }
  b.box(paint('#1c1e24'), 1.3, 0.8, 0.7, -8.4, 3.8, -8.8, { r: 0.12 });
  b.cyl(paint('#d8d0c4'), 0.45, 0.6, 1.5, -6.9, 4.15, -9.2, { seg: 16 }); b.cyl(paint('#efe6d6', { side: THREE.DoubleSide }), 0.7, 1.1, 1.2, -6.9, 5.4, -9.2, { seg: 20 });
  // a desk and chair by the far wall, a bookshelf, a rug, a closet door, posters
  b.box(surf('plank', '#d9cbb8'), 6.4, 0.3, 3.0, -8.4, 3.85, 8.6, { r: 0.06 }); for (const x of [-11.2, -5.6]) for (const z of [7.4, 9.8]) b.box(paint('#e6e0d8'), 0.3, 3.7, 0.3, x, 1.85, z, { r: 0.05 });
  b.box(paint('#3a3440'), 2.6, 1.8, 0.2, -8.4, 5.0, 9.8, { r: 0.05 }); b.box(paint('#7a6aa0'), 2.6, 0.4, 2.6, -6.4, 2.4, 6.2, { r: 0.12 });
  b.box(surf('plank', '#e6dfd2'), 1.4, 8.4, 4.6, -11.3, 4.2, -2.0, { r: 0.05 }); for (let k = 0; k < 4; k++) { b.box(surf('plank', '#e6dfd2'), 1.4, 0.2, 4.6, -11.3, 1.4 + k * 2.1, -2.0, { r: 0.03 }); for (let i = 0; i < 6; i++) b.box(paint(['#7a5aa0', '#e3a54a', '#4a8a9a', '#c45a6a', '#5a6aa8', '#8aa85a'][(i + k) % 6]), 1.0, 1.4, 0.45, -11.2, 2.2 + k * 2.1, -3.8 + i * 0.6, { r: 0.03 }); }
  b.cyl(paint('#8a7aa8', { roughness: 0.95 }), 5.0, 5.0, 0.06, 2.0, 0.03, 6.0, { seg: 40 }); b.cyl(paint('#c8bcd8', { roughness: 0.95 }), 3.6, 3.6, 0.08, 2.0, 0.04, 6.0, { seg: 40 });
  b.box(paint('#d6cfc4'), 4.4, 8.6, 0.25, 6.0, 4.3, 11.95, { r: 0.04 }); b.add(paint('#c9a24a', { metalness: 0.9 }), new THREE.SphereGeometry(0.2, 10, 8), 4.3, 4.2, 11.75);
  b.done(g);
  const poster = (draw, x, y, z, ry, w, h) => { const t = canvasTex(256, 340, draw); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); };
  poster((x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a3a6a'); gr.addColorStop(1, '#c9789a'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = '#f6e6c0'; x.beginPath(); x.arc(128, 130, 50, 0, 7); x.fill(); x.fillStyle = '#1a2240'; x.fillRect(0, 250, w, 90); }, -12.0, 7.0, 6.5, Math.PI / 2, 3.0, 4.0);
  poster((x, w, h) => { x.fillStyle = '#e8e0d0'; x.fillRect(0, 0, w, h); x.fillStyle = '#4a7a6a'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(60 + i * 36, 200 - i * 20, 40, 0, 7); x.fill(); } x.fillStyle = '#2a2a2a'; x.font = '700 30px ITTInter, sans-serif'; x.fillText('BLOOM', 70, 320); }, 3.5, 7.0, -11.95, 0, 3.0, 4.0);
  // the night outside the window: a distant block with a few lit windows, the glow of the street lamps below
  const night = canvasTex(512, 512, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#060912'); gr.addColorStop(0.7, '#141c2e'); gr.addColorStop(1, '#3a3426'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    const r = rng(9); x.fillStyle = '#0a0d14'; x.fillRect(40, 230, 180, 282); x.fillRect(300, 180, 170, 332); for (let i = 0; i < 26; i++) { x.fillStyle = r() < 0.2 ? '#e8c27a' : '#1a2030'; x.fillRect(60 + (i % 5) * 30, 250 + Math.floor(i / 5) * 46, 14, 20); x.fillStyle = r() < 0.15 ? '#d8b46a' : '#1a2030'; x.fillRect(320 + (i % 5) * 28, 200 + Math.floor(i / 5) * 52, 13, 22); } });
  night.colorSpace = THREE.SRGBColorSpace; W.nightM = new THREE.MeshBasicMaterial({ map: night, color: new THREE.Color('#ffffff').multiplyScalar(0.55) });
  const np = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), W.nightM); np.position.set(26, 6, -1.4); np.rotation.y = -Math.PI / 2; np.userData.noAO = true; g.add(np);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 6.2), new THREE.MeshStandardMaterial({ color: '#9fb0c8', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.1, depthWrite: false })); gl.position.set(12.1, 6.5, -1.4); gl.rotation.y = -Math.PI / 2; g.add(gl);
  // the curtains: two panels on a rod; the right-hand one (z > -1.4, as Nora faces it) can be drawn back
  const vel = new THREE.MeshStandardMaterial({ color: '#7a4a52', roughness: 0.95, side: THREE.DoubleSide });
  const drape = () => { const geo = new THREE.PlaneGeometry(3.6, 7.6, 24, 10), p = geo.attributes.position; geo.translate(1.8, 0, 0); for (let i = 0; i < p.count; i++) { p.setZ(i, 0.18 * Math.sin(p.getX(i) / 3.6 * Math.PI * 6)); } geo.computeVertexNormals(); const m = new THREE.Mesh(geo, vel); m.castShadow = true; m.receiveShadow = true; return m; };
  W.curL = drape(); W.curR = drape(); g.add(W.curL, W.curR);
  W.curL.rotation.y = Math.PI / 2; W.curL.position.set(11.55, 6.3, -1.4 + 0.15);    // spans z -1.25 .. -4.85 (local x maps to -z)
  W.curR.rotation.y = -Math.PI / 2; W.curR.position.set(11.55, 6.3, -1.4 - 0.15); W.curR.rotation.y = Math.PI / 2; W.curR.scale.x = -1;   // spans z -1.55 .. +2.05
  const rod = new Batch(); rod.cyl(paint('#2a2a2e', { metalness: 0.7 }), 0.1, 0.1, 9.6, 11.5, 10.3, -1.4, { rx: Math.PI / 2, seg: 8 }); rod.done(g);
  // the alarm clock reads 3:00
  const ct = canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#060606'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff3a2a'; x.font = '700 92px monospace'; x.textAlign = 'center'; x.fillText('3:00', w / 2, 98); }); ct.colorSpace = THREE.SRGBColorSpace;
  const cm = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshBasicMaterial({ map: ct, color: new THREE.Color('#ffffff').multiplyScalar(0.9) })); cm.position.set(-8.4, 3.8, -8.44); cm.userData.noAO = true; g.add(cm);
  // the blankets: a double duvet over both sleepers (mother on -x, Nora on +x), a flat one for the empty bed, and Nora's over her legs when she sits up
  const bm = paint('#e6ddd0', { roughness: 0.92 }), bm2 = paint('#c9b8a8', { roughness: 0.9 });
  const duvet = (w) => { const sb = new Batch(); sb.box(bm, w, 1.3, 5.4, 0, 0, 0, { r: 0.5 }); sb.box(bm, w, 2.4, 2.2, 0, 0.55, 2.0, { r: 0.9 }); sb.box(paint('#f4f2ee', { roughness: 0.88 }), w + 0.06, 0.34, 0.75, 0, 0.6, -2.55, { r: 0.15 }); return sb.done(); };
  W.duvetMom = duvet(5.0); W.duvetMom.position.set(BX - 2.6, BEDTOP + 0.75, BZ - 1.6); g.add(W.duvetMom);
  W.duvetNora = duvet(5.0); W.duvetNora.position.set(BX + 2.6, BEDTOP + 0.75, BZ - 1.6); g.add(W.duvetNora);
  const fb = new Batch(); fb.box(bm, 5.2, 0.45, 9.5, 0, 0, 0, { r: 0.2 }); fb.box(bm2, 5.26, 0.5, 1.2, 0, 0.05, -4.4, { r: 0.2 }); W.duvetFlat = fb.done(); W.duvetFlat.position.set(BX - 2.6, BEDTOP + 0.28, BZ + 1.0); g.add(W.duvetFlat);
  const lap = new Batch(); lap.box(bm, 5.2, 1.6, 6.4, 0, 0, 0, { r: 0.55 }); lap.box(bm, 5.2, 2.8, 2.0, 0, 0.6, 2.6, { r: 0.85 }); W.duvetLap = lap.done(); g.add(W.duvetLap);
  W.pillowDent = null;
}

// ---- the photo yard (rendered once into the childhood photograph) ----
function yard() {
  const g = new THREE.Group(); g.position.copy(PH); ctx.scene.add(g); W.yard = g;
  const b = new Batch();
  b.box(surf('grass', '#7ab04f', { roughness: 0.95 }), 120, 0.4, 120, 0, -0.2, 0, { r: 0.02 });
  picket(b, -30, 30, -9, { h: 3.0 });
  b.box(surf('siding', '#f2e2c6'), 22, 14, 1, 14, 7, -20, { r: 0.05 }); b.box(paint('#ffffff'), 3.4, 4.4, 0.4, 10, 7.4, -19.4, { r: 0.05 }); b.box(paint('#3a5a7a', { roughness: 0.1 }), 2.8, 3.8, 0.2, 10, 7.4, -19.2, { r: 0.02 });
  // a swing set (red frame), a small slide
  const red = paint('#c8483a', { metalness: 0.3, roughness: 0.45 });
  for (const x of [-12, -4]) { b.cyl(red, 0.18, 0.18, 9.4, x - 1.6, 4.4, -5.2, { rz: 0.34, seg: 10 }); b.cyl(red, 0.18, 0.18, 9.4, x + 1.6, 4.4, -5.2, { rz: -0.34, seg: 10 }); }
  b.cyl(red, 0.2, 0.2, 8.6, -8, 8.8, -5.2, { rz: Math.PI / 2, seg: 10 });
  for (const x of [-9.6, -6.4]) { b.cyl(paint('#9a9a9a', { metalness: 0.7 }), 0.04, 0.04, 6.0, x - 0.5, 5.8, -5.2, { seg: 5 }); b.cyl(paint('#9a9a9a', { metalness: 0.7 }), 0.04, 0.04, 6.0, x + 0.5, 5.8, -5.2, { seg: 5 }); b.box(paint('#2a2a2a'), 1.4, 0.15, 0.6, x, 2.8, -5.2, { r: 0.05 }); }
  b.done(g);
  model('tree', { parent: g, seed: 6 }); const tr = g.children[g.children.length - 1]; if (tr) { tr.position.set(9, 0, -12); tr.scale.setScalar(1.9); }
  for (const [x, c] of [[-2, '#f2a0b8'], [-0.5, '#f6d46a'], [1.4, '#ffffff'], [3.0, '#c8a0f0']]) { const fl = new Batch(); fl.cyl(paint('#4a8a3a'), 0.05, 0.05, 1.0, x, 0.5, -8.4, { seg: 5 }); fl.add(paint(c), new THREE.SphereGeometry(0.28, 8, 6), x, 1.05, -8.4); fl.done(g); }
}

// ---- characters ----
const CAST = { mia: 'farm_mia', noah: 'farm_noah', finn: 'farm_finn', teach: 'farm_grandpa', cop1: 'farm_prison_guard', cop2: 'farm_hc_sheriff_boone', mom: 'farm_classic_mom' };
function people() {
  const mk = (avatar, lash) => { const c = makeCharacter({ avatar, alti: true, caustic: false }); ctx.scene.add(c.root); if (lash) c.faceStyle = (x) => 'lash:' + x; c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); c.root.visible = false; return c; };
  W.n = mk('farm_ep35_nora', true); W.g = mk('farm_ep35_girl', true);
  W.nc = mk('farm_ep35_nora', true);                         // Nora as the recordings show her (the fixed smile)
  W.kn = mk('farm_ep35_nora', true); W.kg = mk('farm_ep35_girl', true);   // the two little girls in the photograph
  W.x = {}; for (const [k, a] of Object.entries(CAST)) W.x[k] = mk(a, k === 'mia' || k === 'mom');
  // the girl's blunt fringe sat over her eyes: lift the hair a little so the unblinking eyes read (the point of the episode)
  for (const c of [W.g, W.kg]) { c.reset(); c.root.updateMatrixWorld(true); c.root.traverse((m) => { if (!m.isMesh || m === c.faceSheet) return; const bx = new THREE.Box3().setFromObject(m); if (bx.min.y > 3.5 && bx.max.y - bx.min.y > 1.5) { m.position.y += 0.24; m.scale.multiplyScalar(1.03); } }); }
  for (const c of [W.n, W.g, W.nc, W.kn, W.kg, ...Object.values(W.x)]) { c.reset(); c.root.updateMatrixWorld(true); const bx = new THREE.Box3().setFromObject(c.root); c.tall = bx.max.y - bx.min.y; armLen(c); }
}
const all = () => [W.n, W.g, W.nc, W.kn, W.kg, ...Object.values(W.x)];
const hideAll = () => all().forEach((c) => { c.root.visible = false; });
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(c.faceStyle ? c.faceStyle(name) : name, { blink: o.noBlink ? false : blinkAt(t, ph) && !['shocked', 'terrified'].includes(name), viseme: o.viseme, gaze: o.gaze }); }
const girlFace = (c) => c.setFace('lash:smile', { blink: false });   // the fixed smile: never blinks
function place(c, p, yaw) { c.root.visible = true; c.reset(); c.root.position.copy(p); c.root.rotation.set(0, yaw, 0); c.root.scale.setScalar(1); }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
// sitting: the hips settle so the seat of the trousers rests on a surface at height y
function sitOn(c, p, yaw, y, t) { place(c, p, yaw); pose(c, 'sit', t); const hy = c.hips.position.y; c.root.position.y = y - (hy - 0.55); }
// lying on the back in a bed, head toward -z (the top of the head at zHead)
function lie(c, x, zHead) { c.root.visible = true; c.reset(); c.root.scale.setScalar(1); c.root.rotation.order = 'YXZ'; c.root.rotation.set(-Math.PI / 2 + 0.16, 0, 0); c.root.position.copy(B(x, W.bedTop + 0.6, zHead + c.tall)); }
const unlie = (c) => { c.root.rotation.order = 'XYZ'; };

// ---- the phone ----
function phone() {
  const g = new THREE.Group(), b = new Batch();
  b.box(paint('#1b1d22', { roughness: 0.35, metalness: 0.5 }), 0.92, 1.86, 0.1, 0, 0, 0, { r: 0.04 });
  b.box(paint('#d8d4cc', { roughness: 0.6 }), 0.98, 1.92, 0.08, 0, 0, -0.03, { r: 0.12 });   // a pale case
  b.box(paint('#202228', { metalness: 0.6, roughness: 0.3 }), 0.34, 0.34, 0.05, -0.2, 0.66, -0.09, { r: 0.08 });
  b.done(g);
  const cv = document.createElement('canvas'); cv.width = 900; cv.height = 1800; W.ui = cv; W.uiX = cv.getContext('2d');
  W.uiTex = new THREE.CanvasTexture(cv); W.uiTex.colorSpace = THREE.SRGBColorSpace; W.uiTex.anisotropy = 8;
  W.selfRT = new THREE.WebGLRenderTarget(450, 900, { type: THREE.HalfFloatType, samples: 4 });
  W.screenM = new THREE.ShaderMaterial({ toneMapped: false, fog: false, uniforms: { ui: { value: W.uiTex }, cam: { value: W.selfRT.texture }, camK: { value: 0 }, k: { value: 1 }, t: { value: 0 }, zoom: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D ui, cam; uniform float camK, k, t, zoom; varying vec2 vUv;
      void main(){ vec4 u = texture2D(ui, vUv); vec3 c = u.rgb;
        if (camK > 0.0) { vec2 q = (vUv - 0.5) / (1.0 + zoom) + 0.5; vec3 s = texture2D(cam, q).rgb; s = 1.0 - exp(-s * 1.7); c = mix(mix(c, s, camK), u.rgb, u.a); }
        gl_FragColor = vec4(c * k, 1.0); }` });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.72), W.screenM); scr.position.z = 0.052; scr.userData.noAO = true; g.add(scr); W.scr = scr;
  g.visible = false; ctx.scene.add(g); W.phone = g;
  W.selfCam = new THREE.PerspectiveCamera(64, 0.5, 0.05, 300);
  W.phoneLight = new THREE.PointLight('#cfe0ff', 0, 7, 1.6); ctx.scene.add(W.phoneLight);
}
// screen states drawn into the canvas (only when the state changes)
function drawUI(state) {
  if (W.uiState === state.key) return; W.uiState = state.key;
  const x = W.uiX, w = 900, h = 1800;
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h);
  const font = (wt, sz) => { x.font = `${wt} ${sz}px ITTInter, sans-serif`; };
  const statusBar = (time, light) => { x.fillStyle = light ? '#ffffff' : '#ffffff'; font(600, 40); x.textAlign = 'left'; x.fillText(time, 64, 70); x.textAlign = 'right'; x.fillText('▮▮▮  87%', w - 60, 70); };
  if (state.mode === 'off') { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); }
  else if (state.mode === 'call' || state.mode === 'incall') {
    const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2b3446'); gr.addColorStop(1, '#0d1018'); x.fillStyle = gr; x.fillRect(0, 0, w, h); statusBar('3:00', true);
    x.fillStyle = '#5a6a8a'; x.beginPath(); x.arc(w / 2, 470, 120, 0, 7); x.fill(); x.fillStyle = '#e8ecf4'; font(700, 130); x.textAlign = 'center'; x.fillText('M', w / 2, 515);
    x.fillStyle = '#ffffff'; font(700, 120); x.fillText('MOM', w / 2, 760); x.fillStyle = '#aab4c8'; font(500, 44);
    x.fillText(state.mode === 'call' ? 'mobile  ·  incoming call' : `00:0${state.sec ?? 1}`, w / 2, 840);
    if (state.mode === 'call') { x.fillStyle = '#e0443a'; x.beginPath(); x.arc(230, 1530, 95, 0, 7); x.fill(); x.fillStyle = '#34c25a'; x.beginPath(); x.arc(670, 1530, 95, 0, 7); x.fill();
      x.fillStyle = '#fff'; font(600, 38); x.fillText('Decline', 230, 1690); x.fillText('Accept', 670, 1690); x.strokeStyle = '#fff'; x.lineWidth = 12; x.lineCap = 'round';
      x.beginPath(); x.arc(670, 1545, 40, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); x.beginPath(); x.arc(230, 1520, 40, Math.PI * 0.15, Math.PI * 0.85); x.stroke(); }
    else { x.fillStyle = '#e0443a'; x.beginPath(); x.arc(w / 2, 1530, 95, 0, 7); x.fill(); for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,255,255,0.14)'; x.beginPath(); x.arc(200 + (i % 3) * 250, 1080 + Math.floor(i / 3) * 200, 70, 0, 7); x.fill(); } }
  } else if (state.mode === 'camera') {
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 0, w, 150); x.fillRect(0, h - 330, w, 330); statusBar('3:01', true);
    x.fillStyle = '#ffd34a'; font(700, 38); x.textAlign = 'center'; x.fillText('PHOTO', w / 2, h - 255); x.fillStyle = '#d0d0d0'; x.fillText('VIDEO', w / 2 - 220, h - 255); x.fillText('PORTRAIT', w / 2 + 250, h - 255);
    x.strokeStyle = '#ffffff'; x.lineWidth = 10; x.beginPath(); x.arc(w / 2, h - 120, 74, 0, 7); x.stroke(); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(w / 2, h - 120, 60, 0, 7); x.fill();
    x.fillStyle = '#ff3b30'; x.beginPath(); x.arc(110, 100, 12, 0, 7); x.fill();
  } else if (state.mode === 'notify' || state.mode === 'msg') {
    x.fillStyle = '#0b0c10'; x.fillRect(0, 0, w, h); statusBar('3:02', true);
    x.fillStyle = '#16181f'; x.fillRect(0, 110, w, 150); x.fillStyle = '#5a6a8a'; x.beginPath(); x.arc(150, 185, 48, 0, 7); x.fill(); x.fillStyle = '#e8ecf4'; font(700, 54); x.textAlign = 'center'; x.fillText('M', 150, 204);
    x.fillStyle = '#ffffff'; font(700, 52); x.textAlign = 'left'; x.fillText('MOM', 225, 205); x.fillStyle = '#2f8cff'; font(500, 60); x.fillText('‹', 40, 205);
    if (state.mode === 'notify') { x.fillStyle = 'rgba(40,44,56,0.96)'; x.beginPath(); x.roundRect(40, 300, w - 80, 190, 36); x.fill(); x.fillStyle = '#ffffff'; font(700, 42); x.fillText('MOM', 80, 370); x.fillStyle = '#c8cedc'; font(500, 40); x.fillText('sent a photo', 80, 440); x.textAlign = 'right'; x.fillStyle = '#8a92a4'; font(500, 34); x.fillText('now', w - 80, 370); }
    else {
      const k = state.k ?? 1, pw = 656, ph = 820, px = 122, py = 300;
      x.save(); x.globalAlpha = k; x.fillStyle = '#262a34'; x.beginPath(); x.roundRect(px - 12, py - 12, pw + 24, ph + 24, 40); x.fill();
      x.beginPath(); x.roundRect(px, py, pw, ph, 30); x.clip(); if (W.photoCanvas) x.drawImage(W.photoCanvas, px, py, pw, ph); x.restore();
      if (state.words) { const ty = py + ph + 50, bx = 60, bw = 780; x.fillStyle = '#262a34'; x.beginPath(); x.roundRect(bx, ty, bw, 220, 40); x.fill(); x.fillStyle = '#f2f2f2'; font(800, 66); x.textAlign = 'left';
        x.fillText('YOU PROMISED WE\'D', bx + 40, ty + 95); x.fillText('SWITCH BACK.', bx + 40, ty + 180); x.fillStyle = '#7a8294'; font(500, 32); x.textAlign = 'right'; x.fillText('3:02 AM', bx + bw - 10, ty + 268); }
    }
  }
  W.uiTex.needsUpdate = true;
}
// the phone held in the right hand (arms[0]), its screen toward a point (usually her face)
function holdPhone(c, handAt, faceTo, roll = 0) {
  aimArm(c, 0, handAt, 1); c.root.updateMatrixWorld(true);
  const hp = c.arms[0].localToWorld(v3(0, -armLen(c), 0.1));
  const ph = W.phone; ph.visible = true; ph.position.copy(hp); ph.up.set(0, 1, 0); ph.lookAt(faceTo); ph.rotateZ(roll); ph.translateY(0.95); ph.translateZ(-0.18); ph.updateMatrixWorld(true);
  return hp;
}
function armLen(c) { if (!c._alen) { const r = c.root.rotation.clone(), p = c.root.position.clone(), s = c.root.scale.x; c.reset(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.scale.setScalar(1); c.root.updateMatrixWorld(true);
  const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3().setFromObject(c.arms[0]); c._alen = sh.y - bx.min.y - 0.25; c.root.rotation.copy(r); c.root.position.copy(p); c.root.scale.setScalar(s); } return c._alen; }
const scrPt = (u, v, d = 0) => W.phone.localToWorld(v3((u - 0.5) * 0.86, (v - 0.5) * 1.72, 0.052 + d));   // a point on/in front of the screen (u right, v up)

// ---- render targets: the CCTV feed, snapshots, the photograph ----
function cctvMat(rt) {
  const ov = document.createElement('canvas'); ov.width = 1024; ov.height = 576; const ot = new THREE.CanvasTexture(ov); ot.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.ShaderMaterial({ toneMapped: false, fog: false, uniforms: { map: { value: rt.texture }, over: { value: ot }, t: { value: 0 }, k: { value: 1 }, crop: { value: new THREE.Vector4(0, 0, 1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D map, over; uniform float t, k; uniform vec4 crop; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec2 uv = crop.xy + vUv * crop.zw; vec2 px = vec2(480.0, 270.0) / crop.zw; vec2 q = (floor(uv * px) + 0.5) / px;
        vec3 c = texture2D(map, mix(uv, q, 0.65)).rgb; c = 1.0 - exp(-c * 1.15);
        float l = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(vec3(l), c, 0.35) * vec3(0.9, 1.0, 1.02);
        c *= 0.9 + 0.1 * sin((vUv.y + t * 0.5) * 300.0); c += (h(vUv * 400.0 + floor(t * 30.0)) - 0.5) * 0.05;
        float tear = step(0.985, h(vec2(floor(t * 12.0), 3.0))) * step(abs(vUv.y - fract(t * 0.37)), 0.02); c = mix(c, c.gbr, tear * 0.6);
        vec4 o = texture2D(over, vUv); c = mix(c, o.rgb, o.a);
        gl_FragColor = vec4(c * k, 1.0); }` });
  m.osd = (lines) => { const x = ov.getContext('2d'); x.clearRect(0, 0, 1024, 576); x.font = '700 38px monospace'; x.fillStyle = '#f2f2f2'; x.shadowColor = '#000'; x.shadowBlur = 4;
    x.fillText(lines[0], 30, 56); x.textAlign = 'right'; x.fillText(lines[1], 994, 56); x.textAlign = 'left'; x.fillText(lines[2], 30, 548); x.fillStyle = '#ff3b30'; x.beginPath(); x.arc(980, 530, 12, 0, 7); x.fill(); ot.needsUpdate = true; };
  return m;
}
function renderRT(rt, cam) { const { renderer, scene } = ctx; renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(null); }
function only(...ks) { for (const k of ['street', 'school', 'office', 'entry', 'bed', 'yard']) W[k].visible = ks.includes(k); }

function renderPhoto() {
  // two little girls holding hands in a sunny back yard: Nora (left, smiling) and the girl (right, no face)
  only('yard'); hideAll(); applyEnv(ctx, YARD); lightSet('none');
  const kn = W.kn, kg = W.kg, sc = 0.62;
  for (const [c, x] of [[kn, -1.45], [kg, 1.45]]) { place(c, Y(x, 0, 0), 0); c.root.scale.setScalar(sc); pose(c, 'still', 0); }
  face(kn, 'happy', 0.5); kg.setFace('lash:neutral'); kg.faceSheet.visible = false;   // the other one has no face
  kn.root.updateMatrixWorld(true); kg.root.updateMatrixWorld(true);
  const M = Y(0, 1.15, 0.45); aimArm(kn, 1, M, 1); aimArm(kg, 0, M, 1);
  kn.neck.rotation.z = -0.06; kg.neck.rotation.z = 0.04;
  const sun = ctx.sun; sun.position.copy(Y(30, 50, 40)); sun.target.position.copy(Y(0, 1, 0)); sun.castShadow = true; const sc2 = sun.shadow.camera; sc2.left = -20; sc2.right = 20; sc2.top = 20; sc2.bottom = -20; sc2.updateProjectionMatrix();
  const cam = new THREE.PerspectiveCamera(36, 4 / 5, 0.3, 500); cam.position.copy(Y(0.6, 3.0, 12.5)); cam.lookAt(Y(0, 2.0, 0)); cam.updateMatrixWorld(true);
  const rt = new THREE.WebGLRenderTarget(960, 1200, { type: THREE.HalfFloatType, samples: 4 }); renderRT(rt, cam);
  const rr = new THREE.WebGLRenderTarget(960, 1200, { type: THREE.HalfFloatType });
  // resolve into a plain target to read it back (a multisampled target can't be read directly)
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false })), qs = new THREE.Scene(), qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); qs.add(q);
  ctx.renderer.setRenderTarget(rr); ctx.renderer.render(qs, qc); ctx.renderer.setRenderTarget(null);
  const buf = new Uint16Array(960 * 1200 * 4); ctx.renderer.readRenderTargetPixels(rr, 0, 0, 960, 1200, buf);
  const cv = document.createElement('canvas'); cv.width = 960; cv.height = 1200; const x = cv.getContext('2d'), img = x.createImageData(960, 1200), r = rng(77);
  const F = THREE.DataUtils.fromHalfFloat;
  for (let yy = 0; yy < 1200; yy++) for (let xx = 0; xx < 960; xx++) {
    const i = ((1199 - yy) * 960 + xx) * 4, o = (yy * 960 + xx) * 4;
    let cr = F(buf[i]), cg = F(buf[i + 1]), cb = F(buf[i + 2]);
    cr = 1 - Math.exp(-cr * 1.45); cg = 1 - Math.exp(-cg * 1.45); cb = 1 - Math.exp(-cb * 1.45);
    const l = 0.3 * cr + 0.59 * cg + 0.11 * cb; cr = lerp(l, cr, 0.72); cg = lerp(l, cg, 0.72); cb = lerp(l, cb, 0.72);
    cr = 0.07 + cr * 0.9 * 1.05; cg = 0.06 + cg * 0.88; cb = 0.05 + cb * 0.8;   // faded, warm, lifted blacks
    const ux = xx / 960 - 0.5, uy = yy / 1200 - 0.5, vg = 1 - 0.35 * (ux * ux + uy * uy) * 2.2, gn = (r() - 0.5) * 0.05;
    img.data[o] = 255 * clamp(Math.pow(clamp(cr * vg + gn), 1 / 2.2)); img.data[o + 1] = 255 * clamp(Math.pow(clamp(cg * vg + gn), 1 / 2.2)); img.data[o + 2] = 255 * clamp(Math.pow(clamp(cb * vg + gn), 1 / 2.2)); img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // a light crease and a date stamp burned in the corner
  x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 780); x.bezierCurveTo(300, 760, 620, 820, 960, 790); x.stroke();
  x.fillStyle = 'rgba(255,170,60,0.85)'; x.font = '700 40px monospace'; x.textAlign = 'right'; x.fillText("'15  6  21", 930, 1160);
  W.photoCanvas = cv; rt.dispose(); rr.dispose();
  kn.faceSheet.visible = true; kg.faceSheet.visible = true; hideAll(); only('street', 'school', 'office', 'entry', 'bed');
}
function snapshots() {
  // still frames for the other monitors on the wall: the hallway, the street, the classroom, the entrance
  W.snaps = [];
  const cam = new THREE.PerspectiveCamera(52, 16 / 9, 0.3, 900);
  const views = [['school', HALLP, S(28.6, 11, -26), S(20, 2, 4)], ['street', STREET, v3(13.6, 12, 16), v3(-6, 2, -2)], ['school', ROOMD, S(14, 11, -12.5), S(-4, 2, 6)], ['street', STREET, v3(-30, 12, -14), v3(0, 2, 6)]];
  hideAll();
  views.forEach(([set, pal, p, l], i) => { only(set); applyEnv(ctx, pal); lightSet(set === 'street' ? 'street' : i === 2 ? 'class' : 'hall', 0, l); ctx.sun.castShadow = false; cam.position.copy(p); cam.lookAt(l); cam.updateMatrixWorld(true);
    const rt = new THREE.WebGLRenderTarget(480, 270, { type: THREE.HalfFloatType }); renderRT(rt, cam); W.snaps.push(rt); });
  only('street', 'school', 'office', 'entry', 'bed');
  W.monM = W.snaps.map((rt, i) => { const m = cctvMat(rt); m.osd([`CAM 0${i + 1}`, 'NOV 07', ['HALL B', 'ELM ST', 'RM 214', 'GATE'][i]]); return m; });
  W.monMeshes = W.monPos.map((p, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.4), W.monM[[0, 1, 2, 3, 1, 0][i]]); m.position.copy(p); m.userData.noAO = true; W.office.add(m); return m; });
  // the main monitor plays the live feed
  W.feedRT = new THREE.WebGLRenderTarget(960, 540, { type: THREE.HalfFloatType, samples: 2 }); W.feedM = cctvMat(W.feedRT);
  W.mainMon = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.15), W.feedM); W.mainMon.position.set(0, 6.0, -7.43); W.mainMon.userData.noAO = true; W.office.add(W.mainMon);
  W.feedCam = new THREE.PerspectiveCamera(50, 16 / 9, 0.3, 900);
}

// ---- lights ----
function rig() {
  W.pl = []; for (let i = 0; i < 9; i++) { const l = new THREE.PointLight('#ffffff', 0, 30, 1.6); ctx.scene.add(l); W.pl.push(l); }
  W.key = new THREE.SpotLight('#ffffff', 0, 60, 0.7, 0.8, 1.2); W.key.castShadow = true; W.key.shadow.mapSize.set(1024, 1024); W.key.shadow.bias = -0.0006; W.key.shadow.normalBias = 0.04; ctx.scene.add(W.key); ctx.scene.add(W.key.target);
}
const setL = (i, p, col, I, dist) => { const l = W.pl[i]; l.position.copy(p); l.color.set(col); l.intensity = I; l.distance = dist; };
function lightSet(set, t = 0, focus = v3()) {
  W.pl.forEach((l) => { l.intensity = 0; }); W.key.intensity = 0; if (W.phoneLight) W.phoneLight.intensity = 0;
  const key = (p, tgt, col, I, ang = 0.7, dist = 50) => { W.key.position.copy(p); W.key.target.position.copy(tgt); W.key.color.set(col); W.key.intensity = I; W.key.angle = ang; W.key.distance = dist; };
  if (set === 'street') { /* the sun does it */ }
  else if (set === 'streetN') {
    W.lamps.forEach((l, i) => { if (i < 5) setL(i, l.head, '#ffcf8a', i === 0 ? 120 : 70, 34); });
    setL(5, NW.clone().add(v3(0, 0, -1.2)), '#ffc890', 6, 8);
  } else if (set === 'class') {
    setL(0, S(-8, 11, -6), '#fff6e8', 26, 26); setL(1, S(8, 11, -6), '#fff6e8', 26, 26); setL(2, S(-8, 11, 4), '#fff6e8', 26, 26); setL(3, S(8, 11, 4), '#fff6e8', 26, 26);
    setL(4, S(-13, 7, 0), '#fff0d6', 30, 30);
    key(S(-24, 16, -2), v3(focus.x, 2.5, focus.z), '#fff0d8', 260, 0.55, 70);   // morning sun through the windows: the one shadow
  } else if (set === 'hall') {
    for (let i = 0; i < 6; i++) { const z = clamp(Math.round((focus.z - SC.z) / 8) * 8 + (i - 2.5) * 8, -26, 26); setL(i, S(22.2, 11.2, z), '#f4fbf0', 16, 24); }
    key(S(22.2, 11.6, focus.z - SC.z + 6), v3(focus.x, 2.5, focus.z), '#f2faf0', 70, 0.8, 40);
  } else if (set === 'office') {
    setL(0, O(0, 6.0, -6.0), '#9fc4ff', 26, 16); setL(1, O(-5, 7.5, -7), '#8fb8ff', 14, 14); setL(2, O(5, 7.5, -7), '#8fb8ff', 14, 14); setL(3, O(6, 9.5, 5), '#ffd9a8', 16, 24);
    key(O(4, 9.4, 4), v3(focus.x, 3.5, focus.z), '#ffe0b8', 90, 0.7, 40);
  } else if (set === 'entry') {
    setL(0, E(-8.2, 5.2, -4.4), '#ffc890', 22, 16); setL(1, E(4, 9.5, 2), '#8a9ac0', 8, 22);
    key(E(-5, 9.5, 3), v3(focus.x, 5, focus.z), '#ffd2a0', 70, 0.75, 34);
  } else if (set === 'bed') {
    setL(0, B(13, 8, -1.4), '#8aa4d8', W.winK ?? 6, 22);                   // the window's cold spill
    setL(1, B(6, 2.0, 11), '#ffb878', 5, 10);                              // a night light by the door
    setL(2, B(-2, 9.5, 4), '#6a7ab0', 7, 30);                              // fill
    key(B(9.5, 10.4, 8), v3(focus.x, 2.5, focus.z), '#9fb2e6', W.keyK ?? 60, 0.75, 40);   // moonlight: the one shadow
  }
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, en = (i) => L(i).end, e = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  // the street: a steady opening, then the high two-shot, then the girl
  add('street', 0, (u) => ({ pos: lp3(v3(3.0, 4.4, 12.6), v3(2.4, 4.4, 12.4), u), look: v3(-8, 3.6, 10.2), fov: 54 }));
  add('across', s(0) + 2.15, (u) => ({ pos: lp3(v3(-9.6, 9.6, 16.3), v3(-8.9, 9.0, 15.8), easeInOut(u)), look: v3(-0.5, 2.6, -6.5), fov: 50 }));
  add('smile', s(1) - 0.08, (u) => ({ pos: lp3(GS.clone().add(v3(-0.5, 4.9, 9.5)), GS.clone().add(v3(-0.4, 4.9, 7.6)), easeOut(u)), look: GS.clone().add(v3(0, 3.95, 0)), fov: 40 }));
  // the school
  add('class', s(2) - 0.1, (u) => ({ pos: lp3(S(-12.5, 9.2, -11.0), S(-11.6, 8.8, -10.0), u), look: S(5, 2.6, 6), fov: 60 }));
  add('glance', e.glance - 0.35, (u) => ({ pos: lp3(S(9.2, 5.3, -3.2), S(9.0, 5.2, -2.7), u), look: S(6.0, 4.6, 1.5), fov: 48 }));
  add('window', s(3) - 0.08, (u) => ({ pos: lp3(S(11.4, 5.4, 8.3), S(12.6, 5.35, 8.4), easeOut(u)), look: S(17, 5.0, 8.4), fov: 38 }));
  add('hall', s(4) - 0.08, (u) => ({ pos: lp3(S(16.8, 5.4, 21), S(17.0, 5.2, 19.5), u), look: S(19.4, 3.0, 8.3), fov: 50 }));
  add('eyes', s(5) - 0.1, (u) => ({ pos: lp3(GH.clone().add(v3(-3.2, 4.85, 0.3)), GH.clone().add(v3(-2.5, 4.85, 0.25)), u), look: GH.clone().add(v3(0, 4.8, 0)), fov: 30 }));
  // the security office
  add('police', s(6) - 0.12, (u) => ({ pos: lp3(O(-9.0, 6.8, 4.5), O(-8.5, 6.6, 3.8), u), look: O(-1.5, 4.8, -4.5), fov: 58 }));
  add('feedHall', s(7) - 0.1, (u) => ({ pos: lp3(O(0.9, 6.2, -1.6), O(0.6, 6.1, -2.6), easeInOut(u)), look: O(0, 6.0, -7.4), fov: 42 }));
  add('officer', e.ofTurn - 0.25, (u) => ({ pos: lp3(O(-6.6, 6.8, -6.2), O(-6.2, 6.6, -5.9), u), look: O(-2.2, 4.6, -1.6), fov: 56 }));
  add('feedStreet', s(8) - 0.1, (u) => ({ pos: lp3(O(0.5, 6.1, -2.2), O(0.2, 6.05, -4.3), easeInOut(u)), look: O(0, 6.0, -7.4), fov: 40 }));
  add('feedClose', s(9) - 0.1, (u) => ({ pos: lp3(O(0.1, 6.02, -5.0), O(0.05, 6.0, -5.4), u), look: O(0, 6.0, -7.4), fov: 38 }));
  // night: the locks
  add('lock', s(10) - 0.15, (u) => ({ pos: lp3(E(4.8, 6.8, -2.8), E(4.4, 6.6, -3.2), u), look: E(1.3, 5.6, -5.6), fov: 46 }));
  add('chain', e.chain - 0.25, (u) => ({ pos: lp3(E(-3.6, 6.0, 4.6), E(-3.2, 5.9, 3.8), u), look: E(1.2, 5.0, -4.2), fov: 50 }));
  // 3 AM
  add('ring', s(11) - 0.1, (u) => ({ pos: lp3(B(5.4, 10.2, 3.6), B(5.2, 10.0, 2.8), u), look: B(4.2, 2.8, -7.4), fov: 56 }));
  add('callerID', s(12) - 0.05, (u) => ({ pos: lp3(scrPt(0.5, 0.56, 1.35), scrPt(0.5, 0.56, 1.1), easeOut(u)), look: scrPt(0.5, 0.56), fov: 60 }));
  add('mom', s(13) - 0.05, (u) => ({ pos: lp3(B(-5.6, 9.4, -0.6), B(-5.2, 9.1, -1.4), easeInOut(u)), look: B(-0.6, 3.8, -8.4), fov: 52 }));
  add('answer', s(14) - 0.05, (u) => ({ pos: lp3(NH.clone().add(v3(-1.8, 0.6, 6.0)), NH.clone().add(v3(-1.6, 0.5, 5.2)), u), look: NH.clone().add(v3(-0.2, -0.6, 0)), fov: 46 }));
  add('whisper', s(15) - 0.05, (u) => ({ pos: lp3(NH.clone().add(v3(0.5, 0.15, 4.4)), NH.clone().add(v3(0.4, 0.1, 3.3)), u), look: NH.clone().add(v3(-0.3, -0.15, 0)), fov: 38 }));
  add('knock', en(15) + 0.12, (u) => ({ pos: lp3(B(8.6, 6.3, 0.2), B(8.2, 6.2, -0.3), u), look: NH.clone().add(v3(0.2, -0.5, 0.3)), fov: 50 }));
  add('facade', s(17) - 0.1, (u) => ({ pos: lp3(v3(-4.0, 4.0, -9.0), v3(-4.6, 17.0, -2.5), easeInOut(u)), look: lp3(v3(-5.6, 12.0, 17), v3(-5.6, 18.6, 17), easeInOut(u)), fov: 46 }));
  add('curtain', s(18) - 0.12, (u) => ({ pos: lp3(B(5.6, 6.6, 4.6), B(6.0, 6.5, 4.0), u), look: B(10.8, 5.6, -0.6), fov: 54 }));
  add('nothing', s(19) - 0.12, (u) => ({ pos: lp3(v3(-5.6, 18.6, 16.0), v3(-5.5, 18.5, 15.6), u), look: v3(3.5, 1.2, -11.0), fov: 36 }));
  add('camOpen', s(20) - 0.12, (u) => ({ pos: lp3(NWIN.clone().add(v3(-1.4, 5.8, 1.0)), NWIN.clone().add(v3(-0.9, 5.6, 0.8)), easeInOut(u)), look: scrPt(0.5, 0.48), fov: 46 }));
  add('reveal', e.girl, (u) => { const k = easeOut(clamp(u * 6)); return { pos: lp3(scrPt(0.5, 0.5, 1.35), scrPt(0.5, 0.5, 1.0), k), look: scrPt(0.5, 0.5), fov: 62 }; });
  add('spin', s(22) - 0.05, (u) => ({ pos: lp3(B(4.4, 5.6, -1.0), B(4.8, 5.5, -1.1), u), look: NWIN.clone().add(v3(0.2, 4.4, -0.2)), fov: 50 }));
  add('empty', s(23) - 0.05, (u) => ({ pos: lp3(B(11.0, 7.4, -0.4), B(10.6, 7.6, -0.2), u), look: B(-1.5, 2.6, -4.6), fov: 58 }));
  add('buzz', s(24) - 0.05, (u) => ({ pos: lp3(scrPt(0.5, 0.6, 1.3), scrPt(0.5, 0.62, 1.15), u), look: scrPt(0.5, 0.62), fov: 60 }));
  add('photo', s(25) - 0.05, (u) => ({ pos: lp3(scrPt(0.5, 0.56, 1.25), scrPt(0.5, 0.58, 1.05), u), look: scrPt(0.5, 0.58), fov: 60 }));
  add('girls', s(26) - 0.05, (u) => ({ pos: lp3(scrPt(0.5, 0.605, 0.8), scrPt(0.5, 0.605, 0.7), u), look: scrPt(0.5, 0.605), fov: 60 }));
  add('young', s(27) - 0.05, (u) => ({ pos: lp3(scrPt(0.32, 0.64, 0.5), scrPt(0.32, 0.64, 0.42), u), look: scrPt(0.32, 0.64), fov: 60 }));
  add('faceless', s(28) - 0.05, (u) => ({ pos: lp3(scrPt(0.4, 0.64, 0.5), scrPt(0.7, 0.64, 0.4), easeInOut(u)), look: lp3(scrPt(0.4, 0.64), scrPt(0.7, 0.64), easeInOut(u)), fov: 60 }));
  add('words', s(29) - 0.05, (u) => { const k = easeInOut(clamp(u * 2.2)); return { pos: lp3(scrPt(0.7, 0.64, 0.42), scrPt(0.5, 0.2, 1.45), k), look: lp3(scrPt(0.7, 0.64), scrPt(0.5, 0.2), k), fov: 62 }; });
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } });
  Sx[Sx.length - 1].t1 = () => ctx.dur + 1;
  return Sx;
}
const SETS = { street: 'street', across: 'street', smile: 'street', class: 'class', glance: 'class', window: 'class', hall: 'hall', eyes: 'hall', police: 'office', feedHall: 'office', officer: 'office', feedStreet: 'office', feedClose: 'office',
  lock: 'entry', chain: 'entry', facade: 'streetN', nothing: 'streetN' };
for (const n of ['ring', 'callerID', 'mom', 'answer', 'whisper', 'knock', 'curtain', 'camOpen', 'reveal', 'spin', 'empty', 'buzz', 'photo', 'girls', 'young', 'faceless', 'words']) SETS[n] = 'bed';
const PAL = { street: STREET, streetN: STREETN, class: ROOMD, hall: HALLP, office: OFFICE, entry: APT, bed: BEDN };
const GROUP = { street: 'street', streetN: 'street', class: 'school', hall: 'school', office: 'office', entry: 'entry', bed: 'bed' };

// ---- the street people (used live and in the street feed) ----
function streetPeople(t, feed) {
  const N = W.n, G = W.g, e = EV;
  // Nora walks along the north sidewalk and stops, turning toward the street
  const wk = clamp(t / e.stop); const x = lerp(-14.5, -5.5, easeOut(Math.min(1, wk * 1.05)));
  place(N, v3(x, 0.25, 11.0), lerp(Math.PI / 2, Math.PI + 0.25, easeInOut(smooth(e.turn, e.turn + 0.7, t))));
  pose(N, t < e.stop ? 'walk' : 'idle', t * 0.9); face(N, t > e.turn + 0.3 ? 'nervous' : 'neutral', t, 0.3);
  if (feed === 'nora') {   // the recordings: Nora herself stands where the girl stood, smiling at the walking Nora
    const C = W.nc; place(C, GS, yawTo(GS, N.root.position)); pose(C, 'still', 0); C.neck.rotation.y = 0; girlFace(C); G.root.visible = false;
  } else if (feed !== 'empty') { place(G, GS, yawTo(GS, v3(-5.5, 0, 11))); pose(G, 'still', 0); girlFace(G); }
}

// ---- a frame ----
function renderAt(t) {
  if (!W.ready) { renderPhoto(); snapshots(); W.ready = true; }
  const sh0 = shotAt(W.shots, t), n = sh0.name, e = EV, set = SETS[n], s = (i) => L(i).start, en = (i) => L(i).end;
  applyEnv(ctx, PAL[set]); only(GROUP[set]); hideAll(); W.phone.visible = false;
  const N = W.n; let focus = v3();
  let shadows = false, span = 60;
  // ---- the street ----
  if (set === 'street') {
    streetPeople(t, null); focus = n === 'smile' ? GS.clone() : v3(-2, 0, 0); shadows = true; span = n === 'across' ? 60 : 30;
    W.noraWin.visible = false;
  }
  if (set === 'streetN') {
    W.noraWin.visible = true; focus = v3(0, 0, 0); shadows = true; span = 60;
  }
  // ---- the school ----
  if (set === 'class' || set === 'hall') {
    const X = W.x;
    // classmates at their desks, the teacher writing on the board
    sitOn(X.mia, W.seats[4].clone(), Math.PI, 2.45, t + 1.1); face(X.mia, 'neutral', t, 0.6);
    sitOn(X.noah, W.seats[3].clone(), Math.PI, 2.45, t + 2.3); face(X.noah, 'neutral', t, 0.15); X.noah.neck.rotation.x = 0.18;
    sitOn(X.finn, W.seats[7].clone(), Math.PI, 2.45, t + 0.4); face(X.finn, 'neutral', t, 0.9); X.finn.neck.rotation.y = -0.15;
    const tp = S(-4.5, 0, -10.6); place(X.teach, tp, Math.PI + 0.35); pose(X.teach, 'idle', t); face(X.teach, 'neutral', t, 0.5);
    aimArm(X.teach, 0, S(-3.6 + 0.4 * Math.sin(t * 2.2), 7.0 + 0.25 * Math.sin(t * 3.1), -12.6), 1);
    // Nora at her desk; she looks at the door
    sitOn(N, W.seats[5].clone(), Math.PI, 2.45, t); const gk = smooth(e.glance, e.glance + 0.6, t); N.neck.rotation.y = -0.8 * easeInOut(gk); N.torso.rotation.y = -0.2 * gk;
    face(N, gk > 0.5 ? 'scared' : 'neutral', t, 0.3);
    // the girl in the hallway, at the door's window
    place(W.g, GH, -Math.PI / 2); pose(W.g, 'still', 0); girlFace(W.g); if (n === 'hall') W.g.neck.rotation.y = 1.1 * easeInOut(smooth(s(4) + 0.1, s(4) + 0.9, t));
    focus = n === 'hall' || n === 'eyes' ? GH.clone() : S(4, 0, 2);
  }
  // ---- the security office ----
  if (set === 'office') {
    W.feedM.uniforms.t.value = t;   // the feed first: it borrows Nora and the street
    if (['feedHall', 'feedStreet', 'feedClose', 'police', 'officer'].includes(n)) renderFeed(n, t);
    const X = W.x, c1 = X.cop1, c2 = X.cop2;
    const tk = smooth(e.ofTurn, e.ofTurn + 0.6, t);
    sitOn(c1, W.ofChairSeat.clone(), lerp(Math.PI, Math.PI - 2.6, easeInOut(tk)) , W.ofChairSeat.y, t); face(c1, tk > 0.5 ? 'skeptic' : 'focused', t, 0.4);
    if (tk < 0.5) aimArm(c1, 0, O(-0.2, 4.0, -5.4), 0.8);
    place(c2, O(3.6, 0, -1.6), yawTo(O(3.6, 0, -1.6), O(0, 0, -7)) + tk * 1.9); pose(c2, 'idle', t + 0.7); face(c2, tk > 0.5 ? 'suspicious' : 'neutral', t, 0.7);
    const np = O(-3.8, 0, -1.4); place(N, np, yawTo(np, O(0, 0, -7.4)) + (n === 'officer' ? 0.35 : 0)); pose(N, n === 'police' ? 'point' : 'idle', t);
    if (n === 'police') { N.neck.rotation.x = -0.15; }
    face(N, n === 'feedClose' || n === 'feedStreet' ? 'scared' : 'nervous', t, 0.3);
    // the live feed on the main monitor
    W.feedM.uniforms.t.value = t; W.monM.forEach((m) => { m.uniforms.t.value = t + 3; });
    focus = O(0, 0, -3);
  }
  // ---- the apartment entry ----
  if (set === 'entry') {
    const np = E(1.0, 0, -4.5); place(N, np, Math.PI); pose(N, 'idle', t);
    const bk = smooth(e.bolt, e.bolt + 0.45, t), ck = smooth(e.chain, e.chain + 0.7, t);
    W.thumb.rotation.z = -Math.PI / 2 * easeInOut(bk);
    if (t < e.chain - 0.15) { aimArm(N, 0, E(1.55, 5.45, -5.7), smooth(e.bolt - 0.4, e.bolt, t) * (1 - smooth(e.bolt + 0.75, e.bolt + 1.0, t))); }
    // the chain: from the frame (x -2.0) to the knob, which slides from hanging to the track's end
    const knob = lp3(E(-1.55, 5.2, -5.82), E(2.65, 6.6, -5.84), easeInOut(ck));
    if (t > e.chain - 0.3 && t < e.chain + 1.0) aimArm(N, 1, knob.clone().add(v3(0, -0.05, 0.25)), smooth(e.chain - 0.3, e.chain, t) * (1 - smooth(e.chain + 0.75, e.chain + 1.0, t)));
    const anc = E(-1.95, 6.6, -5.84); W.chainKnob.position.copy(knob).sub(AE);
    W.chainLinks.forEach((m, i) => { const u = (i + 0.5) / 9, p = lp3(anc, knob, u); p.y -= Math.sin(u * Math.PI) * 0.9 * (1 - easeInOut(ck)) * 0.9 + 0.02; m.position.copy(p).sub(AE); m.rotation.set(0, i % 2 ? Math.PI / 2 : 0, 0); });
    const lk = smooth(e.look, e.look + 0.6, t); N.neck.rotation.y = 1.1 * easeInOut(lk); N.torso.rotation.y = 0.25 * lk;
    face(N, lk > 0.4 ? 'nervous' : 'neutral', t, 0.3);
    focus = np.clone();
  }
  // ---- the bedroom ----
  if (set === 'bed') {
    const X = W.x, mom = X.mom, gone = ['empty', 'buzz', 'photo', 'girls', 'young', 'faceless', 'words'].includes(n);
    W.duvetMom.visible = !gone; W.duvetFlat.visible = gone;
    if (!gone) { lie(mom, BX - 2.6, BZ - 6.3); face(mom, 'neutral', t, 0, {}); mom.setFace(mom.faceStyle('neutral'), { blink: true }); }
    const lying = n === 'ring';
    W.duvetNora.visible = lying; W.duvetLap.visible = !lying && ['callerID', 'mom', 'answer', 'whisper', 'knock'].includes(n);
    W.winK = 6; W.keyK = 60;
    let scr = { key: 'off', mode: 'off' }, camK = 0, scrK = 0;
    // the curtain: the right-hand panel slides back as she pulls
    const pk = easeInOut(smooth(e.pull, e.pullEnd, t)); const opened = ['nothing', 'camOpen', 'reveal', 'spin', 'empty', 'buzz', 'photo', 'girls', 'young', 'faceless', 'words'].includes(n) || (n === 'curtain' && false);
    const curK = n === 'curtain' ? pk : opened ? 1 : 0; W.curR.scale.x = -lerp(1, 0.32, curK); W.curR.position.z = -1.4 - 0.15 + 0.0;
    const kn = (k) => Math.max(0, 1 - Math.abs(t - k) / 0.09);
    const knockK = n === 'knock' ? Math.max(kn(e.knock1), kn(e.knock2), kn(e.knock3), kn(e.knock4), kn(e.knock5)) : 0;
    W.curL.position.x = 11.55 - 0.08 * knockK; W.curR.position.x = 11.55 - 0.08 * knockK;
    if (lying) {
      lie(N, BX + 2.6, BZ - 6.3); N.setFace('lash:neutral', { blink: true }); unlie(mom);
      W.phone.visible = true; W.phone.position.copy(B(-8.4 + 0.0, 3.47, -8.0)).add(v3(16.4, 0, 0)); W.phone.rotation.set(-Math.PI / 2, 0, 0.3);
      const rg = t > e.ring; scr = rg ? { key: 'call', mode: 'call' } : { key: 'off', mode: 'off' }; scrK = rg ? 0.9 : 0;
      if (rg) { const bz = Math.sin(t * 70) * 0.03 * (Math.sin(t * 6) > 0 ? 1 : 0); W.phone.position.x += bz; }
      focus = B(2, 0, -4);
      if (rg) { W.phoneLight.position.copy(W.phone.position).add(v3(0, 0.6, 0)); W.phoneLight.intensity = 6; }
    } else if (['callerID', 'mom', 'answer', 'whisper', 'knock'].includes(n)) {
      // sitting up in bed, the phone in her right hand
      const sp = B(BX + 2.6, 0, BZ - 2.6); sitOn(N, sp, 0, W.bedTop, t); W.duvetLap.position.set(BX + 2.6, W.bedTop + 0.85, sp.z - AB.z + 3.0);
      N.torso.rotation.x = 0.1;
      const head = N.neck.getWorldPosition(v3()).add(v3(0, 1.0, 0.2));
      const near = n === 'whisper' || (n === 'answer' && t > e.raise + 0.2);
      const hand = near ? head.clone().add(v3(-1.0, -1.15, 0.55)) : head.clone().add(v3(-0.35, -2.0, 1.7));
      holdPhone(N, hand, near ? head.clone().add(v3(0.2, 0, 0.6)) : head);
      if (n === 'knock') { const jk = smooth(e.knock1, e.knock1 + 0.15, t); N.neck.rotation.y = 1.0 * easeOut(jk); N.torso.rotation.y = 0.25 * jk; }
      const call = n === 'callerID' || n === 'mom' || (n === 'answer' && t < e.tap);
      scr = call ? { key: 'call', mode: 'call' } : { key: 'incall' + Math.floor(Math.max(1, t - e.tap)), mode: 'incall', sec: Math.min(9, Math.floor(Math.max(1, t - e.tap + 1))) }; scrK = n === 'knock' ? 0.55 : 0.9;
      const fx = n === 'knock' ? (t > e.knock1 ? 'terrified' : 'scared') : n === 'whisper' ? (t > s(15) + 1.4 ? 'terrified' : 'scared') : n === 'mom' ? 'nervous' : n === 'answer' ? 'nervous' : 'surprised';
      face(N, fx, t, 0.3, { gaze: n === 'mom' && t > s(13) + 0.6 ? 'left' : undefined });
      if (n === 'mom') N.neck.rotation.y = -0.75 * smooth(s(13) + 0.3, s(13) + 0.9, t);
      W.phoneLight.position.copy(scrPt(0.5, 0.5, 0.8)); W.phoneLight.intensity = 5 * scrK;
      focus = sp.clone();
    } else if (n === 'curtain') {
      place(N, NCUR, Math.PI / 2); pose(N, 'idle', t);
      const edge = B(11.45, 6.0, lerp(-1.6, 1.0, pk)); aimArm(N, 1, edge, smooth(e.pull - 0.5, e.pull, t));
      face(N, 'scared', t, 0.3); N.neck.rotation.x = 0.05;
      focus = NWIN.clone();
    } else if (['camOpen', 'reveal', 'spin', 'empty', 'buzz', 'photo', 'girls', 'young', 'faceless', 'words'].includes(n)) {
      // at the window, the phone held up in front of her
      const sk = n === 'spin' ? easeInOut(smooth(e.spin, e.spin + 0.42, t)) : n === 'empty' ? 1 : 0;
      const yaw = Math.PI / 2 + Math.PI * sk * (n === 'spin' || n === 'empty' ? 1 : 0);
      const after = ['buzz', 'photo', 'girls', 'young', 'faceless', 'words'].includes(n);
      place(N, NWIN, after ? -Math.PI / 2 + 0.0 : yaw); pose(N, 'idle', t);
      const head = N.neck.getWorldPosition(v3()).add(v3(0, 1.0, 0)), fwd = v3(Math.sin(N.root.rotation.y), 0, Math.cos(N.root.rotation.y));
      const hand = head.clone().add(fwd.clone().multiplyScalar(2.1)).add(v3(0, -1.05, 0));
      if (n !== 'spin' && n !== 'empty') holdPhone(N, hand, head.clone().add(v3(0, 0.1, 0)));
      else { aimArm(N, 0, hand, 0.6); }
      if (n === 'camOpen' || n === 'reveal') { scr = { key: 'camera', mode: 'camera' }; camK = smooth(e.camOn, e.camOn + 0.25, t); scrK = 1.0; renderSelfie(t, t >= e.girl); }
      if (after) { const st = n === 'buzz' ? (t < e.buzz + 0.35 ? 'msgbare' : 'notify') : 'msg'; const pk2 = clamp((t - e.photo) / 0.35);
        scr = st === 'notify' ? { key: 'notify', mode: 'notify' } : st === 'msgbare' ? { key: 'msgbare', mode: 'msg', k: 0 } : { key: 'msg' + (t >= e.words ? 'w' : '') + Math.round(pk2 * 10), mode: 'msg', k: n === 'photo' ? easeOut(pk2) : 1, words: t >= e.words };
        scrK = 1.0; if (n === 'buzz' && t > e.buzz && t < e.buzz + 0.6) W.phone.position.x += Math.sin(t * 80) * 0.025; }
      const fx = n === 'reveal' ? (t > e.girl + 0.15 ? 'terrified' : 'scared') : n === 'spin' || n === 'empty' ? 'terrified' : after ? 'scared' : 'nervous';
      face(N, fx, t, 0.3);
      W.phoneLight.position.copy(W.phone.visible ? scrPt(0.5, 0.5, 0.9) : head); W.phoneLight.intensity = (W.phone.visible ? 5 : 0) * scrK;
      W.winK = 9; focus = NWIN.clone();
    }
    drawUI(scr); W.screenM.uniforms.camK.value = camK; W.screenM.uniforms.k.value = scr.mode === 'off' ? 0.02 : 0.95 * Math.max(0.3, scrK); W.screenM.uniforms.t.value = t;
    if (n === 'reveal') W.screenM.uniforms.zoom.value = 0.12 * easeOut(clamp((t - e.girl) / 0.25));
    else W.screenM.uniforms.zoom.value = 0;
  }
  lightSet(set === 'streetN' ? 'streetN' : set, t, focus);
  if (set === 'bed' && W.phone.visible) { W.phoneLight.position.copy(scrPt(0.5, 0.5, 0.9)); }
  W.air.update(t); W.air.list.dust.position.copy(set === 'class' || set === 'hall' ? SC : set === 'office' ? SO : set === 'entry' ? AE : AB); W.air.list.dust.visible = !set.startsWith('street');
  // the scare: a hard jolt on the reveal and the knock
  const jolt = n === 'reveal' ? Math.max(0, 1 - (t - e.girl) / 0.3) : n === 'knock' ? Math.max(0, 1 - Math.abs(t - e.knock1) / 0.12) * 0.6 : 0;
  ctx.scene.updateMatrixWorld(true); W.headN = W.n.neck.getWorldPosition(v3()).add(v3(0, 0.6, 0));
  const sh = shotAt(W.shots, t);
  const dc = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgcam');   // close checks: ?dbgcam=x,y,z,lx,ly,lz,fov
  const dq = dc ? dc.split(',').map(Number) : null, shx = dq ? { ...sh, pos: v3(dq[0], dq[1], dq[2]), look: v3(dq[3], dq[4], dq[5]), fov: dq[6] || 40 } : sh;
  frame(ctx, t, shx, { steady: !['whisper', 'camOpen', 'reveal', 'spin'].includes(n) || !!dq, shake: dq ? 0 : jolt * 1.4, shadowSpan: span, shadows });
  return n;
}

// the feed on the main monitor: the hallway with nobody at the door, then the street where Nora stands smiling at herself
function renderFeed(n, t) {
  const e = EV, s = (i) => L(i).start, cam = W.feedCam, sav = { pos: null };
  void sav;
  const street = n === 'feedStreet' || n === 'feedClose' || (n === 'officer' && t > s(8) - 0.5);
  if (street) {
    only('street', 'office'); applyEnv(ctx, STREET); lightSet('street');
    const ft = clamp((t - s(8) + 0.2) * 0.55, 0, 1.7);   // the recording replays the walk
    streetPeople(ft, 'nora');
    if (n === 'feedClose') { W.nc.root.rotation.y = yawTo(GS, W.n.root.position); cam.fov = 13; cam.position.set(13.6, 11.6, 16.3); cam.lookAt(GS.clone().add(v3(0, 4.6, 0))); }
    else { cam.fov = 30; cam.position.set(13.2, 11.8, 16.0); cam.lookAt(GS.clone().add(v3(-1.2, 2.4, 0))); }
    W.feedM.osd(['CAM 02  ELM ST', 'NOV 07', `REC  16:42:${String(10 + Math.floor(ft * 4)).padStart(2, '0')}`]);
    if (n === 'feedClose') W.feedM.uniforms.crop.value.set(0.0, 0.0, 1, 1);
  } else {
    only('school', 'office'); applyEnv(ctx, HALLP); lightSet('hall', 0, GH);
    cam.fov = 52; cam.position.copy(S(27.8, 10.6, 24)); cam.lookAt(S(18.5, 2.6, 6.5)); W.feedM.osd(['CAM 01  HALL B', 'NOV 07', `REC  08:14:${String(22 + Math.floor((t - s(7)) * 1)).padStart(2, '0')}`]);
    W.feedM.uniforms.crop.value.set(0, 0, 1, 1);
  }
  W.feedM.uniforms.k.value = street ? 1 : 0.72;
  cam.aspect = 16 / 9; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  const sc = ctx.sun.castShadow, cg = W.streetCam.g || W.streetCam; ctx.sun.castShadow = street; cg.visible = false; renderRT(W.feedRT, cam); cg.visible = true; ctx.sun.castShadow = sc;
  // back to the office
  hideAll(); applyEnv(ctx, OFFICE); only('office');
  const X = W.x; for (const c of [X.cop1, X.cop2, W.n]) c.root.visible = true;
}
// the selfie camera: the phone's own view of her face and the room behind her; the girl is only here
function renderSelfie(t, girl) {
  const c = W.selfCam, N = W.n; W.phone.updateMatrixWorld(true);
  c.position.copy(scrPt(0.5, 0.88, 0.05)); const hd = N.neck.getWorldPosition(v3()).add(v3(0, 0.7, 0)); c.lookAt(hd.lerp(GBEHIND.clone().add(v3(0, 4.9, 0)), 0.42));
  c.fov = 82; c.aspect = 0.5; c.updateProjectionMatrix(); c.updateMatrixWorld(true);
  W.phone.visible = false; const G = W.g, gv = G.root.visible;
  if (girl) { place(G, GBEHIND, yawTo(GBEHIND, c.position)); pose(G, 'still', 0); girlFace(G); G.neck.rotation.z = 0.06; }
  const pl = W.phoneLight.intensity;
  lightSet('bed', t, NWIN); W.phoneLight.intensity = 1.6; W.phoneLight.position.copy(c.position).add(v3(0, 0.6, 0));
  renderRT(W.selfRT, c);
  G.root.visible = gv && !girl ? gv : false; W.phone.visible = true; W.phoneLight.intensity = pl;
}

export async function setup() {
  ctx = await initStage('ep35', { look: 'pro', avatars: ['farm_ep35_nora', 'farm_ep35_girl', ...Object.values(CAST)] }); L = ctx.L; EV = events();
  const FX = ['neutral', 'surprised', 'shocked', 'scared', 'terrified', 'nervous', 'sad', 'smile', 'happy', 'focused', 'skeptic', 'suspicious'];
  await loadAlti([...FX, ...FX.map((x) => 'lash:' + x)]);
  const { scene, camera } = ctx; camera.far = 3000; camera.near = 0.1; camera.updateProjectionMatrix();
  rig(); street(); school(); office(); apartment(); yard(); people(); phone();
  const list = { dust: dust(scene, { size: 30, height: 12, centre: v3(0, 6, 0), count: 300, color: '#f2ead8', amount: 0.14, pointSize: 0.34 }) };
  W.air = atmos(...Object.values(list)); W.air.list = list;
  W.shots = shots();
  window.__ep35 = { W, THREE, ctx };
  void noise1; void plant; void surf;
  return expose(ctx, renderAt, L(21).start + 0.6, EV);
}
