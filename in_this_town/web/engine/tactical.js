// Tactical kit (Episode 34, In This Town: The Soldiers Who Never Missed): a training rifle, the masked soldiers' gear, ranks of
// soldiers that move in perfect sync (one posed template drawn many times), gunfire effects (muzzle flashes, tracers, sparks,
// concrete dust, chips, brass casings, bullet holes, smoke) and the sets: an abandoned training hall with a side corridor, a
// steel door, the control room (a giant screen of feeds, a ceiling security camera) and the empty industrial district outside.
// Everything is a pure function of time: effects are lists of events made in setup, drawn by shaders or per-frame matrices.
import * as THREE from 'three';
import { clamp, lerp, smooth, rng, v3 } from './core.js';
import { Batch, surf, paint, sign, lamp, building } from './kit.js';
import { canvasTex } from './props.js';
import { aimArm, gripLocal } from './anims.js';

const ADD = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false };

// ---------------- the training rifle ----------------
// Built along +z with the origin at the pistol grip (where the right fist closes). .muzzle and .guard (the left hand) are local
// points; .mag is the magazine (move it for a reload); .tip is the orange training tip. o.body / o.trim colour it.
export function trainingRifle(o = {}) {
  const g = new THREE.Group(), b = new Batch();
  const body = paint(o.body || '#23262b', { metalness: 0.55, roughness: 0.42 }), dark = paint('#111316', { metalness: 0.6, roughness: 0.35 });
  const poly = paint(o.trim || '#3b3f36', { roughness: 0.7 }), orange = paint(o.tip || '#ff6a1a', { roughness: 0.5, emissive: '#5a1800', emissiveIntensity: 0.3 });
  b.box(body, 0.28, 0.36, 1.3, 0, 0.26, 0.35, { r: 0.05 });            // receiver
  b.box(dark, 0.2, 0.1, 1.1, 0, 0.47, 0.35, { r: 0.03 });               // top rail
  for (let i = 0; i < 6; i++) b.box(dark, 0.22, 0.04, 0.06, 0, 0.53, -0.05 + i * 0.17, { r: 0.01 });
  b.box(poly, 0.3, 0.32, 1.05, 0, 0.24, 1.48, { r: 0.07 });             // handguard
  for (let i = 0; i < 4; i++) b.box(dark, 0.31, 0.06, 0.12, 0, 0.22, 1.08 + i * 0.26, { r: 0.02 });
  b.cyl(dark, 0.055, 0.055, 0.7, 0, 0.26, 2.3, { rx: Math.PI / 2, seg: 10 });   // barrel
  b.cyl(dark, 0.085, 0.085, 0.22, 0, 0.26, 2.68, { rx: Math.PI / 2, seg: 10 }); // muzzle device
  b.box(poly, 0.2, 0.42, 0.18, 0, -0.08, -0.02, { r: 0.05, rx: 0.32 });  // pistol grip
  b.box(poly, 0.22, 0.28, 0.95, 0, 0.18, -0.8, { r: 0.06 });            // stock
  b.box(dark, 0.24, 0.42, 0.12, 0, 0.14, -1.26, { r: 0.04 });           // butt pad
  b.box(dark, 0.12, 0.2, 0.18, 0, 0.62, 0.15, { r: 0.03 });             // rear sight
  b.box(dark, 0.08, 0.22, 0.08, 0, 0.5, 1.95, { r: 0.02 });             // front sight
  b.box(dark, 0.06, 0.1, 0.3, 0.17, 0.3, 0.2, { r: 0.02 });             // charging handle
  b.done(g);
  const mb = new Batch(); mb.box(poly, 0.18, 0.62, 0.3, 0, 0, 0, { r: 0.04 }); g.mag = mb.done(); g.mag.position.set(0, -0.2, 0.55); g.mag.rotation.x = 0.18; g.add(g.mag);
  g.magRest = g.mag.position.clone();
  const tb = new Batch(); tb.cyl(orange, 0.1, 0.1, 0.16, 0, 0, 0, { rx: Math.PI / 2, seg: 12 }); g.tip = tb.done(); g.tip.position.set(0, 0.26, 2.82); g.add(g.tip);
  g.muzzle = v3(0, 0.26, 2.95); g.guard = v3(0, 0.12, 1.45); g.stockEnd = v3(0, 0.15, -1.3);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// ---------------- the masked soldiers' gear ----------------
// A featureless white mask over the whole face, a grey helmet, a chest plate with target rings (they stood in the range as
// targets). The avatar's own face is fully hidden under the mask (no double faces). Returns { mask, helmet, plate }.
let maskMat = null;
export function soldierGear(ch, o = {}) {
  const head = ch.head, box = new THREE.Box3();
  ch.root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
  head.traverse((m) => { if (m.isMesh && m.geometry) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld))); } });
  const c = box.getCenter(v3(0, 0, 0)), s = box.getSize(v3(0, 0, 0));
  maskMat ||= new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.32, metalness: 0.0 });
  const gb = new Batch(), helm = paint(o.helmet || '#5d6268', { roughness: 0.55, metalness: 0.15 }), strap = paint('#2a2d31', { roughness: 0.7 });
  // the mask: a slightly domed plate over the front of the head, wider and taller than the face
  const mg = new THREE.SphereGeometry(1, 28, 18, -Math.PI * 0.36, Math.PI * 0.72, Math.PI * 0.2, Math.PI * 0.62);
  mg.scale(s.x * 0.58, s.y * 0.6, s.z * 0.34);
  const mask = new THREE.Mesh(mg, maskMat); mask.position.set(c.x, c.y - s.y * 0.02, c.z + s.z * 0.27); mask.castShadow = true;
  // the helmet: a rounded shell on top and at the back, a rim, chin straps at the sides
  gb.box(helm, s.x * 1.12, s.y * 0.42, s.z * 1.1, c.x, c.y + s.y * 0.36, c.z - s.z * 0.04, { r: Math.min(s.x, s.y) * 0.18 });
  gb.box(helm, s.x * 1.16, s.y * 0.08, s.z * 1.16, c.x, c.y + s.y * 0.17, c.z, { r: 0.04 });
  gb.box(helm, s.x * 1.08, s.y * 0.55, s.z * 0.2, c.x, c.y + s.y * 0.05, c.z - s.z * 0.5, { r: 0.08 });
  for (const sx of [-1, 1]) gb.box(strap, 0.08, s.y * 0.5, 0.12, c.x + sx * s.x * 0.53, c.y - s.y * 0.08, c.z + s.z * 0.1, { r: 0.03 });
  const helmet = gb.done(); helmet.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  head.add(mask, helmet);
  // hide every head mesh's own face texture under the mask: the mask covers the front, and nothing pokes through it
  // the chest plate: a target (rings and a number) on the torso's front
  const tb = new THREE.Box3(); const tinv = new THREE.Matrix4().copy(ch.torso.matrixWorld).invert();
  for (const m of ch.torso.children) if (m.isMesh && m.geometry) { m.geometry.computeBoundingBox(); tb.union(m.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(tinv, m.matrixWorld))); }
  const tc = tb.getCenter(v3(0, 0, 0)), ts = tb.getSize(v3(0, 0, 0));
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(ts.x * 0.5, ts.x * 0.5), new THREE.MeshStandardMaterial({ map: targetTex(o.number ?? 7), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3 }));
  plate.position.set(tc.x, tc.y + ts.y * 0.08, tb.max.z + 0.02); ch.torso.add(plate);
  return { mask, helmet, plate };
}
const ttex = new Map();
export function targetTex(n = 7) {
  if (ttex.has(n)) return ttex.get(n);
  const t = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#e9e4d6'; x.fillRect(0, 0, w, h);
    for (let i = 5; i >= 1; i--) { x.beginPath(); x.arc(w / 2, h / 2, i * 23, 0, 7); x.fillStyle = i % 2 ? '#b8231c' : '#e9e4d6'; x.fill(); }
    x.fillStyle = '#1b1b1b'; x.font = '900 34px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText(String(n).padStart(3, '0'), w / 2, h - 10);
    x.strokeStyle = '#1b1b1b'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6);
  });
  t.colorSpace = THREE.SRGBColorSpace; ttex.set(n, t); return t;
}

// ---------------- ranks in perfect sync ----------------
// One posed template character, drawn at many places: every mesh under template.root becomes an InstancedMesh, and each frame
// the instances get offset * (the mesh's matrix relative to the template's root). places: [{ x, z, ry }]. .update() after posing.
export function syncRanks(scene, template, places, o = {}) {
  // the template's own root rotation (its turn) carries into every copy: the anchor is the root's position only
  const meshes = []; [template.root, ...(o.extra || [])].forEach((r) => r.traverse((m) => { if (m.isMesh && m.visible) meshes.push(m); }));
  const offs = places.map((p) => new THREE.Matrix4().compose(v3(p.x, p.y ?? 0, p.z), new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), p.ry ?? 0), v3(1, 1, 1)));
  const inst = meshes.map((m) => { const im = new THREE.InstancedMesh(m.geometry, m.material, places.length); im.castShadow = m.castShadow; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im; });
  const inv = new THREE.Matrix4(), rel = new THREE.Matrix4(), out = new THREE.Matrix4(), hide = new THREE.Matrix4().makeScale(0, 0, 0);
  const grp = { inst, places, visible: true, hidden: new Set() };
  grp.update = () => {
    template.root.updateMatrixWorld(true);
    const rp = new THREE.Vector3().setFromMatrixPosition(template.root.matrixWorld); inv.makeTranslation(-rp.x, -rp.y, -rp.z);
    (o.extra || []).forEach((r) => r.updateMatrixWorld(true));
    meshes.forEach((m, k) => {
      rel.multiplyMatrices(inv, m.matrixWorld); const im = inst[k]; im.visible = grp.visible && m.visible;
      for (let i = 0; i < offs.length; i++) im.setMatrixAt(i, grp.hidden.has(i) ? hide : out.multiplyMatrices(offs[i], rel));
      im.instanceMatrix.needsUpdate = true;
    });
  };
  // a point in template-root space (e.g. the muzzle) at every place
  grp.pointsOf = (local) => offs.map((o) => local.clone().applyMatrix4(o));
  return grp;
}

// ---------------- muzzle flashes ----------------
// n crossed star cards; .set(i, pos, dir, k) (k 0 hides it), .end() after the frame's sets
const flashTex = (() => { let t = null; return () => t ||= canvasTex(128, 128, (x, w, h) => {
  const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.2, 'rgba(255,214,120,0.9)'); g.addColorStop(0.55, 'rgba(255,120,30,0.35)'); g.addColorStop(1, 'rgba(255,80,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,236,170,0.9)'; for (let i = 0; i < 5; i++) { x.save(); x.translate(w / 2, h / 2); x.rotate(i / 5 * 6.283); x.beginPath(); x.moveTo(-5, 0); x.lineTo(0, -h * 0.48); x.lineTo(5, 0); x.fill(); x.restore(); }
}); })();
export function muzzleFlashes(scene, n, o = {}) {
  const g = new THREE.PlaneGeometry(1, 1); const g2 = g.clone().rotateY(Math.PI / 2); const g3 = new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2);
  const geo = (() => { const a = [g, g2, g3].map((x) => x.toNonIndexed()); const pos = []; const uv = []; for (const x of a) { pos.push(...x.attributes.position.array); uv.push(...x.attributes.uv.array); } const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return r; })();
  const m = new THREE.MeshBasicMaterial({ map: flashTex(), color: new THREE.Color(o.color || '#ffd28a').multiplyScalar(o.bright ?? 1.6), side: THREE.DoubleSide, ...ADD });
  const im = new THREE.InstancedMesh(geo, m, n); im.frustumCulled = false; im.userData.noAO = true; scene.add(im);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Z = v3(0, 0, 1), S = v3(1, 1, 1), hide = new THREE.Matrix4().makeScale(0, 0, 0);
  let used = 0;
  im.set = (i, pos, dir, k, size = 0.9) => {
    if (k <= 0.01) { im.setMatrixAt(i, hide); return; }
    Q.setFromUnitVectors(Z, dir.clone().normalize()); const sz = size * (0.6 + 0.4 * k);
    S.set(sz * 0.8, sz * 0.8, sz * 1.9); M.compose(pos.clone().addScaledVector(dir, sz * 0.7), Q, S); im.setMatrixAt(i, M); used = Math.max(used, i + 1);
  };
  im.clear = () => { for (let i = 0; i < n; i++) im.setMatrixAt(i, hide); };
  im.end = () => { im.instanceMatrix.needsUpdate = true; };
  im.clear(); return im;
}
// how bright a flash is at time t for shots fired at times list (each flash lives ~2.5 frames at 60 fps)
export function flashK(shots, t, life = 0.045) { for (const s of shots) { const d = t - s; if (d >= 0 && d < life) return 1 - d / life * 0.5; } return 0; }

// ---------------- tracers ----------------
// list: [{ t, a, b, speed? }] bright streaks from a toward b; .update(t)
export function tracers(scene, list, o = {}) {
  const n = list.length, len = o.len ?? 3.2;
  const geo = new THREE.BoxGeometry(0.05, 0.05, 1).translate(0, 0, -0.5);
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color || '#ffcf7a').multiplyScalar(o.bright ?? 2.2), ...ADD });
  const im = new THREE.InstancedMesh(geo, m, Math.max(1, n)); im.frustumCulled = false; im.userData.noAO = true; scene.add(im);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Z = v3(0, 0, 1), hide = new THREE.Matrix4().makeScale(0, 0, 0);
  const data = list.map((e) => { const d = e.b.clone().sub(e.a), L = d.length(); return { ...e, dir: d.normalize(), L, dur: L / (e.speed ?? 260) }; });
  im.update = (t) => {
    data.forEach((e, i) => {
      const u = (t - e.t) / e.dur;
      if (u < 0 || u > 1) { im.setMatrixAt(i, hide); return; }
      const head = e.a.clone().addScaledVector(e.dir, e.L * u), l = Math.min(len, e.L * u + 0.3);
      Q.setFromUnitVectors(Z, e.dir); M.compose(head, Q, v3(1, 1, l)); im.setMatrixAt(i, M);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  im.data = data;
  return im;
}

// ---------------- event particles (sparks, concrete dust, chips, casings) ----------------
// events: [{ t, p, n }] (time, world point, surface normal or a direction); each spawns `per` particles. kind:
//  'spark'  bright orange-white points that fly off the surface, fall and die fast
//  'dust'   soft grey puffs that bloom out of the hit and hang, drifting
//  'chip'   dark concrete crumbs with gravity
//  'brass'  casings: little gold blocks tumbling out with gravity
export function eventParticles(scene, events, o = {}) {
  const kind = o.kind || 'spark', per = o.per ?? 12, n = events.length * per, r = rng(o.seed ?? 11);
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), t0 = new Float32Array(n), sd = new Float32Array(n);
  const sp = o.speed ?? { spark: 11, dust: 2.2, chip: 6, brass: 3.5 }[kind];
  events.forEach((e, k) => {
    const nn = (e.n || v3(0, 1, 0)).clone().normalize();
    for (let j = 0; j < per; j++) {
      const i = k * per + j, d = v3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(kind === 'dust' ? 0.9 : 0.75).add(nn).normalize();
      const s = sp * (0.35 + r() * 0.9);
      pos.set([e.p.x, e.p.y, e.p.z], i * 3); vel.set([d.x * s, d.y * s + (kind === 'brass' ? 2.5 : 0), d.z * s], i * 3); t0[i] = e.t + r() * (kind === 'dust' ? 0.06 : 0.015); sd[i] = r();
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('vel', new THREE.BufferAttribute(vel, 3)); geo.setAttribute('t0', new THREE.BufferAttribute(t0, 1)); geo.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
  const life = o.life ?? { spark: 0.38, dust: 1.9, chip: 0.9, brass: 0.9 }[kind], grav = o.gravity ?? { spark: 22, dust: -0.6, chip: 26, brass: 30 }[kind];
  const px = o.size ?? { spark: 0.07, dust: 1.1, chip: 0.11, brass: 0.08 }[kind];
  const col = new THREE.Color(o.color || { spark: '#ffcf8a', dust: '#8e8a86', chip: '#4d4a47', brass: '#d8a845' }[kind]);
  const additive = kind === 'spark';
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
    uniforms: { t: { value: 0 }, life: { value: life }, g: { value: grav }, px: { value: px }, color: { value: additive ? col.multiplyScalar(o.bright ?? 2.2) : col }, tint: { value: new THREE.Color('#ffffff') }, floorY: { value: o.floorY ?? 0.05 }, amount: { value: o.amount ?? (kind === 'dust' ? 0.38 : 1) } },
    vertexShader: `attribute vec3 vel; attribute float t0, seed; uniform float t, life, g, px, floorY; varying float a; varying float s;
      void main(){ float age = t - t0; float k = age / life; s = seed;
        vec3 p = position;
        ${kind === 'dust' ? 'float e = 1.0 - exp(-age * 3.0); p += vel * e * 0.9 + vec3(0.0, 0.5 * age, 0.0);' : 'p += vel * age; p.y -= 0.5 * g * age * age; p.y = max(p.y, floorY);'}
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        a = step(0.0, age) * step(age, life) * ${kind === 'dust' ? 'smoothstep(0.0, 0.08, age) * (1.0 - smoothstep(0.25, 1.0, k))' : kind === 'spark' ? '(1.0 - k)' : '(1.0 - smoothstep(0.7, 1.0, k))'};
        float grow = ${kind === 'dust' ? '0.45 + 1.4 * sqrt(clamp(k, 0.0, 1.0))' : '1.0'};
        gl_PointSize = px * grow * 1000.0 / max(0.5, -mv.z) * (0.6 + seed * 0.8); }`,
    fragmentShader: `uniform vec3 color, tint; uniform float amount; varying float a; varying float s;
      void main(){ if (a < 0.01) discard; vec2 q = gl_PointCoord - 0.5;
        ${kind === 'dust' ? 'float d = length(q); float m = smoothstep(0.5, 0.0, d) * (0.75 + 0.25 * sin(s * 40.0 + q.x * 9.0)); gl_FragColor = vec4(color * tint, a * m * amount);'
    : kind === 'spark' ? 'float d = length(q); gl_FragColor = vec4(color, a * smoothstep(0.5, 0.1, d));'
      : 'vec2 b = abs(q); gl_FragColor = vec4(color * tint * (0.8 + 0.4 * s), a * step(max(b.x, b.y), 0.42));'} }` });
  const p = new THREE.Points(geo, m); p.frustumCulled = false; p.userData.noAO = true; scene.add(p);
  p.update = (t, tint) => { m.uniforms.t.value = t; if (tint) m.uniforms.tint.value.copy(tint); };
  return p;
}

// bullet holes: small dark chipped discs that appear on surfaces at their times; holes: [{ t, p, n }]
export function bulletHoles(scene, holes, o = {}) {
  const tex = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(8,7,7,1)'); g.addColorStop(0.28, 'rgba(25,22,20,0.95)'); g.addColorStop(0.45, 'rgba(120,112,104,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(20,18,16,0.8)'; x.lineWidth = 2; const r = rng(4); for (let i = 0; i < 7; i++) { const a = r() * 6.28; x.beginPath(); x.moveTo(w / 2, h / 2); x.lineTo(w / 2 + Math.cos(a) * 40, h / 2 + Math.sin(a) * 40); x.stroke(); } });
  const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4 });
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), m, Math.max(1, holes.length)); im.frustumCulled = false; im.userData.noAO = true; scene.add(im);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Z = v3(0, 0, 1), hide = new THREE.Matrix4().makeScale(0, 0, 0), r = rng(o.seed ?? 3);
  const sizes = holes.map(() => (o.size ?? 0.42) * (0.7 + r() * 0.6));
  im.update = (t) => { holes.forEach((h, i) => { if (t < h.t) { im.setMatrixAt(i, hide); return; } Q.setFromUnitVectors(Z, h.n.clone().normalize()); M.compose(h.p.clone().addScaledVector(h.n, 0.03), Q, v3(sizes[i], sizes[i], 1)); im.setMatrixAt(i, M); }); im.instanceMatrix.needsUpdate = true; };
  return im;
}

// a slow layer of smoke / haze in a box: soft big points that drift and swell; .update(t, k, tint)
export function smokeHaze(scene, o = {}) {
  const n = o.count ?? 220, r = rng(o.seed ?? 21), pos = new Float32Array(n * 3), sd = new Float32Array(n), c = o.centre || v3(0, 3, 0), S = o.size || v3(30, 6, 60);
  for (let i = 0; i < n; i++) { pos.set([c.x + (r() - 0.5) * S.x, c.y + (r() - 0.5) * S.y, c.z + (r() - 0.5) * S.z], i * 3); sd[i] = r(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false,
    uniforms: { t: { value: 0 }, k: { value: 1 }, px: { value: o.pointSize ?? 7 }, color: { value: new THREE.Color(o.color || '#6b6266') }, amount: { value: o.amount ?? 0.16 } },
    vertexShader: `attribute float seed; uniform float t, px; varying float f; varying float s;
      void main(){ vec3 p = position; s = seed;
        p.x += sin(t * 0.13 + seed * 50.0) * 2.2 + t * 0.25; p.y += sin(t * 0.09 + seed * 70.0) * 0.8; p.z += cos(t * 0.11 + seed * 30.0) * 2.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = min(px * (0.7 + seed) * 320.0 / max(1.0, -mv.z), 900.0); f = 0.6 + 0.4 * sin(t * 0.4 + seed * 20.0); }`,
    fragmentShader: `uniform vec3 color; uniform float amount, k; varying float f; varying float s;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q); float m = smoothstep(0.5, 0.05, d); m *= 0.8 + 0.2 * sin(q.x * 11.0 + s * 30.0) * sin(q.y * 9.0 + s * 17.0);
        gl_FragColor = vec4(color, m * f * amount * k); }` });
  const p = new THREE.Points(geo, m); p.frustumCulled = false; p.userData.noAO = true; p.renderOrder = 3; scene.add(p);
  p.update = (t, k = 1, tint) => { m.uniforms.t.value = t; m.uniforms.k.value = k; if (tint) m.uniforms.color.value.copy(tint); p.visible = k > 0.01; };
  return p;
}

// ---------------- the sets ----------------
// a concrete jersey barrier along x (length len) centred at the origin, the base on y = 0; .top (y), .face (the +z face)
export function jerseyBarrier(o = {}) {
  const len = o.len ?? 4.2, b = new Batch(), m = surf('concrete', o.color || '#9a958d'), stripe = surf('hazard', '#e8b923');
  b.box(m, len, 0.7, 2.0, 0, 0.35, 0, { r: 0.06 });
  b.box(m, len, 1.3, 1.25, 0, 1.3, 0, { r: 0.08 });
  b.box(m, len, 1.15, 0.72, 0, 2.5, 0, { r: 0.12 });
  b.box(stripe, len * 0.98, 0.35, 0.74, 0, 2.86, 0, { r: 0.04 });
  for (const sx of [-1, 1]) b.box(paint('#3c3a37', { roughness: 0.6 }), 0.5, 0.25, 2.02, sx * (len / 2 - 0.5), 0.15, 0, { r: 0.04 });
  const g = b.done(); g.top = 3.08; g.len = len; return g;
}

// a hinged steel door: the leaf turns about its hinge at the group origin, swinging into -x... .set(angle, dent 0..1)
export function steelDoor(o = {}) {
  const w = o.w ?? 4.2, h = o.h ?? 7.2, g = new THREE.Group(), leaf = new THREE.Group(); g.add(leaf);
  const steel = paint(o.color || '#5c6168', { metalness: 0.65, roughness: 0.45 }), dark = paint('#26292e', { metalness: 0.7, roughness: 0.35 }), warn = surf('hazard', '#e8b923');
  const b = new Batch();
  b.box(steel, w, h, 0.32, w / 2, h / 2, 0, { r: 0.04 });
  for (const y of [1.4, h / 2, h - 1.4]) b.box(dark, w - 0.5, 0.18, 0.4, w / 2, y, 0, { r: 0.03 });
  b.box(dark, 0.14, 0.9, 0.5, w - 0.45, h * 0.47, 0.12, { r: 0.04 });     // push bar handle
  b.box(dark, 0.5, 0.2, 0.5, w - 0.45, h * 0.47 + 0.45, 0.12, { r: 0.04 });
  b.box(warn, w - 0.6, 0.5, 0.34, w / 2, 0.45, 0, { r: 0.02 });
  b.box(paint('#1a1d21', { roughness: 0.2, metalness: 0.4 }), 1.1, 0.7, 0.36, w / 2, h * 0.74, 0, { r: 0.04 });   // the small window
  b.done(leaf);
  const lbl = sign('CONTROL\nROOM', { w: 2.4, h: 1.1, bg: '#b8231c', fg: '#fff3e6', frame: '#26292e' }); lbl.position.set(w / 2, h * 0.6, 0.2); leaf.add(lbl);
  // the frame (it doesn't move)
  const fb = new Batch(); fb.box(dark, 0.4, h + 0.4, 0.6, -0.2, h / 2 + 0.2, 0); fb.box(dark, 0.4, h + 0.4, 0.6, w + 0.2, h / 2 + 0.2, 0); fb.box(dark, w + 0.8, 0.4, 0.6, w / 2, h + 0.2, 0); fb.done(g);
  g.leaf = leaf; g.w = w; g.h = h;
  g.set = (a) => { leaf.rotation.y = a; };
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

// a ceiling security camera on an arm: pan / tilt pivots, a red LED; .aim(yaw, pitch, led)
export function securityCam(o = {}) {
  const g = new THREE.Group(), pan = new THREE.Group(), tilt = new THREE.Group(); g.add(pan); pan.add(tilt);
  const white = paint('#d9dcdc', { roughness: 0.4, metalness: 0.2 }), dark = paint('#16181b', { roughness: 0.3, metalness: 0.5 });
  const b = new Batch(); b.box(white, 0.9, 0.2, 0.9, 0, 0, 0, { r: 0.06 }); b.cyl(white, 0.12, 0.12, 0.7, 0, -0.42, 0); b.done(g);
  pan.position.y = -0.82;
  const tb = new Batch(); tb.box(white, 0.95, 0.85, 2.1, 0, 0, 0.35, { r: 0.18 }); tb.box(white, 1.15, 0.12, 2.4, 0, 0.5, 0.45, { r: 0.05 });   // body + sun hood
  tb.cyl(dark, 0.36, 0.36, 0.16, 0, 0, 1.42, { rx: Math.PI / 2, seg: 24 }); tb.box(white, 0.25, 0.4, 0.25, 0, 0.35, -0.3, { r: 0.05 });
  tb.done(tilt);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), new THREE.MeshStandardMaterial({ color: '#05070a', roughness: 0.05, metalness: 0.9, envMapIntensity: 2 }));
  lens.position.set(0, 0, 1.51); tilt.add(lens);
  const glint = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: '#a8b8d0', transparent: true, opacity: 0.5, toneMapped: false })); glint.position.set(0.1, 0.1, 1.52); tilt.add(glint);
  const ledM = new THREE.MeshBasicMaterial({ color: '#ff2a1a', toneMapped: false }); const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), ledM); led.position.set(0.3, -0.24, 1.46); tilt.add(led);
  g.pan = pan; g.tilt = tilt; g.lens = lens; g.led = led;
  g.aim = (yaw, pitch, l = 1) => { pan.rotation.y = yaw; tilt.rotation.x = pitch; ledM.color.set('#ff2a1a').multiplyScalar(0.25 + 2.2 * l); };
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// a wall clock with hands (h, m); .set(h, m)
export function wallClock(o = {}) {
  const g = new THREE.Group(), r = o.r ?? 1.4;
  const face = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#efece4'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill(); x.fillStyle = '#1b1c1e';
    for (let i = 0; i < 60; i++) { const a = i / 60 * 6.283, L = i % 5 ? 8 : 20, wd = i % 5 ? 2 : 6; x.save(); x.translate(128, 128); x.rotate(a); x.fillRect(-wd / 2, -118, wd, L); x.restore(); }
    x.font = '900 22px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('RANGE 7', 128, 176); });
  face.colorSpace = THREE.SRGBColorSpace;
  const b = new Batch(); b.cyl(paint('#202226', { metalness: 0.5, roughness: 0.4 }), r * 1.08, r * 1.08, 0.25, 0, 0, -0.1, { rx: Math.PI / 2, seg: 40 }); b.done(g);
  const f = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ map: face, roughness: 0.4 })); f.position.z = 0.04; g.add(f);
  const hand = (len, wd) => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.04).translate(0, len / 2 - 0.1, 0), paint('#141517')); p.add(m); p.position.z = 0.08; g.add(p); return p; };
  const hh = hand(r * 0.55, 0.13), mh = hand(r * 0.85, 0.08); const sh = hand(r * 0.9, 0.03); sh.children[0].material = paint('#c0281e'); sh.position.z = 0.1;
  g.set = (h, m, s = 0) => { hh.rotation.z = -((h % 12) + m / 60) / 12 * 6.283; mh.rotation.z = -(m + s / 60) / 60 * 6.283; sh.rotation.z = -s / 60 * 6.283; };
  return g;
}

// the training hall: x in [-W/2, W/2], z in [z1, z0] (z0 the entrance wall), a side corridor off the left wall at zc
// (width cw) to x = xd, where the control room's door wall stands. .lights(white, red, t) swaps the fixtures to emergency red;
// .beacons are the rotating red lamps (positions), .barrierAt [x, z] list, .ceil the ceiling height.
export function trainingHall(o = {}) {
  const W = o.w ?? 30, z0 = o.z0 ?? 12, z1 = o.z1 ?? -150, H = o.h ?? 13, zc = o.zc ?? -16, cw = o.cw ?? 6, xd = o.xd ?? -45, ch = o.ch ?? 9;
  const g = new THREE.Group(), b = new Batch(), r = rng(o.seed ?? 3);
  const conc = surf('concrete', '#8f8a83'), floor = surf('concrete', '#6e6b67'), wallLo = surf('concrete', '#5d5c5a'), steel = paint('#3a3e44', { metalness: 0.6, roughness: 0.45 });
  const rust = paint('#5a4434', { metalness: 0.4, roughness: 0.7 }), pipeM = paint('#4b5258', { metalness: 0.6, roughness: 0.4 }), yellow = paint('#d8a51e', { roughness: 0.6 }), hz = surf('hazard', '#e8b923');
  const L = z0 - z1, zm = (z0 + z1) / 2;
  // floor, walls (the left wall has the corridor opening), ceiling
  b.box(floor, W + 2, 0.4, L, 0, -0.2, zm, { r: 0.02 });
  b.box(conc, 1, H, L, W / 2 + 0.5, H / 2, zm, { r: 0.02 });
  b.box(conc, 1, H, z0 - (zc + cw / 2), -W / 2 - 0.5, H / 2, (z0 + zc + cw / 2) / 2, { r: 0.02 });
  b.box(conc, 1, H, (zc - cw / 2) - z1, -W / 2 - 0.5, H / 2, (zc - cw / 2 + z1) / 2, { r: 0.02 });
  b.box(conc, 1, H - ch, cw, -W / 2 - 0.5, ch + (H - ch) / 2, zc, { r: 0.02 });
  b.box(conc, W + 2, H, 1, 0, H / 2, z1 - 0.5, { r: 0.02 });
  // the entrance wall with a roll-up door opening (8 wide, 9 high) at x = 0
  b.box(conc, (W - 8) / 2, H, 1, -(W / 2 + 4) / 2 - 1, H / 2, z0 + 0.5, { r: 0.02 }); b.box(conc, (W - 8) / 2, H, 1, (W / 2 + 4) / 2 + 1, H / 2, z0 + 0.5, { r: 0.02 });
  b.box(conc, 8.2, H - 9, 1, 0, 9 + (H - 9) / 2, z0 + 0.5, { r: 0.02 });
  b.box(steel, 8.6, 0.8, 1.4, 0, 9.3, z0 + 0.5, { r: 0.05 });   // the rolled door's drum
  const ceilM = surf('concrete', '#3f3e3d'); b.box(ceilM, W + 2, 0.6, L, 0, H + 0.3, zm, { r: 0.02 });
  // a darker wainscot band, hazard stripes at the floor, lane lines on the floor
  for (const sx of [-1, 1]) { b.box(wallLo, 0.12, 2.6, L, sx * (W / 2 - 0.02), 1.3, zm, { r: 0.02 }); b.box(hz, 0.14, 0.5, L, sx * (W / 2 - 0.04), 0.25, zm, { r: 0.02 }); }
  for (let x = -W / 2 + 2.5; x < W / 2 - 1; x += 5) b.box(yellow, 0.18, 0.03, L - 2, x, 0.015, zm, { r: 0.005 });
  for (let z = z0 - 30; z > z1; z -= 6) b.box(paint('#c9c2b5', { roughness: 0.7 }), W - 2, 0.03, 0.18, 0, 0.016, z, { r: 0.005 });
  // columns with steel caps, I-beams across the ceiling, pipes and cable trays along the walls
  for (let z = z0 - 8; z > z1 + 2; z -= 16) for (const sx of [-1, 1]) {
    b.box(conc, 1.6, H, 1.6, sx * (W / 2 - 0.8), H / 2, z, { r: 0.08 }); b.box(hz, 1.66, 1.2, 1.66, sx * (W / 2 - 0.8), 0.6, z, { r: 0.04 });
    b.box(steel, W, 0.7, 0.5, 0, H - 0.35, z, { r: 0.04 }); b.box(steel, W, 0.12, 1.1, 0, H - 0.72, z, { r: 0.02 }); b.box(steel, W, 0.12, 1.1, 0, H + 0.02, z, { r: 0.02 });
  }
  for (const sx of [-1, 1]) {
    for (const [y, rr] of [[H - 1.6, 0.28], [H - 2.3, 0.2], [H - 2.9, 0.34]]) b.cyl(r() < 0.3 ? rust : pipeM, rr, rr, L, sx * (W / 2 - 0.6 - rr), y, zm, { rx: Math.PI / 2, seg: 12 });
    b.box(steel, 0.9, 0.12, L, sx * (W / 2 - 1.6), H - 3.6, zm, { r: 0.02 });
    for (let z = z0 - 3; z > z1; z -= 5) b.box(steel, 0.08, 0.6, 0.08, sx * (W / 2 - 1.6), H - 3.3, z, { r: 0.02 });
  }
  // the side corridor to the control room: floor, walls, a low ceiling, pipes along it
  const cl = -W / 2 - xd * -1;   // (unused) keep the corridor's numbers readable below
  void cl;
  const cx0 = -W / 2 - 1, cLen = cx0 - xd, cxm = (cx0 + xd) / 2;
  b.box(floor, cLen, 0.4, cw + 2, cxm, -0.2, zc, { r: 0.02 });
  b.box(conc, cLen, ch, 1, cxm, ch / 2, zc + cw / 2 + 0.5, { r: 0.02 }); b.box(conc, cLen, ch, 1, cxm, ch / 2, zc - cw / 2 - 0.5, { r: 0.02 });
  b.box(ceilM, cLen, 0.6, cw + 2, cxm, ch + 0.3, zc, { r: 0.02 });
  for (const sz of [-1, 1]) { b.box(wallLo, cLen, 2.4, 0.12, cxm, 1.2, zc + sz * (cw / 2 - 0.02), { r: 0.02 }); b.cyl(pipeM, 0.22, 0.22, cLen, cxm, ch - 0.8, zc + sz * (cw / 2 - 0.5), { rz: Math.PI / 2, seg: 12 }); b.cyl(rust, 0.14, 0.14, cLen, cxm, ch - 1.4, zc + sz * (cw / 2 - 0.4), { rz: Math.PI / 2, seg: 10 }); }
  for (let x = cx0 - 4; x > xd + 1; x -= 6) { b.box(steel, 0.5, 0.5, cw, x, ch - 0.25, zc, { r: 0.04 }); for (const sz of [-1, 1]) b.box(steel, 0.5, ch, 0.4, x, ch / 2, zc + sz * (cw / 2 - 0.2), { r: 0.04 }); }
  b.done(g);
  // the roofs never shadow the key from above (the sun stands in for the hall's top light)
  g.traverse((m) => { if (m.isMesh && m.material === ceilM) m.castShadow = false; });
  // ceiling fixtures (long tubes) in the hall and the corridor, and red beacons; their materials swap colour in .lights()
  const fixM = new THREE.MeshStandardMaterial({ color: '#1a1a1a', emissive: '#dfe7ef', emissiveIntensity: 1.0, roughness: 0.4 });
  const beaconM = new THREE.MeshStandardMaterial({ color: '#3a0805', emissive: '#ff2414', emissiveIntensity: 0, roughness: 0.3 });
  const fb = new Batch(), bb = new Batch(), fixes = [], beacons = [];
  for (let z = z0 - 4; z > z1 + 2; z -= 8) for (const x of [-W / 4, W / 4]) { fb.box(fixM, 0.5, 0.18, 4.5, x, H - 1.1, z, { r: 0.05 }); fixes.push(v3(x, H - 1.3, z)); fb.box(steel, 0.05, 0.9, 0.05, x, H - 0.6, z - 1.8); fb.box(steel, 0.05, 0.9, 0.05, x, H - 0.6, z + 1.8); }
  for (let x = cx0 - 3; x > xd + 1; x -= 7) { fb.box(fixM, 3.5, 0.16, 0.45, x, ch - 0.3, zc); fixes.push(v3(x, ch - 0.5, zc)); }
  for (let z = z0 - 12; z > z1 + 2; z -= 16) for (const sx of [-1, 1]) { const p = v3(sx * (W / 2 - 0.5), H - 4.6, z); bb.cyl(beaconM, 0.32, 0.36, 0.5, p.x, p.y, p.z, { seg: 16 }); bb.box(steel, 0.8, 0.2, 0.8, p.x, p.y - 0.35, p.z, { r: 0.04 }); beacons.push(p); }
  for (let x = cx0 - 6; x > xd + 1; x -= 12) { const p = v3(x, ch - 0.9, zc + cw / 2 - 0.4); bb.cyl(beaconM, 0.3, 0.34, 0.45, p.x, p.y, p.z, { seg: 16 }); beacons.push(p); }
  const fixG = fb.done(); fixG.traverse((m) => { if (m.isMesh) m.castShadow = false; }); g.add(fixG); g.add(bb.done());
  // signs on the walls
  const s1 = sign('LIVE FIRE AREA', { w: 9, h: 1.6, bg: '#b8231c', fg: '#fff3e6' }); s1.position.set(W / 2 - 0.1, 7.4, z0 - 26); s1.rotation.y = -Math.PI / 2; g.add(s1);
  const s2 = sign('RANGE 7\nTARGET LINE', { w: 6.5, h: 2.6, bg: '#22262c', fg: '#e8b923' }); s2.position.set(-W / 2 + 0.1, 7.6, z0 - 46); s2.rotation.y = Math.PI / 2; g.add(s2);
  const s3 = sign('CONTROL ROOM  ◄', { w: 6, h: 1.1, bg: '#22262c', fg: '#ffffff' }); s3.position.set(-W / 2 + 0.1, ch + 1.2, zc + 4.2); s3.rotation.y = Math.PI / 2; g.add(s3);
  g.fixM = fixM; g.beaconM = beaconM; g.fixes = fixes; g.beacons = beacons; g.ceil = H; g.W = W; g.z0 = z0; g.z1 = z1; g.zc = zc; g.cw = cw; g.xd = xd; g.ch = ch;
  g.lights = (white, red, t) => {
    fixM.emissive.set('#dfe7ef').multiplyScalar(white).add(new THREE.Color('#ff2a18').multiplyScalar(red * 0.75)); fixM.emissiveIntensity = 1.0;
    beaconM.emissiveIntensity = red * (1.6 + 1.3 * Math.max(0, Math.sin(t * 7.5)));
  };
  g.traverse((m) => { if (m.isMesh) { m.receiveShadow = true; } });
  return g;
}

// the control room behind the steel door: x in [x1, x0] (x0 the door wall), z in [zA, zB]; desks with monitors, the giant
// screen on the back wall (x = x1, facing +x; .screen is its plane: give it a material), a ceiling security camera (.cam)
export function controlRoom(o = {}) {
  const x0 = o.x0 ?? -45, x1 = o.x1 ?? -63, zA = o.zA ?? -27, zB = o.zB ?? -5, H = o.h ?? 10, door = o.door || { z: -16, w: 4.2, h: 7.2 };
  const g = new THREE.Group(), b = new Batch(), xm = (x0 + x1) / 2, zm = (zA + zB) / 2, Lx = x0 - x1, Lz = zB - zA;
  const wall = surf('concrete', '#4c4f53'), floor = surf('tile', '#2d3034'), dark = paint('#1d2024', { roughness: 0.5, metalness: 0.3 }), steel = paint('#3a3e44', { metalness: 0.6, roughness: 0.45 });
  b.box(floor, Lx + 2, 0.4, Lz + 2, xm, -0.2, zm, { r: 0.02 }); b.box(paint('#1f2124'), Lx + 2, 0.5, Lz + 2, xm, H + 0.25, zm, { r: 0.02 });
  b.box(wall, 1, H, Lz + 2, x1 - 0.5, H / 2, zm, { r: 0.02 });
  for (const z of [zA - 0.5, zB + 0.5]) b.box(wall, Lx + 2, H, 1, xm, H / 2, z, { r: 0.02 });
  // the door wall with its opening
  const dz0 = door.z - door.w / 2, dz1 = door.z + door.w / 2;
  b.box(wall, 1, H, dz0 - (zA - 1), x0 + 0.5, H / 2, (dz0 + zA - 1) / 2, { r: 0.02 }); b.box(wall, 1, H, zB + 1 - dz1, x0 + 0.5, H / 2, (dz1 + zB + 1) / 2, { r: 0.02 });
  b.box(wall, 1, H - door.h, door.w, x0 + 0.5, door.h + (H - door.h) / 2, door.z, { r: 0.02 });
  // the desk rows facing the screen, with keyboards and chairs
  const desk = paint('#2a2d31', { roughness: 0.45, metalness: 0.2 }), top = paint('#3b3f44', { roughness: 0.35, metalness: 0.2 });
  const monitors = [];
  for (const [dx, zs] of [[x1 + 8, [zA + 4, zm, zB - 4]], [x1 + 12.5, [zA + 5, zm - 3.5, zm + 3.5, zB - 5]]]) for (const z of zs) {
    b.box(desk, 2.0, 2.4, 3.6, dx, 1.2, z, { r: 0.06 }); b.box(top, 2.4, 0.14, 3.9, dx, 2.47, z, { r: 0.03 });
    b.box(dark, 0.6, 0.06, 1.4, dx + 0.3, 2.58, z, { r: 0.02 });
    for (const dz of [-0.95, 0.95]) { b.box(dark, 0.12, 1.25, 1.75, dx - 0.6, 3.35, z + dz, { r: 0.04 }); b.box(dark, 0.3, 0.8, 0.2, dx - 0.4, 2.8, z + dz, { r: 0.03 }); monitors.push({ p: v3(dx - 0.53, 3.35, z + dz) }); }
    b.box(paint('#1c1e21'), 1.0, 0.25, 1.1, dx + 2.2, 1.6, z, { r: 0.08 }); b.box(paint('#1c1e21'), 0.25, 1.5, 1.1, dx + 2.7, 2.4, z, { r: 0.08 }); b.cyl(steel, 0.08, 0.08, 1.4, dx + 2.2, 0.75, z);
  }
  // server racks along the side walls, blinking
  for (let x = x1 + 3; x < x0 - 2; x += 3.2) for (const z of [zA + 1.1, zB - 1.1]) b.box(dark, 2.6, 7, 1.8, x, 3.5, z, { r: 0.05 });
  // a screen frame on the back wall
  const sw = o.sw ?? 16, sh = o.sh ?? 8.6, sy = o.sy ?? 5.6;
  b.box(steel, 0.5, sh + 0.7, sw + 0.7, x1 + 0.1, sy, zm, { r: 0.05 });
  // ceiling ducts, a cable tray
  b.box(steel, Lx, 0.9, 1.4, xm, H - 0.6, zA + 2.5, { r: 0.05 }); b.box(steel, Lx, 0.12, 0.9, xm, H - 1.3, zB - 2.5, { r: 0.02 });
  b.done(g);
  g.traverse((m) => { if (m.isMesh) { m.receiveShadow = true; m.castShadow = true; } });
  g.screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ color: '#05070a' }));
  g.screen.rotation.y = Math.PI / 2; g.screen.position.set(x1 + 0.4, sy, zm); g.screen.userData.noAO = true; g.add(g.screen);
  // the small monitors: an emissive glow that follows the big screen's tint (set by .tint)
  const monM = new THREE.MeshBasicMaterial({ color: '#2b3b48', toneMapped: true });
  const mg = new THREE.PlaneGeometry(1.6, 1.1); const mb = []; monitors.forEach((m) => { const x = mg.clone().rotateY(Math.PI / 2).translate(m.p.x - 0.07, m.p.y, m.p.z); mb.push(x.toNonIndexed()); });
  const merge = (list) => { const pos = []; const uv = []; for (const x of list) { pos.push(...x.attributes.position.array); uv.push(...x.attributes.uv.array); } const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return r; };
  const mons = new THREE.Mesh(merge(mb), monM); mons.userData.noAO = true; g.add(mons); g.monM = monM;
  // rack lights
  const leds = new THREE.MeshBasicMaterial({ color: '#46ff8a', toneMapped: false }); const lb = new Batch(); const r = rng(9);
  for (let x = x1 + 3; x < x0 - 2; x += 3.2) for (const z of [zA + 1.1, zB - 1.1]) for (let i = 0; i < 9; i++) lb.box(leds, 0.12, 0.06, 0.04, x - 0.9 + r() * 1.8, 1 + r() * 5.6, z + (z < zm ? 0.92 : -0.92), { r: 0.01 });
  const ledG = lb.done(); ledG.traverse((m) => { m.castShadow = false; m.userData.noAO = true; }); g.add(ledG); g.ledM = leds;
  // the security camera on the ceiling near the door, looking at the screen
  g.cam = securityCam(); g.cam.position.set(x0 - 3.2, H - 0.1, zB - 2.6); g.add(g.cam);
  g.x0 = x0; g.x1 = x1; g.zA = zA; g.zB = zB; g.zm = zm; g.H = H; g.sw = sw; g.sh = sh; g.sy = sy;
  return g;
}

// the giant screen's material: a wall of feeds. One render target (map) is tiled cols x rows; each tile gets its own crop,
// zoom and flip so they read as many sessions; scanlines, a grid, per-tile labels (an overlay canvas) and a message band.
// .set({ t, k (on), msg (0..1 the red message), focus (0..1 one tile fills the screen), focusTile, red, label (canvas texture) })
export function feedWall(map, o = {}) {
  const cols = o.cols ?? 8, rows = o.rows ?? 6;
  const m = new THREE.ShaderMaterial({ toneMapped: false, fog: false,
    uniforms: { map: { value: map }, over: { value: null }, msgT: { value: null }, alt: { value: null }, t: { value: 0 }, k: { value: 1 }, msg: { value: 0 }, focus: { value: 0 }, ft: { value: new THREE.Vector2(3, 2) }, grid: { value: new THREE.Vector2(cols, rows) }, red: { value: 0 }, altK: { value: 0 }, gain: { value: o.gain ?? 1.0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D map, over, msgT, alt; uniform float t, k, msg, focus, red, altK, gain; uniform vec2 grid, ft; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        // the focused tile grows to fill the screen
        vec2 fc = (ft + 0.5) / grid; vec2 big = mix(uv, fc + (uv - 0.5) / grid, focus);
        vec2 cell = floor(big * grid), lu = fract(big * grid);
        float id = cell.x + cell.y * grid.x, r1 = h(cell + 1.3), r2 = h(cell + 7.1);
        vec2 su = lu; if (r1 > 0.62) su.x = 1.0 - su.x;      // some mirrored
        float z = 0.86 + 0.14 * r2; su = (su - 0.5) * z + 0.5 + vec2(r1 - 0.5, r2 - 0.5) * 0.12 * (1.0 - z) * 6.0;
        bool isAlt = altK > 0.5 && cell == ft;
        vec3 c = isAlt ? texture2D(alt, lu).rgb * 0.9 : texture2D(map, clamp(su, 0.0, 1.0)).rgb * gain; c = 1.0 - exp(-c * 1.5);
        // a cool CCTV grade, scanlines, a little noise, a frame round each tile
        float l = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(vec3(l), c, 0.55) * vec3(0.92, 1.0, 1.04);
        c *= 0.86 + 0.14 * sin((lu.y + t * 0.6) * 160.0 * (1.0 - focus * 0.8));
        c += (h(lu * 300.0 + t) - 0.5) * 0.03;
        vec2 e = min(lu, 1.0 - lu) * vec2(grid.y / grid.x, 1.0) * 6.0; float edge = smoothstep(0.0, 0.04, min(e.x, e.y));
        c *= mix(0.15, 1.0, edge);
        vec4 ov = texture2D(over, uv); if (focus < 0.01) c = mix(c, ov.rgb, ov.a);
        c = mix(c, c * vec3(1.4, 0.35, 0.3) + vec3(0.12, 0.0, 0.0), red);
        vec4 ms = texture2D(msgT, uv); c = mix(c, ms.rgb, ms.a * msg);
        gl_FragColor = vec4(c * k, 1.0);
      }` });
  m.set = (s) => { for (const [kk, vv] of Object.entries(s)) { if (kk === 'focusTile') m.uniforms.ft.value.set(vv[0], vv[1]); else if (m.uniforms[kk]) m.uniforms[kk].value = vv; } };
  return m;
}

// the empty industrial district at night: a wet street running along z, warehouses both sides, chain-link fences, streetlights,
// and the training facility's gate with its sign at the end. Returns { group, lamps: [world positions of the lamp heads] }.
export function industrialDistrict(o = {}) {
  const g = new THREE.Group(), b = new Batch(), r = rng(o.seed ?? 8);
  const asphalt = new THREE.MeshStandardMaterial({ color: '#202225', roughness: 0.38, metalness: 0.15 });
  b.box(asphalt, 26, 0.4, 260, 0, -0.2, -60, { r: 0.02 });
  const side = surf('concrete', '#5f5d5a'); for (const sx of [-1, 1]) b.box(side, 6, 0.5, 260, sx * 16, 0.05, -60, { r: 0.05 });
  const line = paint('#c9b25a', { roughness: 0.5 }); for (let z = 60; z > -190; z -= 9) b.box(line, 0.25, 0.03, 4.5, 0, 0.01, z, { r: 0.005 });
  // puddles (glossy patches)
  const pud = new THREE.MeshStandardMaterial({ color: '#0d0f12', roughness: 0.04, metalness: 0.6 });
  for (let i = 0; i < 14; i++) b.box(pud, 2 + r() * 4, 0.02, 1.5 + r() * 3, (r() - 0.5) * 18, 0.015, 40 - r() * 200, { r: 0.01 });
  // fences on posts
  const post = paint('#4a4f55', { metalness: 0.6, roughness: 0.4 });
  for (const sx of [-1, 1]) for (let z = 50; z > -170; z -= 5) { b.cyl(post, 0.08, 0.08, 4.4, sx * 19.5, 2.2, z, { seg: 8 }); }
  for (const sx of [-1, 1]) for (const y of [0.4, 4.3]) b.cyl(post, 0.05, 0.05, 220, sx * 19.5, y, -60, { rx: Math.PI / 2, seg: 6 });
  b.done(g);
  const fenceTex = canvasTex(128, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(150,158,165,0.85)'; x.lineWidth = 3; for (let i = -128; i < 256; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke(); x.beginPath(); x.moveTo(i + 128, 0); x.lineTo(i, 128); x.stroke(); } });
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping; fenceTex.repeat.set(70, 1.4);
  for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(220, 4), new THREE.MeshStandardMaterial({ map: fenceTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 })); f.rotation.y = Math.PI / 2; f.position.set(sx * 19.5, 2.3, -60); f.castShadow = true; g.add(f); }
  // warehouses behind the fences
  const lamps = [];
  for (const sx of [-1, 1]) for (let z = 40, i = 0; z > -170; z -= 34, i++) {
    const w = 28 + r() * 8, bd = building({ style: r() < 0.5 ? 'corrugated' : 'concrete', floors: 2, floorH: 8, w: 30, d: w, wall: ['#4e5458', '#5a4f46', '#3f4a52', '#59595a'][(i + (sx > 0 ? 1 : 0)) % 4], trim: '#6a6c6e', lit: 0.04, seed: 40 + i * 3 + (sx > 0 ? 1 : 0) });
    bd.position.set(sx * (22 + w / 2 + 2), 0, z); bd.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(bd);
  }
  // streetlights: sodium heads on alternate sides
  for (let z = 44, i = 0; z > -160; z -= 26, i++) { const sx = i % 2 ? 1 : -1; const lp = lamp({ height: 12, glow: '#ffb35a' }); lp.position.set(sx * 14.5, 0, z); lp.rotation.y = sx > 0 ? Math.PI : 0; g.add(lp); lamps.push(v3(sx * 14.5 + (sx > 0 ? -1.55 : 1.55), 11.4, z)); }
  // the facility at the street's end: a concrete block with the gate, a sign, floodlit
  const fac = new Batch(), fw = surf('concrete', '#6b6a66'), dk = paint('#1d1f22'), st = paint('#3a3e44', { metalness: 0.6, roughness: 0.45 });
  const fz = o.facZ ?? -175;
  fac.box(fw, 70, 22, 30, 0, 11, fz - 15, { r: 0.1 }); fac.box(dk, 9, 9, 0.4, 0, 4.5, fz + 0.1, { r: 0.04 });
  for (let x = -30; x <= 30; x += 6) if (Math.abs(x) > 7) fac.box(dk, 2.4, 1.6, 0.3, x, 16, fz + 0.1, { r: 0.04 });
  fac.box(st, 11, 0.8, 1.2, 0, 9.5, fz + 0.4, { r: 0.05 });
  fac.done(g);
  const sgn = sign('TRAINING FACILITY 7\nAUTHORIZED PERSONNEL ONLY', { w: 18, h: 3.2, bg: '#1c2026', fg: '#e8e2d2', frame: '#2b2f3a' }); sgn.position.set(0, 13.2, fz + 0.4); g.add(sgn);
  g.traverse((m) => { if (m.isMesh) m.receiveShadow = true; });
  return { group: g, lamps, facZ: fz };
}

// ---------------- holding the rifle (procedural, so both hands really close on it) ----------------
// After applyPose: blade the torso (left shoulder toward the target), turn the head back to the target, aim the right arm at
// the grip point and the left at the handguard, then put the rifle in the right fist along the aim line. aim: a world point.
// o: { k (0..1 blend), down (0 aims, 1 the low ready: muzzle 40 deg down), recoil (0..1 kick), blade (radians, 0.55), shoulder
// (studs the grip sits ahead of the chest) }. Returns { muzzle, dir } in world space.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), Z = v3(0, 0, 1);
export function holdRifle(ch, rifle, aim, o = {}) {
  const k = o.k ?? 1, down = o.down ?? 0, rec = o.recoil ?? 0, bl = (o.blade ?? 0.55) * k;
  ch.torso.rotation.y += bl; ch.neck.rotation.y -= bl * 0.9;
  ch.torso.rotation.x -= rec * 0.06; ch.neck.rotation.x -= rec * 0.04;
  ch.root.updateMatrixWorld(true);
  const chest = ch.torso.localToWorld(v3(0, 1.45, 0)), right = ch.arms[0].getWorldPosition(v3(0, 0, 0)).sub(chest).setY(0).normalize();
  let dir = aim.clone().sub(chest).normalize();
  if (down > 0) { const flat = dir.clone().setY(0).normalize(); dir = dir.lerp(flat.multiplyScalar(Math.cos(0.7)).add(v3(0, -Math.sin(0.7), 0)), down).normalize(); }
  const up = v3(0, 1, 0).sub(dir.clone().multiplyScalar(dir.y)).normalize();
  dir.addScaledVector(up, rec * 0.08).normalize();
  const grip = chest.clone().addScaledVector(right, 0.35).addScaledVector(dir, (o.shoulder ?? 1.15) - rec * 0.25).addScaledVector(up, -0.25 - 0.3 * down);
  const guard = grip.clone().addScaledVector(dir, rifle.guard.z).addScaledVector(up, rifle.guard.y);
  aimArm(ch, 0, grip, k); aimArm(ch, 1, o.leftAt || guard, k * (o.leftK ?? 1));
  ch.root.updateMatrixWorld(true);
  // the fist: where the right arm's grip point really is (measured from the arm's meshes)
  const gl = gripLocal(ch, 0), hand = ch.arms[0].localToWorld(gl.clone());
  if (rifle.parent !== ch.root.parent && ch.root.parent) ch.root.parent.add(rifle);
  _m.lookAt(v3(0, 0, 0), dir.clone().negate(), up); _q.setFromRotationMatrix(_m);
  rifle.position.copy(hand).addScaledVector(up, -0.12); rifle.quaternion.copy(_q);
  rifle.updateMatrixWorld(true);
  return { muzzle: rifle.localToWorld(rifle.muzzle.clone()), dir };
}

// ---------------- toon blood ----------------
// Dramatic but stylized (cel-shaded, outlined) blood for shots and cuts: a burst of stretched droplets out of the wound along the
// shot, a fine spray that thins fast, droplets that fall and splat flat on the floor, drips from the wound, and a pool that grows
// under a downed body. events: [{ t, p (wound), dir (shot direction), n (count, default 34), power (1), pool: { at: (t) => Vector3 |
// null, r: 1.5 }, drip: (t) => Vector3 | null, end (time it all disappears, e.g. a body vanishing) }]. Pure function of t.
const toonGrad = (() => { let g = null; return () => { if (g) return g; const d = new Uint8Array([60, 150, 255]); g = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); g.minFilter = g.magFilter = THREE.NearestFilter; g.needsUpdate = true; return g; }; })();
export function bloodFX(scene, events, o = {}) {
  const G = o.gravity ?? 26, floorY = o.floor ?? 0.03, R = rng(o.seed ?? 11);
  const drops = [];   // { e, t0, p0, v, r, kind: 'drop' | 'mist' }
  for (const e of events) {
    const n = e.n ?? 34, pw = e.power ?? 1, d = e.dir.clone().normalize();
    const side = new THREE.Vector3().crossVectors(d, v3(0, 1, 0)); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize();
    const up = new THREE.Vector3().crossVectors(side, d).normalize();
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, sp = Math.pow(R(), 0.6) * 0.6, fwd = R() < 0.9;   // most out the back of the wound, some back toward the shooter
      const dir = d.clone().multiplyScalar(fwd ? 1 : -0.6).addScaledVector(side, Math.cos(a) * sp).addScaledVector(up, Math.sin(a) * sp + 0.25).normalize();
      drops.push({ e, t0: e.t + R() * 0.05, p0: e.p.clone(), v: dir.multiplyScalar((4 + R() * 8) * pw), r: (0.08 + R() * 0.13) * (o.size ?? 1), kind: 'drop' });
    }
    for (let i = 0; i < Math.round(n * 0.35); i++) {
      const dir = d.clone().addScaledVector(side, (R() - 0.5) * 0.9).addScaledVector(up, (R() - 0.3) * 0.7).normalize();
      drops.push({ e, t0: e.t, p0: e.p.clone(), v: dir.multiplyScalar((10 + R() * 8) * pw), r: (0.18 + R() * 0.2) * (o.size ?? 1), kind: 'mist' });
    }
    if (e.drip) for (let k = 0; k < (e.dripN ?? 14); k++) drops.push({ e, t0: e.t + 0.35 + k * (0.16 + R() * 0.1), p0: null, v: v3((R() - 0.5) * 0.4, -0.5, (R() - 0.5) * 0.4), r: 0.06 + R() * 0.05, kind: 'drip' });
  }
  const geo = new THREE.SphereGeometry(1, 10, 8);
  const mat = new THREE.MeshToonMaterial({ color: o.color || '#9a0010', gradientMap: toonGrad(), emissive: '#5a0008', emissiveIntensity: 0.55 });
  const lineM = new THREE.MeshBasicMaterial({ color: '#160002', side: THREE.BackSide });
  const N = drops.length + events.length;
  const body = new THREE.InstancedMesh(geo, mat, N), line = new THREE.InstancedMesh(geo, lineM, N);
  for (const m of [body, line]) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; scene.add(m); }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), hide = new THREE.Matrix4().makeScale(0, 0, 0), Y = v3(0, 1, 0);
  const put = (i, p, q, s) => { M.compose(p, q, s); body.setMatrixAt(i, M); M.compose(p, q, s.clone().multiplyScalar(1.28).add(v3(0.012, 0.012, 0.012))); line.setMatrixAt(i, M); };
  const api = { mesh: body, line };
  api.update = (t) => {
    let i = 0;
    for (const d of drops) {
      const e = d.e, dt = t - d.t0;
      if (dt < 0 || (e.end != null && t > e.end)) { body.setMatrixAt(i, hide); line.setMatrixAt(i, hide); i++; continue; }
      let p0 = d.p0; if (d.kind === 'drip') { p0 = e.drip(d.t0); if (!p0) { body.setMatrixAt(i, hide); line.setMatrixAt(i, hide); i++; continue; } }
      if (d.kind === 'mist') {
        const life = 0.28; if (dt > life) { body.setMatrixAt(i, hide); line.setMatrixAt(i, hide); i++; continue; }
        const k = dt / life; P.copy(p0).addScaledVector(d.v, dt * (1 - 0.5 * k)); P.y -= 0.5 * G * 0.3 * dt * dt;
        Q.setFromUnitVectors(Y, d.v.clone().normalize()); S.set(d.r * (1 - k), d.r * (1 - k) * 2.6, d.r * (1 - k)); put(i, P, Q, S); i++; continue;
      }
      // a ballistic droplet; on the floor it becomes a flat splat that spreads a little
      const vy = d.v.y, y0 = p0.y - floorY, disc = vy * vy + 2 * G * y0, tl = (vy + Math.sqrt(Math.max(0, disc))) / G;
      if (dt < tl) {
        P.copy(p0).addScaledVector(d.v, dt); P.y -= 0.5 * G * dt * dt;
        const vel = d.v.clone(); vel.y -= G * dt; const sp = vel.length();
        Q.setFromUnitVectors(Y, vel.normalize()); S.set(d.r, d.r * (1 + sp * 0.09), d.r); put(i, P, Q, S);
      } else {
        P.copy(p0).addScaledVector(d.v, tl); P.y = floorY; const k = Math.min(1, (dt - tl) / 0.12), rr = Math.min(0.42, d.r * (1.3 + 0.9 * k) * (d.kind === 'drip' ? 1.4 : 1));
        Q.setFromAxisAngle(Y, (d.r * 977) % 6.28); S.set(rr * (1 + (d.r * 31 % 0.6)), 0.012, rr); put(i, P, Q, S);
      }
      i++;
    }
    for (const e of events) {   // the pool under a downed body
      const at = e.pool && e.pool.at(t), k = e.pool ? smooth(e.t + 0.5, e.t + 2.6, t) : 0;
      if (!at || k <= 0 || (e.end != null && t > e.end)) { body.setMatrixAt(i, hide); line.setMatrixAt(i, hide); i++; continue; }
      const r = (e.pool.r ?? 1.5) * (0.25 + 0.75 * k); P.copy(at); P.y = floorY + 0.004; Q.identity(); S.set(r, 0.01, r * 0.8); put(i, P, Q, S); i++;
    }
    body.instanceMatrix.needsUpdate = true; line.instanceMatrix.needsUpdate = true;
  };
  return api;
}
