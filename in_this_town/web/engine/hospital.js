// Episode 27's hospital kit: pale-green paint, polished vinyl floor, acoustic ceiling, fluorescent panels, ward doors with
// number plates, hospital beds (empty or occupied), a CRT on a ceiling arm, a PA speaker, bed charts, the cracked porcelain
// mask and the nurse who wears it, an instanced ward that runs into the dark, and the derelict building outside.
// Every piece is a pure function of its inputs; anything that changes takes t.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { v3, rng, clamp } from './core.js';
import { Batch, surf, paint } from './kit.js';
import { canvasTex } from './props.js';
import { makeCharacter } from './character.js';

const rep = (t, n = 8) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = n; t.colorSpace = THREE.SRGBColorSpace; return t; };
const worldMat = (map, span, o = {}) => { const m = new THREE.MeshStandardMaterial({ map, ...o }); m.userData.span = span; return m; };

// fresh institutional paint: almost flat, the faintest roller texture
export function wallPaint(col = '#b9d8c3', o = {}) {
  const t = rep(canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = col; x.fillRect(0, 0, w, h); const r = rng(o.seed ?? 3);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.012 + r() * 0.02})`; x.fillRect(r() * w, r() * h, 2 + r() * 30, 1 + r() * 3); }
  }));
  return worldMat(t, o.span ?? 10, { roughness: o.rough ?? 0.55 });
}
// polished sheet vinyl: speckled terrazzo-like flecks in big squares, glossy
export function vinyl(base = '#d9e2d6', o = {}) {
  const t = rep(canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h); const r = rng(o.seed ?? 7);
    for (let i = 0; i < 26000; i++) { const c = ['rgba(120,140,128,', 'rgba(255,255,255,', 'rgba(90,110,100,', 'rgba(170,190,160,'][i % 4]; x.fillStyle = c + (0.06 + r() * 0.12) + ')'; x.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); }
    x.strokeStyle = 'rgba(110,128,116,0.35)'; x.lineWidth = 3; for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * 512, 0); x.lineTo(i * 512, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 512); x.lineTo(w, i * 512); x.stroke(); }
    if (o.accent) { x.fillStyle = o.accent; x.fillRect(0, 470, w, 84); }
  }));
  return worldMat(t, o.span ?? 12, { roughness: o.rough ?? 0.16, metalness: 0.0 });
}
// acoustic ceiling tiles in a white grid
export function ceilingTile(col = '#e6ece4') {
  const t = rep(canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = col; x.fillRect(0, 0, w, h); const r = rng(11);
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(80,90,80,${0.05 + r() * 0.12})`; x.fillRect(r() * w, r() * h, 1.5, 1.5); }
    x.fillStyle = '#f4f6f2'; x.fillRect(0, 0, w, 10); x.fillRect(0, 0, 10, h); x.fillRect(0, 251, w, 10); x.fillRect(251, 0, 10, h);
  }));
  return worldMat(t, 8, { roughness: 0.92 });
}

// a recessed fluorescent troffer: frame, louvre, two tubes. .level(k) sets brightness (0 off), .tint
export function fluorPanel(w = 3.6, d = 7.2, o = {}) {
  const g = new THREE.Group(), b = new Batch(), frame = paint('#f1f3ee', { roughness: 0.5 }), louvre = paint('#dfe4dc', { metalness: 0.4, roughness: 0.35 });
  b.box(frame, w + 0.5, 0.18, d + 0.5, 0, 0.12, 0, { r: 0.04 });
  for (let i = 1; i < 6; i++) b.box(louvre, w, 0.22, 0.06, 0, -0.02, -d / 2 + (d * i) / 6, { r: 0.01 });
  b.done(g);
  const m = new THREE.MeshBasicMaterial({ color: '#ffffff' }); m.toneMapped = true;
  const tubeG = new THREE.BoxGeometry(w * 0.86, 0.05, d * 0.92);
  const tube = new THREE.Mesh(tubeG, m); tube.position.y = 0.0; tube.userData.noAO = true; g.add(tube);
  g.tint = new THREE.Color(o.tint ?? '#eefbe8'); g.mat = m;
  g.level = (k) => { m.color.copy(g.tint).multiplyScalar(k * (o.gain ?? 1.5)); };
  g.level(1); return g;
}

// a ward door in a frame, with a narrow wired-glass window and a kick plate; hinge at the origin, leaf along +x, face +z
export function wardDoor(o = {}) {
  const w = o.w ?? 4.6, h = o.h ?? 8.4, d = 0.32, g = new THREE.Group(), b = new Batch();
  const leaf = paint(o.color ?? '#9fc5b0', { roughness: 0.45 }), steel = paint('#c9cfcc', { metalness: 0.85, roughness: 0.28 }), glass = new THREE.MeshStandardMaterial({ color: '#1c2a26', roughness: 0.08, metalness: 0.2 });
  b.box(leaf, w, h, d, w / 2, h / 2, 0, { r: 0.04 });
  b.box(steel, w - 0.3, 1.0, 0.04, w / 2, 0.6, d / 2 + 0.02, { r: 0.01 }); b.box(steel, w - 0.3, 1.0, 0.04, w / 2, 0.6, -d / 2 - 0.02, { r: 0.01 });
  for (const s of [1, -1]) { b.box(steel, 0.3, 0.9, 0.05, w - 0.45, h * 0.47, s * (d / 2 + 0.03), { r: 0.02 }); b.box(steel, 0.9, 0.16, 0.16, w - 0.75, h * 0.47, s * (d / 2 + 0.2), { r: 0.06 }); b.cyl(steel, 0.07, 0.07, 0.2, w - 0.3, h * 0.47, s * (d / 2 + 0.1), { rx: Math.PI / 2 }); }
  b.done(g);
  if (!o.noWindow) { const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.4), glass); win.position.set(w * 0.3, h * 0.66, d / 2 + 0.01); g.add(win); const w2 = win.clone(); w2.position.z = -d / 2 - 0.01; w2.rotation.y = Math.PI; g.add(w2); }
  g.handle = v3(w - 1.1, h * 0.47, d / 2 + 0.28);
  return g;
}

// a number plate: white enamel, dark-green numerals
export function roomPlate(text, o = {}) {
  const w = o.w ?? 1.6, h = o.h ?? 0.7;
  const map = canvasTex(512, Math.round((512 * h) / w), (x, W, H) => {
    x.fillStyle = '#f3f4ee'; x.fillRect(0, 0, W, H); x.strokeStyle = '#2f5a48'; x.lineWidth = 10; x.strokeRect(8, 8, W - 16, H - 16);
    x.fillStyle = '#1f4a3a'; x.font = `900 ${Math.round(H * 0.66)}px ITTInter, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + H * 0.04);
  });
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.3 })); m.userData.noAO = true; return m;
}

// a bed chart on a clipboard: the patient's name large enough to read
export function bedChart(name, o = {}) {
  const map = canvasTex(256, 340, (x, w, h) => {
    x.fillStyle = '#6b4a2a'; x.fillRect(0, 0, w, h); x.fillStyle = '#f6f4ec'; x.fillRect(14, 30, w - 28, h - 44); x.fillStyle = '#9aa0a4'; x.fillRect(80, 6, 96, 40);
    x.fillStyle = '#1d2a33'; x.textAlign = 'center'; x.font = '900 62px ITTInter, sans-serif'; x.fillText(name, w / 2, 110);
    x.fillStyle = '#7d8a92'; for (let i = 0; i < 7; i++) x.fillRect(34, 150 + i * 24, (w - 68) * (0.5 + ((i * 37) % 50) / 100), 7);
    x.strokeStyle = '#c0392b'; x.lineWidth = 4; x.beginPath(); x.moveTo(34, 320); for (let i = 0; i < 9; i++) x.lineTo(34 + i * 23, 310 - ((i * 53) % 28)); x.stroke();
  });
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w ?? 1.3, (o.w ?? 1.3) * 1.33), new THREE.MeshStandardMaterial({ map, roughness: 0.6 })); m.userData.noAO = true; return m;
}

// parts of a hospital bed as a Batch; the bed's head is at -z, the mattress top at y = top (4.0); sheetCol for the made sheet
const BED = { w: 4.2, l: 8.6, top: 3.9 };
export function bedParts(b, mats, o = {}) {
  const { w, l, top } = BED, { frame, sheet, pillow, blanket, wheel, rail } = mats;
  b.box(frame, w, 0.3, l, 0, top - 1.0, 0, { r: 0.06 });                             // deck
  for (const [x, z] of [[-w / 2 + 0.25, -l / 2 + 0.3], [w / 2 - 0.25, -l / 2 + 0.3], [-w / 2 + 0.25, l / 2 - 0.3], [w / 2 - 0.25, l / 2 - 0.3]]) { b.cyl(frame, 0.11, 0.11, top - 1.4, x, (top - 1.4) / 2 + 0.45, z); b.cyl(wheel, 0.32, 0.32, 0.22, x, 0.32, z, { rz: Math.PI / 2 }); }
  b.box(frame, w - 0.4, 0.14, 0.14, 0, 1.2, -l / 2 + 0.3, { r: 0.04 }); b.box(frame, w - 0.4, 0.14, 0.14, 0, 1.2, l / 2 - 0.3, { r: 0.04 });
  b.box(frame, w + 0.1, 2.6, 0.24, 0, top + 0.3, -l / 2 - 0.05, { r: 0.12 }); b.box(rail, w - 0.5, 1.7, 0.1, 0, top + 0.4, -l / 2 + 0.05, { r: 0.08 });   // headboard
  b.box(frame, w + 0.1, 1.7, 0.24, 0, top - 0.1, l / 2 + 0.05, { r: 0.12 });                                                                        // footboard
  b.box(sheet, w - 0.1, 0.78, l - 0.2, 0, top - 0.45, 0, { r: 0.22 });                // mattress in its sheet
  b.box(pillow, w * 0.68, 0.5, 1.6, 0, top + 0.18, -l / 2 + 1.25, { r: 0.24 });
  if (!o.occupied) b.box(blanket, w - 0.02, 0.16, l * 0.52, 0, top - 0.04, l * 0.2, { r: 0.07 });   // a folded-down blanket, made tight
  for (const s of [-1, 1]) if (o.rails !== false) { b.box(rail, 0.08, 0.7, 2.8, s * (w / 2 + 0.08), top + 0.25, -l / 2 + 2.2, { r: 0.03 }); b.box(rail, 0.12, 0.12, 2.9, s * (w / 2 + 0.08), top + 0.62, -l / 2 + 2.2, { r: 0.05 }); }
}
export function bedMats() {
  return { frame: paint('#e8ece8', { metalness: 0.35, roughness: 0.35 }), sheet: paint('#f2f4ef', { roughness: 0.85 }), pillow: paint('#fbfbf7', { roughness: 0.9 }),
    blanket: paint('#9ec3b4', { roughness: 0.92 }), wheel: paint('#2a2d2c', { roughness: 0.6 }), rail: paint('#cfd6d2', { metalness: 0.6, roughness: 0.3 }) };
}
export function hospitalBed(o = {}) { const b = new Batch(); bedParts(b, bedMats(), o); const g = b.done(); g.top = BED.top; g.size = BED; return g; }

// an IV pole with a bag
export function ivPole() {
  const b = new Batch(), st = paint('#d6dcda', { metalness: 0.8, roughness: 0.28 });
  b.cyl(st, 0.07, 0.07, 9, 0, 4.7, 0); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; b.box(st, 1.2, 0.1, 0.12, Math.cos(a) * 0.55, 0.3, Math.sin(a) * 0.55, { ry: -a, r: 0.03 }); }
  b.box(st, 1.4, 0.07, 0.07, 0, 9.1, 0, { r: 0.02 }); b.box(paint('#e8f2f0', { roughness: 0.2, transparent: true, opacity: 0.8 }), 0.7, 1.1, 0.25, 0.5, 8.3, 0, { r: 0.12 });
  return b.done();
}
// a bedside cabinet
export function cabinet() {
  const b = new Batch(), body = paint('#dfe5e0', { roughness: 0.5 }), top = paint('#c6cfc8', { roughness: 0.3 });
  b.box(body, 2.2, 3.2, 2, 0, 1.6, 0, { r: 0.08 }); b.box(top, 2.4, 0.16, 2.2, 0, 3.26, 0, { r: 0.05 }); b.box(paint('#a9b3ad'), 1.6, 0.12, 0.08, 0, 2.6, 1.02, { r: 0.03 }); b.box(paint('#a9b3ad'), 1.6, 0.12, 0.08, 0, 1.2, 1.02, { r: 0.03 });
  return b.done();
}

// a ceiling PA speaker: a round grille in a white ring
export function paSpeaker() {
  const g = new THREE.Group(), b = new Batch();
  b.cyl(paint('#eef0ec', { roughness: 0.4 }), 1.0, 1.05, 0.16, 0, 0, 0, { seg: 32 }); b.done(g);
  const map = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#e2e5e0'; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill(); x.fillStyle = '#4a514c'; for (let i = -9; i <= 9; i++) for (let j = -9; j <= 9; j++) if (i * i + j * j < 80) { x.beginPath(); x.arc(128 + i * 12, 128 + j * 12, 3.6, 0, 7); x.fill(); } });
  map.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.86, 32), new THREE.MeshStandardMaterial({ map, roughness: 0.6 })); m.rotation.x = Math.PI / 2; m.position.y = -0.09; m.userData.noAO = true; g.add(m);
  return g;
}

// a boxy CRT on a ceiling arm; .screen is the glass plane (assign it a material), facing +z
export function crtTV(o = {}) {
  const g = new THREE.Group(), b = new Batch(), shell = paint('#d8d4c6', { roughness: 0.55 }), dark = paint('#2b2d2b', { roughness: 0.5 }), st = paint('#c9cfcc', { metalness: 0.8, roughness: 0.3 });
  b.box(shell, 3.6, 2.9, 3.0, 0, 0, -0.4, { r: 0.28 }); b.box(shell, 2.6, 2.1, 1.4, 0, 0.0, -2.3, { r: 0.3 }); b.box(dark, 3.0, 2.3, 0.1, 0, 0.08, 1.12, { r: 0.12 });
  b.box(dark, 0.5, 0.16, 0.06, 1.2, -1.22, 1.12, { r: 0.03 });
  b.cyl(st, 0.14, 0.14, o.drop ?? 2.6, 0, 1.45 + (o.drop ?? 2.6) / 2, -1.2); b.box(st, 1.2, 0.2, 1.2, 0, 1.55, -1.2, { r: 0.06 }); b.cyl(st, 0.45, 0.45, 0.14, 0, 1.45 + (o.drop ?? 2.6), -1.2);
  b.done(g);
  g.screen = new THREE.Mesh(new THREE.PlaneGeometry(2.86, 2.16), new THREE.MeshBasicMaterial({ color: '#0b0d0c' })); g.screen.position.set(0, 0.08, 1.18); g.screen.userData.noAO = true; g.add(g.screen);
  return g;
}

// the cracked porcelain mask, drawn: glazed off-white, blank almond eye holes, a closed painted mouth, hairline cracks with a few chips
export function maskTexture() {
  const t = canvasTex(512, 512, (x, w, h) => {
    const g = x.createRadialGradient(w * 0.45, h * 0.38, 20, w / 2, h / 2, 320); g.addColorStop(0, '#fbfaf5'); g.addColorStop(0.7, '#ece9e0'); g.addColorStop(1, '#cfcac0'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(214,170,170,0.18)'; x.beginPath(); x.ellipse(150, 300, 50, 30, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(362, 300, 50, 30, 0, 0, 7); x.fill();
    const eye = (cx) => { x.fillStyle = '#060606'; x.beginPath(); x.moveTo(cx - 52, 222); x.quadraticCurveTo(cx, 182, cx + 52, 222); x.quadraticCurveTo(cx, 248, cx - 52, 222); x.fill(); x.strokeStyle = 'rgba(120,110,100,0.5)'; x.lineWidth = 3; x.stroke(); };
    eye(170); eye(342);
    x.strokeStyle = 'rgba(90,80,74,0.55)'; x.lineWidth = 3; x.beginPath(); x.moveTo(130, 168); x.quadraticCurveTo(170, 156, 212, 168); x.moveTo(300, 168); x.quadraticCurveTo(342, 156, 384, 168); x.stroke();
    x.strokeStyle = '#9a7b78'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(222, 380); x.quadraticCurveTo(256, 388, 290, 380); x.stroke();
    // cracks: a main fork down from the brow over the left eye, a second at the cheek, fine branches; chips
    const r = rng(17); x.strokeStyle = '#2b2622'; x.lineJoin = 'round';
    const crack = (pts, wid) => { x.lineWidth = wid; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) x.lineTo(p[0], p[1]); x.stroke(); };
    crack([[238, 0], [232, 60], [214, 112], [196, 176], [188, 214], [166, 262], [176, 318], [148, 380], [160, 440], [132, 512]], 4.5);
    crack([[214, 112], [262, 140], [300, 132], [352, 98]], 3); crack([[166, 262], [112, 280], [62, 268], [0, 300]], 3); crack([[176, 318], [214, 346], [232, 402]], 2.4);
    crack([[512, 330], [452, 340], [418, 372], [380, 360], [352, 410]], 3.2); crack([[418, 372], [440, 430], [430, 512]], 2.2);
    for (let i = 0; i < 18; i++) { const a = r() * w, b0 = r() * h; crack([[a, b0], [a + (r() - 0.5) * 30, b0 + (r() - 0.5) * 30], [a + (r() - 0.5) * 50, b0 + (r() - 0.5) * 50]], 1.2); }
    x.fillStyle = '#3a332e'; x.beginPath(); x.moveTo(196, 176); x.lineTo(210, 186); x.lineTo(200, 198); x.closePath(); x.fill();
  });
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// the nurse: a procedural body in a pale uniform, a skirt and a cap, wearing the mask over the whole face. She stands utterly still.
export function nurse() {
  const ch = makeCharacter({ skin: '#ece7de', shirt: '#e4ece6', sleeves: '#e4ece6', pants: '#d8e2dc', shoes: '#f2f2ee', hair: '#2a2420', hairStyle: 'bun', female: true, caustic: false, collar: '#c9d6ce' });
  const b = new Batch(), uni = paint('#e2ebe5', { roughness: 0.7 }), trim = paint('#7fae98', { roughness: 0.6 });
  b.box(uni, 2.2, 1.9, 1.25, 0, -0.75, 0, { r: 0.14 }); b.box(trim, 2.24, 0.12, 1.29, 0, -1.62, 0, { r: 0.04 });   // skirt to the knee, on the hips
  const sk = b.done(); ch.hips.add(sk);
  const hairC = new THREE.Color('#2a2420'); ch.neck.traverse((m) => { if (m.isMesh && m.material && m.material.color && m.material.color.getHex() === hairC.getHex()) m.visible = false; });
  const c = new Batch(); c.box(paint('#f6f8f4', { roughness: 0.6 }), 1.42, 0.55, 1.38, 0, 1.5, -0.02, { r: 0.16 }); c.box(paint('#3a302a', { roughness: 0.8 }), 0.7, 0.62, 0.5, 0, 1.0, -0.78, { r: 0.24 }); c.box(trim, 0.34, 0.12, 0.04, 0, 1.55, 0.68, { r: 0.02 }); c.box(trim, 0.12, 0.34, 0.04, 0, 1.55, 0.68, { r: 0.02 });
  const cap = c.done(); ch.neck.add(cap);
  // the mask: a gently domed shell over the face (the head's front is +z at ~0.63)
  const geo = new THREE.SphereGeometry(1, 40, 28, Math.PI / 2 - 0.31 * Math.PI, 0.62 * Math.PI, 0.18 * Math.PI, 0.62 * Math.PI);
  geo.scale(0.78, 0.82, 0.32);
  const uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.56 + 0.5, p.getY(i) / 1.42 + 0.5);
  const mask = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: maskTexture(), roughness: 0.22, metalness: 0.0, side: THREE.DoubleSide }));
  mask.rotation.y = 0; mask.position.set(0, 0.7, 0.42); mask.castShadow = true; ch.neck.add(mask); ch.mask = mask;
  if (ch.lid) ch.lid.visible = false;
  return ch;
}

// patients in rows: heads on pillows (closed-eye faces), bodies under sheets. list: [{ x, z, ry, s }] bed positions; faceMap: closed-eye face
export function wardBeds(parent, list, o = {}) {
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = v3(1, 1, 1), E = new THREE.Euler(), r = rng(o.seed ?? 5);
  const mats = bedMats(), parts = new Map(); const b = new Batch(); bedParts(b, mats, { occupied: true });
  const g = b.done(); const out = new THREE.Group(); parent.add(out);
  const occ = list.filter((c) => !c.empty), emp = list.filter((c) => c.empty);
  const inst = (geo, mat, arr, f) => { const im = new THREE.InstancedMesh(geo, mat, arr.length); arr.forEach((c, i) => { E.set(0, c.ry ?? 0, 0); q.setFromEuler(E); const m = M.compose(v3(c.x, 0, c.z), q, s).clone(); if (f) m.multiply(f(c, i)); im.setMatrixAt(i, m); }); im.castShadow = o.shadows ?? false; im.receiveShadow = true; im.frustumCulled = false; out.add(im); return im; };
  g.children.forEach((m) => inst(m.geometry, m.material, list)); void parts;
  if (emp.length) { const be = new Batch(); be.box(mats.blanket, BED.w - 0.02, 0.16, BED.l * 0.52, 0, BED.top - 0.04, BED.l * 0.2, { r: 0.07 }); be.done().children.forEach((m) => inst(m.geometry, m.material, emp)); }
  // the occupied: a body under the sheet, folded sheet edge, head, hair, face
  const sheet = paint('#eef1ec', { roughness: 0.88 }), fold = paint('#9ec3b4', { roughness: 0.92 });
  const bodyG = new RoundedBoxGeometry(3.0, 1.1, 6.0, 3, 0.45); bodyG.translate(0, BED.top + 0.3, 0.9);
  const foldG = new RoundedBoxGeometry(3.6, 0.3, 0.9, 2, 0.12); foldG.translate(0, BED.top + 0.72, -1.7);
  inst(bodyG, sheet, occ); inst(foldG, fold, occ);
  const headG = new RoundedBoxGeometry(1.3, 1.25, 1.25, 3, 0.28); headG.translate(0, 0, 0);
  const headM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 });
  const skins = ['#f1c7a1', '#e0ac7e', '#c68a5a', '#8d5a3b', '#f5d6b8', '#d9a173'];
  const hairs = ['#2a1d14', '#4a3020', '#121010', '#8a5a30', '#c8a060', '#5a4a40'];
  // head lies back on the pillow: face up (+y), crown toward the headboard (-z)
  const headT = new THREE.Matrix4().compose(v3(0, BED.top + 0.92, -BED.l / 2 + 1.3), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), v3(1, 1, 1));
  const hm = inst(headG, headM, occ, () => headT);
  const hairG = new RoundedBoxGeometry(1.42, 1.38, 0.5, 2, 0.16); hairG.translate(0, 0.08, -0.48);
  const hairM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 });
  const hh = inst(hairG, hairM, occ, () => headT);
  const faceG = new THREE.PlaneGeometry(1.2, 1.2); faceG.translate(0, 0, 0.63);
  const faceM = new THREE.MeshStandardMaterial({ map: o.faceMap, transparent: true, alphaTest: 0.05, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
  const fm = inst(faceG, faceM, occ, () => headT); fm.userData.noAO = true; fm.castShadow = false;
  const c = new THREE.Color(); occ.forEach((x, i) => { hm.setColorAt(i, c.set(skins[Math.floor(r() * skins.length)])); hh.setColorAt(i, c.set(hairs[Math.floor(r() * hairs.length)])); });
  hm.instanceColor.needsUpdate = true; hh.instanceColor.needsUpdate = true;
  return out;
}

// the derelict hospital outside: a long block of storeys with instanced windows that switch on, boarded doors, a faded roof sign
export function hospitalBlock(parent, o = {}) {
  const W = o.w ?? 150, D = o.d ?? 40, floors = o.floors ?? 5, fh = o.fh ?? 13, g = new THREE.Group(); parent.add(g);
  const b = new Batch(), conc = surf('concrete', '#7c817a', { roughness: 0.95 }), band = surf('concrete', '#5d635c', { roughness: 0.95 }), dark = paint('#141714', { roughness: 0.9 });
  b.box(conc, W, floors * fh, D, 0, (floors * fh) / 2, 0, { r: 0.3 });
  for (let f = 1; f <= floors; f++) b.box(band, W + 1.2, 1.1, D + 1.2, 0, f * fh - 0.4, 0, { r: 0.2 });
  b.box(conc, 34, fh * floors + 10, D + 6, -W / 2 + 26, (fh * floors + 10) / 2, 0, { r: 0.3 });   // a taller stair tower
  // entrance canopy, boarded doors, dead lamps
  b.box(band, 38, 1.4, 14, 0, 11, D / 2 + 7, { r: 0.2 }); for (const x of [-17, 17]) b.cyl(band, 0.6, 0.6, 11, x, 5.5, D / 2 + 13);
  const ply = surf('plank', '#6b5a44', { roughness: 0.9 }); ply.userData.span = 5;
  for (let i = 0; i < 4; i++) b.box(ply, 6.6, 9, 0.4, -10 + i * 6.8, 4.5, D / 2 + 0.3, { r: 0.05, rz: (i % 2 ? 1 : -1) * 0.02 });
  b.box(dark, 30, 0.4, 0.6, 0, 9.4, D / 2 + 0.4, { r: 0.05 });
  // rooftop plant, rails
  b.box(band, 22, 6, 14, 30, floors * fh + 3, -4, { r: 0.2 }); b.box(band, 10, 4, 10, -40, floors * fh + 2, 6, { r: 0.2 });
  b.done(g);
  // windows: lit ones glow, dark ones are black glass; a few boarded on the ground floor
  const per = Math.floor(W / 9), list = []; for (let f = 0; f < floors; f++) for (let i = 0; i < per; i++) { const x = -W / 2 + 4.5 + i * 9; if (Math.abs(x + W / 2 - 26) < 18) continue; if (f === 0 && Math.abs(x) < 22) continue; list.push({ x, y: f * fh + fh * 0.55, f, i }); }
  const wm = new THREE.MeshBasicMaterial({ color: '#ffffff' }), im = new THREE.InstancedMesh(new THREE.PlaneGeometry(5.6, 6.2), wm, list.length);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = v3(1, 1, 1); list.forEach((c, k) => { im.setMatrixAt(k, M.compose(v3(c.x, c.y, D / 2 + 0.08), q, s)); });
  im.userData.noAO = true; im.frustumCulled = false; g.add(im);
  const fr = new Batch(), fm = paint('#3a3f3a', { roughness: 0.7 }); list.forEach((c) => { fr.box(fm, 6.4, 0.5, 0.6, c.x, c.y - 3.3, D / 2 + 0.2, { r: 0.08 }); fr.box(fm, 0.3, 6.4, 0.3, c.x, c.y, D / 2 + 0.2, { r: 0.04 }); }); fr.done(g);
  const r = rng(o.seed ?? 4); list.forEach((c) => { c.t = r(); c.ph = r() * 9; c.dead = r() < 0.22; });
  const lit = new THREE.Color(o.lit ?? '#d8f5dc'), off = new THREE.Color('#0b0e0d'), cc = new THREE.Color();
  // k: 0..1 how far the switch-on has spread; flicker for the tubes catching
  g.lights = (k, t) => { list.forEach((c, i) => { const a = clamp((k - c.t * 0.85) / 0.15); const fl = c.dead ? 0 : a > 0 && a < 1 ? (Math.sin(t * 60 + c.ph) > 0 ? 1 : 0.15) : a; cc.copy(off).lerp(lit, fl).multiplyScalar(1 + fl * 0.25); im.setColorAt(i, cc); }); im.instanceColor.needsUpdate = true; };
  g.lights(0, 0);
  // the sign on the roof edge, faded
  const sm = canvasTex(1024, 160, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = '900 120px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#c9cdbf'; x.fillText('WILLOW CREEK GENERAL', w / 2, h / 2 + 6); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(96, 15), new THREE.MeshStandardMaterial({ map: sm, transparent: true, roughness: 0.9 })); sign.position.set(8, floors * fh + 1.5, D / 2 + 0.6); g.add(sign);
  g.size = { W, D, H: floors * fh };
  return g;
}

// a chain-link fence panel run with a demolition notice
export function fenceRun(parent, x0, x1, z, o = {}) {
  const mesh = canvasTex(256, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(170,176,170,0.9)'; x.lineWidth = 4; for (let i = -8; i < 16; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 256, 256); x.stroke(); x.beginPath(); x.moveTo(i * 32 + 256, 0); x.lineTo(i * 32, 256); x.stroke(); } });
  mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping; mesh.repeat.set((x1 - x0) / 4, 2); mesh.colorSpace = THREE.SRGBColorSpace;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 8), new THREE.MeshStandardMaterial({ map: mesh, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 }));
  f.position.set((x0 + x1) / 2, 4, z); parent.add(f);
  const b = new Batch(), post = paint('#8a908a', { metalness: 0.7, roughness: 0.4 }); for (let x = x0; x <= x1 + 0.1; x += 10) b.cyl(post, 0.16, 0.16, 8.4, x, 4.2, z); b.cyl(post, 0.1, 0.1, x1 - x0, (x0 + x1) / 2, 8.1, z, { rz: Math.PI / 2 }); b.done(parent);
  return f;
}
export function noticeSign(lines, o = {}) {
  const map = canvasTex(768, 560, (x, w, h) => {
    x.fillStyle = '#e9e3cf'; x.fillRect(0, 0, w, h); x.fillStyle = '#b3261e'; x.fillRect(0, 0, w, 120);
    x.fillStyle = '#ffffff'; x.font = '900 82px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(lines[0], w / 2, 64);
    x.fillStyle = '#1e1e1c'; lines.slice(1).forEach((l, i) => { x.font = `900 ${i === 0 ? 58 : 48}px ITTInter, sans-serif`; x.fillText(l, w / 2, 190 + i * 92); });
    const r = rng(3); for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(110,80,40,${0.05 + r() * 0.12})`; x.beginPath(); x.ellipse(r() * w, r() * h, 6 + r() * 40, 4 + r() * 30, r(), 0, 7); x.fill(); }
  });
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w ?? 6, (o.w ?? 6) * 560 / 768), new THREE.MeshStandardMaterial({ map, roughness: 0.8 })); return m;
}
