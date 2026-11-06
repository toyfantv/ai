// Procedural blocky (R6-style) characters: rig, clothing, hair, canvas-drawn faces, poses.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat } from './core.js';

const geoCache = new Map();
function rbox(w, h, d, r = 0.12) {
  const k = [w, h, d, r].join('|');
  if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, 2, r));
  return geoCache.get(k);
}
function part(w, h, d, color, x, y, z, parent, r, opts) {
  const m = new THREE.Mesh(rbox(w, h, d, r), mat(color, opts));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}

// ---------- faces ----------
function ellipse(ctx, x, y, rx, ry, fill = '#1b1b1f') { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }

const FACES = {
  // each: eyes{h (height scale), pupil (0 = solid eye, else white eye w/ pupil size)}, brows angle, mouth
  neutral: { eyeH: 1, brow: 0, mouth: 'smile', smile: 0.5 },
  smile: { eyeH: 1, brow: 0.05, mouth: 'smile', smile: 1 },
  wonder: { eyeH: 1.25, shine: true, brow: -0.25, browUp: 8, mouth: 'o', o: 0.6 },
  curious: { eyeH: 1.1, shine: true, brow: -0.1, browUp: 4, browTilt: 0.35, mouth: 'smirk' },
  confused: { eyeH: 1.0, brow: 0.3, browTilt: -0.5, mouth: 'wave' },
  worried: { eyeH: 1.1, shine: true, brow: -0.45, browUp: 2, mouth: 'frown', smile: 0.5 },
  scared: { white: true, pupil: 0.45, eyeH: 1.35, brow: -0.55, browUp: 10, mouth: 'open', o: 0.8 },
  shock: { white: true, pupil: 0.3, eyeH: 1.5, brow: -0.6, browUp: 14, mouth: 'open', o: 1.25 },
  calm: { closed: true, brow: 0, mouth: 'smile', smile: 0.9 },
  creepy: { white: true, pupil: 0.14, eyeH: 1.3, brow: 0.12, mouth: 'wide', smile: 1.4 },
};

function drawFace(expr, female) {
  const f = FACES[expr];
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const ink = '#1b1b1f';
  const ex = 70, ey = 108, rx = 15, ry = 24 * (f.eyeH || 1);
  for (const s of [-1, 1]) {
    const x = 128 + s * ex * 0.72;
    if (f.closed) {
      ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, ey + 8, 16, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else if (f.white) {
      ellipse(ctx, x, ey, rx * 1.55, ry * 1.05, '#fbfbfb');
      ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, ey, rx * 1.55, ry * 1.05, 0, 0, 7); ctx.stroke();
      ellipse(ctx, x, ey, rx * 1.4 * f.pupil, rx * 1.4 * f.pupil, ink);
    } else {
      ellipse(ctx, x, ey, rx, ry, ink);
      if (f.shine) { ellipse(ctx, x - 5, ey - ry * 0.45, 5, 7, '#ffffff'); ellipse(ctx, x + 5, ey + ry * 0.3, 2.5, 3, '#ffffff'); }
    }
    if (female && !f.closed) { // lashes
      ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.lineCap = 'round';
      const top = ey - ry * (f.white ? 1.05 : 1);
      ctx.beginPath(); ctx.moveTo(x + s * rx * 0.9, top + 6); ctx.lineTo(x + s * (rx + 10), top - 4); ctx.stroke();
    }
    // brows
    const by = ey - ry - 22 - (f.browUp || 0);
    const tilt = (f.brow || 0) * s + (f.browTilt && s > 0 ? f.browTilt : 0);
    ctx.save(); ctx.translate(x, by); ctx.rotate(-tilt);
    ctx.fillStyle = ink; ctx.fillRect(-20, -4, 40, 8); ctx.restore();
  }
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 9; ctx.lineCap = 'round';
  const my = 178;
  switch (f.mouth) {
    case 'smile': ctx.beginPath(); ctx.arc(128, my - 28 * f.smile, 34, Math.PI * (0.5 - 0.32), Math.PI * (0.5 + 0.32)); ctx.stroke(); break;
    case 'smirk': ctx.beginPath(); ctx.moveTo(105, my); ctx.quadraticCurveTo(130, my + 10, 152, my - 8); ctx.stroke(); break;
    case 'wave': ctx.beginPath(); ctx.moveTo(100, my); ctx.bezierCurveTo(115, my - 12, 135, my + 12, 156, my - 2); ctx.stroke(); break;
    case 'frown': ctx.beginPath(); ctx.arc(128, my + 30, 30, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); break;
    case 'o': ellipse(ctx, 128, my, 12 * f.o + 6, 16 * f.o + 6, ink); break;
    case 'open':
      ellipse(ctx, 128, my + 4, 20 * f.o + 6, 22 * f.o + 6, ink);
      ellipse(ctx, 128, my + 12 + 10 * f.o, 12 * f.o, 7 * f.o, '#c0414b'); break;
    case 'wide': {
      ctx.beginPath(); ctx.moveTo(62, my - 26); ctx.quadraticCurveTo(128, my + 40, 194, my - 26);
      ctx.quadraticCurveTo(128, my + 14, 62, my - 26); ctx.fill();
      ctx.strokeStyle = '#fbfbfb'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(78, my - 16); ctx.quadraticCurveTo(128, my + 18, 178, my - 16); ctx.stroke();
      break;
    }
  }
  if (expr === 'creepy') { // dark rings under staring eyes
    ctx.strokeStyle = 'rgba(60,20,40,0.55)'; ctx.lineWidth = 7;
    for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.arc(128 + s2 * 50, 118, 30, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
  }
  if (female) { ctx.fillStyle = 'rgba(255,120,140,0.28)'; ellipse(ctx, 70, 160, 18, 10, 'rgba(255,120,140,0.28)'); ellipse(ctx, 186, 160, 18, 10, 'rgba(255,120,140,0.28)'); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// ---------- character ----------
export function makeCharacter(spec) {
  const s = {
    skin: '#f1c7a1', shirt: '#4a90d9', sleeves: null, pants: '#2d3b55', shoes: '#222222',
    hair: '#2a1d14', hairStyle: 'short', female: false, hood: false, scale: 1, caustic: true, ...spec,
  };
  const o = { caustic: s.caustic };
  const root = new THREE.Group();
  const scaleG = new THREE.Group(); scaleG.scale.setScalar(s.scale); root.add(scaleG);

  const hips = new THREE.Group(); hips.position.y = 2; scaleG.add(hips);
  const legs = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.5, 0, 0); hips.add(pivot);
    part(0.98, 1.75, 1, s.pants, 0, -0.85, 0, pivot, 0.1, o);
    part(1.02, 0.42, 1.18, s.shoes, 0, -1.79, 0.07, pivot, 0.12, o);
    if (s.shoeTrim) part(1.04, 0.1, 1.2, s.shoeTrim, 0, -1.93, 0.07, pivot, 0.04, o);
    legs.push(pivot);
  }
  const torso = new THREE.Group(); hips.add(torso);
  part(2, 2, 1, s.shirt, 0, 1, 0, torso, 0.12, o);
  if (s.hood) {
    part(1.7, 0.55, 0.55, s.shirt, 0, 1.95, -0.42, torso, 0.18, o);
    part(1.1, 0.55, 0.06, s.pocket || s.shirt, 0, 0.45, 0.51, torso, 0.03, o);
    part(0.07, 0.6, 0.06, '#ffffff', -0.25, 1.55, 0.53, torso, 0.02, o);
    part(0.07, 0.6, 0.06, '#ffffff', 0.25, 1.55, 0.53, torso, 0.02, o);
  }
  if (s.collar) part(1.0, 0.3, 0.06, s.collar, 0, 1.85, 0.51, torso, 0.03, o);
  const arms = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * 1.5, 1.82, 0); torso.add(pivot);
    part(0.98, 1.5, 1, s.sleeves || s.shirt, 0, -0.62, 0, pivot, 0.1, o);
    part(0.94, 0.5, 0.94, s.skin, 0, -1.6, 0, pivot, 0.12, o);
    arms.push(pivot);
  }
  const neck = new THREE.Group(); neck.position.set(0, 2, 0); torso.add(neck);
  const head = part(1.3, 1.25, 1.25, s.skin, 0, 0.68, 0, neck, 0.28, o);

  // hair
  const H = s.hair;
  if (s.hairStyle === 'long' || s.hairStyle === 'shoulder') {
    const backLen = s.hairStyle === 'long' ? 2.5 : 1.45;
    part(1.48, 0.42, 1.42, H, 0, 1.36, -0.02, neck, 0.16, o);              // top cap
    part(1.48, backLen, 0.4, H, 0, 1.5 - backLen / 2, -0.62, neck, 0.12, o); // back panel
    for (const side of [-1, 1]) part(0.26, backLen * 0.78, 1.0, H, side * 0.73, 1.45 - backLen * 0.39, -0.12, neck, 0.08, o);
    part(1.0, 0.34, 0.22, H, -0.18, 1.18, 0.6, neck, 0.08, o);             // bangs
    part(0.5, 0.24, 0.2, H, 0.42, 1.24, 0.6, neck, 0.06, o);
  } else {
    part(1.44, 0.4, 1.4, H, 0, 1.35, -0.03, neck, 0.15, o);
    part(1.44, 0.7, 0.3, H, 0, 1.0, -0.56, neck, 0.1, o);
    part(0.9, 0.22, 0.2, H, 0.1, 1.2, 0.58, neck, 0.06, o);
    for (const side of [-1, 1]) part(0.18, 0.55, 0.8, H, side * 0.7, 1.05, -0.15, neck, 0.06, o);
  }
  if (s.hat) part(1.55, 0.35, 1.55, s.hat, 0, 1.55, 0, neck, 0.1, o);

  // face plane
  const faceTex = {};
  const faceMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, color: 0xffffff });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), faceMat);
  face.position.set(0, 0.64, 0.632); neck.add(face);
  faceMat.polygonOffset = true; faceMat.polygonOffsetFactor = -2;
  const ch = {
    root, hips, torso, neck, head, legs, arms, spec: s,
    setFace(expr) {
      if (!faceTex[expr]) faceTex[expr] = drawFace(expr, s.female);
      faceMat.map = faceTex[expr]; faceMat.needsUpdate = true;
    },
    reset() {
      hips.position.y = 2; hips.rotation.set(0, 0, 0); torso.rotation.set(0, 0, 0); neck.rotation.set(0, 0, 0);
      legs.forEach((l) => l.rotation.set(0, 0, 0)); arms.forEach((a) => a.rotation.set(0, 0, 0));
    },
  };
  // Roblox faces are darkened by scene light; keep face ink readable.
  faceMat.color.setScalar(0.92);
  ch.setFace('neutral');
  return ch;
}

// ---------- poses (pure functions of time) ----------
export function pose(ch, name, t, k = {}) {
  ch.reset();
  const [L, R] = ch.legs, [AL, AR] = ch.arms;
  const breathe = Math.sin(t * 2.1) * 0.025;
  switch (name) {
    case 'idle':
      ch.torso.rotation.x = breathe; AL.rotation.z = -0.06; AR.rotation.z = 0.06;
      AL.rotation.x = breathe * 2; AR.rotation.x = -breathe * 2; break;
    case 'still': // unnaturally motionless
      AL.rotation.z = -0.02; AR.rotation.z = 0.02; break;
    case 'lookUp':
      ch.neck.rotation.x = -(k.amt ?? 0.55); ch.torso.rotation.x = -0.08 + breathe;
      AL.rotation.z = -0.08; AR.rotation.z = 0.08; break;
    case 'point':
      ch.neck.rotation.x = -0.5; AR.rotation.x = -2.5 - Math.sin(t * 3) * 0.08; AR.rotation.z = 0.2; AL.rotation.z = -0.1; break;
    case 'wave':
      ch.neck.rotation.x = -0.35; AR.rotation.z = 2.6 + Math.sin(t * 9) * 0.35; break;
    case 'handsToWindow':
      ch.neck.rotation.x = -(k.amt ?? 0.35); AL.rotation.x = -1.35; AR.rotation.x = -1.35; AL.rotation.z = 0.2; AR.rotation.z = -0.2; break;
    case 'scared':
      ch.torso.rotation.x = -0.12; ch.neck.rotation.x = -(k.amt ?? 0.2);
      AL.rotation.x = -1.2 + Math.sin(t * 22) * 0.04; AR.rotation.x = -1.2 + Math.sin(t * 23) * 0.04;
      AL.rotation.z = 0.45; AR.rotation.z = -0.45; L.rotation.x = 0.15; R.rotation.x = -0.1; break;
    case 'walk': case 'run': {
      const run = name === 'run';
      const sp = run ? 13 : 7.5, amp = run ? 1.0 : 0.55;
      const p = Math.sin(t * sp);
      L.rotation.x = p * amp; R.rotation.x = -p * amp; AL.rotation.x = -p * amp * 0.9; AR.rotation.x = p * amp * 0.9;
      ch.hips.position.y = 2 + Math.abs(Math.cos(t * sp)) * (run ? 0.28 : 0.1);
      ch.torso.rotation.x = run ? 0.22 : 0.04; break;
    }
    case 'sit':
      ch.hips.position.y = 2 - 1.55; L.rotation.x = -1.45; R.rotation.x = -1.45;
      ch.torso.rotation.x = breathe; AL.rotation.x = -0.9; AR.rotation.x = -0.9; break;
    case 'lean': // parent leaning toward someone
      ch.torso.rotation.x = (k.amt ?? 0.35); ch.neck.rotation.x = -(k.amt ?? 0.35) * 0.6; ch.neck.rotation.z = (k.tilt ?? 0.12);
      AL.rotation.z = -0.03; AR.rotation.z = 0.03; break;
  }
  if (k.headYaw) ch.neck.rotation.y = k.headYaw;
}
