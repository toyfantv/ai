// Episode 21's hotel kit: wallpaper, carpet, numbered doors, a long corridor with open rooms, a forgotten wing, a tiny room, ceiling tiles that
// can fall, and a tower of floors that can pancake. Everything is a pure function of its inputs, so a frame depends only on t.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { v3, rng, clamp, easeIn } from './core.js';
import { Batch, surf, paint } from './kit.js';
import { canvasTex } from './props.js';

const tile = (t, span) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
const mat = (map, span, o = {}) => { const m = new THREE.MeshStandardMaterial({ map, roughness: 0.82, ...o }); m.userData.span = span; return m; };

// damask wallpaper: a repeating ogee with a flower inside; age adds stains and torn strips
export function wallpaper(base = '#17352f', ink = '#2c5a4e', o = {}) {
  const t = tile(canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h); x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = 7;
    const ogee = (cx, cy) => {
      x.beginPath(); x.moveTo(cx, cy - 118); x.bezierCurveTo(cx + 40, cy - 70, cx + 106, cy - 40, cx + 106, cy); x.bezierCurveTo(cx + 106, cy + 40, cx + 40, cy + 70, cx, cy + 118);
      x.bezierCurveTo(cx - 40, cy + 70, cx - 106, cy + 40, cx - 106, cy); x.bezierCurveTo(cx - 106, cy - 40, cx - 40, cy - 70, cx, cy - 118); x.stroke();
      for (let i = 0; i < 6; i++) { const a = i * 1.047; x.beginPath(); x.ellipse(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30, 22, 9, a, 0, 7); x.fill(); }
      x.beginPath(); x.arc(cx, cy, 12, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx, cy - 92); x.lineTo(cx + 12, cy - 64); x.lineTo(cx, cy - 52); x.lineTo(cx - 12, cy - 64); x.fill(); x.beginPath(); x.moveTo(cx, cy + 92); x.lineTo(cx + 12, cy + 64); x.lineTo(cx, cy + 52); x.lineTo(cx - 12, cy + 64); x.fill();
    };
    for (const [a, b] of [[128, 128], [384, 384], [384, -128], [-128, 384], [640, 384], [384, 640], [128, 640], [640, 128], [-128, 128]]) ogee(a, b);
    if (o.age) { const r = rng(4); for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(10,8,4,${0.1 + r() * 0.18})`; x.beginPath(); x.ellipse(r() * w, r() * h, 20 + r() * 70, 30 + r() * 110, r(), 0, 7); x.fill(); } for (let i = 0; i < 7; i++) { x.fillStyle = 'rgba(190,176,140,0.42)'; const a = r() * w; x.beginPath(); x.moveTo(a, r() * h); x.lineTo(a + 12 + r() * 40, r() * h); x.lineTo(a + r() * 30, r() * h); x.fill(); } }
  }));
  t.colorSpace = THREE.SRGBColorSpace; return mat(t, o.span ?? 7);
}
export function carpet(base = '#4c1320', a = '#c49a4a', b = '#27090f') {
  const t = tile(canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h); x.strokeStyle = b; x.lineWidth = 10;
    for (let i = -1; i < 3; i++) for (let j = -1; j < 3; j++) { const cx = i * 256 + 128, cy = j * 256 + 128; x.beginPath(); x.moveTo(cx, cy - 120); x.lineTo(cx + 120, cy); x.lineTo(cx, cy + 120); x.lineTo(cx - 120, cy); x.closePath(); x.stroke(); x.fillStyle = a; x.beginPath(); x.moveTo(cx, cy - 40); x.lineTo(cx + 40, cy); x.lineTo(cx, cy + 40); x.lineTo(cx - 40, cy); x.closePath(); x.fill(); x.fillStyle = b; x.beginPath(); x.arc(cx, cy, 14, 0, 7); x.fill(); x.fillStyle = a; for (const [p, q] of [[128, 0], [-128, 0], [0, 128], [0, -128]]) { x.beginPath(); x.arc(cx + p, cy + q, 9, 0, 7); x.fill(); } }
    const r = rng(9); for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.12})`; x.fillRect(r() * w, r() * h, 2, 2); }
  }));
  t.colorSpace = THREE.SRGBColorSpace; return mat(t, 9, { roughness: 0.95 });
}

// a brass plate with engraved numbers
export function plate(text, o = {}) {
  const w = o.w ?? 2, h = o.h ?? 0.9;
  const map = canvasTex(512, Math.round(512 * h / w), (x, W, H) => {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, o.lit ?? '#e8c678'); g.addColorStop(0.5, o.mid ?? '#b58a3a'); g.addColorStop(1, o.lit ?? '#e8c678'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = o.ink ?? '#3a2610'; x.lineWidth = 8; x.strokeRect(10, 10, W - 20, H - 20);
    x.fillStyle = o.ink ?? '#2a1a0a'; x.font = `900 ${Math.round(H * 0.68)}px ITTInter, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + H * 0.04);
    if (o.scuff) { const r = rng(text.length + 3); for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(30,24,16,${r() * 0.5})`; x.fillRect(r() * W, r() * H, 4 + r() * 40, 2 + r() * 5); } }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, metalness: o.metal ?? 0.55, roughness: 0.38, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: o.glow ?? 0.16 }));
  m.userData.noAO = true; return m;
}

// a door hung from its hinge at the origin: the leaf runs along +x, its face toward +z. .swing = rotation.y; o.side flips the hinge
export function doorLeaf(o = {}) {
  const w = o.w ?? 5, h = o.h ?? 9.5, d = o.d ?? 0.34, col = o.color ?? '#4a2416', g = new THREE.Group(), b = new Batch(), wood = surf('plank', col, { roughness: 0.5 }), trim = paint(o.trim ?? col, { roughness: 0.42 });
  wood.userData.span = 6;
  b.box(wood, w, h, d, w / 2, h / 2, 0, { r: 0.04 });
  const rows = o.rows ?? 3, m = w * 0.14, ph = (h - m * (rows + 1)) / rows;
  for (let i = 0; i < rows; i++) for (const s of [1, -1]) {
    const y = m + ph / 2 + i * (ph + m), z = s * (d / 2 + 0.03), pw = w - 2 * m;
    for (const [a, c, p, q] of [[pw, 0.12, w / 2, y + ph / 2], [pw, 0.12, w / 2, y - ph / 2], [0.12, ph, m, y], [0.12, ph, w - m, y]]) b.box(trim, a, c, 0.1, p, q, z, { r: 0.03 });
    b.box(wood, pw - 0.5, ph - 0.5, 0.06, w / 2, y, z, { r: 0.02 });
  }
  const brass = paint(o.brass ?? '#c89a42', { metalness: 0.85, roughness: 0.3 }), hy = o.handleY ?? h * 0.45;
  for (const s of [1, -1]) { b.box(brass, 0.34, 1.1, 0.06, w - 0.5, hy, s * (d / 2 + 0.04), { r: 0.02 }); b.cyl(brass, 0.08, 0.08, 0.24, w - 0.5, hy, s * (d / 2 + 0.14), { rx: Math.PI / 2 }); b.box(brass, 0.74, 0.12, 0.12, w - 0.72, hy, s * (d / 2 + 0.27), { r: 0.04 }); }
  b.done(g); g.handle = v3(w - 0.9, hy, d / 2 + 0.27); return g;
}

// a glowing EXIT box
export function exitSign(text = 'EXIT') {
  const g = new THREE.Group(), b = new Batch(); b.box(paint('#16201b', { roughness: 0.4 }), 3.4, 1.3, 0.5, 0, 0, 0, { r: 0.06 }); b.done(g);
  const map = canvasTex(512, 192, (x, w, h) => { x.fillStyle = '#04261a'; x.fillRect(0, 0, w, h); x.fillStyle = '#7dffb9'; x.font = '900 140px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#17ff8c'; x.shadowBlur = 30; x.fillText(text, w / 2, h / 2 + 6); });
  const m = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(1.6, 1.6, 1.6) });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.05), m); f.position.z = 0.27; f.userData.noAO = true; g.add(f); return g;
}

// a flashlight held along its own -y: the lens at the far end. .lens is the empty at the glass
export function flashlight() {
  const g = new THREE.Group(), b = new Batch(), body = paint('#c8a23a', { metalness: 0.4, roughness: 0.42 }), blk = paint('#1a1a1e', { roughness: 0.5 });
  b.cyl(body, 0.16, 0.16, 1.2, 0, 0, 0, { seg: 14 }); b.cyl(body, 0.27, 0.17, 0.34, 0, -0.74, 0, { seg: 16 }); b.cyl(blk, 0.18, 0.18, 0.1, 0, 0.62, 0, { seg: 14 }); b.box(blk, 0.1, 0.22, 0.06, 0, 0.1, 0.17, { r: 0.02 }); b.done(g);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.24, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.7, 1.9) })); glass.rotation.x = Math.PI / 2; glass.position.y = -0.92; glass.userData.noAO = true; g.add(glass); g.glass = glass;
  g.lens = new THREE.Object3D(); g.lens.position.y = -0.92; g.add(g.lens); return g;
}

// ceiling tiles that fall: grid over x0..x1, z0..z1 at height H. fall(tile) -> the time it lets go. update(t) moves them; each lands, bounces once and settles
export function ceilingTiles(parent, { x0, x1, z0, z1, H, size = 5, color = '#6f6a5e', gap = 0.08, fall, floor = 0.25, seed = 3, g = 62 }) {
  const nx = Math.round((x1 - x0) / size), nz = Math.round((z1 - z0) / size), n = nx * nz, r = rng(seed), list = [];
  const geo = new RoundedBoxGeometry((x1 - x0) / nx - gap, 0.42, (z1 - z0) / nz - gap, 2, 0.06), m = surf('concrete', color, { roughness: 0.9 }), im = new THREE.InstancedMesh(geo, m, n);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = x0 + (i + 0.5) * (x1 - x0) / nx, z = z0 + (j + 0.5) * (z1 - z0) / nz; list.push({ x, z, t0: 0, rx: (r() - 0.5) * 2.6, rz: (r() - 0.5) * 2.6, sp: 0.3 + r() * 0.7, r: r() }); }
  list.forEach((c) => { c.t0 = fall ? fall(c) : 1e9; });
  im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; parent.add(im);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), E = new THREE.Euler(), p = v3(0, 0, 0), s = v3(1, 1, 1), fallT = Math.sqrt(2 * (H - floor) / g);
  im.update = (t) => {
    list.forEach((c, i) => {
      const a = t - c.t0; let y = H, k = 0;
      if (a > 0) {
        if (a < fallT) { y = H - 0.5 * g * a * a; k = a / fallT; } else { const b = a - fallT; y = floor + Math.max(0, 2.2 * c.sp * b - 0.5 * g * b * b); k = 1; }
      } else if (a > -0.45) { y = H - 0.08 * Math.sin(a * 60) * (1 + a * 2); }   // shaking loose
      E.set(c.rx * k * (a > fallT ? 0.1 : 1), 0, c.rz * k * (a > fallT ? 0.1 : 1)); q.setFromEuler(E); p.set(c.x, y, c.z); im.setMatrixAt(i, M.compose(p, q, s));
    });
    im.instanceMatrix.needsUpdate = true;
  };
  im.update(-10); return im;
}

// loose chunks falling from t0 at spots round a point
export function rubble(parent, { list, color = '#5a5548', g = 62, seed = 8 }) {
  const r = rng(seed), geo = new THREE.BoxGeometry(1, 1, 1), im = new THREE.InstancedMesh(geo, surf('concrete', color), list.length); im.castShadow = true; im.frustumCulled = false; parent.add(im);
  list.forEach((c) => { c.rx = r() * 7; c.ry = r() * 7; c.s = c.s ?? 0.3 + r() * 0.9; });
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), E = new THREE.Euler(), p = v3(0, 0, 0), s = v3(1, 1, 1);
  im.update = (t) => { list.forEach((c, i) => { const a = t - c.t0, f = Math.sqrt(2 * Math.max(0.1, c.y - (c.floor ?? c.s / 2)) / g); const y = a <= 0 ? c.y + 40 : a < f ? c.y - 0.5 * g * a * a : (c.floor ?? c.s / 2); E.set(c.rx + Math.min(a, f) * 5, c.ry, 0); q.setFromEuler(E); p.set(c.x, y, c.z); s.setScalar(a <= 0 ? 0.001 : c.s); im.setMatrixAt(i, M.compose(p, q, s)); }); im.instanceMatrix.needsUpdate = true; };
  return im;
}

// the hotel from outside: bands of floors with windows that can change colour, floor by floor, and that can pancake
export function hotelTower(parent, o = {}) {
  const floors = o.floors ?? 16, W = o.w ?? 96, D = o.d ?? 56, fh = o.fh ?? 11, g = new THREE.Group(), r = rng(21); parent.add(g);
  const band = new THREE.InstancedMesh(new THREE.BoxGeometry(W, fh - 0.5, D), surf('brick', '#46362e'), floors), ledge = new THREE.InstancedMesh(new RoundedBoxGeometry(W + 2.4, 0.9, D + 2.4, 2, 0.2), paint('#8a7a64', { roughness: 0.7 }), floors);
  const cols = Math.floor(W / 8), sides = Math.floor(D / 8), per = cols + sides, wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.8, 5.6), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: true }), floors * per);
  [band, ledge].forEach((m) => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; g.add(m); }); wins.frustumCulled = false; wins.userData.noAO = true; g.add(wins);
  const off = [], warm = new THREE.Color('#ffc27a'), dim = new THREE.Color('#2c2a30'), grn = new THREE.Color('#2bff8e'), c = new THREE.Color(), M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = v3(0, 0, 0), s = v3(1, 1, 1), E = new THREE.Euler();
  for (let j = 0; j < floors; j++) off.push({ on: Array.from({ length: per }, () => r() < 0.46), rz: (r() - 0.5) * 0.06, rx: (r() - 0.5) * 0.05, dx: (r() - 0.5) * 3 });
  const cap = new Batch(), gold = paint('#c49a4a', { metalness: 0.7, roughness: 0.35 }); cap.box(paint('#3a2c24'), W + 5, 2, D + 5, 0, 0, 0, { r: 0.3 }); cap.box(gold, W + 6, 0.5, D + 6, 0, -1, 0, { r: 0.1 }); g.roof = new THREE.Group(); cap.done(g.roof); g.add(g.roof);
  const base = new Batch(); base.box(paint('#2e241e'), W + 8, 7, D + 8, 0, 3.5, 0, { r: 0.3 }); base.box(gold, 34, 1, 18, 0, 11, D / 2 + 9, { r: 0.2 }); for (const x of [-15, 15]) base.cyl(gold, 0.6, 0.6, 11, x, 5.5, D / 2 + 17); g.base = new THREE.Group(); base.done(g.base); g.add(g.base);
  const y0 = 8;
  g.update = (tGreen, tSweep, tFall, t) => {
    const k = clamp((t - tFall) / 3.2); let w = 0, topY = 0, topS = 1, topT = 0;
    for (let j = 0; j < floors; j++) {
      const f = off[j], a = t - tFall - (floors - j) * 0.09, rest = y0 + j * 1.6, y = y0 + j * fh + fh / 2, fy = a > 0 ? Math.max(rest, y - 0.5 * 90 * a * a) : y, tilt = a > 0 ? clamp(a) : 0;
      if (j === floors - 1) { topY = fy; topS = a > 0 ? Math.max(0.16, 1 - a * 0.9) : 1; topT = f.rz * tilt; }
      E.set(f.rx * tilt, 0, f.rz * tilt); q.setFromEuler(E); p.set(f.dx * tilt, fy, 0); s.set(1, a > 0 ? Math.max(0.16, 1 - a * 0.9) : 1, 1); M.compose(p, q, s); band.setMatrixAt(j, M); p.y = fy + fh / 2; s.set(1, 1, 1); M.compose(p, q, s); ledge.setMatrixAt(j, M);
      const green = clamp((t - tGreen - (j / floors) * tSweep) / 0.12), gone = a > 0.25;
      for (let i = 0; i < per; i++) {
        const front = i < cols, u = front ? (i + 0.5) / cols - 0.5 : (i - cols + 0.5) / sides - 0.5;
        E.set(f.rx * tilt, front ? 0 : Math.PI / 2, f.rz * tilt); q.setFromEuler(E); p.set(front ? u * W + f.dx * tilt : W / 2 + 0.06 + f.dx * tilt, fy, front ? D / 2 + 0.06 : -u * D); s.setScalar(gone ? 0.001 : 1); M.compose(p, q, s); wins.setMatrixAt(w, M);
        c.copy(f.on[i] ? warm : dim).multiplyScalar(f.on[i] ? 1.4 : 1).lerp(grn, green); if (green > 0) c.multiplyScalar(1 + 1.3 * green); wins.setColorAt(w, c); w++;
      }
    }
    band.instanceMatrix.needsUpdate = ledge.instanceMatrix.needsUpdate = wins.instanceMatrix.needsUpdate = true; wins.instanceColor.needsUpdate = true;
    g.roof.position.y = topY + fh / 2 * topS + 1; g.roof.rotation.z = topT; void k;
  };
  g.size = { W, D, H: y0 + floors * fh };
  return g;
}
