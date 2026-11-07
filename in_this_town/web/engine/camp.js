// Survival camp kit (Episode 25): a night camp in a dark pine forest and its exit gate.
//   const fire = campfire({ seed });  fire.update(t); fire.level(0..1)          a stone ring, crossed logs, embers, flames, rising sparks, one warm light
//   tent(), logSeat(len), woodPile(), axeStump(), lantern(), cookPot(), bedroll(), supplyCrate()       camp props (Groups)
//   const p = pines(scene, list, o)       instanced pines with a frost tint; p.vanish(fn) shrinks trees by fn(tree) -> 0..1
//   const g = exitGate(o);  g.set({ open, close, t })                            stone arch, runes and a swirling portal that irises shut
//   const w = beast(o);   w.update(t, { look })                                  a blocky wolf silhouette with glowing eyes
// Everything moves from t, so a frame depends only on t.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { v3, rng, clamp } from './core.js';
import { Batch, surf, paint } from './kit.js';
import { flame } from './atmos.js';
import { barkMat } from './forest.js';
import { glowSprite } from './props.js';

const M_ = {};
const pm = (k, c, o) => M_[k] || (M_[k] = paint(c, o));
const logMat = () => M_.log || (M_.log = barkMat('#5a4230'));
const charMat = () => M_.char || (M_.char = new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 0.95, emissive: '#ff4a10', emissiveIntensity: 0.0 }));

// a log with sawn ends (rings), lying along x
function logGeo(len, r, seed = 1) {
  const g = new THREE.CylinderGeometry(r, r * 1.04, len, 14, 4, false); g.rotateZ(Math.PI / 2);
  const p = g.attributes.position, rr = rng(seed);
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const v = 0.85 + rr() * 0.25; col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
let RINGS = null;
function ringMat() {
  if (RINGS) return RINGS;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#c89a62'; x.fillRect(0, 0, 128, 128);
  for (let r = 4; r < 64; r += 5) { x.strokeStyle = `rgba(110,70,35,${0.35 + (r % 10) * 0.03})`; x.lineWidth = 1.6; x.beginPath(); x.arc(64 + Math.sin(r) * 1.5, 64, r, 0, 7); x.stroke(); }
  x.strokeStyle = '#4a321e'; x.lineWidth = 7; x.beginPath(); x.arc(64, 64, 61, 0, 7); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  RINGS = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  return RINGS;
}
function addLog(g, len, r, x, y, z, ry = 0, rz = 0, seed = 1) {
  const L = new THREE.Group(); L.position.set(x, y, z); L.rotation.set(0, ry, rz); g.add(L);
  const m = new THREE.Mesh(logGeo(len, r, seed), logMat()); m.castShadow = m.receiveShadow = true; L.add(m);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 18), ringMat()); e.rotation.y = s * Math.PI / 2; e.position.x = s * (len / 2 + 0.01); e.receiveShadow = true; L.add(e); }
  return L;
}

// ---- the campfire ----
export function campfire(o = {}) {
  const g = new THREE.Group(), r = rng(o.seed || 25), b = new Batch();
  const stone = surf('cobble', '#7d7a74', { roughness: 0.95 }), stone2 = pm('stoneD', '#5d5a56', { roughness: 0.95, flatShading: true });
  for (let i = 0; i < 13; i++) { const a = i / 13 * Math.PI * 2, d = 2.15 + r() * 0.15, s = 0.48 + r() * 0.2;
    const geo = new THREE.IcosahedronGeometry(s, 1); geo.scale(1.2, 0.75, 1); b.add(i % 2 ? stone : stone2, geo, Math.cos(a) * d, s * 0.5, Math.sin(a) * d, r() * 6); }
  b.done(g);
  // ash bed and embers
  const ash = new THREE.Mesh(new THREE.CircleGeometry(1.9, 28), new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 1 })); ash.rotation.x = -Math.PI / 2; ash.position.y = 0.04; ash.receiveShadow = true; g.add(ash);
  const emb = document.createElement('canvas'); emb.width = emb.height = 128; { const x = emb.getContext('2d'), d = x.createRadialGradient(64, 64, 4, 64, 64, 62); d.addColorStop(0, '#ffd27a'); d.addColorStop(0.35, '#ff7a1e'); d.addColorStop(0.75, '#7a1a04'); d.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = d; x.fillRect(0, 0, 128, 128);
    const rr = rng(3); for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(20,10,5,${0.3 + rr() * 0.5})`; x.beginPath(); x.arc(rr() * 128, rr() * 128, 2 + rr() * 6, 0, 7); x.fill(); } }
  const embT = new THREE.CanvasTexture(emb); embT.colorSpace = THREE.SRGBColorSpace;
  const embers = new THREE.Mesh(new THREE.CircleGeometry(1.5, 28), new THREE.MeshBasicMaterial({ map: embT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.4, 1.4, 1.4) }));
  embers.rotation.x = -Math.PI / 2; embers.position.y = 0.07; embers.userData.noAO = true; g.add(embers);
  // crossed logs, a teepee, charred where they meet
  const logs = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; const L = addLog(g, 2.6, 0.18 + r() * 0.05, Math.cos(a) * 0.62, 0.78, Math.sin(a) * 0.62, -a, -0.95, 10 + i); L.children[0].material = logMat(); logs.push(L); }
  for (let i = 0; i < 2; i++) addLog(g, 3.2, 0.26, 0, 0.3, (i - 0.5) * 1.2, 0.2 + i * 1.6, 0, 20 + i);
  const charred = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), charMat()); charred.scale.set(1, 0.6, 1); charred.position.y = 0.45; g.add(charred);
  // flames: one big, a ring of small ones, only the big one makes light (a real point light with soft shadows)
  const fl = [flame(g, { size: 1.7, pos: v3(0, 0.35, 0), color: '#ff8a2a', light: false, seed: 1 })];
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.5; fl.push(flame(g, { size: 0.75 + r() * 0.35, pos: v3(Math.cos(a) * 0.55, 0.3, Math.sin(a) * 0.55), color: i % 2 ? '#ff6a1a' : '#ffa23a', light: false, seed: 2 + i })); }
  // softer flame colours than a torch: orange outside, amber core, so the fire never reads as a white cone
  fl.forEach((f, i) => { f.children[0].material.color.set(i % 2 ? '#e8460a' : '#f2600e').multiplyScalar(1.0); f.children[1].material.color.set('#ff9a30').multiplyScalar(1.15); });
  const light = new THREE.PointLight('#ff9a48', o.intensity ?? 160, o.distance ?? 60, 1.7); light.position.set(0, 2.4, 0);
  if (o.shadow !== false) { light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -0.002; light.shadow.normalBias = 0.06; light.shadow.radius = 4; light.shadow.camera.near = 0.5; }
  g.add(light);
  const halo = glowSprite('#ff8a30', 7, 0.18); halo.position.y = 1.6; halo.userData.noAO = true; g.add(halo);
  // sparks drifting up
  const n = 90, pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * 1.2; pos[i * 3 + 1] = 0.5; pos[i * 3 + 2] = (r() - 0.5) * 1.2; seed[i] = r(); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const sm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, k: { value: 1 } },
    vertexShader: `attribute float seed; uniform float t, k; varying float a;
      void main(){ float ph = fract(t * (0.25 + seed * 0.35) + seed * 17.0); vec3 p = position;
        p.y += ph * (5.0 + seed * 5.0); p.x += sin(t * 2.0 + seed * 40.0) * ph * 1.2; p.z += cos(t * 1.7 + seed * 30.0) * ph * 1.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        a = (1.0 - ph) * k * step(0.25, fract(seed * 7.0 + t * 3.0 * seed));
        gl_PointSize = (1.0 + seed * 1.6) * 60.0 / max(1.0, -mv.z); }`,
    fragmentShader: `varying float a; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(1.0, 0.62, 0.22) * 1.8, a * smoothstep(0.5, 0.1, d)); }` });
  const sparks = new THREE.Points(sg, sm); sparks.frustumCulled = false; sparks.userData.noAO = true; g.add(sparks);
  let lv = 1;
  g.light = light; g.flames = fl;
  g.level = (k) => { lv = k; };
  g.update = (t) => {
    const f = 1 + 0.1 * Math.sin(t * 11.3) + 0.07 * Math.sin(t * 23.1 + 1) + 0.05 * Math.sin(t * 5.7);
    fl.forEach((x, i) => { x.update(t + i * 0.37); x.visible = lv > 0.02; x.scale.setScalar((i ? 0.95 : 1.7) * (0.4 + 0.6 * lv)); });
    light.intensity = (o.intensity ?? 160) * f * lv; halo.material.opacity = 0.18 * lv * f;
    sm.uniforms.t.value = t; sm.uniforms.k.value = lv; charMat().emissiveIntensity = 0.6 * lv * f; embers.material.color.setScalar(1.4 * (0.4 + 0.6 * lv));
  };
  if (o.parent) o.parent.add(g); if (o.pos) g.position.copy(o.pos);
  return g;
}

// ---- tents ----
export function tent(o = {}) {
  const g = new THREE.Group(), W = o.w ?? 6, D = o.d ?? 7, H = o.h ?? 4.4, col = o.color || '#4f6a3a';
  const canvasM = new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: '#141810', roughness: 1, side: THREE.DoubleSide });
  // two sloped sides (sagging a little), a back wall, an open front with tied-back flaps
  // the two canvas sides: a grid from eave to ridge, sagging a little between the poles
  const side = (s) => {
    const nu = 12, nv = 6, pos = [], idx = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const u = i / nu, v = j / nv, sag = 0.22 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      pos.push(s * (W / 2) * (1 - v) - s * sag * 0.9, H * v - sag * 0.4, (u - 0.5) * D); }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b2 = a + 1, c = a + nu + 1, d = c + 1; if (s > 0) idx.push(a, c, b2, b2, c, d); else idx.push(a, b2, c, b2, d, c); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setIndex(idx); pg.computeVertexNormals();
    const m = new THREE.Mesh(pg, canvasM); m.castShadow = m.receiveShadow = true; g.add(m);
    // seams down the canvas
    for (let i = 1; i < 4; i++) { const z = (i / 4 - 0.5) * D, sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, Math.hypot(W / 2, H), 0.08), seamM); sg.position.set(s * W / 4, H / 2, z); sg.rotation.z = s * Math.atan2(W / 2, H); g.add(sg); }
  };
  const seamM = new THREE.MeshStandardMaterial({ color: new THREE.Color(col).multiplyScalar(0.7), roughness: 0.9 });
  side(-1); side(1);
  const tri = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, H)]);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(tri), canvasM); back.position.z = -D / 2; back.castShadow = true; g.add(back);
  const inner = new THREE.Mesh(new THREE.ShapeGeometry(tri), dark); inner.position.z = -D / 2 + 0.3; g.add(inner);
  const fl = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(W / 2 * 0.55, 0), new THREE.Vector2(0, H)]);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.ShapeGeometry(fl), canvasM); f.position.set(s * W / 2 * 0.98, 0, D / 2 + 0.05); f.scale.x = -s; f.rotation.y = s * 0.35; f.castShadow = true; g.add(f); }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.95, D), dark); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05; g.add(floor);
  const b = new Batch(), pole = pm('pole', '#6b5034', { roughness: 0.8 }), rope = pm('rope', '#c9b48a', { roughness: 0.9 });
  b.cyl(pole, 0.08, 0.08, D + 1.2, 0, H + 0.02, 0, { rx: Math.PI / 2 });
  for (const z of [-D / 2 - 0.3, D / 2 + 0.3]) b.cyl(pole, 0.09, 0.1, H + 0.6, 0, (H + 0.6) / 2, z);
  // guy ropes and pegs
  for (const [x, z] of [[-W / 2 - 1.6, D / 2 + 1.2], [W / 2 + 1.6, D / 2 + 1.2], [-W / 2 - 1.6, -D / 2 - 1.2], [W / 2 + 1.6, -D / 2 - 1.2]]) {
    const top = v3(0, H + 0.4, Math.sign(z) * (D / 2 + 0.3)), bot = v3(x, 0.15, z), mid = top.clone().add(bot).multiplyScalar(0.5), len = top.distanceTo(bot);
    const c = new THREE.CylinderGeometry(0.025, 0.025, len, 5); const q = new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), bot.clone().sub(top).normalize()); c.applyQuaternion(q);
    b.add(rope, c, mid.x, mid.y, mid.z); b.cyl(pole, 0.05, 0.03, 0.5, x, 0.2, z);
  }
  b.done(g);
  if (o.pos) g.position.copy(o.pos); if (o.yaw != null) g.rotation.y = o.yaw;
  return g;
}

export function logSeat(len = 5, seed = 3) { const g = new THREE.Group(); addLog(g, len, 0.55, 0, 0.5, 0, 0, 0, seed); return g; }
export function woodPile(seed = 4) {
  const g = new THREE.Group(), r = rng(seed); let k = 0;
  for (let row = 0; row < 4; row++) for (let i = 0; i < 5 - row; i++) addLog(g, 2.6 + r() * 0.4, 0.26, 0, 0.27 + row * 0.47, (i - (4 - row) / 2) * 0.54, 0, 0, seed * 10 + k++).rotation.y = Math.PI / 2 + (r() - 0.5) * 0.12;
  return g;
}
export function axeStump(seed = 5) {
  const g = new THREE.Group(); const s = addLog(g, 1.3, 0.75, 0, 0.65, 0, 0, Math.PI / 2, seed);
  const b = new Batch(); b.cyl(pm('haft', '#8a6038', { roughness: 0.7 }), 0.07, 0.08, 2.4, 0.25, 2.2, 0.1, { rz: -0.5 });
  b.box(pm('steel', '#9aa0a8', { metalness: 0.8, roughness: 0.35 }), 0.7, 0.42, 0.08, -0.05, 1.42, 0.1, { r: 0.03, rz: -0.5 }); b.done(g); void s;
  return g;
}
// a hanging-style camp lantern: frame, warm glass, a small light (no shadow)
export function lantern(o = {}) {
  const g = new THREE.Group(), b = new Batch(), iron = pm('iron', '#2a2a2e', { metalness: 0.6, roughness: 0.45 });
  b.cyl(iron, 0.32, 0.36, 0.12, 0, 0.06, 0, { seg: 12 }); b.cyl(iron, 0.22, 0.34, 0.2, 0, 1.12, 0, { seg: 12 });
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.78; b.cyl(iron, 0.03, 0.03, 0.95, Math.cos(a) * 0.3, 0.6, Math.sin(a) * 0.3); }
  b.add(iron, new THREE.TorusGeometry(0.16, 0.03, 6, 16), 0, 1.36, 0); b.done(g);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.9, 12), new THREE.MeshStandardMaterial({ color: '#ffcf8a', emissive: '#ffa040', emissiveIntensity: o.glow ?? 1.6, roughness: 0.2, transparent: true, opacity: 0.85 }));
  glass.position.y = 0.58; glass.userData.noAO = true; g.add(glass);
  if (o.light !== false) { const l = new THREE.PointLight('#ffb060', o.intensity ?? 14, 12, 1.8); l.position.y = 0.7; g.add(l); g.light = l; }
  g.glass = glass; return g;
}
export function cookPot() {
  const g = new THREE.Group(), b = new Batch(), iron = pm('iron', '#2a2a2e', { metalness: 0.6, roughness: 0.45 }), wood = pm('haft', '#8a6038', { roughness: 0.7 });
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; b.cyl(wood, 0.06, 0.08, 4.4, Math.cos(a) * 0.9, 2.0, Math.sin(a) * 0.9, { rx: -Math.sin(a) * 0.42, rz: Math.cos(a) * 0.42 }); }
  b.cyl(iron, 0.012, 0.012, 1.0, 0, 3.1, 0); b.add(iron, new THREE.SphereGeometry(0.62, 16, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), 0, 2.85, 0); b.add(iron, new THREE.TorusGeometry(0.5, 0.05, 6, 20), 0, 2.4, 0, 0, Math.PI / 2);
  b.done(g); return g;
}
export function bedroll(color = '#7a3a32') {
  const g = new THREE.Group(), b = new Batch(); b.box(pm('roll' + color, color, { roughness: 0.95 }), 2.0, 0.3, 5.2, 0, 0.15, 0, { r: 0.14 });
  b.cyl(pm('roll2' + color, '#c8b896', { roughness: 0.95 }), 0.5, 0.5, 2.0, 0, 0.5, -2.2, { rz: Math.PI / 2 }); b.done(g); return g;
}
export function supplyCrate(seed = 1) {
  const g = new THREE.Group(), b = new Batch(), wood = surf('plank', '#8a6a44'), band = pm('band', '#3a3a3e', { metalness: 0.6, roughness: 0.5 });
  b.box(wood, 2.2, 1.6, 1.6, 0, 0.8, 0, { r: 0.06 }); for (const x of [-0.8, 0.8]) b.box(band, 0.12, 1.66, 1.66, x, 0.8, 0, { r: 0.03 }); b.done(g); void seed; return g;
}

// ---- pines: trunk + stacked cones, frost on the upper sides; instanced ----
function pineGeo(seed) {
  const r = rng(seed), parts = [], tiers = 6, H = 26;
  const trunk = new THREE.CylinderGeometry(0.42, 0.75, H * 0.5, 8); trunk.translate(0, H * 0.25, 0);
  const cones = [];
  for (let i = 0; i < tiers; i++) { const y = H * (0.22 + i * 0.13), rad = (1 - i / tiers) * 7.2 + 1.2, h = 6.4 - i * 0.45;
    const c = new THREE.ConeGeometry(rad, h, 9, 2); c.rotateY(r() * 2); const p = c.attributes.position;
    for (let k = 0; k < p.count; k++) { const yy = p.getY(k); if (yy < -h / 2 + 0.01) p.setY(k, yy - 0.6 * (0.5 + 0.5 * Math.sin(k * 2.7))); }
    c.translate(0, y + h / 2, 0); cones.push(c); }
  const leaves = mergeGeometries(cones.map((c) => c.toNonIndexed()), false); leaves.computeVertexNormals();
  const n = leaves.attributes.normal, pos = leaves.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const up = Math.max(0, n.getY(i)); const frost = Math.pow(up, 2.5) * 0.9 * (0.5 + 0.5 * Math.sin(pos.getX(i) * 3 + pos.getZ(i) * 2)) ;
    const base = [0.06, 0.15, 0.1]; for (let j = 0; j < 3; j++) col[i * 3 + j] = base[j] + (0.7 - base[j]) * Math.min(0.5, frost); }
  leaves.setAttribute('color', new THREE.BufferAttribute(col, 3));
  void parts;
  return { trunk, leaves, H };
}
const pineLeaf = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
export function pines(scene, list, o = {}) {
  const shapes = [pineGeo(3), pineGeo(8)], parent = o.parent || scene;
  const sets = shapes.map((sh, k) => {
    const items = list.filter((t) => (t.shape ?? 0) % 2 === k), n = Math.max(1, items.length);
    const trunk = new THREE.InstancedMesh(sh.trunk, o.bark || barkMat('#4a3828'), n), leaves = new THREE.InstancedMesh(sh.leaves, o.leaf || pineLeaf, n);
    const c = new THREE.Color();
    items.forEach((t, i) => leaves.setColorAt(i, c.setScalar(0.75 + (((t.x * 3.1 + t.z * 1.7) % 1) + 1) % 1 * 0.45)));
    for (const m of [trunk, leaves]) { m.castShadow = o.shadows !== false; m.receiveShadow = true; m.frustumCulled = false; m.count = items.length; parent.add(m); }
    return { items, trunk, leaves };
  });
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = v3(1, 1, 1), p = v3(0, 0, 0);
  const set = {
    sets,
    vanish(fn) {
      for (const g of sets) {
        g.items.forEach((t, i) => { const k = fn ? clamp(fn(t)) : 0, sc = t.s * (1 - k);
          q.setFromEuler(e.set(0, t.yaw || 0, 0)); M.compose(p.set(t.x, (t.y || 0) - 0.0, t.z), q, s.set(Math.max(1e-4, sc * (1 + 0.25 * Math.sin(k * 3.14))), Math.max(1e-4, sc), Math.max(1e-4, sc * (1 + 0.25 * Math.sin(k * 3.14)))));
          g.trunk.setMatrixAt(i, M); g.leaves.setMatrixAt(i, M); });
        g.trunk.instanceMatrix.needsUpdate = true; g.leaves.instanceMatrix.needsUpdate = true;
      }
    },
    set visible(v) { sets.forEach((g) => { g.trunk.visible = g.leaves.visible = v; }); },
  };
  set.vanish(null);
  return set;
}

// ---- the exit gate: two rune pillars, a stone arch, a portal disc that swirls and irises shut ----
export function exitGate(o = {}) {
  const g = new THREE.Group(), R = o.radius ?? 5.2, b = new Batch(), r = rng(o.seed || 9);
  const stone = surf('cobble', '#8a8f96', { roughness: 0.9 }), dark = pm('gateD', '#4a4f58', { roughness: 0.9, flatShading: true });
  for (const s of [-1, 1]) { b.box(stone, 2.2, 1.0, 2.2, s * (R + 1.0), 0.5, 0, { r: 0.12 }); for (let i = 0; i < 4; i++) b.box(i % 2 ? dark : stone, 1.7, 2.0, 1.7, s * (R + 1.0), 2.0 + i * 2.05, 0, { r: 0.14, ry: (r() - 0.5) * 0.12 }); }
  // the arch: wedge stones on a half circle above the pillars
  const cy = 8.6;
  for (let i = 0; i <= 10; i++) { const a = Math.PI * i / 10, x = Math.cos(a) * (R + 1.0), y = cy + Math.sin(a) * (R + 1.0) * 0.72; b.box(i % 2 ? stone : dark, 1.9, 1.55, 1.9, x, y, 0, { r: 0.12, rz: a - Math.PI / 2 }); }
  b.box(stone, 1.6, 2.0, 2.1, 0, cy + (R + 1.0) * 0.72 + 0.4, 0, { r: 0.12 });
  b.done(g);
  // glowing runes on the pillars' faces
  const rc = document.createElement('canvas'); rc.width = 128; rc.height = 512; { const x = rc.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 128, 512); x.strokeStyle = '#fff'; x.lineWidth = 7; x.lineCap = 'round'; const rr = rng(12);
    for (let i = 0; i < 6; i++) { const y = 40 + i * 80; x.beginPath(); x.moveTo(40 + rr() * 20, y); x.lineTo(64, y + 30 + rr() * 10); x.lineTo(88 - rr() * 20, y); if (rr() > 0.4) { x.moveTo(64, y - 10); x.lineTo(64, y + 50); } if (rr() > 0.5) { x.moveTo(44, y + 40); x.lineTo(84, y + 40); } x.stroke(); } }
  const rt = new THREE.CanvasTexture(rc);
  const runeM = new THREE.MeshBasicMaterial({ map: rt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color('#7fe8ff') });
  for (const s of [-1, 1]) for (const zf of [1, -1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 7.2), runeM); m.position.set(s * (R + 1.0), 5.1, zf * 0.87); if (zf < 0) m.rotation.y = Math.PI; m.userData.noAO = true; g.add(m); }
  // the portal: an ellipse filling the arch, a shader swirl of gold and cyan, an iris radius
  const U = { t: { value: 0 }, open: { value: 0 }, iris: { value: 1 }, bright: { value: o.bright ?? 1.3 } };
  const pm2 = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: U,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float t, open, iris, bright;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ vec2 p = vUv * 2.0 - 1.0; float d = length(p), a = atan(p.y, p.x);
        float R = iris * open; if (d > R) discard;
        float sw = n(vec2(a * 3.0 + d * 6.0 - t * 1.6, d * 4.0 - t * 0.7)) * 0.6 + n(vec2(a * 6.0 - t * 2.2, d * 9.0)) * 0.4;
        vec3 gold = vec3(1.0, 0.78, 0.42), cyan = vec3(0.45, 0.9, 1.0), white = vec3(1.0, 0.97, 0.9);
        vec3 c = mix(cyan, gold, smoothstep(0.25, 0.85, sw));
        c = mix(c, white, smoothstep(0.55, 0.0, d / max(0.001, R)) * 0.3);
        float rim = smoothstep(R - 0.12, R - 0.01, d);
        c += cyan * rim * 1.2;
        float a2 = 0.82 + 0.18 * sw;
        gl_FragColor = vec4(c * bright * (0.75 + 0.35 * sw), a2 * smoothstep(R, R - 0.02, d)); }` });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(2 * R, 2 * (cy + R * 0.72 - 0.4) * 0.5 * 1.0 + 0.0), pm2);
  const dh = cy + R * 0.72 - 0.6; disc.geometry = new THREE.PlaneGeometry(2 * R * 0.98, dh); disc.position.set(0, dh / 2 + 0.1, 0); disc.userData.noAO = true; g.add(disc);
  // a light the gate throws on the ground and on Noah; a ground glow
  const light = new THREE.PointLight('#bfefff', 0, 26, 2.0); light.position.set(0, 5, 1.5); g.add(light);
  const pool = glowSprite('#9fe8ff', 18, 0); pool.position.set(0, 4.5, 0.4); pool.userData.noAO = true; g.add(pool);
  g.disc = disc; g.light = light; g.U = U;
  g.set = ({ open = 1, close = 0, t = 0 }) => {
    U.t.value = t; U.open.value = open; U.iris.value = Math.max(0, 1 - close) * 1.0;
    const k = open * (1 - close);
    light.intensity = (o.light ?? 70) * k; pool.material.opacity = 0.1 * k; runeM.color.set('#7fe8ff').multiplyScalar(0.35 + 1.2 * open * (0.85 + 0.15 * Math.sin(t * 3)));
    disc.visible = k > 0.002;
  };
  g.set({ open: 0 });
  if (o.pos) g.position.copy(o.pos); if (o.yaw != null) g.rotation.y = o.yaw;
  return g;
}

// ---- a creature in the dark: a blocky wolf silhouette with two glowing eyes ----
export function beast(o = {}) {
  const g = new THREE.Group(), b = new Batch(), fur = pm('fur', o.color || '#121418', { roughness: 1 });
  const S = o.size ?? 1;
  b.box(fur, 1.6, 1.5, 3.4, 0, 2.2, 0, { r: 0.3 }); b.box(fur, 1.3, 1.25, 1.3, 0, 2.9, 2.1, { r: 0.25 }); b.box(fur, 0.6, 0.5, 0.9, 0, 2.65, 2.95, { r: 0.12 });
  for (const s of [-1, 1]) { b.box(fur, 0.3, 0.6, 0.25, s * 0.42, 3.75, 1.9, { r: 0.06, rz: s * 0.2 }); for (const z of [-1.2, 1.2]) b.box(fur, 0.42, 1.6, 0.42, s * 0.52, 0.8, z, { r: 0.12 }); }
  b.box(fur, 0.35, 0.35, 1.6, 0, 2.6, -2.3, { r: 0.12, rx: 0.6 });
  b.done(g);
  const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.eye || '#ff5a2a').multiplyScalar(2.2) });
  const eyes = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.06), eyeM); e.position.set(s * 0.33, 3.1, 2.77); e.userData.noAO = true; g.add(e); eyes.push(e);
    const gl = glowSprite(o.eye || '#ff5a2a', 0.9, 0.5); gl.position.copy(e.position).add(v3(0, 0, 0.1)); gl.userData.noAO = true; g.add(gl); }
  g.scale.setScalar(S);
  g.update = (t) => { const blink = (Math.sin(t * 0.9 + (o.seed || 1) * 3) > 0.985); eyes.forEach((e) => { e.scale.y = blink ? 0.1 : 1; }); };
  if (o.pos) g.position.copy(o.pos); if (o.yaw != null) g.rotation.y = o.yaw;
  return g;
}

// snow falling through a box round a centre; wraps, a pure function of t
export function snow(scene, o = {}) {
  const n = o.count ?? 1500, S = o.size ?? 60, H = o.height ?? 30, c = o.centre || v3(0, H / 2, 0), r = rng(o.seed || 17);
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * S; pos[i * 3 + 1] = r() * H; pos[i * 3 + 2] = (r() - 0.5) * S; seed[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { t: { value: 0 }, H: { value: H }, px: { value: o.pointSize ?? 1 }, amount: { value: o.amount ?? 0.8 }, color: { value: new THREE.Color(o.color || '#eef4ff') } },
    vertexShader: `attribute float seed; uniform float t, H, px; varying float a;
      void main(){ vec3 p = position; p.y = mod(p.y - t * (1.4 + seed * 1.6), H) ; p.x += sin(t * 0.8 + seed * 50.0) * 0.9; p.z += cos(t * 0.6 + seed * 70.0) * 0.9;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; a = smoothstep(0.0, 2.0, p.y) * smoothstep(H, H - 3.0, p.y);
        gl_PointSize = min(px * (0.6 + seed) * 70.0 / max(1.0, -mv.z), 14.0 * px); }`,
    fragmentShader: `uniform vec3 color; uniform float amount; varying float a; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(color, a * amount * smoothstep(0.5, 0.15, d)); }` });
  const p = new THREE.Points(g, m); p.position.set(c.x, c.y - H / 2, c.z); p.frustumCulled = false; p.userData.noAO = true; (o.parent || scene).add(p);
  p.update = (t) => { m.uniforms.t.value = t; };
  return p;
}
