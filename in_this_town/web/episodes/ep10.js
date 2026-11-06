// Episode 10 — "Every Mirror Shows Tomorrow". Mirrors show live renders of an off-screen "tomorrow" stage.
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng, mat, box, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { CAST } from '../engine/cast.js';
import { buildTown } from '../engine/town.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, NIGHT } from '../engine/stage.js';
import { canvasTex, glowSprite } from '../engine/props.js';

let ctx, L, EV;
const ROOMN = P({ ...NIGHT, sunI: 0.9, hemiI: 0.8, exposure: 1.15, win: 1.4 });
const AVA = { ...CAST.ava, caustic: false };
const W = {};
const H = (x, y, z) => v3(60 + x, y, -24 + z);  // hero house local -> world (no rotation)

// ---------- the "tomorrow" stage, rendered into textures ----------
function buildStudio() {
  const s = new THREE.Scene(); s.background = new THREE.Color('#e6b8c8');
  s.add(new THREE.HemisphereLight('#fff0f4', '#806070', 1.4));
  const d = new THREE.DirectionalLight('#ffffff', 1.6); d.position.set(2, 5, 6); s.add(d);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), new THREE.MeshStandardMaterial({ color: '#d9a8bc' })); wall.position.set(0, 6, -4); s.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), new THREE.MeshStandardMaterial({ color: '#b98a6e' })); floor.rotation.x = -Math.PI / 2; s.add(floor);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(5, 1.4, 3), new THREE.MeshStandardMaterial({ color: '#ff9ec6' })); bed.position.set(-5, 0.7, -2.5); s.add(bed);
  const lampG = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff2c0' })); lampG.position.set(4.5, 4.2, -3.5); s.add(lampG);
  const actor = makeCharacter(AVA); s.add(actor.root);
  const npc = makeCharacter({ shirt: '#3a6ad8', pants: '#222', hair: '#6a4126', hairStyle: 'short', caustic: false }); s.add(npc.root);
  const tears = [-1, 1].map((k) => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.05), new THREE.MeshBasicMaterial({ color: '#6ad0ff' })); actor.neck.add(t); t.position.set(k * 0.32, 0.35, 0.66); return t; });
  const cam = new THREE.PerspectiveCamera(40, 0.75, 0.1, 100);
  const rts = {};
  for (const k of ['tomorrow', 'npc', 'cry', 'run', 'still', 'point', 'look', 'empty', 'hand']) {
    rts[k] = new THREE.WebGLRenderTarget(384, 512); rts[k].texture.colorSpace = THREE.SRGBColorSpace;
  }
  return { s, actor, npc, cam, rts, tears };
}

function renderStudio(t, kinds) {
  const S = W.studio, R = ctx.renderer;
  const a = S.actor;
  for (const k of kinds) {
    a.root.visible = k !== 'empty' && k !== 'npc'; S.npc.root.visible = k === 'npc';
    a.root.position.set(0, 0, 0); a.root.rotation.set(0, 0, 0); S.tears.forEach((m) => { m.visible = false; });
    S.cam.position.set(0, 2.9, 13.5); S.cam.lookAt(0, 2.7, 0); S.cam.fov = 40;
    const look = t > EV.look;
    switch (k) {
      case 'tomorrow': pose(a, 'wave', t); a.setFace('smile'); a.root.rotation.y = 0.2; break;
      case 'npc': pose(S.npc, 'wave', t + 1); S.npc.setFace('smile'); S.npc.root.rotation.y = -0.2; break;
      case 'cry': pose(a, 'idle', t); a.neck.rotation.x = look ? 0 : 0.45; a.root.rotation.y = look ? 0 : 0.6; a.setFace(look ? 'neutral' : 'worried'); S.tears.forEach((m) => { m.visible = !look; m.position.y = 0.35 - ((t * 0.8) % 0.5); }); break;
      case 'run': a.root.rotation.y = look ? 0 : Math.PI / 2; a.root.position.x = look ? 0 : ((t * 4) % 10) - 5; pose(a, look ? 'still' : 'run', t); a.setFace(look ? 'neutral' : 'scared'); break;
      case 'still': pose(a, 'still', t); a.setFace('creepy'); break;
      case 'look': pose(a, 'still', t); a.setFace('neutral'); break;
      case 'point': pose(a, 'still', t); a.arms[1].rotation.x = -1.5; a.arms[1].rotation.y = 0; a.root.rotation.y = -0.5; a.neck.rotation.y = 0.5; a.setFace('worried'); break;
      case 'hand': pose(a, 'still', t); a.setFace('creepy'); a.arms[1].rotation.x = -1.55; a.root.position.set(0.6, 0, 6.5); S.cam.position.set(0, 3.4, 13.5); S.cam.lookAt(0, 3.4, 0); break;
      case 'empty': break;
    }
    S.cam.updateProjectionMatrix();
    R.setRenderTarget(S.rts[k]); R.render(S.s, S.cam);
  }
  R.setRenderTarget(null);
}

function shardShape(r, rad, regular = false) {
  const n = regular ? 6 : 4 + Math.floor(r() * 3), pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + (regular ? 0.3 : r() * 0.6); const d = rad * (regular ? 1.0 + r() * 0.08 : 0.6 + r() * 0.5); pts.push(new THREE.Vector2(Math.cos(a) * d, Math.sin(a) * d)); }
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
  const uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / (rad * 2.4) + 0.5, p.getY(i) / (rad * 2.4) + 0.5);
  return g;
}

function build() {
  W.town = buildTown(ctx.scene, { sign: null, seed: 10 });
  const Hs = W.town.emma; W.Hs = Hs; Hs.warmUp.intensity = 22;
  W.studio = buildStudio();
  // wall mirror on the right wall of the bedroom (local x ~ 6.9), facing -x
  const frameM = mat('#e8d0a0', { caustic: false });
  const wm = new THREE.Group(); wm.position.copy(H(6.85, 10.8, -0.6)); wm.rotation.y = -Math.PI / 2; ctx.scene.add(wm);
  box(2.8, 4.6, 0.2, frameM, 0, 0, -0.05, wm, false);
  W.wallGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.2), new THREE.MeshBasicMaterial({ map: W.studio.rts.tomorrow.texture, toneMapped: false }));
  W.wallGlass.position.z = 0.07; wm.add(W.wallGlass); W.wallMirror = wm;
  W.crack = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.2), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: canvasTex(384, 672, (c, w, h) => {
    const r = rng(4); c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 4;
    for (let i = 0; i < 16; i++) { c.beginPath(); let x = w * 0.45, y = h * 0.4; c.moveTo(x, y); const a = r() * 6.28; for (let k = 0; k < 5; k++) { x += Math.cos(a + (r() - 0.5)) * 70; y += Math.sin(a + (r() - 0.5)) * 70; c.lineTo(x, y); } c.stroke(); } }) }));
  W.crack.position.z = 0.09; wm.add(W.crack);
  // hand mirror Ava drops
  const hm = new THREE.Group(); ctx.scene.add(hm); W.handMirror = hm;
  box(1.5, 2.0, 0.12, frameM, 0, 0, -0.04, hm, false);
  W.handGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.8), new THREE.MeshBasicMaterial({ map: W.studio.rts.tomorrow.texture, toneMapped: false })); W.handGlass.position.z = 0.03; hm.add(W.handGlass);
  // shards
  const r = rng(12); W.shards = [];
  const kinds = ['cry', 'run', 'still', 'cry', 'run', 'look'];
  for (let i = 0; i < 40; i++) {
    const rad = i < 6 ? 0.62 : 0.18 + r() * 0.3;
    const m = new THREE.Mesh(shardShape(r, rad, i < 6), new THREE.MeshBasicMaterial({ map: W.studio.rts.cry.texture, toneMapped: false, side: THREE.DoubleSide }));
    const a = r() * Math.PI * 2, d = i < 6 ? 0.6 + i * 0.45 : 0.4 + r() * 3.2;
    m.userData = { tx: Math.cos(a) * d, tz: Math.sin(a) * d, kind: i < 6 ? kinds[i] : kinds[Math.floor(r() * 6)], spin: (r() - 0.5) * 0.6, delay: r() * 0.15 };
    m.rotation.x = -Math.PI / 2; ctx.scene.add(m); W.shards.push(m);
  }
  W.shards[2].userData.kind = 'still'; W.shards[5].userData.kind = 'point';
  W.ava = makeCharacter(AVA); ctx.scene.add(W.ava.root);
  W.ava2 = makeCharacter(AVA); ctx.scene.add(W.ava2.root);
  W.npc = makeCharacter({ shirt: '#3a6ad8', pants: '#222', hair: '#6a4126', hairStyle: 'short' }); ctx.scene.add(W.npc.root);
  // eerie cold light that rises during the shard scenes
  W.key = new THREE.PointLight('#ffd8c0', 25, 14, 1.4); W.key.position.copy(H(0.3, 12.6, 5.2)); ctx.scene.add(W.key);
  W.cold = new THREE.PointLight('#8fb0ff', 0, 18, 1.4); W.cold.position.copy(H(0.6, 8.2, 2.6)); ctx.scene.add(W.cold);
}

const SHARD_C = H(0.6, 7.46, 2.4);
function events() {
  const e = {};
  e.rule = L(3).start - 0.05; e.drop = L(5).start + 1.6; e.shatter = L(6).start + 0.1; e.look = L(13).start + 0.9; e.empty = L(18).start + 1.2;
  e.hand = L(20).start + 0.4; e.out = L(23).start + 0.2; e.black = ctx.dur - 0.2; return e;
}

const SHOTS = [
  { name: 'hook', t0: () => 0, t1: () => L(1).start - 0.05, f: (u) => ({ pos: H(lerp(1.2, 1.8, u), 11.8, lerp(2.8, 2.2, u)), look: H(6.85, 10.9, -0.6), fov: 56 }) },
  { name: 'mirror-close', t0: () => L(1).start - 0.05, t1: () => L(2).start - 0.05, f: (u) => ({ pos: H(lerp(4.0, 4.4, u), 11.4, 1.2), look: H(6.85, 10.9, -0.6), fov: lerp(50, 44, u) }) },
  { name: 'npc', t0: () => L(2).start - 0.05, t1: () => EV.rule, f: (u) => ({ pos: H(lerp(1.0, 1.6, u), 11.4, lerp(-1.5, -1.0, u)), look: H(6.85, 10.6, -0.6), fov: 54 }) },
  { name: 'rule', t0: () => EV.rule, t1: () => L(5).start - 0.05, f: (u) => ({ pos: H(lerp(4.0, 4.6, u), 11.0, 1.1), look: H(6.85, 10.9, -0.6), fov: 46 }) },
  { name: 'drop', t0: () => L(5).start - 0.05, t1: () => EV.shatter, f: (u) => ({ pos: H(lerp(-3.6, -3.2, u), 11.9, 6.0), look: H(0.4, 9.8, 1.6), fov: 62 }) },
  { name: 'shatter', t0: () => EV.shatter, t1: () => L(7).start - 0.05, f: (u) => ({ pos: SHARD_C.clone().add(v3(0.2, lerp(6.2, 5.4, u), 0.4)), look: SHARD_C, fov: 66, roll: 0 }) },
  { name: 'herself', t0: () => L(7).start - 0.05, t1: () => L(9).start - 0.05, f: (u) => ({ pos: SHARD_C.clone().add(v3(lerp(-1.5, 1.0, u), 3.4, 3.2)), look: SHARD_C.clone().add(v3(0, 0, 0.4)), fov: 54 }) },
  ...[['cry', 9, 0], ['run', 10, 1], ['still', 11, 2]].map(([n, li, si]) => ({ name: `shard-${n}`, t0: () => L(li).start - 0.05, t1: () => (n === 'still' ? L(13).start : L(li + 1).start) - 0.05,
    f: (u) => { const s = W.shards[si].position; return { pos: s.clone().add(v3(0, lerp(1.9, 1.6, u), 0.02)), look: s.clone(), fov: 48 }; } })),
  { name: 'all-look', t0: () => L(13).start - 0.05, t1: () => L(14).start - 0.05, f: (u) => ({ pos: SHARD_C.clone().add(v3(0, lerp(4.2, 3.6, u), 0.2)), look: SHARD_C, fov: 70 }) },
  { name: 'pointing', t0: () => L(14).start - 0.05, t1: () => L(16).start - 0.05, f: (u) => { const s = W.shards[5].position; return { pos: s.clone().add(v3(0, lerp(2.2, 1.8, u), 0.02)), look: s.clone(), fov: 50 }; } },
  { name: 'turn', t0: () => L(16).start - 0.05, t1: () => L(17).start - 0.05, f: (u) => ({ pos: H(0.6, 11.6, -2.2), look: H(-0.6, 11.6, 3.2), fov: 56 }) },
  { name: 'nobody', t0: () => L(17).start - 0.05, t1: () => L(18).start - 0.05, f: (u) => ({ pos: H(-1.0, 11.8, 4.2), look: H(lerp(-2, 1, u), 10.5, -5.5), fov: 64 }) },
  { name: 'looked-back', t0: () => L(18).start - 0.05, t1: () => L(19).start - 0.05, f: (u) => ({ pos: SHARD_C.clone().add(v3(0, lerp(4.0, 3.2, u), 0.3)), look: SHARD_C, fov: 70 }) },
  { name: 'smiling-one', t0: () => L(19).start - 0.05, t1: () => EV.hand - 0.1, f: (u) => { const s = W.shards[2].position; return { pos: s.clone().add(v3(0, lerp(2.8, 2.3, u), 0.02)), look: s.clone(), fov: 48 }; } },
  { name: 'hand', t0: () => EV.hand - 0.1, t1: () => L(23).start - 0.05, f: (u) => { const s = W.shards[2].position; return { pos: s.clone().add(v3(0, lerp(1.6, 1.3, u), 0.02)), look: s.clone(), fov: 46 }; } },
  { name: 'step-out', t0: () => L(23).start - 0.05, t1: () => 999, f: (u, t) => { const k = clamp((t - EV.out) / 3.5); return { pos: H(lerp(-1.9, -2.6, easeOut(k)), lerp(12.2, 12.6, k), lerp(4.8, 5.8, easeOut(k))), look: H(0.7, 11.8, 2.0), fov: lerp(52, 60, k) }; } },
];

function renderAt(t) {
  applyEnv(ctx, ROOMN);
  const after = t > EV.shatter;
  // what the mirrors need this frame
  const sh0 = SHOTS.find((s) => t >= s.t0() && t < s.t1()) || SHOTS[SHOTS.length - 1];
  const kinds = new Set();
  if (!after) { kinds.add(t > L(2).start - 0.05 && t < EV.rule ? 'npc' : 'tomorrow'); }
  else W.shards.forEach((m) => kinds.add(shardKind(m, t)));
  renderStudio(t, [...kinds]);
  // wall mirror
  W.wallGlass.material.map = W.studio.rts[t > L(2).start - 0.05 && t < EV.rule ? 'npc' : 'tomorrow'].texture;
  W.crack.visible = t >= EV.rule && t < L(5).start;
  W.wallGlass.material.color.set(W.crack.visible ? '#ff8080' : '#ffffff');
  // hand mirror: held, then falls
  const hm = W.handMirror; const fall = clamp((t - EV.drop) / 0.55);
  hm.visible = t > L(5).start - 0.05 && t < EV.shatter;
  hm.position.copy(H(0.3, lerp(10.3, 7.6, easeIn(fall)), lerp(1.9, 2.4, fall))); hm.rotation.set(lerp(-0.3, -1.4, easeIn(fall)), 0, fall * 0.8);
  // shards burst outward and settle
  W.shards.forEach((m, i) => {
    const u = m.userData; const k = easeOut(clamp((t - EV.shatter - u.delay) / 0.5));
    m.visible = after;
    m.position.copy(SHARD_C).add(v3(u.tx * k, 0.01 + i * 0.0005 + Math.sin(k * Math.PI) * 0.4, u.tz * k));
    m.rotation.set(-Math.PI / 2, 0, u.spin + (1 - k) * 3);
    m.material.map = W.studio.rts[shardKind(m, t)].texture;
  });
  W.cold.intensity = after ? lerp(0, 30, smooth(EV.shatter, EV.shatter + 2, t)) : 0;
  W.Hs.warmUp.intensity = after ? lerp(22, 10, smooth(L(13).start, L(16).start, t)) : 22;
  // Ava
  const A = W.ava;
  if (t < L(2).start - 0.05 || (t >= EV.rule && t < L(5).start)) { A.root.position.copy(H(2.9, 7.4, -0.8)); A.root.rotation.y = Math.PI / 2; pose(A, 'still', t); A.setFace('curious'); }
  else if (t < EV.rule) { A.root.position.copy(H(-2, 7.4, -3)); A.root.rotation.y = 0; pose(A, 'idle', t); A.setFace('smile'); }
  else if (t < EV.shatter) { A.root.position.copy(H(0.3, 7.4, 0.6)); A.root.rotation.y = 0; pose(A, 'handsToWindow', t, { amt: -0.3 }); A.neck.rotation.x = 0.35; if (t > EV.drop) { A.arms[0].rotation.x = -0.6; A.arms[1].rotation.x = -0.6; } A.setFace(t > EV.drop ? 'shock' : 'curious'); }
  else if (t < L(16).start) { A.root.position.copy(H(0.4, 7.4, -0.6)); A.root.rotation.y = 0; pose(A, 'scared', t, { amt: -0.6 }); A.setFace(t > L(13).start ? 'scared' : 'worried'); }
  else if (t < L(18).start) { const tk = smooth(L(16).start, L(16).start + 1.2, t); A.root.position.copy(H(0.4, 7.4, -0.6)); A.root.rotation.y = lerp(0, Math.PI, tk); pose(A, 'scared', t, { amt: 0.0 }); A.setFace('scared'); }
  else { A.root.position.copy(H(-0.55, 7.4, 2.0)); A.root.rotation.y = t > EV.out ? Math.PI / 2 : 0; pose(A, 'scared', t, { amt: -0.4 }); A.setFace(t > EV.out ? 'shock' : 'scared'); }
  // the reflection steps out of the smiling shard
  const out = clamp((t - EV.out) / 1.4);
  W.ava2.root.visible = t > EV.out;
  W.ava2.root.position.copy(H(1.25, lerp(2.6, 7.4, easeOut(out)), 2.0)); W.ava2.root.rotation.y = -Math.PI / 2;
  pose(W.ava2, 'still', t); W.ava2.setFace('creepy');
  if (out < 1) W.ava2.root.position.x += noise1(t * 40) * 0.08;
  // npc (not used in the room; parked outside)
  W.npc.root.visible = false;
  const sh = shotAt(SHOTS, t);
  frame(ctx, t, sh, { shake: sh.name === 'shatter' ? 0.4 * (1 - clamp((t - EV.shatter) / 0.6)) : 0, shadows: false,
    flash: Math.max(t < 0.12 ? 1 - t / 0.12 : 0, Math.exp(-Math.max(0, t - EV.shatter) * 8) * (after ? 0.5 : 0), Math.exp(-Math.max(0, t - EV.out) * 5) * (t > EV.out ? 0.3 : 0)),
    flashColor: '#dfe8ff', black: t >= EV.black ? 1 : 0, vig: after ? 0.2 : 0 });
  return sh.name;
}

function shardKind(m, t) {
  if (t > EV.empty) return m === W.shards[2] ? (t > EV.hand ? 'hand' : 'still') : 'empty';
  if (t > EV.look) return m === W.shards[5] ? 'point' : m === W.shards[2] ? 'still' : 'look';
  return m.userData.kind === 'point' ? 'cry' : m.userData.kind;
}

export async function setup() {
  ctx = await initStage('ep10'); L = ctx.L; EV = events();
  build();
  ['curious', 'smile', 'shock', 'worried', 'scared'].forEach((f) => W.ava.setFace(f));
  return expose(ctx, renderAt, ctx.dur - 1.0, EV);
}
