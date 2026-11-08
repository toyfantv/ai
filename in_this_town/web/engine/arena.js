// Midnight arena kit (Episode 33): an abandoned magic arena with impossible architecture (tiers that break off and float,
// an upside-down ring of arches in the sky, stairs to nowhere), a gate with a clock and a bell, braziers with cold flames,
// the rocky underside that shows when the arena lifts into a black void, and the duel's magic: a lightning strike and
// its scorch, a wall of fire that parts round a walker, glowing energy orbs with trails, a one-hand rune shield, a fire
// stream, hand-to-hand lightning arcs, a violet shockwave, an aura and sigil, a cloak dissolve with its particles, a
// teleport streak, and a crowd of shadow spectators that fade in and turn their heads (instanced, eyes lit).
// Every moving part takes a time, so a frame depends only on t.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { v3, rng, clamp, lerp, smooth } from './core.js';
import { Batch, surf } from './kit.js';
import { canvasTex } from './props.js';

const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vn(x, y) {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(hash2(i, j), hash2(i + 1, j), a), lerp(hash2(i, j + 1), hash2(i + 1, j + 1), a), b);
}
const fbm = (x, y) => vn(x, y) * 0.55 + vn(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + vn(x * 4.3 + 1, y * 4.3 + 9) * 0.15;
const noAO = (o) => { o.traverse((m) => { if (m.isMesh || m.isPoints || m.isSprite) m.userData.noAO = true; }); return o; };
const GLSL_NOISE = `
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm2(vec2 p){ return vn2(p) * 0.55 + vn2(p * 2.07 + 7.0) * 0.28 + vn2(p * 4.3 + 3.0) * 0.17; }`;

// ---------------- the arena ----------------
// floor radius R at y = 0, the gate toward +z; tiers ring the floor except at the gate
export function magicArena(o = {}) {
  const R = o.R ?? 22, r = rng(o.seed ?? 33), group = new THREE.Group();
  const GATE = Math.PI / 2;            // the gate's angle (x = cos a, z = sin a): +z
  const angOff = (a) => Math.abs(Math.atan2(Math.sin(a - GATE), Math.cos(a - GATE)));
  // the floor: concentric stone rings with radial joints, cracks and worn patches
  const ftex = canvasTex(2048, 2048, (x, w, h) => {
    const rr = rng(5); x.fillStyle = '#26252a'; x.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, ringW = w / 2 / 11;
    for (let i = 0; i < 11; i++) {
      const r0 = i * ringW, r1 = r0 + ringW, n = Math.max(6, Math.floor(6 + i * 6.2));
      for (let k = 0; k < n; k++) {
        const a0 = (k + (i % 2) * 0.5) / n * Math.PI * 2, a1 = a0 + Math.PI * 2 / n, g = 92 + rr() * 34;
        x.fillStyle = `rgb(${g + 2},${g},${g + 8})`;
        x.beginPath(); x.arc(cx, cy, r1 - 3, a0 + 0.004, a1 - 0.004); x.arc(cx, cy, Math.max(0, r0 + 3), a1 - 0.004, a0 + 0.004, true); x.closePath(); x.fill();
        for (let q = 0; q < 6; q++) { const a = lerp(a0, a1, rr()), d = lerp(r0, r1, rr()); x.fillStyle = `rgba(${rr() < 0.5 ? '255,255,255' : '0,0,0'},0.06)`; x.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 8 + rr() * 30, 4 + rr() * 14); }
      }
    }
    x.strokeStyle = 'rgba(12,10,16,0.85)'; x.lineWidth = 3;
    for (let i = 0; i < 70; i++) { let px = rr() * w, py = rr() * h; x.beginPath(); x.moveTo(px, py); for (let q = 0; q < 6; q++) { px += (rr() - 0.5) * 70; py += (rr() - 0.5) * 70; x.lineTo(px, py); } x.stroke(); }
    // the duel lines: a worn ring and the two marks where the duellists stand
    x.strokeStyle = 'rgba(30,26,40,0.6)'; x.lineWidth = 16; x.beginPath(); x.arc(cx, cy, w * 0.3, 0, 7); x.stroke();
  });
  ftex.colorSpace = THREE.SRGBColorSpace; ftex.anisotropy = 8;
  const floorM = new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.78, metalness: 0.02, color: '#c9c4d4' });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 0.6, 96), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; group.add(floor);
  // the rune ring inlaid in the floor (glows violet when the arena wakes): .runes.material.opacity
  const rtex = canvasTex(2048, 2048, (x, w, h) => {
    const rr = rng(8), cx = w / 2, cy = h / 2; x.clearRect(0, 0, w, h); x.strokeStyle = '#ffffff'; x.fillStyle = '#ffffff';
    x.lineWidth = 7; x.beginPath(); x.arc(cx, cy, w * 0.46, 0, 7); x.stroke(); x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, w * 0.42, 0, 7); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, w * 0.155, 0, 7); x.stroke(); x.beginPath(); x.arc(cx, cy, w * 0.135, 0, 7); x.stroke();
    x.font = '700 46px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const glyphs = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2; x.save(); x.translate(cx + Math.cos(a) * w * 0.44, cy + Math.sin(a) * w * 0.44); x.rotate(a + Math.PI / 2); x.fillText(glyphs[Math.floor(rr() * glyphs.length)], 0, 0); x.restore(); }
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; x.lineWidth = 3; x.beginPath(); x.moveTo(cx + Math.cos(a) * w * 0.155, cy + Math.sin(a) * w * 0.155); x.lineTo(cx + Math.cos(a) * w * 0.42, cy + Math.sin(a) * w * 0.42); x.stroke(); }
    // a star of two squares in the middle
    x.lineWidth = 4; for (const s of [0, Math.PI / 4]) { x.beginPath(); for (let k = 0; k <= 4; k++) { const a = s + k / 4 * Math.PI * 2; const px = cx + Math.cos(a) * w * 0.13, py = cy + Math.sin(a) * w * 0.13; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
  });
  const runeM = new THREE.MeshBasicMaterial({ map: rtex, color: '#a875ff', transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
  const runes = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), runeM); runes.rotation.x = -Math.PI / 2; runes.position.y = 0.03; group.add(runes);
  // the parapet: a low stone ring with a gap at the gate
  const b = new Batch(), stone = surf('concrete', '#8b8796', { roughness: 0.9 }), dark = surf('concrete', '#57535f', { roughness: 0.92 });
  const trim = surf('concrete', '#a7a2b4', { roughness: 0.8 });
  for (let k = 0; k < 60; k++) {
    const a = (k + 0.5) / 60 * Math.PI * 2; if (angOff(a) < 0.17) continue;
    const rw = R + 1.1, w = rw * Math.PI * 2 / 60 + 0.05;
    b.box(stone, w, 1.3, 1.1, Math.cos(a) * rw, 0.65, Math.sin(a) * rw, { ry: -a + Math.PI / 2, r: 0.08 });
    b.box(trim, w, 0.18, 1.3, Math.cos(a) * rw, 1.36, Math.sin(a) * rw, { ry: -a + Math.PI / 2, r: 0.05 });
  }
  // the tiers: 12 stepped rings, broken in places; seats: the spectators' places (x, y, z, angle)
  const seats = [], ROWS = o.rows ?? 12, floating = [];
  for (let i = 0; i < ROWS; i++) {
    const r0 = R + 2.6 + i * 2.25, top = 1.5 + i * 1.45, n = Math.floor(r0 * 2.6);
    for (let k = 0; k < n; k++) {
      const a = (k + 0.5) / n * Math.PI * 2; if (angOff(a) < 0.24 + i * 0.004) continue;
      const broken = fbm(Math.cos(a) * 3 + i * 0.4, Math.sin(a) * 3) > 0.7 && i > 3;
      if (broken) continue;
      const w = r0 * Math.PI * 2 / n + 0.04, x = Math.cos(a) * (r0 + 1.1), z = Math.sin(a) * (r0 + 1.1);
      b.box(i % 3 === 2 ? dark : stone, w, top, 2.3, x, top / 2, z, { ry: -a + Math.PI / 2, r: 0.06 });
      b.box(trim, w, 0.14, 2.38, x, top + 0.02, z, { ry: -a + Math.PI / 2, r: 0.04 });
      if (k % 1 === 0) seats.push({ x: Math.cos(a) * (r0 + 1.35), y: top, z: Math.sin(a) * (r0 + 1.35), a, row: i });
    }
  }
  // the outer wall behind the top row, columns and broken arches on it
  const RO = R + 2.6 + ROWS * 2.25 + 1.4, wallTop = 1.5 + ROWS * 1.45 + 3;
  for (let k = 0; k < 96; k++) {
    const a = (k + 0.5) / 96 * Math.PI * 2; if (angOff(a) < 0.2) continue;
    const w = RO * Math.PI * 2 / 96 + 0.05, h = wallTop - (fbm(a * 4, 2) > 0.66 ? 3 + fbm(a * 9, 1) * 5 : 0);
    b.box(dark, w, h, 1.6, Math.cos(a) * RO, h / 2, Math.sin(a) * RO, { ry: -a + Math.PI / 2, r: 0.1 });
    if (k % 6 === 0) { const ch = h + 6 + (k % 12 === 0 ? 0 : -3 - r() * 3); b.box(stone, 1.6, ch, 1.6, Math.cos(a) * (RO - 0.4), ch / 2, Math.sin(a) * (RO - 0.4), { ry: -a, r: 0.12 }); }
  }
  // the gate: two towers, a lintel with an arch, a passage to the bridge
  const GZ = R + 2, gw = 9;
  b.box(stone, 4.2, 26, 4.2, -gw / 2 - 2.1, 13, GZ + 4, { r: 0.15 }); b.box(stone, 4.2, 26, 4.2, gw / 2 + 2.1, 13, GZ + 4, { r: 0.15 });
  b.box(trim, 4.8, 0.6, 4.8, -gw / 2 - 2.1, 26.3, GZ + 4); b.box(trim, 4.8, 0.6, 4.8, gw / 2 + 2.1, 26.3, GZ + 4);
  b.box(dark, gw + 8.4, 4, 4.4, 0, 20, GZ + 4, { r: 0.12 });
  for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI; b.box(trim, 1.4, 1.1, 4.5, Math.cos(a) * (gw / 2), 13.2 + Math.sin(a) * 4.6, GZ + 4, { rz: a - Math.PI / 2, r: 0.06 }); }
  b.box(dark, gw + 8.4, 2.2, 4.4, 0, 23.1, GZ + 4);
  // the passage walls and the bridge out to the ground
  b.box(dark, 1.2, 9, 14, -gw / 2 - 0.6, 4.5, GZ + 9); b.box(dark, 1.2, 9, 14, gw / 2 + 0.6, 4.5, GZ + 9);
  b.box(stone, gw + 2.4, 1, 34, 0, -0.5, GZ + 17, { r: 0.05 });
  // stairs to nowhere outside the arena, an upside-down ring of arches in the sky, tier fragments floating
  for (let s = 0; s < 22; s++) { const a = -2.3 + s * 0.09, rad = RO + 8 + s * 0.6; b.box(stone, 3.2, 0.7, 2, Math.cos(a) * rad, 6 + s * 1.5, Math.sin(a) * rad, { ry: -a, r: 0.06 }); }
  const sky = new Batch();
  for (let k = 0; k < 28; k++) {   // the ring of arches hangs upside down over the arena
    const a = k / 28 * Math.PI * 2, rad = 34, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    sky.box(stone, 1.8, 9, 1.8, x, 58 - 4.5, z, { ry: -a, r: 0.1 });
    const a2 = a + Math.PI / 28, x2 = Math.cos(a2) * rad, z2 = Math.sin(a2) * rad;
    for (let q = 0; q < 5; q++) { const u = q / 4 * Math.PI; sky.box(trim, 1.6, 1, 1.6, x2 + Math.cos(a2 + Math.PI / 2) * Math.cos(u) * 3.6, 49 - Math.sin(u) * 3.2, z2 + Math.sin(a2 + Math.PI / 2) * Math.cos(u) * 3.6, { ry: -a2, r: 0.06 }); }
  }
  const skyRing = sky.done(); skyRing.position.y = 4; group.add(skyRing);
  for (let f = 0; f < 7; f++) {   // broken tier sections floating above their gaps, a little tilted
    const fb = new Batch(), a = 0.5 + f * 0.83, rr0 = R + 12 + (f % 3) * 6;
    for (let q = 0; q < 4; q++) for (let s = 0; s < 3; s++) fb.box(s % 2 ? dark : stone, 2.6, 1.4, 2.2, (q - 1.5) * 2.65, s * 1.45, s * 2.2, { r: 0.06 });
    const g = fb.done(); g.position.set(Math.cos(a) * rr0, 22 + (f % 4) * 6, Math.sin(a) * rr0); g.rotation.set(0.2 * Math.sin(f * 3), -a + Math.PI / 2, 0.25 * Math.cos(f * 2));
    g.userData.bob = f; floating.push(g); group.add(g);
  }
  b.done(group);
  // the underside: a rough rock cone (it shows only when the arena has lifted)
  const prof = []; for (let i = 0; i <= 30; i++) { const u = i / 30; prof.push(new THREE.Vector2((RO + 3) * Math.pow(1 - u, 0.8) + 0.5, -0.4 - u * 62)); }
  const ug = new THREE.LatheGeometry(prof, 72), up = ug.attributes.position, uc = [];
  for (let i = 0; i < up.count; i++) {
    const x = up.getX(i), y = up.getY(i), z = up.getZ(i), a = Math.atan2(z, x), n = fbm(a * 4 + 3, y * 0.09) - 0.5, k = 1 + n * 0.45 * smooth(0, -6, y);
    up.setXYZ(i, x * k, y + n * 3 * smooth(0, -6, y), z * k); const c = 0.18 + fbm(a * 9, y * 0.2) * 0.14; uc.push(c * 0.9, c * 0.85, c);
  }
  ug.setAttribute('color', new THREE.Float32BufferAttribute(uc, 3)); ug.computeVertexNormals();
  const under = new THREE.Mesh(ug, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }));
  under.castShadow = false; under.receiveShadow = true; group.add(under);
  // braziers on the parapet: cold violet flames and a light each
  const braziers = [], bowlM = surf('concrete', '#4a4552', { roughness: 0.7, metalness: 0.3 });
  [0.18, 0.95, 1.75, 2.55, 3.35, 4.15, 4.95, 5.75].forEach((a0, i) => {
    const a = GATE + a0 + 0.28, x = Math.cos(a) * (R + 1.1), z = Math.sin(a) * (R + 1.1), g = new THREE.Group(); g.position.set(x, 1.45, z);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.42, 0.55, 16), bowlM); bowl.position.y = 0.28; bowl.castShadow = true; g.add(bowl);
    const fl = coldFlame({ seed: i + 1, size: 1.25 }); fl.position.y = 0.5; g.add(fl);
    const L = new THREE.PointLight('#a37bff', 0, 16, 1.6); L.position.y = 1.6; g.add(L); g.light = L; g.flame = fl; g.angle = a;
    group.add(g); braziers.push(g);
  });
  // the gate's clock and bell
  const clock = gateClock(); clock.position.set(0, 20, GZ + 1.75); group.add(clock);
  const bell = bigBell(); bell.position.set(0, 17.2, GZ + 4); group.add(bell);
  const api = {
    group, R, seats, floor, runes, under, braziers, clock, bell, floating, skyRing, GZ, RO, wallTop,
    update(t, o2 = {}) {
      braziers.forEach((g, i) => { g.flame.update(t); g.light.intensity = (o2.brazier ?? 18) * (1 + 0.12 * Math.sin(t * 9 + i * 2.1) + 0.06 * Math.sin(t * 23 + i)); });
      floating.forEach((g) => { const f = g.userData.bob; g.position.y += Math.sin(t * 0.6 + f) * 0.004; g.rotation.y += Math.sin(t * 0.3 + f) * 0.0004; });
      skyRing.rotation.y = t * 0.02;
      runeM.opacity = o2.runes ?? 0.25;
    },
  };
  return api;
}

// a pale-violet flame (braziers): two teardrops whose colour stays near 1.0 (no bloom glare)
export function coldFlame(o = {}) {
  const g = new THREE.Group(), s = o.size ?? 1;
  const drop = new THREE.LatheGeometry([[0, 0], [0.32, 0.16], [0.36, 0.42], [0.2, 0.86], [0, 1.45]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  const outer = new THREE.Mesh(drop, new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color || '#9b6cff').multiplyScalar(1.15), transparent: true, opacity: 0.9, fog: false }));
  const inner = new THREE.Mesh(drop, new THREE.MeshBasicMaterial({ color: new THREE.Color(o.core || '#e6dcff').multiplyScalar(1.05), fog: false }));
  inner.scale.setScalar(0.5); inner.position.y = 0.03; g.add(outer, inner); g.scale.setScalar(s); noAO(g);
  const ph = (o.seed ?? 1) * 7.1;
  g.update = (t) => { const f = 1 + 0.14 * Math.sin(t * 11 + ph) + 0.08 * Math.sin(t * 27 + ph * 2); outer.scale.set(1 / f, f, 1 / f); outer.rotation.z = 0.08 * Math.sin(t * 6 + ph); inner.scale.set(0.5 / f, 0.5 * f, 0.5 / f); };
  return g;
}

// the clock over the gate: Roman numerals; .set(hours as a float, e.g. 23.99)
export function gateClock() {
  const g = new THREE.Group();
  const tex = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#d9d2bd'; x.beginPath(); x.arc(w / 2, h / 2, w * 0.48, 0, 7); x.fill(); x.lineWidth = 14; x.strokeStyle = '#3a3240'; x.stroke();
    x.fillStyle = '#2a2430'; x.font = '700 50px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; x.fillText(n, w / 2 + Math.cos(a) * w * 0.37, h / 2 + Math.sin(a) * w * 0.37); });
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; x.fillRect(w / 2 + Math.cos(a) * w * 0.44 - 2, h / 2 + Math.sin(a) * w * 0.44 - 2, 4, 4); }
  });
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: '#d9cfae', emissiveMap: tex, emissiveIntensity: 0.25 }));
  face.position.z = 0.02; g.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.2, 8, 48), new THREE.MeshStandardMaterial({ color: '#4a4050', metalness: 0.5, roughness: 0.4 })); g.add(rim);
  g.rotation.y = Math.PI;   // faces -z: into the arena... the gate's inside
  const handM = new THREE.MeshStandardMaterial({ color: '#1c1820', roughness: 0.5 });
  const hand = (len, wd) => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.06), handM); m.position.y = len / 2 - 0.2; p.add(m); p.position.z = 0.1; g.add(p); return p; };
  const hh = hand(1.45, 0.2), mh = hand(2.1, 0.12);
  g.set = (hours) => { mh.rotation.z = -(hours % 1) * Math.PI * 2; hh.rotation.z = -(hours % 12) / 12 * Math.PI * 2; };
  g.set(23.99); return g;
}

// a big bronze bell in the gate arch; .set(swing angle, ring 0..1)
export function bigBell() {
  const g = new THREE.Group(), pivot = new THREE.Group(); g.add(pivot);
  const prof = [[0, 0], [1.2, 0.05], [1.55, -0.4], [1.5, -1.0], [1.15, -1.8], [1.0, -2.5], [0.9, -2.9], [0.4, -3.05], [0, -3.1]].map(([x, y]) => new THREE.Vector2(x, y + 3.1)).reverse();
  const m = new THREE.MeshStandardMaterial({ color: '#8a6a3a', metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), m); body.position.y = -3.1; body.castShadow = true; pivot.add(body);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.12, 8, 40), m); lip.rotation.x = Math.PI / 2; lip.position.y = -3.0; pivot.add(lip);
  const clap = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshStandardMaterial({ color: '#3a3026', metalness: 0.7, roughness: 0.4 })); clap.position.y = -2.7; pivot.add(clap);
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: '#2a2228', roughness: 0.8 })); yoke.position.y = 0.3; g.add(yoke);
  g.set = (a, ring = 0) => { pivot.rotation.x = a; clap.position.z = -Math.sin(a * 1.6) * 0.6; m.emissive = m.emissive || new THREE.Color(); m.emissive.set('#ffd28a'); m.emissiveIntensity = ring * 0.25; };
  g.set(0); return g;
}

// the ground round the arena before it lifts: dark scrub and rock, a hole the arena sits in, broken spires and dead trees
export function arenaGround(o = {}) {
  const hole = o.hole ?? 56, g = new THREE.Group(), r = rng(o.seed ?? 4);
  const geo = new THREE.RingGeometry(hole, 700, 96, 24), p = geo.attributes.position, cl = [];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), d = Math.hypot(x, y), n = fbm(x * 0.03, y * 0.03); p.setZ(i, (n - 0.5) * 4 * smooth(hole, hole + 30, d) + smooth(200, 600, d) * n * 40); const c = 0.1 + n * 0.08; cl.push(c * 0.95, c * 0.9, c * 1.15); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); geo.computeVertexNormals();
  const m = surf('grass', '#ffffff', { roughness: 0.95 }).clone(); m.vertexColors = true; m.color.set('#6e6880');
  const ground = new THREE.Mesh(geo, m); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.6; ground.receiveShadow = true; g.add(ground);
  // the crack ring where the arena tears out (shows as it lifts)
  const lip = new THREE.Mesh(new THREE.RingGeometry(hole - 4, hole + 0.5, 96), new THREE.MeshStandardMaterial({ color: '#141218', roughness: 1 })); lip.rotation.x = -Math.PI / 2; lip.position.y = -0.55; g.add(lip);
  const b = new Batch(), rock = surf('concrete', '#4a4652', { roughness: 0.95 });
  for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = hole + 14 + r() * 160, h = 4 + r() * 22; if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.25) continue; b.box(rock, 2 + r() * 4, h, 2 + r() * 4, Math.cos(a) * d, h / 2 - 1, Math.sin(a) * d, { ry: r() * 3, rz: (r() - 0.5) * 0.3, r: 0.3 }); }
  const bark = surf('concrete', '#2a2430', { roughness: 1 });
  for (let i = 0; i < 26; i++) {   // dead trees: a trunk and a few bare branches
    const a = r() * Math.PI * 2, d = hole + 20 + r() * 120, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 7 + r() * 8;
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.3) continue;
    b.cyl(bark, 0.25, 0.55, h, x, h / 2 - 0.6, z, { seg: 7 });
    for (let q = 0; q < 4; q++) { const ba = r() * 6.28, bl = 2 + r() * 3; b.cyl(bark, 0.08, 0.2, bl, x + Math.cos(ba) * bl * 0.4, h * (0.55 + q * 0.1), z + Math.sin(ba) * bl * 0.4, { rz: Math.cos(ba) * 0.9, rx: Math.sin(ba) * 0.9, seg: 5 }); }
  }
  b.done(g);
  return g;
}

// floating rock debris for the void (instanced); .update(t)
export function voidRocks(scene, o = {}) {
  const n = o.count ?? 160, r = rng(o.seed ?? 12), im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#3c3846', roughness: 0.95, flatShading: true }), n);
  const items = []; for (let i = 0; i < n; i++) { const a = r() * 6.28, d = (o.r0 ?? 70) + r() * (o.spread ?? 160); items.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, y: (r() - 0.6) * 120, s: 0.6 + r() * r() * 7, sp: (r() - 0.5) * 0.3, ph: r() * 6 }); }
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  im.update = (t) => { items.forEach((a, i) => { q.setFromEuler(e.set(a.ph + t * a.sp, a.ph * 2 + t * a.sp * 0.7, 0)); M.compose(v3(a.x, a.y + Math.sin(t * 0.3 + a.ph) * 1.5, a.z), q, v3(a.s, a.s * 0.8, a.s)); im.setMatrixAt(i, M); }); im.instanceMatrix.needsUpdate = true; };
  im.update(0); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; (o.parent || scene).add(im); return im;
}

// rocks breaking off the underside as it tears free: they fall from the rim; .set(t - tStart)
export function fallingRocks(parent, o = {}) {
  const n = o.count ?? 70, r = rng(o.seed ?? 21), im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#46404e', roughness: 0.95, flatShading: true }), n);
  const items = []; for (let i = 0; i < n; i++) { const a = r() * 6.28, d = (o.R ?? 50) * (0.55 + r() * 0.5); items.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, y: -2 - r() * 20, s: 0.5 + r() * 2.4, d0: r() * 2.2, vx: Math.cos(a) * r() * 3, vz: Math.sin(a) * r() * 3, ph: r() * 6 }); }
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  im.set = (age) => {
    im.visible = age > 0 && age < 9;
    items.forEach((a, i) => { const t = Math.max(0, age - a.d0); q.setFromEuler(e.set(a.ph + t * 2, a.ph + t, 0)); M.compose(v3(a.x + a.vx * t, a.y - 0.5 * 30 * t * t, a.z + a.vz * t), q, v3(a.s, a.s, a.s).multiplyScalar(age > a.d0 ? 1 : 0.001)); im.setMatrixAt(i, M); });
    im.instanceMatrix.needsUpdate = true;
  };
  im.frustumCulled = false; parent.add(im); im.set(0); return im;
}

// ---------------- magic ----------------
const glowTex = (() => { let t = null; return () => t ||= canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }); })();
export function glow(color, size, opacity = 0.7) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
  s.scale.setScalar(size); s.userData.noAO = true; return s;
}

// a wall of fire along x from -len/2 to len/2 (at the group's origin); .set(k height 0..1, t, part: [x, amount]) parts the flames round x
export function fireWall(o = {}) {
  const len = o.len ?? 18, H = o.h ?? 5.5, g = new THREE.Group(), mats = [];
  const mk = (seed, z, w, h, op) => {
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uT: { value: 0 }, uK: { value: 0 }, uPart: { value: new THREE.Vector2(0, 0) }, uSeed: { value: seed }, uLen: { value: w }, uOp: { value: op } },
      vertexShader: `varying vec2 vUv; varying float vX; void main(){ vUv = uv; vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `${GLSL_NOISE}
        varying vec2 vUv; varying float vX; uniform float uT, uK, uSeed, uLen, uOp; uniform vec2 uPart;
        void main(){
          float part = 1.0 - uPart.y * smoothstep(2.4, 0.6, abs(vX - uPart.x));
          float hgt = uK * part * (0.75 + 0.35 * fbm2(vec2(vX * 0.35 + uSeed, uT * 0.8)));
          vec2 q = vec2(vX * 0.55 + uSeed * 3.1, vUv.y * 2.2 - uT * 2.4);
          float n = fbm2(q) * 0.65 + fbm2(q * 2.3 + vec2(0.0, -uT * 1.5)) * 0.35;
          float y = vUv.y / max(0.05, hgt);
          float f = smoothstep(1.0, 0.1, y + (n - 0.5) * 0.9) * smoothstep(0.0, 0.06, vUv.y);
          float edge = smoothstep(uLen * 0.5, uLen * 0.5 - 1.2, abs(vX));
          f *= edge;
          vec3 c = mix(vec3(0.55, 0.08, 0.02), vec3(1.0, 0.42, 0.06), smoothstep(0.15, 0.55, f));
          c = mix(c, vec3(0.95, 0.72, 0.36), smoothstep(0.65, 1.0, f) * smoothstep(0.7, 0.0, y));
          gl_FragColor = vec4(c, f * uOp); }` });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 1), m); p.position.set(0, h / 2, z); p.userData.noAO = true; g.add(p); mats.push(m); return p;
  };
  mk(0.3, -0.35, len, H, 0.4); mk(1.7, 0, len, H * 1.1, 0.55); mk(3.9, 0.35, len, H * 0.85, 0.4);
  // embers and two warm lights
  const em = sparksField({ count: 220, color: '#ffa055', w: len, h: H * 1.4, d: 1.2, rise: 3.2, size: 0.07 }); g.add(em);
  const L1 = new THREE.PointLight('#ff8a3a', 0, 26, 1.5), L2 = new THREE.PointLight('#ff8a3a', 0, 26, 1.5); L1.position.set(-len * 0.25, 2.2, 0.6); L2.position.set(len * 0.25, 2.2, 0.6); g.add(L1, L2);
  g.lights = [L1, L2];
  g.set = (k, t, part = [0, 0], lightI = 60) => {
    g.visible = k > 0.005; mats.forEach((m) => { m.uniforms.uT.value = t; m.uniforms.uK.value = k; m.uniforms.uPart.value.set(part[0], part[1]); });
    em.update(t, k); [L1, L2].forEach((L, i) => { L.intensity = lightI * k * (1 + 0.15 * Math.sin(t * 13 + i * 2)); });
  };
  g.set(0, 0); return g;
}

// rising sparks in a box (embers, motes); .update(t, amount)
export function sparksField(o = {}) {
  const n = o.count ?? 200, r = rng(o.seed ?? 9), pos = new Float32Array(n * 3), sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * (o.w ?? 4); pos[i * 3 + 1] = 0; pos[i * 3 + 2] = (r() - 0.5) * (o.d ?? 4); sd[i] = r(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { t: { value: 0 }, k: { value: 1 }, H: { value: o.h ?? 5 }, rise: { value: o.rise ?? 2 }, px: { value: o.size ?? 0.12 }, color: { value: new THREE.Color(o.color || '#ffb066') } },
    vertexShader: `attribute float seed; uniform float t, H, rise, px, k; varying float a;
      void main(){ float ph = fract(t * rise / H * (0.6 + seed * 0.8) + seed * 17.0); vec3 p = position;
        p.y = ph * H; p.x += sin(t * 2.0 + seed * 40.0) * 0.4 * ph; p.z += cos(t * 1.7 + seed * 30.0) * 0.4 * ph;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        a = k * sin(ph * 3.14159) * step(seed, k * 1.2);
        gl_PointSize = px * 900.0 / max(1.0, -mv.z) * (0.5 + seed); }`,
    fragmentShader: `uniform vec3 color; varying float a; void main(){ float d = length(gl_PointCoord - 0.5); if (a < 0.01) discard; gl_FragColor = vec4(color, a * smoothstep(0.5, 0.0, d)); }` });
  const p = new THREE.Points(geo, m); p.frustumCulled = false; p.userData.noAO = true;
  p.update = (t, k = 1) => { m.uniforms.t.value = t; m.uniforms.k.value = k; p.visible = k > 0.01; };
  return p;
}

// a glowing energy orb with a trail; .place(pos, trail[] of older positions, k) ; .light
export function energyOrb(o = {}) {
  const g = new THREE.Group(), color = new THREE.Color(o.color || '#b37bff');
  const core = new THREE.Mesh(new THREE.SphereGeometry(o.r ?? 0.42, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(o.core || '#f4ecff'), fog: false, toneMapped: false }));
  const shell = new THREE.Mesh(new THREE.SphereGeometry((o.r ?? 0.42) * 1.6, 20, 14), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
  const halo = glow(color, (o.r ?? 0.42) * 6, 0.5); g.add(core, shell, halo); noAO(g);
  const trail = []; for (let i = 0; i < 10; i++) { const s = glow(color, (o.r ?? 0.42) * (3.4 - i * 0.26), 0.36 * (1 - i / 10)); s.userData.noAO = true; trail.push(s); }
  const light = new THREE.PointLight(color, 0, 12, 1.6); g.add(light); g.light = light;
  g.trail = trail;
  g.place = (pos, older, k = 1, t = 0) => {
    g.visible = k > 0.01; g.position.copy(pos); const pulse = 1 + 0.1 * Math.sin(t * 40); shell.scale.setScalar(pulse * k); core.scale.setScalar(k); halo.material.opacity = 0.5 * k;
    trail.forEach((s, i) => { const p = older[i]; s.visible = g.visible && !!p; if (p) { s.position.copy(p); s.material.opacity = 0.36 * (1 - i / 10) * k; } });
    light.intensity = (o.light ?? 26) * k;
  };
  g.addTrailTo = (parent) => trail.forEach((s) => parent.add(s));
  return g;
}

// a rune shield in front of an open palm: rings, a hex lattice, glyphs; .set(open 0..1, t, hit 0..1)
export function runeShield(o = {}) {
  const tex = canvasTex(1024, 1024, (x, w, h) => {
    const cx = w / 2, cy = h / 2; x.clearRect(0, 0, w, h); x.strokeStyle = '#fff'; x.fillStyle = '#fff';
    x.lineWidth = 10; x.beginPath(); x.arc(cx, cy, w * 0.47, 0, 7); x.stroke(); x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, w * 0.41, 0, 7); x.stroke();
    x.save(); x.beginPath(); x.arc(cx, cy, w * 0.4, 0, 7); x.clip(); x.globalAlpha = 0.45; x.lineWidth = 2.5;
    const s = 46; for (let j = -12; j < 12; j++) for (let i = -12; i < 12; i++) { const hx = cx + i * s * 1.5, hy = cy + j * s * 1.732 + (i % 2) * s * 0.866; x.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI * 2; const px = hx + Math.cos(a) * s * 0.92, py = hy + Math.sin(a) * s * 0.92; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
    x.restore(); x.globalAlpha = 1; x.font = '700 40px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; const gl = 'ᛟᛞᛜᛚᛗᛖᛒᛏᛊᛉᛈᛇᛃᛁᚾᚺ';
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; x.save(); x.translate(cx + Math.cos(a) * w * 0.44, cy + Math.sin(a) * w * 0.44); x.rotate(a + Math.PI / 2); x.fillText(gl[k % gl.length], 0, 0); x.restore(); }
    x.lineWidth = 6; x.beginPath(); x.arc(cx, cy, w * 0.09, 0, 7); x.stroke();
  });
  const m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(o.color || '#cfe9ff'), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(o.size ?? 1.6, 64), m); disc.userData.noAO = true;
  const g = new THREE.Group(); g.add(disc); const hal = glow(new THREE.Color(o.color || '#cfe9ff'), (o.size ?? 1.6) * 3.2, 0); g.add(hal);
  const L = new THREE.PointLight(o.color || '#cfe9ff', 0, 10, 1.6); L.position.z = 0.6; g.add(L);
  g.set = (open, t, hit = 0) => {
    g.visible = open > 0.01; disc.scale.setScalar(Math.max(0.01, open) * (1 + hit * 0.18)); disc.rotation.z = t * 0.8;
    m.opacity = clamp(open * (0.55 + hit * 0.45)); hal.material.opacity = 0.12 * open + hit * 0.35; L.intensity = 10 * open + hit * 40;
  };
  g.set(0, 0); return g;
}

// a burst of shards / sparks from a point; .fire(t0) then .update(t) (deterministic); dir biases the spray
export function shardBurst(scene, o = {}) {
  const n = o.count ?? 80, r = rng(o.seed ?? 5), pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), sd = new Float32Array(n), d = o.dir || v3(0, 0, 0);
  for (let i = 0; i < n; i++) { const a = r() * 6.28, b = Math.acos(2 * r() - 1), s = (o.speed ?? 6) * (0.4 + r() * 0.8); vel[i * 3] = Math.sin(b) * Math.cos(a) * s + d.x; vel[i * 3 + 1] = Math.cos(b) * s * 0.8 + d.y + (o.up ?? 1.5); vel[i * 3 + 2] = Math.sin(b) * Math.sin(a) * s + d.z; sd[i] = r(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('vel', new THREE.BufferAttribute(vel, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { life: { value: -1 }, dur: { value: o.dur ?? 0.8 }, g: { value: o.gravity ?? 9 }, color: { value: new THREE.Color(o.color || '#e0c8ff').multiplyScalar(o.bright ?? 1.2) }, px: { value: o.size ?? 0.16 } },
    vertexShader: `attribute vec3 vel; attribute float seed; uniform float life, dur, g, px; varying float a;
      void main(){ float k = life / dur; vec3 p = vel * life * (1.0 - 0.35 * k); p.y -= 0.5 * g * life * life;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        a = step(0.0, life) * (1.0 - smoothstep(0.3 + seed * 0.5, 1.0, k)); gl_PointSize = px * 900.0 / max(1.0, -mv.z) * (0.5 + seed); }`,
    fragmentShader: `uniform vec3 color; varying float a; void main(){ vec2 q = abs(gl_PointCoord - 0.5); if (a < 0.01) discard; gl_FragColor = vec4(color, a * smoothstep(0.5, 0.2, max(q.x, q.y))); }` });
  const p = new THREE.Points(geo, m); p.frustumCulled = false; p.userData.noAO = true; (o.parent || scene).add(p);
  let t0 = 1e9; p.fire = (t) => { t0 = t; return p; };
  p.update = (t) => { m.uniforms.life.value = t - t0; p.visible = t >= t0 && t < t0 + m.uniforms.dur.value; };
  return p;
}

// an expanding ring on the ground and a thin dome (a shockwave); .set(age, maxR) ; violet by default
export function shockwave(o = {}) {
  const g = new THREE.Group(), color = new THREE.Color(o.color || '#a35cff');
  const ringM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uA: { value: 0 }, uC: { value: color } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uA; uniform vec3 uC; void main(){ float r = length(vUv - 0.5) * 2.0; float band = smoothstep(0.78, 0.97, r) * smoothstep(1.0, 0.97, r);
      float inner = smoothstep(0.0, 0.95, r) * 0.18; vec3 c = mix(uC, vec3(1.0, 0.92, 1.0), band * 0.6); gl_FragColor = vec4(c, (band + inner) * uA); }` });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; g.add(ring);
  const domeM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uA: { value: 0 }, uC: { value: color } },
    vertexShader: `varying vec3 n, v; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); n = normalize(normalMatrix * normal); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 n, v; uniform float uA; uniform vec3 uC; void main(){ float e = 1.0 - abs(dot(normalize(n), normalize(v))); gl_FragColor = vec4(uC, pow(e, 2.5) * uA); }` });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeM); g.add(dome);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color('#f0e0ff'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
  torus.rotation.x = Math.PI / 2; torus.position.y = 0.6; g.add(torus); noAO(g);
  g.set = (age, maxR = 60, dur = 1.4) => {
    const k = clamp(age / dur); g.visible = age > 0 && age < dur;
    const rad = 0.5 + (maxR - 0.5) * (1 - Math.pow(1 - k, 2.4)), fade = (1 - k) * (1 - k);
    ring.scale.setScalar(rad); ringM.uniforms.uA.value = 0.95 * fade; dome.scale.set(rad * 0.98, rad * 0.38, rad * 0.98); domeM.uniforms.uA.value = 0.75 * fade;
    torus.scale.set(rad, rad, rad * 6); torus.material.opacity = 0.8 * fade;
  };
  g.set(0); return g;
}

// a summoning sigil on the ground (a violet circle of runes); .set(k, t)
export function sigil(o = {}) {
  const tex = canvasTex(1024, 1024, (x, w, h) => {
    const cx = w / 2, cy = h / 2; x.clearRect(0, 0, w, h); x.strokeStyle = '#fff'; x.fillStyle = '#fff';
    x.lineWidth = 9; x.beginPath(); x.arc(cx, cy, w * 0.47, 0, 7); x.stroke(); x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, w * 0.4, 0, 7); x.stroke();
    x.lineWidth = 4; x.beginPath(); for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + k * 4 * Math.PI / 5; const px = cx + Math.cos(a) * w * 0.4, py = cy + Math.sin(a) * w * 0.4; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    x.font = '700 44px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; const gl = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒ';
    for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2; x.save(); x.translate(cx + Math.cos(a) * w * 0.435, cy + Math.sin(a) * w * 0.435); x.rotate(a + Math.PI / 2); x.fillText(gl[k % gl.length], 0, 0); x.restore(); }
  });
  const m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(o.color || '#b57dff'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(o.size ?? 5, o.size ?? 5), m); p.rotation.x = -Math.PI / 2; p.position.y = 0.06; p.userData.noAO = true;
  p.set = (k, t) => { p.visible = k > 0.01; m.opacity = clamp(k) * 0.9; p.rotation.z = t * 0.5; };
  p.set(0, 0); return p;
}

// a soft pillar of light (a summoning beam); .set(k)
export function beam(o = {}) {
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uA: { value: 0 }, uC: { value: new THREE.Color(o.color || '#b88cff') } },
    vertexShader: `varying vec3 n, v; varying float h; void main(){ h = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); n = normalize(normalMatrix * normal); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 n, v; varying float h; uniform float uA; uniform vec3 uC; void main(){ float e = pow(abs(dot(normalize(n), normalize(v))), 1.8); gl_FragColor = vec4(uC, e * uA * smoothstep(1.0, 0.2, h)); }` });
  const g = new THREE.Mesh(new THREE.CylinderGeometry(o.r ?? 1.6, o.r ?? 1.6, o.h ?? 40, 32, 1, true), m); g.geometry.translate(0, (o.h ?? 40) / 2, 0); g.userData.noAO = true;
  g.set = (k) => { g.visible = k > 0.01; m.uniforms.uA.value = 0.55 * clamp(k); }; g.set(0); return g;
}

// a scorch mark (a lightning strike, a skid): .set(opacity) ; kind 'scorch' | 'skid' | 'crack'
export function decal(kind, o = {}) {
  const tex = canvasTex(512, 512, (x, w, h) => {
    const r = rng(o.seed ?? 3); x.clearRect(0, 0, w, h);
    if (kind === 'scorch') { const g = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(10,6,8,0.95)'); g.addColorStop(0.5, 'rgba(18,12,14,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(8,6,8,0.9)'; x.lineWidth = 4; for (let i = 0; i < 14; i++) { const a = r() * 6.28; let px = w / 2, py = h / 2; x.beginPath(); x.moveTo(px, py); for (let q = 0; q < 7; q++) { px += Math.cos(a + (r() - 0.5)) * 22; py += Math.sin(a + (r() - 0.5)) * 22; x.lineTo(px, py); } x.stroke(); } }
    else if (kind === 'skid') { for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(14,10,18,${0.25 + r() * 0.4})`; x.fillRect(w * 0.3 + r() * w * 0.4, 0, 3 + r() * 8, h); } }
    else { x.strokeStyle = 'rgba(8,6,10,0.95)'; x.lineWidth = 5; for (let i = 0; i < 22; i++) { const a = i / 22 * 6.28 + r() * 0.2; let px = w / 2, py = h / 2; x.beginPath(); x.moveTo(px, py); for (let q = 0; q < 9; q++) { px += Math.cos(a + (r() - 0.5) * 0.9) * 26; py += Math.sin(a + (r() - 0.5) * 0.9) * 26; x.lineTo(px, py); } x.stroke(); } }
  });
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); p.rotation.x = -Math.PI / 2; p.position.y = 0.05; p.userData.noAO = true;
  p.set = (k) => { p.visible = k > 0.01; m.opacity = clamp(k); }; p.set(0); return p;
}

// a jagged arc of lightning from a to b (rebuilt per call; seed changes it); .set(a, b, k, seed)
export function arcBolt(o = {}) {
  const g = new THREE.Group(), core = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.core || '#f6f0ff'), transparent: true, fog: false, toneMapped: false });
  const halo = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color || '#9a8cff'), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
  const mc = new THREE.Mesh(new THREE.BufferGeometry(), core), mh = new THREE.Mesh(new THREE.BufferGeometry(), halo); g.add(mc, mh); noAO(g);
  let last = '';
  g.set = (a, b, k, seed = 1) => {
    g.visible = k > 0.02; if (!g.visible) return;
    const key = `${a.x.toFixed(2)},${a.y.toFixed(2)},${a.z.toFixed(2)},${b.x.toFixed(2)},${b.y.toFixed(2)},${b.z.toFixed(2)},${seed}`;
    if (key !== last) {
      last = key; const r = rng(seed * 97 + 3), N = 14, pts = [], d = b.clone().sub(a), L = d.length();
      for (let i = 0; i <= N; i++) { const u = i / N, p = a.clone().addScaledVector(d, u); if (i && i < N) p.add(v3((r() - 0.5), (r() - 0.5), (r() - 0.5)).multiplyScalar(L * 0.09 * Math.sin(u * Math.PI))); pts.push(p); }
      const path = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
      mc.geometry.dispose(); mh.geometry.dispose();
      const geos = [new THREE.TubeGeometry(path, 40, o.r ?? 0.06, 5, false)];
      for (let q = 0; q < 3; q++) { const s = 2 + Math.floor(r() * (N - 4)), bp = [pts[s].clone()]; let c = pts[s].clone(); for (let i = 0; i < 4; i++) { c = c.clone().add(v3((r() - 0.5), (r() - 0.5), (r() - 0.5)).multiplyScalar(L * 0.12)); bp.push(c); } geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp), 10, (o.r ?? 0.06) * 0.6, 4, false)); }
      mc.geometry = mergeGeometries(geos.map((x) => x.toNonIndexed()));
      mh.geometry = new THREE.TubeGeometry(path, 40, (o.r ?? 0.06) * 4, 6, false);
    }
    core.opacity = clamp(k * 1.3); halo.opacity = 0.3 * k;
  };
  return g;
}

// a stream of fire particles from a to b (a flamethrower spell); .set(a, b, k, t)
export function fireStream(o = {}) {
  const n = o.count ?? 420, r = rng(o.seed ?? 31), sd = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { sd[i * 4] = r(); sd[i * 4 + 1] = r() * 6.28; sd[i * 4 + 2] = r(); sd[i * 4 + 3] = r(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('sd', new THREE.BufferAttribute(sd, 4));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uT: { value: 0 }, uK: { value: 0 }, px: { value: o.size ?? 0.55 } },
    vertexShader: `attribute vec4 sd; uniform vec3 uA, uB; uniform float uT, uK, px; varying float a; varying float f;
      void main(){ float ph = fract(uT * (1.6 + sd.x) + sd.z); vec3 d = uB - uA; vec3 p = uA + d * ph;
        vec3 s1 = normalize(cross(d, vec3(0.0, 1.0, 0.0)) + 1e-4), s2 = normalize(cross(d, s1));
        float sp = 0.15 + ph * 1.1; p += (s1 * cos(sd.y) + s2 * sin(sd.y)) * sp * sd.w;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; f = ph;
        a = uK * sin(ph * 3.14159) * step(ph, uK * 1.05);
        gl_PointSize = px * (0.6 + ph * 1.6) * 900.0 / max(1.0, -mv.z); }`,
    fragmentShader: `varying float a; varying float f; void main(){ float d = length(gl_PointCoord - 0.5); if (a < 0.01) discard;
      vec3 c = mix(vec3(1.0, 0.85, 0.45), vec3(0.95, 0.3, 0.05), smoothstep(0.1, 0.7, f)); gl_FragColor = vec4(c, a * smoothstep(0.5, 0.0, d) * 0.5); }` });
  const p = new THREE.Points(geo, m); p.frustumCulled = false; p.userData.noAO = true;
  const L = new THREE.PointLight('#ff8a3a', 0, 18, 1.5); p.add(L);
  p.set = (a, b, k, t) => { p.visible = k > 0.01; m.uniforms.uA.value.copy(a); m.uniforms.uB.value.copy(b); m.uniforms.uT.value = t; m.uniforms.uK.value = k; L.position.copy(a).lerp(b, 0.5); L.intensity = 50 * k; };
  return p;
}

// particles that leave a surface: base world positions (sampled at the moment it begins), drift up and away, glow and fade
// .set(age) ; the cloak's dissolve
export function driftParticles(positions, o = {}) {
  const n = positions.length / 3, r = rng(o.seed ?? 17), sd = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { sd[i * 4] = r(); sd[i * 4 + 1] = r() * 6.28; sd[i * 4 + 2] = r(); sd[i * 4 + 3] = r(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3)); geo.setAttribute('sd', new THREE.BufferAttribute(sd, 4));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uAge: { value: -1 }, uDur: { value: o.dur ?? 2.6 }, px: { value: o.size ?? 0.13 }, uC1: { value: new THREE.Color(o.c1 || '#fff6e0') }, uC2: { value: new THREE.Color(o.c2 || '#b98cff') }, uWind: { value: o.wind || new THREE.Vector3(0, 0, 0) } },
    vertexShader: `attribute vec4 sd; uniform float uAge, uDur, px; uniform vec3 uWind; varying float a; varying float f;
      void main(){ float t0 = sd.x * 0.9 * uDur * 0.5, life = uAge - t0; float k = clamp(life / (uDur * 0.75), 0.0, 1.0);
        vec3 p = position; float l = max(0.0, life);
        p += vec3(cos(sd.y), 0.0, sin(sd.y)) * l * (0.5 + sd.w * 1.4) + vec3(0.0, l * (1.2 + sd.z * 2.4), 0.0) + uWind * l * l;
        p.x += sin(l * 3.0 + sd.y * 5.0) * 0.25 * l; p.z += cos(l * 2.6 + sd.y * 3.0) * 0.25 * l;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; f = k;
        a = step(0.0, life) * (1.0 - smoothstep(0.55, 1.0, k)) * smoothstep(0.0, 0.08, life);
        gl_PointSize = px * (0.6 + sd.w) * 900.0 / max(1.0, -mv.z); }`,
    fragmentShader: `uniform vec3 uC1, uC2; varying float a; varying float f; void main(){ vec2 q = abs(gl_PointCoord - 0.5); if (a < 0.01) discard;
      float s = smoothstep(0.5, 0.0, q.x + q.y) + 0.6 * smoothstep(0.08, 0.0, min(q.x, q.y)) * smoothstep(0.5, 0.1, max(q.x, q.y));
      gl_FragColor = vec4(mix(uC1, uC2, f) * 1.1, a * s); }` });
  const p = new THREE.Points(geo, m); p.frustumCulled = false; p.userData.noAO = true;
  p.set = (age) => { m.uniforms.uAge.value = age; p.visible = age > 0 && age < (o.dur ?? 2.6) * 1.4; };
  p.set(-1); return p;
}

// a material that dissolves in noise with a glowing edge: dissolve(mat, uniforms) ; uniforms.uDis.value 0..1
export function dissolveUniforms(color = '#ffe9b8') { return { uDis: { value: 0 }, uDC: { value: new THREE.Color(color) } }; }
export function dissolve(mat, u, key = 'dissolve') {
  const m = mat.clone();
  m.onBeforeCompile = (s) => {
    s.uniforms.uDis = u.uDis; s.uniforms.uDC = u.uDC;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vDW;').replace('#include <project_vertex>', '#include <project_vertex>\n vDW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vDW; uniform float uDis; uniform vec3 uDC; ${GLSL_NOISE}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float dE = fbm2(vDW.xz * 1.7 + vDW.y * 1.3) * 0.7 + fbm2(vDW.xy * 3.1) * 0.3 + (vDW.y - 3.0) * 0.06 - uDis * 1.35 + 0.18;
      if (uDis > 0.001 && dE < 0.0) discard;
      totalEmissiveRadiance += uDC * smoothstep(0.12, 0.0, dE) * 2.2 * step(0.001, uDis);`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}

// ---------------- the shadow spectators ----------------
// instanced seated silhouettes (dark, a cold violet rim) with two pale eyes each; .set({ fill(i) 0..1, yaw(i), eyes(i) 0..1 }, t)
export function shadowCrowd(seats, o = {}) {
  const b = (w, h, d, x, y, z, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.rotateX(rx); g.translate(x, y, z); return g.toNonIndexed(); };
  // seated: hips at y 0 on the seat, the knees forward (+z), shins down; the head at y ~2.7
  const parts = [b(1.9, 1.9, 1.0, 0, 1.0, 0), b(1.25, 1.2, 1.2, 0, 2.6, 0), b(0.9, 1.7, 0.9, -1.45, 1.05, 0.15, -0.3), b(0.9, 1.7, 0.9, 1.45, 1.05, 0.15, -0.3),
    b(0.92, 0.9, 1.9, -0.5, -0.05, 0.8), b(0.92, 0.9, 1.9, 0.5, -0.05, 0.8), b(0.92, 1.7, 0.9, -0.5, -0.9, 1.6), b(0.92, 1.7, 0.9, 0.5, -0.9, 1.6)];
  const geo = mergeGeometries(parts); geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: '#0d0b14', roughness: 1, metalness: 0 });
  const U = { uRim: { value: new THREE.Color(o.rim || '#6a4bc9') }, uRimK: { value: 0.9 } };
  mat.onBeforeCompile = (s) => {
    s.uniforms.uRim = U.uRim; s.uniforms.uRimK = U.uRimK;
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimE = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
        totalEmissiveRadiance += uRim * rimE * uRimK;`);
  };
  mat.customProgramCacheKey = () => 'shadowcrowd';
  const n = seats.length, im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = false; im.receiveShadow = false; im.frustumCulled = false;
  const eg = new THREE.PlaneGeometry(0.22, 0.13); const eyes = new THREE.InstancedMesh(mergeGeometries([eg.clone().translate(-0.28, 2.75, 0.62), eg.clone().translate(0.28, 2.75, 0.62)]),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(o.eyes || '#efe6ff'), fog: false, toneMapped: false }), n);
  eyes.frustumCulled = false; eyes.userData.noAO = true;
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), S = v3(1, 1, 1), P = v3(0, 0, 0);
  const g = new THREE.Group(); g.add(im, eyes); g.mat = mat; g.U = U;
  g.set = (f, t) => {
    let any = false;
    for (let i = 0; i < n; i++) {
      const s = seats[i], k = f.fill(i), ey = f.eyes(i);
      const sc = k < 0.01 ? 0.0001 : (0.94 + 0.08 * ((i * 7919) % 13) / 13) * (0.6 + 0.4 * k);
      if (k > 0.01) any = true;
      P.set(s.x, s.y + 0.5 - (1 - k) * 1.6, s.z); q.setFromEuler(e.set(0, f.yaw(i), 0)); S.set(sc, sc, sc); M.compose(P, q, S);
      im.setMatrixAt(i, M);
      S.setScalar(ey > 0.01 && k > 0.5 ? sc : 0.0001); M.compose(P, q, S); eyes.setMatrixAt(i, M);
    }
    im.instanceMatrix.needsUpdate = true; eyes.instanceMatrix.needsUpdate = true; g.visible = any;
  };
  return g;
}

// a teleport smear: a thin vertical streak of light and a ring; .set(age)
export function teleportFx(o = {}) {
  const g = new THREE.Group();
  const s = glow(new THREE.Color(o.color || '#e8ddff'), 1, 0); s.scale.set(1.2, 9, 1); s.position.y = 3; g.add(s);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color || '#e8ddff'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1; g.add(ring); noAO(g);
  const L = new THREE.PointLight(o.color || '#e8ddff', 0, 12, 1.6); L.position.y = 3; g.add(L);
  g.set = (age) => { const k = age > 0 && age < 0.5 ? Math.exp(-age * 8) : 0; g.visible = k > 0.01; s.material.opacity = 0.9 * k; s.scale.set(1.2 * (1 + age * 2), 9 * (1 - age * 0.8), 1); ring.scale.setScalar(1 + age * 9); ring.material.opacity = 0.8 * k; L.intensity = 50 * k; };
  g.set(-1); return g;
}

// ---------------- the white cloak ----------------
// a hooded white cloak fitted to a character's rig: a mantle on the torso, a skirt split at the front in two halves that follow
// the legs (a kick comes out through the slit), wide sleeves on the arms, a deep hood whose opening is dark (the face stays
// hidden). The wearer's torso and head are hidden while it's on. cloak.update() each frame after the pose (the skirt halves follow
// the legs); cloak.dissolveU.uDis.value 0..1 dissolves it; cloak.surfacePoints(n) samples world points (call after a pose).
const _bx = new THREE.Box3();
function localBox(g) {
  _bx.makeEmpty(); g.updateMatrixWorld(true);
  for (const o of g.children) if (o.isMesh && o.geometry && !o.userData.cloak) { o.geometry.computeBoundingBox(); _bx.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrix)); }
  return _bx.clone();
}
function partsBox(list) { const b = new THREE.Box3(); list.forEach((m) => { m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrix)); }); return b; }
export function cloak(ch, o = {}) {
  const tex = canvasTex(512, 512, (x, w, h) => {
    const r = rng(o.seed ?? 6); x.fillStyle = o.cloth || '#efecf4'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { const px = r() * w, ww = 6 + r() * 22; const g = x.createLinearGradient(px - ww, 0, px + ww, 0); g.addColorStop(0, 'rgba(70,60,100,0)'); g.addColorStop(0.5, `rgba(70,60,100,${0.06 + r() * 0.1})`); g.addColorStop(1, 'rgba(70,60,100,0)'); x.fillStyle = g; x.fillRect(px - ww, 0, ww * 2, h); }
    x.fillStyle = o.trim || '#cdb98a'; x.fillRect(0, h * 0.94, w, h * 0.035); x.fillRect(0, h * 0.905, w, h * 0.012);
  });
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
  const U = dissolveUniforms(o.edge || '#ffe7b0'); const base = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, side: THREE.DoubleSide });
  const M = dissolve(base, U, 'cloak');
  const darkM = dissolve(new THREE.MeshStandardMaterial({ color: '#07060a', roughness: 1 }), U, 'cloakdark');
  const meshes = [];
  const put = (geo, parent, mat = M) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.userData.cloak = true; parent.add(m); meshes.push(m); return m; };
  const tb = localBox(ch.torso), hb = ch.headParts ? partsBox(ch.headParts) : localBox(ch.head), ab = localBox(ch.arms[0]), lb = localBox(ch.legs[0]);
  const W = (tb.max.x - tb.min.x) / 2, D = (tb.max.z - tb.min.z) / 2, cz = (tb.min.z + tb.max.z) / 2, top = tb.max.y, waist = tb.min.y + (tb.max.y - tb.min.y) * 0.35;
  const ell = (g, sz) => { g.scale(1, 1, sz); return g; };
  const zs = Math.max(0.6, D / W) * 1.05;
  // mantle (torso): from the neck out over the shoulders, down to the waist
  const mant = [[W * 0.45, top + 0.12], [W * 0.95, top - 0.05], [W * 1.22, top - 0.45], [W * 1.18, waist]].map(([x, y]) => new THREE.Vector2(x, y));
  const mg = ell(new THREE.LatheGeometry(mant, 40), zs * 1.15); mg.translate(0, 0, cz); put(mg, ch.torso);
  // skirt: two halves on the hips, from the waist to the ankles, flaring
  const legLen = lb.max.y - lb.min.y, hem = ch.legs[0].position.y + lb.min.y + 0.25;
  const sk = [[W * 1.18, waist], [W * 1.3, waist - legLen * 0.35], [W * 1.48, waist - legLen * 0.75], [W * 1.62, hem]].map(([x, y]) => new THREE.Vector2(x, y));
  const halves = [0, 1].map((side) => {
    const piv = new THREE.Group(); ch.hips.add(piv);
    const gap = o.slit ?? 0.32, g = ell(new THREE.LatheGeometry(sk, 24, side === 0 ? Math.PI : gap, Math.PI - gap), zs * 1.15); g.translate(0, 0, cz); put(g, piv); return piv;
  });
  // sleeves: wide cones on each arm (the arm hangs along -y from its pivot)
  for (const side of [0, 1]) {
    const b2 = localBox(ch.arms[side]), aw = Math.max(b2.max.x - b2.min.x, b2.max.z - b2.min.z) / 2, cx = (b2.min.x + b2.max.x) / 2, czz = (b2.min.z + b2.max.z) / 2;
    const y0 = b2.max.y + 0.1, y1 = b2.min.y + (b2.max.y - b2.min.y) * 0.22;
    const g = new THREE.LatheGeometry([[aw * 1.12, y0], [aw * 1.18, lerp(y0, y1, 0.5)], [aw * 1.42, y1]].map(([x, y]) => new THREE.Vector2(x, y)), 24); g.translate(cx, 0, czz); put(g, ch.arms[side]);
  }
  // the hood: a deep shell round the head, open at the front, and the dark inside
  const HW = (hb.max.x - hb.min.x) / 2, HH = hb.max.y - hb.min.y, hcz = (hb.min.z + hb.max.z) / 2, hy0 = hb.min.y - 0.1;
  const hp = [[0.01, hy0 + HH * 1.32], [HW * 0.75, hy0 + HH * 1.25], [HW * 1.28, hy0 + HH * 0.85], [HW * 1.35, hy0 + HH * 0.35], [HW * 1.3, hy0 - 0.15]].map(([x, y]) => new THREE.Vector2(x, y));
  const hg = new THREE.LatheGeometry(hp, 36, 0.62, Math.PI * 2 - 1.24); hg.scale(1, 1, 1.08); hg.translate(0, 0, hcz - 0.05); put(hg, ch.head);
  const peak = new THREE.ConeGeometry(HW * 0.5, HH * 0.5, 12); peak.rotateX(-0.9); peak.translate(0, hy0 + HH * 1.3, hcz - HW * 0.55); put(peak, ch.head);
  const inner = new THREE.CircleGeometry(1, 32); inner.scale(HW * 1.12, HH * 0.62, 1); inner.translate(0, hy0 + HH * 0.55, hcz + HW * 0.72); put(inner, ch.head, darkM);
  const innerB = new THREE.SphereGeometry(1, 20, 14); innerB.scale(HW * 1.15, HH * 0.75, HW * 0.9); innerB.translate(0, hy0 + HH * 0.6, hcz + HW * 0.15); put(innerB, ch.head, darkM);
  // what it hides
  const hidden = [];
  for (const g of [ch.torso, ch.head]) for (const m of g.children) if (m.isMesh && !m.userData.cloak) hidden.push(m);
  if (ch.faceSheet) hidden.push(ch.faceSheet);
  const api = {
    meshes, dissolveU: U, halves, hidden,
    wear(on) { hidden.forEach((m) => { m.visible = !on; }); meshes.forEach((m) => { m.visible = on; }); },
    update(follow = 0.55) { halves.forEach((h, i) => { h.quaternion.identity().slerp(ch.legs[i].quaternion, follow); h.position.copy(ch.legs[i].position).setY(0).multiplyScalar(0.6); }); },
    surfacePoints(n, seed = 3) {   // world points spread over the cloak's surface (by vertex, weighted evenly)
      const r = rng(seed), out = [], vs = [];
      ch.root.updateMatrixWorld(true);
      for (const m of meshes) { if (m.material === darkM) continue; const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) vs.push([m, i]); }
      const v = new THREE.Vector3();
      for (let k = 0; k < n; k++) { const [m, i] = vs[Math.floor(r() * vs.length)], p = m.geometry.attributes.position; v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); v.x += (r() - 0.5) * 0.2; v.y += (r() - 0.5) * 0.2; v.z += (r() - 0.5) * 0.2; out.push(v.x, v.y, v.z); }
      return out;
    },
  };
  api.wear(true);
  return api;
}
