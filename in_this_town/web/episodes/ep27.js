// Episode 27: The Hospital That Was Never Built (Liminal Horror 1/5). A demolished hospital whose lights come on at 3:17. Inside: a long, pristine,
// pale-green corridor under buzzing tubes, clean empty rooms, a PA that knows Grayson's name, a nurse in a cracked porcelain mask who never walks,
// only is somewhere else between flickers. Room 217: a bed, a CRT on a ceiling arm, a photograph of Grayson asleep. The TV shows Grayson in this room,
// dated tomorrow; the Grayson on screen turns and whispers. Lights out. They come back on an endless ward of occupied beds, and one empty bed.
// Sets share the world: the corridor (x -7..7, z +8..-226), Room 217 (x 7..25 off the corridor), outside at EXT, the ward at WARD.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt, altiCanvas } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, NIGHT } from '../engine/stage.js';
import { Batch, surf, paint } from '../engine/kit.js';
import { dust, atmos } from '../engine/atmos.js';
import { canvasTex } from '../engine/props.js';
import { wallPaint, vinyl, ceilingTile, fluorPanel, wardDoor, roomPlate, bedChart, hospitalBed, ivPole, cabinet, paSpeaker, crtTV, nurse, wardBeds,
  hospitalBlock, fenceRun, noticeSign } from '../engine/hospital.js';

let ctx, L, EV;
const W = {};
const HW = 7, H = 10.5, ZEND = -226, DOORS = [];      // corridor half width, height, end wall
const D217 = -158, RX1 = 25, RZ0 = -167, RZ1 = -149;   // Room 217's door z, far wall x, side walls
const EXT = v3(-3000, 0, 0), WARD = v3(3000, 0, 0);
const NURSE = v3(0, 0, -211), ARM = 2.2, GSKIN = '#eac09a';
const BEDC = v3(19.6, 0, -159.6);                       // the bed in 217 (head toward +x)
const TVP = v3(9.6, 7.6, -151.2);                       // the CRT, high in the corner by the door
const STAND = v3(14.6, 0, -157.2);                      // where Grayson stands to watch it
const FEEDG = v3(13.4, 0, -157.8);                      // where the Grayson on the tape stands
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const tmpC = new THREE.Color();
const TUBE = new THREE.Color('#effbe4');

// ---- palettes: flat institutional light, no sun indoors ----
const OUT = { ...NIGHT, ...P({ top: '#02050a', horizon: '#0c1613', haze: '#08100d', sunColor: '#9fb6cc', hemiSky: '#5a7684', hemiGround: '#131913' }),
  sunI: 0.42, sunDir: v3(-0.45, 0.62, 0.5), sunDisc: 0, stars: 0.7, moon: 1, hemiI: 0.62, amb: 0.1, envI: 0.25, exposure: 1.12, bloom: 0.1, fogNear: 140, fogFar: 760, saturation: 1.05, contrast: 1.08, bounce: 0.06, win: 0, lamp: 0 };
const HALL = { ...NIGHT, ...P({ top: '#2c3a32', horizon: '#2c3a32', haze: '#33423a', sunColor: '#ffffff', hemiSky: '#eef8e2', hemiGround: '#90a48e' }),
  sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 1.05, amb: 0.22, envI: 0.35, exposure: 1.0, bloom: 0.05, fogNear: 70, fogFar: 520, saturation: 0.98, contrast: 1.06, bounce: 0.18, win: 0, lamp: 0 };
const ROOM = { ...HALL, ...P({ haze: '#26302b', hemiSky: '#e6f2dc', hemiGround: '#7c8f7a' }), hemiI: 0.85, amb: 0.18, exposure: 1.0, fogNear: 200, fogFar: 600 };
const WARDP = { ...HALL, ...P({ top: '#020403', horizon: '#020403', haze: '#020403', hemiSky: '#cfe2c6', hemiGround: '#2a3529' }), hemiI: 0.42, amb: 0.05, envI: 0.12, exposure: 1.06, bloom: 0.07, fogNear: 34, fogFar: 250, bounce: 0.1 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return { on: 0.55, walkIn: s(3) - 0.15, buzz: s(4), pa: s(6) - 0.75, freeze: s(7) + 0.05, flick: s(9) + 0.15, nurse: s(9) + 0.32, point: s(11) + 0.15, open: s(12) + 0.55,
    tvon: s(16) + 0.1, turn: s(19) + 0.25, nurseTV: s(22) + 0.55, out: s(23) + 0.12, back: s(24) - 0.05, rings: s(24) + 0.5, end: ctx.dur };
}
const hallZ = (t) => -1.5 - Math.max(0, t - EV.walkIn) * 3.2;     // Grayson walking in

// ---- outside ----
function outside() {
  const g = new THREE.Group(); g.position.copy(EXT); ctx.scene.add(g); W.ext = g;
  const b = new Batch(), gr = surf('grass', '#1d2a1c', { roughness: 0.98 }), road = surf('concrete', '#2a2c2b', { roughness: 0.95 }), kerb = paint('#4c4f4b', { roughness: 0.9 });
  b.box(gr, 1400, 1, 1400, 0, -0.5, 0, { r: 0.02 }); b.box(road, 26, 0.24, 520, 0, 0.12, 300, { r: 0.02 }); for (const x of [-13.4, 13.4]) b.box(kerb, 0.8, 0.5, 520, x, 0.25, 300, { r: 0.1 });
  for (let z = 70; z < 560; z += 22) b.box(paint('#8c8a6a', { roughness: 0.9 }), 0.5, 0.06, 9, 0, 0.27, z, { r: 0.02 });   // faded centre dashes
  b.box(road, 120, 0.24, 70, 0, 0.1, 45, { r: 0.02 });                                                                  // the old forecourt
  // dead street lamps along the road, tall weeds
  for (const z of [110, 190, 270, 350]) for (const s of [-1, 1]) { b.cyl(paint('#1c1f1d', { metalness: 0.5 }), 0.3, 0.45, 18, s * 17, 9, z); b.box(paint('#1c1f1d'), 4, 0.4, 0.8, s * 15.4, 18, z, { r: 0.1 }); }
  b.done(g);
  W.block = hospitalBlock(g, { w: 160, d: 40, floors: 5, fh: 13 }); W.block.position.set(0, 0, -20);
  // weeds: instanced blades
  const r = rng(9), n = 2600, blade = new THREE.ConeGeometry(0.22, 2.4, 4); blade.translate(0, 1.2, 0);
  const im = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: '#2f4229', roughness: 0.9 }), n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), E = new THREE.Euler();
  for (let i = 0; i < n; i++) { let x = (r() - 0.5) * 300, z = 10 + r() * 260; if (Math.abs(x) < 16 && z > 40) x += Math.sign(x || 1) * 20; E.set((r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.5); q.setFromEuler(E); const s = 0.6 + r() * 1.1; im.setMatrixAt(i, M.compose(v3(x, 0, z), q, v3(s, s * (0.7 + r()), s))); }
  im.receiveShadow = true; g.add(im);
  // fence across the forecourt with the notice
  fenceRun(g, -70, -8, 66); fenceRun(g, 8, 70, 66);
  const gate = new Batch(), post = paint('#8a908a', { metalness: 0.7, roughness: 0.4 }); for (const x of [-8, 8]) gate.cyl(post, 0.24, 0.24, 9, x, 4.5, 66); gate.done(g);
  W.notice = noticeSign(['DEMOLITION NOTICE', 'WILLOW CREEK GENERAL', 'DEMOLISHED 2014', 'SITE CLOSED - NO ENTRY'], { w: 6.4 }); W.notice.position.set(-12, 4.4, 66.2); g.add(W.notice);
  // the far tree line, black against the sky
  const tb = new Batch(), tree = paint('#060a07', { roughness: 1 }); for (let i = 0; i < 70; i++) { const x = -420 + i * 12 + r() * 6, h = 30 + r() * 30; tb.cyl(tree, 0.1, 7 + r() * 5, h, x, h / 2, -150 - r() * 40, { seg: 7 }); } tb.done(g);
}

// ---- the corridor ----
function corridor() {
  const g = new THREE.Group(); ctx.scene.add(g); W.corr = g;
  const b = new Batch(), wall = wallPaint('#b6d6c0'), dado = wallPaint('#7fae98', { span: 6, seed: 5, rough: 0.4 }), floor = vinyl('#d5ded2', { accent: null }), ceil = ceilingTile(), rail = paint('#f1f3ee', { roughness: 0.35 }), base = paint('#4f7d68', { roughness: 0.4 });
  const L0 = 8 - ZEND;
  b.box(floor, HW * 2 + 0.6, 0.4, L0 + 2, 0, -0.2, (8 + ZEND) / 2, { r: 0.02 });
  b.box(ceil, HW * 2 + 0.6, 0.3, L0 + 2, 0, H + 0.15, (8 + ZEND) / 2, { r: 0.02 });
  // door positions (both walls), then the wall between them
  for (let k = 0; k < 12; k++) { const z = -14 - 18 * k; DOORS.push({ s: 1, z, n: 201 + 2 * k }, { s: -1, z: z - 9, n: 202 + 2 * k }); }
  const wallRun = (s, z0, z1) => { if (z1 - z0 < 0.05) return; const x = s * (HW + 0.3), m = (z0 + z1) / 2, l = z1 - z0;
    b.box(wall, 0.6, H, l, x, H / 2, m, { r: 0.01 }); b.box(dado, 0.3, 3.4, l, s * (HW - 0.02), 1.7, m, { r: 0.02 }); b.box(base, 0.42, 0.45, l, s * (HW - 0.1), 0.22, m, { r: 0.04 });
    b.box(rail, 0.3, 0.34, l, s * (HW - 0.32), 3.5, m, { r: 0.12 }); b.box(rail, 0.08, 0.5, l, s * (HW - 0.12), 3.5, m, { r: 0.02 }); };
  for (const s of [1, -1]) {
    const list = DOORS.filter((d) => d.s === s).sort((a, c) => c.z - a.z); let z = 8;
    for (const d of list) { wallRun(s, d.z + 2.6, z); z = d.z - 2.6;
      const x = s * (HW + 0.3); b.box(wall, 0.6, H - 8.7, 5.2, x, 8.7 + (H - 8.7) / 2, d.z, { r: 0.01 });
      for (const q of [-2.45, 2.45]) b.box(rail, 0.8, 8.8, 0.3, s * (HW + 0.05), 4.4, d.z + q, { r: 0.05 }); b.box(rail, 0.8, 0.3, 5.2, s * (HW + 0.05), 8.75, d.z, { r: 0.05 });
      const pl = roomPlate(String(d.n)); pl.position.set(s * (HW - 0.06), 7.3, d.z + s * 3.6); pl.rotation.y = -s * Math.PI / 2; g.add(pl); if (d.n === 217) W.plate = pl;
    }
    wallRun(s, ZEND, z);
  }
  // the end wall: a pair of closed double doors
  b.box(wall, HW * 2 + 0.6, H, 0.6, 0, H / 2, ZEND, { r: 0.01 }); b.box(dado, HW * 2, 3.4, 0.3, 0, 1.7, ZEND + 0.32, { r: 0.02 });
  b.box(paint('#9fc5b0', { roughness: 0.45 }), 7.6, 8.6, 0.3, 0, 4.3, ZEND + 0.46, { r: 0.04 }); b.box(paint('#5e8a75'), 0.12, 8.6, 0.34, 0, 4.3, ZEND + 0.5, { r: 0.02 });
  // the entrance behind Grayson: glass doors, black night beyond
  b.box(wall, HW * 2 + 0.6, H, 0.6, 0, H / 2, 8.4, { r: 0.01 }); b.box(paint('#05070a', { roughness: 0.05, metalness: 0.4 }), 8, 8, 0.2, 0, 4, 8.0, { r: 0.02 });
  // a wet-paint sign and a nurse station alcove (left wall, z -30)
  b.box(paint('#e7c23a', { roughness: 0.5 }), 1.6, 2.6, 0.14, -4.6, 1.4, -24, { r: 0.04, ry: 0.4, rx: 0.2 }); b.box(paint('#e7c23a', { roughness: 0.5 }), 1.6, 2.6, 0.14, -4.6, 1.4, -23.3, { r: 0.04, ry: 0.4, rx: -0.2 });
  // wheelchair parked by a wall, an empty gurney
  const st = paint('#cfd6d2', { metalness: 0.75, roughness: 0.3 }), seat = paint('#3d5a4f', { roughness: 0.7 });
  b.box(seat, 2, 0.3, 2, 5.4, 2.1, -82, { r: 0.08 }); b.box(seat, 2, 2.2, 0.3, 5.4, 3.2, -81, { r: 0.08 }); for (const q of [-1.1, 1.1]) b.cyl(st, 1.1, 1.1, 0.12, 5.4 + q, 1.1, -82, { rz: Math.PI / 2, seg: 24 });
  b.box(st, 3, 0.2, 7, -5, 3, -128, { r: 0.05 }); b.box(paint('#f2f4ef', { roughness: 0.85 }), 2.9, 0.4, 6.8, -5, 3.3, -128, { r: 0.15 }); for (const [p, q] of [[-1.3, -3.2], [1.3, -3.2], [-1.3, 3.2], [1.3, 3.2]]) b.cyl(st, 0.08, 0.08, 2.8, -5 + p, 1.5, -128 + q);
  b.done(g);
  // a WET PAINT card on the sign
  const wp = canvasTex(256, 360, (x, w, h) => { x.fillStyle = '#e7c23a'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1a1a'; x.font = '900 70px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('WET', w / 2, 150); x.fillText('PAINT', w / 2, 230); }); wp.colorSpace = THREE.SRGBColorSpace;
  const wpm = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), new THREE.MeshStandardMaterial({ map: wp, roughness: 0.5 })); wpm.position.set(-4.33, 1.62, -23.2); wpm.rotation.set(-0.2, 0.4, 0); g.add(wpm);
  // doors: the first few open onto clean rooms; Room 217 is a real room (below), the rest stay shut
  W.doors = []; W.panels = [];
  for (const d of DOORS) {
    const dr = wardDoor({ color: '#a6cbb6' }); const zh = d.z - 2.3 * d.s;   // hinge at one jamb
    dr.position.set(d.s * (HW + 0.3), 0, d.s > 0 ? d.z - 2.3 : d.z + 2.3); dr.rotation.y = d.s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(dr); void zh;
    const open = d.n === 217 ? 0 : (d.z > -120 ? 1.25 : 0); dr.rotation.y += d.s > 0 ? open : open;
    d.door = dr; W.doors.push(dr); if (d.n === 217) W.d217 = dr;
    if (open > 0) sideRoom(g, d);
    else if (d.n !== 217) { const back = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 8.6), paint('#0a0d0c')); back.position.set(d.s * (HW + 0.7), 4.3, d.z); back.rotation.y = -d.s * Math.PI / 2; g.add(back); }
  }
  // fluorescent panels down the middle, every 9 studs; PA speakers between some
  for (let z = 2; z > ZEND + 4; z -= 9) { const p = fluorPanel(3.4, 6.6, { gain: 1.6 }); p.position.set(0, H - 0.05, z); g.add(p); W.panels.push({ p, z }); }
  W.spk = paSpeaker(); W.spk.position.set(0, H - 0.06, -63.5); g.add(W.spk); const s2 = paSpeaker(); s2.position.set(0, H - 0.06, -135.5); g.add(s2);
}
// a clean, empty patient room behind an open door: made bed, cabinet, window with blinds, its own light
function sideRoom(g, d) {
  W.sm ||= { wall: wallPaint('#bcdcc6', { span: 9 }), floor: vinyl('#d9e2d6', { span: 10 }), ceil: ceilingTile() };
  const s = d.s, x0 = s * (HW + 0.6), x1 = s * (HW + 16), zc = d.z, b = new Batch(), wall = W.sm.wall, floor = W.sm.floor;
  b.box(floor, 15.6, 0.4, 16, (x0 + x1) / 2, -0.2, zc, { r: 0.02 }); b.box(W.sm.ceil, 15.6, 0.3, 16, (x0 + x1) / 2, H + 0.15, zc, { r: 0.02 });
  b.box(wall, 0.4, H, 16, x1, H / 2, zc, { r: 0.01 }); for (const q of [-8, 8]) b.box(wall, 15.6, H, 0.4, (x0 + x1) / 2, H / 2, zc + q, { r: 0.01 });
  b.box(paint('#c8d6ce', { roughness: 0.3 }), 0.2, 4, 5.2, x1 - s * 0.25, 5.8, zc + 3, { r: 0.04 }); for (let i = 0; i < 9; i++) b.box(paint('#eef1ea'), 0.14, 0.2, 5.0, x1 - s * 0.4, 4 + i * 0.42, zc + 3, { r: 0.03 });
  b.done(g);
  const bed = hospitalBed(); bed.position.set(x1 - s * 5.4, 0, zc - 2.6); bed.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(bed);
  const cb = cabinet(); cb.position.set(x1 - s * 1.6, 0, zc - 7); g.add(cb);
  const p = fluorPanel(3, 5.4, { gain: 1.3 }); p.position.set((x0 + x1) / 2, H - 0.05, zc); g.add(p); W.panels.push({ p, z: zc, room: true });
}

// ---- Room 217 ----
function room217() {
  const g = new THREE.Group(); ctx.scene.add(g); W.room = g;
  const b = new Batch(), wall = wallPaint('#bad9c4', { span: 9 }), dado = wallPaint('#7fae98', { span: 6, seed: 5, rough: 0.4 }), floor = vinyl('#d7e0d4', { span: 10 }), x0 = HW + 0.6, xc = (x0 + RX1) / 2, zc = (RZ0 + RZ1) / 2;
  b.box(floor, RX1 - x0 + 0.4, 0.4, RZ1 - RZ0 + 0.4, xc, -0.2, zc, { r: 0.02 }); b.box(ceilingTile(), RX1 - x0 + 0.4, 0.3, RZ1 - RZ0 + 0.4, xc, H + 0.15, zc, { r: 0.02 });
  b.box(wall, 0.5, H, RZ1 - RZ0, RX1 + 0.2, H / 2, zc, { r: 0.01 }); for (const z of [RZ0 - 0.2, RZ1 + 0.2]) { b.box(wall, RX1 - x0, H, 0.5, xc, H / 2, z, { r: 0.01 }); b.box(dado, RX1 - x0, 3.4, 0.2, xc, 1.7, z + (z < zc ? 0.32 : -0.32), { r: 0.02 }); }
  b.box(dado, 0.2, 3.4, RZ1 - RZ0, RX1 - 0.12, 1.7, zc, { r: 0.02 });
  // the corridor wall's room side, round the door
  b.box(wall, 0.4, H, D217 - 2.6 - RZ0, x0, H / 2, (D217 - 2.6 + RZ0) / 2, { r: 0.01 }); b.box(wall, 0.4, H, RZ1 - D217 - 2.6, x0, H / 2, (RZ1 + D217 + 2.6) / 2, { r: 0.01 }); b.box(wall, 0.4, H - 8.7, 5.2, x0, 8.7 + (H - 8.7) / 2, D217, { r: 0.01 });
  // a window with closed blinds on the far wall, black night between the slats
  b.box(paint('#06080a'), 0.1, 4.6, 6.4, RX1 - 0.06, 5.8, -153, { r: 0.02 }); for (let i = 0; i < 11; i++) b.box(paint('#e8ece4', { roughness: 0.5 }), 0.12, 0.3, 6.2, RX1 - 0.2, 3.7 + i * 0.42, -153, { r: 0.04, rz: 0.25 });
  // a visitor chair
  const ch = paint('#6f8f80', { roughness: 0.6 }); b.box(ch, 2.4, 0.4, 2.4, 10.4, 2.2, -164, { r: 0.12 }); b.box(ch, 2.4, 2.6, 0.4, 10.4, 3.6, -165.1, { r: 0.12 }); for (const [p, q] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cyl(paint('#c9cfcc', { metalness: 0.8 }), 0.08, 0.08, 2.1, 10.4 + p, 1.05, -164 + q);
  b.done(g);
  W.bed = hospitalBed(); W.bed.position.copy(BEDC); W.bed.rotation.y = -Math.PI / 2; g.add(W.bed);
  const iv = ivPole(); iv.position.set(23.4, 0, -154.6); g.add(iv);
  const cb = cabinet(); cb.position.set(23.2, 0, -165.0); g.add(cb);
  W.panel217 = fluorPanel(3.4, 6.6, { gain: 1.45 }); W.panel217.position.set(17, H - 0.05, -158); g.add(W.panel217);
  // the photograph, standing on the cabinet: a print of whatever photoRT holds
  W.photoRT = new THREE.WebGLRenderTarget(560, 420, { samples: 4 }); W.photoRT.texture.colorSpace = THREE.SRGBColorSpace;
  const fr = new Batch(); fr.box(paint('#2a2724', { roughness: 0.5 }), 0.22, 2.1, 2.7, 0, 0, 0, { r: 0.05 }); fr.box(paint('#2a2724'), 0.9, 0.12, 0.12, 0.42, -0.98, 0, { r: 0.03, rz: -0.5 }); W.frame = fr.done(); W.frame.position.set(23.0, 4.42, -165.2); W.frame.rotation.set(0, 0.42, 0.08); g.add(W.frame);
  W.photoM = new THREE.ShaderMaterial({ uniforms: { tP: { value: W.photoRT.texture } }, vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 v; uniform sampler2D tP; void main(){ vec2 q = (v - 0.5) * vec2(1.0, 1.0) / 0.88 + 0.5; vec3 c = vec3(0.95, 0.94, 0.9);
      if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) { vec3 p = texture2D(tP, q).rgb; p = p / (p + 0.55) * 1.3; float l = dot(p, vec3(0.3, 0.59, 0.11)); p = mix(vec3(l), p, 0.75) * vec3(1.05, 0.98, 0.86); c = p; }
      gl_FragColor = vec4(c * 0.9, 1.0); }` });
  const ph = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.9), W.photoM); ph.position.set(-0.13, 0, 0); ph.rotation.y = -Math.PI / 2; ph.userData.noAO = true; W.frame.add(ph);
  W.photoCam = new THREE.PerspectiveCamera(36, 560 / 420, 0.1, 100);
  // the CRT; its screen shows the tape (feedRT), the tape's text and static
  W.tv = crtTV({ drop: 2.2 }); W.tv.position.copy(TVP); W.tv.rotation.y = Math.atan2(STAND.x + 1 - TVP.x, STAND.z - 1 - TVP.z); W.tv.rotation.x = 0.0; g.add(W.tv);
  W.tv.updateMatrixWorld(true);
  W.feedRT = new THREE.WebGLRenderTarget(640, 480, { type: THREE.HalfFloatType, samples: 2 });
  W.uiC = document.createElement('canvas'); W.uiC.width = 640; W.uiC.height = 480; W.ui = new THREE.CanvasTexture(W.uiC); W.ui.colorSpace = THREE.SRGBColorSpace;
  W.screenM = new THREE.ShaderMaterial({ uniforms: { tF: { value: W.feedRT.texture }, tUI: { value: W.ui }, on: { value: 0 }, snow: { value: 0 }, tm: { value: 0 }, glitch: { value: 0 } },
    vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 v; uniform sampler2D tF, tUI; uniform float on, snow, tm, glitch;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec2 q = v; q.x += glitch * (h(vec2(floor(v.y * 40.0), floor(tm * 30.0))) - 0.5) * 0.08;
        vec3 f = texture2D(tF, q).rgb; f = f / (f + 0.6) * 1.4; f = clamp((f - 0.5) * 1.35 + 0.42, 0.0, 1.0); float l = dot(f, vec3(0.3, 0.59, 0.11)); f = mix(vec3(l), f, 0.55) * vec3(0.9, 1.0, 0.95);
        f *= 0.86 + 0.14 * sin(v.y * 640.0 + tm * 40.0); f *= 1.0 - 0.35 * pow(length(v - 0.5) * 1.3, 2.0);
        float n = h(v * vec2(320.0, 240.0) + floor(tm * 60.0)); vec3 c = mix(f, vec3(n * 0.8), snow);
        vec4 u = texture2D(tUI, v); c = mix(c, u.rgb, u.a * (1.0 - snow * 0.7));
        gl_FragColor = vec4(c * on, 1.0); }` });
  W.tv.screen.material = W.screenM;
  W.feedCam = new THREE.PerspectiveCamera(58, 4 / 3, 0.1, 200);
  W.tvGlow = new THREE.PointLight('#bfe8ff', 0, 16, 1.6); W.tvGlow.position.copy(W.tv.localToWorld(v3(0, 0, 2))); g.add(W.tvGlow);
}

// ---- the ward that goes on forever ----
function ward() {
  const g = new THREE.Group(); g.position.copy(WARD); ctx.scene.add(g); W.ward = g;
  const b = new Batch(); b.box(vinyl('#c9d3c6', { span: 14 }), 1600, 0.4, 1600, 0, -0.2, 0, { r: 0.02 }); b.done(g);
  const near = [], far = [], CX = 7.5, CZ = 13;
  W.wardCols = CX; W.wardRows = CZ;
  for (let i = -26; i <= 26; i++) for (let j = -22; j <= 22; j++) {
    const c = { x: i * CX, z: j * CZ, i, j, empty: i === 0 && j === 0 };
    (Math.abs(i) <= 9 && Math.abs(j) <= 8 ? near : far).push(c);
  }
  const face = new THREE.CanvasTexture(altiCanvas('neutral', { blink: true })); face.colorSpace = THREE.SRGBColorSpace;
  wardBeds(g, near, { faceMap: face, shadows: true, seed: 3 });
  // far beds: one cheap merged shape each (frame, white sheet, a head)
  const fb = new Batch(); fb.box(paint('#e8ece8', { metalness: 0.3, roughness: 0.4 }), 4.2, 0.4, 8.6, 0, 2.9, 0, { r: 0.08 }); fb.box(paint('#eef1ec', { roughness: 0.88 }), 4.0, 1.4, 8.2, 0, 3.7, 0, { r: 0.4 });
  fb.box(paint('#d9b48e'), 1.3, 1.1, 1.25, 0, 4.7, -3.0, { r: 0.28 }); fb.box(paint('#e8ece8'), 4.3, 2.6, 0.24, 0, 4.1, -4.35, { r: 0.1 }); for (const [x, z] of [[-1.9, -4], [1.9, -4], [-1.9, 4], [1.9, 4]]) fb.cyl(paint('#e8ece8'), 0.11, 0.11, 2.6, x, 1.4, z);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = v3(1, 1, 1);
  fb.done().children.forEach((m) => { const im = new THREE.InstancedMesh(m.geometry, m.material, far.length); far.forEach((c, k) => im.setMatrixAt(k, M.compose(v3(c.x, 0, c.z), q, sc))); im.receiveShadow = true; im.frustumCulled = false; g.add(im); });
  // ceiling panels over every bed, switching on ring by ring from his bed outward
  const pl = []; for (let i = -26; i <= 26; i++) for (let j = -22; j <= 22; j++) pl.push({ x: i * CX, z: j * CZ - 1, ring: Math.max(Math.abs(i), Math.abs(j)), ph: (i * 7 + j * 13) % 10 });
  const pm = new THREE.MeshBasicMaterial({ color: '#ffffff' }), pg = new THREE.PlaneGeometry(3.2, 6); pg.rotateX(Math.PI / 2);
  W.wpan = new THREE.InstancedMesh(pg, pm, pl.length); pl.forEach((c, k) => W.wpan.setMatrixAt(k, M.compose(v3(c.x, 14, c.z), q, sc))); W.wpan.userData.noAO = true; W.wpan.frustumCulled = false; g.add(W.wpan); W.wpl = pl;
  // Tyler's chart on the footboard of the bed beside his, and charts on a few more
  W.tyler = bedChart('TYLER', { w: 1.5 }); W.tyler.position.set(CX, 3.75, 4.5); g.add(W.tyler);
  const names = ['MARA', 'JUNE', 'OWEN', 'ELLIS', 'NOOR', 'ABEL', 'RUTH']; names.forEach((n, k) => { const c = bedChart(n, { w: 1.5 }); const i = [-1, 2, -2, 1, 0, 3, -3][k], j = [0, 0, 0, -1, 1, 1, -1][k]; c.position.set(i * CX, 3.75, j * CZ + 4.5); g.add(c); });
  // the empty bed's own chart: blank
  const blank = bedChart('', { w: 1.5 }); blank.position.set(0, 3.75, 4.5); g.add(blank);
}
function wardLights(t) {
  const c = W.wpan, cc = new THREE.Color(); let i = 0;
  for (const p of W.wpl) {
    const on = t - (EV.rings + p.ring * 0.13 + (p.ring === 0 ? -0.5 : 0)); let k = on < 0 ? 0 : on < 0.22 ? (Math.sin(on * 90 + p.ph) > 0.2 ? 1 : 0.08) : 1;
    cc.copy(TUBE).multiplyScalar(k * 1.5); c.setColorAt(i++, cc);
  }
  c.instanceColor.needsUpdate = true;
  return (r) => clamp((t - (EV.rings + r * 0.13)) / 0.22);
}

// ---- people ----
function people() {
  const mk = () => { const c = makeCharacter({ avatar: 'farm_grayson', alti: true, skin: GSKIN, caustic: false }); ctx.scene.add(c.root); return c; };
  W.g = mk(); W.tape = mk();
  W.n = nurse(); ctx.scene.add(W.n.root); W.n.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
}

// ---- lights: a pool of points that follow the set, and one shadowed key ----
function rig() {
  W.pl = []; for (let i = 0; i < 8; i++) { const l = new THREE.PointLight('#ffffff', 0, 34, 1.4); ctx.scene.add(l); W.pl.push(l); }
  W.key = new THREE.SpotLight('#f2fbe8', 0, 60, 0.75, 0.85, 1.1); W.key.castShadow = true; W.key.shadow.mapSize.set(1024, 1024); W.key.shadow.bias = -0.0006; W.key.shadow.normalBias = 0.04; ctx.scene.add(W.key); ctx.scene.add(W.key.target);
}
// tubes buzz: an almost-steady level with rare dips; a global dip at the flicker beat
const tubeK = (t, i) => { const d = noise1(t * 3.1 + i * 7.7) > 0.86 ? 0.55 : 1; return d * (1 - 0.03 * Math.max(0, noise1(t * 40 + i))); };
const flickAll = (t) => { const a = t - EV.flick; return a > 0 && a < 0.34 ? (Math.sin(a * 70) > 0 ? 0.25 : 0.95) : 1; };
function lightSet(set, t, focus) {
  const pl = W.pl, off = (i) => { for (let k = i; k < pl.length; k++) pl[k].intensity = 0; };
  W.key.intensity = 0; W.tvGlow.intensity = 0;
  if (set === 'hall') {
    const f = flickAll(t), z0 = Math.round(focus.z / 9) * 9;
    for (let i = 0; i < 6; i++) { const z = z0 + (i - 2) * 9 + 2, l = pl[i]; l.position.set(0, H - 1.0, z); l.color.copy(TUBE); l.intensity = 34 * tubeK(t, Math.round(z)) * f; l.distance = 30; }
    off(6);
    W.key.position.set(0.6, H - 0.4, focus.z + 3); W.key.target.position.set(focus.x, 1.5, focus.z); W.key.color.copy(TUBE); W.key.intensity = 120 * f; W.key.angle = 0.9; W.key.distance = 40;
  } else if (set === 'room') {
    const lit = t < EV.out ? 1 : 0, A = pl[0], B = pl[1], C = pl[2];
    A.position.set(17, H - 1.2, -158); A.color.copy(TUBE); A.intensity = 46 * lit * tubeK(t, 3); A.distance = 32;
    B.position.set(3, H - 1.0, -158); B.color.copy(TUBE); B.intensity = 30 * lit; B.distance = 26;                   // spill from the corridor
    C.position.set(12, 6.5, -151); C.color.set('#dfeee0'); C.intensity = 12 * lit; C.distance = 18;
    off(3);
    W.key.position.set(16, H - 0.5, -156); W.key.target.position.set(STAND.x, 1.5, STAND.z); W.key.color.copy(TUBE); W.key.intensity = 110 * lit; W.key.angle = 0.95; W.key.distance = 30;
    W.tvGlow.intensity = 9 * W.screenM.uniforms.on.value * lit;
  } else if (set === 'ward') {
    const rk = W.ringK || (() => 1), cx = WARD.x;
    for (let i = 0; i < 6; i++) { const l = pl[i], gx = [0, 1, -1, 0, 1, -1][i], gz = [0, 0, 0, 1, 1, -1][i], ring = Math.max(Math.abs(gx), Math.abs(gz)); l.position.set(cx + gx * 7.5, 12, gz * 13); l.color.copy(TUBE); l.intensity = 30 * rk(ring); l.distance = 30; }
    off(6);
    W.key.position.set(cx + 1.5, 13.5, 3.5); W.key.target.position.set(cx, 2, 3); W.key.color.copy(TUBE); W.key.intensity = 150 * rk(0); W.key.angle = 0.6; W.key.distance = 40;
  } else if (set === 'out') {
    const k = W.extK ?? 0;   // the windows' light reaching the forecourt
    pl[0].position.set(EXT.x, 9, EXT.z + 8); pl[0].color.set('#cfeed6'); pl[0].intensity = 140 * k; pl[0].distance = 90;
    pl[1].position.set(EXT.x - 40, 9, EXT.z + 6); pl[1].color.set('#cfeed6'); pl[1].intensity = 90 * k; pl[1].distance = 70;
    pl[2].position.set(EXT.x + 40, 9, EXT.z + 6); pl[2].color.set('#cfeed6'); pl[2].intensity = 90 * k; pl[2].distance = 70;
    off(3);
  } else off(0);
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, S = [], add = (name, t0, f) => S.push({ name, t0: () => t0, f, t1: () => 0 }), X = (x, y, z) => EXT.clone().add(v3(x, y, z)), Wd = (x, y, z) => WARD.clone().add(v3(x, y, z));
  add('ext', 0, (u) => ({ pos: lp3(X(34, 10, 196), X(30, 10, 180), easeInOut(u)), look: X(0, 25, -20), fov: 62 }));
  add('sign', s(1) - 0.15, (u) => ({ pos: lp3(X(-11.2, 4.4, 83), X(-11.4, 4.5, 80), easeOut(u)), look: X(-12, 6.2, 66), fov: 50 }));
  add('road', s(2) - 0.1, (u, t) => { const z = gRoadZ(t); return { pos: X(4.5, 4.2, z + 22), look: X(-0.6, 9, z - 40), fov: 60 }; });
  add('hall', s(3) - 0.15, (u, t) => ({ pos: v3(0, 5.4, lerp(7, 5.6, u)), look: v3(0, 4.2, -60), fov: 62 }));
  add('tube', s(4) - 0.1, (u) => { const z = gStop() - 1.2; return { pos: lp3(v3(2.0, 3.0, z + 3.8), v3(1.8, 3.1, z + 3.5), u), look: v3(-0.2, 5.5, z - 2.5), fov: 62 }; });
  add('peek', s(5) - 0.1, (u) => { const d = DOORS.find((q) => q.s < 0 && q.z < -30 && q.z > -50); return { pos: lp3(v3(-15.5, 5.4, d.z - 4.6), v3(-15.0, 5.3, d.z - 4.3), u), look: v3(-6, 3.4, d.z + 0.6), fov: 58 }; });
  add('spk', s(6) - 0.85, (u) => ({ pos: lp3(v3(-2.6, 6.8, -55.5), v3(-2.4, 7.0, -56.4), u), look: v3(0, H - 0.4, -63.5), fov: 48 }));
  add('look', s(6) + 1.0, (u) => ({ pos: lp3(v3(1.4, 4.0, gStop() - 6.6), v3(1.3, 4.1, gStop() - 6.0), u), look: v3(0, 4.3, gStop()), fov: 56 }));
  add('froze', s(7) - 0.1, (u) => ({ pos: lp3(v3(0.6, 4.6, gStop() - 4.6), v3(0.55, 4.6, gStop() - 4.2), u), look: v3(0, 4.25, gStop()), fov: 52 }));
  add('never', s(8) - 0.1, (u) => ({ pos: lp3(v3(-1.6, 4.8, gStop() - 8.0), v3(-1.4, 4.7, gStop() - 7.2), easeOut(u)), look: v3(0.2, 3.6, gStop() + 2), fov: 64 }));
  add('nurse', s(9) - 0.1, (u) => ({ pos: lp3(v3(2.4, 5.6, gStop() + 6.4), v3(2.3, 5.5, gStop() + 5.0), u), look: v3(0, 4.6, -150), fov: lerp(50, 36, easeInOut(u)) }));
  add('mask', s(10) - 0.1, (u) => ({ pos: lp3(v3(0.1, 4.9, NURSE.z + 9.5), v3(0.05, 4.95, NURSE.z + 5.6), easeInOut(u)), look: v3(0, 4.55, NURSE.z), fov: 46 }));
  add('point', s(11) - 0.1, (u) => ({ pos: lp3(v3(-5.0, 5.6, NURSE.z - 8.0), v3(-4.8, 5.6, NURSE.z - 7.3), u), look: v3(0.9, 4.6, NURSE.z + 4), fov: 62 }));
  add('plate', s(11) + 1.15, (u) => ({ pos: lp3(v3(1.4, 6.6, D217 + 9.5), v3(2.0, 6.9, D217 + 8.2), u), look: v3(HW - 0.1, 6.6, D217 + 2.4), fov: 54 }));
  add('open', s(12) - 0.1, (u) => ({ pos: lp3(v3(-2.6, 5.4, D217 + 9.4), v3(-2.2, 5.3, D217 + 8.6), u), look: v3(5.6, 3.9, D217 + 0.4), fov: 60 }));
  add('bed', s(13) - 0.15, (u) => ({ pos: lp3(v3(12.4, 6.6, -150.0), v3(13.0, 6.3, -150.8), easeOut(u)), look: v3(19.4, 3.0, -160.2), fov: 64 }));
  add('tv', s(14) - 0.1, (u) => { const p = W.tv.localToWorld(v3(-2.5, -1.8, 7.0)), q = W.tv.localToWorld(v3(-2.2, -1.6, 6.4)); return { pos: lp3(p, q, u), look: W.tv.localToWorld(v3(0, 0.1, 0)), fov: 46 }; });
  add('photo', s(15) - 0.1, (u) => { const f = W.frame.position; return { pos: lp3(v3(f.x - 6.2, 5.6, f.z + 3.4), v3(f.x - 4.0, 5.1, f.z + 2.1), easeInOut(u)), look: v3(f.x, f.y - 0.1, f.z + 0.1), fov: 40 }; });
  add('tvon', s(16) - 0.1, (u) => ({ pos: lp3(v3(18.4, 5.0, -160.6), v3(18.0, 5.0, -160.2), u), look: v3(11.2, 6.2, -153.0), fov: 58 }));
  add('feed', s(17) - 0.1, (u) => { const p = W.tv.localToWorld(v3(0.3, -0.2, 7.4)), q = W.tv.localToWorld(v3(0.2, -0.1, 6.8)); return { pos: lp3(p, q, u), look: W.tv.localToWorld(v3(0, 0.1, 0)), fov: 44 }; });
  add('date', s(18) - 0.1, (u) => { const p = W.tv.localToWorld(v3(0.2, -0.3, 6.2)), q = W.tv.localToWorld(v3(0.2, -0.3, 5.6)); return { pos: lp3(p, q, u), look: W.tv.localToWorld(v3(0.0, -0.2, 0)), fov: 42 }; });
  add('turn', s(19) - 0.1, (u) => { const p = W.tv.localToWorld(v3(0, -0.1, 5.4)), q = W.tv.localToWorld(v3(0, -0.05, 4.4)); return { pos: lp3(p, q, easeInOut(u)), look: W.tv.localToWorld(v3(0, 0.1, 0)), fov: 42 }; });
  add('whisper', s(20) - 0.05, (u) => { const p = W.tv.localToWorld(v3(0, 0.0, 4.2)), q = W.tv.localToWorld(v3(0, 0.05, 3.8)); return { pos: lp3(p, q, u), look: W.tv.localToWorld(v3(0, 0.1, 0)), fov: 44 }; });
  add('behind', s(22) - 0.1, (u) => { const p = W.tv.localToWorld(v3(0, -0.1, 5.0)), q = W.tv.localToWorld(v3(0, -0.1, 4.6)); return { pos: lp3(p, q, u), look: W.tv.localToWorld(v3(0, 0.1, 0)), fov: 44 }; });
  add('real', s(22) + 1.05, (u) => ({ pos: lp3(v3(12.0, 4.7, -154.0), v3(12.4, 4.7, -154.5), u), look: v3(STAND.x, 4.4, STAND.z), fov: 50 }));
  add('wake', e.back, (u) => ({ pos: lp3(Wd(-2.2, 6.2, 0.4), Wd(-3.6, 7.4, -3.8), easeOut(u)), look: Wd(0, 4.3, 6.7), fov: 54 }));
  add('rows', s(25) - 0.1, (u) => ({ pos: lp3(Wd(-24, 24, 46), Wd(-14, 26, 40), easeInOut(u)), look: Wd(-2, 2, -70), fov: 62 }));
  add('occ', s(26) - 0.1, (u) => ({ pos: lp3(Wd(40, 8.4, 6.4), Wd(13, 8.2, 6.4), easeInOut(u)), look: Wd(lerp(35, 8, easeInOut(u)), 4.0, 11.5), fov: 54 }));
  add('his', s(27) - 0.25, (u) => { const k = easeInOut(clamp(u * 1.15)); return { pos: lp3(Wd(5.5, 7.5, 17), Wd(0.6, 62, 16), k), look: lp3(Wd(2.5, 3.2, 1.5), Wd(0, 0, -1), k), fov: lerp(60, 58, k) }; });
  S.forEach((x, i) => { if (S[i + 1]) { const v = S[i + 1].t0(); x.t1 = () => v; } });
  S[S.length - 1].t1 = () => ctx.dur + 1;
  return S;
}
const gRoadZ = (t) => 150 - Math.max(0, t - (L(2).start - 0.6)) * 4.2;
const gStop = () => -58;   // where the PA stops him, under the speaker

// ---- the tape's text ----
const F = (px) => `700 ${px}px "Courier New", monospace`;
function drawUI(t) {
  const x = W.uiC.getContext('2d'); x.clearRect(0, 0, 640, 480);
  if (t < EV.tvon + 0.35) return;
  x.font = F(30); x.fillStyle = '#f2f2f2'; x.shadowColor = '#000'; x.shadowBlur = 6;
  if (Math.floor(t * 1.6) % 2 === 0) { x.fillStyle = '#ff3b30'; x.beginPath(); x.arc(42, 44, 12, 0, 7); x.fill(); x.fillStyle = '#f2f2f2'; }
  x.fillText('REC', 62, 54); x.textAlign = 'right'; x.fillText('ROOM 217', 600, 54); x.textAlign = 'center';
  const big = smooth(L(18).start - 0.1, L(18).start + 0.2, t);
  x.font = F(Math.round(lerp(38, 50, big))); x.fillStyle = big > 0.5 ? '#ffe36a' : '#f2f2f2';
  const sec = String(Math.floor(12 + (t - EV.tvon))).padStart(2, '0');
  x.fillText('NOV 08 2026', 320, 98); x.fillText(`03:17:${sec} AM`, 320, 140 + big * 8);
}
function renderFeed(t, n) {
  const { renderer, scene } = ctx, c = W.feedCam;
  c.position.copy(W.tv.localToWorld(v3(0, 0.0, 1.6))); const tp = W.tape.root.position, sk = smooth(EV.turn + 0.4, L(21).start, t); c.lookAt(lp3(v3(STAND.x + 1.6, 3.4, STAND.z - 1.6), v3(tp.x, 3.9, tp.z), sk)); c.fov = 54; c.updateProjectionMatrix();
  const gv = W.g.root.visible; W.g.root.visible = false; W.tape.root.visible = true; const nv = W.n.root.visible; W.n.root.visible = t >= EV.nurseTV;
  if (W.n.root.visible) { const tp2 = W.tape.root.position, dir = v3(tp2.x - c.position.x, 0, tp2.z - c.position.z).normalize(); W.n.root.position.set(tp2.x + dir.x * 4.2 + 0.9, 0, tp2.z + dir.z * 4.2 - 0.6); W.n.root.rotation.y = Math.atan2(W.tape.root.position.x - W.n.root.position.x, W.tape.root.position.z - W.n.root.position.z) + Math.PI; pose(W.n, 'still', t); W.n.root.rotation.y = Math.atan2(c.position.x - W.n.root.position.x, c.position.z - W.n.root.position.z); }
  W.tv.visible = false; const sc = ctx.sun.castShadow; ctx.sun.castShadow = false;
  renderer.setRenderTarget(W.feedRT); renderer.clear(); renderer.render(scene, c); renderer.setRenderTarget(null);
  W.tv.visible = true; ctx.sun.castShadow = sc; W.g.root.visible = gv; W.tape.root.visible = false; W.n.root.visible = nv; void n;
}
function renderPhoto() {
  // Grayson asleep in this bed, taken from above the foot: rendered once
  const G = W.g, c = W.photoCam; G.root.visible = true; W.tape.root.visible = false; W.n.root.visible = false;
  G.reset(); G.root.position.set(BEDC.x - 1.4, W.bed.top + 0.5, BEDC.z); G.root.rotation.set(0, 0, 0); G.root.rotation.order = 'YXZ'; G.root.rotation.y = -Math.PI / 2; G.root.rotation.x = -Math.PI / 2;
  G.setFace('neutral', { blink: true }); G.neck.rotation.y = 0.25;
  lightSet('room', 0, STAND); applyEnv(ctx, ROOM);
  c.position.set(BEDC.x - 6.5, 9.5, BEDC.z - 1.2); c.lookAt(BEDC.x + 2.0, W.bed.top + 0.6, BEDC.z - 0.1); c.updateMatrixWorld(true);
  const sh = W.sheetOver; sh.visible = true;
  ctx.renderer.setRenderTarget(W.photoRT); ctx.renderer.clear(); ctx.renderer.render(ctx.scene, c); ctx.renderer.setRenderTarget(null);
  sh.visible = false; G.root.rotation.set(0, 0, 0); G.root.rotation.order = 'XYZ';
}

// ---- a frame ----
function faceOf(c, name, t, ph, viseme) { c.setFace(name, { blink: blinkAt(t, ph) && !['shocked', 'terrified'].includes(name), viseme }); }
const hand = (c, i) => { c.root.updateMatrixWorld(true); return c.arms[i].localToWorld(v3(0, -ARM, 0.05)); };
function armTo(c, i, y) { const sy = c.arms[i].getWorldPosition(v3(0, 0, 0)).y, len = ARM * c.root.scale.y; return Math.acos(clamp((sy - y) / len, -1, 1)); }
const snap = (c, i, p) => { const h = hand(c, i); c.root.position.x += p.x - h.x; c.root.position.z += p.z - h.z; };
const faceTo = (c, p) => { c.root.rotation.y = Math.atan2(p.x - c.root.position.x, p.z - c.root.position.z); };

function renderAt(t) {
  if (!W.photoDone) { renderPhoto(); W.photoDone = true; }
  const first = !ctx.sub || ctx.sub.i === 0, sh = shotAt(W.shots, t), n = sh.name, e = EV, G = W.g, N = W.n, T = W.tape;
  const sets = { ext: 'out', sign: 'out', road: 'out', hall: 'hall', tube: 'hall', peek: 'hall', spk: 'hall', look: 'hall', froze: 'hall', never: 'hall', nurse: 'hall', mask: 'hall', point: 'hall', plate: 'hall', open: 'hall',
    bed: 'room', tv: 'room', photo: 'room', tvon: 'room', feed: 'room', date: 'room', turn: 'room', whisper: 'room', behind: 'room', real: 'room', wake: 'ward', rows: 'ward', occ: 'ward', his: 'ward' };
  const set = sets[n];
  applyEnv(ctx, set === 'out' ? OUT : set === 'ward' ? WARDP : set === 'room' ? ROOM : HALL);
  W.ext.visible = set === 'out'; W.corr.visible = set === 'hall' || n === 'bed'; W.room.visible = set === 'room' || n === 'open' || n === 'plate'; W.ward.visible = set === 'ward';
  // outside: the windows catch, floor by floor
  const k0 = clamp((t - e.on) / 1.8); W.extK = smooth(0.1, 0.9, k0);
  if (set === 'out') W.block.lights(k0, t);
  // tubes
  if (set === 'hall' || set === 'room') {
    const f = flickAll(t), lit = t < e.out ? 1 : 0;
    W.panels.forEach(({ p, z }, i) => p.level(tubeK(t, Math.round(z)) * f));
    W.panel217.level(tubeK(t, 3) * lit);
  }
  if (set === 'ward') W.ringK = wardLights(t);
  W.d217.rotation.y = -Math.PI / 2 + 1.5 * easeOut(clamp((t - e.open) / 1.6));

  // ---- Grayson ----
  G.root.visible = true; T.root.visible = false; N.root.visible = false; G.root.rotation.set(0, 0, 0); let focus = v3(0, 0, gStop());
  const gp = G.root.position;
  if (set === 'out') {
    gp.copy(EXT).add(v3(-0.6, 0, gRoadZ(t))); G.root.rotation.y = Math.PI; pose(G, 'walk', t * 0.8); faceOf(G, 'neutral', t, 0.4);
    G.root.visible = n === 'road';
  } else if (n === 'hall') {
    gp.set(0.3, 0, hallZ(t)); G.root.rotation.y = Math.PI; pose(G, 'walk', t * 0.75); faceOf(G, 'neutral', t, 0.4); focus = gp.clone();
  } else if (n === 'tube') {
    gp.set(0.3, 0, gStop() - 1.2); G.root.rotation.y = Math.PI; pose(G, 'lookUp', t, { amt: 0.5 }); faceOf(G, 'surprised', t, 0.4); focus = gp.clone();
    G.root.rotation.y = 0.15;
  } else if (n === 'peek') {
    const d = DOORS.find((q) => q.s < 0 && q.z < -30 && q.z > -50); gp.set(-4.6, 0, d.z + 0.6); G.root.rotation.y = -Math.PI / 2 + 0.1; pose(G, 'idle', t); G.neck.rotation.y = -0.15; faceOf(G, 'surprised', t, 0.4); focus = gp.clone();
  } else if (['spk', 'look', 'froze', 'never', 'nurse'].includes(n)) {
    gp.set(0.2, 0, gStop()); G.root.rotation.y = Math.PI; focus = gp.clone();
    if (n === 'spk' || n === 'look') { pose(G, 'lookUp', t, { amt: 0.45 }); faceOf(G, 'surprised', t, 0.4); }
    if (n === 'froze') { pose(G, 'still', t); faceOf(G, 'scared', t, 0.4); G.neck.rotation.x = -0.05; }
    if (n === 'never') { pose(G, 'idle', t); G.neck.rotation.y = 0.35 * Math.sin((t - L(8).start) * 1.6); faceOf(G, 'nervous', t, 0.4); }
    if (n === 'nurse') { G.root.rotation.y = Math.PI; pose(G, 'still', t); faceOf(G, 'scared', t, 0.4); }
  } else if (n === 'point' || n === 'mask') {
    G.root.visible = n === 'point'; gp.set(0.2, 0, gStop() - 30); G.root.rotation.y = Math.PI; pose(G, 'still', t);
    focus = NURSE.clone();
  } else if (n === 'plate') {
    G.root.visible = false; focus = v3(0, 0, D217 + 6);
  } else if (n === 'open') {
    gp.set(HW - 2.6, 0, D217 + 1.7); G.root.rotation.y = Math.PI / 2; pose(G, 'idle', t); focus = gp.clone();
    const d = W.d217; d.updateMatrixWorld(true); const hp = d.localToWorld(d.handle.clone());
    const reach = smooth(L(12).start + 0.05, e.open - 0.05, t), rel = smooth(e.open + 0.85, e.open + 1.2, t);
    const a = armTo(G, 0, hp.y); G.arms[0].rotation.x = -a * reach * (1 - rel); G.arms[0].rotation.z = 0;
    if (reach >= 1 && rel < 1) { const h = hand(G, 0); const dz = (hp.z - h.z), dx = (hp.x - h.x); gp.x += dx * (1 - rel); gp.z += dz * (1 - rel); }
    if (t > e.open + 1.0) { gp.x += Math.min(2.5, (t - e.open - 1.0) * 1.8); gp.z = lerp(gp.z, D217 - 0.2, smooth(e.open + 1.0, e.open + 1.7, t)); pose(G, 'walk', t * 0.6); }
    faceOf(G, 'nervous', t, 0.4);
  } else if (n === 'bed') {
    gp.set(lerp(9.4, 11.6, smooth(L(13).start - 0.15, L(13).end + 0.3, t)), 0, -157.4); G.root.rotation.y = Math.PI / 2 - 0.12; pose(G, 'walk', t * 0.55); faceOf(G, 'nervous', t, 0.4);
  } else if (set === 'room') {
    gp.copy(STAND); faceTo(G, TVP); pose(G, 'still', t);
    if (['photo', 'feed', 'date', 'turn', 'whisper', 'behind'].includes(n)) G.root.visible = false;
    G.neck.rotation.x = n === 'photo' ? 0.3 : -0.42;
    faceOf(G, n === 'real' ? 'terrified' : ['date', 'turn', 'whisper', 'behind'].includes(n) ? 'scared' : n === 'photo' ? 'shocked' : 'nervous', t, 0.4);
    if (n === 'real') { const k = smooth(L(22).start + 1.1, L(23).start, t); G.neck.rotation.y = lerp(0, -0.55, k); G.neck.rotation.x = lerp(-0.3, -0.05, k); }
  } else if (set === 'ward') {
    gp.copy(WARD).add(v3(0, 0, 6.7)); G.root.rotation.y = Math.PI; pose(G, 'still', t);
    if (n === 'wake') { const k = smooth(L(24).start + 0.3, L(24).end, t); G.neck.rotation.y = lerp(0.5, -0.45, k); }
    faceOf(G, n === 'wake' ? 'scared' : 'terrified', t, 0.4); if (n === 'his') { G.neck.rotation.x = 0.32; faceOf(G, 'sad', t, 0.4); }
    focus = gp.clone();
  }

  // ---- the Grayson on the tape (only ever drawn into the feed) ----
  T.root.position.copy(FEEDG); T.root.rotation.set(0, 0, 0);
  const tv = W.tv.localToWorld(v3(0, -2, 1)), tturn = smooth(e.turn, e.turn + 1.4, t), step = smooth(e.turn + 0.6, L(21).start, t);
  const away = Math.atan2(BEDC.x - FEEDG.x, BEDC.z - FEEDG.z), toward = Math.atan2(tv.x - FEEDG.x, tv.z - FEEDG.z);
  T.root.position.lerp(v3(FEEDG.x - 3.2, 0, FEEDG.z + 2.6), step * 0.85);
  T.root.rotation.y = lerp(away, toward + (Math.abs(toward - away) > Math.PI ? 0 : 0), tturn); pose(T, 'still', t); T.neck.rotation.x = -0.38 * tturn;
  const wl = L(21); faceOf(T, 'neutral', t, 0.9, visemeAt(wl.text, wl.start + 0.02, wl.end - 0.02, t));
  if (t > wl.end) T.setFace('neutral');

  // ---- the nurse: never seen moving; she is somewhere, then somewhere else ----
  if (['nurse', 'mask', 'point'].includes(n)) {
    N.root.visible = n !== 'nurse' || t >= e.nurse; N.root.position.copy(NURSE); N.root.rotation.y = 0; pose(N, 'still', t);
    N.neck.rotation.z = 0.12 * smooth(L(10).start + 0.6, L(10).end, t);   // the head tilts, once, slowly
    const pk = smooth(e.point, e.point + 1.4, t); const A = N.arms[0]; A.rotation.x = -1.45 * pk; A.rotation.y = 0; A.rotation.z = -0.35 * pk;   // her right arm rises
    if (n === 'point') { N.root.rotation.y = 0.05; }
  }

  // the tape and the screen
  if (set === 'room') {
    const on = t >= e.tvon ? 1 : 0, snow = on ? clamp(1 - (t - e.tvon) / 0.5) : 0;
    const gl = (t > e.nurseTV - 0.12 && t < e.nurseTV + 0.18 ? 1 : 0) + (t > e.turn && t < e.turn + 0.1 ? 0.6 : 0);
    W.screenM.uniforms.on.value = on * (t < e.out ? 1 : 0); W.screenM.uniforms.snow.value = Math.max(snow, gl * 0.35); W.screenM.uniforms.tm.value = t; W.screenM.uniforms.glitch.value = gl;
    if (first && on) { drawUI(t); W.ui.needsUpdate = true; }
    if (on && t < e.out) renderFeed(t, n);
  }

  lightSet(set, t, focus);
  W.air.update(t); W.air.list.dust.position.copy(set === 'ward' ? WARD : set === 'room' ? v3(16, 0, -158) : v3(0, 0, focus.z));
  W.air.list.dust.visible = set !== 'out';
  const black = (t > e.out && t < e.back) ? 1 : n === 'real' && t > e.out - 0.04 ? 1 : 0;
  const span = set === 'out' ? 220 : 60;
  frame(ctx, t, sh, { steady: true, shake: 0, shadowSpan: span, shadows: set === 'out', black });
  return n;
}

export async function setup() {
  ctx = await initStage('ep27', { look: 'pro', avatars: ['farm_grayson'] }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'surprised', 'shocked', 'scared', 'terrified', 'nervous', 'sad']);
  const { scene, camera } = ctx; camera.far = 3000; camera.near = 0.2; camera.updateProjectionMatrix();
  rig(); outside(); corridor(); room217(); ward(); people();
  // a blanket drawn over the sleeping Grayson for the photograph only
  const sb = new Batch(); sb.box(paint('#9ec3b4', { roughness: 0.92 }), 3.8, 0.9, 5.8, 0, 0, 0, { r: 0.35 }); W.sheetOver = sb.done(); W.sheetOver.position.set(BEDC.x + 0.4, W.bed.top + 0.62, BEDC.z); W.sheetOver.rotation.y = -Math.PI / 2; W.sheetOver.visible = false; W.room.add(W.sheetOver);
  const list = { dust: dust(scene, { size: 40, height: 10, centre: v3(0, 5, 0), count: 380, color: '#eef6e6', amount: 0.18, pointSize: 0.4 }) };
  W.air = atmos(...Object.values(list)); W.air.list = list;
  W.shots = shots();
  void rng; void surf; void tmpC;
  return expose(ctx, renderAt, L(11).start + 1.0, EV);
}
