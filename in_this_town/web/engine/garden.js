// Garden and sky-island kit (Episode 24): a Grow-a-Garden-style town of plots (crops, borders, tools), a seed stall, the blue
// cube seed, a spiral staircase of glowing cubes that grows from the soil, a floating island with waterfalls, fields of blue glass
// plants, a giant tree whose trunk carries players' names, and a wave of flowers that blooms across every empty plot.
//   const s = cubeStairs({ centre: v3(0, 0, 4), top: 398 });  scene.add(s.g);  s.update(t, growHeight, fade)   s.at(k): a step's top
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { v3, rng, clamp, smooth, lerp } from './core.js';
import { Batch, surf, paint, sign } from './kit.js';
import { canvasTex } from './props.js';
import { treeShape, radiusAt, barkMat } from './forest.js';
import { bushGeo, rockGeo } from './isles.js';

// ---- the cube look: a dark-blue block with bright cyan edges and a little circuit inside ----
let CUBE_TEX = null;
export function cubeTex() {
  if (CUBE_TEX) return CUBE_TEX;
  CUBE_TEX = canvasTex(256, 256, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.72); g.addColorStop(0, '#3fa8ff'); g.addColorStop(0.55, '#1660d8'); g.addColorStop(1, '#0a2f86');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const r = rng(24); x.strokeStyle = 'rgba(160,230,255,0.55)'; x.lineWidth = 5;
    for (let i = 0; i < 7; i++) { const a = 40 + r() * 176, b = 40 + r() * 176; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (r() < 0.5 ? 40 : -40), b); x.lineTo(a + (r() < 0.5 ? 40 : -40), b + (r() < 0.5 ? 40 : -40)); x.stroke(); x.fillStyle = '#c8f4ff'; x.fillRect(a - 6, b - 6, 12, 12); }
    x.strokeStyle = '#d8faff'; x.lineWidth = 16; x.strokeRect(8, 8, w - 16, h - 16);
    x.strokeStyle = '#6fe2ff'; x.lineWidth = 6; x.strokeRect(26, 26, w - 52, h - 52);
  });
  return CUBE_TEX;
}
export function cubeMat(o = {}) {
  return new THREE.MeshStandardMaterial({ map: cubeTex(), emissive: '#ffffff', emissiveMap: cubeTex(), emissiveIntensity: o.glow ?? 1.4, roughness: 0.18, metalness: 0.15, transparent: !!o.transparent, opacity: 1 });
}

// the seed: a small glowing cube (a group; .mat drives its glow)
export function cubeSeed(o = {}) {
  const s = o.size ?? 0.5, g = new THREE.Group(), m = cubeMat({ glow: o.glow ?? 1.6 });
  const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), m); c.castShadow = true; g.add(c);
  if (o.sprout) {   // the island's seed: a tiny glass sprout on top
    const lm = new THREE.MeshStandardMaterial({ color: '#9fe8ff', emissive: '#3fb0ff', emissiveIntensity: 1.2, roughness: 0.1 });
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, s * 0.6, 6), lm); st.position.y = s * 0.78; g.add(st);
    for (const sd of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(s * 0.22, 8, 6), lm); l.scale.set(1, 0.3, 0.55); l.position.set(sd * s * 0.2, s * 1.0, 0); l.rotation.z = sd * -0.5; g.add(l); }
  }
  g.userData.mat = m; g.userData.cube = c;
  return g;
}

// ---- the staircase: cubes winding round a glowing stalk ----
// steps from the soil to `top`; the last one sits at angle thetaEnd (towards -z by default), so it meets whatever is there
export function cubeStairs(o = {}) {
  const c = o.centre || v3(0, 0, 0), N = o.steps ?? 360, R = o.radius ?? 4.2, top = o.top ?? 398, dTh = o.turn ?? 0.32, thEnd = o.thetaEnd ?? -Math.PI / 2;
  const y0 = 0.35, rise = (top - 0.35 - y0) / N;
  const g = new THREE.Group(); g.position.copy(c);
  const mat = cubeMat({ glow: 1.25, transparent: true });
  const geo = new THREE.BoxGeometry(3.0, 0.7, 2.1);
  const im = new THREE.InstancedMesh(geo, mat, N + 1); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; g.add(im);
  const steps = [];
  for (let i = 0; i <= N; i++) { const th = thEnd - (N - i) * dTh; steps.push({ th, y: y0 + i * rise }); }
  // the stalk: a column of light with a vine twisting round it
  const colM = new THREE.MeshStandardMaterial({ color: '#7fe0ff', emissive: '#2aa0ff', emissiveIntensity: 1.6, roughness: 0.1, transparent: true, opacity: 0.85 });
  const colG = new THREE.CylinderGeometry(1.1, 1.4, 1, 24, 1); colG.translate(0, 0.5, 0);
  const col = new THREE.Mesh(colG, colM); col.userData.noAO = true; g.add(col);
  const pts = []; for (let i = 0; i <= 600; i++) { const u = i / 600, a = u * top / 3.2; pts.push(v3(Math.cos(a) * 1.7, u * top, Math.sin(a) * 1.7)); }
  const vineM = new THREE.MeshStandardMaterial({ color: '#7dffc8', emissive: '#22e0a0', emissiveIntensity: 1.1, roughness: 0.3 });
  const vine = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 1800, 0.32, 6), vineM); g.add(vine);
  const uH = { value: 0 }; vine.userData.uH = uH;
  vine.material.onBeforeCompile = (s) => { s.uniforms.uH = uH;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvY = position.y;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vY; uniform float uH;').replace('#include <clipping_planes_fragment>', 'if (vY > uH) discard;\n#include <clipping_planes_fragment>'); };
  // little glass leaves on the vine every so often
  const leafG = new THREE.SphereGeometry(0.5, 8, 6); leafG.scale(1, 0.22, 0.6);
  const leaves = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: '#9ff7d8', emissive: '#2fd0a0', emissiveIntensity: 0.9, roughness: 0.1 }), 160); leaves.frustumCulled = false; g.add(leaves);
  const lv = []; { const r = rng(5); for (let i = 0; i < 160; i++) { const y = (i + 0.5) / 160 * top, a = y / 3.2 + r() * 0.3; lv.push({ y, a }); } }
  const tip = new THREE.PointLight('#5fc8ff', 0, 40, 1.4); g.add(tip);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = v3(1, 1, 1), p = v3(0, 0, 0);
  let lastH = -1, lastF = -1;
  const set = {
    g, im, steps, R, rise, mat, colM, tip,
    // the top centre of step k (k may be fractional), world space
    // at(k): a step's top; between steps a foot stays on one, then steps up
    at(k) { const i = clamp(Math.floor(k), 0, N), j = Math.min(N, i + 1), f = clamp(k - i, 0, 1), a = steps[i], b = steps[j];
      const hp = clamp((f - 0.3) / 0.4, 0, 1), th = lerp(a.th, b.th, f), y = lerp(a.y, b.y, hp * hp * (3 - 2 * hp)) + 0.35; return v3(c.x + Math.cos(th) * R, c.y + y, c.z + Math.sin(th) * R); },
    angle(k) { const i = clamp(Math.floor(k), 0, N), j = Math.min(N, i + 1); return lerp(steps[i].th, steps[j].th, clamp(k - i, 0, 1)); },
    // H: how high it has grown (studs); fade 0..1 dissolves it from the top down
    update(t, H, fade = 0) {
      if (H !== lastH || fade !== lastF) {
        steps.forEach((st, i) => {
          const k = clamp((H - st.y) / 4) * (1 - clamp((fade * (top + 40) - (top - st.y)) / 30));
          const sc = k <= 0 ? 0.0001 : 0.25 + 0.75 * k + 0.12 * Math.sin(Math.PI * k);
          q.setFromEuler(e.set(0, -st.th, 0)); M.compose(p.set(Math.cos(st.th) * R, st.y, Math.sin(st.th) * R), q, s.set(sc, sc, sc)); im.setMatrixAt(i, M);
        });
        im.instanceMatrix.needsUpdate = true;
        const vis = Math.max(0.01, H * (1 - fade));
        col.scale.set(1, vis, 1); col.visible = H > 0.5 && fade < 0.999;
        vine.userData.uH && (vine.userData.uH.value = vis);
        lv.forEach((l, i) => { const k = clamp((vis - l.y) / 3); M.compose(p.set(Math.cos(l.a) * 2.2, l.y, Math.sin(l.a) * 2.2), q.setFromEuler(e.set(0, -l.a, 0.6)), s.setScalar(k + 0.0001)); leaves.setMatrixAt(i, M); });
        leaves.instanceMatrix.needsUpdate = true;
        lastH = H; lastF = fade;
      }
      mat.opacity = 1 - fade; colM.opacity = 0.85 * (1 - fade);
      mat.emissiveIntensity = 1.2 + 0.25 * Math.sin(t * 3);
      tip.position.set(0, Math.min(H, top) + 2, 0); tip.intensity = H > 0.5 && H < top - 1 ? 220 : 0;
      vine.visible = H > 0.5 && fade < 0.999;
    },
  };
  set.update(0, 0, 0);
  return set;
}

// ---- crops and plots ----
const M_ = {};
const pm = (k, c, o) => M_[k] || (M_[k] = paint(c, o));
export function soilMat() { return M_.soil || (M_.soil = surf('sand', '#7a5236', { roughness: 0.96 })); }
// one garden plot (w x d, centred at x, z) into a Batch: soil bed, plank border with corner posts, crops in rows (kind: 'mixed' | 'empty')
export function gardenPlot(b, x, z, o = {}) {
  const w = o.w ?? 24, d = o.d ?? 20, r = rng(o.seed ?? 1), wood = surf('plank', '#a87a4e'), post = pm('post', '#6e4a2c', { roughness: 0.8 });
  b.box(soilMat(), w, 0.5, d, x, 0.2, z, { r: 0.05 });
  for (const s of [-1, 1]) { b.box(wood, w + 0.8, 0.9, 0.4, x, 0.45, z + s * (d / 2 + 0.2), { r: 0.06 }); b.box(wood, 0.4, 0.9, d, x + s * (w / 2 + 0.2), 0.45, z, { r: 0.06 }); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { b.box(post, 0.7, 1.6, 0.7, x + sx * (w / 2 + 0.2), 0.8, z + sz * (d / 2 + 0.2), { r: 0.08 }); b.box(pm('cap', '#e8dcc0'), 0.85, 0.2, 0.85, x + sx * (w / 2 + 0.2), 1.65, z + sz * (d / 2 + 0.2), { r: 0.05 }); }
  // furrows
  for (let k = -d / 2 + 2; k < d / 2 - 1; k += 3) b.box(pm('furrow', '#5e3e28', { roughness: 1 }), w - 1.6, 0.18, 1.0, x, 0.5, z + k, { r: 0.08 });
  if (o.kind === 'empty') {
    for (let i = 0; i < 6; i++) b.add(pm('pebble', '#9a8e80', { roughness: 0.9 }), rockGeo(i + 2).scale(0.35, 0.22, 0.3), x + (r() - 0.5) * (w - 3), 0.5, z + (r() - 0.5) * (d - 3), r() * 6);
    return;
  }
  const rows = o.rows || ['carrot', 'cabbage', 'sunflower', 'tomato', 'pumpkin', 'berry'];
  const zz = []; for (let k = -d / 2 + 2; k < d / 2 - 1; k += 3) zz.push(k);
  zz.forEach((k, j) => {
    if (o.skip && o.skip(j, k)) return;
    const kind = rows[(j + (o.seed ?? 0)) % rows.length];
    for (let xx = -w / 2 + 1.8; xx <= w / 2 - 1.8; xx += kind === 'pumpkin' ? 3.4 : kind === 'sunflower' ? 2.6 : 1.9) crop(b, kind, x + xx + (r() - 0.5) * 0.3, z + k, r);
  });
}
export function crop(b, kind, x, z, r) {
  const y = 0.55, green = pm('leaf', '#3f9a3a', { roughness: 0.7 }), lgreen = pm('lleaf', '#6cc24a', { roughness: 0.7 });
  if (kind === 'carrot') { b.cyl(pm('carrot', '#ff8a1e', { roughness: 0.6 }), 0.32, 0.05, 0.6, x, y + 0.05, z); for (let i = 0; i < 3; i++) b.add(lgreen, new THREE.ConeGeometry(0.12, 1.1, 5), x + (i - 1) * 0.15, y + 0.75, z, 0, 0, (i - 1) * 0.35); }
  else if (kind === 'cabbage') { b.add(green, new THREE.SphereGeometry(0.75, 12, 9), x, y + 0.45, z); b.add(lgreen, new THREE.SphereGeometry(0.55, 10, 8), x, y + 0.7, z); }
  else if (kind === 'sunflower') { const h = 3.4 + r() * 1.4; b.cyl(green, 0.1, 0.13, h, x, y + h / 2, z); b.add(green, new THREE.SphereGeometry(0.4, 8, 6).scale(1, 0.2, 0.6), x + 0.35, y + h * 0.55, z, 0.3);
    b.cyl(pm('petal', '#ffd21e', { roughness: 0.55 }), 0.85, 0.85, 0.12, x, y + h + 0.2, z + 0.12, { rx: Math.PI / 2 - 0.25, seg: 14 }); b.cyl(pm('seedhead', '#5a3416', { roughness: 0.9 }), 0.42, 0.42, 0.2, x, y + h + 0.22, z + 0.2, { rx: Math.PI / 2 - 0.25, seg: 14 }); }
  else if (kind === 'tomato') { b.cyl(pm('stake', '#b08a5a'), 0.06, 0.06, 2.6, x, y + 1.3, z); b.add(green, new THREE.IcosahedronGeometry(0.8, 1), x, y + 1.3, z); for (let i = 0; i < 4; i++) b.add(pm('tomato', '#e8321e', { roughness: 0.35 }), new THREE.SphereGeometry(0.22, 10, 8), x + (r() - 0.5) * 1.1, y + 0.8 + r() * 1.2, z + 0.5); }
  else if (kind === 'pumpkin') { b.add(pm('pumpkin', '#ff8c1a', { roughness: 0.5 }), new THREE.SphereGeometry(0.9, 14, 10).scale(1.2, 0.8, 1.1), x, y + 0.6, z); b.cyl(pm('pstem', '#5a7a2a'), 0.08, 0.12, 0.4, x, y + 1.35, z); b.add(green, new THREE.SphereGeometry(0.5, 8, 6).scale(1, 0.2, 0.7), x + 0.7, y + 0.15, z + 0.5, 0.6); }
  else if (kind === 'berry') { b.add(green, bushGeo().scale(0.6, 0.55, 0.6), x, y + 0.6, z); for (let i = 0; i < 5; i++) b.add(pm(r() < 0.5 ? 'straw' : 'blue', r() < 0.5 ? '#ff2a4a' : '#4a5ae8', { roughness: 0.35 }), new THREE.SphereGeometry(0.16, 8, 6), x + (r() - 0.5) * 1.3, y + 0.5 + r() * 0.8, z + 0.55); }
  else if (kind === 'corn') { const h = 3.6 + r(); b.cyl(lgreen, 0.1, 0.14, h, x, y + h / 2, z); for (let i = 0; i < 3; i++) b.add(green, new THREE.ConeGeometry(0.15, 2.2, 4), x, y + 1 + i * 0.9, z, i * 2, 0, 1.0); b.add(pm('cob', '#ffd84a', { roughness: 0.5 }), new THREE.CylinderGeometry(0.17, 0.2, 0.9, 8), x + 0.25, y + h * 0.6, z, 0, 0, -0.4); }
}
export function wateringCan(o = {}) {
  const b = new Batch(), m = paint(o.color || '#3fa0d8', { metalness: 0.5, roughness: 0.35 });
  b.cyl(m, 0.55, 0.62, 1.0, 0, 0.5, 0, { seg: 20 }); b.add(m, new THREE.TorusGeometry(0.42, 0.07, 6, 16, Math.PI), 0, 1.0, 0, 0, 0, 0);
  b.cyl(m, 0.06, 0.12, 1.3, 0.85, 0.75, 0, { rz: -0.9 }); b.cyl(m, 0.16, 0.08, 0.14, 1.36, 1.12, 0, { rz: -0.9 });
  return b.done();
}
export function wheelbarrow() {
  const b = new Batch(), m = paint('#d8402a', { metalness: 0.4, roughness: 0.45 }), d = paint('#2a2a2e');
  b.box(m, 2.4, 0.9, 1.6, 0, 1.1, 0, { r: 0.18 }); b.add(d, new THREE.TorusGeometry(0.42, 0.14, 8, 18), 1.4, 0.45, 0, Math.PI / 2);
  for (const s of [-1, 1]) { b.cyl(paint('#6a4a2a'), 0.06, 0.06, 2.6, -0.6, 0.95, s * 0.6, { rz: Math.PI / 2 - 0.15 }); b.cyl(d, 0.05, 0.05, 0.8, -0.9, 0.4, s * 0.6); }
  b.add(soilMat(), new THREE.SphereGeometry(0.9, 10, 6).scale(1.1, 0.35, 0.75), 0, 1.5, 0);
  return b.done();
}
export function scarecrow() {
  const b = new Batch(), wood = paint('#8a6236', { roughness: 0.8 }), cloth = paint('#4a78c0', { roughness: 0.9 }), hay = paint('#e8c86a', { roughness: 1 });
  b.cyl(wood, 0.12, 0.14, 6, 0, 3, 0); b.cyl(wood, 0.1, 0.1, 4.2, 0, 4.4, 0, { rz: Math.PI / 2 });
  b.box(cloth, 1.6, 1.8, 0.7, 0, 4.0, 0, { r: 0.2 }); b.box(paint('#d84a3a'), 3.8, 0.55, 0.55, 0, 4.6, 0, { r: 0.15 });
  b.add(paint('#f0d8a0', { roughness: 0.9 }), new THREE.SphereGeometry(0.6, 12, 10), 0, 5.5, 0); b.cyl(hay, 1.0, 1.0, 0.1, 0, 5.95, 0, { seg: 16 }); b.cyl(hay, 0.5, 0.6, 0.6, 0, 6.25, 0, { seg: 16 });
  for (const s of [-1, 1]) b.add(hay, new THREE.ConeGeometry(0.22, 0.6, 5), s * 2.05, 4.6, 0, 0, 0, s * Math.PI / 2);
  return b.done();
}

// ---- the seed stall: striped awning, seed packets, sacks, a price board, the sign (its front faces +z) ----
export function seedStall(o = {}) {
  const g = new THREE.Group(), b = new Batch(), wood = surf('plank', '#a0703e'), post = paint('#6a4626', { roughness: 0.8 });
  b.box(wood, 12, 3.4, 3.2, 0, 1.7, 0, { r: 0.08 }); b.box(surf('plank', '#d4ae74'), 12.8, 0.3, 3.8, 0, 3.55, 0, { r: 0.05 });
  for (const x of [-5.8, 5.8]) for (const z of [-1.5, 1.5]) b.cyl(post, 0.18, 0.2, 8.4, x, 4.2, z);
  b.box(wood, 12, 7, 0.4, 0, 3.5 + 1.2, -2.2, { r: 0.06 });   // back board
  // seed packet racks on the back board and on the counter
  const cols = ['#ff7a3a', '#ff4a6a', '#4a7ae8', '#ffd24a', '#5ac85a', '#c87aff', '#ff9ec4', '#e8e4dc'], r = rng(o.seed || 7);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
    const c = cols[(i + row * 3) % cols.length], x = -4.8 + i * 1.2, y = 4.6 + row * 1.5;
    b.box(paint(c, { roughness: 0.6 }), 0.95, 1.2, 0.12, x, y, -1.9, { r: 0.04, rz: (r() - 0.5) * 0.08 });
    b.add(paint('#ffffff', { roughness: 0.5 }), new THREE.CircleGeometry(0.26, 12), x, y + 0.1, -1.82);
  }
  for (let i = 0; i < 8; i++) b.box(paint(cols[i], { roughness: 0.6 }), 0.9, 1.15, 0.1, -4.2 + i * 1.2, 4.2, 0.9, { r: 0.04, rx: -0.5 });
  // sacks and crates in front
  const sack = paint('#c8a878', { roughness: 1 });
  for (const [x, z, s] of [[-7.2, 2.2, 1], [-8.4, 0.6, 0.9], [7.4, 2.0, 1.05]]) { b.add(sack, new THREE.SphereGeometry(1, 14, 10).scale(0.9 * s, 1.15 * s, 0.85 * s), x, 1.1 * s, z); b.add(paint('#e8d8b0', { roughness: 1 }), new THREE.CylinderGeometry(0.35 * s, 0.6 * s, 0.5 * s, 10), x, 2.3 * s, z); b.add(paint(['#ffd24a', '#7a4a2a', '#ff7a3a'][Math.floor(r() * 3)], { roughness: 0.9 }), new THREE.SphereGeometry(0.45 * s, 10, 6).scale(1, 0.4, 1), x, 2.5 * s, z); }
  b.box(surf('plank', '#b88a52'), 2.2, 1.6, 2.2, 8.6, 0.8, -0.4, { r: 0.08 });
  for (let i = 0; i < 6; i++) b.add(paint('#ff8a1e', { roughness: 0.5 }), new THREE.SphereGeometry(0.45, 10, 8).scale(1.1, 0.8, 1), 8.0 + (i % 3) * 0.6, 1.8, -0.9 + Math.floor(i / 3) * 0.9);
  b.done(g);
  // the awning: green and white stripes
  const st = canvasTex(512, 256, (x, w, h) => { for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? '#fffaf0' : '#2fb85a'; x.fillRect(i * w / 10, 0, w / 10, h); } x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, h - 26, w, 26); });
  const awG = new THREE.PlaneGeometry(13.4, 5, 12, 4); { const p = awG.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / 13.4 + 0.5) * Math.PI * 10) * 0.12); awG.computeVertexNormals(); }
  const aw = new THREE.Mesh(awG, new THREE.MeshStandardMaterial({ map: st, side: THREE.DoubleSide, roughness: 0.85 })); aw.position.set(0, 8.3, 0.6); aw.rotation.x = -Math.PI / 2 + 0.42; aw.castShadow = true; aw.receiveShadow = true; g.add(aw);
  const scal = canvasTex(512, 64, (x, w, h) => { x.clearRect(0, 0, w, h); for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? '#fffaf0' : '#2fb85a'; x.beginPath(); x.moveTo(i * w / 10, 0); x.lineTo((i + 1) * w / 10, 0); x.lineTo((i + 0.5) * w / 10, h); x.fill(); } });
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 0.8), new THREE.MeshStandardMaterial({ map: scal, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide })); sc.position.set(0, 7.0, 2.85); g.add(sc);
  const s = sign(o.text || 'SEED SHOP', { w: 8, h: 1.8, bg: '#2f7a3a', fg: '#fff6d8', frame: '#5a3a20' }); s.position.set(0, 9.9, 2.2); s.rotation.x = -0.1; g.add(s);
  return g;
}

// ---- the floating island ----
// top at y = 0 (local), radius R; a rocky underside down to depth; waterfalls; hanging roots; floating rocks
export function floatingIsland(o = {}) {
  const R = o.R ?? 44, D = o.depth ?? 80, r = rng(o.seed || 24), g = new THREE.Group();
  // the grass top: a gentle dome with a wavy rim
  const topG = new THREE.CircleGeometry(R, 96, 0, Math.PI * 2); topG.rotateX(-Math.PI / 2);
  { const p = topG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z) / R, a = Math.atan2(z, x), k = 1 + 0.04 * Math.sin(a * 7 + 1) + 0.025 * Math.sin(a * 13);
    p.setXYZ(i, x * k, 0.9 * (1 - d * d) + 0.25 * Math.sin(x * 0.3) * Math.cos(z * 0.27), z * k); } topG.computeVertexNormals(); }
  const top = new THREE.Mesh(topG, surf('grass', '#64c46a')); top.receiveShadow = true; g.add(top);
  // the underside: a jagged lathe, stratified rock (vertex colours)
  const prof = []; const n = 22;
  for (let i = 0; i <= n; i++) { const u = i / n; prof.push(new THREE.Vector2(Math.max(0.01, R * (1.01 - Math.pow(u, 0.8)) * (1 + (r() - 0.5) * 0.12)), -u * D - (i === 0 ? 0 : 1))); }
  const lg = new THREE.LatheGeometry(prof, 72); const lp = lg.attributes.position, colA = new Float32Array(lp.count * 3), c = new THREE.Color(), rock = ['#7a6a5a', '#9a8670', '#5e5248', '#b49a7a'];
  for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i), z = lp.getZ(i), a = Math.atan2(z, x), j = 1 + 0.12 * Math.sin(a * 9 + y * 0.2) + 0.08 * Math.sin(a * 23 - y * 0.5);
    if (y < -1.5) { lp.setX(i, x * j); lp.setZ(i, z * j); }
    c.set(rock[Math.floor(Math.abs(Math.sin(y * 0.35)) * 3.99)]).lerp(new THREE.Color('#4a7a3a'), y > -3 ? 0.7 : 0); colA[i * 3] = c.r; colA[i * 3 + 1] = c.g; colA[i * 3 + 2] = c.b; }
  lg.setAttribute('color', new THREE.BufferAttribute(colA, 3)); lg.computeVertexNormals();
  const under = new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true, side: THREE.DoubleSide })); under.castShadow = true; under.receiveShadow = true; g.add(under);
  // a grass lip round the rim
  const lip = new THREE.Mesh(new THREE.TorusGeometry(R * 1.0, 0.9, 6, 120), surf('grass', '#58b45e')); lip.rotation.x = Math.PI / 2; lip.position.y = -0.3; lip.scale.set(1, 1, 0.8); g.add(lip);
  // hanging roots and vines
  const rootM = new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.9 }), roots = [];
  for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, rr = R * (0.8 + r() * 0.18), len = 6 + r() * 22, x = Math.cos(a) * rr, z = Math.sin(a) * rr, d0 = -2 - r() * 4;
    roots.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(x, d0, z), v3(x * 0.98 + (r() - 0.5) * 2, d0 - len * 0.5, z * 0.98), v3(x * 0.96 + (r() - 0.5) * 3, d0 - len, z * 0.96)]), 8, 0.12 + r() * 0.2, 5)); }
  g.add(new THREE.Mesh(mergeGeometries(roots), rootM));
  // floating rocks around
  const fr = new THREE.InstancedMesh(rockGeo(4), new THREE.MeshStandardMaterial({ color: '#8a7866', roughness: 0.95, flatShading: true }), 18), M = new THREE.Matrix4(), q = new THREE.Quaternion();
  const rocks = []; for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, d = R + 10 + r() * 50, s = 1.5 + r() * 4; rocks.push({ x: Math.cos(a) * d, y: -10 + (r() - 0.5) * 40, z: Math.sin(a) * d, s, ph: r() * 6 }); }
  fr.castShadow = true; fr.frustumCulled = false; g.add(fr);
  // waterfalls off the rim: glowing ribbons with flowing streaks
  const wfMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 v; uniform float t;
      float h(float x){ return fract(sin(x * 91.7) * 4375.5); }
      void main(){ float col = floor(v.x * 26.0); float s = fract(v.y * 3.0 + t * (0.9 + h(col) * 0.6) + h(col + 3.0));
        float streak = smoothstep(0.0, 0.25, s) * (1.0 - smoothstep(0.35, 1.0, s));
        float edge = smoothstep(0.0, 0.18, v.x) * smoothstep(1.0, 0.82, v.x);
        float a = edge * (0.45 + 0.55 * streak) * smoothstep(0.0, 0.35, v.y);
        vec3 c = mix(vec3(0.35, 0.75, 1.0), vec3(0.92, 0.98, 1.0), streak);
        gl_FragColor = vec4(c * 1.25, a * 0.85); }` });
  const falls = [];
  for (const [a, w] of o.falls || [[0.5, 5], [2.4, 3.5], [3.9, 6]]) {
    const x = Math.cos(a) * (R + 0.6), z = Math.sin(a) * (R + 0.6), len = 160;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, len, 1, 1), wfMat); f.position.set(x, -len / 2 + 0.3, z); f.rotation.y = -a + Math.PI / 2; f.userData.noAO = true; f.renderOrder = 2; g.add(f); falls.push(f);
    const lipW = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.5, 0.5, 16, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#8fd8ff', emissive: '#3fa8ff', emissiveIntensity: 0.6, roughness: 0.05, transparent: true, opacity: 0.8 }));
    lipW.position.set(x * 0.985, 0.15, z * 0.985); lipW.rotation.y = -a; g.add(lipW);
  }
  g.userData = { R, top, falls, wfMat };
  g.update = (t) => { wfMat.uniforms.t.value = t; rocks.forEach((k, i) => { M.compose(v3(k.x, k.y + Math.sin(t * 0.6 + k.ph) * 1.2, k.z), q.setFromEuler(new THREE.Euler(k.ph, t * 0.1 + k.ph, 0)), v3(k.s, k.s * 0.8, k.s)); fr.setMatrixAt(i, M); }); fr.instanceMatrix.needsUpdate = true; };
  g.update(0);
  return g;
}

// ---- blue glass plants: six kinds, instanced. list: [{ x, z, kind, s, ry }] in the parent's space (y = ground) ----
export const GLASS = () => new THREE.MeshStandardMaterial({ color: '#9fe2ff', emissive: '#2a8cff', emissiveIntensity: 0.85, roughness: 0.06, metalness: 0.25, transparent: true, opacity: 0.86, flatShading: true });
function glassGeo(kind) {
  const parts = [];
  if (kind === 'tulip') {
    parts.push(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 6).translate(0, 1.1, 0));
    const cup = new THREE.LatheGeometry([0, 0.25, 0.42, 0.5, 0.46].map((x, i) => new THREE.Vector2(x + 0.001, i * 0.28)), 6); cup.translate(0, 2.1, 0); parts.push(cup);
    parts.push(new THREE.SphereGeometry(0.35, 6, 4).scale(1, 0.15, 0.5).translate(0.32, 0.8, 0)); parts.push(new THREE.SphereGeometry(0.35, 6, 4).scale(1, 0.15, 0.5).translate(-0.3, 1.2, 0));
  } else if (kind === 'crystal') {
    for (let i = 0; i < 5; i++) { const h = 1.4 + (i % 3) * 0.7, c = new THREE.CylinderGeometry(0, 0.32 + (i % 2) * 0.1, h, 6); c.translate(0, h / 2, 0); c.rotateZ((i - 2) * 0.28); c.rotateY(i * 1.3); parts.push(c); }
  } else if (kind === 'mush') {
    parts.push(new THREE.CylinderGeometry(0.16, 0.22, 1.4, 7).translate(0, 0.7, 0)); parts.push(new THREE.SphereGeometry(0.9, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1).translate(0, 1.35, 0));
    parts.push(new THREE.CylinderGeometry(0.1, 0.14, 0.8, 6).translate(0.7, 0.4, 0.3)); parts.push(new THREE.SphereGeometry(0.45, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1).translate(0.7, 0.78, 0.3));
  } else if (kind === 'fern') {
    for (let i = 0; i < 7; i++) { const l = new THREE.SphereGeometry(0.5, 6, 4).scale(0.35, 0.08, 1.6); l.translate(0, 0, 1.3); l.rotateX(-0.75); l.rotateY(i / 7 * Math.PI * 2); l.translate(0, 0.25, 0); parts.push(l); }
  } else if (kind === 'tree') {
    parts.push(new THREE.CylinderGeometry(0.18, 0.3, 3.4, 6).translate(0, 1.7, 0));
    for (const [x, y, z, s] of [[0, 4.0, 0, 1.4], [0.8, 3.3, 0.3, 0.9], [-0.7, 3.5, -0.3, 1.0], [0.1, 4.9, 0.1, 0.8]]) parts.push(new THREE.IcosahedronGeometry(s, 0).translate(x, y, z));
  } else if (kind === 'bell') {
    const pts = [v3(0, 0, 0), v3(0.1, 1.2, 0), v3(0.6, 1.9, 0), v3(1.1, 1.7, 0)];
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.05, 5));
    for (const [x, y] of [[0.5, 1.6], [0.85, 1.55], [1.1, 1.4]]) parts.push(new THREE.ConeGeometry(0.18, 0.35, 6, 1, true).translate(x, y - 0.12, 0));
  } else if (kind === 'hedge') {
    for (let i = 0; i < 4; i++) parts.push(new THREE.IcosahedronGeometry(0.75, 0).translate((i - 1.5) * 0.9, 0.7 + (i % 2) * 0.15, 0));
  }
  const geo = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)).map((p) => { p.deleteAttribute('uv'); return p; }));
  geo.computeVertexNormals(); return geo;
}
export function glassField(parent, list, o = {}) {
  const mat = o.mat || GLASS(), kinds = [...new Set(list.map((p) => p.kind))], meshes = {}, M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  const cols = o.colors || ['#ffffff', '#c8e8ff', '#a8f0ff', '#b8c8ff', '#d8f8ff'];
  for (const k of kinds) {
    const items = list.filter((p) => p.kind === k), im = new THREE.InstancedMesh(glassGeo(k), mat, items.length);
    items.forEach((p, i) => { M.compose(v3(p.x, p.y ?? 0, p.z), q.setFromEuler(e.set(0, p.ry ?? 0, 0)), v3(p.s, p.s, p.s)); im.setMatrixAt(i, M); im.setColorAt(i, c.set(cols[i % cols.length])); });
    im.castShadow = true; im.receiveShadow = false; im.frustumCulled = false; parent.add(im); meshes[k] = im;
  }
  return { mat, meshes, update(t) { mat.emissiveIntensity = (o.glow ?? 0.85) * (0.9 + 0.1 * Math.sin(t * 2.2)); } };
}

// ---- the name tree: white bark, a crown of blue glass leaves; its geo lets names sit on the trunk (radiusAt) ----
export function nameTree(o = {}) {
  const sh = treeShape({ seed: o.seed || 24, h: o.h ?? 44, r0: o.r0 ?? 6, r1: o.r1 ?? 2.8, spread: o.spread ?? 30, clumps: o.clumps ?? 34, detail: 2, cols: o.cols || ['#1e5fd0', '#4aa8ff', '#d0f2ff'], flare: o.flare ?? 3.2, root: 0.06, span: 9 });
  const g = new THREE.Group();
  const bark = new THREE.Mesh(sh.bark, barkMat(o.bark || '#e9edf6')); bark.castShadow = true; bark.receiveShadow = true; g.add(bark);
  const lm = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#2f8cff', emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.2, flatShading: true, transparent: true, opacity: 0.93 });
  const crown = new THREE.Mesh(sh.leaves, lm); crown.castShadow = true; g.add(crown);
  return { g, sh, geo: sh.geo, bark, crown, leafMat: lm, radius: (y) => radiusAt(sh.geo, y) };
}

// ---- a wave of flowers over a set of spots, spreading from a centre ----
// spots: [{ x, z, y? }] world; .update(t) with t0 / speed set on the object
export function bloomField(parent, spots, o = {}) {
  const r = rng(o.seed || 31), n = spots.length, cols = o.colors || ['#ff4f8a', '#ffd23a', '#ffffff', '#b06aff', '#ff7a3a', '#ff9ed0', '#4ab0ff', '#ff3a4a'];
  const petals = []; for (let i = 0; i < 6; i++) { const p = new THREE.SphereGeometry(0.24, 8, 5); p.scale(1, 0.28, 0.55); p.translate(0.26, 0, 0); p.rotateY(i / 6 * Math.PI * 2); parts(p); petals.push(p); }
  function parts(p) { p.deleteAttribute('uv'); }
  const headG = mergeGeometries(petals); headG.rotateX(0.35);
  const head = new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ roughness: 0.5 }), n);
  const ctrG = new THREE.SphereGeometry(0.14, 8, 6); ctrG.scale(1, 0.6, 1);
  const ctr = new THREE.InstancedMesh(ctrG, new THREE.MeshStandardMaterial({ color: '#ffcf2a', roughness: 0.6, emissive: '#5a3a00', emissiveIntensity: 0.2 }), n);
  const stemG = new THREE.CylinderGeometry(0.05, 0.07, 1, 5); stemG.translate(0, 0.5, 0);
  const stem = new THREE.InstancedMesh(stemG, new THREE.MeshStandardMaterial({ color: '#3f9a3a', roughness: 0.8 }), n);
  const leafG = new THREE.SphereGeometry(0.3, 6, 4); leafG.scale(1.4, 0.15, 0.5); leafG.translate(0.35, 0, 0);
  const leaf = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: '#4fae44', roughness: 0.75 }), n);
  const items = spots.map((s, i) => ({ x: s.x, z: s.z, y: s.y ?? 0.5, h: 0.7 + r() * 0.9, s: 0.8 + r() * 0.7, ry: r() * 6.28, ph: r() * 6, jit: r() * 0.35 }));
  const c = new THREE.Color(); items.forEach((it, i) => head.setColorAt(i, c.set(cols[Math.floor(r() * cols.length)])));
  head.instanceColor.needsUpdate = true;
  for (const m of [head, ctr, stem, leaf]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; parent.add(m); }
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = v3(0, 0, 0), sc = v3(1, 1, 1);
  const obj = { head, ctr, stem, leaf, items, t0: 1e9, speed: o.speed ?? 40, centre: o.centre || v3(0, 0, 0),
    kAt(it, t) { const d = Math.hypot(it.x - obj.centre.x, it.z - obj.centre.z), t1 = obj.t0 + d / obj.speed + it.jit; return clamp((t - t1) / 0.7); },
    update(t) {
      items.forEach((it, i) => {
        const k = obj.kAt(it, t), pop = k <= 0 ? 0 : Math.min(1.15, k * 1.25) - 0.15 * smooth(0.8, 1, k), h = it.h * smooth(0, 0.6, k), sw = Math.sin(t * 1.6 + it.ph) * 0.06;
        const z0 = k <= 0 ? 0.0001 : 1;
        M.compose(p.set(it.x, it.y, it.z), q.setFromEuler(e.set(sw, it.ry, 0)), sc.set(it.s * z0, Math.max(0.0001, h * it.s), it.s * z0)); stem.setMatrixAt(i, M);
        M.compose(p.set(it.x, it.y + 0.3 * h * it.s, it.z), q.setFromEuler(e.set(0, it.ry, 0.2)), sc.setScalar(Math.max(0.0001, it.s * smooth(0, 0.5, k)))); leaf.setMatrixAt(i, M);
        const hy = it.y + h * it.s;
        M.compose(p.set(it.x + sw * h, hy, it.z), q.setFromEuler(e.set(sw, it.ry, 0)), sc.setScalar(Math.max(0.0001, it.s * pop))); head.setMatrixAt(i, M);
        M.compose(p.set(it.x + sw * h, hy + 0.05, it.z), q, sc.setScalar(Math.max(0.0001, it.s * pop))); ctr.setMatrixAt(i, M);
      });
      for (const m of [head, ctr, stem, leaf]) m.instanceMatrix.needsUpdate = true;
    } };
  obj.update(0);
  return obj;
}
