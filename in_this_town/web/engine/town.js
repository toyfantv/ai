// Procedural pastel town + Emma's two-storey house with a real interior.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, box, rng, wallRects, patchCaustics } from './core.js';

const PASTELS = ['#f7b8c8', '#b8d8f7', '#c8f0c0', '#fde5a6', '#d9c6f5', '#ffcfa8', '#bfeee8', '#f5f0c0', '#e9c0e0'];
const ROOFS = ['#d0605e', '#5a6fa8', '#7a5a8a', '#4f8a6a', '#b56a45', '#6a6a7a'];

export const winMat = new THREE.MeshStandardMaterial({ color: '#cfe8ff', emissive: '#ffd48a', emissiveIntensity: 0.0, roughness: 0.2, metalness: 0.1 });
export const lampMat = new THREE.MeshStandardMaterial({ color: '#fff6dc', emissive: '#ffe2a0', emissiveIntensity: 0.2 });

function mergeGroup(group, parent) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const ng = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ng.deleteAttribute(k);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(ng);
  });
  for (const [m, geos] of buckets) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), m);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
  }
}

const roofGeo = (() => { const g = new THREE.ConeGeometry(1, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); return g; })();

function house(g, x, z, facing, r, floors) {
  const w = 13 + Math.floor(r() * 4), d = 11 + Math.floor(r() * 3), fh = 6.5;
  const h = fh * floors;
  const col = PASTELS[Math.floor(r() * PASTELS.length)], roofC = ROOFS[Math.floor(r() * ROOFS.length)];
  const hg = new THREE.Group(); hg.position.set(x, 0, z); hg.rotation.y = facing; g.add(hg);
  box(w, h, d, mat(col), 0, h / 2, 0, hg);
  box(w + 0.6, 0.5, d + 0.6, mat('#f4f4f4'), 0, 0.25, 0, hg);
  const roof = new THREE.Mesh(roofGeo, mat(roofC));
  roof.scale.set((w + 2) / Math.SQRT2, 5 + r() * 2, (d + 2) / Math.SQRT2); roof.position.y = h; hg.add(roof);
  // front (+z local) windows and door
  const fz = d / 2 + 0.06;
  for (let f = 0; f < floors; f++) {
    const y = f * fh + 3.6;
    for (const wx of [-w / 2 + 2.6, w / 2 - 2.6]) {
      box(2.4, 2.4, 0.14, winMat, wx, y, fz, hg);
      box(2.9, 0.3, 0.3, mat('#ffffff'), wx, y - 1.35, fz + 0.05, hg);
    }
    if (f > 0) box(2.4, 2.4, 0.14, winMat, 0, y, fz, hg);
  }
  box(2.2, 4, 0.2, mat(['#7a4a2a', '#3d5a8a', '#8a2f3a', '#2f6a4a'][Math.floor(r() * 4)]), 0, 2, fz, hg);
  box(4, 0.3, 2, mat('#d8d8d8'), 0, 0.15, d / 2 + 1, hg);
  // side windows
  for (const sx of [-1, 1]) box(0.14, 2.2, 2.2, winMat, sx * (w / 2 + 0.06), 3.6, 0, hg);
  if (r() > 0.5) box(1.4, 4, 1.4, mat('#9a7a6a'), w / 4, h + 3, -d / 6, hg);
  // garden hedge + flowers
  box(w, 1.1, 1, mat('#4f9a4a'), 0, 0.55, d / 2 + 4.5, hg);
  for (let i = 0; i < 4; i++) box(0.6, 0.6, 0.6, mat(['#ff7aa8', '#ffd24a', '#ffffff', '#b07aff'][i]), -w / 2 + 1.5 + i * 1.2, 1.3, d / 2 + 4.5, hg);
}

function tree(g, x, z, r) {
  const s = 0.8 + r() * 0.5;
  box(1.1 * s, 5 * s, 1.1 * s, mat('#8a5a3a'), x, 2.5 * s, z, g);
  const greens = ['#4caf50', '#5cc95f', '#3f9a48', '#6fd16a'];
  box(5.5 * s, 3.6 * s, 5.5 * s, mat(greens[Math.floor(r() * 4)]), x, 6.2 * s, z, g);
  box(3.8 * s, 2.4 * s, 3.8 * s, mat(greens[Math.floor(r() * 4)]), x, 8.8 * s, z, g);
}

export const lampPositions = [];
function lamp(g, x, z, rotY) {
  const lg = new THREE.Group(); lg.position.set(x, 0, z); lg.rotation.y = rotY; g.add(lg);
  box(0.45, 9, 0.45, mat('#3a3f4a'), 0, 4.5, 0, lg);
  box(0.3, 0.3, 2.2, mat('#3a3f4a'), 0, 8.9, 1, lg);
  box(1.1, 0.7, 1.1, lampMat, 0, 8.5, 2.0, lg);
  lg.updateMatrixWorld(true);
  lampPositions.push(new THREE.Vector3(0, 8.3, 2).applyMatrix4(lg.matrixWorld));
}

function textTexture(lines, w, h, style) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  style(ctx, w, h);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l) => { ctx.font = l.font; ctx.fillStyle = l.color; ctx.fillText(l.text, w / 2, l.y * h); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function buildTown(scene) {
  const r = rng(6);
  const stat = new THREE.Group();

  // ground, roads, sidewalks
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), mat('#79c565'));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const road = mat('#5d626b'), walk = mat('#d4d7da'), line = mat('#f3d35a');
  box(900, 0.1, 14, road, 0, 0.05, 0, stat);
  box(14, 0.1, 900, road, 0, 0.05, 0, stat);
  for (const s of [-1, 1]) {
    box(900, 0.3, 4, walk, 0, 0.15, s * 9, stat);
    box(4, 0.3, 900, walk, s * 9, 0.15, 0, stat);
  }
  for (let i = -440; i < 440; i += 8) {
    if (Math.abs(i) > 26) { box(4, 0.12, 0.4, line, i, 0.11, 0, stat); box(0.4, 0.12, 4, line, 0, 0.11, i, stat); }
  }
  // town square
  box(52, 0.35, 52, mat('#e6dcc8'), 0, 0.18, 0, stat);
  for (let i = -24; i <= 24; i += 4) { box(0.15, 0.37, 52, mat('#d2c6ae'), i, 0.19, 0, stat); box(52, 0.37, 0.15, mat('#d2c6ae'), 0, 0.19, i, stat); }
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 1.4, 24), mat('#c9c3b8'));
  fountain.position.set(0, 0.9, 0); stat.add(fountain);
  const fw = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 0.2, 24), mat('#7fd0ff', { roughness: 0.1 }));
  fw.position.set(0, 1.55, 0); stat.add(fw);
  const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 4, 12), mat('#c9c3b8')); fp.position.set(0, 3, 0); stat.add(fp);
  const fb = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 1.2, 0.8, 16), mat('#c9c3b8')); fb.position.set(0, 5.2, 0); stat.add(fb);
  for (const [bx, bz, ry] of [[-14, 12, 0], [14, 12, 0], [-14, -12, Math.PI], [14, -12, Math.PI]]) {
    const b = new THREE.Group(); b.position.set(bx, 0, bz); b.rotation.y = ry; stat.add(b);
    box(5, 0.4, 1.6, mat('#9a6a4a'), 0, 1.4, 0, b); box(5, 1.4, 0.3, mat('#9a6a4a'), 0, 2.3, -0.7, b);
    box(0.3, 1.2, 1.2, mat('#3a3f4a'), -2.2, 0.6, 0, b); box(0.3, 1.2, 1.2, mat('#3a3f4a'), 2.2, 0.6, 0, b);
  }
  for (const [tx, tz] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) tree(stat, tx, tz, r);

  // houses
  const EMMA = { x: 60, z: -24 };
  for (const side of [-1, 1]) {
    for (let x = -204; x <= 204; x += 24) {
      if (Math.abs(x) < 34) continue;
      if (side === -1 && x === 60) continue; // Emma's house slot
      house(stat, x, side * 24, side < 0 ? 0 : Math.PI, r, r() > 0.35 ? 2 : 1);
      if (r() > 0.25) tree(stat, x + 11, side * 15.5, r);
      house(stat, x + 12, side * 62, side < 0 ? Math.PI : 0, r, r() > 0.5 ? 2 : 1);
    }
    for (let z = 36; z <= 204; z += 24) {
      house(stat, side * 24, z, side < 0 ? Math.PI / 2 : -Math.PI / 2, r, r() > 0.4 ? 2 : 1);
      house(stat, side * 24, -z, side < 0 ? Math.PI / 2 : -Math.PI / 2, r, r() > 0.4 ? 2 : 1);
      if (r() > 0.3) tree(stat, side * 15.5, z + 11, r);
      if (r() > 0.3) tree(stat, side * 15.5, -z - 11, r);
    }
  }
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2, d = 230 + r() * 300;
    tree(stat, Math.cos(a) * d, Math.sin(a) * d, r);
  }
  for (let x = -200; x <= 200; x += 30) {
    if (Math.abs(x) < 30) continue;
    lamp(stat, x + 6, 10.5, Math.PI); lamp(stat, x - 6, -10.5, 0);
  }
  for (let z = 40; z <= 200; z += 30) { lamp(stat, 10.5, z, -Math.PI / 2); lamp(stat, -10.5, -z, Math.PI / 2); }
  mergeGroup(stat, scene);

  // warning sign in the square (kept separate: its own textured board)
  const signTex = textTexture([
    { text: 'STAY INSIDE', font: '900 150px ITTInter, sans-serif', color: '#2a1a12', y: 0.27 },
    { text: 'WHEN THE OCEAN', font: '900 118px ITTInter, sans-serif', color: '#2a1a12', y: 0.55 },
    { text: 'TURNS RED', font: '900 160px ITTInter, sans-serif', color: '#b3121b', y: 0.82 },
  ], 1024, 600, (ctx, w, h) => {
    ctx.fillStyle = '#e8d9b0'; ctx.fillRect(0, 0, w, h);
    const rr = rng(3);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(90,60,30,${rr() * 0.12})`; ctx.fillRect(rr() * w, rr() * h, 2 + rr() * 30, 1 + rr() * 3); }
    ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 26; ctx.strokeRect(13, 13, w - 26, h - 26);
    ctx.fillStyle = 'rgba(70,40,20,0.35)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(rr() * w, rr() * h, 10 + rr() * 26, 0, 7); ctx.fill(); }
  });
  const sign = new THREE.Group(); sign.position.set(9, 0, -16); sign.rotation.set(0, -0.12, 0.025); scene.add(sign);
  box(0.6, 7.5, 0.6, mat('#5a3a1e'), -3.8, 3.75, 0, sign); box(0.6, 7.5, 0.6, mat('#5a3a1e'), 3.8, 3.75, 0, sign);
  const board = new THREE.Mesh(new THREE.BoxGeometry(8.4, 4.9, 0.3),
    [mat('#6a4a2a'), mat('#6a4a2a'), mat('#6a4a2a'), mat('#6a4a2a'), patchSign(signTex), mat('#6a4a2a')]);
  board.position.set(0, 5.1, 0.35); board.castShadow = true; sign.add(board);

  const emma = buildEmmaHouse(scene, EMMA.x, EMMA.z);
  return { emma, sign, signPos: new THREE.Vector3(9, 5.1, -15.6), EMMA };
}

function patchSign(tex) {
  return patchCaustics(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
}

// --- Emma's house: walls with openings, two floors, staircase ---
function buildEmmaHouse(scene, cx, cz) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz); scene.add(g);
  const W = 16, D = 14, H = 14;
  const ext = mat('#ffd9b8'), trim = mat('#ffffff');
  const inUp = mat('#d9d2f2', { caustic: false }), inDown = mat('#f3e6cf', { caustic: false });
  const front = [
    { x0: -3.2, x1: 3.2, y0: 8.8, y1: 13.6 },   // bedroom window
    { x0: -5.8, x1: -1.6, y0: 1.0, y1: 6.8 },   // tall living-room window
    { x0: 0.6, x1: 3.6, y0: 0, y1: 5.6 },       // front door
  ];
  const T = 0.35;
  // exterior + interior layers of the front wall (z = +D/2)
  for (const [m, z, layerH] of [[ext, D / 2 - T / 2, H], [inDown, D / 2 - T * 1.5, 7], [inUp, D / 2 - T * 1.5, H]]) {
    const holes = front;
    wallRects(W, layerH, holes).forEach((q) => {
      if (m === inUp && q.y1 <= 7.4) return;
      const y0 = m === inUp ? Math.max(q.y0, 7.4) : q.y0;
      if (q.y1 - y0 <= 0.01) return;
      box(q.x1 - q.x0, q.y1 - y0, T, m, (q.x0 + q.x1) / 2, (y0 + q.y1) / 2, z, g, m === ext);
    });
  }
  // other walls (solid, with a side window on the right)
  const sideHoles = [{ x0: -2, x1: 2, y0: 9.4, y1: 12.6 }];
  for (const [m, inset, lo, hi] of [[ext, 0, 0, H], [inDown, T, 0, 7], [inUp, T, 7.4, H]]) {
    const isExt = m === ext;
    // back
    box(W, hi - lo, T, m, 0, (lo + hi) / 2, -D / 2 + T / 2 + inset, g, isExt);
    // left (solid)
    box(T, hi - lo, D, m, -W / 2 + T / 2 + inset, (lo + hi) / 2, 0, g, isExt);
    // right with window
    wallRects(D, H, sideHoles).forEach((q) => {
      const y0 = Math.max(q.y0, lo), y1 = Math.min(q.y1, hi); if (y1 - y0 <= 0.01) return;
      const b = box(q.x1 - q.x0, y1 - y0, T, m, W / 2 - T / 2 - inset, (y0 + y1) / 2, -(q.x0 + q.x1) / 2, g, isExt);
      b.rotation.y = Math.PI / 2;
    });
  }
  // window frames / glass on front
  const glass = new THREE.MeshStandardMaterial({ color: '#bfe4ff', transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false });
  for (const o of front.slice(0, 2)) {
    box(o.x1 - o.x0, o.y1 - o.y0, 0.05, glass, (o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2, D / 2 - T, g, false);
    box(o.x1 - o.x0 + 0.6, 0.35, 0.6, trim, (o.x0 + o.x1) / 2, o.y0 - 0.1, D / 2, g);
    box(o.x1 - o.x0 + 0.6, 0.3, 0.45, trim, (o.x0 + o.x1) / 2, o.y1 + 0.1, D / 2, g);
  }
  // door (closed) with small window
  const door = box(3, 5.6, 0.3, mat('#2f5a8a', { caustic: false }), 2.1, 2.8, D / 2 - T, g);
  box(1.4, 1.2, 0.34, glass, 2.1, 4.3, D / 2 - T, g, false);
  box(0.25, 0.25, 0.5, mat('#e8c24a', { caustic: false }), 3.1, 2.7, D / 2 - T - 0.2, g, false);
  // roof + porch + ceilings
  const roof = new THREE.Mesh(roofGeo, mat('#c2545a'));
  roof.scale.set((W + 2.2) / Math.SQRT2, 6.5, (D + 2.2) / Math.SQRT2); roof.position.y = H; roof.castShadow = true; g.add(roof);
  box(W + 0.4, 0.4, D + 0.4, mat('#f1e9e0'), 0, H + 0.1, 0, g);
  box(6, 0.35, 3, mat('#d8d8d8'), 2.1, 0.18, D / 2 + 1.5, g);
  box(W, 0.5, 1.2, mat('#4f9a4a'), 0, 0.25, D / 2 + 5, g);
  // floors
  const wood = mat('#b98a5e', { caustic: false }), wood2 = mat('#a87a50', { caustic: false });
  box(W - 0.8, 0.1, D - 0.8, wood, 0, 0.05, 0, g, false);
  box(W - 0.8, 0.4, D - 3.9 - 0.8, wood2, 0, 7.2, 1.55, g, false);          // upper slab (front part)
  box(W - 0.8, 0.3, D - 0.8, mat('#f4f0f6', { caustic: false }), 0, H - 0.25, 0, g, false); // ceiling
  // staircase along the back wall: top at local x=+6, bottom at x=-6
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const top = 7.4 * (steps - i) / steps;
    box(1, top, 3.1, wood2, 6 - (i + 0.5), top / 2, -5.0, g, false);
  }
  // railing at the edge of the stair opening
  const rail = mat('#ffffff', { caustic: false });
  box(11.5, 0.2, 0.2, rail, -1.3, 10.4, -3.2, g, false);
  for (let x = -7; x <= 4.2; x += 1.4) box(0.14, 3, 0.14, rail, x, 8.9, -3.2, g, false);
  // bedroom props
  box(4.2, 1.2, 6.5, mat('#ffffff', { caustic: false }), -5.4, 8.0, 0.5, g, false);
  box(4.2, 0.5, 6.5, mat('#ff9ec6', { caustic: false }), -5.4, 8.8, 0.8, g, false);
  box(3.6, 0.6, 1.4, mat('#ffffff', { caustic: false }), -5.4, 9.2, -2.2, g, false);
  box(0.4, 3.4, 6.5, mat('#8a5a3a', { caustic: false }), -7.5, 9.1, 0.5, g, false);
  box(3, 2.4, 1.5, mat('#ffffff', { caustic: false }), 5.6, 8.6, 3.3, g, false);
  box(5.2, 0.08, 4, mat('#ffe27a', { caustic: false }), 0.5, 7.42, 3.0, g, false);
  const poster = textTexture([{ text: '★', font: '160px sans-serif', color: '#ffffff', y: 0.5 }], 256, 256,
    (ctx, w, h) => { const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6a5cff'); gr.addColorStop(1, '#ff6ac1'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); });
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3), new THREE.MeshStandardMaterial({ map: poster }));
  pm.position.set(-7.4, 11, 4.5); pm.rotation.y = Math.PI / 2; g.add(pm);
  // living room props
  box(6, 1.6, 2.4, mat('#6a8acb', { caustic: false }), -4, 0.9, -1.5, g, false);
  box(6, 2.2, 0.8, mat('#5a7aba', { caustic: false }), -4, 1.9, -2.5, g, false);
  box(7, 0.06, 5, mat('#d06a5a', { caustic: false }), -2, 0.12, 1.8, g, false);
  box(0.3, 5.5, 0.3, mat('#5a3a1e', { caustic: false }), 6.6, 2.75, 5.6, g, false);
  const frame = textTexture([], 256, 200, (ctx, w, h) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#8fd0ff'; ctx.fillRect(14, 14, w - 28, h - 28); ctx.fillStyle = '#3a7a3a'; ctx.fillRect(14, h * 0.6, w - 28, h * 0.4 - 14); });
  const fm = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2), new THREE.MeshStandardMaterial({ map: frame }));
  fm.position.set(-7.4, 4.4, 1.5); fm.rotation.y = Math.PI / 2; g.add(fm);

  // interior lights
  const warmUp = new THREE.PointLight('#ffd8a8', 30, 22, 1.6); warmUp.position.set(0, 12.8, 0); g.add(warmUp);
  const warmDown = new THREE.PointLight('#ffd8a8', 30, 22, 1.6); warmDown.position.set(-1, 6, -1); g.add(warmDown);
  const redUp = new THREE.PointLight('#ff2a2a', 0, 30, 1.2); redUp.position.set(0, 11.5, D / 2 + 3); g.add(redUp);
  const redDown = new THREE.PointLight('#ff2a2a', 0, 30, 1.2); redDown.position.set(-2, 5, D / 2 + 3); g.add(redDown);

  const local = (x, y, z) => new THREE.Vector3(cx + x, y, cz + z);
  return {
    group: g, door, warmUp, warmDown, redUp, redDown, local,
    bedroomWindow: local(0, 11.2, D / 2), livingWindow: local(-3.4, 3.9, D / 2),
    stairTop: local(6.2, 7.4, -5), stairBottom: local(-6.4, 0.0, -5),
  };
}
