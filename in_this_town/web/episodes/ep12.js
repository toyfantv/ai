// Episode 12 — "The Secret Thirteenth Floor".
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, rng, mat, box, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { CAST } from '../engine/cast.js';
import { buildTown, mergeGroup } from '../engine/town.js';
import { initStage, applyEnv, shotAt, frame, expose, P, DUSK } from '../engine/stage.js';
import { canvasTex, glowSprite } from '../engine/props.js';

let ctx, L, EV;
const EVE = P({ ...DUSK, exposure: 1.05, sunI: 2.0, hemiI: 1.0 });
const W = {};
const C = v3(1000, 0, 1000);           // classroom origin
const HW = v3(1000, 0, 1400);          // hallway origin
const EL = v3(1000, 0, 1700);          // elevator interior origin (standalone)
const RYAN = { ...CAST.ryan, caustic: false };

function dynTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return { c, t, last: null, set(key, ...args) { if (this.last === key) return; this.last = key; draw(c.getContext('2d'), w, h, key, ...args); t.needsUpdate = true; } };
}

function room(origin, w, d, h, wallC, floorC, holes = {}) {
  const g = new THREE.Group(); g.position.copy(origin); ctx.scene.add(g);
  const wm = mat(wallC, { caustic: false }), fm = mat(floorC, { caustic: false });
  box(w, 0.2, d, fm, 0, -0.1, 0, g, false); box(w, 0.2, d, mat('#f2f0ea', { caustic: false }), 0, h + 0.1, 0, g, false);
  box(w, h, 0.3, wm, 0, h / 2, -d / 2, g, false); box(0.3, h, d, wm, -w / 2, h / 2, 0, g, false); box(0.3, h, d, wm, w / 2, h / 2, 0, g, false);
  if (!holes.back) box(w, h, 0.3, wm, 0, h / 2, d / 2, g, false);
  return g;
}

function build() {
  W.town = buildTown(ctx.scene, { sign: null, house: false, seed: 12 });
  // school exterior: 12 floors + a ghost 13th
  const S = v3(-50, 0, -70); W.S = S; const sg = new THREE.Group();
  box(60, 60, 30, mat('#d8b07a'), S.x, 30, S.z, sg);
  for (let f = 0; f < 12; f++) for (let i = 0; i < 10; i++) box(3.4, 2.6, 0.3, mat('#9fd2ff', { roughness: 0.2 }), S.x - 25 + i * 5.5, 3 + f * 5, S.z + 15.1, sg);
  box(14, 7, 6, mat('#a07a50'), S.x, 3.5, S.z + 17, sg);
  mergeGroup(sg, ctx.scene);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(26, 5), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 200, (c, w, h) => { c.fillStyle = '#2a3a8a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 150px ITTInter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TOWN SCHOOL', w / 2, h / 2 + 6); }) }));
  sign.position.set(S.x, 9, S.z + 20.2); ctx.scene.add(sign);
  W.ghost = new THREE.Mesh(new THREE.BoxGeometry(60, 5, 30), new THREE.MeshBasicMaterial({ color: '#8fe8ff', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  W.ghost.position.set(S.x, 62.5, S.z); ctx.scene.add(W.ghost);
  W.ghostGlow = glowSprite('#7fe0ff', 90, 0.4); W.ghostGlow.position.set(S.x, 63, S.z + 10); ctx.scene.add(W.ghostGlow);

  // hallway: lockers + elevator doors + notice
  const hall = room(HW, 10, 40, 7, '#e8e2cf', '#9a9a9a');
  for (let i = 0; i < 12; i++) for (const s of [-1, 1]) box(1.4, 5, 1.2, mat(['#3a6ad8', '#d84a4a'][i % 2], { caustic: false }), s * 4.3, 2.5, -16 + i * 2.6, hall, false);
  box(4, 5.6, 0.2, mat('#b8bcc4', { caustic: false }), 0, 2.8, -19.8, hall, false);
  box(0.08, 5.6, 0.22, mat('#6a6e78', { caustic: false }), 0, 2.8, -19.75, hall, false);
  const note = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: canvasTex(512, 350, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0121c'; c.font = '900 80px ITTInter, sans-serif'; c.textAlign = 'center'; c.fillText('DO NOT', w / 2, 120); c.fillText('PRESS 13', w / 2, 240); }) }));
  note.position.set(2.8, 4.0, -19.65); hall.add(note);
  const hl = new THREE.PointLight('#ffcf9a', 60, 40, 1.2); hl.position.set(0, 6, -8); hall.add(hl);

  // elevator interior (standalone set; doors open onto the classroom back wall later via a cut)
  const el = room(EL, 5, 5, 6.2, '#b8bcc4', '#5a5a62');
  W.panel = dynTex(256, 512, (c, w, h, key) => {
    c.fillStyle = '#2a2e36'; c.fillRect(0, 0, w, h);
    const [show13, lit] = key.split('|');
    for (let i = 1; i <= 13; i++) {
      if (i === 13 && show13 === '0') continue;
      const col = (i - 1) % 2, row = Math.floor((i - 1) / 2);
      const x = 70 + col * 116, y = 450 - row * 66;
      const on = (i === 13 && lit === '1');
      c.fillStyle = i === 13 ? (on ? '#ff3030' : '#ffdd88') : '#d8dce4'; c.beginPath(); c.arc(x, y, 26, 0, 7); c.fill();
      if (i === 13) { c.shadowColor = '#ff4040'; c.shadowBlur = on ? 30 : 12; c.fill(); c.shadowBlur = 0; }
      c.fillStyle = '#1a1a1a'; c.font = '900 26px ITTInter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i), x, y + 1);
    }
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshBasicMaterial({ map: W.panel.t, toneMapped: false }));
  panel.position.set(2.32, 3.0, -1.2); panel.rotation.y = -Math.PI / 2; el.add(panel); W.panelMesh = panel;
  W.disp = dynTex(512, 200, (c, w, h, key) => { c.fillStyle = '#0a0a0c'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff3a2a'; c.shadowColor = '#ff2020'; c.shadowBlur = 20; c.font = '900 150px ITTInter, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(key, w / 2, h / 2 + 8); });
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.55), new THREE.MeshBasicMaterial({ map: W.disp.t, toneMapped: false }));
  disp.position.set(0, 5.6, 2.33); disp.rotation.y = Math.PI; el.add(disp);
  W.elDoorL = box(1.25, 5.4, 0.15, mat('#9aa0aa', { caustic: false }), -0.62, 2.7, 2.35, el, false); W.elDoorR = box(1.25, 5.4, 0.15, mat('#9aa0aa', { caustic: false }), 0.62, 2.7, 2.35, el, false);
  W.elLight = new THREE.PointLight('#fff2dc', 35, 12, 1.2); W.elLight.position.set(0, 5.8, 0); el.add(W.elLight);
  W.elBeyond = new THREE.PointLight('#cfe8ff', 0, 20, 1.2); W.elBeyond.position.set(0, 3, 4.5); el.add(W.elBeyond);
  W.el = el;

  // classroom
  const cr = room(C, 32, 24, 9, '#c8d8c0', '#b98a5e');
  const board = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.6), new THREE.MeshBasicMaterial({ map: canvasTex(1400, 460, (c, w, h) => {
    c.fillStyle = '#1f3a2a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8a6040'; c.lineWidth = 24; c.strokeRect(0, 0, w, h);
    c.fillStyle = 'rgba(240,240,230,0.92)'; c.font = '700 64px ITTInter, sans-serif'; c.textAlign = 'center'; c.fillText('TODAY IS:', w / 2, 150);
    c.font = '900 120px ITTInter, sans-serif'; c.fillText('MAY 12, 2011', w / 2, 310); }) }));
  board.position.set(0, 5.2, -11.8); cr.add(board); W.boardPos = C.clone().add(v3(0, 5.2, -11.8));
  box(5, 2.4, 2.4, mat('#8a5a3a', { caustic: false }), 0, 1.2, -8.2, cr, false);
  W.bell = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#d83a3a', { caustic: false })); W.bell.rotation.x = Math.PI / 2;
  W.bell.position.set(10, 7.6, -11.6); cr.add(W.bell);
  // elevator doors in the back wall (they vanish)
  W.backDoors = new THREE.Group(); cr.add(W.backDoors); W.backDoors.position.set(-10, 0, 11.82);
  box(4.2, 6, 0.15, mat('#9aa0aa', { caustic: false }), 0, 3, 0, W.backDoors, false); box(0.08, 6, 0.2, mat('#5a5e68', { caustic: false }), 0, 3, -0.02, W.backDoors, false);
  for (let x = -12; x <= 12; x += 8) { const l = new THREE.PointLight('#f4ffe8', 40, 30, 1.2); l.position.set(x, 8.4, 0); cr.add(l); }
  // desks + identical students
  W.students = [];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) {
    const x = -10 + k * 5, z = -3 + r * 4;
    box(3, 0.25, 2, mat('#c09060', { caustic: false }), x, 2.6, z - 1.2, cr, false);
    box(0.25, 2.5, 0.25, mat('#555', { caustic: false }), x, 1.25, z - 1.2, cr, false);
    box(1.8, 0.3, 1.8, mat('#3a5a9a', { caustic: false }), x, 1.6, z + 0.4, cr, false);
    const s = makeCharacter(RYAN); s.root.position.copy(C).add(v3(x, 0.6, z + 0.4)); s.root.rotation.y = Math.PI; ctx.scene.add(s.root); s.ph = r * 5 + k;
    W.students.push(s);
  }
  W.ryan = makeCharacter(RYAN); ctx.scene.add(W.ryan.root);
  W.teacher = makeCharacter({ ...RYAN, acc: ['glasses:#2a2a2a'], hair: '#9a8a7a', hairStyle: 'bun', female: true, shirt: '#2f6a40', pants: '#3a3a44', scale: 1.15 });
  ctx.scene.add(W.teacher.root);
  W.teacherWarn = makeCharacter({ shirt: '#8a3a5a', pants: '#2a2a33', hair: '#3a2a1a', hairStyle: 'shoulder', female: true, scale: 1.12 }); ctx.scene.add(W.teacherWarn.root);
  W.kids = [0, 1].map((i) => { const c = makeCharacter({ shirt: ['#ffb03a', '#c06aff'][i], pants: '#2a3a5a', hair: '#1a1a1a', hairStyle: 'short' }); ctx.scene.add(c.root); return c; });
  W.backpack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.7), mat('#d84a3a', { caustic: false })); W.backpack.position.set(0, 1.0, -0.85); W.ryan.torso.add(W.backpack);
}

function events() {
  const e = {};
  e.hall = L(4).start - 0.05; e.btn = L(5).start + 1.4; e.press = L(7).start + 0.3; e.up = L(8).start; e.open = L(10).start + 1.5; e.class = L(11).start - 0.05;
  e.turnT = L(14).start + 0.5; e.run = L(18).start; e.gone = L(19).start + 0.2; e.bell = L(20).start + 0.3; e.whisper = L(22).start; e.final = L(24).start - 0.05;
  e.black = ctx.dur - 0.2; return e;
}

const CW = (x, y, z) => C.clone().add(v3(x, y, z));
const EW = (x, y, z) => EL.clone().add(v3(x, y, z));
const HH = (x, y, z) => HW.clone().add(v3(x, y, z));
const SHOTS = [
  { name: 'school', t0: () => 0, t1: () => L(1).start - 0.05, f: (u) => ({ pos: v3(-34, lerp(22, 26, u), 36), look: v3(-50, lerp(30, 58, easeInOut(u)), -70), fov: 66 }) },
  { name: 'panel13', t0: () => L(1).start - 0.05, t1: () => L(2).start - 0.05, f: (u) => ({ pos: EW(0.6, 3.6, lerp(-0.4, -0.8, u)), look: EW(2.32, 3.2, -1.2), fov: 44 }) },
  { name: 'ghost', t0: () => L(2).start - 0.05, t1: () => L(3).start - 0.05, f: (u) => ({ pos: v3(lerp(-30, -34, u), 46, 20), look: v3(-50, 62, -70), fov: 56 }) },
  { name: 'warn', t0: () => L(3).start - 0.05, t1: () => EV.hall, f: (u) => ({ pos: HH(lerp(2.5, 2.0, u), 4.2, -9), look: HH(0, 3.4, -17), fov: 60 }) },
  { name: 'hallway', t0: () => EV.hall, t1: () => L(5).start - 0.05, f: (u) => ({ pos: HH(-2.5, 4.5, lerp(12, 8, u)), look: HH(0, 3, -14), fov: 60 }) },
  { name: 'enter', t0: () => L(5).start - 0.05, t1: () => L(6).start - 0.05, f: (u) => ({ pos: EW(-1.4, 4.6, 1.8), look: EW(2.2, 3.2, -1.2), fov: 60 }) },
  { name: 'b13', t0: () => L(6).start - 0.05, t1: () => L(8).start - 0.05, f: (u) => ({ pos: EW(lerp(1.0, 1.3, u), 3.8, -1.43), look: EW(2.32, 3.79, -1.43), fov: lerp(36, 30, u) }) },
  { name: 'display', t0: () => L(8).start - 0.05, t1: () => L(9).start - 0.05, f: (u) => ({ pos: EW(1.4, 4.2, -1.8), look: EW(0, 5.6, 2.33), fov: 44 }) },
  { name: 'nonstop', t0: () => L(9).start - 0.05, t1: () => L(10).start - 0.05, f: (u) => ({ pos: EW(-0.5, 4.9, 2.0), look: EW(-1.3, 4.7, 0.2), fov: 50 }) },
  { name: 'open', t0: () => L(10).start - 0.05, t1: () => EV.class, f: (u) => ({ pos: EW(1.2, 5.0, -1.9), look: EW(0.0, 3.6, 3), fov: 62 }) },
  { name: 'step-in', t0: () => EV.class, t1: () => L(12).start - 0.05, f: (u) => ({ pos: CW(-9, 5.6, lerp(11.4, 10.8, u)), look: CW(-6, 3.0, -4), fov: 66 }) },
  { name: 'occupied', t0: () => L(12).start - 0.05, t1: () => L(13).start - 0.05, f: (u) => ({ pos: CW(lerp(12, 10, u), 7.5, 11), look: CW(-2, 2, -2), fov: 66 }) },
  { name: 'faces', t0: () => L(13).start - 0.05, t1: () => L(14).start - 0.05, f: (u) => ({ pos: CW(lerp(-3, 3, u), 4.4, -6.5), look: CW(0, 3.6, 6), fov: 62 }) },
  { name: 'teacher-turn', t0: () => L(14).start - 0.05, t1: () => L(15).start - 0.05, f: (u) => ({ pos: CW(1.5, 6.2, -3.5), look: CW(0, 5.8, -10.5), fov: 52 }) },
  { name: 'teacher-face', t0: () => L(15).start - 0.05, t1: () => L(18).start - 0.05, f: (u) => ({ pos: CW(0.3, 6.2, lerp(-6.2, -7.0, u)), look: CW(0, 6.1, -10.5), fov: 42 }) },
  { name: 'run', t0: () => L(18).start - 0.05, t1: () => EV.gone, f: (u) => ({ pos: CW(-6, 5, 2), look: CW(-10, 3.2, 11), fov: 60 }) },
  { name: 'no-doors', t0: () => EV.gone, t1: () => L(20).start - 0.05, f: (u) => ({ pos: CW(-8, 4.8, lerp(5, 6, u)), look: CW(-10, 3.4, 12), fov: 58 }) },
  { name: 'bell', t0: () => L(20).start - 0.05, t1: () => L(21).start - 0.05, f: (u) => ({ pos: CW(8.5, 6.6, -9), look: CW(10, 7.6, -11.6), fov: 46 }) },
  { name: 'whisper', t0: () => L(21).start - 0.05, t1: () => L(23).start - 0.05, f: (u) => ({ pos: CW(-9.5, 4.8, lerp(9.5, 8.5, u)), look: CW(0, 3.6, -4), fov: 62 }) },
  { name: 'date', t0: () => L(23).start - 0.05, t1: () => EV.final, f: (u) => ({ pos: CW(0, 5.4, lerp(-4, -5.5, u)), look: CW(0, 5.2, -11.8), fov: 52 }) },
  { name: 'final', t0: () => EV.final, t1: () => 999, f: (u, t) => { const k = clamp((t - EV.final) / 4.2); return { pos: CW(0, lerp(6.4, 7.8, k), lerp(-10.0, -11.4, easeOut(k))), look: CW(0, lerp(3.4, 2.8, k), 6), fov: lerp(58, 74, easeOut(k)) }; } },
];

function renderAt(t) {
  applyEnv(ctx, EVE);
  // ghost floor flicker
  const fl = noise1(t * 6) > -0.1 ? 1 : 0.15;
  W.ghost.material.opacity = 0.5 * fl; W.ghostGlow.material.opacity = 0.45 * fl;
  // panel + display
  W.panel.set(`${t > EV.btn || (t > L(1).start && t < L(2).start && noise1(t * 8) > 0) ? 1 : 0}|${t > EV.press ? 1 : 0}`);
  let d = '1';
  if (t > EV.up) { const k = t - EV.up; const n = Math.floor(1 + k * 4.2); d = n <= 13 ? String(n) : (noise1(t * 12) > 0 ? '??' : String(n)); }
  if (t > EV.open - 0.4) d = '13';
  W.disp.set(d);
  const op = smooth(EV.open, EV.open + 0.8, t);
  W.elDoorL.position.x = -0.62 - op * 1.2; W.elDoorR.position.x = 0.62 + op * 1.2; W.elBeyond.intensity = op * 60;
  // Ryan
  const R = W.ryan; R.root.visible = true;
  if (t < EV.hall) { R.root.visible = false; }
  else if (t < L(5).start - 0.05) { const k = clamp((t - EV.hall) / 3); R.root.position.copy(HH(-0.5, 0, lerp(6, -14, k))); R.root.rotation.y = Math.PI; pose(R, 'walk', t); R.setFace('neutral'); }
  else if (t < EV.class) { R.root.position.copy(t > L(8).start - 0.05 ? EW(-1.3, 0, 0.2) : EW(0.2, 0, 0.6)); R.root.rotation.y = t > L(8).start - 0.05 ? 0 : t < L(6).start - 0.05 ? -Math.PI / 2 + 0.6 : -Math.PI / 2 + 0.3; pose(R, 'idle', t);
    if (t > EV.press - 0.4 && t < EV.press + 0.6) { R.arms[1].rotation.x = -1.5; }
    R.setFace(t < EV.btn ? 'neutral' : t < L(9).start ? 'curious' : 'worried'); }
  else if (t < EV.run) { const k = clamp((t - EV.class) / 1.6); R.root.position.copy(CW(-10, 0, lerp(13, 9.5, k))); R.root.rotation.y = Math.PI; pose(R, k < 1 ? 'walk' : 'scared', t); R.setFace(t < L(13).start ? 'worried' : 'scared'); }
  else { const k = clamp((t - EV.run) / 1.0); R.root.position.copy(CW(-10, 0, lerp(9.5, 11.0, k))); R.root.rotation.y = t < EV.gone ? 0 : (t < L(21).start ? 0 : Math.PI); pose(R, t < EV.gone ? 'run' : 'scared', t); R.setFace('shock'); }
  W.backDoors.visible = t < EV.gone;
  // students
  W.students.forEach((s, i) => {
    pose(s, 'sit', t + s.ph); s.root.rotation.y = Math.PI;
    const toRyan = t > EV.whisper - 0.4 && t < EV.final;
    s.neck.rotation.y = toRyan ? Math.sign((s.root.position.x - C.x) + 10.01) * 0.9 : 0;
    s.setFace(t > EV.whisper - 0.4 ? 'creepy' : t > L(13).start ? 'neutral' : 'neutral');
    s.root.visible = t >= EV.class - 0.1;
  });
  // teacher
  const T = W.teacher; T.root.position.copy(t > L(18).start ? CW(7, 0, -9.6) : CW(0, 0, -10.2));
  const tt = smooth(EV.turnT - 0.4, EV.turnT + 0.6, t); T.root.rotation.y = lerp(Math.PI, 0, tt);
  pose(T, 'still', t); if (tt < 1) T.arms[1].rotation.x = -2.0 * (1 - tt); T.setFace(t > L(16).start ? 'creepy' : 'calm');
  // warning teacher + kids (hallway)
  const vis = t > L(3).start - 0.1 && t < EV.hall;
  W.teacherWarn.root.visible = vis; W.kids.forEach((k) => { k.root.visible = vis; });
  if (vis) { W.teacherWarn.root.position.copy(HH(1.2, 0, -16)); W.teacherWarn.root.rotation.y = 0.2; pose(W.teacherWarn, 'point', t); W.teacherWarn.arms[1].rotation.x = -1.3; W.teacherWarn.setFace('worried');
    W.kids.forEach((k, i) => { k.root.position.copy(HH(-1.4 + i * 1.6, 0, -12.5)); k.root.rotation.y = Math.PI - 0.2 + i * 0.4; pose(k, 'idle', t + i); k.setFace('neutral'); }); }
  // bell
  W.bell.rotation.z = t > EV.bell && t < EV.bell + 2.2 ? Math.sin(t * 60) * 0.12 : 0;
  const sh = shotAt(SHOTS, t);
  const exterior = ['school', 'ghost'].includes(sh.name);
  const shake = sh.name === 'nonstop' ? 0.35 : sh.name === 'bell' ? 0.2 : 0;
  frame(ctx, t, sh, { shake, shadows: exterior, flash: Math.max(t < 0.12 ? 1 - t / 0.12 : 0, Math.exp(-Math.max(0, t - EV.open) * 4) * (t > EV.open ? 0.4 : 0)),
    flashColor: '#eaf6ff', black: t >= EV.black ? 1 : 0, vig: t > EV.class ? 0.15 : 0,
    tint: t > EV.class ? 'linear-gradient(rgba(60,120,80,0.12), rgba(60,120,80,0.12))' : null });
  return sh.name;
}

export async function setup() {
  ctx = await initStage('ep12'); L = ctx.L; EV = events();
  build();
  return expose(ctx, renderAt, ctx.dur - 1.2, EV);
}
