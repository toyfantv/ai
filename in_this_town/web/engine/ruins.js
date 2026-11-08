// Storm island kit (Episode 32): a ruined island under a storm, a sea that can split apart, rain and lightning that can be
// frozen (they take the world time, not the frame time), broken columns, arches, a clock tower and a dock clock that can stop,
// a brick wall that bursts when a body goes through it, a crater, a glowing crack in the air, and a cavern for the sword field.
// Everything is seeded and every moving part takes a time, so a frame depends only on t.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { v3, rng, clamp, lerp, smooth } from './core.js';
import { Batch, surf, paint } from './kit.js';
import { canvasTex } from './props.js';

const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vn(x, y) {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(hash2(i, j), hash2(i + 1, j), a), lerp(hash2(i, j + 1), hash2(i + 1, j + 1), a), b);
}
const fbm = (x, y) => vn(x, y) * 0.55 + vn(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + vn(x * 4.3 + 1, y * 4.3 + 9) * 0.15;
const col = (h) => new THREE.Color(h);
export const STONE = '#77746e';

// ---- the island: a flat plateau (y = top) for the ruins, a rocky edge that drops into the sea and on down ----
export function stormIsland(o = {}) {
  const R = o.R ?? 64, top = o.top ?? 4, cx = o.cx ?? 0, cz = o.cz ?? -6, r = rng(o.seed ?? 7), p1 = r() * 6, p2 = r() * 6;
  const outline = (a) => R * (1 + 0.08 * Math.sin(3 * a + p1) + 0.05 * Math.sin(5 * a + p2) + 0.02 * Math.sin(13 * a));
  const flatR = o.flat ?? 0.7;
  const heightU = (u, x, z) => {
    if (u <= flatR) return top;                                                   // the plateau: exactly flat (feet, props)
    if (u >= 1.25) return -60;
    const n = (fbm(x * 0.08, z * 0.08) - 0.5) * 2.2;
    if (u < 1) return lerp(top, -1.5, smooth(flatR, 1, u)) + n * smooth(flatR, flatR + 0.08, u);
    return lerp(-1.5, -60, (u - 1) / 0.25) + n * 2;
  };
  const heightAt = (x, z) => { const dx = x - cx, dz = z - cz, a = Math.atan2(dz, dx); return heightU(Math.hypot(dx, dz) / outline(a), x, z); };
  const segs = 128, us = []; for (let i = 0; i <= 40; i++) us.push(1.25 * Math.pow(i / 40, 0.7));
  const pos = [], cl = [], uv = [], idx = [], c = new THREE.Color();
  const cTop = col('#3d3f3a'), cMoss = col('#2e3a28'), cRock = col('#4a4846'), cWet = col('#26292c'), cDeep = col('#1c1d20');
  for (let i = 0; i < us.length; i++) for (let j = 0; j <= segs; j++) {
    const a = (j % segs) / segs * Math.PI * 2, R0 = outline(a), u = us[i], x = cx + Math.cos(a) * u * R0, z = cz + Math.sin(a) * u * R0, y = heightU(u, x, z);
    if (u <= flatR) c.copy(cTop).lerp(cMoss, smooth(0.45, 0.75, fbm(x * 0.05, z * 0.05)));
    else if (y > 0.4) c.copy(cRock).lerp(cMoss, fbm(x * 0.1, z * 0.1) * 0.6);
    else c.copy(cWet).lerp(cDeep, clamp(-y / 30));
    pos.push(x, y, z); cl.push(c.r, c.g, c.b); uv.push(x / 14, z / 14);
    if (i < us.length - 1 && j < segs) { const w = segs + 1, A = i * w + j, B = A + 1, C = A + w, D = C + 1; idx.push(A, B, C, B, D, C); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = surf('sand', '#ffffff', { roughness: 0.95 }).clone(); m.vertexColors = true; m.color.set('#ffffff');
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true;
  const group = new THREE.Group(); group.add(mesh);
  return { group, heightAt, outline, R, top, cx, cz };
}

// a paved courtyard (cracked flagstones) laid on the plateau
export function courtyard(o = {}) {
  const S = o.size ?? 44, tex = canvasTex(1024, 1024, (x, w, h) => {
    const r = rng(9); x.fillStyle = '#2a2a2a'; x.fillRect(0, 0, w, h);
    const n = 8, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const k = 0.78 + r() * 0.3, g = Math.floor(118 * k); x.fillStyle = `rgb(${g + 4},${g},${g - 6})`;
      const o2 = (j % 2) * s / 2; x.fillRect(i * s + o2 + 5, j * s + 5, s - 10, s - 10);
      for (let q = 0; q < 50; q++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`; x.fillRect(i * s + o2 + r() * s, j * s + r() * s, 6 + r() * 20, 3 + r() * 10); }
      if (r() < 0.45) { x.strokeStyle = 'rgba(20,20,20,0.8)'; x.lineWidth = 3; x.beginPath(); let px = i * s + o2 + r() * s, py = j * s + r() * s; x.moveTo(px, py); for (let q = 0; q < 5; q++) { px += (r() - 0.5) * 40; py += (r() - 0.5) * 40; x.lineTo(px, py); } x.stroke(); }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(S / 22, S / 22); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  // the edge breaks up into moss: an alpha map from the centre
  const am = canvasTex(512, 512, (x, w, h) => { const r = rng(4); x.fillStyle = '#000'; x.fillRect(0, 0, w, h); const gr = x.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.5); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) { x.fillStyle = r() < 0.5 ? '#000' : '#fff'; const a = r() * 6.28, d = w * (0.3 + r() * 0.2); x.fillRect(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, 30 + r() * 40, 30 + r() * 40); } });
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaMap: am, alphaTest: 0.5, roughness: 0.6, metalness: 0.05, color: '#cfcfd2' });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(S, S), m); p.rotation.x = -Math.PI / 2; p.receiveShadow = true; p.position.y = 0.025;
  return p;
}

// ---- ruins ----
const stoneM = () => surf('concrete', '#8a867e', { roughness: 0.88 });
const darkStone = () => surf('concrete', '#5f5c57', { roughness: 0.9 });
// a column of stacked drums, broken at height h (a jagged top), optionally fallen (lying along x)
export function column(b, x, y, z, h, o = {}) {
  const sm = o.dark ? darkStone() : stoneM(), r = o.r ?? 0.72, seed = o.seed ?? 1;
  if (o.fallen) {   // lying drums, a little apart
    const n = Math.round(h / 1.45); for (let i = 0; i < n; i++) { const a = o.ry || 0, d = i * 1.55; b.cyl(sm, r, r, 1.42, x + Math.cos(a) * d, y + r, z - Math.sin(a) * d, { rz: Math.PI / 2, ry: a, seg: 18 }); }
    return b;
  }
  b.box(sm, r * 2.7, 0.42, r * 2.7, x, y + 0.21, z, { r: 0.06 }); b.box(sm, r * 2.3, 0.32, r * 2.3, x, y + 0.58, z, { r: 0.07 });
  let yy = y + 0.74; const dh = 1.42;
  while (yy + dh < y + h) { b.cyl(sm, r * 0.97, r, dh - 0.05, x, yy + dh / 2, z, { seg: 18, ry: hash2(yy, seed) }); yy += dh; }
  // the broken top drum: shorter, tilted
  const last = Math.max(0.6, y + h - yy); b.cyl(sm, r * 0.92, r * 0.97, last, x + 0.06, yy + last / 2, z, { seg: 18, rx: (hash2(seed, 3) - 0.5) * 0.2, rz: (hash2(seed, 5) - 0.5) * 0.2 });
  if (o.capital) { b.box(sm, r * 2.6, 0.5, r * 2.6, x, y + h + 0.25, z, { r: 0.08 }); }
  return b;
}
export function arch(b, x, y, z, o = {}) {
  const sm = stoneM(), w = o.w ?? 5.6, h = o.h ?? 6.4, ry = o.ry ?? 0, c = Math.cos(ry), s = Math.sin(ry);
  for (const sd of [-1, 1]) { const px = x + c * sd * w / 2, pz = z - s * sd * w / 2; b.box(sm, 1.25, h, 1.25, px, y + h / 2, pz, { ry, r: 0.06 }); b.box(sm, 1.6, 0.42, 1.6, px, y + h, pz, { ry, r: 0.06 }); }
  if (!o.broken) { const g = new THREE.TorusGeometry(w / 2, 0.6, 8, 20, Math.PI); g.scale(1, 0.75, 1.6); b.add(sm, g, x, y + h + 0.2, z, ry); }
  else { const g = new THREE.TorusGeometry(w / 2, 0.6, 8, 10, Math.PI * 0.42); g.scale(1, 0.75, 1.6); b.add(sm, g, x, y + h + 0.2, z, ry); }
  return b;
}
export function lowWall(b, x, y, z, len, o = {}) {
  const sm = darkStone(), ry = o.ry ?? 0, c = Math.cos(ry), s = Math.sin(ry), seed = o.seed ?? 2;
  for (let i = 0; i < len; i += 1.05) { const hh = 0.5 + 1.8 * fbm(i * 0.4 + seed, seed) ** 1.5; for (let k = 0; k < hh; k += 0.5) b.box(sm, 1.0, 0.47, 0.8, x + c * i, y + k + 0.24, z - s * i, { ry: ry + (hash2(i, k) - 0.5) * 0.08, r: 0.07 }); }
  return b;
}
export function rubble(scene, list, o = {}) {
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.75 + hash2(i, 3) * 0.4; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); }
  g.computeVertexNormals();
  const m = new THREE.InstancedMesh(g, darkStone(), list.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach(([x, y, z, s], i) => { M.compose(v3(x, y + s * 0.3, z), q.setFromEuler(e.set(hash2(i, 1) * 3, hash2(i, 2) * 6, hash2(i, 4) * 3)), v3(s, s, s)); m.setMatrixAt(i, M); });
  m.castShadow = m.receiveShadow = true; (o.parent || scene).add(m); return m;
}

// ---- clocks ----
function clockFace(o = {}) {
  return canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = o.bg || '#d9cfb4'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill();
    x.strokeStyle = '#2a2018'; x.lineWidth = 12; x.beginPath(); x.arc(256, 256, 240, 0, 7); x.stroke();
    x.fillStyle = '#2a2018'; x.font = '700 54px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    R.forEach((t, i) => { const a = i / 12 * Math.PI * 2; x.save(); x.translate(256 + Math.sin(a) * 186, 256 - Math.cos(a) * 186); x.rotate(a); x.fillText(t, 0, 0); x.restore(); });
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; x.lineWidth = i % 5 ? 3 : 7; x.beginPath(); x.moveTo(256 + Math.sin(a) * 222, 256 - Math.cos(a) * 222); x.lineTo(256 + Math.sin(a) * 236, 256 - Math.cos(a) * 236); x.stroke(); }
    // age: stains
    const r = rng(3); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(60,40,20,${0.03 + r() * 0.06})`; x.beginPath(); x.arc(r() * w, r() * h, 10 + r() * 50, 0, 7); x.fill(); }
  });
}
function hands(radius, color = '#141210') {
  const hm = paint(color, { metalness: 0.6, roughness: 0.4 }), g = new THREE.Group();
  const mk = (len, wd, z) => { const p = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.06), hm); m.position.y = len / 2 - len * 0.15; p.add(m); p.position.z = z; g.add(p); m.castShadow = true; return p; };
  const hr = mk(radius * 0.52, radius * 0.09, 0.05), mn = mk(radius * 0.8, radius * 0.06, 0.1), sc = mk(radius * 0.86, radius * 0.022, 0.15);
  sc.children[0].material = paint('#8a1a14', { metalness: 0.4, roughness: 0.5 });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.06, radius * 0.06, 0.2, 12), hm); hub.rotation.x = Math.PI / 2; hub.position.z = 0.12; g.add(hub);
  g.set = (sec) => { sc.rotation.z = -Math.floor(sec) / 60 * Math.PI * 2 - smooth(0, 0.12, sec % 1) / 60 * Math.PI * 2; mn.rotation.z = -sec / 3600 * Math.PI * 2; hr.rotation.z = -sec / 43200 * Math.PI * 2; };
  return g;
}
// a square stone clock tower, ruined at the top; .set(seconds on the clock) moves the hands (a ticking second hand)
export function clockTower(o = {}) {
  const g = new THREE.Group(), b = new Batch(), sm = stoneM(), dm = darkStone(), H = o.h ?? 21, W = o.w ?? 4.8;
  b.box(dm, W + 1.4, 1.2, W + 1.4, 0, 0.6, 0, { r: 0.1 });
  for (let y = 1.2; y < H; y += 0.8) { const k = Math.round(y / 0.8); b.box(k % 2 ? sm : dm, W, 0.8, W, 0, y + 0.4, 0, { r: 0.05, ry: (hash2(k, 1) - 0.5) * 0.02 }); }
  for (const s of [-1, 1]) for (const t of [-1, 1]) b.box(sm, 0.8, H, 0.8, s * W / 2, H / 2, t * W / 2, { r: 0.06 });
  b.box(sm, W + 0.8, 0.6, W + 0.8, 0, H - 3.4, 0, { r: 0.06 }); b.box(sm, W + 0.6, 0.6, W + 0.6, 0, H + 0.2, 0, { r: 0.06 });
  // the belfry: open arches, a broken roof (two rafters left)
  for (const s of [-1, 1]) for (const t of [-1, 1]) b.box(sm, 0.9, 4, 0.9, s * (W / 2 - 0.25), H + 2.4, t * (W / 2 - 0.25), { r: 0.06 });
  b.box(dm, W + 0.4, 0.5, 0.8, 0, H + 4.6, W / 2 - 0.25, { r: 0.05 }); b.box(dm, 0.6, 0.5, W, -W / 2 + 0.5, H + 4.7, 0, { r: 0.05, rx: 0.2 });
  b.done(g);
  const R = W * 0.38, fm = new THREE.MeshStandardMaterial({ map: clockFace(), roughness: 0.7, emissive: '#ffe6b0', emissiveIntensity: 0.06 });
  const face = new THREE.Mesh(new THREE.CircleGeometry(R, 48), fm); face.position.set(0, H - 6.2, W / 2 + 0.06); g.add(face);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.12, 0.2, 8, 48), paint('#2a2622', { metalness: 0.7, roughness: 0.4 })); ring.position.copy(face.position); g.add(ring);
  const hd = hands(R); hd.position.copy(face.position); g.add(hd);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.face = face; g.facePos = face.position.clone(); g.set = hd.set; g.R = R;
  return g;
}
// a post clock (on the dock)
export function postClock() {
  const g = new THREE.Group(), b = new Batch(), iron = paint('#1c1e22', { metalness: 0.7, roughness: 0.45 });
  b.cyl(iron, 0.14, 0.2, 6.4, 0, 3.2, 0); b.cyl(iron, 0.34, 0.42, 0.36, 0, 0.18, 0); b.box(iron, 1.9, 1.9, 0.6, 0, 6.9, 0, { r: 0.22 }); b.done(g);
  const fm = new THREE.MeshStandardMaterial({ map: clockFace({ bg: '#e6dcc0' }), roughness: 0.6, emissive: '#ffe0a0', emissiveIntensity: 0.12 });
  const R = 0.78; for (const s of [1, -1]) { const f = new THREE.Mesh(new THREE.CircleGeometry(R, 32), fm); f.position.set(0, 6.9, s * 0.31); if (s < 0) f.rotation.y = Math.PI; g.add(f); }
  const hd = hands(R); hd.position.set(0, 6.9, 0.31); g.add(hd);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  g.set = hd.set; g.facePos = v3(0, 6.9, 0.31); return g;
}

// ---- the brick wall that a body goes through ----
// along x (x0..x1) at z, from y0 up to a ruined top; .set(t, tHit, hitPoint, dir) bursts the bricks near hitPoint outward along dir
export function brickWall(o = {}) {
  const x0 = o.x0 ?? -7, x1 = o.x1 ?? 7, z = o.z ?? -6, y0 = o.y0 ?? 4, H = o.h ?? 4.7, bw = 0.95, bh = 0.4, bd = o.d ?? 0.72, r = rng(o.seed ?? 12);
  const list = [];
  for (let row = 0; row * bh < H; row++) {
    const off = (row % 2) * bw / 2;
    for (let x = x0 - off; x < x1; x += bw) {
      const cx = x + bw / 2; if (cx < x0 + 0.3 || cx > x1 - 0.3) continue;
      const top = H - 1.4 * fbm(cx * 0.35 + 3, 1) - (Math.abs(cx - (x0 + x1) / 2) > (x1 - x0) * 0.42 ? 1.0 : 0);
      if (row * bh > top) continue;
      list.push({ p: v3(cx + (r() - 0.5) * 0.04, y0 + row * bh + bh / 2, z + (r() - 0.5) * 0.06), k: 0.75 + r() * 0.3, v: v3(r() - 0.5, r(), r() - 0.5), spin: v3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(8), rr: r() });
    }
  }
  const geo = new THREE.BoxGeometry(bw - 0.06, bh - 0.05, bd);
  const mat = surf('brick', '#9b9288', { roughness: 0.9 }).clone(); mat.map = null; mat.normalMap = null; mat.roughnessMap = null;
  mat.color.set('#ffffff');
  const im = new THREE.InstancedMesh(geo, mat, list.length), c = new THREE.Color();
  list.forEach((L, i) => im.setColorAt(i, c.set('#8a8278').multiplyScalar(L.k)));
  im.castShadow = im.receiveShadow = true;
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = v3(1, 1, 1), p = v3();
  im.set = (t, tHit = 1e9, hit = v3(0, y0 + 3, z), dir = v3(0, 0, -1), radius = 1.9, floorY = y0) => {
    const dt = t - tHit;
    list.forEach((L, i) => {
      const d = Math.hypot(L.p.x - hit.x, (L.p.y - hit.y) * 0.8), R2 = radius * (0.8 + 0.4 * L.rr);
      if (dt <= 0 || d > R2) {
        // bricks at the edge of the hole lean a little after the hit
        const lean = dt > 0 && d < R2 * 1.35 ? (1 - (d - R2) / (R2 * 0.35)) * 0.12 : 0;
        q.setFromEuler(e.set(lean * dir.z * -1, 0, lean * (L.p.x - hit.x) * 0.1)); M.compose(L.p, q, one); im.setMatrixAt(i, M); return;
      }
      const pw = (1 - d / R2) * 0.7 + 0.3, sp = 7 + 6 * pw;
      const vx = dir.x * sp + L.v.x * 3 + (L.p.x - hit.x) * 1.4, vy = 2 + L.v.y * 3.5, vz = dir.z * sp + L.v.z * 2.5;
      // ballistic until the floor, then sliding to a stop
      const g = 30, tl = (vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, L.p.y - floorY - 0.2))) / g, tt = Math.min(dt, tl), slide = Math.max(0, dt - tl);
      const sk = 1 - Math.exp(-slide * 4);
      p.set(L.p.x + vx * tt + vx * 0.2 * sk, Math.max(floorY + 0.2, L.p.y + vy * tt - 0.5 * g * tt * tt), L.p.z + vz * tt + vz * 0.2 * sk);
      const sa = Math.min(dt, tl + 0.25);
      q.setFromEuler(e.set(L.spin.x * sa, L.spin.y * sa, L.spin.z * sa)); M.compose(p, q, one); im.setMatrixAt(i, M);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  im.set(0); im.frustumCulled = false;
  return im;
}

// ---- the crater: a cracked dark disc that spreads, chunks thrown up; .set(t, tHit) ----
export function crater(o = {}) {
  const g = new THREE.Group(), r = rng(o.seed ?? 21), R = o.r ?? 2.3;
  const tex = canvasTex(512, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h); const gr = x.createRadialGradient(256, 256, 10, 256, 256, 200); gr.addColorStop(0, 'rgba(8,8,8,0.95)'); gr.addColorStop(0.55, 'rgba(20,18,16,0.85)'); gr.addColorStop(1, 'rgba(20,18,16,0)');
    x.fillStyle = gr; x.beginPath(); x.arc(256, 256, 210, 0, 7); x.fill();
    x.strokeStyle = 'rgba(5,5,5,0.95)'; x.lineCap = 'round';
    for (let i = 0; i < 16; i++) { let a = i / 16 * 6.28 + r() * 0.3, d = 60, px = 256 + Math.cos(a) * d, py = 256 + Math.sin(a) * d; x.lineWidth = 7; x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 7; k++) { a += (r() - 0.5) * 0.6; d += 20 + r() * 12; px = 256 + Math.cos(a) * d; py = 256 + Math.sin(a) * d; x.lineWidth = Math.max(1.5, 7 - k); x.lineTo(px, py); } x.stroke(); }
  });
  const dm = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(R * 3.2, R * 3.2), dm); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.06; disc.receiveShadow = true; g.add(disc);
  // a raised broken rim (flagstones tipped up)
  const rim = [], rg = new THREE.BoxGeometry(0.9, 0.2, 0.7);
  const rimM = new THREE.InstancedMesh(rg, darkStone(), 14); rimM.castShadow = rimM.receiveShadow = true; g.add(rimM);
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28 + r() * 0.2; rim.push({ a, d: R * (0.85 + r() * 0.25), tilt: 0.35 + r() * 0.5 }); }
  const N = 46, chunks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.32, 0), darkStone(), N), C = [];
  for (let i = 0; i < N; i++) { const a = r() * 6.28; C.push({ a, sp: 3 + r() * 6, vy: 5 + r() * 8, s: 0.4 + r() * 0.9, spin: r() * 12 }); }
  chunks.castShadow = true; chunks.frustumCulled = false; g.add(chunks);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  g.set = (t, tHit = 1e9) => {
    const dt = t - tHit, k = clamp(dt / 0.12);
    disc.visible = dt > 0; disc.scale.setScalar(Math.max(0.01, 0.4 + 0.6 * k));
    rim.forEach((R2, i) => { const kk = dt > 0 ? 1 : 0; M.compose(v3(Math.cos(R2.a) * R2.d, 0.1 + 0.25 * kk, Math.sin(R2.a) * R2.d), q.setFromEuler(e.set(Math.sin(R2.a) * R2.tilt * kk, -R2.a, -Math.cos(R2.a) * R2.tilt * kk)), v3(1, 1, 1).multiplyScalar(kk ? 1 : 0.001)); rimM.setMatrixAt(i, M); });
    rimM.instanceMatrix.needsUpdate = true;
    C.forEach((c, i) => {
      if (dt <= 0) { M.makeScale(0.001, 0.001, 0.001); chunks.setMatrixAt(i, M); return; }
      const g2 = 26, tl = 2 * c.vy / g2, tt = Math.min(dt, tl), x = Math.cos(c.a) * (0.6 + c.sp * tt), z = Math.sin(c.a) * (0.6 + c.sp * tt), y = Math.max(0.15, c.vy * tt - 0.5 * g2 * tt * tt);
      M.compose(v3(x, y, z), q.setFromEuler(e.set(c.spin * tt, c.spin * 0.7 * tt, 0)), v3(c.s, c.s, c.s)); chunks.setMatrixAt(i, M);
    });
    chunks.instanceMatrix.needsUpdate = true;
  };
  g.set(0); return g;
}

// ---- the storm sea, which can split apart along x = cx from z0 out to the horizon ----
// u: uT (world time), uSplit 0..1, uFlash (lightning), uFreeze (a cold tint)
export function stormSea(scene, o = {}) {
  const cx = o.cx ?? 0, NX = 300, NZ = 440, X = 1600, Z0 = -1000, Z1 = 1800;
  const pos = [], idx = [];
  for (let j = 0; j <= NZ; j++) { const z = Z0 + (Z1 - Z0) * j / NZ; for (let i = 0; i <= NX; i++) { const s = -1 + 2 * i / NX; pos.push(cx + X * Math.sign(s) * Math.pow(Math.abs(s), 2.2), 0, z); } }
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const A = j * (NX + 1) + i, B = A + 1, C = A + NX + 1, D = C + 1; idx.push(A, C, B, B, C, D); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const u = { uT: { value: 0 }, uSplit: { value: 0 }, uCX: { value: cx }, uZ0: { value: o.z0 ?? 58 }, uHW: { value: o.hw ?? 26 }, uDepth: { value: 70 }, uWall: { value: 13 },
    uFlash: { value: 0 }, uTop: { value: col('#1a2028') }, uHor: { value: col('#3a4450') }, uDeep: { value: col('#071216') }, uMid: { value: col('#14303a') }, uFoam: { value: col('#b9c4c8') },
    uFogC: { value: col('#2a3038') }, uFog: { value: new THREE.Vector2(120, 900) }, uDim: { value: 1 } };
  const m = new THREE.ShaderMaterial({ uniforms: u, fog: false, side: THREE.DoubleSide,
    vertexShader: `uniform float uT, uSplit, uCX, uZ0, uHW, uDepth, uWall; varying vec3 vP; varying float vWall, vIn;
      float wav(vec2 p, float t){ float h = sin(dot(p, vec2(0.055, 0.032)) + t * 1.25) * 1.15 + sin(dot(p, vec2(-0.04, 0.066)) + t * 1.6 + 1.0) * 0.75
        + sin(dot(p, vec2(0.11, -0.05)) + t * 2.2 + 2.0) * 0.38 + sin(dot(p, vec2(0.02, 0.15)) + t * 2.8 + 4.0) * 0.26 + sin(dot(p, vec2(0.21, 0.17)) + t * 3.7) * 0.12; return h; }
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vec2 p = w.xz;
        float h = wav(p, uT);
        float zk = smoothstep(uZ0, uZ0 + 14.0, p.y) * smoothstep(0.0, 0.35, uSplit);
        float dx = abs(p.x - uCX), hw = uHW * smoothstep(0.0, 1.0, uSplit) + 0.01;
        float inside = (1.0 - smoothstep(hw - 7.0, hw + 0.5, dx)) * step(0.001, zk);
        float wall = exp(-pow((dx - hw - 2.5) / 6.5, 2.0)) * zk;
        float churn = sin(p.y * 0.13 + uT * 3.1) * 1.4 + sin(p.y * 0.31 - uT * 4.3) * 0.6;
        h = mix(h, -uDepth, inside * zk) + wall * (uWall + churn);
        w.y = h; vP = w.xyz; vWall = wall; vIn = inside * zk;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `precision highp float; varying vec3 vP; varying float vWall, vIn;
      uniform float uT, uFlash, uDim; uniform vec3 uTop, uHor, uDeep, uMid, uFoam, uFogC; uniform vec2 uFog;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec3 n = normalize(cross(dFdx(vP), dFdy(vP))); if (n.y < 0.0) n = -n;
        float dist = length(cameraPosition - vP);
        vec2 q = vP.xz; float t = uT;
        float e = 0.6; float dn = mix(1.0, 0.2, smoothstep(60.0, 600.0, dist));
        float a0 = vn(q * 0.45 + vec2(t * 0.6, t * 0.3)) + 0.5 * vn(q * 1.3 - vec2(t, -t * 0.7));
        float ax = vn((q + vec2(e, 0.0)) * 0.45 + vec2(t * 0.6, t * 0.3)) + 0.5 * vn((q + vec2(e, 0.0)) * 1.3 - vec2(t, -t * 0.7));
        float az = vn((q + vec2(0.0, e)) * 0.45 + vec2(t * 0.6, t * 0.3)) + 0.5 * vn((q + vec2(0.0, e)) * 1.3 - vec2(t, -t * 0.7));
        n = normalize(n + vec3(a0 - ax, 0.0, a0 - az) * 1.4 * dn);
        vec3 V = normalize(cameraPosition - vP);
        float steep = 1.0 - n.y;
        vec3 body = mix(uDeep, uMid, clamp(vP.y * 0.12 + 0.5, 0.0, 1.0));
        float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);
        vec3 Rf = reflect(-V, n); vec3 sky = mix(uHor, uTop, pow(clamp(Rf.y, 0.0, 1.0), 0.6));
        vec3 c = mix(body * uDim, sky, 0.06 + 0.6 * fres);
        // whitecaps on the crests, streaks running down the walls of water
        float cap = smoothstep(1.1, 2.1, vP.y + vn(q * 0.2 + t * 0.3) * 1.2) * smoothstep(0.35, 0.7, vn(q * 0.8 + t * 0.5));
        float streak = smoothstep(0.45, 0.85, vn(vec2(q.x * 0.6 + q.y * 0.05, vP.y * 0.12 + t * 2.4))) * smoothstep(0.25, 0.7, steep);
        float crest = smoothstep(0.55, 0.95, vWall) * smoothstep(0.3, 0.8, vn(q * 0.5 + vec2(0.0, t * 1.5)));
        c = mix(c, uFoam * uDim, clamp(cap * 0.6 + streak * 0.32 + crest * 0.55, 0.0, 0.85));
        c += vec3(0.7, 0.75, 0.9) * uFlash * (0.25 + 0.6 * fres);
        float fk = smoothstep(uFog.x, uFog.y, dist); c = mix(c, uFogC, fk);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.receiveShadow = false; mesh.userData.noAO = true; scene.add(mesh);
  // the floor of the split: wet black rock, pools, weed
  const fl = new THREE.PlaneGeometry(140, 1700, 70, 400); fl.rotateX(-Math.PI / 2); fl.translate(cx, 0, 58 + 850);
  const fp = fl.attributes.position, fc = [];
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i), d = Math.abs(x - cx); fp.setY(i, -34 + (fbm(x * 0.06, z * 0.06) - 0.5) * 4 + d * d * 0.004); const k = fbm(x * 0.1 + 3, z * 0.1); const c = col('#1d1f20').lerp(col('#2f3a2c'), k * 0.8); fc.push(c.r, c.g, c.b); }
  fl.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3)); fl.computeVertexNormals();
  const floor = new THREE.Mesh(fl, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.15 })); floor.receiveShadow = true; scene.add(floor);
  mesh.u = u; mesh.floor = floor; mesh.floorY = (x, z) => -34 + (fbm(x * 0.06, z * 0.06) - 0.5) * 4 + (x - cx) * (x - cx) * 0.004;
  mesh.update = (tw, split, flash) => { u.uT.value = tw; u.uSplit.value = split; u.uFlash.value = flash; floor.visible = split > 0.02; };
  return mesh;
}

// ---- rain: streaks in a box around a centre, falling with the world time (frozen time leaves them hanging) ----
export function rain(scene, o = {}) {
  const n = o.count ?? 5200, S = o.size ?? 70, H = o.height ?? 46, r = rng(o.seed ?? 31);
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, 1.0, 0.025), new THREE.MeshBasicMaterial({ color: o.color || '#a9b6c4', transparent: true, opacity: o.opacity ?? 0.3, depthWrite: false, fog: true }), n);
  const items = []; for (let i = 0; i < n; i++) items.push({ x: (r() - 0.5) * S, z: (r() - 0.5) * S, y: r(), v: 0.9 + r() * 0.3 });
  m.frustumCulled = false; m.userData.noAO = true; m.renderOrder = 3; scene.add(m);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.22, 0, 0.12)), s = v3(1, 1, 1), p = v3();
  m.centre = v3(0, 0, 0);
  m.update = (tw) => {
    const c = m.centre;
    items.forEach((a, i) => { const f = ((a.y - tw * a.v * 0.9) % 1 + 1) % 1; p.set(c.x + a.x + (f - 0.5) * -3, c.y + f * H - 4, c.z + a.z + (f - 0.5) * 6); M.compose(p, q, s); m.setMatrixAt(i, M); });
    m.instanceMatrix.needsUpdate = true;
  };
  return m;
}

// ---- lightning: a jagged bolt with branches; .set(k) shows it (k = brightness 0..1) ----
export function bolt(o = {}) {
  const r = rng(o.seed ?? 3), pts = [], g = new THREE.Group();
  let p = v3(0, o.h ?? 180, 0); pts.push(p.clone());
  const N = 22; for (let i = 0; i < N; i++) { p = p.clone().add(v3((r() - 0.5) * 14, -(o.h ?? 180) / N, (r() - 0.5) * 14)); pts.push(p); }
  const mk = (list, rad) => { const path = new THREE.CurvePath(); for (let i = 0; i < list.length - 1; i++) path.add(new THREE.LineCurve3(list[i], list[i + 1])); return new THREE.TubeGeometry(path, list.length * 3, rad, 5, false); };
  const geos = [mk(pts, 0.55)];
  for (let b = 0; b < 5; b++) { const s = 3 + Math.floor(r() * 12), br = [pts[s].clone()]; let q = pts[s].clone(); for (let i = 0; i < 6; i++) { q = q.clone().add(v3((r() - 0.5) * 18, -7 - r() * 6, (r() - 0.5) * 18)); br.push(q); } geos.push(mk(br, 0.28)); }
  const core = new THREE.MeshBasicMaterial({ color: '#f2eeff', transparent: true, fog: false });
  const glow = new THREE.MeshBasicMaterial({ color: '#8f8cff', transparent: true, opacity: 0.25, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
  const merged = mergeGeometries(geos); g.add(new THREE.Mesh(merged, core));
  const halo = new THREE.Mesh(merged.clone(), glow); halo.scale.set(1, 1, 1); g.add(halo);
  // a fatter halo: the same tubes scaled about each point is hard; a second, wider tube set
  const wide = mergeGeometries([mk(pts, 1.6)]); g.add(new THREE.Mesh(wide, glow));
  g.traverse((m) => { if (m.isMesh) m.userData.noAO = true; });
  g.set = (k) => { g.visible = k > 0.02; core.opacity = clamp(k * 1.2); glow.opacity = 0.22 * k; };
  g.set(0); return g;
}
// a flash schedule: [[t, strength], ...] -> brightness at world time tw (a double flicker that decays)
export function flashAt(list, tw) {
  let f = 0;
  for (const [t0, s] of list) { const d = tw - t0; if (d < 0 || d > 0.7) continue; f = Math.max(f, s * (d < 0.06 ? 1 : d < 0.11 ? 0.25 : d < 0.18 ? 0.85 : Math.exp(-(d - 0.18) * 9))); }
  return f;
}

// ---- the glowing crack in time: a jagged tear in the air; .set(k open 0..1, t) ----
export function timeCrack(o = {}) {
  const g = new THREE.Group(), r = rng(o.seed ?? 77), L = o.len ?? 7;
  // the spine from low right to high left (in the group's xy plane), jagged
  const spine = []; const n = 18; for (let i = 0; i <= n; i++) { const s = i / n; spine.push(v3(lerp(L / 2, -L / 2, s) + (r() - 0.5) * 0.35, lerp(-L * 0.32, L * 0.32, s) + (r() - 0.5) * 0.45, 0)); }
  const ribbon = (w0, z) => {
    const pos = [], idx = [];
    spine.forEach((p, i) => { const s = i / n, w = w0 * Math.sin(Math.PI * s) ** 0.6 * (0.7 + 0.6 * hash2(i, w0 * 10)), a = i < n ? spine[i + 1].clone().sub(p) : p.clone().sub(spine[i - 1]), nn = v3(-a.y, a.x, 0).normalize();
      pos.push(p.x + nn.x * w, p.y + nn.y * w, z, p.x - nn.x * w, p.y - nn.y * w, z); if (i < n) { const A = i * 2; idx.push(A, A + 1, A + 2, A + 1, A + 3, A + 2); } });
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx); return gg;
  };
  const edge = new THREE.MeshBasicMaterial({ color: '#5a36c8', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
  const mid = new THREE.MeshBasicMaterial({ color: '#9a86e0', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const core = new THREE.MeshBasicMaterial({ color: '#dcd6f0', side: THREE.DoubleSide, fog: false });
  const inner = new THREE.MeshBasicMaterial({ color: '#05030a', side: THREE.DoubleSide, fog: false });
  const mE = new THREE.Mesh(ribbon(0.75, -0.01), edge), mM = new THREE.Mesh(ribbon(0.36, 0), mid), mC = new THREE.Mesh(ribbon(0.13, 0.01), core), mI = new THREE.Mesh(ribbon(0.05, 0.02), inner);
  [mE, mM, mC, mI].forEach((m) => { m.userData.noAO = true; m.renderOrder = 5; g.add(m); });
  // little branch cracks
  const br = []; for (let b = 0; b < 9; b++) { const i = 2 + Math.floor(r() * (n - 4)), p = spine[i], pts = [p.clone()]; let q = p.clone(); for (let k = 0; k < 4; k++) { q = q.clone().add(v3((r() - 0.5) * 0.9, (r() - 0.5) * 0.9, 0)); pts.push(q); }
    const path = new THREE.CurvePath(); for (let k = 0; k < pts.length - 1; k++) path.add(new THREE.LineCurve3(pts[k], pts[k + 1])); br.push(new THREE.TubeGeometry(path, 8, 0.03, 4, false)); }
  const brM = new THREE.Mesh(mergeGeometries(br), mid); brM.userData.noAO = true; g.add(brM);
  // shards: little glassy flakes drifting off the tear
  const N = 60, sh = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: '#d8ccff', transparent: true, opacity: 0.9, fog: false }), N), S = [];
  for (let i = 0; i < N; i++) { const p = spine[Math.floor(r() * n)]; S.push({ p: p.clone(), v: v3((r() - 0.5) * 1.4, (r() - 0.5) * 1.4, (r() - 0.5) * 1.2), s: 0.6 + r(), ph: r() * 9 }); }
  sh.userData.noAO = true; sh.frustumCulled = false; g.add(sh);
  const light = new THREE.PointLight('#a58cff', 0, 14, 1.8); g.add(light);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  g.set = (k, t = 0) => {
    g.visible = k > 0.001;
    // it tears open from the middle outward
    const sx = clamp(k * 1.6), w = clamp((k - 0.15) * 1.4);
    [mE, mM, mC, mI, brM].forEach((m) => m.scale.set(Math.max(0.001, sx), Math.max(0.001, sx), 1));
    mE.scale.y = mM.scale.y = Math.max(0.001, sx);
    mI.visible = w > 0.3; brM.visible = k > 0.5;
    edge.opacity = 0.35 * w + 0.08 * Math.sin(t * 13) * w; mid.opacity = 0.75 * clamp(k * 2);
    S.forEach((s, i) => { const d = (t * 0.4 + s.ph) % 2.2; const p = s.p.clone().multiplyScalar(sx).addScaledVector(s.v, d); M.compose(p, q.setFromEuler(e.set(t * 2 + s.ph, t * 3, 0)), v3(1, 1, 1).multiplyScalar(s.s * w * (1 - d / 2.2))); sh.setMatrixAt(i, M); });
    sh.instanceMatrix.needsUpdate = true;
    light.intensity = 12 * w;
  };
  g.set(0); return g;
}

// ---- the cavern beneath the island: a dark rock floor and walls, the sword field goes on it ----
export function cavern(o = {}) {
  const g = new THREE.Group(), R = o.R ?? 120;
  const fl = new THREE.CircleGeometry(R * 1.3, 160, 0, Math.PI * 2); fl.rotateX(-Math.PI / 2);
  const p = fl.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z); p.setY(i, (fbm(x * 0.04, z * 0.04) - 0.5) * 5 + Math.max(0, d - R) * 0.6); }
  fl.computeVertexNormals();
  const rock = new THREE.MeshStandardMaterial({ color: '#1a1820', roughness: 0.85, metalness: 0.1 });
  const floor = new THREE.Mesh(fl, rock); floor.receiveShadow = true; g.add(floor);
  // walls and a ceiling (a dome of rock, rough)
  const dome = new THREE.SphereGeometry(R * 1.35, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2); const dp = dome.attributes.position;
  for (let i = 0; i < dp.count; i++) { const x = dp.getX(i), y = dp.getY(i), z = dp.getZ(i), k = 1 + (fbm(x * 0.03 + 5, z * 0.03 + y * 0.02) - 0.5) * 0.25; dp.setXYZ(i, x * k, y * k * 0.42, z * k); }
  dome.computeVertexNormals();
  const dm = new THREE.Mesh(dome, new THREE.MeshStandardMaterial({ color: '#141218', roughness: 0.9, side: THREE.BackSide })); g.add(dm);
  // stalactites
  const st = []; const r = rng(4); for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = r() * R * 1.1, h = 6 + r() * 18, c = new THREE.ConeGeometry(1 + r() * 2.5, h, 6); c.rotateX(Math.PI); c.translate(Math.cos(a) * d, R * 1.35 * 0.42 * Math.sqrt(1 - (d / (R * 1.35)) ** 2) - h / 2 + 2, Math.sin(a) * d); st.push(c.toNonIndexed()); }
  const sm = new THREE.Mesh(mergeGeometries(st), rock); g.add(sm);
  g.floorY = (x, z) => (fbm(x * 0.04, z * 0.04) - 0.5) * 5;
  return g;
}
