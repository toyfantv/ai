// Episode 7 — "Every House Moves at Midnight".
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng, mat, box, wallRects, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { CAST } from '../engine/cast.js';
import { makeHouse, makeTree, mergeGroup, buildHeroHouse, textTexture, winMat } from '../engine/town.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, DAY, NIGHT } from '../engine/stage.js';
import { makeLeg, footAt, makeEye, canvasTex, glowSprite } from '../engine/props.js';

let ctx, L, EV;
const MOON = P({ ...NIGHT, sunI: 1.35, hemiI: 0.95, exposure: 1.25, sunDir: v3(-0.45, 0.65, 0.6), sunColor: '#a8b8ff', top: '#081033', horizon: '#26346a', haze: '#18224a', fogNear: 260, fogFar: 1100, win: 1.6, lamp: 2 });
const MORNING = P({ ...DAY, sunDir: v3(0.7, 0.35, 0.5), sunColor: '#ffe2b8', top: '#4a8fe0', horizon: '#ffd9b0', haze: '#f2dcc4', exposure: 1.0 });

const legMat = mat('#2b2233', { roughness: 0.5 });
const W = { near: [], far: null, hero: null };

function walkerHouse(r, idx) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const tmp = new THREE.Group(); makeHouse(tmp, 0, 0, 0, r, r() > 0.5 ? 2 : 1);
  const hg = new THREE.Group(); mergeGroup(tmp, hg); hg.position.y = 0; body.add(hg);
  const legs = []; const hips = [];
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    legs.push(makeLeg(root, 9.5, 13, 0.5, legMat)); hips.push({ local: v3(s * 6.6, 0.4, -4.5 + k * 3), s, k });
  }
  ctx.scene.add(root);
  return { root, body, legs, hips, idx };
}

function updateWalker(wk, pos, yaw, dist, bodyH, stride = 6, lift = 3, reach = 9, folded = 0) {
  wk.root.position.set(0, 0, 0);
  const fwd = v3(Math.sin(yaw), 0, Math.cos(yaw)); const side = v3(fwd.z, 0, -fwd.x);
  const ph = dist / stride;
  const bob = Math.sin(ph * Math.PI * 4) * 0.35 * (1 - folded);
  const h = lerp(bodyH, 0.6, folded) + bob;
  wk.body.position.set(pos.x, h, pos.z); wk.body.rotation.y = yaw;
  wk.body.updateMatrixWorld();
  wk.hips.forEach((hp, i) => {
    const hip = hp.local.clone().applyMatrix4(wk.body.matrixWorld);
    const out = side.clone().multiplyScalar(hp.s);
    const base = hip.clone().add(out.clone().multiplyScalar(reach * (1 - folded * 0.7))).add(fwd.clone().multiplyScalar((hp.k - 1.5) * 1.2)).setY(0);
    const phase = ph + ((hp.k + (hp.s > 0 ? 1 : 0)) % 2) * 0.5;
    const foot = folded > 0.99 ? hip.clone().add(out.clone().multiplyScalar(1.5)).setY(0.3) : footAt(base, fwd, phase, stride * (1 - folded), lift * (1 - folded));
    wk.legs[i].update(hip, foot, out);
  });
}

function buildFar(n, r) {
  const bodyG = new THREE.BoxGeometry(12, 9, 10), roofG = new THREE.ConeGeometry(9, 5, 4); roofG.rotateY(Math.PI / 4);
  const legG = new THREE.BoxGeometry(0.7, 1, 0.7);
  const bodies = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
  const roofs = new THREE.InstancedMesh(roofG, new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
  const legs = new THREE.InstancedMesh(legG, new THREE.MeshStandardMaterial({ color: '#241c2c' }), n * 4);
  const wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ color: '#ffd27a' }), n * 2);
  const pal = ['#f7b8c8', '#b8d8f7', '#c8f0c0', '#fde5a6', '#d9c6f5', '#ffcfa8', '#bfeee8'], roofsC = ['#d0605e', '#5a6fa8', '#7a5a8a', '#4f8a6a', '#b56a45'];
  const data = [];
  for (let i = 0; i < n; i++) {
    const rad = 240 + Math.pow(r(), 0.7) * 900, a0 = r() * Math.PI * 2;
    data.push({ rad, a0, w: (0.012 + r() * 0.02) * (180 / rad), ph: r() * 6, lit: r() > 0.35 });
    bodies.setColorAt(i, new THREE.Color(pal[i % pal.length])); roofs.setColorAt(i, new THREE.Color(roofsC[i % roofsC.length]));
  }
  [bodies, roofs, legs, wins].forEach((m) => { m.frustumCulled = false; ctx.scene.add(m); });
  const o = new THREE.Object3D();
  return {
    data, meshes: [bodies, roofs, legs, wins],
    update(wt, vis) {
      [bodies, roofs, legs, wins].forEach((m) => { m.visible = vis; });
      if (!vis) return;
      data.forEach((d, i) => {
        const a = d.a0 + d.w * wt; const x = Math.cos(a) * d.rad, z = Math.sin(a) * d.rad; const yaw = Math.atan2(-Math.sin(a), Math.cos(a));
        const bob = Math.sin(wt * 4 + d.ph) * 0.5; const H = 15 + bob;
        o.position.set(x, H, z); o.rotation.set(0, yaw, 0); o.scale.set(1, 1, 1); o.updateMatrix(); bodies.setMatrixAt(i, o.matrix);
        o.position.set(x, H + 7, z); o.updateMatrix(); roofs.setMatrixAt(i, o.matrix);
        for (let k = 0; k < 4; k++) {
          const sx = k < 2 ? -1 : 1, sz = k % 2 ? -1 : 1; const sw = Math.sin(wt * 4 + d.ph + k * 1.6) * 0.25;
          const lx = sx * 7, lz = sz * 4;
          o.position.set(x + Math.cos(yaw) * lx + Math.sin(yaw) * lz, (H - 4.5) / 2, z - Math.sin(yaw) * lx + Math.cos(yaw) * lz);
          o.rotation.set(sw, yaw, sx * 0.35); o.scale.set(1, H - 4.5, 1); o.updateMatrix(); legs.setMatrixAt(i * 4 + k, o.matrix);
        }
        o.rotation.set(0, yaw, 0); o.scale.set(d.lit ? 1 : 0.001, 1, 1);
        for (let k = 0; k < 2; k++) {
          o.position.set(x + Math.sin(yaw) * 5.05 + Math.cos(yaw) * (k ? 3 : -3), H + 1, z + Math.cos(yaw) * 5.05 - Math.sin(yaw) * (k ? 3 : -3));
          o.updateMatrix(); wins.setMatrixAt(i * 2 + k, o.matrix);
        }
      });
      [bodies, roofs, legs, wins].forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    },
  };
}

function buildStillHouse() {
  const g = new THREE.Group(); ctx.scene.add(g);
  const Wd = 15, D = 12, H = 13, T = 0.4; const c = mat('#d9d2e8'), roofM = mat('#4a3a5a');
  wallRects(Wd, H, [{ x0: -1.8, x1: 1.8, y0: 0, y1: 6 }]).forEach((q) => box(q.x1 - q.x0, q.y1 - q.y0, T, c, (q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, D / 2, g));
  box(Wd, H, T, c, 0, H / 2, -D / 2, g); box(T, H, D, c, -Wd / 2, H / 2, 0, g); box(T, H, D, c, Wd / 2, H / 2, 0, g);
  const dark = new THREE.MeshBasicMaterial({ color: '#030205' });
  box(Wd - 1, H - 0.6, D - 1, dark, 0, H / 2, 0, g, false).material.side = THREE.BackSide;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), roofM); roof.geometry.rotateY(Math.PI / 4); roof.geometry.translate(0, 0.5, 0);
  roof.scale.set((Wd + 2) / Math.SQRT2, 7, (D + 2) / Math.SQRT2); roof.position.y = H; roof.castShadow = true; g.add(roof);
  for (const x of [-5, 5]) box(2.6, 2.6, 0.2, new THREE.MeshBasicMaterial({ color: '#1a1420' }), x, 8.5, D / 2 + 0.15, g, false);
  box(5, 0.4, 3, mat('#cfcfd6'), 0, 0.2, D / 2 + 1.5, g);
  const pivot = new THREE.Group(); pivot.position.set(-1.8, 0, D / 2 + 0.05); g.add(pivot);
  box(3.6, 6, 0.3, mat('#5a1f2a'), 1.8, 3, 0, pivot); box(0.3, 0.3, 0.5, mat('#e8c24a'), 3.2, 3, 0.3, pivot);
  const porch = glowSprite('#ffcf80', 6, 0.9); porch.position.set(2.8, 6.8, D / 2 + 0.6); g.add(porch);
  const eye = makeEye(4.2, '#ffb020'); eye.group.position.set(0, 3.6, D / 2 - 4.6); g.add(eye.group);
  const eyeLight = new THREE.PointLight('#ffb040', 0, 60, 1.5); eyeLight.position.set(0, 4, D / 2 + 3); g.add(eyeLight);
  return { g, pivot, eye, eyeLight, doorPos: v3(0, 3, D / 2) };
}

function buildWorld() {
  const r = rng(77);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), mat('#3f7a3a')); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ctx.scene.add(ground);
  const field = new THREE.Mesh(new THREE.CircleGeometry(80, 64), mat('#5c9a4a')); field.rotation.x = -Math.PI / 2; field.position.y = 0.05; field.receiveShadow = true; ctx.scene.add(field);
  const stat = new THREE.Group();
  for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = 1000 + r() * 800; makeTree(stat, Math.cos(a) * d, Math.sin(a) * d, r); }
  for (let i = 0; i < 10; i++) { const a = r() * 6.28, d = 90 + r() * 140; makeTree(stat, Math.cos(a) * d, Math.sin(a) * d, r); }
  // morning street (far from the field)
  box(160, 0.1, 14, mat('#5d626b'), 620, 0.05, 612, stat); box(160, 0.3, 4, mat('#d4d7da'), 620, 0.15, 621, stat);
  mergeGroup(stat, ctx.scene);
  // street sign for the morning shot
  const sg = new THREE.Group(); sg.position.set(602, 0, 624); ctx.scene.add(sg);
  box(0.35, 7, 0.35, mat('#5a5f66'), 0, 3.5, 0, sg);
  const st = textTexture([{ text: 'ELM ST', font: '900 120px ITTInter, sans-serif', color: '#ffffff', y: 0.55 }], 512, 160, (c, w, h) => { c.fillStyle = '#1f7a3a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16); });
  const sm = new THREE.Mesh(new THREE.BoxGeometry(5, 1.4, 0.15), [mat('#1f7a3a'), mat('#1f7a3a'), mat('#1f7a3a'), mat('#1f7a3a'), new THREE.MeshStandardMaterial({ map: st }), mat('#1f7a3a')]);
  sm.position.set(0, 6.6, 0); sg.add(sm);

  for (let i = 0; i < 40; i++) {
    const wk = walkerHouse(r, i);
    wk.rad = 100 + (i % 4) * 32 + r() * 12; wk.a0 = (i / 40) * Math.PI * 2 + r() * 0.1; wk.w = 0.035 * (130 / wk.rad);
    W.near.push(wk);
  }
  W.far = buildFar(1400, r);
  W.still = buildStillHouse();

  // Ethan's house on giant legs
  const hero = buildHeroHouse(ctx.scene, 0, 0);
  hero.warmUp.intensity = 26; hero.warmDown.intensity = 18;
  const fill = new THREE.PointLight('#9fb4ff', 30, 12, 1.2); fill.position.set(0, 12.2, 8.6); hero.group.add(fill); W.fill = fill;
  const heroLegs = [], heroHips = [];
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { heroLegs.push(makeLeg(ctx.scene, 78, 84, 1.7, legMat)); heroHips.push({ local: v3(s * 7.4, -0.3, -5.5 + k * 3.6), s, k }); }
  // underside plate so the house reads as a body
  box(16.5, 1.4, 14.5, legMat, 0, -0.7, 0, hero.group);
  W.hero = { ...hero, legs: heroLegs, hips: heroHips };
  // curtains, note, clock (children of the house)
  const curtMat = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#2c3f7a'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 24) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, 0, 8, h); } }), side: THREE.DoubleSide });
  W.curtL = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.6), curtMat); W.curtR = W.curtL.clone();
  [W.curtL, W.curtR].forEach((m) => { m.position.set(0, 11.2, 6.05); hero.group.add(m); });
  const note = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.9), new THREE.MeshBasicMaterial({ map: canvasTex(512, 380, (c, w, h) => {
    c.fillStyle = '#fff6a8'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0121c'; c.textAlign = 'center'; c.font = '900 92px ITTInter, sans-serif';
    c.fillText("DON'T LOOK", w / 2, 150); c.fillText('OUTSIDE', w / 2, 270); }) }));
  note.position.set(-5.2, 11.6, 6.1); note.rotation.y = Math.PI; hero.group.add(note);
  W.clockTex = [0, 1].map((m) => canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#0b0b0e'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff2a2a'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#ff0000'; c.shadowBlur = 24; c.font = '900 170px ITTInter, monospace'; c.fillText(`12:0${m}`, w / 2 - 30, h / 2 + 6);
    c.font = '900 50px ITTInter, sans-serif'; c.fillText('AM', w - 52, h / 2 + 60); }));
  const clock = new THREE.Group(); clock.position.set(5.0, 10.25, 3.1); hero.group.add(clock);
  box(2.4, 1.2, 0.8, mat('#1a1a1e', { caustic: false }), 0, 0, 0, clock, false);
  W.clockFace = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.05), new THREE.MeshBasicMaterial({ map: W.clockTex[0], toneMapped: false }));
  W.clockFace.position.z = -0.42; W.clockFace.rotation.y = Math.PI; clock.add(W.clockFace);
  // scratching leg tip outside the bedroom window
  W.tip = makeLeg(ctx.scene, 6, 6, 0.35, legMat);
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: canvasTex(512, 512, (c, w, h) => {
    const rr = rng(9); c.strokeStyle = '#ff3020'; c.lineWidth = 6; c.shadowColor = '#ff0000'; c.shadowBlur = 20;
    for (let i = 0; i < 14; i++) { c.beginPath(); let x = w / 2, y = h / 2; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rr() - 0.5) * 120; y += (rr() - 0.5) * 120; c.lineTo(x, y); } c.stroke(); } }) }));
  crack.rotation.x = -Math.PI / 2; crack.position.set(0, 7.46, 1.5); hero.group.add(crack); W.floorCrack = crack;

  // characters
  W.ethan = makeCharacter({ ...CAST.ethan, caustic: false });
  hero.group.add(W.ethan.root);
  W.resident = makeCharacter({ shirt: '#9ad0ff', pants: '#9ad0ff', hair: '#3a2a1a', hairStyle: 'short', shoes: '#8a6a4a' });
  W.resident.root.position.set(608, 0.3, 620); W.resident.root.rotation.y = -0.6; ctx.scene.add(W.resident.root);
}

function heroState(t) {
  // orbit at radius 175, then run outward after EV.run
  const wt = Math.min(t, EV.stop);
  const a = 2.2 + 0.03 * wt;
  let pos = v3(Math.cos(a) * 175, 0, Math.sin(a) * 175);
  const inward = pos.clone().multiplyScalar(-1).normalize();
  let dist = 175 * 0.03 * wt, yaw = Math.atan2(inward.x, inward.z), runK = 0;
  if (t > EV.run) {
    const u = t - EV.run; runK = smooth(0, 0.8, u);
    const sp = 55 * easeIn(clamp(u / 1.2)) + Math.max(0, u - 1.2) * 75;
    pos = pos.clone().add(inward.clone().multiplyScalar(-sp)); dist += sp;
  }
  return { pos, yaw, dist, runK, fwdYaw: t > EV.run ? yaw + Math.PI : yaw + Math.PI / 2 };
}

function updateHero(t) {
  const H = W.hero, s = heroState(t);
  const height = 112 + Math.sin(s.dist / 20 * Math.PI * 2) * (1 + s.runK * 2.5);
  H.group.position.set(s.pos.x, height, s.pos.z); H.group.rotation.set(0, s.yaw, Math.sin(s.dist / 20 * Math.PI) * 0.02 * s.runK);
  H.group.updateMatrixWorld();
  const fwd = v3(Math.sin(s.fwdYaw), 0, Math.cos(s.fwdYaw));
  const stride = 30 + s.runK * 18;
  H.hips.forEach((hp, i) => {
    const hip = hp.local.clone().applyMatrix4(H.group.matrixWorld);
    const out = v3(hp.s, 0, 0).applyQuaternion(H.group.quaternion);
    const base = hip.clone().add(out.clone().multiplyScalar(58)).add(v3((hp.k - 1.5) * 14, 0, 0).applyQuaternion(H.group.quaternion).projectOnPlane(v3(0, 1, 0))).setY(0);
    const phase = s.dist / stride + ((hp.k + (hp.s > 0 ? 1 : 0)) % 2) * 0.5;
    H.legs[i].update(hip, footAt(base, fwd, phase, stride, 14 + s.runK * 10), out);
  });
  return s;
}

const HW = (x, y, z) => v3(x, y, z).applyMatrix4(W.hero.group.matrixWorld);

function events() {
  const e = {};
  e.morning0 = L(1).start - 0.1; e.night1 = L(3).start - 0.1;
  e.minute = L(7).start; e.curtain = L(8).start + 0.3;
  e.stop = L(17).start + 0.3; e.door = L(15).start + 1.0; e.eye = L(16).start + 0.2;
  e.floor = L(18).start + 1.5; e.run = L(20).start - 0.1;
  e.black = ctx.dur - 0.25; return e;
}

const SHOTS = [
  { name: 'hook', t0: () => 0, t1: () => EV.morning0, f: (u, t) => {
    const wk = W.near[0]; const p = wk.body.position;
    return { pos: v3(p.x + lerp(26, 34, u), lerp(2.5, 4, u), p.z + lerp(30, 40, u)), look: v3(p.x, lerp(6, 14, easeOut(u)), p.z), fov: 62 }; } },
  { name: 'morning', t0: () => EV.morning0, t1: () => EV.night1, f: (u) => ({ pos: v3(lerp(640, 630, u), 4.5, lerp(648, 640, u)), look: v3(604, 5, 610), fov: 58 }) },
  { name: 'rule-bedroom', t0: () => EV.night1, t1: () => L(5).start - 0.05, f: (u) => ({ pos: HW(lerp(5.5, 4.8, u), 11.5, -4.5), look: HW(-1, 11, 6), fov: 66 }) },
  { name: 'scratch', t0: () => L(5).start - 0.05, t1: () => L(6).start - 0.05, f: (u) => ({ pos: HW(lerp(2.6, 2.2, u), 11.2, lerp(-1.5, 0.5, u)), look: HW(0, 11.3, 7), fov: 60 }) },
  { name: 'clock', t0: () => L(6).start - 0.05, t1: () => L(8).start - 0.05, f: (u) => ({ pos: HW(5.0, 10.9, lerp(-4.2, -3.2, u)), look: HW(5.0, 10.25, 3.1), fov: lerp(44, 38, u) }) },
  { name: 'curtains', t0: () => L(8).start - 0.05, t1: () => L(9).start - 0.05, f: (u) => ({ pos: HW(3.0, 13.2, lerp(0.6, 1.4, u)), look: HW(-0.8, 10.6, 9), fov: 64 }) },
  { name: 'exterior-high', t0: () => L(9).start - 0.05, t1: () => L(10).start - 0.05, f: (u) => {
    const c = W.hero.group.position;
    const out = c.clone().setY(0).normalize();
    const side = v3(out.z, 0, -out.x);
    return { pos: c.clone().add(out.clone().multiplyScalar(-lerp(66, 56, u))).add(side.multiplyScalar(lerp(-22, 16, u))).setY(c.y + 4), look: c.clone().add(v3(0, -30, 0)), fov: 72 }; } },
  { name: 'pov-down', t0: () => L(10).start - 0.05, t1: () => L(11).start - 0.05, f: (u) => ({ pos: HW(0, 12.2, 8.5), look: HW(lerp(-6, 6, u), -60, 60), fov: 72 }) },
  { name: 'ethan-face', t0: () => L(11).start - 0.05, t1: () => L(12).start - 0.05, f: (u) => ({ pos: HW(0.2, 12.2, lerp(9.4, 8.8, u)), look: HW(0, 12.0, 5.3), fov: 44 }) },
  { name: 'still-house', t0: () => L(12).start - 0.05, t1: () => L(13).start - 0.05, f: (u) => ({ pos: v3(lerp(10, 6, u), 3.2, lerp(40, 34, u)), look: v3(0, 6.5, 0), fov: 58 }) },
  { name: 'field-aerial', t0: () => L(13).start - 0.05, t1: () => L(15).start - 0.05, f: (u) => {
    const a = 0.6 + u * 0.35; return { pos: v3(Math.cos(a) * 190, lerp(150, 250, easeInOut(u)), Math.sin(a) * 190), look: v3(0, 0, 0), fov: 66 }; } },
  { name: 'door', t0: () => L(15).start - 0.05, t1: () => L(16).start - 0.05, f: (u) => ({ pos: v3(lerp(2, 1, u), 4, lerp(26, 20, u)), look: v3(0, 4.5, 6), fov: 50 }) },
  { name: 'eye', t0: () => L(16).start - 0.05, t1: () => L(17).start - 0.05, f: (u) => ({ pos: v3(0, 3.6, lerp(22, 15.5, easeOut(u))), look: v3(0, 3.7, 2), fov: lerp(50, 44, u) }) },
  { name: 'stopped', t0: () => L(17).start - 0.05, t1: () => L(18).start - 0.05, f: (u) => {
    const wk = W.near[3].body.position; const dir = wk.clone().setY(0).normalize();
    return { pos: wk.clone().add(dir.clone().multiplyScalar(-34)).setY(3), look: wk.clone().add(dir.clone().multiplyScalar(30)).setY(14), fov: 72 }; } },
  { name: 'floor', t0: () => L(18).start - 0.05, t1: () => L(19).start - 0.05, f: (u) => ({ pos: HW(lerp(3.6, 3.2, u), lerp(11.5, 12.5, u), lerp(1.2, 0.8, u)), look: HW(-0.5, 8.0, 3.5), fov: 66 }) },
  { name: 'found-us', t0: () => L(19).start - 0.05, t1: () => EV.run, f: (u) => ({ pos: HW(0.3, 12.1, lerp(8.2, 7.7, u)), look: HW(0, 12.0, 5.3), fov: 38 }) },
  { name: 'run', t0: () => EV.run, t1: () => 999, f: (u, t) => {
    const c = W.hero.group.position.clone(); const k = clamp((t - EV.run) / 4.2);
    const out = c.clone().setY(0).normalize(); const side = v3(out.z, 0, -out.x);
    const pos = c.clone().add(side.multiplyScalar(lerp(70, 190, easeOut(k)))).add(out.clone().multiplyScalar(lerp(30, -60, easeOut(k)))).setY(lerp(60, 120, easeOut(k)));
    return { pos, look: c.clone().add(v3(0, lerp(-10, -40, k), 0)), fov: lerp(64, 70, k) }; } },
];

function renderAt(t) {
  const morning = t >= EV.morning0 && t < EV.night1;
  applyEnv(ctx, morning ? MORNING : MOON);
  const wt = Math.min(t, EV.stop);
  // near walkers circle the field
  W.near.forEach((wk, i) => {
    if (morning && i < 4) { // parked on the new street, legs folded
      updateWalker(wk, v3(604 + i * 22, 0, 600), 0, 0, 12, 6, 3, 9, 1); return;
    }
    const a = wk.a0 + wk.w * wt; const pos = v3(Math.cos(a) * wk.rad, 0, Math.sin(a) * wk.rad);
    const yaw = Math.atan2(-Math.sin(a), Math.cos(a));
    let bodyH = 12;
    if (i === 0 && t < EV.morning0) bodyH = lerp(0.6, 12, easeInOut(clamp((t - 0.15) / 1.6)));
    updateWalker(wk, pos, yaw, wk.rad * wk.w * wt, bodyH, 6, 3, 9, i === 0 ? 1 - clamp((t - 0.15) / 1.0) : 0);
    wk.root.visible = true;
  });
  W.far.update(wt, !morning);
  const hs = updateHero(t);
  // stationary house: door + eye
  const S = W.still; const door = smooth(EV.door - 0.6, EV.door + 0.9, t);
  S.pivot.rotation.y = -door * 1.9;
  const eyeK = smooth(EV.eye - 0.2, EV.eye + 0.5, t);
  S.eye.group.visible = eyeK > 0.01; S.eye.group.scale.setScalar(lerp(0.2, 1, easeOut(eyeK)));
  S.eye.setPupil(lerp(1.4, 0.6, smooth(EV.eye + 0.4, EV.eye + 1.2, t)));
  S.eyeLight.intensity = eyeK * 220;
  S.eye.group.rotation.y = Math.sin(t * 1.3) * 0.08 * (1 - smooth(EV.stop, EV.stop + 0.5, t));
  // bedroom details
  const curt = smooth(EV.curtain, EV.curtain + 1.4, t);
  W.curtL.position.x = lerp(-1.7, -4.9, curt); W.curtR.position.x = lerp(1.7, 4.9, curt);
  W.clockFace.material.map = W.clockTex[t >= EV.minute ? 1 : 0];
  W.floorCrack.material.opacity = smooth(EV.floor - 0.8, EV.floor + 0.6, t) * (0.7 + 0.3 * Math.sin(t * 9));
  W.floorCrack.visible = t > EV.floor - 0.8;
  W.fill.color.set(t > EV.floor - 0.8 ? '#ff4030' : '#9fb4ff'); W.fill.intensity = t > EV.floor - 0.8 ? 45 : 30;
  // leg tip tapping the window during the scratch shot
  const tap = Math.abs(Math.sin(t * 7)) * 0.6;
  W.tip.update(HW(3.5, 15.5, 9.5), HW(1.2 - tap * 0.4, 12.2 + tap * 0.3, 7.15), v3(0, 1, 0));
  W.tip.meshes.forEach((m) => { m.visible = t > L(5).start && t < L(8).start; });
  // Ethan
  const E = W.ethan;
  E.root.position.set(0, 7.4, 5.3); E.root.rotation.y = 0;
  if (t < L(5).start) { E.root.position.set(-2.5, 7.4, 1.5); E.root.rotation.y = 2.4; pose(E, 'idle', t); E.setFace('worried'); }
  else if (t < L(8).start) { E.root.position.set(-0.4, 7.4, 3.6); E.root.rotation.y = 0.2; pose(E, 'idle', t, {}); E.neck.rotation.x = -0.05; E.setFace('curious'); }
  else if (t < L(12).start) { pose(E, t < L(9).start ? 'handsToWindow' : 'idle', t, { amt: 0.1 }); E.neck.rotation.x = t > L(10).start ? 0.45 : 0; E.setFace(t < L(9).start ? 'curious' : 'wonder'); }
  else if (t < L(18).start) { pose(E, 'handsToWindow', t, { amt: -0.3 }); E.setFace(t < L(16).start ? 'worried' : 'scared'); }
  else { pose(E, 'scared', t, { amt: -0.45 }); E.neck.rotation.x = t < L(19).start ? 0.6 : 0.15; E.setFace(t < L(19).start ? 'scared' : 'shock'); }
  if (t >= L(8).start - 0.05 && t < L(9).start - 0.05) E.root.position.set(0.2, 7.4, 4.6);
  W.hero.group.updateMatrixWorld(true);
  const sh = shotAt(SHOTS, t);
  // resident (morning)
  W.resident.root.visible = morning; if (morning) { pose(W.resident, 'lookUp', t, { amt: 0.15 }); W.resident.neck.rotation.y = 0.5; W.resident.setFace('confused'); W.resident.arms[1].rotation.x = -2.6; W.resident.arms[1].rotation.z = -0.3; }

  // shake / flash
  let shake = 0;
  if (['rule-bedroom', 'scratch', 'clock', 'curtains'].includes(sh.name)) shake = 0.25;
  if (sh.name === 'found-us') shake = 0.6;
  if (sh.name === 'run') shake = 0.5;
  if (sh.name === 'eye') shake = 0.15;
  const flash = Math.max(t < 0.12 ? 1 - t / 0.12 : 0, Math.exp(-Math.max(0, t - EV.eye) * 7) * (t > EV.eye ? 0.35 : 0));
  const indoor = ['rule-bedroom', 'scratch', 'clock', 'curtains', 'floor', 'found-us', 'ethan-face'].includes(sh.name);
  frame(ctx, t, sh, { shake, flash, flashColor: t > 5 ? '#ffd080' : '#ffffff', black: t >= EV.black ? 1 : 0, shadows: !indoor,
    vig: sh.name === 'found-us' ? 0.25 : 0, tint: sh.name === 'found-us' || sh.name === 'floor' ? 'radial-gradient(ellipse at 50% 100%, rgba(255,30,20,0.25), rgba(0,0,0,0) 70%)' : null });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep07'); L = ctx.L; EV = events();
  buildWorld();
  ['worried', 'curious', 'wonder', 'scared', 'shock'].forEach((f) => W.ethan.setFace(f));
  return expose(ctx, renderAt, L(9).start + 1.6, EV);
}
