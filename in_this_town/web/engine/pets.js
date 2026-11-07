// Pets (Episode 23): a tiny golden dragon with big expressive eyes and little wings, a golden key, a golden egg.
//   const d = goldenDragon();  scene.add(d.g);
//   d.pose({ t, mode: 'sit' | 'hover' | 'fly' | 'held' | 'hop', flap: 0..1, mood: 'open' | 'happy' | 'excited' | 'sad' | 'curious' | 'sleepy',
//            gaze: [-1..1, -1..1], headYaw, headPitch, tilt, mouth: 0..1, hop: 0..1 })
// About 2.3 studs tall sitting (a Roblox character is about 5.5): small enough to hold. Faces +z, feet at y = 0.
import * as THREE from 'three';
import { v3, rng, clamp, lerp } from './core.js';

// ---- textures ----
function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// overlapping scales, light gold edges on a warm gold
function scaleTex() {
  const t = canvas(512, 512, (x, w, h) => {
    x.fillStyle = '#e9a92a'; x.fillRect(0, 0, w, h);
    const r = 26, rows = Math.ceil(h / (r * 0.9)) + 2;
    for (let j = rows; j >= -1; j--) for (let i = -1; i < w / (r * 2) + 1; i++) {
      const cx = i * r * 2 + (j % 2) * r, cy = j * r * 0.9;
      const g = x.createRadialGradient(cx, cy - r * 0.3, 2, cx, cy, r * 1.05);
      g.addColorStop(0, '#ffe08a'); g.addColorStop(0.55, '#f6c445'); g.addColorStop(0.9, '#d8901e'); g.addColorStop(1, '#b8721a');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI); x.lineTo(cx - r, cy - r * 0.2); x.closePath(); x.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}
function bellyTex() {
  return canvas(256, 256, (x, w, h) => {
    x.fillStyle = '#ffe9b0'; x.fillRect(0, 0, w, h);
    for (let y = 18; y < h; y += 34) { x.fillStyle = 'rgba(214,150,60,0.55)'; x.fillRect(0, y, w, 5); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(0, y + 6, w, 4); }
  });
}

// the eyes: one canvas per mood / blink / gaze, drawn once and cached
const EYES = new Map();
function eyeTex(mood, blink, gx, gy) {
  const k = `${mood}|${blink}|${gx}|${gy}`;
  if (EYES.has(k)) return EYES.get(k);
  const t = canvas(512, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    const eye = (cx, side) => {
      const cy = 128, rx = 62, ry = 74;
      // blush under each eye
      const bl = x.createRadialGradient(cx + side * 30, cy + 92, 4, cx + side * 30, cy + 92, 44); bl.addColorStop(0, 'rgba(255,120,140,0.55)'); bl.addColorStop(1, 'rgba(255,120,140,0)');
      x.fillStyle = bl; x.fillRect(cx - 90, cy + 40, 180, 110);
      x.lineCap = 'round'; x.lineJoin = 'round';
      if (blink || mood === 'happy' || mood === 'sleepy') {
        x.strokeStyle = '#3a1d08'; x.lineWidth = 15; x.beginPath();
        if (mood === 'happy' && !blink) { x.moveTo(cx - 48, cy + 22); x.quadraticCurveTo(cx, cy - 52, cx + 48, cy + 22); }   // ^ ^
        else { x.moveTo(cx - 50, cy + 6); x.quadraticCurveTo(cx, cy + 38, cx + 50, cy + 6); }                               // closed, content
        x.stroke(); return;
      }
      // the eye: a big glossy dark iris with an amber ring
      x.save(); x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.clip();
      x.fillStyle = '#2a1405'; x.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
      const px = cx + gx * 14, py = cy + gy * 12;
      const ir = x.createRadialGradient(px, py + 18, 6, px, py, ry * 0.95);
      ir.addColorStop(0, '#1a0a02'); ir.addColorStop(0.45, '#4a2208'); ir.addColorStop(0.78, '#c06a14'); ir.addColorStop(1, '#ffb23a');
      x.fillStyle = ir; x.beginPath(); x.ellipse(px, py, rx * 0.92, ry * 0.92, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#0c0400'; x.beginPath(); x.ellipse(px, py + 6, rx * (mood === 'excited' ? 0.5 : 0.38), ry * (mood === 'excited' ? 0.56 : 0.44), 0, 0, Math.PI * 2); x.fill();
      // highlights: one big, one small (a star when excited)
      x.fillStyle = '#ffffff';
      if (mood === 'excited') {
        const sx = px - 18, sy = py - 26, s = 26; x.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? s * 0.42 : s; x.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } x.closePath(); x.fill();
      } else { x.beginPath(); x.ellipse(px - 20, py - 26, 20, 24, -0.4, 0, Math.PI * 2); x.fill(); }
      x.beginPath(); x.arc(px + 22, py + 26, 9, 0, Math.PI * 2); x.fill();
      x.restore();
      // lids: sad droops at the outer side, curious lifts one
      x.fillStyle = '#e9a92a';
      if (mood === 'sad') { x.beginPath(); x.moveTo(cx - side * rx - 10, cy - ry * 0.05); x.lineTo(cx + side * rx + 10, cy - ry - 10); x.lineTo(cx - side * rx - 10, cy - ry - 30); x.closePath(); x.fill(); }
      x.strokeStyle = '#3a1d08'; x.lineWidth = 7; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
      // brows
      x.strokeStyle = '#a5600f'; x.lineWidth = 12; x.beginPath();
      const by = cy - ry - 26 - (mood === 'curious' && side > 0 ? 18 : 0) - (mood === 'excited' ? 10 : 0);
      if (mood === 'sad') { x.moveTo(cx - side * 40, by - 14); x.lineTo(cx + side * 34, by + 10); } else { x.moveTo(cx - 36, by + 6); x.quadraticCurveTo(cx, by - 8, cx + 36, by + 6); }
      x.stroke();
      if (mood === 'sad') { x.fillStyle = 'rgba(170,220,255,0.85)'; x.beginPath(); x.ellipse(cx + side * 34, cy + ry - 4, 9, 13, 0, 0, Math.PI * 2); x.fill(); }
    };
    eye(140, -1); eye(372, 1);
  });
  EYES.set(k, t); return t;
}
// the mouth on the snout: a small smile, or open (a happy squeak)
const MOUTH = new Map();
function mouthTex(k) {
  const q = Math.round(clamp(k) * 4);
  if (MOUTH.has(q)) return MOUTH.get(q);
  const t = canvas(256, 128, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.lineCap = 'round';
    // nostrils
    x.fillStyle = '#7a3d0a'; x.beginPath(); x.ellipse(96, 30, 9, 6, 0.3, 0, 7); x.fill(); x.beginPath(); x.ellipse(160, 30, 9, 6, -0.3, 0, 7); x.fill();
    if (q === 0) { x.strokeStyle = '#4a2208'; x.lineWidth = 9; x.beginPath(); x.moveTo(84, 72); x.quadraticCurveTo(128, 102, 172, 72); x.stroke(); }
    else {
      const o = q / 4; x.fillStyle = '#5a1a10'; x.beginPath(); x.moveTo(80, 70); x.quadraticCurveTo(128, 70 + 64 * o, 176, 70); x.quadraticCurveTo(128, 76, 80, 70); x.fill();
      x.fillStyle = '#ff7f92'; x.beginPath(); x.ellipse(128, 70 + 34 * o, 26, 12 * o + 2, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(100, 71); x.lineTo(106, 82); x.lineTo(112, 72); x.fill(); x.beginPath(); x.moveTo(144, 72); x.lineTo(150, 82); x.lineTo(156, 71); x.fill();
    }
  });
  MOUTH.set(q, t); return t;
}

// ---- the dragon ----
export function goldenDragon(o = {}) {
  const gold = new THREE.MeshStandardMaterial({ color: '#ffffff', map: scaleTex(), roughness: 0.34, metalness: 0.32, emissive: '#ff9a1a', emissiveIntensity: 0.06 });
  const goldPlain = new THREE.MeshStandardMaterial({ color: '#f2b232', roughness: 0.32, metalness: 0.34, emissive: '#ff9a1a', emissiveIntensity: 0.06 });
  const belly = new THREE.MeshStandardMaterial({ map: bellyTex(), roughness: 0.55, metalness: 0.05 });
  const horn = new THREE.MeshStandardMaterial({ color: '#fff1cf', roughness: 0.3, metalness: 0.1 });
  const membrane = new THREE.MeshStandardMaterial({ color: '#ffb24a', roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide, emissive: '#ff8a2a', emissiveIntensity: 0.18, transparent: true, opacity: 0.94 });
  const claw = new THREE.MeshStandardMaterial({ color: '#fff6e0', roughness: 0.3 });
  const all = [gold, goldPlain, belly, horn, membrane, claw];
  const S = (r, w = 28, h = 20) => new THREE.SphereGeometry(r, w, h);
  const mesh = (geo, m, parent, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.scale.set(sx, sy, sz); k.castShadow = true; k.receiveShadow = true; parent.add(k); return k; };

  const g = new THREE.Group(), scaleG = new THREE.Group(); scaleG.scale.setScalar(o.scale ?? 1); g.add(scaleG);
  const root = new THREE.Group(); scaleG.add(root);          // squash and stretch
  const body = new THREE.Group(); body.position.set(0, 0.95, 0); root.add(body);
  mesh(S(0.62), gold, body, 0, 0, 0, 0.9, 1.0, 1.05);
  mesh(S(0.5), belly, body, 0, -0.04, 0.3, 0.74, 0.86, 0.52);
  // back spikes
  for (let i = 0; i < 5; i++) { const a = 0.5 - i * 0.42; const k = mesh(new THREE.ConeGeometry(0.09 - i * 0.008, 0.24, 8), horn, body, 0, Math.cos(a) * 0.62 + 0.02, -Math.sin(a) * 0.66 - 0.04); k.rotation.x = -a; }
  // back legs: big round thighs, small feet with claws
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.36, -0.42, 0.02); body.add(leg);
    mesh(S(0.3), gold, leg, 0, 0, 0, 0.9, 1.1, 1.15);
    const foot = mesh(new THREE.CapsuleGeometry(0.13, 0.22, 6, 12), goldPlain, leg, s * 0.03, -0.42, 0.14, 1, 1, 1); foot.rotation.x = Math.PI / 2;
    for (const c of [-1, 0, 1]) mesh(S(0.045, 10, 8), claw, leg, s * 0.03 + c * 0.075, -0.46, 0.38, 1, 0.8, 1.3);
    legs.push(leg);
  }
  // little arms
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.4, 0.18, 0.28); body.add(arm);
    const a = mesh(new THREE.CapsuleGeometry(0.085, 0.26, 6, 12), goldPlain, arm, 0, -0.17, 0.02); a.rotation.x = 0.2;
    for (const c of [-1, 1]) mesh(S(0.035, 8, 6), claw, arm, c * 0.04, -0.34, 0.08);
    arms.push(arm);
  }
  // wings: small, scalloped, with gold bones
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.quadraticCurveTo(0.45, 0.42, 1.0, 0.62); wingShape.quadraticCurveTo(0.95, 0.28, 0.82, 0.12);
  wingShape.quadraticCurveTo(0.72, 0.2, 0.6, 0.0); wingShape.quadraticCurveTo(0.5, 0.06, 0.38, -0.14); wingShape.quadraticCurveTo(0.28, -0.06, 0.14, -0.24); wingShape.quadraticCurveTo(0.08, -0.08, 0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 16);
  const wings = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.26, 0.32, -0.32); body.add(pv);
    const w = new THREE.Group(); w.scale.set(s * 0.95, 0.95, 0.95); pv.add(w);
    const m = new THREE.Mesh(wingGeo, membrane); m.castShadow = true; w.add(m); m.rotation.x = -Math.PI / 2 + 0.25;
    const bone = (x1, y1) => { const len = Math.hypot(x1, y1); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, len, 6), goldPlain); b.position.set(x1 / 2, 0, -y1 / 2); b.rotation.z = Math.PI / 2; b.rotation.y = Math.atan2(y1, x1); b.castShadow = true; m.parent.add(b); };
    w.rotation.x = 1.0; bone(1.0, 0.62);   // raised up and back: flat wings read as sticks from the front bone(0.82, 0.12);
    const knuckle = new THREE.Mesh(S(0.05, 10, 8), horn); knuckle.position.set(1.0, 0, -0.62); w.add(knuckle);
    wings.push(pv);
  }
  // tail: tapering links, a spade tip
  const tail = []; let parent = body, z = -0.5, y = -0.3;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group(); seg.position.set(0, i === 0 ? y : 0, i === 0 ? z : -0.22); parent.add(seg);
    const r0 = 0.2 - i * 0.026; const c = mesh(new THREE.CylinderGeometry(r0 * 0.85, r0, 0.28, 12), gold, seg, 0, 0, -0.1); c.rotation.x = Math.PI / 2;
    mesh(S(r0, 12, 10), gold, seg, 0, 0, 0);
    tail.push(seg); parent = seg;
  }
  const tip = mesh(new THREE.OctahedronGeometry(0.16, 0), horn, parent, 0, 0, -0.3, 1.2, 0.35, 1.5); tip.rotation.y = Math.PI / 4;
  // head
  const neck = new THREE.Group(); neck.position.set(0, 0.55, 0.12); body.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.42, 0.06); neck.add(head);
  const hs = new THREE.Group(); hs.scale.set(1.08, 0.96, 1.0); head.add(hs);
  mesh(S(0.6, 40, 28), gold, hs);
  const eyeM = new THREE.MeshStandardMaterial({ map: eyeTex('open', false, 0, 0), transparent: true, roughness: 0.25, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.604, 48, 32, Math.PI / 2 - 0.95, 1.9, 0.62, 1.05), eyeM); eyes.rotation.y = Math.PI; eyes.renderOrder = 2;
  // (three's sphere puts phi = pi/2 at -z; turning it half way brings the eye patch to +z)
  hs.add(eyes);
  const snout = new THREE.Group(); snout.position.set(0, -0.2, 0.42); head.add(snout);
  mesh(S(0.34, 32, 22), gold, snout, 0, 0, 0, 1.08, 0.72, 0.9);
  const mouthM = new THREE.MeshStandardMaterial({ map: mouthTex(0), transparent: true, roughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.343, 32, 22, Math.PI / 2 - 0.9, 1.8, 1.1, 1.0), mouthM); mouth.rotation.y = Math.PI; mouth.scale.set(1.08, 0.72, 0.9); mouth.renderOrder = 2; snout.add(mouth);
  // horns and ear frills
  for (const s of [-1, 1]) {
    const hg = new THREE.Group(); hg.position.set(s * 0.26, 0.42, -0.14); hg.rotation.set(-0.6, 0, -s * 0.28); head.add(hg);
    mesh(new THREE.ConeGeometry(0.085, 0.42, 10), horn, hg, 0, 0.2, 0);
    const tip2 = mesh(new THREE.ConeGeometry(0.05, 0.22, 8), horn, hg, 0, 0.42, -0.06); tip2.rotation.x = -0.6;
    const ear = mesh(new THREE.ConeGeometry(0.16, 0.42, 4), membrane, head, s * 0.56, 0.12, -0.12, 0.35, 1, 1); ear.rotation.set(-0.3, 0, -s * 1.25);
    mesh(S(0.07, 10, 8), horn, head, s * 0.1, 0.56, 0.22, 1, 0.6, 1);
  }
  // a tuft on top
  for (let i = 0; i < 3; i++) { const k = mesh(new THREE.ConeGeometry(0.06, 0.2, 6), horn, head, 0, 0.58, 0.05 - i * 0.14); k.rotation.x = -0.4 - i * 0.2; }

  const d = { g, root, body, head, neck, snout, wings, tail, legs, arms, eyes, mouth, mats: all, moodNow: 'open' };
  d.setFace = (mood = 'open', blink = false, gaze = [0, 0], mouthOpen = 0) => {
    const gx = Math.round(clamp(gaze[0], -1, 1) * 2) / 2, gy = Math.round(clamp(gaze[1], -1, 1) * 2) / 2;
    const tx = eyeTex(mood, blink, gx, gy); if (eyeM.map !== tx) { eyeM.map = tx; eyeM.needsUpdate = true; }
    const mt = mouthTex(mouthOpen); if (mouthM.map !== mt) { mouthM.map = mt; mouthM.needsUpdate = true; }
  };
  // the poses: every frame from scratch, so a frame depends only on t
  d.pose = (p = {}) => {
    const t = p.t ?? 0, mode = p.mode || 'sit', ph = p.phase ?? 0;
    root.position.set(0, 0, 0); root.scale.set(1, 1, 1); body.rotation.set(0, 0, 0); body.position.set(0, 0.95, 0);
    neck.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0);
    const breathe = Math.sin(t * 2.4 + ph) * 0.02;
    let flap = p.flap ?? 0, wingFold = 0.55, tailAmp = 0.18, tailRate = 1.6, tailLift = 0.15;
    legs.forEach((l) => l.rotation.set(0, 0, 0)); arms.forEach((a) => a.rotation.set(0, 0, 0));
    if (mode === 'sit') {
      body.position.y = 0.9; root.scale.set(1 + breathe, 1 - breathe, 1 + breathe);
      legs.forEach((l, i) => { l.rotation.x = -0.25; l.rotation.z = (i ? -1 : 1) * 0.12; });
      arms.forEach((a, i) => { a.rotation.x = -0.25; a.rotation.z = (i ? 0.15 : -0.15); });
      tailAmp = 0.12; tailLift = -0.05;
    } else if (mode === 'hover' || mode === 'fly') {
      flap = p.flap ?? 1; const fly = mode === 'fly';
      body.position.y = 1.05 + Math.sin(t * 6 + ph) * 0.06 * (fly ? 0.5 : 1);
      body.rotation.x = fly ? 0.55 : 0.12;
      legs.forEach((l, i) => { l.rotation.x = fly ? 0.9 : 0.3 + Math.sin(t * 3 + i) * 0.1; l.rotation.z = (i ? -1 : 1) * 0.08; });
      arms.forEach((a, i) => { a.rotation.x = fly ? 0.8 : -0.4; a.rotation.z = (i ? 0.2 : -0.2); });
      neck.rotation.x = fly ? -0.45 : -0.08; tailAmp = fly ? 0.12 : 0.25; tailRate = fly ? 4 : 2; tailLift = fly ? -0.2 : 0.05;
    } else if (mode === 'held') {
      body.position.y = 0.95; body.rotation.x = -0.12;
      legs.forEach((l, i) => { l.rotation.x = 0.45 + Math.sin(t * 2.2 + i * 2) * 0.12; l.rotation.z = (i ? -1 : 1) * 0.1; });
      arms.forEach((a, i) => { a.rotation.x = -0.7; a.rotation.z = (i ? 0.25 : -0.25); });
      wingFold = 0.75; tailAmp = 0.22; tailLift = -0.35;
    } else if (mode === 'hop') {
      const h = p.hop ?? 0, air = Math.sin(Math.PI * h), squash = h < 0.12 ? (1 - h / 0.12) * 0.18 : h > 0.88 ? (h - 0.88) / 0.12 * 0.18 : 0;
      root.position.y = air * (p.height ?? 1.1);
      root.scale.set(1 + squash, 1 - squash * 1.4 + air * 0.08, 1 + squash);
      legs.forEach((l, i) => { l.rotation.x = air * 0.6; l.rotation.z = (i ? -1 : 1) * 0.15; });
      arms.forEach((a, i) => { a.rotation.x = -1.6 * air - 0.3; a.rotation.z = (i ? 1 : -1) * (0.5 + air * 0.4); });
      flap = 0.6 + air * 0.4; tailAmp = 0.3; tailRate = 5; tailLift = 0.3 * air;
    }
    // wings
    wings.forEach((w, i) => {
      const s = i ? 1 : -1, beat = flap > 0 ? Math.sin(t * (mode === 'fly' ? 16 : 13) + ph) : 0;
      w.rotation.set(0, 0, 0);
      w.rotation.z = s * (flap > 0 ? lerp(0.15, 0.2 + beat * 0.85, flap) : 0.15 + breathe);
      w.rotation.y = -s * lerp(wingFold, 0.15, flap);
      w.rotation.x = -0.1;
    });
    // tail
    tail.forEach((seg, i) => { seg.rotation.set(i ? tailLift * 0.4 : tailLift + 0.35, Math.sin(t * tailRate + ph - i * 0.6) * tailAmp * (0.6 + i * 0.25), 0); });
    // head
    neck.rotation.x += (p.headPitch ?? 0) * 0.5; head.rotation.x = (p.headPitch ?? 0) * 0.6 + breathe;
    head.rotation.y = p.headYaw ?? 0; head.rotation.z = p.tilt ?? 0;
    const blink = p.blink ?? (((t + ph * 1.7) % 3.1) < 0.11);
    d.setFace(p.mood || 'open', blink && !['happy', 'sleepy'].includes(p.mood), p.gaze || [0, 0], p.mouth ?? 0);
  };
  d.pose({ t: 0 });
  // the snout's front in world space (where a held key sits)
  d.mouthAt = (out = v3(0, 0, 0)) => { snout.updateWorldMatrix(true, false); return out.set(0, -0.1, 0.32).applyMatrix4(snout.matrixWorld); };
  return d;
}

// ---- a small golden key ----
export function goldenKey(o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: '#ffcf4a', metalness: 0.95, roughness: 0.22, emissive: '#ffb020', emissiveIntensity: o.glow ?? 0.25 });
  const g = new THREE.Group(), s = o.size ?? 1;
  const add = (geo, x, y, z, rx = 0, ry = 0, rz = 0) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.rotation.set(rx, ry, rz); k.castShadow = true; g.add(k); return k; };
  add(new THREE.TorusGeometry(0.17, 0.045, 10, 28), 0, 0.2, 0);
  // a heart in the bow
  const hs = new THREE.Shape(); hs.moveTo(0, -0.07); hs.bezierCurveTo(-0.12, 0.02, -0.06, 0.1, 0, 0.04); hs.bezierCurveTo(0.06, 0.1, 0.12, 0.02, 0, -0.07);
  add(new THREE.ExtrudeGeometry(hs, { depth: 0.04, bevelEnabled: false }), 0, 0.21, -0.02);
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 10), 0, -0.24, 0);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), 0, 0.02, 0);
  add(new THREE.BoxGeometry(0.12, 0.05, 0.035), 0.06, -0.44, 0); add(new THREE.BoxGeometry(0.09, 0.05, 0.035), 0.045, -0.34, 0);
  g.scale.setScalar(s); g.userData.mat = m;
  return g;
}

// ---- a golden egg (the pet shop) ----
export function goldenEgg(o = {}) {
  const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI; pts.push(new THREE.Vector2(Math.sin(a) * (0.62 + 0.12 * Math.cos(a)), -Math.cos(a) * 0.9)); }
  const tex = canvas(512, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff3c0'); g.addColorStop(1, '#f2b232'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    const r = rng(5); for (let i = 0; i < 40; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.75)' : 'rgba(214,130,30,0.6)'; x.beginPath(); x.arc(r() * w, r() * h, 6 + r() * 14, 0, 7); x.fill(); }
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.4, emissive: '#ffb020', emissiveIntensity: 0.12 });
  const g = new THREE.Group();
  const cut = 13;   // the shell splits at the waist into a top and a bottom half
  const bot = new THREE.Mesh(new THREE.LatheGeometry(pts.slice(0, cut + 1), 32), m), top = new THREE.Mesh(new THREE.LatheGeometry(pts.slice(cut), 32), m);
  for (const k of [bot, top]) { k.castShadow = true; k.receiveShadow = true; k.material.side = THREE.DoubleSide; }
  bot.position.y = 0.9; const topG = new THREE.Group(); topG.position.y = 0.9; topG.add(top); g.add(bot, topG);
  g.userData = { bot, top: topG, mat: m };
  return g;
}
