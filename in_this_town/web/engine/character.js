// Procedural blocky (R6-style) characters: rig, clothing, hair, canvas-drawn faces, poses.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, U } from './core.js';
import { hasAvatar, makeAvatarCharacter } from './roblox.js';

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
  // a real Roblox avatar downloaded with tools/roblox_avatar.py replaces the procedural body
  if (hasAvatar(spec.avatar)) return makeAvatarCharacter(spec);
  const s = {
    skin: '#f1c7a1', shirt: '#4a90d9', sleeves: null, pants: '#2d3b55', shoes: '#222222',
    hair: '#2a1d14', hairStyle: 'short', female: false, hood: false, scale: 1, caustic: true, ...spec,
  };
  const o = { caustic: s.caustic };
  const so = U.skinGlow ? { ...o, emissive: s.skin, emissiveIntensity: U.skinGlow } : o;
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
    part(0.94, 0.5, 0.94, s.skin, 0, -1.6, 0, pivot, 0.12, so);
    arms.push(pivot);
  }
  const neck = new THREE.Group(); neck.position.set(0, 2, 0); torso.add(neck);
  const head = part(1.3, 1.25, 1.25, s.skin, 0, 0.68, 0, neck, 0.28, so);

  // hair
  const H = s.hair;
  const HL = '#' + new THREE.Color(H).lerp(new THREE.Color('#f2c890'), 0.45).getHexString();   // highlight stripe
  const style = s.hairStyle;
  const capTop = () => part(1.46, 0.4, 1.42, H, 0, 1.36, -0.02, neck, 0.16, o);
  const back = (len) => part(1.46, len, 0.38, H, 0, 1.5 - len / 2, -0.62, neck, 0.12, o);
  const sides = (len) => { for (const sd of [-1, 1]) part(0.24, len, 1.0, H, sd * 0.73, 1.45 - len / 2, -0.12, neck, 0.08, o); };
  if (style === 'bacon') {
    // "bacon-style" hair: rows of thin wavy ribbons, alternating dark and light, forming a dome + a swept fringe
    capTop(); back(0.8);
    for (const sd of [-1, 1]) part(0.22, 0.65, 0.9, H, sd * 0.72, 1.08, -0.12, neck, 0.06, o);
    for (let i = 0; i < 6; i++) {
      const z = 0.52 - i * 0.22, col = i % 2 ? HL : H;
      for (let k = 0; k < 7; k++) {
        const x = -0.66 + k * 0.22;
        const y = 1.56 + Math.sin(x * 7 + i * 1.3) * 0.05 - Math.abs(z) * 0.1 - Math.abs(x) * 0.08;
        const seg = part(0.25, 0.11, 0.24, col, x, y, z, neck, 0.04, o); seg.rotation.z = Math.cos(x * 7 + i * 1.3) * 0.32;
      }
    }
    for (let j = 0; j < 2; j++) for (let k = 0; k < 5; k++) {   // fringe ribbons draping over the forehead
      const x = -0.55 + k * 0.22 + j * 0.06, col = (j + k) % 2 ? HL : H;
      const seg = part(0.25, 0.1, 0.2, col, x, 1.32 - j * 0.12 - k * 0.025 + Math.sin(k * 1.7 + j) * 0.03, 0.63 + j * 0.02, neck, 0.04, o);
      seg.rotation.z = 0.25 + Math.cos(k * 1.7) * 0.2;
    }
  } else if (style === 'spiky') {
    capTop(); back(0.7);
    const cone = new THREE.ConeGeometry(0.26, 0.75, 4);
    for (let i = 0; i < 9; i++) { const sp = new THREE.Mesh(cone, mat(i % 3 === 0 ? HL : H, o)); const a = (i / 9) * Math.PI * 2;
      sp.position.set(Math.cos(a) * 0.42, 1.68, Math.sin(a) * 0.42 - 0.05); sp.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); sp.castShadow = true; neck.add(sp); }
    const c = new THREE.Mesh(cone, mat(H, o)); c.position.set(0, 1.82, 0); c.scale.setScalar(1.2); neck.add(c);
    part(0.9, 0.24, 0.22, H, 0.1, 1.22, 0.6, neck, 0.06, o);
  } else if (style === 'bun') {
    capTop(); back(1.0); sides(0.8);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), mat(H, o)); bun.position.set(0, 1.85, -0.25); neck.add(bun);
    part(1.0, 0.3, 0.22, H, -0.15, 1.2, 0.6, neck, 0.08, o);
  } else if (style === 'pigtails') {
    capTop(); back(0.9); part(1.1, 0.32, 0.22, H, 0, 1.2, 0.6, neck, 0.08, o);
    for (const sd of [-1, 1]) {
      part(0.3, 0.3, 0.3, H, sd * 0.82, 1.32, -0.18, neck, 0.1, o);
      const tl = part(0.42, 1.55, 0.42, H, sd * 1.02, 0.42, -0.2, neck, 0.2, o); tl.rotation.z = sd * 0.18;
      part(0.48, 0.14, 0.48, s.tie || '#ff5a8a', sd * 0.9, 1.15, -0.2, neck, 0.06, o);
    }
  } else if (style === 'ponytail') {
    capTop(); back(0.8); sides(0.7); part(1.0, 0.3, 0.22, H, -0.12, 1.2, 0.6, neck, 0.08, o);
    const tail = part(0.48, 1.7, 0.45, H, 0, 0.8, -0.95, neck, 0.2, o); tail.rotation.x = 0.25; part(0.5, 0.14, 0.5, s.tie || '#ffd23f', 0, 1.6, -0.82, neck, 0.06, o);
  } else if (style === 'bob') {
    capTop(); back(1.15); sides(1.05); part(1.36, 0.3, 0.2, H, 0, 1.2, 0.61, neck, 0.06, o);
  } else if (style === 'long' || style === 'shoulder' || style === 'wavy') {
    const backLen = style === 'shoulder' ? 1.45 : 2.5;
    capTop();
    if (style === 'wavy') { for (let i = 0; i < 5; i++) part(1.46 - (i % 2) * 0.1, backLen / 5 + 0.05, 0.4 + (i % 2) * 0.08, i % 2 ? HL : H, (i % 2) * 0.04, 1.5 - (i + 0.5) * backLen / 5, -0.62 - (i % 2) * 0.04, neck, 0.12, o); }
    else back(backLen);
    sides(backLen * 0.78);
    part(1.0, 0.34, 0.22, H, -0.18, 1.18, 0.6, neck, 0.08, o);
    part(0.5, 0.24, 0.2, H, 0.42, 1.24, 0.6, neck, 0.06, o);
  } else {
    part(1.44, 0.4, 1.4, H, 0, 1.35, -0.03, neck, 0.15, o);
    part(1.44, 0.7, 0.3, H, 0, 1.0, -0.56, neck, 0.1, o);
    part(0.9, 0.22, 0.2, H, 0.1, 1.2, 0.58, neck, 0.06, o);
    for (const side of [-1, 1]) part(0.18, 0.55, 0.8, H, side * 0.7, 1.05, -0.15, neck, 0.06, o);
  }
  if (s.hat) part(1.55, 0.35, 1.55, s.hat, 0, 1.55, 0, neck, 0.1, o);
  // accessories
  for (const acc of s.acc || []) {
    const [kind, col = '#222831'] = acc.split(':');
    if (kind === 'headphones') {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 8, 24, Math.PI), mat(col, o)); band.position.set(0, 1.0, 0); neck.add(band);
      for (const sd of [-1, 1]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16), mat(col, o)); cup.rotation.z = Math.PI / 2; cup.position.set(sd * 0.78, 0.75, 0); neck.add(cup);
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 16), mat(s.accent || '#5ff7ff', o)); pad.rotation.z = Math.PI / 2; pad.position.set(sd * 0.86, 0.75, 0); neck.add(pad); }
    } else if (kind === 'cap' || kind === 'capback') {
      part(1.52, 0.42, 1.48, col, 0, 1.5, -0.02, neck, 0.18, o);
      const brim = part(1.3, 0.08, 0.7, col, 0, 1.33, kind === 'cap' ? 0.9 : -0.95, neck, 0.04, o); brim.rotation.x = kind === 'cap' ? 0.08 : -0.08;
      part(0.3, 0.1, 0.3, s.accent || '#ffffff', 0, 1.74, -0.02, neck, 0.05, o);
    } else if (kind === 'beanie') {
      part(1.54, 0.55, 1.5, col, 0, 1.55, -0.02, neck, 0.22, o); part(1.58, 0.2, 1.54, s.accent || '#ffffff', 0, 1.3, -0.02, neck, 0.08, o);
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), mat(s.accent || '#ffffff', o)); pom.position.set(0, 1.92, -0.02); neck.add(pom);
    } else if (kind === 'catears') {
      part(1.5, 0.08, 0.2, col, 0, 1.58, 0.1, neck, 0.03, o);
      for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 4), mat(col, o)); e.position.set(sd * 0.48, 1.85, 0.1); e.rotation.y = Math.PI / 4; neck.add(e);
        const ie = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4), mat(s.accent || '#ff9ec6', o)); ie.position.set(sd * 0.48, 1.82, 0.2); ie.rotation.y = Math.PI / 4; neck.add(ie); }
    } else if (kind === 'bow') {
      for (const sd of [-1, 1]) { const w = part(0.36, 0.3, 0.14, col, 0.45 + sd * 0.22, 1.55, 0.25, neck, 0.06, o); w.rotation.z = sd * 0.4; }
      part(0.14, 0.16, 0.16, col, 0.45, 1.55, 0.26, neck, 0.04, o);
    } else if (kind === 'glasses') {
      const gm = mat(col, o);
      for (const sd of [-1, 1]) { const x = sd * 0.27; part(0.36, 0.04, 0.03, col, x, 0.86, 0.66, neck, 0.01, o); part(0.36, 0.04, 0.03, col, x, 0.6, 0.66, neck, 0.01, o);
        part(0.04, 0.3, 0.03, col, x - 0.17, 0.73, 0.66, neck, 0.01, o); part(0.04, 0.3, 0.03, col, x + 0.17, 0.73, 0.66, neck, 0.01, o); }
      part(0.16, 0.04, 0.03, col, 0, 0.8, 0.66, neck, 0.01, o); void gm;
    } else if (kind === 'backpack') {
      part(1.4, 1.6, 0.6, col, 0, 1.0, -0.8, torso, 0.15, o);
    } else if (kind === 'scarf') {
      part(1.5, 0.35, 1.1, col, 0, 1.95, 0, torso, 0.12, o);
    }
  }
  // shirt graphic
  if (s.decal) {
    const dc = document.createElement('canvas'); dc.width = dc.height = 128; const g = dc.getContext('2d');
    g.fillStyle = s.decalColor || '#ffffff'; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 6; g.lineJoin = 'round';
    g.beginPath();
    if (s.decal === 'star') for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 22 : 54; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
    else if (s.decal === 'heart') { g.moveTo(64, 104); g.bezierCurveTo(10, 66, 22, 18, 64, 44); g.bezierCurveTo(106, 18, 118, 66, 64, 104); }
    else if (s.decal === 'bolt') { [[70, 10], [30, 70], [60, 70], [48, 118], [98, 50], [66, 50], [80, 10]].forEach(([x, y]) => g.lineTo(x, y)); }
    else if (s.decal === 'moon') { g.arc(64, 64, 46, 0.6, Math.PI * 2 - 0.6); g.arc(84, 54, 34, Math.PI * 2 - 0.9, 0.9, true); }
    else { g.arc(64, 64, 46, 0, 7); }
    g.closePath(); g.stroke(); g.fill();
    const dt = new THREE.CanvasTexture(dc); dt.colorSpace = THREE.SRGBColorSpace;
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), new THREE.MeshStandardMaterial({ map: dt, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }));
    d.position.set(0, s.hood ? 1.2 : 1.05, 0.505); torso.add(d);
  }

  // face plane
  const faceTex = {};
  const faceMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, color: 0xffffff });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), faceMat);
  face.position.set(0, 0.64, 0.632); neck.add(face);
  faceMat.polygonOffset = true; faceMat.polygonOffsetFactor = -2;
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.36), new THREE.MeshBasicMaterial({ color: s.skin, toneMapped: true, polygonOffset: true, polygonOffsetFactor: -4 }));
  lid.position.set(0, 0.73, 0.634); lid.visible = false; neck.add(lid);
  const ch = {
    root, hips, torso, neck, head, legs, arms, spec: s, lid, expr: 'neutral', blinkPh: (s.shirt.charCodeAt(1) + s.hair.charCodeAt(2)) % 37 / 10,
    setFace(expr) {
      this.expr = expr;
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

// Roblox's floating name, as a sprite above the head (a sprite stays out of the ambient occlusion)
export function nameTag(ch, text, o = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const x = c.getContext('2d'); x.font = '900 62px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 9; x.strokeStyle = 'rgba(0,0,0,0.8)'; x.lineJoin = 'round'; x.strokeText(text, 256, 48); x.fillStyle = o.color || '#ffffff'; x.fillText(text, 256, 48);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  s.scale.set(o.width ?? 5.2, (o.width ?? 5.2) * 96 / 512, 1); s.position.y = o.y ?? 6.3; ch.root.add(s);
  return s;
}

// ---------- poses (pure functions of time) ----------
export function pose(ch, name, t, k = {}) {
  ch.reset();
  // natural blinks (never for closed, creepy or shocked faces)
  if (ch.lid) ch.lid.visible = !['calm', 'creepy', 'shock', 'sleep'].includes(ch.expr) && ((t + ch.blinkPh) % 3.3) < 0.11;
  const [L, R] = ch.legs, [AL, AR] = ch.arms;
  const breathe = Math.sin(t * 2.1) * 0.025;
  const H0 = ch.hipY ?? 2;   // hip height: 2 for procedural bodies, measured for real avatars
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
      ch.hips.position.y = H0 + Math.abs(Math.cos(t * sp)) * (run ? 0.28 : 0.1);
      ch.torso.rotation.x = run ? 0.22 : 0.04; break;
    }
    case 'sit':
      ch.hips.position.y = H0 - 1.55 * (H0 / 2); L.rotation.x = -1.45; R.rotation.x = -1.45;
      ch.torso.rotation.x = breathe; AL.rotation.x = -0.9; AR.rotation.x = -0.9; break;
    case 'lean': // parent leaning toward someone
      ch.torso.rotation.x = (k.amt ?? 0.35); ch.neck.rotation.x = -(k.amt ?? 0.35) * 0.6; ch.neck.rotation.z = (k.tilt ?? 0.12);
      AL.rotation.z = -0.03; AR.rotation.z = 0.03; break;
  }
  if (k.headYaw) ch.neck.rotation.y = k.headYaw;
}
