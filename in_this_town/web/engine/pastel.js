// Pastel neighbourhood kit (Episode 23): detailed suburban cottages (lap siding, trims, shutters, flower boxes, porch, cross gable,
// chimney), picket fences, mailboxes (new and old), flower beds, the street, a furnished cottage interior with photographs, an
// Adopt-Me-style pet shop, and a reveal / dissolve shader for a house that builds up out of light and later fades away.
//   const c = cottage({ wall: '#f7c6d4', seed: 3 });  scene.add(c.g);     c.edges: its outline as segments (for a glowing sketch)
import * as THREE from 'three';
import { v3, rng, clamp } from './core.js';
import { Batch, surf, paint } from './kit.js';
import { canvasTex } from './props.js';

export const PASTEL = ['#f7c6d4', '#bfe0f7', '#cdeec4', '#fde7a8', '#dccbf6', '#ffd3b0', '#c4efe8', '#f9d9e8'];
const DOORS = ['#d9536f', '#4a7fc0', '#3f8f6a', '#e08a3a', '#7d5cc0', '#2f5a7a'];
const ROOFS = ['#8a4a5a', '#5a6fa0', '#6a5a8a', '#4f7a6a', '#a0604a', '#7a6a7a'];

// shared window glass: lit at night through emissiveIntensity (an episode sets WIN.emissiveIntensity)
export const WIN = new THREE.MeshStandardMaterial({ color: '#9fc4e0', roughness: 0.08, metalness: 0.5, emissive: '#ffc77a', emissiveIntensity: 0 });

// ---- the house that appears and disappears: one set of uniforms drives every material it owns ----
// level 0..1: how much shows. mode 0 = builds up from the ground with a bright line; mode 1 = dissolves in noisy flecks.
export function revealUniforms() { return { uLevel: { value: 1 }, uMode: { value: 0 }, uH0: { value: 0 }, uH1: { value: 20 }, uEdge: { value: new THREE.Color('#ffd36a') } }; }
export function revealMat(m, U) {
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRW;').replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vRW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vRW; uniform float uLevel, uMode, uH0, uH1; uniform vec3 uEdge;
      float rh(vec3 p){ return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(rh(i), rh(i + vec3(1,0,0)), f.x), mix(rh(i + vec3(0,1,0)), rh(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(rh(i + vec3(0,0,1)), rh(i + vec3(1,0,1)), f.x), mix(rh(i + vec3(0,1,1)), rh(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      float hy = clamp((vRW.y - uH0) / (uH1 - uH0), 0.0, 1.0);
      float nz = vn(vRW * 0.9) * 0.6 + vn(vRW * 2.7) * 0.4;
      float key = mix(hy * 0.92 + nz * 0.08, nz, uMode);
      float lev = mix(uLevel * 1.12 - 0.06, uLevel * 1.2 - 0.1, uMode);
      if (key > lev) discard;
      float edgeK = 1.0 - smoothstep(0.0, mix(0.035, 0.06, uMode), lev - key);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += uEdge * edgeK * 4.0 * step(uLevel, 0.999) * step(0.001, uLevel);`);
  };
  m.customProgramCacheKey = () => 'reveal23';
  return m;
}

// ---- a cottage ----
// o: w, d, h (wall height), wall, trim, roof, door, shutter, seed, own (its own materials, for revealMat), lit, porch, flowers
export function cottage(o = {}) {
  const r = rng(o.seed || 1), w = o.w ?? 22, d = o.d ?? 16, h = o.h ?? 9, B = 1.0;   // B: the plinth's top
  const mats = [];
  const own = (m) => { if (!o.own) return m; const k = m.clone(); mats.push(k); return k; };
  const wall = own(surf('siding', o.wall || PASTEL[Math.floor(r() * PASTEL.length)])), trim = own(paint(o.trim || '#fffaf2', { roughness: 0.5 }));
  const roofM = own(surf('shingle', o.roof || ROOFS[Math.floor(r() * ROOFS.length)])), stone = own(surf('cobble', '#c9c2b8'));
  const doorM = own(paint(o.door || DOORS[Math.floor(r() * DOORS.length)], { roughness: 0.4 })), shutterM = own(surf('siding', o.shutter || '#ffffff'));
  const brick = own(surf('brick', '#b8735a')), deck = own(surf('plank', '#d8c2a2')), metal = own(paint('#d9b24a', { metalness: 0.9, roughness: 0.3 }));
  const dark = own(paint('#5a5048', { roughness: 0.6 })), glass = o.own ? own(WIN) : WIN, leaf = own(paint('#4f9a4a', { roughness: 0.8 }));
  const b = new Batch(), edges = [], E = (a, c) => edges.push([v3(...a), v3(...c)]);
  const top = B + h, rise = o.rise ?? d * 0.42;
  // plinth and walls
  b.box(stone, w + 0.6, B, d + 0.6, 0, B / 2, 0, { r: 0.08 });
  b.box(wall, w, h, d, 0, B + h / 2, 0, { r: 0.04 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(trim, 0.55, h, 0.55, sx * w / 2, B + h / 2, sz * d / 2, { r: 0.06 });
  b.box(trim, w + 0.4, 0.6, d + 0.4, 0, top - 0.3, 0, { r: 0.06 });          // frieze
  b.box(trim, w + 0.3, 0.35, d + 0.3, 0, B + 0.18, 0, { r: 0.05 });          // water table
  // the main roof: slopes to front and back, gables at the sides
  const run = d / 2 + 1.3, len = Math.hypot(run, rise), ang = Math.atan2(rise, run);
  for (const s of [-1, 1]) b.box(roofM, w + 2.2, 0.45, len, 0, top + rise / 2 - 0.25, s * (run / 2 - 0.05), { rx: s * ang, r: 0.06 });
  b.box(dark, w + 2.4, 0.4, 0.7, 0, top + rise + 0.05, 0, { r: 0.12 });     // ridge cap
  const tri = (ww, hh, depth) => new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-ww / 2, 0), new THREE.Vector2(ww / 2, 0), new THREE.Vector2(0, hh)]), { depth, bevelEnabled: false });
  { const g = tri(d, rise, w - 0.1); g.translate(0, 0, -(w - 0.1) / 2); b.add(wall, g, 0, top, 0, Math.PI / 2); }
  for (const s of [-1, 1]) {   // fascia, gutters, rake boards
    b.box(trim, w + 2.3, 0.45, 0.28, 0, top - 0.55, s * (d / 2 + 1.3), { r: 0.05 });
    b.cyl(own(paint('#e8e2d8', { metalness: 0.3, roughness: 0.4 })), 0.16, 0.16, w + 2.2, 0, top - 0.75, s * (d / 2 + 1.45), { rz: Math.PI / 2, seg: 10 });
    for (const sz of [-1, 1]) b.box(trim, 0.3, 0.42, len, s * (w / 2 + 1.1), top + rise / 2 - 0.2, sz * (run / 2 - 0.05), { rx: sz * ang, r: 0.05 });
    const ow = own(WIN); ow.emissive = new THREE.Color('#ffc77a'); b.cyl(trim, 1.15, 1.15, 0.3, s * (w / 2 + 0.06), top + rise * 0.38, 0, { rz: Math.PI / 2, seg: 24 }); b.cyl(glass, 0.85, 0.85, 0.34, s * (w / 2 + 0.08), top + rise * 0.38, 0, { rz: Math.PI / 2, seg: 24 });
  }
  // a front cross gable over the door
  const gw = w * 0.42, r2 = gw * 0.55, run2 = gw / 2 + 0.7, len2 = Math.hypot(run2, r2), ang2 = Math.atan2(r2, run2), gz = d / 2;
  { const g = tri(gw, r2, gz); b.add(wall, g, 0, top, 0); }
  for (const s of [-1, 1]) { b.box(roofM, len2, 0.42, gz + 1.5, s * (run2 / 2 - 0.05), top + r2 / 2 - 0.2, gz / 2 + 0.75, { rz: -s * ang2, r: 0.06 }); b.box(trim, len2, 0.4, 0.3, s * (run2 / 2 - 0.05), top + r2 / 2 - 0.2, gz + 1.45, { rz: -s * ang2, r: 0.05 }); }
  b.box(dark, 0.6, 0.38, gz + 1.6, 0, top + r2 + 0.02, gz / 2 + 0.75, { r: 0.1 });
  b.box(trim, 2.4, 1.6, 0.25, 0, top + r2 * 0.38, gz + 0.1, { r: 0.08 }); b.box(glass, 1.9, 1.15, 0.3, 0, top + r2 * 0.38, gz + 0.12, { r: 0.05 });
  // chimney
  const cx = -w * 0.3, cz = -d * 0.12, ch = rise + 3.4;
  b.box(brick, 2.2, ch, 2.2, cx, top + ch / 2 - 0.5, cz, { r: 0.06 }); b.box(stone, 2.7, 0.4, 2.7, cx, top + ch - 0.3, cz, { r: 0.08 });
  b.cyl(dark, 0.4, 0.4, 0.7, cx, top + ch + 0.2, cz);
  // windows: frame, glass, cross mullions, sill, louvred shutters, flower box under the front ones
  const win = (x, y, z, ry, ww = 2.8, wh = 3.4, front = false) => {
    const c = Math.cos(ry), s = Math.sin(ry), at = (u, yy, out) => [x + c * u + s * out, yy, z - s * u + c * out];
    b.box(trim, ww + 0.6, wh + 0.6, 0.3, ...at(0, y, 0.05), { ry, r: 0.06 });
    b.box(glass, ww, wh, 0.12, ...at(0, y, 0.12), { ry, r: 0.02 });
    b.box(trim, 0.16, wh, 0.2, ...at(0, y, 0.2), { ry, r: 0.03 }); b.box(trim, ww, 0.16, 0.2, ...at(0, y + 0.2, 0.2), { ry, r: 0.03 });
    b.box(trim, ww + 1.0, 0.24, 0.7, ...at(0, y - wh / 2 - 0.35, 0.3), { ry, r: 0.06 });
    for (const sd of [-1, 1]) b.box(shutterM, ww * 0.42, wh + 0.2, 0.16, ...at(sd * (ww / 2 + ww * 0.25 + 0.15), y, 0.18), { ry, r: 0.03 });
    if (front && o.flowers !== false) {
      b.box(own(surf('plank', '#a0704a')), ww + 0.8, 0.7, 0.9, ...at(0, y - wh / 2 - 0.9, 0.6), { ry, r: 0.06 });
      for (let i = 0; i < 7; i++) { const col = ['#ff6fa0', '#ffd24a', '#ffffff', '#b07aff', '#ff8a5a'][Math.floor(r() * 5)]; b.box(leaf, 0.5, 0.4, 0.5, ...at(-ww / 2 + 0.2 + i * (ww / 6), y - wh / 2 - 0.42, 0.62), { ry, r: 0.15 }); b.box(own(paint(col, { roughness: 0.6 })), 0.34, 0.34, 0.34, ...at(-ww / 2 + 0.2 + i * (ww / 6) + 0.1, y - wh / 2 - 0.2, 0.7), { ry, r: 0.14 }); }
    }
    edges.push([v3(...at(-ww / 2 - 0.3, y - wh / 2 - 0.3, 0.25)), v3(...at(ww / 2 + 0.3, y - wh / 2 - 0.3, 0.25))], [v3(...at(-ww / 2 - 0.3, y + wh / 2 + 0.3, 0.25)), v3(...at(ww / 2 + 0.3, y + wh / 2 + 0.3, 0.25))],
      [v3(...at(-ww / 2 - 0.3, y - wh / 2 - 0.3, 0.25)), v3(...at(-ww / 2 - 0.3, y + wh / 2 + 0.3, 0.25))], [v3(...at(ww / 2 + 0.3, y - wh / 2 - 0.3, 0.25)), v3(...at(ww / 2 + 0.3, y + wh / 2 + 0.3, 0.25))]);
  };
  const wy = B + h * 0.52;
  for (const x of [-w * 0.32, w * 0.32]) { win(x, wy, d / 2, 0, 3.0, 3.6, true); win(x, wy, -d / 2, Math.PI); }
  for (const s of [-1, 1]) for (const z of [-d * 0.22, d * 0.22]) win(s * w / 2, wy, z, s * Math.PI / 2, 2.4, 3.2);
  // the front door: frame, a leaf on its hinge (c.door), a fan light, knob, number, a porch lamp
  const dw = 3.2, dh = 6.4;
  b.box(trim, dw + 0.9, dh + 0.6, 0.4, 0, B + dh / 2 + 0.2, d / 2 + 0.05, { r: 0.06 });
  b.box(own(paint('#3a2a22', { roughness: 0.8 })), dw, dh, 0.1, 0, B + dh / 2, d / 2 + 0.02, { r: 0.02 });   // the dark opening behind the leaf
  b.cyl(trim, 1.75, 1.75, 0.36, 0, B + dh + 0.25, d / 2 + 0.08, { rx: Math.PI / 2, seg: 24 });
  b.box(own(paint(String(o.number ?? (10 + Math.floor(r() * 80))).length ? '#2a2a2a' : '#2a2a2a')), 0.9, 0.5, 0.06, dw / 2 + 1.0, B + dh * 0.8, d / 2 + 0.06, { r: 0.04 });
  const door = new THREE.Group(); door.position.set(-dw / 2, B, d / 2 + 0.12);
  { const db = new Batch(); db.box(doorM, dw, dh, 0.22, dw / 2, dh / 2, 0, { r: 0.04 });
    for (const y of [0.25, 0.55]) db.box(doorM, dw * 0.7, dh * 0.22, 0.1, dw / 2, dh * y, 0.13, { r: 0.03 });
    db.box(glass, dw * 0.6, dh * 0.18, 0.1, dw / 2, dh * 0.82, 0.12, { r: 0.03 });
    db.cyl(metal, 0.14, 0.14, 0.3, dw - 0.45, dh * 0.48, 0.2, { rx: Math.PI / 2 }); db.done(door); }
  const lampM = own(new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: '#ffcf7a', emissiveIntensity: 0, roughness: 0.3 }));
  b.box(metal, 0.5, 0.9, 0.5, dw / 2 + 0.9, B + dh * 0.72, d / 2 + 0.3, { r: 0.08 }); b.box(lampM, 0.36, 0.6, 0.4, dw / 2 + 0.9, B + dh * 0.72, d / 2 + 0.45, { r: 0.06 });
  // the porch: deck, steps, columns, rails, a little shed roof
  if (o.porch !== false) {
    const pw = gw + 2, pd = 4.2, pz = d / 2 + pd / 2;
    b.box(deck, pw, 0.4, pd, 0, B - 0.2, pz, { r: 0.05 }); b.box(trim, pw + 0.2, 0.35, pd + 0.2, 0, B - 0.5, pz, { r: 0.05 });
    for (let i = 0; i < 2; i++) b.box(stone, 4.2, B - 0.4 - i * 0.45, 1.1, 0, (B - 0.4 - i * 0.45) / 2, d / 2 + pd + 0.5 + (1 - i) * 1.0 - 0.5, { r: 0.06 });
    const ph = h * 0.74;
    for (const s of [-1, 1]) { b.box(trim, 0.6, ph, 0.6, s * (pw / 2 - 0.4), B + ph / 2, d / 2 + pd - 0.4, { r: 0.1 }); b.box(trim, 0.9, 0.4, 0.9, s * (pw / 2 - 0.4), B + 0.2, d / 2 + pd - 0.4, { r: 0.08 }); }
    b.box(roofM, pw + 1.2, 0.36, pd + 1.2, 0, B + ph + 0.5, d / 2 + pd / 2 + 0.3, { rx: 0.16, r: 0.05 }); b.box(trim, pw + 1.1, 0.5, 0.3, 0, B + ph + 0.15, d / 2 + pd + 0.85, { r: 0.05 });
    for (const s of [-1, 1]) {   // rails on both sides of the steps
      const x0 = s * 2.3, x1 = s * (pw / 2 - 0.4), z = d / 2 + pd - 0.4;
      b.box(trim, Math.abs(x1 - x0), 0.2, 0.25, (x0 + x1) / 2, B + 2.4, z, { r: 0.05 }); for (let x = Math.min(x0, x1) + 0.3; x < Math.max(x0, x1); x += 0.45) b.box(trim, 0.14, 2.2, 0.14, x, B + 1.2, z, { r: 0.03 });
      b.box(trim, 0.25, 0.2, pd - 0.6, x1, B + 2.4, d / 2 + pd / 2 - 0.1, { r: 0.05 }); for (let zz = d / 2 + 0.4; zz < z; zz += 0.45) b.box(trim, 0.14, 2.2, 0.14, x1, B + 1.2, zz, { r: 0.03 });
    }
  }
  // outline: the walls' edges, the roof, the front gable, the door, the chimney
  const X = w / 2, Z = d / 2;
  for (const [a, c] of [[[-X, B, -Z], [X, B, -Z]], [[X, B, -Z], [X, B, Z]], [[X, B, Z], [-X, B, Z]], [[-X, B, Z], [-X, B, -Z]],
    [[-X, top, -Z], [X, top, -Z]], [[X, top, -Z], [X, top, Z]], [[X, top, Z], [-X, top, Z]], [[-X, top, Z], [-X, top, -Z]],
    [[-X, B, -Z], [-X, top, -Z]], [[X, B, -Z], [X, top, -Z]], [[X, B, Z], [X, top, Z]], [[-X, B, Z], [-X, top, Z]],
    [[-X - 1.1, top - 0.4, Z + 1.3], [-X - 1.1, top + rise, 0]], [[-X - 1.1, top + rise, 0], [-X - 1.1, top - 0.4, -Z - 1.3]],
    [[X + 1.1, top - 0.4, Z + 1.3], [X + 1.1, top + rise, 0]], [[X + 1.1, top + rise, 0], [X + 1.1, top - 0.4, -Z - 1.3]],
    [[-X - 1.1, top + rise, 0], [X + 1.1, top + rise, 0]], [[-X - 1.1, top - 0.4, Z + 1.3], [X + 1.1, top - 0.4, Z + 1.3]], [[-X - 1.1, top - 0.4, -Z - 1.3], [X + 1.1, top - 0.4, -Z - 1.3]],
    [[-gw / 2 - 0.7, top - 0.3, Z + 1.5], [0, top + r2, Z + 1.5]], [[0, top + r2, Z + 1.5], [gw / 2 + 0.7, top - 0.3, Z + 1.5]],
    [[-dw / 2 - 0.45, B, Z + 0.3], [-dw / 2 - 0.45, B + dh + 0.5, Z + 0.3]], [[dw / 2 + 0.45, B, Z + 0.3], [dw / 2 + 0.45, B + dh + 0.5, Z + 0.3]], [[-dw / 2 - 0.45, B + dh + 0.5, Z + 0.3], [dw / 2 + 0.45, B + dh + 0.5, Z + 0.3]],
    [[cx - 1.1, top + 1.5, cz + 1.1], [cx - 1.1, top + ch, cz + 1.1]], [[cx + 1.1, top + 1.5, cz + 1.1], [cx + 1.1, top + ch, cz + 1.1]], [[cx - 1.1, top + ch, cz + 1.1], [cx + 1.1, top + ch, cz + 1.1]]]) E(a, c);
  const g = b.done(); g.add(door);
  return { g, edges, door, mats, lampM, size: { w, d, h, top, rise }, doorAt: v3(0, B, d / 2) };
}

// ---- yard pieces, added to a Batch at world positions ----
export function picket(b, x0, x1, z, o = {}) {
  const m = o.mat || paint('#fffaf2', { roughness: 0.5 }), hgt = o.h ?? 2.6, gap = o.gap;
  b.box(m, Math.abs(x1 - x0), 0.25, 0.18, (x0 + x1) / 2, hgt * 0.35, z, { r: 0.04 }); b.box(m, Math.abs(x1 - x0), 0.25, 0.18, (x0 + x1) / 2, hgt * 0.75, z, { r: 0.04 });
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 0.62) {
    if (gap && x > gap[0] && x < gap[1]) continue;
    b.box(m, 0.36, hgt, 0.14, x, hgt / 2, z + 0.12, { r: 0.04 }); b.add(m, new THREE.ConeGeometry(0.25, 0.4, 4), x, hgt + 0.18, z + 0.12, Math.PI / 4);
  }
}
// a mailbox at the kerb: a new painted one, or old (rusty, dented, leaning, flag down)
export function mailbox(o = {}) {
  const old = !!o.old, b = new Batch(), g = new THREE.Group();
  const post = old ? surf('plank', '#6a5848') : paint('#f2ece0', { roughness: 0.5 });
  const body = old ? paint('#7d6a58', { roughness: 0.75, metalness: 0.35 }) : paint(o.color || '#4a7fc0', { roughness: 0.35, metalness: 0.4 });
  b.box(post, 0.42, 3.6, 0.42, 0, 1.8, 0, { r: 0.05 });
  b.box(post, 1.0, 0.24, 1.6, 0, 3.6, 0, { r: 0.04 });
  b.box(body, 1.1, 0.9, 1.9, 0, 4.15, 0.05, { r: 0.08 }); b.cyl(body, 0.55, 0.55, 1.9, 0, 4.55, 0.05, { rx: Math.PI / 2, seg: 20 });
  b.box(old ? paint('#5a4a3c', { roughness: 0.8, metalness: 0.3 }) : body, 1.14, 1.4, 0.08, 0, 4.25, 1.0, { r: 0.04 });
  if (old) for (const [x, y, z, s] of [[0.5, 4.3, 0.5, 0.35], [-0.5, 4.0, -0.3, 0.4], [0.3, 4.8, -0.4, 0.3], [-0.2, 4.5, 0.8, 0.25]]) b.box(paint('#a5562a', { roughness: 0.95, metalness: 0.2 }), s, s * 0.8, s, x * 1.02, y, z, { r: 0.1 });   // rust
  const flag = paint(old ? '#8a4a3a' : '#e04a4a', { roughness: 0.5 });
  b.box(flag, 0.08, old ? 0.18 : 0.9, old ? 0.9 : 0.18, 0.6, old ? 4.0 : 4.6, old ? 0.2 : -0.3, { r: 0.02 });
  if (!old) b.box(flag, 0.08, 0.4, 0.5, 0.6, 5.0, -0.1, { r: 0.02 });
  b.done(g);
  if (old) g.rotation.z = 0.08;
  // the name plate: faded on the old one
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.4), new THREE.MeshStandardMaterial({ map: canvasTex(256, 100, (x, w, h) => {
    x.fillStyle = old ? '#d8ccb4' : '#ffffff'; x.fillRect(0, 0, w, h); x.font = '900 56px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = old ? 'rgba(90,70,50,0.25)' : '#2a3a5a'; x.fillText(o.name || (old ? '? ? ?' : 'LILY'), w / 2, h / 2 + 4);
    if (old) { x.strokeStyle = 'rgba(120,100,80,0.5)'; x.lineWidth = 3; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(20 + i * 26, 12); x.lineTo(40 + i * 24, 88); x.stroke(); } }
  }), roughness: 0.7 }));
  plate.position.set(0.58, 4.2, 0.1); plate.rotation.y = Math.PI / 2; g.add(plate);
  return g;
}
// flower heads and leaves for beds: instanced, coloured per head
export function flowers(parent, spots, o = {}) {
  const n = spots.length, cols = o.colors || ['#ff6fa0', '#ffd24a', '#ffffff', '#b07aff', '#ff8a5a', '#ff9ec4'], r = rng(o.seed || 4);
  const head = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.26, 1), new THREE.MeshStandardMaterial({ roughness: 0.55 }), n);
  const stem = new THREE.InstancedMesh(new THREE.ConeGeometry(0.3, 0.9, 5), new THREE.MeshStandardMaterial({ color: '#4f9a4a', roughness: 0.8 }), n);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  spots.forEach((p, i) => { const s = 0.8 + r() * 0.5; M.compose(v3(p.x, 0.45 * s, p.z), q, v3(s, s, s)); stem.setMatrixAt(i, M); M.compose(v3(p.x, 0.95 * s, p.z), q, v3(s, s * 0.8, s)); head.setMatrixAt(i, M); head.setColorAt(i, c.set(cols[Math.floor(r() * cols.length)])); });
  for (const m of [head, stem]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; parent.add(m); }
  head.instanceColor.needsUpdate = true;
  return { head, stem };
}

// ---- photographs: the same little girl, her face erased (or back) ----
// kind: 'dragon' | 'house' | 'swing' | 'cake' | 'shop'; face: a canvas (an Alti face) or null (erased)
export function photoTex(kind, face, o = {}) {
  return canvasTex(512, 640, (x, w, h) => {
    const r = rng(kind.length * 13 + 3);
    // the scene behind her
    const sky = x.createLinearGradient(0, 0, 0, h); const BG = { dragon: ['#ffe2b8', '#ffd08a'], house: ['#a8d8ff', '#e8f6ff'], swing: ['#ffd6e6', '#fff0c8'], cake: ['#ffe9f2', '#f5c8dc'], shop: ['#c8f0e4', '#fff4d6'] }[kind];
    sky.addColorStop(0, BG[0]); sky.addColorStop(1, BG[1]); x.fillStyle = sky; x.fillRect(0, 0, w, h);
    if (kind === 'house' || kind === 'swing') { x.fillStyle = '#8fd07a'; x.fillRect(0, h * 0.72, w, h * 0.28); }
    if (kind === 'house') { x.fillStyle = '#fde7a8'; x.fillRect(250, 210, 230, 220); x.fillStyle = '#8a4a5a'; x.beginPath(); x.moveTo(230, 215); x.lineTo(365, 120); x.lineTo(500, 215); x.fill(); x.fillStyle = '#d9536f'; x.fillRect(340, 330, 50, 100); x.fillStyle = '#9fc4e0'; x.fillRect(270, 260, 50, 50); x.fillRect(420, 260, 50, 50); }
    if (kind === 'swing') { x.strokeStyle = '#7a5030'; x.lineWidth = 14; x.beginPath(); x.moveTo(60, 60); x.lineTo(460, 60); x.stroke(); x.lineWidth = 4; x.strokeStyle = '#ddd'; x.beginPath(); x.moveTo(170, 60); x.lineTo(170, 430); x.moveTo(340, 60); x.lineTo(340, 430); x.stroke(); }
    if (kind === 'cake') { x.fillStyle = '#ffffff'; x.fillRect(150, 470, 210, 90); x.fillStyle = '#ff8fb8'; x.fillRect(150, 470, 210, 22); for (let i = 0; i < 5; i++) { x.fillStyle = '#fff6a0'; x.fillRect(180 + i * 38, 430, 8, 40); x.fillStyle = '#ffb020'; x.beginPath(); x.ellipse(184 + i * 38, 422, 7, 11, 0, 0, 7); x.fill(); } }
    if (kind === 'shop') { for (let i = 0; i < 5; i++) { x.fillStyle = ['#ffd24a', '#7ad0ff', '#ff8fb8', '#b9f28a', '#c8a8ff'][i]; x.beginPath(); x.ellipse(60 + i * 100, 120, 30, 40, 0, 0, 7); x.fill(); } }
    if (kind === 'dragon' || kind === 'swing') for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.4})`; x.beginPath(); x.arc(r() * w, r() * h * 0.6, 2 + r() * 5, 0, 7); x.fill(); }
    // the girl: a blocky body, yellow plaid dress, blonde pigtails
    const cx = kind === 'house' ? 150 : 256, top = kind === 'swing' ? 150 : 170, S = kind === 'swing' ? 0.9 : 1;
    x.save(); x.translate(cx, top); x.scale(S, S);
    x.fillStyle = '#f2d36a'; x.fillRect(-70, 140, 140, 150);                      // dress
    x.strokeStyle = 'rgba(220,170,40,0.7)'; x.lineWidth = 6; for (let i = -60; i <= 60; i += 30) { x.beginPath(); x.moveTo(i, 140); x.lineTo(i, 290); x.stroke(); x.beginPath(); x.moveTo(-70, 160 + (i + 60)); x.lineTo(70, 160 + (i + 60)); x.stroke(); }
    x.fillStyle = '#2f6db8'; x.fillRect(-70, 140, 140, 26);                         // the blue collar band
    x.fillStyle = '#f1c9a0'; x.fillRect(-104, 150, 34, 120); x.fillRect(70, 150, 34, 120); x.fillRect(-60, 290, 50, 110); x.fillRect(10, 290, 50, 110);
    if (kind === 'dragon' || kind === 'shop') x.fillRect(70, 140, 34, 40);
    x.fillStyle = '#f6f2ea'; x.fillRect(-64, 395, 56, 22); x.fillRect(8, 395, 56, 22);
    // head and hair
    x.fillStyle = '#f1c9a0'; x.beginPath(); x.roundRect(-58, 20, 116, 116, 18); x.fill();
    x.fillStyle = '#e0b63a'; x.beginPath(); x.roundRect(-64, 6, 128, 40, 16); x.fill();
    for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * 86, 50, 22, 44, s * 0.5, 0, 7); x.fill(); x.fillStyle = '#ff8fb8'; x.beginPath(); x.arc(s * 66, 30, 9, 0, 7); x.fill(); x.fillStyle = '#e0b63a'; }
    // the face
    if (face) x.drawImage(face, -58, 22, 116, 116);
    else {   // erased: rubbed out, pale, with eraser crumbs and smudges
      const g = x.createRadialGradient(0, 80, 10, 0, 80, 70); g.addColorStop(0, 'rgba(255,250,244,0.95)'); g.addColorStop(1, 'rgba(255,250,244,0.2)');
      x.fillStyle = g; x.beginPath(); x.roundRect(-56, 26, 112, 108, 16); x.fill();
      x.strokeStyle = 'rgba(200,170,150,0.55)'; x.lineWidth = 7; for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(-46 + r() * 20, 40 + i * 11); x.lineTo(30 + r() * 20, 46 + i * 11 + (r() - 0.5) * 8); x.stroke(); }
      x.fillStyle = 'rgba(230,170,190,0.8)'; for (let i = 0; i < 9; i++) x.fillRect(-60 + r() * 120, 120 + r() * 26, 6, 4);
    }
    x.restore();
    // the dragon in her arms (it was hers)
    if (kind === 'dragon' || kind === 'shop') {
      const dx = kind === 'dragon' ? 330 : 340, dy = kind === 'dragon' ? 330 : 120;
      x.fillStyle = '#f2b232'; x.beginPath(); x.ellipse(dx, dy, 52, 58, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(dx, dy - 70, 46, 42, 0, 0, 7); x.fill();
      x.fillStyle = '#ffb24a'; x.beginPath(); x.moveTo(dx + 40, dy - 10); x.lineTo(dx + 100, dy - 50); x.lineTo(dx + 70, dy + 10); x.fill(); x.beginPath(); x.moveTo(dx - 40, dy - 10); x.lineTo(dx - 100, dy - 50); x.lineTo(dx - 70, dy + 10); x.fill();
      x.fillStyle = '#2a1405'; x.beginPath(); x.ellipse(dx - 16, dy - 74, 11, 14, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(dx + 16, dy - 74, 11, 14, 0, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(dx - 19, dy - 79, 4, 0, 7); x.fill(); x.beginPath(); x.arc(dx + 13, dy - 79, 4, 0, 7); x.fill();
      x.fillStyle = '#fff1cf'; x.beginPath(); x.moveTo(dx - 20, dy - 108); x.lineTo(dx - 28, dy - 132); x.lineTo(dx - 10, dy - 110); x.fill(); x.beginPath(); x.moveTo(dx + 20, dy - 108); x.lineTo(dx + 28, dy - 132); x.lineTo(dx + 10, dy - 110); x.fill();
    }
    // an old photo's finish: warm wash, grain, a soft vignette in the print, a white border
    x.fillStyle = 'rgba(255,200,140,0.12)'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},0.05)`; x.fillRect(r() * w, r() * h, 2, 2); }
    const v = x.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(60,30,10,0.35)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#fbf6ec'; x.lineWidth = 34; x.strokeRect(17, 17, w - 34, h - 34);
  });
}
// a framed photograph: frame + glassless print; .setFace(k) cross-fades the restored print over the erased one
export function framedPhoto(kind, face, o = {}) {
  const w = o.w ?? 2.4, h = w * 1.25, g = new THREE.Group(), b = new Batch(), fm = paint(o.frame || '#b8864a', { roughness: 0.45, metalness: o.frame === '#d9b24a' ? 0.8 : 0.1 });
  b.box(fm, w + 0.5, h + 0.5, 0.2, 0, 0, 0, { r: 0.08 }); b.done(g);
  const er = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: photoTex(kind, null), roughness: 0.55 }));
  const ok = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: photoTex(kind, face), roughness: 0.55, transparent: true, opacity: 0, emissive: '#ffd36a', emissiveIntensity: 0 }));
  er.position.z = 0.11; ok.position.z = 0.115; g.add(er, ok);
  g.setFace = (k) => { ok.material.opacity = clamp(k); ok.visible = k > 0.001; ok.material.emissiveIntensity = 0.9 * Math.sin(Math.PI * clamp(k)); };
  g.setFace(0);
  return g;
}

// ---- a wall with window holes, as boxes (inside a set): holes [{ u, y, w, h }] in the wall's own coordinates ----
export function holeyWall(b, m, len, H, holes, place) {
  // place(u, y, w, h): adds a piece centred at u (along the wall), y (up)
  const hs = [...holes].sort((a, c) => a.u - c.u); let u0 = -len / 2;
  for (const k of hs) { const a = k.u - k.w / 2; if (a > u0) place((u0 + a) / 2, H / 2, a - u0, H); place(k.u, (k.y - k.h / 2) / 2, k.w, k.y - k.h / 2); const tp = k.y + k.h / 2; place(k.u, (tp + H) / 2, k.w, H - tp); u0 = k.u + k.w / 2; }
  if (u0 < len / 2) place((u0 + len / 2) / 2, H / 2, len / 2 - u0, H);
}

// wallpaper: soft stripes with small flowers
export function wallpaper(base = '#fbe3ea', ink = '#f2c2d0', o = {}) {
  const t = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { x.fillStyle = ink; x.globalAlpha = 0.45; x.fillRect(i * 64 + 26, 0, 12, h); }
    x.globalAlpha = 1; const r = rng(7);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { const cx = i * 128 + (j % 2) * 64 + 64, cy = j * 64 + 32; x.fillStyle = o.flower || '#ffffff'; for (let k = 0; k < 5; k++) { const a = k * 1.256; x.beginPath(); x.arc(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 5, 0, 7); x.fill(); } x.fillStyle = '#ffd24a'; x.beginPath(); x.arc(cx, cy, 4, 0, 7); x.fill(); void r; }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); m.userData.span = 8;
  return m;
}
