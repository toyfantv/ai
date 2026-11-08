// The infinite tower (Episode 29, an original design): a windowless round tower with a helix of floating candy platforms round it, a white door in a wall on its roof,
// the same tower hung upside down on the far side of that door, a chalk wall of tally marks, and a field of identical towers in every direction.
//   levelPos(n, tw, o), TW (the numbers), buildTower({ inverted }), doorWall(), ledge(), towerField(), curved(), chalkStick(), paintKit(), jointify(c)
// Platforms are instanced; update(tw) moves them (tw is the world's time, which simply stops being advanced when the tower stops).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Batch, paint } from './kit.js';
import { canvasTex } from './props.js';
import { doorLeaf } from './hotel.js';
import { v3, lerp } from './core.js';

export const TW = { R: 18, RP: 24.6, DA: 0.62, DY: 4.6, W: 11, D: 9, TOP: 100 };
export const CANDY = ['#d9604f', '#e59a4c', '#e3c64f', '#6fb878', '#50aebf', '#5b80d0', '#9771cc', '#dc80ac'];
export const levelAngle = (n) => Math.PI / 2 + (n - 99) * TW.DA;
export const bobY = (n, tw) => Math.sin(tw * 0.7 + n * 1.3) * 0.55;
export const bobA = (n, tw) => Math.sin(tw * 0.5 + n * 2.1) * 0.014;
// the top centre of level n's platform at world time tw, with { side, rad } offsets (along the climb, away from the wall)
export function levelPos(n, tw, o = {}) {
  const a = levelAngle(n) + bobA(n, tw), rx = Math.cos(a), rz = Math.sin(a), r = TW.RP + (o.rad || 0), s = o.side || 0;
  return v3(rx * r - rz * s, n * TW.DY + bobY(n, tw) + (o.up || 0), rz * r + rx * s);
}
export const radial = (n) => { const a = levelAngle(n); return v3(Math.cos(a), 0, Math.sin(a)); };
export const along = (n) => { const a = levelAngle(n); return v3(-Math.sin(a), 0, Math.cos(a)); };

const wallTex = () => { const t = canvasTex(1024, 1024, (x, w, h) => {
  x.fillStyle = '#b4ba97'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#c3a69c'; x.fillRect(0, 610, w, 150); x.fillStyle = '#9fa98c'; x.fillRect(0, 760, w, 34);
  for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${40 + i % 60},${50 + i % 50},${30 + i % 40},${0.02 + (i % 5) * 0.012})`; const px = (i * 397) % w, py = (i * 613) % h; x.fillRect(px, py, 2 + (i % 40), 1 + (i % 90)); }
  x.strokeStyle = 'rgba(40,46,30,0.55)'; x.lineWidth = 5; for (let i = 0; i < 8; i++) { const px = i * w / 8; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, h); x.stroke(); }
  x.beginPath(); x.moveTo(0, 2); x.lineTo(w, 2); x.stroke(); x.beginPath(); x.moveTo(0, 512); x.lineTo(w, 512); x.stroke();
  for (let i = 0; i < 26; i++) { const px = (i * 131) % w, g = x.createLinearGradient(0, 780, 0, 1024); g.addColorStop(0, 'rgba(40,40,20,0.16)'); g.addColorStop(1, 'rgba(40,40,20,0)'); x.fillStyle = g; x.fillRect(px, 780, 6 + (i % 7) * 3, 244); }
}); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };

// a decal on the curved wall: arc in radians centred on the level's angle (theta runs from +z toward +x, so u reads left to right from outside)
export function curved(angle, y, arc, h, tex, o = {}) {
  const th = Math.atan2(Math.cos(angle), Math.sin(angle)), R = TW.R + (o.off ?? 0.05);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, h, 32, 1, true, th - arc / 2, arc), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.y = y; m.userData.noAO = true; return m;
}
const numTex = (n) => { const t = canvasTex(320, 320, (x, w) => { x.clearRect(0, 0, w, w); x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 16; x.beginPath(); x.arc(160, 160, 138, 0, 7); x.stroke(); x.fillStyle = '#ffffff'; x.font = `900 ${String(n).length > 2 ? 120 : 170}px ITTInter, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), 160, 172); }); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// the tower: the column, the roof, its tubes, every platform to TOP - 1; .update(tw)
export function buildTower(o = {}) {
  const g = new THREE.Group(), { R, DY, W, D, TOP } = TW, H = 1500, topY = TOP * DY;
  const wt = wallTex(); wt.repeat.set(6, H / 26);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, true), new THREE.MeshStandardMaterial({ map: wt, color: '#c2bfae', roughness: 0.92 })); col.position.y = topY - H / 2; col.receiveShadow = true; g.add(col);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.7, R + 0.7, 1.2, 64), paint('#e6e2d2', { roughness: 0.6 })); cap.position.y = topY - 0.6; cap.receiveShadow = true; g.add(cap);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 0.72, 0.13, 8, 96), new THREE.MeshBasicMaterial({ color: '#d7e8b4' })); rim.rotation.x = Math.PI / 2; rim.position.y = topY - 0.1; g.add(rim);
  const tube = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 10, 0.34), new THREE.MeshBasicMaterial({ color: '#dceaba' }), 8 * 62); tube.userData.noAO = true; { const M = new THREE.Matrix4(); let k = 0; for (let j = 0; j < 62; j++) for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2 + 0.2, y = topY - 16 - j * 23; M.makeTranslation(Math.cos(a) * (R + 0.14), y, Math.sin(a) * (R + 0.14)); tube.setMatrixAt(k++, M); } } g.add(tube);
  const N = TOP - 1 + 120;   // levels below zero too (the tower has no ground floor)
  const lv = (i) => i - 120;
  const body = new THREE.InstancedMesh(new RoundedBoxGeometry(W, 1.6, D, 3, 0.26), new THREE.MeshStandardMaterial({ roughness: 0.46 }), N);
  const top = new THREE.InstancedMesh(new THREE.BoxGeometry(W - 0.56, 0.18, D - 0.56), new THREE.MeshStandardMaterial({ roughness: 0.3 }), N);
  const trimG = new THREE.BoxGeometry(W, 0.14, 0.15), trim = new THREE.InstancedMesh(trimG, new THREE.MeshBasicMaterial({ color: '#ffffff' }), N * 2), trim2 = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.14, D), new THREE.MeshBasicMaterial({ color: '#ffffff' }), N * 2);
  body.castShadow = true; body.receiveShadow = true; top.receiveShadow = true; trim.userData.noAO = trim2.userData.noAO = true;
  const cc = new THREE.Color(), white = new THREE.Color('#ffffff');
  for (let i = 0; i < N; i++) { const c = CANDY[((lv(i) % 8) + 8) % 8]; cc.set(c); body.setColorAt(i, cc); top.setColorAt(i, cc.clone().lerp(white, 0.3)); const e = cc.clone().multiplyScalar(1.2); trim.setColorAt(i * 2, e); trim.setColorAt(i * 2 + 1, e); trim2.setColorAt(i * 2, e); trim2.setColorAt(i * 2 + 1, e); }
  g.add(body, top, trim, trim2);
  const nums = {}; for (let n = 10; n < TOP; n += 10) { const m = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.MeshStandardMaterial({ map: numTex(n), transparent: true, roughness: 0.5, depthWrite: false })); m.userData.noAO = true; m.rotation.x = -Math.PI / 2; g.add(m); nums[n] = m; }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = v3(1, 1, 1), P = v3(), T = v3();
  let last = null;
  g.update = (tw) => {
    if (tw === last) return; last = tw;
    for (let i = 0; i < N; i++) {
      const n = lv(i), a = levelAngle(n) + bobA(n, tw); P.copy(levelPos(n, tw)); E.set(0, Math.PI / 2 - a, 0); Q.setFromEuler(E);
      M.compose(T.set(P.x, P.y - 0.85, P.z), Q, S); body.setMatrixAt(i, M);
      M.compose(T.set(P.x, P.y - 0.09, P.z), Q, S); top.setMatrixAt(i, M);
      for (const [sg, im] of [[0, trim], [1, trim]]) { const off = (sg ? 1 : -1) * (D / 2 - 0.02); T.set(P.x + Math.cos(a) * off, P.y - 0.24, P.z + Math.sin(a) * off); M.compose(T, Q, S); im.setMatrixAt(i * 2 + sg, M); }
      for (const sg of [0, 1]) { const off = (sg ? 1 : -1) * (W / 2 - 0.02); T.set(P.x - Math.sin(a) * off, P.y - 0.24, P.z + Math.cos(a) * off); M.compose(T, Q, S); trim2.setMatrixAt(i * 2 + sg, M); }
      if (nums[n]) { nums[n].position.set(P.x, P.y + 0.06, P.z); nums[n].rotation.z = Math.PI + a - Math.PI / 2; }
    }
    for (const im of [body, top, trim, trim2]) im.instanceMatrix.needsUpdate = true;
  };
  g.topY = topY; g.update(0); return g;
}

// a platform on its own (the bridge of the mirrored tower)
export function loosePlatform(col, w = TW.W, d = TW.D) {
  const g = new THREE.Group(), c = new THREE.Color(col), b = new Batch(), lite = '#' + c.clone().lerp(new THREE.Color('#ffffff'), 0.3).getHexString();
  b.box(paint(col, { roughness: 0.46 }), w, 1.6, d, 0, -0.85, 0, { r: 0.26 }); b.box(paint(lite, { roughness: 0.3 }), w - 0.56, 0.18, d - 0.56, 0, -0.09, 0, { r: 0.05 }); b.done(g);
  const em = new THREE.MeshBasicMaterial({ color: c.multiplyScalar(1.2) }); for (const [x, z, ww, dd] of [[0, d / 2, w, 0.15], [0, -d / 2, w, 0.15], [w / 2, 0, 0.15, d], [-w / 2, 0, 0.15, d]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.14, dd), em); m.position.set(x, -0.24, z); m.userData.noAO = true; g.add(m); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g;
}

// ---- the wall on the roof: the white door on the near side (+z), the chalk on the far side ----
export const DOOR = { W: 5.2, H: 9.6, SW: 40, SH: 34, Z: 0.6 };
export function doorWall() {
  const g = new THREE.Group(), b = new Batch(), { W, H, SW, SH, Z } = DOOR, front = paint('#858b78', { roughness: 0.9 }), trim = paint('#f2f0e8', { roughness: 0.35 });
  b.box(front, (SW - W) / 2, SH, Z * 2, -(SW + W) / 4, SH / 2, 0, { r: 0.05 }); b.box(front, (SW - W) / 2, SH, Z * 2, (SW + W) / 4, SH / 2, 0, { r: 0.05 }); b.box(front, W, SH - H, Z * 2, 0, (SH + H) / 2, 0, { r: 0.05 });
  // the frame, both sides
  for (const s of [1, -1]) { b.box(trim, 0.42, H + 0.4, 0.34, s * (W / 2 + 0.2), H / 2 + 0.2, Z + 0.12, { r: 0.03 }); b.box(trim, 0.42, H + 0.4, 0.34, s * (W / 2 + 0.2), H / 2 + 0.2, -Z - 0.12, { r: 0.03 }); }
  b.box(trim, W + 0.84, 0.42, 0.34, 0, H + 0.21, Z + 0.12, { r: 0.03 }); b.box(trim, W + 0.84, 0.42, 0.34, 0, H + 0.21, -Z - 0.12, { r: 0.03 });
  b.done(g);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const hinge = new THREE.Group(); hinge.position.set(-W / 2, 0, 0); g.add(hinge);
  const leaf = doorLeaf({ w: W, h: H - 0.03, d: 0.3, color: '#f6f4ee', trim: '#ffffff', rows: 2, brass: '#a8a8ae' }); hinge.add(leaf); leaf.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.hinge = hinge; g.handle = leaf.handle;
  // the far side: a slate face (with a hole for the door), the chalk on a canvas with the doorway left clear
  const fs = new THREE.Shape(); fs.moveTo(-SW / 2, 0); fs.lineTo(-W / 2, 0); fs.lineTo(-W / 2, H); fs.lineTo(W / 2, H); fs.lineTo(W / 2, 0); fs.lineTo(SW / 2, 0); fs.lineTo(SW / 2, SH); fs.lineTo(-SW / 2, SH); fs.closePath();
  const fm = new THREE.Mesh(new THREE.ShapeGeometry(fs), paint('#2f3337', { roughness: 0.95 })); fm.position.z = -Z - 0.015; fm.rotation.y = Math.PI; fm.receiveShadow = true; g.add(fm);
  const cv = document.createElement('canvas'); cv.width = 3200; cv.height = 2720; const x = cv.getContext('2d'), sx = 3200 / SW, sy = 2720 / SH, r = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s % 100000) / 100000; }; })();
  x.clearRect(0, 0, 3200, 2720); x.lineCap = 'round'; x.strokeStyle = 'rgba(238,236,224,0.92)';
  const px = (a) => (a + SW / 2) * sx, py = (a) => (SH - a) * sy;
  const stroke = (a, b, c, d, w) => { x.lineWidth = w; x.beginPath(); x.moveTo(a, b); const n = 5; for (let i = 1; i <= n; i++) x.lineTo(lerp(a, c, i / n) + (r() - 0.5) * 3.4, lerp(b, d, i / n) + (r() - 0.5) * 3.4); x.stroke(); };
  let count = 0; const fiveAt = (ax, ay, sc) => { const h = 62 * sc, st = 16 * sc; for (let i = 0; i < 4; i++) { const jx = (r() - 0.5) * 6, jy = (r() - 0.5) * 6; stroke(ax + i * st + jx, ay + jy, ax + i * st + (r() - 0.5) * 8, ay + h + (r() - 0.5) * 6, 5.5 * sc); } stroke(ax - 8 * sc, ay + h * 0.82, ax + 3 * st + 10 * sc, ay + h * 0.15, 5.5 * sc); count += 5; };
  const clear = (ax, ay) => ax > px(-4.6) && ax < px(4.6) && ay > py(16.6);    // the door and the message stay clear
  for (let row = 0; row < 6 && count < 415; row++) for (let col = 0; col < 14 && count < 415; col++) { const ax = 92 + col * 224 + (row % 2) * 40 + (r() - 0.5) * 20, ay = 56 + row * 214 + (r() - 0.5) * 16; fiveAt(ax, ay, 2.6); }
  stroke(92 + 13 * 224 + 44, 56 + 5 * 214 + 40, 92 + 13 * 224 + 42, 56 + 5 * 214 + 200, 14);
  x.fillStyle = 'rgba(248,246,236,0.97)'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '900 112px ITTInter, sans-serif'; x.fillText('YOU HAVE REACHED', px(0), py(14.9)); x.fillText('THE TOP 416 TIMES', px(0), py(12.9));
  const ct = new THREE.CanvasTexture(cv); ct.colorSpace = THREE.SRGBColorSpace; ct.anisotropy = 8;
  const cm = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); cm.position.set(0, SH / 2, -Z - 0.05); cm.rotation.y = Math.PI; cm.userData.noAO = true; g.add(cm);
  g.count = count; return g;
}

// the small ledge past the door: fifteen tiles that fall away; .set(t, t0)
export function ledge() {
  const g = new THREE.Group(), tiles = [], mat = paint('#a9a690', { roughness: 0.7 }), geo = new RoundedBoxGeometry(3.3, 1.3, 3.3, 2, 0.1), edge = new THREE.MeshBasicMaterial({ color: '#d7e8b4' });
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const m = new THREE.Mesh(geo, mat); m.position.set((i - 2) * 3.34, -0.65, -2.5 - j * 3.34); m.castShadow = m.receiveShadow = true; const e = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.06, 0.08), edge); e.position.set(0, 0.62, 1.64); m.add(e); e.userData.noAO = true; g.add(m); tiles.push({ m, i, j, d: Math.hypot(i - 2, j - 1) }); }
  g.set = (t, t0) => { for (const a of tiles) { const f = t0 + (2.3 - a.d) * 0.16, u = Math.max(0, t - f); a.m.position.y = -0.65 - 34 * u * u - 2 * u; a.m.rotation.set(u * (a.i - 2) * 0.8, 0, u * (a.j - 1) * 0.9); a.m.visible = u < 3.5; } };
  g.set(0, 1e9); return g;
}

// countless identical towers: a lattice of columns and helixes; .update(y) keeps it round a falling camera (the pattern repeats every 46 studs)
export const FIELD = { SP: 200, PER: 46 };
export function towerField(rows = 7) {
  const g = new THREE.Group(), { SP, PER } = FIELD, step = 9.2, nv = 150, nt = (2 * rows + 1) ** 2;
  const cols = new THREE.InstancedMesh(new THREE.CylinderGeometry(18, 18, 2800, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#6f7763', roughness: 0.9 }), nt);
  const plat = new THREE.InstancedMesh(new THREE.BoxGeometry(11, 1.6, 9), new THREE.MeshBasicMaterial({ color: '#ffffff' }), nt * nv), tube = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 12, 0.5), new THREE.MeshBasicMaterial({ color: '#dceaba' }), nt * 60);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = v3(1, 1, 1), T = v3(), c = new THREE.Color(); let k = 0, q = 0, ti = 0;
  for (let i = -rows; i <= rows; i++) for (let j = -rows; j <= rows; j++) {
    const X = (i + 0.5) * SP, Z = (j + 0.5) * SP, off = ((i * 17 + j * 31) % 5 + 5) % 5 * 9.2, rot = (i * 2.1 + j * 1.3) % 6.28;
    cols.setMatrixAt(q++, M.makeTranslation(X, 0, Z));
    for (let v = 0; v < nv; v++) { const n = v * 2, a = rot + n * (Math.PI * 2 / 10), y = (v - nv / 2) * step + off; E.set(0, Math.PI / 2 - a, 0); Q.setFromEuler(E); M.compose(T.set(X + Math.cos(a) * 24.6, y, Z + Math.sin(a) * 24.6), Q, S); plat.setMatrixAt(k, M); plat.setColorAt(k, c.set(CANDY[v % 8]).multiplyScalar(0.92)); k++; }
    for (let v = 0; v < 60; v++) { const a = rot + (v % 8) * Math.PI / 4 + 0.3, y = (v - 30) * 23; M.makeTranslation(X + Math.cos(a) * 18.3, y, Z + Math.sin(a) * 18.3); tube.setMatrixAt(ti++, M); }
  }
  plat.userData.noAO = tube.userData.noAO = true; g.add(cols, plat, tube);
  g.update = (y) => { g.position.y = y - (((y % PER) + PER) % PER); }; return g;
}

export function chalkStick() { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.8, 8), paint('#f4f2e8', { roughness: 0.95 })); m.castShadow = true; return m; }
// a kneeling painter's kit: a bucket and a long-handled roller (handle along +z, the roller at its tip); wet paint is a plane that grows
export function paintKit() {
  const g = new THREE.Group(), b = new Batch(); b.cyl(paint('#b7bbb0', { roughness: 0.6, metalness: 0.2 }), 0.72, 0.6, 1.2, 0, 0.6, 0, { seg: 18 }); b.cyl(paint('#55b3c4', { roughness: 0.3 }), 0.66, 0.66, 0.05, 0, 1.17, 0, { seg: 18 }); b.done(g);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.03, 6, 22, Math.PI), paint('#555b58')); handle.position.y = 1.2; g.add(handle); g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const roller = new THREE.Group(), r = new Batch(); r.box(paint('#8a8d86', { metalness: 0.5, roughness: 0.4 }), 0.1, 0.1, 2.4, 0, 0, 1.2, { r: 0.02 }); r.box(paint('#2d3032', { roughness: 0.8 }), 0.17, 0.17, 0.8, 0, 0, 0.2, { r: 0.04 }); r.cyl(paint('#55b3c4', { roughness: 0.5 }), 0.22, 0.22, 1.5, 0, 0, 2.5, { seg: 14, rz: Math.PI / 2 }); r.done(roller); roller.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.roller = roller; return g;
}

// real knees and elbows on a captured avatar: each limb's lower meshes move onto a second pivot (Episode 39's method)
export function jointify(c) {
  const J = {}; c.knee = []; c.elbow = [];
  const cut = (grp, frac) => {
    const ms = grp.children.filter((m) => m.isMesh); ms.forEach((m) => m.geometry.computeBoundingBox());
    const tall = new THREE.Box3(); ms.forEach((m) => tall.union(m.geometry.boundingBox));
    const y0 = tall.max.y, y1 = tall.min.y, py = lerp(y0, y1, frac), pz = (tall.min.z + tall.max.z) / 2, px = (tall.min.x + tall.max.x) / 2;
    const up = ms.filter((m) => { const b = m.geometry.boundingBox; return (b.min.y + b.max.y) / 2 > py; }), lo = ms.filter((m) => !up.includes(m));
    let pv = py; if (up.length && lo.length) { const a = Math.min(...up.map((m) => m.geometry.boundingBox.min.y)), b = Math.max(...lo.map((m) => m.geometry.boundingBox.max.y)); pv = (a + b) / 2; }
    const j = new THREE.Group(); j.position.set(px, pv, pz); grp.add(j); lo.forEach((m) => { grp.remove(m); j.add(m); m.position.set(-px, -pv, -pz); });
    return { j, a: -pv, b: pv - y1 };
  };
  c.legs.forEach((l, i) => { const r = cut(l, 0.48); c.knee[i] = r.j; J.thigh = r.a; J.shin = r.b; });
  c.arms.forEach((a, i) => { const r = cut(a, 0.46); c.elbow[i] = r.j; J.ua = r.a; J.fa = r.b; });
  c.J = J; return c;
}
