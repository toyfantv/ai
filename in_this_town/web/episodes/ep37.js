// Episode 37: The Woman Beneath the Stairs (Psychological Horror 3/5). A staircase nobody uses in an abandoned school; every night someone counts its steps.
// Quinn, searching for her missing brother, hears the count from underneath the stairs, crouches, and finds a woman with hair over her face and knees bent
// backward: "Have you seen my son?" The face lifts: no eyes, two deep black holes (scare 1). Quinn runs, the count comes faster (the woman is nearer at
// every flicker); the exit opens onto the same staircase; the woman waits at the bottom with a child's satchel, her brother's; a small voice from inside
// says "Quinn, don't look up." Something crawls across the ceiling, wearing her brother's face (scare 2). The school, the stairs and the woman are original.
// The world: the staircase hall at the origin (x -14..9.6, z 0..46; stairs along the right wall, foot at z 16; the cavity under them opens to -x at z 28..38),
// the corridor z -72..0, a rotated copy of the hall beyond the exit door (only for the "same staircase" shot), the school outside at EX, a photo set at PH.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, altiCanvas } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, NIGHT } from '../engine/stage.js';
import { Batch, surf, paint, building } from '../engine/kit.js';
import { dust, atmos } from '../engine/atmos.js';
import { canvasTex } from '../engine/props.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { aimArm as aimArm0, applyPose, sample, blend, restPose, loadAnimSet, keyed } from '../engine/anims.js';
const aimArm = (c, side, p, k = 1) => { c.root.updateMatrixWorld(true); aimArm0(c, side, p, k); };
import { bareTrees, ironFence } from '../engine/mansion.js';
import { puppet, stairHall, schoolCorridor, satchel, flashlightProp, dustFall, handPrint, STAIR, ofuda } from '../engine/folklore.js';

let ctx, L, EV;
const W = { qh: v3(), wh: v3(), wc: v3(), ch: v3(0.35, 9, 3.6), qp: v3(), hand: v3(), flyerP: v3(), flyerN: v3(0, 0, -1), satP: v3(0, 3, 12) };
const EX = v3(0, 0, 900), PH = v3(0, 0, -1600);
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const fr = (x) => x - Math.floor(x);
const ratchet = (x, n) => (Math.floor(x * n) + smooth(0, 0.3, fr(x * n))) / n;   // a head that moves in small ticks
const QC = v3(-2.75, 0, 33), QE = v3(0.2, 0, 3.2);
const CAV = v3(5.6, 0, 32.5);
const QSKIN = '#f2c9a0', BSKIN = '#f2c8a2';

// ---- palettes ----
const HALL = { ...NIGHT, ...P({ top: '#05070e', horizon: '#080b14', haze: '#090c15', sunColor: '#a8bcdc', hemiSky: '#7788aa', hemiGround: '#3a342c' }), sunI: 0, sunDisc: 0, stars: 0, moon: 0, hemiI: 0.72, amb: 0.17, envI: 0.34, exposure: 1.22, bloom: 0.03, fogNear: 45, fogFar: 200, saturation: 0.98, contrast: 1.08, bounce: 0.12, win: 0, lamp: 0 };
const CORR = { ...HALL, ...P({ hemiSky: '#7c90a8', hemiGround: '#3a3a30', haze: '#0a0f15' }), hemiI: 0.78, amb: 0.17, exposure: 1.18, fogNear: 60, fogFar: 240 };
const OUT = { ...NIGHT, ...P({ top: '#060a1c', horizon: '#26365c', haze: '#1b2744', sunColor: '#b6c8e8', hemiSky: '#6a7ea8', hemiGround: '#20242a' }), sunI: 2.2, sunDir: v3(-0.55, 0.62, -0.55), sunDisc: 0, stars: 0.8, moon: 1, hemiI: 1.15, amb: 0.16, envI: 0.34, exposure: 1.32, bloom: 0.04, fogNear: 70, fogFar: 420, saturation: 1.0, contrast: 1.08, bounce: 0.08, win: 0, lamp: 0 };
const PHOTO = { ...OUT, ...P({ top: '#cdd8e4', horizon: '#e6e4dc', haze: '#e6e4dc', sunColor: '#fff2dc', hemiSky: '#f4f2ec', hemiGround: '#b8ab98' }), sunI: 1.6, sunDir: v3(0.3, 0.7, 0.7), hemiI: 1.05, amb: 0.25, envI: 0.8, exposure: 1, bloom: 0, fogNear: 400, fogFar: 900 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  return { count: [s(3), s(4), s(5)], fast: [s(19), s(20), s(21)], walk0: 10.9, stop: 14.1, go: 15.0, at: 16.4, crouch: s(8) + 0.05, S1: s(15) - 0.42, scream: s(17) - 0.05, up: s(17) + 0.72, run: s(17) + 1.2, hallEnd: s(17) + 2.75, door: 39.55, open: s(23) + 0.04, inHall: s(23) + 1.95, S2: e(31) + 0.06, roll: s(32) + 0.25, end: ctx.dur };
}

// ---- the sets ----
function exterior() {
  const g = new THREE.Group(); g.position.copy(EX); ctx.scene.add(g); W.ext = g;
  const b = new Batch();
  b.box(surf('grass', '#3f5236', { roughness: 1 }), 700, 0.4, 700, 0, -0.2, 0, { r: 0.02 });
  b.box(surf('concrete', '#6a665e'), 8, 0.1, 60, 0, 0.04, -36, { r: 0.02 });
  ironFence(b, -48, -5.5, -48, { h: 7 }); ironFence(b, 5.5, 48, -48, { h: 7 });
  b.done(g);
  const sch = building({ floors: 2, floorH: 10, w: 72, d: 22, style: 'siding', wall: '#6a6052', trim: '#3a3026', dark: '#0c0e14', lit: 0, shutters: null, door: '#2a2018', seed: 37 }); sch.position.set(0, 0, 0); sch.rotation.y = Math.PI; g.add(sch);
  // a low bell tower and boards over the ground-floor windows
  const tb = new Batch(), wd = surf('plank', '#4e3f30', { roughness: 0.85 });
  tb.box(surf('siding', '#5c5346'), 8, 8, 8, 0, 25, 0, { r: 0.05 }); tb.add(paint('#2a2622', { roughness: 0.9 }), new THREE.ConeGeometry(6.6, 5, 4), 0, 31.5, 0, Math.PI / 4);
  tb.box(paint('#0a0a0e'), 4, 4, 0.2, 0, 25.5, -4.1, { r: 0.02 });
  for (let i = 0; i < 18; i++) { const x = -32 + i * 3.8; tb.box(wd, 3.4, 0.5, 0.14, x, 4.4 + (i % 3) * 0.9, -11.4, { r: 0.03, rz: (i % 2 ? 1 : -1) * 0.14 }); } tb.done(g);
  bareTrees(g, [[-40, -24], [36, -28], [-22, -40], [52, -14], [-58, -10], [24, -44]], { color: '#1a1a1c' });
  const t = canvasTex(512, 220, (x, w, h) => { x.fillStyle = '#c9c2ae'; x.fillRect(0, 0, w, h); x.fillStyle = '#2a2018'; x.font = '900 62px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('SCHOOL CLOSED', w / 2, 92); x.font = '700 40px ITTInter, sans-serif'; x.fillText('KEEP OUT', w / 2, 168); x.fillStyle = 'rgba(70,40,20,0.5)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * w, Math.random() * h, 8, 40); }); t.colorSpace = THREE.SRGBColorSpace;
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.15), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })); sg.position.set(0, 4, -48.1); sg.rotation.y = Math.PI; g.add(sg);
  // a chained gate
  const gb = new Batch(), ir = paint('#16171a', { metalness: 0.6, roughness: 0.45 }); for (const s of [-1, 1]) { for (let x = 0.5; x < 5.4; x += 0.8) gb.box(ir, 0.12, 7, 0.12, s * x, 3.5, -48, { r: 0.03 }); gb.box(ir, 5.2, 0.2, 0.2, s * 2.8, 6.2, -48, { r: 0.05 }); gb.box(ir, 5.2, 0.2, 0.2, s * 2.8, 1, -48, { r: 0.05 }); } gb.done(g);
}
function studio() {   // a plain seamless backdrop for the flyers' photographs
  const g = new THREE.Group(); g.position.copy(PH); ctx.scene.add(g); W.pho = g;
  const b = new Batch(); b.box(paint('#b9c6c8', { roughness: 0.9 }), 60, 0.2, 40, 0, -0.1, 0, { r: 0.02 }); b.box(paint('#b9c6c8', { roughness: 0.9 }), 60, 30, 0.2, 0, 15, -8, { r: 0.02 }); b.done(g);
}

// ---- people ----
const KIDS = [['farm_mia', 'MIA', 'AGE 12'], ['farm_noah', 'NOAH', 'AGE 11'], ['farm_finn', 'FINN', 'AGE 10'], ['farm_red_kid', 'SAM', 'AGE 9'], ['farm_young_kid', 'LEO', 'AGE 8']];
const ALLC = () => [W.q, W.bro, W.bf, ...W.kids];
function people() {
  const mk = (avatar, skin) => { const c = makeCharacter({ avatar, alti: true, skin, caustic: false }); ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); c.root.visible = false; return c; };
  W.q = mk('farm_ep33_quinn', QSKIN); W.bro = mk('farm_ep37_brother', BSKIN); W.bf = mk('farm_ep37_brother', BSKIN);
  W.kids = KIDS.map(([a]) => mk(a));
  for (const c of ALLC()) { c.reset(); c.root.updateMatrixWorld(true); armLen(c); }
  // the woman: a puppet posed by world points (her joints are hand-keyed; the knees are bent the wrong way by the pole vectors)
  W.wo = puppet({ skin: '#c3bfb3', bodyMat: paint('#c6bea8', { roughness: 0.92 }), sleeveMat: paint('#b9b19c', { roughness: 0.92 }), au: 3.2, al: 3.9, lu: 3.4, ll: 3.8, finger: 1.0, headOpts: { skin: '#b9b4a8' }, hairOpts: { len: 8.6 } }); ctx.scene.add(W.wo);
  // the thing on the ceiling: long bare limbs, a stretched yellow hoodie, and the head he wore
  W.cr = puppet({ skin: '#bdb5a8', bodyMat: paint('#a2862e', { roughness: 0.95 }), sleeveMat: paint('#bdb5a8', { roughness: 0.8 }), au: 3.7, al: 4.3, lu: 3.7, ll: 4.1, finger: 0.72, head: false, hair: false, robe: false, width: 0.62, thick: 0.55 }); ctx.scene.add(W.cr);
  const n = W.bf.neck; n.removeFromParent(); W.cr.mount.add(n); n.position.set(0, -1.2, 0); n.rotation.set(0, 0, 0); n.scale.setScalar(1.6);
  // the seam where the face was put on: raw skin and stitches round the edge, the face itself left clear
  const bx = new THREE.Box3(); W.bf.headParts.forEach((m) => { m.geometry.computeBoundingBox(); bx.union(m.geometry.boundingBox); });
  W.hb = bx; const sw = bx.max.x - bx.min.x, sh = bx.max.y - bx.min.y;
  const seam = canvasTex(512, 512, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = 'rgba(92,16,20,0.96)'; const c = (a, rx, ry) => [w / 2 + Math.cos(a) * rx, h * 0.5 + Math.sin(a) * ry]; const N = 42, pts = [], out = []; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, j = 7 * Math.sin(i * 7.3) + 5 * Math.sin(i * 3.1), k = 9 * Math.sin(i * 5.7) + 5 * Math.sin(i * 2.3); pts.push(c(a, w * 0.41 + j, h * 0.41 + j)); out.push(c(a, w * 0.475 + k, h * 0.475 + k)); } x.beginPath(); x.moveTo(out[0][0], out[0][1]); for (let i = 1; i < N; i++) x.lineTo(out[i][0], out[i][1]); x.closePath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = N - 1; i >= 0; i--) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); x.fill('evenodd');
    x.strokeStyle = '#150406'; x.lineWidth = 8; x.lineCap = 'round'; for (let i = 0; i < N; i += 2) { const [px, py] = pts[i], [dx, dy] = [px - w / 2, py - h / 2], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l; x.beginPath(); x.moveTo(px - ux * 15 - uy * 3, py - uy * 15 + ux * 3); x.lineTo(px + ux * 16 + uy * 3, py + uy * 16 - ux * 3); x.stroke(); } x.strokeStyle = 'rgba(30,4,8,0.9)'; x.lineWidth = 4; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < N; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); x.stroke(); });
  seam.colorSpace = THREE.SRGBColorSpace; const sm = new THREE.Mesh(new THREE.PlaneGeometry(sw * 1.0, sh * 1.0), new THREE.MeshStandardMaterial({ map: seam, transparent: true, roughness: 0.55, depthWrite: false })); sm.position.set((bx.min.x + bx.max.x) / 2, (bx.min.y + bx.max.y) / 2, bx.max.z + 0.05); sm.userData.noAO = true; n.add(sm); W.seam = sm;
  { const B = new THREE.Box3(), m = W.q.neck; W.q.headParts.forEach((h) => { h.geometry.computeBoundingBox(); B.union(h.geometry.boundingBox); }); const w = B.max.x - B.min.x, h = B.max.y - B.min.y, d = B.max.z - B.min.z, cap = new THREE.Mesh(new RoundedBoxGeometry(w * 1.04, h * 1.04, d * 0.56, 4, Math.min(w, h) * 0.22), new THREE.MeshStandardMaterial({ color: '#15142a', roughness: 0.72, metalness: 0, envMapIntensity: 0.5 })); cap.position.set((B.min.x + B.max.x) / 2, (B.min.y + B.max.y) / 2, B.min.z + d * 0.28 - 0.03); cap.castShadow = true; m.add(cap); }
  // props
  W.sat = satchel({ name: 'THEO' }); ctx.scene.add(W.sat); W.sat.visible = false; W.pSat = satchel({ name: 'THEO' }); ctx.scene.add(W.pSat); W.pSat.visible = false;
  W.fl = flashlightProp(); ctx.scene.add(W.fl); W.fl.visible = false;
  W.fl2 = flashlightProp(); ctx.scene.add(W.fl2); W.fl2.visible = false;   // dropped by the cavity when she runs
  W.held = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 })); W.held.visible = false; W.held.castShadow = true; ctx.scene.add(W.held); { const bk = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.5), new THREE.MeshStandardMaterial({ color: '#d8d1bc', roughness: 0.9 })); bk.rotation.y = Math.PI; bk.position.z = -0.006; W.held.add(bk); }
}
function armLen(c) { if (!c._alen) { c.reset(); const r = c.root.rotation.clone(), p = c.root.position.clone(), s = c.root.scale.x; c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.scale.setScalar(1); c.root.updateMatrixWorld(true);
  const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3().setFromObject(c.arms[0]); c._alen = sh.y - bx.min.y - 0.25; c.root.rotation.copy(r); c.root.position.copy(p); c.root.scale.setScalar(s); } return c._alen; }
const handOf = (c, side) => { c.root.updateMatrixWorld(true); return c.arms[side].localToWorld(v3(0, -armLen(c), 0.12)); };
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(c.faceStyle ? c.faceStyle(name) : name, { blink: o.noBlink ? false : blinkAt(t, ph) && !['shocked', 'terrified'].includes(name), viseme: o.viseme, gaze: o.gaze }); }
function place(c, p, yaw) { c.root.visible = true; c.reset(); c.root.position.copy(p); c.root.rotation.set(0, yaw, 0); c.root.scale.setScalar(1); }

// ---- the flyers (the brother's portrait, rendered once on the photo set, then printed) ----
function renderRT(rt, cam) { const { renderer, scene } = ctx; renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(null); }
function portrait(c, setup) {
  for (const k of ['hall', 'corr', 'ext']) W[k].visible = false; if (W.hall2) W.hall2.visible = false; W.pho.visible = true; W.wo.visible = false; W.cr.visible = false;
  applyEnv(ctx, PHOTO); W.pl.forEach((l) => { l.intensity = 0; }); W.key.intensity = 0; W.flash.intensity = 0;
  ALLC().forEach((x) => { x.root.visible = false; });
  place(c, PH.clone(), 0.2); pose(c, 'still', 0); face(c, 'happy', 0.5, 0, { noBlink: true }); setup?.(c);
  const sun = ctx.sun; sun.position.copy(PH).add(v3(20, 40, 40)); sun.target.position.copy(PH); sun.castShadow = false;
  const cam = new THREE.PerspectiveCamera(30, 0.82, 0.3, 400); cam.position.copy(PH).add(v3(0.4, 4.2, 11.4)); cam.lookAt(PH.clone().add(v3(0, 3.6, 0))); cam.updateMatrixWorld(true);
  const W0 = 410, H0 = 500, rt = new THREE.WebGLRenderTarget(W0, H0, { type: THREE.HalfFloatType }); renderRT(rt, cam);
  const buf = new Uint16Array(W0 * H0 * 4); ctx.renderer.readRenderTargetPixels(rt, 0, 0, W0, H0, buf);
  const cv = document.createElement('canvas'); cv.width = W0; cv.height = H0; const x = cv.getContext('2d'), img = x.createImageData(W0, H0), F = THREE.DataUtils.fromHalfFloat;
  for (let yy = 0; yy < H0; yy++) for (let xx = 0; xx < W0; xx++) { const i = ((H0 - 1 - yy) * W0 + xx) * 4, o = (yy * W0 + xx) * 4; for (let k = 0; k < 3; k++) { let v = F(buf[i + k]); v = 1 - Math.exp(-v * 1.5); img.data[o + k] = 255 * Math.pow(clamp(v), 1 / 2.2); } img.data[o + 3] = 255; }
  x.putImageData(img, 0, 0); rt.dispose(); c.root.visible = false; return cv;
}
function flyer(photo, name, age, seed, tone = 0) {
  const c = document.createElement('canvas'); c.width = 620; c.height = 816; const x = c.getContext('2d');
  x.fillStyle = tone ? '#c7b98f' : '#ede6d2'; x.fillRect(0, 0, 620, 816);
  x.fillStyle = '#b01c1c'; x.font = '900 118px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('MISSING', 310, 118);
  x.drawImage(photo, 105, 148, 410, 500); x.strokeStyle = '#2a241c'; x.lineWidth = 4; x.strokeRect(105, 148, 410, 500);
  x.fillStyle = '#1c1812'; x.font = '900 64px ITTInter, sans-serif'; x.fillText(`${name}, ${age}`, 310, 720); x.font = '700 34px ITTInter, sans-serif'; x.fillText('LAST SEEN NEAR THE OLD SCHOOL', 310, 776);
  let s = seed * 77; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; x.fillStyle = `rgba(90,70,40,${tone ? 0.12 : 0.05})`; for (let i = 0; i < 80; i++) x.fillRect(r() * 620, r() * 816, 4 + r() * 60, 3 + r() * 40);
  if (tone) { x.fillStyle = 'rgba(70,50,20,0.28)'; x.fillRect(0, 0, 620, 816); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function renderFlyers() {
  const brotherSet = (c) => { c.root.rotation.y = 0.12; c.root.updateMatrixWorld(true); const h = PH.clone().add(v3(-2.6, 3.6, 0.8)); aimArm(c, 0, h, 1); const hp = handOf(c, 0); W.pSat.visible = true; W.pSat.position.copy(hp).add(v3(0, 0.05, 0)); W.pSat.rotation.set(0, 0.5, 0); W.pSat.scale.setScalar(0.82); };
  const cv = portrait(W.bro, brotherSet); W.pSat.visible = false; W.broPhoto = cv;
  W.held.material.map = flyer(cv, 'THEO', 'AGE 9', 37); W.held.material.needsUpdate = true;
  // the corridor's old flyers, faded, a wall of them by the hall door
  KIDS.forEach(([, n, a], i) => { const c = W.kids[i], ph = portrait(c), t = flyer(ph, n, a, i + 1, 1); W.board[i].forEach((m) => { m.material.map = t; m.material.needsUpdate = true; }); });
  // the new flyer at the top of the board
  W.board[5].forEach((m) => { m.material.map = W.held.material.map; m.material.needsUpdate = true; });
  W.pho.visible = false;
}
function boardOfFlyers() {
  W.board = [[], [], [], [], [], []];
  let seed = 3; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 28; i++) { const k = i === 11 ? 5 : Math.floor(r() * 5); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 2.0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 })); const col = i % 7, row = Math.floor(i / 7);
    m.position.set(-6.92 + 0.008 * i, 8.3 - row * 2.15 + (r() - 0.5) * 0.2, -3.6 - col * 1.72 + (r() - 0.5) * 0.25); m.rotation.y = Math.PI / 2; m.rotation.z = (r() - 0.5) * 0.14; W.corr.add(m); W.board[k].push(m); }
}

// ---- light rig ----
function rig() {
  W.pl = []; for (let i = 0; i < 8; i++) { const l = new THREE.PointLight('#ffffff', 0, 30, 1.6); ctx.scene.add(l); W.pl.push(l); }
  const spot = (mapS) => { const s = new THREE.SpotLight('#ffffff', 0, 60, 0.6, 0.75, 1.2); s.castShadow = true; s.shadow.mapSize.set(mapS, mapS); s.shadow.bias = -0.0006; s.shadow.normalBias = 0.04; ctx.scene.add(s); ctx.scene.add(s.target); return s; };
  W.key = spot(1024); W.flash = spot(1024);
}
const setL = (i, p, col, I, dist) => { const l = W.pl[i]; l.position.copy(p); l.color.set(col); l.intensity = I; l.distance = dist; };
// flicker of the hall bulb and the corridor tubes: dips on each count, a nervous stutter otherwise
function dipAt(t, list, w = 0.11) { return list.some((c) => t > c - w && t < c + 0.03) ? 0 : 1; }
function bulbK(t) { const e = EV; return (0.85 + 0.15 * noise1(t * 9.0)) * (e.count.some((c) => t > c - 0.08 && t < c + 0.1) ? 0.25 : 1); }
function tubeK(t, z) { const n = noise1(t * 13 + z * 0.3); const base = (((Math.abs(Math.floor(z)) * 7) % 5) === 2 ? 0.05 : 1) * (n > 0.72 ? 0.25 : 0.96); return base * dipAt(t, EV.fast); }
function lightSet(set, t, f) {
  W.pl.forEach((l) => { l.intensity = 0; }); W.key.intensity = 0; W.flash.intensity = 0;
  const key = (p, tgt, col, I, ang = 0.6, dist = 60) => { W.key.position.copy(p); W.key.target.position.copy(tgt); W.key.color.set(col); W.key.intensity = I; W.key.angle = ang; W.key.distance = dist; };
  if (set === 'hall') {
    const b = bulbK(t); W.hall.bulb.color.set('#ffc98a').multiplyScalar(1.5 * b);
    setL(0, v3(4.7, 10.5, 13.5), '#ffc78a', 42 * b, 28); setL(1, v3(-12.8, 7.5, 12), '#7f95c6', 26, 26); setL(2, v3(-12.8, 7.5, 30), '#7f95c6', 26, 26); setL(3, v3(-3, 10.5, 40), '#5a6c98', 10, 24);
    setL(4, v3(3.0, 3.8, 32.5), '#6f7fa8', 7.5, 11);   // a faint fill inside the cavity, so she reads
    key(v3(-34, 21, f.z - 3), v3(f.x, 3.2, f.z), '#a4b8e0', 620, 0.42, 70);
  } else if (set === 'corr') {
    const near = [...W.corr.tubes].sort((a, b) => Math.abs(a.z - f.z) - Math.abs(b.z - f.z)).slice(0, 4);
    near.forEach(({ z }, i) => setL(i, v3(0, 10.9, z), '#cfe4d0', 30 * tubeK(t, z), 26));
    setL(4, v3(5.4, 7, f.z), '#7f95c6', 16, 22); setL(5, v3(0, 8.4, -69.5), '#4fae74', 9, 12);
    key(v3(31, 20, f.z + 3), v3(f.x, 3.2, f.z), '#a4b8e0', 560, 0.42, 70);
  } else if (set === 'same') {
    setL(0, v3(-4.7, 10.5, -85.5), '#ffc78a', 44, 30); setL(1, v3(12.8, 7.5, -90), '#7f95c6', 22, 28); setL(2, v3(0, 10.5, -74), '#7a8cb8', 14, 22); near(-65);
    key(v3(-1, 11, -55), v3(0, 3.5, -68), '#a4b8e0', 90, 0.8, 40);
  } else if (set === 'ext') { /* the moon */ }
  function near(z) { setL(3, v3(0, 10.9, z), '#cfe4d0', 26, 26); }
}

// ---- Quinn ----
function quinnPath(t) {
  const e = EV;
  if (t < e.stop) return { p: v3(-2.6, 0, lerp(4, 24, clamp((t - e.walk0) / (e.stop - e.walk0)))), yaw: 0, m: 'walk' };
  if (t < e.go) return { p: v3(-2.6, 0, 24), yaw: 0.3 * easeInOut(smooth(e.stop, e.stop + 0.4, t)), m: 'still' };
  if (t < e.at) { const u = clamp((t - e.go) / (e.at - e.go)); return { p: lp3(v3(-2.6, 0, 24), QC, u), yaw: lerp(0.3, 0.1, u), m: 'walk' }; }
  if (t < e.up) return { p: QC.clone(), yaw: lerp(0.1, Math.PI / 2, easeInOut(smooth(e.at - 0.15, e.at + 0.4, t))), m: 'crouch' };
  if (t < e.run) { const k = easeInOut(smooth(e.up, e.run, t)); return { p: QC.clone().add(v3(-0.6 * k, 0, -0.4 * k)), yaw: lerp(Math.PI / 2, Math.PI - 0.05, k), m: 'rise', k }; }
  const A = v3(-3.35, 0, 32.6), B = v3(-1.2, 0, 2), C = v3(0, 0, -69.4), tm = e.hallEnd, td = e.door;
  if (t < tm) { const u = (t - e.run) / (tm - e.run), d = B.clone().sub(A); return { p: lp3(A, B, u), yaw: Math.atan2(d.x, d.z), m: 'run' }; }
  if (t < td) { const u = (t - tm) / (td - tm), d = C.clone().sub(B); return { p: lp3(B, C, u), yaw: Math.atan2(d.x, d.z), m: 'run' }; }
  return { p: C.clone(), yaw: Math.PI, m: 'door' };
}
const KNEEL_GO = keyed([{ t: 0, hips: [0, 0, 0], h: 1 }]);
function poseQuinn(t, n) {
  const Q = W.q, e = EV, R = quinnPath(t); W.qp.copy(R.p); W.fl.visible = false; W.held.visible = false;
  const inHall = t >= e.inHall;
  if (inHall) {
    place(Q, QE, 0); pose(Q, 'idle', t);
    const tr = Math.sin(t * 31) * 0.012 * (t > 56 ? 0.4 : 1); Q.torso.rotation.z = tr;
    const up = t > e.S2 ? easeOut(clamp((t - e.S2) / 0.2)) : smooth(57.5, e.S2, t) * 0.12;
    Q.neck.rotation.x = lerp(0, -0.72, up); Q.torso.rotation.x = -0.12 * up; Q.neck.rotation.y = -0.22 * up;
    if (t > e.S2) { aimArm(Q, 0, QE.clone().add(v3(-1.5, 2.6, 2.4)), 0.65 * up); aimArm(Q, 1, QE.clone().add(v3(1.5, 2.6, 2.4)), 0.65 * up); }
    face(Q, t > e.S2 ? 'terrified' : t > L(26).start ? 'shocked' : 'scared', t, 0.3, { noBlink: t > L(30).start });
    return;
  }
  if (R.m === 'run') { place(Q, R.p, R.yaw); applyPose(Q, sample('ss_run', t * 1.05, { loop: true }), { travel: 0 }); face(Q, 'terrified', t); return; }
  if (R.m === 'door') {
    // her palms land on the push bar: stand her where the arm actually reaches it (the door is at z -72, the bar on its near face)
    const barZ = -71.62, barY = 4.3;
    place(Q, R.p, R.yaw); pose(Q, 'idle', t); aimArm(Q, 0, v3(-1.3, barY, barZ), 1); { const hp = handOf(Q, 0); Q.root.position.z += barZ - hp.z; W.qp.z = Q.root.position.z; }
    pose(Q, 'idle', t); const k = clamp((t - e.door) / 0.12) * (1 - smooth(e.open + 0.35, e.open + 0.8, t));
    aimArm(Q, 0, v3(-1.3, barY, barZ), k); aimArm(Q, 1, v3(1.3, barY, barZ), k);
    if (t > e.open) Q.neck.rotation.x = -0.05;
    face(Q, t > e.open + 0.3 ? 'shocked' : 'scared', t, 0.3); return;
  }
  // the crouch at the opening (hand-keyed: Episode 34's kneel, adapted) and the flashlight in her right hand
  place(Q, R.p, R.yaw);
  const tg = n === 'panel' || R.m === 'crouch' || R.m === 'rise' ? v3(5.2, 4.0, 32.5) : R.m === 'still' ? v3(4.0, 3.4, 24 + 8 * smooth(e.stop + 0.1, e.go, t)) : R.p.clone().add(v3(Math.sin(R.yaw) * 12, 1.6, Math.cos(R.yaw) * 12));
  if (R.m === 'walk') pose(Q, 'walk', t * 0.8);
  if (R.m === 'still') { pose(Q, 'idle', t); Q.neck.rotation.y = 0.62 * easeInOut(smooth(e.stop, e.stop + 0.5, t)); }
  if (R.m === 'crouch' || R.m === 'rise') {
    const ck = easeInOut(smooth(e.crouch, e.crouch + 0.7, t)), kp = sample('kneel', t, { loop: true });
    if (R.m === 'crouch') applyPose(Q, blend(restPose(), kp, ck), { travel: 0 });
    else { pose(Q, 'idle', t); applyPose(Q, blend(kp, restPose(), R.k), { travel: 0 }); }
    if (R.m === 'crouch' && t >= e.S1) { const rc = easeOut(clamp((t - e.S1) / 0.12)); Q.torso.rotation.x -= 0.2 * rc; Q.neck.rotation.x -= 0.08 * rc; }
    if (R.m === 'crouch' && t >= L(13).start && t < L(13).end + 0.1) Q.neck.rotation.y = Math.sin((t - L(13).start) * 11.5) * 0.4 * smooth(L(13).start, L(13).start + 0.12, t) * (1 - smooth(L(13).end - 0.15, L(13).end + 0.05, t));
    Q.neck.rotation.x += R.m === 'crouch' ? 0.03 : 0;
  }
  const armK = R.m === 'rise' ? 1 - R.k : 1;
  if (t < e.scream + 0.25) { aimArm(Q, 0, tg, armK); const hp = handOf(Q, 0); W.fl.visible = true; W.fl.position.copy(hp); W.fl.lookAt(tg); W.fl.translateZ(-0.16); W.hand.copy(hp); }
  else W.fl.visible = false;
  // the flyer in her left hand as she walks in
  if (t < e.stop + 0.05) { const ap = R.p.clone().add(v3(Math.sin(R.yaw) * 1.7 + 2.1, 3.3, Math.cos(R.yaw) * 1.7)); aimArm(Q, 1, ap, 1); const hp = handOf(Q, 1); W.held.visible = true; W.held.position.copy(hp).add(v3(0, 1.0, 0)); const hd = Q.neck.getWorldPosition(v3()).add(v3(0, 0.6, 0)); W.held.lookAt(hd); W.flyerP.copy(W.held.position); W.flyerN.copy(hd).sub(W.held.position).normalize(); }
  const fx = t < e.stop ? 'nervous' : t < e.at ? 'surprised' : t < L(9).start + 0.9 ? 'nervous' : t < e.S1 ? 'scared' : 'terrified';
  face(Q, fx, t, 0.3, { viseme: t > e.scream && t < e.scream + 0.8 ? 'A' : undefined, noBlink: t > e.S1 });
}

// ---- the woman ----
function setWoman(P) { W.wo.visible = true; W.woP = P; W.wh.copy(P.head); W.wc.copy(P.chest); }
function poseWomanSeat(t) {
  const e = EV, s = (i) => L(i).start;
  const lift = ratchet(smooth(s(14), s(14) + 1.95, t), 9), K = t < e.S1 ? 0 : easeOut(clamp((t - e.S1) / 0.1));
  const pp = 2 + Math.sin(t * 1.1) * 0.02;
  const hips = v3(CAV.x + 0.1, 3.0, CAV.z), chest = v3(CAV.x - 0.35 + (K * -1.2), 5.15 + K * 0.1, CAV.z);
  const F0 = v3(-1, lerp(-0.92, -0.04, lift), 0).normalize(), tick = t < s(14) ? Math.sin(Math.floor(t * 1.7) * 91.0) * 0.12 : 0;
  const head = chest.clone().add(v3(lerp(-0.72, -0.5, lift), lerp(1.2, 1.56, lift), 0));
  if (K > 0) head.lerp(v3(1.95, 4.75, CAV.z - 0.1), K);
  const q = t > e.S1 + 0.12 ? (Math.sin(t * 57) * 0.008 + Math.sin(t * 31) * 0.005) : 0;
  head.z += tick * 0.06 + q;
  const U0 = v3(lerp(-0.92, -0.04, lift), 1, tick * 0.5).normalize();
  const roll = K * 0.2 + (t > e.S1 + 1 ? (t - e.S1 - 1) * 0.03 : 0), U = U0.clone().applyAxisAngle(F0, roll);
  const fingerTap = (t > s(9) && t < e.S1) ? Math.sin(t * 4.2) * 0.06 : 0;
  void pp;
  const Rs = (dz) => CAV.z + dz;
  setWoman({ hips, chest, head, F: F0, U, bodyF: v3(-1, 0.05, 0), hands: [v3(3.1, 0.14 + fingerTap, Rs(-1.95)), v3(3.0, 0.14, Rs(1.95))], feet: [v3(4.15, 0.08, Rs(-0.85)), v3(4.15, 0.08, Rs(0.85))],
    elbow: [v3(0.3, 1, -0.9), v3(0.3, 1, 0.9)], knee: [v3(1, -0.02, -0.08), v3(1, -0.02, 0.08)], toe: v3(-1, 0, 0), floor: 0.05, part: t < e.S1 ? 0.05 + 0.1 * lift : lerp(0.15, 1, K), mouth: t < e.S1 ? 0 : 0.7 * K + 0.05 * Math.sin(t * 7), t, curl: 0.7,
    blow: K > 0 && K < 1 ? v3(1.1 * (1 - K), 0, 0) : null });
}
// standing: hips at (x, z), facing -z; knees bent backward; used at the stair foot and in the corridor
function poseWomanStand(t, x, z, o = {}) {
  const lift = o.lift ?? 0, H = o.hip ?? 5.6, tilt = o.tilt ?? 0.34, reach = o.reach ?? 0;
  const hips = v3(x, H, z), chest = v3(x, H + 2.4, z - 0.32), F0 = v3(0, lerp(-0.75, -0.05, lift), -1).normalize(), head = chest.clone().add(v3(0, lerp(1.18, 1.5, lift), lerp(-0.55, -0.34, lift)));
  const U0 = v3(0, 1, lerp(-0.75, -0.05, lift)).normalize(), U = U0.clone().applyAxisAngle(F0, tilt);
  const hands = [o.hr ?? lp3(v3(x + 2.0, H - 2.1, z - 0.45), v3(x + 1.2, H + 2.4, z - 5.3), reach), lp3(v3(x - 2.4, H - 1.9, z - 0.1), v3(x - 1.1, H + 2.0, z - 5.4), reach)];
  setWoman({ hips, chest, head, F: F0, U, bodyF: v3(0, 0, -1), hands, feet: [v3(x + 0.72, 0.08, z - 0.85), v3(x - 0.72, 0.08, z - 0.85)], elbow: [v3(0.7, 0.1, 1), v3(-0.7, 0.1, 1)], knee: [v3(0.05, -0.05, 1), v3(-0.05, -0.05, 1)], toe: v3(0, 0, -1), floor: 0.05, part: o.part ?? 0.6, mouth: o.mouth ?? 0, t, curl: 0.55 });
}
function poseWoman(t, n, set) {
  const e = EV; W.wo.visible = false; W.sat.visible = false; W.woP = null;
  if (n === 'panel' || n === 'crouch') return;
  if (set === 'hall' && t < e.up + 1) poseWomanSeat(t);
  else if (n === 'chase') {
    const i = e.fast.reduce((a, c, k) => (t >= c - 0.03 ? k : a), -1);
    if (i >= 0) { const qz = quinnPath(e.fast[i]).p.z, D = [34, 20, 9.5][i]; poseWomanStand(t, 0.4, qz + D, { lift: 0.8 + i * 0.1, tilt: [0.5, -0.55, 0.3][i], reach: i * 0.5, part: 0.86, mouth: i * 0.3, hip: 5.6 + i * 0.2 }); }
  } else if (t >= e.inHall && set === 'hall') {
    const Bx = 4.6, Bz = 12.6, lift = smooth(L(24).start + 0.6, L(24).start + 1.7, t) * 0.75;
    const hk = ratchet(smooth(L(25).start + 0.1, L(25).start + 1.8, t), 7), hr = lp3(v3(Bx + 1.7, 5.6, Bz - 1.0), v3(Bx + 1.4, 6.9, Bz - 6.0), hk), shakeB = (t > L(28).start ? 1 : 0) * Math.sin(t * 14) * 0.012;
    poseWomanStand(t, Bx, Bz, { lift, tilt: 0.3, part: 0.82, hr });
    W.woP.curl = 1.6; W.woP.elbow[0] = v3(0.6, 0.75, 0.3); W.woP.camera = v3(0, 5, 0); W.wo.set(W.woP);
    W.sat.visible = true; W.sat.position.copy(W.wo.grip[0]).add(v3(0, -0.02, 0)); W.sat.rotation.set(0.04 * Math.sin(t * 1.4) + shakeB * 3, Math.PI - 0.25, shakeB * 2); W.satP.copy(W.sat.position);
    const inside = t > L(28).start ? smooth(L(28).start, L(29).start + 1.5, t) : 0; W.sat.flap.rotation.x = -inside * (0.08 + 0.05 * Math.sin(t * 6)); W.sat.scale.setScalar(1 + inside * 0.02 * Math.sin(t * 9));
  }
}
// ---- the thing on the ceiling ----
function crawlerPose(t, camHint) {
  const e = EV, cy = 12.45, T0 = L(31).start - 0.6, T1 = e.S2 - 0.3, u = clamp((t - T0) / (T1 - T0)), drift = Math.max(0, t - e.S2) * 0.3, zb = lerp(17, 7.6, 1 - (1 - u) ** 1.8) - drift;
  const stepF = (phase, off) => { const S = 4.6, q = -zb / S + phase, n = Math.floor(q), f = q - n, sw = smooth(0.65, 1, f); return { z: -(n + sw) * S + off, lift: Math.sin(sw * Math.PI) * 0.8 }; };
  const K = t < e.S2 - 0.03 ? 0 : easeOut(clamp((t - e.S2 + 0.03) / 0.14));
  const x0 = 0.4 + 0.2 * Math.sin(zb * 0.5), hips = v3(x0, 10.5 - K * 0.1, zb), chest = v3(x0, 10.3 - K * 0.15, zb - 3.4);
  const hS = stepF(0, -5.2), hL = stepF(0.5, -5.2), fS = stepF(0.25, 2.8), fL = stepF(0.75, 2.8);
  const hands = [v3(x0 + 5.2, 11.6 - hS.lift, hS.z), v3(x0 - 5.2, 11.6 - hL.lift, hL.z)], feet = [v3(x0 + 4.6, cy - fS.lift, fS.z), v3(x0 - 4.6, cy - fL.lift, fL.z)];
  const head0 = chest.clone().add(v3(0, -0.05, -1.7)), CH = v3(0.3, 8.8, 2.8 - drift * 0.6), head = head0.clone().lerp(CH, K);
  // the head snaps round to look back and down at her, upside down, then ticks upright on the last line
  const Fdir = v3(0.05, -0.62, 0.78).normalize(), rollT = t < e.roll ? Math.PI : lerp(Math.PI, 0.22, ratchet(smooth(e.roll, e.roll + 0.95, t), 4));
  const F = v3(0, -0.02, -1).lerp(Fdir, K).normalize(), upRef = v3(0, 1, 0).addScaledVector(F, -F.y).normalize(), U = K > 0 ? upRef.clone().applyAxisAngle(F, rollT) : v3(0, -1, 0).addScaledVector(F, F.y).normalize();
  W.ch.copy(head);
  return { hips, chest, head, F, U, bodyF: v3(0, 1, 0), hands, feet, elbow: [v3(0.7, -0.7, 0), v3(-0.7, -0.7, 0)], knee: [v3(0.7, -0.7, 0), v3(-0.7, -0.7, 0)], toe: v3(0, 0, -1), t, floor: -99, curl: 1.4, camera: camHint };
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 }), X = (x, y, z) => EX.clone().add(v3(x, y, z)), { z0, rise, run } = STAIR;
  const stepY = (i) => (i - 0.5) * rise, stepZ = (i) => z0 + (i - 1) * run;
  add('ext', 0, (u) => ({ pos: lp3(X(-3, 4.8, -74), X(-2.4, 5.4, -66), u), look: X(0, 14.5, 0), fov: 58 }));
  add('corr', 1.9, (u) => ({ pos: lp3(v3(0.4, 5.4, -46), v3(0.3, 5.3, -18), u), look: v3(2.8, 4.4, 30), fov: 54 }));
  add('stairs', s(1) - 0.1, (u) => ({ pos: lp3(v3(4.6, 4.3, 4.4), v3(4.7, 4.5, 7.2), easeInOut(u)), look: v3(4.8, 3.2, 30), fov: 58 }));
  add('treads', s(2) - 0.1, (u) => ({ pos: lp3(v3(7.4, 2.2, 13.2), v3(7.0, 7.6, 23.5), easeInOut(u)), look: lp3(v3(3.6, 2.4, 22), v3(3.8, 11.0, 34), easeInOut(u)), fov: 54 }));
  const cnt = (i) => (u) => ({ pos: lp3(v3(3.3, stepY(i) + 2.5, stepZ(i) - 3.6), v3(3.4, stepY(i) + 2.4, stepZ(i) - 3.3), u), look: v3(4.7, stepY(i) - 1.1, stepZ(i) - 0.9), fov: 46 });
  add('count1', s(3) - 0.22, cnt(1)); add('count2', s(4) - 0.22, cnt(2)); add('count3', s(5) - 0.22, cnt(3));
  add('enter', s(6) - 0.2, (u, t) => ({ pos: W.qp.clone().add(v3(1.9, 5.3, 9.6)), look: W.qp.clone().add(v3(-0.1, 3.8, 0)), fov: 60 }));
  add('flyer', s(6) + 1.42, (u) => ({ pos: W.flyerP.clone().addScaledVector(W.flyerN, 3.1).add(v3(0, 0.06, 0)), look: W.flyerP.clone().add(v3(0, lerp(0.3, -0.72, easeInOut(smooth(0.1, 0.85, u))), 0)), fov: 46 }));
  add('listen', s(7) - 0.05, (u) => ({ pos: W.qh.clone().add(v3(1.9, 0.3, 6.2 - 0.5 * u)), look: W.qh.clone().add(v3(0.1, -1.3, 0)), fov: 44 }));
  add('panel', s(7) + 1.15, (u) => ({ pos: lp3(v3(-9.4, 5.4, 25.6), v3(-8.2, 5.2, 26.8), easeInOut(u)), look: v3(0.5, 3.8, 33.2), fov: 56 }));
  add('crouch', s(8) - 0.1, (u) => ({ pos: lp3(v3(1.5, 3.6, 28.9), v3(1.3, 3.4, 29.5), u), look: v3(-2.8, lerp(4.0, 1.9, smooth(0.05, 0.55, u)), 33), fov: 56 }));
  add('dark', s(9) - 0.12, (u) => ({ pos: lp3(v3(-2.2, 5.0, 34.4), v3(-1.3, 4.9, 34.0), easeInOut(u)), look: v3(5.0, 3.5, 32.4), fov: 62 }));
  add('hair', s(10) - 0.1, (u) => ({ pos: lp3(v3(-2.2, 6.0, 33.2), v3(-1.2, 5.9, 32.9), easeInOut(u)), look: W.wh.clone().add(v3(0, -1.4, 0)), fov: 50 }));
  add('knees', s(11) - 0.08, (u) => ({ pos: lp3(v3(6.5, 1.6, 22.8), v3(6.3, 1.6, 23.6), u), look: v3(5.0, 2.9, 32.5), fov: 48 }));
  add('son', s(12) - 0.1, (u) => ({ pos: lp3(v3(-1.4, 1.5, 29.4), v3(-0.9, 1.7, 29.9), easeInOut(u)), look: v3(4.4, 4.7, 32.4), fov: 60 }));
  add('shake', s(13) - 0.1, (u) => ({ pos: W.qh.clone().add(v3(2.5, 0.5, -4.1)), look: W.qh.clone().add(v3(0, -1.0, 0)), fov: 44 }));
  add('lift', s(14) - 0.1, (u) => ({ pos: lp3(v3(-2.2, 6.0, 33.0), v3(-0.6, 5.9, 32.7), easeInOut(u)), look: W.wh.clone().add(v3(0, -1.0, 0)), fov: 46 }));
  add('scare1', e.S1, (u, t) => { const k = easeOut(clamp((t - e.S1) / 0.11)); return { pos: lp3(v3(-3.4, 5.0, 32.9), v3(-3.9, 5.0, 32.6), k), look: W.wh.clone().add(v3(0, -0.9, 0)), fov: lerp(54, 42, k) }; });
  add('holes', s(16) - 0.1, (u) => ({ pos: lp3(v3(-3.1, 5.0, 32.6), v3(-2.7, 5.0, 32.3), easeInOut(u)), look: W.wh.clone().add(v3(0, -0.75, 0)), fov: lerp(42, 37, u) }));
  add('scream', s(17) - 0.08, (u) => ({ pos: v3(1.5, 4.6, 34.9), look: W.qh.clone().add(v3(0, -1.2, 0)), fov: 48 }));
  add('chase', s(18) - 0.1, (u) => ({ pos: W.qp.clone().add(v3(1.6, 5.0, -11.5)), look: W.qp.clone().add(v3(-0.2, 4.4, 6)), fov: 58 }));
  add('exit', s(22) - 0.18, (u) => ({ pos: lp3(v3(6.0, 5.2, -61.6), v3(5.8, 5.2, -62.2), u), look: v3(-0.4, 4.6, -70.6), fov: 56 }));
  add('same', s(23) - 0.08, (u) => ({ pos: lp3(v3(1.5, 5.8, -62.8), v3(0.9, 5.6, -64.8), easeInOut(u)), look: v3(-2.8, 5.0, -92), fov: 56 }));
  add('qsame', s(23) + 1.95, (u) => ({ pos: QE.clone().add(v3(1.6, 5.2, 8.2 - u * 0.5)), look: QE.clone().add(v3(0, 3.6, 0)), fov: 46 }));
  add('bottom', s(24) - 0.08, (u) => ({ pos: lp3(v3(-2.7, 5.6, 1.2), v3(-2.4, 5.5, 2.2), easeInOut(u)), look: v3(4.4, 6.0, 12.4), fov: 56 }));
  add('arm', s(25) - 0.1, (u) => ({ pos: lp3(v3(7.6, 5.6, 2.2), v3(7.6, 2.9, 0.9), easeInOut(u)), look: lp3(v3(5.0, 8.3, 12.2), W.satP.clone().add(v3(0, -0.6, 0)), easeInOut(u)), fov: 52 }));
  add('recog', s(26) - 0.1, (u) => ({ pos: W.qh.clone().add(v3(1.5, 0.2, 6.2 - u * 0.5)), look: W.qh.clone().add(v3(0, -1.2, 0)), fov: 42 }));
  add('tag', s(27) - 0.1, (u) => ({ pos: W.satP.clone().add(v3(-0.32, -1.25, -5.1 + u * 0.3)), look: W.satP.clone().add(v3(-0.32, -1.35, -0.8)), fov: 34 }));
  add('small', s(28) - 0.1, (u) => ({ pos: lp3(W.satP.clone().add(v3(0.1, -1.4, -5.6)), W.satP.clone().add(v3(0.1, -1.4, -4.7)), easeInOut(u)), look: W.satP.clone().add(v3(0, -1.5, -0.5)), fov: 46 }));
  add('dont', s(29) - 0.08, (u) => ({ pos: lp3(W.satP.clone().add(v3(-0.3, -1.1, -4.9)), W.satP.clone().add(v3(-0.3, -1.1, -4.1)), easeInOut(u)), look: W.satP.clone().add(v3(-0.1, -1.5, -0.5)), fov: 42 }));
  add('froze', s(30) - 0.1, (u) => ({ pos: W.qh.clone().add(v3(0.8, 0.2, 6.0 - 1.1 * u)), look: W.qh.clone().add(v3(0, -1.1, 0)), fov: 40 }));
  add('crawl', s(31) - 0.1, (u) => ({ pos: lp3(v3(1.5, 3.3, 13.2), v3(1.4, 3.1, 12.6), u), look: v3(0.1, 8.0, 3.0), fov: 66 }));
  add('whip', e.S2, (u, t) => { const k = easeOut(clamp((t - e.S2) / 0.17)), c0 = v3(1.4, 3.1, 12.6), c1 = v3(0.55, 5.5, 7.2); return { pos: lp3(c0, c1, k), look: lp3(v3(0.1, 8.0, 3.0), W.ch.clone().add(v3(0, -0.7, 0)), k), fov: lerp(66, 52, k) }; });
  add('final', L(32).end + 0.02, (u) => ({ pos: lp3(v3(-2.5, 8.0, 10.6), v3(-2.3, 8.0, 10.0), u), look: v3(0, 5.6, 2.9), fov: 74 }));
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } });
  Sx[Sx.length - 1].t1 = () => ctx.dur + 1;
  return Sx;
}
const SETS = { ext: 'ext', corr: 'corr', chase: 'corr', exit: 'corr', same: 'same' };
for (const n of ['stairs', 'treads', 'count1', 'count2', 'count3', 'enter', 'flyer', 'listen', 'panel', 'crouch', 'dark', 'hair', 'knees', 'son', 'shake', 'lift', 'scare1', 'holes', 'scream', 'qsame', 'bottom', 'arm', 'recog', 'tag', 'small', 'dont', 'froze', 'crawl', 'whip', 'final']) SETS[n] = 'hall';
const PAL = { ext: OUT, corr: CORR, hall: HALL, same: HALL };

// ---- a frame ----
function renderAt(t) {
  if (!W.ready) { renderFlyers(); W.ready = true; }
  const sh0 = shotAt(W.shots, t), n = sh0.name, set = SETS[n], e = EV;
  applyEnv(ctx, PAL[set]);
  W.ext.visible = set === 'ext'; W.hall.visible = set === 'hall' || set === 'corr' || set === 'same'; W.corr.visible = set === 'corr' || set === 'same' || (set === 'hall'); W.hall2.visible = set === 'same'; W.pho.visible = false;
  W.q.neck.visible = n !== 'flyer'; W.q.root.visible = false; W.bro.root.visible = false; W.bf.root.visible = false; W.kids.forEach((c) => { c.root.visible = false; });
  // counts: the tread dips, dust falls, a pale handprint on the third riser
  W.dusts.forEach((d, i) => { const a = t - e.count[i], ok = a > 0 && a < 1.9; W.hall.treads[i].position.y = (i + 1) * STAIR.rise + 0.02 - (ok ? 0.1 * Math.exp(-a * 7) * Math.sin(Math.min(a * 22, Math.PI)) : 0); d.set(ok ? a : 0); });
  W.print.material.opacity = 0.62 * smooth(e.count[2], e.count[2] + 0.5, t) * (t < 12 ? 1 : 0);
  // the doors
  W.hall.barrier.forEach((b) => { b.visible = !/^count/.test(n); });
  W.corr.door.set(1.5 * easeInOut(smooth(e.open, e.open + 0.6, t)));
  W.tubesOff = set !== 'corr' && set !== 'same';
  W.corr.tubes.forEach(({ f, z }) => f.level(set === 'corr' || set === 'same' ? tubeK(t, z) : 0.6));
  // the dropped flashlight stays lit by the opening once she runs
  W.fl2.visible = set === 'hall' && t >= e.scream + 0.25; if (W.fl2.visible) { W.fl2.position.set(-2.3, 0.3, 33.2); W.fl2.rotation.set(0, Math.PI / 2 - 0.12, 0); }
  const needQ = !['ext', 'corr', 'stairs', 'treads', 'count1', 'count2', 'count3'].includes(n) && !(t >= e.door + 0.05 && n === 'same' && false);
  if (needQ) { poseQuinn(t, n); W.q.root.updateMatrixWorld(true); W.qh.copy(W.q.neck.getWorldPosition(v3())).add(v3(0, 0.75, 0)); }
  poseWoman(t, n, set);
  const flOn = W.fl.visible; if (['dark', 'hair', 'son', 'lift', 'scare1', 'holes'].includes(n) && !location.search.includes('dbgcam')) { W.q.root.visible = false; W.fl.visible = false; }
  if (n === 'crawl' || n === 'whip' || n === 'final') { W.cr.visible = true; W.crP = crawlerPose(t, null); W.bf.neck.visible = true; const smile = t >= e.S2; W.bf.setFace(smile ? 'happy' : 'neutral', { blink: false }); W.seam.visible = true; } else { W.cr.visible = false; W.bf.neck.visible = false; }
  const focus = n === 'chase' || n === 'exit' || n === 'same' ? W.qp.clone() : ['stairs', 'treads', 'count1', 'count2', 'count3', 'bottom', 'arm', 'tag', 'small', 'dont', 'crawl', 'whip', 'final', 'qsame', 'recog', 'froze'].includes(n) ? v3(2.4, 0, 8) : n === 'corr' ? v3(0, 0, -30) : v3(1, 0, 32);
  const lset = n === 'chase' && t < e.hallEnd ? 'hall' : set;
  lightSet(lset === 'corr' ? 'corr' : set === 'same' ? 'same' : set === 'ext' ? 'ext' : 'hall', t, focus);
  if (set === 'hall' && flOn) { const tg = (t >= e.at && t < e.up) ? v3(5.4, 3.8, 32.5) : W.qp.clone().add(v3(1.2, 1.8, 11)); W.flash.position.copy(W.hand).add(tg.clone().sub(W.hand).normalize().multiplyScalar(0.9)); W.flash.target.position.copy(tg); W.flash.color.set('#ffeccc'); W.flash.intensity = 36 * (t > e.S1 ? 0.45 : 1); W.flash.angle = 0.34; W.flash.penumbra = 0.7; W.flash.distance = 44; }
  else if (set === 'hall' && W.fl2.visible) { W.flash.position.set(-1.3, 0.4, 33.1); W.flash.target.position.set(6, 3, 32.3); W.flash.color.set('#ffeccc'); W.flash.intensity = 24; W.flash.angle = 0.42; W.flash.penumbra = 0.8; W.flash.distance = 30; }
  // face light in the close-ups
  if (['listen', 'shake', 'recog', 'froze', 'scream', 'qsame'].includes(n)) setL(5, W.qh.clone().add(v3(0.7, 0.3, n === 'shake' ? 0.5 : 2.2)), '#9fb0d2', 7.5, 9);
  if (n === 'final' || n === 'crawl' || n === 'whip') { setL(5, v3(0.3, 7.5, 7.5), '#9fb0d2', 26, 16); setL(6, v3(-1.2, 4.5, 6.2), '#b6c4dc', 10, 11); }
  if (n === 'crouch') setL(5, v3(-0.8, 4.6, 30.5), '#a8b6d4', 13, 11); if (n === 'panel') setL(5, v3(-5, 5.2, 37), '#a8b6d4', 16, 13);
  if (n === 'treads') setL(6, v3(4.7, 9.5, 24), '#ffc78a', 34, 24);
  if (n === 'knees') setL(6, v3(3.0, 4.2, 28.6), '#b4c0dc', 16, 12);
  if (['bottom', 'arm', 'tag', 'small', 'dont'].includes(n)) setL(6, W.satP.clone().add(v3(0.3, 1.4, -3.6)), '#c9d4ea', 8, 9);
  W.air.update(t); W.air.list.dust.position.set(0, 0, set === 'corr' ? W.qp.z : 24);
  ctx.scene.updateMatrixWorld(true);
  const sh = shotAt(W.shots, t);
  const dc = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgcam');
  const dq = dc ? dc.split(',').map(Number) : null, shx = dq ? { ...sh, pos: v3(dq[0], dq[1], dq[2]), look: v3(dq[3], dq[4], dq[5]), fov: dq[6] || 40 } : sh;
  if (W.woP) { W.woP.camera = shx.pos; W.wo.set(W.woP); }
  if (W.cr.visible) { W.crP.camera = shx.pos; W.cr.set(W.crP); }
  ctx.scene.updateMatrixWorld(true);
  const jolt = n === 'scare1' ? Math.max(0, 1 - (t - e.S1) / 0.3) : n === 'whip' ? Math.max(0, 1 - (t - e.S2) / 0.32) : 0;
  const stiller = ['ext', 'corr', 'stairs', 'treads', 'count1', 'count2', 'count3'].includes(n);
  const blink = n === 'chase' && dipAt(t, e.fast, 0.09) === 0 ? 0.62 : 0;
  frame(ctx, t, shx, { steady: stiller || !!dq, shake: dq ? 0 : jolt * 1.5, shadowSpan: 60, shadows: set === 'ext', black: blink });
  return n;
}

export async function setup() {
  ctx = await initStage('ep37', { look: 'pro', avatars: ['farm_ep33_quinn', 'farm_ep37_brother', ...KIDS.map((k) => k[0])] }); L = ctx.L; EV = events();
  const FX = ['neutral', 'surprised', 'shocked', 'scared', 'terrified', 'nervous', 'happy'];
  await loadAlti(FX);
  await loadAnimSet('contest_set');
  const { scene, camera } = ctx; camera.far = 3000; camera.near = 0.1; camera.updateProjectionMatrix();
  rig(); W.hall = stairHall(); W.hall.door.name = 'hallDoor'; scene.add(W.hall); W.corr = schoolCorridor(); scene.add(W.corr);
  W.hall2 = W.hall.clone(true); const dd = W.hall2.getObjectByName('hallDoor'); if (dd) dd.visible = false; W.hall2.rotation.y = Math.PI; W.hall2.position.set(0, 0, -72); W.hall2.visible = false; scene.add(W.hall2);
  exterior(); studio(); people(); boardOfFlyers();
  W.dusts = [1, 2, 3].map((i) => { const d = dustFall(scene, 130, { seed: i + 3, w: 9 }); d.position.set(4.7, i * STAIR.rise - 0.1, STAIR.z0 + (i - 1) * STAIR.run + 0.15); return d; });
  W.print = handPrint(); W.print.position.set(5.9, 2.65, STAIR.z0 + 2 * STAIR.run - 0.12); W.print.rotation.y = Math.PI; W.print.rotation.z = 0.2; scene.add(W.print);
  const list = { dust: dust(scene, { size: 44, height: 12, centre: v3(0, 6, 0), count: 420, color: '#d9d4c4', amount: 0.16, pointSize: 0.32 }) };
  W.air = atmos(...Object.values(list)); W.air.list = list;
  W.shots = shots();
  void altiCanvas; void ofuda;
  window.__ep37 = { W, THREE, ctx };
  return expose(ctx, renderAt, EV.S2 + 2.6, EV);
}
