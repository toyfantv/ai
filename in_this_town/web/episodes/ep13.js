// Episode 13 — "The Clouds Are Alive".
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { CAST } from '../engine/cast.js';
import { buildTown } from '../engine/town.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, DAY, DUSK } from '../engine/stage.js';
import { canvasTex, glowSprite } from '../engine/props.js';

let ctx, L, EV;
const SUNNY = P({ ...DAY, exposure: 1.0, top: '#4a9cf0', horizon: '#d6f0ff' });
const NOONP = P({ ...DAY, exposure: 1.0, top: '#3a8ee6' });
const SUNSET = P({ ...DUSK, top: '#4a2a6e', horizon: '#ff8a7a', haze: '#e8a0a0', exposure: 1.05 });
const SHADOW = P({ ...DUSK, top: '#3a2a4e', horizon: '#7a4a6a', haze: '#5a3a5a', sunI: 0.5, hemiI: 0.6, exposure: 1.1, vig: 0.6 });
const W = {};

function faceTex(kind) {
  return canvasTex(256, 256, (c, w, h) => {
    const ink = '#3a2a4a'; c.lineCap = 'round';
    const eye = (x) => {
      if (kind === 'sleep') { c.strokeStyle = ink; c.lineWidth = 9; c.beginPath(); c.arc(x, 120, 16, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
      else if (kind === 'open' || kind === 'mouth') { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, 112, 26, 32, 0, 0, 7); c.fill(); c.fillStyle = kind === 'mouth' ? '#ff2a5a' : ink; c.beginPath(); c.arc(x, 116, kind === 'mouth' ? 9 : 15, 0, 7); c.fill(); }
      else { c.fillStyle = ink; c.beginPath(); c.ellipse(x, 116, 12, 17, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 4, 110, 4, 0, 7); c.fill(); }
    };
    eye(88); eye(168);
    c.fillStyle = 'rgba(255,120,160,0.45)'; c.beginPath(); c.ellipse(60, 150, 18, 10, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(196, 150, 18, 10, 0, 0, 7); c.fill();
    if (kind === 'eat') { c.fillStyle = ink; c.beginPath(); c.ellipse(128, 168, 22, 26, 0, 0, 7); c.fill(); }
    else if (kind === 'mouth') { c.fillStyle = '#1a0610'; c.beginPath(); c.ellipse(128, 190, 80, 50, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(66 + i * 18, 150); c.lineTo(75 + i * 18, 168); c.lineTo(84 + i * 18, 150); c.fill(); } }
    else if (kind !== 'sleep') { c.strokeStyle = ink; c.lineWidth = 7; c.beginPath(); c.arc(128, 150, 16, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
    else { c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); c.arc(128, 160, 8, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); }
  });
}
let FACES;

function makeCloud(size, color, seed) {
  const r = rng(seed); const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, emissive: color, emissiveIntensity: 0.18, fog: true });
  const geo = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(geo, m); const a = (i / 9) * Math.PI * 2;
    s.position.set(Math.cos(a) * 1.1 * (0.6 + r() * 0.5), (r() - 0.3) * 0.6 + (i % 3 === 0 ? 0.5 : 0), Math.sin(a) * 0.5 * r());
    s.scale.setScalar(0.75 + r() * 0.45); s.castShadow = true; g.add(s);
  }
  const core = new THREE.Mesh(geo, m); core.scale.set(1.4, 1.1, 1.0); g.add(core);
  const face = new THREE.Sprite(new THREE.SpriteMaterial({ map: FACES.happy, transparent: true, toneMapped: false }));
  face.scale.set(1.5, 1.5, 1); face.position.set(0, 0.1, 1.25); g.add(face);
  g.scale.setScalar(size); ctx.scene.add(g);
  return { g, face, m, setFace(k) { face.material.map = FACES[k]; } };
}

function build() {
  FACES = { sleep: faceTex('sleep'), happy: faceTex('happy'), eat: faceTex('eat'), open: faceTex('open'), mouth: faceTex('mouth') };
  W.town = buildTown(ctx.scene, { sign: [['NEVER LET YOUR', '#2a1a12', 120], ['CLOUD TOUCH', '#2a1a12', 140], ['THE GROUND', '#b3121b', 150]], seed: 13 });
  const r = rng(31);
  // sky clouds (become babies)
  W.sky = [];
  for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = 40 + r() * 260; const c = makeCloud(7 + r() * 8, ['#ffffff', '#fff0f6', '#eef6ff'][i % 3], 100 + i); c.base = v3(60 + Math.cos(a) * d, 55 + r() * 70, -10 + Math.sin(a) * d); c.ph = r() * 6; c.setFace('sleep'); W.sky.push(c); }
  // rooftop sleepers + eaters
  W.roof = makeCloud(4, '#ffffff', 7); W.roof.base = v3(84, 22, -24);
  W.eater = makeCloud(5, '#fff6e0', 8); W.eater.base = v3(36, 34, 24);
  W.beams = []; for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 26), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); ctx.scene.add(b); W.beams.push(b); }
  // residents with their own clouds
  W.res = [];
  for (let i = 0; i < 6; i++) {
    const c = makeCharacter({ shirt: ['#ff6a6a', '#6ad06a', '#ffb03a', '#c06aff', '#3ad0c0', '#4a7ad0'][i], pants: '#2a3a5a', hair: ['#1a1a1a', '#6a4126', '#e0b050'][i % 3], hairStyle: i % 2 ? 'short' : 'shoulder', female: i % 2 === 0 });
    ctx.scene.add(c.root); const cl = makeCloud(1.5, ['#e8f4ff', '#fff0d0', '#e8ffe8', '#f6e8ff', '#ffe8e8', '#e8fffc'][i], 50 + i); W.res.push({ c, cl, x: 30 + i * 9, z: i % 2 ? 4 : -4, dir: i % 2 ? 1 : -1 });
  }
  // Chloe + pink cloud
  W.chloe = makeCharacter({ ...CAST.chloe });
  ctx.scene.add(W.chloe.root);
  W.pink = makeCloud(1.2, '#ffb6d8', 3);
  // mother
  // the sky cloud best placed for the 'babies' close-up (seen from the street looking west)
  const cam = v3(-6, 3, 6), dir = v3(-40, 87, -66).normalize();
  W.babyPick = W.sky.reduce((best, c) => { const d = c.base.clone().sub(cam); const sc = d.clone().normalize().dot(dir) - (d.length() < 60 ? 1 : 0); return !best || sc > best.sc ? { c, sc } : best; }, null).c;
  W.mother = new THREE.Group(); ctx.scene.add(W.mother);
  const mm = new THREE.MeshStandardMaterial({ color: '#7a6a8a', emissive: '#3a2a4a', emissiveIntensity: 0.8, roughness: 1, fog: false });
  const mg = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(mg, mm); const a = (i / 14) * Math.PI * 2; s.position.set(Math.cos(a) * 1.3, Math.sin(a * 2) * 0.25, Math.sin(a) * 0.6); s.scale.setScalar(0.8 + (i % 3) * 0.2); W.mother.add(s); }
  W.motherEyes = [-1, 1].map((k) => { const e = glowSprite('#ffe080', 0.9, 1); e.material.fog = false; e.position.set(k * 0.55, 0.2, 2.3); W.mother.add(e); return e; });
  W.mother.scale.setScalar(150);
}

function events() {
  const e = {};
  e.chloe = L(7).start - 0.05; e.grow = L(8).start + 0.6; e.lunch = L(9).start - 0.05; e.sunset = L(10).start - 0.05; e.descend = L(11).start;
  e.touch = L(14).start + 0.6; e.mouth = L(15).start + 0.5; e.eyes = L(18).start + 1.2; e.mother = L(21).start; e.black = ctx.dur - 0.2; return e;
}

function pinkState(t) {
  // follows Chloe -> grows over her house -> covers neighbourhood -> descends to the street
  if (t < EV.grow) return { p: W.chloe.root.position.clone().add(v3(0, 7.5 + Math.sin(t * 2) * 0.3, 0)), s: 1.2 };
  if (t < EV.lunch) { const k = easeInOut(clamp((t - EV.grow) / 2)); return { p: v3(60, lerp(9, 20, k), lerp(-14, -18, k)), s: lerp(1.2, 6, k) }; }
  if (t < EV.sunset) { const k = easeInOut(clamp((t - EV.lunch) / 2.2)); return { p: v3(60, lerp(26, 34, k), -22), s: lerp(9, 14, k) }; }
  if (t < EV.descend) { const k = easeInOut(clamp((t - EV.sunset) / 2.5)); return { p: v3(60, lerp(40, 64, k), -30), s: lerp(16, 34, k) }; }
  const k = easeIn(clamp((t - EV.descend) / (EV.touch - EV.descend))); return { p: v3(60, lerp(64, 34, k), -30), s: 34 };
}

const SHOTS = [
  { name: 'hook', t0: () => 0, t1: () => L(1).start - 0.05, f: (u) => ({ pos: v3(lerp(44, 50, u), lerp(4, 9, u), 6), look: v3(66, lerp(30, 50, u), -40), fov: 66 }) },
  { name: 'sleep', t0: () => L(1).start - 0.05, t1: () => L(2).start - 0.05, f: (u) => ({ pos: W.roof.base.clone().add(v3(-8, lerp(-2, -1, u), 14)), look: W.roof.base, fov: 52 }) },
  { name: 'eat', t0: () => L(2).start - 0.05, t1: () => L(3).start - 0.05, f: (u) => ({ pos: W.eater.base.clone().add(v3(6, -8, lerp(18, 15, u))), look: W.eater.base.clone().add(v3(0, 2, 0)), fov: 56 }) },
  { name: 'follow', t0: () => L(3).start - 0.05, t1: () => L(4).start - 0.05, f: (u) => { const p = W.res[1].c.root.position; return { pos: p.clone().add(v3(-7, 4, 9)), look: p.clone().add(v3(0, 5, 0)), fov: 58 }; } },
  { name: 'everyone', t0: () => L(4).start - 0.05, t1: () => L(5).start - 0.05, f: (u) => ({ pos: v3(lerp(20, 26, u), 7, 14), look: v3(60, 5, -2), fov: 60 }) },
  { name: 'rule', t0: () => L(5).start - 0.05, t1: () => EV.chloe, f: (u) => { const e = easeInOut(u); return { pos: v3(lerp(12, 9.6, e), lerp(7, 5.4, e), lerp(14, -5, e)), look: v3(9.1, lerp(7, 4.2, e), -16), fov: lerp(60, 52, e) }; } },
  { name: 'chloe', t0: () => EV.chloe, t1: () => L(8).start - 0.05, f: (u) => { const p = W.chloe.root.position; return { pos: p.clone().add(v3(5, 3.5, 8)), look: p.clone().add(v3(0, 5, 0)), fov: 56 }; } },
  { name: 'growing', t0: () => L(8).start - 0.05, t1: () => EV.lunch, f: (u) => ({ pos: v3(64, 3, -2), look: v3(60, 12, -18), fov: 64 }) },
  { name: 'lunch', t0: () => EV.lunch, t1: () => EV.sunset, f: (u) => ({ pos: v3(lerp(78, 74, u), 6, 22), look: v3(60, 22, -22), fov: 68 }) },
  { name: 'sunset', t0: () => EV.sunset, t1: () => L(11).start - 0.05, f: (u) => ({ pos: v3(-60, lerp(40, 55, u), 160), look: v3(60, 40, -30), fov: 66 }) },
  { name: 'descend', t0: () => L(11).start - 0.05, t1: () => L(12).start - 0.05, f: (u) => ({ pos: v3(60, 2.5, 18), look: v3(60, 50, -40), fov: 76 }) },
  { name: 'shout', t0: () => L(12).start - 0.05, t1: () => L(13).start - 0.05, f: (u) => ({ pos: v3(lerp(64, 63, u), 4.2, 2.5), look: v3(60, 5.5, -6), fov: 56 }) },
  { name: 'falling', t0: () => L(13).start - 0.05, t1: () => L(14).start - 0.05, f: (u) => ({ pos: v3(110, 10, 60), look: v3(60, 30, -30), fov: 66 }) },
  { name: 'touch', t0: () => L(14).start - 0.05, t1: () => L(15).start - 0.05, f: (u) => ({ pos: v3(62, 3, 14), look: v3(60, 20, -40), fov: 72 }) },
  { name: 'mouth', t0: () => L(15).start - 0.05, t1: () => L(18).start - 0.05, f: (u) => ({ pos: v3(lerp(62, 60, u), lerp(5, 7, u), lerp(46, 40, u)), look: v3(60, 30, 10), fov: 64 }) },
  { name: 'eyes', t0: () => L(18).start - 0.05, t1: () => L(19).start - 0.05, f: (u) => ({ pos: v3(-6, 3, 6), look: v3(lerp(-60, -40, u), 90, -60), fov: 74 }) },
  { name: 'babies', t0: () => L(19).start - 0.05, t1: () => EV.mother, f: (u) => { const c = W.babyPick.g.position; return { pos: v3(-6, 3, 6), look: c, fov: lerp(30, 22, u) }; } },
  { name: 'mother', t0: () => EV.mother, t1: () => 999, f: (u, t) => { const k = clamp((t - EV.mother) / 5); return { pos: v3(lerp(-6, -10, k), lerp(3, 10, easeOut(k)), lerp(6, 30, easeOut(k))), look: v3(-80, lerp(210, 290, k), -420), fov: lerp(72, 80, k) }; } },
];

function renderAt(t) {
  let env = t < EV.lunch ? SUNNY : t < EV.sunset ? NOONP : mixP(SUNNY, SUNSET, smooth(EV.sunset, EV.sunset + 1.5, t));
  if (t > EV.mother) env = mixP(SUNSET, SHADOW, smooth(EV.mother, EV.mother + 2.5, t));
  applyEnv(ctx, env);
  const shake = t > EV.touch && t < EV.touch + 2.5 ? 0.6 * Math.exp(-(t - EV.touch)) + 0.15 : 0;
  // sky clouds
  W.sky.forEach((c, i) => {
    c.g.position.copy(c.base).add(v3(Math.sin(t * 0.2 + c.ph) * 4, Math.sin(t * 0.5 + c.ph) * 1.5, 0));
    const open = t > EV.eyes + (i % 7) * 0.05;
    c.setFace(t > EV.mother ? 'open' : open ? (i % 2 ? 'open' : 'happy') : 'sleep');
    c.g.visible = t < EV.sunset || t > EV.touch;
  });
  W.roof.g.position.copy(W.roof.base).add(v3(0, Math.sin(t * 1.5) * 0.3, 0)); W.roof.setFace('sleep');
  W.eater.g.position.copy(W.eater.base); W.eater.setFace(Math.sin(t * 6) > 0 ? 'eat' : 'happy');
  W.beams.forEach((b, i) => { b.visible = t > L(2).start - 0.3 && t < L(3).start; b.position.copy(W.eater.base).add(v3(-6 + i * 3, 14, -3)); b.rotation.z = 0.25 - i * 0.1; b.lookAt(b.position.clone().add(v3(0, 0, 10))); });
  // residents + their clouds
  W.res.forEach((r, i) => {
    const x = r.x + ((t * 2.2 * r.dir) % 30 + 30) % 30 - 15;
    r.c.root.position.set(x, 0.3, r.z); r.c.root.rotation.y = r.dir > 0 ? Math.PI / 2 : -Math.PI / 2; pose(r.c, 'walk', t + i); r.c.setFace(t > EV.eyes ? 'scared' : 'smile');
    r.cl.g.position.set(x - r.dir * 1.5, 7.4 + Math.sin(t * 2 + i) * 0.3, r.z); r.cl.setFace(t > EV.eyes ? 'open' : 'happy');
    const vis = t < EV.chloe || t > EV.touch; r.c.root.visible = vis; r.cl.g.visible = vis;
  });
  // Chloe
  const C = W.chloe;
  if (t < EV.grow) { const k = clamp((t - EV.chloe) / 3.5); C.root.position.set(lerp(40, 56, k), 0.3, -4); C.root.rotation.y = Math.PI / 2; pose(C, 'walk', t); C.setFace('smile'); }
  else if (t < EV.descend) { C.root.position.set(62, 0.3, -6); C.root.rotation.y = Math.PI * 0.85; pose(C, 'lookUp', t, { amt: 0.6 }); C.setFace(t < EV.lunch ? 'wonder' : 'worried'); }
  else { const k = clamp((t - L(12).start) / 1.0); C.root.position.set(lerp(62, 60, k), 0.3, lerp(-14, -6, k)); C.root.rotation.y = Math.PI; pose(C, t < L(12).start + 1 ? 'run' : 'wave', t); C.arms[0].rotation.z = -2.6; C.setFace(t < EV.mouth ? 'scared' : 'shock'); }
  C.root.visible = t > EV.chloe - 0.1;
  // pink cloud
  const ps = pinkState(t); W.pink.g.position.copy(ps.p); W.pink.g.scale.setScalar(ps.s);
  W.pink.setFace(t > EV.mouth ? 'mouth' : t > EV.grow ? 'happy' : 'happy');
  W.pink.g.visible = t > EV.chloe - 0.1;
  W.pink.face.scale.set(1.5 * (t > EV.mouth ? 1.3 : 1), 1.5 * (t > EV.mouth ? 1.3 : 1), 1);
  // mother
  const mk = smooth(EV.mother - 0.5, EV.mother + 4, t);
  W.mother.visible = mk > 0; W.mother.position.set(lerp(40, -80, mk), lerp(700, 250, easeOut(mk)), -460);
  W.pink.g.visible = W.pink.g.visible && t < EV.mother + 1.0;
  W.motherEyes.forEach((e) => { e.material.opacity = smooth(EV.mother + 1.5, EV.mother + 2.5, t); });
  const sh = shotAt(SHOTS, t);
  frame(ctx, t, sh, { shake: shake + (sh.name === 'mother' ? 0.15 : 0), flash: Math.max(t < 0.12 ? 1 - t / 0.12 : 0, Math.exp(-Math.max(0, t - EV.touch) * 5) * (t > EV.touch ? 0.4 : 0)),
    flashColor: '#ffe0f0', black: t >= EV.black ? 1 : 0 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep13'); L = ctx.L; EV = events();
  build();
  return expose(ctx, renderAt, L(18).start + 1.6, EV);
}
