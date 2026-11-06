// Episode 8 — "Everyone Has a Floating Number".
import * as THREE from 'three';
import { U, clamp, lerp, smooth, easeInOut, easeOut, v3, rng, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { buildTown } from '../engine/town.js';
import { initStage, applyEnv, shotAt, frame, expose, mixP, P, DAY, NIGHT } from '../engine/stage.js';
import { canvasTex, glowSprite } from '../engine/props.js';

let ctx, L, EV;
const DAYP = P({ ...DAY, exposure: 1.0 });
const MID = P({ ...NIGHT, sunI: 1.2, hemiI: 0.9, exposure: 1.2, top: '#0a1236', horizon: '#2a3070', haze: '#1c2250', win: 1.6, lamp: 3 });
const VOID = P({ ...DAY, top: '#ffffff', horizon: '#ffffff', haze: '#ffffff', sunDisc: 0, hemiSky: '#ffffff', hemiGround: '#dfe6ee', hemiI: 1.6, sunI: 1.2, exposure: 1.0, vig: 0.12, fogNear: 30, fogFar: 260 });
const W = { npcs: [] };

function numTex(text, color = '#5ff7ff') {
  return canvasTex(512, 160, (c, w, h) => {
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 120px ITTInter, sans-serif';
    c.shadowColor = color; c.shadowBlur = 28; c.lineWidth = 14; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText(text, w / 2, h / 2);
    c.fillStyle = color; c.fillText(text, w / 2, h / 2); c.shadowBlur = 0; c.fillStyle = '#ffffff'; c.globalAlpha = 0.5; c.fillText(text, w / 2, h / 2);
  });
}
function numSprite(text, color, h = 1.3) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: numTex(text, color), transparent: true, depthWrite: false, toneMapped: false }));
  s.scale.set(h * 3.2, h, 1); return s;
}

function build() {
  const town = buildTown(ctx.scene, { sign: null, seed: 8 });
  W.town = town; W.H = town.emma;
  const r = rng(81);
  const shirts = ['#ff6a6a', '#6ad06a', '#ffb03a', '#c06aff', '#3ad0c0', '#ffffff', '#ff6ac0', '#2a2a2a', '#4a7ad0', '#d0c04a'];
  const nums = ['2,481,906', '742', '1,093,554', '318', '56,201', '9,870,112', '455', '7,302', '612', '3,004,991', '881', '24,577', '190,233', '5,118,040'];
  const spots = [];
  // 14 neighbours on the street in front of Sophie's house (house at 60,-24; street z=0)
  for (let i = 0; i < 14; i++) spots.push(v3(36 + (i % 7) * 8 + (r() - 0.5) * 3, 0.3, i < 7 ? -2 + r() * 3 : 6 + r() * 4));
  spots.forEach((p, i) => {
    const c = makeCharacter({ shirt: shirts[i % shirts.length], pants: ['#2a3a5a', '#3a3a3a', '#5a3a2a', '#1a1a2a'][i % 4], hair: ['#1a1a1a', '#6a4126', '#e0b050', '#a04020'][i % 4],
      hairStyle: i % 3 ? 'short' : 'shoulder', female: i % 2 === 0, skin: ['#f4cca6', '#d9a57a', '#8a5a3a', '#f0c090'][i % 4] });
    c.root.position.copy(p); c.base = p.clone(); c.yaw0 = (r() - 0.5) * 3; c.walk = i % 3 === 0;
    const n = numSprite(nums[i]); n.position.y = 7.4; c.root.add(n); c.num = n;
    ctx.scene.add(c.root); W.npcs.push(c);
  });
  W.sophie = makeCharacter({ skin: '#f4cca6', shirt: '#8a4fd6', pocket: '#7a40c4', hood: true, pants: '#1b1b22', shoes: '#ffffff', shoeTrim: '#d0d0d0', hair: '#6b4226', hairStyle: 'long', female: true, caustic: false });
  ctx.scene.add(W.sophie.root);
  W.snum = { one: numTex('1', '#ff3b3b'), zero: numTex('0', '#ff3b3b'), mid: numTex('88', '#5ff7ff') };
  W.sNum = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.snum.mid, transparent: true, depthWrite: false, toneMapped: false }));
  W.sNum.scale.set(3.0, 1.15, 1); W.sNum.position.y = 5.95; W.sophie.root.add(W.sNum);
  W.sGlow = glowSprite('#ff3030', 5, 0); W.sGlow.position.y = 5.95; W.sophie.root.add(W.sGlow);
  // the counting-down number used in the countdown close-up
  W.countC = document.createElement('canvas'); W.countC.width = 512; W.countC.height = 160;
  W.countT = new THREE.CanvasTexture(W.countC); W.countT.colorSpace = THREE.SRGBColorSpace;
  W.count = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.countT, transparent: true, depthWrite: false, toneMapped: false }));
  W.count.scale.set(3.6, 1.12, 1); W.npcs[1].root.add(W.count); W.count.position.y = 7.4;
  // sky message
  const msg = canvasTex(2048, 512, (c, w, h) => {
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 150px ITTInter, sans-serif';
    c.shadowColor = '#ff2a2a'; c.shadowBlur = 50; c.fillStyle = '#ffeded';
    c.fillText('THE LAST REAL PERSON', w / 2, h * 0.32); c.fillText('HAS BEEN IDENTIFIED.', w / 2, h * 0.7);
  });
  W.msg = new THREE.Mesh(new THREE.PlaneGeometry(330, 82), new THREE.MeshBasicMaterial({ map: msg, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, fog: false }));
  W.msg.position.set(60, 235, -360); ctx.scene.add(W.msg);
  // void floor grid
  W.grid = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, map: canvasTex(1024, 1024, (c, w, h) => {
    c.strokeStyle = 'rgba(120,150,190,0.5)'; c.lineWidth = 2; for (let i = 0; i <= w; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } }) }));
  W.grid.material.map.wrapS = W.grid.material.map.wrapT = THREE.RepeatWrapping; W.grid.material.map.repeat.set(8, 8);
  W.grid.rotation.x = -Math.PI / 2; W.grid.position.set(60, 0.6, -6); ctx.scene.add(W.grid);
}

function drawCount(v) {
  const c = W.countC.getContext('2d'); c.clearRect(0, 0, 512, 160);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 110px ITTInter, sans-serif';
  c.shadowColor = '#5ff7ff'; c.shadowBlur = 26; c.lineWidth = 14; c.strokeStyle = 'rgba(0,0,0,0.85)';
  const s = v.toLocaleString('en-US'); c.strokeText(s, 256, 80); c.fillStyle = '#5ff7ff'; c.fillText(s, 256, 80);
  W.countT.needsUpdate = true;
}

function events() {
  const e = {};
  e.morning = L(6).start - 0.05; e.one = L(6).start + 1.9; e.lock = L(9).start + 0.6;
  e.night = L(10).start - 0.05; e.zero = L(11).start + 1.0; e.turn = L(13).start + 1.0; e.vanish = L(14).start + 0.25;
  e.msg = L(15).start + 1.0; e.out = L(17).start - 0.05; e.smile = L(18).start; e.glitch = L(19).start + 0.3;
  e.dissolve = L(20).start + 0.2; e.void = L(20).start + 2.6; e.black = ctx.dur - 0.2; return e;
}

const SP = (x, y, z) => v3(x, y, z); // world helper
const SHOTS = [
  { name: 'hook', t0: () => 0, t1: () => L(1).start - 0.05, f: (u) => ({ pos: v3(lerp(28, 44, u), 6.5, lerp(14, 12, u)), look: v3(lerp(48, 62, u), 7, -1), fov: 60 }) },
  { name: 'meaning', t0: () => L(1).start - 0.05, t1: () => L(2).start - 0.05, f: (u) => { const p = W.npcs[3].root.position; return { pos: p.clone().add(v3(1.5, 4.2, 6.5)), look: p.clone().add(v3(0, 6.6, 0)), fov: lerp(52, 46, u) }; } },
  { name: 'millions', t0: () => L(2).start - 0.05, t1: () => L(3).start - 0.05, f: (u) => { const p = W.npcs[5].root.position; return { pos: p.clone().add(v3(-1, lerp(5.5, 6.0, u), 9)), look: p.clone().add(v3(0, 6.4, 0)), fov: 52 }; } },
  { name: 'hundreds', t0: () => L(3).start - 0.05, t1: () => L(4).start - 0.05, f: (u) => { const p = W.npcs[6].root.position; return { pos: p.clone().add(v3(2, 5.2, 5.5)), look: p.clone().add(v3(0, 6.6, 0)), fov: 46 }; } },
  { name: 'countdown', t0: () => L(4).start - 0.05, t1: () => L(5).start - 0.05, f: (u) => { const p = W.npcs[1].root.position; return { pos: p.clone().add(v3(0.5, 7.0, lerp(7.5, 6.5, u))), look: p.clone().add(v3(0, 6.6, 0)), fov: 46 }; } },
  { name: 'sophie-curious', t0: () => L(5).start - 0.05, t1: () => EV.morning, f: (u) => ({ pos: v3(lerp(64, 63, u), 3.6, lerp(-1.5, -3, u)), look: v3(60.5, 5.6, -9), fov: 56 }) },
  { name: 'wake', t0: () => EV.morning, t1: () => L(7).start - 0.05, f: (u) => ({ pos: v3(lerp(59.6, 59.2, u), 11.8, lerp(-19.0, -19.4, u)), look: v3(55.4, 12.2, -22.4), fov: 62 }) },
  { name: 'panic', t0: () => L(7).start - 0.05, t1: () => L(9).start - 0.05, f: (u) => ({ pos: v3(58.2, 12.0, lerp(-19.8, -20.3, u)), look: v3(55.4, 12.5, -22.4), fov: lerp(56, 50, u) }) },
  { name: 'lock', t0: () => L(9).start - 0.05, t1: () => EV.night, f: (u) => ({ pos: v3(lerp(57, 57.6, u), 5.6, -26.5), look: v3(62.1, 4.0, -17.6), fov: 60 }) },
  { name: 'midnight-ext', t0: () => EV.night, t1: () => L(11).start - 0.05, f: (u) => ({ pos: v3(lerp(74, 70, u), 9.0, lerp(13, 10, u)), look: v3(60, 10, -20), fov: 62 }) },
  { name: 'zero', t0: () => L(11).start - 0.05, t1: () => L(12).start - 0.05, f: (u) => ({ pos: v3(60.4, 5.4, lerp(-21.4, -21.0, u)), look: v3(60.2, 5.6, -25.5), fov: 48 }) },
  { name: 'still-here', t0: () => L(12).start - 0.05, t1: () => L(13).start - 0.05, f: (u) => ({ pos: v3(60.0, 4.9, lerp(-22.0, -22.6, u)), look: v3(60.2, 4.8, -25.5), fov: 42 }) },
  { name: 'turn', t0: () => L(13).start - 0.05, t1: () => L(15).start - 0.05, f: (u) => ({ pos: v3(lerp(58.8, 58.5, u), 5.0, lerp(-22.0, -21.4, u)), look: v3(52, 3.0, 4), fov: 64 }) },
  { name: 'sky-msg', t0: () => L(15).start - 0.05, t1: () => EV.out, f: (u) => ({ pos: v3(60, lerp(11, 12, u), lerp(4, 1, u)), look: v3(60, lerp(150, 205, easeInOut(u)), -360), fov: 68 }) },
  { name: 'looks-around', t0: () => EV.out, t1: () => L(18).start - 0.05, f: (u) => ({ pos: v3(lerp(63.5, 63, u), 5.2, lerp(-1.4, -1.0, u)), look: v3(60, 4.9, -6), fov: 50 }) },
  { name: 'smiles', t0: () => L(18).start - 0.05, t1: () => L(19).start - 0.05, f: (u) => { const p = W.npcs[9].root.position; return { pos: p.clone().add(v3(lerp(0.5, 0, u), 5.2, -lerp(4.6, 3.8, u))), look: p.clone().add(v3(0, 4.9, 0)), fov: 46 }; } },
  { name: 'glitch', t0: () => L(19).start - 0.05, t1: () => L(20).start - 0.05, f: (u) => ({ pos: v3(60, 5.4, lerp(-4.5, -3.5, u)), look: v3(52, 4.5, 6), fov: 60 }) },
  { name: 'dissolve', t0: () => L(20).start - 0.05, t1: () => EV.void, f: (u) => ({ pos: v3(60 + lerp(4, 14, u), lerp(8, 30, easeInOut(u)), -6 + lerp(14, 44, easeInOut(u))), look: v3(60, 2, -6), fov: 64 }) },
  { name: 'void', t0: () => EV.void, t1: () => 999, f: (u, t) => { const k = clamp((t - EV.void) / 4); return { pos: v3(60 + lerp(3, 10, k), lerp(4.5, 16, easeOut(k)), -6 + lerp(9, 40, easeOut(k))), look: v3(60, lerp(4, 2, k), -6), fov: 56 }; } },
];

function renderAt(t) {
  const night = t >= EV.night;
  const voidK = smooth(EV.void - 0.8, EV.void + 0.4, t);
  let env = t < EV.morning ? DAYP : t < EV.night ? mixP(DAYP, P({ ...DAY, sunDir: v3(0.6, 0.3, 0.4), sunColor: '#ffe0c0', top: '#5a8fd8', horizon: '#ffe0c8', haze: '#f0dcc8' }), 1) : MID;
  if (voidK > 0) env = mixP(MID, VOID, voidK);
  applyEnv(ctx, env);
  // dissolve the world outward from Sophie
  U.uDissolveCenter.value.set(60, 0, -6); U.uDissolveKeep.value = 5;
  U.uDissolve.value = t > EV.dissolve ? clamp((t - EV.dissolve) / 2.6) ** 1.6 : 0;
  const gone = U.uDissolve.value * 900;
  W.H.group.visible = gone < 18;
  W.grid.material.opacity = voidK * 0.8; W.grid.visible = voidK > 0.01;
  ctx.sky.mesh.visible = voidK < 0.99;
  // neighbours
  const turnK = smooth(EV.turn - 0.25, EV.turn + 0.25, t);
  W.npcs.forEach((c, i) => {
    let p = c.base.clone();
    if (c.walk && !night) p.x += Math.sin(t * 0.4 + i) * 3;
    c.root.position.copy(p);
    const toS = Math.atan2((night ? 60 : 60) - p.x, (night ? -6 : -6) - p.z);
    const toWin = Math.atan2(60 - p.x, -18 - p.z);
    const target = t < EV.out ? toWin : toS;
    c.root.rotation.y = night ? lerp(c.yaw0, target, turnK) : c.yaw0 + Math.sin(t * 0.3 + i) * 0.2;
    if (!night && c.walk) pose(c, 'walk', t + i); else pose(c, night ? 'still' : (i % 4 === 0 ? 'lookUp' : 'idle'), t + i, { amt: 0.4 });
    if (night && t > EV.turn) c.neck.rotation.x = t < EV.out ? -0.35 : 0;
    const vanish = smooth(EV.vanish + i * 0.03, EV.vanish + 0.15 + i * 0.03, t);
    c.num.visible = vanish < 0.99; c.num.scale.set(4.2 * (1 + vanish * 0.6), 1.3 * (1 + vanish * 0.6), 1); c.num.material.opacity = 1 - vanish;
    let face = night ? (t > EV.smile ? 'creepy' : 'neutral') : ['smile', 'curious', 'neutral', 'wonder'][i % 4];
    if (t > EV.glitch) {
      const g = noise1(t * 30 + i * 7);
      face = g > 0.3 ? 'shock' : g < -0.4 ? 'neutral' : 'creepy';
      c.head.position.x = (noise1(t * 40 + i) > 0.5 ? 0.35 : 0) * Math.sign(noise1(t * 13 + i));
    } else c.head.position.x = 0;
    c.setFace(face);
  });
  W.count.visible = t < L(5).start + 0.2;
  if (W.count.visible) drawCount(Math.max(1284, Math.round(1300 - Math.max(0, t - L(4).start) * 7)));
  // Sophie
  const S = W.sophie;
  S.root.rotation.set(0, 0, 0);
  if (t < EV.morning) { S.root.position.set(60.5, 0.3, -9); S.root.rotation.y = 0.35; pose(S, 'lookUp', t, { amt: 0.5 }); S.setFace('curious'); W.sNum.material.map = W.snum.mid; }
  else if (t < L(9).start - 0.05) {
    // in bed upstairs (bed at local -5.4, 8, 0.5 => world 54.6, -23.5), wakes and sits up
    S.root.position.set(55.4, 7.4, -22.4); S.root.rotation.set(0, 0.85, 0);
    pose(S, t < L(7).start ? 'idle' : 'scared', t, { amt: -0.2 }); S.neck.rotation.x = t < EV.one ? 0 : -0.4;
    if (t < EV.morning + 0.9) { S.arms[0].rotation.z = 2.6; S.arms[1].rotation.z = -2.6; }
    S.setFace(t < EV.one ? 'neutral' : t < L(7).start ? 'worried' : 'scared'); W.sNum.material.map = t < EV.one ? W.snum.mid : W.snum.one;
  } else if (t < EV.night) { S.root.position.set(61.6, 0, -19.4); S.root.rotation.y = Math.PI; pose(S, 'scared', t); S.setFace('scared'); W.sNum.material.map = W.snum.one; }
  else if (t < EV.out) {
    const atWin = t > L(13).start - 0.1;
    S.root.position.set(atWin ? 56.0 : 60.2, 0, atWin ? -18.8 : -25.5); S.root.rotation.y = 0;
    pose(S, 'scared', t, { amt: atWin ? -0.3 : -0.1 }); S.neck.rotation.x = t < L(12).start ? -0.55 : 0;
    S.setFace(t < EV.zero ? 'scared' : t < L(13).start ? 'shock' : 'scared');
    W.sNum.material.map = t < EV.zero ? W.snum.one : W.snum.zero;
  } else { S.root.position.set(60, 0.3, -6); S.root.rotation.y = 0.3 + Math.sin(t * 1.6) * 0.6 * (t < L(18).start ? 1 : 0.2); pose(S, 'scared', t); S.setFace(t > EV.void ? 'worried' : 'scared'); W.sNum.material.map = W.snum.zero; }
  const zeroGlow = t > EV.zero ? Math.exp(-(t - EV.zero) * 2) : 0;
  W.sGlow.material.opacity = (t > EV.one && t < EV.night) || t > EV.zero ? 0.5 + zeroGlow * 0.5 : 0;
  W.sNum.visible = !(t > EV.void + 0.5);
  W.H.warmUp.intensity = night ? 30 : 18; W.H.warmDown.intensity = night ? 24 : 14;
  // sky message
  W.msg.visible = t > EV.msg - 0.4 && t < EV.void;
  W.msg.material.opacity = smooth(EV.msg - 0.4, EV.msg + 0.5, t) * (0.85 + 0.15 * Math.sin(t * 20)) * (1 - smooth(EV.dissolve, EV.dissolve + 1, t));
  const sh = shotAt(SHOTS, t);
  const indoor = ['wake', 'panic', 'lock', 'zero', 'still-here', 'turn'].includes(sh.name);
  const glitchy = t > EV.glitch && t < EV.void;
  const flash = Math.max(t < 0.12 ? 1 - t / 0.12 : 0, Math.exp(-Math.max(0, t - EV.zero) * 6) * (t > EV.zero ? 0.45 : 0), voidK > 0 && voidK < 1 ? voidK * 0.3 : 0);
  frame(ctx, t, sh, { shake: glitchy ? 0.25 : sh.name === 'panic' ? 0.15 : 0, flash, flashColor: t > EV.zero ? '#ff4040' : '#ffffff',
    black: t >= EV.black ? 1 : 0, shadows: !indoor,
    tint: glitchy && noise1(t * 25) > 0.3 ? `linear-gradient(90deg, rgba(0,255,255,0.18), rgba(255,0,200,0.18))` : null });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep08'); L = ctx.L; EV = events();
  build();
  ['curious', 'neutral', 'worried', 'scared', 'shock'].forEach((f) => W.sophie.setFace(f));
  return expose(ctx, renderAt, L(13).start + 1.8, EV);
}
