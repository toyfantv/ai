// Episode 11 — "The Stars Fall Every Night".
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, rng, mat, box, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { CAST } from '../engine/cast.js';
import { buildTown } from '../engine/town.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, NIGHT } from '../engine/stage.js';
import { canvasTex, glowSprite } from '../engine/props.js';

let ctx, L, EV;
const NITE = P({ ...NIGHT, sunI: 1.2, hemiI: 0.9, exposure: 1.2, top: '#0a0d2e', horizon: '#2a2560', haze: '#1c1a46', stars: 1.2, win: 1.5, lamp: 2.2 });
const GOLD = P({ ...NITE, hemiSky: '#ffcf6a', hemiGround: '#5a4020', hemiI: 1.6, sunColor: '#ffd27a', sunI: 1.6, exposure: 1.25, haze: '#3a2a40' });
const RIFT = P({ ...NITE, top: '#120424', horizon: '#3a1050', haze: '#26103a', hemiSky: '#a070ff', hemiI: 1.0, sunColor: '#c090ff', vig: 0.65 });
const W = {};
const H = (x, y, z) => v3(60 + x, y, -24 + z);

const STAR_TEX = canvasTex(128, 128, (c, w, h) => {
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(0.3, 'rgba(255,210,90,0.55)'); g.addColorStop(1, 'rgba(255,190,60,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = '#fffbe0'; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? 12 : 30; c.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
  c.closePath(); c.fill();
});

function makeStar(size, color = '#ffe7a0') {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: STAR_TEX, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size); return s;
}

function makeJar() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 20), new THREE.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.35, roughness: 0.05 }));
  g.add(glass);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.2, 20), mat('#c09040', { caustic: false })); lid.position.y = 0.72; g.add(lid);
  for (let i = 0; i < 5; i++) { const s = makeStar(0.55); s.position.set((Math.random() - 0.5) * 0.5, -0.4 + i * 0.18, (Math.random() - 0.5) * 0.5); g.add(s); }
  g.add(glowSprite('#ffd060', 3.2, 0.6));
  return g;
}

const riftVert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const riftFrag = `
uniform float uOpen, uTime, uFace; uniform sampler2D uTex; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
void main(){
  vec2 p = vUv - 0.5; p.x *= 1.0;
  float ang = atan(p.y, p.x);
  float jag = 0.75 + 0.35 * n(vec2(ang * 5.0, 1.0)) + 0.15 * n(vec2(ang * 19.0, 4.0));
  float r = length(p / vec2(0.62, 1.0)) / jag;
  float open = uOpen * 0.55;
  if (r > open + 0.06) discard;
  vec3 face = texture2D(uTex, vUv).rgb * uFace;
  vec3 voidc = mix(vec3(0.03, 0.0, 0.07), vec3(0.18, 0.05, 0.3), n(vUv * 8.0 + uTime * 0.1));
  vec3 col = mix(voidc, face, uFace);
  float edge = smoothstep(open + 0.06, open, r) * smoothstep(open - 0.08, open, r);
  col += vec3(0.9, 0.5, 1.0) * edge * 2.0;
  gl_FragColor = vec4(col, 1.0);
}`;

function buildFace() {
  return canvasTex(1024, 1024, (c, w, h) => {
    const g = c.createRadialGradient(512, 560, 80, 512, 560, 620); g.addColorStop(0, '#5a3a9a'); g.addColorStop(1, '#14082a');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const r = rng(5); for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(200,160,255,${r() * 0.15})`; c.fillRect(r() * w, r() * h, 2 + r() * 6, 2 + r() * 6); }
    // brow ridge + empty eye sockets
    c.fillStyle = '#2a1650'; c.fillRect(170, 330, 684, 70);
    for (const x of [340, 684]) {
      const eg = c.createRadialGradient(x, 470, 10, x, 470, 140); eg.addColorStop(0, '#000000'); eg.addColorStop(0.7, '#050010'); eg.addColorStop(0.85, '#9a60ff'); eg.addColorStop(1, 'rgba(90,40,160,0)');
      c.fillStyle = eg; c.beginPath(); c.ellipse(x, 470, 140, 115, 0, 0, 7); c.fill();
    }
    // mouth
    c.fillStyle = '#05000c'; c.beginPath(); c.ellipse(512, 800, 190, 38, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(190,140,255,0.5)'; c.lineWidth = 6; c.stroke();
    // glowing cracks
    c.strokeStyle = 'rgba(220,170,255,0.55)'; c.lineWidth = 4;
    for (let i = 0; i < 12; i++) { c.beginPath(); let x = r() * w, y = r() * h; c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 90; c.lineTo(x, y); } c.stroke(); }
  });
}

function build() {
  W.town = buildTown(ctx.scene, { sign: [['NEVER WISH', '#2a1a12', 150], ['FOR ANOTHER', '#2a1a12', 130], ['STAR', '#b3121b', 170]], seed: 11 });
  W.Hs = W.town.emma;
  // gentle falling stars + the storm (Points)
  const N = 5000, r = rng(3);
  const pos = new Float32Array(N * 3); W.sd = [];
  for (let i = 0; i < N; i++) W.sd.push({ x: -40 + r() * 200, z: -90 + r() * 160, t0: r(), sp: 8 + r() * 10, ph: r() * 6 });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  W.storm = new THREE.Points(geo, new THREE.PointsMaterial({ map: STAR_TEX, size: 1.8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: '#ffe7a0' }));
  W.storm.frustumCulled = false; ctx.scene.add(W.storm);
  // a few hero falling stars (sprites) + garden stars
  W.gentle = []; for (let i = 0; i < 26; i++) { const s = makeStar(1.4); ctx.scene.add(s); W.gentle.push({ s, x: 30 + r() * 70, z: -30 + r() * 50, t0: r() * 10, sp: 2.2 + r() * 1.5 }); }
  W.garden = []; for (let i = 0; i < 18; i++) { const s = makeStar(1.1); s.position.set(36 + (i % 9) * 6 + r() * 2, 0.7, (i < 9 ? -19 : 18) + r() * 2); ctx.scene.add(s); const gl = glowSprite('#ffcf60', 5, 0.5); gl.position.copy(s.position); ctx.scene.add(gl); W.garden.push(s); }
  // residents with jars
  W.npcs = [];
  for (let i = 0; i < 6; i++) {
    const c = makeCharacter({ shirt: ['#6ad06a', '#4a7ad0', '#ff6a6a', '#c06aff', '#3ad0c0', '#ffb03a'][i], pants: '#2a3a5a', hair: ['#1a1a1a', '#6a4126', '#e0b050'][i % 3], hairStyle: i % 2 ? 'short' : 'shoulder', female: i % 2 === 0 });
    c.root.position.set(38 + i * 7, 0.35, i % 2 ? 16 : -16); c.root.rotation.y = i % 2 ? Math.PI : 0; ctx.scene.add(c.root);
    const jar = makeJar(); jar.position.set(0, -1.75, 0.45); c.arms[1].add(jar); c.jar = jar; W.npcs.push(c);
  }
  // Ruby + her golden star
  W.ruby = makeCharacter({ ...CAST.ruby, caustic: false });
  ctx.scene.add(W.ruby.root);
  W.gold = makeStar(1.6, '#ffd35a'); ctx.scene.add(W.gold); W.goldGlow = glowSprite('#ffc840', 3.5, 0.35); ctx.scene.add(W.goldGlow);
  W.goldLight = new THREE.PointLight('#ffcf60', 0, 16, 1.4); ctx.scene.add(W.goldLight);
  W.streetLights = [0, 1, 2, 3].map((i) => { const l = new THREE.PointLight('#ffcf60', 0, 70, 1.2); l.position.set(30 + i * 30, 8, 0); ctx.scene.add(l); return l; });
  // the rift + creature face in the sky
  W.riftU = { uOpen: { value: 0 }, uTime: { value: 0 }, uFace: { value: 0 }, uTex: { value: buildFace() } };
  W.rift = new THREE.Mesh(new THREE.PlaneGeometry(900, 1100), new THREE.ShaderMaterial({ uniforms: W.riftU, vertexShader: riftVert, fragmentShader: riftFrag, fog: false }));
  W.rift.position.set(80, 520, -1100); W.rift.lookAt(60, 6, 0); ctx.scene.add(W.rift);
}

function events() {
  const e = {};
  e.window = L(8).start; e.hold = L(10).start; e.shake = L(12).start + 0.2; e.one = L(13).start + 0.3; e.ten = L(14).start + 0.2; e.hundreds = L(15).start + 0.2;
  e.thousands = L(16).start + 0.2; e.escape = L(20).start + 0.6; e.open = L(22).start + 0.6; e.face = L(23).start + 0.3; e.black = ctx.dur - 0.2; return e;
}

const SHOTS = [
  { name: 'hook', t0: () => 0, t1: () => L(1).start - 0.05, f: (u) => ({ pos: v3(lerp(40, 48, u), lerp(4, 5, u), 5), look: v3(lerp(60, 64, u), lerp(24, 14, u), -22), fov: 66 }) },
  { name: 'tiny-star', t0: () => L(1).start - 0.05, t1: () => L(3).start - 0.05, f: (u, t) => { const g = W.gentle[0].s.position; return { pos: g.clone().add(v3(3.5, 0.6, 5)), look: g.clone(), fov: 40 }; } },
  { name: 'garden', t0: () => L(3).start - 0.05, t1: () => L(4).start - 0.05, f: (u) => ({ pos: v3(lerp(54, 56, u), 2.6, -8.5), look: v3(52, 0.8, -19), fov: 58 }) },
  { name: 'jars', t0: () => L(4).start - 0.05, t1: () => L(5).start - 0.05, f: (u) => { const p = W.npcs[2].root.position; return { pos: p.clone().add(v3(lerp(5, 4, u), 4.6, 9)), look: p.clone().add(v3(0, 2.8, 0)), fov: 52 }; } },
  { name: 'jar-close', t0: () => L(5).start - 0.05, t1: () => L(6).start - 0.05, f: (u) => { const j = new THREE.Vector3(); W.npcs[2].jar.getWorldPosition(j); return { pos: j.clone().add(v3(1.2, 1.0, lerp(4.6, 3.8, u))), look: j, fov: 44 }; } },
  { name: 'rule', t0: () => L(6).start - 0.05, t1: () => L(8).start - 0.05, f: (u) => { const e = easeInOut(u); return { pos: v3(lerp(12, 9.6, e), lerp(7, 5.4, e), lerp(14, -5, e)), look: v3(9.1, lerp(7, 4.2, e), -16), fov: lerp(60, 52, e) }; } },
  { name: 'window', t0: () => L(8).start - 0.05, t1: () => L(9).start - 0.05, f: (u) => ({ pos: H(lerp(3.4, 3.0, u), 13.4, 2.2), look: H(0.4, 9.4, 8.4), fov: 58 }) },
  { name: 'gold-close', t0: () => L(9).start - 0.05, t1: () => L(10).start - 0.05, f: (u) => ({ pos: H(0.4, 10.6, lerp(4.4, 5.4, u)), look: W.gold.position.clone(), fov: 40 }) },
  { name: 'wish', t0: () => L(10).start - 0.05, t1: () => L(12).start - 0.05, f: (u) => ({ pos: H(lerp(0.2, 0.1, u), 12.3, lerp(8.6, 8.1, u)), look: H(0, 11.8, 5.3), fov: 44 }) },
  { name: 'shake', t0: () => L(12).start - 0.05, t1: () => L(13).start - 0.05, f: (u) => ({ pos: v3(70, 3, 14), look: v3(60, 40, -80), fov: 74 }) },
  { name: 'one', t0: () => L(13).start - 0.05, t1: () => L(14).start - 0.05, f: (u) => ({ pos: v3(64, 2.5, 12), look: v3(58, 26, -30), fov: 62 }) },
  { name: 'ten', t0: () => L(14).start - 0.05, t1: () => L(15).start - 0.05, f: (u) => ({ pos: v3(52, 4, 18), look: v3(62, 24, -30), fov: 66 }) },
  { name: 'hundreds', t0: () => L(15).start - 0.05, t1: () => L(16).start - 0.05, f: (u) => ({ pos: v3(lerp(74, 70, u), 10, 6), look: v3(58, 22, -30), fov: 70 }) },
  { name: 'thousands', t0: () => L(16).start - 0.05, t1: () => L(18).start - 0.05, f: (u) => ({ pos: v3(lerp(20, 40, u), lerp(30, 18, u), lerp(40, 30, u)), look: v3(70, 6, -6), fov: 70 }) },
  { name: 'amazed', t0: () => L(18).start - 0.05, t1: () => L(19).start - 0.05, f: (u) => ({ pos: v3(lerp(64.5, 64, u), 2.2, lerp(1.5, 1.0, u)), look: v3(60, 6.2, -6), fov: 60 }) },
  { name: 'notice', t0: () => L(19).start - 0.05, t1: () => L(20).start - 0.05, f: (u) => ({ pos: v3(60.3, 5.3, lerp(-2.6, -3.1, u)), look: v3(60, 5.1, -6), fov: 42 }) },
  { name: 'escaping', t0: () => L(20).start - 0.05, t1: () => L(22).start - 0.05, f: (u) => ({ pos: v3(58, 3, 6), look: v3(70, lerp(60, 200, easeInOut(u)), -260), fov: 72 }) },
  { name: 'rift', t0: () => L(22).start - 0.05, t1: () => L(23).start - 0.05, f: (u) => ({ pos: v3(60, 3, lerp(12, 8, u)), look: v3(78, 380, -1000), fov: 66 }) },
  { name: 'face', t0: () => L(23).start - 0.05, t1: () => 999, f: (u, t) => { const k = clamp((t - L(23).start) / 5); return { pos: v3(lerp(62, 44, easeOut(k)), lerp(3, 5, k), lerp(6, 3, k)), look: v3(80, lerp(400, 450, k), -1100), fov: lerp(62, 72, easeOut(k)) }; } },
];

function renderAt(t) {
  const storm = t > EV.one;
  const goldK = smooth(EV.thousands, EV.thousands + 2, t) * (1 - smooth(EV.open, EV.open + 1.5, t));
  const riftK = smooth(EV.open - 0.5, EV.open + 1.0, t);
  let env = mixP(NITE, GOLD, goldK); if (riftK > 0) env = mixP(env, RIFT, riftK);
  applyEnv(ctx, env);
  // gentle stars (before the wish)
  W.gentle.forEach((g, i) => {
    const cyc = 14; const k = ((t + g.t0 * cyc) % cyc) / cyc;
    g.s.position.set(g.x + Math.sin(t * 0.7 + i) * 2, lerp(60, 0.8, k), g.z + Math.cos(t * 0.5 + i) * 2);
    g.s.visible = t < EV.shake || i < 3;
  });
  W.gentle[0].s.position.set(56 + Math.sin(t) * 0.5, lerp(20, 8, clamp(t / 10)), -4);
  // storm: number of active stars ramps 1 -> 10 -> hundreds -> thousands; after EV.escape they fly upward
  const count = t < EV.one ? 0 : t < EV.ten ? 1 : t < EV.hundreds ? 10 : t < EV.thousands ? lerp(150, 400, clamp((t - EV.hundreds) / 1.5)) : lerp(400, 5000, clamp((t - EV.thousands) / 2.5));
  const pos = W.storm.geometry.attributes.position.array;
  const esc = smooth(EV.escape - 0.3, EV.escape + 1.5, t);
  W.sd.forEach((d, i) => {
    if (i >= count) { pos[i * 3 + 1] = -999; return; }
    const life = 7; const k = ((t * d.sp / 60 + d.t0) % 1);
    let y = lerp(140, -2, k);
    if (i < 1) { y = lerp(40, 2, clamp((t - EV.one) / 1.8)); pos[0] = 57; pos[2] = -14; pos[1] = Math.max(0.5, y); return; }
    if (esc > 0) y = lerp(y, 2 + ((t - EV.escape) * d.sp * 3 + d.t0 * 200) % 400, esc);
    pos[i * 3] = d.x + Math.sin(t * 0.8 + d.ph) * 2; pos[i * 3 + 1] = Math.max(0.5, y); pos[i * 3 + 2] = d.z + Math.cos(t * 0.6 + d.ph) * 2;
  });
  W.storm.geometry.attributes.position.needsUpdate = true;
  W.storm.material.size = t < EV.ten ? 5 : t < EV.hundreds ? 3.2 : 1.8;
  W.streetLights.forEach((l) => { l.intensity = goldK * 110; });
  W.garden.forEach((s) => { s.visible = true; });
  // golden star at the window, then in Ruby's hands
  const R = W.ruby;
  if (t < EV.window - 0.1) { R.root.position.set(48, 0.3, -4); R.root.rotation.y = 0.4; pose(R, 'lookUp', t, { amt: 0.5 }); R.setFace('wonder'); }
  else if (t < EV.shake) { R.root.position.copy(H(0, 7.4, 5.3)); R.root.rotation.y = 0; pose(R, t > EV.hold ? 'handsToWindow' : 'idle', t, { amt: -0.15 }); R.setFace(t > L(11).start ? 'smile' : 'wonder'); }
  else { R.root.position.set(60, 0.3, -6); R.root.rotation.y = 0.25; pose(R, t > L(19).start ? 'scared' : 'lookUp', t, { amt: 0.6 }); R.setFace(t < L(19).start ? 'wonder' : t < EV.face ? 'scared' : 'shock'); }
  const holding = t > EV.hold && t < EV.shake;
  const gp = holding ? H(0, 11.0, 6.6) : H(0.8, 9.6, 7.6);
  W.gold.position.copy(gp); W.goldGlow.position.copy(gp); W.goldLight.position.copy(gp).add(v3(0, 0.5, -1));
  const pulse = 1 + Math.sin(t * 6) * 0.08;
  W.gold.scale.setScalar(1.6 * pulse * (t > L(11).start && holding ? 1.4 : 1)); W.goldGlow.material.opacity = 0.45;
  W.gold.visible = W.goldGlow.visible = t > EV.window - 0.1 && t < EV.shake + 0.4; W.goldLight.intensity = W.gold.visible ? 6 : 0;
  // neighbours with jars
  W.npcs.forEach((c, i) => { pose(c, t > EV.thousands ? 'lookUp' : 'idle', t + i, { amt: 0.5 }); c.arms[1].rotation.x = -0.9; c.setFace(t > EV.escape ? 'scared' : 'smile'); c.root.visible = t < EV.window || t > EV.shake; });
  // rift + face
  W.riftU.uOpen.value = riftK * (1 + smooth(EV.face, EV.face + 3, t) * 0.4); W.riftU.uTime.value = t; W.riftU.uFace.value = smooth(EV.face - 0.4, EV.face + 1.6, t);
  W.rift.visible = riftK > 0.001;
  const sh = shotAt(SHOTS, t);
  let shake = sh.name === 'shake' ? 0.6 : 0; if (t > EV.open) shake = 0.25 + 0.3 * Math.exp(-(t - EV.open) * 1.5);
  const indoor = ['window', 'gold-close', 'wish'].includes(sh.name);
  frame(ctx, t, sh, { shake, shadows: !indoor, flash: Math.max(t < 0.12 ? 1 - t / 0.12 : 0, Math.exp(-Math.max(0, t - EV.thousands) * 3) * (t > EV.thousands ? 0.35 : 0)),
    flashColor: '#ffe08a', black: t >= EV.black ? 1 : 0 });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep11'); L = ctx.L; EV = events();
  build();
  ['wonder', 'smile', 'scared', 'shock'].forEach((f) => W.ruby.setFace(f));
  return expose(ctx, renderAt, L(16).start + 1.5, EV);
}
