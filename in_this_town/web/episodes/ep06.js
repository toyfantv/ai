// Episode 6 — "In This Town, The Ocean Is in the Sky". Every frame is a pure function of t.
import * as THREE from 'three';
import { U, clamp, lerp, smooth, easeInOut, easeOut, easeIn, v3, noise1, rng } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { buildTown, winMat, lampMat } from '../engine/town.js';
import { buildOcean, OCEAN_Y } from '../engine/ocean.js';
import { makeWhale, makeSchool, makeJellies, WT } from '../engine/creatures.js';

let THUMB = false;
let renderer, scene, camera, hemi, sun, amb, town, ocean, whales, schools, jellies, emma, mom, dad, npcs, TL, EV;

// ---------- palettes ----------
const P = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? new THREE.Color(v) : v]));
const DAY = P({ deep: '#0b4f8a', shallow: '#3fc1f0', light: '#c8f6ff', haze: '#a9dcf2', sun: '#fff1dc', sunI: 2.3, sky: '#a8ddff', ground: '#6a9a5a', hemiI: 0.95,
  caus: '#9fe6ff', causI: 0.34, tint: '#3fa6e6', tintI: 0.22, win: 0.0, lamp: 0.15, exposure: 0.95, vig: 0.25 });
const NIGHT = P({ deep: '#040a26', shallow: '#0f2a66', light: '#6a86ff', haze: '#0b1434', sun: '#7a8cff', sunI: 0.35, sky: '#2a3a8a', ground: '#0a1020', hemiI: 0.55,
  caus: '#5a7aff', causI: 0.16, tint: '#0f1f5a', tintI: 0.35, win: 1.4, lamp: 3.0, exposure: 1.05, vig: 0.45 });
const EVENING = P({ deep: '#20306e', shallow: '#6a82c8', light: '#ffd6b8', haze: '#d0a8bc', sun: '#ffb486', sunI: 1.9, sky: '#c8a8d8', ground: '#5a5a50', hemiI: 1.0,
  caus: '#ffc8a8', causI: 0.24, tint: '#5a6ab0', tintI: 0.25, win: 0.8, lamp: 1.2, exposure: 1.0, vig: 0.35 });
const PURPLE = P({ deep: '#34105a', shallow: '#a04ad6', light: '#ffb0ff', haze: '#8e5aa0', sun: '#d88aff', sunI: 1.5, sky: '#b080d8', ground: '#3a2a40', hemiI: 0.95,
  caus: '#ff9aff', causI: 0.26, tint: '#7a2aa0', tintI: 0.3, win: 0.8, lamp: 1.2, exposure: 1.0, vig: 0.45 });
const RED = P({ deep: '#3a0306', shallow: '#d0161f', light: '#ff8a6c', haze: '#7a2026', sun: '#ff6a4a', sunI: 2.1, sky: '#ff7a64', ground: '#4a1010', hemiI: 1.1,
  caus: '#ff4a32', causI: 0.3, tint: '#a01010', tintI: 0.35, win: 0.5, lamp: 0.8, exposure: 1.0, vig: 0.6 });
const DREAD = P({ deep: '#200104', shallow: '#9a0a14', light: '#ff5a48', haze: '#4a0e14', sun: '#ff4a30', sunI: 1.6, sky: '#e04a3a', ground: '#2a0606', hemiI: 0.9,
  caus: '#ff3a2a', causI: 0.28, tint: '#800a0a', tintI: 0.4, win: 0.3, lamp: 0.5, exposure: 1.0, vig: 0.75 });
const CRACK = P({ deep: '#2a0418', shallow: '#c01848', light: '#ff9ad8', haze: '#4a0e2a', sun: '#ff4a8a', sunI: 1.6, sky: '#e04a9a', ground: '#2a0612', hemiI: 0.95,
  caus: '#ff6ab0', causI: 0.35, tint: '#901050', tintI: 0.35, win: 0.3, lamp: 0.5, exposure: 1.05, vig: 0.7 });

function mixP(a, b, k) {
  const o = {};
  for (const key of Object.keys(a)) o[key] = a[key].isColor ? a[key].clone().lerp(b[key], k) : lerp(a[key], b[key], k);
  return o;
}

// ---------- timing helpers ----------
const L = (i) => TL.lines[i];
const S = (n) => TL.scenes[String(n)];

function events() {
  const e = {};
  e.night0 = L(3).start - 0.08; e.night1 = S(3) - 0.05;
  e.redPulse = L(6).start + 1.2;
  e.shift0 = L(8).start + 0.2; e.shift1 = L(9).start - 0.1;
  e.freeze = L(9).start + 0.62;
  e.whalesGo = L(10).start;
  e.sil0 = L(11).start;
  e.hand1 = L(12).start + 1.05;   // impact of first hand
  e.hand2 = L(13).start + 0.25;   // "Then another"
  e.harder = L(14).start + 0.4;
  e.run = S(7) - 0.05;
  e.reveal = L(16).start - 0.05;
  e.smile = L(17).start;
  e.mom = L(18).start - 0.05;
  e.react = L(20).start + 0.9;
  e.crack0 = S(9) + 0.15;
  e.crackFull = S(9) + 3.4;
  e.hole = S(9) + 3.65;
  e.eye0 = S(9) + 4.05;
  e.black = S(9) + 4.6;
  e.end = TL.duration;
  return e;
}

// ---------- environment over time ----------
function envAt(t) {
  let p;
  if (t < EV.night0) p = DAY;
  else if (t < EV.night1) p = NIGHT;
  else if (t < S(4) - 0.05) {
    // brief red tint passing through the water during the rule
    const k = Math.exp(-Math.pow((t - EV.redPulse) / 0.55, 2)) * 0.6;
    p = mixP(DAY, RED, k);
  } else if (t < EV.shift0) p = EVENING;
  else if (t < EV.shift1) {
    const u = (t - EV.shift0) / (EV.shift1 - EV.shift0);
    p = u < 0.5 ? mixP(EVENING, PURPLE, smooth(0, 0.5, u)) : mixP(PURPLE, RED, smooth(0.5, 1, u));
  } else if (t < S(6)) p = RED;
  else if (t < S(9)) p = mixP(RED, DREAD, smooth(S(6), S(7), t));
  else p = mixP(DREAD, CRACK, smooth(EV.crack0, EV.crackFull, t));
  return p;
}

// ---------- world paths ----------
const whalePath = [
  (t) => [v3(-70 + 5 * t, 63, -6), 0],
  (t) => [v3(118 - 3.6 * t, 60, 28), Math.PI],
  (t) => [v3(-160 + 2.2 * t, 80, -130), 0],
];
function whaleState(i, t) {
  let [p, yaw] = whalePath[i](t);
  let a = 1;
  if (t > EV.whalesGo) {
    const u = clamp((t - EV.whalesGo) / 1.7);
    p = p.clone(); p.y += easeIn(u) * 70; p.z -= easeIn(u) * 60; a = 1 - smooth(0.2, 1, u);
  }
  return { p, yaw, a };
}

// ---------- captions ----------
let capEl, blackEl, flashEl, gradeEl;
function captionAt(t) {
  const c = TL.captions.find((c) => t >= c.start && t < c.end);
  if (!c || t >= EV.black) { capEl.innerHTML = ''; return; }
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let html;
  if (c.hl === '*') html = `<span class="${c.color}">${esc(c.text)}</span>`;
  else if (c.hl && c.text.includes(c.hl)) html = esc(c.text).replace(esc(c.hl), `<span class="${c.color}">${esc(c.hl)}</span>`);
  else html = esc(c.text);
  if (capEl.dataset.k !== c.text) { capEl.innerHTML = html; capEl.dataset.k = c.text; }
  const a = clamp((t - c.start) / 0.16);
  const s = a < 1 ? lerp(0.55, 1.08, easeOut(a)) : 1.08 - 0.08 * clamp((t - c.start - 0.16) / 0.1);
  const big = c.hl === '*' ? 1.1 : 1;
  capEl.style.transform = `scale(${s * big}) rotate(${(noise1(c.start * 7) * 1.5).toFixed(2)}deg)`;
  capEl.style.opacity = String(clamp(a * 2));
}

// ---------- shots ----------
// Each shot returns {pos, look, fov, shake}
function shotAt(t) {
  if (THUMB) return { name: 'thumb', pos: v3(61.5, 2.4, -6), look: v3(59, 21, 26), fov: 74 };
  const sh = SHOTS.find((s) => t >= s.t0() && t < s.t1()) || SHOTS[SHOTS.length - 1];
  const u = clamp((t - sh.t0()) / (sh.t1() - sh.t0()));
  return { name: sh.name, ...sh.f(u, t) };
}
const SHOTS = [
  { name: 'hook', t0: () => 0, t1: () => S(2) - 0.05, f: (u, t) => {
    const e = easeOut(u);
    const w = whaleState(0, t).p;
    return { pos: v3(lerp(-170, -40, e), lerp(24, 22, e), lerp(125, 80, e)),
      look: v3(lerp(-30, w.x + 8, easeInOut(u)), lerp(22, w.y - 4, easeInOut(u)), lerp(-20, w.z, e)), fov: lerp(62, 58, u) };
  } },
  { name: 'whale-over-house', t0: () => S(2) - 0.05, t1: () => L(2).start - 0.05, f: (u, t) => {
    const w = whaleState(1, t).p;
    return { pos: v3(lerp(114, 104, u), 3.6, -2.5), look: v3(w.x + 6, lerp(36, 40, u), w.z), fov: 72 };
  } },
  { name: 'fish-street', t0: () => L(2).start - 0.05, t1: () => EV.night0, f: (u, t) => ({
    pos: v3(140 - (t - L(2).start) * 8, 5.5, 3.5), look: v3(112 - (t - L(2).start) * 8, 11, -1), fov: 64 }) },
  { name: 'night-jellies', t0: () => EV.night0, t1: () => S(3) - 0.05, f: (u) => ({
    pos: v3(lerp(38, 50, u), lerp(2.6, 3.4, u), 5), look: v3(lerp(90, 96, u), 15, -2), fov: 66 }) },
  { name: 'residents', t0: () => S(3) - 0.05, t1: () => L(5).start - 0.05, f: (u) => ({
    pos: v3(lerp(-3, 1, u), 7.2, lerp(36, 32, u)), look: v3(0, lerp(9, 12, u), 0), fov: 64 }) },
  { name: 'sign-pushin', t0: () => L(5).start - 0.05, t1: () => S(4) - 0.05, f: (u) => {
    const e = easeInOut(u);
    return { pos: v3(lerp(13, 9.9, e), lerp(7.5, 5.4, e), lerp(20, -2.8, e)), look: v3(lerp(10, 9.1, e), lerp(10.5, 3.4, e), -16), fov: lerp(62, 54, e) };
  } },
  { name: 'house-exterior', t0: () => S(4) - 0.05, t1: () => L(8).start - 0.05, f: (u) => ({
    pos: v3(63, lerp(2.4, 3.4, u), lerp(14, 10.5, u)), look: v3(60.5, 23, -15), fov: 66 }) },
  { name: 'emma-window-ots', t0: () => L(8).start - 0.05, t1: () => L(8).start + 1.95, f: (u) => ({
    pos: v3(60, 11.4, lerp(-18.9, -18.5, u)), look: v3(60, lerp(16, 18, u), 0), fov: 70 }) },
  { name: 'emma-closeup', t0: () => L(8).start + 1.95, t1: () => S(5) - 0.05, f: (u) => ({
    pos: v3(60.25, 12.35, lerp(-15.3, -16.0, u)), look: v3(60.0, 12.25, -18.5), fov: lerp(42, 36, u) }) },
  { name: 'frozen-ocean', t0: () => S(5) - 0.05, t1: () => L(10).start - 0.05, f: (u) => ({
    pos: v3(lerp(26, 30, u), 3.5, 5), look: v3(lerp(46, 50, u), 34, 22), fov: 70 }) },
  { name: 'whales-leave', t0: () => L(10).start - 0.05, t1: () => L(11).start - 0.05, f: (u, t) => ({
    pos: v3(14, 4, -2), look: v3(lerp(10, 2, u), lerp(42, 52, u), lerp(20, 10, u)), fov: 70 }) },
  { name: 'silhouette-push', t0: () => L(11).start - 0.05, t1: () => S(6) - 0.05, f: (u, t) => {
    const e = easeInOut(u);
    const sp = silPos(t);
    return { pos: v3(lerp(40, 46, e), lerp(3, 4.5, e), lerp(-4, 6, e)), look: v3(sp.x, 46, sp.z), fov: lerp(78, 60, e) };
  } },
  { name: 'hand-lowangle', t0: () => S(6) - 0.05, t1: () => L(13).start - 0.05, f: (u) => ({
    pos: v3(49, 2.2, lerp(18, 21, u)), look: v3(50, 40, 44), fov: lerp(80, 76, u) }) },
  { name: 'hands-wide', t0: () => L(13).start - 0.05, t1: () => S(7) - 0.05, f: (u) => ({
    pos: v3(66, 2.6, lerp(4, 8, u)), look: v3(64, 40, 46), fov: lerp(84, 78, u) }) },
  { name: 'stairs-track', t0: () => EV.run, t1: () => EV.reveal, f: (u, t) => {
    const ep = emmaRun(t);
    if (t < EV.run + 1.45) return { pos: v3(53.3, 3.2, -27.8), look: v3(ep.x, ep.y + 3.4, -29), fov: 70 };
    return { pos: v3(clamp(ep.x + 2.5, 54, 66), 4.2, -21.6), look: v3(ep.x - 0.5, ep.y + 3.2, ep.z), fov: 66 };
  } },
  { name: 'parents-reveal', t0: () => EV.reveal, t1: () => EV.smile - 0.05, f: (u) => ({
    pos: v3(61.0, 6.85, -30.3), look: v3(60.6, 4.9, -19.8), fov: 64 }) },
  { name: 'smile-pov', t0: () => EV.smile - 0.05, t1: () => EV.mom, f: (u) => ({
    pos: v3(60.65, lerp(5.0, 5.2, u), lerp(-29.2, -28.4, u)), look: v3(60.65, 5.4, -19.9), fov: lerp(68, 62, u) }) },
  { name: 'mother-closeup', t0: () => EV.mom, t1: () => EV.react, f: (u) => {
    const e = easeInOut(u);
    return { pos: v3(lerp(59.4, 59.0, e), lerp(3.9, 4.3, e), lerp(-25.6, -23.4, e)), look: v3(58.7, 5.45, -20.6), fov: lerp(46, 38, e) };
  } },
  { name: 'emma-react', t0: () => EV.react, t1: () => S(9) - 0.05, f: (u) => ({
    pos: v3(60.5, 5.0, lerp(-23.3, -24.0, u)), look: v3(60.4, 4.75, -26.8), fov: lerp(40, 34, u) }) },
  { name: 'sky-pullback', t0: () => S(9) - 0.05, t1: () => EV.hole - 0.1, f: (u) => {
    const e = easeOut(Math.min(1, u * 1.25));
    return { pos: v3(lerp(62, -10, e), lerp(10, 34, e), lerp(4, 150, e)), look: v3(lerp(60, 52, e), lerp(30, 34, e), -24), fov: lerp(70, 64, e) };
  } },
  { name: 'crack-extreme', t0: () => EV.hole - 0.1, t1: () => 999, f: (u, t) => {
    const k = clamp((t - (EV.hole - 0.1)) / 0.9);
    return { pos: v3(60, lerp(4, 8, easeOut(k)), lerp(-2, -7, easeOut(k))), look: v3(60, 48, -24.5), fov: lerp(72, 62, easeOut(k)) };
  } },
];

function silPos(t) { const k = smooth(EV.sil0 - 1, EV.hand1 + 3, t); return { x: lerp(10, 64, k), z: lerp(70, 32, k) }; }

// Emma's run: stair top -> stair bottom -> towards the door
function emmaRun(t) {
  const a = EV.run, b = EV.run + 1.45, c = EV.run + 2.35;
  const top = v3(66.2, 7.4, -29), bot = v3(53.6, 0, -29), stop = v3(60.4, 0, -26.8);
  if (t < b) { const u = clamp((t - a) / (b - a)); return top.clone().lerp(bot, u).setY(lerp(7.4, 0, clamp((u * 12.6 - 0.4) / 12.0))).add(v3(0, 0, 0)); }
  const u = easeOut(clamp((t - b) / (c - b)));
  // curve: go +x and +z
  const p = bot.clone().lerp(stop, u); p.z = lerp(-29, -26.8, Math.sin(u * Math.PI / 2)); return p;
}

// ---------- characters ----------
function setupCharacters() {
  emma = makeCharacter({ skin: '#f4cca6', shirt: '#ffd02a', pocket: '#f0bd1e', hood: true, pants: '#3a6db8', shoes: '#ffffff', shoeTrim: '#cfcfcf',
    hair: '#141416', hairStyle: 'long', female: true, caustic: false });
  mom = makeCharacter({ skin: '#f2c8a2', shirt: '#e6d6bc', pants: '#2a2a33', shoes: '#3a2a20', hair: '#6a4126', hairStyle: 'shoulder', female: true, scale: 1.12, caustic: false });
  dad = makeCharacter({ skin: '#eec09a', shirt: '#3c7ed8', collar: '#2c62b0', pants: '#141418', shoes: '#101010', hair: '#1e1610', hairStyle: 'short', scale: 1.16, caustic: false });
  [emma, mom, dad].forEach((c) => scene.add(c.root));
  const r = rng(11);
  const shirts = ['#ff6a6a', '#6ad06a', '#6a9aff', '#ff9a3a', '#c06aff', '#3ad0c0', '#ffffff', '#ff6ac0', '#2a2a2a'];
  const pants = ['#2a3a5a', '#3a3a3a', '#5a3a2a', '#1a1a2a', '#6a6a7a'];
  const hairs = ['#1a1a1a', '#6a4126', '#e0b050', '#a04020', '#3a2a1a'];
  npcs = [];
  const spots = [[-9, 6, 0.3, 'point'], [-4, 9, -0.2, 'lookUp'], [2, 7, 0.1, 'wave'], [7, 10, -0.4, 'lookUp'], [-12, 0, 0.6, 'lookUp'],
    [11, 3, -0.6, 'point'], [-2, 14, 0, 'lookUp'], [5, 15, 0.2, 'lookUp'], [14, 12, -0.3, 'lookUp'], [-15, 11, 0.5, 'wave']];
  spots.forEach(([x, z, yaw, p], i) => {
    const c = makeCharacter({ shirt: shirts[i % shirts.length], pants: pants[i % pants.length], hair: hairs[i % hairs.length],
      hairStyle: r() > 0.5 ? 'short' : 'shoulder', female: r() > 0.5, skin: ['#f4cca6', '#d9a57a', '#8a5a3a', '#f0c090'][i % 4], hat: r() > 0.75 ? '#c03a3a' : null });
    c.root.position.set(x, 0.35, z); c.root.rotation.y = yaw; c.npc = { p, ph: r() * 5 };
    c.setFace(['smile', 'wonder', 'smile'][i % 3]);
    scene.add(c.root); npcs.push(c);
  });
}

function charactersAt(t, sh) {
  const inSquare = sh.name === 'residents';
  npcs.forEach((c) => { c.root.visible = inSquare; if (inSquare) pose(c, c.npc.p, t + c.npc.ph, { amt: 0.35 }); });

  // Emma
  emma.root.visible = sh.name !== 'emma-window-ots';
  if (t < EV.run) {
    emma.root.position.set(60, 7.4, -18.7); emma.root.rotation.y = 0;
    const scared = t > L(8).start + 1.6;
    pose(emma, scared ? 'scared' : 'idle', t, { amt: scared ? 0.25 : 0.32 });
    emma.setFace(t < L(7).start + 1.5 ? 'wonder' : t < L(8).start + 0.3 ? 'curious' : t < L(8).start + 1.6 ? 'worried' : 'scared');
  } else if (t < EV.reveal) {
    const p = emmaRun(t); emma.root.position.copy(p);
    const onStairs = t < EV.run + 1.45;
    const u = clamp((t - EV.run - 1.45) / 0.6);
    emma.root.rotation.y = onStairs ? -Math.PI / 2 : lerp(-Math.PI / 2, 0, easeOut(u));
    const stopT = EV.run + 2.35;
    pose(emma, t < stopT ? 'run' : 'scared', t, { amt: 0.1 });
    emma.setFace('scared');
  } else {
    emma.root.position.set(60.4, 0, -26.8); emma.root.rotation.y = 0.0;
    emma.root.visible = !['smile-pov', 'mother-closeup'].includes(sh.name);
    pose(emma, 'scared', t, { amt: t > EV.mom ? 0.32 : 0.1 });
    emma.setFace(t < EV.react ? 'scared' : 'shock');
  }
  if (THUMB) {
    emma.root.visible = true; emma.root.position.set(60, 0.3, 3.5); emma.root.rotation.y = Math.PI + 0.25;
    pose(emma, 'scared', t, { amt: -0.15 }); emma.setFace('scared');
  }
  // parents: only inside the house at the end
  const parentsOn = t >= EV.reveal - 0.2;
  mom.root.visible = dad.root.visible = parentsOn;
  if (parentsOn) {
    mom.root.position.set(58.7, 0, -20.4); mom.root.rotation.y = Math.PI + 0.05;
    dad.root.position.set(62.6, 0, -19.4); dad.root.rotation.y = Math.PI - 0.08;
    const lean = smooth(EV.mom + 0.3, EV.mom + 2.6, t) * 0.32;
    pose(mom, lean > 0.01 ? 'lean' : 'still', t, { amt: lean, tilt: 0.1 * lean / 0.32 });
    pose(dad, 'still', t);
    dad.neck.rotation.z = -0.08 * smooth(EV.smile, EV.smile + 1.5, t);
    const creepy = t >= EV.smile;
    mom.setFace(creepy ? 'creepy' : 'calm'); dad.setFace(creepy ? 'creepy' : 'calm');
  }
}

// ---------- setup ----------
export async function setup() {
  TL = await (await fetch('/build/ep06/timeline.json')).json();
  EV = events(); window.__events = EV; window.__duration = TL.duration;
  capEl = document.getElementById('cap'); blackEl = document.getElementById('black');
  flashEl = document.getElementById('flash'); gradeEl = document.getElementById('grade');
  await document.fonts.load('900 100px Inter');

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(1080, 1920);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('gl').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#a9dcf2', 230, 760);
  camera = new THREE.PerspectiveCamera(60, 1080 / 1920, 0.1, 5000);
  hemi = new THREE.HemisphereLight('#a8ddff', '#6a9a5a', 1.2); scene.add(hemi);
  amb = new THREE.AmbientLight('#ffffff', 0.15); scene.add(amb);
  sun = new THREE.DirectionalLight('#fff1dc', 2.8);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 400 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05;
  scene.add(sun); scene.add(sun.target);

  town = buildTown(scene);
  ocean = buildOcean(scene);
  whales = [makeWhale(92), makeWhale(76), makeWhale(110)];
  whales.forEach((w) => scene.add(w.root));
  schools = [
    // between the buildings (in the air)
    makeSchool({ count: 46, seed: 2, size: 1.0, spread: 7, path: (ft) => v3(212 - 10.5 * ft, 9 + Math.sin(ft * 0.7) * 1.5, -10 + Math.sin(ft * 0.5) * 2) }),
    makeSchool({ count: 34, seed: 5, size: 0.9, spread: 6, path: (ft) => v3(-62 + 12.5 * ft, 15 + Math.sin(ft) * 2, 5) }),
    makeSchool({ count: 40, seed: 7, size: 1.1, spread: 8, path: (ft) => v3(Math.cos(ft * 0.3) * 30, 13 + Math.sin(ft * 0.6) * 2, Math.sin(ft * 0.3) * 30) }),
    makeSchool({ count: 44, seed: 9, size: 1.0, spread: 8, path: (ft) => v3(100 + Math.cos(ft * 0.25) * 20, 17 + Math.sin(ft * 0.5) * 2, 6 + Math.sin(ft * 0.25) * 10) }),
    // inside the sky ocean
    makeSchool({ count: 60, seed: 13, size: 1.6, spread: 14, inWater: true, path: (ft) => v3(30 + Math.cos(ft * 0.15) * 60, 55, 10 + Math.sin(ft * 0.15) * 50) }),
    makeSchool({ count: 60, seed: 17, size: 1.6, spread: 14, inWater: true, path: (ft) => v3(-60 + Math.cos(-ft * 0.12) * 50, 56, -30 + Math.sin(-ft * 0.12) * 40) }),
    makeSchool({ count: 50, seed: 19, size: 1.5, spread: 12, inWater: true, path: (ft) => v3(95 + Math.cos(ft * 0.18) * 40, 54.5, 40 + Math.sin(ft * 0.18) * 30) }),
  ];
  schools.forEach((s) => scene.add(s.mesh));
  const jp = []; const jr = rng(21);
  for (let i = 0; i < 26; i++) jp.push(v3(50 + jr() * 110, 7 + jr() * 24, -14 + jr() * 28));
  jellies = makeJellies(scene, jp);
  setupCharacters();
  // pre-warm face textures
  for (const c of [emma, mom, dad]) ['wonder', 'curious', 'worried', 'scared', 'shock', 'calm', 'creepy', 'neutral'].forEach((f) => c.setFace(f));
  window.__render = renderAt;
  window.__thumb = (text) => {
    THUMB = true; renderAt(40.6);
    capEl.innerHTML = `<span class="red">${text}</span>`; capEl.style.top = '170px'; capEl.style.fontSize = '150px';
    capEl.style.transform = 'rotate(-2deg)'; capEl.style.opacity = '1';
  };
  renderAt(0);
  return { duration: TL.duration, events: EV };
}

// ---------- per-frame ----------
const tmp = new THREE.Vector3();
function renderAt(t) {
  const env = envAt(t);
  const sh = shotAt(t);

  // shared time (freezes when the ocean goes still, stirs again when the hands arrive)
  const ft = t < EV.freeze ? t : EV.freeze;
  U.uTime.value = t < EV.freeze ? t : EV.freeze + Math.max(0, t - S(6)) * 0.7;
  ocean.uniforms.uStill.value = 0;

  // ocean colors / lighting
  const ou = ocean.uniforms;
  ou.uDeep.value.copy(env.deep); ou.uShallow.value.copy(env.shallow); ou.uLight.value.copy(env.light); ou.uFogColor.value.copy(env.haze);
  scene.fog.color.copy(env.haze);
  hemi.color.copy(env.sky); hemi.groundColor.copy(env.ground); hemi.intensity = env.hemiI;
  sun.color.copy(env.sun); sun.intensity = env.sunI;
  U.uCausticColor.value.copy(env.caus); U.uCausticStrength.value = env.causI;
  WT.uWaterTint.value.copy(env.tint); WT.uWaterTintAmt.value = env.tintI;
  winMat.emissiveIntensity = env.win; lampMat.emissiveIntensity = env.lamp;
  renderer.toneMappingExposure = env.exposure;

  // creatures
  whales.forEach((w, i) => {
    const s = whaleState(i, t);
    w.root.position.copy(s.p); w.root.rotation.set(0, (s.yaw === 0 ? Math.PI / 2 : -Math.PI / 2), 0);
    w.animate(ft + i * 2); w.setOpacity(s.a);
  });
  schools.forEach((s) => s.update(ft));
  const nightK = t >= EV.night0 && t < EV.night1 ? 1 : 0;
  jellies.update(t, nightK);

  // silhouette
  const silK = smooth(EV.sil0, EV.sil0 + 2.2, t) * (1 - 0.5 * smooth(EV.hand1, EV.hand1 + 2, t));
  const { x: sx, z: sz } = silPos(t);
  ou.uSil.value.set(sx, sz, 120, 70); ou.uSilStrength.value = silK * 0.92;
  ocean.sil.position.set(sx, OCEAN_Y + 26, sz); ocean.sil.material.opacity = silK; ocean.sil.visible = silK > 0.01;

  // hands
  const pulse = (k) => Math.sin(t * 2.3 + k) * 0.05;
  const press1 = t < EV.hand1 - 1.0 ? -1 : t < EV.hand1 ? lerp(-1, 0, easeOut((t - EV.hand1 + 1.0) / 1.0)) : lerp(0, 0.72, easeOut((t - EV.hand1) / 0.55));
  const press2 = t < EV.hand2 - 0.7 ? -1 : t < EV.hand2 ? lerp(-1, 0, easeOut((t - EV.hand2 + 0.7) / 0.7)) : lerp(0, 0.72, easeOut((t - EV.hand2) / 0.5));
  const harder = smooth(EV.harder, EV.harder + 1.6, t) * 0.25 + smooth(EV.crack0, EV.crackFull, t) * 0.25;
  const pushes = (t > EV.harder ? Math.max(0, Math.sin((t - EV.harder) * 3.4)) * 0.06 : 0);
  ocean.placeHand(0, 50, 50, Math.PI + 0.22, 1.15, press1 >= 0 ? press1 + harder + pulse(0) * (t > EV.harder ? 1 : 0) + pushes : press1);
  ocean.placeHand(1, 80, 46, Math.PI - 0.3, 1.12, press2 >= 0 ? press2 + harder + pulse(1.7) * (t > EV.harder ? 1 : 0) + pushes : press2);
  ou.uRipple.value = Math.max(Math.exp(-Math.max(0, t - EV.hand1) * 0.7) * (t > EV.hand1 ? 1 : 0), Math.exp(-Math.max(0, t - EV.hand2) * 0.7) * (t > EV.hand2 ? 1 : 0), smooth(EV.harder, EV.harder + 1, t) * 0.6);
  ou.uHandCrack.value = smooth(EV.harder + 0.3, EV.harder + 2.0, t) * 0.85;

  // cracks + hole + eye
  ou.uCrackGlow.value = t > EV.crack0 ? 1 : 0;
  ou.uCrackR.value = t > EV.crack0 ? lerp(0, 900, easeIn(clamp((t - EV.crack0) / (EV.crackFull - EV.crack0))) * 0.85 + 0.15 * clamp((t - EV.crack0) / (EV.crackFull - EV.crack0))) : 0;
  ou.uHoleR.value = t > EV.hole ? lerp(0, 24, easeOut(clamp((t - EV.hole) / 0.5))) : 0;
  ocean.eye.visible = t > EV.eye0 - 0.05;
  ocean.eye.position.set(60, OCEAN_Y + 22, -24.5);
  ocean.dome.material.uniforms.uVoid.value = 0;

  // Emma's house lights
  const H = town.emma;
  const redK = smooth(EV.shift0 + 1, EV.shift1, t);
  H.redUp.intensity = redK * 90; H.redDown.intensity = smooth(S(6), S(7), t) * 140 + redK * 30;
  H.warmUp.intensity = t < S(7) ? 26 : 6; H.warmDown.intensity = t < S(7) ? 22 : 5;

  charactersAt(t, sh);

  // camera
  camera.position.copy(sh.pos); camera.fov = sh.fov; camera.updateProjectionMatrix();
  let shake = 0;
  shake += Math.exp(-Math.max(0, t - EV.hand1) * 3) * (t > EV.hand1 ? 0.9 : 0);
  shake += Math.exp(-Math.max(0, t - EV.hand2) * 3) * (t > EV.hand2 ? 0.9 : 0);
  shake += t > EV.harder && t < S(7) ? 0.18 : 0;
  shake += t > EV.crack0 ? 0.35 + smooth(EV.crackFull, EV.hole, t) * 0.8 : 0;
  const look = sh.look.clone();
  if (shake > 0) {
    const d = camera.position.distanceTo(look) * 0.012 * shake;
    look.x += noise1(t * 23) * d; look.y += noise1(t * 19 + 5) * d; look.z += noise1(t * 21 + 9) * d * 0.5;
  }
  camera.lookAt(look);

  // shadows follow the shot
  camera.getWorldDirection(tmp);
  const focus = camera.position.clone().add(tmp.multiplyScalar(30)); focus.y = 0;
  sun.target.position.copy(focus);
  sun.position.copy(focus).add(v3(-60, 140, 70));
  const indoors = ['stairs-track', 'parents-reveal', 'smile-pov', 'mother-closeup', 'emma-react', 'emma-window-ots'].includes(sh.name);
  sun.castShadow = !indoors;

  // overlays
  captionAt(t);
  const flash = Math.max(
    Math.exp(-Math.max(0, t - EV.hand1) * 9) * (t > EV.hand1 ? 0.35 : 0),
    Math.exp(-Math.max(0, t - EV.hand2) * 9) * (t > EV.hand2 ? 0.3 : 0),
    Math.exp(-Math.max(0, t - EV.crack0) * 6) * (t > EV.crack0 ? 0.5 : 0),
    Math.exp(-Math.max(0, t - EV.hole) * 8) * (t > EV.hole ? 0.6 : 0),
    t < 0.12 ? 1 - t / 0.12 : 0);
  flashEl.style.opacity = flash.toFixed(3);
  flashEl.style.background = t < 1 ? '#ffffff' : '#ffd0d8';
  blackEl.style.opacity = t >= EV.black ? '1' : '0';
  const vig = env.vig;
  gradeEl.style.background = `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,${vig.toFixed(2)}) 100%)`;

  renderer.render(scene, camera);
  return sh.name;
}
