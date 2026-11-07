// Episode 21: Door 000 Wasn't Supposed to Exist. A dim hotel corridor where ninety-nine doors already stand open. At its end, Door 100 and a child's door that
// wasn't there a second ago. Behind that door a forgotten wing runs to one tiny room, which is what makes the sprint back possible: Door 100 is beside Door 000, but the
// boy is 130 studs behind it. Every light goes green, the tower pancakes, the wing's ceiling comes down behind them, and Door 100 opens on a morning meadow.
// Sets share the world: corridor (z 0..128), the wing and room behind it (z 0..-150), the tower at TX, the meadow at MX.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, DAY, NIGHT } from '../engine/stage.js';
import { Batch, surf, paint } from '../engine/kit.js';
import { dust, shaft, clouds, burst, sparkles, vanisher, atmos } from '../engine/atmos.js';
import { canvasTex, glowSprite } from '../engine/props.js';
import { treeShape, treeSet, leafTime } from '../engine/forest.js';
import { plumes } from '../engine/isles.js';
import { wallpaper, carpet, plate, doorLeaf, exitSign, flashlight, ceilingTiles, rubble, hotelTower } from '../engine/hotel.js';

let ctx, L, EV;
const W = { sc: [], fx: [] };
const HW = 10, H = 12.5, ZN = 128, ZD = [22, 38, 54, 70, 86, 102, 118];
const DX = -5.2, WHW = 3.8, WH = 9, WZ = -130, RZ = -150, RH = 8;      // door 000's x, the wing, the room
const TX = v3(2600, 0, 0), MX = v3(-2600, 0, 0);
const BOY = v3(-0.6, 0, -146), USER = 'FlashlightFinn', ARM = 2.2, BS = 0.74;
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const WARM = new THREE.Color('#ffd0a0'), GRN = new THREE.Color('#2bff8e'), tmpC = new THREE.Color();

// ---- palettes ----
const HOTEL = { ...NIGHT, ...P({ top: '#000000', horizon: '#000000', haze: '#040806', sunColor: '#ffffff', hemiSky: '#a8b8a8', hemiGround: '#40302a' }),
  sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 0.85, amb: 0.2, envI: 0.3, exposure: 1.2, bloom: 0.34, fogNear: 50, fogFar: 240, saturation: 1.18, contrast: 1.05, bounce: 0.1 };
const EMERG = { ...HOTEL, ...P({ haze: '#03140c', hemiSky: '#55ffa8', hemiGround: '#0c3a26' }), hemiI: 1.05, amb: 0.2, envI: 0.25, exposure: 1.22, bloom: 0.46, saturation: 1.22 };
const TOWER = { ...NIGHT, ...P({ top: '#050a1c', horizon: '#123a34', haze: '#0b1f22', sunColor: '#9fc0e8', hemiSky: '#7a9ac0', hemiGround: '#1c2a24' }),
  sunI: 0.55, sunDir: v3(-0.5, 0.6, 0.6), sunDisc: 0, stars: 1, moon: 1, hemiI: 0.6, amb: 0.14, envI: 0.3, exposure: 1.15, bloom: 0.42, fogNear: 300, fogFar: 1500, saturation: 1.2, contrast: 1.04, bounce: 0.08 };
const MORN = { ...DAY, ...P({ top: '#2f8df0', horizon: '#ffeccd', haze: '#fff2dc', sunColor: '#fff0d4', hemiSky: '#d8ecff', hemiGround: '#8fb060' }),
  sunI: 3.2, sunDir: v3(0.55, 0.42, 0.72), sunDisc: 1, stars: 0, moon: 0, hemiI: 1.15, amb: 0.24, envI: 0.85, exposure: 1.04, bloom: 0.3, fogNear: 260, fogFar: 1500, saturation: 1.28, contrast: 1.02, bounce: 0.45 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  const fell = e(22) - 0.1, exit = fell - 1.3;
  return { arrive: s(2) + 2.3, reveal: e(2) - 0.85, hand: s(6) + 0.55, freeze: s(7) + 0.1, turn: s(7) + 0.35, cry: s(8) + 0.05, press: s(9) + 0.1, open: s(9) + 0.5, look: s(13) + 0.1, nod: s(15) + 0.05,
    offer: s(16) - 0.25, rise: s(16) + 0.45, green: s(17) + 0.1, sweep: s(18) - 0.05, toast: s(19) - 0.3, fall: s(20) - 0.05, grab: s(21) + 0.2, run: s(21) + 0.8, exit, push: fell - 0.5, fell, flash: fell + 0.02,
    tag: e(24) - 0.75, card: s(25) + 0.5, mia: e(25) - 1.0, end: ctx.dur };
}
const RV = 24, rz = (t) => -6 - RV * (EV.exit - t);          // z of the run through the wing
const walkZ = (t) => 7.8 + Math.max(0, EV.arrive - t) * 7.2;  // Mia along the corridor

// ---- the corridor ----
function roomCard() {
  return canvasTex(256, 320, (x, w, h) => {
    const g = x.createRadialGradient(w * 0.6, h * 0.4, 8, w * 0.6, h * 0.4, 220); g.addColorStop(0, '#6b4524'); g.addColorStop(1, '#0c0705'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#120a06'; x.fillRect(20, 190, 170, 130); x.fillStyle = '#3a2a22'; x.fillRect(30, 200, 150, 40); x.fillStyle = '#d8a860'; x.fillRect(176, 130, 26, 30); x.fillStyle = '#1a100a'; x.fillRect(186, 160, 6, 60);
  });
}
function corridor() {
  const g = new THREE.Group(); ctx.scene.add(g); W.corr = g;
  const b = new Batch(), wp = wallpaper('#16332c', '#2b5a4c'), dk = surf('plank', '#2a1610', { roughness: 0.46 }), mould = paint('#1d0e09', { roughness: 0.4 }), brass = paint('#b98d3c', { metalness: 0.85, roughness: 0.32 }), cream = paint('#6f6650', { roughness: 0.7 }), black = paint('#080807', { roughness: 0.9 });
  dk.userData.span = 7;
  b.box(carpet(), HW * 2 + 0.4, 0.4, ZN + 6, 0, -0.2, ZN / 2, { r: 0.02 });
  for (const x of [-(HW - 2.4), HW - 2.4]) b.box(paint('#b08c44', { roughness: 0.6 }), 0.24, 0.03, ZN, x, 0.02, ZN / 2, { r: 0.01 });
  // a stretch of wall, with panelling below and paper above
  const wallRun = (s, z0, z1) => {
    const x = s * (HW + 0.3), m = (z0 + z1) / 2, l = z1 - z0;
    b.box(wp, 0.6, H, l, x, H / 2, m, { r: 0.01 }); b.box(dk, 0.3, 4.2, l, s * (HW - 0.02), 2.1, m, { r: 0.02 }); b.box(mould, 0.42, 0.26, l, s * (HW - 0.12), 4.25, m, { r: 0.06 }); b.box(mould, 0.42, 0.5, l, s * (HW - 0.12), 0.25, m, { r: 0.05 }); b.box(mould, 0.5, 0.5, l, s * (HW - 0.14), H - 0.25, m, { r: 0.08 }); b.box(brass, 0.08, 0.1, l, s * (HW - 0.38), H - 0.62, m, { r: 0.02 });
    const n = Math.max(1, Math.round(l / 4));
    for (let i = 0; i < n; i++) { const a = z0 + l * (i + 0.5) / n, pw = l / n - 0.7; for (const [h, d, y, zz] of [[0.1, pw, 3.45, a], [0.1, pw, 0.9, a], [2.6, 0.1, 2.17, a - pw / 2], [2.6, 0.1, 2.17, a + pw / 2]]) b.box(mould, 0.1, h, d, s * (HW - 0.2), y, zz, { r: 0.02 }); }
  };
  const inside = new THREE.MeshBasicMaterial({ map: roomCard(), color: new THREE.Color(0.9, 0.86, 0.8) });
  for (const s of [1, -1]) {
    let z = 0;
    ZD.forEach((d, k) => {
      wallRun(s, z, d - 3); z = d + 3;
      const x = s * (HW + 0.3);
      b.box(wp, 0.6, H - 10, 6, x, 10 + (H - 10) / 2, d, { r: 0.01 }); b.box(mould, 0.5, 0.5, 6, s * (HW - 0.14), H - 0.25, d, { r: 0.08 });
      for (const q of [-3.2, 3.2]) b.box(dk, 0.9, 10.5, 0.6, s * (HW + 0.05), 5.25, d + q, { r: 0.06 }); b.box(dk, 0.9, 0.7, 7, s * (HW + 0.05), 10.3, d, { r: 0.06 });
      b.box(black, 8, 0.2, 6.4, s * (HW + 4.4), 0, d, { r: 0.01 }); b.box(black, 8, 0.2, 6.4, s * (HW + 4.4), 10.2, d, { r: 0.01 }); for (const q of [-3.3, 3.3]) b.box(black, 8, 10.4, 0.2, s * (HW + 4.4), 5.1, d + q, { r: 0.01 });
      const back = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 10.2), inside); back.position.set(s * (HW + 8.2), 5.1, d); back.rotation.y = -s * Math.PI / 2; back.userData.noAO = true; g.add(back);
      const leaf = doorLeaf({ w: 6, h: 10, color: '#3c1e12', trim: '#4f2a1a' }); leaf.position.set(s * (HW + 0.3), 0, d + 3); leaf.rotation.y = s > 0 ? -0.22 + (k % 3) * 0.1 : Math.PI + 0.22 - (k % 3) * 0.1; g.add(leaf);
      const n = s > 0 ? 99 - 2 * k : 98 - 2 * k, p = plate(String(n), { w: 1.7, h: 0.8 }); p.position.set(s * (HW - 0.2), 7.6, d - 4.4); p.rotation.y = -s * Math.PI / 2; g.add(p);
    });
    wallRun(s, z, ZN + 6);
  }
  // the end wall
  const ewall = (x0, x1, y0, y1) => { const w = x1 - x0, m = (x0 + x1) / 2; b.box(wp, w, y1 - y0, 0.6, m, (y0 + y1) / 2, 0, { r: 0.01 }); if (y0 === 0) { b.box(dk, w, 4.2, 0.3, m, 2.1, 0.34, { r: 0.02 }); b.box(mould, w, 0.26, 0.42, m, 4.25, 0.42, { r: 0.06 }); b.box(mould, w, 0.5, 0.42, m, 0.25, 0.42, { r: 0.05 }); } b.box(mould, w, 0.5, 0.5, m, H - 0.25, 0.42, { r: 0.08 }); };
  ewall(-HW, -7, 0, H); ewall(-3.4, 0.7, 0, H); ewall(7.3, HW, 0, H); ewall(-7, -3.4, 6.7, H); ewall(0.7, 7.3, 11, H);
  // Door 100: casing, pediment, a lit fanlight
  for (const x of [0.25, 7.75]) { b.box(mould, 0.9, 11.4, 0.7, x, 5.7, 0.3, { r: 0.08 }); b.box(brass, 0.12, 11, 0.1, x, 5.5, 0.68, { r: 0.02 }); }
  b.box(mould, 9.2, 0.7, 0.9, 4, 11.5, 0.34, { r: 0.1 });
  // Door 000: a thin, tired frame
  const tired = paint('#3b4037', { roughness: 0.85 }); for (const x of [-7.2, -3.2]) b.box(tired, 0.4, 7, 0.5, x, 3.5, 0.2, { r: 0.04 }); b.box(tired, 4.4, 0.4, 0.5, DX, 6.9, 0.2, { r: 0.04 });
  // ceiling void, pipes
  b.box(paint('#050706'), HW * 2 + 2, 0.3, ZN + 8, 0, H + 3, ZN / 2, { r: 0.01 });
  for (const x of [-6, 2, 7]) b.cyl(paint('#2c2e2a', { metalness: 0.6, roughness: 0.5 }), 0.3, 0.3, ZN, x, H + 2, ZN / 2, { rx: Math.PI / 2 });
  // furniture
  const trolley = (x, z) => { const st = paint('#a9aeb0', { metalness: 0.8, roughness: 0.3 }), cl = paint('#c8c0ac', { roughness: 0.9 }); b.box(st, 3, 0.14, 5, x, 3, z, { r: 0.04 }); b.box(st, 3, 0.14, 5, x, 1, z, { r: 0.04 }); for (const [p, q] of [[-1.4, -2.4], [1.4, -2.4], [-1.4, 2.4], [1.4, 2.4]]) { b.cyl(st, 0.07, 0.07, 3, x + p, 1.5, z + q); b.cyl(paint('#1a1a1c'), 0.2, 0.2, 0.14, x + p, 0.2, z + q, { rz: Math.PI / 2 }); } b.box(cl, 3.2, 0.1, 5.1, x, 3.11, z, { r: 0.04 }); b.cyl(st, 0.8, 0.9, 0.12, x, 3.24, z + 1); const dome = new THREE.SphereGeometry(0.75, 16, 8, 0, 6.3, 0, 1.57); b.add(st, dome, x, 3.28, z + 1); b.cyl(paint('#e8e4dc'), 0.3, 0.2, 0.5, x + 0.6, 3.4, z - 1); b.cyl(paint('#e8e4dc'), 0.3, 0.2, 0.5, x - 0.6, 3.4, z - 1.4); };
  trolley(-8, 62);
  const table = (s, z) => { const x = s * 8.8; b.box(dk, 1.8, 0.24, 6, x, 3.5, z, { r: 0.05 }); for (const q of [-2.6, 2.6]) b.box(mould, 0.26, 3.4, 0.26, x, 1.7, z + q, { r: 0.05 }); b.cyl(paint('#2a5a4a', { roughness: 0.3 }), 0.5, 0.34, 1.4, x, 4.3, z); for (let i = 0; i < 6; i++) b.box(paint('#6a1a2a'), 0.3, 0.3, 0.3, x + Math.sin(i) * 0.5, 5.3 + (i % 3) * 0.3, z + Math.cos(i * 2) * 0.5, { r: 0.1 }); };
  table(1, 30); table(-1, 94);
  const cab = (s, z) => { const x = s * (HW - 0.3); b.box(paint('#6a1414'), 0.5, 3, 1.6, x, 6, z, { r: 0.05 }); b.cyl(paint('#c8241c', { metalness: 0.3, roughness: 0.3 }), 0.34, 0.34, 1.9, s * (HW - 0.66), 5.9, z); b.cyl(paint('#1a1a1a'), 0.16, 0.16, 0.5, s * (HW - 0.66), 7.05, z); };
  cab(-1, 46); cab(1, 78);
  b.done(g);
  const ex = (x, y, z, ry = 0) => { const e = exitSign(); e.position.set(x, y, z); e.rotation.y = ry; g.add(e); }; ex(4, 11.9 + 0.3, 0.9); ex(0, 11.3, 74); ex(0, 11.3, 34);
  // sconces
  const sc = new Batch(); const shadeG = new THREE.CylinderGeometry(0.42, 0.62, 0.9, 12);
  W.shades = []; const zs = []; for (let z = 14; z < ZN; z += 16) zs.push(z); zs.push(5);
  for (const s of [1, -1]) for (const z of zs) {
    if (z === 5 && s < 0) continue; const x = s * (HW - 0.1); sc.box(brass, 0.12, 1.3, 0.6, x, 7.9, z, { r: 0.04 }); sc.box(brass, 0.7, 0.1, 0.1, s * (HW - 0.45), 7.9, z, { r: 0.03 });
    const m = new THREE.Mesh(shadeG, new THREE.MeshBasicMaterial({ color: '#ffffff' })); m.position.set(s * (HW - 0.82), 8.3, z); m.userData.noAO = true; g.add(m);
    const gl = glowSprite('#ffffff', 7.5, 0.5); gl.material = gl.material.clone(); gl.position.set(s * (HW - 0.95), 8.3, z); gl.userData.noAO = true; g.add(gl); W.sc.push({ m, gl, z });
  }
  sc.done(g);
  // floor strips
  W.led = new THREE.MeshBasicMaterial({ color: '#000000' }); for (const s of [1, -1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, ZN), W.led); l.position.set(s * (HW - 0.6), 0.56, ZN / 2); l.userData.noAO = true; g.add(l); }
  // Door 100
  W.d100 = doorLeaf({ w: 6.6, h: 11, color: '#5a2616', trim: '#7a3c20', rows: 3, handleY: 4.7, d: 0.42 }); W.d100.position.set(7.3, 0, 0); W.d100.rotation.y = Math.PI; g.add(W.d100);
  const p100 = plate('100', { w: 2.8, h: 1.1, glow: 0.4 }); p100.position.set(3.3, 8.4, -0.3); p100.rotation.y = Math.PI; W.d100.add(p100);
  W.d100.handleW = v3(7.3 - 5.7, 4.7, 0.5);
  const gl = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.06, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 0.9) })); gl.position.set(4, 0.05, 0.35); gl.userData.noAO = true; g.add(gl);
  // the daylight behind it
  const day = new Batch(); for (const x of [0.5, 7.5]) day.box(paint('#fff4dc'), 0.4, 11, 5, x, 5.5, -2.6, { r: 0.02 }); day.done(g);
  W.sky = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 11.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.7, 3) })); W.sky.position.set(4, 5.6, -5); W.sky.userData.noAO = true; g.add(W.sky);
  // Door 000
  W.d000 = doorLeaf({ w: 3.6, h: 6.7, color: '#4a5247', trim: '#596254', rows: 2, handleY: 2.9, d: 0.24, brass: '#7a6a4a' }); W.d000.position.set(-7, 0, 0); g.add(W.d000);
  const p0 = plate('000', { w: 1.5, h: 0.62, scuff: true, lit: '#9a906e', mid: '#6e6448', glow: 0.1 }); p0.position.set(1.8, 5.3, 0.15); W.d000.add(p0);
  W.gap = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.05, 0.3), new THREE.MeshBasicMaterial({ color: '#000000' })); W.gap.position.set(DX, 0.04, 0.24); W.gap.userData.noAO = true; g.add(W.gap);
  // the wall that hides it, until it doesn't
  const hb = new Batch(); hb.box(wp, 4.8, 7.2, 0.3, 0, 3.6, 0, { r: 0.01 }); hb.box(dk, 4.8, 4.2, 0.3, 0, 2.1, 0.16, { r: 0.02 }); hb.box(mould, 4.8, 0.26, 0.42, 0, 4.25, 0.2, { r: 0.06 }); hb.box(mould, 4.8, 0.5, 0.42, 0, 0.25, 0.2, { r: 0.05 });
  W.hide = new THREE.Group(); hb.done(W.hide); W.hide.position.set(DX, 0, 0.5); g.add(W.hide); W.hideV = vanisher({ root: W.hide }, '#49ffa6');
  // the ceiling
  W.tiles = ceilingTiles(g, { x0: -HW, x1: HW, z0: 0.3, z1: ZN, H, size: 5, color: '#55524a', fall: (c) => EV.fell - 0.05 - (c.z / ZN) * 2.1 + c.r * 0.28 + (Math.abs(c.x - 4) < 6 && c.z < 7 ? 0.1 : 0) });
}

// ---- the forgotten wing and the tiny room ----
function wing() {
  const g = new THREE.Group(); ctx.scene.add(g); W.wing = g;
  const b = new Batch(), old = wallpaper('#3a3226', '#4e4432', { age: true, span: 6 }), plank = surf('plank', '#3e2c1e', { roughness: 0.7 }), dado = paint('#2a2018', { roughness: 0.7 }), L0 = DX - WHW, R0 = DX + WHW;
  plank.userData.span = 7; const zc = WZ / 2;
  b.box(plank, WHW * 2 + 0.6, 0.4, -WZ + 2, DX, -0.2, zc, { r: 0.02 });
  for (const [x, s] of [[L0 - 0.3, 1], [R0 + 0.3, -1]]) { b.box(old, 0.6, WH, -WZ, x, WH / 2, zc, { r: 0.01 }); b.box(dado, 0.2, 3, -WZ, x + s * 0.38, 1.5, zc, { r: 0.02 }); b.box(paint('#1c150f'), 0.3, 0.22, -WZ, x + s * 0.42, 3.05, zc, { r: 0.05 }); }
  b.box(paint('#040504'), WHW * 2 + 2, 0.3, -WZ + 4, DX, WH + 2.5, zc, { r: 0.01 });
  for (const s of [-1, 1]) b.cyl(paint('#3a2a1e', { metalness: 0.5 }), 0.22, 0.22, -WZ, DX + s * 1.6, WH + 1.6, zc, { rx: Math.PI / 2 });
  // doors nobody numbered
  for (let i = 0; i < 9; i++) { const z = -12 - i * 13.4, s = i % 2 ? 1 : -1, l = doorLeaf({ w: 4, h: 7.2, color: '#34322a', trim: '#3f3c32', rows: 2 }); l.position.set(s > 0 ? R0 - 0.08 : L0 + 0.08, 0, z + (s > 0 ? -2 : 2)); l.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(l); for (const q of [-2.2, 2.2]) b.box(paint('#201810'), 0.3, 7.5, 0.34, s > 0 ? R0 - 0.1 : L0 + 0.1, 3.75, z + q, { r: 0.03 }); b.box(paint('#201810'), 0.3, 0.34, 4.7, s > 0 ? R0 - 0.1 : L0 + 0.1, 7.4, z, { r: 0.03 }); }
  // the end of the wing, opening into the room
  for (const [a, c] of [[L0, -7.7], [-2.7, R0]]) b.box(old, c - a, WH, 0.6, (a + c) / 2, WH / 2, WZ, { r: 0.01 }); b.box(old, 5, WH - 7, 0.6, DX, 7 + (WH - 7) / 2, WZ, { r: 0.01 });
  // the room
  const rp = wallpaper('#2c3a48', '#3d5064', { age: true, span: 5 }), rx0 = DX - 8, rx1 = DX + 8, rc = (WZ + RZ) / 2, rl = WZ - RZ, wood = surf('plank', '#4a3020', { roughness: 0.6 });
  wood.userData.span = 6;
  b.box(wood, 16.6, 0.4, rl + 1, DX, -0.2, rc, { r: 0.02 }); b.box(paint('#3a342c', { roughness: 0.95 }), 16.6, 0.4, rl + 1, DX, RH + 0.2, rc, { r: 0.02 });
  for (const x of [rx0 - 0.3, rx1 + 0.3]) b.box(rp, 0.6, RH, rl, x, RH / 2, rc, { r: 0.01 }); b.box(rp, 16.6, RH, 0.6, DX, RH / 2, RZ - 0.3, { r: 0.01 });
  for (const [a, c] of [[rx0, -7.7], [-2.7, rx1]]) b.box(rp, c - a, RH, 0.6, (a + c) / 2, RH / 2, WZ - 0.65, { r: 0.01 });
  b.box(rp, 5, 1, 0.6, DX, RH - 0.5, WZ - 0.65, { r: 0.01 });
  for (const [a, c, z] of [[rx0, rx1, RZ + 0.1]]) b.box(paint('#1e1a16'), c - a, 0.6, 0.14, (a + c) / 2, 0.3, z, { r: 0.03 }); for (const x of [rx0 + 0.1, rx1 - 0.1]) b.box(paint('#1e1a16'), 0.14, 0.6, rl, x, 0.3, rc, { r: 0.03 });
  // a child's bed, a nightstand, a dead lamp, a suitcase, a rug
  const sh = paint('#7a6a58', { roughness: 0.95 }), wd = surf('plank', '#5a3a26');
  b.box(wd, 6, 1.1, 9.5, rx0 + 3.2, 0.9, RZ + 5.4, { r: 0.08 }); b.box(sh, 5.7, 0.9, 9.2, rx0 + 3.2, 1.8, RZ + 5.4, { r: 0.3 }); b.box(paint('#8e8a7c', { roughness: 0.95 }), 3.8, 0.6, 1.9, rx0 + 3.2, 2.45, RZ + 1.7, { r: 0.26 }); b.box(paint('#3a4c63', { roughness: 0.95 }), 5.8, 0.8, 5.5, rx0 + 3.2, 2.05, RZ + 7, { r: 0.3 }); b.box(wd, 6.2, 4, 0.4, rx0 + 3.2, 2, RZ + 0.5, { r: 0.08 });
  b.box(wd, 2.6, 3, 2.6, rx0 + 7.6, 1.5, RZ + 1.5, { r: 0.08 }); b.box(paint('#23150d'), 2.2, 0.1, 0.1, rx0 + 7.6, 2.2, RZ + 2.82, { r: 0.02 }); b.cyl(paint('#2a2a2e', { metalness: 0.5 }), 0.2, 0.34, 1, rx0 + 7.6, 3.5, RZ + 1.5); W.lampC = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 0.9, 14), new THREE.MeshStandardMaterial({ color: '#d8c49a', emissive: '#ffb066', emissiveIntensity: 0.9 })); W.lampC.position.set(rx0 + 7.6, 4.4, RZ + 1.5); g.add(W.lampC);
  b.box(paint('#6a3a22', { roughness: 0.6 }), 3.6, 2.5, 1.5, rx1 - 2.3, 1.25, WZ - 3.4, { r: 0.2, ry: 0.3 }); b.box(paint('#c8a23a', { metalness: 0.7 }), 1.2, 0.2, 0.3, rx1 - 2.3, 2.6, WZ - 3.4, { r: 0.06, ry: 0.3 });
  const rug = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#5a2a30'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c8a860'; x.lineWidth = 10; x.strokeRect(16, 16, w - 32, h - 32); x.strokeRect(46, 46, w - 92, h - 92); });
  const rm = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 8.4), new THREE.MeshStandardMaterial({ map: rug, roughness: 1 })); rm.rotation.x = -Math.PI / 2; rm.position.set(BOY.x - 1.6, 0.03, BOY.z + 3); rm.receiveShadow = true; g.add(rm);
  // a boarded window, tally marks, a child's drawings
  const bw = rx1 + 0.02; b.box(paint('#0a1210'), 0.1, 3.4, 4.6, bw - 0.1, 4.8, RZ + 8, { r: 0.02 }); for (let i = 0; i < 4; i++) b.box(surf('plank', '#6a5238'), 0.2, 0.62, 5.4, bw - 0.24, 3.6 + i * 0.84, RZ + 8, { r: 0.04, rx: (i % 2 ? 1 : -1) * 0.05 });
  const tally = canvasTex(1024, 512, (x, w, h) => { const r = rng(5); x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(226,214,188,0.92)'; x.lineWidth = 7; x.lineCap = 'round'; for (let row = 0; row < 7; row++) for (let i = 0; i < 17; i++) { const a = 18 + i * 58, y = 14 + row * 70; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(a + k * 11 + r() * 3, y + r() * 4); x.lineTo(a + k * 11 + r() * 3, y + 52); x.stroke(); } x.beginPath(); x.moveTo(a - 5, y + 44); x.lineTo(a + 42, y + 8); x.stroke(); } });
  const tm = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 3.7), new THREE.MeshStandardMaterial({ map: tally, transparent: true, roughness: 0.9, depthWrite: false })); tm.position.set(rx1 - 3.6, 5.3, RZ + 0.03); tm.userData.noAO = true; g.add(tm);
  const draw = (fn, x, y, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), new THREE.MeshStandardMaterial({ map: canvasTex(256, 200, (c, w, h) => { c.fillStyle = '#e8e0cc'; c.fillRect(0, 0, w, h); c.lineWidth = 7; c.lineCap = 'round'; fn(c, w, h); }), roughness: 1 })); m.position.set(x, y, RZ + 0.05); m.rotation.z = rot; m.userData.noAO = true; g.add(m); };
  draw((c) => { c.strokeStyle = '#3a6ad0'; c.strokeRect(100, 50, 60, 130); c.fillStyle = '#d0a020'; c.fillRect(145, 110, 8, 8); }, rx0 + 8.6, 5.8, 0.06);
  draw((c) => { c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(190, 50, 34, 0, 7); c.fill(); c.strokeStyle = '#2a9a40'; c.beginPath(); c.moveTo(0, 170); c.lineTo(256, 170); c.stroke(); c.strokeStyle = '#111'; c.beginPath(); c.arc(80, 100, 16, 0, 7); c.moveTo(80, 116); c.lineTo(80, 160); c.stroke(); }, rx0 + 10.8, 6, -0.05);
  b.done(g);
  W.wtiles = ceilingTiles(g, { x0: L0, x1: R0, z0: WZ, z1: -0.6, H: WH, size: 3.8, color: '#4a4436', floor: 0.21, fall: (c) => EV.run + (c.z - rz(EV.run)) / RV + 0.32 + c.r * 0.34 });
  // bare bulbs
  W.bulbs = []; const cord = paint('#111'); const bb = new Batch(); for (let z = -10; z > WZ; z -= 24) { bb.cyl(cord, 0.03, 0.03, 1.3, DX, WH - 0.65, z); const m = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' })); m.position.set(DX, WH - 1.4, z); m.userData.noAO = true; g.add(m); const s = glowSprite('#ffffff', 5, 0.45); s.material = s.material.clone(); s.position.copy(m.position); s.userData.noAO = true; g.add(s); W.bulbs.push({ m, s, z }); } bb.done(g);
  // chunks that come down in the room
  const r = rng(61), list = []; for (let i = 0; i < 42; i++) { const left = i % 2; list.push({ x: left ? DX - 7 + r() * 6 : 0.4 + r() * 2, y: RH - 0.3, z: RZ + 1 + r() * 18, t0: EV.fall + 0.2 + r() * 2.2 }); }
  W.chunks = rubble(g, { list, color: '#4a4438' });
  W.cracks = canvasTex(1024, 512, (x, w, h) => { x.clearRect(0, 0, w, h); const r2 = rng(8); x.strokeStyle = '#000'; x.lineWidth = 5; for (let i = 0; i < 9; i++) { let a = r2() * w, c = 0; x.beginPath(); x.moveTo(a, c); while (c < h) { a += (r2() - 0.5) * 90; c += 26 + r2() * 40; x.lineTo(a, c); } x.stroke(); } });
  W.crackM = new THREE.MeshBasicMaterial({ map: W.cracks, transparent: true, opacity: 0, depthWrite: false }); const cr = new THREE.Mesh(new THREE.PlaneGeometry(15.4, 7.6), W.crackM); cr.position.set(DX, RH / 2, RZ + 0.08); cr.userData.noAO = true; g.add(cr);
}

// ---- outside at night, and the meadow ----
function tower() {
  const g = new THREE.Group(); g.position.copy(TX); ctx.scene.add(g); W.tow = g;
  const b = new Batch(), gr = surf('grass', '#1a3a26'), road = surf('concrete', '#26282c', { roughness: 0.92 });
  b.box(gr, 900, 1, 900, 0, -0.5, 80, { r: 0.02 }); b.box(road, 900, 0.2, 34, 0, 0.1, 150, { r: 0.02 }); b.box(road, 26, 0.2, 90, 0, 0.1, 90, { r: 0.02 }); for (let i = -11; i < 12; i++) b.box(paint('#c8b860'), 11, 0.1, 0.5, i * 38, 0.24, 150, { r: 0.02 });
  for (const [x, z] of [[-30, 118], [30, 118], [-90, 133], [90, 133], [-150, 133], [150, 133]]) { b.cyl(paint('#1a1c20', { metalness: 0.5 }), 0.34, 0.5, 16, x, 8, z); b.box(paint('#1a1c20'), 3.4, 0.4, 0.6, x, 16, z, { r: 0.1 }); const m = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.2, 1.5) })); m.position.set(x, 15.5, z); m.userData.noAO = true; g.add(m); const s = glowSprite('#ffd9a0', 14, 0.5); s.position.copy(m.position); s.userData.noAO = true; g.add(s); }
  b.done(g);
  W.hotel = hotelTower(g, { floors: 16 });
  const map = canvasTex(1024, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = '900 190px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ffffff'; x.shadowBlur = 26; x.fillStyle = '#ffffff'; x.fillText('HOTEL', w / 2, h / 2 + 10); });
  W.signM = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: true }); const s = new THREE.Mesh(new THREE.PlaneGeometry(60, 15), W.signM); s.position.set(0, 9.5, 28); s.userData.noAO = true; W.hotel.roof.add(s);
  const shapes = [treeShape({ seed: 7, h: 26, r0: 1.7, r1: 0.8, spread: 13, clumps: 12, cols: ['#0e2a1c', '#1e4a30', '#2e6a40'] })], r = rng(5), list = [];
  for (let i = 0; i < 40; i++) { const x = (i % 2 ? 1 : -1) * (72 + r() * 200), z = -60 + r() * 170; list.push({ x, y: 0, z, s: 0.8 + r() * 0.6, ry: r() * 6, shape: 0 }); }
  treeSet(g, shapes, list);
  const dl = [], q = rng(11); for (let i = 0; i < 170; i++) dl.push({ x: TX.x + (q() - 0.5) * 110, y: 2 + q() * 40 * q(), z: TX.z + (q() - 0.5) * 60, t0: 0.4 + q() * 3.0, dur: 2.6, size: 24 + q() * 34, rise: 14 + q() * 22 });
  W.dust = plumes(g.parent, dl, { color: '#a8b8a0', alpha: 0.3 });
}
function meadow() {
  const g = new THREE.Group(); g.position.copy(MX); ctx.scene.add(g); W.mead = g;
  const geo = new THREE.PlaneGeometry(1600, 1600, 120, 120); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z); p.setY(i, Math.max(0, d - 40) * 0.012 * (noise1(x * 0.006 + 3) + noise1(z * 0.006 + 8) + 1) * 8); p.setXYZ(i, x, p.getY(i), z); }
  geo.computeVertexNormals(); const uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 12, p.getZ(i) / 12);
  const gm = new THREE.Mesh(geo, surf('grass', '#5aa548')); gm.receiveShadow = true; g.add(gm);
  // Door 100, the only thing left
  const b = new Batch(), mould = paint('#3a1a10', { roughness: 0.4 }); for (const x of [-3.7, 3.7]) b.box(mould, 0.9, 11.4, 0.8, x, 5.7, 0, { r: 0.08 }); b.box(mould, 9.2, 0.7, 1, 0, 11.5, 0, { r: 0.1 }); b.box(paint('#2e2a26'), 11, 0.3, 2.2, 0, 0.14, 0, { r: 0.1 }); b.done(g);
  const leaf = doorLeaf({ w: 6.6, h: 11, color: '#5a2616', trim: '#7a3c20', rows: 3, handleY: 4.7, d: 0.42 }); leaf.position.set(3.3, 0, 0); leaf.rotation.y = -Math.PI / 2 - 0.5 + Math.PI; g.add(leaf); const p100 = plate('100', { w: 2.8, h: 1.1, glow: 0.2 }); p100.position.set(3.3, 8.4, 0.3); leaf.add(p100);
  const r = rng(13), rb = new Batch(), st = surf('brick', '#7a6250'); for (let i = 0; i < 34; i++) { const a = r() * 1.6 + 2.3 - 1.57, d = 40 + r() * 44; rb.box(st, 2 + r() * 7, 1 + r() * 5, 2 + r() * 7, Math.sin(a - 0.9) * d, 0.8, -Math.abs(Math.cos(a - 0.9) * d) - 14, { r: 0.1, ry: r() * 3, rz: (r() - 0.5) * 0.6 }); } rb.done(g);
  const shapes = [treeShape({ seed: 21, h: 24, r0: 1.7, r1: 0.8, spread: 13, clumps: 13, cols: ['#2c6a33', '#4f9a3f', '#9ccb55'] }), treeShape({ seed: 22, h: 30, r0: 2, r1: 0.9, spread: 15, clumps: 14, cols: ['#2a6232', '#4a9040', '#8cc050'] })], list = [];
  for (let i = 0; i < 70; i++) { const a = r() * 6.283, d = 95 + r() * 320, x = Math.cos(a) * d, z = Math.sin(a) * d - 40; list.push({ x, y: Math.max(0, d - 40) * 0.012 * (noise1(x * 0.006 + 3) + noise1(z * 0.006 + 8) + 1) * 8 - 1, z, s: 0.8 + r() * 0.5, ry: r() * 6, shape: i % 2 }); }
  treeSet(g, shapes, list);
  // flowers and tufts
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 6, 5), new THREE.MeshStandardMaterial({ roughness: 0.7 }), 900), ts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.24, 1, 5), new THREE.MeshStandardMaterial({ color: '#4a9a3a', flatShading: true }), 2600), M = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < 900; i++) { const x = (r() - 0.5) * 120, z = (r() - 0.3) * 90; M.makeTranslation(x, 0.55 + r() * 0.3, z); fl.setMatrixAt(i, M); fl.setColorAt(i, c.set(['#ffffff', '#ffd23f', '#ff9ec4', '#c9a8ff'][i % 4])); }
  for (let i = 0; i < 2600; i++) { const x = (r() - 0.5) * 130, z = (r() - 0.3) * 100; M.makeTranslation(x, 0.45, z); ts.setMatrixAt(i, M); }
  fl.userData.noAO = ts.userData.noAO = true; fl.frustumCulled = ts.frustumCulled = false; g.add(fl); g.add(ts);
}

// ---- people ----
function people() {
  const sc = ctx.scene;
  W.mia = makeCharacter({ avatar: 'farm_mia', alti: true, skin: '#f2c79a', caustic: false }); sc.add(W.mia.root);
  W.finn = makeCharacter({ avatar: 'farm_finn', alti: true, skin: '#eebb8e', caustic: false }); W.finn.root.scale.setScalar(BS); sc.add(W.finn.root);
  // the flashlight, the beam, the map
  W.fl = flashlight(); W.fl.position.set(0, -2.15, 0.15); W.fl.scale.setScalar(1.1); W.finn.arms[1].add(W.fl);
  W.cone = shaft(sc, { parent: W.fl, from: v3(0, -1, 0), to: v3(0, -13, 0), top: 0.24, bottom: 3.1, color: '#fff0c4', amount: 0.26 });
  W.flash = new THREE.SpotLight('#fff0cc', 0, 34, 0.42, 0.7, 1.4); sc.add(W.flash); sc.add(W.flash.target);
  const map = canvasTex(768, 576, (x, w, h) => {
    x.fillStyle = '#e8dcbc'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5a4630'; x.lineWidth = 6; x.strokeRect(14, 14, w - 28, h - 28); x.fillStyle = '#3a2a1a'; x.font = '900 42px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('FLOOR MAP', w / 2, 62);
    x.strokeStyle = '#3a2a1a'; x.lineWidth = 8; x.strokeRect(290, 92, 190, 450); x.font = '800 22px ITTInter, sans-serif';
    for (let i = 0; i < 7; i++) { const y = 470 - i * 56; for (const [a, n] of [[230, 98 - 2 * i], [486, 99 - 2 * i]]) { x.strokeStyle = '#3a2a1a'; x.lineWidth = 4; x.strokeRect(a, y, 54, 40); x.fillStyle = '#3a2a1a'; x.fillText(String(n), a + 27, y + 27); x.strokeStyle = '#2f9a4a'; x.lineWidth = 6; x.beginPath(); x.moveTo(a + 8, y + 22); x.lineTo(a + 20, y + 34); x.lineTo(a + 46, y + 6); x.stroke(); } }
    x.fillStyle = '#c0392b'; x.fillRect(345, 92, 80, 34); x.fillStyle = '#fff'; x.fillText('100', 385, 117);
  });
  map.wrapS = THREE.RepeatWrapping; map.repeat.x = -1; map.offset.x = 1;   // read from behind her shoulder
  W.map = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.25), new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.9, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.14 })); W.map.position.set(0.7, -2.5, 0.75); W.map.rotation.set(1.1, 0, 0.1); W.map.userData.noAO = true; W.mia.arms[0].add(W.map);
  // name tags
  const tag = (text, col) => { const c = document.createElement('canvas'); c.width = 1024; c.height = 160; const x = c.getContext('2d'), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); s.userData.noAO = true; s.text = null;
    s.set = (v) => { if (v === s.text) return; s.text = v; x.clearRect(0, 0, 1024, 160); x.font = '900 112px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = 18; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(v, 512, 82); x.fillStyle = col; x.fillText(v, 512, 82); t.needsUpdate = true; }; s.set(text); return s; };
  W.tagM = tag('Mia', '#ffffff'); W.tagM.scale.set(5.2, 0.81, 1); W.tagM.position.y = 7.4; W.mia.root.add(W.tagM);
  W.tagB = tag('', '#ffe9a0'); W.tagB.scale.set(5.6, 0.875, 1); W.tagB.position.y = 7.3; W.finn.root.add(W.tagB);
}

// ---- lights: 10 points and a shadow key, moved to the set in shot ----
function rig() {
  W.pl = []; for (let i = 0; i < 10; i++) { const l = new THREE.PointLight('#ffffff', 0, 40, 1.5); ctx.scene.add(l); W.pl.push(l); }
  W.key = new THREE.SpotLight('#ffd6a0', 0, 70, 0.7, 0.7, 1.2); W.key.castShadow = true; W.key.shadow.mapSize.set(1024, 1024); W.key.shadow.bias = -0.0008; W.key.shadow.normalBias = 0.04; ctx.scene.add(W.key); ctx.scene.add(W.key.target);
}
const greenAt = (z, t) => smooth(EV.green + (z / ZN) * 1.15, EV.green + (z / ZN) * 1.15 + 0.1, t);
const flick = (t, i, a = 0.14) => { const n = noise1(t * 7 + i * 13); return 1 - a * Math.max(0, n) - (noise1(t * 1.3 + i * 5) > 0.72 ? 0.5 : 0); };
function lightSet(set, t) {
  const pl = W.pl, off = (i) => { for (let k = i; k < 10; k++) pl[k].intensity = 0; }, e = EV;
  W.key.intensity = 0; W.flash.intensity = 0;
  if (set === 'corr') {
    for (let i = 0; i < 8; i++) { const z = 6 + i * 16, l = pl[i], k = greenAt(z, t), blink = k > 0 && k < 1 ? 2 : 1; l.position.set(i % 2 ? -7.6 : 7.6, 8.2, z); l.color.copy(tmpC.copy(WARM).lerp(GRN, k)); l.intensity = lerp(62 * flick(t, i), 120, k) * blink; l.distance = 42; }
    pl[8].position.set(4, 9, 5); pl[8].color.copy(tmpC.set('#ffcf8e').lerp(GRN, greenAt(0, t))); pl[8].intensity = 44; pl[8].distance = 26;
    pl[9].position.set(DX, 5.5, 4.5); pl[9].color.copy(GRN); pl[9].intensity = 20 * smooth(e.reveal, e.reveal + 0.5, t) + 6; pl[9].distance = 18;
    W.key.position.set(4, 11, 42); W.key.target.position.set(0, 2, 2); W.key.color.copy(tmpC.set('#ffd6a0').lerp(GRN, greenAt(0, t))); W.key.intensity = 300; W.key.distance = 80; W.key.angle = 0.42;
  } else if (set === 'wing') {
    const g = t >= e.green ? 1 : 0;
    for (let i = 0; i < 6; i++) { const z = -10 - i * 24, l = pl[i]; l.position.set(DX, WH - 1.7, z); l.color.copy(g ? GRN : WARM); l.intensity = g ? 90 * flick(t, i, 0.4) : 40; l.distance = 34; }
    pl[6].position.set(DX, 6, -2); pl[6].color.copy(GRN); pl[6].intensity = 80; pl[6].distance = 30;
    off(7);
  } else if (set === 'room') {
    const g = t >= e.green ? 1 : 0, A = pl[0], B = pl[1], C = pl[2];
    A.position.set(DX - 0.6, 4.6, RZ + 1.8); A.color.set('#ffb066'); A.intensity = g ? 0 : 40 * flick(t, 2, 0.1); A.distance = 26;     // the lamp
    B.position.set(DX, 6.8, WZ - 4); B.color.copy(g ? GRN : tmpC.set('#c8d0e0')); B.intensity = g ? 70 * flick(t, 5, 0.3) : 34; B.distance = 34;
    C.position.set(BOY.x - 4, 6.4, BOY.z + 7); C.color.copy(g ? GRN : tmpC.set('#ffd9b0')); C.intensity = g ? 50 : 26; C.distance = 22;
    off(3);
    W.key.position.set(DX + 3, 7.4, WZ - 2); W.key.target.position.set(BOY.x - 2, 2, BOY.z + 3); W.key.color.copy(g ? GRN : tmpC.set('#e8e0d0')); W.key.intensity = g ? 130 : 150; W.key.distance = 40; W.key.angle = 0.72;
  } else off(0);
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, S = [], add = (name, t0, f) => S.push({ name, t0: () => t0, f, t1: () => 0 });
  add('hall', 0, (u, t) => { const z = walkZ(t); return { pos: v3(lerp(1.4, 0.8, u), 3.5, z - lerp(13, 11.5, u)), look: v3(0, 3.1, z), fov: 54 }; });
  add('left', s(1) - 0.1, (u, t) => { const z = walkZ(t); return { pos: v3(-4.2, 4.6, z - 7.2), look: v3(-0.1, 3.9, z + 0.5), fov: 40 }; });
  add('reach', s(2) - 0.15, (u, t) => { const z = walkZ(t), k = easeOut(u); return { pos: v3(lerp(-0.6, -0.6, k), lerp(3.8, 5, k), Math.max(z + 22, 30)), look: v3(-0.6, lerp(4.4, 4.9, k), 0), fov: 50 }; });
  add('d100', s(3) - 0.1, (u) => ({ pos: lp3(v3(5.6, 2.8, 17), v3(4.4, 5.6, 12.5), easeInOut(u)), look: v3(3.8, lerp(5.4, 7.2, u), 0), fov: 46 }));
  add('d000', s(4) - 0.1, (u) => ({ pos: lp3(v3(-3.4, 3.2, 17), v3(-3.8, 3.4, 14), easeOut(u)), look: v3(-2.6, 4.4, 0), fov: 50 }));
  add('map', s(5) - 0.1, (u) => ({ pos: v3(-1.8, 7.4, 9.3 - u * 0.4), look: v3(-0.8, 3.6, 3.6), fov: 40 }));
  add('ignore', s(6) - 0.1, (u) => ({ pos: lp3(v3(-5.6, 5.0, 5.8), v3(-5.2, 4.9, 5.3), u), look: v3(1.8, 3.6, 1.0), fov: 48 }));
  add('cry', s(7) - 0.1, (u) => ({ pos: v3(-3.8, 4.8, lerp(5.2, 4.7, u)), look: v3(1.6, 4.3, 2.2), fov: 38 }));
  add('gap', s(8) - 0.15, (u) => ({ pos: lp3(v3(DX + 1.8, 0.8, 7.4), v3(DX + 1.2, 1.0, 6.2), u), look: v3(DX, 2.2, 0), fov: 52 }));
  add('open', s(9) - 0.1, (u) => ({ pos: v3(0.6, 4.2, 9), look: v3(-4.4, 3.2, -0.8), fov: 48 }));
  add('room', s(10) - 0.1, (u) => { const a = lerp(-0.5, 0.05, easeInOut(u)); return { pos: v3(DX + 1.2, 4.6, WZ - 1.8), look: v3(DX + 1.2 + Math.sin(a) * 10, 3.6, WZ - 1.8 - Math.cos(a) * 10), fov: 66 }; });
  add('boy', s(11) - 0.1, (u) => ({ pos: lp3(v3(-6.4, 4.6, WZ - 4), v3(-5.4, 3.8, WZ - 6), u), look: v3(BOY.x - 0.6, 1.5, BOY.z), fov: 46 }));
  add('lookup', s(12) - 0.1, (u) => ({ pos: lp3(v3(-3.6, 2.2, BOY.z + 7.2), v3(-3, 2.2, BOY.z + 5.8), easeOut(u)), look: v3(BOY.x - 0.2, 1.3, BOY.z), fov: 40 }));
  add('asks', s(14) - 0.15, (u) => ({ pos: v3(-2.8, 3.1, BOY.z + 5), look: v3(BOY.x - 0.1, 1.5, BOY.z + 0.2), fov: 38 }));
  add('nod', s(15) - 0.1, (u) => ({ pos: lp3(v3(-2.1, 3.7, BOY.z + 12.5), v3(-2.0, 3.6, BOY.z + 11.5), u), look: v3(-2.9, 3.5, BOY.z), fov: 58 }));
  add('green', e.green - 0.15, (u) => ({ pos: lp3(v3(0.6, 3, 126), v3(0.4, 4, 116), u), look: v3(0, 6.6, 0), fov: 62 }));
  add('tower', s(18) - 0.1, (u) => ({ pos: TX.clone().add(lp3(v3(-90, 16, 250), v3(-50, 10, 214), easeOut(u))), look: TX.clone().add(v3(0, 84, 0)), fov: 56 }));
  add('fall', s(20) - 0.1, (u) => ({ pos: TX.clone().add(lp3(v3(60, 4, 205), v3(70, 7, 225), u)), look: TX.clone().add(v3(0, 72 - u * 30, 0)), fov: 60 }));
  add('grab', s(21) - 0.05, (u) => ({ pos: lp3(v3(-2.2, 3.8, BOY.z + 11.5), v3(-2.1, 3.7, BOY.z + 10.5), u), look: v3(-2.6, 3.5, BOY.z), fov: 58 }));
  add('run', e.run + 0.05, (u, t) => { const z = rz(t); return { pos: v3(DX + lerp(2.5, 2.2, u), 3.6, z + lerp(10.5, 12.5, u)), look: v3(DX + 0.6, 3.0, z - 1.6), fov: 56 }; });
  add('burst', e.exit, (u) => ({ pos: v3(-1, 4.8, lerp(16, 15, u)), look: v3(0.4, 4.6, 0), fov: 54 }));
  add('sky', s(23) - 0.25, (u) => ({ pos: MX.clone().add(lp3(v3(-1.5, 2.4, 25), v3(-1, 5, 22), easeOut(u))), look: MX.clone().add(v3(0, lerp(9, 5, u), 0)), fov: 56 }));
  add('tag', s(24) - 0.1, (u) => ({ pos: MX.clone().add(lp3(v3(0, 3.6, 21), v3(0.2, 3.8, 18), easeInOut(u))), look: MX.clone().add(v3(0.1, 3.9, 7)), fov: 46 }));
  add('name', s(25) - 0.05, (u) => ({ pos: MX.clone().add(lp3(v3(2.1, 3.2, 17), v3(2.0, 3.4, 15.2), u)), look: MX.clone().add(v3(1.9, 4.3, 7)), fov: 44 }));
  add('mia', e.mia, (u) => ({ pos: MX.clone().add(lp3(v3(-1.9, 4.8, 13.6), v3(-1.9, 5, 11.4), easeOut(u))), look: MX.clone().add(v3(-1.9, 4.5, 7)), fov: 38 }));
  S.forEach((x, i) => { if (S[i + 1]) { const v = S[i + 1].t0(); x.t1 = () => v; } });
  S[S.length - 1].t1 = () => ctx.dur + 1;
  return S;
}

// ---- screen ----
const F = (px) => `900 ${px}px ITTInter, sans-serif`;
function hudInit() { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; c.style.cssText = 'position:absolute;inset:0;pointer-events:none;'; ctx.grade.after(c); W.hud = c; W.h2 = c.getContext('2d'); }
const pop = (k) => { const c = clamp(k), o = 1 + 2.2 * Math.pow(c - 1, 3) + 1.2 * Math.pow(c - 1, 2); return c <= 0 ? 0 : o; };
function rr(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
function counter(x, t, n) {
  const a = 52, b = 168, red = n === 'left';
  x.fillStyle = 'rgba(6,14,12,0.74)'; rr(x, a, b, 388, 96, 20); x.fill(); x.strokeStyle = red ? '#ffd23f' : '#3bf09a'; x.lineWidth = 5; x.stroke();
  x.font = F(26); x.fillStyle = '#9fe8c4'; x.textAlign = 'left'; x.fillText('DOORS OPENED', a + 24, b + 36);
  x.font = F(46); x.fillStyle = red ? '#ffd23f' : '#ffffff'; x.fillText('99 / 100', a + 24, b + 82);
}
function toast(x, t) {
  const k = pop((t - EV.toast) / 0.26), out = 1 - smooth(EV.fall + 0.5, EV.fall + 0.9, t); if (k <= 0 || out <= 0) return;
  x.save(); x.globalAlpha = out; x.translate(540, 470); x.scale(k, k); x.fillStyle = 'rgba(4,26,16,0.94)'; rr(x, -470, -128, 940, 256, 34); x.fill(); x.strokeStyle = '#2bff8e'; x.lineWidth = 9; x.stroke();
  x.shadowColor = '#2bff8e'; x.shadowBlur = 40; x.fillStyle = '#2bff8e'; x.beginPath(); x.arc(-352, 0, 74, 0, 7); x.fill(); x.shadowBlur = 0; x.strokeStyle = '#04261a'; x.lineWidth = 20; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(-386, 2); x.lineTo(-360, 30); x.lineTo(-316, -30); x.stroke();
  x.textAlign = 'left'; x.fillStyle = '#ffffff'; x.font = F(84); x.fillText('LOST PLAYER', -252, -14); x.fillStyle = '#2bff8e'; x.fillText('RECOVERED', -252, 76); x.restore();
}
function card(x, t) {
  const k = pop((t - EV.card) / 0.28); if (k <= 0) return;
  x.save(); x.translate(540, 1500); x.scale(k, k); x.fillStyle = 'rgba(12,16,28,0.92)'; rr(x, -440, -96, 880, 192, 28); x.fill(); x.strokeStyle = '#ffd23f'; x.lineWidth = 6; x.stroke();
  x.fillStyle = '#26324a'; x.beginPath(); x.arc(-350, 0, 62, 0, 7); x.fill(); x.fillStyle = '#7a8aa8'; x.beginPath(); x.arc(-350, -14, 24, 0, 7); x.fill(); x.beginPath(); x.ellipse(-350, 42, 40, 26, 0, 3.14, 6.28); x.fill();
  x.textAlign = 'left'; x.fillStyle = '#ffe9a0'; x.font = F(54); x.fillText(USER, -264, -14); x.fillStyle = '#ff6a78'; x.font = F(40); x.fillText('Last online: 5 years ago', -264, 52); x.restore();
}
function drawHud(t, n) {
  const x = W.h2; x.clearRect(0, 0, 1080, 1920); if (ctx.thumbMode) return;
  if (['hall', 'left'].includes(n)) counter(x, t, n);
  if (n === 'tower' || n === 'fall') toast(x, t);
  if (n === 'name' || n === 'mia') card(x, t);
}

// ---- hands ----
const hand = (c, i) => { c.root.updateMatrixWorld(true); return c.arms[i].localToWorld(v3(0, -ARM, 0.05)); };
function armTo(c, i, y) { const sy = c.arms[i].getWorldPosition(v3(0, 0, 0)).y, len = ARM * c.root.scale.y; return Math.acos(clamp((sy - y) / len, -1, 1)); }
const snap = (c, i, p) => { const h = hand(c, i); c.root.position.x += p.x - h.x; c.root.position.z += p.z - h.z; };

function setBoy(st, t, n) {
  const B = W.finn, e = EV, A = B.arms;
  if (st === 'sit') {
    B.root.position.copy(BOY); B.root.rotation.y = -0.62; pose(B, 'sit', t);
    A[0].rotation.x = -0.75; A[0].rotation.z = 0.08; A[1].rotation.x = -0.72 - 0.05 * Math.sin(t * 0.8); A[1].rotation.z = -0.14;
    const k = smooth(e.look - 0.1, e.look + 0.45, t); B.neck.rotation.x = lerp(0.3, -0.42, k); B.neck.rotation.y = lerp(0, -0.25, k); B.torso.rotation.x = lerp(0.2, -0.04, k) + Math.sin(t * 7) * 0.012 * (1 - k);
  }
}
function faceOf(c, name, t, ph, viseme) { c.setFace(name, { blink: blinkAt(t, ph) && !['shocked', 'terrified'].includes(name), viseme }); }

// ---- a frame ----
function renderAt(t) {
  const first = !ctx.sub || ctx.sub.i === 0, sh = shotAt(W.shots, t), n = sh.name, e = EV, M = W.mia, B = W.finn, [ML, MR] = M.arms, [BL, BR] = B.arms;
  const sets = { hall: 'corr', left: 'corr', reach: 'corr', d100: 'corr', d000: 'corr', map: 'corr', ignore: 'corr', cry: 'corr', gap: 'corr', open: 'corr', green: 'corr', burst: 'corr', room: 'room', boy: 'room', lookup: 'room', asks: 'room', nod: 'room', grab: 'room', run: 'wing', tower: 'out', fall: 'out', sky: 'mead', tag: 'mead', name: 'mead', mia: 'mead' };
  const set = sets[n];
  applyEnv(ctx, set === 'out' ? TOWER : set === 'mead' ? MORN : t > e.green ? mixP(HOTEL, EMERG, smooth(e.green, e.green + 0.9, t)) : HOTEL);
  lightSet(set, t);
  W.corr.visible = set === 'corr'; W.wing.visible = set === 'room' || set === 'wing' || n === 'open'; W.tow.visible = W.dust.visible = set === 'out'; W.mead.visible = set === 'mead';
  W.clouds.visible = set === 'mead';
  // the corridor's lamps
  if (set === 'corr') {
    W.sc.forEach(({ m, gl, z }, i) => { const k = greenAt(z, t), f = flick(t, i), c = tmpC.copy(WARM).lerp(GRN, k); m.material.color.copy(c).multiplyScalar(lerp(2.4 * f, 3.2, k)); gl.material.color.copy(c); gl.material.opacity = lerp(0.5 * f, 0.7, k); });
    W.led.color.copy(GRN).multiplyScalar(lerp(0.34, 2.4, smooth(e.green, e.green + 1.2, t)));
    W.hideV.set(clamp((t - e.reveal) / 0.7)); W.hide.visible = t < e.reveal + 0.75;
    W.air.list.spark.visible = t > e.reveal && t < e.open + 1; const crying = t > e.cry - 0.3 && t < e.open + 0.3; W.gap.material.color.setRGB(1, 0.9, 0.6).multiplyScalar(t < e.reveal + 0.6 ? 0 : (crying ? 1.5 + 1.2 * Math.max(0, noise1(t * 9)) : 0.4));
    W.d000.rotation.y = 1.75 * easeInOut(clamp((t - e.open) / 0.9));
    if (t >= e.exit) W.d000.rotation.y = 1.75;
    W.d100.rotation.y = Math.PI - 1.45 * easeOut(clamp((t - e.push) / 0.32));
    W.sky.visible = t > e.push - 0.1; W.tiles.update(t);
  }
  if (set === 'room' || set === 'wing' || n === 'open') {
    W.wtiles.update(t); W.chunks.update(t); W.crackM.opacity = smooth(e.fall, e.fall + 0.4, t);
    W.bulbs.forEach(({ m, s, z }, i) => { const c = t >= e.green ? GRN : WARM, f = t >= e.green ? flick(t, i, 0.5) : 1; m.material.color.copy(c).multiplyScalar(2.6 * f); s.material.color.copy(c); });
    W.lampC.material.emissiveIntensity = t >= e.green ? 0.05 : 0.9;
  }
  if (set === 'out') { W.hotel.update(e.sweep, 1.1, e.fall, t); W.signM.color.copy(tmpC.set('#ffcf8e').lerp(GRN, smooth(e.sweep + 0.7, e.sweep + 1.1, t))).multiplyScalar(2); W.dust.update(t - e.fall); W.dust.visible = t > e.fall; }

  // ---- Mia ----
  let walk = false, yaw = Math.PI;
  W.map.visible = n === 'map'; W.tagM.visible = ['hall', 'reach', 'open', 'room'].includes(n) === true && n !== 'run';
  W.fl.visible = W.cone.visible = false; M.root.visible = true; B.root.visible = false; B.root.rotation.set(0, 0, 0);
  const mp = M.root.position; M.torso.rotation.set(0, 0, 0);
  if (['hall', 'left', 'reach', 'd100', 'd000', 'map'].includes(n)) {
    const z = walkZ(t); mp.set(n === 'map' || n === 'd000' || n === 'd100' ? 0 : 0, 0, z); M.root.rotation.y = Math.PI;
    if (t < e.arrive) pose(M, 'walk', t); else pose(M, 'idle', t);
    if (n === 'map') { ML.rotation.x = -1.35; ML.rotation.z = -0.12; M.neck.rotation.x = 0.34; }
    if (n === 'reach') M.neck.rotation.x = t > e.reveal ? -0.05 : 0;
    faceOf(M, n === 'left' ? 'focused' : n === 'map' ? 'suspicious' : t > e.reveal ? 'surprised' : 'focused', t, 0.3);
  } else if (n === 'ignore' || n === 'cry') {
    const w = clamp((t - L(6).start) / 0.7), turn = n === 'cry' ? smooth(e.turn, e.turn + 0.45, t) : 0;
    mp.set(lerp(0, 2.2, easeInOut(w)), 0, lerp(7.8, 2.8, easeInOut(w))); M.root.rotation.y = Math.PI + turn * Math.PI / 2;
    if (w < 1) pose(M, 'walk', t); else pose(M, 'idle', t);
    const k = smooth(e.hand - 0.25, e.hand, t) * (1 - turn);
    if (k > 0) { M.root.updateMatrixWorld(true); const a = armTo(M, 0, W.d100.handleW.y); ML.rotation.x = -a * k; ML.rotation.z = 0; if (k >= 1) snap(M, 0, W.d100.handleW); }
    faceOf(M, n === 'cry' ? (t > e.turn ? 'scared' : 'surprised') : 'nervous', t, 0.3);
  } else if (n === 'gap') {
    mp.set(1.2, 0, 3.6); M.root.rotation.y = -Math.PI / 2; pose(M, 'idle', t); faceOf(M, 'scared', t, 0.3);
  } else if (n === 'open') {
    const k = clamp((t - L(9).start + 0.1) / (e.press - L(9).start + 0.1)), inn = smooth(e.open + 0.5, e.open + 1.3, t);
    mp.set(lerp(0.2, -3.0, easeInOut(k)), 0, lerp(4.2, 2.2, easeInOut(k))); M.root.rotation.y = lerp(-Math.PI / 2, -Math.PI + 0.25, easeInOut(k)); if (k < 1) pose(M, 'walk', t); else pose(M, 'lean', t, { amt: 0.4 });
    if (k >= 1) { const h = W.d000; h.updateMatrixWorld(true); const p = h.localToWorld(h.handle.clone()); M.root.updateMatrixWorld(true); const a = armTo(M, 1, p.y); MR.rotation.x = -a; MR.rotation.z = 0; const REL = 0.25; if (t < e.open + REL) snap(M, 1, p); else {
      // let go and walk in, centred on the doorway (from where the hand let go)
      const r0 = h.rotation.y; h.rotation.y = 1.75 * easeInOut(clamp(REL / 0.9)); h.updateMatrixWorld(true); snap(M, 1, h.localToWorld(h.handle.clone())); h.rotation.y = r0; h.updateMatrixWorld(true);
      const x0 = mp.x, z0 = mp.z, w = smooth(e.open + REL, e.open + 0.9, t); mp.set(lerp(x0, DX, w), 0, lerp(z0, z0 - 3.5, smooth(e.open + 0.8, e.open + 2.3, t)));
      M.root.rotation.y = lerp(-Math.PI + 0.25, -Math.PI, w); if (w > 0.5) pose(M, 'walk', t); MR.rotation.x = lerp(-a, 0, w); } }
    faceOf(M, 'nervous', t, 0.3);
  } else if (n === 'room') {
    mp.set(lerp(-5.8, -5.4, t - L(10).start), 0, WZ - 3 - clamp((t - L(10).start) / 2) * 1.4); M.root.rotation.y = Math.PI; pose(M, 'walk', t); faceOf(M, 'surprised', t, 0.3); M.root.visible = false;
  } else if (['boy', 'lookup', 'asks', 'nod'].includes(n)) {
    mp.set(-3.4, 0, BOY.z + 3.6); M.root.rotation.y = Math.atan2(BOY.x - mp.x, BOY.z - mp.z) + 0.1;
    pose(M, 'idle', t); M.neck.rotation.x = 0.28; M.root.visible = n === 'nod';
    if (n === 'nod') { mp.set(-4.4, 0, BOY.z + 0.3); M.root.rotation.y = 0.95; }
    if (n === 'boy') { mp.set(-5.8, 0, WZ - 9); M.root.rotation.y = Math.atan2(BOY.x - mp.x, BOY.z - mp.z); }
    if (n === 'nod') {
      const a = t - e.nod; M.neck.rotation.x = 0.26 + (a > 0 && a < 0.8 ? 0.2 * Math.sin(a * 15.7) : 0); pose; M.torso.rotation.x = 0.16 * smooth(e.offer, e.offer + 0.3, t);
    }
    faceOf(M, n === 'nod' ? 'happy' : 'nervous', t, 0.3);
  } else if (n === 'grab') {
    mp.set(-4.0, 0, BOY.z + 0.3); pose(M, 'idle', t); M.root.rotation.y = 0.95; faceOf(M, 'terrified', t, 0.3);
  } else if (n === 'run') {
    mp.set(DX + 0.1, 0, rz(t)); M.root.rotation.y = 0; pose(M, 'run', t * 1.2); faceOf(M, 'terrified', t, 0.3); M.neck.rotation.x = -0.1;
  } else if (n === 'burst') {
    const k = clamp((t - e.exit) / (e.fell - e.exit)), p = burstPath(k); mp.set(p.x, 0, p.z); const q = burstPath(Math.min(1, k + 0.04)); M.root.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); pose(M, 'run', t * 1.2); faceOf(M, 'terrified', t, 0.3);
    M.root.visible = k < 0.97;
  } else {
    // the meadow
    mp.copy(MX).add(v3(-1.9, 0, 7)); M.root.rotation.y = n === 'mia' ? 0.28 : n === 'name' ? 0.5 : n === 'tag' ? 0.34 : 0; pose(M, 'idle', t);
    if (n === 'tag') M.root.rotation.y = 0.2; const hard = n === 'sky' ? 1 - clamp((t - L(23).start) / 2) : 0; M.torso.rotation.x = 0.14 * hard + Math.sin(t * 5) * 0.012 * hard; M.neck.rotation.x = n === 'sky' ? -0.3 * clamp((t - L(23).start) / 1) : 0;
    if (n === 'mia' || n === 'name') { M.neck.rotation.y = 0.28; ML.rotation.x = -0.42; MR.rotation.x = -0.42; ML.rotation.z = 0.12; MR.rotation.z = -0.12; }
    faceOf(M, n === 'mia' || n === 'name' ? 'shocked' : t > e.tag ? 'surprised' : 'happy', t, 0.3);
  }

  // ---- the boy ----
  const seen = ['room', 'boy', 'lookup', 'asks', 'nod', 'grab', 'run', 'burst', 'sky', 'tag', 'name', 'mia'].includes(n);
  B.root.visible = seen && n !== 'room' || n === 'room';
  if (n === 'room' && false) B.root.visible = false;
  if (['room', 'boy', 'lookup', 'asks'].includes(n)) {
    setBoy('sit', t, n); W.fl.visible = W.cone.visible = true;
    const sp = L(14); faceOf(B, n === 'asks' ? 'nervous' : t > e.look ? 'scared' : 'sad', t, 0.8, visemeAt(sp.text || 'did you find the exit', sp.start + 0.03, sp.end - 0.03, t));
  } else if (n === 'nod') {
    const r = smooth(e.rise, e.rise + 0.75, t), off = smooth(e.offer, e.offer + 0.3, t), rel = smooth(L(16).end + 0.1, L(16).end + 0.4, t);
    B.root.position.copy(BOY); B.root.rotation.y = -0.95; pose(B, 'sit', t); const H0 = B.hipY ?? 2, sitY = B.hips.position.y;
    B.hips.position.y = lerp(sitY, H0, easeInOut(r)); const leg = lerp(-1.45, 0, easeInOut(r)); B.legs[0].rotation.x = leg; B.legs[1].rotation.x = leg; B.torso.rotation.x = lerp(0.02, 0.05, r);
    BR.rotation.x = -0.7; BR.rotation.z = -0.14; BL.rotation.x = lerp(-0.75, -1.6, off) ; B.neck.rotation.x = lerp(-0.42, -0.34, r); B.neck.rotation.y = -0.25;
    W.fl.visible = W.cone.visible = true;
    if (off > 0.95) { const hp = hand(B, 0); M.root.updateMatrixWorld(true); const a = armTo(M, 0, hp.y); ML.rotation.x = -a; ML.rotation.z = 0; const hm = hand(M, 0); B.root.position.x += hm.x - hp.x; B.root.position.z += hm.z - hp.z; void rel; }
    else if (off > 0) { ML.rotation.x = -1.2 * off; }
    faceOf(B, t > L(16).start ? 'happy' : 'scared', t, 0.8);
  } else if (n === 'grab') {
    B.root.position.set(-1.0, 0, BOY.z + 0.2); B.root.rotation.y = -0.95; pose(B, 'scared', t); W.fl.visible = true; W.cone.visible = false; BL.rotation.x = -0.3; BL.rotation.z = 0;
    const k = smooth(e.grab - 0.2, e.grab + 0.05, t);
    if (k > 0) { BL.rotation.x = lerp(-0.3, -1.25, k); MR.rotation.x = lerp(0, -1.1, k); MR.rotation.z = 0; if (k >= 1) { const hm = hand(M, 1), hp = hand(B, 0); B.root.position.x += hm.x - hp.x; B.root.position.z += hm.z - hp.z; } }
    if (t > e.grab + 0.28) { const q = (t - e.grab - 0.28) * 7; mp.z += q * 0.6; }
    faceOf(B, 'scared', t, 0.8);
  } else if (n === 'run' || n === 'burst') {
    pose(B, 'run', t * 1.3 + 0.8); B.root.position.copy(mp); B.root.rotation.y = M.root.rotation.y;
    MR.rotation.x = 0.85; MR.rotation.z = -0.3; BL.rotation.x = -1.3; BL.rotation.z = 0; BR.rotation.x = 0.4 + Math.sin(t * 16) * 0.4;
    const hm = hand(M, 1), hp = hand(B, 0); B.root.position.x += hm.x - hp.x; B.root.position.z += hm.z - hp.z; W.fl.visible = true; W.cone.visible = false;
    faceOf(B, 'scared', t, 0.8); B.root.visible = n === 'run' || clamp((t - e.exit) / (e.fell - e.exit)) < 0.9;
  } else if (['sky', 'tag', 'name', 'mia'].includes(n)) {
    B.root.position.copy(MX).add(v3(1.9, 0, 7.2)); B.root.rotation.y = n === 'name' ? -0.14 : -0.26; pose(B, 'idle', t + 2); W.fl.visible = true; W.cone.visible = false; BR.rotation.x = -0.1;
    B.neck.rotation.x = n === 'sky' ? -0.36 : -0.1; faceOf(B, 'happy', t, 0.8); B.root.visible = n !== 'mia';
  }
  // the name, a letter at a time
  W.tagB.visible = ['tag', 'name'].includes(n) && t >= e.tag;
  if (W.tagB.visible) { const k = clamp((t - e.tag) / 0.7), m = Math.floor(k * USER.length), G = '#@%?01X'; W.tagB.set(USER.slice(0, m) + (m < USER.length ? G[Math.floor(t * 24) % G.length] : '')); }
  W.tagM.visible = W.tagM.visible && M.root.visible;
  // the flashlight's real beam
  if (W.fl.visible && W.cone.visible) { B.root.updateMatrixWorld(true); W.fl.lens.getWorldPosition(W.flash.position); W.fl.localToWorld(W.flash.target.position.set(0, -9, 0)); W.flash.intensity = 240 * (t >= e.green ? 0.3 : 1) * (1 - 0.1 * Math.max(0, noise1(t * 5))); W.cone.material.uniforms.amount.value = 0.24; }

  // key follows in the corridor; a warm wash in shots with Mia
  if (set === 'corr') { W.key.target.position.lerpVectors(W.key.target.position, mp, 1); W.key.target.position.y = 3; }
  W.air.update(t); leafTime(t, 0.06);
  const a = W.air.list; a.dust1.visible = set === 'corr' || set === 'room' || set === 'wing'; a.spark.visible = a.spark.visible && set === 'corr'; a.gold.visible = set === 'mead'; a.fall2.visible = set === 'corr';
  a.dust1.position.set(set === 'corr' ? 0 : DX, 0, set === 'corr' ? mp.z : set === 'room' ? -140 : mp.z);
  // camera shake and flashes
  const rumble = t > e.fall - 0.2 && t < e.flash + 0.05 ? 1 : 0;
  const shk = { fall: 1.1, grab: 0.5, run: 0.55, burst: 0.75, green: 0.05 }[n] ?? 0;
  const span = set === 'out' ? 340 : set === 'mead' ? 130 : 70;
  const wh = t >= e.flash - 0.12 && t < L(23).start + 0.4 ? clamp(1 - Math.abs(t - e.flash) / 0.4) : 0;
  const gf = t >= e.green && t < e.green + 0.18 ? 0.34 * (1 - (t - e.green) / 0.18) : 0;
  if (n === 'map') { M.root.updateMatrixWorld(true); const c = W.map.getWorldPosition(v3(0, 0, 0)); sh.pos = c.clone().add(v3(-1.2, 3.4, 3.2 - (t - L(5).start) * 0.3)); sh.look = c.clone().add(v3(0, -0.1, 0)); sh.fov = 44; }
  frame(ctx, t, sh, { shake: shk * rumble + (n === 'cry' && t < e.freeze + 0.2 ? 0.05 : 0), shadowSpan: span, shadows: set === 'out' || set === 'mead', flash: Math.max(wh, gf), flashColor: wh > 0 ? '#fff8e8' : '#2bff8e' });
  if (first) drawHud(t, n);
  return n;
}
const burstPath = (k) => { const a = v3(DX, 0, 1.8), b = v3(0, 0, 6), c = v3(4, 0, 3.2), d = v3(4, 0, -3); if (k < 0.72) { const u = k / 0.72, p = lp3(lp3(a, b, u), lp3(b, c, u), u); return p; } return lp3(c, d, (k - 0.72) / 0.28); };

export async function setup() {
  ctx = await initStage('ep21', { look: 'pro', avatars: ['farm_mia', 'farm_finn'] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'happy', 'surprised', 'shocked', 'scared', 'terrified', 'nervous', 'suspicious', 'focused', 'sad']);
  const { scene, camera } = ctx; camera.far = 5000; camera.near = 0.3; camera.updateProjectionMatrix();
  rig(); corridor(); wing(); tower(); meadow(); people();
  const c = clouds(scene, { y: 340, spread: 2400, count: 22, color: '#ffffff', size: 60 }); c.position.x = MX.x; W.clouds = c;
  const list = { dust1: dust(scene, { size: 46, height: 12, centre: v3(0, 6, 0), count: 460, color: '#e8e0c8', amount: 0.26, pointSize: 0.5 }), spark: sparkles(scene, { centre: v3(DX, 3.4, 1.0), size: 4.2, height: 6, count: 40, color: '#49ffa6', pointSize: 0.22 }),
    gold: dust(scene, { size: 90, height: 24, centre: MX.clone().add(v3(0, 8, 8)), count: 300, color: '#fff2c8', amount: 0.42, pointSize: 0.55 }), fall2: burst(scene, { count: 180, color: '#c8d8c0', dur: 1.3, spread: 18, height: 0.5, pointSize: 2.4, bright: 0.9, pos: v3(1, 1, 3) }).fire(EV.fell) };
  W.air = atmos(...Object.values(list)); W.air.list = list;
  hudInit(); W.shots = shots();
  void paint; void Batch; void surf; void rng;
  return expose(ctx, renderAt, L(2).end + 1, EV);
}
