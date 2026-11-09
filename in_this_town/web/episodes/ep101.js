// Flower Man remake 1: The Sorry Garden. In Larkspur, hurting someone grows a flower on your skin; only a real sorry, forgiven, makes it drop.
// Nell, the bakery girl, has never grown a petal. Old Mr. Hollis is covered in black dahlias and nobody goes near him. Her bread cart smashes his greenhouse and nothing grows.
// A week later she asks who he hurt: "Nobody." The roots run inward: he took his dying wife Ruth's flowers so she could leave clean. Nell touches one and forgives her; it crumbles. By morning the whole street is at his gate.
// The world: the street runs along x at z 42, up on the level y = ST; a cobbled lane falls from the gate (z 31) to the low yard (y = 0) at z 14, straight at the greenhouse. Ruth's room is at RM.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti, blinkAt, visemeAt } from '../engine/altiface.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DAY } from '../engine/stage.js';
import { clouds } from '../engine/atmos.js';
import { aimArm as aimArm0 } from '../engine/anims.js';
import { jointify } from '../engine/infinitetower.js';
import { glassShatter } from '../engine/gameshow.js';
import { flowerMesh, flowerGeo, skinBlooms, popK, petalDust, breadCart, loafMesh, cakeTable, partyHat, sickBed, quilt, ruthRoom, larkspur, gardenBench, ST, GH, BENCH, laneY } from '../engine/sorrygarden.js';

const aimArm = (c, side, p, k = 1) => { c.root.updateMatrixWorld(true); aimArm0(c, side, p, k); };
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const RM = v3(1000, 0, 0);
let ctx, L, EV;
const W = {};
const LIGHT = '#eec39a', TAN = '#c68642', DARK = '#7a4f30';
const AV = { nell: ['farm_baker', '#cc8e69'], hollis: ['farm_old_man', '#e2bd9c'], ruth: ['farm_grandma_june', '#e6c3a6'], baker: ['farm_lt_teddy', LIGHT], shover: ['farm_finn', LIGHT], pushed: ['farm_red_kid', LIGHT], jake: ['farm_jake_blue', LIGHT], mia: ['farm_mia', LIGHT], oliver: ['farm_oliver', LIGHT], sue: ['farm_lily_pink', LIGHT], neighbor: ['farm_ms_henderson', LIGHT], mom: ['farm_classic_mom', LIGHT], kid: ['farm_young_kid', LIGHT], nia: ['farm_nia', DARK], omar: ['farm_omar', DARK], maya: ['farm_hc_maya', TAN], eli: ['farm_hc_eli', LIGHT], visitor: ['farm_chloe', TAN] };
const SCALE = { kid: 0.72, shover: 0.8, pushed: 0.8 };

const SUN = { ...DAY, ...P({ top: '#3f9cf0', horizon: '#d6f0ff', haze: '#d4ecff', sunColor: '#fff1d6', hemiSky: '#d6edff', hemiGround: '#a2d27a' }), sunDir: v3(0.42, 0.8, 0.6), sunI: 2.1, sunDisc: 0.4, hemiI: 1.15, amb: 0.26, envI: 1.0, exposure: 1.0, bloom: 0.04, vig: 0, saturation: 1.2, contrast: 1.05, bounce: 0.18, fogNear: 220, fogFar: 900, stars: 0, moon: 0, win: 0, lamp: 0 };
const GOLD = { ...SUN, ...P({ top: '#4f8cdc', horizon: '#ffd9aa', haze: '#ffdcb6', sunColor: '#ffd3a0', hemiSky: '#ffe2c2', hemiGround: '#b8b070' }), sunDir: v3(0.74, 0.42, 0.62), sunI: 2.3, hemiI: 1.15, amb: 0.3 };
const ROOM = { ...SUN, ...P({ top: '#ffe7c2', horizon: '#ffe7c2', haze: '#ffe7c2', sunColor: '#ffe6c0', hemiSky: '#ffedd2', hemiGround: '#b8905e' }), sunDir: v3(0.8, 0.5, 0.2), sunI: 0.1, sunDisc: 0, hemiI: 1.3, amb: 0.5, envI: 0.6, saturation: 0.82, contrast: 1.03, exposure: 1.02, fogNear: 400, fogFar: 1200 };
const MORN = { ...SUN, ...P({ top: '#59aef2', horizon: '#ffeadb', haze: '#ffeadb', sunColor: '#fff0d6', hemiSky: '#e6f0ff', hemiGround: '#b4d68a' }), sunDir: v3(0.3, 0.6, 0.72), sunI: 2.15, hemiI: 1.25, amb: 0.3, saturation: 1.24 };

function events() {
  const s = (i) => L(i).start;
  return { shove: s(0) + 2.2, pop0: s(0) + 2.55, pop1: s(1) + 2.15, pop2: s(2) + 1.8, drop: s(3) + 2.7, go: s(7) + 0.9, imp: s(7) + 3.0, pop3: s(14) + 1.3, ruthIn: s(17), give: s(18) + 0.2, clean: s(18) + 2.05, reach: s(20) + 1.35, crumble: s(22) + 0.28, end: ctx.dur };
}

// ---- helpers ----
const armLen = (c) => { if (!c._alen) { c.reset(); c.root.updateMatrixWorld(true); const r = c.root.rotation.clone(), p = c.root.position.clone(); c.root.rotation.set(0, 0, 0); c.root.position.set(0, 0, 0); c.root.updateMatrixWorld(true); const sh = c.arms[0].getWorldPosition(v3()), bx = new THREE.Box3().setFromObject(c.arms[0]); c._alen = sh.y - bx.min.y - 0.25; c.root.rotation.copy(r); c.root.position.copy(p); } return c._alen; };
const handOf = (c, side) => { c.root.updateMatrixWorld(true); return c.arms[side].localToWorld(v3(0, -armLen(c), 0.12)); };
function rs(c) { c.reset(); c.knee?.forEach((k) => k.rotation.set(0, 0, 0)); c.elbow?.forEach((k) => k.rotation.set(0, 0, 0)); c.root.rotation.set(0, 0, 0); c.root.scale.setScalar(c._sc || 1); }
function place(c, p, yaw) { c.root.visible = true; rs(c); c.root.position.copy(p); c.root.rotation.y = yaw; }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
function face(c, name, t, ph = 0.3, o = {}) { c.setFace(name, { blink: o.noBlink ? false : blinkAt(t, ph), viseme: o.viseme }); }
const talk = (i, t) => (t > L(i).start && t < L(i).end ? visemeAt(L(i).text, L(i).start, L(i).end, t) : undefined);
const H = (c) => c.neck.getWorldPosition(v3()).add(v3(0, 0.8, 0));
function path(keys, t) { if (t <= keys[0][0]) return { p: keys[0][1].clone(), walking: false, yaw: keys[0][2] ?? null }; for (let i = 0; i < keys.length - 1; i++) { const [a, pa, ya] = keys[i], [b, pb] = keys[i + 1]; if (t < b) { if (pa.distanceTo(pb) < 0.01) return { p: pa.clone(), walking: false, yaw: ya ?? null }; const u = clamp((t - a) / (b - a)); return { p: lp3(pa, pb, smooth(0, 1, u) * 0.3 + u * 0.7), walking: true, yaw: yawTo(pa, pb) }; } } const k = keys[keys.length - 1]; return { p: k[1].clone(), walking: false, yaw: k[2] ?? null }; }
function sit(c, p, yaw, seatY) { place(c, p, yaw); c.hips.position.y = seatY + 0.42; c.legs.forEach((l, i) => { l.rotation.x = -1.5; c.knee[i].rotation.x = 1.5; }); }
const fwOf = (yaw) => v3(Math.sin(yaw), 0, Math.cos(yaw));
const sdOf = (yaw) => v3(Math.cos(yaw), 0, -Math.sin(yaw));

// the cheek and the back of the hand, as parts-local spots for the hero flowers
function onHand(m, c, side, along = 0.3) { const e = c.elbow[side], bx = new THREE.Box3(); c.root.updateMatrixWorld(true); e.children.forEach((k) => { if (k.isMesh) { k.geometry.computeBoundingBox(); const b = k.geometry.boundingBox.clone(); b.translate(k.position); bx.union(b); } }); m.position.set((bx.min.x + bx.max.x) / 2, bx.min.y + along, bx.max.z + 0.02); m.rotation.x = Math.PI / 2; e.add(m); return m; }
function onCheek(m, c, s = -1) { const hb = new THREE.Box3(); c.root.updateMatrixWorld(true); c.headParts.forEach((q) => hb.expandByObject(q)); const hc = hb.getCenter(v3()), sz = hb.getSize(v3()), lw = c.head.worldToLocal(v3(hc.x + s * sz.x * 0.47, hb.min.y + sz.y * 0.36, hb.max.z - 0.12)); m.position.copy(lw); m.quaternion.setFromUnitVectors(v3(0, 1, 0), v3(s * 0.55, 0, 0.84).normalize()); c.head.add(m); return m; }

// ---- people ----
function people() {
  const mk = (k) => { const [avatar, skin] = AV[k], c = makeCharacter({ avatar, alti: true, skin, caustic: false }); ctx.scene.add(c.root); c.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); jointify(c); c._sc = SCALE[k] || 1; c.root.visible = false; rs(c); c.root.updateMatrixWorld(true); armLen(c); return c; };
  for (const k of Object.keys(AV)) W[k] = mk(k);
  W.all = Object.keys(AV).map((k) => W[k]);
  { const c = W.ruth, box = new THREE.Box3(); c.headParts.forEach((m) => { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); }); const cz = (box.min.z + box.max.z) / 2, Hh = box.max.y - box.min.y, top = box.min.y + Hh * 0.8, hx = (box.max.x - box.min.x) / 2, cx = (box.min.x + box.max.x) / 2; c.head.traverse((m) => { if (!m.isMesh || c.headParts.includes(m) || m === c.faceSheet) return; if (/glass/i.test(m.name + ' ' + (m.material?.name || '')) || (m.geometry.boundingBox || (m.geometry.computeBoundingBox(), m.geometry.boundingBox)).getSize(v3()).y < Hh * 0.4) { m.visible = false; return; } const g = m.geometry.clone(), q = g.attributes.position, n = g.index ? g.index.count : q.count, keep = [], inBox = (i) => q.getZ(i) > cz && q.getY(i) < top && Math.abs(q.getX(i) - cx) < hx * 1.4; for (let i = 0; i < n; i += 3) { const v = g.index ? [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)] : [i, i + 1, i + 2]; if (!v.some(inBox)) keep.push(...v); } g.setIndex(keep); m.geometry = g; }); }
  // his flowers and hers: sampled at rest, before any pose
  W.hB = skinBlooms(W.hollis, { count: 430, kinds: [['dahlia', 1]], size: [0.42, 0.8], seed: 5, gap: 0.075, faceX: 0.47, faceTop: 0.05, faceSide: 0.2 });
  W.rB = skinBlooms(W.ruth, { count: 170, kinds: [['dahlia', 3], ['thistle', 1]], size: [0.36, 0.62], seed: 8, gap: 0.09, faceX: 0.5, faceTop: 0.0, faceSide: 0.2, skip: (q) => q.y < 3.4 });
  // the hero flowers
  W.f0 = onHand(flowerMesh('buttercup', 0.9, '#ff8fbc'), W.shover, 0, 0.42);
  W.f1 = onHand(flowerMesh('buttercup', 0.95), W.jake, 0, 0.3);
  W.f2 = onCheek(flowerMesh('thistle', 1.1), W.oliver, -1);
  W.f3 = onHand(flowerMesh('buttercup', 0.95), W.nell, 0, 0.3);
  W.fBig = onHand(flowerMesh('dahlia', 1.15), W.hollis, 0, 0.32); W.fBig.material = W.fBig.material.clone(); W.fBig.material.color.set('#c9b0d0');
  for (const f of [W.f0, W.f1, W.f2, W.f3, W.fBig]) f.userData.base = f.scale.x;
  // the falling thistle
  W.fall = flowerMesh('thistle', 1.1); W.fall.visible = false; ctx.scene.add(W.fall);
  W.hat = partyHat(); { const c = W.mia, hb = new THREE.Box3(); c.root.updateMatrixWorld(true); c.headParts.forEach((q) => hb.expandByObject(q)); W.hat.position.copy(c.head.worldToLocal(v3(0, hb.max.y + 0.42, 0))); c.head.add(W.hat); }
  // his right sleeve: a shell over the forearm that folds back, the skin and the roots under it
  { const c = W.hollis, e = c.elbow[0], bx = new THREE.Box3(); W.lowArm = []; e.children.forEach((k) => { if (k.isMesh) { k.geometry.computeBoundingBox(); const b = k.geometry.boundingBox.clone(); b.translate(k.position); bx.union(b); W.lowArm.push(k); k.userData.mat0 = k.material; } });
    const sz = bx.getSize(v3()), cx = (bx.min.x + bx.max.x) / 2, cz = (bx.min.z + bx.max.z) / 2, armH = sz.y; W.skinMat = new THREE.MeshStandardMaterial({ color: '#d9b08e', roughness: 0.7 });
    const sl = new THREE.Group(); sl.position.set(cx, bx.max.y, cz); const body = new THREE.Mesh(new THREE.BoxGeometry(sz.x * 1.03, 1, sz.z * 1.03).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: '#6b4728', roughness: 0.9 })); body.scale.y = armH * 0.82; sl.add(body); const band = new THREE.Mesh(new THREE.BoxGeometry(sz.x * 1.2, 0.42, sz.z * 1.2), new THREE.MeshStandardMaterial({ color: '#80562f', roughness: 0.85 })); sl.add(band); e.add(sl); sl.visible = false; W.sleeve = { sl, body, band, H: armH * 0.82 };
    const r = rng(77), root = new THREE.MeshStandardMaterial({ color: '#2a1534', roughness: 0.65 }), g = new THREE.Group(); for (let i = 0; i < 16; i++) { const x0 = cx + (r() - 0.5) * sz.x * 0.86, y0 = bx.max.y - armH * (0.28 + r() * 0.5), z = bx.max.z, x1 = x0 + (r() - 0.5) * 0.4, y1 = y0 - 0.35 - r() * 0.3, c2 = new THREE.CatmullRomCurve3([v3(x0, y0 + 0.18, z + 0.12), v3(x0 + (x1 - x0) * 0.4, (y0 + y1) / 2, z + 0.06), v3(x1, y1 + 0.05, z + 0.01), v3(x1, y1 - 0.05, z - 0.3)]); g.add(new THREE.Mesh(new THREE.TubeGeometry(c2, 12, 0.016 + r() * 0.016, 6), root)); } g.visible = false; e.add(g); W.roots = g; }
}
const lower = (item) => item.m.parent === W.hollis.elbow[0];

// ---- the bits of street life ----
function poseStreet(t) {
  const s = (i) => L(i).start, c0 = W.shover, c1 = W.pushed, E = EV; const on = t < s(4);
  if (on) {
    // a shove
    const a = v3(18, ST, 42), b = v3(21.4, ST, 42), push = smooth(E.shove - 0.12, E.shove + 0.08, t); place(c0, a, Math.PI / 2 + 0.05); pose(c0, 'idle', t); c0.torso.rotation.x = push * 0.25 - smooth(E.pop0, E.pop0 + 0.5, t) * 0.25; aimArm(c0, 0, b.clone().add(v3(0, 3.0, 0)), push * (1 - smooth(E.pop0 + 0.1, E.pop0 + 0.6, t) * 0.25)); aimArm(c0, 1, b.clone().add(v3(0, 3.0, 0.8)), push * (1 - smooth(E.pop0, E.pop0 + 0.5, t))); c0.neck.rotation.y = 0; c0.neck.rotation.x = smooth(E.pop0 + 0.1, E.pop0 + 0.35, t) * 0.4; face(c0, t < E.pop0 ? 'smirk' : 'shocked', t, 0.2);
    const hit = smooth(E.shove + 0.02, E.shove + 0.25, t); place(c1, b.clone().add(v3(hit * 1.6, 0, 0)), -Math.PI / 2 - 0.05); pose(c1, 'idle', t); c1.torso.rotation.x = -hit * 0.28; c1.arms.forEach((ar, i) => { ar.rotation.z += (i ? 1 : -1) * hit * 0.5; }); face(c1, t < E.shove ? 'neutral' : 'cry', t, 0.5); if (t >= s(1) - 0.06) { c0.root.visible = false; c1.root.visible = false; }
    // the forgotten birthday: Mia and her cake, Jake empty-handed
    const m = v3(40.5, ST, 40), j = v3(40.5, ST, 45.2); place(W.mia, m, 0); pose(W.mia, 'idle', t); W.mia.arms[0].rotation.x = -0.15; const met = smooth(s(1) - 0.2, s(1) + 0.5, t); W.mia.neck.rotation.x = 0; face(W.mia, t < s(1) + 0.95 ? 'happy' : 'sad', t, 0.4);
    place(W.jake, j.clone().add(v3(0, 0, (1 - met) * 2.5)), Math.PI); pose(W.jake, met < 1 ? 'walk' : 'idle', t); const up = smooth(E.pop1 - 0.75, E.pop1 - 0.25, t); if (met >= 1) { aimArm(W.jake, 0, H(W.jake).add(v3(2.0, -1.7, -1.3)), up); W.jake.neck.rotation.x = up * 0.55; W.jake.neck.rotation.y = up * 0.2; } face(W.jake, t < s(1) + 1.15 ? 'happy' : t < E.pop1 ? 'nervous' : 'shocked', t, 0.2);
    // the broken heart, on a bench by the pavement
    const seat = v3(70, ST, 49.6), oliverOut = t < E.drop - 1.6; sit(W.sue, seat, Math.PI, W.bSeat); W.sue.arms.forEach((a0, i) => { a0.rotation.x = -0.55; a0.rotation.z = (i ? -0.1 : 0.1); }); W.sue.neck.rotation.x = 0.26 * (1 - smooth(E.drop - 0.5, E.drop + 0.1, t)); face(W.sue, t < E.drop - 0.5 ? 'cry' : 'happy', t, 0.3);
    const away = smooth(s(2) + 0.1, s(2) + 0.55, t), back = smooth(s(3) - 0.3, s(3) + 0.8, t), op = v3(lerp(lerp(72.6, 74.5, away), 72.2, back), ST, 46.0); place(W.oliver, op, lerp(lerp(-0.6, Math.PI / 2 + 0.4, away), -0.45, back)); pose(W.oliver, 'idle', t); const tch = 0; aimArm(W.oliver, 0, H(W.oliver).add(v3(0, -0.4, 0)).addScaledVector(fwOf(W.oliver.root.rotation.y), 1.4).addScaledVector(sdOf(W.oliver.root.rotation.y), -0.4), tch); if (back > 0.9) W.oliver.neck.rotation.x = 0.12; face(W.oliver, t < s(2) + 0.4 ? 'sad' : t < E.pop2 ? 'smug' : t < s(3) ? 'shocked' : t < E.drop ? 'sad' : 'happy', t, 0.6);
  } else [c0, c1, W.mia, W.jake, W.sue, W.oliver].forEach((c) => { c.root.visible = false; });
  W.table.visible = on; W.bench2.visible = on;
  W.f0.scale.setScalar(W.f0.userData.base * popK(t, E.pop0)); W.f1.scale.setScalar(W.f1.userData.base * popK(t, E.pop1));
  const stem = t < E.drop; W.f2.visible = stem; W.f2.scale.setScalar(W.f2.userData.base * popK(t, E.pop2));
  W.fall.visible = !stem && t < s(4); if (W.fall.visible) { W.oliver.root.updateMatrixWorld(true); const start = W.f2Drop, d = t - E.drop; W.fall.position.set(start.x + Math.sin(d * 3) * 0.3, Math.max(ST + 0.3, start.y - 3.4 * d * d), start.z); W.fall.rotation.x = d * 3; }
  // the baker waves from the shop door; people walk the far pavement
  if (t >= s(7) - 0.1 && t < E.imp + 0.6) { const c = W.neighbor; place(c, v3(6.4, ST, 33.2), -Math.PI / 2); pose(c, 'idle', t); const look = smooth(E.go + 0.5, E.go + 0.8, t); c.neck.rotation.y = -look * 0.9; aimArm(c, 0, v3(2.8, ST + 3.5, 33.2), 1 - smooth(E.go + 0.3, E.go + 0.6, t)); face(c, t > E.go + 0.55 ? 'shocked' : 'happy', t, 0.3); } else if (t < s(24)) W.neighbor.root.visible = false;
  if (t >= s(6) - 0.15 && t < s(7) - 0.1) { const a = v3(3.0, ST, 33.8), b = v3(7, ST, 47), u = clamp((t - (s(6) - 0.15)) / 1.7), p = lp3(a, b, u), yw = yawTo(a, b); place(W.mom, p, yw); pose(W.mom, 'walk', t * 1.3); W.mom.neck.rotation.y = 0.75; face(W.mom, 'scared', t, 0.2); const kp = p.clone().add(v3(1.4, 0, -2.0)); place(W.kid, kp, yw); pose(W.kid, 'walk', t * 1.5); W.kid.neck.rotation.y = -0.6; aimArm(W.mom, 1, W.kid.root.position.clone().add(v3(0, 3.4, 0)), 0.85); face(W.kid, 'surprised', t, 0.5); } else if (t < s(24)) { W.mom.root.visible = false; W.kid.root.visible = false; }
  const baker = W.baker; if (t > s(4) - 0.3 && t < s(5)) { place(baker, v3(-31, ST, 51), Math.PI + 0.35); pose(baker, 'wave', t); face(baker, 'happy', t, 0.4); } else if (t < 59) baker.root.visible = false;
  const walk = (c, a, b, ph) => { const u = (t * 0.018 + ph) % 1, p = lp3(a, b, u); place(c, p, yawTo(a, b)); pose(c, 'walk', t + ph * 7); face(c, 'happy', t, ph); };
  if (t < s(4)) { walk(W.maya, v3(44, ST, 50), v3(-6, ST, 50), 0.3); walk(W.eli, v3(-30, ST, 34), v3(44, ST, 34), 0.2); } else if (t < 59) { W.maya.root.visible = false; W.eli.root.visible = false; }
}

// ---- Nell ----
const CART0 = v3(-6, ST, 33), BARL = 4.3;
function cartAt(t) {
  const E = EV, T = E.imp - E.go, a = 2 * 23 / (T * T), z0 = 33, g = W.cartG; let z = z0, ptch = 0, roll = 0;
  if (t < EV.go) z = z0; else if (t < E.imp) z = z0 - 0.5 * a * (t - E.go) * (t - E.go); else z = 10;
  const onRamp = z < 30 && z > 14, slope = onRamp ? -Math.atan2(ST, 16) : 0;
  ptch = slope;
  if (t >= E.imp) { const d = t - E.imp, kick = d < 0.16 ? d / 0.16 : Math.exp(-(d - 0.16) * 5) * Math.cos((d - 0.16) * 11) * 0.3 + 0.7 * (1 - Math.exp(-(d - 0.16) * 8)) * 0.5 + 0.35; ptch = -0.56 * clamp(kick, 0, 1.15); roll = Math.sin(d * 9) * Math.exp(-d * 4) * 0.08; }
  g.position.set(-6, laneY(z), z); g.rotation.set(ptch, 0, roll); W.cartPivot.position.set(0, 0.0, 0);
  if (t >= E.imp) { const p = g.position; p.y = 0; const c = Math.cos(ptch), s = Math.sin(ptch); p.y = 0.75 + (-0.75) * c - 2 * s; p.z = (z - 2) + (-0.75) * s + 2 * c; }
  W.cart.spin(-(z0 - z) / 0.75);
  return z;
}
const NEARBAR = (y = 3.2) => W.cartG.localToWorld(v3(0, y, 4.5));
function poseNell(t) {
  const c = W.nell, s = (i) => L(i).start, E = EV;
  c.root.visible = false;
  if (t > s(4) - 0.2 && t < s(5)) {
    // pushing the cart along the street, past the shop
    const u = (t - (s(4) - 0.2)) / (s(5) - s(4) + 0.2), x = lerp(-46, -22, u), p = v3(x, ST, 43); place(c, p, Math.PI / 2); pose(c, 'walk', t * 0.92);
    W.cartG.position.set(x + 7.3, ST, 43); W.cartG.rotation.set(0, Math.PI / 2 - Math.PI, 0); W.cart.spin(x * 1.3);
    W.cartG.rotation.y = -Math.PI / 2; W.cartG.updateMatrixWorld(true); for (const k of [0, 1]) { const q = W.cartG.localToWorld(v3(k ? 1.1 : -1.1, 3.25, 4.65)); aimArm(c, k, q, 1); }
    const look = smooth(s(4) + 1.0, s(4) + 1.4, t) * (1 - smooth(s(5) - 0.5, s(5) - 0.1, t)); c.neck.rotation.y = look * 0.5; face(c, 'happy', t, 0.3); return;
  }
  if (t >= s(5) - 0.05 && t < s(7) - 0.1) { W.cartG.visible = false; return; }
  W.cartG.visible = t >= s(7) - 0.1 && t < s(25 > 24 ? 24 : 24);
  if (t >= s(7) - 0.1 && t < s(12) - 0.1) {
    const zc = cartAt(t), A = v3(-0.8, ST, 33.2), RUN = [[E.go + 0.72, A], [E.imp - 0.1, v3(-6.2, laneY(30), 30.2)], [s(8) - 0.05, v3(-9.1, 0, 14.4)], [ctx.dur, v3(-9.1, 0, 14.4)]];
    let r = path(RUN, t); r.p.y = laneY(r.p.z); if (r.p.z < 14.2) r.p.y = 0;
    const running = t > E.go + 0.72 && t < s(8) - 0.05;
    place(c, r.p, running ? r.yaw : t < E.go + 0.72 ? Math.PI / 2 : Math.PI / 2 + 0.1); pose(c, running ? 'run' : 'idle', t); if (running) { }
    if (t < E.go + 0.5) { const mid = v3(2.8, ST + 3.5, 33.2); aimArm(c, 0, mid, 1); }
    const whip = smooth(E.go + 0.42, E.go + 0.65, t); if (t < E.go + 0.72) c.neck.rotation.y = whip * 1.3;
    if (t >= s(8) - 0.05 && t < s(9)) { for (const k of [0, 1]) aimArm(c, k, H(c).add(v3(1.7, -1.3, k ? -0.95 : 0.95)), 1); c.torso.rotation.x = 0.1; c.neck.rotation.y = 0.15; }
    if (t >= s(9) && t < s(10)) { const k = smooth(s(9), s(9) + 0.3, t) * (1 - smooth(s(10) - 0.2, s(10) + 0.1, t)); const h = H(c); [0, 1].forEach((i) => aimArm(c, i, h.clone().add(v3((i ? 1 : -1) * 0.65, -1.9 + Math.sin((t - s(9)) * 4 + i) * 0.22, 2.6).applyAxisAngle(v3(0, 1, 0), c.root.rotation.y)), k)); c.neck.rotation.x = k * 0.35; }
    if (t >= s(10)) { c.root.rotation.y = lerp(c.root.rotation.y, Math.PI / 2, 0.8); c.neck.rotation.y = 0; }
    if (t >= s(11)) { const w = smooth(s(11) + 0.8, s(11) + 1.6, t); c.neck.rotation.y = -0.65 * w; }
    const fc = t < E.go + 0.5 ? 'happy' : t < s(9) ? 'shocked' : t < s(10) ? 'nervous' : t < s(11) ? 'surprised' : 'sad';
    face(c, fc, t, 0.3, { viseme: talk(8, t) }); return;
  }
  W.cartG.visible = false;
  if (t >= s(12) - 0.1 && t < s(23) - 0.05) {
    const A = BENCH.clone().add(v3(-5.2, 0, 8.2)), B = BENCH.clone().add(v3(-3.9, 0, 5.3)), r = path([[s(12) - 0.1, A], [s(12) + 1.5, B], [ctx.dur, B]], t); const yw = yawTo(r.p, W.hollis.root.position); place(c, r.p, yw); pose(c, r.walking ? 'walk' : 'idle', t);
    if (t < s(13) - 0.05 && t > s(12)) { aimArm(c, 1, c.root.position.clone().add(v3(1.9, 3.1, -0.6)), 1); }
    // the loaf basket stays on her arm through the walk; a hand to her mouth after the question
    const mouth = 0; if (mouth > 0) aimArm(c, 1, H(c).add(v3(0, -0.5, 0)).addScaledVector(fwOf(yw), 1.2), mouth);
    const hand = smooth(E.pop3 - 0.7, E.pop3 - 0.3, t) * (1 - smooth(s(15) + 0.2, s(15) + 0.6, t)); if (hand > 0) { aimArm(c, 0, H(c).add(v3(0, -1.3, 0)).addScaledVector(fwOf(yw), 2.0).addScaledVector(sdOf(yw), 0.5), hand); c.neck.rotation.x = hand * 0.2; }
    // reach out and touch the dahlia
    const tk = smooth(E.reach - 0.95, E.reach - 0.1, t) * (1 - smooth(s(22) + 1.2, s(22) + 1.7, t)); if (tk > 0) { aimArm(c, 0, W.fBigP, tk); c.neck.rotation.x = tk * 0.2; c.torso.rotation.x = tk * 0.2; }
    if (t > s(16) && t < s(20)) c.neck.rotation.x = 0.14;
    const fc = t < s(13) ? 'neutral' : t < s(14) ? 'nervous' : t < s(15) ? 'shocked' : t < s(16) ? 'nervous' : t < s(17) ? 'surprised' : t < s(19) ? 'sad' : t < s(21) ? 'sad' : t < s(22) ? 'happy' : t < s(23) ? 'surprised' : 'happy';
    face(c, fc, t, 0.3, { viseme: talk(13, t) || talk(21, t) }); return;
  }
  if (t >= s(23) - 0.05 && t < s(24)) { const r = path([[s(23) - 0.05, BENCH.clone().add(v3(-3.9, 0, 5.3))], [s(23) + 0.3, v3(-3, 0, 16)], [s(24) - 0.05, v3(-6, ST, 32)], [ctx.dur, v3(-6, ST, 32)]], t); r.p.y = laneY(r.p.z); if (r.p.z < 14.2) r.p.y = 0; place(c, r.p, r.yaw ?? 0); pose(c, 'run', t); face(c, 'laugh', t, 0.3); return; }
  c.root.visible = false;
}

// ---- Mr. Hollis ----
const hSeat = () => BENCH.clone().add(v3(0.6, 0, 0.3));
function poseHollis(t) {
  const c = W.hollis, s = (i) => L(i).start, E = EV;
  c.root.visible = false;
  if (t < s(5) - 0.1 || (t >= s(7) - 0.1 && t < s(9) + 0.5)) return;
  if (t < s(7) - 0.1) { place(c, v3(-5.2, laneY(28.5), 28.5), Math.PI * 0.08 + Math.PI * 0.0); pose(c, 'idle', t); c.neck.rotation.y = -0.1; c.neck.rotation.x = 0.08; face(c, 'neutral', t, 0.5); return; }
  if (t < s(12) - 0.1) {
    const A = v3(-2.6, 0, 14.4), B = v3(13, 0, 21), r = path([[s(9) + 0.5, v3(0.2, 0, 18)], [s(10) - 0.2, A], [s(11) + 0.75, A, Math.PI], [s(12) - 0.1, B]], t); place(c, r.p, r.walking ? r.yaw : (t < s(10) + 2 ? -Math.PI / 2 : r.yaw ?? -Math.PI / 2)); pose(c, r.walking ? 'walk' : 'idle', t * 0.82);
    if (!r.walking) c.neck.rotation.x = 0.1; face(c, t > s(11) + 0.4 ? 'sad' : 'neutral', t, 0.45, { viseme: talk(10, t) }); return;
  }
  if (t < s(17) - 0.05 || t >= s(19) - 0.05) {
    // on the bench
    sit(c, hSeat(), 0, W.seatY); c.arms[1].rotation.x = -0.82; c.arms[1].rotation.z = -0.06;
    const hold = t > s(16) - 0.1;
    if (hold) { const k = smooth(s(16) - 0.1, s(16) + 0.8, t); aimArm(c, 0, W.hSeat, k); } else c.arms[0].rotation.x = -0.82;
    c.neck.rotation.x = t < s(19) ? 0.1 : 0.16;
    const late = t > s(19) && t < E.reach; const fc = t < s(15) ? 'neutral' : t < s(16) ? 'sad' : t < s(19) ? 'sad' : t < E.crumble ? 'sad' : t < s(23) ? 'shocked' : t < s(24) ? 'sad' : 'happy';
    face(c, fc, t, 0.45, { viseme: talk(15, t) }); return;
  }
  if (t >= s(17) && t < s(19) - 0.05) { place(c, RM.clone().add(v3(5.8, 0, -3.2)), -Math.PI / 2 + 0.0); pose(c, 'idle', t); c.torso.rotation.x = 0.14; c.neck.rotation.x = 0.12; aimArm(c, 0, W.ruthHand, smooth(s(18) - 0.2, s(18) + 0.2, t)); face(c, 'sad', t, 0.5); }
}
function poseRuth(t) {
  const c = W.ruth, s = (i) => L(i).start; c.root.visible = false; W.visitor.root.visible = false;
  if (t < s(17) - 0.05 || t >= s(19) - 0.05) return;
  const bed = RM.clone().add(v3(0, 0, -4)); place(c, bed.clone().add(v3(0, 0, -3.6)), 0); c.hips.position.y = W.bed.top + 0.42; c.legs.forEach((l) => { l.rotation.x = -1.5; }); c.torso.rotation.x = -0.03; c.neck.rotation.x = 0;
  c.arms.forEach((a0, i) => { a0.rotation.x = -0.65; a0.rotation.z = i ? -0.14 : 0.14; });
  const yell = t < s(18); if (yell) { const p0 = W.visitor.root.position.clone().add(v3(0, 4.2, 0)); aimArm(c, 0, p0, smooth(s(17) - 0.05, s(17) + 0.25, t)); c.torso.rotation.y = -0.2; c.neck.rotation.y = -0.45; } else { const k = smooth(s(18) - 0.2, s(18) + 0.3, t); W.ruthHand.copy(RM).add(v3(2.8, 4.1, -4.9)); aimArm(c, 1, W.ruthHand, k); c.neck.rotation.y = 0.5 * (1 - smooth(E_CLEAN(), E_CLEAN() + 0.6, t)); }
  const fc = t < s(18) ? (Math.sin(t * 3.2) > -0.2 ? 'fury' : 'pain') : t < E_CLEAN() ? 'pain' : 'sleepy'; c.setFace(fc, { blink: t >= E_CLEAN() ? true : blinkAt(t, 0.4), viseme: t < s(18) && Math.sin(t * 3.2) > -0.2 ? 'A' : undefined });
  if (t < s(18) + 0.2) { place(W.visitor, RM.clone().add(v3(-6.4 - smooth(s(17) + 1.3, s(17) + 2.6, t) * 1.5, 0, -2.4)), Math.PI / 2 + 0.12); pose(W.visitor, 'idle', t); W.visitor.torso.rotation.x = -0.1 * smooth(s(17) + 0.8, s(17) + 1.2, t); aimArm(W.visitor, 0, W.visitor.root.position.clone().add(v3(2.2, 3.4, 0.4)), 1); face(W.visitor, t < s(17) + 0.5 ? 'nervous' : 'cry', t, 0.5); W.bouquet.visible = true; const h = handOf(W.visitor, 0); W.bouquet.position.copy(h); } else W.bouquet.visible = false;
}
const E_CLEAN = () => EV.clean;

// flower scales for both
function blooms(t) {
  const s = (i) => L(i).start, E = EV, gate = t >= s(16) - 0.05 && t < s(17) - 0.05, fold = gate ? smooth(s(16) + 1.05, s(16) + 2.0, t) : 1, flash = t >= s(17) && t < s(19) - 0.05, final = t > s(24);
  W.fBig.visible = t >= s(5) - 0.1 && !(t > E.crumble + 0.42) && !flash;
  W.fBig.scale.setScalar(W.fBig.userData.base * (t > E.crumble ? clamp(1 - (t - E.crumble) / 0.42) : 1));
  const N = W.rB.items.length, ne = W.hB.items.length;
  W.hB.apply((w, i) => {
    if (flash) { if (i >= N) return t > E.give + 1.9 ? popK(t, E.give + 1.8 + (i - N) / (ne - N) * 0.9, 0.2) : 0; const at = E.give + (i / N) * 1.5 + 0.55; return popK(t, at, 0.22); }
    if (gate && lower(w)) { return fold <= 0 ? 0 : popK(fold * 4, (w.y / 9) * 2, 0.5); }
    if (final) { const gone = ((t - s(24)) / 3.6); if ((i / ne) < gone * 0.62) return 0; }
    return 1;
  });
  if (flash) W.rB.apply((w, i) => { const pop = popK(t, s(17) + 0.2 + (i / N) * 2.8, 0.3), at = E.give + (i / N) * 1.5; return t < at ? pop : 0; });
  // the flowers fly from her to him
  W.fly.visible = flash && t > E.give - 0.05 && t < E.give + 2.6;
  if (W.fly.visible) { const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = v3(), A = v3(), B = v3(), P0 = v3(); W.rB.items.forEach((w, i) => { const at = E.give + (i / N) * 1.5, u = clamp((t - at) / 0.55); if (u <= 0 || u >= 1) { M.makeScale(0, 0, 0); W.fly.setMatrixAt(i, M); return; } W.rB.worldOf(w, A); W.hB.worldOf(W.hB.items[i], B); P0.lerpVectors(A, B, easeInOut(u)); P0.y += Math.sin(u * Math.PI) * 1.4; Q.setFromEuler(new THREE.Euler(u * 7 + i, i, u * 5)); M.compose(P0, Q, S.setScalar(0.5)); W.fly.setMatrixAt(i, M); }); W.fly.instanceMatrix.needsUpdate = true; }
  W.f3.visible = t >= E.pop3; W.f3.scale.setScalar(W.f3.userData.base * popK(t, E.pop3) * (1 - smooth(s(19) + 0.5, s(19) + 1.1, t)));
}

// ---- the queue at the end ----
function poseQueue(t) {
  const list = ['neighbor', 'baker', 'mom', 'kid', 'jake', 'mia', 'oliver', 'sue', 'shover', 'pushed', 'nia', 'omar', 'maya', 'eli', 'visitor'], s = (i) => L(i).start;
  if (t < s(24)) return;
  const pts = [BENCH.clone().add(v3(-2.1, 0, 5.8)), v3(4, 0, 21.5), v3(-1.5, 0, 20.5), v3(-6, 0, 14.6), v3(-6, ST, 30), v3(-6, ST, 34), v3(4, ST, 34.6), v3(24, ST, 34.6), v3(50, ST, 34.6)];
  const seg = []; let tot = 0; for (let i = 0; i < pts.length - 1; i++) { const d = pts[i].distanceTo(pts[i + 1]); seg.push([tot, tot + d, pts[i], pts[i + 1]]); tot += d; }
  const at = (d) => { const k = seg.find((q) => d <= q[1]) || seg[seg.length - 1], u = clamp((d - k[0]) / (k[1] - k[0])), p = lp3(k[2], k[3], u); p.y = laneY(p.z); if (p.z < 14.2 || k[2].y === 0 && k[3].y === 0) p.y = 0; if (p.z >= 30) p.y = ST; return p; };
  const shuffle = 0.4 * smooth(s(24), s(24) + 3, t);
  list.forEach((k, i) => { const c = W[k], d = i * 4.1 + (i === 0 ? 0 : 0.6) - shuffle * 1.5 * (i > 0 ? 1 : 0), p = at(Math.max(0, d)), p2 = at(Math.max(0, d - 2.2)), ry = i === 0 ? yawTo(p, W.hollis.root.position) : yawTo(p, p2); place(c, p, ry); pose(c, 'idle', t + i); const h0 = H(c); if (i === 0) { const tp = W.hSeat.clone().add(v3(0, 0.15, 0)); aimArm(c, 0, tp, smooth(s(24) + 0.3, s(24) + 1.0, t)); c.torso.rotation.x = 0.12; } c.neck.rotation.y = Math.sin(t * 0.7 + i) * 0.2; face(c, i === 3 || i === 8 ? 'happy' : 'happy', t, i * 0.13); });
}

// ---- shots ----
function shots() {
  const s = (i) => L(i).start, e = (i) => L(i).end, E = EV, Sx = [], add = (name, t0, f) => Sx.push({ name, t0: () => t0, f, t1: () => 0 });
  const y = ST;
  add('open', 0, (u) => ({ pos: lp3(v3(28, y + 9.2, 48), v3(26.2, y + 8.4, 47.4), easeInOut(u)), look: lp3(v3(-30, y + 1.5, 39), v3(-31, y + 1.8, 39), u), fov: 52 }));
  add('shove', E.shove - 0.55, (u) => ({ pos: lp3(v3(19.6, y + 3.7, 56.4), v3(19.7, y + 3.5, 54.6), u), look: v3(19.8, y + 2.3, 42), fov: 42 }));
  add('flo0', E.pop0 + 0.1, (u) => { const h = handOf(W.shover, 0), hd = H(W.shover); return { pos: h.clone().add(v3(-1.6 + u * 0.5, 1.6, 9.4 - u * 0.9)), look: h.clone().lerp(hd, 0.3), fov: 36 }; });
  add('party', s(1) - 0.04, (u) => ({ pos: lp3(v3(24, y + 4.4, 42.7), v3(26, y + 4.2, 42.6), easeOut(u)), look: v3(40.8, y + 2.6, 42.6), fov: 44 }));
  add('jakeh', E.pop1 - 1.0, (u) => { const h = H(W.jake); return { pos: h.clone().add(v3(8.6 - u * 0.6, -0.4, -3.6 + u * 0.3)), look: h.clone().add(v3(1.1, -1.3, -0.5)), fov: 36 }; });
  add('heart', s(2) - 0.04, (u) => ({ pos: lp3(v3(63, y + 4.4, 34), v3(64.4, y + 4.2, 35), easeInOut(u)), look: v3(72, y + 2.5, 47.6), fov: 46 }));
  add('thistle', E.pop2 - 0.35, (u) => { const h = H(W.oliver), ry = W.oliver.root.rotation.y, f = fwOf(ry), sd = sdOf(ry); return { pos: h.clone().addScaledVector(f, 7.2 - u * 0.5).addScaledVector(sd, -4.2).add(v3(0, -0.4, 0)), look: h.clone().add(v3(0, -0.5, 0)), fov: 36 }; });
  add('sorry', s(3) - 0.04, (u) => { const h = H(W.oliver), ry = W.oliver.root.rotation.y, f = fwOf(ry), sd = sdOf(ry); return { pos: h.clone().addScaledVector(f, 4 + u * 0.4).addScaledVector(sd, -11 + u * 0.8).add(v3(0, -0.2, 0)), look: h.clone().addScaledVector(f, 1.6).add(v3(0, -1.2, 0)), fov: 44 }; });
  add('drop', E.drop - 0.5, (u, t) => { const h = H(W.oliver), ry = W.oliver.root.rotation.y, f = fwOf(ry), sd = sdOf(ry); return { pos: h.clone().addScaledVector(f, 6.2 - u * 0.4).addScaledVector(sd, -4.8).add(v3(0, -0.4, 0)), look: h.clone().add(v3(0, -0.7 - u * 0.4, 0)), fov: 40 }; });
  add('nell1', s(4) - 0.04, (u) => ({ pos: lp3(v3(-18, y + 7.5, 25), v3(-20, y + 7.2, 26), easeInOut(u)), look: lp3(v3(-36.5, y + 2.6, 45), v3(-32, y + 2.6, 45), u), fov: 46 }));
  add('nell2', s(4) + 1.9, (u) => { const q = W.nell.root.position; return { pos: q.clone().add(v3(2.4, 8.2, -16.5)), look: q.clone().add(v3(1.6, 2.4, 0)), fov: 36 }; });
  add('hol1', s(5) - 0.04, (u) => ({ pos: lp3(v3(-5.5, y + 2.6, 44), v3(-5.5, y + 2.7, 41), easeInOut(u)), look: v3(-5.4, y + 1.5, 26), fov: 50 }));
  add('hol2', s(5) + 1.5, (u) => { const h = H(W.hollis); return { pos: h.clone().add(v3(-1.6 + u * 0.8, -1.2 + u * 1.0, 11.5 - u * 2)), look: h.clone().add(v3(0, -2.4 + u * 1.5, 0)), fov: 40 }; });
  add('avoid', s(6) - 0.04, (u) => ({ pos: lp3(v3(-15, y + 4.6, 22.5), v3(-15.4, y + 4.6, 23.5), u), look: v3(5, y + 2.2, 41), fov: 46 }));
  add('wind', s(7) - 0.05, (u) => ({ pos: lp3(v3(-3.5, y + 5.4, 52), v3(-3.8, y + 5.4, 50.6), u), look: v3(-1.6, y + 2.8, 33), fov: 50 }));
  add('rollaway', E.go + 0.72, (u, t) => { const p = W.cartG.position, z = p.z - 12; return { pos: v3(-6.8, laneY(z) + 2.2, z), look: p.clone().add(v3(0, 2.4, 0)), fov: 48 }; });
  add('crash', E.imp - 0.28, (u) => ({ pos: lp3(v3(8, 5, 26), v3(7.6, 4.9, 25.6), u), look: v3(-5.6, 3.4, 8), fov: 50 }));
  add('sorryN', s(8) - 0.03, (u) => { const h = H(W.nell); return { pos: h.clone().add(v3(8.2 - u * 0.5, 0.5, 3.2)), look: h.clone().add(v3(0.3, -1.3, 0)), fov: 42 }; });
  add('arms', s(9) - 0.05, (u) => { const h = H(W.nell); return { pos: h.clone().add(v3(8.2 - u * 0.5, 2.4, 3.6)), look: h.clone().add(v3(1.2, -1.8, 0)), fov: 42 }; });
  add('glass', s(10) - 0.05, (u) => { const h = H(W.hollis), ry = W.hollis.root.rotation.y, f = fwOf(ry), sd = sdOf(ry); return { pos: h.clone().addScaledVector(f, 8 - u * 0.5).addScaledVector(sd, 3).add(v3(0, -0.6, 0)), look: h.clone().add(v3(0, -1.1, 0)), fov: 40 }; });
  add('two', s(11) - 0.05, (u) => ({ pos: lp3(v3(-7, 5.4, 34), v3(-7, 5.2, 32.4), u), look: v3(-6, 2.9, 11), fov: 44 }));
  add('dead', s(11) + 2.0, (u) => ({ pos: lp3(v3(-11.4, 4.4, -6.4), v3(-10.9, 4.3, -3.6), easeInOut(u)), look: v3(-9.4, 3.6, 8), fov: 58 }));
  add('week', s(12) - 0.05, (u) => ({ pos: lp3(v3(25, 4.2, 28.5), v3(24, 4.0, 27.5), easeInOut(u)), look: v3(8.5, 2.5, 17), fov: 46 }));
  add('ask', s(13) - 0.04, (u) => { const h = H(W.nell), ry = W.nell.root.rotation.y, f = fwOf(ry), sd = sdOf(ry); return { pos: h.clone().addScaledVector(f, 6.0 - u * 0.4).addScaledVector(sd, -6.2).add(v3(0, -0.8, 0)), look: h.clone().add(v3(0, -0.9, 0)), fov: 36 }; });
  add('thumb', E.pop3 - 0.9, (u) => { const hp = handOf(W.nell, 0), h = H(W.nell), ry = W.nell.root.rotation.y, f = fwOf(ry), sd = sdOf(ry); return { pos: h.clone().addScaledVector(f, 7.4 - u * 0.5).addScaledVector(sd, -3.4).add(v3(0, 1.2, 0)), look: hp.clone().lerp(h, 0.5), fov: 36 }; });
  add('nobody', s(15) - 0.05, (u) => { const h = H(W.hollis); return { pos: h.clone().add(v3(3.2 - u * 0.5, -0.9, 8.6 - u * 0.5)), look: h.clone().add(v3(0, -1.0, 0)), fov: 36 }; });
  add('cuffw', s(16) - 0.05, (u) => ({ pos: lp3(v3(20, 5.4, 25), v3(19, 5.2, 24), u), look: v3(10, 3.4, 16.2), fov: 44 }));
  add('cuff', s(16) + 0.95, (u) => { const h = W.hollis.elbow[0].getWorldPosition(v3()), mid = h.clone().lerp(W.hSeat, 0.42); return { pos: mid.clone().add(v3(1.9 - u * 0.4, 6.8 - u * 0.6, 2.2)), look: mid.clone().add(v3(0, -0.1, 0.08)), fov: 34 }; });
  const rm = (x, y1, z) => RM.clone().add(v3(x, y1, z));
  add('rwide', s(17) - 0.04, (u) => ({ pos: lp3(rm(-2.6, 5.4, 12), rm(-2.8, 5.2, 10.6), easeInOut(u)), look: rm(-2.8, 3.1, -4), fov: 58 }));
  add('rface', s(17) + 1.45, (u) => { const h = H(W.ruth); return { pos: h.clone().add(v3(-3.6, -0.5, 6.2 - u * 0.6)), look: h.clone().add(v3(0.05, -0.7, 0)), fov: 36 }; });
  add('hit', s(17) + 2.55, (u) => { const h = H(W.visitor); return { pos: h.clone().add(v3(2.6 + u * 0.4, -0.5, 8.2)), look: h.clone().add(v3(0.5, -1.0, 0)), fov: 38 }; });
  add('take', s(18) - 0.05, (u) => ({ pos: lp3(rm(2.2, 5.6, 12.2), rm(2.8, 5.4, 11), easeInOut(u)), look: rm(2.9, 3.6, -4), fov: 58 }));
  add('flow', s(18) + 1.3, (u) => ({ pos: lp3(rm(5.4, 4.6, 7.2), rm(4.9, 4.7, 6.3), u), look: rm(3.1, 3.8, -4.2), fov: 44 }));
  add('clean', s(18) + 2.5, (u) => { const h = H(W.ruth); return { pos: h.clone().add(v3(1.5, -1.4, 6.8 - u * 0.5)), look: h.clone().add(v3(0.05, -0.6, 0)), fov: 34 }; });
  add('his', s(19) - 0.05, (u) => ({ pos: lp3(v3(19, 4.8, 28), v3(18, 4.6, 26.6), easeInOut(u)), look: v3(10, 3.4, 15.6), fov: 46 }));
  add('touch', s(20) - 0.05, (u) => ({ pos: lp3(v3(8.2, 5.5, 30.4), v3(8.2, 5.3, 29.4), easeInOut(u)), look: v3(8.3, 3.6, 17.5), fov: 46 }));
  add('forgive', s(21) - 0.04, (u) => { const h = H(W.nell), ry = W.nell.root.rotation.y, f = fwOf(ry), sd = sdOf(ry); return { pos: h.clone().addScaledVector(f, 6.2 - u * 0.5).addScaledVector(sd, 5.4).add(v3(0, -0.8, 0)), look: h.clone().add(v3(0, -0.9, 0)), fov: 36 }; });
  add('dust', s(22) - 0.05, (u) => ({ pos: lp3(v3(8.6, 5, 28), v3(8.6, 4.8, 27), u), look: W.hSeat.clone().add(v3(0.4, 1.0, -1.5)), fov: 42 }));
  add('eyes', s(22) + 1.05, (u) => { const h = H(W.hollis); return { pos: h.clone().add(v3(-1.6, -0.7, 5.8 - u * 0.5)), look: h.clone().add(v3(0, -0.8, 0)), fov: 38 }; });
  add('run', s(23) - 0.04, (u) => ({ pos: lp3(v3(-6.2, ST + 4.6, 38), v3(-6.1, ST + 4.3, 37), u), look: v3(-6, 2.4, 18), fov: 44 }));
  add('dawn', s(24) - 0.05, (u) => ({ pos: lp3(v3(12, ST + 9, 50), v3(13, ST + 12, 52), easeInOut(u)), look: v3(-3, ST + 0.5, 24), fov: 52 }));
  add('petal', s(24) + 2.2, (u) => ({ pos: lp3(v3(14.5, 5.2, 28), v3(14, 5.0, 26.5), easeInOut(u)), look: v3(9.5, 3.6, 15.6), fov: 46 }));
  add('last', s(24) + 4.0, (u) => ({ pos: lp3(v3(22, 18, 58), v3(23, 26, 62), easeInOut(u)), look: v3(6, 3.5, 22), fov: 54 }));
  Sx.forEach((x, i) => { if (Sx[i + 1]) { const v = Sx[i + 1].t0(); x.t1 = () => v; } }); Sx[Sx.length - 1].t1 = () => ctx.dur + 1; return Sx;
}
function lerpLook(a, b, k) { return a.clone().lerp(b, k); }
const paletteAt = (t) => { const s = (i) => L(i).start; if (t >= s(17) && t < s(19) - 0.05) return ROOM; if (t >= s(24) - 0.05) return MORN; if (t >= s(12) - 0.1) return GOLD; return SUN; };

function renderAt(t) {
  const s = (i) => L(i).start, E = EV;
  applyEnv(ctx, paletteAt(t));
  const flash = t >= s(17) && t < s(19) - 0.05;
  W.room.visible = flash; W.bedG.visible = flash; W.pl.forEach((l) => { l.intensity = flash ? l.userData.I : 0; });
  W.world.forEach((o) => { o.visible = !flash; });
  W.gh.setBroken(t >= E.imp); W.gh.setBoards(t >= s(12) - 0.1);
  poseStreet(t); poseNell(t); poseHollis(t); poseRuth(t); poseQueue(t);
  for (const c of [W.ruth]) if (!flash) c.root.visible = false;
  // the sleeve is only there for its two shots
  const cuffOn = t >= s(16) - 0.05 && t < s(17) - 0.05; W.sleeve.sl.visible = cuffOn; W.roots.visible = cuffOn; W.lowArm.forEach((m) => { m.material = cuffOn ? W.skinMat : m.userData.mat0; });
  if (cuffOn) { const k = smooth(s(16) + 1.05, s(16) + 2.0, t), H0 = W.sleeve.H; W.sleeve.body.scale.y = H0 * (1 - k * 0.72); W.sleeve.band.position.y = -H0 * (1 - k * 0.72); }
  blooms(t);
  W.glass.update(t); W.dust.update(t);
  // cart bread: loaves bounce out at the hit
  W.loaves.forEach((l, i) => { const d = t - E.imp; l.visible = d > 0 && t < s(12) - 0.1; if (!l.visible) return; const v = l.userData.v, g = 26, y0 = 4.1, land = (v.y + Math.sqrt(v.y * v.y + 2 * g * (y0 - 0.32))) / g, u = Math.min(d, land); l.position.set(-6 + v.x * u, Math.max(0.32, y0 + v.y * u - 0.5 * g * u * u), 8.4 + v.z * u); l.rotation.set(u * v.z * 2.1, i * 1.3, u * v.x * 2.4); });
  W.petals.update(t);
  ctx.scene.updateMatrixWorld(true);
  let sh = shotAt(W.shots, t);
  { const dq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgchar'); if (dq) { const q = dq.split(';'), one = q[Math.round(t * 100) % q.length].split(','), c = W[one[0]]; const hp = H(c).add(v3(0, -0.2, 0)), f = c.root.rotation.y + (+one[1]) * Math.PI / 180, dist = 4.2; c.root.visible = true; sh = { ...sh, pos: hp.clone().add(v3(Math.sin(f) * dist, +one[2], Math.cos(f) * dist)), look: hp, fov: 40 }; } }
  { const cq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('dbgcam'); if (cq) { const q = cq.split(';'), o = q[Math.round(t * 100) % q.length].split(',').map(Number); sh = { ...sh, pos: v3(o[0], o[1], o[2]), look: v3(o[3], o[4], o[5]), fov: o[6] || 50 }; } }
  const jolt = t > E.imp && t < E.imp + 0.28 ? 0.5 * (1 - (t - E.imp) / 0.28) : 0;
  frame(ctx, t, sh, { steady: true, shake: jolt, shadowSpan: flash ? 22 : 60, shadows: true, black: 0 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep101', { look: 'pro', avatars: Object.values(AV).map((a) => a[0]) }); L = ctx.L; EV = events();
  await loadAlti(['neutral', 'happy', 'sad', 'smirk', 'smug', 'cry', 'shocked', 'surprised', 'nervous', 'scared', 'terrified', 'pain', 'fury', 'laugh', 'blink', 'sleepy']);
  const { scene, camera } = ctx; camera.far = 1800; camera.near = 0.2; camera.updateProjectionMatrix();
  W.world = []; const before = new Set(scene.children);
  W.town = larkspur(scene); Object.assign(W, W.town); clouds(scene, { count: 14, y: 210, spread: 1100, size: 30 });
  W.table = cakeTable(); W.table.position.set(44.8, ST, 42.7); scene.add(W.table);
  W.bench2 = gardenBench(); W.bench2.position.set(70, ST, 49.6); W.bench2.rotation.y = Math.PI; scene.add(W.bench2); W.bSeat = W.bench2.seatY; W.seatY = W.bench.seatY;
  W.bench.rotation.y = 0;
  for (const o of scene.children) if (!before.has(o)) W.world.push(o);
  W.world = W.world.filter((o) => o !== W.table && o !== W.bench2 && !o.isLight);
  W.cart = breadCart(); W.cart.rotation.y = Math.PI; W.cartPivot = new THREE.Group(); W.cartPivot.add(W.cart); W.cartG = new THREE.Group(); W.cartG.add(W.cartPivot); scene.add(W.cartG); W.world.push(W.cartG);
  { const r = rng(2); W.loaves = []; for (let i = 0; i < 9; i++) { const l = loafMesh(); l.userData.v = v3((r() - 0.5) * 16, 6 + r() * 9, -3 + r() * 11 - 1.5); scene.add(l); W.loaves.push(l); W.world.push(l); } }
  W.room = ruthRoom(); W.room.position.copy(RM); scene.add(W.room); W.bedG = new THREE.Group(); W.bedG.position.copy(RM).add(v3(0, 0, -4)); W.bed = sickBed(); W.bedG.add(W.bed); W.bedG.add(quilt()); scene.add(W.bedG);
  W.pl = []; for (const [p, c, I, d] of [[v3(10, 8, -2), '#fff2d4', 220, 34], [v3(-6, 9, 6), '#ffe0b0', 90, 40], [v3(3, 8, 8), '#ffe9d0', 60, 32]]) { const l = new THREE.PointLight(c, I, d, 1.5); l.position.copy(RM).add(p); l.userData.I = I; scene.add(l); W.pl.push(l); }
  W.bouquet = new THREE.Group(); for (let i = 0; i < 6; i++) { const m = flowerMesh(i % 2 ? 'buttercup' : 'buttercup', 0.65); m.position.set(Math.cos(i) * 0.3, 0.2 + i * 0.05, Math.sin(i) * 0.3); W.bouquet.add(m); } scene.add(W.bouquet);
  people();
  W.fly = new THREE.InstancedMesh(flowerGeo('dahlia'), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }), Math.max(1, W.rB.items.length)); W.fly.frustumCulled = false; scene.add(W.fly);
  W.ruthHand = v3(); W.hSeat = BENCH.clone().add(v3(-0.8, 2.75, 3.6));
  // his hand's flower and the first shower of petals, posed once to find where they are
  W.fBigP = v3(); poseHollis(L(19).start + 0.2); W.hollis.root.updateMatrixWorld(true); W.fBigP.copy(W.fBig.getWorldPosition(v3())).add(v3(0, 0.06, 0));
  poseStreet(0); W.oliver.root.updateMatrixWorld(true); { const c = W.oliver, back = v3(72.2, ST, 46); place(c, back, -0.45); pose(c, 'idle', 0); c.root.updateMatrixWorld(true); W.f2Drop = W.f2.getWorldPosition(v3()); }
  W.glass = glassShatter(scene, [{ t: EV.imp, c: GH.clone().add(v3(0, 3.6, 11)), n: v3(0, 0, -1), w: 9, h: 5.6, p: GH.clone().add(v3(0, 2.8, 11)), power: 1.4 }, { t: EV.imp + 0.02, c: GH.clone().add(v3(0, 3.0, 11.1)), n: v3(0, 0, 1), w: 7, h: 4, p: GH.clone().add(v3(0, 2.8, 11)), power: 0.9 }], { per: 80, floor: 0.08 }); W.world.push(W.glass);
  { const evs = [{ t: EV.crumble, p: W.fBigP.clone(), n: 90, r: 0.5, wind: v3(4.2, 1.6, 1.2), size: 0.28, spread: 0.3, life: 3.2 }]; const r = rng(5), N = W.hB.items.length, s0 = L(24).start; poseHollis(s0 + 1); W.hollis.root.updateMatrixWorld(true); const pts = []; W.hB.items.forEach((w, i) => { if (i % 3 === 0) pts.push({ w, i }); }); pts.forEach(({ w, i }) => { const p0 = W.hB.worldOf(w, v3()), at = s0 + (i / N / 0.62) * 3.6; if (at < ctx.dur) evs.push({ t: at, p: p0, n: 4, r: 0.3, wind: v3(3 + r() * 2, 1.2, 1.6), size: 0.24, life: 2.8 + r() * 1.2 }); }); W.dust = petalDust(scene, evs); W.world.push(W.dust); }
  // blossom petals in the air, on a loop so each frame is a pure function of t
  { const r = rng(14), n = 420, a = []; for (let i = 0; i < n; i++) a.push({ x: -100 + r() * 180, y: r() * 40, z: -30 + r() * 110, s: 0.14 + r() * 0.18, ph: r(), sp: 0.03 + r() * 0.04, sw: r() * 6 }); const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.7), new THREE.MeshStandardMaterial({ color: '#ffc6da', roughness: 0.75, side: THREE.DoubleSide }), n); im.frustumCulled = false; im.userData.noAO = true; scene.add(im); W.world.push(im); const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P0 = v3(), S = v3(); W.petals = im; im.update = (t) => { const windy = 1 + 1.6 * smooth(L(7).start - 0.5, L(7).start + 0.5, t) * (1 - smooth(L(9).start, L(9).start + 1.5, t)); a.forEach((q, i) => { const u = ((t * q.sp * windy + q.ph) % 1), x = q.x + u * 110; P0.set(x, ST + 26 - u * 28 + q.y * 0.7, q.z + Math.sin(t * 0.8 + q.sw) * 2.5); E.set(t * 1.3 + q.sw, t * 0.9 + q.sw, 0); Q.setFromEuler(E); M.compose(P0, Q, S.set(q.s, q.s, q.s)); im.setMatrixAt(i, M); }); im.instanceMatrix.needsUpdate = true; }; }
  W.shots = shots();
  window.__ep101 = { W, THREE, ctx };
  return expose(ctx, renderAt, L(20).start + 1.2, EV);
}
