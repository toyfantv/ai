// Episode 28's mansion kit (Liminal Horror 2): muted damask wallpaper, a herringbone parquet, wainscot, gilt picture frames, brass
// chandeliers, a grand staircase with a carpet runner and turned balusters, a banquet table with high-backed chairs and place settings,
// a gramophone, a grandfather clock, tall curtained windows, a panelled door, the mansion's facade with one real upstairs window room
// (sash that opens, curtains, a lamp), a wrought-iron fence and gate, bare trees, faceless Victorian guests, and paper things
// (an antique print with a back side, an invitation card). Every piece is a pure function of its inputs; anything that changes takes t.
import * as THREE from 'three';
import { v3, rng, clamp } from './core.js';
import { Batch, surf, paint } from './kit.js';
import { canvasTex } from './props.js';
import { makeCharacter } from './character.js';

const rep = (t, n = 8) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = n; t.colorSpace = THREE.SRGBColorSpace; return t; };
const worldMat = (map, span, o = {}) => { const m = new THREE.MeshStandardMaterial({ map, ...o }); m.userData.span = span; return m; };
export const GOLD = () => paint('#b08d4a', { metalness: 0.85, roughness: 0.34 });
export const DARKWOOD = () => surf('plank', '#5a3a26', { roughness: 0.45 });

// ---- surfaces ----
// damask: a faded ornamental motif on a muted ground, with water stains and a sun-faded band
export function damask(base = '#6f7a68', ink = '#5e6858', o = {}) {
  const t = rep(canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h); const r = rng(o.seed ?? 5);
    const motif = (cx, cy, s) => {
      x.save(); x.translate(cx, cy); x.scale(s, s); x.fillStyle = ink;
      for (const sx of [-1, 1]) {   // a mirrored acanthus-like leaf pair round a centre drop
        x.beginPath(); x.moveTo(0, -80); x.bezierCurveTo(sx * 46, -70, sx * 64, -20, sx * 30, 10); x.bezierCurveTo(sx * 60, 30, sx * 40, 76, 0, 86);
        x.bezierCurveTo(sx * 18, 50, sx * 8, 20, sx * 14, 0); x.bezierCurveTo(sx * 26, -30, sx * 10, -54, 0, -80); x.fill();
        x.beginPath(); x.ellipse(sx * 52, -46, 9, 18, sx * 0.6, 0, 7); x.fill(); x.beginPath(); x.ellipse(sx * 50, 50, 8, 16, -sx * 0.6, 0, 7); x.fill();
      }
      x.beginPath(); x.ellipse(0, 0, 10, 26, 0, 0, 7); x.fillStyle = base; x.fill(); x.restore();
    };
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) motif(i * 256 + (j % 2) * 128, j * 256 - 64 + 64, 0.9);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) motif(i * 256 + ((j + 1) % 2) * 128, j * 256 + 64 + 64, 0.42);
    for (let i = 0; i < 14000; i++) { x.fillStyle = `rgba(${r() > 0.5 ? '255,250,235' : '30,25,20'},${0.015 + r() * 0.03})`; x.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    for (let i = 0; i < 3; i++) { const g = x.createRadialGradient(r() * w, r() * h, 4, r() * w, r() * h, 60 + r() * 90); g.addColorStop(0, 'rgba(70,55,30,0.10)'); g.addColorStop(1, 'rgba(70,55,30,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  }));
  return worldMat(t, o.span ?? 9, { roughness: 0.85 });
}
// herringbone parquet, waxed
export function parquet(base = '#7a5236', o = {}) {
  const t = rep(canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#2a1a10'; x.fillRect(0, 0, w, h); const r = rng(o.seed ?? 9), L = 128, Wd = 32;
    const col = new THREE.Color(base);
    for (let j = -8; j < 40; j++) for (let i = -2; i < 10; i++) for (const k of [0, 1]) {
      const c = col.clone().multiplyScalar(0.78 + r() * 0.38); x.fillStyle = '#' + c.getHexString();
      x.save(); x.translate(i * L + k * Wd, j * Wd + k * Wd); x.rotate(k ? -Math.PI / 4 : Math.PI / 4); x.fillRect(0, 0, L - 3, Wd - 3);
      x.globalAlpha = 0.18; x.fillStyle = '#1e120a'; for (let g = 0; g < 4; g++) x.fillRect(r() * L, r() * Wd, 20 + r() * 50, 1); x.globalAlpha = 1; x.restore();
    }
  }));
  return worldMat(t, o.span ?? 12, { roughness: o.rough ?? 0.32 });
}
export const plaster = (col = '#d8d2c2') => surf('stucco', col, { roughness: 0.9 });

// ---- wainscot panels along a wall: x0..x1 along the wall's u, at a plane; place(b, u, y, w, h, d) adds a box in wall space ----
export function wainscot(b, len, h, place, o = {}) {
  const wood = o.mat || paint('#3e2c20', { roughness: 0.55 }), cap = o.cap || paint('#2c1f16', { roughness: 0.5 }), n = Math.max(1, Math.round(len / (o.panel ?? 5)));
  place(wood, 0, h / 2, len, h, 0.3); place(cap, 0, h + 0.15, len + 0.1, 0.3, 0.55); place(cap, 0, 0.3, len + 0.1, 0.6, 0.5);
  for (let i = 0; i < n; i++) { const u = -len / 2 + (i + 0.5) * len / n, pw = len / n - 0.9; place(cap, u, h * 0.52, pw, 0.16, 0.42); place(cap, u, h * 0.52, 0.16, h - 1.6, 0.42);
    place(wood, u, h * 0.52, pw - 0.5, h - 2.0, 0.36); }
}

// ---- a gilt picture frame: outer w x h; the picture plane (.pic) is (w - 2m) x (h - 2m); faces +z ----
export function ornateFrame(w, h, o = {}) {
  const g = new THREE.Group(), b = new Batch(), gold = o.gold || GOLD(), dark = paint('#3a2a14', { metalness: 0.6, roughness: 0.5 }), m = o.margin ?? Math.min(w, h) * 0.12;
  b.box(paint('#1a120c'), w, h, 0.2, 0, 0, -0.08, { r: 0.04 });
  const bar = (mat, bw, z, dz, inset = 0) => { const W = w - inset * 2, H = h - inset * 2;
    b.box(mat, W, bw, dz, 0, H / 2 - bw / 2, z, { r: bw * 0.3 }); b.box(mat, W, bw, dz, 0, -H / 2 + bw / 2, z, { r: bw * 0.3 });
    b.box(mat, bw, H, dz, -W / 2 + bw / 2, 0, z, { r: bw * 0.3 }); b.box(mat, bw, H, dz, W / 2 - bw / 2, 0, z, { r: bw * 0.3 }); };
  bar(gold, m * 0.5, 0.08, 0.34); bar(dark, m * 0.22, 0.17, 0.18, m * 0.42); bar(gold, m * 0.3, 0.2, 0.22, m * 0.62);
  const ros = new THREE.SphereGeometry(m * 0.32, 14, 10); ros.scale(1, 1, 0.5);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.add(gold, ros.clone(), sx * (w / 2 - m * 0.25), sy * (h / 2 - m * 0.25), 0.3);
  if (o.crest !== false) { const c = new THREE.SphereGeometry(m * 0.55, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); c.scale(1.6, 0.9, 0.4); b.add(gold, c, 0, h / 2 - m * 0.05, 0.16); }
  b.done(g);
  const pw = w - m * 1.9, ph = h - m * 1.9;
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), o.picMat || paint('#d8cdb4', { roughness: 0.7 })); pic.position.z = 0.06; pic.userData.noAO = true; g.add(pic);
  g.pic = pic; g.picW = pw; g.picH = ph;
  return g;
}

// ---- the antique-print shader: a render target (and an optional high-res detail of one rectangle) as an old sepia photograph ----
// uniforms: tP (the print), tD (the detail render of rect dR = [u0, v0, u1, v1]), tS (scratch overlay, alpha), aged 0..1, seed
export function printMat(o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { tP: { value: o.tex || null }, tD: { value: o.detail || null }, dR: { value: new THREE.Vector4(...(o.rect || [2, 2, 3, 3])) }, tS: { value: o.scratch || null }, hasS: { value: o.scratch ? 1 : 0 },
      border: { value: o.border ?? 0.06 }, seed: { value: o.seed ?? 1 }, sepia: { value: o.sepia ?? 1 }, gain: { value: o.gain ?? 1.0 } },
    vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 v; uniform sampler2D tP, tD, tS; uniform vec4 dR; uniform float hasS, border, seed, sepia, gain;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec2 q = (v - border) / (1.0 - 2.0 * border); vec3 paper = vec3(0.93, 0.89, 0.8) * (0.92 + 0.08 * n2(v * 14.0));
        if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) { gl_FragColor = vec4(paper * 0.92, 1.0); return; }
        vec3 p;
        if (q.x > dR.x && q.x < dR.z && q.y > dR.y && q.y < dR.w) p = texture2D(tD, (q - dR.xy) / (dR.zw - dR.xy)).rgb; else p = texture2D(tP, q).rgb;
        p = p / (p + 0.7) * 1.3 * gain;
        float l = dot(p, vec3(0.3, 0.59, 0.11)); l = pow(clamp(l, 0.0, 1.0), 1.25); l = clamp((l - 0.45) * 1.55 + 0.45, 0.0, 1.0); l = l * l * (3.0 - 2.0 * l);
        vec3 sep = mix(vec3(0.07, 0.045, 0.03), vec3(0.96, 0.87, 0.7), l); vec3 c = mix(p, sep, sepia);
        c *= 1.0 - 0.32 * pow(length(q - 0.5) * 1.35, 2.2);
        c += (h(q * 900.0) - 0.5) * 0.05;
        float spot = step(0.9985, h(floor(q * 260.0))); c = mix(c, vec3(0.95, 0.9, 0.8), spot * 0.6);
        c = mix(c, paper * 0.85, 0.06 + 0.1 * n2(q * 5.0 + seed));
        if (hasS > 0.5) { vec4 s = texture2D(tS, q); c = mix(c, vec3(0.94, 0.9, 0.82), s.a); }
        gl_FragColor = vec4(c, 1.0); }` });
}
// white scraped scratches over rectangles (faces), as a transparent canvas texture; rects: [[u, v, ru, rv]] centre + radii in 0..1 (v up)
export function scratchTex(rects, seed = 3, W = 512, H = 640) {
  const t = canvasTex(W, H, (x, w, h) => {
    x.clearRect(0, 0, w, h); const r = rng(seed); x.lineCap = 'round';
    for (const [u, vv, ru, rv] of rects) {
      const cx = u * w, cy = (1 - vv) * h, rx = ru * w, ry = rv * h;
      x.fillStyle = 'rgba(236,228,210,0.86)'; x.beginPath(); x.ellipse(cx, cy, rx * 0.78, ry * 0.8, 0, 0, 7); x.fill();
      for (let i = 0; i < 46; i++) { x.strokeStyle = `rgba(245,238,222,${0.55 + r() * 0.45})`; x.lineWidth = 1 + r() * 4; x.beginPath();
        const a = r() * 6.28, d = (0.6 + r() * 0.5); x.moveTo(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d);
        x.lineTo(cx + Math.cos(a + 2.4 + r()) * rx * d, cy + Math.sin(a + 2.4 + r()) * ry * d); x.stroke(); }
      for (let i = 0; i < 10; i++) { x.strokeStyle = 'rgba(70,50,30,0.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx + (r() - 0.5) * rx * 2, cy + (r() - 0.5) * ry * 2); x.lineTo(cx + (r() - 0.5) * rx * 2, cy + (r() - 0.5) * ry * 2); x.stroke(); }
    }
  });
  t.colorSpace = THREE.NoColorSpace; return t;
}

// ---- a loose print: thin card, the picture on the front (+y up when lying flat; front faces +y), a back with handwriting ----
export function loosePrint(frontMat, w = 2.4, h = 3.0, o = {}) {
  const g = new THREE.Group(), card = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, h), paint('#e9e2cf', { roughness: 0.8 }));
  g.add(card);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), frontMat); f.rotation.x = -Math.PI / 2; f.position.y = 0.017; f.userData.noAO = true; g.add(f); g.front = f;
  if (o.back) {
    const bt = canvasTex(512, 640, (x, W, H) => { x.fillStyle = '#e8dfc8'; x.fillRect(0, 0, W, H); const r = rng(4); for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(120,100,70,${r() * 0.06})`; x.fillRect(r() * W, r() * H, 2, 2); }
      x.fillStyle = '#3a3026'; x.textAlign = 'center'; x.font = 'italic 600 58px Georgia, "Times New Roman", serif'; o.back.forEach((l, i) => x.fillText(l, W / 2, H * 0.42 + i * 78)); });
    bt.colorSpace = THREE.SRGBColorSpace;
    const bk = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.85 })); bk.rotation.x = Math.PI / 2; bk.rotation.z = Math.PI; bk.position.y = -0.017; g.add(bk); g.back = bk;
  }
  return g;
}
// an invitation card (cream, gilt border) lying flat, text facing +y; its envelope with a wax seal beside it (.env)
export function invitation(lines, o = {}) {
  const w = o.w ?? 2.6, h = o.h ?? 3.4, g = new THREE.Group();
  const t = canvasTex(600, 784, (x, W, H) => {
    x.fillStyle = '#efe6cf'; x.fillRect(0, 0, W, H); const r = rng(8); for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(140,110,60,${r() * 0.05})`; x.fillRect(r() * W, r() * H, 2, 2); }
    x.strokeStyle = '#a8833c'; x.lineWidth = 10; x.strokeRect(26, 26, W - 52, H - 52); x.lineWidth = 3; x.strokeRect(46, 46, W - 92, H - 92);
    x.fillStyle = '#2c2218'; x.textAlign = 'center';
    lines.forEach(([txt, size, style, col], i) => { x.font = `${style || ''} ${size}px Georgia, "Times New Roman", serif`; x.fillStyle = col || '#2c2218'; x.fillText(txt, W / 2, 150 + i * (H - 260) / Math.max(1, lines.length - 1)); });
  });
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const card = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, h), paint('#efe6cf', { roughness: 0.8 })); g.add(card);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 })); f.rotation.x = -Math.PI / 2; f.position.y = 0.017; g.add(f);
  const env = new THREE.Group(), eb = new Batch(); eb.box(paint('#d9cdb0', { roughness: 0.85 }), w * 1.12, 0.06, h * 0.78, 0, 0, 0, { r: 0.02 });
  eb.cyl(paint('#7a1d22', { roughness: 0.4 }), 0.32, 0.34, 0.08, 0, 0.06, -0.05, { seg: 20 }); eb.done(env); g.env = env;
  return g;
}

// ---- a brass chandelier with candle bulbs and crystal drops; .level(k) ----
export function chandelier(o = {}) {
  const g = new THREE.Group(), b = new Batch(), brass = paint('#9c7a3c', { metalness: 0.85, roughness: 0.3 }), wax = paint('#efe7d6', { roughness: 0.5 }), R = o.r ?? 4.2;
  b.cyl(brass, 0.14, 0.14, o.drop ?? 6, 0, (o.drop ?? 6) / 2 + 1.4, 0, { seg: 8 });
  b.cyl(brass, 0.6, 0.25, 1.6, 0, 0.8, 0, { seg: 16 }); b.cyl(brass, 0.25, 0.7, 0.8, 0, -0.4, 0, { seg: 16 });
  const ring = (rad, y, th) => { const t = new THREE.TorusGeometry(rad, th, 8, 48); t.rotateX(Math.PI / 2); b.add(brass, t, 0, y, 0); };
  ring(R, 0, 0.12); ring(R * 0.55, 1.6, 0.1);
  const bulbs = [];
  const arms = (n, rad, y, ph) => { for (let i = 0; i < n; i++) { const a = ph + i / n * Math.PI * 2, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    b.box(brass, rad, 0.12, 0.12, x / 2, y - 0.15, z / 2, { r: 0.05, ry: -a }); b.cyl(brass, 0.32, 0.18, 0.2, x, y, z, { seg: 12 }); b.cyl(wax, 0.12, 0.12, 0.8, x, y + 0.5, z, { seg: 10 }); bulbs.push(v3(x, y + 1.05, z)); } };
  arms(8, R, 0.1, 0); arms(5, R * 0.55, 1.75, 0.3);
  b.done(g);
  const bm = new THREE.MeshBasicMaterial({ color: '#ffffff' }), bg = new THREE.SphereGeometry(0.16, 10, 8); bg.scale(1, 1.5, 1);
  const bi = new THREE.InstancedMesh(bg, bm, bulbs.length), M = new THREE.Matrix4(); bulbs.forEach((p, i) => bi.setMatrixAt(i, M.makeTranslation(p.x, p.y, p.z))); bi.userData.noAO = true; g.add(bi);
  // crystal drops hanging from the lower ring
  const cg = new THREE.OctahedronGeometry(0.16); cg.scale(1, 2.2, 1); const cm = new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.05, metalness: 0.1, emissive: '#ffe2b0', emissiveIntensity: 0.15 });
  const nC = 40, ci = new THREE.InstancedMesh(cg, cm, nC); for (let i = 0; i < nC; i++) { const a = i / nC * Math.PI * 2; ci.setMatrixAt(i, M.makeTranslation(Math.cos(a) * R * (i % 2 ? 0.97 : 0.8), -0.5 - (i % 3) * 0.3, Math.sin(a) * R * (i % 2 ? 0.97 : 0.8))); }
  ci.userData.noAO = true; g.add(ci);
  g.level = (k) => { bm.color.set(o.bulb || '#ffd9a0').multiplyScalar(0.25 + 1.05 * k); cm.emissiveIntensity = 0.05 + 0.2 * k; };
  g.level(1); return g;
}
// a wall sconce: brass back plate, two candle arms with small bulbs; faces +z; .level(k)
export function sconce(o = {}) {
  const g = new THREE.Group(), b = new Batch(), brass = paint('#9c7a3c', { metalness: 0.85, roughness: 0.3 }), wax = paint('#efe7d6', { roughness: 0.5 });
  b.box(brass, 0.7, 1.6, 0.14, 0, 0, 0.07, { r: 0.08 });
  for (const s of [-1, 1]) { b.box(brass, 0.12, 0.12, 0.9, s * 0.45, -0.2, 0.5, { r: 0.04, ry: s * 0.6 }); b.cyl(brass, 0.22, 0.12, 0.14, s * 0.75, -0.15, 0.85); b.cyl(wax, 0.09, 0.09, 0.6, s * 0.75, 0.2, 0.85, { seg: 8 }); }
  b.done(g);
  const bm = new THREE.MeshBasicMaterial({ color: '#ffd9a0' }), bg = new THREE.SphereGeometry(0.12, 8, 6); bg.scale(1, 1.6, 1);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(bg, bm); m.position.set(s * 0.75, 0.64, 0.85); m.userData.noAO = true; g.add(m); }
  g.level = (k) => bm.color.set(o.bulb || '#ffd9a0').multiplyScalar(0.2 + 1.0 * k); g.level(1);
  return g;
}

// ---- furniture ----
// a high-backed carved dining chair, seat front toward +z; seat top at 2.35
export function bigChair(o = {}) {
  const g = new THREE.Group(), b = new Batch(), wood = o.wood || DARKWOOD(), vel = paint(o.velvet || '#5a2a33', { roughness: 0.92 }), gold = GOLD();
  b.box(wood, 2.8, 0.3, 2.7, 0, 2.0, 0, { r: 0.08 }); b.box(vel, 2.6, 0.4, 2.5, 0, 2.3, 0.04, { r: 0.18 });
  for (const x of [-1.15, 1.15]) { b.box(wood, 0.3, 2.0, 0.3, x, 1.0, 1.05, { r: 0.08 }); b.box(wood, 0.32, 6.2, 0.32, x, 3.1, -1.12, { r: 0.08 }); b.cyl(gold, 0.2, 0.2, 0.3, x, 6.3, -1.12, { seg: 10 }); }
  b.box(wood, 2.6, 0.4, 0.3, 0, 6.0, -1.12, { r: 0.12 }); b.box(vel, 1.9, 2.8, 0.22, 0, 4.25, -1.06, { r: 0.18 }); b.box(wood, 2.4, 0.22, 0.26, 0, 2.75, -1.12, { r: 0.06 });
  b.box(gold, 0.6, 0.3, 0.1, 0, 6.05, -0.95, { r: 0.08 });
  b.done(g); g.seatY = 2.5; return g;
}
// a long banquet table under a white cloth that drapes nearly to the floor; centred, long along z; top at .top
export function banquetTable(len = 34, wid = 7.2, o = {}) {
  const g = new THREE.Group(), b = new Batch(), cloth = paint(o.cloth || '#e9e3d4', { roughness: 0.88 }), runner = paint(o.runner || '#5a2a33', { roughness: 0.9 }), top = 4.3;
  b.box(cloth, wid, 0.12, len, 0, top, 0, { r: 0.05 });
  const fall = 2.6, fold = (x0, z0, along, n, ry) => { for (let i = 0; i < n; i++) { const u = (i + 0.5) / n - 0.5, x = along === 'z' ? x0 : x0 + u * wid, z = along === 'z' ? z0 + u * len : z0;
    b.box(cloth, along === 'z' ? 0.12 : wid / n + 0.02, fall, along === 'z' ? len / n + 0.02 : 0.12, x + (along === 'z' ? Math.sign(x0) * 0.05 * (i % 2) : 0), top - fall / 2, z + (along === 'z' ? 0 : Math.sign(z0) * 0.05 * (i % 2)), { r: 0.04, ry: ry }); } };
  fold(wid / 2, 0, 'z', 24, 0); fold(-wid / 2, 0, 'z', 24, 0); fold(0, len / 2, 'x', 6, 0); fold(0, -len / 2, 'x', 6, 0);
  b.box(runner, 1.8, 0.04, len - 1.2, 0, top + 0.08, 0, { r: 0.01 });
  for (const s of [-1, 1]) for (const e of [-1, 1]) b.box(DARKWOOD(), 0.5, top - fall - 0.05, 0.5, s * (wid / 2 - 0.6), (top - fall) / 2, e * (len / 2 - 0.8), { r: 0.08 });
  b.done(g); g.top = top + 0.06; return g;
}
// one place setting (plate with a gold rim, a domed portion of food, glass, cutlery, napkin), centred at the plate, diner toward +z
export function placeSetting(b, x, y, z, ry = 0, r = Math.random) {
  const china = paint('#f4f1ea', { roughness: 0.25 }), gold = GOLD(), silver = paint('#c9c9c4', { metalness: 0.9, roughness: 0.25 }), glass = new THREE.MeshStandardMaterial({ color: '#d8e4e8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 });
  const food = paint(['#8a5530', '#a46a3c', '#7d4b2a'][Math.floor(r() * 3)], { roughness: 0.6 }), veg = paint('#5d7a3a', { roughness: 0.7 }), nap = paint('#6b3038', { roughness: 0.9 });
  const rot = (dx, dz) => [x + dx * Math.cos(ry) + dz * Math.sin(ry), z - dx * Math.sin(ry) + dz * Math.cos(ry)];
  const P = (m, w, h, d, dx, dy, dz, o = {}) => { const [px, pz] = rot(dx, dz); b.box(m, w, h, d, px, y + dy, pz, { ...o, ry: (o.ry || 0) + ry }); };
  const C = (m, rt, rb, h, dx, dy, dz, seg = 24) => { const [px, pz] = rot(dx, dz); b.cyl(m, rt, rb, h, px, y + dy, pz, { seg }); };
  C(gold, 1.12, 1.12, 0.05, 0, 0.03, 0, 32); C(china, 1.05, 0.8, 0.1, 0, 0.08, 0, 32); C(china, 0.62, 0.62, 0.02, 0, 0.13, 0, 28);
  const dome = new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1.2, 0.7, 0.9); { const [px, pz] = rot(-0.1, 0.05); b.add(food, dome, px, y + 0.14, pz); }
  for (let i = 0; i < 3; i++) { const [px, pz] = rot(0.35 + i * 0.12, -0.25 + i * 0.18); b.add(veg, new THREE.SphereGeometry(0.11, 8, 6), px, y + 0.2, pz); }
  P(silver, 0.1, 0.04, 1.4, -1.45, 0.03, 0); P(silver, 0.1, 0.04, 1.4, 1.45, 0.03, 0); P(silver, 0.1, 0.04, 1.2, 1.65, 0.03, 0.05);
  P(nap, 0.7, 0.12, 1.0, -1.95, 0.06, 0.1, { r: 0.05 });
  C(glass, 0.24, 0.12, 0.6, 1.4, 0.75, -1.05, 14); C(glass, 0.03, 0.03, 0.5, 1.4, 0.3, -1.05, 6); C(glass, 0.22, 0.22, 0.04, 1.4, 0.04, -1.05, 14);
}
// a candelabrum for the table: base, stem, five arms; returns the candle-tip positions (flames are added by the caller)
export function candelabrum(b, x, y, z) {
  const silver = paint('#bdb6a6', { metalness: 0.9, roughness: 0.25 }), wax = paint('#efe7d6', { roughness: 0.5 }), tips = [];
  b.cyl(silver, 0.7, 0.85, 0.22, x, y + 0.11, z); b.cyl(silver, 0.12, 0.18, 2.6, x, y + 1.4, z, { seg: 10 });
  for (let i = -2; i <= 2; i++) { const dx = i * 0.62, hy = y + 2.6 - Math.abs(i) * 0.25;
    if (i) b.box(silver, Math.abs(dx), 0.1, 0.1, x + dx / 2, hy - 0.2, z, { r: 0.04 });
    b.cyl(silver, 0.2, 0.12, 0.18, x + dx, hy, z, { seg: 10 }); b.cyl(wax, 0.1, 0.1, 0.9 - Math.abs(i) * 0.1, x + dx, hy + 0.5, z, { seg: 8 }); tips.push(v3(x + dx, hy + 0.98 - Math.abs(i) * 0.05, z)); }
  return tips;
}
// a gramophone on a small side table: cabinet, turntable, tone arm, a flared brass horn pointing +z and up
export function gramophone(o = {}) {
  const g = new THREE.Group(), b = new Batch(), wood = DARKWOOD(), brass = paint('#a8853e', { metalness: 0.85, roughness: 0.3 }), felt = paint('#2a2a2a', { roughness: 0.9 });
  b.box(wood, 3.2, 0.3, 3.2, 0, 3.6, 0, { r: 0.1 }); for (const x of [-1.3, 1.3]) for (const z of [-1.3, 1.3]) b.box(wood, 0.25, 3.5, 0.25, x, 1.75, z, { r: 0.06 });
  b.box(wood, 2.2, 1.1, 2.2, 0, 4.3, 0, { r: 0.1 }); b.cyl(felt, 0.95, 0.95, 0.1, 0, 4.9, 0, { seg: 32 }); b.cyl(paint('#111111', { roughness: 0.3 }), 0.9, 0.9, 0.04, 0, 4.97, 0, { seg: 32 });
  b.cyl(brass, 0.06, 0.06, 1.0, 0.7, 5.1, -0.4, { rx: Math.PI / 2, ry: 0.6, seg: 8 });
  const pts = []; for (let i = 0; i <= 16; i++) { const k = i / 16; pts.push(new THREE.Vector2(0.08 + Math.pow(k, 3.2) * 1.9, k * 3.4)); }
  const horn = new THREE.LatheGeometry(pts, 28); horn.rotateX(0.9); b.add(brass, horn, 0.6, 5.0, -0.6);
  b.done(g); g.disc = null; return g;
}
// a grandfather clock: case, hood, dial (face +z), pendulum window; .set(t) swings the pendulum
export function grandClock() {
  const g = new THREE.Group(), b = new Batch(), wood = DARKWOOD(), gold = GOLD();
  b.box(wood, 2.6, 2.0, 2.0, 0, 1.0, 0, { r: 0.1 }); b.box(wood, 2.0, 6.0, 1.6, 0, 5.0, 0, { r: 0.08 }); b.box(wood, 2.8, 3.0, 2.0, 0, 9.4, 0, { r: 0.1 }); b.box(wood, 3.0, 0.5, 2.2, 0, 11.1, 0, { r: 0.12 });
  b.box(paint('#141010', { roughness: 0.1 }), 1.2, 4.2, 0.05, 0, 5.2, 0.81, { r: 0.04 }); b.cyl(gold, 1.05, 1.05, 0.12, 0, 9.4, 1.0, { rx: Math.PI / 2, seg: 32 });
  b.done(g);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.92, 40), new THREE.MeshStandardMaterial({ map: (() => { const t = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#ece3cc'; x.fillRect(0, 0, w, h); x.fillStyle = '#2a2018'; x.font = '700 26px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((s, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; x.fillText(s, 128 + Math.cos(a) * 98, 128 + Math.sin(a) * 98); });
    x.lineWidth = 8; x.strokeStyle = '#2a2018'; x.beginPath(); x.moveTo(128, 128); x.lineTo(128, 66); x.stroke(); x.lineWidth = 5; x.beginPath(); x.moveTo(128, 128); x.lineTo(178, 128); x.stroke(); }); t.colorSpace = THREE.SRGBColorSpace; return t; })(), roughness: 0.6 }));
  dial.position.set(0, 9.4, 1.07); g.add(dial);
  const pend = new THREE.Group(), pb = new Batch(); pb.cyl(gold, 0.04, 0.04, 3.0, 0, -1.5, 0, { seg: 6 }); pb.cyl(gold, 0.45, 0.45, 0.1, 0, -3.1, 0, { rx: Math.PI / 2, seg: 24 }); pb.done(pend); pend.position.set(0, 7.0, 0.7); g.add(pend);
  g.set = (t) => { pend.rotation.z = 0.16 * Math.sin(t * Math.PI); };
  return g;
}
// a tall window with heavy draped curtains, faces +z (into the room); night glass; w x h opening
export function curtainWindow(w = 7, h = 15, o = {}) {
  const g = new THREE.Group(), b = new Batch(), frame = paint(o.frame || '#d8d2c2', { roughness: 0.6 }), gold = GOLD();
  b.box(paint('#0d1424', { roughness: 0.1, metalness: 0.4, emissive: '#16233c', emissiveIntensity: 0.4 }), w, h, 0.1, 0, 0, -0.2);
  b.box(frame, w + 0.8, 0.5, 0.5, 0, h / 2 + 0.2, 0, { r: 0.08 }); b.box(frame, w + 1.0, 0.4, 0.8, 0, -h / 2 - 0.2, 0.1, { r: 0.08 });
  for (const s of [-1, 1]) b.box(frame, 0.45, h, 0.5, s * (w / 2 + 0.1), 0, 0, { r: 0.08 });
  for (let i = 1; i < 3; i++) b.box(frame, 0.16, h, 0.2, -w / 2 + w * i / 3, 0, -0.1, { r: 0.04 });
  for (let i = 1; i < 5; i++) b.box(frame, w, 0.16, 0.2, 0, -h / 2 + h * i / 5, -0.1, { r: 0.04 });
  b.cyl(gold, 0.16, 0.16, w + 4.4, 0, h / 2 + 1.2, 0.9, { rz: Math.PI / 2, seg: 10 }); for (const s of [-1, 1]) b.add(gold, new THREE.SphereGeometry(0.3, 12, 8), s * (w / 2 + 2.3), h / 2 + 1.2, 0.9);
  b.done(g);
  const vel = new THREE.MeshStandardMaterial({ color: o.curtain || '#4e2a32', roughness: 0.95, side: THREE.DoubleSide });
  const drape = (side) => { const cw = w * 0.42, geo = new THREE.PlaneGeometry(cw, h + 1.6, 24, 12), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), k = (y + (h + 1.6) / 2) / (h + 1.6); const pinch = 1 - 0.35 * Math.exp(-((k - 0.38) ** 2) / 0.01);
      p.setX(i, x * (0.55 + 0.45 * k) * pinch + side * cw * 0.0); p.setZ(i, 0.35 * Math.sin(x / cw * Math.PI * 7 + side) * (0.5 + 0.5 * k)); }
    geo.computeVertexNormals(); const m = new THREE.Mesh(geo, vel); m.position.set(side * (w / 2 + 0.4 - cw * 0.3), 0.4, 0.75); m.castShadow = true; m.receiveShadow = true; return m; };
  g.add(drape(-1), drape(1));
  const val = new THREE.Mesh(new THREE.BoxGeometry(w + 3, 1.4, 0.5), vel); val.position.set(0, h / 2 + 1.5, 1.0); g.add(val);
  return g;
}
// a six-panel door leaf in a frame: hinge at the origin, leaf along +x, faces +z; .leaf rotates; height h
export function panelDoor(o = {}) {
  const w = o.w ?? 4.4, h = o.h ?? 8.8, g = new THREE.Group(), leaf = new THREE.Group(), b = new Batch(), wood = o.mat || surf('plank', o.color || '#5c3c28', { roughness: 0.5 }), trim = paint(o.trim || '#4a2f1f', { roughness: 0.5 }), brass = GOLD();
  b.box(wood, w, h, 0.3, w / 2, h / 2, 0, { r: 0.04 });
  for (const s of [-1, 1]) for (let j = 0; j < 3; j++) { const pw = w * 0.36, ph = [h * 0.3, h * 0.22, h * 0.14][j], py = [h * 0.22, h * 0.52, h * 0.82][j]; b.box(trim, pw, ph, 0.08, w / 2 + s * w * 0.21, py, 0.18, { r: 0.05 }); b.box(wood, pw - 0.3, ph - 0.3, 0.1, w / 2 + s * w * 0.21, py, 0.2, { r: 0.05 }); }
  b.add(brass, new THREE.SphereGeometry(0.2, 12, 10), w - 0.45, h * 0.47, 0.35); b.add(brass, new THREE.SphereGeometry(0.2, 12, 10), w - 0.45, h * 0.47, -0.35);
  b.done(leaf); g.add(leaf); g.leaf = leaf;
  return g;
}

// ---- outside ----
// bare branching trees (seeded), as one batch
export function bareTrees(parent, spots, o = {}) {
  const b = new Batch(), bark = paint(o.color || '#2a2622', { roughness: 0.95 }), r = rng(o.seed ?? 4);
  const limb = (p, dir, len, rad, depth) => {
    const end = p.clone().add(dir.clone().multiplyScalar(len)), mid = p.clone().add(end).multiplyScalar(0.5);
    const g = new THREE.CylinderGeometry(rad * 0.7, rad, len, 7); const q = new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), dir.clone().normalize());
    g.applyQuaternion(q); b.add(bark, g, mid.x, mid.y, mid.z);
    if (depth <= 0 || rad < 0.08) return;
    const n = 2 + (r() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) { const d = dir.clone().add(v3((r() - 0.5) * 1.3, 0.25 + r() * 0.5, (r() - 0.5) * 1.3)).normalize(); limb(end, d, len * (0.62 + r() * 0.2), rad * 0.62, depth - 1); }
  };
  for (const s of spots) limb(v3(s.x, 0, s.z), v3((r() - 0.5) * 0.15, 1, (r() - 0.5) * 0.15).normalize(), s.h ?? 10, s.r ?? 0.9, s.depth ?? 4);
  return b.done(parent);
}
// a wrought-iron fence along x from x0 to x1 at z (spear-topped bars), with stone posts every 16
export function ironFence(b, x0, x1, z, o = {}) {
  const iron = paint('#16171a', { metalness: 0.6, roughness: 0.45 }), stone = surf('stucco', o.stone || '#7d786e'), h = o.h ?? 7;
  b.box(iron, x1 - x0, 0.2, 0.2, (x0 + x1) / 2, 1.0, z, { r: 0.05 }); b.box(iron, x1 - x0, 0.2, 0.2, (x0 + x1) / 2, h - 0.8, z, { r: 0.05 });
  for (let x = x0; x <= x1; x += 0.8) { b.box(iron, 0.12, h, 0.12, x, h / 2, z, { r: 0.03 }); b.add(iron, new THREE.ConeGeometry(0.16, 0.5, 4), x, h + 0.2, z); }
  for (let x = x0; x <= x1 + 0.01; x += 16) { b.box(stone, 1.6, h + 1.2, 1.6, x, (h + 1.2) / 2, z, { r: 0.1 }); b.box(stone, 2.0, 0.4, 2.0, x, h + 1.4, z, { r: 0.1 }); }
}

// The mansion: front faces +z at z = 0, centred on x = 0, two storeys (FH each) and a hipped roof. The upstairs centre window is real: a hole
// into a small lit room behind it (.winRoom), with a sash (.sash, .setSash(0..1) opens it), inside curtains (.curtL, .curtR, .blow(k, t)).
// Other windows: glass (.glass material: emissive for lit rooms at night via .lights(k)), frames, sills, shutters.
export function mansion(o = {}) {
  const g = new THREE.Group(), b = new Batch(), W = o.w ?? 64, D = o.d ?? 32, FH = o.fh ?? 13, H = FH * 2 + 2;
  const wall = surf('stucco', o.wall || '#8e877a'), trim = paint(o.trim || '#d9d1bf', { roughness: 0.6 }), roof = surf('shingle', o.roof || '#2b2d33'), stone = surf('cobble', '#6e695f'), dark = paint('#1d1a18');
  const glass = new THREE.MeshStandardMaterial({ color: '#141a22', roughness: 0.08, metalness: 0.5, emissive: '#ffbf72', emissiveIntensity: 0 });
  const WX = 0, WY = FH + 6.9, WW = 5.6, WH = 8.4;   // the real window's centre and opening
  // the front wall with one hole; side and back walls
  const z0 = 0, th = 1.0;
  const fw = (x, y, w, h) => b.box(wall, w, h, th, x, y, z0 - th / 2, { r: 0.02 });
  fw(-(W / 2 + WW / 2) / 2, H / 2, W / 2 - WW / 2, H); fw((W / 2 + WW / 2) / 2, H / 2, W / 2 - WW / 2, H);
  fw(0, (WY - WH / 2) / 2, WW, WY - WH / 2); fw(0, (WY + WH / 2 + H) / 2, WW, H - (WY + WH / 2));
  b.box(wall, th, H, D, -W / 2 + th / 2, H / 2, -D / 2, { r: 0.05 }); b.box(wall, th, H, D, W / 2 - th / 2, H / 2, -D / 2, { r: 0.05 }); b.box(wall, W, H, th, 0, H / 2, -D + th / 2, { r: 0.05 });
  // plinth, string course, cornice, quoins
  b.box(stone, W + 1.2, 2.2, D + 1.2, 0, 1.1, -D / 2, { r: 0.1 }); b.box(trim, W + 1.0, 0.7, 0.8, 0, FH + 0.6, z0 + 0.1, { r: 0.08 }); b.box(trim, W + 2.0, 1.2, 1.6, 0, H + 0.2, z0 + 0.2, { r: 0.1 });
  b.box(trim, 1.8, 0.8, D + 2, -W / 2 - 0.1, H + 0.2, -D / 2, { r: 0.1 }); b.box(trim, 1.8, 0.8, D + 2, W / 2 + 0.1, H + 0.2, -D / 2, { r: 0.1 });
  for (const s of [-1, 1]) for (let y = 2.6; y < H - 1; y += 2.2) b.box(trim, (y / 2.2) % 2 < 1 ? 2.2 : 1.5, 1.0, 1.2, s * (W / 2 - 0.6), y, z0 + 0.1, { r: 0.08 });
  // hipped roof: a stepped stack that tapers (reads as a slate hip from the ground), plus a ridge
  for (let i = 0; i < 9; i++) { const k = i / 9; b.box(roof, (W + 2) * (1 - k * 0.72), 1.3, (D + 2) * (1 - k * 0.8), 0, H + 1.0 + i * 1.15, -D / 2, { r: 0.12 }); }
  b.box(dark, W * 0.26, 0.6, 0.6, 0, H + 11.4, -D / 2, { r: 0.1 });
  for (const s of [-1, 1]) { b.box(surf('brick', '#5a4036'), 2.6, 9, 2.6, s * W * 0.3, H + 6, -D / 2 - 3, { r: 0.08 }); b.box(trim, 3.2, 0.6, 3.2, s * W * 0.3, H + 10.6, -D / 2 - 3, { r: 0.08 }); }
  // dormers
  for (const x of [-16, 0, 16]) { b.box(wall, 4.6, 4.2, 4, x, H + 3.6, -3, { r: 0.08 }); b.box(roof, 5.6, 0.8, 5, x, H + 6.0, -3, { r: 0.1, rz: 0 }); b.box(glass, 2.8, 2.6, 0.2, x, H + 3.4, -0.9, { r: 0.04 }); b.box(trim, 3.4, 0.3, 0.4, x, H + 2.0, -0.8, { r: 0.05 }); }
  // windows: columns at these x on both floors (the centre upstairs one is the real window)
  const cols = [-26, -18, -10, 10, 18, 26], wins = [];
  const win = (x, y, w, h, real) => {
    if (!real) b.box(glass, w, h, 0.2, x, y, z0 + 0.02, { r: 0.02 });
    b.box(trim, w + 1.0, 0.5, 0.8, x, y + h / 2 + 0.25, z0 + 0.3, { r: 0.06 }); b.box(trim, w + 1.4, 0.4, 1.2, x, y - h / 2 - 0.2, z0 + 0.5, { r: 0.06 });
    b.box(trim, w + 1.6, 1.0, 0.5, x, y + h / 2 + 1.0, z0 + 0.25, { r: 0.1 });
    for (const s of [-1, 1]) { b.box(trim, 0.45, h + 0.4, 0.6, x + s * (w / 2 + 0.22), y, z0 + 0.25, { r: 0.05 }); b.box(paint('#2f3a34', { roughness: 0.7 }), w * 0.5, h, 0.25, x + s * (w * 0.75 + 0.6), y, z0 + 0.15, { r: 0.04 }); }
    if (!real) { b.box(trim, 0.16, h, 0.2, x, y, z0 + 0.14, { r: 0.03 }); for (let k = 1; k < 3; k++) b.box(trim, w, 0.16, 0.2, x, y - h / 2 + h * k / 3, z0 + 0.14, { r: 0.03 }); }
    wins.push({ x, y });
  };
  for (const x of cols) { win(x, 6.8, 4.4, 7.4); win(x, FH + 6.2, 4.4, 7.4); }
  win(WX, WY, WW, WH, true);
  // the portico: steps, four columns, entablature, pediment; the front door between
  for (let i = 0; i < 4; i++) b.box(stone, 22 - i * 1.2, 0.55, 8 - i * 1.4, 0, 0.28 + i * 0.55, 4.6 - i * 0.7, { r: 0.06 });
  for (const x of [-8.4, -3.6, 3.6, 8.4]) { b.cyl(trim, 0.85, 0.95, FH - 2.4, x, 2.2 + (FH - 2.4) / 2, 5.2, { seg: 20 }); b.box(trim, 2.2, 0.6, 2.2, x, FH - 0.0, 5.2, { r: 0.08 }); b.box(trim, 2.2, 0.5, 2.2, x, 2.45, 5.2, { r: 0.08 }); }
  b.box(trim, 21, 1.6, 4.2, 0, FH + 1.0, 4.4, { r: 0.1 });
  const ped = new THREE.BufferGeometry(); { const hw = 10.6, ph = 2.2, d0 = 2.2, d1 = 6.4, P = [-hw, 0, d0, hw, 0, d0, 0, ph, d0, -hw, 0, d1, hw, 0, d1, 0, ph, d1]; ped.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    ped.setIndex([3, 4, 5, 0, 2, 1, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5]); ped.computeVertexNormals(); ped.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(12).fill(0), 2)); }
  b.add(trim, ped, 0, FH + 1.8, 0);
  b.box(paint('#2a1c14', { roughness: 0.5 }), 5.2, 9.4, 0.4, 0, 2.2 + 4.7, z0 + 0.1, { r: 0.05 }); b.box(trim, 6.4, 0.8, 0.8, 0, 12.0, z0 + 0.3, { r: 0.06 });
  b.box(glass, 4.6, 1.6, 0.2, 0, 13.3, z0 + 0.15, { r: 0.04 });   // fanlight (lit at night)
  b.done(g);
  // the real window: a small wallpapered room behind it, a lamp, a sash, curtains
  const room = new THREE.Group(); room.position.set(WX, WY - WH / 2, z0 - th); g.add(room); g.winRoom = room;
  const rb = new Batch(), wp = damask('#8d8a76', '#7a7764', { seed: 2, span: 6 }), fl = parquet('#6a4630', { span: 6 }), RD = 9, RW = 12, RH = 11;
  rb.box(fl, RW, 0.3, RD, 0, -0.15, -RD / 2, { r: 0.02 }); rb.box(wp, RW, RH, 0.3, 0, RH / 2 - 1.5, -RD, { r: 0.02 }); rb.box(wp, 0.3, RH, RD, -RW / 2, RH / 2 - 1.5, -RD / 2, { r: 0.02 }); rb.box(wp, 0.3, RH, RD, RW / 2, RH / 2 - 1.5, -RD / 2, { r: 0.02 });
  rb.box(plaster('#d2cbb8'), RW, 0.3, RD, 0, RH - 1.5, -RD / 2, { r: 0.02 });
  rb.box(DARKWOOD(), 1.6, 4.6, 1.6, -4.0, 2.3 - 1.5 + 1.5, -RD + 1.4, { r: 0.08 });   // a side table with a lamp
  rb.done(room);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 1.2, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#f2d9a8', emissive: '#ffcf8a', emissiveIntensity: 0.8, side: THREE.DoubleSide, roughness: 0.8 }));
  shade.position.set(-4.0, 6.2, -RD + 1.4); room.add(shade); g.lampPos = () => room.localToWorld(v3(-4.0, 6.0, -RD + 1.6));
  // sash: two glazed sashes; the lower one slides up
  const sashM = paint('#e6dfcc', { roughness: 0.5 }), pane = new THREE.MeshStandardMaterial({ color: '#c8d4dc', roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.22, depthWrite: false });
  const mkSash = () => { const s = new THREE.Group(), sb = new Batch(); sb.box(sashM, WW, 0.3, 0.3, 0, WH / 4 - 0.15, 0, { r: 0.04 }); sb.box(sashM, WW, 0.3, 0.3, 0, -WH / 4 + 0.15, 0, { r: 0.04 });
    for (const sx of [-1, 1]) sb.box(sashM, 0.3, WH / 2, 0.3, sx * (WW / 2 - 0.15), 0, 0, { r: 0.04 }); sb.box(sashM, 0.12, WH / 2, 0.2, 0, 0, 0, { r: 0.03 }); sb.done(s);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(WW - 0.5, WH / 2 - 0.5), pane); p.renderOrder = 3; s.add(p); return s; };
  const upper = mkSash(); upper.position.set(WX, WY + WH / 4, z0 - 0.35); g.add(upper);
  const lower = mkSash(); lower.position.set(WX, WY - WH / 4, z0 - 0.1); g.add(lower); g.sash = lower;
  g.setSash = (k) => { lower.position.y = WY - WH / 4 + clamp(k) * (WH / 2 - 0.4); };
  // inside curtains, either side of the window; .blow(k, t) bellies them toward the opening and out
  const cm = new THREE.MeshStandardMaterial({ color: '#d9cfb8', roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  const mkCurt = (side) => { const geo = new THREE.PlaneGeometry(2.4, WH + 1.2, 10, 16); const base = geo.attributes.position.array.slice(); const m = new THREE.Mesh(geo, cm); m.position.set(WX + side * (WW / 2 - 0.6), WY, z0 - 1.6); m.userData.base = base; m.userData.side = side; g.add(m); return m; };
  g.curtL = mkCurt(-1); g.curtR = mkCurt(1);
  g.blow = (k, t) => { for (const m of [g.curtL, g.curtR]) { const p = m.geometry.attributes.position, B = m.userData.base, sd = m.userData.side;
    for (let i = 0; i < p.count; i++) { const x = B[i * 3], y = B[i * 3 + 1], low = clamp((WH / 2 + 0.6 - y) / (WH + 1.2)); const wav = Math.sin(y * 1.3 + t * 3.2 + sd) * 0.25 + Math.sin(x * 2 + t * 4.1) * 0.12;
      p.setX(i, x - sd * k * low * 1.0); p.setZ(i, B[i * 3 + 2] + k * low * low * (2.6 + wav * 1.5) + (1 - k) * 0.12 * Math.sin(x * 4 + sd)); }
    p.needsUpdate = true; m.geometry.computeVertexNormals(); } };
  g.blow(0, 0);
  g.glass = glass; g.wins = wins; g.realWin = v3(WX, WY, z0);
  g.lights = (k) => { glass.emissiveIntensity = 0.9 * k; };
  return g;
}

// ---- guests: Victorian party clothes on the procedural body, with no face at all ----
const GUESTS = [
  { shirt: '#1b1c22', pants: '#1b1c22', collar: '#eeeae0', hair: '#2a2018', hairStyle: 'short', hat: 'top', skin: '#e9c6a2' },
  { shirt: '#3a2f4a', pants: '#3a2f4a', hair: '#5a3a22', hairStyle: 'bun', gown: '#3a2f4a', female: true, skin: '#f0cfae' },
  { shirt: '#2b3324', pants: '#20241c', collar: '#e8e2d2', hair: '#6a6a66', hairStyle: 'short', skin: '#d9b08a' },
  { shirt: '#5a2a30', pants: '#5a2a30', hair: '#1c1612', hairStyle: 'long', gown: '#5a2a30', female: true, skin: '#c99872' },
  { shirt: '#2c2a26', pants: '#2c2a26', collar: '#ece6d6', hair: '#3a2a1c', hairStyle: 'short', hat: 'bowler', skin: '#eac4a0' },
  { shirt: '#4a5a5e', pants: '#4a5a5e', hair: '#b08a5a', hairStyle: 'bun', gown: '#4a5a5e', female: true, skin: '#f2d2b4' },
  { shirt: '#1e2430', pants: '#1e2430', collar: '#ebe6da', hair: '#d8d4cc', hairStyle: 'short', skin: '#e2b994' },
  { shirt: '#6a5a44', pants: '#6a5a44', hair: '#3a281a', hairStyle: 'wavy', gown: '#6a5a44', female: true, skin: '#a87452' },
  { shirt: '#26201c', pants: '#26201c', collar: '#e6dfcf', hair: '#151210', hairStyle: 'short', hat: 'top', skin: '#8a5a3c' },
  { shirt: '#2a3a4e', pants: '#2a3a4e', hair: '#22180f', hairStyle: 'bun', gown: '#2a3a4e', female: true, skin: '#e8c19c' },
  { shirt: '#3a3632', pants: '#2a2724', collar: '#ece6d6', hair: '#7a4a2a', hairStyle: 'short', skin: '#f0cdaa' },
  { shirt: '#4a3a52', pants: '#4a3a52', hair: '#9a9590', hairStyle: 'bun', gown: '#4a3a52', female: true, skin: '#eac8a8' },
];
export function guest(i, o = {}) {
  const d = { ...GUESTS[i % GUESTS.length], ...o };
  const ch = makeCharacter({ skin: d.skin, shirt: d.shirt, sleeves: d.shirt, pants: d.pants, shoes: '#141210', hair: d.hair, hairStyle: d.hairStyle, female: !!d.female, collar: d.collar, caustic: false });
  // no face: hide the face plane and the blink lid
  ch.neck.traverse((m) => { if (m.isMesh && m.material && m.material.isMeshBasicMaterial && m.geometry.type === 'PlaneGeometry') m.visible = false; });
  const b = new Batch();
  if (d.gown) { const gm = paint(d.gown, { roughness: 0.75 }), trim = paint(new THREE.Color(d.gown).multiplyScalar(0.6).getStyle(), { roughness: 0.7 });
    b.cyl(gm, 1.25, 1.9, 2.9, 0, -1.0, 0, { seg: 24 }); b.cyl(trim, 1.92, 1.95, 0.18, 0, -2.4, 0, { seg: 24 }); }
  if (d.collar && !d.gown) { b.box(paint('#141418', { roughness: 0.6 }), 2.06, 1.3, 1.06, 0, 0.0, -0.04, { r: 0.1 }); }   // tailcoat skirts behind the hips
  if (b.parts.size) { const sk = b.done(); ch.hips.add(sk); if (d.gown) ch.legs.forEach((l) => l.visible = false); }
  if (d.hat) { const hb = new Batch(), hm = paint('#121214', { roughness: 0.5 });
    if (d.hat === 'top') { hb.cyl(hm, 0.95, 0.95, 0.1, 0, 1.52, 0, { seg: 24 }); hb.cyl(hm, 0.62, 0.66, 1.5, 0, 2.3, 0, { seg: 24 }); hb.cyl(paint('#3a2a2a'), 0.67, 0.67, 0.2, 0, 1.68, 0, { seg: 24 }); }
    else { hb.cyl(hm, 1.0, 1.0, 0.1, 0, 1.52, 0, { seg: 24 }); const dm = new THREE.SphereGeometry(0.68, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); hb.add(hm, dm, 0, 1.55, 0); }
    ch.neck.add(hb.done()); }
  ch.lid = null;
  if (d.female) { const pearl = paint('#efe9dc', { roughness: 0.3 }); const nb = new Batch(); for (let k = -3; k <= 3; k++) nb.add(pearl, new THREE.SphereGeometry(0.09, 8, 6), k * 0.18, 1.88 - Math.abs(k) * 0.05, 0.52); ch.torso.add(nb.done()); }
  ch.root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return ch;
}
export const GUEST_COUNT = GUESTS.length;
