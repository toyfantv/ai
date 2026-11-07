// Episode 28: The Photograph That Kept Changing (Liminal Horror 2/5). Photographs come under Charlotte's bedroom door: a mansion with a
// girl in the upstairs window who looks exactly like her, closer each day, then the window open and the girl gone. An invitation's address
// matches the mansion. Inside: a silent house, a waltz from an empty ballroom, a banquet of twelve untouched plates, a staircase of portraits
// with the faces scratched out, and at the top a photograph of Charlotte in this ballroom among twelve guests. Chairs scrape back one by
// one; a whisper behind her; the photograph now holds thirteen, and none of them have faces.
// Sets share the world: the ballroom at the origin (x -30..30, z -44..22, the stair up the left wall, a gallery across the back at y 13),
// Charlotte's bedroom at BR, the mansion outside at EXT, a portrait studio at PS (only for the guest portraits).
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, NIGHT, DAY } from '../engine/stage.js';
import { Batch, surf, paint } from '../engine/kit.js';
import { dust, atmos } from '../engine/atmos.js';
import { canvasTex } from '../engine/props.js';
import { bed as homeBed } from '../engine/home.js';
import { wallpaper } from '../engine/pastel.js';
import { damask, parquet, plaster, wainscot, ornateFrame, printMat, scratchTex, loosePrint, invitation, chandelier, sconce, bigChair, banquetTable,
  placeSetting, candelabrum, gramophone, grandClock, curtainWindow, panelDoor, bareTrees, ironFence, mansion, guest, GOLD, DARKWOOD } from '../engine/mansion.js';

let ctx, L, EV;
const W = {};
const BR = v3(2000, 0, 0), EXT = v3(-3000, 0, 0), PS = v3(0, 0, -6000);
const CSKIN = '#f2d4b8';
const HALL_H = 26, GAL = 13, GZ = -35, SX0 = -29.6, SX1 = -23.4, SZ0 = 8, SZ1 = GZ;   // gallery height, its front edge; the stair's x and z span
const stairY = (z) => clamp((SZ0 - z) / (SZ0 - SZ1)) * GAL;
const TX = 8, TZ = -10, TLEN = 32;                    // the banquet table
const FINAL = v3(-26.5, GAL + 6.6, -43.6);            // the final photograph on the gallery's back wall
const LAND = v3(-26.5, GAL, -38.6);                    // where Charlotte stands before it
const DESK = v3(-3, 4.0, -9.4);                        // bedroom desk top centre (local)
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const B = (x, y, z) => BR.clone().add(v3(x, y, z)), X = (x, y, z) => EXT.clone().add(v3(x, y, z));
const PHX = [-5.0, -2.3, 0.4];                         // the three photos on the desk, left to right (local x)

// ---- palettes ----
const BEDN = { ...NIGHT, ...P({ top: '#0a1024', horizon: '#141c34', haze: '#141a2a', sunColor: '#9fb2d8', hemiSky: '#7a86b8', hemiGround: '#2a2430' }),
  sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 0.55, amb: 0.12, envI: 0.3, exposure: 1.08, bloom: 0.05, fogNear: 200, fogFar: 600, saturation: 1.0, contrast: 1.06, bounce: 0.14, win: 0, lamp: 0 };
const BEDM = { ...BEDN, ...P({ haze: '#bfc9d6', hemiSky: '#e8eef8', hemiGround: '#a89a8c' }), hemiI: 1.05, amb: 0.25, envI: 0.6, exposure: 1.0, bounce: 0.22, saturation: 1.02 };
const BEDE = { ...BEDN, ...P({ haze: '#3a2a2a', hemiSky: '#e0a88a', hemiGround: '#4a3030' }), hemiI: 0.7, amb: 0.14, envI: 0.4, exposure: 1.05, bounce: 0.18 };
const OUTN = { ...NIGHT, ...P({ top: '#03060f', horizon: '#121a2c', haze: '#0e1420', sunColor: '#a8bcdc', hemiSky: '#5c6e90', hemiGround: '#141812' }),
  sunI: 0.55, sunDir: v3(-0.5, 0.7, 0.55), sunDisc: 0, stars: 0.8, moon: 1, hemiI: 0.62, amb: 0.1, envI: 0.25, exposure: 1.15, bloom: 0.06, fogNear: 90, fogFar: 520, saturation: 1.0, contrast: 1.08, bounce: 0.06, win: 0, lamp: 0 };
const HALLP = { ...NIGHT, ...P({ top: '#1a1612', horizon: '#1a1612', haze: '#16120e', sunColor: '#9fb6d8', hemiSky: '#c9b496', hemiGround: '#3a2c22' }),
  sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 0.62, amb: 0.14, envI: 0.35, exposure: 1.08, bloom: 0.05, fogNear: 60, fogFar: 260, saturation: 0.96, contrast: 1.08, bounce: 0.16, win: 0, lamp: 0 };
const PRINTD = { ...DAY, ...P({ top: '#9aa6b0', horizon: '#d6d8d6', haze: '#cfd2cf', sunColor: '#f2eee4', hemiSky: '#e6eaee', hemiGround: '#6a6658' }),
  sunI: 1.15, sunDir: v3(0.45, 0.75, 0.6), sunDisc: 0, stars: 0, moon: 0, hemiI: 0.62, amb: 0.1, envI: 0.4, exposure: 0.9, bloom: 0, fogNear: 200, fogFar: 900, win: 0, lamp: 0 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return { slide: 0.35, turn: s(0) + 1.7, morning: s(4), invite: s(8), gate: s(10) - 0.2, enter: s(11) - 0.1, climb: s(16) - 0.2, look1: s(17), turnAround: s(19),
    scrape: s(21) + 0.25, out: s(24) + 0.35, lookBack: s(25) + 0.2, swap: s(26) - 0.15, end: ctx.dur };
}

// ---- Charlotte's bedroom ----
function bedroom() {
  const g = new THREE.Group(); g.position.copy(BR); ctx.scene.add(g); W.bed = g;
  const b = new Batch(), wp = wallpaper('#cfc3dc', '#bba9d0', { flower: '#e8e0f2' }), floor = surf('plank', '#7d5d44', { roughness: 0.45 }), ceil = plaster('#e6e1ea'), trim = paint('#f2eef4', { roughness: 0.5 });
  b.box(floor, 22.4, 0.4, 22.4, 0, -0.2, 0, { r: 0.02 }); b.box(ceil, 22.4, 0.3, 22.4, 0, 11.15, 0, { r: 0.02 });
  b.box(wp, 22, 11, 0.4, 0, 5.5, 11.2, { r: 0.01 }); b.box(wp, 0.4, 11, 22, -11.2, 5.5, 0, { r: 0.01 });
  // back wall (z -11) with the window hole x -6..0, y 4.6..9.4
  const bw = (x, y, w, h) => b.box(wp, w, h, 0.4, x, y, -11.2, { r: 0.01 });
  bw(-8.5, 5.5, 5, 11); bw(5.5, 5.5, 11, 11); bw(-3, 2.3, 6, 4.6); bw(-3, 10.2, 6, 1.6);
  // right wall (x 11) with the door hole z 1.0..5.6, height 8.9
  const rw = (z, y, d, h) => b.box(wp, 0.4, h, d, 11.2, y, z, { r: 0.01 });
  rw(-5, 5.5, 12, 11); rw(8.3, 5.5, 5.4, 11); rw(3.3, 9.95, 4.6, 2.1);
  for (const [x, z, w, d] of [[0, 10.95, 22, 0.2], [-10.95, 0, 0.2, 22], [5.5, -10.95, 11, 0.2], [-8.5, -10.95, 5, 0.2]]) b.box(trim, w, 0.7, d, x, 0.35, z, { r: 0.04 });
  b.box(trim, 0.3, 0.7, 6, 10.95, 0.35, -5, { r: 0.04 }); b.box(trim, 0.3, 0.7, 5.4, 10.95, 0.35, 8.3, { r: 0.04 });
  for (const s of [-1, 1]) b.box(trim, 0.5, 9.2, 0.5, 10.9, 4.6, 3.3 + s * 2.55, { r: 0.05 }); b.box(trim, 0.5, 0.5, 5.6, 10.9, 9.1, 3.3, { r: 0.05 });
  // window frame, sill, mullion
  b.box(trim, 6.6, 0.5, 0.9, -3, 4.4, -10.8, { r: 0.05 }); b.box(trim, 6.6, 0.4, 0.6, -3, 9.6, -10.9, { r: 0.05 }); for (const x of [-6.2, 0.2]) b.box(trim, 0.4, 5.2, 0.6, x, 7, -10.9, { r: 0.05 }); b.box(trim, 0.18, 4.8, 0.3, -3, 7, -11.1, { r: 0.03 });
  b.box(trim, 6, 0.18, 0.3, -3, 7, -11.1, { r: 0.03 });
  // the desk under the window, a lamp, books, a pencil cup, a chair
  const wood = surf('plank', '#d9cbb8', { roughness: 0.5 }), leg = paint('#e6e0d8', { roughness: 0.5 });
  b.box(wood, 7.4, 0.3, 3.3, -3, 3.85, -9.35, { r: 0.06 }); for (const x of [-6.4, 0.4]) for (const z of [-10.7, -8.0]) b.box(leg, 0.3, 3.7, 0.3, x, 1.85, z, { r: 0.05 });
  b.box(wood, 2.2, 1.2, 3.0, -5.4, 3.0, -9.35, { r: 0.05 });
  b.box(paint('#6d4f8f'), 0.5, 1.4, 1.0, 1.6, 4.7, -10.4, { r: 0.04 }); b.box(paint('#3f6b7a'), 0.4, 1.2, 1.0, 2.1, 4.6, -10.4, { r: 0.04 }); b.box(paint('#c9a24a'), 0.45, 1.3, 1.0, 2.55, 4.65, -10.4, { r: 0.04 });
  b.cyl(paint('#e8d8ef'), 0.35, 0.3, 0.9, 1.4, 4.45, -9.6, { seg: 14 }); for (let i = 0; i < 3; i++) b.box(paint(['#e2b33a', '#3a7ad9', '#d94a6a'][i]), 0.08, 1.2, 0.08, 1.3 + i * 0.12, 5.0, -9.6, { rz: (i - 1) * 0.15 });
  b.cyl(paint('#3a3440', { metalness: 0.4 }), 0.55, 0.6, 0.15, -1.0 + 0.0, 4.07, -10.5 + 0.0, { seg: 20 }); b.box(paint('#3a3440', { metalness: 0.4 }), 0.12, 2.2, 0.12, -1.0, 5.1, -10.5, { r: 0.04, rz: 0.15 });
  const shade = new THREE.ConeGeometry(0.9, 0.9, 20, 1, true); shade.rotateZ(0.35); b.add(paint('#e9dff0', { side: THREE.DoubleSide, roughness: 0.8 }), shade, -1.55, 6.15, -10.2);
  // desk chair, pushed aside
  const ch = paint('#9b86b6', { roughness: 0.8 }); b.box(ch, 2.6, 0.4, 2.6, 4.6, 2.4, -6.6, { r: 0.12, ry: 0.5 }); b.box(ch, 2.6, 2.8, 0.4, 5.2, 3.9, -7.7, { r: 0.12, ry: 0.5 }); b.cyl(paint('#2a2a30', { metalness: 0.6 }), 0.15, 0.15, 2.2, 4.6, 1.1, -6.6); b.cyl(paint('#2a2a30'), 1.3, 1.3, 0.2, 4.6, 0.12, -6.6, { seg: 5 });
  // shelf with a plush and books, a round rug, a mirror frame
  b.box(trim, 6, 0.3, 1.4, -6.4, 7.6, 10.4, { r: 0.05 }); b.box(paint('#f4b6c8'), 1.2, 1.2, 1.0, -7.8, 8.35, 10.4, { r: 0.4 }); for (let i = 0; i < 6; i++) b.box(paint(['#7a5aa0', '#e3a54a', '#4a8a9a', '#c45a6a', '#5a6aa8', '#8aa85a'][i]), 0.4, 1.3, 1.0, -5.6 + i * 0.5, 8.4, 10.4, { r: 0.03 });
  b.cyl(paint('#b9a8d4', { roughness: 0.95 }), 4.6, 4.6, 0.06, 2.4, 0.03, 1.4, { seg: 40 }); b.cyl(paint('#e8e0f2', { roughness: 0.95 }), 3.4, 3.4, 0.08, 2.4, 0.04, 1.4, { seg: 40 });
  b.done(g);
  // posters (original shapes: a crescent moon, a mountain sunset)
  const poster = (draw, x, y, z, ry, w, h) => { const t = canvasTex(320, 440, draw); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); };
  poster((x, w, h) => { x.fillStyle = '#20204a'; x.fillRect(0, 0, w, h); x.fillStyle = '#f2e6b0'; x.beginPath(); x.arc(160, 170, 90, 0, 7); x.fill(); x.fillStyle = '#20204a'; x.beginPath(); x.arc(200, 140, 80, 0, 7); x.fill(); const r = rng(3); for (let i = 0; i < 40; i++) { x.fillStyle = '#fff'; x.fillRect(r() * w, r() * h * 0.8, 2, 2); } x.fillStyle = '#c8b8ef'; x.font = '700 34px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('GOODNIGHT', 160, 380); }, -10.98, 6.6, -4.5, Math.PI / 2, 3.2, 4.4);
  poster((x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f4a07a'); gr.addColorStop(0.6, '#f6d48a'); gr.addColorStop(1, '#6a4a8a'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = '#4a3a6a'; x.beginPath(); x.moveTo(0, 360); x.lineTo(110, 230); x.lineTo(190, 310); x.lineTo(260, 220); x.lineTo(320, 300); x.lineTo(320, 440); x.lineTo(0, 440); x.fill(); }, 6.0, 6.8, -10.98, 0, 3.0, 4.1);
  // bed along the left wall (head toward the back wall)
  const bd = homeBed({ cover: '#7b62a8' }); bd.position.set(-6.4, 0, 3.4); g.add(bd);
  // fairy lights over the bed
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(1.1) }), 26), M = new THREE.Matrix4();
  for (let i = 0; i < 26; i++) { const z = -4 + i * 0.6; fl.setMatrixAt(i, M.makeTranslation(-10.9, 9.2 - 0.5 * Math.sin((i / 25) * Math.PI * 3) ** 2, z)); } fl.userData.noAO = true; g.add(fl);
  // the door: hinge at z 1.0, leaf toward z 5.4, a 0.3 gap under it; a warm hall beyond, light spilling through the gap
  const dr = panelDoor({ w: 4.4, h: 8.55, color: '#efe8f2', trim: '#ddd4e4' }); dr.position.set(11.1, 0.32, 1.0); dr.rotation.y = -Math.PI / 2; g.add(dr); W.door = dr;
  const hall = new Batch(); hall.box(surf('plank', '#6a4a34'), 6, 0.4, 8, 14.2, -0.2, 3.3, { r: 0.02 }); hall.box(paint('#c8b098'), 0.3, 11, 8, 17.2, 5.5, 3.3); hall.done(g);
  const spill = canvasTex(256, 64, (x, w, h) => { const gr = x.createLinearGradient(w, 0, 0, 0); gr.addColorStop(0, 'rgba(255,206,140,0.9)'); gr.addColorStop(1, 'rgba(255,206,140,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.5), new THREE.MeshBasicMaterial({ map: spill, transparent: true, depthWrite: false, opacity: 0.55 })); sp.rotation.x = -Math.PI / 2; sp.position.set(9.85, 0.015, 3.25); sp.userData.noAO = true; g.add(sp); W.spill = sp;
  // the sky beyond the window (its colour is the time of day)
  W.skyM = new THREE.MeshBasicMaterial({ color: '#0d1630' }); const sky = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), W.skyM); sky.position.set(-3, 7, -13); g.add(sky);
  W.moon = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: '#e6ecf6' })); W.moon.position.set(-1.4, 8.4, -12.9); g.add(W.moon);
  // the desk lamp's bulb
  W.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffd9a0' })); W.bulb.position.set(-1.62, 5.85, -10.2); g.add(W.bulb);
}

// ---- outside ----
function outside() {
  const g = new THREE.Group(); g.position.copy(EXT); ctx.scene.add(g); W.ext = g;
  const b = new Batch(), gr = surf('grass', '#2a3424', { roughness: 0.98 }), gravel = surf('sand', '#77736a', { roughness: 0.95 });
  b.box(gr, 1200, 1, 1200, 0, -0.5, 0, { r: 0.02 }); b.box(gravel, 12, 0.2, 52, 0, 0.1, 30, { r: 0.02 }); b.box(gravel, 120, 0.2, 10, 0, 0.1, 54, { r: 0.02 });
  ironFence(b, -64, -6, 48); ironFence(b, 6, 64, 48);
  b.box(surf('stucco', '#7d786e'), 2.4, 10, 2.4, -6, 5, 48, { r: 0.1 }); b.box(surf('stucco', '#7d786e'), 2.4, 10, 2.4, 6, 5, 48, { r: 0.1 });
  for (const s of [-1, 1]) { b.box(paint('#16171a', { metalness: 0.6 }), 0.5, 2.0, 0.5, s * 6, 11, 48, { r: 0.1 }); b.box(paint('#c9a46a', { emissive: '#ffb860', emissiveIntensity: 0.6 }), 0.9, 1.2, 0.9, s * 6, 12.4, 48, { r: 0.1 }); }
  // the gate leaves, swung open inward
  const iron = paint('#16171a', { metalness: 0.6, roughness: 0.45 });
  for (const s of [-1, 1]) { const th = 1.15, dx = -s * Math.cos(th), dz = -Math.sin(th); for (let k = 0; k <= 6; k++) { const d = 0.3 + k * 0.75; b.box(iron, 0.12, 7.4, 0.12, s * 4.9 + dx * d, 3.9, 48 + dz * d, { r: 0.03 }); b.add(iron, new THREE.ConeGeometry(0.16, 0.5, 4), s * 4.9 + dx * d, 7.8, 48 + dz * d); }
    for (const y of [1.0, 6.4]) b.box(iron, 5.0, 0.2, 0.2, s * 4.9 + dx * 2.55, y, 48 + dz * 2.55, { r: 0.05, ry: Math.atan2(-dz, dx) }); }
  // hedges along the path, urns
  for (const s of [-1, 1]) { b.box(paint('#1f2a1c', { roughness: 0.95 }), 2.2, 2.6, 30, s * 8.5, 1.3, 26, { r: 0.8 }); b.cyl(surf('stucco', '#8a857a'), 1.0, 0.6, 2.2, s * 8.5, 3.6, 12, { seg: 16 }); }
  b.done(g);
  W.house = mansion({ wall: '#7f796c', trim: '#cfc6b2', roof: '#25272c' }); g.add(W.house);
  bareTrees(g, [{ x: -44, z: 24, h: 12 }, { x: -58, z: 8, h: 14 }, { x: 46, z: 30, h: 11 }, { x: 60, z: 6, h: 13 }, { x: -36, z: 70, h: 10 }, { x: 40, z: 72, h: 12 }, { x: -80, z: 40, h: 13 }, { x: 84, z: 46, h: 12 }], { seed: 6 });
  // a black tree line far behind
  const tb = new Batch(), r = rng(12), tree = paint('#05070a', { roughness: 1 }); for (let i = 0; i < 60; i++) { const x = -360 + i * 12 + r() * 6, h = 30 + r() * 30; tb.cyl(tree, 0.1, 7 + r() * 5, h, x, h / 2, -120 - r() * 50, { seg: 7 }); } tb.done(g);
}

// ---- the ballroom ----
function ballroom() {
  const g = new THREE.Group(); ctx.scene.add(g); W.in = g;
  const b = new Batch(), wp = damask('#717866', '#5f6656', { seed: 5 }), fl = parquet('#6e4a32'), ceil = plaster('#cfc7b4'), gold = GOLD(), wood = DARKWOOD(), trim = paint('#d6cdb8', { roughness: 0.55 });
  const X0 = -30, X1 = 30, Z0 = -44, Z1 = 22, Hh = HALL_H;
  b.box(fl, X1 - X0 + 0.6, 0.4, Z1 - Z0 + 0.6, 0, -0.2, (Z0 + Z1) / 2, { r: 0.02 });
  b.box(ceil, X1 - X0 + 0.6, 0.6, Z1 - Z0 + 0.6, 0, Hh + 0.3, (Z0 + Z1) / 2, { r: 0.02 });
  // coffered ceiling: gold-edged beams
  for (let x = X0 + 10; x < X1; x += 10) b.box(trim, 1.0, 1.2, Z1 - Z0, x, Hh - 0.5, (Z0 + Z1) / 2, { r: 0.1 });
  for (let z = Z0 + 11; z < Z1; z += 11) b.box(trim, X1 - X0, 1.2, 1.0, 0, Hh - 0.5, z, { r: 0.1 });
  b.box(gold, X1 - X0, 0.5, 0.5, 0, Hh - 1.3, Z1 - 0.4, { r: 0.1 }); b.box(gold, X1 - X0, 0.5, 0.5, 0, Hh - 1.3, Z0 + 0.4, { r: 0.1 });
  // walls: left (x -30), right (x 30, with windows), back (z -44), front (z 22, the entrance)
  b.box(wp, 0.6, Hh, Z1 - Z0, X0 - 0.3, Hh / 2, (Z0 + Z1) / 2, { r: 0.01 }); b.box(wp, 0.6, Hh, Z1 - Z0, X1 + 0.3, Hh / 2, (Z0 + Z1) / 2, { r: 0.01 });
  b.box(wp, X1 - X0, Hh, 0.6, 0, Hh / 2, Z0 - 0.3, { r: 0.01 });
  b.box(wp, X1 - X0, Hh - 11, 0.6, 0, 11 + (Hh - 11) / 2, Z1 + 0.3, { r: 0.01 }); b.box(wp, 25.5, 11, 0.6, -17.25, 5.5, Z1 + 0.3, { r: 0.01 }); b.box(wp, 25.5, 11, 0.6, 17.25, 5.5, Z1 + 0.3, { r: 0.01 });
  b.box(paint('#0c0a08'), 9, 11, 0.2, 0, 5.5, Z1 + 1.4);   // the dark hall beyond the entrance
  // cornices, picture rails, wainscot
  for (const [x, z, w, d] of [[X0 + 0.2, (Z0 + Z1) / 2, 0.8, Z1 - Z0], [X1 - 0.2, (Z0 + Z1) / 2, 0.8, Z1 - Z0], [0, Z0 + 0.2, X1 - X0, 0.8], [0, Z1 - 0.2, X1 - X0, 0.8]]) { b.box(trim, w, 1.0, d, x, Hh - 0.5, z, { r: 0.12 }); b.box(gold, w * 0.7 + 0.1, 0.2, d * 0.7 + 0.1, x, 9.0, z, { r: 0.05 }); }
  const wl = (len, place) => wainscot(b, len, 4.6, place);
  wl(Z1 - Z0 - 1, (m, u, y, w, h, d) => b.box(m, d, h, w, X1 - d / 2, y, (Z0 + Z1) / 2 + u, { r: 0.04 }));
  wl(Z1 - Z0 - 1, (m, u, y, w, h, d) => b.box(m, d, h, w, X0 + d / 2, y, (Z0 + Z1) / 2 + u, { r: 0.04 }));
  wl(X1 - X0 - 1, (m, u, y, w, h, d) => b.box(m, w, h, d, u, y, Z0 + d / 2, { r: 0.04 }));
  for (const s of [-1, 1]) wl(24, (m, u, y, w, h, d) => b.box(m, w, h, d, s * 17.5 + u, y, Z1 - d / 2, { r: 0.04 }));
  // pilasters on the long walls
  for (const z of [-28, -16, -2, 12]) for (const x of [X0 + 0.5, X1 - 0.5]) { b.box(trim, 0.8, Hh - 2, 1.6, x, Hh / 2 - 0.5, z, { r: 0.1 }); b.box(gold, 1.0, 0.8, 2.0, x, Hh - 2.2, z, { r: 0.1 }); }
  // entrance: door frame, two leaves open into the hall
  b.box(trim, 11, 1.2, 1.2, 0, 11.4, Z1 - 0.2, { r: 0.1 }); for (const s of [-1, 1]) b.box(trim, 1.0, 11, 1.2, s * 5, 5.5, Z1 - 0.2, { r: 0.1 });
  // the gallery: floor slab, fascia with gold, columns, balustrade with a gap where the stair arrives
  b.box(fl, X1 - X0, 0.6, GZ - Z0, 0, GAL - 0.3, (GZ + Z0) / 2, { r: 0.02 }); b.box(trim, X1 - X0, 1.8, 1.2, 0, GAL - 1.2, GZ, { r: 0.1 }); b.box(gold, X1 - X0, 0.25, 0.3, 0, GAL - 0.8, GZ + 0.62, { r: 0.05 });
  b.box(ceil, X1 - X0, 0.4, GZ - Z0, 0, GAL - 0.9, (GZ + Z0) / 2, { r: 0.02 });
  for (const x of [-18, -6, 6, 18]) { b.cyl(trim, 0.7, 0.8, GAL - 1.6, x, (GAL - 1.6) / 2, GZ - 0.8, { seg: 18 }); b.box(trim, 1.8, 0.5, 1.8, x, GAL - 2.0, GZ - 0.8, { r: 0.08 }); }
  const bal = (x0, x1) => { b.box(wood, x1 - x0, 0.45, 0.7, (x0 + x1) / 2, GAL + 3.3, GZ + 0.2, { r: 0.15 }); b.box(wood, x1 - x0, 0.3, 0.6, (x0 + x1) / 2, GAL + 0.15, GZ + 0.2, { r: 0.08 });
    for (let x = x0 + 0.4; x < x1; x += 0.9) { b.cyl(trim, 0.16, 0.2, 2.9, x, GAL + 1.75, GZ + 0.2, { seg: 10 }); b.add(trim, new THREE.SphereGeometry(0.24, 10, 8), x, GAL + 1.5, GZ + 0.2); } };
  bal(SX1 + 0.3, X1);
  // gallery side rail (beside the landing, open to the room above the stair)
  b.box(wood, 0.6, 0.45, GZ - Z0 - 1.2, SX1 + 0.2, GAL + 3.3, (GZ + Z0) / 2 + 0.6, { r: 0.15 });
  for (let z = GZ - 1; z > Z0 + 1; z -= 0.9) b.cyl(trim, 0.16, 0.2, 2.9, SX1 + 0.2, GAL + 1.75, z, { seg: 10 });
  // the grand staircase up the left wall: solid steps, carpet runner, stringer, balusters, a handrail, a newel post
  const N = 26, run = (SZ0 - SZ1) / N, rise = GAL / N, carpet = paint('#4a2430', { roughness: 0.95 }), rod = gold;
  for (let i = 0; i < N; i++) { const zc = SZ0 - (i + 0.5) * run, top = (i + 1) * rise;
    b.box(wood, SX1 - SX0, top, run + 0.02, (SX0 + SX1) / 2, top / 2, zc, { r: 0.03 }); b.box(paint('#3a2418', { roughness: 0.4 }), SX1 - SX0 + 0.3, 0.16, run + 0.1, (SX0 + SX1) / 2, top - 0.02, zc + 0.04, { r: 0.04 });
    b.box(carpet, 3.6, 0.08, run + 0.06, (SX0 + SX1) / 2 + 0.2, top + 0.08, zc, { r: 0.02 }); b.box(carpet, 3.6, rise, 0.08, (SX0 + SX1) / 2 + 0.2, top - rise / 2 + 0.05, zc + run / 2 + 0.02, { r: 0.02 });
    b.cyl(rod, 0.05, 0.05, 3.9, (SX0 + SX1) / 2 + 0.2, top - rise + 0.14, zc + run / 2 + 0.1, { rz: Math.PI / 2, seg: 6 });
    b.cyl(trim, 0.13, 0.16, 3.0, SX1 - 0.4, top + 1.5, zc, { seg: 8 }); }
  const sl = Math.atan2(GAL, SZ0 - SZ1), hl = Math.hypot(GAL, SZ0 - SZ1);
  b.box(wood, 0.5, 0.45, hl, SX1 - 0.4, GAL / 2 + 3.2, (SZ0 + SZ1) / 2, { r: 0.15, rx: sl }); b.box(wood, 0.6, 1.4, hl, SX1 - 0.1, GAL / 2 - 0.4, (SZ0 + SZ1) / 2, { r: 0.1, rx: sl });
  b.box(wood, 1.1, 4.4, 1.1, SX1 - 0.4, 2.2, SZ0 + 0.4, { r: 0.12 }); b.add(gold, new THREE.SphereGeometry(0.55, 14, 10), SX1 - 0.4, 4.7, SZ0 + 0.4);
  // a musicians' dais at the back of the dance floor (two tiers), garlands on the gallery front
  b.box(wood, 22, 0.8, 7, -11, 0.4, -15.5, { r: 0.08 }); b.box(wood, 22, 1.6, 3.5, -11, 0.8, -17.25, { r: 0.08 }); b.box(gold, 22.2, 0.15, 0.2, -11, 0.82, -12.0, { r: 0.04 }); b.box(gold, 22.2, 0.15, 0.2, -11, 1.62, -15.5, { r: 0.04 });
  const leafM = paint('#3f4a34', { roughness: 0.9 }), ribbon = paint('#6a2a36', { roughness: 0.8 });
  for (let i = 0; i < 9; i++) { const x0 = SX1 + 1 + i * 5.9; for (let k = 0; k <= 10; k++) { const u = k / 10, x = x0 + u * 5.9, y = GAL - 0.4 - Math.sin(u * Math.PI) * 1.4; b.add(leafM, new THREE.IcosahedronGeometry(0.36, 0), x, y, GZ + 0.75); } b.box(ribbon, 0.3, 1.6, 0.1, x0, GAL - 1.2, GZ + 0.78, { r: 0.04 }); }
  b.done(g);
  // the banquet: table, twelve chairs and settings, a thirteenth chair at the head with nothing set, candelabra, flowers
  const tb = banquetTable(TLEN, 7.2); tb.position.set(TX, 0, TZ); g.add(tb); W.tableTop = tb.top;
  const sb = new Batch(), r = rng(21); W.chairs = [];
  for (let i = 0; i < 12; i++) { const side = i < 6 ? -1 : 1, k = i % 6, z = TZ + (k - 2.5) * 5.2, x = TX + side * 5.2;
    const c = bigChair(); c.position.set(x, 0, z); c.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; g.add(c); W.chairs.push({ c, x, z, side, k });
    placeSetting(sb, TX + side * 2.15, tb.top, z, side < 0 ? -Math.PI / 2 : Math.PI / 2, r); }
  const head = bigChair({ velvet: '#3a3a44' }); head.position.set(TX, 0, TZ + TLEN / 2 + 1.7); head.rotation.y = Math.PI; g.add(head); W.headChair = head;
  W.candles = []; for (const z of [TZ - 10.4, TZ, TZ + 10.4]) W.candles.push(...candelabrum(sb, TX, tb.top, z));
  for (const z of [TZ - 5.2, TZ + 5.2]) { sb.cyl(paint('#c9c2b0', { metalness: 0.6, roughness: 0.3 }), 0.5, 0.35, 1.2, TX, tb.top + 0.6, z, { seg: 14 }); for (let k = 0; k < 9; k++) sb.add(paint(['#7a2a36', '#8a3a44', '#b8a6a0'][k % 3], { roughness: 0.8 }), new THREE.IcosahedronGeometry(0.34, 0), TX + Math.cos(k) * 0.55, tb.top + 1.5 + (k % 3) * 0.2, z + Math.sin(k * 1.7) * 0.55); }
  // a side table with a tiered cake nobody cut, a tray of glasses
  sb.box(wood, 6, 0.3, 3, -22, 4.0, 15, { r: 0.08 }); for (const x of [-24.6, -19.4]) for (const z of [13.8, 16.2]) sb.box(wood, 0.3, 3.9, 0.3, x, 1.95, z, { r: 0.05 });
  sb.box(paint('#e9e3d4', { roughness: 0.9 }), 6.2, 1.2, 3.2, -22, 3.3, 15, { r: 0.05 });
  for (let k = 0; k < 3; k++) sb.cyl(paint('#f2ece0', { roughness: 0.6 }), 1.2 - k * 0.32, 1.2 - k * 0.32, 1.0, -23, 4.65 + k * 1.0, 15, { seg: 28 });
  for (let k = 0; k < 3; k++) sb.cyl(paint('#b89a5a', { metalness: 0.6 }), 1.22 - k * 0.32, 1.22 - k * 0.32, 0.12, -23, 4.2 + k * 1.0, 15, { seg: 28 });
  for (let k = 0; k < 6; k++) { const gm = new THREE.MeshStandardMaterial({ color: '#d8e4e8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 }); sb.cyl(gm, 0.22, 0.12, 0.6, -20.6 + (k % 3) * 0.6, 4.55, 14.4 + Math.floor(k / 3) * 0.7, { seg: 12 }); }
  sb.done(g);
  // candle flames: small, warm, not blown out (no glare)
  const fm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc46a').multiplyScalar(1.25) }), fg = new THREE.SphereGeometry(0.11, 10, 8); fg.scale(1, 2.3, 1);
  W.flames = new THREE.InstancedMesh(fg, fm, W.candles.length); W.flames.userData.noAO = true; g.add(W.flames);
  // chandeliers, sconces, windows with curtains, the gramophone, the clock
  W.chand = [v3(TX, 19, TZ - 9), v3(TX, 19, TZ + 9), v3(-12, 19, -6)].map((p) => { const c = chandelier({ drop: HALL_H - 19 - 1.6 }); c.position.copy(p); g.add(c); return c; });
  W.sconces = [];
  for (const z of [-28, -16, -2, 12]) { const s = sconce(); s.position.set(X1 - 0.95, 10.5, z); s.rotation.y = -Math.PI / 2; g.add(s); W.sconces.push(s); }
  for (const z of [-14, 16]) { const s = sconce(); s.position.set(X0 + 0.35, 10.5, z); s.rotation.y = Math.PI / 2; g.add(s); W.sconces.push(s); }
  W.landSconce = sconce(); W.landSconce.position.set(-22.4, GAL + 5.8, Z0 + 0.35); g.add(W.landSconce);
  for (const z of [-22, -9, 5]) { const w = curtainWindow(7, 15); w.position.set(X1 - 0.35, 12.6, z); w.rotation.y = -Math.PI / 2; g.add(w); }
  W.gram = gramophone(); W.gram.position.set(24, 0, 15.5); W.gram.rotation.y = -2.5; g.add(W.gram);
  W.rec = new THREE.Mesh(new THREE.CircleGeometry(0.86, 32), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a2a2a'; for (let i = 10; i < 64; i += 3) { x.beginPath(); x.arc(64, 64, i, 0, 7); x.stroke(); } x.fillStyle = '#8a2a2a'; x.beginPath(); x.arc(64, 64, 16, 0, 7); x.fill(); x.fillStyle = '#e8d8b0'; x.fillRect(58, 54, 12, 4); }), roughness: 0.3 }));
  W.rec.rotation.x = -Math.PI / 2; W.rec.position.set(0, 5.0, 0); W.gram.add(W.rec);
  W.clock = grandClock(); W.clock.position.set(14, 0, Z0 + 1.3); g.add(W.clock);
  // the guests' portraits up the stair wall, and the final photograph at the top
  W.portraits = [];
  [7.2, 1.6, -6.2, -11.4, -21.5].forEach((z, i) => { const f = ornateFrame(3.4, 4.3, { crest: i % 2 === 0 }); f.position.set(X0 + 0.75, stairY(z) + 7.2, z); f.rotation.y = Math.PI / 2; g.add(f); W.portraits.push(f); });
  W.final = ornateFrame(5.6, 6.9); W.final.position.copy(FINAL); g.add(W.final);
  // the photographs on other walls (empty frames of landscapes, darkened), for richness
  for (const [x, z, ry] of [[-8, Z0 + 0.3, 0], [6, Z0 + 0.3, 0]]) { const f = ornateFrame(4.6, 3.6, { crest: false }); f.position.set(x, GAL + 6.4, z); f.rotation.y = ry; f.pic.material = paint('#3a3a2e', { roughness: 0.8 }); g.add(f); }
}

// ---- the portrait studio (guest portraits only) ----
function studio() {
  const g = new THREE.Group(); g.position.copy(PS); ctx.scene.add(g); W.studio = g;
  const b = new Batch(); b.box(damask('#9a9684', '#8a8674', { seed: 9 }), 30, 20, 0.4, 0, 10, -4, { r: 0.02 }); b.box(parquet('#5a3a26'), 30, 0.4, 14, 0, -0.2, 2, { r: 0.02 });
  b.cyl(paint('#cfc6b2'), 0.7, 0.8, 9, -4.2, 4.5, -2.5, { seg: 16 }); b.done(g);
}

// ---- characters ----
function people() {
  const mk = () => { const c = makeCharacter({ avatar: 'farm_charlotte', alti: true, skin: CSKIN, caustic: false }); ctx.scene.add(c.root); c.faceStyle = (x) => 'lash:' + x; c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return c; };
  W.c = mk(); W.tw = mk(); W.tw.root.visible = false;
  W.guests = []; for (let i = 0; i < 12; i++) { const gch = guest(i); gch.root.visible = false; ctx.scene.add(gch.root); W.guests.push(gch); }
}

// ---- lights ----
function rig() {
  W.pl = []; for (let i = 0; i < 9; i++) { const l = new THREE.PointLight('#ffffff', 0, 30, 1.6); ctx.scene.add(l); W.pl.push(l); }
  W.key = new THREE.SpotLight('#ffffff', 0, 60, 0.7, 0.8, 1.2); W.key.castShadow = true; W.key.shadow.mapSize.set(1024, 1024); W.key.shadow.bias = -0.0006; W.key.shadow.normalBias = 0.04; ctx.scene.add(W.key); ctx.scene.add(W.key.target);
}
const setL = (i, p, col, I, dist) => { const l = W.pl[i]; l.position.copy(p); l.color.set(col); l.intensity = I; l.distance = dist; };
function lightSet(set, t, focus) {
  W.pl.forEach((l) => { l.intensity = 0; }); W.key.intensity = 0;
  const key = (p, tgt, col, I, ang = 0.7, dist = 50) => { W.key.position.copy(p); W.key.target.position.copy(tgt); W.key.color.set(col); W.key.intensity = I; W.key.angle = ang; W.key.distance = dist; };
  if (set === 'bedN' || set === 'bedE') {
    const eve = set === 'bedE';
    setL(0, B(-1.6, 5.6, -9.6), '#ffcf96', 26, 16);                            // the desk lamp
    setL(1, B(10.0, 0.6, 3.3), '#ffc98a', eve ? 6 : 10, 7);                     // the hall light under the door
    setL(2, B(-3, 7.5, -9.5), eve ? '#ff9e6a' : '#8fa8e0', eve ? 30 : 9, 22);   // the window
    setL(3, B(2, 10, 4), eve ? '#e0a080' : '#7c86b8', eve ? 8 : 6, 30);         // room fill
    setL(4, B(-10.4, 8.6, 2), '#ffcf96', 4, 10);                                // fairy lights
    key(B(-1.2, 9.5, -6.4), B(focus.x - BR.x, 3.6, focus.z - BR.z).add(BR), '#ffd2a0', 60, 0.85, 30);
  } else if (set === 'bedM') {
    setL(0, B(-3, 7.2, -9.8), '#f2f4ff', 70, 30); setL(1, B(4, 9, 3), '#dfe6f2', 18, 30); setL(2, B(9.5, 0.6, 3.3), '#ffd2a0', 3, 6); setL(3, B(-6, 9, 6), '#e8e2ee', 10, 24);
    key(B(-3.2, 8.4, -12.5), B(focus.x - BR.x, 1.5, focus.z - BR.z).add(BR), '#fff6e6', 140, 0.6, 40);
  } else if (set === 'out') {
    setL(0, X(-6, 12.4, 48), '#ffb860', 18, 22); setL(1, X(6, 12.4, 48), '#ffb860', 18, 22);
    setL(2, X(0, 7, 6), '#ffc27a', 30, 26); setL(3, X(-18, 7, 4), '#ffc27a', 16, 18); setL(4, X(18, 7, 4), '#ffc27a', 16, 18); setL(5, X(0, 19, 3), '#ffc27a', 14, 16);
  } else if (set === 'hall') {
    const k = W.dim ?? 1;
    W.chand.forEach((c, i) => setL(i, c.position.clone().add(v3(0, -1.2, 0)), '#ffc888', 70 * k, 46));
    setL(3, v3(28, 10.5, -9), '#ffc888', 14 * k, 18); setL(4, v3(28, 10.5, 10), '#ffc888', 14 * k, 18);
    setL(6, v3(-22.4, GAL + 5.8, -42.5), '#ffc888', 22 * (W.landK ?? 1), 16);
    setL(7, v3(TX, W.tableTop + 3, TZ), '#ffb860', 26 * k, 20);
    setL(8, v3(-28, 10, 14), '#ffc888', 10 * k, 18);
    key(v3(26, 22, -2), v3(focus.x, Math.max(1, focus.y + 1.5), focus.z), '#b8c8e6', 70, 0.6, 70);   // moonlight from the windows: the one shadow
  }
}

// ---- prints: the photographs are rendered once, into render targets ----
const RT = (w, h) => { const r = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 }); return r; };
function only(...groups) { for (const k of ['bed', 'ext', 'in', 'studio']) W[k].visible = groups.includes(k); }
function snap(rt, cam) { const { renderer, scene } = ctx; renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(null); }
function hideAll() { W.c.root.visible = false; W.tw.root.visible = false; W.guests.forEach((q) => { q.root.visible = false; }); }
function sunAt(focus, span = 90) { const s = ctx.sun; s.target.position.copy(focus); s.position.copy(focus).add(ctx.env.sunDir.clone().normalize().multiplyScalar(220)); s.castShadow = true;
  const sc = s.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.far = 600; sc.updateProjectionMatrix(); }
function renderPrints() {
  const T = W.tw; ctx.scene.updateMatrixWorld(true);
  // the mansion photographs: overcast daylight; the girl in the upstairs window room, lit by the lamp
  only('ext'); hideAll(); applyEnv(ctx, PRINTD); lightSet('none', 0, v3());
  const cam = new THREE.PerspectiveCamera(40, 4 / 5, 0.5, 2000); cam.position.copy(X(3.5, 25, 68)); cam.lookAt(X(0, 16, 0)); cam.updateMatrixWorld(true);
  sunAt(X(0, 10, 0), 80);
  const H = W.house, wc = H.realWin.clone().add(EXT);
  // the detail rectangle: the real window and a margin, in the print's uv (v up)
  const pr = (x, y) => { const p = v3(wc.x + x, wc.y + y, wc.z).project(cam); return [(p.x + 1) / 2, (p.y + 1) / 2]; };
  const [u0, v0] = pr(-4.6, -6.0), [u1, v1] = pr(4.6, 6.0); W.dRect = [u0, v0, u1, v1];
  const FW = 1024, FH = 1280, dw = 1024, dh = Math.round(1024 * ((v1 - v0) * FH) / ((u1 - u0) * FW));
  const lamp = W.pl[0];
  W.prints = [];
  for (let k = 0; k < 3; k++) {
    T.root.visible = k < 2; T.reset();
    const room = H.winRoom; room.updateMatrixWorld(true);
    if (k === 0) { T.root.position.copy(room.localToWorld(v3(0.7, 0, -4.2))); T.root.rotation.set(0, 0.08, 0); pose(T, 'still', 0); T.setFace('lash:neutral'); }
    if (k === 1) { T.root.position.copy(room.localToWorld(v3(0.0, 0, -1.25))); T.root.rotation.set(0, 0, 0); pose(T, 'handsToWindow', 0, { amt: -0.05 }); T.setFace('lash:neutral'); }
    H.setSash(k === 2 ? 1 : 0); H.blow(k === 2 ? 1 : 0, 2.2);
    lamp.position.copy(room.localToWorld(v3(-4.0, 6.0, -6.6))); lamp.color.set('#ffd9a8'); lamp.intensity = 90; lamp.distance = 16;
    W.pl[1].position.copy(room.localToWorld(k === 1 ? v3(2.8, 9.0, 5.0) : v3(0.6, 4.2, -0.7))); W.pl[1].color.set('#f2eee4'); W.pl[1].intensity = k === 1 ? 30 : 70; W.pl[1].distance = k === 1 ? 16 : 12;
    const main = RT(FW, FH), det = RT(dw, dh);
    cam.clearViewOffset(); cam.updateProjectionMatrix(); snap(main, cam);
    cam.setViewOffset(FW, FH, u0 * FW, (1 - v1) * FH, (u1 - u0) * FW, (v1 - v0) * FH); cam.updateProjectionMatrix(); snap(det, cam); cam.clearViewOffset(); cam.updateProjectionMatrix();
    W.prints.push(printMat({ tex: main.texture, detail: det.texture, rect: W.dRect, seed: 3 + k * 7 }));
  }
  T.root.visible = false; H.setSash(0); H.blow(0, 0); lamp.intensity = 0; W.pl[1].intensity = 0;
  // the guests' portraits: head and shoulders in the studio, each face scratched out
  only('studio'); applyEnv(ctx, { ...HALLP, hemiI: 0.9, exposure: 1.0 }); ctx.sun.castShadow = false; ctx.sun.intensity = 0;
  const pc = new THREE.PerspectiveCamera(30, 4 / 5, 0.5, 200);
  W.portraitM = [];
  [0, 1, 4, 3, 8].forEach((gi, i) => {
    hideAll(); const q = W.guests[gi]; q.root.visible = true; q.reset(); q.root.position.copy(PS).add(v3(0.4, 0, 0)); q.root.rotation.set(0, -0.15 + (i % 2) * 0.3, 0); pose(q, 'still', 0);
    setL(0, PS.clone().add(v3(-5, 9, 8)), '#ffe2b8', 120, 30); setL(1, PS.clone().add(v3(6, 6, 6)), '#c8d0e0', 30, 30);
    pc.position.copy(PS).add(v3(0.4, 4.6, 12.5)); pc.lookAt(PS.clone().add(v3(0.4, 4.1, 0))); pc.updateMatrixWorld(true);
    q.root.updateMatrixWorld(true); const hp = q.head.getWorldPosition(v3()).project(pc), he = q.head.localToWorld(v3(0.7, 0, 0)).project(pc);
    const rt = RT(512, 640); snap(rt, pc);
    const hu = (hp.x + 1) / 2, hv = (hp.y + 1) / 2, ru = Math.abs(he.x - hp.x) / 2 * 1.25;
    W.portraitM.push(printMat({ tex: rt.texture, scratch: scratchTex([[hu, hv + 0.01, ru, ru * 0.8 * 1.15]], 7 + i), border: 0.05, seed: 11 + i, gain: 1.1 }));
  });
  setL(0, v3(), '#fff', 0, 1); setL(1, v3(), '#fff', 0, 1);
  // the final photograph, twice: (A) Charlotte in the ballroom among twelve guests who face her; (B) thirteen faces that aren't there
  only('in'); applyEnv(ctx, HALLP); W.dim = 1; W.landK = 1; ctx.sun.castShadow = false; ctx.sun.intensity = 0;
  const fc = new THREE.PerspectiveCamera(38, 4 / 5, 0.5, 400);
  const C0 = v3(-11, 0, -4.5);
  hideAll(); T.root.visible = true; T.reset(); T.root.position.copy(C0); T.root.rotation.set(0, 0, 0); pose(T, 'still', 0); T.setFace('lash:neutral'); T.faceSheet.visible = true;
  W.guests.forEach((q, i) => { q.root.visible = true; q.reset(); const a = (-0.62 + (i / 11) * 1.24) * Math.PI + Math.PI;   // a ring open toward the camera
    const R = 5.6; q.root.position.copy(C0).add(v3(Math.sin(a) * R, 0, Math.cos(a) * R)); q.root.rotation.set(0, Math.atan2(C0.x - q.root.position.x, C0.z - q.root.position.z), 0); pose(q, 'still', 0); });
  lightSet('hall', 0, C0);
  setL(0, C0.clone().add(v3(4, 15, 9)), '#fff0d8', 320, 45); fc.position.copy(C0).add(v3(0.8, 8.5, 19)); fc.lookAt(C0.clone().add(v3(0, 2.4, -1.2))); fc.updateMatrixWorld(true);
  const rtA = RT(1080, 1350); snap(rtA, fc);
  // B: three rows facing the camera; the back rows on the dais tiers; Charlotte centre of the middle row, no face
  const rows = [[-4.65, -1.55, 1.55, 4.65], [-6.2, -3.1, 0, 3.1, 6.2], [-4.65, -1.55, 1.55, 4.65]], rz = [-16.4, -13.2, -9.6], ry = [1.6, 0.8, 0], all = [];
  let gi = 0; rows.forEach((row, ri) => row.forEach((x, k) => { if (ri === 1 && k === 2) all.push([T, x, ri]); else all.push([W.guests[gi++], x, ri]); }));
  all.forEach(([q, x, ri]) => { q.root.visible = true; q.reset(); q.root.position.set(-11 + x, ry[ri], rz[ri]); q.root.rotation.set(0, (x > 0 ? -1 : 1) * 0.06, 0); pose(q, 'still', 0); });
  T.faceSheet.visible = false;
  const CB = v3(-11, 0, -13);
  fc.fov = 40; fc.updateProjectionMatrix(); fc.position.copy(CB).add(v3(0, 7.5, 24)); fc.lookAt(CB.clone().add(v3(0, 4.2, 0))); fc.updateMatrixWorld(true);
  lightSet('hall', 0, CB); setL(0, CB.clone().add(v3(3, 15, 12)), '#fff0d8', 320, 45);
  const rtB = RT(1080, 1350); snap(rtB, fc);
  T.faceSheet.visible = true; hideAll();
  W.finalA = printMat({ tex: rtA.texture, border: 0.035, seed: 41, gain: 1.05 }); W.finalB = printMat({ tex: rtB.texture, border: 0.035, seed: 41, gain: 1.05 });
  W.finalA.uniforms.sepia.value = W.finalB.uniforms.sepia.value = 0.92; setL(0, v3(), '#fff', 0, 1);
  only('bed', 'ext', 'in');
}

// ---- props that use the prints ----
function placePrints() {
  // on the desk: three prints in a row (each appears on its day), photo 1 also lies under the door at first, photo 2 under the door in the morning
  const g = W.bed; W.desk = [];
  PHX.forEach((x, i) => { const p = loosePrint(W.prints[i], 2.4, 3.0, i === 0 ? { back: ['13 Ashgrove Lane'] } : {}); p.position.set(x, 4.02, -9.3); p.rotation.y = (i - 1) * 0.05; g.add(p); W.desk.push(p); });
  W.floorP = loosePrint(W.prints[0], 2.4, 3.0); W.floorP.rotation.y = Math.PI / 2 + 0.08; g.add(W.floorP);
  W.floorP2 = loosePrint(W.prints[1], 2.4, 3.0); W.floorP2.rotation.y = Math.PI / 2 - 0.12; W.floorP2.position.set(8.6, 0.03, 3.6); g.add(W.floorP2);
  // the invitation and its envelope, and photo 1 turned over beside it (the evening)
  W.inv = invitation([['YOU ARE INVITED', 46, '700', '#2c2218'], ['to a party', 40, 'italic'], ['13 Ashgrove Lane', 52, 'italic 700', '#6a1d26'], ['Saturday, eight o\'clock', 34, 'italic'], ['Do not be late', 30, 'italic', '#5a4a3a']]);
  W.inv.position.set(-3.6, 4.03, -9.0); W.inv.rotation.y = 0.04; g.add(W.inv); W.inv.env.position.set(-6.0, 3.985, -9.6); W.inv.env.rotation.y = 0.3; g.add(W.inv.env);
  W.backP = loosePrint(W.prints[0], 2.4, 3.0, { back: ['13 Ashgrove Lane'] }); W.backP.rotation.z = Math.PI; W.backP.position.set(-0.6, 4.04, -9.1); W.backP.rotation.y = -0.06; g.add(W.backP);
  W.portraits.forEach((f, i) => { f.pic.material = W.portraitM[i]; });
  W.final.pic.material = W.finalA;
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, S = [], add = (name, t0, f) => S.push({ name, t0: () => t0, f, t1: () => 0 });
  const dk = (i) => B(PHX[i], 4.03, -9.3);
  const over = (p, h, back, u, push = 0) => ({ pos: p.clone().add(v3(0, lerp(h, h - push, u), back * lerp(1, 0.88, u))), look: p.clone().add(v3(0, 0, -0.05)), fov: 46 });
  add('slip', 0, (u) => ({ pos: B(6.2, 1.1, 1.6), look: B(10.6, 0.25, 3.6), fov: 52 }));
  add('turn', e.turn - 0.1, (u) => ({ pos: lp3(B(2.6, 5.0, -3.6), B(2.4, 5.0, -3.9), u), look: B(-3, 4.2, -7.0), fov: 60 }));
  add('p1', s(1) - 0.1, (u) => over(dk(0), 3.6, 0.95, easeOut(u), 0.3));
  add('p1win', s(2) - 0.1, (u) => { const p = dk(0), wv = W.winOn(0); return { pos: lp3(p.clone().add(v3(0, 3.3, 0.86)), wv.clone().add(v3(0, 1.25, 0.32)), easeInOut(u)), look: lp3(p, wv, easeInOut(u)), fov: 46 }; });
  add('girl', s(3) - 0.1, (u) => { const wv = W.winOn(0); return { pos: wv.clone().add(v3(0, lerp(1.2, 0.95, u), 0.3)), look: wv.clone().add(v3(0.03, 0, -0.02)), fov: 46 }; });
  add('face', s(3) + 1.05, (u) => ({ pos: lp3(B(1.4, 5.5, -9.9), B(1.1, 5.45, -9.7), u), look: B(-3, 4.25, -6.9), fov: 56 }));
  add('morning', s(4) - 0.1, (u) => ({ pos: lp3(B(9.6, 6.2, 9.2), B(9.4, 6.0, 8.6), u), look: B(7.0, 2.0, 2.4), fov: 60 }));
  add('p2', s(5) - 0.1, (u) => { const a = dk(1), wv = W.winOn(1); const k = easeInOut(clamp(u * 1.3 - 0.15)); return { pos: lp3(a.clone().add(v3(0, 3.5, 0.9)), wv.clone().add(v3(0, 1.3, 0.34)), k), look: lp3(a, wv, k), fov: 46 }; });
  add('p3', s(6) - 0.1, (u) => { const p = dk(2), wv = W.winOn(2); return { pos: lp3(p.clone().add(v3(0, 3.5, 0.9)), wv.clone().add(v3(0, 1.6, 0.42)), easeInOut(u)), look: lp3(p, wv, easeInOut(u)), fov: 46 }; });
  add('invite', s(8) - 0.1, (u) => ({ pos: lp3(B(-3.6, 8.6, -6.7), B(-3.6, 8.3, -7.0), u), look: B(-3.6, 4.03, -9.0), fov: 58 }));
  add('address', s(9) - 0.1, (u) => ({ pos: lp3(B(-3.6, 7.9, -7.3), B(-3.6, 7.2, -7.8), easeInOut(u)), look: B(-3.6, 4.03, -9.0), fov: 52 }));
  add('arrive', s(10) - 0.15, (u) => ({ pos: lp3(X(0, 7.5, 70), X(0, 7.8, 66), u), look: X(0, 16, 0), fov: 60 }));
  add('ballroom', s(11) - 0.1, (u) => ({ pos: lp3(v3(0, 6.5, 20.5), v3(0, 6.5, 18.5), u), look: v3(-2, 6.4, -30), fov: 62 }));
  add('gram', s(11) + 1.15, (u) => ({ pos: lp3(v3(18.6, 7.6, 12.6), v3(19.2, 7.4, 12.9), u), look: v3(24, 4.8, 15.2), fov: 50 }));
  add('table', s(12) - 0.1, (u) => ({ pos: lp3(v3(TX - 2.0, 7.4, TZ + 21), v3(TX - 1.4, 6.8, TZ + 14), easeInOut(u)), look: v3(TX + 0.4, 4.4, TZ - 8), fov: 56 }));
  add('stairs', s(13) - 0.1, (u) => ({ pos: lp3(v3(-11, 5.6, 17), v3(-12, 6.0, 16), u), look: v3(-26, 9.5, -8), fov: 60 }));
  add('guests', s(14) - 0.1, (u) => { const z = lerp(7.2, 1.6, easeInOut(u)); return { pos: v3(-24.7, stairY(z) + 7.2, z), look: v3(-30, stairY(z) + 7.2, z), fov: 68 }; });
  add('scratch', s(15) - 0.1, (u) => { const f = W.portraits[2].position, z = f.z; return { pos: lp3(v3(-24.8, f.y + 0.1, z + 1.0), v3(-25.6, f.y + 0.05, z + 0.5), u), look: v3(-30, f.y, z), fov: 46 }; });
  add('climb', e.climb, (u) => ({ pos: lp3(v3(-12.5, 15.0, -22), v3(-13.0, 15.4, -24), u), look: v3(-26, 13.6, -34), fov: 56 }));
  add('final', s(17) - 0.1, (u) => ({ pos: lp3(v3(-24.8, GAL + 6.6, -35.9), v3(-25.7, GAL + 6.7, -37.7), easeInOut(u)), look: v3(-26.5, GAL + 6.2, -43.6), fov: 50 }));
  add('twelve', s(18) - 0.1, (u) => ({ pos: lp3(v3(-26.5, GAL + 5.6, -36.0), v3(-26.5, GAL + 5.6, -36.6), u), look: FINAL.clone().add(v3(0, -1.2, 0)), fov: 54 }));
  add('turnaround', s(19) - 0.1, (u) => ({ pos: lp3(v3(-25.2, GAL + 5.1, -35.7), v3(-25.3, GAL + 5.0, -36.0), u), look: v3(-26.5, GAL + 3.9, -38.6), fov: 74 }));
  add('empty', s(20) - 0.1, (u) => ({ pos: lp3(v3(-25.4, GAL + 6.2, -37.0), v3(-24.8, GAL + 6.6, -36.2), u), look: v3(4, 3.0, -2), fov: 64 }));
  add('chairs', s(21) - 0.1, (u) => ({ pos: lp3(v3(TX - 13.0, 4.0, TZ + 15), v3(TX - 12.4, 4.0, TZ + 14), u), look: v3(TX - 4, 2.6, TZ - 1), fov: 54 }));
  add('onebyone', s(22) - 0.15, (u) => ({ pos: lp3(v3(TX + 14, 9.0, TZ + 17), v3(TX + 13, 8.6, TZ + 12), u), look: v3(TX, 2.8, TZ - 4), fov: 58 }));
  add('whisper', s(23) - 0.1, (u) => ({ pos: lp3(v3(-26.0, GAL + 5.1, -35.7), v3(-26.1, GAL + 5.0, -36.1), u), look: v3(-26.5, GAL + 3.9, -38.6), fov: 74 }));
  add('lookback', e.lookBack - 0.2, (u) => ({ pos: lp3(v3(-24.6, GAL + 6.0, -35.8), v3(-25.0, GAL + 6.2, -36.6), u), look: v3(-26.6, GAL + 5.6, -43.6), fov: 56 }));
  add('thirteen', s(26) - 0.1, (u) => ({ pos: lp3(v3(-26.5, GAL + 5.6, -36.0), v3(-26.5, GAL + 5.6, -36.7), easeOut(u)), look: FINAL.clone().add(v3(0, -1.2, 0)), fov: 54 }));
  add('faces', s(27) - 0.1, (u) => ({ pos: lp3(v3(-26.5, GAL + 6.0, -36.4), v3(-26.5, GAL + 6.1, -38.2), easeInOut(clamp(u * 1.2))), look: FINAL.clone().add(v3(0, -0.5, 0)), fov: 54 }));
  S.forEach((x, i) => { if (S[i + 1]) { const v = S[i + 1].t0(); x.t1 = () => v; } });
  S[S.length - 1].t1 = () => ctx.dur + 1;
  return S;
}

// ---- a frame ----
function faceOf(c, name, t, ph) { c.setFace(c.faceStyle ? c.faceStyle(name) : name, { blink: blinkAt(t, ph) && !['shocked', 'terrified'].includes(name) }); }
const SETS = { slip: 'bedN', turn: 'bedN', p1: 'bedN', p1win: 'bedN', girl: 'bedN', face: 'bedN', morning: 'bedM', p2: 'bedM', p3: 'bedM', three: 'bedM', invite: 'bedE', address: 'bedE',
  arrive: 'out', ballroom: 'hall', gram: 'hall', table: 'hall', stairs: 'hall', guests: 'hall', scratch: 'hall', climb: 'hall', final: 'hall', twelve: 'hall', turnaround: 'hall', empty: 'hall',
  chairs: 'hall', onebyone: 'hall', whisper: 'hall', lookback: 'hall', thirteen: 'hall', faces: 'hall' };
const PAL = { bedN: BEDN, bedM: BEDM, bedE: BEDE, out: OUTN, hall: HALLP };

function renderAt(t) {
  if (!W.printsDone) { renderPrints(); placePrints(); W.printsDone = true; }
  const sh = shotAt(W.shots, t), n = sh.name, e = EV, C = W.c, set = SETS[n];
  applyEnv(ctx, PAL[set]);
  W.bed.visible = set.startsWith('bed'); W.ext.visible = set === 'out'; W.in.visible = set === 'hall'; W.studio.visible = false;
  hideAll(); C.root.visible = true; C.reset(); C.root.rotation.set(0, 0, 0); C.faceSheet.visible = true;
  let focus = v3(0, 0, 0);
  const cp = C.root.position;
  // ---- the bedroom ----
  if (set.startsWith('bed')) {
    const night = set === 'bedN', eve = set === 'bedE';
    W.skyM.color.set(night ? '#0d1630' : eve ? '#e08a5a' : '#cfe2f6'); W.moon.visible = night; W.bulb.material.color.set(set === 'bedM' ? '#9a8a78' : '#ffd9a0');
    W.spill.visible = set !== 'bedM';
    // the prints: photo 1 slides in under the door, then lies on the desk; 2 and 3 arrive on their days
    const k = smooth(e.slide, e.slide + 1.15, t);
    W.floorP.visible = n === 'slip'; W.floorP.position.set(lerp(12.4, 9.0, easeOut(k)), 0.03, 3.4);
    W.floorP2.visible = n === 'morning';
    W.desk[0].visible = n !== 'slip' && !eve; W.desk[1].visible = ['p2', 'p3', 'three'].includes(n); W.desk[2].visible = ['p3', 'three'].includes(n);
    W.inv.visible = W.inv.env.visible = eve; W.backP.visible = eve;
    if (n === 'slip' || n === 'turn') { cp.copy(B(-3, 0, -6.9)); const tk = smooth(e.turn, e.turn + 0.9, t); C.root.rotation.y = Math.PI + lerp(0, -2.2, easeInOut(tk)); pose(C, 'idle', t); faceOf(C, tk > 0.3 ? 'surprised' : 'neutral', t, 0.3); C.root.visible = n === 'turn'; }
    else if (n === 'face') { cp.copy(B(-3, 0, -6.9)); C.root.rotation.y = Math.PI - 0.15; pose(C, 'idle', t); C.neck.rotation.x = 0.32; faceOf(C, 'shocked', t, 0.3); }
    else if (n === 'morning') { cp.copy(B(5.4, 0, 1.2)); C.root.rotation.y = 0.94; pose(C, 'idle', t); C.neck.rotation.x = 0.42; faceOf(C, 'nervous', t, 0.3); }
    else C.root.visible = false;
    focus = cp.clone();
  }
  // ---- the mansion outside ----
  if (set === 'out') {
    W.house.lights(1); W.house.setSash(0); W.house.blow(0, t);
    cp.copy(X(0.6, 0, lerp(56, 53.5, smooth(e.gate, e.gate + 2.6, t)))); C.root.rotation.y = Math.PI; pose(C, smooth(e.gate, e.gate + 2.6, t) < 1 && t > e.gate ? 'walk' : 'idle', t * 0.7); C.neck.rotation.x = -0.3; faceOf(C, 'nervous', t, 0.3);
    focus = cp.clone();
  }
  // ---- the ballroom ----
  if (set === 'hall') {
    W.dim = 1; W.landK = t < e.out ? 1 : 0.0;
    W.chand.forEach((c) => c.level(1)); W.sconces.forEach((s) => s.level(1)); W.landSconce.level(W.landK);
    W.clock.set(t); W.rec.rotation.z = -(t < e.scrape + 1.2 ? t * 3.6 : (e.scrape + 1.2) * 3.6 + Math.max(0, 1 - (t - e.scrape - 1.2)) * 0);
    // the flames
    const M = new THREE.Matrix4(); W.candles.forEach((p, i) => { const f = 1 + 0.12 * Math.sin(t * 13 + i * 2.1) + 0.06 * Math.sin(t * 29 + i); M.makeScale(1 / f, f, 1 / f).setPosition(p.x + 0.02 * Math.sin(t * 7 + i), p.y + 0.12 * f, p.z); W.flames.setMatrixAt(i, M); }); W.flames.instanceMatrix.needsUpdate = true;
    // the chairs: tucked in, until they scrape back one by one (the order along the table, near end first)
    const order = [5, 11, 4, 10, 3, 9, 2, 8, 1, 7, 0, 6];
    W.chairs.forEach((q, i) => { const j = order.indexOf(i), k = smooth(e.scrape + j * 0.42, e.scrape + j * 0.42 + 0.7, t); q.c.position.x = q.x + q.side * 2.4 * easeOut(k); q.c.rotation.y = (q.side < 0 ? Math.PI / 2 : -Math.PI / 2) + q.side * 0.18 * k * (j % 2 ? 1 : -1); });
    // Charlotte
    if (n === 'ballroom') { const k = smooth(s0(11) - 0.3, s0(12), t); cp.set(lerp(1.0, 0.4, k), 0, lerp(16.5, 11.5, k)); C.root.rotation.y = Math.PI; pose(C, k < 1 ? 'walk' : 'idle', t * 0.7); faceOf(C, 'nervous', t, 0.3); }
    else if (n === 'stairs') { cp.set(-21.5, 0, 10.5); C.root.rotation.y = Math.PI + 0.75; pose(C, 'lookUp', t, { amt: 0.32 }); faceOf(C, 'surprised', t, 0.3); }
    else if (n === 'guests' || n === 'scratch') C.root.visible = false;
    else if (n === 'climb') { const z = lerp(-19, SZ1 - 1.6, smooth(e.climb, s0(17) - 0.05, t)); cp.set(-26.5, stairY(z), z); C.root.rotation.y = Math.PI; pose(C, t < s0(17) - 0.1 ? 'walk' : 'idle', t * 0.65); faceOf(C, 'nervous', t, 0.3); }
    else if (['final', 'twelve'].includes(n)) { cp.copy(LAND); C.root.rotation.y = Math.PI; pose(C, 'still', t); faceOf(C, 'scared', t, 0.3); C.root.visible = n === 'final'; }
    else if (n === 'turnaround' || n === 'whisper') { cp.copy(LAND); const k = n === 'turnaround' ? smooth(s0(19) + 0.05, s0(19) + 0.95, t) : 1; C.root.rotation.y = lerp(Math.PI, 0.08, easeInOut(k)); pose(C, 'still', t);
      faceOf(C, n === 'whisper' ? (t > s0(24) ? 'shocked' : 'scared') : 'scared', t, 0.3); if (n === 'whisper') { C.neck.rotation.y = 0.18 * smooth(s0(24), s0(24) + 0.8, t); } }
    else if (n === 'empty') { cp.copy(LAND); C.root.rotation.y = 0.08; pose(C, 'still', t); faceOf(C, 'scared', t, 0.3); }
    else if (n === 'lookback') { cp.copy(LAND); const k = smooth(e.lookBack, e.lookBack + 0.9, t); C.root.rotation.y = lerp(0.08, Math.PI, easeInOut(k)); pose(C, 'still', t); faceOf(C, 'shocked', t, 0.3); }
    else if (n === 'thirteen' || n === 'faces') { C.root.visible = false; }
    else C.root.visible = false;
    W.final.pic.material = t >= e.swap ? W.finalB : W.finalA;
    focus = C.root.visible ? cp.clone() : v3(TX, 2, TZ);
    if (['guests', 'scratch'].includes(n)) focus = v3(-28, stairY(-8) + 5, -8);
    if (['final', 'twelve', 'thirteen', 'faces', 'lookback'].includes(n)) focus = v3(-26.5, GAL + 2, -40);
  }
  lightSet(set === 'out' ? 'out' : set === 'hall' ? 'hall' : set, t, focus);
  W.air.update(t); W.air.list.dust.position.copy(set === 'hall' ? v3(0, 0, -8) : set === 'out' ? X(0, 0, 40) : BR); W.air.list.dust.visible = set !== 'out';
  frame(ctx, t, sh, { steady: true, shake: 0, shadowSpan: set === 'out' ? 120 : 60, shadows: set === 'out' });
  return n;
}
const s0 = (i) => L(i).start;

export async function setup() {
  ctx = await initStage('ep28', { look: 'pro', avatars: ['farm_charlotte'] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'surprised', 'shocked', 'scared', 'terrified', 'nervous', 'sad', ...['neutral', 'surprised', 'shocked', 'scared', 'terrified', 'nervous', 'sad'].map((x) => 'lash:' + x)]);
  const { scene, camera } = ctx; camera.far = 3000; camera.near = 0.1; camera.updateProjectionMatrix();
  rig(); bedroom(); outside(); ballroom(); studio(); people();
  // where the real window sits on each desk print (world), for the push-ins
  W.winOn = (i) => { const r = W.dRect || [0.45, 0.55, 0.55, 0.7], u = (r[0] + r[2]) / 2, vv = (r[1] + r[3]) / 2, bd = 0.06, pu = bd + u * (1 - 2 * bd), pv = bd + vv * (1 - 2 * bd);
    return B(PHX[i] + (pu - 0.5) * 2.4, 4.05, -9.3 - (pv - 0.5) * 3.0); };
  const list = { dust: dust(scene, { size: 46, height: 22, centre: v3(0, 8, 0), count: 420, color: '#f2e6cc', amount: 0.16, pointSize: 0.38 }) };
  W.air = atmos(...Object.values(list)); W.air.list = list;
  W.shots = shots();
  void rng; void noise1; void surf; void paint;
  return expose(ctx, renderAt, L(26).start + 1.2, EV);
}
