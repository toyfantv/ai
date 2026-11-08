// Episode 39: The Tunnel That Learned Our Voices (Psychological Horror 5/5). Daniel goes into the tunnel his sister vanished in, three days ago; the search team found only her flashlight,
// still on. He crawls until he can barely move, follows her voice, and his flashlight finds her face, smiling, its mouth moving the wrong way (scare 1). The thing lunges (scare 2, an impact
// sequence), he kicks it away (the second one) and crawls for daylight with dozens of voices behind him. A rescue worker pulls him out. The radio crackles: "Daniel, I'm still inside." The worker smiles and answers in Daniel's voice.
// The world: the tunnel from the origin along -z (engine/tunnel.js: its walls are one-sided, so cameras outside them shoot through for the wide shots), the hillside and camp at z > 0.
// Limbs: the avatars have real knees and elbows here (jointify() cuts each limb's lower meshes onto a second pivot); the crawl is hand-keyed by two-bone IK from a gait phase, so hands and knees stay planted.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, noise1, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt, mouthSheet, altiCanvas } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, NIGHT } from '../engine/stage.js';
import { paint } from '../engine/kit.js';
import { dust, atmos } from '../engine/atmos.js';
import { aimArm as aimArm0 } from '../engine/anims.js';
const aimArm = (c, side, p, k = 1) => { c.root.updateMatrixWorld(true); aimArm0(c, side, p, k); };
import { puppet, flashlightProp } from '../engine/folklore.js';
import { bloodFX } from '../engine/tactical.js';
import { installActionFX } from '../engine/actionfx.js';
import { canvasTex } from '../engine/props.js';
import { treeShape, treeSet } from '../engine/forest.js';
import { tent, supplyCrate } from '../engine/camp.js';
import { voiceTunnel, drips, hillside, floodTripod, cautionTape, tapePost, rescueRadio, rescueTruck, campTable, wallFaces } from '../engine/tunnel.js';

let ctx, L, T = {};
const W = { dp: v3(), dh: v3(0, 3, 0), hand: v3(), ch: v3(), wh: v3(0, 4, 8), mh: v3(), rd: v3(0, 3, 9) };
const SOPHIE = 'farm_ep39_sophie_b', WORKER = 'farm_ep39_worker_c', CREW = ['farm_ep39_rescue_a', 'farm_ep39_worker_b', 'farm_ep39_rescue_c'], FINDER = 'farm_ep39_rescue_d';
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const fr = (x) => x - Math.floor(x);

// ---- palettes: an overcast afternoon, the tunnel (dark, but the rock always reads), three days ago (drained) ----
const OUT = { ...NIGHT, ...P({ top: '#7f99b4', horizon: '#c6d0d2', haze: '#c2ccce', sunColor: '#fff0dc', hemiSky: '#c9d6e2', hemiGround: '#5f6650' }), sunI: 1.5, sunDir: v3(-0.5, 0.75, 0.55), sunDisc: 0, stars: 0, moon: 0, hemiI: 1.25, amb: 0.2, envI: 0.75, exposure: 1.02, bloom: 0.02, fogNear: 110, fogFar: 520, saturation: 1.04, contrast: 1.08, bounce: 0.18, win: 0, lamp: 0 };
const DARK = { ...OUT, ...P({ top: '#05070a', horizon: '#07090c', haze: '#06080b', hemiSky: '#6f8296', hemiGround: '#3a3a36' }), sunI: 0, hemiI: 0.92, amb: 0.2, envI: 0.26, exposure: 1.3, bloom: 0.02, fogNear: 16, fogFar: 66, saturation: 1.02, contrast: 1.08, bounce: 0.1 };
const PAST = { ...DARK, saturation: 0.42, exposure: 1.34, contrast: 1.0 };
const LIP = { ...OUT, fogNear: 200, fogFar: 900 };

function events() {
  const s = (i) => L(i).start, e = (i) => L(i).end;
  T = { S1: e(13) + 0.1, back: s(17) - 0.12, S2: e(17) + 0.16, lc: s(18) + 0.5, kc: s(19) + 0.48, end: ctx.dur };
  T.flipOut = T.kc + 0.75; T.pullC = s(22) + 0.35; T.sitAt = s(23) - 0.12; T.smile = s(29) + 0.15;
  return T;
}

// ---- real knees and elbows on the captured avatars ----
function jointify(c) {
  const J = {}; c.knee = []; c.elbow = [];
  const cut = (grp, frac) => {
    const ms = grp.children.filter((m) => m.isMesh); ms.forEach((m) => m.geometry.computeBoundingBox());
    const tall = new THREE.Box3(); ms.forEach((m) => tall.union(m.geometry.boundingBox));
    const y0 = tall.max.y, y1 = tall.min.y, py = lerp(y0, y1, frac), pz = (tall.min.z + tall.max.z) / 2, px = (tall.min.x + tall.max.x) / 2;
    const up = ms.filter((m) => { const b = m.geometry.boundingBox; return (b.min.y + b.max.y) / 2 > py; }), lo = ms.filter((m) => !up.includes(m));
    let pv = py; if (up.length && lo.length) { const a = Math.min(...up.map((m) => m.geometry.boundingBox.min.y)), b = Math.max(...lo.map((m) => m.geometry.boundingBox.max.y)); pv = (a + b) / 2; }
    const j = new THREE.Group(); j.position.set(px, pv, pz); grp.add(j); lo.forEach((m) => { grp.remove(m); j.add(m); m.position.set(-px, -pv, -pz); });
    return { j, a: -pv, b: pv - y1, foot: lo };
  };
  c.legs.forEach((l, i) => { const r = cut(l, 0.48); c.knee[i] = r.j; J.thigh = r.a; J.shin = r.b; });
  c.arms.forEach((a, i) => { const r = cut(a, 0.46); c.elbow[i] = r.j; J.ua = r.a; J.fa = r.b * 0.94; });
  c.J = J; c.root.rotation.order = 'YXZ';
}
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); }
function place(c, p, yaw, slope = 0) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.set(slope, yaw, 0); c.root.scale.setScalar(1); }
function limb2(S, G, l1, l2) { const dz = G.z - S.z, dy = G.y - S.y, D = clamp(Math.hypot(dz, dy), Math.abs(l1 - l2) + 0.03, l1 + l2 - 0.02), base = Math.atan2(dz, -dy), inner = Math.acos(clamp((l1 * l1 + D * D - l2 * l2) / (2 * l1 * D), -1, 1)), outer = Math.acos(clamp((l1 * l1 + l2 * l2 - D * D) / (2 * l1 * l2), -1, 1)); return { base, inner, bend: Math.PI - outer }; }
const gait = (x, duty, r) => { const f = fr(x); if (f < duty) return { o: r / 2 - r * (f / duty), l: 0 }; const u = (f - duty) / (1 - duty); return { o: -r / 2 + r * u, l: Math.sin(u * Math.PI) }; };
function setArm(c, i, TH, S, G, o = {}) { const { ua, fa } = c.J, k = limb2(S, G, ua, fa); c.arms[i].rotation.x = -(TH + k.base - k.inner * (o.flip ?? 1)); c.elbow[i].rotation.x = -k.bend * (o.flip ?? 1); }
function setLegKF(c, i, TH, H, G) { const { thigh, shin } = c.J, k = limb2(H, G, thigh, shin), up = k.base + k.inner; c.legs[i].rotation.x = -(TH + up); c.knee[i].rotation.x = k.bend; }
// hands and knees
function crawlKnees(c, ph, o = {}) {
  const J = c.J, TH = o.th ?? 1.36, hipH = J.thigh * 0.92 + 0.15, shY = c.arms[0].position.y; c.hips.position.y = hipH; c.hips.rotation.x = TH;
  const S = { y: hipH + shY * Math.cos(TH), z: shY * Math.sin(TH) }, r = o.reach ?? 1.0;
  for (const i of [0, 1]) {
    const a = gait(ph + (i ? 0.5 : 0), 0.62, r); setArm(c, i, TH, S, { y: 0.14 + a.l * 0.35, z: S.z + 0.15 + a.o });
    const b = gait(ph + (i ? 0 : 0.5), 0.62, r), kz = b.o - 0.05, ky = 0.14 + b.l * 0.25, psi = Math.atan2(kz, hipH - ky); c.legs[i].rotation.x = -(TH + psi); c.knee[i].rotation.x = psi + Math.PI / 2 - 0.08;
  }
  c.neck.rotation.x = -(TH * 0.8) + (o.look ?? 0); c.neck.rotation.y = o.turn ?? 0; c.torso.rotation.y = Math.sin(ph * 6.283) * 0.06;
}
// flat on the belly, reaching and pulling; the right arm can stay out in front with the flashlight
function crawlBelly(c, ph, o = {}) {
  const J = c.J, TH = o.th ?? 1.5, hipH = 0.92, shY = c.arms[0].position.y, L2 = J.ua + J.fa; c.hips.position.y = hipH; c.hips.rotation.x = TH;
  const S = { y: hipH + shY * Math.cos(TH) + 0.08, z: shY * Math.sin(TH) };
  for (const i of [0, 1]) {
    const a = gait(ph + (i ? 0.5 : 0), 0.66, 0.75); let G = { y: 0.34 + a.l * 0.3, z: S.z + L2 * 0.8 + a.o * 0.55 };
    if (i === 0 && o.lightArm) G = { y: S.y + 0.1 + (o.armUp ?? 0), z: S.z + L2 * 0.95 };
    setArm(c, i, TH, S, G); c.arms[i].rotation.z = (i ? 1 : -1) * 0.1;
    const b = gait(ph + (i ? 0 : 0.5), 0.66, 1); c.legs[i].rotation.x = -TH + 0.06 * b.o; c.legs[i].rotation.z = (i ? 1 : -1) * (0.13 + 0.09 * b.l); c.knee[i].rotation.x = 0.18 + 0.34 * b.l;
  }
  c.neck.rotation.x = -(TH * 0.76) + (o.look ?? 0); c.neck.rotation.y = o.turn ?? 0; c.torso.rotation.z = Math.sin(ph * 6.283) * 0.05; c.hips.position.x = Math.sin(ph * 6.283) * 0.06;
}
// reclined on the hands, feet toward the threat; k kicks both legs out (0..1)
function crab(c, ph, k = 0, o = {}) {
  const J = c.J, TH = o.th ?? -1.12, hipH = 0.86, shY = c.arms[0].position.y, H = { y: hipH, z: 0 }; c.hips.position.y = hipH; c.hips.rotation.x = TH;
  const S = { y: hipH + shY * Math.cos(TH), z: shY * Math.sin(TH) };
  for (const i of [0, 1]) {
    const a = gait(ph + (i ? 0.5 : 0), 0.6, 0.7), b = gait(ph + (i ? 0 : 0.5), 0.6, 0.7); setArm(c, i, TH, S, { y: 0.14 + a.l * 0.2, z: S.z - 0.5 + a.o * 0.6 }, { flip: -1 });
    const f0 = { y: 0.42 + b.l * 0.3, z: 2.0 + b.o * 0.6 }, f1 = { y: (o.fy ?? 1.45) + (i ? 0.22 : 0), z: (J.thigh + J.shin) * 0.97 }; setLegKF(c, i, TH, H, { y: lerp(f0.y, f1.y, k), z: lerp(f0.z, f1.z, k) });
  }
  c.neck.rotation.x = -TH * 0.62 + (o.look ?? 0); c.neck.rotation.y = o.turn ?? 0;
}
// sitting where the worker put him, knees up
function sitUp(c, o = {}) {
  const J = c.J, TH = o.th ?? -0.12, hipH = 0.84, shY = c.arms[0].position.y, H = { y: hipH, z: 0 }; c.hips.position.y = hipH; c.hips.rotation.x = TH;
  const S = { y: hipH + shY * Math.cos(TH), z: shY * Math.sin(TH) };
  for (const i of [0, 1]) setLegKF(c, i, TH, H, { y: 0.34, z: 2.5 + (i ? 0.2 : -0.1) });
  setArm(c, 1, TH, S, { y: 0.2, z: S.z - 1.15 }, { flip: -1 }); c.arms[1].rotation.z = 0.22;
  setArm(c, 0, TH, S, { y: S.y + (o.hy ?? -0.25), z: S.z + 1.5 });
}
// one knee down, facing his patient
function kneel(c, o = {}) {
  const J = c.J, TH = o.th ?? 0.1, hipH = J.thigh + 0.2 + (J.shin ? 0.02 : 0), H = { y: hipH, z: 0 }; c.hips.position.y = hipH; c.hips.rotation.x = TH;
  c.legs[0].rotation.x = -TH; c.knee[0].rotation.x = Math.PI / 2 - 0.02; setLegKF(c, 1, TH, H, { y: 0.3, z: 2.05 }); c.legs[1].rotation.z = 0.07;
}
const handOf = (c, i) => { c.root.updateMatrixWorld(true); return c.elbow[i].localToWorld(v3(0, -c.J.fa * 0.98, 0)); };
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.noBlink ? false : blinkAt(t, ph) && !['shocked', 'terrified'].includes(name), viseme: o.viseme, gaze: o.gaze, noMouth: o.noMouth }); }

// ---- people ----
function fitHead(c, y = -0.0) { c.faceY = y; }
function people() {
  const mk = (avatar, skin) => { const c = makeCharacter({ avatar, alti: true, skin, caustic: false }); ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); c.root.visible = false; jointify(c); return c; };
  W.d = mk('farm_daniel', '#f2c79a'); W.so = mk(SOPHIE, '#f2c8a2'); W.fs = mk(SOPHIE, '#d9c2ae'); W.wk = mk(WORKER, '#e0ac82'); W.crew = [mk(CREW[0], '#8d5a3c'), mk(CREW[1], '#f0c8a0'), mk(CREW[2], '#c98e62')];
  // hiking boots over the captured sneakers, on the feet's own pivots
  const boot = paint('#6a4a2c', { roughness: 0.72 }), sole = paint('#1e1b18', { roughness: 0.9 }), lace = paint('#d6c49a', { roughness: 0.8 });
  W.d.knee.forEach((k) => { const ms = k.children.filter((m) => m.isMesh), all = new THREE.Box3(); ms.forEach((m) => all.union(m.geometry.boundingBox)); const H = all.max.y - all.min.y, fh = H * 0.36, low = new THREE.Box3(); ms.forEach((m) => { const b = m.geometry.boundingBox; if ((b.min.y + b.max.y) / 2 < all.min.y + fh * 1.2) low.union(b); }); low.max.y = low.min.y + fh; const fb = low, C = fb.getCenter(new THREE.Vector3()), Z = fb.getSize(new THREE.Vector3()), o = ms[0].position, g = new THREE.Group(); g.position.copy(C).add(o);
    const add = (w, h, d, y, z, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.position.set(0, y, z); x.castShadow = true; g.add(x); }; add(Z.x * 1.2, Z.y * 1.5, Z.z * 1.2, Z.y * 0.2, 0, boot); add(Z.x * 1.2, Z.y * 0.22, Z.z * 1.16, -Z.y * 0.56, 0, sole); add(Z.x * 1.12, Z.y * 0.6, Z.z * 0.98, Z.y * 0.82, -Z.z * 0.04, boot); for (let i = 0; i < 4; i++) add(Z.x * 0.72, 0.035, 0.05, Z.y * (0.1 + i * 0.28), Z.z * 0.58 + (i > 1 ? -Z.z * 0.08 : 0), lace); k.add(g); });
  // the thing: long grey limbs in what is left of her raincoat, wearing her head
  const skin = '#b3aea4';
  W.cr = puppet({ skin, bodyMat: paint('#a48a2a', { roughness: 0.5 }), sleeveMat: paint('#8f7826', { roughness: 0.55 }), au: 2.7, al: 3.1, lu: 2.5, ll: 2.9, finger: 0.6, head: false, hair: false, robe: false, width: 0.62, thick: 0.52 }); ctx.scene.add(W.cr); W.cr.visible = false;
  W.fsH = W.fs.neck; const bx = new THREE.Box3(); W.fs.head.traverse((m) => { if (m.isMesh && !m.material.transparent) { m.geometry.computeBoundingBox(); bx.union(m.geometry.boundingBox); } });
  W.fsH.removeFromParent(); W.cr.mount.add(W.fsH); W.fsH.position.set(0, -(W.fs.head.position.y + bx.getCenter(new THREE.Vector3()).y) - 0.32, 0); W.fsH.rotation.set(0, 0, 0);
  W.fm = mouthSheet(W.fs); W.wm = mouthSheet(W.wk);
  // the mouths it collected, down the front of the coat
  W.cm = [0, 1, 2, 3].map((i) => { const canv = [altiCanvas('shocked'), altiCanvas('scared', { viseme: 'O' })].map((c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(0.42, 0.28); t.offset.set(0.29, 0.1 + 0.0 * i); return t; }), m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), new THREE.MeshStandardMaterial({ map: canv[0], transparent: true, alphaTest: 0.05, depthWrite: false, roughness: 0.5 })); m.userData.noAO = true; m.userData.t = canv; ctx.scene.add(m); return m; });
  // props
  W.fl = flashlightProp(); ctx.scene.add(W.fl); W.lost = flashlightProp(); ctx.scene.add(W.lost); W.rad = rescueRadio(); ctx.scene.add(W.rad); W.fl.visible = W.lost.visible = W.rad.visible = false;
  // the cut on his cheek after the claws
  const cutT = canvasTex(128, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = '#7a0a12'; x.lineWidth = 11; x.lineCap = 'round'; x.beginPath(); x.moveTo(28, 40); x.lineTo(98, 78); x.stroke(); x.strokeStyle = '#d41a22'; x.lineWidth = 5; x.beginPath(); x.moveTo(30, 42); x.lineTo(96, 77); x.stroke(); x.fillStyle = '#b5121c'; x.fillRect(58, 58, 7, 40); });
  const hb = new THREE.Box3(); W.d.headParts.forEach((m) => { m.geometry.computeBoundingBox(); hb.union(m.geometry.boundingBox); }); W.dHead = hb;
  W.cut = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshStandardMaterial({ map: cutT, transparent: true, alphaTest: 0.05, depthWrite: false, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 })); W.cut.position.set((hb.min.x + hb.max.x) / 2 + (hb.max.x - hb.min.x) * 0.27, (hb.min.y + hb.max.y) / 2 - (hb.max.y - hb.min.y) * 0.14, hb.max.z + 0.012); W.cut.renderOrder = 4; W.cut.userData.noAO = true; W.d.head.add(W.cut); W.cut.visible = false;
}

// ---- light rig ----
function rig() {
  W.pl = []; for (let i = 0; i < 7; i++) { const l = new THREE.PointLight('#ffffff', 0, 24, 1.7); ctx.scene.add(l); W.pl.push(l); }
  const s = new THREE.SpotLight('#fff0d4', 0, 70, 0.38, 0.72, 1.3); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0008; s.shadow.normalBias = 0.05; s.shadow.camera.near = 0.3; ctx.scene.add(s); ctx.scene.add(s.target); W.flash = s;
}
const setL = (i, p, col, I, dist) => { const l = W.pl[i]; l.position.copy(p); l.color.set(col); l.intensity = I; l.distance = dist; };

// ---- where Daniel is: each stretch is its own short crawl, joined by cuts ----
function danSeg(t) {
  const s = (i) => L(i).start, e = T;
  const S = [[s(5) - 0.1, s(5) + 0.95, 36, 38.6, 'knees'], [s(5) + 0.95, s(6) - 0.08, 41, 43.2, 'knees'], [s(6) - 0.08, s(7) - 0.12, 47, 47.9, 'knees'], [s(7) - 0.12, s(7) + 1.0, 52, 53.6, 'knees'], [s(7) + 1.0, s(10) - 0.05, 53.6, 53.6, 'knees'], [s(10) - 0.05, s(11) - 0.1, 53.6, 58, 'knees'],
    [s(11) - 0.1, s(12) - 0.1, 86, 89, 'belly'], [s(12) - 0.1, s(13) - 0.1, 103, 106.1, 'belly'], [s(13) - 0.1, e.back, 106.1, 106.1, 'belly'], [e.back, e.lc, 106.1, 102.6, 'crab'], [e.lc, e.flipOut, 102.6, 102.6, 'crab'], [e.flipOut, s(20) - 0.06, 94, 86, 'bellyOut'], [s(20) - 0.06, s(20) + 1.8, 72, 60, 'kneesOut'], [s(20) + 1.8, s(21) - 0.06, 44, 33, 'kneesOut'], [s(21) - 0.06, s(22) - 0.08, 15, 7, 'kneesOut']];
  for (const q of S) if (t >= q[0] && t < q[1]) { const u = (t - q[0]) / (q[1] - q[0]); return { s: lerp(q[2], q[3], u), m: q[4], moving: q[2] !== q[3], spd: Math.abs(q[3] - q[2]) / (q[1] - q[0]) }; }
  return null;
}
function poseDaniel(t, n) {
  const e = T, s = (i) => L(i).start, d = W.d, seg = danSeg(t); W.fl.visible = false; W.cut.visible = t > e.lc;
  const lightEnd = t < s(21) - 0.1;
  if (seg) {
    const { T: _ } = { T: 0 }; void _; const TT = W.T, out = seg.m.endsWith('Out'), m = seg.m.replace('Out', ''), base = out ? TT.yawIn(seg.s) + Math.PI : TT.yawIn(seg.s), sl = TT.slope(seg.s) * (out ? 1 : -1);
    const p = TT.pt(seg.s, 0, 0); place(d, p, base, sl);
    const stride = m === 'belly' ? 1.5 : 1.9, ph = seg.s / stride * (out ? 1 : -1) * -1;
    if (m === 'knees') crawlKnees(d, ph, { look: n === 'stop' ? -0.05 : 0, turn: 0 });
    if (m === 'belly') crawlBelly(d, ph, { lightArm: !out, armUp: t > s(13) ? 0.1 : 0, look: t > s(13) - 0.1 && !out ? -0.12 : 0 });
    if (m === 'crab') { const k1 = t < e.kc - 0.3 ? 0 : t < e.kc - 0.1 ? -0.0 : t < e.kc ? easeOut(smooth(e.kc - 0.1, e.kc, t)) : 1 - 0.3 * smooth(e.kc + 0.18, e.flipOut, t); crab(d, seg.s / 1.2, Math.max(0, k1), { th: t > e.lc - 0.2 && t < e.kc - 0.12 ? -1.28 : -1.12 }); if (t > e.kc - 0.32 && t < e.kc - 0.1) { /* the knees draw up, loading the kick */ const q = smooth(e.kc - 0.32, e.kc - 0.14, t); d.legs.forEach((l) => { l.rotation.x -= 0.5 * q; }); d.knee.forEach((k) => { k.rotation.x += 0.75 * q; }); } }
    d.root.updateMatrixWorld(true); W.dp.copy(d.hips.getWorldPosition(v3()));
    const faceN = t > e.S1 ? (t > e.flipOut ? 'terrified' : 'shocked') : t >= s(7) + 0.9 && t < s(9) ? 'scared' : t >= s(9) && t < s(10) ? 'surprised' : 'nervous';
    const vis = t >= s(10) && t < L(10).end ? visemeAt(L(10).text, s(10), L(10).end, t) : undefined;
    face(d, faceN, t, 0.3, { viseme: t > e.S2 && t < e.S2 + 0.7 ? 'A' : vis });
    if (lightEnd && !out && m !== 'crab') {
      const hp = handOf(d, 0), sw = n === 'sweep' ? Math.sin(smooth(s(13), T.S1 - 0.1, t) * Math.PI * 2.2) * 1.5 * (1 - smooth(T.S1 - 0.7, T.S1 - 0.08, t)) : 0, far = TT.pt(seg.s + 16, sw, m === 'belly' ? 1.5 : 2.2);
      W.fl.visible = true; W.fl.position.copy(hp); W.fl.lookAt(far); W.fl.translateZ(-0.24); W.hand.copy(hp); W.beam = far;
    } else W.beam = null;
    return true;
  }
  W.beam = null; return false;
}
function exterior(t, n) {
  const e = T, s = (i) => L(i).start, d = W.d, wk = W.wk;
  const DZ0 = 13, walkT0 = s(1) + 0.15, walkT1 = s(2) - 0.08, m = (ch, p, yaw) => place(ch, p, yaw);
  W.wk.root.visible = false; W.crew.forEach((c) => { c.root.visible = false; });
  // the team
  const A = W.crewA; const turned = smooth(s(28) - 0.3, s(28) + 0.9, t), goal = t >= s(26) ? 1 : 0;
  W.crew.forEach((c, i) => { m(c, t >= e.sitAt ? A[i].end : A[i].p, lerp(A[i].yaw, A[i].endYaw, t >= e.sitAt ? 1 : 0)); pose(c, 'idle', t + i * 0.4); if (t >= e.sitAt) { const look = turned * goal; c.neck.rotation.y = lerp(0, A[i].stare, look); } face(c, t >= e.smile ? 'happy' : 'neutral', t, 0.13 * i + 0.2, { noBlink: t >= s(28) }); });
  if (t < s(21) - 0.1) {
    // he listens at the mouth, then walks in past the worker
    if (t < walkT0) { m(d, v3(0.4, 0, DZ0), lerp(0.22, 0.1, t / walkT0)); pose(d, 'idle', t); d.arms[1].rotation.set(-0.78, 0, 0.42); d.elbow[1].rotation.x = -1.92; d.neck.rotation.y = -0.08; const hp = handOf(d, 1); W.rad.visible = true; W.rad.position.copy(hp).add(v3(0.1, 0.42, 0.16)); W.rad.rotation.set(0.06, 0.32, -0.12); face(d, t < L(0).end - 0.1 ? 'nervous' : 'scared', t, 0.3, { gaze: 'forward' }); W.rd.copy(W.rad.position); }
    else { const u = clamp((t - walkT0) / (walkT1 - walkT0)); m(d, v3(lerp(0.4, 0, u), 0, lerp(DZ0, 1, u)), Math.PI + (1 - u) * 0.1); pose(d, 'walk', t * 0.9); face(d, 'nervous', t); W.rad.visible = false; }
    m(wk, v3(-3.9, 0, 9.4), 0.9); pose(wk, 'idle', t); wk.neck.rotation.y = -0.2 * smooth(walkT0, walkT1, t); face(wk, 'neutral', t, 0.44); W.wm.visible = false;
    return;
  }
  // the worker hauls him out by the forearm
  if (t < e.sitAt) {
    const u = clamp((t - (s(22) - 0.08)) / (e.sitAt - s(22) - 0.18)), z0 = lerp(-0.5, 5.6, easeInOut(u)), wz = lerp(7.1, 9.0, u); place(d, v3(0, 0, z0), 0); crawlKnees(d, z0 / 1.9, { th: 1.28 + 0.1 * Math.sin(u * 3.14), look: 0.1 });
    d.root.updateMatrixWorld(true); const grip = d.torso.localToWorld(v3(0, 2.1, 0)).add(v3(-0.72, 0.18, 2.1)); aimArm(d, 0, grip, 1); d.elbow[0].rotation.x = 0; d.root.updateMatrixWorld(true);
    const wrist = handOf(d, 0); face(d, 'terrified', t, 0.3);
    place(wk, v3(0.2, 0, wz), Math.PI); pose(wk, 'idle', t); wk.torso.rotation.x = 0.36; wk.hips.rotation.x = -0.14; aimArm(wk, 0, wrist.clone().add(v3(0.25, 0, 0.28)), 1); aimArm(wk, 1, wrist.clone().add(v3(-0.28, 0.05, 0.42)), 1); face(wk, 'nervous', t, 0.44, { noBlink: false }); W.wm.visible = false; W.grip = wrist;
    return;
  }
  // sat on the ground, looking back at the mouth; the worker kneels between him and it
  const DS = v3(0.55, 0, 13.4), WS = v3(-0.35, 0, 9.3);
  place(d, DS, Math.PI - 0.03); sitUp(d, { hy: t >= s(25) ? -0.4 : -0.7 }); const dh = d.neck; const lookup = smooth(s(28) - 0.2, s(28) + 0.5, t);
  if (t >= s(24) && t < s(25) - 0.1) dh.rotation.y = Math.sin((t - s(24)) * 11) * 0.42 * smooth(s(24), s(24) + 0.14, t) * (1 - smooth(L(24).end - 0.2, L(24).end, t));
  dh.rotation.x = lerp(t >= s(25) ? 0.32 : 0.16, -0.02, lookup);
  d.root.updateMatrixWorld(true); const rh = handOf(d, 0); W.rad.visible = true; W.rad.position.copy(rh).add(v3(0.05, 0.42, -0.05)); W.rad.rotation.set(0.3, Math.PI - 0.1, 0.06); W.rd.copy(W.rad.position);
  W.rad.led.material.color.set(t > s(25) - 0.15 && t < L(27).end + 0.2 && Math.sin(t * 22) > -0.2 ? '#ff4f3a' : '#2fe25a');
  face(d, t >= s(28) ? 'shocked' : t >= s(26) ? 'scared' : 'sad', t, 0.3, { noBlink: t >= s(28), gaze: t >= s(28) ? 'forward' : undefined });
  place(wk, WS, 0.06); kneel(wk, {}); wk.arms[0].rotation.set(-0.72, 0, -0.08); wk.elbow[0].rotation.x = -0.72; wk.arms[1].rotation.set(-0.5, 0, 0.1); wk.elbow[1].rotation.x = -1.05; wk.neck.rotation.x = t >= e.smile ? 0.05 : 0.14; wk.neck.rotation.z = -0.1 * smooth(s(30), s(31) + 0.3, t);
  const talk1 = t >= s(23) && t < L(23).end ? visemeAt(L(23).text, s(23), L(23).end, t) : undefined;
  const wrong = t >= s(30) + 0.5, sm = smooth(e.smile, e.smile + 1.3, t);
  if (sm <= 0.01) { face(wk, 'neutral', t, 0.44, { viseme: talk1 }); W.wm.visible = false; }
  else { face(wk, 'neutral', t, 0.44, { noMouth: true, noBlink: true }); const ln = L(31), talk = t >= ln.start && t < ln.end ? visemeAt(ln.text, ln.start, ln.end, t) : undefined, tw = smooth(s(31) - 0.5, s(31) + 0.5, t);
    W.wm.visible = true; W.wm.set('happy', { viseme: talk, scale: lerp(1, lerp(1.34, 1.1, tw), sm), angle: lerp(0, 1.3, tw) + 0.05 * Math.sin(t * 2.3) * tw, du: 0.012 * Math.sin(t * 7) * tw, dv: lerp(0, -0.04, tw) }); }
  void wrong;
}
// three days ago, she goes in
function poseSophie(t) {
  const so = W.so, u = clamp((t - L(2).start) / (L(3).start - L(2).start)), p = W.T.pt(lerp(9, 16.5, u), 0.4, 0), y = W.T.yawIn(10);
  place(so, p, y); pose(so, 'walk', t * 0.72); const tg = W.T.pt(30, 0, 3); aimArm(so, 0, tg, 0.82); so.neck.rotation.y = 0.82 * smooth(0.5, 0.82, u) * (1 - smooth(0.88, 1, u)); face(so, 'happy', t, 0.2);
  const hp = handOf(so, 0); W.fl.visible = true; W.fl.position.copy(hp); W.fl.lookAt(tg); W.fl.translateZ(-0.24); W.hand.copy(hp); W.beam = tg;
}

// ---- the thing ----
function creaturePose(t) {
  const e = T, TT = W.T, s = (i) => L(i).start, D = W.dp;
  const L0 = 111.4, hip = (x) => TT.pt(x, 0, 1.75), lung = easeOut(smooth(e.S2, e.lc, t)), push = smooth(e.lc + 0.15, e.kc - 0.3, t), thrown = t > e.kc ? easeOut(clamp((t - e.kc) / 0.5)) : 0, breath = 0.04 * Math.sin(t * 2.6);
  let hs_ = lerp(lerp(L0 + 4.8, 107.0, lung), 108.9, push); if (t > e.kc) hs_ = lerp(108.9, 124, thrown);
  const roll = t > e.kc ? thrown * 1.3 : 0, hipsP = hip(hs_), chestP = TT.pt(hs_ - 2.45, Math.sin(roll) * 0.4, 1.78 + breath), hd0 = lerp(lerp(L0, 101.9, lung), 105.6, push), hd = t > e.kc ? lerp(105.6, 120.5, thrown) : hd0, headP = TT.pt(hd, 0.05 * Math.sin(t * 3.7), lerp(lerp(1.62, 2.62, lung), 2.2, push) + (t > e.kc ? 0.5 * Math.sin(thrown * 3.14) : 0));
  const F = v3(0, -0.05, 1).normalize(), jitter = t > e.back && t < e.S2 ? Math.sin(t * 41) * 0.02 : 0;
  headP.x += jitter; const tilt = lerp(0.14, 0.5, smooth(s(16), e.back, t)) * (t < e.kc ? 1 : 0.3), U0 = v3(Math.sin(tilt), Math.cos(tilt), 0);
  const handZ = (b, k) => lerp(b + 2.2, k, lung), hSide = 2.05, st = (ph) => Math.sin(t * 9 + ph) * 0.12 * (t < e.S2 ? 0 : 1);
  const hands = [TT.pt(handZ(L0 - 0.6, 100.9), lerp(-hSide, -1.0, lung), lerp(0.2, 2.3, lung) + st(0)), TT.pt(handZ(L0 - 0.4, 103.4), hSide, 0.2 + st(2))], feet = [TT.pt(hs_ + 3.2, -1.95, 0.2), TT.pt(hs_ + 3.3, 1.95, 0.2)];
  if (t > e.lc + 0.1) { const k = smooth(e.lc + 0.1, e.kc - 0.3, t); hands[0] = TT.pt(lerp(100.9, 104.8, k), lerp(-1.0, -2.0, k), lerp(2.3, 0.2, k)); hands[1] = TT.pt(lerp(103.4, 104.8, k), 2.0, 0.2); }
  if (t > e.kc) { const k = thrown; hands[0] = TT.pt(lerp(104.8, 117, k), -1.9, lerp(0.2, 2.6, Math.sin(k * 3))); hands[1] = TT.pt(lerp(104.8, 117.5, k), 1.9, lerp(0.2, 2.2, Math.sin(k * 3))); }
  const P_ = { hips: hipsP, chest: chestP, head: headP, F, U: U0, bodyF: v3(0, -1, 0), hands, feet, elbow: [v3(-1, 0.7, 0), v3(1, 0.7, 0)], knee: [v3(-1, 0.55, 0), v3(1, 0.55, 0)], toe: v3(0, 0, -1), floor: -99, t, curl: 1.2 };
  W.cr.visible = true; W.cr.set(P_); W.ch.copy(headP); W.crP = P_;
  // the mouth: the same smile, turning and sliding the wrong way across the face; it won't stop moving
  const a = smooth(s(16) - 0.1, s(16) + 1.5, t), slide = smooth(s(16), s(17), t), ang = a * 1.45 + Math.sin(t * 3.1) * 0.06 * a + (t > s(16) ? Math.sin((t - s(16)) * 2.3) * 0.28 : 0);
  const openC = 'ASOWAL'[Math.floor(t * 9) % 6];
  W.fs.setFace('surprised', { noMouth: true, blink: false, gaze: 'forward' }); W.fm.set('happy', { viseme: t > s(16) + 0.15 && t < e.lc && Math.sin(t * 13) > -0.4 ? openC : undefined, scale: lerp(1.28, 1.22, a), angle: 0.14 + ang, du: 0.03 * slide * Math.sin(t * 1.8), dv: -0.03 * slide });
  W.cm.forEach((m, i) => { const q = 0.32 + i * 0.22, p0 = hipsP.clone().lerp(chestP, q).add(v3(0, -0.7, 0)); m.position.copy(p0); m.rotation.set(Math.PI / 2, 0, 0); m.visible = t > e.S2 && t < e.flipOut && Math.floor(t * 8 + i * 1.7) % 3 !== 0; m.material.map = m.userData.t[Math.floor(t * 11 + i) % 2]; });
}
function hideAll() { [W.d, W.so, W.wk, ...W.crew].forEach((c) => { c.root.visible = false; }); W.cr.visible = false; W.cm.forEach((m) => { m.visible = false; }); W.fl.visible = false; W.lost.visible = false; W.rad.visible = false; W.finder.root.visible = false; W.faces.visible = false; }

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = T, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 }), TP = (a, b, c) => W.T.pt(a, b, c);
  const crawlF = (dS, lat, h, lk = 0) => () => { const q = W.segS ?? 40; return { pos: TP(q + dS, lat, h), look: TP(q, 0, 1.9 + lk), fov: 60 }; };
  const crawlB = (dS, lat, h) => () => { const q = W.segS ?? 40; return { pos: TP(q - dS, lat, h), look: TP(q + 2, 0, 1.5), fov: 62 }; };
  add('open', 0, (u) => ({ pos: lp3(v3(1.8, 5.2, 21.4), v3(1.7, 5.2, 20.4), u), look: v3(0.1, 4.55, 13), fov: 34 }));
  add('mouth', L(0).end - 0.95, (u) => ({ pos: lp3(v3(0, 3.8, 26), v3(0, 3.9, 19.5), easeInOut(u)), look: v3(0, 6.2, -6), fov: 60 }));
  add('enter', s(1) - 0.05, (u) => ({ pos: lp3(v3(-21, 10.5, 34), v3(-16, 8.6, 25), easeInOut(u)), look: lp3(v3(-1, 4, 12), v3(0, 4.5, 4), easeInOut(u)), fov: 56 }));
  add('sophie', s(2) - 0.05, (u) => ({ pos: lp3(TP(1.6, 1.4, 4.6), TP(4.6, 1.2, 4.6), easeInOut(u)), look: TP(14, 0.3, 3.6), fov: 56 }));
  add('found', s(3) - 0.05, (u) => ({ pos: lp3(TP(33.5, 1.7, 3.3), TP(32.5, 1.6, 3.3), easeInOut(u)), look: TP(22, 0, 0.1), fov: 52 }));
  add('lens', s(4) - 0.1, (u) => ({ pos: lp3(TP(30.4, -2.1, 1.6), TP(29.8, -2, 1.55), u), look: TP(23, -0.3, -0.4), fov: 34 }));
  add('crawl1', s(5) - 0.1, (u) => ({ pos: lp3(TP(43.5, 1.6, 1.7), TP(44.2, 1.5, 1.9), u), look: () => 0, fov: 60, _d: 1 }));
  add('wide1', s(5) + 0.95, (u) => ({ pos: lp3(TP(36.5, 11, 3.8), TP(37.5, 11, 3.6), u), look: TP(42.5, 0, 2.0), fov: 40 }));
  add('wet', s(6) - 0.08, (u) => ({ pos: lp3(W.wetP.clone().add(v3(0.95, 0.6, -5.2)), W.wetP.clone().add(v3(0.9, 0.55, -4.7)), u), look: W.wetP.clone().add(v3(0, -0.5, 0)), fov: 40 }));
  add('pov', s(7) - 0.12, (u) => ({ pos: lp3(TP(55.3, 0.25, 2.5), TP(58.2, 0.2, 2.3), u), look: TP(72, 0.6, 2.2), fov: 60 }));
  add('stop', s(7) + 1.0, (u) => ({ pos: lp3(W.dh.clone().add(v3(1.31, -0.2, -6.12)), W.dh.clone().add(v3(1.22, -0.2, -5.25)), u), look: W.dh.clone().add(v3(0, -0.72, 0)), fov: 40 }));
  add('heard', s(8) - 0.05, (u) => ({ pos: lp3(W.dh.clone().add(v3(-2.62, -0.2, -5.08)), W.dh.clone().add(v3(-2.27, -0.2, -4.38)), u), look: W.dh.clone().add(v3(0, -0.72, 0)), fov: 40 }));
  add('dark', s(9) - 0.05, (u) => ({ pos: lp3(TP(71, -0.6, 2.2), TP(70, -0.55, 2.2), u), look: TP(56, 0.4, 2.3), fov: 52 }));
  add('calling', s(10) - 0.05, (u) => ({ pos: lp3(W.dh.clone().add(v3(0.88, -0.7, -5.95)), W.dh.clone().add(v3(0.79, -0.7, -5.42)), u), look: W.dh.clone().add(v3(0, -0.72, 0)), fov: 44 }));
  add('narrow', s(11) - 0.1, (u) => ({ pos: lp3(TP(96, 1.7, 1.9), TP(95.8, 1.6, 1.85), u), look: TP(88, 0, 0.85), fov: 56 }));
  add('tight', s(12) - 0.1, (u) => ({ pos: lp3(W.dh.clone().add(v3(1.93, 0.1, -4.81)), W.dh.clone().add(v3(1.75, 0.08, -4.38)), u), look: W.dh.clone().add(v3(0, -0.72, 0)), fov: 44 }));
  add('sweep', s(13) - 0.1, () => ({ pos: W.dh.clone().add(v3(1.25, 0.72, 4.6)), look: TP(113, 0, 1.25), fov: 54 }));
  add('face', e.S1, (u, t) => { const k = easeOut(clamp((t - e.S1) / 0.1)); return { pos: lp3(W.ch.clone().add(v3(0.14, 0.04, 10.5)), W.ch.clone().add(v3(0.07, -0.03, 5.6)), k), look: W.ch.clone().add(v3(0, -0.85, 0)), fov: lerp(58, 42, k) }; });
  add('dscared', s(15) + 0.62, () => ({ pos: W.dh.clone().add(v3(0.88, -0.05, -4.29)), look: W.dh.clone().add(v3(0, -0.72, 0)), fov: 42 }));
  add('wrong', s(16) - 0.06, (u) => ({ pos: lp3(W.ch.clone().add(v3(0, -0.1, 5.6)), W.ch.clone().add(v3(0.04, -0.14, 4.3)), easeInOut(u)), look: W.ch.clone().add(v3(0, -0.8, 0)), fov: 40 }));
  const fightCam = (t) => { const a = lerp(0.5, 0.74, smooth(e.back, e.flipOut, t)), R_ = 19; return { pos: TP(103.8 - R_ * Math.cos(a), R_ * Math.sin(a), 2.5), look: TP(103.8, 0, 0.2), fov: 36 }; };
  add('back', e.back, (u, t) => fightCam(t));
  add('lunge', e.S2, (u, t) => fightCam(t));
  add('kickW', e.lc + 0.35, (u, t) => fightCam(t));
  add('out1', e.flipOut, (u) => ({ pos: TP((W.segS ?? 90) - 6.4, 0.8, 1.5), look: TP(W.segS ?? 90, 0, 0.8), fov: 54 }));
  add('voices', s(20) - 0.06, (u) => ({ pos: TP((W.segS ?? 65) - 5, 1.0, 2.65), look: TP((W.segS ?? 65) + 8, 0, 1.8), fov: 60 }));
  add('voicesW', s(20) + 1.8, (u) => ({ pos: TP((W.segS ?? 38) - 8.2, 1.3, 2.3), look: TP((W.segS ?? 38) + 2, 0, 0.9), fov: 54 }));
  add('day', s(21) - 0.06, (u) => ({ pos: lp3(TP(20, 1.9, 2.6), TP(13, 1.8, 2.8), u), look: v3(0, 4.6, 8), fov: 60 }));
  add('pull', s(22) - 0.08, (u) => ({ pos: lp3(v3(-5.6, 7.4, -5.2), v3(-5.3, 7.2, -4.6), easeInOut(u)), look: v3(0, 2.2, 6.6), fov: 44 }));
  add('ask', s(23) - 0.12, (u) => ({ pos: lp3(W.wh.clone().add(v3(-2.04, 0.12, 6.88)), W.wh.clone().add(v3(-1.95, 0.1, 6.12)), u), look: W.wh.clone().add(v3(0, -0.72, 0)), fov: 42 }));
  add('shake', s(24) - 0.08, (u) => ({ pos: lp3(W.dh.clone().add(v3(0.95, 0.35, -8.92)), W.dh.clone().add(v3(0.85, 0.3, -8.05)), u), look: W.dh.clone().add(v3(0, -0.72, 0)), fov: 40 }));
  add('radio', s(25) - 0.08, (u) => ({ pos: lp3(W.rd.clone().add(v3(-1.52, 0.25, -3.62)), W.rd.clone().add(v3(-1.3, 0.2, -3.04)), u), look: W.rd.clone().add(v3(0, 0.05, 0)), fov: 42 }));
  add('real', s(26) - 0.08, (u) => ({ pos: lp3(W.dh.clone().add(v3(0.85, 0.05, -6.12)), W.dh.clone().add(v3(0.75, 0.05, -5.25)), u), look: W.dh.clone().add(v3(0, -0.72, 0)), fov: 42 }));
  add('still', s(27) - 0.06, (u) => ({ pos: lp3(W.rd.clone().add(v3(-1.01, 0.85, -5.51)), W.rd.clone().add(v3(-0.8, 0.65, -4.64)), u), look: W.rd.clone().add(v3(0, 0.3, 0)), fov: 46 }));
  add('stare', s(28) - 0.08, (u) => ({ pos: lp3(W.dh.clone().add(v3(-1.93, 0.1, -6.3)), W.dh.clone().add(v3(-1.75, 0.08, -5.34)), easeInOut(u)), look: W.dh.clone().add(v3(0, -0.72, 0)), fov: 42 }));
  add('smile', s(29) - 0.08, (u) => ({ pos: lp3(W.wh.clone().add(v3(1.36, 0, 8.84)), W.wh.clone().add(v3(1.19, -0.05, 6.54)), easeInOut(u)), look: W.wh.clone().add(v3(0, -0.72, 0)), fov: 40 }));
  add('crew', s(30) - 0.08, (u) => ({ pos: lp3(v3(2.2, 5.6, 30.5), v3(2.0, 5.7, 28.5), easeInOut(u)), look: v3(0.2, 3.1, 4.5), fov: 36 }));
  add('final', s(31) - 0.3, (u, t) => ({ pos: lp3(W.wh.clone().add(v3(1.19, 0.05, 6.71)), W.wh.clone().add(v3(0.94, 0, 5.61)), easeInOut(smooth(0, 0.45, u))), look: W.wh.clone().add(v3(0.02, -0.3, 0)), fov: 42 }));
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1;
  const crawl1 = Sx.find((x) => x.name === 'crawl1'); crawl1.f = (u) => { const q = W.segS ?? 37; return { pos: TP(q + 7.6, 0.8, 2.1), look: TP(q + 0.5, 0, 1.25), fov: 56 }; };
  void crawlF; void crawlB;
  return Sx;
}
const INSIDE = new Set(['sophie', 'found', 'lens', 'crawl1', 'wide1', 'wet', 'pov', 'stop', 'heard', 'dark', 'calling', 'narrow', 'tight', 'sweep', 'face', 'dscared', 'wrong', 'back', 'lunge', 'kickW', 'out1', 'voices', 'voicesW']);

// ---- the impact sequences (Episode 33's): wind-up in slow motion, a snap, the contact held for five stark frames, back onto video time ----
const SPD = () => [
  { c: T.lc, wind: 0.34, snap: 0.11, slow: 0.5, fast: 2.3, rec: 1.42, at: () => W.T.pt(103.3, 0, 2) },
  { c: T.kc, wind: 0.36, snap: 0.12, slow: 0.45, fast: 2.3, rec: 1.3, at: () => W.T.pt(105.2, 0, 1.8) },
];
const HOLDF = 5, IMPSEQ = ['w', 'w', 'b', 'b', 'w'];
let MAP = null;
function buildMap() {
  const dt = 1 / 2400;
  MAP = SPD().map((p) => {
    const v0 = p.c - p.wind, pts = []; let v = v0, x = v0, ph = 0, cv = 0, tEnd = 0;
    for (let g = 0; g < 2400 * 8; g++) { pts.push(x); let sp = 1;
      if (ph === 0) { sp = lerp(1, p.slow, clamp((v - v0) / 0.12)); if (x >= p.c - p.snap) ph = 1; }
      if (ph === 1) { sp = p.fast; if (x + sp * dt >= p.c) { x = p.c; cv = v + dt; ph = 2; } }
      if (ph === 2) { sp = 0; if (v >= cv + HOLDF / 60) { ph = 3; tEnd = v + 0.12; } }
      if (ph === 3) { sp = 1; if (v >= tEnd) ph = 4; }
      if (ph === 4) { const gap = v - x; sp = 1 + (p.rec - 1) * clamp(gap / 0.06); if (gap < 0.0015) break; }
      if (ph !== 2) x += sp * dt; v += dt; }
    return { ...p, v0, v1: v, dt, pts, cv };
  });
}
function remap(v) { if (!MAP) return v; for (const m of MAP) { if (v < m.v0 || v >= m.v1) continue; const f = (v - m.v0) / m.dt, i = Math.floor(f), a = m.pts[Math.min(i, m.pts.length - 1)], b = m.pts[Math.min(i + 1, m.pts.length - 1)]; return a + (b - a) * (f - i); } return v; }
function held(v) { if (!MAP) return null; for (const m of MAP) { const k = Math.floor((v - m.cv) * 60 + 1e-4); if (k >= 0 && k < HOLDF) return { m, k }; } return null; }
function unmap(s) { let a = s - 2, b = s + 2; for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (remap(m) < s) a = m; else b = m; } return b; }

// ---- a frame ----
function renderAt(v) {
  const vN = ctx.sub && ctx.pro ? v + ctx.pro.shutter * ctx.sub.i / ctx.sub.N : v, hold = held(vN), t = hold ? hold.m.c : remap(v), s = (i) => L(i).start, e = T;
  const sh0 = shotAt(W.shots, t), n = sh0.name, inside = INSIDE.has(n), past = n === 'sophie';
  applyEnv(ctx, inside ? (past ? PAST : DARK) : LIP);
  W.ext.visible = !inside; W.T.day.value = inside ? 0 : 1; W.dr.update(t); hideAll(); W.pl.forEach((l) => { l.intensity = 0; }); W.flash.intensity = 0; W.segS = null;
  W.floods.forEach((f) => { f.lens.material.color.set('#fff4d8').multiplyScalar(0.92); });
  // the floor flashlight
  const lp = W.T.pt(23, -0.2, 0.2), beamTo = W.T.pt(31, 0.5, 2.0);
  const seg = danSeg(t); if (seg) W.segS = seg.s; W.segOut = !!(seg && seg.m.endsWith('Out'));
  if (n === 'sophie') poseSophie(t);
  else if (n === 'found' || n === 'lens') {
    W.lost.visible = true; W.lost.position.copy(lp); W.lost.lookAt(beamTo);
    if (n === 'found') { const fd = W.finder; place(fd, W.T.pt(20.4, 0.1, 0), W.T.yawIn(20)); kneel(fd, { th: 0.5 }); fd.neck.rotation.x = 0.2; const hd = lp.clone().add(v3(0.1, 0.3, 0)), k = smooth(s(3), s(3) + 1.6, t); aimArm(fd, 0, hd, 0.25 + 0.75 * k); fd.arms[1].rotation.x = -0.5; fd.elbow[1].rotation.x = -0.9; face(fd, 'sad', t, 0.5); }
    if (n === 'lens') setL(2, lp.clone().add(v3(-1.2, 1.1, -1.6)), '#cfdcef', 9, 9); const fk = t > s(4) && noise1(t * 11) > 0.76 ? 0.72 : 1; W.flash.position.copy(lp); W.flash.target.position.copy(beamTo); W.flash.intensity = 170 * fk; W.flash.distance = 48; W.flash.angle = 0.35;
  } else if (inside) { if (poseDaniel(t, n)) { W.d.root.updateMatrixWorld(true); W.dh.copy(W.d.neck.getWorldPosition(v3())).add(v3(0, 0.6, 0)); } }
  else { exterior(t, n); W.d.root.updateMatrixWorld(true); W.dh.copy(W.d.neck.getWorldPosition(v3())).add(v3(0, 0.6, 0)); W.wh.copy(W.wk.neck.getWorldPosition(v3())).add(v3(0, 0.65, 0)); }
  if (['ask', 'smile', 'final'].includes(n)) W.d.root.visible = false;
  if (['shake', 'radio', 'real', 'still', 'stare'].includes(n)) { W.wk.root.visible = false; W.wm.visible = false; }
  if (n === 'wet') {   // a hand on the rock, the water running over the knuckles (he stops and reaches for the wall)
    const d = W.d, sS = W.segS, rock = W.T.pt(sS + 1.3, -W.T.wid(sS) * 0.46, 1.9); aimArm(d, 1, rock, 1); d.elbow[1].rotation.x = -0.2; d.root.updateMatrixWorld(true); W.wetP.copy(handOf(d, 1)); }
  W.d.root.updateMatrixWorld(true);
  // the thing exists from the moment the light finds it
  if (['face', 'dscared', 'wrong', 'back', 'lunge', 'kickW', 'sweep'].includes(n) && t > e.S1 - 3.2) creaturePose(t);
  if (n === 'dark') { const TT = W.T, hk = smooth(s(9), s(9) + 1.5, t); W.cr.visible = true; W.cr.set({ hips: TT.pt(76, -2, 1.75), chest: TT.pt(73.6, -2, 1.8), head: TT.pt(72.4, -2, 2), F: v3(0, 0, 1), U: v3(0, 1, 0), bodyF: v3(0, -1, 0), hands: [TT.pt(lerp(68.2, 66.8, hk), -1.5, 2.75), TT.pt(lerp(68.4, 67.2, hk), -1.7, 1.45)], feet: [TT.pt(81, -1.9, 0.2), TT.pt(81, 1.9, 0.2)], elbow: [v3(-1, 0.7, 0), v3(1, 0.7, 0)], knee: [v3(-1, 0.55, 0), v3(1, 0.55, 0)], toe: v3(0, 0, -1), floor: -99, t, curl: 1.2 }); }
  if (n === 'sweep') { const sh = t < e.S1 - 0.06; W.cr.visible = !sh; W.cm.forEach((m) => { m.visible = false; }); }
  if (['face', 'wrong'].includes(n)) { W.d.root.visible = false; W.fl.visible = false; }
  if (n === 'dscared') { W.cr.visible = false; W.cm.forEach((m) => { m.visible = false; }); }
  if (n === 'voices' || n === 'voicesW') { const k = smooth(s(20) - 0.05, s(20) + 0.6, t); W.faces.visible = true; W.faces.update(t, k); }
  const cut = ['wide1', 'back', 'lunge', 'kickW'].includes(n); W.slab.visible = cut;
  // ---- lights ----
  const f = W.T, near = (q, j) => { const near_ = [...f.sticks].sort((a, b) => Math.abs(a.s - q) - Math.abs(b.s - q)).slice(0, 2); near_.forEach((st, i) => setL(j + i, st.p, '#6cf09a', 3.4, 11)); };
  if (inside) {
    const q = W.segS ?? 24; near(q, 0);
    if (W.beam) { const fk = (n === 'tight' || n === 'sweep') && t < e.S1 ? (t > L(12).end && t < s(13) ? 0.06 : noise1(t * 14) > 0.66 ? 0.6 : 1) : 1, dir = W.beam.clone().sub(W.hand).normalize(); W.flash.position.copy(W.hand).addScaledVector(dir, 0.5); W.flash.target.position.copy(W.beam); W.flash.intensity = (past ? 190 : 230) * fk; W.flash.distance = 62; W.flash.angle = 0.42; }
    const hd = W.dh;
    if (W.d.root.visible) { const zs = W.segOut ? -1 : 1; setL(2, hd.clone().add(v3(0.8, 0.3, -2.0 * zs)), '#cfdcef', 15, 13); setL(3, hd.clone().add(v3(-0.9, 0.5, 2.4 * zs)), '#9fb4d0', 8, 12); }
    if (n === 'wide1' || n === 'back' || n === 'lunge' || n === 'kickW') { setL(2, W.T.pt(q + 2, 0, 2.5), '#cfdcef', 34, 22); setL(3, W.T.pt(q + 8, 0, 2.2), '#ffe0b0', 22, 22); setL(4, W.T.pt(q - 4, 1, 2.4), '#9fb4d0', 18, 20); setL(5, W.T.pt(q + 2, 2.2, 2.6), '#dfe6f2', 30, 18); }
    if (n === 'face' || n === 'wrong') { setL(2, W.ch.clone().add(v3(0.2, -0.2, 1.8)), '#ffe9c7', 12, 8); W.flash.position.copy(W.ch).add(v3(0.3, -0.5, 6)); W.flash.target.position.copy(W.ch); W.flash.intensity = 120; W.flash.distance = 30; W.flash.angle = 0.32; }
    if (n === 'dscared') setL(2, W.dh.clone().add(v3(0.7, 0.1, -1.7)), '#ffe9c7', 18, 10);
    if (n === 'voices' || n === 'voicesW') { const c = W.T.pt(q + 7, 0, 2); setL(3, c, '#a9b6c8', 42, 34); setL(4, W.T.pt(q + 18, 0, 2), '#c0a0b8', 38, 36); }
    if (past) setL(2, W.T.pt(11, 0.3, 4.6), '#c9d4e4', 26, 18);
    if (n === 'found') setL(2, W.T.pt(25, 1, 3.4), '#cfdcef', 22, 16);
    if (n === 'dark') { setL(3, W.T.pt(68, 0, 2.3), '#9fb4d0', 10, 14); W.flash.position.copy(W.T.pt(55, 0.3, 2.2)); W.flash.target.position.copy(W.T.pt(70, -0.2, 2.2)); W.flash.intensity = 200; W.flash.distance = 40; W.flash.angle = 0.4; }
  } else {
    const dkFill = n === 'mouth' ? 0.5 : 1; setL(0, v3(-9, 7, 4), '#fff0d0', 44 * dkFill, 26); setL(1, v3(9, 7, 4), '#fff0d0', 44 * dkFill, 26);
    if (['ask', 'shake', 'radio', 'real', 'still', 'stare', 'smile', 'final', 'open'].includes(n)) { const ft = n === 'ask' || n === 'smile' || n === 'final' ? W.wh : W.dh; setL(2, ft.clone().add(v3(0.8, 0.5, 3)), '#fff4e4', 16, 11); }
  }
  W.air.update(t); W.air.list.dust.position.copy(inside ? W.T.pt(W.segS ?? 24, 0, 1.5) : v3(0, 4, 12));
  W.blood.update?.(t);
  ctx.scene.updateMatrixWorld(true);
  const sh1 = shotAt(W.shots, t);
  if (W.slab.visible) { const dir = sh1.look.clone().sub(sh1.pos).normalize(); W.slab.position.copy(sh1.look).addScaledVector(dir, 24); W.slab.lookAt(sh1.pos); }
  const q = new URLSearchParams(location.search), dc = q.get('dbgcam'), dq = dc ? dc.split(',').map(Number) : null, dh = q.get('dbgh'), dv = dh ? dh.split(',') : null;
  let sh = dq ? { ...sh1, pos: v3(dq[0], dq[1], dq[2]), look: v3(dq[3], dq[4], dq[5]), fov: dq[6] || 40 } : sh1;
  if (q.get('dbgg') && W.grip) { sh = { ...sh1, pos: W.grip.clone().add(v3(-2.6, 0.9, 2.2)), look: W.grip.clone(), fov: 34 }; }
  if (dv) { const who = { d: W.d, s: W.so, w: W.wk, f: W.fs }[dv[0]], hp = dv[0] === 'f' ? W.ch.clone() : who.neck.getWorldPosition(v3()).add(v3(0, 0.6, 0)), qq = dv[0] === 'f' ? new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), 0) : who.neck.getWorldQuaternion(new THREE.Quaternion()); sh = { ...sh1, pos: hp.clone().add(v3(+dv[1], +dv[2], +dv[3]).applyQuaternion(qq)), look: hp, fov: +dv[4] || 34 }; }
  // camera shake only at the beats that earn it
  let flash = 0, shake = 0; const imp = (c, sv) => { const d = t - c; if (d >= 0 && d < 0.45) shake = Math.max(shake, sv * Math.exp(-d * 8)); };
  imp(e.S1, 1.6); imp(e.lc, 2.1); imp(e.kc, 2.3); if (n === 'pull') shake = 0.3; if (['voices', 'voicesW', 'out1'].includes(n)) shake = Math.max(shake, 0.55);
  const nearP = ['face', 'wrong', 'wet', 'lens', 'tight', 'dscared', 'stop', 'heard', 'calling'].includes(n) ? 0.05 : 0.14; if (ctx.camera.near !== nearP) { ctx.camera.near = nearP; ctx.camera.updateProjectionMatrix(); }
  const steady = t < L(1).start || ['mouth', 'enter', 'lens', 'found', 'sophie'].includes(n);
  let sil = null;
  if (hold) {
    sil = IMPSEQ[hold.k]; const keep = new Set([W.d.root, W.cr]);
    W.hid = ctx.scene.children.filter((o) => o.visible && !keep.has(o) && !o.isLight && !o.isCamera); W.hid.forEach((o) => { o.visible = false; });
    ctx.scene.overrideMaterial = sil === 'w' ? W.silW : W.silB; ctx.scene.background.set(sil === 'w' ? '#000000' : '#5d5968'); ctx.scene.fog.near = 1e5; ctx.scene.fog.far = 2e5;
  }
  frame(ctx, t, sh, { capT: v, steady: steady || !!dq || !!dv, shake: steady || dq || dv ? 0 : shake, shadowSpan: 80, flash, shadows: !inside, black: n === 'tight' && t > L(12).end + 0.3 ? 0.55 : 0 });
  if (sil) { W.hid.forEach((o) => { o.visible = true; }); ctx.scene.overrideMaterial = null; const pr = hold.m.at().project(ctx.camera); W.fx.set(vN, { focus: 1, cx: clamp(pr.x * 0.5 + 0.5), cy: clamp(0.5 - pr.y * 0.5), color: sil === 'w' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)', inner: 0.4, seed: hold.k * 7 }); }
  else { const o = { focus: 0, streak: 0, impact: 0, cx: 0.5, cy: 0.5 }; if (n === 'lunge' && t < e.lc) { o.focus = 0.65; o.color = 'rgba(255,255,255,0.32)'; o.inner = 0.55; } if (n === 'out1' || n === 'voices') { o.focus = 0.3; o.color = 'rgba(255,255,255,0.14)'; o.inner = 0.7; } W.fx.set(v, o); }
  return n;
}

export async function setup() {
  ctx = await initStage('ep39', { look: 'pro', avatars: ['farm_daniel', SOPHIE, WORKER, ...CREW, FINDER] }); L = ctx.L; events();
  await loadAlti(['neutral', 'nervous', 'scared', 'shocked', 'terrified', 'happy', 'surprised', 'sad']);
  const { scene, camera } = ctx; camera.far = 2000; camera.near = 0.14; camera.updateProjectionMatrix();
  rig();
  W.T = voiceTunnel(); scene.add(W.T); W.dr = drips(W.T); scene.add(W.dr);
  // the clearing: rock face, tape, tripods, truck, tent and the trees behind
  const G = new THREE.Group(); scene.add(G); W.ext = G; G.add(hillside(W.T));
  for (const x of [-2.9, 2.9, -11, 11]) { const p = tapePost(); p.position.set(x, 0, 9); G.add(p); }
  G.add(cautionTape(v3(-11, 3.7, 9), v3(-2.9, 3.7, 9))); G.add(cautionTape(v3(2.9, 3.7, 9), v3(11, 3.7, 9)));
  W.floods = [[-9.5, 7.5, 0.55], [9.5, 7.5, -0.55]].map(([x, z, r]) => { const f = floodTripod(); f.position.set(x, 0, z); f.rotation.y = Math.PI + r; G.add(f); return f; });
  const tr = rescueTruck(); tr.position.set(26, 0, 36); tr.rotation.y = -2.3; G.add(tr);
  const te = tent(); te.position.set(-27, 0, 31); te.rotation.y = 0.6; G.add(te); const tb = campTable(); tb.position.set(-17, 0, 21); tb.rotation.y = 0.5; G.add(tb);
  [[16, 20], [-22, 13], [19, 12]].forEach(([x, z], i) => { const c = supplyCrate(i + 2); c.position.set(x, 0, z); c.rotation.y = i * 1.4; G.add(c); });
  const shapes = [treeShape({ seed: 11, h: 34, r0: 2.2, r1: 0.9, spread: 11, clumps: 12, detail: 1 }), treeShape({ seed: 12, h: 40, r0: 2.4, r1: 1, spread: 12, clumps: 12, detail: 1, cols: ['#123021', '#245e30', '#5fa23f'] })];
  const R = rng(39), list = []; for (let i = 0; i < 60; i++) { const a = -0.15 + R() * 3.45, d = 58 + R() * 150; list.push({ shape: i % 2, x: Math.cos(a) * d, z: 30 + Math.abs(Math.sin(a)) * d * 0.9, ry: R() * 6.3, s: 0.9 + R() * 0.5 }); }
  const trees = new THREE.Group(); G.add(trees); W.trees = treeSet(trees, shapes, list);
  people();
  W.finder = (() => { const c = makeCharacter({ avatar: FINDER, alti: true, skin: '#e0ac82', caustic: false }); scene.add(c.root); c.root.visible = false; c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); return c; })();
  W.crewA = [{ p: v3(-16, 0, 19), yaw: 0.9, end: v3(-4.3, 0, 5.3), endYaw: 0.3, stare: 0.25 }, { p: v3(13, 0, 18), yaw: -2.2, end: v3(3.9, 0, 5.7), endYaw: -0.25, stare: -0.2 }, { p: v3(18, 0, 26), yaw: -1.1, end: v3(0.9, 0, 1.9), endYaw: 0, stare: -0.25 }];
  W.wetP = v3();
  { const G2 = new THREE.PlaneGeometry(400, 400), uvA = G2.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * 36, uvA.getY(i) * 36); W.slab = new THREE.Mesh(G2, new THREE.MeshBasicMaterial({ map: W.T.rock.material.map, color: '#4a4640', fog: false })); W.slab.userData.noAO = true; W.slab.visible = false; scene.add(W.slab); }
  W.faces = wallFaces(W.T, [altiCanvas('terrified'), altiCanvas('terrified', { viseme: 'A' }), altiCanvas('shocked'), altiCanvas('shocked', { viseme: 'O' })], { s0: 28, span: 108, n: 78 }); scene.add(W.faces);
  const list2 = { dust: dust(scene, { size: 24, height: 7, centre: v3(0, 3, 0), count: 300, color: '#c4cdd6', amount: 0.14, pointSize: 0.18 }) }; W.air = atmos(...Object.values(list2)); W.air.list = list2;
  W.silW = new THREE.MeshBasicMaterial({ color: '#ffffff' }); W.silB = new THREE.MeshBasicMaterial({ color: '#000000' });
  W.fx = installActionFX(ctx); buildMap();
  // toon blood: the claws across his shoulder at the lunge, and the thing's own dark spray at the kick
  W.blood = bloodFX(scene, [
    { t: T.lc, p: W.T.pt(101.5, -0.6, 1.9), dir: v3(-0.5, 0.75, 0.4), n: 30, power: 0.9, end: T.flipOut },
    { t: T.kc, p: W.T.pt(105.0, 0, 2.0), dir: v3(0, 0.55, -1), n: 44, power: 1.25, end: T.flipOut },
  ], { floor: W.T.floor(103) + 0.06, color: '#a00012', seed: 39 });
  W.shots = shots();
  window.__ep39 = { W, THREE, ctx };
  const EV = { ...T, S1: T.S1, S2: unmap(T.S2), lc: unmap(T.lc), kc: unmap(T.kc), lcHit: MAP[0].cv, kcHit: MAP[1].cv };
  return expose(ctx, renderAt, T.end - 0.9, EV);
}
