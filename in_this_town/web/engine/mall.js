// Episode 31's mall kit (an original design): a two-storey concourse in faded pastels under a luminous ceiling, with a sunken atrium whose banks of
// escalators all rise toward the same side. The hall is one module of length L, so the mall behind the exit doors can be a clone of the same
// geometry. Shops are real little rooms with generic, slightly wrong names. The polished floor mirrors the room with a real reflection pass
// (`floorMirror`), and every moving part is a pure function of its inputs. World: +z runs along the concourse, x is across it, y = 0 is the floor.
import * as THREE from 'three';
import { v3, rng, clamp } from './core.js';
import { Batch, surf, paint } from './kit.js';
import { canvasTex } from './props.js';

export const MALL = { L: 240, BAY: 30, HW: 24, VOID: 13, H1: 18, H2: 38, WZ0: 96, WZ1: 150, WX: 14, DEEP: -26, DW: 7, DH: 12 };
export const PAST = { cream: '#efe7d3', mint: '#b9d6c6', peach: '#e8c4a8', pink: '#e4bcc2', sky: '#b4cfdd', butter: '#ecd98f', sage: '#a9b99b', lilac: '#c7bddb', stone: '#d6d0c0', teal: '#7fb0ad' };
const rep = (t, n = 8) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = n; t.colorSpace = THREE.SRGBColorSpace; return t; };
const worldMat = (map, span, o = {}) => { const m = new THREE.MeshStandardMaterial({ map, ...o }); m.userData.span = span; return m; };
const noShadow = (g) => { g.traverse((o) => { if (o.isMesh) o.castShadow = false; }); return g; };

export function terrazzo(base = '#e6dfca', o = {}) {
  const t = rep(canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h); const r = rng(o.seed ?? 31);
    const C = ['rgba(120,110,86,', 'rgba(255,255,250,', 'rgba(170,150,120,', 'rgba(110,140,130,', 'rgba(205,160,140,'];
    for (let i = 0; i < 30000; i++) { x.fillStyle = C[i % 5] + (0.08 + r() * 0.2) + ')'; const s = 1.5 + r() * 4.5; x.fillRect(r() * w, r() * h, s, s * (0.6 + r() * 0.8)); }
    x.strokeStyle = 'rgba(140,128,100,0.55)'; x.lineWidth = 4; for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * 512, 0); x.lineTo(i * 512, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 512); x.lineTo(w, i * 512); x.stroke(); }
  }));
  return worldMat(t, o.span ?? 12, { roughness: o.rough ?? 0.3, metalness: 0 });
}
function tiledCeiling(col = '#e8e4d6') {
  const t = rep(canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = col; x.fillRect(0, 0, w, h); const r = rng(9);
    for (let i = 0; i < 7000; i++) { x.fillStyle = `rgba(90,86,70,${0.04 + r() * 0.08})`; x.fillRect(r() * w, r() * h, 1.5, 1.5); }
    x.fillStyle = '#f6f3e9'; x.fillRect(0, 0, w, 8); x.fillRect(0, 0, 8, h);
  }));
  return worldMat(t, 6, { roughness: 0.95 });
}
function paintWall(col, o = {}) {
  const t = rep(canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = col; x.fillRect(0, 0, w, h); const r = rng(o.seed ?? 4);
    for (let i = 0; i < 2000; i++) { x.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.012 + r() * 0.02})`; x.fillRect(r() * w, r() * h, 2 + r() * 24, 1 + r() * 3); }
  }));
  return worldMat(t, 12, { roughness: o.rough ?? 0.7 });
}

// a real planar reflection for the polished floor at y = 0: render the room from the mirrored camera into a half-size target, then add it in the floor's shader
export function floorMirror(ctx, mat, o = {}) {
  const { renderer, scene } = ctx, rt = new THREE.WebGLRenderTarget(o.w ?? 540, o.h ?? 960, { type: THREE.HalfFloatType }), cam = new THREE.PerspectiveCamera(60, 9 / 16, 0.2, 1600);
  const clip = [new THREE.Plane(v3(0, 1, 0), -0.03)], M = new THREE.Matrix4(), B = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const U = { tRefl: { value: rt.texture }, uReflM: { value: M }, uReflK: { value: 1 } };
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec4 vRefl; uniform mat4 uReflM;').replace('#include <project_vertex>', '#include <project_vertex>\nvRefl = uReflM * modelMatrix * vec4(transformed, 1.0);');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vRefl; uniform sampler2D tRefl; uniform float uReflK;').replace('#include <opaque_fragment>', `
      { vec2 ruv = vRefl.xy / vRefl.w; vec3 rc = vec3(0.0); float rs = 0.0014 + 0.003 * (1.0 - clamp(gl_FragCoord.y / 1920.0, 0.0, 1.0));
        for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) rc += texture2D(tRefl, ruv + vec2(float(i), float(j)) * vec2(rs, rs * 1.8)).rgb; rc /= 25.0; rc = min(rc, vec3(1.0));
        float fr = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.5); float k = mix(0.1, 0.42, fr) * uReflK;
        outgoingLight = outgoingLight * (1.0 - k * 0.55) + rc * k; }
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'mallfloor';
  return { rt, U, render(pos, look, fov, hide = []) {
    cam.position.set(pos.x, -pos.y, pos.z); cam.up.set(0, 1, 0); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(look.x, -look.y, look.z); cam.updateMatrixWorld(true);
    M.multiplyMatrices(B, cam.projectionMatrix).multiply(cam.matrixWorldInverse);
    const prev = renderer.getRenderTarget(), au = renderer.shadowMap.autoUpdate, vis = hide.map((m) => m.visible); hide.forEach((m) => { m.visible = false; });
    renderer.shadowMap.autoUpdate = false; renderer.clippingPlanes = clip; renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
    renderer.clippingPlanes = []; renderer.setRenderTarget(prev); renderer.shadowMap.autoUpdate = au; hide.forEach((m, i) => { m.visible = vis[i]; });
  } };
}

// ---- signs ----
const shopNameMat = (text, bg, fg) => { const t = canvasTex(640, 128, (x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.font = '800 74px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 4); x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); }); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.22, roughness: 0.6 }); };
const SHOPS = [
  { n: 'SHOES', bg: PAST.peach, fg: '#5b4436', k: 'shoes' }, { n: 'CLOTHES', bg: PAST.mint, fg: '#38544a', k: 'rack' }, { n: 'TOYS', bg: PAST.butter, fg: '#6a5428', k: 'shelf' }, { n: 'STORE', bg: PAST.cream, fg: '#6c6658', k: 'empty' },
  { n: 'BOOKS', bg: PAST.sky, fg: '#355060', k: 'books' }, { n: 'PHONES', bg: PAST.lilac, fg: '#463e60', k: 'tables' }, { n: 'CANDY', bg: PAST.pink, fg: '#6a3f48', k: 'shelf' }, { n: 'GIFTS', bg: PAST.sage, fg: '#3e4a34', k: 'tables' },
];
const nameCache = new Map(); const nameOf = (s) => { if (!nameCache.has(s.n)) nameCache.set(s.n, shopNameMat(s.n, s.bg, s.fg)); return nameCache.get(s.n); };

const G = { };
function mats() {
  if (G.ready) return G; G.ready = true;
  G.wall = paintWall(PAST.cream); G.mint = paintWall(PAST.mint, { seed: 5 }); G.peach = paintWall(PAST.peach, { seed: 6 }); G.teal = paint(PAST.teal, { roughness: 0.55 });
  G.pil = paint('#ece4cf', { roughness: 0.5 }); G.trim = paint('#b7ad96', { roughness: 0.45 }); G.floorPlain = terrazzo('#e2dbc6', { rough: 0.34 }); G.floorShop = terrazzo('#d9d3c2', { rough: 0.4, seed: 8 });
  G.ceil = tiledCeiling(); G.soff = paint('#e6e1d2', { roughness: 0.85 }); G.steel = paint('#c6c9c6', { metalness: 0.55, roughness: 0.32 }); G.dark = paint('#3c3e40', { roughness: 0.5, metalness: 0.2 }); G.rub = paint('#1d1e20', { roughness: 0.42 });
  G.glass = new THREE.MeshStandardMaterial({ color: '#cfe2dc', transparent: true, opacity: 0.2, roughness: 0.06, metalness: 0.1, depthWrite: false });
  G.panel = new THREE.MeshBasicMaterial({ color: '#ffffff' }); G.panelFrame = paint('#f2efe4', { roughness: 0.5 }); G.shopGlow = new THREE.MeshBasicMaterial({ color: '#fff7df' });
  G.wood = paint('#b08a5e', { roughness: 0.6 }); G.leaf = paint('#7f9b6f', { roughness: 0.7 }); G.leaf2 = paint('#6b8a68', { roughness: 0.7 }); G.pot = paint('#d9c7ab', { roughness: 0.55 }); G.soil = paint('#4a3f33', { roughness: 0.9 });
  G.goods = ['#d48a78', '#7eaecf', '#e3c46a', '#93bd8e', '#b59ad0', '#e0a7b8', '#efe6d0'].map((c) => paint(c, { roughness: 0.55 }));
  G.mann = paint('#e8e3d8', { roughness: 0.45 }); G.shelf = paint('#d8d0bc', { roughness: 0.55 });
  return G;
}
// a flat plain box (no bevel, for the thousands of little parts)
const P = (b, m, w, h, d, x, y, z) => b.add(m, new THREE.BoxGeometry(w, h, d), x, y, z);

function panelsRow(b, xs, y, zs, w, d) { const M = mats(); for (const z of zs) for (const x of xs) { P(b, M.panelFrame, w + 0.5, 0.12, d + 0.5, x, y + 0.07, z); P(b, M.panel, w, 0.06, d, x, y, z); } }

// one shop: side s (+1 = the +x wall), opening z0..z1, floor at y0
function addShop(b, s, z0, z1, y0, S, H, D) {
  const M = mats(), r = rng(Math.round(z0 + y0 * 7 + s * 31)), W = z1 - z0, zc = (z0 + z1) / 2, X = (d) => s * (MALL.HW + d), yc = y0 + H / 2;
  P(b, M.floorShop, D, 0.1, W, X(D / 2), y0 + 0.04, zc);
  P(b, M.wall, 0.4, H + 2, W, X(D), yc + 1, zc); P(b, M.wall, D, H + 2, 0.4, X(D / 2), yc + 1, z0); P(b, M.wall, D, H + 2, 0.4, X(D / 2), yc + 1, z1);
  P(b, M.soff, D, 0.3, W, X(D / 2), y0 + H + 1.2, zc);
  for (let i = 0; i < 2; i++) { const zp = z0 + W * (0.28 + 0.44 * i); P(b, M.shopGlow, D * 0.5, 0.05, 2.2, X(D * 0.5), y0 + H + 1.0, zp); }
  // the roller shutter's box, rolled up: every store is open
  P(b, M.trim, 1.0, 1.3, W - 0.4, X(0.4), y0 + H - 0.1, zc);
  const G0 = M.goods, g = (i) => G0[Math.floor(r() * 7 + i) % 7];
  const Dz = D - 2;
  if (S.k === 'shoes') { for (let w = 0; w < 2; w++) for (let k = 0; k < 4; k++) { const zz = z0 + 2 + k * (W - 4) / 3; P(b, M.shelf, 2.2, 0.3, 2.4, X(Dz - w * 5), y0 + 3.2, zz); P(b, M.shelf, 0.3, 3.2, 0.3, X(Dz - w * 5), y0 + 1.6, zz); for (let q = -1; q <= 1; q += 2) P(b, g(k), 0.8, 0.5, 1.4, X(Dz - w * 5) + q * 0.55, y0 + 3.6, zz); } }
  else if (S.k === 'rack') { for (let w = 0; w < 2; w++) { const xr = X(Dz - w * 5); P(b, M.steel, 0.14, 0.14, W - 4, xr, y0 + 5.2, zc); for (const q of [-1, 1]) P(b, M.steel, 0.14, 5.2, 0.14, xr, y0 + 2.6, zc + q * (W / 2 - 2)); for (let k = 0; k < 9; k++) { const col = g(k); P(b, col, 0.5, 2.7, 1.1, xr, y0 + 3.7, z0 + 2.7 + k * (W - 5.4) / 8); } }
    for (let k = -1; k <= 1; k += 2) mannequin(b, X(3.2), y0, zc + k * 3); }
  else if (S.k === 'shelf') { for (let l = 0; l < 3; l++) { P(b, M.shelf, 1.8, 0.18, W - 2, X(D - 1.1), y0 + 2 + l * 2.6, zc); for (let k = 0; k < 8; k++) { const hb = 0.9 + r() * 0.9; P(b, g(k + l), 1.2, hb, 1.0, X(D - 1.1), y0 + 2.1 + l * 2.6 + hb / 2, z0 + 1.8 + k * (W - 3.6) / 7); } } P(b, M.shelf, 3.2, 3, 6, X(D * 0.45), y0 + 1.5, zc); for (let k = 0; k < 4; k++) P(b, g(k), 1.1, 1.0, 1.1, X(D * 0.45), y0 + 3.5, zc - 2 + k * 1.34); }
  else if (S.k === 'books') { for (let l = 0; l < 4; l++) { P(b, M.wood, 1.4, 0.16, W - 2, X(D - 0.9), y0 + 1.6 + l * 2.2, zc); for (let k = 0; k < 16; k++) P(b, g(k), 1.0, 1.4 + r() * 0.4, 0.42, X(D - 0.9), y0 + 2.4 + l * 2.2, z0 + 1.6 + k * (W - 3.2) / 15); } for (const q of [-1, 1]) { P(b, M.wood, 3.6, 2.2, 4, X(D * 0.42), y0 + 1.1, zc + q * 3); for (let k = 0; k < 4; k++) P(b, g(k), 1.3, 0.26, 1.8, X(D * 0.42), y0 + 2.34 + k * 0.28, zc + q * 3); } }
  else if (S.k === 'tables') { for (let w = 0; w < 2; w++) for (const q of [-1, 1]) { const xx = X(Dz - w * 5), zz = zc + q * 3.1; P(b, M.shelf, 3.4, 0.24, 3.6, xx, y0 + 3.2, zz); P(b, M.shelf, 2.4, 3.1, 2.6, xx, y0 + 1.55, zz); for (let k = 0; k < 3; k++) P(b, g(k), 0.8, 0.14, 1.3, xx - 1 + k, y0 + 3.4, zz); } }
  else { P(b, M.shelf, 6, 3.3, 0.5, X(D * 0.55), y0 + 1.65, zc); }   // "STORE" is nearly bare: a counter and nothing on it
  // the name, facing the concourse; a thin back plate
  const sw = Math.min(W - 2.4, 11.5);
  P(b, M.pil, 0.5, 3, W, X(0), y0 + H + 1.5, zc);
  b.add(nameOf(S), new THREE.PlaneGeometry(sw, sw * 0.2), X(-0.28), y0 + H + 1.55, zc, -s * Math.PI / 2);
}
function mannequin(b, x, y, z) { const M = mats(); P(b, M.mann, 2.4, 2.5, 1.2, x, y + 3.5, z); P(b, M.mann, 0.85, 2.4, 0.9, x, y + 1.2, z - 0.5); P(b, M.mann, 0.85, 2.4, 0.9, x, y + 1.2, z + 0.5); P(b, M.mann, 1.1, 1.1, 1.1, x, y + 5.45, z); }

// a straight glass balustrade from a to b at y; a, b [x, z] (axis aligned)
function rail(b, a, c, y, h = 3.4, gaps = []) {
  const M = mats(), alongZ = a[0] === c[0], L0 = alongZ ? Math.abs(c[1] - a[1]) : Math.abs(c[0] - a[0]);
  if (L0 < 0.1) return; const dir = alongZ ? Math.sign(c[1] - a[1]) : Math.sign(c[0] - a[0]);
  const segs = []; let s0 = 0; for (const [p, q] of [...gaps].sort((u, v) => u[0] - v[0])) { if (p > s0) segs.push([s0, p]); s0 = Math.max(s0, q); } if (s0 < L0) segs.push([s0, L0]);
  for (const [p, q] of segs) { const L1 = q - p; if (L1 < 0.4) continue; const m = (p + q) / 2 * dir; const cx = alongZ ? a[0] : a[0] + m, cz = alongZ ? a[1] + m : a[1];
    P(b, M.glass, alongZ ? 0.1 : L1, h - 0.3, alongZ ? L1 : 0.1, cx, y + (h - 0.3) / 2 + 0.1, cz); P(b, M.steel, alongZ ? 0.28 : L1, 0.2, alongZ ? L1 : 0.28, cx, y + h, cz); P(b, M.trim, alongZ ? 0.34 : L1, 0.26, alongZ ? L1 : 0.34, cx, y + 0.13, cz);
    const n = Math.max(1, Math.round(L1 / 8)); for (let i = 0; i <= n; i++) { const m2 = (p + (L1 * i) / n) * dir; P(b, M.steel, 0.16, h, 0.16, alongZ ? a[0] : a[0] + m2, y + h / 2, alongZ ? a[1] + m2 : a[1]); } }
}
function planter(b, x, z, y = 0) { const M = mats(); b.box(M.pot, 4.4, 2.6, 4.4, x, y + 1.3, z, { r: 0.35 }); P(b, M.soil, 3.8, 0.1, 3.8, x, y + 2.62, z); for (let i = 0; i < 6; i++) { const a = i * 1.05, c = i % 2 ? M.leaf : M.leaf2; b.add(c, new THREE.ConeGeometry(0.34, 7.2, 6), x + Math.cos(a) * 0.9, y + 5.8, z + Math.sin(a) * 0.9, 0, Math.sin(a) * 0.32, -Math.cos(a) * 0.32); b.add(c, new THREE.BoxGeometry(2.4, 0.12, 1), x + Math.cos(a) * 2.2, y + 8.5 - (i % 3) * 1.4, z + Math.sin(a) * 2.2, -a, 0, 0.4); } }
export function benchParts(b, x, z, ry) { const M = mats(), f = (ax, ay, az) => { const c = Math.cos(ry), s = Math.sin(ry); return [x + ax * c + az * s, ay, z - ax * s + az * c]; }; for (let i = 0; i < 4; i++) { const [px, py, pz] = f(0, 1.35, -0.8 + i * 0.55); b.add(M.wood, new THREE.BoxGeometry(7, 0.18, 0.45), px, py, pz, ry); } for (const sx of [-3, 3]) { const [px, py, pz] = f(sx, 0.65, 0); b.add(M.steel, new THREE.BoxGeometry(0.3, 1.3, 2), px, py, pz, ry); } for (let i = 0; i < 3; i++) { const [px, py, pz] = f(0, 2.3 + i * 0.5, -1.15); b.add(M.wood, new THREE.BoxGeometry(7, 0.36, 0.14), px, py, pz, ry); } }
function hangClockMat() { const t = canvasTex(512, 180, (x, w, h) => { x.fillStyle = '#16181a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd97a'; x.font = '800 138px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('4:45', w / 2, h / 2 + 6); }); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.65, roughness: 0.4 }); }

// a path of a person or a step on an escalator
export function escPath(x, zb, yb, zt, yt, sign = -1) { const flat = 5, top = 3; const P0 = v3(x, yb - 0.06, zb + flat * -sign), P1 = v3(x, yb - 0.06, zb), P2 = v3(x, yt - 0.06, zt), P3 = v3(x, yt - 0.06, zt + top * sign), L1 = P0.distanceTo(P1), L2 = P1.distanceTo(P2), L3 = P2.distanceTo(P3), total = L1 + L2 + L3; return { x, P0, P1, P2, P3, L1, L2, L3, total, sign, at(d) { d = ((d % total) + total) % total; if (d < L1) return P0.clone().lerp(P1, d / L1); if (d < L1 + L2) return P1.clone().lerp(P2, (d - L1) / L2); return P2.clone().lerp(P3, (d - L1 - L2) / L3); }, atRaw(d) { const q = Math.max(0, d); if (q < L1) return P0.clone().lerp(P1, q / L1); if (q < L1 + L2) return P1.clone().lerp(P2, (q - L1) / L2); return P2.clone().lerp(P3, Math.min(1, (q - L1 - L2) / L3)); }, slopeD(y) { return L1 + L2 * (y - (yb - 0.06)) / (yt - yb); } }; }
export const ESC_LANES = (o = {}) => { const { WZ0: z0, WZ1: z1, DEEP: D, H1 } = MALL; const zt = z0 + 3, zb = zt + (-D) / Math.tan(Math.PI / 6); return [-10.5, -3.5, 3.5, 10.5].map((x) => escPath(x, zb, D, zt, 0, -1)); };

function escalatorBody(b, e) {
  const M = mats(), { P0, P1, P2, P3, x } = e, hw = 2.7, A = P1, C = P2, mid = A.clone().add(C).multiplyScalar(0.5), L = A.distanceTo(C), ang = Math.atan2(C.y - A.y, Math.abs(C.z - A.z));
  // sloped parts built along local z, tilted about x (the top end is toward -z)
  const put = (m, w, h, dy, xo = 0, len = L, zo = 0) => { const g = new THREE.BoxGeometry(w, h, len); b.add(m, g, x + xo, mid.y + dy * Math.cos(ang), mid.z + dy * Math.sin(ang) + zo, 0, ang); };
  for (const sd of [-1, 1]) { put(M.glass, 0.1, 2.5, 1.5, sd * hw); put(M.steel, 0.32, 0.5, -0.05, sd * hw); put(M.rub, 0.3, 0.22, 2.92, sd * hw, L + 1.5); }
  put(M.steel, hw * 2 + 0.3, 1.6, -1.25); put(M.dark, hw * 2 + 0.7, 0.3, -2.15);
  // the comb plates and the newel ends
  for (const p of [[P2, P3], [P0, P1]]) { const zc = (p[0].z + p[1].z) / 2, yy = p[0].y; P(b, M.steel, hw * 2 + 0.6, 0.12, Math.abs(p[0].z - p[1].z) + 0.8, x, yy + 0.1, zc); P(b, M.dark, hw * 2 + 0.6, 0.13, 0.28, x, yy + 0.1, p === undefined ? zc : (p[0] === P2 ? P2.z + 0.2 * e.sign * -1 * 0 : P1.z)); for (const sd of [-1, 1]) { b.box(M.rub, 0.3, 3.0, Math.abs(p[0].z - p[1].z) + 0.6, x + sd * hw, yy + 1.5, zc, { r: 0.14 }); b.box(M.steel, 0.42, 2.2, Math.abs(p[0].z - p[1].z) + 0.3, x + sd * hw, yy + 1.1, zc, { r: 0.1 }); } }
  // the far ends drawn so the steps vanish under a plate
  P(b, M.steel, hw * 2 + 0.2, 0.2, 2.2, x, P3.y + 0.06, P3.z); P(b, M.steel, hw * 2 + 0.2, 0.2, 2.2, x, P0.y + 0.06, P0.z);
}

export function escalatorSteps(lanes, pitch = 1.6) {
  const M = mats(), geo = new THREE.BoxGeometry(4.8, 0.86, 1.34).translate(0, -0.43, 0), mat = paint('#7a7d80', { metalness: 0.45, roughness: 0.42 });
  const n = lanes.reduce((a, e) => a + Math.round(e.total / pitch), 0), inst = new THREE.InstancedMesh(geo, mat, n); inst.frustumCulled = false; inst.receiveShadow = true; inst.castShadow = false;
  const edge = paint('#d9c36a', { roughness: 0.5 }), eg = new THREE.BoxGeometry(4.6, 0.04, 0.16), ei = new THREE.InstancedMesh(eg, edge, n); ei.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = v3(1, 1, 1); const g = new THREE.Group(); g.add(inst); g.add(ei);
  g.update = (disps) => { let k = 0; lanes.forEach((e, l) => { const N = Math.round(e.total / pitch), pi = e.total / N; for (let i = 0; i < N; i++) { const p = e.at(i * pi + disps[l]); m.compose(p, q, s); inst.setMatrixAt(k, m); m.compose(v3(p.x, p.y + 0.02, p.z - 0.56 * e.sign * -1), q, s); ei.setMatrixAt(k, m); k++; } }); inst.instanceMatrix.needsUpdate = true; ei.instanceMatrix.needsUpdate = true; };
  g.update(lanes.map(() => 0));
  return g;
}

// ---- the hall ----
export function mallHall(o = {}) {
  const M = mats(), { L, BAY, HW, VOID: V, H1, H2, WZ0, WZ1, WX, DEEP, DW, DH } = MALL, g = new THREE.Group(), b = new Batch(), bc = new Batch(), bl = new Batch();
  // the floor (a hole for the atrium) lives on its own so the mirror pass can hide it
  const fg = []; const fp = (x0, x1, z0, z1) => { const p = new THREE.PlaneGeometry(x1 - x0, z1 - z0); p.rotateX(-Math.PI / 2); p.translate((x0 + x1) / 2, 0, (z0 + z1) / 2); const uv = p.attributes.uv, q = p.attributes.position; for (let i = 0; i < q.count; i++) uv.setXY(i, q.getX(i) / 12, q.getZ(i) / 12); fg.push(p); };
  fp(-HW, HW, 0, WZ0); fp(-HW, HW, WZ1, L); fp(-HW, -WX, WZ0, WZ1); fp(WX, HW, WZ0, WZ1);
  // balcony floors (terrazzo too), ceiling, end walls
  for (const s of [-1, 1]) { b.box(M.soff, HW - V, 0.8, L, s * (V + HW) / 2, H1 - 0.45, L / 2, { r: 0.1 }); const flo = new THREE.PlaneGeometry(HW - V, L); flo.rotateX(-Math.PI / 2); const uvq = flo.attributes.uv, pq = flo.attributes.position; for (let i = 0; i < pq.count; i++) uvq.setXY(i, pq.getX(i) / 12, pq.getZ(i) / 12); b.add(M.floorPlain, flo, s * (V + HW) / 2, H1 + 0.01, L / 2); }
  bc.box(M.ceil, 80, 0.8, L, 0, H2 + 0.4, L / 2, { r: 0.05 });
  // bridges across the void
  for (const zc of [60, 116, 180]) { const w = 13, Z0 = zc - w / 2; b.box(M.soff, V * 2, 0.8, w, 0, H1 - 0.45, zc, { r: 0.1 }); const flo = new THREE.PlaneGeometry(V * 2, w); flo.rotateX(-Math.PI / 2); const uvq = flo.attributes.uv, pq = flo.attributes.position; for (let i = 0; i < pq.count; i++) uvq.setXY(i, pq.getX(i) / 12, pq.getZ(i) / 12); b.add(M.floorPlain, flo, 0, H1 + 0.02, zc); rail(b, [-V, Z0], [V, Z0], H1, 3.4, []); rail(b, [-V, Z0 + w], [V, Z0 + w], H1, 3.4, []); P(b, M.panel, V * 1.6, 0.06, 2.4, 0, H1 - 0.9, zc); }
  // balcony rails with gaps at the bridges
  for (const s of [-1, 1]) rail(b, [s * V, 0], [s * V, L], H1, 3.4, [[60 - 6.5, 60 + 6.5], [116 - 6.5, 116 + 6.5], [180 - 6.5, 180 + 6.5]]);
  // shops on both levels, both sides
  for (const s of [-1, 1]) for (let i = 0; i < L / 15; i++) { const z0 = i * 15 + 0.6, z1 = (i + 1) * 15 - 0.6, S = SHOPS[(i * 3 + (s > 0 ? 2 : 0)) % SHOPS.length]; if (!(i === 4 && o.arcade && s > 0)) addShop(bl, s, z0, z1, 0, S, 13, 13); addShop(bl, s, z0, z1, H1, SHOPS[(i * 5 + 1 + (s > 0 ? 3 : 0)) % SHOPS.length], 12, 9);
    P(b, M.pil, 1.6, 18, 1.5, s * (HW + 0.3), 9, (i + 1) * 15); P(b, M.pil, 1.6, 20, 1.5, s * (HW + 0.3), H1 + 10, (i + 1) * 15); }
  // pillars at the void's edge, floor to balcony
  for (const s of [-1, 1]) for (let i = 0; i <= L / BAY; i++) { const z = i * BAY; if (z >= WZ0 && z <= WZ1) continue; b.box(M.mint, 2.2, H1 - 0.8, 2.2, s * V, (H1 - 0.8) / 2, Math.max(1.5, Math.min(L - 1.5, z)), { r: 0.2 }); b.box(M.trim, 2.5, 0.5, 2.5, s * V, 0.25, Math.max(1.5, Math.min(L - 1.5, z)), { r: 0.08 }); }
  // the fluorescent ceiling: rows in the void, under the balconies, along the top level
  const Zs = []; for (let z = 3; z < L; z += 6) Zs.push(z);
  panelsRow(bl, [-7.5, 0, 7.5], H2 - 0.16, Zs, 4, 2.4); panelsRow(bl, [-(V + HW) / 2, (V + HW) / 2], H1 - 0.9, Zs, 3.4, 2.4); panelsRow(bl, [-(V + HW) / 2, (V + HW) / 2], H2 - 0.16, Zs, 3.4, 2.4);
  // the end walls: a door hole in each
  const wallEnd = (z, sign) => { const wt = 1.6, zc = z + sign * wt / 2; b.box(M.wall, HW - DW, H2, wt, -(HW + DW) / 2, H2 / 2, zc, { r: 0.05 }); b.box(M.wall, HW - DW, H2, wt, (HW + DW) / 2, H2 / 2, zc, { r: 0.05 }); b.box(M.wall, DW * 2, H2 - DH, wt, 0, (H2 + DH) / 2, zc, { r: 0.05 }); for (const s of [-1, 1]) P(b, M.teal, 0.9, H2, 0.6, s * (HW - 0.4), H2 / 2, z + sign * (wt + 0.15)); P(b, M.teal, HW * 2, 0.9, 0.6, 0, DH + 2.6, z + sign * (wt + 0.15)); };
  wallEnd(0, 1); wallEnd(L, -1);
  // the bare dark gap above the shutters on the end walls' faces is left plain on purpose; signs over each door
  const lab = (text, z, ry) => { const t = canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#2e6d57'; x.fillRect(0, 0, w, h); x.fillStyle = '#eafff1'; x.font = '800 86px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 3); }); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.55, roughness: 0.5 })); m.position.set(0, DH + 2.7, z); m.rotation.y = ry; m.castShadow = false; g.add(m); };
  lab('ENTRANCE', 2.1, 0); lab('EXIT', L - 2.1, Math.PI);
  // the sunken atrium: walls, floor, shops on the lower level
  const yD = DEEP; b.box(M.mint, 0.8, -yD, WZ1 - WZ0 + 14, -WX - 0.4, yD / 2, (WZ0 + WZ1) / 2 + 7, { r: 0.05 }); b.box(M.mint, 0.8, -yD, WZ1 - WZ0 + 14, WX + 0.4, yD / 2, (WZ0 + WZ1) / 2 + 7, { r: 0.05 });
  { const flo = new THREE.PlaneGeometry(WX * 2 + 0.2, WZ1 - WZ0 + 22); flo.rotateX(-Math.PI / 2); const uvq = flo.attributes.uv, pq = flo.attributes.position; for (let i = 0; i < pq.count; i++) uvq.setXY(i, pq.getX(i) / 12, pq.getZ(i) / 12); b.add(M.floorPlain, flo, 0, yD, (WZ0 + WZ1) / 2 + 9); }
  b.box(M.wall, WX * 2 + 2, -yD + 1, 0.8, 0, yD / 2 + 0.2, WZ1 + 20.4, { r: 0.05 }); b.box(M.soff, WX * 2 + 2, 0.8, 20, 0, -1.1, WZ1 + 10, { r: 0.05 }); bl.box(M.teal, WX * 2 + 2, 1.2, 0.5, 0, -6, WZ0 - 0.2 + 0.05, { r: 0.05 });
  b.box(M.wall, WX * 2 + 2, -yD - 0.6, 0.8, 0, yD / 2 - 0.3, WZ0 + 0.3, { r: 0.05 });
  for (const z of [WZ1 + 5, WZ1 + 13]) P(bl, M.panel, WX * 1.6, 0.06, 3, 0, -1.6, z);
  panelsRow(bl, [-WX + 4, 0, WX - 4], yD + 19, [108, 122, 136], 4.2, 2.4);
  for (const s of [-1, 1]) { const zs = [104, 123, 142]; zs.forEach((z, i) => { const zz = z + 8; P(bl, nameOf(SHOPS[(i * 2 + (s > 0 ? 5 : 1)) % SHOPS.length]), 0.06, 2.4, 11, s * (WX - 0.05), yD + 15, zz); P(bl, M.shopGlow, 0.06, 9, 13, s * (WX - 0.08), yD + 7, zz); P(bl, M.trim, 0.3, 0.5, 14, s * (WX - 0.2), yD + 12, zz); }); }
  // rails round the well; the near edge is open for the escalators
  rail(b, [-WX, WZ0], [-WX, WZ1], 0, 3.4); rail(b, [WX, WZ0], [WX, WZ1], 0, 3.4); rail(b, [-WX, WZ1], [WX, WZ1], 0, 3.4, []);
  // the steel plate across the head of the bank, so the lanes end flush with the floor
  b.box(M.steel, WX * 2, 0.4, 3.2, 0, -0.19, WZ0 + 1.6, { r: 0.03 });
  // the escalators' fixed parts
  const lanes = ESC_LANES(); lanes.forEach((e) => escalatorBody(b, e));
  // benches, planters along the centre line; a hanging clock; a directory; bins
  const ptop = (o.benches || []).concat([]);
  for (let i = 0; i <= L / BAY - 1; i++) { const z = (i + 0.5) * BAY; if (z > WZ0 - 12 && z < WZ1 + 8) continue; for (const s of [-1, 1]) { planter(b, s * 9, z); benchParts(b, s * 4.5, z, s > 0 ? -Math.PI / 2 : Math.PI / 2); } }
  // hanging clocks at every second bay
  const cm = hangClockMat(), hm = new THREE.MeshStandardMaterial({ color: '#b7ad96', roughness: 0.5 });
  for (let i = 0; i < L / 60; i++) { const z = 30 + i * 60; const q = new THREE.Group(); for (const r of [-1, 1]) { const pm = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.1), cm); pm.position.z = r * 0.05; pm.rotation.y = r > 0 ? 0 : Math.PI; q.add(pm); } q.position.set(0, 31, z); noShadow(q); g.add(q); const rod = new THREE.Mesh(new THREE.BoxGeometry(0.16, 6, 0.16), hm); rod.position.set(0, 35, z); rod.castShadow = false; g.add(rod); }
  bc.done(g); noShadow(g); b.done(g); noShadow(g); bl.done(g); noShadow(g);
  // the reflective floor
  const fm = new THREE.Mesh(g.userData.fGeo = mergeFloors(fg), o.floorMat); fm.receiveShadow = true; fm.castShadow = false; g.add(fm); g.floor = fm;
  return g;
}
function mergeFloors(arr) { const pos = [], uv = [], nor = [], idx = []; let n = 0; for (const p of arr) { const a = p.attributes.position, b = p.attributes.uv, c = p.attributes.normal; for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); uv.push(b.getX(i), b.getY(i)); nor.push(c.getX(i), c.getY(i), c.getZ(i)); } for (let i = 0; i < p.index.count; i++) idx.push(p.index.getX(i) + n); n += a.count; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g; }
export function polishedFloor() { return terrazzo('#d8d1bb', { rough: 0.34 }); }

// ---- props with their own objects ----
export function automaticDoor(o = {}) {
  const g = new THREE.Group(), b = new Batch(), { DW, DH } = MALL, f = paint('#a8acac', { metalness: 0.5, roughness: 0.35 }), wd = DW, thick = o.thick ?? 1.6;
  for (const s of [-1, 1]) b.box(f, 0.5, DH, thick, s * (wd + 0.05), DH / 2, 0, { r: 0.06 }); b.box(f, wd * 2 + 0.6, 0.7, thick, 0, DH + 0.1, 0, { r: 0.06 }); b.box(f, wd * 2 + 0.6, 0.12, thick, 0, 0.06, 0, { r: 0.02 }); b.done(g);
  const m = new THREE.MeshStandardMaterial({ color: '#dfe9e2', transparent: true, opacity: 0.92, roughness: 0.18, metalness: 0.05, emissive: '#e8eee6', emissiveIntensity: 0.22 });
  const mk = (s) => { const q = new THREE.Group(), bb = new Batch(); bb.box(paint('#979b9b', { metalness: 0.5, roughness: 0.35 }), 0.32, DH - 0.8, 0.3, s * (wd - 0.1) * 0.5 * -1 + s * 0, (DH - 0.8) / 2 + 0.3, 0, { r: 0.04 }); bb.done(q); const pl = new THREE.Mesh(new THREE.BoxGeometry(wd - 0.2, DH - 1.2, 0.08), m); pl.position.set(s * 0, (DH - 1.2) / 2 + 0.5, 0); q.add(pl); const bar = new THREE.Mesh(new THREE.BoxGeometry(wd - 0.4, 0.18, 0.12), paint('#6d7272', { metalness: 0.6, roughness: 0.3 })); bar.position.set(0, 3.6, 0.12); q.add(bar); return q; };
  const L0 = mk(1), R0 = mk(-1); L0.position.set(-wd / 2 - 0.02, 0, 0.1); R0.position.set(wd / 2 + 0.02, 0, -0.1); g.add(L0); g.add(R0); g.mat = m;
  g.set = (k) => { const d = clamp(k) * (wd - 0.4); L0.position.x = -wd / 2 - 0.02 - d; R0.position.x = wd / 2 + 0.02 + d; };
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; }); g.set(0);
  return g;
}
export function directoryKiosk() {
  const g = new THREE.Group(), b = new Batch(), f = paint('#8c9a92', { roughness: 0.4 }), w = 7.4, h = 9.6; b.box(f, w + 0.8, h + 0.8, 1.0, 0, h / 2 + 1.1, 0, { r: 0.12 }); b.box(paint('#6e7a73', { roughness: 0.5 }), w * 0.5, 1.4, 1.4, 0, 0.7, 0, { r: 0.08 }); b.done(g);
  const t = canvasTex(1024, 1320, (x, W, H) => {
    x.fillStyle = '#efe9d6'; x.fillRect(0, 0, W, H); x.fillStyle = '#2f5a4d'; x.fillRect(0, 0, W, 130); x.fillStyle = '#eafff1'; x.font = '800 86px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('MALL DIRECTORY', W / 2, 68);
    const r = rng(77), C = [PAST.peach, PAST.mint, PAST.butter, PAST.sky, PAST.pink, PAST.lilac, PAST.sage];
    x.strokeStyle = '#8b8470'; x.lineWidth = 5; const cols = 6, rows = 12; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { if (i === 2 || i === 3) continue; const cx = 40 + i * (W - 80) / cols, cy = 170 + j * (H - 330) / rows, cw = (W - 80) / cols - 12, ch = (H - 330) / rows - 12; x.fillStyle = C[Math.floor(r() * 7)]; x.fillRect(cx, cy, cw, ch); x.strokeRect(cx, cy, cw, ch); }
    x.fillStyle = '#dcd5c1'; x.fillRect(40 + 2 * (W - 80) / cols, 165, 2 * (W - 80) / cols - 12, H - 330 - 2);
    // every single spot on this map is "you are here"
    const dots = [[0, 0], [5, 1], [0, 3], [5, 3], [2.5, 1.5], [0, 6], [5, 5], [2.5, 4.6], [5, 7], [0, 9], [5, 10], [2.5, 7.5], [2.5, 10.6]]; x.textAlign = 'center';
    for (const [i, j] of dots) { const cx = 40 + i * (W - 80) / cols + (W - 80) / cols / 2, cy = 170 + j * (H - 330) / rows + (H - 330) / rows / 2; x.fillStyle = '#d7202d'; x.beginPath(); x.arc(cx, cy - 10, 20, 0, 7); x.fill(); x.fillStyle = '#7a1018'; x.font = '800 22px ITTInter, sans-serif'; x.fillText('YOU ARE HERE', cx, cy + 28); }
    x.fillStyle = '#4c473a'; x.font = '700 40px ITTInter, sans-serif'; x.fillText('YOU ARE HERE', W / 2, H - 70);
  }); t.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.45, roughness: 0.4 })); face.position.set(0, h / 2 + 1.1, 0.52); face.castShadow = false; g.add(face); g.face = face; g.W = w; g.H = h; g.y0 = 1.1;
  return g;
}
export function clawMachine() { const g = new THREE.Group(), b = new Batch(), c = paint(PAST.pink, { roughness: 0.45 }), g0 = new THREE.MeshStandardMaterial({ color: '#d9efec', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false }); b.box(c, 4.4, 3, 4.4, 0, 1.5, 0, { r: 0.12 }); b.box(c, 4.4, 1, 4.4, 0, 8.4, 0, { r: 0.12 }); for (const x of [-2, 2]) for (const z of [-2, 2]) b.box(paint('#f1e4d0'), 0.26, 5, 0.26, x, 5.5, z, { r: 0.04 }); b.box(g0, 4.1, 5, 4.1, 0, 5.5, 0, { r: 0.02 }); for (let i = 0; i < 16; i++) { const r = i * 2.4; b.box(paint(['#d48a78', '#7eaecf', '#e3c46a', '#93bd8e', '#b59ad0'][i % 5], { roughness: 0.6 }), 0.85, 0.85, 0.85, Math.cos(r) * (1 + i * 0.03), 3.5 + (i % 2) * 0.5, Math.sin(r) * (1 + i * 0.03), { r: 0.16 }); } b.box(paint('#2f3235'), 0.8, 0.26, 0.5, 0.9, 3.05, 2.05, { r: 0.05 }); b.cyl(paint('#d7202d'), 0.14, 0.14, 0.5, 0.9, 3.5, 2.05, { seg: 10 }); b.done(g); return g; }
export function arcadeFront(n = 5) { const g = new THREE.Group(), b = new Batch(), M = mats(); const W = 13.8, D = 13, X = 24, Z = 60 + 15 / 2; P(b, M.floorShop, D, 0.1, W, X + D / 2, 0.04, Z); P(b, paint('#d7d0e2', { roughness: 0.6 }), 0.4, 15, W, X + D, 7.5, Z); P(b, paint('#d7d0e2', { roughness: 0.6 }), D, 15, 0.4, X + D / 2, 7.5, Z - W / 2); P(b, paint('#d7d0e2', { roughness: 0.6 }), D, 15, 0.4, X + D / 2, 7.5, Z + W / 2); P(b, M.soff, D, 0.3, W, X + D / 2, 14.2, Z); P(b, M.shopGlow, D * 0.6, 0.05, 3, X + D / 2, 14.0, Z); P(b, M.pil, 0.5, 3, W, X, 14.5, Z); b.add(nameOf({ n: 'ARCADE', bg: PAST.lilac, fg: '#463e60' }), new THREE.PlaneGeometry(11, 2.2), X - 0.28, 14.55, Z, -Math.PI / 2); b.done(g); noShadow(g); return g; }
const padMat = () => { const t = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#edc24a'; x.fillRect(0, 0, w, h); x.fillStyle = '#26221a'; x.font = '800 90px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('CAUTION', w / 2, 120); x.font = '700 58px ITTInter, sans-serif'; x.fillText('WET FLOOR', w / 2, 200); }); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }); };
export function wetSign() { const g = new THREE.Group(), m = padMat(); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.0, 0.08), m); p.position.set(0, 1.4, s * 0.36); p.rotation.x = -s * 0.24; p.castShadow = true; g.add(p); } return g; }
export function mop() { const g = new THREE.Group(), b = new Batch(); b.cyl(paint('#c9a15a', { roughness: 0.5 }), 0.08, 0.08, 6.2, 0, 3.15, 0, { seg: 8 }); b.box(paint('#8a8d8f', { metalness: 0.5, roughness: 0.4 }), 1.6, 0.18, 0.26, 0, 0.32, 0, { r: 0.04 }); for (let i = 0; i < 14; i++) b.cyl(paint('#dcd8c8', { roughness: 0.9 }), 0.09, 0.05, 0.54, -1.05 + i * 0.16, 0.18, ((i * 7) % 5 - 2) * 0.07, { seg: 6 }); b.done(g); return g; }
export function bucket() { const g = new THREE.Group(), b = new Batch(); b.cyl(paint('#e3c34e', { roughness: 0.5 }), 1.25, 1.0, 1.8, 0, 0.9, 0, { seg: 18 }); b.cyl(paint('#7a8a7e', { roughness: 0.3 }), 1.05, 1.05, 0.05, 0, 1.7, 0, { seg: 18 }); b.done(g); return g; }
export function shoppingBag(col = '#d9b6a6', o = {}) { const g = new THREE.Group(), b = new Batch(), bb = paint(col, { roughness: 0.75 }); b.box(bb, 1.5, 1.8, 0.7, 0, 0, 0, { r: 0.04 }); b.done(g); const h = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 14, Math.PI), paint('#efe6d0', { roughness: 0.6 })); h.position.set(0, 0.85, 0); g.add(h); g.handleY = 1.2; return g; }
export function phoneProp() {
  const g = new THREE.Group(), b = new Batch(); b.box(paint('#1b1c1f', { roughness: 0.3 }), 1.1, 2.1, 0.12, 0, 0, 0, { r: 0.08 }); b.done(g);
  const t = canvasTex(330, 630, (x, w, h) => { const G0 = x.createLinearGradient(0, 0, 0, h); G0.addColorStop(0, '#30486b'); G0.addColorStop(1, '#16324a'); x.fillStyle = G0; x.fillRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 92px ITTInter, sans-serif'; x.fillText('4:45', w / 2, 210); x.font = '700 40px ITTInter, sans-serif'; x.fillText('PM', w / 2, 290); x.font = '500 28px ITTInter, sans-serif'; x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillText('Friday', w / 2, 345); });
  t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 1.96), new THREE.MeshBasicMaterial({ map: t })); s.position.z = 0.066; g.add(s); g.traverse((o) => { if (o.isMesh) o.castShadow = false; }); return g;
}
export function blockWall() { const g = new THREE.Group(), b = new Batch(); const t = surf('concrete', '#8d8c84'); b.box(t, MALL.DW * 2 + 1.5, MALL.DH + 1, 0.6, 0, MALL.DH / 2 + 0.2, 0, { r: 0.02 }); b.done(g); const dark = paint('#6c6b64', { roughness: 0.85 }); const br = new Batch(); for (let y = 0; y < 8; y++) br.box(dark, 16, 0.06, 0.08, 0, 0.8 + y * 1.5, 0.32, { r: 0.01 }); for (let y = 0; y < 8; y++) for (let x = -2; x <= 2; x++) br.box(dark, 0.06, 1.5, 0.08, x * 3.2 + (y % 2) * 1.6, 1.5 + y * 1.5, 0.32, { r: 0.01 }); br.done(g); noShadow(g); return g; }

export function exteriorFacade() {
  const g = new THREE.Group(), b = new Batch(), M = mats(), w = paint('#d8cfba', { roughness: 0.8 }), band = paint(PAST.teal, { roughness: 0.55 }), { DW, DH } = MALL, Hh = 30;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 300), surf('concrete', '#7f8078', { roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, -150); ground.receiveShadow = true; g.add(ground);
  b.box(paint('#c7c2b2', { roughness: 0.8 }), 520, 0.5, 18, 0, 0.15, -9, { r: 0.05 }); b.box(paint('#aeaa9c'), 520, 0.5, 0.6, 0, 0.3, -18.2, { r: 0.05 });
  // lot lines
  for (let i = -6; i <= 6; i++) b.box(paint('#d9d6c6', { roughness: 0.8 }), 0.3, 0.04, 14, i * 11 + 5, 0.03, -34);
  // the facade, a door hole
  const zf = -0.3; b.box(w, 180 - DW, Hh, 1, -(180 + DW) / 2, Hh / 2, zf, { r: 0.05 }); b.box(w, 180 - DW, Hh, 1, (180 + DW) / 2, Hh / 2, zf, { r: 0.05 }); b.box(w, DW * 2, Hh - DH, 1, 0, (Hh + DH) / 2, zf, { r: 0.05 });
  b.box(band, 360, 1.6, 1.2, 0, Hh - 1.6, zf - 0.1, { r: 0.05 }); b.box(band, 26, 1, 8, 0, DH + 2.1, -4.5, { r: 0.08 }); for (const s of [-1, 1]) b.box(M.steel, 0.5, DH + 2, 0.5, s * 12.6, (DH + 2) / 2, -8.2, { r: 0.05 });
  for (const s of [-1, 1]) for (let i = 1; i < 6; i++) { const x = s * (DW + i * 22 - 8); b.box(paint('#b5bdb5', { metalness: 0.2, roughness: 0.3 }), 14, 8, 0.4, x, 6, zf - 0.6, { r: 0.05 }); b.box(M.trim, 15, 0.5, 0.6, x, 10.4, zf - 0.6, { r: 0.05 }); }
  for (const s of [-1, 1]) planter(b, s * 18, -7);
  // three plain parked cars, nothing recognisable
  const car = (x, z, col) => { const c = paint(col, { roughness: 0.3, metalness: 0.2 }); b.box(c, 5.4, 1.8, 11, x, 2, z, { r: 0.45 }); b.box(c, 4.8, 1.5, 6, x, 3.5, z + 0.4, { r: 0.45 }); b.box(paint('#2f3a42', { roughness: 0.2 }), 4.6, 1.1, 5.8, x, 3.6, z + 0.4, { r: 0.3 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(paint('#232426', { roughness: 0.9 }), 0.95, 0.95, 0.6, x + sx * 2.7, 0.95, z + sz * 3.4, { rz: Math.PI / 2, seg: 14 }); };
  car(-27, -34, '#b76f61'); car(-5.5, -34, '#6e8fa5'); car(39, -34, '#c6bea8');
  b.done(g);
  const t = canvasTex(1024, 180, (x, w0, h) => { x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, w0, h); x.fillStyle = '#2f5a55'; x.font = '800 124px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SHOPPING MALL', w0 / 2, h / 2 + 8); });
  t.colorSpace = THREE.SRGBColorSpace; const sign = new THREE.Mesh(new THREE.PlaneGeometry(23, 4.05), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.5, depthWrite: false })); sign.position.set(0, DH + 10.5, -0.94); sign.rotation.y = Math.PI; sign.castShadow = false; g.add(sign); sign.rotation.y = 0; sign.position.z = -0.94;
  sign.rotation.y = Math.PI;
  return g;
}
// a mall PA horn on the ceiling
export function paHorn() { const g = new THREE.Group(), b = new Batch(); b.box(paint('#dcd7c8', { roughness: 0.5 }), 1, 0.3, 1, 0, 0, 0, { r: 0.06 }); b.cyl(paint('#c7c1b1', { roughness: 0.4 }), 0.35, 1.1, 1.3, 0, -0.75, 0, { seg: 20 }); b.done(g); const c = new THREE.Mesh(new THREE.CircleGeometry(1.05, 20), paint('#3b3d3f', { roughness: 0.8 })); c.rotation.x = Math.PI / 2; c.position.y = -1.42; g.add(c); g.traverse((o) => { if (o.isMesh) o.castShadow = false; }); return g; }
export const mallMats = mats;
