// Episode 16 — "The Ocean Disappears Every Sunday".
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng, mat, box, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { buildTown, makeHouse, mergeGroup } from '../engine/town.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, DAY, DUSK } from '../engine/stage.js';
import { canvasTex, glowSprite } from '../engine/props.js';

let ctx, L, EV;
const DAWN = P({ ...DAY, top: '#6a8ae0', horizon: '#ffc8a0', haze: '#f0d0c0', sunColor: '#ffd0a0', sunDir: v3(0.2, 0.25, 0.95), sunSize: 1.4, exposure: 1.0, fogNear: 400, fogFar: 1600 });
const NOON = P({ ...DAY, sunDir: v3(0.3, 0.8, 0.5), exposure: 1.0, fogNear: 400, fogFar: 1600 });
const SET = P({ ...DUSK, sunDir: v3(-0.2, 0.12, 0.95), sunSize: 1.8, top: '#3a2a6e', horizon: '#ff7a4a', haze: '#e89a7a', fogNear: 400, fogFar: 1600 });
const W = {};
const LEO = { skin: '#f6d2b0', shirt: '#d83a3a', pocket: '#c02e2e', hood: true, pants: '#2f5aa8', shoes: '#ffffff', hair: '#f2d06a', hairStyle: 'short' };
const COAST = 460;
const DOOR = v3(60, 0, 860);            // door base x,z (y from seabed)
const depthAt = (z) => -Math.min(70, Math.max(0, z - COAST) * 0.19);

function build() {
  const before = new Set(ctx.scene.children);
  W.town = buildTown(ctx.scene, { sign: null, house: false, seed: 16, ground: 560 });
  // land ends at the coast: replace the town ground with one that stops at COAST
  ctx.scene.children.forEach((o) => { if (!before.has(o) && o.isMesh && o.geometry.type === 'PlaneGeometry') { o.geometry = new THREE.PlaneGeometry(2600, 1700); o.position.z = COAST - 850; } });
  // mirror copy of the town (for the final shot): shares geometry/materials
  W.mirror = new THREE.Group(); ctx.scene.add(W.mirror);
  ctx.scene.children.forEach((o) => { if (!before.has(o) && o.isMesh && o.geometry.attributes.position.count > 200) W.mirror.add(new THREE.Mesh(o.geometry, o.material)); });
  W.mirror.scale.set(1, -1, 1); W.mirror.position.set(0, 430, 0); W.mirror.visible = false;
  const r = rng(61);
  // the seabed (sloping, sculpted)
  const g = new THREE.PlaneGeometry(1400, 1200, 120, 100); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, cols = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i) + COAST + 600; p.setZ(i, z);
    const y = depthAt(z) + (z > COAST + 4 ? Math.sin(x * 0.03) * 2 + Math.sin(z * 0.05 + x * 0.02) * 1.5 : 0) - 0.3;
    p.setY(i, y);
    const wet = clamp(-y / 70); const c = new THREE.Color('#e2c890').lerp(new THREE.Color('#8a7a5a'), wet * 0.7); cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
  const bed = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); bed.receiveShadow = true; ctx.scene.add(bed);
  // beach strip
  box(1300, 0.4, 30, mat('#efd9a0'), 0, 0.1, 75, null).visible = false;
  const deco = new THREE.Group();
  for (let i = 0; i < 70; i++) { const x = -300 + r() * 600, z = COAST + 30 + r() * 520; const y = depthAt(z);
    if (i % 3 === 0) box(3 + r() * 5, 2 + r() * 4, 3 + r() * 4, mat('#7a7a80'), x, y + 1, z, deco);
    else if (i % 3 === 1) for (let k = 0; k < 4; k++) box(0.4, 3 + r() * 5, 0.4, mat('#3a8a4a'), x + k * 0.8, y + 2.5, z, deco);
    else { const c = new THREE.Mesh(new THREE.SphereGeometry(1.2 + r(), 8, 6), mat('#ff8aa8')); c.position.set(x, y + 0.8, z); deco.add(c); } }
  // shipwrecks
  for (const [x, z, ry] of [[20, COAST + 140, 0.4], [110, COAST + 240, -0.7], [-40, COAST + 300, 1.2]]) {
    const s = new THREE.Group(); s.position.set(x, depthAt(z) + 2, z); s.rotation.set(0.15, ry, 0.35); deco.add(s);
    box(26, 6, 9, mat('#6a4a2a'), 0, 0, 0, s); box(18, 1, 8, mat('#8a6a42'), 0, 3.2, 0, s); box(1, 18, 1, mat('#5a3a1a'), 2, 11, 0, s); box(10, 7, 0.2, mat('#d8ccb0'), 2, 13, 0.6, s);
  }
  mergeGroup(deco, ctx.scene);
  // seashells (some scream later)
  W.shells = [];
  const shellTex = canvasTex(64, 64, (c) => { c.fillStyle = '#1a0a10'; c.beginPath(); c.ellipse(32, 36, 14, 18, 0, 0, 7); c.fill(); });
  for (let i = 0; i < 40; i++) {
    const near = i < 24; const a = r() * 6.28, d = near ? 4 + r() * 22 : 0;
    const x = near ? DOOR.x + Math.cos(a) * d : -100 + r() * 220, z = near ? DOOR.z - 30 + Math.sin(a) * d : COAST + 40 + r() * 200;
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 8), mat(['#ffd0d8', '#fff2e0', '#f8c8a0'][i % 3])); sh.position.set(x, depthAt(z) + 0.6, z); sh.rotation.set(Math.PI / 2, 0, r() * 6); ctx.scene.add(sh);
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: shellTex, transparent: true })); m.scale.setScalar(1.2); m.position.set(x, depthAt(z) + 1.5, z); m.visible = false; ctx.scene.add(m);
    W.shells.push({ sh, m, base: sh.position.clone(), near });
  }
  // water: sea surface + returning wave wall
  W.sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1400), new THREE.MeshStandardMaterial({ color: '#2a86c8', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }));
  W.sea.rotation.x = -Math.PI / 2; W.sea.position.set(0, 0.4, COAST + 700); ctx.scene.add(W.sea);
  W.wave = new THREE.Mesh(new THREE.BoxGeometry(1400, 70, 60), new THREE.MeshStandardMaterial({ color: '#2a8ad0', roughness: 0.2, transparent: true, opacity: 0.92 }));
  ctx.scene.add(W.wave);
  W.foam = new THREE.Mesh(new THREE.BoxGeometry(1400, 6, 62), mat('#eaf6ff')); ctx.scene.add(W.foam);
  // the door
  const dg = new THREE.Group(); dg.position.set(DOOR.x, depthAt(DOOR.z), DOOR.z); ctx.scene.add(dg); W.door = dg;
  const wood = mat('#6a4424'), dark = mat('#3a2412');
  box(7, 58, 7, dark, -18, 29, 0, dg); box(7, 58, 7, dark, 18, 29, 0, dg); box(44, 7, 8, dark, 0, 60, 0, dg);
  const runes = canvasTex(512, 1024, (c, w, h) => {
    c.fillStyle = '#6a4424'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 64) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, 0, 5, h); }
    const rr = rng(7); c.strokeStyle = '#5ff7ff'; c.lineWidth = 9; c.shadowColor = '#3ae0ff'; c.shadowBlur = 24; c.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const cx = 90 + (i % 3) * 165, cy = 90 + Math.floor(i / 3) * 190; c.beginPath(); c.arc(cx, cy, 30 + rr() * 20, rr() * 6, rr() * 6 + 3); c.stroke(); c.beginPath(); c.moveTo(cx - 30, cy + 40); c.lineTo(cx + 30 * (rr() - 0.5), cy - 40); c.lineTo(cx + 30, cy + 40); c.stroke(); }
  });
  const leafM = new THREE.MeshStandardMaterial({ map: runes, emissive: '#ffffff', emissiveMap: runes, emissiveIntensity: 0.55, roughness: 0.8 });
  W.leaves = [-1, 1].map((s) => { const pv = new THREE.Group(); pv.position.set(s * 14.5, 0, 0); dg.add(pv); const lf = new THREE.Mesh(new THREE.BoxGeometry(14.5, 56, 1.6), leafM); lf.position.set(-s * 7.25, 28, 0); lf.castShadow = true; pv.add(lf);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.3, 8, 20), mat('#c8a040')); ring.position.set(-s * 12.5, 26, -1.2); pv.add(ring); return pv; });
  W.doorGlow = glowSprite('#5ff7ff', 120, 0.25); W.doorGlow.position.set(0, 30, -2); dg.add(W.doorGlow);
  // portal plane (other ocean rendered into a texture)
  W.rt = new THREE.WebGLRenderTarget(512, 1024); W.rt.texture.colorSpace = THREE.SRGBColorSpace;
  W.portal = new THREE.Mesh(new THREE.PlaneGeometry(29, 56), new THREE.MeshBasicMaterial({ map: W.rt.texture, toneMapped: false })); W.portal.position.set(0, 28, 0.9); W.portal.rotation.y = Math.PI; dg.add(W.portal);
  // the other world
  const os = new THREE.Scene(); os.background = new THREE.Color('#0a4a7a'); os.fog = new THREE.Fog('#0a4a7a', 40, 260);
  os.add(new THREE.HemisphereLight('#bfe8ff', '#0a2a4a', 1.6)); const od = new THREE.DirectionalLight('#ffffff', 1.4); od.position.set(10, 30, 20); os.add(od);
  const mini = new THREE.Group(); const mg = new THREE.Group(); const rr = rng(16);
  for (let i = 0; i < 26; i++) makeHouse(mg, -90 + (i % 13) * 15, i < 13 ? -12 : 12, i < 13 ? 0 : Math.PI, rr, rr() > 0.5 ? 2 : 1);
  box(220, 1, 60, mat('#79c565'), 0, -0.5, 0, mg); box(220, 0.2, 10, mat('#5d626b'), 0, 0.1, 0, mg);
  mergeGroup(mg, mini); mini.scale.set(0.5, -0.5, 0.5); mini.position.set(0, 30, -70); mini.rotation.y = 0.3; os.add(mini); W.mini = mini;
  W.bubbles = []; for (let i = 0; i < 40; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.4 + rr() * 0.6, 8, 6), new THREE.MeshBasicMaterial({ color: '#cfefff', transparent: true, opacity: 0.6 })); b.position.set(-30 + rr() * 60, rr() * 60, -10 - rr() * 60); os.add(b); W.bubbles.push(b); }
  W.otherLeo = makeCharacter({ ...LEO, caustic: false }); W.otherLeo.root.position.set(0, 4, -8); os.add(W.otherLeo.root);
  W.ocam = new THREE.PerspectiveCamera(60, 0.52, 0.1, 500); W.ocam.position.set(0, 12, 22); W.ocam.lookAt(0, 14, -40);
  W.other = os;
  // shore sign
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2), new THREE.MeshBasicMaterial({ map: canvasTex(800, 320, (c, w, h) => { c.fillStyle = '#f2e6c8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7a4a2a'; c.lineWidth = 16; c.strokeRect(8, 8, w - 16, h - 16); c.textAlign = 'center'; c.fillStyle = '#2a1a10'; c.font = '900 70px ITTInter, sans-serif'; c.fillText('RETURN BEFORE', w / 2, 130); c.fillStyle = '#c0121c'; c.font = '900 92px ITTInter, sans-serif'; c.fillText('SUNSET!', w / 2, 240); }) }));
  sign.position.set(70, 5, COAST - 2); sign.rotation.y = Math.PI; ctx.scene.add(sign); W.signPos = v3(70, 5, COAST - 2);
  // people
  W.people = [];
  for (let i = 0; i < 7; i++) { const c = makeCharacter({ shirt: ['#6ad06a', '#4a7ad0', '#ffb03a', '#c06aff', '#3ad0c0', '#ff6a6a', '#ffffff'][i], pants: '#2a3a5a', hair: ['#1a1a1a', '#6a4126', '#e0b050'][i % 3], hairStyle: i % 2 ? 'short' : 'shoulder', female: i % 2 === 0 });
    const x = 20 + i * 12, z = COAST + 50 + (i % 3) * 40; c.base = v3(x, depthAt(z), z); ctx.scene.add(c.root); W.people.push(c); }
  W.leo = makeCharacter(LEO); ctx.scene.add(W.leo.root);
}

function events() {
  const e = {};
  e.drain = 0.2; e.leo = L(7).start - 0.05; e.knock = L(10).start + 0.5; e.reach = L(11).start; e.scream = L(12).start + 0.2; e.set = L(13).start - 0.05;
  e.wave = L(14).start; e.run = L(15).start; e.open = L(16).start + 0.8; e.wave2 = L(21).start; e.final = L(22).start + 1.4; e.black = ctx.dur - 0.2; return e;
}

function leoPos(t) {
  if (t < EV.leo) return v3(64, 0.3, COAST - 10);
  if (t < EV.reach) { const k = clamp((t - EV.leo) / (L(8).start + 1.5 - EV.leo)); const z = lerp(COAST + 90, DOOR.z - 22, easeOut(k)); return v3(60 + Math.sin(k * 3) * 4, depthAt(z), z); }
  if (t < EV.run) return v3(60, depthAt(DOOR.z - 8), DOOR.z - 8);
  const k = clamp((t - EV.run) / 4); const z = lerp(DOOR.z - 8, DOOR.z - 40, k); return v3(60, depthAt(z), z);
}

const D = () => W.door.position;
const SHOTS = [
  { name: 'hook', t0: () => 0, t1: () => L(1).start - 0.05, f: (u) => ({ pos: v3(lerp(10, 20, u), lerp(30, 36, u), COAST - 70), look: v3(60, -20, COAST + 260), fov: 66 }) },
  { name: 'vanish', t0: () => L(1).start - 0.05, t1: () => L(2).start - 0.05, f: (u) => ({ pos: v3(60, lerp(8, 4, u), COAST + 90), look: v3(20, depthAt(COAST + 140) + 4, COAST + 140), fov: 58 }) },
  { name: 'seabed', t0: () => L(2).start - 0.05, t1: () => L(3).start - 0.05, f: (u) => ({ pos: v3(lerp(-20, 20, u), 40, COAST + 10), look: v3(60, -40, COAST + 300), fov: 66 }) },
  { name: 'walk', t0: () => L(3).start - 0.05, t1: () => L(4).start - 0.05, f: (u) => { const c = W.people[2].root.position; return { pos: c.clone().add(v3(8, 4, -10)), look: c.clone().add(v3(0, 3, 0)), fov: 56 }; } },
  { name: 'shells', t0: () => L(4).start - 0.05, t1: () => L(5).start - 0.05, f: (u) => { const c = W.people[4].root.position; return { pos: c.clone().add(v3(4, 3, -6)), look: c.clone().add(v3(0, 1.5, 0)), fov: 54 }; } },
  { name: 'wreck', t0: () => L(5).start - 0.05, t1: () => L(6).start - 0.05, f: (u) => ({ pos: v3(lerp(50, 40, u), depthAt(COAST + 120) + 6, COAST + 120), look: v3(20, depthAt(COAST + 140) + 4, COAST + 140), fov: 60 }) },
  { name: 'rule', t0: () => L(6).start - 0.05, t1: () => EV.leo, f: (u) => ({ pos: W.signPos.clone().add(v3(lerp(-2, 0, u), 0, lerp(-9, -6, u))), look: W.signPos, fov: 50 }) },
  { name: 'wander', t0: () => EV.leo, t1: () => L(8).start - 0.05, f: (u, t) => { const p = leoPos(t); return { pos: p.clone().add(v3(-14, 12, -24)), look: p.clone().add(v3(0, 2, 30)), fov: 60 }; } },
  { name: 'door-reveal', t0: () => L(8).start - 0.05, t1: () => L(9).start - 0.05, f: (u) => ({ pos: D().clone().add(v3(lerp(16, 10, u), 3, -70)), look: D().clone().add(v3(0, 26, 0)), fov: 62 }) },
  { name: 'symbols', t0: () => L(9).start - 0.05, t1: () => L(10).start - 0.05, f: (u) => ({ pos: D().clone().add(v3(lerp(-6, 4, u), 30, -16)), look: D().clone().add(v3(0, 30, 0)), fov: 50 }) },
  { name: 'knock', t0: () => L(10).start - 0.05, t1: () => L(11).start - 0.05, f: (u) => ({ pos: D().clone().add(v3(4, 6, -30)), look: D().clone().add(v3(0, 20, 0)), fov: 62 }) },
  { name: 'handle', t0: () => L(11).start - 0.05, t1: () => L(12).start - 0.05, f: (u) => ({ pos: D().clone().add(v3(-4, 6, -14)), look: D().clone().add(v3(1, 4.8, -2)), fov: 54 }) },
  { name: 'screams', t0: () => L(12).start - 0.05, t1: () => L(13).start - 0.05, f: (u) => { const s = W.shells[3].base; return { pos: s.clone().add(v3(2, 2.2, -4)), look: s, fov: 52 }; } },
  { name: 'sunset', t0: () => L(13).start - 0.05, t1: () => L(14).start - 0.05, f: (u) => ({ pos: D().clone().add(v3(-8, 10, -40)), look: D().clone().add(v3(0, 30, 300)), fov: 66 }) },
  { name: 'wave', t0: () => L(14).start - 0.05, t1: () => L(15).start - 0.05, f: (u) => ({ pos: D().clone().add(v3(30, 40, 20)), look: v3(60, 0, DOOR.z + 500), fov: 66 }) },
  { name: 'run', t0: () => L(15).start - 0.05, t1: () => EV.open - 0.6, f: (u, t) => { const p = leoPos(t); return { pos: p.clone().add(v3(6, 4, -12)), look: p.clone().add(v3(0, 3, 4)), fov: 60 }; } },
  { name: 'opens', t0: () => EV.open - 0.6, t1: () => L(17).start - 0.05, f: (u) => ({ pos: D().clone().add(v3(2, 8, -60)), look: D().clone().add(v3(0, 26, 0)), fov: 60 }) },
  { name: 'portal', t0: () => L(17).start - 0.05, t1: () => L(21).start - 0.05, f: (u) => ({ pos: D().clone().add(v3(0, 26, lerp(-56, -40, u))), look: D().clone().add(v3(0, 28, 0)), fov: 64 }) },
  { name: 'wave-leo', t0: () => L(21).start - 0.05, t1: () => EV.final, f: (u) => ({ pos: D().clone().add(v3(0, 20, lerp(-30, -24, u))), look: D().clone().add(v3(0, 18, 0)), fov: 52 }) },
  { name: 'final', t0: () => EV.final, t1: () => 999, f: (u, t) => { const k = easeOut(clamp((t - EV.final) / 3.2)); return { pos: v3(lerp(90, 260, k), lerp(30, 70, k), lerp(DOOR.z + 60, DOOR.z + 420, k)), look: v3(60, lerp(40, 170, k), DOOR.z - 300), fov: lerp(64, 76, k) }; } },
];

function renderAt(t) {
  let env = mixP(DAWN, NOON, smooth(L(2).start, L(4).start, t)); if (t > EV.set - 0.5) env = mixP(NOON, SET, smooth(EV.set - 0.5, EV.set + 1.5, t));
  applyEnv(ctx, env);
  // drain at sunrise
  const drain = smooth(EV.drain, L(2).start, t);
  W.sea.position.y = lerp(0.4, -80, easeIn(drain)); W.sea.visible = drain < 0.999 || t > EV.wave;
  if (t > EV.wave) W.sea.position.y = lerp(-80, -30, smooth(EV.wave, EV.final, t));
  // returning wave
  const wk = clamp((t - EV.wave) / 6); W.wave.visible = W.foam.visible = t > EV.wave - 0.1;
  const wz = lerp(DOOR.z + 650, DOOR.z + 40, easeOut(wk)); W.wave.position.set(60, depthAt(wz) + 35, wz); W.foam.position.set(60, depthAt(wz) + 70, wz);
  // door: knocking, opening
  const knock = t > EV.knock && t < EV.knock + 2.0 ? Math.max(0, Math.sin((t - EV.knock) * Math.PI / 0.6 * 2)) : 0;
  const open = smooth(EV.open, EV.open + 3.5, t);
  W.leaves[0].rotation.y = -open * 1.6 + knock * 0.02; W.leaves[1].rotation.y = open * 1.6 - knock * 0.02;
  W.door.position.z = DOOR.z + knock * 0.4;
  W.portal.visible = open > 0.02; W.doorGlow.material.opacity = 0.25 + 0.4 * open;
  if (W.portal.visible) {
    W.mini.rotation.y = 0.3 + t * 0.03; W.bubbles.forEach((b, i) => { b.position.y = (b.position.y + 0.05) % 60; });
    const ol = W.otherLeo; pose(ol, t > EV.wave2 ? 'wave' : 'idle', t); ol.setFace(t > EV.wave2 ? 'smile' : 'neutral'); ol.root.position.y = 4 + Math.sin(t) * 0.6;
    ol.root.visible = t > L(20).start;
    ctx.renderer.setRenderTarget(W.rt); ctx.renderer.render(W.other, W.ocam); ctx.renderer.setRenderTarget(null);
  }
  W.mirror.visible = t > EV.final - 0.2;
  // shells scream
  W.shells.forEach((s, i) => { const sc = t > EV.scream && s.near; s.sh.position.copy(s.base).add(sc ? v3(noise1(t * 40 + i) * 0.2, Math.abs(noise1(t * 30 + i)) * 0.4, 0) : v3(0, 0, 0)); s.m.visible = sc; if (sc) s.m.scale.setScalar(1 + Math.abs(Math.sin(t * 20 + i)) * 0.6); });
  // people on the seabed
  W.people.forEach((c, i) => { const vis = t > L(2).start && t < EV.leo; c.root.visible = vis; if (!vis) return; const x = c.base.x + Math.sin(t * 0.4 + i) * 4; c.root.position.set(x, c.base.y + 0.3, c.base.z); c.root.rotation.y = Math.cos(t * 0.4 + i) > 0 ? Math.PI / 2 : -Math.PI / 2; pose(c, i === 4 ? 'scared' : 'walk', t + i); if (i === 4) { c.torso.rotation.x = 0.7; } c.setFace('smile'); });
  // Leo
  const Lp = leoPos(t); const Lc = W.leo; Lc.root.position.copy(Lp).add(v3(0, 0.3, 0)); Lc.root.visible = t > EV.leo - 0.1;
  Lc.root.rotation.y = t < EV.run ? 0 : Math.PI;
  pose(Lc, t < EV.reach ? 'walk' : t < EV.run ? (t < EV.scream ? 'idle' : 'scared') : t < EV.open - 0.4 ? 'run' : 'scared', t);
  if (t > EV.reach && t < EV.scream) { Lc.arms[1].rotation.x = -1.4; }
  if (t > EV.open) Lc.root.rotation.y = 0;
  Lc.setFace(t < L(8).start ? 'curious' : t < EV.knock ? 'wonder' : t < EV.open ? 'scared' : t < EV.wave2 ? 'wonder' : 'shock');
  const sh = shotAt(SHOTS, t);
  let shake = 0; if (sh.name === 'knock') shake = knock * 0.5; if (t > EV.wave && t < EV.open) shake = 0.25; if (sh.name === 'opens') shake = 0.15;
  frame(ctx, t, sh, { shake, flash: Math.max(t < 0.12 ? 1 - t / 0.12 : 0, Math.exp(-Math.max(0, t - EV.open) * 3) * (t > EV.open ? 0.35 : 0)), flashColor: '#c8f6ff', black: t >= EV.black ? 1 : 0 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep16'); L = ctx.L; EV = events();
  build();
  return expose(ctx, renderAt, L(19).start + 1.0, EV);
}
